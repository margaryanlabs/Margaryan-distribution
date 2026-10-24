/**
 * Migration planning catalog. Repositories marked verified were confirmed
 * with the connected GitHub account on 2026-10-20. This is NOT deployment
 * discovery, a repository-health audit, or a representation of runtime state.
 */
export type CloudCatalogItem={
 id:string;name:string;type:string;repository:string|null;
 repositoryVerified:boolean;level:"standard"|"high"|"critical";
 workload:"web"|"web-worker"|"data"|"media";
 review:string[];
};
export const cloudCatalog:CloudCatalogItem[]=[
 {id:"promptence",name:"Promptence",type:"AI visibility SaaS",
  repository:"margaryan-labs/ai-revenue-navigator",repositoryVerified:true,level:"high",workload:"web-worker",
  review:["Auth / OAuth redirects","GSC and GA4 integrations","Database and scheduled jobs"]},
 {id:"das",name:"SOFIA / DAS (legacy)",type:"Education / 3D",
  repository:"margaryan-labs/das-speak-armenia",repositoryVerified:true,level:"standard",workload:"web",
  review:["3D assets and CDN headers","Interactive audio and media","Classroom mobile performance"]},
 {id:"raios",name:"RAIOS",type:"Restaurant intelligence",
  repository:"margaryan-labs/ai-os-foundation",repositoryVerified:true,level:"high",workload:"web-worker",
  review:["Database and identities","Backend integration contracts","Custom domains and API webhooks"]},
 {id:"veto-sport",name:"VETO Sport",type:"Sports intelligence",
  repository:"margaryanlabs/Vetosport",repositoryVerified:true,level:"standard",workload:"web-worker",
  review:["Live sports provider and quotas","Worker refresh scheduling","Realtime UI fallbacks"]},
 {id:"tunnel",name:"TUN",type:"Real estate intelligence",
  repository:null,repositoryVerified:false,level:"standard",workload:"web",
  review:["Identify canonical repository","Confirm runtime stack","Verify domain and build output"]},
 {id:"veto",name:"VETO Decision Command / Intelligence",type:"Risk and trading analytics",
  repository:"margaryanlabs/decision-command",repositoryVerified:true,level:"critical",workload:"data",
  review:["Exchange credentials and isolation","Ingestion, storage and replay retention","Scoring freshness, 10-asset pipeline and zero-live-order safeguards"]},
 {id:"vetu",name:"VETOGRAM",type:"Telegram mini app",
  repository:"margaryanlabs/Telegram-story-bot",repositoryVerified:true,level:"high",workload:"web-worker",
  review:["Telegram webhooks and Business permissions","Telegram session security and MTProto connection","Realtime chat, auth and data migration"]},
 {id:"ingu-shop",name:"INGU Shop",type:"Commerce / sourcing",repository:"margaryan-labs/ingu-stone-sourcing",
  repositoryVerified:true,level:"standard",workload:"web",
  review:["Product content vs actual availability","Commerce pipeline and client data","Existing Lovable hosting boundaries"]},
 {id:"meqena",name:"MEQENA / Shtapauto",type:"Dealer SaaS",repository:"margaryanlabs/Shtapauto",
  repositoryVerified:true,level:"standard",workload:"web",
  review:["Dealer accounts and data tenancy","Image storage and CRM","Deployment and import rollback"]},
 {id:"motion",name:"Motion Studio / Distribution",type:"Media & sales operations",
  repository:"margaryanlabs/Margaryan-distribution",repositoryVerified:true,level:"critical",workload:"media",
  review:["Chromium / FFmpeg render worker","OAuth issuer and callback stability","CRM persistence, object storage and private media"]}
];
export const migrationChecks=[
 {id:"repo",label:"Confirm repository, runtime and build command",hint:"Verify the exact source, branch, Node/worker version, build output and health endpoint."},
 {id:"secrets",label:"Inventory environment variables, without values",hint:"Map secret names, OAuth redirect URIs and webhook destinations. Never copy keys to this checklist."},
 {id:"deps",label:"Map database, object storage and scheduled jobs",hint:"Distinguish Supabase-specific Auth, Realtime and Storage from plain Postgres."},
 {id:"backup",label:"Create verified restorable backup",hint:"Test a restoration of both metadata and files before switching a production service."},
 {id:"stage",label:"Build and test on the new staging host",hint:"Check HTTP, SSL, background jobs, auth, emails, mobile and native integrations."},
 {id:"rollback",label:"Document rollback and DNS cutover",hint:"Ensure previous deployment remains reachable and test rollback procedure."},
 {id:"observe",label:"Check logs and monitoring after cutover",hint:"Verify real user-facing behavior and run an observation period before retiring old infrastructure."}
] as const;
