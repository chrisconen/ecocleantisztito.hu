"""Viselkedési füstpróba a release/ fán (CI-ben a bájtszintű verify után fut).

    python release-support/smoke.py [--base https://ecocleantisztito.hu/]

Alapból helyi szervert indít a release/ fölött, és minden külső kérést blokkol (hermetikus). Ellenőrzi:
0 pageerror a fontos oldalakon (asztali + mobil nézet), a csúszka billentyűvel mozdul, a mobilmenü-panel
inert állapota frissül, a jogi oldalak és a lábléc-linkek élnek, és a győri kalkulátor nem ígér díjmentes kiszállást.
"""
import functools, http.server, socketserver, sys, threading
from pathlib import Path
from playwright.sync_api import sync_playwright

REL = Path(__file__).resolve().parent.parent / 'release'
PAGES = ['index.html', 'en/index.html', 'matractisztitas-gyor.html', 'karpittisztitas-gyor.html', 'megrendeles.html',
         'en/booking.html', 'matractisztitas-cegeknek.html', 'matractisztitas-cegeknek-zala.html', 'komarom.html',
         'karpittisztitas-elotte-utana.html', 'matractisztitas-siofok.html', 'en/upholstery-cleaning-gyor.html',
         'adatvedelem.html', 'aszf.html', 'en/privacy.html', 'en/terms.html']


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def serve():
    httpd = socketserver.ThreadingTCPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(REL)))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return f'http://127.0.0.1:{httpd.server_address[1]}/'


def main():
    live = '--base' in sys.argv
    base = sys.argv[sys.argv.index('--base') + 1] if live else serve()
    fails = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for label, opts in (('desktop', dict(viewport=dict(width=1366, height=900))),
                            ('mobile', dict(viewport=dict(width=390, height=844), is_mobile=True, has_touch=True))):
            ctx = browser.new_context(**opts)
            if not live:  # hermetikus: csak a helyi szerver
                ctx.route('**/*', lambda r: r.continue_() if r.request.url.startswith(base) else r.abort())
            for path in PAGES:
                page = ctx.new_page()
                errors = []
                page.on('pageerror', lambda e, errors=errors: errors.append(str(e)))
                resp = page.goto(base + path, wait_until='load')
                page.wait_for_timeout(400)
                if not resp or resp.status != 200:
                    fails.append(f'{label} {path}: HTTP {resp and resp.status}')
                if errors:
                    fails.append(f'{label} {path}: pageerror {errors[:3]}')
                if path.endswith('.html') and page.locator('footer').count() and page.locator('footer .eco-legal a').count() != 2:
                    fails.append(f'{label} {path}: a lábléc jogi linkjei hiányoznak')
                if path == 'index.html':
                    knob = page.locator('.ba-slider-knob').first
                    if knob.count():
                        before = knob.get_attribute('aria-valuenow')
                        knob.focus(); page.keyboard.press('ArrowRight')
                        after = knob.get_attribute('aria-valuenow')
                        if before is None or before == after:
                            fails.append(f'{label} index.html: a csúszka nem mozdul ({before} -> {after})')
                    panel = page.locator('.nav-mobile-link + *').first
                    if panel.count() and not panel.evaluate('e => e.inert'):
                        fails.append(f'{label} index.html: a zárt mobilmenü-panel nem inert')
                if path == 'matractisztitas-gyor.html' and 'díjmentes kiszállás' in page.content():
                    fails.append(f'{label} {path}: díjmentes kiszállást ígér')
                page.close()
            ctx.close()
        browser.close()
    print('\n'.join(fails) or f'Füstpróba rendben: {len(PAGES)} oldal × 2 nézet.')
    sys.exit(bool(fails))


if __name__ == '__main__':
    main()
