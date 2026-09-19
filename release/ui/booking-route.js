/* Preserve existing incoming booking URLs; destinations are fixed and same-origin. */
(() => {const route=()=>{if(/^#booking(?:\?|$)/.test(location.hash))location.replace((document.documentElement.lang==='en'?'booking.html':'megrendeles.html')+location.search+location.hash);};route();addEventListener('hashchange',route);})();
