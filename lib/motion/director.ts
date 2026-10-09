import {
  BRAND_INFO, makeMotionPreset, sanitizeMotionProject,
  type MotionBrand, type MotionFormat, type MotionProject, type MotionScene, type MotionSceneKind
} from "./studio";

/**
 * Keyless Motion Director.
 *
 * This is a deterministic language-aware copy composer / procedural scene director,
 * not an offline pretrained neural network. It performs no fetches, uses no API keys,
 * and never invents statistics or client proof.
 */
export type MotionLanguage = "auto" | "ru" | "en" | "hy";
export type MotionStyle = "cinematic" | "kinetic" | "technical";
export interface DirectorBrief {
  prompt: string;
  brand: MotionBrand;
  format: MotionFormat;
  language?: MotionLanguage;
  style?: MotionStyle;
}

type Language = "ru" | "en" | "hy";
type Topic = "crypto" | "visibility" | "restaurant" | "privacy" | "automation" | "property" | "growth" | "general";

const TOPICS: Record<Topic, RegExp> = {
  crypto: /крипт|трейд|бирж|биткоин|рынок|финанс|инвест|bitcoin|btc|crypto|trade|market|finance|web3|բիթքոյն|կրիպտո|առևտր|ֆինանս/i,
  visibility: /promptence|промптен|поиск|видим|бренд|выдач|seo|google|yandex|search|visibility|discovery|answer|ai\s+search|որոնում|տեսանելի/i,
  restaurant: /raios|ресторан|кафе|кухн|маржин|прибыл|food|restaurant|hospitality|margin|profit|ռեստորան|շահույթ/i,
  privacy: /приват|телеграм|защит|безопас|конфиден|секрет|шифр|private|secure|privacy|telegram|security|գաղտնի|անվտանգ/i,
  automation: /агент|автомат|робот|интеллект|искусствен|нейросет|ai|agent|automati|workflow|robot|արհեստական|ավտոմատ/i,
  property: /дубай|недвиж|квартир|инвестиц|dubai|property|real estate|apartment|estate|անշարժ|դուբայ/i,
  growth: /бизнес|продаж|лид|клиент|маркетинг|рост|выруч|revenue|sales|client|customer|business|lead|growth|վաճառք|բիզնես/i,
  general: /./
};
const TOPIC_LABEL: Record<Language, Record<Topic, string>> = {
  ru: {crypto:"РЕШЕНИЯ НА РЫНКЕ",visibility:"ВИДИМОСТЬ В AI",restaurant:"ИНТЕЛЛЕКТ РЕСТОРАНА",privacy:"КОНФИДЕНЦИАЛЬНОСТЬ",automation:"АВТОМАТИЗАЦИЯ",property:"НЕДВИЖИМОСТЬ",growth:"РОСТ БИЗНЕСА",general:"НОВАЯ ИДЕЯ"},
  en: {crypto:"MARKET DECISIONS",visibility:"AI VISIBILITY",restaurant:"RESTAURANT INTELLIGENCE",privacy:"PRIVACY BY DESIGN",automation:"SMART AUTOMATION",property:"REAL ESTATE",growth:"BUSINESS GROWTH",general:"YOUR NEXT IDEA"},
  hy: {crypto:"ՇՈՒԿԱՅԻ ՈՐՈՇՈՒՄՆԵՐ",visibility:"AI ՏԵՍԱՆԵԼԻՈՒԹՅՈՒՆ",restaurant:"ՌԵՍՏՈՐԱՆԻ ՎԵՐԼՈՒԾՈՒԹՅՈՒՆ",privacy:"ԳԱՂՏՆԻՈՒԹՅՈՒՆ",automation:"ԱՎՏՈՄԱՏԱՑՈՒՄ",property:"ԱՆՇԱՐԺ ԳՈՒՅՔ",growth:"ԲԻԶՆԵՍԻ ԱՃ",general:"ՆՈՐ ԳԱՂԱՓԱՐ"}
};
const COPY: Record<Language, {
  hook: string; problem: string; reveal: string; proof: string; close: string;
  kicker: string; signal: string; support: string; cta: string; based: string;
}> = {
  ru: {
    hook:"ВИДЕТЬ БОЛЬШЕ.", problem:"ХВАТИТ ГАДАТЬ.", reveal:"УВИДЕТЬ СИСТЕМУ.", proof:"ДЕЙСТВОВАТЬ ОСОЗНАННО.", close:"ДАЛЬШЕ — ТВОЙ ХОД.",
    kicker:"ПОСМОТРИ ИНАЧЕ", signal:"ОТ ШУМА К СИГНАЛУ", support:"Меньше обещаний. Больше ясности.", cta:"Узнай, как это работает.", based:"ИСТОРИЯ О"
  },
  en: {
    hook:"SEE THE DIFFERENCE.", problem:"STOP GUESSING.", reveal:"FIND THE SIGNAL.", proof:"THINK BEYOND THE HYPE.", close:"THE NEXT MOVE IS YOURS.",
    kicker:"CHANGE THE PERSPECTIVE", signal:"FROM NOISE TO CLARITY", support:"Less hype. More clarity.", cta:"Discover the system.", based:"A STORY ABOUT"
  },
  hy: {
    hook:"ՏԵՍ ԱՎԵԼԻՆ։", problem:"ԲԱՎԱԿԱՆ Է ԳՈՒՇԱԿԵԼ։", reveal:"ԳՏԻՐ ԱԶԴԱՆՇԱՆԸ։", proof:"ՄՏԱԾԻՐ ԱՊԱՑՈՒՅՑՆԵՐՈՎ։", close:"ՀԱՋՈՐԴ ՔԱՅԼԸ ՔՈՆՆ Է։",
    kicker:"ՆՈՐ ՏԵՍԱՆԿՅՈՒՆ", signal:"ԱՂՄՈՒԿԻՑ ԴԵՊԻ ՀՍՏԱԿՈՒԹՅՈՒՆ", support:"Ավելի քիչ խոստումներ։ Ավելի շատ պարզություն։", cta:"Բացահայտիր մոտեցումը։", based:"ՊԱՏՄՈՒԹՅՈՒՆ"
  }
};
const BRAND_CLOSE: Record<Language, Record<MotionBrand, string>> = {
  ru: {
    veto:"РЕШЕНИЯ. НЕ ОБЕЩАНИЯ.",promptence:"БУДЬТЕ ВИДИМЫ В AI.",raios:"КОНТРОЛИРУЙТЕ МАРЖУ.",labs:"СОЗДАЁМ СЛЕДУЮЩЕЕ.",
    ingu:"СТИЛЬ КАК ИСКУССТВО.",meqena:"НОВЫЙ ПУТЬ К АВТОМОБИЛЮ.",suren:"СТРАТЕГИЯ ПРЕЖДЕ ВЫБОРА.",
    veto_private:"КОНТРОЛЬ НАД НАСТРОЙКАМИ.",veto_sport:"АНАЛИЗИРУЙ ЦЕНУ.",armat:"СДЕЛАНО В АРМЕНИИ."
  },
  en: {
    veto:"DECISIONS. NOT PROMISES.",promptence:"BE SEEN IN AI SEARCH.",raios:"MAKE MARGINS VISIBLE.",labs:"BUILD WHAT COMES NEXT.",
    ingu:"FASHION AS A POINT OF VIEW.",meqena:"DISCOVER THE DRIVE.",suren:"STRATEGY BEFORE THE VIEW.",
    veto_private:"TOOLS FOR YOUR CONTROL.",veto_sport:"AUDIT THE PRICE.",armat:"MADE IN ARMENIA."
  },
  hy: {
    veto:"ՈՐՈՇՈՒՄՆԵՐ, ՈՉ ԽՈՍՏՈՒՄՆԵՐ։",promptence:"ԵՐԵՎԱՑԵՔ AI ՈՐՈՆՄԱՆ ՄԵՋ։",raios:"ՏԵՍԱՆԵԼԻ ԴԱՐՁՐՈՒ ՄԱՐԺԱՆ։",labs:"ԿԱՌՈՒՑՈՒՄ ԵՆՔ ԱՊԱԳԱՆ։",
    ingu:"ՆՈՐ ՏԵՍԱՆԿՅՈՒՆ ՆՈՐԱՁԵՎՈՒԹՅԱՆ ՄԱՍԻՆ։",meqena:"ԲԱՑԱՀԱՅՏԵՔ ՁԵՐ ՀԱՋՈՐԴ ՄԵՔԵՆԱՆ։",
    suren:"ՌԱԶՄԱՎԱՐՈՒԹՅՈՒՆ՝ ԸՆՏՐՈՒԹՅՈՒՆԻՑ ԱՌԱՋ։",veto_private:"ՎԵՐԱՀՍԿԵՔ ՁԵՐ ԿԱՐԳԱՎՈՐՈՒՄՆԵՐԸ։",
    veto_sport:"ՎԵՐԼՈՒԾԵՔ ԳԻՆԸ։",armat:"ԱՐՏԱԴՐՎԱԾ Է ՀԱՅԱՍՏԱՆՈՒՄ։"
  }
};
const DESIGN_WORDS = /^(создай|сделай|нарисуй|построй|напиши|покажи|create|make|show|build|design|generate|please|хочу|нужно|ролик|видео|video|clip|advert|реклама|film|cinematic|кинематографич|стиль|эффект|фон|background|transition|переход|цвет|color|seconds|секунд|for|для|про|about|с|with|и|the|a|an)$/i;

function detectLanguage(prompt: string, desired?: MotionLanguage): Language {
  if (desired && desired !== "auto") return desired;
  if (/[\u0530-\u058f]/.test(prompt)) return "hy";
  if (/[\u0400-\u04ff]/.test(prompt)) return "ru";
  return "en";
}
function detectTopic(prompt: string): Topic {
  let chosen: Topic = "general";
  let best = 0;
  for (const topic of Object.keys(TOPICS) as Topic[]) {
    if (topic === "general") continue;
    const found = prompt.match(new RegExp(TOPICS[topic].source, "gi"));
    const matches = found?.length || 0;
    // Bias away from branding alone when creative brief names something more specific.
    if (matches > best) { best = matches; chosen = topic; }
  }
  return chosen;
}
function seedFrom(text: string) {
  let value = 2166136261;
  for (const c of Array.from(text)) value = Math.imul(value ^ c.codePointAt(0)!, 16777619);
  return value >>> 0;
}
function phraseFromPrompt(prompt: string) {
  // Only lift expressly quoted slogans; do not put production instructions on screen.
  const quoted = [...prompt.matchAll(/[«“"]([^»”"]{5,76})[»”"]/g)]
    .map(match => match[1].trim())
    .find(text => text.split(/\s+/).length <= 11 && !/https?:\/\//i.test(text));
  return quoted || "";
}
function meaningfulTerms(prompt: string) {
  const sanitized = prompt.replace(/https?:\/\/\S+|[@#]\S+|\d+[%$€]/g, " ");
  return sanitized.split(/[\s,;.!?:()[\]{}"«»\n]+/u)
    .filter(token => token.length >= 4 && token.length <= 26 && !DESIGN_WORDS.test(token))
    .slice(0, 20);
}
function intelligentSubject(prompt: string, lang: Language, topic: Topic) {
  const quoted = phraseFromPrompt(prompt);
  if (quoted) return quoted.toLocaleUpperCase(lang);
  const input = prompt.replace(/\s+/g, " ").trim();
  // A short request can itself be a legitimate on-screen subject.
  if (input.length < 42 && !/^(создай|сделай|create|make|generate|покажи)/i.test(input)) return input.toLocaleUpperCase(lang);
  const terms = meaningfulTerms(prompt).filter(term => !/^(красив|эффект|переход|динамич|профессион|видео|video|кинематограф|cinematic)/i.test(term));
  if (topic !== "general") return TOPIC_LABEL[lang][topic];
  return terms.length > 0 ? terms.slice(0, 3).join(" ").toLocaleUpperCase(lang) : TOPIC_LABEL[lang].general;
}

/**
 * Director's-cut narrative for Promptence: a coherent seven-beat campaign,
 * with no false visibility numbers or invented AI provider results.
 * This is content direction, not an AI model inference.
 */
function promptenceCampaign(lang: Language, format: MotionFormat, style: MotionStyle, seed: number): MotionProject {
  const locales = {
    en: [
      ["THE SHIFT", "SEARCH IS CHANGING.", "The answer is the new front page."],
      ["A NEW BEHAVIOR", "YOUR CUSTOMER ASKS AI.", "What appears in the answer?"],
      ["THE BLIND SPOT", "WHAT IF YOU'RE NOT THERE?", "Visibility cannot be assumed."],
      ["THE REVEAL", "MAKE THE INVISIBLE VISIBLE.", "Promptence / AI Search Intelligence."],
      ["THE PROCESS", "DISCOVER. MEASURE. DIAGNOSE.", "Prioritize what matters."],
      ["THE PROOF LOOP", "SEE WHAT CHANGED.", "Measure progress with evidence."],
      ["THE NEXT FRONT PAGE", "BE VISIBLE IN THE ANSWER.", "promptence.tech"]
    ],
    ru: [
      ["ПЕРЕМЕНЫ", "ПОИСК МЕНЯЕТСЯ.", "Теперь клиенты спрашивают искусственный интеллект."],
      ["НОВАЯ ПРИВЫЧКА", "ВАШ КЛИЕНТ СПРАШИВАЕТ AI.", "Что он увидит в ответе?"],
      ["НЕВИДИМАЯ ПРОБЛЕМА", "А ЕСЛИ ВАС ТАМ НЕТ?", "Видимость необходимо измерять."],
      ["РЕШЕНИЕ", "СДЕЛАЙ НЕВИДИМОЕ ВИДИМЫМ.", "Promptence / аналитика AI-поиска."],
      ["ПРОЦЕСС", "НАЙТИ. ИЗМЕРИТЬ. ПОНЯТЬ.", "Определить важные действия."],
      ["ПРОВЕРКА", "ПОКАЖИ, ЧТО ИЗМЕНИЛОСЬ.", "Оценивай прогресс по фактам."],
      ["НОВАЯ ВИДИМОСТЬ", "БУДЬТЕ В ОТВЕТЕ AI.", "promptence.tech"]
    ],
    hy: [
      ["ՓՈՓՈԽՈՒԹՅՈՒՆ", "ՈՐՈՆՈՒՄԸ ՓՈԽՎՈՒՄ Է։", "Պատասխանը նոր առաջին էջն է։"],
      ["ՆՈՐ ՍՈՎՈՐՈՒԹՅՈՒՆ", "ՀԱՃԱԽՈՐԴԸ ՀԱՐՑՆՈՒՄ Է AI-ԻՆ։", "Ի՞նչ է հայտնվում պատասխանում։"],
      ["ԱՆՏԵՍԱՆԵԼԻ ԽՆԴԻՐ", "ԻՍԿ ԵԹԵ ԴՈՒՔ ԱՅՆՏԵՂ ՉԿԱ՞Ք։", "Տեսանելիությունը պետք է չափել։"],
      ["ԲԱՑԱՀԱՅՏՈՒՄ", "ՏԵՍԱՆԵԼԻ ԴԱՐՁՐՈՒ ԱՆՏԵՍԱՆԵԼԻՆ։", "Promptence / AI որոնման վերլուծություն։"],
      ["ԳՈՐԾԸՆԹԱՑ", "ՀԱՅՏՆԱԲԵՐԵԼ։ ՉԱՓԵԼ։ ՀԱՍԿԱՆԱԼ։", "Ընտրել հաջորդ քայլերը։"],
      ["ՍՏՈՒԳՈՒՄ", "ՏԵՍՆԵԼ ՓՈՓՈԽՈՒԹՅՈՒՆԸ։", "Արդյունքը գնահատել փաստերով։"],
      ["ՏԵՍԱՆԵԼԻՈՒԹՅՈՒՆ", "ԵՐԵՎԱՑԵՔ AI-Ի ՊԱՏԱՍԽԱՆՈՒՄ։", "promptence.tech"]
    ]
  } as const;
  const kinds: MotionSceneKind[] = ["kinetic", "opener", "network", "orbit", "statement", "network", "closer"];
  const lengths = [3.8, 4.6, 4.3, 4.5, 4.3, 3.6, 4.9];
  const scenes = locales[lang].map(([eyebrow, headline, support], index) => ({
    id: "scene-" + (index + 1),
    kind: kinds[index], eyebrow, headline, support, seconds: lengths[index]
  }));
  return sanitizeMotionProject({
    version: 1, brand: "promptence", format, style, seed,
    title: "PROMPTENCE / DIRECTOR'S CUT / " + lang.toUpperCase(), scenes
  });
}

export function createKeylessStoryboard(input: DirectorBrief): MotionProject {
  const { prompt, brand, format } = input;
  if (typeof prompt !== "string" || prompt.trim().length < 6 || prompt.length > 2000) {
    throw new Error("Write a video brief between 6 and 2,000 characters.");
  }
  if (!Object.hasOwn(BRAND_INFO, brand)) throw new Error("Unknown product brand.");
  if (!["portrait", "square", "landscape"].includes(format)) throw new Error("Unknown output format.");
  const lang = detectLanguage(prompt, input.language);
  const topic = detectTopic(prompt);
  const copy = COPY[lang];
  const subject = intelligentSubject(prompt, lang, topic);
  const hash = seedFrom([prompt, brand, format, input.style || "cinematic", lang].join("|"));
  const style = input.style || (/(быстро|динамич|fast|energetic|kinetic)/i.test(prompt) ? "kinetic" :
    /(data|данн|цифр|аналити|terminal|технолог|code|dashboard)/i.test(prompt) ? "technical" : "cinematic");
  if (brand === "promptence" && topic === "visibility") {
    return promptenceCampaign(lang, format, style, hash);
  }
  const pace = style === "kinetic" ? 3 : style === "technical" ? 4.5 : 5;
  const styles: MotionSceneKind[] = style === "technical"
    ? ["opener", "network", "kinetic", "orbit", "closer"]
    : style === "kinetic"
      ? ["kinetic", "opener", "network", "statement", "closer"]
      : ["opener", "statement", "orbit", "network", "closer"];
  const headlines = [copy.hook, subject, copy.reveal, copy.proof, BRAND_INFO[brand].name];
  const labels = [copy.kicker, copy.based, copy.signal, copy.kicker, copy.close];
  const supports = [subject, copy.support, subject, BRAND_CLOSE[lang][brand], copy.cta];
  // Two different briefs always affect the composition, scene rhythm, and on-screen subject.
  const variation = hash % 4;
  if (variation === 1) [headlines[0], headlines[2]] = [headlines[2], headlines[0]];
  if (variation === 2) headlines[3] = copy.problem;
  if (variation === 3) supports[2] = BRAND_CLOSE[lang][brand];
  const scenes: MotionScene[] = styles.map((kind, index) => ({
    id: "scene-" + (index + 1),
    kind,
    eyebrow: labels[index],
    headline: headlines[index].slice(0, 105),
    support: supports[index].slice(0, 180),
    seconds: Math.max(2, Math.min(8, pace + (index === 0 ? -.7 : 0) + (index === 4 ? -.8 : 0) + ((hash >> (index * 3)) % 3) * .25))
  }));
  return sanitizeMotionProject({
    version: 1, title: BRAND_INFO[brand].name + " / " + TOPIC_LABEL[lang][topic],
    brand, format, style, seed: hash, language: lang, scenes
  });
}

export function getLocalDirectorExamples(brand: MotionBrand) {
  return [
    "Create a cinematic reveal about " + BRAND_INFO[brand].name + ". Minimal typography and an abstract intelligence network.",
    "Создай динамичное промо " + BRAND_INFO[brand].name + " с сильной типографикой, красочными переходами и финальным слоганом.",
    "Ստեղծիր կինեմատոգրաֆիկ հոլովակ " + BRAND_INFO[brand].name + " բրենդի համար։"
  ];
}
