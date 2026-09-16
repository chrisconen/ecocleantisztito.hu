"""Render the published pages and prove the language switcher is usable.

Being present and unobstructed is not enough, and two shipped versions proved
it: the first sat under another fixed control, the second cleared it and still
read as a stray button floating over the hero photo. Nobody looks for a
language switch in the bottom-right corner.

So this asserts placement, not just visibility: the switcher must live inside
the page header and render in the header band at the top of the viewport. Both
header templates in the package are covered — the modern nav and the legacy
bixol header — at both breakpoints.
"""
import http.server, socketserver, threading, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1] / 'release'
PORT = 8123
# modern nav (HU + EN) and legacy bixol header (HU + EN)
PAGES = ['index.html', 'karpittisztitas-siofok.html', 'en/index.html',
         'en/upholstery-cleaning-siofok.html',
         'matractisztitas-baja.html', 'en/mattress-cleaning-baja.html']
SIZES = [('desktop', 1440, 900), ('mobile', 390, 844)]
HEADER_BAND = 200          # px from the top the header occupies on every template

PROBE = """() => {
    const el = document.querySelector('.lang-switch');
    if (!el) return {found: false};
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return {
        found: true, text: el.textContent.trim(), href: el.getAttribute('href'),
        rect: {x: Math.round(r.x), y: Math.round(r.y),
               w: Math.round(r.width), h: Math.round(r.height)},
        display: cs.display, visibility: cs.visibility, opacity: cs.opacity,
        position: cs.position,
        inViewport: r.width > 0 && r.height > 0 && r.top >= 0
                    && r.bottom <= innerHeight && r.right <= innerWidth,
        topElement: top ? (top.className || top.tagName) : null,
        isOnTop: !!top && (top === el || el.contains(top)),
        inHeader: !!el.closest('header, nav'),
        headerOwner: (el.closest('header, nav') || {}).className || null,
    };
}"""


def check(info):
    """Return the reason this placement is unacceptable, or None."""
    if not info.get('found'):
        return 'no .lang-switch element'
    if info['display'] == 'none' or info['visibility'] == 'hidden' or float(info['opacity']) <= .5:
        return 'not visible: ' + info['display']
    if not info['inViewport']:
        return 'outside the viewport'
    if not info['isOnTop']:
        return 'covered by ' + str(info['topElement'])
    if not info['inHeader']:
        return 'not inside a header/nav — this is how the corner pill shipped'
    if info['rect']['y'] > HEADER_BAND:
        return f'renders at y={info["rect"]["y"]}, below the header band'
    return None


def main():
    with socketserver.TCPServer(('127.0.0.1', PORT), Handler) as httpd:
        threading.Thread(target=httpd.serve_forever, daemon=True).start()
        failures = []
        with sync_playwright() as p:
            browser = p.chromium.launch()
            for label, w, h in SIZES:
                page = browser.new_page(viewport={'width': w, 'height': h})
                for rel in PAGES:
                    page.goto(f'http://127.0.0.1:{PORT}/{rel}', wait_until='load')
                    info = page.evaluate(PROBE)
                    why = check(info)
                    print(f'{"OK " if why is None else "FAIL"} {label:7} {rel:38} '
                          f'{info.get("text","-"):3} rect={info.get("rect")} '
                          f'in={info.get("headerOwner")}' + ('' if why is None else f'  <- {why}'))
                    if why:
                        failures.append((label, rel, why))
                page.close()
            browser.close()
        httpd.shutdown()
        if failures:
            print('\nFAILURES:')
            for label, rel, why in failures:
                print(f'  {label} {rel}: {why}')
            sys.exit(1)
        print('\nPASS: the switcher sits in the header, in the header band and unobstructed, '
              'on both templates in both languages at both breakpoints')


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)

    def log_message(self, *a):
        pass


if __name__ == '__main__':
    main()
