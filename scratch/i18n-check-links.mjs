// Every relative href/src in en/ must resolve to a file that exists.
// Catches a bad enName() mapping or a missed ../ rewrite before it ships.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const ROOT = process.cwd();
const EN = join(ROOT, process.argv[2] || 'en');
const ABSOLUTE = /^(https?:|\/\/|\/|#|tel:|mailto:|data:|javascript:)/i;

let checked = 0;
const broken = new Map();

for (const f of readdirSync(EN).filter((x) => x.endsWith('.html') && !/backup/.test(x))) {
    const src = readFileSync(join(EN, f), 'utf8');
    for (const m of src.matchAll(/\b(?:href|src|poster)\s*=\s*"([^"]+)"/gi)) {
        const url = m[1].trim();
        if (!url || ABSOLUTE.test(url)) continue;
        let path = url.split(/[?#]/)[0];
        try { path = decodeURIComponent(path); } catch (e) { /* malformed escape, check as-is */ }
        if (!path) continue;
        checked++;
        const target = resolve(dirname(join(EN, f)), path);
        if (!existsSync(target)) {
            if (!broken.has(path)) broken.set(path, new Set());
            broken.get(path).add(f);
        }
    }
}

console.log(`checked ${checked} relative links across ${process.argv[2] || "en"}/`);
if (!broken.size) { console.log('✓ no broken links'); process.exit(0); }
for (const [path, files] of [...broken].slice(0, 15)) {
    console.log(`  MISSING ${path}   (${files.size} page(s), e.g. ${[...files][0]})`);
}
console.log(`✗ ${broken.size} distinct broken target(s)`);
process.exit(1);
