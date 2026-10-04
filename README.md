# SiteLens Phase 4.2 — Core Engine Consolidation & Crawl Hardening

Built on the validated Phase 3 SEO intelligence engine.

## Phase 4 improvements
- Press Enter to run an audit from the homepage
- Initial audit has a bounded 30-second client timeout
- Server audit has a 15-second website-response timeout
- Live audit phase/progress UI with expected 5–15 second target
- No more indefinite "LIVE AUDIT" screen
- Clear retry state on timeout/failure
- Clickable SiteLens/site name returns to home
- New audit button from reports
- Save Report downloads an evidence JSON report
- Audit automatically records history in the browser
- Historical audit table per site
- Basic score/issue trend comparison against the previous saved audit
- Full crawl shows elapsed time and an explicit 30–120 second target
- Crawl endpoint has a 120-second maximum duration

## Historical storage note
Phase 4 uses browser localStorage so the MVP works on Vercel without a database. History is tied to the browser/device and is not yet shared across users or devices. A later production phase should move history to a persistent database (for example Supabase/Postgres) with accounts and site/project records.

## Vercel
- Framework: Next.js
- Build Command: `npm run build`
- Output Directory: blank / no override
- `vercel.json` declares Next.js
- `tsconfig.json` does not use deprecated `baseUrl`
