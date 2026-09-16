// Checks booking-i18n.js covers every string the booking scripts can pass to T():
// literal T('…')/fmt('…') keys AND the Hungarian values in PRICING/UPSELLS/etc.
// Also verifies {placeholder} sets survive translation. Run after editing either.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = (f) => readFileSync(f, 'utf8');

// Load the i18n table.
const win = {};
vm.runInContext(read('booking-i18n.js'), vm.createContext({ window: win }));
const table = win.BOOKING_I18N;

// Load the data objects out of booking-config.js (top-level consts, no DOM use).
const cfgCtx = vm.createContext({ window: {}, document: { addEventListener() {} }, console });
vm.runInContext(read('booking-config.js') +
    '\n;globalThis.__data = { PRICING, UPSELLS, PILLOW_CLEANING, DISCOUNTS };', cfgCtx);
const { PRICING, UPSELLS, PILLOW_CLEANING, DISCOUNTS } = cfgCtx.__data;

// Every Hungarian string that reaches T() at runtime.
const needed = new Set();
for (const cat of ['karpit', 'matrac']) {
    for (const it of Object.values(PRICING[cat])) needed.add(it.name);
    for (const up of Object.values(UPSELLS[cat])) {
        needed.add(up.name);
        if (up.description) needed.add(up.description);
        if (up.note) needed.add(up.note);
    }
}
for (const z of Object.values(PRICING.travelZones)) needed.add(z.label);
needed.add(PILLOW_CLEANING.name);
needed.add(PILLOW_CLEANING.description);
for (const d of Object.values(DISCOUNTS)) needed.add(d.label);
for (const u of ['oldal', 'ágy', 'db', 'ülőhely', 'felület']) needed.add(u);

// Literal T('…') / fmt('…') keys. Both quote styles are JS string literals, so
// escapes must be resolved the way the engine resolves them at runtime —
// a `\n` in the source is a real newline in the key. Line comments are stripped
// first so documentation examples are not mistaken for real keys.
const unescape = (lit) => JSON.parse(`"${lit.replace(/"/g, '\\"')}"`);
for (const f of ['booking-config.js', 'booking-cart.js']) {
    const s = read(f).replace(/^\s*\/\/.*$/gm, '');
    for (const m of s.matchAll(/\b(?:T|fmt)\(\s*'((?:\\.|[^'\\])*)'/g)) needed.add(unescape(m[1]));
    for (const m of s.matchAll(/\b(?:T|fmt)\(\s*`((?:\\.|[^`\\$])*)`/g)) needed.add(unescape(m[1]));
}

const ph = (s) => (String(s).match(/\{(\w+)\}/g) || []).sort().join(',');
let bad = 0;
for (const k of [...needed].sort()) {
    if (!(k in table)) { console.log(`MISSING   ${JSON.stringify(k).slice(0, 90)}`); bad++; continue; }
    if (ph(k) !== ph(table[k])) {
        console.log(`PLACEHOLD ${JSON.stringify(k).slice(0, 70)}  [${ph(k)}] -> [${ph(table[k])}]`); bad++;
    }
    if (/[áéíóöőúüűÁÉÍÓÖŐÚÜŰ]/.test(table[k]) && !/Tata|Példa|ANDANTE/.test(table[k])) {
        console.log(`HU-LEFT   ${JSON.stringify(table[k]).slice(0, 80)}`); bad++;
    }
}
const unused = Object.keys(table).filter((k) => !needed.has(k));
if (unused.length) console.log(`\nunused table entries (${unused.length}):`, unused.slice(0, 5));
console.log(bad ? `\n✗ ${bad} problem(s)` : `\n✓ all ${needed.size} runtime strings covered, placeholders intact`);
process.exit(bad ? 1 : 0);
