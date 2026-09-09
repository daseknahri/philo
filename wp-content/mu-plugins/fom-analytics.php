<?php
/**
 * Plugin Name: Frame of Mind Analytics & Verification
 * Description: Consumes the measurement/verification env vars that were passed to the
 *   container but previously read by nothing: search-engine + platform site-verification
 *   meta tags (Google Search Console, Bing, Pinterest), Google Analytics 4 (Consent Mode v2
 *   aware, gated behind the same denied-by-default state as ads), and Histats. Everything is
 *   env-gated and off until configured. Loads after fom-adtech (alphabetical mu-plugin
 *   order), so fom_mu_env() and fom_mu_consent_default() are already defined.
 *
 * @package Kepoli
 */

if (!defined('ABSPATH')) {
    exit;
}

/** Truthy env check ("1"/"true"/"on"/"yes"); anything else (incl. empty) is false. */
if (!function_exists('fom_mu_env_bool')) {
    function fom_mu_env_bool(string $key, bool $default = false): bool
    {
        $v = strtolower(trim(fom_mu_env($key)));
        if ($v === '') {
            return $default;
        }
        return in_array($v, ['1', 'true', 'on', 'yes'], true);
    }
}

/**
 * Site-ownership verification meta tags. Each emits only when its env var is set, so an
 * empty value leaves nothing in the <head>. Search Console is the one that matters for the
 * campaign (submit the sitemap, watch indexing); Bing + Pinterest are there for the other
 * discovery/organic channels in the launch plan.
 */
add_action('wp_head', 'fom_site_verifications', 1);
function fom_site_verifications(): void
{
    if (is_admin() || is_feed()) {
        return;
    }
    $tags = [
        'google-site-verification' => fom_mu_env('SEARCH_CONSOLE_VERIFICATION'),
        'msvalidate.01'            => fom_mu_env('BING_SITE_VERIFICATION'),
        'p:domain_verify'          => fom_mu_env('PINTEREST_SITE_VERIFICATION'),
    ];
    $out = '';
    foreach ($tags as $name => $value) {
        $value = trim((string) $value);
        if ($value !== '') {
            $out .= '<meta name="' . esc_attr($name) . '" content="' . esc_attr($value) . '">' . "\n";
        }
    }
    if ($out !== '') {
        echo "\n" . $out;
    }
}

/**
 * Google Analytics 4 — Consent Mode v2 aware. Emitted only when GA_ENABLE is on and a
 * well-formed Measurement ID (G-XXXX) is set. Calls fom_mu_consent_default() first so the
 * denied-by-default state exists even when ad serving is off (the AdSense loader would
 * otherwise be the only thing that emits it); analytics_storage stays 'denied' for EEA/UK/CH
 * until the CMP grants, so GA runs cookielessly (modelled) there — compliant during the
 * approval window and after. Priority 11 keeps it after the AdSense/consent block (9).
 */
add_action('wp_head', 'fom_ga4_head', 11);
function fom_ga4_head(): void
{
    if (is_admin() || is_feed()) {
        return;
    }
    if (!fom_mu_env_bool('GA_ENABLE')) {
        return;
    }
    $id = trim(fom_mu_env('GA_MEASUREMENT_ID'));
    if (!preg_match('/^G-[A-Z0-9]{4,}$/i', $id)) {
        return; // never emit a malformed measurement id
    }

    if (function_exists('fom_mu_consent_default')) {
        fom_mu_consent_default();
    }

    echo '<link rel="preconnect" href="https://www.googletagmanager.com">' . "\n";
    echo '<script async src="https://www.googletagmanager.com/gtag/js?id=' . rawurlencode($id) . '"></script>' . "\n";
    echo '<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}'
        . "gtag('js',new Date());gtag('config','" . esc_js($id) . "');</script>" . "\n";
}

/*
 * Histats was REMOVED 2026-09-04 (was a hard-disabled no-op stub since 2026-09-03; now fully deleted).
 * Its snippet runtime-injected a chain of unvetted third-party DATA BROKERS (DTScout / Lotame / OnAudience /
 * Market Metrics) that fired BEFORE the consent gate — a privacy/GDPR + AdSense liability, plus 10+ extra
 * third-party origins. GA4 via Google Site Kit covers analytics. Do NOT re-add Histats; if a visitor counter
 * is ever wanted, use a privacy-respecting, consent-gated one. The HISTATS_ENABLE / HISTATS_CODE_BASE64 env
 * vars are now inert — clear them in the Coolify env for tidiness.
 */
