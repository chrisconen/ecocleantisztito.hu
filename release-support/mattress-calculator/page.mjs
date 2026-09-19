import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {regionalPage} from '../content-clarity/local-navigation.mjs';
const hash=data=>crypto.createHash('sha256').update(data).digest('hex').slice(0,12);
export function applyMattressCalculators({read,edit,root}){
 const css=hash(fs.readFileSync(path.join(import.meta.dirname,'calculator.css'))),js=hash(fs.readFileSync(path.join(import.meta.dirname,'calculator.js')));
 const files=fs.readdirSync(path.join(root,'release')).filter(f=>/^matractisztitas-.*\.html$/.test(f)).concat(fs.readdirSync(path.join(root,'release/en')).filter(f=>/^mattress-cleaning-.*\.html$/.test(f)).map(f=>'en/'+f));
 let changed=0;
 for(const file of files){
  const info=regionalPage(file);if(!info||read(file).includes('data-med-configurator'))continue;
  const en=file.startsWith('en/'),p=en?'../':'',t=(hu,english)=>en?english:hu;
  const hero=read(file).match(/<section class="subpage-hero"[\s\S]*?<\/section>/)?.[0];if(!hero)throw Error('Missing mattress hero '+file);
  const section=`<section class="mattress-calculator-section" id="matrac-kalkulator" aria-labelledby="matrac-kalkulator-title"><div class="mc-shell"><div class="mc-heading"><span class="mc-step">${info.label} · ${t('Matractisztítás','Mattress cleaning')}</span><h2 id="matrac-kalkulator-title">${t('Tervezz tisztább pihenést.','Plan a fresher place to rest.')}</h2><p>${t('Válaszd ki a matrac méretét, a tisztítandó oldalakat és a kért kezeléseket. A kiszállással együtt számolt összeállítást átviheted az időpontfoglaláshoz. Az alapár száraz atkairtást tartalmaz; a nedves folteltávolítás külön választható.','Choose your mattress size, the sides to clean and any optional treatments. Transfer your estimate, including travel, to the booking form. The base price includes dry dust-mite treatment; wet stain treatment is optional.')}</p></div><div data-mattress-calculator data-city="${info.city}" data-booking-url="${en?'booking.html':'megrendeles.html'}"><p>${t('A kalkulátor betöltéséhez JavaScript szükséges. Telefonos egyeztetés:','JavaScript is required for the calculator. Please call us:')} <a href="tel:+36702408141">06 70 240 8141</a>.</p></div></div></section>`;
  edit(file,hero,hero+section);
  // Every local booking entry starts at the mattress-specific selection.
  for(const link of new Set(read(file).match(/href="(?:index|megrendeles|booking)\.html#booking"/g)||[]))edit(file,link,'href="#matrac-kalkulator"');
  for(const attr of new Set(read(file).match(/data-next="(?:index|megrendeles|booking)\.html#booking"/g)||[]))edit(file,attr,'data-next="#matrac-kalkulator"');
  edit(file,'</head>',`<link rel="stylesheet" href="${p}ui/mattress-calculator.css?v=${css}"></head>`);
  edit(file,'</body>',`<script defer src="${p}studio/configurator.js?v=${hash(read('studio/configurator.js'))}"></script><script defer src="${p}ui/mattress-calculator.js?v=${js}"></script></body>`);
  changed++;
 }
 if(changed!==52)throw Error('Unexpected mattress calculator scope '+changed);
 console.log(JSON.stringify({mattressCalculatorPages:changed}));
}
