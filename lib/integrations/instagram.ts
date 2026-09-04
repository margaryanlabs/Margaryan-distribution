export async function publishInstagramImage(args:{accessToken:string;userId:string;mediaUrl:string;caption:string;graphVersion:string}){
  const base=`https://graph.facebook.com/${args.graphVersion}`;
  const create=await fetch(`${base}/${encodeURIComponent(args.userId)}/media`,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({image_url:args.mediaUrl,caption:args.caption,access_token:args.accessToken})});
  const container=await create.json(); if(!create.ok||!container.id) throw new Error(`Instagram media creation failed: ${create.status} ${JSON.stringify(container)}`);
  const publish=await fetch(`${base}/${encodeURIComponent(args.userId)}/media_publish`,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({creation_id:String(container.id),access_token:args.accessToken})});
  const result=await publish.json(); if(!publish.ok) throw new Error(`Instagram publish failed: ${publish.status} ${JSON.stringify(result)}`); return result;
}
