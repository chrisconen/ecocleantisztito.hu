// Produce exact, reviewable replacements from the pinned release and tariff.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {applyGyorLocal} from './gyor-local.mjs';
import {applyLocalNavigation} from './local-navigation.mjs';
const root=path.resolve(import.meta.dirname,'../..'),here=import.meta.dirname;
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const oldOverlay=fs.existsSync(path.join(here,'overlay.json'))?JSON.parse(fs.readFileSync(path.join(here,'overlay.json'))):null;
const originals={},current={},changes={};
function read(name){
 if(!(name in current)){
  let data=fs.readFileSync(path.join(root,'release',name));
  if(oldOverlay?.files[name])for(const e of [...oldOverlay.files[name].edits].reverse()){
   const a=Buffer.from(e.after),b=Buffer.from(e.before);
   if(!data.subarray(e.offset,e.offset+a.length).equals(a))throw Error('Unrecognized output '+name);
   data=Buffer.concat([data.subarray(0,e.offset),b,data.subarray(e.offset+a.length)]);
  }
  originals[name]=current[name]=data.toString('utf8');
 }
 return current[name];
}
function edit(name,before,after){
 const text=read(name),count=text.split(before).length-1;
 if(!count||before===after)throw Error('Invalid edit '+name+': '+before.slice(0,80));
 (changes[name]??=[]).push({before,after,count});current[name]=text.split(before).join(after);
}
function matchEdit(name,pattern,replacement){
 const matches=[...read(name).matchAll(pattern)];
 if(!matches.length)throw Error('Missing pattern '+name+': '+pattern);
 for(const before of new Set(matches.map(m=>m[0])))edit(name,before,typeof replacement==='function'?replacement(before):replacement);
}
const constValue=(src,name)=>vm.runInNewContext('('+src.match(new RegExp('const '+name+' = (\\{[\\s\\S]*?\\n\\});'))[1]+')');
let tariff;
if(fs.existsSync(path.join(here,'tariff.json')))tariff=JSON.parse(fs.readFileSync(path.join(here,'tariff.json')));
else{
 const src=read('ui/booking-live.js');
 tariff={date:'2026-09-19',pricing:constValue(src,'PRICING'),upsells:constValue(src,'UPSELLS'),discounts:constValue(src,'DISCOUNTS')};
 tariff.pricing.karpit.szofa.atkaPrice=4000;tariff.pricing.karpit.l_kanape.atkaPrice=4000;
 tariff.pricing.matrac.francia_a.wetPrice=6000;tariff.pricing.matrac.francia_ab.wetPrice=6000;
 tariff.upsells.matrac.nedves_tisztitas.note='Száradási idő: általában 6–12 óra; csak teljes száradás után használd.';
 fs.writeFileSync(path.join(here,'tariff.json'),JSON.stringify(tariff,null,2)+'\n');
}
for(const name of ['ui/booking-live.js','ui/booking-live-en.js']){
 for(const group of ['karpit','matrac'])for(const [id,p]of Object.entries(tariff.pricing[group])){
  const line=read(name).match(new RegExp('"'+id+'": \\{[^\\n]+'))[0];let updated=line;
  for(const [key,value]of Object.entries(p))if(typeof value==='number')updated=updated.replace(new RegExp('\\b'+key+': \\d+'),key+': '+value);
  if(updated!==line)edit(name,line,updated);
 }
 const note=read(name).match(/note: "[^"]*(?:24)[^"]*"/)[0];
 edit(name,note,'note: '+JSON.stringify(name.endsWith('-en.js')?'Drying usually takes 6–12 hours; use only when fully dry.':tariff.upsells.matrac.nedves_tisztitas.note));
}

const studio='studio/configurator.js',ctx={};vm.runInNewContext(read(studio),ctx);
edit(studio,"  'use strict';","  'use strict';\n  const english=typeof document!=='undefined'&&document.documentElement.lang==='en';");
const catalog=JSON.parse(JSON.stringify(ctx.EcoStudioConfig.catalog));
for(const item of catalog){const sep=item.id.indexOf('_'),p=tariff.pricing[item.id.slice(0,sep)][item.id.slice(sep+1)];for(const [key,value]of Object.entries(p))if(typeof value==='number')item[key]=value;}
edit(studio,read(studio).match(/  const catalog = \[[\s\S]*?\n  \];/)[0],'  const catalog = '+JSON.stringify(catalog,null,2)+';');
const extras=JSON.parse(JSON.stringify(ctx.EcoStudioConfig.extras));
for(const [fullId,e]of Object.entries(extras)){
 const sep=fullId.indexOf('_'),group=fullId.slice(0,sep),key=fullId.slice(sep+1),p=tariff.upsells[group][key];
 e.duration=p.duration;
 if(p.priceKey){e.priceKey=p.priceKey;e.price=Math.min(...Object.values(tariff.pricing[group]).map(i=>i[p.priceKey]));}
 else e.price=p.price;
}
edit(studio,read(studio).match(/  const extras = \{[\s\S]*?\n  \};/)[0],'  const extras = '+JSON.stringify(extras,null,2)+';');
edit(studio,'5000*i.count',"p[x==='atkairtas'?'atkaPrice':'agyazhatoPrice']*i.count");
edit(studio,'s.extras.forEach(x=>{const e=extras[x],n=counts[e.basis];add(e.label,e.price*n);duration+=e.duration*(e.basis===\'seats\'?Math.ceil(n/2):n);});',
 `s.extras.forEach(x=>{const e=extras[x];if(e.priceKey){s.items.filter(i=>i.id.startsWith('matrac_')).forEach(i=>{const p=byId[i.id],n=i.count*(e.basis==='sides'?p.sides:1);add(e.label+' · '+p.label,p[e.priceKey]*n);duration+=e.duration*n;});}else{const n=counts[e.basis];add(e.label,e.price*n);duration+=e.duration*(e.basis==='seats'?Math.ceil(n/2):n);}});`);
edit(studio,'Atkairtás<small>+ ${money(5000)} / db','Atkairtás<small>+ ${money(p.atkaPrice)} / db');
edit(studio,'Ágyazható felület tisztítása<small>+ ${money(5000)} / db','Ágyazható felület tisztítása<small>+ ${money(p.agyazhatoPrice)} / db');
edit(studio,'${money(e.price)} / ${e.unit}','${money(e.price)}${e.priceKey?(english?\' and up\':\'-tól\'):\'\'} / ${e.unit}');
edit(studio,'c.checked=!!i?.upsells.includes(c.dataset.itemExtra);',"c.checked=!!i?.upsells.includes(c.dataset.itemExtra);c.closest('label').querySelector('small').textContent='+ '+money(p[c.dataset.itemExtra==='atkairtas'?'atkaPrice':'agyazhatoPrice'])+' / db';");
edit(studio,'Nedves matractisztításnál a száradás körülbelül 24 óra.',"${english?'Wet cleaning usually needs 6–12 hours to dry. Use furniture only when fully dry. Mattress extras depend on the type and treated sides; the summary shows the exact amount.':'Nedves tisztítás után a száradás általában 6–12 óra. Csak teljes száradás után használd a bútort. A matrac kiegészítőinek pontos díja a típustól és a kezelt oldalak számától függ; az összesítőben látod.'}");
const agreement=`  function assertTariff(pricing,upsells,discounts,input){
    const s=validate(input),message='Az online díjak időközben változtak. Kérjük, állítsd össze újra a tételeket a megrendelőben.';
    for(const i of s.items){const sep=i.id.indexOf('_'),p=pricing[i.id.slice(0,sep)]?.[i.id.slice(sep+1)],expected=byId[i.id];
      assert(p&&['price','duration','sides'].every(k=>expected[k]===undefined||p[k]===expected[k]),message);
      for(const x of i.upsells){const k=x==='atkairtas'?'atkaPrice':'agyazhatoPrice';assert(p[k]===expected[k],message);}
      for(const x of s.extras){const e=extras[x];if(e.priceKey&&i.id.startsWith('matrac_'))assert(p[e.priceKey]===expected[e.priceKey],message);}
    }
    if(s.travelZone)assert(pricing.travelZones[s.travelZone]?.fee===zones[s.travelZone].fee,message);
    assert(discounts.combo.percent===10&&discounts.quantity3.percent===5,message);
    for(const x of s.extras){const sep=x.indexOf('_'),a=upsells[x.slice(0,sep)]?.[x.slice(sep+1)],e=extras[x];
      assert(a&&a.duration===e.duration&&a.priceType===(e.basis==='seats'?'perSeat':e.basis==='sides'?'perSide':'perItem')&&(e.priceKey?a.priceKey===e.priceKey:a.price===e.price),message);
    }
    return true;
  }
`;
edit(studio,'  function encode(input){',agreement+'  function encode(input){');
edit(studio,'excluded,validate,calculate,encode','excluded,validate,calculate,assertTariff,encode');

const handoff='studio/booking-handoff.js';
matchEdit(handoff,/        \/\/ Check tariff agreement before mutating any existing cart\.[\s\S]*?(?=        imported=true;)/g,
 "        // Validate every tariff before mutating the existing cart.\n        api.assertTariff(PRICING, UPSELLS, DISCOUNTS, selection);\n");
edit(handoff,'toggleItemUpsell(item.id,extra,5000);','toggleItemUpsell(item.id,extra);');
const oldTransfer=read(handoff).match(/        selection.extras.forEach\(fullId=>\{[^\n]+/)[0];
edit(handoff,oldTransfer,`        selection.extras.forEach(fullId=>{const sep=fullId.indexOf('_'),category=fullId.slice(0,sep),id=fullId.slice(sep+1);if(category==='matrac'){selection.items.filter(i=>i.id.startsWith('matrac_')).forEach(item=>{toggleItemUpsell(item.id,id);const wrap=document.getElementById('upsell-'+item.id);const box=[...wrap.querySelectorAll('input')].find(c=>(c.getAttribute('onchange')||'').includes("'"+id+"'"));if(box)box.checked=true;});}else{toggleGlobalUpsell(fullId,category,id);const box=[...document.querySelectorAll('#upsellOptions input')].find(c=>(c.getAttribute('onchange')||'').includes("'"+fullId+"'"));if(box)box.checked=true;}});`);

const hu='karpittisztitas-gyor.html',en='en/upholstery-cleaning-gyor.html';
const dryHu='Nedves tisztítás után a száradás általában 6–12 óra. Az anyag, a töltet, a hőmérséklet, a páratartalom és a szellőzés befolyásolja az időt. Csak teljes száradás után használd és takard le a bútort.';
const dryEn='After wet cleaning, drying usually takes 6–12 hours. The fabric, filling, temperature, humidity and ventilation affect the time needed. Use or cover the furniture only when it is fully dry.';
matchEdit(hu,/Az ipari extrakciós technológiánknak köszönhetően a száradási idő mindössze[^"<]+/g,dryHu);
matchEdit(hu,/Az ipari elszívó technológiánknak köszönhetően a száradási idő minimális\.[^<]+/g,dryHu);
edit(hu,'azonnali száradási idővel','általában 6–12 órás száradási idővel');
matchEdit(hu,/Abszolút! Ez a technológiánk alapköve\.[^<]+/g,'A tisztíthatóságot a szövet és a gyártói útmutató alapján ellenőrizzük. '+dryHu);
matchEdit(en,/Thanks to our industrial hot water extraction technology, drying takes just[^"<]+/g,dryEn);
matchEdit(en,/Our industrial extraction technology keeps drying time to a minimum\.[^<]+/g,dryEn);
edit(en,'with instant drying time','with a usual drying time of 6–12 hours');
matchEdit(en,/Absolutely! This is the cornerstone of our technology\.[^<]+/g,'We assess suitability using the fabric and manufacturer’s care instructions. '+dryEn);

const bookingHu='Állítsd össze a bútorokat az online kalkulátorban, majd a megrendelőben válassz elérhető időpontot. Telefonon is segítünk: 06 70 240 8141. A kalkuláció önmagában még nem foglalás.';
const bookingEn='Choose your furniture in the online calculator, then select an available appointment in the booking form. You can also call us on 06 70 240 8141. A price calculation alone is not a booking.';
matchEdit(hu,/Nem kell egész nap várnod a "szemlét"\.[^<]+/g,bookingHu);
matchEdit(en,/No need to wait all day for the "survey"\.[^<]+/g,bookingEn);
matchEdit(hu,/<p>Jelenleg telefonon a <strong>06 70 240 8141<\/strong>[\s\S]*?<\/p>/g,'<p>'+bookingHu+'</p>');
matchEdit(en,/<p>For now, you can reach us by phone on <strong>06 70 240 8141<\/strong>[\s\S]*?<\/p>/g,'<p>'+bookingEn+'</p>');
const feeHu='Ha csak a helyszínen derül ki, hogy az ANDANTE vagy vízre érzékeny bútor az alkalmazott eljárással nem tisztítható, a tisztítási díj 50%-a, legfeljebb 30 000 Ft kapacitás-foglalási díj számítható fel.';
const feeEn='If we discover only on arrival that ANDANTE furniture or a water-sensitive fabric cannot be cleaned with the selected method, a capacity reservation fee of 50% of the cleaning price, capped at 30,000 HUF, may apply.';
matchEdit(hu,/<p>Kárpittisztítással kapcsolatban árajánlatot és információt kizárólag telefonos[\s\S]*?<\/p>/g,
 '<p>'+bookingHu+' Az online összeg a megadott tételek alapján számolt tájékoztató ár; a végleges árat az anyag, méret és állapot alapján, a munka előtt egyeztetjük. Telefonon egyeztetett megrendelést SMS-ben is leadhatsz a megbeszélt időponttal, neveddel és pontos címeddel.</p><p>A 48 órán belül lemondott megrendelésnél a kiszállás teljes díja és a megbeszélt tisztítási díj 50%-a kerül felszámításra. '+feeHu+' Például 40 000 Ft tisztítási díjnál ez 20 000 Ft; 80 000 Ft-nál a felső határ miatt 30 000 Ft.</p>');
matchEdit(en,/<p>For upholstery cleaning, we can only provide quotes[\s\S]*?<\/p>/g,
 '<p>'+bookingEn+' The online amount is an estimate based on your selection; we agree the final price before work begins, considering the material, size and condition. Following a phone discussion, you can also send your order by SMS with the agreed time, your name and address.</p><p>For cancellations within 48 hours, the full call-out fee and 50% of the agreed cleaning price are charged. '+feeEn+' For example, a cleaning price of 40,000 HUF gives a fee of 20,000 HUF; for 80,000 HUF, the cap limits it to 30,000 HUF.</p>');
// The material-specific fee has one basis and one cap in every affected notice.
matchEdit(hu,/Amennyiben a helyszínen derül ki, hogy a bútor anyaga az alkalmazott technológiával nem tisztítható,[^<]+/g,feeHu);
matchEdit(en,/If it only turns out on site that the furniture material cannot be cleaned with the technology used,[^<]+/g,feeEn);

for(const [name,isEn]of [['index.html',false],['en/index.html',true]]){
 if(!isEn){
  edit(name,'a helyszíni kiszállás díjának <strong>50%-a (legfeljebb 30.000 Ft)</strong>','a tisztítási díj <strong>50%-a (legfeljebb 30 000 Ft)</strong>');
  matchEdit(name,/<li>Ha a helyszínen derül ki, hogy a bútor anyaga az alkalmazott technológiával nem tisztítható,[\s\S]*?<\/li>/g,'<li>'+feeHu+'</li>');
  edit(name,'Gyors száradás, azonnali használat','Nedves tisztítás után általában 6–12 óra száradás');
  edit(name,'A bútor 4-6 óra alatt szárad','A bútor általában 6–12 óra alatt szárad; csak teljes száradás után használd');
 }else{
  edit(name,'50% of the call-out fee (up to 30,000 HUF)','50% of the cleaning price (up to 30,000 HUF)');
  matchEdit(name,/<li>If we discover on arrival that the furniture's fabric cannot be cleaned using our technology,[\s\S]*?<\/li>/g,'<li>'+feeEn+'</li>');
  edit(name,'Fast drying, ready for immediate use','Wet cleaning: usually 6–12 hours to dry');
  const s=read(name).match(/[^<>]*4-6 hours[^<>]*/g);if(s)for(const v of s)edit(name,v,v.replace('4-6 hours','6–12 hours').replace('dries in','usually dries in'));
 }
}
for(const [name,isEn]of [['matractisztitas-gyor.html',false],['en/mattress-cleaning-gyor.html',true]]){
 if(!isEn){
  matchEdit(name,/Speciális elszívó technológiánknak köszönhetően a száradási idő minimális\.[^"<]+/g,'Száraz kezelés után a matrac használható. '+dryHu);
  matchEdit(name,/<p data-legacy-style="1"><strong>Higiéniai mélytisztítás[\s\S]*?<\/p>/g,'<p data-legacy-style="1"><strong>Nedves folteltávolítás:</strong> Külön választható kezelés. Egyágyas és franciaágy-matracnál +6 000 Ft kezelt oldalanként; gyerek- és kiságymatracnál +3 500 Ft oldalanként. Két kezelt oldalnál a felár kétszer számítandó. '+dryHu+'</p>');
 }else{
  matchEdit(name,/Our specialist extraction technology keeps drying time to a minimum\.[^"<]+/g,'The mattress can be used after dry treatment. '+dryEn);
  matchEdit(name,/<p data-legacy-style="1"><strong>Hygienic deep cleaning[\s\S]*?<\/p>/g,'<p data-legacy-style="1"><strong>Wet stain treatment:</strong> An optional service. Single and double mattresses: +6,000 HUF per treated side; children’s and cot mattresses: +3,500 HUF per side. Treating both sides doubles this extra charge. '+dryEn+'</p>');
 }
}
applyGyorLocal({read,edit,matchEdit,tariff});
applyLocalNavigation({read,edit,root});
// Version every changed shared script wherever it is referenced.
const scripts=Object.keys(changes).filter(n=>/\.(js|css)$/.test(n));
for(const name of fs.readdirSync(path.join(root,'release')).filter(n=>n.endsWith('.html')).concat(fs.readdirSync(path.join(root,'release/en')).filter(n=>n.endsWith('.html')).map(n=>'en/'+n))){
 for(const asset of scripts){
  const pattern=new RegExp(asset.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\?v=[a-zA-Z0-9_-]+','g');
  for(const before of new Set(read(name).match(pattern)||[])){
   const after=asset+'?v='+hash(current[asset]).slice(0,12);if(before!==after)edit(name,before,after);
  }
 }
}
fs.writeFileSync(path.join(here,'replacements.json'),JSON.stringify(changes,null,2)+'\n');
console.log(JSON.stringify({files:Object.keys(changes).length,scriptFiles:scripts,ownerDecisions:{sofaMite:4000,doubleWetPerSide:6000,drying:'6–12 hours',materialFee:'50% cleaning price capped at 30000'}}));
