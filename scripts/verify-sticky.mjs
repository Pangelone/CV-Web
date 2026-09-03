import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
const DIST=resolve('dist'),PORT=4510;
const MIME={'.html':'text/html;charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{try{let p=new URL(req.url,'http://x').pathname;if(p.endsWith('/'))p+='index.html';if(!extname(p))p+='/index.html';const b=await readFile(join(DIST,p));res.writeHead(200,{'content-type':MIME[extname(p)]??'application/octet-stream'});res.end(b);}catch{res.writeHead(404).end('nf');}});
await new Promise(ok=>server.listen(PORT,ok));
const browser=await chromium.launch({channel:'chrome'}).catch(()=>chromium.launch());
const page=await browser.newPage({viewport:{width:1440,height:900},locale:'en-US'});
await page.goto(`http://localhost:${PORT}/`,{waitUntil:'load'});
await page.evaluate(()=>document.querySelectorAll('.reveal').forEach(e=>e.classList.add('is-in')));

// Scroll deep enough that the philosophy panel is pinned
await page.evaluate(()=>{const a=document.getElementById('about');window.scrollTo(0,a.offsetTop+a.offsetHeight-700);});
await page.waitForTimeout(700);
const r = await page.evaluate(()=>{
  const bar=document.getElementById('topbar').getBoundingClientRect();
  const box=document.querySelector('.about__philosophy').getBoundingClientRect();
  const title=document.querySelector('.about__philosophy h3').getBoundingClientRect();
  return {barBottom:Math.round(bar.bottom), boxTop:Math.round(box.top), titleTop:Math.round(title.top),
          overlap: Math.round(bar.bottom - box.top)};
});
console.log('bar bottom:', r.barBottom, '| panel top:', r.boxTop, '| overlap:', r.overlap, r.overlap>0?'❌ still covered':'✅ clear');

// Anchor jump should not land under the bar either
await page.evaluate(()=>window.scrollTo(0,0));
await page.waitForTimeout(300);
await page.click('a[data-nav="skills"]');
await page.waitForTimeout(1100);
const a = await page.evaluate(()=>{
  const bar=document.getElementById('topbar').getBoundingClientRect();
  const h=document.querySelector('#skills .section-head h2').getBoundingClientRect();
  return {barBottom:Math.round(bar.bottom), headingTop:Math.round(h.top)};
});
console.log('anchor jump → skills heading top:', a.headingTop, '| bar bottom:', a.barBottom, a.headingTop>a.barBottom?'✅ visible':'❌ under the bar');
await browser.close(); server.close();
