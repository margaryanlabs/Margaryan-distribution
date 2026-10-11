"use client";

import {useEffect,useMemo,useState} from "react";
import {durationOf,makeMotionPreset,sanitizeMotionProject,type MotionProject} from "@/lib/motion/studio";
import styles from "./film-sequence-desk.module.css";
import FilmBrowserExport from "./film-browser-export";

type Chapter={id:string;title:string;project:MotionProject};
const STORAGE="margaryan-motion-film-sequence-v1";
const MAX=8;
const CHAT_FRAGMENT="#motion-sequence-v1=";
const LINK_LIMIT=26_000;
type FilmDraft=ReturnType<typeof decodeManifest>;
function fromChatLink(fragment:string):FilmDraft {
  if(fragment.length<12||fragment.length>LINK_LIMIT||!/^[A-Za-z0-9_-]+$/.test(fragment))
    throw Error("ChatGPT film link is invalid or too long; use film JSON instead");
  const b64=fragment.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-fragment.length%4)%4);
  const binary=atob(b64);
  if(binary.length>20_000)throw Error("ChatGPT film draft exceeds 20KB limit");
  const bytes=Uint8Array.from(binary,ch=>ch.charCodeAt(0));
  const raw=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
  return decodeManifest(raw);
}
function seconds(n:number){return Math.floor(n/60)+":"+String(Math.floor(n%60)).padStart(2,"0");}
function safeChapter(raw:unknown,index:number):Chapter{
  if(!raw||typeof raw!=="object")throw Error("Chapter must be an object");
  const c=raw as Record<string,unknown>;
  if(!c.project||typeof c.project!=="object")throw Error("Chapter project required");
  const input=c.project as Record<string,unknown>;
  if(!Array.isArray(input.scenes)||input.scenes.length<1||input.scenes.length>8)
    throw Error("A chapter must have 1–8 scenes");
  if(typeof input.title!=="string"||input.title.length>100)
    throw Error("Film chapter title invalid");
  for(const scene of input.scenes){
    const s=scene as Record<string,unknown>;
    if(!s||typeof s.headline!=="string"||s.headline.length>105||
      typeof s.seconds!=="number"||s.seconds<2||s.seconds>8)
      throw Error("Invalid shot title or duration");
    if(["src","url","videoUrl","imageUrl"].some(field=>Object.hasOwn(s,field)))
      throw Error("Remote media cannot be imported into an offline film");
  }
  const project=sanitizeMotionProject(input);
  const id="chapter-"+(index+1);
  const title=typeof c.title==="string"&&c.title.trim()?
    c.title.trim().slice(0,100):"Chapter "+(index+1);
  return {id,title,project};
}
function decodeManifest(raw:unknown):{title:string;chapters:Chapter[];brand:string;format:string}{
  if(!raw||typeof raw!=="object")throw Error("Invalid sequence");
  const p=raw as Record<string,unknown>;
  if(p.version!==1||p.type!=="motion-sequence-v1"||
     typeof p.title!=="string"||!p.title.trim()||p.title.length>100)
    throw Error("Expected motion-sequence-v1 manifest");
  if(!Array.isArray(p.chapters)||p.chapters.length<1||p.chapters.length>MAX)
    throw Error("A sequence must have 1–8 chapters");
  const chapters=p.chapters.map(safeChapter);
  const brand=chapters[0].project.brand,format=chapters[0].project.format;
  if(p.brand!==brand||p.format!==format||
     chapters.some(ch=>ch.project.brand!==brand||ch.project.format!==format))
    throw Error("All chapters must use the same brand and aspect ratio");
  const actual=chapters.reduce((s,c)=>s+durationOf(c.project),0);
  if(typeof p.expectedDurationSeconds==="number"&&Math.abs(p.expectedDurationSeconds-actual)>.05)
    throw Error("Manifest film duration does not match scene durations");
  return {title:p.title.trim(),chapters,brand,format};
}
function writeJSON(name:string,content:string){
  const blob=new Blob([content],{type:"application/json"});
  const link=document.createElement("a"),url=URL.createObjectURL(blob);
  link.href=url;link.download=name;
  document.body.appendChild(link);link.click();link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),30_000);
}
export default function FilmSequenceDesk({
  project,busy,onLoadProject
}:{
  project:MotionProject;busy:boolean;onLoadProject:(p:MotionProject,reason:string)=>void;
}){
  const [ready,setReady]=useState(false);
  const [chapters,setChapters]=useState<Chapter[]>([]);
  const [inbound,setInbound]=useState<FilmDraft|null>(null);
  const [selected,setSelected]=useState<number|null>(null);
  const [title,setTitle]=useState("NEW MOTION FILM");
  const [chapterTitle,setChapterTitle]=useState("");
  const [notice,setNotice]=useState("Save each edited chapter. Export a film manifest for local multi-part H.264 mastering.");
  useEffect(()=>{
    try{
      const data=window.localStorage.getItem(STORAGE);
      if(data){
        const m=decodeManifest(JSON.parse(data));
        setChapters(m.chapters);setTitle(m.title);
      }
    }catch{setNotice("An old saved film manifest is invalid. The current editor was not modified.");}
    setReady(true);
  },[]);
  useEffect(()=>{
    if(!ready)return;
    try{
      if(!chapters.length)window.localStorage.removeItem(STORAGE);
      else window.localStorage.setItem(STORAGE,JSON.stringify(toManifest()));
    }catch{setNotice("Browser storage quota reached. Export a film manifest to keep a copy.");}
    // Film drafts only; original media bytes remain in the user's local media library.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[chapters,title,ready]);
  useEffect(()=>{
    if(!ready || !window.location.hash.startsWith(CHAT_FRAGMENT))return;
    const fragment=window.location.hash.slice(CHAT_FRAGMENT.length);
    window.history.replaceState(window.history.state,"",window.location.pathname+window.location.search);
    try{
      const received=fromChatLink(fragment);
      setInbound(received);
      setNotice("ChatGPT sent a "+received.chapters.length+"-chapter film. Inspect the proposal before replacing any local chapters.");
    }catch(e){
      setInbound(null);
      setNotice("CHATGPT FILM LINK REJECTED: "+(e instanceof Error?e.message:"invalid draft"));
    }
  },[ready]);
  const length=useMemo(()=>chapters.reduce((s,c)=>s+durationOf(c.project),0),[chapters]);
  const shots=useMemo(()=>chapters.reduce((s,c)=>s+c.project.scenes.length,0),[chapters]);
  const savedProjects=useMemo(()=>chapters.map(c=>c.project),[chapters]);
  const origin=chapters[0]?.project;
  const different=Boolean(origin&&(origin.brand!==project.brand||origin.format!==project.format));
  const dirty=selected!==null&&chapters[selected]?
    JSON.stringify(chapters[selected].project)!==JSON.stringify(sanitizeMotionProject(project)):false;
  function approveIncoming(){
    if(!inbound||busy)return;
    if(dirty&&!window.confirm("The current chapter has unsaved edits. Replace the saved film anyway?"))return;
    setTitle(inbound.title);
    setChapters(inbound.chapters);
    setSelected(null);
    setInbound(null);
    setNotice("ChatGPT film approved and saved locally. Choose a chapter to inspect actual frames before rendering.");
  }
  function toManifest(){
    const sum=chapters.reduce((s,c)=>s+durationOf(c.project),0);
    return {
      version:1 as const,type:"motion-sequence-v1",title:title.trim()||"UNTITLED FILM",
      brand:chapters[0]?.project.brand||project.brand,
      format:chapters[0]?.project.format||project.format,
      expectedDurationSeconds:Number(sum.toFixed(3)),
      chapters:chapters.map(c=>({id:c.id,title:c.title,project:c.project}))
    };
  }
  function checkChapter():MotionProject{
    const current=sanitizeMotionProject(project);
    if(!current.scenes.length)throw Error("Chapter has no scenes");
    if(different)throw Error("Film chapters must have one brand and format. Reset sequence to switch.");
    return current;
  }
  function addChapter(){
    if(busy||chapters.length>=MAX)return;
    try{
      const current=checkChapter(),index=chapters.length;
      const t=chapterTitle.trim().slice(0,100)||"Chapter "+(index+1);
      setChapters(prev=>[...prev,{id:"chapter-"+(index+1),title:t,project:current}]);
      setSelected(index);setChapterTitle("");
      setNotice("Added chapter "+(index+1)+". Edit it, then use SAVE ACTIVE CHAPTER. Original footage stays on this device.");
    }catch(e){setNotice(e instanceof Error?e.message:"Cannot add chapter");}
  }
  function saveChapter(){
    if(selected===null||busy)return;
    try{
      const current=checkChapter();
      setChapters(prev=>prev.map((c,i)=>i===selected?{...c,project:current}:c));
      setNotice("Saved chapter "+(selected+1)+" with "+current.scenes.length+" shots.");
    }catch(e){setNotice(e instanceof Error?e.message:"Cannot save");}
  }
  function loadChapter(index:number){
    if(busy)return;
    if(dirty&&!window.confirm("Your current chapter has unsaved changes. Load another chapter and discard those edits?"))return;
    onLoadProject(chapters[index].project,"Loaded film chapter "+(index+1));
    setSelected(index);
    setNotice("Chapter "+(index+1)+" loaded. Approved media is never embedded in the JSON.");
  }
  function newChapter(){
    if(busy||chapters.length>=MAX)return;
    if(dirty&&!window.confirm("Current chapter has unsaved changes. Continue to a new chapter?"))return;
    onLoadProject(makeMotionPreset(project.brand,project.format),"New film chapter started");
    setSelected(null);
    setNotice("New editable chapter started. Direct or edit its shots, then ADD CURRENT AS CHAPTER.");
  }
  function exportFilm(){
    if(!chapters.length)return;
    const text=JSON.stringify(toManifest(),null,2)+"\n";
    if(new Blob([text]).size>300_000){setNotice("Film manifest over 300KB. Reduce metadata.");return;}
    writeJSON("margaryan-motion-film.motion-sequence.json",text);
    setNotice("Film manifest saved. It contains the storyboard, NOT copyrighted video, music or narration files.");
  }
  async function importFilm(file?:File){
    if(!file||busy)return;
    try{
      if(file.size>300_000)throw Error("Sequence JSON exceeds 300KB");
      const parsed=decodeManifest(JSON.parse(await file.text()));
      if(dirty&&!window.confirm("Import will replace the saved sequence and any unsaved chapter edits. Continue?"))return;
      setTitle(parsed.title);setChapters(parsed.chapters);setSelected(null);
      setNotice("Imported "+parsed.chapters.length+" chapters; choose LOAD to edit an individual chapter.");
    }catch(e){setNotice(e instanceof Error?e.message:"Invalid film sequence");}
  }
  async function openDemo(){
    if(busy)return;
    try{
      const response=await fetch("/motion/film-templates/promptence-120s.json",{
        method:"GET",cache:"no-store",credentials:"same-origin"
      });
      if(!response.ok)throw Error("Film demo is unavailable (HTTP "+response.status+")");
      const text=await response.text();
      if(text.length>20_000)throw Error("Film demo is unexpectedly large");
      const draft=decodeManifest(JSON.parse(text));
      setInbound(draft);
      setNotice("Source-honest 120-second Promptence editorial demo staged. Review all chapters before approving.");
    }catch(e){setNotice("FILM DEMO: "+(e instanceof Error?e.message:"Could not load demo"));}
  }
  function removeChapter(index:number){
    if(busy||!window.confirm("Remove this chapter from the film manifest? The current editor will not change."))return;
    setChapters(prev=>prev.filter((_,i)=>i!==index).map((c,i)=>({...c,id:"chapter-"+(i+1)})));
    setSelected(null);
    setNotice("Chapter removed from the sequence manifest, not from the current editor.");
  }
  function resetFilm(){
    if(busy||!window.confirm("Clear the saved sequence? Export a copy first if needed."))return;
    setChapters([]);setSelected(null);setTitle("NEW MOTION FILM");
    setNotice("Film sequence reset. Current editable chapter and local source media remain intact.");
  }
  return <section className={styles.shell} aria-label="Professional film sequence studio">
    <div className={styles.kicker}>MOTION PRO / FEATURE FILM ASSEMBLER</div>
    <div className={styles.head}>
      <div><h3>Sequence <em>Studio.</em></h3>
        <p>Build an actual long-form film from short, independently reviewable chapters.</p></div>
      <div className={styles.pill}>{chapters.length}/{MAX} CHAPTERS</div>
    </div>
    <div className={styles.stats}>
      <span><strong>{seconds(length)}</strong><small>TOTAL RUNTIME</small></span>
      <span><strong>{shots}</strong><small>EDITABLE SHOTS</small></span>
      <span><strong>{chapters.length?origin?.format.toUpperCase():"—"}</strong><small>FILM FORMAT</small></span>
    </div>
    {inbound&&<div className={styles.incoming} aria-label="Review film proposed by ChatGPT">
      <b>CHATGPT → FILM / REVIEW REQUIRED</b>
      <h4>{inbound.title}</h4>
      <p>{inbound.chapters.length} chapters · {inbound.chapters.reduce((sum,c)=>sum+c.project.scenes.length,0)} scenes · {seconds(inbound.chapters.reduce((sum,c)=>sum+durationOf(c.project),0))} · {inbound.brand.toUpperCase()}</p>
      <div className={styles.incomingChapters}>{inbound.chapters.map((chapter,i)=><span key={i}>{String(i+1).padStart(2,"0")} · {chapter.title}</span>)}</div>
      <small>Approving replaces only the saved film sequence in this browser. It never sends media, launches rendering or overwrites the current chapter automatically.</small>
      <div className={styles.incomingActions}>
        <button type="button" disabled={busy} onClick={approveIncoming}>APPROVE & SAVE FILM</button>
        <button type="button" onClick={()=>{setInbound(null);setNotice("Incoming ChatGPT film dismissed; the local film was not changed.");}}>DISCARD</button>
      </div>
    </div>}
    <label className={styles.field}>FILM TITLE
      <input maxLength={100} value={title} onChange={e=>setTitle(e.target.value)}/>
    </label>
    {chapters.length>0&&<div className={styles.fullTimeline} aria-label="Entire film visual timeline">
      <div className={styles.timelineHead}><span>MASTER TIMELINE / ALL SCENES</span><b>{seconds(length)}</b></div>
      <div className={styles.chapterTimeline}>
        {chapters.map((part,i)=><button key={part.id} type="button" title={part.title+" / "+seconds(durationOf(part.project))}
          aria-label={"Jump to "+part.title} onClick={()=>loadChapter(i)} disabled={busy}
          data-current={selected===i} style={{width:(durationOf(part.project)/length*100)+"%"}}>
          {part.project.scenes.map((s,k)=><i key={k} title={s.headline}
            style={{width:(s.seconds/durationOf(part.project)*100)+"%"}}/>)}
        </button>)}
      </div>
      <div className={styles.timelineRuler}><span>00:00</span><span>{seconds(length/2)}</span><span>{seconds(length)}</span></div>
    </div>}
    {chapters.length>0&&<div className={styles.chapters}>
      {chapters.map((c,i)=><div className={styles.chapter} key={c.id} data-current={selected===i}>
        <span className={styles.number}>{String(i+1).padStart(2,"0")}</span>
        <div className={styles.details}><strong>{c.title}</strong>
          <small>{c.project.scenes.length} SHOTS · {seconds(durationOf(c.project))} · {c.project.brand.toUpperCase()}</small></div>
        <button type="button" disabled={busy} onClick={()=>loadChapter(i)}>EDIT</button>
        <button type="button" disabled={busy} aria-label={"Delete "+c.title} onClick={()=>removeChapter(i)}>×</button>
      </div>)}
    </div>}
    {chapters.length>0&&<FilmBrowserExport chapters={savedProjects} busy={busy} dirty={dirty}/>}
    {different&&<p className={styles.warning}>CURRENT CHAPTER BRAND OR FORMAT DIFFERS FROM THE SAVED FILM. Change it back or start a new sequence.</p>}
    {dirty&&<p className={styles.warning}>UNSAVED CHANGES IN CURRENT CHAPTER — press SAVE ACTIVE CHAPTER before switching.</p>}
    <label className={styles.field}>CHAPTER TITLE
      <input maxLength={100} value={chapterTitle} onChange={e=>setChapterTitle(e.target.value)} placeholder="e.g. 02 / The discovery"/>
    </label>
    <div className={styles.buttons}>
      <button type="button" disabled={busy||chapters.length>=MAX||different} onClick={addChapter}>＋ ADD CURRENT AS CHAPTER</button>
      <button type="button" disabled={busy||selected===null||different} onClick={saveChapter}>SAVE ACTIVE CHAPTER</button>
      <button type="button" disabled={busy||!chapters.length||chapters.length>=MAX||different} onClick={newChapter}>NEW CHAPTER →</button>
      <button type="button" disabled={!chapters.length||busy} className={styles.primary} onClick={exportFilm}>EXPORT FULL FILM MANIFEST ↓</button>
    </div>
    <div className={styles.utility}>
      <label>IMPORT FILM JSON
        <input type="file" accept=".json,application/json" disabled={busy}
          onChange={e=>{const f=e.target.files?.[0];e.target.value="";void importFilm(f);}}/>
      </label>
      <button type="button" onClick={()=>{void openDemo()}} disabled={busy}>✦ TRY 120s DEMO</button>
      <button type="button" onClick={resetFilm} disabled={busy||!chapters.length}>RESET SEQUENCE</button>
    </div>
    <p className={styles.notice} role="status">{notice}</p>
    <p className={styles.footnote}>Feature films are mastered with <code>npm run motion:sequence</code> on a workstation with Chromium and FFmpeg. The browser exports a genuine silent visual workprint (up to 192s) from our Canvas Engine; soundtrack, real footage and broadcast-quality full MP4 mastering remain part of the local Chromium/FFmpeg workflow. No OpenAI API needed. Keep private footage and client information out of public Chat Packs.</p>
  </section>;
}
