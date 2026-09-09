"""Dependency-free gate for the exact, prebuilt GitHub Pages artifact."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import hashlib, json, re, sys
import importlib.util

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'release'
MANIFEST = ROOT / 'release-support/release-manifest.json'
REPORT = ROOT / 'release-support/release-verification.json'

def digest(data):
    return hashlib.sha256(data).hexdigest()

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []
        self.preview = False
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'meta' and a.get('name') in ('robots', 'googlebot'):
            self.preview |= bool(re.search(r'noindex|nofollow', a.get('content', ''), re.I))
        self.preview |= a.get('id') == 'demoResult' or 'missing-source' in a.get('class', '').split()
        self.urls.extend(a[k] for k in ('href', 'src', 'poster', 'data-src', 'data-full', 'data-zoom', 'data-booking-url') if a.get(k))

errors = []
manifest_bytes = MANIFEST.read_bytes()
manifest = json.loads(manifest_bytes)
report = json.loads(REPORT.read_text('utf-8'))
if report.get('issues'):
    errors.append('Full release verification has unresolved issues')
if report.get('manifestSha256') != digest(manifest_bytes):
    errors.append('Verification does not cover this exact release manifest')
if manifest.get('unresolved'):
    errors.append('Build has unresolved dependencies')
if manifest.get('widgetOverlay'):
    spec=importlib.util.spec_from_file_location('widget_overlay',ROOT/'release-support/verify-widget-overlay.py')
    overlay_module=importlib.util.module_from_spec(spec);spec.loader.exec_module(overlay_module)
    errors.extend(overlay_module.verify(manifest))
elif manifest.get('approvedMediterranean'):
    approved_path=ROOT/'demo/mediterranean/manifest.json'
    approved_bytes=approved_path.read_bytes()
    if digest(approved_bytes)!=manifest['approvedMediterranean']['manifestSha256']:
        errors.append('Mediterranean approval manifest mismatch')
    approved=json.loads(approved_bytes)
    if len(approved['pages'])!=15 or sorted(p['file'] for p in approved['pages'])!=sorted(manifest['approvedMediterranean']['pages']):
        errors.append('Mediterranean approval scope mismatch')
    for page in approved['pages']:
        if digest((ROOT/'demo'/page['file']).read_bytes())!=page['outputSha256']:
            errors.append('Reviewed Mediterranean source differs: '+page['file'])
for required in ('index.html', 'CNAME', 'sitemap.xml', 'robots.txt', 'ui/booking-live.js', 'ui/calendar-live.js'):
    if required not in manifest['files']:
        errors.append('Required production document missing: ' + required)

def check_url(value, name):
    url = urlsplit(value)
    if url.scheme or url.netloc or not url.path:
        return
    target = ((OUT if url.path.startswith('/') else (OUT / name).parent) / unquote(url.path).lstrip('/')).resolve()
    if not target.is_relative_to(OUT.resolve()) or not target.is_file():
        errors.append(name + ': unresolved local URL ' + value)

for name, record in manifest['files'].items():
    target = (OUT / name).resolve()
    if not target.is_relative_to(OUT.resolve()) or target.is_symlink() or not target.is_file():
        errors.append('Invalid artifact path: ' + name)
        continue
    data = target.read_bytes()
    if digest(data) != record['sha256']:
        errors.append('Artifact changed after verification: ' + name)
    if name.endswith('.html'):
        page = Page()
        page.feed(data.decode('utf-8-sig'))
        if page.preview:
            errors.append('Preview behavior or noindex in ' + name)
        for url in page.urls:
            check_url(url, name)
    if name.endswith('.css'):
        for match in re.finditer(r'''url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]+))\s*\)|@import\s+["']([^"']+)["']''', data.decode('utf-8-sig')):
            check_url(next(value for value in match.groups() if value is not None), name)
actual = {p.relative_to(OUT).as_posix() for p in OUT.rglob('*') if p.is_file()}
if actual != set(manifest['files']):
    errors.append('Unexpected artifact files: ' + ', '.join(sorted(actual ^ set(manifest['files']))))
print(json.dumps({'files': len(actual), 'errorCount': len(errors), 'errors': errors[:20]}, ensure_ascii=False))
sys.exit(bool(errors))
