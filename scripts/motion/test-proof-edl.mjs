#!/usr/bin/env node
/** Real-source editor timing contract, no browser network and no fake footage. */
import assert from "node:assert/strict";
import {PROOF_DEFAULT_EDL,sanitizeProofEDL,proofSourceTime,proofShotAt,reviewProofEDL,proofEDLFile,parseProofEDLFile} from "../../lib/motion/proof-edl.ts";

const d=20;
const edl=sanitizeProofEDL({firstIn:2.1,secondIn:12.5,cutAt:4.4,zoom:1.16},d);
assert.deepEqual(edl,{firstIn:2.1,secondIn:12.5,cutAt:4.4,zoom:1.16});
assert.equal(proofShotAt(0,edl),"HOOK");
assert.equal(proofShotAt(3,edl),"OBSERVE");
assert.equal(proofShotAt(4.5,edl),"VERIFY");
assert.equal(proofShotAt(9,edl),"CLOSE");
const before=proofSourceTime(4.39,d,edl),after=proofSourceTime(4.40,d,edl);
assert.ok(after-before>6,"Edit point must visibly jump to the second genuine source take");
assert.ok(proofSourceTime(0,d,edl)>1.9);
assert.equal(proofSourceTime(4.4,d,edl),12.5);
assert.equal(proofSourceTime(100,d,edl),18.1);
const malformed=sanitizeProofEDL({firstIn:-5,secondIn:999,cutAt:Infinity,zoom:-500},8);
assert.equal(malformed.firstIn,0);
assert.equal(malformed.secondIn,7.88);
assert.equal(malformed.cutAt,PROOF_DEFAULT_EDL.cutAt);
assert.equal(malformed.zoom,.82);
const empty=sanitizeProofEDL({},8);
assert.deepEqual(empty,PROOF_DEFAULT_EDL);
assert.deepEqual(sanitizeProofEDL({},8),empty,"sanitizer must be deterministic");
const okay=reviewProofEDL(8,PROOF_DEFAULT_EDL);
assert.equal(okay.pass,true,"8s source should cover both default source takes");
const forbidden=reviewProofEDL(8,{...PROOF_DEFAULT_EDL,secondIn:7});
assert.equal(forbidden.pass,false,"Must block last-frame holds disguised as cinematic footage");
assert.equal(forbidden.problems.length,1);
const file=proofEDLFile(edl);
assert.equal(file.kind,"margaryan-motion-source-edl");
assert.deepEqual(parseProofEDLFile(file),edl,"Source-cut JSON roundtrip must preserve decisions");
assert.throws(()=>parseProofEDLFile({...file,version:9}));
assert.throws(()=>parseProofEDLFile({...file,firstIn:NaN}));
process.stdout.write("Proof EDL contract PASS: real cuts, source footage gate, JSON roundtrip.\\n");
