export async function publishXPost(args:{accessToken:string;text:string}){
  const res=await fetch("https://api.x.com/2/tweets",{method:"POST",headers:{Authorization:`Bearer ${args.accessToken}`,"Content-Type":"application/json"},body:JSON.stringify({text:args.text,made_with_ai:true})});
  if(!res.ok) throw new Error(`X publish failed: ${res.status} ${await res.text()}`); return res.json();
}
