import { sanitizeMotionProject, type MotionProject, type MotionScene } from "./studio";

/** Paste-first ChatGPT <-> Motion OS protocol: no model API, agent, URL execution,
 * HTML evaluation, untrusted external fetches or remotely supplied code.
 * A plan is always previewed before the editor state is mutated.
 */
export const CHAT_PROTOCOL = "motion-chat-v1" as const;
export type ChatScenePatch = {
  target: "scene"; index: number;
  set: Partial<Pick<MotionScene,"kind"|"eyebrow"|"headline"|"support"|"seconds"|
    "typographyScale"|"titleTreatment"|"camera"|"transition"|"intensity"|"voiceCue"|"productBeat">>;
};
export type ChatProjectPatch = {
  target:"project";
  set: Partial<Pick<MotionProject,"title"|"format"|"style"|"language"|"qualityMode"|"visual"|"audio">>;
};
export type ChatMotionPatch = {
  protocol:typeof CHAT_PROTOCOL; action:"patch";
  expectedBrand:MotionProject["brand"];
  expectedTitle:string;
  changes:Array<ChatScenePatch|ChatProjectPatch>;
};
export type ChatMotionCreate = {
  protocol:typeof CHAT_PROTOCOL; action:"create"; project:MotionProject;
};
export type ChatMotionPack = ChatMotionPatch|ChatMotionCreate;
export interface ChatOperatorPreview {
  action:"create"|"patch";
  next:MotionProject;
  changes:string[];
}

const SCENE_FIELDS=["kind","eyebrow","headline","support","seconds","typographyScale",
  "titleTreatment","camera","transition","intensity","voiceCue","productBeat"] as const;
const PROJECT_FIELDS=["title","format","style","language","qualityMode","visual","audio"] as const;
const allowedScene=new Set<string>(SCENE_FIELDS);
const allowedProject=new Set<string>(PROJECT_FIELDS);
const object=(value:unknown):value is Record<string,unknown> =>
  Boolean(value)&&typeof value==="object"&&!Array.isArray(value);
const canonical=(p:MotionProject)=>JSON.stringify(sanitizeMotionProject(p));

/** Build a lossless portable text payload. Actual media files are not included. */
export function createChatMotionPack(project:MotionProject):ChatMotionCreate {
  return {protocol:CHAT_PROTOCOL,action:"create",project:sanitizeMotionProject(project)};
}
export function createChatMotionPatch(project:MotionProject,index:number,change:ChatScenePatch["set"]):ChatMotionPatch {
  if(index<0||index>=project.scenes.length)throw Error("Shot not found");
  return {protocol:CHAT_PROTOCOL,action:"patch",expectedBrand:project.brand,
    expectedTitle:project.title,changes:[{target:"scene",index,set:change}]};
}
function ensureFields(set:Record<string,unknown>,allowed:Set<string>,label:string){
  const keys=Object.keys(set);
  if(!keys.length)throw Error(label+" has no changes");
  for(const key of keys)if(!allowed.has(key))throw Error("Unsupported "+label+" field: "+key);
  for(const [key,val] of Object.entries(set)){
    if(val===undefined||typeof val==="function")throw Error("Invalid "+key+" value");
  }
}
function applyChanges(current:MotionProject,raw:Record<string,unknown>):ChatOperatorPreview {
  if(raw.expectedBrand!==current.brand)throw Error("Patch targets "+String(raw.expectedBrand)+", current brand is "+current.brand);
  if(raw.expectedTitle!==current.title)throw Error("Patch expects a different project title. Reload the original project or generate a new patch.");
  if(!Array.isArray(raw.changes)||raw.changes.length<1||raw.changes.length>16)
    throw Error("Patch must contain 1–16 changes");
  let working:MotionProject=sanitizeMotionProject(current);
  const log:string[]=[];
  for(let i=0;i<raw.changes.length;i++){
    const c=raw.changes[i];
    if(!object(c)||!object(c.set))throw Error("Change "+(i+1)+" must have a set object");
    if(c.target==="scene"){
      const index=c.index;
      if(!Number.isInteger(index)||Number(index)<0||Number(index)>=working.scenes.length)
        throw Error("Invalid zero-based scene index in change "+(i+1));
      ensureFields(c.set,allowedScene,"scene");
      const before=working.scenes[index as number];
      const modified={...before,...c.set};
      working=sanitizeMotionProject({...working,
        scenes:working.scenes.map((scene,j)=>j===index?modified:scene)});
      const after=working.scenes[index as number];
      for(const key of Object.keys(c.set)){
        const k=key as keyof MotionScene;
        if(JSON.stringify(after[k])!==JSON.stringify(c.set[key]))
          throw Error("Rejected invalid "+key+" on shot "+(Number(index)+1));
      }
      log.push("Shot "+(Number(index)+1)+": "+Object.keys(c.set).join(", "));
    }else if(c.target==="project"){
      ensureFields(c.set,allowedProject,"project");
      // Merge nested audio/visual changes; don't silently reset unrelated faders.
      const next={...working,...c.set,
        audio:object(c.set.audio)?{...working.audio,...c.set.audio}:working.audio,
        visual:object(c.set.visual)?{...working.visual,...c.set.visual}:working.visual};
      const sanitized=sanitizeMotionProject(next);
      for(const key of Object.keys(c.set)){
        const resulting=(sanitized as unknown as Record<string,unknown>)[key];
        // Nested partials are permitted; every supplied nested property must survive.
        if(object(c.set[key])){
          if(!object(resulting))throw Error("Invalid "+key+" object");
          for(const nestedKey of Object.keys(c.set[key] as Record<string,unknown>)){
            if(JSON.stringify(resulting[nestedKey])!==JSON.stringify((c.set[key] as Record<string,unknown>)[nestedKey]))
              throw Error("Rejected invalid "+key+"."+nestedKey);
          }
        }else if(JSON.stringify(resulting)!==JSON.stringify(c.set[key]))
          throw Error("Rejected invalid "+key+" in project patch");
      }
      working=sanitized;
      log.push("Project: "+Object.keys(c.set).join(", "));
    }else throw Error("Unknown change target");
  }
  if(canonical(working)===canonical(current))throw Error("Patch changes nothing");
  return {action:"patch",next:working,changes:log};
}
export function previewChatMotionPack(input:unknown,current:MotionProject):ChatOperatorPreview {
  if(!object(input)||input.protocol!==CHAT_PROTOCOL)throw Error("Expected motion-chat-v1 pack");
  if(input.action==="create"){
    if(!object(input.project))throw Error("Create pack requires a project");
    if(!Array.isArray(input.project.scenes)||input.project.scenes.length<1||
       input.project.scenes.length>8)throw Error("Create pack requires 1–8 shots");
    const p=sanitizeMotionProject(input.project);
    if(p.scenes.length!==input.project.scenes.length)throw Error("Shot count was changed during sanitization");
    const rawScenes=input.project.scenes as Array<Record<string,unknown>>;
    if(p.scenes.some((s,i)=>s.headline!==rawScenes[i]?.headline))
      throw Error("Invalid headline in create pack");
    return {action:"create",next:p,changes:[
      "Replace entire current film with "+p.scenes.length+" scenes",
      p.brand+" · "+p.format+" · "+p.language+" · "+p.qualityMode
    ]};
  }
  if(input.action==="patch")return applyChanges(current,input);
  throw Error("Unknown action. Use create or patch.");
}
