/* Reversible copy-only layer. Claude supplies wording; this applies exact ranges. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const root=path.resolve(import.meta.dirname,'../..'),out=path.join(root,'release'),dir=import.meta.dirname;
const require=createRequire(path.join(process.env.TEMP,'ecoclean-demo-qa/package.json'));
const {JSDOM}=require('jsdom'),acorn=require('acorn'),walk=require('acorn-walk');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const normalize=s=>s.replace(/\s+/g,' ').trim();
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const write=process.argv.includes('--write');
const manifestPath=path.join(root,'release-support/release-manifest.json');
const current=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const manifestBytes=current.copyOverlay?fs.readFileSync(path.join(dir,'baseline-manifest.json')):fs.readFileSync(manifestPath);
const baseline=JSON.parse(manifestBytes);
const verificationBytes=current.copyOverlay?fs.readFileSync(path.join(dir,'baseline-verification.json')):fs.readFileSync(path.join(root,'release-support/release-verification.json'));
const verification=JSON.parse(verificationBytes);
if(verification.issues.length||verification.manifestSha256!==hash(manifestBytes)||baseline.copyOverlay)throw Error('Invalid pre-copy release proof');
const previous=current.copyOverlay?JSON.parse(fs.readFileSync(path.join(root,current.copyOverlay.path),'utf8')):null;
const translations=new Map(),uses=new Map();
const maps=fs.readdirSync(dir).filter(f=>/^claude-map-.*\.json$/.test(f)).sort();
if(!maps.length)throw Error('Claude maps not ready');
for(const file of maps){for(const row of JSON.parse(fs.readFileSync(path.join(dir,file),'utf8'))){
 if(typeof row.before!=='string'||typeof row.after!=='string'||!row.before.trim()||row.before===row.after)throw Error('Invalid copy row '+file);
 const before=normalize(row.before),after=normalize(row.after);
 if(translations.has(before)&&translations.get(before)!==after)throw Error('Conflicting copy for '+before);
 if(JSON.stringify(before.match(/\d+(?:[.,]\d+)*/g))!==JSON.stringify(after.match(/\d+(?:[.,]\d+)*/g)))throw Error('Copy changes numbers: '+before);
 translations.set(before,after);uses.set(before,0);
}}
function translated(text){const before=normalize(text);if(!translations.has(before))return null;uses.set(before,uses.get(before)+1);return text.match(/^\s*/)[0]+translations.get(before)+text.match(/\s*$/)[0];}
function source(file){let data=fs.readFileSync(path.join(out,file));const prev=previous?.files.find(r=>r.file===file);
 if(prev){let delta=0;const edits=prev.edits.map(e=>{const start=e.start+delta;delta+=Buffer.byteLength(e.after)-Buffer.byteLength(e.before);return {...e,start};});for(const e of edits.reverse()){const after=Buffer.from(e.after);if(!data.subarray(e.start,e.start+after.length).equals(after))throw Error('Current copy changed: '+file);data=Buffer.concat([data.subarray(0,e.start),Buffer.from(e.before),data.subarray(e.start+after.length)]);}}
 if(hash(data)!==baseline.files[file].sha256)throw Error('Baseline changed: '+file);return data.toString('utf8');}
function apply(source,edits){let result=source;let boundary=source.length;for(const e of [...edits].sort((a,b)=>b.start-a.start)){if(e.end>boundary||source.slice(e.start,e.end)!==e.before)throw Error('Overlapping or invalid copy');result=result.slice(0,e.start)+e.after+result.slice(e.end);boundary=e.start;}return result;}
function literal(value,quote){return quote+value.replaceAll('\\','\\\\').replaceAll(quote,'\\'+quote).replaceAll('\r','\\r').replaceAll('\n','\\n').replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029')+quote;}
function astShape(source,json=false){const ast=acorn.parse(json?'('+source+')':source,{ecmaVersion:'latest',sourceType:'script'});function clean(value){if(Array.isArray(value))return value.map(clean);if(value&&typeof value==='object'){const o={};for(const [k,v] of Object.entries(value)){if(['start','end','raw'].includes(k))continue;o[k]=(value.type==='Literal'&&k==='value'&&typeof v==='string')||(value.type==='TemplateElement'&&k==='value')?'COPY':clean(v);}return o;}return value;}return JSON.stringify(clean(ast));}
function jsEdits(source,base=0,json=false){const offset=json?-1:0,ast=acorn.parse(json?'('+source+')':source,{ecmaVersion:'latest',sourceType:'script'}),edits=[];
 walk.simple(ast,{Literal(node){if(typeof node.value!=='string')return;const after=translated(node.value);if(after===null)return;const start=node.start+offset,end=node.end+offset;const quote=source[start];if(!['"',"'"].includes(quote))throw Error('Unsupported literal');edits.push({start:base+start+1,end:base+end-1,before:source.slice(start+1,end-1),after:literal(after,quote).slice(1,-1),kind:json?'jsonld-string':'js-string'});},TemplateElement(node){const start=node.start+offset,end=node.end+offset,raw=source.slice(start,end);let after=translated(raw);if(after===null&&raw.includes('<'))after=htmlFragment(raw);if(after===null||after===raw)return;if((after.match(/`|\$\{/g)||[]).length!==(raw.match(/`|\$\{/g)||[]).length)throw Error('Changed interpolation');edits.push({start:base+start,end:base+end,before:raw,after,kind:'js-string'});}});
 const result=apply(source,edits.map(e=>({...e,start:e.start-base,end:e.end-base})));if(astShape(source,json)!==astShape(result,json))throw Error('JavaScript structure changed');return edits;}
function htmlFragment(source){const dom=new JSDOM(source,{includeNodeLocations:true});const edits=htmlEdits(source,dom,false);dom.window.close();return edits.length?apply(source,edits):null;}
function htmlEdits(source,dom,scripts=true){const d=dom.window.document,edits=[];const walker=d.createTreeWalker(d.documentElement,4);
 while(walker.nextNode()){const n=walker.currentNode;if(n.parentElement?.closest('script,style'))continue;const loc=dom.nodeLocation(n);if(!loc)continue;const after=translated(n.textContent);if(after!==null)edits.push({start:loc.startOffset,end:loc.endOffset,before:source.slice(loc.startOffset,loc.endOffset),after:escape(after),kind:'text'});}
 for(const el of d.querySelectorAll('*')){const loc=dom.nodeLocation(el);if(!loc)continue;
  const attrs=['alt','title','aria-label','aria-description','aria-valuetext','placeholder'];if(el.tagName==='INPUT'&&['submit','button','reset'].includes(el.type))attrs.push('value');if(el.tagName==='META'&&['description','og:title','og:description','twitter:title','twitter:description'].includes(el.getAttribute('name')||el.getAttribute('property')))attrs.push('content');
  for(const attr of attrs){if(!el.hasAttribute(attr))continue;const after=translated(el.getAttribute(attr)),span=loc.attrs?.[attr];if(after===null||!span)continue;const raw=source.slice(span.startOffset,span.endOffset),match=/^(\S+\s*=\s*)(["'])([\s\S]*)\2$/.exec(raw);if(!match)throw Error('Unquoted translatable attribute');const value=escape(after).replaceAll(match[2],match[2]==='"'?'&quot;':'&#39;');edits.push({start:span.startOffset+match[1].length+1,end:span.endOffset-1,before:match[3],after:value,kind:'attribute'});}
  if(scripts&&el.tagName==='SCRIPT'&&!el.src&&el.textContent.trim()){const type=el.getAttribute('type');if(!type||type==='text/javascript'||type==='application/ld+json'){const start=loc.startTag.endOffset,end=loc.endTag?.startOffset;if(Number.isInteger(end))edits.push(...jsEdits(source.slice(start,end),start,type==='application/ld+json'));}}
 }return edits;}
const changes=[],contents=new Map(),sources=new Map();
for(const file of Object.keys(baseline.files)){const raw=source(file);sources.set(file,raw);let edits=[];
 if(file.endsWith('.html')){const dom=new JSDOM(raw,{includeNodeLocations:true});edits=htmlEdits(raw,dom);dom.window.close();}
 else if(file.endsWith('.js'))edits=jsEdits(raw);
 contents.set(file,edits.length?apply(raw,edits):raw);if(edits.length)changes.push({file,edits});
}
// Version changed local assets so returning visitors receive the revised copy.
for(const file of Object.keys(baseline.files).filter(f=>f.endsWith('.html'))){const raw=sources.get(file),dom=new JSDOM(raw,{includeNodeLocations:true}),edits=[];
 for(const el of dom.window.document.querySelectorAll('script[src],link[href]')){const attr=el.hasAttribute('src')?'src':'href',url=el.getAttribute(attr);if(!url||/^(?:[a-z]+:|\/\/)/i.test(url))continue;const name=path.posix.normalize(path.posix.join(path.posix.dirname(file),url.split(/[?#]/)[0]));if(!contents.has(name)||contents.get(name)===sources.get(name))continue;if(/[?#]/.test(url)&&!/^.*\?v=[0-9a-f]{12}$/.test(url))throw Error('Unsupported cache query: '+url);const loc=dom.nodeLocation(el).attrs[attr],rawAttr=raw.slice(loc.startOffset,loc.endOffset),parts=/^(\S+\s*=\s*)(["'])([\s\S]*)\2$/.exec(rawAttr);if(!parts)throw Error('Unquoted versioned asset');edits.push({start:loc.startOffset+parts[1].length+1,end:loc.endOffset-1,before:parts[3],after:parts[3].split('?')[0]+'?v='+hash(Buffer.from(contents.get(name))).slice(0,12),kind:'asset-version'});}
 dom.window.close();if(edits.length){let rec=changes.find(r=>r.file===file);if(!rec){rec={file,edits:[]};changes.push(rec);}rec.edits.push(...edits);contents.set(file,apply(raw,rec.edits));}}
const report={version:1,baseline:{manifest:'release-support/copy-tone/baseline-manifest.json',manifestSha256:hash(manifestBytes),verification:'release-support/copy-tone/baseline-verification.json',verificationSha256:hash(verificationBytes)},files:changes.map(({file,edits})=>({file,beforeSha256:baseline.files[file].sha256,afterSha256:hash(Buffer.from(contents.get(file))),edits:edits.sort((a,b)=>a.start-b.start).map(e=>({start:Buffer.byteLength(sources.get(file).slice(0,e.start)),before:e.before,after:e.after,kind:e.kind}))}))};
const review={maps,translations:translations.size,used:[...uses].filter(([,n])=>n>0).length,unused:[...uses].filter(([,n])=>!n).map(([before])=>before),changedFiles:changes.length,edits:changes.reduce((n,r)=>n+r.edits.length,0)};
fs.writeFileSync(path.join(dir,'application-review.json'),JSON.stringify(review,null,2)+'\n');
if(write){fs.writeFileSync(path.join(dir,'baseline-manifest.json'),manifestBytes);fs.writeFileSync(path.join(dir,'baseline-verification.json'),verificationBytes);const overlayBytes=JSON.stringify(report,null,2)+'\n';fs.writeFileSync(path.join(dir,'overlay.json'),overlayBytes);const manifest=structuredClone(baseline);manifest.copyOverlay={path:'release-support/copy-tone/overlay.json',sha256:hash(overlayBytes)};for(const {file} of changes){const data=Buffer.from(contents.get(file));fs.writeFileSync(path.join(out,file),data);manifest.files[file]={...manifest.files[file],sha256:hash(data),bytes:data.length};}fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');}
console.log(JSON.stringify({mode:write?'written':'plan',...review}));
