import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const require=createRequire(path.join(process.env.TEMP,'ecoclean-demo-qa/package.json'));
const {JSDOM}=require('jsdom');
const root=path.resolve(import.meta.dirname,'../../release'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const baseline=JSON.parse(fs.readFileSync(path.join(import.meta.dirname,'../gyor-conversion/rollout-baseline.json')));
test('all financial engines and existing southern mattress pages remain unchanged',()=>{
 for(const [file,hash]of Object.entries(baseline.runtimes))assert.equal(sha(fs.readFileSync(path.join(root,file))),hash,file);
 for(const city of ['baja','dunafoldvar','kalocsa','kiskoros','paks','solt','szekszard'])for(const en of [false,true]){
  const file=(en?'en/mattress-cleaning-':'matractisztitas-')+city+'.html';
  const before=execFileSync('git',['show','d47eac731aaefd280a989fc9cfec9bb659720740:release/'+file]);
  assert.equal(sha(fs.readFileSync(path.join(root,file))),sha(before),file);
 }
});
test('all 52 booking-city mattress pages retain price grids and route every booking CTA through the local calculator',()=>{
 let count=0;
 for(const [file,info]of Object.entries(baseline.pages)){
  if(!info.studio)continue;
  const en=file.startsWith('en/'),name=(en?'en/mattress-cleaning-':'matractisztitas-')+info.city+'.html',html=read(name);
  const before=execFileSync('git',['show','d47eac731aaefd280a989fc9cfec9bb659720740:release/'+name],{encoding:'utf8'});
  const pricing=s=>s.match(/<section class="pricing"[\s\S]*?<\/section>/)?.[0];assert.ok(pricing(html),name);assert.equal(pricing(html),pricing(before),name);
  const dom=new JSDOM(html),d=dom.window.document,calc=d.querySelector('[data-mattress-calculator]');assert.ok(calc,name);assert.equal(calc.dataset.city,info.city);assert.equal(calc.dataset.bookingUrl,en?'booking.html':'megrendeles.html');
  assert.ok(d.querySelector('a[href="#matrac-kalkulator"]'),name);assert.doesNotMatch(html,/href="(?:index|booking|megrendeles)\.html#booking"/,name);
  const ids=[...d.querySelectorAll('[id]')].map(e=>e.id);assert.equal(new Set(ids).size,ids.length,name);dom.window.close();count++;
 }
 assert.equal(count,52);
});
test('mattress UI retains multiple variants, both-side extras, regional tariffs, reset and validated cart encoding',async()=>{
 for(const city of ['gyor','szombathely'])for(const en of [false,true]){
  const dom=new JSDOM(`<html lang="${en?'en':'hu'}"><body><div data-mattress-calculator data-city="${city}" data-booking-url="${en?'booking.html':'megrendeles.html'}"></div></body></html>`,{url:'https://ecocleantisztito.hu/',runScripts:'outside-only'}),w=dom.window;
  const run=s=>vm.runInContext(s,dom.getInternalVMContext());w.HTMLElement.prototype.focus=function(){};
  await new Promise(resolve=>w.document.readyState==='loading'?w.document.addEventListener('DOMContentLoaded',resolve,{once:true}):resolve());
  run(read('studio/configurator.js'));run(read('ui/mattress-calculator.js'));
  const d=w.document,calc=d.querySelector('[data-mattress-calculator]'),api=w.EcoStudioConfig;
  assert.ok(calc.mattressCalculator);
  const change=(selector,value)=>{const el=d.querySelector(selector);if(el.type==='checkbox')el.checked=value;else el.value=value;el.dispatchEvent(new w.Event('change',{bubbles:true}));};
  const add=id=>{change('[data-mc-type]',id);d.querySelector('[data-mc-delta="1"]').click();};
  add('matrac_francia_ab');add('matrac_egyagyas_a');change('[data-mc-extra="matrac_nedves_tisztitas"]',true);change('[data-mc-extra="matrac_agykeret"]',true);
  for(const zone of ['belvaros','20km']){
   change('[data-mc-zone]',zone);
   const s=JSON.parse(JSON.stringify(calc.mattressCalculator.snapshot())),expected={version:1,sourcePage:'matractisztitas-'+city+'.html',city,travelZone:zone,items:[{id:'matrac_francia_ab',count:1,upsells:[]},{id:'matrac_egyagyas_a',count:1,upsells:[]}],extras:['matrac_nedves_tisztitas','matrac_agykeret']};
   assert.deepEqual(s,expected);assert.equal(Number(d.querySelector('[data-mc-total]').textContent.replace(/\D/g,'')),api.calculate(expected).total);
   assert.deepEqual(JSON.parse(JSON.stringify(api.decode(new URL(d.querySelector('[data-mc-booking]').href).hash))),expected);
  }
  change('[data-mc-type]','matrac_egyagyas_a');d.querySelector('[data-mc-delta="1"]').click();assert.equal(calc.mattressCalculator.calculate().discountPercent,5);
  d.querySelector('[data-mc-remove="matrac_francia_ab"]').click();assert.equal(calc.mattressCalculator.snapshot().items.length,1);
  d.querySelector('[data-mc-reset]').click();assert.equal(calc.mattressCalculator.calculate().total,0);assert.equal(d.querySelector('[data-mc-booking]').hasAttribute('href'),false);
  if(en)assert.doesNotMatch(d.querySelector('[data-mc-type]').textContent,/Egyágyas|Franciaágy|oldal/);
  dom.window.close();
 }
});
