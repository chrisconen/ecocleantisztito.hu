/* ECO Clean Studio: main-booking tariff, local calculations, no network writes. */
(function (global) {
  'use strict';
  const cityNames = {gyor:'Győr',mosonmagyarovar:'Mosonmagyaróvár',csorna:'Csorna',kapuvar:'Kapuvár',sopron:'Sopron',fertod:'Fertőd',szombathely:'Szombathely',koszeg:'Kőszeg',sarvar:'Sárvár',veszprem:'Veszprém',papa:'Pápa',ajka:'Ajka',tata:'Tata',tatabanya:'Tatabánya',komarom:'Komárom',balatonfured:'Balatonfüred',tihany:'Tihany',balatonalmadi:'Balatonalmádi',balatonfuzfo:'Balatonfűzfő',balatonkenese:'Balatonkenese',revfulop:'Révfülöp',badacsony:'Badacsony',siofok:'Siófok',zamardi:'Zamárdi',balatonszemes:'Balatonszemes',balatonfoldvar:'Balatonföldvár',balatonlelle:'Balatonlelle',balatonboglar:'Balatonboglár',fonyod:'Fonyód',keszthely:'Keszthely',heviz:'Hévíz',tapolca:'Tapolca'};
  const allowedCities = ['badacsony','balatonalmadi','balatonboglar','balatonfoldvar','balatonfured','balatonfuzfo','balatonkenese','balatonlelle','balatonszemes','fonyod','gyor','heviz','keszthely','komarom','mosonmagyarovar','papa','revfulop','siofok','sopron','szombathely','tapolca','tata','tatabanya','tihany','veszprem','zamardi'];
  Object.keys(cityNames).forEach(id=>{if(!allowedCities.includes(id))delete cityNames[id];});
  const excluded = ['kalocsa','baja','kiskoros','szekszard','paks','solt','dunafoldvar'];
  const images = {sofa:'szofa-lenkarpit-varosi-nappali.webp','l-sofa':'l-alaku-kanape-vilagos-nappali.webp','u-sofa':'l-alaku-kanape-vilagos-nappali.webp',armchair:'fotel-bukle-olvasosarok.webp',dining:'karpitozott-ebedloszek-tolgy-etkezo.webp',office:'karpitozott-irodai-szek-dolgozoszoba.webp',mattress:'matrac-karpitozott-agy-vilagos-haloszoba.webp'};
  const catalog = [
    {id:'karpit_szofa',label:'Szófa, heverő',price:15500,duration:40,seats:3,image:'sofa'},
    {id:'karpit_l_kanape',label:'L alakú kanapé',price:17500,duration:50,seats:4,image:'l-sofa'},
    {id:'karpit_u_kanape',label:'U alakú kanapé',price:22500,duration:60,seats:6,image:'u-sofa'},
    {id:'karpit_fotel',label:'Kárpitozott fotel',price:6500,duration:20,seats:1,image:'armchair'},
    {id:'karpit_ebedlo_szek',label:'Kárpitozott ebédlőszék',price:3500,duration:10,seats:1,image:'dining'},
    {id:'karpit_irodai_szek',label:'Kárpitozott irodai szék',price:4000,duration:15,seats:1,image:'office'},
    {id:'matrac_egyagyas_a',label:'Egyágyas matrac · egy oldal',price:8000,duration:25,sides:1,image:'mattress'},
    {id:'matrac_egyagyas_ab',label:'Egyágyas matrac · két oldal',price:12000,duration:40,sides:2,image:'mattress'},
    {id:'matrac_francia_a',label:'Franciaágy matrac · egy oldal',price:12000,duration:35,sides:1,image:'mattress'},
    {id:'matrac_francia_ab',label:'Franciaágy matrac · két oldal',price:17000,duration:55,sides:2,image:'mattress'},
    {id:'matrac_gyerek_a',label:'Gyerekmatrac · egy oldal',price:5000,duration:15,sides:1,image:'mattress'},
    {id:'matrac_gyerek_ab',label:'Gyerekmatrac · két oldal',price:7000,duration:25,sides:2,image:'mattress'},
    {id:'matrac_kisagy_a',label:'Kiságy matrac · egy oldal',price:4000,duration:10,sides:1,image:'mattress'},
    {id:'matrac_kisagy_ab',label:'Kiságy matrac · két oldal',price:6000,duration:20,sides:2,image:'mattress'}
  ];
  const groups = [
    {id:'sectional',label:'Sarokkanapé',ids:['karpit_l_kanape','karpit_u_kanape']},
    {id:'sofa',label:'Szófa és heverő',ids:['karpit_szofa']},
    {id:'armchair',label:'Fotel',ids:['karpit_fotel']},
    {id:'dining',label:'Ebédlőszék',ids:['karpit_ebedlo_szek']},
    {id:'office',label:'Irodai szék',ids:['karpit_irodai_szek']},
    {id:'mattress',label:'Matrac',ids:catalog.filter(p=>p.sides).map(p=>p.id)}
  ];
  const extras = {
    karpit_folteltavolitas:{label:'Extra folteltávolítás',price:2000,basis:'seats',duration:10,unit:'ülőhely'},
    karpit_impregnalas:{label:'Impregnálás',price:3000,basis:'upholstery',duration:15,unit:'bútor'},
    karpit_szagtalanitas:{label:'Szagtalanítás',price:2500,basis:'upholstery',duration:10,unit:'bútor'},
    matrac_nedves_tisztitas:{label:'Folteltávolítás és fertőtlenítő nedves matractisztítás',price:5000,basis:'sides',duration:20,unit:'oldal'},
    matrac_agykeret:{label:'Ágykeret, fejtámla tisztítása',price:3000,basis:'mattresses',duration:15,unit:'matrac'}
  };
  const zones = {belvaros:{label:'Belváros',fee:3500},kulso:{label:'Külváros',fee:4000},'20km':{label:'A város 10 km-es körzetében',fee:4500},'40km':{label:'A város 20 km-es körzetében',fee:5500}};
  const byId=Object.fromEntries(catalog.map(p=>[p.id,p]));
  const sofa = id=>['karpit_szofa','karpit_l_kanape','karpit_u_kanape'].includes(id);
  const money=n=>new Intl.NumberFormat('hu-HU').format(n)+' Ft';
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function assert(ok,message){if(!ok)throw new TypeError(message);}
  function keys(value,allowed){assert(value&&typeof value==='object'&&!Array.isArray(value),'Hibás adatformátum.');assert(Object.keys(value).every(k=>allowed.includes(k)),'Ismeretlen adatmező.');}
  function validate(input, allowEmpty=false){
    keys(input,['version','sourcePage','city','travelZone','items','extras']);
    assert(input.version===1,'Ismeretlen összeállítás-verzió.');
    assert(Object.hasOwn(cityNames,input.city)&&!excluded.includes(input.city),'Ehhez a városhoz nem tartozik online foglalás.');
    assert(['karpittisztitas-'+input.city+'.html','matractisztitas-'+input.city+'.html'].includes(input.sourcePage),'A forrásoldal és a város nem egyezik.');
    assert(input.travelZone===''||Object.hasOwn(zones,input.travelZone),'Ismeretlen kiszállási körzet.');
    assert(Array.isArray(input.items)&&input.items.length<=14&&(allowEmpty||input.items.length>0),'Válassz legalább egy bútort.');
    const seen=new Set();
    const items=input.items.map(item=>{
      keys(item,['id','count','upsells']);
      assert(Object.hasOwn(byId,item.id)&&!seen.has(item.id),'Ismeretlen vagy ismétlődő bútortípus.');seen.add(item.id);
      assert(Number.isSafeInteger(item.count)&&item.count>=1&&item.count<=99,'A darabszám 1 és 99 közötti egész szám lehet.');
      assert(Array.isArray(item.upsells)&&item.upsells.length<=2&&new Set(item.upsells).size===item.upsells.length&&item.upsells.every(x=>sofa(item.id)&&['atkairtas','agyazhato'].includes(x)),'Ehhez a bútorhoz nem választható ez a kiegészítés.');
      return {id:item.id,count:item.count,upsells:[...item.upsells]};
    });
    assert(Array.isArray(input.extras)&&input.extras.length<=5&&new Set(input.extras).size===input.extras.length&&input.extras.every(x=>Object.hasOwn(extras,x)),'Ismeretlen vagy ismétlődő kiegészítés.');
    assert(input.extras.every(x=>items.some(i=>i.id.startsWith(x.split('_')[0]+'_'))),'A kiegészítéshez válassz megfelelő bútort.');
    return {version:1,sourcePage:input.sourcePage,city:input.city,travelZone:input.travelZone,items,extras:[...input.extras]};
  }
  function calculate(input){
    const s=validate(input,true),lines=[],counts={upholstery:0,mattresses:0,seats:0,sides:0};let subtotal=0,duration=0;
    const add=(label,amount,itemId)=>{subtotal+=amount;lines.push({label,amount,...(itemId?{itemId}:{})});};
    s.items.forEach(i=>{const p=byId[i.id];add(i.count+' × '+p.label,p.price*i.count,i.id);duration+=p.duration*i.count;counts[p.sides?'mattresses':'upholstery']+=i.count;counts.seats+=(p.seats||0)*i.count;counts.sides+=(p.sides||0)*i.count;i.upsells.forEach(x=>{add((x==='atkairtas'?'Atkairtás':'Ágyazható felület tisztítása')+' · '+i.count+' db',5000*i.count);duration+=(x==='atkairtas'?15:20)*i.count;});});
    s.extras.forEach(x=>{const e=extras[x],n=counts[e.basis];add(e.label,e.price*n);duration+=e.duration*(e.basis==='seats'?Math.ceil(n/2):n);});
    const travelFee=s.items.length&&s.travelZone?zones[s.travelZone].fee:0;if(travelFee)add('Kiszállás · '+zones[s.travelZone].label,travelFee);
    const percent=counts.upholstery&&counts.mattresses?10:counts.upholstery+counts.mattresses>=3?5:0,discount=Math.round(subtotal*percent/100);
    if(discount)lines.push({label:percent===10?'Kárpit + matrac kedvezmény · 10%':'Legalább 3 bútor kedvezménye · 5%',amount:-discount});
    return {subtotal,discount,discountPercent:percent,total:subtotal-discount,duration,isLargeOrder:duration>480,travelFee,lines,counts};
  }
  function encode(input){return '#booking?eco-config='+encodeURIComponent(JSON.stringify(validate(input)));}
  function decode(hash){assert(typeof hash==='string'&&hash.length<=8192&&hash.startsWith('#booking?eco-config='),'Hibás vagy túl hosszú összeállítás.');return validate(JSON.parse(decodeURIComponent(hash.slice(20))));}
  function imageFor(root,item){let map={};try{map=JSON.parse(root.dataset.imageMap||'{}');}catch{}const entry=map[item.image];return {src:(root.dataset.assets||'studio/assets').replace(/\/$/,'')+'/'+(typeof entry==='string'?entry:entry?.file||images[item.image]),alt:entry?.alt||(item.image==='u-sofa'?'Sarokkanapé':item.label)+' egy gondosan berendezett, világos enteriőrben – generált illusztráció',width:Number.isSafeInteger(entry?.width)&&entry.width>0?entry.width:960,height:Number.isSafeInteger(entry?.height)&&entry.height>0?entry.height:720};}
  let counter=0;
  function mount(root){
    if(root.ecoStudioConfigurator)return root.ecoStudioConfigurator;
    const prefix='studio-config-'+(++counter),city=root.dataset.city;
    const state=validate({version:1,sourcePage:root.dataset.sourcePage||location.pathname.split('/').pop(),city,travelZone:'',items:[],extras:[]},true);
    const choices=Object.fromEntries(groups.map(g=>[g.id,g.ids[0]]));
    root.classList.add('med-config');
    root.innerHTML=`<div class="med-config-layout"><div class="med-config-main"><div class="med-config-products">${groups.map(g=>{const p=byId[g.ids[0]],im=imageFor(root,p);return `<article class="med-product" data-group="${g.id}"><img class="med-product-image" src="${escape(im.src)}" alt="${escape(im.alt)}" width="${im.width}" height="${im.height}" loading="lazy"><div class="med-product-body"><h3>${g.label}</h3><p class="med-product-price" data-unit-price>${money(p.price)} / db</p>${g.id==='mattress'?`<div class="studio-mattress-note"><strong>Az alapár atkairtást tartalmaz</strong><p>Poratkák, bőrhulladék, atkatojások és atkaürülék eltávolítása száraz kezeléssel.</p><a href="#${prefix}-matrac_nedves_tisztitas" data-extra-guide>Folteltávolítást és fertőtlenítő nedves tisztítást is kérsz? A matrac hozzáadása után válaszd lent, a kiegészítőknél. <span aria-hidden="true">↓</span></a></div>`:''}${g.ids.length>1?`<label class="med-config-field" for="${prefix}-${g.id}"><span>Típus és tisztítandó felület</span><select id="${prefix}-${g.id}" data-variant>${g.ids.map(id=>`<option value="${id}">${byId[id].label}</option>`).join('')}</select></label>`:`<p class="med-product-type">${p.label}</p>`}<div class="med-config-quantity"><button type="button" data-delta="-1" aria-label="${g.label}: darabszám csökkentése" disabled>−</button><output data-count aria-label="${g.label}: kiválasztott darabszám">0 db</output><button type="button" data-delta="1" aria-label="${g.label}: darabszám növelése">+</button></div>${sofa(p.id)?`<div class="med-product-options"><label class="med-config-check"><input type="checkbox" data-item-extra="atkairtas"><span>Atkairtás<small>+ ${money(5000)} / db</small></span></label><label class="med-config-check"><input type="checkbox" data-item-extra="agyazhato"><span>Ágyazható felület tisztítása<small>+ ${money(5000)} / db</small></span></label></div>`:''}</div></article>`;}).join('')}</div><p class="med-config-note">Többféle kanapé vagy matrac? A típusváltás után a korábban hozzáadott tételek megmaradnak az összesítőben.</p><fieldset class="med-config-extras"><legend>Kiegészítő gondoskodás</legend>${Object.entries(extras).map(([id,e])=>`<label class="med-config-check" id="${prefix}-${id}" tabindex="-1"><input type="checkbox" data-extra="${id}" disabled><span>${e.label}<small>+ ${money(e.price)} / ${e.unit}</small></span></label>`).join('')}<p class="med-config-note">A kiegészítést minden érintett bútorra számoljuk. A foltkezelés ülőhelyszámai: szófa 3, L kanapé 4, U kanapé 6, fotel és szék 1. Nedves matractisztításnál a száradás körülbelül 24 óra. Az atkairtás nem jelent garantált teljes atka- vagy allergénmentességet.</p></fieldset><label class="med-config-field" for="${prefix}-zone"><span>Kiszállás · ${cityNames[city]} és környéke</span><select id="${prefix}-zone" data-zone><option value="">Válassz körzetet</option>${Object.entries(zones).map(([id,z])=>`<option value="${id}">${z.label} · ${money(z.fee)}</option>`).join('')}</select></label></div><aside class="med-config-summary" aria-label="Árkalkuláció összesítő"><span class="med-config-eyebrow">Az összeállításod</span><output class="med-config-total" aria-live="polite" aria-atomic="true">0 Ft</output><p class="med-config-summary-status"></p><ul class="med-config-breakdown"></ul><p class="studio-removal-status" role="status"></p><p class="med-config-note">Tájékoztató kalkuláció. Az anyagot, a méretet és az állapotot a munka előtt egyeztetjük. A következő oldalon átnézheted és átveheted az összeállítást, majd megadhatod az adataidat és kiválaszthatod az időpontot.</p><div class="med-config-actions"><a class="med-config-button" data-booking-handoff aria-disabled="true" tabindex="-1">Tovább a megrendelőhöz</a><a class="med-config-button med-config-button-secondary" href="tel:+36702408141">Egyeztetek telefonon</a></div><p class="med-config-note" data-handoff-status role="status"></p><details class="med-email-fallback"><summary>Másolható összeállítás</summary><textarea readonly rows="6" aria-label="Az összeállítás szövege" data-summary-text></textarea></details><button class="med-config-reset" type="button" data-reset>Összeállítás törlése</button></aside></div>`;
    function update(){
      state.extras=state.extras.filter(x=>state.items.some(i=>i.id.startsWith(x.split('_')[0]+'_')));
      const r=calculate(state);root.querySelector('.med-config-total').textContent=money(r.total);
      root.querySelector('.med-config-summary-status').textContent=!state.items.length?'Válaszd ki a bútorokat.':r.isLargeOrder?'Nagyobb összeállítás · egyedi időpontegyeztetés':state.travelZone?'Kiszállással együtt · tájékoztató összeg':'Kiszállás nélkül · válassz körzetet';
      const list=root.querySelector('.med-config-breakdown');list.replaceChildren();r.lines.forEach(l=>{const li=document.createElement('li');li.className='med-config-line';const span=document.createElement('span'),strong=document.createElement('strong');span.textContent=l.label;strong.textContent=money(l.amount);li.append(span,strong);if(l.itemId){const remove=document.createElement('button');remove.type='button';remove.className='studio-remove-item';remove.dataset.removeItem=l.itemId;remove.setAttribute('aria-label',byId[l.itemId].label+': tétel törlése, minden darab');remove.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6"/></svg><span>Tétel törlése</span>';li.append(remove);}list.append(li);});
      const link=root.querySelector('[data-booking-handoff]');link.setAttribute('aria-disabled',String(!state.items.length));link.tabIndex=state.items.length?0:-1;if(state.items.length)link.href=(root.dataset.bookingUrl||'index.html').split('#')[0]+encode(state);else link.removeAttribute('href');
      root.querySelector('[data-summary-text]').value=[cityNames[city],...r.lines.map(l=>l.label+': '+money(l.amount)),'Tájékoztató végösszeg: '+money(r.total)].join('\n');
      groups.forEach(g=>{const el=root.querySelector('[data-group="'+g.id+'"]'),id=choices[g.id],p=byId[id],i=state.items.find(i=>i.id===id),im=imageFor(root,p);el.querySelector('[data-count]').textContent=(i?.count||0)+' db';el.querySelector('[data-delta="-1"]').disabled=!i;el.querySelector('[data-delta="1"]').disabled=i?.count>=99;el.querySelector('[data-unit-price]').textContent=money(p.price)+' / db';const img=el.querySelector('img');img.src=im.src;img.alt=im.alt;img.width=im.width;img.height=im.height;el.querySelectorAll('[data-item-extra]').forEach(c=>{c.disabled=!i;c.checked=!!i?.upsells.includes(c.dataset.itemExtra);});});
      root.querySelectorAll('[data-extra]').forEach(c=>{c.disabled=!state.items.some(i=>i.id.startsWith(c.dataset.extra.split('_')[0]+'_'));c.checked=state.extras.includes(c.dataset.extra);});
      return r;
    }
    root.addEventListener('click',e=>{const button=e.target.closest('button');if(button?.hasAttribute('data-remove-item')){const id=button.dataset.removeItem,index=state.items.findIndex(i=>i.id===id);if(index<0)return;state.items=state.items.filter(i=>i.id!==id);update();root.querySelector('.studio-removal-status').textContent=byId[id].label+' törölve az összeállításból.';const remaining=root.querySelectorAll('[data-remove-item]');(remaining[Math.min(index,remaining.length-1)]||root.querySelector('[data-reset]')).focus({preventScroll:true});}else if(button?.hasAttribute('data-reset')){state.items=[];state.extras=[];state.travelZone='';root.querySelector('[data-zone]').value='';update();}else if(button?.hasAttribute('data-delta')){const id=choices[button.closest('[data-group]').dataset.group];let item=state.items.find(i=>i.id===id);if(!item){item={id,count:0,upsells:[]};state.items.push(item);}item.count=Math.max(0,Math.min(99,item.count+Number(button.dataset.delta)));state.items=state.items.filter(i=>i.count>0);update();}if(e.target.closest('[data-booking-handoff][aria-disabled="true"]'))e.preventDefault();});
    root.addEventListener('change',e=>{const c=e.target;if(c.hasAttribute('data-variant'))choices[c.closest('[data-group]').dataset.group]=c.value;else if(c.hasAttribute('data-item-extra')){const i=state.items.find(i=>i.id===choices[c.closest('[data-group]').dataset.group]);if(i)i.upsells=c.checked?[...i.upsells,c.dataset.itemExtra]:i.upsells.filter(x=>x!==c.dataset.itemExtra);}else if(c.hasAttribute('data-extra'))state.extras=c.checked?[...state.extras,c.dataset.extra]:state.extras.filter(x=>x!==c.dataset.extra);else if(c.hasAttribute('data-zone'))state.travelZone=c.value;update();});
    update();return root.ecoStudioConfigurator={snapshot:()=>validate(state,true),calculate:()=>calculate(state)};
  }
  function freeze(v){Object.values(v).forEach(x=>{if(x&&typeof x==='object')freeze(x);});return Object.freeze(v);}
  [catalog,groups,extras,zones,cityNames,excluded].forEach(freeze);
  global.EcoStudioConfig={catalog,groups,extras,zones,cities:cityNames,excluded,validate,calculate,encode,decode,mount,money};
  if(typeof document!=='undefined'){const start=()=>document.querySelectorAll('[data-studio-configurator]').forEach(root=>{try{mount(root);}catch{root.textContent='Az árkalkuláció jelenleg nem tölthető be. Egyeztetés: 06 70 240 8141.';}});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();}
})(typeof window!=='undefined'?window:globalThis);

