"""Audit-javítások (2026-11-23): kiadási réteg a b2b-hygiene csomag fölött.

    python release-support/site-fixes/build.py

Két dolgot csinál:
  1. patches/*.json: szövegcserék {glob, old, new, why}. A glob a release/-hez képest értendő, a `*` nem lép át
     könyvtárhatárt, a `**/` igen. Glob nélküli (sima) útvonalnál az `old` pontosan egyszer szerepelhet; minden
     szabálynak legalább egy fájlban találnia kell (elavult szabály = hiba). Minden találat az EREDETI szövegen
     keresendő, a cserék nem fedhetik egymást.
  2. legal/*.html: új jogi oldalak (adatkezelési tájékoztató, ÁSZF, magyarul és angolul) közös keretben.
Minden cserét rögzít (overlay.json), így a verify-site-fixes-overlay.py bájtra pontosan visszaállítja a szülőt
(b2b-hygiene), és lefuttatja annak teljes, változatlan ellenőrzési láncát. Újrafuttatható: ha a réteg már rajta
van, előbb visszaállítja a szülőt.
"""
import hashlib
import html
import json
import posixpath
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
REL = ROOT / 'release'
MANIFEST = ROOT / 'release-support/release-manifest.json'
REPORT = ROOT / 'release-support/release-verification.json'
OVERLAY = HERE / 'overlay.json'
BASELINE, BASE_REPORT = HERE / 'baseline-manifest.json', HERE / 'baseline-verification.json'
KEY = 'siteFixesOverlay'
TEXT = ('.html', '.js', '.css', '.json', '.txt', '.xml')
sha = lambda b: hashlib.sha256(b).hexdigest()


def inputs():
    """A réteg forrásai (hash-sel rögzítve az overlay-ben)."""
    return sorted(p for p in HERE.rglob('*') if p.is_file() and p.suffix in ('.py', '.json', '.html')
                  and p.name not in ('overlay.json', 'baseline-manifest.json', 'baseline-verification.json')
                  and '__pycache__' not in p.parts)


def glob_re(g):
    out, i = '', 0
    while i < len(g):
        if g.startswith('**/', i):
            out += '(?:.*/)?'; i += 3
        elif g[i] == '*':
            out += '[^/]*'; i += 1
        elif g[i] == '?':
            out += '[^/]'; i += 1
        else:
            out += re.escape(g[i]); i += 1
    return re.compile(out + r'\Z')


def load_patches():
    rules = []
    for p in sorted((HERE / 'patches').glob('*.json')):
        for k, r in enumerate(json.loads(p.read_text(encoding='utf-8-sig'))):
            assert r['old'] and r['old'] != r['new'], f'{p.name}#{k}: üres vagy változatlan csere'
            rules.append(dict(r, src=f'{p.name}#{k}', rx=glob_re(r['glob']), exact=not any(c in r['glob'] for c in '*?')))
    return rules


RULES = load_patches()


def inject(name, before, hits=None, rules=None):
    """Az összes illeszkedő szabály alkalmazása; visszaadja az új bájtokat és a [pozíció, régi, új] listát."""
    if not name.endswith(TEXT):
        return before, []
    s = before.decode('utf-8')
    spans = []
    for r in (RULES if rules is None else rules):
        if not r['rx'].match(name):
            continue
        n, at = 0, s.find(r['old'])
        while at >= 0:
            spans.append((at, at + len(r['old']), r['new'], r['src'])); n += 1
            at = s.find(r['old'], at + len(r['old']))
        want = r.get('count', 1 if r['exact'] else None)
        if want is not None:
            assert n == want, f"{r['src']}: {name} – {n} találat, {want} kell"
        if n and hits is not None:
            hits[r['src']] = hits.get(r['src'], 0) + n
    spans.sort()
    for a, b in zip(spans, spans[1:]):
        assert a[1] <= b[0], f'{name}: átfedő cserék {a[3]} és {b[3]}'
    out, last, edits = [], 0, []
    for a, b, new, _ in spans:
        out += [s[last:a], new]; edits.append([a, s[a:b], new]); last = b
    out.append(s[last:])
    return ''.join(out).encode('utf-8'), edits


def restore(data, edits):
    """Az overlay.json szerinti cserék visszafordítása."""
    s, out, cur, shift = data.decode('utf-8'), [], 0, 0
    for pos, old, new in edits:
        at = pos + shift
        assert s[at:at + len(new)] == new, 'Csere nem található'
        out += [s[cur:at], old]; cur = at + len(new); shift += len(new) - len(old)
    out.append(s[cur:])
    return ''.join(out).encode('utf-8')


# --------------------------------------------------------------------------------------------
# Cache-bust: a módosított assetek ?v= hashe (sha256[:12]) a HTML-ben is frissül
# --------------------------------------------------------------------------------------------
BUST = 'f8-cachebust.json'
VREF = re.compile(r'(?:src|href)="([^"?#]+)\?v=([0-9a-f]{12})"')


def vrefs(name, html_text):
    for m in VREF.finditer(html_text):
        yield posixpath.normpath(posixpath.join(posixpath.dirname(name), m.group(1))), m.group(2)


def write_bust(parent):
    """patches/f8-cachebust.json újragenerálása a szülő assetek + a többi szabály alapján (Cloudflare 1 éves asset-cache miatt kell)."""
    static = [r for r in RULES if not r['src'].startswith(BUST)]
    refs = {}
    for n in parent['files']:
        if n.endswith('.html'):
            for path, h in vrefs(n, (REL / n).read_text(encoding='utf-8')):
                refs.setdefault((path, h), n)
    rules = []
    for (path, h) in sorted(refs):
        if path in parent['files']:
            new = sha(inject(path, (REL / path).read_bytes(), rules=static)[0])[:12]
            if new != h:
                rules.append(dict(glob='**/*.html', old=f'{path}?v={h}', new=f'{path}?v={new}', why='F8: a réteg módosította az assetet; új hash, különben az 1 éves cache a régit adná'))
    (HERE / 'patches' / BUST).write_text(json.dumps(rules, ensure_ascii=False, indent=1) + '\n', encoding='utf-8', newline='\n')


# --------------------------------------------------------------------------------------------
# Jogi oldalak
# --------------------------------------------------------------------------------------------
BASE = 'https://ecocleantisztito.hu/'
LEGAL = {  # forrás -> (kimenet, nyelv, párja)
    'adatvedelem.html': ('adatvedelem.html', 'hu', 'en/privacy.html'),
    'aszf.html': ('aszf.html', 'hu', 'en/terms.html'),
    'en-privacy.html': ('en/privacy.html', 'en', 'adatvedelem.html'),
    'en-terms.html': ('en/terms.html', 'en', 'aszf.html'),
}
CSS = ('.lg-top{display:flex;justify-content:space-between;align-items:center;gap:16px;max-width:880px;margin:0 auto;padding:18px 16px}'
       '.lg-top a{color:inherit;text-decoration:none;font-weight:600}.lg-top .lg-book{border:1px solid currentColor;border-radius:999px;padding:8px 16px}'
       '.lg{max-width:760px;margin:0 auto;padding:8px 16px 64px;line-height:1.65;font-size:1rem}'
       '.lg h1{font-size:clamp(1.9rem,5vw,2.6rem);line-height:1.15;margin:16px 0 8px}.lg h2{font-size:1.3rem;margin:36px 0 8px}'
       '.lg h3{font-size:1.05rem;margin:22px 0 6px}.lg .lg-lead{font-size:1.08rem;opacity:.85}.lg ul{padding-left:1.2em}.lg li{margin:4px 0}'
       '.lg table{width:100%;border-collapse:collapse;font-size:.93rem;margin:12px 0}.lg th,.lg td{border:1px solid rgba(127,127,127,.35);padding:8px;text-align:left;vertical-align:top}'
       '.lg .lg-box{border:1px solid rgba(127,127,127,.35);border-radius:12px;padding:12px 16px;margin:16px 0}.lg a{text-decoration:underline}'
       '.lg .lg-meta{font-size:.9rem;opacity:.75;margin-top:40px}@media (max-width:600px){.lg table{display:block;overflow-x:auto}}')
UI = {
    'hu': dict(home='index.html', book='megrendeles.html', book_txt='Online foglalás', skip='Ugrás a tartalomhoz',
               other='English', locale='hu_HU'),
    'en': dict(home='index.html', book='booking.html', book_txt='Book online', skip='Skip to content',
               other='Magyar', locale='en_GB'),
}


def footer_strip(lang, prefix=''):
    if lang == 'hu':
        return (f'<div class="eco-legal" style="max-width:1200px;margin:0 auto;padding:14px 16px 6px;font-size:.8rem;line-height:1.6;text-align:center;opacity:.85">'
                f'Chris Conen e.v. – ECO Clean kárpit- és matractisztítás · 9134 Bodonhely, Lepke utca 9. · Nyilvántartási szám: 54933347 · Adószám: 56302415-1-28 · '
                f'<a href="{prefix}adatvedelem.html" style="color:inherit;text-decoration:underline">Adatkezelési tájékoztató</a> · '
                f'<a href="{prefix}aszf.html" style="color:inherit;text-decoration:underline">ÁSZF</a></div>')
    return ('<div class="eco-legal" style="max-width:1200px;margin:0 auto;padding:14px 16px 6px;font-size:.8rem;line-height:1.6;text-align:center;opacity:.85">'
            'Chris Conen e.v. – ECO Clean kárpit- és matractisztítás · Lepke utca 9, 9134 Bodonhely, Hungary · Reg. no. 54933347 · Tax no. 56302415-1-28 · '
            f'<a href="{prefix}privacy.html" style="color:inherit;text-decoration:underline">Privacy notice</a> · '
            f'<a href="{prefix}terms.html" style="color:inherit;text-decoration:underline">Terms</a></div>')


def legal_page(src, out, lang, pair):
    raw = (HERE / 'legal' / src).read_text(encoding='utf-8')
    meta = dict(re.findall(r'<!--\s*(\w+):\s*(.*?)\s*-->', raw[:600]))
    body = re.sub(r'\A(?:\s*<!--.*?-->)+\s*', '', raw, flags=re.S)
    up = '../' if out.startswith('en/') else ''
    hu_url, en_url = (BASE + out, BASE + pair) if lang == 'hu' else (BASE + pair, BASE + out)
    ui = UI[lang]
    donor = (REL / 'matractisztitas-cegeknek.html').read_text(encoding='utf-8')
    css = re.search(r'<link rel="stylesheet" href="ui/design\.css\?v=[0-9a-f]+">', donor).group(0).replace('href="', f'href="{up}')
    https = re.search(r'<script>if\(location\.protocol.*?</script>', donor).group(0)
    fonts = re.search(r'<link rel="preconnect" href="https://fonts\.googleapis\.com">.*?display=swap">', donor, re.S).group(0)
    title, desc = html.escape(meta['title']), html.escape(meta['description'])
    other = pair if lang == 'hu' else '../' + pair
    other_href = other if lang == 'hu' else other
    return (f'<!DOCTYPE html><html lang="{lang}"><head>{https}<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n'
            f'<title>{title}</title><meta name="description" content="{desc}"><link rel="canonical" href="{BASE + out}"><meta name="robots" content="index,follow">\n'
            f'<link rel="alternate" hreflang="hu" href="{hu_url}"><link rel="alternate" hreflang="en" href="{en_url}"><link rel="alternate" hreflang="x-default" href="{hu_url}">\n'
            f'<meta name="theme-color" content="#f8f7f2"><link rel="icon" href="{up}favicon-32x32.png">{fonts}\n{css}<style>{CSS}</style>\n'
            f'<meta property="og:locale" content="{ui["locale"]}"><meta property="og:type" content="website"><meta property="og:site_name" content="ECO Clean"><meta property="og:title" content="{title}"><meta property="og:description" content="{desc}"><meta property="og:url" content="{BASE + out}">\n'
            f'</head><body class="eco-site"><a href="#main-content" class="skip-link">{ui["skip"]}</a>\n'
            f'<header class="lg-top"><a href="{ui["home"]}" class="lg-logo">ECO Clean</a><span><a href="{other_href}" lang="{"en" if lang == "hu" else "hu"}">{ui["other"]}</a> · <a class="lg-book" href="{ui["book"]}">{ui["book_txt"]}</a></span></header>\n'
            f'<main id="main-content" class="lg">\n{body.strip()}\n</main>\n'
            f'<footer class="footer" role="contentinfo">{footer_strip(lang)}</footer>\n</body></html>\n')


# --------------------------------------------------------------------------------------------
# Kiadás: szülő visszaállítása, építés, manifest + jelentés + overlay
# --------------------------------------------------------------------------------------------
def build():
    manifest = json.loads(MANIFEST.read_bytes())
    if manifest.get(KEY):  # újrafuttatás: előbb vissza a szülőhöz
        old = json.loads(OVERLAY.read_bytes())
        for name, rec in old['files'].items():
            (REL / name).write_bytes(restore((REL / name).read_bytes(), rec['edits']))
        for name in old['added']:
            (REL / name).unlink()
        MANIFEST.write_bytes(BASELINE.read_bytes())
        REPORT.write_bytes(BASE_REPORT.read_bytes())
    else:
        BASELINE.write_bytes(MANIFEST.read_bytes())
        BASE_REPORT.write_bytes(REPORT.read_bytes())
    parent = json.loads(BASELINE.read_bytes())
    assert json.loads(BASE_REPORT.read_bytes())['manifestSha256'] == sha(BASELINE.read_bytes())
    assert parent.get('b2bOverlay') and not parent.get(KEY)
    for name in parent['files']:
        assert sha((REL / name).read_bytes()) == parent['files'][name]['sha256'], 'A szülőcsomag eltér: ' + name
    global RULES
    write_bust(parent)
    RULES = load_patches()

    edited, hits, added = {}, {}, {}
    try:
        for name in parent['files']:
            before = (REL / name).read_bytes()
            after, edits = inject(name, before, hits)
            if edits:
                edited[name] = dict(beforeSha256=sha(before), afterSha256=sha(after), edits=edits)
                (REL / name).write_bytes(after)
        stale = [r['src'] for r in RULES if r['src'] not in hits]
        assert not stale, 'Szabály, ami sehol sem talál: ' + ', '.join(stale)
        for src, (out, lang, pair) in LEGAL.items():
            assert out not in parent['files'], out
            doc = legal_page(src, out, lang, pair).encode('utf-8')
            added[out] = dict(sha256=sha(doc), bytes=len(doc), source='release-support/site-fixes')
            (REL / out).write_bytes(doc)
        check(parent, edited, added)
    except BaseException:  # félbemaradt építés: vissza a szülőhöz, hogy újrafuttatható maradjon
        for name, rec in edited.items():
            if sha((REL / name).read_bytes()) == rec['afterSha256']:
                (REL / name).write_bytes(restore((REL / name).read_bytes(), rec['edits']))
        for name in added:
            (REL / name).unlink(missing_ok=True)
        MANIFEST.write_bytes(BASELINE.read_bytes()); REPORT.write_bytes(BASE_REPORT.read_bytes())
        raise

    overlay = dict(version=1, parentSha256=sha(BASELINE.read_bytes()), reportSha256=sha(BASE_REPORT.read_bytes()),
                   inputs={p.relative_to(HERE).as_posix(): sha(p.read_bytes()) for p in inputs()},
                   hits=dict(sorted(hits.items())), files=edited, added=added)
    OVERLAY.write_text(json.dumps(overlay, ensure_ascii=False, indent=1), encoding='utf-8', newline='\n')
    files = dict(parent['files'])
    for name, rec in edited.items():
        data = (REL / name).read_bytes()
        files[name] = dict(parent['files'][name], sha256=sha(data), bytes=len(data))
    files.update(added)
    new = dict(parent, files=dict(sorted(files.items())), **{KEY: dict(path='release-support/site-fixes/overlay.json', sha256=sha(OVERLAY.read_bytes()))})
    MANIFEST.write_text(json.dumps(new, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    report = json.loads(BASE_REPORT.read_bytes())
    report.update(manifestSha256=sha(MANIFEST.read_bytes()), siteFixes=dict(rules=len(RULES), editedFiles=len(edited), addedFiles=len(added)), issues=[])
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(f'{len(RULES)} szabály, {sum(hits.values())} csere, {len(edited)} módosított fájl, {len(added)} új oldal. Önellenőrzés rendben.')


BANNED = re.compile(r'99[,.]9|elpusztít|kórokozó|baktérium|vírus|atkamentes|allergiamentes|csíramentes|fertőtlenít|sanitis|disinfect|'
                    r'\bkills?\b|bacteria|virus|pathogen|mite-free|allergen-free|hamarosan elérhető|coming soon|'
                    r'pénzvisszafizet|visszaadjuk a pénz|money-back|refund your money', re.I)  # nincs pénzvisszafizetés (tulaj, 2026-11-23)
NEGATIONS = ('nem ígérünk „atkamentességet”, fertőtlenítést vagy allergiamentes szobát', 'kártevőirtást vagy az egészségügyi fertőtlenítést',
             'pénzvisszafizetést nem tartalmaz', 'it does not include a money-back promise')


def visible(doc):
    attrs = ' '.join(re.findall(r'(?:content|alt|title|aria-label|placeholder)="([^"]*)"', doc))
    return attrs + ' ' + re.sub(r'<(script|style)\b(?![^>]*ld\+json).*?</\1>|<[^>]+>', ' ', doc, flags=re.S)


def check(parent, edited, added):
    pages = [n for n in list(parent['files']) + list(added) if n.endswith(('.html', '.js'))]
    leftovers = {}
    for n in pages:
        doc = (REL / n).read_text(encoding='utf-8')
        if 'http-equiv="refresh"' in doc or n.startswith('google'):
            continue
        text = visible(doc) if n.endswith('.html') else doc
        for neg in NEGATIONS:
            text = text.replace(neg, '')
        found = sorted({m.group(0).lower() for m in BANNED.finditer(text)})
        if found:
            leftovers[n] = found
        if '<footer' in doc:
            assert doc.count('class="eco-legal"') == 1, ('jogi sáv', n)
        for data in re.findall(r'<script type="application/ld\+json">(.*?)</script>', doc, re.S):
            json.loads(data)
    allow = json.loads((HERE / 'allowed-leftovers.json').read_text(encoding='utf-8')) if (HERE / 'allowed-leftovers.json').exists() else {}
    bad = {n: w for n, w in leftovers.items() if set(w) - set(allow.get(n, []))}
    assert not bad, 'Tiltott állítás maradt: ' + json.dumps(bad, ensure_ascii=False)[:3000]
    for n, rec in edited.items():
        assert sha(restore((REL / n).read_bytes(), rec['edits'])) == parent['files'][n]['sha256'], ('visszaállítás', n)
    for n in pages:  # minden ?v= hash a tényleges tartalomé (1 éves asset-cache mellett ez kötelező)
        if n.endswith('.html'):
            for path, h in vrefs(n, (REL / n).read_text(encoding='utf-8')):
                if (REL / path).is_file():
                    assert sha((REL / path).read_bytes())[:12] == h, ('elavult ?v= hash', n, path)
    for n in added:
        doc = (REL / n).read_text(encoding='utf-8')
        assert '[KITÖLTENDŐ]' not in doc and doc.count('<h1') == 1, n
        for ref in set(re.findall(r'(?:src|href)="(?![a-z]+:|#)([^"#?]+)', doc)):
            assert (REL / n).parent.joinpath(ref).resolve().is_file(), (n, ref)


if __name__ == '__main__':
    build()
