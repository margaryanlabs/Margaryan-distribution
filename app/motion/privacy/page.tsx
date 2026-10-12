import type {Metadata} from "next";
import styles from "../create/creator.module.css";
export const metadata:Metadata={title:"Motion Studio · Privacy & Creative Data",description:"How the public Motion Studio creator and GPT Action handle editorial storyboards."};
export default function MotionPrivacy(){
 return <main className={styles.policy}><a className={styles.policyBack} href="/motion/create">← MARGARYAN MOTION</a>
  <div className={styles.policyBox}>
   <p className={styles.eyebrow}>DATA & CREATIVE RIGHTS / OCTOBER 2026</p>
   <h1>Privacy by<br/><em>design.</em></h1>
   <p>Margaryan Motion Studio provides an optional public, keyless film-storyboard generator. This notice covers the public creator and the separate GPT Action.</p>
   <h2>What is sent</h2>
   <p>When you press “Create storyboard” or call the GPT Action, your brief, selected brand, format, language and style are sent over HTTPS to our server to generate an editable JSON project. Do not submit secrets, account credentials, client records, proprietary screenshots or personal information.</p>
   <h2>What is stored</h2>
   <p>Public storyboard generation is stateless: it does not create a cloud account or persist a film, and does not call OpenAI API or video-generation vendors. Hosting providers may process standard request logs and infrastructure metadata. Your optional draft is stored in your own browser’s local storage so you can reopen it; clear browser site data to remove it.</p>
   <h2>What happens with ChatGPT</h2>
   <p>When you independently install our GPT Action, ChatGPT may send only the public-safe text you approve to the Motion endpoint. ChatGPT’s own account and data policies apply separately. Our publicly shared creator does not provide access to the private Railway rendering server or Distribution CRM.</p>
   <h2>Source rights & commercial releases</h2>
   <p>The director produces an editorial plan, not an approved commercial film or verified product results. You remain responsible for the rights to uploaded video, music and narration and for verifying claims before publishing.</p>
   <h2>Contact and updates</h2>
   <p>For requests about this Motion Studio data flow, use the project’s <a href="/motion/commission">studio contact form</a>. We may update this notice when public rendering and user accounts become available.</p>
   <a className={styles.policyCta} href="/motion/create">CREATE A FILM ↗</a>
  </div>
 </main>;
}
