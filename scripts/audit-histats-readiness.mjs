import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];

const env = readEnv('.env.example');
const compose = readFile('docker-compose.yml');
const themeFunctions = readFile('wp-content/themes/kepoli/functions.php');
const docs = readFile('docs/histats-readiness.md');

checkEnvContract();
checkComposeContract();
checkThemeGate();
checkDocs();

if (failures.length === 0) {
  console.log('Histats readiness OK.');
} else {
  console.log(`Histats readiness found ${failures.length} required fix${failures.length === 1 ? '' : 'es'}.`);
  printSection('Required fixes', failures);
}

process.exit(failures.length > 0 ? 1 : 0);

function readFile(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`Missing file: ${relativePath}`);
    return '';
  }

  return fs.readFileSync(absolutePath, 'utf8');
}

function readEnv(relativePath) {
  const values = new Map();
  const content = readFile(relativePath);
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const equalIndex = trimmed.indexOf('=');
    if (equalIndex === -1) continue;
    values.set(trimmed.slice(0, equalIndex), trimmed.slice(equalIndex + 1));
  }

  return values;
}

function envValue(key) {
  return String(env.get(key) ?? '').trim();
}

function occurrences(value, pattern) {
  return (String(value).match(new RegExp(escapeRegExp(pattern), 'g')) || []).length;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function requireIncludes(label, content, patterns) {
  for (const pattern of patterns) {
    if (!pattern.test(content)) {
      failures.push(`${label} is missing: ${pattern}`);
    }
  }
}

function checkEnvContract() {
  const defaults = new Map([
    ['HISTATS_ENABLE', '0'],
    ['HISTATS_CODE_BASE64', ''],
    ['HISTATS_EXCLUDE_ADMINS', '1'],
  ]);

  for (const [key, expected] of defaults.entries()) {
    if (!env.has(key)) {
      failures.push(`.env.example is missing ${key}.`);
    } else if (envValue(key) !== expected) {
      failures.push(`.env.example must default ${key}=${expected}.`);
    }
  }
}

function checkComposeContract() {
  for (const key of ['HISTATS_ENABLE', 'HISTATS_CODE_BASE64', 'HISTATS_EXCLUDE_ADMINS']) {
    if (occurrences(compose, key) < 2) {
      failures.push(`docker-compose.yml must pass ${key} to both wordpress and wp-init.`);
    }
  }
}

function checkThemeGate() {
  requireIncludes('theme Histats helpers', themeFunctions, [
    /function\s+fom_histats_enabled\s*\(/,
    /function\s+fom_histats_should_render\s*\(/,
    /function\s+fom_histats_footer\s*\(/,
    /HISTATS_ENABLE/,
    /HISTATS_CODE_BASE64/,
    /HISTATS_EXCLUDE_ADMINS/,
    /base64_decode\(\$encoded,\s*true\)/,
    /add_action\('wp_footer',\s*'fom_histats_footer'/,
  ]);

  requireIncludes('theme public-only Histats gate', themeFunctions, [
    /is_admin\(\)/,
    /wp_doing_ajax\(\)/,
    /is_feed\(\)/,
    /is_user_logged_in\(\)\s*&&\s*current_user_can\('manage_options'\)/,
  ]);
}

function checkDocs() {
  requireIncludes('docs/histats-readiness.md', docs, [
    /HISTATS_ENABLE=1/,
    /HISTATS_CODE_BASE64=/,
    /HISTATS_EXCLUDE_ADMINS=1/,
    /hidden/i,
    /PowerShell/,
    /private\/incognito/i,
    /live visitors/i,
  ]);
}

function printSection(title, items) {
  if (items.length === 0) return;
  console.log(`\n${title}:`);
  for (const item of items) {
    console.log(`- ${item}`);
  }
}
