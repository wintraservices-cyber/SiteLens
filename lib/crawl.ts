import * as cheerio from 'cheerio';

export type PageAudit = {
  url:string; status:number; finalUrl?:string; title:string; h1s:string[]; description:string; canonical:string|null;
  robotsDirective:string; wordCount:number; internalLinks:string[]; externalLinks:string[];
  images:number; imagesMissingAlt:number; schemas:string[]; schemaValid:boolean; depth:number;
  titleLength:number; descriptionLength:number; indexable:boolean; contentHash:string; error?:string;
};

export type SiteFinding = {
  severity:'high'|'medium'|'low'; category:string; title:string; evidence:string; fix:string; urls:string[];
};

function absolute(base:string, href:string){try{return new URL(href,base).toString()}catch{return null}}
function normalize(x:string){const u=new URL(x);u.hash='';if(u.pathname!=='/'&&u.pathname.endsWith('/'))u.pathname=u.pathname.slice(0,-1);return u.toString()}
function hashText(s:string){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(16)}
function robotsAllows(robots:string,path:string){const lines=robots.split(/\r?\n/).map(x=>x.trim());let active=false;const disallows:string[]=[];for(const line of lines){if(!line||line.startsWith('#'))continue;const [k,...rest]=line.split(':');if(k?.trim().toLowerCase()==='user-agent'){active=rest.join(':').trim()==='*'}else if(active&&k?.trim().toLowerCase()==='disallow'){const v=rest.join(':').trim();if(v)disallows.push(v)}}return !disallows.some(d=>path.startsWith(d))}
function parseRobotsMeta($:cheerio.CheerioAPI){return $('meta[name="robots"],meta[name="googlebot"]').map((_,e)=>($(e).attr('content')||'').toLowerCase()).get().join(', ')}
function hasNoindex(d:string){return /\bnoindex\b/.test(d)}
function normalizeCanonical(c:string|null, page:string){if(!c)return null;try{return normalize(new URL(c,page).toString())}catch{return null}}

export async function crawlSite(input:string,maxPages=30):Promise<{pages:PageAudit[];sitemapFound:boolean;robotsFound:boolean;robots:string;sitemapUrls:string[];findings:SiteFinding[];stats:Record<string,number>}> {
  const start=new URL(input); start.hash=''; const origin=start.origin;
  const headers={'user-agent':'SiteLensBot/0.3 (+https://sitelens.app/audit)','accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'};
  let robots=''; let robotsFound=false;
  try{const r=await fetch(origin+'/robots.txt',{headers,redirect:'follow',signal:AbortSignal.timeout(8000)});robotsFound=r.ok;robots=r.ok?await r.text():'';}catch{}
  const sitemapCandidates:string[]=[];for(const line of robots.split(/\r?\n/)){const m=line.match(/^\s*Sitemap:\s*(\S+)/i);if(m)sitemapCandidates.push(m[1])}
  if(!sitemapCandidates.length)sitemapCandidates.push(origin+'/sitemap.xml');
  let sitemapUrls:string[]=[];let sitemapFound=false;
  for(const s of sitemapCandidates.slice(0,5)){try{const r=await fetch(s,{headers,redirect:'follow',signal:AbortSignal.timeout(8000)});if(r.ok){const xml=await r.text();const $=cheerio.load(xml,{xmlMode:true});sitemapUrls=$('url loc').map((_,e)=>$(e).text().trim()).get().filter(Boolean).map(x=>{try{return normalize(x)}catch{return x}});if(sitemapUrls.length){sitemapFound=true;break}}}catch{}}
  const seed=[normalize(start.toString()),...sitemapUrls.filter(x=>{try{return new URL(x).origin===origin}catch{return false}}).slice(0,Math.max(0,maxPages-1))];
  const queue:[string,number][]=[]; for(const u of seed)queue.push([u,u===normalize(start.toString())?0:1]);
  const seen=new Set<string>();const pages:PageAudit[]=[];
  while(queue.length&&pages.length<maxPages){
    const [url,depth]=queue.shift()!;if(seen.has(url))continue;seen.add(url);
    try{
      const r=await fetch(url,{headers,redirect:'follow',signal:AbortSignal.timeout(10000)});const finalUrl=normalize(r.url);
      const type=r.headers.get('content-type')||'';if(!type.includes('text/html'))continue;
      const html=await r.text();const $=cheerio.load(html);
      const internal:string[]=[],external:string[]=[];
      $('a[href]').each((_,e)=>{const x=absolute(finalUrl,$(e).attr('href')||'');if(!x)return;try{const n=normalize(x);if(new URL(n).origin===origin){internal.push(n);if(!seen.has(n)&&depth<4&&queue.length<maxPages*4)queue.push([n,depth+1])}else external.push(n)}catch{}});
      const schemas:string[]=[];let schemaValid=true;
      $('script[type="application/ld+json"]').each((_,e)=>{try{const j=JSON.parse($(e).text());const arr=Array.isArray(j)?j:[j];for(const x of arr){if(x?.['@type'])schemas.push(...(Array.isArray(x['@type'])?x['@type']:[x['@type']]))}}catch{schemaValid=false}});
      const bodyText=$('body').text().replace(/\s+/g,' ').trim();const title=$('title').first().text().trim();const desc=$('meta[name="description"]').attr('content')?.trim()||'';const rd=parseRobotsMeta($);
      const canonical=normalizeCanonical($('link[rel="canonical"]').attr('href')||null,finalUrl);const indexable=!hasNoindex(rd)&&robotsAllows(robots,new URL(finalUrl).pathname);
      pages.push({url,status:r.status,finalUrl,title,h1s:$('h1').map((_,e)=>$(e).text().trim()).get().filter(Boolean),description:desc,canonical,robotsDirective:rd,wordCount:bodyText?bodyText.split(/\s+/).length:0,internalLinks:[...new Set(internal)],externalLinks:[...new Set(external)],images:$('img').length,imagesMissingAlt:$('img').filter((_,e)=>!($(e).attr('alt')||'').trim()).length,schemas:[...new Set(schemas)],schemaValid,depth,titleLength:title.length,descriptionLength:desc.length,indexable,contentHash:hashText(bodyText)});
    }catch(e){pages.push({url,status:0,title:'',h1s:[],description:'',canonical:null,robotsDirective:'',wordCount:0,internalLinks:[],externalLinks:[],images:0,imagesMissingAlt:0,schemas:[],schemaValid:false,depth,titleLength:0,descriptionLength:0,indexable:false,contentHash:'',error:e instanceof Error?e.message:'Request failed'});}
  }
  const findings:SiteFinding[]=[];
  const add=(f:SiteFinding)=>findings.push(f);
  const titleMap=new Map<string,string[]>(),descMap=new Map<string,string[]>(),h1Map=new Map<string,string[]>(),hashMap=new Map<string,string[]>();
  for(const p of pages){
    if(p.status>=400||p.status===0)add({severity:'high',category:'Crawl',title:`Page returns ${p.status||'an error'}`,evidence:`${p.url} returned HTTP ${p.status||'no response'}.`,fix:'Repair the URL, server response, or redirect to a working canonical page.',urls:[p.url]});
    if(!p.title)add({severity:'high',category:'On-page',title:'Missing title tag',evidence:`No <title> was detected on ${p.url}.`,fix:'Add a unique, descriptive title aligned with the page intent.',urls:[p.url]});
    else {if(p.titleLength<30||p.titleLength>60)add({severity:'low',category:'On-page',title:'Title length may need optimization',evidence:`Title is ${p.titleLength} characters.`,fix:'Review the title for clarity and SERP truncation; prioritize relevance over a rigid character target.',urls:[p.url]});titleMap.set(p.title,[...(titleMap.get(p.title)||[]),p.url])}
    if(!p.h1s.length)add({severity:'medium',category:'On-page',title:'Missing H1',evidence:`No H1 was detected on ${p.url}.`,fix:'Add one clear primary heading describing the page topic.',urls:[p.url]});
    if(p.h1s.length>1)add({severity:'low',category:'On-page',title:'Multiple H1 headings',evidence:`${p.h1s.length} H1 headings were detected.`,fix:'Confirm that multiple H1s are intentional; otherwise consolidate to one primary page heading.',urls:[p.url]});
    if(p.h1s[0])h1Map.set(p.h1s[0],[...(h1Map.get(p.h1s[0])||[]),p.url]);
    if(!p.description)add({severity:'medium',category:'On-page',title:'Missing meta description',evidence:`No meta description was detected on ${p.url}.`,fix:'Add a concise, useful summary that matches the page intent.',urls:[p.url]});
    else {if(p.descriptionLength<70||p.descriptionLength>165)add({severity:'low',category:'On-page',title:'Meta description length may need optimization',evidence:`Description is ${p.descriptionLength} characters.`,fix:'Rewrite for clarity and relevance; avoid relying on a strict character limit.',urls:[p.url]});descMap.set(p.description,[...(descMap.get(p.description)||[]),p.url])}
    if(p.canonical&&p.canonical!==p.url)add({severity:'medium',category:'Indexability',title:'Canonical points to another URL',evidence:`${p.url} declares canonical ${p.canonical}.`,fix:'Confirm the alternate canonical is intentional and accessible; otherwise correct the canonical.',urls:[p.url,p.canonical]});
    if(!p.indexable)add({severity:'medium',category:'Indexability',title:'Page is not indexable',evidence:`Indexability is blocked by robots.txt or a noindex directive.`,fix:'If this page should appear in search, remove the blocking directive and confirm crawl access.',urls:[p.url]});
    if(p.imagesMissingAlt)add({severity:'low',category:'Accessibility',title:'Images missing alt text',evidence:`${p.imagesMissingAlt} of ${p.images} images have no non-empty alt attribute.`,fix:'Add meaningful alternative text to informative images; use empty alt for purely decorative images.',urls:[p.url]});
    if(p.wordCount<200)add({severity:'low',category:'Content',title:'Low visible word count',evidence:`Only ${p.wordCount} visible words were detected.`,fix:'Confirm the page satisfies its intent; add useful original content where important information is missing.',urls:[p.url]});
    if(!p.schemaValid)add({severity:'medium',category:'Structured data',title:'Invalid JSON-LD detected',evidence:`At least one JSON-LD block could not be parsed as JSON.`,fix:'Validate and correct the JSON-LD syntax.',urls:[p.url]});
    if(p.depth>=3)add({severity:'low',category:'Architecture',title:'Page is deep in the crawl',evidence:`${p.url} was discovered at crawl depth ${p.depth}.`,fix:'Add contextual internal links from important pages if the content deserves easier discovery.',urls:[p.url]});
    hashMap.set(p.contentHash,[...(hashMap.get(p.contentHash)||[]),p.url]);
  }
  for(const [v,urls] of titleMap)if(v&&urls.length>1)add({severity:'medium',category:'Content',title:'Duplicate title tags',evidence:`The same title appears on ${urls.length} pages: "${v}".`,fix:'Give each indexable page a distinct title reflecting its unique intent.',urls});
  for(const [v,urls] of descMap)if(v&&urls.length>1)add({severity:'low',category:'Content',title:'Duplicate meta descriptions',evidence:`The same meta description appears on ${urls.length} pages.`,fix:'Write unique descriptions where they help users distinguish pages.',urls});
  for(const [v,urls] of h1Map)if(v&&urls.length>1)add({severity:'low',category:'Content',title:'Duplicate H1 headings',evidence:`The same H1 appears on ${urls.length} pages: "${v}".`,fix:'Review whether the pages have distinct intent and headings.',urls});
  for(const [v,urls] of hashMap)if(v&&urls.length>1&&pages.find(p=>p.contentHash===v)?.wordCount>200)add({severity:'medium',category:'Content',title:'Potential duplicate content',evidence:`${urls.length} pages have identical normalized visible-text fingerprints.`,fix:'Confirm whether duplication is intentional; consolidate or differentiate substantially where appropriate.',urls});
  const crawledSet=new Set(pages.map(p=>p.url));const linkedFrom=new Map<string,number>();for(const p of pages)for(const l of p.internalLinks)linkedFrom.set(l,(linkedFrom.get(l)||0)+1);
  for(const p of pages)if(p.url!==normalize(start.toString())&&p.status===200&&!(linkedFrom.get(p.url)||0))add({severity:'medium',category:'Architecture',title:'Potential orphan page',evidence:`${p.url} has no incoming internal links among crawled pages.`,fix:'Add relevant contextual internal links if the page should be discoverable, or remove/consolidate it if it is obsolete.',urls:[p.url]});
  const stats={pagesCrawled:pages.length,indexablePages:pages.filter(p=>p.indexable).length,errors:pages.filter(p=>p.status>=400||p.status===0).length,missingTitles:pages.filter(p=>!p.title).length,missingH1:pages.filter(p=>!p.h1s.length).length,missingDescriptions:pages.filter(p=>!p.description).length,duplicateTitles:findings.filter(f=>f.title==='Duplicate title tags').length,duplicateDescriptions:findings.filter(f=>f.title==='Duplicate meta descriptions').length,duplicateH1s:findings.filter(f=>f.title==='Duplicate H1 headings').length,lowContent:pages.filter(p=>p.wordCount<200).length,notIndexable:pages.filter(p=>!p.indexable).length,brokenOrError:pages.filter(p=>p.status>=400||p.status===0).length,missingAlt:pages.reduce((n,p)=>n+p.imagesMissingAlt,0),schemaErrors:pages.filter(p=>!p.schemaValid).length,deepPages:pages.filter(p=>p.depth>=3).length};
  return {pages,sitemapFound,robotsFound,robots,sitemapUrls,findings,stats};
}
