"use client";

import { useEffect, useState } from "react";
import { type MotionProject } from "./studio";
import {
  VAULT_LIMIT, readLocalFilmVault, saveLocalFilmSnapshot,
  replaceLocalFilmSnapshot, deleteLocalFilmSnapshot,
  type LocalFilmSnapshot
} from "./local-project-vault";

/**
 * Named, manually saved Motion snapshots. No account/API and no media bytes.
 * Keeps independent projects instead of overwriting the single autosaved
 * current-film slot in Motion Studio. All writes are explicit.
 */
export default function LocalFilmVaultPanel({
  project, busy, onRestore
}:{
  project:MotionProject;
  busy:boolean;
  onRestore:(saved:MotionProject)=>void;
}){
  const [items,setItems]=useState<LocalFilmSnapshot[]>([]);
  const [selected,setSelected]=useState("");
  const [label,setLabel]=useState("");
  const [message,setMessage]=useState("Your saved films stay in this browser.");
  const [loaded,setLoaded]=useState(false);

  function refresh(){setItems(readLocalFilmVault(window.localStorage));}
  useEffect(()=>{
    try{refresh();}
    catch(e){setMessage("Local storage disabled: "+(e instanceof Error?e.message:String(e)));}
    setLoaded(true);
  },[]);
  useEffect(()=>{
    if(selected && !items.some(x=>x.id===selected))setSelected("");
  },[items,selected]);

  const current=items.find(item=>item.id===selected);
  const disabled=!loaded||busy;
  const box={border:"1px solid #334052",borderRadius:12,background:"linear-gradient(135deg,#111925,#0c1016)",padding:"18px",color:"#e5edf8"} as const;
  const btn={border:"1px solid #5e7698",background:"#24364b",color:"#ecf3ff",padding:"9px 12px",borderRadius:6,fontSize:11,cursor:"pointer",fontWeight:750} as const;
  const hint={fontSize:11,lineHeight:1.65,color:"#99aec7"} as const;
  const handle=(op:()=>void,ok:string)=>{
    try{op();refresh();setMessage(ok);}
    catch(err){setMessage("LOCAL VAULT: "+(err instanceof Error?err.message:String(err)));}
  };
  function save(){
    if(disabled)return;
    handle(()=>{
      const item=saveLocalFilmSnapshot(window.localStorage,project,label.trim()||project.title);
      setSelected(item.id);
      setLabel("");
    },"Film snapshot saved on this device. Original audio and media are NOT included.");
  }
  function replace(){
    if(disabled||!current)return;
    if(!window.confirm("Overwrite the selected saved snapshot with the current film? This cannot be undone."))return;
    handle(()=>{replaceLocalFilmSnapshot(window.localStorage,current.id,project);},
      "Saved snapshot updated. Video/audio assets are still device-local.");
  }
  function restore(){
    if(disabled||!current)return;
    if(!window.confirm("Load this film into Motion Studio? Your current unsaved edits will be replaced. Save a snapshot first if needed."))return;
    try{
      onRestore(current.project);
      setMessage("Restored "+current.name+". Verify locally linked images/music before exporting.");
    }catch(err){setMessage("Cannot load film: "+String(err));}
  }
  function remove(){
    if(disabled||!current)return;
    if(!window.confirm("Permanently delete '"+current.name+"' from this browser's saved films?"))return;
    const name=current.name;
    handle(()=>{deleteLocalFilmSnapshot(window.localStorage,current.id);setSelected("");},
      name+" deleted. Other projects remain unchanged.");
  }
  return <details style={{...box,marginBottom:22}}>
    <summary style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",gap:12,listStyle:"none"}}>
      <span style={{display:"flex",alignItems:"center",gap:11,flexWrap:"wrap"}}>
        <strong style={{fontSize:12,letterSpacing:".09em"}}>▣ LOCAL FILM VAULT</strong>
        <span style={{border:"1px solid #53677d",borderRadius:5,padding:"3px 7px",fontSize:10,color:"#b9d0ef"}}>
          {loaded?items.length+"/"+VAULT_LIMIT:"…"} FILMS
        </span>
      </span>
      <span style={{fontSize:10,color:"#b9cbe2"}}>SAVE / RESTORE ▾</span>
    </summary>
    <p style={{...hint,margin:"14px 0 16px"}}>Keep multiple named editable film projects without an account or extra API. Snapshots are stored only in this browser; licensed footage, logo files, and voice/music recordings are NOT copied into a snapshot. To move complete source files, use Motion Studio’s approved Portable Bundle.</p>
    <div style={{display:"flex",gap:9,flexWrap:"wrap",alignItems:"center"}}>
      <input aria-label="Name of new saved film" disabled={disabled} maxLength={80}
        value={label} placeholder={project.title.slice(0,55)}
        onChange={e=>setLabel(e.target.value)}
        style={{background:"#0b1320",border:"1px solid #4d627d",color:"#f2f6fa",padding:"9px 11px",borderRadius:6,minWidth:190,flex:"1 1 190px",fontSize:12}}/>
      <button type="button" disabled={disabled||items.length>=VAULT_LIMIT} style={btn} onClick={save}>＋ SAVE NEW FILM</button>
    </div>
    <div style={{borderTop:"1px solid #293849",margin:"15px 0"}}/>
    <label style={{display:"block",fontSize:10,fontWeight:700,letterSpacing:".1em",color:"#9eb3d0",marginBottom:7}}>SAVED PROJECTS / SELECT ONE</label>
    <select aria-label="Choose a saved film" disabled={disabled||!items.length} value={selected}
      onChange={e=>setSelected(e.target.value)}
      style={{width:"100%",background:"#111b29",border:"1px solid #53677e",color:"#edf2fa",padding:"11px 9px",borderRadius:6,fontSize:12}}>
      <option value="">Choose saved project…</option>
      {items.map(x=><option key={x.id} value={x.id}>
        {x.name.slice(0,65)} · {x.project.scenes.length} shots · {x.savedAt.slice(0,10)}
      </option>)}
    </select>
    {current&&<>
      <div style={{display:"flex",gap:9,flexWrap:"wrap",marginTop:12}}>
        <button type="button" disabled={disabled} style={btn} onClick={restore}>↗ LOAD FILM</button>
        <button type="button" disabled={disabled} style={btn} onClick={replace}>↻ REPLACE SNAPSHOT</button>
        <button type="button" disabled={disabled} style={{...btn,borderColor:"#775e65",color:"#ffc3c1"}} onClick={remove}>DELETE</button>
      </div>
      <p style={hint}>Saved: {new Date(current.savedAt).toLocaleString()} · {current.project.brand} · {current.project.format}. Loading a film never automatically attaches external media.</p>
    </>}
    <div role="status" aria-live="polite" style={{...hint,marginTop:10}}>{message}</div>
  </details>;
}
