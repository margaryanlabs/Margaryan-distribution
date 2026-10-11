import type { MotionAudioEdit, MotionProject } from "./studio";

/** Durable edit decisions only. Source audio bytes stay strictly browser-local. */
export const DEFAULT_AUDIO_EDIT: MotionAudioEdit = {
  voiceStart: 0, voiceTrim: 0, voiceFadeIn: .08, voiceFadeOut: .18,
  musicTrim: 0, musicFadeIn: .4, musicFadeOut: .65
};

export function sanitizeAudioEdit(input: unknown): MotionAudioEdit {
  const raw = input && typeof input === "object" && !Array.isArray(input)
    ? input as Record<string, unknown> : {};
  const bound = (key:keyof MotionAudioEdit,limit:number) => {
    const n=raw[key];
    return typeof n==="number"&&Number.isFinite(n)
      ? Math.max(0,Math.min(limit,Number(n.toFixed(3))))
      : DEFAULT_AUDIO_EDIT[key];
  };
  return {
    voiceStart: bound("voiceStart",64),
    voiceTrim: bound("voiceTrim",3600),
    voiceFadeIn: bound("voiceFadeIn",5),
    voiceFadeOut: bound("voiceFadeOut",5),
    musicTrim: bound("musicTrim",3600),
    musicFadeIn: bound("musicFadeIn",5),
    musicFadeOut: bound("musicFadeOut",5)
  };
}
export interface AudioWindow {
  start: number;
  end: number;
  availableSeconds: number;
  fileSeconds: number | null;
  usableSeconds: number;
  overflowSeconds: number;
  ready: boolean;
}
export function voiceWindow(duration:number,audio:MotionAudioEdit,fileSeconds:number|null):AudioWindow {
  const start=Math.min(duration,Math.max(0,audio.voiceStart));
  const availableSeconds=Math.max(0,duration-start);
  const usableSeconds=fileSeconds===null?0:Math.max(0,fileSeconds-audio.voiceTrim);
  const overflowSeconds=fileSeconds===null?0:Math.max(0,usableSeconds-availableSeconds+.05);
  return {
    start,
    end:Math.min(duration,start+usableSeconds),
    availableSeconds,
    fileSeconds,
    usableSeconds,
    overflowSeconds,
    ready:fileSeconds!==null&&usableSeconds>.05&&availableSeconds>.05&&overflowSeconds===0
  };
}
export function shotSpans(project:MotionProject) {
  let cursor=0;
  return project.scenes.map((scene,index)=>{
    const start=cursor;cursor+=scene.seconds;
    return {scene,index,start,end:cursor,width:scene.seconds};
  });
}
