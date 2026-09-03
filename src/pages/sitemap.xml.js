import { LANGS, urlFor } from '../lib/site.js';

/* Hand-rolled so every entry carries its full hreflang alternate set. */
export function GET() {
  const today = new Date().toISOString().slice(0, 10);

  const alternates = [
    ...LANGS.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${urlFor(l)}"/>`),
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${urlFor('en')}"/>`,
  ].join('\n');

  const entries = LANGS.map((lang) => `  <url>
    <loc>${urlFor(lang)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${lang === 'en' ? '1.0' : '0.9'}</priority>
${alternates}
  </url>`).join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries}
</urlset>
`;

  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
