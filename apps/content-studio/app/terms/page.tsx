import Link from "next/link";
export const metadata={title:"Beta Terms — Margaryan Content Studio",description:"Usage boundaries and technical limitations for the free Content Studio beta."};
export default function Terms(){
 const entries=[
 ["Preview product","Content Studio is a free, experimental beta for generating editable motion-graphics plans and optionally exporting them using a local browser. There is no paid membership, guaranteed availability, customer account system or contractual service level at this stage."],
 ["Your source files and rights","Only use customer names, logos, music, narration, footage and images that you own or have permission to use. You are responsible for ensuring the final composition and its marketing claims are truthful, legal, non-infringing and properly licensed."],
 ["What the engine actually creates","ChatGPT can author script, copy, scenes and timing when a compatible plugin is available. Our Motion Engine draws procedural graphics and may package real, user-supplied footage. An MCP tool call alone does not create a photorealistic AI-generated video, spoken voice, server-rendered MP4, music license or guarantee a successful export."],
 ["Technical and browser limits","Browser recording depends on codec availability, performance, memory, secure context, tab visibility and application sandbox permissions. 720p/1080p, sound mixes and longer workprints require end-to-end validation for your own devices. The independent long-form planner returns multi-chapter film drafts for operator review before media export."],
 ["Backups and privacy","Named projects in Local Film Vault and imported media reside in local browser storage and are not a cross-device backup. Save original files, exported manifests and final movies yourself. Use the Privacy Notice to understand data flow, logging and optional ChatGPT file-library storage."],
 ["Commercial use and affiliation","Beta access does not grant rights to another party's intellectual property or permission to represent that party. No payment checkout or subscription entitlement is active. Content Studio is independently developed and is not represented as endorsed or owned by OpenAI."],
 ["Later changes","Functionality and these beta notes may change before a production launch. Formal subscription terms, support contact, billing disputes and data-retention agreements must be published before commercial checkout is enabled."]
 ];
 return <main style={{background:"#090c11",color:"#ecf2f9",minHeight:"100vh",padding:"50px 22px",fontFamily:"system-ui,sans-serif"}}>
 <article style={{maxWidth:760,margin:"auto"}}><Link href="/" style={{color:"#9db2cd",fontSize:12,textDecoration:"none"}}>← MARGARYAN CONTENT STUDIO</Link>
 <p style={{color:"#8ca5c3",fontSize:11,letterSpacing:".14em",marginTop:48}}>PRODUCT BOUNDARIES / PUBLIC BETA</p>
 <h1 style={{fontSize:"clamp(40px,7vw,70px)",lineHeight:1.07,letterSpacing:"-.055em",margin:"16px 0 8px"}}>Beta Terms.</h1>
 <p style={{color:"#9baec5",fontSize:13}}>Effective October 11, 2026 · Not final commercial terms</p>
 {entries.map(([title,desc])=><section key={title} style={{padding:"23px 0",borderTop:"1px solid #2f3b49"}}>
 <h2 style={{fontSize:18,margin:"0 0 10px"}}>{title}</h2><p style={{fontSize:14,color:"#aab9cb",lineHeight:1.75,margin:0}}>{desc}</p></section>)}
 <Link href="/privacy" style={{display:"inline-block",marginTop:18,color:"#bed1e9"}}>Read Privacy Notice ↗</Link>
 </article></main>;
}
