"use client";

import {usePathname} from "next/navigation";

const links=[
  ["Revenue","/sales"],["Marketing","/smm"],["Inbox","/inbox"],["Meetings","/meetings"],["Leads","/leads"],["Analytics","/analytics"],
  ["Command","/"],["Autopilot","/autopilot"],["Quality","/quality"],["Operations","/operations"],["Connections","/connections"],["Products","/products"],["Calls","/calls"],["Brief","/brief"]
] as const;

function activePath(pathname:string,href:string){
  if(href==="/")return pathname==="/";
  return pathname===href||pathname.startsWith(href+"/");
}

export function WorkspaceDock(){
  const pathname=usePathname();
  return <nav aria-label="Margaryan Distribution workspaces" style={{
    position:"fixed",left:"50%",bottom:12,transform:"translateX(-50%)",zIndex:1000,
    display:"flex",gap:4,maxWidth:"calc(100vw - 24px)",overflowX:"auto",padding:5,
    background:"rgba(8,10,13,.9)",border:"1px solid rgba(66,74,84,.58)",borderRadius:14,
    boxShadow:"0 18px 55px rgba(0,0,0,.48)",backdropFilter:"blur(20px)",
    scrollbarWidth:"none"
  }}>
    {links.map(([label,href])=>{
      const active=activePath(pathname,href);
      return <a key={href} href={href} aria-current={active?"page":undefined} style={{
        flex:"0 0 auto",position:"relative",textDecoration:"none",
        color:active?"#eff4d1":"#929aa5",fontSize:10,fontWeight:active?800:650,
        letterSpacing:".025em",padding:"9px 11px",borderRadius:9,whiteSpace:"nowrap",
        background:active?"linear-gradient(180deg,rgba(215,228,122,.13),rgba(215,228,122,.06))":"transparent",
        border:active?"1px solid rgba(215,228,122,.2)":"1px solid transparent",
        transition:"background .16s ease,color .16s ease,border-color .16s ease"
      }}>
        {label}
        {active&&<span aria-hidden style={{position:"absolute",left:"50%",bottom:2,transform:"translateX(-50%)",width:18,height:1,borderRadius:99,background:"#d7e47a",boxShadow:"0 0 10px rgba(215,228,122,.5)"}}/>}
      </a>;
    })}
  </nav>;
}
