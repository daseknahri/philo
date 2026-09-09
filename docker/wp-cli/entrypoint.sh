#!/bin/sh
set -e

export WP_CLI_ALLOW_ROOT=1

mkdir -p /var/www/html/wp-content/themes /var/www/html/wp-content/mu-plugins /var/www/html/wp-content/plugins

rm -rf /var/www/html/wp-content/themes/viral-reader
rm -rf /var/www/html/wp-content/plugins/automation-hamri
# Sweep any stale per-version plugin folders left in the persistent volume; two
# copies of the plugin (e.g. automation-hamri-v961) redeclare the same functions
# and fatal every request. The repo only ships the single "automation-hamri".
rm -rf /var/www/html/wp-content/plugins/automation-hamri-v* 2>/dev/null || true
cp -a /opt/kepoli/wp-content/themes/viral-reader /var/www/html/wp-content/themes/viral-reader
cp -a /opt/kepoli/wp-content/mu-plugins/. /var/www/html/wp-content/mu-plugins/
cp -a /opt/kepoli/wp-content/plugins/automation-hamri /var/www/html/wp-content/plugins/automation-hamri

chown -R 33:33 \
  /var/www/html/wp-content/themes/viral-reader \
  /var/www/html/wp-content/mu-plugins \
  /var/www/html/wp-content/plugins/automation-hamri \
  /seed \
  /content 2>/dev/null || true

/bin/sh /seed/bin/bootstrap.sh

chown -R 33:33 \
  /var/www/html/wp-content \
  /var/www/html/wp-config.php 2>/dev/null || true
