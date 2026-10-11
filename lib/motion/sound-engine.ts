import { durationOf, sceneAt, type MotionProject } from "./studio";
import { sanitizeAudioEdit, voiceWindow } from "./timeline-edit";

/**
 * Original procedural synthesizer. No audio files, API keys, samples or 3rd-party IP.
 * Creates a short ambient score mixed directly into the captured canvas stream.
 */
export interface ProceduralAudioSession {
  track: MediaStreamTrack;
  close(): Promise<void>;
}
const NOTES = [55, 65.41, 73.42, 82.41, 98.00, 110, 130.81];
export async function createProceduralSoundtrack(
  project: MotionProject,
  options: { voiceover?: File | null; music?: File | null; synth?: boolean; musicGain?: number; narrationGain?: number } = {}
): Promise<ProceduralAudioSession> {
  if (typeof AudioContext === "undefined") throw new Error("Web Audio not supported.");
  const context = new AudioContext({ sampleRate: 44_100 });
  try {
    const destination = context.createMediaStreamDestination();
    const master = context.createGain();
    master.gain.setValueAtTime(options.voiceover ? 0.065 : 0.26, context.currentTime);
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -19;
    compressor.knee.value = 22;
    compressor.ratio.value = 8;
    compressor.attack.value = .009;
    compressor.release.value = .2;
    master.connect(compressor); compressor.connect(destination);

    const start = context.currentTime + .4;
    const length = durationOf(project);
    const edit = sanitizeAudioEdit(project.audio);
    const root = project.brand === "veto" ? 0 : project.brand === "promptence" ? 2 : project.brand === "raios" ? 3 : 4;
    if (options.voiceover) {
      if (options.voiceover.size > 15_000_000) throw new Error("Voiceover must be under 15 MB");
      if (!options.voiceover.type.startsWith("audio/")) throw new Error("Upload an MP3, WAV, M4A or other supported audio file");
      const decoded = await context.decodeAudioData(await options.voiceover.arrayBuffer());
      const window=voiceWindow(length,edit,decoded.duration);
      if(!window.ready) {
        throw new Error("NARRATION TIMELINE: voice "+window.usableSeconds.toFixed(2)+
          "s starting at "+edit.voiceStart.toFixed(2)+"s cannot fit a "+length.toFixed(2)+
          "s film. Move the voice track, trim its beginning or extend the film.");
      }
      const voice=context.createBufferSource();
      voice.buffer=decoded;
      const voiceGain=context.createGain();
      const level=Math.max(0,Math.min(1.5,options.narrationGain ?? .82));
      const cueStart=start+window.start;
      const playable=window.usableSeconds;
      const fadeIn=Math.min(playable/2,edit.voiceFadeIn);
      const fadeOut=Math.min(playable/2,edit.voiceFadeOut);
      voiceGain.gain.setValueAtTime(fadeIn>.001?0:level,cueStart);
      if(fadeIn>.001)voiceGain.gain.linearRampToValueAtTime(level,cueStart+fadeIn);
      voiceGain.gain.setValueAtTime(level,cueStart+Math.max(fadeIn,playable-fadeOut));
      if(fadeOut>.001)voiceGain.gain.linearRampToValueAtTime(0,cueStart+playable);
      voice.connect(voiceGain); voiceGain.connect(compressor);
      voice.start(cueStart,edit.voiceTrim);
      voice.stop(cueStart+playable+.01);
    }
    if(options.music) {
      if(options.music.size>30_000_000)throw new Error("Licensed music must be under 30 MB");
      if(!options.music.type.startsWith("audio/"))throw new Error("Music file must be an audio recording");
      const recording=await context.decodeAudioData(await options.music.arrayBuffer());
      if(recording.duration<.1 || edit.musicTrim>=recording.duration-.1)
        throw new Error("Music trim must leave at least 0.1s of audio.");
      const source=context.createBufferSource();
      source.buffer=recording;
      source.loop=recording.duration-edit.musicTrim<length;
      source.loopStart=edit.musicTrim;
      source.loopEnd=recording.duration;
      const musicGain=context.createGain();
      // Conservative narration side-chain: music never competes with spoken words.
      const requested=Math.max(0,Math.min(1,options.musicGain ?? .5));
      const level=requested*(options.voiceover?.11:.32);
      musicGain.gain.setValueAtTime(0,context.currentTime);
      musicGain.gain.setValueAtTime(0,start);
      const fadeIn=Math.min(length/2,edit.musicFadeIn);
      const fadeOut=Math.min(length/2,edit.musicFadeOut);
      musicGain.gain.linearRampToValueAtTime(level,start+Math.max(.001,fadeIn));
      musicGain.gain.setValueAtTime(level,start+Math.max(fadeIn,length-fadeOut));
      musicGain.gain.linearRampToValueAtTime(0,start+length);
      source.connect(musicGain);
      musicGain.connect(compressor);
      source.start(start,edit.musicTrim);
      source.stop(start+length);
    }
    function oscillator(note: number, wave: OscillatorType, t: number, seconds: number, volume: number, slide = 0) {
      const node = context.createOscillator();
      const level = context.createGain();
      node.type = wave;
      node.frequency.setValueAtTime(note, t);
      if (slide) node.frequency.exponentialRampToValueAtTime(Math.max(20, note + slide), t + seconds);
      level.gain.setValueAtTime(.0001, t);
      level.gain.exponentialRampToValueAtTime(Math.max(.0002, volume), t + Math.min(.035, seconds * .16));
      level.gain.exponentialRampToValueAtTime(.0001, t + seconds);
      node.connect(level); level.connect(master);
      node.start(t); node.stop(t + seconds + .05);
    }
    if (options.synth !== false) {
    // Drone foundations: restrained cinema textures, always below foreground typography.
    for (let i = 0; i < Math.ceil(length / 3); i++) {
      const step = start + i * 3;
      const span = Math.min(length - i * 3, 3.2);
      if (span <= .05) break;
      const note = NOTES[(root + Math.floor(i / 2)) % NOTES.length];
      oscillator(note, "sine", step, span, .18);
      oscillator(note * 1.5, "triangle", step, span, .035);
    }
    // Rhythm: brief synthetic low pulses placed on a fixed grid for reproducibility.
    const beat = project.style === "kinetic" ? .43 : project.style === "technical" ? .62 : .72;
    for (let t = 0; t < length; t += beat) {
      const { scene } = sceneAt(project, t);
      oscillator(scene.kind === "kinetic" ? 108 : 84, "sine", start + t, .2, .11, -57);
      if (scene.kind === "network" && Math.floor(t / beat) % 2 === 1) {
        oscillator(220, "triangle", start + t, .09, .025, -60);
      }
    }
    // Scene-cut markers; the beat feels attached to the edit rather than arbitrary music.
    let cursor = 0;
    for (let index = 0; index < project.scenes.length; index++) {
      const scene = project.scenes[index];
      if (cursor < length) {
        oscillator(240 + index * 34, "sine", start + cursor, .48, .08, -160);
        oscillator(80, "triangle", start + cursor, .55, .055, -38);
      }
      cursor += scene.seconds;
    }
    }
    await context.resume();
    const track = destination.stream.getAudioTracks()[0];
    if (!track) throw new Error("No audio track was produced");
    return {
      track,
      async close() {
        track.stop();
        await context.close().catch(() => undefined);
      }
    };
  } catch (error) {
    await context.close().catch(() => undefined);
    throw error;
  }
}
