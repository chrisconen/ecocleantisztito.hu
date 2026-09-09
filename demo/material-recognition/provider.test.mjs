import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {integrateMaterialRecognition} from './component.mjs';
const require=createRequire(path.join(process.env.TEMP,'ecoclean-demo-qa/package.json'));
const {JSDOM}=require('jsdom'),source=fs.readFileSync(new URL('./app.js',import.meta.url),'utf8');
const answer={kep_tipus:'anyag',anyag:'Buklé',anyag_alt:'Szemléltető tesztválasz',biztonsag:70,indoklas:'Hurkolt textúra.',tisztitasi_kod:'ismeretlen',modszer:'Gyártói címke szükséges.',kerulendo:[],kockazatok:[],ellenorzes:'Anyagpróba.',kerdes_ugyfelnek:'Van címke?'};
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
 const f=await fixture();try{simple(f.d);assert.equal(f.d.querySelector('[data-material-archive-consent]').checked,false);await f.photo();assert.equal(f.requests.length,0);f.analyze();await settle();assert.equal(f.requests.length,1);assert.deepEqual(Object.keys(f.requests[0].body).sort(),['archive_consent','image','media_type','note']);assert.equal(f.requests[0].body.archive_consent,false);simple(f.d);assert.match(f.d.querySelector('.eco-material-confidence label').textContent,/Előzetes becslés/);assert.equal(f.d.querySelector('.eco-material-result-actions a').getAttribute('href'),'#booking');}finally{f.close();}
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

