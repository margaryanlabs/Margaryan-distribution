import Link from "next/link";

export const metadata={title:"Privacy Notice — Margaryan Content Studio",description:"Privacy details for the browser-first Content Studio beta."};
export default function Privacy(){
 const sections=[
 ["What the beta does","Margaryan Content Studio helps you author procedural motion-graphics storyboards through ChatGPT and preview/export video in your browser. The public tools currently have no customer sign-in, database-backed accounts, subscriptions or cloud project library."],
 ["Data sent through ChatGPT","When a ChatGPT plugin calls our public MCP server, the supplied storyboard text, scene descriptions and optional client brand display name, tagline and color are transmitted to our hosted service for validation and a response. ChatGPT separately processes your prompts under its own terms and privacy notices. Do not include secrets, passwords or confidential customer information in storyboard requests."],
 ["Film projects and media","The Local Film Vault saves up to 18 named project snapshots in your browser's local storage, not in a Margaryan cloud account. The editor's approved local media systems may retain files in browser device storage. Local logo, narration and music files used in the embedded preview are kept browser-local during editing. Local browser storage may be lost if you clear site data, use private browsing, change devices or reinstall a browser. Manually export and back up important projects."],
 ["Video export and ChatGPT library","Video recording and download are performed on your device when supported. If you explicitly select SAVE TO CHATGPT after exporting and the ChatGPT host exposes the file upload feature, your chosen video is sent to ChatGPT/OpenAI under the host's policies. This is optional and not a Margaryan hosted storage feature. The local copy remains on your device."],
 ["Infrastructure and logs","The public site and MCP endpoint are hosted on Vercel. Standard network, security, operational and abuse-prevention metadata may be processed and retained by the hosting platform, such as IP addresses, request times, HTTP status and user agents. We do not offer a guarantee that the underlying network stack stores no logs. The current beta has no first-party advertising tracker or customer-profile analytics configured within the Content Studio codebase."],
 ["How to remove local material","You may delete a named saved film from Local Film Vault, clear site storage through your browser settings or remove chosen local media. Clearing storage is irreversible unless you have another backup. Uploaded files in ChatGPT must be managed from ChatGPT's own file controls."],
 ["Current status","This is an evolving technical beta and not a finalized, legally reviewed policy for a publicly marketed subscription. Production account features, billing, support details and retention commitments must be separately documented before paid launch."]
 ];
 return <main style={{background:"#090c11",color:"#ecf2f9",minHeight:"100vh",padding:"50px 22px",fontFamily:"system-ui,sans-serif"}}>
 <article style={{maxWidth:760,margin:"auto"}}><Link href="/" style={{color:"#9db2cd",fontSize:12,textDecoration:"none"}}>← MARGARYAN CONTENT STUDIO</Link>
 <p style={{color:"#8ca5c3",fontSize:11,letterSpacing:".14em",marginTop:48}}>TRANSPARENCY / PUBLIC BETA</p>
 <h1 style={{fontSize:"clamp(40px,7vw,70px)",lineHeight:1.07,letterSpacing:"-.055em",margin:"16px 0 8px"}}>Privacy Notice.</h1>
 <p style={{color:"#9baec5",fontSize:13}}>Effective October 11, 2026 · Keyless browser-first preview</p>
 <p style={{fontSize:16,color:"#b8c5d4",lineHeight:1.8}}>Your creative direction is not a reason to require a new API token or centralize all of your source footage. Here is how this current beta actually handles data.</p>
 {sections.map(([heading,body])=><section key={heading} style={{padding:"23px 0",borderTop:"1px solid #2f3b49"}}>
 <h2 style={{fontSize:18,margin:"0 0 10px"}}>{heading}</h2><p style={{fontSize:14,color:"#aab9cb",lineHeight:1.75,margin:0}}>{body}</p></section>)}
 <p style={{color:"#8197b1",fontSize:12,marginTop:35}}>Margaryan Content Studio is an independent project and is not an OpenAI product or official endorsement.</p>
 <Link href="/terms" style={{display:"inline-block",marginTop:15,color:"#bed1e9"}}>Read Beta Terms ↗</Link></article></main>;
}
