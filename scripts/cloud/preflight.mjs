#!/usr/bin/env node
// Zero-dependency, read-only self-hosted setup preflight.
// Never prints or persists API tokens, passwords or environment values.
const opts=new Set(process.argv.slice(2));
if([...opts].some(x=>!["--online","--strict","--help"].includes(x))){
 console.error("Unknown option. Supported: --online, --strict, --help");
 process.exitCode=2;
}else if(opts.has("--help")){
 console.log("Markarian Cloud setup check\n  node scripts/cloud/preflight.mjs\n  node scripts/cloud/preflight.mjs --strict\n  node scripts/cloud/preflight.mjs --online");
}else{
 const checks=[];
 const add=(name,ok,detail)=>checks.push({name,ok,detail});
 const nodeMajor=Number(process.versions.node.split(".")[0]);
 add("Node >=22",nodeMajor>=22,"Distribution requires Node.js 22+");
 const url=process.env.CLOUD_COOLIFY_URL?.trim()||"";
 const token=process.env.CLOUD_COOLIFY_TOKEN?.trim()||"";
 const authUser=process.env.DISTRIBUTION_BASIC_USER?.trim()||"";
 const authPassword=process.env.DISTRIBUTION_BASIC_PASSWORD||"";
 let validUrl=false;
 try{
  const u=new URL(url);
  validUrl=(u.protocol==="https:"||(u.protocol==="http:"&&["localhost","127.0.0.1"].includes(u.hostname)))&&
   !u.username&&!u.password&&!u.search&&!u.hash&&u.pathname==="/"&&!/[\\\s]/.test(url);
 }catch{}
 add("Trusted Coolify origin",validUrl,"Set CLOUD_COOLIFY_URL to an HTTPS origin (HTTP only for localhost)");
 add("Coolify API token",token.length>0,"Set CLOUD_COOLIFY_TOKEN with read-only permission; never use read:sensitive or root");
 add("Operator login",!!(authUser&&authPassword),"Set both DISTRIBUTION_BASIC_USER and DISTRIBUTION_BASIC_PASSWORD");
 if(opts.has("--online")){
  if(!validUrl||!token){
   add("API connectivity",false,"Skipped because Coolify URL or token was not configured");
  }else{
   try{
    const response=await fetch(new URL("/api/v1/teams/current",url),{
     method:"GET",headers:{Authorization:"Bearer "+token,Accept:"application/json"},
     signal:AbortSignal.timeout(8000),redirect:"error",cache:"no-store"
    });
    add("API connectivity",response.ok, response.ok?"Coolify accepted a read-only team query":
     "Coolify responded HTTP "+response.status+" (check token, team, permissions and IP allowlist)");
   }catch{
    add("API connectivity",false,"Network or TLS error; details suppressed to avoid exposing configuration");
   }
  }
 }
 for(const c of checks)console.log((c.ok?"[PASS] ":"[WAIT] ")+c.name+" — "+c.detail);
 const failed=checks.filter(x=>!x.ok);
 console.log(failed.length?"Setup incomplete: "+failed.length+" item(s) require configuration.":"Preflight checks passed. Still validate backups and a staging deployment.");
 if(opts.has("--strict")||opts.has("--online"))process.exitCode=failed.length?1:0;
}