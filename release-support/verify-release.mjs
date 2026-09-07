import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const support=path.dirname(fileURLToPath(import.meta.url)),root=path.dirname(support),out=path.join(root,'release');
const require=createRequire(path.join(process.env.TEMP,'ecoclean-demo-qa','package.json'));
const {JSDOM,VirtualConsole}=require('jsdom');
const csstree=require('css-tree');
const log=new VirtualConsole(),issues=[],counts={pages:0,links:0,assets:0,css:0};
const inventory=JSON.parse(fs.readFileSync(path.join(root,'demo/rollout/inventory.json'),'utf8'));
const manifest=JSON.parse(fs.readFileSync(path.join(support,'release-manifest.json'),'utf8'));
const check=(condition,file,message)=>{if(!condition)issues.push({file,message});};
const local=url=>url&&!/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(url);
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const part=url=>decodeURIComponent(url.split(/[?#]/)[0]);
function reference(url,file,kind){
  if(!local(url))return;
  const target=path.resolve(path.dirname(path.join(out,file)),part(url));
  check(target.startsWith(out+path.sep),file,'Reference escapes release: '+url);
  check(fs.existsSync(target)&&fs.statSync(target).isFile(),file,'Missing '+kind+': '+url);
}
const bodyText=d=>{
  const body=d.body.cloneNode(true);
  body.querySelectorAll('script,style,.demo-notice,.demo-calendar-note,#demoResult,#configStatus').forEach(e=>e.remove());
  for(const anchor of body.querySelectorAll('a[href]')){
    const url=new URL(anchor.getAttribute('href'),'https://ecocleantisztito.hu/');
    if(url.hostname!=='ecocleantisztito.hu'||!manifest.omittedDocuments?.includes(path.posix.basename(url.pathname)))continue;
    const previous=anchor.previousSibling;
    if(previous?.nodeType===3)previous.textContent=previous.textContent.replace(/\s*\|\s*$/,'');
    if(anchor.parentElement?.tagName==='LI'&&anchor.parentElement.children.length===1)anchor.parentElement.remove();
    else anchor.remove();
  }
  return body.textContent.replace(/\s+/g,' ').trim();
};
for(const rec of manifest.pageInventory||inventory){
  const file=rec.file,target=path.join(out,file);
  if(!fs.existsSync(target)){issues.push({file,message:'Missing production page'});continue;}
  const raw=fs.readFileSync(target,'utf8'),dom=new JSDOM(raw,{virtualConsole:log}),d=dom.window.document;
  const approved=new JSDOM(fs.readFileSync(path.join(root,rec.source||'demo/'+file),'utf8'),{virtualConsole:log});
  counts.pages++;
  check(bodyText(d)===bodyText(approved.window.document),file,'Approved visible text differs');
  check(d.documentElement.dataset.theme==='light'&&!d.querySelector('#themeToggle,.theme-toggle'),file,'Theme control reintroduced');
  check(!/^DEMÓ/.test(d.title)&&!d.querySelector('.demo-notice,.demo-calendar-note,#demoResult,.missing-source'),file,'Preview content published');
  check(![...d.querySelectorAll('meta[name="robots"],meta[name="googlebot"]')].some(e=>/noindex|nofollow/i.test(e.content)),file,'Page blocks indexing');
  if(rec.family!=='redirect')check(d.querySelector('link[rel="canonical"]')?.href==='https://ecocleantisztito.hu/'+(file==='index.html'?'':file),file,'Incorrect canonical URL');
  for(const a of d.querySelectorAll('a[href]')){
    const url=a.getAttribute('href');counts.links++;reference(url,file,'link');
    const parsed=new URL(url,'https://ecocleantisztito.hu/');
    check(parsed.hostname!=='ecocleantisztito.hu'||!manifest.omittedDocuments?.includes(path.posix.basename(parsed.pathname)),file,'Unavailable document link remains: '+url);
    if(url?.startsWith('#')&&url!=='#')check(Boolean(d.getElementById(decodeURIComponent(url.slice(1)))),file,'Missing anchor: '+url);
  }
  for(const el of d.querySelectorAll('img[src],script[src],source[src],link[rel="stylesheet"],link[rel="icon"],link[rel="preload"],video[poster],[data-full],[data-src]')){
    for(const attr of ['src','href','poster','data-full','data-src'])if(el.hasAttribute(attr)){
      counts.assets++;reference(el.getAttribute(attr),file,'asset');
    }
  }
  for(const el of d.querySelectorAll('[srcset]'))for(const entry of el.getAttribute('srcset').split(','))reference(entry.trim().split(/\s+/)[0],file,'srcset asset');
  if(rec.family==='homepage'){
    const scripts=[...d.querySelectorAll('script[src]')].map(e=>part(e.getAttribute('src')));
    check(scripts.includes('ui/booking-live.js')&&scripts.includes('ui/calendar-live.js')&&scripts.includes('ui/site.js'),file,'Live booking scripts absent');
    check(!scripts.some(src=>/demo/.test(src)),file,'Sample runtime included');
  }
  dom.window.close();approved.window.close();
}
for(const [file,record] of Object.entries(manifest.files)){
  const bytes=fs.readFileSync(path.join(out,file));check(sha(bytes)===record.sha256,file,'Release manifest hash mismatch');
  if(file.endsWith('.css')){
    counts.css++;
    try{csstree.walk(csstree.parse(bytes.toString()),{enter(node){
      if(node.type==='Url')reference(node.value,file,'CSS dependency');
      if(node.type==='Atrule'&&node.name==='import'&&node.prelude)csstree.walk(node.prelude,{visit:'String',enter(value){reference(value.value,file,'CSS dependency');}});
    }});}catch(error){issues.push({file,message:'CSS syntax: '+error.message});}
  }
  if(file.endsWith('.js'))check(!/demo-disabled|showDemoResult|mintaidőpont/i.test(bytes.toString()),file,'Demo behavior in runtime');
}
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(dir,entry.name)):[path.join(dir,entry.name)]);}
for(const file of walk(out)){
  const name=path.relative(out,file).replaceAll('\\','/');
  check(Boolean(manifest.files[name]),name,'Unlisted/stale file in release');
  check(!/(?:\.backup|\.predesign-backup|\.precopy-backup)\.html$|(?:^|\/)(?:\.git|qa|originals|\.env|ecocleantisztito\.hu\.txt)(?:\/|$)/.test(name),name,'Private or obsolete artifact in release');
}
const sitemap=new JSDOM(fs.readFileSync(path.join(out,'sitemap.xml'),'utf8'),{contentType:'application/xml'});
const locations=[...sitemap.window.document.querySelectorAll('loc')].map(e=>e.textContent);
check(new Set(locations).size===locations.length,'sitemap.xml','Duplicate URLs');
for(const value of locations){const url=new URL(value);check(url.origin==='https://ecocleantisztito.hu','sitemap.xml','Unexpected host');reference(url.pathname==='/'?'index.html':url.pathname.slice(1),'sitemap.xml','indexed page');}
sitemap.window.close();
check(fs.readFileSync(path.join(out,'CNAME'),'utf8').trim()==='ecocleantisztito.hu','CNAME','Incorrect production domain');
check(manifest.unresolved.length===0,'release-manifest.json','Unresolved build dependencies');
const report={manifestSha256:sha(fs.readFileSync(path.join(support,'release-manifest.json'))),counts,issues};fs.writeFileSync(path.join(support,'release-verification.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({counts,issues:issues.length,first:issues.slice(0,12)}));
if(issues.length)process.exitCode=1;
