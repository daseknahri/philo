#!/bin/sh
set -e

mkdir -p /var/www/html/wp-content/themes /var/www/html/wp-content/mu-plugins /var/www/html/wp-content/plugins

rm -rf /var/www/html/wp-content/themes/viral-reader
rm -rf /var/www/html/wp-content/plugins/automation-hamri
# Sweep any stale per-version plugin folders left in the persistent volume; two
# copies of the plugin (e.g. automation-hamri-v961) redeclare the same functions
# and fatal every request. The repo only ships the single "automation-hamri".
rm -rf /var/www/html/wp-content/plugins/automation-hamri-v* 2>/dev/null || true
cp -a /opt/kepoli/wp-content/themes/viral-reader /var/www/html/wp-content/themes/viral-reader
# The fom-*.php mu-plugins are ALL baked from the repo, so sweep any stale ones from the persistent volume
# BEFORE copying the current set back. An additive cp alone leaves a mu-plugin that was DELETED from the repo
# running forever — which double-emitted the share row + TOC after those features were promoted from mu-plugins
# into the theme (v1.9.11). Only fom-*.php is swept, so any non-kepoli / plugin-dropped mu-plugin is untouched.
rm -f /var/www/html/wp-content/mu-plugins/fom-*.php 2>/dev/null || true
cp -a /opt/kepoli/wp-content/mu-plugins/. /var/www/html/wp-content/mu-plugins/
cp -a /opt/kepoli/wp-content/plugins/automation-hamri /var/www/html/wp-content/plugins/automation-hamri

chown -R www-data:www-data \
  /var/www/html/wp-content/themes/viral-reader \
  /var/www/html/wp-content/mu-plugins \
  /var/www/html/wp-content/plugins/automation-hamri \
  /seed \
  /content 2>/dev/null || true

exec docker-entrypoint.sh "$@"
