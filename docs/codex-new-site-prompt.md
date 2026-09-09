# Codex New Site Prompt

Paste this into a fresh Codex conversation when you want Codex to build a new blog from this repo.

Replace the placeholder values before sending it.

```text
We are creating a new food blog from this repo.

Your job is to follow the repo plan from start to finish until the new website is ready for deployment and review.

First read:
- docs/new-blog-launch-plan.md
- docs/replicate-food-blog.md
- README.md

Then create `site-brief.json` with `scripts/create-site-brief.mjs`, review it, and use that file as the source of truth unless the user gives a better existing brief file.

Then execute the work, not just the plan.

Project inputs:
- Brand: [NEW BRAND NAME]
- Domain: [https://new-domain.com]
- Public locale: [ro_RO or en_US]
- Admin locale: en_US
- Writer name: [WRITER NAME]
- Writer email: [WRITER EMAIL]
- Site email: [SITE EMAIL]
- Project slug: [project-slug]
- Recipes slug: [recipes or retete]
- Guides slug: [guides or articole]
- About slug: [about-site slug]
- Author slug: [author-page slug]
- Privacy slug: [privacy slug]
- Cookies slug: [cookies slug]
- Advertising slug: [advertising slug]
- Editorial slug: [editorial slug]
- Terms slug: [terms slug]
- Disclaimer slug: [disclaimer slug]
- Asset basenames: [wordmark basename], [icon basename], [social cover basename]
- Monetization at launch: [generic / adsense / ezoic]

Rules:
- Keep WordPress admin in English.
- Public generated text must follow the public locale.
- Do not rename internal kepoli_ code handles unless there is a real need.
- Use the repo workflow and scripts instead of inventing a new path.
- Prefer the site brief plus the one-command bootstrap flow with scripts/start-new-blog.mjs unless there is a good reason not to.
- Continue until the site is structurally ready, validated, and the next manual step is clearly identified.
- If required information is missing, ask only the smallest necessary question.

Execution standard:
1. Create or update `site-brief.json`.
   Preferred path: use `scripts/create-site-brief.mjs`, not manual JSON editing.
   Example command:
   `node scripts/create-site-brief.mjs --brand "[NEW BRAND NAME]" --domain [https://new-domain.com] --writer-name "[WRITER NAME]" --writer-email [WRITER EMAIL] --site-email [SITE EMAIL] --language [en or ro] --write`
2. Run `scripts/validate-site-brief.mjs --brief site-brief.json`.
3. Run the new blog bootstrap workflow for this brand.
4. Review and adjust content/site-profile.json, content/pages.json, and content/categories.json.
5. Check env and deployment defaults, including optional Ezoic ads.txt values if monetization is Ezoic.
6. Replace or flag public identity assets that still need manual replacement.
7. Run `scripts/audit-engine-readiness.mjs` if shared workflow files were changed.
8. Run `scripts/validate-new-blog.mjs` or the equivalent manual validation sequence.
9. Summarize what is complete, what still needs manual input, and the exact next step.

Definition of done for this conversation:
- `site-brief.json` is filled or updated.
- The site brief passes validation.
- The new site profile is set.
- The starter shell is generated for the new locale.
- Old launch content has been reset or replaced as appropriate.
- The validation scripts have been run.
- Any blockers are concrete and listed clearly.
- The deployment path is clear.

Allowed stop states:
- Launch-ready: the new site is ready for deployment review.
- Blocked-with-specific-input: a concrete missing input prevents completion, such as missing assets, missing original content, or missing brand values.

Not allowed:
- stopping after only writing a plan
- stopping after only editing docs
- stopping without running the repo workflow and validation steps
```

## Short Version

Use this shorter version if you already know the repo well:

```text
Build a new food blog from this repo for:
- Brand: [BRAND]
- Domain: [DOMAIN]
- Locale: [ro_RO or en_US]
- Writer: [NAME]
- Writer email: [EMAIL]
- Site email: [EMAIL]
- Project slug: [SLUG]
- Monetization: [generic / adsense / ezoic]

Follow docs/new-blog-launch-plan.md from start to finish.
Create `site-brief.json` with scripts/create-site-brief.mjs, then use scripts/start-new-blog.mjs and scripts/validate-new-blog.mjs unless you hit a real blocker.
Keep admin in English, keep public content in the public locale, and continue until the site is ready for deployment review.
```
