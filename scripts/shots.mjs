import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = process.env.SHOT_DIR;
const BASE = process.env.BASE ?? 'http://localhost:4321';
const LANG = process.env.LANG_PATH ?? '/';
const TAG = process.env.TAG ?? 'en';
const WIDTH = Number(process.env.WIDTH ?? 1440);
const MOBILE = process.env.MOBILE === '1';
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;

mkdirSync(OUT, { recursive: true });

async function launch() {
  try { return await chromium.launch({ channel: 'chrome' }); }
  catch { return await chromium.launch(); }
}

const browser = await launch();
const page = await browser.newPage({
  viewport: { width: WIDTH, height: MOBILE ? 812 : 900 },
  deviceScaleFactor: 1.5,
  locale: process.env.LOCALE ?? 'en-US',
  isMobile: MOBILE,
  hasTouch: MOBILE,
});

await page.goto(BASE + LANG, { waitUntil: 'networkidle' });

// Settle every reveal before capturing
await page.evaluate(() => {
  document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-in'));
  window.scrollTo(0, 0);
});
await page.waitForTimeout(700);

if (process.env.HIDE_CHROME !== '0') {
  await page.addStyleTag({ content: '.actions,.rail,.nav-toggle,.wa{visibility:hidden !important}' });
}

const sections = ['top', 'about', 'experience', 'ventures', 'skills', 'portfolio', 'education', 'working', 'contact'];
for (const id of sections) {
  if (ONLY && !ONLY.includes(id)) continue;
  const el = page.locator(`#${id}`);
  if (!(await el.count())) continue;
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(220);
  // Let lazy images finish decoding before the shot
  await page.evaluate(() => Promise.all(
    [...document.images].filter((i) => !i.complete).map((i) => i.decode().catch(() => {}))
  ));
  await page.waitForTimeout(350);
  await el.screenshot({ path: `${OUT}/${TAG}-${WIDTH}-${id}.png` }).catch((e) => console.log('skip', id, e.message));
  console.log('shot:', `${TAG}-${WIDTH}-${id}`);
}

await browser.close();
