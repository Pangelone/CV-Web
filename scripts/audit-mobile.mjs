import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';

const DIST = resolve('dist'), PORT = 4466;
const MIME={'.html':'text/html;charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.ico':'image/x-icon','.json':'application/json','.webmanifest':'application/manifest+json'};
const server = createServer(async (req,res)=>{try{let p=new URL(req.url,'http://x').pathname;if(p.endsWith('/'))p+='index.html';if(!extname(p))p+='/index.html';const b=await readFile(join(DIST,p));res.writeHead(200,{'content-type':MIME[extname(p)]??'application/octet-stream'});res.end(b);}catch{res.writeHead(404).end('nf');}});
await new Promise(ok=>server.listen(PORT,ok));

const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());

for (const w of [320, 375, 414]) {
  const page = await browser.newPage({
    viewport: { width: w, height: 780 }, deviceScaleFactor: 2,
    isMobile: true, hasTouch: true, locale: 'en-US',
  });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.querySelectorAll('.reveal').forEach((e) => e.classList.add('is-in')));
  await page.waitForTimeout(400);

  const report = await page.evaluate((vw) => {
    const out = { hScroll: document.documentElement.scrollWidth > vw + 1, scrollWidth: document.documentElement.scrollWidth, wide: [], tiny: [] };
    document.querySelectorAll('body *').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > vw + 2 && r.height > 0) {
        const id = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0,2).join('.') : '');
        if (!out.wide.some((x) => x.sel === id)) out.wide.push({ sel: id, w: Math.round(r.width) });
      }
    });
    // Interactive targets under the 44px recommendation
    document.querySelectorAll('a, button').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      if (r.height < 32 || r.width < 32) {
        const id = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : '');
        if (!out.tiny.some((x) => x.sel === id)) out.tiny.push({ sel: id, w: Math.round(r.width), h: Math.round(r.height) });
      }
    });
    return out;
  }, w);

  console.log(`\n── ${w}px ──`);
  console.log('  horizontal scroll:', report.hScroll ? `YES (${report.scrollWidth}px)` : 'no');
  console.log('  elements wider than viewport:', report.wide.length ? report.wide.slice(0, 8) : 'none');
  console.log('  tap targets under 32px:', report.tiny.length ? report.tiny.slice(0, 8) : 'none');

  // Does the fixed chrome collide with hero content?
  const collide = await page.evaluate(() => {
    const a = document.querySelector('.actions')?.getBoundingClientRect();
    const n = document.querySelector('.hero__name')?.getBoundingClientRect();
    const t = document.querySelector('.nav-toggle')?.getBoundingClientRect();
    const hit = (x, y) => x && y && !(x.right < y.left || x.left > y.right || x.bottom < y.top || x.top > y.bottom);
    return { actionsOverHeroName: hit(a, n), toggleOverActions: hit(t, a), actionsW: a && Math.round(a.width), toggleW: t && Math.round(t.width) };
  });
  console.log('  fixed chrome collisions:', JSON.stringify(collide));

  await page.close();
}
await browser.close(); server.close();
