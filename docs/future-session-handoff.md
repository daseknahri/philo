# Future Session Handoff

Use this when a future Codex session opens the Kepoli repo and needs to continue without mixing it with another site.

## Repo Identity

- Repo: `kepoli`
- Remote: check `git remote -v`
- Main domain: `https://kepoli.com`
- Public language: Romanian
- Admin language: English
- Strategy: AdSense-clean Romanian food site

This is not another sibling site. Keep social automation, Monetag, Adsterra, popunder, and Facebook-first work out of this repo unless the owner explicitly redirects the project strategy.

## Current Stack

- WordPress plus MariaDB through Docker Compose.
- Custom theme: `wp-content/themes/kepoli/`.
- Author plugin: `wp-content/plugins/kepoli-author-tools/`.
- MU plugins:
  - `kepoli-autoseed.php`: first-launch seed protection.
  - `kepoli-adtech.php`: canonical redirects, `ads.txt`, `security.txt`.
  - `kepoli-newsletter.php`: native newsletter signups.
- Seed system:
  - `seed/bootstrap.php`
  - `seed/version.php`
  - `content/posts.json`
  - `content/pages.json`
  - `content/categories.json`
  - `content/image-plan.json`

## Operating Defaults

Use these as the safe starting point:

```env
ADSENSE_ENABLE=0
GA_ENABLE=0
HISTATS_ENABLE=0
HISTATS_EXCLUDE_ADMINS=1
KEPOLI_AUTOSEED_ENABLE=1
KEPOLI_FORCE_RESEED=0
AI_EXTRACTION_ENABLE=0
```

Production may set `HISTATS_ENABLE=1` only after `HISTATS_CODE_BASE64` contains a real hidden counter snippet.

Keep `ADSENSE_CLIENT_ID` and `ADSENSE_PUB_ID` ready, but keep ad rendering off until the consent layer is live and tested.

## Editorial Workflow

1. Generate or write a clean Romanian draft outside WordPress.
2. Paste only title and plain content into `Posts` > `Add New`.
3. Choose `Reteta` or `Articol`.
4. Run `Completeaza automat`.
5. Review SEO fields, excerpt, category, tags, related links, image metadata, and recipe data.
6. For long posts, use `Impartire automata` or the `2 parti` / `3 parti` toolbar buttons only when it improves readability.
7. Use `Pregateste pentru publicare`.
8. Review, then publish.

The content extraction map is documented in `docs/content-machine-extraction-map.md`.

## Deployment Rules

- Coolify should use only `docker-compose.yml`.
- Do not use `docker-compose.local.yml` in Coolify.
- Domain should point to service `wordpress`, port `80`.
- Keep `KEPOLI_FORCE_RESEED=0` on normal deploys.
- Do not run the `seed` profile as a normal update mechanism after real content exists.
- If a manual repair requires reseeding, set `KEPOLI_FORCE_RESEED=1` temporarily, run the repair, then immediately set it back to `0`.

## AI Status

AI is optional and limited.

Implemented:

- Deterministic extraction in the author plugin.
- Optional OpenRouter recipe schema repair.
- AI repair only runs when `AI_EXTRACTION_ENABLE=1` and an API key exists.

Not implemented by design:

- Full-content AI generation inside WordPress.
- Blind auto-publish.
- Automatic rewriting of existing posts.
- Automatic social posting.

Future AI work should start as reviewed suggestions, not automatic actions.

## Ads And Analytics Status

Kepoli is AdSense-first.

Current rules:

- AdSense placements exist but are inactive until env enables them.
- `ads.txt` can emit the AdSense publisher record when configured.
- GA is disabled until consent is ready.
- Histats can be enabled as a hidden counter, controlled by env.
- Do not add instant ad networks before AdSense approval unless the owner changes strategy.

Docs:

- `docs/adsense-readiness.md`
- `docs/histats-readiness.md`

## Validation Commands

Run these before committing:

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

Live deploy check, only when fingerprint is temporarily enabled:

```powershell
node scripts\check-live-deploy.mjs https://kepoli.com
```

## Docs Index

- `README.md`: main setup and overview.
- `docs/project-status.md`: short current status and rules.
- `docs/content-machine-extraction-map.md`: how drafts become structured WordPress posts.
- `docs/author-workflow.md`: writer-facing WordPress workflow.
- `docs/adsense-readiness.md`: AdSense-safe launch checks.
- `docs/histats-readiness.md`: optional live traffic counter setup.
- `docs/coolify.md`: deployment checklist.
- `docs/image-generation.md`: launch image workflow.
- `docs/new-blog-launch-plan.md`: repeatable sibling-site launch workflow.
- `docs/replicate-food-blog.md`: clone and rebrand workflow.
- `docs/ai-content-growth-strategy.md`: longer-term AI and growth roadmap.

## Known Safe Next Work

- Improve the `AI Analyze` roadmap into a small reviewed-suggestions UI.
- Add a performance log template.
- Add stronger image QA around `content/image-plan.json`.
- Add an editorial calendar doc for Kepoli-only Romanian topics.
- Improve clone docs only when the shared engine changes.

## Do Not Do By Accident

- Do not push Dr Purg Jr. or viral-health changes here.
- Do not add Monetag, Adsterra, popunders, or push ads to Kepoli during AdSense review.
- Do not set `KEPOLI_FORCE_RESEED=1` permanently.
- Do not change public language away from Romanian.
- Do not replace manual review with AI auto-publishing.
