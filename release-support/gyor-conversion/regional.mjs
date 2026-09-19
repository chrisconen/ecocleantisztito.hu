// Reuse the approved components, while each region keeps its own financial engine.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(path.join(process.env.TEMP,'ecoclean-demo-qa/package.json'));
const {JSDOM}=require('jsdom');
const inflected={sopron:'Sopronban',szombathely:'Szombathelyen',veszprem:'Veszprémben',tatabanya:'Tatabányán',komarom:'Komáromban',papa:'Pápán',mosonmagyarovar:'Mosonmagyaróváron',tata:'Tatán',balatonfured:'Balatonfüreden',siofok:'Siófokon',keszthely:'Keszthelyen',heviz:'Hévízen',tihany:'Tihanyban',balatonalmadi:'Balatonalmádiban',tapolca:'Tapolcán',revfulop:'Révfülöpön',badacsony:'Badacsonyban',balatonfoldvar:'Balatonföldváron',balatonlelle:'Balatonlellén',balatonboglar:'Balatonbogláron',fonyod:'Fonyódon',balatonszemes:'Balatonszemesen',zamardi:'Zamárdiban',balatonfuzfo:'Balatonfűzfőn',balatonkenese:'Balatonkenesén',baja:'Baján',dunafoldvar:'Dunaföldváron',kalocsa:'Kalocsán',kiskoros:'Kiskőrösön',paks:'Pakson',solt:'Solton',szekszard:'Szekszárdon'};
export function applyRegionalConversion({read,edit,tariff}){
 const baseline=JSON.parse(fs.readFileSync(path.join(import.meta.dirname,'rollout-baseline.json')));
 const medContext={};vm.runInNewContext(read('mediterranean/configurator.js'),medContext);
 const med=medContext.EcoMediterraneanPricing;
 const templates={};
 for(const en of [false,true]){
  const html=read(en?'en/upholstery-cleaning-gyor.html':'karpittisztitas-gyor.html');
  templates[en]={hero:html.match(/<section class="gyor-hero"[\s\S]*?<\/section>/)[0],stories:html.match(/<section class="gyor-stories"[\s\S]*?<\/section>/)[0],bar:html.match(/<div class="gyor-mobile-booking">[\s\S]*?<\/div>/)[0],css:html.match(/<link rel="stylesheet" href="[^"]*studio\/gyor-conversion\.css[^>]+>/)[0],js:html.match(/<script src="[^"]*studio\/gyor-conversion\.js[^>]*><\/script>/)[0]};
 }
 let count=0;
 for(const [file,info]of Object.entries(baseline.pages)){
  if(info.city==='gyor')continue;
  const en=file.startsWith('en/'),t=(hu,english)=>en?english:hu;
  const tpl=templates[en],target=info.studio?'studio-kalkulator':'arak';
  const money=n=>new Intl.NumberFormat('en-GB').format(n).replaceAll(',',' ')+(en?' HUF':' Ft');
  const amount=(id)=>info.studio?tariff.pricing.karpit[id].price:med.catalog.find(p=>p.id===({szofa:'straight-sofa',l_kanape:'sectional-sofa',ebedlo_szek:'diningchair'}[id])).variants[0].price;
  const travel=info.studio?tariff.pricing.travelZones:med.travelZones;
  const range=new Intl.NumberFormat('en-GB').format(travel.belvaros.fee).replaceAll(',',' ')+'–'+money(travel['40km'].fee);
  const action=info.studio?t('Ár és szabad időpont','Price & availability'):t('Ár és ajánlatkérés','Price & quote request');
  const doc=new JSDOM(tpl.hero+tpl.stories+tpl.bar).window.document;
  const hero=doc.querySelector('.gyor-hero'),stories=doc.querySelector('.gyor-stories'),bar=doc.querySelector('.gyor-mobile-booking');
  hero.id=info.studio?'main-content':'hero';
  hero.dataset.conversionCalculator=target;
  hero.dataset.reviewsEndpoint='https://reviews.chris-conen.workers.dev/';
  hero.querySelector('.gyor-eyebrow').textContent='ECO Clean · '+info.label+t(' és környéke',' and surroundings');
  const cityName=t(inflected[info.city],info.label).replace('Mosonmagyar','Moson<wbr>magyar');
  hero.querySelector('h1').innerHTML=t('Kárpittisztítás<br><span class="regional-city-name">'+cityName+'.</span><br><em>Látható különbséggel.</em>','Upholstery cleaning in<br><span class="regional-city-name">'+cityName+'.</span><br><em>See the difference.</em>');
  hero.querySelector('.gyor-prices').setAttribute('aria-label',t('Tisztítási alapárak, kiszállás nélkül','Cleaning base prices, before travel'));
  ['szofa','l_kanape','ebedlo_szek'].forEach((id,i)=>hero.querySelectorAll('.gyor-price strong')[i].textContent=money(amount(id)));
  hero.querySelector('.gyor-travel strong').textContent=t('Kiszállás: '+range+', a választott körzettől függően.','Travel: '+range+', depending on your zone.');
  hero.querySelector('.gyor-scope').textContent=t('Tisztítási alapárak, kiszállás és választható extrák nélkül. Válassz körzetet a kalkulátorban a kiszállással együtt számolt összeghez. ','Cleaning base prices, before travel and optional extras. Select your zone in the calculator for a total including travel. ')+(info.studio?t('Az elérhető időpontokat a megrendelőben választhatod ki.','Choose an available appointment in the booking form.'):t('Az időpontot az ajánlatkérés után, személyesen egyeztetjük.','We arrange an appointment with you after your quote request.'));
  stories.querySelector('.gyor-section-head>p').textContent=t('Az ECO Clean saját munkái, eredeti felvételeken. A fotók eltérő fényben és nézőpontból készülhettek. Az alábbi árak a jelenlegi helyi alapárak, kiszállás és extrák nélkül; nem a bemutatott munkák korabeli végösszegei.','Original photographs of ECO Clean’s own work. Lighting and camera angles may differ. Prices below are current local base prices, before travel and extras; they are not the historic invoices for these jobs.');
  ['l_kanape','szofa','ebedlo_szek'].forEach((id,i)=>{
   const price=stories.querySelectorAll('.gyor-story-price')[i];
   price.querySelector('strong').textContent=money(amount(id));
   price.lastChild.textContent=t('A kiszállási díjat a kiválasztott körzet alapján számoljuk.','Travel is charged according to your selected zone.');
  });
  stories.querySelector('.gyor-review-note p').innerHTML='<strong>'+t('A képek mellé az ügyfeleink tapasztalata.','Alongside the photos, hear from our customers.')+'</strong><br>'+t('Az ECO Clean közös Google-profilján elolvashatod a vállalkozásunkról írt visszajelzéseket.','Read feedback about our business on ECO Clean’s shared Google profile.');
  bar.querySelector('span').innerHTML=t('Kiszállás körzet szerint','Travel by zone')+'<strong>'+money(travel.belvaros.fee)+t('-tól',' and up')+'</strong>';
  for(const a of doc.querySelectorAll('a[href="#studio-kalkulator"]'))a.setAttribute('href','#'+target);
  for(const a of doc.querySelectorAll('.gyor-button'))a.innerHTML=action+'<span aria-hidden="true">→</span>';
  for(const a of doc.querySelectorAll('a[href^="tel:"]'))a.setAttribute('href',info.phones[0]);
  const replace=(pattern,after,optional=false)=>{
   const matches=[...read(file).matchAll(pattern)];
   if(optional&&!matches.length)return;
   if(matches.length!==1)throw Error('Regional target mismatch '+file+' '+pattern);
   edit(file,matches[0][0],after);
  };
  const calcPattern=info.studio?/<section class="med-section med-price-section" id="studio-kalkulator">[\s\S]*?<\/section>/g:/<section class="med-section med-price-section" id="arak">[\s\S]*?<\/section>/g;
  const calc=read(file).match(calcPattern)?.[0];if(!calc)throw Error('Missing region calculator '+file);
  edit(file,calc,'');
  const chapters=`<nav class="studio-chapters" aria-label="${t('Ugrás az oldal témáihoz','Skip to page topics')}"><a href="#gyor-referenciak">${t('Valódi eredmények','Real results')}</a><a href="#${target}">${action}</a>${info.studio?'<a href="#arak">'+t('Részletes árlista','Full price list')+'</a>':''}<a href="#anyagfelismero">${t('Anyagkalauz','Fabric guide')}</a><a href="#${info.studio?'studio-kerdesek':'gyakori-kerdesek'}">${t('Gyakori kérdések','Questions')}</a></nav>`;
  replace(info.studio?/<section class="subpage-hero"[\s\S]*?<\/section>/g:/<section class="med-hero"[\s\S]*?<\/section>/g,hero.outerHTML+chapters+stories.outerHTML+calc);
  if(info.studio){
   // Remove the old chapter menu only, retaining the newly inserted navigation.
   const old=[...read(file).matchAll(/<nav class="studio-chapters"[\s\S]*?<\/nav>/g)].filter(m=>!m[0].includes('#gyor-referenciak'));
   if(old.length!==1)throw Error('Unexpected old chapters '+file);
   edit(file,old[0][0],'');
   replace(/[ \t]*<section class="ba-promo-section">[\s\S]*?<\/section>/g,'',true);
  }else{
   const menu=read(file).match(/<div class="bixol-mobile-menu"[^>]*>/)?.[0];
   if(!menu)throw Error('Missing Mediterranean menu '+file);
   edit(file,menu,menu+`<button type="button" class="regional-menu-close" data-conversion-menu-close aria-label="${t('Menü bezárása','Close menu')}">×</button>`);
  }
  const body=read(file).match(/<body\b[^>]*>/)[0];
  edit(file,body,body.replace(/class="([^"]*)"/,'class="$1 eco-gyor-conversion"'));
  const title=t('Kárpittisztítás '+info.label+' – '+money(amount('szofa'))+'-tól | ECO Clean','Upholstery Cleaning '+info.label+' – from '+money(amount('szofa'))+' | ECO Clean');
  const desc=t('Kárpittisztítás '+inflected[info.city]+': szófa '+money(amount('szofa'))+', L kanapé '+money(amount('l_kanape'))+' alapártól. Kiszállás körzet szerint, külön díjjal. Saját referenciafotók és online árkalkulátor.','Upholstery cleaning in '+info.label+': sofa from '+money(amount('szofa'))+', L-shaped sofa from '+money(amount('l_kanape'))+'. Travel charged separately by zone. Original reference photos and online price calculator.');
  replace(/<title>[\s\S]*?<\/title>/g,'<title>'+title+'</title>');
  replace(/<meta name="description" content="[^"]*"\s*\/?\s*>/g,'<meta name="description" content="'+desc+'">');
  replace(/<meta property="og:description" content="[^"]*"\s*\/?\s*>/g,'<meta property="og:description" content="'+desc+'">',true);
  replace(/<meta property="og:image" content="[^"]*"\s*\/?\s*>/g,'<meta property="og:image" content="https://ecocleantisztito.hu/img/karpittisztitas-utan-2.webp">',true);
  edit(file,'</head>',tpl.css+'</head>');
  edit(file,'</body>',bar.outerHTML+tpl.js+'</body>');
  doc.defaultView.close();count++;
 }
 console.log(JSON.stringify({regionalConversionPages:count}));
}
