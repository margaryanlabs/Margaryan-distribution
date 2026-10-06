"use client";

import {usePathname} from "next/navigation";

const primary=[
  ["Revenue","/sales"],
  ["Marketing","/smm"],
  ["Intelligence","/intelligence"]
] as const;

const flow=[
  ["Leads","/leads"],
  ["Inbox","/inbox"],
  ["Meetings","/meetings"]
] as const;

const system=[
  ["Command","/"],
  ["Products","/products"],
  ["Connections","/connections"],
  ["Autopilot","/autopilot"],
  ["Quality","/quality"],
  ["Operations","/operations"],
  ["Analytics","/analytics"],
  ["Calls","/calls"],
  ["Brief","/brief"]
] as const;

function activePath(pathname:string,href:string){
  if(href==="/")return pathname==="/";
  return pathname===href||pathname.startsWith(href+"/");
}

function LinkItem({label,href,active,primaryItem=false}:{label:string;href:string;active:boolean;primaryItem?:boolean}){
  return <a href={href} aria-current={active?"page":undefined} style={{
    flex:"0 0 auto",position:"relative",textDecoration:"none",
    color:active?"#f0f4d3":primaryItem?"#c7ced7":"#929aa5",
    fontSize:primaryItem?10:9,fontWeight:active?820:primaryItem?740:650,
    letterSpacing:primaryItem?".025em":".035em",padding:primaryItem?"10px 12px":"9px 10px",
    borderRadius:9,whiteSpace:"nowrap",
    background:active?"linear-gradient(180deg,rgba(215,228,122,.14),rgba(215,228,122,.055))":"transparent",
    border:active?"1px solid rgba(215,228,122,.22)":"1px solid transparent",
    transition:"background .16s ease,color .16s ease,border-color .16s ease"
  }}>
    {label}
    {active&&<span aria-hidden style={{position:"absolute",left:"50%",bottom:2,transform:"translateX(-50%)",width:18,height:1,borderRadius:99,background:"#d7e47a",boxShadow:"0 0 10px rgba(215,228,122,.5)"}}/>}
  </a>;
}

export function WorkspaceDock(){
  const pathname=usePathname();
  const systemActive=system.some(([,href])=>activePath(pathname,href));

  return <nav aria-label="Margaryan Distribution workspaces" style={{
    position:"fixed",left:"50%",bottom:12,transform:"translateX(-50%)",zIndex:1000,
    display:"flex",alignItems:"center",gap:3,maxWidth:"calc(100vw - 24px)",overflowX:"auto",padding:5,
    background:"rgba(7,9,12,.91)",border:"1px solid rgba(66,74,84,.58)",borderRadius:15,
    boxShadow:"0 18px 55px rgba(0,0,0,.48)",backdropFilter:"blur(22px)",scrollbarWidth:"none"
  }}>
    {primary.map(([label,href])=><LinkItem key={href} label={label} href={href} active={activePath(pathname,href)} primaryItem/>)}
    <span aria-hidden style={{width:1,height:22,background:"#252b33",margin:"0 3px",flex:"0 0 auto"}}/>
    {flow.map(([label,href])=><LinkItem key={href} label={label} href={href} active={activePath(pathname,href)}/>)}
    <span aria-hidden style={{width:1,height:22,background:"#252b33",margin:"0 3px",flex:"0 0 auto"}}/>
    <details style={{position:"relative",flex:"0 0 auto"}}>
      <summary style={{
        listStyle:"none",cursor:"pointer",userSelect:"none",fontSize:9,fontWeight:700,letterSpacing:".035em",
        color:systemActive?"#f0f4d3":"#929aa5",padding:"9px 10px",borderRadius:9,
        border:systemActive?"1px solid rgba(159,183,255,.25)":"1px solid transparent",
        background:systemActive?"rgba(159,183,255,.08)":"transparent"
      }}>System</summary>
      <div style={{
        position:"fixed",left:"50%",bottom:62,transform:"translateX(-50%)",zIndex:1001,
        display:"grid",gridTemplateColumns:"repeat(3,minmax(110px,1fr))",gap:4,minWidth:380,maxWidth:"calc(100vw - 28px)",
        padding:7,background:"rgba(8,10,13,.97)",border:"1px solid #2b323b",borderRadius:12,
        boxShadow:"0 20px 60px rgba(0,0,0,.55)",backdropFilter:"blur(22px)"
      }}>
        {system.map(([label,href])=><a key={href} href={href} style={{
          textDecoration:"none",color:activePath(pathname,href)?"#eff4d1":"#9aa3ae",
          background:activePath(pathname,href)?"rgba(215,228,122,.08)":"#0d1014",
          border:"1px solid "+(activePath(pathname,href)?"rgba(215,228,122,.18)":"#1d232a"),
          borderRadius:8,padding:"10px",fontSize:9,fontWeight:680
        }}>{label}</a>)}
      </div>
    </details>
  </nav>;
}
