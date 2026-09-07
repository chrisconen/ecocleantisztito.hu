import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const support=path.dirname(fileURLToPath(import.meta.url));
const root=path.dirname(support),demo=path.join(root,'demo'),out=path.join(root,'release');
const require=createRequire(path.join(process.env.TEMP,'ecoclean-demo-qa','package.json'));
const {JSDOM}=require('jsdom');
const csstree=require('css-tree');
const inventory=JSON.parse(fs.readFileSync(path.join(demo,'rollout/inventory.json'),'utf8'));
const publicationPolicy=JSON.parse(fs.readFileSync(path.join(support,'publication-policy.json'),'utf8'));
const omittedDocuments=new Set(publicationPolicy.omitUnavailableDocuments);
const supplementalDir=path.join(support,'supplemental');
const supplemental=fs.existsSync(supplementalDir)?fs.readdirSync(supplementalDir).filter(name=>name.endsWith('.html')).map(file=>({file,family:'supplemental',source:'release-support/supplemental/'+file})):[];
const pageInventory=[...inventory.map(rec=>({...rec,source:'demo/'+rec.file})),...supplemental];
const homeDOM=new JSDOM(fs.readFileSync(path.join(demo,'index.html'),'utf8'));
const socialLinks=new Map([['fa-facebook-f','Facebook'],['fa-twitter','X'],['fa-linkedin','LinkedIn']].map(([icon,label])=>[icon,homeDOM.window.document.querySelector(`.footer-social a[aria-label="${label}"]`).outerHTML]));
socialLinks.set('fa-instagram','<a href="https://www.instagram.com/ecocleantisztito" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none"/></svg></a>');
homeDOM.window.close();
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const local=value=>value&&!/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value);
const split=value=>{const [,name,suffix='']=value.match(/^([^?#]*)(.*)$/);return [decodeURIComponent(name),suffix];};
const files=new Map(),queue=[],unresolved=[];
const cssURLs=text=>{
  const urls=[];
  csstree.walk(csstree.parse(text),{enter(node){
    if(node.type==='Url')urls.push(node.value);
    if(node.type==='Atrule'&&node.name==='import'&&node.prelude)csstree.walk(node.prelude,{visit:'String',enter(value){urls.push(value.value);}});
  }});
  return urls;
};
function safe(base,name){
  const resolved=path.resolve(base,name);
  if(resolved!==base&&!resolved.startsWith(base+path.sep))throw Error('Path outside package: '+name);
  return resolved;
}
function write(name,bytes,source){
  const target=safe(out,name),normalized=path.relative(out,target).replaceAll('\\','/');
  if(files.has(normalized))return;
  fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);
  files.set(normalized,{sha256:sha(bytes),bytes:Buffer.byteLength(bytes),source});
  if(/\.(?:css|webmanifest)$/.test(name))queue.push({name:normalized,source,text:bytes.toString()});
}
function copy(source,name){
  if(!fs.existsSync(source)){unresolved.push({file:name,reason:'Missing dependency',source:path.relative(root,source)});return;}
  if(name==='site.webmanifest'){
    const app=JSON.parse(fs.readFileSync(source,'utf8'));
    app.background_color='#f8f7f2';app.theme_color='#415b46';
    app.icons=[192,512].map(size=>({src:`android-chrome-${size}x${size}.png`,sizes:`${size}x${size}`,type:'image/png',purpose:'any'}));
    delete app.screenshots;
    app.shortcuts=app.shortcuts.filter(item=>!item.url.startsWith('tel:')).map(({icons,...item})=>item);
    write(name,JSON.stringify(app,null,2)+'\n','site.webmanifest (existing icons and approved palette)');return;
  }
  write(name,fs.readFileSync(source),path.relative(root,source).replaceAll('\\','/'));
}
for(const name of ['booking-live.js','calendar-live.js'])if(!fs.existsSync(path.join(support,name)))throw Error('Live integration not built: '+name);
fs.mkdirSync(out,{recursive:true});
const scripts=new Map([
  ['navigation.js','ui/navigation.js'],['rollout.js','ui/rollout.js'],
  ['reviews-demo.js','ui/reviews.js'],['booking-demo.js','ui/booking-live.js'],
  ['calendar-demo.js','ui/calendar-live.js'],['design.js','ui/site.js']
]);
function mapURL(value,resource=false){
  if(!local(value))return value;
  const [name,suffix]=split(value);
  if(name.startsWith('../'))return name.replace(/^\.\.\//,'')+suffix;
  if(resource&&scripts.has(name))return scripts.get(name)+suffix;
  if(resource&&(/^(?:design|subpages|modern|regional-redesign)\.css$/.test(name)||name.startsWith('rollout/')))return 'ui/'+name+suffix;
  return name.replace(/^\.\//,'')+suffix;
}
for(const rec of inventory){
  const dom=new JSDOM(fs.readFileSync(path.join(demo,rec.file),'utf8')),d=dom.window.document;
  d.title=d.title.replace(/^DEMÓ · /,'');
  d.querySelectorAll('meta[name="robots"],meta[name="googlebot"],.demo-notice,.demo-calendar-note,#demoResult').forEach(e=>e.remove());
  d.documentElement.dataset.theme='light';
  d.body.classList.remove('eco-demo');d.body.classList.add('eco-site');
  for(const anchor of d.querySelectorAll('a[href]')){
    const url=new URL(anchor.getAttribute('href'),'https://ecocleantisztito.hu/');
    if(url.hostname!=='ecocleantisztito.hu'||!omittedDocuments.has(path.posix.basename(url.pathname)))continue;
    // Legacy footer paragraphs separate these unavailable documents with pipes.
    const previous=anchor.previousSibling;
    if(previous?.nodeType===3)previous.textContent=previous.textContent.replace(/\s*\|\s*$/,'');
    if(anchor.parentElement?.tagName==='LI'&&anchor.parentElement.children.length===1)anchor.parentElement.remove();
    else anchor.remove();
  }
  for(const [icon,markup] of socialLinks)for(const anchor of d.querySelectorAll(`.header-social a[href="#"]:has(.${icon})`))anchor.outerHTML=markup;
  const canonical='https://ecocleantisztito.hu/'+(rec.file==='index.html'?'':rec.file);
  if(rec.family!=='redirect'){
    let link=d.querySelector('link[rel="canonical"]');
    if(!link){link=d.createElement('link');link.rel='canonical';d.head.append(link);}
    link.href=canonical;
    const og=d.querySelector('meta[property="og:url"]');if(og)og.content=canonical;
  }
  if(d.getElementById('configStatus'))d.getElementById('configStatus').textContent='● Online foglalás';
  d.querySelectorAll('meta[name="theme-color"],meta[name="msapplication-TileColor"]').forEach(el=>el.content='#f8f7f2');
  if(rec.family==='homepage'){
    const link=d.createElement('link');link.rel='stylesheet';link.href='ui/calendar-live.css';d.head.append(link);
  }
  for(const el of d.querySelectorAll('[href],[src],[poster],[data-full],[data-src]')){
    for(const attr of ['href','src','poster','data-full','data-src'])if(el.hasAttribute(attr)){
      const isResource=attr!=='href'||el.tagName==='LINK';
      el.setAttribute(attr,mapURL(el.getAttribute(attr),isResource));
    }
  }
  for(const el of d.querySelectorAll('[srcset]'))el.setAttribute('srcset',el.getAttribute('srcset').split(',').map(part=>{
    const [url,...size]=part.trim().split(/\s+/);return [mapURL(url,true),...size].join(' ');
  }).join(', '));
  const hero=d.querySelector('#interiorImage,.editorial-hero-photo,.eco-figure img,.hero-image-wrapper img');
  const heroURL='https://ecocleantisztito.hu/'+(hero?.getAttribute('src')||'assets/living-room.webp');
  for(const el of d.querySelectorAll('meta[property="og:image"],meta[name="twitter:image"]'))el.content=heroURL;
  d.querySelectorAll('meta[property="og:image:width"],meta[property="og:image:height"]').forEach(el=>el.remove());
  // Repair local image URLs in structured data without changing service claims.
  const repairImages=value=>{
    if(Array.isArray(value))return value.map(repairImages);
    if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,repairImages(item)]));
    if(typeof value==='string'&&/^https:\/\/(?:www\.)?ecocleantisztito\.hu\/.*\.(?:jpe?g|png|webp|svg)$/i.test(value)){
      const name=decodeURIComponent(new URL(value).pathname.slice(1));
      if(!fs.existsSync(path.join(root,name))&&!fs.existsSync(path.join(demo,name)))return heroURL;
      copy(fs.existsSync(path.join(demo,name))?path.join(demo,name):path.join(root,name),name);
    }
    return value;
  };
  for(const script of d.querySelectorAll('script[type="application/ld+json"]'))script.textContent=JSON.stringify(repairImages(JSON.parse(script.textContent)),null,2);
  write(rec.file,dom.serialize(),'demo/'+rec.file);
  for(const el of d.querySelectorAll('img[src],source[src],script[src],link[href],video[poster],[data-full],[data-src]')){
    if(el.tagName==='LINK'&&!['stylesheet','icon','shortcut icon','apple-touch-icon','preload','manifest'].includes(el.rel))continue;
    for(const attr of ['src','href','poster','data-full','data-src']){
      const url=el.getAttribute(attr);if(!local(url))continue;
      const [name]=split(url);if(name.startsWith('ui/'))continue;
      const source=name.startsWith('assets/')&&fs.existsSync(path.join(demo,name))?path.join(demo,name):safe(root,name);
      copy(source,name);
    }
  }
  dom.window.close();
}
for(const name of ['design.css','subpages.css','modern.css','regional-redesign.css'])if(fs.existsSync(path.join(demo,name)))copy(path.join(demo,name),'ui/'+name);
copy(path.join(support,'calendar-live.css'),'ui/calendar-live.css');
for(const rec of supplemental)copy(path.join(supplementalDir,rec.file),rec.file);
if(supplemental.length)copy(path.join(support,'supplemental.css'),'ui/supplemental.css');
for(const name of fs.readdirSync(path.join(demo,'rollout')).filter(n=>n.endsWith('.css')))copy(path.join(demo,'rollout',name),'ui/rollout/'+name);
for(const [name,dest] of scripts){
  if(name==='design.js')continue;
  const source=/^(booking|calendar)-demo/.test(name)?path.join(support,path.basename(dest)):path.join(demo,name);
  if(name==='navigation.js'&&supplemental.length){
    let navigation=fs.readFileSync(source,'utf8');
    navigation=navigation.replace(/(szonyegtisztitas:\s*\{[\s\S]*?cities:\s*\[)([^\]]+)(\])/,(all,start,cities,end)=>start+cities+", 'Balatonboglár', 'Balatonfűzfő', 'Balatonkenese', 'Balatonszemes'"+end);
    write(dest,navigation,'demo/navigation.js (four recovered service routes)');
  }else copy(source,dest);
}
let site=fs.readFileSync(path.join(demo,'design.js'),'utf8');
site=site.replace("document.getElementById('configStatus').textContent='● DEMÓ';","document.getElementById('configStatus').textContent='● Online foglalás';");
const demoStart=site.indexOf("  const result=document.getElementById('demoResult');"),demoEnd=site.indexOf("  const andante=document.getElementById('andanteModal');",demoStart);
if(demoStart<0||demoEnd<0)throw Error('Homepage adapter changed: review live completion integration');
site=site.slice(0,demoStart)+site.slice(demoEnd);
site=site.replace('local demo completion.','live booking enhancements.').replace('meaningful initial demo state.','initial furniture selection.');
write('ui/site.js',site,'demo/design.js (live adaptation)');
// Gallery and item images are selected dynamically, so include their small WebP set.
for(const name of fs.readdirSync(path.join(demo,'assets')).filter(n=>n.endsWith('.webp')))copy(path.join(demo,'assets',name),'assets/'+name);
while(queue.length){
  const rec=queue.shift();
  const urls=rec.name.endsWith('.webmanifest')?(JSON.parse(rec.text).icons?.map(icon=>icon.src)||[]):cssURLs(rec.text);
  for(const url of urls){
    if(!local(url))continue;
    const [name]=split(url),dest=path.posix.normalize(path.posix.join(path.posix.dirname(rec.name),name));
    safe(out,dest);if(files.has(dest))continue;
    const source=safe(root,dest.startsWith('ui/rollout/')?'demo/rollout/'+dest.slice(11):dest.startsWith('ui/')?'demo/'+dest.slice(3):dest);
    copy(source,dest);
  }
}
for(const name of ['CNAME','robots.txt','llms.txt','agents.txt','google452375ed927a7b98.html'])if(fs.existsSync(path.join(root,name)))copy(path.join(root,name),name);
const urls=pageInventory.filter(rec=>rec.family!=='redirect').map(rec=>'https://ecocleantisztito.hu/'+(rec.file==='index.html'?'':rec.file));
write('sitemap.xml','<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls.map(url=>'  <url><loc>'+url+'</loc></url>').join('\n')+'\n</urlset>\n','generated from active inventory');
write('.nojekyll','','generated');
const aliases={'matracisztitas.html':'matractisztitas-gyor.html','matractisztitas.html':'matractisztitas-gyor.html','karpittisztitas.html':'karpittisztitas-gyor.html','ablaktisztitas.html':'ablaktisztitas-gyor.html'};
for(const [from,to] of Object.entries(aliases))write(from,`<!doctype html><html lang="hu" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ECO Clean</title><link rel="canonical" href="https://ecocleantisztito.hu/${to}"><meta http-equiv="refresh" content="0; url=${to}"></head><body><p>Az oldal új címen érhető el: <a href="${to}">ECO Clean szolgáltatás</a>.</p></body></html>\n`,'legacy redirect from OLD/.htaccess');
// A new document always requests the exact CSS/JS version it was verified with.
for(const [name,record] of [...files])if(name.endsWith('.html')){
  const html=fs.readFileSync(path.join(out,name),'utf8').replace(/(href|src)="([^"]+\.(?:css|js))"/g,(all,attr,url)=>{
    const asset=files.get(url);return asset?`${attr}="${url}?v=${asset.sha256.slice(0,12)}"`:all;
  });
  const upgrade='<script>if(location.protocol==="http:"&&/^(www\\.)?ecocleantisztito\\.hu$/.test(location.hostname)){location.replace("https://ecocleantisztito.hu"+location.pathname+location.search+location.hash)}</script>';
  const finalHTML=html.replace(/<head>/i,'<head>'+upgrade);
  files.delete(name);write(name,finalHTML,record.source);
}
const manifest={pages:pageInventory.length,pageInventory,aliases,omittedDocuments:[...omittedDocuments],files:Object.fromEntries([...files].sort(([a],[b])=>a.localeCompare(b))),unresolved};
fs.writeFileSync(path.join(support,'release-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({pages:pageInventory.length,aliases:Object.keys(aliases).length,files:files.size,bytes:[...files.values()].reduce((a,f)=>a+f.bytes,0),unresolved}));
if(unresolved.length)process.exitCode=1;
