/** Small standards-compliant ZIP/STORED writer+reader for local Motion bundles.
 * No external dependencies, server upload, code execution, decompression or
 * network access. Rejects ZIP slip, duplicates, ZIP64, deflate and excessive
 * sizes. Compressed ZIPs are deliberately unsupported in v1.
 */
const encoder=new TextEncoder(),decoder=new TextDecoder("utf-8",{fatal:true});
const MAX_ZIP_BYTES=128_000_000,MAX_ENTRIES=22;
const SIG_LOCAL=0x04034b50,SIG_CENTRAL=0x02014b50,SIG_END=0x06054b50;
const table=Array.from({length:256},(_,i)=>{
  let c=i;for(let j=0;j<8;j++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);return c>>>0;
});
export function zipCRC32(bytes:Uint8Array):number{
  let crc=0xffffffff;
  for(let i=0;i<bytes.byteLength;i++)crc=table[(crc^bytes[i])&255]^(crc>>>8);
  return (crc^0xffffffff)>>>0;
}
function nameSafe(name:string):boolean{
  return name.length>0&&name.length<=150&&/^[a-zA-Z0-9._/-]+$/.test(name)&&
    !name.startsWith("/")&&!name.includes("//")&&!name.split("/").some(s=>s==="."||s===".."||!s);
}
export interface MotionZipEntry{name:string;body:Blob}
const u16=(d:DataView,off:number,val:number)=>d.setUint16(off,val,true);
const u32=(d:DataView,off:number,val:number)=>d.setUint32(off,val>>>0,true);
export async function makeMotionZip(entries:MotionZipEntry[]):Promise<Blob>{
  if(entries.length<1||entries.length>MAX_ENTRIES)throw Error("Portable pack must contain 1–22 items");
  if(new Set(entries.map(e=>e.name)).size!==entries.length||entries.some(e=>!nameSafe(e.name)))
    throw Error("Portable pack has duplicate or unsafe file names");
  let offset=0,centralBytes=0;
  const chunks:BlobPart[]=[],centers:Uint8Array[]=[];
  for(const item of entries){
    if(item.body.size<1||item.body.size>MAX_ZIP_BYTES)throw Error("Portable asset exceeds safety limit");
    const name=encoder.encode(item.name);
    const checksum=zipCRC32(new Uint8Array(await item.body.arrayBuffer()));
    const local=new Uint8Array(30+name.length),l=new DataView(local.buffer);
    u32(l,0,SIG_LOCAL);u16(l,4,20);u16(l,6,0);u16(l,8,0);
    u32(l,14,checksum);u32(l,18,item.body.size);u32(l,22,item.body.size);
    u16(l,26,name.length);local.set(name,30);
    const center=new Uint8Array(46+name.length),c=new DataView(center.buffer);
    u32(c,0,SIG_CENTRAL);u16(c,4,20);u16(c,6,20);u16(c,8,0);u16(c,10,0);
    u32(c,16,checksum);u32(c,20,item.body.size);u32(c,24,item.body.size);
    u16(c,28,name.length);u32(c,42,offset);center.set(name,46);
    centers.push(center);centralBytes+=center.length;
    chunks.push(local,item.body);offset+=local.length+item.body.size;
    if(offset+centralBytes+22>MAX_ZIP_BYTES)throw Error("Portable pack exceeds 128MB limit. Use fewer source clips.");
  }
  const end=new Uint8Array(22),e=new DataView(end.buffer);
  u32(e,0,SIG_END);u16(e,8,entries.length);u16(e,10,entries.length);
  u32(e,12,centralBytes);u32(e,16,offset);
  const archive=new Blob([...chunks,...centers,end],{type:"application/zip"});
  if(archive.size>MAX_ZIP_BYTES)throw Error("Portable pack is too big for safe browser transfer");
  return archive;
}
export async function readMotionZip(file:Blob):Promise<Map<string,Blob>>{
  if(file.size<22||file.size>MAX_ZIP_BYTES)throw Error("Portable ZIP must be under 128 MB");
  const bytes=new Uint8Array(await file.arrayBuffer()),view=new DataView(bytes.buffer);
  // Our v1 archives have no ZIP comment; require an exact EOCD at EOF.
  const eocd=bytes.byteLength-22;
  if(view.getUint32(eocd,true)!==SIG_END||view.getUint16(eocd+20,true)!==0)
    throw Error("Invalid portable pack: missing exact ZIP footer");
  const n=view.getUint16(eocd+10,true),start=view.getUint32(eocd+16,true),
    cdSize=view.getUint32(eocd+12,true);
  if(n<1||n>MAX_ENTRIES||view.getUint16(eocd+8,true)!==n||
    view.getUint16(eocd+4,true)!==0||view.getUint16(eocd+6,true)!==0||
    start+cdSize!==eocd)throw Error("Invalid ZIP central directory or too many files");
  const files=new Map<string,Blob>();
  let pos=start;
  for(let i=0;i<n;i++){
    if(pos+46>eocd||view.getUint32(pos,true)!==SIG_CENTRAL)
      throw Error("Invalid ZIP entry header");
    const flags=view.getUint16(pos+8,true),method=view.getUint16(pos+10,true);
    const crc=view.getUint32(pos+16,true);
    const compressed=view.getUint32(pos+20,true),raw=view.getUint32(pos+24,true);
    const namelen=view.getUint16(pos+28,true),extra=view.getUint16(pos+30,true),
      comment=view.getUint16(pos+32,true),localOffset=view.getUint32(pos+42,true);
    const end=pos+46+namelen+extra+comment;
    if(flags!==0||method!==0||compressed!==raw||!namelen||end>eocd||
      localOffset+30>start)throw Error("Unsupported ZIP entry (no encryption or compression)");
    const name=decoder.decode(bytes.subarray(pos+46,pos+46+namelen));
    if(!nameSafe(name)||files.has(name))throw Error("Unsafe or duplicate bundle file name");
    if(view.getUint32(localOffset,true)!==SIG_LOCAL||
      view.getUint16(localOffset+8,true)!==0||view.getUint16(localOffset+6,true)!==0)
      throw Error("Local ZIP header mismatch");
    const localNameLen=view.getUint16(localOffset+26,true),localExtra=view.getUint16(localOffset+28,true);
    const nameStart=localOffset+30,bodyStart=nameStart+localNameLen+localExtra;
    if(localNameLen!==namelen||bodyStart+raw>start||
      decoder.decode(bytes.subarray(nameStart,nameStart+localNameLen))!==name||
      view.getUint32(localOffset+14,true)!==crc||
      view.getUint32(localOffset+18,true)!==raw||
      view.getUint32(localOffset+22,true)!==raw)
      throw Error("Tampered or truncated ZIP local entry");
    const body=bytes.subarray(bodyStart,bodyStart+raw);
    if(zipCRC32(body)!==crc)throw Error("Source media checksum mismatch: "+name);
    files.set(name,new Blob([body]));
    pos=end;
  }
  if(pos!==eocd)throw Error("Unexpected ZIP directory data");
  return files;
}
