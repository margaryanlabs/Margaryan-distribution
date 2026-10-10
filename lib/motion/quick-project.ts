import { BRAND_INFO, type MotionBrand, type MotionFormat } from "./studio";

/**
 * QUICK uses real operator-owned imagery/video, never claimed model output.
 * Storyboards and metadata are portable; media file bytes stay browser-local.
 * This contract is independent of the procedural Cinematic motion project.
 */
export type QuickLanguage = "hy" | "ru" | "en";
export interface QuickShot {
  id: string;
  title: string;
  subtitle: string;
  seconds: number;
  visual: "fill" | "contain";
}
export interface QuickProject {
  version: 1;
  pipeline: "quick";
  name: string;
  brand: MotionBrand;
  language: QuickLanguage;
  format: MotionFormat;
  shots: QuickShot[];
}
export type MediaApproval = "user_supplied_unreviewed";

const SALE: Record<QuickLanguage, {name:string; beats:[string,string][]}> = {
  hy: {
    name:"MEQENA / հարթակի վաճառք",
    beats:[
      ["ՎԱՃԱՌՎՈՒՄ Է","MEQENA ավտոհարթակը"],
      ["ՊԱՏՐԱՍՏ ԹՎԱՅԻՆ ՀԱՐԹԱԿ","Որոնում և ավտոմեքենաների ընտրություն"],
      ["ԻՐԱԿԱՆ ԳՈՐԾԻՔՆԵՐ","Գնորդների և վաճառողների համար"],
      ["AI ՕԳՆԱԿԱՆ · VIN","Հետազոտեք հարթակի հնարավորությունները"],
      ["MEQENA","Հարթակը վաճառվում է · կապվեք մեզ հետ"]
    ]
  },
  ru: {
    name:"MEQENA / продажа платформы",
    beats:[
      ["ПЛАТФОРМА ПРОДАЁТСЯ","MEQENA — автомобильный маркетплейс"],
      ["ГОТОВЫЙ ЦИФРОВОЙ ПРОДУКТ","Поиск и подбор автомобилей"],
      ["ИНСТРУМЕНТЫ ДЛЯ РЫНКА","Для покупателей и продавцов"],
      ["AI-АССИСТЕНТ · VIN","Изучите возможности платформы"],
      ["MEQENA","По вопросам приобретения свяжитесь с нами"]
    ]
  },
  en: {
    name:"MEQENA / platform acquisition",
    beats:[
      ["PLATFORM FOR SALE","MEQENA automotive marketplace"],
      ["BUILT DIGITAL PRODUCT","Automotive search and discovery"],
      ["BUYER & SELLER TOOLS","A connected marketplace workflow"],
      ["AI ASSISTANT · VIN","Explore the platform and its capabilities"],
      ["MEQENA","Acquisition enquiries welcome"]
    ]
  }
};
const GENERIC: Record<QuickLanguage,[string,string][]> = {
  hy:[["ՆԵՐԿԱՅԱՑՆՈՒՄ ԵՆՔ","Մեր նոր պատմությունը"],["ԻՐԱԿԱՆ ԱՐԴՅՈՒՆՔՆԵՐ","Օգտագործեք միայն հաստատված նյութեր"],["ԲԱՑԱՀԱՅՏԵ՛Ք ԱՎԵԼԻՆ","Ծանոթացեք նախագծին"],["ԿԱՊ ՀԱՍՏԱՏԵ՛Ք","Գրե՛ք մեզ"]],
  ru:[["ПРЕДСТАВЛЯЕМ","Новая история бренда"],["ТОЛЬКО ФАКТЫ","Используйте подтверждённые материалы"],["УЗНАЙТЕ БОЛЬШЕ","Познакомьтесь с продуктом"],["НАПИШИТЕ НАМ","Открыты к диалогу"]],
  en:[["INTRODUCING","A new brand story"],["REAL SOURCES ONLY","Use approved imagery and claims"],["DISCOVER MORE","Explore the product"],["GET IN TOUCH","Start a conversation"]]
};
export function createQuickProject(brand:MotionBrand="meqena",language:QuickLanguage="hy",format:MotionFormat="portrait"):QuickProject {
  const beats = brand==="meqena"?SALE[language].beats:GENERIC[language];
  const name=brand==="meqena"?SALE[language].name:BRAND_INFO[brand].name+" / quick film";
  return {version:1,pipeline:"quick",name,brand,language,format,
    shots:beats.map(([title,subtitle],i)=>({
      id:"shot-"+(i+1),title,subtitle,seconds:i===beats.length-1?4:3.5,visual:"fill"
    }))
  };
}
const validBrand=new Set(Object.keys(BRAND_INFO));
const validLanguage=new Set(["hy","ru","en"]);
const validFormat=new Set(["portrait","square","landscape"]);
function copy(s:unknown,n:number){
  return typeof s==="string"?s.replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,n):"";
}
export function sanitizeQuickProject(raw:unknown):QuickProject {
  if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new Error("Invalid Quick Studio project");
  const p=raw as Partial<QuickProject>;
  if(p.pipeline!=="quick"||p.version!==1||!validBrand.has(String(p.brand))||!validLanguage.has(String(p.language))||!validFormat.has(String(p.format))){
    throw new Error("Unsupported Quick Studio project. Cinematic JSON files have a separate editor.");
  }
  if(!Array.isArray(p.shots)||p.shots.length<2||p.shots.length>8)throw new Error("Quick projects contain 2–8 shots.");
  const shots=p.shots.map((shot,i)=>{
    if(!shot||typeof shot!=="object")throw new Error("Invalid shot");
    const seconds=Number(shot.seconds);
    if(!Number.isFinite(seconds)||seconds<2||seconds>8)throw new Error("Shots must last 2–8 seconds.");
    return {id:"shot-"+(i+1),title:copy(shot.title,100),subtitle:copy(shot.subtitle,155),
      seconds,visual:shot.visual==="contain"?"contain" as const:"fill" as const};
  });
  if(shots.some(s=>!s.title))throw new Error("Each Quick shot needs a headline");
  const total=shots.reduce((s,x)=>s+x.seconds,0);
  if(total>64)throw new Error("Quick films must not exceed 64 seconds.");
  return {version:1,pipeline:"quick",name:copy(p.name,100)||"UNTITLED QUICK",
    brand:p.brand as MotionBrand,format:p.format as MotionFormat,language:p.language as QuickLanguage,shots};
}
export function quickDuration(p:QuickProject){return p.shots.reduce((x,s)=>x+s.seconds,0);}
export function quickShotAt(p:QuickProject,t:number){
  let start=0;
  for(let i=0;i<p.shots.length;i++){
    const shot=p.shots[i];
    if(t<start+shot.seconds||i===p.shots.length-1)return {index:i,shot,elapsed:Math.max(0,t-start),start};
    start+=shot.seconds;
  }
  return {index:0,shot:p.shots[0],elapsed:0,start:0};
}
