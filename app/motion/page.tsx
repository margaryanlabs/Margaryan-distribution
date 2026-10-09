"use client";

import { useEffect, useRef, useState } from "react";
import {
  BRAND_INFO, FORMAT_SIZE, drawMotionFrame, durationOf, makeMotionPreset,
  sanitizeMotionProject, sceneAt,
  type MotionBrand, type MotionFormat, type MotionProject, type MotionScene
} from "@/lib/motion/studio";
import styles from "./motion.module.css";

const STORAGE_KEY = "margaryan-motion-studio-v1";
const BRANDS: MotionBrand[] = ["veto", "promptence", "raios", "labs"];
const FORMATS: MotionFormat[] = ["portrait", "square", "landscape"];
const defaultBrief = "Create a cinematic, premium product reveal. Start with an uncomfortable question, reveal the underlying problem, show how the intelligence system thinks, and finish with an unforgettable line. Confident, minimal, no unrealistic promises.";
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
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [notice, setNotice] = useState("Choose a brand template or describe a new motion story. No publishing occurs here.");
  const previewRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef(0);
  const total = durationOf(project);
  const selected = project.scenes[Math.min(selectedIndex, project.scenes.length - 1)] || project.scenes[0];
  const info = BRAND_INFO[project.brand];

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
    setNotice("Loaded " + BRAND_INFO[brand].name + " template. Edit any scene or ask AI for a new storyboard.");
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
  async function generate() {
    if (generating || exporting) return;
    setGenerating(true); setNotice("Generating a structured storyboard. No video credits spent on rendering.");
    try {
      const response = await fetch("/api/motion/storyboard", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: brief, brand: project.brand, format: project.format })
      });
      const payload = await response.json() as { project?: unknown; error?: string };
      if (!response.ok || !payload.project) throw new Error(payload.error || "Generation failed");
      setPlaying(false); jump(0); setSelectedIndex(0);
      setProject(sanitizeMotionProject(payload.project));
      setNotice("AI storyboard ready. Preview, edit, and explicitly export when satisfied.");
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
    const types = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"];
    const mimeType = types.find(type => MediaRecorder.isTypeSupported(type));
    if (!mimeType) { setNotice("No supported video recording format found. Use Chrome or Edge."); return; }
    setPlaying(false); setExporting(true); setExportProgress(0);
    setNotice("Recording frames in real time. Keep this browser tab visible until export is complete.");
    const { width, height } = FORMAT_SIZE[project.format];
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) { setExporting(false); setNotice("Canvas renderer could not start."); return; }
    const stream = canvas.captureStream(30);
    let raf = 0;
    let recorder: MediaRecorder | null = null;
    try {
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
      setNotice("Video rendered locally: " + ext.toUpperCase() + ", " + width + " × " + height + ". No external publish or upload.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Render failed");
    } finally {
      cancelAnimationFrame(raf);
      if (recorder && recorder.state !== "inactive") recorder.stop();
      stream.getTracks().forEach(track => track.stop());
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

  return <main className={styles.root} style={{ "--brand-accent": info.accent } as React.CSSProperties}>
    <header className={styles.header}>
      <div>
        <p className={styles.kicker}>MARGARYAN DISTRIBUTION / CREATIVE SYSTEMS / V0.1</p>
        <h1>Motion <em>Studio.</em></h1>
        <p className={styles.deck}>From a single idea to a frame-accurate, editable motion story. Built for the Margaryan portfolio.</p>
      </div>
      <div className={styles.headerRight}>
        <span className={styles.liveDot}/> LOCAL RENDER ENGINE
        <a href="/smm">Marketing Command ↗</a>
      </div>
    </header>

    <div className={styles.notice} role="status">{notice}</div>

    <div className={styles.workspace}>
      <section className={styles.sidebar} aria-label="Creative director controls">
        <div className={styles.sectionHeader}><span>01 / CREATIVE BRIEF</span><strong>AI DIRECTOR</strong></div>
        <label className={styles.field}><span>PRODUCT / BRAND</span>
          <select value={project.brand} onChange={event => loadBrand(event.target.value as MotionBrand)}>
            {BRANDS.map(brand => <option key={brand} value={brand}>{BRAND_INFO[brand].name}</option>)}
          </select>
        </label>
        <label className={styles.field}><span>DESCRIBE THE FILM</span>
          <textarea value={brief} maxLength={2000} onChange={event => setBrief(event.target.value)} rows={6}/>
        </label>
        <button className={styles.heroButton} onClick={() => void generate()} disabled={generating || exporting || brief.trim().length < 12}>
          {generating ? "DIRECTING…" : "GENERATE AI STORYBOARD ↗"}
        </button>
        <p className={styles.hint}>AI planning requires a server OpenAI key. Templates, editing and local recording work without one.</p>
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
        <div className={styles.divider}/>
        <div className={styles.sectionHeader}><span>03 / SCENE INSPECTOR</span><strong>{String(selectedIndex + 1).padStart(2, "0")}</strong></div>
        <label className={styles.field}><span>VISUAL COMPOSITION</span>
          <select value={selected.kind} onChange={event => editScene("kind", event.target.value)}>
            <option value="opener">Cinematic opener</option>
            <option value="statement">Strong statement</option>
            <option value="network">Signal network</option>
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
        <div className={styles.stageTop}><div><span>LIVE CANVAS</span><strong>{info.name}</strong></div><div><i/> PROGRAMMATIC MOTION</div></div>
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
              {exporting ? "RENDERING " + exportProgress + "%" : "EXPORT VIDEO ↗"}
            </button>
          </div>
        </div>
        <p className={styles.footnote}>Export uses browser MediaRecorder and records in real time (WebM where supported; MP4 only where natively supported). No synthetic voice, music, 3D geometry or one-click publishing in this version.</p>
      </section>
    </div>
  </main>;
}
