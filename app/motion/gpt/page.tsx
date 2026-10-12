import type {Metadata} from "next";
import GptSetup from "./setup";
import styles from "../create/creator.module.css";
export const metadata:Metadata={title:"Connect GPT · Margaryan Motion Studio",description:"Configure a custom GPT Action to generate editable films with our keyless first-party Motion Director."};
export default function MotionGptPage(){
 return <main className={styles.gptPage}>
  <div className={styles.gptShell}>
   <header className={styles.gptNav}><a href="/motion/create">← MOTION STUDIO</a><span>CONNECT / CHATGPT</span></header>
   <p className={styles.eyebrow}><span className={styles.liveDot}/> FIRST-PARTY DIRECTOR · OPENAPI ACTION</p>
   <h1>YOUR GPT.<br/><em>OUR MOTION ENGINE.</em></h1>
   <p className={styles.gptIntro}>Создай свой GPT «Margaryan Motion Director» и подключи его к настоящему движку сценариев. GPT поможет описать фильм, а Motion Studio превратит описание в редактируемые сцены. Без OpenAI API в нашей системе.</p>
   <div className={styles.gptSplit}>
    <div className={styles.gptVisual}><div className={styles.gptVGlow}/>
     <div className={styles.gptVTop}><span>GPT / DIRECTOR</span><i>CONNECTED AFTER SETUP</i></div>
     <div className={styles.gptUser}>Хочу кинематографичный ролик о Promptence, 30 секунд, вертикальный…</div>
     <div className={styles.gptConnector}><span>CHATGPT</span><div className={styles.gptConnectionLine}/><span>MOTION ENGINE</span></div>
     <div className={styles.gptAssistant}><b>SCENE 01 / OPENING</b><strong>MAKE THE<br/>SIGNAL VISIBLE.</strong><small>Storyboard ready · 8 editable scenes · native JSON</small></div>
     <div className={styles.gptBottom}>PLAN → PREVIEW → APPROVED SOURCE → RENDER</div>
    </div>
    <GptSetup/>
   </div>
   <footer className={styles.gptFoot}><p>Это интеграция через **GPT Actions**, а не через OpenAI API. GPT придётся создать/настроить в твоём аккаунте ChatGPT. Без настройки кнопка «ChatGPT» не означает автоматическую генерацию ответа нейросети на нашем сайте.</p><a href="/motion/privacy">PRIVACY ↗</a></footer>
  </div>
 </main>;
}
