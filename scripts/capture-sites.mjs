/**
 * One-off helper: grabs a consistent 1280×800 shot of each portfolio site so
 * the cards share framing instead of mixing logos, banners and crops.
 * Output is committed to assets/source/captures and then optimised — the build
 * never depends on third-party sites being up.
 */
import { chromium } from 'playwright';

const TARGETS = [
  { id: 'syncta',  url: 'https://syncta.com' },
  { id: 'hst',     url: 'https://www.hstpathways.com' },
  { id: 'kin',     url: 'https://www.kin.com' },
  { id: 'shipit',  url: 'https://www.shipit.cl' },
  { id: 'sagrada', url: 'https://sagradapalabra.com' },
  { id: 'hausefy', url: 'https://hausefy.com' },
  { id: 'orbital', url: 'https://orbitalabworks.com' },
];

const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1.5,
  locale: 'en-US',
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
});

for (const t of TARGETS) {
  const page = await ctx.newPage();
  try {
    await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(3500);

    // Best-effort dismissal of consent banners so they don't end up in the shot
    for (const label of [/accept/i, /aceptar/i, /got it/i, /entendido/i, /agree/i, /allow all/i]) {
      const btn = page.getByRole('button', { name: label }).first();
      if (await btn.count().catch(() => 0)) {
        await btn.click({ timeout: 1500 }).catch(() => {});
        await page.waitForTimeout(600);
      }
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(800);
    await page.screenshot({ path: `assets/source/captures/${t.id}.png` });
    console.log('  ok    ', t.id);
  } catch (e) {
    console.log('  FAILED', t.id, '-', e.message.split('\n')[0]);
  }
  await page.close();
}

await browser.close();
