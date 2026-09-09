"""Read-only deployed widget/copy verification against the current manifest.

--plan inspects the local release without network calls. Live mode fetches
static files only; it never calls an API, uploads a photo or books.
"""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from html.parser import HTMLParser
import argparse
import hashlib
import html
import json
import posixpath
import re
from pathlib import Path, PurePosixPath
from urllib.parse import quote, urlsplit
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
BASE = 'https://ecocleantisztito.hu/'
MAX_BYTES = 4 * 1024 * 1024


def sha(data):
    return hashlib.sha256(data).hexdigest()


def restore_cloudflare_email(data):
    # Same narrow transform as verify-live.py. The complete restored document
    # must match the release SHA; no DOM or fuzzy comparison.
    def decode(encoded):
        value = bytes.fromhex(encoded)
        return bytes(b ^ value[0] for b in value[1:]).decode('utf-8')
    text = data.decode('utf-8')
    text = re.sub(r'href="/cdn-cgi/l/email-protection#([a-fA-F0-9]+)"', lambda m: 'href="' + html.escape('mailto:' + decode(m[1]), quote=True) + '"', text)
    text = re.sub(r'<span class="__cf_email__" data-cfemail="([a-fA-F0-9]+)">\[email&#160;protected\]</span>', lambda m: html.escape(decode(m[1]), quote=False), text)
    text = re.sub(r'<a href="/cdn-cgi/l/email-protection" class="__cf_email__" data-cfemail="([a-fA-F0-9]+)">\[email&#160;protected\]</a>', lambda m: html.escape(decode(m[1]), quote=False), text)
    text = re.sub(r'<script data-cfasync="false" src="/cdn-cgi/scripts/[a-fA-F0-9]{8}/cloudflare-static/email-decode.min.js"></script>', '', text)
    return text.encode('utf-8')


class AssetReferences(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.urls = []
        self.feed(source)

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag == 'script' and attrs.get('src'):
            self.urls.append(attrs['src'])
        if tag == 'link' and attrs.get('href') and 'stylesheet' in attrs.get('rel', '').split():
            self.urls.append(attrs['href'])


def bound(reference):
    relative = PurePosixPath(reference['path'])
    if relative.is_absolute() or '..' in relative.parts or not str(relative).startswith('release-support/'):
        raise ValueError('Invalid local provenance path')
    path = ROOT / str(relative)
    if path.is_symlink() or not path.resolve().is_relative_to((ROOT / 'release-support').resolve()):
        raise ValueError('Invalid provenance file')
    data = path.read_bytes()
    if sha(data) != reference['sha256']:
        raise ValueError('Overlay does not match current manifest')
    return json.loads(data)


def build_targets():
    manifest_bytes = (ROOT / 'release-support/release-manifest.json').read_bytes()
    manifest = json.loads(manifest_bytes)
    names, widget_pages, changed_copy = set(), set(), set()
    if manifest.get('widgetOverlay'):
        widget = bound(manifest['widgetOverlay'])
        widget_pages = {record['file'] for record in widget['pages']}
        names.update(widget_pages)
        names.update(record['file'] for record in widget['dependencies'])
    if manifest.get('copyOverlay'):
        copy = bound(manifest['copyOverlay'])
        changed_copy = {record['file'] for record in copy['files']}
        if any(not name.endswith(('.html', '.js')) for name in changed_copy):
            raise ValueError('Unexpected copy overlay file type')
        names.update(changed_copy)
    if manifest.get('studioOverlay'):
        studio = bound(manifest['studioOverlay'])
        names.update(record['file'] for record in studio['pages'])
        names.update(record['file'] for record in studio['dependencies'])
    if manifest.get('reviewOverlay'):
        review = bound(manifest['reviewOverlay'])
        names.update(record['file'] for record in review['files'])
    if not names:
        raise ValueError('No widget/copy release overlay to verify')
    references = {}
    for name in manifest['files']:
        if not name.endswith('.html'):
            continue
        for value in AssetReferences((ROOT / 'release' / name).read_text('utf-8')).urls:
            url = urlsplit(value)
            if url.scheme or url.netloc:
                continue
            target = posixpath.normpath(posixpath.join(posixpath.dirname(name), url.path))
            if target not in names or not target.endswith(('.js', '.css')):
                continue
            if url.fragment or target.startswith('/') or '..' in PurePosixPath(target).parts:
                raise ValueError('Invalid release asset reference')
            references.setdefault(target, set()).add(target + ('?' + url.query if url.query else ''))
    targets = []
    for name in sorted(names):
        path = ROOT / 'release' / name
        expected = manifest['files'][name]['sha256']
        if not path.resolve().is_relative_to((ROOT / 'release').resolve()) or path.is_symlink() or sha(path.read_bytes()) != expected:
            raise ValueError('Current local release hash mismatch: ' + name)
        for address in sorted(references.get(name, {name})):
            targets.append({'file': name, 'address': address, 'expectedSha256': expected})
    return targets, {'manifestSha256': sha(manifest_bytes), 'copyOverlay': bool(manifest.get('copyOverlay')),
                     'changedCopyFiles': len(changed_copy), 'changedHtml': sum(name.endswith('.html') for name in changed_copy),
                     'changedJavaScript': sum(name.endswith('.js') for name in changed_copy),
                     'widgetPages': len(widget_pages), 'uniqueFiles': len(names)}


def check(target):
    name, expected = target['file'], target['expectedSha256']
    address = BASE + quote(target['address'], safe='/?=&')
    request = Request(address, headers={'User-Agent': 'ECOClean-ReleaseVerification/2', 'Cache-Control': 'no-cache'})
    try:
        with urlopen(request, timeout=25) as response:
            final = urlsplit(response.url)
            if final.scheme != 'https' or final.netloc != 'ecocleantisztito.hu':
                raise ValueError('Unexpected static-file redirect')
            data = response.read(MAX_BYTES + 1)
            if len(data) > MAX_BYTES:
                raise ValueError('Static response exceeds size bound')
            csp = response.headers.get('Content-Security-Policy', '')
            directives = {part.split()[0]: part.split()[1:] for part in csp.split(';') if part.strip()}
            protected = all('https://challenges.cloudflare.com' in directives.get(key, []) for key in ('script-src', 'frame-src'))
            exact = sha(data) == expected
            restored = not exact and name.endswith('.html') and sha(restore_cloudflare_email(data)) == expected
            return {'file': name, 'address': target['address'], 'status': response.status,
                    'expectedSha256': expected, 'receivedSha256': sha(data), 'bytes': len(data),
                    'hash_match': exact or restored,
                    'verification': 'exact' if exact else 'cloudflare-email-protection' if restored else 'mismatch',
                    'turnstile_csp': protected, 'cache': response.headers.get('CF-Cache-Status'),
                    'etag': response.headers.get('ETag')}
    except Exception as error:
        return {'file': name, 'address': target['address'], 'error': type(error).__name__}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--plan', action='store_true', help='Validate local target scope without network access')
    parser.add_argument('--show-targets', action='store_true', help='Include the complete static URL list in plan output')
    args = parser.parse_args()
    targets, metadata = build_targets()
    if args.plan:
        output = {'mode': 'plan', **metadata, 'requests': len(targets)}
        if args.show_targets:
            output['targets'] = targets
        print(json.dumps(output, ensure_ascii=False))
        return 0
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(check, targets))
    errors = [row for row in results if row.get('status') != 200 or not row.get('hash_match') or not row.get('turnstile_csp')]
    if sha((ROOT / 'release-support/release-manifest.json').read_bytes()) != metadata['manifestSha256']:
        errors.append({'error': 'Local manifest changed during live verification'})
    report = {'checkedAt': datetime.now(timezone.utc).isoformat(), **metadata,
              'checked': len(results), 'issues': errors, 'results': results, 'apiCalls': 0}
    target = ROOT / 'services/material-recognition/qa/live-release.json'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'checked': len(results), 'uniqueFiles': metadata['uniqueFiles'], 'issues': errors}, ensure_ascii=False))
    return int(bool(errors))


if __name__ == '__main__':
    raise SystemExit(main())
