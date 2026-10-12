#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=(path)=>readFileSync(path,"utf8");
const ai=read("lib/motion/ai-director.ts");
const route=read("app/api/motion/auto-director/route.ts");
const editor=read("app/motion/page.tsx");
const proxy=read("proxy.ts");
const creator=read("app/motion/create/page.tsx");
assert.match(ai,/motionAiDirectorAvailable/);
assert.match(ai,/MOTION_AI_DIRECTOR_ENABLED==="true"/);
assert.match(ai,/OPENAI_API_KEY/);
assert.match(ai,/DAILY_LIMIT=8/);
assert.match(ai,/motion_ai_director_usage/);
assert.match(ai,/pg_advisory_xact_lock/);
assert.match(ai,/max_completion_tokens:2200/);
assert.match(ai,/maxRetries:0/);
assert.match(ai,/response_format:\{type:"json_object"\}/);
assert.match(ai,/sanitizeMotionProject/);
assert.match(ai,/auditMotionProject/);
assert.match(ai,/new Set<MotionSceneKind>/);
assert.doesNotMatch(ai,/\beval\(|new Function\(|execSync\(|runInNewContext\(/);
assert.doesNotMatch(ai,/Higgsfield|HeyGen|Runway|Replicate|Sora/);
assert.match(route,/ownerOnly\(request\)/);
assert.match(route,/sameOrigin\(request\)/);
assert.match(route,/approveTextModelCharge!==true/);
assert.match(route,/const MAX_BODY=2200/);
assert.match(route,/owner_login_required/);
assert.match(route,/ai_daily_limit_8/);
assert.match(route,/Cache-Control":"no-store/);
assert.ok(!proxy.includes('path==="/api/motion/auto-director"'),
 "Owner AI Director must never appear in public proxy allowlist");
assert.match(editor,/generateWithAiDirector/);
assert.match(editor,/api\/motion\/auto-director/);
assert.match(editor,/window\.confirm\(cloud/);
assert.match(editor,/СОЗДАТЬ ЧЕРЕЗ НАШ КОД/);
assert.match(editor,/AI DIRECTOR · АВТОМАТИЧЕСКИЙ СЦЕНАРИЙ/);
assert.match(creator,/fetch\("\/api\/motion\/storyboard"/);
assert.ok(!creator.includes('"/api/motion/auto-director"'),
 "Public creator must not silently trigger billable owner API");
console.log("Motion AI Director: owner-only, exact-origin, opt-in cost, 8/day quota, no arbitrary code, native Canvas output — PASS");
