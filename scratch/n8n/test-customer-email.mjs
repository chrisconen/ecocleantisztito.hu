// Runs the n8n "Build Customer Email" Code node offline against a realistic
// normalised payload, in both languages. Node code is executed verbatim, with
// $() stubbed, so what is tested here is what runs in n8n.
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const code = readFileSync('scratch/n8n/build-customer-email.js', 'utf8');

const payload = (language) => ({
  language,
  name: 'Anna Kovács',
  email: 'anna@example.com',
  date: '2026-10-02',
  slotStartTime: '09:00',
  slotEndTime: '11:20',
  isFirstSlot: false,
  location: 'Petőfi u. 3, 8600 Siófok, Magyarország',
  duration: { hours: 2, minutes: 20, totalMinutes: 140 },
  totalPrice: 46500,
  discount: 5000,
  conditions: ['Haziallat', 'Allergias'],
  isKarpitBooking: true,
  andanteAccepted: true,
  itemsArray: [
    { id: 'karpit_szofa', count: 1, upsells: ['atkairtas', 'agyazhato'] },
    { id: 'matrac_francia_ab', count: 2, upsells: ['nedves_tisztitas'] },
    { id: 'karpit_valami_uj', count: 1, upsells: [] },   // unknown id on purpose
  ],
  upsellsArray: [{ upsellType: 'impregnalas' }, { upsellType: 'szagtalanitas' }],
});

function run(language) {
  const ctx = vm.createContext({
    $: (n) => ({ first: () => (n === 'Webhook'
      ? { json: { body: { lang: language } } }
      : { json: { body: payload(language) } }) }),
    console,
  });
  return vm.runInContext(`(function(){${code}})()`, ctx)[0].json;
}

const hu = run('hu');
const en = run('en');

// ── subject / language plumbing ──────────────────────────────────────────────
assert.match(hu.subject, /ECO Clean megrendelés - 2026-10-02/);
assert.match(en.subject, /ECO Clean booking confirmed - 2026-10-02/);
assert.equal(hu.language, 'hu');
assert.equal(en.language, 'en');
assert.equal(en.to, 'anna@example.com');

// ── money formatting ─────────────────────────────────────────────────────────
// hu-HU groups with U+00A0; build the expectation the same way the node does
assert.ok(hu.html.includes((46500).toLocaleString('hu-HU') + ' Ft'), 'HU total must keep Ft formatting');
assert.ok(en.html.includes('46,500 HUF'), 'EN total must be HUF with comma grouping');
assert.ok(en.html.includes('51,500 HUF'), 'EN original price = total + discount');

// ── item names resolved, not raw ids ─────────────────────────────────────────
assert.ok(hu.html.includes('Szófa, heverő'));
assert.ok(en.html.includes('Sofa / daybed'));
assert.ok(en.html.includes('Double mattress 140/160/180×200 cm (sides A+B)'));
assert.ok(!en.html.includes('karpit_szofa'), 'raw item id must never reach the customer');
assert.ok(!en.html.includes('matrac_francia_ab'));
// unknown id degrades to a readable label rather than a key
assert.ok(en.html.includes('valami uj'), 'unknown id should be humanised');
assert.ok(!en.html.includes('karpit_valami_uj'));

// ── upsells / conditions ─────────────────────────────────────────────────────
assert.ok(en.html.includes('Dust mite treatment'));
assert.ok(en.html.includes('Sofa bed surface cleaning'));
assert.ok(en.html.includes('Fabric protection'));
assert.ok(en.html.includes('Pets in the home'));
assert.ok(en.html.includes('Allergy sufferer'));
assert.ok(hu.html.includes('Háziállat'));

// ── conditional blocks ───────────────────────────────────────────────────────
assert.ok(en.html.includes('±30 minutes'), 'non-first slot warning in EN');
assert.ok(hu.html.includes('±30 perc'));
assert.ok(en.html.includes('Cleaning ANDANTE fabric'));
assert.ok(en.html.includes('/en/index.html'), 'EN footer links to the EN site');
assert.ok(hu.html.includes('https://ecocleantisztito.hu"'), 'HU footer links to the HU site');

// ── no Hungarian left in the English mail ────────────────────────────────────
const visible = en.html.replace(/<[^>]+>/g, ' ');
const leftovers = visible.match(/(?<!\p{L})(és|vagy|hogy|nem|meg|már|kérjük|tisztítás|foglalás|díj)(?!\p{L})/giu) || [];
assert.deepEqual(leftovers, [], `Hungarian left in EN mail: ${leftovers.join(', ')}`);

// ── first-slot variant also renders ──────────────────────────────────────────
const ctxFirst = vm.createContext({
  $: (n) => ({ first: () => (n === 'Webhook'
    ? { json: { body: { lang: 'en' } } }
    : { json: { body: { ...payload('en'), isFirstSlot: true, discount: 0, conditions: [], andanteAccepted: false } } }) }),
  console,
});
const enFirst = vm.runInContext(`(function(){${code}})()`, ctxFirst)[0].json;
assert.ok(enFirst.html.includes('First appointment of the day'));
assert.ok(!enFirst.html.includes('You save'), 'no discount block when discount is 0');
assert.ok(!enFirst.html.includes('Cleaning ANDANTE fabric'));

writeFileSync('scratch/n8n/preview-en.html', en.html);
writeFileSync('scratch/n8n/preview-hu.html', hu.html);
console.log('✓ customer email: both languages render, names resolved, no Hungarian left in EN');
console.log('  previews: scratch/n8n/preview-en.html, preview-hu.html');
