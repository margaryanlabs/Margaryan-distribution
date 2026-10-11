#!/usr/bin/env node
/** Regression: public site real-click recorder refuses unsafe automation. */
import assert from "node:assert/strict";
import {TARGETS,PLAN,validatePlan,assertSafeClick,smooth,
 createCinematicProject,FPS,TAKE_ID} from "./interaction-cinema-core.mjs";
const stats=validatePlan();
assert.equal(stats.actions,10);
assert.equal(stats.frames,820);
assert.equal(stats.duration,34.167);
assert.ok(!JSON.stringify(TARGETS).toLowerCase().includes("submit"));
assert.ok(!JSON.stringify(TARGETS).includes("Run Free Scan"));
assert.throws(()=>validatePlan([{id:"hack",kind:"click",target:"pay-button",seconds:3}]),/unapproved selector/);
assert.throws(()=>validatePlan([{id:"hack",kind:"click",target:"website",seconds:3}]),/unsafe click/);
assert.throws(()=>validatePlan([{id:"hack",kind:"type",target:"website",text:"line1\nline2",seconds:3}]),/unapproved input/);
assert.throws(()=>validatePlan([{id:"hack",kind:"click",target:"check-link",seconds:3},{id:"hack",kind:"click",target:"check-link",seconds:3}]),/duplicate/);
const ok={tag:"A",href:"#free-check",visible:true,enabled:true};
assert.equal(assertSafeClick(TARGETS["check-link"],ok),true);
assert.throws(()=>assertSafeClick(TARGETS["check-link"],{...ok,href:"https://bad.example"}),/navigation/);
assert.throws(()=>assertSafeClick(TARGETS["local-tab"],{tag:"BUTTON",type:"submit",role:"radio",visible:true,enabled:true,insideForm:true}),/button could submit/);
assert.equal(assertSafeClick(TARGETS["local-tab"],{tag:"BUTTON",type:"button",role:"radio",visible:true,enabled:true,insideForm:true}),true);
assert.equal(smooth(0),0);assert.equal(smooth(1),1);
assert.ok(Math.abs(smooth(.5)-.5)<1e-9);
const project=createCinematicProject({duration:34.167});
assert.equal(project.format,"portrait");
assert.equal(project.scenes.length,8);
assert.deepEqual(project.scenes.map(x=>x.mediaStart),[0,3.4,6.8,10.2,13.6,17,20.4,27.2]);\nassert.equal(Number(project.scenes.reduce((n,s)=>n+s.seconds,0).toFixed(3)),34);
assert.deepEqual(project.scenes.map(s=>s.seconds),[3.4,3.4,3.4,3.4,3.4,3.4,6.8,6.8]);\nassert.ok(project.scenes.at(-1).mediaStart+project.scenes.at(-1).seconds<34.167);
assert.ok(project.scenes.every(s=>s.kind==="screen"&&s.mediaId===TAKE_ID&&s.transition==="cut"));
assert.throws(()=>createCinematicProject({duration:20}),/source take/);
console.log("Motion Interaction Cinema: real-click, no-submit policy, cinematic edit and source timing PASS");
