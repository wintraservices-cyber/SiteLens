# SiteLens Phase 2

Evidence-based SEO crawler built with Next.js + TypeScript for GitHub/Vercel.

## Deploy

1. Push this project to GitHub.
2. Import the repository into Vercel.
3. Framework Preset: **Next.js**
4. Build Command: `npm run build`
5. **Output Directory: leave blank / do not override**
6. Install Command: `npm install`

`vercel.json` explicitly declares the Next.js framework.

## Phase 2 features

- Single-page technical SEO audit
- Multi-page same-origin crawl
- Up to 30 pages from the dashboard (API supports up to 50)
- Crawl depth tracking
- robots.txt discovery
- sitemap.xml discovery
- sitemap URL discovery
- HTTP status capture
- titles
- H1s
- meta descriptions
- canonicals
- visible word counts
- internal/external links
- image alt gaps
- JSON-LD schema types
- evidence-backed page findings

## Important validation note

The crawler is deterministic. AI/AEO recommendations are intentionally not presented as measured facts yet. The next phase will build on this crawl data for duplicate detection, indexability, internal-link analysis, content gaps, entity analysis, and AEO/GEO question coverage.

## Local development

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Environment variables

No API key is required for the current deterministic audit/crawler.
