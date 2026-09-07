/* Guarded, shared interactions. No booking requests, credentials or customer data. */
(() => {
  'use strict';
  const d=document,root=d.documentElement;
  root.dataset.theme='light';
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const motion=reduced?'auto':'smooth';
  const onKey=(el,fn)=>el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fn(e);}});
  const buttonize=el=>{if(!el.matches('button,a,input')){el.setAttribute('role','button');el.tabIndex=0;}};
  const focusable=box=>[...box.querySelectorAll('a[href],button,[tabindex="0"],input,select')].filter(el=>!el.disabled&&!el.closest('[hidden]')&&el.getClientRects().length>0);
  function trap(e,box){if(e.key!=='Tab')return;const list=focusable(box),first=list[0],last=list.at(-1);if(!first)return;if(e.shiftKey&&d.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&d.activeElement===last){e.preventDefault();first.focus();}}

  if(d.body.classList.contains('eco-modern')) {
    d.querySelectorAll('.desktop-menu .has-submenu').forEach(item=>{
      const link=item.querySelector(':scope > a');if(!link)return;
      link.setAttribute('aria-expanded','false');
      link.addEventListener('click',e=>{e.preventDefault();const opened=!item.classList.contains('open');d.querySelectorAll('.desktop-menu .has-submenu.open').forEach(x=>{x.classList.remove('open');x.querySelector('a').setAttribute('aria-expanded','false');});item.classList.toggle('open',opened);link.setAttribute('aria-expanded',String(opened));});
    });
    d.addEventListener('click',e=>{if(!e.target.closest('.desktop-menu'))d.querySelectorAll('.desktop-menu .has-submenu.open').forEach(x=>{x.classList.remove('open');x.querySelector('a').setAttribute('aria-expanded','false');});});
  }

  const classicMenu=d.querySelector('.nav-mobile'),classicToggle=d.querySelector('.nav-mobile-toggle'),classicOverlay=d.querySelector('.mobile-menu-overlay');
  const regionMenu=d.querySelector('.bixol-mobile-menu'),regionToggle=d.querySelector('.bixol-mobile-hamburger');
  const menu=classicMenu||regionMenu,toggle=classicToggle||regionToggle;
  if(menu&&toggle){
    let overlay=classicOverlay;
    if(!overlay){overlay=d.createElement('div');overlay.className='regional-menu-overlay';overlay.hidden=true;d.body.append(overlay);}
    menu.id||='regionalMobileMenu';toggle.setAttribute('aria-controls',menu.id);toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Menü megnyitása');buttonize(toggle);
    let closeButton=menu.querySelector('.regional-menu-close');
    if(regionMenu){closeButton=d.createElement('button');closeButton.className='regional-menu-close';closeButton.type='button';closeButton.textContent='×';closeButton.setAttribute('aria-label','Menü bezárása');menu.prepend(closeButton);}
    const setOpen=open=>{menu.classList.toggle('active',open);toggle.classList.toggle('active',open);overlay.classList.toggle('active',open);if(regionMenu)overlay.hidden=!open;toggle.setAttribute('aria-expanded',String(open));menu.inert=!open;d.body.style.overflow=open?'hidden':'';if(open)(closeButton||focusable(menu)[0])?.focus();else toggle.focus();};
    menu.inert=true;
    toggle.addEventListener('click',()=>setOpen(!menu.classList.contains('active')));
    if(!toggle.matches('button,a'))onKey(toggle,()=>toggle.click());
    overlay.addEventListener('click',()=>setOpen(false));closeButton?.addEventListener('click',()=>setOpen(false));
    menu.querySelectorAll('.nav-mobile-item,.has-submenu').forEach(item=>{
      const link=item.querySelector(':scope > .nav-mobile-link,:scope > a');if(!link)return;
      link.setAttribute('aria-expanded','false');
      link.addEventListener('click',e=>{e.preventDefault();const open=!item.classList.contains('open');menu.querySelectorAll('.open').forEach(x=>{x.classList.remove('open');x.querySelector('a')?.setAttribute('aria-expanded','false');});item.classList.toggle('open',open);link.setAttribute('aria-expanded',String(open));});
    });
    menu.querySelectorAll('a[href]').forEach(a=>a.addEventListener('click',()=>{if(a.getAttribute('href')!=='#')setOpen(false);}));
    d.addEventListener('keydown',e=>{if(menu.classList.contains('active')){if(e.key==='Escape')setOpen(false);else trap(e,menu);}if(e.key==='Escape')d.querySelectorAll('.desktop-menu .open').forEach(x=>{x.classList.remove('open');x.querySelector('a')?.setAttribute('aria-expanded','false');});});
    window.addEventListener('resize',()=>{if(window.innerWidth>(classicMenu?1050:1050)&&menu.classList.contains('active'))setOpen(false);});
  }
  const mega=d.getElementById('megaMenuContainer');
  if(mega){
    let origin=null,lastOpen=false;
    const sync=()=>{
      const open=mega.classList.contains('active');mega.inert=!open;
      d.querySelectorAll('.nav-item').forEach(item=>{const link=item.querySelector('.nav-link');link?.setAttribute('aria-expanded',String(item.classList.contains('active')));link?.setAttribute('aria-controls',mega.id);});
      if(open&&!lastOpen){origin=d.activeElement;requestAnimationFrame(()=>mega.querySelector('a,button')?.focus());}
      if(!open&&lastOpen)origin?.focus();lastOpen=open;
    };
    mega.setAttribute('role','dialog');mega.setAttribute('aria-label','Szolgáltatás és város kiválasztása');
    new MutationObserver(sync).observe(mega,{attributes:true,attributeFilter:['class']});sync();
    mega.addEventListener('keydown',e=>trap(e,mega));
  }

  d.querySelectorAll('.faq-item').forEach((item,i)=>{
    const q=item.querySelector('.faq-question'),answer=item.querySelector('.faq-answer');if(!q||!answer)return;
    buttonize(q);answer.id||='eco-faq-answer-'+i;q.setAttribute('aria-controls',answer.id);q.setAttribute('aria-expanded','false');
    const set=(target,open)=>{target.classList.toggle('active',open);target.classList.toggle('faq-active',open);target.querySelector('.faq-question').setAttribute('aria-expanded',String(open));};
    q.addEventListener('click',()=>{const open=!item.classList.contains('active');d.querySelectorAll('.faq-item.active').forEach(x=>{if(x.querySelector('.faq-answer'))set(x,false);});set(item,open);});
    if(!q.matches('button,a'))onKey(q,()=>q.click());
  });
  // Keep the source's genuine comparison photos and pointer logic; add keyboard parity.
  function enhanceSliders(){
    d.querySelectorAll('.ba-slider-wrapper,.mc-ba').forEach(box=>{
      if(box.dataset.keyboardReady)return;box.dataset.keyboardReady='true';
      const before=box.querySelector('.ba-img-before,.mc-ba__before'),handle=box.querySelector('.ba-slider-handle,.mc-ba__handle'),knob=box.querySelector('.ba-slider-knob,.mc-ba__knob');
      if(!before||!handle)return;
      const control=knob||box;control.tabIndex=0;control.setAttribute('role','slider');control.setAttribute('aria-label','Előtte és utána képek aránya');control.setAttribute('aria-valuemin','0');control.setAttribute('aria-valuemax','100');
      const current=()=>{const n=parseFloat(handle.style.left);return Number.isFinite(n)?Math.round(n):50;};
      const sync=()=>control.setAttribute('aria-valuenow',String(current()));sync();
      new MutationObserver(sync).observe(handle,{attributes:true,attributeFilter:['style']});
      control.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const p=e.key==='Home'?0:e.key==='End'?100:Math.max(0,Math.min(100,current()+(e.key==='ArrowRight'?5:-5)));before.style.clipPath=`inset(0 ${100-p}% 0 0)`;handle.style.left=p+'%';if(knob)knob.style.left=p+'%';control.setAttribute('aria-valuenow',String(p));});
    });
  }
  enhanceSliders();
  d.querySelectorAll('.before-after-slider input[type="range"]').forEach(slider=>{
    const box=slider.parentElement,after=box.querySelector('.after-image'),arrows=box.querySelector('.slider-arrows');if(!after)return;
    slider.setAttribute('aria-label','Előtte és utána képek aránya');
    const sync=()=>{const n=Math.max(0,Math.min(100,Number(slider.value)));after.style.clipPath=`inset(0 ${100-n}% 0 0)`;box.style.setProperty('--slider-position',n+'%');if(arrows)arrows.style.left=n+'%';};
    slider.addEventListener('input',sync);sync();
  });
  d.querySelectorAll('.trust-number[data-target]').forEach(counter=>{
    const target=Number(counter.dataset.target);if(Number.isFinite(target)&&counter.textContent.trim()==='0')counter.textContent=target+'+';
  });
  const comparison=d.getElementById('comparisonGrid');if(comparison)new MutationObserver(enhanceSliders).observe(comparison,{childList:true,subtree:true});

  const reviews=d.querySelector('.google-reviews-slider');
  if(reviews&&reviews.children.length>1){
    reviews.tabIndex=0;reviews.setAttribute('aria-label','Ügyfélvélemények, vízszintesen lapozható');
    const controls=d.createElement('div');controls.className='review-controls';
    for(const [direction,label,icon] of [[-1,'Előző vélemény','←'],[1,'Következő vélemény','→']]){
      const button=d.createElement('button');button.type='button';button.setAttribute('aria-label',label);button.textContent=icon;
      button.addEventListener('click',()=>reviews.scrollBy({left:direction*(reviews.firstElementChild.getBoundingClientRect().width+18),behavior:motion}));controls.append(button);
    }
    reviews.after(controls);
  }
  // Existing gallery and microscopy modals own their image loading and close actions.
  d.querySelectorAll('#lightbox,.matrac-why__modal').forEach(modal=>{
    let wasOpen=false,returnFocus=null;modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Kép nagyítása');
    new MutationObserver(()=>{const open=modal.classList.contains('open');if(open&&!wasOpen){returnFocus=d.activeElement;modal.querySelector('button,[tabindex]')?.focus();}if(!open&&wasOpen)returnFocus?.focus();wasOpen=open;}).observe(modal,{attributes:true,attributeFilter:['class']});
    modal.addEventListener('keydown',e=>trap(e,modal));
  });
  d.querySelectorAll('img[data-src]').forEach(img=>{img.src=img.dataset.src;img.removeAttribute('data-src');});
  if(!d.querySelector('#nav'))d.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const id=a.getAttribute('href').slice(1);if(!id)return;const target=d.getElementById(decodeURIComponent(id));if(target){e.preventDefault();target.scrollIntoView({behavior:motion});}}));
})();
