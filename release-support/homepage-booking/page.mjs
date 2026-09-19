import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const here=import.meta.dirname;
const hash=s=>crypto.createHash('sha256').update(s).digest('hex').slice(0,12);
export function applyHomepageBooking({read,edit,root}){
 const homes={};
 const site=read('ui/site.js'),start=site.indexOf("  const bookingRoot=document.getElementById('priceConfigurator');");
 if(start<0)throw Error('Missing booking enhancements');
 const enhancements="/* Existing booking accessibility and summary behavior, extracted from site.js. */\n(() => {\n  'use strict';\n"+site.slice(start);
 fs.writeFileSync(path.join(here,'booking-page.js'),enhancements);
 edit('ui/site.js',site.slice(start),'})();\n');
 const before=read('ui/site.js').match(/    if\(\/Matrac\/[\s\S]*?else if\(\/szőnyeg\/i\.test\(text\)\)/)?.[0];
 if(!before)throw Error('Missing service routing');
 edit('ui/site.js',before,"    if(/Matrac|Mattress|Kárpit|Upholstery/i.test(text)) return; // Native city-discovery anchor works on mobile and in both languages.\n    else if(/szőnyeg/i.test(text))");
 // The original homepage hashes remain valid, including encoded city carts.
 const compatibility="/* Preserve existing incoming booking URLs; destinations are fixed and same-origin. */\n(() => {const route=()=>{if(/^#booking(?:\\?|$)/.test(location.hash))location.replace((document.documentElement.lang==='en'?'booking.html':'megrendeles.html')+location.search+location.hash);};route();addEventListener('hashchange',route);})();\n";
 fs.writeFileSync(path.join(here,'booking-route.js'),compatibility);
 const names=fs.readdirSync(path.join(root,'release')).filter(n=>n.endsWith('.html')).concat(fs.readdirSync(path.join(root,'release/en')).filter(n=>n.endsWith('.html')).map(n=>'en/'+n)).filter(n=>n!=='megrendeles.html'&&n!=='en/booking.html');
 for(const [name,en]of [['index.html',false],['en/index.html',true]]){
  const original=read(name),form=original.match(/<section class="booking-section" id="booking">[\s\S]*?<\/section>/)?.[0];
  const modal=original.match(/<div class="andante-modal-overlay"[\s\S]*?(?=\s*<script src=)/)?.[0];
  if(!form||!modal)throw Error('Missing booking DOM '+name);
  homes[name]={original,form,modal,en};
  edit(name,form,'');edit(name,modal,'');
  for(const tag of [...read(name).matchAll(/<(?:script|link)\b[^>]*(?:ui\/(?:booking-live(?:-en)?\.js|calendar-live\.(?:js|css)|calendar-status\.css|booking-extras\.css|booking-cart\.(?:js|css))|studio\/(?:configurator\.js|booking-handoff\.js|handoff\.css))[^>]*>(?:<\/script>)?/g)].map(m=>m[0]))edit(name,tag,'');
  edit(name,'href="#booking"','href="#teruletek"');edit(name,'data-next="#booking"','data-next="#teruletek"');
  for(const tag of [...read(name).matchAll(/<a href="#teruletek" class="btn btn-primary"[\s\S]*?<\/a>/g)].map(m=>m[0])){
   const next=tag.replace(/Online foglalás|Megrendelés|Online booking|Book now/g,en?'Choose your city':'Válassz várost');if(next!==tag)edit(name,tag,next);
  }
  const coverage=read(name).match(/<p class="section-description">(?:Minden városban azonos kiszállási díjak|The same call-out fees in every town):[\s\S]*?<\/p>/)?.[0];
  if(!coverage)throw Error('Missing coverage note '+name);
  edit(name,coverage,'<p class="section-description">'+(en?'Choose your city for local prices and booking or quote-request options. Travel is free within Győr city limits; other locations retain their local call-out fees.':'Válaszd ki a városodat a helyi árakhoz és a foglalási vagy ajánlatkérési lehetőségekhez. Győr városhatárán belül díjmentes a kiszállás; más településeken a helyi kiszállási díjak érvényesek.')+'</p>');
  edit(name,'</head>','<script src="'+(en?'../':'')+'ui/booking-route.js?v='+hash(compatibility)+'"></script></head>');
 }
 for(const name of names){
  if(name==='index.html'||name==='en/index.html')continue;
  for(const value of new Set(read(name).match(/(?:\.\.\/)?index\.html#booking/g)||[]))edit(name,value,value.replace('index.html',name.startsWith('en/')&&!value.startsWith('../')?'booking.html':'megrendeles.html'));
  for(const tag of new Set(read(name).match(/data-booking-url="(?:\.\.\/)?index\.html(?:#booking)?"/g)||[]))edit(name,tag,tag.replace('index.html',name.startsWith('en/')&&!tag.includes('../')?'booking.html':'megrendeles.html'));
  for(const tag of new Set(read(name).match(/<div\b[^>]*data-studio-configurator=""[^>]*>/g)||[]))if(!tag.includes('data-booking-url='))edit(name,tag,tag.replace('data-studio-configurator=""','data-studio-configurator="" data-booking-url="'+(name.startsWith('en/')?'booking.html':'megrendeles.html')+'#booking"'));
 }
 return ()=>{
  for(const {original,form,modal,en}of Object.values(homes)){
   const prefix=en?'../':'',file=en?'en/booking.html':'megrendeles.html';
   const versioned=asset=>prefix+asset+'?v='+hash(read(asset));
   const styles=['ui/design.css','ui/calendar-live.css','ui/calendar-status.css','ui/booking-extras.css','ui/booking-cart.css','studio/handoff.css'].map(a=>'<link rel="stylesheet" href="'+versioned(a)+'">').join('');
   const script=a=>'<script src="'+versioned(a)+'"></script>';
   const title=en?'Online booking':'Online megrendelés';
   const html='<!DOCTYPE html><html lang="'+(en?'en':'hu')+'" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,follow"><title>'+title+' | ECO Clean</title><link rel="canonical" href="https://ecocleantisztito.hu/'+file+'"><link rel="alternate" hreflang="hu" href="https://ecocleantisztito.hu/megrendeles.html"><link rel="alternate" hreflang="en" href="https://ecocleantisztito.hu/en/booking.html"><link rel="icon" href="'+prefix+'favicon.ico"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&amp;family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&amp;display=swap">'+styles+'<link rel="stylesheet" href="'+prefix+'ui/booking-page.css?v='+hash(fs.readFileSync(path.join(here,'booking-page.css')))+'"></head><body class="eco-site eco-booking-page"><header class="booking-page-nav"><a class="booking-page-brand" href="index.html">ECO Clean</a><nav aria-label="'+(en?'Booking navigation':'Megrendelés navigáció')+'"><a href="index.html#teruletek">'+(en?'Cities & prices':'Városok és árak')+'</a><a href="tel:+36702408141">'+(en?'Call us':'Telefon')+'</a><a hreflang="'+(en?'hu':'en')+'" lang="'+(en?'hu':'en')+'" href="'+(en?'../megrendeles.html':'en/booking.html')+'">'+(en?'HU':'EN')+'</a></nav></header><main>'+form.replace('<h2>','<h1>').replace('</h2>','</h1>')+'</main>'+modal+script(en?'ui/booking-live-en.js':'ui/booking-live.js')+script('ui/calendar-live.js')+'<script src="'+prefix+'ui/booking-page.js?v='+hash(enhancements)+'"></script>'+script('studio/configurator.js')+script('studio/booking-handoff.js')+script('ui/booking-cart.js')+'</body></html>\n';
   fs.writeFileSync(path.join(here,en?'booking-en.html':'booking-hu.html'),html);
  }
 };
}
