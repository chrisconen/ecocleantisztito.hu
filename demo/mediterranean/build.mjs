import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {icon,shapes} from './icons.mjs';
const dir=path.dirname(fileURLToPath(import.meta.url)),demo=path.dirname(dir),root=path.dirname(demo);
const require=createRequire(path.join(process.env.TEMP,'ecoclean-demo-qa','package.json'));
const {JSDOM}=require('jsdom');
const content=JSON.parse(fs.readFileSync(path.join(dir,'content.hu.json'),'utf8'));
const assetSizes=new Map(JSON.parse(fs.readFileSync(path.join(dir,'asset-manifest.json'),'utf8')).map(asset=>[asset.name,asset.size]));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sourceMap=new Map(content.sources.map(s=>[s.id,s]));
function refs(ids){return ids?.length?`<span class="med-sources">${ids.map(id=>{const s=sourceMap.get(id);return `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)} ${icon('arrow')}</a>`;}).join('')}</span>`:'';}
const paragraphs=items=>items.map(p=>`<p>${esc(p.text)}${refs(p.sourceIds)}</p>`).join('');
const image=(name,alt,cls='',eager=false)=>{const size=assetSizes.get(name);if(!size)throw Error('Unknown image '+name);return `<img class="${cls}" src="mediterranean/assets/${name}.webp" alt="${esc(alt)}" width="${size[0]}" height="${size[1]}" ${eager?'fetchpriority="high"':'loading="lazy"'} decoding="async" data-generated-interior="true">`;};
const heading=(eyebrow,title,extra='')=>`<div class="med-heading ${extra}"><span class="med-eyebrow">${esc(eyebrow)}</span><h2>${esc(title)}</h2></div>`;
const button=(text,href,secondary=false)=>`<a class="med-button${secondary?' med-button-secondary':''}" href="${href}">${esc(text)}${icon('arrow')}</a>`;
const cities=content.cities;
const targets=[...cities.flatMap(city=>['karpittisztitas','matractisztitas'].map(service=>({file:`${service}-${city.slug}.html`,city,service}))),{file:'karpittisztitas-matractisztitas.html',city:null,service:'combined'}];
const furnitureAssets=['living','sofa','armchair','dining','office','bedroom'];
const furnitureIcons=['sofa','sofa','armchair','dining','office','bed'];
const iconDirectory=path.join(dir,'assets/icons');fs.mkdirSync(iconDirectory,{recursive:true});
for(const name of Object.keys(shapes))fs.writeFileSync(path.join(iconDirectory,name+'.svg'),icon(name).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" '));

function comparison(before,after,title,portrait=false,id='result'){
 const width=portrait?350:550,height=portrait?548:413;
 return `<figure class="med-result-figure${portrait?' med-result-portrait':''}"><div class="med-compare" data-compare style="--reveal:50%"><img class="med-compare-after" src="${esc(after)}" alt="${esc(title)} – tisztítás után" width="${width}" height="${height}" loading="lazy"><img class="med-compare-before" src="${esc(before)}" alt="${esc(title)} – tisztítás előtt" width="${width}" height="${height}" loading="lazy"><span class="med-compare-label med-before-label">Előtte</span><span class="med-compare-label med-after-label">Utána</span><span class="med-compare-line" aria-hidden="true"><span>‹ ›</span></span><input id="${id}" type="range" min="0" max="100" value="50" aria-label="${esc(title)} – az előtte és utána kép aránya"></div><figcaption>${esc(title)} · eredeti referenciafotók<span>Húzd a választóvonalat, vagy használd a nyílbillentyűket.</span></figcaption></figure>`;
}
const manifest=[];
for(const {file,city,service} of targets){
 // Immutable inputs avoid feeding a previously rebuilt page back into itself.
 const original=fs.readFileSync(path.join(dir,'baseline',file),'utf8');
 const dom=new JSDOM(original),d=dom.window.document;
 const mattress=service==='matractisztitas',combined=service==='combined';
 const serviceLabel=combined?'Kárpit- és matractisztítás':mattress?'Matractisztítás':'Kárpittisztítás';
 const locality=city?city.locative:'Kalocsa és a Duna mente térségében';
 const title=`${serviceLabel} ${city?city.name:'Kalocsa és környéke'} | ECO Clean`;
 const originalPairs=[];
 if(combined){
  const before=[...d.querySelectorAll('img')].filter(e=>/előtt/i.test(e.alt));
  const after=[...d.querySelectorAll('img')].filter(e=>/után/i.test(e.alt));
  before.forEach((e,i)=>{if(after[i])originalPairs.push([e.getAttribute('src'),after[i].getAttribute('src')]);});
 }else{
  const before=d.querySelector('.ba-img-before,.mc-ba__before'),after=d.querySelector('.ba-img-after,.mc-ba__after');
  if(!before||!after)throw Error(`Missing original comparison: ${file}`);
  originalPairs.push([before.getAttribute('src'),after.getAttribute('src')]);
 }
 const assetURL=url=>{
  const value=url.replace(/^\.\.\//,'').replace(/^\//,'').split('?')[0];
  if(fs.existsSync(path.join(root,value)))return '../'+value;
  if(fs.existsSync(path.join(root,'release',value)))return '../release/'+value;
  throw Error(`Missing retained asset ${url}`);
 };
 const pairs=originalPairs.map(pair=>pair.map(assetURL));
 const header=d.querySelector('.bixol-header')?.cloneNode(true),mobile=d.querySelector('.bixol-mobile-menu')?.cloneNode(true),footer=d.querySelector('footer')?.cloneNode(true),reviews=d.querySelector('#velemenyek')?.cloneNode(true);
 if(!header||!mobile||!footer)throw Error(`Missing navigation/footer: ${file}`);
 // Retain the current navigation links and genuine reviews, while replacing decorative emoji/icons.
 for(const fragment of [header,mobile,footer,reviews].filter(Boolean)){
  fragment.querySelectorAll('[style]').forEach(el=>el.removeAttribute('style'));
  fragment.querySelectorAll('script').forEach(el=>el.remove());
  fragment.querySelectorAll('i').forEach(el=>{
   const c=el.className;el.outerHTML=icon(/phone/.test(c)?'phone':/envelope/.test(c)?'mail':/map/.test(c)?'pin':/star/.test(c)?'star':/chevron/.test(c)?'arrow':'leaf');
  });
  const walker=d.createTreeWalker(fragment,dom.window.NodeFilter.SHOW_TEXT);let n;
  while(n=walker.nextNode())n.textContent=n.textContent.replace(/[\p{Extended_Pictographic}\uFE0F\u200D\u2605\u2606]/gu,'');
  fragment.querySelectorAll('[src]').forEach(el=>{if(el.tagName==='IMG')el.setAttribute('src',assetURL(el.getAttribute('src')));});
  fragment.querySelectorAll('a[href]').forEach(a=>{
   if(['adatvedelem.html','aszf.html','impresszum.html'].includes(a.getAttribute('href')))a.remove();
   if(/#(?:booking|foglalas)|megrendeles\.html/i.test(a.getAttribute('href'))){a.setAttribute('href','#arak');a.textContent='Ajánlatkérés';}
  });
 }
 if(reviews){reviews.classList.add('med-reviews');reviews.querySelectorAll('.review-stars,.stars,.gr-review-stars').forEach(e=>{e.innerHTML=Array.from({length:5},()=>icon('star')).join('');e.setAttribute('aria-label','5 csillag');});}
 const heroTitle=mattress?'A pihenés helye.<br><em>Friss figyelemmel.</em>':combined?'Szép otthon.<br><em>Törődés a részletekben.</em>':'Otthon, amibe<br><em>jó megérkezni.</em>';
 const heroLead=mattress?'Az este csendje, puha textilek, egy gondosan ápolt matrac. A hálószobád kényelme a kevésbé látható részleteken is múlik.':content.hero.lead;
 const description=`${serviceLabel} ${locality}: képes árösszesítő, anyaghoz igazított gondoskodás és valódi előtte–utána eredmények. ECO Clean.`;
 const cityNavigation=`<nav class="med-city-nav" aria-label="A megújult szolgáltatási oldalak">${cities.map(c=>`<a href="${mattress?'matractisztitas':'karpittisztitas'}-${c.slug}.html"${city?.slug===c.slug?' aria-current="page"':''}>${esc(c.name)}</a>`).join('')}</nav>`;
 const selectedFurniture=[...content.furniture.items.entries()];if(mattress)selectedFurniture.unshift(selectedFurniture.pop());
 const results=pairs.map(([before,after],i)=>`<div class="med-result-row"><div class="med-result-copy"><span class="med-eyebrow">${String(i+1).padStart(2,'0')} / ${mattress?'MATRAC':'KÁRPIT'}TISZTÍTÁS</span><h3>${mattress?'A matrac története<br>másképp folytatódik.':i===0?'A különbség<br>közelről látszik.':'Még egy bútor.<br>Még egy látható változás.'}</h3><p>${esc(content.comparison.intro)}</p><a class="med-button" href="tel:+36702408141">${icon('phone')}Hívj minket</a></div>${comparison(before,after,mattress?'Matractisztítás':`Kárpittisztítás${i?' · 2. referencia':''}`,mattress,'result-'+i)}</div>`).join('');
 const faq=content.faq.map(q=>({...q}));
 const main=`
 <main id="main-content">
 <section class="med-hero" id="hero"><div class="med-shell"><div class="med-breadcrumb"><a href="index.html">ECO Clean</a><span>/</span><span>${esc(serviceLabel)}${city?' · '+esc(city.name):''}</span></div><div class="med-hero-top"><div><span class="med-eyebrow">${esc(serviceLabel)} · ${esc(city?.name||'Duna mente')}</span><h1>${heroTitle}</h1></div><div class="med-hero-intro"><p>${esc(heroLead)}</p><p class="med-local-intro">${esc(serviceLabel)} ${esc(locality)}, figyelemmel a bútorodra és az otthonodra.</p><div class="med-actions">${button('Megtervezem a tisztítást','#arak')}${button('Valódi eredmények','#eredmenyek',true)}</div></div></div><figure class="med-hero-visual">${image(mattress?'bedroom':'living',mattress?'Mediterrán hangulatú hálószoba világos kárpitozott ággyal és matraccal – generált enteriőr':'Lágy mediterrán nappali világos kanapéval és természetes anyagokkal – generált enteriőr','',true)}<figcaption><span>${icon('textile')}A kedvenc bútoraidnak. A mindennapjaidhoz.</span><small>Generált enteriőrkép</small></figcaption></figure><div class="med-assurances">${[['home','Helyszíni tisztítás'],['textile','Anyaghoz igazított figyelem'],['layers','Átlátható árösszesítő'],['shield','Valódi referenciafotók']].map(([i,t])=>`<span>${icon(i)}${t}</span>`).join('')}</div></div></section>
 <section class="med-section med-furniture" id="szolgaltatasok"><div class="med-shell"><div class="med-section-top">${heading(content.furniture.eyebrow,content.furniture.title)}<p>${esc(content.furniture.intro)}</p></div><div class="med-furniture-grid">${selectedFurniture.map(([i,item])=>`<article class="med-furniture-card"><a class="med-furniture-photo" href="#arak" data-config-focus="${i}">${image(furnitureAssets[i],`${item.title} egy gondosan berendezett térben – generált kép`)}<span class="med-photo-action" aria-hidden="true">${icon('arrow')}</span></a><div class="med-furniture-text"><span class="med-item-index">0${i+1} ${icon(furnitureIcons[i])}</span><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p><a class="med-text-link" href="#arak" data-config-focus="${i}">Tisztítás megtervezése ${icon('arrow')}</a></div></article>`).join('')}</div><p class="med-image-note">A bútorok képei generált enteriőr-illusztrációk. Az anyag tisztíthatóságát mindig egyedileg egyeztetjük.</p></div></section>
 <section class="med-section med-history" id="otthon-regen-es-ma"><div class="med-shell"><div class="med-history-top">${heading(content.interiors.eyebrow,content.interiors.title)}<p>${esc(content.interiors.paragraphs[0].text)}</p></div><figure class="med-history-figure"><div class="med-compare med-era-compare" data-compare style="--reveal:50%">${image('living',content.interiors.presentLabel,'med-compare-after')}${image('heritage',content.interiors.pastLabel+' – generált történeti rekonstrukció','med-compare-before')}<span class="med-compare-label med-before-label">Egykor · 1980-as évek</span><span class="med-compare-label med-after-label">Ma · kortárs otthon</span><span class="med-compare-line" aria-hidden="true"><span>‹ ›</span></span><input type="range" min="0" max="100" value="50" aria-label="Régi és mai berendezés képeinek aránya"></div><figcaption>${esc(content.interiors.imageNote)}<span>A csúszkával bejárhatod a két korszak hangulatát.</span></figcaption></figure><div class="med-editorial-columns">${paragraphs(content.interiors.paragraphs.slice(1))}</div></div></section>
 <section class="med-section med-value" id="miert-mi"><div class="med-shell med-value-grid"><div>${heading(content.value.eyebrow,content.value.title)}${paragraphs(content.value.paragraphs)}</div><div class="med-value-list">${[['layers','Értékmegőrzés','A már meglévő, szeretett bútorért.'],['shield','Higiénia','A naponta használt felületek ápolásáért.'],['leaf','Otthonosság','Azért a jó érzésért, amikor megpihensz.']].map(([i,t,p])=>`<article>${icon(i)}<div><h3>${t}</h3><p>${p}</p></div></article>`).join('')}</div></div></section>
 <section class="med-section med-price-section" id="arak"><span id="foglalas" class="med-anchor"></span><div class="med-shell"><div class="med-section-top">${heading(content.configurator.eyebrow,content.configurator.title)}<p>${esc(content.configurator.intro)}</p></div><div data-med-configurator data-city="${city?.slug||''}" data-assets="mediterranean/assets" data-inquiry-email="info@ecocleantisztito.hu"><noscript>Az árösszesítőhöz JavaScript szükséges. Ajánlatkérés: <a href="mailto:info@ecocleantisztito.hu">info@ecocleantisztito.hu</a>. Online időpontfoglalás nincs, az időpontot személyesen egyeztetjük. Telefon: <a href="tel:+36702408141">+36 70 240 8141</a>.</noscript></div></div></section>
 <section class="med-section med-results" id="eredmenyek"><div class="med-shell">${heading(content.comparison.eyebrow,content.comparison.title)}${results}</div></section>
 <section class="med-section med-soil" id="a-hasznalat-nyomai"><div class="med-shell"><div class="med-section-top">${heading(content.soil.eyebrow,content.soil.title)}<p>${esc(content.soil.paragraphs[0].text)}</p></div><div class="med-soil-grid"><div class="med-hotspot-scene">${image('living','A kanapé gyakran érintett felületei – generált szemléltető kép')}${content.soil.hotspots.map((text,i)=>`<button type="button" class="med-hotspot med-hotspot-${i}" data-hotspot="${i}" aria-label="${esc(text)}" aria-pressed="${i===0}" aria-controls="med-hotspot-detail"><span>0${i+1}</span></button>`).join('')}<span class="med-scene-caption">Válassz egy jelölt pontot.</span></div><div class="med-soil-detail"><span class="med-eyebrow">KÖZELRŐL A RÉSZLETEK</span><div id="med-hotspot-detail" aria-live="polite"><h3>${esc(content.soil.hotspots[0].split(':')[0])}</h3><p>A haj és a bőr természetes zsírossága a háttámla felső részén hagyhat nyomot. A rendszeres ápolás segít időben észrevenni a lerakódást.</p></div><div class="med-hotspot-tabs">${content.soil.hotspots.map((t,i)=>`<button type="button" data-hotspot="${i}" aria-pressed="${i===0}" aria-controls="med-hotspot-detail">0${i+1} ${esc(t.split(':')[0])}</button>`).join('')}</div><p class="med-fine-print">${esc(content.soil.paragraphs[1].text)}</p></div></div></div></section>
 <section class="med-section med-mites" id="egeszseg-es-biztonsag"><div class="med-shell med-mites-grid"><div>${heading(content.mites.eyebrow,content.mites.title)}${paragraphs(content.mites.paragraphs)}</div><div class="med-mites-visual"><div class="med-tabs" role="tablist" aria-label="Az atkák lehetséges élőhelyei"><button type="button" role="tab" aria-selected="${!mattress}" aria-controls="mite-sofa" id="tab-sofa" data-mite-tab="sofa" tabindex="${mattress?-1:0}">${icon('sofa')}A kanapéban</button><button type="button" role="tab" aria-selected="${mattress}" aria-controls="mite-mattress" id="tab-mattress" data-mite-tab="mattress" tabindex="${mattress?0:-1}">${icon('bed')}A matracban</button></div>${['sofa','mattress'].map(kind=>`<figure id="mite-${kind}" role="tabpanel" aria-labelledby="tab-${kind}"${(kind==='mattress')!==mattress?' hidden':''}><button class="med-zoom-image" type="button" data-zoom="mediterranean/assets/mites-${kind}.webp" aria-label="Az atkás szemléltető kép nagyítása">${image('mites-'+kind,`Háziporatkák, peték és hámsejtek a ${kind==='sofa'?'kanapé':'matrac'} szövetében – nagyított, nem méretarányos generált illusztráció`)}<span>${icon('plus')}Nagyítás</span></button><figcaption>${esc(content.mites.imageCaption)}</figcaption></figure>`).join('')}<div class="med-mite-legend">${content.mites.imageLabels.map((x,i)=>`<span><b>0${i+1}</b>${esc(x)}</span>`).join('')}</div></div></div></section>
 <section class="med-section med-care"><div class="med-shell">${heading(content.care.eyebrow,content.care.title)}<div class="med-care-grid">${content.care.items.map((item,i)=>`<article>${icon(['textile','drop','wind'][i])}<span class="med-item-index">0${i+1}</span><h3>${esc(item.title)}</h3><p>${esc(item.text)}${refs(item.sourceIds)}</p></article>`).join('')}</div></div></section>
 <section class="med-section med-process" id="hogyan-mukodik"><div class="med-shell">${heading('EGYSZERŰ LÉPÉSEK · SZEMÉLYES FIGYELEM',content.process.title)}<div class="med-process-grid">${content.process.items.map((item,i)=>`<article><span class="med-step-number">0${i+1}</span><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p></article>`).join('')}</div></div></section>
 ${reviews?.outerHTML||''}
 <section class="med-section med-faq" id="gyakori-kerdesek"><div class="med-shell med-faq-grid"><div>${heading('AMIT JÓ ELŐRE TUDNI','Kérdések, amikkel nyugodtan kereshetsz.')}<p>Szívesen segítünk eligazodni az anyagok, méretek és lehetőségek között.</p><a class="med-text-link" href="tel:+36702408141">${icon('phone')}+36 70 240 8141</a></div><div>${faq.map((item,i)=>`<details class="med-faq-item"${i===0?' open':''}><summary><span>${esc(item.question)}</span>${icon('plus')}</summary><p>${esc(item.answer)}${refs(item.sourceIds)}</p></details>`).join('')}</div></div></section>
 <section class="med-section med-closing"><div class="med-shell"><span class="med-eyebrow">ECO CLEAN · GONDOSKODÁS AZ OTTHONODRÓL</span><h2>${esc(content.closing.title)}</h2><p>${esc(content.closing.text)}</p>${button(content.closing.cta,'#arak')}<div class="med-closing-region"><span>Kárpit- és matractisztítás a térségben</span>${cityNavigation}</div></div></section>
 </main><dialog class="med-image-dialog" aria-label="Nagyított szemléltető illusztráció"><button type="button" class="med-dialog-close" aria-label="Kép bezárása">×</button><img alt="Nagyított generált poratka-illusztráció, nem méretarányos"><p>${esc(content.mites.imageCaption)}</p></dialog>`;
 const faqSchema={'@context':'https://schema.org','@type':'FAQPage',mainEntity:faq.map(q=>({'@type':'Question',name:q.question,acceptedAnswer:{'@type':'Answer',text:q.answer}}))};
 const serviceSchema={'@context':'https://schema.org','@type':'Service',name:title,description,provider:{'@type':'Organization',name:'ECO Clean',url:'https://ecocleantisztito.hu/',telephone:'+36702408141'},areaServed:(city?[city]:cities).map(c=>({'@type':'City',name:c.name}))};
 const output=`<!doctype html><html lang="hu" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>DEMÓ · ${esc(title)}</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="https://ecocleantisztito.hu/${file}"><meta name="theme-color" content="#faf7f1"><link rel="icon" href="../favicon-32x32.png"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap" rel="stylesheet"><link rel="stylesheet" href="modern.css"><link rel="stylesheet" href="mediterranean/design.css"><script type="application/ld+json">${JSON.stringify(serviceSchema).replace(/</g,'\\u003c')}</script><script type="application/ld+json">${JSON.stringify(faqSchema).replace(/</g,'\\u003c')}</script></head><body class="eco-modern eco-mediterranean" data-city="${city?.slug||'region'}" data-med-service="${service}"><a class="med-skip" href="#main-content">Ugrás a tartalomhoz</a>${header.outerHTML}${mobile.outerHTML}${main}${footer.outerHTML}<script src="rollout.js"></script><script src="mediterranean/configurator.js"></script><script src="mediterranean/interactions.js"></script></body></html>`;
 fs.writeFileSync(path.join(demo,file),output);
 manifest.push({file,city:city?.name||'region',service,sourceSha256:crypto.createHash('sha256').update(original).digest('hex'),outputSha256:crypto.createHash('sha256').update(output).digest('hex'),originalPairs,retainedPairs:pairs});
 dom.window.close();
}
fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({createdAt:new Date().toISOString(),scope:'demo',pages:manifest},null,2)+'\n');
console.log(JSON.stringify({pages:manifest.length,originalComparisonPairs:manifest.reduce((sum,p)=>sum+p.originalPairs.length,0),output:'demo/',liveArtifactChanged:false}));
