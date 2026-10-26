import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,chmodSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {dollarsToCents,assessBudget,main,EXAMPLE} from './budget-gate.mjs';
const reviewed=()=>({...EXAMPLE,monthly:{...EXAMPLE.monthly},meteredLimitEnforced:true,allHostingChargesIncluded:true});
test('exact USD cent math and 50 dollar ceiling',()=>{
 assert.equal(dollarsToCents('34.99'),3499);
 assert.equal(dollarsToCents('0.60'),60);
 assert.equal(dollarsToCents('7.99'),799);
 const result=assessBudget(reviewed(),{today:'2026-10-26'});
 assert.equal(result.worstCaseMonthlyCents,4858);
 assert.equal(result.headroomCents,142);
 assert.equal(result.verdict,'HOSTING_ESTIMATE_FITS_REVIEW_REQUIRED');
 assert.equal(result.canDeploy,false);
 assert.equal(result.canPurchase,false);
});
test('server snapshots, VAT or usage can exceed $50',()=>{
 const q=reviewed();
 q.monthly.snapshots='7.00';
 const r=assessBudget(q,{today:'2026-10-26'});
 assert.equal(r.worstCaseMonthlyCents,5558);
 assert.ok(r.blockers.includes('OVER_BUDGET'));
 assert.equal(r.verdict,'BLOCKED');
});
test('example refuses invented proof of provider caps or complete estimate',()=>{
 const r=assessBudget(EXAMPLE,{today:'2026-10-26'});
 assert.ok(r.blockers.includes('METERED_SPENDING_CAP_NOT_ENFORCED_BY_PROVIDER'));
 assert.ok(r.blockers.includes('HOSTING_COSTS_INCOMPLETE'));
});
test('quote older than 14 days blocks, future date is invalid',()=>{
 assert.ok(assessBudget(reviewed(),{today:'2026-11-10'}).blockers.includes('STALE_OR_INVALID_QUOTE_DATE'));
 assert.equal(assessBudget(reviewed(),{today:'2026-11-09'}).quoteAgeDays,14);
 assert.ok(assessBudget(reviewed(),{today:'2026-10-25'}).blockers.includes('STALE_OR_INVALID_QUOTE_DATE'));
});
test('rejects missing cost categories and floating point amounts',()=>{
 const q=reviewed();
 delete q.monthly.tax;
 assert.throws(()=>assessBudget(q));
 for(const value of ['3.141','-2.00','$12.00','Infinity',1.25,'1e3']){
  const b=reviewed();b.monthly.vps=value;
  assert.throws(()=>assessBudget(b));
 }
});
test('host counts, suspicious authority and invalid currency fail',()=>{
 for(const change of [{hostCount:0},{currency:'EUR'},{productionApproved:true},{scope:'everything'},{meteredLimitEnforced:'yes'}]){
  assert.throws(()=>assessBudget({...reviewed(),...change}));
 }
});
test('CLI example is safe and assessor never authorizes deploy',()=>{
 let captured='';
 const out=process.stdout.write,err=process.stderr.write;
 process.stdout.write=(v)=>{captured+=v;return true;};process.stderr.write=()=>true;
 try{
  assert.equal(main(['--example']),0);
  assert.ok(captured.includes('"maxPerMonth": "50.00"'));
  assert.equal(main(['--deploy']),2);
 }finally{process.stdout.write=out;process.stderr.write=err;}
});
test('CLI requires private 0600 quote and exits review-only status 3',()=>{
 const dir=mkdtempSync(join(tmpdir(),'markarian-budget-'));
 const path=join(dir,'quote.json');
 const old=process.stdout.write,err=process.stderr.write;
 process.stdout.write=()=>true;process.stderr.write=()=>true;
 try{
  writeFileSync(path,JSON.stringify(reviewed()),{mode:0o600});
  assert.equal(main(['--assess',path],()=> '2026-10-26'),3);
  chmodSync(path,0o644);
  assert.equal(main(['--assess',path],()=> '2026-10-26'),1);
 }finally{process.stdout.write=old;process.stderr.write=err;rmSync(dir,{recursive:true,force:true});}
});
