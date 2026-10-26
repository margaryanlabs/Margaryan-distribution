import fs from 'node:fs';
import assert from 'node:assert/strict';
const world=fs.readFileSync(new URL('../../market-space-world-v10/index.html',import.meta.url),'utf8');
const showcase=fs.readFileSync(new URL('../../market-space-showcase-v10/index.html',import.meta.url),'utf8');

let count=0;
const check=(label,cb)=>{cb();count++;};
check('controls and 3D scene markers',()=>{
 for(const q of ['id="lookbookBtn"','id="lookbookPanel"','id="lookbookShare"',
  'data-look-garment="coat"','data-look-garment="dress"','data-look-garment="edition"',
  'function createLookbookStage()','const g=clothBody(def.base,def.kind)',
  'function applyLookbookState()', 'function updateLookbookURL()',
  'createLookbookStage();','lookbookStage.pivot.rotation.y+=delta*.42']){
  assert.ok(world.includes(q),q);
 }
 assert.ok(showcase.includes('Собрать 3D-образ'));
 assert.ok(showcase.includes('lookbook=1'));
});
check('selected garments and demo totals',()=>{
 const start=world.indexOf('const LOOKBOOK_GARMENTS=');
 const end=world.indexOf('function fashionScene(){',start);
 assert.ok(start>0&&end>start);
 class Params{
  constructor(input){this.values=Object.fromEntries(input.replace(/^\?/,'').split('&').filter(Boolean).map(s=>s.split('=')))}
  get(key){return this.values[key]??null}
 }
 const element={textContent:''};
 const items=[['Coat','',34900],['Dress','',28900],['Jacket','',27500],['Edition','',46900],['Sneakers','',19500]];
 const make=world.slice(start,end)+"return {state:()=>lookbookState,change:v=>{lookbookState={...lookbookState,...v}},mount:v=>lookbookStage=v,render:()=>applyLookbookState(),garments:LOOKBOOK_GARMENTS};";
 const model=new Function('location','URLSearchParams','document','$','DATA','money','THREE',make)(
  {search:'?look=dress&lookTone=rose&lookShoes=none&lookBag=no'},
  Params,{querySelectorAll:()=>[]},()=>element,{fashion:{items}},n=>n+' AMD',{});
 const variants={};
 for(const key of Object.keys(model.garments)){
  const cloth={isMesh:true,userData:{lookbookFabric:true},material:{color:{value:'',set(v){this.value=v}}}};
  variants[key]={visible:false,cloth,traverse(cb){cb(cloth)}};
 }
 const stage={garments:variants,shoes:{sneaker:{visible:false},dark:{visible:false}},bag:{visible:false}};
 model.mount(stage);model.render();
 assert.equal(variants.dress.visible,true);
 assert.equal(variants.coat.visible,false);
 assert.equal(stage.bag.visible,false);
 assert.equal(stage.shoes.sneaker.visible,false);
 assert.equal(element.textContent,'28900 AMD');
 assert.equal(variants.dress.cloth.material.color.value,'#b88992');
 model.change({garment:'edition',color:'night',shoes:'dark',bag:'yes'});
 model.render();
 assert.equal(variants.edition.visible,true);
 assert.equal(variants.dress.visible,false);
 assert.equal(stage.shoes.dark.visible,true);
 assert.equal(stage.bag.visible,true);
 assert.equal(element.textContent,'66400 AMD');
 assert.equal(variants.edition.cloth.material.color.value,'#393e47');
});
check('URL sharing and demo checkout guardrails',()=>{
 for(const q of ["url.searchParams.set('look',lookbookState.garment)",
  "url.searchParams.set('lookTone',lookbookState.color)",
  "url.searchParams.set('lookShoes',lookbookState.shoes)",
  "url.searchParams.set('lookBag',lookbookState.bag)",
  "url.searchParams.set('lookbook','1')",
  "lookbookState.shoes!=='none')addToCart('fashion',4)",
  "Виртуальная примерка на стандартном манекене",
  "new URLSearchParams(location.search).get('lookbook')==='1')openLookbook()"]){
  assert.ok(world.includes(q),q);
 }
});
console.log('LOOKBOOK offline behavioral checks: '+count+' passed. Real device and GPU QA remain pending.');
