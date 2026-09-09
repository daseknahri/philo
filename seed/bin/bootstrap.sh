#!/bin/sh
set -eu

cd /var/www/html

: "${WORDPRESS_DB_HOST:?WORDPRESS_DB_HOST is required}"
: "${WORDPRESS_DB_NAME:?WORDPRESS_DB_NAME is required}"
: "${WORDPRESS_DB_USER:?WORDPRESS_DB_USER is required}"
: "${WORDPRESS_DB_PASSWORD:?WORDPRESS_DB_PASSWORD is required}"
: "${WP_ADMIN_USER:?WP_ADMIN_USER is required}"
: "${WP_ADMIN_PASSWORD:?WP_ADMIN_PASSWORD is required}"
: "${WP_ADMIN_EMAIL:?WP_ADMIN_EMAIL is required}"

SITE_URL="${SITE_URL:-https://ibnbatoutaweb.com}"
WP_LOCALE="${WP_LOCALE:-en_US}"
WP_ADMIN_LOCALE="${WP_ADMIN_LOCALE:-en_US}"
SITE_EMAIL="${SITE_EMAIL:-contact@ibnbatoutaweb.com}"
SITE_NAME="${SITE_NAME:-}"

if [ -z "$SITE_NAME" ]; then
  site_host=$(printf '%s' "$SITE_URL" | sed -E 's#^[a-zA-Z]+://##' | sed -E 's#/.*$##')
  site_host=${site_host#www.}
  site_host=${site_host%%:*}
  if [ -n "$site_host" ]; then
    SITE_NAME=$(printf '%s' "$site_host" | cut -d. -f1)
  else
    SITE_NAME="Food Blog"
  fi
fi

case "$WP_LOCALE" in
  en*)
    SITE_TAGLINE="${SITE_TAGLINE:-Recipes, kitchen guides, and practical home cooking notes}"
    TIMEZONE_STRING="${TIMEZONE_STRING:-UTC}"
    DATE_FORMAT="${DATE_FORMAT:-F j, Y}"
    TIME_FORMAT="${TIME_FORMAT:-g:i a}"
    ;;
  *)
    SITE_TAGLINE="${SITE_TAGLINE:-Retete pentru acasa, articole culinare si ghiduri practice.}"
    TIMEZONE_STRING="${TIMEZONE_STRING:-Europe/Bucharest}"
    DATE_FORMAT="${DATE_FORMAT:-j F Y}"
    TIME_FORMAT="${TIME_FORMAT:-H:i}"
    ;;
esac

echo "Waiting for WordPress files..."
count=0
while [ ! -f wp-includes/version.php ] && [ "$count" -lt 90 ]; do
  count=$((count + 1))
  sleep 2
done

if [ ! -f wp-includes/version.php ]; then
  echo "WordPress files were not present; downloading core."
  wp core download --locale="$WP_LOCALE" --force
fi

if [ ! -f wp-config.php ]; then
  echo "Creating wp-config.php"
  wp config create \
    --dbname="$WORDPRESS_DB_NAME" \
    --dbuser="$WORDPRESS_DB_USER" \
    --dbpass="$WORDPRESS_DB_PASSWORD" \
    --dbhost="$WORDPRESS_DB_HOST" \
    --skip-check \
    --force \
    --extra-php <<'PHP'
define('DISALLOW_FILE_EDIT', true);
define('WP_POST_REVISIONS', 5);
define('AUTOMATIC_UPDATER_DISABLED', false);
PHP
fi

echo "Waiting for database..."
until wp db check >/dev/null 2>&1; do
  sleep 3
done

if ! wp core is-installed >/dev/null 2>&1; then
  echo "Installing WordPress"
  wp core install \
    --url="$SITE_URL" \
    --title="$SITE_NAME" \
    --admin_user="$WP_ADMIN_USER" \
    --admin_password="$WP_ADMIN_PASSWORD" \
    --admin_email="$WP_ADMIN_EMAIL" \
    --locale="$WP_LOCALE"
fi

wp language core install "$WP_LOCALE" --activate || true
wp language plugin install --all "$WP_LOCALE" || true
wp language core install "$WP_ADMIN_LOCALE" || true
wp language plugin install --all "$WP_ADMIN_LOCALE" || true
wp option update siteurl "$SITE_URL"
wp option update home "$SITE_URL"
wp option update blogname "$SITE_NAME"
wp option update blogdescription "$SITE_TAGLINE"
wp option update admin_email "$SITE_EMAIL"
wp option update blog_public "1"
wp option update timezone_string "$TIMEZONE_STRING"
wp option update date_format "$DATE_FORMAT"
wp option update time_format "$TIME_FORMAT"
wp option update permalink_structure "/%category%/%postname%/"
wp rewrite structure "/%category%/%postname%/" --hard

admin_id="$(wp user get "$WP_ADMIN_USER" --field=ID 2>/dev/null || true)"
if [ -n "$admin_id" ]; then
  wp user meta update "$admin_id" locale "$WP_ADMIN_LOCALE" || true
fi

wp theme activate viral-reader
wp plugin activate automation-hamri || true
wp plugin install google-site-kit --activate || true
wp plugin deactivate akismet hello >/dev/null 2>&1 || true

# One-time fresh cutover: back up the DB, then wipe existing content so the seed
# rebuilds a clean site instead of layering the clean posts on top of the old ones.
# Guarded by an explicit env flag — set FOM_FRESH_CUTOVER=1 ONLY for the go-live
# cutover, then set it back to 0 so later redeploys never wipe again.
if [ "${FOM_FRESH_CUTOVER:-0}" = "1" ]; then
  ts=$(date +%Y%m%d-%H%M%S)
  backup="/var/www/html/wp-content/uploads/pre-cutover-${ts}.sql"
  echo "FRESH CUTOVER: exporting DB backup to ${backup}"
  wp db export "$backup" || echo "WARNING: DB export failed; continuing"
  echo "FRESH CUTOVER: emptying existing site content (posts, pages, terms)"
  wp site empty --yes
fi

wp eval-file /seed/bootstrap.php
wp rewrite flush --hard

echo "$SITE_NAME bootstrap complete."
