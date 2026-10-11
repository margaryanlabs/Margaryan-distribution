#!/usr/bin/env node
import assert from "node:assert/strict";
import {planBrowserFeature,MAX_BROWSER_FILM_SECONDS} from "../../lib/motion/film-browser-plan.ts";

const shot=(n,seconds=7.5)=>({
  id:"scene-"+n,kind:n===1?"opener":"statement",eyebrow:"FILM",headline:"REAL SCENE "+n,
  support:"Motion graphics are not made-up performance results.",seconds
});
const chapter=(n,count=8,seconds=7.5)=>({
  version:1,brand:"promptence",format:"portrait",title:"Act "+n,
  language:"en",scenes:Array.from({length:count},(_,k)=>shot(k+1,seconds))
});
const film=[chapter(1),chapter(2)];
const actual=planBrowserFeature(film);
assert.equal(actual.total,120);
assert.equal(actual.brand,"promptence");
assert.equal(actual.segments.length,2);
assert.deepEqual(actual.segments.map(x=>[x.start,x.end]),[[0,60],[60,120]]);
assert.equal(MAX_BROWSER_FILM_SECONDS,192);
assert.equal(planBrowserFeature([chapter(1,8,8),chapter(2,8,8),chapter(3,8,8)]).total,192);
assert.throws(()=>planBrowserFeature([]),/1–8/);
assert.throws(()=>planBrowserFeature(Array(9).fill(chapter(1))),/1–8/);
assert.throws(()=>planBrowserFeature([chapter(1,8,8),chapter(2,8,8),chapter(3,8,8),chapter(4,1,8)]),/192s/);
assert.throws(()=>planBrowserFeature([chapter(1),{...chapter(2),format:"landscape"}]),/one brand and film format/);
assert.throws(()=>planBrowserFeature([chapter(1),{...chapter(2),brand:"veto"}]),/one brand and film format/);
assert.throws(()=>planBrowserFeature([{...chapter(1),scenes:[{...shot(1),kind:"screen"}]}]),/Real source/);
assert.throws(()=>planBrowserFeature([{...chapter(1),scenes:[{...shot(1),mediaId:"approved-private-clip"}]}]),/Real source/);
assert.throws(()=>planBrowserFeature([{...chapter(1),scenes:[{...shot(1),overlayMediaId:"approved-photo"}]}]),/Real source/);
assert.throws(()=>planBrowserFeature([{...chapter(1),signatureFilm:"promptence-answer"}]),/Signature-film/);
assert.throws(()=>planBrowserFeature([{...chapter(1),scenes:[{...shot(1),seconds:Infinity}]}]),/Invalid film scene duration/);
assert.throws(()=>planBrowserFeature([{...chapter(1),scenes:[{...shot(1),seconds:9}]}]),/Invalid film scene duration/);
assert.throws(()=>planBrowserFeature([{...chapter(1),scenes:[]}]),/1–8 real scenes/);
console.log("Motion browser workprint contract PASS: 120s/192s boundaries, real-source exclusions, chapter timing and brand safety");
