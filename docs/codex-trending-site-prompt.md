# Codex Trending Site Prompt

Paste this into a fresh Codex conversation when creating a new trending/Facebook-first monetization site from this engine.

Replace the placeholder values before sending.

```text
We are creating a new trending/lifestyle blog from this repo.

This is not the normal food-blog clone. The goal is a Facebook-first site for useful viral articles and instant ad-network monetization. Keep AdSense-first sites separate from this experiment, and keep any existing monetization test site separate too.

Your job is to follow the repo workflow from start to finish until the new trending site is structurally ready for deployment and first content testing.

First read:
- docs/new-blog-launch-plan.md
- docs/replicate-food-blog.md
- docs/trending-site-launch-plan.md
- README.md

Project inputs:
- Brand: [NEW BRAND NAME]
- Domain: [https://new-domain.com]
- Public locale: [en_US / ro_RO / other]
- Admin locale: en_US
- Writer name: [WRITER NAME]
- Writer email: [WRITER EMAIL]
- Site email: [SITE EMAIL]
- Project slug: [project-slug]
- Primary public topic: useful trending lifestyle articles for adults over 40
- Category direction: food tips, home hacks, money savers, health habits, family life, nostalgia, smart shopping, simple explainers
- Monetization at launch: instant networks, AdSense disabled

Rules:
- Keep WordPress admin in English.
- Public generated text must follow the public locale.
- Do not rename internal kepoli_ code handles unless there is a real need.
- Use the repo workflow and scripts instead of inventing a new path.
- Build a real branded publication, not a fake-news or scammy arbitrage site.
- Do not add adult/scam/fake-button monetization patterns.
- Keep AdSense disabled.
- Use the environment-gated ad model for instant networks.
- Continue until the site is structurally ready, validated, and the next manual step is clearly identified.

Execution standard:
1. Create or update `site-brief.json` with `scripts/create-site-brief.mjs`.
2. Run `scripts/validate-site-brief.mjs --brief site-brief.json`.
3. Run `scripts/start-new-blog.mjs --brief site-brief.json --write`.
4. Replace the default food categories with trending/lifestyle categories.
5. Rewrite `content/pages.json` so Home, About, Author, Contact, Privacy, Cookies, Advertising, Editorial, Terms, and Disclaimer match a real trending/lifestyle brand.
6. Prepare or clearly flag the need for at least 20 launch posts.
7. Configure env defaults for instant networks with AdSense disabled.
8. Add or confirm Histats readiness.
9. Run the validation/preflight checks available in the repo.
10. Summarize what is complete, what still needs manual input, and the exact next step.

Definition of done:
- `site-brief.json` is filled or updated.
- The site profile is unique.
- The category/content model is trending/lifestyle, not copied from an existing food site.
- Public pages are authentic.
- AdSense is disabled.
- Instant-network ad path is documented or configured.
- Validation checks have been run.
- Missing launch content or assets are listed clearly if not yet available.
```

## Short Version

```text
Build a new Facebook-first trending/lifestyle blog from this repo.

Brand: [BRAND]
Domain: [DOMAIN]
Locale: [LOCALE]
Writer: [NAME]
Site email: [EMAIL]
Project slug: [SLUG]

Read and follow docs/trending-site-launch-plan.md plus the normal duplicate workflow. Keep admin English, keep AdSense disabled, use environment-gated instant-network monetization, create authentic page copy and trending/lifestyle categories, run validation, and continue until the new site is ready for deployment review or clearly blocked by missing assets/content.
```
