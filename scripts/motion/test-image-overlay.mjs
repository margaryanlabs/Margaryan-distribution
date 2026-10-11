#!/usr/bin/env node
import assert from "node:assert/strict";
import {stripTypeScriptTypes} from "node:module";
import {readFileSync} from "node:fs";
const load=path=>{
  let src=stripTypeScriptTypes(readFileSync(new URL("../../"+path,import.meta.url),"utf8"),{mode:"strip"});
  src=src.replace(/\bexport\s+(?=(?:async\s+)?(?:function|const|class|let|var)\b)/g,"");
  return new Function(src+"\nreturn {sanitizeOverlayDirection,overlayIsVisible,overlayEnvelope,overlayGeometry};")();
};
const q=load("lib/motion/image-overlay.ts");
const d=q.sanitizeOverlayDirection({
 overlayCorner:"top-right",overlaySize:.42,overlayOpacity:.6,
 overlayStart:.5,overlayDuration:1.5
},4);
assert.equal(d.overlayCorner,"top-right");assert.equal(d.overlayStart,.5);
assert.equal(d.overlayDuration,1.5);
assert.equal(q.overlayIsVisible(d,.1),false);
assert.equal(q.overlayIsVisible(d,1),true);
assert.equal(q.overlayIsVisible(d,2.2),false);
assert.equal(q.overlayEnvelope(d,1),.6);
assert.equal(q.overlayEnvelope(d,.5),0);
assert.ok(Math.abs(q.overlayEnvelope(d,1.99)-(0.01/.18*.6))<.000001);
for(const corner of ["top-left","top-right","bottom-left","bottom-right"]){
 for(const wh of [[1080,1920],[1920,1080],[1080,1080]]){
  const r=q.overlayGeometry(corner,...wh,.4);
  assert.ok(r.x>=0&&r.y>=0&&r.x+r.w<=wh[0]&&r.y+r.h<=wh[1]);
 }
}
assert.equal(q.sanitizeOverlayDirection({overlayCorner:"__proto__",overlayOpacity:200},4).overlayCorner,"bottom-right");
assert.equal(q.sanitizeOverlayDirection({overlayOpacity:200},4).overlayOpacity,1);
assert.equal(q.sanitizeOverlayDirection({overlayStart:3.75,overlayDuration:8},4).overlayDuration,.25);
console.log("Motion independent picture-in-picture: source-only timing, frame-safe four-corner geometry, fade envelopes and malicious parameter rejection PASS");
