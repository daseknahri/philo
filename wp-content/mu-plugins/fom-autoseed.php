<?php
/**
 * Plugin Name: Frame of Mind Auto Seed
 * Description: Self-heals a fresh WordPress install when the one-shot WP-CLI seed did not run in the host platform.
 */

if (!defined('ABSPATH')) {
    exit;
}

if (file_exists('/seed/version.php')) {
    require_once '/seed/version.php';
}

function fom_autoseed_env(string $key, string $default = ''): string
{
    $value = getenv($key);
    if ($value === false || $value === '') {
        return $default;
    }

    return (string) $value;
}

function fom_autoseed_env_bool(string $key, bool $default = false): bool
{
    $value = strtolower(trim(fom_autoseed_env($key, $default ? '1' : '0')));
    if (in_array($value, ['1', 'true', 'yes', 'on'], true)) {
        return true;
    }
    if (in_array($value, ['0', 'false', 'no', 'off'], true)) {
        return false;
    }

    return $default;
}

/**
 * Pretty-permalink self-heal. A Coolify redeploy updates code but does NOT run the WP-CLI seed
 * (`bootstrap.sh`, which runs `wp rewrite structure --hard`). When the site is instead seeded
 * in-process by the autoseed path below — which requires bootstrap.php directly — the
 * `permalink_structure` option can end up empty on the live DB. Then WordPress has no pretty
 * structure to parse against: EVERY pretty URL (category archives, pages, and the plugin's
 * virtual routes — ads.txt, robots.txt, wp-sitemap.xml) silently falls back to the front page
 * (HTTP 200, homepage HTML), the homepage emits ugly `?p=` / `?feed=rss2` links, and — the
 * AdSense-critical symptom — /ads.txt serves the homepage instead of the publisher record.
 *
 * This heals it independently of the seed-version guard (which blocks any re-seed once the site
 * has content): if the site is installed and the structure is not the canonical one, set it and
 * soft-flush ONCE. The guard is a cheap single option read, so on a healthy site (structure
 * correct + rewrite_rules present) it is a near-zero no-op; the flush only runs while broken, and
 * because a soft flush writes the rewrite_rules option, the next request satisfies the guard and
 * stops flushing. A soft flush (no .htaccess write) is sufficient because routing to index.php is
 * handled at the Apache vhost level (docker/wordpress/kepoli-performance.conf), not via .htaccess.
 */
function fom_permalink_self_heal(bool $deep = false): void {
    if (defined('WP_INSTALLING') && WP_INSTALLING) {
        return;
    }
    if (function_exists('is_blog_installed') && !is_blog_installed()) {
        return;
    }
    $canonical = '/%category%/%postname%/';
    $current = (string) get_option('permalink_structure', '');
    // rewrite_rules is stored as an ARRAY (or false/'' when unset) — use !empty(), never a
    // (string) cast, which would emit an "Array to string conversion" warning on every request.
    $rules = get_option('rewrite_rules', '');
    $healthy = is_array($rules) && ! empty($rules);
    // DEEP check: a mere !empty() guard is not enough. After a bulk publish the option can hold the
    // page/feed rules yet be MISSING the %category%/%postname% post rule AND the /category/ archive
    // rule — so every single post and every category archive 404s while the home page and static
    // pages still resolve (observed on Frame of Mind after the 220-post publish). That partial state
    // slipped past the old guard, so the heal never re-ran. Detect it by inspecting the rule targets.
    // Only done on admin_init (see below): admin fires after all post types/taxonomies register, so
    // the ensuing flush regenerates the COMPLETE set — the front-end init pass stays shallow (empty/
    // wrong only) to avoid any chance of thrashing a re-flush on every visitor request.
    if ($healthy && $deep) {
        $targets = implode("\n", array_values($rules));
        $has_post_rule = (strpos($targets, 'name=$matches') !== false); // /%category%/%postname%/
        $has_cat_rule  = (strpos($targets, 'category_name=') !== false); // /category/<slug>/
        $healthy = $has_post_rule && $has_cat_rule;
    }
    if ($current === $canonical && $healthy) {
        return; // healthy: canonical structure + (for deep) the post/category rules are present
    }
    global $wp_rewrite;
    if (!($wp_rewrite instanceof WP_Rewrite)) {
        return;
    }
    if ($current !== $canonical) {
        $wp_rewrite->set_permalink_structure($canonical);
    }
    $wp_rewrite->flush_rules(false); // repopulate rewrite_rules; vhost handles the index.php fallback
    error_log('[fom] permalink self-heal: flushed (structure was "' . $current . '", rules ' . (is_array($rules) ? count($rules) : 0) . ', deep=' . ($deep ? '1' : '0') . ').');
}
// Front-end: cheap heal (structure wrong or rules empty only) at init priority 4.
add_action('init', static function (): void { fom_permalink_self_heal(false); }, 4);
// Admin: deep heal at admin_init — same timing as saving Settings → Permalinks, so its flush always
// regenerates the full rule set and recovers a partial-rules state a plain redeploy can't otherwise fix.
add_action('admin_init', static function (): void { fom_permalink_self_heal(true); }, 20);

/**
 * Admin recovery (opt-in). WP_ADMIN_PASSWORD is applied ONLY at first install by the WP-CLI seed
 * (`bootstrap.sh`, which is profile:seed and does NOT run on a normal redeploy), so a later
 * Coolify password change never reaches the existing admin — "login from env" then fails. Set
 * FOM_RESET_ADMIN=1 for ONE deploy to re-apply the env password + guarantee the administrator
 * role on the WP_ADMIN_USER account, then set it back to 0.
 *
 * Runs at most ONCE per (user + password) value: a marker keyed on a hash of the env credentials
 * is stored, so it never re-fires on later requests. That matters because wp_set_password() kills
 * the user's sessions — a per-request reset would log the admin out in a loop. Changing
 * WP_ADMIN_PASSWORD (or WP_ADMIN_USER) re-arms it for one more reset.
 */
add_action('init', static function (): void {
    if (!fom_autoseed_env_bool('FOM_RESET_ADMIN', false)) {
        return;
    }
    $login = fom_autoseed_env('WP_ADMIN_USER', 'admin');
    $pass  = fom_autoseed_env('WP_ADMIN_PASSWORD', '');
    if ($login === '' || $pass === '') {
        return;
    }
    $want = hash('sha256', $login . '|' . $pass);
    if (get_option('fom_admin_reset_marker') === $want) {
        return; // already applied for this exact credential — don't re-run (avoids a session-kill loop)
    }
    $user = get_user_by('login', $login);
    if (!$user instanceof WP_User) {
        return; // no such account — nothing to recover here
    }
    if (function_exists('wp_set_password')) {
        wp_set_password($pass, $user->ID); // resets the password (invalidates old sessions once)
    }
    $user->set_role('administrator');      // guarantee the admin can reach wp-admin
    update_option('fom_admin_reset_marker', $want, false);
    error_log('[kepoli] FOM_RESET_ADMIN: re-applied password + administrator role for "' . $login . '". Set FOM_RESET_ADMIN back to 0.');
}, 1);

/*
 * One-time backfill: schema.org recipeCategory ("Home remedy") for the ingestible
 * remedy RECIPES imported before the plugin's `course` field (Automation Hamri 9.24.0).
 * New imports carry `course` through the content-pipeline, but the already-published
 * recipe-remedies have no _wpap_recipe_course meta, so they emit no recipeCategory.
 *
 * Self-targeting + safe: only touches posts flagged as recipes (_wpap_recipe_on=1) that
 * sit in a remedy category and don't already have a course — so it never labels a food
 * recipe or a non-recipe remedy. Idempotent (sets only when empty) and guarded by an
 * option marker so the query runs once, not on every boot. To re-run after adding more
 * legacy recipes, delete the fom_remedy_course_backfilled option.
 */
add_action('init', static function (): void {
    // Keep one-time maintenance off the cache-less front-end hot path: run only on wp-admin loads
    // and the wp-cron sidecar tick (which self-heals a redeploy within ~2 min). A front-end request
    // would otherwise pay a get_option marker SELECT on every hit, forever, for a once-only backfill.
    if (!is_admin() && !wp_doing_cron()) {
        return;
    }
    if (get_option('fom_remedy_course_backfilled')) {
        return;
    }
    if (!class_exists('WP_Query')) {
        return;
    }
    try {
        $cat_ids = [];
        // Single source of truth (fom-shared.php) — after the 2026-09-01 merge this is 'natural-remedies'.
        // Was hard-coded to the pre-merge slugs, which no longer resolve, so this backfill retried forever.
        foreach ((function_exists('fom_remedy_slugs') ? fom_remedy_slugs() : ['natural-remedies']) as $slug) {
            $term = get_term_by('slug', $slug, 'category');
            if ($term instanceof WP_Term) {
                $cat_ids[] = (int) $term->term_id;
            }
        }
        if (empty($cat_ids)) {
            return; // categories not created yet — try again next boot (don't set the marker)
        }
        $q = new WP_Query([
            'post_type'      => 'post',
            'post_status'    => 'any',
            'category__in'   => $cat_ids,
            'posts_per_page' => 200,
            'fields'         => 'ids',
            'no_found_rows'  => true,
            'meta_key'       => '_wpap_recipe_on',
            'meta_value'     => '1',
        ]);
        $done = 0;
        foreach ($q->posts as $pid) {
            // Per-item isolation: one poison post can't 500 the request or block the rest.
            try {
                if ('' === trim((string) get_post_meta((int) $pid, '_wpap_recipe_course', true))) {
                    update_post_meta((int) $pid, '_wpap_recipe_course', 'Home remedy');
                    $done++;
                }
            } catch (\Throwable $e) {
                error_log('[kepoli] course backfill: post ' . (int) $pid . ' failed: ' . $e->getMessage());
            }
        }
        update_option('fom_remedy_course_backfilled', 1, false);
        error_log('[kepoli] recipe course backfill: set "Home remedy" on ' . $done . ' remedy recipe(s).');
    } catch (\Throwable $e) {
        // Never turn a self-heal into a public fatal; retry next admin/cron tick (marker stays unset).
        error_log('[kepoli] recipe course backfill failed: ' . $e->getMessage());
    }
}, 20);

/*
 * One-time backfill: sync each seeded post's excerpt to its curated meta_description.
 * The seed marks food posts _wpap_smart_link, so Automation Hamri emits post_excerpt as
 * the meta description; older seed runs stored the LONG `excerpt` (~183c), overflowing the
 * SERP snippet, while the curated <=160c description sat in _fom_meta_description meta.
 * bootstrap.php now seeds the meta_description as the excerpt, but the already-published
 * posts still carry the long one — this applies the same fix on a plain REDEPLOY (no full
 * FOM_FORCE_RESEED, which would also revert wp-admin page/profile edits).
 *
 * Self-targeting: only posts carrying _fom_meta_description (the seeded ones — the
 * bulk-imported remedies don't have it) whose excerpt differs. Idempotent + marker-guarded.
 * Re-run by deleting the fom_food_excerpt_backfilled option.
 */
add_action('init', static function (): void {
    // One-time maintenance: keep off the front-end hot path (runs on admin / cron — see above).
    if (!is_admin() && !wp_doing_cron()) {
        return;
    }
    if (get_option('fom_food_excerpt_backfilled')) {
        return;
    }
    if (!class_exists('WP_Query')) {
        return;
    }
    try {
        $q = new WP_Query([
            'post_type'      => 'post',
            'post_status'    => 'any',
            'posts_per_page' => 200,
            'fields'         => 'ids',
            'no_found_rows'  => true,
            'meta_key'       => '_fom_meta_description',
        ]);
        $done = 0;
        foreach ($q->posts as $pid) {
            // Per-item isolation: wp_update_post fires save_post; one throwing hook must not 500 the
            // request or strand the rest of the batch (and leave the marker unset → a 500 loop).
            try {
                $md = trim((string) get_post_meta((int) $pid, '_fom_meta_description', true));
                if ('' === $md) {
                    continue;
                }
                if ((string) get_post_field('post_excerpt', (int) $pid) !== $md) {
                    wp_update_post(['ID' => (int) $pid, 'post_excerpt' => $md]);
                    $done++;
                }
            } catch (\Throwable $e) {
                error_log('[kepoli] excerpt backfill: post ' . (int) $pid . ' failed: ' . $e->getMessage());
            }
        }
        update_option('fom_food_excerpt_backfilled', 1, false);
        error_log('[kepoli] food excerpt backfill: synced ' . $done . ' excerpt(s) to the curated meta_description.');
    } catch (\Throwable $e) {
        error_log('[kepoli] food excerpt backfill failed: ' . $e->getMessage());
    }
}, 21);

/*
 * One-time: promote the site-owner author account to administrator. bootstrap.php now seeds the
 * author AS an administrator (owner's choice — one login for authoring + admin/campaign tools), but
 * a plain redeploy doesn't re-run the seed, so an already-provisioned author keeps its old role
 * (Editor). Identify it the same way the seed does — by WRITER_EMAIL — and promote it once. The
 * account's existing password is unchanged (no session kill), so the owner logs in as usual and now
 * reaches wp-admin. The separate WP_ADMIN_USER account remains an independent admin. Marker-guarded;
 * re-run by deleting the fom_author_admin_promoted option.
 */
add_action('init', static function (): void {
    // One-time maintenance: keep off the front-end hot path (runs on admin / cron — see above).
    if (!is_admin() && !wp_doing_cron()) {
        return;
    }
    if (get_option('fom_author_admin_promoted')) {
        return;
    }
    try {
        $email = fom_autoseed_env('WRITER_EMAIL', 'isalunemerovik@gmail.com');
        if ($email === '') {
            return;
        }
        $user = get_user_by('email', $email);
        if (!$user instanceof WP_User) {
            return; // author not provisioned yet — retry next boot (don't set the marker)
        }
        if (!in_array('administrator', (array) $user->roles, true)) {
            $user->set_role('administrator'); // superset of editor; does not invalidate the session
            error_log('[kepoli] author admin promotion: "' . $user->user_login . '" is now administrator.');
        }
        update_option('fom_author_admin_promoted', 1, false);
    } catch (\Throwable $e) {
        error_log('[kepoli] author admin promotion failed: ' . $e->getMessage());
    }
}, 22);

function fom_autoseed_activate_plugin(string $plugin): void
{
    $plugin_path = WP_PLUGIN_DIR . '/' . $plugin;
    if (!file_exists($plugin_path)) {
        return;
    }

    if (!function_exists('is_plugin_active') || !function_exists('activate_plugin')) {
        require_once ABSPATH . 'wp-admin/includes/plugin.php';
    }

    if (!is_plugin_active($plugin)) {
        activate_plugin($plugin, '', false, true);
    }
}

function fom_autoseed_has_real_content(): bool
{
    $content = get_posts([
        'post_type' => ['post', 'page'],
        'post_status' => ['publish', 'draft', 'pending', 'future', 'private'],
        'posts_per_page' => 20,
        'orderby' => 'ID',
        'order' => 'ASC',
        'no_found_rows' => true,
    ]);

    $starter_slugs = ['hello-world', 'sample-page', 'privacy-policy'];
    foreach ($content as $post) {
        if (!$post instanceof WP_Post) {
            continue;
        }
        if (!in_array((string) $post->post_name, $starter_slugs, true)) {
            return true;
        }
    }

    return false;
}

function fom_autoseed_cutover_token(): string
{
    // Per-deploy secret, NEVER a committed default: a hardcoded fallback in source is public,
    // so it defeats the guard entirely. An EMPTY secret DISABLES the URL trigger — the
    // env-flag FOM_FRESH_CUTOVER deploy trigger (server-config, not web-reachable) remains
    // the safe way to fire a destructive reseed. Set FOM_CUTOVER_SECRET in Coolify to a
    // long random value to (re-)enable the URL trigger.
    return fom_autoseed_env('FOM_CUTOVER_SECRET', '');
}

/**
 * Is the URL-based destructive-cutover trigger authorized for THIS request? All of:
 *   1. a real per-deploy secret is configured (fail closed when unset),
 *   2. it matches (constant-time),
 *   3. the caller is a logged-in administrator,
 *   4. a valid WP nonce is present.
 * (4) is the anti-CSRF factor: a state-changing, destructive GET must carry a nonce a stray
 * link / <img> / cross-site request can't forge, even if the secret ever leaked via
 * Referer/history/logs. Admins get the ready-to-click nonce'd URL via ?fom_debug=1.
 */
function fom_autoseed_url_trigger_ok(): bool
{
    $token = fom_autoseed_cutover_token();
    if ('' === $token) {
        return false;                                             // no secret set → trigger disabled
    }
    if (!current_user_can('manage_options') || !isset($_GET['fom_do_cutover'])) {
        return false;
    }
    if (!hash_equals($token, (string) $_GET['fom_do_cutover'])) {
        return false;
    }
    return (bool) wp_verify_nonce((string) ($_GET['_wpnonce'] ?? ''), 'fom_cutover');
}

function fom_autoseed_should_cutover(): bool
{
    // Server-config trigger (trusted): env flag set at deploy time.
    if (fom_autoseed_env_bool('FOM_FRESH_CUTOVER', false)) {
        return true;
    }
    // Manual URL trigger — nonce + secret + admin (see fom_autoseed_url_trigger_ok).
    return fom_autoseed_url_trigger_ok();
}

// Observable diagnostic: GET /?fom_debug=1 prints a small HTML comment with
// the cutover state + a build tag, so the deployed state is checkable over HTTP.
add_action('wp_footer', static function (): void {
    // Admin-only diagnostic — never expose build/seed internals to anonymous visitors.
    if (!isset($_GET['fom_debug']) || !current_user_can('manage_options')) {
        return;
    }
    $counts = wp_count_posts();
    printf(
        "\n<!-- fom-diag build=media-v2 flag=%s cutover_done=%s seed_ver=%s published=%d -->\n",
        fom_autoseed_env_bool('FOM_FRESH_CUTOVER', false) ? '1' : '0',
        esc_html((string) get_option('fom_cutover_done')),
        esc_html((string) get_option('fom_seed_version')),
        (int) ($counts->publish ?? 0)
    );
    // Surface the ready-to-click, nonce-protected cutover URL to the admin (only when a real
    // FOM_CUTOVER_SECRET is configured). The nonce is per-user/per-action/time-bound, so
    // this URL can't be reused cross-site as a CSRF payload.
    if ('' !== fom_autoseed_cutover_token()) {
        printf(
            "\n<!-- fom-cutover-url (admin only, single-use nonce): %s -->\n",
            esc_html(add_query_arg([
                'fom_do_cutover' => fom_autoseed_cutover_token(),
                '_wpnonce'          => wp_create_nonce('fom_cutover'),
            ], home_url('/')))
        );
    }
}, 99);

add_action('init', static function (): void {
    if (defined('WP_INSTALLING') && WP_INSTALLING) {
        return;
    }

    if (function_exists('is_blog_installed') && !is_blog_installed()) {
        return;
    }

    fom_autoseed_activate_plugin('automation-hamri/wp-automator-pro.php');

    // One-time destructive CUTOVER / reseed. Runs in-process here because a
    // Coolify redeploy updates code but does NOT run the wp-cli seed. When
    // FOM_FRESH_CUTOVER=1 (or the token URL is hit), wipe every existing
    // post/page/attachment and reseed the clean site — including re-importing the
    // current featured images. Guarded by a seed-version marker + lock so it runs
    // once per seed version. Take a backup first; set the flag back to 0 after.
    if (fom_autoseed_should_cutover()) {
        $marker = 'fom_cutover_done';
        $target = function_exists('fom_seed_target_version') ? fom_seed_target_version() : 'cutover';
        // An admin using the (nonce-protected) URL trigger may force a reseed past the marker
        // (to pick up new content/images); the env flag stays marker-guarded so it runs once.
        $via_token = fom_autoseed_url_trigger_ok();

        // Steal a stale lock left by a prior run that hard-crashed before releasing.
        $lock = get_option('fom_cutover_lock');
        if (false !== $lock && (int) $lock < time() - 20 * MINUTE_IN_SECONDS) {
            delete_option('fom_cutover_lock');
        }

        if (((string) get_option($marker) !== (string) $target || $via_token)
            && file_exists('/seed/bootstrap.php')
            && file_exists('/content/posts.json')
            // Atomic claim: add_option returns false if the row already exists, so
            // only ONE concurrent request can enter this destructive path.
            && add_option('fom_cutover_lock', (string) time(), '', 'no')
        ) {
            @set_time_limit(0);
            @ignore_user_abort(true);
            // Record the attempt up-front: a hard seed failure then can't loop the
            // env-flag trigger into repeatedly wiping content (an admin can still
            // force a fresh attempt via the token).
            update_option($marker, (string) $target, true);
            try {
                $ids = get_posts([
                    'post_type'      => ['post', 'page', 'attachment'],
                    'post_status'    => 'any',
                    'posts_per_page' => -1,
                    'fields'         => 'ids',
                    'no_found_rows'  => true,
                ]);
                foreach ($ids as $pid) {
                    wp_delete_post((int) $pid, true);
                }

                ob_start();
                try {
                    require '/seed/bootstrap.php';
                } finally {
                    ob_end_clean();
                }
                delete_option('fom_cutover_fails');   // clean run — reset the retry counter
            } catch (\Throwable $e) {
                error_log('kepoli cutover failed: ' . $e->getMessage());
                // The content was already wiped above but the seed did not finish. Leaving the
                // marker set would strand the site PERMANENTLY EMPTY (neither the cutover nor the
                // normal autoseed path would re-run). Instead, roll back the recovery state so the
                // next request re-attempts — re-wiping an already-empty site is a no-op, so this
                // only re-runs the seed. Bounded so a permanently-failing seed can't loop forever.
                $fails = (int) get_option('fom_cutover_fails', 0) + 1;
                update_option('fom_cutover_fails', (string) $fails, false);
                if ($fails < 5) {
                    delete_option($marker);                 // let should_cutover re-enter, OR
                    delete_option('fom_seed_version');   // let the normal autoseed path recover
                }
            } finally {
                // Always release the atomic lock, even if the seed threw.
                delete_option('fom_cutover_lock');
            }
            return;
        }
    }

    if (!fom_autoseed_env_bool('FOM_AUTOSEED_ENABLE', true)) {
        return;
    }

    $target_version = function_exists('fom_seed_target_version')
        ? fom_seed_target_version()
        : 'seed-fallback';

    $current_version = (string) get_option('fom_seed_version', '');
    $force_reseed = fom_autoseed_env_bool('FOM_FORCE_RESEED', false);

    if (!$force_reseed && $current_version !== '') {
        return;
    }

    if (!$force_reseed && fom_autoseed_has_real_content()) {
        return;
    }

    if ($current_version === $target_version && wp_get_theme()->get_stylesheet() === 'viral-reader') {
        return;
    }

    if (!file_exists('/seed/bootstrap.php') || !file_exists('/content/posts.json')) {
        return;
    }

    if (get_transient('fom_seed_lock')) {
        return;
    }

    set_transient('fom_seed_lock', '1', 5 * MINUTE_IN_SECONDS);

    ob_start();
    try {
        require '/seed/bootstrap.php';
    } catch (\Throwable $e) {
        // Match the cutover path: a seed failure (e.g. one unreadable content image) must
        // degrade to an unseeded-but-serving site, NOT a PHP fatal / HTTP 500 on the public
        // front-end request that happened to trigger the self-heal.
        error_log('kepoli autoseed failed: ' . $e->getMessage());
    } finally {
        ob_end_clean();
        delete_transient('fom_seed_lock');
    }
}, 20);
