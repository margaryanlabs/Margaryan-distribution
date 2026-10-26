#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../../market-space-world-v10/index.html',import.meta.url),'utf8');
let n=0;const check=(title,cb)=>{cb();n++;console.log('PASS '+title)};
const chunk=(a,b)=>{const start=html.indexOf(a),end=html.indexOf(b,start);assert.ok(start>=0&&end>start,a);return html.slice(start,end)};
check('Three mesh quality tiers include 880 HD versus 128 Eco vertices',()=>{
 class Geo{attributes={};indices=[];setAttribute(n,v){this.attributes[n]=v}setIndex(i){this.indices=i}computeVertexNormals(){}}
 class Attr{constructor(a,n){this.array=a;this.itemSize=n}}
 const THREE={BufferGeometry:Geo,Float32BufferAttribute:Attr};
 for(const [touch,quality,vertices,faces]of [[false,'auto',880,1680],[true,'eco',128,224],[true,'high',880,1680]]){
  const fn=new Function('THREE','coarse','qualityMode','mesh',chunk('function garmentShell(','function clothBody(')+'return garmentShell;')(THREE,touch,quality,g=>g);
  const geom=fn([[.58,.29,.16],[.43,.40,.23],[.18,.36,.23],[-.19,.28,.20],[-.49,.37,.27],[-.86,.51,.36],[-1.26,.65,.45],[-1.44,.69,.47]],{},1);
  assert.equal(geom.attributes.position.array.length/3,vertices);
  assert.equal(geom.indices.length/3,faces);
  assert.ok(geom.attributes.position.array.every(Number.isFinite));
 }
});
check('Canvas stone pixels and filtering have real HD / Eco variants',()=>{
 class Texture{constructor(canvas){this.canvas=canvas;this.repeat={set:(x,y)=>this.repeatValues=[x,y]}}}
 const THREE={CanvasTexture:Texture,RepeatWrapping:1,SRGBColorSpace:'sRGB'};
 const document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},beginPath(){},lineTo(){},moveTo(){},stroke(){}})})};
 for(const [mode,side,aniso] of [['eco',512,4],['high',1024,8]]){
  const fn=new Function('THREE','coarse','qualityMode','document',chunk('function stoneTexture(','function areaLight(')+'return stoneTexture;')(THREE,true,mode,document);
  const t=fn();assert.equal(t.canvas.width,side);assert.equal(t.anisotropy,aniso);
 }
});
check('Physical transmission toggles with HD without breaking Eco glass',()=>{
 class Physical{constructor(v){Object.assign(this,v);this.isMeshPhysicalMaterial=true}}
 const THREE={Color:class{},MeshPhysicalMaterial:Physical};
 const code="let qualityMode='eco',coarse=true;"+chunk('const perfumeGlassCache=','function perfumeBottle(')+
  "return {create:c=>perfumeGlass(c),set:v=>qualityMode=v,sync:()=>syncPhysicalGlass()};";
 const fx=new Function('THREE','reusableMaterials','experienceVisuals',code)(THREE,new WeakSet(),{perfume:[]});
 const bottle=fx.create('#d1a1ad');assert.equal(bottle.transmission,0);
 fx.set('high');fx.sync();assert.equal(bottle.transmission,.67);assert.equal(bottle.opacity,1);
 fx.set('eco');fx.sync();assert.equal(bottle.transmission,0);
});
check('Four architecturally different shop types and mobile density budgets',()=>{
 const code=chunk('function architecturalIdentity(','function architecture(');
 const THREE={MeshBasicMaterial:class{},TorusGeometry:class{}};
 const run=(store,touch,mode)=>{
  let parts=0;
  const f=new Function('THREE','mat','wood','mesh','add','soft','tube','framedSign','coarse','qualityMode',code+'return architecturalIdentity;')(
   THREE,()=>({}),{},()=>({rotation:{}}),()=>parts++,()=>parts++,()=>parts++,()=>parts++,touch,mode);
  f(store);return parts;
 };
 for(const k of ['fashion','beauty','home','food'])assert.ok(run(k,false,'auto')>=10,k);
 assert.ok(run('beauty',true,'high')>run('beauty',true,'eco'));
 assert.ok(run('home',true,'high')>run('home',true,'eco'));
});
check('Material and showroom quality switch contracts stay physically grounded',()=>{
 for(const k of ['sheen:.66','sheenRoughness:.78','new THREE.ExtrudeGeometry(sh,',
  'function timberTexture()','function scentLabel(kind)','transmission:high?.67:0',
  'const originalView=camera.position.clone(),oldYaw=yaw,oldPitch=pitch,oldStore=active;',
  'setStore(oldStore);',"renderer.toneMapping=THREE.ACESFilmicToneMapping"]){
  assert.ok(html.includes(k),k);
 }
});
console.log('V11 true 3D quality contract: '+n+' passed. Real device/browser visual QA still required.');
