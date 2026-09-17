"""Prove no image on the English pages 404s.

Two separate places wrote furniture photos with a path relative to the document
and shipped them to /en/, where one level is missing:

  * the price calculator — release/studio/configurator.js builds the src from
    the mount's data-assets base. That attribute holds a directory, so
    verify-package.py, which resolves URLs to packaged files, cannot see it, and
    the i18n URL rewriter did not prefix it either. 41 pages.
  * the order form — release/ui/booking-live-en.js wrote assets/…-card.webp for
    every upholstery item, so all six furniture cards 404'd on /en/index.html.

Neither is visible in the HTML: both srcs are set at runtime. So this renders
the pages, scrolls to force lazy loading, and fails on any image request that
comes back 4xx/5xx.
"""
import http.server, socketserver, threading, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1] / 'release'
PORT = 8124
# one page per calculator template, plus the booking page itself
PAGES = ['en/upholstery-cleaning-siofok.html',    # studio configurator
         'en/mattress-cleaning-baja.html',        # studio, mattress variant
         'en/upholstery-cleaning-kalocsa.html',   # mediterranean configurator
         'en/index.html',                         # order form
         'karpittisztitas-siofok.html',           # Hungarian twin, must stay fine
         'karpittisztitas-kalocsa.html']

# A fetch that came back 4xx/5xx is the whole bug class and has no false
# positives. naturalWidth === 0 does not work as the signal: lazy images below
# the fold and the empty placeholders in the photo analyser legitimately have it.
def scan(page, url):
    bad = []
    page.on('response', lambda r: bad.append((r.status, r.url))
            if r.status >= 400 and r.request.resource_type == 'image' else None)
    page.goto(url, wait_until='load')
    # lazy images only fetch once they approach the viewport
    for _ in range(14):
        page.mouse.wheel(0, 1600)
        page.wait_for_timeout(250)
    page.wait_for_timeout(1500)
    return bad


def main():
    with socketserver.TCPServer(('127.0.0.1', PORT), Handler) as httpd:
        threading.Thread(target=httpd.serve_forever, daemon=True).start()
        failures = []
        with sync_playwright() as p:
            browser = p.chromium.launch()
            for rel in PAGES:
                page = browser.new_page(viewport={'width': 1440, 'height': 900})
                bad = scan(page, f'http://127.0.0.1:{PORT}/{rel}')
                print(f'{"OK  " if not bad else "FAIL"} {rel:38} imageErrors={len(bad)}')
                for status, url in bad:
                    print(f'      HTTP {status} {url}')
                if bad:
                    failures.append(rel)
                page.close()
            browser.close()
        httpd.shutdown()
        if failures:
            print('\nFAILURES: ' + ', '.join(failures))
            sys.exit(1)
        print('\nPASS: every image on both calculator templates loads, in both languages')


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)

    def log_message(self, *a):
        pass


if __name__ == '__main__':
    main()
