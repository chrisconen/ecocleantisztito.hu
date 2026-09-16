// Derives release/ui/booking-live-en.js from the PUBLISHED Hungarian runtime.
//
// Only text units listed in runtime-manual.json (hand-reviewed) or already
// present in booking-i18n.js are replaced, at offsets proven by the identity
// splice in runtime-segments.mjs. Anything not listed keeps its Hungarian bytes,
// so an omission is always safe — it can never corrupt code or logic values.
//
// Two further edits are code, not text, and are applied explicitly:
//   * number grouping switches to en-GB
//   * the payload gains lang: 'en', which is what the n8n workflow branches on
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const SRC = 'release/ui/booking-live.js';
const OUT = 'release/ui/booking-live-en.js';

const src = readFileSync(SRC, 'utf8');
const units = JSON.parse(readFileSync('scratch/i18n/runtime-units-all.json', 'utf8'));
const manual = JSON.parse(readFileSync('scratch/i18n/runtime-manual.json', 'utf8'));
delete manual._comment;

const win = {};
vm.runInContext(readFileSync('booking-i18n.js', 'utf8'), vm.createContext({ window: win }));
const table = { ...win.BOOKING_I18N, ...manual };   // manual wins

// Some display text is captured together with surrounding code (a ternary arm,
// a template-literal label). Those entries are built by replacing only the
// Hungarian PHRASE inside the captured unit, so the code around it is preserved
// byte for byte by construction instead of being retyped into JSON.
const PHRASES = [
    ['Ágyanként, fejtámlával együtt', 'Per bed, headboard included'],
    ['+Ágyazható felület tisztítása (kihúzható / lenyitható)', '+Sofa bed surface cleaning (pull-out / fold-down)'],
    ['+Ágyazható felület tisztítása (', '+Sofa bed surface cleaning ('],
    ['Kiválasztott kiegészítő tisztítások (kedvezmény előtt):', 'Selected additional cleaning (before discount):'],
    ['24 órán belül', 'within 24 hours'],
    ['Kért időpont:', 'Requested appointment:'],
    ['Kalkulált összeg:', 'Calculated total:'],
    ['Becsült összeg:', 'Estimated total:'],
];
for (const u of units) {
    if (table[u.text] !== undefined) continue;
    let en = u.text;
    for (const [hu, to] of PHRASES) if (en.includes(hu)) en = en.split(hu).join(to);
    if (en !== u.text) table[u.text] = en;
}

// ── 1. text replacement at proven offsets ────────────────────────────────────
let out = src;
let replaced = 0;
const untouched = new Set();
for (const u of [...units].sort((a, b) => b.start - a.start)) {
    const en = table[u.text];
    if (en === undefined) { untouched.add(u.text); continue; }
    assert.equal(src.slice(u.start, u.end), u.text, `offset drift at ${u.start}`);
    out = out.slice(0, u.start) + en + out.slice(u.end);
    replaced++;
}

// ── 2. number grouping ───────────────────────────────────────────────────────
const localeCount = (out.match(/toLocaleString\('hu-HU'\)/g) || []).length;
out = out.replaceAll("toLocaleString('hu-HU')", "toLocaleString('en-GB')");

// ── 3. language flag in both payloads ────────────────────────────────────────
// The endpoint is unchanged: n8n reads `lang` and picks the customer language.
const stamp = "        lang: 'en',\n        timestamp:";
const before = (out.match(/^\s*timestamp:/gm) || []).length;
out = out.replace(/(\n)(\s*)timestamp: new Date\(\)\.toISOString\(\)/g,
    (m, nl, indent) => `${nl}${indent}lang: 'en',${nl}${indent}timestamp: new Date().toISOString()`);
const langCount = (out.match(/lang: 'en'/g) || []).length;

writeFileSync(OUT, out);

console.log(`text units replaced      : ${replaced} of ${units.length}`);
console.log(`left Hungarian (safe)    : ${untouched.size} distinct`);
console.log(`hu-HU -> en-GB           : ${localeCount}`);
console.log(`payloads tagged lang:'en': ${langCount} (of ${before} timestamp sites)`);
console.log(`bytes                    : ${src.length} -> ${out.length}`);
assert.ok(langCount >= 1, 'the booking payload must carry lang');
assert.ok(!out.includes("toLocaleString('hu-HU')"), 'hu-HU grouping left behind');

console.log('\nstill Hungarian (expected: logic values, identifiers, comments):');
for (const t of [...untouched].filter((t) => /[áéíóöőúüűÁÉÍÓÖŐÚÜŰ]/.test(t)).slice(0, 12)) {
    console.log('  ' + JSON.stringify(t).slice(0, 90));
}
