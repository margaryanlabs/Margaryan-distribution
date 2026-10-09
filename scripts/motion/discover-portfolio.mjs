#!/usr/bin/env node
/**
 * Portfolio discovery gate. Never silently lose a newly created company project.
 * Run from operator workstation with GitHub credentials for private projects.
 *
 * npm run motion:discover -- margaryan-labs margaryanlabs
 * GITHUB_TOKEN from trusted operator environment grants access to private repos.
 * Emits local JSON review queue; DOES NOT publish private IDs into public web.
 */
import process from "node:process";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const owners = process.argv.slice(2);
if(!owners.length||owners.length>5||owners.some(x=>!/^[a-zA-Z0-9-]{1,39}$/.test(x))){
  process.stderr.write("Usage: npm run motion:discover -- org-or-owner [another-owner]\n");
  process.exit(2);
}
const token=process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const headers={
  accept:"application/vnd.github+json",
  "x-github-api-version":"2022-11-28",
  "user-agent":"Margaryan-Motion-Portfolio-Discover",
  ...(token?{authorization:"Bearer "+token}:{})
};
async function get(url) {
  const res=await fetch(url,{headers,signal:AbortSignal.timeout(12000)});
  if(res.status===403)throw Error("GitHub forbidden or rate limited; supply an authorized operator token");
  if(!res.ok)throw Error("GitHub "+res.status+" for portfolio account; check owner/token access");
  return res.json();
}
const all=[];
for(const owner of owners){
  // Check org first, fall back to authenticated user repos where appropriate.
  let results,route="orgs";
  try{results=await get("https://api.github.com/orgs/"+owner+"/repos?type=all&sort=updated&per_page=100&page=1");}
  catch(error){
    if(String(error).includes("GitHub 404")){
      route="users";
      results=await get("https://api.github.com/users/"+owner+"/repos?type=owner&sort=updated&per_page=100&page=1");
    }else throw error;
  }
  for(let page=1;page<=6;page++){
    const entries=page===1?results:await get("https://api.github.com/"+route+"/"+owner+"/repos?type="+(route==="orgs"?"all":"owner")+"&sort=updated&per_page=100&page="+page);
    if(!Array.isArray(entries))throw Error("Unexpected GitHub response");
    for(const item of entries){
      if(item.archived||item.disabled||item.fork)continue;
      all.push({
        repository:item.full_name,
        private:item.private===true,
        defaultBranch:item.default_branch,
        updatedAt:item.pushed_at || item.updated_at,
        description:typeof item.description==="string"?item.description.slice(0,180):null,
        homepage:typeof item.homepage==="string"&&/^https:\/\//.test(item.homepage)?item.homepage:null
      });
    }
    if(entries.length<100)break;
  }
}
const registry=await readFile("lib/motion/portfolio.ts","utf8");
const brandKeys=[...registry.matchAll(/^\s{2}([a-z_]+):\s*\{\s*$/gm)].map(m=>m[1]);
const known=new Set(brandKeys.map(x=>x.replace(/_/g,"").toLowerCase()));
const slug=(s)=>s.toLowerCase().replace(/[^a-z0-9]/g,"");
const data=all.sort((a,b)=>(b.updatedAt||"").localeCompare(a.updatedAt||"")).map(item=>{
  const name=item.repository.split("/")[1];
  const simple=slug(name);
  const probable=[...known].find(id=>simple.includes(id)||id.includes(simple));
  return {...item,registryHint:probable||null,needsReview:!probable};
});
const pending=data.filter(x=>x.needsReview);
const report={
  version:1,createdAt:new Date().toISOString(),
  warning:"A missing ID is a review candidate, NOT proof of a missing product. Repo aliases may not match marketing names. Private names remain on this operator's machine.",
  owners,visibleRepos:data.length,registeredBrandIds:brandKeys,
  reviewCandidates:pending,alreadyNamed:data.filter(x=>!x.needsReview)
};
const output=resolve("out/motion/portfolio-review.json");
await mkdir(dirname(output),{recursive:true});
await writeFile(output,JSON.stringify(report,null,2)+"\n",{mode:0o600});
process.stdout.write("Portfolio discovery complete: "+data.length+" visible repositories / "+pending.length+" review candidates.\n");
process.stdout.write("Local review queue: "+output+"\n");
if(!token)process.stdout.write("No GitHub token: private repositories will NOT be visible. This scan is incomplete for an organization with private projects.\n");
