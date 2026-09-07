import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

// Test-only dependency lives outside the project; no runtime package is needed.
const require=createRequire(path.join(process.env.TEMP,'ecoclean-demo-qa','package.json'));
const {JSDOM,VirtualConsole}=require('jsdom');
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.dirname(here);
const read=file=>fs.readFileSync(path.join(here,file),'utf8');
const source=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8')).window.document;
const errors=[],requests=[];
const log=new VirtualConsole();
log.on('jsdomError',error=>errors.push(error.message));
const dom=new JSDOM(read('index.html'),{
  url:'http://localhost:8089/demo/index.html',runScripts:'dangerously',virtualConsole:log,
  beforeParse(w){
    w.matchMedia=()=>({matches:true,addEventListener(){}});
    w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
    w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
    w.HTMLDialogElement.prototype.close=function(){this.open=false;};
    w.HTMLImageElement.prototype.decode=async()=>{};
    w.alert=message=>{w.lastAlert=message;};
    w.fetch=async(url,options)=>{requests.push({url,options});throw Error('Simulated offline reviews');};
    w.AbortSignal.timeout=()=>new w.AbortController().signal;
  }
});
const w=dom.window,d=w.document;
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const text=element=>element.textContent.replace(/\s+/g,' ').trim();

const sections=doc=>[...doc.querySelectorAll('main > section')].map(el=>[el.id,el.className]);
assert.deepEqual(sections(d),sections(source),'Original section order and classes');
assert.deepEqual([...d.querySelectorAll('main h1,main h2,main h3,main h4')].map(text),[...source.querySelectorAll('main h1,main h2,main h3,main h4')].map(text),'All original landing headings');
const paragraphs=[...d.querySelectorAll('main p')].map(text);
for(const p of source.querySelectorAll('main p')) assert(paragraphs.includes(text(p)),`Preserved paragraph: ${text(p).slice(0,70)}`);
assert.deepEqual([...d.querySelectorAll('.nav-main .nav-link')].map(text),[...source.querySelectorAll('.nav-main .nav-link')].map(text));
assert.equal(d.querySelector('meta[name="robots"]').content,'noindex, nofollow');
for(const image of d.querySelectorAll('img')) {
  const src=image.getAttribute('src');
  if(!/^https?:/.test(src)) assert(fs.existsSync(path.resolve(here,decodeURIComponent(src))),`Image exists: ${src}`);
}
for(const el of d.querySelectorAll('script[src],link[rel="stylesheet"]')) {
  const url=el.getAttribute('src')||el.getAttribute('href');
  if(!/^(https?:|\/\/)/.test(url)) assert(fs.existsSync(path.resolve(here,url)),`Dependency exists: ${url}`);
}
const missing=[];
for(const a of d.querySelectorAll('a[href]')) {
  const href=a.getAttribute('href');
  if(href==='#')continue;
  if(href.startsWith('#')) {assert(d.getElementById(decodeURIComponent(href.slice(1))),`Anchor ${href}`);continue;}
  if(/^(https?:|tel:|mailto:)/.test(href)) continue;
  if(!fs.existsSync(path.resolve(here,decodeURIComponent(href))))missing.push(href);
}
assert.deepEqual(missing,[],'All static local links resolve');

d.defaultView.localStorage.setItem('ecoclean-demo-theme','dark');
assert.equal(d.querySelector('#themeToggle,.theme-toggle'),null,'Theme toggle removed');
for(const file of ['booking-demo.js','navigation.js','../mobile-menu.js','calendar-demo.js','design.js','reviews-demo.js']){
  const script=d.createElement('script');script.textContent=read(file);d.body.append(script);
}
if(d.readyState==='loading')await new Promise(resolve=>d.addEventListener('DOMContentLoaded',resolve,{once:true}));
await tick();
assert.equal(d.documentElement.dataset.theme,'light');
assert.equal(d.querySelector('#serviceType .active').dataset.value,'Kárpit');
assert.equal(d.querySelectorAll('.item-photo').length,6);
assert.equal(d.querySelectorAll('.field-label[for="nameInput"]').length,1);
assert.equal(d.getElementById('configStatus').textContent,'● DEMÓ');

for(const trigger of d.querySelectorAll('.nav-item')){
  trigger.click();await tick();
  assert(d.getElementById('megaMenuContainer').classList.contains('active'));
  assert.equal(trigger.querySelector('.nav-link').getAttribute('aria-expanded'),'true');
  for(const link of d.querySelectorAll('.mega-city')) assert(fs.existsSync(path.resolve(here,decodeURIComponent(link.getAttribute('href')))),`Mega city link ${link.getAttribute('href')}`);
  d.getElementById('megaMenuCloseBtn').click();
}
d.querySelector('.nav-mobile-toggle').click();await tick();
assert.equal(d.querySelector('.nav-mobile-toggle').getAttribute('aria-expanded'),'true');
d.querySelector('.nav-mobile-link').click();await tick();
assert.equal(d.querySelector('.nav-mobile-link').getAttribute('aria-expanded'),'true');
d.querySelector('.nav-mobile-cta a[href^="#"]').click();await tick();
assert(!d.querySelector('.nav-mobile').classList.contains('active'));
d.getElementById('btnBusiness').click();assert(d.getElementById('cardBusiness').classList.contains('active'));
d.getElementById('btnPrivate').click();assert(d.getElementById('cardPrivate').classList.contains('active'));
const businessCards=[...d.querySelectorAll('.services-grid .service-card')].slice(2);
for(const card of businessCards){card.click();assert(d.getElementById('megaMenuContainer').classList.contains('active'));d.getElementById('megaMenuCloseBtn').click();}

const state=()=>vm.runInContext('State',dom.getInternalVMContext());
const calendar=()=>vm.runInContext('BookingCalendar',dom.getInternalVMContext());
w.incrementItem('karpit_l_kanape','karpit');
assert.equal(state().totalPrice,17500);
assert.equal(d.querySelector('[data-item-id="karpit_l_kanape"]').classList.contains('is-selected'),true);
const city=d.getElementById('citySelect');city.value='gyor';city.dispatchEvent(new w.Event('change'));
const zone=d.querySelector('[name="travelZone"][value="belvaros"]');zone.checked=true;zone.dispatchEvent(new w.Event('change'));
assert.equal(state().totalPrice,21000);
assert.equal(d.getElementById('calendarWrapper').style.display,'block');
assert(d.querySelector('.calendar-day:not([disabled])'));
d.querySelector('.calendar-day:not([disabled])').click();d.querySelector('[data-demo-hour="9"]').click();
assert.equal(calendar().getSelectedSlot().startTime,'09:00');
w.incrementItem('karpit_fotel','karpit');assert.equal(state().totalPrice,27500);
assert.equal(calendar().getSelectedSlot(),null,'Changed duration invalidates a selected slot');
w.decrementItem('karpit_fotel');assert.equal(state().totalPrice,21000);
d.querySelector('.calendar-day:not([disabled])').click();d.querySelector('[data-demo-hour="9"]').click();
for(const [id,value] of Object.entries({nameInput:'Demó Teszt',emailInput:'demo@example.invalid',emailConfirmInput:'demo@example.invalid',phoneInput:'+36 30 123 4567',streetInput:'Teszt utca 1.',plzInput:'9021',cityInput:'Győr'})) d.getElementById(id).value=value;
w.openAndanteModal();w.confirmAndante();
await w.submitBooking(new w.Event('submit',{cancelable:true}));
assert.equal(d.getElementById('demoResult').open,true);
assert.match(d.getElementById('demoResultTotal').textContent,/21.?000/);
d.getElementById('demoResult').close();
d.getElementById('emailConfirmInput').value='different@example.invalid';
await w.submitBooking(new w.Event('submit',{cancelable:true}));
assert.match(w.lastAlert,/nem egyeznek/);assert.equal(d.getElementById('demoResult').open,false);

d.querySelector('#serviceType [data-value="Mindkettő"]').click();
w.incrementItem('karpit_l_kanape','karpit');w.incrementItem('matrac_egyagyas_a','matrac');
assert.equal(state().discount,2900);assert.equal(state().totalPrice,26100,'Preserve the source calculation: combo discount applies to the full subtotal');
for(let i=0;i<8;i++)w.incrementItem('karpit_u_kanape','karpit');
assert.equal(state().isLargeOrder,true);assert.equal(d.getElementById('calendarWrapper').style.display,'none');
assert.equal(d.getElementById('bookingFormWrapper').style.display,'none');
for(const [id,value] of Object.entries({largeOrderName:'Demó',largeOrderEmail:'demo@example.invalid',largeOrderPhone:'+36 30 123 4567'}))d.getElementById(id).value=value;
await w.submitLargeOrder();assert.equal(d.getElementById('demoResult').open,true);d.getElementById('demoResult').close();
d.querySelector('#serviceType [data-value="Matrac"]').click();
assert.equal(state().isLargeOrder,false);assert.equal(d.getElementById('largeOrderPanel').style.display,'none');
assert.equal(d.getElementById('calendarWrapper').style.display,'none');

// Independently checked Qwen/coordinator baselines: quote arithmetic and exact boundary.
d.querySelector('#serviceType [data-value="Kárpit"]').click();
w.incrementItem('karpit_szofa','karpit');
assert.equal(state().totalPrice,19000,'Sofa + inner-city travel');
assert.equal(state().totalDuration,40);
w.decrementItem('karpit_szofa');
for(let i=0;i<3;i++)w.incrementItem('karpit_fotel','karpit');
assert.equal(state().totalPrice,21850,'Three armchairs: 5% including travel');
assert.equal(state().totalDuration,60);
d.querySelector('#serviceType [data-value="Mindkettő"]').click();
w.incrementItem('karpit_szofa','karpit');w.incrementItem('matrac_gyerek_a','matrac');
assert.equal(state().totalPrice,21600,'Combo discount does not stack');
assert.equal(state().totalDuration,55);
d.querySelector('#serviceType [data-value="Kárpit"]').click();
for(let i=0;i<12;i++)w.incrementItem('karpit_szofa','karpit');
assert.equal(state().totalDuration,480);assert.equal(state().isLargeOrder,false,'480 minutes stays normal');
w.incrementItem('karpit_szofa','karpit');
assert.equal(state().totalDuration,520);assert.equal(state().isLargeOrder,true,'Only over 480 minutes is large');

const slider=d.querySelector('.ba-slider-knob');
slider.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert.equal(slider.getAttribute('aria-valuenow'),'55');
d.querySelector('[data-interior="4"]').click();await tick();
assert.match(d.getElementById('interiorImage').src,/office\.webp$/);assert.equal(d.getElementById('interiorCaption').textContent,'Irodai szék');
assert.equal(requests.length,1,'Only the original read-only review feed was requested');
assert.equal(requests[0].options.method,undefined);
assert.match(d.querySelector('.reviews-unavailable').textContent,/nem tölthetők/);
assert.deepEqual(errors,[],'No JavaScript runtime errors');
console.log('PASS: original sections/headings/paragraphs; links/assets; five megamenus; mobile menu; gallery; keyboard comparison; exact pricing; discount; slot invalidation; form validation; normal and large-order demo completion; offline reviews; zero booking network requests.');
w.close();
