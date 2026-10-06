<?php
/**
 * Full-article social posts (9.45.0) — sometimes post the WHOLE article text to Facebook / Instagram instead of the
 * short hook, which helps a fresh Page grow (people read and react without leaving the app).
 *
 * Controlled in two places:
 *  - Settings: per network, "Full article" = Off / every Nth share / every share  (default Off).
 *  - Per post: an editor box "Social post text" = Follow the setting / Always full article / Never (hook only).
 * Facebook gets the hook + the complete text (link still in the first comment). Instagram captions stop at 2,200
 * characters, so it gets as much of the article as fits, cut at a sentence, then the caption ending + hashtags.
 */
if ( ! defined( 'ABSPATH' ) ) { exit; }

const WPAP_SOCIAL_FB_MAX = 60000;   /* Facebook post text limit is ~63k */

/* "Every Nth share" choices shown in both settings. 0 = off, 1 = every share. */
function wpap_social_full_choices() {
	return array( 0 => 'Off — short hook only', 1 => 'Every share', 2 => 'Every 2nd share', 3 => 'Every 3rd share', 5 => 'Every 5th share', 10 => 'Every 10th share' );
}

function wpap_social_full_clean_every( $v ) {
	$v = (int) $v;
	return array_key_exists( $v, wpap_social_full_choices() ) ? $v : 0;
}

/* Should this share carry the full article? $ch = 'fbp' | 'igp'; $every from that network's setting. */
function wpap_social_full_wanted( $pid, $ch, $every ) {
	$mode = (string) get_post_meta( $pid, '_wpap_social_full', true );
	if ( 'always' === $mode ) { return true; }
	if ( 'never' === $mode ) { return false; }
	$every = (int) $every;
	if ( $every < 1 ) { return false; }
	return 0 === ( (int) get_option( 'wpap_' . $ch . '_full_n', 0 ) + 1 ) % $every;
}

/* Count one successful share toward the "every Nth" rhythm. */
function wpap_social_full_count( $ch ) {
	update_option( 'wpap_' . $ch . '_full_n', (int) get_option( 'wpap_' . $ch . '_full_n', 0 ) + 1, false );
}

/* The article as plain text with paragraph breaks (no HTML, shortcodes, page breaks or link tokens). */
function wpap_social_plain_text( $pid ) {
	$html = (string) get_post_field( 'post_content', $pid );
	$html = str_replace( array( '<!--nextpage-->', '[nextpage]' ), "\n\n", $html );
	$html = preg_replace( '/\[\[link:[^\]]*\]\]/', '', strip_shortcodes( $html ) );
	$html = preg_replace( '#<(script|style|figure|figcaption)\b[^>]*>.*?</\1>#is', '', (string) $html );
	$html = preg_replace( '#<li\b[^>]*>#i', "\n• ", (string) $html );
	$html = preg_replace( '#<br\s*/?>|</(p|h[1-6]|li|blockquote|div|ul|ol)>#i', "\n\n", (string) $html );
	$text = html_entity_decode( wp_strip_all_tags( (string) $html ), ENT_QUOTES, 'UTF-8' );
	$text = preg_replace( '/[ \t]+/u', ' ', (string) $text );
	$text = preg_replace( '/ *\n */u', "\n", (string) $text );
	return trim( (string) preg_replace( "/\n{3,}/", "\n\n", (string) $text ) );
}

/* Cut text to $max characters at the last sentence end (else word), adding "…" when it was shortened. */
function wpap_social_fit( $text, $max ) {
	if ( $max < 20 ) { return ''; }
	if ( mb_strlen( $text ) <= $max ) { return $text; }
	$cut = mb_substr( $text, 0, $max - 1 );
	$end = max( (int) mb_strrpos( $cut, '. ' ), (int) mb_strrpos( $cut, ".\n" ), (int) mb_strrpos( $cut, '? ' ), (int) mb_strrpos( $cut, '! ' ) );
	if ( $end > $max * 0.5 ) { return mb_substr( $cut, 0, $end + 1 ) . ' …'; }
	$sp = (int) mb_strrpos( $cut, ' ' );
	return rtrim( mb_substr( $cut, 0, $sp > 0 ? $sp : $max - 1 ) ) . '…';
}

/* Facebook: hook + the whole article. */
function wpap_social_fb_full_caption( $pid, $hook ) {
	$body = wpap_social_plain_text( $pid );
	if ( '' === $body ) { return $hook; }
	return wpap_social_fit( $hook . "\n\n" . $body, WPAP_SOCIAL_FB_MAX );
}

/* ── Per-post control in the editor ─────────────────────────────────────────────────────────────────────── */

add_action( 'add_meta_boxes_post', function () {
	add_meta_box( 'wpap-social-full', 'Social post text', 'wpap_social_full_box', 'post', 'side', 'low' );
} );

function wpap_social_full_box( $post ) {
	$mode = (string) get_post_meta( $post->ID, '_wpap_social_full', true );
	wp_nonce_field( 'wpap_social_full', 'wpap_social_full_nonce' );
	$opts = array( '' => 'Follow the setting', 'always' => 'Always the full article', 'never' => 'Never (short hook only)' );
	echo '<p style="margin-top:0">For Facebook &amp; Instagram auto-posts.</p><select name="wpap_social_full" style="width:100%">';
	foreach ( $opts as $v => $label ) {
		echo '<option value="' . esc_attr( $v ) . '"' . selected( $mode, $v, false ) . '>' . esc_html( $label ) . '</option>';
	}
	echo '</select>';
}

add_action( 'save_post_post', function ( $pid ) {
	if ( ! isset( $_POST['wpap_social_full_nonce'] ) || ! wp_verify_nonce( sanitize_key( wp_unslash( $_POST['wpap_social_full_nonce'] ) ), 'wpap_social_full' ) ) { return; }
	if ( ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) || ! current_user_can( 'edit_post', $pid ) ) { return; }
	$mode = sanitize_key( wp_unslash( $_POST['wpap_social_full'] ?? '' ) );
	if ( in_array( $mode, array( 'always', 'never' ), true ) ) {
		update_post_meta( $pid, '_wpap_social_full', $mode );
	} else {
		delete_post_meta( $pid, '_wpap_social_full' );
	}
} );

/* The settings dropdown (shared markup for both networks). */
function wpap_social_full_select( $name, $every ) {
	echo '<select name="' . esc_attr( $name ) . '">';
	foreach ( wpap_social_full_choices() as $v => $label ) {
		echo '<option value="' . (int) $v . '"' . selected( (int) $every, $v, false ) . '>' . esc_html( $label ) . '</option>';
	}
	echo '</select>';
}

add_filter( 'wpap_help_tips_extra', function ( $t ) {
	return array_merge( (array) $t, array(
		'social_full' => '<strong>Sometimes post the whole article</strong> instead of the short hook — good for a new Page: people read and react inside the app, which grows reach.<br><strong>How:</strong> pick how often (e.g. every 3rd share). To force it for one post, open the post &rarr; side box <em>Social post text</em> &rarr; <em>Always the full article</em> (or <em>Never</em>).<br><strong>Facebook</strong> gets the hook + the complete text; the link stays in the first comment.<br><strong>Instagram</strong> captions stop at 2,200 characters, so it gets as much as fits, cut at a sentence, then your caption ending.<br><em>Default: Off.</em>',
	) );
} );
