// Every relative URL in release/ must resolve to a file inside release/.
// verify-package.py enforces exactly this, so failing here means the gate fails.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';

const OUT = resolve('release');
const ABSOLUTE = /^(https?:|\/\/|\/|#|tel:|mailto:|data:|javascript:)/i;
let checked = 0;
const broken = new Map();

function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, entry.name);
        if (entry.isDirectory()) { walk(p); continue; }
        if (!entry.name.endsWith('.html')) continue;
        const src = readFileSync(p, 'utf8');
        // Same attribute list verify-package.py treats as local URLs — the
        // lightbox ones (data-full/data-zoom) are easy to miss and were.
        for (const m of src.matchAll(/\b(?:href|src|poster|data-src|data-full|data-zoom|data-booking-url)\s*=\s*"([^"]+)"/gi)) {
            const url = m[1].trim();
            if (!url || ABSOLUTE.test(url)) continue;
            let path = url.split(/[?#]/)[0];
            if (!path) continue;
            try { path = decodeURIComponent(path); } catch { /* keep raw */ }
            checked++;
            if (!existsSync(resolve(dirname(p), path))) {
                const page = relative(OUT, p).split('\\').join('/');
                if (!broken.has(path)) broken.set(path, new Set());
                broken.get(path).add(page);
            }
        }
    }
}
walk(OUT);

console.log(`checked ${checked} relative links across release/`);
if (!broken.size) { console.log('✓ no broken links'); process.exit(0); }
for (const [path, pages] of [...broken].slice(0, 15)) {
    console.log(`  MISSING ${path}   (${pages.size} page(s), e.g. ${[...pages][0]})`);
}
console.log(`✗ ${broken.size} distinct broken target(s)`);
process.exit(1);
