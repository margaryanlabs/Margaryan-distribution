import {
  BRAND_INFO,makeMotionPreset,sanitizeMotionProject,
  type MotionBrand,type MotionFormat,type MotionProject
} from "./studio";
import {createKeylessStoryboard,type MotionLanguage} from "./director";
import {autoPolishMotionProject} from "./quality";

export type StudioFilmKind="reel"|"campaign"|"product"|"feature"|"proof";
export interface StudioFilmChoice {
  kind:StudioFilmKind;
  brand:MotionBrand;
  format:MotionFormat;
  language:MotionLanguage;
  brief:string;
}
export const STUDIO_FILM_CHOICES=[
  {kind:"reel",id:"01",title:"Reels / Stories",length:"15–30 сек",
   category:"БЫСТРО",format:"9:16",source:"Ваши фото и видео",badge:"РЕАЛЬНЫЕ КАДРЫ",
   desc:"Короткий ролик для Instagram, TikTok или рекламы. Берёте свои кадры, ставите текст и музыку.",
   outcome:"Быстрый вертикальный ролик",step:"Дальше загрузите свои видео или фото и соберите короткий монтаж."},
  {kind:"campaign",id:"02",title:"Кино-реклама",length:"30–60 сек",
   category:"ЭФФЕКТНО",format:"9:16 / 16:9",source:"Анимированная графика",badge:"CINEMATIC",
   desc:"Крупная типографика, движение камеры и сильный финал. Для запуска продукта и бренд-кампаний.",
   outcome:"Динамичный рекламный ролик",step:"Сначала откроется готовый редактируемый сценарий. Далее — кадры, голос и экспорт."},
  {kind:"product",id:"03",title:"Демо продукта",length:"30–60 сек",
   category:"ПРОДАВАТЬ",format:"16:9",source:"Нужны записи интерфейса",badge:"REAL PRODUCT",
   desc:"Покажите, как реально работает сайт или приложение. Зритель должен понять продукт, а не смотреть абстрактные эффекты.",
   outcome:"Демонстрация продукта",step:"Создадим монтаж с местом под настоящий экран. Прикрепите одобренные записи интерфейса."},
  {kind:"feature",id:"04",title:"Большой фильм",length:"2–5 мин",
   category:"ИСТОРИЯ",format:"16:9",source:"Монтаж по главам",badge:"FEATURE FILM",
   desc:"Большая история бренда, объяснение технологии или презентация для партнёров. Несколько глав и единый фильм.",
   outcome:"Длинный фильм по главам",step:"Перейдите к сборке глав: сохраняйте каждую часть, просматривайте фильм и проверяйте мастер."},
  {kind:"proof",id:"05",title:"Реальный продукт",length:"10 сек / тест",
   category:"ПРОВЕРИТЬ",format:"16:9",source:"Настоящий Promptence",badge:"SOURCE PROOF",
   desc:"Сначала проверим исходные кадры Promptence на реальном экране. Для короткого проверочного ролика.",
   outcome:"Пилот с реальными кадрами",step:"Откроется отдельный Proof Director для Promptence. Нужны настоящие исходники."}
] as const satisfies ReadonlyArray<{
  kind:StudioFilmKind;id:string;title:string;length:string;category:string;
  format:string;source:string;badge:string;desc:string;outcome:string;step:string;
}>;
export function checkStudioFilmChoice(raw:StudioFilmChoice):StudioFilmChoice{
  if(!STUDIO_FILM_CHOICES.some(x=>x.kind===raw.kind))throw Error("Выберите тип ролика");
  if(!BRAND_INFO[raw.brand])throw Error("Выберите бренд");
  if(!["portrait","landscape","square"].includes(raw.format))throw Error("Выберите формат видео");
  if(!["ru","en","hy"].includes(raw.language))throw Error("Выберите язык ролика");
  if(typeof raw.brief!=="string")throw Error("Опишите будущий фильм");
  const brief=raw.brief.replace(/[\u0000-\u001F\u007F]/g," ").trim().slice(0,650);
  return {...raw,brief};
}
/** Brand-safe, editable storyboard — no synthesized footage, AI-provider
 * answers, paid API or user data are invented here. */
export function prepareStudioFilm(choice:StudioFilmChoice):MotionProject{
  const input=checkStudioFilmChoice(choice);
  if(input.kind==="reel"||input.kind==="proof")
    throw Error("Этот режим использует отдельный редактор оригинальных кадров");
  if(input.kind==="campaign"){
    const prompt=input.brief.length>=12?input.brief:
      "Создай кино-рекламу для "+BRAND_INFO[input.brand].name+
      ". Сильное вступление, ясная идея, реальные доказательства только из одобренных исходников и финальный призыв.";
    const project=createKeylessStoryboard({
      prompt,brand:input.brand,format:input.format,language:input.language,style:"cinematic"
    });
    const polished=autoPolishMotionProject(project).project;
    return sanitizeMotionProject({...polished,format:input.format,filmChrome:"clean",
      title:BRAND_INFO[input.brand].name+" / КИНО-РЕКЛАМА"});
  }
  const initial=makeMotionPreset(input.brand,input.format);
  if(input.kind==="feature"){
    return sanitizeMotionProject({...initial,language:input.language,filmChrome:"clean",
      title:BRAND_INFO[input.brand].name+" / БОЛЬШОЙ ФИЛЬМ"});
  }
  // Genuine product demo: reserve a REAL unpopulated source shot. By design,
  // export source preflight fails until the owner uploads approved footage.
  const scenes=initial.scenes.map((s,index)=>
    index===Math.min(2,initial.scenes.length-1)
    ?{...s,kind:"screen" as const,productBeat:undefined,
      mediaId:undefined,sourceLayout:"theater" as const,
      eyebrow:"РЕАЛЬНЫЙ ПРОДУКТ",headline:"ПОКАЖИТЕ СВОЙ ИНТЕРФЕЙС",
      support:"Добавьте запись работающего продукта в ASSETS."}
    :s
  );
  return sanitizeMotionProject({...initial,scenes,language:input.language,
    title:BRAND_INFO[input.brand].name+" / ДЕМО ПРОДУКТА",filmChrome:"clean"});
}
export function studioFilmInstruction(kind:StudioFilmKind):string{
  const item=STUDIO_FILM_CHOICES.find(x=>x.kind===kind);
  if(!item)throw Error("Неизвестный тип ролика");
  return item.step;
}
