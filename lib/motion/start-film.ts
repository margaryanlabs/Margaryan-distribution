import {
  BRAND_INFO,makeMotionPreset,sanitizeMotionProject,
  type MotionBrand,type MotionFormat,type MotionProject
} from "./studio";
import {createKeylessStoryboard,type MotionLanguage} from "./director";
import {autoPolishMotionProject} from "./quality";
import {createPromptenceCampaign} from "./signature-promptence";

export type StudioFilmKind="reel"|"campaign"|"product"|"feature"|"proof"|"interaction";
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
  {kind:"interaction",id:"06",title:"Кликающее демо",length:"32–34 сек",
   category:"НОВАЯ ТЕХНОЛОГИЯ",format:"9:16",source:"Настоящие клики и ввод",badge:"REAL CLICKS",
   desc:"Настоящий курсор нажимает кнопки Promptence, вводит данные и открывает разделы. Запись — через локальный Interaction Cinema, монтаж — в нашей студии.",
   outcome:"Демонстрация реальных действий",step:"Создаём редактируемый проект с местом для оригинального кликающего видео. Для записи запустите локальный motion:interaction; готовый MP4 и .motion.json импортируйте в студию. Облачной записи без оператора пока нет."},
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
  const brief=raw.brief.replace(/[\u0000-\u001F\u007F]/g," ").replace(/\s+/g," ").trim().slice(0,650);
  return {...raw,brief};
}
/** Brand-safe, editable storyboard — no synthesized footage, AI-provider
 * answers, paid API or user data are invented here. */
export function prepareStudioFilm(choice:StudioFilmChoice):MotionProject{
  const input=checkStudioFilmChoice(choice);
  if(input.kind==="reel"||input.kind==="proof")
    throw Error("Этот режим использует отдельный редактор оригинальных кадров");
  if(input.kind==="campaign"){
    if(input.brand==="promptence"&&!input.brief){
      // The existing human-authored 36.5s Promptence director's cut is a
      // stronger product demo than a default generic word shuffle.
      const directed=createPromptenceCampaign(input.language as "ru"|"en"|"hy",input.format);
      return sanitizeMotionProject({...directed,filmChrome:"clean"});
    }
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
  if(input.kind==="interaction"){
    if(input.brand!=="promptence")throw Error("Режим записи реальных кликов пока работает только с публичным Promptence.");
    const scenes=Array.from({length:8},(_,i)=>({
      id:"scene-"+(i+1),kind:"screen" as const,eyebrow:["НАЧАЛО","FREE CHECK","ДОМЕН","КОМПАНИЯ","РЫНОК","КАТЕГОРИЯ","LOCAL AI","ДОКАЗАТЕЛЬСТВА"][i],
      headline:["ПРОДУКТ В ДЕЙСТВИИ.","ОТКРОЕМ ПРОВЕРКУ.","ВВЕДЁМ САЙТ.","НАЗОВЁМ КОМПАНИЮ.",
        "ВЫБЕРЕМ РЫНОК.","ДОБАВИМ КАТЕГОРИЮ.","ПЕРЕКЛЮЧИМ РЕЖИМ.","ИЗУЧИМ ИСТОЧНИКИ."][i],
      support:"Реальные клики и прокрутка: прикрепите проверенную запись Interaction Cinema.",
      seconds:4,mediaStart:i*4,sourceLayout:"showcase" as const,
      camera:"locked" as const,transition:"cut" as const,titleTreatment:"minimal" as const
    }));
    return sanitizeMotionProject({...makeMotionPreset("promptence","portrait"),
      format:"portrait",language:input.language,qualityMode:"signature",filmChrome:"clean",
      title:"PROMPTENCE / INTERACTION CINEMA / ORIGINAL CLICK RECORDING",
      scenes});
  }
  const initial=makeMotionPreset(input.brand,input.format);
  if(input.kind==="feature"){
    return sanitizeMotionProject({...initial,language:input.language,filmChrome:"clean",
      title:BRAND_INFO[input.brand].name+" / БОЛЬШОЙ ФИЛЬМ"});
  }
  // A genuine ~38s product narrative: three deliberate empty screen shots,
  // never synthetic UI. Preflight will block commercial export until original
  // screenshots/recordings are attached and manually approved.
  const lines:Record<"ru"|"en"|"hy",readonly [string,string,string][]> ={
    ru:[
      ["НАЧАЛО","ПРОДУКТ В ДЕЙСТВИИ.","Покажите реальную пользу на своих материалах."],
      ["ВОПРОС","ЗАЧЕМ ЭТО НУЖНО?","Назовите задачу конкретного пользователя."],
      ["НАСТОЯЩИЙ ЭКРАН","ВОТ КАК ЭТО ВЫГЛЯДИТ.","Загрузите оригинальную запись интерфейса."],
      ["ПЕРВЫЙ ШАГ","НАЧНИТЕ С ПРОСТОГО.","Объясните первое действие без сложных терминов."],
      ["НАСТОЯЩИЙ ЭКРАН","ШАГ ЗА ШАГОМ.","Добавьте второй настоящий кадр продукта."],
      ["ПОЯСНЕНИЕ","НЕ ОБЕЩАТЬ. А ПОКАЗАТЬ.","Говорите только то, что можно проверить."],
      ["НАСТОЯЩИЙ ЭКРАН","РЕАЛЬНЫЙ ПРОЦЕСС.","Покажите завершение действия в продукте."],
      ["ФИНАЛ","ПОСМОТРИТЕ САМИ.","Укажите настоящий сайт или способ узнать больше."]
    ],
    en:[
      ["OPEN","SEE THE PRODUCT.","Show authentic materials, not hypothetical results."],
      ["THE QUESTION","WHY DOES IT MATTER?","Explain a real audience need."],
      ["ORIGINAL SCREEN","THIS IS HOW IT LOOKS.","Attach actual recorded product screens."],
      ["FIRST STEP","START WITH THE SIMPLE.","Explain the first real interaction."],
      ["ORIGINAL SCREEN","STEP BY STEP.","Attach another genuine product screen."],
      ["THE POINT","SHOW. DO NOT OVERPROMISE.","Use only supportable facts."],
      ["ORIGINAL SCREEN","THE REAL WORKFLOW.","Show the action being completed in the product."],
      ["THE CLOSE","SEE IT FOR YOURSELF.","Link to an actual product page."]
    ],
    hy:[
      ["ՍԿԻԶԲ","ԱՀԱ ՁԵՐ ՊՐՈԴՈՒԿՏԸ։","Ցույց տվեք իրական արտադրանքը։"],
      ["ՀԱՐՑԸ","ԻՆՉԻ՞ ՀԱՄԱՐ Է ԱՅՆ։","Ներկայացրեք օգտատիրոջ իրական խնդիրը։"],
      ["ԻՐԱԿԱՆ ԷԿՐԱՆ","ՏԵՍԵՔ ԻՆՏԵՐՖԵՅՍԸ։","Կցեք արտադրանքի իրական էկրանի ձայնագրություն։"],
      ["ԱՌԱՋԻՆ ՔԱՅԼ","ՍԿՍԵՔ ՊԱՐԶԻՑ։","Բացատրեք իրական առաջին քայլը։"],
      ["ԻՐԱԿԱՆ ԷԿՐԱՆ","ՔԱՅԼ ԱՌ ՔԱՅԼ։","Ավելացրեք երկրորդ իրական էկրանը։"],
      ["ԲԱՑԱՏՐՈՒԹՅՈՒՆ","ՑՈՒՅՑ ՏՎԵՔ ՓԱՍՏԵՐԸ։","Օգտագործեք ստուգված տեղեկություններ։"],
      ["ԻՐԱԿԱՆ ԷԿՐԱՆ","ԻՐԱԿԱՆ ԳՈՐԾԸՆԹԱՑԸ։","Ցույց տվեք ամբողջական գործողությունը։"],
      ["ԱՎԱՐՏ","ՓՈՐՁԵՔ ԻՆՔՆԵՐԴ։","Նշեք իրական կայքը կամ հղումը։"]
    ]
  };
  const lang=input.language as "ru"|"en"|"hy";
  const kinds=["opener","statement","screen","kinetic","screen","statement","screen","closer"] as const;
  const durations=[4.5,4.5,5.2,4.5,5.2,4.3,5.2,4.6];
  const scenes=lines[lang].map(([eyebrow,headline,support],index)=>({
    id:"scene-"+(index+1),kind:kinds[index],eyebrow,headline,support,
    seconds:durations[index],camera:"push" as const,
    transition:index===0?"cut" as const:"dissolve" as const,
    ...(kinds[index]==="screen"
      ?{mediaId:undefined,sourceLayout:"theater" as const,mediaStart:0}
      :{})
  }));
  return sanitizeMotionProject({
    ...initial,scenes,language:lang,title:BRAND_INFO[input.brand].name+" / ДЕМО ПРОДУКТА",
    filmChrome:"clean",qualityMode:"signature"
  });
}
export function studioFilmInstruction(kind:StudioFilmKind):string{
  const item=STUDIO_FILM_CHOICES.find(x=>x.kind===kind);
  if(!item)throw Error("Неизвестный тип ролика");
  return item.step;
}
