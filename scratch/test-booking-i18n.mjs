// Self-check for the booking i18n layer. Run: node scratch/test-booking-i18n.mjs
// The load-bearing claim is that a Hungarian page (no booking-i18n.js) behaves
// exactly as it did before i18n existed — that is what these asserts pin down.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const cfg = readFileSync('booking-config.js', 'utf8');
const EXPORTS = '\n;globalThis.__x = { T, fmt, money, isEN, formatDuration, PRICING, UPSELLS };';

function load({ english }) {
    const win = {};
    const ctx = vm.createContext({ window: win, document: { addEventListener() {} }, console });
    if (english) vm.runInContext(readFileSync('booking-i18n.js', 'utf8'), ctx);
    vm.runInContext(cfg + EXPORTS, ctx);
    return ctx.__x;
}

// ── Hungarian: unchanged behaviour ───────────────────────────────────────────
const hu = load({ english: false });
assert.equal(hu.isEN(), false);
// hu-HU separates thousands with U+00A0, so build the expectation the same way
// the pre-i18n code did rather than typing a look-alike space.
assert.equal(hu.money(18000), `${(18000).toLocaleString('hu-HU')} Ft`, 'HU price format must be unchanged');
assert.match(hu.money(18000), /^18 000 Ft$/);
assert.equal(hu.T('Szófa, heverő'), 'Szófa, heverő', 'T() must be identity without a table');
assert.equal(hu.T('anything at all'), 'anything at all');
assert.equal(hu.fmt('{n} bútor', { n: 3 }), '3 bútor');
assert.equal(hu.formatDuration(95), '1 óra 35 perc');
assert.equal(hu.formatDuration(60), '1 óra');
assert.equal(hu.formatDuration(20), '20 perc');

// ── English ──────────────────────────────────────────────────────────────────
const en = load({ english: true });
assert.equal(en.isEN(), true);
assert.equal(en.money(18000), '18,000 HUF');
assert.equal(en.T('Szófa, heverő'), 'Sofa / daybed');
assert.equal(en.T('Belváros'), 'Town centre');
assert.equal(en.formatDuration(95), '1 h 35 min');
assert.equal(en.formatDuration(20), '20 min');
assert.equal(en.fmt('Köszönjük, {name}!', { name: 'Anna' }), 'Thank you, Anna!');

// An untranslated string must fall back to Hungarian rather than vanish.
assert.equal(en.T('Nincs ilyen kulcs'), 'Nincs ilyen kulcs');

// Missing interpolation vars must leave the token visible, not print "undefined".
assert.equal(en.fmt('Köszönjük, {name}!', {}), 'Thank you, {name}!');

// ── prices are data, never translated ────────────────────────────────────────
assert.equal(en.PRICING.karpit.szofa.price, hu.PRICING.karpit.szofa.price);
assert.equal(en.PRICING.karpit.szofa.name, 'Szófa, heverő',
    'PRICING data must stay Hungarian — it is what the backend receives');

console.log('✓ booking i18n: Hungarian unchanged, English resolves, data untouched');
