#!/usr/bin/env node
/**
 * Kepoli readiness check — a fast, no-server audit of the repo's content + config
 * + infra against the AdSense/SEO/quality bar. Run from anywhere:
 *   node scripts/readiness-check.mjs
 * Exit code 0 = no FAILs (WARNs allowed), 1 = one or more FAILs.
 *
 * This replaces the obsolete audit-adsense-readiness.mjs (which targeted the old
 * Romanian "kepoli" theme). It checks the current viral-reader + seed setup.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..'); // repo root (kepoli/)
const rd = (p) => readFileSync(join(ROOT, p), 'utf8');
const rj = (p) => JSON.parse(rd(p));

let fails = 0, warns = 0, passes = 0;
const FAIL = (m) => { console.log(`  ✗ FAIL  ${m}`); fails++; };
const WARN = (m) => { console.log(`  ! WARN  ${m}`); warns++; };
const PASS = (m) => { console.log(`  ✓ ${m}`); passes++; };
const section = (t) => console.log(`\n== ${t} ==`);

let posts, pages, cats, profile, plan;
try {
  posts = rj('content/posts.json');
  pages = rj('content/pages.json');
  cats = rj('content/categories.json');
  profile = rj('content/site-profile.json');
  plan = rj('content/image-plan.json');
} catch (e) { console.log(`FATAL: cannot read content JSON — ${e.message}`); process.exit(1); }

const FORBIDDEN = [
  { re: /\bshare\b[^<.]{0,40}\bfacebook\b/i, name: 'facebook-share bait' },
  { re: /next page|check the first comment|continue reading on the next/i, name: 'next-page/comment bait' },
  { re: /\bin conclusion\b|\bwhether you(?:'| a)re a beginner\b/i, name: 'AI filler' },
  { re: /\bas an ai\b|\bSure[!,]\s+Here\b/i, name: 'AI scaffolding' },
  { re: /\bciorb|\breteta\b|\bfeluri\b|\bpatiserie\b/i, name: 'Romanian leftover' },
];
const wordCount = (html) => html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;

section('Content — posts');
const slugs = posts.map((p) => p.slug);
const dupes = slugs.filter((s, i) => slugs.indexOf(s) !== i);
dupes.length ? FAIL(`duplicate post slugs: ${[...new Set(dupes)].join(', ')}`) : PASS(`no duplicate slugs (${posts.length} posts)`);
const kinds = posts.reduce((a, p) => ((a[p.kind] = (a[p.kind] || 0) + 1), a), {});
posts.length >= 15 ? PASS(`post count ${posts.length} (${JSON.stringify(kinds)})`) : WARN(`only ${posts.length} posts — thin for launch`);
const slugSet = new Set(slugs);
let thin = 0, badFields = 0, forbiddenHits = 0, deadLinks = 0;
for (const p of posts) {
  const req = ['kind', 'slug', 'title', 'category', 'excerpt', 'seo_title', 'meta_description', 'content'];
  for (const k of req) if (!p[k] || String(p[k]).trim() === '') { FAIL(`${p.slug || '?'}: missing '${k}'`); badFields++; }
  if (p.kind === 'recipe') for (const k of ['prep', 'cook', 'servings', 'ingredients', 'steps']) {
    if (!p[k] || (Array.isArray(p[k]) && !p[k].length)) { FAIL(`${p.slug}: recipe missing '${k}'`); badFields++; }
  }
  const wc = wordCount(String(p.content || ''));
  if (wc < 600) { WARN(`${p.slug}: only ${wc} words`); thin++; }
  for (const f of FORBIDDEN) if (f.re.test(String(p.content || ''))) { FAIL(`${p.slug}: ${f.name}`); forbiddenHits++; }
  for (const r of [...(p.related || []), ...(p.related_articles || [])]) if (!slugSet.has(r)) { FAIL(`${p.slug}: dead related link '${r}'`); deadLinks++; }
  if ((p.meta_description || '').length > 165) WARN(`${p.slug}: meta_description ${p.meta_description.length} chars (>165)`);
}
if (!badFields) PASS('all posts have required fields');
if (!forbiddenHits) PASS('no bait / AI-scaffolding / Romanian in post bodies');
if (!deadLinks) PASS('all related-post links resolve');
if (!thin) PASS('all posts >= 600 words');

section('Content — images');
const planSlugs = new Set(plan.map((x) => x.slug));
let imgMiss = 0;
for (const p of posts) {
  if (!planSlugs.has(p.slug)) { FAIL(`${p.slug}: no image-plan entry`); imgMiss++; continue; }
  const fn = plan.find((x) => x.slug === p.slug)?.filename || '';
  if (!fn || !existsSync(join(ROOT, 'content/images', fn))) { FAIL(`${p.slug}: image file missing (${fn})`); imgMiss++; }
}
imgMiss || PASS(`every post has an image file present (${plan.length} in plan)`);
for (const e of plan) if (!e.alt || e.alt.trim() === '') WARN(`image ${e.slug}: empty alt text`);

section('Content — pages');
const need = ['home', 'about-kepoli', 'about-the-author', 'contact', 'privacy-policy', 'cookie-policy', 'advertising-and-consent', 'editorial-policy', 'terms-and-conditions', 'disclaimer'];
const pageSlugs = new Set(pages.map((p) => p.slug));
for (const s of need) pageSlugs.has(s) ? PASS(`page: ${s}`) : FAIL(`missing required page: ${s}`);
const privacy = pages.find((p) => p.slug === 'privacy-policy')?.content || '';
/adsense|google/i.test(privacy) ? PASS('privacy policy mentions Google/AdSense') : WARN('privacy policy does not mention Google/AdSense');
/opt out|aboutads|adssettings|google\.com\/settings\/ads/i.test(privacy) ? PASS('privacy policy has ad opt-out links') : WARN('privacy policy missing ad opt-out links');

section('Config — site profile');
profile?.brand?.name ? PASS(`brand: ${profile.brand.name}`) : FAIL('brand.name missing');
(profile?.locales?.public === 'en_US') ? PASS('locale en_US') : WARN(`locale = ${profile?.locales?.public}`);
profile?.writer?.name ? PASS(`author: ${profile.writer.name}`) : FAIL('writer.name missing');
(profile?.writer?.bio || '').length > 120 ? PASS('author bio is substantial') : WARN('author bio thin (E-E-A-T)');
const photo = profile?.writer?.photo || '';
photo && existsSync(join(ROOT, 'content/images', photo)) ? PASS(`author photo present (${photo})`) : WARN('author photo not set/missing (E-E-A-T)');
const social = profile?.writer?.social || {};
const socialSet = Object.values(social).filter((v) => String(v || '').trim() !== '');
socialSet.length ? PASS(`author social links set: ${socialSet.length}`) : WARN('no author social links (E-E-A-T sameAs empty)');

section('Infra — headers, mu-plugins, ads');
let conf = '';
try { conf = rd('docker/wordpress/fom-performance.conf'); } catch { FAIL('fom-performance.conf missing'); }
for (const h of ['X-Content-Type-Options', 'Referrer-Policy', 'X-Frame-Options', 'Permissions-Policy', 'Strict-Transport-Security']) {
  conf.includes(h) ? PASS(`header: ${h}`) : (h === 'Strict-Transport-Security' ? WARN(`header missing: ${h}`) : FAIL(`header missing: ${h}`));
}
for (const mu of ['fom-adtech.php', 'fom-schema.php', 'fom-autoseed.php', 'fom-newsletter.php']) {
  existsSync(join(ROOT, 'wp-content/mu-plugins', mu)) ? PASS(`mu-plugin: ${mu}`) : FAIL(`mu-plugin missing: ${mu}`);
}
let compose = '';
try { compose = rd('docker-compose.yml'); } catch {}
/ADSENSE_PUB_ID/.test(compose) ? PASS('compose wires ADSENSE_PUB_ID') : WARN('compose missing ADSENSE_PUB_ID');
existsSync(join(ROOT, 'wp-content/plugins/automation-hamri/wp-automator-pro.php')) ? PASS('automation-hamri plugin present') : FAIL('automation-hamri plugin missing');
existsSync(join(ROOT, 'wp-content/themes/viral-reader/style.css')) ? PASS('viral-reader theme present') : FAIL('viral-reader theme missing');

console.log(`\n======== ${passes} passed, ${warns} warnings, ${fails} failures ========`);
process.exit(fails ? 1 : 0);
