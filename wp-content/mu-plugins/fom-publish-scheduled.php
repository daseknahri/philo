<?php
/**
 * Plugin Name: Frame of Mind Auto-Publish Overdue Scheduled Posts
 * Description: Safety net for WordPress's "missed schedule" problem on a low-traffic / Docker host.
 *   WP-Cron is visitor-triggered; with little traffic and no managed system cron, a scheduled post
 *   whose time passes before cron fires gets stuck as 'future' ("Missed schedule"), and a later
 *   cron hit will NOT recover it. This finds any 'future' post whose time has already passed and
 *   publishes it directly with wp_publish_post() — bypassing the fragile publish_future_post event.
 *   Runs on init (so the wp-cron sidecar ping AND any real visitor both trigger it), throttled to
 *   ~once per 90s via an autoloaded timestamp option (free per-request read) and guarded by an
 *   atomic add_option single-runner lock so two simultaneous requests can't double-publish. Only
 *   ever touches genuinely OVERDUE posts (post_date_gmt in the past); it never publishes a post you
 *   deliberately scheduled for the future.
 *
 * @package Kepoli
 */

if (!defined('ABSPATH')) {
    exit;
}

add_action('init', 'fom_publish_overdue_scheduled', 30);
function fom_publish_overdue_scheduled(): void
{
    // Throttle (~once per 90s): an AUTOLOADED "next run" timestamp, so the common per-request
    // check is free from the alloptions bundle. A transient would cost ~2 wp_options SELECTs on
    // this cache-less host (no persistent object cache) on every request, even when nothing is due.
    // This is a throttle, NOT a concurrency lock — that is the atomic INSERT IGNORE claim below.
    $next = (int) get_option('fom_overdue_next', 0);
    if (time() < $next) {
        return;
    }
    update_option('fom_overdue_next', time() + 90, true);

    // Atomic single-runner claim via INSERT IGNORE — a TRUE UNIQUE-key compare-and-swap. NOT
    // add_option(): WP core's add_option runs INSERT ... ON DUPLICATE KEY UPDATE, so a second racer
    // whose value differs (two requests straddling a 1-second boundary, both writing time()) gets
    // affected-rows=2 and add_option returns true — a silent double-acquire. INSERT IGNORE inserts
    // exactly one row and no-ops every other racer (affected-rows=0). Two simultaneous requests — the
    // wp-cron sidecar ping and a visitor — thus can't both enter the publish critical section and land
    // a DUPLICATE Distribution Hub row (this path calls wp_publish_post() directly, so the Hub-autoadd
    // suppression flag is never set). A stale lock from a hard-crashed run is stolen after 5 min.
    global $wpdb;
    $lock = get_option('fom_overdue_pub_lock');
    if (false !== $lock) {
        if ((int) $lock > time() - 300) {
            return;                                       // another runner is active (< 5 min old)
        }
        delete_option('fom_overdue_pub_lock');         // stale lock from a hard-crashed run — steal it
    }
    $claimed = $wpdb->query($wpdb->prepare(
        "INSERT IGNORE INTO {$wpdb->options} (option_name, option_value, autoload) VALUES (%s, %s, 'no')",
        'fom_overdue_pub_lock',
        (string) time()
    ));
    wp_cache_delete('fom_overdue_pub_lock', 'options');
    wp_cache_delete('notoptions', 'options');
    if (1 !== (int) $claimed) {
        return;                                            // lost the claim race to a concurrent request
    }

    try {
        global $wpdb;
        $now_gmt = gmdate('Y-m-d H:i:s');
        // Indexed on (post_status, post_date_gmt); cheap, and usually returns nothing. ORDER BY
        // oldest-overdue-first makes processing deterministic so one bad post can't shadow a window.
        $ids = $wpdb->get_col(
            $wpdb->prepare(
                "SELECT ID FROM {$wpdb->posts} WHERE post_status = 'future' AND post_date_gmt <= %s ORDER BY post_date_gmt ASC LIMIT 100",
                $now_gmt
            )
        );
        if (empty($ids)) {
            return;
        }

        $published = 0;
        foreach ($ids as $pid) {
            // Per-item isolation: wp_publish_post fires save_post / wp_insert_post; one throwing hook
            // must not abort the batch (which would strand every later overdue post) nor turn the
            // visitor request that triggered this self-heal into an HTTP 500. Skip the poison post,
            // keep going — the same discipline the seed/cutover paths use.
            try {
                wp_publish_post((int) $pid);
                clean_post_cache((int) $pid);
                $published++;
            } catch (\Throwable $e) {
                error_log('[kepoli] auto-publish failed for post ' . (int) $pid . ': ' . $e->getMessage());
            }
        }
        if ($published > 0) {
            error_log('[kepoli] auto-published ' . $published . ' overdue scheduled post(s).');
        }
    } finally {
        delete_option('fom_overdue_pub_lock');          // always release, even on an unexpected throw
    }
}
