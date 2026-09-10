/* Mobile cart uses the booking's existing summary and calculated state. */
(function () {
    'use strict';

    function initBookingCart() {
        const summary = document.getElementById('priceSummary');
        if (!summary || document.getElementById('bookingCartTab') || typeof window.updateSummary !== 'function') return;
        const drawer = document.createElement('dialog');
        if (typeof drawer.showModal !== 'function') return;
        const mobile = window.matchMedia('(max-width: 768px)');
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        const home = document.createComment('Booking summary desktop position');
        summary.before(home);

        const tab = document.createElement('button');
        tab.type = 'button';
        tab.id = 'bookingCartTab';
        tab.className = 'booking-cart-tab';
        tab.hidden = true;
        tab.setAttribute('aria-controls', 'bookingCartDrawer');
        tab.setAttribute('aria-haspopup', 'dialog');
        tab.setAttribute('aria-expanded', 'false');
        tab.innerHTML = '<svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3h2l2.5 12h11l2-8H6"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg><span class="booking-cart-badge" aria-hidden="true">0</span>';

        drawer.id = 'bookingCartDrawer';
        drawer.className = 'booking-cart-drawer';
        drawer.setAttribute('aria-labelledby', 'bookingCartTitle');
        drawer.innerHTML = '<header class="booking-cart-header"><div><p class="booking-cart-eyebrow">ECO CLEAN</p><h2 id="bookingCartTitle">Kosár</h2><p id="bookingCartQuantity">Még üres a kosarad</p></div><button type="button" class="booking-cart-close" aria-label="Kosár bezárása"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header><div class="booking-cart-content"></div><p class="booking-cart-hint">A kosár bezárása után folytathatod az összeállítást és az időpontfoglalást.</p>';
        const status = document.createElement('div');
        status.className = 'booking-cart-status';
        status.setAttribute('role', 'status');
        status.setAttribute('aria-atomic', 'true');
        document.body.append(tab, drawer, status);

        const content = drawer.querySelector('.booking-cart-content');
        const closeButton = drawer.querySelector('.booking-cart-close');
        const badge = tab.querySelector('.booking-cart-badge');
        const quantity = drawer.querySelector('#bookingCartQuantity');
        let closeTimer, pulseTimer, lastCount = 0, lastPrice = 0, scrollLock;

        function hasItems() {
            return Object.values(State.selectedItems).some(item => item.count > 0);
        }

        function syncTabVisibility() {
            tab.hidden = !mobile.matches || drawer.open || !hasItems();
        }

        function lockScroll() {
            const body = document.body;
            const properties = ['position', 'top', 'left', 'right', 'width', 'overflow'];
            scrollLock = { y: window.scrollY, x: window.scrollX, styles: properties.map(key => [key, body.style[key]]) };
            Object.assign(body.style, { position: 'fixed', top: `-${scrollLock.y}px`, left: '0', right: '0', width: '100%', overflow: 'hidden' });
        }

        function unlockScroll() {
            if (!scrollLock) return;
            const previous = scrollLock;
            scrollLock = null;
            previous.styles.forEach(([key, value]) => { document.body.style[key] = value; });
            window.scrollTo({ top: previous.y, left: previous.x, behavior: 'instant' });
        }

        function finishClose() {
            clearTimeout(closeTimer);
            if (drawer.open) drawer.close();
            delete drawer.dataset.closing;
            syncTabVisibility();
            tab.setAttribute('aria-expanded', 'false');
            unlockScroll();
            if (!tab.hidden) tab.focus({ preventScroll: true });
        }

        function closeCart() {
            if (!drawer.open || drawer.dataset.closing) return;
            if (reducedMotion.matches) { finishClose(); return; }
            drawer.dataset.closing = 'true';
            closeTimer = setTimeout(finishClose, 260);
        }

        tab.addEventListener('click', () => {
            if (!mobile.matches || drawer.open || !hasItems()) return;
            drawer.showModal();
            tab.hidden = true;
            tab.setAttribute('aria-expanded', 'true');
            lockScroll();
            closeButton.focus({ preventScroll: true });
        });
        closeButton.addEventListener('click', closeCart);
        drawer.addEventListener('cancel', event => { event.preventDefault(); closeCart(); });
        drawer.addEventListener('click', event => {
            if (event.target !== drawer) return;
            const rect = drawer.getBoundingClientRect();
            if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeCart();
        });
        drawer.addEventListener('close', () => {
            syncTabVisibility();
            tab.setAttribute('aria-expanded', 'false');
            unlockScroll();
        });

        function syncLayout() {
            if (!mobile.matches && drawer.open) finishClose();
            if (mobile.matches) content.append(summary);
            else home.after(summary);
            syncTabVisibility();
        }

        function syncCart() {
            const count = Object.values(State.selectedItems).reduce((total, item) => total + Math.max(0, Number(item.count) || 0), 0);
            if (count === 0 && drawer.open) finishClose();
            syncTabVisibility();
            const price = State.totalPrice;
            const money = `${price.toLocaleString('hu-HU')} Ft`;
            badge.textContent = String(count);
            tab.setAttribute('aria-label', `Kosár megnyitása: ${count} bútor, ${money}`);
            quantity.textContent = count ? `${count} bútor az összeállításodban` : 'Még üres a kosarad';
            if (count !== lastCount || price !== lastPrice) status.textContent = `Kosár frissítve: ${count} bútor, ${money}.`;
            if (count > lastCount) {
                clearTimeout(pulseTimer);
                tab.classList.remove('is-updated');
                void tab.offsetWidth;
                tab.classList.add('is-updated');
                pulseTimer = setTimeout(() => tab.classList.remove('is-updated'), 420);
            }
            lastCount = count;
            lastPrice = price;
        }

        const updateBookingSummary = window.updateSummary;
        window.updateSummary = function (...args) {
            const result = updateBookingSummary.apply(this, args);
            syncCart();
            return result;
        };
        mobile.addEventListener('change', syncLayout);
        syncLayout();
        syncCart();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initBookingCart, { once: true });
    else initBookingCart();
})();
