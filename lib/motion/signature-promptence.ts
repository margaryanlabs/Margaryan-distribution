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
