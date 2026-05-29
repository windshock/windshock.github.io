#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { createSign } from 'node:crypto';

const SITE_ORIGIN = 'https://windshock.github.io';
const ROOT_SITEMAP_URL = `${SITE_ORIGIN}/sitemap.xml`;
const DEFAULT_GSC_SITE_URL = `${SITE_ORIGIN}/`;
const DEFAULT_INDEXNOW_KEY = 'fa6713893a1940afbc8de8beed71690f';
const WEBMASTERS_SCOPE = 'https://www.googleapis.com/auth/webmasters';

const docsRootSitemap = 'docs/sitemap.xml';
const languageSitemaps = ['docs/en/sitemap.xml', 'docs/ko/sitemap.xml'];

main(process.argv.slice(2)).catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
});

async function main(argv) {
  const args = parseArgs(argv);
  const days = args.days ?? readPositiveNumber(process.env.INDEXNOW_DAYS, 7, 'INDEXNOW_DAYS');
  const dryRun = args.dryRun;

  await assertReadable(docsRootSitemap);

  const recentUrls = await collectRecentPostUrls(languageSitemaps, days);
  const gscEndpoint = buildGscEndpoint(process.env.GSC_SITE_URL || DEFAULT_GSC_SITE_URL, ROOT_SITEMAP_URL);

  console.log(`Root sitemap: ${ROOT_SITEMAP_URL}`);
  console.log(`IndexNow window: last ${days} day(s)`);

  if (dryRun) {
    console.log('[dry-run] GSC endpoint:');
    console.log(`  PUT ${gscEndpoint}`);
    if (!process.env.GSC_SITE_URL) {
      console.log(`  note: GSC_SITE_URL not set; dry-run used ${DEFAULT_GSC_SITE_URL}`);
    }
    console.log(`[dry-run] IndexNow URL count: ${recentUrls.length}`);
    recentUrls.forEach((url) => console.log(`  ${url}`));
    return;
  }

  let failures = 0;

  try {
    await submitToGsc(gscEndpoint);
  } catch (error) {
    failures += 1;
    console.error(`GSC submission failed: ${error.message}`);
  }

  try {
    await submitToIndexNow(recentUrls);
  } catch (error) {
    failures += 1;
    console.error(`IndexNow submission failed: ${error.message}`);
  }

  if (failures > 0) {
    process.exitCode = 1;
  }
}

function parseArgs(argv) {
  const parsed = { dryRun: false, days: null };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--dry-run') {
      parsed.dryRun = true;
      continue;
    }

    if (arg === '--days') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('--days requires a positive number');
      }
      parsed.days = readPositiveNumber(value, null, '--days');
      index += 1;
      continue;
    }

    if (arg === '-h' || arg === '--help') {
      printHelp();
      process.exit(0);
    }

    throw new Error(`unknown argument: ${arg}`);
  }

  return parsed;
}

function printHelp() {
  console.log(`Usage:
  node scripts/submit-sitemaps.mjs [--dry-run] [--days N]

Environment:
  GSC_SITE_URL                 Search Console property, e.g. https://windshock.github.io/ or sc-domain:windshock.github.io
  GSC_ACCESS_TOKEN             OAuth access token from an existing Search Console owner account
  GSC_SERVICE_ACCOUNT_JSON     Inline service account JSON
  GSC_SERVICE_ACCOUNT_FILE     Path to service account JSON file
  INDEXNOW_KEY                 Optional IndexNow key override
  INDEXNOW_DAYS                Optional recent-url window, default 7`);
}

function readPositiveNumber(value, fallback, label) {
  if (value === undefined || value === null || value === '') {
    if (fallback !== null) {
      return fallback;
    }
    throw new Error(`${label} requires a positive number`);
  }

  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    throw new Error(`${label} requires a positive number`);
  }

  return numberValue;
}

async function assertReadable(path) {
  try {
    await readFile(path, 'utf8');
  } catch (error) {
    throw new Error(`cannot read ${path}; build the site to docs/ first`);
  }
}

async function collectRecentPostUrls(paths, windowDays) {
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const urls = [];

  for (const path of paths) {
    const xml = await readFile(path, 'utf8');
    for (const entry of parseUrlset(xml)) {
      if (!entry.loc || !entry.lastmod || !isPostUrl(entry.loc)) {
        continue;
      }

      const lastmod = Date.parse(entry.lastmod);
      if (Number.isNaN(lastmod) || lastmod < cutoff) {
        continue;
      }

      urls.push(entry.loc);
    }
  }

  return [...new Set(urls)].sort();
}

function parseUrlset(xml) {
  const entries = [];
  const urlBlocks = xml.matchAll(/<url>([\s\S]*?)<\/url>/g);

  for (const match of urlBlocks) {
    const block = match[1];
    entries.push({
      loc: xmlUnescape(readXmlText(block, 'loc')),
      lastmod: xmlUnescape(readXmlText(block, 'lastmod')),
    });
  }

  return entries;
}

function readXmlText(block, tag) {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return match ? match[1].trim() : '';
}

function xmlUnescape(value) {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&');
}

function isPostUrl(value) {
  try {
    const url = new URL(value);
    return url.origin === SITE_ORIGIN && /^\/(en|ko)\/post\/.+\/$/.test(url.pathname);
  } catch {
    return false;
  }
}

function buildGscEndpoint(siteUrl, feedpath) {
  return `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(feedpath)}`;
}

async function submitToGsc(endpoint) {
  if (!process.env.GSC_SITE_URL) {
    console.warn('Skipping GSC: GSC_SITE_URL is not set.');
    return;
  }

  const accessToken = await getGscAccessToken();
  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  console.log('Submitted root sitemap to Google Search Console.');
}

async function getGscAccessToken() {
  const directToken = process.env.GSC_ACCESS_TOKEN;
  if (directToken) {
    return directToken;
  }

  const serviceAccount = await readServiceAccount();
  if (!serviceAccount) {
    throw new Error('set GSC_ACCESS_TOKEN, GSC_SERVICE_ACCOUNT_JSON, or GSC_SERVICE_ACCOUNT_FILE');
  }

  return getGoogleAccessToken(serviceAccount);
}

async function readServiceAccount() {
  const inlineJson = process.env.GSC_SERVICE_ACCOUNT_JSON;
  if (inlineJson) {
    return parseServiceAccount(inlineJson, 'GSC_SERVICE_ACCOUNT_JSON');
  }

  const filePath = process.env.GSC_SERVICE_ACCOUNT_FILE;
  if (!filePath) {
    return null;
  }

  return parseServiceAccount(await readFile(filePath, 'utf8'), filePath);
}

function parseServiceAccount(json, label) {
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    throw new Error(`invalid service account JSON in ${label}`);
  }

  if (!parsed.client_email || !parsed.private_key) {
    throw new Error(`service account JSON in ${label} must include client_email and private_key`);
  }

  return parsed;
}

async function getGoogleAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const assertion = signJwt(serviceAccount.private_key, {
    iss: serviceAccount.client_email,
    scope: WEBMASTERS_SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    throw new Error(`token request failed: HTTP ${response.status} ${JSON.stringify(payload)}`);
  }

  return payload.access_token;
}

function signJwt(privateKey, claims) {
  const header = base64UrlJson({ alg: 'RS256', typ: 'JWT' });
  const payload = base64UrlJson(claims);
  const unsigned = `${header}.${payload}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(privateKey).toString('base64url');
  return `${unsigned}.${signature}`;
}

function base64UrlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

async function submitToIndexNow(urls) {
  if (urls.length === 0) {
    console.log('Skipping IndexNow: no recently changed post URLs.');
    return;
  }

  const key = process.env.INDEXNOW_KEY || DEFAULT_INDEXNOW_KEY;
  const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      host: new URL(SITE_ORIGIN).hostname,
      key,
      keyLocation: `${SITE_ORIGIN}/${key}.txt`,
      urlList: urls,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  console.log(`Submitted ${urls.length} URL(s) to IndexNow.`);
}
