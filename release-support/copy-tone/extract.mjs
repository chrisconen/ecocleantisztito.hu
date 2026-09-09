import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const root=path.resolve(import.meta.dirname,'../..');
const require=createRequire(path.join(process.env.TEMP,'ecoclean-demo-qa/package.json'));
const {JSDOM}=require('jsdom');
const acorn=require('acorn'),walkJS=require('acorn-walk');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'release-support/release-manifest.json'),'utf8'));
const rows=new Map();
function add(text,file,kind){text=text.replace(/\s+/g,' ').trim();if(!text||!/[a-zA-ZáéíóöőúüűÁÉÍÓÖŐÚÜŰ]/.test(text))return;const id=crypto.createHash('sha256').update(text).digest('hex').slice(0,16);if(!rows.has(id))rows.set(id,{id,text,kinds:[],files:[]});const row=rows.get(id);if(!row.files.includes(file))row.files.push(file);if(!row.kinds.includes(kind))row.kinds.push(kind);}
for(const file of Object.keys(manifest.files).filter(f=>f.endsWith('.html'))){
 const d=new JSDOM(fs.readFileSync(path.join(root,'release',file),'utf8')).window.document;
 const walk=d.createTreeWalker(d.documentElement,4);
 while(walk.nextNode()){const n=walk.currentNode;if(n.parentElement?.closest('script,style,svg'))continue;add(n.textContent,file,'text');}
 for(const el of d.querySelectorAll('*')){
  for(const attr of ['alt','title','aria-label','aria-description','aria-valuetext','placeholder'])if(el.hasAttribute(attr))add(el.getAttribute(attr),file,'attribute');
  if(el.tagName==='META'&&['description','og:title','og:description','twitter:title','twitter:description'].includes(el.getAttribute('name')||el.getAttribute('property')))add(el.getAttribute('content'),file,'meta');
  if(el.tagName==='INPUT'&&['submit','button','reset'].includes(el.type)&&el.value)add(el.value,file,'attribute');
 }
 for(const script of d.querySelectorAll('script:not([src])')){if(script.textContent.trim()&&(!script.type||script.type==='text/javascript'))addJS(script.textContent,file);}
 for(const script of d.querySelectorAll('script[type="application/ld+json"]')){const scan=(v)=>{if(typeof v==='string')add(v,file,'jsonld');else if(Array.isArray(v))v.forEach(scan);else if(v&&typeof v==='object')Object.values(v).forEach(scan);};scan(JSON.parse(script.textContent));}
 d.defaultView.close();
}
function addJS(source,file){const tree=acorn.parse(source,{ecmaVersion:'latest',sourceType:'script'});walkJS.simple(tree,{Literal(n){if(typeof n.value==='string')add(n.value,file,'runtime');},TemplateElement(n){if(n.value.cooked)add(n.value.cooked,file,'runtime-template');}});}
for(const file of Object.keys(manifest.files).filter(f=>f.endsWith('.js')))addJS(fs.readFileSync(path.join(root,'release',file),'utf8'),file);
fs.mkdirSync(import.meta.dirname,{recursive:true});
const prefix=process.argv.includes('--final')?'final-':'';
const all=[...rows.values()];fs.writeFileSync(path.join(import.meta.dirname,prefix+'corpus.json'),JSON.stringify(all,null,2)+'\n');
const formal=/(?:\bÖn(?:nek|nel|t|ök|öket|öknek|ökkel)?\b|\bön(?:nek|nel|t|ök|öket|öknek|ökkel)?\b|szeretne|szeretné|kérjen|kérjük|hívjon|válasszon|válassza|foglaljon|foglalja|adja|adjon|írjon|küldje|küldjön|olvassa|nézze|ismerje|tudja|tudjon|tudta|legyen|tekintse|ellenőrizze|vegye|töltse|tartsa|élvezze|látogasson|próbálja|kattintson|kattintva|konfigurálja|családja|otthona|bútorai|kanapéja|matraca|biztonsága|egészsége|igényei|számára|számíthat|számolhat|bízza|dőljön|kockáztasson|győződjön|érdeklődjön|keressen|segítsen|vásároljon|tegye|helyezze|hagyja|olvasson|válaszoljon|találja|mondja|jelölje|jelentkezzen|értesüljön)/iu;
const candidates=all.filter(r=>formal.test(r.text));fs.writeFileSync(path.join(import.meta.dirname,prefix+'candidates.json'),JSON.stringify(candidates,null,2)+'\n');
console.log(JSON.stringify({unique:all.length,candidates:candidates.length,characters:JSON.stringify(all).length}));
