import type {Metadata} from "next";
import CopyMcpEndpoint from "./copy-endpoint";
import styles from "./mcp.module.css";
export const metadata:Metadata={title:"Motion Studio MCP | Margaryan Labs",
 description:"Connect the first-party Motion Studio creative director via MCP Streamable HTTP."};
const actions=[
 ["01","PLAN","Create a real Motion Studio storyboard from ChatGPT."],
 ["02","INSPECT","Review scene pacing, voice estimates and original-media requirements."],
 ["03","PATCH","Preview shot edits without overwriting an active film."],
 ["04","PRODUCE","Attach original sources and render in the authorized Motion Studio worker/editor."]
];
const MCP_ENDPOINT="https://distribution-web-production.up.railway.app/api/motion/mcp";
const OWNER_ENDPOINT="https://distribution-web-production.up.railway.app/api/motion/mcp/owner";
export default function MotionMcpInfo(){
 return <main className={styles.page}>
  <div className={styles.shell}>
   <header className={styles.nav}><a href="/motion">← MOTION STUDIO</a><span>MARGARYAN LABS / SYSTEMS</span></header>
   <div className={styles.status}><i/> FIRST-PARTY MCP CONTROL PLANE <span>READ-ONLY BETA</span></div>
   <h1>DIRECT FROM CHAT.<br/><em>BUILT IN MOTION.</em></h1>
   <p className={styles.lead}>A genuine Model Context Protocol connection to our Motion Director. ChatGPT can create, inspect and refine an editable film plan. Real voice, music, source media and MP4 mastering remain in our owned production pipeline.</p>
   <div className={styles.connection}>
    <div><small>PUBLIC · STORYBOARD / PREVIEW ONLY</small><strong>{MCP_ENDPOINT}</strong></div>
    <CopyMcpEndpoint endpoint={MCP_ENDPOINT}/>
   </div>
   <div className={styles.connection}>
    <div><small>OWNER ONLY · OAUTH 2.1 + PKCE · PAID COMPUTE CONFIRMATION</small>
     <strong>{OWNER_ENDPOINT}</strong></div>
    <CopyMcpEndpoint endpoint={OWNER_ENDPOINT}/>
   </div>
   <p className={styles.lead}>Owner MCP offers render status, a controlled original MP4 queue and five-minute secure download links. Connecting requires your explicit operator login, consent, a supported ChatGPT web workspace and permission to use write-capable tools. Never publish this server with anonymous paid-compute actions.</p>
   <section className={styles.grid}>{actions.map(([number,title,detail])=><article key={number}>
    <b>{number}</b><h2>{title}</h2><p>{detail}</p></article>)}</section>
   <div className={styles.notice}><strong>Not automatically connected to your ChatGPT account.</strong>
    <p>On an eligible ChatGPT web account, enable Developer mode, create a custom MCP app and scan tools using the endpoint above. Your plan and workspace permissions determine availability. Five public-safe tools are exposed separately. The owner MCP requires OAuth and your approval; the private Railway worker already runs but is billed for compute. ChatGPT Plus may not have access to custom write-capable MCP apps.</p>
   </div>
   <div className={styles.bottom}><a href="/motion/render">PRIVATE CLOUD RENDER ↗</a><a href="/motion">OPEN MOTION STUDIO ↗</a>
    <span>NO AI VIDEO PROVIDER · NO API CREDITS · REAL EDITABLE STORYBOARDS</span></div>
  </div>
 </main>;
}
