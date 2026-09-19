/* Existing booking accessibility and summary behavior, extracted from site.js. */
(() => {
  'use strict';
  const bookingRoot=document.getElementById('priceConfigurator');
  const enhanceFields=()=>{
    bookingRoot.querySelectorAll('input[placeholder],textarea[placeholder]').forEach(input=>{
      if(!input.id || input.previousElementSibling?.htmlFor===input.id) return;
      const label=document.createElement('label');label.className='field-label';label.htmlFor=input.id;label.textContent=input.placeholder;
      // Wrap each field to keep labels and inputs together in address grids.
      const wrap=document.createElement('div');wrap.className='labeled-field';input.before(wrap);wrap.append(label,input);
    });
    document.querySelectorAll('.config-item[data-item-id]').forEach(item=>item.classList.toggle('is-selected',(State.selectedItems[item.dataset.itemId]?.count||0)>0));
    document.querySelectorAll('.config-btn').forEach(button=>button.setAttribute('aria-pressed',String(button.classList.contains('active'))));
    document.getElementById('configStatus').textContent='● Online foglalás';
  };
  // Hook calculated-state updates once, so changing services cannot leave stale slots.
  const originalSummary=window.updateSummary;
  window.updateSummary=function(){
    originalSummary();
    const hasItems=Object.values(State.selectedItems).some(item=>item.count>0);
    document.getElementById('bookingFormWrapper').style.display=hasItems&&!State.isLargeOrder?'block':'none';
    document.getElementById('calendarWrapper').style.display=hasItems&&State.city&&!State.isLargeOrder?'block':'none';
    enhanceFields();
  };
  document.getElementById('citySelect').setAttribute('aria-label','Válassz régiót');
  document.getElementById('totalPrice').setAttribute('aria-live','polite');
  document.getElementById('totalPrice').setAttribute('aria-atomic','true');
  const autocomplete={nameInput:'name',emailInput:'email',emailConfirmInput:'off',phoneInput:'tel',streetInput:'street-address',cityInput:'address-level2',plzInput:'postal-code'};
  Object.entries(autocomplete).forEach(([id,value])=>document.getElementById(id).autocomplete=value);
  document.getElementById('plzInput').inputMode='numeric';
  const andante=document.getElementById('andanteModal');
  andante.setAttribute('role','dialog');andante.setAttribute('aria-modal','true');andante.setAttribute('aria-label','ANDANTE bútorok – Fontos tájékoztató');
  let previousFocus;
  const originalOpen=window.openAndanteModal, originalClose=window.closeAndanteModal,originalConfirm=window.confirmAndante;
  window.openAndanteModal=()=>{previousFocus=document.activeElement;originalOpen();andante.querySelector('button').focus();};
  window.closeAndanteModal=event=>{originalClose(event);if(andante.style.display==='none')previousFocus?.focus();};
  window.confirmAndante=()=>{originalConfirm();previousFocus?.focus();};
  document.addEventListener('keydown',event=>{
    if(andante.style.display==='none')return;
    if(event.key==='Escape')window.closeAndanteModal();
    if(event.key==='Tab'){
      const focusable=[...andante.querySelectorAll('button,a[href],input:not([disabled])')];
      const first=focusable[0],last=focusable.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  });
  // Open the primary furniture selector as a initial furniture selection.
  document.addEventListener('DOMContentLoaded',()=>{
    handleServiceType(document.querySelector('#serviceType [data-value="Kárpit"]'));
    enhanceFields();
  });
})();
