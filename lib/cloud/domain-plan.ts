export type DomainDraft={hostname:string;ipv4:string;project:string};
export type DomainPlan={
 version:1;type:"domain-connect-plan";execution:"review-only";project:string;
 hostname:string;dns:{type:"A";host:string;value:string;ttl:"Auto or 300s"};
 checks:string[];
};
export function domainInputErrors(value:DomainDraft):string[]{
 const errors:string[]=[];
 const host=value.hostname.trim().toLowerCase();
 if(host.length<4||host.length>253||!/^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(host))
  errors.push("Use a valid fully-qualified DNS hostname, such as app.example.com.");
 const segments=value.ipv4.trim().split(".");
 if(segments.length!==4||segments.some(s=>!(/^(0|[1-9]\d{0,2})$/.test(s)&&Number(s)<=255)))
  errors.push("Enter a valid IPv4 address assigned to your VPS.");
 else{
  const octets=segments.map(Number);
  if(octets[0]===0||octets[0]===10||octets[0]===127||
   octets[0]===169&&octets[1]===254||
   octets[0]===172&&octets[1]>=16&&octets[1]<=31||
   octets[0]===192&&octets[1]===168||
   octets[0]===192&&octets[1]===0&&octets[2]===2||
   octets[0]===198&&octets[1]===51&&octets[2]===100||
   octets[0]===203&&octets[1]===0&&octets[2]===113||
   octets[0]===100&&octets[1]>=64&&octets[1]<=127||
   octets[0]>=224)
   errors.push("Use a routable public IPv4 address, not an internal or reserved address.");
 }
 if(!/^[a-z][a-z0-9-]{1,47}$/.test(value.project.trim()))
  errors.push("Project identifier must be a lowercase application slug.");
 return errors;
}
export function domainConnectPlan(value:DomainDraft):DomainPlan{
 const errors=domainInputErrors(value);if(errors.length)throw new Error(errors.join(" "));
 const hostname=value.hostname.trim().toLowerCase();
 return {version:1,type:"domain-connect-plan",execution:"review-only",project:value.project.trim(),
  hostname,dns:{type:"A",host:hostname,value:value.ipv4.trim(),ttl:"Auto or 300s"},
  checks:[
   "Confirm domain ownership and current DNS provider before editing records",
   "Create or update one A record at your DNS provider; verify no conflicting records",
   "Attach the reviewed HTTPS hostname to the staging application in Coolify",
   "Wait for authoritative DNS propagation and verify IP resolution externally",
   "Verify TLS certificate chain, HTTPS response, application health and redirects",
   "Test production cutover and rollback before moving user traffic"
  ]};
}
