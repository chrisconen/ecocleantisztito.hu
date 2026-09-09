#!/usr/bin/env python3
"""Real Chromium HTTP-cache regression for versioned NovaLife CSS/JS.

Uses a temporary localhost HTTP server; no Playwright routing (routing disables
HTTP cache), provider calls, uploads or external writes. Tests release markup.
"""
from __future__ import annotations

import asyncio
from collections import Counter
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import mimetypes
from pathlib import Path
import re
import subprocess
import threading
from urllib.parse import unquote, urlsplit

from verify_novalife import Document, files

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent / 'qa'
RELEASE = ROOT / 'release'
WIDTHS = (320, 390, 1440)
OLD_REVISION = 'd2f09a9'


def inspect_markup():
    assets = {}
    for name in ('design.css', 'app.js'):
        body = (RELEASE / 'material-recognition' / name).read_bytes()
        assets[name] = {'body': body, 'version': hashlib.sha256(body).hexdigest()[:12]}
    for name in files():
        doc = Document((RELEASE / name).read_text(encoding='utf-8'))
        for file, attribute in (('design.css', 'href'), ('app.js', 'src')):
            urls = [node.attrs[attribute] for node in doc.nodes if
                    attribute in node.attrs and 'material-recognition/' + file in node.attrs[attribute]]
            assert urls == ['material-recognition/' + file + '?v=' + assets[file]['version']], (name, file, urls)
        ctas = [node for node in doc.nodes if 'eco-novalife-cta' in node.classes()]
        assert len(ctas) == 1, name
        svgs = [node for node in doc.nodes if node.tag == 'svg' and ctas[0] in list(node.ancestors())]
        assert len(svgs) == 2, (name, 'Expected decoration and arrow SVG')
        assert [(svg.attrs.get('width'), svg.attrs.get('height')) for svg in svgs] == [('62', '62'), ('18', '18')], name
        assert all(svg.attrs.get('viewbox') for svg in svgs), (name, 'Invalid SVG viewBox')
    return assets


class FixtureServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, assets):
        super().__init__(('127.0.0.1', 0), Handler)
        self.assets = assets
        self.current = False
        self.hits = Counter()
        self.html = (RELEASE / 'index.html').read_text(encoding='utf-8')
        self.cta = re.search(r'<aside\b[^>]*class="eco-novalife-cta[^"]*"[^>]*>.*?</aside>', self.html, re.S).group(0)
        self.old = {name: subprocess.run(['git', 'show', OLD_REVISION + ':demo/material-recognition/' + name],
                                        cwd=ROOT, check=True, capture_output=True).stdout for name in assets}
        assert b'.eco-novalife-cta' not in self.old['design.css'], 'Warm fixture must predate NovaLife CSS'


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def do_POST(self):
        self.server.hits['UNEXPECTED_POST'] += 1
        self.send_error(405)

    def do_GET(self):
        address = urlsplit(self.path)
        self.server.hits[self.path] += 1
        content_type, cache = 'text/html; charset=utf-8', 'no-store'
        if address.path == '/case.html':
            html = self.server.html
            if not self.server.current:
                html = re.sub(r'(material-recognition/(?:design\.css|app\.js))\?v=[a-f0-9]+', r'\1', html)
            body = html.encode('utf-8')
        elif address.path == '/fallback.html':
            body = ('<!doctype html><html lang="hu"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CSS nélküli SVG-próba</title><body>' + self.server.cta + '</body></html>').encode('utf-8')
        elif address.path == '/api/material-health':
            content_type = 'application/json'
            body = b'{"enabled":false,"ready":false,"collection_enabled":false,"turnstile_site_key":""}'
        elif address.path in ('/material-recognition/design.css', '/material-recognition/app.js'):
            name = address.path.rsplit('/', 1)[1]
            body = self.server.assets[name]['body'] if address.query else self.server.old[name]
            content_type = 'text/css' if name.endswith('.css') else 'text/javascript'
            cache = 'public, max-age=31536000, immutable'
        else:
            target = (RELEASE / unquote(address.path).lstrip('/')).resolve()
            if not target.is_relative_to(RELEASE.resolve()) or not target.is_file():
                self.send_error(404)
                return
            body = target.read_bytes()
            content_type = mimetypes.guess_type(str(target))[0] or 'application/octet-stream'
            cache = 'public, max-age=3600'
        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', cache)
        # Prevent remote script/connect activity without disabling HTTP cache.
        self.send_header('Content-Security-Policy', "default-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data: blob:; font-src 'self' data:")
        self.end_headers()
        try:
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass


METRICS = """() => ({
 icons:[...document.querySelectorAll('.eco-novalife-cta svg')].map(svg=>{const r=svg.getBoundingClientRect();return {width:r.width,height:r.height,attributeWidth:svg.getAttribute('width'),attributeHeight:svg.getAttribute('height')};}),
 rules:[...document.styleSheets].filter(sheet=>sheet.href?.includes('material-recognition/design.css')).map(sheet=>({href:sheet.href,novalifeRules:[...sheet.cssRules].filter(rule=>rule.cssText.includes('eco-novalife-cta')).length})),
 resourceTiming:performance.getEntriesByType('resource').filter(entry=>/material-recognition\\/(design.css|app.js)/.test(entry.name)).map(entry=>({name:entry.name,transferSize:entry.transferSize,encodedBodySize:entry.encodedBodySize}))
})"""


async def verify(server):
    from playwright.async_api import async_playwright
    origin = f'http://127.0.0.1:{server.server_port}'
    report = {'oldRevision': OLD_REVISION, 'pagesWithVersionedAssetsAndBoundedSvgMarkup': 35,
              'widths': list(WIDTHS), 'views': [], 'cacheEvents': [], 'liveProviderCalls': 0}
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
        page = await context.new_page()
        cdp = await context.new_cdp_session(page)
        await cdp.send('Network.enable')
        requests = {}
        cdp.on('Network.requestWillBeSent', lambda event: requests.update({event['requestId']: event['request']['url']}))
        cdp.on('Network.requestServedFromCache', lambda event: report['cacheEvents'].append(requests.get(event['requestId'], '')))
        await page.goto(origin + '/case.html?warm=1', wait_until='networkidle')
        warm = await page.evaluate(METRICS)
        assert warm['rules'][0]['novalifeRules'] == 0, 'Old stylesheet unexpectedly contains NovaLife rules'
        await page.goto(origin + '/case.html?warm=2', wait_until='networkidle')
        warm_cached = await page.evaluate(METRICS)
        for name in server.assets:
            assert server.hits['/material-recognition/' + name] == 1, name + ' did not come from warm HTTP cache'
            assert any(entry['name'].endswith('/material-recognition/' + name) and entry['transferSize'] == 0
                       for entry in warm_cached['resourceTiming']), name + ' missing cache timing proof'
        report['warmCache'] = warm_cached
        report['warmUnversionedHits'] = {name: server.hits['/material-recognition/' + name] for name in server.assets}
        server.current = True
        await page.reload(wait_until='networkidle')
        current = await page.evaluate(METRICS)
        assert current['rules'][0]['novalifeRules'] > 0, 'Versioned stylesheet still uses old cached CSS'
        for name, asset in server.assets.items():
            assert server.hits['/material-recognition/' + name + '?v=' + asset['version']] == 1, name + ' new URL not fetched'
            assert server.hits['/material-recognition/' + name] == 1, name + ' reload reused unversioned asset'
        report['versionedReload'] = current
        for mode in ('styled', 'no-css-fallback'):
            if mode == 'no-css-fallback':
                await page.goto(origin + '/fallback.html', wait_until='networkidle')
            for width in WIDTHS:
                await page.set_viewport_size({'width': width, 'height': 1000})
                await page.locator('.eco-novalife-cta').scroll_into_view_if_needed()
                await page.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
                metrics = await page.evaluate(METRICS)
                assert len(metrics['icons']) == 2
                decoration, arrow = metrics['icons']
                assert 0 < decoration['width'] <= 84 and 0 < decoration['height'] <= 84, (mode, width, decoration)
                assert arrow['width'] == 18 and arrow['height'] == 18, (mode, width, arrow)
                report['views'].append({'mode': mode, 'width': width, 'icons': metrics['icons']})
                path = OUT / f'novalife-cache-{mode}-{width}.png'
                await page.locator('.eco-novalife-cta').screenshot(path=str(path))
        assert not server.hits['UNEXPECTED_POST'], 'Unexpected form/API submission'
        await context.close()
        await browser.close()
    report['passed'] = True
    return report


def main():
    OUT.mkdir(exist_ok=True)
    server = FixtureServer(inspect_markup())
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        report = asyncio.run(verify(server))
        target = OUT / 'novalife-cache-verification.json'
        target.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
        print(json.dumps({'passed': report['passed'], 'pages': 35, 'views': len(report['views']),
                          'warmCacheHits': report['warmUnversionedHits'], 'report': str(target), 'liveProviderCalls': 0}))
    finally:
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    main()
