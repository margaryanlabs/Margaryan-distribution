import {NextResponse} from 'next/server';
import {cloudOperatorAccess} from '@/lib/cloud/operator-auth';
import {readAgentSupervisorStatus} from '@/lib/cloud/agent-supervisor-status';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const access=cloudOperatorAccess(request.headers,process.env);
 if(access!=='allow')return NextResponse.json({error:access==='unconfigured'?'Operator authentication is not configured.':'Unauthorized'},{
  status:access==='unconfigured'?503:401,
  headers:{'Cache-Control':'private, no-store','WWW-Authenticate':'Basic realm="Margaryan Cloud"'}
 });
 return NextResponse.json(readAgentSupervisorStatus(process.env),{headers:{
  'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff','Vary':'Authorization'
 }});
}
