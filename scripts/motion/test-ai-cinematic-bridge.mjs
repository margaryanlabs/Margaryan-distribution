import assert from "node:assert/strict";
import {
  buildCinematicPack,cinematicTextPack,quickProjectFromCinematic
} from "../../lib/motion/ai-cinematic-bridge.ts";

const brief="Создать кинематографическую рекламу VETOGRAM с акцентом на управление историями.";
const pack=buildCinematicPack({concept:brief,brandLabel:"VETOGRAM",format:"portrait"});
assert.equal(pack.generatedBy,"local_prompt_compiler");
assert.equal(pack.paidGenerationStarted,false);
assert.equal(pack.shots.length,4);
assert.equal(pack.totalSeconds,18);
assert.ok(pack.shots.every(s=>s.visualPrompt.includes("9:16")));
assert.ok(pack.shots.every(s=>s.avoid.includes("fake")));
const quick=quickProjectFromCinematic(pack);
assert.equal(quick.pipeline,"quick");
assert.equal(quick.shots.length,4);
assert.equal(quick.shots[0].id,"shot-1");
assert.equal(quick.language,"ru");
assert.equal(quick.format,"portrait");
const text=cinematicTextPack(pack);
assert.match(text,/No API requests, charges, generated media or MP4/);
assert.match(text,/SHOT 04/);
assert.throws(()=>buildCinematicPack({concept:"short",brandLabel:"X",format:"square"}),/12/);
const project={brand:"veto",format:"landscape",scenes:[
  {id:"a",kind:"opener",headline:"REAL UI",support:"Demo",seconds:20},
  {id:"b",kind:"closer",headline:"TRY IT",support:"Visit product",seconds:3}
]};
const customized=buildCinematicPack({concept:brief,brandLabel:"VETOGRAM",format:"landscape",project});
assert.equal(customized.shots.length,2);
assert.equal(customized.shots[0].seconds,8);
assert.equal(customized.shots[1].seconds,3);
assert.equal(quickProjectFromCinematic(customized).brand,"veto");
console.log("AI Cinematic bridge contracts: PASS");
