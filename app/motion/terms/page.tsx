import type {Metadata} from "next";
import styles from "../create/creator.module.css";

export const metadata:Metadata={
  title:"MARGARYAN MOTION STUDIO · Terms of Use",
  description:"Scope, limitations and creative responsibility for the public Margaryan Motion Studio creator and ChatGPT plugin."
};

export default function MotionTerms(){
 return <main className={styles.policy}>
  <a className={styles.policyBack} href="/motion/create">← MARGARYAN MOTION</a>
  <div className={styles.policyBox}>
   <p className={styles.eyebrow}>TERMS OF USE / DRAFT FOR OWNER LEGAL APPROVAL</p>
   <h1>Your idea.<br/><em>Your responsibility.</em></h1>
   <p>These proposed terms explain the current public creative planning and film-storyboard experience provided by Margaryan Labs through MARGARYAN MOTION STUDIO. They require owner approval before public release.</p>
   <h2>1. What the public service provides</h2>
   <p>The public creator generates editable film storyboards and native animation previews. The ChatGPT plugin provides creative assistance and may hand off to the browser studio. Neither service promises ready-to-publish video, MP4 export, professional voiceover, licensed music, or completion of a commercial production order.</p>
   <h2>2. Your content and permissions</h2>
   <p>Submit only content you are authorized to use. You remain responsible for verifying your marketing claims, obtaining permissions for any likeness, trademarks, footage, fonts, music or voice recordings, and checking the finished creative work before distribution.</p>
   <h2>3. Availability and accuracy</h2>
   <p>Public scene generation and browser preview may change or be interrupted. AI-assisted concepts and generated project details may contain errors or mismatches. Review each scene and its meaning before relying on it.</p>
   <h2>4. Private production and payments</h2>
   <p>Submitting a brief or generating a preview does not book paid production, authorize use of private Railway rendering resources or establish a production agreement. Commercial scope, payments, deadlines and delivery rights require separate written confirmation.</p>
   <h2>5. Privacy and prohibited content</h2>
   <p>Do not submit passwords, API keys, sensitive personal information or confidential customer information to public storyboard generation. For how public requests and browser drafts are handled, see the <a href="/motion/privacy">privacy notice</a>. ChatGPT is a separate platform with its own terms.</p>
   <h2>6. Support and feedback</h2>
   <p>See <a href="/motion/support">Motion Studio Support</a> for technical issues and help. The public issue tracker must not be used to disclose private information.</p>
   <a className={styles.policyCta} href="/motion/create">CREATE A FILM ↗</a>
  </div>
 </main>;
}
