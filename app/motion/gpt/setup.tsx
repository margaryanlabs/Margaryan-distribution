"use client";
import {useState} from "react";
import styles from "../create/creator.module.css";

const ACTION_URL="https://distribution-web-production.up.railway.app/api/motion/gpt/openapi";
const RULES=`YOU ARE: Margaryan Motion Director — a premium film director, creative strategist and first-party Motion Studio assistant.

WORKFLOW:
1. Ask what the viewer should understand, the product/brand, preferred length, language and distribution format. Be concise; choose reasonable defaults.
2. Turn the approved public-safe brief into a polished original film concept: opening hook, scene beats, evidence, voice outline and closing CTA. Never invent customer metrics, results, product UI, testimonials or rights.
3. Call createMotionStoryboard via the connected Action. Use brand values exactly: promptence, veto, raios, labs, ingu, meqena, suren, veto_private, veto_sport, armat, tun, hay_engine or reality_engine. Formats: portrait, landscape, square. Languages: ru, en, hy. Styles: cinematic, kinetic, technical.
4. Return the resulting REAL editable Motion JSON (or as a .motion.json file). For edits use the same native JSON schema, keep all scenes valid. Ask the user to open https://distribution-web-production.up.railway.app/motion/create and choose IMPORT GPT PROJECT, then save the output into Motion Studio.
5. The Action is ONLY a storyboard generator. Never say an MP4, neural narration, original source footage or commercial approval was created unless the owner independently completed rendering and QC. Private Railway rendering is not exposed through this public Action.

VOICE: Creative but precise, cinematic not hype, understandable to a non-technical creator. Respond in the user's language. Never ask for passwords, private client records or secret keys.`;
export default function GptSetup(){
 const [copied,setCopied]=useState<"schema"|"instructions"|null>(null);
 async function copy(text:string,key:"schema"|"instructions"){
  try{await navigator.clipboard.writeText(text);setCopied(key);setTimeout(()=>setCopied(null),2500);}catch{}
 }
 return <div className={styles.gptSteps}>
   <div className={styles.gptStepsHeader}><span>CONNECTION GUIDE</span><strong>03 STEPS</strong></div>
   <section className={styles.gptStep}><span className={styles.gptN}>01</span>
    <div><h2>Создай GPT</h2><p>Открой конструктор собственных GPT в ChatGPT и выбери Create. Название: <b>Margaryan Motion Director</b>.</p>
    <a className={styles.gptWhiteButton} href="https://chatgpt.com/gpts/editor" target="_blank" rel="noopener noreferrer">ОТКРЫТЬ GPT BUILDER ↗</a></div>
   </section>
   <section className={styles.gptStep}><span className={styles.gptN}>02</span>
    <div><h2>Добавь настоящую Action</h2><p>В Configure → Actions → Create new action выбери <b>Import from URL</b> и вставь эту ссылку. Авторизация: <b>None</b> — только для публичного сценария.</p>
     <div className={styles.gptCopy}><code>…/api/motion/gpt/openapi</code>
     <button type="button" onClick={()=>void copy(ACTION_URL,"schema")}>{copied==="schema"?"✓ COPIED":"COPY URL ↗"}</button></div></div>
   </section>
   <section className={styles.gptStep}><span className={styles.gptN}>03</span>
    <div><h2>Вставь инструкции режиссёра</h2><p>Скопируй роль, ограничения и порядок создания в поле Instructions. Затем проверь Action в Preview и сохрани GPT.</p>
     <button className={styles.gptOutlineButton} type="button" onClick={()=>void copy(RULES,"instructions")}>{copied==="instructions"?"✓ ИНСТРУКЦИИ СКОПИРОВАНЫ":"СКОПИРОВАТЬ ИНСТРУКЦИИ GPT ↗"}</button>
    </div>
   </section>
   <div className={styles.gptFootNote}><span>✳</span><p>GPT Actions можно настроить без ключа OpenAI API на нашей стороне. Подключение выполняется владельцем GPT в ChatGPT, а итоговый MP4 отдельно экспортируется средствами Motion Studio. Если GPT публикуется по ссылке, укажи <a href="/motion/privacy">политику конфиденциальности</a>.</p></div>
  </div>;
}
