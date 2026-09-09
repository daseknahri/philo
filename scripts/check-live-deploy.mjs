#!/usr/bin/env node
// Verify a Coolify redeploy actually shipped the latest build.
//
//   node scripts/check-live-deploy.mjs https://ibnbatoutaweb.com     (or set SITE_URL)
//
// Compares the VENDORED theme version in this repo (VR_VERSION — what a redeploy SHOULD serve) to the version
// the LIVE site actually serves on its theme asset (viral-reader/assets/js/site.js?ver=<VR_VERSION>). If they
// match, production is serving this commit. Robust by design: a plain version string, so no cross-platform
// line-ending / content-hash fragility. Exit 0 = current, non-zero = stale (with a clear message).
//
// (Replaced the earlier seed-content fingerprint approach, which required a FOM_DEPLOY_FINGERPRINT meta
//  that nothing emitted and was sensitive to CRLF/LF differences between the dev checkout and the built image.)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const liveUrl = (process.argv[2] || process.env.SITE_URL || '').replace(/\/+$/, '');

function localThemeVersion() {
  // The theme is vendored into the site repo; VR_VERSION drives the asset cache-bust query string.
  const fnPath = path.join(repoRoot, 'wp-content', 'themes', 'viral-reader', 'functions.php');
  const src = fs.readFileSync(fnPath, 'utf8');
  const m = src.match(/VR_VERSION'\s*,\s*'([\d.]+)'/);
  if (!m) {
    throw new Error('Could not read VR_VERSION from wp-content/themes/viral-reader/functions.php.');
  }
  return m[1];
}

async function main() {
  if (!liveUrl) {
    throw new Error('Missing live URL. Pass a URL as the first argument or set SITE_URL.');
  }
  const expected = localThemeVersion();

  const response = await fetch(liveUrl, {
    headers: { 'user-agent': 'KepoliLiveDeployCheck/2.0' },
    redirect: 'follow',
  });
  if (!response.ok) {
    throw new Error(`Request failed for ${liveUrl}: ${response.status} ${response.statusText}`);
  }
  const html = await response.text();

  const m = html.match(/viral-reader\/assets\/js\/site\.js\?ver=([\d.]+)/);
  const live = m ? m[1] : '';

  console.log(`Live URL:    ${liveUrl}`);
  console.log(`Local theme: ${expected}`);
  console.log(`Live theme:  ${live || '(not found)'}`);

  if (!live) {
    throw new Error('Could not find the theme version on the live site (site.js?ver=). Is the viral-reader theme active?');
  }
  if (live !== expected) {
    throw new Error(`STALE: live theme ${live} != local ${expected}. The Coolify redeploy did not ship this commit — redeploy the kepoli app.`);
  }
  console.log('OK: the live site is serving this repo’s theme build.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
