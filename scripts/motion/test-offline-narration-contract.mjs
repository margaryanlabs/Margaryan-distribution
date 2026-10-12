#!/usr/bin/env node
/** Build-time safety contract; real Python dry-run requires an operator host. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const voice=readFileSync("scripts/motion/local-kokoro-narration.py","utf8");
const docs=readFileSync("docs/MOTION_OFFLINE_NEURAL_NARRATION.md","utf8");
assert.match(voice,/SUPPORTED_VOICES/);
assert.match(voice,/validate_pack/);
assert.match(voice,/VoicePlanError/);
assert.match(voice,/--dry-run/);
assert.match(voice,/--approved-model-rights/);
assert.match(voice,/modelDownloaded.*False/);
assert.match(voice,/duration-start-0\.55/);
assert.match(voice,/total-0\.50/);
assert.match(voice,/lang="en-us"/);
assert.match(voice,/Shorten script or edit shot length/);
assert.match(voice,/voiceGenerated.*False/);
assert.match(voice,/WAV_READY_NEEDS_HUMAN_REVIEW/);
assert.doesNotMatch(voice,/requests\.|urllib\.request|httpx\.|socket\.|subprocess\.|os\.system/);
assert.match(docs,/not installed there/i);
assert.match(docs,/voice naturalness/i);
console.log("Motion offline narrator: model rights, no network, cue length and human QA gates PASS");
