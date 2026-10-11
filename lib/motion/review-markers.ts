/** Local director comments for human film reviews.
 * Never mistake a marker for technical QC or a customer's approval.
 * Review notes are deliberately excluded from public Chat Packs.
 */
export type MarkerPriority="note"|"fix"|"critical";
export type MarkerStatus="open"|"resolved";
export interface ReviewMarker{
  id:string;
  sceneId:string;
  shotIndex:number;
  atSeconds:number;
  /** Offset inside the original unique shot, used after reorders/trims. */
  localSeconds?:number;
  text:string;
  priority:MarkerPriority;
  status:MarkerStatus;
  createdAt:number;
}
export const REVIEW_MARKER_LIMIT=60;
const validPriorities=new Set(["note","fix","critical"]);
export function reviewProjectStorageKey(brand:string,title:string,seed?:number):string{
  const identity=brand+"\n"+title.trim().slice(0,140)+"\n"+(Number.isFinite(seed)?seed:"default");
  let h=2166136261;
  for(let i=0;i<identity.length;i++)h=Math.imul(h^identity.charCodeAt(i),16777619);
  return "motion-review-markers-v1-"+(h>>>0).toString(16).padStart(8,"0");
}
export function sanitizeReviewMarker(input:unknown):ReviewMarker|null{
  if(!input||typeof input!=="object"||Array.isArray(input))return null;
  const raw=input as Record<string,unknown>;
  if(typeof raw.id!=="string"||!/^[\w-]{8,100}$/.test(raw.id)||
    typeof raw.sceneId!=="string"||!/^[\w-]{2,100}$/.test(raw.sceneId)||
    !Number.isInteger(raw.shotIndex)||!(raw.shotIndex as number>=0)||
    (raw.shotIndex as number)>64||typeof raw.atSeconds!=="number"||
    !Number.isFinite(raw.atSeconds)||raw.atSeconds<0||raw.atSeconds>600||
    typeof raw.text!=="string"||!raw.text.trim()||
    !validPriorities.has(raw.priority as string)||!["open","resolved"].includes(raw.status as string)||
    typeof raw.createdAt!=="number"||!Number.isFinite(raw.createdAt))return null;
  const text=raw.text.replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim().slice(0,320);
  if(!text)return null;
  return{
    id:raw.id,sceneId:raw.sceneId,shotIndex:raw.shotIndex as number,
    atSeconds:Number(raw.atSeconds.toFixed(2)),
    ...(typeof raw.localSeconds==="number"&&Number.isFinite(raw.localSeconds)&&
      raw.localSeconds>=0&&raw.localSeconds<=8
      ?{localSeconds:Number(raw.localSeconds.toFixed(2))}:{}),text,
    priority:raw.priority as MarkerPriority,
    status:raw.status as MarkerStatus,
    createdAt:Math.max(0,Math.min(Date.now()+60_000,raw.createdAt))
  };
}
export function parseReviewMarkers(raw:unknown):ReviewMarker[]{
  if(!Array.isArray(raw))return [];
  const seen=new Set<string>();
  const result:ReviewMarker[]=[];
  for(const candidate of raw.slice(0,REVIEW_MARKER_LIMIT*3)){
    const marker=sanitizeReviewMarker(candidate);
    if(marker&&!seen.has(marker.id)){result.push(marker);seen.add(marker.id);}
    if(result.length===REVIEW_MARKER_LIMIT)break;
  }
  return result;
}
export function addReviewMarker(
  existing:ReviewMarker[],next:Omit<ReviewMarker,"status"|"createdAt">
):ReviewMarker[]{
  if(existing.length>=REVIEW_MARKER_LIMIT)throw Error("Maximum 60 reviewer notes per local film.");
  const newMarker=sanitizeReviewMarker({...next,status:"open",createdAt:Date.now()});
  if(!newMarker)throw Error("Reviewer note needs a selected scene and up to 320 characters of text.");
  return parseReviewMarkers([...existing,newMarker]);
}
export function updateReviewMarkerStatus(
  markers:ReviewMarker[],id:string,status:MarkerStatus
):ReviewMarker[]{
  if(!["open","resolved"].includes(status))throw Error("Invalid marker status.");
  return markers.map(m=>m.id===id?{...m,status}:m);
}
export function markerSceneIndex(
  marker:ReviewMarker,scenes:ReadonlyArray<{id:string}>
):number|null{
  // Match the original scene ID only when unique. An ambiguous duplicate
  // must be shown as unlinked, not silently jump to the wrong footage.
  const matches=scenes.flatMap((scene,i)=>scene.id===marker.sceneId?[i]:[]);
  if(matches.length===1)return matches[0];
  return null;
}
/** Current film timestamp follows a unique shot after shot-order changes. */
export function markerFilmTime(
  marker:ReviewMarker,scenes:ReadonlyArray<{id:string;seconds:number}>
):number|null{
  const index=markerSceneIndex(marker,scenes);
  if(index===null)return null;
  if(marker.localSeconds===undefined)return marker.atSeconds;
  const start=scenes.slice(0,index).reduce((sum,scene)=>sum+scene.seconds,0);
  const selected=scenes[index];
  return Number((start+Math.max(0,Math.min(selected.seconds-.05,
    marker.localSeconds))).toFixed(2));
}
export function reviewMarkersAsText(
  title:string,markers:ReviewMarker[],scenes:ReadonlyArray<{id:string;seconds:number}>
):string{
  const entries=[
    "MARGARYAN MOTION STUDIO / HUMAN REVIEW NOTES",
    "Film: "+title.slice(0,140),
    "These are operator comments, NOT audited film quality or client approval.",
    ""
  ];
  const ordering={critical:0,fix:1,note:2};
  for(const marker of [...markers].sort((a,b)=>
    (a.status===b.status?0:a.status==="open"?-1:1)||
    ordering[a.priority]-ordering[b.priority]||a.atSeconds-b.atSeconds
  )){
    const current=markerSceneIndex(marker,scenes);
    const currentTime=markerFilmTime(marker,scenes);
    entries.push("["+marker.status.toUpperCase()+"] ["+marker.priority.toUpperCase()+"] "+
      (current===null?"SHOT UNLINKED":"SHOT "+(current+1))+" / "+
      (currentTime===null?"ORPHAN":currentTime.toFixed(2)+"s")+" — "+marker.text);
  }
  return entries.join("\n")+"\n";
}
