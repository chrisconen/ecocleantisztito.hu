/* ECO Clean material guide. No image leaves the browser until the explicit analyze action. */
(() => {
 'use strict';
 const root=document.querySelector('[data-material-app]');if(!root)return;
 const section=root.closest('.eco-material'),result=section.querySelector('[data-material-result]');
 const $=s=>root.querySelector(s),status=$('[data-material-status]'),analyze=$('[data-material-analyze]'),retry=$('[data-material-retry]');
 const preview=$('.eco-material-preview'),photo=preview.querySelector('img'),fileInput=$('[data-material-file]'),cameraInput=$('[data-material-capture]');
 const archiveConsent=$('[data-material-archive-consent]');
 const local=['localhost','127.0.0.1'].includes(location.hostname)&&location.port==='8089';
 const base=local?`${location.protocol}//${location.hostname}:8096`:location.origin;
 let image=null,ready=false,busy=false,version=0,controller=null,healthVersion=0,healthChecked=false,collectionEnabled=false;
 let siteKey='',securityScript=null,lastAnalysis=null,reviewSaved=false,reviewReady=false;
 const securityBox=$('[data-material-turnstile]');
 const reviewBox=document.createElement('form');reviewBox.className='eco-material-review';reviewBox.noValidate=true;reviewBox.id='material-email-review';
 reviewBox.innerHTML=`<span class="eco-material-eyebrow">Visszaigazolás a csapatunktól</span><h3>Ellenőrizzük, és e-mailben válaszolunk.</h3><p>Elküldheted a fotót közvetlenül szakmai ellenőrzésre, vagy kérhetsz visszaigazolást a fenti eredményhez. Ehhez nem indítunk újabb automatikus elemzést.</p><label for="material-review-email">E-mail-címed<input id="material-review-email" data-review-email type="email" autocomplete="email" inputmode="email" maxlength="254" placeholder="nev@pelda.hu" required></label><label class="eco-material-review-consent"><input type="checkbox" data-review-consent required><span>Kérem az e-mailes ellenőrzést, és hozzájárulok, hogy az ECO Clean a fotómat, megjegyzésemet és e-mail-címemet a válaszadáshoz privát módon megőrizze.<small>Ez nem hírlevél-feliratkozás, és nem engedélyezi a kép referenciaanyagként való felhasználását.</small></span></label><button type="submit" class="eco-material-button" data-review-submit disabled>Fotó elküldése ellenőrzésre <span aria-hidden="true">→</span></button><p class="eco-material-review-status" role="status" aria-live="polite" data-review-status>Válassz fotót, majd add meg az e-mail-címedet.</p>`;
 result.after(reviewBox);
 const reviewEmail=reviewBox.querySelector('[data-review-email]'),reviewConsent=reviewBox.querySelector('[data-review-consent]'),reviewSubmit=reviewBox.querySelector('[data-review-submit]'),reviewStatus=reviewBox.querySelector('[data-review-status]');
 const caption=section.querySelector('.eco-material-caption');if(caption)caption.textContent='A jól látható szövetszerkezetet összevetjük a NovaLife-mintákkal. E-mailes szakmai ellenőrzést is kérhetsz; a kérdéseket még időpontfoglalás előtt tisztázzuk.';

 function loadSecurity(){
  if(window.turnstile?.render)return Promise.resolve(window.turnstile);
  if(securityScript)return securityScript;
  securityScript=new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;
   let done=false;const finish=(error)=>{if(done)return;done=true;clearTimeout(timer);script.onload=script.onerror=null;if(error){script.remove();securityScript=null;reject(error);}else resolve(window.turnstile);};
   const timer=setTimeout(()=>finish(Error('A biztonsági ellenőrzés nem töltődött be. Próbáld újra.')),20000);
   script.onload=()=>finish(window.turnstile?.render?null:Error('A biztonsági ellenőrzés nem érhető el. Próbáld újra.'));
   script.onerror=()=>finish(Error('A biztonsági ellenőrzés nem töltődött be. Próbáld újra.'));document.head.append(script);
  });return securityScript;
 }
 async function verifyVisitor(signal){
  if(!siteKey)return {token:null,reset(){}};
  const api=await loadSecurity();if(signal.aborted)throw new DOMException('Cancelled','AbortError');
  return new Promise((resolve,reject)=>{
   let widget=null,settled=false,active=true;
   const reset=()=>{if(!active)return;active=false;signal.removeEventListener('abort',abort);if(widget!==null){try{api.reset(widget);}catch{}try{api.remove(widget);}catch{}}securityBox.hidden=true;};
   const fail=(error)=>{if(settled)return;settled=true;reset();reject(error);};
   const abort=()=>{if(settled){reset();return;}fail(new DOMException('Cancelled','AbortError'));};
   signal.addEventListener('abort',abort,{once:true});securityBox.hidden=false;
   try{widget=api.render(securityBox,{sitekey:siteKey,action:'material-analysis',theme:'light',size:'compact',appearance:'interaction-only',execution:'execute','response-field':false,retry:'never',
    callback:token=>{if(!active||settled)return;if(typeof token!=='string'||!token){fail(Error('A biztonsági ellenőrzés nem sikerült. Próbáld újra.'));return;}settled=true;resolve({token,reset});},
    'error-callback':()=>{fail(Error('A biztonsági ellenőrzés nem sikerült. Próbáld újra.'));return true;},
    'expired-callback':()=>fail(Error('A biztonsági ellenőrzés lejárt. Próbáld újra.')),
    'timeout-callback':()=>fail(Error('A biztonsági ellenőrzésre túl sokat kellett várni. Próbáld újra.')),
    'unsupported-callback':()=>fail(Error('A biztonsági ellenőrzéshez próbálj másik böngészőt.'))
   });api.execute(securityBox);}catch{fail(Error('A biztonsági ellenőrzés nem indult el. Próbáld újra.'));}
  });
 }
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const message=(text,error=false)=>{status.textContent=text;status.classList.toggle('is-error',error);};
 function buttons(){
  reviewSubmit.disabled=!image||!reviewReady||busy||reviewSaved;reviewEmail.disabled=busy;reviewConsent.disabled=busy;analyze.disabled=!image||!ready||busy;root.setAttribute('aria-busy',String(busy));analyze.replaceChildren(document.createTextNode(busy?'A részleteket vizsgáljuk…':'Elemzés indítása '));if(!busy){const arrow=el('span','→');arrow.setAttribute('aria-hidden','true');analyze.append(arrow);}
  if(archiveConsent){archiveConsent.disabled=busy||!collectionEnabled;if(!collectionEnabled)archiveConsent.checked=false;}
  const collectionStatus=$('[data-material-collection-status]');if(collectionStatus)collectionStatus.textContent=!healthChecked?'Az anyagreferencia-gyűjtemény elérhetőségét ellenőrizzük.':collectionEnabled?'A hozzájárulás csak ehhez a kiválasztott fotóhoz tartozik.':'A privát referenciagyűjtés most nem elérhető. Ha a fotóelemzés elérhető, megőrzés nélkül továbbra is használhatod.';
 }
 async function health(){
  const request=++healthVersion;retry.hidden=true;
  try{
   const r=await fetch(base+'/api/material-health',{cache:'no-store',signal:AbortSignal.timeout(8000),credentials:'same-origin'}),data=await r.json();if(request!==healthVersion)return;
   healthChecked=true;ready=r.ok&&data?.enabled!==false&&data?.ready===true;
   collectionEnabled=r.ok&&data?.collection_enabled===true;reviewReady=r.ok&&data?.review_enabled===true;
   siteKey=r.ok&&typeof data?.turnstile_site_key==='string'?data.turnstile_site_key.trim():'';root.dataset.turnstileSiteKey=siteKey;
   if(!busy)message(ready?(image?'A fotód készen áll. Te indítod az elemzést.':'Válassz egy fotót a kezdéshez.'):'A fotóelemzés jelenleg nem elérhető. Az alábbi mintaeredménnyel megnézheted, hogyan működik.');
  }catch{if(request!==healthVersion)return;healthChecked=true;collectionEnabled=false;reviewReady=false;ready=false;if(!busy)message('A fotóelemzéshez most nem tudunk kapcsolódni. A mintaeredmény továbbra is megnézhető.');}
  retry.hidden=ready;buttons();
 }
 function clear(){lastAnalysis=null;reviewSaved=false;reviewConsent.checked=false;reviewStatus.textContent='Válassz fotót, majd add meg az e-mail-címedet.';version++;controller?.abort();controller=null;image=null;busy=false;if(archiveConsent)archiveConsent.checked=false;photo.removeAttribute('src');preview.hidden=true;$('[data-upload-prompt]').hidden=false;fileInput.value='';cameraInput.value='';result.hidden=true;result.replaceChildren();message(ready?'Válassz egy új fotót.':'Választhatsz fotót, az elemzéshez a szolgáltatás elérhetősége is szükséges.');buttons();}
 async function select(file){if(!file)return;clear();const request=version;message('Előkészítjük a fotódat…');
  try{
   if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('JPG, PNG vagy WebP képet válassz. HEIC-fotót előbb ments JPG-ként.');
   if(file.size>20*1024*1024)throw Error('Ez a fotó nagyobb 20 MB-nál. Válassz kisebb képet.');
   if(file.size===0)throw Error('A kiválasztott fájl üres. Válassz másik fotót.');
   let bitmap;try{bitmap=await createImageBitmap(file);}catch{throw Error('Ezt a képet nem tudtuk megnyitni. Próbálj másik JPG, PNG vagy WebP fotót.');}
   try{
    if(!bitmap.width||!bitmap.height||bitmap.width*bitmap.height>40000000)throw Error('A kép felbontása túl nagy. Legfeljebb 40 megapixeles fotót válassz.');
    if(request!==version)return;
    const scale=Math.min(1,1200/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);image=canvas.toDataURL('image/jpeg',.85);
    photo.src=image;preview.hidden=false;$('[data-upload-prompt]').hidden=true;$('[data-file-label]').textContent=`${canvas.width} × ${canvas.height} px · előkészített fotó`;message(ready?'A fotód készen áll. Te indítod az elemzést.':'A fotód csak helyben látható. Az elemző szolgáltatás jelenleg nem elérhető.');
   }finally{bitmap.close();}
  }catch(e){if(request===version)message(e.message,true);}finally{if(request===version)buttons();}
 }
 function validate(data){
  if(!data||typeof data!=='object'||!['anyag','cimke','hasznalhatatlan'].includes(data.kep_tipus))throw Error('Az elemzés válasza nem értékelhető. Próbáld újra egy másik fotóval.');
  const clean={kep_tipus:data.kep_tipus};for(const key of ['anyag','anyag_alt','indoklas','modszer','ellenorzes','kerdes_ugyfelnek'])clean[key]=typeof data[key]==='string'?data[key].slice(0,3000):'';
  for(const key of ['kerulendo','kockazatok'])clean[key]=Array.isArray(data[key])?data[key].filter(x=>typeof x==='string').slice(0,12).map(x=>x.slice(0,800)):[];
  const states=['likely_other','possible_novalife','label_novalife','uncertain'];
  let novaStatus=states.includes(data.novalife?.status)?data.novalife.status:'uncertain';
  if(data.kep_tipus==='hasznalhatatlan')novaStatus='uncertain';
  if(novaStatus==='label_novalife'&&data.kep_tipus!=='cimke')novaStatus='possible_novalife';
  clean.novalife={status:novaStatus,reason:typeof data.novalife?.reason==='string'?data.novalife.reason.slice(0,2000):''};
  clean.tisztitasi_kod=data.kep_tipus==='cimke'&&['W','S','WS','X'].includes(data.tisztitasi_kod)?data.tisztitasi_kod:'ismeretlen';
  if(!clean.indoklas||data.kep_tipus!=='hasznalhatatlan'&&!clean.anyag)throw Error('Az elemzésből fontos részlet hiányzik. Kérjük, próbáld újra.');for(const key of ['modszer','ellenorzes'])if(/helyszín|anyagprób|rejtett hely/iu.test(clean[key]))clean[key]='A szükséges részleteket online, a fotóid és az elérhető kezelési útmutató alapján tisztázzuk, még időpontfoglalás előtt.';return clean;
 }
 const novaCopy={
  likely_other:{title:'A fotón nem NovaLife-jellegű felület látható.',next:'Továbbléphetsz az árkalkulátorhoz. E-mailes szakmai visszaigazolást is kérhetsz az alábbi mezőben.',quality:'Más szövetre utaló jelek'},
  possible_novalife:{title:'NovaLife vagy hasonló bevonat gyanúja',next:'Tisztítás előtt szakmai egyeztetés szükséges. Mutasd meg a kezelési címkét, vagy beszéljünk telefonon a következő lépésről.',quality:'További ellenőrzést igénylő jelek'},
  label_novalife:{title:'NovaLife-jelölés látható',next:'A jelölés miatt a tisztítás lehetőségéről előzetesen, a kezelési előírás ismeretében kell egyeztetnünk. Kérjük, keress bennünket telefonon.',quality:'A címkén látható jelölés'},
  uncertain:{title:'A NovaLife nem zárható ki a fotóból',next:'Egy élesebb részletfotó vagy a kezelési címke segíthet. A bizonytalanság tisztázásáig a fotó alapján nem dönthető el a megfelelő tisztítás.',quality:'További részlet szükséges'}
 };
 function novaPanel(d){
  const state=d.novalife.status,copy=novaCopy[state],panel=el('div',undefined,'eco-material-novalife');panel.dataset.novalifeStatus=state;
  panel.append(el('span','NovaLife · előzetes kockázatszűrés','eco-material-eyebrow'),el('h3',copy.title));
  if(d.novalife.reason)panel.append(el('p',d.novalife.reason,'eco-material-novalife-reason'));
  panel.append(el('p',copy.next,'eco-material-novalife-next'));
  const actions=el('div',undefined,'eco-material-novalife-actions');
  const choose=(label,kind)=>{const button=el('button',label,'eco-material-button eco-material-button-quiet');button.type='button';button.dataset.materialFollowup=kind;button.addEventListener('click',()=>{message(kind==='label'?'Válassz éles fotót a teljes kezelési címkéről. A szöveg és a jelzések is látszódjanak.':'Válassz éles közeli képet a szövetről, természetes fényben.');fileInput.click();});return button;};
  if(state==='uncertain')actions.append(choose('Új részletfotót választok','detail'));
  actions.append(choose('Címkefotót választok','label'));
  if(state==='possible_novalife'||state==='label_novalife'){const phone=el('a','Egyeztetek egy szakemberrel','eco-material-button');phone.href='tel:+36702408141';actions.append(phone);}
  const emailAction=el('a','E-mailes ellenőrzést kérek','eco-material-button');emailAction.href='#material-email-review';emailAction.addEventListener('click',()=>reviewEmail.focus({preventScroll:true}));actions.append(emailAction);panel.append(actions,el('p','A címkét gyakran az ülőlap alatt vagy a bútor alján találod. Ha megvan, a gyártó kezelési útmutatóját is készítsd elő.','eco-material-novalife-tip'));return panel;
 }
 function show(data,sample=false){
  const d=validate(data);lastAnalysis=sample?null:{material:d.anyag,status:d.novalife.status};result.replaceChildren();result.hidden=false;result.dataset.sample=String(sample);
  if(sample)result.append(el('div','Mintaeredmény — előre elkészített bemutató, nem a te fotód elemzése.','eco-material-sample-banner'));
  result.append(novaPanel(d));
  if(!sample&&data?._meta?.archive_saved===true)result.append(el('p','Az előkészített fotót megőriztük az ECO Clean privát anyagreferencia-gyűjteményében. Összehasonlítási mintaként csak szakmai jóváhagyás után használjuk.','eco-material-archive-result'));
  if(d.kep_tipus==='hasznalhatatlan'){const box=el('div',undefined,'eco-material-unusable');box.append(el('span','Egy új kép segíthet','eco-material-eyebrow'),el('h3','Nézzük meg közelebbről.'),el('p',d.indoklas));const button=el('button','Másik fotót választok','eco-material-button');button.type='button';button.addEventListener('click',()=>fileInput.click());box.append(button);result.append(box);focusResult();return;}
  const top=el('div',undefined,'eco-material-result-top'),heading=el('div');heading.append(el('span',d.kep_tipus==='cimke'?'A kezelési címke alapján':'A fotó alapján valószínű','eco-material-eyebrow'),el('h3',d.anyag),el('p',d.anyag_alt,'eco-material-result-sub'));
  const code=el('div',undefined,'eco-material-code');code.append(el('b',d.tisztitasi_kod==='ismeretlen'?'Címke szükséges':d.tisztitasi_kod),el('span',d.tisztitasi_kod==='ismeretlen'?'A kezelési kód nem állapítható meg a szövet látványából.':'A címkéről kiolvasott kód — ellenőrizd az eredetin is.'));top.append(heading,code);result.append(top);
  const confidence=el('div',undefined,'eco-material-confidence');confidence.append(el('strong',novaCopy[d.novalife.status].quality),el('p','Fotó alapján adott támpont, nem anyagvizsgálati igazolás vagy tisztítási engedély.'));result.append(confidence);
  const grid=el('div',undefined,'eco-material-result-grid');for(const [key,title] of [['indoklas','Amit a képen látunk'],['modszer','Tisztítás előtt'],['kerulendo','Amit érdemes kerülni'],['kockazatok','Amire figyelünk'],['ellenorzes','Online tisztázzuk'],['kerdes_ugyfelnek','Egy fontos részlet']]){const block=el('div');block.append(el('h4',title));if(Array.isArray(d[key])){const list=el('ul');if(d[key].length)d[key].forEach(t=>list.append(el('li',t)));else list.append(el('li','A fotó alapján nem azonosítható további részlet.'));block.append(list);}else block.append(el('p',d[key]||'A szakemberrel egyeztethető.'));grid.append(block);}result.append(grid);
  const actions=el('div',undefined,'eco-material-result-actions'),next=el('a',d.novalife.status==='likely_other'?'Tovább az árkalkulátorhoz →':'Egyeztetek egy szakemberrel','eco-material-button');next.href=d.novalife.status==='likely_other'?root.dataset.next:'tel:+36702408141';const copy=el('button','Eredmény másolása','eco-material-button eco-material-button-quiet');copy.type='button';const copied=el('span','','eco-material-copy-status');copied.setAttribute('role','status');copy.addEventListener('click',async()=>{const text=[sample?'MINTAEREDMÉNY — nem saját fotó elemzése':'ECO Clean — fotóalapú anyagbecslés',novaCopy[d.novalife.status].title,d.novalife.reason,novaCopy[d.novalife.status].next,d.anyag,d.anyag_alt,'Kezelési kód: '+d.tisztitasi_kod,d.indoklas,'Tisztítás előtt: '+d.modszer,'Online ellenőrzés: '+d.ellenorzes].join('\n');try{await navigator.clipboard.writeText(text);copied.textContent='Az eredményt kimásoltuk.';}catch{copied.textContent='A másolás most nem sikerült. A fenti szöveget kijelölve is másolhatod.';}});actions.append(next,copy,copied);result.append(actions);focusResult();
 }
 function focusResult(){result.focus({preventScroll:true});result.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
 analyze.addEventListener('click',async()=>{
  if(!image||!ready||busy)return;const request=++version,archive=collectionEnabled&&archiveConsent?.checked===true;busy=true;result.hidden=true;const requestController=new AbortController();controller=requestController;const timer=setTimeout(()=>requestController.abort(),145000);buttons();message(siteKey?'Az elemzés előtt rövid biztonsági ellenőrzést végzünk.':'A szövetszerkezetet és a látható részleteket vizsgáljuk. Ez akár egy-két percig is eltarthat.');
  let verification;
  try{verification=await verifyVisitor(requestController.signal);if(request!==version||requestController.signal.aborted)return;message('A szövetszerkezetet és a látható részleteket vizsgáljuk. Ez akár egy-két percig is eltarthat.');const payload={image,media_type:'image/jpeg',note:$('#material-note').value.slice(0,1000),archive_consent:archive};if(verification.token)payload.turnstile_token=verification.token;const response=await fetch(base+'/api/material-analyze',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(payload),signal:requestController.signal});let data;try{data=await response.json();}catch{throw Error('A szolgáltatás most nem adott értékelhető választ. Próbáld újra később.');}if(request!==version)return;if(!response.ok){const problem=response.status===429?'Most túl sok elemzés érkezett. Próbáld újra később.':response.status===413?'A kép túl nagy az elemzéshez. Válassz kisebb fotót.':'Az elemzés most nem érhető el. A képedből nem készült értékelhető eredmény.';throw Error(problem+(data?._meta?.archive_saved===true?' Az előkészített fotót ugyanakkor már megőriztük a privát anyagreferencia-gyűjteményben.':''));}show(data);message('Az elemzés elkészült. Az eredményt lent találod.');}
  catch(e){if(request===version)message(e.name==='AbortError'?'Az elemzésre túl sokat kellett várni. Próbáld újra később.':e.message||'Nem sikerült kapcsolódni az elemzőhöz.',true);}
  finally{verification?.reset();clearTimeout(timer);if(request===version){busy=false;controller=null;buttons();}}
 });
 $('[data-material-pick]').addEventListener('click',()=>fileInput.click());$('[data-material-camera]').addEventListener('click',()=>cameraInput.click());fileInput.addEventListener('change',()=>select(fileInput.files[0]));cameraInput.addEventListener('change',()=>select(cameraInput.files[0]));$('[data-material-clear]').addEventListener('click',clear);retry.addEventListener('click',health);
 const drop=$('[data-material-drop]');for(const event of ['dragenter','dragover'])drop.addEventListener(event,e=>{e.preventDefault();drop.classList.add('is-dragging');});for(const event of ['dragleave','drop'])drop.addEventListener(event,e=>{e.preventDefault();drop.classList.remove('is-dragging');});drop.addEventListener('drop',e=>select(e.dataTransfer.files[0]));
 $('[data-material-example]').addEventListener('click',()=>{version++;controller?.abort();busy=false;buttons();show({novalife:{status:'likely_other',reason:'A szemléltető példában hurkolt szövetszerkezet látható; a pontos anyag és bevonat ellenőrzéséhez a címke szükséges.'},kep_tipus:'anyag',anyag:'Buklé jellegű kárpit',anyag_alt:'Hurkolt, domború felület. A pontos szálösszetétel fotóból nem igazolható.',biztonsag:78,indoklas:'A bemutató példában apró, szabálytalan hurkok és karakteres felületi textúra látható. Ez buklé jellegű szövetszerkezetre utal.',tisztitasi_kod:'ismeretlen',modszer:'A gyártói kezelési előírás és a rejtett helyen végzett anyagpróba alapján választható eljárás. A fénykép önmagában nem igazolja a nedves tisztíthatóságot.',kerulendo:['Erős súrolás és a hurkok beakasztása.','Ismeretlen folttisztító kipróbálása a látható felületen.'],kockazatok:['A hurkolt felület sérülése.','Az anyaghoz nem illő kezelés miatti szín- vagy méretváltozás.'],ellenorzes:'Kezelési címke, színtartóság, korábbi kezelések és a bútor felépítése.',kerdes_ugyfelnek:'Megvan még a bútor kezelési címkéje vagy gyártói útmutatója?'},true);message('Mintaeredményt mutatunk. Ehhez nem indítottunk új képelemzést.');});
 reviewBox.addEventListener('submit',async e=>{
  e.preventDefault();if(!image||!reviewReady||busy||reviewSaved)return;if(!reviewBox.reportValidity())return;
  const request=++version;busy=true;const ctl=new AbortController();controller=ctl;const timer=setTimeout(()=>ctl.abort(),45000);buttons();reviewStatus.textContent='Elküldjük az ellenőrzési kérésedet…';let verification;
  try{verification=await verifyVisitor(ctl.signal);if(request!==version||ctl.signal.aborted)return;
   const payload={image,media_type:'image/jpeg',note:$('#material-note').value.slice(0,1000),email:reviewEmail.value.trim(),review_consent:reviewConsent.checked,analysis_summary:lastAnalysis};if(verification.token)payload.turnstile_token=verification.token;
   const response=await fetch(base+'/api/material-review',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(payload),signal:ctl.signal});const data=await response.json();if(request!==version)return;
   if(!response.ok||data.review_saved!==true||!data.review_id)throw Error('Az ellenőrzési kérésedet most nem sikerült visszaigazolni. Próbáld újra.');
   reviewSaved=true;reviewStatus.textContent='Megkaptuk a fotódat. A csapatunk ellenőrzi, majd e-mailben válaszol. Kérésazonosító: '+String(data.review_id).slice(0,8);reviewStatus.classList.remove('is-error');
  }catch{if(request===version){reviewStatus.textContent='Az ellenőrzési kérésed átvételét nem sikerült visszaigazolni. Próbáld újra, vagy írj az info@ecocleantisztito.hu címre.';reviewStatus.classList.add('is-error');}}
  finally{verification?.reset();clearTimeout(timer);if(request===version){busy=false;controller=null;buttons();}}
 });
 buttons();health();
})();
