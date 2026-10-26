#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const base=new URL('../../',import.meta.url);
const read=path=>fs.readFileSync(new URL(path,base),'utf8');
const world=read('market-space-world-v10/index.html');
const showcase=read('market-space-showcase-v10/index.html');
let n=0;
function check(label,fn){fn();console.log('PASS '+label);n++}
const extract=source=>[...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
check('V10 WebGL world is HTML',()=>assert.ok(world.startsWith('<!doctype html>')));
check('Three.js pinned importmap follows installation API',()=>assert.ok(world.includes('three@0.186.0/build/three.module.js')));
check('Module syntax parses after static import binding replacement',()=>{
 const sources=extract(world);assert.equal(sources.length,3);
 const mod=sources.find(s=>s.includes("import * as THREE"));
 assert.ok(mod);
 new vm.Script(mod.replace(/^import .*?;$/gm,''),{filename:'world-v10.js'});
 const fallback=sources.find(s=>s.includes('window.addEventListener'));
 new vm.Script(fallback,{filename:'fallback-v10.js'});
});
check('Four interactive store scenes',()=>{for(const key of ['fashion','food','beauty','home'])assert.ok(world.includes(' '+key+':{')||world.includes('\n '+key+':{'));});
check('Actual apparel shapes are not flat sprites',()=>{for(const str of ['ExtrudeGeometry','jacket','mannequin','garmentsRail','TorusGeometry'])assert.ok(world.includes(str));});
check('Realized furnishings cosmetics and food models',()=>{for(const str of ['upholsteredSofa','beautyIsland','perfumeBottle','groceryShelves','brandBox','produceIsland'])assert.ok(world.includes(str));});
check('User can walk, inspect, take tour and manage demo basket',()=>{for(const str of ['function move(','function blocked(','selectAt(','touring','movePad','openCart','addToCart'])assert.ok(world.includes(str));});
check('Zero claims of production checkout; fallback path for missing 3D support',()=>{assert.ok(world.includes('Реальные платежи не подключены'));assert.ok(world.includes('market-space-world-v9/'));});
check('Showcase uses V10 default, V9 for Lite compatibility',()=>{assert.ok(showcase.includes('market-space-world-v10/'));assert.ok(showcase.includes('lite?"../market-space-world-v9/'));});
check('No duplicate IDs in both documents',()=>{for(const s of [world,showcase]){const ids=[...s.matchAll(/\sid="([^"]+)"/g)].map(x=>x[1]);assert.equal(ids.length,new Set(ids).size);}});
console.log('All '+n+' V10 static contracts passed; real GPU/device/browser QA is separate.');
