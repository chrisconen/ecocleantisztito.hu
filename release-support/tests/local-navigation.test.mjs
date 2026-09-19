import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {regionalPage} from '../content-clarity/local-navigation.mjs';
const require=createRequire(path.join(process.env.TEMP,'ecoclean-demo-qa/package.json'));
const {JSDOM}=require('jsdom');
const root=path.resolve(import.meta.dirname,'../../release');
const files=fs.readdirSync(root).filter(n=>n.endsWith('.html')).concat(fs.readdirSync(path.join(root,'en')).filter(n=>n.endsWith('.html')).map(n=>'en/'+n));
test('every city page has local service navigation and no cross-city internal service links',()=>{
 const cities=new Set();let pages=0;
 for(const file of files){
  const region=regionalPage(file);if(!region)continue;cities.add(region.city);pages++;
  const dom=new JSDOM(fs.readFileSync(path.join(root,file),'utf8'));
  try{
   const d=dom.window.document;
   assert.ok(d.querySelector('.eco-local-nav'),file+' missing local navigation');
   if(region.service)assert.ok(d.querySelector('.eco-local-nav a[aria-current="page"]'),file+' missing current page');
   for(const a of d.querySelectorAll('a[href]')){
    const href=a.getAttribute('href');if(/^(?:[a-z]+:|\/\/|#)/i.test(href))continue;
    const target=regionalPage(href.split(/[?#]/)[0]);if(target)assert.equal(target.city,region.city,file+' -> '+href);
    assert.ok(fs.existsSync(path.resolve(root,path.posix.dirname(file),href.split(/[?#]/)[0])),file+' missing '+href);
   }
   for(const a of d.querySelectorAll('.eco-local-nav a'))assert.ok(regionalPage(a.getAttribute('href')),file+' nonlocal menu');
   for(const ul of d.querySelectorAll('footer ul')){
    const targets=[...ul.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')).filter(h=>regionalPage(h));
    assert.equal(targets.length,new Set(targets).size,file+' repeated footer service');
   }
  }finally{dom.window.close();}
 }
 assert.equal(cities.size,33);assert.equal(pages,203);
});
test('central homepage retains city discovery and direct regional URLs remain canonical',()=>{
 const home=fs.readFileSync(path.join(root,'index.html'),'utf8');
 for(const city of ['gyor','szombathely','tatabanya']){
  assert.ok(home.includes('karpittisztitas-'+city+'.html'));
  const dom=new JSDOM(fs.readFileSync(path.join(root,'karpittisztitas-'+city+'.html'),'utf8'));
  assert.equal(dom.window.document.querySelector('link[rel="canonical"]').href,'https://ecocleantisztito.hu/karpittisztitas-'+city+'.html');dom.window.close();
 }
});
