# New Blog Launch Plan

Use this checklist every time you want to start a new food blog from this repo.

This is the short operational plan. For deeper detail, see `docs/replicate-food-blog.md`.

If the new site is a Facebook-first trending/lifestyle monetization site instead of a food blog, follow `docs/trending-site-launch-plan.md` and use `docs/codex-trending-site-prompt.md`.

If you want to start a fresh Codex conversation for a new site, use `docs/codex-new-site-prompt.md`.

## 1. Decide The New Site Profile

Before touching code, decide:

- Brand name
- Domain
- Public language and locale such as `ro_RO` or `en_US`
- Writer name and writer email
- Site contact email
- Recipe slug
- Guides slug
- About slug
- Author slug
- Privacy, cookies, advertising, editorial, terms, and disclaimer slugs
- Public asset basenames for `wordmark`, `icon`, and `social_cover`
- Monetization path at launch: `generic`, `adsense`, or `ezoic`

Rules:

- Keep admin in English every time.
- Let public text follow the site locale every time.
- Do not rename internal `kepoli_` handles unless there is a strong reason.

Most robust path:

- Generate `site-brief.json` with `scripts/create-site-brief.mjs`
- Review the generated values once
- Run `node scripts/validate-site-brief.mjs --brief site-brief.json`
- Use `site-brief.json` as the source of truth for the setup and validation commands

Recommended command:

```powershell
node scripts/create-site-brief.mjs --brand "New Blog" --domain https://new-domain.com --writer-name "Writer Name" --writer-email writer@example.com --site-email contact@new-domain.com --language en --write
```

## 2. Create The New Repo

- Create a fresh repo from this project.
- Do not copy `env.tmp`.
- Keep the shared engine, but treat all public content and assets as replaceable.

## 3. Run The Mechanical Clone Setup

Preferred path: run the whole setup in one command:

```powershell
node scripts/start-new-blog.mjs --brief site-brief.json --write
```

That wrapper validates the brief automatically before it starts changing files.

Manual path: if you want to run the steps one by one, use the three commands below.

First apply the new identity:

```powershell
node scripts/prepare-replica.mjs --brand "New Blog" --domain https://new-domain.com --site-email contact@new-domain.com --writer-name "Writer Name" --writer-email writer@example.com --project-slug new-blog --language en --recipes-slug recipes --guides-slug guides --write
```

Then remove the old launch content:

```powershell
node scripts/reset-replica-content.mjs --write --delete-images
```

Then generate a fresh shell for the new site:

```powershell
node scripts/generate-replica-shell.mjs --brand "New Blog" --domain https://new-domain.com --site-email contact@new-domain.com --writer-name "Writer Name" --writer-email writer@example.com --project-slug new-blog --language en --monetization generic --write
```

Result expected after this phase:

- `content/site-profile.json` matches the new brand
- `content/site-profile.json` names the public assets under `assets.wordmark`, `assets.icon`, and `assets.social_cover`
- `content/pages.json` is fresh starter copy for the new locale
- `content/categories.json` is fresh starter taxonomy
- old Kepoli launch posts and images are no longer the intended public content

## 4. Replace Public Identity Assets

Replace:

- Logo
- Wordmark
- Site icon
- Writer image
- Social/share image
- Any public brand artwork in `wp-content/themes/kepoli/assets/img/`

Check:

- The artwork itself is rebranded, even if the internal filenames still contain `kepoli`
- If you want clone-specific filenames, set the matching basenames in `content/site-profile.json` and place files such as `{asset}.svg`, `{asset}.jpg`, or `{asset}.webp` in `wp-content/themes/kepoli/assets/img/`
- Theme header in `wp-content/themes/kepoli/style.css` reflects the new public brand

## 5. Review Site Profile And Public Copy

Review these files carefully:

- `content/site-profile.json`
- `content/pages.json`
- `content/categories.json`

Make sure:

- Public locale is correct
- Admin locale is `en_US`
- Slugs are final
- About, author, and legal pages sound authentic for this brand
- No copied narrative remains from the source site

## 6. Set Environment And Deployment Values

Review and update:

- `.env.example`
- Coolify environment variables
- DNS
- Canonical redirect hosts

Minimum env checks:

- `SITE_URL` is the real domain
- `SITE_EMAIL` is real
- `WRITER_EMAIL` is real
- `WP_LOCALE` matches `content/site-profile.json`
- `WP_ADMIN_LOCALE=en_US`
- `ADSENSE_ENABLE=0` at launch
- `GA_ENABLE=0` until consent is ready
- `EZOIC_ADSTXT_ACCOUNT_ID` or `EZOIC_ADSTXT_REDIRECT_URL` is set only if the site will use Ezoic ads.txt management

## 7. Engine Readiness

From the source/template repo, run this whenever the shared workflow changes:

```powershell
node scripts/audit-engine-readiness.mjs
```

For a fresh clone, this audit should pass before you rely on the scripts. It confirms the profile contract, script forwarding, documentation, admin/public locale split, env defaults, and dry-run clone workflow still agree.

## 8. Add Original Content

Before launch, create:

- Original posts in `content/posts.json`
- Matching entries in `content/image-plan.json`
- Matching featured images in `content/images/`

Do not launch with the source repo's starter content as your real public content.

## 9. Validate Before First Deploy

Run:

```powershell
node scripts/validate-new-blog.mjs --brief site-brief.json
```

Notes:

- `validate-new-blog` validates the brief automatically first.
- Run `audit-replica-readiness` after the reset and shell-generation steps.
- Run `audit-adsense-readiness` only when the new site is actually preparing for AdSense.

If you want the manual validation path, run:

```powershell
node scripts/verify-content.mjs
node scripts/image-status.mjs
node scripts/audit-rebrand.mjs
node scripts/audit-replica-readiness.mjs --min-posts 20
git diff --check
```

## 10. Deploy The New Site

- Create a fresh Coolify app for the new repo
- Use only `docker-compose.yml`
- Keep the `seed` profile disabled in normal deploys
- Point the real domain to the `wordpress` service
- Deploy once the validation checks pass

Optional live verification:

```powershell
node scripts/check-live-deploy.mjs https://new-domain.com
```

## 11. Do The Final Manual Review

Check the live site for:

- Public language correctness
- English admin experience
- Correct author identity
- Correct recipes page and guides page URLs
- Correct legal page URLs
- No old brand mentions
- No broken images
- No empty category landing sections
- Correct schema language
- Correct logo and favicon

## 12. Only Then Start Publishing

Publishing is safe when all of these are true:

- Site profile is correct
- Public copy is authentic
- Images are rebranded
- Deployment env is correct
- Validation scripts are clean
- Manual review is clean

## Repeat Rule

For every new blog:

1. Clone repo
2. Run `create-site-brief`
3. Run `start-new-blog`
4. Replace assets
5. Run engine readiness when the shared workflow changed
6. Add original content
7. Run validations
8. Deploy
9. Review live site

If a future clone needs a different language or visual identity, change the profile, content pack, and assets first. Do not fork the engine logic unless the site really needs a different product.

## Exit States For Codex

There are only two acceptable stop points for a fresh Codex conversation:

1. Launch-ready:
   - the brief is filled
   - the bootstrap steps are done
   - original content and assets are in place
   - validation passes
   - deployment review is clear
2. Blocked-with-specific-next-step:
   - a concrete missing input exists, such as missing brand values, missing assets, or missing original content
   - Codex names that blocker explicitly
   - Codex tells the user the exact next action needed

Codex should not stop at a vague planning state.
