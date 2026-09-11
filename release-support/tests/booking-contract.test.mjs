import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const original = fs.readFileSync(new URL('../../booking-config.js', import.meta.url), 'utf8').replace(/^\uFEFF/, '');
const live = fs.readFileSync(new URL('../../release/ui/booking-live.js', import.meta.url), 'utf8');
const calendar = fs.readFileSync(new URL('../calendar-live.js', import.meta.url), 'utf8');
const clone = value => JSON.parse(JSON.stringify(value));
const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
const date = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
const firstSlot = { startMinutes: 540, startTime: '09:00', endTime: '11:00', maxDuration: 120, status: 'available', fitsRequested: true, isFirstSlot: true };
const laterSlot = { ...firstSlot, startMinutes: 720, startTime: '12:00', endTime: '15:00', maxDuration: 180, isFirstSlot: false };
const availability = () => ({ success: true, days: [{ date, status: 'limited', slots: [{ ...firstSlot }, { ...laterSlot }] }] });
const response = (body = { success: true }, ok = true) => ({ ok, json: async () => body });

function harness({ source = live, withCalendar = true, fetch: handler = async () => response() } = {}) {
    const elements = new Map(), selectors = new Map(), alerts = [], requests = [], logs = [];
    let document;
    class Element {
        constructor(id = '') { this.id = id; this.value = ''; this.style = {}; this.dataset = {}; this.disabled = false; this.checked = false; this.attributes = {}; this.classList = { add() {}, remove() {}, toggle() {}, contains() { return false; } }; this._html = ''; this.textContent = ''; }
        set innerHTML(value) { this._html = value; for (const [, id] of value.matchAll(/id="([^"]+)"/g)) if (!elements.has(id)) elements.set(id, new Element(id)); }
        get innerHTML() { return this._html; }
        querySelector(selector) { return elementForSelector(selector); }
        querySelectorAll() { return []; }
        setAttribute(key, value) { this.attributes[key] = value; }
        removeAttribute(key) { delete this.attributes[key]; }
        appendChild(child) { if (child.id) elements.set(child.id, child); }
        contains() { return false; }
        addEventListener() {}
        dispatchEvent(event) { this.lastEvent = event; }
        focus() { document.activeElement = this; }
        scrollIntoView() {}
        select() {}
        showModal() { this.open = true; }
        reset() { this.wasReset = true; }
    }
    function elementForSelector(selector) { if (!selectors.has(selector)) selectors.set(selector, new Element()); return selectors.get(selector); }
    document = { activeElement: null, body: new Element(), addEventListener() {}, querySelector: elementForSelector, querySelectorAll: () => [], getElementById(id) { if (id === 'bookingResult' && !elements.has(id)) return null; if (!elements.has(id)) elements.set(id, new Element(id)); return elements.get(id); }, createElement: () => new Element() };
    const context = vm.createContext({ document, console: { log: (...v) => logs.push(v), error: (...v) => logs.push(v) }, alert: message => alerts.push(message), AbortController, setTimeout, clearTimeout, Date, Intl, CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } }, fetch: async (...args) => { requests.push(args); return handler(...args); } });
    context.window = context;
    context.scrollTo = () => {};
    if (withCalendar) { vm.runInContext(calendar, context); vm.runInContext("BookingCalendar.init('bookingCalendar')", context); }
    vm.runInContext(source, context);
    return { context, elements, document, requests, alerts, logs, run: script => vm.runInContext(script, context), json: script => clone(vm.runInContext(script, context)) };
}

function configureBooking(h, overrides = {}) {
    h.run(`Object.assign(State, ${JSON.stringify({ serviceType: 'Kárpit', city: 'gyor', travelZone: 'belvaros', selectedItems: { karpit_szofa: { count: 1, category: 'karpit', upsells: ['atkairtas', 'agyazhato'] } }, totalPrice: 29000, totalDuration: 75, discount: 0, ...overrides })});
        BookingCalendar.state.selectedCity = State.city;
        BookingCalendar.state.requiredDuration = State.totalDuration;
        BookingCalendar.state.availabilityData = ${JSON.stringify(availability())};
        BookingCalendar.selectDate('${date}'); BookingCalendar.selectSlot(540);`);
    const values = { nameInput: 'Offline Test', emailInput: 'offline@example.invalid', emailConfirmInput: 'offline@example.invalid', phoneInput: '+36 30 123 4567', streetInput: 'Offline utca 1.', cityInput: 'Győr', plzInput: '9021', messageInput: 'Offline contract fixture' };
    for (const [id, value] of Object.entries(values)) h.document.getElementById(id).value = value;
    h.document.getElementById('andanteCheckbox').checked = true;
}

test('all original pricing constants, extras, travel zones and discounts are unchanged', () => {
    const before = harness({ source: original, withCalendar: false });
    const after = harness();
    for (const name of ['PRICING', 'UPSELLS', 'DISCOUNTS']) assert.deepEqual(after.json(name), before.json(name));
    assert.equal(after.run('LARGE_ORDER.threshold'), 480);
});

test('price and duration parity across every item, quantity, zone and combined extra configuration', () => {
    const before = harness({ source: original, withCalendar: false });
    const after = harness({ withCalendar: false });
    const pricing = before.json('PRICING');
    const scenarios = [];
    for (const category of ['karpit', 'matrac']) for (const id of Object.keys(pricing[category])) for (const count of [1, 3]) for (const zone of Object.keys(pricing.travelZones)) {
        scenarios.push({ selectedItems: { [`${category}_${id}`]: { count, category, upsells: ['atkairtas', 'agyazhato'] } }, globalUpsells: {}, travelZone: zone });
    }
    scenarios.push({ selectedItems: { karpit_szofa: { count: 2, category: 'karpit', upsells: ['atkairtas', 'agyazhato'] }, matrac_francia_ab: { count: 1, category: 'matrac', upsells: [] } }, globalUpsells: { karpit_folteltavolitas: { category: 'karpit', upsellId: 'folteltavolitas' }, karpit_impregnalas: { category: 'karpit', upsellId: 'impregnalas' }, karpit_szagtalanitas: { category: 'karpit', upsellId: 'szagtalanitas' }, matrac_nedves_tisztitas: { category: 'matrac', upsellId: 'nedves_tisztitas' }, matrac_agykeret: { category: 'matrac', upsellId: 'agykeret' } }, travelZone: '40km' });
    for (const scenario of scenarios) {
        for (const h of [before, after]) h.run(`Object.assign(State, ${JSON.stringify(scenario)}); updateSummary();`);
        assert.deepEqual(after.json('[State.totalPrice, State.totalDuration, State.discount, State.isLargeOrder]'), before.json('[State.totalPrice, State.totalDuration, State.discount, State.isLargeOrder]'));
    }
    assert.equal(scenarios.length, 113);
});

test('availability preserves endpoint, four-field payload and dynamic server slots', async () => {
    const h = harness({ fetch: async () => response(availability()) });
    await h.run("BookingCalendar.setRequiredDuration(75); BookingCalendar.setCity('gyor')");
    assert.equal(h.requests.length, 1);
    const [url, request] = h.requests[0];
    assert.equal(url, 'https://hub.centaur-lang.dev/webhook/check-availability');
    assert.equal(request.method, 'POST');
    const body = JSON.parse(request.body);
    assert.deepEqual(Object.keys(body).sort(), ['city', 'endDate', 'requiredDuration', 'startDate']);
    assert.equal(body.city, 'gyor'); assert.equal(body.requiredDuration, 75); assert.equal(body.startDate, date);
    h.run(`BookingCalendar.selectDate('${date}'); BookingCalendar.selectSlot(720)`);
    assert.equal(h.run('BookingCalendar.isValid()'), false);
    h.run('BookingCalendar.toggleFlexibility(); BookingCalendar.confirmSlot()');
    assert.equal(h.run('BookingCalendar.isValid()'), true);
    assert.equal(h.run('BookingCalendar.getSelectedSlot().startTime'), '12:00');
    assert.equal(h.run('BookingCalendar.state.view'), 'confirmed');
    assert.equal(h.document.getElementById('bookingCalendar').lastEvent.detail.flexibilityAccepted, true);
});

test('region changes and clearing selection invalidate old dates; stale response cannot win', async () => {
    const pending = [];
    const h = harness({ fetch: () => new Promise(resolve => pending.push(resolve)) });
    h.run('BookingCalendar.state.requiredDuration = 40');
    const old = h.run("BookingCalendar.setCity('gyor')");
    const newest = h.run("BookingCalendar.setCity('sopron')");
    pending[1](response({ success: true, days: [] })); await newest;
    pending[0](response(availability())); await old;
    assert.equal(h.run('BookingCalendar.state.selectedCity'), 'sopron');
    assert.equal(h.run('BookingCalendar.state.availabilityData.days.length'), 0);
    h.run("State.city = 'sopron'; handleCityChange({ value: '' })");
    assert.equal(h.run('BookingCalendar.state.selectedCity'), null);
    assert.equal(h.run('BookingCalendar.state.availabilityData'), null);
    assert.equal(h.document.getElementById('calendarWrapper').style.display, 'none');
});

test('changing duration clears selected slots; identical duration does not refetch or erase selection', async () => {
    const h = harness({ fetch: async () => response(availability()) }); configureBooking(h);
    h.run('BookingCalendar.setRequiredDuration(75)');
    assert.equal(h.requests.length, 0); assert.equal(h.run('BookingCalendar.isValid()'), true);
    await h.run('BookingCalendar.setRequiredDuration(90)');
    assert.equal(h.requests.length, 1); assert.equal(h.run('BookingCalendar.getSelectedSlot()'), null);
    assert.equal(JSON.parse(h.requests[0][1].body).requiredDuration, 90);
});

test('unavailable and malformed calendar responses fail closed with a retry state', async () => {
    for (const body of [{ success: false }, { days: [{ date, status: 'free', slots: [{ startTime: '<img src=x onerror=alert(1)>' }] }] }]) {
        const h = harness({ fetch: async () => response(body) });
        await h.run("BookingCalendar.setRequiredDuration(40); BookingCalendar.setCity('gyor')");
        assert.equal(h.run('BookingCalendar.state.availabilityData'), null);
        assert.equal(h.run('BookingCalendar.isValid()'), false);
        assert.match(h.document.getElementById('bookingCalendar').innerHTML, /Újrapróbálás/);
        assert.doesNotMatch(h.document.getElementById('bookingCalendar').innerHTML, /onerror/);
    }
});

test('normal submission preserves original payload and locks duplicates after acknowledged success', async () => {
    const h = harness({ fetch: async url => response(url.endsWith('check-availability') ? availability() : { success: true }) }); configureBooking(h);
    await h.run('submitBooking({ preventDefault() {} })');
    const writes = h.requests.filter(([url]) => url.endsWith('booking-request-hu'));
    assert.equal(writes.length, 1);
    const payload = JSON.parse(writes[0][1].body);
    assert.deepEqual(Object.keys(payload).sort(), ['customerType','name','email','phone','message','location','items','upsells','conditions','travelZone','city','totalPrice','totalDuration','discount','serviceType','andanteAccepted','isKarpitBooking','date','slotStartTime','slotEndTime','isFirstSlot','timestamp'].sort());
    assert.equal(payload.phone, '+36301234567'); assert.equal(payload.location, 'Offline utca 1., 9021 Győr, Magyarország');
    assert.equal(payload.city, 'gyor'); assert.equal(payload.totalPrice, 29000); assert.equal(payload.totalDuration, 75);
    assert.equal(payload.date, date); assert.equal(payload.slotStartTime, '09:00'); assert.equal(payload.slotEndTime, '11:00');
    assert.deepEqual(payload.items.karpit_szofa.upsells, ['atkairtas', 'agyazhato']);
    assert.equal(h.document.getElementById('bookingForm').wasReset, true);
    assert.equal(h.document.getElementById('bookingResult').open, true);
    assert.match(h.document.getElementById('bookingResultTitle').textContent, /elküldve/);
    assert.equal(h.document.querySelector('.btn-submit').disabled, true);
    await h.run('submitBooking({ preventDefault() {} })');
    assert.equal(h.requests.filter(([url]) => url.endsWith('booking-request-hu')).length, 1);
    assert.deepEqual(h.logs, []);
});

test('no selected appointment, wrong region, empty cart or unaccepted flexibility never sends', async () => {
    const mutations = ['BookingCalendar.resetSelection()', "BookingCalendar.state.selectedCity = 'sopron'", 'State.selectedItems = {}', `BookingCalendar.selectSlot(720)`, 'State.city = null'];
    for (const mutation of mutations) {
        const h = harness(); configureBooking(h); h.run(mutation);
        await h.run('submitBooking({ preventDefault() {} })');
        assert.equal(h.requests.length, 0, mutation);
        assert.ok(h.alerts.length > 0);
    }
});

test('HTTP 200 success false gives one failure, preserves form and refreshes availability', async () => {
    const h = harness({ fetch: async url => response(url.endsWith('check-availability') ? availability() : { success: false, error: 'SLOT_CONFLICT', message: '<img onerror=alert(1)>' }) }); configureBooking(h);
    await h.run('submitBooking({ preventDefault() {} })');
    assert.equal(h.run('BookingTransport.bookingSent'), false);
    assert.equal(h.document.getElementById('bookingForm').wasReset, undefined);
    assert.match(h.document.getElementById('bookingResultMessage').textContent, /betelt/);
    assert.equal(h.alerts.length, 0);
    assert.equal(h.requests.filter(([url]) => url.endsWith('check-availability')).length, 1);
    assert.equal(h.document.querySelector('.btn-submit').disabled, false);
});

test('unknown network outcome avoids a false failure claim and automatic retry', async () => {
    const h = harness({ fetch: async () => { throw new Error('offline'); } }); configureBooking(h);
    await h.run('submitBooking({ preventDefault() {} })');
    assert.equal(h.requests.length, 1);
    assert.equal(h.document.getElementById('bookingForm').wasReset, undefined);
    assert.match(h.document.getElementById('bookingResultMessage').textContent, /Újraküldés előtt/);
    assert.equal(h.document.querySelector('.btn-submit').disabled, false);
});

test('pending duplicate click makes only one write request', async () => {
    let resolve;
    const h = harness({ fetch: url => url.endsWith('check-availability') ? response(availability()) : new Promise(done => { resolve = done; }) }); configureBooking(h);
    const pending = h.run('submitBooking({ preventDefault() {} })');
    await h.run('submitBooking({ preventDefault() {} })');
    assert.equal(h.requests.length, 1);
    resolve(response({ success: false, error: 'UNKNOWN' })); await pending;
});

test('sanitized live read-only availability evidence conforms to the calendar contract', { skip: !fs.existsSync(new URL('./booking-live-availability.json', import.meta.url)) }, () => {
    const h = harness();
    const evidence = JSON.parse(fs.readFileSync(new URL('./booking-live-availability.json', import.meta.url), 'utf8'));
    assert.equal(evidence.success, true);
    assert.ok(evidence.days.length > 0);
    h.run(`BookingCalendar.validateData(${JSON.stringify(evidence)})`);
});

test('large orders preserve original nested payload and require explicit backend success', async () => {
    for (const accepted of [false, true]) {
        const h = harness({ fetch: async () => response({ success: accepted }) });
        configureBooking(h, { isLargeOrder: true, totalDuration: 520, totalPrice: 155000 });
        for (const [id, value] of Object.entries({ largeOrderName: 'Offline Company', largeOrderEmail: 'offline@example.invalid', largeOrderPhone: '+36 30 123 4567', largeOrderAddress: 'Offline address', largeOrderMessage: 'Offline contract fixture' })) h.document.getElementById(id).value = value;
        await h.run('submitLargeOrder()');
        assert.equal(h.requests.length, 1);
        assert.equal(h.requests[0][0], 'https://hub.centaur-lang.dev/webhook/large-order-request');
        const payload = JSON.parse(h.requests[0][1].body);
        assert.deepEqual(Object.keys(payload).sort(), ['type', 'source', 'timestamp', 'customer', 'location', 'order', 'totals', 'message'].sort());
        assert.deepEqual(payload.totals, { estimatedPrice: 155000, estimatedDuration: 520, discount: 0, currency: 'HUF' });
        assert.equal(payload.customer.name, 'Offline Company');
        assert.equal(payload.order.items[0].unitPrice, 18000);
        assert.equal(h.run('BookingTransport.largeOrderSent'), accepted);
        assert.equal(h.document.querySelector('.large-order-submit').disabled, accepted);
    }
});

test('large order rejects malformed email and telephone before transmission', async () => {
    for (const [email, phone] of [['@.', '+36 30 123 4567'], ['offline@example.invalid', 'x'], ['offline @example.invalid', '+36 30 123 4567']]) {
        const h = harness(); configureBooking(h, { isLargeOrder: true, totalDuration: 520 });
        for (const [id, value] of Object.entries({ largeOrderName: 'Offline Company', largeOrderEmail: email, largeOrderPhone: phone })) h.document.getElementById(id).value = value;
        await h.run('submitLargeOrder()');
        assert.equal(h.requests.length, 0);
        assert.equal(h.alerts.length, 1);
    }
});

test('confirmed change-appointment button uses a text-action class, not a square month-arrow class', () => {
    const h = harness(); configureBooking(h); h.run('BookingCalendar.confirmSlot()');
    const html = h.run('BookingCalendar.renderSlots()');
    assert.match(html, /class="calendar-change-button"/);
    assert.doesNotMatch(html, /calendar-month-button/);
});

test('calendar and success content escape external text and never interpolate customer fields as HTML', () => {
    const h = harness();
    h.run("showBookingResult({title:'<img onerror=alert(1)>',message:'<script>alert(1)</script>',detail:'A & B'})");
    assert.equal(h.document.getElementById('bookingResultTitle').textContent, '<img onerror=alert(1)>');
    assert.doesNotMatch(h.document.getElementById('bookingResult').innerHTML, /onerror/);
    assert.equal(h.run(`BookingCalendar.escape('<img "x">&')`), '&lt;img &quot;x&quot;&gt;&amp;');
});
