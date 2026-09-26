<?php
/**
 * Plugin Name: Frame of Mind Shared Helpers
 * Description: Single source of truth for values shared across kepoli mu-plugins. Currently the home-remedy
 *   (YMYL folk-cure) category slug set — referenced by fom-remedy-notice (the medical disclaimer),
 *   fom-noindex-remedies (the review-time noindex shield), and fom-autoseed. Consolidating it here
 *   prevents the drift that silently killed the disclaimer + noindex after the 2026-09-01 category merge
 *   (colds-respiratory + skin-wounds-teeth + aches-pains-fever -> natural-remedies), and the earlier
 *   fatal-redeclare 'site down' incident from the same list living in two files. Define-guarded so it is
 *   safe regardless of mu-plugin load order (all callers use it at hook/runtime, after every mu-plugin loads).
 *
 * @package Kepoli
 */

if (!defined('ABSPATH')) {
    exit;
}

if (!function_exists('fom_brand_social')) {
    /**
     * The brand's own social profiles (NOT the author's), as network => URL, in profile order.
     * Single source for Organization `sameAs` (fom-schema) and the footer icon row (fom-theme).
     * Read from brand.social in the seeded profile option, falling back to the baked
     * /content/site-profile.json so a profile edit ships on a plain redeploy — no reseed.
     * Empty or non-http(s) values are dropped, so a blank entry simply isn't linked.
     */
    function fom_brand_social(): array
    {
        static $social = null;
        if ($social !== null) {
            return $social;
        }
        $raw = [];
        $profile = get_option('fom_site_profile');
        if (is_array($profile) && isset($profile['brand']['social']) && is_array($profile['brand']['social'])) {
            $raw = $profile['brand']['social'];
        }
        if (!$raw && is_readable('/content/site-profile.json')) {
            $json = json_decode((string) file_get_contents('/content/site-profile.json'), true);
            if (is_array($json) && isset($json['brand']['social']) && is_array($json['brand']['social'])) {
                $raw = $json['brand']['social'];
            }
        }
        $social = [];
        foreach ($raw as $network => $url) {
            $network = sanitize_key((string) $network);
            $url = trim((string) $url);
            if ($network !== '' && preg_match('#^https?://#i', $url)) {
                $social[$network] = esc_url_raw($url);
            }
        }
        return $social;
    }
}

if (!function_exists('fom_remedy_slugs')) {
    /**
     * The home-remedy (YMYL folk-cure) category slug(s) — the only content the disclaimer + noindex shield
     * touch. After the 2026-09-01 merge the three original remedy categories are one: 'natural-remedies'.
     */
    function fom_remedy_slugs(): array
    {
        return ['natural-remedies'];
    }
}
