"use client";

import {useEffect,useState,type ChangeEvent} from "react";
import {sanitizeMotionProject,type MotionFormat,type MotionProject} from "@/lib/motion/studio";
import {buildCinematicPack,cinematicTextPack,quickProjectFromCinematic,type CinematicPack} from "@/lib/motion/ai-cinematic-bridge";
import styles from "./cinematic.module.css";

const DRAFT="motion-ai-cinematic-draft-v1";
const QUICK="margaryan-motion-quick-project-v1";
function download(name:string,content:string,mime="text/plain"){
  const url=URL.createObjectURL(new Blob([content],{type:mime+";charset=utf-8"}));
  const a=document.createElement("a");a.href=url;a.download=name;
  document.body.appendChild(a);a.click();a.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),30000);
}
const starter="Кинематографичный рекламный ролик: показать реальную проблему аудитории, убедительное решение и ясный призыв к действию без выдуманных результатов.";
export default function CinematicBridgePage(){
  const [concept,setConcept]=useState(starter);
  const [brandLabel,setBrandLabel]=useState("VETOGRAM");
  const [format,setFormat]=useState<MotionFormat>("portrait");
  const [project,setProject]=useState<MotionProject|null>(null);
  const [projectName,setProjectName]=useState("");
  const [pack,setPack]=useState<CinematicPack|null>(null);
  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");
  useEffect(()=>{
    try{
      const draft=window.localStorage.getItem(DRAFT);
      if(!draft)return;
      window.localStorage.removeItem(DRAFT);
      const decoded=JSON.parse(draft) as {project?:unknown;concept?:string;brandLabel?:string};
      if(decoded.project){
        const imported=sanitizeMotionProject(decoded.project);
        setProject(imported);setProjectName("Проект из Motion Creator");
        setFormat(imported.format);
      }
      if(typeof decoded.concept==="string"&&decoded.concept.length>=12)setConcept(decoded.concept.slice(0,650));
      if(typeof decoded.brandLabel==="string")setBrandLabel(decoded.brandLabel.slice(0,80));
    }catch{setNotice("Не удалось открыть предыдущий черновик. Можно продолжить с новой идеей.");}
  },[]);
  function resetPlan(){setPack(null);setError("");}
  function compose(){
    try{
      const next=buildCinematicPack({concept,brandLabel,format,project});
      setPack(next);setError("");
      setNotice("Сценарные промпты собраны локально. Никаких запросов к Higgsfield и списаний кредитов.");
    }catch(e){setError(e instanceof Error?e.message:"Невозможно составить сцены");}
  }
  async function loadFile(event:ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0];
    event.target.value="";
    if(!file)return;
    if(file.size>100_000){setError("Файл проекта слишком большой (максимум 100 КБ).");return;}
    try{
      const imported=sanitizeMotionProject(JSON.parse(await file.text()));
      setProject(imported);setProjectName(file.name);setFormat(imported.format);
      resetPlan();setNotice("Загружены только сцены и параметры. Медиафайлы не отправлялись.");
    }catch{setError("Нужен корректный .motion.json из Motion Studio.");}
  }
  async function copy(text:string){
    try{
      await navigator.clipboard.writeText(text);
      setNotice("Текст скопирован. Генерация начнётся только если ты сам запустишь её у провайдера.");
    }catch{
      download("margaryan-motion-cinematic-prompts.txt",text);
      setNotice("Буфер обмена недоступен — промпты сохранены в TXT.");
    }
  }
  function openQuick(){
    if(!pack)return;
    try{
      const current=localStorage.getItem(QUICK);
      if(current&&!window.confirm("Заменить сохранённый Quick Studio storyboard? Ранее загруженные в браузер клипы не войдут в новый проект. Сначала сохрани его JSON, если нужно."))return;
      localStorage.setItem(QUICK,JSON.stringify(quickProjectFromCinematic(pack)));
      window.location.assign("/motion?mode=quick");
    }catch{setError("Хранилище браузера недоступно. Скачай файл сборки и импортируй его вручную.");}
  }
  return <main className={styles.page}>
    <nav className={styles.nav} aria-label="Навигация Motion Studio">
      <a href="/motion/create" className={styles.wordmark}><b>M<span>.</span></b><span>MARGARYAN <strong>MOTION</strong><small>DIRECTOR WORKSPACE</small></span></a>
      <div><a href="/motion?mode=cinematic">STUDIO / FREE ↗</a><a href="/motion?mode=quick">QUICK EDITOR ↗</a></div>
    </nav>
    <div className={styles.shell}>
      <section className={styles.hero}>
        <span className={styles.kicker}>FILM ENGINE / 02 · OPTIONAL GENERATIVE STUDIO</span>
        <h1>AI <em>CINEMATIC.</em><br/>Твоя идея — <span>по кадрам.</span></h1>
        <p>Режиссёрский маршрут для Higgsfield и других видеомоделей. Сначала бесплатный сценарий, затем только выбранные тобой генерации. Готовые клипы собираются в нашем Motion Studio.</p>
        <div className={styles.status}><span><i/> FREE PROMPT COMPILER</span><span>NO MODEL CALLS</span><span>NO AUTO CHARGES</span></div>
      </section>
      <div className={styles.layout}>
        <section className={styles.panel} aria-label="Режиссёрское задание">
          <div className={styles.panelTop}><small>01 — PRE-PRODUCTION</small><strong>СЦЕНАРИЙ И СТИЛЬ</strong></div>
          <div className={styles.body}>
            <label htmlFor="cinematic-brand">Бренд / название</label>
            <input id="cinematic-brand" value={brandLabel} maxLength={80}
              onChange={e=>{setBrandLabel(e.target.value);resetPlan();}}/>
            <label htmlFor="cinematic-idea">Что должен показать ролик?</label>
            <textarea id="cinematic-idea" rows={5} maxLength={650} value={concept}
              onChange={e=>{setConcept(e.target.value);resetPlan();}}
              placeholder="Продукт, аудитория, настроение, реальные преимущества, нужный результат…"/>
            <label>Соотношение сторон</label>
            <div className={styles.formats}>
              {([["portrait","9:16 · Reels"],["landscape","16:9 · Film"],["square","1:1 · Social"]] as const).map(([id,label])=>
                <button key={id} aria-pressed={format===id} className={format===id?styles.selected:""} onClick={()=>{setFormat(id);resetPlan();}}>{label}</button>)}
            </div>
            <div className={styles.source}>
              <div><b>Сценарий из существующего Motion</b>
                <p>{projectName||"Можно загрузить Motion JSON или работать с четырьмя новыми кадрами."}</p></div>
              {project&&<button onClick={()=>{setProject(null);setProjectName("");resetPlan();}} type="button">УБРАТЬ</button>}
              <label className={styles.import}>↑ ЗАГРУЗИТЬ .MOTION.JSON<input type="file" accept=".json,.motion.json,application/json" onChange={e=>void loadFile(e)}/></label>
            </div>
            <button className={styles.primary} type="button" onClick={compose}>✳ СОБРАТЬ КИНО-ПЛАН <span>↗</span></button>
            {error&&<p className={styles.error} role="alert">{error}</p>}
            {notice&&<p className={styles.notice} role="status">{notice}</p>}
          </div>
        </section>
        <section className={styles.output} aria-label="Монтажный маршрут">
          <div className={styles.overview}>
            <div><small>02 — SHOT BOARD</small><h2>{pack?"Готово к производству":"Режиссёрский план"}</h2>
              <p>{pack?pack.shots.length+" кадров · "+pack.totalSeconds+" секунд · "+pack.brandLabel:"Нажми «Собрать кино-план». Получишь промпт на каждый кадр, не расходуя кредиты."}</p></div>
            <div className={styles.counter}>{pack?String(pack.shots.length).padStart(2,"0"):"04"}<small>SHOTS</small></div>
          </div>
          {pack?<div className={styles.shots}>
            {pack.shots.map(shot=><article className={styles.shot} key={shot.index}>
              <div className={styles.shotNumber}>{String(shot.index).padStart(2,"0")}</div>
              <div className={styles.shotBody}><div className={styles.shotTitle}><strong>{shot.title}</strong><small>{shot.seconds}s · CINEMATIC</small></div>
                <p>{shot.subtitle||"Фокус на ощущении и визуальном развитии идеи."}</p>
                <details><summary>ПОСМОТРЕТЬ ПРОМПТ</summary><p className={styles.prompt}>{shot.visualPrompt}</p><p className={styles.prompt}><b>AVOID:</b> {shot.avoid}</p></details>
                <button onClick={()=>void copy(shot.visualPrompt+"\nAvoid: "+shot.avoid)} type="button">СКОПИРОВАТЬ КАДР ↗</button>
              </div>
            </article>)}
          </div>:<div className={styles.empty}>
            <div className={styles.emptyLens}><div/></div>
            <b>СТАРТ С РЕЖИССУРЫ.</b><p>Здесь появится последовательность кадров для твоей рекламы. Ничего не отправляется внешним сервисам.</p>
          </div>}
          <div className={styles.delivery}>
            <div><small>03 — DELIVERY</small><h3>От идеи к ролику</h3>
              <p>Копируй промпты, генерируй нужные клипы только после проверки стоимости, скачай их и загрузите в бесплатный Quick Studio.</p></div>
            <div className={styles.buttons}>
              <button disabled={!pack} type="button" onClick={()=>pack&&void copy(cinematicTextPack(pack))}>КОПИРОВАТЬ ВЕСЬ ПЛАН</button>
              <button disabled={!pack} type="button" onClick={()=>pack&&download("motion-cinematic-shot-pack.txt",cinematicTextPack(pack))}>↓ СКАЧАТЬ PROMPT PACK</button>
              <button disabled={!pack} type="button" onClick={()=>pack&&download("motion-quick-assembly.json",JSON.stringify(quickProjectFromCinematic(pack),null,2),"application/json")}>↓ СЦЕНЫ ДЛЯ МОНТАЖА</button>
              <button disabled={!pack} className={styles.assemble} type="button" onClick={openQuick}>ОТКРЫТЬ СБОРКУ В STUDIO ↗</button>
            </div>
            <p className={styles.disclaimer}>Higgsfield MCP подключается в ChatGPT отдельно от веб-приложения. Это локальный режиссёрский мост, а не прямая платная API-интеграция: файлы не загружаются, внешние генерации не запускаются и готовый MP4 здесь не создаётся.</p>
          </div>
        </section>
      </div>
      <footer>© MARGARYAN MOTION / ORIGINAL ENGINE <span>STUDIO → AI CINEMATIC → FINAL CUT</span></footer>
    </div>
  </main>;
}
