FROM wordpress:cli-php8.3

USER root

COPY wp-content/themes/viral-reader/ /opt/fom/wp-content/themes/viral-reader/
COPY wp-content/mu-plugins/ /opt/fom/wp-content/mu-plugins/
COPY wp-content/plugins/ /opt/fom/wp-content/plugins/
COPY seed/ /seed/
COPY content/ /content/
COPY docker/wp-cli/entrypoint.sh /usr/local/bin/kepoli-wp-cli-entrypoint

RUN chmod +x /usr/local/bin/kepoli-wp-cli-entrypoint /seed/bin/bootstrap.sh

ENTRYPOINT ["kepoli-wp-cli-entrypoint"]
