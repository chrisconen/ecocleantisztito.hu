/* Mattress-only UI over the unchanged, validated ECO Studio pricing API. No network writes. */
(() => {
 'use strict';
 const en=document.documentElement.lang==='en',t=(hu,english)=>en?english:hu;
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=n=>new Intl.NumberFormat(en?'en-GB':'hu-HU').format(n)+(en?' HUF':' Ft');
 function mount(root){
  const api=window.EcoStudioConfig;if(!api)throw Error('Pricing unavailable');
  const products=api.catalog.filter(p=>p.id.startsWith('matrac_')),byId=Object.fromEntries(products.map(p=>[p.id,p]));
  const names={egyagyas:'Single mattress · 90 × 200 cm',francia:'Double mattress · 140/160/180 × 200 cm',gyerek:'Children’s mattress',kisagy:'Cot mattress'};
  const label=p=>en?names[p.id.split('_')[1]]+' · '+(p.sides===1?'one side':'both sides'):p.label;
  const zoneNames={belvaros:t('Belváros','City centre'),kulso:t('Külváros','Outskirts'),'20km':t('A város 10 km-es körzetében','Within 10 km of the city'),'40km':t('A város 20 km-es körzetében','Within 20 km of the city')};
  const city=root.dataset.city,prefix='mattress-'+city;
  let selected=products[0].id;
  let state=api.validate({version:1,sourcePage:'matractisztitas-'+city+'.html',city,travelZone:city==='gyor'?'belvaros':'',items:[],extras:[]},true);
  const probe=(id,extras=[])=>api.calculate({...state,items:[{id,count:1,upsells:[]}],extras});
  const base=id=>probe(id).lines[0].amount;
  const lineLabel=line=>{
   if(line.itemId)return state.items.find(i=>i.id===line.itemId).count+' × '+label(byId[line.itemId]);
   if(!en)return line.label;
   let text=line.label;
   for(const p of products)text=text.replace(p.label,label(p));
   for(const [id,translated]of [['matrac_nedves_tisztitas','Wet stain treatment'],['matrac_agykeret','Bed frame and headboard cleaning']])text=text.replace(api.extras[id].label,translated);
   for(const [id,zone]of Object.entries(api.zones))text=text.replace('Kiszállás · '+zone.label,'Travel · '+zoneNames[id]);
   return text.replace('Legalább 3 bútor kedvezménye · 5%','3 or more items · 5% discount');
  };
  root.innerHTML=`<div class="mc-layout"><div class="mc-controls"><span class="mc-step">01 · ${t('Méret és tisztítandó oldalak','Size and sides to clean')}</span><label class="mc-field" for="${prefix}-type">${t('Milyen matracot tisztítsunk?','Which mattress should we clean?')}<select id="${prefix}-type" data-mc-type>${products.map(p=>`<option value="${p.id}">${esc(label(p))}</option>`).join('')}</select></label><div class="mc-type-price"><span>${t('Alapár a kiválasztott típusra','Base price for the selected type')}</span><strong data-mc-unit></strong></div><div class="mc-quantity"><span>${t('Darabszám ebből a típusból','Quantity of this type')}</span><div><button type="button" data-mc-delta="-1" aria-label="${t('Darabszám csökkentése','Decrease quantity')}">−</button><output data-mc-count>0</output><button type="button" data-mc-delta="1" aria-label="${t('Darabszám növelése','Increase quantity')}">+</button></div></div><p class="mc-note">${t('Többféle matrac? Válts típust, majd adj hozzá újabb darabokat. A korábbi tételek megmaradnak az összesítőben.','Different mattresses? Select another type and add its quantity. Your previous items stay in the summary.')}</p><fieldset class="mc-extras"><legend>02 · ${t('Kiegészítő kezelések','Optional treatments')}</legend>${[['matrac_nedves_tisztitas',t('Nedves folteltávolítás','Wet stain treatment')],['matrac_agykeret',t('Ágykeret és fejtámla tisztítása','Bed frame and headboard cleaning')]].map(([id,name])=>`<label><input type="checkbox" data-mc-extra="${id}" disabled><span>${name}<small data-mc-extra-price="${id}"></small></span></label>`).join('')}<p class="mc-note">${t('A választott kiegészítést minden felvett matracra számoljuk. Nedves kezelésnél a típusnál megadott oldalszám érvényes; két oldalra kétszeres a felár.','Selected extras apply to every mattress in your list. Wet treatment uses the number of sides selected above; both sides cost twice the per-side extra.')} ${t('Nedves tisztítás után általában 6–12 óra száradás szükséges.','Wet cleaning usually needs 6–12 hours to dry.')}</p></fieldset><label class="mc-field" for="${prefix}-zone"><span class="mc-step">03 · ${t('Kiszállás','Travel')} · ${esc(api.cities[city])}</span><select id="${prefix}-zone" data-mc-zone><option value="">${t('Válassz körzetet','Choose your zone')}</option>${Object.keys(api.zones).map(id=>`<option value="${id}">${zoneNames[id]}</option>`).join('')}</select></label>${city==='gyor'?`<p class="mc-note">${t('A kedvezményes árak és a díjmentes kiszállás Győr városhatárán belül érvényesek. A környező településeknél az általános díjakkal számolunk.','Reduced prices and free travel apply within Győr city limits. Surrounding villages use the standard tariff.')}</p>`:''}</div><aside class="mc-summary" aria-label="${t('Matractisztítás összesítő','Mattress cleaning summary')}"><span class="mc-step">${t('Az összeállításod','Your selection')}</span><output class="mc-total" data-mc-total aria-live="polite" aria-atomic="true">${money(0)}</output><p class="mc-note" data-mc-status></p><ul class="mc-lines" data-mc-lines></ul><p class="mc-note">${t('Tájékoztató összeg. Az anyagot, a méretet és az állapotot a munka előtt egyeztetjük. A következő oldalon átveheted az összeállítást, megadhatod az adataidat és kiválaszthatod az időpontot.','An estimate. We confirm the fabric, size and condition before cleaning. On the next page, import your selection, enter your details and choose an appointment.')}</p><a class="mc-button" data-mc-booking aria-disabled="true" tabindex="-1">${t('Tovább az időpontválasztáshoz','Continue to appointments')} <span aria-hidden="true">→</span></a><a class="mc-phone" href="tel:+36702408141">${t('Inkább telefonon egyeztetek','Prefer to call?')}</a><button class="mc-reset" type="button" data-mc-reset>${t('Összeállítás törlése','Clear selection')}</button><p class="mc-note" role="status" data-mc-feedback></p></aside></div>`;
  const type=root.querySelector('[data-mc-type]'),zone=root.querySelector('[data-mc-zone]');
  function update(){
   if(!state.items.length)state.extras=[];
   state=api.validate(state,true);const result=api.calculate(state),current=state.items.find(i=>i.id===selected);
   root.querySelector('[data-mc-count]').textContent=String(current?.count||0);
   root.querySelector('[data-mc-delta="-1"]').disabled=!current;
   root.querySelector('[data-mc-delta="1"]').disabled=current?.count>=99;
   root.querySelector('[data-mc-unit]').textContent=money(base(selected))+t(' / db',' / item');
   for(const option of type.options)option.textContent=label(byId[option.value])+' · '+money(base(option.value));
   for(const option of zone.options)if(option.value){const quote=api.calculate({...state,travelZone:option.value,items:[{id:selected,count:1,upsells:[]}],extras:[]});option.textContent=zoneNames[option.value]+' · '+money(quote.lines.at(-1).amount);}
   zone.value=state.travelZone;
   root.querySelectorAll('[data-mc-extra]').forEach(box=>{box.disabled=!state.items.length;box.checked=state.extras.includes(box.dataset.mcExtra);const wet=box.dataset.mcExtra==='matrac_nedves_tisztitas',amount=probe(selected,[box.dataset.mcExtra]).lines[1].amount/(wet?byId[selected].sides:1);root.querySelector('[data-mc-extra-price="'+box.dataset.mcExtra+'"]').textContent=t('Kiválasztott típus: +','Selected type: +')+money(amount)+(wet?t(' / kezelt oldal',' / treated side'):t(' / ágy',' / bed'));});
   root.querySelector('[data-mc-total]').textContent=money(result.total);
   root.querySelector('[data-mc-status]').textContent=!state.items.length?t('Adj hozzá legalább egy matracot.','Add at least one mattress.'):result.isLargeOrder?t('Nagyobb összeállítás · egyedi időpontegyeztetés.','Larger order · we will arrange an appointment with you.'):state.travelZone?t('Kiszállással együtt.','Includes travel.'):t('Kiszállás nélkül. Válassz körzetet a továbblépéshez.','Excludes travel. Choose a zone to continue.');
   const list=root.querySelector('[data-mc-lines]');list.replaceChildren();
   for(const line of result.lines){const li=document.createElement('li'),name=document.createElement('span'),amount=document.createElement('strong');name.textContent=lineLabel(line);amount.textContent=money(line.amount);li.append(name,amount);if(line.itemId){const remove=document.createElement('button');remove.type='button';remove.dataset.mcRemove=line.itemId;remove.textContent=t('Törlés','Remove');remove.setAttribute('aria-label',label(byId[line.itemId])+': '+t('összes darab törlése','remove all'));li.append(remove);}list.append(li);}
   const link=root.querySelector('[data-mc-booking]'),ready=!!state.items.length&&!!state.travelZone;link.setAttribute('aria-disabled',String(!ready));link.tabIndex=ready?0:-1;if(ready)link.href=root.dataset.bookingUrl+api.encode(state);else link.removeAttribute('href');
   return result;
  }
  root.addEventListener('change',event=>{const el=event.target;if(el===type)selected=el.value;else if(el===zone)state.travelZone=el.value;else if(el.hasAttribute('data-mc-extra'))state.extras=el.checked?[...state.extras,el.dataset.mcExtra]:state.extras.filter(id=>id!==el.dataset.mcExtra);update();});
  root.addEventListener('click',event=>{const el=event.target.closest('button,a');if(!el)return;
   if(el.hasAttribute('data-mc-delta')){let item=state.items.find(i=>i.id===selected);if(!item){item={id:selected,count:0,upsells:[]};state.items.push(item);}item.count=Math.max(0,Math.min(99,item.count+Number(el.dataset.mcDelta)));state.items=state.items.filter(i=>i.count);update();}
   else if(el.hasAttribute('data-mc-remove')){state.items=state.items.filter(i=>i.id!==el.dataset.mcRemove);update();root.querySelector('[data-mc-feedback]').textContent=t('Tétel törölve.','Item removed.');type.focus({preventScroll:true});}
   else if(el.hasAttribute('data-mc-reset')){state.items=[];state.extras=[];state.travelZone=city==='gyor'?'belvaros':'';update();type.focus({preventScroll:true});}
   else if(el.matches('[data-mc-booking][aria-disabled="true"]'))event.preventDefault();
  });
  update();root.mattressCalculator={snapshot:()=>api.validate(state,true),calculate:()=>api.calculate(state)};
 }
 const start=()=>document.querySelectorAll('[data-mattress-calculator]').forEach(root=>{try{mount(root);}catch{root.innerHTML='<p>'+t('A kalkulátor most nem tölthető be. Egyeztess velünk telefonon:','The calculator is unavailable. Please call us:')+' <a href="tel:+36702408141">06 70 240 8141</a>.</p>';}});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
