import { sanitizeMotionProject, type MotionFormat, type MotionProject, type MotionSceneKind } from "./studio";

/**
 * Eight authored beats, not a generic template. The visual system describes
 * real Promptence workflow stages but NEVER simulates a real provider result,
 * competitor citation, customer outcome or proven revenue delta.
 *
 * Creative territory: THE ANSWER IS THE NEW FRONT PAGE.
 *    Question -> AI choice -> absence -> measurement -> evidence -> action ->
 *    remeasurement -> branded invitation.
 */
type Language = "en" | "ru" | "hy";
type Copy = readonly [string, string, string];
const WORDS: Record<Language, readonly Copy[]> = {
  en: [
    ["THE SHIFT", "THE FRONT PAGE HAS CHANGED.", "The buying journey now starts with a question."],
    ["THE NEW ENTRY POINT", "PEOPLE ASK AI.", "What enters the answer?"],
    ["THE BLIND SPOT", "WHAT IF YOU'RE NOT THERE?", "If you aren't mentioned, you may be overlooked."],
    ["THE QUESTION", "CAN YOU MEASURE IT?", "Not assumptions. Observable responses."],
    ["THE METHOD", "FIND THE SIGNAL.", "Discover. Measure. Diagnose."],
    ["THE ACTION", "CHANGE WHAT MATTERS.", "Prioritize actions. Verify the implementation."],
    ["THE EVIDENCE", "MEASURE AGAIN.", "Compare before and after. Never promise rankings."],
    ["INTRODUCING PROMPTENCE", "BE PRESENT IN THE ANSWER.", "Understand your AI visibility.  promptence.tech"]
  ],
  ru: [
    ["ПЕРЕМЕНЫ", "ПЕРВАЯ СТРАНИЦА ИЗМЕНИЛАСЬ.", "Путь покупателя начинается с вопроса."],
    ["НОВАЯ ТОЧКА ВХОДА", "ЛЮДИ СПРАШИВАЮТ AI.", "Что появляется в ответе?"],
    ["СЛЕПАЯ ЗОНА", "А ЕСЛИ ВАС ТАМ НЕТ?", "Без упоминаний бренд могут не заметить."],
    ["ГЛАВНЫЙ ВОПРОС", "МОЖНО ЛИ ЭТО ИЗМЕРИТЬ?", "Не догадки. Наблюдаемые ответы."],
    ["НАШ ПОДХОД", "НАЙДИ СИГНАЛ.", "Находи. Измеряй. Анализируй."],
    ["ДЕЙСТВИЕ", "ИСПРАВЛЯЙ ГЛАВНОЕ.", "Определи приоритеты. Проверь изменения."],
    ["ДОКАЗАТЕЛЬСТВА", "ИЗМЕРЬ ПОВТОРНО.", "Сравни до и после. Без гарантий позиций."],
    ["ПРЕДСТАВЛЯЕМ PROMPTENCE", "БУДЬ В ОТВЕТЕ AI.", "Исследуй AI-видимость бренда.  promptence.tech"]
  ],
  hy: [
    ["ՓՈՓՈԽՈՒԹՅՈՒՆ", "ԱՌԱՋԻՆ ԷՋԸ ՓՈԽՎԵԼ Է։", "Գնորդի ճանապարհը սկսվում է հարցից։"],
    ["ՆՈՐ ՍԿԻԶԲ", "ՄԱՐԴԻԿ ՀԱՐՑՆՈՒՄ ԵՆ AI-ԻՆ։", "Ի՞նչ է հայտնվում պատասխանում։"],
    ["ՉՆԿԱՏՎՈՂ ԽՆԴԻՐ", "ԻՍԿ ԵԹԵ ԴՈՒՔ ԱՅՆՏԵՂ ՉԿԱ՞Ք։", "Առանց հիշատակման ձեր բրենդը կարող են չնկատել։"],
    ["ԳԼԽԱՎՈՐ ՀԱՐՑԸ", "ԿԱՐԵԼԻ՞ Է ՍԱ ՉԱՓԵԼ։", "Ոչ ենթադրություններ։ Դիտարկվող պատասխաններ։"],
    ["ՄԵԹՈԴԸ", "ԳՏԵՔ ԱԶԴԱՆՇԱՆԸ։", "Հայտնաբերել։ Չափել։ Վերլուծել։"],
    ["ԳՈՐԾՈՂՈՒԹՅՈՒՆ", "ՓՈԽԵՔ ԿԱՐԵՎՈՐԸ։", "Սահմանեք առաջնահերթությունները։ Ստուգեք փոփոխությունները։"],
    ["ԱՊԱՑՈՒՅՑ", "ԿՐԿԻՆ ՉԱՓԵՔ։", "Համեմատեք առաջ և հետո։ Առանց վարկանիշի երաշխիքի։"],
    ["ՆԵՐԿԱՅԱՑՆՈՒՄ ԵՆՔ PROMPTENCE", "ԵՂԵՔ AI-Ի ՊԱՏԱՍԽԱՆՈՒՄ։", "Իմացեք ձեր բրենդի տեսանելիությունը։  promptence.tech"]
  ]
};
const KINDS:MotionSceneKind[]=["kinetic","opener","network","orbit","statement","network","orbit","closer"];
const DURATIONS=[3.7,4.1,4.2,4.3,4.4,4.2,4.0,4.9];
export function createPromptenceSignature(language:Language="en",format:MotionFormat="portrait"):MotionProject{
  const scenes=WORDS[language].map(([eyebrow,headline,support],index)=>({
    id:"scene-"+(index+1),kind:KINDS[index],eyebrow,headline,support,
    seconds:DURATIONS[index],
    typographyScale:language==="hy"?.87:language==="ru"?.92:1
  }));
  return sanitizeMotionProject({
    version:1,title:"PROMPTENCE / THE ANSWER IS THE FRONT PAGE / SIGNATURE",
    signatureFilm:"promptence-answer",brand:"promptence",format,
    style:"cinematic",language,seed:8675309,scenes
  });
}


/**
 * Promptence 2026 campaign / 36.5s / 8-shot author's cut.
 * An independent selectable cut: the original 33.8s signature remains intact.
 * The identical signatureFilm metadata activates the existing original Motion OS
 * source-honest bespoke canvas compositions. No invented customer metrics.
 */
const CAMPAIGN_WORDS: Record<Language, readonly Copy[]> = {
  en: [
    ["01 / THE SHIFT", "THE FRONT PAGE HAS CHANGED.", "Discovery is becoming a conversation."],
    ["02 / BUYER INTENT", "YOUR CUSTOMER ASKS AI.", "What enters the answer?"],
    ["03 / THE BLIND SPOT", "WHAT IF THEY NEVER SEE YOU?", "Your brand may be missing from the conversation."],
    ["04 / THE OPPORTUNITY", "MAKE THE INVISIBLE VISIBLE.", "Observe answers. Trace sources. Find the signal."],
    ["05 / THE INTELLIGENCE", "DISCOVER. MEASURE. DIAGNOSE.", "A workflow built around observable evidence."],
    ["06 / THE ACTION", "FROM SIGNAL TO ACTION.", "Prioritize. Review. Verify."],
    ["07 / THE EVIDENCE", "MEASURE AGAIN. KNOW WHAT CHANGED.", "Before and after. Without the guesswork."],
    ["08 / INTRODUCING", "BE PRESENT IN THE ANSWER.", "Understand your AI visibility. promptence.tech"]
  ],
  ru: [
    ["01 / ПЕРЕМЕНЫ", "ПЕРВАЯ СТРАНИЦА ИЗМЕНИЛАСЬ.", "Поиск всё чаще превращается в диалог."],
    ["02 / ВОПРОС ПОКУПАТЕЛЯ", "КЛИЕНТ СПРАШИВАЕТ ИИ.", "Какие бренды он увидит в ответе?"],
    ["03 / СЛЕПАЯ ЗОНА", "А ЕСЛИ ВАС НЕ УВИДЯТ?", "Ваш бренд могут не упомянуть."],
    ["04 / ВОЗМОЖНОСТЬ", "СДЕЛАЙ НЕВИДИМОЕ ВИДИМЫМ.", "Изучай ответы. Отслеживай источники."],
    ["05 / АНАЛИТИКА", "НАЙДИ. ИЗМЕРЬ. ОБЪЯСНИ.", "Решения на основе наблюдаемых данных."],
    ["06 / ДЕЙСТВИЯ", "ОТ СИГНАЛА К ДЕЙСТВИЮ.", "Определи приоритеты. Проверь изменения."],
    ["07 / ДОКАЗАТЕЛЬСТВА", "ИЗМЕРЬ ЕЩЁ РАЗ.", "Сравни до и после. Без гарантий позиций."],
    ["08 / PROMPTENCE", "СТАНЬ ЧАСТЬЮ ОТВЕТА.", "Исследуй видимость бренда в ИИ. promptence.tech"]
  ],
  hy: [
    ["01 / ՓՈՓՈԽՈՒԹՅՈՒՆ", "ԱՌԱՋԻՆ ԷՋԸ ՓՈԽՎԵԼ Է։", "Որոնումը վերածվում է երկխոսության։"],
    ["02 / ԳՆՈՐԴԻ ՀԱՐՑԸ", "ՀԱՃԱԽՈՐԴԸ ՀԱՐՑՆՈՒՄ Է AI-ԻՆ։", "Ի՞նչ է հայտնվում պատասխանում։"],
    ["03 / ՉՆԿԱՏՎՈՂ ԽՆԴԻՐ", "ԻՍԿ ԵԹԵ ՁԵԶ ՉՆԿԱՏԵ՞Ն։", "Ձեր բրենդը կարող է չհիշատակվել։"],
    ["04 / ՀՆԱՐԱՎՈՐՈՒԹՅՈՒՆ", "ՏԵՍԱՆԵԼԻ ԴԱՐՁՐԵՔ ԱՆՏԵՍԱՆԵԼԻՆ։", "Ուսումնասիրեք պատասխաններն ու աղբյուրները։"],
    ["05 / ՉԱՓՈՒՄ", "ՀԱՅՏՆԱԲԵՐԵԼ։ ՉԱՓԵԼ։ ՎԵՐԼՈՒԾԵԼ։", "Դիտարկումների վրա հիմնված ընթացակարգ։"],
    ["06 / ԳՈՐԾՈՂՈՒԹՅՈՒՆ", "ՏՎՅԱԼԻՑ ԴԵՊԻ ԳՈՐԾՈՂՈՒԹՅՈՒՆ։", "Սահմանեք առաջնահերթությունները։ Ստուգեք։"],
    ["07 / ԱՊԱՑՈՒՅՑ", "ՉԱՓԵՔ ԿՐԿԻՆ։", "Համեմատեք առաջ և հետո։ Առանց երաշխիքների։"],
    ["08 / PROMPTENCE", "ԵՂԵՔ AI-Ի ՊԱՏԱՍԽԱՆՈՒՄ։", "Բացահայտեք ձեր տեսանելիությունը։ promptence.tech"]
  ]
};
const CAMPAIGN_DURATIONS = [4.3, 4.2, 4.4, 4.5, 4.9, 4.7, 4.3, 5.2];
export function createPromptenceCampaign(language: Language = "en", format: MotionFormat = "portrait"): MotionProject {
  return sanitizeMotionProject({
    version: 1,
    title: "PROMPTENCE / 2026 DIRECTOR'S CUT / THE ANSWER IS THE NEW FRONT PAGE",
    brand: "promptence", format, style: "cinematic", language,
    signatureFilm: "promptence-answer", seed: 20261011,
    scenes: CAMPAIGN_WORDS[language].map(([eyebrow, headline, support], i) => ({
      id: "scene-" + (i + 1), kind: KINDS[i], eyebrow, headline, support,
      seconds: CAMPAIGN_DURATIONS[i],
      typographyScale: language === "hy" ? .82 : language === "ru" ? .89 : .92
    }))
  });
}
