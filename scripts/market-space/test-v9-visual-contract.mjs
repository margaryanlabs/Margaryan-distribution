#!/usr/bin/env node
/**
 * MARKET SPACE V9 static visual/reliability contract.
 * This does NOT replace browser/device QA or certify photorealism.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>fs.readFileSync(new URL('../../'+p,import.meta.url),'utf8');
const world=read('market-space-world-v9/index.html');
const site=read('market-space-showcase-v9/index.html');
const scripts=s=>[...s.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const checks=[];
function test(label,fn){fn();checks.push(label)}
test('Both pages are UTF-8 HTML',()=>{
 assert.ok(world.startsWith('<!doctype html>'));
 assert.ok(site.startsWith('<!doctype html>'));
});
test('World contains two parsable scripts',()=>{
 const blocks=scripts(world);assert.equal(blocks.length,2);
 blocks.forEach((block,i)=>new vm.Script(block,{filename:'world-script-'+i+'.js'}));
});
test('Showcase contains a parsable script',()=>{
 const blocks=scripts(site);assert.equal(blocks.length,1);
 new vm.Script(blocks[0],{filename:'showcase.js'});
});
test('Five worlds, live WebGL renderer and Lite fallback stay present',()=>{
 for(const scene of ['mall','food','fashion','beauty','home'])assert.ok(world.includes(scene+':{'),scene);
 for(const term of ["getContext('webgl'","function drawLiteWorld()","function architecturalFinish()","architecturalFinish();if(gl)","function arcLight(","function torus(","function switchScene(","id=\"basket\""])
  assert.ok(world.includes(term),'Missing '+term);
});
test('Showcase uses V9 world and no old V8 link',()=>{
 assert.ok(site.includes('../market-space-world-v9/?world='));
 assert.ok(!site.includes('market-space-world-v8-1'));
 assert.ok(site.includes('mode=lite'));
});
test('Copy/download brief and honest disclosures remain visible',()=>{
 for(const term of ['briefForm','saveBrief','Данные не отправляются автоматически','референсы атмосферы'])
  assert.ok(site.includes(term),'Missing '+term);
});
test('No duplicate HTML IDs on showcase',()=>{
 const ids=[...site.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(ids.length,new Set(ids).size);
});
test('No loss of reduced-motion settings',()=>{
 assert.ok(site.includes('prefers-reduced-motion:reduce'));
 assert.ok(world.includes('prefers-reduced-motion:reduce'));
});
console.log('MARKET SPACE V9 static checks: '+checks.length+' passed');
for(const item of checks)console.log('✓ '+item);
console.log('Manual browser QA and real mobile GPU testing are still required.');
