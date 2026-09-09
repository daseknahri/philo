<?php
/**
 * Plugin Name: Frame of Mind Empty-Category Noindex
 * Description: Any category with ZERO posts still resolves at /category/<slug>/ as a live, crawlable but
 *   empty archive — a thin page an AdSense reviewer or Googlebot could hit directly (kepoli has a few
 *   leftovers incl. a Romanian one from the RO→EN conversion). WP core already keeps empty terms out of the
 *   taxonomy sitemap (hide_empty), so the only exposure is the direct URL. This noindexes any empty category
 *   archive via WP core's wp_robots API. Self-healing (covers any future empty category), read-only, cheap.
 *
 * @package Kepoli
 */

if (!defined('ABSPATH')) {
    exit;
}

add_filter('wp_robots', 'fom_noindex_empty_category', 26);
function fom_noindex_empty_category($robots)
{
    if (!is_array($robots) || is_admin() || !is_category()) {
        return $robots;
    }
    $term = get_queried_object();
    if ($term instanceof WP_Term && (int) $term->count === 0) {
        unset($robots['index']);
        $robots['noindex'] = true;
    }
    return $robots;
}
