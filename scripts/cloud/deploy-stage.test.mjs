import test from "node:test";import assert from "node:assert/strict";
import {mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {join} from "node:path";import {tmpdir} from "node:os";
import {createStagingRequest,validateCoolifyUrl,approvalDigest,stagingReceipt,stageApplication} from "./deploy-stage.mjs";
const config={project_uuid:"aabbccdd00112233",server_uuid:"server00001111",environment_name:"staging",
 git_repository:"https://github.com/example/public-app",git_branch:"main",build_pack:"nixpacks",
 ports_exposes:"3000",name:"cloud-staging"};
test("Only public GitHub applications in staging are allowed",()=>{
 const result=createStagingRequest(config);
 assert.equal(result.environment_name,"staging");
 assert.equal(result.git_repository,"https://github.com/example/public-app");
 for(const bad of ["production","preview","dev"]){
  assert.throws(()=>createStagingRequest({...config,environment_name:bad}),/staging/);
 }
});
test("Reject invalid repo, branch, port and domains",()=>{
 for(const bad of ["http://github.com/a/b","https://evil.test/a/b","https://github.com/a/../b"])
  assert.throws(()=>createStagingRequest({...config,git_repository:bad}));
 for(const bad of ["../production","main;rm","foo bar","main//x"])
  assert.throws(()=>createStagingRequest({...config,git_branch:bad}));
 assert.throws(()=>createStagingRequest({...config,ports_exposes:"0"}));
 assert.throws(()=>createStagingRequest({...config,domains:"https://example.com"}));
});
test("No HTTP or userinfo in remote Coolify URL",()=>{
 assert.equal(validateCoolifyUrl("https://ops.example.com"),"https://ops.example.com");
 for(const x of ["http://ops.example.com","https://user:key@ops.example.com","https://ops.example.com/path"])
  assert.equal(validateCoolifyUrl(x),null);
});
test("Staging approval digest is deterministic and fails for changed manifest",()=>{
 const a=createStagingRequest(config);
 const b=createStagingRequest({...config,git_branch:"new-branch"});
 assert.equal(approvalDigest(a),approvalDigest(a));
 assert.notEqual(approvalDigest(a),approvalDigest(b));
});
test("Without explicit toggle and secure secret file, no network call occurs",async()=>{
 let count=0;
 const fake=async()=>{count++;throw Error("must not call");};
 await assert.rejects(stageApplication(createStagingRequest(config),{},fake));
 assert.equal(count,0);
});
test("Scoped staging create hits exact Coolify endpoint, no redirects, no deployment",async()=>{
 const root=mkdtempSync(join(tmpdir(),"cloud-stage-"));
 try{
  const file=join(root,"token");
  writeFileSync(file,"THIS_IS_ONLY_A_FAKE_COOLIFY_TOKEN_12345\n",{mode:0o600});
  let calls=0;
  const fake=async(url,request)=>{
   calls++;assert.equal(url.pathname,"/api/v1/applications/public");
   assert.equal(url.origin,"https://ops.example.com");
   assert.equal(request.method,"POST");assert.equal(request.redirect,"error");
   assert.equal(request.headers.Authorization,"Bearer THIS_IS_ONLY_A_FAKE_COOLIFY_TOKEN_12345");
   assert.equal(JSON.parse(request.body).environment_name,"staging");
   return new Response(JSON.stringify({uuid:"staging12345"}),{status:201});
  };
  const res=await stageApplication(createStagingRequest(config),{CLOUD_COOLIFY_URL:"https://ops.example.com",
   CLOUD_DEPLOY_ENABLE:"staging-only",CLOUD_COOLIFY_WRITE_TOKEN_FILE:file},fake);
  assert.equal(calls,1);assert.equal(res.deployed,false);
  assert.doesNotMatch(JSON.stringify(res),/FAKE_COOLIFY_TOKEN/);
 }finally{rmSync(root,{recursive:true,force:true});}
});
test("Coolify errors and unverified UUID never count as successful deployment",()=>{
 assert.throws(()=>stagingReceipt({uuid:"../bad"}));
 assert.deepEqual(stagingReceipt({uuid:"staging12345"}),{applicationUuid:"staging12345",createdIn:"staging",deployed:false});
});
