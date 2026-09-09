/* Small, progressive enhancements. No backend calls or customer data. */
(() => {
 'use strict';
 const d=document,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 // The shared navigation also serves the excluded regions. Decorate only Studio
 // menus here, including content rebuilt after opening a different mega menu.
 if(d.body.classList.contains('eco-studio')){
  const menuRoots=[d.getElementById('megaMenuContent'),d.querySelector('.nav-mobile')].filter(Boolean);
  const pictogram=/\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*|[\u2605\u2606]/gu;
  const makeIcon=name=>{const span=d.createElement('span');span.className='studio-icon studio-icon-'+name;span.setAttribute('aria-hidden','true');return span;};
  function menuIconName(text){
   if(/matrac|ágy|🛏/i.test(text))return 'bed';
   if(/kárpit|kanapé|szófa|🛋/i.test(text))return 'sofa';
   if(/telefon|hív|📞|☎/i.test(text))return 'phone';
   if(/mail|levél|✉|📧/i.test(text))return 'mail';
   if(/foglal|időpont|naptár|📅|🗓/i.test(text))return 'calendar';
   if(/város|település|kiszáll|📍/i.test(text))return 'pin';
   if(/privát|otthon|ház|🏠|🏡/i.test(text))return 'home';
   if(/céges|irod|ipari|üzem|🏢/i.test(text))return 'home';
   if(/ablak|kirakat|💧/i.test(text))return 'drop';
   return 'leaf';
  }
  function decorateMenus(){
   for(const root of menuRoots){
    // Retain functional close/chevron SVGs, replacing only decorative artwork.
    root.querySelectorAll('.mega-icon svg,.mega-city>svg,.mega-section-label>svg').forEach(svg=>{
     const name=svg.closest('.mega-icon')?menuIconName(root.querySelector('.mega-title')?.textContent||''):'pin';
     svg.replaceWith(makeIcon(name));
    });
    const walker=d.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];let node;
    while(node=walker.nextNode())if(!node.parentElement.closest('script,style,.studio-icon'))nodes.push(node);
    for(const textNode of nodes){
     pictogram.lastIndex=0;if(!pictogram.test(textNode.textContent))continue;
     const name=menuIconName(textNode.parentElement.textContent);
     pictogram.lastIndex=0;textNode.textContent=textNode.textContent.replace(pictogram,'');
     textNode.before(makeIcon(name));
    }
   }
  }
  const observe=()=>menuRoots.forEach(root=>observer.observe(root,{childList:true,subtree:true,characterData:true}));
  const observer=new MutationObserver(()=>{observer.disconnect();try{decorateMenus();}finally{observe();}});
  decorateMenus();observe();
 }
 const roomTabs=[...d.querySelectorAll('[data-room-tab]')];
 function roomActivate(tab,focus=false){roomTabs.forEach(button=>{const selected=button===tab;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;d.getElementById(button.getAttribute('aria-controls')).hidden=!selected;});if(focus)tab.focus();}
 roomTabs.forEach((tab,i)=>{tab.addEventListener('click',()=>roomActivate(tab));tab.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();roomActivate(roomTabs[event.key==='Home'?0:event.key==='End'?roomTabs.length-1:(i+(event.key==='ArrowRight'?1:roomTabs.length-1))%roomTabs.length],true);});});
 d.querySelectorAll('[data-compare]').forEach(box=>{
  const range=box.querySelector('input[type=range]');
  const update=()=>{box.style.setProperty('--reveal',range.value+'%');range.setAttribute('aria-valuetext',range.value+'% az első képből');};
  range.addEventListener('input',update);update();
 });
 const spots=[
  ['Fejtámla','A haj és a bőr természetes zsírossága a háttámla felső részén hagyhat nyomot. A rendszeres ápolás segít időben észrevenni a lerakódást.'],
  ['Karfa és könyöklő','A kéz és a könyök újra meg újra ugyanazzal a felülettel érintkezik. A faggyú, a kézkrém és a por együtt sötétebb lerakódást képezhet a szöveten.'],
  ['Az ülőlap széle','Leüléskor és felálláskor a combbal érintkező perem nagyobb terhelést kap. A lerakódástól eltérően a kopás vagy a ruhából átkerülő festék nem mindig távolítható el.']
 ];
 d.querySelectorAll('[data-hotspot]').forEach(button=>button.addEventListener('click',()=>{
  const i=Number(button.dataset.hotspot),panel=d.getElementById('med-hotspot-detail');
  panel.querySelector('h3').textContent=spots[i][0];panel.querySelector('p').textContent=spots[i][1];
  d.querySelectorAll('[data-hotspot]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.hotspot)===i)));
 }));
 const tabs=[...d.querySelectorAll('[data-mite-tab]')];
 function activate(button,focus=false){
  tabs.forEach(b=>{const active=b===button;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;d.getElementById(b.getAttribute('aria-controls')).hidden=!active;});
  if(focus)button.focus();
 }
 tabs.forEach((button,i)=>{button.addEventListener('click',()=>activate(button));button.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();activate(tabs[event.key==='Home'?0:event.key==='End'?tabs.length-1:(i+(event.key==='ArrowRight'?1:tabs.length-1))%tabs.length],true);}});});
 const dialog=d.querySelector('.med-image-dialog');let previousFocus;
 d.querySelectorAll('[data-zoom]').forEach(button=>button.addEventListener('click',()=>{previousFocus=button;dialog.querySelector('img').src=button.dataset.zoom;dialog.showModal();dialog.querySelector('button').focus();}));
 dialog?.querySelector('.med-dialog-close').addEventListener('click',()=>dialog.close());
 dialog?.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
 dialog?.addEventListener('close',()=>previousFocus?.focus());
 d.querySelectorAll('[data-config-focus]').forEach(link=>link.addEventListener('click',event=>{
  const root=d.querySelector('[data-studio-configurator]'),products=[...root.querySelectorAll('.med-product')],card=products[Number(link.dataset.configFocus)];
  if(!card)return;event.preventDefault();card.scrollIntoView({behavior:reduced?'instant':'smooth',block:'center'});
  card.classList.remove('med-focus-flash');void card.offsetWidth;card.classList.add('med-focus-flash');
  const control=card.querySelector('select,button:not(:disabled)');control?.focus({preventScroll:true});
 }));
 // Motion never hides text or delays access to controls.
 if(!reduced&&'IntersectionObserver'in window){
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.animate([{transform:'translateY(13px)'},{transform:'translateY(0)'}],{duration:650,easing:'cubic-bezier(.2,.7,.2,1)'});observer.unobserve(entry.target);}}),{threshold:.12});
  d.querySelectorAll('.med-furniture-card,.med-value-list article,.med-care-grid article').forEach(el=>observer.observe(el));
 }
})();
