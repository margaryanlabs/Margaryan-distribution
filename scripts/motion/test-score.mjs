#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile,writeFile,mkdtemp,rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import {tmpdir} from "node:os";
import {join} from "node:path";
import process from "node:process";
/** Exact PCM regression: proven musical output, no API or codec dependencies. */
const temp=await mkdtemp(join(tmpdir(),"motion-score-"));
try{
  const source=join(temp,"film.json");
  const base={
    brand:"promptence",seed:41,
    scenes:[{kind:"kinetic",seconds:2.7},{kind:"network",seconds:3.3},{kind:"closer",seconds:2.2}]
  };
  await writeFile(source,JSON.stringify(base));
  const outputs=[];
  for(let i=0;i<3;i++){
    if(i===2)await writeFile(source,JSON.stringify({...base,brand:"tun"}));
    const file=join(temp,"score-"+i+".wav");
    const run=spawnSync(process.execPath,["scripts/motion/score-film.mjs",source,file],{encoding:"utf8",timeout:30_000});
    assert.equal(run.status,0,run.stderr||run.stdout);
    const bytes=await readFile(file);
    assert.equal(bytes.toString("ascii",0,4),"RIFF");
    assert.equal(bytes.toString("ascii",8,12),"WAVE");
    assert.equal(bytes.readUInt16LE(20),1);
    assert.equal(bytes.readUInt16LE(22),1);
    assert.equal(bytes.readUInt32LE(24),44100);
    assert.equal(bytes.readUInt16LE(34),16);
    assert.equal(bytes.length,44+Math.round(8.2*44100)*2);
    let nonzero=0;
    for(let s=1000;s<bytes.length-2000;s+=200){
      if(bytes.readInt16LE(s-(s%2))!==0)nonzero++;
    }
    assert.ok(nonzero>1000,"Score has no audible nonzero samples");
    outputs.push(createHash("sha256").update(bytes).digest("hex"));
  }
  assert.equal(outputs[0],outputs[1],"Same seed and timeline must produce byte-identical score");
  assert.notEqual(outputs[0],outputs[2],"Changing brand should change musical palette");
  process.stdout.write("Motion score tested: exact WAV length, real signal, brand differentiation, byte-level repeatability.\n");
}finally{await rm(temp,{recursive:true,force:true});}
