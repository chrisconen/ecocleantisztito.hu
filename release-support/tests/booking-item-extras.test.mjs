import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL(process.env.BOOKING_TEST_PRODUCTION ? '../../release/ui/booking-live.js' : '../../booking-config.js', import.meta.url), 'utf8');

function harness() {
    const elements = new Map(), requests = [];
    const element = id => {
        if (!elements.has(id)) elements.set(id, {
            style: {}, value: '', checked: false, innerHTML: '', textContent: '', inputs: [],
            classList: { add() {}, remove() {} },
            querySelectorAll() { return this.inputs; },
            focus() {}, reset() {}, scrollIntoView() {}
        });
        return elements.get(id);
    };
    const context = vm.createContext({
        document: { getElementById: element, querySelector: element, querySelectorAll: () => [], addEventListener() {} },
        console: { log() {}, error() {} },
        alert(message) { throw new Error(message); },
        fetch: async (url, options) => { requests.push({ url, body: JSON.parse(options.body) }); return { ok: true, json: async () => ({ success: true }) }; },
        BookingCalendar: { state: { selectedCity: 'gyor' }, isValid: () => true, setRequiredDuration(value) { this.duration = value; this.state.requiredDuration = value; }, getSelectedDate: () => '2026-09-15', getSelectedSlot: () => ({ startTime: '09:00', endTime: '17:00', isFirstSlot: true }) }
    });
    const run = code => vm.runInContext(code, context);
    run(source);
    run('showSuccessModal = () => {}; showLargeOrderSuccess = () => {}; toggleLargeOrderMode = () => {};');
    if (process.env.BOOKING_TEST_PRODUCTION) run(`sendBookingRequest = payload => fetch('mock-booking', {body: JSON.stringify(payload)}); sendLargeOrderRequest = payload => fetch('mock-large', {body: JSON.stringify(payload)});`);
    return { run, element, requests };
}

const prices = {
    egyagyas_a: [9000, 25, 1, 6000, 6000], egyagyas_ab: [14000, 40, 2, 6000, 6000],
    francia_a: [14000, 35, 1, 8500, 9000], francia_ab: [19500, 55, 2, 8500, 9000],
    gyerek_a: [6000, 15, 1, 3500, 4500], gyerek_ab: [8000, 25, 2, 3500, 4500],
    kisagy_a: [4500, 10, 1, 3500, 4500], kisagy_ab: [7000, 20, 2, 3500, 4500]
};

for (const [id, [base, duration, sides, wet, frame]] of Object.entries(prices)) {
    test(`${id}: independent extras, side and furniture quantities`, () => {
        const h = harness();
        for (const count of [1, 2, 3]) for (const extras of [[], ['nedves_tisztitas'], ['agykeret'], ['nedves_tisztitas', 'agykeret']]) {
            h.run(`State.selectedItems = { matrac_${id}: { category: 'matrac', count: ${count}, upsells: ${JSON.stringify(extras)} } }; updateSummary();`);
            const subtotal = count * (base + (extras.includes('nedves_tisztitas') ? wet * sides : 0) + (extras.includes('agykeret') ? frame : 0));
            assert.equal(h.run('State.totalPrice'), subtotal - (count >= 3 ? Math.round(subtotal * .05) : 0));
            assert.equal(h.run('State.totalDuration'), count * (duration + (extras.includes('nedves_tisztitas') ? 20 * sides : 0) + (extras.includes('agykeret') ? 15 : 0)));
            assert.equal(h.run('BookingCalendar.duration'), h.run('State.totalDuration'));
        }
    });
}

test('extras remain specific to their mattress, combined discounts and travel still apply', () => {
    const h = harness();
    h.run(`State.selectedItems = {
        matrac_egyagyas_a: { category: 'matrac', count: 1, upsells: ['nedves_tisztitas'] },
        matrac_francia_ab: { category: 'matrac', count: 1, upsells: ['agykeret'] },
        karpit_szofa: { category: 'karpit', count: 1, upsells: ['atkairtas', 'agyazhato'], pillowCount: 4 }
    }; State.travelZone = 'belvaros'; updateSummary();`);
    assert.equal(h.run('State.totalPrice'), 81800 * .9);
    assert.equal(h.run('State.totalDuration'), 210);
    assert.match(h.element('summaryDetails').innerHTML, /mosás \(1 oldal\)/);
    assert.match(h.element('summaryDetails').innerHTML, /tisztítás \(1 ágy\)/);
});

test('mattress extras are inside hidden card sections and absent from global extras', () => {
    const h = harness();
    h.run(`handleServiceType({ dataset: { value: 'Matrac' }, classList: { add() {} } });`);
    assert.equal(h.element('step4').style.display, 'none');
    assert.equal(h.element('upsellOptions').innerHTML, '');
    assert.equal((h.element('itemSelection').innerHTML.match(/class="upsell-checkbox mattress-extra"/g) || []).length, 16);
    assert.match(h.element('itemSelection').innerHTML, /id="upsell-matrac_francia_ab" style="display:none;"/);
    h.run(`incrementItem('matrac_francia_ab', 'matrac');`);
    assert.equal(h.element('upsell-matrac_francia_ab').style.display, 'block');
    h.run(`toggleItemUpsell('matrac_francia_ab', 'nedves_tisztitas');`);
    assert.equal(h.run('State.totalPrice'), 36500);
});

test('pillows are offered on sofa and both couches only, and count is a total across furniture', () => {
    const h = harness();
    for (const id of ['szofa', 'l_kanape', 'u_kanape']) {
        assert.match(h.run(`createItemHTML('karpit', '${id}', PRICING.karpit.${id})`), /pillow-count/);
    }
    for (const id of ['fotel', 'ebedlo_szek', 'irodai_szek']) {
        assert.doesNotMatch(h.run(`createItemHTML('karpit', '${id}', PRICING.karpit.${id})`), /pillow-count/);
    }
    h.run(`incrementItem('karpit_szofa', 'karpit'); incrementItem('karpit_szofa', 'karpit'); setPillowCount('karpit_szofa', '4');`);
    assert.equal(h.run('State.totalPrice'), 40800);
    assert.equal(h.run('State.totalDuration'), 100);
    h.run(`decrementItem('karpit_szofa');`);
    assert.equal(h.run('State.totalPrice'), 22800);
    for (const value of ['-1', '1.5', 'NaN', 'Infinity', '', '9007199254740992']) {
        h.run(`setPillowCount('karpit_szofa', '${value}');`);
        assert.equal(h.run('State.totalPrice'), 18000);
    }
});

test('removing a card clears all extras and re-adding it starts empty; service switching resets selections', () => {
    const h = harness();
    for (const removal of ['removeItem', 'decrementItem']) {
        h.run(`incrementItem('karpit_szofa', 'karpit'); setPillowCount('karpit_szofa', 4); toggleItemUpsell('karpit_szofa', 'atkairtas');`);
        const inputs = [{ type: 'checkbox', checked: true }, { type: 'checkbox', checked: true }, { type: 'number', value: '4' }];
        h.element('upsell-karpit_szofa').inputs = inputs;
        h.run(`${removal}('karpit_szofa');`);
        assert.equal(h.run('State.totalPrice'), 0);
        assert.equal(inputs[0].checked, false);
        assert.equal(inputs[1].checked, false);
        assert.equal(inputs[2].value, '0');
        assert.equal(h.element('upsell-karpit_szofa').style.display, 'none');
    }
    h.run(`incrementItem('karpit_szofa', 'karpit');`);
    assert.equal(h.run('State.totalPrice'), 18000);
    h.run(`handleServiceType({ dataset: { value: 'Matrac' }, classList: { add() {} } });`);
    assert.equal(h.run('Object.keys(State.selectedItems).length'), 0);
    assert.equal(h.run('State.totalPrice'), 0);
});

test('normal and large booking payloads preserve quantities and human-readable extras without network writes', async () => {
    const h = harness();
    h.run(`State.serviceType = 'Mindkettő'; State.city = 'gyor'; State.travelZone = 'belvaros';
        incrementItem('karpit_szofa', 'karpit'); setPillowCount('karpit_szofa', 4);
        incrementItem('matrac_francia_ab', 'matrac'); toggleItemUpsell('matrac_francia_ab', 'nedves_tisztitas'); toggleItemUpsell('matrac_francia_ab', 'agykeret');`);
    for (const [id, value] of Object.entries({ nameInput: 'Offline Test', emailInput: 'test@example.invalid', emailConfirmInput: 'test@example.invalid', phoneInput: '+36 30 123 4567', streetInput: 'Test utca 1.', cityInput: 'Győr', plzInput: '9021', messageInput: 'Eredeti megjegyzés', largeOrderName: 'Offline Test', largeOrderEmail: 'test@example.invalid', largeOrderPhone: '+36 30 123 4567', largeOrderMessage: 'Eredeti megjegyzés' })) h.element(id).value = value;
    h.element('andanteCheckbox').checked = true;
    await h.run('submitBooking({ preventDefault() {} })');
    h.run('State.isLargeOrder = true');
    await h.run('submitLargeOrder()');
    assert.equal(h.requests.length, 2);
    const normal = h.requests[0].body, large = h.requests[1].body;
    assert.equal(normal.items.karpit_szofa.pillowCount, 4);
    assert.deepEqual(normal.items.matrac_francia_ab.upsells, ['nedves_tisztitas', 'agykeret']);
    assert.equal(normal.totalPrice, 64620);
    assert.equal(large.totals.estimatedPrice, normal.totalPrice);
    for (const payload of [normal, large]) {
        assert.match(payload.message, /^Eredeti megjegyzés\n\n/);
        assert.match(payload.message, /4 db × 1200 Ft = 4800 Ft/);
        assert.match(payload.message, /2 oldal × 8500 Ft = 17000 Ft/);
        assert.match(payload.message, /1 ágy × 9000 Ft = 9000 Ft/);
    }
    assert.equal(large.order.items[0].cleaningExtras[0].quantity, 4);
});
