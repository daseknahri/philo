import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];
const args = parseArgs(process.argv.slice(2));

if (args.help || args.h) {
  printHelp();
  process.exit(0);
}

const minPosts = numberArg('min-posts', 20);
const minCategories = numberArg('min-categories', 4);

const oldIdentityPatterns = [
  ['old brand name', /\bKepoli\b/],
  ['old domain', /\bkepoli\.com\b/i],
  ['old contact email', /contact@kepoli\.com/i],
];

const oldLaunchSlugs = new Set([
  'ardei-umpluti',
  'calendarul-gusturilor-de-sezon',
  'ciorba-de-burta',
  'ciorba-de-fasole-cu-afumatura',
  'ciorba-de-perisoare',
  'ciorba-radauteana',
  'clatite-cu-dulceata',
  'cornulete-fragede',
  'cozonac-cu-nuca',
  'cum-alegi-ingredientele-pentru-retete-romanesti',
  'cum-pastrezi-mancarea-gatita',
  'ghidul-camarii-romanesti',
  'gogosi-pufoase',
  'iahnie-de-fasole',
  'mamaliga-cu-branza-si-smantana',
  'meniu-romanesc-de-duminica',
  'muraturi-asortate',
  'ostropel-de-pui',
  'papanasi-prajiti',
  'placinta-cu-mere',
  'salam-de-biscuiti',
  'salata-de-vinete',
  'sarmale-in-foi-de-varza',
  'supa-crema-de-legume-de-iarna',
  'supa-de-pui-cu-galuste',
  'tehnici-simple-pentru-aluaturi-si-baze',
  'tocanita-de-pui-cu-mamaliga',
  'tochitura-moldoveneasca',
  'varza-calita-cu-carnati',
  'zacusca-de-vinete',
]);

const env = readEnv('.env.example');
const siteProfile = readJsonObject('content/site-profile.json');
const categories = readJsonArray('content/categories.json');
const pages = readJsonArray('content/pages.json');
const posts = readJsonArray('content/posts.json');
const imagePlan = readJsonArray('content/image-plan.json');
const oldLaunchPostCount = posts.filter((post) => oldLaunchSlugs.has(String(post?.slug || ''))).length;
const oldLaunchImagePlanCount = imagePlan.filter((item) => oldLaunchSlugs.has(String(item?.slug || ''))).length;

checkEnv();
checkSiteProfile();
checkPages();
checkCategories();
checkPosts();
checkImages();
checkThemeAssets();
checkOldIdentity();

if (failures.length === 0) {
  console.log('Replica readiness audit passed.');
} else {
  console.log(`Replica readiness audit found ${failures.length} required fix${failures.length === 1 ? '' : 'es'}.`);
}

if (warnings.length > 0) {
  console.log(`Replica readiness audit found ${warnings.length} warning${warnings.length === 1 ? '' : 's'}.`);
}

if (failures.length > 0 && likelySourceTemplateRepo()) {
  console.log('Hint: this still looks like the source/template repo or an unreset clone. Run the readiness audit after resetting old launch content and generating a new site shell.');
}

printSection('Required fixes', failures);
printSection('Warnings', warnings);

if (failures.length === 0) {
  console.log('\nNext checks:');
  console.log('node scripts/verify-content.mjs');
  console.log('node scripts/image-status.mjs');
  if (envValue('ADSENSE_CLIENT_ID') || envValue('ADSENSE_PUB_ID')) {
    console.log('node scripts/audit-adsense-readiness.mjs');
  }
  console.log('node scripts/audit-rebrand.mjs');
}

process.exit(failures.length > 0 ? 1 : 0);

function likelySourceTemplateRepo() {
  const brandName = String(profileValue(['brand', 'name']) || '').trim();
  const siteUrl = envValue('SITE_URL');

  return /\bKepoli\b/i.test(brandName)
    || /example\.com/i.test(siteUrl)
    || oldLaunchPostCount >= 5
    || oldLaunchImagePlanCount >= 5;
}

function printHelp() {
  console.log(`Usage:
node scripts/audit-replica-readiness.mjs
node scripts/audit-replica-readiness.mjs --min-posts 30 --min-categories 5

Checks whether a cloned food blog looks ready for first production deployment.

It verifies:
  - env identity is no longer the old site
  - required legal/editorial pages exist in Romanian or English
  - categories, posts, image plan, and image files are present
  - old launch slugs and public identity leftovers are gone
  - ads/analytics switches are still conservative for review

Options:
  --min-posts       Minimum post count expected, default: 20
  --min-categories  Minimum category count expected, default: 4`);
}

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) {
      warnings.push(`Ignored unexpected argument: ${item}`);
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

function numberArg(name, fallback) {
  if (!(name in args)) return fallback;

  const value = Number.parseInt(args[name], 10);
  if (!Number.isFinite(value) || value < 0) {
    warnings.push(`Invalid --${name}; using ${fallback}.`);
    return fallback;
  }

  return value;
}

function readFile(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`Missing file: ${relativePath}`);
    return '';
  }

  return fs.readFileSync(absolutePath, 'utf8');
}

function readEnv(relativePath) {
  const content = readFile(relativePath);
  const values = new Map();

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const equalIndex = trimmed.indexOf('=');
    if (equalIndex === -1) continue;

    values.set(trimmed.slice(0, equalIndex), trimmed.slice(equalIndex + 1));
  }

  return values;
}

function readJsonArray(relativePath) {
  const content = readFile(relativePath);
  if (!content) return [];

  try {
    const value = JSON.parse(content);
    if (!Array.isArray(value)) {
      failures.push(`${relativePath} must contain a JSON array.`);
      return [];
    }

    return value;
  } catch (error) {
    failures.push(`${relativePath} is invalid JSON: ${error.message}`);
    return [];
  }
}

function readJsonObject(relativePath) {
  const content = readFile(relativePath);
  if (!content) return {};

  try {
    const value = JSON.parse(content);
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      failures.push(`${relativePath} must contain a JSON object.`);
      return {};
    }

    return value;
  } catch (error) {
    failures.push(`${relativePath} is invalid JSON: ${error.message}`);
    return {};
  }
}

function envValue(key) {
  return String(env.get(key) || '').trim();
}

function profileValue(pathParts) {
  let value = siteProfile;
  for (const key of pathParts) {
    if (!value || typeof value !== 'object' || !(key in value)) return '';
    value = value[key];
  }

  return value;
}

function pageSlugs() {
  return new Set(pages.map((page) => String(page.slug || '')));
}

function hasAnyPage(...slugs) {
  const existing = pageSlugs();
  return slugs.some((slug) => existing.has(slug));
}

function firstPageSlug(...slugs) {
  const existing = pageSlugs();
  return slugs.find((slug) => existing.has(slug)) || '';
}

function profileSlug(key) {
  return String(profileValue(['slugs', key]) || '').trim();
}

function isAboutSiteSlug(slug) {
  return slug === profileSlug('about') || (/^(about|despre)-/.test(slug) && slug !== 'about-author' && slug !== 'despre-autor');
}

function checkEnv() {
  const siteUrl = envValue('SITE_URL');
  const siteEmail = envValue('SITE_EMAIL');
  const writerEmail = envValue('WRITER_EMAIL');
  const dbName = envValue('WORDPRESS_DB_NAME');
  const dbUser = envValue('WORDPRESS_DB_USER');
  const canonicalHosts = envValue('CANONICAL_REDIRECT_HOSTS');
  const locale = envValue('WP_LOCALE');
  const adminLocale = envValue('WP_ADMIN_LOCALE');

  if (!/^https:\/\/[^/]+/i.test(siteUrl)) failures.push('SITE_URL should be an https:// production URL.');
  if (/kepoli\.com|new-domain\.com|example/i.test(siteUrl)) failures.push('SITE_URL still looks like an old or placeholder domain.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(siteEmail)) failures.push('SITE_EMAIL must be a real email address.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(writerEmail)) failures.push('WRITER_EMAIL must be a real email address.');
  if (/kepoli/i.test(siteEmail) || /kepoli/i.test(writerEmail)) failures.push('SITE_EMAIL or WRITER_EMAIL still references Kepoli.');
  if (!dbName || dbName === 'kepoli') failures.push('WORDPRESS_DB_NAME should be changed for the clone.');
  if (!dbUser || dbUser === 'kepoli') failures.push('WORDPRESS_DB_USER should be changed for the clone.');
  if (!locale) warnings.push('WP_LOCALE is empty; set a real locale such as en_US or ro_RO.');
  if (adminLocale !== 'en_US') failures.push('WP_ADMIN_LOCALE must be en_US so WordPress admin stays English.');
  if (!canonicalHosts) warnings.push('CANONICAL_REDIRECT_HOSTS is empty; include www/new legacy hosts that should redirect to SITE_URL.');
  if (envValue('ADSENSE_ENABLE') !== '0') warnings.push('Keep ADSENSE_ENABLE=0 until ad approval and consent setup are confirmed.');
  if (envValue('GA_ENABLE') !== '0') warnings.push('Keep GA_ENABLE=0 until consent setup is live and tested.');
}

function checkSiteProfile() {
  const brandName = String(profileValue(['brand', 'name']) || '').trim();
  const siteEmail = String(profileValue(['brand', 'site_email']) || '').trim();
  const publicLocale = String(profileValue(['locales', 'public']) || '').trim();
  const adminLocale = String(profileValue(['locales', 'admin']) || '').trim();
  const forceAdmin = profileValue(['locales', 'force_admin']);
  const writerName = String(profileValue(['writer', 'name']) || '').trim();
  const writerEmail = String(profileValue(['writer', 'email']) || '').trim();
  const assets = profileValue(['assets']);
  const slugs = profileValue(['slugs']);

  if (!brandName) failures.push('content/site-profile.json needs brand.name.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(siteEmail)) failures.push('content/site-profile.json needs a real brand.site_email.');
  if (!publicLocale) failures.push('content/site-profile.json needs locales.public.');
  if (adminLocale !== 'en_US') failures.push('content/site-profile.json must keep locales.admin=en_US.');
  if (forceAdmin !== true) failures.push('content/site-profile.json must keep locales.force_admin=true.');
  if (!writerName) failures.push('content/site-profile.json needs writer.name.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(writerEmail)) failures.push('content/site-profile.json needs a real writer.email.');
  if (!assets || typeof assets !== 'object' || Array.isArray(assets)) {
    failures.push('content/site-profile.json needs an assets object.');
  } else {
    for (const key of ['wordmark', 'icon', 'social_cover']) {
      const asset = String(assets[key] || '').trim();
      if (!asset) {
        failures.push(`content/site-profile.json is missing assets.${key}.`);
      } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(asset)) {
        failures.push(`content/site-profile.json assets.${key} must be a lowercase asset basename without an extension.`);
      }
    }
  }
  if (!slugs || typeof slugs !== 'object' || Array.isArray(slugs)) {
    failures.push('content/site-profile.json needs a slugs object.');
    return;
  }

  for (const key of ['home', 'recipes', 'guides', 'about', 'author', 'privacy', 'cookies', 'advertising', 'editorial', 'terms', 'disclaimer']) {
    if (!String(slugs[key] || '').trim()) failures.push(`content/site-profile.json is missing slugs.${key}.`);
  }

  if (envValue('WP_LOCALE') && publicLocale && envValue('WP_LOCALE') !== publicLocale) {
    failures.push(`WP_LOCALE should match content/site-profile.json locales.public (${publicLocale}).`);
  }
}

function checkPages() {
  const slugs = pageSlugs();
  const requiredGroups = [
    ['home page', [profileSlug('home'), 'home', 'acasa']],
    ['recipes page', [profileSlug('recipes'), 'recipes', 'retete']],
    ['guides page', [profileSlug('guides'), 'guides', 'articole']],
    ['contact page', ['contact']],
    ['privacy policy page', [profileSlug('privacy'), 'privacy-policy', 'politica-de-confidentialitate']],
    ['cookie policy page', [profileSlug('cookies'), 'cookie-policy', 'politica-de-cookies']],
    ['advertising/consent page', [profileSlug('advertising'), 'advertising-and-consent', 'publicitate-si-consimtamant']],
    ['editorial policy page', [profileSlug('editorial'), 'editorial-policy', 'politica-editoriala']],
    ['terms page', [profileSlug('terms'), 'terms-and-conditions', 'termeni-si-conditii']],
    ['culinary disclaimer page', [profileSlug('disclaimer'), 'culinary-disclaimer', 'disclaimer-culinar']],
  ];

  for (const [label, candidates] of requiredGroups) {
    if (!candidates.filter(Boolean).some((slug) => slugs.has(slug))) {
      failures.push(`Missing required ${label}.`);
    }
  }

  const siteAboutPages = pages.filter((page) => isAboutSiteSlug(String(page.slug || '')));
  if (siteAboutPages.length === 0) {
    failures.push('Expected an about-site page (about-... or despre-...).');
  }

  if (!hasAnyPage('about-author', 'despre-autor')) {
    failures.push('Expected an author page (about-author or despre-autor).');
  }

  const thinPageAllowlist = new Set(['home', 'acasa']);
  for (const page of pages) {
    if (!page.title || !page.slug || !page.content) {
      failures.push(`Incomplete page entry: ${page.slug || page.title || '(unknown)'}`);
    }

    if (String(page.content || '').length < 300 && !thinPageAllowlist.has(String(page.slug || ''))) {
      warnings.push(`Page may be too thin: ${page.slug}`);
    }
  }
}

function isEditorialCategorySlug(slug) {
  return slug === profileSlug('guides') || slug === 'articole' || slug === 'guides' || slug.includes('guide') || slug.includes('article');
}

function checkCategories() {
  if (categories.length < minCategories) {
    failures.push(`Need at least ${minCategories} categories; found ${categories.length}.`);
  }

  const slugs = new Set();
  for (const category of categories) {
    if (!category.name || !category.slug || !category.description) {
      failures.push(`Incomplete category entry: ${category.slug || category.name || '(unknown)'}`);
    }

    if (slugs.has(category.slug)) failures.push(`Duplicate category slug: ${category.slug}`);
    slugs.add(category.slug);
  }

  if (![...slugs].some((slug) => isEditorialCategorySlug(String(slug)))) {
    warnings.push('No obvious editorial/guides category found. That can work, but the site usually benefits from one.');
  }
}

function checkPosts() {
  if (posts.length < minPosts) {
    failures.push(`Need at least ${minPosts} posts before first production push; found ${posts.length}.`);
  }

  const categorySlugs = new Set(categories.map((category) => category.slug));
  const postSlugs = new Set();

  for (const post of posts) {
    if (!post.slug || !post.title || !post.kind || !post.category) {
      failures.push(`Incomplete post entry: ${post.slug || post.title || '(unknown)'}`);
      continue;
    }

    if (oldLaunchSlugs.has(post.slug)) failures.push(`Old Kepoli launch post still present: ${post.slug}`);
    if (postSlugs.has(post.slug)) failures.push(`Duplicate post slug: ${post.slug}`);
    postSlugs.add(post.slug);

    if (!categorySlugs.has(post.category)) failures.push(`Post uses unknown category: ${post.slug} -> ${post.category}`);
    if (!post.excerpt || post.excerpt.length < 70) failures.push(`Post excerpt too short: ${post.slug}`);
    if (!post.meta_description || post.meta_description.length < 70) failures.push(`Post meta description too short: ${post.slug}`);

    if (post.kind === 'recipe') {
      for (const key of ['ingredients', 'steps', 'related', 'related_articles']) {
        if (!Array.isArray(post[key]) || post[key].length === 0) failures.push(`Recipe missing ${key}: ${post.slug}`);
      }
    }

    if (post.kind === 'article') {
      if (!Array.isArray(post.sections) || post.sections.length < 4) failures.push(`Article needs more sections: ${post.slug}`);
      if (!Array.isArray(post.takeaways) || post.takeaways.length < 3) failures.push(`Article needs takeaways: ${post.slug}`);
    }
  }

  for (const post of posts) {
    for (const slug of [...(post.related || []), ...(post.related_articles || [])]) {
      if (!postSlugs.has(slug)) failures.push(`Broken internal relation from ${post.slug} to ${slug}`);
    }
  }
}

function checkImages() {
  const planBySlug = new Map();
  const postSlugs = new Set(posts.map((post) => post.slug));
  const imagesDir = path.join(root, 'content/images');

  if (imagePlan.length < posts.length) {
    failures.push(`Image plan has fewer entries than posts: ${imagePlan.length}/${posts.length}.`);
  }

  for (const image of imagePlan) {
    if (!image.slug || !image.filename) {
      failures.push('Image plan entry is missing slug or filename.');
      continue;
    }

    if (oldLaunchSlugs.has(image.slug)) failures.push(`Old Kepoli image plan slug still present: ${image.slug}`);
    if (!postSlugs.has(image.slug)) failures.push(`Image plan slug has no matching post: ${image.slug}`);
    if (planBySlug.has(image.slug)) failures.push(`Duplicate image plan slug: ${image.slug}`);
    planBySlug.set(image.slug, image);

    if (!fs.existsSync(path.join(imagesDir, image.filename))) {
      failures.push(`Missing image file for ${image.slug}: ${image.filename}`);
    }

    if (!image.alt || image.alt.length < 25) failures.push(`Image alt text too short: ${image.slug}`);
  }

  if (fs.existsSync(imagesDir)) {
    const imageFiles = fs.readdirSync(imagesDir).filter((file) => /\.(jpe?g|png|webp)$/i.test(file));
    for (const file of imageFiles) {
      const slug = file.replace(/\.(jpe?g|png|webp)$/i, '');
      if (oldLaunchSlugs.has(slug)) failures.push(`Old Kepoli launch image still present: ${file}`);
    }
  }
}

function checkThemeAssets() {
  const assetsDir = path.join(root, 'wp-content/themes/kepoli/assets/img');
  const wordmark = String(profileValue(['assets', 'wordmark']) || 'fom-wordmark');
  const icon = String(profileValue(['assets', 'icon']) || 'fom-icon');
  const socialCover = String(profileValue(['assets', 'social_cover']) || 'fom-social-cover');
  const required = [
    'hero-homepage.jpg',
    `${socialCover}.jpg`,
    'writer-photo.jpg',
  ];

  for (const filename of required) {
    if (!fs.existsSync(path.join(assetsDir, filename))) {
      warnings.push(`Theme asset missing or not replaced: ${filename}`);
    }
  }

  if (!hasAsset(assetsDir, wordmark, ['svg', 'png', 'jpg', 'jpeg', 'webp'])) {
    warnings.push(`Theme wordmark asset missing or not replaced: ${wordmark}.svg/png/jpg/webp`);
  }

  if (!hasAsset(assetsDir, icon, ['svg', 'png', 'jpg', 'jpeg', 'webp'])) {
    warnings.push(`Theme icon asset missing or not replaced: ${icon}.svg/png/jpg/webp`);
  }

  if (wordmark === 'fom-wordmark' && fs.existsSync(path.join(assetsDir, 'fom-wordmark.svg'))) {
    warnings.push('Logo filename is still fom-wordmark.svg. This can work, but make sure the artwork itself is rebranded or set assets.wordmark.');
  }
}

function hasAsset(assetsDir, basename, extensions) {
  return extensions.some((extension) => fs.existsSync(path.join(assetsDir, `${basename}.${extension}`)));
}

function checkOldIdentity() {
  const scanTargets = [
    '.env.example',
    'README.md',
    'content/site-profile.json',
    'content/pages.json',
    'content/posts.json',
    'content/categories.json',
    'content/image-plan.json',
    'wp-content/themes/kepoli/style.css',
    'wp-content/themes/kepoli/functions.php',
    'wp-content/themes/kepoli/header.php',
    'wp-content/themes/kepoli/footer.php',
    'seed/bootstrap.php',
  ];

  for (const relativePath of scanTargets) {
    const absolutePath = path.join(root, relativePath);
    if (!fs.existsSync(absolutePath)) continue;

    const content = fs.readFileSync(absolutePath, 'utf8');
    for (const [label, pattern] of oldIdentityPatterns) {
      if (pattern.test(content)) failures.push(`${relativePath} still contains ${label}.`);
    }
  }
}

function printSection(title, items) {
  if (items.length === 0) return;

  console.log(`\n${title}`);
  for (const item of items) {
    console.log(`- ${item}`);
  }
}
