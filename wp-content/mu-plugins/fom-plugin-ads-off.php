<?php
/**
 * Plugin Name: Frame of Mind — disable Automation-Hamri front-end ad output
 * Description: Makes fom-adtech.php the SOLE AdSense integration. Forces the
 *   Automation Hamri (wp-automator-pro) plugin to emit ZERO front-end ad code on
 *   kepoli — the head Auto-Ads loader (incl. the stray ?host=ca-host-pub-… tag), the
 *   in-content injector, and the theme ad-zones (footer / sidebar / full-width strip).
 *
 *   DB-INDEPENDENT BY DESIGN: it never writes the plugin's `wpap_ads_inject` option, so
 *   it works no matter what the admin Settings → AdSense toggle / pasted auto_code says.
 *   Neutralises every emission path in code instead. Loads as an mu-plugin (before the
 *   regular plugin), survives Coolify redeploys (vendored), and needs no wp-admin click.
 *
 * @package Kepoli
 */

if (!defined('ABSPATH')) {
    exit;
}

/*
 * PRIMARY (load-bearing) — force the normalized ads config to `enabled = 0` on every
 * FRONT-END read of the plugin's option. wpap_get_ads() calls get_option('wpap_ads_inject')
 * once (then memoizes), and wpap_ads_head(), wpap_inject_in_content_ads() and
 * wpap_zone_html() ALL bail when 'enabled' is falsy — so this single filter kills the head
 * loader, the in-content ads AND the theme zones (which call wpap_zone_html() directly and
 * are not removable via remove_action()).
 *
 * Gated to the front end: admin reads (the Settings page, the settings-export, and the
 * one-time autoload migration in wp-automator-pro.php) see the REAL stored value, so the
 * owner's saved setting is never perturbed and nothing is persisted back to the DB.
 */
add_filter('option_wpap_ads_inject', static function ($value) {
    if (is_admin()) {
        return $value; // don't perturb admin / migration / export reads
    }
    if (is_array($value)) {
        $value['enabled'] = 0;
    }
    return $value;
}, 99);

/*
 * DEFENCE-IN-DEPTH — also unhook the two hook-based emitters outright, in case a future
 * plugin version stops gating output on 'enabled'. The plugin registers these when its main
 * file loads (after mu-plugins), so the removals are deferred to 'init', by which point the
 * callbacks exist. wp_head (pri 8) and the_content (pri 15) both run after 'init'.
 */
add_action('init', static function (): void {
    remove_action('wp_head', 'wpap_ads_head', 8);
    remove_filter('the_content', 'wpap_inject_in_content_ads', 15);
}, 99);
