import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const args = parseArgs(process.argv.slice(2));
const knownArgs = new Set([
  'brand',
  'domain',
  'writer-name',
  'writer-email',
  'site-email',
  'output',
  'language',
  'lang',
  'public-locale',
  'wp-locale',
  'project-slug',
  'home-slug',
  'recipes-slug',
  'guides-slug',
  'about-slug',
  'author-slug',
  'privacy-slug',
  'cookies-slug',
  'advertising-slug',
  'editorial-slug',
  'terms-slug',
  'disclaimer-slug',
  'monetization',
  'brand-tagline',
  'brand-description',
  'writer-bio',
  'wordmark-asset',
  'icon-asset',
  'social-cover-asset',
  'canonical-hosts',
  'country',
  'focus',
  'audience',
  'delete-images',
  'clear-categories',
  'no-backup',
  'min-posts-target',
  'min-categories-target',
  'expected-posts',
  'expected-recipes',
  'expected-articles',
  'prepare-for-adsense',
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
const outputPath = String(args.output || 'site-brief.json').trim() || 'site-brief.json';

const brand = stringArg('brand');
const domain = stringArg('domain');
const writerName = stringArg('writer-name');
const writerEmail = stringArg('writer-email');
const siteEmail = stringArg('site-email');

if (failures.length > 0) {
  console.error('Site brief creation needs a little more information:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  console.error('\nRun with --help to see an example.');
  process.exit(1);
}

const normalizedDomain = normalizeSiteUrl(domain);
const hostname = hostnameFromSiteUrl(normalizedDomain).replace(/^www\./i, '');
const language = resolveLanguage(args.language || args.lang || '', args['public-locale'] || args['wp-locale']);
const publicLocale = normalizeLocale(args['public-locale'] || args['wp-locale'] || defaultPublicLocale(language));
const monetization = resolveMonetization(args.monetization || '');
const projectSlug = slugify(args['project-slug'] || brand);
const homeSlug = slugify(args['home-slug'] || defaultHomeSlug(language));
const recipesSlug = slugify(args['recipes-slug'] || defaultRecipesSlug(language));
const guidesSlug = slugify(args['guides-slug'] || defaultGuidesSlug(language));
const aboutSlug = slugify(args['about-slug'] || defaultAboutSlug(language, projectSlug));
const authorSlug = slugify(args['author-slug'] || defaultAuthorSlug(language));
const privacySlug = slugify(args['privacy-slug'] || defaultPrivacySlug(language));
const cookiesSlug = slugify(args['cookies-slug'] || defaultCookiesSlug(language));
const advertisingSlug = slugify(args['advertising-slug'] || defaultAdvertisingSlug(language));
const editorialSlug = slugify(args['editorial-slug'] || defaultEditorialSlug(language));
const termsSlug = slugify(args['terms-slug'] || defaultTermsSlug(language));
const disclaimerSlug = slugify(args['disclaimer-slug'] || defaultDisclaimerSlug(language));
const brandTagline = stringOrFallback(args['brand-tagline'], defaultBrandTagline(language, brand));
const brandDescription = stringOrFallback(args['brand-description'], defaultBrandDescription(language, brand));
const writerBio = stringOrFallback(args['writer-bio'], defaultWriterBio(language, brand, writerName));
const wordmarkAsset = assetSlug(args['wordmark-asset'], `${projectSlug}-wordmark`);
const iconAsset = assetSlug(args['icon-asset'], `${projectSlug}-icon`);
const socialCoverAsset = assetSlug(args['social-cover-asset'], `${projectSlug}-social-cover`);
const canonicalHosts = stringOrFallback(args['canonical-hosts'], `www.${hostname}`);
const country = stringOrFallback(args.country, defaultCountry(language));
const focus = stringOrFallback(args.focus, defaultFocus(language));
const audience = stringOrFallback(args.audience, defaultAudience(language));
const deleteImages = booleanArg('delete-images', true);
const clearCategories = booleanArg('clear-categories', false);
const noBackup = booleanArg('no-backup', false);
const minPostsTarget = integerArg('min-posts-target', 20);
const minCategoriesTarget = integerArg('min-categories-target', 4);
const expectedPosts = optionalIntegerArg('expected-posts');
const expectedRecipes = optionalIntegerArg('expected-recipes');
const expectedArticles = optionalIntegerArg('expected-articles');
const prepareForAdsense = booleanArg('prepare-for-adsense', monetization === 'adsense');
const adsenseClientId = stringOrFallback(args['adsense-client-id'], '');
const adsensePubId = stringOrFallback(args['adsense-pub-id'], '');
const ezoicAdsTxtAccountId = stringOrFallback(args['ezoic-adstxt-account-id'], '');
const ezoicAdsTxtRedirectUrl = stringOrFallback(args['ezoic-adstxt-redirect-url'], '');
const gaMeasurementId = stringOrFallback(args['ga-measurement-id'], '');
const themeDescription = stringOrFallback(
  args['theme-description'],
  language === 'en'
    ? `A lightweight food blog theme for ${brand}, built for recipes, food guides, internal linking, and ad-ready spacing.`
    : `A lightweight food blog theme for ${brand}, built for recipes, editorial reading, internal linking, and ad-ready spacing.`,
);

const brief = {
  brand,
  domain: normalizedDomain,
  language,
  publicLocale,
  writerName,
  writerEmail,
  siteEmail,
  projectSlug,
  homeSlug,
  recipesSlug,
  guidesSlug,
  aboutSlug,
  authorSlug,
  privacySlug,
  cookiesSlug,
  advertisingSlug,
  editorialSlug,
  termsSlug,
  disclaimerSlug,
  monetization,
  brandTagline,
  brandDescription,
  writerBio,
  wordmarkAsset,
  iconAsset,
  socialCoverAsset,
  canonicalHosts,
  country,
  focus,
  audience,
  deleteImages,
  clearCategories,
  noBackup,
  minPostsTarget,
  minCategoriesTarget,
  prepareForAdsense,
  adsenseClientId,
  adsensePubId,
  ezoicAdsTxtAccountId,
  ezoicAdsTxtRedirectUrl,
  gaMeasurementId,
  themeDescription,
};

if (expectedPosts !== null) brief.expectedPosts = expectedPosts;
if (expectedRecipes !== null) brief.expectedRecipes = expectedRecipes;
if (expectedArticles !== null) brief.expectedArticles = expectedArticles;

validateGeneratedBrief(brief);

if (failures.length > 0) {
  console.error('Site brief creation could not continue:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

const absoluteOutputPath = path.resolve(root, outputPath);
const nextContent = `${JSON.stringify(brief, null, 2)}\n`;

console.log(`${write ? 'Writing' : 'Planning'} site brief: ${outputPath}`);
console.log('');
console.log(nextContent.trim());

if (!write) {
  console.log('\nDry run only. Add --write to create or update the brief file.');
  process.exit(0);
}

fs.mkdirSync(path.dirname(absoluteOutputPath), { recursive: true });
fs.writeFileSync(absoluteOutputPath, nextContent);
console.log(`\nSaved ${path.relative(root, absoluteOutputPath).replace(/\\/g, '/')}`);
console.log(`Next: node scripts/validate-site-brief.mjs --brief ${outputPath}`);

function printHelp() {
  console.log(`Usage:
node scripts/create-site-brief.mjs --brand "New Blog" --domain https://new-domain.com --writer-name "Writer Name" --writer-email writer@example.com --site-email contact@new-domain.com --language en --write

Creates or updates a complete site brief for the reusable new-blog workflow.

Required:
  --brand
  --domain
  --writer-name
  --writer-email
  --site-email

Optional:
  --output               Output path, default: site-brief.json
  --language             en or ro
  --public-locale        Public WordPress locale such as en_US or ro_RO
  --project-slug
  --home-slug
  --recipes-slug
  --guides-slug
  --about-slug
  --author-slug
  --privacy-slug
  --cookies-slug
  --advertising-slug
  --editorial-slug
  --terms-slug
  --disclaimer-slug
  --monetization         generic, adsense, or ezoic
  --brand-tagline
  --brand-description
  --writer-bio
  --wordmark-asset
  --icon-asset
  --social-cover-asset
  --canonical-hosts
  --country
  --focus
  --audience
  --delete-images
  --clear-categories
  --no-backup
  --min-posts-target
  --min-categories-target
  --expected-posts
  --expected-recipes
  --expected-articles
  --prepare-for-adsense
  --adsense-client-id
  --adsense-pub-id
  --ezoic-adstxt-account-id
  --ezoic-adstxt-redirect-url
  --ga-measurement-id
  --theme-description
  --write

Without --write, the script prints the generated brief without saving it.`);
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

function stringOrFallback(value, fallback) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : fallback;
}

function booleanArg(name, fallback) {
  if (!(name in args)) return fallback;
  return normalizeBoolean(args[name], name, fallback);
}

function integerArg(name, fallback) {
  if (!(name in args)) return fallback;
  const parsed = Number.parseInt(String(args[name]), 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    failures.push(`Invalid --${name}: expected a non-negative integer.`);
    return fallback;
  }

  return parsed;
}

function optionalIntegerArg(name) {
  if (!(name in args)) return null;
  const parsed = Number.parseInt(String(args[name]), 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    failures.push(`Invalid --${name}: expected a non-negative integer.`);
    return null;
  }

  return parsed;
}

function normalizeBoolean(value, name, fallback) {
  if (value === true) return true;
  if (value === false) return false;

  const raw = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y'].includes(raw)) return true;
  if (['0', 'false', 'no', 'n'].includes(raw)) return false;

  failures.push(`Invalid --${name}: expected true or false.`);
  return fallback;
}

function normalizeSiteUrl(value) {
  const raw = String(value || '').trim();
  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProtocol.replace(/\/+$/, '');
}

function hostnameFromSiteUrl(value) {
  try {
    return new URL(value).hostname;
  } catch {
    failures.push('domain must be a valid http or https URL.');
    return 'example.com';
  }
}

function normalizeLocale(value) {
  const raw = String(value || '').trim().replace('-', '_');
  const parts = raw.split('_');
  if (parts.length !== 2) return raw;
  return `${parts[0].toLowerCase()}_${parts[1].toUpperCase()}`;
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

function defaultPublicLocale(languageCode) {
  return languageCode === 'en' ? 'en_US' : 'ro_RO';
}

function resolveMonetization(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return 'generic';
  if (raw === 'generic' || raw === 'adsense' || raw === 'ezoic') return raw;
  failures.push('monetization must be `generic`, `adsense`, or `ezoic`.');
  return 'generic';
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

function defaultHomeSlug(languageCode) {
  return languageCode === 'en' ? 'home' : 'acasa';
}

function defaultRecipesSlug(languageCode) {
  return languageCode === 'en' ? 'recipes' : 'retete';
}

function defaultGuidesSlug(languageCode) {
  return languageCode === 'en' ? 'guides' : 'articole';
}

function defaultAboutSlug(languageCode, slug) {
  return languageCode === 'en' ? `about-${slug}` : `despre-${slug}`;
}

function defaultAuthorSlug(languageCode) {
  return languageCode === 'en' ? 'about-author' : 'despre-autor';
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

function defaultCountry(languageCode) {
  return languageCode === 'en' ? 'Poland' : 'Romania';
}

function defaultFocus(languageCode) {
  return languageCode === 'en'
    ? 'everyday recipes, seasonal cooking ideas, and practical kitchen guides'
    : 'retete de casa, idei de sezon si ghiduri practice de bucatarie';
}

function defaultAudience(languageCode) {
  return languageCode === 'en'
    ? 'readers who cook at home and want clear, trustworthy guidance'
    : 'cititori care gatesc acasa si vor explicatii clare';
}

function validateGeneratedBrief(value) {
  if (!isValidHttpUrl(value.domain)) {
    failures.push('domain must be a full http or https URL.');
  }

  if (!isValidEmail(value.writerEmail)) {
    failures.push('writerEmail must look like a real email address.');
  }

  if (!isValidEmail(value.siteEmail)) {
    failures.push('siteEmail must look like a real email address.');
  }

  if (!['en', 'ro'].includes(value.language)) {
    failures.push('language must be `en` or `ro`.');
  }

  if (!/^[a-z]{2}_[A-Z]{2}$/.test(value.publicLocale)) {
    failures.push('publicLocale must look like `en_US` or `ro_RO`.');
  }

  if (value.language === 'en' && !value.publicLocale.startsWith('en_')) {
    failures.push('language=en conflicts with publicLocale.');
  }

  if (value.language === 'ro' && !value.publicLocale.startsWith('ro_')) {
    failures.push('language=ro conflicts with publicLocale.');
  }

  if (!['generic', 'adsense', 'ezoic'].includes(value.monetization)) {
    failures.push('monetization must be `generic`, `adsense`, or `ezoic`.');
  }

  for (const [key, asset] of [
    ['wordmarkAsset', value.wordmarkAsset],
    ['iconAsset', value.iconAsset],
    ['socialCoverAsset', value.socialCoverAsset],
  ]) {
    if (!isSlug(asset)) {
      failures.push(`${key} must be a lowercase asset basename without an extension.`);
    }
  }

  const slugEntries = [
    ['projectSlug', value.projectSlug],
    ['homeSlug', value.homeSlug],
    ['recipesSlug', value.recipesSlug],
    ['guidesSlug', value.guidesSlug],
    ['aboutSlug', value.aboutSlug],
    ['authorSlug', value.authorSlug],
    ['privacySlug', value.privacySlug],
    ['cookiesSlug', value.cookiesSlug],
    ['advertisingSlug', value.advertisingSlug],
    ['editorialSlug', value.editorialSlug],
    ['termsSlug', value.termsSlug],
    ['disclaimerSlug', value.disclaimerSlug],
  ];

  const seenSlugs = new Map();
  for (const [key, slug] of slugEntries) {
    if (!isSlug(slug)) {
      failures.push(`${key} must be lowercase and slug-safe.`);
      continue;
    }

    if (key === 'projectSlug') {
      continue;
    }

    if (seenSlugs.has(slug)) {
      failures.push(`Slug conflict: ${key} duplicates ${seenSlugs.get(slug)} (${slug}).`);
    } else {
      seenSlugs.set(slug, key);
    }
  }

  if (value.canonicalHosts) {
    const hostParts = value.canonicalHosts.split(',').map((part) => part.trim()).filter(Boolean);
    if (hostParts.length === 0) {
      failures.push('canonicalHosts must contain at least one hostname.');
    } else if (hostParts.some((host) => host.includes('://') || host.includes('/'))) {
      failures.push('canonicalHosts must contain hostnames only, not full URLs.');
    }
  }

  if (value.ezoicAdsTxtRedirectUrl && !isValidHttpUrl(value.ezoicAdsTxtRedirectUrl)) {
    failures.push('ezoicAdsTxtRedirectUrl must be a full http or https URL when provided.');
  }

  if (
    expectedPosts !== null
    && expectedRecipes !== null
    && expectedArticles !== null
    && expectedRecipes + expectedArticles !== expectedPosts
  ) {
    failures.push('expectedPosts must equal expectedRecipes + expectedArticles when all three are provided.');
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
