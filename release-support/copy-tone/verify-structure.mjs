import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const root=path.resolve(import.meta.dirname,'../..');
const require=createRequire(path.join(process.env.TEMP,'ecoclean-demo-qa/package.json'));
const {JSDOM}=require('jsdom'),acorn=require('acorn');
export function reverse(current,edits){let shift=0;const shifted=edits.map(e=>{const start=e.start+shift;shift+=Buffer.byteLength(e.after)-Buffer.byteLength(e.before);return {...e,start};});for(const e of shifted.reverse()){const bytes=Buffer.from(e.after);if(!current.subarray(e.start,e.start+bytes.length).equals(bytes))throw Error('Invalid copy reversal');current=Buffer.concat([current.subarray(0,e.start),Buffer.from(e.before),current.subarray(e.start+bytes.length)]);}return current;}
function ast(source,json=false){const tree=acorn.parse(json?'('+source+')':source,{ecmaVersion:'latest',sourceType:'script'});function shape(node,keyContext=false){if(Array.isArray(node))return node.map(n=>shape(n));if(!node||typeof node!=='object')return node;const result={};for(const [key,value] of Object.entries(node)){if(['start','end','raw'].includes(key))continue;const propertyKey=(node.type==='Property'||node.type==='MethodDefinition')&&key==='key';result[key]=!keyContext&&node.type==='Literal'&&key==='value'&&typeof value==='string'?'COPY':node.type==='TemplateElement'&&key==='value'?'COPY':shape(value,propertyKey);}return result;}return JSON.stringify(shape(tree));}
const textAttrs=new Set(['alt','title','aria-label','aria-description','aria-valuetext','placeholder']);
function html(source){const d=new JSDOM(source).window.document;
 function shape(el){if(el.nodeType===3)return 'TEXT';if(el.nodeType===8)return ['COMMENT',el.textContent];if(el.nodeType!==1)return null;
 const attributes=[...el.attributes].map(a=>{let value=a.value;if(textAttrs.has(a.name))value='COPY';else if(el.tagName==='META'&&a.name==='content'&&['description','og:title','og:description','twitter:title','twitter:description'].includes(el.getAttribute('name')||el.getAttribute('property')))value='COPY';else if((el.tagName==='SCRIPT'&&a.name==='src')||(el.tagName==='LINK'&&a.name==='href'))value=value.replace(/\?v=[0-9a-f]{12}$/,'');return [a.name,value];}).sort();
 let children;if(el.tagName==='SCRIPT'&&!el.src&&el.textContent.trim()&&(!el.type||['text/javascript','application/ld+json'].includes(el.type)))children=ast(el.textContent,el.type==='application/ld+json');else if(el.tagName==='STYLE')children=el.textContent;else children=[...el.childNodes].map(n=>shape(n));return [el.tagName,attributes,children];}
 const result=JSON.stringify(shape(d.documentElement));d.defaultView.close();return result;}
export function verifyStructure(manifest){if(!manifest.copyOverlay)return [];const overlay=JSON.parse(fs.readFileSync(path.join(root,manifest.copyOverlay.path),'utf8')),issues=[];
 for(const rec of overlay.files){try{const current=fs.readFileSync(path.join(root,'release',rec.file)),before=reverse(current,rec.edits).toString('utf8'),after=current.toString('utf8');if(rec.file.endsWith('.js')){if(ast(before)!==ast(after))throw Error('JavaScript logic/property keys changed');}else if(rec.file.endsWith('.html')){if(html(before)!==html(after))throw Error('HTML structure, scripts or technical attributes changed');}else throw Error('Non-copy file changed');}catch(e){issues.push({file:rec.file,message:String(e.message)});}}
 return issues;
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(import.meta.filename)){const manifest=JSON.parse(fs.readFileSync(path.join(root,'release-support/release-manifest.json'),'utf8')),issues=verifyStructure(manifest);console.log(JSON.stringify({issues}));process.exitCode=issues.length?1:0;}
