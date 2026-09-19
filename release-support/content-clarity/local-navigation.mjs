import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(path.join(process.env.TEMP,'ecoclean-demo-qa/package.json'));
const {JSDOM}=require('jsdom');
const cities={gyor:'Győr',sopron:'Sopron',szombathely:'Szombathely',veszprem:'Veszprém',tatabanya:'Tatabánya',komarom:'Komárom',papa:'Pápa',mosonmagyarovar:'Mosonmagyaróvár',tata:'Tata',balatonfured:'Balatonfüred',siofok:'Siófok',keszthely:'Keszthely',heviz:'Hévíz',tihany:'Tihany',balatonalmadi:'Balatonalmádi',tapolca:'Tapolca',revfulop:'Révfülöp',badacsony:'Badacsony',balatonfoldvar:'Balatonföldvár',balatonlelle:'Balatonlelle',balatonboglar:'Balatonboglár',fonyod:'Fonyód',balatonszemes:'Balatonszemes',zamardi:'Zamárdi',balatonfuzfo:'Balatonfűzfő',balatonkenese:'Balatonkenese',baja:'Baja',dunafoldvar:'Dunaföldvár',kalocsa:'Kalocsa',kiskoros:'Kiskőrös',paks:'Paks',solt:'Solt',szekszard:'Szekszárd'};
const services=[['karpittisztitas','upholstery-cleaning','Kárpittisztítás','Upholstery'],['matractisztitas','mattress-cleaning','Matractisztítás','Mattresses'],['szonyegtisztitas','carpet-cleaning','Szőnyegtisztítás','Carpets'],['takaritas','cleaning','Takarítás','Cleaning'],['ablaktisztitas','window-cleaning','Ablaktisztítás','Windows']];
export const regionalPage=name=>{
 const base=path.posix.basename(name);
 if(base==='komarom.html')return {city:'komarom',label:cities.komarom,service:null};
 for(const [city,label]of Object.entries(cities))for(const service of services)if([service[0]+'-'+city+'.html',service[1]+'-'+city+'.html'].includes(base))return {city,label,service};
 return null;
};
export function applyLocalNavigation({read,edit,root}){
 const files=fs.readdirSync(path.join(root,'release')).filter(n=>n.endsWith('.html')).concat(fs.readdirSync(path.join(root,'release/en')).filter(n=>n.endsWith('.html')).map(n=>'en/'+n));
 const available=new Set(files);
 let pages=0;
 for(const name of files){
  const info=regionalPage(name);if(!info)continue;
  const en=name.startsWith('en/'),area=info.label+(en?' and surrounding areas':' és környéke');
  const body=read(name).match(/<body\b[^>]*>/)[0];
  edit(name,body,body.slice(0,-1)+` data-local-city="${info.city}">`);
  const target=service=>{
   const translated='en/'+service[1]+'-'+info.city+'.html',hu=service[0]+'-'+info.city+'.html';
   return en&&available.has(translated)?path.posix.basename(translated):available.has(hu)?(en?'../':'')+hu:null;
  };
  const entries=services.map(service=>({href:target(service),label:service[en?3:2],current:service===info.service})).filter(x=>x.href);
  const home=!en&&available.has(info.city+'.html')?info.city+'.html':target(services[0])||entries[0].href;
  const links=entries.map(e=>`<li class="eco-local-nav-item"><a class="nav-link eco-local-link" href="${e.href}"${e.current?' aria-current="page"':''}>${e.label}</a></li>`).join('');
  const anchors=entries.map(e=>`<a href="${e.href}"${e.current?' aria-current="page"':''}>${e.label}</a>`).join('');
  function mutate(selector,render){
   const token={'.nav-mobile-menu':'class="nav-mobile-menu"','#nav .nav-main':'class="nav-main"','.desktop-menu nav > ul':'class="desktop-menu"','.bixol-mobile-menu':'bixol-mobile-menu','.med-city-nav':'class="med-city-nav"'}[selector];
   if(token&&!read(name).includes(token))return;
   const html=read(name),dom=new JSDOM(html,{includeNodeLocations:true});
   const nodes=[...dom.window.document.querySelectorAll(selector)].filter(n=>!n.parentElement.closest(selector));
   const changes=nodes.map(n=>{const loc=dom.nodeLocation(n);return {before:html.slice(loc.startOffset,loc.endOffset),after:render(n,loc,html)};});dom.window.close();
   for(const c of new Map(changes.map(c=>[c.before,c])).values())if(c.before!==c.after)edit(name,c.before,c.after);
  }
  mutate('.nav-mobile-menu',()=>`<ul class="nav-mobile-menu eco-local-nav" aria-label="${area}"><li class="eco-local-area">${area}</li>${links}</ul>`);
  mutate('#nav .nav-main',()=>`<ul class="nav-main eco-local-nav" aria-label="${area}">${links}</ul>`);
  mutate('.desktop-menu nav > ul',()=>`<ul class="eco-local-nav" aria-label="${area}">${links}</ul>`);
  mutate('.bixol-mobile-menu',n=>`<${n.localName} class="${n.className}"><p class="eco-local-area">${area}</p><ul class="eco-local-nav">${links}</ul></${n.localName}>`);
  mutate('.med-city-nav',()=>`<nav class="med-city-nav eco-local-services" aria-label="${area}"><strong>${area}</strong>${anchors}</nav>`);
  // Logo and footer stay in the same area. Remove stale remote-area links elsewhere too.
  mutate('a[href]',(a,loc,html)=>{
   const original=html.slice(loc.startOffset,loc.endOffset),href=a.getAttribute('href');
   if(a.matches('.nav-logo,.desktop-logo')&&/^(?:\.\.\/)?(?:index|karpittisztitas-matractisztitas)\.html$/.test(href)){
    a.setAttribute('href',home);a.setAttribute('aria-label','ECO Clean · '+area);
    const tagline=a.querySelector('.nav-logo-text span,.logo-subtitle');if(tagline)tagline.textContent=area;
    return a.outerHTML;
   }
   if(/^(?:[a-z]+:|\/\/|#)/i.test(href))return original;
   const destination=regionalPage(href.split(/[?#]/)[0]);
   if(destination&&destination.city!==info.city){
    const own=target(destination.service);if(!own)return '';
    a.setAttribute('href',own);a.textContent=destination.service[en?3:2]+' · '+info.label;return a.outerHTML;
   }
   return original;
  });
  mutate('footer ul',ul=>{
   const seen=new Set();
   for(const li of [...ul.querySelectorAll('li')]){
    const a=li.querySelector('a[href]');if(!a)continue;
    const href=a.getAttribute('href');if(!regionalPage(href.split(/[?#]/)[0]))continue;
    if(seen.has(href))li.remove();else seen.add(href);
   }
   return ul.outerHTML;
  });
  pages++;
 }
 const css=`
/* City pages are independent local service groups, with ordinary accessible links. */
.eco-local-nav .eco-local-nav-item{list-style:none;display:block}
.eco-local-nav .eco-local-link{display:block;text-decoration:none;min-height:44px;align-content:center}
.eco-local-nav a[aria-current="page"],.eco-local-services a[aria-current="page"]{text-decoration:underline;text-underline-offset:5px}
.eco-local-area{font:600 16px/1.5 Manrope,sans-serif;padding:16px 20px;color:inherit}
.nav-mobile .eco-local-link,.bixol-mobile-menu .eco-local-link{padding:14px 22px;font-size:17px;color:inherit;border-bottom:1px solid #9d998c33}
.eco-local-services{flex-wrap:wrap;gap:12px}.eco-local-services strong{flex-basis:100%;font-size:16px}
.nav .nav-logo-text span{max-width:220px;white-space:normal;font-size:11px;line-height:1.3}
body[data-local-city] .section-title{overflow-wrap:anywhere}
body[data-local-city] .nav-mobile:not(.active),body[data-local-city] .bixol-mobile-menu:not(.active){display:none!important}
@media(min-width:1051px){.nav-main.eco-local-nav{gap:14px}.nav-main.eco-local-nav .nav-link{font-size:12px;padding-inline:0}}
@media(max-width:1050px){body[data-local-city] .nav-logo{min-width:0;flex-shrink:1}body[data-local-city] .nav-logo-text span{max-width:140px;font-size:9px;letter-spacing:1px}body[data-local-city] .nav-mobile-toggle{flex-shrink:0}}
@media(max-width:350px){body[data-local-city] .nav-logo-text span{max-width:105px}}
`;
 for(const asset of ['ui/design.css','ui/modern.css'])edit(asset,read(asset),read(asset)+css);
 console.log(JSON.stringify({localNavigationPages:pages}));
}
