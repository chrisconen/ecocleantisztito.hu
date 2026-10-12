// Győr uses the shared tariff, including travel and optional treatments.
export function applyGyorLocal({read,edit,matchEdit,tariff}) {
 const local=tariff.pricing;
 for(const name of ['ui/booking-live.js','ui/booking-live-en.js']) {
  const english=name.endsWith('-en.js');
  for(const before of ['PRICING.karpit','PRICING.matrac','PRICING[item.category]','PRICING.travelZones'])
   edit(name,before,before.replace('PRICING','activePricing()'));
  edit(name,'PILLOW_CLEANING.price','activePillowPrice()');
  const helpers=`
function activePricing(){return PRICING;}
function activePillowPrice(){return PILLOW_CLEANING.price;}
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
}
`;
  edit(name,'function updateSummary() {',(english?helpers.replaceAll("toLocaleString('hu-HU')","toLocaleString('en-GB')"):helpers)+'\nfunction updateSummary() {\n    refreshLocalPriceLabels();');
 }
 const studio='studio/configurator.js';
 const helpers=`  function itemAt(id){return byId[id];}
  const travelAt=(city,zone)=>zones[zone].fee;
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
 edit('studio/booking-handoff.js','api.assertTariff(PRICING, UPSELLS, DISCOUNTS, selection);','api.assertTariff(activePricing(selection.city,selection.travelZone), UPSELLS, DISCOUNTS, selection);');
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
  if(block!==updated)edit(name,block,updated);
 }
}
