import * as cheerio from 'cheerio';

export type PageAudit = {
  url:string; status:number; title:string; h1s:string[]; description:string; canonical:string|null;
  wordCount:number; internalLinks:string[]; externalLinks:string[]; images:number; imagesMissingAlt:number;
  schemas:string[]; depth:number; error?:string;
};

function absolute(base:string, href:string){try{return new URL(href,base).toString()}catch{return null}}
function normalize(x:string){const u=new URL(x);u.hash='';if(u.pathname!=='/'&&u.pathname.endsWith('/'))u.pathname=u.pathname.slice(0,-1);return u.toString()}

export async function crawlSite(input:string,maxPages=20):Promise<{pages:PageAudit[];sitemapFound:boolean;robotsFound:boolean;robots:string; sitemapUrls:string[]}> {
  const start=new URL(input); start.hash='';
  const origin=start.origin;
  const headers={'user-agent':'SiteLensBot/0.2 (+https://sitelens.app/audit)','accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'};
  let robots=''; let robotsFound=false; try{const r=await fetch(origin+'/robots.txt',{headers,redirect:'follow',signal:AbortSignal.timeout(8000)});robotsFound=r.ok;robots=r.ok?await r.text():'';}catch{}
  const sitemapCandidates:string[]=[];
  for(const line of robots.split(/\r?\n/)){const m=line.match(/^\s*Sitemap:\s*(\S+)/i);if(m)sitemapCandidates.push(m[1])}
  if(!sitemapCandidates.length)sitemapCandidates.push(origin+'/sitemap.xml');
  let sitemapUrls:string[]=[]; let sitemapFound=false;
  for(const s of sitemapCandidates.slice(0,3)){try{const r=await fetch(s,{headers,redirect:'follow',signal:AbortSignal.timeout(8000)});if(r.ok){const xml=await r.text();const $=cheerio.load(xml,{xmlMode:true});sitemapUrls=$('url loc').map((_,e)=>$(e).text().trim()).get().filter(Boolean);if(sitemapUrls.length){sitemapFound=true;break}}}catch{}}
  const queue:[string,number][]=[[normalize(start.toString()),0]]; const seen=new Set<string>(); const pages:PageAudit[]=[];
  while(queue.length&&pages.length<maxPages){const [url,depth]=queue.shift()!;if(seen.has(url))continue;seen.add(url);
    try{const r=await fetch(url,{headers,redirect:'follow',signal:AbortSignal.timeout(10000)});const finalUrl=normalize(r.url);const type=r.headers.get('content-type')||'';if(!type.includes('text/html'))continue;const html=await r.text();const $=cheerio.load(html);const internal:string[]=[];const external:string[]=[];$('a[href]').each((_,e)=>{const x=absolute(finalUrl,$(e).attr('href')||'');if(!x)return;try{const n=normalize(x);if(new URL(n).origin===origin){internal.push(n);if(!seen.has(n)&&depth<4)queue.push([n,depth+1])}else external.push(n)}catch{}});
      const schemas:string[]=[];$('script[type="application/ld+json"]').each((_,e)=>{try{const j=JSON.parse($(e).text());const arr=Array.isArray(j)?j:[j];for(const x of arr){if(x?.['@type'])schemas.push(...(Array.isArray(x['@type'])?x['@type']:[x['@type']]))}}catch{}});
      const bodyText=$('body').text().replace(/\s+/g,' ').trim(); pages.push({url:finalUrl,status:r.status,title:$('title').first().text().trim(),h1s:$('h1').map((_,e)=>$(e).text().trim()).get().filter(Boolean),description:$('meta[name="description"]').attr('content')?.trim()||'',canonical:$('link[rel="canonical"]').attr('href')||null,wordCount:bodyText?bodyText.split(' ').length:0,internalLinks:[...new Set(internal)],externalLinks:[...new Set(external)],images:$('img').length,imagesMissingAlt:$('img').filter((_,e)=>!($(e).attr('alt')||'').trim()).length,schemas:[...new Set(schemas)],depth});
    }catch(e){pages.push({url,status:0,title:'',h1s:[],description:'',canonical:null,wordCount:0,internalLinks:[],externalLinks:[],images:0,imagesMissingAlt:0,schemas:[],depth,error:e instanceof Error?e.message:'Request failed'});}
  }
  return {pages,sitemapFound,robotsFound,robots,sitemapUrls};
}
