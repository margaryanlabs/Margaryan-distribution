"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BRAND_INFO, DEFAULT_VISUAL, sanitizeVisual,
  type MotionBrand, type MotionProject, type MotionVisualControls
} from "@/lib/motion/studio";
import {
  createChatMotionPack, createChatMotionPatch, previewChatMotionPack,
  type ChatOperatorPreview
} from "@/lib/motion/chat-operator";
import {
  approveLocalMedia, getLocalMedia, listLocalMedia, mediaAsFile,
  removeLocalMedia, saveLocalMedia,
  type LocalMediaRecord, type MediaRole
} from "@/lib/motion/local-media";
import styles from "./operator-desk.module.css";

type Props={
  project:MotionProject;
  selectedIndex:number;
  busy:boolean;
  onApplyProject:(next:MotionProject,reason:string)=>void;
  onScreenshot:(file:File)=>Promise<void>;
  onVoice:(file:File)=>void;
  onMusic:(file:File)=>void;
  onCreateBlank:()=>void;
};
const ROLES:MediaRole[]=["screenshot","image","logo","video","voice","music","sfx"];
const fmt=(n:number)=>n>1e6?(n/1e6).toFixed(1)+"MB":Math.round(n/1000)+"KB";
function saveText(name:string,content:string){
  const url=URL.createObjectURL(new Blob([content],{type:"application/json"}));
  const a=document.createElement("a");a.href=url;a.download=name;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
async function copy(value:string){
  if(!navigator.clipboard?.writeText)throw Error("Clipboard unavailable on this device. Download the JSON instead.");
  await navigator.clipboard.writeText(value);
}
export default function OperatorDesk({
  project,selectedIndex,busy,onApplyProject,onScreenshot,onVoice,onMusic,onCreateBlank
}:Props){
  const [tab,setTab]=useState<"chat"|"media"|"grade">("chat");
  const [source,setSource]=useState("");
  const [preview,setPreview]=useState<ChatOperatorPreview|null>(null);
  const [notice,setNotice]=useState("No API key or autonomous agent. Paste a Motion Chat Pack generated in ChatGPT and approve it.");
  const [undo,setUndo]=useState<MotionProject|null>(null);
  const [media,setMedia]=useState<LocalMediaRecord[]>([]);
  const [role,setRole]=useState<MediaRole>("screenshot");
  const [loading,setLoading]=useState(false);
  const [libraryError,setLibraryError]=useState("");
  const [selectedAsset,setSelectedAsset]=useState<string|null>(null);
  const [assetURL,setAssetURL]=useState<string|null>(null);
  const [dropActive,setDropActive]=useState(false);
  const visual=project.visual||DEFAULT_VISUAL;
  const selected=media.find(a=>a.id===selectedAsset)||null;
  const activeAssets=useMemo(()=>media.filter(a=>a.brand===project.brand),[media,project.brand]);
  const refresh=useCallback(async()=>{
    try{setMedia(await listLocalMedia());setLibraryError("");}
    catch(e){setLibraryError(e instanceof Error?e.message:String(e));}
  },[]);
  useEffect(()=>{void refresh();},[refresh]);
  useEffect(()=>{
    if(!selected){setAssetURL(null);return;}
    const url=URL.createObjectURL(selected.blob);
    setAssetURL(url);
    return()=>URL.revokeObjectURL(url);
  },[selected]);
  useEffect(()=>{setPreview(null);},[source,project]);
  function stagePack(){
    try{
      if(source.length<10||source.length>100_000)throw Error("Motion Chat Pack must be 10–100,000 characters");
      const value=JSON.parse(source);
      const result=previewChatMotionPack(value,project);
      setPreview(result);
      setNotice(result.action==="create"
        ?"Preview prepared. This will replace the current storyboard only after confirmation."
        :"Patch prepared. Review changed fields and approve to apply.");
    }catch(e){setPreview(null);setNotice("INVALID PACK: "+(e instanceof Error?e.message:String(e)));}
  }
  function applyPack(){
    if(!preview||busy)return;
    setUndo(project);
    onApplyProject(preview.next,preview.action==="create"?"Full Motion Chat Pack applied":"Motion Chat Patch applied");
    setPreview(null);
    setSource("");
    setNotice("Changes applied locally and saved as a project draft. Undo is available below.");
  }
  const libraryUpload=async(files:FileList|File[])=>{
    if(busy)return;
    setLoading(true);
    try{
      const chosen=Array.from(files).slice(0,8);
      if(!chosen.length)return;
      for(const file of chosen)await saveLocalMedia(file,project.brand,role);
      await refresh();
      setTab("media");setNotice(chosen.length+" file(s) saved in this browser only. Review ownership and mark each one APPROVED before using it.");
    }catch(e){setNotice("LOCAL MEDIA: "+(e instanceof Error?e.message:String(e)));}
    finally{setLoading(false);}
  };
  const useAsset=async(asset:LocalMediaRecord)=>{
    if(!asset.approved){setNotice("Review rights and mark APPROVED before using this media in a film.");return;}
    if(asset.brand!==project.brand){setNotice("This asset belongs to "+asset.brand+". Select that brand first.");return;}
    setLoading(true);
    try{
      const file=mediaAsFile(asset);
      if(["screenshot","image","logo"].includes(asset.role)){
        await onScreenshot(file);
        setNotice("Real source image loaded into selected Cinematic shot. Confirm crop and source accuracy.");
      }else if(asset.role==="voice"){
        onVoice(file);setNotice("Recorded voice attached to current film. Check length and start offset in the timeline.");
      }else if(asset.role==="music"){
        onMusic(file);setNotice("Licensed score attached. Listen to final audio mix before publishing.");
      }else{
        setNotice(asset.role==="video"
          ?"Video remains available for local preview. Use QUICK STUDIO or PROOF DIRECTOR for true moving footage; Cinematic cannot yet map this video directly to a shot."
          :"Sound effects are stored for review; a dedicated sound-effects track is not connected yet.");
      }
    }catch(e){setNotice(e instanceof Error?e.message:String(e));}
    finally{setLoading(false);}
  };
  const grade=(key:keyof MotionVisualControls,value:number)=>{
    const next=sanitizeVisual({...visual,[key]:value});
    onApplyProject({...project,visual:next},"Global film visual grade updated");
  };
  return <section className={styles.shell} aria-label="Chat operator and local media workspace">
    <div className={styles.head}><span>00 / PRODUCTION WORKSPACE</span><strong>CHAT → FILM</strong></div>
    <h2>Motion Operator.</h2>
    <p className={styles.dek}>Create without media, bring approved source files, or direct the existing film from ChatGPT. Everything is explicit, editable and keyless.</p>
    <div className={styles.tabRow} role="tablist" aria-label="Operator tools">
      {(["chat","media","grade"] as const).map(name=><button type="button"
        role="tab" aria-selected={tab===name} key={name}
        onClick={()=>setTab(name)}>{name==="chat"?"01 / CHAT PACK":name==="media"?"02 / MEDIA LIBRARY":"03 / VISUAL GRADE"}</button>)}
    </div>
    {tab==="chat"&&<div className={styles.contents}>
      <div className={styles.actionGrid}>
        <button type="button" disabled={busy} onClick={onCreateBlank}>◈ BUILD WITHOUT MATERIALS</button>
        <button type="button" onClick={()=>{void copy(JSON.stringify(createChatMotionPack(project),null,2))
          .then(()=>setNotice("Full Motion Chat Pack copied. Paste it into our ChatGPT conversation so I can edit your existing project."))
          .catch(e=>setNotice(String(e)));}}>COPY FULL PROJECT ↗</button>
        <button type="button" onClick={()=>saveText("motion-chat-project.json",JSON.stringify(createChatMotionPack(project),null,2)+"\n")}>DOWNLOAD CHAT PACK ↓</button>
        <button type="button" onClick={()=>{void copy(JSON.stringify(createChatMotionPatch(project,selectedIndex,{
          headline:project.scenes[selectedIndex]?.headline||"REPLACE WITH YOUR NEW HEADLINE"
        }),null,2)).then(()=>setNotice("Scene-specific patch template copied. Ask ChatGPT to modify its set fields."))
          .catch(e=>setNotice(String(e)));}}>COPY SHOT PATCH TEMPLATE</button>
      </div>
      <p className={styles.hint}>Paste the current Chat Pack in ChatGPT with your instructions. I return either a complete <code>create</code> film or a targeted <code>patch</code>. No API calls or agent. Paste the result below. Media files cannot travel inside JSON.</p>
      <label className={styles.label}>PASTE MOTION CHAT PACK / JSON
        <textarea spellCheck={false} rows={7} value={source}
          onChange={e=>setSource(e.target.value)}
          placeholder={'{\n  "protocol": "motion-chat-v1",\n  "action": "patch",\n  "expectedBrand": "promptence",\n  "expectedTitle": "EXACT PROJECT TITLE",\n  "changes": [{ "target": "scene", "index": 1, "set": { "headline": "A NEW MESSAGE." } }]\n}'}/>
      </label>
      <label className={styles.import}>IMPORT PACK FROM FILE
        <input type="file" accept=".json,application/json" disabled={busy}
          onChange={e=>{const f=e.currentTarget.files?.[0];e.currentTarget.value="";
            if(!f)return;
            if(f.size>100_000){setNotice("JSON over 100KB rejected.");return;}
            void f.text().then(text=>{setSource(text);setNotice("Pack loaded from file. Click PREVIEW to validate.");})
              .catch(e=>setNotice(String(e)));
          }}/>
      </label>
      <button className={styles.primary} type="button" disabled={busy||!source.trim()} onClick={stagePack}>
        INSPECT / PREVIEW CHANGES ↗
      </button>
      {preview&&<div className={styles.review}>
        <strong>{preview.action==="create"?"REPLACE FILM":"PATCH FILM"} / MANUAL APPROVAL</strong>
        <p>{preview.next.title} · {preview.next.brand} · {preview.next.scenes.length} scenes</p>
        {preview.changes.map((change,i)=><small key={i}>{change}</small>)}
        <div className={styles.buttons}>
          <button type="button" disabled={busy} className={styles.primary} onClick={applyPack}>APPLY APPROVED CHANGES</button>
          <button type="button" onClick={()=>setPreview(null)}>CANCEL</button>
        </div>
      </div>}
      {undo&&<button className={styles.undo} type="button" disabled={busy}
        onClick={()=>{onApplyProject(undo,"Previous storyboard restored");setUndo(null);setNotice("Previous project restored.");}}>
        ↶ UNDO LAST CHAT PACK
      </button>}
    </div>}
    {tab==="media"&&<div className={styles.contents}>
      <p className={styles.hint}>Private, browser-local library (IndexedDB). Nothing is uploaded. Local storage may be cleared by your browser; export originals separately. Approval means <b>you</b> verified rights, not that Motion has verified a license.</p>
      <label className={styles.label}>ASSET ROLE
        <select value={role} onChange={e=>setRole(e.target.value as MediaRole)}>
          {ROLES.map(x=><option value={x} key={x}>{x.toUpperCase()}</option>)}
        </select>
      </label>
      <div className={styles.dropzone} data-drop={dropActive}
        onDragOver={e=>{e.preventDefault();setDropActive(true);}}
        onDragLeave={()=>setDropActive(false)}
        onDrop={e=>{e.preventDefault();setDropActive(false);void libraryUpload(e.dataTransfer.files);}}>
        <b>+ DROP APPROVED MEDIA HERE</b>
        <span>Images · MP4/WebM/MOV · voice · licensed music · SFX</span>
        <label>SELECT FILES<input type="file" multiple disabled={loading||busy}
          accept={["video","music","voice","sfx"].includes(role)
            ?role==="video"?"video/mp4,video/webm,video/quicktime":"audio/*"
            :"image/png,image/jpeg,image/webp"}
          onChange={e=>{const files=e.target.files;if(files)void libraryUpload(files);e.target.value="";}}/></label>
      </div>
      {libraryError&&<div className={styles.alert} role="alert">{libraryError}</div>}
      <p className={styles.assetCount}>{activeAssets.length} FILES / {BRAND_INFO[project.brand].name} <button type="button" onClick={()=>void refresh()}>REFRESH</button></p>
      {activeAssets.length===0?<p className={styles.empty}>No local assets for this brand. Generate a concept film with no files, or add authentic media here.</p>:
      <div className={styles.assets}>{activeAssets.map(item=><article key={item.id} className={styles.asset} data-active={selectedAsset===item.id}>
        <button type="button" className={styles.assetTitle} onClick={()=>setSelectedAsset(item.id===selectedAsset?null:item.id)}>
          <b>{item.role.toUpperCase()} / {item.name}</b>
          <span>{fmt(item.size)} · {item.approved?"APPROVED":"NEEDS REVIEW"} ▾</span>
        </button>
        {selectedAsset===item.id&&<div className={styles.assetDetails}>
          {assetURL&&item.mime.startsWith("image/")&&<img src={assetURL} alt={"Source preview of "+item.name}/>}
          {assetURL&&item.mime.startsWith("video/")&&<video src={assetURL} controls playsInline preload="metadata" />}
          {assetURL&&item.mime.startsWith("audio/")&&<audio src={assetURL} controls preload="metadata" />}
          <label className={styles.approve}><input type="checkbox" checked={item.approved}
            onChange={e=>{void approveLocalMedia(item.id,e.target.checked).then(refresh)
              .catch(error=>setNotice(String(error)));}}/>
            I reviewed this material and have permission to use it.</label>
          <div className={styles.buttons}>
            <button type="button" disabled={loading||busy||!item.approved} onClick={()=>void useAsset(item)}>
              {["screenshot","image","logo"].includes(item.role)?"USE AS SOURCE SCREEN":
                item.role==="voice"?"ATTACH VOICE":item.role==="music"?"ATTACH SCORE":"PREVIEW ONLY"}
            </button>
            <button type="button" disabled={loading||busy} onClick={()=>{void removeLocalMedia(item.id)
              .then(()=>{setSelectedAsset(null);return refresh();})
              .catch(error=>setNotice(String(error)));}}>DELETE LOCAL COPY</button>
          </div>
        </div>}
      </article>)}</div>}
      <p className={styles.hint}>For real <b>moving video</b>, use Quick Studio or Proof Director. Cinematic Studio currently accepts a real still image per brand and voice/music tracks; it does not silently pretend a stored MP4 is part of its output.</p>
    </div>}
    {tab==="grade"&&<div className={styles.contents}>
      <p className={styles.hint}>Film-wide controls modify rendered Canvas frames and saved project JSON. Start with restrained changes. They work on legacy scenes too.</p>
      {([
        ["motion","MOTION / CAMERA ENERGY",0,1.5,.05],
        ["textScale","TYPOGRAPHY / SAFE SIZE",.75,1,.01],
        ["contrast","TONAL GRADE / LIGHT–DARK",0,1,.05],
        ["glow","AMBIENT LIGHT STRENGTH",0,1,.05]
      ] as Array<[keyof MotionVisualControls,string,number,number,number]>).map(([key,label,min,max,step])=><label className={styles.slider} key={key}>
        <span>{label}<strong>{visual[key].toFixed(2)}</strong></span>
        <input type="range" min={min} max={max} step={step} disabled={busy}
          value={visual[key]} onChange={e=>grade(key,Number(e.target.value))}/>
      </label>)}
      <div className={styles.buttons}>
        <button type="button" disabled={busy} onClick={()=>onApplyProject({...project,visual:{...DEFAULT_VISUAL}},"Visual grade reset")}>RESET GRADE</button>
        <button type="button" disabled={busy} onClick={()=>onApplyProject({...project,
          qualityMode:"signature",visual:sanitizeVisual({motion:.72,textScale:.98,contrast:.66,glow:.28})},"Signature restraint preset applied")}>
          APPLY SIGNATURE RESTRAINT
        </button>
      </div>
      <p className={styles.hint}>Visual grades do not magically create photographic footage or improve source resolution. Always inspect an exported film on a real phone.</p>
    </div>}
    <p className={styles.status} role="status">{notice}</p>
  </section>;
}
