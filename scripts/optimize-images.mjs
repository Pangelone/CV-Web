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

/* ── Mottorfy has no public site yet, so its card gets a designed cover
      rather than a missing image. Swap in a real screenshot when it ships. */
console.log('Generated covers');
const cover = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#050912"/><stop offset="0.55" stop-color="#0C1A34"/><stop offset="1" stop-color="#14295C"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#2563EB" stop-opacity="0.45"/><stop offset="1" stop-color="#2563EB" stop-opacity="0"/>
    </radialGradient>
    <pattern id="dots" width="34" height="34" patternUnits="userSpaceOnUse">
      <circle cx="1.4" cy="1.4" r="1.4" fill="#93C5FD" fill-opacity="0.10"/>
    </pattern>
  </defs>
  <rect width="1280" height="800" fill="url(#g)"/>
  <rect width="1280" height="800" fill="url(#dots)"/>
  <ellipse cx="1040" cy="150" rx="560" ry="420" fill="url(#glow)"/>
  <g font-family="Open Sans, Helvetica, Arial, sans-serif">
    <rect x="96" y="212" width="196" height="42" rx="21" fill="#1D4ED8" fill-opacity="0.34" stroke="#60A5FA" stroke-opacity="0.5"/>
    <text x="194" y="240" fill="#BFDBFE" font-size="17" font-weight="700" letter-spacing="1.6" text-anchor="middle">IN DEVELOPMENT</text>
    <text x="96" y="352" fill="#ffffff" font-size="92" font-weight="800" letter-spacing="-2">Mottorfy</text>
    <rect x="96" y="392" width="86" height="5" rx="3" fill="#3B82F6"/>
    <text x="96" y="458" fill="#DBEAFE" font-size="30" font-weight="600">Mercado Libre · Mercado Pago · Meta</text>
    <text x="96" y="504" fill="#93C5FD" font-size="26" font-weight="400">Orbital Labworks</text>
  </g>
</svg>`;
await sharp(Buffer.from(cover)).png().toFile('assets/source/captures/mottorfy.png');
console.log('  captures/mottorfy.png  1280×800');

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

