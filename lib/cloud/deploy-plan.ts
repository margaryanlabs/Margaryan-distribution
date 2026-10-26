/** Safe, review-only release specification. No provider actions are executed. */
export type DeployEnvironment="staging"|"production";
export type DeployKind="nextjs"|"node"|"static"|"worker";
export type DeployInput={
 name:string;repository:string;branch:string;environment:DeployEnvironment;kind:DeployKind;
 cpu:number;memoryMB:number;replicas:number;port:number;healthPath:string;domain:string;
};
export type DeployPlan={schemaVersion:1;engine:"markarian-cloud";type:"deployment-review";
 execution:"manual-review-only";app:{name:string;repository:string;branch:string;environment:DeployEnvironment;kind:DeployKind};
 resources:{cpu:number;memoryMB:number;replicas:number;port:number};
 routing:{healthPath:string;domain:string|null};releaseGates:string[];
};
const NAME=/^[a-z][a-z0-9-]{1,47}$/;
const REPO=/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const BRANCH=/^[A-Za-z0-9_][A-Za-z0-9_./-]{0,99}$/;
const PATH=/^\/[a-zA-Z0-9_./-]*$/;
const HOST=/^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
export function validateDeployInput(value:DeployInput):string[]{
 const problems:string[]=[];
 if(!NAME.test(value.name)||value.name.includes("--"))problems.push("App name must be a lowercase slug (2–48 characters).");
 if(!REPO.test(value.repository)||value.repository.includes(".."))problems.push("Repository must be an exact GitHub owner/name path.");
 if(!BRANCH.test(value.branch)||value.branch.includes("..")||value.branch.includes("//")||value.branch.endsWith("/")||value.branch.includes("@{"))
  problems.push("Use a valid, unambiguous Git branch.");
 if(!["staging","production"].includes(value.environment))problems.push("Unknown environment.");
 if(!["nextjs","node","static","worker"].includes(value.kind))problems.push("Unsupported runtime type.");
 // No arbitrary preview-only ceilings: actual deployment capacity and quotas
 // must be checked against target hosts and provider constraints before execution.
 if(!Number.isSafeInteger(value.cpu)||value.cpu<1)problems.push("CPU must be a positive safe integer.");
 if(!Number.isSafeInteger(value.memoryMB)||value.memoryMB<128)problems.push("RAM must be at least 128 MB and a safe integer.");
 if(!Number.isSafeInteger(value.replicas)||value.replicas<1)problems.push("Replicas must be a positive safe integer.");
 if(!Number.isInteger(value.port)||value.port<1||value.port>65535)problems.push("Port must be 1–65535.");
 if(!PATH.test(value.healthPath)||value.healthPath.includes("..")||value.healthPath.includes("//"))problems.push("Invalid healthcheck path.");
 const domain=value.domain.trim().toLowerCase();
 if(domain&&(!HOST.test(domain)||domain.startsWith("localhost.")))problems.push("Use a valid DNS hostname or leave it blank.");
 if(value.kind==="worker"&&domain)problems.push("Workers should not publish a public domain.");
 return problems;
}
export function createDeployPlan(value:DeployInput):DeployPlan{
 const errors=validateDeployInput(value);
 if(errors.length)throw new Error(errors.join(" "));
 return {
  schemaVersion:1,engine:"markarian-cloud",type:"deployment-review",execution:"manual-review-only",
  app:{name:value.name,repository:value.repository.toLowerCase(),branch:value.branch,environment:value.environment,kind:value.kind},
  resources:{cpu:value.cpu,memoryMB:value.memoryMB,replicas:value.replicas,port:value.port},
  routing:{healthPath:value.healthPath,domain:value.domain.trim().toLowerCase()||null},
  releaseGates:[
   "Verify GitHub repo access and exact build output",
   "Configure runtime secrets server-side (names only in planning)",
   "Check TLS, DNS, logs and per-app healthcheck on an isolated VPS",
   "Review persistent DB/Auth/Storage, scheduled tasks and object data",
   "Create and verify offsite backup, staging restore and rollback plan",
   ...(value.environment==="production"?["Require separate owner approval and a successful staging release before production"]:[])
  ]
 };
}
