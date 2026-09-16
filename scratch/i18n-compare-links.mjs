// Proves the generator introduced no NEW broken links: every broken target in
// en/ must already be broken in the Hungarian source it was generated from.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const ROOT = process.cwd();
const ABSOLUTE = /^(https?:|\/\/|\/|#|tel:|mailto:|data:|javascript:)/i;

function brokenIn(dir) {
    const base = join(ROOT, dir);
    const out = new Set();
    for (const f of readdirSync(base).filter((x) => x.endsWith('.html') && !/backup/.test(x))) {
        const src = readFileSync(join(base, f), 'utf8');
        for (const m of src.matchAll(/\b(?:href|src|poster)\s*=\s*"([^"]+)"/gi)) {
            const url = m[1].trim();
            if (!url || ABSOLUTE.test(url)) continue;
            let p = url.split(/[?#]/)[0];
            try { p = decodeURIComponent(p); } catch (e) { /* keep raw */ }
            if (!p) continue;
            if (!existsSync(resolve(dirname(join(base, f)), p))) {
                out.add(p.replace(/^\.\.\//, ''));   // compare by repo-root-relative target
            }
        }
    }
    return out;
}

const hu = brokenIn('.');
const en = brokenIn('en');
const introduced = [...en].filter((t) => !hu.has(t));

console.log(`broken targets — Hungarian source: ${hu.size}, English output: ${en.size}`);
if (introduced.length) {
    console.log(`✗ ${introduced.length} link(s) broken ONLY in the English output:`);
    for (const t of introduced.slice(0, 20)) console.log('   ' + t);
    process.exit(1);
}
console.log('✓ every broken link in en/ is already broken in the Hungarian source');
console.log('  (the generator introduced none; these are pre-existing site issues)');
