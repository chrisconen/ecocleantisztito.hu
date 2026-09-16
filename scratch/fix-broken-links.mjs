// Repairs every mechanically-decidable broken internal link in the Hungarian
// pages. Each rule is deliberate; anything not covered here is left alone and
// reported by scratch/audit-links.mjs.
//
//   node scratch/fix-broken-links.mjs           # dry run
//   node scratch/fix-broken-links.mjs --apply
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';

const APPLY = process.argv.includes('--apply');
const pages = readdirSync('.').filter((f) => /\.html$/.test(f) && !/backup/.test(f));

// Accented spellings of filenames whose ASCII twin is the real file on disk.
const fold = (s) => s
    .replace(/[áà]/g, 'a').replace(/[éè]/g, 'e').replace(/[íì]/g, 'i')
    .replace(/[óöő]/g, 'o').replace(/[úüű]/g, 'u');

// Cities whose "<city>.html" hub page was never built; the flagship service page
// for that city carries the same intent and exists.
const HUB_CITIES = ['gyor', 'sopron', 'szombathely', 'mosonmagyarovar',
    'papa', 'tatabanya', 'tata', 'veszprem'];

// Carpet-cleaning pages that genuinely do not exist for these towns — the whole
// list item is dropped rather than pointed at an unrelated service.
const DROP_LI = [
    'szonyegtisztitas-balatonboglar.html',
    'szonyegtisztitas-balatonfuzfo.html',
    'szonyegtisztitas-balatonkenese.html',
    'szonyegtisztitas-balatonszemes.html',
];

const stats = {};
const bump = (k, n = 1) => { stats[k] = (stats[k] || 0) + n; };

let changedFiles = 0;
for (const f of pages) {
    const before = readFileSync(f, 'utf8');
    let src = before;

    // 1. accented duplicate -> existing ASCII file
    src = src.replace(/(\b(?:href|src)\s*=\s*")([^"]+\.html)(")/gi, (m, a, url, z) => {
        if (/^(https?:|\/\/|#)/i.test(url)) return m;
        const folded = fold(url);
        if (folded !== url && existsSync(folded)) { bump('accented'); return a + folded + z; }
        return m;
    });

    // 2. index_new.html -> index.html
    src = src.replace(/(\b(?:href|src)\s*=\s*")index_new\.html(")/gi, (m, a, z) => { bump('index_new'); return a + 'index.html' + z; });

    // 3. <page>-new.html -> <page>.html when the plain file exists
    src = src.replace(/(\b(?:href|src)\s*=\s*")([a-z0-9-]+)-new\.html(")/gi, (m, a, stem, z) => {
        if (existsSync(`${stem}.html`)) { bump('dash_new'); return `${a}${stem}.html${z}`; }
        return m;
    });

    // 4. <city>.html hub page -> karpittisztitas-<city>.html
    src = src.replace(/(\b(?:href|src)\s*=\s*")([a-z]+)\.html(")/gi, (m, a, city, z) => {
        if (!HUB_CITIES.includes(city) || existsSync(`${city}.html`)) return m;
        if (!existsSync(`karpittisztitas-${city}.html`)) return m;
        bump('city_hub');
        return `${a}karpittisztitas-${city}.html${z}`;
    });

    // 5. favicon.png -> favicon-32x32.png (favicon.png was never shipped)
    src = src.replace(/(\b(?:href|src)\s*=\s*")favicon\.png(")/gi, (m, a, z) => { bump('favicon'); return a + 'favicon-32x32.png' + z; });

    // 6. drop <li> entries pointing at carpet pages that do not exist
    for (const target of DROP_LI) {
        const re = new RegExp(`[ \\t]*<li>\\s*<a href="${target}"[^>]*>[^<]*</a>\\s*</li>\\r?\\n?`, 'gi');
        src = src.replace(re, () => { bump('dropped_li'); return ''; });
    }

    if (src !== before) {
        changedFiles++;
        if (APPLY) writeFileSync(f, src);
    }
}

console.log(APPLY ? 'APPLIED' : 'DRY RUN');
for (const [k, v] of Object.entries(stats)) console.log(`  ${k.padEnd(12)} ${v} link(s)`);
console.log(`  files touched: ${changedFiles}`);
