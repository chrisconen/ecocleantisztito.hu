import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {harness} from './booking-contract.test.mjs';
const root=path.resolve(import.meta.dirname,'../..');
const source=n=>fs.readFileSync(path.join(root,'release',n),'utf8');
const ctx={};vm.runInNewContext(source('studio/configurator.js'),ctx);
const api=ctx.EcoStudioConfig;
const h=harness({withCalendar:false});
const selection=(items,extras=[],travelZone='belvaros')=>({version:1,sourcePage:'karpittisztitas-gyor.html',city:'gyor',travelZone,items,extras});
const item=(id,count=1,upsells=[])=>({id,count,upsells});
function compare(s){
 const selectedItems=Object.fromEntries(s.items.map(i=>[i.id,{count:i.count,category:i.id.split('_')[0],upsells:[...i.upsells,...(i.id.startsWith('matrac_')?s.extras.filter(x=>x.startsWith('matrac_')).map(x=>x.slice(7)):[])]}]));
 const globalUpsells=Object.fromEntries(s.extras.filter(x=>x.startsWith('karpit_')).map(x=>[x,{category:'karpit',upsellId:x.slice(7)}]));
 h.run(`Object.assign(State,${JSON.stringify({selectedItems,globalUpsells,city:s.city,travelZone:s.travelZone})});updateSummary();`);
 const r=api.calculate(s);
 assert.deepEqual([r.total,r.duration,r.discount,r.isLargeOrder],h.json('[State.totalPrice,State.totalDuration,State.discount,State.isLargeOrder]'),JSON.stringify(s));
 assert.equal(api.assertTariff(h.json('activePricing()'),h.json('UPSELLS'),h.json('DISCOUNTS'),s),true);
 return r;
}
test('explicit owner price examples, one/two sides and cleaning-time additions',()=>{
 assert.equal(compare(selection([item('karpit_szofa',1,['atkairtas'])])).total,11900);
 assert.equal(compare(selection([item('karpit_l_kanape',1,['atkairtas'])])).total,21900);
 assert.equal(compare(selection([item('matrac_francia_a')],['matrac_nedves_tisztitas'])).total,8800);
 assert.equal(compare(selection([item('matrac_francia_ab')],['matrac_nedves_tisztitas'])).total,11700);
});
test('Studio and booking agree across every item, extras, quantities, zones and discount boundaries',()=>{
 let cases=0;
 for(const p of api.catalog)for(const count of [1,2,3,10])for(const zone of ['',...Object.keys(api.zones)]){
  const sofa=/karpit_(szofa|l_kanape|u_kanape)$/.test(p.id);
  const opts=p.sides?[[],['matrac_nedves_tisztitas'],['matrac_agykeret'],['matrac_nedves_tisztitas','matrac_agykeret']]:[[],['karpit_folteltavolitas'],['karpit_impregnalas','karpit_szagtalanitas']];
  for(const extras of opts){compare(selection([item(p.id,count,sofa?['atkairtas','agyazhato']:[])],extras,zone));cases++;}
 }
 for(const zone of Object.keys(api.zones))compare(selection([item('karpit_l_kanape',2,['atkairtas']),item('matrac_francia_ab'),item('matrac_gyerek_a')],Object.keys(api.extras),zone));
 assert.equal(cases,1000);
});
test('Győr reductions stop at city limits and changing location restores the standard tariff',()=>{
 for(const [city,zone,expected]of [['gyor','belvaros',7900],['gyor','kulso',7900],['gyor','20km',22500],['gyor','40km',23500],['mosonmagyarovar','belvaros',21500],['papa','kulso',22000],['szombathely','belvaros',21500],['tatabanya','kulso',22000],['gyor','belvaros',7900]]){
  const s={...selection([item('karpit_szofa')],[],zone),city,sourcePage:'karpittisztitas-'+city+'.html'};
  assert.equal(compare(s).total,expected,city+'/'+zone);
 }
});
test('local wet mattress totals undercut researched benchmarks including both sides',()=>{
 for(const [id,expected,benchmark]of [['egyagyas_a',6800,7000],['egyagyas_ab',9700,10000],['francia_a',8800,10000],['francia_ab',11700,12000],['gyerek_ab',5700,6000],['kisagy_ab',5200,6000]]){
  const r=compare(selection([item('matrac_'+id)],['matrac_nedves_tisztitas']));assert.equal(r.total,expected);assert.ok(r.total<benchmark);
 }
});
test('a local price preview cannot import into an outdated main-booking tariff',()=>{
 const s=selection([item('karpit_szofa')]);
 assert.throws(()=>api.assertTariff(h.json('PRICING'),h.json('UPSELLS'),h.json('DISCOUNTS'),s),/díjak/);
});
test('changed extra tariffs fail before a cart can be imported',()=>{
 const s=selection([item('karpit_szofa',1,['atkairtas']),item('matrac_francia_ab')],['matrac_nedves_tisztitas']);
 const p=h.json('PRICING');p.karpit.szofa.atkaPrice=6000;
 assert.throws(()=>api.assertTariff(p,h.json('UPSELLS'),h.json('DISCOUNTS'),s),/díjak/);
 p.karpit.szofa.atkaPrice=4000;p.matrac.francia_ab.wetPrice=8500;
 assert.throws(()=>api.assertTariff(p,h.json('UPSELLS'),h.json('DISCOUNTS'),s),/díjak/);
});

const require=createRequire(path.join(process.env.TEMP,'ecoclean-demo-qa/package.json'));
const {JSDOM}=require('jsdom');
async function importFixture(s,tamper=false){
 const dom=new JSDOM(source('megrendeles.html'),{runScripts:'outside-only',url:'https://ecocleantisztito.hu/megrendeles.html'+api.encode(s)}),w=dom.window;
 // Classic scripts share global lexical bindings; separate indirect eval calls do not.
 w.eval=code=>vm.runInContext(code,dom.getInternalVMContext());
 await new Promise(resolve=>w.document.readyState==='loading'?w.document.addEventListener('DOMContentLoaded',resolve,{once:true}):resolve());
 w.HTMLElement.prototype.scrollIntoView=function(){};w.scrollTo=()=>{};
 w.fetch=()=>{throw Error('No network allowed in import test');};w.alert=()=>{};
 w.eval(`var BookingCalendar={init(){},setCity(){},resetSelection(){},setRequiredDuration(){}};`);
 w.eval(source('ui/booking-live.js'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 w.eval(source('studio/configurator.js'));
 w.eval("State.selectedItems={karpit_fotel:{count:1,category:'karpit',upsells:[]}};State.travelZone='kulso';updateSummary();");
 if(tamper)w.eval('PRICING.karpit.szofa.atkaPrice=6000;');
 const before=w.eval('JSON.stringify(State.selectedItems)');
 w.eval(source('studio/booking-handoff.js'));
 w.document.querySelector('[data-studio-import]').click();
 return {dom,w,before};
}
test('actual DOM handoff transfers mattress extras to each item and preserves calculated totals',async()=>{
 const s=selection([item('karpit_szofa',1,['atkairtas']),item('matrac_francia_ab'),item('matrac_gyerek_a')],['matrac_nedves_tisztitas','matrac_agykeret']);
 const {dom,w}=await importFixture(s);
 try{
  assert.match(w.document.querySelector('.studio-handoff [role="status"]').textContent,/tételeket átvettük/);
  assert.deepEqual(JSON.parse(w.eval('JSON.stringify(State.selectedItems.matrac_francia_ab.upsells)')),['nedves_tisztitas','agykeret']);
  assert.equal(w.eval('State.totalPrice'),api.calculate(s).total);
  assert.equal(w.eval('State.totalDuration'),api.calculate(s).duration);
 }finally{dom.window.close();}
});
test('actual DOM handoff rejects a stale tariff without replacing the existing cart',async()=>{
 const {dom,w,before}=await importFixture(selection([item('karpit_szofa',1,['atkairtas'])]),true);
 try{assert.equal(w.eval('JSON.stringify(State.selectedItems)'),before);assert.match(w.document.querySelector('.studio-handoff [role="status"]').textContent,/díjak/);}finally{dom.window.close();}
});
test('actual form shows correct item, mattress-extra and travel prices after city changes',async()=>{
 const {dom,w}=await importFixture(selection([item('karpit_szofa'),item('matrac_francia_ab')],['matrac_nedves_tisztitas']));
 try{
  const normalize=s=>s.replace(/\s/g,'');
  assert.equal(normalize(w.document.querySelector('[data-item-id="karpit_szofa"] .item-price').textContent),'7900Ft');
  assert.equal(normalize(w.document.querySelector('[name="travelZone"][value="belvaros"]').closest('label').querySelector('.zone-price').textContent),'0Ft');
  const before=w.eval('JSON.stringify(State.selectedItems)');
  w.eval("handleCityChange({value:'papa'})");
  assert.equal(w.eval('JSON.stringify(State.selectedItems)'),before);
  assert.equal(normalize(w.document.querySelector('[data-item-id="karpit_szofa"] .item-price').textContent),'18000Ft');
  assert.match(w.document.querySelector('[data-item-id="matrac_francia_ab"] .mattress-extra .upsell-price').textContent.replace(/\s/g,''),/6000/);
  assert.equal(normalize(w.document.querySelector('[name="travelZone"][value="belvaros"]').closest('label').querySelector('.zone-price').textContent),'3500Ft');
  w.eval("handleCityChange({value:'gyor'});handleZoneChange({value:'20km'})");
  assert.equal(normalize(w.document.querySelector('[data-item-id="karpit_szofa"] .item-price').textContent),'18000Ft');
  w.eval("handleZoneChange({value:'kulso'})");
  assert.equal(normalize(w.document.querySelector('[data-item-id="karpit_szofa"] .item-price').textContent),'7900Ft');
  assert.match(w.document.querySelector('[data-item-id="matrac_francia_ab"] .mattress-extra .upsell-price').textContent.replace(/\s/g,''),/1900/);
 }finally{dom.window.close();}
});
test('Győr published copy and structured data contain the confirmed drying range and current booking channels',()=>{
 for(const name of ['index.html','karpittisztitas-gyor.html','matractisztitas-gyor.html','en/index.html','en/upholstery-cleaning-gyor.html','en/mattress-cleaning-gyor.html']){
  const html=source(name);assert.ok(html.includes('6–12'),name);
  assert.doesNotMatch(html,/hamarosan\s+(?:elérhető|indul)|by SMS only|coming soon|száradási idő mindössze 2-4|instant drying|Száradási idő kb\. 24/i,name);
  const dom=new JSDOM(html);for(const el of dom.window.document.querySelectorAll('script[type="application/ld+json"]'))assert.doesNotThrow(()=>JSON.parse(el.textContent));dom.window.close();
 }
});
test('every reference to a changed script uses its current content hash',()=>{
 const scripts=['ui/booking-live.js','ui/booking-live-en.js','studio/configurator.js','studio/booking-handoff.js'];
 for(const asset of scripts){
  const expected=crypto.createHash('sha256').update(source(asset)).digest('hex').slice(0,12);
  const pattern=new RegExp(asset.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\?v=([a-zA-Z0-9_-]+)','g');let found=0;
  for(const dir of ['', 'en'])for(const name of fs.readdirSync(path.join(root,'release',dir)).filter(n=>n.endsWith('.html'))){
   for(const m of source(path.posix.join(dir,name)).matchAll(pattern)){assert.equal(m[1],expected,dir+'/'+name+' '+asset);found++;}
  }
  assert.ok(found>0,asset);
 }
});
test('new shared configurator guidance is English on the English page',()=>{
 const dom=new JSDOM(source('en/upholstery-cleaning-gyor.html'),{runScripts:'outside-only',url:'https://ecocleantisztito.hu/en/upholstery-cleaning-gyor.html'});
 try{vm.runInContext(source('studio/configurator.js'),dom.getInternalVMContext());dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  const text=dom.window.document.querySelector('[data-studio-configurator]').textContent;
  assert.match(text,/Wet cleaning usually needs 6–12 hours/);assert.doesNotMatch(text,/Nedves tisztítás után a száradás általában/);
 }finally{dom.window.close();}
});
