"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import {
  BRAND_INFO, FORMAT_SIZE, durationOf, makeMotionPreset,
  sanitizeMotionProject, sceneAt,
  type MotionBrand, type MotionFormat, type MotionProject, type MotionScene
} from "@/lib/motion/studio";
import { drawMotionFrame } from "@/lib/motion/render-engine";
import { preloadMotionLogo } from "@/lib/motion/brand-assets";
import { PORTFOLIO, PORTFOLIO_BRANDS } from "@/lib/motion/portfolio";
import { auditMotionProject, inspectFramePixels } from "@/lib/motion/quality";
import { createProceduralSoundtrack, type ProceduralAudioSession } from "@/lib/motion/sound-engine";
import { createKeylessStoryboard, getLocalDirectorExamples, type MotionLanguage, type MotionStyle } from "@/lib/motion/director";
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
  const [project, setProject] = useState<MotionProject>(() => makeMotionPreset());
  const [hydrated, setHydrated] = useState(false);
  const [brief, setBrief] = useState(defaultBrief);
  const [style, setStyle] = useState<MotionStyle>("cinematic");
  const [language, setLanguage] = useState<MotionLanguage>("auto");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [voiceover, setVoiceover] = useState<File | null>(null);
  const [assetRevision, setAssetRevision] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [notice, setNotice] = useState("Собственный локальный движок: генерация сцен, графика и экспорт без API-ключей, кредитов и сервера рендеринга.");
  const previewRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef(0);
  const total = durationOf(project);
  const selected = project.scenes[Math.min(selectedIndex, project.scenes.length - 1)] || project.scenes[0];
  const info = BRAND_INFO[project.brand];
  const provenance = PORTFOLIO[project.brand];
  const qa = auditMotionProject(project);

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

  useEffect(() => {
    if (playing) return;
    const canvas = previewRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) drawMotionFrame(ctx, project, timeRef.current, canvas.width, canvas.height);
  }, [project, playing, playhead, assetRevision]);

  useEffect(() => {
    if (!playing) return;
    const canvas = previewRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let raf = 0;
    let previous = performance.now();
    let lastUi = 0;
    function frame(now: number) {
      const step = Math.min(.1, (now - previous) / 1000);
      previous = now;
      if (playing) {
        timeRef.current = Math.min(total, timeRef.current + Math.max(0, step));
        if (timeRef.current >= total) setPlaying(false);
      }
      if (canvas && ctx) drawMotionFrame(ctx, project, timeRef.current, canvas.width, canvas.height);
      if (now - lastUi > 120) {
        lastUi = now; setPlayhead(timeRef.current);
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [project, playing, total]);

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
  function generate() {
    if (generating || exporting) return;
    setGenerating(true);
    try {
      // No network access, API credentials or hosted models are needed.
      const next = createKeylessStoryboard({ prompt: brief, brand: project.brand, format: project.format, language, style });
      setPlaying(false); jump(0); setSelectedIndex(0);
      setProject(next);
      setNotice("Создано " + next.scenes.length + " сцен полностью в браузере. Можно редактировать и экспортировать видео.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not generate storyboard");
    } finally { setGenerating(false); }
  }

  async function exportVideo() {
    if (exporting || generating) return;
    const captureSupported = typeof HTMLCanvasElement !== "undefined" && "captureStream" in HTMLCanvasElement.prototype;
    if (!captureSupported || typeof MediaRecorder === "undefined") {
      setNotice("Your browser does not support canvas recording. Use current desktop Chrome or Edge for export.");
      return;
    }
    const types = (soundEnabled || Boolean(voiceover))
      ? ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"]
      : ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"];
    const mimeType = types.find(type => MediaRecorder.isTypeSupported(type));
    if (!mimeType) { setNotice("No supported video recording format found. Use Chrome or Edge."); return; }
    if (!qa.pass) {
      setNotice("QUALITY GATE BLOCKED: " + qa.checks.filter(c=>c.severity==="block").map(c=>c.message).join("; "));
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
    try {
      await preloadMotionLogo(project.brand);
      // Check representative actual rendered frames, not only scene JSON.
      let cursor = 0;
      for (const scene of project.scenes) {
        const candidate = cursor + scene.seconds * .5;
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
      if (soundEnabled || voiceover) {
        try {
          audioSession = await createProceduralSoundtrack(project, { voiceover, synth: soundEnabled });
          stream.addTrack(audioSession.track);
        } catch (audioError) {
          setNotice("Synth soundtrack unavailable — exporting the video without sound. " +
            (audioError instanceof Error ? audioError.message : ""));
        }
      }
      drawMotionFrame(ctx, project, 0, width, height);
      recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
      const chunks: BlobPart[] = [];
      const currentRecorder = recorder;
      await new Promise<void>((resolve, reject) => {
        currentRecorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
        currentRecorder.onerror = () => reject(new Error("Video encoder failed"));
        currentRecorder.onstop = () => resolve();
        currentRecorder.start(1000);
        const began = performance.now();
        function render(now: number) {
          if (currentRecorder.state !== "recording") return;
          const seconds = Math.min(total, (now - began) / 1000);
          if (ctx) drawMotionFrame(ctx, project, seconds, width, height);
          setExportProgress(Math.min(100, Math.round(seconds / total * 100)));
          if (seconds >= total) currentRecorder.stop();
          else raf = requestAnimationFrame(render);
        }
        raf = requestAnimationFrame(render);
      });
      if (!chunks.length) throw new Error("Recorder returned an empty video. Try a different browser.");
      const ext = mimeType.includes("mp4") ? "mp4" : "webm";
      const blob = new Blob(chunks, { type: mimeType });
      downloadFile("margaryan-motion-" + project.brand + "-" + project.format + "." + ext, blob);
      setNotice("Video rendered locally: " + ext.toUpperCase() + ", " + width + " × " + height + (audioSession && voiceover ? " + narration" : "") + (audioSession && soundEnabled ? " + synth soundtrack" : "") + ". No external upload.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Render failed");
    } finally {
      cancelAnimationFrame(raf);
      if (recorder && recorder.state !== "inactive") recorder.stop();
      stream?.getTracks().forEach(track => track.stop());
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

  return <main className={styles.root} style={{ "--brand-accent": info.accent } as CSSProperties}>
    <header className={styles.header}>
      <div>
        <p className={styles.kicker}>MARGARYAN DISTRIBUTION / CREATIVE SYSTEMS / MOTION OS V0.4</p>
        <h1>Motion <em>Studio.</em></h1>
        <p className={styles.deck}>Portfolio-wide motion production · source-verified brand marks · EN / RU / HY storyboards · audio mixing · preflight QA. Core rendering works without API keys.</p>
      </div>
      <div className={styles.headerRight}>
        <span className={styles.liveDot}/> KEYLESS / LOCAL ENGINE
        <a href="/smm">Marketing Command ↗</a>
      </div>
    </header>

    <div className={styles.notice} role="status">{notice}</div>

    <div className={styles.workspace}>
      <section className={styles.sidebar} aria-label="Creative director controls">
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
        <p className={styles.hint}>Own procedural motion director: language-aware storyboard + animated graphics. Runs locally. Not a generative neural video model.</p>
        <div className={styles.divider}/>
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
        <label className={styles.audioToggle}>
          <input type="checkbox" checked={soundEnabled} disabled={exporting} onChange={event => setSoundEnabled(event.target.checked)}/>
          ORIGINAL SYNTH SOUNDTRACK <strong>{soundEnabled ? "ON" : "OFF"}</strong>
        </label>
        <p className={styles.hint}>Optional original synthetic score is mixed below narration.</p>
        <label className={styles.voiceUpload}><span>NARRATION / YOUR MP3, WAV OR M4A</span>
          <input type="file" accept="audio/*" disabled={exporting} onChange={event=>{
            const file=event.target.files?.[0] || null;
            if(file && file.size>15_000_000){setNotice("Narration limit: 15 MB.");setVoiceover(null);}
            else {setVoiceover(file);setNotice(file?"Narration loaded locally: "+file.name:"Narration cleared.");}
          }}/>
        </label>
        {voiceover && <button type="button" className={styles.clearVoice} onClick={()=>setVoiceover(null)}>Remove narration · {voiceover.name}</button>}
        <div className={styles.qaPanel}>
          <div><strong>PRODUCTION PREFLIGHT</strong><b data-grade={qa.grade}>{qa.grade}</b></div>
          <p>{qa.scenes} shots · {qa.seconds.toFixed(1)}s · {qa.warnings} reviews · {qa.blockers} blockers</p>
          {qa.checks.filter(c=>c.severity!=="info").slice(0,4).map(c=><small key={c.id}>• {c.message}</small>)}
        </div>
        <div className={styles.divider}/>
        <div className={styles.sectionHeader}><span>03 / SCENE INSPECTOR</span><strong>{String(selectedIndex + 1).padStart(2, "0")}</strong></div>
        <label className={styles.field}><span>VISUAL COMPOSITION</span>
          <select value={selected.kind} onChange={event => editScene("kind", event.target.value)}>
            <option value="opener">Cinematic opener</option>
            <option value="statement">Strong statement</option>
            <option value="network">Signal network</option>
            <option value="kinetic">Kinetic typography</option>
            <option value="orbit">Orbit / parallax</option>
            <option value="closer">Closing frame</option>
          </select>
        </label>
        <label className={styles.field}><span>EYEBROW</span><input value={selected.eyebrow} maxLength={65} onChange={event => editScene("eyebrow", event.target.value)}/></label>
        <label className={styles.field}><span>HEADLINE</span><textarea rows={2} value={selected.headline} maxLength={105} onChange={event => editScene("headline", event.target.value)}/></label>
        <label className={styles.field}><span>SUPPORT LINE</span><textarea rows={2} value={selected.support} maxLength={180} onChange={event => editScene("support", event.target.value)}/></label>
        <label className={styles.field}><span>DURATION · {selected.seconds.toFixed(1)} SEC</span>
          <input type="range" min="2" max="8" step=".5" value={selected.seconds} onChange={event => editScene("seconds", Number(event.target.value))}/>
        </label>
        <div className={styles.inlineActions}>
          <button onClick={addScene} disabled={project.scenes.length >= 8}>+ Add scene</button>
          <button onClick={removeScene} disabled={project.scenes.length <= 1}>Remove</button>
        </div>
      </section>

      <section className={styles.stageSection} aria-label="Motion canvas and timeline">
        <div className={styles.stageTop}><div><span>LIVE CANVAS</span><strong>{info.name}</strong></div><div><i/> KEYLESS PROCEDURAL ENGINE</div></div>
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
            onClick={() => selectScene(index)}>
            <span className={styles.shotNumber}>SHOT {String(index + 1).padStart(2, "0")} <i>{scene.seconds}s</i></span>
            <strong>{scene.headline}</strong>
            <small>{scene.kind}</small>
          </button>)}
        </div>
        <div className={styles.bottom}>
          <div><b>MAKE SOMETHING THAT MOVES PEOPLE.</b><p>Every frame is deterministic, locally editable and exported only on command.</p></div>
          <div className={styles.exportActions}>
            <label className={styles.importLabel}>Import JSON<input type="file" accept=".json,application/json" onChange={event => { void importJson(event.target.files?.[0]); event.currentTarget.value = ""; }}/></label>
            <button onClick={saveJson}>Save project</button>
            <button className={styles.exportButton} disabled={exporting || generating} onClick={() => void exportVideo()}>
              {exporting ? "RENDERING " + exportProgress + "%" : qa.pass ? "QA + EXPORT VIDEO ↗" : "FIX QA BLOCKERS"}
            </button>
          </div>
        </div>
        <p className={styles.footnote}>Local code-based graphics use no AI API key. Verified marks come from known repositories. Private repos are not fetched by this public page. Upload narration to mix it; the engine does not synthesize human speech without a separate provider. Automatic QA checks structure and sampled frames, not aesthetic judgment. Real-time WebM/MP4 export depends on the browser. Manual final review required before publication.</p>
      </section>
    </div>
  </main>;
}
