#!/usr/bin/env node
import assert from "node:assert/strict";
import {parseLoudnormMeasurement,judgeAudioMaster} from "./qa-master-audio.mjs";
const fixture=`[Parsed_loudnorm_0]
{
  "input_i" : "-16.11",
  "input_tp" : "-1.60",
  "input_lra" : "3.80",
  "input_thresh" : "-26.30",
  "output_i" : "-16.00"
}`;
const metrics=parseLoudnormMeasurement(fixture);
assert.equal(metrics.integratedLUFS,-16.11);
assert.equal(metrics.truePeakDBTP,-1.6);
assert.equal(metrics.loudnessRangeLU,3.8);
assert.equal(judgeAudioMaster(metrics).state,"measured");
assert.equal(judgeAudioMaster(metrics).humanListeningRequired,true);
assert.equal(judgeAudioMaster(metrics).voiceNaturalnessVerified,false);
assert.equal(judgeAudioMaster({...metrics,integratedLUFS:-27}).state,"review");
assert.equal(judgeAudioMaster({...metrics,integratedLUFS:-9}).state,"review");
assert.equal(judgeAudioMaster({...metrics,truePeakDBTP:0}).state,"review");
assert.throws(()=>parseLoudnormMeasurement("nonsense"),/missing/);
assert.throws(()=>parseLoudnormMeasurement('{"input_i": "-inf", "input_tp": "-3", "input_lra": "0"}'),
 /missing|silent/);
console.log("Sound Director v2 final AAC audio QA parser, danger levels, explicit human review: PASS");
