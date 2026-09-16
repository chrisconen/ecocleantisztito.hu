// Groups every broken relative link in the Hungarian site by likely cause,
// so each class can be fixed deliberately instead of one-by-one.
import { readdirSync, readFileSync, existsSync } from 'node:fs';

const ABSOLUTE = /^(https?:|\/\/|\/|#|tel:|mailto:|data:|javascript:)/i;
const pages = readdirSync('.').filter((f) => /\.html$/.test(f) && !/backup/.test(f));

const broken = new Map();   // target -> Set(pages)
for (const f of pages) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/\b(?:href|src|poster)\s*=\s*"([^"]+)"/gi)) {
        const url = m[1].trim();
        if (!url || ABSOLUTE.test(url)) continue;
        let p = url.split(/[?#]/)[0];
        try { p = decodeURIComponent(p); } catch (e) { /* keep raw */ }
        if (!p) continue;
        if (!existsSync(p)) {
            if (!broken.has(p)) broken.set(p, new Set());
            broken.get(p).add(f);
        }
    }
}

// Does an ASCII-folded twin exist on disk? (kárpittisztítás-gyor -> karpittisztitas-gyor)
const fold = (s) => s
    .replace(/[áà]/g, 'a').replace(/[éè]/g, 'e').replace(/[íì]/g, 'i')
    .replace(/[óöő]/g, 'o').replace(/[úüű]/g, 'u')
    .replace(/[ÁÀ]/g, 'A').replace(/[ÉÈ]/g, 'E').replace(/[Í]/g, 'I')
    .replace(/[ÓÖŐ]/g, 'O').replace(/[ÚÜŰ]/g, 'U');

const groups = { accented: [], missingPage: [], missingImage: [], other: [] };
for (const [target, users] of broken) {
    const entry = { target, pages: users.size, twin: null };
    const folded = fold(target);
    if (folded !== target && existsSync(folded)) { entry.twin = folded; groups.accented.push(entry); continue; }
    if (/\.(webp|jpe?g|png|gif|svg|avif)$/i.test(target)) { groups.missingImage.push(entry); continue; }
    if (/\.html$/i.test(target)) { groups.missingPage.push(entry); continue; }
    groups.other.push(entry);
}

const show = (name, list) => {
    console.log(`\n── ${name} (${list.length} distinct) ──`);
    for (const e of list.sort((a, b) => b.pages - a.pages)) {
        console.log(`  ${String(e.pages).padStart(3)} pages  ${e.target}${e.twin ? `   -> ${e.twin} EXISTS` : ''}`);
    }
};
show('ACCENTED DUPLICATE — ASCII twin exists, mechanically fixable', groups.accented);
show('MISSING PAGE — needs a decision', groups.missingPage);
show('MISSING IMAGE', groups.missingImage);
show('OTHER', groups.other);
console.log(`\ntotal distinct broken targets: ${broken.size}`);
