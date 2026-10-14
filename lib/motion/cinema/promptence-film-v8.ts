"use client";

import * as THREE from "three";

export const V8_SECONDS = 5;
const INK = 0x050c08;
const clamp = (n:number) => Math.min(1,Math.max(0,n));
const ease = (a:number,b:number,t:number) => {const x=clamp((t-a)/(b-a));return x*x*(3-2*x)};
const mix = (a:number,b:number,x:number)=>a+(b-a)*x;

export interface V8Shot {
 canvas:HTMLCanvasElement;
 setTime(seconds:number):void;
 setScreen(file:File):Promise<void>;
 dispose():void;
}

function studioEnv(renderer:THREE.WebGLRenderer){
 const c=document.createElement("canvas");c.width=1024;c.height=512;
 const ctx=c.getContext("2d");
 if(!ctx)throw Error("No environment compositor");
 const sky=ctx.createLinearGradient(0,0,0,512);
 sky.addColorStop(0,"#1d2e27");sky.addColorStop(.45,"#0b1511");sky.addColorStop(1,"#020704");
 ctx.fillStyle=sky;ctx.fillRect(0,0,1024,512);
 const bar=(x:number,y:number,w:number,h:number,col:string,blur:number)=>{
   ctx.save();ctx.fillStyle=col;ctx.shadowBlur=blur;ctx.shadowColor=col;ctx.fillRect(x,y,w,h);ctx.restore();
 };
 bar(54,78,21,345,"#edf6f0",48);
 bar(218,93,9,295,"#a0d7b2",32);
 bar(540,64,150,69,"#bcd6c6",64);
 bar(812,127,28,241,"#e4f8e9",49);
 bar(927,156,8,196,"#66e9a3",30);
 const tex=new THREE.CanvasTexture(c);
 tex.mapping=THREE.EquirectangularReflectionMapping;
 tex.colorSpace=THREE.SRGBColorSpace;
 const pm=new THREE.PMREMGenerator(renderer), rt=pm.fromEquirectangular(tex);
 tex.dispose();pm.dispose();return rt;
}

function plate(w:number,h:number,r:number,depth:number){
 const shape=new THREE.Shape(),x=-w/2,y=-h/2;
 shape.moveTo(x+r,y);shape.lineTo(x+w-r,y);
 shape.quadraticCurveTo(x+w,y,x+w,y+r);shape.lineTo(x+w,y+h-r);
 shape.quadraticCurveTo(x+w,y+h,x+w-r,y+h);shape.lineTo(x+r,y+h);
 shape.quadraticCurveTo(x,y+h,x,y+h-r);shape.lineTo(x,y+r);
 shape.quadraticCurveTo(x,y,x+r,y);
 const geo=new THREE.ExtrudeGeometry(shape,{steps:1,depth,bevelEnabled:true,
  bevelSegments:5,bevelThickness:.04,bevelSize:.05,curveSegments:8});
 geo.translate(0,0,-depth/2);
 return geo;
}

function honestPlaceholder(){
 const c=document.createElement("canvas");c.width=1600;c.height=900;
 const g=c.getContext("2d");if(!g)throw Error("Texture context unavailable");
 g.fillStyle="#07120c";g.fillRect(0,0,1600,900);
 g.fillStyle="#a2f5c6";g.font="bold 34px Arial";g.fillText("PROMPTENCE",100,150);
 g.fillStyle="#edf6ef";g.font="bold 91px Arial";g.fillText("See who AI",100,330);
 g.fillText("recommends.",100,430);
 g.fillStyle="#789a86";g.font="24px Arial";
 g.fillText("CONCEPT TREATMENT · NOT A PRODUCT SCREENSHOT",100,805);
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex;
}

/**
 * A single art-directed 5-second shot. All geometry is physical world-space 3D:
 * machined frame, actual product screen, UV-accurate evidence panels and key lights.
 * No rings, spheres, invented AI responses, fake score or illustrative data.
 */
export function createV8Shot(w:number,h:number):V8Shot {
 const canvas=document.createElement("canvas");
 canvas.setAttribute("aria-label","Promptence V8 real-product macro shot");
 const renderer=new THREE.WebGLRenderer({canvas,alpha:false,antialias:true,
  preserveDrawingBuffer:true,powerPreference:"high-performance"});
 renderer.setPixelRatio(1);renderer.setSize(w,h,false);
 renderer.setClearColor(INK,1);renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.03;
 const scene=new THREE.Scene();scene.background=new THREE.Color(INK);
 const env=studioEnv(renderer);scene.environment=env.texture;
 const camera=new THREE.PerspectiveCamera(33,w/h,.08,80);
 const key=new THREE.DirectionalLight(0xffffff,4.1);key.position.set(-4,5,9);scene.add(key);
 const rim=new THREE.PointLight(0xa8f2c2,22,14,2);rim.position.set(5,1.7,3.8);scene.add(rim);
 const left=new THREE.PointLight(0x89a7a0,10,13,2);left.position.set(-4.3,-1.1,2);scene.add(left);
 scene.add(new THREE.HemisphereLight(0xc5e1d0,0x060d08,.6));

 const product=new THREE.Group();scene.add(product);
 const metal=new THREE.MeshPhysicalMaterial({color:0x36463d,metalness:.94,
  roughness:.19,clearcoat:1,clearcoatRoughness:.10,envMapIntensity:1.75});
 const frame=new THREE.Mesh(plate(7.52,4.33,.14,.18),metal);product.add(frame);
 const glassMat=new THREE.MeshPhysicalMaterial({color:0x040907,metalness:.3,
  roughness:.075,clearcoat:1,clearcoatRoughness:.045,envMapIntensity:1.25});
 const glass=new THREE.Mesh(new THREE.PlaneGeometry(7.22,4.06),glassMat);
 glass.position.z=.142;product.add(glass);
 const placeholder=honestPlaceholder();
 const sourceMat=new THREE.MeshBasicMaterial({map:placeholder,toneMapped:false,
  transparent:true,opacity:1,side:THREE.DoubleSide});
 const screen=new THREE.Mesh(new THREE.PlaneGeometry(7.17,4.03),sourceMat);
 screen.position.z=.149;product.add(screen);
 const satin=new THREE.MeshPhysicalMaterial({color:0xa6c5b1,metalness:.92,
  roughness:.13,clearcoat:1,envMapIntensity:1.5});
 const edge=new THREE.Mesh(new THREE.BoxGeometry(7.48,.013,.18),satin);
 edge.position.set(0,-2.163,.017);product.add(edge);
 const opticBar=new THREE.Mesh(new THREE.BoxGeometry(6.5,.008,.20),
  new THREE.MeshBasicMaterial({color:0xa2ffc7}));
 opticBar.position.set(0,-2.176,.018);product.add(opticBar);

 // We never generate fake AI recommendations. The lifted panels repeat
 // genuine pixels from the owner-approved / public website capture.
 const ribbonGroup=new THREE.Group();scene.add(ribbonGroup);
 const strips:{mesh:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>;
  backing:THREE.Mesh<THREE.BoxGeometry,THREE.MeshPhysicalMaterial>;
  x:number;y:number;rank:number}[]=[];
 const cols=5,rows=1;
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
   const geom=new THREE.PlaneGeometry(7.17/cols,4.03/rows);
   const u=geom.getAttribute("uv") as THREE.BufferAttribute;
   for(let i=0;i<u.count;i++)u.setXY(i,(x+u.getX(i))/cols,(y+u.getY(i))/rows);
   const mat=new THREE.MeshBasicMaterial({map:placeholder,toneMapped:false,
    transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});
   const mesh=new THREE.Mesh(geom,mat);
   // A milled graphite frame supplies a real thickness to each photographed shard.
   const backing=new THREE.Mesh(new THREE.BoxGeometry(7.17/cols+.008,4.03/rows+.01,.035),
     new THREE.MeshPhysicalMaterial({color:0x839d8c,metalness:.91,roughness:.20,
       clearcoat:.87,clearcoatRoughness:.12,transparent:true,opacity:0}));
   ribbonGroup.add(backing);ribbonGroup.add(mesh);
   strips.push({mesh,backing,x:-3.585+(x+.5)*7.17/cols,
     y:-2.015+(y+.5)*4.03/rows,rank:y*cols+x});
 }
 // Silhouette accents track the device depth, but have no fake "data".
 const glint=new THREE.PointLight(0xb2ffcf,0,12,2);glint.position.set(-3.2,1.95,.9);
 scene.add(glint);

 let real:THREE.Texture|undefined;
 let dead=false;
 function setTime(time:number){
   if(dead)throw Error("V8 director already disposed");
   if(!Number.isFinite(time))throw Error("Invalid shot time");
   const t=Math.min(5,Math.max(0,time));
   // One continuous macro-to-reveal move, followed by the physical UI lift.
   const pull=ease(0,2.7,t);
   const plunge=ease(2.7,5,t);
   camera.position.set(
    mix(2.05,-1.45,pull)+1.0*plunge,
    mix(.68,.24,pull)+.30*plunge,
    mix(4.35,9.45,pull)-.9*plunge);
   camera.lookAt(new THREE.Vector3(mix(1.55,.65,pull)+.38*plunge,
    mix(.35,.04,pull),mix(.03,.1,pull)+.65*plunge));
   product.position.set(mix(.30,1.37,pull),-.06,mix(0,-.5,plunge));
   product.rotation.set(
    mix(-.085,-.01,pull),
    mix(-.47,-.26,pull)+.08*plunge,
    mix(-.06,.01,pull));
   // Screen fades into its own photographically truthful UV regions.
   const split=ease(2.85,4.5,t);
   screen.visible=t<4.98;
   screen.material.opacity=1-.94*split;
   product.scale.setScalar(1);
   product.updateMatrixWorld(true);
   ribbonGroup.visible=t>=2.84;
   for(const item of strips){
     const reveal=ease(2.84+item.rank*.08,3.8+item.rank*.04,t);
     const lift=ease(3.2+item.rank*.075,4.9,t);
     const v=new THREE.Vector3(item.x,item.y,.175).applyMatrix4(product.matrixWorld);
     const nx=item.rank-2;
     const target=new THREE.Vector3(
       product.position.x+item.x+nx*.018,
       product.position.y+item.y+.018*Math.cos(nx*1.2),
       product.position.z+.28+(nx+2)*.13);
     item.mesh.position.copy(v).lerp(target,lift);
     item.mesh.rotation.set(
       product.rotation.x,
       product.rotation.y+nx*.025*lift,
       product.rotation.z+nx*.013*lift);
     item.mesh.scale.setScalar(product.scale.x);
     item.mesh.material.opacity=.97*reveal;
     item.backing.position.copy(item.mesh.position);
     item.backing.position.z-=.038;
     item.backing.rotation.copy(item.mesh.rotation);
     item.backing.scale.copy(item.mesh.scale);
     item.backing.material.opacity=.32*reveal;
   }
   rim.intensity=mix(20,36,ease(1,4.4,t));
   rim.position.x=mix(5,-3.3,ease(2.8,4.85,t));
   key.intensity=mix(4.1,5.5,ease(0,3,t));
   glint.intensity=12*ease(.2,1.1,t)*(1-ease(4.1,5,t));
   renderer.render(scene,camera);
 }
 async function setScreen(file:File){
   if(dead)throw Error("V8 director disposed");
   if(!["image/png","image/jpeg","image/webp"].includes(file.type)
     ||file.size<1000||file.size>12_000_000)
    throw Error("Use an authentic PNG/JPEG/WebP below 12MB");
   const url=URL.createObjectURL(file);
   try {
     const img=new Image();img.src=url;await img.decode();
     if(img.naturalWidth<720||img.naturalHeight<400)
       throw Error("Actual product screenshot too small");
     const out=document.createElement("canvas");out.width=1600;out.height=900;
     const ctx=out.getContext("2d");if(!ctx)throw Error("Cannot map real screenshot");
     ctx.fillStyle="#040a06";ctx.fillRect(0,0,1600,900);
     const size=Math.min(1600/img.naturalWidth,900/img.naturalHeight);
     const tw=img.naturalWidth*size,th=img.naturalHeight*size;
     ctx.drawImage(img,(1600-tw)/2,(900-th)/2,tw,th);
     const next=new THREE.CanvasTexture(out);next.colorSpace=THREE.SRGBColorSpace;
     const old=real;real=next;sourceMat.map=next;sourceMat.needsUpdate=true;
     for(const p of strips){p.mesh.material.map=next;p.mesh.material.needsUpdate=true}
     old?.dispose();
   } finally {URL.revokeObjectURL(url)}
 }
 setTime(0);
 return {canvas,setTime,setScreen,dispose(){
   if(dead)return;dead=true;
   scene.traverse(node=>{
     if(node instanceof THREE.Mesh){
       node.geometry.dispose();
       const materials=Array.isArray(node.material)?node.material:[node.material];
       materials.forEach(m=>m.dispose());
     }
   });
   env.dispose();real?.dispose();placeholder.dispose();renderer.dispose();
 }};
}
