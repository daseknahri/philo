import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const sharedOptionKeys = [
  'brand',
  'domain',
  'site-email',
  'writer-name',
  'writer-email',
  'project-slug',
  'language',
  'lang',
  'brand-tagline',
  'brand-description',
  'writer-bio',
  'wordmark-asset',
  'icon-asset',
  'social-cover-asset',
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
  'wp-locale',
  'canonical-hosts',
  'adsense-client-id',
  'adsense-pub-id',
  'ezoic-adstxt-account-id',
  'ezoic-adstxt-redirect-url',
  'ga-measurement-id',
  'theme-description',
];

const shellOnlyOptionKeys = [
  'monetization',
  'country',
  'focus',
  'audience',
];

const shellSharedOptionKeys = [
  'no-backup',
];

const shellIdentityOptionKeys = sharedOptionKeys.filter((key) => ![
  'canonical-hosts',
  'adsense-client-id',
  'adsense-pub-id',
  'ezoic-adstxt-account-id',
  'ezoic-adstxt-redirect-url',
  'ga-measurement-id',
  'theme-description',
].includes(key));

const resetOptionKeys = [
  'delete-images',
  'clear-categories',
  'no-backup',
];

const wrapperOnlyOptionKeys = [
  'public-locale',
];

const knownArgs = new Set([
  ...sharedOptionKeys,
  ...shellOnlyOptionKeys,
  ...shellSharedOptionKeys,
  ...resetOptionKeys,
  ...wrapperOnlyOptionKeys,
  'brief',
  'write',
  'help',
  'h',
]);

const briefFieldMap = {
  brand: 'brand',
  domain: 'domain',
  siteEmail: 'site-email',
  writerName: 'writer-name',
  writerEmail: 'writer-email',
  projectSlug: 'project-slug',
  language: 'language',
  lang: 'lang',
  publicLocale: 'wp-locale',
  wpLocale: 'wp-locale',
  brandTagline: 'brand-tagline',
  brandDescription: 'brand-description',
  writerBio: 'writer-bio',
  wordmarkAsset: 'wordmark-asset',
  iconAsset: 'icon-asset',
  socialCoverAsset: 'social-cover-asset',
  homeSlug: 'home-slug',
  recipesSlug: 'recipes-slug',
  guidesSlug: 'guides-slug',
  aboutSlug: 'about-slug',
  authorSlug: 'author-slug',
  privacySlug: 'privacy-slug',
  cookiesSlug: 'cookies-slug',
  advertisingSlug: 'advertising-slug',
  editorialSlug: 'editorial-slug',
  termsSlug: 'terms-slug',
  disclaimerSlug: 'disclaimer-slug',
  canonicalHosts: 'canonical-hosts',
  adsenseClientId: 'adsense-client-id',
  adsensePubId: 'adsense-pub-id',
  ezoicAdsTxtAccountId: 'ezoic-adstxt-account-id',
  ezoicAdsTxtRedirectUrl: 'ezoic-adstxt-redirect-url',
  gaMeasurementId: 'ga-measurement-id',
  themeDescription: 'theme-description',
  monetization: 'monetization',
  country: 'country',
  focus: 'focus',
  audience: 'audience',
  deleteImages: 'delete-images',
  clearCategories: 'clear-categories',
  noBackup: 'no-backup',
  write: 'write',
};

const failures = [];
const rawArgs = parseArgs(process.argv.slice(2), failures);
const briefArgs = loadBriefArgs(rawArgs.brief, failures);
const args = { ...briefArgs, ...rawArgs };

if ('public-locale' in args && !('wp-locale' in args)) {
  args['wp-locale'] = args['public-locale'];
}

if (args.help || args.h) {
  printHelp();
  process.exit(0);
}

const write = Boolean(args.write);
const requiredFields = ['brand', 'domain', 'site-email', 'writer-name', 'writer-email'];
for (const field of requiredFields) {
  const value = args[field];
  if (typeof value !== 'string' || value.trim() === '') {
    failures.push(`Missing required --${field}`);
  }
}

const unknown = Object.keys(rawArgs).filter((key) => !knownArgs.has(key));
if (unknown.length > 0) {
  failures.push(`Unknown option${unknown.length === 1 ? '' : 's'}: ${unknown.map((key) => `--${key}`).join(', ')}`);
}

if (failures.length > 0) {
  console.error('New blog setup needs a little more information:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  console.error('\nTip: create the brief first with node scripts/create-site-brief.mjs --brand "New Blog" --domain https://new-domain.com --writer-name "Writer Name" --writer-email writer@example.com --site-email contact@new-domain.com --language en --write');
  console.error('\nRun with --help to see an example.');
  process.exit(1);
}

if (args.brief) {
  const briefCheck = spawnSync(process.execPath, ['scripts/validate-site-brief.mjs', '--brief', String(args.brief)], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe',
  });

  if (briefCheck.stdout?.trim()) {
    console.log(briefCheck.stdout.trim());
    console.log('');
  }

  if (briefCheck.stderr?.trim()) {
    console.error(briefCheck.stderr.trim());
    console.error('');
  }

  if (briefCheck.status !== 0) {
    console.error('Stopped before bootstrap because the site brief is not valid.');
    process.exit(briefCheck.status ?? 1);
  }
}

const sharedArgs = buildFlagList(args, sharedOptionKeys);
const resetArgs = buildFlagList(args, resetOptionKeys);
const writeFlag = write ? ['--write'] : [];

const steps = [
  {
    label: 'Prepare replica identity',
    script: 'prepare-replica.mjs',
    args: [...sharedArgs, ...writeFlag],
  },
  {
    label: 'Reset launch content',
    script: 'reset-replica-content.mjs',
    args: [...resetArgs, ...writeFlag],
  },
  {
    label: 'Generate starter shell',
    script: 'generate-replica-shell.mjs',
    args: [...buildFlagList(args, shellIdentityOptionKeys), ...buildFlagList(args, shellOnlyOptionKeys), ...buildFlagList(args, shellSharedOptionKeys), ...writeFlag],
  },
];

console.log(`${write ? 'Running' : 'Planning'} new blog setup in ${steps.length} steps.\n`);
if (args.brief) {
  console.log(`Site brief: ${args.brief}\n`);
}

for (const [index, step] of steps.entries()) {
  const commandArgs = [path.join('scripts', step.script), ...step.args];
  console.log(`${index + 1}. ${step.label}`);
  console.log(`   node ${commandArgs.join(' ')}`);

  const result = spawnSync(process.execPath, commandArgs, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe',
  });

  if (result.stdout?.trim()) {
    console.log(indentBlock(result.stdout.trim(), '   '));
  }

  if (result.stderr?.trim()) {
    console.error(indentBlock(result.stderr.trim(), '   '));
  }

  if (result.status !== 0) {
    console.error(`\nStopped at step ${index + 1}. Fix the issue above and rerun the command.`);
    process.exit(result.status ?? 1);
  }

  console.log('');
}

console.log(write
  ? 'New blog setup steps completed.'
  : 'Dry run completed. Add --write to apply the changes.');
console.log('Next: replace assets, add original posts and images, then run node scripts/validate-new-blog.mjs --brief site-brief.json (or the equivalent manual checks).');

function printHelp() {
  console.log(`Usage:
node scripts/start-new-blog.mjs --brief site-brief.json --write
node scripts/start-new-blog.mjs --brand "New Blog" --domain https://new-domain.com --site-email contact@new-domain.com --writer-name "Writer Name" --writer-email writer@example.com --project-slug new-blog --language en --monetization generic --delete-images --write

Runs the standard new-blog setup flow in order:
  1. prepare-replica
  2. reset-replica-content
  3. generate-replica-shell

Preferred input:
  --brief           Path to a JSON file based on site-brief.example.json
                    Best created with scripts/create-site-brief.mjs

Required if --brief is not used:
  --brand
  --domain
  --site-email
  --writer-name
  --writer-email

Common options:
  --project-slug
  --language
  --public-locale
  --brand-tagline
  --brand-description
  --writer-bio
  --wordmark-asset
  --icon-asset
  --social-cover-asset
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
  --wp-locale
  --canonical-hosts
  --monetization
  --country
  --focus
  --audience
  --adsense-client-id
  --adsense-pub-id
  --ezoic-adstxt-account-id
  --ezoic-adstxt-redirect-url
  --ga-measurement-id
  --theme-description
  --delete-images
  --clear-categories
  --no-backup
  --write

Without --write this is a dry run. The script is intended for a fresh clone, not for the source repo.`);
}

function parseArgs(argv, issues) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) {
      issues.push(`Unexpected argument: ${item}`);
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

function loadBriefArgs(briefPath, issues) {
  if (!briefPath) {
    return {};
  }

  const resolvedPath = path.resolve(process.cwd(), String(briefPath));
  if (!fs.existsSync(resolvedPath)) {
    issues.push(`Brief file not found: ${briefPath}`);
    return {};
  }

  let brief;
  try {
    brief = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
  } catch (error) {
    issues.push(`Brief file is not valid JSON: ${briefPath} (${error.message})`);
    return {};
  }

  if (!brief || typeof brief !== 'object' || Array.isArray(brief)) {
    issues.push(`Brief file must contain a JSON object: ${briefPath}`);
    return {};
  }

  const normalized = {};
  for (const [sourceKey, targetKey] of Object.entries(briefFieldMap)) {
    if (!(sourceKey in brief)) {
      continue;
    }

    const value = brief[sourceKey];
    if (typeof value === 'boolean') {
      if (value) normalized[targetKey] = true;
      continue;
    }

    if (value === null || value === undefined) {
      continue;
    }

    const text = String(value).trim();
    if (text !== '') {
      normalized[targetKey] = text;
    }
  }

  normalized.brief = briefPath;
  return normalized;
}

function buildFlagList(source, keys) {
  const result = [];

  for (const key of keys) {
    if (!(key in source)) {
      continue;
    }

    if (source[key] === true) {
      result.push(`--${key}`);
      continue;
    }

    const value = String(source[key]).trim();
    if (value !== '') {
      result.push(`--${key}`, value);
    }
  }

  return result;
}

function indentBlock(value, indent) {
  return value
    .split(/\r?\n/)
    .map((line) => `${indent}${line}`)
    .join('\n');
}
