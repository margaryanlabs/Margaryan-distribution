"use client";
import {useState,type CSSProperties} from "react";
import {BRAND_INFO,type MotionBrand,type MotionFormat} from "@/lib/motion/studio";
import {PORTFOLIO_BRANDS} from "@/lib/motion/portfolio";
import {
 STUDIO_FILM_CHOICES,studioFilmInstruction,type StudioFilmChoice,type StudioFilmKind
} from "@/lib/motion/start-film";
import styles from "./start-film.module.css";

type Props={
 initialBrand:MotionBrand;
 currentTitle:string;
 hasSavedDraft:boolean;
 busy:boolean;
 onStart:(choice:StudioFilmChoice)=>void;
 onResume:()=>void;
 onSaveCurrent:()=>void;
};
const FORMATS=[
 {id:"portrait",name:"9:16",sub:"Reels / TikTok"},
 {id:"landscape",name:"16:9",sub:"YouTube / сайт"},
 {id:"square",name:"1:1",sub:"Лента / пост"}
] as const;
const LENGTH_NOTE:Record<StudioFilmKind,string>={
 reel:"Быстрый монтаж из ваших настоящих клипов. После выбора загружаете исходники.",
 campaign:"Создадим оригинальный графический сценарий. Для реальных кадров добавьте свои исходники.",
 product:"В редакторе появится место для настоящего экрана. Без видео продукта финальная проверка не пройдёт.",
 feature:"Фильм собирается из отдельных глав. Сначала открывается рабочая область глав.",
 proof:"Отдельный пилот на реальных кадрах Promptence, а не генерация вымышленных экранов.",
 interaction:"Реальный курсор, клики, прокрутка и ввод — без фиктивных результатов. Видео записывает оператор на своём компьютере; этот мастер открывает монтаж исходника."
};
export default function MotionStart({
 initialBrand,currentTitle,hasSavedDraft,busy,onStart,onResume,onSaveCurrent
}:Props){
 const [kind,setKind]=useState<StudioFilmKind>("campaign");
 const [brand,setBrand]=useState<MotionBrand>(initialBrand);
 const [format,setFormat]=useState<MotionFormat>("portrait");
 const [language,setLanguage]=useState<"ru"|"en"|"hy">("ru");
 const [brief,setBrief]=useState("");
 const [advanced,setAdvanced]=useState(false);
 const [error,setError]=useState("");
 const selected=STUDIO_FILM_CHOICES.find(c=>c.kind===kind)!;
 function pick(next:StudioFilmKind){
   setKind(next);setError("");
   if(next==="reel"||next==="campaign"||next==="interaction")setFormat("portrait");
   if(next==="product"||next==="feature"||next==="proof")setFormat("landscape");
   if(next==="proof"||next==="interaction")setBrand("promptence");
 }
 function start(){
   try{
     onStart({kind,brand:kind==="proof"||kind==="interaction"?"promptence":brand,format,language,brief});
   }catch(e){setError(e instanceof Error?e.message:"Не удалось начать проект.");}
 }
 return <main className={styles.page} aria-label="Выберите, какой ролик создать">
   <header className={styles.nav}>
     <div className={styles.wordmark}>
       <span className={styles.symbol}>M<span>.</span></span>
       <div><strong>MARGARYAN <em>MOTION</em></strong><small>STUDIO / CREATE VIDEO</small></div>
     </div>
     <div className={styles.navActions}>
       <span className={styles.local}>● Локальная студия</span>
       <a href="/motion/commission">Заказать ролик ↗</a>
       <button type="button" disabled={busy} onClick={onResume}>В редактор →</button>
     </div>
   </header>
   <div className={styles.content}>
     <section className={styles.intro}>
       <div className={styles.breadcrumb}><span className={styles.line}/> ВАША СТУДИЯ / НАЧАЛО РАБОТЫ</div>
       <h1>Какой ролик<br/><em>создаём сегодня?</em></h1>
       <p>Выберите результат — мы откроем подходящие инструменты. Не нужно разбираться в движках, режимах и настройках заранее.</p>
       {hasSavedDraft&&<div className={styles.resumeActions}>
         <button type="button" className={styles.resume} disabled={busy} onClick={onResume}>
           <span>↶</span><span><strong>Продолжить текущий проект</strong><small>{currentTitle}</small></span><b>ОТКРЫТЬ ↗</b>
         </button>
         <button type="button" className={styles.backup} disabled={busy} onClick={onSaveCurrent}>
           ↓ Сохранить копию перед новым роликом
         </button>
       </div>}
     </section>
     <div className={styles.step}><span>01</span><strong>Выберите тип видео</strong><small>6 вариантов · все существующие режимы</small></div>
     <section className={styles.selectionLayout}>
       <div className={styles.catalog} role="group" aria-label="Выбор типа видеоролика">
         {STUDIO_FILM_CHOICES.map(item=><button key={item.kind} type="button"
           className={styles.card} data-kind={item.kind} data-active={kind===item.kind}
           aria-pressed={kind===item.kind} onClick={()=>pick(item.kind)}>
           <div className={styles.cardArt} aria-hidden="true">
             <div className={styles.artTop}><span>0{Number(item.id)} / MOTION FILM</span><i/></div>
             <div className={styles.artMain}>
               {item.kind==="reel"&&<><div className={styles.phoneCard}><span>YOUR</span><b>STORY.</b><i/></div><div className={styles.artGlint}/></>}
               {item.kind==="campaign"&&<><div className={styles.cineWord}>MAKE<br/><i>IT</i> MOVE.</div><span className={styles.artOrb}/></>}
               {item.kind==="product"&&<><div className={styles.productWindow}><span>◉&nbsp; YOUR REAL SCREEN</span><div className={styles.productBar}/><div className={styles.productRow}/><div className={styles.productRow}/><div className={styles.productHighlight}/></div><span className={styles.productGlare}/></>}
               {item.kind==="feature"&&<><div className={styles.featureText}>ONE<br/>BIG<br/><i>STORY.</i></div><span className={styles.featureRing}/></>}
               {item.kind==="proof"&&<><div className={styles.proofBox}><span>REAL SOURCE</span><strong>NO<br/>GUESSWORK.</strong><i>✓ SOURCE CHECK</i></div></>}
               {item.kind==="interaction"&&<div className={styles.interactionArt}><div className={styles.interactionBrowser}>
                 <div className={styles.interactionBrowserBar}><i/><i/><i/><span>promptence.tech</span></div>
                 <div className={styles.interactionUI}><div className={styles.interactionInput}/><div className={styles.interactionInput}/>
                   <div className={styles.interactionClick}>RUN FREE CHECK <b>↗</b></div></div>
               </div><span className={styles.interactionCursor}>↖</span><span className={styles.interactionRing}/></div>}
             </div>
             <div className={styles.artBottom}><span>{item.badge}</span><span>↗</span></div>
           </div>
           <div className={styles.cardInfo}>
             <div className={styles.cardHeading}><span>{item.category} / {item.length}</span><span className={styles.check}>{kind===item.kind?"● ВЫБРАНО":"○"}</span></div>
             <h2>{item.title}</h2>
             <p>{item.desc}</p>
             <div className={styles.cardFoot}><span>{item.source}</span><strong>{item.format}</strong></div>
           </div>
         </button>)}
       </div>
       <aside className={styles.setup} aria-label="Настроить будущий фильм">
         <div className={styles.setupHead}>
           <span><i/> 02 / СОБЕРЁМ ВАШ РОЛИК</span>
           <h2>{selected.outcome}<b>.</b></h2>
           <p>{LENGTH_NOTE[kind]}</p>
         </div>
         <div className={styles.inputs}>
           <label>ДЛЯ КАКОГО БРЕНДА?
             <select value={kind==="proof"||kind==="interaction"?"promptence":brand} disabled={kind==="proof"||kind==="interaction"}
               onChange={e=>setBrand(e.target.value as MotionBrand)}>
               {PORTFOLIO_BRANDS.map(item=><option key={item} value={item}>{BRAND_INFO[item].name}</option>)}
             </select>
           </label>
           <label>ГДЕ ПОКАЖЕМ?
             <div className={styles.formatPicker} role="group" aria-label="Формат кадра">
               {FORMATS.map(f=><button key={f.id} type="button"
                 className={styles.formatOption} data-active={format===f.id}
                 aria-pressed={format===f.id} onClick={()=>setFormat(f.id)}>
                 <span className={styles.frame} data-shape={f.id}/>
                 <strong>{f.name}</strong><small>{f.sub}</small>
               </button>)}
             </div>
           </label>
           <label>ЯЗЫК РОЛИКА
             <div className={styles.languages} role="group" aria-label="Язык текста">
               {([["ru","Русский"],["en","English"],["hy","Հայերեն"]] as const)
                 .map(([id,name])=><button key={id} type="button"
                   aria-pressed={language===id} data-active={language===id}
                   onClick={()=>setLanguage(id)}>{name}</button>)}
             </div>
           </label>
           <details className={styles.idea} open={advanced} onToggle={e=>setAdvanced(e.currentTarget.open)}>
             <summary>✦ Есть конкретная идея для ролика? <span>{advanced?"−":"+"}</span></summary>
             <label>КРАТКО ОПИШИТЕ ЗАДАЧУ
               <textarea rows={4} maxLength={650} value={brief}
                 placeholder="Например: 35 секунд, проблема → продукт → реальные экраны → сильный финал. Никаких неподтверждённых цифр."
                 onChange={e=>setBrief(e.target.value)}/>
               <small>Необязательно. В графическом режиме сценарий создаётся локально. Настоящие кадры нужно загрузить самостоятельно.</small>
             </label>
           </details>
         </div>
         <div className={styles.nextStep}>
           <span>ЧТО БУДЕТ ПОСЛЕ НАЖАТИЯ?</span>
           <p>{studioFilmInstruction(kind)}</p>
         </div>
         {error&&<p className={styles.error} role="alert">{error}</p>}
         {kind==="proof"
           ?<a href="/motion/proof" className={styles.go}>Открыть Proof Director <span>↗</span></a>
           :<button type="button" className={styles.go} disabled={busy} onClick={start}>
              {kind==="reel"?"Перейти к монтажу Reels":kind==="feature"?"Создать большой фильм":kind==="interaction"?"Создать кликающее демо":
                kind==="product"?"Создать демо продукта":"Создать рекламный ролик"} <span>↗</span>
            </button>}
         {kind==="interaction"&&<p className={styles.setupFine}>Только Promptence (первый пилот). Автоматическая запись браузера выполняется локально через Playwright и FFmpeg; сайт не запускает скрытый серверный рендер и не выполняет настоящий Free Scan.</p>}
         <div className={styles.honesty}><span>✓ Без API-ключей</span><span>✓ Редактируемый проект</span></div>
         <p className={styles.setupFine}>Превью выше — художественные макеты стиля, не готовые видео и не реальные результаты AI. Готовый ролик требует исходных материалов, проверки и экспорта.</p>
       </aside>
     </section>
     <section className={styles.journey}>
       <span>ОТ ИДЕИ К ВИДЕО / ПРОСТОЙ ПРОЦЕСС</span>
       <div><article><b>01</b><strong>Выбери результат</strong><p>Сразу понятно, что создаём и для какой площадки.</p></article>
         <article><b>02</b><strong>Собери фильм</strong><p>Добавь реальные кадры, отредактируй текст, переходы и голос.</p></article>
         <article><b>03</b><strong>Посмотри и экспортируй</strong><p>Проверь готовность, посмотри финал и сохрани видео.</p></article></div>
     </section>
   </div>
 </main>;
}
