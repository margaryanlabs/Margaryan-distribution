#!/usr/bin/env node
/**
 * Offline, source-preserving visual reference inspector for actual encoded MP4.
 * Uses FFmpeg/ffprobe and raw RGB frames, no third-party video models.
 * Does not compare storytelling, semantic accuracy, sound, or artistic quality.
 *
 * npm run motion:compare -- ./out/our-film.mp4 ./reference.mp4
 */
import { spawnSync } from "node:child_process";
import { stat, writeFile, unlink } from "node:fs/promises";
import { resolve, extname } from "node:path";
import process from "node:process";

const [ourInput,refInput] = process.argv.slice(2);
if(!ourInput||!refInput||process.argv.length>4){
  process.stderr.write("Usage: npm run motion:compare -- own-video.mp4 reference.mp4\n");
  process.exit(2);
}
const W=320,H=180,PIXELS=W*H,FRAME=PIXELS*3;
const portions=[.04,.16,.29,.42,.55,.68,.81,.95];
function run(command,args,buffer=4_000_000,timeout=50_000){
  const out=spawnSync(command,args,{encoding:null,maxBuffer:buffer,timeout});
  if(out.status!==0)throw Error(command+" failed: "+String(out.stderr||out.error||"unknown").slice(-550));
  return out.stdout;
}
async function inspect(file){
  const name=resolve(file),size=await stat(name);
  if(!size.isFile()||size.size>750_000_000||size.size<2500)throw Error("Input is empty or exceeds 750 MB.");
  if(![".mp4",".mov",".m4v",".webm"].includes(extname(name).toLowerCase()))throw Error("Only local MP4/MOV/WebM files supported.");
  const p=JSON.parse(run("ffprobe",["-v","error","-show_format","-show_streams","-of","json",name]).toString("utf8"));
  const v=p.streams?.find(s=>s.codec_type==="video");
  const duration=Number(p.format?.duration);
  if(!v||!Number.isFinite(duration)||duration<2||duration>180||v.width<160||v.height<160)throw Error("Video must be 2–180s with decodable frames.");
  return {file:name,seconds:duration,width:v.width,height:v.height,codec:v.codec_name||null};
}
function extract(file,t){
  const filter="scale="+W+":"+H+":force_original_aspect_ratio=increase,crop="+W+":"+H;
  const bytes=run("ffmpeg",["-v","error","-ss",t.toFixed(3),"-i",file,"-map","0:v:0","-frames:v","1",
    "-vf",filter,"-f","rawvideo","-pix_fmt","rgb24","pipe:1"],FRAME+2500,60_000);
  if(bytes.length!==FRAME)throw Error("One sampled frame could not be decoded at "+t.toFixed(3)+"s");
  return bytes;
}
function metrics(buf){
  let lum=0,sumSq=0,sat=0,dark=0;
  const matrix=new Float32Array(PIXELS);
  for(let p=0;p<PIXELS;p++){
    const k=p*3,r=buf[k],g=buf[k+1],b=buf[k+2];
    const L=.2126*r+.7152*g+.0722*b;
    lum+=L;sumSq+=L*L;matrix[p]=L;
    const max=Math.max(r,g,b),min=Math.min(r,g,b);
    sat+=max?(max-min)/max:0;
    if(L<48)dark++;
  }
  let edges=0,total=0;
  for(let y=1;y<H-1;y+=2)for(let x=1;x<W-1;x+=2){
    const j=y*W+x;
    if(Math.abs(matrix[j]-matrix[j-1])+Math.abs(matrix[j]-matrix[j-W])>24)edges++;
    total++;
  }
  const luma=lum/PIXELS;
  return {
    luma:+luma.toFixed(2),
    contrast:+Math.sqrt(Math.max(0,sumSq/PIXELS-luma*luma)).toFixed(2),
    saturation:+(100*sat/PIXELS).toFixed(2),
    darkShare:+(100*dark/PIXELS).toFixed(2),
    edgeDensity:+(100*edges/total).toFixed(2)
  };
}
const average=arr=>arr.reduce((a,b)=>a+b,0)/Math.max(1,arr.length);
let outputFile=null;
try{
  const a=await inspect(ourInput),b=await inspect(refInput);
  const cells=[],pairs=[];
  let lastA=null,lastB=null;
  for(const portion of portions){
    const ta=a.seconds*portion,tb=b.seconds*portion;
    const [ours,reference]=[extract(a.file,ta),extract(b.file,tb)];
    const scoreA=metrics(ours),scoreB=metrics(reference);
    let temporalDifference=null;
    if(lastA&&lastB){
      let ourMotion=0,refMotion=0;
      for(let j=0;j<FRAME;j+=3){
        ourMotion+=Math.abs(ours[j]-lastA[j])+Math.abs(ours[j+1]-lastA[j+1])+Math.abs(ours[j+2]-lastA[j+2]);
        refMotion+=Math.abs(reference[j]-lastB[j])+Math.abs(reference[j+1]-lastB[j+1])+Math.abs(reference[j+2]-lastB[j+2]);
      }
      temporalDifference:+(Math.abs(ourMotion-refMotion)/FRAME).toFixed(2);
      temporalDifference=+(Math.abs(ourMotion-refMotion)/FRAME).toFixed(2);
    }
    pairs.push({position:portion,ourTime:+ta.toFixed(2),referenceTime:+tb.toFixed(2),
      ours:scoreA,reference:scoreB,temporalDifference});
    lastA=ours;lastB=reference;
    // Paired 320x180 samples, side-by-side, top/bottom reading order.
    const row=Buffer.alloc(FRAME*2);
    for(let y=0;y<H;y++){
      ours.copy(row,y*W*6,y*W*3,(y+1)*W*3);
      reference.copy(row,y*W*6+W*3,y*W*3,(y+1)*W*3);
    }
    cells.push(row);
  }
  const outfile=a.file.replace(/\.[^.]+$/,"")+".reference-report.json";
  const image=a.file.replace(/\.[^.]+$/,"")+".reference-contact-sheet.png";
  const ppm=image+".ppm";
  outputFile=ppm;
  const header=Buffer.from("P6\n"+(W*2)+" "+(H*portions.length)+"\n255\n");
  await writeFile(ppm,Buffer.concat([header,...cells]));
  run("ffmpeg",["-y","-v","error","-i",ppm,"-frames:v","1",image],2_000_000,90_000);
  await unlink(ppm);outputFile=null;
  const signal={
    lumaDelta:+average(pairs.map(p=>p.ours.luma-p.reference.luma)).toFixed(2),
    darkShareDelta:+average(pairs.map(p=>p.ours.darkShare-p.reference.darkShare)).toFixed(2),
    contrastDelta:+average(pairs.map(p=>p.ours.contrast-p.reference.contrast)).toFixed(2),
    saturationDelta:+average(pairs.map(p=>p.ours.saturation-p.reference.saturation)).toFixed(2),
    temporalDifference:+average(pairs.filter(p=>p.temporalDifference!==null).map(p=>p.temporalDifference)).toFixed(2)
  };
  const warnings=[];
  if(Math.abs(signal.darkShareDelta)>22)warnings.push("Dark-pixel coverage differs; inspect brand-approved tonal grading.");
  if(Math.abs(signal.contrastDelta)>20)warnings.push("Contrast differs; inspect legibility and visual hierarchy.");
  if(Math.abs(signal.saturationDelta)>20)warnings.push("Saturation differs; keep official brand colors.");
  if(Math.abs(signal.temporalDifference)>35)warnings.push("Between-sample changes differ. Not a reliable edit-cut detector.");
  if(a.width/a.height!==b.width/b.height)warnings.push("Different aspect ratios: both film samples were center-cropped to 16:9. Visual similarities are only approximate.");
  const report={
    schema:"margaryan-motion-offline-reference/v1",generatedAt:new Date().toISOString(),
    film:{file:a.file,seconds:a.seconds,width:a.width,height:a.height,codec:a.codec},
    reference:{file:b.file,seconds:b.seconds,width:b.width,height:b.height,codec:b.codec},
    pairedFrameCount:pairs.length,signal,pairs,warnings,contactSheet:image,
    humanReviewRequired:true,metricsOnly:true,
    disclaimer:"Descriptive color/contrast/pixel-change signals at eight relative positions, not a score of creative quality. No similarity claim, content copying, sound analysis or rights verification."
  };
  await writeFile(outfile,JSON.stringify(report,null,2)+"\n");
  process.stdout.write(JSON.stringify({status:"COMPLETED",report:outfile,contactSheet:image,signal,warnings},null,2)+"\n");
}catch(err){
  if(outputFile)await unlink(outputFile).catch(()=>{});
  process.stderr.write("Reference comparison failed: "+(err instanceof Error?err.message:String(err))+"\n");
  process.exitCode=1;
}
