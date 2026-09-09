/* Explicit review and import only. Does not send a booking or select an appointment. */
(function(global){
  'use strict';
  function cleanup(){try{history.replaceState(history.state,'',location.pathname+location.search+'#booking');}catch{}}
  function start(){
    if(!location.hash.startsWith('#booking?eco-config=')||document.querySelector('.studio-handoff'))return;
    const host=document.getElementById('booking'),api=global.EcoStudioConfig;if(!host)return;
    const panel=document.createElement('section');panel.className='studio-handoff med-config';panel.setAttribute('aria-labelledby','studio-handoff-title');
    const title=document.createElement('h2');title.id='studio-handoff-title';title.tabIndex=-1;title.textContent='A kiválasztott összeállításod';
    const text=document.createElement('p'),list=document.createElement('ul'),status=document.createElement('p');status.setAttribute('role','status');
    const actions=document.createElement('div');actions.className='med-config-actions';panel.append(title,text,list,actions,status);host.prepend(panel);
    let selection;
    try{selection=api.decode(location.hash);}catch{title.textContent='Az összeállítást nem tudtuk átvenni';text.textContent='A hivatkozás hiányos vagy ehhez a városhoz nem tartozik ez a megrendelő. Ellenőrizd a kiinduló oldalt, vagy egyeztess telefonon: 06 70 240 8141.';cleanup();title.focus();return;}
    const result=api.calculate(selection);
    text.textContent=api.cities[selection.city]+' és környéke · '+api.money(result.total)+(selection.travelZone?' · kiszállással együtt':' · kiszállás nélkül')+'. Az átvétel után ellenőrizheted a tételeket. Időpontot később választasz.';
    result.lines.forEach(line=>{const li=document.createElement('li');li.textContent=line.label+': '+api.money(line.amount);list.append(li);});
    const accept=document.createElement('button');accept.type='button';accept.className='med-config-button';accept.dataset.studioImport='';
    const discard=document.createElement('button');discard.type='button';discard.className='med-config-button med-config-button-secondary';discard.textContent='Maradok a jelenlegi összeállításnál';
    const hasBasket=()=>typeof State!=='undefined'&&Object.values(State.selectedItems).some(i=>i.count>0);
    accept.textContent=hasBasket()?'Jelenlegi összeállítás cseréje ezekre a tételekre':'Átveszem a tételeket a megrendelőbe';
    const warning=document.createElement('p');warning.className='med-config-note';warning.textContent='Az átvétel lecseréli a megrendelőben esetleg már kiválasztott bútorokat, extrákat és időpontot. A kapcsolati adataid megmaradnak.';panel.insertBefore(warning,actions);
    actions.append(accept,discard);let imported=false;
    discard.addEventListener('click',()=>{cleanup();panel.remove();host.scrollIntoView({block:'start'});});
    accept.addEventListener('click',()=>{
      if(imported)return;
      try{
        if(typeof State==='undefined'||typeof PRICING==='undefined'||typeof handleServiceType!=='function'||typeof incrementItem!=='function'||typeof toggleItemUpsell!=='function'||typeof toggleGlobalUpsell!=='function'||typeof handleCityChange!=='function'||typeof updateSummary!=='function'||typeof BookingCalendar==='undefined'||typeof BookingCalendar.setCity!=='function')throw Error('A megrendelő nem áll készen.');
        const citySelect=document.getElementById('citySelect');if(![...citySelect.options].some(o=>o.value===selection.city))throw Error('Ez a régió nem választható.');
        const allK=selection.items.every(i=>i.id.startsWith('karpit_')),allM=selection.items.every(i=>i.id.startsWith('matrac_')),service=allK?'Kárpit':allM?'Matrac':'Mindkettő';
        const serviceButton=[...document.querySelectorAll('#serviceType [data-value]')].find(b=>b.dataset.value===service);if(!serviceButton)throw Error('A szolgáltatás nem tölthető be.');
        // Check tariff agreement before mutating any existing cart.
        for(const item of selection.items){const sep=item.id.indexOf('_'),category=item.id.slice(0,sep),id=item.id.slice(sep+1),p=PRICING[category]?.[id],expected=api.catalog.find(x=>x.id===item.id);if(!p||p.price!==expected.price||p.duration!==expected.duration||(expected.sides&&p.sides!==expected.sides)||item.upsells.some(x=>(x==='atkairtas'?p.atkaPrice:p.agyazhatoPrice)!==5000))throw Error('Az online díjak időközben változtak. Kérjük, állítsd össze újra a tételeket a megrendelőben.');}
        if(selection.travelZone&&PRICING.travelZones[selection.travelZone]?.fee!==api.zones[selection.travelZone].fee)throw Error('A kiszállási díj időközben változott.');
        if(typeof UPSELLS==='undefined'||typeof DISCOUNTS==='undefined'||DISCOUNTS.combo.percent!==10||DISCOUNTS.quantity3.percent!==5)throw Error('A kedvezmények időközben változtak.');
        for(const fullId of selection.extras){const sep=fullId.indexOf('_'),actual=UPSELLS[fullId.slice(0,sep)]?.[fullId.slice(sep+1)],expected=api.extras[fullId],basis=expected.basis==='seats'?'perSeat':expected.basis==='sides'?'perSide':'perItem';if(!actual||actual.price!==expected.price||actual.duration!==expected.duration||actual.priceType!==basis)throw Error('A kiegészítések díjai időközben változtak.');}
        imported=true;accept.disabled=true;
        State.city=null;citySelect.value='';State.travelZone=null;BookingCalendar.setCity(null);
        handleServiceType(serviceButton);
        document.querySelectorAll('[name="travelZone"]').forEach(r=>r.checked=false);
        selection.items.forEach(item=>{const category=item.id.split('_')[0];for(let n=0;n<item.count;n++)incrementItem(item.id,category);item.upsells.forEach(extra=>{toggleItemUpsell(item.id,extra,5000);const wrap=document.getElementById('upsell-'+item.id);const box=[...wrap.querySelectorAll('input')].find(c=>(c.getAttribute('onchange')||'').includes("'"+extra+"'"));if(box)box.checked=true;});});
        selection.extras.forEach(fullId=>{const sep=fullId.indexOf('_'),category=fullId.slice(0,sep),id=fullId.slice(sep+1);toggleGlobalUpsell(fullId,category,id);const box=[...document.querySelectorAll('#upsellOptions input')].find(c=>(c.getAttribute('onchange')||'').includes("'"+fullId+"'"));if(box)box.checked=true;});
        if(selection.travelZone){const radio=[...document.querySelectorAll('[name="travelZone"]')].find(r=>r.value===selection.travelZone);if(radio)radio.checked=true;State.travelZone=selection.travelZone;}
        updateSummary();citySelect.value=selection.city;handleCityChange(citySelect);updateSummary();
        cleanup();actions.remove();warning.remove();
        status.textContent=State.isLargeOrder?'A tételeket átvettük. Ez nagyobb összeállítás: az egyedi ajánlatkérőben egyeztetünk időpontot.':'A tételeket átvettük. Ellenőrizd az összeállítást, majd válassz időpontot és add meg az adataidat.';
        status.tabIndex=-1;status.focus();
      }catch(error){status.textContent=error.message||'Az átvétel nem sikerült. Kérjük, ellenőrizd a megrendelő tételeit.';if(!imported)accept.disabled=false;}
    });
    title.focus();panel.scrollIntoView({block:'start'});
  }
  global.EcoStudioBookingHandoff={start};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
