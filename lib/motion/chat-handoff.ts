import type {MotionBrand,MotionFormat,MotionProject} from "./studio";

/**
 * Explicit, user-controlled handoff to a human-directed ChatGPT coding session.
 * No prompts, media, source assets or projects are sent to ChatGPT by this function.
 * The user must copy the result and paste it into their chosen conversation.
 */
export interface MotionChatHandoff {
  brief:string;
  brand:MotionBrand;
  format:MotionFormat;
  language:"ru"|"en"|"hy"|"auto";
  style:"cinematic"|"kinetic"|"technical";
  goal:string;
  project?:MotionProject|null;
}
export function buildMotionChatHandoff(input:MotionChatHandoff):string{
  const brief=input.brief.replace(/[\u0000-\u001F\u007F]/g," ").trim().slice(0,650);
  const project=input.project;
  const scenes=project?.scenes.slice(0,8).map((scene,i)=>
    `${i+1}. [${scene.kind}] ${scene.seconds.toFixed(1)}s · ${scene.headline.slice(0,105)}`
  ).join("\n")||"Новый фильм — старые материалы не использовать.";
  return [
    "MARGARYAN MOTION STUDIO / ЗАДАНИЕ AI-РЕЖИССЁРУ С КОДОМ",
    "Я вручную перенёс этот бриф с сайта Motion Studio в ChatGPT. Сайт НЕ отправлял запрос автоматически.",
    "",
    "Проект: margaryanlabs/Margaryan-distribution (СУЩЕСТВУЮЩИЙ репозиторий, без нового приложения).",
    "Нужна авторская режиссура и реализация в коде Motion Engine, а не пересказ моего текста и не готовые шаблоны.",
    "",
    "ТИП РОЛИКА: "+input.goal,
    "БРЕНД: "+input.brand,
    "ФОРМАТ: "+input.format,
    "ЯЗЫК: "+input.language,
    "СТИЛЬ: "+input.style,
    "МОЯ ИДЕЯ:",
    brief||"Предложи оригинальную концепцию; не используй старые ролики.",
    "",
    "СЦЕНЫ ДЛЯ ОРИЕНТИРА (если уже создан предварительный проект):",
    scenes,
    "",
    "ЧТО НУЖНО СДЕЛАТЬ:",
    "1. Проверь текущий код, сценические примитивы и рендер Motion Engine. Определи, что реально можно снять/анимировать.",
    "2. Придумай сильную оригинальную визуальную концепцию, режиссуру сцен, движение камеры, типографику, переходы и финал.",
    "3. При доступе к GitHub внеси изменения в существующий код через ветку и PR. Не подменяй работу общим текстовым промптом.",
    "4. Не загружай повторно чужие или старые видео из локальной медиатеки без моего явного выбора.",
    "5. Запусти доступные тесты, проверь качество и сообщи, что действительно выполнено. Не говори, что есть MP4, пока он не отрендерен.",
    "6. Рендер в частном Railway Worker и публикация требуют отдельной авторизации владельца; не открывай публичный рендер.",
    "",
    "Работай со мной как режиссёр и инженер. Если коду/рендеру нет доступа в этом чате — скажи об этом прямо.",
    "Справка: https://distribution-web-production.up.railway.app/motion/create"
  ].join("\n");
}
