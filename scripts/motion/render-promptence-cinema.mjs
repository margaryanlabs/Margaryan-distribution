#!/usr/bin/env node
/**
 * Authored 10-second 3D product film: Chromium/WebGL -> screenshot PNG -> FFmpeg.
 * Run after npm run dev. Requires Playwright installed locally and working WebGL.
 * This is not a fake video API and intentionally fails closed on GPU/context loss.
 */
import { mkdir, stat, writeFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";

export const FILM_DURATION = 10;
const validAudio = /.(wav|mp3|m4a|aac|flac)$/i;
const quote = s => String(s).slice(0, 800);
function options(args) {
  if (!args.length) throw Error("Usage: render-promptence-cinema.mjs out.mp4 [--screen real-capture.png] [--voice narration.wav] [--music licensed.mp3] [--concept] [--dry-run] [--fps 30|60]");
  const o = { output: resolve(args[0]), fps: 30, dryRun: false, concept: false,
    url: "http://127.0.0.1:3000/motion/cinema" };
  for (let i = 1; i < args.length; i++) {
    const key = args[i];
    if (key === "--concept") { o.concept = true; continue; }
    if (key === "--dry-run") { o.dryRun = true; continue; }
    if (!["--screen", "--voice", "--music", "--fps", "--url", "--chromium"].includes(key))
      throw Error("Unknown argument: " + key);
    const val = args[++i];
    if (!val || val.startsWith("--")) throw Error("Missing value after " + key);
    o[key.slice(2)] = val;
  }
  if (extname(o.output) !== ".mp4") throw Error("Output must be .mp4");
  if (![24, 30, 60].includes(Number(o.fps))) throw Error("FPS must be 24, 30 or 60");
  o.fps = Number(o.fps);
  const url = new URL(o.url);
  if (url.protocol !== "http:" || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
      url.pathname !== "/motion/cinema")
    throw Error("Cinema renderer only accepts local Studio /motion/cinema");
  if (!o.screen && !o.concept) throw Error("Real product screenshot is required. Use --screen owner-approved.png, or --concept for a clearly non-product draft.");
  return o;
}
async function sourceCheck(o) {
  if (o.screen) {
    const path = resolve(o.screen);
    const file = await stat(path);
    if (!file.isFile() || file.size < 1000 || file.size > 12_000_000 ||
        !/.(png|jpg|jpeg|webp)$/i.test(path))
      throw Error("Invalid product screenshot: PNG/JPEG/WebP under 12MB required");
    o.screen = path;
  }
  for (const key of ["voice", "music"]) {
    if (!o[key]) continue;
    const file = await stat(resolve(o[key]));
    if (!validAudio.test(o[key]) || !file.isFile() || file.size > 100_000_000)
      throw Error("Invalid approved audio file for " + key);
    o[key] = resolve(o[key]);
  }
}
function inspectMp4(file, fps, hasAudio) {
  const r = spawnSync("ffprobe", ["-v", "error", "-show_entries",
    "format=duration:stream=codec_type,codec_name,width,height,avg_frame_rate",
    "-of", "json", file], { encoding: "utf8", timeout: 60_000 });
  if (r.status !== 0) throw Error("Cannot verify MP4: " + quote(r.stderr));
  const meta = JSON.parse(r.stdout);
  const video = meta.streams?.find(s => s.codec_type === "video");
  const audio = meta.streams?.find(s => s.codec_type === "audio");
  const duration = Number(meta.format?.duration);
  if (!video || video.codec_name !== "h264" || video.width !== 1920 ||
      video.height !== 1080 || Math.abs(duration - FILM_DURATION) > .12)
    throw Error("Master video QA failed: " + JSON.stringify({video, duration}).slice(0, 600));
  if (hasAudio && (!audio || audio.codec_name !== "aac"))
    throw Error("Audio requested but mixed AAC stream is missing");
  const [num, den] = (video.avg_frame_rate || "0/1").split("/").map(Number);
  if (!den || Math.abs(num / den - fps) > .1) throw Error("Master FPS mismatch");
  return { duration, width: video.width, height: video.height, fps, audio: !!audio };
}
async function main() {
  const o = options(process.argv.slice(2));
  await sourceCheck(o);
  const plan = { format:"Promptence Cinema / WebGL v1", duration:FILM_DURATION,
    dimensions:"1920x1080", fps:o.fps, authenticProductSource:!!o.screen,
    demoOnly:!o.screen, voice:!!o.voice, licensedMusic:!!o.music,
    useGpuWebGl:true, description:"Own WebGL geometry/camera; exact time-seek offline frames." };
  if (o.dryRun) { console.log(JSON.stringify(plan, null, 2)); return; }
  if (spawnSync("ffmpeg", ["-version"], {stdio:"ignore"}).status !== 0)
    throw Error("FFmpeg is required for cinema mastering");
  await mkdir(dirname(o.output), {recursive:true});
  let chromium;
  try { ({ chromium } = await import("playwright")); }
  catch { throw Error("Playwright missing. Install with npm install --no-save playwright, then npx playwright install chromium."); }
  const browser = await chromium.launch({
    headless:true, executablePath:o.chromium ? resolve(o.chromium) : undefined,
    args:["--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader", "--disable-dev-shm-usage"]
  });
  let encoder;
  try {
    const page = await browser.newPage({viewport:{width:1920,height:1080}, deviceScaleFactor:1,
      reducedMotion:"no-preference", locale:"en-US"});
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    const url = new URL(o.url); url.searchParams.set("export", "1");
    const response = await page.goto(url.href, {waitUntil:"domcontentloaded",timeout:45_000});
    if (!response?.ok()) throw Error("Motion Cinema route inaccessible: " + response?.status());
    await page.waitForFunction(() => window.__motionCinemaReady === true ||
      !!window.__motionCinemaError, {timeout:45_000});
    const init = await page.evaluate(() => ({ready:window.__motionCinemaReady,
      error:window.__motionCinemaError}));
    if (!init.ready || init.error) throw Error("Real WebGL unavailable: " + init.error);
    if (o.screen) {
      await page.locator('input[type="file"]').setInputFiles(o.screen);
      await page.waitForFunction(() => window.__motionCinemaHasSource?.() === true,
        {timeout:20_000});
    }
    await page.evaluate(() => document.fonts.ready);
    const visual = page.locator("#cinema-film-frame");
    const box = await visual.boundingBox();
    if (!box || Math.round(box.width) !== 1920 || Math.round(box.height) !== 1080)
      throw Error("Cinema stage must be natively 1920x1080; refusing an upscaled fake master");
    if (errors.length) throw Error("Browser scene errors: " + errors.join("; "));
    const ff = ["-y","-hide_banner","-loglevel","error",
      "-f","image2pipe","-framerate",String(o.fps),"-vcodec","png","-i","pipe:0"];
    const inputs = [o.voice,o.music].filter(Boolean);
    for (const path of inputs) ff.push("-i",path);
    let audioMap = null;
    if (o.voice && o.music) {
      ff.push("-filter_complex",
        "[1:a]highpass=f=75,lowpass=f=15000,loudnorm=I=-16:TP=-1.5:LRA=10[v];" +
        "[2:a]volume=0.17,apad[m];[v][m]amix=inputs=2:duration=longest:normalize=0," +
        "atrim=0:10,apad,loudnorm=I=-16:TP=-1.5:LRA=11[a]");
      audioMap = "[a]";
    } else if (o.voice || o.music) {
      ff.push("-filter_complex","[1:a]apad,atrim=0:10,loudnorm=I=-16:TP=-1.5:LRA=11[a]");
      audioMap = "[a]";
    }
    ff.push("-map","0:v:0");
    if (audioMap) ff.push("-map",audioMap,"-c:a","aac","-b:a","256k");
    else ff.push("-an");
    ff.push("-c:v","libx264","-preset","medium","-crf","17",
      "-pix_fmt","yuv420p","-r",String(o.fps),"-t","10","-movflags","+faststart",o.output);
    encoder = spawn("ffmpeg", ff, {stdio:["pipe","ignore","pipe"]});
    let stderr = "";
    encoder.stderr.on("data", buf => { stderr = (stderr + String(buf)).slice(-4000); });
    encoder.stdin.on("error", () => {});
    const count = FILM_DURATION * o.fps;
    for (let i = 0; i < count; i++) {
      if (encoder.exitCode !== null) throw Error("FFmpeg exited: " + stderr);
      await page.evaluate(t => window.__motionCinemaSeek(t), i / o.fps);
      const buffer = await visual.screenshot({type:"png",animations:"disabled",timeout:45_000});
      if (buffer.length < 10_000) throw Error("Blank/corrupt WebGL screenshot at " + i);
      if (!encoder.stdin.write(buffer)) await once(encoder.stdin,"drain");
      if (errors.length) throw Error("WebGL runtime: " + errors.join("; "));
    }
    encoder.stdin.end();
    const [status] = await once(encoder, "close");
    if (status !== 0) throw Error("Cinema encoder: " + stderr);
    const info = inspectMp4(o.output, o.fps, inputs.length > 0);
    const report = {...info, ...plan, videoGenerated:true, verifiedWithFfprobe:true,
      publicationApproved:false, note:"Codec/frame checks do not establish commercial creative approval, factual claims, or music rights."};
    await writeFile(o.output.replace(/\.mp4$/, ".qa.json"), JSON.stringify(report,null,2)+"\n");
    console.log(JSON.stringify({ok:true, file:o.output, report},null,2));
  } finally {
    if (encoder && encoder.exitCode === null) encoder.kill("SIGTERM");
    await browser.close();
  }
}
main().catch(error => { console.error("CINEMA RENDER FAILED:",error.message); process.exitCode=1; });
