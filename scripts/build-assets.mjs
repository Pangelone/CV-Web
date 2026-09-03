/**
 * Post-build step: turns the /cv/<lang>/ and /og/<lang>/ routes in dist/ into
 * the downloadable PDFs and the Open Graph images.
 *
 * Why not html2pdf in the browser: that rasterises the page into a canvas, so
 * the resulting PDF has zero selectable text and no ATS can parse it. Printing
 * the page with a real browser engine keeps the text, the links and the
 * document outline intact.
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import { createServer } from 'node:http';
import { readFile, mkdir, stat, copyFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';

const DIST = resolve('dist');
/* The PDFs are also written into public/ so `astro dev` serves them: the dev
   server never runs this script, and a dead Download-CV button in local is
   worse than a couple of generated files sitting in public/ (gitignored). */
const PUBLIC_CV = resolve('public/cv');
const LANGS = ['en', 'es', 'pt', 'it', 'fr'];
const PORT = Number(process.env.PDF_PORT ?? 4399);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

/** Minimal static server over dist/ — the PDF must render the real build. */
function serve() {
  const server = createServer(async (req, res) => {
    try {
      let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (path.endsWith('/')) path += 'index.html';
      const file = join(DIST, path);
      if (!file.startsWith(DIST)) throw new Error('escape');
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  return new Promise((ok) => server.listen(PORT, () => ok(server)));
}

async function launch() {
  try { return await chromium.launch({ channel: 'chrome' }); }
  catch { return await chromium.launch(); }
}

const server = await serve();
const browser = await launch();
await mkdir(join(DIST, 'cv'), { recursive: true });
await mkdir(join(DIST, 'og'), { recursive: true });
await mkdir(PUBLIC_CV, { recursive: true });

console.log('CV PDFs');
for (const lang of LANGS) {
  const page = await browser.newPage();
  const url = `http://localhost:${PORT}/cv/${lang}/`;
  await page.goto(url, { waitUntil: 'networkidle' });
  // Webfonts must be ready or the layout shifts between measure and print.
  await page.evaluate(() => document.fonts.ready);

  const out = join(DIST, 'cv', `CV-Pablo-Angelone-${lang.toUpperCase()}.pdf`);
  await page.pdf({
    path: out,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: `
      <div style="width:100%;padding:0 13mm;font-family:Helvetica,Arial,sans-serif;font-size:7pt;color:#9AA3B0;display:flex;justify-content:space-between;">
        <span>Pablo Angelone — pabloangelone.com</span>
        <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
      </div>`,
    margin: { top: '10mm', bottom: '12mm', left: '0', right: '0' },
  });

  await copyFile(out, join(PUBLIC_CV, `CV-Pablo-Angelone-${lang.toUpperCase()}.pdf`));

  const { size } = await stat(out);
  console.log(`  cv/CV-Pablo-Angelone-${lang.toUpperCase()}.pdf  (${Math.round(size / 1024)} KB)`);
  await page.close();
}

console.log('Open Graph images');
for (const lang of LANGS) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/og/${lang}/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const out = join(DIST, 'og', `og-${lang}.png`);
  const raw = await page.screenshot({ clip: { x: 0, y: 0, width: 1200, height: 630 } });
  // A raw screenshot lands around 500 KB; social scrapers reject slow images.
  await sharp(raw).png({ quality: 82, compressionLevel: 9, palette: true }).toFile(out);

  const { size } = await stat(out);
  console.log(`  og/og-${lang}.png  (${Math.round(size / 1024)} KB)`);
  await page.close();
}

await browser.close();
server.close();
console.log('Build assets done.');
