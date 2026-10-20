#!/usr/bin/env node
/**
 * Markarian Cloud staging-only Coolify importer for public Git repositories.
 * Does NOT trigger deployment or change existing resources.
 * Production, environment credentials and browser invocations are not supported.
 */
import {readFileSync,statSync} from "node:fs";
import {createHash} from "node:crypto";
import {isAbsolute} from "node:path";
import {pathToFileURL} from "node:url";

const ID=/^[a-zA-Z0-9_-]{8,128}$/;
const BRANCH=/^[a-zA-Z0-9_][a-zA-Z0-9_./-]{0,99}$/;
const SLUG=/^[a-z][a-z0-9-]{1,47}$/;
const DOMAIN=/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.([a-z0-9-]+\.)+[a-z]{2,63}$/;
const PUBLIC_REPO=/^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(?:\.git)?$/;
function fail(msg){throw new Error(msg);}
export function createStagingRequest(input){
 if(!input||typeof input!=="object"||Array.isArray(input))fail("Expected a staging config JSON object");
 if(!ID.test(input.project_uuid||"")||!ID.test(input.server_uuid||""))
  fail("Project and server UUIDs must be explicitly supplied");
 if(input.environment_name!=="staging")fail("This tool only creates staging applications");
 if(!PUBLIC_REPO.test(input.git_repository||"")||input.git_repository.includes(".."))fail("Expected a canonical public GitHub HTTPS repository URL");
 if(!BRANCH.test(input.git_branch||"")||input.git_branch.includes("..")||input.git_branch.includes("//")||input.git_branch.endsWith("/"))
  fail("Invalid Git branch");
 if(!["nixpacks","railpack","dockerfile","static"].includes(input.build_pack))fail("Unsupported Coolify build pack");
 const port=Number(input.ports_exposes);
 if(!Number.isInteger(port)||port<1||port>65535)fail("Invalid application port");
 if(!SLUG.test(input.name||"")||input.name.includes("--"))fail("Invalid staging application slug");
 if(input.domains&&(!DOMAIN.test(input.domains)||input.domains.includes("..")))
  fail("Provide at most one reviewed staging DNS hostname");
 return {
  project_uuid:input.project_uuid,server_uuid:input.server_uuid,
  environment_name:"staging",git_repository:input.git_repository,git_branch:input.git_branch,
  build_pack:input.build_pack,ports_exposes:String(port),name:input.name,
  ...(input.domains?{domains:"https://"+input.domains}: {})
 };
}
export function validateCoolifyUrl(raw){
 if(!raw||/[\s\\]/.test(raw))return null;
 try{
  const u=new URL(raw);
  if(u.protocol!=="https:"||u.pathname!=="/"||u.username||u.password||u.search||u.hash)return null;
  return u.origin;
 }catch{return null;}
}
export function stagingReceipt(body){
 if(!body||typeof body!=="object"||!ID.test(body.uuid||""))fail("Coolify did not return a valid staging app UUID");
 return {applicationUuid:body.uuid,createdIn:"staging",deployed:false};
}
function readToken(env){
 const file=env.CLOUD_COOLIFY_WRITE_TOKEN_FILE;
 if(!file||!isAbsolute(file))fail("Use an absolute CLOUD_COOLIFY_WRITE_TOKEN_FILE path on the operator host");
 const s=statSync(file);
 if(!s.isFile()||(s.mode&0o077)!==0)fail("Write token must be a private regular file (chmod 600)");
 const token=readFileSync(file,"utf8").trim();
 if(!/^[a-zA-Z0-9_.|:-]{16,512}$/.test(token))fail("Invalid Coolify write-token file");
 return token;
}
export function approvalDigest(request){
 return createHash("sha256").update(JSON.stringify(request)).digest("hex").slice(0,20);
}
export async function stageApplication(request,env,fetcher=fetch){
 const base=validateCoolifyUrl(env.CLOUD_COOLIFY_URL);
 if(!base)fail("Secure HTTPS CLOUD_COOLIFY_URL required");
 if(env.CLOUD_DEPLOY_ENABLE!=="staging-only")fail("Set CLOUD_DEPLOY_ENABLE=staging-only explicitly");
 const token=readToken(env);
 const url=new URL("/api/v1/applications/public",base);
 const response=await fetcher(url,{
  method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json",Accept:"application/json"},
  body:JSON.stringify(request),cache:"no-store",redirect:"error",signal:AbortSignal.timeout(12000)
 });
 if(!response.ok)fail("Staging app creation rejected by Coolify (HTTP "+response.status+"). No retry was attempted.");
 const result=await response.json();
 return stagingReceipt(result);
}
async function main(args=process.argv.slice(2),env=process.env){
 const [command,filename,flag,approval,...extra]=args;
 if(!["--plan","--create-staging"].includes(command)||!filename||!isAbsolute(filename)||
  extra.length||(command==="--plan"&&(flag||approval))||
  (command==="--create-staging"&&(flag!=="--approve"||!approval))){
  process.stderr.write("Usage: node scripts/cloud/deploy-stage.mjs --plan /ABSOLUTE/config.json\n"+
   "       node scripts/cloud/deploy-stage.mjs --create-staging /ABSOLUTE/config.json --approve DIGEST\n");
  process.exitCode=2;return;
 }
 try{
  const config=JSON.parse(readFileSync(filename,"utf8"));
  const request=createStagingRequest(config);
  const digest=approvalDigest(request);
  if(command==="--plan"){
   process.stdout.write(JSON.stringify({request,reviewDigest:digest,execution:"not-performed",createsOnly:"new staging app; no deployment"},null,2)+"\n");return;
  }
  if(approval!==digest)fail("Approval digest mismatch: inspect --plan output first");
  const result=await stageApplication(request,env);
  process.stdout.write(JSON.stringify({...result,reviewDigest:digest})+"\n");
 }catch(e){
  process.stderr.write("STAGING NOT CREATED: "+(e instanceof Error?e.message:"Unexpected error")+"\n");
  process.exitCode=1;
 }
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)await main();
