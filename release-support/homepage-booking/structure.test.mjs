import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const require=createRequire(path.join(process.env.TEMP,'ecoclean-demo-qa/package.json'));
const {JSDOM}=require('jsdom');
const root=path.resolve(import.meta.dirname,'../../release');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
test('dedicated HU/EN forms retain the complete previous booking section; homepages offer city discovery',()=>{
 for(const [home,form]of [['index.html','megrendeles.html'],['en/index.html','en/booking.html']]){
  const old=execFileSync('git',['show','fd09d549d2ef16e6dc08bb2bef2eaf28de4856b1:release/'+home],{encoding:'utf8'});
  const section=s=>s.match(/<section class="booking-section" id="booking">[\s\S]*?<\/section>/)[0];
  assert.equal(section(read(form)).replace('<h1>','<h2>').replace('</h1>','</h2>'),section(old));
  const d=new JSDOM(read(home)).window.document;
  assert.equal(d.querySelector('#bookingForm,#priceConfigurator,#bookingCalendar'),null);
  assert.equal(d.querySelector('[data-material-app]').dataset.next,'#teruletek');
  assert.ok(d.querySelector('#teruletek .coverage-card'));
  assert.doesNotMatch(read(home),/src="[^\"]*(?:booking-live|calendar-live|booking-cart|booking-handoff)\.js/);
 }
});
test('new booking page links and scripts resolve and city handoffs use the correct language',()=>{
 for(const file of ['megrendeles.html','en/booking.html']){
  const d=new JSDOM(read(file)).window.document;
  assert.equal(d.querySelector('link[rel="canonical"]').href,'https://ecocleantisztito.hu/'+file);
  assert.equal(d.querySelectorAll('h1').length,1);
  for(const el of d.querySelectorAll('[src],a[href],link[href]')){
   const url=el.getAttribute('src')||el.getAttribute('href');
   if(/^(?:[a-z]+:|\/\/|#)/i.test(url))continue;
   const [target,fragment]=url.split('?')[0].split('#');
   const resolved=path.resolve(root,path.dirname(file),target);
   assert.ok(fs.existsSync(resolved),file+' '+url);
   if(fragment){const doc=new JSDOM(fs.readFileSync(resolved,'utf8')).window.document;assert.ok(doc.getElementById(decodeURIComponent(fragment)),url);}
  }
 }
 for(const dir of ['', 'en'])for(const file of fs.readdirSync(path.join(root,dir)).filter(f=>f.endsWith('.html'))){
  const html=read(path.join(dir,file));
  assert.equal((html.match(/data-booking-url=/g)||[]).length,(html.match(/data-studio-configurator=/g)||[]).length,file+' explicit destination');
  for(const [,url]of html.matchAll(/data-booking-url="([^"]+)"/g))assert.equal(url,(dir?'booking.html':'megrendeles.html')+'#booking',file);
 }
});
