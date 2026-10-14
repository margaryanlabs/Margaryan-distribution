"use client";

import * as THREE from "three";

/** V9: a completely modelled product-shot environment, NOT an image slideshow. */
export const V9_DURATION=8;
export interface V9Film {
 canvas:HTMLCanvasElement;
 setTime(seconds:number):void;
 setScreen(file:File):Promise<void>;
 dispose():void;
}
const C={ink:0x040807,mint:0x9ff0ba,ivory:0xf4f2ea};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(a:number,b:number,t:number)=>{const p=clamp((t-a)/(b-a));return p*p*(3-2*p)};
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
const noise=(n:number)=>{const v=Math.sin(n*127.1+78.233)*43758.5453;return v-Math.floor(v)};

function studioEnvironment(renderer:THREE.WebGLRenderer){
 const canvas=document.createElement("canvas");canvas.width=1024;canvas.height=512;
 const ctx=canvas.getContext("2d");if(!ctx)throw Error("Studio lighting unavailable");
 const gradient=ctx.createLinearGradient(0,0,0,512);
 gradient.addColorStop(0,"#2e3936");gradient.addColorStop(.36,"#15201b");
 gradient.addColorStop(.7,"#060c09");gradient.addColorStop(1,"#030807");
 ctx.fillStyle=gradient;ctx.fillRect(0,0,1024,512);
 const box=(x:number,y:number,w:number,h:number,clr:string,blur:number)=>{
  ctx.save();ctx.fillStyle=clr;ctx.shadowColor=clr;ctx.shadowBlur=blur;
  ctx.fillRect(x,y,w,h);ctx.restore();
 };
 box(85,80,38,330,"#e5f6e9",47);
 box(268,130,15,240,"#bbf6c9",39);
 box(550,60,160,63,"#c5d3cb",69);
 box(818,107,40,300,"#f0f2ed",48);
 box(950,175,12,145,"#8af2b1",40);
 const tex=new THREE.CanvasTexture(canvas);tex.mapping=THREE.EquirectangularReflectionMapping;
 tex.colorSpace=THREE.SRGBColorSpace;
 const pmrem=new THREE.PMREMGenerator(renderer);
 const target=pmrem.fromEquirectangular(tex);pmrem.dispose();tex.dispose();return target;
}

function bevelPlate(w:number,h:number,r:number,depth:number){
 const s=new THREE.Shape(),x=-w/2,y=-h/2;
 s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);
 s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
 s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);
 s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
 const g=new THREE.ExtrudeGeometry(s,{steps:1,depth,bevelEnabled:true,
  bevelSize:.038,bevelThickness:.034,bevelSegments:4,curveSegments:7});
 g.translate(0,0,-depth/2);return g;
}

function basalt(seed:number, radius:number){
 const geometry=new THREE.IcosahedronGeometry(radius,2);
 const p=geometry.attributes.position as THREE.BufferAttribute;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  const fluctuation=.80+noise(i+seed*204)*.42;
  p.setXYZ(i,x*fluctuation,y*(.79+noise(i*3+seed)*.41),z*fluctuation);
 }
 geometry.computeVertexNormals();return geometry;
}
function makeFeature(label:string,detail:string) {
 const c=document.createElement("canvas");c.width=1024;c.height=230;
 const x=c.getContext("2d");if(!x)throw Error("Typography surface unavailable");
 x.clearRect(0,0,1024,230);
 x.fillStyle="#0d1a13";x.fillRect(0,0,1024,230);
 x.strokeStyle="#648f72";x.lineWidth=3;x.strokeRect(3,3,1018,224);
 x.fillStyle="#a5f1bd";x.fillRect(3,3,6,224);
 x.font="700 43px Arial, sans-serif";x.fillStyle="#eaf6ea";x.fillText(label,55,91);
 x.font="28px Arial, sans-serif";x.fillStyle="#b7cabc";x.fillText(detail,55,154);
 x.font="27px Arial";x.fillStyle="#a8efbd";x.fillText("↗",948,92);
 const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
 return texture;
}
function honestScreen(){
 const c=document.createElement("canvas");c.width=1600;c.height=900;
 const x=c.getContext("2d");if(!x)throw Error("Concept compositor unavailable");
 x.fillStyle="#08140e";x.fillRect(0,0,1600,900);
 x.fillStyle="#a1fac2";x.font="700 36px Arial";x.fillText("PROMPTENCE",105,160);
 x.fillStyle="#eff8f1";x.font="bold 87px Arial";x.fillText("Understand",105,370);x.fillText("the answer.",105,465);
 x.font="25px Arial";x.fillStyle="#9bc1a4";x.fillText("AI visibility · Sources · Diagnosis · Action",105,590);
 x.font="24px Arial";x.fillText("CONCEPT VISUAL — NOT A PRODUCT SCREENSHOT",105,807);
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex;
}

export function createV9Film(width:number,height:number):V9Film {
 const canvas=document.createElement("canvas");
 canvas.setAttribute("aria-label","PROMPTENCE three dimensional cinematic V9 laptop studio");
 const renderer=new THREE.WebGLRenderer({canvas,alpha:false,antialias:true,
  preserveDrawingBuffer:true,powerPreference:"high-performance"});
 renderer.setPixelRatio(1);renderer.setSize(width,height,false);
 renderer.setClearColor(C.ink,1);renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
 const scene=new THREE.Scene();scene.background=new THREE.Color(C.ink);
 scene.fog=new THREE.FogExp2(C.ink,.018);
 const env=studioEnvironment(renderer);scene.environment=env.texture;
 const camera=new THREE.PerspectiveCamera(42,width/height,.1,110);
 const key=new THREE.DirectionalLight(0xf4f8f1,4.4);key.position.set(-4.7,9,10);scene.add(key);
 const rim=new THREE.PointLight(0xcaffdd,38,22,2);rim.position.set(4,4.3,4);scene.add(rim);
 const warm=new THREE.PointLight(0xf1d5b8,19,20,2);warm.position.set(-3,3,-6);scene.add(warm);
 const fill=new THREE.PointLight(0x91c4ab,13,20,2);fill.position.set(-7,1.2,6);scene.add(fill);
 scene.add(new THREE.HemisphereLight(0xd2ead8,0x070e0a,.69));

 const blackStone=new THREE.MeshPhysicalMaterial({
  color:0x111a16,metalness:.32,roughness:.48,clearcoat:.31,envMapIntensity:.85
 });
 // Hero plinth is actual low-profile basalt, not a black PNG cutout.
 const podiumGeometry=new THREE.CylinderGeometry(4.85,5.05,.44,84,1);
 const verts=podiumGeometry.attributes.position as THREE.BufferAttribute;
 for(let i=0;i<verts.count;i++){
  const x=verts.getX(i),y=verts.getY(i),z=verts.getZ(i),theta=Math.atan2(z,x);
  const jag=(.12*Math.sin(theta*17)+.09*Math.sin(theta*37)+.04*Math.sin(theta*73));
  const r=Math.sqrt(x*x+z*z)||1;
  verts.setXYZ(i,x*(r+jag)/r,y+(.035*Math.sin(theta*31)),z*(r+jag)/r);
 }
 podiumGeometry.computeVertexNormals();
 const podium=new THREE.Mesh(podiumGeometry,blackStone);podium.position.y=-.31;scene.add(podium);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(150,150),
  new THREE.MeshPhysicalMaterial({color:0x050907,metalness:.16,roughness:.29,
   clearcoat:.36,envMapIntensity:.25}));
 floor.rotation.x=-Math.PI/2;floor.position.y=-.56;scene.add(floor);

 // Deliberately irregular rock silhouette, in model-space behind the product.
 const rocks:THREE.Mesh[]=[];
 const rocky=new THREE.MeshPhysicalMaterial({
  color:0x1a201d,metalness:.17,roughness:.81,envMapIntensity:.5
 });
 for(let i=0;i<23;i++){
  const angle=i*2.39996323;
  const distance=6.4+noise(i+910)*6.1;
  const x=Math.cos(angle)*distance,z=Math.sin(angle)*distance-2.5;
  const r=.95+noise(i+120)*2.1;
  const rock=new THREE.Mesh(basalt(i+11,r),rocky);
  rock.scale.set(.68+noise(i+28)*.6,1+noise(i+38)*2.15,.65+noise(i+44)*.5);
  rock.position.set(x,-.65+rock.scale.y*r*.33,z);
  rock.rotation.set(noise(i)*.21,i*1.72,noise(i+19)*.16);
  scene.add(rock);rocks.push(rock);
 }
 // Ivory rim of light is a physically placed 3D torus behind the silhouette.
 const arc=new THREE.Group();scene.add(arc);
 const arcCurve=new THREE.EllipseCurve(0,0,4.0,3.55,.03,Math.PI*1.90,false,0);
 const arcPts=arcCurve.getPoints(130).map(p=>new THREE.Vector3(p.x,p.y,0));
 const arcPath=new THREE.CatmullRomCurve3(arcPts,false);
 const arcLine=new THREE.Mesh(new THREE.TubeGeometry(arcPath,150,.023,9,false),
  new THREE.MeshBasicMaterial({color:0xf1e4d7}));
 arc.add(arcLine);arc.position.set(1.15,3.5,-7.8);
 const arcLight=new THREE.PointLight(0xf8dfb9,20,17,2);
 arcLight.position.set(2,6,-6);scene.add(arcLight);

 // Laptop: real 3D base, keyboard, touchpad, hinge, lid, bezel and photo-textured screen.
 const laptop=new THREE.Group();scene.add(laptop);
 const alloy=new THREE.MeshPhysicalMaterial({color:0x75817c,metalness:.92,
  roughness:.23,clearcoat:.8,clearcoatRoughness:.18,envMapIntensity:1.25});
 const darkAlloy=new THREE.MeshPhysicalMaterial({color:0x1c2722,metalness:.81,
  roughness:.23,clearcoat:.72,envMapIntensity:1.5});
 const keyboardMat=new THREE.MeshPhysicalMaterial({color:0x101613,metalness:.31,
  roughness:.41,envMapIntensity:.35});
 const base=new THREE.Mesh(new THREE.BoxGeometry(6.55,.16,3.48),alloy);
 base.position.set(0,.055,.46);laptop.add(base);
 const keyboardWell=new THREE.Mesh(new THREE.BoxGeometry(5.95,.009,1.96),darkAlloy);
 keyboardWell.position.set(0,.143,.03);laptop.add(keyboardWell);
 const keyGeometry=new THREE.BoxGeometry(.305,.014,.255);
 for(let row=0;row<5;row++)for(let col=0;col<15;col++){
  if(row===4 && col>=5 && col<=9)continue;
  const k=new THREE.Mesh(keyGeometry,keyboardMat);
  k.position.set((col-7)*.385,.165,-.63+row*.385);
  laptop.add(k);
 }
 const space=new THREE.Mesh(new THREE.BoxGeometry(1.85,.015,.22),keyboardMat);
 space.position.set(0,.164,.91);laptop.add(space);
 const trackMat=new THREE.MeshPhysicalMaterial({color:0x53615b,metalness:.67,
  roughness:.35,clearcoat:.39});
 const track=new THREE.Mesh(new THREE.BoxGeometry(1.93,.007,.86),trackMat);
 track.position.set(0,.147,1.67);laptop.add(track);
 const hinge=new THREE.Mesh(new THREE.CylinderGeometry(.11,.11,6.1,24),
  darkAlloy);
 hinge.rotation.z=Math.PI/2;hinge.position.set(0,.14,-1.18);laptop.add(hinge);

 const display=new THREE.Group();display.position.set(0,.14,-1.22);
 display.rotation.x=-.13;laptop.add(display);
 const lid=new THREE.Mesh(bevelPlate(6.43,3.78,.14,.16),darkAlloy);
 lid.position.y=1.90;display.add(lid);
 const metalEdge=new THREE.Mesh(new THREE.BoxGeometry(6.45,.016,.20),alloy);
 metalEdge.position.set(0,.02,.03);display.add(metalEdge);
 const darkGlass=new THREE.Mesh(new THREE.PlaneGeometry(6.16,3.48),
  new THREE.MeshPhysicalMaterial({color:0x08110d,metalness:.25,roughness:.095,
   clearcoat:1,clearcoatRoughness:.055}));
 darkGlass.position.set(0,1.90,.109);display.add(darkGlass);
 const concept=honestScreen();
 const monitorMat=new THREE.MeshBasicMaterial({map:concept,toneMapped:false});
 const monitor=new THREE.Mesh(new THREE.PlaneGeometry(6.06,3.415),monitorMat);
 monitor.position.set(0,1.90,.119);display.add(monitor);
 const lensDot=new THREE.Mesh(new THREE.CircleGeometry(.024,16),
  new THREE.MeshBasicMaterial({color:0x334b3d}));
 lensDot.position.set(0,3.76,.122);display.add(lensDot);

 // Functional only: correctly labelled generic capabilities, no fake analytics.
 const capabilityData=[
  ["AI VISIBILITY","See how your brand appears"],
  ["SOURCES","Trace sources influencing AI"],
  ["DIAGNOSIS","Understand what to improve"],
  ["ACTION","Turn findings into next steps"],
  ["REMEASURE","Track changes over time"]
 ];
 const panels:{group:THREE.Group;body:THREE.Mesh;material:THREE.MeshBasicMaterial;
  x:number;y:number;z:number;delay:number}[]=[];
 const featureTextures:THREE.Texture[]=[];
 capabilityData.forEach(([title,detail],i)=>{
  const group=new THREE.Group();scene.add(group);
  const bodyMaterial=new THREE.MeshPhysicalMaterial({
   color:0x102018,metalness:.17,roughness:.16,transmission:.13,
   transparent:true,opacity:.70,clearcoat:1,clearcoatRoughness:.06,
   depthWrite:false,side:THREE.DoubleSide
  });
  const body=new THREE.Mesh(bevelPlate(2.55,.66,.08,.026),bodyMaterial);
  group.add(body);
  const tex=makeFeature(title,detail);featureTextures.push(tex);
  const mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity:1,
   depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
  const img=new THREE.Mesh(new THREE.PlaneGeometry(2.51,.57),mat);
  img.position.z=.039;group.add(img);
  const leftSide=i<3;
  const index=leftSide?i:i-3;
  const x=leftSide?-5.13:5.07;
  const y=leftSide?3.25-index*.92:2.71-index*1.02;
  group.position.set(x,y,1.4);
  group.rotation.y=leftSide?-.13:.12;
  panels.push({group,body,material:mat,x,y,z:1.4,delay:i*.2});
 });

 let realScreen:THREE.Texture|undefined,disposed=false;
 function setTime(t0:number){
  if(disposed)throw Error("V9 film disposed");
  if(!Number.isFinite(t0))throw Error("Time must be finite");
  const t=Math.max(0,Math.min(V9_DURATION,t0));
  const reveal=ease(0,1.6,t);
  const cameraMove=ease(.4,7.9,t);
  // 8s cinema camera: medium-wide reveal → orbit → restrained screen push-in.
  camera.position.set(lerp(7.2,4.35,cameraMove),lerp(4.4,3.7,cameraMove),
   lerp(16.8,12.7,cameraMove));
  camera.lookAt(new THREE.Vector3(lerp(.3,0,cameraMove),1.72,lerp(-.3,0,cameraMove)));
  camera.fov=lerp(41.5,40,cameraMove);camera.updateProjectionMatrix();
  laptop.rotation.y=lerp(-.17,.13,ease(0,7.9,t));
  laptop.position.y=-.06+.055*Math.sin(t*.5);
  rim.intensity=lerp(8,35,reveal);
  warm.intensity=lerp(2,19,ease(.2,2.4,t));
  arcLight.intensity=lerp(1,22,reveal);
  key.intensity=lerp(.65,4.6,reveal);
  arcLine.material.opacity=.85*reveal;
  for(const p of panels){
   const appear=ease(1.55+p.delay,3.15+p.delay,t);
   p.group.visible=appear>.002;
   p.group.position.set(p.x+(p.x<0?-.25:.25)*(1-appear),
    p.y-.18*(1-appear)+Math.sin(t*.36+p.delay)*.023,
    p.z+1.5*(1-appear));
   p.group.scale.setScalar(lerp(.89,1,appear));
   p.material.opacity=.94*appear;
   (p.body.material as THREE.MeshPhysicalMaterial).opacity=.63*appear;
  }
  renderer.render(scene,camera);
 }
 async function setScreen(file:File){
  if(disposed)throw Error("Film disposed");
  if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>12_000_000||file.size<1000)
   throw Error("Use an authentic PNG/JPEG/WebP screen capture smaller than 12MB");
  const url=URL.createObjectURL(file);
  try {
   const image=new Image();image.src=url;await image.decode();
   if(image.naturalWidth<720||image.naturalHeight<400)throw Error("Real capture too small");
   const out=document.createElement("canvas");out.width=1600;out.height=900;
   const c=out.getContext("2d");if(!c)throw Error("Texture compositor unavailable");
   c.fillStyle="#08110d";c.fillRect(0,0,1600,900);
   const fit=Math.min(1600/image.naturalWidth,900/image.naturalHeight);
   const rw=image.naturalWidth*fit,rh=image.naturalHeight*fit;
   c.drawImage(image,(1600-rw)/2,(900-rh)/2,rw,rh);
   const tex=new THREE.CanvasTexture(out);tex.colorSpace=THREE.SRGBColorSpace;
   const old=realScreen;realScreen=tex;monitorMat.map=tex;monitorMat.needsUpdate=true;
   old?.dispose();
  } finally{URL.revokeObjectURL(url)}
 }
 setTime(0);
 return {canvas,setTime,setScreen,dispose(){
  if(disposed)return;disposed=true;
  scene.traverse(node=>{
   if(node instanceof THREE.Mesh){
    node.geometry.dispose();
    const materials=Array.isArray(node.material)?node.material:[node.material];
    materials.forEach(m=>m.dispose());
   }
  });
  env.dispose();concept.dispose();realScreen?.dispose();
  for(const t of featureTextures)t.dispose();
  renderer.dispose();
 }};
}
