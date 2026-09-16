// Finds (and with --apply removes) the premature </div> that closes
// .section-container too early inside the pricing section, leaving one
// unmatched </div> at the end of the page.
//
// Signature: inside <section class="pricing">, the div depth returns to 0 while
// the section is still open, and the very next element re-opens a section-header.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const APPLY = process.argv.includes('--apply');
const files = readdirSync('.')
    .filter((f) => /\.html$/.test(f) && !/backup/.test(f))
    .sort();

const depthOf = (line) =>
    (line.match(/<div\b/g) || []).length - (line.match(/<\/div>/g) || []).length;

let touched = 0, skipped = 0;
for (const f of files) {
    const raw = readFileSync(f, 'utf8');
    const nl = raw.includes('\r\n') ? '\r\n' : '\n';
    const lines = raw.split(/\r?\n/);

    const open = (raw.match(/<div\b/g) || []).length;
    const close = (raw.match(/<\/div>/g) || []).length;
    if (open === close) continue;                       // balanced already
    if (close - open !== 1) { console.log(`?? ${f}: delta ${close - open}, skipped`); skipped++; continue; }

    // locate the pricing section
    let secStart = lines.findIndex((l) => /<section[^>]*class="pricing"/.test(l));
    if (secStart === -1) { console.log(`?? ${f}: no pricing section, skipped`); skipped++; continue; }

    let depth = 0, culprit = -1;
    for (let i = secStart; i < lines.length; i++) {
        if (i > secStart && /<\/section>/.test(lines[i])) break;
        depth += depthOf(lines[i]);
        // depth hits 0 on a line that only closes a div, and content follows
        if (depth === 0 && i > secStart && /^\s*<\/div>\s*$/.test(lines[i])) {
            const next = lines.slice(i + 1, i + 4).join(' ');
            if (/<div\b/.test(next)) { culprit = i; break; }
        }
    }
    if (culprit === -1) { console.log(`?? ${f}: no premature close found, skipped`); skipped++; continue; }

    console.log(`${APPLY ? 'FIX ' : 'FOUND'} ${f}  line ${culprit + 1}: ${lines[culprit].trim()}  -> next: ${lines[culprit + 2]?.trim().slice(0, 60)}`);
    if (APPLY) {
        lines.splice(culprit, 1);
        const out = lines.join(nl);
        const o2 = (out.match(/<div\b/g) || []).length, c2 = (out.match(/<\/div>/g) || []).length;
        if (o2 !== c2) { console.log(`   !! ${f} still unbalanced (${o2}/${c2}), NOT written`); skipped++; continue; }
        writeFileSync(f, out);
    }
    touched++;
}
console.log(`\n${APPLY ? 'fixed' : 'would fix'}: ${touched}, skipped: ${skipped}`);
