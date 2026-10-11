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
import {
  createMotionBundle,inspectMotionBundle,restoreMotionBundle,
  type BundleReview
} from "@/lib/motion/project-bundle";
import styles from "./operator-desk.module.css";

type Props={
  project:MotionProject;
  selectedIndex:number;
  voiceFile:File|null;
  musicFile:File|null;
  busy:boolean;
  onApplyProject:(next:MotionProject,reason:string)=>void;
  onScreenshot:(file:File)=>Promise<void>;
  onSceneMedia:(mediaId:string,file:File)=>Promise<void>;
  onImageOverlay:(mediaId:string,file:File)=>Promise<void>;
  onVoice:(file:File)=>void;
  onMusic:(file:File)=>void;
  onCreateBlank:()=>void;
  onOpenQuick:(assetId:string)=>void;
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
  project,selectedIndex,busy,voiceFile,musicFile,onApplyProject,onScreenshot,onSceneMedia,onImageOverlay,onVoice,onMusic,onCreateBlank,onOpenQuick
}:Props){
  const [tab,setTab]=useState<"chat"|"media"|"grade"|"bundle">("chat");
  const [bundleBusy,setBundleBusy]=useState(false);
  const [archiveFile,setArchiveFile]=useState<File|null>(null);
  const [archiveReview,setArchiveReview]=useState<BundleReview|null>(null);
  const [rightsConfirmed,setRightsConfirmed]=useState(false);
  const [source,setSource]=useState("");
  const [inboxLoading,setInboxLoading]=useState(false);
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
  // Same-origin ChatGPT storyboard handoff. The fragment is never sent to
  // the server, removed immediately, and NEVER auto-applied to this project.
  useEffect(()=>{
    const prefix="#motion-chat-v1=";
    if(!window.location.hash.startsWith(prefix))return;
    const encoded=window.location.hash.slice(prefix.length);
    window.history.replaceState(window.history.state,"",window.location.pathname+window.location.search);
    try{
      if(encoded.length<10||encoded.length>15000||!/^[A-Za-z0-9_-]+$/.test(encoded))
        throw Error("Invalid or oversized ChatGPT film link");
      const binary=atob(encoded.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-encoded.length%4)%4));
      if(binary.length>12000)throw Error("Film Chat Pack is too large");
      const decoded=new TextDecoder("utf-8",{fatal:true}).decode(Uint8Array.from(binary,c=>c.charCodeAt(0)));
      const raw:unknown=JSON.parse(decoded);
      if(!raw||typeof raw!=="object"||(raw as Record<string,unknown>).protocol!=="motion-chat-v1")
        throw Error("Unsupported Chat Pack protocol");
      setTab("chat");setPreview(null);setSource(JSON.stringify(raw,null,2));
      // Editor V2 hides Chat Operator inside its media tab; remember one
      // successful handoff even if a child effect runs before the parent.
      try{window.sessionStorage.setItem("motion-short-handoff-unread","1");}catch{}
      window.dispatchEvent(new Event("motion-short-handoff"));
      setNotice("CHATGPT DRAFT RECEIVED. Press INSPECT / PREVIEW and APPROVE. No recording or project changes were made.");
    }catch(e){setNotice("CHATGPT DRAFT REJECTED: "+(e instanceof Error?e.message:String(e)));}
  },[]);
  async function loadPublicChatCut(){
    if(busy||inboxLoading)return;
    setInboxLoading(true);setPreview(null);
    try{
      // Public static build artifact updated through the connected GitHub
      // project by ChatGPT's authorized repository edits. No agent/API key
      // or media file access in the browser. Never use for private projects.
      const reply=await fetch("/motion/chat-ops/latest-public.json",{
        method:"GET",cache:"no-store",credentials:"same-origin"
      });
      if(!reply.ok)throw Error("No published public Chat cut (HTTP "+reply.status+").");
      const raw=await reply.text();
      if(raw.length>100_000)throw Error("Published pack exceeds 100KB limit");
      const payload=JSON.parse(raw);
      // Validate *before* adding remote-authored project to the editor.
      const candidate=previewChatMotionPack(payload,project);
      setSource(JSON.stringify(payload,null,2));
      setNotice("NEW PUBLIC CHAT CUT LOADED: "+candidate.next.title+
        " / "+candidate.next.scenes.length+" shots. Review the JSON, press INSPECT, then approve before applying. This public cut is not an unpublished private draft.");
    }catch(error){
      setNotice("PUBLIC CHAT CHANNEL: "+(error instanceof Error?error.message:String(error)));
    }finally{setInboxLoading(false);}
  }
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
  const useOverlay=async(asset:LocalMediaRecord)=>{
    if(!asset.approved){setNotice("Approve source rights before adding picture-in-picture.");return;}
    if(!["screenshot","image","logo"].includes(asset.role)){
      setNotice("Advanced image overlay accepts only original still PNG, JPEG and WebP, not video.");return;
    }
    if(busy||loading)return;
    setLoading(true);
    try{
      await onImageOverlay(asset.id,mediaAsFile(asset));
      setNotice("Independent approved image layer attached to shot "+(selectedIndex+1)+
        ". Adjust overlay corner, size, opacity and in/out in the Scene Inspector.");
    }catch(e){setNotice("OVERLAY: "+(e instanceof Error?e.message:String(e)));}
    finally{setLoading(false);}
  };
  const useAsset=async(asset:LocalMediaRecord)=>{
    if(!asset.approved){setNotice("Review rights and mark APPROVED before using this media in a film.");return;}
    if(asset.brand!==project.brand){setNotice("This asset belongs to "+asset.brand+". Select that brand first.");return;}
    setLoading(true);
    try{
      const file=mediaAsFile(asset);
      if(["screenshot","image","logo","video"].includes(asset.role)){
        await onSceneMedia(asset.id,file);
        setNotice("Approved "+(asset.role==="video"?"genuine moving video":"real source image")+
          " linked to Cinematic shot "+(selectedIndex+1)+". Preview, inspect crop and source coverage before exporting.");
      }else if(asset.role==="voice"){
        onVoice(file);setNotice("Recorded voice attached to current film. Check length and start offset in the timeline.");
      }else if(asset.role==="music"){
        onMusic(file);setNotice("Licensed score attached. Listen to final audio mix before publishing.");
      }else{
        setNotice("Sound effects are stored for review; a dedicated sound-effects track is not connected yet.");
      }
    }catch(e){setNotice(e instanceof Error?e.message:String(e));}
    finally{setLoading(false);}
  };
  const downloadBundle=async()=>{
    if(busy||bundleBusy)return;
    setBundleBusy(true);
    try{
      const blob=await createMotionBundle(project,voiceFile,musicFile);
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");a.href=url;
      a.download="motion-"+project.brand+"-"+Date.now()+".motionzip";
      document.body.appendChild(a);a.click();a.remove();
      window.setTimeout(()=>URL.revokeObjectURL(url),60_000);
      setNotice("PORTABLE PROJECT SAVED: "+fmt(blob.size)+
        ", including "+project.scenes.filter(s=>s.kind==="screen"&&s.mediaId).length+
        " approved real-media scenes and attached voice/music when present. Store the file privately.");
    }catch(error){setNotice("PORTABLE EXPORT FAILED: "+(error instanceof Error?error.message:String(error)));}
    finally{setBundleBusy(false);}
  };
  const inspectArchive=async(file:File)=>{
    setArchiveFile(null);setArchiveReview(null);setRightsConfirmed(false);
    if(busy||bundleBusy)return;
    setBundleBusy(true);
    try{
      const review=await inspectMotionBundle(file);
      setArchiveFile(file);setArchiveReview(review);
      setNotice("PRIVATE PORTABLE PROJECT INSPECTED. Review title, media count, and ownership before confirming local import.");
    }catch(error){setNotice("PORTABLE FILE REJECTED: "+(error instanceof Error?error.message:String(error)));}
    finally{setBundleBusy(false);}
  };
  const applyArchive=async()=>{
    if(!archiveFile||!archiveReview||!rightsConfirmed||busy||bundleBusy)return;
    setBundleBusy(true);
    try{
      const restored=await restoreMotionBundle(archiveFile,true);
      setUndo(project);
      // User explicitly approved the materials. This is a *local* restore.
      onApplyProject(restored.project,"Private portable production bundle imported");
      if(restored.voice)onVoice(restored.voice);
      if(restored.music)onMusic(restored.music);
      await refresh();
      setArchiveFile(null);setArchiveReview(null);setRightsConfirmed(false);
      setNotice("PROJECT RESTORED: "+restored.project.title+" / "+restored.restoredIds.length+
        " original source file(s) restored into this device's private library. Check the canvas and voice before exporting.");
    }catch(error){setNotice("PORTABLE IMPORT FAILED: "+(error instanceof Error?error.message:String(error)));}
    finally{setBundleBusy(false);}
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
      {(["chat","media","grade","bundle"] as const).map(name=><button type="button"
        role="tab" aria-selected={tab===name} key={name}
        onClick={()=>setTab(name)}>{name==="chat"?"01 / CHAT PACK":name==="media"?"02 / MEDIA LIBRARY":
          name==="grade"?"03 / VISUAL GRADE":"04 / PORTABLE FILM"}</button>)}
    </div>
    {tab==="chat"&&<div className={styles.contents}>
      <div className={styles.publicChatChannel}>
        <div><strong>CHATGPT → GITHUB → MOTION</strong><small>PUBLIC FILM CHANNEL / NO EXTRA AGENT</small></div>
        <p>Ask me in ChatGPT to publish an approved, public-facing brand storyboard. I can commit its JSON to this repository with your connected GitHub access. Motion then loads that cut from its own website — no manual JSON copying required. Always inspect and approve before applying.</p>
        <button type="button" onClick={()=>void loadPublicChatCut()} disabled={busy||inboxLoading}>
          {inboxLoading?"READING PUBLIC CHAT CUT…":"↓ LOAD LATEST PUBLIC CHAT CUT"}
        </button>
        <small>Never publish private scripts, client metrics, credentials or original media here. The JSON is served publicly; source files stay in your browser.</small>
      </div>
      <div className={styles.actionGrid}>
        <button type="button" disabled={busy} onClick={onCreateBlank}>◈ BUILD WITHOUT MATERIALS</button>
        <button type="button" onClick={()=>{
          const url=new URL("/api/mcp",window.location.origin).toString();
          void copy(url).then(()=>setNotice("MCP endpoint copied. External ChatGPT apps require a publicly reachable HTTPS host; protected Vercel previews cannot connect.")).catch(e=>setNotice(String(e)));
        }}>↗ COPY CHATGPT MCP ENDPOINT</button>
        <button type="button" onClick={()=>{void copy(JSON.stringify(createChatMotionPack(project),null,2))
          .then(()=>setNotice("Full Motion Chat Pack copied. Paste it into our ChatGPT conversation so I can edit your existing project."))
          .catch(e=>setNotice(String(e)));}}>COPY FULL PROJECT ↗</button>
        <button type="button" onClick={()=>saveText("motion-chat-project.json",JSON.stringify(createChatMotionPack(project),null,2)+"\n")}>DOWNLOAD CHAT PACK ↓</button>
        <button type="button" onClick={()=>{void copy(JSON.stringify(createChatMotionPatch(project,selectedIndex,{
          headline:project.scenes[selectedIndex]?.headline||"REPLACE WITH YOUR NEW HEADLINE"
        }),null,2)).then(()=>setNotice("Scene-specific patch template copied. Ask ChatGPT to modify its set fields."))
          .catch(e=>setNotice(String(e)));}}>COPY SHOT PATCH TEMPLATE</button>
      </div>
      <p className={styles.hint}>For private edits, paste the current Chat Pack in ChatGPT with your instructions. I return either a complete <code>create</code> film or a targeted <code>patch</code>. No API calls or agent. Paste the result below. Media files cannot travel inside JSON.</p>
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
                item.role==="voice"?"ATTACH VOICE":item.role==="music"?"ATTACH SCORE":
                item.role==="video"?"USE AS MOVING VIDEO SHOT":"PREVIEW ONLY"}
            </button>
            {["screenshot","image","logo"].includes(item.role)&&<button type="button"
              disabled={loading||busy||!item.approved} onClick={()=>void useOverlay(item)}>
              + ADD SECOND IMAGE LAYER
            </button>}
            {item.role==="video"&&<button type="button" disabled={loading||busy||!item.approved}
              onClick={()=>onOpenQuick(item.id)}>OPEN IN QUICK STUDIO</button>}
            <button type="button" disabled={loading||busy} onClick={()=>{void removeLocalMedia(item.id)
              .then(()=>{setSelectedAsset(null);return refresh();})
              .catch(error=>setNotice(String(error)));}}>DELETE LOCAL COPY</button>
          </div>
        </div>}
      </article>)}</div>}
      <p className={styles.hint}>Approved real video now attaches directly to the selected <b>Cinematic screen shot</b> with genuine decoded frames, adjustable source inpoint and export coverage checks. It can also be sent to the <b>first Quick Studio shot</b>. Media remains on your device. Exact offline MP4 rendering requires reattaching approved files with an explicit operator media map.</p>
    </div>}
    {tab==="bundle"&&<div className={styles.contents}>
      <div className={styles.portable}>
        <div className={styles.portableHead}><strong>PORTABLE PRODUCTION FILE</strong>
          <span>PROJECT + SOURCE + SOUND</span></div>
        <p>Save your entire film as one private <b>.motionzip</b> file: storyboard, camera settings,
          approved real screenshots/video clips, and the currently attached human voice and music.
          Move it between browsers and devices without relying on the old device's IndexedDB.
          No media uploads, external APIs, or automatic publishing.</p>
        <button type="button" className={styles.primary} disabled={busy||bundleBusy}
          onClick={()=>void downloadBundle()}>
          {bundleBusy?"PACKAGING LOCAL FILES…":"↓ EXPORT COMPLETE PORTABLE FILM"}
        </button>
        <small>This is a ZIP with original source media, not a compressed MP4.
          Protect it like your source footage. Maximum 128MB; large mobile clips may require a desktop.</small>
        <div className={styles.portableDivider}/>
        <label className={styles.label}>OPEN PORTABLE FILM / LOCAL FILE ONLY
          <input type="file" accept=".motionzip,.zip,application/zip" disabled={busy||bundleBusy}
            onChange={event=>{
              const picked=event.currentTarget.files?.[0];
              event.currentTarget.value="";
              if(picked)void inspectArchive(picked);
            }}/>
        </label>
        {archiveReview&&<div className={styles.bundleReview}>
          <strong>RESTORE / HUMAN APPROVAL REQUIRED</strong>
          <p>{archiveReview.title}</p>
          <small>{archiveReview.brand.toUpperCase()} · {archiveReview.shots} scenes ·
            {archiveReview.seconds.toFixed(1)}s · {archiveReview.assets} original media ·
            {archiveReview.hasVoice?"voice attached":"no voice"} ·
            {archiveReview.hasMusic?"score attached":"no score"} · {fmt(archiveReview.bytes)}</small>
          <label><input type="checkbox" checked={rightsConfirmed}
              onChange={e=>setRightsConfirmed(e.target.checked)}/>
            I own or have permission to use ALL bundled media and I approve restoring local source files.</label>
          <div className={styles.buttons}>
            <button type="button" disabled={!rightsConfirmed||bundleBusy||busy} className={styles.primary}
              onClick={()=>void applyArchive()}>
              {bundleBusy?"RESTORING…":"✓ IMPORT PROJECT AND APPROVED MEDIA"}
            </button>
            <button type="button" onClick={()=>{setArchiveFile(null);setArchiveReview(null);
              setRightsConfirmed(false);}}>CANCEL</button>
          </div>
        </div>}
        <p>Private imports generate fresh media identifiers to prevent overwriting existing
          library files. ZIP integrity is checked before any material is restored.
          The last project can be reverted, but you should still keep original files backed up.</p>
      </div>
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
