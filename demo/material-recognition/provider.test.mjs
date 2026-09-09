import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {integrateMaterialRecognition,novaLifeCTA} from './component.mjs';
const require=createRequire(path.join(process.env.TEMP,'ecoclean-demo-qa/package.json'));
const {JSDOM}=require('jsdom'),source=fs.readFileSync(new URL('./app.js',import.meta.url),'utf8');
const answer={novalife:{status:'likely_other',reason:'A szövetszerkezet más kárpitra utal.'},kep_tipus:'anyag',anyag:'Buklé',anyag_alt:'Szemléltető tesztválasz',biztonsag:70,indoklas:'Hurkolt textúra.',tisztitasi_kod:'ismeretlen',modszer:'Gyártói címke szükséges.',kerulendo:[],kockazatok:[],ellenorzes:'Anyagpróba.',kerdes_ugyfelnek:'Van címke?'};
const settle=async()=>{for(let i=0;i<4;i++)await new Promise(resolve=>setImmediate(resolve));};
const simple=d=>{assert.equal(d.querySelectorAll('[data-material-provider],input[type=radio]').length,0);assert.doesNotMatch(d.querySelector('.eco-material').textContent,/Gemini|OpenAI|Anthropic|GPT-|Google|\bAI\b|modell/i);};
async function fixture({health={ready:true,enabled:true,collection_enabled:true},post=async()=>({ok:true,status:200,json:async()=>answer})}={}){
 const dom=new JSDOM('<!doctype html><html><head></head><body><section id="booking"></section><footer></footer></body></html>',{url:'http://127.0.0.1:8089/demo/index.html',runScripts:'outside-only'}),w=dom.window,d=w.document,requests=[];
 integrateMaterialRecognition(d,{home:true});w.matchMedia=()=>({matches:true});w.AbortController=AbortController;w.AbortSignal=AbortSignal;w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.createImageBitmap=async()=>({width:800,height:600,close(){}});w.HTMLCanvasElement.prototype.getContext=()=>({fillRect(){},drawImage(){}});w.HTMLCanvasElement.prototype.toDataURL=()=> 'data:image/jpeg;base64,dGVzdA==';
 w.fetch=async(url,options)=>{if(url.endsWith('/api/material-health'))return {ok:true,json:async()=>health};requests.push({url,body:JSON.parse(options.body)});return post(requests.at(-1));};
 w.eval(source);await settle();return {d,requests,photo:async()=>{const input=d.querySelector('[data-material-file]');Object.defineProperty(input,'files',{value:[new w.File(['photo'],'test.jpg',{type:'image/jpeg'})],configurable:true});input.dispatchEvent(new w.Event('change'));await settle();},analyze:()=>d.querySelector('[data-material-analyze]').click(),close:()=>dom.window.close()};
}
test('owner-only routing: no customer selector, no model names, exact public payload',async()=>{
 const f=await fixture();try{simple(f.d);assert.equal(f.d.querySelector('[data-material-archive-consent]').checked,false);await f.photo();assert.equal(f.requests.length,0);f.analyze();await settle();assert.equal(f.requests.length,1);assert.deepEqual(Object.keys(f.requests[0].body).sort(),['archive_consent','image','media_type','note']);assert.equal(f.requests[0].body.archive_consent,false);simple(f.d);assert.match(f.d.querySelector('.eco-material-confidence strong').textContent,/Más szövetre utaló jelek/);assert.equal(f.d.querySelector('meter'),null);assert.equal(f.d.querySelector('.eco-material-result-actions a').getAttribute('href'),'#booking');}finally{f.close();}
});
test('optional consent applies only to selected photo and resets for a new image',async()=>{
 const f=await fixture();try{await f.photo();f.d.querySelector('[data-material-archive-consent]').click();f.analyze();await settle();assert.equal(f.requests[0].body.archive_consent,true);assert.equal('provider' in f.requests[0].body,false);await f.photo();assert.equal(f.d.querySelector('[data-material-archive-consent]').checked,false);}finally{f.close();}
});
test('disabled collection does not prevent analysis or send forced consent',async()=>{
 const f=await fixture({health:{ready:true,collection_enabled:false}});try{const c=f.d.querySelector('[data-material-archive-consent]');assert.equal(c.disabled,true);c.checked=true;await f.photo();f.analyze();await settle();assert.equal(f.requests[0].body.archive_consent,false);}finally{f.close();}
});
test('ready-only legacy health works and private provider metadata is ignored',async()=>{
 const f=await fixture({health:{ready:true,providers:[{id:'gemini',label:'Gemini',ready:true}],default_provider:'gemini'}});try{simple(f.d);assert.equal(f.d.querySelector('[data-material-archive-consent]').disabled,true);await f.photo();f.analyze();await settle();assert.equal('provider' in f.requests[0].body,false);}finally{f.close();}
});
test('one request per click while busy; metadata cannot add a model label',async()=>{
 let finish;const pending=new Promise(resolve=>finish=resolve),f=await fixture({post:()=>pending});try{await f.photo();f.analyze();f.analyze();await settle();assert.equal(f.requests.length,1);assert.equal(f.d.querySelector('[data-material-archive-consent]').disabled,true);finish({ok:true,status:200,json:async()=>({...answer,_meta:{provider:'gemini',model:'internal-model',archive_saved:false}})});await settle();simple(f.d);}finally{f.close();}
});
test('archive confirmed despite failed analysis; sample does not send or deny a prior upload',async()=>{
 const f=await fixture({post:async()=>({ok:false,status:502,json:async()=>({_meta:{archive_saved:true}})})});try{await f.photo();f.d.querySelector('[data-material-archive-consent]').click();f.analyze();await settle();assert.match(f.d.querySelector('[data-material-status]').textContent,/már megőriztük/);f.d.querySelector('[data-material-example]').click();await settle();assert.equal(f.requests.length,1);assert.match(f.d.querySelector('[data-material-status]').textContent,/nem indítottunk új/);simple(f.d);}finally{f.close();}
});
test('unavailable service keeps analysis disabled and sample accessible',async()=>{
 const f=await fixture({health:{ready:false,collection_enabled:true}});try{await f.photo();assert.equal(f.d.querySelector('[data-material-analyze]').disabled,true);f.analyze();assert.equal(f.requests.length,0);f.d.querySelector('[data-material-example]').click();assert.equal(f.d.querySelector('[data-material-result]').hidden,false);simple(f.d);}finally{f.close();}
});

test('premium NovaLife CTA is portable, has no IDs or emoji, and points to the real widget',()=>{
 for(const compact of [false,true]){const d=new JSDOM(novaLifeCTA({compact})).window.document;assert.equal(d.querySelectorAll('[id]').length,0);assert.equal(d.querySelector('.eco-novalife-cta').classList.contains('eco-novalife-cta-compact'),compact);assert.equal(d.querySelector('a').getAttribute('href'),'#anyagfelismero');assert.equal(d.querySelector('h3').textContent,'Bizonytalan, hogy NovaLife a kárpit?');assert.equal(d.querySelector('svg').getAttribute('focusable'),'false');assert.equal(d.querySelector('img'),null);assert.doesNotMatch(d.body.textContent,/\p{Extended_Pictographic}/u);}
});

for(const [status,heading,kind] of [
 ['likely_other','A fotó alapján valószínűleg nem NovaLife.','anyag'],
 ['possible_novalife','NovaLife vagy hasonló bevonat gyanúja','anyag'],
 ['label_novalife','NovaLife-jelölés látható','cimke'],
 ['uncertain','A NovaLife nem zárható ki a fotóból','anyag']
])test(`NovaLife ${status}: deterministic guidance, no numeric confidence or cleaning clearance`,async()=>{
 const data={...answer,kep_tipus:kind,biztonsag:100,novalife:{status,reason:'Ellenőrzésre váró képi részlet.'}};
 const f=await fixture({post:async()=>({ok:true,status:200,json:async()=>data})});try{await f.photo();f.analyze();await settle();const panel=f.d.querySelector('[data-novalife-status]');assert.equal(panel.dataset.novalifeStatus,status);assert.equal(panel.querySelector('h3').textContent,heading);assert.doesNotMatch(f.d.querySelector('[data-material-result]').textContent,/\d\s*%|biztonságosan tisztítható|garantáltan|100/);assert.equal(f.d.querySelector('meter,[role=meter]'),null);assert.equal(f.d.querySelector('.eco-material-result-actions a').getAttribute('href'),status==='likely_other'?'#booking':'tel:+36702408141');if(status==='likely_other')assert.match(panel.textContent,/címke és a helyszíni anyagpróba/);assert.equal(f.d.querySelector('.eco-material-result-grid').children.length,6);simple(f.d);}finally{f.close();}
});

test('missing or invalid NovaLife status never defaults to clearance',async()=>{
 for(const novalife of [undefined,{status:'safe',reason:'Invalid state'}]){const f=await fixture({post:async()=>({ok:true,status:200,json:async()=>({...answer,novalife})})});try{await f.photo();f.analyze();await settle();assert.equal(f.d.querySelector('[data-novalife-status]').dataset.novalifeStatus,'uncertain');assert.equal(f.d.querySelectorAll('[data-material-followup]').length,2);assert.equal(f.d.querySelector('.eco-material-result-actions a').getAttribute('href'),'tel:+36702408141');}finally{f.close();}}
});

test('a fabric photograph cannot claim a read NovaLife label; unusable input stays uncertain',async()=>{
 for(const [kind,expected] of [['anyag','possible_novalife'],['hasznalhatatlan','uncertain']]){const f=await fixture({post:async()=>({ok:true,status:200,json:async()=>({...answer,kep_tipus:kind,novalife:{status:'label_novalife',reason:'Mock label statement'}})})});try{await f.photo();f.analyze();await settle();assert.equal(f.d.querySelector('[data-novalife-status]').dataset.novalifeStatus,expected);}finally{f.close();}}
});

test('follow-up label/detail buttons open the real chooser and new selection resets consent',async()=>{
 const f=await fixture({post:async()=>({ok:true,status:200,json:async()=>({...answer,novalife:{status:'uncertain',reason:'További részlet kell.'}})})});try{await f.photo();f.analyze();await settle();let clicks=0;f.d.querySelector('[data-material-file]').click=()=>clicks++;f.d.querySelector('[data-material-followup=label]').click();f.d.querySelector('[data-material-followup=detail]').click();assert.equal(clicks,2);assert.equal(f.requests.length,1);f.d.querySelector('[data-material-archive-consent]').checked=true;await f.photo();assert.equal(f.d.querySelector('[data-material-archive-consent]').checked,false);assert.equal(f.d.querySelector('[data-material-result]').hidden,true);}finally{f.close();}
});

test('NovaLife reason is rendered as text, never executable markup',async()=>{
 const malicious='<img src=x onerror="window.injected=true">';const f=await fixture({post:async()=>({ok:true,status:200,json:async()=>({...answer,novalife:{status:'possible_novalife',reason:malicious}})})});try{await f.photo();f.analyze();await settle();const panel=f.d.querySelector('[data-novalife-status]');assert.equal(panel.querySelector('.eco-material-novalife-reason').textContent,malicious);assert.equal(panel.querySelector('img'),null);}finally{f.close();}
});

test('copied result retains the NovaLife reason and its limitation alongside the headline',async()=>{
 const reason='A hurkolt felület más szövetre utal, de a bevonat a fotóból nem zárható ki.';
 const f=await fixture({post:async()=>({ok:true,status:200,json:async()=>({...answer,novalife:{status:'likely_other',reason}})})});
 try{let clipboard='';Object.defineProperty(f.d.defaultView.navigator,'clipboard',{value:{writeText:async text=>{clipboard=text;}},configurable:true});await f.photo();f.analyze();await settle();f.d.querySelector('.eco-material-result-actions button').click();await settle();const lines=clipboard.split('\n');assert.equal(lines[1],'A fotó alapján valószínűleg nem NovaLife.');assert.equal(lines[2],reason);assert.match(lines[3],/címke és a helyszíni anyagpróba/);assert.match(f.d.querySelector('.eco-material-copy-status').textContent,/kimásoltuk/);}finally{f.close();}
});

