#!/usr/bin/env node
/** Operator revisions are local, constrained and not an automatic QA approval. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {stripTypeScriptTypes} from "node:module";
const code=readFileSync(new URL("../../lib/motion/review-markers.ts",import.meta.url),"utf8");
const mod=await import("data:text/javascript;base64,"+
 Buffer.from(stripTypeScriptTypes(code,{mode:"strip"})).toString("base64"));
const {sanitizeReviewMarker,parseReviewMarkers,addReviewMarker,
 reviewMarkersAsText,updateReviewMarkerStatus,markerSceneIndex,reviewProjectStorageKey}=mod;
assert.equal(reviewProjectStorageKey("veto","Investor Film"),
 reviewProjectStorageKey("veto","Investor Film"));
assert.notEqual(reviewProjectStorageKey("veto","Investor Film"),
 reviewProjectStorageKey("promptence","Investor Film"));
const first=addReviewMarker([],{id:"marker-rev-001",sceneId:"scene-001",
 shotIndex:0,atSeconds:1.32,priority:"critical",text:" Verify source claim  "});
assert.equal(first.length,1);
assert.equal(first[0].status,"open");
assert.equal(first[0].text,"Verify source claim");
assert.equal(first[0].atSeconds,1.32);
const resolved=updateReviewMarkerStatus(first,"marker-rev-001","resolved");
assert.equal(resolved[0].status,"resolved");
assert.equal(first[0].status,"open","Input must remain immutable");
const scenes=[{id:"scene-999"},{id:"scene-001"}];
assert.equal(markerSceneIndex(first[0],scenes),1,"Notes follow stable scene identity when reordered");
assert.equal(markerSceneIndex(first[0],[...scenes,{id:"scene-001"}]),null,
 "Ambiguous duplicate IDs must never jump into wrong footage");
assert.equal(markerSceneIndex(first[0],[{id:"scene-999"}]),null);
assert.equal(sanitizeReviewMarker({...first[0],atSeconds:NaN}),null);
assert.equal(sanitizeReviewMarker({...first[0],id:"<script>"}),null);
assert.equal(sanitizeReviewMarker({...first[0],priority:"published"}),null);
assert.equal(sanitizeReviewMarker({...first[0],text:""}),null);
const cleaned=sanitizeReviewMarker({...first[0],text:"hi\nBCC:fake"});
assert.equal(cleaned.text,"hi BCC:fake");
assert.equal(cleaned.status,"open");
const invalid=[first[0],first[0],{...first[0],priority:"certified"}];
assert.equal(parseReviewMarkers(invalid).length,1);
const out=reviewMarkersAsText("Owner Film",resolved,scenes);
assert.match(out,/HUMAN REVIEW NOTES/);
assert.match(out,/not audited film quality or client approval/i);
assert.match(out,/\[RESOLVED\]/);
assert.match(out,/SHOT 2/);
const old=reviewMarkersAsText("Owner Film",resolved,[{id:"missing"}]);
assert.match(old,/SHOT UNLINKED/);
let list=[];
for(let i=0;i<60;i++)list=addReviewMarker(list,{
 id:"marker-"+String(i).padStart(6,"0"),sceneId:"scene-001",shotIndex:0,
 atSeconds:i,priority:"note",text:"Clip review"
});
assert.equal(list.length,60);
assert.throws(()=>addReviewMarker(list,{
 id:"marker-overflow",sceneId:"scene-001",shotIndex:0,
 atSeconds:4,priority:"note",text:"Extra"
}),/Maximum 60/);
const page=readFileSync(new URL("../../app/motion/page.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../../app/motion/motion.module.css",import.meta.url),"utf8");
assert.match(page,/ReviewNotesDesk project=\{project\}/);
assert.match(page,/data-focus=\{focusMode\}/);
assert.match(page,/className=\{styles\.shortcutSheet\}/);
assert.match(page,/className=\{styles\.stageTopTools\}/);
assert.match(page,/key==="ArrowLeft"\|\|event\.key==="ArrowRight"/);
assert.match(page,/if\(event\.code==="Space"\)/);
assert.match(page,/event\.target as HTMLElement\|null/);
assert.match(page,/review-notes/);
assert.match(css,/\.workspace\[data-focus="true"\]/);
assert.match(css,/\.shortcutSheet/);
assert.match(page,/inspectorWide\?"440px":"344px"/);
assert.match(page,/motion-inspector-wide-v1/);
assert.match(page,/aria-pressed=\{inspectorWide\}/);
assert.match(css,/var\(--inspector-width,344px\)/);
console.log("Motion Focus + Notes PASS: 60 bounded local markers, human-only status, safe export, shot orphan protection, keyboard-safe cinema view.");
