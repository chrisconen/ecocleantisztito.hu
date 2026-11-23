/* Explicit review and import only. Does not send a booking or select an appointment. */
(function(global){
  'use strict';
  function cleanup(){try{history.replaceState(history.state,'',location.pathname+location.search+'#booking');}catch{}}
  function start(){
    const en=document.documentElement.lang.toLowerCase().startsWith('en');
    const t=(hu,english)=>en?english:hu;
    const money=value=>en?value.toLocaleString('en-GB')+' HUF':api.money(value);
    if(!location.hash.startsWith('#booking?eco-config=')||document.querySelector('.studio-handoff'))return;
    const host=document.getElementById('booking'),api=global.EcoStudioConfig;if(!host)return;
    const panel=document.createElement('section');panel.className='studio-handoff med-config';panel.setAttribute('aria-labelledby','studio-handoff-title');
    const title=document.createElement('h2');title.id='studio-handoff-title';title.tabIndex=-1;title.textContent=t('A kiválasztott összeállításod','Your selected items');
    const text=document.createElement('p'),list=document.createElement('ul'),status=document.createElement('p');status.setAttribute('role','status');
    const actions=document.createElement('div');actions.className='med-config-actions';panel.append(title,text,list,actions,status);host.prepend(panel);
    let selection;
    try{selection=api.decode(location.hash);}catch{title.textContent=t('Az összeállítást nem tudtuk átvenni','Your selection could not be imported');text.textContent=t('A hivatkozás hiányos vagy ehhez a városhoz nem tartozik ez a megrendelő. Ellenőrizd a kiinduló oldalt, vagy egyeztess telefonon: 06 70 240 8141.','The link is incomplete or this booking page does not serve the selected town. Check the original page or call: 06 70 240 8141.');cleanup();title.focus();return;}
    const result=api.calculate(selection);
    text.textContent=api.cities[selection.city]+t(' és környéke · ',' and surrounding areas · ')+money(result.total)+(selection.travelZone?t(' · kiszállással együtt',' · including travel'):t(' · kiszállás nélkül',' · excluding travel'))+t('. Az átvétel után ellenőrizheted a tételeket. Időpontot később választasz.','. Review the items after importing them. You will choose an appointment later.');
    const labels=en?[
      ...api.catalog.map(item=>{const split=item.id.indexOf('_');return [item.label,PRICING[item.id.slice(0,split)][item.id.slice(split+1)].name];}),
      ...Object.entries(api.extras).map(([id,extra])=>{const split=id.indexOf('_');return [extra.label,UPSELLS[id.slice(0,split)][id.slice(split+1)].name];}),
      ...Object.entries(api.zones).map(([id,zone])=>[zone.label,PRICING.travelZones[id].label]),
      ['Atkairtás','Dust mite treatment'],['Ágyazható felület tisztítása','Sofa bed surface cleaning'],['Kiszállás','Travel'],['Kárpit + matrac kedvezmény','Upholstery + mattress discount'],['Legalább 3 bútor kedvezménye','3+ items discount'],[' db',' items']
    ].sort((a,b)=>b[0].length-a[0].length):[];
    result.lines.forEach(line=>{const li=document.createElement('li');li.textContent=labels.reduce((label,[hu,english])=>label.split(hu).join(english),line.label)+': '+money(line.amount);list.append(li);});
    const accept=document.createElement('button');accept.type='button';accept.className='med-config-button';accept.dataset.studioImport='';
    const discard=document.createElement('button');discard.type='button';discard.className='med-config-button med-config-button-secondary';discard.textContent=t('Maradok a jelenlegi összeállításnál','Keep my current selection');
    const hasBasket=()=>typeof State!=='undefined'&&Object.values(State.selectedItems).some(i=>i.count>0);
    accept.textContent=hasBasket()?t('Jelenlegi összeállítás cseréje ezekre a tételekre','Replace my current selection with these items'):t('Átveszem a tételeket a megrendelőbe','Import these items into the booking');
    const warning=document.createElement('p');warning.className='med-config-note';warning.textContent=t('Az átvétel lecseréli a megrendelőben esetleg már kiválasztott bútorokat, extrákat és időpontot. A kapcsolati adataid megmaradnak.','Importing replaces any furniture, extras and appointment already selected in the booking. Your contact details are kept.');panel.insertBefore(warning,actions);
    actions.append(accept,discard);let imported=false;
    discard.addEventListener('click',()=>{cleanup();panel.remove();host.scrollIntoView({block:'start'});});
    accept.addEventListener('click',()=>{
      if(imported)return;
      try{
        if(typeof State==='undefined'||typeof PRICING==='undefined'||typeof handleServiceType!=='function'||typeof incrementItem!=='function'||typeof toggleItemUpsell!=='function'||typeof toggleGlobalUpsell!=='function'||typeof handleCityChange!=='function'||typeof updateSummary!=='function'||typeof BookingCalendar==='undefined'||typeof BookingCalendar.setCity!=='function')throw Error('A megrendelő nem áll készen.');
        const citySelect=document.getElementById('citySelect');if(![...citySelect.options].some(o=>o.value===selection.city))throw Error('Ez a régió nem választható.');
        const allK=selection.items.every(i=>i.id.startsWith('karpit_')),allM=selection.items.every(i=>i.id.startsWith('matrac_')),service=allK?'Kárpit':allM?'Matrac':'Mindkettő';
        const serviceButton=[...document.querySelectorAll('#serviceType [data-value]')].find(b=>b.dataset.value===service);if(!serviceButton)throw Error('A szolgáltatás nem tölthető be.');
        // Validate every tariff before mutating the existing cart.
        api.assertTariff(activePricing(selection.city,selection.travelZone), UPSELLS, DISCOUNTS, selection);
        imported=true;accept.disabled=true;
        State.city=null;citySelect.value='';State.travelZone=null;BookingCalendar.setCity(null);
        handleServiceType(serviceButton);
        document.querySelectorAll('[name="travelZone"]').forEach(r=>r.checked=false);
        selection.items.forEach(item=>{const category=item.id.split('_')[0];for(let n=0;n<item.count;n++)incrementItem(item.id,category);item.upsells.forEach(extra=>{toggleItemUpsell(item.id,extra);const wrap=document.getElementById('upsell-'+item.id);const box=[...wrap.querySelectorAll('input')].find(c=>(c.getAttribute('onchange')||'').includes("'"+extra+"'"));if(box)box.checked=true;});});
        selection.extras.forEach(fullId=>{const sep=fullId.indexOf('_'),category=fullId.slice(0,sep),id=fullId.slice(sep+1);if(category==='matrac'){selection.items.filter(i=>i.id.startsWith('matrac_')).forEach(item=>{toggleItemUpsell(item.id,id);const wrap=document.getElementById('upsell-'+item.id);const box=[...wrap.querySelectorAll('input')].find(c=>(c.getAttribute('onchange')||'').includes("'"+id+"'"));if(box)box.checked=true;});}else{toggleGlobalUpsell(fullId,category,id);const box=[...document.querySelectorAll('#upsellOptions input')].find(c=>(c.getAttribute('onchange')||'').includes("'"+fullId+"'"));if(box)box.checked=true;}});
        if(selection.travelZone){const radio=[...document.querySelectorAll('[name="travelZone"]')].find(r=>r.value===selection.travelZone);if(radio)radio.checked=true;State.travelZone=selection.travelZone;}
        updateSummary();citySelect.value=selection.city;handleCityChange(citySelect);updateSummary();
        cleanup();actions.remove();warning.remove();
        status.textContent=State.isLargeOrder?t('A tételeket átvettük. Ez nagyobb összeállítás: az egyedi ajánlatkérőben egyeztetünk időpontot.','Your items have been imported. This is a large order: we will arrange an appointment through the tailored quote request.'):t('A tételeket átvettük. Ellenőrizd az összeállítást, majd válassz időpontot és add meg az adataidat.','Your items have been imported. Review your selection, then choose an appointment and enter your details.');
        status.tabIndex=-1;status.focus();
      }catch(error){status.textContent=en?'Import failed. Please review the booking items and prices, or call 06 70 240 8141.':error.message||'Az átvétel nem sikerült. Kérjük, ellenőrizd a megrendelő tételeit.';if(!imported)accept.disabled=false;}
    });
    title.focus();panel.scrollIntoView({block:'start'});
  }
  global.EcoStudioBookingHandoff={start};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
