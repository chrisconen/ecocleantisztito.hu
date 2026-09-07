import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

// Build-time only. The delivered pages have no package/runtime dependency.
const require=createRequire(path.join(process.env.TEMP,'ecoclean-demo-qa','package.json'));
const {JSDOM}=require('jsdom');
const out=path.dirname(fileURLToPath(import.meta.url)),root=path.dirname(out);
const inventory=JSON.parse(fs.readFileSync(path.join(out,'rollout/inventory.json'),'utf8'));
const notices={
  'adatvedelem.html':'Adatvédelmi tájékoztató',
  'aszf.html':'Általános szerződési feltételek',
  'szonyegtisztitas-balatonboglar.html':'Szőnyegtisztítás Balatonboglár',
  'szonyegtisztitas-balatonfuzfo.html':'Szőnyegtisztítás Balatonfűzfő',
  'szonyegtisztitas-balatonkenese.html':'Szőnyegtisztítás Balatonkenese',
  'szonyegtisztitas-balatonszemes.html':'Szőnyegtisztítás Balatonszemes'
};
const pages=new Set([...inventory.map(x=>x.file),...Object.keys(notices)]);
const fonts='https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap';
const fixes=[],manifest=[];
const ownHost=/^(www\.)?ecocleantisztito\.hu$/;
const flat=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const withoutFontImports=css=>css.replace(/@import\s+(?:url\(\s*(?:"[^"]*"|'[^']*'|[^)]*)\s*\)|"[^"]*"|'[^']*')[^;]*;/g,'');
const repairLegacyContent=css=>css.replace(/content:\s*\\'([^;\n]*)\\';/g,(_,value)=>"content: '"+value.replace(/\\u([0-9a-fA-F]{4})/g,(_,hex)=>String.fromCharCode(parseInt(hex,16)))+"';");
function resolveURL(value,file,kind='link') {
  if(!value || /^(#|data:|tel:|mailto:|javascript:|blob:)/i.test(value))return value;
  let local=value;
  if(/^(https?:)?\/\//i.test(value)){
    const u=new URL(value,'https://ecocleantisztito.hu');
    if(kind!=='link'||!ownHost.test(u.hostname))return value;
    local=u.pathname+u.search+u.hash;
  }
  const [,raw,suffix='']=local.match(/^([^?#]*)(.*)$/);
  let name=decodeURIComponent(raw).replace(/^\.\.\//,'').replace(/^\.\//,'').replace(/^\//,'');
  if(!name)name='index.html';
  const original=name;
  if(kind==='link' && !pages.has(name)) {
    const n=flat(name);
    name=[n,n.replace(/[-_]new(?=\.html$)/,''),'karpittisztitas-'+n,n.replace(/\.html$/,'-gyor.html')].find(x=>pages.has(x))||name;
  }
  if(kind!=='link' && !fs.existsSync(path.join(root,name)) && name.startsWith('images/') && fs.existsSync(path.join(root,name.replace(/^images\//,'img/'))))name=name.replace(/^images\//,'img/');
  if(kind!=='link' && name==='favicon.png' && !fs.existsSync(path.join(root,name)))name='favicon-32x32.png';
  if(name!==original)fixes.push({file,from:original,to:name});
  return (pages.has(name)?name:'../'+name)+suffix;
}
function assetFor(text,fallback='living-room'){
  const s=flat(text.toLowerCase());
  if(/irodai|forgoszek/.test(s))return 'office';
  if(/ebedlo|etkezo|szek/.test(s))return 'dining';
  if(/fotel/.test(s))return 'armchair';
  if(/szofa|hevero/.test(s))return 'sofa';
  if(/matrac|agybetet|agy/.test(s))return 'bedroom';
  if(/kanape|karpit/.test(s))return 'living-room';
  return fallback;
}
function serviceFor(file){
  return file.startsWith('matrac')?'mattress':/^(ablak|szonyeg|takaritas)/.test(file)?'business':file.includes('berles')?'rental':'upholstery';
}
function heroAssetFor(file,service){
  if(file.startsWith('takaritas-'))return 'cleaning-atrium';
  if(file.startsWith('ablaktisztitas-'))return 'window-storefront';
  return service==='mattress'?'bedroom':service==='business'?'business-lounge':'living-room';
}
function newImage(d,name,className,lazy=false){
  const img=d.createElement('img');img.className=className;img.src='assets/'+name+(lazy?'-card':'')+'.webp';
  img.alt='Generált enteriőrkép · ECO Clean';img.width=1672;img.height=941;img.decoding='async';
  if(name==='cleaning-atrium'||name==='window-storefront'){
    img.width=1122;img.height=1402;
    img.alt=name==='cleaning-atrium'?'Generált kép: világos üzleti előcsarnok tiszta terrazzo padlóval':'Generált kép: elegáns üzletportál nagy, tiszta üvegfelületekkel';
  }
  if(lazy)img.loading='lazy';else img.setAttribute('fetchpriority','high');
  img.dataset.generatedInterior='true';return img;
}
// The old regional skin elevates visual declarations with !important. Keep its
// layout, but lower those declarations so the approved skin can actually win.
let regionalLegacy=withoutFontImports(fs.readFileSync(path.join(root,'assets/css/eco-redesign.css'),'utf8')).replace(/!important/g,'');
fs.writeFileSync(path.join(out,'rollout/eco-redesign-legacy.css'),regionalLegacy);
for(const [file,title] of Object.entries(notices)){
  fs.writeFileSync(path.join(out,file),`<!doctype html><html lang="hu" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>DEMÓ · ${title}</title><link rel="stylesheet" href="${fonts}"><link rel="stylesheet" href="modern.css"></head><body class="eco-modern"><main class="missing-source"><a class="logo-main" href="index.html">ECO Clean</a><div class="section-label">DIZÁJNELŐNÉZET</div><h1>${title}</h1><p>Ennek az oldalnak a szövege nem található a jelenlegi forrásprojektben. A teljes tartalom átvételéhez az eredeti dokumentum vagy oldal szükséges.</p><p>Ez a demóoldal a hiányzó tartalom helyét jelzi.</p><a class="btn btn-primary" href="index.html">Vissza a főoldalra</a></main></body></html>`);
}
for(const rec of inventory){
  if(rec.family==='homepage')continue;
  const source=fs.readFileSync(path.join(root,rec.file),'utf8');
  const dom=new JSDOM(source),d=dom.window.document;
  const add=(tag,attrs,parent=d.head)=>{const el=d.createElement(tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));parent.append(el);return el;};
  d.documentElement.dataset.theme='light';
  d.querySelectorAll('#themeToggle,.theme-toggle').forEach(el=>el.remove());
  d.title='DEMÓ · '+d.title;
  d.querySelectorAll('meta[name="robots"],meta[name="googlebot"]').forEach(e=>e.remove());
  add('meta',{name:'robots',content:'noindex, nofollow'});
  for(const el of d.querySelectorAll('a[href],img[src],source[src],iframe[src],video[poster],[data-full],[data-src]')) {
    for(const attr of ['href','src','poster','data-full','data-src'])if(el.hasAttribute(attr))el.setAttribute(attr,resolveURL(el.getAttribute(attr),rec.file,attr==='href'?'link':'asset'));
  }
  for(const el of d.querySelectorAll('[srcset]'))el.setAttribute('srcset',el.getAttribute('srcset').split(',').map(s=>{const [url,...size]=s.trim().split(/\s+/);return [resolveURL(url,rec.file,'asset'),...size].join(' ');}).join(', '));
  d.querySelectorAll('link[rel="icon"],link[rel="shortcut icon"],link[rel="apple-touch-icon"]').forEach(el=>el.setAttribute('href',resolveURL(el.getAttribute('href'),rec.file,'asset')));
  if(rec.family==='redirect'){
    d.querySelector('meta[http-equiv="refresh"]').content='0; url=karpittisztitas-elotte-utana.html';
    d.querySelectorAll('script:not([src])').forEach(s=>{if(s.textContent.includes('location.replace'))s.textContent='window.location.replace("karpittisztitas-elotte-utana.html");';});
  }else{
    const modern=rec.family==='modern',service=serviceFor(rec.file),heroAsset=heroAssetFor(rec.file,service);
    d.body.classList.add('eco-rollout',modern?'eco-modern':'eco-subpage');d.body.dataset.family=rec.family;d.body.dataset.service=service;
    // Preserve source CSS in a lower layer, including its per-page layout variants.
    let imports='',inline='';
    for(const link of d.querySelectorAll('link[rel="stylesheet"]')){
      const href=link.getAttribute('href');
      if(!/^https?:/.test(href))imports+=`@import url('${href==='assets/css/eco-redesign.css'?'eco-redesign-legacy.css':'../../'+href.replace(/^\//,'')}') layer(legacy);\n`;
      link.remove();
    }
    for(const style of d.querySelectorAll('style')) {inline+=withoutFontImports(style.textContent)+'\n';style.remove();}
    // Lower static inline styling; dynamic JS styles retain their normal priority.
    let n=0;
    for(const el of d.querySelectorAll('[style]')){
      el.dataset.legacyStyle=String(++n);inline+=`[data-legacy-style="${n}"]{${el.getAttribute('style')}}\n`;el.removeAttribute('style');
    }
    // Static, per-page presentation may not outrank the new shared design.
    // Shared source CSS still retains print, validation and reduced-motion rules.
    inline=repairLegacyContent(inline.replace(/!important/g,''));
    inline=inline.replace(/url\((['"]?)([^)'"\s]+)\1\)/g,(all,quote,url)=>/^(data:|https?:|#|\/\/)/.test(url)?all:`url("../../${url.replace(/^\//,'')}")`);
    const legacyName='rollout/styles-'+rec.file.replace(/\.html$/,'')+'.css';
    fs.writeFileSync(path.join(out,legacyName),imports+'@layer legacy {\n'+inline+'\n}\n');
    add('link',{rel:'stylesheet',href:fonts});
    add('link',{rel:'stylesheet',href:legacyName});
    if(!modern)add('link',{rel:'stylesheet',href:'design.css'});
    add('link',{rel:'stylesheet',href:modern?'modern.css':'subpages.css'});
    if(/^(karpittisztitas|matractisztitas)-(kalocsa|baja|kiskoros|szekszard|paks|solt|dunafoldvar)\.html$/.test(rec.file)){
      d.body.classList.add('eco-regional-redesign');
      add('link',{rel:'stylesheet',href:'regional-redesign.css'});
    }
    for(const [id,target] of [['main-content','main, .subpage-hero, .eco-hero, .hero'],['velemenyek','.gr-reviews, .google-reviews-section, .reviews']]){
      if(!d.getElementById(id)&&d.querySelector(`a[href="#${id}"]`)){
        const place=d.querySelector(target);if(place){const marker=d.createElement('span');marker.id=id;marker.className='skip-anchor';marker.tabIndex=-1;place.prepend(marker);fixes.push({file:rec.file,from:'#'+id,to:'added target marker'});}
      }
    }
    if(modern){
      const img=d.querySelector('.eco-figure img, .hero-image-wrapper img, .hero-image img');
      if(img){const replacement=newImage(d,heroAsset,img.className);img.replaceWith(replacement);}
      for(const card of d.querySelectorAll('.services-grid .service-card')){
        const icon=card.querySelector('.service-icon-wrapper');
        if(icon){icon.replaceChildren(newImage(d,assetFor(card.querySelector('h3')?.textContent||'',heroAsset),'editorial-card-photo',true));icon.classList.add('editorial-card-media');}
      }
    }else if(rec.family!=='gallery'){
      const container=d.querySelector('.subpage-hero-container, .hero-container');
      if(container){
        let content=container.querySelector(':scope > .subpage-hero-content, :scope > .hero-content');
        if(!content){content=d.createElement('div');content.className='subpage-hero-content';for(const node of [...container.childNodes])if(node.nodeType!==1||!node.matches('.subpage-hero-trust'))content.append(node);container.prepend(content);}
        const figure=d.createElement('figure');figure.className='subpage-editorial';figure.append(newImage(d,heroAsset,'editorial-hero-photo'));
        const caption=d.createElement('figcaption');caption.textContent='ECO CLEAN · Generált enteriőrkép';figure.append(caption);content.after(figure);
      }
    }
    for(const card of d.querySelectorAll('.pricing-card')) {
      const title=card.querySelector(':scope > h3, :scope > div:not(.pricing-price)');
      if(title)title.classList.add('pricing-item-name');
      if(service==='upholstery' && rec.family!=='rental' && title && /kanap|szófa|heverő|fotel|szék/i.test(title.textContent))card.prepend(newImage(d,assetFor(title.textContent),'pricing-editorial-photo',true));
    }
    // Legacy accordions use a plain first div/h3 followed by paragraphs and lists.
    // Keep every original heading and text, adding only explicit control hooks.
    for(const item of d.querySelectorAll('.faq-item')){
      if(item.querySelector('.faq-question'))continue;
      const heading=item.firstElementChild;if(!heading||!heading.matches('div,h3,h4'))continue;
      heading.classList.add('faq-heading');
      const button=d.createElement('button');button.type='button';button.className='faq-question';
      while(heading.firstChild)button.append(heading.firstChild);heading.append(button);
      const answer=d.createElement('div');answer.className='faq-answer';
      while(heading.nextSibling)answer.append(heading.nextSibling);item.append(answer);
    }
    // Source has no order form on these pages. Keep booking CTAs pointing to the demo homepage.
    const removeScripts=new Set(['mobile-menu.js','seo-content.js','modern-animations.js','booking-config.js','booking-calendar.js','assets/js/main.js','assets/js/animations.js','assets/js/theme-toggle.js']);
    for(const s of d.querySelectorAll('script[src]')){
      const src=s.getAttribute('src');
      if(removeScripts.has(src)||/jquery|slick/.test(src)){s.remove();continue;}
      if(src==='script.js')s.src='navigation.js';
      else if(src==='reviews.js')s.src='reviews-demo.js';
      else s.setAttribute('src',resolveURL(src,rec.file,'asset'));
    }
    for(const s of d.querySelectorAll('script:not([src]):not([type="application/ld+json"])')){
      if(/\.slick\(/.test(s.textContent)||(rec.file==='komarom.html'&&s.textContent.includes('.faq-question')))s.remove();
    }
    add('script',{src:'rollout.js'},d.body);
  }
  const output=dom.serialize();fs.writeFileSync(path.join(out,rec.file),output);
  manifest.push({file:rec.file,family:rec.family,sourceSha256:rec.sha256,outputSha256:crypto.createHash('sha256').update(output).digest('hex')});dom.window.close();
}
// Keep the approved homepage intact; only connect its existing links to this preview.
const indexPath=path.join(out,'index.html');let home=fs.readFileSync(indexPath,'utf8');
home=home.replace(/href="([^\"]+)"/g,(match,url)=>{
  const fixed=resolveURL(url,'index.html');return /\.html(?:[?#]|$)/.test(fixed)||url==='/'?`href="${fixed}"`:match;
});fs.writeFileSync(indexPath,home);
const navPath=path.join(out,'navigation.js');let nav=fs.readFileSync(navPath,'utf8').replace("const href = '../' + (",'const href = (');fs.writeFileSync(navPath,nav);
fs.writeFileSync(path.join(out,'rollout/manifest.json'),JSON.stringify({pages:inventory.length,built:manifest,linkRepairs:fixes},null,2));
console.log(JSON.stringify({pages:inventory.length,subpagesBuilt:manifest.length,linkRepairs:fixes.length}));
