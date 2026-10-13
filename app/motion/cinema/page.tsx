"use client";

import { useEffect, useRef, useState } from "react";
import type { PromptenceFilm } from "@/lib/motion/cinema/promptence-film";
import styles from "./cinema.module.css";

declare global {
  interface Window {
    __motionCinemaReady?: boolean;
    __motionCinemaError?: string;
    __motionCinemaSeek?: (seconds: number) => Promise<void>;
    __motionCinemaHasSource?: () => boolean;
  }
}
const DURATION = 10;
const q = (n: number) => Math.max(0, Math.min(DURATION, n));
const fade = (a:number,b:number,t:number) => { const x=Math.max(0,Math.min(1,(t-a)/(b-a)));return x*x*(3-2*x); };

export default function CinematicDirector() {
  const frame = useRef<HTMLDivElement>(null);
  const film = useRef<PromptenceFilm | null>(null);
  const playback = useRef<number | null>(null);
  const playStarted = useRef(0);
  const exportMode = useRef(false);
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [sourceLoaded, setSourceLoaded] = useState(false);
  const [status, setStatus] = useState("INITIALIZING WEBGL");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let closed = false;
    exportMode.current = new URLSearchParams(window.location.search).has("export");
    window.__motionCinemaReady = false;
    window.__motionCinemaError = undefined;
    const width = exportMode.current ? 1920 : 1280;
    const height = exportMode.current ? 1080 : 720;
    void import("@/lib/motion/cinema/promptence-film").then(({ createPromptenceFilm }) => {
      if (closed || !frame.current) return;
      const director = createPromptenceFilm(width, height);
      if (closed) { director.dispose(); return; }
      film.current = director;
      director.canvas.className = styles.webgl;
      frame.current.appendChild(director.canvas);
      window.__motionCinemaSeek = async seconds => {
        if (!Number.isFinite(seconds) || seconds < 0 || seconds > DURATION)
          throw Error("Cinema frame out of bounds");
        director.setTime(seconds);
        setPosition(seconds);
        // Next animation frame makes DOM typography + canvas agree on the same time.
        await new Promise<void>(resolve => requestAnimationFrame(() =>
          requestAnimationFrame(() => resolve())));
      };
      window.__motionCinemaHasSource = () => sourceRef.current;
      window.__motionCinemaReady = true;
      setStatus("WEBGL CINEMATIC STAGE READY");
    }).catch(e => {
      if (closed) return;
      const reason = e instanceof Error ? e.message : String(e);
      setError(reason);
      window.__motionCinemaError = reason;
      setStatus("WEBGL UNAVAILABLE — EXPORT DISABLED");
    });
    return () => {
      closed = true;
      if (playback.current !== null) cancelAnimationFrame(playback.current);
      film.current?.dispose(); film.current = null;
      delete window.__motionCinemaSeek;
      delete window.__motionCinemaHasSource;
      window.__motionCinemaReady = false;
    };
  }, []);
  const sourceRef = useRef(false);

  function stop() {
    if (playback.current !== null) cancelAnimationFrame(playback.current);
    playback.current = null;
    setPlaying(false);
  }
  function play() {
    if (!film.current || playing) return;
    playStarted.current = performance.now() - position * 1000;
    setPlaying(true);
    const tick = (now: number) => {
      const elapsed = (now - playStarted.current) / 1000;
      const t = q(elapsed);
      film.current?.setTime(t);
      setPosition(t);
      if (t < DURATION) playback.current = requestAnimationFrame(tick);
      else { playback.current = null; setPlaying(false); }
    };
    playback.current = requestAnimationFrame(tick);
  }
  async function useSource(file: File | undefined) {
    if (!file || !film.current) return;
    try {
      await film.current.setScreen(file);
      sourceRef.current = true;
      setSourceLoaded(true);
      film.current.setTime(position);
      setStatus("AUTHENTIC PRODUCT CAPTURE INSTALLED");
      setError(null);
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      setError(reason);
    }
  }
  const introOpacity = fade(0,.8,position) * (1-fade(2.6,3.7,position));
  const middleOpacity = fade(3.5,4.6,position) * (1-fade(6.85,8.05,position));
  const finalOpacity = fade(7.65,9.25,position);

  return <main className={styles.root} style={exportMode.current ? {width:1920,height:1080,padding:0,overflow:"hidden"} : undefined}>
    {!exportMode.current && <header className={styles.header}>
      <a href="/motion" className={styles.back}>← MOTION STUDIO</a>
      <div><span className={styles.eyebrow}>MARGARYAN LABS / CINEMATIC ENGINE</span>
        <h1>Real 3D. Real sources. <em>Real frames.</em></h1>
        <p>WebGL perspective camera, physically lit geometry, true product texture,
          reproducible timecodes. No invented AI analytics.</p></div>
      <span className={styles.chip}>{status}</span>
    </header>}
    <section className={styles.stageWrap} style={exportMode.current ? {width:1920,maxWidth:"none"} : undefined} aria-label="Motion cinema preview">
      <div className={styles.filmFrame} id="cinema-film-frame" ref={frame}>
        <div className={styles.grain} aria-hidden="true" />
        <div className={styles.topline}>MARGARYAN LABS <span>PRODUCT INTELLIGENCE / 001</span></div>
        <div className={styles.headline} style={{ opacity: introOpacity }}>
          <span className={styles.kicker}>A NEW DECISION LAYER</span>
          <strong>They ask AI.<br /><i>Who does it choose?</i></strong>
        </div>
        <div className={styles.middle} style={{ opacity: middleOpacity }}>
          <span>QUESTION → OBSERVATION → EVIDENCE → ACTION</span>
        </div>
        <div className={styles.final} style={{ opacity: finalOpacity }}>
          <img src="/motion/brands/promptence.svg" alt="Promptence official mark" />
          <strong>PROMPTENCE</strong>
          <span>AI RECOMMENDATION INTELLIGENCE</span>
          <small>BE PART OF THE ANSWER. · PROMPTENCE.TECH</small>
        </div>
        <div className={styles.bottomline}>PROMPTENCE <span>01 / 01 — CINEMATIC PROOF</span></div>
      </div>
    </section>
    {exportMode.current && <input data-testid="cinema-source" aria-label="Source capture for renderer"
      type="file" accept="image/png,image/jpeg,image/webp"
      style={{position:"absolute",opacity:0,width:1,height:1}}
      onChange={e => void useSource(e.target.files?.[0])} />}
    {!exportMode.current && <section className={styles.controls}>
      <div className={styles.transport}>
        <button onClick={() => playing ? stop() : play()} disabled={!film.current}>
          {playing ? "Ⅱ PAUSE" : "▶ PLAY 10 SEC"}
        </button>
        <input aria-label="Film playhead" type="range" min="0" max={DURATION} step=".01"
          value={position} onChange={e => {
            stop(); const t = q(Number(e.target.value));
            film.current?.setTime(t); setPosition(t);
          }} />
        <output>{position.toFixed(2)} / 10.00</output>
      </div>
      <div className={styles.import}>
        <div><strong>REAL PROMPTENCE SCREEN</strong>
          <p>Optional for the concept preview. Required for any product-footage release.
            The original screenshot is mapped onto an actual 3D surface and is never redrawn.</p></div>
        <label className={styles.upload}>IMPORT APPROVED CAPTURE
          <input type="file" accept="image/png,image/jpeg,image/webp"
            onChange={e => void useSource(e.target.files?.[0])} />
        </label>
        <span className={sourceLoaded ? styles.accepted : styles.pending}>
          {sourceLoaded ? "REAL SOURCE LOADED" : "NO PRODUCT SCREEN — CONCEPT ONLY"}
        </span>
      </div>
      {error && <div className={styles.error} role="alert">{error}</div>}
      <p className={styles.foot}>Render CLI: <code>npm run motion:cinema -- out/promptence-cinema.mp4 --screen /path/to/approved-screen.png</code>.
        The MP4 renderer runs on a workstation with working WebGL, Chromium and FFmpeg.
        This stage does not claim a finished commercial or quality approval.</p>
    </section>}
  </main>;
}
