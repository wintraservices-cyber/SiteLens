import {NextRequest,NextResponse} from 'next/server';
import {crawlSite} from '@/lib/crawl';
export const runtime='nodejs';
export const maxDuration=120;
export async function POST(req:NextRequest){try{const {url,maxPages}=await req.json();if(typeof url!=='string')return NextResponse.json({error:'A valid URL is required.'},{status:400});const u=new URL(url);if(!['http:','https:'].includes(u.protocol))throw new Error('Only HTTP and HTTPS URLs are supported.');const result=await crawlSite(u.toString(),Math.min(Math.max(Number(maxPages)||20,1),50));return NextResponse.json(result);}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Crawl failed.'},{status:400});}}
