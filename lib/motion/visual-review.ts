import { FORMAT_SIZE, durationOf, type MotionProject } from "./studio";
import { drawMotionFrame } from "./render-engine";
import { preloadMotionLogo } from "./brand-assets";
import { inspectFramePixels } from "./quality";
import { fitShotCopy } from "./typography";

export interface VisualReview {
  pass: boolean;
  warnings: string[];
  sceneCoverage: number;
  frames: number;
  sheet: Blob;
}
/**
 * Real pixel-based preflight and review contact sheet. Samples middle and
 * transition-adjacent frames per shot, checks for blank frames and repeated
 * frames, exports a compact contact sheet for human art direction.
 *
 * This deliberately does NOT claim to score beauty, translation correctness,
 * licensing or whether an illustrative product UI matches live production.
 */
export async function reviewMotionVisuals(project: MotionProject): Promise<VisualReview> {
  await preloadMotionLogo(project.brand);
  await Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,5000))]);
  const size = FORMAT_SIZE[project.format];
  const samples: Array<{time:number;name:string}> = [];
  let cursor = 0;
  project.scenes.forEach((scene,index)=>{
    samples.push({time:cursor+scene.seconds*.48,name:"SHOT "+String(index+1).padStart(2,"0")});
    if(scene.seconds>=4.2) samples.push({time:cursor+scene.seconds*.86,name:"TRANSITION "+String(index+1).padStart(2,"0")});
    cursor+=scene.seconds;
  });
  const previewWidth = project.format==="landscape" ? 530 : 280;
  const previewHeight=Math.round(previewWidth*size.height/size.width);
  const frame=document.createElement("canvas");
  frame.width=previewWidth;
  frame.height=previewHeight;
  const ctx=frame.getContext("2d",{willReadFrequently:true,alpha:false});
  if(!ctx)throw new Error("Visual QA canvas not available");
  const cols=4,rows=Math.ceil(samples.length/cols),gap=14,label=28;
  const board=document.createElement("canvas");
  board.width=cols*(previewWidth+gap)+gap;
  board.height=rows*(previewHeight+label+gap)+gap;
  const bg=board.getContext("2d",{alpha:false});
  if(!bg)throw new Error("Contact sheet canvas not available");
  bg.fillStyle="#0b1015";bg.fillRect(0,0,board.width,board.height);
  bg.font="700 12px Arial,sans-serif";
  const warnings:string[]=[];
  // Native typography must remain intact for HY/RU/EN; never encode glyphs
  // into an AI image. Detect if the preferred Armenian font failed to load.
  if(project.language==="hy"){
    const loaded=await document.fonts.load('700 28px "Noto Sans Armenian"',"Հայերեն").catch(()=>[]);
    if(!loaded.length) warnings.push("ARMENIAN FONT REVIEW: preferred Noto Sans Armenian did not load; inspect glyph shapes and fallback.");
  }
  const virtualW=1080,virtualH=virtualW*size.height/size.width;
  for(const [i,scene] of project.scenes.entries()){
    const geometry=fitShotCopy(ctx,scene.headline.toLocaleUpperCase(project.language||"en"),scene.support,virtualW,virtualH,scene.typographyScale);
    for(const reason of geometry.reasons)warnings.push("SHOT "+String(i+1).padStart(2,"0")+" / TEXT: "+reason);
    if(geometry.title.fontSize<32)warnings.push("SHOT "+String(i+1).padStart(2,"0")+" / TEXT: headline is below minimum mobile readability.");
  }
  let lastPixels:Uint8ClampedArray | null = null;
  for(const [i,item] of samples.entries()){
    drawMotionFrame(ctx,project,item.time,previewWidth,previewHeight);
    const data=ctx.getImageData(0,0,previewWidth,previewHeight);
    const integrity=inspectFramePixels(data.data,previewWidth,previewHeight);
    if(!integrity.valid)warnings.push(item.name+": "+integrity.reason);
    // Frame distinctness is checked across the center of adjacent scene
    // samples; ordinary within-scene motion repetition is not treated as bad.
    if(item.name.startsWith("SHOT ")){
      const reduced=new Uint8ClampedArray(96);
      for(let j=0;j<32;j++){
        const pos=((j*137)%(previewWidth*previewHeight))*4;
        reduced[j*3]=data.data[pos];reduced[j*3+1]=data.data[pos+1];reduced[j*3+2]=data.data[pos+2];
      }
      if(lastPixels){
        let change=0;
        for(let j=0;j<reduced.length;j++)change+=Math.abs(reduced[j]-lastPixels[j]);
        const mean=change/reduced.length;
        if(mean<2.5)warnings.push(item.name+": visually similar to previous shot; inspect composition manually.");
      }
      lastPixels=reduced;
    }
    const x=gap+(i%cols)*(previewWidth+gap);
    const y=gap+Math.floor(i/cols)*(previewHeight+label+gap);
    bg.drawImage(frame,x,y);
    bg.fillStyle="#a6b8c6";
    bg.textBaseline="top";
    bg.fillText(item.name+" · "+item.time.toFixed(1)+"s",x,y+previewHeight+8);
  }
  const blob=await new Promise<Blob>((resolve,reject)=>board.toBlob(b=>b?resolve(b):reject(new Error("Contact sheet export failed")),"image/png"));
  return {
    pass:!warnings.some(w=>/\/ TEXT:|blank|unavailable|transparency|low dynamic range|below minimum mobile readability/i.test(w)),
    warnings,sceneCoverage:project.scenes.length,
    frames:samples.length,sheet:blob
  };
}
