import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const failures = [];
const notes = [];

const requiredFiles = [
  'README.md',
  '.env.example',
  '.gitignore',
  'docker-compose.yml',
  'site-brief.example.json',
  'content/site-profile.json',
  'content/pages.json',
  'content/categories.json',
  'content/posts.json',
  'content/image-plan.json',
  'docs/new-blog-launch-plan.md',
  'docs/replicate-food-blog.md',
  'docs/codex-new-site-prompt.md',
  'scripts/create-site-brief.mjs',
  'scripts/validate-site-brief.mjs',
  'scripts/start-new-blog.mjs',
  'scripts/prepare-replica.mjs',
  'scripts/reset-replica-content.mjs',
  'scripts/generate-replica-shell.mjs',
  'scripts/validate-new-blog.mjs',
  'scripts/audit-rebrand.mjs',
  'scripts/audit-replica-readiness.mjs',
  'scripts/audit-adsense-readiness.mjs',
  'seed/bootstrap.php',
  'wp-content/themes/kepoli/functions.php',
  'wp-content/themes/kepoli/header.php',
  'wp-content/themes/kepoli/footer.php',
  'wp-content/mu-plugins/fom-adtech.php',
  'wp-content/plugins/fom-author-tools/fom-author-tools.php',
  'wp-content/plugins/fom-author-tools/assets/admin.js',
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    failures.push(`Missing required engine file: ${file}`);
  }
}

const siteProfile = readJsonObject('content/site-profile.json');
const briefExample = readJsonObject('site-brief.example.json');
const gitignore = readFile('.gitignore');
const envExample = readFile('.env.example');
const dockerCompose = readFile('docker-compose.yml');
const readme = readFile('README.md');
const launchPlan = readFile('docs/new-blog-launch-plan.md');
const replicateDocs = readFile('docs/replicate-food-blog.md');
const codexPrompt = readFile('docs/codex-new-site-prompt.md');
const themeFunctions = readFile('wp-content/themes/kepoli/functions.php');
const themeHeader = readFile('wp-content/themes/kepoli/header.php');
const themeFooter = readFile('wp-content/themes/kepoli/footer.php');
const adtechMuPlugin = readFile('wp-content/mu-plugins/fom-adtech.php');
const authorToolsPhp = readFile('wp-content/plugins/fom-author-tools/fom-author-tools.php');
const authorToolsJs = readFile('wp-content/plugins/fom-author-tools/assets/admin.js');
const seedBootstrap = readFile('seed/bootstrap.php');
const createBrief = readFile('scripts/create-site-brief.mjs');
const validateBrief = readFile('scripts/validate-site-brief.mjs');
const startNewBlog = readFile('scripts/start-new-blog.mjs');
const prepareReplica = readFile('scripts/prepare-replica.mjs');
const generateShell = readFile('scripts/generate-replica-shell.mjs');
const replicaAudit = readFile('scripts/audit-replica-readiness.mjs');
const adsenseAudit = readFile('scripts/audit-adsense-readiness.mjs');

checkSiteProfile();
checkBriefContract();
checkCloneScripts();
checkThemeAndPlugins();
checkDocs();
checkEnvironment();
runWorkflowSmokeTests();
runCloneWriteSmokeTest();

if (failures.length > 0) {
  console.error(`Engine readiness audit found ${failures.length} issue${failures.length === 1 ? '' : 's'}.`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Engine readiness audit OK.');
for (const note of notes) {
  console.log(`- ${note}`);
}

function checkSiteProfile() {
  requireObjectPath(siteProfile, ['brand', 'name'], 'content/site-profile.json brand.name');
  requireObjectPath(siteProfile, ['brand', 'tagline'], 'content/site-profile.json brand.tagline');
  requireObjectPath(siteProfile, ['brand', 'description'], 'content/site-profile.json brand.description');
  requireObjectPath(siteProfile, ['brand', 'site_email'], 'content/site-profile.json brand.site_email');
  requireObjectPath(siteProfile, ['writer', 'name'], 'content/site-profile.json writer.name');
  requireObjectPath(siteProfile, ['writer', 'email'], 'content/site-profile.json writer.email');
  requireObjectPath(siteProfile, ['writer', 'bio'], 'content/site-profile.json writer.bio');

  if (valueAt(siteProfile, ['locales', 'admin']) !== 'en_US') {
    failures.push('content/site-profile.json must keep locales.admin=en_US.');
  }

  if (valueAt(siteProfile, ['locales', 'force_admin']) !== true) {
    failures.push('content/site-profile.json must keep locales.force_admin=true.');
  }

  for (const key of ['wordmark', 'icon', 'social_cover']) {
    const asset = String(valueAt(siteProfile, ['assets', key]) || '').trim();
    if (!isSlug(asset)) {
      failures.push(`content/site-profile.json assets.${key} must be a lowercase extensionless basename.`);
    }
  }

  for (const key of ['home', 'recipes', 'guides', 'about', 'author', 'privacy', 'cookies', 'advertising', 'editorial', 'terms', 'disclaimer']) {
    const slug = String(valueAt(siteProfile, ['slugs', key]) || '').trim();
    if (!isSlug(slug)) {
      failures.push(`content/site-profile.json slugs.${key} must be a valid slug.`);
    }
  }
}

function checkBriefContract() {
  for (const key of [
    'brand',
    'domain',
    'language',
    'publicLocale',
    'writerName',
    'writerEmail',
    'siteEmail',
    'projectSlug',
    'wordmarkAsset',
    'iconAsset',
    'socialCoverAsset',
    'ezoicAdsTxtAccountId',
    'ezoicAdsTxtRedirectUrl',
  ]) {
    if (!(key in briefExample)) {
      failures.push(`site-brief.example.json is missing ${key}.`);
    }
  }

  requireText('validate-site-brief asset contract', validateBrief, [
    /const knownArgs = new Set/,
    /normalizeLocale/,
    /wordmarkAsset/,
    /iconAsset/,
    /socialCoverAsset/,
    /ezoicAdsTxtRedirectUrl/,
  ]);
}

function checkCloneScripts() {
  requireText('create-site-brief engine options', createBrief, [
    /const knownArgs = new Set/,
    /function assetSlug/,
    /wordmarkAsset/,
    /iconAsset/,
    /socialCoverAsset/,
    /ezoicAdsTxtAccountId/,
    /ezoicAdsTxtRedirectUrl/,
    /rejectUnknownArgs/,
  ]);

  requireText('start-new-blog option forwarding', startNewBlog, [
    /public-locale/,
    /wordmarkAsset:\s*'wordmark-asset'/,
    /iconAsset:\s*'icon-asset'/,
    /socialCoverAsset:\s*'social-cover-asset'/,
    /ezoicAdsTxtAccountId:\s*'ezoic-adstxt-account-id'/,
    /ezoicAdsTxtRedirectUrl:\s*'ezoic-adstxt-redirect-url'/,
  ]);

  requireText('prepare-replica profile and env generation', prepareReplica, [
    /const knownArgs = new Set/,
    /validateReplicaConfig/,
    /function assetSlug/,
    /assets:\s*\{/,
    /wordmark:\s*wordmarkAsset/,
    /icon:\s*iconAsset/,
    /social_cover:\s*socialCoverAsset/,
    /WP_ADMIN_LOCALE/,
    /EZOIC_ADSTXT_ACCOUNT_ID/,
    /EZOIC_ADSTXT_REDIRECT_URL/,
    /seed\/bin\/bootstrap\.sh/,
  ]);

  requireText('generate-replica-shell profile generation', generateShell, [
    /const knownArgs = new Set/,
    /validateShellConfig/,
    /function assetSlug/,
    /assets:\s*\{/,
    /wordmark:\s*wordmarkAsset/,
    /icon:\s*iconAsset/,
    /social_cover:\s*socialCoverAsset/,
  ]);

  requireText('replica readiness profile-aware asset checks', replicaAudit, [
    /profileValue\(\['assets',\s*'wordmark'\]\)/,
    /profileValue\(\['assets',\s*'icon'\]\)/,
    /profileValue\(\['assets',\s*'social_cover'\]\)/,
    /hasAsset/,
  ]);

  requireText('rebrand audit ignores workflow-only source docs', readFile('scripts/audit-rebrand.mjs'), [
    /docs\/new-blog-launch-plan\.md/,
    /docs\/codex-new-site-prompt\.md/,
    /docs\/replicate-food-blog\.md/,
  ]);
}

function checkThemeAndPlugins() {
  requireText('theme locale split and profile helpers', themeFunctions, [
    /function fom_public_locale\(\): string/,
    /function fom_admin_locale\(\): string/,
    /add_filter\('locale',\s*'fom_force_admin_locale'/,
    /function fom_wordmark_asset\(\): string/,
    /function fom_icon_asset\(\): string/,
    /function fom_social_cover_asset\(\): string/,
    /remove_action\('wp_head',\s*'rel_canonical'\)/,
    /function fom_resolve_profile_page_template\(string \$template\): string/,
  ]);

  requireText('header/footer use profile-driven wordmark', `${themeHeader}\n${themeFooter}`, [
    /fom_asset_uri\(fom_wordmark_asset\(\)\)/,
    /fom_asset_dimension_attributes\(fom_wordmark_asset\(\)\)/,
  ]);

  requireText('MU plugin profile-driven machine files', adtechMuPlugin, [
    /function fom_mu_site_name\(\): string/,
    /function fom_mu_asset_uri\(string \$key/,
    /EZOIC_ADSTXT_ACCOUNT_ID/,
    /EZOIC_ADSTXT_REDIRECT_URL/,
    /site\.webmanifest/,
    /fom_mu_public_locale\(\)/,
  ]);

  requireText('author tools admin/public locale split', `${authorToolsPhp}\n${authorToolsJs}`, [
    /admin_ui_text/,
    /public_content_text/,
    /adminIsEnglish/,
    /publicIsEnglish/,
    /PUBLIC_IS_ENGLISH/,
  ]);

  requireText('seed imports site profile contract', seedBootstrap, [
    /content\/site-profile\.json/,
    /fom_site_profile/,
    /\$normalized\['locales'\]\['admin'\]\s*=\s*'en_US'/,
    /\$normalized\['locales'\]\['force_admin'\]\s*=\s*true/,
    /update_user_meta\(\(int\) \$user->ID,\s*'locale',\s*fom_seed_admin_locale\(\)\)/,
  ]);
}

function checkDocs() {
  requireText('README clone handoff', readme, [
    /docs\/new-blog-launch-plan\.md/,
    /docs\/replicate-food-blog\.md/,
    /docs\/codex-new-site-prompt\.md/,
    /scripts\/start-new-blog\.mjs/,
  ]);

  requireText('launch plan complete path', launchPlan, [
    /site-brief\.json/,
    /scripts\/create-site-brief\.mjs/,
    /scripts\/start-new-blog\.mjs/,
    /Replace Public Identity Assets/,
    /Engine Readiness/,
  ]);

  requireText('replication docs asset/env contract', replicateDocs, [
    /content\/site-profile\.json/,
    /assets\.wordmark/,
    /EZOIC_ADSTXT_ACCOUNT_ID/,
    /scripts\/audit-engine-readiness\.mjs/,
  ]);

  requireText('Codex new-site prompt executable standard', codexPrompt, [
    /execute the work, not just the plan/i,
    /scripts\/create-site-brief\.mjs/,
    /scripts\/start-new-blog\.mjs/,
    /scripts\/validate-new-blog\.mjs/,
  ]);
}

function checkEnvironment() {
  requireText('.gitignore local clone artifacts', gitignore, [
    /\.replica-backups\//,
    /site-brief\.json/,
  ]);

  requireText('.env.example locale and ad defaults', envExample, [
    /WP_LOCALE=/,
    /WP_ADMIN_LOCALE=en_US/,
    /ADSENSE_ENABLE=0/,
    /GA_ENABLE=0/,
    /EZOIC_ADSTXT_ACCOUNT_ID=/,
    /EZOIC_ADSTXT_REDIRECT_URL=/,
  ]);

  requireText('docker-compose env forwarding', dockerCompose, [
    /WP_LOCALE:\s*\$\{WP_LOCALE:-/,
    /WP_ADMIN_LOCALE:\s*\$\{WP_ADMIN_LOCALE:-en_US\}/,
    /EZOIC_ADSTXT_ACCOUNT_ID:\s*\$\{EZOIC_ADSTXT_ACCOUNT_ID:-\}/,
    /EZOIC_ADSTXT_REDIRECT_URL:\s*\$\{EZOIC_ADSTXT_REDIRECT_URL:-\}/,
  ]);

  requireText('AdSense audit tracks profile-driven assets and env', adsenseAudit, [
    /content\/site-profile\.json/,
    /socialCoverAsset/,
    /EZOIC_ADSTXT/,
  ]);
}

function runWorkflowSmokeTests() {
  runNodeCheck('Validate example site brief', ['scripts/validate-site-brief.mjs', '--brief', 'site-brief.example.json']);
  runNodeCheck('Dry-run new-blog workflow from example brief', ['scripts/start-new-blog.mjs', '--brief', 'site-brief.example.json']);
  runNodeFailureCheck('create-site-brief rejects unknown options', [
    'scripts/create-site-brief.mjs',
    '--brand',
    'New Blog',
    '--domain',
    'https://new-domain.com',
    '--writer-name',
    'Writer Name',
    '--writer-email',
    'writer@example.com',
    '--site-email',
    'contact@new-domain.com',
    '--writer-emial',
    'typo@example.com',
  ]);
  runNodeFailureCheck('create-site-brief rejects unsupported URL schemes', [
    'scripts/create-site-brief.mjs',
    '--brand',
    'New Blog',
    '--domain',
    'ftp://new-domain.com',
    '--writer-name',
    'Writer Name',
    '--writer-email',
    'writer@example.com',
    '--site-email',
    'contact@new-domain.com',
  ], /domain must be a full http or https URL/);
  runNodeFailureCheck('create-site-brief rejects invalid language values', [
    'scripts/create-site-brief.mjs',
    '--brand',
    'New Blog',
    '--domain',
    'https://new-domain.com',
    '--writer-name',
    'Writer Name',
    '--writer-email',
    'writer@example.com',
    '--site-email',
    'contact@new-domain.com',
    '--language',
    'fr',
  ], /language must be `en` or `ro`/);
  runNodeOutputCheck('create-site-brief normalizes public locale casing', [
    'scripts/create-site-brief.mjs',
    '--brand',
    'New Blog',
    '--domain',
    'https://new-domain.com',
    '--writer-name',
    'Writer Name',
    '--writer-email',
    'writer@example.com',
    '--site-email',
    'contact@new-domain.com',
    '--public-locale',
    'en-us',
  ], /"publicLocale":\s*"en_US"/);
  runNodeOutputCheck('create-site-brief strips asset file extensions', [
    'scripts/create-site-brief.mjs',
    '--brand',
    'New Blog',
    '--domain',
    'https://new-domain.com',
    '--writer-name',
    'Writer Name',
    '--writer-email',
    'writer@example.com',
    '--site-email',
    'contact@new-domain.com',
    '--wordmark-asset',
    'Bad Asset.png',
  ], /"wordmarkAsset":\s*"bad-asset"/);
  runNodeFailureCheck('prepare-replica rejects unknown options', [
    'scripts/prepare-replica.mjs',
    '--brand',
    'New Blog',
    '--domain',
    'https://new-domain.com',
    '--site-email',
    'contact@new-domain.com',
    '--writer-name',
    'Writer Name',
    '--writer-email',
    'writer@example.com',
    '--writer-emial',
    'typo@example.com',
  ]);
  runNodeFailureCheck('prepare-replica rejects invalid email values', [
    'scripts/prepare-replica.mjs',
    '--brand',
    'New Blog',
    '--domain',
    'https://new-domain.com',
    '--site-email',
    'not-an-email',
    '--writer-name',
    'Writer Name',
    '--writer-email',
    'writer@example.com',
  ], /site-email must look like a real email address/);
  runNodeFailureCheck('prepare-replica rejects unsupported URL schemes', [
    'scripts/prepare-replica.mjs',
    '--brand',
    'New Blog',
    '--domain',
    'ftp://new-domain.com',
    '--site-email',
    'contact@new-domain.com',
    '--writer-name',
    'Writer Name',
    '--writer-email',
    'writer@example.com',
  ], /domain must be a full http or https URL/);
  runNodeFailureCheck('generate-replica-shell rejects unknown options', [
    'scripts/generate-replica-shell.mjs',
    '--brand',
    'New Blog',
    '--domain',
    'https://new-domain.com',
    '--site-email',
    'contact@new-domain.com',
    '--writer-name',
    'Writer Name',
    '--writer-email',
    'writer@example.com',
    '--writer-emial',
    'typo@example.com',
  ]);
  runNodeFailureCheck('generate-replica-shell rejects unsupported URL schemes', [
    'scripts/generate-replica-shell.mjs',
    '--brand',
    'New Blog',
    '--domain',
    'ftp://new-domain.com',
    '--site-email',
    'contact@new-domain.com',
    '--writer-name',
    'Writer Name',
    '--writer-email',
    'writer@example.com',
  ], /domain must be a full http or https URL/);
  runNodeFailureCheck('generate-replica-shell rejects invalid monetization values', [
    'scripts/generate-replica-shell.mjs',
    '--brand',
    'New Blog',
    '--domain',
    'https://new-domain.com',
    '--site-email',
    'contact@new-domain.com',
    '--writer-name',
    'Writer Name',
    '--writer-email',
    'writer@example.com',
    '--monetization',
    'adsenze',
  ], /monetization must be `generic`, `adsense`, or `ezoic`/);
  runNodeFailureCheck('generate-replica-shell rejects duplicate page slugs', [
    'scripts/generate-replica-shell.mjs',
    '--brand',
    'New Blog',
    '--domain',
    'https://new-domain.com',
    '--site-email',
    'contact@new-domain.com',
    '--writer-name',
    'Writer Name',
    '--writer-email',
    'writer@example.com',
    '--recipes-slug',
    'guides',
    '--guides-slug',
    'guides',
  ], /Slug conflict/);
  runNodeFailureCheck('validate-site-brief rejects unknown options', [
    'scripts/validate-site-brief.mjs',
    '--brief',
    'site-brief.example.json',
    '--breif',
    'site-brief.example.json',
  ]);
  runNodeCheck('Dry-run new-blog workflow accepts public-locale alias', [
    'scripts/start-new-blog.mjs',
    '--brand',
    'New Blog',
    '--domain',
    'https://new-domain.com',
    '--site-email',
    'contact@new-domain.com',
    '--writer-name',
    'Writer Name',
    '--writer-email',
    'writer@example.com',
    '--language',
    'en',
    '--public-locale',
    'en-us',
  ]);
  notes.push('Example brief and dry-run clone workflow passed.');
  notes.push('Clone scripts reject unknown option typos and invalid values.');
}

function runCloneWriteSmokeTest() {
  const filesResult = spawnSync('git', ['ls-files', '-z'], {
    cwd: root,
    encoding: 'buffer',
    stdio: 'pipe',
  });

  if (filesResult.status !== 0) {
    failures.push('Temporary clone smoke test could not list tracked files with git ls-files.');
    return;
  }

  const files = filesResult.stdout.toString('utf8').split('\0').filter(Boolean);
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fom-engine-smoke-'));

  try {
    for (const file of files) {
      const source = path.join(root, file);
      const target = path.join(tempRoot, file);
      if (!fs.existsSync(source)) continue;

      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(source, target);
    }

    const smokeBriefPath = path.join(tempRoot, 'engine-smoke-brief.json');
    fs.writeFileSync(smokeBriefPath, `${JSON.stringify(buildSmokeBrief(), null, 2)}\n`);

    runNodeCheckIn('Temporary clone write workflow', tempRoot, ['scripts/start-new-blog.mjs', '--brief', 'engine-smoke-brief.json', '--write', '--no-backup']);
    runNodeCheckIn('Temporary clone rebrand audit', tempRoot, ['scripts/audit-rebrand.mjs']);
    runNodeCheckIn('Temporary clone replica-readiness audit', tempRoot, ['scripts/audit-replica-readiness.mjs', '--min-posts', '0', '--min-categories', '4']);
    notes.push('Temporary write-mode clone, rebrand audit, and zero-post replica-readiness audit passed.');
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function buildSmokeBrief() {
  return {
    ...briefExample,
    brand: 'Kitchen Orbit',
    domain: 'https://kitchen-orbit.test',
    writerName: 'Mira Stone',
    writerEmail: 'mira@kitchen-orbit.test',
    siteEmail: 'hello@kitchen-orbit.test',
    projectSlug: 'kitchen-orbit',
    aboutSlug: 'about-kitchen-orbit',
    brandTagline: 'Practical test recipes and kitchen guides for home cooks.',
    brandDescription: 'Kitchen Orbit publishes practical recipes and kitchen guides for home cooks.',
    writerBio: 'Mira Stone writes practical recipes and kitchen guides for Kitchen Orbit.',
    wordmarkAsset: 'kitchen-orbit-wordmark',
    iconAsset: 'kitchen-orbit-icon',
    socialCoverAsset: 'kitchen-orbit-social-cover',
    canonicalHosts: 'www.kitchen-orbit.test',
    country: 'Test Market',
    focus: 'everyday recipes, seasonal cooking ideas, and practical kitchen guides',
    audience: 'readers who cook at home and want clear, trustworthy guidance',
  };
}

function readFile(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) return '';
  return fs.readFileSync(absolutePath, 'utf8');
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

function requireObjectPath(source, pathParts, label) {
  const value = valueAt(source, pathParts);
  if (typeof value !== 'string' || value.trim() === '') {
    failures.push(`${label} is required.`);
  }
}

function valueAt(source, pathParts) {
  let value = source;
  for (const part of pathParts) {
    if (!value || typeof value !== 'object' || !(part in value)) return undefined;
    value = value[part];
  }

  return value;
}

function requireText(label, content, patterns) {
  if (!content) {
    failures.push(`${label} could not be checked because the file content was empty.`);
    return;
  }

  for (const pattern of patterns) {
    if (!pattern.test(content)) {
      failures.push(`${label} is missing: ${pattern}`);
    }
  }
}

function runNodeCheck(label, args) {
  runNodeCheckIn(label, root, args);
}

function runNodeCheckIn(label, cwd, args) {
  const result = spawnSync(process.execPath, args, {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
  });

  if (result.status === 0) return;

  const output = [result.stdout, result.stderr]
    .filter(Boolean)
    .join('\n')
    .trim()
    .split(/\r?\n/)
    .slice(0, 12)
    .join('\n');

  failures.push(`${label} failed: ${output || `exit ${result.status}`}`);
}

function runNodeFailureCheck(label, args, expectedPattern = /Unknown option/) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: 'pipe',
  });

  if (result.status !== 0 && expectedPattern.test(`${result.stdout}\n${result.stderr}`)) {
    return;
  }

  failures.push(`${label} did not fail with the expected validation error.`);
}

function runNodeOutputCheck(label, args, expectedPattern) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: 'pipe',
  });

  const output = `${result.stdout}\n${result.stderr}`;
  if (result.status === 0 && expectedPattern.test(output)) {
    return;
  }

  failures.push(`${label} did not produce the expected output.`);
}

function isSlug(value) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(value || ''));
}
