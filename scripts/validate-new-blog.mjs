import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const briefFieldMap = {
  minPostsTarget: 'min-posts',
  minCategoriesTarget: 'min-categories',
  expectedPosts: 'expected-posts',
  expectedRecipes: 'expected-recipes',
  expectedArticles: 'expected-articles',
  prepareForAdsense: 'adsense',
};

const knownArgs = new Set([
  'brief',
  'min-posts',
  'min-categories',
  'expected-posts',
  'expected-recipes',
  'expected-articles',
  'adsense',
  'help',
  'h',
]);

const failures = [];
const rawArgs = parseArgs(process.argv.slice(2), failures);
const briefArgs = loadBriefArgs(rawArgs.brief, failures);
const args = { ...briefArgs, ...rawArgs };

if (args.help || args.h) {
  printHelp();
  process.exit(0);
}

const unknown = Object.keys(rawArgs).filter((key) => !knownArgs.has(key));
if (unknown.length > 0) {
  failures.push(`Unknown option${unknown.length === 1 ? '' : 's'}: ${unknown.map((key) => `--${key}`).join(', ')}`);
}

const minPosts = numberArg(args['min-posts'], 'min-posts', 20, failures);
const minCategories = numberArg(args['min-categories'], 'min-categories', 4, failures);
const expectedPosts = optionalNumberArg(args['expected-posts'], 'expected-posts', failures);
const expectedRecipes = optionalNumberArg(args['expected-recipes'], 'expected-recipes', failures);
const expectedArticles = optionalNumberArg(args['expected-articles'], 'expected-articles', failures);
const adsense = Boolean(args.adsense);

if (failures.length > 0) {
  console.error('New blog validation needs a little more information:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  console.error('\nRun with --help to see the supported options.');
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
    console.error('Stopped before validation because the site brief is not valid.');
    process.exit(briefCheck.status ?? 1);
  }
}

const verifyArgs = ['scripts/verify-content.mjs'];
if (expectedPosts !== null) verifyArgs.push('--expected-posts', String(expectedPosts));
if (expectedRecipes !== null) verifyArgs.push('--expected-recipes', String(expectedRecipes));
if (expectedArticles !== null) verifyArgs.push('--expected-articles', String(expectedArticles));

const commands = [
  {
    label: 'Verify content structure',
    cmd: process.execPath,
    args: verifyArgs,
  },
  {
    label: 'Check image files',
    cmd: process.execPath,
    args: ['scripts/image-status.mjs'],
  },
  {
    label: 'Run rebrand audit',
    cmd: process.execPath,
    args: ['scripts/audit-rebrand.mjs'],
  },
  {
    label: 'Run replica readiness audit',
    cmd: process.execPath,
    args: ['scripts/audit-replica-readiness.mjs', '--min-posts', String(minPosts), '--min-categories', String(minCategories)],
  },
  {
    label: 'Check git diff hygiene',
    cmd: 'git',
    args: ['diff', '--check'],
  },
];

if (adsense) {
  commands.splice(commands.length - 1, 0, {
    label: 'Run AdSense readiness audit',
    cmd: process.execPath,
    args: ['scripts/audit-adsense-readiness.mjs'],
  });
}

console.log(`Running ${commands.length} validation step${commands.length === 1 ? '' : 's'}.\n`);
if (args.brief) {
  console.log(`Site brief: ${args.brief}\n`);
}

for (const [index, command] of commands.entries()) {
  console.log(`${index + 1}. ${command.label}`);
  console.log(`   ${[command.cmd, ...command.args].join(' ')}`);

  const result = spawnSync(command.cmd, command.args, {
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
    console.error(`\nValidation stopped at step ${index + 1}. Fix the issue above and rerun the command.`);
    process.exit(result.status ?? 1);
  }

  console.log('');
}

console.log('All new-blog validation steps passed.');

function printHelp() {
  console.log(`Usage:
node scripts/validate-new-blog.mjs --brief site-brief.json
node scripts/validate-new-blog.mjs --min-posts 20 --min-categories 4

Runs the standard finish-line checks for a new blog clone.

Preferred input:
  --brief              Path to a JSON file based on site-brief.example.json
                       Best created with scripts/create-site-brief.mjs

Optional:
  --min-posts          Minimum post count expected, default: 20
  --min-categories     Minimum category count expected, default: 4
  --expected-posts     Exact post count for verify-content
  --expected-recipes   Exact recipe count for verify-content
  --expected-articles  Exact article count for verify-content
  --adsense            Also run the AdSense readiness audit

This script is meant for a clone that is approaching deployment review.`);
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

function numberArg(value, label, fallback, issues) {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    issues.push(`Invalid --${label}: expected a non-negative number.`);
    return fallback;
  }

  return parsed;
}

function optionalNumberArg(value, label, issues) {
  if (value === undefined) {
    return null;
  }

  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    issues.push(`Invalid --${label}: expected a non-negative number.`);
    return null;
  }

  return parsed;
}

function indentBlock(value, indent) {
  return value
    .split(/\r?\n/)
    .map((line) => `${indent}${line}`)
    .join('\n');
}
