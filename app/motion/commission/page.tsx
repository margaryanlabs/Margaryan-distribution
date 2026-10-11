"use client";
import {useEffect,useRef,useState,type FormEvent} from "react";
import {MOTION_BUDGETS,MOTION_GOALS,MOTION_OFFERS,motionCommissionText,
 parseMotionCommission,type FilmOffer,type MotionCommission} from "@/lib/motion/commission";
import styles from "./commission.module.css";

type Availability={accepting:boolean;siteKey:string|null;mode:string};
type TurnstileWidget={
 render:(node:HTMLElement,opts:{sitekey:string;action:string;
   callback:(token:string)=>void;"expired-callback":()=>void;
   "error-callback":()=>void;theme:string})=>string;
 remove:(id:string)=>void;
};
declare global{interface Window{turnstile?:TurnstileWidget}}
const empty:MotionCommission={
 name:"",email:"",company:"",website:"",offer:"product",format:"portrait",
 goal:"Explain a software product",audience:"",budget:"Not sure yet",
 timeline:"",brief:"",assets:"",consent:false
};
const ru={
 eyebrow:"MARGARYAN LABS / MOTION STUDIO",
 h1:"Фильм о продукте, который хочется досмотреть.",
 lede:"От идеи до финального кадра: сценарий, реальный интерфейс, монтаж и звук. Без выдуманных кейсов и обещаний продаж.",
 build:"СОБРАТЬ БРИФ",studio:"ОТКРЫТЬ СТУДИЮ",
 work:"Наш процесс",request:"Расскажите о проекте",
 about:"Расскажите, что зритель должен понять, почувствовать или сделать после просмотра.",
 cta:"ОТПРАВИТЬ ЗАЯВКУ",copy:"КОПИРОВАТЬ БРИФ",save:"СОХРАНИТЬ БРИФ",
 offline:"Онлайн-приём заявок пока не подключён. Сохраните бриф и передайте его нам согласованным способом.",
 active:"Заявки принимаются через защищённую форму. Оплата и сроки подтверждаются отдельно.",
};
const en={
 eyebrow:"MARGARYAN LABS / MOTION STUDIO",
 h1:"A product film worth watching.",
 lede:"From first idea to final frame: story, authentic product footage, editing and sound. No invented results or performance promises.",
 build:"BUILD A BRIEF",studio:"OPEN THE STUDIO",work:"The process",request:"Tell us about your film",
 about:"Tell us what your audience should understand, feel or do after watching.",
 cta:"SEND FILM ENQUIRY",copy:"COPY FILM BRIEF",save:"SAVE FILM BRIEF",
 offline:"Online enquiries are not connected yet. Save your brief and share it with the studio through an agreed channel.",
 active:"Secure enquiries are available. Pricing and delivery require a separate written agreement."
};
export default function CommissionPage(){
 const [language,setLanguage]=useState<"ru"|"en">("ru");
 const t=language==="ru"?ru:en;
 const [form,setForm]=useState<MotionCommission>(empty);
 const [availability,setAvailability]=useState<Availability|null>(null);
 const [captcha,setCaptcha]=useState("");
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const formRef=useRef<HTMLDivElement>(null);
 const captchaMount=useRef<HTMLDivElement>(null);
 const widgetId=useRef<string|null>(null);
 const edit=<K extends keyof MotionCommission>(name:K,value:MotionCommission[K])=>
   setForm(old=>({...old,[name]:value}));
 useEffect(()=>{
   let active=true;
   void fetch("/api/motion/commission",{cache:"no-store"}).then(async r=>{
     if(!r.ok)throw Error("Availability could not be loaded");
     return r.json() as Promise<Availability>;
   }).then(data=>{if(active)setAvailability(data);}).catch(()=>{
     if(active)setAvailability({accepting:false,siteKey:null,mode:"local-brief-only"});
   });
   return()=>{active=false;};
 },[]);
 useEffect(()=>{
   if(!availability?.accepting||!availability.siteKey||!captchaMount.current)return;
   const mount=captchaMount.current;
   let mounted=true;
   const start=()=>{
     if(!mounted||!window.turnstile||!mount.isConnected||widgetId.current)return;
     widgetId.current=window.turnstile.render(mount,{
       sitekey:availability.siteKey!,action:"motion_inquiry",theme:"dark",
       callback:token=>setCaptcha(token),
       "expired-callback":()=>setCaptcha(""),
       "error-callback":()=>setCaptcha("")
     });
   };
   let script=document.querySelector<HTMLScriptElement>('script[data-motion-turnstile="1"]');
   if(!script){
     script=document.createElement("script");
     script.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
     script.async=true;script.defer=true;script.dataset.motionTurnstile="1";
     document.head.appendChild(script);
   }
   script.addEventListener("load",start);start();
   return()=>{mounted=false;script?.removeEventListener("load",start);
     if(widgetId.current&&window.turnstile)window.turnstile.remove(widgetId.current);
     widgetId.current=null;setCaptcha("");
   };
 },[availability?.accepting,availability?.siteKey]);
 function checked(requireConsent=true):MotionCommission{
   return parseMotionCommission(form,requireConsent);
 }
 function download(){
   try{
     const text=motionCommissionText(checked(false));
     const blob=new Blob([text+"\n"],{type:"text/plain;charset=utf-8"});
     const url=URL.createObjectURL(blob),a=document.createElement("a");
     a.href=url;a.download="motion-studio-film-brief.txt";
     document.body.appendChild(a);a.click();a.remove();
     window.setTimeout(()=>URL.revokeObjectURL(url),30_000);
     setMessage(language==="ru"?"Бриф сохранён на вашем устройстве. Это не отправка заявки.":"Brief saved locally. No enquiry was sent.");
   }catch(e){setMessage(e instanceof Error?e.message:String(e));}
 }
 async function copy(){
   try{await navigator.clipboard.writeText(motionCommissionText(checked(false)));
     setMessage(language==="ru"?"Бриф скопирован. Заявка не отправлена.":"Brief copied. No enquiry was sent.");
   }catch(e){setMessage(e instanceof Error?e.message:String(e));}
 }
 async function send(event:FormEvent<HTMLFormElement>){
   event.preventDefault();if(busy||!availability?.accepting)return;
   setBusy(true);setMessage("");
   try{
     const input=checked();
     if(!captcha)throw Error(language==="ru"?"Подтвердите проверку от спама.":"Complete the anti-spam verification.");
     const response=await fetch("/api/motion/commission",{
       method:"POST",headers:{"Content-Type":"application/json"},
       body:JSON.stringify({...input,captcha,companyFax:""})
     });
     const result=await response.json() as {accepted?:boolean;delivery?:string;error?:string};
     if(!response.ok||!result.accepted)throw Error(result.error||"Delivery was not accepted");
     setMessage(language==="ru"
       ?"Заявка принята почтовым сервисом. Это ещё не подтверждённый заказ; ответ и условия согласуем отдельно."
       :"Enquiry accepted by the mail provider. Your project is not booked until scope and terms are agreed.");
     setCaptcha("");setForm(empty);
   }catch(error){setMessage(error instanceof Error?error.message:String(error));}
   finally{setBusy(false);}
 }
 return <main className={styles.page}>
   <header className={styles.nav}>
     <a href="/motion?mode=cinematic" className={styles.logo} aria-label="Open Motion Studio">
       <span className={styles.mark}>M<span>.</span></span>
       <span>MARGARYAN LABS<small>MOTION / COMMERCIAL</small></span>
     </a>
     <div className={styles.navRight}>
       <a href="#work">{t.work}</a>
       <button type="button" aria-label="Toggle English or Russian language"
         onClick={()=>setLanguage(x=>x==="ru"?"en":"ru")}>{language==="ru"?"EN":"RU"}</button>
       <a className={styles.navCta} href="#brief">{t.build} ↗</a>
     </div>
   </header>
   <section className={styles.hero}>
     <div className={styles.heroText}>
       <span className={styles.eyebrow}><i/> {t.eyebrow}</span>
       <h1>{t.h1}</h1>
       <p>{t.lede}</p>
       <div className={styles.heroActions}>
         <a href="#brief" className={styles.primary}>{t.build} <span>↗</span></a>
         <a href="/motion?mode=cinematic" className={styles.secondary}>{t.studio} →</a>
       </div>
       <div className={styles.facts}>
         <div><b>01</b><span>CONCEPT → SCRIPT</span></div>
         <div><b>02</b><span>REAL SOURCE → EDIT</span></div>
         <div><b>03</b><span>REVIEW → MASTER</span></div>
       </div>
     </div>
     <div className={styles.heroVisual} aria-label="Abstract film composition showing original source framing">
       <div className={styles.filmFrame}>
         <div className={styles.filmTop}><span>PROJECT / 001</span><span>EDITORIAL FILM  ◆</span></div>
         <div className={styles.posterGrid}><div className={styles.posterIndex}>MOTION<br/>PICTURE<br/>STUDIO<span>∞</span></div>
           <span className={styles.posterCircle}/><span className={styles.posterCurve}/></div>
         <div className={styles.filmBottom}><span>THE STORY IS THE PRODUCT.</span><span>00:24:16 / 01:00:00</span></div>
       </div>
       <div className={styles.filmTimeline}><div/><div/><div/><div/><div/></div>
       <span className={styles.visualCaption}>VISUAL DIRECTION / CONCEPT ONLY — NOT CLIENT WORK</span>
     </div>
   </section>
   <section className={styles.offers} id="work">
     <div className={styles.sectionHead}>
       <div><span>CHOOSE A FORMAT</span><h2>Different stories.<br/><em>One standard.</em></h2></div>
       <p>{language==="ru"?"Мы сначала определяем задачу и реальные исходные материалы. Длительность — не гарантия качества."
         :"Start with the problem and the original source material. Duration does not guarantee quality."}</p>
     </div>
     <div className={styles.offerGrid}>
       {MOTION_OFFERS.map(offer=><button key={offer.id} type="button"
         className={styles.offer} data-active={form.offer===offer.id}
         onClick={()=>{edit("offer",offer.id as FilmOffer);formRef.current?.scrollIntoView({behavior:"smooth",block:"start"});}}>
         <span className={styles.offerNumber}>{offer.number} / FORMAT</span>
         <h3>{offer.name}</h3><strong>{offer.length}</strong>
         <p>{offer.detail}</p><small>{offer.deliverables}</small>
         <span className={styles.offerFoot}>REQUEST AN INDIVIDUAL QUOTE <b>↗</b></span>
       </button>)}
     </div>
     <p className={styles.pricing}>{language==="ru"
       ?"Стоимость, права на материалы, количество правок и сроки согласуются индивидуально. Здесь нет фиктивных тарифов или моментального списания денег."
       :"Pricing, licensing, revisions and delivery are agreed individually. No invented package pricing or automatic charges."}</p>
   </section>
   <section className={styles.briefWrap} id="brief" ref={formRef}>
     <div className={styles.briefIntro}>
       <span className={styles.eyebrow}>THE NEXT FILM STARTS HERE</span>
       <h2>{t.request}<span>.</span></h2>
       <p>{t.about}</p>
       <div className={styles.briefGuide}><strong>HOW IT WORKS</strong>
         <p>01 / {language==="ru"?"Вы описываете задачу и исходные материалы.":"Describe the goal and the available originals."}</p>
         <p>02 / {language==="ru"?"Мы уточняем сценарий, объём и права.":"We review story, scope and media rights."}</p>
         <p>03 / {language==="ru"?"Отдельно согласовываем стоимость и сроки.":"We agree pricing and timelines in writing."}</p>
       </div>
       <div className={styles.channelStatus} data-online={availability?.accepting||false}>
         <i/><div><strong>{availability?.accepting?"ENQUIRIES ENABLED":"LOCAL BRIEF MODE"}</strong>
           <small>{availability?.accepting?t.active:t.offline}</small></div>
       </div>
     </div>
     <form className={styles.form} onSubmit={e=>void send(e)}>
       <div className={styles.formHead}><span>PROJECT INTAKE / 01</span>
         <b>CREATIVE BRIEF <i>◆</i></b></div>
       <div className={styles.two}>
         <label>{language==="ru"?"ВАШЕ ИМЯ":"YOUR NAME"} *
           <input required autoComplete="name" maxLength={80} value={form.name}
             onChange={e=>edit("name",e.target.value)} placeholder="Name"/>
         </label>
         <label>EMAIL *
           <input required type="email" autoComplete="email" maxLength={254} value={form.email}
             onChange={e=>edit("email",e.target.value)} placeholder="you@company.com"/>
         </label>
       </div>
       <div className={styles.two}>
         <label>{language==="ru"?"КОМПАНИЯ / БРЕНД":"COMPANY / BRAND"} *
           <input required maxLength={100} value={form.company}
             onChange={e=>edit("company",e.target.value)} placeholder="Company"/>
         </label>
         <label>WEBSITE / OPTIONAL
           <input inputMode="url" maxLength={250} value={form.website}
             onChange={e=>edit("website",e.target.value)} placeholder="https://"/>
         </label>
       </div>
       <div className={styles.two}>
         <label>FILM TYPE
           <select value={form.offer} onChange={e=>edit("offer",e.target.value as FilmOffer)}>
             {MOTION_OFFERS.map(o=><option key={o.id} value={o.id}>{o.name} / {o.length}</option>)}
           </select>
         </label>
         <label>CANVAS
           <select value={form.format} onChange={e=>edit("format",e.target.value as MotionCommission["format"])}>
             <option value="portrait">9:16 / Vertical</option>
             <option value="landscape">16:9 / Landscape</option>
             <option value="square">1:1 / Square</option>
           </select>
         </label>
       </div>
       <div className={styles.two}>
         <label>GOAL
           <select value={form.goal} onChange={e=>edit("goal",e.target.value)}>
             {MOTION_GOALS.map(o=><option key={o}>{o}</option>)}
           </select>
         </label>
         <label>{language==="ru"?"БЮДЖЕТ ДЛЯ ОБСУЖДЕНИЯ":"BUDGET TO DISCUSS"}
           <select value={form.budget} onChange={e=>edit("budget",e.target.value)}>
             {MOTION_BUDGETS.map(o=><option key={o}>{o}</option>)}
           </select>
         </label>
       </div>
       <div className={styles.two}>
         <label>{language==="ru"?"КОМУ ПОКАЗЫВАЕМ?":"WHO IS THE VIEWER?"} *
           <input required maxLength={180} value={form.audience}
             onChange={e=>edit("audience",e.target.value)} placeholder="Founders, customers, investors…"/>
         </label>
         <label>{language==="ru"?"ЖЕЛАЕМЫЕ СРОКИ":"IDEAL TIMING"}
           <input maxLength={80} value={form.timeline}
             onChange={e=>edit("timeline",e.target.value)} placeholder="To discuss"/>
         </label>
       </div>
       <label>{language==="ru"?"ИСТОРИЯ / ЗАДАЧА ФИЛЬМА":"YOUR STORY / FILM OBJECTIVE"} *
         <textarea required minLength={25} maxLength={1700} rows={5} value={form.brief}
           onChange={e=>edit("brief",e.target.value)}
           placeholder={language==="ru"?"Какую проблему решает продукт? Что должен увидеть зритель? Какие реальные доказательства у вас есть?":"What does the product change? What should viewers see? Which real claims can you support?"}/>
       </label>
       <label>{language==="ru"?"ЧТО УЖЕ ЕСТЬ? (ВИДЕО, ЭКРАНЫ, ЛОГО, ГОЛОС)":"EXISTING ASSETS / VIDEO, UI, LOGO, VOICE"}
         <textarea maxLength={420} rows={2} value={form.assets}
           onChange={e=>edit("assets",e.target.value)} placeholder="Real screen recordings, design assets, voice, licensed audio…"/>
       </label>
       <label className={styles.consent}><input type="checkbox" checked={form.consent}
         onChange={e=>edit("consent",e.target.checked)}/>
         <span>{language==="ru"?"Разрешаю связаться со мной по указанному email по поводу этого проекта. Я не загружаю конфиденциальные материалы в этот бриф."
           :"I agree to be contacted by email about this enquiry. I will not include confidential source files in this brief."}</span>
       </label>
       <input className={styles.honeypot} type="text" name="companyFax" autoComplete="off" tabIndex={-1} aria-hidden="true"/>
       {availability?.accepting&&<div ref={captchaMount} className={styles.captcha}/>}
       <div className={styles.formActions}>
         <button type="button" onClick={download} className={styles.save}>{t.save} ↓</button>
         <button type="button" onClick={()=>void copy()} className={styles.save}>{t.copy} ⧉</button>
         <button type="submit" className={styles.submit} disabled={busy||!availability?.accepting||!captcha}>
           {busy?"SENDING…":t.cta+" ↗"}
         </button>
       </div>
       {message&&<p className={styles.message} role="status">{message}</p>}
       <small className={styles.disclaimer}>NO AUTOMATIC PAYMENTS / NO GUARANTEED RESULTS / ALL ORIGINAL MEDIA RIGHTS REQUIRE VERIFICATION</small>
     </form>
   </section>
   <footer className={styles.footer}>
     <a href="/motion?mode=cinematic">MOTION STUDIO ↗</a>
     <span>© MARGARYAN LABS · ORIGINAL MOTION · HUMAN APPROVAL</span>
   </footer>
 </main>;
}
