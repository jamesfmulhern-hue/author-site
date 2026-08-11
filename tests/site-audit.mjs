#!/usr/bin/env node
/**
 * Site audit for authorjamesmulhern.com
 * ------------------------------------------------------------------
 * Guards against the regression classes we have actually hit on this
 * site, rather than generic lint noise:
 *
 *   horizontal-overflow   any page scrolling sideways at any width
 *   plaque-overflow       .deco-plaque nowrap labels bursting their box
 *   button-overflow       .btn corner brackets landing past the viewport
 *   price-wrap            four-figure rates wrapping or clipping
 *   wordmark-wrap         "JAMES MULHERN" breaking onto two lines
 *   heading-hierarchy     missing/duplicate h1, skipped levels, empties
 *   link-validity         dead internal links and dead #anchors
 *   image-alt             images with no alt attribute
 *   page-meta             missing or empty <title> / meta description
 *
 * Serves the site itself, so there is nothing to start beforehand.
 *
 * Usage:
 *   node tests/site-audit.mjs                      # all pages, standard widths
 *   node tests/site-audit.mjs --full               # all pages, every width
 *   node tests/site-audit.mjs --pages press-kit.html,services.html
 *   node tests/site-audit.mjs --external           # also check outbound links
 *   node tests/site-audit.mjs --json report.json   # machine-readable output
 *
 * Exit code 0 = clean, 1 = at least one failure.
 */

import { createServer } from 'node:http';
import { readFile, readdir, writeFile, access } from 'node:fs/promises';
import { join, extname, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ---------------------------------------------------------------- config

const STANDARD_WIDTHS = [320, 390, 560, 768, 1024, 1366, 1440, 1680, 1920];
const FULL_WIDTHS = [
  320, 360, 390, 414, 480, 560, 640, 768, 834, 1024,
  1200, 1280, 1366, 1440, 1520, 1600, 1680, 1792, 1920, 2560,
];

// Pages worth testing at every width even in the fast run. These are the
// ones a reviewer, bookseller or paying client is most likely to open.
const PRIORITY_PAGES = ['press-kit.html', 'services.html', 'index.html'];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.pdf': 'application/pdf', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
};

// ---------------------------------------------------------------- args

const argv = process.argv.slice(2);
const hasFlag = (f) => argv.includes(f);
const flagValue = (f) => {
  const i = argv.indexOf(f);
  return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : null;
};

const OPTS = {
  full: hasFlag('--full'),
  external: hasFlag('--external'),
  quiet: hasFlag('--quiet'),
  jsonPath: flagValue('--json'),
  pages: (flagValue('--pages') || '').split(',').map((s) => s.trim()).filter(Boolean),
};

const WIDTHS = OPTS.full ? FULL_WIDTHS : STANDARD_WIDTHS;

// ---------------------------------------------------------------- output

const C = process.stdout.isTTY
  ? { red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', dim: '\x1b[2m', bold: '\x1b[1m', off: '\x1b[0m' }
  : { red: '', green: '', yellow: '', dim: '', bold: '', off: '' };

const findings = [];
const record = (level, check, page, detail, width = null) =>
  findings.push({ level, check, page, detail, width });
const fail = (...a) => record('fail', ...a);
const warn = (...a) => record('warn', ...a);

const say = (s = '') => { if (!OPTS.quiet) console.log(s); };

// ---------------------------------------------------------------- server

async function startServer() {
  const server = createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const abs = join(ROOT, p);
      if (!abs.startsWith(ROOT)) { res.writeHead(403).end(); return; }
      const body = await readFile(abs);
      res.writeHead(200, { 'Content-Type': MIME[extname(abs).toLowerCase()] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('404');
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { server, port: server.address().port };
}

// ---------------------------------------------------------------- static checks

async function exists(rel) {
  try { await access(join(ROOT, rel)); return true; } catch { return false; }
}

async function staticChecks(pages) {
  const allHtml = new Set(await listHtml());

  for (const page of pages) {
    const html = await readFile(join(ROOT, page), 'utf8');

    // --- page meta
    const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
    if (!title || !title[1].trim()) fail('page-meta', page, 'missing or empty <title>');
    // Match to the *same* quote that opened the attribute. Using [^"']* here
    // would stop dead at the apostrophe in content like "A writer's credo".
    const desc = /<meta\s+name=(["'])description\1\s+content=(["'])([\s\S]*?)\2/i.exec(html);
    if (!desc) fail('page-meta', page, 'no meta description');
    else if (desc[3].trim().length < 50) {
      fail('page-meta', page, `meta description only ${desc[3].trim().length} chars (aim for 50-160)`);
    }

    // --- image alt
    for (const tag of html.match(/<img[^>]*>/gi) || []) {
      if (!/\balt=/i.test(tag)) fail('image-alt', page, `img without alt: ${tag.slice(0, 90)}`);
    }

    // --- internal links and assets
    const refs = [];
    for (const m of html.matchAll(/\b(?:href|src)=(["'])([\s\S]*?)\1/gi)) refs.push(m[2]);

    for (const ref of refs) {
      if (/^(https?:|mailto:|tel:|javascript:|data:|#)/i.test(ref)) continue;
      const clean = ref.split('#')[0].split('?')[0].replace(/^\.\//, '').replace(/^\//, '');
      if (!clean) continue;
      if (clean.endsWith('.html')) {
        if (!allHtml.has(clean)) fail('link-validity', page, `dead internal link -> ${ref}`);
      } else if (!(await exists(clean))) {
        fail('link-validity', page, `missing asset -> ${ref}`);
      }
    }

    // --- same-page anchors
    const ids = new Set();
    for (const m of html.matchAll(/\sid=(["'])([\s\S]*?)\1/gi)) ids.add(m[2]);
    for (const ref of refs) {
      if (!ref.startsWith('#')) continue;
      const id = ref.slice(1);
      if (id && id !== 'top' && !ids.has(id)) {
        fail('link-validity', page, `dead anchor -> #${id}`);
      }
    }
  }
}

async function listHtml() {
  return (await readdir(ROOT)).filter((f) => f.endsWith('.html')).sort();
}

// ---------------------------------------------------------------- browser checks

/** Runs inside the page. Returns structured findings for one width. */
function inPageAudit(viewportWidth) {
  const out = { overflow: 0, offenders: [], plaque: [], button: [], price: [], wordmark: null };
  const de = document.documentElement;
  out.overflow = de.scrollWidth - de.clientWidth;

  if (out.overflow > 1) {
    const seen = [];
    document.querySelectorAll('body *').forEach((el) => {
      const b = el.getBoundingClientRect();
      if (b.width > 0 && b.right > viewportWidth + 0.5) {
        seen.push({
          sel: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).trim().split(/\s+/)[0] : ''),
          over: Math.round(b.right - viewportWidth),
          width: Math.round(b.width),
          text: (el.textContent || '').trim().slice(0, 45),
        });
      }
    });
    seen.sort((a, b) => b.over - a.over);
    out.offenders = seen.slice(0, 3);
  }

  // Deco plaques must stay inside the viewport. They are deliberately
  // wider than their text column at desktop sizes - that bleed is the
  // design - so only a break past the viewport edge counts as a fault.
  document.querySelectorAll('.deco-plaque').forEach((el) => {
    const b = el.getBoundingClientRect();
    if (b.right > viewportWidth + 0.5 || b.left < -0.5) {
      out.plaque.push({
        reason: b.left < -0.5 ? 'breaks past left edge' : 'breaks past right edge',
        over: Math.round(Math.max(b.right - viewportWidth, -b.left)),
        text: (el.textContent || '').trim().slice(0, 45),
      });
    }
  });

  // Buttons: the Deco corner brackets are drawn outside the border box,
  // so account for their negative offsets before comparing to the viewport.
  document.querySelectorAll('.btn').forEach((el) => {
    const b = el.getBoundingClientRect();
    if (b.width === 0) return;
    let bleed = 0;
    for (const pseudo of ['::before', '::after']) {
      const cs = getComputedStyle(el, pseudo);
      if (!cs || cs.content === 'none') continue;
      const r = parseFloat(cs.right);
      if (!Number.isNaN(r) && r < 0) bleed = Math.max(bleed, -r);
    }
    const effectiveRight = b.right + bleed;
    if (effectiveRight > viewportWidth + 0.5) {
      out.button.push({
        over: Math.round(effectiveRight - viewportWidth),
        bleed,
        text: (el.textContent || '').trim().slice(0, 40),
      });
    }
  });

  // Rates must never wrap or clip - a wrapped "$1,450" reads as two numbers.
  document.querySelectorAll('.rate-amount').forEach((el) => {
    const cs = getComputedStyle(el);
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.1;
    const b = el.getBoundingClientRect();
    const txt = (el.textContent || '').trim();
    if (b.height > lh * 1.55) out.price.push({ text: txt, reason: 'wraps to two lines' });
    else if (el.scrollWidth > el.clientWidth + 1) {
      out.price.push({ text: txt, reason: `clipped (needs ${el.scrollWidth}px, has ${el.clientWidth}px)` });
    }
  });

  // Wordmark stays on one line wherever the desktop menu is shown.
  const mark = document.querySelector('.brand span');
  if (mark && viewportWidth >= 1361) {
    const cs = getComputedStyle(mark);
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
    const lines = Math.round((mark.getBoundingClientRect().height / lh) * 10) / 10;
    if (lines > 1.2) out.wordmark = lines;
  }

  return out;
}

/** Heading structure, checked once per page at a desktop width. */
function inPageHeadings() {
  const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => ({
    level: Number(h.tagName[1]),
    text: (h.textContent || '').trim(),
  }));
  const errors = [];
  const warnings = [];
  const h1s = hs.filter((h) => h.level === 1);
  if (h1s.length === 0) errors.push('no <h1>');
  if (h1s.length > 1) errors.push(`${h1s.length} <h1> elements (expected exactly 1)`);
  hs.forEach((h, i) => {
    if (!h.text) errors.push(`empty <h${h.level}> at position ${i + 1}`);
  });
  // A skipped level is a soft accessibility issue, not a broken page, so it
  // warns rather than failing the build. On this site the Deco plaques carry
  // the visual section label, which legitimately leaves gaps in the outline.
  let prev = 0;
  for (const h of hs) {
    if (prev && h.level > prev + 1) {
      warnings.push(`skipped level: <h${prev}> jumps to <h${h.level}> ("${h.text.slice(0, 40)}")`);
    }
    prev = h.level;
  }
  return { errors, warnings };
}

// ---------------------------------------------------------------- external links

async function checkExternal(pages) {
  const urls = new Set();
  for (const page of pages) {
    const html = await readFile(join(ROOT, page), 'utf8');
    for (const m of html.matchAll(/\bhref=(["'])(https?:\/\/[\s\S]*?)\1/gi)) urls.add(m[2]);
  }
  say(`${C.dim}  checking ${urls.size} outbound links...${C.off}`);
  // 403/429/503 are bot-blocking (Amazon, JSTOR, publishers), not breakage.
  const BLOCKED = new Set([401, 403, 405, 429, 503]);
  for (const url of urls) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);
      let res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: ctrl.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36' } });
      if (res.status === 404 || res.status === 405) {
        res = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctrl.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36' } });
      }
      clearTimeout(t);
      if (res.status >= 400 && !BLOCKED.has(res.status)) {
        fail('external-link', '(site)', `HTTP ${res.status} -> ${url}`);
      } else if (BLOCKED.has(res.status)) {
        warn('external-link', '(site)', `HTTP ${res.status} (bot-blocked, likely fine) -> ${url}`);
      }
    } catch (e) {
      warn('external-link', '(site)', `unreachable from CI (${e.name}) -> ${url}`);
    }
  }
}

// ---------------------------------------------------------------- main

async function main() {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    console.error(`${C.red}Playwright is not installed.${C.off}\n  cd tests && npm install && npx playwright install chromium`);
    process.exit(2);
  }

  const allPages = await listHtml();
  const pages = OPTS.pages.length ? OPTS.pages : allPages;

  for (const p of pages) {
    if (!allPages.includes(p)) {
      console.error(`${C.red}No such page: ${p}${C.off}`);
      process.exit(2);
    }
  }

  say(`${C.bold}Site audit${C.off} ${C.dim}- ${pages.length} page(s), ${WIDTHS.length} widths${C.off}`);
  say(`${C.dim}  widths: ${WIDTHS.join(', ')}${C.off}\n`);

  say(`${C.dim}Static checks...${C.off}`);
  await staticChecks(pages);

  if (OPTS.external) await checkExternal(pages);

  const { server, port } = await startServer();
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const base = `http://127.0.0.1:${port}/`;

  // Heading hierarchy once per page.
  say(`${C.dim}Heading hierarchy...${C.off}`);
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const p of pages) {
    await page.goto(base + p, { waitUntil: 'domcontentloaded' });
    const h = await page.evaluate(inPageHeadings);
    for (const problem of h.errors) fail('heading-hierarchy', p, problem);
    for (const problem of h.warnings) warn('heading-hierarchy', p, problem);
  }

  // Responsive sweep.
  say(`${C.dim}Responsive sweep...${C.off}`);
  let checks = 0;
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 900 });
    for (const p of pages) {
      // In the fast run, non-priority pages skip the widest desktop sizes.
      if (!OPTS.full && w > 1440 && !PRIORITY_PAGES.includes(p)) continue;
      await page.goto(base + p, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(60);
      const r = await page.evaluate(inPageAudit, w);
      checks++;

      if (r.overflow > 1) {
        const who = r.offenders.length
          ? r.offenders.map((o) => `${o.sel} (+${o.over}px, "${o.text}")`).join('; ')
          : 'no single element identified - likely a pseudo-element or negative margin';
        fail('horizontal-overflow', p, `page scrolls ${r.overflow}px sideways | ${who}`, w);
      }
      for (const x of r.plaque) fail('plaque-overflow', p, `plaque ${x.reason} by ${x.over}px ("${x.text}")`, w);
      for (const x of r.button) fail('button-overflow', p, `button + ${x.bleed}px bracket lands ${x.over}px past viewport ("${x.text}")`, w);
      for (const x of r.price) fail('price-wrap', p, `rate "${x.text}" ${x.reason}`, w);
      if (r.wordmark) fail('wordmark-wrap', p, `wordmark on ${r.wordmark} lines`, w);
    }
  }

  await browser.close();
  server.close();

  // ------------------------------------------------------------ report
  const fails = findings.filter((f) => f.level === 'fail');
  const warns = findings.filter((f) => f.level === 'warn');

  say('');
  if (!fails.length && !warns.length) {
    say(`${C.green}${C.bold}PASS${C.off} - ${checks} responsive checks, ${pages.length} pages, no issues.`);
  } else {
    const byCheck = new Map();
    for (const f of findings) {
      if (!byCheck.has(f.check)) byCheck.set(f.check, []);
      byCheck.get(f.check).push(f);
    }
    for (const [check, items] of [...byCheck].sort()) {
      const bad = items.filter((i) => i.level === 'fail').length;
      const head = bad ? `${C.red}FAIL${C.off}` : `${C.yellow}WARN${C.off}`;
      say(`${head} ${C.bold}${check}${C.off} ${C.dim}(${items.length})${C.off}`);
      for (const i of items.slice(0, 12)) {
        const at = i.width ? ` ${C.dim}@${i.width}px${C.off}` : '';
        say(`     ${i.page}${at}  ${i.detail}`);
      }
      if (items.length > 12) say(`     ${C.dim}...and ${items.length - 12} more${C.off}`);
    }
    say('');
    say(`${fails.length ? C.red + C.bold + 'FAILED' : C.yellow + C.bold + 'PASSED WITH WARNINGS'}${C.off}` +
        ` - ${fails.length} failure(s), ${warns.length} warning(s) across ${checks} responsive checks.`);
  }

  if (OPTS.jsonPath) {
    await writeFile(OPTS.jsonPath, JSON.stringify({
      generatedAt: new Date().toISOString(),
      pages, widths: WIDTHS, responsiveChecks: checks,
      failures: fails, warnings: warns,
    }, null, 2));
    say(`${C.dim}JSON written to ${OPTS.jsonPath}${C.off}`);
  }

  process.exit(fails.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
