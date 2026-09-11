import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const root=path.resolve(import.meta.dirname,'../..');
const require=createRequire(path.join(process.env.TEMP,'ecoclean-demo-qa/package.json')),{JSDOM}=require('jsdom'),acorn=require('acorn');
// Brand spelling is verified by the reversible review overlay. Normalize it for historical text retention.
// Price amounts are verified by the reversible price overlay, which re-derives every published amount from
// its parent bytes and forbids any other difference. Normalize the amounts so this check keeps proving that
// the surrounding original wording survived a deliberate price change.
const norm=s=>s.replace(/\bANDANTE (?=NovaLife)/g,'').replace(/\b([Aa])z (?=NovaLife)/g,'$1 ').replace(/[\p{Extended_Pictographic}\uFE0F\u200D\u2605\u2606]/gu,'').replace(/\s+/g,' ').replace(/\d[\d .]*\d(?= ?Ft)|\d(?= ?Ft)/g,'#').trim();
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
export function verifyStudioContent(manifest){
 if(!manifest.studioOverlay)return [];
 const overlay=JSON.parse(fs.readFileSync(path.join(root,manifest.studioOverlay.path))),issues=[];
 const check=(ok,file,message)=>{if(!ok)issues.push({file,message});};
 for(const rec of overlay.pages){
  const old=new JSDOM(fs.readFileSync(path.join(root,rec.baseline),'utf8')),now=new JSDOM(fs.readFileSync(path.join(root,'release',rec.file),'utf8')),before=old.window.document,d=now.window.document;
  for(const script of d.querySelectorAll('script:not([src])'))if(script.textContent.trim()&&(!script.type||script.type==='text/javascript'))try{acorn.parse(script.textContent,{ecmaVersion:'latest'});}catch(e){check(false,rec.file,'Inline JavaScript syntax: '+e.message);}
  if(rec.file!=='index.html'){
   check(d.body.classList.contains('eco-studio'),rec.file,'Studio design missing');
   for(const selector of ['#studio-szobak','.med-furniture','#studio-kalkulator','.med-history','.med-value','.med-soil','.med-mites','.med-care','#studio-anyagok','.med-process','#studio-kerdesek','#anyagfelismero'])check(d.querySelectorAll(selector).length===1,rec.file,'Missing/duplicate section '+selector);
   check(d.querySelector('.editorial-hero-photo')?.getAttribute('src')==='studio/assets/l-alaku-kanape-vilagos-nappali.webp',rec.file,'Old hero image');
   check(d.querySelector('[data-studio-configurator]')?.dataset.city===rec.file.replace('karpittisztitas-','').replace('.html',''),rec.file,'Wrong calculator city');
   check(d.querySelector('[data-material-app]')?.dataset.next==='#studio-kalkulator',rec.file,'Material result does not return to calculator');
   const ids=[...d.querySelectorAll('[id]')].map(e=>e.id);check(new Set(ids).size===ids.length,rec.file,'Duplicate IDs');
   const text=norm(d.body.textContent);
   for(const el of before.querySelectorAll('h1,h2,h3,p,.pricing-item-name,.pricing-price')){const value=norm(el.textContent);if(value)check(text.includes(value),rec.file,'Original informal text lost: '+value.slice(0,100));}
   const images=[...d.querySelectorAll('img[src]')].map(e=>e.getAttribute('src'));
   for(const img of before.querySelectorAll('img[src]:not([data-generated-interior])'))check(images.includes(img.getAttribute('src')),rec.file,'Original photo lost: '+img.getAttribute('src'));
   const links=[...d.querySelectorAll('nav a[href],footer a[href]')].map(e=>e.getAttribute('href'));
   for(const a of before.querySelectorAll('nav a[href],footer a[href]'))check(links.includes(a.getAttribute('href')),rec.file,'Navigation link lost: '+a.getAttribute('href'));
   const body=d.body.cloneNode(true);body.querySelectorAll('script,style').forEach(e=>e.remove());check(!/\p{Extended_Pictographic}/u.test(body.textContent),rec.file,'Static decorative emoji remains');
  }
  for(const el of d.querySelectorAll('script[src^="studio/"],link[href^="studio/"]')){const url=el.getAttribute('src')||el.getAttribute('href'),[file,query]=url.split('?');check(query==='v='+sha(fs.readFileSync(path.join(root,'release',file))).slice(0,12),rec.file,'Unversioned Studio runtime '+url);}
  old.window.close();now.window.close();
 }
 for(const asset of overlay.dependencies.filter(r=>r.file.endsWith('.js')))try{acorn.parse(fs.readFileSync(path.join(root,'release',asset.file),'utf8'),{ecmaVersion:'latest'});}catch(e){check(false,asset.file,e.message);}
 return issues;
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(import.meta.filename)){const issues=verifyStudioContent(JSON.parse(fs.readFileSync(path.join(root,'release-support/release-manifest.json'))));console.log(JSON.stringify({issues}));process.exitCode=issues.length?1:0;}
