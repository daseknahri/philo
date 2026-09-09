import fs from 'node:fs';

const failures = [];
const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) {
  printHelp();
  process.exit(0);
}

const expectedPosts = optionalNumberArg('expected-posts');
const expectedRecipes = optionalNumberArg('expected-recipes');
const expectedArticles = optionalNumberArg('expected-articles');
const siteProfile = JSON.parse(fs.readFileSync('content/site-profile.json', 'utf8'));
const posts = JSON.parse(fs.readFileSync('content/posts.json', 'utf8'));
const pages = JSON.parse(fs.readFileSync('content/pages.json', 'utf8'));
const categories = JSON.parse(fs.readFileSync('content/categories.json', 'utf8'));
const imagePlan = fs.existsSync('content/image-plan.json')
  ? JSON.parse(fs.readFileSync('content/image-plan.json', 'utf8'))
  : [];

const slugs = new Set();
const seoTitles = new Set();
const categorySlugs = new Set(categories.map((category) => category.slug));
const imagePlanBySlug = new Map();
const pageSlugs = new Set(pages.map((page) => page.slug));

function printHelp() {
  console.log(`Usage:
node scripts/verify-content.mjs
node scripts/verify-content.mjs --expected-posts 30 --expected-recipes 24 --expected-articles 6

Validates content JSON structure, relations, policy wording, pages, categories, and image plan entries.
Expected post counts are optional so a freshly cloned repo can pass structure checks before new posts are written.`);
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

function optionalNumberArg(name) {
  if (!(name in args)) return null;

  const value = Number.parseInt(args[name], 10);
  if (!Number.isFinite(value) || value < 0) {
    failures.push(`Invalid --${name}: expected a non-negative number.`);
    return null;
  }

  return value;
}

function hasAnyPage(...candidates) {
  return candidates.some((slug) => pageSlugs.has(slug));
}

function countPostsByCategory(...candidates) {
  return posts.filter((post) => candidates.includes(post.category)).length;
}

function profileValue(pathParts) {
  let value = siteProfile;
  for (const key of pathParts) {
    if (!value || typeof value !== 'object' || !(key in value)) return '';
    value = value[key];
  }

  return value;
}

function profileSlug(key) {
  return String(profileValue(['slugs', key]) || '').trim();
}

for (const path of [
  ['brand', 'name'],
  ['brand', 'tagline'],
  ['brand', 'description'],
  ['brand', 'site_email'],
  ['locales', 'public'],
  ['writer', 'name'],
  ['writer', 'email'],
  ['writer', 'bio'],
]) {
  if (!String(profileValue(path) || '').trim()) failures.push(`Missing site profile value: ${path.join('.')}`);
}

if (profileValue(['locales', 'admin']) !== 'en_US') failures.push('Site profile locales.admin must be en_US.');
if (profileValue(['locales', 'force_admin']) !== true) failures.push('Site profile locales.force_admin must be true.');

for (const key of ['home', 'recipes', 'guides', 'about', 'author', 'privacy', 'cookies', 'advertising', 'editorial', 'terms', 'disclaimer']) {
  if (!profileSlug(key)) failures.push(`Missing site profile slug: ${key}`);
}

for (const post of posts) {
  if (slugs.has(post.slug)) failures.push(`Duplicate post slug: ${post.slug}`);
  slugs.add(post.slug);

  if (seoTitles.has(post.seo_title)) failures.push(`Duplicate SEO title: ${post.seo_title}`);
  seoTitles.add(post.seo_title);

  if (!categorySlugs.has(post.category)) failures.push(`Unknown category for ${post.slug}: ${post.category}`);
  if (!post.excerpt || post.excerpt.length < 70) failures.push(`Short excerpt: ${post.slug}`);
  if (!post.meta_description || post.meta_description.length < 70) failures.push(`Thin meta description: ${post.slug}`);
  if (!post.seo_title || post.seo_title.length < 24) failures.push(`SEO title too short: ${post.slug}`);
  if (post.seo_title && post.seo_title.length > 68) failures.push(`SEO title too long: ${post.slug}`);
  if (post.meta_description === post.excerpt) failures.push(`Meta description duplicates excerpt exactly: ${post.slug}`);

  if (post.kind === 'recipe') {
    for (const key of ['ingredients', 'steps', 'related', 'related_articles']) {
      if (!Array.isArray(post[key]) || post[key].length === 0) failures.push(`Missing ${key}: ${post.slug}`);
    }

    if ((post.ingredients || []).length < 6) failures.push(`Recipe needs more ingredients context: ${post.slug}`);
    if ((post.steps || []).length < 5) failures.push(`Recipe needs fuller preparation steps: ${post.slug}`);
    if (!post.notes || post.notes.length < 60) failures.push(`Recipe notes too short: ${post.slug}`);
    if ((post.related || []).length < 3) failures.push(`Recipe needs 3 related recipes: ${post.slug}`);
    if ((post.related_articles || []).length < 1) failures.push(`Recipe needs at least 1 related article: ${post.slug}`);
  }

  if (post.kind === 'article') {
    if (!Array.isArray(post.sections) || post.sections.length < 5) failures.push(`Article needs deeper sections: ${post.slug}`);
    if (!Array.isArray(post.takeaways) || post.takeaways.length < 4) failures.push(`Article needs takeaways: ${post.slug}`);
    if (!Array.isArray(post.faq) || post.faq.length < 3) failures.push(`Article needs FAQ: ${post.slug}`);

    for (const section of post.sections || []) {
      if (!section.heading || section.heading.length < 8) failures.push(`Weak article heading: ${post.slug}`);
      if (!section.body || section.body.length < 180) failures.push(`Thin article section: ${post.slug} / ${section.heading || 'section'}`);
    }

    for (const item of post.faq || []) {
      if (!item.question || !item.answer) failures.push(`Incomplete FAQ item: ${post.slug}`);
    }

    if (!Array.isArray(post.related) || post.related.length < 4) failures.push(`Article needs related recipes: ${post.slug}`);

    const articleWordCount = [
      post.excerpt,
      ...(post.takeaways || []),
      ...(post.sections || []).flatMap((section) => [section.heading, section.body]),
      ...(post.faq || []).flatMap((item) => [item.question, item.answer]),
    ]
      .join(' ')
      .split(/\s+/)
      .filter(Boolean).length;

    if (articleWordCount < 500) failures.push(`Article too thin overall: ${post.slug}`);
  }
}

for (const image of imagePlan) {
  if (!image || typeof image !== 'object') {
    failures.push('Invalid image plan item.');
    continue;
  }

  if (!image.slug || typeof image.slug !== 'string') {
    failures.push('Image plan item is missing slug.');
    continue;
  }

  if (imagePlanBySlug.has(image.slug)) failures.push(`Duplicate image plan slug: ${image.slug}`);
  imagePlanBySlug.set(image.slug, image);

  if (!slugs.has(image.slug)) failures.push(`Image plan refers to unknown post slug: ${image.slug}`);
  if (!image.filename || !/\.(jpg|jpeg|png|webp)$/i.test(image.filename)) failures.push(`Invalid image filename for ${image.slug}`);
  if (!image.alt || image.alt.length < 25) failures.push(`Image alt text too short: ${image.slug}`);
  if (!image.title || image.title.length < 8) failures.push(`Image title too short: ${image.slug}`);
  if (!image.caption || image.caption.length < 20) failures.push(`Image caption too short: ${image.slug}`);
  if (!image.description || image.description.length < 40) failures.push(`Image description too short: ${image.slug}`);
  if (!image.prompt || image.prompt.length < 120) failures.push(`Image prompt too short: ${image.slug}`);
}

for (const post of posts) {
  if (!imagePlanBySlug.has(post.slug)) failures.push(`Missing image plan entry: ${post.slug}`);
}

for (const post of posts) {
  for (const slug of [...(post.related || []), ...(post.related_articles || [])]) {
    if (!slugs.has(slug)) failures.push(`Broken relation from ${post.slug} to ${slug}`);
  }
}

const requiredPageGroups = [
  ['home page', [profileSlug('home'), 'acasa', 'home']],
  ['recipes page', [profileSlug('recipes'), 'retete', 'recipes']],
  ['guides page', [profileSlug('guides'), 'articole', 'guides', 'articles']],
  ['author page', [profileSlug('author'), 'despre-autor', 'about-author']],
  ['contact page', ['contact']],
  ['privacy policy page', [profileSlug('privacy'), 'politica-de-confidentialitate', 'privacy-policy']],
  ['cookie policy page', [profileSlug('cookies'), 'politica-de-cookies', 'cookie-policy']],
  ['advertising/consent page', [profileSlug('advertising'), 'publicitate-si-consimtamant', 'advertising-and-consent']],
  ['editorial policy page', [profileSlug('editorial'), 'politica-editoriala', 'editorial-policy']],
  ['terms page', [profileSlug('terms'), 'termeni-si-conditii', 'terms-and-conditions']],
  ['culinary disclaimer page', [profileSlug('disclaimer'), 'disclaimer-culinar', 'culinary-disclaimer']],
];

for (const [label, candidates] of requiredPageGroups) {
  const filtered = candidates.filter(Boolean);
  if (!hasAnyPage(...filtered)) failures.push(`Missing required ${label}: expected one of ${filtered.join(', ')}`);
}

const aboutPage = pages.find((page) => {
  const slug = String(page.slug || '');
  return slug === profileSlug('about') || ((/^despre-/.test(slug) || /^about-/.test(slug)) && !['despre-autor', 'about-author'].includes(slug));
});
if (!aboutPage) failures.push('Missing required about-site page: expected a slug like despre-{brand} or about-{brand}.');

for (const category of categories) {
  if (!category.description || category.description.length < 70) failures.push(`Category description too short: ${category.slug}`);
}

const recipeCount = posts.filter((post) => post.kind === 'recipe').length;
const articleCount = posts.filter((post) => post.kind === 'article').length;
if (expectedPosts !== null && posts.length !== expectedPosts) failures.push(`Expected ${expectedPosts} posts, found ${posts.length}`);
if (expectedRecipes !== null && recipeCount !== expectedRecipes) failures.push(`Expected ${expectedRecipes} recipes, found ${recipeCount}`);
if (expectedArticles !== null && articleCount !== expectedArticles) failures.push(`Expected ${expectedArticles} articles, found ${articleCount}`);
if (countPostsByCategory(profileSlug('guides'), 'articole', 'guides', 'articles') !== articleCount) {
  failures.push('Article posts should stay inside the editorial/guides category.');
}

const riskyClaims = [
  /\bdetox\b/i,
  /\bmiracol(?:oasa|os|ul)?\b/i,
  /\btrateaza\b/i,
  /\bvindeca\b/i,
  /\bslabesti\b/i,
  /\bslabire\b/i,
  /\bslabit\b/i,
  /\bpierdere in greutate\b/i,
  /\bgarantat(?:a|e)?\b/i,
  /\bfara efort\b/i,
  /\bantiinflamator\b/i,
];

for (const post of posts) {
  const haystack = JSON.stringify(post);
  for (const pattern of riskyClaims) {
    if (pattern.test(haystack)) {
      failures.push(`Risky policy phrase in post content: ${post.slug} / ${pattern}`);
    }
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Content OK: ${posts.length} posts (${recipeCount} recipes, ${articleCount} articles), ${pages.length} pages, ${categories.length} categories.`);
