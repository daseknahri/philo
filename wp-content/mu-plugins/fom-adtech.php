<?php
/**
 * Plugin Name: Frame of Mind Ad & Verification Helpers
 * Description: Handles ads.txt and lightweight verification output for the Frame of Mind deployment.
 */

if (!defined('ABSPATH')) {
    exit;
}

function fom_mu_env(string $key, string $default = ''): string
{
    $value = getenv($key);
    return $value === false || $value === '' ? $default : trim((string) $value);
}

function fom_mu_site_profile(): array
{
    $profile = get_option('fom_site_profile');
    return is_array($profile) ? $profile : [];
}

function fom_mu_profile_value(array $path, $default = '')
{
    $value = fom_mu_site_profile();
    foreach ($path as $key) {
        if (!is_array($value) || !array_key_exists($key, $value)) {
            return $default;
        }

        $value = $value[$key];
    }

    return $value;
}

function fom_mu_locale_to_language_tag(string $locale): string
{
    $locale = str_replace('_', '-', trim($locale));
    if ($locale === '') {
        return 'ro-RO';
    }

    $parts = explode('-', $locale);
    if (count($parts) >= 2) {
        return strtolower($parts[0]) . '-' . strtoupper($parts[1]);
    }

    return strtolower($parts[0]);
}

function fom_mu_site_name(): string
{
    $name = trim((string) fom_mu_profile_value(['brand', 'name'], get_bloginfo('name')));
    return $name !== '' ? $name : 'Frame of Mind';
}

function fom_mu_brand_description(): string
{
    $description = trim((string) fom_mu_profile_value(['brand', 'description'], get_bloginfo('description')));
    return $description !== '' ? $description : 'Film, philosophy, psychology, books, and the ideas that shape how we see the world.';
}

function fom_mu_public_locale(): string
{
    return fom_mu_locale_to_language_tag((string) fom_mu_profile_value(['locales', 'public'], get_option('WPLANG') ?: 'en_US'));
}

function fom_mu_asset_basename(string $key, string $fallback): string
{
    $asset = sanitize_file_name((string) fom_mu_profile_value(['assets', $key], ''));
    return $asset !== '' ? pathinfo($asset, PATHINFO_FILENAME) : $fallback;
}

function fom_mu_asset_uri(string $key, string $fallback, string $fallback_extension = 'svg'): string
{
    $basename = fom_mu_asset_basename($key, $fallback);
    $dir = get_template_directory();
    $uri = get_template_directory_uri();

    foreach (['svg', 'png', 'jpg', 'jpeg', 'webp'] as $extension) {
        $path = "/assets/img/{$basename}.{$extension}";
        if (file_exists($dir . $path)) {
            return $uri . $path;
        }
    }

    return $uri . "/assets/img/{$basename}.{$fallback_extension}";
}

function fom_mu_redirect_hosts(string $canonical_host): array
{
    $hosts = [
        'www.' . $canonical_host,
        'api.' . $canonical_host,
    ];

    $configured_hosts = array_filter(array_map(
        'trim',
        explode(',', fom_mu_env('CANONICAL_REDIRECT_HOSTS'))
    ));

    return array_values(array_unique(array_map('strtolower', array_merge($hosts, $configured_hosts))));
}

add_action('template_redirect', static function (): void {
    $site_url = fom_mu_env('SITE_URL', home_url('/'));
    $canonical_host = strtolower((string) parse_url($site_url, PHP_URL_HOST));
    if ($canonical_host === '') {
        return;
    }

    $current_host = strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''));
    $current_host = preg_replace('/:\d+$/', '', $current_host) ?: '';
    if ($current_host === '' || $current_host === $canonical_host) {
        return;
    }

    if (!in_array($current_host, fom_mu_redirect_hosts($canonical_host), true)) {
        return;
    }

    $scheme = (string) parse_url($site_url, PHP_URL_SCHEME);
    $scheme = $scheme !== '' ? $scheme : 'https';
    $request_uri = (string) ($_SERVER['REQUEST_URI'] ?? '/');
    $request_uri = str_starts_with($request_uri, '/') ? $request_uri : '/';

    wp_redirect($scheme . '://' . $canonical_host . $request_uri, 301, fom_mu_site_name());
    exit;
}, 0);

add_action('template_redirect', static function (): void {
    $path = parse_url((string) ($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH);
    if ($path !== '/ads.txt') {
        return;
    }

    $ezoic_ads_txt_url = fom_mu_env('EZOIC_ADSTXT_REDIRECT_URL');
    $ezoic_account_id = fom_mu_env('EZOIC_ADSTXT_ACCOUNT_ID');
    if ($ezoic_ads_txt_url === '' && $ezoic_account_id !== '') {
        $site_url = fom_mu_env('SITE_URL', home_url('/'));
        $site_host = strtolower((string) parse_url($site_url, PHP_URL_HOST));
        if ($site_host !== '') {
            $ezoic_ads_txt_url = 'https://srv.adstxtmanager.com/' . rawurlencode($ezoic_account_id) . '/' . rawurlencode($site_host);
        }
    }

    if ($ezoic_ads_txt_url !== '') {
        wp_redirect(esc_url_raw($ezoic_ads_txt_url), 301, fom_mu_site_name());
        exit;
    }

    $publisher_id = fom_mu_env('ADSENSE_PUB_ID');
    status_header(200);
    header('Content-Type: text/plain; charset=utf-8');

    if ($publisher_id !== '') {
        $publisher_id = str_starts_with($publisher_id, 'pub-') ? $publisher_id : 'pub-' . $publisher_id;
        echo 'google.com, ' . esc_html($publisher_id) . ", DIRECT, f08c47fec0942fa0\n";
    } else {
        echo "# ads.txt will be populated after the advertising partner provides publisher records.\n";
    }

    exit;
});

/**
 * Standard Google AdSense loader (single publisher id, no host= mode).
 * Gated by ADSENSE_ENABLE so the ad code only goes live when we intend it to.
 * The client id is derived from the SAME ADSENSE_PUB_ID that feeds /ads.txt,
 * so the on-page publisher id and ads.txt can never drift apart.
 */
/**
 * Google Consent Mode v2 DEFAULTS, emitted at most once per request. For the
 * consent-required regions (EEA + UK + Switzerland) every storage/ads signal starts
 * 'denied'; a Google-certified CMP (Google Privacy & Messaging, delivered by the AdSense
 * loader) flips them to 'granted' via gtag('consent','update',...) once the visitor
 * accepts. No region entry = the default stays granted, so readers outside these regions
 * are unaffected. ads_data_redaction + url_passthrough keep measurement working in the
 * denied state without cookies. Shared by the AdSense loader and the GA4 tag
 * (fom-analytics) so whichever loads first establishes the state before any Google tag.
 */
function fom_mu_consent_default(): void
{
    static $emitted = false;
    if ($emitted) {
        return;
    }
    $emitted = true;
    $eea = "['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','GB','CH']";
    echo "\n" . '<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}'
        . "gtag('consent','default',{"
        . "'ad_storage':'denied','ad_user_data':'denied','ad_personalization':'denied','analytics_storage':'denied',"
        . "'wait_for_update':500,'region':" . $eea . "});"
        . "gtag('set','ads_data_redaction',true);gtag('set','url_passthrough',true);</script>" . "\n";
}

add_action('wp_head', 'fom_mu_adsense_head', 9);
function fom_mu_adsense_head(): void
{
    // Resolve a well-formed standard client id (ca-pub-XXXX). One id only.
    $client = fom_mu_env('ADSENSE_CLIENT_ID');
    if ($client === '') {
        $pub = fom_mu_env('ADSENSE_PUB_ID');
        if ($pub !== '') {
            $client = 'ca-' . (str_starts_with($pub, 'pub-') ? $pub : 'pub-' . $pub);
        }
    } elseif (str_starts_with($client, 'pub-')) {
        $client = 'ca-' . $client;
    }
    if (!str_starts_with($client, 'ca-pub-')) {
        return; // never emit a malformed or host-mode client
    }

    // Site-ownership verification tag. This is Google's official "Ad code"
    // verification method and it loads NO ads by itself, so we emit it whenever a
    // valid publisher id is configured — even while ad SERVING is off. That lets
    // AdSense verify/connect the site and review the content with ADSENSE_ENABLE=0,
    // resolving the catch-22 of "Google needs the code present to review the site"
    // vs "don't serve ads to EEA/UK/CH visitors before the consent/CMP flow is live".
    echo "\n" . '<meta name="google-adsense-account" content="' . esc_attr($client) . '">' . "\n";

    // Ad SERVING (the loader that actually fetches and fills ad slots) is gated
    // separately. Keep ADSENSE_ENABLE=0 until a Google-certified CMP / Google
    // Privacy & Messaging is configured for EEA/UK/CH visitors.
    $enable = strtolower(fom_mu_env('ADSENSE_ENABLE'));
    if ($enable === '' || in_array($enable, ['0', 'false', 'off', 'no'], true)) {
        return;
    }

    // Google Consent Mode v2 DEFAULTS — must run BEFORE the adsbygoogle loader (and
    // before GA4). Shared with fom-analytics via fom_mu_consent_default() so
    // whichever Google tag fires first establishes the denied-by-default state for
    // EEA/UK/CH; the helper is idempotent, so this never double-emits.
    fom_mu_consent_default();

    echo '<link rel="preconnect" href="https://pagead2.googlesyndication.com" crossorigin>' . "\n";
    echo '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='
        . esc_attr($client) . '" crossorigin="anonymous"></script>' . "\n";
}

add_action('template_redirect', static function (): void {
    $path = parse_url((string) ($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH);
    if ($path !== '/.well-known/security.txt') {
        return;
    }

    $site_url = trailingslashit(fom_mu_env('SITE_URL', home_url('/')));
    $contact_email = sanitize_email((string) fom_mu_profile_value(['brand', 'site_email'], fom_mu_env('SITE_EMAIL', 'contact@example.com')));
    $contact_page = trailingslashit(home_url('/contact/'));
    $expires = gmdate('Y-m-d\T00:00:00\Z', strtotime('+12 months'));

    status_header(200);
    header('Content-Type: text/plain; charset=utf-8');

    echo 'Contact: mailto:' . esc_html($contact_email) . "\n";
    echo 'Contact: ' . esc_url_raw($contact_page) . "\n";
    echo 'Canonical: ' . esc_url_raw($site_url . '.well-known/security.txt') . "\n";
    echo 'Preferred-Languages: ' . esc_html(strtolower(substr(fom_mu_public_locale(), 0, 2))) . ", en\n";
    echo 'Expires: ' . esc_html($expires) . "\n";

    exit;
});

add_action('template_redirect', static function (): void {
    $path = parse_url((string) ($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH);
    if ($path !== '/site.webmanifest') {
        return;
    }

    status_header(200);
    header('Content-Type: application/manifest+json; charset=utf-8');

    $site_name = fom_mu_site_name();
    $icon_uri = fom_mu_asset_uri('icon', 'fom-icon');
    $icon_extension = strtolower(pathinfo((string) wp_parse_url($icon_uri, PHP_URL_PATH), PATHINFO_EXTENSION));
    $icon_type = match ($icon_extension) {
        'png' => 'image/png',
        'jpg', 'jpeg' => 'image/jpeg',
        'webp' => 'image/webp',
        default => 'image/svg+xml',
    };
    $manifest = [
        'name' => $site_name,
        'short_name' => $site_name,
        'description' => fom_mu_brand_description(),
        'lang' => fom_mu_public_locale(),
        'start_url' => home_url('/'),
        'scope' => home_url('/'),
        'display' => 'standalone',
        'background_color' => '#fbf7ef',
        'theme_color' => '#252416',
        'icons' => [
            [
                'src' => $icon_uri,
                'sizes' => 'any',
                'type' => $icon_type,
                'purpose' => 'any',
            ],
        ],
    ];

    echo wp_json_encode($manifest, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
});

add_filter('robots_txt', static function (string $output, bool $public): string {
    if (!$public) {
        return $output;
    }

    if (!str_contains($output, 'Sitemap:')) {
        $output .= "\nSitemap: " . home_url('/wp-sitemap.xml') . "\n";
    }

    return $output;
}, 10, 2);

add_filter('xmlrpc_enabled', '__return_false');

add_filter('wp_headers', static function (array $headers): array {
    unset($headers['X-Pingback']);
    return $headers;
});

add_filter('wp_sitemaps_add_provider', static function ($provider, string $name) {
    if ($name === 'users') {
        return false;
    }

    return $provider;
}, 10, 2);

add_filter('rest_endpoints', static function (array $endpoints): array {
    if (is_user_logged_in()) {
        return $endpoints;
    }

    unset(
        $endpoints['/wp/v2/users'],
        $endpoints['/wp/v2/users/(?P<id>[\\d]+)']
    );

    return $endpoints;
});
