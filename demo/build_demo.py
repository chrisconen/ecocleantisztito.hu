"""Build the isolated design prototype from the unchanged Hungarian landing page."""
from pathlib import Path
import re
import unicodedata

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'demo'
source = (ROOT / 'index.html').read_text(encoding='utf-8-sig')
html = source.replace('data-theme="dark"', 'data-theme="light"')
html = re.sub(r'\s*<!-- Theme Toggle Button -->\s*<button\b[^>]*id="themeToggle"[^>]*>.*?</button>', '', html, flags=re.S)
html = re.sub(r'<meta name="(?:robots|googlebot)"[^>]*>', '<meta name="robots" content="noindex, nofollow">', html, count=1)
html = re.sub(r'<meta name="googlebot"[^>]*>', '', html)
html = html.replace('<title>', '<title>DEMÓ · ')
html = html.replace('<h1 class="hero-title">', '<h1 class="hero-title" id="hero-title">')

def local_url(match):
    attr, url = match.group(1), match.group(2)
    if url == '/':
        return f'{attr}="./index.html"'
    if re.match(r'^(?:#|https?:|//|tel:|mailto:|data:)', url):
        return match.group(0)
    candidate = ROOT / url
    if not candidate.exists() and url.endswith('.html'):
        normalized = ''.join(c for c in unicodedata.normalize('NFD', url) if unicodedata.category(c) != 'Mn')
        if (ROOT / normalized).exists():
            url = normalized
        elif (ROOT / ('karpittisztitas-' + normalized)).exists():
            url = 'karpittisztitas-' + normalized
    return f'{attr}="../{url}"'

html = re.sub(r'(href|src)="([^"]+)"', local_url, html)
html = html.replace('family=Outfit:wght@400;500;600;700', 'family=Manrope:wght@400;500;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500')
html = re.sub(r'<link rel="stylesheet" href="\.\./[^"\n]+\.css"[^>]*>', '', html)
html = html.replace('</head>', '<link rel="stylesheet" href="design.css">\n<link rel="preload" as="image" href="assets/living-room.webp" fetchpriority="high">\n</head>')
html = html.replace('<body>', '<body class="eco-demo">')
html = html.replace('<div class="hero-content">', '<div class="hero-content"><div class="hero-eyebrow"><span></span> ECO CLEAN · PRÉMIUM KÁRPITTISZTÍTÁS</div>', 1)
html = re.sub(r'<div class="hero-placeholder">.*?</div>', '''<div class="hero-placeholder">
    <img id="interiorImage" src="assets/living-room.webp" alt="Generált enteriőrkép: zsályazöld kanapé egy világos, modern nappaliban" width="1536" height="1024" fetchpriority="high" decoding="async">
    <div class="interior-index" aria-hidden="true"><span id="interiorNumber">01</span><span> / 05</span></div>
    <div class="interior-caption"><span id="interiorCaption">Kanapé</span><span>Generált enteriőrkép</span></div>
    <div class="interior-controls" role="group" aria-label="Enteriőrgaléria">
        <button type="button" class="interior-tab active" data-interior="0" aria-label="Kanapé enteriőr" aria-pressed="true"><img src="assets/living-room-thumb.webp" alt="" width="80" height="60"><span>Kanapé</span></button>
        <button type="button" class="interior-tab" data-interior="1" aria-label="Szófa enteriőr" aria-pressed="false"><img src="assets/sofa-thumb.webp" alt="" width="80" height="60"><span>Szófa</span></button>
        <button type="button" class="interior-tab" data-interior="2" aria-label="Fotel enteriőr" aria-pressed="false"><img src="assets/armchair-thumb.webp" alt="" width="80" height="60"><span>Fotel</span></button>
        <button type="button" class="interior-tab" data-interior="3" aria-label="Ebédlő szék enteriőr" aria-pressed="false"><img src="assets/dining-thumb.webp" alt="" width="80" height="60"><span>Ebédlő</span></button>
        <button type="button" class="interior-tab" data-interior="4" aria-label="Irodai szék enteriőr" aria-pressed="false"><img src="assets/office-thumb.webp" alt="" width="80" height="60"><span>Iroda</span></button>
    </div>
</div>''', html, count=1, flags=re.S)
# Add photography within the existing service section, without adding sections.
html = html.replace('<a href="#" class="service-card">', '<a href="#booking" class="service-card">')
html = html.replace('<div class="services-grid">', '<div class="services-grid">', 1)
html = html.replace('<a href="#booking" class="service-card">', '<a href="#booking" class="service-card service-card-featured"><img class="service-photo" src="assets/sofa.webp" alt="Generált kép: púderrózsaszín szófa egy berendezett nappaliban" width="1200" height="800" loading="lazy">', 1)
html = html.replace('src="../img/karpittisztitas-atkairtas.webp" alt="Professzionális kárpittisztítás és atkaírtás – kanapé mélytisztítás vegyszermentes technológiával"', 'src="assets/armchair.webp" alt="Generált enteriőrkép: világos kárpitozott fotel egy nyugodt olvasósarokban"')
html = html.replace('<a href="#" class="card-service">', '<a href="#booking" class="card-service">')
html = html.replace('<span class="config-status" id="configStatus">● LIVE</span>', '<span class="config-status" id="configStatus">● DEMÓ</span>')
html = html.replace('<!-- Step 1: Customer Type -->', '<p class="demo-notice"><span>Demó mód</span> Az árkalkuláció kipróbálható. A mintaidőpontok nem valós szabad időpontok, az adatokból nem készül megrendelés.</p>\n<!-- Step 1: Customer Type -->')
html = html.replace('<div id="bookingCalendar"></div>', '<p class="demo-calendar-note">Mintaidőpontok · kizárólag a demó kipróbálásához</p><div id="bookingCalendar"></div>')
html = html.replace('src="../booking-config.js"', 'src="booking-demo.js"')
html = html.replace('src="../script.js"', 'src="navigation.js"')
html = html.replace('src="../booking-calendar.js"', 'src="calendar-demo.js"')
html = html.replace('<script src="../modern-animations.js" defer></script>', '')
html = html.replace('<script src="../before-after-slider.js"></script>', '')
html = html.replace('src="../reviews.js"', 'src="reviews-demo.js"')
html = html.replace('</body>', '''<dialog id="demoResult" class="demo-result" aria-labelledby="demoResultTitle">
    <div class="result-mark" aria-hidden="true">✓</div><p class="hero-eyebrow">ECO CLEAN · DEMÓ</p>
    <h2 id="demoResultTitle">A próba elkészült.</h2>
    <p>A konfigurációt végigpróbálta. Nem küldtünk megrendelést, és nem foglaltunk le időpontot.</p>
    <p class="demo-result-total" id="demoResultTotal"></p>
    <form method="dialog"><button class="btn btn-primary">Vissza az oldalhoz</button></form>
</dialog>
<script src="design.js"></script>
</body>''')
(OUT / 'index.html').write_text(html, encoding='utf-8')

navigation = (ROOT / 'script.js').read_text(encoding='utf-8-sig')
navigation = re.sub(r'// Theme Toggle.*?(?=// Nav scroll effect)', "// The demo uses one light palette, irrespective of saved preferences.\ndocument.documentElement.dataset.theme = 'light';\n\n", navigation, flags=re.S)
navigation = navigation.replace("const target = document.querySelector(a.getAttribute('href'));", "const href = a.getAttribute('href');\n        const target = href.length > 1 ? document.getElementById(decodeURIComponent(href.slice(1))) : null;")
navigation = navigation.replace("const href = data.directLink ? slug + '.html' : normalizedKey + '-' + slug + '.html';", "const href = '../' + (data.directLink ? slug + '.html' : normalizedKey + '-' + slug + '.html');")
# The prototype has its own gentle reveal, without the original scanning effects.
navigation = navigation.split('// ===== STEP CARDS SCANNER ANIMATION')[0]
navigation = re.sub(r'    setTimeout\(\(\) => \{\s*showCard.classList.add\(\x27scanning\x27\);.*?    \}, 100\);', "    showCard.classList.add('active');", navigation, flags=re.S)
(OUT / 'navigation.js').write_text(navigation, encoding='utf-8')

booking = (ROOT / 'booking-config.js').read_text(encoding='utf-8-sig')
# Retain source validation and pricing, replace actual transmission at source.
start = booking.index("    const fullAddress =", booking.index('async function submitBooking'))
end = booking.index('function showSuccessModal', start)
booking = booking[:start] + '''    if (!Object.values(State.selectedItems).some(item => item.count > 0)) {
        alert('Kérjük válasszon legalább egy tételt!'); return false;
    }
    if (!BookingCalendar.getSelectedSlot()) {
        alert('Kérjük válasszon egy mintaidőpontot!'); return false;
    }
    window.showDemoResult();
    return false;
}

''' + booking[end:]
start = booking.index('    // Összeállítjuk a megrendelés részleteit', booking.index('async function submitLargeOrder'))
end = booking.index('function showLargeOrderSuccess', start)
booking = booking[:start] + '    window.showDemoResult();\n}\n\n' + booking[end:]
booking = re.sub(r"https://hub\.centaur-lang\.dev/[^'\"\s]+", 'demo-disabled', booking)
booking = booking.replace('<button class="counter-btn" onclick="decrementItem', '<button type="button" class="counter-btn" aria-label="${item.name} mennyiségének csökkentése" onclick="decrementItem')
booking = booking.replace('<button class="counter-btn" onclick="incrementItem', '<button type="button" class="counter-btn" aria-label="${item.name} mennyiségének növelése" onclick="incrementItem')
booking = booking.replace('<div class="item-main">', '''${category === 'karpit' ? `<img class="item-photo" src="assets/${({szofa:'sofa',l_kanape:'living-room',u_kanape:'living-room',fotel:'armchair',ebedlo_szek:'dining',irodai_szek:'office'})[id]}-card.webp" alt="Generált enteriőrkép: ${item.name}" width="600" height="400" loading="lazy">` : ''}
            <div class="item-main">''')
(OUT / 'booking-demo.js').write_text(booking, encoding='utf-8')

reviews = (ROOT / 'reviews.js').read_text(encoding='utf-8-sig')
reviews = reviews.replace('root.style.display = "none";', 'mount.innerHTML = \'<p class="reviews-unavailable">A Google-vélemények jelenleg nem tölthetők be. Kérjük, próbálja újra később.</p>\';')
reviews = reviews.replace('fetch(endpoint)', 'fetch(endpoint, { signal: AbortSignal.timeout(8000) })')
# Keep review navigation manual for the calm visual prototype.
reviews = reviews.replace('var AUTO_MS = 3000;', 'var AUTO_MS = 0;')
reviews = reviews.replace('if (n > 1) timer = setInterval(nextF, AUTO_MS);', 'if (n > 1 && AUTO_MS > 0) timer = setInterval(nextF, AUTO_MS);')
(OUT / 'reviews-demo.js').write_text(reviews, encoding='utf-8')
print('Demo HTML and isolated navigation / booking scripts written. Production files unchanged.')
