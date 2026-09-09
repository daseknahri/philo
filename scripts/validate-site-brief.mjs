import fs from 'node:fs';
import path from 'node:path';

const failures = [];
const warnings = [];
const args = parseArgs(process.argv.slice(2));
const knownArgs = new Set(['brief', 'help', 'h']);

if (args.help || args.h) {
  printHelp();
  process.exit(0);
}

rejectUnknownArgs(args, knownArgs);

const briefPath = String(args.brief || 'site-brief.json').trim();
if (!briefPath) {
  failures.push('Missing --brief path.');
}

const resolvedPath = path.resolve(process.cwd(), briefPath);
let brief = {};

if (failures.length === 0) {
  if (!fs.existsSync(resolvedPath)) {
    failures.push(`Brief file not found: ${briefPath}`);
  } else {
    try {
      brief = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
    } catch (error) {
      failures.push(`Brief file is not valid JSON: ${briefPath} (${error.message})`);
    }
  }
}

if (!failures.length && (!brief || typeof brief !== 'object' || Array.isArray(brief))) {
  failures.push(`Brief file must contain a JSON object: ${briefPath}`);
}

if (failures.length === 0) {
  validateBrief(brief);
}

if (failures.length > 0) {
  console.error(`Site brief validation found ${failures.length} required issue${failures.length === 1 ? '' : 's'}.`);
  printItems(failures);
  if (warnings.length > 0) {
    console.error(`\nWarnings (${warnings.length}):`);
    printItems(warnings);
  }
  process.exit(1);
}

console.log('Site brief validation passed.');
if (warnings.length > 0) {
  console.log(`Warnings (${warnings.length}):`);
  printItems(warnings);
}

function printHelp() {
  console.log(`Usage:
node scripts/validate-site-brief.mjs --brief site-brief.json

Validates a new-site brief before bootstrap or deployment checks.

Checks:
  - required identity, locale, slug, and monetization fields are present
  - domain and email formats look valid
  - language/public locale are consistent
  - slugs are unique and slug-safe
  - monetization value is allowed
  - numeric targets are non-negative
  - optional expected post counts are internally consistent`);
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

function validateBrief(value) {
  const requiredStrings = [
    'brand',
    'domain',
    'language',
    'publicLocale',
    'writerName',
    'writerEmail',
    'siteEmail',
    'projectSlug',
    'homeSlug',
    'recipesSlug',
    'guidesSlug',
    'aboutSlug',
    'authorSlug',
    'privacySlug',
    'cookiesSlug',
    'advertisingSlug',
    'editorialSlug',
    'termsSlug',
    'disclaimerSlug',
    'monetization',
  ];

  for (const key of requiredStrings) {
    if (!stringValue(value[key])) {
      failures.push(`Missing required brief field: ${key}`);
    }
  }

  const domain = stringValue(value.domain);
  const writerEmail = stringValue(value.writerEmail);
  const siteEmail = stringValue(value.siteEmail);
  const language = stringValue(value.language || value.lang);
  const publicLocale = normalizeLocale(stringValue(value.publicLocale || value.wpLocale));
  const monetization = stringValue(value.monetization);
  const canonicalHosts = stringValue(value.canonicalHosts);

  if (domain && !isValidHttpUrl(domain)) {
    failures.push('domain must be a full http or https URL.');
  }

  if (writerEmail && !isValidEmail(writerEmail)) {
    failures.push('writerEmail must look like a real email address.');
  }

  if (siteEmail && !isValidEmail(siteEmail)) {
    failures.push('siteEmail must look like a real email address.');
  }

  if (language && !['en', 'ro'].includes(language)) {
    failures.push('language must be `en` or `ro`.');
  }

  if (publicLocale && !/^[a-z]{2}_[A-Z]{2}$/.test(publicLocale)) {
    failures.push('publicLocale must look like `en_US` or `ro_RO`.');
  }

  if (language === 'en' && publicLocale && !publicLocale.startsWith('en_')) {
    failures.push('language=en conflicts with publicLocale.');
  }

  if (language === 'ro' && publicLocale && !publicLocale.startsWith('ro_')) {
    failures.push('language=ro conflicts with publicLocale.');
  }

  if (monetization && !['generic', 'adsense', 'ezoic'].includes(monetization)) {
    failures.push('monetization must be `generic`, `adsense`, or `ezoic`.');
  }

  const slugKeys = [
    'projectSlug',
    'homeSlug',
    'recipesSlug',
    'guidesSlug',
    'aboutSlug',
    'authorSlug',
    'privacySlug',
    'cookiesSlug',
    'advertisingSlug',
    'editorialSlug',
    'termsSlug',
    'disclaimerSlug',
  ];

  const slugValues = [];
  for (const key of slugKeys) {
    const slug = stringValue(value[key]);
    if (!slug) {
      continue;
    }

    if (!isSlug(slug)) {
      failures.push(`${key} must be lowercase and slug-safe.`);
    }

    if (key !== 'projectSlug') {
      slugValues.push({ key, slug });
    }
  }

  const seenSlugs = new Map();
  for (const item of slugValues) {
    if (seenSlugs.has(item.slug)) {
      failures.push(`Slug conflict: ${item.key} duplicates ${seenSlugs.get(item.slug)} (${item.slug}).`);
    } else {
      seenSlugs.set(item.slug, item.key);
    }
  }

  if (canonicalHosts) {
    const hostParts = canonicalHosts.split(',').map((part) => part.trim()).filter(Boolean);
    if (hostParts.length === 0) {
      failures.push('canonicalHosts must contain at least one hostname if provided.');
    } else if (hostParts.some((host) => host.includes('://') || host.includes('/'))) {
      failures.push('canonicalHosts must contain hostnames only, not full URLs.');
    }

    if (domain && isValidHttpUrl(domain)) {
      const domainHost = new URL(domain).hostname;
      if (!hostParts.includes(domainHost) && !hostParts.includes(`www.${domainHost.replace(/^www\./, '')}`)) {
        warnings.push('canonicalHosts does not include the domain host or its www variant.');
      }
    }
  }

  for (const [key, allowZero] of [
    ['minPostsTarget', true],
    ['minCategoriesTarget', true],
    ['expectedPosts', true],
    ['expectedRecipes', true],
    ['expectedArticles', true],
  ]) {
    if (!(key in value) || value[key] === '' || value[key] === null) {
      continue;
    }

    const parsed = Number.parseInt(String(value[key]), 10);
    if (!Number.isFinite(parsed) || parsed < 0 || (!allowZero && parsed === 0)) {
      failures.push(`${key} must be a non-negative integer.`);
    }
  }

  const expectedPosts = optionalInt(value.expectedPosts);
  const expectedRecipes = optionalInt(value.expectedRecipes);
  const expectedArticles = optionalInt(value.expectedArticles);
  if (
    expectedPosts !== null
    && expectedRecipes !== null
    && expectedArticles !== null
    && expectedRecipes + expectedArticles !== expectedPosts
  ) {
    failures.push('expectedPosts must equal expectedRecipes + expectedArticles when all three are provided.');
  }

  for (const key of ['deleteImages', 'clearCategories', 'noBackup', 'prepareForAdsense']) {
    if (key in value && typeof value[key] !== 'boolean') {
      failures.push(`${key} must be true or false.`);
    }
  }

  for (const key of ['wordmarkAsset', 'iconAsset', 'socialCoverAsset']) {
    const asset = stringValue(value[key]);
    if (asset && !isSlug(asset)) {
      failures.push(`${key} must be a lowercase asset basename without an extension.`);
    }
  }

  for (const key of ['brandTagline', 'brandDescription', 'writerBio', 'country', 'focus', 'audience', 'ezoicAdsTxtAccountId', 'ezoicAdsTxtRedirectUrl']) {
    if (key in value && typeof value[key] !== 'string') {
      failures.push(`${key} must be a string.`);
    }
  }

  const ezoicRedirectUrl = stringValue(value.ezoicAdsTxtRedirectUrl);
  if (ezoicRedirectUrl && !isValidHttpUrl(ezoicRedirectUrl)) {
    failures.push('ezoicAdsTxtRedirectUrl must be a full http or https URL when provided.');
  }
}

function stringValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeLocale(value) {
  const raw = String(value || '').trim().replace('-', '_');
  const parts = raw.split('_');
  if (parts.length !== 2) return raw;
  return `${parts[0].toLowerCase()}_${parts[1].toUpperCase()}`;
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
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function optionalInt(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function printItems(items) {
  for (const item of items) {
    console.error(`- ${item}`);
  }
}
