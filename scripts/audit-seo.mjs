import { readFileSync, existsSync, statSync } from 'node:fs';
const LANGS = ['en','es','pt','it','fr'];
const file = (l) => l === 'en' ? 'dist/index.html' : `dist/${l}/index.html`;
const ok = (c) => c ? '✅' : '❌';
let fail = 0;
const check = (label, cond, extra='') => { if(!cond) fail++; console.log(`  ${ok(cond)} ${label}${extra?' — '+extra:''}`); };

console.log('── Per-language pages ──');
for (const l of LANGS) {
  const h = readFileSync(file(l),'utf8');
  const title = (h.match(/<title>(.*?)<\/title>/s)||[])[1] ?? '';
  const desc  = (h.match(/<meta name="description" content="(.*?)"/s)||[])[1] ?? '';
  const canon = (h.match(/rel="canonical" href="(.*?)"/)||[])[1] ?? '';
  const hl    = (h.match(/<link rel="alternate" hreflang="[a-z-]+"/g)||[]).length;
  const h1    = (h.match(/<h1[^>]*>/g)||[]).length;
  const h2    = (h.match(/<h2[^>]*>/g)||[]).length;
  const noAlt = (h.match(/<img(?![^>]*\balt=)[^>]*>/g)||[]).length;
  const ld    = h.includes('application/ld+json');
  const text  = h.replace(/<script[\s\S]*?<\/script>/g,'').replace(/<style[\s\S]*?<\/style>/g,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
  console.log(`\n  [${l.toUpperCase()}]`);
  check(`title ${title.length} chars`, title.length>=30 && title.length<=90, title.length>60?`first ${60} chars shown in SERP: "${title.slice(0,60)}"`:'');
  check(`description ${desc.length} chars`, desc.length>=110 && desc.length<=175, desc.length>160?'over 160, may be truncated':'');
  check('canonical present', !!canon, canon);
  check('hreflang set (5 + x-default)', hl===6, `${hl} links`);
  check('exactly one h1', h1===1, `${h1}`);
  check(`${h2} h2 section headings`, h2>=8);
  check('every img has alt', noAlt===0, `${noAlt} missing`);
  check('JSON-LD present', ld);
  check(`${text.split(' ').length} words of indexable text`, text.split(' ').length>1500);
}

console.log('\n── Site-wide ──');
check('sitemap.xml exists', existsSync('dist/sitemap.xml'));
const sm = existsSync('dist/sitemap.xml') ? readFileSync('dist/sitemap.xml','utf8') : '';
check('sitemap lists 5 URLs', (sm.match(/<loc>/g)||[]).length===5, `${(sm.match(/<loc>/g)||[]).length}`);
check('sitemap carries hreflang alternates', (sm.match(/xhtml:link/g)||[]).length===30);
check('robots.txt exists', existsSync('dist/robots.txt'));
check('robots points at the sitemap', readFileSync('dist/robots.txt','utf8').includes('Sitemap:'));
check('robots hides the print + og routes', readFileSync('dist/robots.txt','utf8').includes('/cv/en/'));
check('404 page built', existsSync('dist/404.html'));
check('manifest built', existsSync('dist/site.webmanifest'));
for (const l of LANGS) check(`og-${l}.png rendered`, existsSync(`dist/og/og-${l}.png`), existsSync(`dist/og/og-${l}.png`)?`${Math.round(statSync(`dist/og/og-${l}.png`).size/1024)} KB`:'');
const home = readFileSync('dist/index.html','utf8');
check('no third-party font requests', !/fonts\.(googleapis|gstatic)/.test(home));
check('print routes are noindex', readFileSync('dist/cv/en/index.html','utf8').includes('noindex'));
check('og routes are noindex', readFileSync('dist/og/en/index.html','utf8').includes('noindex'));
console.log(`\n${fail === 0 ? '✅ all SEO checks passed' : `❌ ${fail} check(s) failed`}`);
