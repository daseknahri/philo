# AdSense Readiness Notes

This project prepares the site for AdSense review, but Google makes the final approval decision.

Implemented readiness items:

- Public pages for privacy, cookies, terms, culinary disclaimer, contact, author, and about.
- Public editorial policy page that explains originality, corrections, and advertising separation.
- Thirty published Romanian food posts at launch.
- Clear category navigation and internal links.
- Ad placeholders that preserve layout before ad units exist.
- Live ad rendering gated by environment variables, including an explicit `ADSENSE_ENABLE` switch.
- Optional Analytics rendering gated by an explicit `GA_ENABLE` switch so it can wait for consent setup.
- Apache compression and long-lived cache headers for static theme assets in the production container.
- Priority preload hints for homepage and article LCP images.
- Search-result and 404 utility pages use `noindex,follow`, while editorial pages remain indexable.
- Recipe, article, collection, organization, author, and breadcrumb structured data are emitted with canonical URLs, language, publisher identity, image objects, and image dimensions where available.
- `ads.txt` generated only after `ADSENSE_PUB_ID` is configured.
- `/.well-known/security.txt` served with contact and canonical metadata for a basic public trust/contact endpoint.
- Google Site Kit installed for later account connection.
- A small native newsletter form appears on the front page and About Kepoli page, with an explicit GDPR consent checkbox and signups stored directly in WordPress admin.
- Dedicated public page for `Publicitate si consimtamant`.
- Repo checks for risky claim language, key trust-policy pages, and seeded recipe pages under the 400-word original-content floor.

Recommended audit commands before submission:

```bash
node scripts/verify-content.mjs
node scripts/audit-adsense-readiness.mjs
```

Before applying:

- Replace any temporary media with final brand/author images if desired.
- Review generated recipes for correctness and originality; every recipe page should stay above 400 words of useful original text.
- Connect Site Kit to the Google account that owns AdSense/Search Console/Analytics.
- Configure Google Privacy & Messaging or a Google-certified CMP for Romania, EEA, UK, and Switzerland visitors before showing personalized ads.
- Keep `ADSENSE_ENABLE=0` and `GA_ENABLE=0` until the consent flow is live, includes a link to Google's Business Data Responsibility site, and has been tested on the live domain.
- Review the live site after each redeploy to confirm `Politica editoriala`, `Publicitate si consimtamant`, `Politica de confidentialitate`, and `Disclaimer culinar` are all public and linked in the footer.

Search Console domain variants:

- Use the production host `https://kepoli.com/` unless the extra hosts are intentionally configured.
- If Search Console lists `www.kepoli.com`, `api.kepoli.com`, or `recipe.kepoli.com` with `robots.txt` not fetched, fix that in DNS/Coolify by either removing those properties from Search Console or routing those hosts to the WordPress service.
- When those hosts reach WordPress, the Kepoli MU plugin redirects them to the canonical `SITE_URL`; keep `CANONICAL_REDIRECT_HOSTS` aligned with any extra Search Console hostnames.
- The WordPress app can serve robots.txt only for hostnames that reach the `wordpress` service.
