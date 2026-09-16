#!/bin/sh
set -e

mkdir -p /var/www/html/wp-content/themes /var/www/html/wp-content/mu-plugins /var/www/html/wp-content/plugins

rm -rf /var/www/html/wp-content/themes/viral-reader
rm -rf /var/www/html/wp-content/plugins/automation-hamri
# Sweep any stale per-version plugin folders left in the persistent volume; two
# copies of the plugin (e.g. automation-hamri-v961) redeclare the same functions
# and fatal every request. The repo only ships the single "automation-hamri".
rm -rf /var/www/html/wp-content/plugins/automation-hamri-v* 2>/dev/null || true
cp -a /opt/fom/wp-content/themes/viral-reader /var/www/html/wp-content/themes/viral-reader
# The fom-*.php mu-plugins are ALL baked from the repo, so sweep any stale ones from the persistent volume
# BEFORE copying the current set back. An additive cp alone leaves a mu-plugin that was DELETED from the repo
# running forever — which double-emitted the share row + TOC after those features were promoted from mu-plugins
# into the theme (v1.9.11). Only fom-*.php is swept, so any non-kepoli / plugin-dropped mu-plugin is untouched.
rm -f /var/www/html/wp-content/mu-plugins/fom-*.php 2>/dev/null || true
cp -a /opt/fom/wp-content/mu-plugins/. /var/www/html/wp-content/mu-plugins/
cp -a /opt/fom/wp-content/plugins/automation-hamri /var/www/html/wp-content/plugins/automation-hamri

chown -R www-data:www-data \
  /var/www/html/wp-content/themes/viral-reader \
  /var/www/html/wp-content/mu-plugins \
  /var/www/html/wp-content/plugins/automation-hamri \
  /seed \
  /content 2>/dev/null || true

# The uploads volume (fom_uploads) mounts ROOT-OWNED when first created, so the web
# user (www-data) can't write there and wp_upload_dir() returns an error — media
# sideloading and the Bulk-ZIP publisher fail with "Uploads directory unavailable."
# Ensure it exists and is www-data-owned. Guarded so the recursive chown runs only
# once (when root-owned); later restarts skip it, staying fast as the library grows.
mkdir -p /var/www/html/wp-content/uploads
if [ "$(stat -c '%U' /var/www/html/wp-content/uploads 2>/dev/null)" != "www-data" ]; then
  chown -R www-data:www-data /var/www/html/wp-content/uploads 2>/dev/null || true
fi

# Site hero media (background video + poster), baked in /content/hero, served from the
# uploads volume at /wp-content/uploads/fom/ so fom-theme.php can point the homepage hero
# at a clean, text-free clip instead of a post's baked-in-text cover art. Copied on every
# boot so a redeployed/updated clip propagates; www-data-owned so it serves cleanly.
if [ -d /content/hero ]; then
  mkdir -p /var/www/html/wp-content/uploads/fom
  cp -f /content/hero/* /var/www/html/wp-content/uploads/fom/ 2>/dev/null || true
  chown -R www-data:www-data /var/www/html/wp-content/uploads/fom 2>/dev/null || true
fi

exec docker-entrypoint.sh "$@"
