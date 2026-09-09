# Project Status

This is the short handoff note for Kepoli. For the full continuation guide, read `docs/future-session-handoff.md`.

## Current Role

Kepoli is the **English food & everyday-wellness blog**, kept AdSense-clean while AdSense approval + consent setup are pending. (It pivoted from a Romanian recipe site in 2026 — anything here still saying "Romanian" is stale.)

This repo should not be mixed with Dr Purg Jr., viral-health, KuchniaTwist, or other Facebook/ad-network experiments.

## Safe Defaults

```env
ADSENSE_ENABLE=0
GA_ENABLE=0
HISTATS_ENABLE=0
HISTATS_EXCLUDE_ADMINS=1
KEPOLI_AUTOSEED_ENABLE=1
KEPOLI_FORCE_RESEED=0
AI_EXTRACTION_ENABLE=0
```

**Histats was removed (2026-09-03)** — its snippet runtime-injected third-party data brokers (DTScout / Lotame / OnAudience / Market Metrics), a privacy + AdSense liability; `kepoli-analytics.php` now hard-disables it regardless of `HISTATS_ENABLE`. Analytics is GA4 via Google Site Kit. Do not add Monetag, Adsterra, popups, forced redirects, push ads, or aggressive instant ad formats to Kepoli before AdSense approval unless the owner explicitly changes the project strategy.

## Content Workflow

- Admin and public content are **English**.
- Content is human-voiced and honest; YMYL remedy content carries a top disclaimer and is noindexed during AdSense review.
- Publish enriched batches via **📦 Direct Publish**, or write in WordPress (choose **Recipe** or **Article**, then auto-fill).
- Review all generated fields before publish.
- Use `Pregateste pentru publicare` near the Publish box for the final setup pass.
- For long posts, use `Impartire automata` or `2 parti` / `3 parti` only when it helps readability.
- Smart split is intentionally conservative: `650+` words for 2 parts and `1300+` words for 3 parts.

The detailed extraction pipeline is documented in `docs/content-machine-extraction-map.md`.

## Deployment Rules

- Coolify uses `docker-compose.yml` only.
- Normal redeploys must not reseed content.
- Keep `KEPOLI_FORCE_RESEED=0` unless intentionally repairing seed data.
- If a repair needs reseed, set `KEPOLI_FORCE_RESEED=1` temporarily, run the repair, then immediately set it back to `0`.
- Keep `KEPOLI_DEPLOY_FINGERPRINT=0` except during a temporary live deploy check.

## Checks Before Push

```powershell
node scripts\verify-content.mjs
node scripts\audit-adsense-readiness.mjs
node scripts\audit-engine-readiness.mjs
git diff --check
```

Useful optional checks:

```powershell
node scripts\audit-histats-readiness.mjs
node scripts\image-status.mjs
```

If a live deploy needs verification, temporarily set `KEPOLI_DEPLOY_FINGERPRINT=1`, redeploy, run `node scripts\check-live-deploy.mjs https://kepoli.com`, then turn the fingerprint off.

## Key Docs

- `docs/future-session-handoff.md`: complete continuation guide for future Codex sessions.
- `docs/content-machine-extraction-map.md`: source-to-WordPress extraction map.
- `docs/author-workflow.md`: posting, auto-fill, and auto-split workflow.
- `docs/adsense-readiness.md`: AdSense-safe checks and policy guardrails.
- `docs/histats-readiness.md`: optional hidden live counter setup.
- `docs/coolify.md`: production deployment checklist.
- `docs/ai-content-growth-strategy.md`: future AI, content, Facebook, SEO, and monetization direction.
- `docs/new-blog-launch-plan.md`: repeatable new-site workflow.
- `docs/replicate-food-blog.md`: clone/rebrand process.
