import * as cheerio from 'cheerio';

export type AuditIssue = {
  severity: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  message: string;
  evidence: string;
  fix: string;
  urls: string[];
};

export type AuditResult = {
  url: string;
  status: number;
  title: string;
  description: string;
  h1s: string[];
  wordCount: number;
  images: number;
  imagesMissingAlt: number;
  schemas: string[];
  internalLinks: number;
  externalLinks: number;
  score: number;
  issues: AuditIssue[];
};

export async function auditUrl(input: string): Promise<AuditResult> {
  const url = new URL(input);
  const response = await fetch(url.toString(), {
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
    headers: { 'user-agent': 'SiteLensBot/0.4' }
  });
  if (!response.ok) throw new Error(`Website returned HTTP ${response.status}`);

  const html = await response.text();
  const $ = cheerio.load(html);
  const finalUrl = response.url || url.toString();
  const title = $('title').first().text().trim();
  const description = $('meta[name="description"]').attr('content')?.trim() || '';
  const h1s = $('h1').map((_, e) => $(e).text().trim()).get().filter(Boolean);
  const body = $('body').text().replace(/\s+/g, ' ').trim();
  const wordCount = body ? body.split(/\s+/).length : 0;

  let imagesMissingAlt = 0;
  $('img').each((_, e) => { if (!($(e).attr('alt') || '').trim()) imagesMissingAlt++; });

  const schemas: string[] = [];
  $('script[type="application/ld+json"]').each((_, e) => {
    try {
      const parsed = JSON.parse($(e).text());
      for (const item of (Array.isArray(parsed) ? parsed : [parsed])) {
        if (item?.['@type']) {
          const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
          for (const type of types) if (typeof type === 'string') schemas.push(type);
        }
      }
    } catch {}
  });

  let internalLinks = 0, externalLinks = 0;
  $('a[href]').each((_, e) => {
    try {
      const link = new URL($(e).attr('href') || '', finalUrl);
      if (link.origin === url.origin) internalLinks++; else externalLinks++;
    } catch {}
  });

  const issues: AuditIssue[] = [];
  if (!title) issues.push({
    severity:'high', category:'On-page', title:'Missing title tag', message:'Missing title tag',
    evidence:`No title detected on ${finalUrl}.`, fix:'Add a unique descriptive title.', urls:[finalUrl]
  });
  if (!h1s.length) issues.push({
    severity:'medium', category:'On-page', title:'Missing H1', message:'Missing H1',
    evidence:`No H1 detected on ${finalUrl}.`, fix:'Add one clear primary heading.', urls:[finalUrl]
  });
  if (!description) issues.push({
    severity:'medium', category:'On-page', title:'Missing meta description', message:'Missing meta description',
    evidence:`No meta description detected on ${finalUrl}.`, fix:'Add a useful page summary.', urls:[finalUrl]
  });
  if (imagesMissingAlt) issues.push({
    severity:'low', category:'Accessibility', title:'Images missing alt text',
    message:`${imagesMissingAlt} images are missing alt text`,
    evidence:`${imagesMissingAlt} images lack alt text on ${finalUrl}.`,
    fix:'Add meaningful alt text to informative images.', urls:[finalUrl]
  });
  if (!schemas.length) issues.push({
    severity:'low', category:'Structured data', title:'No JSON-LD schema detected',
    message:'No JSON-LD schema detected', evidence:`No JSON-LD schema detected on ${finalUrl}.`,
    fix:'Assess whether appropriate structured data should be added.', urls:[finalUrl]
  });

  const penalty = issues.reduce((n, x) =>
    n + (x.severity === 'high' ? 20 : x.severity === 'medium' ? 10 : 5), 0);

  return {
    url: finalUrl, status: response.status, title, description, h1s, wordCount,
    images: $('img').length, imagesMissingAlt, schemas: [...new Set(schemas)],
    internalLinks, externalLinks, score: Math.max(0, 100 - penalty), issues
  };
}
