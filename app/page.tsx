'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';

type HistoryItem={url:string;hostname:string;score:number;issues:number;timestamp:string;title:string;pages?:number;high?:number;medium?:number;low?:number};
const KEY='sitelens:audit-history:v1';
function loadHistory():HistoryItem[]{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}}
export default function Home(){
 const [url,setUrl]=useState('');const [history,setHistory]=useState<HistoryItem[]>([]);const router=useRouter();
 useEffect(()=>setHistory(loadHistory()),[]);
 function go(){try{const u=new URL(url.includes('://')?url:`https://${url}`);router.push('/dashboard?url='+encodeURIComponent(u.toString()))}catch{alert('Enter a valid website URL.')}}
 function open(h:string){router.push('/dashboard?url='+encodeURIComponent(`https://${h}`))}
 return <main className="min-h-screen grid-bg"><div className="max-w-6xl mx-auto px-6 py-12">
  <div className="flex items-center justify-between"><button onClick={()=>router.push('/')} className="font-black text-xl">Site<span className="accent">Lens</span></button><span className="pill">SEO · AEO · Social · Entity</span></div>
  <section className="max-w-3xl py-20"><div className="accent text-xs font-bold tracking-[.25em]">DIGITAL PRESENCE INTELLIGENCE</div><h1 className="text-5xl sm:text-7xl font-black tracking-tight mt-4">See what search engines, AI and customers see.</h1><p className="muted text-lg mt-6 max-w-2xl">Audit your website, content, entity signals and social presence from one evidence-based dashboard. Find issues. Validate them. Generate fixes.</p>
   <form onSubmit={e=>{e.preventDefault();go()}} className="card p-3 mt-10 flex flex-col sm:flex-row gap-3"><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://yourwebsite.com" className="bg-transparent outline-none px-4 py-3 flex-1 min-w-0" aria-label="Website URL"/><button type="submit" className="btn btn-primary">Run audit →</button></form>
   <div className="flex flex-wrap gap-2 mt-5"><span className="pill">Technical SEO</span><span className="pill">AEO / GEO</span><span className="pill">Entity consistency</span><span className="pill">Social readiness</span><span className="pill">Conversion UX</span></div>
  </section>
  {history.length>0&&<section className="pb-16"><div className="flex items-center justify-between mb-4"><div><h2 className="text-xl font-bold">Recent audits</h2><p className="muted text-sm mt-1">Saved in this browser. Use the same site to compare progress over time.</p></div><button className="btn btn-secondary" onClick={()=>{localStorage.removeItem(KEY);setHistory([])}}>Clear history</button></div><div className="grid md:grid-cols-2 gap-3">{history.slice(0,8).map((h,i)=><button key={i} onClick={()=>open(h.hostname)} className="card p-4 text-left hover:border-[#5a5154] transition"><div className="flex items-center justify-between gap-3"><strong>{h.hostname}</strong><span className="pill">SEO {h.score}</span></div><div className="muted text-xs mt-2">{new Date(h.timestamp).toLocaleString()} · {h.issues} page issues</div></button>)}</div></section>}
 </div></main>
}
