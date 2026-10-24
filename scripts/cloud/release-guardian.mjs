#!/usr/bin/env node
/** Release Guardian: fixed portfolio blueprints + evidence-only, fail-closed staging gate.
 * Not connected to Coolify, GitHub or customer production. Never deploys anything.
 */
import {readFileSync,lstatSync} from "node:fs";
import {isAbsolute} from "node:path";
import {pathToFileURL} from "node:url";
export const PROJECTS=Object.freeze([
  {
    "id": "decision-command",
    "name": "VETO Decision Command",
    "repository": "margaryanlabs/decision-command",
    "kind": "web-worker",
    "risk": "critical",
    "port": 8000,
    "checks": [
      "ci",
      "source_sha",
      "worker_health",
      "market_freshness",
      "paper_governor",
      "zero_live_authority",
      "staging_smoke",
      "offsite_backup",
      "restore_drill",
      "rollback_plan"
    ],
    "notes": [
      "Worker /healthz is liveness only; verify /market-readyz and /governed-paper-readyz independently.",
      "Gov PAPER evidence never enables live orders. Check exchange authority and owner-scoped portfolio epochs."
    ]
  },
  {
    "id": "vetogram",
    "name": "VETOGRAM",
    "repository": "margaryanlabs/Telegram-story-bot",
    "kind": "web-worker",
    "risk": "high",
    "port": 3000,
    "checks": [
      "ci",
      "source_sha",
      "telegram_session",
      "telegram_permissions",
      "webhook_ownership",
      "staging_smoke",
      "offsite_backup",
      "restore_drill",
      "rollback_plan"
    ],
    "notes": [
      "Check Telegram session credential isolation; avoid reusing live MTProto session during staging.",
      "Business automation, story posting and anti-delete permissions require separate end-to-end checks."
    ]
  },
  {
    "id": "sofia",
    "name": "SOFIA / DAS",
    "repository": "margaryan-labs/das-speak-armenia",
    "kind": "web",
    "risk": "high",
    "port": 3000,
    "checks": [
      "ci",
      "source_sha",
      "student_data",
      "auth_isolation",
      "assets_3d",
      "staging_smoke",
      "offsite_backup",
      "restore_drill",
      "rollback_plan"
    ],
    "notes": [
      "Verify school/student data isolation and 3D fallback on low-end mobile."
    ]
  },
  {
    "id": "promptence",
    "name": "Promptence",
    "repository": "margaryan-labs/ai-revenue-navigator",
    "kind": "web-worker",
    "risk": "high",
    "port": 3000,
    "checks": [
      "ci",
      "source_sha",
      "oauth_redirects",
      "scheduled_jobs",
      "billing_webhooks",
      "staging_smoke",
      "offsite_backup",
      "restore_drill",
      "rollback_plan"
    ],
    "notes": [
      "Test GA4/GSC OAuth redirect allowlists and background ingestion with isolated test accounts."
    ]
  },
  {
    "id": "veto-sport",
    "name": "VETO Sport",
    "repository": "margaryanlabs/Vetosport",
    "kind": "web-worker",
    "risk": "high",
    "port": 3000,
    "checks": [
      "ci",
      "source_sha",
      "provider_quotas",
      "data_freshness",
      "staging_smoke",
      "offsite_backup",
      "restore_drill",
      "rollback_plan"
    ],
    "notes": [
      "Odds and event feed freshness must not be confused with correct predictions."
    ]
  },
  {
    "id": "ingu-shop",
    "name": "INGU Shop",
    "repository": "margaryan-labs/ingu-stone-sourcing",
    "kind": "web",
    "risk": "standard",
    "port": 3000,
    "checks": [
      "ci",
      "source_sha",
      "product_inventory",
      "payment_isolation",
      "staging_smoke",
      "offsite_backup",
      "restore_drill",
      "rollback_plan"
    ],
    "notes": [
      "Check catalogue truth, order processing and real payment staging isolation."
    ]
  },
  {
    "id": "meqena",
    "name": "MEQENA",
    "repository": "margaryanlabs/Shtapauto",
    "kind": "web",
    "risk": "standard",
    "port": 3000,
    "checks": [
      "ci",
      "source_sha",
      "tenant_isolation",
      "image_storage",
      "staging_smoke",
      "offsite_backup",
      "restore_drill",
      "rollback_plan"
    ],
    "notes": [
      "Dealership cross-tenant data access must be checked before public release."
    ]
  },
  {
    "id": "margaryan-cloud",
    "name": "Margaryan Cloud / Motion Studio",
    "repository": "margaryanlabs/Margaryan-distribution",
    "kind": "media",
    "risk": "critical",
    "port": 3000,
    "checks": [
      "ci",
      "source_sha",
      "operator_auth",
      "private_networks",
      "media_storage",
      "staging_smoke",
      "offsite_backup",
      "restore_drill",
      "rollback_plan"
    ],
    "notes": [
      "Motion render workers need separate capacity and trusted source assets.",
      "Cloud operator access must be hardened beyond Basic authentication before multi-tenant hosting."
    ]
  },
  {
    "id": "raios",
    "name": "RAIOS",
    "repository": "margaryan-labs/ai-os-foundation",
    "kind": "web-worker",
    "risk": "high",
    "port": 3000,
    "checks": [
      "ci",
      "source_sha",
      "tenant_isolation",
      "integration_webhooks",
      "staging_smoke",
      "offsite_backup",
      "restore_drill",
      "rollback_plan"
    ],
    "notes": [
      "Verify canonical deploy repo and owner-level customer isolation."
    ]
  }
]);
export const CORE_GATES=Object.freeze(["ci","source_sha","staging_smoke","offsite_backup","restore_drill","rollback_plan"]);
const SHA=/^[a-f0-9]{40}$/, LABEL=/^[a-z][a-z0-9-]{1,47}$/, REPO=/^(margaryanlabs|margaryan-labs)\/[A-Za-z0-9_.-]{1,100}$/;
export function blueprint(id){
 const p=PROJECTS.find(p=>p.id===id);
 if(!p)throw new Error("Unknown project profile; review and register the canonical repository");
 return {...p,environment:"staging",deployment:"manual-review-only",autoDeploy:false,canTrade:false};
}
export function assess(input){
 if(!input||typeof input!=="object"||Array.isArray(input))throw Error("Expected release review manifest");
 const p=blueprint(input.project);
 if(input.environment!=="staging")throw Error("Release Guardian V1 accepts staging review only");
 if(input.repository!==p.repository||!REPO.test(input.repository))throw Error("Repository must exactly match registered project profile");
 if(typeof input.commit!=="string"||!SHA.test(input.commit))throw Error("Exact 40-digit Git commit SHA required");
 if(typeof input.releaseName!=="string"||!LABEL.test(input.releaseName))throw Error("Safe lowercase release name required");
 if(input.authorizeDeploy!==undefined||input.secret!==undefined||input.token!==undefined||input.apiKey!==undefined)throw Error("Manifest must not carry credentials or deployment authority");
 if(!input.evidence||typeof input.evidence!=="object"||Array.isArray(input.evidence))throw Error("Evidence object is required");
 for(const key of Object.keys(input.evidence))if(!p.checks.includes(key))throw Error("Unexpected evidence field: "+key);
 const checks=p.checks.map(id=>{
   const v=input.evidence[id];
   if(v===undefined||v===null)return {id,status:"MISSING"};
   if(!v||typeof v!=="object"||Array.isArray(v)||Object.keys(v).some(k=>!["status","reference"].includes(k)))throw Error("Invalid evidence structure");
   if(!["pass","fail","unknown"].includes(v.status))throw Error("Invalid evidence status");
   if(typeof v.reference!=="string"||v.reference.length<8||v.reference.length>180||/[\s<>"'\\]/.test(v.reference)||!/^https:\/\/github\.com\/(margaryanlabs|margaryan-labs)\/[\w.-]+\/(?:actions\/runs\/\d+|pull\/\d+|commit\/[0-9a-f]{40})$/.test(v.reference))
    throw Error("Evidence must reference a bounded GitHub run, pull request or commit");
   return {id,status:v.status==="pass"?"ATTESTED_PASS":v.status==="fail"?"REPORTED_FAILURE":"UNKNOWN"};
 });
 const missing=checks.filter(x=>x.status!=="ATTESTED_PASS").map(x=>x.id);
 return {schema:"markarian-release-guardian/v1",project:p.id,repository:p.repository,commit:input.commit,releaseName:input.releaseName,
  risk:p.risk,kind:p.kind,environment:"staging",checks,blockers:missing,
  verdict:missing.length?"BLOCKED":"REVIEW_REQUIRED",requiredIndependentVerification:p.checks,
  notes:p.notes,warning:"Evidence is operator-supplied metadata, not independently verified by this CLI. Review checks directly.",
  permissions:{deployed:false,canDeploy:false,canMigrateProduction:false,canTrade:false,canChangeDns:false,canRestoreDatabase:false}};
}
export function main(args=process.argv.slice(2),out=process.stdout,err=process.stderr){
 const [flag,arg,...rest]=args;
 if(rest.length||!["--catalog","--blueprint","--assess"].includes(flag)||
    (flag==="--catalog"&&arg)||(flag!=="--catalog"&&!arg)){
   err.write("Usage: release-guardian.mjs --catalog | --blueprint PROJECT | --assess /absolute/manifest.json\n");return 2;
 }
 try{
  if(flag==="--catalog"){out.write(JSON.stringify(PROJECTS.map(({id,name,repository,risk})=>({id,name,repository,risk})),null,2)+"\n");return 0;}
  if(flag==="--blueprint"){out.write(JSON.stringify(blueprint(arg),null,2)+"\n");return 0;}
  if(!isAbsolute(arg))throw Error("Manifest path must be absolute");
  const info=lstatSync(arg);
  if(!info.isFile()||(info.mode&0o077)!==0||info.size>32768||
    (typeof process.getuid==="function"&&info.uid!==process.getuid()))throw Error("Manifest requires operator-owned private 0600 regular file <=32KB");
  const data=JSON.parse(readFileSync(arg,"utf8"));const result=assess(data);
  out.write(JSON.stringify(result,null,2)+"\n");return result.verdict==="BLOCKED"?1:3; // REVIEW_REQUIRED is NOT a passing release gate
 }catch{err.write("RELEASE NOT APPROVED: invalid project, missing evidence or unsafe manifest. No deployment.\n");return 1;}
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)process.exitCode=main();
