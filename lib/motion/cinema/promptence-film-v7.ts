"use client";

import * as THREE from "three";

/**
 * V7: 5-act architectural light / macro-optics / product cinema instead of stacked label/cards.
 * 3 acts / 10 seconds: factual product reveal, physical data field, signal-to-brand.
 * Absolute-time deterministic evaluation is required for Playwright/FFmpeg frame export.
 */
export const CINEMA_SECONDS = 20;
export const CINEMA_FPS = 30;
export interface PromptenceFilm {
  canvas: HTMLCanvasElement;
  setTime(seconds: number): void;
  setScreen(file: File): Promise<void>;
  resize(width: number, height: number): void;
  dispose(): void;
}
const C = {bg:0x050c09,mint:0x71e8aa,warm:0xf4f2e9,steel:0x697c71};
const sat=(n:number)=>Math.min(1,Math.max(0,n));
const smooth=(a:number,b:number,n:number)=>{const t=sat((n-a)/(b-a));return t*t*(3-2*t)};
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
const random=(n:number)=>{const x=Math.sin(n*127.1+38.27)*43758.5453;return x-Math.floor(x);};

function makeEnvironment(renderer:THREE.WebGLRenderer){
  const canvas=document.createElement("canvas");
  canvas.width=1024;canvas.height=512;
  const c=canvas.getContext("2d");
  if(!c)throw Error("Studio environmental light unavailable");
  const bg=c.createLinearGradient(0,0,0,512);
  bg.addColorStop(0,"#42574a");bg.addColorStop(.2,"#17271c");
  bg.addColorStop(.5,"#080f0b");bg.addColorStop(1,"#020806");
  c.fillStyle=bg;c.fillRect(0,0,1024,512);
  const lamp=(x:number,y:number,w:number,h:number,color:string,blur:number)=>{
    c.save();c.shadowColor=color;c.shadowBlur=blur;c.fillStyle=color;c.fillRect(x,y,w,h);c.restore();
  };
  lamp(70,95,44,280,"#e2eee3",42);
  lamp(263,70,18,340,"#92f1b2",34);
  lamp(505,95,170,80,"#b8cdbf",63);
  lamp(773,118,22,260,"#f1fcf3",54);
  lamp(925,156,9,165,"#75eeb6",34);
  const env=new THREE.CanvasTexture(canvas);
  env.mapping=THREE.EquirectangularReflectionMapping;
  env.colorSpace=THREE.SRGBColorSpace;
  const pmrem=new THREE.PMREMGenerator(renderer);
  const target=pmrem.fromEquirectangular(env);
  pmrem.dispose();env.dispose();
  return target;
}

function gradientSpriteTexture(){
  const canvas=document.createElement("canvas");canvas.width=64;canvas.height=64;
  const ctx=canvas.getContext("2d");
  if(!ctx)throw Error("Light sprite unavailable");
  const g=ctx.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,"#ffffff");g.addColorStop(.12,"#c8ffe3");
  g.addColorStop(.28,"#6de2a9dd");g.addColorStop(.65,"#51aa7844");g.addColorStop(1,"#46a66a00");
  ctx.fillStyle=g;ctx.fillRect(0,0,64,64);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
  return tex;
}

function brandedConcept(){
  const canvas=document.createElement("canvas");canvas.width=1600;canvas.height=900;
  const c=canvas.getContext("2d");
  if(!c)throw Error("Concept texture unavailable");
  const g=c.createLinearGradient(0,0,1600,900);
  g.addColorStop(0,"#0d2419");g.addColorStop(1,"#07120d");
  c.fillStyle=g;c.fillRect(0,0,1600,900);
  c.strokeStyle="#4d755b";c.strokeRect(80,80,1440,740);
  c.fillStyle="#8ff3b7";c.font="700 32px Arial";
  c.fillText("PROMPTENCE  /  AI RECOMMENDATION INTELLIGENCE",110,148);
  c.font="700 88px Arial";c.fillStyle="#f0faef";
  c.fillText("From answers",110,320);
  c.fillStyle="#8ff3b7";c.fillText("to evidence.",110,413);
  const labels=["DISCOVER","MEASURE","DIAGNOSE","ACT","REMEASURE"];
  c.strokeStyle="#7ae4ad";c.lineWidth=3;
  c.beginPath();c.moveTo(122,580);c.lineTo(1478,580);c.stroke();
  labels.forEach((l,i)=>{
    const x=125+335*i;
    c.fillStyle=i===2?"#b4f9cb":"#41755a";c.beginPath();
    c.arc(x,580,i===2?19:12,0,2*Math.PI);c.fill();
    c.font="700 23px Arial";c.fillStyle="#bfdccc";c.fillText(l,x-5,643);
  });
  c.fillStyle="#96caaa";c.font="24px Arial";
  c.fillText("CONCEPT VISUAL  ·  NOT LIVE RESULTS OR A PRODUCT SCREENSHOT",110,788);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
  return tex;
}

function roundedPlate(w:number,h:number,r:number,depth:number){
  const s=new THREE.Shape();
  const x=-w/2,y=-h/2;
  s.moveTo(x+r,y);
  s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);
  s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);
  s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
  const shape=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,steps:1,
    bevelSegments:3,bevelSize:.045,bevelThickness:.04,curveSegments:8});
  shape.translate(0,0,-depth/2);
  return shape;
}

export function createPromptenceFilm(width:number,height:number):PromptenceFilm{
  const canvas=document.createElement("canvas");
  canvas.setAttribute("aria-label","Promptence real 3D cinematic composition");
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,
    preserveDrawingBuffer:true,powerPreference:"high-performance"});
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.setPixelRatio(1);
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.05;
  renderer.setClearColor(C.bg,1);
  const world=new THREE.Scene();
  world.background=new THREE.Color(C.bg);
  world.fog=new THREE.FogExp2(C.bg,.029);
  const studio=makeEnvironment(renderer);
  world.environment=studio.texture;
  const camera=new THREE.PerspectiveCamera(35,width/height,.08,75);
  const ambient=new THREE.HemisphereLight(0xdaf5e2,0x050d08,.72);
  world.add(ambient);
  const key=new THREE.DirectionalLight(0xf7faf4,4.5);
  key.position.set(-3.8,5.2,8.1);world.add(key);
  const edge=new THREE.PointLight(C.mint,25,18,2);
  edge.position.set(4,1.3,4);world.add(edge);
  const backlight=new THREE.PointLight(0xb2d1c5,11,16,2);
  backlight.position.set(-5,-1.1,-1.5);world.add(backlight);

  const device=new THREE.Group();
  world.add(device);
  const aluminium=new THREE.MeshPhysicalMaterial({
    color:0x3a4941,metalness:.91,roughness:.20,clearcoat:.78,
    clearcoatRoughness:.11,envMapIntensity:1.45
  });
  const chassis=new THREE.Mesh(roundedPlate(6.44,3.86,.16,.14),aluminium);
  device.add(chassis);
  const black=new THREE.MeshPhysicalMaterial({
    color:0x030908,metalness:.36,roughness:.09,clearcoat:1,clearcoatRoughness:.03,
    envMapIntensity:1.2
  });
  const glass=new THREE.Mesh(new THREE.PlaneGeometry(6.12,3.48),black);
  glass.position.z=.134;device.add(glass);
  const concept=brandedConcept();
  const screenMat=new THREE.MeshBasicMaterial({
    color:0xffffff,map:concept,depthWrite:true,toneMapped:false
  });
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(6.04,3.40),screenMat);
  screen.position.z=.142;device.add(screen);

  const gloss=new THREE.Mesh(new THREE.PlaneGeometry(6.08,3.43),
    new THREE.MeshPhysicalMaterial({
      color:0xc8ffe7,metalness:.02,roughness:.04,transparent:true,opacity:.07,
      clearcoat:1,clearcoatRoughness:.01,depthWrite:false
    }));
  gloss.position.z=.145;device.add(gloss);
  const machined=new THREE.MeshPhysicalMaterial({
    color:0xa0c0a8,metalness:.92,roughness:.16,envMapIntensity:1.5
  });
  const bottom=new THREE.Mesh(new THREE.BoxGeometry(6.47,.014,.23),machined);
  bottom.position.y=-1.935;device.add(bottom);
  const accent=new THREE.Mesh(new THREE.BoxGeometry(5.64,.012,.22),
    new THREE.MeshBasicMaterial({color:C.mint}));
  accent.position.set(0,-1.944,.05);device.add(accent);


  // V6 disintegration: the actual approved product texture breaks into genuine 3D
  // mesh fragments, then curls into a coherent curved evidence surface.
  // Each fragment samples its exact UV region from the real source screenshot.
  const fragmentGroup = new THREE.Group();
  world.add(fragmentGroup);
  const fragments:{mesh:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>;
    x:number;y:number;theta:number;delay:number}[]=[];
  const COLS=16, ROWS=4;
  for(let row=0;row<ROWS;row++)for(let col=0;col<COLS;col++){
    const geometry=new THREE.PlaneGeometry(6.04/COLS,3.40/ROWS);
    const uv=geometry.getAttribute("uv") as THREE.BufferAttribute;
    for(let k=0;k<uv.count;k++){
      uv.setXY(k,(col+uv.getX(k))/COLS,(row+uv.getY(k))/ROWS);
    }
    const material=new THREE.MeshBasicMaterial({
      map:concept,color:0x579578,transparent:true,opacity:0,depthWrite:false,
      side:THREE.DoubleSide,toneMapped:false
    });
    const mesh=new THREE.Mesh(geometry,material);
    fragmentGroup.add(mesh);
    fragments.push({mesh,
      x:-3.02+(col+.5)*6.04/COLS,
      y:-1.70+(row+.5)*3.40/ROWS,
      theta:((col+.5)/COLS-.5)*Math.PI*1.35,
      delay:random(row*COLS+col+99)*.48
    });
  }

  // Seamless black studio, no artificial ground horizon crossing the UI or sculpture.

  // Evidence field: one cohesive three-dimensional sculpture, not six cards.
  const intelligence=new THREE.Group();
  world.add(intelligence);
  const rings:THREE.Mesh[]=[];
  const ringMaterials:THREE.MeshPhysicalMaterial[]=[];
  for(let i=0;i<4;i++){
    const mat=new THREE.MeshPhysicalMaterial({
      color:i===1?0x78efa9:0x769a8b,metalness:.77,roughness:.21,
      transparent:true,opacity:0,depthWrite:false,emissive:i===1?0x173c28:0x081810,
      emissiveIntensity:.33
    });
    const ring=new THREE.Mesh(new THREE.TorusGeometry(1.55+i*.38,.012+i*.002,9,128),mat);
    ring.rotation.set(.37+i*.39,.2+i*.55,i*.3);
    intelligence.add(ring);rings.push(ring);ringMaterials.push(mat);
  }
  const halo=new THREE.Mesh(new THREE.IcosahedronGeometry(.26,2),
    new THREE.MeshPhysicalMaterial({color:0xb7ffdb,metalness:.48,roughness:.13,
      emissive:C.mint,emissiveIntensity:.5,clearcoat:1,clearcoatRoughness:.13}));
  intelligence.add(halo);

  const fineFilaments:THREE.Mesh[]=[];
  const filamentMats:THREE.MeshBasicMaterial[]=[];
  const N_FILAMENT=24;
  for(let i=0;i<N_FILAMENT;i++){
    const a=i*Math.PI*2/N_FILAMENT;
    const b=a+.75;
    const p1=new THREE.Vector3(Math.cos(a)*2.2,Math.sin(a)*1.3,-.7);
    const p2=new THREE.Vector3(Math.cos(b)*1.65,Math.sin(b)*1.8,.45);
    const path=new THREE.CatmullRomCurve3([
      p1,new THREE.Vector3(p1.x*.6,p1.y*1.1,-.3),
      new THREE.Vector3(p2.x*.9,p2.y*.9,.5),p2]);
    const mat=new THREE.MeshBasicMaterial({
      color:i%4===0?0x92ffc2:0x5d8f77,transparent:true,opacity:0,depthWrite:false
    });
    const mesh=new THREE.Mesh(new THREE.TubeGeometry(path,28,.006,5,false),mat);
    intelligence.add(mesh);fineFilaments.push(mesh);filamentMats.push(mat);
  }

  const particleCount=920;
  const coords=new Float32Array(particleCount*3);
  const colorArray=new Float32Array(particleCount*3);
  const starts:THREE.Vector3[]=[];
  const orbits:THREE.Vector3[]=[];
  const endings:THREE.Vector3[]=[];
  for(let i=0;i<particleCount;i++){
    const u=random(i*4+2);
    const v=random(i*4+3);
    const depth=random(i*4+4);
    starts.push(new THREE.Vector3((u-.5)*5.8,(v-.5)*3.2,.12+depth*.4));
    const theta=i*2.39996323;
    const phi=Math.acos(1-2*(i+.5)/particleCount);
    const radius=1.8+.55*(random(i+123)-.5);
    orbits.push(new THREE.Vector3(
      radius*Math.sin(phi)*Math.cos(theta),
      radius*Math.sin(phi)*Math.sin(theta),
      radius*Math.cos(phi)));
    const angle=theta*1.12;
    endings.push(new THREE.Vector3(
      Math.cos(angle)*(.27+.15*random(i+20)),
      Math.sin(angle)*(.27+.16*random(i+40)),
      (random(i+70)-.5)*.55));
    const color=new THREE.Color().setHSL(.40+(random(i+9)-.5)*.075,.38+random(i+5)*.26,
      .57+random(i+11)*.32);
    colorArray[i*3]=color.r;colorArray[i*3+1]=color.g;colorArray[i*3+2]=color.b;
  }
  const dots=new THREE.BufferGeometry();
  dots.setAttribute("position",new THREE.BufferAttribute(coords,3));
  dots.setAttribute("color",new THREE.BufferAttribute(colorArray,3));
  const glowTexture=gradientSpriteTexture();
  const dustMat=new THREE.PointsMaterial({
    map:glowTexture,size:.13,sizeAttenuation:true,vertexColors:true,transparent:true,
    opacity:0,depthWrite:false,blending:THREE.AdditiveBlending
  });
  const dust=new THREE.Points(dots,dustMat);
  intelligence.add(dust);

  const activeLights:THREE.Sprite[]=[];
  const lightMat=new THREE.SpriteMaterial({
    map:glowTexture,color:0x7bffc0,transparent:true,opacity:0,
    blending:THREE.AdditiveBlending,depthWrite:false
  });
  for(let i=0;i<12;i++){
    const sprite=new THREE.Sprite(lightMat.clone());
    const a=i*Math.PI*2/12;
    sprite.position.set(Math.cos(a)*1.85,Math.sin(a)*1.53,.4+Math.sin(a*2)*.3);
    sprite.scale.setScalar(i%3===0?.54:.32);
    intelligence.add(sprite);activeLights.push(sprite);
  }
  const spotlight=new THREE.Sprite(new THREE.SpriteMaterial({
    map:glowTexture,color:0x76f2a6,transparent:true,opacity:0,
    blending:THREE.AdditiveBlending,depthWrite:false
  }));
  spotlight.scale.set(3.7,3.7,1);intelligence.add(spotlight);


  // Lens theatre: a new, physically modelled macro-object with its own 3D materials.
  // It is an abstract illustration of evidence and insight, never a simulated AI result.
  const lensStage = new THREE.Group();
  world.add(lensStage);
  const crystal = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.18, 4),
    new THREE.MeshPhysicalMaterial({
      color:0x83ffbf,metalness:.12,roughness:.085,transmission:.46,
      thickness:1.7,ior:1.42,clearcoat:1,clearcoatRoughness:.10,
      envMapIntensity:1.5
    })
  );
  lensStage.add(crystal);
  const innerFacet = new THREE.Mesh(
    new THREE.IcosahedronGeometry(.38,2),
    new THREE.MeshPhysicalMaterial({
      color:0xd5ffe9,metalness:.58,roughness:.17,clearcoat:1,
      emissive:0x126439,emissiveIntensity:.42
    })
  );
  lensStage.add(innerFacet);
  const opticBands:THREE.Mesh[]=[];
  const opticMats:THREE.MeshPhysicalMaterial[]=[];
  for(let i=0;i<4;i++){
    const mat=new THREE.MeshPhysicalMaterial({
      color:i%2?0xa6d7b8:0x86f3b2,metalness:.87,
      roughness:.15,clearcoat:1,clearcoatRoughness:.09,
      transparent:true,opacity:0,depthWrite:false,envMapIntensity:1.4
    });
    const band=new THREE.Mesh(new THREE.TorusGeometry(1.35+i*.25,.018,10,144),mat);
    band.rotation.set(.35+i*.33,.18+i*.51,.11+i*.41);
    lensStage.add(band);
    opticBands.push(band);opticMats.push(mat);
  }
  const opticGlows:THREE.Sprite[]=[];
  for(let i=0;i<8;i++){
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({
      map:glowTexture,color:i%2?0x74ffc0:0xe0fff0,
      transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending
    }));
    sp.scale.setScalar(i%3===0?.7:.36);
    lensStage.add(sp);opticGlows.push(sp);
  }

  let realTexture:THREE.Texture|undefined;
  let disposed=false;
  function resize(w:number,h:number){
    if(!Number.isFinite(w)||!Number.isFinite(h)||w<360||h<200)throw Error("Invalid film size");
    camera.aspect=w/h;camera.updateProjectionMatrix();
    renderer.setSize(Math.round(w),Math.round(h),false);
  }
  function setTime(t0:number){
    if(disposed)throw Error("Film disposed");
    if(!Number.isFinite(t0))throw Error("Frame time must be finite");
    const t=Math.min(CINEMA_SECONDS,Math.max(0,t0));
    const reveal=smooth(0,.9,t);
    const leaving=smooth(4.2,6.3,t);
    const field=smooth(7.1,8.65,t)*(1-smooth(12.4,14.45,t));
    const collapse=smooth(12.3,14.55,t);
    // Opening editorial composition deliberately reserves clean left-side typography.
    // UI is on the right, without the old giant overlay blocking its contents.
    device.position.set(
      lerp(2.5,.65,smooth(2.9,5.6,t)),
      lerp(-.1,-.08,smooth(0,5.6,t)),
      lerp(0,-2.35,leaving));
    device.rotation.set(
      lerp(.06,0,smooth(1,3.2,t)),
      lerp(-.48,.04,smooth(.1,4.6,t)),
      lerp(-.025,0,smooth(0,3.1,t)));
    const deviceVisibility=1-smooth(4.5,6.3,t);
    device.scale.setScalar(lerp(.92,.65,leaving));
    device.visible=deviceVisibility>.004;
    if(device.visible){
      chassis.material=aluminium;
      (screen.material as THREE.MeshBasicMaterial).opacity=deviceVisibility;
      // Even with transparent material disabled, the device slides behind the new field.
    }

    // Camera choreography is physical, has a 4-second transition, then pushes through.
    const p=new THREE.Vector3();
    const look=new THREE.Vector3();
    if(t<4.4){
      const e=smooth(0,4.4,t);
      p.set(lerp(-1.7,.1,e),lerp(1.25,.42,e),lerp(11,8.25,e));
      look.set(lerp(.95,1.3,e),lerp(-.04,.04,e),0);
    }else if(t<8.3){
      const e=smooth(4.4,8.3,t);
      p.set(lerp(.1,1.15,e),lerp(.42,.9,e),lerp(8.25,6.55,e));
      look.set(lerp(1.3,0,e),.04,lerp(0,.3,e));
    }else if(t<12.5){
      const e=smooth(8.3,12.5,t);
      p.set(lerp(1.15,-1.65,e),lerp(.9,.36,e),lerp(6.55,5.65,e));
      look.set(0,0,.2);
    }else if(t<16.25){
      const e=smooth(12.5,16.25,t);
      p.set(lerp(-1.65,.7,e),lerp(.36,.17,e),lerp(5.65,4.6,e));
      look.set(.05,.02,0);
    }else{
      const e=smooth(16.25,20,t);
      p.set(lerp(.7,0,e),lerp(.17,.06,e),lerp(4.6,10.5,e));
      look.set(0,0,0);
    }
    camera.position.copy(p);
    camera.lookAt(look);
    // A seamless physical transition: the product UI is its own texture on
    // sixty independent spatial shards. Absolute-time math prevents frame drift.
    device.updateMatrixWorld(true);
    fragmentGroup.visible=t>=4.0&&t<7.85;
    screen.visible=t<4.50;
    for(const {mesh,x,y,theta,delay} of fragments){
      const into=smooth(4.15+delay,6.5+delay,t);
      const vanish=smooth(5.55+delay*.25,7.15+delay*.3,t);
      const source=new THREE.Vector3(x,y,.153).applyMatrix4(device.matrixWorld);
      const circumference=new THREE.Vector3(
        Math.sin(theta)*2.6,
        y*.79,
        .35+Math.cos(theta)*1.25);
      const target=circumference.clone().lerp(new THREE.Vector3(
        x*.1,y*.12,.42),vanish);
      mesh.position.copy(source).lerp(target,into);
      mesh.position.z+=Math.sin(t*.6+theta)*.18*into*(1-vanish);
      mesh.rotation.set(
        lerp(device.rotation.x,0.09*Math.sin(theta+t*.2),into),
        lerp(device.rotation.y,theta*.65+t*.09,into),
        lerp(device.rotation.z,Math.sin(theta*.8)*.1,into)
      );
      mesh.scale.setScalar(lerp(device.scale.x,.73,into)*(1-.88*vanish));
      mesh.material.opacity=smooth(4.15+delay,4.7+delay,t)*(1-vanish)*.39;
      mesh.visible=mesh.material.opacity>.004;
    }

    // Visible from 3.5: airy volumetric sculpture, not floating rectangular UI cards.
    intelligence.visible=t>6.65 && t<14.6;
    intelligence.position.set(lerp(.35,0,smooth(7.4,10.0,t)),0,0);
    intelligence.scale.setScalar(lerp(.32,1.20,smooth(6.85,9.0,t)));
    intelligence.rotation.set(.18+Math.sin(t*.17)*.12,t*.21,.10+Math.cos(t*.23)*.1);
    halo.scale.setScalar(lerp(.01,1.20,smooth(7.1,9.05,t))*(1+collapse*.3));
    for(let i=0;i<rings.length;i++){
      ringMaterials[i].opacity=(.57+i*.1)*field;
      rings[i].rotation.y=t*(i%2?-.28:.22)+i*.3;
      rings[i].rotation.x=.37+i*.39+Math.sin(t*.25+i)*.10;
      rings[i].scale.setScalar(lerp(.64,1.02,smooth(7.1,9.2,t)));
    }
    filamentMats.forEach((m,i)=>{
      m.opacity=(.15+(i%3)*.1)*field*smooth(7.1+i*.04,8.35+i*.08,t);
    });
    dustMat.opacity=.63*smooth(7.15,8.6,t)*(1-smooth(12.95,14.35,t));
    const mesh=coords;
    for(let i=0;i<particleCount;i++){
      const o=i*3,begin=starts[i],end=orbits[i],fin=endings[i];
      const form=smooth(7.1+random(i+13)*.35,9.1,t);
      const endMorph=smooth(12.0+random(i+53)*.2,14.55,t);
      const x=lerp(lerp(begin.x,end.x,form),fin.x,endMorph);
      const y=lerp(lerp(begin.y,end.y,form),fin.y,endMorph);
      const z=lerp(lerp(begin.z,end.z,form),fin.z,endMorph);
      // Micro-oscillation is tied to absolute frame time, never accumulating.
      mesh[o]=x+.04*Math.sin(t*.67+i*.56)*form*(1-endMorph);
      mesh[o+1]=y+.04*Math.cos(t*.6+i*.45)*form*(1-endMorph);
      mesh[o+2]=z;
    }
    dots.attributes.position.needsUpdate=true;
    activeLights.forEach((s,i)=>{
      (s.material as THREE.SpriteMaterial).opacity=.36*field;
      const a=t*.25+i*Math.PI/6;
      s.position.set(Math.cos(a)*1.72,Math.sin(a*1.08)*1.55,.55*Math.sin(a*.8));
    });
    (spotlight.material as THREE.SpriteMaterial).opacity=.32*field;
    spotlight.scale.setScalar(lerp(2.2,3.85,smooth(7.8,11.75,t)));

    const opticReveal=smooth(12.45,13.2,t)*(1-smooth(16.05,17.45,t));
    lensStage.visible=opticReveal>.004;
    lensStage.scale.setScalar(lerp(.38,1.18,smooth(12.6,14.2,t))*
      (1-.48*smooth(16.3,17.6,t)));
    lensStage.position.set(lerp(.25,0,smooth(12.5,14,t)),0,.15);
    lensStage.rotation.set(
      -.12+.17*Math.sin(t*.33),
      .15+t*.21,
      -.25+.12*Math.cos(t*.44)
    );
    opticBands.forEach((ring,i)=>{
      opticMats[i].opacity=opticReveal*(i%2?.85:.63);
      ring.rotation.x=t*(i%2?.22:-.14)+i*.31;
      ring.rotation.y=t*(i%2?-.28:.3)+i*.51;
      ring.scale.setScalar(.92+.10*Math.sin(t*.33+i));
    });
    const gem=crystal.material as THREE.MeshPhysicalMaterial;
    gem.opacity=opticReveal;
    gem.transparent=true;
    (innerFacet.material as THREE.MeshPhysicalMaterial).opacity=opticReveal;
    (innerFacet.material as THREE.MeshPhysicalMaterial).transparent=true;
    opticGlows.forEach((glow,i)=>{
      const a=t*.33+i*2*Math.PI/8;
      glow.position.set(Math.cos(a)*1.75,Math.sin(a)*1.35,Math.sin(a*1.3)*.6);
      (glow.material as THREE.SpriteMaterial).opacity=.47*opticReveal;
    });

    edge.position.x=lerp(4,1.0,smooth(7.4,13.0,t));
    edge.intensity=lerp(20,29,smooth(8,12.4,t));
    key.intensity=lerp(4.4,2.7,smooth(7.2,13.2,t));
    renderer.render(world,camera);
  }
  async function setScreen(file:File){
    if(disposed)throw Error("Film disposed");
    if(!["image/png","image/jpeg","image/webp"].includes(file.type)
      ||file.size>12_000_000||file.size<1000)
      throw Error("Approved real PNG/JPEG/WebP source under 12MB required");
    const url=URL.createObjectURL(file);
    try{
      const picture=new Image();picture.src=url;
      await picture.decode();
      if(picture.naturalWidth<720||picture.naturalHeight<400)
        throw Error("Product screenshot must be at least 720x400");
      const surface=document.createElement("canvas");surface.width=1600;surface.height=900;
      const ctx=surface.getContext("2d");
      if(!ctx)throw Error("Product source image compositor missing");
      ctx.fillStyle="#06100b";ctx.fillRect(0,0,1600,900);
      const scale=Math.min(1600/picture.naturalWidth,900/picture.naturalHeight);
      const w=picture.naturalWidth*scale,h=picture.naturalHeight*scale;
      ctx.drawImage(picture,(1600-w)/2,(900-h)/2,w,h);
      const next=new THREE.CanvasTexture(surface);next.colorSpace=THREE.SRGBColorSpace;
      const old=realTexture;realTexture=next;screenMat.map=next;screenMat.needsUpdate=true;
      for(const frag of fragments){frag.mesh.material.map=next;frag.mesh.material.needsUpdate=true;}
      old?.dispose();
    }finally{URL.revokeObjectURL(url)}
  }
  resize(width,height);setTime(0);
  return{canvas,resize,setTime,setScreen,dispose(){
    if(disposed)return;disposed=true;
    world.traverse(n=>{
      if(n instanceof THREE.Mesh||n instanceof THREE.Points||n instanceof THREE.Sprite){
        if(n instanceof THREE.Mesh||n instanceof THREE.Points)n.geometry.dispose();
        const material=n.material;
        (Array.isArray(material)?material:[material]).forEach(m=>{
          // Shared texture resources are disposed exactly once below.
          m.dispose();
        });
      }
    });
    realTexture?.dispose();concept.dispose();glowTexture.dispose();studio.dispose();
    renderer.dispose();
  }};
}
