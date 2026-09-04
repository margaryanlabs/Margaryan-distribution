const links=[
  ["Command","/"],["Autopilot","/autopilot"],["Leads","/leads"],["Inbox","/inbox"],["Calls","/calls"],["Meetings","/meetings"],["SMM","/smm"],["Analytics","/analytics"],["Operations","/operations"]
] as const;

export function WorkspaceDock(){
  return <nav aria-label="Margaryan Distribution workspaces" style={{position:"fixed",left:"50%",bottom:12,transform:"translateX(-50%)",zIndex:1000,display:"flex",gap:4,maxWidth:"calc(100vw - 24px)",overflowX:"auto",padding:5,background:"rgba(9,11,14,.94)",border:"1px solid #252a33",borderRadius:12,boxShadow:"0 12px 35px rgba(0,0,0,.42)",backdropFilter:"blur(16px)"}}>
    {links.map(([label,href])=><a key={href} href={href} style={{flex:"0 0 auto",textDecoration:"none",color:"#aeb5bf",fontSize:11,fontWeight:650,letterSpacing:".02em",padding:"9px 11px",borderRadius:8,whiteSpace:"nowrap"}}>{label}</a>)}
  </nav>;
}
