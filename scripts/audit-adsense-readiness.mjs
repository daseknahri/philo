#!/usr/bin/env node
/**
 * AdSense pre-submission audit — CURRENT stack (viral-reader theme + kepoli
 * mu-plugins + automation-hamri plugin). Static, file-based: no live site needed.
 *
 * Run from the kepoli project root:
 *   node scripts/audit-adsense-readiness.mjs
 *
 * Exit code 1 if any hard FAIL, else 0. WARN items are approval-risk nudges that
 * a human must judge (author legitimacy, thin content) — they don't fail the run.
 *
 * NOTE: this replaced the pre-2026 audit that targeted the deleted Romanian
 * `wp-content/themes/kepoli/` theme. Ads are now rendered by the plugin
 * (includes/ads.php) + the env-driven mu-plugin (fom-adtech.php); the theme
 * itself renders no ad markup.
 */
import fs from 'node:fs';

const results = [];
const pass = (m) => results.push({ level: 'PASS', m });
const warn = (m) => results.push({ level: 'WARN', m });
const fail = (m) => results.push({ level: 'FAIL', m });

const readText = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } };
const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } };
const exists = (p) => { try { return fs.existsSync(p); } catch { return false; } };

/* Unicode-safe word count over HTML/text (mirrors the plugin's own counter). */
function wordCount(...chunks) {
  const text = chunks
    .flat(Infinity)
    .map((c) => (c == null ? '' : String(c)))
    .join(' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text === '') return 0;
  return text.split(' ').filter(Boolean).length;
}

/* ── 1. Ad/verification mu-plugin (fom-adtech.php) ─────────────────────── */
const adtech = readText('wp-content/mu-plugins/fom-adtech.php');
if (adtech === null) {
  fail('wp-content/mu-plugins/fom-adtech.php is missing — no ads.txt / verification / loader.');
} else {
  const metaIdx = adtech.indexOf('google-adsense-account');
  const gateIdx = adtech.indexOf("in_array($enable, ['0', 'false', 'off', 'no']");

  if (metaIdx === -1) {
    fail('No <meta name="google-adsense-account"> — AdSense cannot verify site ownership.');
  } else if (gateIdx === -1) {
    warn('Verification meta present, but the ADSENSE_ENABLE serving gate was not found where expected — eyeball fom_mu_adsense_head().');
  } else if (metaIdx < gateIdx) {
    pass('Verification meta is decoupled from ad serving (emits with ADSENSE_ENABLE=0, so you can connect + get reviewed without showing ads).');
  } else {
    fail('Verification meta is emitted AFTER the ADSENSE_ENABLE gate — with ads off the site cannot be verified. Move the meta echo above the gate.');
  }

  const hasConsent = adtech.includes("'consent','default'") || adtech.includes('"consent","default"');
  const hasV2 = adtech.includes('ad_user_data') && adtech.includes('ad_personalization');
  const hasRegion = /'RO'|"RO"/.test(adtech) && adtech.includes('region');
  if (hasConsent && hasV2 && hasRegion) {
    pass('Google Consent Mode v2 defaults present (ad_user_data + ad_personalization denied by default for EEA/UK/CH).');
  } else if (hasConsent) {
    warn('A consent default block exists but is missing v2 signals (ad_user_data/ad_personalization) or the EEA region list.');
  } else {
    warn('No Google Consent Mode v2 defaults found — fine if you rely solely on Google Privacy & Messaging, but the belt-and-suspenders default is recommended before enabling ads in the EEA.');
  }

  const loaderGated = gateIdx !== -1 && adtech.indexOf('adsbygoogle.js') > gateIdx;
  if (loaderGated) pass('Ad loader (adsbygoogle.js) is gated behind ADSENSE_ENABLE.');
  else warn('Could not confirm the adsbygoogle.js loader sits behind the ADSENSE_ENABLE gate.');

  if (adtech.includes('f08c47fec0942fa0') && adtech.includes('google.com, ')) {
    pass('ads.txt is served for the configured AdSense publisher id.');
  } else {
    fail('ads.txt handler not found / malformed in fom-adtech.php.');
  }

  if (adtech.includes('xmlrpc_enabled') && adtech.includes('__return_false')) pass('XML-RPC disabled.');
  else warn('XML-RPC does not appear to be disabled.');

  if (adtech.includes('/wp/v2/users')) pass('REST user-enumeration endpoint blocked for anonymous visitors.');
  else warn('REST /wp/v2/users enumeration guard not found.');
}

/* ── 2. docker-compose passes the AdSense env into the wordpress service ───── */
const compose = readText('docker-compose.yml');
if (compose === null) {
  fail('docker-compose.yml missing.');
} else {
  for (const key of ['ADSENSE_CLIENT_ID', 'ADSENSE_PUB_ID', 'ADSENSE_ENABLE']) {
    if (compose.includes(`${key}: \${${key}`)) pass(`docker-compose passes ${key} into the container.`);
    else fail(`docker-compose does not pass ${key} — the mu-plugin will read empty and emit no ads/verification.`);
  }
}

/* ── 3. .env.example default keeps ads OFF until consent is live ───────────── */
const envExample = readText('.env.example');
if (envExample === null) {
  warn('.env.example missing.');
} else if (/^ADSENSE_ENABLE=0\s*$/m.test(envExample)) {
  pass('.env.example defaults ADSENSE_ENABLE=0 (ads off until the CMP is live).');
} else if (/^ADSENSE_ENABLE=1\s*$/m.test(envExample)) {
  warn('.env.example defaults ADSENSE_ENABLE=1 — confirm a CMP is configured before this ships. (Live value is whatever Coolify sets.)');
} else {
  warn('.env.example does not document ADSENSE_ENABLE.');
}

/* ── 4. Plugin in-content ad engine + thin-content safety net ──────────────── */
const pluginAds = readText('wp-content/plugins/automation-hamri/includes/ads.php');
if (pluginAds === null) {
  warn('automation-hamri/includes/ads.php not found — plugin in-content ad units unavailable (mu-plugin Auto Ads still works).');
} else {
  if (pluginAds.includes('wpap_min_words_for_ads')) pass('Plugin skips in-content ads on thin pages (wpap_min_words_for_ads safety net).');
  else warn('Plugin thin-content ad guard (wpap_min_words_for_ads) not found.');
  if (pluginAds.includes("if ( ! $ads['enabled'] )")) pass('Plugin ad injection is gated by the wpap_ads_inject enabled flag.');
}

/* ── 5. Required AdSense trust pages ──────────────────────────────────────── */
const pages = readJson('content/pages.json') || [];
const slugs = new Set(pages.map((p) => String(p.slug || '')));
const sp = readJson('content/site-profile.json') || {};
const profileSlugs = sp.slugs || {};
// Trust-page slugs are site-specific (this repo is re-seeded per site), so read
// them from content/site-profile.json's `slugs` map instead of hardcoding one
// site's literals — a required key with no profile entry still surfaces as
// "missing" below rather than silently dropping out of the check.
const trustSlugKeys = ['about', 'author', 'privacy', 'cookies', 'advertising', 'editorial', 'terms', 'disclaimer'];
const required = [
  ...trustSlugKeys.map((k) => String(profileSlugs[k] || `(missing profile.slugs.${k})`)),
  String(profileSlugs.contact || 'contact'),
];
const missing = required.filter((s) => !slugs.has(s));
if (missing.length === 0) pass(`All ${required.length} AdSense trust/policy pages present.`);
else fail(`Missing trust pages: ${missing.join(', ')}.`);

/* ── 6. Content volume + per-post originality floor (thin content = #1 reject) */
const posts = readJson('content/posts.json') || [];
if (posts.length === 0) {
  fail('content/posts.json empty or unreadable — no content to review.');
} else {
  if (posts.length >= 15) pass(`${posts.length} posts seeded (≥15).`);
  else warn(`Only ${posts.length} posts — AdSense favours more substantial libraries; aim for 15–25+.`);

  const FLOOR = 400;
  const thin = [];
  for (const p of posts) {
    const wc = wordCount(p.content, p.ingredients, p.steps, p.excerpt);
    if (wc < FLOOR) thin.push(`${p.slug || '(no slug)'} (${wc}w)`);
  }
  if (thin.length === 0) pass(`Every post clears the ${FLOOR}-word originality floor.`);
  else warn(`${thin.length} post(s) under ${FLOOR} words: ${thin.slice(0, 8).join(', ')}${thin.length > 8 ? ' …' : ''}.`);
}

/* ── 7. Author legitimacy (the "who is behind this" approval axis) ─────────── */
const writer = sp.writer || sp.author || {};
if (String(writer.name || '').trim() && String(writer.bio || '').trim().length >= 120) {
  pass(`Author identity present (${writer.name}) with a substantive bio.`);
} else {
  warn('Author name/bio is thin — a real, accountable author identity materially helps approval.');
}

/* Author photo: the seed imports content/images/<writer.photo> as the author's
   headshot (byline, author box, Person schema image). Check it there — NOT in the
   theme dir, where it never lives. */
const writerPhoto = String(writer.photo || '').trim();
if (writerPhoto && exists(`content/images/${writerPhoto}`)) {
  pass(`Author headshot present (content/images/${writerPhoto}) — seed imports it as the author photo for byline + Person schema.`);
} else if (writerPhoto) {
  fail(`site-profile writer.photo = "${writerPhoto}" but content/images/${writerPhoto} is missing — the author byline/schema image will be blank.`);
} else {
  warn('No author photo configured (site-profile.writer.photo is empty) — a genuine author photo is a strong legitimacy signal for reviewers.');
}

/* ── Report ───────────────────────────────────────────────────────────────── */
const order = { FAIL: 0, WARN: 1, PASS: 2 };
results.sort((a, b) => order[a.level] - order[b.level]);
const icon = { PASS: '✅', WARN: '⚠️ ', FAIL: '❌' };
const n = { PASS: 0, WARN: 0, FAIL: 0 };
console.log('\nAdSense readiness — current stack\n' + '─'.repeat(50));
for (const r of results) { console.log(`${icon[r.level]} ${r.m}`); n[r.level]++; }
console.log('─'.repeat(50));
console.log(`${n.PASS} pass · ${n.WARN} warn · ${n.FAIL} fail\n`);
if (n.FAIL > 0) {
  console.log('Result: NOT ready — resolve the ❌ items above before submitting.\n');
  process.exit(1);
}
console.log(n.WARN > 0
  ? 'Result: technically ready. The ⚠️  items are human-judgement approval risks — weigh them before you apply.\n'
  : 'Result: ready to submit.\n');
