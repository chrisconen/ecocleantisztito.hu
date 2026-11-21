"""Matractisztítás cégeknek: gyűjtőoldal + 20 vármegyei oldal, bekötve az egész magyar oldalba.

    python release-support/b2b-hygiene/build.py

Kiadási réteg a content-clarity csomag fölött. Új fájlokat ad a release/-hez (oldalak, ui/b2b-hygiene.*,
assets/b2b/*), a meglévő magyar oldalakba pedig csak beszúr: menüpont, láblécsor, ajánlatkérő sáv, sitemap,
llms.txt. Minden beszúrást rögzít (overlay.json), így a verify-b2b-overlay.py bájtra pontosan visszaállítja
a szülőcsomagot, és lefuttatja annak teljes, változatlan ellenőrzési láncát. Újrafuttatható: ha a réteg
már rajta van, előbb visszaállítja a szülőt. Az assets/b2b képeket a prepare_images.py készíti (egyszeri).
"""
import hashlib
import html
import json
import re
import sys
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
REL = ROOT / 'release'
sys.path.insert(0, str(HERE))
from content import (ART, ASSURE, CITY_COUNTY, CORE, COUNTIES, FAQ_GENERAL, HUB, LAW, LAW_FILTER, MIN_CORE, MIN_FAR,  # noqa: E402
                     SEG_ART, SEG_ORDER, SEGMENTS, STEPS, VERDICT)

BASE = 'https://ecocleantisztito.hu/'
HUB_PAGE = 'matractisztitas-cegeknek'
PHONE, PHONE_TXT, MAIL = '+36702408141', '06 70 240 8141', 'info@ecocleantisztito.hu'
MANIFEST = ROOT / 'release-support/release-manifest.json'
REPORT = ROOT / 'release-support/release-verification.json'
OVERLAY = HERE / 'overlay.json'
BASELINE, BASE_REPORT = HERE / 'baseline-manifest.json', HERE / 'baseline-verification.json'
KSH = json.loads((HERE / 'data/ksh-2025.json').read_text(encoding='utf-8-sig'))
MAP = json.loads((HERE / 'data/hu-map.json').read_text(encoding='utf-8'))
BY = {c['slug']: c for c in COUNTIES}
MONTHS = ['január', 'február', 'március', 'április', 'május', 'június', 'július', 'augusztus', 'szeptember', 'október', 'november', 'december']
MON = ['jan', 'febr', 'márc', 'ápr', 'máj', 'jún', 'júl', 'aug', 'szept', 'okt', 'nov', 'dec']
NB = ' '
e = html.escape
sha = lambda b: hashlib.sha256(b).hexdigest()
ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>'
HTTPS = '<script>if(location.protocol==="http:"&&/^(www\\.)?ecocleantisztito\\.hu$/.test(location.hostname)){location.replace("https://ecocleantisztito.hu"+location.pathname+location.search+location.hash)}</script>'
FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&amp;family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&amp;display=swap">')


CUR, SM = ' aria-current="page"', 'class="sm"'


def attr(name, value):
    return f' {name}="{value}"' if value else ''


def num(n):
    return f'{n:,}'.replace(',', NB)


def dec(x, d=1):
    return f'{x:.{d}f}'.replace('.', ',')


def minimum(slug):
    return MIN_CORE if slug in CORE else MIN_FAR


def page_of(slug):
    return f'{HUB_PAGE}-{slug}' if slug else HUB_PAGE


def url(page):
    return f'{BASE}{page}.html'


def v(path):
    return sha((REL / path).read_bytes())[:12]


def season(slug):
    """A három legcsendesebb hónap (téli sorrendben) és arányuk az éves forgalomban."""
    m = KSH['areas'][slug]['monthly']
    quiet = sorted(sorted(range(12), key=lambda i: m[i])[:3], key=lambda i: (i + 2) % 12)
    share = sum(m[i] for i in quiet) / sum(m) * 100
    names = [MONTHS[i] for i in quiet]
    return quiet, f'{names[0]}, {names[1]} és {names[2]}', dec(share)


def fill(text, c):
    _, q_months, q_share = season(c['slug'])
    return text.format(min=minimum(c['slug']), q_months=q_months, q_share=q_share, loc=c['loc'])


def nights_tile(n):
    if n >= 1_000_000:
        return f'<span data-count="{n / 1e6:.1f}" data-dec="1">{dec(n / 1e6)}</span><small>millió</small>'
    return f'<span data-count="{round(n / 1000)}">{round(n / 1000)}</span><small>ezer</small>'


def img(name, alt, sizes, eager=False, cls=''):
    lazy = ' fetchpriority="high"' if eager else ' loading="lazy" decoding="async"'
    c = f' class="{cls}"' if cls else ''
    return (f'<img{c} src="assets/b2b/szalloda-matrac-{name}-800.webp" srcset="assets/b2b/szalloda-matrac-{name}-800.webp 800w, '
            f'assets/b2b/szalloda-matrac-{name}-1600.webp 1600w" sizes="{sizes}" width="1600" height="1067" alt="{e(alt)}"{lazy}>')


# --------------------------------------------------------------------------------------------
# Közös keret: menü és lábléc a ui/design.css osztályaival, mobilmenü a ui/rollout.js-szel
# --------------------------------------------------------------------------------------------
NAV_ITEMS = [('#szallashelyek', 'Szálláshelyek'), ('#jog', 'Jogi háttér'), ('#tanusitvany', 'Tanúsítvány'), ('#folyamat', 'Folyamat'), ('#varmegyek', 'Vármegyék'), ('#gyik', 'GYIK')]


def nav(c):
    area = f'Cégeknek · {c["name"]}' if c else 'Matractisztítás cégeknek'
    items = ''.join(f'<li class="eco-local-nav-item"><a class="nav-link eco-local-link" href="{h}">{t}</a></li>' for h, t in NAV_ITEMS)
    home = '<li class="eco-local-nav-item"><a class="nav-link eco-local-link" href="index.html">Lakossági tisztítás</a></li>'
    return f'''<a href="#main-content" class="skip-link">Ugrás a tartalomhoz</a>
<div class="mobile-menu-overlay"></div>
<nav class="nav-mobile"><div class="nav-mobile-menu-inner"><ul class="nav-mobile-menu eco-local-nav" aria-label="{e(area)}"><li class="eco-local-area">{e(area)}</li>{items}{home}</ul>
<div class="nav-mobile-cta"><a href="#ajanlat" class="btn btn-primary">Ajánlatkérés</a><a href="tel:{PHONE}" class="btn btn-primary">{PHONE_TXT}</a></div></div></nav>
<nav class="nav" id="nav" role="navigation" aria-label="Fő navigáció"><div class="nav-container">
<a href="index.html" class="nav-logo" aria-label="ECO Clean – Főoldal"><div class="nav-logo-icon">ECO</div><div class="nav-logo-text">Clean <span>Matractisztítás cégeknek</span></div></a>
<ul class="nav-main eco-local-nav" aria-label="{e(area)}">{items}</ul>
<div class="nav-cta"><a href="#ajanlat" class="btn btn-primary">Ajánlatkérés</a></div>
<button class="nav-mobile-toggle" aria-label="Menü"><span></span><span></span><span></span></button>
</div></nav>'''


def footer():
    firms = ''.join(f'<li><a href="{page_of(s)}.html">{e(BY[s]["name"])}</a></li>' for s in ('budapest', 'gyor-moson-sopron', 'veszprem', 'zala', 'hajdu-bihar'))
    return f'''<footer class="footer" role="contentinfo" aria-label="Lábléc"><div class="footer-grid">
<div class="footer-brand"><a href="index.html" class="nav-logo"><div class="nav-logo-icon">ECO</div><div class="nav-logo-text">Clean <span>: a tisztító</span></div></a>
<p>Helyszíni matractisztítás szállodáknak, panzióknak, kollégiumoknak és munkásszállóknak – az ország mind a 19 vármegyéjében és Budapesten, objektumonként tanúsítvánnyal.</p></div>
<div class="footer-column"><h4>Cégeknek</h4><ul><li><a href="{HUB_PAGE}.html">Matractisztítás cégeknek</a></li>{firms}</ul></div>
<div class="footer-column"><h4>Lakossági</h4><ul><li><a href="karpittisztitas-gyor.html">Kárpittisztítás</a></li><li><a href="matractisztitas-gyor.html">Matractisztítás</a></li><li><a href="szonyegtisztitas-gyor.html">Szőnyegtisztítás</a></li><li><a href="karpittisztito-gep-berles.html">Gépbérlés</a></li></ul></div>
<div class="footer-column"><h4>Kapcsolat</h4><ul><li><a href="tel:{PHONE}">{PHONE_TXT}</a></li><li><a href="mailto:{MAIL}">{MAIL}</a></li><li><span>Győr, Magyarország</span></li></ul></div>
</div><div class="footer-bottom"><p>© 2026 ECO Clean. Minden jog fenntartva.</p></div></footer>'''


# --------------------------------------------------------------------------------------------
# Szakaszok
# --------------------------------------------------------------------------------------------
def hero(c):
    crumbs = [('index.html', 'Főoldal'), (f'{HUB_PAGE}.html', 'Matractisztítás cégeknek')] + ([(f'{page_of(c["slug"])}.html', c['name'])] if c else [])
    trail = ''.join(f'<li><a href="{h}"{CUR if i == len(crumbs) - 1 else ''}>{e(t)}</a></li>' for i, (h, t) in enumerate(crumbs))
    if c:
        a = KSH['areas'][c['slug']]
        over, h1a, h1b, intro = f'Matrachigiénia cégeknek · {c["name"]}', 'Szállodai matractisztítás', c['loc'] + '.', fill(c['intro'], c)
        pic, alt = c['slug'], c['alt']
        n = a['nights']
        chip = (dec(n / 1e6), 'millió vendégéjszaka<br>2025-ben') if n >= 1e6 else (str(round(n / 1000)), 'ezer vendégéjszaka<br>2025-ben')
    else:
        over, (h1a, h1b), intro = 'Matrachigiénia cégeknek · az egész országban', HUB['h1'], HUB['intro']
        pic, alt = 'magyarorszag', HUB['alt']
        chip = ('10+', 'matractól objektumonként<br>távolabb 20-tól')
    return f'''<section class="hx-hero"><span id="main-content" tabindex="-1"></span><div class="px-shell">
<nav aria-label="Morzsamenü"><ol class="hx-crumbs">{trail}</ol></nav>
<div class="hx-hero-grid"><div class="hx-hero-copy">
<span class="px-overline"><span class="px-dot"></span>{e(over)}</span>
<h1>{e(h1a)} <span>{e(h1b)}</span></h1>
<p>{e(intro)}</p>
<div class="hx-hero-actions"><a class="px-button" href="#ajanlat">Ajánlatot kérek {ARROW}</a><a class="hx-textlink" href="#tanusitvany">A tanúsítvány <span aria-hidden="true">↓</span></a><a class="hx-textlink" href="tel:{PHONE}">{PHONE_TXT}</a></div>
</div>
<figure class="hx-hero-media">{img(pic, alt, '(max-width:960px) 100vw, 52vw', eager=True)}<figcaption>ECO Clean · generált enteriőrkép</figcaption>
<div class="hx-chip"><b>{chip[0]}</b><small>{chip[1]}</small></div>
<button type="button" class="hx-hero-cert" data-open-cert aria-label="A tanúsítvány mintájának nagyítása"><img src="assets/b2b/tanusitvany-minta-480.webp" alt="" width="480" height="678" loading="lazy"><span>Tanúsítvánnyal</span></button>
</figure></div></div>
{marquee() if not c else ''}
</section>'''


def marquee():
    items = HUB['marquee']
    row = ''.join(f'<span>{t}</span>' for t in items)
    return f'<p class="px-sr-only">Kiknek dolgozunk: {", ".join(items)}.</p><div class="hx-marquee" aria-hidden="true"><div class="hx-marquee-track">{row}{row}</div></div>'


def assure():
    cells = ''.join(f'<div><small>0{i + 1}</small><b>{e(h)}</b><p>{e(p)}</p></div>' for i, (h, p) in enumerate(ASSURE))
    return f'<section aria-label="Vállalásaink"><div class="px-shell"><div class="hx-assure hx-reveal">{cells}</div></div></section>'


def facts(c):
    s = c['slug']
    a, nat = KSH['areas'][s], KSH['national']
    quiet, q_months, _ = season(s)
    share = dec(a['nights'] / nat['nights'] * 100)
    tiles = [
        (f'<b>{nights_tile(a["nights"])}</b>', f'kereskedelmi vendégéjszaka 2025-ben {c["loc"]} – az országos forgalom {share} %-a', 'KSH, kereskedelmi szálláshelyek, 2025'),
        (f'<b><span data-count="{a["beds"]}">{num(a["beds"])}</span></b>', f'férőhely {a["establishments"]} kereskedelmi szálláshelyen', 'KSH, 2025. július'),
        (f'<b class="sm">{" · ".join(MON[i] + "." for i in quiet)}</b>', 'a legcsendesebb hónapok – ideális időszak a tisztításra', 'saját számítás a KSH 2025-ös havi adataiból'),
        (f'<b>{minimum(s)}<small>+</small></b>', f'matractól objektumonként – ennyitől jövünk {c["ill"]}', 'ECO Clean'),
    ]
    cells = ''.join(f'<div class="hx-fact{' hx-fact-sm' if SM in b else ''}">{b}<span>{e(t)}</span><cite>{e(ci)}</cite></div>' for b, t, ci in tiles)
    prose = ''.join(f'<div><h3>{e(h)}</h3><p>{e(fill(p, c))}</p></div>' for h, p in c['prose'])
    places = ''.join(f'<li>{e(p)}</li>' for p in c['places'])
    return f'''<section class="hx-section" id="adatok" style="padding-bottom:0"><div class="px-shell">
<div class="hx-head hx-reveal"><div><span class="px-overline">{e(c["name"])} számokban</span><h2>Sok ágy. <span>Kevés idő.</span></h2></div><p>A matractisztításra az a legjobb idő, amikor a szobák üresen állnak. A vendégéjszaka-statisztika megmutatja, {e(c["loc"])} mikor van ez: {e(q_months)}.</p></div>
<div class="hx-facts hx-reveal">{cells}</div>
{chart(c)}
<div class="hx-prose hx-reveal">{prose}</div>
<div class="hx-reveal" style="margin-top:40px"><h3 style="font-size:28px;margin-bottom:14px">Ahol dolgozunk</h3><ul class="hx-places">{places}</ul><p class="hx-note">Kollégiumi munkák: {e(c["unis"])}.</p></div>
</div></section>'''


def chart(c):
    m = KSH['areas'][c['slug']]['monthly']
    quiet = season(c['slug'])[0]
    top, total = max(m), sum(m)
    bars = ''
    for i, val in enumerate(m):
        cls = ' class="c"' if i in quiet else ''
        bars += f'<div{cls}><i style="--h:{val / top:.3f}" title="{MONTHS[i]}: {num(val)} vendégéjszaka ({dec(val / total * 100)} %)"></i><span>{MON[i]}</span></div>'
    return f'''<figure class="hx-chart hx-reveal"><figcaption><b>Vendégéjszakák havonta – {e(c["name"])}</b><span>2025, KSH, kereskedelmi szálláshelyek</span></figcaption>
<div class="hx-bars" role="img" aria-label="Havi vendégéjszakák {e(c["loc"])} 2025-ben; a legcsendesebb hónapok: {e(season(c["slug"])[1])}.">{bars}</div>
<div class="hx-legend"><span style="--c:#d3dfcc">vendégéjszakák</span><span style="--c:var(--px-green)">legcsendesebb hónapok = ideális időszak</span></div></figure>'''


def segments(c):
    if c:
        keys = [k for k, _ in c['focus']]
        notes = dict(c['focus'])
        head = (f'Kiknek dolgozunk {c["loc"]}', 'Három szálláshely. <span>Három időablak.</span>',
                f'{minimum(c["slug"])} matractól objektumonként {c["loc"]} bármilyen szálláshelyre kimegyünk. Ez a három típus kér itt a leggyakrabban ajánlatot.')
    else:
        keys, notes = SEG_ORDER, {}
        head = ('Kiknek dolgozunk', 'Minden ház <span>másképp alszik.</span>',
                '12 ágyas panzió vagy 400 férőhelyes kollégium: az időpontot, a folyamatot és az igazolást a te működésedhez igazítjuk.')
    tabs, panels = [], []
    for i, k in enumerate(keys):
        s = SEGMENTS[k]
        sel = 'true' if i == 0 else 'false'
        tabs.append(f'<button type="button" role="tab" id="tab-{k}" aria-controls="panel-{k}" aria-selected="{sel}" tabindex="{0 if i == 0 else -1}"><small>0{i + 1}</small>{e(s["label"])}</button>')
        note = f'<p><strong>{e(notes[k])}</strong></p>' if k in notes else ''
        ticks = ''.join(f'<li>{e(t)}</li>' for t in s['ticks'])
        if k == 'hotel' and not c:
            ticks += '<li>Referencia: DITLIN Boutique Hotel, Győr (2022)</li>'
        panels.append(f'''<div class="hx-seg-panel" role="tabpanel" id="panel-{k}" aria-labelledby="tab-{k}"{'' if i == 0 else ' hidden'}>
<figure>{img(s['img'], s['alt'], '(max-width:640px) 100vw, 30vw')}<figcaption>Generált kép</figcaption></figure>
<div><h3>{e(s['h'])}</h3>{note}<p>{e(s['p'])}</p><ul class="hx-ticks">{ticks}</ul><div class="hx-window"><b>Ideális</b><span>{e(s['win'])}</span></div></div></div>''')
    return f'''<section class="hx-section" id="szallashelyek"><div class="px-shell">
<div class="hx-head hx-reveal"><div><span class="px-overline">{e(head[0])}</span><h2>{head[1]}</h2></div><p>{e(head[2])}</p></div>
<div class="hx-seg hx-reveal" data-tabs><div class="hx-seg-tabs" role="tablist" aria-label="Szálláshelytípusok">{''.join(tabs)}</div><div>{''.join(panels)}</div></div>
</div></section>'''


def law(c):
    cards = LAW if not c else [x for x in LAW if x['h'] != 'Ígéretek helyett tények'][:6]
    out = ''.join(f'''<article class="hx-law-card" data-for="{x['for_']}"><span class="hx-tag">{e(x['tag'])}</span><h3>{e(x['h'])}</h3><cite>{e(x['cite'])}</cite><p>{e(x['p'])}</p><p class="hx-means"><b>Mit jelent ez neked?</b> {e(x['means'])}</p><a href="{e(x['url'])}" target="_blank" rel="noopener">Eredeti szöveg ↗</a></article>''' for x in cards)
    filt = '' if c else '<div class="hx-law-filter" data-law-filter role="group" aria-label="Szűrés szálláshelytípus szerint">' + ''.join(
        f'<button type="button" class="hx-pill" data-key="{k}" aria-pressed="{"true" if k == "all" else "false"}">{e(t)}</button>' for k, t in LAW_FILTER) + '</div>'
    more = f'<p class="hx-note">Az összes szabály egy helyen, szálláshelytípus szerint szűrhetően: <a href="{HUB_PAGE}.html#jog">jogi háttér a céges matractisztításhoz</a>.</p>' if c else ''
    return f'''<section class="hx-section hx-law" id="jog"><div class="px-shell">
<div class="hx-head hx-reveal"><div><span class="px-overline">Mit ír elő a jogszabály?</span><h2>A jogi háttér. <span>Riogatás nélkül.</span></h2></div><p>Sokan „kötelező” matractisztításról beszélnek. Mi inkább megmutatjuk, mi áll ténylegesen a jogszabályokban és a minősítési kritériumokban – hivatkozással az eredeti szövegre.</p></div>
{filt}<div class="hx-law-grid hx-reveal">{out}</div>
<div class="hx-verdict hx-reveal"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Z"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg><div><h3>{e(VERDICT[0])}</h3><p>{e(VERDICT[1])}</p></div></div>
<p class="hx-note">Állapot: 2026. november. Ez az összefoglaló nem jogi tanácsadás. Források: Nemzeti Jogszabálytár (njt.hu), Wolters Kluwer Jogtár (net.jogtar.hu).</p>{more}
</div></section>'''


def cert():
    pins = [(1, 88, 45, 'A szálláshely neve', 'A te objektumodra szól'), (2, 84, 64.5, 'Elvégzett szolgáltatások', 'pl. mélytisztítás, atka- és allergénkezelés'),
            (3, 11, 79.5, 'Dátum', 'Igazolja a tisztítás időpontját'), (4, 90, 74.5, 'Aláírás és pecsét', 'ECO Clean Magyarország')]
    pin_html = ''.join(f'<button type="button" class="hx-pin" style="left:{x}%;top:{y}%" aria-label="{n}: {e(t)}">{n}</button><span class="hx-pin-tip" style="left:{x}%;top:{y}%" role="tooltip"><b>{e(t)}</b><br>{e(d)}</span>' for n, x, y, t, d in pins)
    lis = ''.join(f'<li><i>{n}</i><span><b>{e(t)}</b><br>{e(d)}</span></li>' for n, _, _, t, d in pins)
    return f'''<section class="hx-section hx-cert" id="tanusitvany"><div class="px-shell"><div class="hx-cert-grid">
<div class="hx-cert-copy hx-reveal"><span class="px-overline">Az ECO Clean tanúsítvány</span><h2>Higiénia, amit <span>meg is mutathatsz.</span></h2>
<p>Minden tisztítás után tanúsítványt állítunk ki az objektumodra: a szálláshely neve, a dátum, az elvégzett szolgáltatások és az aláírás. Látható minőségjel a vendégeknek, dátumozott igazolás a nyilvántartásodba – a minősítő bizottság a helyszíni ellenőrzésen is betekinthet a matractisztítási tanúsítványba.</p>
<label class="hx-field"><span>Próbáld ki – a szálláshelyed neve</span><input type="text" data-cert-input maxlength="60" placeholder="pl. Hotel Platán" autocomplete="organization"></label>
<ul class="hx-cert-list">{lis}</ul>
<div class="hx-cert-actions"><button type="button" class="px-button" data-open-cert>Tanúsítvány nagyban {ARROW}</button><a class="hx-textlink" href="#ajanlat">Ajánlatot kérek ↓</a></div>
<p class="hx-cert-small">Előnézet MINTA vízjellel. A valódi tanúsítványt a tisztítás után állítjuk ki. Legkésőbb 12 hónap után javasoljuk a frissítést.</p></div>
<div class="hx-stage hx-reveal"><div class="hx-paper" data-tilt><img src="assets/b2b/tanusitvany-sablon.webp" width="1055" height="1491" loading="lazy" decoding="async" alt="Az ECO Clean matractisztítási tanúsítványának mintája magyar zászlós címerrel">
<span class="hx-cert-name" data-cert-name data-default="A te szálláshelyed">A te szálláshelyed</span><span class="hx-cert-date" data-cert-date></span>
<span class="hx-watermark" aria-hidden="true"><span>MINTA</span></span>{pin_html}</div></div>
</div></div></section>'''


def protocol():
    items = []
    for i, (h, p, ph) in enumerate(STEPS):
        fig = ''
        if ph:
            fig = f'<figure><img src="assets/b2b/{ph[0]}" width="{ph[1]}" height="{ph[2]}" alt="{e(ph[3])}" loading="lazy" decoding="async"><figcaption><span class="hx-real">Saját munkánkból</span>eredeti felvétel</figcaption></figure>'
        items.append(f'<li class="hx-step"><span>0{i + 1}</span><div><h3>{e(h)}</h3><p>{e(p)}</p></div>{fig}</li>')
    return f'''<section class="hx-section" id="folyamat"><div class="px-shell"><div class="hx-proto">
<div class="hx-proto-side"><span class="px-overline" style="color:var(--hxg)">A higiéniai protokoll</span><h2>Hat lépés. <span>Egy igazolás.</span></h2>
<p>Az első fotótól a tanúsítványig: így zajlik a tisztítás a házadban – tervezhetően, csendben a háttérben, és úgy, hogy egyetlen matrac sem hagyja el az épületet.</p>
<div class="hx-progress" aria-hidden="true"><i></i></div><div class="hx-progress-label" aria-hidden="true"><span>Lépés: <b data-step-now>01</b></span><span>06</span></div></div>
<ol class="hx-steps">{''.join(items)}</ol></div></div></section>'''


def hungary_map(current):
    links, texts = '', ''
    order = sorted(COUNTIES, key=lambda x: x['slug'] == 'budapest')  # Budapest utoljára, különben Pest eltakarja
    for x in order:
        s = x['slug']
        cls = ' '.join(filter(None, ['is-core' if s in CORE else '', 'is-current' if current and s == current['slug'] else '']))
        lx, ly = MAP['labels'][s]
        links += f'<a href="{page_of(s)}.html" data-key="{s}"{attr('class', cls)} aria-label="Szállodai matractisztítás {e(x["loc"])}"><path d="{MAP["paths"][s]}" fill-rule="evenodd"/></a>'
        texts += f'<text x="{lx}" y="{ly}" text-anchor="middle" data-key="{s}"{attr('class', 'is-current' if current and s == current['slug'] else '')} aria-hidden="true">{e(x["short"])}</text>'
    lakes = ''.join(f'<path class="hx-lake" d="{p}"/>' for p in MAP['lakes'])
    data = {}
    for x in COUNTIES:
        s = x['slug']
        a = KSH['areas'][s]
        nights = f'{dec(a["nights"] / 1e6)} millió' if a['nights'] >= 1e6 else f'{round(a["nights"] / 1000)} ezer'
        data[s] = dict(name=x['name'], text=f'{nights} vendégéjszaka 2025-ben · legcsendesebb: {season(s)[1]} · {minimum(s)} matractól',
                       places=x['places'][:6], href=f'{page_of(s)}.html', cta=f'Matractisztítás – {x["name"]}')
    nat = KSH['national']
    if current:
        d = data[current['slug']]
        name, text, places = d['name'], d['text'], d['places']
        data[current['slug']].update(href='#ajanlat', cta='Ajánlatkérés')
    else:
        name, text = 'Egész Magyarország', f'{dec(nat["nights"] / 1e6)} millió kereskedelmi vendégéjszaka és {num(nat["beds"])} férőhely 2025-ben – mi minden vármegyébe eljutunk.'
        places = [x['name'] for x in COUNTIES]
    lis = ''.join(f'<li>{e(p)}</li>' for p in places)
    region_links = ''.join(f'<li><a href="{page_of(x["slug"])}.html"{CUR if current and x['slug'] == current['slug'] else ''}>{e(x["name"])} <small>{minimum(x["slug"])}+ matrac</small></a></li>' for x in COUNTIES)
    data_json = json.dumps(data, ensure_ascii=False).replace('</', '<\\/')
    return f'''<section class="hx-section" id="varmegyek" style="background:var(--alt)"><div class="px-shell">
<div class="hx-head hx-reveal"><div><span class="px-overline">Az egész országban</span><h2>Húsz terület. <span>Egy színvonal.</span></h2></div><p>Lakossági ügyfeleinket Győr, a Balaton és a Duna mente környékén szolgáljuk ki. Cégeknek mind a 19 vármegyében és Budapesten dolgozunk: a szokásos körzetben 10, távolabb 20 matractól. A kiszállási díj külön sorban szerepel az ajánlatban.</p></div>
<div class="hx-mapwrap hx-reveal" data-map><div><svg class="hx-map" viewBox="{MAP["viewBox"]}" role="group" aria-label="Magyarország vármegyéi: válassz területet">{links}{lakes}{texts}</svg>
<div class="hx-map-legend"><span style="--c:#c7d6bf">10 matractól (szokásos körzet)</span><span style="--c:#e1e8dc">20 matractól</span></div></div>
<div class="hx-map-card" data-map-card aria-live="polite"><span class="px-overline">Vármegye</span><h3 data-f="name">{e(name)}</h3><p data-f="text">{e(text)}</p><ul class="hx-places" data-f="places">{lis}</ul><a class="px-button" data-f="link" href="#ajanlat">Ajánlatkérés {ARROW}</a></div>
<script type="application/json">{data_json}</script></div>
<ul class="hx-regionlist">{region_links}</ul>
</div></section>'''


def planner(c):
    first = SEG_ART[c['focus'][0][0]] if c else ART[0]
    arts = ''.join(f'<label><input type="radio" name="art" value="{e(a)}"{" checked" if a == first else ""}><span>{e(a)}</span></label>' for a in ART)
    opts = ('' if c else '<option value="" data-min="10" selected>Válassz vármegyét</option>') + ''.join(
        f'<option value="{e(x["name"])}" data-min="{minimum(x["slug"])}"{" selected" if c and x["slug"] == c["slug"] else ""}>{e(x["name"])}</option>' for x in COUNTIES)
    months = ''.join(f'<label><input type="checkbox" name="honap" value="{m}"><span>{m}</span></label>' for m in MON)
    extras = ['Foltkezelés / nedves tisztítás szükség szerint', 'Kárpitozott bútorok (fotelek, kanapék)', 'Szőnyegpadló (ipari szőnyegtisztítás)', 'Több objektum / ház']
    ex = ''.join(f'<label><input type="checkbox" name="extra" value="{e(x)}"><span>{e(x)}</span></label>' for x in extras)
    mn = minimum(c['slug']) if c else MIN_CORE
    return f'''<section class="hx-section hx-plan" id="ajanlat"><div class="px-shell">
<div class="hx-head hx-reveal"><div><span class="px-overline">Ajánlat két perc alatt</span><h2>A tisztítás, <span>megtervezve.</span></h2></div><p>Néhány adat elég. Elküldöd, mi pedig fix áras ajánlattal és időpontjavaslattal válaszolunk – kötelezettség nélkül.</p></div>
<div class="hx-plan-grid"><form class="hx-form" id="hx-plan" data-plan data-min="{mn}" novalidate>
<div class="hx-hp" aria-hidden="true"><label>Weboldal <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
<fieldset><legend><i>01</i>A szálláshely típusa</legend><div class="hx-chips">{arts}</div></fieldset>
<fieldset><legend><i>02</i>Hány matrac?</legend>
<div class="hx-qty"><label class="hx-field"><span>Összesen</span><input type="number" name="menge" min="1" max="5000" value="40" inputmode="numeric"></label><label class="hx-field"><span>Ebből franciaágy (nem kötelező)</span><input type="number" name="doppel" min="0" max="5000" value="0" inputmode="numeric"></label></div>
<input class="hx-range" type="range" name="menge-range" min="10" max="400" value="40" aria-label="Matracok száma csúszkával"><p class="hx-min" data-min-note aria-live="polite"></p></fieldset>
<fieldset><legend><i>03</i>Hol?</legend><div class="hx-row"><label class="hx-field"><span>Vármegye</span><select name="varmegye">{opts}</select></label><label class="hx-field"><span>Település</span><input type="text" name="ort" autocomplete="address-level2" placeholder="pl. {e(c["places"][0] if c else "Hévíz")}"></label></div></fieldset>
<fieldset><legend><i>04</i>Mikorra? <small>(több is választható)</small></legend><div class="hx-chips hx-months">{months}</div></fieldset>
<fieldset><legend><i>05</i>Ezt is kérem</legend><div class="hx-chips">{ex}</div></fieldset>
<fieldset><legend><i>06</i>Kapcsolat</legend>
<label class="hx-field"><span>A szálláshely neve (ez kerül a tanúsítványra)</span><input type="text" name="haz" data-cert-input maxlength="60" autocomplete="organization" placeholder="pl. Hotel Platán"></label>
<div class="hx-row"><label class="hx-field"><span>Kapcsolattartó</span><input type="text" name="person" autocomplete="name"></label><label class="hx-field"><span>Telefon</span><input type="tel" name="tel" autocomplete="tel"></label></div>
<label class="hx-field"><span>E-mail</span><input type="email" name="email" autocomplete="email"></label>
<label class="hx-field"><span>Üzenet (nem kötelező)</span><textarea name="uzenet" placeholder="pl. a matracok állapota, megközelítés, emeletek, ideális időpontok"></textarea></label></fieldset>
<p class="hx-privacy">Az elküldéssel az adataidat az ECO Clean részére továbbítod. Csak az ajánlatkérésed megválaszolására használjuk, és nem adjuk tovább.</p>
</form>
<aside class="hx-summary" data-summary aria-label="Az ajánlatkérésed összefoglalója"><span class="px-overline">Az ajánlatkérésed</span><div class="hx-big"><span data-s="n">40</span><small>matrac</small></div>
<dl><dt>Típus</dt><dd data-s="type">—</dd><dt>Hely</dt><dd data-s="where">—</dd><dt>Megoszlás</dt><dd data-s="dbl">—</dd><dt>Időszak</dt><dd data-s="when">rugalmas</dd><dt>Extra</dt><dd data-s="extra">nincs</dd></dl>
<button type="submit" form="hx-plan" class="px-button" data-send>Ajánlatkérés küldése {ARROW}</button>
<p class="hx-status" data-status aria-live="polite"></p><div class="hx-done" data-done hidden tabindex="-1"><b>Köszönjük – megkaptuk az ajánlatkérésed.</b><span>Hamarosan jelentkezünk fix áras ajánlattal és időpontjavaslattal.</span></div>
<div class="hx-alt"><a data-mailto href="mailto:{MAIL}">Küldés levelezőprogrammal</a><button type="button" data-copy>Szöveg másolása</button></div><div class="hx-alt"><a href="tel:{PHONE}">{PHONE_TXT}</a><a href="mailto:{MAIL}">{MAIL}</a></div>
<div class="hx-incl"><img src="assets/b2b/tanusitvany-minta-480.webp" alt="" width="480" height="678" loading="lazy"><span>Tanúsítvány az objektumodra – a tisztítás után állítjuk ki.</span></div></aside>
</div></div></section>'''


def faq(c):
    items = ([(q, fill(a, c)) for q, a in c['faq']] + [FAQ_GENERAL[i] for i in (1, 3, 4, 5, 8)]) if c else FAQ_GENERAL
    qa = ''.join(f'<details{" open" if i == 0 else ""}><summary>{e(q)}</summary><div><p>{e(a)}</p></div></details>' for i, (q, a) in enumerate(items))
    over = f'Jó tudni · {c["name"]}' if c else 'Jó tudni'
    return f'''<section class="hx-section" id="gyik"><div class="px-shell"><div class="hx-faq">
<div class="hx-reveal"><span class="px-overline" style="color:var(--hxg)">{e(over)}</span><h2>Gyakori <span>kérdések.</span></h2><p class="hx-lead" style="margin-top:20px">Nincs itt a kérdésed? Hívj minket: <a href="tel:{PHONE}">{PHONE_TXT}</a></p></div>
<div class="hx-reveal">{qa}</div></div></div></section>''', items


def related(c):
    cards = ''.join(f'<a href="{page_of(s)}.html">{img(s, BY[s]["alt"], "(max-width:640px) 100vw, 33vw")}<span><small>A közelben</small>Szállodák · {e(BY[s]["name"])}</span></a>' for s in c['near'])
    return f'''<section class="hx-section" style="padding-top:0"><div class="px-shell"><div class="hx-head hx-reveal"><div><span class="px-overline">A közelben</span><h2>További <span>vármegyék.</span></h2></div><p><a href="{HUB_PAGE}.html">Vissza az áttekintéshez: matractisztítás cégeknek az egész országban →</a></p></div>
<div class="hx-related hx-reveal">{cards}</div></div></section>'''


def final(c):
    return f'''<section class="hx-final"><div class="px-shell"><div class="hx-final-grid"><div><span class="px-overline">A következő szezon biztosan jön</span><h2>Foglald le <span>az időpontod.</span></h2><p>A csendes hetekre gyorsan megtelik a naptárunk{" " + e(c["loc"]) if c else ""}. Küldd el az adatokat, és fix áras ajánlatot kapsz ütemtervvel és tanúsítvánnyal.</p></div>
<div class="hx-final-actions"><a class="px-button" href="#ajanlat">Ajánlatot kérek {ARROW}</a><a class="hx-textlink" href="tel:{PHONE}">{PHONE_TXT}</a><a class="hx-textlink" href="mailto:{MAIL}">{MAIL}</a></div></div></div></section>'''


def cert_dialog():
    return '<dialog class="hx-dialog" aria-label="Az ECO Clean tanúsítvány mintája"><img src="assets/b2b/tanusitvany-sablon.webp" width="1055" height="1491" loading="lazy" alt="Az ECO Clean matractisztítási tanúsítványának mintája: szálláshely neve, dátum, elvégzett szolgáltatások, aláírás és pecsét"><div><span>A valódi tanúsítvány a tisztítás után készül.</span><button type="button" data-close>Bezárás</button></div></dialog>'


def ld(c, faqs, page, title, desc, og):
    provider = {'@type': 'LocalBusiness', '@id': BASE + '#business', 'name': 'ECO Clean', 'url': BASE, 'telephone': PHONE, 'email': MAIL,
                'address': {'@type': 'PostalAddress', 'addressLocality': 'Győr', 'addressCountry': 'HU'}}
    if c:
        area = [{'@type': 'AdministrativeArea', 'name': c['name'] if c['slug'] == 'budapest' else c['name'] + ' vármegye'}] + [{'@type': 'Place', 'name': p} for p in c['places']]
    else:
        area = [{'@type': 'Country', 'name': 'Magyarország'}] + [{'@type': 'AdministrativeArea', 'name': x['name']} for x in COUNTIES]
    mn = minimum(c['slug']) if c else MIN_CORE
    service = {'@context': 'https://schema.org', '@type': 'Service', '@id': url(page) + '#service',
               'name': f'Szállodai matractisztítás {c["loc"]}' if c else 'Matractisztítás szállodáknak, kollégiumoknak és munkásszállóknak',
               'serviceType': 'Matractisztítás', 'description': desc, 'url': url(page), 'image': og, 'provider': provider, 'areaServed': area,
               'audience': {'@type': 'BusinessAudience', 'audienceType': 'Szállodák, panziók, gyógyszállók, kollégiumok, munkásszállók, apartmanházak'},
               'offers': {'@type': 'Offer', 'url': url(page) + '#ajanlat', 'availability': 'https://schema.org/InStock',
                          'eligibleQuantity': {'@type': 'QuantitativeValue', 'minValue': mn, 'unitText': 'matrac'},
                          'eligibleCustomerType': 'https://schema.org/Business'}}
    crumbs = [('Főoldal', BASE), ('Matractisztítás cégeknek', url(HUB_PAGE))] + ([(c['name'], url(page))] if c else [])
    bc = {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': u} for i, (n, u) in enumerate(crumbs)]}
    fq = {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in faqs]}
    wp = {'@context': 'https://schema.org', '@type': 'WebPage', '@id': url(page), 'url': url(page), 'name': title, 'description': desc, 'inLanguage': 'hu-HU',
          'dateModified': '2026-11-21', 'primaryImageOfPage': og, 'about': {'@id': url(page) + '#service'}}
    return ''.join(f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>' for x in (wp, service, bc, fq))


def render(c):
    page = page_of(c['slug'] if c else None)
    if c:
        title = f'Szállodai matractisztítás {c["name"]} – {c["title_towns"]} | ECO Clean'
        if len(title) > 70:
            title = f'Szállodai matractisztítás {c["name"]} | ECO Clean'
        if c['slug'] == 'budapest':
            title = 'Szállodai matractisztítás Budapesten, tanúsítvánnyal | ECO Clean'
        desc = (f'Matractisztítás szállodáknak, kollégiumoknak és munkásszállóknak {c["loc"]}: helyben, {minimum(c["slug"])} matractól, '
                f'objektumonként tanúsítvánnyal. Kérj ajánlatot!')
        if len(desc) > 165:
            desc = desc.replace(' Kérj ajánlatot!', '')
        og_name, hero_name, og_alt = f'og-szalloda-matrac-{c["slug"]}.jpg', c['slug'], c['alt']
    else:
        title, desc = HUB['title'], HUB['desc']
        og_name, hero_name, og_alt = 'og-szalloda-matrac-magyarorszag.jpg', 'magyarorszag', HUB['alt']
    og = BASE + 'assets/b2b/' + og_name
    faq_html, faqs = faq(c)
    body = [hero(c), assure()]
    if c:
        body.append(facts(c))
    body += [segments(c), law(c), cert(), protocol(), hungary_map(c), planner(c), faq_html]
    if c:
        body.append(related(c))
    body.append(final(c))
    head = f'''<!DOCTYPE html><html lang="hu" data-theme="light"><head>{HTTPS}<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(title)}</title><meta name="description" content="{e(desc)}"><link rel="canonical" href="{url(page)}"><meta name="robots" content="index,follow,max-image-preview:large">
<meta name="theme-color" content="#f8f7f2"><link rel="icon" href="favicon-32x32.png">{FONTS}
<link rel="stylesheet" href="ui/design.css?v={v('ui/design.css')}"><link rel="stylesheet" href="ui/b2b-hygiene.css?v={v('ui/b2b-hygiene.css')}">
<link rel="preload" as="image" href="assets/b2b/szalloda-matrac-{hero_name}-800.webp" imagesrcset="assets/b2b/szalloda-matrac-{hero_name}-800.webp 800w, assets/b2b/szalloda-matrac-{hero_name}-1600.webp 1600w" imagesizes="(max-width:960px) 100vw, 52vw" fetchpriority="high">
<meta property="og:locale" content="hu_HU"><meta property="og:type" content="website"><meta property="og:site_name" content="ECO Clean"><meta property="og:title" content="{e(title)}"><meta property="og:description" content="{e(desc)}"><meta property="og:url" content="{url(page)}"><meta property="og:image" content="{og}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="{e(og_alt)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{e(title)}"><meta name="twitter:description" content="{e(desc)}"><meta name="twitter:image" content="{og}">
{ld(c, faqs, page, title, desc, og)}</head>'''
    doc = (f'{head}<body class="eco-rollout eco-site hx" data-family="b2b">{nav(c)}<main id="main">' + '\n'.join(body)
           + f'</main>{footer()}{cert_dialog()}<script src="ui/rollout.js?v={v("ui/rollout.js")}"></script><script src="ui/b2b-hygiene.js?v={v("ui/b2b-hygiene.js")}" defer></script></body></html>\n')
    return page + '.html', title, desc, doc


# --------------------------------------------------------------------------------------------
# Bekötés a meglévő oldalakba: csak beszúrás, pozíciókkal rögzítve
# --------------------------------------------------------------------------------------------
BAND_CSS = ('<style id="eco-b2b-band-css">.eco-b2b-band{padding:clamp(40px,5vw,72px) 0;background:#2c4432;color:#fffdf5;font-family:"Manrope",system-ui,sans-serif}'
            '.eco-b2b-band .eco-b2b-band__in{width:min(1320px,calc(100% - 48px));margin-inline:auto;display:grid;grid-template-columns:auto 1fr auto;gap:clamp(20px,3vw,48px);align-items:center}'
            '.eco-b2b-band img{width:clamp(84px,9vw,128px);height:auto;aspect-ratio:480/678;transform:rotate(-5deg);border-radius:4px;box-shadow:0 18px 30px #0006}'
            '.eco-b2b-band .eco-b2b-band__over{margin:0 0 8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:#d9e8c9}'
            'section.eco-b2b-band h2.eco-b2b-band__title{margin:0 0 10px;padding:0;font-family:"Cormorant Garamond",Georgia,serif;font-weight:500;font-size:clamp(28px,3vw,42px);line-height:1.08;letter-spacing:0;color:#fffdf5;background:none;-webkit-text-fill-color:currentColor;text-align:left}'
            '.eco-b2b-band .eco-b2b-band__text{margin:0;font-size:15px;line-height:1.7;color:#d5e1d0;max-width:640px;text-align:left}'
            '.eco-b2b-band a.eco-b2b-band__btn{display:inline-flex;align-items:center;gap:10px;white-space:nowrap;background:#d9e8c9;color:#2c4432;padding:15px 24px;border-radius:6px;font-weight:700;font-size:14px;text-decoration:none}'
            '.eco-b2b-band a.eco-b2b-band__btn:hover{background:#fffdf5}'
            '@media(max-width:760px){.eco-b2b-band .eco-b2b-band__in{grid-template-columns:1fr}.eco-b2b-band img{display:none}}'
            # Asztali menü: szűk sávban a „Cégeknek” pont elrejtve, hogy a gombok ne törjenek (mobilmenüben, sávban, láblécben megvan)
            '@media(min-width:1051px) and (max-width:1339px){.nav-main>.eco-b2b-nav{display:none}}'
            '@media(min-width:1340px) and (max-width:1365px){.nav-main:has(>.eco-b2b-nav){gap:13px}.nav-main:has(>.eco-b2b-nav) .nav-link{font-size:12.5px}}'
            '@media(min-width:1051px) and (max-width:1199px){.nav-main>.eco-b2b-local{display:none}}</style>')
NAV_LOCAL = f'<li class="eco-local-nav-item eco-b2b-local"><a class="nav-link eco-local-link" href="{HUB_PAGE}.html">Cégeknek</a></li>'
NAV_MAIN = f'<li class="eco-b2b-nav"><a class="nav-link" href="{HUB_PAGE}.html">Cégeknek</a></li>'
NAV_MOBILE = f'<li class="eco-b2b-mobile"><a class="nav-mobile-link" href="{HUB_PAGE}.html">Cégeknek</a></li>'
NAV_BIXOL = f'<li><a href="{HUB_PAGE}.html">Cégeknek</a></li>'
FOOT_LINK = f'<li><a href="{HUB_PAGE}.html">Matractisztítás cégeknek</a></li>'
FOOT_HEADINGS = ('Csak cégeknek', 'Matractisztítás', 'Szolgáltatások')


def band(name):
    m = re.fullmatch(r'(?:karpittisztitas|matractisztitas|szonyegtisztitas|takaritas|ablaktisztitas)-([a-z]+)\.html|([a-z]+)\.html', name)
    city = (m.group(1) or m.group(2)) if m else None
    slug = CITY_COUNTY.get(city)
    if slug:
        c = BY[slug]
        href, over = f'{page_of(slug)}.html', f'Cégeknek · {c["name"]} vármegye'
        text = (f'{c["loc"][0].upper() + c["loc"][1:]} {minimum(slug)} matractól helyben tisztítjuk a szállodák, panziók, kollégiumok és munkásszállók matracait, '
                f'objektumonként tanúsítvánnyal – a legcsendesebb hónapokra időzítve ({season(slug)[1]}).')
    else:
        href, over = f'{HUB_PAGE}.html', 'Cégeknek · az egész országban'
        text = 'Mind a 19 vármegyében és Budapesten helyben tisztítjuk a szállodák, panziók, kollégiumok és munkásszállók matracait, objektumonként tanúsítvánnyal.'
    return (f'<section class="eco-b2b-band" aria-label="Matractisztítás cégeknek"><div class="eco-b2b-band__in">'
            f'<img src="assets/b2b/tanusitvany-minta-480.webp" alt="" width="480" height="678" loading="lazy" decoding="async">'
            f'<div><p class="eco-b2b-band__over">{e(over)}</p><h2 class="eco-b2b-band__title">Szállodát, kollégiumot vagy munkásszállót üzemeltetsz?</h2>'
            f'<p class="eco-b2b-band__text">{e(text)}</p></div>'
            f'<a class="eco-b2b-band__btn" href="{href}">Céges ajánlatkérés <span aria-hidden="true">→</span></a></div></section>\n')


def ul_end(s, start):
    """A start pozíción nyíló <ul> záró </ul>-jának pozíciója (egymásba ágyazott listákkal)."""
    depth, i = 0, start
    for m in re.compile(r'<ul\b|</ul>').finditer(s, start):
        depth += 1 if m.group(0) == '<ul' else -1
        if depth == 0:
            return m.start()
    raise ValueError('unclosed ul')


SKIP = {'megrendeles.html', 'google452375ed927a7b98.html'}


def plan(name, s):
    """A beszúrások listája [(pozíció, szöveg)] egy meglévő fájlra; üres lista = nincs teendő."""
    ins = []
    if name == 'sitemap.xml':
        add = ''.join(f'  <url><loc>{url(page_of(x))}</loc></url>\n' for x in [None] + [c['slug'] for c in COUNTIES])
        return [(s.rindex('</urlset>'), add)]
    if name == 'llms.txt':
        lines = [f'- {c["name"]}: {url(page_of(c["slug"]))}' for c in COUNTIES]
        add = ('\n## Matractisztítás cégeknek (szállodák, panziók, kollégiumok, munkásszállók)\n'
               'Helyszíni matractisztítás az egész országban, objektumonként dátumozott tanúsítvánnyal. A szokásos körzetben (Győr-Moson-Sopron, '
               'Komárom-Esztergom, Vas, Veszprém, Zala, Somogy, Bács-Kiskun, Tolna) 10, máshol 20 matractól. Fix áras ajánlat, számlával. '
               'Jogszabály nem írja elő a matractisztítást; a kötelező szálláshely-minősítés tiszta, higiénikus környezetet és a legtöbb típusnál jó állapotú matracot követel.\n'
               f'- Áttekintés: {url(HUB_PAGE)}\n' + '\n'.join(lines) + '\n')
        return [(len(s), add if s.endswith('\n') else '\n' + add)]
    if not name.endswith('.html') or '/' in name or name in SKIP or 'http-equiv="refresh"' in s:
        return []
    for m in re.finditer(r'<ul class="[^"]*\beco-local-nav\b[^"]*"[^>]*>', s):
        ins.append((ul_end(s, m.start()), NAV_LOCAL))
    if not ins:
        for cls, item in (('nav-main', NAV_MAIN), ('nav-mobile-menu', NAV_MOBILE)):
            m = re.search(rf'<ul class="{cls}">', s)
            if m:
                ins.append((ul_end(s, m.start()), item))
        for m in re.finditer(r'<div class="desktop-menu">\s*<nav>\s*<ul>|<div class="bixol-mobile-menu">.*?<ul>', s, re.S):
            ins.append((ul_end(s, m.end() - 4), NAV_BIXOL))
    if '<footer' in s:
        f0 = s.index('<footer')
        f1 = s.index('</footer>', f0)
        for h in FOOT_HEADINGS:
            m = re.compile(rf'<h[3-6][^>]*>\s*{h}\s*</h[3-6]>\s*<ul[^>]*>').search(s, f0, f1)
            if m:
                ins.append((ul_end(s, m.end() - len(re.search(r'<ul[^>]*>$', m.group(0)).group(0))), FOOT_LINK))
                break
        ins.append((f0, band(name)))
        ins.append((s.index('</head>'), BAND_CSS))
    return sorted(ins)


def apply(s, ins):
    out, last = [], 0
    for pos, text in ins:
        out.append(s[last:pos]); out.append(text); last = pos
    out.append(s[last:])
    return ''.join(out)


def restore(data, edits):
    """Az overlay.json szerinti beszúrások eltávolítása (fordított sorrendben)."""
    s = data.decode('utf-8')
    shift = [0]
    for _, t in edits:
        shift.append(shift[-1] + len(t))
    for k in range(len(edits) - 1, -1, -1):
        pos, text = edits[k]
        at = pos + shift[k]
        assert s[at:at + len(text)] == text, 'Beszúrás nem található'
        s = s[:at] + s[at + len(text):]
    return s.encode('utf-8')


def inject(name, before):
    if not (name.endswith('.html') or name in ('sitemap.xml', 'llms.txt')):
        return before, []
    s = before.decode('utf-8')
    ins = plan(name, s)
    return apply(s, ins).encode('utf-8'), [[p, t] for p, t in ins]


# --------------------------------------------------------------------------------------------
# Kiadás: szülő visszaállítása, építés, manifest + jelentés + overlay
# --------------------------------------------------------------------------------------------
def build():
    manifest = json.loads(MANIFEST.read_bytes())
    if manifest.get('b2bOverlay'):  # újrafuttatás: előbb vissza a szülőhöz
        old = json.loads(OVERLAY.read_bytes())
        for name, rec in old['files'].items():
            (REL / name).write_bytes(restore((REL / name).read_bytes(), rec['edits']))
        for name in old['added']:
            if name.endswith('.html'):
                (REL / name).unlink()
        manifest = json.loads(BASELINE.read_bytes())
        MANIFEST.write_bytes(BASELINE.read_bytes())
        REPORT.write_bytes(BASE_REPORT.read_bytes())
    else:
        BASELINE.write_bytes(MANIFEST.read_bytes())
        BASE_REPORT.write_bytes(REPORT.read_bytes())
    parent = json.loads(BASELINE.read_bytes())
    assert json.loads(BASE_REPORT.read_bytes())['manifestSha256'] == sha(BASELINE.read_bytes())

    for name in parent['files']:
        assert sha((REL / name).read_bytes()) == parent['files'][name]['sha256'], 'A szülőcsomag eltér: ' + name

    pages = [render(None)] + [render(c) for c in COUNTIES]
    for name, _, _, doc in pages:
        (REL / name).write_text(doc, encoding='utf-8', newline='\n')

    edited = {}
    for name in parent['files']:
        before = (REL / name).read_bytes()
        after, edits = inject(name, before)
        if edits:
            (REL / name).write_bytes(after)
            edited[name] = dict(beforeSha256=sha(before), afterSha256=sha(after), edits=edits)

    added = {}
    for p in sorted(REL.rglob('*')):
        rel = p.relative_to(REL).as_posix()
        if p.is_file() and rel not in parent['files']:
            assert rel.startswith(('assets/b2b/', 'ui/b2b-hygiene.')) or rel in {x[0] for x in pages}, 'Váratlan fájl: ' + rel
            added[rel] = dict(sha256=sha(p.read_bytes()), bytes=p.stat().st_size, source='release-support/b2b-hygiene')
    check(pages, parent, edited)

    overlay = dict(version=1, parentSha256=sha(BASELINE.read_bytes()), reportSha256=sha(BASE_REPORT.read_bytes()),
                   contentSha256=sha((HERE / 'content.py').read_bytes()), dataSha256=sha((HERE / 'data/ksh-2025.json').read_bytes()), buildSha256=sha((HERE / 'build.py').read_bytes()),
                   files=edited, added=added)
    OVERLAY.write_text(json.dumps(overlay, ensure_ascii=False, indent=1), encoding='utf-8', newline='\n')
    files = dict(parent['files'])
    for name, rec in edited.items():
        data = (REL / name).read_bytes()
        files[name] = dict(parent['files'][name], sha256=sha(data), bytes=len(data))
    files.update(added)
    new = dict(parent, files=dict(sorted(files.items())), b2bOverlay=dict(path='release-support/b2b-hygiene/overlay.json', sha256=sha(OVERLAY.read_bytes())))
    MANIFEST.write_text(json.dumps(new, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    report = json.loads(BASE_REPORT.read_bytes())
    report.update(manifestSha256=sha(MANIFEST.read_bytes()), b2b=dict(pages=len(pages), editedFiles=len(edited), addedFiles=len(added)), issues=[])
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(f'{len(pages)} oldal, {len(edited)} bekötött fájl, {len(added)} új fájl. Önellenőrzés rendben.')


def check(pages, parent, edited):
    banned = ['99,9', 'Kirby', 'KIRBY', 'atkamentes', 'allergiamentes', 'fertőtlenít', 'csíramentes', 'antibakteriális', 'vegyszermentes', 'elpusztítja', 'garantált', 'Hotelstars']
    titles, descs = set(), set()
    for name, title, desc, doc in pages:
        assert len(title) <= 70, (name, len(title), title)
        assert 70 <= len(desc) <= 165, (name, len(desc), desc)
        assert doc.count('<h1') == 1 and f'<link rel="canonical" href="{BASE}{name}">' in doc, name
        text = re.sub(r'<[^>]+>', ' ', doc)
        for allowed in ('nem ígérünk „atkamentességet”, fertőtlenítést vagy allergiamentes szobát', 'kártevőirtást vagy az egészségügyi fertőtlenítést'):
            text = text.replace(allowed, '')  # tagadó mondatok: épp azt írják, amit nem ígérünk
        for w in banned:
            assert w not in text, (name, w)
        assert '{' not in re.sub(r'<script.*?</script>|<style.*?</style>|style="[^"]*"', '', doc, flags=re.S), (name, 'kitöltetlen helyőrző')
        for ref in set(re.findall(r'(?:src|href)="(?![a-z]+:)([^"#?]+)', doc)) | set(re.findall(r'(assets/b2b/[\w.-]+) \d+w', doc)):
            assert (REL / ref).is_file(), (name, ref)
        for data in re.findall(r'<script type="application/(?:ld\+)?json">(.*?)</script>', doc, re.S):
            json.loads(data)
        titles.add(title); descs.add(desc)
    assert len(titles) == len(pages) == len(descs) == 21
    html_pages = [n for n in parent['files'] if n.endswith('.html') and '/' not in n]
    for n in html_pages:
        s = (REL / n).read_text(encoding='utf-8')
        if n in SKIP or 'http-equiv="refresh"' in s:
            assert n not in edited, n
            continue
        assert f'href="{HUB_PAGE}.html">Cégeknek<' in s, ('nincs menüpont', n)
        if '<footer' in s:
            assert s.count('class="eco-b2b-band"') == 1 and FOOT_LINK in s, ('nincs sáv vagy láblécsor', n)
    for n, rec in edited.items():
        assert sha(restore((REL / n).read_bytes(), rec['edits'])) == parent['files'][n]['sha256'], ('visszaállítás', n)
    sz = KSH['areas']['szabolcs-szatmar-bereg']['monthly']
    assert sz.index(min(sz)) == 11  # a szöveg szerint ott a december a legcsendesebb


if __name__ == '__main__':
    build()
