import type {Metadata} from "next";
import styles from "../create/creator.module.css";
export const metadata:Metadata={title:"Motion Studio · Privacy & Creative Data",description:"How the browser Motion Studio creator, separate ChatGPT plugin and GPT Action handle editorial storyboards."};
export default function MotionPrivacy(){
 return <main className={styles.policy}><a className={styles.policyBack} href="/motion/create">← MARGARYAN MOTION</a>
  <div className={styles.policyBox}>
   <p className={styles.eyebrow}>DATA & CREATIVE RIGHTS / OCTOBER 2026</p>
   <h1>Privacy by<br/><em>design.</em></h1>
   <p>Margaryan Motion Studio provides an optional public, keyless film-storyboard generator. This notice covers the public creator, the separate skill-only ChatGPT plugin, and the optional legacy GPT Action.</p>
   <h2>What is sent</h2>
   <p>When you press “Create storyboard” in our public website, or separately enable and call the legacy GPT Action, your brief, selected brand, format, language and style are sent over HTTPS to our server to generate an editable JSON project. The skill-only ChatGPT plugin does not itself call our Motion Engine or transmit your prompt to our server; it can suggest a brief and link you to the website. Do not submit secrets, account credentials, client records, proprietary screenshots or personal information.</p>
   <h2>What is stored</h2>
   <p>Public storyboard generation is stateless: it does not create a cloud account or persist a film, and does not call OpenAI API or video-generation vendors. Hosting providers may process standard request logs and infrastructure metadata. Your optional draft is stored in your own browser’s local storage so you can reopen it; clear browser site data to remove it.</p>
   <h2>What happens with ChatGPT</h2>
   <p>When you independently install and authorize the legacy GPT Action, ChatGPT can transmit the request to our Motion endpoint. Our current portable skill-only plugin does not connect to this endpoint itself. ChatGPT’s own account, conversation, tool and data policies apply separately. Our publicly shared creator does not provide access to the private Railway rendering server or Distribution CRM.</p>
   <h2>Source rights & commercial releases</h2>
   <p>The director produces an editorial plan, not an approved commercial film or verified product results. You remain responsible for the rights to uploaded video, music and narration and for verifying claims before publishing.</p>
   <h2>Contact and updates</h2>
   <p>For requests about this Motion Studio data flow, see <a href="/motion/support">technical support</a> or <a href="/motion/commission">commercial Motion Studio</a>; the latter may offer local-only briefs and not accept online messages. Read the <a href="/motion/terms">draft terms of use</a> (subject to owner approval). We may update this notice when public rendering and user accounts become available.</p>
   <a className={styles.policyCta} href="/motion/create">CREATE A FILM ↗</a>
  </div>
 </main>;
}
