#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// ECO Clean HU → EN page translation pipeline.
//
//   node scratch/i18n.mjs extract   -> scratch/i18n/strings.hu.json + map.json
//   node scratch/i18n.mjs stats     -> dedup report (how much is there to translate)
//   node scratch/i18n.mjs reinject  -> reads strings.en.json, writes en/*.html
//
// The LLM never sees HTML — only a flat {hash: "hungarian"} JSON table. Markup
// can therefore not be mangled by the translator; reinjection is an exact
// byte-offset splice back into a copy of the original file.
//
// ponytail: hand-rolled tokenizer instead of a parser dep — these 68 pages are
// hand-written, well-formed HTML. If a page ever breaks the tokenizer, `verify`
// catches it (tag counts must match the source).
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
// SRC is the tree the Hungarian pages are read from and the English pages are
// written next to. It defaults to the repo root (the build INPUTS), but the
// published site is built from `release/`, whose pages carry the informal-copy
// layer and a different layout — so the shipping English pages must be
// generated with `--src release`.
const SRC = join(REPO, process.env.I18N_SRC || '.');
const ROOT = SRC;
const OUT = join(REPO, 'scratch', 'i18n');
const EN = join(SRC, 'en');

// ── HTML tokenizer ───────────────────────────────────────────────────────────

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr']);
const RAW = new Set(['script', 'style', 'textarea', 'title']);

// Elements whose content is a translation unit when they hold only inline markup.
// Inline tags (a, strong, span, br, …) are deliberately NOT here: keeping them
// out means a sentence wrapped around an <a> stays ONE unit instead of being
// split into untranslatable fragments like ": a tisztító".
const BLOCK = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'td', 'th',
    'dt', 'dd', 'figcaption', 'summary', 'blockquote', 'caption', 'legend',
    'label', 'button', 'option', 'div',
    'section', 'article', 'header', 'footer', 'aside', 'nav', 'main', 'body',
    'ul', 'ol', 'dl', 'table', 'tr', 'thead', 'tbody', 'form', 'fieldset',
    'figure', 'details', 'picture', 'video', 'select', 'address', 'hgroup']);

// Attributes carrying user-visible copy.
const ATTRS = new Set(['alt', 'title', 'placeholder', 'aria-label', 'aria-description']);
// <meta content="..."> only for these name/property values.
const META_KEYS = /^(description|keywords|og:title|og:description|og:image:alt|og:site_name|twitter:title|twitter:description|twitter:image:alt|apple-mobile-web-app-title|application-name)$/i;
// JSON-LD keys whose string values are prose.
const LD_KEYS = new Set(['name', 'description', 'text', 'headline', 'alternateName',
    'disambiguatingDescription', 'jobTitle', 'caption', 'serviceType', 'award',
    'slogan', 'knowsAbout', 'keywords', 'articleBody', 'abstract']);

function tokenize(src) {
    const nodes = [];           // flat list of {type, ...}
    let i = 0;
    while (i < src.length) {
        const lt = src.indexOf('<', i);
        if (lt === -1) { if (i < src.length) nodes.push({ type: 'text', start: i, end: src.length }); break; }
        if (lt > i) nodes.push({ type: 'text', start: i, end: lt });

        if (src.startsWith('<!--', lt)) {
            const e = src.indexOf('-->', lt); i = e === -1 ? src.length : e + 3;
            nodes.push({ type: 'comment', start: lt, end: i }); continue;
        }
        if (src.startsWith('<!', lt)) {
            const e = src.indexOf('>', lt); i = e === -1 ? src.length : e + 1;
            nodes.push({ type: 'decl', start: lt, end: i }); continue;
        }
        const m = /^<(\/?)([a-zA-Z][-a-zA-Z0-9:]*)/.exec(src.slice(lt, lt + 64));
        if (!m) { // stray '<'
            nodes.push({ type: 'text', start: lt, end: lt + 1 }); i = lt + 1; continue;
        }
        const closing = m[1] === '/';
        const name = m[2].toLowerCase();
        // find end of tag, respecting quoted attribute values
        let j = lt + m[0].length, q = null;
        while (j < src.length) {
            const c = src[j];
            if (q) { if (c === q) q = null; }
            else if (c === '"' || c === "'") q = c;
            else if (c === '>') break;
            j++;
        }
        const tagEnd = Math.min(j + 1, src.length);
        const selfClosed = src[j - 1] === '/' || VOID.has(name);
        const attrs = closing ? [] : parseAttrs(src, lt + m[0].length, j);
        nodes.push({ type: closing ? 'close' : 'open', name, start: lt, end: tagEnd, attrs, selfClosed });
        i = tagEnd;

        if (!closing && RAW.has(name) && !selfClosed) {
            const close = src.toLowerCase().indexOf(`</${name}`, i);
            const rawEnd = close === -1 ? src.length : close;
            nodes.push({ type: 'raw', name, start: i, end: rawEnd });
            i = rawEnd;
        }
    }
    return nodes;
}

function parseAttrs(src, from, to) {
    const out = [];
    const re = /([-a-zA-Z0-9:@_.]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
    re.lastIndex = 0;
    const slice = src.slice(from, to);
    let m;
    while ((m = re.exec(slice))) {
        const quoted = m[2][0];
        const valStart = from + m.index + m[0].length - m[2].length + 1;
        const raw = quoted === '"' ? m[3] : m[4];
        out.push({ name: m[1].toLowerCase(), value: raw, start: valStart, end: valStart + raw.length });
    }
    return out;
}

// Build a tree of {name, attrs, contentStart, contentEnd, children}
function buildTree(nodes) {
    const root = { name: '#root', children: [], contentStart: 0, contentEnd: Infinity };
    const stack = [root];
    for (const n of nodes) {
        const top = stack[stack.length - 1];
        if (n.type === 'open') {
            const el = { name: n.name, attrs: n.attrs, tagStart: n.start, contentStart: n.end, children: [], contentEnd: n.end };
            top.children.push(el);
            if (!n.selfClosed) stack.push(el);
        } else if (n.type === 'close') {
            for (let k = stack.length - 1; k > 0; k--) {
                if (stack[k].name === n.name) { stack[k].contentEnd = n.start; stack.length = k; break; }
            }
        } else {
            top.children.push({ name: `#${n.type}`, start: n.start, end: n.end, children: [], raw: n.name });
        }
    }
    return root;
}

// ── extraction ───────────────────────────────────────────────────────────────

const hash = (s) => createHash('sha1').update(s).digest('hex').slice(0, 12);
const hasLetter = (s) => /\p{L}/u.test(s);

// ── inline-tag masking ───────────────────────────────────────────────────────
// A unit's inner HTML is reduced to prose + numbered placeholders before it is
// handed to a translator:
//   'Hívja a <a href="tel:..." class="x">06 70</a> számot'
//        ->  'Hívja a <0>06 70</0> számot'   + tags[0] = '<a href="tel:..." class="x">'
// The translator can move/reorder <0>…</0> but cannot touch hrefs, classes or
// SVG path data. <svg> subtrees collapse to a single void placeholder <N/>.
// Restoring is a pure lookup, so no LLM output can corrupt the markup.

function maskUnit(slice) {
    const nodes = tokenize(slice);
    const tags = [];            // index -> {open, close} raw source
    const stack = [];
    let out = '';
    for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (n.type === 'text' || n.type === 'raw') { out += slice.slice(n.start, n.end); continue; }
        if (n.type === 'comment' || n.type === 'decl') continue;   // dropped, not user copy
        if (n.type === 'open') {
            if (n.name === 'svg') {                                 // swallow whole subtree
                let depth = 1, j = i + 1;
                for (; j < nodes.length && depth > 0; j++) {
                    if (nodes[j].type === 'open' && nodes[j].name === 'svg' && !nodes[j].selfClosed) depth++;
                    else if (nodes[j].type === 'close' && nodes[j].name === 'svg') depth--;
                }
                const end = j < nodes.length ? nodes[j - 1].end : slice.length;
                tags.push({ open: slice.slice(n.start, end), close: null });
                out += `<${tags.length - 1}/>`;
                i = j - 1;
                continue;
            }
            const idx = tags.length;
            tags.push({ open: slice.slice(n.start, n.end), close: n.selfClosed ? null : `</${n.name}>` });
            if (n.selfClosed) out += `<${idx}/>`;
            else { out += `<${idx}>`; stack.push({ idx, name: n.name }); }
            continue;
        }
        if (n.type === 'close') {
            for (let k = stack.length - 1; k >= 0; k--) {
                if (stack[k].name === n.name) { out += `</${stack[k].idx}>`; stack.length = k; break; }
            }
        }
    }
    while (stack.length) { const t = stack.pop(); out += `</${t.idx}>`; }   // unclosed in source
    return { masked: out.replace(/\s+/g, ' ').trim(), tags };
}

// `translateAttrs` rewrites alt/title/placeholder/aria-label INSIDE a preserved
// tag. Those attributes sit within the enclosing unit's span, so translating
// them as separate units would splice two overlapping ranges into the same
// bytes and corrupt the file once the lengths differ — which is exactly what
// turned href="takaritas-balatonalmadi.html" into a mangled path.
function translateAttrs(tagSource, en) {
    if (!en) return tagSource;
    return tagSource.replace(/\b(alt|title|placeholder|aria-label|aria-description)="([^"]*)"/gi,
        (m, attr, value) => {
            const t = en[hash(value.replace(/\s+/g, ' ').trim())];
            return t === undefined ? m : `${attr}="${t.replace(/"/g, '&quot;')}"`;
        });
}

function unmask(masked, tags, en) {
    return masked.replace(/<(\d+)(\/?)>|<\/(\d+)>/g, (m, a, slash, b) => {
        const t = tags[Number(a ?? b)];
        if (!t) return '';                       // translator invented a placeholder
        return b !== undefined ? (t.close ?? '') : translateAttrs(t.open, en);
    });
}

// Prose check that ignores placeholders — drops icon-only links, spacer divs etc.
const proseOf = (masked) => masked.replace(/<\/?\d+\/?>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');
// Strings that are not prose: pure numbers, urls, codes, single emoji, css-ish.
const isNoise = (s) => !hasLetter(s)
    || /^\s*(https?:|mailto:|tel:|\/|#|\{|\}|\.|\d)/.test(s) && !/\s\p{L}{3,}/u.test(s)
    || /^[\s\p{P}\p{S}\d]+$/u.test(s);

function hasBlockDescendant(el) {
    for (const c of el.children) {
        if (c.name.startsWith('#')) continue;
        if (BLOCK.has(c.name) || hasBlockDescendant(c)) return true;
    }
    return false;
}

function extractFile(src, file, units) {
    const tree = buildTree(tokenize(src));
    const push = (start, end, kind) => {
        const text = src.slice(start, end);
        const trimmed = text.trim();
        if (!trimmed) return;
        const lead = text.length - text.trimStart().length;
        // Key on whitespace-normalised, tag-masked text so the same sentence
        // indented differently — or wrapped in a differently-href'd <a> — still
        // dedupes to one translation unit.
        const { masked, tags } = text.includes('<')
            ? maskUnit(trimmed)
            : { masked: trimmed.replace(/\s+/g, ' '), tags: [] };
        if (!masked || isNoise(proseOf(masked))) return;
        units.push({
            file, start: start + lead, end: start + lead + trimmed.length,
            kind, h: hash(masked), hu: masked, tags,
        });
    };

    const walk = (el) => {
        for (const a of el.attrs || []) {
            if (ATTRS.has(a.name)) push(a.start, a.end, `attr:${a.name}`);
            else if (a.name === 'content' && el.name === 'meta') {
                const key = (el.attrs.find((x) => x.name === 'name' || x.name === 'property') || {}).value || '';
                if (META_KEYS.test(key)) push(a.start, a.end, `meta:${key}`);
            } else if (a.name === 'value' && el.name === 'input') {
                const t = (el.attrs.find((x) => x.name === 'type') || {}).value || '';
                if (/^(submit|button|reset)$/i.test(t)) push(a.start, a.end, 'attr:value');
            }
        }
        if (el.name === 'title') { /* raw child handles it */ }

        for (const c of el.children) {
            if (c.name === '#raw') {
                if (c.raw === 'title') push(c.start, c.end, 'title');
                // JSON-LD handled separately below
                continue;
            }
            if (c.name.startsWith('#')) {
                if (c.name === '#text') push(c.start, c.end, 'text');
                continue;
            }
            if (BLOCK.has(c.name) && !hasBlockDescendant(c) && c.contentEnd > c.contentStart) {
                walkAttrsOnly(c);
                push(c.contentStart, c.contentEnd, `inline:${c.name}`);
            } else {
                walk(c);
            }
        }
    };
    const walkAttrsOnly = (el) => {
        for (const a of el.attrs || []) if (ATTRS.has(a.name)) push(a.start, a.end, `attr:${a.name}`);
        for (const c of el.children) if (!c.name.startsWith('#')) walkAttrsOnly(c);
    };

    walk(tree);
    extractJsonLd(src, file, units);
    return units;
}

function extractJsonLd(src, file, units) {
    const re = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>/gi;
    let m;
    while ((m = re.exec(src))) {
        const start = m.index + m[0].length;
        const end = src.indexOf('</script', start);
        if (end === -1) continue;
        const body = src.slice(start, end);
        let data;
        try { data = JSON.parse(body); } catch { continue; }
        const found = [];
        const walk = (node, key) => {
            if (typeof node === 'string') {
                if (LD_KEYS.has(key) && hasLetter(node) && !/^https?:/.test(node)) found.push(node);
            } else if (Array.isArray(node)) node.forEach((v) => walk(v, key));
            else if (node && typeof node === 'object') for (const k of Object.keys(node)) walk(node[k], k);
        };
        walk(data, null);
        for (const s of new Set(found)) {
            units.push({ file, jsonld: start, jsonldEnd: end, kind: 'jsonld', h: hash(s), hu: s });
        }
    }
}

// ── commands ─────────────────────────────────────────────────────────────────

// index.html is included because it is the only page that hosts the booking
// form — without an English copy of it the translated city pages would have to
// send English visitors to a Hungarian booking flow.
function targets() {
    // adatvedelem/aszf exist only in the source tree: release-support/
    // publication-policy.json deliberately omits them from the published
    // package, so they simply drop out when SRC is `release`.
    return ['index.html', 'adatvedelem.html', 'aszf.html', ...readdirSync(ROOT)
        .filter((f) => /^(karpittisztitas|matractisztitas)-.*\.html$/.test(f))
        .filter((f) => !/backup/.test(f))
        .sort()].filter((f) => existsSync(join(ROOT, f)));
}

function runExtract() {
    mkdirSync(OUT, { recursive: true });
    const units = [];
    for (const f of targets()) extractFile(readFileSync(join(ROOT, f), 'utf8'), f, units);
    const strings = {};
    for (const u of units) strings[u.h] = u.hu;
    const sources = {};
    for (const f of targets()) sources[f] = hash(readFileSync(join(ROOT, f), 'utf8'));
    writeFileSync(join(OUT, 'sources.json'), JSON.stringify(sources, null, 2));
    writeFileSync(join(OUT, 'strings.hu.json'), JSON.stringify(strings, null, 2));
    writeFileSync(join(OUT, 'map.json'), JSON.stringify(units));
    return { units, strings };
}

function runStats() {
    const { units, strings } = runExtract();
    const keys = Object.keys(strings);
    const chars = keys.reduce((a, k) => a + strings[k].length, 0);
    const files = new Set(units.map((u) => u.file)).size;
    const byKind = {};
    for (const u of units) byKind[u.kind.split(':')[0]] = (byKind[u.kind.split(':')[0]] || 0) + 1;
    console.log(`files:            ${files}`);
    console.log(`units (raw):      ${units.length}`);
    console.log(`unique strings:   ${keys.length}   (dedup ${(100 - keys.length / units.length * 100).toFixed(1)}%)`);
    console.log(`unique chars:     ${chars.toLocaleString()}  (~${Math.round(chars / 3.5).toLocaleString()} tokens)`);
    console.log(`by kind:`, byKind);
    const long = keys.filter((k) => strings[k].length > 400).length;
    console.log(`strings > 400ch:  ${long}`);
}

// ── reinjection ──────────────────────────────────────────────────────────────

// karpittisztitas-siofok.html -> upholstery-cleaning-siofok.html
// index.html keeps its name; it just lives under en/.
export function enName(huFile) {
    // Two pages are not city pages, so the generic "<service>-<city>" rule would
    // produce nonsense slugs like upholstery-cleaning-matractisztitas.html.
    const SPECIAL = {
        'karpittisztitas-matractisztitas.html': 'upholstery-and-mattress-cleaning.html',
        'karpittisztitas-elotte-utana.html': 'upholstery-cleaning-before-after.html',
        'adatvedelem.html': 'privacy-policy.html',
        'aszf.html': 'terms.html',
    };
    if (SPECIAL[huFile]) return SPECIAL[huFile];
    return huFile
        .replace(/^karpittisztitas-/, 'upholstery-cleaning-')
        .replace(/^matractisztitas-/, 'mattress-cleaning-');
}

// Kept byte-identical to SWITCH_CSS in release-support/english-overlay/build.py,
// which writes the same switcher onto the Hungarian pages.
const SWITCH_CSS = `.lang-switch{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;`
    + `min-width:2.5rem;padding:.45rem .72rem;border:1px solid rgba(64,91,55,.35);`
    + `border-radius:999px;color:#405b37;background:#fff;font-weight:700;font-size:.75rem;`
    + `line-height:1;letter-spacing:.09em;text-decoration:none;white-space:nowrap;`
    + `transition:background-color .15s ease,color .15s ease,border-color .15s ease}`
    + `.lang-switch:hover,.lang-switch:focus-visible{background:#405b37;border-color:#405b37;`
    + `color:#fffef8}`
    + `.header-right{display:flex;align-items:center;justify-content:flex-end;gap:10px}`
    + `@media print{.lang-switch{display:none}}`;

// Both header templates in the package: the modern nav (switcher left of the
// hamburger, after the CTA group on desktop) and the legacy bixol header.
const NAV_ANCHOR = '<button class="nav-mobile-toggle"';
const LEGACY_ANCHOR = '<div class="header-right">';

function langLink(href, label, lang, title) {
    return `<a class="lang-switch" href="${href}" hreflang="${lang}" lang="${lang}"`
        + ` title="${title}" aria-label="${title}">${label}</a>`;
}

// The switcher goes in the header, where people look for it — an earlier
// version floated it in the bottom-right corner and read as a stray button.
// The <style> stays before </body>; a <style> inside <nav> is not conforming.
function stripLangSwitch(html) {
    return html
        .replace(/\n?<!-- i18n language switch -->/g, '')
        .replace(/\n?\s*<a class="lang-switch"[\s\S]*?<\/a>/g, '')
        .replace(/\n?<style>\s*\.lang-switch\{[\s\S]*?<\/style>\n?/g, '');
}

function injectLangSwitch(html, link) {
    html = stripLangSwitch(html);       // re-placing an older switcher must not stack
    if (html.split(NAV_ANCHOR).length - 1 === 1) {
        html = html.replace(NAV_ANCHOR, `${link}\n            ${NAV_ANCHOR}`);
    } else if (html.split(LEGACY_ANCHOR).length - 1 === 1) {
        html = html.replace(LEGACY_ANCHOR, `${LEGACY_ANCHOR}\n                                ${link}`);
    } else {
        throw new Error('No header to anchor the language switcher');
    }
    const style = `\n<!-- i18n language switch -->\n<style>${SWITCH_CSS}</style>\n`;
    return html.includes('</body>')
        ? html.replace(/<\/body>/i, `${style}</body>`)
        : html + style;
}

// Two shapes of booking page exist:
//   * source tree  — loads ../booking-config.js, so the string table goes first
//   * release tree — loads ../ui/booking-live.js, which has a fully translated
//     English twin (booking-live-en.js) built by scratch/build-en-runtime.mjs;
//     the English page must point at that instead.
function injectBookingI18n(html) {
    if (/ui\/booking-live\.js/.test(html)) {
        const en = join(REPO, 'release', 'ui', 'booking-live-en.js');
        if (!existsSync(en)) throw new Error('booking-live-en.js missing — run scratch/build-en-runtime.mjs first');
        const v = createHash('sha256').update(readFileSync(en)).digest('hex').slice(0, 12);
        return html.replace(/\.\.\/ui\/booking-live\.js\?v=[a-f0-9]+/g, `../ui/booking-live-en.js?v=${v}`);
    }
    if (!/booking-config\.js/.test(html) || /booking-i18n\.js/.test(html)) return html;
    return html.replace(/(\s*)(<script src="\.\.\/booking-config\.js)/,
        '$1<script src="../booking-i18n.js"></script>$1$2');
}

const ABSOLUTE = /^(https?:|\/\/|\/|#|tel:|mailto:|data:|javascript:)/i;

// Pages live in en/, so every relative URL gains a ../ — except links to pages
// that were themselves translated, which stay inside en/.
function rewriteUrls(html, translated) {
    // Every attribute verify-package.py treats as a local URL must be rewritten,
    // not just href/src/poster — the lightbox uses data-full/data-zoom/data-src
    // and those pointed at release/en/img/… until they were covered here.
    return html.replace(/\b(href|src|poster|data-src|data-full|data-zoom|data-booking-url)\s*=\s*"([^"]*)"/gi, (m, attr, url) => {
        if (!url || ABSOLUTE.test(url)) return m;
        if (translated.has(url)) return `${attr}="${enName(url)}"`;
        const [path, frag] = url.split(/(?=#)/);
        if (translated.has(path)) return `${attr}="${enName(path)}${frag || ''}"`;
        return `${attr}="../${url}"`;
    });
}

function localiseHead(html, huFile) {
    const enFile = enName(huFile);
    const base = 'https://ecocleantisztito.hu';
    return html
        .replace(/<html([^>]*)\slang="hu"/i, '<html$1 lang="en"')
        .replace(/<html(?![^>]*\slang=)/i, '<html lang="en"')
        // canonical points at the EN page; the hreflang pair goes AFTER the
        // whole tag — the match must consume the closing '>' or the new links
        // land inside the canonical element.
        .replace(/<link[^>]*rel="canonical"[^>]*>/i, () =>
            `<link rel="canonical" href="${base}/en/${enFile}">\n    ` +
            `<link rel="alternate" hreflang="hu" href="${base}/${huFile}">\n    ` +
            `<link rel="alternate" hreflang="en" href="${base}/en/${enFile}">\n    ` +
            `<link rel="alternate" hreflang="x-default" href="${base}/${huFile}">`)
        .replace(/(<meta[^>]*property="og:url"[^>]*content=")([^"]*)(")/i, `$1${base}/en/${enFile}$3`)
        .replace(/(<meta[^>]*property="og:locale"[^>]*content=")([^"]*)(")/i, '$1en_US$3');
}

function runReinject({ identity = false } = {}) {
    const sourceHashes = existsSync(join(OUT, 'sources.json'))
        ? JSON.parse(readFileSync(join(OUT, 'sources.json'), 'utf8')) : {};
    const units = JSON.parse(readFileSync(join(OUT, 'map.json'), 'utf8'));
    const hu = JSON.parse(readFileSync(join(OUT, 'strings.hu.json'), 'utf8'));
    const en = identity ? hu
        : JSON.parse(readFileSync(join(OUT, 'strings.en.json'), 'utf8'));

    const missing = new Set();
    const byFile = new Map();
    for (const u of units) {
        if (u.kind === 'jsonld') continue;                  // handled below
        if (!byFile.has(u.file)) byFile.set(u.file, []);
        byFile.get(u.file).push(u);
    }
    const translated = new Set(byFile.keys());
    if (!identity) mkdirSync(EN, { recursive: true });

    const results = [];
    for (const [file, list] of byFile) {
        let src = readFileSync(join(ROOT, file), 'utf8');
        // Offsets in map.json only mean anything for the exact bytes they were
        // taken from. Anything that edits a source page between extract and
        // reinject (the overlay builder inserting hreflang, for instance) shifts
        // every later offset and splices translations into the middle of tags.
        if (sourceHashes[file] && sourceHashes[file] !== hash(src)) {
            throw new Error(`${file} changed since extract — re-run "extract" before "reinject"`);
        }
        // Nested units (an attribute inside a block that is itself a unit) share
        // bytes with their parent. Splicing both corrupts the file as soon as a
        // translation changes length, so only the outermost unit is spliced —
        // the nested attributes are translated inside its preserved tags by
        // unmask(). Widest-first ordering makes "contained" easy to detect.
        const ordered = [...list].sort((a, b) => a.start - b.start || b.end - a.end);
        const outer = [];
        let reach = -1;
        for (const u of ordered) {
            if (u.start < reach) continue;        // contained in the previous unit
            outer.push(u);
            reach = u.end;
        }
        // descending offset order so earlier splices keep later offsets valid
        for (const u of [...outer].sort((a, b) => b.start - a.start)) {
            let text = en[u.h];
            if (text === undefined) { missing.add(u.h); text = hu[u.h]; }
            src = src.slice(0, u.start) + unmask(text, u.tags, en) + src.slice(u.end);
        }
        src = translateJsonLd(src, en, hu, missing);
        if (identity) { results.push([file, src]); continue; }
        src = injectBookingI18n(localiseHead(rewriteUrls(src, translated), file));
        src = injectLangSwitch(src, langLink(`../${file}`, 'HU', 'hu', 'Magyar változat'));
        writeFileSync(join(EN, enName(file)), src);
        results.push([file, src]);
    }
    return { results, missing, translated };
}

function translateJsonLd(src, en, hu, missing) {
    return src.replace(
        /(<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>)([\s\S]*?)(<\/script>)/gi,
        (m, open, body, close) => {
            let data;
            try { data = JSON.parse(body); } catch { return m; }
            const walk = (node, key) => {
                if (typeof node === 'string') {
                    if (!LD_KEYS.has(key) || !hasLetter(node) || /^https?:/.test(node)) return node;
                    const h = hash(node.replace(/\s+/g, ' ').trim());
                    if (en[h] !== undefined) return en[h];
                    if (hu[h] !== undefined) missing.add(h);
                    return node;
                }
                if (Array.isArray(node)) return node.map((v) => walk(v, key));
                if (node && typeof node === 'object') {
                    const o = {};
                    for (const k of Object.keys(node)) o[k] = walk(node[k], k);
                    return o;
                }
                return node;
            };
            return open + '\n' + JSON.stringify(walk(data, null), null, 4) + '\n    ' + close;
        });
}

// Identity round-trip: re-injecting Hungarian must reproduce the source exactly,
// modulo whitespace collapsed inside translation units. Any other difference is
// a tokenizer/masking bug and would silently corrupt all 68 EN pages.
function runVerify() {
    const { results } = runReinject({ identity: true });
    let bad = 0;
    for (const [file, out] of results) {
        const orig = readFileSync(join(ROOT, file), 'utf8');
        // JSON-LD is re-serialised by design, so compare it as canonical JSON
        // rather than as text; everything else must match character for character.
        const norm = (s) => s
            .replace(/(<script[^>]*application\/ld\+json[^>]*>)([\s\S]*?)(<\/script>)/gi,
                (m, o, body, c) => { try { return o + JSON.stringify(JSON.parse(body)) + c; } catch { return m; } })
            .replace(/\s+/g, ' ').trim();
        if (norm(orig) === norm(out)) continue;
        bad++;
        const a = norm(orig), b = norm(out);
        let i = 0; while (i < a.length && a[i] === b[i]) i++;
        console.log(`✗ ${file}  (len ${a.length} vs ${b.length})`);
        console.log(`   HU: …${a.slice(Math.max(0, i - 70), i + 90)}`);
        console.log(`   RT: …${b.slice(Math.max(0, i - 70), i + 90)}\n`);
        if (bad >= 3) break;
    }
    console.log(bad === 0
        ? `✓ identity round-trip lossless on all ${results.length} files`
        : `✗ ${bad} file(s) differ`);
    process.exit(bad === 0 ? 0 : 1);
}

// hreflang only works when it is reciprocal: the Hungarian page must point at
// the English one as well. Idempotent — re-running does not duplicate the tags.
function runHreflangHu() {
    const base = 'https://ecocleantisztito.hu';
    let touched = 0, skipped = 0;
    for (const file of targets()) {
        const path = join(ROOT, file);
        let src = readFileSync(path, 'utf8');
        // Must match the <link rel="alternate"> form specifically: the language
        // switcher anchor also carries hreflang="en", and a looser test made
        // this skip pages that had the switcher but no alternate links.
        if (/<link[^>]*rel="alternate"[^>]*hreflang="en"/i.test(src)) { skipped++; continue; }
        const links =
            `\n    <link rel="alternate" hreflang="hu" href="${base}/${file}">` +
            `\n    <link rel="alternate" hreflang="en" href="${base}/en/${enName(file)}">` +
            `\n    <link rel="alternate" hreflang="x-default" href="${base}/${file}">`;
        if (/<link[^>]*rel="canonical"[^>]*>/i.test(src)) {
            src = src.replace(/<link[^>]*rel="canonical"[^>]*>/i, (m) => m + links);
        } else {
            src = src.replace(/<\/head>/i, `${links}\n</head>`);
        }
        src = injectLangSwitch(src, langLink(`en/${enName(file)}`, 'EN', 'en', 'English version'));
        writeFileSync(path, src);
        touched++;
    }
    console.log(`hreflang added to ${touched} Hungarian page(s), ${skipped} already had it`);
}

// Adds the English pages to sitemap.xml. Pairing is already declared by the
// reciprocal hreflang tags in each page's <head>, so plain <url> entries suffice.
// Idempotent: existing /en/ entries are left alone.
function runSitemap() {
    const path = join(ROOT, 'sitemap.xml');
    let xml = readFileSync(path, 'utf8');
    const today = new Date().toISOString().replace(/\.\d+Z$/, '+00:00');
    const base = 'https://ecocleantisztito.hu';
    let added = 0;
    const entries = targets()
        .filter((f) => !xml.includes(`/en/${enName(f)}<`))
        .map((f) => {
            added++;
            return `\n<url>\n  <loc>${base}/en/${enName(f)}</loc>\n  <lastmod>${today}</lastmod>\n  <priority>0.80</priority>\n</url>`;
        }).join('');
    if (!added) { console.log('sitemap already contains the English pages'); return; }
    xml = xml.replace(/\s*<\/urlset>/i, `${entries}\n\n</urlset>`);
    writeFileSync(path, xml);
    console.log(`sitemap.xml: added ${added} English URL(s)`);
}

// Re-places the language switcher on the already generated English pages,
// without re-running translation. Used when only the switcher markup changes.
function runReswitch() {
    let touched = 0;
    for (const file of targets()) {
        const path = join(EN, enName(file));
        if (!existsSync(path)) continue;
        const before = readFileSync(path, 'utf8');
        const after = injectLangSwitch(before, langLink(`../${file}`, 'HU', 'hu', 'Magyar változat'));
        if (after !== before) { writeFileSync(path, after); touched++; }
    }
    console.log(`language switcher re-placed on ${touched} English page(s)`);
}

const cmd = process.argv[2] || 'stats';
if (cmd === 'reswitch') runReswitch();
else
if (cmd === 'extract') { runExtract(); console.log('wrote', OUT); }
else if (cmd === 'stats') runStats();
else if (cmd === 'verify') runVerify();
else if (cmd === 'hreflang-hu') runHreflangHu();
else if (cmd === 'sitemap') runSitemap();
else if (cmd === 'reinject') {
    const { results, missing } = runReinject();
    console.log(`wrote ${results.length} pages to ${EN}`);
    if (missing.size) console.log(`⚠ ${missing.size} string(s) had no EN translation — left Hungarian`);
} else { console.error(`unknown command: ${cmd}`); process.exit(1); }
