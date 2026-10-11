#!/usr/bin/env node
/** Release regression check for the in-place editor UI architecture.
 * Does not replace actual browser/phone visual validation.
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const page=readFileSync(new URL("../../app/motion/page.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../../app/motion/motion.module.css",import.meta.url),"utf8");
const required=["create","media","scene","sound","look","review","deliver"];
for(const name of required){
  assert.match(page,new RegExp('\\["'+name+'","'),"Rail must provide "+name);
}
assert.match(page,/const \[editorPanel,setEditorPanel\]/);
assert.match(page,/className=\{styles\.editorRail\}/);
assert.match(page,/className=\{styles\.inspectorScroll\}/);
assert.match(page,/className=\{styles\.quickSceneEdit\}/);
assert.match(page,/className=\{styles\.advancedTimeline\}/);
assert.match(page,/hidden=\{editorPanel!=="media"\}/);
assert.match(page,/hidden=\{editorPanel!=="create"\}/);
assert.match(page,/hidden=\{editorPanel!=="scene"\}/);
assert.match(page,/hidden=\{editorPanel!=="sound"\}/);
assert.match(page,/hidden=\{editorPanel!=="look"\}/);
assert.match(page,/hidden=\{editorPanel!=="review"\}/);
assert.match(page,/hidden=\{editorPanel!=="deliver"\}/);
assert.match(page,/className=\{styles\.stageShell\}/);
assert.match(page,/ref=\{previewRef\}/);
assert.match(page,/onClick=\{\(\) => \{selectScene\(index\);setEditorPanel\("scene"\);\}\}/);
assert.match(page,/onClick=\{\(\)=>void exportVideo\(\)\}/);
assert.match(page,/onClick=\{saveJson\}/);
assert.match(page,/aria-current=\{editorPanel===panel\?"page":undefined\}/);
assert.match(page,/window\.matchMedia\("\(max-width: 850px\)"\)/);
assert.match(css,/\.workspace\{max-width:1760px;grid-template-columns:72px minmax\(0,1fr\) 344px/);
assert.match(css,/\.sidebar\{\s*grid-column:3;grid-row:1/);
assert.match(css,/\.stageSection\{\s*grid-column:2;grid-row:1/);
assert.match(css,/\.panelSection\[hidden\]\{display:none!important\}/);
assert.match(css,/@media\(max-width:850px\)/);
assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
console.log("Motion Workspace V2 PASS: 7 direct edit modes, centered player, scoped inspector, timeline, secure delivery shortcuts, mobile and reduced motion.");
