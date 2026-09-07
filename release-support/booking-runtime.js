/* Production transmission and accessible feedback. Never retry a POST automatically. */
const BookingTransport = { pending: false, bookingSent: false, largeOrderSent: false };

function showBookingResult({ title, message, detail = '', total = '', success = false }) {
    let dialog = document.getElementById('bookingResult');
    if (!dialog) {
        dialog = document.createElement('dialog');
        dialog.id = 'bookingResult';
        dialog.className = 'demo-result booking-result';
        dialog.setAttribute('aria-labelledby', 'bookingResultTitle');
        dialog.setAttribute('aria-describedby', 'bookingResultMessage');
        dialog.innerHTML = '<div class="result-mark" aria-hidden="true"></div><p class="hero-eyebrow">ECO CLEAN</p><h2 id="bookingResultTitle"></h2><p id="bookingResultMessage"></p><p id="bookingResultDetail"></p><p class="demo-result-total" id="bookingResultTotal"></p><form method="dialog"><button class="btn btn-primary">Vissza az oldalhoz</button></form>';
        document.body.appendChild(dialog);
    }
    dialog.querySelector('.result-mark').textContent = success ? '✓' : '!';
    document.getElementById('bookingResultTitle').textContent = title;
    document.getElementById('bookingResultMessage').textContent = message;
    document.getElementById('bookingResultDetail').textContent = detail;
    document.getElementById('bookingResultTotal').textContent = total;
    if (!dialog.open) dialog.showModal();
}

function bookingFailure(result) {
    const code = String(result?.error || result?.status || '');
    if (['CLUSTER_MISMATCH', 'ZONE_INCOMPATIBLE'].includes(code)) {
        return 'Ezen a napon nem érhető el a kiválasztott régió. Kérjük válasszon másik napot.';
    }
    if (['FULLY_BOOKED', 'DAY_FULL', 'SLOT_CONFLICT', 'SLOT_TAKEN_ON_RECHECK'].includes(code)) {
        return 'Ez az időpont időközben betelt. Kérjük válasszon másik időpontot a frissített naptárból.';
    }
    if (code === 'INVALID_DATE') return 'A kiválasztott dátum nem érvényes. Kérjük válasszon jövőbeli időpontot.';
    return 'A kérés feldolgozása nem sikerült. Kérjük egyeztessen velünk a 06 70 240 8141 telefonszámon.';
}

async function transmitBookingRequest(url, payload, button, kind) {
    if (BookingTransport.pending || BookingTransport[kind + 'Sent']) return false;
    BookingTransport.pending = true;
    const previous = button.innerHTML;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.textContent = 'Küldés…';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        const result = await response.json();
        // The booking workflow may reject a request with HTTP 200.
        // A transport status alone never proves acceptance.
        if (!response.ok || result?.success !== true) {
            showBookingResult({ title: 'A kérés nem sikerült.', message: bookingFailure(result) });
            if (kind === 'booking' && typeof BookingCalendar !== 'undefined') {
                BookingCalendar.resetSelection();
                void BookingCalendar.fetchAvailability();
            }
            return false;
        }
        BookingTransport[kind + 'Sent'] = true;
        if (kind === 'booking') {
            showBookingResult({
                success: true,
                title: 'Foglalási kérelme elküldve.',
                message: 'Köszönjük! Hamarosan felvesszük Önnel a kapcsolatot a megadott elérhetőségeken.',
                detail: `Kért időpont: ${payload.date} · ${payload.slotStartTime}${payload.isFirstSlot ? '' : ' (±30 perc)'}. ${payload.isKarpitBooking ? 'ANDANTE vagy vízre érzékeny szövet esetén kérjük, még a kiszállás előtt egyeztessen: 06 70 240 8141.' : ''}`,
                total: `Kalkulált összeg: ${payload.totalPrice.toLocaleString('hu-HU')} Ft`
            });
            document.getElementById('bookingForm').reset();
            BookingCalendar.resetSelection();
            void BookingCalendar.fetchAvailability();
        } else {
            showBookingResult({
                success: true,
                title: 'Árajánlatkérése elküldve.',
                message: 'Köszönjük! Hamarosan felvesszük Önnel a kapcsolatot az egyedi árajánlattal és az időpont egyeztetésével.',
                total: `Becsült összeg: ${payload.totals.estimatedPrice.toLocaleString('hu-HU')} Ft`
            });
        }
    } catch {
        // A dropped response does not tell us whether the server already processed it.
        showBookingResult({
            title: 'A visszaigazolás nem érkezett meg.',
            message: 'Nem tudtuk ellenőrizni, hogy megérkezett-e a kérés. Újraküldés előtt kérjük egyeztessen velünk: 06 70 240 8141.'
        });
    } finally {
        clearTimeout(timeout);
        BookingTransport.pending = false;
        button.removeAttribute('aria-busy');
        button.disabled = BookingTransport[kind + 'Sent'];
        if (BookingTransport[kind + 'Sent']) button.textContent = 'Kérés elküldve';
        else button.innerHTML = previous;
    }
    return false;
}

function sendBookingRequest(payload) {
    return transmitBookingRequest('https://hub.centaur-lang.dev/webhook/booking-request-hu', payload, document.querySelector('.btn-submit'), 'booking');
}

function sendLargeOrderRequest(payload) {
    return transmitBookingRequest(LARGE_ORDER.webhookUrl, payload, document.querySelector('.large-order-submit'), 'largeOrder');
}
