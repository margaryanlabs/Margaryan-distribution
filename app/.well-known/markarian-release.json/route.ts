import {NextResponse} from 'next/server';
import {stagingReleaseMarker} from '@/lib/cloud/release-marker';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export function GET(){
 const marker=stagingReleaseMarker(process.env);
 if(!marker)return NextResponse.json({error:'Not Found'},{status:404,headers:{'Cache-Control':'no-store'}});
 return NextResponse.json(marker,{headers:{'Cache-Control':'no-store, max-age=0','X-Content-Type-Options':'nosniff'}});
}
