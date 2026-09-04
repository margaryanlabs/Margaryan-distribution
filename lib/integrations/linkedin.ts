export async function publishLinkedInPost(args:{accessToken:string;authorUrn:string;commentary:string;version:string}){
  const res=await fetch("https://api.linkedin.com/rest/posts",{method:"POST",headers:{Authorization:`Bearer ${args.accessToken}`,"Content-Type":"application/json","X-Restli-Protocol-Version":"2.0.0","Linkedin-Version":args.version},body:JSON.stringify({author:args.authorUrn,commentary:args.commentary,visibility:"PUBLIC",distribution:{feedDistribution:"MAIN_FEED",targetEntities:[],thirdPartyDistributionChannels:[]},lifecycleState:"PUBLISHED",isReshareDisabledByAuthor:false})});
  if(!res.ok) throw new Error(`LinkedIn publish failed: ${res.status} ${await res.text()}`); return{id:res.headers.get("x-restli-id")||null};
}
