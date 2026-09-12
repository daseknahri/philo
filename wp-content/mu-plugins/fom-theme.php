<?php
/**
 * Plugin Name: Frame of Mind Theme Skin & Media
 * Description: Turns on the Viral Reader "cinematic" dark skin and wires Frame of Mind's
 *   generated cover art into the theme's presentation hooks: a standing homepage hero, a
 *   cover banner per category, a per-post featured-image fallback, and an always-visible
 *   pillar showcase. All of this is filter-driven in the theme (default off), so this file
 *   is the single per-site place that maps the hooks to the shipped art in the theme's
 *   assets/img. Swap the fom-cover-*.jpg files (e.g. for AI-generated heroes) and nothing
 *   here changes.
 *
 * @package FrameOfMind
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/* Opt the theme into its moody, film-forward dark skin. */
add_filter( 'vr_skin', static function () {
	return 'cinematic';
} );

/* The site's five pillars, in editorial order, each mapped to its cover art file. */
function fom_pillar_covers() {
	return array(
		'film'       => 'fom-cover-film.jpg',
		'philosophy' => 'fom-cover-philosophy.jpg',
		'psychology' => 'fom-cover-psychology.jpg',
		'books'      => 'fom-cover-books.jpg',
		'life'       => 'fom-cover-life.jpg',
	);
}

function fom_theme_asset_uri( $file ) {
	return get_template_directory_uri() . '/assets/img/' . ltrim( (string) $file, '/' );
}

/* Standing homepage hero image. */
add_filter( 'vr_hero_image_url', static function () {
	return fom_theme_asset_uri( 'fom-hero.jpg' );
} );

/* Per-category cover banner (category archive header + homepage topic tiles). */
add_filter( 'vr_category_cover_url', static function ( $url, $term_id ) {
	$term = $term_id ? get_term( (int) $term_id ) : null;
	if ( $term instanceof WP_Term ) {
		$map = fom_pillar_covers();
		if ( isset( $map[ $term->slug ] ) ) {
			return fom_theme_asset_uri( $map[ $term->slug ] );
		}
	}
	return $url;
}, 10, 2 );

/* Featured-image fallback: a post with no image shows its primary pillar's cover, else the
   brand default — so cards, hero, and single view are never blank. */
add_filter( 'vr_fallback_image_url', static function ( $url, $post_id ) {
	$cats = get_the_category( (int) $post_id );
	if ( ! empty( $cats ) && $cats[0] instanceof WP_Term ) {
		$map = fom_pillar_covers();
		if ( isset( $map[ $cats[0]->slug ] ) ) {
			return fom_theme_asset_uri( $map[ $cats[0]->slug ] );
		}
	}
	return fom_theme_asset_uri( 'fom-default-featured.jpg' );
}, 10, 2 );

/* The five pillar terms, in editorial order (memoized). */
function fom_pillar_terms() {
	static $terms = null;
	if ( null === $terms ) {
		$terms = array();
		foreach ( array_keys( fom_pillar_covers() ) as $slug ) {
			$t = get_term_by( 'slug', $slug, 'category' );
			if ( $t instanceof WP_Term ) {
				$terms[] = $t;
			}
		}
	}
	return $terms;
}

/* Always show the five pillars — in editorial order, even before they have posts — in the
   homepage showcase AND everywhere the theme lists "top categories" (footer Explore column,
   sidebar Topics block, mobile fallback menu). The theme's defaults use hide_empty, which
   renders an empty/uneven list pre-launch and while posts ramp up unevenly. */
add_filter( 'vr_showcase_categories', static function ( $default ) {
	$terms = fom_pillar_terms();
	return ! empty( $terms ) ? $terms : $default;
} );
add_filter( 'vr_top_categories', static function ( $default, $n ) {
	$terms = fom_pillar_terms();
	if ( empty( $terms ) ) {
		return $default;
	}
	return array_slice( $terms, 0, max( 0, (int) $n ) );
}, 10, 2 );

/* Connect the (noindexed) author archive to the indexed About-the-Author bio page. */
add_filter( 'vr_author_profile_url', static function () {
	$page = get_page_by_path( 'about-the-author' );
	return $page instanceof WP_Post ? (string) get_permalink( $page ) : '';
} );
