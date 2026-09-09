import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(path.join(process.env.TEMP,'ecoclean-demo-qa','package.json'));
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(new URL('configurator.js',import.meta.url),'utf8');
const bridge=fs.readFileSync(new URL('booking-handoff.js',import.meta.url),'utf8');
const booking=fs.readFileSync(new URL('../../release-support/booking-live.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../../release/index.html',import.meta.url),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
const context=vm.createContext({Intl});vm.runInContext(source,context);const api=context.EcoStudioConfig;
const plain=x=>JSON.parse(JSON.stringify(x));
const sample=overrides=>({version:1,sourcePage:'karpittisztitas-gyor.html',city:'gyor',travelZone:'belvaros',items:[{id:'karpit_szofa',count:1,upsells:[]}],extras:[],...overrides});
async function browser(hash=''){
 const dom=new JSDOM(html,{url:'https://example.test/index.html'+hash,runScripts:'dangerously',pretendToBeVisual:true});
 await new Promise(resolve=>dom.window.document.readyState==='loading'?dom.window.document.addEventListener('DOMContentLoaded',resolve,{once:true}):resolve());
 const w=dom.window,requests=[];w.fetch=(...args)=>{requests.push(args);throw Error('Network forbidden');};w.alert=()=>{};w.HTMLElement.prototype.scrollIntoView=function(){};
 function run(code){const s=w.document.createElement('script');s.textContent=code;w.document.body.append(s);}
 run('const BookingCalendar={state:{},init(){},setCity(city){this.state.selectedCity=city;this.state.selectedSlot=null;},setRequiredDuration(n){this.state.requiredDuration=n;this.state.selectedSlot=null;}};');
 run(booking);run(source);run("handleServiceType(document.querySelector('#serviceType [data-value=\"Kárpit\"]'));");
 return {dom,w,run,requests,read:expression=>w.eval(expression)};
}
test('fragment round trip contains only selections, with 26 allowed cities',()=>{
 const input=sample({items:[{id:'karpit_szofa',count:2,upsells:['atkairtas','agyazhato']},{id:'matrac_francia_ab',count:1,upsells:[]}],extras:['matrac_nedves_tisztitas']});
 assert.deepEqual(plain(api.decode(api.encode(input))),input);assert.equal(Object.keys(api.cities).length,26);
 for(const city of Object.keys(api.cities))assert.equal(api.validate(sample({city,sourcePage:'matractisztitas-'+city+'.html'})).city,city);
});
test('invalid payloads are rejected atomically',()=>{
 const invalid=[{version:2},{city:'egyeb'},{city:'csorna',sourcePage:'karpittisztitas-csorna.html'},{sourcePage:'karpittisztitas-baja.html'},{totalPrice:1},{items:[]},{items:[{id:'karpit_szofa',count:0,upsells:[]}]},{items:[{id:'karpit_szofa',count:1.2,upsells:[]}]},{items:[{id:'karpit_szofa',count:100,upsells:[]}]},{items:[{id:'__proto__',count:1,upsells:[]}]},{items:[{id:'karpit_szofa',count:1,upsells:[]},{id:'karpit_szofa',count:1,upsells:[]}]},{items:[{id:'karpit_fotel',count:1,upsells:['atkairtas']}]},{extras:['matrac_agykeret']},{extras:['karpit_impregnalas','karpit_impregnalas']},{travelZone:'5km'}];
 for(const value of invalid)assert.throws(()=>api.validate(sample(value)),JSON.stringify(value));
 for(const city of api.excluded)assert.throws(()=>api.validate(sample({city,sourcePage:'karpittisztitas-'+city+'.html'})));
 for(const hash of ['#booking?eco-config=%XX','#booking?eco-config='+ 'a'.repeat(9000),'#booking'])assert.throws(()=>api.decode(hash));
});
test('all main booking prices, durations, zones and extras match in 114 scenarios',async()=>{
 const b=await browser();let cases=0;
 const scenarios=[];for(const p of api.catalog)for(const count of [1,3])for(const zone of Object.keys(api.zones))scenarios.push(sample({travelZone:zone,items:[{id:p.id,count,upsells:p.seats>=3?['atkairtas','agyazhato']:[]}]}));
 scenarios.push(sample({items:[{id:'karpit_szofa',count:2,upsells:['atkairtas','agyazhato']},{id:'matrac_francia_ab',count:1,upsells:[]}],extras:Object.keys(api.extras)}));
 scenarios.push(sample({items:[{id:'karpit_u_kanape',count:10,upsells:['atkairtas','agyazhato']}]}));
 for(const s of scenarios){const selectedItems=Object.fromEntries(s.items.map(i=>[i.id,{count:i.count,upsells:i.upsells,category:i.id.split('_')[0]}])),globalUpsells=Object.fromEntries(s.extras.map(id=>{const n=id.indexOf('_');return[id,{category:id.slice(0,n),upsellId:id.slice(n+1)}];}));
  b.run('Object.assign(State,'+JSON.stringify({selectedItems,globalUpsells,travelZone:s.travelZone})+');updateSummary();');const expected=b.read('[State.totalPrice,State.totalDuration,State.discount,State.isLargeOrder]'),r=api.calculate(s);assert.deepEqual(plain(expected),[r.total,r.duration,r.discount,r.isLargeOrder]);cases++;
 }
 assert.equal(cases,114);assert.equal(b.requests.length,0);b.dom.window.close();
});
test('explicit import preserves contact fields and transfers every selection without booking',async()=>{
 const s=sample({items:[{id:'karpit_szofa',count:2,upsells:['atkairtas','agyazhato']},{id:'matrac_francia_ab',count:1,upsells:[]}],extras:Object.keys(api.extras)});
 const b=await browser(api.encode(s));b.run("incrementItem('karpit_fotel','karpit');document.getElementById('nameInput').value='Meglévő név';");b.run(bridge);
 assert.equal(b.read('State.selectedItems.karpit_fotel.count'),1);assert.equal(b.read('State.city'),null);assert.ok(b.w.document.querySelector('[data-studio-import]').textContent.includes('cseréje'));
 b.w.document.querySelector('[data-studio-import]').click();const r=api.calculate(s);
 assert.equal(b.read('State.totalPrice'),r.total);assert.equal(b.read('State.totalDuration'),r.duration);assert.equal(b.read('State.city'),'gyor');assert.equal(b.read('State.travelZone'),'belvaros');assert.equal(b.read('Object.keys(State.selectedItems).length'),2);assert.equal(b.read('State.selectedItems.karpit_szofa.count'),2);assert.equal(b.read('Object.keys(State.globalUpsells).length'),5);
 assert.equal(b.w.document.querySelector('#nameInput').value,'Meglévő név');assert.equal(b.w.document.querySelector('#andanteCheckbox').checked,false);assert.equal(b.read('BookingCalendar.state.selectedSlot'),null);assert.equal(b.w.location.hash,'#booking');assert.equal(b.requests.length,0);
 assert.equal(b.w.document.querySelectorAll('#upsellOptions input:checked').length,5);assert.equal(b.w.document.querySelectorAll('#upsell-karpit_szofa input:checked').length,2);b.w.EcoStudioBookingHandoff.start();assert.equal(b.w.document.querySelectorAll('.studio-handoff').length,1);b.dom.window.close();
});
test('discard and malformed fragments leave an existing basket untouched',async()=>{
 for(const hash of [api.encode(sample()),'#booking?eco-config=%XX',api.encode(sample()).replace('gyor','baja')]){const b=await browser(hash);b.run("incrementItem('karpit_fotel','karpit');");b.run(bridge);const buttons=b.w.document.querySelectorAll('.studio-handoff button');if(buttons.length)buttons[1].click();assert.equal(b.read('State.selectedItems.karpit_fotel.count'),1);assert.equal(b.read('State.city'),null);assert.equal(b.requests.length,0);b.dom.window.close();}
});
test('large import selects existing quote mode and no appointment',async()=>{const s=sample({items:[{id:'karpit_u_kanape',count:10,upsells:[]}]});const b=await browser(api.encode(s));b.run(bridge);b.w.document.querySelector('[data-studio-import]').click();assert.equal(b.read('State.isLargeOrder'),true);assert.ok(b.w.document.querySelector('#largeOrderPanel'));assert.equal(b.read('BookingCalendar.state.selectedSlot'),null);assert.equal(b.requests.length,0);b.dom.window.close();});
test('changed tariffs or missing handlers reject before replacing an existing basket',async()=>{for(const mutation of ['PRICING.karpit.szofa.price=1;','DISCOUNTS.combo.percent=90;','window.incrementItem=undefined;']){const b=await browser(api.encode(sample()));b.run("incrementItem('karpit_fotel','karpit');");b.run(mutation);b.run(bridge);b.w.document.querySelector('[data-studio-import]').click();assert.equal(b.read('State.selectedItems.karpit_fotel.count'),1);assert.equal(b.read('Object.keys(State.selectedItems).length'),1);assert.equal(b.read('State.city'),null);assert.ok(b.w.document.querySelector('.studio-handoff [role="status"]').textContent);assert.equal(b.requests.length,0);b.dom.window.close();}});
test('mount supports mixed variants, existing quantities, images and a non-submitting link',async()=>{const b=await browser();const el=b.w.document.createElement('div');el.dataset.studioConfigurator='';el.dataset.city='gyor';el.dataset.sourcePage='karpittisztitas-gyor.html';el.dataset.assets='studio/assets';b.w.document.body.append(el);b.w.EcoStudioConfig.mount(el);
 assert.equal(el.querySelectorAll('.med-product').length,6);assert.equal(el.querySelectorAll('button:not([type="button"])').length,0);const plus=el.querySelector('[data-group="mattress"] [data-delta="1"]');plus.click();const select=el.querySelector('[data-group="mattress"] select');select.value='matrac_francia_ab';select.dispatchEvent(new b.w.Event('change',{bubbles:true}));plus.click();assert.equal(el.ecoStudioConfigurator.snapshot().items.length,2);const href=el.querySelector('[data-booking-handoff]').href;assert.ok(href.includes('#booking?eco-config='));assert.equal(b.w.EcoStudioConfig.decode(new URL(href).hash).items.length,2);assert.equal(b.requests.length,0);b.dom.window.close();});
