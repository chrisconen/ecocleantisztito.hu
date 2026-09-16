// Classifies every text unit in the published booking runtime and builds the
// English table. Nothing is translated by guesswork: a unit is only eligible if
// it is prose, is not a known logic value, and is not code. Units left out keep
// their Hungarian bytes, which is always safe.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const all = JSON.parse(readFileSync('scratch/i18n/runtime-all.json', 'utf8'));

// Values the program compares against or stores as state. Translating any of
// these silently breaks the booking flow, so they are excluded by name.
const LOGIC = new Set([
    'Magánszemély', 'Céges', 'Kárpit', 'Matrac', 'Mindkettő',
    'Haziallat', 'Allergias', 'Dohanyzo',
    'karpit', 'matrac', 'perItem', 'perSeat', 'perSide', 'perBed',
    'wetPrice', 'framePrice', 'atkairtas', 'agyazhato', 'belvaros', 'kulso',
    'active', 'block', 'none', 'flex', 'checkbox', 'number',
]);

// Code-ish: identifiers, selectors, urls, css, template leftovers.
// Parentheses alone are NOT a code signal — plenty of real labels contain them
// ("Kiságy matrac (A oldal)"). Only unambiguous code punctuation counts.
const isCode = (t) =>
    /[{};=`]|=>|\$\{|\bfunction\b|\breturn\b|\bconst \b|\blet \b/.test(t)
    || /^#|^\.|^https?:|^\d/.test(t)
    || /^[a-z_]+(-[a-z_]+)*$/.test(t)          // identifier / css class
    || /^[-\w]+:[-\w]/.test(t)                 // css declaration
    || !/\p{L}{2,}/u.test(t);

const HUNGARIAN = /[áéíóöőúüűÁÉÍÓÖŐÚÜŰ]/;
// Hungarian display words that carry no accent and would otherwise be missed.
const PLAIN_HU = /(?<!\p{L})(oldal|agy|db|perc|nap|Ft|butor|kosar)(?!\p{L})/i;

// Existing translations: the root-derived booking table and the page memory.
const win = {};
if (existsSync('booking-i18n.js')) {
    vm.runInContext(readFileSync('booking-i18n.js', 'utf8'), vm.createContext({ window: win }));
}
const known = win.BOOKING_I18N || {};

const buckets = { logic: [], code: [], have: [], need: [] };
const table = {};
for (const [h, text] of Object.entries(all)) {
    if (LOGIC.has(text)) { buckets.logic.push(text); continue; }
    if (isCode(text)) { buckets.code.push(text); continue; }
    if (!HUNGARIAN.test(text) && !PLAIN_HU.test(text)) { buckets.code.push(text); continue; }
    if (known[text]) { table[h] = known[text]; buckets.have.push(text); continue; }
    buckets.need.push([h, text]);
}

writeFileSync('scratch/i18n/runtime-en.json', JSON.stringify(table, null, 2));
writeFileSync('scratch/i18n/runtime-todo.json',
    JSON.stringify(Object.fromEntries(buckets.need), null, 2));

console.log(`units            : ${Object.keys(all).length}`);
console.log(`  logic (skip)   : ${buckets.logic.length}`);
console.log(`  code  (skip)   : ${buckets.code.length}`);
console.log(`  translated     : ${buckets.have.length}`);
console.log(`  still needed   : ${buckets.need.length}`);
console.log('\nLOGIC VALUES PROTECTED:', buckets.logic.join(', '));
console.log('\nSTILL NEEDED:');
for (const [, t] of buckets.need) console.log('  ' + JSON.stringify(t).slice(0, 100));
