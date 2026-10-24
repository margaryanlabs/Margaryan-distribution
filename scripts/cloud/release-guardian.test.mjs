import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,writeFileSync,chmodSync,symlinkSync,rmSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {PROJECTS,CORE_GATES,blueprint,assess,main} from "./release-guardian.mjs";
const sample={project:"decision-command",repository:"margaryanlabs/decision-command",releaseName:"veto-preview",environment:"staging",commit:"a".repeat(40),evidence:{}};
const fakeProof="https://github.com/margaryanlabs/decision-command/commit/"+"b".repeat(40);
const filled=Object.fromEntries(blueprint("decision-command").checks.map(id=>[id,{status:"pass",reference:fakeProof}]));
test("nine canonical blueprints include all critical named products",()=>{
 assert.equal(PROJECTS.length,9);assert.equal(new Set(PROJECTS.map(p=>p.id)).size,PROJECTS.length);
 for(const name of ["decision-command","vetogram","sofia","promptence","veto-sport","margaryan-cloud"])assert.ok(blueprint(name).repository);
 assert.equal(blueprint("decision-command").risk,"critical");
 assert.equal(blueprint("margaryan-cloud").risk,"critical");
 assert.equal(blueprint("vetogram").repository,"margaryanlabs/Telegram-story-bot");
});
test("all portfolios require staging, backup, restore and rollback before review",()=>{
 for(const p of PROJECTS){
  const bp=blueprint(p.id);
  assert.equal(bp.environment,"staging");assert.equal(bp.autoDeploy,false);
  for(const k of CORE_GATES)assert.ok(bp.checks.includes(k),p.id+" "+k);
  assert.equal(new Set(bp.checks).size,bp.checks.length);
 }
});
test("unreviewed manifests block; no data produces green verdict",()=>{
 const v=assess(sample);
 assert.equal(v.verdict,"BLOCKED");
 assert.ok(v.blockers.includes("ci"));assert.ok(v.blockers.includes("market_freshness"));
 assert.equal(v.permissions.canMigrateProduction,false);
 assert.equal(v.permissions.canTrade,false);
 assert.equal(v.permissions.deployed,false);
});
test("Decision Command critical evidence requires independent paper and zero-live gates",()=>{
 const v=assess({...sample,evidence:{...filled,zero_live_authority:undefined}});
 assert.equal(v.verdict,"BLOCKED");assert.ok(v.blockers.includes("zero_live_authority"));
 assert.ok(blueprint("decision-command").checks.includes("paper_governor"));
});
test("even fully self-attested release evidence never deploys or approves production",()=>{
 const v=assess({...sample,evidence:filled});
 assert.equal(v.verdict,"REVIEW_REQUIRED");
 assert.ok(v.checks.every(x=>x.status==="ATTESTED_PASS"));
 assert.equal(v.permissions.canDeploy,false);assert.equal(v.permissions.canRestoreDatabase,false);
 assert.match(v.warning,/not independently verified/);
});
test("rejects switching another registered repo into an audited project",()=>{
 for(const other of ["margaryanlabs/Vetosport","margaryanlabs/Telegram-story-bot","evil/user"]){
  assert.throws(()=>assess({...sample,repository:other}),/Repository/);
 }
});
test("rejects production, invalid commit, unsafe names and direct release authority",()=>{
 assert.throws(()=>assess({...sample,environment:"production"}),/staging/);
 assert.throws(()=>assess({...sample,commit:"main"}),/commit SHA/);
 assert.throws(()=>assess({...sample,releaseName:"../../prod"}),/release name/);
 for(const key of ["authorizeDeploy","secret","token","apiKey"])assert.throws(()=>assess({...sample,[key]:"x"}),/credentials|authority/);
});
test("unexpected evidence, fake links and forged statuses fail closed",()=>{
 assert.throws(()=>assess({...sample,evidence:{unexpected:{status:"pass",reference:fakeProof}}}),/Unexpected/);
 for(const bad of ["https://evil.test","http://github.com/margaryanlabs/decision-command/actions/runs/12","https://github.com/other/no/actions/runs/1"])
  assert.throws(()=>assess({...sample,evidence:{ci:{status:"pass",reference:bad}}}),/reference/);
 assert.throws(()=>assess({...sample,evidence:{ci:{status:"approved",reference:fakeProof}}}),/status/);
 assert.throws(()=>assess({...sample,evidence:{ci:{status:"pass",reference:fakeProof,secret:"token"}}}),/structure/);
});
test("explicit failed or unknown check still blocks",()=>{
 assert.equal(assess({...sample,evidence:{...filled,ci:{status:"fail",reference:fakeProof}}}).verdict,"BLOCKED");
 assert.equal(assess({...sample,evidence:{...filled,ci:{status:"unknown",reference:fakeProof}}}).verdict,"BLOCKED");
});
test("unknown project and missing manifest fields fail closed",()=>{
 assert.throws(()=>blueprint("not-exist"),/Unknown project/);
 assert.throws(()=>assess({...sample,project:"not-exist"}));
 assert.throws(()=>assess({...sample,evidence:null}),/Evidence/);
 assert.throws(()=>assess(null));
});
test("CLI catalog and blueprint are offline and cannot call deployment APIs",()=>{
 let out="",err="";const o={write:s=>out+=s},e={write:s=>err+=s};
 assert.equal(main(["--catalog"],o,e),0);assert.match(out,/decision-command/);
 out="";
 assert.equal(main(["--blueprint","vetogram"],o,e),0);assert.match(out,/Telegram-story-bot/);
 assert.equal(main(["--deploy"],o,e),2);
});
test("assess CLI requires private non-symlink manifest and never approves execution",()=>{
 const dir=mkdtempSync(join(tmpdir(),"mc-release-")),path=join(dir,"release.json");
 try{
  writeFileSync(path,JSON.stringify(sample),{mode:0o600});
  let out="",err="";const o={write:s=>out+=s},e={write:s=>err+=s};
  assert.equal(main(["--assess",path],o,e),1);
  assert.equal(JSON.parse(out).verdict,"BLOCKED");
  chmodSync(path,0o644);assert.equal(main(["--assess",path],o,e),1);
  chmodSync(path,0o600);
  const alias=join(dir,"manifest-link");symlinkSync(path,alias);
  assert.equal(main(["--assess",alias],o,e),1);
  assert.equal(main(["--assess","relative.json"],o,e),1);
 }finally{rmSync(dir,{force:true,recursive:true});}
});
test("project reviews do not include repository write endpoints or credentials",()=>{
 const source=JSON.stringify(assess(sample));
 assert.doesNotMatch(source,/CLOUD_COOLIFY_WRITE_TOKEN|CLOUD_DEPLOY_ENABLE|private_key|password|Bearer /);
 assert.equal(typeof assess(sample).permissions.canChangeDns,"boolean");
});
