"use client";

import * as THREE from "three";
import { gsap } from "gsap";
import type { SpatialFrameRenderer } from "./spatial-bridge";

const TAU = Math.PI * 2;
const ease = gsap.parseEase("power3.inOut");

/**
 * Actual WebGL meshes / perspective camera rendered into an offscreen canvas
 * at an explicit timestamp. No random numbers, fetches, animation loops,
 * model calls, product metrics or procedural fake UI.
 * Uses real 3D lighting, depth test, occlusion, and material reflectance.
 */
export function createSpatialRenderer(): SpatialFrameRenderer {
  const canvas = document.createElement("canvas");
  const renderer = new THREE.WebGLRenderer({
    canvas, alpha: true, antialias: true, preserveDrawingBuffer: true,
    powerPreference: "default"
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.setClearColor(0x000000, 0);

  const world = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42,1,.1,80);
  camera.position.set(0,0,11);

  const hemisphere = new THREE.HemisphereLight(0xdbe9ff,0x081019,2.0);
  world.add(hemisphere);
  const key = new THREE.PointLight(0xe4f1ff,55,30,2);
  key.position.set(-3.5,4,6);
  world.add(key);
  const rim = new THREE.PointLight(0xffffff,38,24,2);
  rim.position.set(4,-2,1);
  world.add(rim);

  const rig = new THREE.Group();
  world.add(rig);
  const intelligenceRig=new THREE.Group();
  const searchRig=new THREE.Group();
  const architectureRig=new THREE.Group();
  rig.add(intelligenceRig,searchRig,architectureRig);

  const metal = new THREE.MeshStandardMaterial({
    color:0x233b45, metalness:.65, roughness:.22,
    flatShading:true, transparent:true, opacity:.98
  });
  const coreGeometry=new THREE.IcosahedronGeometry(1.18,2);
  const core = new THREE.Mesh(coreGeometry,metal);
  intelligenceRig.add(core);
  const skeleton=new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.22,1)),
    new THREE.LineBasicMaterial({color:0x9aafb9,transparent:true,opacity:.38})
  );
  intelligenceRig.add(skeleton);

  const rings:THREE.Mesh[] = [];
  for(let i=0;i<3;i++){
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(1.92+i*.33,.015+i*.006,9,160),
      new THREE.MeshBasicMaterial({color:0x9eb1ba,transparent:true,opacity:.47-i*.09})
    );
    mesh.rotation.set(.15+i*.62,.48+i*.31,.20+i*.77);
    intelligenceRig.add(mesh);
    rings.push(mesh);
  }

  // Brand signal fragments are real meshes in 3D, not flattened 2D rings.
  const shards:THREE.Mesh[]=[];
  const shardGeometry=new THREE.BoxGeometry(.16,.37,.026);
  for(let i=0;i<24;i++){
    const p=i/24*TAU;
    const band=(i%4-1.5)*.19;
    const mesh=new THREE.Mesh(shardGeometry,
      new THREE.MeshStandardMaterial({
        color:0xa4b5bd,metalness:.42,roughness:.35,
        transparent:true,opacity:.52+(i%3)*.12
      }));
    mesh.position.set(Math.cos(p)*2.98,Math.sin(p)*1.82+band,
      Math.sin(p*3)*.73);
    mesh.rotation.set(.17*p,p*.42,p+.15);
    intelligenceRig.add(mesh);
    shards.push(mesh);
  }

  // Visibility discovery: evidence tiles form a spatial, rotating search field.
  // Decorative geometry only; never simulated AI responses or customer numbers.
  const evidenceTiles:THREE.Mesh[]=[];
  for(let i=0;i<9;i++){
    const a=i*.65;
    const card=new THREE.Mesh(
      new THREE.BoxGeometry(1.25,.74,.052),
      new THREE.MeshStandardMaterial({
        color:0x466b64,metalness:.42,roughness:.35,
        transparent:true,opacity:.76,side:THREE.DoubleSide
      })
    );
    card.position.set(Math.sin(a)*2.25,(i-4)*.32,Math.cos(a)*1.5);
    card.rotation.set(.12*Math.sin(i),a/4-.4,Math.sin(a)*.12);
    searchRig.add(card);
    const rimLines=new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.26,.75,.058)),
      new THREE.LineBasicMaterial({color:0xc5eadd,transparent:true,opacity:.64})
    );
    card.add(rimLines);
    evidenceTiles.push(card);
  }
  const helixPoints:number[]=[];
  for(let i=0;i<=64;i++){
    const a=i/64*TAU*1.9;
    helixPoints.push(Math.sin(a)*2.4,(i/64-.5)*3.15,Math.cos(a)*1.5);
  }
  const helixBuffer=new THREE.BufferGeometry();
  helixBuffer.setAttribute("position",new THREE.Float32BufferAttribute(helixPoints,3));
  searchRig.add(new THREE.Line(helixBuffer,new THREE.LineBasicMaterial({
    color:0x9ed8c6,transparent:true,opacity:.43
  })));

  // Architectural massing: a non-representational capital / real estate motif.
  // Abstract physical volumes, not a fabricated Dubai listing or real building.
  const buildings:THREE.Mesh[]=[];
  for(let i=0;i<11;i++){
    const height=1.0+(i*17%9)*.34;
    const volume=new THREE.Mesh(
      new THREE.BoxGeometry(.48,height,.53),
      new THREE.MeshStandardMaterial({
        color:0x566470,metalness:.45,roughness:.26,
        transparent:true,opacity:.82
      })
    );
    volume.position.set((i%6-2.5)*.68,-1.2+height/2,Math.floor(i/6)*.8-.4);
    architectureRig.add(volume);
    buildings.push(volume);
    const boundary=new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(.485,height+.005,.535)),
      new THREE.LineBasicMaterial({color:0xb9c7d0,transparent:true,opacity:.47})
    );
    volume.add(boundary);
  }
  const plinth=new THREE.Mesh(
    new THREE.CylinderGeometry(2.95,3.1,.1,6),
    new THREE.MeshStandardMaterial({color:0x24303b,metalness:.68,roughness:.44})
  );
  plinth.position.y=-1.25;
  architectureRig.add(plinth);

  // Deterministic star field with seeded trigonometric distribution.
  const positions=new Float32Array(540*3);
  for(let i=0;i<540;i++){
    const n=i*3;
    const theta=(i*2.399963229728653)%TAU;
    const radial=3.2+((i*97)%113)/113*3.2;
    positions[n]=Math.cos(theta)*radial;
    positions[n+1]=Math.sin(theta)*radial*.65;
    positions[n+2]=-3+((i*53)%101)/101*4;
  }
  const stars=new THREE.BufferGeometry();
  stars.setAttribute("position",new THREE.BufferAttribute(positions,3));
  const particles=new THREE.Points(stars,new THREE.PointsMaterial({
    color:0xc4dce9,size:.026,transparent:true,opacity:.5,
    sizeAttenuation:true,depthWrite:false
  }));
  world.add(particles);

  let currentWidth=0;
  let currentHeight=0;
  let previousColor="";
  function setColor(accent:string) {
    if(accent===previousColor)return;
    const base=new THREE.Color(accent);
    const cool=base.clone().lerp(new THREE.Color("#d0dee9"),.42);
    (core.material as THREE.MeshStandardMaterial).color.copy(base).lerp(new THREE.Color("#25313b"),.67);
    (skeleton.material as THREE.LineBasicMaterial).color.copy(cool);
    for(const [i,ring] of rings.entries()){
      (ring.material as THREE.MeshBasicMaterial).color.copy(base.clone().lerp(new THREE.Color("#eef5f9"),.38+i*.13));
    }
    for(const shard of shards)
      (shard.material as THREE.MeshStandardMaterial).color.copy(cool);
    for(const tile of evidenceTiles)
      (tile.material as THREE.MeshStandardMaterial).color.copy(base.clone().lerp(new THREE.Color("#31494a"),.68));
    for(const block of buildings)
      (block.material as THREE.MeshStandardMaterial).color.copy(base.clone().lerp(new THREE.Color("#3c4b58"),.84));
    rim.color.copy(base);
    previousColor=accent;
  }

  return (ctx,width,height,accent,time,progress,index,scene,brand)=>{
    if(!Number.isFinite(time)||width<1||height<1)return;
    const w=Math.max(1,Math.round(width));
    const h=Math.max(1,Math.round(height));
    if(currentWidth!==w||currentHeight!==h){
      // Deliberate 1x pixel ratio: stable on desktop/offline, bounded GPU memory.
      renderer.setPixelRatio(1);
      renderer.setSize(w,h,false);
      camera.aspect=w/h;
      camera.updateProjectionMatrix();
      currentWidth=w;
      currentHeight=h;
    }
    setColor(accent);
    const motif=brand==="promptence"?"visibility":(["suren","tun","reality_engine"].includes(brand)?"architecture":"intelligence");
    intelligenceRig.visible=motif==="intelligence";
    searchRig.visible=motif==="visibility";
    architectureRig.visible=motif==="architecture";
    const normalized=Math.max(0,Math.min(1,progress));
    const directed=ease(normalized);
    const strength=Math.max(0,Math.min(1,scene.intensity??.5));
    const horizontal=h<810;
    rig.position.set(horizontal?2.45:0,horizontal?-.08:-1.5,0);
    rig.scale.setScalar(horizontal?.86:1);
    rig.rotation.set(.05+Math.sin(time*.19+index)*.1,
      time*.21+index*.65+directed*.42,
      Math.sin(time*.13+index)*.06);
    core.rotation.set(time*.26,-time*.2,time*.12);
    searchRig.rotation.set(.07*Math.sin(time*.27),.11*Math.sin(time*.22),.03*Math.sin(time*.18));
    evidenceTiles.forEach((tile,i)=>{
      tile.position.x=Math.sin(i*.65+time*.08)*2.25;
      tile.position.z=Math.cos(i*.65+time*.08)*1.5;
    });
    architectureRig.rotation.y=.10*Math.sin(time*.2+index*.2);
    // Architecture stays physically stable while the camera orbits; no jittery skyscrapers.
    skeleton.rotation.copy(core.rotation);
    rings.forEach((ring,i)=>{
      ring.rotation.x=.30+i*.62+Math.sin(time*.28+i)*.24;
      ring.rotation.y=.30+i*.33+time*.13*(i%2?1:-1);
      ring.rotation.z=i*.42-time*.075;
    });
    shards.forEach((shard,i)=>{
      shard.rotation.z=i*.2+time*.1;
      shard.scale.y=1+Math.sin(i*.8+time*1.15)*.36;
    });
    particles.rotation.z=time*.009;
    key.position.x=-3.5+Math.sin(time*.3)*1.3;
    camera.position.set(
      Math.sin(time*.11+index*.5)*.12*strength,
      Math.cos(time*.1)*.08*strength,
      11+(scene.camera==="push"?-.75*directed*strength:scene.camera==="pull"?.75*directed*strength:0)
    );
    camera.lookAt(0,0,0);
    // Renderer only runs when explicitly requested. Nothing is uploaded.
    renderer.render(world,camera);
    ctx.drawImage(renderer.domElement,0,0,width,height);
  };
}
