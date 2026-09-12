<?php
/**
 * Plugin Name: Frame of Mind Schema (Organization + WebSite)
 * Description: Emits site-wide Organization and WebSite (SearchAction) JSON-LD to
 *   complete the structured-data set. The theme emits Recipe + BreadcrumbList and the
 *   automation-hamri plugin emits Article/BlogPosting on managed posts; neither emits
 *   a site-level Organization or WebSite node, so this fills that gap. Defers entirely
 *   to a dedicated SEO plugin (Yoast/Rank Math/AIOSEO/SEOPress) if one is ever active.
 *
 * @package FrameOfMind
 */

if (!defined('ABSPATH')) {
    exit;
}

add_action('wp_head', 'fom_schema_jsonld', 5);
function fom_schema_jsonld(): void
{
    // A dedicated SEO plugin would own these nodes — don't double up.
    if (defined('WPSEO_VERSION') || defined('RANK_MATH_VERSION') || function_exists('seopress_init') || defined('AIOSEO_VERSION')) {
        return;
    }
    if (is_admin() || is_feed() || is_search() || is_404()) {
        return;
    }

    $name = get_bloginfo('name');
    $home = home_url('/');
    $org_id = $home . '#organization';
    $site_id = $home . '#website';

    $logo = function_exists('get_site_icon_url') ? get_site_icon_url(512) : '';
    if (!$logo) {
        $logo = get_template_directory_uri() . '/assets/img/frame-of-mind-icon.png';
    }

    $graph = [
        [
            '@type'       => 'Organization',
            '@id'         => $org_id,
            'name'        => $name,
            'url'         => $home,
            'description' => get_bloginfo('description'),
            'logo'        => [
                '@type'  => 'ImageObject',
                'url'    => $logo,
                'width'  => 512,
                'height' => 512,
            ],
        ],
        [
            '@type'      => 'WebSite',
            '@id'        => $site_id,
            'name'       => $name,
            'url'        => $home,
            'publisher'  => ['@id' => $org_id],
            'inLanguage' => str_replace('_', '-', get_locale()),
            'potentialAction' => [
                '@type'  => 'SearchAction',
                'target' => [
                    '@type'       => 'EntryPoint',
                    'urlTemplate' => $home . '?s={search_term_string}',
                ],
                'query-input' => 'required name=search_term_string',
            ],
        ],
    ];

    $data = ['@context' => 'https://schema.org', '@graph' => $graph];

    // JSON_HEX_TAG|JSON_HEX_AMP neutralize a literal </script> (or &) in any value,
    // matching the theme's own JSON-LD emitters and preventing a script-block breakout.
    echo "\n" . '<script type="application/ld+json">'
        . wp_json_encode($data, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE)
        . '</script>' . "\n";
}

/**
 * Meta description + Open Graph + Twitter Card for the FRONT PAGE and static
 * PAGES. The automation-hamri plugin already emits these on managed posts
 * (_wpap_smart_link); pages and the home page are not managed, so without this
 * they ship with no description/OG. Defers to a real SEO plugin if present, and
 * skips plugin-managed posts to avoid duplicate tags.
 */
add_action('wp_head', 'fom_seo_meta_head', 4);
function fom_seo_meta_head(): void
{
    if (defined('WPSEO_VERSION') || defined('RANK_MATH_VERSION') || function_exists('seopress_init') || defined('AIOSEO_VERSION')) {
        return;
    }
    if (is_admin() || is_feed()) {
        return;
    }
    // Only home + static pages here; posts are handled by the plugin.
    if (!is_front_page() && !is_page()) {
        return;
    }
    $qid = get_queried_object_id();
    if ($qid && get_post_meta($qid, '_wpap_smart_link', true)) {
        return; // a managed post standing in as the front page — let the plugin own it
    }

    $desc = '';
    if ($qid) {
        $desc = (string) get_post_meta($qid, '_fom_meta_description', true);
        if ($desc === '' && has_excerpt($qid)) {
            // Only call get_the_excerpt when a real manual excerpt exists — otherwise
            // WP core boots the full the_content filter pipeline just to derive one,
            // duplicating the body render inside <head>. The raw-content trim below
            // covers the no-excerpt case cheaply.
            $desc = wp_strip_all_tags((string) get_the_excerpt($qid));
        }
        if ($desc === '') {
            $p = get_post($qid);
            $desc = $p ? wp_trim_words(wp_strip_all_tags($p->post_content), 30, '') : '';
        }
    }
    if (trim($desc) === '') {
        $desc = (string) get_bloginfo('description');
    }
    $desc = trim(preg_replace('/\s+/', ' ', $desc));

    $title = wp_get_document_title();
    $url   = is_front_page() ? home_url('/') : get_permalink($qid);
    // Social share image: prefer a real landscape cover (>=1200x630) for a proper
    // summary_large_image card; otherwise fall back to the square site icon with a
    // summary card (a square image on a large card gets cropped/downgraded).
    $cover_rel = '/assets/img/frame-of-mind-social-cover.jpg';
    if (file_exists(get_template_directory() . $cover_rel)) {
        $img  = get_template_directory_uri() . $cover_rel;
        $card = 'summary_large_image';
    } else {
        $img = function_exists('get_site_icon_url') ? get_site_icon_url(512) : '';
        if (!$img) {
            $img = get_template_directory_uri() . '/assets/img/fom-icon.png';
        }
        $card = 'summary';
    }

    $out  = "\n";
    $out .= '<meta name="description" content="' . esc_attr($desc) . '">' . "\n";
    $out .= '<meta property="og:type" content="website">' . "\n";
    $out .= '<meta property="og:site_name" content="' . esc_attr(get_bloginfo('name')) . '">' . "\n";
    $out .= '<meta property="og:title" content="' . esc_attr($title) . '">' . "\n";
    $out .= '<meta property="og:description" content="' . esc_attr($desc) . '">' . "\n";
    $out .= '<meta property="og:url" content="' . esc_url($url) . '">' . "\n";
    $out .= '<meta property="og:image" content="' . esc_url($img) . '">' . "\n";
    $out .= '<meta name="twitter:card" content="' . esc_attr($card) . '">' . "\n";
    $out .= '<meta name="twitter:title" content="' . esc_attr($title) . '">' . "\n";
    $out .= '<meta name="twitter:description" content="' . esc_attr($desc) . '">' . "\n";
    $out .= '<meta name="twitter:image" content="' . esc_url($img) . '">' . "\n";
    echo $out;
}

/**
 * Canonical URL for ARCHIVE views (category, tag, custom taxonomy, author,
 * post-type archive, and the blog posts index).
 *
 * WordPress core emits rel=canonical only on SINGULAR views; archives get none.
 * With the site's /%category%/%postname%/ permalinks, every category archive is
 * reachable at BOTH /category/<slug>/ (the base form used by the menu, breadcrumbs,
 * and wp-sitemap) AND the base-less /<slug>/ that the permalink structure also
 * resolves — the same page at two URLs with nothing telling Google which is primary
 * (duplicate content). Emitting the term's own canonical on whichever URL was
 * requested consolidates both to the single /category/<slug>/ form already used
 * everywhere else. Defers to a real SEO plugin, and never touches singular or the
 * front page (core / fom_seo_meta_head own those) to avoid a double canonical.
 */
add_action('wp_head', 'fom_archive_canonical', 3);
function fom_archive_canonical(): void
{
    if (defined('WPSEO_VERSION') || defined('RANK_MATH_VERSION') || function_exists('seopress_init') || defined('AIOSEO_VERSION')) {
        return;
    }
    if (is_admin() || is_feed() || is_singular() || is_front_page() || is_404() || is_search()) {
        return;
    }

    $url = '';
    if (is_category() || is_tag() || is_tax()) {
        $term = get_queried_object();
        if ($term instanceof WP_Term) {
            $link = get_term_link($term);
            if (!is_wp_error($link)) {
                $url = $link;
            }
        }
    } elseif (is_author()) {
        $url = get_author_posts_url((int) get_queried_object_id());
    } elseif (is_post_type_archive()) {
        $pt = get_query_var('post_type');
        if (is_array($pt)) {
            $pt = reset($pt);
        }
        $link = get_post_type_archive_link((string) $pt);
        if ($link) {
            $url = $link;
        }
    } elseif (is_home()) {
        // Reached only when a static front page is set (front page returned above);
        // this is the separate blog posts index.
        $posts_page = (int) get_option('page_for_posts');
        $url = $posts_page ? (string) get_permalink($posts_page) : home_url('/');
    }

    if ($url === '') {
        return;
    }

    // A paginated archive (/page/N/) is its own canonical, not a duplicate of page 1.
    $paged = (int) get_query_var('paged');
    if ($paged > 1) {
        $url = trailingslashit($url) . 'page/' . $paged . '/';
    }

    echo "\n" . '<link rel="canonical" href="' . esc_url($url) . '">' . "\n";
}
