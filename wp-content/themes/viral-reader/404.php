<?php
/**
 * 404.
 *
 * @package Viral_Reader
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

get_header();
?>
<div class="vr-container section">
	<p class="eyebrow">404</p>
	<h1><?php esc_html_e( 'Page not found', 'viral-reader' ); ?></h1>
	<p style="color:var(--muted);max-width:52ch"><?php esc_html_e( 'The page you were looking for isn\'t here. Try a search, or head back to the homepage.', 'viral-reader' ); ?></p>
	<?php get_search_form(); ?>
	<p style="margin-top:1.2em"><a class="vr-btn" href="<?php echo esc_url( home_url( '/' ) ); ?>"><?php esc_html_e( 'Back to homepage', 'viral-reader' ); ?></a></p>
</div>
<?php
get_footer();
