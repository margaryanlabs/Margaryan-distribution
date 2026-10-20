import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync,mkdtempSync,mkdirSync,rmSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
const script=fileURLToPath(new URL("./prepare-ops.mjs",import.meta.url));
const compose=readFileSync(new URL("../../deploy/cloud/ops/compose.yaml",import.meta.url),"utf8");
const call=(...a)=>spawnSync(process.execPath,[script,...a],{encoding:"utf8",timeout:10000});
test("No public host ports or hard-coded credentials",()=>{
 assert.match(compose,/internal:\s*true/);
 assert.doesNotMatch(compose,/^\s*ports:/m);
 assert.match(compose,/valkey_acl:/);
 assert.match(compose,/grafana_admin_password:/);
});
test("Offline plan does not create secrets",()=>{
 const r=call("--plan");assert.equal(r.status,0,r.stderr);
 assert.match(r.stdout,/No Docker, network calls or production changes/);
});
test("Rejects unsafe / existing paths",()=>{
 const parent=mkdtempSync(join(tmpdir(),"markarian-ops-"));
 try{
  const dir=join(parent,"ops");mkdirSync(dir);
  for(const candidate of ["/",dir,"relative"])assert.notEqual(call("--prepare",candidate).status,0);
 }finally{rmSync(parent,{recursive:true,force:true});}
});
test("Secret files excluded from source and absent from Git tree",()=>{
 const g=readFileSync(new URL("../../deploy/cloud/ops/.gitignore",import.meta.url),"utf8");
 assert.match(g,/secrets\//);
 for(const name of ["valkey.acl","valkey-client-password","grafana_admin_password"])
  assert.equal(existsSync(new URL("../../deploy/cloud/ops/secrets/"+name,import.meta.url)),false);
});
