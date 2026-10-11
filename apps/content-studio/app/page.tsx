import Link from "next/link";
const facts=[["NO SEPARATE AI API","ChatGPT plans and directs the edit. The existing Motion Engine animates scenes."],["REAL MOTION ENGINE","1080p browser export when supported. Original source media stays in the browser."],["CHATGPT NATIVE","MCP tools + live Canvas preview. Public beta, not a photoreal video generator."]];
export default function Home(){return <main style={{minHeight:"100vh",maxWidth:1040,margin:"0 auto",padding:"clamp(28px,8vw,85px) 24px"}}>
<header style={{fontSize:12,letterSpacing:".16em",color:"#91a5be",fontWeight:700}}>MARGARYAN LABS / CREATIVE ENGINE</header>
<div style={{borderTop:"1px solid #28303a",margin:"25px 0 30px"}}/>
<div style={{fontSize:12,letterSpacing:".14em",color:"#97a5b9",fontWeight:700}}>CONTENT STUDIO · CHATGPT EDITION · BETA</div>
<h1 style={{fontSize:"clamp(45px,8vw,94px)",letterSpacing:"-.065em",lineHeight:1.01,fontWeight:650,margin:"25px 0",maxWidth:900}}>Your ideas.<br/><span style={{color:"#9bacc5"}}>Now in motion.</span></h1>
<p style={{maxWidth:580,color:"#abb6c5",lineHeight:1.65,fontSize:18}}>A native motion-production engine for ChatGPT. Direct scenes in a conversation; play and render real animated films in a browser. No separate OpenAI API key required for this workflow.</p>
<div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:30}}>
<Link href="/motion" style={{background:"#e0e7f0",color:"#11151e",padding:"13px 18px",borderRadius:6,textDecoration:"none",fontWeight:700}}>OPEN MOTION STUDIO ↗</Link>
<Link href="/motion/chat-preview" style={{border:"1px solid #536078",padding:"13px 18px",borderRadius:6,textDecoration:"none"}}>PREVIEW ENGINE ↗</Link></div>
<section style={{marginTop:95,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:20}}>
{facts.map(([head,copy])=><article key={head} style={{borderTop:"1px solid #354050",paddingTop:20}}><b style={{fontSize:12,letterSpacing:".06em"}}>{head}</b><p style={{color:"#a6b1c0",lineHeight:1.7}}>{copy}</p></article>)}</section>
<footer style={{borderTop:"1px solid #28303a",marginTop:90,paddingTop:20,color:"#7f90a8",fontSize:12}}>Margaryan Content Studio · Keyless motion graphics · No private Distribution or CRM integration on this public server.</footer>
</main>}
