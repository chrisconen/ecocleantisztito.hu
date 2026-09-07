import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const support=path.dirname(fileURLToPath(import.meta.url));
const root=path.dirname(support);
const require=createRequire(path.join(process.env.TEMP,'ecoclean-demo-qa','package.json'));
const {JSDOM}=require('jsdom');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const template=new JSDOM(read('demo/szonyegtisztitas-gyor.html'));
const originalGyor=new JSDOM(read('szonyegtisztitas-gyor.html'));
const originalBalaton=new JSDOM(read('szonyegtisztitas-balatonalmadi.html'));
const d=template.window.document;
const escape=text=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const text=(node,selector)=>node.querySelector(selector).textContent.trim();
const sentence=(value,index=0)=>value.match(/[^.!?]+[.!?]+/g)[index].trim();

const cities=[
  {slug:'balatonboglar',name:'Balatonboglár',inCity:'Balatonbogláron',region:2},
  {slug:'balatonfuzfo',name:'Balatonfűzfő',inCity:'Balatonfűzfőn',region:1},
  {slug:'balatonkenese',name:'Balatonkenese',inCity:'Balatonkenesén',region:1},
  {slug:'balatonszemes',name:'Balatonszemes',inCity:'Balatonszemesen',region:2}
];
const industries=[...originalBalaton.window.document.querySelectorAll('.industry-card')].map((card,index)=>({
  title:text(card,'h3'),
  // Keep the generic service descriptions; omit express and surcharge terms.
  description:[0,2].includes(index)?sentence(text(card,'p')):text(card,'p')
}));
const steps=[...originalBalaton.window.document.querySelectorAll('.process-step')].slice(0,4).map((step,index)=>({
  title:text(step,'h3'),
  // The quote and drying deadlines on another city's page are not transferred.
  description:index===1?sentence(text(step,'p'),1):index===3?sentence(text(step,'p')):text(step,'p')
}));
if(industries.length!==4||steps.length!==4)throw Error('Original service sections changed: review supplemental copy.');
const intro=sentence(text(originalGyor.window.document,'.subpage-hero-desc'),1);
const quoteNote=text(originalGyor.window.document,'.pricing .section-description');
const contact=text(originalGyor.window.document,'.cta-container > p');

const shellSelectors=['.skip-link','.mobile-menu-overlay','.nav-mobile','#megaMenuOverlay','#megaMenuContainer','#nav'];
const shell=shellSelectors.map(selector=>{
  const el=d.querySelector(selector);
  if(!el)throw Error('Approved navigation markup changed: '+selector);
  return el.cloneNode(true);
});
const mobile=shell.find(el=>el.matches('.nav-mobile'));
const carpetMenu=[...mobile.querySelectorAll('.nav-mobile-item')].find(el=>text(el,'.nav-mobile-link').startsWith('Szőnyegtisztítás'));
for(const city of cities){
  const grid=carpetMenu.querySelectorAll('.cities-grid')[city.region];
  const link=d.createElement('a');link.href=`szonyegtisztitas-${city.slug}.html`;link.textContent=city.name;grid.append(link);
}
// Existing shared listeners support native buttons and keyboard activation.
for(const part of shell)for(const span of part.querySelectorAll('span.nav-link,span.nav-mobile-link')){
  const button=d.createElement('button');button.type='button';button.className=span.className;button.innerHTML=span.innerHTML;span.replaceWith(button);
}
const footer=d.querySelector('.footer').outerHTML;
const phoneIcon='<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 11.05 11.05 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 11.05 11.05 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';

const out=path.join(support,'supplemental');fs.mkdirSync(out,{recursive:true});
for(const city of cities){
  const file=`szonyegtisztitas-${city.slug}.html`;
  const canonical='https://ecocleantisztito.hu/'+file;
  const title=`Ipari szőnyegtisztítás ${city.name} | ECO Clean`;
  const description=`Ipari szőnyegtisztítás vállalatoknak ${city.inCity}. ${intro}`;
  const schema={'@context':'https://schema.org','@type':'Service',name:`Ipari szőnyegtisztítás ${city.name}`,serviceType:'Ipari szőnyegtisztítás',url:canonical,description,areaServed:{'@type':'Place',name:city.name},provider:{'@type':'Organization',name:'ECO Clean',url:'https://ecocleantisztito.hu/',telephone:'+36702408141',email:'info@ecocleantisztito.hu'}};
  const html=`<!DOCTYPE html>
<html lang="hu" data-theme="light"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escape(title)}</title><meta name="description" content="${escape(description)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:locale" content="hu_HU"><meta property="og:type" content="website">
  <meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}">
  <meta property="og:url" content="${canonical}"><meta property="og:site_name" content="ECO Clean">
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&amp;family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&amp;display=swap">
  <link rel="icon" href="icon.ico" type="image/x-icon">
  <link rel="stylesheet" href="ui/rollout/styles-szonyegtisztitas-gyor.css"><link rel="stylesheet" href="ui/design.css"><link rel="stylesheet" href="ui/subpages.css"><link rel="stylesheet" href="ui/supplemental.css">
</head><body class="eco-rollout eco-subpage eco-site eco-supplemental" data-family="classic" data-service="business">
${shell.map(el=>el.outerHTML).join('\n')}
<main id="main-content" tabindex="-1">
  <section class="subpage-hero" aria-labelledby="service-title">
    <div class="subpage-hero-container">
      <div class="subpage-hero-content">
        <nav class="breadcrumb" aria-label="Morzsanavigáció"><a href="index.html">Főoldal</a><span aria-hidden="true">/</span><span>${escape(city.name)}</span></nav>
        <div class="subpage-hero-badge"><span class="badge-business">Csak céges</span><span class="badge-location">${escape(city.name)}</span></div>
        <h1 class="subpage-hero-title" id="service-title">Ipari szőnyegtisztítás <span class="eco-gradient">${escape(city.name)}</span></h1>
        <p class="subpage-hero-desc">${escape(description)}</p>
        <div class="subpage-hero-cta"><a href="tel:+36702408141" class="btn btn-primary btn-lg">${phoneIcon}Hívjon: 06 70 240 8141</a><a href="#szolgaltatas" class="btn btn-secondary">Szolgáltatásunk</a></div>
      </div>
      <figure class="subpage-editorial"><img class="editorial-hero-photo" src="assets/business-lounge.webp" alt="Generált enteriőrkép: szőnyegpadlós üzleti várótér" width="1672" height="941" fetchpriority="high" data-generated-interior="true"><figcaption>ECO CLEAN · Generált enteriőrkép</figcaption></figure>
    </div>
  </section>
  <section class="industry-section" id="szolgaltatas" aria-labelledby="industry-title"><div class="section-container">
    <div class="section-header"><div class="section-label">Céges ügyfeleknek</div><h2 class="section-title" id="industry-title">Tiszta szőnyegek,<br>gondozott üzleti terek.</h2><p class="section-description">${escape(intro)}</p></div>
    <div class="industry-grid">${industries.map((item,index)=>`<article class="industry-card"><span class="supplemental-number" aria-hidden="true">0${index+1}</span><h3>${escape(item.title)}</h3><p>${escape(item.description)}</p></article>`).join('\n')}</div>
  </div></section>
  <section class="process-section" aria-labelledby="process-title"><div class="section-container">
    <div class="section-header"><div class="section-label">Hogyan működik?</div><h2 class="section-title" id="process-title">A szőnyegtisztítás menete</h2></div>
    <div class="process-timeline">${steps.map((step,index)=>`<article class="process-step"><div class="process-number" aria-hidden="true">${index+1}</div><h3>${escape(step.title)}</h3><p>${escape(step.description)}</p></article>`).join('\n')}</div>
    <div class="pricing-note-box"><p>${escape(quoteNote)}</p></div>
  </div></section>
  <section class="cta" id="árajánlat" aria-labelledby="contact-title"><div class="cta-container">
    <div class="section-label">${escape(city.name)} · Kapcsolat</div><h2 id="contact-title">Kérjen <span>árajánlatot!</span></h2>
    <p>${escape(contact)}</p><div class="cta-buttons"><a href="tel:+36702408141" class="btn btn-primary btn-lg">${phoneIcon}06 70 240 8141</a><a href="mailto:info@ecocleantisztito.hu" class="btn btn-secondary">Email</a></div>
    <a class="supplemental-email" href="mailto:info@ecocleantisztito.hu">info@ecocleantisztito.hu</a>
  </div></section>
  <section class="other-cities" aria-labelledby="cities-title"><div class="section-container"><h3 id="cities-title">Ipari szőnyegtisztítás más városokban</h3><div class="cities-links">${cities.filter(other=>other.slug!==city.slug).map(other=>`<a href="szonyegtisztitas-${other.slug}.html">${escape(other.name)}</a>`).join('')}<a href="szonyegtisztitas-balatonalmadi.html">Balatonalmádi</a><a href="szonyegtisztitas-balatonlelle.html">Balatonlelle</a><a href="szonyegtisztitas-gyor.html">Győr</a></div></div></section>
</main>
${footer}
<script src="ui/navigation.js"></script><script src="ui/rollout.js"></script>
</body></html>
`;
  fs.writeFileSync(path.join(out,file),html,'utf8');
}
for(const doc of [template,originalGyor,originalBalaton])doc.window.close();
console.log(JSON.stringify({pages:cities.map(city=>`szonyegtisztitas-${city.slug}.html`),stylesheet:'release-support/supplemental.css',output:'release-support/supplemental'}));
