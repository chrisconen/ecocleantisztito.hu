// Fine-grained extraction of translatable prose from the published booking
// runtime. Inside each string/template literal, `${...}` expressions and HTML
// tags are treated as opaque; only the text between them is a translation unit.
// Every unit carries its absolute byte offset so translations can be spliced
// back exactly, with no chance of touching code.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const FILE = 'release/ui/booking-live.js';
const src = readFileSync(FILE, 'utf8');
const hash = (s) => createHash('sha1').update(s).digest('hex').slice(0, 12);
const HAS_LETTER = /\p{L}{2,}/u;
const HUNGARIAN = /[áéíóöőúüűÁÉÍÓÖŐÚÜŰ]/;

// 1. locate string / template literals
const literals = [];
const re = /(['"`])((?:\\.|(?!\1)[^\\])*)\1/g;
let m;
while ((m = re.exec(src))) literals.push({ start: m.index + 1, text: m[2] });

// 2. inside each literal, split off ${...} and <...> as opaque
const units = [];
for (const lit of literals) {
    const t = lit.text;
    let i = 0;
    while (i < t.length) {
        if (t.startsWith('${', i)) {                      // template expression
            let depth = 1, j = i + 2;
            while (j < t.length && depth > 0) { if (t[j] === '{') depth++; else if (t[j] === '}') depth--; j++; }
            i = j; continue;
        }
        if (t[i] === '<') {                               // html tag
            const j = t.indexOf('>', i);
            if (j === -1) { i++; continue; }
            i = j + 1; continue;
        }
        // plain text run up to the next tag or expression
        let j = i;
        while (j < t.length && t[j] !== '<' && !t.startsWith('${', j)) j++;
        const run = t.slice(i, j);
        const trimmed = run.trim();
        if (trimmed && HAS_LETTER.test(trimmed) && HUNGARIAN.test(trimmed)) {
            const lead = run.indexOf(trimmed[0]);
            units.push({
                start: lit.start + i + lead,
                end: lit.start + i + lead + trimmed.length,
                text: trimmed,
                h: hash(trimmed),
            });
        }
        i = j;
    }
}

// 3. dedupe for translation, keep every occurrence for splicing
const table = {};
for (const u of units) table[u.h] = u.text;

writeFileSync('scratch/i18n/runtime-units.json', JSON.stringify(units));
writeFileSync('scratch/i18n/runtime-hu.json', JSON.stringify(table, null, 2));

// sanity: splicing the originals back must reproduce the file byte for byte
let out = src;
for (const u of [...units].sort((a, b) => b.start - a.start)) {
    out = out.slice(0, u.start) + u.text + out.slice(u.end);
}
console.log(`literals            : ${literals.length}`);
console.log(`translatable units  : ${units.length}  (unique ${Object.keys(table).length})`);
console.log(`chars               : ${Object.values(table).reduce((a, t) => a + t.length, 0)}`);
console.log(out === src ? '✓ identity splice reproduces the runtime byte for byte'
    : '✗ IDENTITY SPLICE FAILED — offsets are wrong, do not proceed');
if (out !== src) process.exit(1);
console.log('\nsample:');
for (const t of Object.values(table).slice(0, 10)) console.log('  ' + JSON.stringify(t).slice(0, 95));
