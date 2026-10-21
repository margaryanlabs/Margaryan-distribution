/** Conservative host resource planning before VPS purchase.
 * All values are hypothetical allocations, NOT measured application usage.
 * Units: vCPU and MiB. No money totals are fabricated.
 */
export type Workload={id:string;name:string;role:"web"|"data"|"worker"|"ops"|"analytics";cpu:number;ramMiB:number;replicas:number;enabled:boolean;notes:string};
export type NodeCapacity={cpu:number;ramMiB:number;reservedCpu:number;reservedRamMiB:number};
export const defaultWorkloads:Workload[]=[
 {id:"cloud",name:"Markarian Control",role:"web",cpu:1,ramMiB:1024,replicas:1,enabled:true,notes:"Next.js owner console (planning allowance)"},
 {id:"web",name:"Web + APIs",role:"web",cpu:2,ramMiB:2048,replicas:1,enabled:true,notes:"Combined light traffic; increase as apps migrate"},
 {id:"data",name:"Supabase core",role:"data",cpu:4,ramMiB:8192,replicas:1,enabled:true,notes:"Full Supabase baseline; dedicated host recommended"},
 {id:"queue",name:"Queue & operations",role:"ops",cpu:2,ramMiB:2048,replicas:1,enabled:true,notes:"Valkey, Prometheus and Grafana starter"},
 {id:"motion",name:"Motion renderer",role:"worker",cpu:4,ramMiB:4096,replicas:1,enabled:false,notes:"FFmpeg/Chromium rendering spikes"},
 {id:"veto",name:"VETO ClickHouse",role:"analytics",cpu:4,ramMiB:8192,replicas:1,enabled:false,notes:"Railway measurements reached nearly 8 GiB; reserve independently"}
];
export function planCapacity(node:NodeCapacity,workloads:Workload[]){
 const invalid=!Number.isFinite(node.cpu)||!Number.isFinite(node.ramMiB)||!Number.isFinite(node.reservedCpu)||
 !Number.isFinite(node.reservedRamMiB)||node.cpu<1||node.ramMiB<512||node.reservedCpu<0||node.reservedRamMiB<0||
 node.reservedCpu>=node.cpu||node.reservedRamMiB>=node.ramMiB||workloads.some(w=>
 !Number.isInteger(w.cpu)||w.cpu<0||!Number.isInteger(w.ramMiB)||w.ramMiB<0||
 !Number.isInteger(w.replicas)||w.replicas<1||w.replicas>50);
 if(invalid)return {valid:false,usedCpu:0,usedRamMiB:0,availableCpu:0,availableRamMiB:0,fit:false,cpuPercent:null,ramPercent:null,notes:["Invalid host or workload allocation"]};
 const usedCpu=workloads.reduce((sum,w)=>sum+(w.enabled?w.cpu*w.replicas:0),0);
 const usedRamMiB=workloads.reduce((sum,w)=>sum+(w.enabled?w.ramMiB*w.replicas:0),0);
 const availableCpu=node.cpu-node.reservedCpu,availableRamMiB=node.ramMiB-node.reservedRamMiB;
 const fit=usedCpu<=availableCpu&&usedRamMiB<=availableRamMiB;
 const notes:string[]=[];
 if(!fit)notes.push("Planned allocations exceed available capacity. Select a larger VPS or split workloads.");
 if(workloads.some(w=>w.enabled&&w.role==="analytics")&&workloads.some(w=>w.enabled&&w.role==="data"))
  notes.push("Keep analytics and primary databases on separate hosts for real deployment.");
 if(workloads.some(w=>w.enabled&&w.role==="worker"))
  notes.push("Video/AI workers can spike resource demand; plan independent limits and queues.");
 if(usedRamMiB/availableRamMiB>.8)notes.push("Memory reserve is under 20%; leave extra space for spikes, OS cache and migrations.");
 return {valid:true,usedCpu,usedRamMiB,availableCpu,availableRamMiB,fit,cpuPercent:usedCpu/availableCpu*100,ramPercent:usedRamMiB/availableRamMiB*100,notes};
}
