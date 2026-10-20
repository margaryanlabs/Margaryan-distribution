import {test} from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
const script=fileURLToPath(new URL("./prepare-supabase.mjs",import.meta.url));
const run=(...args)=>spawnSync(process.execPath,[script,...args],{encoding:"utf8",timeout:8000});
test("Supabase preparation plan is offline and reports the pinned official version",()=>{
 const result=run("--plan");
 assert.equal(result.status,0,result.stderr);
 assert.match(result.stdout,/self-hosted\/v0\.8\.2/);
 assert.match(result.stdout,/No secrets, hosts, containers or databases are created/);
});
test("Preparation refuses existing and dangerous output directories",()=>{
 const parent=mkdtempSync(join(tmpdir(),"mc-supabase-"));
 try{
  for(const path of [parent,"/","/etc","relative/path"]){
   const result=run("--prepare",path);
   assert.notEqual(result.status,0,path);
  }
 }finally{rmSync(parent,{recursive:true,force:true});}
});
test("Missing configuration is rejected without showing password values",()=>{
 const root=mkdtempSync(join(tmpdir(),"mc-supabase-"));
 const dir=join(root,"stack");
 mkdirSync(dir);
 try{
  writeFileSync(join(dir,"docker-compose.yml"),"services: {}\n");
  writeFileSync(join(dir,".supabase-version"),"ref=self-hosted/v0.8.2\n");
  assert.notEqual(run("--verify",dir).status,0);
  const secret="SENSITIVE_TEST_PASSWORD_VALUE";
  writeFileSync(join(dir,".env"),"POSTGRES_PASSWORD="+secret+"\n");
  const result=run("--verify",dir);
  assert.notEqual(result.status,0);
  assert.doesNotMatch(result.stdout+result.stderr,/SENSITIVE_TEST_PASSWORD_VALUE/);
  assert.match(result.stdout,/POSTGRES_PASSWORD/);
 }finally{rmSync(root,{recursive:true,force:true});}
});
test("Configured field presence does not masquerade as successful production deployment",()=>{
 const root=mkdtempSync(join(tmpdir(),"mc-supabase-"));
 const dir=join(root,"stack");mkdirSync(dir);
 try{
  writeFileSync(join(dir,"docker-compose.yml"),"services: {}\n");
  writeFileSync(join(dir,".supabase-version"),"ref=self-hosted/v0.8.2\n");
  const keys=["POSTGRES_PASSWORD","DASHBOARD_PASSWORD","SUPABASE_PUBLIC_URL",
    "API_EXTERNAL_URL","SUPABASE_PUBLISHABLE_KEY","SUPABASE_SECRET_KEY"];
  writeFileSync(join(dir,".env"),keys.map(key=>key+"="+(key.endsWith("URL")?"https://example.invalid":"FAKE_NONPRODUCTION_VALUE")).join("\n"));
  const result=run("--verify",dir);
  assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/does NOT prove/);
  assert.doesNotMatch(result.stdout,/FAKE_NONPRODUCTION_VALUE/);
 }finally{rmSync(root,{recursive:true,force:true});}
});
