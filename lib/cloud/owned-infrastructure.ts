import type {CloudSnapshot} from "./command-center";

export type OwnedLayer={
 id:string;name:string;category:"Control"|"Compute"|"Data"|"Operations"|"Trust";
 lead:string;engine:string;status:"source-ready"|"planned";
 abilities:string[];needs:string[];location:string
};
export const ownedLayers:OwnedLayer[]=[
 {id:"control",name:"Markarian Command",category:"Control",lead:"Single private owner cockpit",
  engine:"Next.js control plane + Coolify API",status:"source-ready",
  abilities:["Cross-project inventory and migration workspace","Read-only provider bridges for old infrastructure","Owner-only secured Cloud API"],
  needs:["Finish repository build and release tests","SSO/MFA and activity audit before allowing production writes"],
  location:"app/cloud"},
 {id:"runtime",name:"Markarian Compute",category:"Compute",lead:"Host websites, APIs, containers and workers",
  engine:"Coolify + Docker + HTTPS reverse proxy",status:"planned",
  abilities:["Git deployments and healthchecks","Independent workloads and scheduled jobs","Managed domains with TLS and release history"],
  needs:["Purchase and harden VPS","Install Coolify and private management access","Deploy the disposable pilot before real projects"],
  location:"deploy/cloud/pilot"},
 {id:"data",name:"Markarian Data",category:"Data",lead:"Own database, identities, APIs and files",
  engine:"Official self-hosted Supabase Docker components",status:"source-ready",
  abilities:["PostgreSQL and REST APIs","Auth, JWT, Realtime, Storage and functions","Storage and database policies under our control"],
  needs:["Prepare the pinned official Docker source on a data VPS","Configure credentials and HTTPS privately","Validate backups, restores and each client integration"],
  location:"scripts/cloud/prepare-supabase.mjs"},
 {id:"queue",name:"Markarian Queue",category:"Compute",lead:"Private queue/cache for background work",
  engine:"Valkey with ACL and persistent AOF",status:"source-ready",
  abilities:["Redis-compatible key/value service","Private networking and restricted client keys","Local secret generation without committing passwords"],
  needs:["Operator deploys private operations Compose","Connect authorized worker containers to the private network","Implement idempotent jobs, retries and dead-letter flow"],
  location:"deploy/cloud/ops"},
 {id:"observe",name:"Markarian Observe",category:"Operations",lead:"Self-hosted monitoring foundation",
  engine:"Prometheus + Grafana",status:"source-ready",
  abilities:["Prometheus private metrics storage","Grafana local datasource provisioning","Versioned Compose with no host ports"],
  needs:["Operator deploys private operations Compose","Configure app/database exporters and alert destinations","Add logs and test retention/alerts"],
  location:"deploy/cloud/ops"},
 {id:"backup",name:"Markarian Recovery",category:"Operations",lead:"Encrypted backup and restore assurance",
  engine:"Separate offsite encrypted storage + recovery jobs",status:"planned",
  abilities:["Database and file retention plan","Restore evidence and disaster recovery policy","Migration and rollback checklists"],
  needs:["Secure an offsite backup destination","Implement and verify scheduled jobs","Restore a real staging copy before any production cutover"],
  location:"docs/cloud/SELF_HOSTED_DATA.md"},
 {id:"security",name:"Markarian Trust",category:"Trust",lead:"Secure internal access and permissions",
  engine:"Operator Basic guard now; SSO/MFA/RBAC later",status:"planned",
  abilities:["Cloud UI and API fail closed when operator login is absent","Read-only inventory and allowlisted external fields","No tokens in web pages or GitHub source"],
  needs:["Private VPN or Zero Trust for operator UI","SSO and MFA with role permissions","Signed approvals and tamper-evident audit for write operations"],
  location:"lib/cloud/operator-auth.ts"}
];
export function ownedSignals(snapshot:CloudSnapshot){
 const appReady=snapshot.sources?.applications===true;
 const serverReady=snapshot.sources?.servers===true;
 const healthyServers=serverReady?snapshot.servers.filter(x=>x.status==="healthy").length:0;
 return {
  serverInventoryConnected:serverReady,
  appInventoryConnected:appReady,
  serverCount:serverReady?snapshot.servers.length:null,
  applicationCount:appReady?snapshot.applications.length:null,
  healthyServers:serverReady?healthyServers:null,
  readyForMigration:false,
  stage:snapshot.mode==="setup"?"Not connected":snapshot.mode==="degraded"?"Partially connected":"Coolify inventory connected"
 };
}
