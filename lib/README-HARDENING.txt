SiteLens Phase 4.1 hardening
================================

Drop-in files for the current main branch:

lib/url-security.ts
lib/audit.ts
lib/crawl.ts

Changes:
- Adds public URL / SSRF validation.
- Rejects localhost, private/link-local IPs, and unsupported schemes.
- Applies URL normalization to crawl URLs.
- Removes common tracking parameters.
- Normalizes hostname/default ports/fragments/trailing slash.
- Validates sitemap targets.
- Re-validates crawl targets before fetch.
- Rejects redirects outside the crawl origin.

After copying these files into the repository:

1. npm run build
2. git add lib/url-security.ts lib/audit.ts lib/crawl.ts
3. git commit -m "Harden crawler URL validation and normalization"
4. git push

Important:
- This package intentionally does not change your scoring model.
- It intentionally does not add a test framework.
- Run the build before pushing if possible.
