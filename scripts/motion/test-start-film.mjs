#!/usr/bin/env node
/** Film launch product acceptance, independent of the browser and API tokens. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {stripTypeScriptTypes} from "node:module";
const src=readFileSync(new URL("../../lib/motion/start-film.ts",import.meta.url),"utf8");
let js=stripTypeScriptTypes(src,{mode:"strip"});
js=js.replace(/^import[\s\S]*?from\s*"[^"]+";?\s*$/gm,"");
js=js.replace(/^export\s+/gm,"");
const brandInfo={
 promptence:{name:"Promptence"},veto:{name:"VETO"},labs:{name:"Margaryan Labs"}
};
const frames=(brand,format)=>({version:1,title:"Original branded film",brand,format,
 scenes:[
  {id:"scene-1",kind:"opener",headline:"WHO WE ARE",seconds:4},
  {id:"scene-2",kind:"statement",headline:"WHAT CHANGES",seconds:5},
  {id:"scene-3",kind:"statement",headline:"THE PRODUCT",seconds:6},
  {id:"scene-4",kind:"closer",headline:"ACT NOW",seconds:4}
 ]});
let generated=null;
const f=new Function("BRAND_INFO","makeMotionPreset","sanitizeMotionProject",
 "createKeylessStoryboard","autoPolishMotionProject",js+
 "\nreturn {STUDIO_FILM_CHOICES,checkStudioFilmChoice,prepareStudioFilm,studioFilmInstruction};");
const api=f(brandInfo,frames,x=>x,
 obj=>{generated=obj;return frames(obj.brand,obj.format);},
 obj=>({project:{...obj,qualityMode:"signature"}}));
assert.equal(api.STUDIO_FILM_CHOICES.length,5);
assert.deepEqual(new Set(api.STUDIO_FILM_CHOICES.map(x=>x.kind)),
 new Set(["reel","campaign","product","feature","proof"]));
for(const card of api.STUDIO_FILM_CHOICES){
 assert.ok(card.title&&card.desc&&card.length&&card.step&&card.source);
 assert.ok(api.studioFilmInstruction(card.kind).length>20);
}
const choice={kind:"campaign",brand:"veto",format:"portrait",language:"ru",
 brief:"Мы покажем продукт через сильную и понятную историю."};
const campaign=api.prepareStudioFilm(choice);
assert.equal(campaign.format,"portrait");
assert.equal(campaign.brand,"veto");
assert.equal(campaign.filmChrome,"clean");
assert.equal(generated.prompt,choice.brief);
assert.equal(generated.style,"cinematic");
assert.equal(campaign.scenes.length,4);
const product=api.prepareStudioFilm({...choice,kind:"product",
 brand:"promptence",format:"landscape"});
assert.equal(product.scenes[2].kind,"screen");
assert.equal(product.scenes[2].mediaId,undefined,
 "No imaginary real screenshot can be embedded in a product demo");
assert.match(product.scenes[2].support,/одобренные|Добавьте запись/);
assert.equal(product.format,"landscape");
assert.equal(product.filmChrome,"clean");
const feature=api.prepareStudioFilm({...choice,kind:"feature",brand:"labs",format:"square",language:"en"});
assert.equal(feature.brand,"labs");assert.equal(feature.language,"en");
assert.equal(feature.format,"square");assert.equal(feature.scenes.length,4);
for(const kind of ["reel","proof"])assert.throws(()=>
 api.prepareStudioFilm({...choice,kind}),/отдельный редактор/);
assert.throws(()=>api.checkStudioFilmChoice({...choice,format:"10:2"}),/формат/);
assert.throws(()=>api.checkStudioFilmChoice({...choice,brand:"fake"}),/бренд/);
assert.throws(()=>api.checkStudioFilmChoice({...choice,language:"xx"}),/язык/);
assert.equal(api.checkStudioFilmChoice({...choice,brief:"a\n\rb"}).brief,"a b");
const page=readFileSync(new URL("../../app/motion/page.tsx",import.meta.url),"utf8");
const quick=readFileSync(new URL("../../app/motion/quick-studio.tsx",import.meta.url),"utf8");
const ui=readFileSync(new URL("../../app/motion/start-film.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../../app/motion/start-film.module.css",import.meta.url),"utf8");
assert.match(page,/const \[launcherOpen,setLauncherOpen\]=useState\(false\)/);
assert.match(page,/if\(launcherOpen\)return <MotionStart/);
assert.match(page,/!window\.confirm\(/);
assert.match(page,/prepareStudioFilm\(selected\)/);
assert.match(page,/kind==="reel"/);
assert.match(page,/QuickStudio start=\{quickStart\}/);
assert.match(page,/setFeatureOpen\(true\)/);
assert.match(page,/motion-first-film-v1/);
assert.match(quick,/start\?createQuickProject\(start\.brand,start\.language,start\.format\)/);
assert.match(quick,/firstMissing/);
assert.match(quick,/quickGuide/);
assert.match(ui,/STUDIO_FILM_CHOICES\.map/);
assert.match(ui,/role="group" aria-label="Выбор типа видеоролика"/);
assert.match(ui,/aria-pressed=\{kind===item.kind\}/);
assert.match(ui,/hasSavedDraft&&/);
assert.match(ui,/onResume/);
assert.match(ui,/onStart\(\{kind,brand:/);
assert.match(css,/\.selectionLayout/);
assert.match(css,/@media\(max-width:650px\)/);
assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
console.log("Motion Start PASS: five real production modes, correct templates/sources, editor handoff, safe draft confirmation, editable RU-first UX and mobile layout.");
