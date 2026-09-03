/**
 * Rewrites the source PNGs into web-sized WebP + PNG and builds the icon set.
 * The originals were 200 KB – 1.4 MB each, which is the whole LCP budget on
 * the mobile screen where recruiters actually open the page.
 */
import sharp from 'sharp';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const kb = (n) => `${Math.round(n / 1024)} KB`;

async function emit(src, out, { width, height, fit = 'cover', position = 'center', quality = 82 }) {
  if (!existsSync(src)) return console.log('  ! missing', src);
  const before = (await stat(src)).size;
  let img = sharp(src).resize({ width, height, fit, position, withoutEnlargement: true });
  if (out.endsWith('.webp')) img = img.webp({ quality });
  else img = img.png({ quality, compressionLevel: 9, palette: true });
  await img.toFile(out);
  const after = (await stat(out)).size;
  console.log(`  ${out.replace('public/', '')}  ${kb(before)} → ${kb(after)}`);
}

console.log('Photos');
// Hero portrait: rendered at most 300 CSS px, so 2x is 600.
await emit('assets/source/me.png', 'public/img/me-600.webp', { width: 600, height: 600, position: 'top' });
await emit('assets/source/me.png', 'public/img/me-600.png',  { width: 600, height: 600, position: 'top' });
// CV portrait: 23 mm at 300 dpi ≈ 280 px.
await emit('assets/source/me.png', 'public/img/me-cv.png', { width: 320, height: 320, position: 'top' });

console.log('Portfolio');
for (const name of ['hausefy', 'mottorfy', 'syncta', 'hst', 'kin', 'shipit', 'sagrada', 'orbital']) {
  await emit(`assets/source/captures/${name}.png`, `public/img/pf/${name}.webp`, { width: 880, height: 550, fit: 'cover', position: 'top', quality: 78 });
  await emit(`assets/source/captures/${name}.png`, `public/img/pf/${name}.png`,  { width: 880, height: 550, fit: 'cover', position: 'top' });
}

console.log('Icons');
const svg = await readFile('public/favicon.svg');
for (const size of [32, 180, 192, 512]) {
  const out = size === 180 ? 'public/apple-touch-icon.png' : `public/icon-${size}.png`;
  await sharp(svg, { density: 384 }).resize(size, size).png().toFile(out);
  console.log(`  ${out.replace('public/', '')}  ${size}×${size}`);
}
// A 32px PNG renamed .ico is understood by every browser that still asks for one.
await writeFile('public/favicon.ico', await sharp(svg, { density: 384 }).resize(32, 32).png().toBuffer());
console.log('  favicon.ico  32×32');

