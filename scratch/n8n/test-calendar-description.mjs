// Renders the Create Booking description expression offline, both languages.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const code = readFileSync('scratch/n8n/calendar-description.js', 'utf8');

const body = {
    name: 'Anna Kovács', email: 'anna@example.com', phone: '+36 30 123 4567',
    totalPrice: 48150, discount: 5350, travelZone: 'belvaros',
    duration: { hours: 2, minutes: 10, totalMinutes: 130 },
    isFirstSlot: false, customerType: 'Magánszemély',
    conditions: ['Haziallat', 'Allergias'],
    isKarpitBooking: true, andanteAccepted: true,
    message: 'A kapu kódja 1234.',
    itemsArray: [
        { id: 'karpit_szofa', count: 1, upsells: ['atkairtas', 'agyazhato'] },
        { id: 'matrac_francia_ab', count: 2, upsells: ['nedves_tisztitas'] },
        { id: 'karpit_ismeretlen_uj', count: 1, upsells: [] },
    ],
    upsellsArray: [{ upsellType: 'impregnalas' }],
};

const run = (lang) => {
    const ctx = vm.createContext({
        $: (n) => ({ first: () => (n === 'Webhook' ? { json: { body: { lang } } } : { json: { body } }) }),
    });
    return vm.runInContext(code, ctx);
};

const hu = run('hu');
const en = run('en');

// no markup may reach a plain-text calendar field
for (const [label, out] of [['hu', hu], ['en', en]]) {
    assert.ok(!/<[a-z/]/i.test(out), `${label}: HTML tag leaked into the calendar description`);
}
// names resolved, not raw ids
assert.ok(hu.includes('Szófa, heverő'));
assert.ok(hu.includes('Franciaágy matrac 140/160/180×200 cm (A+B oldal)'));
assert.ok(!hu.includes('karpit_szofa'));
assert.ok(hu.includes('Atkairtás') && hu.includes('Ágyazható felület tisztítása'));
assert.ok(hu.includes('Impregnálás'));
assert.ok(hu.includes('Háziállat, Allergiás'), 'condition keys must be humanised');
assert.ok(hu.includes('Belváros'), 'zone code must be humanised');
assert.ok(hu.includes((48150).toLocaleString('hu-HU') + ' Ft'), 'price must be grouped');
assert.ok(hu.includes('ismeretlen uj'), 'unknown id degrades readably');
// language flag only in the English case — this is what tells the operator to speak English
assert.ok(en.includes('ANGOLUL FOGLALT'));
assert.ok(!hu.includes('ANGOLUL FOGLALT'));
// admin-facing text stays Hungarian in both cases
assert.ok(en.includes('MEGRENDELT TÉTELEK'));

console.log(en);
console.log('\n✓ calendar description: no markup, names/zone/conditions resolved, EN flag present');
