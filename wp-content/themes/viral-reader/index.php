<?php
/**
 * Fallback index / blog home.
 *
 * @package Viral_Reader
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

get_header();
?>
<div class="vr-container">
	<?php if ( is_home() && ! is_front_page() ) : ?>
		<header class="archive-header"><?php vr_breadcrumbs(); ?><h1><?php single_post_title(); ?></h1></header>
	<?php endif; ?>

	<?php if ( have_posts() ) : ?>
		<div class="post-grid section--tight">
			<?php
			$vr_i = 0;
			while ( have_posts() ) :
				the_post();
				get_template_part( 'template-parts/card', null, array( 'lead' => ( 0 === $vr_i && ! is_paged() ), 'heading' => 'h2' ) );
				$vr_i++;
			endwhile;
			?>
		</div>
		<?php vr_pagination(); ?>
	<?php else : ?>
		<div class="vr-empty">
			<h2><?php esc_html_e( 'No posts yet', 'viral-reader' ); ?></h2>
			<p><?php esc_html_e( 'There’s nothing here yet — check back soon.', 'viral-reader' ); ?></p>
			<a class="vr-btn" href="<?php echo esc_url( home_url( '/' ) ); ?>"><?php esc_html_e( 'Back home', 'viral-reader' ); ?></a>
		</div>
	<?php endif; ?>
</div>
<?php
get_footer();
