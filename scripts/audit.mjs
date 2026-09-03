import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';

const DIST = resolve('dist');
const PORT = 4444;
const MIME = { '.html':'text/html;charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.ico':'image/x-icon', '.xml':'application/xml', '.json':'application/json', '.pdf':'application/pdf', '.webmanifest':'application/manifest+json', '.txt':'text/plain' };

const server = createServer(async (req, res) => {
  try {
    let path = new URL(req.url, 'http://x').pathname;
    if (path.endsWith('/')) path += 'index.html';
    if (!extname(path)) path += '/index.html';
    const body = await readFile(join(DIST, path));
    res.writeHead(200, { 'content-type': MIME[extname(path)] ?? 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404).end('nf'); }
});
await new Promise((ok) => server.listen(PORT, ok));

const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'en-US' });

let bytes = 0;
const byType = {};
page.on('response', async (r) => {
  try {
    const len = Number(r.headers()['content-length'] ?? (await r.body()).length);
    const type = (r.headers()['content-type'] ?? '?').split(';')[0];
    bytes += len; byType[type] = (byType[type] ?? 0) + len;
  } catch {}
});

const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });

console.log('── First load (desktop, no lazy images below the fold) ──');
console.log('  total:', Math.round(bytes / 1024), 'KB');
for (const [t, b] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
  console.log(`   ${String(Math.round(b / 1024)).padStart(5)} KB  ${t}`);
}
console.log('  JS console errors:', errors.length ? errors : 'none');

console.log('\n── Head sanity ──');
const head = await page.evaluate(() => ({
  title: document.title,
  canonical: document.querySelector('link[rel=canonical]')?.href,
  hreflang: [...document.querySelectorAll('link[rel=alternate][hreflang]')].map((l) => `${l.hreflang}→${l.getAttribute('href')}`),
  og: document.querySelector('meta[property="og:image"]')?.content,
  desc: document.querySelector('meta[name=description]')?.content?.slice(0, 70) + '…',
  jsonld: !!document.querySelector('script[type="application/ld+json"]'),
  h1: [...document.querySelectorAll('h1')].map((h) => h.textContent.trim()),
  imgNoAlt: [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).length,
  words: document.body.innerText.trim().split(/\s+/).length,
}));
for (const [k, v] of Object.entries(head)) console.log(' ', k + ':', Array.isArray(v) ? v.join(' | ') : v);

console.log('\n── Behaviour ──');
const acc = await page.evaluate(async () => {
  const btn = document.getElementById('earlier-toggle');
  const panel = document.getElementById('earlier-panel');
  const before = panel.getBoundingClientRect().height;
  btn.click();
  await new Promise((r) => setTimeout(r, 600));
  return { before: Math.round(before), after: Math.round(panel.getBoundingClientRect().height), expanded: btn.getAttribute('aria-expanded') };
});
console.log('  earlier-career accordion:', JSON.stringify(acc));

const hidden = await page.evaluate(() => [...document.querySelectorAll('.reveal')].filter((e) => getComputedStyle(e).opacity === '0').length);
console.log('  still-invisible reveal blocks:', hidden);

const todos = await page.evaluate(() => (document.body.innerText.match(/TODO_PABLO[^\n]*/g) || []));
console.log('  TODO_PABLO markers on page:', todos.length ? todos : 'none');

for (const path of ['/es', '/pt', '/sitemap.xml', '/robots.txt', '/site.webmanifest', '/cv/CV-Pablo-Angelone-EN.pdf', '/og/og-en.png', '/404']) {
  const r = await page.request.get(`http://localhost:${PORT}${path}`);
  console.log(`  ${String(r.status()).padEnd(4)} ${path}`);
}

await browser.close(); server.close();
