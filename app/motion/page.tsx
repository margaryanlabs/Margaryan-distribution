"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import {
  BRAND_INFO, FORMAT_SIZE, PROMPTENCE_BEATS, durationOf, makeMotionPreset,
  sanitizeMotionProject, sceneAt,
  type MotionBrand, type MotionFormat, type MotionProject, type MotionScene
} from "@/lib/motion/studio";
import { drawMotionFrame } from "@/lib/motion/render-engine";
import { preloadMotionLogo } from "@/lib/motion/brand-assets";
import { setLocalProductScreen, installOfflineScreen, hasProductScreen } from "@/lib/motion/screen-media";
import { PORTFOLIO, PORTFOLIO_BRANDS } from "@/lib/motion/portfolio";
import { auditMotionProject, inspectFramePixels, autoPolishMotionProject } from "@/lib/motion/quality";
import { reviewMotionVisuals } from "@/lib/motion/visual-review";
import { repairMotionProject, serializeRepair } from "@/lib/motion/auto-director";
import { createPromptenceSignature, createPromptenceCampaign } from "@/lib/motion/signature-promptence";
import { BEAT_LABELS, createPromptenceProductStory } from "@/lib/motion/promptence-beats";
import { compareFilmWithReference, summarizeReferenceComparison, type ReferenceComparison } from "@/lib/motion/reference-lab";
import { createCaptionBundle } from "@/lib/motion/captions";
import { rescaleProjectToSeconds } from "@/lib/motion/timing";
import { createProceduralSoundtrack, type ProceduralAudioSession } from "@/lib/motion/sound-engine";
import { makeProductionPack } from "@/lib/motion/production-pack";
import { sanitizeAudioEdit, voiceWindow } from "@/lib/motion/timeline-edit";
import { ensureSpatialRenderer, spatialStatus, spatialError } from "@/lib/motion/spatial-bridge";
import { createKeylessStoryboard, getLocalDirectorExamples, type MotionLanguage, type MotionStyle } from "@/lib/motion/director";
import QuickStudio from "./quick-studio";
import MultitrackEditor from "./multitrack-editor";
import PrecisionCutDesk from "./precision-cut-desk";
import FilmSequenceDesk from "./film-sequence-desk";
import VoiceBooth from "./voice-booth";
import OperatorDesk from "./operator-desk";
import { getLocalMedia, mediaAsFile } from "@/lib/motion/local-media";
import {
  getMotionSceneSource, registerMotionSceneSource, motionSourceIssues,
  prepareMotionSourceFrame, pauseMotionSourceVideos, syncMotionSourcePlayback,
  resetMotionPlaybackError, motionPlaybackError
} from "@/lib/motion/scene-source";
import styles from "./motion.module.css";

const STORAGE_KEY = "margaryan-motion-studio-v1";
const BRANDS: MotionBrand[] = PORTFOLIO_BRANDS;
const FORMATS: MotionFormat[] = ["portrait", "square", "landscape"];
const defaultBrief = "Создай кинематографический проморолик VETO Intelligence: сильная типографика, визуализация сигналов, глубокий тёмный фон, эффектные переходы и мощный финал. Без обещаний прибыли.";
function timeLabel(seconds: number) {
  return Math.floor(seconds / 60).toString().padStart(2, "0") + ":" + Math.floor(seconds % 60).toString().padStart(2, "0");
}
function downloadFile(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = name;
  document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export default function MotionStudioPage() {
  const [mode,setMode] = useState<"cinematic"|"quick">("cinematic");
  const [project, setProject] = useState<MotionProject>(() => makeMotionPreset());
  const [hydrated, setHydrated] = useState(false);
  const [brief, setBrief] = useState(defaultBrief);
  const [style, setStyle] = useState<MotionStyle>("cinematic");
  const [language, setLanguage] = useState<MotionLanguage>("auto");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [voiceover, setVoiceover] = useState<File | null>(null);
  const [licensedMusic, setLicensedMusic] = useState<File | null>(null);
  const [musicGain, setMusicGain] = useState(.5);
  const [narrationGain, setNarrationGain] = useState(.82);
  const [narrationSeconds, setNarrationSeconds] = useState<number | null>(null);
  const [musicSeconds, setMusicSeconds] = useState<number | null>(null);
  const [assetRevision, setAssetRevision] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [editorPanel,setEditorPanel]=useState<"create"|"media"|"scene"|"sound"|"look"|"review"|"deliver">("scene");
  const [featureOpen,setFeatureOpen]=useState(false);
  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [visualReviewing, setVisualReviewing] = useState(false);
  const [directorRepairing, setDirectorRepairing] = useState(false);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referenceComparing, setReferenceComparing] = useState(false);
  const [referenceComparison, setReferenceComparison] = useState<ReferenceComparison | null>(null);
  const previousDirectorProject = useRef<MotionProject | null>(null);
  const [exportProgress, setExportProgress] = useState(0);
  const [notice, setNotice] = useState("Собственный локальный движок: генерация сцен, графика и экспорт без API-ключей, кредитов и сервера рендеринга.");
  const previewRef = useRef<HTMLCanvasElement>(null);
  const voicePreviewRef = useRef<HTMLAudioElement|null>(null);
  const musicPreviewRef = useRef<HTMLAudioElement|null>(null);
  const latestProjectRef = useRef<MotionProject>(project);
  const timeRef = useRef(0);
  useEffect(()=>{
    const fromUrl=()=>setMode(new URLSearchParams(window.location.search).get("mode")==="quick"?"quick":"cinematic");
    fromUrl();
    window.addEventListener("popstate",fromUrl);
    return()=>window.removeEventListener("popstate",fromUrl);
  },[]);
  function switchMode(next:"cinematic"|"quick"){
    if(exporting)return;
    setPlaying(false);
    window.history.pushState({}, "", "/motion?mode="+next);
    setMode(next);
  }
  const total = durationOf(project);
  const audioEdit = sanitizeAudioEdit(project.audio);
  const narrationWindow = voiceWindow(total,audioEdit,narrationSeconds);
  const selected = project.scenes[Math.min(selectedIndex, project.scenes.length - 1)] || project.scenes[0];
  const info = BRAND_INFO[project.brand];
  const provenance = PORTFOLIO[project.brand];
  const qa = auditMotionProject(project);
  // Comparison statistics are always tied to the exact scene edit; they cannot
  // silently be treated as valid after changing a title, pacing or shot type.
  useEffect(()=>{latestProjectRef.current=project;setReferenceComparison(null);},[project]);

  // Browser persistence stores asset files privately. Rehydrate approved
  // per-scene footage after opening an existing JSON/Chat Pack project.
  useEffect(()=>{
    if(!hydrated)return;
    let cancelled=false;
    const ids=[...new Set(project.scenes.flatMap(x=>[
      ...(x.kind==="screen"&&x.mediaId?[x.mediaId]:[]),
      ...(x.overlayMediaId?[x.overlayMediaId]:[])
    ]))];
    void (async()=>{
      for(const id of ids){
        if(cancelled||getMotionSceneSource(id))continue;
        const record=await getLocalMedia(id);
        if(!record||!record.approved)continue;
        await registerMotionSceneSource(id,mediaAsFile(record));
        if(!cancelled)setAssetRevision(n=>n+1);
      }
    })().catch(error=>{
      if(!cancelled)setNotice("LOCAL SOURCE: "+(error instanceof Error?error.message:String(error)));
    });
    return()=>{cancelled=true;};
  },[hydrated,project.scenes]);

  useEffect(() => {
    if(!voiceover){setNarrationSeconds(null);return;}
    let active=true;
    const url=URL.createObjectURL(voiceover);
    const probe=new Audio();
    probe.preload="metadata";
    probe.onloadedmetadata=()=>{if(active&&Number.isFinite(probe.duration))setNarrationSeconds(probe.duration);};
    probe.onerror=()=>{if(active)setNarrationSeconds(null);};
    probe.src=url;
    return()=>{active=false;probe.src="";URL.revokeObjectURL(url);};
  },[voiceover]);

  useEffect(()=>{
    if(!licensedMusic){setMusicSeconds(null);return;}
    let active=true;
    const url=URL.createObjectURL(licensedMusic);
    const probe=new Audio();
    probe.preload="metadata";
    probe.onloadedmetadata=()=>{if(active&&Number.isFinite(probe.duration))setMusicSeconds(probe.duration);};
    probe.onerror=()=>{if(active)setMusicSeconds(null);};
    probe.src=url;
    return()=>{active=false;probe.src="";URL.revokeObjectURL(url);};
  },[licensedMusic]);

  // No remote media: local <audio> elements play imported tracks alongside
  // the canvas preview. This is a listening preview, not sample-accurate mastering.
  useEffect(()=>{
    if(!voiceover){voicePreviewRef.current=null;return;}
    const url=URL.createObjectURL(voiceover);
    const element=new Audio(url);
    element.preload="auto";
    voicePreviewRef.current=element;
    return()=>{
      element.pause();element.removeAttribute("src");element.load();
      if(voicePreviewRef.current===element)voicePreviewRef.current=null;
      URL.revokeObjectURL(url);
    };
  },[voiceover]);
  useEffect(()=>{
    if(!licensedMusic){musicPreviewRef.current=null;return;}
    const url=URL.createObjectURL(licensedMusic);
    const element=new Audio(url);
    element.preload="auto";
    musicPreviewRef.current=element;
    return()=>{
      element.pause();element.removeAttribute("src");element.load();
      if(musicPreviewRef.current===element)musicPreviewRef.current=null;
      URL.revokeObjectURL(url);
    };
  },[licensedMusic]);

  // Operator render bridge for deterministic offline masters (Playwright -> FFmpeg).
  // It does not read auth state, secrets, CRM data or arbitrary URLs. Canvas remains
  // local to this browser; exporting to disk requires the separate operator CLI.
  useEffect(() => {
    type FrameArgs = { project: unknown; time: number; format?: MotionFormat };
    type FrameHost = Window & {
      __motionFrame?: (input: FrameArgs) => Promise<string>;
      __motionInstallScreen?: (input: {brand:MotionBrand;mime:string;base64:string}) => Promise<void>;
      __motionInstallSceneFile?: (id:string)=>Promise<void>;
      __motionReview?: (input: {project:unknown}) => Promise<{
        project:MotionProject;report:ReturnType<typeof serializeRepair>;contactSheetBase64:string;
      }>;
    };
    const host = window as FrameHost;
    const renderCanvas = document.createElement("canvas");
    let renderContext: CanvasRenderingContext2D | null = null;
    host.__motionInstallScreen = async (input) => { await installOfflineScreen(input.brand,input.mime,input.base64); };
    host.__motionInstallSceneFile = async id=>{
      const chosen=document.querySelector<HTMLInputElement>("#__motion-offline-media-input")?.files?.[0];
      if(!chosen)throw Error("Offline media source missing: attach explicit local file.");
      await registerMotionSceneSource(id,chosen);
    };
    host.__motionReview = async input=>{
      const validated=sanitizeMotionProject(input.project);
      if(validated.scenes.some(scene=>scene.kind==="spatial"))await ensureSpatialRenderer();
      const result=await repairMotionProject(validated);
      const source=await new Promise<string>((resolve,reject)=>{
        const reader=new FileReader();
        reader.onload=()=>resolve(String(reader.result||""));
        reader.onerror=()=>reject(new Error("Contact sheet read failed"));
        reader.readAsDataURL(result.visual.sheet);
      });
      return {
        project:result.project,report:serializeRepair(result),
        contactSheetBase64:source.slice(source.indexOf(",")+1)
      };
    };
    host.__motionFrame = async (input: FrameArgs) => {
      const shot = sanitizeMotionProject(input.project);
      if(shot.scenes.some(scene=>scene.kind==="spatial"))await ensureSpatialRenderer();
      const dims = FORMAT_SIZE[shot.format];
      await preloadMotionLogo(shot.brand);
      if(shot.scenes.some(scene=>scene.kind==="screen"&&!scene.mediaId)&&!hasProductScreen(shot.brand))
        throw new Error("Legacy source screenshot missing; add --screen to offline master.");
      const missing=motionSourceIssues(shot);
      if(missing.length)throw Error(missing.join("; "));
      if (renderCanvas.width !== dims.width || renderCanvas.height !== dims.height) {
        renderCanvas.width = dims.width; renderCanvas.height = dims.height;
        renderContext = null;
      }
      if (!renderContext) renderContext = renderCanvas.getContext("2d", { alpha: false });
      if (!renderContext) throw new Error("Offline movie canvas is unavailable");
      const t = Number.isFinite(input.time) ? Math.max(0, Math.min(durationOf(shot), input.time)) : 0;
      await prepareMotionSourceFrame(shot,t);
      drawMotionFrame(renderContext, shot, t, dims.width, dims.height);
      return renderCanvas.toDataURL("image/png").slice("data:image/png;base64,".length);
    };
    return () => { delete host.__motionFrame; delete host.__motionInstallScreen;
      delete host.__motionInstallSceneFile; delete host.__motionReview; };
  }, []);


  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setProject(sanitizeMotionProject(JSON.parse(saved)));
    } catch { /* Ignore malformed local drafts. */ }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project)); }
    catch { setNotice("Local draft could not be saved in this browser."); }
  }, [project, hydrated]);

  useEffect(() => {
    let cancelled = false;
    void preloadMotionLogo(project.brand).then(() => { if(!cancelled)setAssetRevision(v=>v+1); });
    return () => { cancelled = true; };
  }, [project.brand]);

  const needsSpatial=project.scenes.some(scene=>scene.kind==="spatial");
  useEffect(()=>{
    if(!needsSpatial)return;
    let active=true;
    void ensureSpatialRenderer().then(()=>{
      if(active){setAssetRevision(v=>v+1);setNotice("3D ENGINE READY: real WebGL geometry, GSAP-directed deterministic motion and native export.");}
    }).catch(error=>{
      if(active)setNotice("3D ENGINE UNAVAILABLE: "+(error instanceof Error?error.message:String(error))+
        ". Select a 2D scene or enable WebGL before export.");
    });
    return()=>{active=false;};
  },[needsSpatial]);

  useEffect(() => {
    if (playing) return;
    const canvas = previewRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx){
      void prepareMotionSourceFrame(project,timeRef.current)
        .then(()=>{if(!playing)drawMotionFrame(ctx,project,timeRef.current,canvas.width,canvas.height);})
        .catch(error=>setNotice("PREVIEW SOURCE: "+(error instanceof Error?error.message:String(error))));
    }
  }, [project, playing, playhead, assetRevision, featureOpen]);

  useEffect(() => {
    if (!playing) {
      voicePreviewRef.current?.pause();
      musicPreviewRef.current?.pause();
      return;
    }
    const canvas = previewRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let raf = 0;
    let previous = performance.now();
    let lastUi = 0;
    function syncPreviewAudio(t:number){
      const a=project.audio;
      const edit=sanitizeAudioEdit(a);
      const voice=voicePreviewRef.current;
      if(voice&&voice.readyState>=HTMLMediaElement.HAVE_METADATA){
        const duration=voice.duration-edit.voiceTrim;
        const local=t-edit.voiceStart;
        if(duration>.05&&local>=0&&local<duration-.08){
          const sourceTime=edit.voiceTrim+local;
          if(Math.abs(voice.currentTime-sourceTime)>.22)voice.currentTime=sourceTime;
          const fadeIn=edit.voiceFadeIn>.01?Math.min(1,local/edit.voiceFadeIn):1;
          const fadeOut=edit.voiceFadeOut>.01?Math.min(1,(duration-local)/edit.voiceFadeOut):1;
          voice.volume=Math.max(0,Math.min(1,narrationGain*Math.min(fadeIn,fadeOut)));
          if(voice.paused)void voice.play().catch(()=>undefined);
        } else voice.pause();
      }
      const music=musicPreviewRef.current;
      if(music&&music.readyState>=HTMLMediaElement.HAVE_METADATA){
        const sourceLength=music.duration-edit.musicTrim;
        if(sourceLength>.1&&t<total){
          const sourceTime=edit.musicTrim+(t%sourceLength);
          if(Math.abs(music.currentTime-sourceTime)>.3)music.currentTime=sourceTime;
          const fadeIn=edit.musicFadeIn>.01?Math.min(1,t/edit.musicFadeIn):1;
          const fadeOut=edit.musicFadeOut>.01?Math.min(1,(total-t)/edit.musicFadeOut):1;
          music.volume=Math.max(0,Math.min(1,musicGain*(voiceover?.11:.32)*Math.min(fadeIn,fadeOut)));
          if(music.paused)void music.play().catch(()=>undefined);
        }else music.pause();
      }
    }
    syncPreviewAudio(timeRef.current);
    resetMotionPlaybackError();
    syncMotionSourcePlayback(project,timeRef.current,true);
    function frame(now: number) {
      const step = Math.min(.1, (now - previous) / 1000);
      previous = now;
      if (playing) {
        timeRef.current = Math.min(total, timeRef.current + Math.max(0, step));
        if (timeRef.current >= total) setPlaying(false);
      }
      syncMotionSourcePlayback(project,timeRef.current,true);
      if (canvas && ctx) drawMotionFrame(ctx, project, timeRef.current, canvas.width, canvas.height);
      if (now - lastUi > 120) {
        lastUi = now; setPlayhead(timeRef.current);
        syncPreviewAudio(timeRef.current);
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      voicePreviewRef.current?.pause();
      musicPreviewRef.current?.pause();
      pauseMotionSourceVideos();
    };
  }, [project, playing, total, narrationGain, musicGain, voiceover, licensedMusic]);

  function updateProject(next: MotionProject) {
    setProject(sanitizeMotionProject(next));
    if (timeRef.current > durationOf(next)) {
      timeRef.current = 0; setPlayhead(0);
    }
  }
  function jump(t: number) {
    timeRef.current = Math.max(0, Math.min(total, t));
    setPlayhead(timeRef.current);
  }
  function selectScene(index: number) {
    setSelectedIndex(index);
    jump(project.scenes.slice(0, index).reduce((sum, scene) => sum + scene.seconds, 0));
    setPlaying(false);
  }
  function editScene(field: keyof MotionScene, value: string | number) {
    updateProject({ ...project, scenes: project.scenes.map((scene, i) => i === selectedIndex ? { ...scene, [field]: value } : scene) });
  }
  function loadBrand(brand: MotionBrand) {
    setPlaying(false); jump(0); setSelectedIndex(0);
    setProject(makeMotionPreset(brand, project.format));
    setBrief(getLocalDirectorExamples(brand)[0]);
    setNotice("Loaded " + BRAND_INFO[brand].name + " template. Create a new keyless storyboard or edit any scene.");
  }
  function addScene() {
    if (project.scenes.length >= 8) return;
    const scenes: MotionScene[] = [...project.scenes, { id: "scene-" + (project.scenes.length + 1), kind: "statement", eyebrow: "NEXT CHAPTER", headline: "YOUR MESSAGE HERE.", support: "A short supporting sentence.", seconds: 4 }];
    updateProject({ ...project, scenes }); setSelectedIndex(scenes.length - 1); setPlaying(false);
    jump(project.scenes.reduce((sum, scene) => sum + scene.seconds, 0));
  }
  function removeScene() {
    if (project.scenes.length < 2) return;
    updateProject({ ...project, scenes: project.scenes.filter((_, i) => i !== selectedIndex) });
    setSelectedIndex(0); jump(0); setPlaying(false);
  }
  function moveScene(direction: -1 | 1) {
    const destination = selectedIndex + direction;
    if(destination<0 || destination>=project.scenes.length || exporting)return;
    const scenes = [...project.scenes];
    [scenes[selectedIndex],scenes[destination]]=[scenes[destination],scenes[selectedIndex]];
    updateProject({...project,scenes});
    setSelectedIndex(destination);setPlaying(false);
    jump(scenes.slice(0,destination).reduce((total,shot)=>total+shot.seconds,0));
    setNotice("Shot order updated. Timing, subtitles and transitions follow the new sequence.");
  }
  function duplicateScene() {
    if(project.scenes.length>=8 || exporting)return;
    const scenes=[...project.scenes];
    scenes.splice(selectedIndex+1,0,{...selected,id:"scene-copy"});
    updateProject({...project,scenes});
    setSelectedIndex(selectedIndex+1);setPlaying(false);
    jump(scenes.slice(0,selectedIndex+1).reduce((total,shot)=>total+shot.seconds,0));
    setNotice("Shot duplicated — modify the copy to avoid repetitive visuals.");
  }
  function loadSpatialDemo() {
    if(generating||exporting||directorRepairing)return;
    const demo=makeMotionPreset(project.brand,project.format);
    const interior=Math.max(0,Math.min(demo.scenes.length-2,Math.floor(demo.scenes.length/2)));
    const scenes=demo.scenes.map((scene,index)=>index===interior
      ? {...scene,kind:"spatial" as const,camera:"push" as const,
        intensity:.7,transition:"dissolve" as const}
      : scene);
    updateProject({...demo,title:demo.title+" / SPATIAL EDITION",scenes});
    setSelectedIndex(interior);
    setPlaying(false);
    jump(0);
    setNotice("SPATIAL DEMO: real 3D WebGL shot added at scene "+(interior+1)+
      ". Theme depends on brand. Select the spatial shot and inspect camera/transition controls.");
  }
  function generate() {
    if (generating || exporting) return;
    setGenerating(true);
    try {
      // No network access, API credentials or hosted models are needed.
      const next = createKeylessStoryboard({ prompt: brief, brand: project.brand, format: project.format, language, style });
      const finished = autoPolishMotionProject(next);
      setPlaying(false); jump(0); setSelectedIndex(0);
      setProject(finished.project);
      setNotice("Создано " + next.scenes.length + " сцен полностью в браузере. Можно редактировать и экспортировать видео.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not generate storyboard");
    } finally { setGenerating(false); }
  }

  async function compareReference():Promise<void> {
    if(!referenceFile||referenceComparing||exporting||directorRepairing||generating)return;
    setReferenceComparing(true);setPlaying(false);
    setNotice("REFERENCE LAB: locally decoding the reference and measuring eight paired moments. No file upload.");
    try{
      const originalSnapshot=JSON.stringify(project);
      if(needsSpatial)await ensureSpatialRenderer();
      const output=await compareFilmWithReference(project,referenceFile);
      if(JSON.stringify(latestProjectRef.current)!==originalSnapshot){
        setNotice("REFERENCE LAB: Project changed while frames were compared. Re-run comparison for the latest edit.");
        return;
      }
      setReferenceComparison(output);
      const report=summarizeReferenceComparison(output);
      downloadFile("motion-"+project.brand+"-vs-reference.png",output.contactSheet);
      downloadFile("motion-"+project.brand+"-reference-signals.json",
        new Blob([JSON.stringify(report,null,2)],{type:"application/json"}));
      setNotice("REFERENCE LAB / "+output.frames.length+" paired frames analysed. "+
        output.notes.slice(0,2).join(" · ")+" The reference is never copied into the film.");
    }catch(error){
      setReferenceComparison(null);
      setNotice("REFERENCE LAB: "+(error instanceof Error?error.message:"Cannot decode reference. Use browser-supported H.264 MP4."));
    }finally{setReferenceComparing(false);}
  }

  function loadPromptenceProductStory():void {
    if(generating||exporting||directorRepairing)return;
    const lang=language==="auto"
      ?(/\p{Script=Armenian}/u.test(brief)?"hy":/\p{Script=Cyrillic}/u.test(brief)?"ru":"en")
      :language;
    const story=createPromptenceProductStory(lang,project.format);
    setPlaying(false);jump(0);setSelectedIndex(0);
    setProject(story);
    setNotice("PRODUCT STORY / SIGNATURE: 8 directed shots from a library of ten distinct conceptual compositions. No fabricated provider responses or customer results. Review each scene, then export.");
  }
  function loadPromptenceSignature():void {
    if(generating||exporting||directorRepairing)return;
    const lang=language==="auto"
      ?(/\p{Script=Armenian}/u.test(brief)?"hy":/\p{Script=Cyrillic}/u.test(brief)?"ru":"en")
      :language;
    const signature=createPromptenceSignature(lang,project.format);
    setPlaying(false);jump(0);setSelectedIndex(0);
    setProject(signature);
    setBrief("PROMPTENCE / SIGNATURE CAMPAIGN — THE ANSWER IS THE NEW FRONT PAGE");
    setNotice("SIGNATURE FILM LOADED: 8 individually directed shots / "+durationOf(signature).toFixed(1)+
      " seconds / "+lang.toUpperCase()+". This is a conceptual film. No fabricated AI provider answers or brand performance data.");
  }

  function loadPromptenceCampaign():void {
    if(generating||exporting||directorRepairing)return;
    const lang=language==="auto"
      ?(/\p{Script=Armenian}/u.test(brief)?"hy":/\p{Script=Cyrillic}/u.test(brief)?"ru":"en")
      :language;
    const cut=createPromptenceCampaign(lang,project.format);
    setPlaying(false);jump(0);setSelectedIndex(0);
    setProject(cut);
    setBrief("PROMPTENCE / 2026 DIRECTOR'S CUT — THE ANSWER IS THE NEW FRONT PAGE");
    setNotice("2026 DIRECTOR'S CUT LOADED: 8 authored shots / "+durationOf(cut).toFixed(1)+
      " seconds / "+lang.toUpperCase()+". Concept interface only. Download/export in Cinematic mode. No fake customer results.");
  }

  async function runAutoDirector():Promise<void> {
    if(directorRepairing||visualReviewing||referenceComparing||exporting||generating)return;
    setDirectorRepairing(true);
    setPlaying(false);
    setNotice("DIRECTOR AUTOFIX: inspect shots, preserve multilingual copy, repair safe-area typography and composition, then verify again.");
    try {
      const previous=sanitizeMotionProject(project);
      if(needsSpatial)await ensureSpatialRenderer();
      const result=await repairMotionProject(previous);
      if(result.changes.length){
        previousDirectorProject.current=previous;
        updateProject(result.project);
        jump(0);
      }
      downloadFile("motion-"+project.brand+"-repair-audit.json",
        new Blob([JSON.stringify(serializeRepair(result),null,2)],{type:"application/json"}));
      downloadFile("motion-"+project.brand+"-verified-contact-sheet.png",result.visual.sheet);
      setNotice("DIRECTOR / "+result.status+": "+result.changes.length+
        " safe repairs in "+result.iterations.length+" verified passes. "+
        (result.remaining.length?result.remaining.slice(0,3).join(" · "):"No measured defects; creative and legal review still required.")+
        " Audit and final contact sheet downloaded.");
    }catch(error){
      setNotice("DIRECTOR AUTOFIX FAILED: "+(error instanceof Error?error.message:String(error)));
    }finally{setDirectorRepairing(false);}
  }

  async function exportVideo() {
    if (exporting || generating || directorRepairing || referenceComparing) return;
    const captureSupported = typeof HTMLCanvasElement !== "undefined" && "captureStream" in HTMLCanvasElement.prototype;
    if (!captureSupported || typeof MediaRecorder === "undefined") {
      setNotice("Your browser does not support canvas recording. Use current desktop Chrome or Edge for export.");
      return;
    }
    const types = (soundEnabled || Boolean(voiceover) || Boolean(licensedMusic))
      ? ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"]
      : ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"];
    const mimeType = types.find(type => MediaRecorder.isTypeSupported(type));
    if (!mimeType) { setNotice("No supported video recording format found. Use Chrome or Edge."); return; }
    if (!qa.pass) {
      setNotice("QUALITY GATE BLOCKED: " + qa.checks.filter(c=>c.severity==="block").map(c=>c.message).join("; "));
      return;
    }
    if(voiceover && narrationSeconds!==null && !narrationWindow.ready){
      setNotice("NARRATION TIMING: voice does not fit the current timeline. Review VOICE track controls in the Multi-track editor.");
      return;
    }
    if(licensedMusic && musicSeconds!==null && audioEdit.musicTrim>musicSeconds-.12){
      setNotice("MUSIC TIMING: trim removes the entire soundtrack. Move the source trim back.");
      return;
    }
    try{
      const sourceIssues=motionSourceIssues(project);
      if(sourceIssues.length)throw Error(sourceIssues.join(" / "));
      const checked=await reviewMotionVisuals(project);
      if(!checked.pass){
        const revised=await repairMotionProject(project);
        if(revised.changes.length){
          previousDirectorProject.current=sanitizeMotionProject(project);
          updateProject(revised.project);
          downloadFile("motion-"+project.brand+"-auto-repair-audit.json",
            new Blob([JSON.stringify(serializeRepair(revised),null,2)],{type:"application/json"}));
          downloadFile("motion-"+project.brand+"-repaired-review.png",revised.visual.sheet);
          setNotice("DIRECTOR repaired "+revised.changes.length+
            " measurable defects and verified again. Review the revised film, then press EXPORT again. "+
            (revised.remaining.length?revised.remaining.slice(0,2).join(" · "):""));
          return;
        }
        downloadFile("motion-"+project.brand+"-qa-review.png",checked.sheet);
        setNotice("FILM QA: Correct these issues before export: "+checked.warnings.join(" / "));
        return;
      }
    }catch(error){
      setNotice("FILM QA FAILED: "+(error instanceof Error?error.message:"Cannot render preview frames"));
      return;
    }
    setPlaying(false); setExporting(true); setExportProgress(0);
    setNotice("Recording frames in real time. Keep this browser tab visible until export is complete.");
    const { width, height } = FORMAT_SIZE[project.format];
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) { setExporting(false); setNotice("Canvas renderer could not start."); return; }
    let stream: MediaStream | null = null;
    let audioSession: ProceduralAudioSession | null = null;
    let raf = 0;
    let recorder: MediaRecorder | null = null;
    resetMotionPlaybackError();
    try {
      await preloadMotionLogo(project.brand);
      if(needsSpatial)await ensureSpatialRenderer();
      // Check representative actual rendered frames, not only scene JSON.
      let cursor = 0;
      for (const scene of project.scenes) {
        const candidate = cursor + scene.seconds * .5;
        await prepareMotionSourceFrame(project,candidate);
        drawMotionFrame(ctx, project, candidate, width, height);
        const thumbnail = document.createElement("canvas");
        thumbnail.width = 180;
        thumbnail.height = Math.round(180 * height / width);
        const thumbCtx = thumbnail.getContext("2d", { willReadFrequently: true });
        if (!thumbCtx) throw new Error("QA canvas unavailable");
        thumbCtx.drawImage(canvas, 0, 0, thumbnail.width, thumbnail.height);
        const sample = thumbCtx.getImageData(0,0,thumbnail.width,thumbnail.height);
        const check = inspectFramePixels(sample.data, sample.width, sample.height);
        if (!check.valid) throw new Error("Video QA blocked scene: " + check.reason);
        cursor += scene.seconds;
      }
      stream = canvas.captureStream(30);
      if (soundEnabled || voiceover || licensedMusic) {
        // Explicit operator-owned audio only. No synthetic narration is claimed.
        audioSession = await createProceduralSoundtrack(project, {
          voiceover, music: licensedMusic, synth: soundEnabled,
          musicGain, narrationGain
        });
        stream.addTrack(audioSession.track);
      }
      await prepareMotionSourceFrame(project,0);
      drawMotionFrame(ctx, project, 0, width, height);
      recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
      const chunks: BlobPart[] = [];
      const currentRecorder = recorder;
      await new Promise<void>((resolve, reject) => {
        currentRecorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
        currentRecorder.onerror = () => reject(new Error("Video encoder failed"));
        currentRecorder.onstop = () => resolve();
        currentRecorder.start(1000);
        audioSession?.start();
        syncMotionSourcePlayback(project,0,true);
        const began = performance.now();
        function render(now: number) {
          if (currentRecorder.state !== "recording") return;
          const seconds = Math.min(total, (now - began) / 1000);
          syncMotionSourcePlayback(project,seconds,true);
          if(motionPlaybackError()){currentRecorder.stop();return;}
          if (ctx) drawMotionFrame(ctx, project, seconds, width, height);
          setExportProgress(Math.min(100, Math.round(seconds / total * 100)));
          if (seconds >= total) currentRecorder.stop();
          else raf = requestAnimationFrame(render);
        }
        raf = requestAnimationFrame(render);
      });
      if(motionPlaybackError())throw Error("Real-source video export blocked: "+motionPlaybackError());
      if (!chunks.length) throw new Error("Recorder returned an empty video. Try a different browser.");
      const ext = mimeType.includes("mp4") ? "mp4" : "webm";
      const blob = new Blob(chunks, { type: mimeType });
      downloadFile("margaryan-motion-" + project.brand + "-" + project.format + "." + ext, blob);
      setNotice("Video rendered locally: " + ext.toUpperCase() + ", " + width + " × " + height + (audioSession && voiceover ? " + narration" : "") + (audioSession && soundEnabled ? " + synth soundtrack" : "") + (licensedMusic?" + licensed music":"") + ". No external upload.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Render failed");
    } finally {
      cancelAnimationFrame(raf);
      if (recorder && recorder.state !== "inactive") recorder.stop();
      stream?.getTracks().forEach(track => track.stop());
      pauseMotionSourceVideos();
      if (audioSession) await audioSession.close();
      setExporting(false);
    }
  }
  function saveJson() {
    downloadFile("motion-project.json", new Blob([JSON.stringify(project, null, 2)], { type: "application/json" }));
  }
  async function importJson(file?: File) {
    if (!file) return;
    try {
      if (file.size > 150_000) throw new Error("Project file is too large");
      const restored = sanitizeMotionProject(JSON.parse(await file.text()));
      setProject(restored); setSelectedIndex(0); jump(0); setPlaying(false);
      setNotice("Structured project imported successfully.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Invalid project file"); }
  }

  const formatSize = FORMAT_SIZE[project.format];
  const previewWidth = project.format === "landscape" ? 900 : 660;
  const previewHeight = Math.round(previewWidth * formatSize.height / formatSize.width);
  const activeIndex = sceneAt(project, playhead).index;

  useEffect(()=>{
    const handler=(event:KeyboardEvent)=>{
      if(event.defaultPrevented||event.ctrlKey||event.metaKey||!event.altKey)return;
      if(["INPUT","TEXTAREA","SELECT"].includes((event.target as HTMLElement)?.tagName))return;
      const panels=["create","media","scene","sound","look","review","deliver"] as const;
      const index=Number(event.key);
      if(index>=1&&index<=7){event.preventDefault();setFeatureOpen(false);setEditorPanel(panels[index-1]);}
    };
    window.addEventListener("keydown",handler);
    return()=>window.removeEventListener("keydown",handler);
  },[]);
  const modePicker=<nav className={styles.productionModes} aria-label="Production pipeline">
    <button type="button" data-selected={mode==="cinematic"} aria-pressed={mode==="cinematic"}
      onClick={()=>switchMode("cinematic")} disabled={exporting}>
      <strong>01 / CINEMATIC STUDIO</strong>
      <span>Original Motion renderer · scenes · references · offline H.264 master</span>
    </button>
    <button type="button" data-selected={mode==="quick"} aria-pressed={mode==="quick"}
      onClick={()=>switchMode("quick")} disabled={exporting}>
      <strong>02 / QUICK STUDIO</strong>
      <span>Real video / photo imports · Armenian-first titles · local video export</span>
    </button>
    <a className={styles.proofLaunch} href="/motion/proof"><strong>03 / PROOF DIRECTOR ↗</strong><span>Real Promptence pixels · 10-second source-first pilot · quality gate</span></a>
  </nav>;
  if(mode==="quick")return <main className={styles.root} style={{"--brand-accent":info.accent} as CSSProperties}>
    <header className={styles.header}>
      <div>
        <p className={styles.kicker}>MARGARYAN LABS / CINEMA & POSTPRODUCTION / QUICK STUDIO</p>
        <h1>Motion <em>Studio.</em></h1>
        <p className={styles.deck}>Real footage, original screenshots and local publishing. Build short cuts here, or switch to Cinematic for chapter-based feature films and editorial control.</p>
      </div>
      <div className={styles.headerRight}><span className={styles.liveDot}/> QUICK / LOCAL MEDIA</div>
    </header>
    {modePicker}
    <QuickStudio/>
  </main>;
  return <main className={styles.root} style={{ "--brand-accent": info.accent } as CSSProperties}>
    <header className={styles.header}>
      <div>
        <p className={styles.kicker}>MARGARYAN LABS / CINEMA & POSTPRODUCTION / MOTION OS PRO</p>
        <h1>Motion <em>Studio.</em></h1>
        <p className={styles.deck}>Direct films from the first frame to the final cut. One creative workspace for source footage, scene editing, human narration, and chapter-based long-form production.</p>
      </div>
      <div className={styles.headerRight}>
        <span className={styles.liveDot}/> KEYLESS / LOCAL ENGINE
        <a href="/motion/commission">Sell a film / client brief ↗</a>
        <a href="/smm">Marketing Command ↗</a>
      </div>
    </header>

    {modePicker}
    <div className={styles.editorProjectBar} aria-label="Current motion production">
      <div className={styles.editorProjectTitle}>
        <span className={styles.barStudioTag}>MOTION / EDITOR</span>
        <strong title={project.title}>{project.title}</strong>
        <small>{info.name} <i>·</i> {project.format.toUpperCase()} <i>·</i> {project.scenes.length} SHOTS <i>·</i> {timeLabel(total)}</small>
      </div>
      <div className={styles.barUtilities}>
        <span className={styles.privacyChip}>● LOCAL / NO API CREDIT</span>
        <button type="button" className={featureOpen?styles.barActive:""}
          onClick={()=>{setPlaying(false);setFeatureOpen(v=>!v);}}
          aria-pressed={featureOpen}>◫ FEATURE FILM</button>
        <a href="/motion/commission">CLIENT PROJECTS ↗</a>
      </div>
    </div>
    <div className={styles.notice} role="status">{notice}</div>
    {featureOpen&&<div id="film-sequence" className={styles.featureWorkspace}>
      <div className={styles.featureBack}>
        <span>FEATURE FILM / CHAPTER ASSEMBLY</span>
        <button type="button" onClick={()=>setFeatureOpen(false)}>← BACK TO EDITOR</button>
      </div>
      <FilmSequenceDesk project={project}
        busy={exporting||generating||directorRepairing||visualReviewing}
        onLoadProject={(next,reason)=>{
          setPlaying(false);updateProject(next);setSelectedIndex(0);jump(0);
          setFeatureOpen(false);setEditorPanel("scene");
          setNotice(reason+". Chapter loaded in the director. Verify source coverage and final audio.");
        }}/>
    </div>}
    {!featureOpen&&
    <div className={styles.workspace} id="motion-storyboard">
      <nav className={styles.editorRail} aria-label="Editor workspaces">
        {([
          ["create","✦","CREATE","Concept and storyboard"],
          ["media","▧","ASSETS","Original video and Chat Pack"],
          ["scene","◈","SCENE","Selected shot properties"],
          ["sound","♫","AUDIO","Human voice and score"],
          ["look","◐","LOOK","Format and film presentation"],
          ["review","◇","REVIEW","Evidence and visual quality"],
          ["deliver","↥","EXPORT","Delivery and project files"]
        ] as const).map(([panel,icon,label,desc],i)=><button key={panel} type="button"
          className={editorPanel===panel?styles.railCurrent:""}
          aria-current={editorPanel===panel?"page":undefined}
          aria-label={label+" – "+desc+" (Alt+"+(i+1)+")"}
          title={desc+" · Alt+"+(i+1)}
          onClick={()=>{
            setEditorPanel(panel);
            if(window.matchMedia("(max-width: 850px)").matches)
              requestAnimationFrame(()=>document.getElementById("motion-inspector")?.scrollIntoView({behavior:"smooth",block:"start"}));
            else document.getElementById("motion-inspector-scroll")?.scrollTo({top:0});
          }}>
            <span className={styles.railIcon} aria-hidden="true">{icon}</span>
            <span className={styles.railLabel}>{label}</span>
          </button>)}
        <div className={styles.railFoot} title="Film assets remain in this browser">PRIVATE<br/>LOCAL</div>
      </nav>
      <section className={styles.sidebar} id="motion-inspector" aria-label="Creative director inspector">
        <div className={styles.inspectorHeader}>
          <div><span>INSPECTOR / {editorPanel.toUpperCase()}</span>
            <strong>{({
              create:"Creative brief",media:"Source library",
              scene:"Shot "+String(selectedIndex+1).padStart(2,"0")+" / "+project.scenes.length,
              sound:"Audio studio",look:"Film presentation",
              review:"Quality review",deliver:"Production delivery"
            })[editorPanel]}</strong>
          </div>
          <small>ALT + {["create","media","scene","sound","look","review","deliver"].indexOf(editorPanel)+1}</small>
        </div>
        <div id="motion-inspector-scroll" className={styles.inspectorScroll}>
        {editorPanel==="deliver"&&<div className={styles.deliverIntro}>
          <strong>Ready for the final cut?</strong>
          <p>Export your video from the delivery tray under the preview.
            Run quality checks before using footage or music in a commercial.</p>
          <div><span>{qa.blockers===0?"✓":"!"} Structure {qa.blockers===0?"ready":qa.blockers+" blockers"}</span>
          <span>{project.scenes.length} shots / {timeLabel(total)}</span></div>
          <button type="button" className={styles.deliverPrimary}
            disabled={exporting||generating} onClick={()=>void exportVideo()}>
            {exporting?"RENDERING "+exportProgress+"%":qa.pass?"RUN QA & EXPORT VIDEO ↗":"REVIEW QA BLOCKERS ↗"}
          </button>
          <button type="button" className={styles.deliverSecondary}
            onClick={saveJson}>↓ SAVE EDITABLE PROJECT</button>
          <button type="button" className={styles.deliverSecondary}
            onClick={()=>setEditorPanel("review")}>◈ OPEN FRAME & EVIDENCE REVIEW</button>
        </div>}
        <div className={styles.panelSection} hidden={editorPanel!=="media"}>
        <OperatorDesk project={project} selectedIndex={selectedIndex}
          voiceFile={voiceover} musicFile={licensedMusic}
          busy={exporting||generating||directorRepairing||visualReviewing}
          onApplyProject={(next,reason)=>{
            setPlaying(false);updateProject(next);setSelectedIndex(0);jump(0);
            setNotice(reason+". Changes are local and editable; approved materials stay on this device.");
          }}
          onCreateBlank={()=>{
            const draft=project.brand==="promptence"
              ?createPromptenceProductStory(project.language||"ru",project.format)
              :makeMotionPreset(project.brand,project.format);
            setPlaying(false);setSelectedIndex(0);jump(0);setProject(draft);
            setSoundEnabled(true);
            setNotice("CREATED FROM ZERO: editable brand storyboard and local original synth soundtrack. No media, API key, neural video generation or fake evidence was required.");
          }}
          onImageOverlay={async (mediaId,file)=>{
            const decoded=await registerMotionSceneSource(mediaId,file);
            if(decoded.type!=="image")throw Error("A separate overlay must be a genuine still image");
            updateProject({...project,scenes:project.scenes.map((scene,index)=>
              index===selectedIndex?{...scene,overlayMediaId:mediaId,
                overlayCorner:"bottom-right",overlayStart:0,
                overlayDuration:scene.seconds,overlayOpacity:.95,overlaySize:.3}:scene)});
            setAssetRevision(n=>n+1);setPlaying(false);
            setNotice("Approved picture-in-picture image attached to shot "+(selectedIndex+1)+". Review size, position and evidence.");
          }}
          onSceneMedia={async (mediaId,file)=>{
            const loaded=await registerMotionSceneSource(mediaId,file);
            updateProject({...project,scenes:project.scenes.map((scene,index)=>
              index===selectedIndex?{...scene,kind:"screen",mediaId,mediaStart:0,productBeat:undefined}:scene)});
            setAssetRevision(n=>n+1);
            setPlaying(false);
            setNotice((loaded.type==="video"?"REAL VIDEO":"REAL SOURCE IMAGE")+" linked to shot "+(selectedIndex+1)+
              ". Check source coverage and original frame authenticity before publishing.");
          }}
          onScreenshot={async file=>{
            await setLocalProductScreen(project.brand,file);
            setAssetRevision(value=>value+1);
            updateProject({...project,scenes:project.scenes.map((scene,index)=>
              index===selectedIndex?{...scene,kind:"screen",productBeat:undefined}:scene)});
            setNotice("Approved source image assigned to shot "+(selectedIndex+1)+
              ". Check visual crop. Local file is not contained in JSON or portable to another device.");
          }}
          onVoice={file=>{setVoiceover(file);setNotice("Local recorded voice attached; review narration placement in Edit Suite.");}}
          onMusic={file=>{setLicensedMusic(file);setNotice("Local licensed music attached; review volume and fades.");}}
          onOpenQuick={assetId=>{
            window.localStorage.setItem("motion-quick-pending-asset-v1",assetId);
            switchMode("quick");
          }}
        />
        </div>
        <div className={styles.panelSection} hidden={editorPanel!=="create"}>
        <div className={styles.sectionHeader}><span>01 / CREATIVE BRIEF</span><strong>LOCAL DIRECTOR</strong></div>
        <label className={styles.field}><span>PRODUCT / BRAND</span>
          <select value={project.brand} onChange={event => loadBrand(event.target.value as MotionBrand)}>
            {BRANDS.map(brand => <option key={brand} value={brand}>{BRAND_INFO[brand].name}</option>)}
          </select>
        </label>
        <div className={styles.provenance}>
          <b>BRAND SOURCE / {provenance.logoStatus === "source-verified" ? "MARK VERIFIED" : "NEEDS LOGO"}</b>
          <span>{provenance.repository || "No connected repository confirmed"}</span>
          <small>{provenance.product}</small>
        </div>
        <label className={styles.field}><span>DESCRIBE THE FILM</span>
          <textarea value={brief} maxLength={2000} onChange={event => setBrief(event.target.value)} rows={6}/>
        </label>
        <div className={styles.creatorOptions}>
          <label className={styles.field}><span>MOTION LANGUAGE</span>
            <select value={language} onChange={event => setLanguage(event.target.value as MotionLanguage)}>
              <option value="auto">Detect from brief</option><option value="ru">Русский</option>
              <option value="en">English</option><option value="hy">Հայերեն</option>
            </select>
          </label>
          <label className={styles.field}><span>DIRECTOR STYLE</span>
            <select value={style} onChange={event => setStyle(event.target.value as MotionStyle)}>
              <option value="cinematic">Cinematic</option><option value="kinetic">Kinetic Type</option>
              <option value="technical">Technical / Data</option>
            </select>
          </label>
        </div>
        <div className={styles.exampleRow}>
          <span>QUICK START</span>
          <button type="button" onClick={() => setBrief(getLocalDirectorExamples(project.brand)[0])}>EN</button>
          <button type="button" onClick={() => setBrief(getLocalDirectorExamples(project.brand)[1])}>RU</button>
          <button type="button" onClick={() => setBrief(getLocalDirectorExamples(project.brand)[2])}>HY</button>
        </div>
        <button className={styles.heroButton} onClick={generate} disabled={generating || exporting || brief.trim().length < 6}>
          {generating ? "DIRECTING…" : "CREATE FILM / NO API KEY ↗"}
        </button>
        <button className={styles.spatialDemoButton} type="button" onClick={loadSpatialDemo}
          disabled={generating||exporting||directorRepairing}>
          ◈ LOAD 3D / SPATIAL BRAND FILM
        </button>
        <p className={styles.hint}>Own procedural motion director: language-aware storyboard + animated graphics. Write “3D” / “WebGL” in a brief to include a real spatial shot automatically. Not a generative neural video model.</p>
        {project.brand==="promptence"&&<div className={styles.productStoryLaunch}>
          <div className={styles.productionDeskHead}><strong>PROMPTENCE / PRODUCT CINEMA</strong><span>10 CONCEPT SCENES</span></div>
          <p>Buyer asks AI → conceptual answer → visibility gap → source evidence → diagnostics → priorities → approval → implementation → remeasurement → brand close. This does not fabricate AI-provider results.</p>
          <button type="button" disabled={exporting||generating||directorRepairing}
            onClick={loadPromptenceProductStory}>▶ CREATE PRODUCT STORY / 8 CURATED SHOTS</button>
          <small>Choose any of the ten compositions in Scene Inspector after loading. Product screen recordings must be owner-approved separately.</small>
        </div>}
        <div className={styles.signatureShowcase}>
          <div><b>DIRECTOR'S EDITION / PROMPTENCE</b><span>SIGNATURE CAMPAIGN · 8 AUTHORED SHOTS · EN/RU/HY</span></div>
          <strong>THE ANSWER IS<br/>THE NEW FRONT PAGE.</strong>
          <p>One deliberate narrative: buyer question → the missing brand → observable evidence → prioritized action → remeasurement.</p>
          <button type="button" disabled={generating||exporting||directorRepairing}
            onClick={loadPromptenceSignature}>▶ LOAD ORIGINAL / 33.8 SEC</button>
          <button type="button" disabled={generating||exporting||directorRepairing}
            onClick={loadPromptenceCampaign}>▶ PROMPTENCE CAMPAIGN / 36.5 SEC</button>
          <small>Original film grammar and approved Promptence SVG. Illustrative data motifs are never real provider results.</small>
        </div>

        </div>
        <div className={styles.panelSection} hidden={editorPanel!=="look"}>
        <div className={styles.sectionHeader}><span>02 / FORMAT</span><strong>OUTPUT</strong></div>
        <div className={styles.segment}>
          {FORMATS.map(format => <button key={format} type="button" aria-pressed={project.format === format} className={project.format === format ? styles.active : ""} onClick={() => updateProject({ ...project, format })}>
            {format === "portrait" ? "9:16" : format === "square" ? "1:1" : "16:9"}
          </button>)}
        </div>
        <div className={styles.specs}><span>RESOLUTION</span><b>{formatSize.width} × {formatSize.height}</b></div>
        <div className={styles.specs}><span>RUN TIME</span><b>{timeLabel(total)} / {project.scenes.length} scenes</b></div>
        <div className={styles.specs}><span>RENDER</span><b>LOCAL · 30 FPS</b></div>
        <div className={styles.specs}><span>GENERATION COST</span><b>0 CREDITS · NO KEYS</b></div>
        <label className={styles.field}><span>RENDER QUALITY / EDITORIAL LANGUAGE</span>
          <select value={project.qualityMode||"basic"}
            onChange={event=>updateProject({...project,qualityMode:event.target.value as "basic"|"premium"|"signature"})}>
            <option value="basic">Basic / established cuts</option>
            <option value="premium">Premium / restrained product pacing</option>
            <option value="signature">Signature / authored cinema transitions</option>
          </select>
        </label>
        <p className={styles.hint}>Quality modes change actual transition timing and selection; they do not claim to increase physical video resolution or guarantee advertising quality.</p>
        <label className={styles.field}><span>FILM CHROME / BRAND VS DEBUG</span>
          <select value={project.filmChrome||"brand"} disabled={exporting}
            onChange={event=>updateProject({...project,
              filmChrome:event.target.value as "clean"|"brand"|"editor"})}>
            <option value="clean">Clean cinematic / nothing overlaid</option>
            <option value="brand">Signature brand / quiet mark on first and last shot</option>
            <option value="editor">Editorial review / internal technical overlay</option>
          </select>
        </label>
        <p className={styles.hint}>Commercial exports no longer need to expose debug labels, clip counters or the Motion Engine footer. Use EDITOR only while reviewing.</p>
        </div>
        <div className={styles.panelSection} hidden={editorPanel!=="sound"}>
        <label className={styles.audioToggle}>
          <input type="checkbox" checked={soundEnabled} disabled={exporting} onChange={event => setSoundEnabled(event.target.checked)}/>
          ORIGINAL SYNTH SOUNDTRACK <strong>{soundEnabled ? "ON" : "OFF"}</strong>
        </label>
        <p className={styles.hint}>Optional original synthetic score is mixed below narration.</p>
        <VoiceBooth project={project} busy={exporting||generating||directorRepairing}
          onAccept={file=>{
            setVoiceover(file);setPlaying(false);
            setNotice("Genuine voice recorded and attached locally: "+file.name+
              ". Check Voice timeline placement, final listening, and user permission before publishing.");
          }}/>
        <label className={styles.voiceUpload}><span>NARRATION / YOUR MP3, WAV OR M4A</span>
          <input type="file" accept="audio/*" disabled={exporting} onChange={event=>{
            const file=event.target.files?.[0] || null;
            if(file && file.size>15_000_000){setNotice("Narration limit: 15 MB.");setVoiceover(null);}
            else {setVoiceover(file);setNotice(file?"Narration loaded locally: "+file.name:"Narration cleared.");}
          }}/>
        </label>
        {voiceover && <>
          <div className={styles.audioTiming}>
            <strong>VOICE / {narrationSeconds===null?"ANALYSING LENGTH":narrationWindow.usableSeconds.toFixed(1)+"s"}</strong>
            <span>FILM / {total.toFixed(1)}s</span>
            <small>{narrationSeconds===null?"Audio metadata pending; check recording manually."
              : !narrationWindow.ready?"Voice does not fit. Open MULTI-TRACK TIMELINE and adjust START or TRIM."
              : narrationWindow.end<total*.64?"Voice ends early. Review pauses and ending."
              :"Voice placement fits; spoken-word sync still needs listening."}</small>
          </div>
          <button type="button" className={styles.clearVoice} onClick={()=>setVoiceover(null)}>Remove narration · {voiceover.name}</button>
          {narrationSeconds!==null && <button type="button" className={styles.polishButton} disabled={exporting}
            onClick={()=>{
              try{
                const target=Math.min(64,Math.ceil((audioEdit.voiceStart+Math.max(0,narrationSeconds-audioEdit.voiceTrim)+.8)*10)/10);
                const next=rescaleProjectToSeconds(project,target);
                setProject(next);setNotice("TIMING UPDATED: Film now "+durationOf(next).toFixed(1)+"s for "+narrationSeconds.toFixed(1)+"s narration. This is scene-level timing, not word-level lip sync.");
              }catch(error){setNotice(error instanceof Error?error.message:"Voice timing cannot fit these scenes.");}
            }}>◷ FIT FILM TO NARRATION</button>}
        </>}
        <section className={styles.musicDesk} aria-label="Local audio finishing">
          <div className={styles.productionDeskHead}><strong>AUDIO FINISHING / LOCAL</strong><span>NO KEYS · NO UPLOADS</span></div>
          <p>Use a recording you own or have permission to use. Music is mixed and faded under the voice; synthetic score remains optional.</p>
          <label className={styles.voiceUpload}><span>LICENSED MUSIC / MP3, WAV, M4A · MAX 30MB</span>
            <input type="file" accept="audio/*" disabled={exporting} onChange={event=>{
              const file=event.target.files?.[0]||null;
              event.currentTarget.value="";
              if(file && file.size>30_000_000){setNotice("Music limit: 30 MB.");return;}
              setLicensedMusic(file);setNotice(file?"Local licensed music selected: "+file.name:"Music removed.");
            }}/>
          </label>
          {licensedMusic && <div className={styles.musicFile}><span>♫ {licensedMusic.name}</span><button type="button" disabled={exporting} onClick={()=>setLicensedMusic(null)}>REMOVE</button></div>}
          <label className={styles.fader}>VOICE LEVEL <strong>{Math.round(narrationGain*100)}%</strong>
            <input type="range" min="0" max="1.3" step=".05" value={narrationGain} onChange={event=>setNarrationGain(Number(event.target.value))}/>
          </label>
          <label className={styles.fader}>MUSIC LEVEL <strong>{Math.round(musicGain*100)}%</strong>
            <input type="range" min="0" max="1" step=".05" value={musicGain} onChange={event=>setMusicGain(Number(event.target.value))}/>
          </label>
          <small>Audio clips are mixed into the browser export. For H.264/AAC mastering use the existing offline FFmpeg workflow with the original licensed files.</small>
        </section>
        </div>
        <div className={styles.panelSection} hidden={editorPanel!=="review"}>
        <section className={styles.referenceLab} aria-label="Reference film comparison">
          <div className={styles.referenceLabHead}>
            <strong>REFERENCE LAB / REAL FILM SIGNALS</strong>
            <span>LOCAL · NO UPLOAD</span>
          </div>
          <p>Compare a sample advertising film to the current project at eight relative timeline points. Results show measurable lighting, color and temporal differences — <b>not an invented quality score.</b></p>
          <label>
            <span>REFERENCE VIDEO / MP4, WEBM, MOV · MAX 150MB</span>
            <input type="file" accept="video/mp4,video/webm,video/quicktime,video/x-m4v,.mp4,.mov,.webm,.m4v"
              disabled={referenceComparing||exporting}
              onChange={event=>{
                const file=event.target.files?.[0]||null;
                event.target.value="";
                setReferenceComparison(null);
                if(file&&file.size>150_000_000){setReferenceFile(null);setNotice("Reference maximum size is 150 MB.");}
                else{setReferenceFile(file);if(file)setNotice("Reference loaded locally: "+file.name+". Click COMPARE to generate paired frames.");}
              }}/>
          </label>
          <button type="button" className={styles.referenceCompare}
            disabled={!referenceFile||referenceComparing||exporting||directorRepairing||generating}
            onClick={()=>void compareReference()}>
            {referenceComparing?"DECODING & COMPARING…":"◈ COMPARE FILM & REFERENCE"}
          </button>
          {referenceFile&&<small>Reference: {referenceFile.name} · {(referenceFile.size/1_000_000).toFixed(1)} MB. Kept only in browser memory.</small>}
          {referenceComparison&&<div className={styles.referenceStats}>
            <div><span>REF DARK PIXELS</span><b>{referenceComparison.signals.referenceDarkPercent.toFixed(0)}%</b></div>
            <div><span>OUR DARK PIXELS</span><b>{referenceComparison.signals.filmDarkPercent.toFixed(0)}%</b></div>
            <div><span>LUMA DIFFERENCE</span><b>{referenceComparison.signals.meanLumaDifference>0?"+":""}{referenceComparison.signals.meanLumaDifference.toFixed(1)}</b></div>
            <div><span>SATURATION Δ</span><b>{referenceComparison.signals.meanSaturationDifference>0?"+":""}{referenceComparison.signals.meanSaturationDifference.toFixed(1)}</b></div>
            {referenceComparison.notes.map((note,i)=><p key={i}>{note}</p>)}
          </div>}
        </section>
        <div className={styles.qaPanel}>
          <div><strong>PRODUCTION PREFLIGHT</strong><b data-grade={qa.grade}>{qa.grade}</b></div>
          <button type="button" className={styles.polishButton} disabled={exporting}
            onClick={()=>{
              const result=autoPolishMotionProject(project);
              setProject(result.project);
              setNotice(result.changes.length
                ? "AUTO POLISH: "+result.changes.join(" · ")
                : "AUTO POLISH: All safe structural and copy fixes already applied.");
            }}>✦ AUTO POLISH SCENES</button>
          <button type="button" className={styles.directorButton}
            disabled={exporting||generating||directorRepairing||visualReviewing}
            onClick={()=>{void runAutoDirector();}}>
            {directorRepairing?"RENDER → INSPECT → REPAIR…":"✦ SMART DIRECTOR / REPAIR & RECHECK"}
          </button>
          {previousDirectorProject.current && <button type="button"
            className={styles.directorUndo} disabled={exporting||directorRepairing}
            onClick={()=>{
              const restore=previousDirectorProject.current;
              if(!restore)return;
              updateProject(restore);previousDirectorProject.current=null;
              setNotice("Director repairs undone; original editable film restored.");
            }}>↶ UNDO AUTOMATIC REPAIRS</button>}

          <button type="button" className={styles.polishButton} disabled={exporting||generating||visualReviewing}
            onClick={async()=>{
              if(visualReviewing)return;
              setVisualReviewing(true);
              try{
                if(needsSpatial)await ensureSpatialRenderer();
                const report=await reviewMotionVisuals(project);
                downloadFile("motion-"+project.brand+"-"+(project.language||language)+"-visual-review.png",report.sheet);
                setNotice("VISUAL QA: "+report.sceneCoverage+" shots, "+report.frames+" sampled frames. "+(report.warnings.length?report.warnings.join(" · "):"All sampled frames have usable image contrast. Human creative review still required."));
              }catch(error){setNotice(error instanceof Error?error.message:"Visual preflight failed");}
              finally{setVisualReviewing(false);}
            }}>{visualReviewing?"REVIEWING FRAMES...":"◈ REVIEW ALL SHOTS / CONTACT SHEET"}</button>
          <p>{qa.scenes} shots · {qa.seconds.toFixed(1)}s · {qa.warnings} reviews · {qa.blockers} blockers</p>
          {qa.checks.filter(c=>c.severity!=="info").slice(0,4).map(c=><small key={c.id}>• {c.message}</small>)}
        </div>
        </div>
        <div className={styles.panelSection} hidden={editorPanel!=="scene"}>
        <div className={styles.sectionHeader}><span>03 / SCENE INSPECTOR</span><strong>{String(selectedIndex + 1).padStart(2, "0")}</strong></div>
        <div className={styles.quickSceneEdit}>
          <label className={styles.field}><span>HEADLINE</span>
            <textarea rows={2} value={selected.headline} maxLength={105}
              onChange={event=>editScene("headline",event.target.value)}/>
          </label>
          <label className={styles.field}><span>SECOND LINE</span>
            <textarea rows={2} value={selected.support} maxLength={180}
              onChange={event=>editScene("support",event.target.value)}/>
          </label>
          <label className={styles.field}><span>SCENE DURATION · {selected.seconds.toFixed(1)} SEC</span>
            <input type="range" min="2" max="8" step=".5"
              value={selected.seconds} onChange={event=>editScene("seconds",Number(event.target.value))}/>
          </label>
        </div>
        <label className={styles.field}><span>VISUAL COMPOSITION</span>
          <select value={selected.kind} onChange={event => updateProject({...project,
            scenes:project.scenes.map((scene,i)=>i===selectedIndex
              ? {...scene,kind:event.target.value as MotionScene["kind"],productBeat:undefined}
              : scene)})}>
            <option value="opener">Cinematic opener</option>
            <option value="statement">Strong statement</option>
            <option value="network">Signal network</option>
            <option value="screen">Product screenshot / owner review required</option>
            <option value="kinetic">Kinetic typography</option>
            <option value="orbit">Orbit / parallax</option>
            <option value="spatial">Real 3D / Three.js spatial hero</option>
            <option value="closer">Closing frame</option>
          </select>
        </label>
        {project.brand==="promptence"&&<label className={styles.field}>
          <span>PRODUCT STORY / TEN DISTINCT CONCEPT COMPOSITIONS</span>
          <select value={selected.productBeat||"none"}
            onChange={event=>editScene("productBeat",event.target.value==="none"?"":event.target.value)}>
            <option value="none">None / standard composition</option>
            {PROMPTENCE_BEATS.map(beat=><option key={beat} value={beat}>{BEAT_LABELS[beat]}</option>)}
          </select>
          <small className={styles.beatHint}>Conceptual graphics never invent actual AI answers, sources, customer statistics or rankings. For real UI, use the separate approved screenshot scene.</small>
        </label>}
        <section className={styles.productionDesk} aria-label="Per-shot camera and edit controls">
          <div className={styles.productionDeskHead}><strong>DIRECTOR DESK / SHOT {String(selectedIndex+1).padStart(2,"0")}</strong><span>KEYFRAMED · KEYLESS</span></div>
          <p>Direct the actual rendered scenery, not a decorative preview. Text and real product marks stay readable.</p>
          <div className={styles.directorGrid}>
            <label className={styles.field}><span>CAMERA MOVE</span>
              <select value={selected.camera || "inherit"} onChange={event=>editScene("camera",event.target.value)}>
                <option value="inherit">Original camera</option>
                <option value="locked">Tripod / locked</option>
                <option value="push">Push in</option>
                <option value="pull">Pull out</option>
                <option value="drift">Slow drift</option>
              </select>
            </label>
            <label className={styles.field}><span>CUT / NEXT SHOT</span>
              <select value={selected.transition || "auto"} onChange={event=>editScene("transition",event.target.value)}>
                <option value="auto">Automatic</option>
                <option value="cut">Hard cut</option>
                <option value="dissolve">Cross dissolve</option>
                <option value="wipe">Vertical wipe</option>
                <option value="slash">Diagonal wipe</option>
                <option value="zoom">Camera zoom reveal</option>
                <option value="slide">Directional slide</option>
                <option value="grid">Staggered grid reveal</option>
                <option value="flash">Controlled brand flash</option>
              </select>
            </label>
          </div>
          <label className={styles.fader}>CAMERA INTENSITY <strong>{Math.round((selected.intensity ?? .5)*100)}%</strong>
            <input type="range" min="0" max="1" step=".05" value={selected.intensity ?? .5}
              onChange={event=>editScene("intensity",Number(event.target.value))}/>
          </label>
          <label className={styles.field}><span>TYPOGRAPHY / REVEAL</span>
            <select value={selected.titleTreatment||"auto"} onChange={event=>editScene("titleTreatment",event.target.value==="auto"?"":event.target.value)}>
              <option value="auto">Automatic / quality mode</option>
              <option value="editorial">Editorial rise</option>
              <option value="mask">Masked film-title reveal</option>
              <option value="kinetic">Kinetic stagger</option>
              <option value="minimal">Minimal fade</option>
            </select>
          </label>
          <label className={styles.field}><span>VOICE DIRECTION / EDITORIAL CUE</span>
            <textarea rows={3} maxLength={300} placeholder="What should the narrator say during this shot? No synthetic voice is created without a provider."
              value={selected.voiceCue || ""} onChange={event=>editScene("voiceCue",event.target.value)}/>
          </label>
          <div className={styles.directorActions}>
            <button type="button" disabled={selectedIndex===0||exporting} onClick={()=>moveScene(-1)}>← MOVE</button>
            <button type="button" disabled={selectedIndex===project.scenes.length-1||exporting} onClick={()=>moveScene(1)}>MOVE →</button>
            <button type="button" disabled={project.scenes.length>=8||exporting} onClick={duplicateScene}>+ DUPLICATE</button>
          </div>
        </section>
        {selected.kind==="screen"&&selected.mediaId&&<div className={styles.sourceInspector}>
          <strong>SHOT SOURCE / APPROVED LOCAL MATERIAL</strong>
          <p>{getMotionSceneSource(selected.mediaId)?.filename||"Source not loaded in this browser"}
            {" · "}{getMotionSceneSource(selected.mediaId)?.type==="video"?"MOVING VIDEO":"STILL IMAGE"}
          </p>
          {getMotionSceneSource(selected.mediaId)?.type==="video"&&<label className={styles.field}>
            <span>TRUE VIDEO INPOINT / {(selected.mediaStart||0).toFixed(2)} SEC</span>
            <input type="range" min="0"
              max={Math.max(0,(getMotionSceneSource(selected.mediaId)?.duration||0)-selected.seconds-.15)}
              step=".05" value={selected.mediaStart||0} disabled={exporting}
              onChange={event=>editScene("mediaStart",Number(event.target.value))}/>
            <small>Decoder uses real source frames. A short clip blocks export rather than freezing its last frame.</small>
          </label>}
          <div className={styles.sourceArtDirection}>
            <label className={styles.field}><span>FILM SOURCE / ART DIRECTION</span>
              <select disabled={exporting} value={selected.sourceLayout||"card"}
                onChange={event=>editScene("sourceLayout",event.target.value)}>
                <option value="card">Floating product card</option>
                <option value="theater">Product theater / larger screen</option>
                <option value="split">Split editorial / real interface</option>
                <option value="immersive">Immersive real footage / title overlay</option>
              </select>
            </label>
            {([
              ["sourceFocusX","CAMERA FOCUS / X",0,1,.05],
              ["sourceFocusY","CAMERA FOCUS / Y",0,1,.05],
              ["sourceZoomStart","SOURCE ZOOM / START",1,2,.025],
              ["sourceZoomEnd","SOURCE ZOOM / END",1,2,.025]
            ] as Array<[keyof MotionScene,string,number,number,number]>).map(([key,label,min,max,step])=>
              <label className={styles.field} key={key}>
                <span>{label} / {Number(selected[key]??(key.startsWith("sourceZoom")?1:.5)).toFixed(2)}</span>
                <input type="range" min={min} max={max} step={step} disabled={exporting}
                  value={Number(selected[key]??(key.startsWith("sourceZoom")?1:.5))}
                  onChange={event=>editScene(key,Number(event.target.value))}/>
              </label>)}
            <small>These are real camera crops of your uploaded frames, not AI-generated screens. Check that source captions, dates and measurements remain readable.</small>
          </div>
          <button type="button" disabled={exporting} onClick={()=>{
            updateProject({...project,scenes:project.scenes.map((shot,index)=>
              index===selectedIndex?{...shot,mediaId:undefined,mediaStart:0}:shot)});
          }}>DETACH FROM SHOT</button>
        </div>}
        <div className={styles.sourceInspector}>
          <strong>ADVANCED EDIT / INDEPENDENT IMAGE LAYER</strong>
          <p>Optional second original image, independently positioned above the designed background. Add one in MEDIA LIBRARY. Genuine PNG/JPEG/WebP only.</p>
          {selected.overlayMediaId&&<>
            <p>{getMotionSceneSource(selected.overlayMediaId)?.filename||"Overlay source not loaded in this browser"}</p>
            <label className={styles.field}><span>LAYER POSITION</span>
              <select value={selected.overlayCorner||"bottom-right"} disabled={exporting}
                onChange={event=>editScene("overlayCorner",event.target.value)}>
                <option value="bottom-right">Bottom right</option>
                <option value="bottom-left">Bottom left</option>
                <option value="top-right">Top right</option>
                <option value="top-left">Top left</option>
              </select>
            </label>
            {([
              ["overlaySize","LAYER SIZE",.16,.48,.01],
              ["overlayOpacity","LAYER OPACITY",.2,1,.05],
              ["overlayStart","START IN SHOT / SECONDS",0,Math.max(0,selected.seconds-.25),.05],
              ["overlayDuration","LAYER DURATION / SECONDS",.25,
                Math.max(.25,selected.seconds-(selected.overlayStart||0)),.05]
            ] as Array<[keyof MotionScene,string,number,number,number]>).map(([field,label,min,max,step])=>
              <label className={styles.field} key={field}>
                <span>{label} / {Number(selected[field]??0).toFixed(2)}</span>
                <input type="range" min={min} max={max} step={step} disabled={exporting}
                  value={Math.max(min,Math.min(max,Number(selected[field]??min)))}
                  onChange={event=>editScene(field,Number(event.target.value))}/>
              </label>)}
            <button type="button" disabled={exporting} onClick={()=>
              updateProject({...project,scenes:project.scenes.map((shot,index)=>
                index===selectedIndex?{...shot,overlayMediaId:undefined}:shot)})}>
              REMOVE SECOND IMAGE LAYER
            </button>
          </>}
        </div>
        <label className={styles.screenUpload}>
          <strong>REAL PRODUCT SCREEN / SOURCE FOOTAGE</strong>
          <span>{hasProductScreen(project.brand)
            ? "Source image loaded locally — select Real product screen to show it."
            : "No screenshot loaded for this brand. Source images are never sent to a server."}</span>
          <input type="file" accept="image/png,image/jpeg,image/webp"
            disabled={exporting||generating}
            onChange={event=>{
              const file=event.currentTarget.files?.[0];
              event.currentTarget.value="";
              if(!file)return;
              void setLocalProductScreen(project.brand,file)
                .then(()=>{setAssetRevision(v=>v+1);setNotice("Real product screenshot loaded for "+BRAND_INFO[project.brand].name+". Select Real product screen composition; saved project JSON will not include the private image.");})
                .catch(error=>setNotice(error instanceof Error?error.message:"Cannot open product screenshot"));
            }}/>
          <small>PNG / JPEG / WebP · max 12MB. A real capture only — not fabricated dashboard statistics. For reproducible offline MP4, add --screen screenshot.png.</small>
        </label>
        <label className={styles.field}><span>EYEBROW</span><input value={selected.eyebrow} maxLength={65} onChange={event => editScene("eyebrow", event.target.value)}/></label>
        <p className={styles.editorTip}>Primary scene copy and duration are above. The controls below are for advanced camera and compositing.</p>
        <div className={styles.inlineActions}>
          <button onClick={addScene} disabled={project.scenes.length >= 8}>+ Add scene</button>
          <button onClick={removeScene} disabled={project.scenes.length <= 1}>Remove</button>
        </div>
        <div className={styles.spatialStatus} role="status" data-ready={needsSpatial&&spatialStatus()==="ready"}>
          <div><strong>THREE.JS / SPATIAL ENGINE</strong><span>{needsSpatial?spatialStatus().toUpperCase():"STANDBY"}</span></div>
          <p>Choose “Real 3D” to add depth-tested geometry and moving studio lights. Real GPU-rendered frames are included in video export.</p>
          {needsSpatial&&spatialError()&&<small>{spatialError()}</small>}
          <small>Free library, not text-to-video AI. No cloud GPU, voice cloning or API key. Legacy 2D shots remain unchanged.</small>
        </div>
        </div>
        </div>
      </section>

      <section className={styles.stageSection} id="motion-editor" aria-label="Motion canvas and timeline">
        <div className={styles.stageTop}>
          <div><span>MONITOR / LIVE CANVAS</span><strong>{info.name}</strong></div>
          <div className={styles.stageTopTools}>
            <span className={styles.frameBadge}>{project.format==="portrait"?"9:16":project.format==="landscape"?"16:9":"1:1"}</span>
            <span className={styles.frameBadge}>{qa.blockers?qa.blockers+" QA BLOCKERS":"STRUCTURE READY"}</span>
            <button type="button" onClick={()=>setEditorPanel("deliver")}>EXPORT ↗</button>
          </div>
        </div>
        <div className={styles.stageShell}>
          <canvas ref={previewRef} className={styles.canvas} width={previewWidth} height={previewHeight}
            style={{ aspectRatio: String(formatSize.width) + " / " + String(formatSize.height) }}
            aria-label="Animated motion graphics preview"/>
        </div>
        <div className={styles.transport}>
          <button onClick={() => { if (timeRef.current >= total) jump(0); setPlaying(!playing); }} aria-label={playing ? "Pause animation" : "Play animation"}>{playing ? "Ⅱ" : "▶"}</button>
          <span>{timeLabel(playhead)}</span>
          <input type="range" min="0" max={total} step=".05" value={playhead} aria-label="Scrub animation timeline" onChange={event => { setPlaying(false); jump(Number(event.target.value)); }}/>
          <span>{timeLabel(total)}</span>
        </div>
        <div className={styles.sectionHeader}><span>04 / FRAME SEQUENCE</span><strong>{project.scenes.length} SHOTS</strong></div>
        <div className={styles.timeline}>
          {project.scenes.map((scene, index) => <button key={scene.id} type="button"
            className={(index === selectedIndex ? styles.selectedShot + " " : "") + (index === activeIndex ? styles.currentShot : "")}
            onClick={() => {selectScene(index);setEditorPanel("scene");}}>
            <span className={styles.shotNumber}>SHOT {String(index + 1).padStart(2, "0")} <i>{scene.seconds}s</i></span>
            <strong>{scene.headline}</strong>
            <small>{scene.kind}</small>
          </button>)}
        </div>
        <details className={styles.advancedTimeline}>
          <summary><span>◫ MULTITRACK & PRECISION CUT</span>
            <small>Advanced / audio trim · split · reorder · undo</small></summary>
        <MultitrackEditor project={project} playhead={playhead} selectedIndex={selectedIndex}
          voice={voiceover} voiceSeconds={narrationSeconds}
          music={licensedMusic} musicSeconds={musicSeconds} playing={playing}
          onSeek={time=>{setPlaying(false);jump(time);}}
          onSelect={selectScene}
          onEdit={audio=>{setPlaying(false);updateProject({...project,audio});}}
        />
        <PrecisionCutDesk project={project} selectedIndex={selectedIndex}
          playhead={playhead} busy={exporting||generating||directorRepairing||visualReviewing}
          onApply={(next,index,description)=>{
            setPlaying(false);
            const restored=sanitizeMotionProject(next);
            setProject(restored);
            setSelectedIndex(index);
            const time=restored.scenes.slice(0,index).reduce((n,shot)=>n+shot.seconds,0);
            timeRef.current=time;setPlayhead(time);
            setNotice(description+" Original video remains local. Check the next transition and export preflight.");
          }}
        />
        </details>
        <div className={styles.bottom} hidden={editorPanel!=="deliver"}>
          <div><b>MAKE SOMETHING THAT MOVES PEOPLE.</b><p>Every frame is deterministic, locally editable and exported only on command.</p></div>
          <div className={styles.exportActions} id="motion-export">
            <label className={styles.importLabel}>Import JSON<input type="file" accept=".json,application/json" onChange={event => { void importJson(event.target.files?.[0]); event.currentTarget.value = ""; }}/></label>
            <button onClick={saveJson}>Save project</button>
            <button type="button" onClick={()=>{
              const pack=makeProductionPack(project);
              downloadFile("motion-"+project.brand+"-production-pack.json",
                new Blob([JSON.stringify(pack,null,2)],{type:"application/json"}));
              downloadFile("motion-"+project.brand+"-voice-cues.txt",
                new Blob([pack.shots.map(shot=>
                  "["+timeLabel(shot.start)+" - "+timeLabel(shot.end)+"] SHOT "+shot.shot+": "+shot.narration
                ).join("\n\n")],{type:"text/plain;charset=utf-8"}));
              setNotice("Production pack exported: precise shot timings, creative cues, narration text and timing warnings. No voice generated.");
            }}>DIRECTOR PACK ↓</button>
            <button onClick={()=>{
              const c=createCaptionBundle(project);
              downloadFile(project.brand+"-"+c.language+".srt",new Blob([c.srt],{type:"text/plain;charset=utf-8"}));
              setNotice("SRT exported: editorial on-screen captions. Re-align if your spoken narration differs.");
            }}>SUBTITLES SRT</button>
            <button onClick={()=>{
              const c=createCaptionBundle(project);
              downloadFile(project.brand+"-"+c.language+".vtt",new Blob([c.vtt],{type:"text/vtt;charset=utf-8"}));
              setNotice("WebVTT exported: shot titles, not a speech transcript.");
            }}>WEBVTT</button>
            <button onClick={()=>{
              const c=createCaptionBundle(project);
              downloadFile(project.brand+"-"+c.language+"-voice-script.txt",new Blob([c.voiceScript],{type:"text/plain;charset=utf-8"}));
              setNotice("Editorial narration guide exported. Review timing with recorded voice.");
            }}>VOICE SCRIPT</button>
            <button className={styles.exportButton} disabled={exporting || generating} onClick={() => void exportVideo()}>
              {exporting ? "RENDERING " + exportProgress + "%" : qa.pass ? "QA + EXPORT VIDEO ↗" : "FIX QA BLOCKERS"}
            </button>
          </div>
        </div>
        <p className={styles.footnote} hidden={editorPanel!=="deliver"}>Spatial shots use actual WebGL geometry via Three.js and deterministic GSAP easing only when selected; rendering requires WebGL support. Local cinema staging and original MP4 soundtracks run without paid video APIs. Product screenshots are local-only and never stored in saved JSON. Source-verified marks are original SVGs; private GitHub sources are never exposed here. Browser EXPORT may produce WebM depending on support. For deterministic professional H.264/AAC MP4, use the offline <code>npm run motion:master</code> workflow in the repository; it needs a local computer with FFmpeg/Chromium. QA checks structure and sampled frames but cannot certify taste, factual claims or music licenses. Final creative review is still required.</p>
      </section>
    </div>}
  </main>;
}
