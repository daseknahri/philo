FROM wordpress:php8.3-apache

COPY wp-content/themes/viral-reader/ /opt/kepoli/wp-content/themes/viral-reader/
COPY wp-content/mu-plugins/ /opt/kepoli/wp-content/mu-plugins/
COPY wp-content/plugins/ /opt/kepoli/wp-content/plugins/
COPY seed/ /seed/
COPY content/ /content/
COPY docker/wordpress/kepoli-performance.conf /etc/apache2/conf-available/kepoli-performance.conf
COPY docker/wordpress/entrypoint.sh /usr/local/bin/kepoli-wordpress-entrypoint

RUN a2enmod headers expires deflate \
    && a2enconf kepoli-performance \
    # Suppress version disclosure at the source that wins: Debian's security.conf (loaded after
    # our conf) sets ServerTokens OS, and PHP defaults expose_php On (X-Powered-By header).
    && sed -ri 's/^ServerTokens\s+.*/ServerTokens Prod/' /etc/apache2/conf-available/security.conf \
    && sed -ri 's/^ServerSignature\s+.*/ServerSignature Off/' /etc/apache2/conf-available/security.conf \
    # Hide the PHP version + raise upload/runtime limits so the plugin's Bulk-ZIP publisher can
    # accept a real content bundle (default upload_max_filesize 2M / post_max_size 8M reject a
    # multi-MB zip before PHP even hands it to the handler). 64M aligns with the plugin's own
    # wpap_bundle_max_bytes cap; memory + time headroom cover sideloading a batch of images.
    && printf 'expose_php = Off\nupload_max_filesize = 64M\npost_max_size = 64M\nmemory_limit = 256M\nmax_execution_time = 600\n' > /usr/local/etc/php/conf.d/zz-kepoli-hardening.ini \
    && chmod +x /usr/local/bin/kepoli-wordpress-entrypoint /seed/bin/bootstrap.sh

ENTRYPOINT ["kepoli-wordpress-entrypoint"]
CMD ["apache2-foreground"]
