/* Győr only. Live reputation from the existing source; no tracking or customer writes. */
(() => {
  'use strict';
  const root = document.querySelector('.eco-gyor-conversion');
  if (!root) return;
  const en = document.documentElement.lang === 'en';
  const endpoint = document.querySelector('[data-reviews-endpoint]')?.dataset.reviewsEndpoint;
  const summary = document.querySelector('[data-gyor-rating]');
  if (endpoint && summary) {
    Promise.resolve().then(() => fetch(endpoint, typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? {signal: AbortSignal.timeout(8000)} : {}))
      .then(response => { if (!response.ok) throw Error('Reviews unavailable'); return response.json(); })
      .then(data => {
        const uri = new URL(data.googleMapsUri);
        if (uri.protocol !== 'https:' || uri.hostname !== 'maps.google.com' || uri.searchParams.get('cid') !== '10581696163890001047') return;
        if (typeof data.rating !== 'number' || data.rating < 1 || data.rating > 5 || !Number.isInteger(data.total) || data.total < 1) return;
        summary.textContent = data.rating.toFixed(1).replace('.', en ? '.' : ',') + ' / 5 · ' + new Intl.NumberFormat(en ? 'en' : 'hu').format(data.total) + (en ? ' Google reviews' : ' Google-vélemény');
      })
      .catch(() => {}); // The static, accessible Google link remains usable.
  }
  const bar = document.querySelector('.gyor-mobile-booking');
  const calculator = document.getElementById('studio-kalkulator');
  if (bar && calculator && 'IntersectionObserver' in window) {
    let inCalculator = false;
    const menu = document.querySelector('.nav-mobile,.bixol-mobile-menu');
    const update = () => { bar.hidden = inCalculator || !!menu?.classList.contains('active'); };
    new IntersectionObserver(entries => { inCalculator = entries[0].isIntersecting; update(); }).observe(calculator);
    if (menu) new MutationObserver(update).observe(menu, {attributes: true, attributeFilter: ['class']});
  }
})();
