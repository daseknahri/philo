import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const args = parseArgs(process.argv.slice(2));
const knownArgs = new Set([
  'brand',
  'domain',
  'site-email',
  'writer-name',
  'writer-email',
  'language',
  'lang',
  'brand-tagline',
  'brand-description',
  'writer-bio',
  'wordmark-asset',
  'icon-asset',
  'social-cover-asset',
  'project-slug',
  'home-slug',
  'canonical-hosts',
  'about-slug',
  'author-slug',
  'recipes-slug',
  'guides-slug',
  'privacy-slug',
  'cookies-slug',
  'advertising-slug',
  'editorial-slug',
  'terms-slug',
  'disclaimer-slug',
  'wp-locale',
  'wp-admin-locale',
  'adsense-client-id',
  'adsense-pub-id',
  'ezoic-adstxt-account-id',
  'ezoic-adstxt-redirect-url',
  'ga-measurement-id',
  'theme-description',
  'write',
  'help',
  'h',
]);

if (args.help || args.h) {
  printHelp();
  process.exit(0);
}

rejectUnknownArgs(args, knownArgs);

const write = Boolean(args.write);
const brand = stringArg('brand');
const domain = stringArg('domain');
const siteEmail = stringArg('site-email');
const writerName = stringArg('writer-name');
const writerEmail = stringArg('writer-email');

if (failures.length > 0) {
  console.error('Replica preparation needs a little more information:');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('\nRun with --help to see an example.');
  process.exit(1);
}

const siteUrl = normalizeSiteUrl(domain);
const hostname = hostnameFromSiteUrl(siteUrl);
const projectSlug = slugify(args['project-slug'] || brand);
const projectUnderscore = projectSlug.replace(/-/g, '_');
const writerParts = splitName(writerName);
const language = resolveLanguage(args.language || args.lang || '', args['wp-locale']);
const wpLocale = normalizeLocale(args['wp-locale'] || (language === 'en' ? 'en_US' : 'ro_RO'));
const wpAdminLocale = 'en_US';
const homeSlug = slugify(args['home-slug'] || defaultHomeSlug(language));
const authorSlug = slugify(args['author-slug'] || defaultAuthorSlug(language));
const aboutSlug = slugify(args['about-slug'] || defaultAboutSlug(language, projectSlug));
const recipesSlug = slugify(args['recipes-slug'] || defaultRecipesSlug(language));
const guidesSlug = slugify(args['guides-slug'] || defaultGuidesSlug(language));
const privacySlug = slugify(args['privacy-slug'] || defaultPrivacySlug(language));
const cookiesSlug = slugify(args['cookies-slug'] || defaultCookiesSlug(language));
const advertisingSlug = slugify(args['advertising-slug'] || defaultAdvertisingSlug(language));
const editorialSlug = slugify(args['editorial-slug'] || defaultEditorialSlug(language));
const termsSlug = slugify(args['terms-slug'] || defaultTermsSlug(language));
const disclaimerSlug = slugify(args['disclaimer-slug'] || defaultDisclaimerSlug(language));
const brandTagline = args['brand-tagline'] || defaultBrandTagline(language, brand);
const brandDescription = args['brand-description'] || defaultBrandDescription(language, brand);
const writerBio = args['writer-bio'] || defaultWriterBio(language, brand, writerName);
const wordmarkAsset = assetSlug(args['wordmark-asset'], `${projectSlug}-wordmark`);
const iconAsset = assetSlug(args['icon-asset'], `${projectSlug}-icon`);
const socialCoverAsset = assetSlug(args['social-cover-asset'], `${projectSlug}-social-cover`);
const canonicalHosts = args['canonical-hosts'] || `www.${hostname}`;
const adsenseClientId = args['adsense-client-id'] || '';
const adsensePubId = args['adsense-pub-id'] || '';
const ezoicAdsTxtAccountId = args['ezoic-adstxt-account-id'] || '';
const ezoicAdsTxtRedirectUrl = args['ezoic-adstxt-redirect-url'] || '';
const gaMeasurementId = args['ga-measurement-id'] || '';
const themeDescription = args['theme-description']
  || (language === 'en'
    ? `A lightweight food blog theme for ${brand}, built for recipes, food guides, internal linking, and ad-ready spacing.`
    : `A lightweight food blog theme for ${brand}, built for recipes, editorial reading, internal linking, and ad-ready spacing.`);

validateReplicaConfig();

if (failures.length > 0) {
  console.error('Replica preparation could not continue:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const operations = [];

updateSiteProfile();
updateEnvExample();
updateDockerCompose();
updateThemeHeader();
updatePublicIdentityFiles();

if (operations.length === 0) {
  console.log('No replica changes needed.');
  process.exit(0);
}

console.log(`${write ? 'Applied' : 'Planned'} ${operations.length} replica change${operations.length === 1 ? '' : 's'}:`);
for (const operation of operations) {
  console.log(`- ${operation}`);
}

if (!write) {
  console.log('\nDry run only. Add --write to apply these changes in the cloned repo.');
}

function printHelp() {
  console.log(`Usage:
node scripts/prepare-replica.mjs --brand "New Blog" --domain https://new-domain.com --site-email contact@new-domain.com --writer-name "Writer Name" --writer-email writer@example.com --project-slug new-blog --language en --write

Required:
  --brand             Public site name
  --domain            Canonical site URL or domain
  --site-email        Public site email
  --writer-name       Public writer name
  --writer-email      Public writer email

Optional:
  --language          Language preset: en or ro. Defaults from --wp-locale, otherwise ro.
  --brand-tagline     Public tagline written to content/site-profile.json
  --brand-description Public brand description written to content/site-profile.json
  --writer-bio        Public writer bio written to content/site-profile.json
  --wordmark-asset    Theme wordmark asset basename, default: {project-slug}-wordmark
  --icon-asset        Theme icon asset basename, default: {project-slug}-icon
  --social-cover-asset Social/share cover asset basename, default: {project-slug}-social-cover
  --project-slug      Internal project slug for Docker image, DB, and volume names
  --home-slug         Home page slug, default: home or acasa
  --canonical-hosts   Extra hosts that should redirect to the canonical domain
  --about-slug        About-site page slug, default: about-{project-slug} for English or despre-{project-slug} for Romanian
  --author-slug       Author page slug, default: about-author for English or despre-autor for Romanian
  --recipes-slug      Recipes landing page slug, default: recipes or retete
  --guides-slug       Guides/articles landing page slug, default: guides or articole
  --privacy-slug      Privacy page slug, default: privacy-policy or politica-de-confidentialitate
  --cookies-slug      Cookie page slug, default: cookie-policy or politica-de-cookies
  --advertising-slug  Advertising/consent page slug
  --editorial-slug    Editorial policy page slug
  --terms-slug        Terms page slug
  --disclaimer-slug   Culinary disclaimer page slug
  --wp-locale         WordPress locale, default: en_US for English or ro_RO for Romanian
  --wp-admin-locale   Deprecated. Admin locale is always forced to en_US.
  --adsense-client-id AdSense client ID, usually blank until the new site is ready
  --adsense-pub-id    AdSense publisher ID, usually blank until the new site is ready
  --ezoic-adstxt-account-id Optional Ezoic ads.txt manager account ID
  --ezoic-adstxt-redirect-url Optional full Ezoic ads.txt redirect URL
  --ga-measurement-id GA4 measurement ID, usually blank until consent is ready
  --write             Apply changes. Without this, the script only reports planned changes.`);
}

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) {
      failures.push(`Unexpected argument: ${item}`);
      continue;
    }

    const raw = item.slice(2);
    const equalIndex = raw.indexOf('=');
    if (equalIndex !== -1) {
      parsed[raw.slice(0, equalIndex)] = raw.slice(equalIndex + 1);
      continue;
    }

    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      parsed[raw] = true;
      continue;
    }

    parsed[raw] = next;
    index += 1;
  }

  return parsed;
}

function rejectUnknownArgs(parsed, allowed) {
  const unknown = Object.keys(parsed).filter((key) => !allowed.has(key));
  if (unknown.length > 0) {
    failures.push(`Unknown option${unknown.length === 1 ? '' : 's'}: ${unknown.map((key) => `--${key}`).join(', ')}`);
  }
}

function stringArg(name) {
  const value = args[name];
  if (typeof value !== 'string' || value.trim() === '') {
    failures.push(`Missing required --${name}`);
    return '';
  }

  return value.trim();
}

function normalizeSiteUrl(value) {
  const raw = String(value || '').trim();
  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProtocol.replace(/\/+$/, '');
}

function normalizeLocale(value) {
  const raw = String(value || '').trim().replace('-', '_');
  const parts = raw.split('_');
  if (parts.length !== 2) return raw;
  return `${parts[0].toLowerCase()}_${parts[1].toUpperCase()}`;
}

function hostnameFromSiteUrl(value) {
  try {
    return new URL(value).hostname;
  } catch {
    failures.push('domain must be a valid http or https URL.');
    return 'example.com';
  }
}

function slugify(value) {
  const slug = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'food-blog';
}

function assetSlug(value, fallback) {
  const raw = String(value || fallback).trim().replace(/\.(svg|png|jpe?g|webp)$/i, '');
  return slugify(raw);
}

function splitName(value) {
  const parts = value.trim().split(/\s+/);
  return {
    first: parts[0] || value,
    last: parts.slice(1).join(' '),
  };
}

function resolveLanguage(value, locale) {
  const explicit = String(value || '').trim().toLowerCase().replace('-', '_');
  if (explicit) {
    if (explicit.startsWith('en')) return 'en';
    if (explicit.startsWith('ro')) return 'ro';
    failures.push('language must be `en` or `ro`.');
    return 'ro';
  }

  const rawLocale = String(locale || '').trim().toLowerCase().replace('-', '_');
  if (rawLocale.startsWith('en')) return 'en';
  if (rawLocale.startsWith('ro')) return 'ro';
  return 'ro';
}

function defaultAuthorSlug(languageCode) {
  return languageCode === 'en' ? 'about-author' : 'despre-autor';
}

function defaultHomeSlug(languageCode) {
  return languageCode === 'en' ? 'home' : 'acasa';
}

function defaultAboutSlug(languageCode, slug) {
  return languageCode === 'en' ? `about-${slug}` : `despre-${slug}`;
}

function defaultRecipesSlug(languageCode) {
  return languageCode === 'en' ? 'recipes' : 'retete';
}

function defaultGuidesSlug(languageCode) {
  return languageCode === 'en' ? 'guides' : 'articole';
}

function defaultPrivacySlug(languageCode) {
  return languageCode === 'en' ? 'privacy-policy' : 'politica-de-confidentialitate';
}

function defaultCookiesSlug(languageCode) {
  return languageCode === 'en' ? 'cookie-policy' : 'politica-de-cookies';
}

function defaultAdvertisingSlug(languageCode) {
  return languageCode === 'en' ? 'advertising-and-consent' : 'publicitate-si-consimtamant';
}

function defaultEditorialSlug(languageCode) {
  return languageCode === 'en' ? 'editorial-policy' : 'politica-editoriala';
}

function defaultTermsSlug(languageCode) {
  return languageCode === 'en' ? 'terms-and-conditions' : 'termeni-si-conditii';
}

function defaultDisclaimerSlug(languageCode) {
  return languageCode === 'en' ? 'culinary-disclaimer' : 'disclaimer-culinar';
}

function defaultBrandTagline(languageCode, siteBrand) {
  return languageCode === 'en'
    ? `${siteBrand} recipes and practical kitchen guides`
    : `Retete si ghiduri practice pentru ${siteBrand}`;
}

function defaultBrandDescription(languageCode, siteBrand) {
  return languageCode === 'en'
    ? `${siteBrand} publishes practical recipes, food guides, and kitchen articles for home cooks.`
    : `${siteBrand} publica retete, articole culinare si ghiduri practice pentru gatit acasa.`;
}

function defaultWriterBio(languageCode, siteBrand, name) {
  return languageCode === 'en'
    ? `${name} writes practical recipes and kitchen guides for ${siteBrand}.`
    : `${name} scrie retete si ghiduri practice pentru ${siteBrand}.`;
}

function validateReplicaConfig() {
  if (!isValidHttpUrl(siteUrl)) {
    failures.push('domain must be a full http or https URL.');
  }

  if (!isValidEmail(siteEmail)) {
    failures.push('site-email must look like a real email address.');
  }

  if (!isValidEmail(writerEmail)) {
    failures.push('writer-email must look like a real email address.');
  }

  if (!['en', 'ro'].includes(language)) {
    failures.push('language must be `en` or `ro`.');
  }

  if (!/^[a-z]{2}_[A-Z]{2}$/.test(wpLocale)) {
    failures.push('wp-locale must look like `en_US` or `ro_RO`.');
  }

  if (language === 'en' && !wpLocale.startsWith('en_')) {
    failures.push('language=en conflicts with wp-locale.');
  }

  if (language === 'ro' && !wpLocale.startsWith('ro_')) {
    failures.push('language=ro conflicts with wp-locale.');
  }

  if ('wp-admin-locale' in args && args['wp-admin-locale'] !== 'en_US') {
    failures.push('wp-admin-locale is deprecated and must remain en_US.');
  }

  for (const [key, slug] of [
    ['project-slug', projectSlug],
    ['home-slug', homeSlug],
    ['recipes-slug', recipesSlug],
    ['guides-slug', guidesSlug],
    ['about-slug', aboutSlug],
    ['author-slug', authorSlug],
    ['privacy-slug', privacySlug],
    ['cookies-slug', cookiesSlug],
    ['advertising-slug', advertisingSlug],
    ['editorial-slug', editorialSlug],
    ['terms-slug', termsSlug],
    ['disclaimer-slug', disclaimerSlug],
  ]) {
    if (!isSlug(slug)) {
      failures.push(`${key} must be lowercase and slug-safe.`);
    }
  }

  const pageSlugs = [
    ['home-slug', homeSlug],
    ['recipes-slug', recipesSlug],
    ['guides-slug', guidesSlug],
    ['about-slug', aboutSlug],
    ['author-slug', authorSlug],
    ['privacy-slug', privacySlug],
    ['cookies-slug', cookiesSlug],
    ['advertising-slug', advertisingSlug],
    ['editorial-slug', editorialSlug],
    ['terms-slug', termsSlug],
    ['disclaimer-slug', disclaimerSlug],
  ];
  const seenSlugs = new Map();
  for (const [key, slug] of pageSlugs) {
    if (seenSlugs.has(slug)) {
      failures.push(`Slug conflict: ${key} duplicates ${seenSlugs.get(slug)} (${slug}).`);
    } else {
      seenSlugs.set(slug, key);
    }
  }

  for (const [key, asset] of [
    ['wordmark-asset', wordmarkAsset],
    ['icon-asset', iconAsset],
    ['social-cover-asset', socialCoverAsset],
  ]) {
    if (!isSlug(asset)) {
      failures.push(`${key} must be a lowercase asset basename without an extension.`);
    }
  }

  const hostParts = canonicalHosts.split(',').map((part) => part.trim()).filter(Boolean);
  if (hostParts.length === 0) {
    failures.push('canonical-hosts must contain at least one hostname.');
  } else if (hostParts.some((host) => host.includes('://') || host.includes('/'))) {
    failures.push('canonical-hosts must contain hostnames only, not full URLs.');
  }

  if (ezoicAdsTxtRedirectUrl && !isValidHttpUrl(ezoicAdsTxtRedirectUrl)) {
    failures.push('ezoic-adstxt-redirect-url must be a full http or https URL when provided.');
  }
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidEmail(value) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}

function isSlug(value) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(value || ''));
}

function filePath(relativePath) {
  return path.join(root, relativePath);
}

function readFile(relativePath) {
  const absolutePath = filePath(relativePath);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`Missing file: ${relativePath}`);
    return '';
  }

  return fs.readFileSync(absolutePath, 'utf8');
}

function writeFile(relativePath, content, label) {
  const absolutePath = filePath(relativePath);
  const previous = fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, 'utf8') : '';
  if (previous === content) return;

  operations.push(label || `Updated ${relativePath}`);
  if (write) fs.writeFileSync(absolutePath, content);
}

function writeJsonFile(relativePath, value, label) {
  writeFile(relativePath, `${JSON.stringify(value, null, 2)}\n`, label);
}

function buildSiteProfile() {
  return {
    brand: {
      name: brand,
      tagline: brandTagline,
      description: brandDescription,
      site_email: siteEmail,
    },
    locales: {
      public: wpLocale,
      admin: wpAdminLocale,
      force_admin: true,
    },
    writer: {
      name: writerName,
      email: writerEmail,
      bio: writerBio,
    },
    assets: {
      wordmark: wordmarkAsset,
      icon: iconAsset,
      social_cover: socialCoverAsset,
    },
    slugs: {
      home: homeSlug,
      recipes: recipesSlug,
      guides: guidesSlug,
      about: aboutSlug,
      author: authorSlug,
      privacy: privacySlug,
      cookies: cookiesSlug,
      advertising: advertisingSlug,
      editorial: editorialSlug,
      terms: termsSlug,
      disclaimer: disclaimerSlug,
    },
  };
}

function updateSiteProfile() {
  writeJsonFile('content/site-profile.json', buildSiteProfile(), 'Updated content/site-profile.json for public identity and locales');
}

function updateEnvExample() {
  const relativePath = '.env.example';
  const env = readFile(relativePath);
  if (!env) return;

  const updates = new Map([
    ['SITE_URL', siteUrl],
    ['SITE_EMAIL', siteEmail],
    ['WRITER_EMAIL', writerEmail],
    ['WP_LOCALE', wpLocale],
    ['WP_ADMIN_LOCALE', wpAdminLocale],
    ['CANONICAL_REDIRECT_HOSTS', canonicalHosts],
    ['WORDPRESS_DB_NAME', projectUnderscore],
    ['WORDPRESS_DB_USER', projectUnderscore],
    ['WP_ADMIN_EMAIL', siteEmail],
    ['ADSENSE_CLIENT_ID', adsenseClientId],
    ['ADSENSE_PUB_ID', adsensePubId],
    ['ADSENSE_ENABLE', '0'],
    ['EZOIC_ADSTXT_ACCOUNT_ID', ezoicAdsTxtAccountId],
    ['EZOIC_ADSTXT_REDIRECT_URL', ezoicAdsTxtRedirectUrl],
    ['GA_ENABLE', '0'],
    ['GA_MEASUREMENT_ID', gaMeasurementId],
  ]);

  const seen = new Set();
  const lines = env.split(/\r?\n/).map((line) => {
    const match = /^([A-Z0-9_]+)=/.exec(line);
    if (!match || !updates.has(match[1])) return line;

    seen.add(match[1]);
    return `${match[1]}=${updates.get(match[1])}`;
  });

  for (const [key, value] of updates.entries()) {
    if (!seen.has(key)) lines.push(`${key}=${value}`);
  }

  writeFile(relativePath, lines.join('\n'), 'Updated .env.example for the replica identity');
}

function updateDockerCompose() {
  const relativePath = 'docker-compose.yml';
  let compose = readFile(relativePath);
  if (!compose) return;

  compose = compose
    .replace(/\bfom_db\b/g, `${projectUnderscore}_db`)
    .replace(/\bfom_wordpress\b/g, `${projectUnderscore}_wordpress`)
    .replace(/\bfom_uploads\b/g, `${projectUnderscore}_uploads`)
    .replace(/\bfom-wordpress\b/g, `${projectSlug}-wordpress`)
    .replace(/\bfom-wp-cli\b/g, `${projectSlug}-wp-cli`)
    .replace(/SITE_URL: \$\{SITE_URL:-[^}]+}/g, `SITE_URL: \${SITE_URL:-${siteUrl}}`)
    .replace(/SITE_EMAIL: \$\{SITE_EMAIL:-[^}]+}/g, `SITE_EMAIL: \${SITE_EMAIL:-${siteEmail}}`)
    .replace(/WRITER_EMAIL: \$\{WRITER_EMAIL:-[^}]+}/g, `WRITER_EMAIL: \${WRITER_EMAIL:-${writerEmail}}`)
    .replace(/WP_LOCALE: \$\{WP_LOCALE:-[^}]+}/g, `WP_LOCALE: \${WP_LOCALE:-${wpLocale}}`)
    .replace(/WP_ADMIN_LOCALE: \$\{WP_ADMIN_LOCALE:-[^}]+}/g, `WP_ADMIN_LOCALE: \${WP_ADMIN_LOCALE:-${wpAdminLocale}}`)
    .replace(/CANONICAL_REDIRECT_HOSTS: \$\{CANONICAL_REDIRECT_HOSTS:-[^}]*}/g, `CANONICAL_REDIRECT_HOSTS: \${CANONICAL_REDIRECT_HOSTS:-${canonicalHosts}}`)
    .replace(/ADSENSE_CLIENT_ID: \$\{ADSENSE_CLIENT_ID:-[^}]*}/g, `ADSENSE_CLIENT_ID: \${ADSENSE_CLIENT_ID:-${adsenseClientId}}`)
    .replace(/ADSENSE_PUB_ID: \$\{ADSENSE_PUB_ID:-[^}]*}/g, `ADSENSE_PUB_ID: \${ADSENSE_PUB_ID:-${adsensePubId}}`)
    .replace(/EZOIC_ADSTXT_ACCOUNT_ID: \$\{EZOIC_ADSTXT_ACCOUNT_ID:-[^}]*}/g, `EZOIC_ADSTXT_ACCOUNT_ID: \${EZOIC_ADSTXT_ACCOUNT_ID:-${ezoicAdsTxtAccountId}}`)
    .replace(/EZOIC_ADSTXT_REDIRECT_URL: \$\{EZOIC_ADSTXT_REDIRECT_URL:-[^}]*}/g, `EZOIC_ADSTXT_REDIRECT_URL: \${EZOIC_ADSTXT_REDIRECT_URL:-${ezoicAdsTxtRedirectUrl}}`)
    .replace(/GA_MEASUREMENT_ID: \$\{GA_MEASUREMENT_ID:-[^}]*}/g, `GA_MEASUREMENT_ID: \${GA_MEASUREMENT_ID:-${gaMeasurementId}}`);

  writeFile(relativePath, compose, 'Updated Docker defaults, images, and volume names');
}

function updateThemeHeader() {
  const relativePath = 'wp-content/themes/kepoli/style.css';
  let style = readFile(relativePath);
  if (!style) return;

  style = style
    .replace(/^Theme Name: .+$/m, `Theme Name: ${brand}`)
    .replace(/^Theme URI: .+$/m, `Theme URI: ${siteUrl}`)
    .replace(/^Author: .+$/m, `Author: ${writerName}`)
    .replace(/^Author URI: .+$/m, `Author URI: ${siteUrl}/${authorSlug}/`)
    .replace(/^Description: .+$/m, `Description: ${themeDescription}`);

  writeFile(relativePath, style, 'Updated public theme header');
}

function updatePublicIdentityFiles() {
  const files = [
    'README.md',
    'docs/adsense-readiness.md',
    'docs/ai-content-growth-strategy.md',
    'docs/author-workflow.md',
    'docs/codex-trending-site-prompt.md',
    'docs/content-machine-extraction-map.md',
    'docs/coolify.md',
    'docs/future-session-handoff.md',
    'docs/histats-readiness.md',
    'docs/image-generation.md',
    'docs/project-status.md',
    'docs/replicate-food-blog.md',
    'docs/trending-site-launch-plan.md',
    'content/pages.json',
    'seed/bin/bootstrap.sh',
  ];

  for (const relativePath of files) {
    const absolutePath = filePath(relativePath);
    if (!fs.existsSync(absolutePath)) continue;

    let content = fs.readFileSync(absolutePath, 'utf8');
    content = replaceIdentity(content);

    if (relativePath === 'README.md') {
      content = content
        .replace(/# .+ WordPress Blog/, `# ${brand} WordPress Blog`)
        .replace(/fom-wordpress/g, `${projectSlug}-wordpress`)
        .replace(/fom-wp-cli/g, `${projectSlug}-wp-cli`);
    }

    writeFile(relativePath, content, `Updated public identity in ${relativePath}`);
  }
}

function replaceIdentity(value) {
  return value
    .replace(/Kepoli/g, brand)
    .replace(/contact@kepoli\.com/g, siteEmail)
    .replace(/contact@example\.com/g, siteEmail)
    .replace(/isalunemerovik@gmail\.com/g, writerEmail)
    .replace(/writer@example\.com/g, writerEmail)
    .replace(/www\.example\.com/g, `www.${hostname.replace(/^www\./, '')}`)
    .replace(/kepoli\.com/g, hostname)
    .replace(/example\.com/g, hostname)
    .replace(/Isalune Merovik/g, writerName)
    .replace(/Isalune/g, writerParts.first)
    .replace(/Merovik/g, writerParts.last)
    .replace(/(['"])acasa\1/g, `$1${homeSlug}$1`)
    .replace(/despre-kepoli/g, aboutSlug)
    .replace(/despre-autor/g, authorSlug)
    .replace(/politica-de-confidentialitate/g, privacySlug)
    .replace(/politica-de-cookies/g, cookiesSlug)
    .replace(/publicitate-si-consimtamant/g, advertisingSlug)
    .replace(/politica-editoriala/g, editorialSlug)
    .replace(/termeni-si-conditii/g, termsSlug)
    .replace(/disclaimer-culinar/g, disclaimerSlug)
    .replace(/\/retete\//g, `/${recipesSlug}/`)
    .replace(/\/articole\//g, `/${guidesSlug}/`)
    .replace(/(['"])retete\1/g, `$1${recipesSlug}$1`)
    .replace(/(['"])articole\1/g, `$1${guidesSlug}$1`);
}
