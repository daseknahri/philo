<?php
/**
 * Plugin Name: Frame of Mind Author
 * Description: Pins bulk-published posts to the site's real bylined writer (Dasek Nahri)
 *   rather than whichever admin account is logged in, so the byline, author archive, and
 *   Person/E-E-A-T schema all point at the writer. Frame of Mind is a single-author blog;
 *   the writer is the account seeded from WRITER_EMAIL. Memoized; safe when the user is
 *   missing (falls back to the plugin's default = current user).
 *
 * @package FrameOfMind
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function fom_writer_user_id() {
	static $id = null;
	if ( null === $id ) {
		$id = 0;
		$email = getenv( 'WRITER_EMAIL' ) ?: '';
		if ( '' !== $email ) {
			$u = get_user_by( 'email', $email );
			if ( $u instanceof WP_User ) {
				$id = (int) $u->ID;
			}
		}
		if ( 0 === $id ) {
			$u = get_user_by( 'slug', 'dasek-nahri' );
			if ( $u instanceof WP_User ) {
				$id = (int) $u->ID;
			}
		}
	}
	return $id;
}

add_filter( 'wpap_default_author', static function ( $default ) {
	$id = fom_writer_user_id();
	return $id > 0 ? $id : $default;
} );
