/* Gallery, accessibility, source-photo comparison, and live booking enhancements. */
(() => {
  'use strict';
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const interiors=[
    ['living-room','Kanapé','Zsályazöld kanapé egy világos, modern nappaliban','58% center'],
    ['sofa','Szófa','Púderrózsaszín szófa egy gondosan berendezett nappaliban','center center'],
    ['armchair','Fotel','Világos fotel egy természetes fényű olvasósarokban','center 70%'],
    ['dining','Ebédlő székek','Púderszínű ebédlőszékek tölgyfa asztal körül','center center'],
    ['office','Irodai szék','Világos irodai szék egy elegáns dolgozósarokban','35% center']
  ];
  const picture=document.getElementById('interiorImage');
  const buttons=[...document.querySelectorAll('.interior-tab')];
  let selected=0, request=0;
  const chooseInterior=async(index) => {
    const currentRequest=++request;
    const [file,title,alt,position]=interiors[index];
    const next=new Image(); next.src=`assets/${file}.webp`;
    try { await next.decode(); } catch { return; }
    if(currentRequest!==request) return;
    const change=()=>{
      picture.src=next.src; picture.alt=`Generált enteriőrkép: ${alt}`;
      picture.style.objectPosition=position;
      document.getElementById('interiorCaption').textContent=title;
      document.getElementById('interiorNumber').textContent=String(index+1).padStart(2,'0');
      buttons.forEach((button,i)=>{button.classList.toggle('active',i===index);button.setAttribute('aria-pressed',String(i===index));});
      selected=index;
    };
    if(reducedMotion.matches) change();
    else { await picture.animate([{opacity:1},{opacity:.25}],{duration:150,fill:'forwards'}).finished; if(currentRequest!==request) {picture.getAnimations().forEach(a=>a.cancel());return;} change(); picture.getAnimations().forEach(a=>a.cancel()); picture.animate([{opacity:.25},{opacity:1}],{duration:330}); }
  };
  buttons.forEach((button,i)=>button.addEventListener('click',()=>chooseInterior(i)));
  document.querySelector('.interior-controls').addEventListener('keydown',event=>{
    const current=buttons.indexOf(document.activeElement);
    if(current<0) return;
    let next=current;
    if(event.key==='ArrowRight') next=(current+1)%buttons.length;
    else if(event.key==='ArrowLeft') next=(current+buttons.length-1)%buttons.length;
    else if(event.key==='Home') next=0;
    else if(event.key==='End') next=buttons.length-1;
    else return;
    event.preventDefault(); buttons[next].focus(); chooseInterior(next);
  });
  const visual=document.querySelector('.hero-visual');
  if(matchMedia('(pointer:fine)').matches) {
    visual.addEventListener('pointermove',event=>{
      if(reducedMotion.matches) return;
      const rect=visual.getBoundingClientRect();
      picture.style.setProperty('--photo-x',`${((event.clientX-rect.left)/rect.width-.5)*-9}px`);
      picture.style.setProperty('--photo-y',`${((event.clientY-rect.top)/rect.height-.5)*-7}px`);
    },{passive:true});
    visual.addEventListener('pointerleave',()=>{picture.style.setProperty('--photo-x','0px');picture.style.setProperty('--photo-y','0px');});
  }

  // Reveal only lower content, leaving all content visible without JavaScript.
  if(!reducedMotion.matches && 'IntersectionObserver' in window) {
    const reveal=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting) {entry.target.classList.remove('is-pending');reveal.unobserve(entry.target);}
    }),{threshold:.05,rootMargin:'0px 0px 30px 0px'});
    document.querySelectorAll('.section-header,.services-grid,.steps-grid,.ba-promo-grid,.atkairtas-layout,.booking-header,.price-configurator').forEach(el=>{
      if(el.getBoundingClientRect().top>innerHeight) {el.classList.add('reveal','is-pending');reveal.observe(el);}
    });
  }

  const navPanel=document.getElementById('megaMenuContainer');
  const mobilePanel=document.querySelector('.nav-mobile');
  const menuButtons=[...document.querySelectorAll('.nav-item[data-menu]')];
  menuButtons.forEach(item=>{
    const trigger=item.querySelector('.nav-link');
    trigger.setAttribute('role','button'); trigger.tabIndex=0; trigger.setAttribute('aria-controls','megaMenuContainer');trigger.setAttribute('aria-expanded','false');
    trigger.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();item.click();}});
  });
  navPanel.setAttribute('aria-label','Szolgáltatások és települések');
  const syncMenu=()=>{
    navPanel.inert=!navPanel.classList.contains('active');
    menuButtons.forEach(item=>item.querySelector('.nav-link').setAttribute('aria-expanded',String(item.classList.contains('active'))));
  };
  new MutationObserver(syncMenu).observe(navPanel,{attributes:true,attributeFilter:['class']}); syncMenu();
  document.querySelectorAll('.nav-mobile-link').forEach(trigger=>{
    trigger.setAttribute('role','button');trigger.tabIndex=0;trigger.setAttribute('aria-expanded','false');
    trigger.addEventListener('keydown',event=>{if(event.key===' '||event.key==='Enter'){event.preventDefault();trigger.click();}});
    const sync=()=>{const isOpen=trigger.parentElement.classList.contains('open');trigger.setAttribute('aria-expanded',String(isOpen));trigger.nextElementSibling.inert=!isOpen;};
    new MutationObserver(sync).observe(trigger.parentElement,{attributes:true,attributeFilter:['class']}); sync();
  });
  const mobileButton=document.querySelector('.nav-mobile-toggle');
  mobilePanel.id='mobileNavigation';mobilePanel.setAttribute('aria-label','Mobil navigáció');
  mobileButton.setAttribute('aria-label','Menü megnyitása'); mobileButton.setAttribute('aria-controls','mobileNavigation');
  const syncMobile=()=>{
    const opened=mobilePanel.classList.contains('active'); mobilePanel.inert=!opened;
    mobileButton.setAttribute('aria-expanded',String(opened));mobileButton.setAttribute('aria-label',opened?'Menü bezárása':'Menü megnyitása');
  };
  new MutationObserver(syncMobile).observe(mobilePanel,{attributes:true,attributeFilter:['class']}); syncMobile();
  const closeMobile=()=>{
    mobilePanel.classList.remove('active');mobileButton.classList.remove('active');document.querySelector('.mobile-menu-overlay').classList.remove('active');document.body.style.overflow='';
  };
  mobilePanel.querySelectorAll('a').forEach(link=>link.addEventListener('click',closeMobile));
  addEventListener('resize',()=>{if(innerWidth>1050)closeMobile();});
  document.querySelectorAll('.card-service,.services-grid .service-card').forEach(link=>link.addEventListener('click',event=>{
    const text=link.textContent;
    if(/Matrac|Mattress|Kárpit|Upholstery/i.test(text)) return; // Native city-discovery anchor works on mobile and in both languages.
    else if(/szőnyeg/i.test(text)) {event.preventDefault();event.stopImmediatePropagation();openMegaMenu('szonyegtisztítás');}
    else if(/takarítás/i.test(text)) {event.preventDefault();event.stopImmediatePropagation();openMegaMenu('takaritas');}
    else if(/Ablak/i.test(text)) {event.preventDefault();event.stopImmediatePropagation();openMegaMenu('ablaktisztítás');}
  },true));

  // Source before/after photographs remain intact. Pointer and keyboard controls.
  document.querySelectorAll('.ba-slider-wrapper').forEach(wrapper=>{
    let position=50;
    const knob=wrapper.querySelector('.ba-slider-knob');
    knob.tabIndex=0;knob.setAttribute('role','slider');knob.setAttribute('aria-label','Előtte és utána képek összehasonlítása');knob.setAttribute('aria-valuemin','0');knob.setAttribute('aria-valuemax','100');
    const set=value=>{
      position=Math.max(0,Math.min(100,value));
      wrapper.querySelector('.ba-img-before').style.clipPath=`inset(0 ${100-position}% 0 0)`;
      wrapper.querySelector('.ba-slider-handle').style.left=`${position}%`;
      knob.style.left=`${position}%`;knob.setAttribute('aria-valuenow',String(Math.round(position)));
      knob.setAttribute('aria-valuetext',`Előtte kép: ${Math.round(position)} százalék`);
    };
    const drag=event=>{const rect=wrapper.getBoundingClientRect();set((event.clientX-rect.left)/rect.width*100);};
    wrapper.addEventListener('pointerdown',event=>{if(event.button!==0)return;wrapper.setPointerCapture(event.pointerId);drag(event);});
    wrapper.addEventListener('pointermove',event=>{if(wrapper.hasPointerCapture(event.pointerId))drag(event);});
    wrapper.addEventListener('pointerup',event=>{if(wrapper.hasPointerCapture(event.pointerId))wrapper.releasePointerCapture(event.pointerId);});
    wrapper.addEventListener('dragstart',event=>event.preventDefault());
    knob.addEventListener('keydown',event=>{
      const values={ArrowLeft:position-5,ArrowRight:position+5,Home:0,End:100};
      if(event.key in values){event.preventDefault();set(values[event.key]);}
    }); set(50);
  });

})();
