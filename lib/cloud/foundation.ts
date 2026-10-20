/**
 * Control-plane architecture manifest. These are BUILD PLANS, not discovered
 * deployments. Never derive a "live" service state from this catalog.
 */
export type FoundationService={
 id:string;title:string;subtitle:string;replacement:string;
 software:string;requirements:string[];
 stage:"blueprint";doc:string;isolation:"isolated"|"shared";
};
export const foundationServices:FoundationService[]=[
 {id:"deploy",title:"Cloud Deploy",subtitle:"Git deployments, previews, HTTPS",
  replacement:"Vercel",software:"Coolify + Docker + reverse proxy",
  requirements:["Own VPS with Docker","Connected GitHub App","TLS/DNS + verified rollback"],
  stage:"blueprint",isolation:"shared",doc:"docs/MARKARIAN_CLOUD.md"},
 {id:"compute",title:"Cloud Compute",subtitle:"Web, API, worker and cron containers",
  replacement:"Railway",software:"Coolify + Docker + scheduled jobs",
  requirements:["Split persistent and stateless workloads","CPU/RAM limits and healthchecks","External scheduler and idempotent jobs"],
  stage:"blueprint",isolation:"shared",doc:"docs/cloud/MIGRATION_SOURCE_AUDIT.md"},
 {id:"data",title:"Cloud Data",subtitle:"Postgres, Auth, Realtime, Storage, Functions",
  replacement:"Supabase",software:"Official self-hosted Supabase Docker stack",
  requirements:["Dedicated data host with 8 GB+ RAM recommended","Private database access and secured gateway","Secrets, backups, restoration and JWT migration plan"],
  stage:"blueprint",isolation:"isolated",doc:"docs/cloud/SELF_HOSTED_DATA.md"},
 {id:"queue",title:"Cloud Queue",subtitle:"Redis, background work and scheduling",
  replacement:"Managed queues and Railway cron",software:"Redis + isolated workers",
  requirements:["Redis access control and persistent queues","Retry limits and job idempotency","Monitoring and durable failure handling"],
  stage:"blueprint",isolation:"isolated",doc:"docs/cloud/SELF_HOSTED_DATA.md"},
 {id:"storage",title:"Cloud Storage",subtitle:"Media assets and backup objects",
  replacement:"Managed object storage",software:"S3-compatible storage (deployment later)",
  requirements:["Private buckets and separate access keys","Offsite backup + tested restore","Encryption and retention lifecycle"],
  stage:"blueprint",isolation:"isolated",doc:"docs/cloud/SELF_HOSTED_DATA.md"},
 {id:"observability",title:"Cloud Observe",subtitle:"Metrics, logs and incident alerts",
  replacement:"Managed platform monitoring",software:"Prometheus / Grafana / Loki (deployment later)",
  requirements:["Restricted admin access","Per-service alerting","Capacity planning including VETO ClickHouse"],
  stage:"blueprint",isolation:"isolated",doc:"docs/cloud/SELF_HOSTED_DATA.md"}
];
export const foundationGates=[
 {id:"server",label:"Own and secure a VPS",description:"SSH keys, firewall, OS updates, disk space and admin access"},
 {id:"supabase",label:"Prepare upstream Supabase release",description:"Pinned official Docker source; secrets not committed to Git"},
 {id:"isolation",label:"Isolate databases and runtimes",description:"No public Postgres/Redis ports and separate worker resource limits"},
 {id:"backups",label:"Prove offsite restore",description:"Encrypted copies of database and objects, plus a tested restore"},
 {id:"pilot",label:"Deploy staging pilot",description:"Check TLS, container health, DNS and rollback with disposable resources"},
 {id:"migrate",label:"Migrate one noncritical app",description:"Verify Auth, Storage, cron, workers and rollback before production"},
] as const;