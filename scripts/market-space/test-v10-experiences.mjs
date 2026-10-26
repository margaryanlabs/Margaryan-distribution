#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';
const world=fs.readFileSync(new URL('../../market-space-world-v10/index.html',import.meta.url),'utf8');
let count=0;const check=(name,cb)=>{cb();count++;console.log('PASS '+name);};
class Params{
 constructor(url){this.params={};for(const p of String(url).replace(/^\?/,'').split('&')){const [k,v]=p.split('=');if(k)this.params[k]=v;}}
 get(k){return this.params[k]??null;}
 set(k,v){this.params[k]=v;}
}
class FakeURL{
 constructor(href){this.href=href;this.searchParams=new Params(href.split('?')[1]||'');}
 toString(){return this.href.split('?')[0]+'?'+Object.entries(this.searchParams.params).map(([k,v])=>k+'='+v).join('&');}
}
const a=world.indexOf('const EXPERIENCE_OPTIONS='),b=world.indexOf("let active='fashion',",a);
assert.ok(a>0&&b>a);
const DATA={food:{items:[[0,0,2690],[0,0,3490],[0,0,2190],[0,0,890]]},beauty:{items:[[0,0,34900]]},home:{items:[[0,0,339000]]}};
const location={href:'https://example.com/?world=food&exp_food_pick=coffee&exp_food_bundle=two&exp_beauty_scent=amber',search:'?world=food&exp_food_pick=coffee&exp_food_bundle=two&exp_beauty_scent=amber'};
let shareURL='';
const history={replaceState(_a,_b,v){shareURL=v.toString();}};
const manager=new Function('location','URLSearchParams','URL','history','DATA',
 "let active='food';"+world.slice(a,b)+
 "return {states:experienceState,views:experienceVisuals,select:s=>active=s,total:s=>experienceTotal(s),index:s=>selectedExperienceItem(s),qty:s=>selectedExperienceQty(s),apply:()=>applyExperienceVisuals(),link:()=>experienceURL(),options:EXPERIENCE_OPTIONS};"
)(location,Params,FakeURL,history,DATA);
function color(v){return {value:v,set(n){this.value=n;return this;}}}
function mat(v){return {color:color(v),roughness:.2,opacity:.84,clone(){return mat(this.color.value)}}}
function scale(x,y,z){return {x,y,z,clone(){return scale(this.x,this.y,this.z)},copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this},multiplyScalar(k){this.x*=k;this.y*=k;this.z*=k;return this}}}
check('Independent Market Beauty and Living shops',()=>{
 assert.deepEqual(Object.keys(manager.options).sort(),['beauty','food','home']);
 for(const v of Object.values(manager.options))assert.equal(v.groups.length,2);
});
check('Safe validated deep-link state',()=>{
 assert.equal(manager.states.food.pick,'coffee');
 assert.equal(manager.states.food.bundle,'two');
 assert.equal(manager.states.beauty.scent,'amber');
});
check('Market mix cart SKU and quantity totals',()=>{
 assert.equal(manager.index('food'),0);assert.equal(manager.qty('food'),2);
 assert.equal(manager.total('food'),5380);
 manager.states.food.pick='olive';manager.states.food.bundle='family';
 assert.equal(manager.total('food'),10470);
});
check('Market 3D fruit scale and colors restore cleanly',()=>{
 const fruit={userData:{},material:mat('#dca27a'),scale:scale(.17,.16,.18)};
 manager.views.fruit.push(fruit);manager.select('food');manager.apply();
 assert.ok(Math.abs(fruit.scale.x-.17*1.14)<1e-10);
 assert.equal(fruit.material.color.value,'#7d9160');
 manager.states.food.bundle='one';manager.apply();
 assert.equal(fruit.scale.x,.17);assert.equal(fruit.scale.y,.16);
});
check('Beauty changes real glass shade and roughness',()=>{
 const bottle={userData:{},material:mat('#aaaaaa')};
 manager.views.perfume.push(bottle);manager.select('beauty');
 manager.states.beauty.scent='citrus';manager.states.beauty.glass='frost';
 manager.apply();
 assert.equal(bottle.material.color.value,'#dbbb75');assert.equal(bottle.material.roughness,.6);
 assert.equal(bottle.material.opacity,.97);
 manager.states.beauty.glass='clear';manager.apply();assert.equal(bottle.material.roughness,.10);
});
check('Living reorients furniture and recolors upholstery',()=>{
 const mesh={isMesh:true,userData:{styleSurface:'upholstery'},material:mat('#cccccc')};
 const sofa={rotation:{y:0},traverse(cb){cb(mesh)}};
 manager.views.sofas.push(sofa);manager.select('home');
 manager.states.home.fabric='sage';manager.states.home.layout='conversation';manager.apply();
 assert.equal(sofa.rotation.y,.22);assert.equal(mesh.material.color.value,'#8d9d8c');
 manager.states.home.fabric='sand';manager.states.home.layout='gallery';manager.apply();
 assert.equal(sofa.rotation.y,0);assert.equal(mesh.material.color.value,'#c3aa91');
});
check('URLs share the selected live scene setup',()=>{
 manager.select('beauty');manager.link();
 assert.ok(shareURL.includes('world=beauty'));
 assert.ok(shareURL.includes('exp_beauty_scent=citrus'));
 assert.ok(shareURL.includes('exp_beauty_glass=clear'));
});
check('Dual touch sticks, deadzone, one-tap interaction and cancel handlers',()=>{
 for(const k of ['id="movePad"','id="lookPad"','id="interactionBtn"',
 'function stickVector(e,element)','magnitude<.16?0',
 "lookPad.addEventListener('pointerdown'","lookPad.addEventListener('pointercancel'",
 "pad.addEventListener('pointercancel'","function resetTouchSticks()",
 "if(lookPointer!==null)",'function nearestProduct('])assert.ok(world.includes(k),k);
});
console.log('V10.8 experiences + dual joysticks: '+count+' offline checks passed.');
