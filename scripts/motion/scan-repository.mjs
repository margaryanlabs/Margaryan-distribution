#!/usr/bin/env node
/**
 * Motion OS authenticated repository scanner.
 *
 * Run in an operator-controlled environment with GITHUB_TOKEN to inspect a
 * private repo. No secrets are sent to the public Motion Studio and no source
 * code, .env, private configs or arbitrary files are written to the manifest.
 *
 * Example:
 *   GITHUB_TOKEN=... npm run motion:scan -- margaryan-labs/ai-revenue-navigator
 *
 * Public repositories can be scanned without a token subject to GitHub limits.
 * It emits source paths and evidence, NOT a claim of certified brand correctness.
 */
import process from "node:process";

const raw = process.argv[2] ?? "";
if (!/^[a-zA-Z0-9_.-]{1,75}\/[a-zA-Z0-9_.-]{1,100}$/.test(raw)) {
  process.stderr.write("Usage: npm run motion:scan -- owner/repo [ref]\n");
  process.exit(2);
}
const ref = process.argv[3] || "main";
if (!/^[\w./-]{1,120}$/.test(ref) || ref.includes("..")) {
  process.stderr.write("Invalid ref name\n");process.exit(2);
}
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const headers = {
  "accept": "application/vnd.github+json",
  "user-agent": "Margaryan-Motion-OS/0.4",
  "x-github-api-version": "2022-11-28",
  ...(token ? {"authorization": "Bearer " + token} : {})
};
const [owner, name] = raw.split("/");
const prefix = "https://api.github.com/repos/" + encodeURIComponent(owner) + "/" + encodeURIComponent(name);
async function request(path) {
  const response=await fetch(prefix+path,{headers,signal:AbortSignal.timeout(15_000)});
  if (!response.ok) {
    if (response.status===404) throw new Error("Repository not accessible; for private repos provide a scoped GITHUB_TOKEN.");
    if (response.status===403) throw new Error("GitHub rate or permissions limit; retry with a scoped token.");
    throw new Error("GitHub API status " + response.status);
  }
  return response.json();
}
function safePath(path) {
  const p=path.toLowerCase();
  return !p.split("/").some(x=>x.startsWith(".")||x==="node_modules"||x==="dist"||x==="build"||x==="vendor"||x==="test"||x==="tests"||x==="fixtures") &&
    !/(\\.env|\\.pem|\\.key|credentials|secret|private_key|token|lockfile|package-lock|\\.lock|\\.map)(?:$|[./_-])/i.test(p);
}
function scorePath(path) {
  let n=0;const p=path.toLowerCase();
  if (/^public\//.test(p))n+=30;
  if (/(?:^|\/)(?:brand|branding|logos|marks|assets)\//.test(p))n+=24;
  if (/(?:^|[-_./])(?:logo|wordmark|brandmark|monogram)(?:[-_.\/]|$)/.test(p))n+=42;
  if (/(?:^|[-_./])(?:favicon|icon|mark)(?:[-_.\/]|$)/.test(p))n+=12;
  if (p.endsWith(".svg"))n+=16;
  if (/(old|backup|legacy|deprecated|v1|sample|example|test|draft)/.test(p))n-=40;
  if (p.endsWith(".png"))n+=8;
  if (p.endsWith(".webp"))n+=4;
  return n;
}
const metadata=await request("");
const tree=await request("/git/trees/"+encodeURIComponent(ref)+"?recursive=1");
if (tree.truncated) throw new Error("Repository tree truncated; use a narrower ref; never guess missing brand files.");
if (!Array.isArray(tree.tree))throw new Error("Git tree unavailable.");
const paths=tree.tree.filter(x=>x.type==="blob"&&safePath(x.path)&&Number(x.size||0)<2_000_000);
const logoCandidates=paths
  .filter(x=>/\.(svg|png|webp)$/i.test(x.path))
  .map(x=>({path:x.path,score:scorePath(x.path),bytes:x.size}))
  .filter(x=>x.score>=25).sort((a,b)=>b.score-a.score||a.path.localeCompare(b.path)).slice(0,18);
const css=paths
  .filter(x=>/\.(css|scss|sass)$|tailwind\.config\.(js|ts)$/i.test(x.path)&&x.size<90_000)
  .sort((a,b)=>scorePath(b.path)-scorePath(a.path)).slice(0,12);
const swatches=new Map();
for (const item of css) {
  try {
    const file=await request("/contents/"+item.path.split("/").map(encodeURIComponent).join("/")+"?ref="+encodeURIComponent(ref));
    if(file.encoding!=="base64"||typeof file.content!=="string")continue;
    const source=Buffer.from(file.content.replace(/\s/g,""),"base64").toString("utf8");
    for(const m of source.matchAll(/(?:--[a-z-]*(?:brand|primary|accent|surface|background|foreground)[a-z-]*\s*:\s*|color\s*:\s*|background(?:-color)?\s*:\s*)(#[a-fA-F0-9]{3,8})\b/g)) {
      const v=m[1].toUpperCase();
      const old=swatches.get(v)||{color:v,count:0,paths:[]};
      old.count++;
      if(!old.paths.includes(item.path))old.paths.push(item.path);
      swatches.set(v,old);
    }
  } catch { /* Some CSS paths can be inaccessible; keep only observed evidence. */ }
}
const colors=[...swatches.values()].sort((a,b)=>b.count-a.count).slice(0,12);
const manifest={
  version:1,generatedAt:new Date().toISOString(),repository:metadata.full_name||raw,
  commit:tree.sha,visibility:metadata.private?"private":"public",
  discovered:{logoCandidates,colors,styleFileCandidates:css.map(x=>x.path)},
  verification:{
    logoApproved:false,paletteApproved:false,legalMarketingClaimsReviewed:false,
    notes:"Candidate evidence only. Review against live brand before publishing. No private source or secret values are included."
  }
};
process.stdout.write(JSON.stringify(manifest,null,2)+"\n");
