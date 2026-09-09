# Replicate This Food Blog

Use this repo as the shared engine for another food blog, but change the public profile and content pack before the first deploy. Internal handles such as `kepoli_` can stay for now; what matters for readers, Google, ad networks, and search is that the new site has its own `content/site-profile.json`, pages, categories, posts, image plan, images, and theme assets.

If you want the repeatable checklist version, follow `docs/new-blog-launch-plan.md` every time.

For the most deterministic Codex workflow, generate `site-brief.json` with `scripts/create-site-brief.mjs`, validate it with `scripts/validate-site-brief.mjs`, and use that file with `scripts/start-new-blog.mjs` and `scripts/validate-new-blog.mjs`.

Recommended first command:

```powershell
node scripts/create-site-brief.mjs --brand "New Blog" --domain https://new-domain.com --writer-name "Writer Name" --writer-email writer@example.com --site-email contact@new-domain.com --language en --write
```

## What To Keep

- The Docker and Coolify deployment structure.
- The custom WordPress theme layout, performance work, structured data, ad gating, canonical redirects, and security hardening.
- The author tools plugin: automatic excerpts, meta descriptions, featured-image metadata, internal links, recipe fields, FAQ assist, heading cleanup, and post split controls.
- The native newsletter system that stores emails in WordPress admin.
- The conservative monetization strategy: keep manual ad placements disabled at launch and let the new site pass review cleanly before enabling AdSense, Ezoic, or another ad stack.

## What To Change First

Fast path for a fresh clone:

```powershell
node scripts/start-new-blog.mjs --brief site-brief.json --write
```

Manual path if you want the steps one by one:

In the cloned repo, you can apply the mechanical identity changes with:

```powershell
node scripts/prepare-replica.mjs --brand "New Blog" --domain https://new-domain.com --site-email contact@new-domain.com --writer-name "Writer Name" --writer-email writer@example.com --project-slug new-blog --language en --recipes-slug recipes --guides-slug guides --write
```

Without `--write`, the command only shows the changes it would make.

Then clear the old launch posts and image plan in the clone:

```powershell
node scripts/reset-replica-content.mjs --write --delete-images
```

Leave out `--delete-images` if you want to remove the old images manually. The reset script writes a local `.replica-backups/` folder before deleting or clearing files.

Then generate fresh starter pages and categories:

```powershell
node scripts/generate-replica-shell.mjs --brand "New Blog" --domain https://new-domain.com --site-email contact@new-domain.com --writer-name "Writer Name" --writer-email writer@example.com --project-slug new-blog --language en --monetization ezoic --write
```

These commands now create or rewrite `content/site-profile.json` too. The profile is the canonical source for brand name, public locale, admin locale, writer identity, and canonical page slugs. Admin stays English through `locales.admin=en_US` and `locales.force_admin=true`; public generated text follows `locales.public`.

The generated pages are a starter shell. Review them before launch, especially privacy, cookies, advertising, editorial, terms, and disclaimer pages. The shell generator supports both Romanian and English starter sets.

Then review these values in the new repo and in the new Coolify environment:

```env
SITE_URL=https://new-domain.com
SITE_EMAIL=contact@new-domain.com
WRITER_EMAIL=writer@example.com
WP_LOCALE=en_US
WP_ADMIN_LOCALE=en_US
CANONICAL_REDIRECT_HOSTS=www.new-domain.com
EZOIC_ADSTXT_ACCOUNT_ID=
EZOIC_ADSTXT_REDIRECT_URL=

WORDPRESS_DB_NAME=new_blog_name
WORDPRESS_DB_USER=new_blog_user
WORDPRESS_DB_PASSWORD=strong-password
MYSQL_ROOT_PASSWORD=strong-root-password

WP_ADMIN_USER=admin
WP_ADMIN_PASSWORD=strong-admin-password
WP_ADMIN_EMAIL=contact@new-domain.com

ADSENSE_CLIENT_ID=
ADSENSE_PUB_ID=
ADSENSE_ENABLE=0
ADSENSE_SLOT_HEADER=
ADSENSE_SLOT_AFTER_INTRO=
ADSENSE_SLOT_MID_CONTENT=
ADSENSE_SLOT_SIDEBAR=
ADSENSE_SLOT_BELOW_CONTENT=

GA_ENABLE=0
GA_MEASUREMENT_ID=
SEARCH_CONSOLE_VERIFICATION=

KEPOLI_DEPLOY_FINGERPRINT=0
```

If the new site will use AdSense after approval, fill `ADSENSE_CLIENT_ID` and `ADSENSE_PUB_ID` with that account's IDs. If the new site will use Ezoic first, those values can stay empty until you decide to activate AdSense later; use `EZOIC_ADSTXT_ACCOUNT_ID` or `EZOIC_ADSTXT_REDIRECT_URL` only after Ezoic gives you the ads.txt manager details.

## Files To Rebrand

- `content/site-profile.json`: replace brand name, tagline, description, public locale, writer identity, canonical slugs, and public asset basenames. This is the first file to check.
- `content/site-profile.json`: set `assets.wordmark`, `assets.icon`, and `assets.social_cover` to the public asset basenames used by the theme.
- `.env.example`: replace domain, emails, database names, AdSense IDs, and canonical hosts. Keep `WP_LOCALE` equal to `content/site-profile.json` `locales.public`.
- `WP_ADMIN_LOCALE`: keep this as `en_US` so WordPress admin and beginner-publisher tools stay in English, even if the public site uses Romanian or another language.
- `docker-compose.yml`: replace default domain/email values and rename the image tags from `kepoli-wordpress` and `kepoli-wp-cli` to the new project name. This avoids image-name collisions if both blogs run on the same server.
- `README.md` and `docs/*.md`: replace project name and old operational notes.
- `wp-content/themes/kepoli/style.css`: change the public theme header: theme name, URI, author, author URI, and description.
- `wp-content/themes/kepoli/assets/img/`: replace logo, social cover, homepage hero, icon, and writer photo.
- The theme resolves wordmark, icon, and social cover from the profile first, so clone-specific files can use names like `new-blog-wordmark.svg`, `new-blog-icon.svg`, and `new-blog-social-cover.jpg`.
- `wp-content/themes/kepoli/functions.php`: this should read public identity from `kepoli_site_profile`; avoid adding new brand-specific fallback copy here.
- `wp-content/themes/kepoli/header.php`, `footer.php`, `front-page.php`, `page-despre-kepoli.php`, `page-despre-autor.php`, `page-retete.php`, and `page-articole.php`: keep these as layout templates. Public authenticity copy should come from `content/pages.json`; template labels can stay structural and locale-aware. The theme now resolves these templates from `content/site-profile.json` slugs, so clones do not need template-file renames.
- `wp-content/mu-plugins/kepoli-adtech.php`: replace manifest name, short name, description, and icon if needed.
- `wp-content/mu-plugins/kepoli-newsletter.php`: public newsletter labels now read the site profile; internal function names can stay.
- `seed/bootstrap.php`: imports `content/site-profile.json` into the `kepoli_site_profile` option and seeds title, tagline, page slugs, locale, and writer identity from that profile. A quick manual review is still wise, but new clones should not need direct seed-code identity edits.

The folder name `wp-content/themes/kepoli`, PHP function prefixes like `kepoli_`, CSS classes, and text domain can stay for the first clone. Renaming all internal handles is cosmetic and riskier than useful. Rebrand the visible text first.

If the new site switches language, run the mechanical clone scripts first, then do one calm public-copy pass through the theme and editor screens before launch. The scripts cover slugs, env defaults, starter pages, and brand identity, but they do not promise a perfect translation of every UI sentence.

## Engine Readiness

When you change the shared clone workflow, run this in the source/template repo:

```powershell
node scripts/audit-engine-readiness.mjs
```

This checks the site-profile contract, asset basenames, Ezoic/AdSense env defaults, admin/public locale split, clone scripts, docs, and dry-run workflow. It is source-repo safe, unlike `validate-new-blog`, which is intended for a rebranded clone.

## Content Reset

Do not reuse the Kepoli launch posts or images on the new site. For AdSense and SEO, the new blog should look like a real independent publication, not a copy.

Replace these:

- `content/site-profile.json`: brand, locale, writer, email, and canonical public slugs.
- `content/categories.json`: new categories and descriptions.
- `content/pages.json`: new Home, Recipes, Guides, About, Author, Contact, Privacy, Cookies, Advertising, Editorial Policy, Terms, and Disclaimer text.
- `content/posts.json`: new original posts, slugs, excerpts, tags, recipe data, related links, SEO titles, and meta descriptions.
- `content/image-plan.json`: new image prompts/metadata for the new posts.
- `content/images/*`: new featured images that match the new articles.

Keep the same JSON structure so the existing seed system and editor automation continue to work.

## Launch Checklist

- Create the new GitHub repo from this project, then update the files above before the first deployment.
- Do not copy `env.tmp`; it is local only.
- In Coolify, create a fresh project/app and use the new repo.
- Add both `new-domain.com` and `www.new-domain.com` in DNS and Coolify, then keep the canonical redirect host set to `www.new-domain.com`.
- Connect Site Kit fresh for the new domain if you plan to use Google services.
- Keep `ADSENSE_ENABLE=0` while the site is under review. That still applies even if you plan to start with Ezoic and add AdSense later.
- Publish enough original posts with real featured images before submitting for AdSense.

## Quick Checks Before Deployment

Run these in the new repo after replacing content:

```powershell
node scripts/validate-new-blog.mjs --brief site-brief.json
```

Run `node scripts/audit-adsense-readiness.mjs` only when the new site is actually preparing for AdSense.

Manual fallback:

```powershell
node scripts/audit-replica-readiness.mjs --min-posts 20
node scripts/verify-content.mjs
node scripts/image-status.mjs
node scripts/audit-rebrand.mjs
git diff --check
```

If you want a manual second look, search for old identity leftovers too:

```powershell
Get-ChildItem -Recurse -File |
  Where-Object { $_.FullName -notmatch '\\.git\\' -and $_.Name -ne 'env.tmp' } |
  Select-String -Pattern 'Kepoli','kepoli.com','contact@kepoli'
```

Public leftovers should be fixed. Internal code handles can wait unless you want a deeper white-label cleanup later.
