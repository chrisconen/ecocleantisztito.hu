"""Render the published pages and prove the language switcher is actually visible.

Reading the CSS is not enough: the first version was correct in the markup and
completely hidden behind .theme-toggle, which is fixed bottom-right with
z-index 1001 and moves to exactly the same spot below 768px.

This measures the real layout and asks the browser which element is on top at
the switcher's centre.
"""
import http.server, socketserver, threading, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1] / 'release'
PORT = 8123
PAGES = ['index.html', 'karpittisztitas-siofok.html', 'en/index.html']
SIZES = [('desktop', 1440, 900), ('mobile', 390, 844)]


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)

    def log_message(self, *a):
        pass


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
                    info = page.evaluate("""() => {
                        const el = document.querySelector('.lang-switch');
                        if (!el) return {found: false};
                        const r = el.getBoundingClientRect();
                        const cs = getComputedStyle(el);
                        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
                        const top = document.elementFromPoint(cx, cy);
                        const toggle = document.querySelector('.theme-toggle');
                        const t = toggle && toggle.getBoundingClientRect();
                        return {
                            found: true, text: el.textContent.trim(), href: el.getAttribute('href'),
                            rect: {x: Math.round(r.x), y: Math.round(r.y),
                                   w: Math.round(r.width), h: Math.round(r.height)},
                            display: cs.display, visibility: cs.visibility, opacity: cs.opacity,
                            inViewport: r.width > 0 && r.height > 0 && r.top >= 0
                                        && r.bottom <= innerHeight && r.right <= innerWidth,
                            topElement: top ? (top.className || top.tagName) : null,
                            isOnTop: !!top && (top === el || el.contains(top)),
                            toggleRect: t ? {x: Math.round(t.x), y: Math.round(t.y),
                                             w: Math.round(t.width), h: Math.round(t.height)} : null,
                        };
                    }""")
                    ok = info.get('found') and info['inViewport'] and info['isOnTop'] \
                        and info['display'] != 'none' and info['visibility'] != 'hidden' \
                        and float(info['opacity']) > 0.5
                    mark = 'OK ' if ok else 'FAIL'
                    print(f'{mark} {label:7} {rel:32} {info.get("text","-"):4} '
                          f'rect={info.get("rect")} top={info.get("topElement")}')
                    if not ok:
                        failures.append((label, rel, info))
                page.close()
            browser.close()
        httpd.shutdown()
        if failures:
            print('\nFAILURES:')
            for label, rel, info in failures:
                print(f'  {label} {rel}: {info}')
            sys.exit(1)
        print('\nPASS: language switcher is rendered, inside the viewport and the topmost '
              'element at its own centre, on every page and both breakpoints')


if __name__ == '__main__':
    main()
