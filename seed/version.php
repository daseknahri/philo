<?php

if (!function_exists('fom_seed_target_version')) {
    function fom_seed_target_version(): string
    {
        static $version = null;

        if ($version !== null) {
            return $version;
        }

        $files = [
            '/seed/bootstrap.php',
            '/content/site-profile.json',
            '/content/categories.json',
            '/content/pages.json',
            '/content/posts.json',
            '/content/image-plan.json',
        ];

        $hash_context = hash_init('sha256');

        foreach ($files as $file) {
            if (!is_readable($file)) {
                hash_update($hash_context, $file . '|missing');
                continue;
            }

            hash_update($hash_context, $file);
            hash_update_file($hash_context, $file);
        }

        $version = 'seed-' . substr(hash_final($hash_context), 0, 16);

        return $version;
    }
}
