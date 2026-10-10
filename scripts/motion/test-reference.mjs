#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp,readFile,stat,rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";

/** ffmpeg-backed contract: checks exact repo reference comparator, not a mocked score. */
function run(cmd,args,timeout=90000){
  const p=spawnSync(cmd,args,{encoding:"utf8",timeout,maxBuffer:2_000_000});
  if(p.status!==0)throw new Error(cmd+" failed ("+p.status+"): "+(p.stderr||p.stdout||p.error||"unknown").slice(-1100));
  return p.stdout;
}
const dir=await mkdtemp(join(tmpdir(),"motion-reference-"));
try{
  const a=join(dir,"ours.mp4"),b=join(dir,"reference.mp4");
  for(const [name,hex] of [[a,"#143b30"],[b,"#bdb5ab"]]){
    run("ffmpeg",["-y","-hide_banner","-loglevel","error",
      "-f","lavfi","-i","color=c="+hex+":s=640x360:r=30:d=3.0",
      "-c:v","mpeg4","-q:v","2",name]);
  }
  const result=JSON.parse(run(process.execPath,["scripts/motion/compare-reference.mjs",a,b],120000));
  assert.equal(result.status,"COMPLETED");
  assert.ok(result.report.endsWith(".reference-report.json"));
  const report=JSON.parse(await readFile(result.report,"utf8"));
  assert.equal(report.schema,"margaryan-motion-offline-reference/v1");
  assert.equal(report.pairedFrameCount,8);
  assert.equal(report.humanReviewRequired,true);
  assert.equal(report.metricsOnly,true);
  assert.equal(report.pairs.length,8);
  assert.ok(report.signal.lumaDelta< -45,"Reference brightness gap was not detected");
  assert.ok((await stat(result.contactSheet)).size>500,"Paired contact sheet unexpectedly empty");

  const self=JSON.parse(run(process.execPath,["scripts/motion/compare-reference.mjs",a,a],120000));
  assert.ok(Math.abs(self.signal.lumaDelta)<.02,"Self-comparison luma delta must be zero");
  assert.ok(Math.abs(self.signal.saturationDelta)<.02,"Self-comparison saturation delta must be zero");
  assert.ok(Math.abs(self.signal.temporalDifference)<.02,"Self-comparison temporal delta must be zero");
  process.stdout.write("Motion reference contract PASS: actual FFmpeg frames, brightness separation, contact sheet, self-comparison zero.\n");
}catch(error){
  process.stderr.write("Reference contract FAILED: "+String(error)+"\n");
  process.exitCode=1;
}finally{
  await rm(dir,{recursive:true,force:true});
}
