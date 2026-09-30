# SiteLens Phase 3 — SEO Intelligence

Built on the validated Phase 2 crawler.

## Phase 3 features
- Multi-page same-origin crawl
- robots.txt and sitemap discovery
- HTTP status / crawl errors
- indexability from robots + meta robots
- canonical normalization and cross-page canonical flags
- duplicate title detection
- duplicate meta description detection
- duplicate H1 detection
- identical visible-content fingerprint detection
- potential orphan page detection
- crawl depth flags
- low-content flags
- title/meta length review
- missing H1/title/description
- image alt-text gaps
- JSON-LD parse validation
- evidence-backed prioritized findings
- crawl health statistics

## Vercel
- Framework: Next.js
- Build command: `npm run build`
- Output Directory: leave blank / no override
- `vercel.json` declares Next.js
- `tsconfig.json` does NOT use deprecated `baseUrl`

## Important
This phase intentionally does not fabricate AEO, AI visibility, or social scores. Those will be separate measurement engines built on top of this crawl data.
