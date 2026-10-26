import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {evaluatePortability,audit,main} from './app-portability.mjs';
const vetogram={
 'package.json':JSON.stringify({scripts:{start:'vercel dev'}}),
 'vercel.json':JSON.stringify({builds:[{use:'@vercel/node'}]}),
 'api/router.js':'export default function handler(){}',
 'api/health.js':'export default function health(){}',
 'api/privacy-backup-worker.js':'telegram-story-bot-murex.vercel.app',
};
test('VETOGRAM flags runtime, webhook, and fixed Vercel URL',()=>{
 const r=evaluatePortability('vetogram',vetogram);
 assert.equal(r.verdict,'BLOCKED');
 for(const key of ['portable_http_entrypoint','vercel_function_build','fixed_vercel_user_link','telegram_webhook'])
  assert.ok(r.blockers.includes(key));
 assert.equal(r.canMigrateProduction,false);
});
test('Promptence tracks cron and managed database pin',()=>{
 const r=evaluatePortability('promptence',{
  'package.json':JSON.stringify({packageManager:'bun@1.4.1'}),
  'vercel.json':JSON.stringify({crons:[{path:'/worker'}],env:{SUPABASE_URL:'https://abc.supabase.co'}}),
  '.env.example':'WORKER_SECRET='});
 assert.ok(r.blockers.includes('cron_replacement'));
 assert.ok(r.blockers.includes('managed_database_pin'));
 assert.equal(r.canChangeDNS,false);
});
test('invalid project cannot authorize anything',()=>assert.throws(()=>evaluatePortability('unknown',{})));
test('fixture audit reads only declared local source files',()=>{
 const dir=mkdtempSync(join(tmpdir(),'cloud-audit-'));
 try{
  for(const [name,content] of Object.entries(vetogram)){
   mkdirSync(dirname(join(dir,name)),{recursive:true});
   writeFileSync(join(dir,name),content);
  }
  assert.equal(audit('vetogram',dir).verdict,'BLOCKED');
  rmSync(join(dir,'package.json'));symlinkSync('/etc/hosts',join(dir,'package.json'));
  assert.throws(()=>audit('vetogram',dir));
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('unrecognized CLI action is rejected',()=>{
 const write=process.stderr.write;process.stderr.write=()=>true;
 try{assert.equal(main(['--deploy']),2);}finally{process.stderr.write=write;}
});
