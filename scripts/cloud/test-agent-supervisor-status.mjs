import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,chmodSync,symlinkSync,rmSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {readAgentSupervisorStatus} from '../../lib/cloud/agent-supervisor-status.ts';
const NOW=Date.parse('2026-10-24T18:00:00.000Z');
function fixture(run){
 const dir=mkdtempSync(join(tmpdir(),'mc-supervisor-status-'));const path=join(dir,'report.json');
 const data={version:1,schema:'markarian-agent-supervisor/v1',checkedAt:'2026-10-24T17:59:00.000Z',complete:true,status:'observed_attention',
 sources:[{id:'portfolio',state:'recent',checkedAt:'2026-10-24T17:58:00.000Z'},{id:'infrastructure',state:'recent',checkedAt:'2026-10-24T17:58:00.000Z'},{id:'decision',state:'recent',checkedAt:'2026-10-24T17:58:00.000Z'}],
 incidentCount:1,criticalCount:1,signals:[{id:'portfolio:ci:1',origin:'portfolio',title:'CI failure',severity:'critical',secret:'LEAK'}]};
 const write=(object=data)=>writeFileSync(path,JSON.stringify(object),{mode:0o600});
 return Promise.resolve().then(()=>run({dir,path,data,write})).finally(()=>rmSync(dir,{force:true,recursive:true}));
}
test('unconfigured status never appears as connected',()=>{
 const r=readAgentSupervisorStatus({},NOW);assert.equal(r.state,'not_configured');assert.equal(r.incidentCount,null);
});
test('recent report shows only sanitized bounded incidents',()=>fixture(({path,write})=>{
 write();const r=readAgentSupervisorStatus({CLOUD_SUPERVISOR_REPORT_FILE:path},NOW);
 assert.equal(r.state,'recent');assert.equal(r.criticalCount,1);assert.equal(r.incidents.length,1);
 assert.equal(r.decisionCommand.paperTrading,'not_independently_verified');
 assert.doesNotMatch(JSON.stringify(r),/LEAK|report\.json/);
}));
test('expired Sentinel source invalidates freshness even if wrapper is fresh',()=>fixture(({path,write,data})=>{
 write({...data,sources:[data.sources[0],{...data.sources[1],checkedAt:'2026-10-24T17:48:00.000Z'},data.sources[2]]});
 const r=readAgentSupervisorStatus({CLOUD_SUPERVISOR_REPORT_FILE:path},NOW);
 assert.equal(r.state,'stale');assert.equal(r.status,'unknown');
}));
test('report becomes stale after ten minutes',()=>fixture(({path,write,data})=>{
 write({...data,checkedAt:'2026-10-24T17:40:00.000Z'});
 assert.equal(readAgentSupervisorStatus({CLOUD_SUPERVISOR_REPORT_FILE:path},NOW).state,'stale');
}));
test('rejects symlinks, loose credentials and invalid counts',()=>fixture(({dir,path,write,data})=>{
 write();const link=join(dir,'alias');symlinkSync(path,link);
 assert.equal(readAgentSupervisorStatus({CLOUD_SUPERVISOR_REPORT_FILE:link},NOW).state,'error');
 chmodSync(path,0o644);assert.equal(readAgentSupervisorStatus({CLOUD_SUPERVISOR_REPORT_FILE:path},NOW).state,'error');
 chmodSync(path,0o600);write({...data,criticalCount:0});
 assert.equal(readAgentSupervisorStatus({CLOUD_SUPERVISOR_REPORT_FILE:path},NOW).state,'error');
}));
test('invalid/future timestamps and fabricated source health are rejected',()=>fixture(({path,write,data})=>{
 write({...data,checkedAt:'2060-01-01T00:00:00.000Z'});
 assert.equal(readAgentSupervisorStatus({CLOUD_SUPERVISOR_REPORT_FILE:path},NOW).state,'error');
 write({...data,sources:[{...data.sources[0],state:'unknown'},data.sources[1],data.sources[2]]});
 assert.equal(readAgentSupervisorStatus({CLOUD_SUPERVISOR_REPORT_FILE:path},NOW).state,'error');
}));
test('protected API route requires owner auth, GET only and no caching',()=>{
 const src=readFileSync(new URL('../../app/api/cloud/agent-supervisor/route.ts',import.meta.url),'utf8');
 assert.match(src,/cloudOperatorAccess\(request\.headers,process\.env\)/);
 assert.match(src,/readAgentSupervisorStatus\(process\.env\)/);
 assert.match(src,/no-store/);
 assert.doesNotMatch(src,/export async function (POST|PUT|PATCH|DELETE)/);
});
test('expired Decision Specialist blocks current Supervisor readiness',()=>fixture(({path,write,data})=>{
 write({...data,sources:[data.sources[0],data.sources[1],{...data.sources[2],checkedAt:'2026-10-24T17:30:00.000Z'}]});
 const r=readAgentSupervisorStatus({CLOUD_SUPERVISOR_REPORT_FILE:path},NOW);
 assert.equal(r.state,'stale');assert.equal(r.status,'unknown');
}));
