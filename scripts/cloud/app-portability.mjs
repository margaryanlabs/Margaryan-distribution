#!/usr/bin/env node
/** Offline read-only source portability audit. No writes, secrets or release authority. */
import {readFileSync,lstatSync,realpathSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
export const PROFILES=Object.freeze({
 vetogram:{repository:'margaryanlabs/Telegram-story-bot',files:['package.json','vercel.json','api/router.js','api/health.js','api/privacy-backup-worker.js']},
 promptence:{repository:'margaryan-labs/ai-revenue-navigator',files:['package.json','vercel.json','.env.example']}
});
const finding=(id,status,description)=>({id,status,description});
function readBounded(root,relative){
 const path=join(root,relative),target=realpathSync(path),stat=lstatSync(path);
 if(!target.startsWith(root+sep)||!stat.isFile()||stat.isSymbolicLink()||stat.size>256*1024)
  throw Error('Unsafe source file');
 return readFileSync(path,'utf8');
}
export function evaluatePortability(project,files){
 const profile=PROFILES[project];if(!profile)throw Error('Unknown project');
 const pkg=JSON.parse(files['package.json']),vercel=JSON.parse(files['vercel.json']),found=[];
 if(project==='vetogram'){
  const start=String(pkg.scripts?.start||'');
  const selfhost=String(pkg.scripts?.['start:selfhost']||'')==='node server/self-hosted.js';
  found.push(finding('portable_http_entrypoint',selfhost?'REVIEW':!start||/\bvercel\s+dev\b/i.test(start)?'BLOCK':'REVIEW',
   'Test a native Node HTTP entrypoint, request body parsing, API routing and public assets.'));
  found.push(finding('vercel_function_build',vercel.builds?.some?.(x=>x.use==='@vercel/node')&&!selfhost?'BLOCK':'REVIEW',
   'Replace Vercel function routing with a verified portable server.'));
  found.push(finding('fixed_vercel_user_link',String(files['api/privacy-backup-worker.js']||'').includes('telegram-story-bot-murex.vercel.app')?'BLOCK':'REVIEW',
   'Remove a fixed Vercel domain from archive notifications.'));
  found.push(finding('telegram_webhook','BLOCK','Prove one active signed webhook and no reuse of live Telegram staging sessions.'));
  found.push(finding('signed_background_jobs','BLOCK','Verify signed viewer and backup triggers with the new data plane.'));
  found.push(finding('neon_schema_v6_portability','BLOCK',
   'Latest VETOGRAM REBORN uses Neon schema v6 with OTP leases: verify live provider, replay and grants independently on isolated staging.'));
  found.push(finding('encrypted_session_restore','BLOCK','Verify session key custody, RLS, objects and isolated restore.'));
 }else{
  found.push(finding('bun_ssr_runtime',String(pkg.packageManager||'').startsWith('bun@')?'REVIEW':'BLOCK',
   'Verify generated Bun/TanStack SSR server entrypoint and build.'));
  const crons=Array.isArray(vercel.crons)?vercel.crons:[];
  found.push(finding('cron_replacement',crons.length?'BLOCK':'REVIEW',
   'Replace '+crons.length+' Vercel cron jobs with private scheduled workers, locks and telemetry.'));
  found.push(finding('managed_database_pin',String(vercel.env?.SUPABASE_URL||'').includes('.supabase.co')?'BLOCK':'REVIEW',
   'Review managed Supabase URL pins, Auth origin and OAuth redirect allowlist.'));
  found.push(finding('payment_oauth_and_tenant','BLOCK','Prove verified payment/refund webhooks, OAuth, email and tenant isolation.'));
  found.push(finding('locked_registry_mirror','BLOCK',
   'bun.lock may refer to Lovable package proxy; re-resolve against verified public registry before a VPS build.'));
  found.push(finding('data_restore','BLOCK','Prove PostgreSQL, Auth, Storage, RLS and encryption-key recovery.'));
 }
 return {schema:'markarian-app-portability/v1',project,repository:profile.repository,checks:found,
  blockers:found.filter(x=>x.status==='BLOCK').map(x=>x.id),
  verdict:found.some(x=>x.status==='BLOCK')?'BLOCKED':'HUMAN_REVIEW_REQUIRED',
  canDeployProduction:false,canMigrateProduction:false,canChangeDNS:false,
  warning:'Static source findings are not a live build, runtime test or deployment authorization.'};
}
export function audit(project,folder){
 const p=PROFILES[project];if(!p)throw Error('Unknown project');
 const root=realpathSync(resolve(folder)),files={};
 for(const relative of p.files)files[relative]=readBounded(root,relative);
 return evaluatePortability(project,files);
}
export function main(argv=process.argv.slice(2)){
 if(argv.length===1&&argv[0]==='--catalog'){process.stdout.write(JSON.stringify(Object.keys(PROFILES))+'\n');return 0;}
 if(argv.length!==3||argv[0]!=='--audit'||!PROFILES[argv[1]]||!argv[2].startsWith('/')){
  process.stderr.write('Usage: app-portability.mjs --audit vetogram|promptence /absolute/checkout\n');return 2;
 }
 try{
  const result=audit(argv[1],argv[2]);
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  return result.verdict==='BLOCKED'?1:3;
 }catch{process.stderr.write('BLOCKED: unavailable or unsafe source checkout.\n');return 1;}
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)process.exitCode=main();
