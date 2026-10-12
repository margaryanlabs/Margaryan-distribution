#!/usr/bin/env node
/**
 * Build-safe invariants. No Postgres credentials or paid video render needed.
 * Validate that owned worker can only run the fixed native cinematic preset.
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {resolve,dirname} from "node:path";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const file=p=>readFileSync(resolve(root,p),"utf8");
const queue=file("lib/motion/cloud-render-queue.ts");
const worker=file("scripts/motion/railway-render-worker.mjs");
const api=file("app/api/motion/render-jobs/route.ts");
const download=file("app/api/motion/render-jobs/[id]/file/route.ts");
const proxy=file("proxy.ts");
const docker=file("Dockerfile.motion-worker");
assert.match(queue,/pg_advisory_xact_lock/);
assert.match(queue,/for update skip locked/);
assert.match(queue,/motion_render_jobs/);
assert.match(queue,/count\(\*\)::text/);
assert.match(queue,/count\(\*\)::text[\s\S]*interval '24 hours'/);
assert.match(api,/MOTION_RENDER_ENABLED/);
assert.match(api,/originMatches\(request\)/);
assert.match(api,/body.preset!=="promptence_cinema"/);
assert.match(api,/MOTION_RENDER_QUEUE_BUSY/);
assert.match(download,/MOTION_WORKER_INTERNAL_SECRET/);
assert.match(download,/MOTION_WORKER_INTERNAL_URL/);
assert.doesNotMatch(download,/https:\/\/.*up\.railway\.app/);
assert.match(worker,/spawn\(process\.execPath/);
assert.match(worker,/render-master\.mjs/);
assert.match(worker,/ffprobe/);
assert.match(worker,/MAX_SECONDS=11\*60/);
assert.match(worker,/MAX_SECONDS\*1000/);
assert.match(worker,/timingSafeEqual/);
assert.match(worker,/MOTION_WORKER_INTERNAL_SECRET/);
assert.match(worker,/studio\?\.kill/);
assert.match(worker,/MOTION_RENDER_OUTPUT_DIR/);
assert.match(docker,/mcr\.microsoft\.com\/playwright/);
assert.match(docker,/ffmpeg/);
assert.match(docker,/npm run build/);
assert.match(proxy,/path==="\/motion\/render"|path==="\/motion\/mcp"/);
// Owner-render routes MUST NOT be in the special public proxy allowlist.
assert.ok(!proxy.includes('path==="/api/motion/render-jobs"'));
const project=JSON.parse(file("editorial/motion/promptence-2026-36s-directors-cut.motion.json"));
assert.equal(project.brand,"promptence");
assert.equal(project.format,"portrait");
assert.ok(project.scenes.length<=8);
assert.ok(project.scenes.every(scene=>scene.kind!=="screen"&&!scene.mediaId));
assert.ok(project.scenes.reduce((a,s)=>a+s.seconds,0)<=64);
console.log("Motion owned worker: immutable original cut, Postgres budget/locking, Basic-gated queue, private authenticated download, source-only FFmpeg — PASS");
