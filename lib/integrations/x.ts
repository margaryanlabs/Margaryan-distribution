type XCreateResponse={data?:{id?:string;text?:string};errors?:unknown[]};

async function createXPost(args:{accessToken:string;text:string;replyToId?:string}){
  const text=args.text.trim();
  if(!text)throw new Error("X post text is empty");
  const payload:Record<string,unknown>={text};
  if(args.replyToId)payload.reply={in_reply_to_tweet_id:args.replyToId};
  const res=await fetch("https://api.x.com/2/tweets",{method:"POST",headers:{Authorization:`Bearer ${args.accessToken}`,"Content-Type":"application/json"},body:JSON.stringify(payload)});
  const raw=await res.text();
  if(!res.ok)throw new Error(`X publish failed: ${res.status} ${raw}`);
  const data=JSON.parse(raw) as XCreateResponse;
  const id=data.data?.id;
  if(!id)throw new Error("X publish succeeded without a post id");
  return data;
}

export async function publishXPost(args:{accessToken:string;text:string}){
  return createXPost(args);
}

export async function publishXThread(args:{accessToken:string;posts:string[]}){
  const posts=args.posts.map(item=>item.trim()).filter(Boolean).slice(0,12);
  if(posts.length<2)throw new Error("X thread requires at least 2 non-empty posts");
  const published:Array<{id:string;text:string}>=[];
  let replyToId:string|undefined;
  for(const text of posts){
    const result=await createXPost({accessToken:args.accessToken,text,replyToId});
    const id=result.data?.id;
    if(!id)throw new Error("X thread publish returned no post id");
    published.push({id,text:result.data?.text||text});
    replyToId=id;
  }
  return{thread:true,rootId:published[0]?.id,lastId:published[published.length-1]?.id,posts:published};
}
