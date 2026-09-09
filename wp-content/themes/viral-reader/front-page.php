<?php
/**
 * Front page — hero + category band + latest grid.
 * Runs its own queries so it works whether the front page shows posts or a
 * static page.
 *
 * @package Viral_Reader
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

get_header();

$vr_latest = vr_front_query();   /* shared with vr_preload_lcp; reuses the main query on posts-on-home */
$vr_posts  = $vr_latest->posts;
$vr_paged  = is_paged();
$vr_hero   = ( ! $vr_paged && ! empty( $vr_posts ) ) ? $vr_posts[0] : null;
?>

<?php if ( $vr_hero ) : ?>
	<div class="vr-container">
		<section class="home-hero">
			<?php
			$vr_hero_id = get_post_thumbnail_id( $vr_hero );
			if ( $vr_hero_id ) {
				echo wp_get_attachment_image( $vr_hero_id, 'large', false, array( 'class' => 'home-hero__img', 'alt' => '', 'loading' => 'eager', 'fetchpriority' => 'high', 'decoding' => 'async', 'sizes' => '100vw' ) );
			} else {
				/* External featured image fallback: posts published without a downloaded
				   image store the remote URL in _wpap_image_url (WP Automator Pro). Show it
				   straight from the URL so the hero still has its picture. */
				$vr_hero_ext = vr_external_image_url( $vr_hero->ID );
				if ( '' !== $vr_hero_ext ) {
					printf( '<img class="home-hero__img" src="%s" alt="" loading="eager" fetchpriority="high" decoding="async" />', esc_url( $vr_hero_ext ) );
				}
			}
			$vr_hcats = get_the_category( $vr_hero->ID );
			?>
			<div class="home-hero__inner">
				<?php if ( ! empty( $vr_hcats ) ) : ?>
					<p class="eyebrow"><?php echo esc_html( $vr_hcats[0]->name ); ?></p>
				<?php endif; ?>
				<h1><a href="<?php echo esc_url( get_permalink( $vr_hero ) ); ?>"><?php echo esc_html( get_the_title( $vr_hero ) ); ?></a></h1>
				<p><?php echo esc_html( wp_trim_words( get_the_excerpt( $vr_hero ), 26, '…' ) ); ?></p>
				<div class="home-hero__meta">
					<span><?php echo vr_icon( 'clock' ); // phpcs:ignore WordPress.Security.EscapeOutput -- static SVG ?><?php echo esc_html( vr_reading_time( $vr_hero->ID ) ); ?></span>
					<span><?php echo vr_icon( 'calendar' ); // phpcs:ignore WordPress.Security.EscapeOutput -- static SVG ?><?php echo esc_html( get_the_date( '', $vr_hero ) ); ?></span>
				</div>
				<a class="vr-btn" href="<?php echo esc_url( get_permalink( $vr_hero ) ); ?>"><?php esc_html_e( 'Read the story', 'viral-reader' ); ?> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
			</div>
		</section>
	</div>
<?php elseif ( empty( $vr_posts ) || $vr_paged ) : ?>
	<?php /* Give the front page a valid single-h1 outline whenever there is no hero:
	   either genuinely no posts, OR a paged view (/page/2+) which intentionally shows
	   no hero. Without this, paged posts-on-home views would render only h2s. */ ?>
	<div class="vr-container section--tight">
		<header class="archive-header">
			<h1><?php echo esc_html( get_bloginfo( 'name' ) ); ?></h1>
			<?php $vr_tagline = get_bloginfo( 'description', 'display' ); ?>
			<?php if ( $vr_tagline ) : ?><p><?php echo esc_html( $vr_tagline ); ?></p><?php endif; ?>
		</header>
		<?php if ( empty( $vr_posts ) ) : ?>
			<?php /* Truly no posts: give the same empty-state affordance the other templates do. */ ?>
			<div class="vr-empty">
				<p><?php esc_html_e( 'No stories yet — check back soon.', 'viral-reader' ); ?></p>
				<?php get_search_form(); ?>
			</div>
		<?php endif; ?>
	</div>
<?php endif; ?>

<?php
/* Optional: a static front page's own content, if assigned + has content. */
if ( is_page() ) {
	while ( have_posts() ) :
		the_post();
		if ( '' !== trim( (string) get_the_content() ) ) {
			echo '<div class="vr-container section--tight"><div class="entry-content" style="max-width:var(--measure);margin-inline:auto">';
			the_content();
			echo '</div></div>';
		}
	endwhile;
}
?>

<?php $vr_cats = vr_top_categories( 8 ); ?>
<?php if ( ! empty( $vr_cats ) ) : ?>
	<section class="category-band section--tight">
		<div class="vr-container">
			<div class="section-head"><p class="eyebrow"><?php esc_html_e( 'Browse', 'viral-reader' ); ?></p><h2><?php esc_html_e( 'Explore by topic', 'viral-reader' ); ?></h2></div>
			<div class="category-list">
				<?php foreach ( $vr_cats as $vr_c ) : ?>
					<?php $vr_cl = get_category_link( $vr_c->term_id ); ?>
					<a class="category-card" href="<?php echo esc_url( is_wp_error( $vr_cl ) ? '#' : $vr_cl ); ?>">
						<span class="count"><?php /* translators: %d: number of stories */ echo esc_html( sprintf( _n( '%d story', '%d stories', (int) $vr_c->count, 'viral-reader' ), (int) $vr_c->count ) ); ?></span>
						<h3><?php echo esc_html( $vr_c->name ); ?></h3>
						<?php if ( $vr_c->description ) : ?><p><?php echo esc_html( wp_trim_words( $vr_c->description, 16, '…' ) ); ?></p><?php endif; ?>
					</a>
				<?php endforeach; ?>
			</div>
		</div>
	</section>
<?php endif; ?>

<?php
/* Page 1 renders the hero as $vr_posts[0], so the grid skips it; paged views
   (posts-on-home /page/N) have no hero and show every post for that page. */
$vr_grid = $vr_paged ? $vr_posts : array_slice( $vr_posts, 1 );
if ( ! empty( $vr_grid ) ) :
	$vr_posts_page = (int) get_option( 'page_for_posts' );
	?>
	<section class="section">
		<div class="vr-container">
			<div class="section-head section-head--row">
				<div><p class="eyebrow"><?php esc_html_e( 'Fresh', 'viral-reader' ); ?></p><h2><?php esc_html_e( 'Latest stories', 'viral-reader' ); ?></h2></div>
				<?php if ( $vr_posts_page && ! $vr_paged ) : ?>
					<a class="section-head__more" href="<?php echo esc_url( get_permalink( $vr_posts_page ) ); ?>"><?php esc_html_e( 'See all stories →', 'viral-reader' ); ?></a>
				<?php endif; ?>
			</div>
			<div class="post-grid">
				<?php
				foreach ( $vr_grid as $vr_p ) {
					$post = $vr_p; // phpcs:ignore WordPress.WP.GlobalVariablesOverride
					setup_postdata( $post );
					get_template_part( 'template-parts/card' );
				}
				wp_reset_postdata();
				?>
			</div>
			<?php
			/* Posts-on-homepage config: paginate the full archive so posts past the
			   first page are reachable. vr_pagination() reads the main query, which
			   vr_front_query() reuses on this config. A static-page front instead
			   uses the "See all stories" link above (no /page/N archive of its own). */
			if ( ! is_page() && (int) $vr_latest->max_num_pages > 1 ) {
				vr_pagination();
			}
			?>
		</div>
	</section>
<?php endif; ?>

<?php
get_footer();
