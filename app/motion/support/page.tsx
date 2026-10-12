import type {Metadata} from "next";
import styles from "../create/creator.module.css";

export const metadata:Metadata={
  title:"MARGARYAN MOTION STUDIO · Support",
  description:"Technical support and help for the Margaryan Motion Studio public film creator and ChatGPT plugin."
};

export default function MotionSupport(){
 return <main className={styles.policy}>
  <a className={styles.policyBack} href="/motion/create">← MARGARYAN MOTION</a>
  <div className={styles.policyBox}>
   <p className={styles.eyebrow}>SUPPORT / MARGARYAN LABS</p>
   <h1>We are here for<br/><em>the next frame.</em></h1>
   <p>Help for MARGARYAN MOTION STUDIO, our browser-based public film creator and the separate ChatGPT plugin.</p>
   <h2>How do I make a film?</h2>
   <p>Open <a href="/motion/create">Create a film</a>, describe the product, select a visual direction, then generate and preview the native animated project. Save the editable project JSON to your device. This is not an exported MP4.</p>
   <h2>Why does the ChatGPT plugin not render an MP4?</h2>
   <p>The portable plugin acts as a creative director. Public video rendering is not offered through this plugin. The private rendering worker is restricted to authorized studio operators. You can still create and preview the original Motion project in your browser.</p>
   <h2>Where do I report a technical problem?</h2>
   <p>Use our <a href="https://github.com/margaryanlabs/Margaryan-distribution/issues/new">public technical support tracker ↗</a> (a GitHub account is required to create a report). Include the affected page, your browser/device and reproduction steps. <strong>Do not include personal information, passwords, tokens, customer briefs or private projects.</strong> Public issues are visible to everyone.</p>
   <h2>Commercial films and production requests</h2>
   <p>See <a href="/motion/commission">Commercial Motion Studio</a> for the production brief and availability status. If the page shows “Local brief mode”, online submissions are not enabled and saving a brief does not send it to us.</p>
   <h2>Privacy, rights and terms</h2>
   <p>Read our <a href="/motion/privacy">privacy notice</a> and <a href="/motion/terms">terms of use</a>. If your issue contains private content, do not post it on the public tracker.</p>
   <a className={styles.policyCta} href="/motion/create">OPEN MOTION STUDIO ↗</a>
  </div>
 </main>;
}
