"use client";
import {useCallback,useEffect,useRef,useState,type CSSProperties} from "react";
import {BRAND_INFO,durationOf,sanitizeMotionProject,type MotionBrand,type MotionFormat,type MotionProject} from "@/lib/motion/studio";
import {drawMotionFrame} from "@/lib/motion/render-engine";
import {preloadMotionLogo} from "@/lib/motion/brand-assets";
import {buildMotionChatHandoff} from "@/lib/motion/chat-handoff";
import styles from "./creator.module.css";

type Goal="campaign"|"demo"|"social"|"story";
type Voice="ru"|"en"|"hy";
type Style="cinematic"|"kinetic"|"technical";
type Phase="idea"|"direction"|"preview";
const BRANDS:MotionBrand[]=["promptence","veto","veto_sport","raios","labs","ingu","meqena","suren","armat","tun","hay_engine","reality_engine"];
const GOALS:{id:Goal;name:string;desc:string;poster:string;tag:string}[]=[
 {id:"campaign",name:"Кино-реклама",desc:"Для запуска и продвижения бренда",poster:"MAKE IT\nMOVE.",tag:"BRAND / CINEMA"},
 {id:"demo",name:"Демо продукта",desc:"Покажем пользу и реальный процесс",poster:"SHOW.\nDON’T TELL.",tag:"PRODUCT / DEMO"},
 {id:"social",name:"Reels / Stories",desc:"Короткая динамичная история",poster:"STOP\nSCROLLING.",tag:"SOCIAL / VERTICAL"},
 {id:"story",name:"Презентация",desc:"Объяснить идею, а не просто впечатлить",poster:"THE\nBIG IDEA.",tag:"EDITORIAL / STORY"}
];
const FORMATS:{id:MotionFormat;title:string;ratio:string}[]=[
 {id:"portrait",title:"Vertical",ratio:"9:16"},
 {id:"landscape",title:"Wide",ratio:"16:9"},
 {id:"square",title:"Square",ratio:"1:1"}
];
const SAMPLES=[
 "Кинематографичная реклама AI-платформы: человек узнаёт о продукте, видит проблему и понятный следующий шаг. Никаких выдуманных результатов.",
 "Динамичная история нового сервиса: настоящая ценность, простые объяснения, выразительная типографика и сильный финал.",
 "Минималистичная презентация продукта с убедительным началом, тремя конкретными преимуществами и понятным призывом к действию."
];
function time(s:number){const n=Math.floor(s);return Math.floor(n/60).toString().padStart(2,"0")+":"+(n%60).toString().padStart(2,"0");}
function saveFile(project:MotionProject){
 const blob=new Blob([JSON.stringify(project,null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob);
 const a=document.createElement("a");a.href=url;a.download="margaryan-motion-project.motion.json";
 document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function PublicMotionCreator(){
 const [phase,setPhase]=useState<Phase>("idea");
 const [goal,setGoal]=useState<Goal>("campaign");
 const [brand,setBrand]=useState<MotionBrand>("labs");
 const [format,setFormat]=useState<MotionFormat>("portrait");
 const [language,setLanguage]=useState<Voice>("ru");
 const [style,setStyle]=useState<Style>("cinematic");
 const [brief,setBrief]=useState("");
 const [project,setProject]=useState<MotionProject|null>(null);
 const [busy,setBusy]=useState(false);
 const [exporting,setExporting]=useState(false);
 const [exportProgress,setExportProgress]=useState(0);
 const [playing,setPlaying]=useState(true);
 const [seek,setSeek]=useState(0);
 const [notice,setNotice]=useState("");
 const [error,setError]=useState("");
 const [showImport,setShowImport]=useState(false);
 const [importJson,setImportJson]=useState("");
 const [assetRevision,setAssetRevision]=useState(0);
 const canvas=useRef<HTMLCanvasElement|null>(null);
 const seekTime=useRef(0);
 const isPlaying=useRef(true);
 const changeProject=(next:MotionProject)=>{setProject(sanitizeMotionProject(next));setNotice("Сцены обновлены в этом браузере.");};
 const loadProject=(raw:unknown)=>{
   if(!raw||typeof raw!=="object")throw Error("Ожидался JSON проекта Motion Studio.");
   const x=raw as Record<string,unknown>;
   const candidate=(x.protocol==="motion-chat-v1"&&x.action==="create")?x.project:
     (x.project&&typeof x.project==="object")?x.project:x;
   if(!candidate||typeof candidate!=="object"||!Array.isArray((candidate as MotionProject).scenes))
     throw Error("Это не поддерживаемый проект Motion Studio.");
   if((candidate as MotionProject).scenes.length>12)throw Error("Для публичного проекта допускается не более 12 сцен.");
   const checked=sanitizeMotionProject(candidate);
   setProject(checked);setFormat(checked.format);setBrand(checked.brand);
   setPhase("preview");setSeek(0);seekTime.current=0;setError("");setShowImport(false);
   setNotice("Проект GPT импортирован локально. Проверьте сцены и сохраните черновик.");
 };
 const importFromText=()=>{
  try{
   if(importJson.length>16000)throw Error("JSON слишком большой. Максимум 16 000 символов.");
   loadProject(JSON.parse(importJson));
  }catch(e){setError(e instanceof Error?e.message:"Неправильный формат JSON");}
 };
 const importFile=async(file:File|null)=>{
  if(!file)return;
  try{if(file.size>16000)throw Error("Файл слишком большой.");loadProject(JSON.parse(await file.text()));}
  catch(e){setError(e instanceof Error?e.message:"Не удалось импортировать JSON.");}
 };
 const create=async()=>{
  if(brief.trim().length<12){setError("Опиши идею хотя бы в одном предложении — от 12 символов.");setPhase("idea");return;}
  setBusy(true);setError("");setNotice("");
  try{
   const intent=GOALS.find(x=>x.id===goal)?.name||"Кино-реклама";
   const prompt=(intent+". "+brief.trim()).slice(0,650);
   const response=await fetch("/api/motion/storyboard",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({prompt,brand,format,language,style})
   });
   const result=await response.json();
   if(!response.ok||!result.project||result.rendered!==false)
    throw Error(result.error||"Режиссёр не смог подготовить сценарий.");
   loadProject(result.project);
   setNotice("Готово: наш Motion Director построил настоящий редактируемый сценарий. Это ещё не MP4.");
  }catch(e){setError(e instanceof Error?e.message:"Временно не удалось создать сценарий.");}
  finally{setBusy(false);}
 };
 useEffect(()=>{
  if(!project)return;
  let active=true;
  void preloadMotionLogo(project.brand).then(()=>{if(active)setAssetRevision(n=>n+1);});
  return()=>{active=false;};
 },[project?.brand]);
 useEffect(()=>{
  if(!project||!canvas.current)return;
  const target=canvas.current;
  const width=project.format==="landscape"?960:project.format==="square"?720:540;
  const height=project.format==="landscape"?540:project.format==="square"?720:960;
  target.width=width;target.height=height;
  const ctx=target.getContext("2d",{alpha:false});
  if(!ctx)return;
  const duration=durationOf(project);
  let raf=0,last=performance.now(),lastRender=0;
  function tick(now:number){
   const dt=Math.min(.12,(now-last)/1000);last=now;
   if(isPlaying.current&&duration>0){
    seekTime.current=(seekTime.current+dt)%duration;
   }
   if(now-lastRender>34){
    drawMotionFrame(ctx!,project!,seekTime.current,width,height);
    lastRender=now;
   }
   raf=requestAnimationFrame(tick);
  }
  raf=requestAnimationFrame(tick);
  return()=>cancelAnimationFrame(raf);
 },[project,assetRevision]);
 useEffect(()=>{isPlaying.current=playing;},[playing]);
 useEffect(()=>{
  if(!project)return;
  const t=setInterval(()=>setSeek(seekTime.current),130);
  return()=>clearInterval(t);
 },[project]);
 const exportWorkprint=async()=>{
  if(exporting||busy||!project||!canvas.current)return;
  const surface=canvas.current;
  if(typeof surface.captureStream!=="function"||typeof MediaRecorder==="undefined"){
   setError("Этот браузер не поддерживает запись видео. Открой полный монтаж в актуальном Chrome / Edge.");return;
  }
  const candidates=["video/mp4;codecs=avc1.42E01E","video/webm;codecs=vp9",
    "video/webm;codecs=vp8","video/webm"];
  const mime=candidates.find(x=>MediaRecorder.isTypeSupported(x));
  if(!mime){setError("Нет поддерживаемого видеокодека MP4/WebM. Попробуй полный редактор.");return;}
  setExporting(true);setExportProgress(0);setError("");
  setNotice("Записываем настоящее видео из кадров нашего Canvas. Держи вкладку открытой: видео пока без звука.");
  setPlaying(true);isPlaying.current=true;seekTime.current=0;setSeek(0);
  const duration=durationOf(project);
  let stream:MediaStream|null=null,recorder:MediaRecorder|null=null,timer:ReturnType<typeof setInterval>|null=null;
  let interrupted=false;
  const hidden=()=>{
   if(document.hidden){interrupted=true;
    if(recorder?.state==="recording")recorder.stop();
   }
  };
  document.addEventListener("visibilitychange",hidden);
  try{
   if(duration<3||duration>64)throw Error("Для быстрого экспорта фильм должен длиться от 3 до 64 секунд.");
   stream=surface.captureStream(30);
   recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:6_000_000});
   const pieces:Blob[]=[];
   const recording=recorder;
   const completed=new Promise<Blob>((resolve,reject)=>{
    recording.ondataavailable=e=>{if(e.data.size>0)pieces.push(e.data);};
    recording.onerror=()=>reject(Error("Браузерный видеокодер завершился с ошибкой."));
    recording.onstop=()=>resolve(new Blob(pieces,{type:mime.split(";")[0]}));
   });
   recording.start(500);
   const startAt=performance.now();
   timer=setInterval(()=>{
    const elapsed=(performance.now()-startAt)/1000;
    setExportProgress(Math.min(100,Math.floor(elapsed/duration*100)));
    if(elapsed>=duration&&recording.state==="recording")recording.stop();
   },100);
   const blob=await completed;
   if(interrupted)throw Error("Экспорт прервался: вкладка была скрыта. Повтори и не переключай приложения.");
   if(blob.size<3000||blob.size>120_000_000)throw Error("Видеофайл пуст или превышает 120 МБ.");
   const extension=mime.startsWith("video/mp4")?"mp4":"webm";
   const url=URL.createObjectURL(blob),a=document.createElement("a");
   a.href=url;a.download="margaryan-motion-"+project.brand+"-workprint."+extension;
   document.body.appendChild(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(url),30_000);
   setExportProgress(100);
   setNotice("Видео "+extension.toUpperCase()+" записано на устройство. Это реальный, но немой черновой фильм. Проверь качество перед публикацией.");
  }catch(e){setError(e instanceof Error?e.message:"Не удалось экспортировать видео.");}
  finally{
   if(timer)clearInterval(timer);
   document.removeEventListener("visibilitychange",hidden);
   if(recorder?.state==="recording")recorder.stop();
   stream?.getTracks().forEach(t=>t.stop());
   isPlaying.current=false;setPlaying(false);setExporting(false);
  }
 };
 const share=async()=>{
  const link=window.location.origin+"/motion/create";
  try{
   if(navigator.share)await navigator.share({title:"Margaryan Motion Studio",url:link,
    text:"Создайте сценарий своего ролика и посмотрите его в нашем Motion Studio."});
   else{await navigator.clipboard.writeText(link);setNotice("Ссылка на публичную студию скопирована.");}
  }catch{/* cancelled browser share */}
 };
 const copyForChatGPT=async()=>{
  if(brief.trim().length<12&&!project){setError("Сначала напиши идею — она нужна для персональной режиссуры.");return;}
  const text=buildMotionChatHandoff({brief,brand,format,language,style,
   goal:GOALS.find(x=>x.id===goal)?.name||"Кино-реклама",project});
  try{
   await navigator.clipboard.writeText(text);
   setNotice("Режиссёрское задание скопировано. Теперь вручную вставь его в этот чат ChatGPT — сайт ничего не отправил автоматически.");
  }catch{
   const blob=new Blob([text],{type:"text/plain;charset=utf-8"});
   const url=URL.createObjectURL(blob);
   const a=document.createElement("a");a.href=url;a.download="motion-chatgpt-director-brief.txt";
   document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
   setNotice("Бриф скачан: открой текст и отправь его в ChatGPT вручную.");
  }
 };
 const startFresh=()=>{
  if(exporting)return;
  if(project&&!window.confirm("Начать новый фильм с чистого листа? Текущий несохранённый проект в этом окне будет заменён. Сначала скачай его JSON, если он нужен."))return;
  setProject(null);setBrief("");setGoal("campaign");setBrand("labs");setFormat("portrait");setLanguage("ru");setStyle("cinematic");
  setPhase("idea");setPlaying(true);setSeek(0);seekTime.current=0;setImportJson("");setError("");
  setNotice("НОВЫЙ ФИЛЬМ: никаких материалов из предыдущего проекта не импортировано.");
 };
 const openAiCinematic=()=>{
  const draft={concept:brief.trim().length>=12?brief:SAMPLES[0],
   brandLabel:BRAND_INFO[brand].name,project};
  try{
   localStorage.setItem("motion-ai-cinematic-draft-v1",JSON.stringify(draft));
   window.location.assign("/motion/ai-cinematic");
  }catch{setError("Невозможно перенести черновик в браузере. Сначала скачай Motion JSON или открой AI Cinematic отдельно.");}
 };
 const openEditor=()=>{
  if(!project)return;
  try{
   const key="margaryan-motion-studio-v1";
   const old=localStorage.getItem(key);
   if(old&&!window.confirm("В редакторе уже есть сохранённый проект этого браузера. Заменить его новым? Сначала скачай старый JSON, если он важен."))return;
   localStorage.setItem(key,JSON.stringify(project));
   localStorage.setItem("motion-first-film-v1","yes");
   window.location.href="/motion";
  }catch{setError("Браузер заблокировал локальное сохранение. Сначала скачай JSON.");}
 };
 const summary=project?{shots:project.scenes.length,seconds:durationOf(project)}:null;
 return <main className={styles.page}>
  <div className={styles.glowTop} aria-hidden="true"/>
  <header className={styles.nav}>
   <a href="/motion/create" className={styles.logo} aria-label="Margaryan Motion — public creator">
    <span className={styles.logosymbol}>M<span>.</span></span>
    <span className={styles.logotype}>MARGARYAN <em>MOTION</em><small>FILM CREATION SYSTEM</small></span>
   </a>
   <div className={styles.navRight}>
    <span className={styles.engineBadge}><i/> ENGINE ONLINE</span>
    <a href="/motion/gpt" className={styles.navGpt}>GPT DIRECTOR ↗</a>
    <button type="button" onClick={()=>void share()} className={styles.shareTop}>↗ <span>Поделиться</span></button>
   </div>
  </header>
  <div className={styles.shell}>
   <div className={styles.content}>
    <div className={styles.intro}>
     <div className={styles.kicker}><span className={styles.kLine}/> NOT ANOTHER VIDEO MAKER <b>·</b> YOUR OWN FILM ENGINE</div>
     <h1>Идея.<br/>Режиссура.<br/><em>Движение.</em></h1>
     <p>Создай свой фильм в несколько шагов. Сценарий, настоящая анимация нашего движка, сцены для монтажа и возможность продолжить в ChatGPT.</p>
     <div className={styles.trust}>
      <span><i>✓</i> Оригинальный Motion Engine</span>
      <span><i>✓</i> Живой предпросмотр</span>
      <span><i>✓</i> Без API-ключа</span>
     </div>
    </div>
    <div className={styles.wizard}>
     <div className={styles.progress} role="navigation" aria-label="Этапы создания">
      {([{id:"idea",title:"Идея"},{id:"direction",title:"Стиль"},{id:"preview",title:"Ваш фильм"}] as const).map((x,i)=>
       <button key={x.id} disabled={x.id==="preview"&&!project} type="button" data-active={phase===x.id}
        data-done={["idea","direction","preview"].indexOf(phase)>i} onClick={()=>{setError("");setPhase(x.id);}}>
        <small>0{i+1}</small><span>{x.title}</span><i/></button>)}
     </div>
     {phase==="idea"&&<section className={styles.stepBody} aria-label="Этап 1. Выберите тип ролика">
       <div className={styles.stepHeading}><small>01 / SELECT YOUR FILM</small><h2>Какой фильм<br/><em>создаём?</em></h2>
        <p>Выбери задачу — режиссёр подстроит структуру истории.</p></div>
       <div className={styles.goalGrid}>{GOALS.map((x,i)=><button type="button" key={x.id}
        data-active={goal===x.id} className={styles.goalCard} onClick={()=>setGoal(x.id)}
        aria-pressed={goal===x.id}>
         <span className={styles.goalPoster} data-tone={i}><small>{x.tag}</small><strong>{x.poster.split("\n").map((word,k)=><span key={k}>{word}</span>)}</strong><i>0{i+1} — SELECT</i></span>
         <span className={styles.goalTitle}><b>{x.name}</b><i>{goal===x.id?"✓":"↗"}</i></span><span className={styles.goalDesc}>{x.desc}</span>
        </button>)}</div>
       <label className={styles.fieldLabel} htmlFor="motion-idea">Расскажи о своей идее <span>ОБЯЗАТЕЛЬНО</span></label>
       <textarea id="motion-idea" value={brief} maxLength={650} onChange={e=>setBrief(e.target.value)}
        placeholder="Например: нужна стильная реклама нашего сервиса, чтобы клиент за 30 секунд понял, что мы делаем и зачем ему это…" rows={4}/>
       <div className={styles.exampleRow}><span>НЕТ ИДЕИ? ПОПРОБУЙ:</span>{SAMPLES.slice(0,2).map((sample,i)=><button key={i}
        type="button" onClick={()=>setBrief(sample)}>ПРИМЕР 0{i+1} ↗</button>)}</div>
       <div className={styles.actions}><button className={styles.primary} type="button"
        onClick={()=>{if(brief.trim().length<12){setError("Напиши минимум одно предложение об идее.");return;}setError("");setPhase("direction");}}>
        ПРОДОЛЖИТЬ <span>↗</span></button>
        <button className={styles.secondary} type="button" onClick={()=>{setShowImport(true);setError("");}}>
         ИМПОРТ ПРОЕКТА GPT ↓</button></div>
       <div className={styles.chatBridge}>
        <small>DIRECTOR / CODE MODE</small>
        <strong>Хочешь по-настоящему авторский ролик?</strong>
        <p>Обычный режим создаёт анимацию нашим шаблонным движком. Для уникальных сцен и режиссуры через код скопируй бриф и <b>вставь его вручную в этот чат ChatGPT</b>. Я смогу работать в существующем GitHub-проекте, а не просто менять надписи.</p>
        <button type="button" onClick={()=>void copyForChatGPT()}>✳ СКОПИРОВАТЬ ЗАДАНИЕ ДЛЯ CHATGPT ↗</button>
        <button type="button" onClick={openAiCinematic}>✦ AI CINEMATIC / ПОКАДРОВАЯ РЕЖИССУРА ↗</button>
        <em>Ничего не отправляется автоматически. Исходники и старые видео не прикладываются.</em>
       </div>
     </section>}
     {phase==="direction"&&<section className={styles.stepBody}>
      <div className={styles.stepHeading}><small>02 / CREATIVE DIRECTION</small><h2>Собери<br/><em>свой стиль.</em></h2>
       <p>Укажи бренд, язык и кадр. Никакой сложной панели управления.</p></div>
      <div className={styles.selectGroup}><label htmlFor="motion-brand">БРЕНД</label>
       <select id="motion-brand" value={brand} onChange={e=>setBrand(e.target.value as MotionBrand)}>
        {BRANDS.map(b=><option key={b} value={b}>{BRAND_INFO[b].name}</option>)}</select></div>
      <div className={styles.selectGroup}><span className={styles.groupLabel}>ФОРМАТ КАДРА</span>
       <div className={styles.segment}>{FORMATS.map(x=><button key={x.id} type="button" data-active={format===x.id}
        onClick={()=>setFormat(x.id)}><b>{x.ratio}</b><small>{x.title}</small></button>)}</div></div>
      <div className={styles.selectGroup}><span className={styles.groupLabel}>ХАРАКТЕР ДВИЖЕНИЯ</span>
       <div className={styles.segment}>{([
        ["cinematic","CINEMA","Плавно, премиально"],["kinetic","KINETIC","Живо и динамично"],["technical","CLEAN","Строго и понятно"]
       ] as const).map(x=><button key={x[0]} type="button" data-active={style===x[0]} onClick={()=>setStyle(x[0])}>
        <b>{x[1]}</b><small>{x[2]}</small></button>)}</div></div>
      <div className={styles.selectGroup}><span className={styles.groupLabel}>ЯЗЫК СЦЕНАРИЯ</span>
       <div className={styles.segment}>{([["ru","Русский"],["en","English"],["hy","Հայերեն"]] as const).map(x=>
        <button type="button" key={x[0]} data-active={language===x[0]} onClick={()=>setLanguage(x[0])}><b>{x[1]}</b></button>)}</div></div>
      <div className={styles.actions}><button type="button" className={styles.primary} disabled={busy}
       onClick={()=>void create()}>{busy?"СОБИРАЕМ СЦЕНЫ…":"СОЗДАТЬ МОЙ ФИЛЬМ"} <span>↗</span></button>
       <button type="button" className={styles.secondary} onClick={()=>setPhase("idea")}>← НАЗАД</button></div>
      <p className={styles.truth}>Сейчас создаётся настоящий проект со сценами и анимацией Motion. MP4, голоса и исходники не генерируются автоматически.</p>
     </section>}
     {phase==="preview"&&project&&summary&&<section className={styles.stepBody}>
      <div className={styles.stepHeading}><small>03 / FILM PREVIEW</small><h2>Твой фильм.<br/><em>В движении.</em></h2>
       <p>Это предпросмотр нашего реального Canvas-движка. Измени кадры или открой профессиональный монтаж.</p></div>
      <div className={styles.previewWrap}>
       <div className={styles.previewFrame} data-format={project.format}>
        <canvas ref={canvas} aria-label="Нативный анимированный предпросмотр сцен Motion Studio"/>
        <span className={styles.previewWatermark}>M. / WORK IN PROGRESS</span>
       </div>
       <div className={styles.previewControls}>
        <div className={styles.previewTop}><span><i className={styles.liveDot}/> REAL ENGINE / LIVE FRAME</span><b>{time(seek)} / {time(summary.seconds)}</b></div>
        <input aria-label="Перемотать фильм" className={styles.scrub} type="range" min={0} max={summary.seconds}
         value={Math.min(seek,summary.seconds)} step={0.1} onChange={e=>{seekTime.current=Number(e.target.value);setSeek(seekTime.current);setPlaying(false);}}/>
        <div className={styles.playRow}><button type="button" onClick={()=>setPlaying(v=>!v)}>{playing?"Ⅱ ПАУЗА":"▶ СМОТРЕТЬ"}</button>
         <span>{summary.shots} СЦЕН · {Math.round(summary.seconds)} СЕК · {project.format==="portrait"?"9:16":project.format==="landscape"?"16:9":"1:1"}</span></div>
       </div>
      </div>
      <div className={styles.scenesTop}><h3>РЕЖИССЁРСКИЕ СЦЕНЫ</h3><span>ЗАГОЛОВКИ МОЖНО ИЗМЕНЯТЬ</span></div>
      <div className={styles.scenes}>{project.scenes.map((s,i)=><div key={s.id} className={styles.sceneCard}>
        <div className={styles.sceneIndex}>0{i+1}<i/></div>
        <div><label htmlFor={"motion-scene-"+i}>{s.eyebrow}</label>
         <input id={"motion-scene-"+i} value={s.headline} maxLength={96}
          onChange={e=>changeProject({...project,scenes:project.scenes.map((x,j)=>i===j?{...x,headline:e.target.value}:x)})}/>
         <small>{s.kind.toUpperCase()} · {s.seconds.toFixed(1)} SEC</small></div>
        <button type="button" aria-label={"Посмотреть сцену "+(i+1)} onClick={()=>{let offset=0;for(let j=0;j<i;j++)offset+=project.scenes[j].seconds;seekTime.current=offset+.5;setSeek(seekTime.current);setPlaying(false);}}>↗</button>
       </div>)}</div>
      <div className={styles.actions}><button type="button" className={styles.primary} onClick={openEditor}>
       ОТКРЫТЬ ПОЛНЫЙ МОНТАЖ <span>↗</span></button>
       <button type="button" className={styles.secondary} onClick={()=>saveFile(project)}>↓ СКАЧАТЬ ПРОЕКТ</button>
       <button type="button" className={styles.secondary} disabled={exporting} onClick={startFresh}>✦ НОВЫЙ ФИЛЬМ / БЕЗ СТАРЫХ СЦЕН</button>
       <button type="button" className={styles.secondary} disabled={exporting} onClick={()=>void exportWorkprint()}>
        {exporting?"● ЗАПИСЬ "+exportProgress+"%":"↓ СКАЧАТЬ ВИДЕО MP4 / WEBM"}
       </button></div>
      <p className={styles.truth}>Быстрый экспорт записывает реальную графику Motion из Canvas, без сторонних генераторов. Файл пока БЕЗ ЗВУКА; формат MP4 или WebM зависит от браузера. Для профессионального звука и мастеринга открой полный монтаж и пройди QA. Во время записи не закрывай вкладку.</p>
      <div className={styles.chatBridge}>
       <small>CHATGPT / AUTHOR-DRIVEN PRODUCTION</small>
       <strong>Сделать этот ролик оригинальным через код</strong>
       <p>Этот предпросмотр собран нашим процедурным движком. Скопируй задание и вставь его в чат со мной: я смогу изучить код Motion Engine, спроектировать уникальные кадры и подготовить изменения в GitHub. Видео не передаётся автоматически.</p>
       <button type="button" onClick={()=>void copyForChatGPT()}>✳ ЗАДАНИЕ ДЛЯ РЕЖИССЁРА В CHATGPT ↗</button>
       <button type="button" onClick={openAiCinematic}>✦ ОТКРЫТЬ AI CINEMATIC / ЭТИ СЦЕНЫ ↗</button>
      </div>
      <p className={styles.truth}>Не готовый рекламный MP4: озвучку, музыку, реальные кадры и финальный экспорт необходимо подтвердить в студии. Для коммерческой публикации обязателен просмотр качества.</p>
     </section>}
     {error&&<p className={styles.error} role="alert">{error}</p>}
     {notice&&<p className={styles.notice} role="status">{notice}</p>}
    </div>
   </div>
   <aside className={styles.side}>
    <div className={styles.poster} aria-hidden="true">
      <div className={styles.posterGrid}/>
      <div className={styles.orbA}/><div className={styles.orbB}/>
      <div className={styles.posterTop}><span>MM / FILM SYSTEM</span><span>01—08</span></div>
      <div className={styles.posterMid}><span>MAKE<br/>YOUR<br/><em>STORY</em></span><strong>MOVE.</strong></div>
      <div className={styles.posterBottom}><span>IDEA TO FRAME</span><b>◉ LIVE MOTION</b></div>
    </div>
    <div className={styles.assistant}>
      <span className={styles.assistantSpark}>✳</span>
      <div><small>YOUR CREATIVE COPILOT</small><strong>Хочешь делать это через GPT?</strong>
       <p>Обычный генератор сайта не отправляет задания ChatGPT. Скопируй бриф через кнопку режиссёра и вставь его в чат, если нужна работа непосредственно с кодом.</p>
       <a href="/motion/gpt">ВАРИАНТ GPT ACTION <span>↗</span></a>
      </div>
    </div>
    <div className={styles.sideProof}>
     <div><i>01</i><span>ТВОЯ ИДЕЯ</span><b>BRIEF</b></div>
     <div><i>02</i><span>НАШ РЕЖИССЁР</span><b>STORY</b></div>
     <div><i>03</i><span>ЖИВОЙ ПРЕДПРОСМОТР</span><b>PREVIEW</b></div>
     <div><i>04</i><span>МОНТАЖ И ЭКСПОРТ</span><b>STUDIO</b></div>
    </div>
   </aside>
  </div>
  {showImport&&<div className={styles.modalShade} role="presentation">
   <section className={styles.importModal} role="dialog" aria-modal="true" aria-label="Импорт проекта GPT">
    <button className={styles.close} type="button" onClick={()=>{setShowImport(false);setError("");}}>✕</button>
    <p className={styles.eyebrow}>GPT → MOTION</p><h2>Импорт сценария.</h2>
    <p>Вставь Motion JSON, созданный твоим GPT Action, или загрузи файл. Исходники остаются в этом браузере.</p>
    <textarea aria-label="Motion project JSON" placeholder='{"project": {"brand":"promptence","scenes":[...]}}'
     value={importJson} onChange={e=>setImportJson(e.target.value)} rows={6}/>
    {error&&<p className={styles.error} role="alert">{error}</p>}
    <div className={styles.modalActions}><button className={styles.primary} type="button" onClick={importFromText}>ИМПОРТИРОВАТЬ ↗</button>
     <label className={styles.fileInput}>↑ ЗАГРУЗИТЬ .JSON<input accept=".json,.motion.json,application/json"
       type="file" onChange={e=>void importFile(e.target.files?.[0]||null)}/></label></div>
   </section></div>}
  <footer className={styles.footer}><div><b>M<span>.</span> MARGARYAN MOTION</b><span>Original creative tools. Human-approved films.</span></div>
   <nav><a href="/motion/commission">ЗАКАЗАТЬ РОЛИК ↗</a><a href="/motion/gpt">GPT CONNECTION</a><a href="/motion/privacy">PRIVACY</a></nav>
  </footer>
 </main>;
}
