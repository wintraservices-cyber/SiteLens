import * as cheerio from 'cheerio';
import { validatePublicUrl } from './url-security';

export type AuditResult = {
  url: string;
  title: string;
  description: string;
  h1s: string[];
  canonical: string | null;
  robots: string | null;
  wordCount: number;
  images: number;
  imagesMissingAlt: number;
  internalLinks: number;
  externalLinks: number;
  schemas: string[];
  hasViewport: boolean;
  https: boolean;
  score: number;
  issues: {
    severity: 'high' | 'medium' | 'low';
    title: string;
    evidence: string;
    fix: string;
  }[];
};

function abs(base: string, href: string) {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

export async function auditUrl(
  input: string,
  timeoutMs = 15000
): Promise<AuditResult> {
  const u = await validatePublicUrl(input);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;

  try {
    res = await fetch(u.toString(), {
      redirect: 'follow',
      headers: {
        'user-agent': 'SiteLensBot/0.1 (+audit)',
      },
      signal: controller.signal,
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      throw new Error(
        `Audit timed out after ${Math.round(
          timeoutMs / 1000
        )} seconds. The site may be slow, blocking automated requests, or temporarily unavailable.`
      );
    }

    throw e;
  } finally {
    clearTimeout(timer);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const title = $('title').first().text().trim();
  const description =
    $('meta[name="description"]').attr('content')?.trim() || '';

  const h1s = $('h1')
    .map((_, e) => $(e).text().trim())
    .get()
    .filter(Boolean);

  const canonical =
    $('link[rel="canonical"]').attr('href') || null;

  const robots =
    $('meta[name="robots"]').attr('content') || null;

  const bodyText = $('body')
    .text()
    .replace(/\s+/g, ' ')
    .trim();

  const wordCount = bodyText
    ? bodyText.split(' ').length
    : 0;

  let internalLinks = 0;
  let externalLinks = 0;
  const origin = u.origin;

  $('a[href]').each((_, e) => {
    const x = abs(
      u.toString(),
      $(e).attr('href') || ''
    );

    if (!x) return;

    try {
      new URL(x).origin === origin
        ? internalLinks++
        : externalLinks++;
    } catch {}
  });

  const images = $('img').length;

  const imagesMissingAlt = $('img').filter(
    (_, e) => !($(e).attr('alt') || '').trim()
  ).length;

  const schemas: string[] = [];

  $('script[type="application/ld+json"]').each((_, e) => {
    try {
      const raw = $(e).text();
      const json = JSON.parse(raw);
      const arr = Array.isArray(json) ? json : [json];

      arr.forEach((x: any) => {
        if (x?.['@type']) {
          schemas.push(
            ...(Array.isArray(x['@type'])
              ? x['@type']
              : [x['@type']])
          );
        }
      });
    } catch {}
  });

  const hasViewport = !!$('meta[name="viewport"]').length;

  const issues: AuditResult['issues'] = [];

  if (!title) {
    issues.push({
      severity: 'high',
      title: 'Missing title tag',
      evidence: 'No <title> element was detected.',
      fix: 'Add a unique, descriptive title aligned with the page intent.',
    });
  } else if (title.length < 30 || title.length > 65) {
    issues.push({
      severity: 'medium',
      title: 'Title length needs review',
      evidence: `Detected title is ${title.length} characters.`,
      fix: 'Rewrite it for clarity and search intent; avoid arbitrary keyword stuffing.',
    });
  }

  if (!description) {
    issues.push({
      severity: 'medium',
      title: 'Missing meta description',
      evidence: 'No meta description was detected.',
      fix: 'Add a concise description that explains the page value.',
    });
  }

  if (h1s.length === 0) {
    issues.push({
      severity: 'high',
      title: 'Missing H1',
      evidence: 'No H1 heading was detected.',
      fix: 'Add one clear primary heading that states the page topic.',
    });
  }

  if (h1s.length > 1) {
    issues.push({
      severity: 'low',
      title: 'Multiple H1 headings',
      evidence: `Detected ${h1s.length} H1 headings.`,
      fix: 'Confirm the heading hierarchy reflects the actual page structure.',
    });
  }

  if (!canonical) {
    issues.push({
      severity: 'medium',
      title: 'Canonical not detected',
      evidence: 'No rel=canonical link was detected.',
      fix: 'Add a canonical URL where duplicate/variant URLs are possible.',
    });
  }

  if (imagesMissingAlt > 0) {
    issues.push({
      severity: 'medium',
      title: 'Images missing alt text',
      evidence: `${imagesMissingAlt} of ${images} images have no non-empty alt attribute.`,
      fix: 'Add meaningful alt text to informative images; use empty alt for decorative images.',
    });
  }

  if (!hasViewport) {
    issues.push({
      severity: 'high',
      title: 'Viewport meta missing',
      evidence: 'No mobile viewport meta tag was detected.',
      fix: 'Add a responsive viewport declaration.',
    });
  }

  if (wordCount < 300) {
    issues.push({
      severity: 'medium',
      title: 'Low visible text volume',
      evidence: `Approximately ${wordCount} visible words were detected on the page.`,
      fix: 'Confirm the page satisfies its search intent with useful, original content.',
    });
  }

  if (schemas.length === 0) {
    issues.push({
      severity: 'medium',
      title: 'No JSON-LD structured data detected',
      evidence: 'No application/ld+json block was detected.',
      fix: 'Add schema that accurately represents the visible entity/page content.',
    });
  }

  let score =
    100 -
    issues.reduce(
      (s, i) =>
        s +
        (i.severity === 'high'
          ? 12
          : i.severity === 'medium'
            ? 7
            : 3),
      0
    );

  score = Math.max(0, Math.min(100, score));

  return {
    url: u.toString(),
    title,
    description,
    h1s,
    canonical,
    robots,
    wordCount,
    images,
    imagesMissingAlt,
    internalLinks,
    externalLinks,
    schemas,
    hasViewport,
    https: u.protocol === 'https:',
    score,
    issues,
  };
}
