import { sanitizeMotionProject, type MotionProject } from "./studio";
export interface SubtitleCue { index:number; start:number; end:number; text:string }
export interface CaptionBundle { cues:SubtitleCue[]; srt:string; vtt:string; voiceScript:string; language:string }
/** Subtitle cues follow on-screen copy, not a diarized/forced-aligned recorded voice. */
function safe(input:string):string {
 return input.normalize("NFC").replace(/[\u0000-\u001f\u007f]/gu," ").replace(/\s+/gu," ").trim();
}
function time(seconds:number,srt:boolean):string{
 const ms=Math.max(0,Math.round(seconds*1000)),h=Math.floor(ms/3600000),m=Math.floor(ms/60000)%60,s=Math.floor(ms/1000)%60;
 return [h,m,s].map(x=>String(x).padStart(2,"0")).join(":")+(srt?",":".")+String(ms%1000).padStart(3,"0");
}
function wrap(text:string):string {
 const words=safe(text).split(" ").filter(Boolean),out:string[]=[];
 let line="";
 for(const word of words){
   if(line && (line+" "+word).length>43 && out.length<3){out.push(line);line=word;}
   else line+=(line?" ":"")+word;
 }
 if(line)out.push(line);
 return out.join("\n");
}
export function createCaptionBundle(input:MotionProject):CaptionBundle {
 const project=sanitizeMotionProject(input);
 let cursor=0;
 const cues=project.scenes.map((s,index)=>{
   const start=cursor;cursor+=s.seconds;
   return {index:index+1,start:start+.18,end:Math.max(start+.55,cursor-.24),text:wrap(s.headline)};
 });
 const srt=cues.map(c=>c.index+"\n"+time(c.start,true)+" --> "+time(c.end,true)+"\n"+c.text).join("\n\n")+"\n";
 const vtt="WEBVTT\n\n"+cues.map(c=>time(c.start,false)+" --> "+time(c.end,false)+"\n"+c.text).join("\n\n")+"\n";
 const voiceScript=[
   "# "+project.title,
   "# "+String(project.language||"en").toUpperCase()+" / EDITORIAL NARRATION GUIDE",
   "# Shot times are NOT word-level voiceover alignment. Check the actual recording.",
   "# Proofread grammar, legal claims, names and spoken timing before publication.",
   "",
   ...project.scenes.map((s,i)=>{
     const from=cues[i].start-.18;
     return "["+time(from,false)+"–"+time(from+s.seconds,false)+"]\n"+safe(s.headline)+(s.support?"\n"+safe(s.support):"")+"\n";
   })
 ].join("\n");
 return {cues,srt,vtt,voiceScript,language:project.language||"en"};
}
