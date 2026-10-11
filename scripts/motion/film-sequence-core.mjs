/**
 * Motion Film Sequence v1: shared operator-only manifest validation.
 * Chapters remain real, independently reviewable <=8-shot MotionProjects.
 * No external URLs, code execution, model API or user media upload.
 */
export const SEQUENCE_VERSION = 1;
export const MAX_CHAPTERS = 8;
export const MAX_SHOTS_PER_CHAPTER = 8;
export const MAX_DURATION_SECONDS = MAX_CHAPTERS * MAX_SHOTS_PER_CHAPTER * 8;
const BRANDS = new Set([
  "veto","promptence","raios","labs","ingu","meqena","suren",
  "veto_private","veto_sport","armat","tun","hay_engine","reality_engine"
]);
const FORMATS = new Set(["portrait","square","landscape"]);
const LANGUAGES = new Set(["en","ru","hy"]);
const KINDS = new Set(["opener","statement","network","closer","kinetic","orbit","screen","spatial"]);
const isObject = value => Boolean(value) && typeof value === "object" && !Array.isArray(value);
function title(value,label,max=100){
  if(typeof value!=="string" || !value.trim() || value.length>max)
    throw Error(label+" must be a nonempty string under "+max+" characters");
  return value.trim();
}
function checkProject(raw,index,brand,format){
  const key="Chapter "+(index+1);
  if(!isObject(raw)||raw.version!==1)throw Error(key+" needs MotionProject v1");
  if(raw.brand!==brand||raw.format!==format)
    throw Error(key+" brand/format mismatch: every part must share one canvas/brand");
  if(raw.language!==undefined&&!LANGUAGES.has(raw.language))
    throw Error(key+" unsupported language");
  if(!Array.isArray(raw.scenes)||raw.scenes.length<1||raw.scenes.length>MAX_SHOTS_PER_CHAPTER)
    throw Error(key+" requires 1–8 valid shots");
  title(raw.title,key+" title");
  let duration=0;
  for(const [shotIndex,shot] of raw.scenes.entries()){
    const label=key+" shot "+(shotIndex+1);
    if(!isObject(shot)||!KINDS.has(shot.kind))throw Error(label+" invalid kind");
    title(shot.headline,label+" headline",105);
    if(typeof shot.support!=="string"||shot.support.length>180)
      throw Error(label+" support must be text under 180 characters");
    if(typeof shot.eyebrow!=="string"||shot.eyebrow.length>65)
      throw Error(label+" eyebrow must be text under 65 characters");
    if(typeof shot.seconds!=="number"||!Number.isFinite(shot.seconds)||
      shot.seconds<2||shot.seconds>8)throw Error(label+" duration must be 2–8 seconds");
    if(shot.mediaId!==undefined && (typeof shot.mediaId!=="string" ||
       !/^[\\w-]{6,100}$/.test(shot.mediaId) || shot.kind!=="screen"))
      throw Error(label+" invalid local media ID; approved media must be a screen scene");
    if(shot.mediaStart!==undefined && (typeof shot.mediaStart!=="number"||
       !Number.isFinite(shot.mediaStart)||shot.mediaStart<0||shot.mediaStart>3600))
      throw Error(label+" invalid local media inpoint");
    // Never accept a remote media URL masquerading as locally approved footage.
    for(const field of ["src","url","imageUrl","videoUrl","remoteFile","apiKey"]){
      if(Object.hasOwn(shot,field))throw Error(label+" cannot carry "+field);
    }
    duration+=shot.seconds;
  }
  if(duration>64.0001)throw Error(key+" exceeds 64-second single-chapter master");
  return Number(duration.toFixed(3));
}
export function validateFilmSequence(value){
  if(!isObject(value)||value.version!==SEQUENCE_VERSION||value.type!=="motion-sequence-v1")
    throw Error("Expected motion-sequence-v1 manifest");
  const filmTitle=title(value.title,"Film title");
  if(!BRANDS.has(value.brand)||!FORMATS.has(value.format))
    throw Error("Film must use a supported portfolio brand and format");
  if(!Array.isArray(value.chapters)||value.chapters.length<1||value.chapters.length>MAX_CHAPTERS)
    throw Error("Film needs 1–"+MAX_CHAPTERS+" chapters");
  const ids=new Set();
  let elapsed=0;
  const chapters=value.chapters.map((chapter,index)=>{
    if(!isObject(chapter))throw Error("Invalid chapter "+(index+1));
    const label=title(chapter.title,"Chapter "+(index+1)+" title");
    const id=chapter.id??"chapter-"+(index+1);
    if(typeof id!=="string"||!/^[a-z0-9-]{3,40}$/.test(id)||ids.has(id))
      throw Error("Chapter id must be unique ASCII lowercase / hyphens");
    ids.add(id);
    const seconds=checkProject(chapter.project,index,value.brand,value.format);
    const item={id,title:label,index:index+1,startSeconds:Number(elapsed.toFixed(3)),
      durationSeconds:seconds,shots:chapter.project.scenes.length,project:chapter.project};
    elapsed+=seconds;
    return item;
  });
  if(elapsed>MAX_DURATION_SECONDS+.01)throw Error("Film too long");
  if(value.expectedDurationSeconds!==undefined &&
      (!Number.isFinite(value.expectedDurationSeconds)||
       Math.abs(value.expectedDurationSeconds-elapsed)>.05))
    throw Error("Expected duration does not equal actual shot timing");
  return {
    version:SEQUENCE_VERSION,type:"motion-sequence-v1",title:filmTitle,
    brand:value.brand,format:value.format,chapters,
    durationSeconds:Number(elapsed.toFixed(3)),
    shots:chapters.reduce((sum,part)=>sum+part.shots,0)
  };
}
export function escapeConcatFilePath(filename) {
  if(typeof filename!=="string"||filename.includes("\\n")||filename.includes("\\r"))
    throw Error("Unsafe FFmpeg concat path");
  // ffconcat quoting escapes a single quote as: 'foo'\\''bar'
  return "file '"+filename.replaceAll("'","'\\\\''")+"'";
}
