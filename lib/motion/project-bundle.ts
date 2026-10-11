import { sanitizeMotionProject, type MotionBrand, type MotionProject } from "./studio";
import {
  approveLocalMedia,getLocalMedia,removeLocalMedia,saveLocalMedia,
  type MediaRole
} from "./local-media";
import { makeMotionZip,readMotionZip, type MotionZipEntry } from "./zip-store";

/** Offline project+media envelope. Never sent to a vendor, server or public
 * GitHub chat channel. Chat Packs stay text-only, excluding actual source bytes.
 */
export const BUNDLE_KIND="margaryan-motion-portable-v1";
const MAX_MANIFEST=60_000,MAX_MEDIA=18;
type TrackRole="source"|"voice"|"music";
export interface BundleEntry {
  kind:TrackRole;
  sourceId:string;
  name:string;
  mime:string;
  role:MediaRole;
  size:number;
  path:string;
}
export interface BundleManifest {
  format:typeof BUNDLE_KIND;version:1;
  project:MotionProject;
  assets:BundleEntry[];
}
export interface BundleReview {
  title:string;brand:MotionBrand;shots:number;seconds:number;
  assets:number;hasVoice:boolean;hasMusic:boolean;bytes:number;
}
const safeId=(id:string)=>/^[\w-]{6,100}$/.test(id);
const mimeOkay=(role:MediaRole,mime:string)=>
  role==="video"?["video/mp4","video/webm","video/quicktime"].includes(mime):
  ["screenshot","image","logo"].includes(role)?
    ["image/png","image/jpeg","image/webp"].includes(mime):mime.startsWith("audio/");
function checkEntry(e:BundleEntry){
  if(!safeId(e.sourceId)||e.name.length<1||e.name.length>150||
    /[\u0000-\u001f]/.test(e.name)||e.size<100||
    e.size>(e.role==="video"?100_000_000:e.role==="voice"?15_000_000:
      e.role==="music"?30_000_000:12_000_000)||
    !mimeOkay(e.role,e.mime))
    throw Error("Invalid portable media metadata: "+e.sourceId);
  if(e.kind==="source"){
    if(e.path!=="assets/"+e.sourceId+".bin"||
      !["image","video","screenshot","logo"].includes(e.role))
      throw Error("Unsafe source mapping in portable media manifest");
  }else if(e.path!=="audio/"+e.kind+".bin"||e.role!==e.kind)
    throw Error("Unsupported portable audio track");
}
function validateManifest(value:unknown,files:Map<string,Blob>):BundleManifest{
  if(!value||typeof value!=="object")throw Error("Missing portable manifest");
  const raw=value as Record<string,unknown>;
  if(raw.format!==BUNDLE_KIND||raw.version!==1||!Array.isArray(raw.assets)||
    raw.assets.length>MAX_MEDIA||!raw.project)
    throw Error("Unrecognized Motion production bundle or too many sources");
  const project=sanitizeMotionProject(raw.project);
  if(project.scenes.some(s=>s.kind==="screen"&&!s.mediaId))
    throw Error("Legacy screen without an approved local asset cannot be restored from this pack");
  const assets=raw.assets as BundleEntry[];
  const referenced=new Set<string>(project.scenes.flatMap(s=>[
    ...(s.kind==="screen"&&s.mediaId?[s.mediaId]:[]),
    ...(s.overlayMediaId?[s.overlayMediaId]:[])
  ]));
  const found=new Set<string>(),entries=new Set(["manifest.json"]);
  for(const asset of assets){
    if(!asset||typeof asset!=="object")throw Error("Invalid asset in portable manifest");
    checkEntry(asset);
    if(entries.has(asset.path))throw Error("Duplicate media entry in portable manifest");
    entries.add(asset.path);
    const blob=files.get(asset.path);
    if(!blob||blob.size!==asset.size)throw Error("Missing or truncated media: "+asset.name);
    if(asset.kind==="source"){
      if(found.has(asset.sourceId)||!referenced.has(asset.sourceId))
        throw Error("Unreferenced or duplicate source media: "+asset.name);
      if(project.scenes.some(s=>s.overlayMediaId===asset.sourceId)&&
         !["image","screenshot","logo"].includes(asset.role))
        throw Error("Picture-in-picture overlay must use an original still image");
      found.add(asset.sourceId);
    }
    if(asset.kind!=="source"&&assets.filter(x=>x.kind===asset.kind).length!==1)
      throw Error("Duplicate "+asset.kind+" audio tracks");
  }
  for(const id of referenced)if(!found.has(id))throw Error("Missing project source "+id);
  if(files.size!==entries.size)throw Error("Unexpected ZIP contents; only manifest and declared sources are permitted");
  return{format:BUNDLE_KIND,version:1,project,assets};
}
async function unpack(file:Blob):Promise<{manifest:BundleManifest;files:Map<string,Blob>}>{
  const files=await readMotionZip(file);
  const data=files.get("manifest.json");
  if(!data||data.size>MAX_MANIFEST)throw Error("Missing or oversized portable manifest");
  const manifest=validateManifest(JSON.parse(await data.text()),files);
  return{manifest,files};
}
export async function createMotionBundle(
  projectInput:MotionProject,voice:File|null,music:File|null
):Promise<Blob>{
  const project=sanitizeMotionProject(projectInput);
  const items:BundleEntry[]=[],contents:MotionZipEntry[]=[];
  const ids=[...new Set(project.scenes.flatMap(s=>[
    ...(s.kind==="screen"&&s.mediaId?[s.mediaId]:[]),
    ...(s.overlayMediaId?[s.overlayMediaId]:[])
  ]))];
  if(project.scenes.some(s=>s.kind==="screen"&&!s.mediaId))
    throw Error("This film has a legacy brand-wide screenshot. Attach it in Media Library to a specific shot first.");
  if(ids.length>16)throw Error("More than sixteen local source files");
  for(const id of ids){
    const record=await getLocalMedia(id);
    if(!record||!record.approved||record.brand!==project.brand)
      throw Error("Source "+id+" needs an approved local media file before portable export");
    if(!["screenshot","image","logo","video"].includes(record.role))
      throw Error("Unsupported shot media role");
    if(project.scenes.some(scene=>scene.overlayMediaId===id)&&record.role==="video")
      throw Error("The independent image overlay cannot contain video footage");
    const entry:BundleEntry={kind:"source",sourceId:id,name:record.name,mime:record.mime,
      role:record.role,size:record.size,path:"assets/"+id+".bin"};
    checkEntry(entry);items.push(entry);
    contents.push({name:entry.path,body:record.blob});
  }
  for(const [kind,file] of [["voice",voice],["music",music]] as const){
    if(!file)continue;
    const entry:BundleEntry={kind,sourceId:"track-"+kind,name:file.name.slice(0,150),
      mime:file.type,role:kind,size:file.size,path:"audio/"+kind+".bin"};
    checkEntry(entry);items.push(entry);contents.push({name:entry.path,body:file});
  }
  if(items.length>MAX_MEDIA)throw Error("Too many files in portable project");
  const manifest:BundleManifest={format:BUNDLE_KIND,version:1,project,assets:items};
  const metadata=new Blob([JSON.stringify(manifest,null,2)],{type:"application/json"});
  if(metadata.size>MAX_MANIFEST)throw Error("Project metadata is too large for portable bundle");
  return makeMotionZip([{name:"manifest.json",body:metadata},...contents]);
}
export async function inspectMotionBundle(file:Blob):Promise<BundleReview>{
  const {manifest}=await unpack(file);
  return{
    title:manifest.project.title,brand:manifest.project.brand,
    shots:manifest.project.scenes.length,
    seconds:manifest.project.scenes.reduce((n,s)=>n+s.seconds,0),
    assets:manifest.assets.filter(a=>a.kind==="source").length,
    hasVoice:manifest.assets.some(a=>a.kind==="voice"),
    hasMusic:manifest.assets.some(a=>a.kind==="music"),
    bytes:file.size
  };
}
export interface RestoredMotionBundle{
  project:MotionProject;
  voice:File|null;
  music:File|null;
  restoredIds:string[];
}
/** Call only after human confirms that the imported materials can be used.
 * Imported source IDs are *always* regenerated so another project cannot
 * replace existing library assets. A failed import rolls back new copies.
 */
export async function restoreMotionBundle(file:Blob,confirmedRights:boolean):Promise<RestoredMotionBundle>{
  if(confirmedRights!==true)throw Error("Confirm ownership or usage permission for this media before import");
  const {manifest,files}=await unpack(file);
  const remap=new Map<string,string>(),restoredIds:string[]=[];
  let voice:File|null=null,music:File|null=null;
  try{
    for(const asset of manifest.assets){
      const blob=files.get(asset.path)!;
      const source=new File([blob],asset.name,{type:asset.mime,lastModified:Date.now()});
      if(asset.kind==="source"){
        const saved=await saveLocalMedia(source,manifest.project.brand,asset.role);
        restoredIds.push(saved.id);
        await approveLocalMedia(saved.id,true);
        remap.set(asset.sourceId,saved.id);
      }else if(asset.kind==="voice")voice=source;
      else music=source;
    }
    const updated=sanitizeMotionProject({...manifest.project,
      scenes:manifest.project.scenes.map(scene=>({
        ...scene,
        mediaId:scene.mediaId?remap.get(scene.mediaId):undefined,
        overlayMediaId:scene.overlayMediaId?remap.get(scene.overlayMediaId):undefined
      }))});
    if(updated.scenes.some(scene=>scene.kind==="screen"&&!scene.mediaId))
      throw Error("Asset remapping failed; project was not restored");
    if(updated.scenes.some((scene,index)=>manifest.project.scenes[index].overlayMediaId&&!scene.overlayMediaId))
      throw Error("Overlay media remapping failed; project was not restored");
    return{project:updated,voice,music,restoredIds};
  }catch(error){
    await Promise.allSettled(restoredIds.map(id=>removeLocalMedia(id)));
    throw error;
  }
}
