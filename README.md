# Frame of Mind — ibnbatoutaweb.com

US film / philosophy / psychology / books / life blog. A second site built on the reusable
blog-creator (viral-reader theme + Automation Hamri plugin), deployed via Coolify.

- **Brand/config (what the seed reads):** `content/site-profile.json` — brand name, tagline,
  description, site email, writer name/bio/email, assets, and page slugs. `site-brief.json` at
  the repo root is a human-readable spec only; the seed does **not** load it, so keep the two in
  sync and treat `site-profile.json` as the source of truth.
- **Content:** `content/{categories,pages,posts}.json` + `content/images/` (ship a raster
  `fom-icon.png` — WP can't crop an SVG into the favicon).
- **Site glue:** `wp-content/mu-plugins/fom-*.php` (schema, analytics, adtech, perf, noindex).
- **Deploy:** Docker (`docker/`) → Coolify. Author: Dasek Nahri · contact@ibnbatoutaweb.com.

## Deploy (Coolify) — first time

1. **DNS:** point apex `ibnbatoutaweb.com` (A record) at the VPS IP; optionally `www` too. Your
   other subdomains (api., recipe., …) are untouched.
2. **Coolify resource:** Docker Compose from `daseknahri/philo`, branch `main`, compose file
   `docker-compose.yml` (base only — not `docker-compose.local.yml`, which is the localhost
   smoke-test override).
3. **Env vars** (see the table below). Note `CANONICAL_REDIRECT_HOSTS` **must** be overridden to
   `www.ibnbatoutaweb.com` only — the compose default also lists api./recipe., which are your
   other live subdomains.
4. **Deploy.** This starts mariadb + wordpress + wp-cron. The site is up but not yet installed
   (homepage 302 → install.php) — that is expected.
5. **Seed once** (same one-off as kepoli's first deploy): run the profile-gated init service in
   the deployment directory on the VPS:
   `docker compose --profile seed run --rm wp-init`
   It runs `wp core install`, seeds the 5 categories + 10 trust pages, writes `ads.txt`, sets the
   favicon, and installs + activates Site Kit. Re-running is idempotent.
6. **Verify:** homepage title = "Frame of Mind — …", `/ads.txt` = `google.com, pub-1895856024511895, DIRECT, f08c47fec0942fa0`,
   the 5 category archives and trust pages return 200.
7. **Site Kit → connect** Search Console + AdSense in wp-admin, then submit for AdSense review.
   Publish articles from the plugin (Direct Publish / Bulk ZIP).

### Environment variables

| Var | Value | Notes |
|---|---|---|
| `WORDPRESS_DB_NAME` | `fom` | required |
| `WORDPRESS_DB_USER` | `fom` | required |
| `WORDPRESS_DB_PASSWORD` | *(strong secret)* | required |
| `MYSQL_ROOT_PASSWORD` | *(strong secret)* | required |
| `WP_ADMIN_USER` | *(admin login)* | required (seed only) |
| `WP_ADMIN_PASSWORD` | *(strong secret)* | required (seed only) |
| `WP_ADMIN_EMAIL` | `contact@ibnbatoutaweb.com` | required (seed only) |
| `SITE_URL` | `https://ibnbatoutaweb.com` | override localhost default |
| `SITE_EMAIL` | `contact@ibnbatoutaweb.com` | |
| `WRITER_EMAIL` | `daseknahri@gmail.com` | override the compose default |
| `CANONICAL_REDIRECT_HOSTS` | `www.ibnbatoutaweb.com` | **override** — default lists api./recipe. |
| `ADSENSE_CLIENT_ID` | `ca-pub-1895856024511895` | drives the AdSense loader |
| `ADSENSE_PUB_ID` | `pub-1895856024511895` | drives `ads.txt` |

Later maintenance flags (all default OFF): `FOM_FORCE_RESEED`, `FOM_FRESH_CUTOVER`,
`FOM_RESET_ADMIN` (see `.env.example` for the full set). AdSense ad *injection* is off by
default (`ADSENSE_ENABLE=0`); the loader + ads.txt are enough for review.
