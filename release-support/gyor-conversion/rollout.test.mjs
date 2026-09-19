import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(path.join(process.env.TEMP,'ecoclean-demo-qa/package.json'));
const {JSDOM}=require('jsdom');
const root=path.resolve(import.meta.dirname,'../..');
const read=file=>fs.readFileSync(path.join(root,'release',file),'utf8');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const baseline=JSON.parse(fs.readFileSync(path.join(import.meta.dirname,'rollout-baseline.json')));
test('all pre-existing financial and booking engines remain byte-for-byte unchanged',()=>{
 for(const [file,expected]of Object.entries(baseline.runtimes))assert.equal(sha(fs.readFileSync(path.join(root,'release',file))),expected,file);
});
test('all 64 regional pages preserve their entire existing calculator, price grid and phone routes',()=>{
 let checked=0;
 for(const [file,info]of Object.entries(baseline.pages)){
  if(info.city==='gyor')continue;
  const html=read(file),calc=html.match(info.studio?/<section class="med-section med-price-section" id="studio-kalkulator">[\s\S]*?<\/section>/:/<section class="med-section med-price-section" id="arak">[\s\S]*?<\/section>/)?.[0];
  // Only the destination moved from the homepage to its dedicated form.
  const originalDestination=calc?.replace(/ data-booking-url="(?:megrendeles|booking)\.html#booking"/g,'').replaceAll('megrendeles.html','index.html').replaceAll('booking.html','index.html');
  assert.ok(calc,file);assert.equal(sha(originalDestination),info.calculatorSha256,file+' calculator');
  if(info.pricesSha256)assert.equal(sha(html.match(/<section class="pricing"[\s\S]*?<\/section>/)[0]),info.pricesSha256,file+' price grid');
  const phones=[...new Set([...html.matchAll(/href="(tel:[^"]+)"/g)].map(m=>m[1]))];assert.deepEqual(phones,info.phones,file+' phone');checked++;
 }
 assert.equal(checked,64);
});
test('regional component prices, chargeable travel, references and family-specific calls to action are coherent',()=>{
 for(const [file,info]of Object.entries(baseline.pages)){
  if(info.city==='gyor')continue;
  const dom=new JSDOM(read(file)),d=dom.window.document;
  const amounts=[...d.querySelectorAll('.gyor-prices strong')].map(e=>Number(e.textContent.replace(/\D/g,'')));
  assert.deepEqual(amounts,info.studio?[18000,20000,4000]:[15500,17500,3500],file);
  assert.ok(d.querySelector('.gyor-hero .gyor-eyebrow').textContent.includes(info.label),file+' city');
  assert.equal(d.querySelectorAll('.gyor-story').length,3,file);
  assert.ok(d.querySelector('.gyor-travel').textContent.includes('3 500'),file);
  assert.ok(d.querySelector('.gyor-travel').textContent.includes('5 500'),file);
  assert.match(d.querySelector('.gyor-mobile-booking').textContent,/3 500/,file);
  const visible=[...d.querySelectorAll('.gyor-hero,.gyor-stories,.gyor-mobile-booking')].map(e=>e.textContent).join(' ');
  assert.doesNotMatch(visible,/Győr|[dD]íjmentes|[fF]ree travel|(?<!\d[\s\u00a0])\b0 Ft/,file);
  if(!info.studio)assert.doesNotMatch(visible,/szabad időpont|availability|booking form|megrendelőben/,file);
  for(const a of d.querySelectorAll('.gyor-hero a[href^="#"],.gyor-stories a[href^="#"],.gyor-mobile-booking a[href^="#"],.studio-chapters a[href^="#"]'))assert.ok(d.getElementById(a.hash.slice(1)),file+' '+a.hash);
  const ids=[...d.querySelectorAll('[id]')].map(e=>e.id);assert.equal(new Set(ids).size,ids.length,file+' duplicate IDs');
  assert.equal(d.querySelectorAll('h1').length,1,file);
  assert.equal(d.querySelector('.gyor-hero').dataset.conversionCalculator,info.studio?'studio-kalkulator':'arak');
  assert.equal(d.querySelector('link[rel="canonical"]').href,'https://ecocleantisztito.hu/'+file);
  const refs=d.getElementById('gyor-referenciak'),calc=d.getElementById(info.studio?'studio-kalkulator':'arak');
  assert.ok(refs.compareDocumentPosition(calc)&4,file+' reference before calculator');
  for(const img of d.querySelectorAll('.gyor-hero img,.gyor-stories img'))assert.ok(fs.existsSync(path.resolve(root,'release',path.dirname(file),img.getAttribute('src'))),file+' image');
  dom.window.close();
 }
});
