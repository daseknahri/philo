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
  'monetization',
  'project-slug',
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
  'focus',
  'audience',
  'country',
  'wp-locale',
  'no-backup',
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
const noBackup = Boolean(args['no-backup']);
const brand = stringArg('brand');
const domain = stringArg('domain');
const siteEmail = stringArg('site-email');
const writerName = stringArg('writer-name');
const writerEmail = stringArg('writer-email');

if (failures.length > 0) {
  console.error('Replica shell generation needs a little more information:');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('\nRun with --help to see an example.');
  process.exit(1);
}

const siteUrl = normalizeSiteUrl(domain);
const hostname = hostnameFromSiteUrl(siteUrl);
const projectSlug = slugify(args['project-slug'] || brand);
const language = resolveLanguage(args.language || args.lang || '', args['wp-locale']);
const wpLocale = normalizeLocale(args['wp-locale'] || (language === 'en' ? 'en_US' : 'ro_RO'));
const monetization = resolveMonetization(args.monetization || '');
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
const country = args.country || (language === 'en' ? 'Poland' : 'Romania');
const focus = args.focus || defaultFocus(language);
const audience = args.audience || defaultAudience(language);
const brandTagline = args['brand-tagline'] || defaultBrandTagline(language, brand);
const brandDescription = args['brand-description'] || defaultBrandDescription(language, brand);
const writerBio = args['writer-bio'] || defaultWriterBio(language, brand, writerName);
const wordmarkAsset = assetSlug(args['wordmark-asset'], `${projectSlug}-wordmark`);
const iconAsset = assetSlug(args['icon-asset'], `${projectSlug}-icon`);
const socialCoverAsset = assetSlug(args['social-cover-asset'], `${projectSlug}-social-cover`);

validateShellConfig();

if (failures.length > 0) {
  console.error('Replica shell generation could not continue:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const operations = [];
const backupRoot = path.join(root, '.replica-backups', timestamp());

const siteProfile = buildSiteProfile();
const categories = buildCategories();
const pages = buildPages();

writeJson('content/site-profile.json', siteProfile, 'Generated site profile');
writeJson('content/categories.json', categories, `Generated ${categories.length} starter categories`);
writeJson('content/pages.json', pages, `Generated ${pages.length} starter pages`);

if (operations.length === 0) {
  console.log('Replica shell already matches the generated starter pages and categories.');
  process.exit(0);
}

console.log(`${write ? 'Applied' : 'Planned'} ${operations.length} shell generation change${operations.length === 1 ? '' : 's'}:`);
for (const operation of operations) {
  console.log(`- ${operation}`);
}

if (!write) {
  console.log('\nDry run only. Add --write to replace content/pages.json and content/categories.json in the cloned repo.');
}

if (write && !noBackup) {
  console.log(`\nBackup written to ${path.relative(root, backupRoot).replace(/\\/g, '/')}`);
}

console.log('\nNext: add original posts, image plan entries, and content/images files.');

function printHelp() {
  console.log(`Usage:
node scripts/generate-replica-shell.mjs --brand "New Blog" --domain https://new-domain.com --site-email contact@new-domain.com --writer-name "Writer Name" --writer-email writer@example.com --project-slug new-blog --language en --monetization ezoic --write

Generates fresh starter pages and categories for a cloned food blog.

Required:
  --brand        Public site name
  --domain       Canonical site URL or domain
  --site-email   Public site email
  --writer-name  Public writer name
  --writer-email Public writer email

Optional:
  --language       Language preset: en or ro. Defaults from --wp-locale, otherwise ro.
  --monetization   generic, adsense, or ezoic. Used only for policy copy.
  --project-slug   Internal project slug, also used for the default about-page slug
  --brand-tagline  Public tagline for content/site-profile.json
  --brand-description Public brand description for content/site-profile.json
  --writer-bio     Public writer bio for content/site-profile.json
  --wordmark-asset Theme wordmark asset basename, default: {project-slug}-wordmark
  --icon-asset     Theme icon asset basename, default: {project-slug}-icon
  --social-cover-asset Social/share cover asset basename, default: {project-slug}-social-cover
  --home-slug      Home page slug, default: home or acasa
  --recipes-slug   Recipes landing page slug, default: recipes or retete
  --guides-slug    Guides/articles landing page slug, default: guides or articole
  --about-slug     About-site page slug, default: about-{project-slug} or despre-{project-slug}
  --author-slug    Author page slug, default: about-author or despre-autor
  --privacy-slug   Privacy page slug, default: privacy-policy or politica-de-confidentialitate
  --cookies-slug   Cookie page slug, default: cookie-policy or politica-de-cookies
  --advertising-slug Advertising/consent page slug
  --editorial-slug Editorial policy page slug
  --terms-slug     Terms page slug
  --disclaimer-slug Culinary disclaimer page slug
  --focus          Editorial focus sentence
  --audience       Audience sentence
  --country        Country/market referenced in policy copy
  --no-backup      Do not save changed files under .replica-backups/
  --write          Apply changes. Without this, only planned changes are shown.`);
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

function resolveMonetization(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return 'generic';
  if (raw === 'generic' || raw === 'adsense' || raw === 'ezoic') return raw;
  failures.push('monetization must be `generic`, `adsense`, or `ezoic`.');
  return 'generic';
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

function validateShellConfig() {
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

  if (!['generic', 'adsense', 'ezoic'].includes(monetization)) {
    failures.push('monetization must be `generic`, `adsense`, or `ezoic`.');
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

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function backupFile(filePath) {
  if (noBackup || !fs.existsSync(filePath)) return;

  const targetPath = path.join(backupRoot, path.relative(root, filePath));
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(filePath, targetPath);
}

function writeJson(relativePath, value, label) {
  const absolutePath = path.join(root, relativePath);
  const next = `${JSON.stringify(value, null, 2)}\n`;
  const previous = fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, 'utf8') : '';
  if (previous === next) return;

  operations.push(`${label}: ${relativePath}`);

  if (write) {
    backupFile(absolutePath);
    fs.writeFileSync(absolutePath, next);
  }
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
      admin: 'en_US',
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

function monetizationName() {
  if (monetization === 'adsense') return 'Google AdSense';
  if (monetization === 'ezoic') return 'Ezoic and its advertising partners';
  return 'advertising partners';
}

function buildCategories() {
  if (language === 'en') {
    return [
      {
        name: 'Quick Recipes',
        slug: 'quick-recipes',
        description: 'Fast, dependable recipes for weekdays, busy evenings, and readers who want something useful on the table without guesswork.',
      },
      {
        name: 'Main Dishes',
        slug: 'main-dishes',
        description: 'Comforting lunch and dinner ideas with clear timing, serving notes, and practical guidance for home cooks.',
      },
      {
        name: 'Desserts',
        slug: 'desserts',
        description: 'Cakes, bakes, chilled sweets, and simple treats explained with texture cues, timing notes, and storage help.',
      },
      {
        name: 'Seasonal Cooking',
        slug: 'seasonal-cooking',
        description: 'Ingredient-led ideas, seasonal menus, and timely recipes that help readers cook with what is actually available.',
      },
      {
        name: 'Guides',
        slug: guidesSlug,
        description: 'Practical food articles about ingredients, kitchen habits, planning, and techniques that support everyday cooking.',
      },
    ];
  }

  return [
    {
      name: 'Retete rapide',
      slug: 'retete-rapide',
      description: 'Retete simple pentru zile aglomerate, cu pasi clari, ingrediente accesibile si idei usor de adaptat pentru masa de acasa.',
    },
    {
      name: 'Feluri principale',
      slug: 'feluri-principale',
      description: 'Mancaruri satioase pentru pranz si cina, cu explicatii despre timp, textura, servire si organizare.',
    },
    {
      name: 'Deserturi',
      slug: 'deserturi',
      description: 'Prajituri, deserturi simple si idei dulci pentru acasa, cu repere practice pentru textura, coacere si pastrare.',
    },
    {
      name: 'Ghiduri de bucatarie',
      slug: 'ghiduri-de-bucatarie',
      description: 'Articole despre ingrediente, tehnici, planificare si obiceiuri care fac gatitul mai clar si mai usor de repetat.',
    },
    {
      name: 'Articole',
      slug: guidesSlug,
      description: 'Ghiduri editoriale, idei de sezon si explicatii utile pentru cititorii care vor context inainte sau dupa gatit.',
    },
  ];
}

function buildPages() {
  return language === 'en' ? buildEnglishPages() : buildRomanianPages();
}

function buildEnglishPages() {
  const advertisingProvider = monetizationName();

  return [
    page(homeSlug, 'Home', [
      `Welcome to ${brand}, a food publication built around ${focus}.`,
      `We write for ${audience}, with pages that are easy to scan, original featured images, and internal links that help readers keep exploring naturally.`,
    ]),
    page(recipesSlug, 'Recipes', [
      `This page groups the cooking side of ${brand}: quick recipes, main dishes, desserts, and seasonal ideas readers can actually make at home.`,
      `Every recipe should include a useful introduction, clear ingredients, reliable steps, a realistic timing estimate, a featured image, and practical serving or storage notes.`,
    ]),
    page(guidesSlug, 'Guides', [
      `${brand} also publishes food guides about ingredients, cooking habits, kitchen planning, and the choices that make everyday cooking easier to repeat.`,
      `These articles exist to support the recipes, answer common questions, and help readers move from a search result to a better cooking decision.`,
    ]),
    page(aboutSlug, `About ${brand}`, [
      `${brand} is a food publication for ${audience}. We publish ${focus}, with an emphasis on clarity, usefulness, and original editorial work.`,
      `The site is built for readers who arrive from search, social, or recommendations and want to understand quickly who is behind the publication, what kind of content they will find, and why the guidance is worth trusting.`,
      `<h2>Who the site is for</h2><ul><li>people cooking in ordinary home kitchens;</li><li>beginners who need calm, readable steps;</li><li>readers comparing ingredients, effort, timing, and expected results;</li><li>families and casual cooks who want practical help without hype.</li></ul>`,
      `<h2>How we work</h2><p>We write for real home use. We avoid exaggerated claims, misleading headlines, thin pages created only for ads, and recycled filler. When a page needs a correction or an update, we revise it.</p>`,
      `<h2>Advertising and editorial independence</h2><p>${brand} may run advertising to support the site, but ads do not decide what we publish. Sponsored material, if it appears, must be clearly labeled.</p>`,
      `For questions about the publication, partnerships, or corrections, write to <a href="mailto:{{SITE_EMAIL}}">{{SITE_EMAIL}}</a>.`,
    ]),
    page(authorSlug, 'About the author', [
      `${writerName} writes for ${brand} about home cooking, approachable recipes, and practical decisions that help readers feel more confident in the kitchen.`,
      `The work is prepared for people who want clearer guidance, more repeatable results, and useful context instead of empty lifestyle copy.`,
      `<h2>What the author aims for</h2><ul><li>recipes that can be followed in normal home kitchens;</li><li>clear explanations for beginners and returning cooks;</li><li>attention to ingredients, timing, texture, serving, and storage;</li><li>editorial work that stays practical and avoids unsupported health claims.</li></ul>`,
      `<h2>Corrections</h2><p>If you notice a mistake, an unclear step, or information that needs updating, email <a href="mailto:{{WRITER_EMAIL}}">{{WRITER_EMAIL}}</a>.</p>`,
    ]),
    page('contact', 'Contact', [
      `Use this page for questions about ${brand}, editorial corrections, partnership requests, advertising questions, or technical issues.`,
      `<h2>Contact details</h2><p><strong>Site email:</strong> <a href="mailto:{{SITE_EMAIL}}">{{SITE_EMAIL}}</a></p><p><strong>Writer email:</strong> <a href="mailto:{{WRITER_EMAIL}}">{{WRITER_EMAIL}}</a></p>`,
      `<h2>How to help us answer faster</h2><ul><li>include the URL or title of the page you mean;</li><li>mention the paragraph, step, or issue that looks wrong;</li><li>include your device and browser for technical problems;</li><li>for privacy or advertising questions, tell us where you saw the issue.</li></ul>`,
    ]),
    page(privacySlug, 'Privacy Policy', [
      `This policy explains how ${brand}, available at ${hostname}, may collect, use, and protect personal data related to visitors and readers.`,
      `Reading the site does not require an account. Most data appears through technical site operations, traffic measurement, direct messages sent by email, newsletter signups, and, when configured, advertising services.`,
      `<h2>What data may be processed</h2><ul><li>technical data such as IP address, browser, device type, and pages viewed;</li><li>interaction data related to site usage;</li><li>information you send directly by email or the newsletter form;</li><li>consent preferences related to cookies and advertising.</li></ul>`,
      `<h2>Third-party services</h2><p>${brand} may use services such as Search Console, Site Kit, Analytics, or advertising providers. Those services can set cookies or use similar identifiers depending on configuration and visitor consent choices.</p>`,
      `<h2>Your rights</h2><p>Subject to applicable law, you may request access, correction, deletion, restriction, or objection for certain processing. For questions, email <a href="mailto:{{SITE_EMAIL}}">{{SITE_EMAIL}}</a>.</p>`,
    ]),
    page(cookiesSlug, 'Cookie Policy', [
      `${brand} may use cookies and similar technologies for site operation, security, preferences, analytics, newsletter handling, and advertising.`,
      `<h2>Types of cookies</h2><ul><li>necessary cookies for site functionality and security;</li><li>analytics cookies that help us understand traffic;</li><li>advertising cookies, if advertising partners are active;</li><li>consent cookies that remember privacy choices.</li></ul>`,
      `<h2>Control</h2><p>You can manage preferences through the consent layer when available and can also block or remove cookies in your browser. Refusing non-essential cookies should not block access to editorial content.</p>`,
      `For questions about cookie usage, write to <a href="mailto:{{SITE_EMAIL}}">{{SITE_EMAIL}}</a>.`,
    ]),
    page(advertisingSlug, 'Advertising and Consent', [
      `${brand} may support the site through online advertising, including ${advertisingProvider}, once the configuration, disclosures, and consent setup are ready.`,
      `<h2>How advertising may work</h2><p>Ads may be personalized or non-personalized depending on visitor consent, local regulation, and the configuration of the advertising services used on the site.</p>`,
      `<h2>Consent expectations</h2><p>For visitors in ${country}, the EEA, the United Kingdom, Switzerland, and other relevant regions, the use of non-essential advertising cookies or personalized ads may require consent before activation.</p>`,
      `<h2>Editorial independence</h2><p>Advertising does not determine what we publish. Editorial pages, author information, contact details, and policy pages remain available regardless of ad status.</p>`,
      `For questions about ads or consent, write to <a href="mailto:{{SITE_EMAIL}}">{{SITE_EMAIL}}</a>.`,
    ]),
    page(editorialSlug, 'Editorial Policy', [
      `This page explains the publishing principles that guide recipes and food articles on ${brand}.`,
      `<h2>Purpose of the content</h2><p>The primary goal is usefulness: clear steps, practical context, relevant images, helpful internal links, and text that helps readers understand what they are doing.</p>`,
      `<h2>Originality</h2><p>We do not publish pages created only for search traffic or ads. We do not republish other sources wholesale, and we avoid misleading imagery or empty roundup content.</p>`,
      `<h2>Corrections</h2><p>If we find an error or receive specific feedback, we update the page. Readers can send corrections to <a href="mailto:{{SITE_EMAIL}}">{{SITE_EMAIL}}</a> or <a href="mailto:{{WRITER_EMAIL}}">{{WRITER_EMAIL}}</a>.</p>`,
      `<h2>Commercial relationships</h2><p>Advertising and business relationships do not change the editorial criteria used to decide what is published. Sponsored material, if any, is labeled clearly.</p>`,
    ]),
    page(termsSlug, 'Terms and Conditions', [
      `By accessing and using ${brand}, you agree to these terms and conditions.`,
      `<h2>Purpose of the site</h2><p>${brand} publishes food and editorial material for informational home-use purposes. Recipes and articles do not replace professional advice tailored to your situation.</p>`,
      `<h2>Intellectual property</h2><p>Text, content structure, visual identity, and site assets belong to the site or are used with the appropriate rights. Systematic copying or full republication is not allowed without permission.</p>`,
      `<h2>Limitation of liability</h2><p>We make reasonable efforts to publish useful and current material, but cooking outcomes vary by ingredients, equipment, timing, and personal experience.</p>`,
      `For questions about these terms, write to <a href="mailto:{{SITE_EMAIL}}">{{SITE_EMAIL}}</a>.`,
    ]),
    page(disclaimerSlug, 'Culinary Disclaimer', [
      `Recipes and food articles published on ${brand} are provided for informational home-use purposes.`,
      `<h2>Results may vary</h2><p>Dishes can turn out differently depending on ingredients, brands, humidity, equipment, portion size, heat, and the cook's experience.</p>`,
      `<h2>Allergens and food safety</h2><p>Readers are responsible for checking labels, allergens, storage conditions, expiry dates, and whether ingredients fit their own dietary needs or restrictions.</p>`,
      `<h2>Not professional advice</h2><p>The content does not replace guidance from a doctor, dietitian, nutrition professional, or food-safety specialist.</p>`,
      `For corrections or clarifications, write to <a href="mailto:{{SITE_EMAIL}}">{{SITE_EMAIL}}</a> or <a href="mailto:{{WRITER_EMAIL}}">{{WRITER_EMAIL}}</a>.`,
    ]),
  ];
}

function buildRomanianPages() {
  return [
    page(homeSlug, 'Acasa', [
      `Bine ai venit la ${brand}, un blog culinar dedicat pentru ${focus}.`,
      `Scriem pentru ${audience}, cu pagini usor de citit, imagini relevante si legaturi interne care ajuta cititorul sa continue firesc.`,
    ]),
    page(recipesSlug, 'Retete', [
      `Aici gasesti retete organizate pe categorii, de la idei rapide pana la feluri principale, deserturi si ghiduri practice.`,
      `Fiecare reteta trebuie sa aiba pasi clari, ingrediente verificate, imagine relevanta si recomandari utile pentru servire sau pastrare.`,
    ]),
    page(guidesSlug, 'Articole', [
      `Articolele ${brand} explica ingrediente, tehnici, planificare si decizii practice din bucatarie.`,
      `Scopul lor este sa completeze retetele si sa ajute cititorul sa inteleaga de ce un pas, o textura sau o alegere conteaza.`,
    ]),
    page(aboutSlug, `Despre ${brand}`, [
      `${brand} este o publicatie culinara pentru ${audience}. Publicam ${focus}, cu accent pe utilitate, claritate si continut original.`,
      `Site-ul este gandit pentru cititorii care ajung direct intr-o pagina din cautare, social sau recomandari si vor sa inteleaga repede cine scrie, ce gasesc si cum pot verifica informatiile.`,
      `<h2>Pentru cine scriem</h2><ul><li>pentru oameni care gatesc acasa in ritm normal;</li><li>pentru cititori care cauta explicatii clare, nu doar liste rapide;</li><li>pentru persoane care vor sa compare ingrediente, timp si rezultat;</li><li>pentru familii sau incepatori care au nevoie de pasi usor de urmat.</li></ul>`,
      `<h2>Cum lucram</h2><p>Textele sunt scrise pentru uz casnic. Evitam promisiunile exagerate, titlurile inselatoare si continutul publicat doar pentru trafic. Cand o pagina trebuie corectata sau completata, o actualizam.</p>`,
      `<h2>Publicitate si independenta editoriala</h2><p>${brand} poate afisa publicitate pentru a sustine costurile site-ului, dar reclamele nu decid ce publicam. Materialele sponsorizate, daca apar, trebuie marcate clar.</p>`,
      `Pentru intrebari despre site, colaborari sau corecturi, ne poti scrie la <a href="mailto:{{SITE_EMAIL}}">{{SITE_EMAIL}}</a>.`,
    ]),
    page(authorSlug, 'Despre autor', [
      `${writerName} scrie pentru ${brand} despre gatit de acasa, retete clare si decizii practice in bucatarie.`,
      `Continutul este pregatit pentru oameni care vor sa gateasca mai sigur, mai organizat si fara explicatii inutile.`,
      `<h2>Ce urmareste in continut</h2><ul><li>retete care pot fi urmate in bucatarii obisnuite;</li><li>explicatii accesibile pentru cititori incepatori;</li><li>atentie la ingrediente, timp, textura si pastrare;</li><li>articole utile, fara afirmatii medicale sau promisiuni neverificate.</li></ul>`,
      `<h2>Corecturi</h2><p>Daca observi o eroare, un pas neclar sau o informatie care trebuie actualizata, scrie la <a href="mailto:{{WRITER_EMAIL}}">{{WRITER_EMAIL}}</a>.</p>`,
    ]),
    page('contact', 'Contact', [
      `Ne poti contacta pentru intrebari despre ${brand}, corecturi, colaborari editoriale sau probleme tehnice.`,
      `<h2>Date de contact</h2><p><strong>Email site:</strong> <a href="mailto:{{SITE_EMAIL}}">{{SITE_EMAIL}}</a></p><p><strong>Email autor:</strong> <a href="mailto:{{WRITER_EMAIL}}">{{WRITER_EMAIL}}</a></p>`,
      `<h2>Cum ne ajuti sa raspundem mai repede</h2><ul><li>trimite linkul paginii sau titlul articolului;</li><li>spune ce paragraf, pas sau functie pare gresita;</li><li>mentionaza dispozitivul si browserul daca este o problema tehnica;</li><li>pentru confidentialitate sau publicitate, include pagina unde ai observat problema.</li></ul>`,
    ]),
    page(privacySlug, 'Politica de confidentialitate', [
      `Aceasta politica explica modul in care ${brand}, disponibil la ${hostname}, poate colecta si utiliza date personale ale vizitatorilor.`,
      `Lectura obisnuita a site-ului nu cere crearea unui cont. Datele apar mai ales din functionarea tehnica a site-ului, analiza traficului, mesajele trimise direct si, dupa configurare, publicitate.`,
      `<h2>Ce date pot fi prelucrate</h2><ul><li>date tehnice precum IP, browser, dispozitiv si pagini accesate;</li><li>date despre interactiunea cu site-ul;</li><li>date oferite direct prin email;</li><li>date legate de consimtamantul pentru cookie-uri.</li></ul>`,
      `<h2>Servicii terte</h2><p>${brand} poate folosi servicii Google precum Search Console, Site Kit, Analytics si AdSense. Aceste servicii pot folosi cookie-uri sau identificatori similari in functie de configurarea site-ului si de optiunile de consimtamant.</p>`,
      `<h2>Drepturile tale</h2><p>In limitele legii, poti solicita acces, rectificare, stergere, restrictionare sau opozitie la anumite prelucrari. Pentru intrebari, scrie la <a href="mailto:{{SITE_EMAIL}}">{{SITE_EMAIL}}</a>.</p>`,
    ]),
    page(cookiesSlug, 'Politica de cookies', [
      `${brand} poate folosi cookie-uri si tehnologii similare pentru functionarea site-ului, securitate, preferinte, analiza si publicitate.`,
      `<h2>Tipuri de cookie-uri</h2><ul><li>cookie-uri necesare pentru functionare si securitate;</li><li>cookie-uri de analiza pentru intelegerea traficului;</li><li>cookie-uri publicitare, daca AdSense sau servicii similare sunt active;</li><li>cookie-uri de consimtamant pentru salvarea optiunilor.</li></ul>`,
      `<h2>Control</h2><p>Poti modifica preferintele prin bannerul de consimtamant, cand este disponibil, si poti bloca sau sterge cookie-uri din browser. Refuzul cookie-urilor neesentiale nu ar trebui sa blocheze accesul la continutul editorial.</p>`,
      `Pentru intrebari despre cookie-uri, scrie la <a href="mailto:{{SITE_EMAIL}}">{{SITE_EMAIL}}</a>.`,
    ]),
    page(advertisingSlug, 'Publicitate si consimtamant', [
      `${brand} poate sustine site-ul prin publicitate online, inclusiv ${monetizationName()}, dupa ce configurarea si consimtamantul sunt pregatite corect.`,
      `<h2>Cum functioneaza publicitatea</h2><p>Reclamele pot fi personalizate sau nepersonalizate in functie de setarile de consimtamant, tara vizitatorului si configurarea serviciilor folosite.</p>`,
      `<h2>Consimtamant</h2><p>Pentru vizitatorii din ${country}, EEA, Regatul Unit si Elvetia, folosirea cookie-urilor de publicitate si personalizarea reclamelor poate necesita consimtamant prealabil.</p>`,
      `<h2>Independenta editoriala</h2><p>Publicitatea nu decide ce publicam. Continutul editorial, paginile despre autor, contact si politica editoriala raman accesibile indiferent de stadiul publicitatii.</p>`,
      `Pentru intrebari despre publicitate, scrie la <a href="mailto:{{SITE_EMAIL}}">{{SITE_EMAIL}}</a>.`,
    ]),
    page(editorialSlug, 'Politica editoriala', [
      `Aceasta pagina explica principiile dupa care ${brand} publica retete si articole culinare.`,
      `<h2>Scopul continutului</h2><p>Scopul principal este utilitatea: pasi clari, context practic, imagini relevante, legaturi interne si texte care ajuta cititorul sa inteleaga ce face.</p>`,
      `<h2>Originalitate</h2><p>Nu publicam pagini create doar pentru trafic sau reclame. Nu copiem continut integral din alte surse si nu folosim imagini inselatoare.</p>`,
      `<h2>Corecturi</h2><p>Daca observam o eroare sau primim feedback concret, actualizam pagina. Cititorii pot trimite corecturi la <a href="mailto:{{SITE_EMAIL}}">{{SITE_EMAIL}}</a> sau <a href="mailto:{{WRITER_EMAIL}}">{{WRITER_EMAIL}}</a>.</p>`,
      `<h2>Publicitate</h2><p>Publicitatea si colaborarile comerciale nu schimba criteriile editoriale. Materialele sponsorizate, daca apar, vor fi marcate clar.</p>`,
    ]),
    page(termsSlug, 'Termeni si conditii', [
      `Prin accesarea si utilizarea site-ului ${brand} accepti acesti termeni si conditii.`,
      `<h2>Scopul site-ului</h2><p>${brand} publica materiale culinare si editoriale cu scop informativ pentru uz casnic. Retetele si articolele nu reprezinta consultanta profesionala personalizata.</p>`,
      `<h2>Proprietate intelectuala</h2><p>Textele, structura continutului, elementele grafice, logo-ul si identitatea vizuala apartin site-ului sau sunt utilizate cu drepturi corespunzatoare. Nu este permisa copierea integrala sau republicarea sistematica fara acord.</p>`,
      `<h2>Limitarea raspunderii</h2><p>Depunem eforturi rezonabile pentru continut util si actualizat, dar rezultatele culinare pot varia in functie de ingrediente, echipamente si experienta.</p>`,
      `Pentru intrebari privind termenii, scrie la <a href="mailto:{{SITE_EMAIL}}">{{SITE_EMAIL}}</a>.`,
    ]),
    page(disclaimerSlug, 'Disclaimer culinar', [
      `Retetele si articolele publicate pe ${brand} sunt oferite in scop informativ si pentru uz casnic.`,
      `<h2>Rezultatele pot varia</h2><p>Preparatele pot iesi diferit in functie de ingrediente, marci, dimensiuni, umiditate, echipamente, temperatura si experienta celui care gateste.</p>`,
      `<h2>Alergeni si siguranta alimentara</h2><p>Cititorul este responsabil sa verifice etichetele, alergenii, data de expirare, depozitarea si compatibilitatea ingredientelor cu propriile restrictii alimentare.</p>`,
      `<h2>Nu inlocuieste sfatul profesional</h2><p>Continutul nu inlocuieste recomandarea unui medic, nutritionist, dietetician sau specialist in siguranta alimentara.</p>`,
      `Pentru corecturi, scrie la <a href="mailto:{{SITE_EMAIL}}">{{SITE_EMAIL}}</a> sau <a href="mailto:{{WRITER_EMAIL}}">{{WRITER_EMAIL}}</a>.`,
    ]),
  ];
}

function page(slug, title, blocks) {
  return {
    slug,
    title,
    content: blocks.map((block) => {
      const text = String(block).trim();
      if (/^<h2|^<ul|^<p/i.test(text)) return text;
      return `<p>${text}</p>`;
    }).join(''),
  };
}
