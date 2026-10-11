import type {MotionProject} from "./studio";

/**
 * Explicit browser-only scope: 720p/24fps REAL-TIME Canvas visuals.
 * No media pretending, no remote URLs, no licensed/microphone audio.
 * The Chromium/FFmpeg workstation Master supports real source media.
 */
export const MAX_BROWSER_FILM_SECONDS=192;
export type BrowserSegment={project:MotionProject;start:number;end:number};
export type BrowserSequencePlan={
  brand:MotionProject["brand"];
  format:MotionProject["format"];
  total:number;
  segments:BrowserSegment[];
};
export function planBrowserFeature(projects:MotionProject[]):BrowserSequencePlan{
  if(!Array.isArray(projects)||!projects.length||projects.length>8)
    throw Error("Browser film needs 1–8 saved chapters");
  const brand=projects[0].brand,format=projects[0].format;
  if(!["portrait","square","landscape"].includes(format))
    throw Error("Unsupported browser film aspect ratio");
  let duration=0;
  const segments:BrowserSegment[]=[];
  for(const [index,project] of projects.entries()){
    if(project.brand!==brand||project.format!==format)
      throw Error("Every chapter needs one brand and film format");
    if(!Array.isArray(project.scenes)||project.scenes.length<1||project.scenes.length>8)
      throw Error("Chapter "+(index+1)+" needs 1–8 real scenes");
    if(project.signatureFilm)
      throw Error("Signature-film art needs the full workstation Master");
    let chapterSeconds=0;
    for(const shot of project.scenes){
      if(shot.kind==="screen"||shot.mediaId||shot.overlayMediaId)
        throw Error("Real source footage/image overlay needs the workstation Master with approved files");
      if(!Number.isFinite(shot.seconds)||shot.seconds<2||shot.seconds>8)
        throw Error("Invalid film scene duration");
      chapterSeconds+=shot.seconds;
    }
    segments.push({project,start:Number(duration.toFixed(3)),
      end:Number((duration+chapterSeconds).toFixed(3))});
    duration+=chapterSeconds;
  }
  if(duration>MAX_BROWSER_FILM_SECONDS+.01)
    throw Error("Browser export is limited to 192s. Use the workstation Master for longer films");
  return {segments,total:Number(duration.toFixed(3)),brand,format};
}
