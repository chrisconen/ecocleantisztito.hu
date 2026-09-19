// Owner-authorized city-only pricing. Historical tariffs remain the fallback.
export function applyGyorLocal({read,edit,matchEdit,tariff}) {
 const local=tariff.gyorCity;
 if(!local)throw Error('Missing Győr tariff');
 for(const name of ['ui/booking-live.js','ui/booking-live-en.js']) {
  const english=name.endsWith('-en.js');
  for(const before of ['PRICING.karpit','PRICING.matrac','PRICING[item.category]','PRICING.travelZones'])
   edit(name,before,before.replace('PRICING','activePricing()'));
  edit(name,'PILLOW_CLEANING.price','activePillowPrice()');
  const helpers=`
const GYOR_CITY_TARIFF = ${JSON.stringify(local)};
function isGyorCity(city=State.city,zone=State.travelZone){return city==='gyor'&&(zone==='belvaros'||zone==='kulso');}
function activePricing(city=State.city,zone=State.travelZone){
 if(!isGyorCity(city,zone))return PRICING;
 const merge=group=>Object.fromEntries(Object.entries(PRICING[group]).map(([id,p])=>[id,{...p,...GYOR_CITY_TARIFF[group][id]}]));
 return {...PRICING,karpit:merge('karpit'),matrac:merge('matrac'),travelZones:{...PRICING.travelZones,belvaros:{...PRICING.travelZones.belvaros,fee:0},kulso:{...PRICING.travelZones.kulso,fee:0}}};
}
function activePillowPrice(){return isGyorCity()?GYOR_CITY_TARIFF.pillowPrice:PILLOW_CLEANING.price;}
function refreshLocalPriceLabels(){
 const pricing=activePricing();
 document.querySelectorAll('[data-item-id]').forEach(card=>{
  const fullId=card.dataset.itemId,sep=fullId.indexOf('_'),p=pricing[fullId.slice(0,sep)]?.[fullId.slice(sep+1)];if(!p)return;
  const label=card.querySelector('.item-price');if(label)label.textContent=p.price.toLocaleString('hu-HU')+' Ft';
  card.querySelectorAll('.upsell-checkbox').forEach(row=>{const input=row.querySelector('input'),out=row.querySelector('.upsell-price');if(!input||!out)return;
   const id=(input.getAttribute('onchange')||'').match(/,\\s*'([^']+)'/)?.[1],extra=UPSELLS.matrac[id];
   const value=id==='atkairtas'?p.atkaPrice:id==='agyazhato'?p.agyazhatoPrice:extra?p[extra.priceKey]:undefined;
   if(value!==undefined)out.textContent='+'+value.toLocaleString('hu-HU')+' Ft'+(extra?(extra.priceType==='perSide'?'/${english?'side':'oldal'}':'/${english?'bed':'ágy'}'):'');
  });
  const pillow=card.querySelector('.pillow-extra .upsell-text small:last-child');if(pillow)pillow.textContent='${english?'Total cushions for these items':'Összes párna az itt kiválasztott bútorokhoz'} · '+activePillowPrice().toLocaleString('hu-HU')+' Ft/${english?'item':'db'}';
 });
 document.querySelectorAll('[name="travelZone"]').forEach(r=>{const out=r.closest('label')?.querySelector('.zone-price');if(out)out.textContent=activePricing(State.city,r.value).travelZones[r.value].fee.toLocaleString('hu-HU')+' Ft';});
 const notice=document.getElementById('gyorLocalTariffNotice');if(notice)notice.textContent=isGyorCity()?'${english?'Győr city prices active · free travel within city limits.':'Győri városi árak érvényesek · városhatáron belül díjmentes kiszállás.'}':'${english?'For Győr city prices, select Győr and a city zone in the address section. Other towns and surrounding villages use the standard tariff.':'A győri városi árakhoz válaszd Győrt és a belvárosi vagy külvárosi körzetet a címnél. Más településekre és a környező falvakra az általános díjak érvényesek.'}';
}
`;
  edit(name,'function updateSummary() {',(english?helpers.replaceAll("toLocaleString('hu-HU')","toLocaleString('en-GB')"):helpers)+'\nfunction updateSummary() {\n    refreshLocalPriceLabels();');
  const marker='    const fullAddress = `${street}, ${plz} ${city}, Magyarország`;';
  const validation=`    if(isGyorCity()&&!/^gy[oő]r(?:$|[\\s,\\-])/iu.test(city.trim())){
        alert(${JSON.stringify(english?'Győr city prices apply only to addresses within Győr. Please correct the town or travel zone.':'A győri városi árak csak Győr városhatárán belüli címre érvényesek. Kérjük, javítsd a települést vagy a kiszállási körzetet.')});
        document.getElementById('cityInput').focus();return false;
    }
`;
  edit(name,marker,validation+marker);
 }
 const studio='studio/configurator.js';
 const helpers=`  const gyorCityTariff=${JSON.stringify(local)};
  const isGyorCity=s=>s.city==='gyor'&&(s.travelZone==='belvaros'||s.travelZone==='kulso');
  function itemAt(id,s){const p=byId[id],sep=id.indexOf('_');return isGyorCity(s)?{...p,...gyorCityTariff[id.slice(0,sep)][id.slice(sep+1)]}:p;}
  const travelAt=(city,zone)=>city==='gyor'&&(zone==='belvaros'||zone==='kulso')?0:zones[zone].fee;
`;
 edit(studio,'  function calculate(input){',helpers+'  function calculate(input){');
 edit(studio,'const p=byId[i.id]','const p=itemAt(i.id,s)');
 edit(studio,'expected=byId[i.id]','expected=itemAt(i.id,s)');
 edit(studio,'?zones[s.travelZone].fee:0;if(travelFee)',"?travelAt(s.city,s.travelZone):0;if(s.items.length&&s.travelZone)");
 edit(studio,'pricing.travelZones[s.travelZone]?.fee===zones[s.travelZone].fee','pricing.travelZones[s.travelZone]?.fee===travelAt(s.city,s.travelZone)');
 edit(studio,"city,travelZone:'',items:[],extras:[]},true)","city,travelZone:city==='gyor'?'belvaros':'',items:[],extras:[]},true)");
 edit(studio,'const p=byId[g.ids[0]],im=','const p=itemAt(g.ids[0],state),im=');
 edit(studio,'p=byId[id],i=state.items','p=itemAt(id,state),i=state.items');
 edit(studio,'${money(z.fee)}','${money(travelAt(city,id))}');
 edit(studio,"    function update(){",`    root.querySelector('[data-zone]').value=state.travelZone;
    function update(){
      root.querySelectorAll('[data-extra]').forEach(c=>{const e=extras[c.dataset.extra];if(e.priceKey){const min=Math.min(...catalog.filter(p=>p.sides).map(p=>itemAt(p.id,state)[e.priceKey]));c.closest('label').querySelector('small').textContent='+ '+money(min)+(english?' and up':'-tól')+' / '+e.unit;}});
`);
 edit(studio,"state.travelZone?'Kiszállással együtt · tájékoztató összeg'", "isGyorCity(state)?(english?'Győr city prices · free travel':'Győri városi árak · díjmentes kiszállás'):state.travelZone?'Kiszállással együtt · tájékoztató összeg'");
 edit(studio,'<span>Kiszállás · ${cityNames[city]} és környéke</span>',`<span>Kiszállás · \${cityNames[city]} és környéke</span>\${city==='gyor'?'<small>'+ (english?'Lower prices and free travel apply only within Győr city limits. Surrounding villages use the standard tariff.':'Az alacsonyabb árak és a díjmentes kiszállás csak Győr városhatárán belül érvényesek. A környező településekre az általános díjak vonatkoznak.')+'</small>':''}`);
 edit('studio/booking-handoff.js','api.assertTariff(PRICING, UPSELLS, DISCOUNTS, selection);','api.assertTariff(activePricing(selection.city,selection.travelZone), UPSELLS, DISCOUNTS, selection);');
 // Make regional scope visible before the user chooses furniture in the main form.
 for(const [name,en]of [['index.html',false],['en/index.html',true]]){
  const marker=read(name).match(/<div[^>]+id="itemSelection"[^>]*>/)?.[0];
  if(!marker)throw Error('Missing booking item container');
  edit(name,marker,`<p id="gyorLocalTariffNotice" role="status">${en?'Select Győr and a city zone in the address section for lower city prices and free travel.':'A győri városi árakhoz és a díjmentes kiszálláshoz válaszd Győrt és a belvárosi vagy külvárosi körzetet a címnél.'}</p>`+marker);
 }
 for(const [name,en,group]of [['karpittisztitas-gyor.html',false,'karpit'],['en/upholstery-cleaning-gyor.html',true,'karpit'],['matractisztitas-gyor.html',false,'matrac'],['en/mattress-cleaning-gyor.html',true,'matrac']]){
  const values=Object.values(local[group]).map(p=>p.price);
  const all=[...read(name).matchAll(/<div class="pricing-price">[^<]*<span>[\d ,\.]+<\/span>[^<]*<\/div>/g)];
  if(all.length!== (group==='karpit'?6:10))throw Error('Unexpected price cards '+name);
  // Replace the whole price grid in one step; equal old amounts can have different new prices.
  const start=read(name).indexOf('<div class="pricing-grid">'),end=read(name).indexOf('<div class="pricing-note-box">',start);
  if(start<0)throw Error('Missing price grid');
  const block=read(name).slice(start,end<0?read(name).indexOf('</section>',start):end);
  let index=0;
  const updated=block.replace(/(<div class="pricing-price">[^<]*<span>)[\d ,\.]+(<\/span>[^<]*<\/div>)/g,(whole,a,b)=>{
   const value=values[index++];return value===undefined?whole:a+new Intl.NumberFormat('hu-HU').format(value).replaceAll('\u00a0',' ')+b;
  }).replace(/<div class="pricing-card">\s*<h3 class="pricing-item-name">Hotel[\s\S]*?<\/div>\s*<\/div>/,`<div class="pricing-card"><h3 class="pricing-item-name">${en?'10+ mattresses':'10+ matrac'}</h3><p>${en?'Select the sizes and quantities in the calculator. The quantity discount applies to the selected items.':'Válaszd ki a méreteket és darabszámokat a kalkulátorban. A mennyiségi kedvezményt a kiválasztott tételekre számoljuk.'}</p></div>`);
  edit(name,block,updated);
  const heading=en?'Our prices in Győr':'Áraink Győrben';
  edit(name,heading,en?'Prices within Győr city limits':'Árak Győr városhatárán belül');
  const grid='<div class="pricing-grid">';
  edit(name,grid,`<p class="section-description">${en?'Free travel within Győr city limits. These prices apply to city addresses; surrounding villages use the standard tariff shown after selecting the travel zone.':'Győr városhatárán belül a kiszállás díjmentes. Az alábbi árak városi címekre érvényesek; a környező települések általános díjait a kalkulátor a körzet kiválasztása után mutatja.'}</p>`+grid);
  if(group==='matrac'){
   edit(name,en?'+6,000 HUF per treated side':'+6 000 Ft kezelt oldalanként',en?'+1,900 HUF per treated side':'+1 900 Ft kezelt oldalanként');
   edit(name,en?'+3,500 HUF per side':'+3 500 Ft oldalanként',en?'+900 HUF per side':'+900 Ft oldalanként');
   const before=en?'Treating both sides doubles this extra charge.':'Két kezelt oldalnál a felár kétszer számítandó.';
   edit(name,before,before+' '+(en?'Including dry and wet treatment: single mattress 6,800 HUF for one side / 9,700 HUF for both; double mattress 8,800 / 11,700 HUF. Travel within Győr is free.':'Száraz és nedves kezeléssel együtt: egyágyas matrac egy oldal 6 800 Ft, két oldal 9 700 Ft; franciaágy-matrac egy oldal 8 800 Ft, két oldal 11 700 Ft. Győrön belül díjmentes kiszállással.'));
  }else{
   edit(name,en?'7,500 HUF, a sofa from 18,000 HUF':'7.500 Ft-tól, egy kanapé 18.000 Ft-tól',en?'3,900 HUF, a sofa from 7,900 HUF within Győr city limits, with free travel':'3 900 Ft-tól, egy kanapé 7 900 Ft-tól');
   matchEdit(name,en?/<p><strong>Győr city centre:[\s\S]*?<\/p>/g:/<p><strong>Győr belváros:[\s\S]*?<\/p>/g,en?'<p><strong>Within Győr city limits: free travel (0 HUF).</strong> Surrounding villages within 10 km: 4,500 HUF; within 20 km: 5,500 HUF. Lower city cleaning prices apply only within Győr.</p>':'<p><strong>Győr városhatárán belül: díjmentes kiszállás (0 Ft).</strong> Környező települések 10 km-ig: 4 500 Ft; 20 km-ig: 5 500 Ft. Az alacsonyabb városi tisztítási árak csak Győrön belül érvényesek.</p>');
  }
 }
}
