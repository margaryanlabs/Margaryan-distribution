export async function resolveGoogleAccessToken(){
  if(process.env.GOOGLE_ACCESS_TOKEN)return process.env.GOOGLE_ACCESS_TOKEN;
  if(process.env.GMAIL_ACCESS_TOKEN)return process.env.GMAIL_ACCESS_TOKEN;
  const clientId=process.env.GOOGLE_CLIENT_ID,clientSecret=process.env.GOOGLE_CLIENT_SECRET,refreshToken=process.env.GOOGLE_REFRESH_TOKEN;
  if(!clientId||!clientSecret||!refreshToken)throw new Error("Google OAuth is not configured");
  const res=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,refresh_token:refreshToken,grant_type:"refresh_token"})});
  if(!res.ok)throw new Error(`Google OAuth refresh failed: ${res.status} ${await res.text()}`);
  const data=await res.json() as{access_token?:string};if(!data.access_token)throw new Error("Google OAuth returned no access token");return data.access_token;
}
