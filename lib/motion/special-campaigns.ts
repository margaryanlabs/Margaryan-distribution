import {sanitizeMotionProject,type MotionBrand,type MotionProject,type MotionFormat,type MotionSceneKind} from "./studio";
/**
 * Local authored campaign director. These are sourced from each project's
 * documented purpose and review-safe positioning; not fabricated live results.
 * Labels are editorial; illustrated simulations are never advertised as fact.
 */
type Locale="en"|"ru"|"hy";
type Shot=readonly [string,string,string];
type Campaign=Record<Locale,readonly Shot[]>;
const campaigns:Partial<Record<MotionBrand,Campaign>>={
  tun:{
    en:[
      ["THE OLD QUESTION","WHICH PROPERTY?","That is where most searches begin."],
      ["THE BETTER QUESTION","WHAT DO YOU REALLY NEED?","A place to live. An investment. A new start."],
      ["IT STARTS WITH YOU","GOAL FIRST. LISTINGS SECOND.","Your objective shapes the journey."],
      ["THE FULL PICTURE","SEE THE TRADE-OFFS.","Compare fit, costs and uncertainty."],
      ["LESS NOISE","FEWER. BETTER. DECISIONS.","An advisory experience, not endless cards."],
      ["INTRODUCING TUN","REAL ESTATE, REIMAGINED.","Intelligence without the sales agenda."],
      ["MAKE IT PERSONAL","START WITH YOUR GOAL.","TUN / Margaryan Labs"]
    ],
    ru:[
      ["СТАРЫЙ ВОПРОС","КАКУЮ КВАРТИРУ?","Так обычно начинается поиск."],
      ["НОВЫЙ ВОПРОС","ЧТО ВАМ НУЖНО НА САМОМ ДЕЛЕ?","Жить. Снимать. Инвестировать."],
      ["СНАЧАЛА ЧЕЛОВЕК","ЦЕЛЬ ВАЖНЕЕ СПИСКА.","Ваши задачи определяют выбор."],
      ["ПОЛНАЯ КАРТИНА","УВИДЬТЕ КОМПРОМИССЫ.","Плюсы, затраты, риски и неопределённость."],
      ["МЕНЬШЕ ШУМА","МЕНЬШЕ ВАРИАНТОВ. БОЛЬШЕ СМЫСЛА.","Помощь с решением, а не бесконечный каталог."],
      ["ПРЕДСТАВЛЯЕМ TUN","НЕДВИЖИМОСТЬ ИНАЧЕ.","Без давления продавца."],
      ["ЛИЧНАЯ СТРАТЕГИЯ","НАЧНИТЕ СО СВОЕЙ ЦЕЛИ.","TUN / Margaryan Labs"]
    ],
    hy:[
      ["ՀԻՆ ՀԱՐՑԸ","Ո՞Ր ԲՆԱԿԱՐԱՆԸ։","Որոնումը սովորաբար այսպես է սկսվում։"],
      ["ԱՎԵԼԻ ԿԱՐԵՎՈՐ ՀԱՐՑԸ","Ի՞ՆՉ Է ՁԵԶ ԻՐԱՊԵՍ ՊԵՏՔ։","Ապրել, վարձակալել, ներդնել։"],
      ["ՍԿՍՎՈՒՄ Է ՁԵԶՆԻՑ","ՆԱԽ՝ ՆՊԱՏԱԿԸ։","Ձեր նպատակն է որոշում ուղղությունը։"],
      ["ԱՄԲՈՂՋԱԿԱՆ ՊԱՏԿԵՐԸ","ՏԵՍԵՔ ՓՈԽԶԻՋՈՒՄՆԵՐԸ։","Համեմատեք ծախսերն ու ռիսկերը։"],
      ["ՔԻՉ ԱՂՄՈՒԿ","ՔԻՉ ՏԱՐԲԵՐԱԿ, ԼԱՎ ՈՐՈՇՈՒՄ։","Օգնություն՝ ոչ անվերջ ցուցակ։"],
      ["ՆԵՐԿԱՅԱՑՆՈՒՄ ԵՆՔ TUN","ՆՈՐ ՄՈՏԵՑՈՒՄ ԱՆՇԱՐԺ ԳՈՒՅՔԻՆ։","Առանց վաճառքի ճնշման։"],
      ["ՍԿՍԵՔ ՁԵԶՆԻՑ","ՍԿՍԵՔ ՁԵՐ ՆՊԱՏԱԿԻՑ։","TUN / Margaryan Labs"]
    ]
  },
  hay_engine:{
    en:[
      ["LANGUAGE IS IDENTITY","ARMENIAN IS NOT A FALLBACK.","Exact letters. Real meaning."],
      ["THE DIFFERENCE","WORDS SHOULD SOUND RIGHT.","Names. Numbers. Pronunciation."],
      ["THE CORE","BUILD IN YOUR LANGUAGE.","Armenian-first by design."],
      ["THE CREATIVE FLOW","WRITE. SPEAK. CREATE.","From language to production."],
      ["BEYOND TRANSLATION","KEEP WHAT MATTERS INTACT.","Preserve names, prices and meaning."],
      ["INTRODUCING","HAY ENGINE","A language and creator system."],
      ["CREATED FOR ARMENIAN","NATURALLY ARMENIAN.","HAY ENGINE / Margaryan Labs"]
    ],
    ru:[
      ["ЯЗЫК — ЭТО ИДЕНТИЧНОСТЬ","АРМЯНСКИЙ — НЕ ЗАПАСНОЙ.","Точные буквы и настоящий смысл."],
      ["РАЗНИЦА В ДЕТАЛЯХ","ВАЖНО, КАК ЗВУЧАТ СЛОВА.","Имена. Числа. Произношение."],
      ["В ОСНОВЕ","СОЗДАВАЙ НА СВОЁМ ЯЗЫКЕ.","Армянский с первого шага."],
      ["ТВОРЧЕСКИЙ ПРОЦЕСС","ПИШИ. ГОВОРИ. СОЗДАВАЙ.","От языка к контенту."],
      ["НЕ ПРОСТО ПЕРЕВОД","СОХРАНИ ТО, ЧТО ВАЖНО.","Бренды, цены и смысл."],
      ["ПРЕДСТАВЛЯЕМ","HAY ENGINE","Язык и творчество в одной системе."],
      ["ДЛЯ АРМЯНСКОГО","ЕСТЕСТВЕННЫЙ АРМЯНСКИЙ.","HAY ENGINE / Margaryan Labs"]
    ],
    hy:[
      ["ԼԵԶՈՒՆ ԻՆՔՆՈՒԹՅՈՒՆ Է","ՀԱՅԵՐԵՆԸ ԵՐԿՐՈՐԴԱԿԱՆ ՉԷ։","Ճիշտ տառեր։ Իրական իմաստ։"],
      ["ԱՄԵՆ ՄԱՆՐՈՒՔԸ ԿԱՐԵՎՈՐ Է","ԲԱՌԵՐԸ ՊԵՏՔ Է ՃԻՇՏ ՀՆՉԵՆ։","Անուններ։ Թվեր։ Արտասանություն։"],
      ["ՀԻՄՔԸ","ՍՏԵՂԾԵՔ ՁԵՐ ԼԵԶՎՈՎ։","Հայերենը՝ առաջին տեղում։"],
      ["ՍՏԵՂԾԱԳՈՐԾԱԿԱՆ ՈՒՂԻ","ԳՐԵՔ։ ԽՈՍԵՔ։ ՍՏԵՂԾԵՔ։","Լեզվից դեպի բովանդակություն։"],
      ["ԱՎԵԼԻՆ, ՔԱՆ ԹԱՐԳՄԱՆՈՒԹՅՈՒՆ","ՊԱՀՊԱՆԵՔ ԿԱՐԵՎՈՐԸ։","Անունները, թվերը և իմաստը։"],
      ["ՆԵՐԿԱՅԱՑՆՈՒՄ ԵՆՔ","HAY ENGINE","Լեզվի և ստեղծագործության հարթակ։"],
      ["ՍՏԵՂԾՎԱԾ ՀԱՅԵՐԵՆԻ ՀԱՄԱՐ","ԲՆԱԿԱՆ ՀԱՅԵՐԵՆ։","HAY ENGINE / Margaryan Labs"]
    ]
  },
  reality_engine:{
    en:[
      ["BEFORE REALITY HAPPENS","THE DECISION COMES FIRST.","So does its uncertainty."],
      ["ONE DECISION","MANY POSSIBLE FUTURES.","Base. Bull. Bear. Stress."],
      ["SIMULATE THE ALTERNATIVES","MODEL THE SCENARIOS.","Explore assumptions, not predictions."],
      ["FOLLOW THE EFFECTS","WHAT CHANGES NEXT?","Direct and second-order consequences."],
      ["KNOW THE DOWNSIDE","QUESTION THE CONFIDENCE.","See uncertainty and sensitivity."],
      ["INTRODUCING","REALITY ENGINE","Scenario-based decision support."],
      ["BEFORE YOU COMMIT","MODEL THE DECISION.","Reality Engine / Margaryan Labs"]
    ],
    ru:[
      ["ДО ТОГО, КАК ВСЁ СЛУЧИТСЯ","СНАЧАЛА — РЕШЕНИЕ.","А вместе с ним — неопределённость."],
      ["ОДНО РЕШЕНИЕ","МНОГО ВОЗМОЖНЫХ ИСХОДОВ.","Базовый. Рост. Спад. Стресс."],
      ["ПРОВЕРКА ВАРИАНТОВ","МОДЕЛИРУЙ СЦЕНАРИИ.","Исследуй допущения, а не пророчества."],
      ["ЦЕПОЧКА ПОСЛЕДСТВИЙ","ЧТО ИЗМЕНИТСЯ ДАЛЬШЕ?","Прямые и вторичные эффекты."],
      ["СТОИМОСТЬ РИСКА","ПРОВЕРЬ УВЕРЕННОСТЬ.","Оцени неопределённость."],
      ["ПРЕДСТАВЛЯЕМ","REALITY ENGINE","Система поддержки решений."],
      ["ДО ТОГО, КАК РЕШИТЬ","СНАЧАЛА МОДЕЛИРУЙ.","Reality Engine / Margaryan Labs"]
    ],
    hy:[
      ["ՄԻՆՉ ԱՄԵՆ ԻՆՉ ԿՊԱՏԱՀԻ","ՆԱԽ՝ ՈՐՈՇՈՒՄԸ։","Եվ դրա անորոշությունը։"],
      ["ՄԵԿ ՈՐՈՇՈՒՄ","ԲԱԶՄԱԹԻՎ ՀՆԱՐԱՎՈՐ ԱՐԴՅՈՒՆՔՆԵՐ։","Հիմնական։ Աճ։ Անկում։ Սթրես։"],
      ["ՏԱՐԲԵՐԱԿՆԵՐԻ ՎԵՐԼՈՒԾՈՒԹՅՈՒՆ","ՄՈԴԵԼԱՎՈՐԵՔ ՍՑԵՆԱՐՆԵՐԸ։","Ստուգեք ենթադրությունները։"],
      ["ՀԵՏԵՎԱՆՔՆԵՐԻ ՇՂԹԱ","Ի՞ՆՉ ԿՓՈԽՎԻ ՀԵՏՈ։","Ուղղակի և երկրորդային ազդեցություններ։"],
      ["ՌԻՍԿԻ ԳԻՆԸ","ՍՏՈՒԳԵՔ ՎՍՏԱՀՈՒԹՅՈՒՆԸ։","Տեսեք ռիսկն ու անորոշությունը։"],
      ["ՆԵՐԿԱՅԱՑՆՈՒՄ ԵՆՔ","REALITY ENGINE","Որոշումների աջակցության համակարգ։"],
      ["ՄԻՆՉ ՈՐՈՇՈՒՄ ԿԱՅԱՑՆԵԼԸ","ՆԱԽ ՄՈԴԵԼԱՎՈՐԵՔ։","Reality Engine / Margaryan Labs"]
    ]
  }
};
const KINDS:readonly MotionSceneKind[]=["kinetic","opener","network","statement","network","orbit","closer"];
const SECONDS=[3.6,4.4,4.3,4.5,4.3,4.3,4.6];
export function specialCampaign(brand:MotionBrand,language:Locale,format:MotionFormat,style:MotionProject["style"],seed:number):MotionProject | null {
  const data=campaigns[brand]?.[language];
  if(!data)return null;
  const scenes=data.map(([eyebrow,headline,support],i)=>({
    id:"scene-"+(i+1),kind:KINDS[i],eyebrow,headline,support,seconds:SECONDS[i]
  }));
  return sanitizeMotionProject({
    version:1,title:brand.toUpperCase()+" / CINEMA EDITORIAL / "+language.toUpperCase(),
    brand,format,style,seed,language,scenes
  });
}
