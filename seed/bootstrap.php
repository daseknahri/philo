<?php
/**
 * Idempotent content and site bootstrap for the food blog.
 */

require_once __DIR__ . '/version.php';

if (!defined('ABSPATH')) {
    exit;
}

function fom_seed_env(string $key, string $default = ''): string
{
    $value = getenv($key);
    return $value === false || $value === '' ? $default : trim((string) $value);
}

function fom_seed_json(string $path): array
{
    $raw = file_get_contents($path);
    if ($raw === false) {
        throw new RuntimeException("Cannot read {$path}");
    }

    $data = json_decode($raw, true);
    if (!is_array($data)) {
        throw new RuntimeException("Invalid JSON in {$path}: " . json_last_error_msg());
    }

    return $data;
}

function fom_seed_slug_to_title(string $slug): string
{
    return ucwords(str_replace('-', ' ', $slug));
}

function fom_seed_current_site_profile(): array
{
    $profile = $GLOBALS['fom_seed_site_profile'] ?? [];
    return is_array($profile) ? $profile : [];
}

function fom_seed_profile_value(array $profile, array $path, $default = '')
{
    $value = $profile;
    foreach ($path as $key) {
        if (!is_array($value) || !array_key_exists($key, $value)) {
            return $default;
        }

        $value = $value[$key];
    }

    return $value;
}

function fom_seed_is_english(): bool
{
    $profile = fom_seed_current_site_profile();
    $locale = (string) fom_seed_profile_value($profile, ['locales', 'public'], fom_seed_env('WP_LOCALE', 'en_US'));
    return str_starts_with(strtolower($locale), 'en');
}

function fom_seed_ui(string $ro, string $en): string
{
    return fom_seed_is_english() ? $en : $ro;
}

function fom_seed_admin_locale(): string
{
    $profile = fom_seed_current_site_profile();
    $locale = (string) fom_seed_profile_value($profile, ['locales', 'admin'], fom_seed_env('WP_ADMIN_LOCALE', 'en_US'));
    return $locale !== '' ? $locale : 'en_US';
}

function fom_seed_find_page_slug(array $pages, array $candidates): string
{
    foreach ($pages as $page) {
        $slug = sanitize_title((string) ($page['slug'] ?? ''));
        if ($slug !== '' && in_array($slug, $candidates, true)) {
            return $slug;
        }
    }

    return '';
}

function fom_seed_find_prefixed_page_slug(array $pages, array $prefixes, array $exclude = []): string
{
    foreach ($pages as $page) {
        $slug = sanitize_title((string) ($page['slug'] ?? ''));
        if ($slug === '' || in_array($slug, $exclude, true)) {
            continue;
        }

        foreach ($prefixes as $prefix) {
            if (str_starts_with($slug, $prefix)) {
                return $slug;
            }
        }
    }

    return '';
}

function fom_seed_page_title(array $pages, string $slug): string
{
    foreach ($pages as $page) {
        if (($page['slug'] ?? '') === $slug) {
            return (string) ($page['title'] ?? fom_seed_slug_to_title($slug));
        }
    }

    return fom_seed_slug_to_title($slug);
}

function fom_seed_author_page_slug(array $pages): string
{
    $slug = fom_seed_find_page_slug($pages, ['despre-autor', 'about-author']);
    if ($slug !== '') {
        return $slug;
    }

    return fom_seed_is_english() ? 'about-author' : 'despre-autor';
}

function fom_seed_site_about_slug(array $pages): string
{
    $slug = fom_seed_find_prefixed_page_slug($pages, ['despre-', 'about-'], [fom_seed_author_page_slug($pages)]);
    if ($slug !== '') {
        return $slug;
    }

    return fom_seed_is_english() ? 'about-kepoli' : 'despre-kepoli';
}

function fom_seed_home_page_slug(array $pages): string
{
    $slug = fom_seed_find_page_slug($pages, ['acasa', 'home']);
    if ($slug !== '') {
        return $slug;
    }

    return isset($pages[0]['slug']) ? sanitize_title((string) $pages[0]['slug']) : '';
}

function fom_seed_recipes_page_slug(array $pages): string
{
    $slug = fom_seed_find_page_slug($pages, ['retete', 'recipes']);
    if ($slug !== '') {
        return $slug;
    }

    return fom_seed_is_english() ? 'recipes' : 'retete';
}

function fom_seed_guides_page_slug(array $pages): string
{
    $slug = fom_seed_find_page_slug($pages, ['articole', 'guides', 'articles']);
    if ($slug !== '') {
        return $slug;
    }

    return fom_seed_is_english() ? 'guides' : 'articole';
}

function fom_seed_legacy_site_name(array $pages): string
{
    $about_slug = fom_seed_site_about_slug($pages);
    $about_title = fom_seed_page_title($pages, $about_slug);
    if ($about_title !== '' && preg_match('/^(About|Despre)\s+(.+)$/iu', $about_title, $matches)) {
        return trim((string) $matches[2]);
    }

    $name = trim((string) get_bloginfo('name'));
    return $name !== '' ? $name : 'Food Blog';
}

function fom_seed_profile_slug(array $profile, string $key, string $fallback): string
{
    $slug = sanitize_title((string) fom_seed_profile_value($profile, ['slugs', $key], ''));
    return $slug !== '' ? $slug : $fallback;
}

function fom_seed_site_name(array $pages): string
{
    $profile = fom_seed_current_site_profile();
    $name = trim((string) fom_seed_profile_value($profile, ['brand', 'name'], ''));
    return $name !== '' ? $name : fom_seed_legacy_site_name($pages);
}

function fom_seed_default_tagline(string $site_name): string
{
    $profile = fom_seed_current_site_profile();
    $tagline = trim((string) fom_seed_profile_value($profile, ['brand', 'tagline'], ''));
    if ($tagline !== '') {
        return $tagline;
    }

    if (fom_seed_is_english()) {
        return sprintf('%s publishes home-cooking recipes, food articles, and practical kitchen guides.', $site_name);
    }

    return 'Retete pentru acasa, articole culinare si ghiduri practice.';
}

function fom_seed_default_profile_description(string $site_name, bool $is_english): string
{
    if ($is_english) {
        return sprintf('%s publishes practical recipes, food guides, and kitchen articles for home cooks.', $site_name);
    }

    return sprintf('%s publica retete pentru acasa, articole culinare si ghiduri practice.', $site_name);
}

function fom_seed_normalize_site_profile(array $profile, array $pages): array
{
    $public_locale = trim((string) fom_seed_profile_value($profile, ['locales', 'public'], fom_seed_env('WP_LOCALE', 'en_US')));
    $public_locale = $public_locale !== '' ? $public_locale : 'en_US';
    $is_english = str_starts_with(strtolower($public_locale), 'en');
    $site_name = trim((string) fom_seed_profile_value($profile, ['brand', 'name'], fom_seed_legacy_site_name($pages)));
    $site_name = $site_name !== '' ? $site_name : 'Food Blog';

    $defaults = [
        'brand' => [
            'name' => $site_name,
            'tagline' => $is_english
                ? sprintf('%s publishes home-cooking recipes, food articles, and practical kitchen guides.', $site_name)
                : 'Retete pentru acasa, articole culinare si ghiduri practice.',
            'description' => fom_seed_default_profile_description($site_name, $is_english),
            'site_email' => fom_seed_env('SITE_EMAIL', 'contact@example.com'),
        ],
        'locales' => [
            'public' => $public_locale,
            'admin' => 'en_US',
            'force_admin' => true,
        ],
        'writer' => [
            'name' => 'Site Author',
            'email' => fom_seed_env('WRITER_EMAIL', 'writer@example.com'),
            'bio' => $is_english
                ? sprintf('Writes practical recipes and kitchen guides for %s.', $site_name)
                : sprintf('Scrie retete si ghiduri practice pentru %s.', $site_name),
        ],
        'assets' => [
            'wordmark' => 'fom-wordmark',
            'icon' => 'fom-icon',
            'social_cover' => 'fom-social-cover',
        ],
        'slugs' => [
            'home' => fom_seed_home_page_slug($pages) ?: ($is_english ? 'home' : 'acasa'),
            'recipes' => fom_seed_recipes_page_slug($pages),
            'guides' => fom_seed_guides_page_slug($pages),
            'about' => fom_seed_site_about_slug($pages),
            'author' => fom_seed_author_page_slug($pages),
            'privacy' => fom_seed_find_page_slug($pages, ['politica-de-confidentialitate', 'privacy-policy']) ?: ($is_english ? 'privacy-policy' : 'politica-de-confidentialitate'),
            'cookies' => fom_seed_find_page_slug($pages, ['politica-de-cookies', 'cookie-policy']) ?: ($is_english ? 'cookie-policy' : 'politica-de-cookies'),
            'advertising' => fom_seed_find_page_slug($pages, ['publicitate-si-consimtamant', 'advertising-and-consent']) ?: ($is_english ? 'advertising-and-consent' : 'publicitate-si-consimtamant'),
            'editorial' => fom_seed_find_page_slug($pages, ['politica-editoriala', 'editorial-policy']) ?: ($is_english ? 'editorial-policy' : 'politica-editoriala'),
            'terms' => fom_seed_find_page_slug($pages, ['termeni-si-conditii', 'terms-and-conditions']) ?: ($is_english ? 'terms-and-conditions' : 'termeni-si-conditii'),
            'disclaimer' => fom_seed_find_page_slug($pages, ['disclaimer-culinar', 'culinary-disclaimer']) ?: ($is_english ? 'culinary-disclaimer' : 'disclaimer-culinar'),
        ],
    ];

    $normalized = array_replace_recursive($defaults, $profile);
    $normalized['locales']['admin'] = 'en_US';
    $normalized['locales']['force_admin'] = true;

    foreach ($normalized['slugs'] as $key => $slug) {
        $normalized['slugs'][$key] = sanitize_title((string) $slug);
    }

    return $normalized;
}

function fom_seed_site_profile(string $path, array $pages): array
{
    $profile = [];
    if (is_readable($path)) {
        $profile = fom_seed_json($path);
    }

    return fom_seed_normalize_site_profile($profile, $pages);
}

function fom_seed_format_minutes(int $minutes): string
{
    $hours = intdiv($minutes, 60);
    $mins = $minutes % 60;

    if (fom_seed_is_english()) {
        if ($hours > 0 && $mins > 0) {
            return $hours . ' hr ' . $mins . ' min';
        }
        if ($hours > 0) {
            return $hours . ' hr';
        }

        return $mins . ' min';
    }

    if ($hours > 0 && $mins > 0) {
        return $hours . ' ora ' . $mins . ' min';
    }
    if ($hours > 0) {
        return $hours . ' ora';
    }

    return $mins . ' min';
}

function fom_seed_is_editorial_category_slug(string $slug): bool
{
    $profile = fom_seed_current_site_profile();
    $guides_slug = sanitize_title((string) fom_seed_profile_value($profile, ['slugs', 'guides'], ''));
    return in_array($slug, array_unique(array_filter(['articole', 'guides', 'articles', $guides_slug])), true)
        || str_contains($slug, 'guide')
        || str_contains($slug, 'article');
}

function fom_seed_duration_minutes(string $value): int
{
    $minutes = 0;
    if (preg_match('/(\d+)\s*(?:ora|ore|hours?|hrs?|hr)/iu', $value, $matches)) {
        $minutes += ((int) $matches[1]) * 60;
    }
    if (preg_match('/(\d+)\s*(?:min(?:ute)?)/iu', $value, $matches)) {
        $minutes += (int) $matches[1];
    }
    return max(1, $minutes);
}

function fom_seed_iso_duration(string $value): string
{
    $minutes = fom_seed_duration_minutes($value);
    $hours = intdiv($minutes, 60);
    $mins = $minutes % 60;
    $duration = 'PT';
    if ($hours > 0) {
        $duration .= $hours . 'H';
    }
    if ($mins > 0) {
        $duration .= $mins . 'M';
    }
    return $duration;
}

function fom_seed_upsert_page(array $page, int $author_id): int
{
    $existing = get_page_by_path($page['slug'], OBJECT, 'page');
    $profile = fom_seed_current_site_profile();
    $site_email = (string) fom_seed_profile_value($profile, ['brand', 'site_email'], fom_seed_env('SITE_EMAIL', 'contact@example.com'));
    $writer_email = (string) fom_seed_profile_value($profile, ['writer', 'email'], fom_seed_env('WRITER_EMAIL', 'writer@example.com'));
    $postarr = [
        'post_type' => 'page',
        'post_status' => 'publish',
        'post_author' => $author_id,
        'post_name' => $page['slug'],
        'post_title' => $page['title'],
        'comment_status' => 'closed',
        'ping_status' => 'closed',
        'post_content' => str_replace(
            ['{{SITE_EMAIL}}', '{{WRITER_EMAIL}}'],
            [$site_email, $writer_email],
            $page['content']
        ),
    ];

    if ($existing) {
        $postarr['ID'] = $existing->ID;
    }

    $id = wp_insert_post(wp_slash($postarr), true);
    if (is_wp_error($id)) {
        throw new RuntimeException($id->get_error_message());
    }

    // Mirror the post loop: store the curated meta description so fom-schema's
    // meta/OG path uses it directly and never falls back to the expensive
    // get_the_excerpt()/the_content pipeline in <head>.
    if (!empty($page['meta_description'])) {
        update_post_meta((int) $id, '_fom_meta_description', sanitize_text_field((string) $page['meta_description']));
    }

    return (int) $id;
}

function fom_seed_ensure_category(array $category): int
{
    $term = term_exists($category['slug'], 'category');
    if (!$term) {
        $term = wp_insert_term($category['name'], 'category', [
            'slug' => $category['slug'],
            'description' => $category['description'] ?? '',
        ]);
    } else {
        wp_update_term((int) $term['term_id'], 'category', [
            'name' => $category['name'],
            'slug' => $category['slug'],
            'description' => $category['description'] ?? '',
        ]);
    }

    if (is_wp_error($term)) {
        throw new RuntimeException($term->get_error_message());
    }

    return (int) $term['term_id'];
}

function fom_seed_ensure_author(array $pages, string $site_name, array $profile = []): int
{
    $profile = $profile !== [] ? $profile : fom_seed_current_site_profile();
    $email = (string) fom_seed_profile_value($profile, ['writer', 'email'], fom_seed_env('WRITER_EMAIL', 'writer@example.com'));
    $display_name = trim((string) fom_seed_profile_value($profile, ['writer', 'name'], 'Site Author'));
    $display_name = $display_name !== '' ? $display_name : 'Site Author';
    $name_parts = preg_split('/\s+/', $display_name) ?: [];
    $first_name = (string) ($name_parts[0] ?? $display_name);
    $last_name = trim(implode(' ', array_slice($name_parts, 1)));
    $username = sanitize_user(sanitize_title($display_name), true);
    $username = $username !== '' ? $username : 'site-author';
    $user = get_user_by('email', $email);

    if (!$user) {
        $user_id = username_exists($username);
        if (!$user_id) {
            $user_id = wp_create_user($username, wp_generate_password(32, true), $email);
        }
        $user = get_user_by('id', $user_id);
    }

    if (!$user || is_wp_error($user)) {
        throw new RuntimeException('Could not create author user.');
    }

    $author_slug = fom_seed_profile_slug($profile, 'author', fom_seed_author_page_slug($pages));
    $description = trim((string) fom_seed_profile_value($profile, ['writer', 'bio'], ''));
    if ($description === '') {
        $description = fom_seed_is_english()
            ? sprintf('Author at %s. Writes home-cooking recipes, food guides, and practical kitchen articles.', $site_name)
            : sprintf('Autoare %s. Scrie retete pentru acasa, articole culinare si ghiduri practice.', $site_name);
    }

    wp_update_user([
        'ID' => $user->ID,
        'display_name' => $display_name,
        'nickname' => $display_name,
        'first_name' => $first_name,
        'last_name' => $last_name,
        'user_url' => home_url('/' . $author_slug . '/'),
        'description' => $description,
        // Site owner's choice: the public byline author is ALSO the administrator, so there is one
        // login for authoring + admin/campaign tools. Tradeoff (accepted): the login/slug is
        // enumerable (author archive, REST, bylines), so this exposes the admin username — mitigate
        // with a strong password + login-attempt limiting. The separate WP_ADMIN_USER account stays
        // as an independent admin fallback.
        'role' => 'administrator',
    ]);
    update_user_meta((int) $user->ID, 'locale', fom_seed_admin_locale());

    // E-E-A-T: populate the author's social profile links. The theme reads these
    // as user contact-method meta and renders visible rel="me" links + Person
    // `sameAs`. Empty values are skipped, and they stay editable in wp-admin.
    $social = fom_seed_profile_value($profile, ['writer', 'social'], []);
    if (is_array($social)) {
        $social_map = [
            'x' => 'vr_social_x', 'twitter' => 'vr_social_x',
            'instagram' => 'vr_social_instagram', 'facebook' => 'vr_social_facebook',
            'youtube' => 'vr_social_youtube', 'pinterest' => 'vr_social_pinterest',
            'linkedin' => 'vr_social_linkedin', 'tiktok' => 'vr_social_tiktok',
            'mastodon' => 'vr_social_mastodon', 'website' => 'vr_social_website',
        ];
        foreach ($social as $network => $url) {
            $key = $social_map[strtolower((string) $network)] ?? '';
            $url = trim((string) $url);
            if ($key !== '' && $url !== '') {
                update_user_meta((int) $user->ID, $key, esc_url_raw($url));
            }
        }
    }

    // E-E-A-T: a real author headshot. Import writer.photo (a filename in
    // content/images/) as an attachment and set it as the author's photo, which
    // the theme uses for the byline, author box, author archive, and Person image.
    $photo = trim((string) fom_seed_profile_value($profile, ['writer', 'photo'], ''));
    if ($photo !== '') {
        $photo_id = fom_seed_import_author_photo($photo, $display_name);
        if ($photo_id > 0) {
            update_user_meta((int) $user->ID, 'vr_author_avatar', $photo_id);
        }
    }

    return (int) $user->ID;
}

function fom_seed_link(string $slug, array $post_ids): string
{
    return isset($post_ids[$slug]) ? get_permalink($post_ids[$slug]) : home_url('/');
}

function fom_seed_post_data(string $slug, array $posts): ?array
{
    foreach ($posts as $post) {
        if (($post['slug'] ?? '') === $slug) {
            return $post;
        }
    }

    return null;
}

function fom_seed_post_title(string $slug, array $posts): string
{
    $post = fom_seed_post_data($slug, $posts);
    return $post['title'] ?? fom_seed_slug_to_title($slug);
}

function fom_seed_post_excerpt(string $slug, array $posts): string
{
    $post = fom_seed_post_data($slug, $posts);
    return trim((string) ($post['excerpt'] ?? ''));
}

function fom_seed_post_intro(array $post): string
{
    return trim((string) ($post['intro'] ?? $post['excerpt'] ?? ''));
}

function fom_seed_recipe_matches(array $post, array $needles): bool
{
    $haystack = strtolower(
        implode(' ', array_filter([
            $post['slug'] ?? '',
            $post['title'] ?? '',
            $post['excerpt'] ?? '',
            $post['notes'] ?? '',
            implode(' ', $post['ingredients'] ?? []),
        ]))
    );

    foreach ($needles as $needle) {
        if (str_contains($haystack, strtolower($needle))) {
            return true;
        }
    }

    return false;
}

function fom_seed_recipe_value_paragraphs(array $post): array
{
    if (fom_seed_is_english()) {
        return [
            'This recipe is written for ordinary home kitchens, with clear steps and enough context to help readers understand the timing, texture, and small decisions that shape the final result.',
            'The goal is repeatability. Readers should be able to cook it once, learn what matters, and come back later with confidence instead of guessing their way through the process.',
        ];
    }

    switch ($post['category']) {
        case 'ciorbe-si-supe':
            return [
                'Reteta aceasta raspunde bine unei cautari simple: cum faci acasa un bol romanesc cald, bine legat si usor de servit in familie. Are pasi accesibili, dar si suficiente repere ca sa poti controla limpezimea, aciditatea si textura finala.',
                'Daca gatesti pentru pranz, pentru doua zile sau pentru o masa de duminica, tipul acesta de reteta castiga prin echilibru: ingredientele sunt recognoscibile, timpul de lucru este clar, iar rezultatul poate fi adaptat usor dupa gustul casei.',
            ];
        case 'feluri-principale':
            return [
                'Reteta este construita pentru mesele la care vrei ceva satios, clar explicat si usor de legat de o garnitura sau de o ciorba. Fiecare pas conteaza pentru gustul final, dar nu ai nevoie de tehnici complicate ca sa iasa bine.',
                'Pentru cine cauta mancare romaneasca facuta acasa, avantajul real este predictibilitatea: stii cand sa rumenesti, cand sa adaugi lichidul si ce semne iti arata ca preparatul este gata, nu doar cat timp a stat pe foc.',
            ];
        case 'patiserie-si-deserturi':
            return [
                'Reteta merita daca vrei un desert romanesc explicat fara scurtaturi confuze. Accentul cade pe textura, pe timpii de odihna sau coacere si pe semnele vizuale care iti spun cand preparatul este reusit.',
                'La deserturi, cititorii cauta de obicei doua lucruri: sa nu rateze textura si sa poata repeta rezultatul. Tocmai de aceea, pasii si sfaturile sunt gandite sa reduca micile erori care strica aluaturile ori deserturile prajite.',
            ];
        case 'conserve-si-garnituri':
            return [
                'Reteta este utila cand vrei ceva care completeaza bine masa si poate fi pregatit organizat, cu atentie la curatenie, textura si echilibru de gust. Nu e doar o lista de pasi, ci un mod de lucru usor de urmat de la un sezon la altul.',
                'Pentru garnituri si conserve, valoarea vine din detalii: ce legume alegi, cat lichid lasi, cand gusti si cum pastrezi rezultatul. Tocmai acele detalii fac diferenta intre un preparat bun si unul pe care vrei sa-l refaci sigur.',
            ];
        default:
            return [
                'Reteta este scrisa pentru gatit acasa, cu explicatii clare si repere practice care te ajuta sa intelegi nu doar ordinea pasilor, ci si ce urmaresti in fiecare etapa.',
                'Scopul nu este sa incarce pagina cu text, ci sa raspunda intrebarilor firesti pe care le ai in timp ce gatesti: cat de mult fierbi, cand ajustezi gustul si cum servesti preparatul astfel incat sa ramana echilibrat.',
            ];
    }
}

function fom_seed_recipe_ingredient_focus_paragraphs(array $post): array
{
    if (fom_seed_is_english()) {
        if (fom_seed_recipe_matches($post, ['cream', 'yolk', 'smantana', 'galbenus'])) {
            return [
                'The key ingredients here are the liquid base, the richer element that rounds out the flavor, and the part that sets the final texture. When cream or yolks are involved, temperature matters as much as quantity.',
                'If you need to adapt the recipe, make small adjustments. Thin with warm liquid, balance acidity near the end, and avoid aggressive substitutions that change the character of the dish all at once.',
            ];
        }

        if (fom_seed_recipe_matches($post, ['vinegar', 'lemon', 'pickle', 'bors', 'otet', 'lamaie', 'murata'])) {
            return [
                'What matters most here is balance between the main ingredient, the supporting vegetables or base, and the source of acidity. A good result comes from proportion, not from pushing one sharp flavor too hard.',
                'If you swap ingredients, keep the balance between salt, natural sweetness, and acidity in mind. Small corrections, made after tasting, are safer than one large correction at the end.',
            ];
        }

        return [
            'The key ingredients are the ones that give the dish structure, flavor, and rhythm. Preparing them in advance usually makes the cooking process smoother and the final texture more reliable.',
            'If you want to adapt the recipe, change one variable at a time. That keeps it clear whether a new fat, protein, garnish, or seasoning actually improved the result.',
        ];
    }

    if (fom_seed_recipe_matches($post, ['smantana', 'galbenus'])) {
        return [
            'Ingredientele-cheie ale retetei sunt baza lichida, partea grasa care rotunjeste gustul si elementul de legatura care da textura finala. Cand folosesti smantana sau galbenusuri, temperatura devine la fel de importanta ca proportiile.',
            'Daca trebuie sa adaptezi, mergi pe schimbari mici: ajusteaza aciditatea la final, rareste cu zeama fierbinte daca textura e prea densa si evita inlocuirile agresive care schimba prea mult gustul specific retetei.',
        ];
    }

    if (fom_seed_recipe_matches($post, ['bors', 'otet', 'lamaie', 'murata'])) {
        return [
            'Aici conteaza mai ales echilibrul dintre ingredientul principal, legumele de baza si sursa de aciditate. Gustul bun nu vine din mult bors sau mult otet, ci din felul in care completeaza restul preparatului fara sa il acopere.',
            'Daca schimbi ingredientele, pastreaza raportul dintre dulceata naturala a legumelor, sarea din preparat si nota acra de la final. Ajustarile mici, facute dupa gust, sunt mai sigure decat o corectie mare dintr-o singura miscare.',
        ];
    }

    if (fom_seed_recipe_matches($post, ['drojdie', 'faina', 'aluat', 'gris'])) {
        return [
            'In retetele de aluat sau compozitii sensibile, ingredientele-cheie sunt cele care controleaza structura: faina ori grisul, partea lichida si temperatura la care lucrezi. Cantitatea corecta este importanta, dar si ritmul in care incorporezi ingredientele.',
            'Pentru adaptari, foloseste repere vizuale: aluatul trebuie sa fie elastic sau moale, nu intamplator lipicios, iar compozitia trebuie lasata sa se aseze inainte de modelare, prajire sau coacere.',
        ];
    }

    if (fom_seed_recipe_matches($post, ['fasole', 'orez'])) {
        return [
            'Ingredientul principal are nevoie de suficient timp si de lichidul potrivit ca sa se gateasca uniform. In astfel de retete, rabdarea si ordinea etapelor sunt mai importante decat focul mare sau interventiile dese.',
            'Daca adaptezi reteta, tine cont de faptul ca boabele, orezul sau legumele absorb diferit in functie de soi si sezon. Corecteaza consistenta treptat si foloseste lichid fierbinte, nu rece, cand mai completezi.',
        ];
    }

    return [
        'Ingredientele-cheie ale retetei sunt cele care dau corp, gust si ritm prepararii. Merita sa le alegi proaspete si sa le pregatesti din timp, pentru ca ordinea in care intra in vas influenteaza textura mai mult decat pare la prima vedere.',
        'Daca ai nevoie de adaptari, incearca sa schimbi un singur lucru o data: tipul de carne, gradul de grasime, o garnitura sau un condiment. Asa iti ramane clar ce a schimbat cu adevarat rezultatul final.',
    ];
}

function fom_seed_recipe_common_mistakes(array $post): array
{
    if (fom_seed_is_english()) {
        $items = [];

        if (fom_seed_recipe_matches($post, ['cream', 'yolk', 'smantana', 'galbenus'])) {
            $items[] = 'Adding cold cream or yolks straight into very hot liquid can split the texture and make the finish look rough.';
        }

        if (fom_seed_recipe_matches($post, ['dough', 'flour', 'aluat', 'faina'])) {
            $items[] = 'Adding too much flour too quickly often makes the mixture heavy and hides the texture you actually want.';
        }

        if (fom_seed_recipe_matches($post, ['rice', 'orez'])) {
            $items[] = 'Not leaving enough moisture or space for rice to expand can make the center feel tight and undercooked.';
        }

        if (fom_seed_recipe_matches($post, ['garlic', 'usturoi'])) {
            $items[] = 'Leaving garlic over high heat for too long can turn it bitter and shift the whole flavor profile.';
        }

        $items[] = 'Seasoning only at the very end often leads to a dish that is technically finished but flatter than it should be.';

        return array_slice(array_values(array_unique($items)), 0, 4);
    }

    $items = [];

    if ($post['category'] === 'ciorbe-si-supe') {
        $items[] = 'Fierberea prea agresiva dupa ce ai adaugat ingredientele sensibile poate tulbura zeama si poate rupe textura ingredientelor.';
    }

    if (fom_seed_recipe_matches($post, ['smantana', 'galbenus'])) {
        $items[] = 'Adaugarea directa a smantanii sau a galbenusurilor in lichid foarte fierbinte fara temperare risca sa taie preparatul.';
    }

    if (fom_seed_recipe_matches($post, ['drojdie', 'faina', 'aluat'])) {
        $items[] = 'Prea multa faina adaugata din graba face aluatul greu si ascunde textura pe care o cauti de fapt.';
    }

    if (fom_seed_recipe_matches($post, ['orez'])) {
        $items[] = 'Umplerea prea stransa sau lipsa lichidului suficient nu lasa orezul sa se gateasca uniform si sa ramana placut la interior.';
    }

    if (fom_seed_recipe_matches($post, ['usturoi'])) {
        $items[] = 'Usturoiul tinut prea mult pe foc amaraste repede si schimba profilul retetei mai mult decat iti doresti.';
    }

    if (fom_seed_recipe_matches($post, ['fasole'])) {
        $items[] = 'Sarea pusa prea devreme sau lipsa timpului de inmuiere pot intarzia gatirea boabelor si pot lasa textura neuniforma.';
    }

    $items[] = 'Condimentarea finala facuta fara gustare pe parcurs duce des la preparate bune tehnic, dar plate sau prea insistente la masa.';

    return array_slice(array_values(array_unique($items)), 0, 4);
}

function fom_seed_render_related_links(string $heading, string $intro, array $slugs, array $post_ids, array $posts, string $heading_id = ''): string
{
    if ($slugs === []) {
        return '';
    }

    $id_attr = $heading_id !== '' ? ' id="' . esc_attr($heading_id) . '"' : '';
    $html = '<section class="related-posts"><h2' . $id_attr . '>' . esc_html($heading) . '</h2>';
    $html .= '<p>' . esc_html($intro) . '</p><ul>';

    foreach ($slugs as $slug) {
        $title = fom_seed_post_title($slug, $posts);
        $excerpt = fom_seed_post_excerpt($slug, $posts);
        $html .= '<li><a href="' . esc_url(fom_seed_link($slug, $post_ids)) . '">' . esc_html($title) . '</a>';
        if ($excerpt !== '') {
            $html .= ' - ' . esc_html(wp_trim_words($excerpt, 20, '...'));
        }
        $html .= '</li>';
    }

    $html .= '</ul></section>';

    return $html;
}

function fom_seed_article_context_paragraphs(array $post): array
{
    if (fom_seed_is_english()) {
        return [
            'This guide is built for practical searches, not vague inspiration. It connects the main topic to ordinary kitchen decisions: what to choose, what to prepare first, and what to notice while cooking.',
            'If you want to use it quickly, scan the subheadings first and come back to the relevant section when you are shopping, planning a meal, or comparing ingredients at home.',
        ];
    }

    return [
        'Ghidul de fata este gandit pentru cautari practice, nu pentru formulare vagi. El leaga subiectul principal de deciziile reale din bucatarie: cum alegi, cum organizezi, ce urmaresti si ce poti aplica imediat dupa lectura.',
        'Daca vrei sa folosesti rapid informatia, porneste de la subtitluri si revino la partea care te intereseaza chiar in momentul in care faci lista de cumparaturi, pregatesti ingredientele sau planifici o masa completa.',
    ];
}

function fom_seed_article_wrapup(array $post): string
{
    $first = $post['takeaways'][0] ?? 'Porneste de la lucrurile care iti aduc claritate imediata.';
    $second = $post['takeaways'][1] ?? 'Apoi adapteaza sfaturile la ingredientele si ritmul casei tale.';

    if (fom_seed_is_english()) {
        $first = $post['takeaways'][0] ?? 'Start with the point that gives you the quickest clarity.';
        $second = $post['takeaways'][1] ?? 'Then adapt the advice to your ingredients and your kitchen rhythm.';

        return 'If you want to put this guide to work quickly, begin with two simple moves: ' . $first . ' ' . $second . ' That keeps the article practical instead of letting it sit as theory only.';
    }

    return 'Daca vrei sa aplici rapid ideile din ghid, incepe cu doua miscari simple: ' . $first . ' ' . $second . ' In felul acesta, informatia nu ramane doar teorie, ci se transforma mai usor in mese mai bine gandite si retete mai previzibile.';
}

function fom_seed_article_snapshot_meta(array $post): array
{
    return [
        'takeaways' => array_values(array_slice($post['takeaways'] ?? [], 0, 3)),
        'section_headings' => array_values(array_map(static function ($section) {
            return (string) ($section['heading'] ?? '');
        }, $post['sections'] ?? [])),
        'section_count' => count($post['sections'] ?? []),
        'faq_count' => count($post['faq'] ?? []),
        'related_recipe_count' => count($post['related'] ?? []),
    ];
}

function fom_seed_recipe_intro_guidance(array $post): array
{
    if (fom_seed_is_english()) {
        return [
            'Read the recipe once before you start and prep the ingredients in advance so you can cook without unnecessary pauses between the important steps.',
            'Adjust heat and seasoning gradually. In home cooking, small corrections made at the right time are usually more useful than one large correction at the end.',
        ];
    }

    switch ($post['category']) {
        case 'ciorbe-si-supe':
            return [
                'Citeste reteta de la inceput pana la sfarsit si pregateste legumele, verdeata si ingredientele acide inainte sa pornesti focul. La ciorbe si supe, ordinea in care intra ingredientele schimba textura finala mai mult decat pare.',
                'Pastreaza focul domol in etapele sensibile, mai ales cand ai perisoare, dreseala cu smantana sau galuste. O fierbere blanda iti da zeama mai limpede, ingrediente intregi si un gust mai rotund.',
            ];
        case 'feluri-principale':
            return [
                'Pregateste toate ingredientele tocate si masurate inainte de rumenire, pentru ca felurile principale merg bine cand lucrezi fara pauze lungi intre pasi.',
                'Primele minute construiesc baza de gust: nu inghesui tigaia sau oala si lasa ingredientele sa prinda culoare inainte sa adaugi lichidul sau sosul.',
            ];
        case 'patiserie-si-deserturi':
            return [
                'Pentru deserturi si aluaturi, cantareste ingredientele si respecta temperaturile potrivite tipului de preparat. O diferenta mica de faina, lichid sau caldura schimba mult textura finala.',
                'Daca reteta presupune dospire, odihna sau racire, trateaza acel timp ca parte din preparare. Grabirea etapelor duce cel mai des la aluaturi dense sau umpluturi care curg.',
            ];
        case 'conserve-si-garnituri':
            return [
                'Spala bine legumele, ustensilele si recipientele inainte sa incepi. La conserve si garnituri, ordinea si curatenia sunt la fel de importante ca gustul.',
                'Gusta pe parcurs si ajusteaza sarea, aciditatea sau textura inainte de borcanare ori servire. Legumele, soiurile si gradul lor de apa variaza mult de la un sezon la altul.',
            ];
        default:
            return [
                'Pregateste ingredientele din timp si citeste pasii inainte sa incepi, ca sa poti lucra mai calm si mai precis.',
                'Ajusteaza focul si condimentarea treptat, nu dintr-o singura miscare. Rezultatul final iese mai echilibrat cand corectiile sunt mici si atent facute.',
            ];
    }
}

function fom_seed_recipe_adjustment_text(array $post): string
{
    if (fom_seed_is_english()) {
        if (fom_seed_recipe_matches($post, ['cream', 'yolk', 'smantana', 'galbenus'])) {
            return 'For a steadier finish, temper cream or yolks with warm liquid before adding them fully, and avoid a hard boil once they are in. That keeps the texture smoother and lowers the chance of splitting.';
        }

        if (fom_seed_recipe_matches($post, ['vinegar', 'lemon', 'pickle', 'bors', 'otet', 'lamaie', 'murata'])) {
            return 'Acidity is easiest to control near the end. Add lemon, vinegar, brine, or another sharp element gradually, tasting between adjustments so the final dish stays balanced.';
        }

        return 'Use the notes in the recipe as checkpoints, then adjust heat, liquid, or seasoning in small steps. Small corrections usually do more for the final result than one dramatic change.';
    }

    if (fom_seed_recipe_matches($post, ['smantana', 'galbenus'])) {
        return 'Pentru un rezultat mai stabil, tempereaza smantana sau galbenusurile cu lichid cald si evita clocotul puternic dupa ce le-ai adaugat. Asa pastrezi textura fina si reduci riscul de separare.';
    }

    if (fom_seed_recipe_matches($post, ['bors', 'otet', 'lamaie', 'murata'])) {
        return 'Aciditatea se ajusteaza cel mai bine la final. Adauga borsul, otetul sau lamaia treptat, gusta dupa fiecare ajustare si opreste-te cand preparatul ramane echilibrat si nu acopera restul aromelor.';
    }

    if (fom_seed_recipe_matches($post, ['drojdie', 'faina', 'aluat', 'gris'])) {
        return 'Textura depinde mult de umiditatea fainii, de temperatura ingredientelor si de rabdarea din etapele de odihna. Corecteaza in pasi mici, nu cu adaosuri mari facute dintr-o data.';
    }

    if (fom_seed_recipe_matches($post, ['fasole', 'orez'])) {
        return 'Fasolea si orezul cer rabdare si control asupra lichidului. Verifica periodic consistenta si completeaza doar cu lichid fierbinte, ca sa nu intrerupi gatirea si sa nu schimbi brusc textura.';
    }

    if ($post['category'] === 'conserve-si-garnituri') {
        return 'Pentru borcane sau garnituri care trebuie sa reziste, lucreaza cu recipiente curate si nu sari peste pasii de scurgere, sterilizare sau fierbere lenta. Stabilitatea se construieste din rutina, nu din graba.';
    }

    return 'Foloseste nota din reteta ca punct de control, apoi ajusteaza focul, lichidul sau condimentarea in pasi mici. La gatitul de acasa, corectiile mici fac diferenta mai mult decat o schimbare brusca.';
}

function fom_seed_recipe_serving_text(array $post): string
{
    if (fom_seed_is_english()) {
        return 'Serve the dish at the moment its texture is at its best and pair it with something simple that keeps the meal balanced. The suggested related recipes and guides are there to help readers turn one page into a fuller menu.';
    }

    switch ($post['category']) {
        case 'ciorbe-si-supe':
            return 'Serveste preparatul bine incalzit, cu verdeata proaspata si ceva simplu alaturi: paine buna, ardei iute sau o garnitura rece care taie din bogatia gustului. Daca planuiesti o masa completa, foloseste recomandarile de la final pentru a lega ciorba de un fel principal sau de un articol util.';
        case 'feluri-principale':
            return 'Felurile principale ies mai bine cand ajung pe masa imediat dupa o odihna scurta. Alege o garnitura simpla sau ceva acru care echilibreaza grasimea ori sosul, apoi completeaza meniul cu sugestiile de la finalul paginii.';
        case 'patiserie-si-deserturi':
            return 'Desertul se serveste cel mai bine dupa ce textura s-a asezat: usor cald, bine racit sau proaspat pudrat, in functie de tipul retetei. Daca pregatesti o masa mai mare, sugestiile din final te ajuta sa-l legi de alte preparate din aceeasi atmosfera.';
        case 'conserve-si-garnituri':
            return 'Serveste preparatul rece sau la temperatura potrivita tipului lui, ca acompaniament pentru mancaruri mai grele ori ca aperitiv simplu. Recomandarile de la finalul paginii te ajuta sa-l pui langa retete care il folosesc natural.';
        default:
            return 'Serveste preparatul intr-un ritm linistit si foloseste recomandarile de la final pentru a-l include intr-o masa mai mare sau intr-un meniu de sezon.';
    }
}

function fom_seed_recipe_storage_text(array $post): string
{
    if (fom_seed_is_english()) {
        return 'Cool the dish promptly, store it in a clean sealed container, and adapt the storage temperature to the main ingredients. When in doubt, chill faster and use it sooner rather than stretching the timeline.';
    }

    if ($post['slug'] === 'muraturi-asortate') {
        return 'Pastreaza borcanele inchise la loc racoros si ferit de lumina. Dupa deschidere, tine muraturile la frigider, foloseste ustensile curate si asigura-te ca legumele raman acoperite de saramura.';
    }

    if ($post['slug'] === 'zacusca-de-vinete') {
        return 'Borcanele bine sigilate se pastreaza la loc racoros si uscat. Dupa deschidere, tine zacusca la frigider, acoperita, si consuma-o in cateva zile, cu o lingura curata la fiecare servire.';
    }

    if ($post['slug'] === 'salata-de-vinete') {
        return 'Salata de vinete se pastreaza la frigider, in recipient inchis, de obicei una pana la doua zile. Amestec-o usor inainte de servire si evita sa o lasi mult timp la temperatura camerei.';
    }

    if ($post['category'] === 'ciorbe-si-supe') {
        if (fom_seed_recipe_matches($post, ['smantana', 'galbenus'])) {
            return 'Raceste ciorba in recipiente mai mici si pastreaz-o la frigider pana la doua zile. Reincalzeste-o bland, fara clocot puternic, ca sa nu se taie dreseala.';
        }

        return 'Raceste preparatul in vase joase sau portii mai mici, apoi pastreaza-l la frigider doua-trei zile. La reincalzire, adu-l din nou la fierbere blanda si potriveste gustul abia la final.';
    }

    if ($post['category'] === 'feluri-principale') {
        return 'Pastreaza mancarea la frigider in recipient bine inchis, de regula doua-trei zile, si reincalzeste-o uniform inainte de servire. Daca preparatul are sos, mai adauga putin lichid cald la reincalzire, doar cat sa-si recapete textura.';
    }

    if ($post['category'] === 'patiserie-si-deserturi') {
        if (fom_seed_recipe_matches($post, ['prajit', 'gogosi', 'papanasi'])) {
            return 'Deserturile prajite sunt cele mai bune in ziua in care sunt facute. Daca ramane ceva, tine-le acoperite la rece si incalzeste-le usor doar cat sa revina textura exterioara.';
        }

        return 'Pastreaza desertul intr-o cutie bine inchisa, ferita de umezeala, si adapteaza temperatura la tipul lui: la rece pentru umpluturi sensibile, la temperatura camerei pentru aluaturi uscate sau pufoase. Portioneaza doar cat ai nevoie, ca sa nu expui tot preparatul de fiecare data.';
    }

    return 'Pastreaza preparatul in recipiente curate, bine inchise, si adapteaza temperatura de depozitare la ingredientele dominante. Cand ai dubii, raceste mai repede si consuma mai devreme.';
}

function fom_seed_recipe_faq(array $post): array
{
    if (fom_seed_is_english()) {
        return [
            [
                'question' => 'Can I make part of this recipe ahead of time?',
                'answer' => 'Usually yes. Ingredient prep, partial cooking, or a controlled rest can often be done in advance, as long as the final texture-sensitive steps are saved for the right moment.',
            ],
            [
                'question' => 'How do I keep the texture from going wrong?',
                'answer' => 'Watch heat, moisture, and timing more closely than the clock alone. Most texture problems come from rushing, using too much dry ingredient too early, or skipping small adjustments during cooking.',
            ],
            [
                'question' => 'How should I store leftovers?',
                'answer' => 'Cool the food safely, store it in a sealed container, and reheat only what you plan to eat. The exact storage window depends on the ingredients and how the dish was handled after cooking.',
            ],
        ];
    }

    switch ($post['category']) {
        case 'ciorbe-si-supe':
            return [
                [
                    'question' => 'Pot pregati aceasta reteta cu o zi inainte?',
                    'answer' => 'Da. Multe ciorbe si supe se aseaza bine peste noapte, atat timp cat le racesti corect si le pastrezi la frigider. La reincalzire, mergi pe foc mic si ajusteaza gustul dupa ce preparatul este din nou omogen.',
                ],
                [
                    'question' => fom_seed_recipe_matches($post, ['smantana', 'galbenus']) ? 'Cum evit sa se taie smantana sau galbenusurile?' : 'Cand ajustez partea acra a retetei?',
                    'answer' => fom_seed_recipe_matches($post, ['smantana', 'galbenus'])
                        ? 'Tempereaza ingredientele reci cu lichid cald luat din oala si evita clocotul puternic dupa ce le adaugi. Diferenta brusca de temperatura este cauza cea mai comuna a texturii taiate.'
                        : 'Ingredientele acide se potrivesc cel mai bine la finalul gatirii. Adauga-le in etape mici, gusta dupa fiecare pas si lasa preparatul sa mai stea un minut inainte de verdictul final.',
                ],
                [
                    'question' => 'Pot congela reteta?',
                    'answer' => fom_seed_recipe_matches($post, ['smantana', 'galbenus'])
                        ? 'Se poate, dar textura dupa decongelare poate fi mai putin fina. Daca vrei cel mai bun rezultat, congeleaza baza fara dreseala si termina reteta la reincalzire.'
                        : 'In general, da, daca ingredientele au fost gatite si racite corect. Imparte in portii, noteaza data si reincalzeste doar cat consumi.',
                ],
            ];
        case 'feluri-principale':
            return [
                [
                    'question' => 'Pot pregati o parte din reteta in avans?',
                    'answer' => 'Da. Tocarea ingredientelor, pregatirea sosului sau chiar gatirea partiala se pot face inainte, iar montajul final devine mai simplu. E util mai ales pentru mesele de familie sau pentru gatit in timpul saptamanii.',
                ],
                [
                    'question' => 'Cum evit sa iasa preparatul uscat sau prea gros?',
                    'answer' => 'Controleaza focul dupa rumenire si urmareste lichidul in etape scurte, nu doar la sfarsit. Daca sosul scade prea repede, completeaza cu lichid cald, iar daca ingredientele sunt foarte slabe, compenseaza prin timp de gatire mai bland.',
                ],
                [
                    'question' => 'Cu ce merge cel mai bine la masa?',
                    'answer' => 'Piureul, painea buna, o garnitura simpla sau muraturile pot merge foarte bine cu multe feluri principale. Cauta in recomandarile de la final combinatiile care sustin gustul retetei, nu il incarca.',
                ],
            ];
        case 'patiserie-si-deserturi':
            return [
                [
                    'question' => 'Pot pregati aluatul sau compozitia in avans?',
                    'answer' => 'De cele mai multe ori, da, dar depinde de reteta. Aluaturile dospite suporta bine o pregatire partiala si o odihna controlata, in timp ce compozitiile foarte aerate sau prajite merg mai bine proaspete.',
                ],
                [
                    'question' => 'De ce nu a iesit textura pufoasa sau frageda?',
                    'answer' => 'Cele mai frecvente cauze sunt ingredientele la temperatura nepotrivita, prea multa faina, dospirea grabita sau focul prea puternic. Corectiile mici, facute la timp, sunt mai utile decat schimbarea retetei din mers.',
                ],
                [
                    'question' => 'Cum il pastrez ca sa ramana bun si a doua zi?',
                    'answer' => 'Protejeaza preparatul de aer si umezeala: cutie inchisa, hartie de copt intre straturi daca este fragil, si racire completa inainte de ambalare. Pentru deserturile prajite, accepta ca ziua prepararii ramane cea mai buna varianta.',
                ],
            ];
        case 'conserve-si-garnituri':
            return [
                [
                    'question' => 'De ce conteaza atat de mult borcanele curate sau sterilizate?',
                    'answer' => 'Pentru ca stabilitatea preparatului nu depinde doar de reteta, ci si de mediul in care il inchizi. Un borcan curat, uscat si manipulat corect reduce riscul de alterare si iti protejeaza munca.',
                ],
                [
                    'question' => 'Cat rezista preparatul?',
                    'answer' => 'Durata depinde de tipul retetei, de modul de depozitare si de felul in care a fost inchis. Pentru borcanele deschise, regula buna este frigider, ustensile curate si consum in cateva zile, nu in cateva saptamani.',
                ],
                [
                    'question' => 'Cum imi dau seama ca textura si gustul sunt in regula?',
                    'answer' => 'Uita-te la miros, culoare, lichidul din borcan si la felul in care se aseaza preparatul dupa racire. Daca ceva pare neobisnuit sau prea departe de ce ai obtinut de obicei, mai bine refaci decat sa fortezi folosirea lui.',
                ],
            ];
        default:
            return [];
    }
}

function fom_seed_render_faq_html(array $items, string $heading_id = ''): string
{
    if ($items === []) {
        return '';
    }

    $id_attr = $heading_id !== '' ? ' id="' . esc_attr($heading_id) . '"' : '';
    $html = '<section><h2' . $id_attr . '>' . esc_html(fom_seed_ui('Intrebari frecvente', 'Frequently asked questions')) . '</h2>';
    foreach ($items as $item) {
        $html .= '<h3>' . esc_html($item['question']) . '</h3>';
        $html .= '<p>' . esc_html($item['answer']) . '</p>';
    }
    $html .= '</section>';

    return $html;
}

function fom_seed_article_takeaways_html(array $takeaways, string $heading = '', string $heading_id = ''): string
{
    if ($takeaways === []) {
        return '';
    }

    if ($heading === '') {
        $heading = fom_seed_ui('Pe scurt', 'At a glance');
    }

    $id_attr = $heading_id !== '' ? ' id="' . esc_attr($heading_id) . '"' : '';
    $html = '<section><h2' . $id_attr . '>' . esc_html($heading) . '</h2><ul>';
    foreach ($takeaways as $takeaway) {
        $html .= '<li>' . esc_html($takeaway) . '</li>';
    }
    $html .= '</ul></section>';

    return $html;
}

function fom_seed_recipe_content(array $post, array $post_ids, array $category_ids, array $posts, array $pages): string
{
    $category_id = $category_ids[$post['category']] ?? 0;
    $category_link = $category_id ? get_category_link($category_id) : home_url('/');
    $category_name = $category_id ? get_cat_name($category_id) : fom_seed_slug_to_title($post['category']);
    $prep_minutes = fom_seed_duration_minutes($post['prep']);
    $cook_minutes = fom_seed_duration_minutes($post['cook']);
    $total = $prep_minutes + $cook_minutes;
    $total_label = fom_seed_format_minutes($total);
    $takeaways_heading = fom_seed_ui('Ce merita sa stii', 'What to know first');
    $why_heading = fom_seed_ui('De ce merita reteta', 'Why this recipe works');
    $snapshot_heading = fom_seed_ui('Pe scurt', 'Quick snapshot');
    $prep_label = fom_seed_ui('Pregatire', 'Prep');
    $cook_label = fom_seed_ui('Gatire', 'Cook');
    $total_word = fom_seed_ui('Total', 'Total');
    $servings_label = fom_seed_ui('Portii', 'Servings');
    $ingredients_heading = fom_seed_ui('Ingrediente', 'Ingredients');
    $steps_heading = fom_seed_ui('Mod de preparare', 'Method');
    $focus_heading = fom_seed_ui('Ingrediente-cheie si adaptari', 'Key ingredients and adjustments');
    $before_heading = fom_seed_ui('Inainte sa incepi', 'Before you start');
    $tips_heading = fom_seed_ui('Sfaturi pentru reusita', 'Success notes');
    $mistakes_heading = fom_seed_ui('Greseli frecvente', 'Common mistakes');
    $serving_heading = fom_seed_ui('Cum servesti', 'Serving ideas');
    $storage_heading = fom_seed_ui('Cum pastrezi', 'Storage');
    $related_heading = fom_seed_ui('Legaturi utile', 'Useful next links');
    $related_intro = fom_seed_ui(
        'Continua din aceeasi zona culinara cu retete si ghiduri care completeaza firesc preparatul de mai sus.',
        'Keep going with recipes and guides that naturally connect to the dish above.'
    );
    $category_link_label = fom_seed_ui('Mai multe retete din ', 'More recipes from ');
    $category_link_note = fom_seed_ui(
        ' - archivea categoriei te ajuta sa compari preparate apropiate ca gust, tehnica sau moment de servire.',
        ' - the category archive helps readers compare similar dishes, techniques, and serving ideas.'
    );
    $allergen_note = fom_seed_ui(
        'Nota: verifica mereu alergenii si adapteaza reteta la ingredientele tale.',
        'Note: always check allergens and adapt the recipe to your ingredients and needs.'
    );

    $html = '';
    $html .= '<p>' . esc_html(fom_seed_post_intro($post)) . '</p>';
    $html .= '<p>' . (
        fom_seed_is_english()
            ? 'This recipe lives in <a href="' . esc_url($category_link) . '">' . esc_html($category_name) . '</a> and is written for home cooking, with clear steps and realistic ingredient guidance.'
            : 'Reteta face parte din categoria <a href="' . esc_url($category_link) . '">' . esc_html($category_name) . '</a> si este scrisa pentru gatit acasa, cu pasi clari si ingrediente usor de verificat.'
    ) . '</p>';
    $html .= '[fom_ad slot="after_intro"]';
    $html .= fom_seed_article_takeaways_html($post['takeaways'] ?? [], $takeaways_heading, sanitize_title($takeaways_heading));
    $html .= '<section><h2 id="' . esc_attr(sanitize_title($why_heading)) . '">' . esc_html($why_heading) . '</h2>';
    foreach (fom_seed_recipe_value_paragraphs($post) as $paragraph) {
        $html .= '<p>' . esc_html($paragraph) . '</p>';
    }
    $html .= '</section>';
    $html .= '<section class="fom-recipe-box">';
    $html .= '<h2 id="' . esc_attr(sanitize_title($snapshot_heading)) . '">' . esc_html($snapshot_heading) . '</h2>';
    $html .= '<div class="fom-recipe-meta">';
    $html .= '<div><span>' . esc_html($prep_label) . '</span><strong>' . esc_html($post['prep']) . '</strong></div>';
    $html .= '<div><span>' . esc_html($cook_label) . '</span><strong>' . esc_html($post['cook']) . '</strong></div>';
    $html .= '<div><span>' . esc_html($total_word) . '</span><strong>' . esc_html(trim($total_label)) . '</strong></div>';
    $html .= '<div><span>' . esc_html($servings_label) . '</span><strong>' . esc_html($post['servings']) . '</strong></div>';
    $html .= '</div>';
    $html .= '<h2 id="' . esc_attr(sanitize_title($ingredients_heading)) . '">' . esc_html($ingredients_heading) . '</h2><ul>';
    foreach ($post['ingredients'] as $ingredient) {
        $html .= '<li>' . esc_html($ingredient) . '</li>';
    }
    $html .= '</ul>';
    $html .= '<h2 id="' . esc_attr(sanitize_title($steps_heading)) . '">' . esc_html($steps_heading) . '</h2><ol>';
    foreach (array_values($post['steps']) as $index => $step) {
        $html .= '<li id="' . esc_attr(sanitize_title($steps_heading)) . '-step-' . esc_attr((string) ($index + 1)) . '">' . esc_html($step) . '</li>';
    }
    $html .= '</ol>';
    $html .= '</section>';
    $html .= '[fom_ad slot="mid_content"]';
    $html .= '<section><h2 id="' . esc_attr(sanitize_title($focus_heading)) . '">' . esc_html($focus_heading) . '</h2>';
    foreach (fom_seed_recipe_ingredient_focus_paragraphs($post) as $paragraph) {
        $html .= '<p>' . esc_html($paragraph) . '</p>';
    }
    $html .= '</section>';
    $html .= '<h2 id="' . esc_attr(sanitize_title($before_heading)) . '">' . esc_html($before_heading) . '</h2>';
    foreach (fom_seed_recipe_intro_guidance($post) as $paragraph) {
        $html .= '<p>' . esc_html($paragraph) . '</p>';
    }
    $html .= '<h2 id="' . esc_attr(sanitize_title($tips_heading)) . '">' . esc_html($tips_heading) . '</h2>';
    $html .= '<p>' . esc_html($post['notes']) . '</p>';
    $html .= '<p>' . esc_html(fom_seed_recipe_adjustment_text($post)) . '</p>';
    $html .= '<section><h2 id="' . esc_attr(sanitize_title($mistakes_heading)) . '">' . esc_html($mistakes_heading) . '</h2><ul>';
    foreach (fom_seed_recipe_common_mistakes($post) as $item) {
        $html .= '<li>' . esc_html($item) . '</li>';
    }
    $html .= '</ul></section>';
    $html .= '<h2 id="' . esc_attr(sanitize_title($serving_heading)) . '">' . esc_html($serving_heading) . '</h2>';
    $html .= '<p>' . esc_html(fom_seed_recipe_serving_text($post)) . '</p>';
    $html .= '<h2 id="' . esc_attr(sanitize_title($storage_heading)) . '">' . esc_html($storage_heading) . '</h2>';
    $html .= '<p>' . esc_html(fom_seed_recipe_storage_text($post)) . '</p>';
    $html .= fom_seed_render_faq_html(fom_seed_recipe_faq($post), sanitize_title(fom_seed_ui('Intrebari frecvente', 'Frequently asked questions')));
    $html .= '<section class="related-posts"><h2 id="' . esc_attr(sanitize_title($related_heading)) . '">' . esc_html($related_heading) . '</h2><p>' . esc_html($related_intro) . '</p><ul>';
    $html .= '<li><a href="' . esc_url($category_link) . '">' . esc_html($category_link_label . $category_name) . '</a>' . esc_html($category_link_note) . '</li>';
    foreach (array_merge($post['related'] ?? [], $post['related_articles'] ?? []) as $slug) {
        $html .= '<li><a href="' . esc_url(fom_seed_link($slug, $post_ids)) . '">' . esc_html(fom_seed_post_title($slug, $posts)) . '</a>';
        $related_excerpt = fom_seed_post_excerpt($slug, $posts);
        if ($related_excerpt !== '') {
            $html .= ' - ' . esc_html(wp_trim_words($related_excerpt, 18, '...'));
        }
        $html .= '</li>';
    }
    $html .= '</ul></section>';
    $html .= '<p><em>' . esc_html($allergen_note) . '</em></p>';

    return $html;
}

function fom_seed_article_content(array $post, array $post_ids, array $category_ids, array $posts, array $pages): string
{
    $category_id = $category_ids[$post['category']] ?? 0;
    $category_link = $category_id ? get_category_link($category_id) : home_url('/');
    $site_name = fom_seed_site_name($pages);
    $profile = fom_seed_current_site_profile();
    // Link to the pillar category archives (no standalone recipes/guides pages).
    $recipes_url = isset($category_ids['recipes']) ? get_category_link($category_ids['recipes']) : home_url('/');
    $guides_url = isset($category_ids['tips']) ? get_category_link($category_ids['tips']) : home_url('/');
    $overview_heading = fom_seed_ui('Ce gasesti in ghid', 'What this guide helps with');
    $wrapup_heading = fom_seed_ui('Ce aplici mai intai', 'What to apply first');
    $related_heading = fom_seed_ui('Retete pe acelasi fir', 'Recipes that fit this guide');
    $related_intro = fom_seed_ui(
        'Porneste de la aceste retete daca vrei sa transformi ideile din articol in ceva concret de pus pe masa.',
        'Start with these recipes if you want to turn the ideas in this article into something practical on the table.'
    );
    $html = '<p>' . esc_html(fom_seed_post_intro($post)) . '</p>';
    $html .= '<p>' . (
        fom_seed_is_english()
            ? 'This guide complements the wider <a href="' . esc_url($recipes_url) . '">' . esc_html($site_name) . ' recipe collection</a> and the broader <a href="' . esc_url($guides_url) . '">guides archive</a>.'
            : 'Acest ghid completeaza colectia de <a href="' . esc_url($recipes_url) . '">retete ' . esc_html($site_name) . '</a> si arhiva de <a href="' . esc_url($category_link) . '">articole culinare</a>.'
    ) . '</p>';
    $html .= fom_seed_article_takeaways_html($post['takeaways'] ?? []);
    $html .= '<section><h2>' . esc_html($overview_heading) . '</h2>';
    foreach (fom_seed_article_context_paragraphs($post) as $paragraph) {
        $html .= '<p>' . esc_html($paragraph) . '</p>';
    }
    $html .= '</section>';

    $index = 0;
    foreach ($post['sections'] as $section) {
        $html .= '<h2>' . esc_html($section['heading']) . '</h2>';
        $html .= '<p>' . esc_html($section['body']) . '</p>';
        $index++;
        if ($index === 1) {
            $html .= '[fom_ad slot="mid_content"]';
        }
    }

    $html .= fom_seed_render_faq_html($post['faq'] ?? []);
    $html .= '<section><h2>' . esc_html($wrapup_heading) . '</h2><p>' . esc_html(fom_seed_article_wrapup($post)) . '</p></section>';
    $html .= fom_seed_render_related_links(
        $related_heading,
        $related_intro,
        $post['related'] ?? [],
        $post_ids,
        $posts
    );
    // Article-to-article internal links (topical cluster / link equity). Recipes
    // already render both related recipes AND related_articles; articles only
    // rendered their recipes, so sibling guides/stories were never linked. The
    // helper no-ops on an empty list, so posts without related_articles are unaffected.
    $html .= fom_seed_render_related_links(
        fom_seed_ui('Continua lectura', 'Keep reading'),
        fom_seed_ui(
            'Alte ghiduri si povesti pe acelasi subiect, daca vrei sa mergi mai departe.',
            'More guides and stories on the same theme, if you want to go further.'
        ),
        $post['related_articles'] ?? [],
        $post_ids,
        $posts
    );

    return $html;
}

function fom_seed_reset_menu(string $name, string $location): int
{
    $menu = wp_get_nav_menu_object($name);
    $menu_id = $menu ? (int) $menu->term_id : (int) wp_create_nav_menu($name);

    foreach ((array) wp_get_nav_menu_items($menu_id) as $item) {
        wp_delete_post($item->ID, true);
    }

    $locations = get_theme_mod('nav_menu_locations', []);
    $locations[$location] = $menu_id;
    set_theme_mod('nav_menu_locations', $locations);

    return $menu_id;
}

function fom_seed_menu_page(int $menu_id, string $title, int $page_id): void
{
    wp_update_nav_menu_item($menu_id, 0, [
        'menu-item-title' => $title,
        'menu-item-object' => 'page',
        'menu-item-object-id' => $page_id,
        'menu-item-type' => 'post_type',
        'menu-item-status' => 'publish',
    ]);
}

function fom_seed_menu_category(int $menu_id, string $title, int $category_id): void
{
    wp_update_nav_menu_item($menu_id, 0, [
        'menu-item-title' => $title,
        'menu-item-object' => 'category',
        'menu-item-object-id' => $category_id,
        'menu-item-type' => 'taxonomy',
        'menu-item-status' => 'publish',
    ]);
}

function fom_seed_activate_plugin(string $plugin): void
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

function fom_seed_image_plan(string $path): array
{
    if (!file_exists($path)) {
        return [];
    }

    $items = fom_seed_json($path);
    $plan = [];

    foreach ($items as $item) {
        if (!is_array($item) || empty($item['slug'])) {
            continue;
        }

        $plan[sanitize_title((string) $item['slug'])] = $item;
    }

    return $plan;
}

function fom_seed_image_path(array $image): string
{
    $base = '/content/images';
    $filename = sanitize_file_name((string) ($image['filename'] ?? ''));

    if ($filename !== '') {
        $path = $base . '/' . $filename;
        if (is_readable($path)) {
            return $path;
        }
    }

    $slug = sanitize_title((string) ($image['slug'] ?? ''));
    if ($slug === '') {
        return '';
    }

    foreach (['jpg', 'jpeg', 'png', 'webp'] as $extension) {
        $path = $base . '/' . $slug . '.' . $extension;
        if (is_readable($path)) {
            return $path;
        }
    }

    return '';
}

function fom_seed_find_attachment(string $filename): int
{
    $ids = get_posts([
        'post_type' => 'attachment',
        'post_status' => 'inherit',
        'posts_per_page' => 1,
        'fields' => 'ids',
        'no_found_rows' => true,
        'meta_key' => '_fom_seed_image_filename',
        'meta_value' => $filename,
    ]);

    if (!empty($ids)) {
        return (int) $ids[0];
    }

    $slug = sanitize_title(pathinfo($filename, PATHINFO_FILENAME));
    $attachment = $slug !== '' ? get_page_by_path($slug, OBJECT, 'attachment') : null;

    return $attachment ? (int) $attachment->ID : 0;
}

function fom_seed_apply_attachment_meta(int $attachment_id, array $image): void
{
    $alt = sanitize_text_field((string) ($image['alt'] ?? ''));
    $title = sanitize_text_field((string) ($image['title'] ?? ''));
    $caption = sanitize_text_field((string) ($image['caption'] ?? ''));
    $description = sanitize_textarea_field((string) ($image['description'] ?? ''));

    if ($alt !== '') {
        update_post_meta($attachment_id, '_wp_attachment_image_alt', substr($alt, 0, 160));
    }

    $attachment_update = ['ID' => $attachment_id];
    if ($title !== '') {
        $attachment_update['post_title'] = substr($title, 0, 90);
    }
    if ($caption !== '') {
        $attachment_update['post_excerpt'] = substr($caption, 0, 180);
    }
    if ($description !== '') {
        $attachment_update['post_content'] = substr($description, 0, 320);
    }

    if (count($attachment_update) > 1) {
        wp_update_post(wp_slash($attachment_update), true);
    }
}

function fom_seed_store_image_plan_meta(int $post_id, array $image): void
{
    update_post_meta($post_id, '_fom_image_plan_filename', sanitize_file_name((string) ($image['filename'] ?? '')));
    update_post_meta($post_id, '_fom_image_plan_alt', sanitize_text_field((string) ($image['alt'] ?? '')));
    update_post_meta($post_id, '_fom_image_plan_title', sanitize_text_field((string) ($image['title'] ?? '')));
    update_post_meta($post_id, '_fom_image_plan_caption', sanitize_text_field((string) ($image['caption'] ?? '')));
    update_post_meta($post_id, '_fom_image_plan_description', sanitize_textarea_field((string) ($image['description'] ?? '')));
    update_post_meta($post_id, '_fom_image_plan_prompt', sanitize_textarea_field((string) ($image['prompt'] ?? '')));
}

function fom_seed_import_featured_image(int $post_id, array $image): void
{
    fom_seed_store_image_plan_meta($post_id, $image);

    $filename = sanitize_file_name((string) ($image['filename'] ?? ''));
    if ($filename === '') {
        return;
    }

    $source = fom_seed_image_path($image);
    if ($source === '') {
        return;
    }

    $source_hash = hash_file('sha256', $source) ?: '';
    $attachment_id = fom_seed_find_attachment($filename);
    if ($attachment_id && $source_hash !== '' && (string) get_post_meta($attachment_id, '_fom_seed_image_hash', true) !== $source_hash) {
        wp_delete_attachment($attachment_id, true);
        $attachment_id = 0;
    }

    if (!$attachment_id) {
        require_once ABSPATH . 'wp-admin/includes/image.php';
        require_once ABSPATH . 'wp-admin/includes/file.php';

        $bits = file_get_contents($source);
        if ($bits === false) {
            throw new RuntimeException("Cannot read image {$source}");
        }

        $upload = wp_upload_bits($filename, null, $bits);
        if (!empty($upload['error'])) {
            throw new RuntimeException((string) $upload['error']);
        }

        $filetype = wp_check_filetype($upload['file'], null);
        $attachment_id = wp_insert_attachment(wp_slash([
            'post_mime_type' => $filetype['type'] ?: 'image/jpeg',
            'post_title' => sanitize_text_field((string) ($image['title'] ?? pathinfo($filename, PATHINFO_FILENAME))),
            'post_excerpt' => sanitize_text_field((string) ($image['caption'] ?? '')),
            'post_content' => sanitize_textarea_field((string) ($image['description'] ?? '')),
            'post_status' => 'inherit',
            'post_parent' => $post_id,
        ]), $upload['file'], $post_id, true);

        if (is_wp_error($attachment_id)) {
            throw new RuntimeException($attachment_id->get_error_message());
        }

        $metadata = wp_generate_attachment_metadata((int) $attachment_id, $upload['file']);
        if (!is_wp_error($metadata) && !empty($metadata)) {
            wp_update_attachment_metadata((int) $attachment_id, $metadata);
        }

        update_post_meta((int) $attachment_id, '_fom_seed_image_filename', $filename);
        update_post_meta((int) $attachment_id, '_fom_seed_image_slug', sanitize_title((string) ($image['slug'] ?? '')));
    }

    wp_update_post(wp_slash([
        'ID' => (int) $attachment_id,
        'post_parent' => $post_id,
    ]), true);

    fom_seed_apply_attachment_meta((int) $attachment_id, $image);
    update_post_meta((int) $attachment_id, '_fom_seed_image_filename', $filename);
    update_post_meta((int) $attachment_id, '_fom_seed_image_slug', sanitize_title((string) ($image['slug'] ?? '')));
    if ($source_hash !== '') {
        update_post_meta((int) $attachment_id, '_fom_seed_image_hash', $source_hash);
    }
    if (!set_post_thumbnail($post_id, (int) $attachment_id)) {
        update_post_meta($post_id, '_thumbnail_id', (int) $attachment_id);
    }
}

/**
 * Import an author headshot (from /content/images/<filename>) as a media
 * attachment and return its ID, so it can be set as the author's photo. Idempotent
 * via the same _fom_seed_image_filename marker used for featured images.
 */
function fom_seed_import_author_photo(string $filename, string $title): int
{
    $filename = sanitize_file_name($filename);
    if ($filename === '') {
        return 0;
    }
    $source = '';
    foreach (['/content/images/' . $filename, ABSPATH . '../content/images/' . $filename] as $candidate) {
        if (is_readable($candidate)) {
            $source = $candidate;
            break;
        }
    }
    if ($source === '') {
        return 0;
    }

    require_once ABSPATH . 'wp-admin/includes/image.php';
    require_once ABSPATH . 'wp-admin/includes/file.php';

    $found = get_posts([
        'post_type'      => 'attachment',
        'posts_per_page' => 1,
        'fields'         => 'ids',
        'meta_key'       => '_fom_seed_image_filename',
        'meta_value'     => $filename,
    ]);
    $attachment_id = $found ? (int) $found[0] : 0;

    if (!$attachment_id) {
        $bits = file_get_contents($source);
        if ($bits === false) {
            return 0;
        }
        $upload = wp_upload_bits($filename, null, $bits);
        if (!empty($upload['error'])) {
            return 0;
        }
        $filetype = wp_check_filetype($upload['file'], null);
        $attachment_id = wp_insert_attachment(wp_slash([
            'post_mime_type' => $filetype['type'] ?: 'image/jpeg',
            'post_title'     => $title !== '' ? $title : pathinfo($filename, PATHINFO_FILENAME),
            'post_status'    => 'inherit',
        ]), $upload['file']);
        if (is_wp_error($attachment_id)) {
            return 0;
        }
        $metadata = wp_generate_attachment_metadata((int) $attachment_id, $upload['file']);
        if (!is_wp_error($metadata) && !empty($metadata)) {
            wp_update_attachment_metadata((int) $attachment_id, $metadata);
        }
        update_post_meta((int) $attachment_id, '_fom_seed_image_filename', $filename);
    }

    return (int) $attachment_id;
}

/**
 * Import the brand icon as a media attachment and set it as the WordPress Site Icon
 * (favicon + apple-touch-icon). Instantiating WP_Site_Icon first registers the
 * site-icon intermediate sizes so wp_generate_attachment_metadata() creates them,
 * which means the favicon <link> tags WP outputs never point at missing files.
 */
function fom_seed_set_site_icon(): void
{
    $source = '';
    foreach (['/content/images/fom-icon.png', ABSPATH . '../content/images/fom-icon.png'] as $candidate) {
        if (is_readable($candidate)) {
            $source = $candidate;
            break;
        }
    }
    if ($source === '') {
        return;
    }

    $existing = (int) get_option('site_icon');
    if ($existing && get_post($existing)) {
        return; // already set — idempotent
    }

    require_once ABSPATH . 'wp-admin/includes/image.php';
    require_once ABSPATH . 'wp-admin/includes/file.php';
    require_once ABSPATH . 'wp-admin/includes/class-wp-site-icon.php';
    new WP_Site_Icon(); // registers the site-icon crop sizes via intermediate_image_sizes_advanced

    $found = get_posts([
        'post_type'      => 'attachment',
        'posts_per_page' => 1,
        'fields'         => 'ids',
        'meta_key'       => '_fom_seed_image_filename',
        'meta_value'     => 'fom-icon.png',
    ]);
    $attachment_id = $found ? (int) $found[0] : 0;

    if (!$attachment_id) {
        $bits = file_get_contents($source);
        if ($bits === false) {
            return;
        }
        $upload = wp_upload_bits('fom-icon.png', null, $bits);
        if (!empty($upload['error'])) {
            return;
        }
        $filetype = wp_check_filetype($upload['file'], null);
        $attachment_id = wp_insert_attachment(wp_slash([
            'post_mime_type' => $filetype['type'] ?: 'image/png',
            'post_title'     => 'Kepoli site icon',
            'post_status'    => 'inherit',
        ]), $upload['file']);
        if (is_wp_error($attachment_id)) {
            return;
        }
        $metadata = wp_generate_attachment_metadata((int) $attachment_id, $upload['file']);
        if (!is_wp_error($metadata) && !empty($metadata)) {
            wp_update_attachment_metadata((int) $attachment_id, $metadata);
        }
        update_post_meta((int) $attachment_id, '_fom_seed_image_filename', 'fom-icon.png');
    }

    update_option('site_icon', (int) $attachment_id);
}

function fom_seed_delete_placeholder_posts(array $expected_slugs): void
{
    $expected = array_flip(array_map('sanitize_title', $expected_slugs));
    // Only SPECIFIC scaffold sentences — never a generic substring. 'Ingredient 1' was dropped:
    // a real recipe/tutorial/comparison post can legitimately contain that literal, and this
    // routine would otherwise destroy hand-written editorial content on a FORCE_RESEED.
    $placeholder_markers = [
        'Scrie aici de ce merita pregatita reteta',
        'Write here why the recipe is worth making',
        'Descrie primul pas clar',
        'Describe the first step clearly',
        'Continua cu pasii in ordinea fireasca',
        'Continue with the steps in natural order',
        'Incheie cu momentul in care preparatul este gata',
        'Finish with how the dish is clearly done',
        'Adauga ajustari, greseli de evitat',
        'Add adjustments and mistakes to avoid',
        'Raspunde practic, cu intervale realiste',
        'Answer practically, with realistic timing',
    ];

    $query = new WP_Query([
        'post_type' => 'post',
        'post_status' => ['publish', 'draft', 'pending', 'future'],
        'posts_per_page' => -1,
        'fields' => 'ids',
        'no_found_rows' => true,
    ]);

    foreach ($query->posts as $post_id) {
        $slug = (string) get_post_field('post_name', $post_id);
        if ($slug !== '' && isset($expected[$slug])) {
            continue;
        }

        $content = (string) get_post_field('post_content', $post_id);
        foreach ($placeholder_markers as $marker) {
            if (str_contains($content, $marker)) {
                wp_delete_post((int) $post_id, false);   /* Trash (recoverable), not a permanent force-delete, in case a real post ever matches */
                break;
            }
        }
    }
}

if (wp_get_theme()->get_stylesheet() !== 'viral-reader' && wp_get_theme('viral-reader')->exists()) {
    switch_theme('viral-reader');
}

fom_seed_activate_plugin('automation-hamri/wp-automator-pro.php');

$categories = fom_seed_json('/content/categories.json');
$pages = fom_seed_json('/content/pages.json');
$site_profile = fom_seed_site_profile('/content/site-profile.json', $pages);
$GLOBALS['fom_seed_site_profile'] = $site_profile;
$posts = fom_seed_json('/content/posts.json');
$image_plan = fom_seed_image_plan('/content/image-plan.json');
$site_name = fom_seed_site_name($pages);
$home_page_slug = fom_seed_profile_slug($site_profile, 'home', fom_seed_home_page_slug($pages));
$recipes_page_slug = fom_seed_profile_slug($site_profile, 'recipes', fom_seed_recipes_page_slug($pages));
$guides_page_slug = fom_seed_profile_slug($site_profile, 'guides', fom_seed_guides_page_slug($pages));
$about_page_slug = fom_seed_profile_slug($site_profile, 'about', fom_seed_site_about_slug($pages));
$author_page_slug = fom_seed_profile_slug($site_profile, 'author', fom_seed_author_page_slug($pages));
$privacy_page_slug = fom_seed_profile_slug($site_profile, 'privacy', fom_seed_find_page_slug($pages, ['politica-de-confidentialitate', 'privacy-policy']));
$cookies_page_slug = fom_seed_profile_slug($site_profile, 'cookies', fom_seed_find_page_slug($pages, ['politica-de-cookies', 'cookie-policy']));
$advertising_page_slug = fom_seed_profile_slug($site_profile, 'advertising', fom_seed_find_page_slug($pages, ['publicitate-si-consimtamant', 'advertising-and-consent']));
$editorial_page_slug = fom_seed_profile_slug($site_profile, 'editorial', fom_seed_find_page_slug($pages, ['politica-editoriala', 'editorial-policy']));
$terms_page_slug = fom_seed_profile_slug($site_profile, 'terms', fom_seed_find_page_slug($pages, ['termeni-si-conditii', 'terms-and-conditions']));
$disclaimer_page_slug = fom_seed_profile_slug($site_profile, 'disclaimer', fom_seed_find_page_slug($pages, ['disclaimer-culinar', 'culinary-disclaimer']));

update_option('fom_site_profile', $site_profile);
update_option('WPLANG', (string) fom_seed_profile_value($site_profile, ['locales', 'public'], fom_seed_env('WP_LOCALE', 'en_US')));
update_option('blogname', $site_name);
update_option('blogdescription', fom_seed_default_tagline($site_name));
update_option('admin_email', (string) fom_seed_profile_value($site_profile, ['brand', 'site_email'], fom_seed_env('SITE_EMAIL', 'contact@example.com')));
update_option('blog_public', '1');
update_option('timezone_string', fom_seed_env('TIMEZONE_STRING', fom_seed_is_english() ? 'UTC' : 'Europe/Bucharest'));
update_option('date_format', fom_seed_env('DATE_FORMAT', fom_seed_is_english() ? 'F j, Y' : 'j F Y'));
update_option('time_format', fom_seed_env('TIME_FORMAT', fom_seed_is_english() ? 'g:i a' : 'H:i'));
update_option('posts_per_page', 9);
update_option('default_role', 'subscriber');
update_option('default_comment_status', 'closed');
update_option('default_ping_status', 'closed');
update_option('require_name_email', '1');
update_option('close_comments_for_old_posts', '1');
update_option('close_comments_days_old', '14');
fom_seed_set_site_icon();

global $wp_rewrite;
if ($wp_rewrite instanceof WP_Rewrite) {
    $wp_rewrite->set_permalink_structure('/%category%/%postname%/');
}

$author_id = fom_seed_ensure_author($pages, $site_name, $site_profile);
fom_seed_delete_placeholder_posts(array_column($posts, 'slug'));

$category_ids = [];
foreach ($categories as $category) {
    $category_ids[$category['slug']] = fom_seed_ensure_category($category);
}

$page_ids = [];
foreach ($pages as $page) {
    $page_ids[$page['slug']] = fom_seed_upsert_page($page, $author_id);
}

update_option('show_on_front', 'page');
update_option('page_on_front', $page_ids[$home_page_slug] ?? (count($page_ids) > 0 ? (int) reset($page_ids) : 0));

/* ── Automation Hamri plugin defaults (fill-if-empty; never clobbers a configured site) ──
   The plugin ships with everything OFF/blank; on a FRESH kepoli deploy these bring it up
   "complete" for the bulk-publish + AdSense workflow. add_option() only inserts when the
   option is ABSENT, so a redeploy or any manual settings change is preserved untouched.
   NOTES: (1) the ad-injection master switch is deliberately left UNSET (= OFF, the plugin's
   default) — kepoli serves AdSense through its own fom-adtech mu-plugin, and turning on
   the plugin's ad engine too would double-load ads (an AdSense policy risk). (2) Recipe
   schema needs NO setting — it emits automatically for type:recipe posts via the theme.
   (3) The global first-comment default is reach-safe (no CTA/"full article"); a per-post
   comment always overrides it. */
add_option('wpap_content_opts', array(
    'min_words'           => 0,
    'skip_dupe_titles'    => 1,   // don't re-publish a same-title post on a zip re-upload
    'disable_comments'    => 0,
    'clean_media'         => 0,
    'fb_comment_template' => "This is one of those little tricks worth remembering.\n{{link}}\nHave you come across it before?",
), '', 'no');
add_option('wpap_indexnow', array('enabled' => 1), '', 'no');   // ping Bing/Yandex on publish (faster indexing)
add_option('wpap_webp_enabled', '1', '', 'yes');                // convert imported images to WebP

$sample = get_page_by_path('hello-world', OBJECT, 'post');
if ($sample) {
    wp_delete_post($sample->ID, true);
}
$sample_page = get_page_by_path('sample-page', OBJECT, 'page');
if ($sample_page) {
    wp_delete_post($sample_page->ID, true);
}

$post_ids = [];
foreach ($posts as $index => $post) {
    $existing = get_page_by_path($post['slug'], OBJECT, 'post');
    // Spread posts across a realistic recent window (newest ~6 days ago, a few
    // days apart, back ~3 months) so the archive reads like an ongoing blog
    // rather than one automated batch. Newest post is last in the array.
    $total = count($posts);
    $days_ago = 6 + ($total - 1 - $index) * 4 + ($index % 3);
    $hour = 8 + ($index % 9);
    $date = gmdate('Y-m-d H:i:s', strtotime("-{$days_ago} days {$hour}:" . sprintf('%02d', ($index * 7) % 60) . ':00'));
    $postarr = [
        'post_type' => 'post',
        'post_status' => 'publish',
        'post_author' => $author_id,
        'post_name' => $post['slug'],
        'post_title' => $post['title'],
        // Use the curated SEO meta_description (kept <=160c) as the post excerpt: the post
        // is marked _wpap_smart_link below, so WP Automator Pro emits post_excerpt as the
        // meta description. The longer `excerpt` (used only for the seed's own listing
        // cards via fom_seed_post_excerpt) would otherwise overflow the SERP snippet.
        'post_excerpt' => ('' !== (string) ($post['meta_description'] ?? '')) ? $post['meta_description'] : $post['excerpt'],
        'comment_status' => 'closed',
        'ping_status' => 'closed',
        'post_content' => '<p>' . esc_html(fom_seed_post_intro($post)) . '</p>',
        'post_date' => $date,
        'post_date_gmt' => get_gmt_from_date($date),
    ];
    if ($existing) {
        $postarr['ID'] = $existing->ID;
        unset($postarr['post_date'], $postarr['post_date_gmt']);
    }

    $post_id = wp_insert_post(wp_slash($postarr), true);
    if (is_wp_error($post_id)) {
        throw new RuntimeException($post_id->get_error_message());
    }

    $post_ids[$post['slug']] = (int) $post_id;
    if (isset($category_ids[$post['category']])) {
        wp_set_post_terms($post_id, [$category_ids[$post['category']]], 'category', false);
    }
    wp_set_post_terms($post_id, $post['tags'] ?? [], 'post_tag', false);
    update_post_meta($post_id, '_fom_post_kind', $post['kind']);
    update_post_meta($post_id, '_fom_related_recipe_slugs', $post['related'] ?? []);
    update_post_meta($post_id, '_fom_related_article_slugs', $post['related_articles'] ?? []);
    update_post_meta($post_id, '_fom_related_slugs', array_values(array_unique(array_merge($post['related'] ?? [], $post['related_articles'] ?? []))));
    update_post_meta($post_id, '_fom_meta_description', $post['meta_description'] ?? $post['excerpt']);
    update_post_meta($post_id, '_fom_seo_title', $post['seo_title'] ?? $post['title']);
    // Mark as plugin-managed so WP Automator Pro emits SEO (meta description,
    // Open Graph, Article + Breadcrumb JSON-LD) and in-content ads for it. The
    // plugin self-heals the stored link to the pretty permalink on render.
    update_post_meta($post_id, '_wpap_smart_link', get_permalink($post_id));

    if (isset($image_plan[$post['slug']])) {
        fom_seed_import_featured_image((int) $post_id, $image_plan[$post['slug']]);
    }
}

foreach ($posts as $post) {
    $post_id = $post_ids[$post['slug']];
    if ($post['kind'] === 'recipe') {
        // Prefer the hand-authored article body when provided; fall back to the
        // generated template only for posts that ship without a `content` field.
        $content = (isset($post['content']) && trim((string) $post['content']) !== '')
            ? (string) $post['content']
            : fom_seed_recipe_content($post, $post_ids, $category_ids, $posts, $pages);
        $prep_minutes = fom_seed_duration_minutes($post['prep']);
        $cook_minutes = fom_seed_duration_minutes($post['cook']);
        update_post_meta($post_id, '_fom_recipe_json', wp_json_encode([
            'category' => get_cat_name($category_ids[$post['category']] ?? 0),
            'servings' => $post['servings'],
            'prep_iso' => fom_seed_iso_duration($post['prep']),
            'cook_iso' => fom_seed_iso_duration($post['cook']),
            'total_iso' => 'PT' . ($prep_minutes + $cook_minutes) . 'M',
            'ingredients' => $post['ingredients'],
            'steps' => $post['steps'],
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        // Also write the Author Tools recipe meta the active theme reads for its
        // recipe card + Recipe JSON-LD (viral-reader functions.php / automation-hamri).
        update_post_meta($post_id, '_wpap_recipe_on', '1');
        update_post_meta($post_id, '_wpap_recipe_servings', (string) $post['servings']);
        update_post_meta($post_id, '_wpap_recipe_prep', $prep_minutes);
        update_post_meta($post_id, '_wpap_recipe_cook', $cook_minutes);
        update_post_meta($post_id, '_wpap_recipe_total', $prep_minutes + $cook_minutes);
        update_post_meta($post_id, '_wpap_recipe_ingredients', implode("\n", (array) $post['ingredients']));
        update_post_meta($post_id, '_wpap_recipe_steps', implode("\n", (array) $post['steps']));
    } else {
        $content = (isset($post['content']) && trim((string) $post['content']) !== '')
            ? (string) $post['content']
            : fom_seed_article_content($post, $post_ids, $category_ids, $posts, $pages);
        update_post_meta($post_id, '_fom_article_snapshot', wp_json_encode(
            fom_seed_article_snapshot_meta($post),
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        ));
    }

    wp_update_post(wp_slash([
        'ID' => $post_id,
        'post_content' => $content,
    ]), true);
    // Align "modified" with each post's own (staggered) publish date so the whole
    // set doesn't share one batch-edited timestamp. Direct write is the reliable
    // way to set post_modified; reading the stored dates keeps it idempotent.
    global $wpdb;
    $wpdb->update(
        $wpdb->posts,
        [
            'post_modified'     => get_post_field('post_date', $post_id),
            'post_modified_gmt' => get_post_field('post_date_gmt', $post_id),
        ],
        ['ID' => $post_id]
    );
    clean_post_cache($post_id);
}

$primary_menu = fom_seed_reset_menu('Primary', 'primary');
if ($home_page_slug !== '' && isset($page_ids[$home_page_slug])) {
    fom_seed_menu_page($primary_menu, fom_seed_page_title($pages, $home_page_slug), $page_ids[$home_page_slug]);
}
if ($recipes_page_slug !== '' && isset($page_ids[$recipes_page_slug])) {
    fom_seed_menu_page($primary_menu, fom_seed_page_title($pages, $recipes_page_slug), $page_ids[$recipes_page_slug]);
}

$primary_category_count = 0;
foreach ($categories as $category) {
    $slug = (string) ($category['slug'] ?? '');
    if ($slug === '' || fom_seed_is_editorial_category_slug($slug) || !isset($category_ids[$slug])) {
        continue;
    }

    fom_seed_menu_category($primary_menu, (string) ($category['name'] ?? fom_seed_slug_to_title($slug)), $category_ids[$slug]);
    $primary_category_count++;

    if ($primary_category_count >= 3) {
        break;
    }
}

if ($guides_page_slug !== '' && isset($page_ids[$guides_page_slug])) {
    fom_seed_menu_page($primary_menu, fom_seed_page_title($pages, $guides_page_slug), $page_ids[$guides_page_slug]);
}
if ($about_page_slug !== '' && isset($page_ids[$about_page_slug])) {
    fom_seed_menu_page($primary_menu, fom_seed_page_title($pages, $about_page_slug), $page_ids[$about_page_slug]);
}

$footer_menu = fom_seed_reset_menu('Footer', 'footer');
foreach (array_unique(array_filter([$about_page_slug, $author_page_slug, 'contact', $privacy_page_slug, $cookies_page_slug, $advertising_page_slug, $editorial_page_slug, $terms_page_slug, $disclaimer_page_slug, 'medical-disclaimer'])) as $slug) {
    if (!isset($page_ids[$slug])) {
        continue;
    }

    fom_seed_menu_page($footer_menu, fom_seed_page_title($pages, $slug), $page_ids[$slug]);
}

$default_category_id = 1;
foreach ($categories as $category) {
    $slug = (string) ($category['slug'] ?? '');
    if (isset($category_ids[$slug])) {
        $default_category_id = $category_ids[$slug];
        break;
    }
}

update_option('default_category', $default_category_id);
update_option('posts_per_page', 9);
update_option('fom_seed_version', fom_seed_target_version());
flush_rewrite_rules(false);

echo "Seeded " . count($posts) . " posts and " . count($pages) . " pages.\n";
