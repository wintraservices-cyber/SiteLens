import {NextRequest,NextResponse} from 'next/server';
import {auditUrl} from '@/lib/audit';
export const runtime='nodejs';
export const maxDuration=30;
export async function POST(req:NextRequest){
 try{const {url}=await req.json();if(typeof url!=='string')return NextResponse.json({error:'URL required'},{status:400});const result=await auditUrl(url,15000);return NextResponse.json(result)}
 catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Audit failed'},{status:500})}
}
