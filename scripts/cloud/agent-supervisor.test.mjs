import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,mkdirSync,readFileSync,chmodSync,symlinkSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {readAgentSource,composeSupervisor,compareSupervisor,main} from './agent-supervisor.mjs';
const NOW=Date.parse('2026-10-24T18:00:00.000Z');
function fixture(run){
 const root=mkdtempSync(join(tmpdir(),'mc-supervisor-'));
 const dir=join(root,'secure');mkdirSync(dir,{mode:0o700});
 const guardian=join(dir,'guardian.json'),sentinel=join(dir,'sentinel.json'),report=join(dir,'supervisor.json');
 const write=(file,signals,checkedAt='2026-10-24T17:59:00.000Z')=>writeFileSync(file,JSON.stringify({version:1,checkedAt,signals}),{mode:0o600});
 const env={CLOUD_GUARDIAN_STATE_FILE:guardian,CLOUD_SENTINEL_STATE_FILE:sentinel};
 return Promise.resolve().then(()=>run({root,dir,guardian,sentinel,report,write,env})).finally(()=>rmSync(root,{force:true,recursive:true}));
}
const ci={id:'ci:margaryanlabs/decision-command',severity:'critical',title:'Latest GitHub Actions run failed',repo:'margaryanlabs/decision-command',url:'https://github.com/margaryanlabs/decision-command/actions/runs/123',secret:'DONOTREPEAT'};
const host={id:'server:1',severity:'warning',title:'Server unreachable',area:'infra',secret:'DONOTREPEAT'};
test('absent sources return unknown, never report infrastructure healthy',()=>{
 const v=composeSupervisor({},NOW);
 assert.equal(v.status,'unknown');assert.equal(v.complete,false);
 assert.equal(v.incidentCount,0);assert.equal(v.sources[0].state,'not_configured');
 assert.equal(v.decisionCommand.pipelineFreshness,'not_checked');
 assert.equal(v.autonomousRemediation,false);assert.equal(v.productionReady,false);
});
test('federates fresh completed snapshots with severity and safe Decision Command labels',()=>fixture(({guardian,sentinel,write,env})=>{
 write(guardian,[ci]);write(sentinel,[host]);
 const r=composeSupervisor(env,NOW);
 assert.equal(r.complete,true);assert.equal(r.status,'observed_attention');assert.equal(r.incidentCount,2);
 assert.equal(r.criticalCount,1);assert.equal(r.signals[0].origin,'portfolio');
 assert.equal(r.signals[0].project,'margaryanlabs/decision-command');
 assert.equal(r.signals[0].url,ci.url);assert.equal(r.decisionCommand.liveOrderPermissions,'not_checked');
 assert.doesNotMatch(JSON.stringify(r),/DONOTREPEAT|secure\/|supervisor\.json/);
}));
test('fresh empty snapshots are observed-no-findings but not production ready',()=>fixture(({guardian,sentinel,write,env})=>{
 write(guardian,[]);write(sentinel,[]);
 const r=composeSupervisor(env,NOW);
 assert.equal(r.status,'observed_no_findings');assert.equal(r.canMigrateProduction,false);
 assert.match(r.note,/not live production uptime/);
}));
test('stale snapshot blocks completeness even with a fresh second source',()=>fixture(({guardian,sentinel,write,env})=>{
 write(guardian,[], '2026-10-24T09:00:00.000Z');write(sentinel,[]);
 const r=composeSupervisor(env,NOW);
 assert.equal(r.status,'unknown');assert.equal(r.sources[0].state,'stale');
}));
test('source file rejects symlink and loose permissions',()=>fixture(({guardian,write,dir})=>{
 write(guardian,[ci]);const alias=join(dir,'alias');symlinkSync(guardian,alias);
 assert.equal(readAgentSource(alias,'portfolio',6*3600_000,200,NOW).state,'error');
 chmodSync(guardian,0o644);
 assert.equal(readAgentSource(guardian,'portfolio',6*3600_000,200,NOW).state,'error');
}));
test('malformed, oversized and future snapshots never produce a recent reading',()=>fixture(({guardian,write})=>{
 write(guardian,[ci],'2035-01-01T00:00:00.000Z');
 assert.equal(readAgentSource(guardian,'portfolio',6*3600_000,200,NOW).state,'error');
 write(guardian,Array.from({length:201},()=>ci));
 assert.equal(readAgentSource(guardian,'portfolio',6*3600_000,200,NOW).state,'error');
 write(guardian,[{id:'x',title:'foo',severity:'fabricated'}]);
 assert.equal(readAgentSource(guardian,'portfolio',6*3600_000,200,NOW).state,'error');
}));
test('no fake recoveries under missing data and priority changes are detected',()=>{
 const before=[{id:'portfolio:ci:1',severity:'critical',title:'CI'}];
 const after=[{id:'portfolio:ci:1',severity:'warning',title:'CI'}];
 assert.equal(compareSupervisor(before,[],false).resolved.length,0);
 assert.equal(compareSupervisor(before,[],true).resolved.length,1);
 assert.equal(compareSupervisor(before,after,true).changed.length,1);
});
test('diff creates private, bounded receipt only when both sources are recent',()=>fixture(({guardian,sentinel,report,write,env})=>{
 write(guardian,[ci]);write(sentinel,[host]);
 let output='',errors='';const out={write:s=>output+=s},err={write:s=>errors+=s};
 assert.equal(main(['--diff',report],env,out,err,NOW),0,errors);
 assert.equal(JSON.parse(output).reportUpdated,true);
 assert.equal(JSON.parse(readFileSync(report,'utf8')).version,1);
 write(sentinel,[],'2026-10-23T17:00:00.000Z');output='';
 assert.equal(main(['--diff',report],env,out,err,NOW),1);
 assert.equal(JSON.parse(output).reportUpdated,false);
 assert.equal(JSON.parse(readFileSync(report,'utf8')).incidentCount,2);
}));
test('rejects non-private report destination, never follows existing report symlink',()=>fixture(({guardian,sentinel,dir,report,write,env})=>{
 write(guardian,[]);write(sentinel,[]);
 const publicDir=join(dir,'public');mkdirSync(publicDir,{mode:0o755});
 let errors='';const out={write:()=>{}},err={write:s=>errors+=s};
 assert.equal(main(['--diff',join(publicDir,'report.json')],env,out,err,NOW),1);
 writeFileSync(report,'{"version":1,"signals":[]}',{mode:0o600});
 const link=join(dir,'link');symlinkSync(report,link);
 assert.equal(main(['--diff',link],env,out,err,NOW),1);
}));
test('plan is offline, read-only and unknown commands rejected',()=>{
 let result='',errors='';const out={write:s=>result+=s},err={write:s=>errors+=s};
 assert.equal(main(['--plan'],{},out,err,NOW),0);
 assert.match(result,/read-only federation/);
 assert.equal(main(['--trade'],{},out,err,NOW),2);
 assert.match(errors,/Usage/);
});

test('dangling supervisor output symlink is refused, not silently replaced',()=>fixture(({guardian,sentinel,dir,write,env})=>{
 write(guardian,[]);write(sentinel,[]);
 const dangling=join(dir,'dangling');symlinkSync(join(dir,'missing.json'),dangling);
 let stderr='';
 const rc=main(['--diff',dangling],env,{write:()=>{}},{write:s=>stderr+=s},NOW);
 assert.equal(rc,1);assert.match(stderr,/NOT READY/);
}));
test('operator-installed timer templates remain least-privilege and never store token values',()=>{
 for(const name of ['portfolio-guardian','infrastructure-sentinel','agent-supervisor']){
  const root=new URL('../../deploy/cloud/agents/',import.meta.url);
  const service=readFileSync(new URL('markarian-'+name+'.service',root),'utf8');
  const timer=readFileSync(new URL('markarian-'+name+'.timer',root),'utf8');
  assert.match(service,/Type=oneshot/);assert.match(service,/User=markarian/);
  assert.match(service,/NoNewPrivileges=true/);assert.match(service,/StandardOutput=null/);
  assert.match(service,/ReadWritePaths=\/var\/lib\/margaryan-cloud\/agents/);
  assert.doesNotMatch(service,/curl |sudo |PGPASSWORD=|github_pat_/);
  assert.match(timer,/OnCalendar=/);assert.match(timer,/Persistent=true/);
  assert.ok(timer.includes('Unit=markarian-'+name+'.service'));
 }
});