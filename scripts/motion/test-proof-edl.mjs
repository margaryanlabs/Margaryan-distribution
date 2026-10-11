#!/usr/bin/env node
/** Real-source editor timing contract, no browser network and no fake footage. */
import assert from "node:assert/strict";
import {PROOF_DEFAULT_EDL,sanitizeProofEDL,proofSourceTime,proofShotAt} from "../../lib/motion/proof-edl.ts";

const d=20;
const edl=sanitizeProofEDL({firstIn:2.1,secondIn:12.5,cutAt:4.4,zoom:1.16},d);
assert.deepEqual(edl,{firstIn:2.1,secondIn:12.5,cutAt:4.4,zoom:1.16});
assert.equal(proofShotAt(0,edl),"HOOK");
assert.equal(proofShotAt(3,edl),"OBSERVE");
assert.equal(proofShotAt(4.5,edl),"VERIFY");
assert.equal(proofShotAt(9,edl),"CLOSE");
const before=proofSourceTime(4.39,d,edl),after=proofSourceTime(4.40,d,edl);
assert.ok(after-before>7,"Edit point must visibly jump to the second genuine source take");
assert.ok(proofSourceTime(0,d,edl)>1.9);
assert.equal(proofSourceTime(4.4,d,edl),12.5);
assert.equal(proofSourceTime(100,d,edl),19.88);
const malformed=sanitizeProofEDL({firstIn:-5,secondIn:999,cutAt:Infinity,zoom:-500},8);
assert.equal(malformed.firstIn,0);
assert.equal(malformed.secondIn,7.88);
assert.equal(malformed.cutAt,PROOF_DEFAULT_EDL.cutAt);
assert.equal(malformed.zoom,.82);
const empty=sanitizeProofEDL({},8);
assert.deepEqual(empty,PROOF_DEFAULT_EDL);
assert.deepEqual(sanitizeProofEDL({},8),empty,"sanitizer must be deterministic");
process.stdout.write("Proof EDL pure contract PASS: actual source cuts, limits, view windows, stable defaults.\n");
