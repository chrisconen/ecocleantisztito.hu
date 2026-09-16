"""Screenshot the bottom-right corner so the switcher can be seen, not argued about."""
import http.server, socketserver, threading
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1] / 'release'
OUTDIR = Path(__file__).resolve().parents[1] / 'scratch'
PORT = 8124


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)

    def log_message(self, *a):
        pass


with socketserver.TCPServer(('127.0.0.1', PORT), Handler) as httpd:
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for label, w, h, rel, out in [
            ('desktop', 1440, 900, 'index.html', 'switcher-desktop-hu.png'),
            ('mobile', 390, 844, 'index.html', 'switcher-mobile-hu.png'),
            ('desktop', 1440, 900, 'en/index.html', 'switcher-desktop-en.png'),
        ]:
            page = browser.new_page(viewport={'width': w, 'height': h})
            page.goto(f'http://127.0.0.1:{PORT}/{rel}', wait_until='load')
            page.wait_for_timeout(600)
            box = page.evaluate("""() => {
                const r = document.querySelector('.lang-switch').getBoundingClientRect();
                return {x: r.x, y: r.y, w: r.width, h: r.height};
            }""")
            pad = 60
            page.screenshot(path=str(OUTDIR / out), clip={
                'x': max(0, box['x'] - pad * 3), 'y': max(0, box['y'] - pad),
                'width': min(w, box['w'] + pad * 4), 'height': min(h, box['h'] + pad * 2)})
            print(f'{label:7} {rel:14} -> {out}')
            page.close()
        browser.close()
    httpd.shutdown()
