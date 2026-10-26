#!/usr/bin/env node
/**
 * Offline source/geometry contract for MARKET SPACE V10.1.
 * Does not imply real browser GPU performance, visual QA or production readiness.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const base=new URL('../../',import.meta.url);
const read=path=>fs.readFileSync(new URL(path,base),'utf8');
const world=read('market-space-world-v10/index.html');
const showcase=read('market-space-showcase-v10/index.html');
let count=0;
function check(label,fn){fn();count++;console.log('PASS '+label);}
const scripts=source=>[...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const moduleScript=scripts(world).find(s=>s.includes("import * as THREE"));
check('Real 3D world and source scripts parse',()=>{
 assert.ok(world.startsWith('<!doctype html>'));assert.ok(moduleScript);
 new vm.Script(moduleScript.replace(/^import .*?;$/gm,''),{filename:'market-space-world-v10.js'});
 for(const script of scripts(world).filter(s=>!s.startsWith('{')&&!s.includes("import * as THREE")))new vm.Script(script);
 for(const script of scripts(showcase))new vm.Script(script);
});
check('Pinned Three module and world categories',()=>{
 assert.ok(world.includes('three@0.186.0/build/three.module.js'));
 for(const key of ['fashion','food','beauty','home'])assert.ok(world.includes(' '+key+':{'));
});
check('Sculpted clothing, furniture, beauty and grocery meshes',()=>{
 for(const k of ['garmentShell','computeVertexNormals','weaveBump','mannequin','garmentsRail','upholsteredSofa','beautyIsland','perfumeBottle','groceryShelves','brandBox','produceIsland','RoundedBoxGeometry','TorusGeometry'])assert.ok(world.includes(k),k);
});
check('Store navigation and product interactions',()=>{
 for(const k of ['function setStore(','function move(','registerBlocker','intersectObjects(pickables,true)','openItem(','addToCart(','openCart','startTour','stopTour'])assert.ok(world.includes(k),k);
});
check('Resource management and adaptive mobile rendering',()=>{
 for(const k of ['function disposeWorld(){','materials.add(m)','geo.dispose()','m.dispose()','renderer.renderLists.dispose()','renderPixelRatio','fps<27'])assert.ok(world.includes(k),k);
});
check('No duplicate element IDs',()=>{
 for(const src of [world,showcase]){const ids=[...src.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);}
});
check('Preview routes and honest checkout limits',()=>{
 assert.ok(showcase.includes('market-space-world-v10/'));
 assert.ok(showcase.includes('lite?"../market-space-world-v9/'));
 assert.ok(world.includes('Реальные платежи не подключены'));
 assert.ok(world.includes('../market-space-world-v9/'));
});
check('Collision geometry resolves displays while keeping aisles usable',()=>{
 const start=world.indexOf('function blocked(x,z){'),end=world.indexOf('function move(dx,dz)',start);
 assert.ok(start>=0&&end>start);
 const fn=new Function('blockers','clamp',world.slice(start,end)+'return blocked;');
 const blocked=fn([{x:-2.55,z:-4,w:1.7,d:1.7},{x:0,z:-15,w:2.75,d:1.95}],(v,lo,hi)=>Math.min(hi,Math.max(lo,v)));
 assert.equal(blocked(-2.55,-4),true);
 assert.equal(blocked(0,-15),true);
 assert.equal(blocked(0,-8),false);
 assert.equal(blocked(9.8,-8),true);
 assert.equal(blocked(0,20),true);
});
check('Directed camera tour remains within room bounds',()=>{
 const start=world.indexOf('const directorRoutes='),end=world.indexOf('function startTour()',start);
 assert.ok(start>=0&&end>start);
 const routes=new Function(world.slice(start,end)+'return directorRoutes;')();
 for(const [key,points] of Object.entries(routes)){
  assert.ok(['fashion','food','beauty','home'].includes(key));
  assert.ok(points.length>=4);
  for(const p of points){for(const k of ['x','z','yaw','pitch'])assert.ok(Number.isFinite(p[k]));assert.ok(Math.abs(p.x)<9.5&&p.z<=12.25&&p.z>=-30.6);}
 }
});
check('Garment mesh rings generate bounded finite triangle geometry',()=>{
 const a=world.indexOf('function garmentShell('),b=world.indexOf('function clothBody(',a);
 assert.ok(a>=0&&b>a);
 class Geometry {attributes={};indices=[];setAttribute(k,v){this.attributes[k]=v;}setIndex(i){this.indices=i;}computeVertexNormals(){}}
 class FloatAttr {constructor(values,itemSize){this.array=values;this.itemSize=itemSize;}}
 const THREE={BufferGeometry:Geometry,Float32BufferAttribute:FloatAttr};
 const f=new Function('THREE','coarse','mesh',world.slice(a,b)+'return garmentShell;')(THREE,false,g=>g);
 const geo=f([[.58,.29,.16],[.43,.4,.23],[.18,.36,.23],[-.19,.28,.20],[-.49,.37,.27],[-.86,.51,.36],[-1.26,.65,.45],[-1.44,.69,.47]],{},1);
 assert.equal(geo.attributes.position.array.length/3,160);
 assert.equal(geo.indices.length/3,280);
 assert.ok(geo.attributes.position.array.every(Number.isFinite));
});
check('Premium world interaction layer exposes nearby 3D products and labels',()=>{
 for(const str of ['function groceryLabel(','goodsLabelMaterials','groceryLabel(index)','function updateProductTip()','tipProductAction','objectTip.show'])assert.ok(world.includes(str),str);
 assert.ok(world.includes('href="../market-space-showcase-v10/"'));
});
check('Graphics settings are user-controlled and have mobile safeguards',()=>{
 for(const str of ['qualityCycle','qualityMode','applyQuality()','qualityLabels','qualityBtn','fps<27'])assert.ok(world.includes(str),str);
});
check('Cinema tours steer around central Market/Beauty objects',()=>{
 const a=world.indexOf('const directorRoutes='),b=world.indexOf('function startTour()',a);
 const routes=new Function(world.slice(a,b)+'return directorRoutes;')();
 for(const key of ['food','beauty']){
  const points=routes[key];assert.ok(points.length>=5);
  for(let j=0;j<points.length-1;j++){
   const a=points[j],b=points[j+1];
   for(let i=0;i<=15;i++){
    const t=i/15,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
    assert.ok(Math.abs(x)>2.5,'Tour too near central displays: '+key+' at '+x+','+z);
   }
  }
 }
});
check('Fashion accessories and sewn upholstery remain present',()=>{
 for(const k of ['function boutiqueHandbag(', 'const handle=mesh(new THREE.TorusGeometry', "const cushion=textile(", 'Fine hand-sewn front cushion piping'])assert.ok(world.includes(k),k);
});
check('WebGL error screen has labelled four-scene concept gallery and Lite action',()=>{
 for(const str of ['id="galleryFallback"','data-fallback="fashion"','data-fallback="food"','data-fallback="beauty"','data-fallback="home"','Визуальная галерея / Концепция','не кадры реального 3D-движка','__marketSpaceShowFallback','mode=lite','webglcontextlost'])assert.ok(world.includes(str),str);
});
check('Hundreds of grocery package parts use instancing rather than separate meshes',()=>{
 for(const token of ['new THREE.InstancedMesh(','marketPackBatches','flushMarketPacks()','instanceMatrix.needsUpdate','productIndices','hit.instanceId!==undefined','n.isInstancedMesh)n.dispose()'])assert.ok(world.includes(token),token);
});
check('Grocery instancing generates stable batch transforms and selects individual items',()=>{
 const a=world.indexOf('let marketPackBatches=new Map();'),b=world.indexOf('function groceryShelves(x,z){',a);
 assert.ok(a>0&&b>a);
 const emitted=[],pickables=[];
 class Obj{
  constructor(){this.position={set(x,y,z){this.x=x;this.y=y;this.z=z}};this.rotation={set(x,y,z){this.x=x;this.y=y;this.z=z}};this.scale={set(x,y,z){this.x=x;this.y=y;this.z=z}};this.matrix={};}
  updateMatrix(){this.matrix={p:[this.position.x,this.position.y,this.position.z],s:[this.scale.x,this.scale.y,this.scale.z]};}
 }
 class Im{
  constructor(geometry,material,count){this.count=count;this.geometry=geometry;this.material=material;this.userData={};this.instanceMatrix={};this.matrices=[];}
  setMatrixAt(i,matrix){this.matrices[i]=matrix;}computeBoundingSphere(){}
 }
 const mock={InstancedMesh:Im,Object3D:Obj,CylinderGeometry:class{}};
 const d=new Function('THREE','RoundedBoxGeometry','mat','root','pickables','plane','groceryLabel',
  world.slice(a,b)+'return {brandBox,flushMarketPacks,batches:()=>marketPackBatches};')(
   mock,class{},color=>color,{add:m=>emitted.push(m)},pickables,()=>({castShadow:false,receiveShadow:false}),()=>({})
 );
 const shelf={position:{x:7.7,y:0,z:2}};let boxes=0;
 for(const y of [.57,1.24,1.91,2.58,3.24])for(const side of [-1,1])for(let i=0;i<5;i++){
  d.brandBox(shelf,side*.49,y,(i-2)*1.04,i+Math.round(y*5)+(side>0?3:0));boxes++;
 }
 d.flushMarketPacks();
 assert.equal(boxes,50);
 assert.ok(emitted.length<=15,'Too many draw calls: '+emitted.length);
 assert.equal(emitted.reduce((n,b)=>n+b.count,0),100);
 assert.ok(emitted.every(b=>b.userData.productIndices.length===b.count));
 assert.ok(emitted.every(b=>b.matrices.every(m=>[...m.p,...m.s].every(Number.isFinite))));
 assert.equal(d.batches().size,0);
});
check('Physically lit materials and soft contact shadows preserve a light mobile fallback',()=>{
 for(const token of ['RoomEnvironment','new THREE.PMREMGenerator(','scene.environment=','function contactShadow(','createRadialGradient(','function perfumeGlass(','clearcoat:.95'])assert.ok(world.includes(token),token);
 assert.ok(world.includes('if(!window.__marketSpaceReady)window.__marketSpaceShowFallback'));
});
check('V10.4 import and source licensing references',()=>{
 assert.ok(world.includes("import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'"));
 for(const token of ['id="assetCredits"','CC0','CC BY 4.0','© 2021 Shopify','Wayfair','KhronosGroup/glTF-Sample-Assets','https://creativecommons.org/licenses/by/4.0/'])assert.ok(world.includes(token),token);
});
check('Premium asset manager is optional, asynchronous and safe across scene switches',()=>{
 for(const token of ['const PREMIUM_ASSETS=','fetchPremiumAsset(name)','gltfLoader.loadAsync(info.src)','source.clone(true)','const generation=showroomGeneration','generation!==showroomGeneration','if(!premiumAllowed())return',"new URLSearchParams(location.search).get('assets')",'assetGeometry.add(obj.geometry)','if(n.geometry&&n.geometry!==boxGeo&&n.geometry!==sphereGeo&&!assetGeometry.has(n.geometry))','slot.placeholder.visible=false']) assert.ok(world.includes(token),token);
});
check('Procedural displays remain when GLB absent and quality gate holds on mobile',()=>{
 for(const token of ["shoeExhibit(-4.6,-7.2)","shoeExhibit(4.6,-19.3)","slotPremiumModel('chair'","slotPremiumModel('shoe'","qualityMode==='high'","qualityMode==='high')upgradePremiumAssets(active)","const firstChair=chair(-2.55,-7),secondChair=chair(2.5,-22)"])assert.ok(world.includes(token),token);
});
check('HD query enables detailed mobile models',()=>{
 for(const token of ["const requestedQuality=new URLSearchParams(location.search).get('quality')","requestedQuality==='high'?'high'","applyQuality();setStore(","qualityMode==='high')upgradePremiumAssets(active)"])assert.ok(world.includes(token),token);
});
console.log('V10.4 offline source checks: '+count+' passed; remote GLB rendering and physical GPU QA still required.');
