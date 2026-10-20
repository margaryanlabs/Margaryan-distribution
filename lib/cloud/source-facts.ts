/** Lightweight build facts verified against source metadata on 2026-10-20.
 * Not a runtime or security audit. Never record secret values here.
 */
export type SourceFact={stack:string;packageManager:string;build:string;deploymentNotes:string[]};
export const cloudSourceFacts:Record<string,SourceFact>={
 "promptence":{
  stack:"TanStack Start / Vite 8 (SSR candidate)",
  packageManager:"Bun 1.4.1 (declared)",
  build:"Bun-based preflight + tests + Vite build + TypeScript",
  deploymentNotes:["Vercel config declares four cron schedules; replace before cutover.",
   "Supabase SDK is present; verify Auth, storage, callbacks and functions separately.",
   "Verify actual production SSR startup/output after a clean build; do not assume static-only hosting."]
 },
 "das":{
  stack:"TanStack Start / Vite 8 (SSR candidate)",
  packageManager:"Bun referenced in worker scripts",
  build:"vite build",
  deploymentNotes:["Two separate worker scripts are present for speech and data rights.",
   "Verify SSR server output and long-running worker runtime before choosing Docker buildpack.",
   "Inspect 3D assets and caching before moving domains."]
 },
 "raios":{
  stack:"TanStack Start / Vite 8 (SSR candidate)",
  packageManager:"Bun referenced in verification scripts",
  build:"generate-raios-icons.mjs && vite build",
  deploymentNotes:["Build generates icons as a prerequisite.",
   "Supabase SDK is present; separately audit database, identities and object storage.",
   "Confirm SSR startup and integration/webhook endpoints on a staging host."]
 },
 "veto-sport":{
  stack:"Next.js 16",
  packageManager:"npm / Node 22 runtime candidate",
  build:"next build (prebuild runs node tests)",
  deploymentNotes:["Vercel config declares nine cron schedules; external scheduler required.",
   "Next.js can run as a Node server; verify image/cache and required runtime environment.",
   "Live provider polling must not depend on Vercel cron after cutover."]
 },
 "motion":{
  stack:"Next.js 16 with separate media worker",
  packageManager:"npm / Node >=22",
  build:"npm run build (many Motion quality tests in prebuild)",
  deploymentNotes:["Chromium/FFmpeg Motion render worker is a separate workload.",
   "Preserve private file storage and protected operator OAuth issuer.",
   "Keep CRM and sales worker schedules isolated from web render workload."]
 }
};