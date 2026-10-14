#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
const src=readFileSync("scripts/motion/cycles-promptence-studio.py","utf8");
const cli=readFileSync("scripts/motion/render-cycles-promptence.mjs","utf8");
const args=["scripts/motion/render-cycles-promptence.mjs","out/qa.mp4",
 "--screen","/owner/approved-public.png","--dry-run",
 "--width","1280","--height","720","--samples","24","--start","10","--end","33"];
const r=spawnSync(process.execPath,args,{encoding:"utf8",timeout:10000});
assert.equal(r.status,0,r.stderr);
const q=JSON.parse(r.stdout);
assert.equal(q.authenticProductSource,true);
assert.equal(q.engine,"Blender Cycles (ray tracing)");
assert.equal(q.frames,24);
assert.equal(q.durationSeconds,1);
assert.equal(q.publicationApproved,false);
for(const pattern of [/S\.render\.engine="CYCLES"/,/bpy\.ops\.wm\.save_as_mainfile/,
 /bpy\.ops\.file\.pack_all\(\)/,/camera_data\.dof\.use_dof=True/,
 /ShaderNodeTexImage/,/color=0x|principled\(/,/primitive_plane_add/]) assert.match(src,pattern);
assert.match(cli,/CINEMA2_REAL_CYCLES_MP4_VALIDATED/);
assert.match(cli,/ffprobe/);
assert.match(cli,/Incorrect encoded frame count/);
const bad=spawnSync(process.execPath,["scripts/motion/render-cycles-promptence.mjs",
 "out/qa.mp4","--screen","/owner/s.png","--dry-run","--samples","0"],{encoding:"utf8"});
assert.notEqual(bad.status,0);
const js=spawnSync(process.execPath,["--check","scripts/motion/render-cycles-promptence.mjs"],{encoding:"utf8"});
assert.equal(js.status,0,js.stderr);
console.log("Cycles ray traced source, reproducible native frame mastering and QA PASS");
