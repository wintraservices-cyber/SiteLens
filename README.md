# SiteLens MVP

Evidence-based SEO/AEO/Social intelligence platform starter for GitHub + Vercel.

## Run locally

1. `npm install`
2. `npm run dev`
3. Open `http://localhost:3000`
4. Enter a public website URL.

The MVP currently performs a server-side first-page audit using deterministic checks: title, meta description, H1s, canonical, robots meta, visible word count, links, image alt coverage, viewport, HTTPS and JSON-LD schema.

## Architecture

- Next.js App Router + TypeScript
- Vercel-friendly server route at `/api/audit`
- Deterministic audit engine in `lib/audit.ts`
- Dashboard at `/dashboard`
- AI/AEO and social connectors intentionally separated for later phases

## Next phases

1. Crawl queue + sitemap/robots discovery + multi-page crawl
2. Lighthouse/PageSpeed and Core Web Vitals
3. Schema validation and entity graph
4. AEO question generation + evidence-backed answerability scoring
5. Social OAuth adapters (Meta, LinkedIn, YouTube, TikTok where supported)
6. Competitor/visibility tracking
7. Database/auth/billing
8. GitHub/Vercel deployment + scheduled audits

## Validation principle

Every deterministic finding must include evidence from the crawled HTML or a measured external test. AI recommendations should be labeled as recommendations/inferences and never masquerade as measured facts.
