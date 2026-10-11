import type { MotionBrand } from "./studio";

/** Origin-local IndexedDB library; no server, browser extension or vendor API.
 * Blob bytes are *never* included in Motion project JSON or Chat Pack.
 */
export type MediaRole="screenshot"|"image"|"logo"|"video"|"voice"|"music"|"sfx";
export interface LocalMediaRecord{
  id:string;name:string;brand:MotionBrand;role:MediaRole;
  mime:string;size:number;created:number;approved:boolean;blob:Blob;
}
const DB="margaryan-motion-local-media-v1",STORE="assets";
const MAX_ITEMS=40;
const LIMITS:Record<MediaRole,number>={
  screenshot:12_000_000,image:12_000_000,logo:12_000_000,
  video:100_000_000,voice:15_000_000,music:30_000_000,sfx:20_000_000
};
const ROLES:MediaRole[]=["screenshot","image","logo","video","voice","music","sfx"];
const allowed=(role:MediaRole,mime:string)=>{
  if(["screenshot","image","logo"].includes(role))return ["image/png","image/jpeg","image/webp"].includes(mime);
  if(role==="video")return ["video/mp4","video/webm","video/quicktime"].includes(mime);
  return mime.startsWith("audio/");
};
function database():Promise<IDBDatabase>{
  if(typeof indexedDB==="undefined")throw Error("IndexedDB unavailable. Use a regular browser window, not private browsing.");
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB,1);
    request.onupgradeneeded=()=>{
      const db=request.result;
      if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:"id"});
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(new Error("Browser media storage blocked or unavailable"));
    request.onblocked=()=>reject(new Error("Media library is locked by another tab"));
  });
}
function transaction<T>(mode:IDBTransactionMode,action:(store:IDBObjectStore)=>IDBRequest<T>):Promise<T>{
  return database().then(db=>new Promise<T>((resolve,reject)=>{
    const tx=db.transaction(STORE,mode);
    const request=action(tx.objectStore(STORE));
    let value:T;
    request.onsuccess=()=>{value=request.result;};
    request.onerror=()=>reject(new Error("Media library operation failed"));
    tx.oncomplete=()=>{db.close();resolve(value);};
    tx.onerror=()=>{db.close();reject(new Error("Local storage quota reached or IndexedDB transaction failed"));};
    tx.onabort=()=>{db.close();reject(new Error("Media library transaction aborted"));};
  }));
}
export async function listLocalMedia():Promise<LocalMediaRecord[]> {
  return (await transaction("readonly",store=>store.getAll() as IDBRequest<LocalMediaRecord[]>))
    .sort((a,b)=>b.created-a.created);
}
export async function getLocalMedia(id:string):Promise<LocalMediaRecord|undefined> {
  return transaction("readonly",store=>store.get(id) as IDBRequest<LocalMediaRecord|undefined>);
}
export async function saveLocalMedia(
  file:File,brand:MotionBrand,role:MediaRole
):Promise<LocalMediaRecord>{
  if(!ROLES.includes(role))throw Error("Invalid media role");
  if(file.size<100||file.size>LIMITS[role])throw Error("File must be 100B–"+Math.round(LIMITS[role]/1e6)+" MB");
  if(!allowed(role,file.type))throw Error("Unsupported media format for "+role+". Please use PNG/JPEG/WebP, MP4/WebM/MOV, or browser-supported audio.");
  const records=await listLocalMedia();
  if(records.length>=MAX_ITEMS)throw Error("Local media library is full: remove an older item (max 40)");
  const data:LocalMediaRecord={
    id:crypto.randomUUID(),name:file.name.slice(0,150),brand,role,
    mime:file.type,size:file.size,created:Date.now(),approved:false,blob:file
  };
  await transaction("readwrite",store=>store.put(data));
  return data;
}
export async function approveLocalMedia(id:string,approved:boolean){
  const record=await getLocalMedia(id);
  if(!record)throw Error("Media no longer exists");
  await transaction("readwrite",store=>store.put({...record,approved}));
}
export async function removeLocalMedia(id:string){
  await transaction("readwrite",store=>store.delete(id));
}
export function mediaAsFile(record:LocalMediaRecord){
  return new File([record.blob],record.name,{type:record.mime,lastModified:record.created});
}
