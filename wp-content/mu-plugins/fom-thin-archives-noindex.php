<?php
/**
 * Plugin Name: Frame of Mind Thin-Archive Hygiene (noindex + de-sitemap tag/author/date)
 * Description: kepoli had 611 tags for 133 posts — 81 empty, 415 used exactly ONCE, 67 twice — and all ~530
 *   non-empty tag archives were INDEXABLE and listed in the core XML sitemap. That hands Google hundreds of
 *   thin, auto-generated, near-duplicate archive pages (each a single post's excerpt), swamping the 81 real
 *   posts — a textbook "thin content / low value" signal for both Search and AdSense review. Author and date
 *   archives are likewise indexable duplicates of the blog feed on a single-author site. This plugin:
 *     1. removes the `post_tag` taxonomy from the XML sitemap (wp_sitemaps_taxonomies),
 *     2. adds `noindex` to tag, author, and date archives (they stay `follow` so crawl/link-equity flows),
 *     3. one-time, deletes the 81 EMPTY tags (0 posts) as pure cruft.
 *   Search results are already noindex via core. Category archives stay indexable (they're curated, few, and
 *   now carry intro copy). Read-only filters on the front end; the empty-tag purge is admin/cron + option-
 *   guarded + try/catch. Reversible (remove the file). Deploy = commit kepoli repo -> Coolify redeploy.
 *
 * @package Kepoli
 */

if (!defined('ABSPATH')) {
    exit;
}

/* 1) Drop tag archives from the core XML sitemap (they carry no unique value). Categories stay. */
add_filter('wp_sitemaps_taxonomies', static function (array $taxonomies): array {
    unset($taxonomies['post_tag']);
    return $taxonomies;
});

/* 2) noindex tag / author / date archives (keep "follow" so internal links are still crawled). Priority 26 to
 *    win over core (pri 10) and sit alongside fom-empty-category-noindex (also 26). */
add_filter('wp_robots', static function (array $robots): array {
    if (is_tag() || is_author() || is_date()) {
        $robots['noindex'] = true;
        $robots['follow']  = true;
        unset($robots['index']);
    }
    return $robots;
}, 26);

/* The one-time empty-tag purge that lived here (deleted the 81 empty tags, 611→530, guarded by the option
   fom_purge_empty_tags_v1) COMPLETED and was retired 2026-09-04 — the ongoing noindex + de-sitemap filters
   above are what stay. (A fresh install never accumulates the sprawl, so the migration isn't needed again.) */
