"use client";
import {useEffect,useState} from "react";
import styles from "./render.module.css";
type Job={id:string;state:"queued"|"running"|"complete"|"failed";createdAt:string;
 bytes:number|null;errorCode:string|null;download?:string};
export default function MotionCloudRender(){
 const [jobs,setJobs]=useState<Job[]>([]);
 const [ready,setReady]=useState<boolean|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 useEffect(()=>{
  let active=true;
  async function check(){
   try{
    const response=await fetch("/api/motion/render-jobs",{cache:"no-store",credentials:"same-origin"});
    const result=await response.json();
    if(!active)return;
    if(!response.ok)throw Error(result.error||"Queue temporarily unavailable");
    setReady(result.enabled);
    setJobs(Array.isArray(result.jobs)?result.jobs:[]);
   }catch(e){if(active){setReady(false);setError(e instanceof Error?e.message:"Cannot reach renderer");}}
  }
  void check();
  const t=window.setInterval(()=>void check(),5500);
  return()=>{active=false;window.clearInterval(t);};
 },[]);
 async function render(){
  setBusy(true);setError("");setNotice("");
  try{
   const r=await fetch("/api/motion/render-jobs",{method:"POST",credentials:"same-origin",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({preset:"promptence_cinema"})});
   const result=await r.json();
   if(!r.ok)throw Error(result.error||"Cannot queue film");
   setNotice("Запущен собственный Chromium/FFmpeg. Исходники и ролик остаются на нашей инфраструктуре.");
   if(result.job)setJobs(old=>[result.job,...old]);
  }catch(e){setError(e instanceof Error?e.message:"Render failed");}
  finally{setBusy(false);}
 }
 const active=jobs.some(j=>j.state==="queued"||j.state==="running");
 return <main className={styles.page}><div className={styles.wrap}>
  <header><a href="/motion">← MOTION STUDIO</a><span>FIRST-PARTY RENDER SYSTEM</span></header>
  <div className={styles.chip}>MARGARYAN MOTION STUDIO / OWN INFRASTRUCTURE</div>
  <h1>YOUR FILM.<br/><em>OUR ENGINE.</em></h1>
  <p className={styles.lead}>Рендер на собственном Railway-воркере: настоящее создание кадров через наш Canvas/Chromium, оригинальная музыка Motion и сборка MP4 в FFmpeg. Без сторонних видеогенераторов.</p>
  <div className={styles.grid}>
   <section className={styles.card}>
    <div className={styles.overline}>01 / NOW IN PRODUCTION</div>
    <h2>PROMPTENCE<br/>CINEMA CUT</h2>
    <p>36,5 секунды · вертикальное видео · 1080×1920 · оригинальная музыка · H.264 / AAC</p>
    <div className={styles.features}><span>✓ OUR CHROMIUM</span><span>✓ OUR FFmpeg</span><span>✓ OUR SCRIPT</span><span>✓ PRIVATE STORAGE</span></div>
    <button type="button" onClick={()=>void render()} disabled={busy||active||ready!==true}>
     {busy?"ПОДГОТАВЛИВАЕМ…":active?"РЕНДЕР ВЫПОЛНЯЕТСЯ…":ready?"СОЗДАТЬ MP4 НА НАШЕМ СЕРВЕРЕ ↗":"RENDER ENGINE OFFLINE"}
    </button>
    <small>Защита расходов: один одновременный рендер и максимум три запроса за 24 часа. Создание видео потребляет вычислительные ресурсы Railway.</small>
   </section>
   <section className={styles.status}>
    <div className={styles.overline}>02 / PRODUCTION QUEUE</div>
    <h2>{active?"FILM IN PROGRESS":jobs.length?"PRODUCTION HISTORY":"AWAITING FIRST FILM"}</h2>
    <p>Выполненные видео хранятся на защищённом томе Railway. Скачивание доступно только через авторизованный Distribution.</p>
    {error&&<p role="alert" className={styles.error}>{error}</p>}
    {notice&&<p role="status" className={styles.success}>{notice}</p>}
    <div className={styles.list}>{jobs.map(job=><article key={job.id}>
     <div><b>{job.state.toUpperCase()}</b><small>{new Date(job.createdAt).toLocaleString("ru-RU")}</small></div>
     {job.state==="complete"&&job.download?<a href={job.download} download>↓ DOWNLOAD MP4</a>:
      <span>{job.state==="failed"?job.errorCode||"Render failed":job.state==="running"?"Rendering real frames…":"Queued for render…"}</span>}
    </article>)}</div>
   </section>
  </div>
  <footer><p>Результат — проверочный монтаж, не одобренная рекламная кампания. Пока этот облачный профиль использует музыку Motion без автоматически сгенерированной профессиональной дикторской озвучки; реальные записи браузера, собственные исходники и улучшение звука добавляются отдельно после проверки доступа и лицензий.</p>
   <a href="/motion/mcp">CHATGPT · MCP CONNECTION ↗</a></footer>
 </div></main>;
}
