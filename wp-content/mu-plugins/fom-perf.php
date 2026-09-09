<?php
/**
 * Plugin Name: Kepoli Performance Trims
 * Description: Small, safe front-end trims for a mobile-first content site (per a 2026-09-03 performance
 *   audit that found the viral-reader theme already well-optimized — system fonts, inlined critical CSS,
 *   textbook LCP preload+fetchpriority, conditional block-CSS dequeue, lazy below-fold, Histats/data-brokers
 *   already removed). This removes the last removable WP head/footer cruft (emoji detection script + styles +
 *   the s.w.org dns-prefetch, and wp-embed) and warms the TCP/TLS connections for Google's ad/analytics
 *   origins (helps the async ad/gtag fetch, especially once ads serve post-approval). Front-end only; admin
 *   and feeds untouched. Reversible (delete the file).
 *
 * @package Kepoli
 */

if (!defined('ABSPATH')) {
    exit;
}

/* --- wp-emoji: drop the inline detection script (wp_head pri 7), the emoji <style>, and the on-demand
 *     twemoji fallback. Content is served as real Unicode, so none of it is needed. ------------------------ */
add_action('init', static function (): void {
    remove_action('wp_head', 'print_emoji_detection_script', 7);
    remove_action('wp_print_styles', 'print_emoji_styles');
    remove_action('admin_print_scripts', 'print_emoji_detection_script');
    remove_action('admin_print_styles', 'print_emoji_styles');
    remove_filter('the_content_feed', 'wp_staticize_emoji');
    remove_filter('comment_text_rss', 'wp_staticize_emoji');
    remove_filter('wp_mail', 'wp_staticize_emoji_for_email');
});
add_filter('tiny_mce_plugins', static function ($plugins) {
    return is_array($plugins) ? array_values(array_diff($plugins, ['wpemoji'])) : $plugins;
});

/* --- wp-embed.min.js: only powers embedding THIS site's posts inside other sites — irrelevant for a
 *     FB-traffic → article → AdSense flow. Third-party oEmbeds (YouTube, etc.) still work without it. ------- */
add_action('wp_enqueue_scripts', static function (): void {
    wp_dequeue_script('wp-embed');
}, 100);

/* --- Resource hints: warm the Google ad/analytics connections early, and strip the emoji s.w.org
 *     dns-prefetch that core adds (pairs with the emoji removal above). WordPress dedupes these against
 *     Site Kit's own hints, so double-adding is harmless. ------------------------------------------------- */
add_filter('wp_resource_hints', static function (array $hints, string $relation): array {
    if ('preconnect' === $relation) {
        $hints[] = ['href' => 'https://www.googletagmanager.com', 'crossorigin' => 'anonymous'];
        $hints[] = ['href' => 'https://pagead2.googlesyndication.com', 'crossorigin' => 'anonymous'];
    }
    if ('dns-prefetch' === $relation) {
        foreach (['https://googleads.g.doubleclick.net', 'https://tpc.googlesyndication.com', 'https://www.google-analytics.com'] as $u) {
            $hints[] = $u;
        }
        $hints = array_values(array_filter($hints, static function ($h) {
            $href = is_array($h) ? ($h['href'] ?? '') : (string) $h;
            return false === strpos((string) $href, '//s.w.org');
        }));
    }
    return $hints;
}, 10, 2);
