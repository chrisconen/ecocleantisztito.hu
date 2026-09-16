// Verifies every this.lang.<key> used by booking-calendar.js exists in de/hu/en.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync('booking-calendar.js', 'utf8');
const ctx = vm.createContext({ console, document: undefined, window: {} });
vm.runInContext(src + '\n;globalThis.__i18n = BookingCalendar.i18n;', ctx);
const i18n = ctx.__i18n;

const used = new Set([...src.matchAll(/this\.lang\.(\w+)/g)].map((m) => m[1]));
const langs = Object.keys(i18n);
let bad = 0;
for (const k of used) {
    for (const L of langs) {
        if (!(k in i18n[L])) { console.log(`MISSING ${L}.${k}`); bad++; }
    }
}
// also flag keys defined in one language but not another
const all = new Set(langs.flatMap((L) => Object.keys(i18n[L])));
for (const k of all) {
    for (const L of langs) if (!(k in i18n[L])) { console.log(`ASYMMETRIC ${L}.${k}`); bad++; }
}
console.log(bad ? `${bad} problem(s)` : `✓ ${used.size} used keys present in ${langs.join('/')}; tables symmetric`);
process.exit(bad ? 1 : 0);
