"""Add the English site to the already verified release package.

This layer sits on top of the price overlay. It is mostly ADDITIVE — the 69
English pages and the English booking runtime are new files, so every Hungarian
byte below stays exactly as the layers underneath proved it. The only edits to
existing artifacts are the reciprocal hreflang block and the language switcher
on each Hungarian page, plus the new sitemap entries.

Re-running is idempotent: recorded edits are reversed first, so a changed rule
rebases instead of stacking.

    python release-support/english-overlay/build.py
    python release-support/verify-english-overlay.py
    node release-support/verify-release.mjs
    python release-support/verify-package.py
    node --test release-support/tests/booking-contract.test.mjs
    node --test release-support/tests/booking-en-contract.test.mjs
"""
from pathlib import Path
import hashlib, json

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).parent
OUT = ROOT / 'release'
sha = lambda data: hashlib.sha256(data).hexdigest()

BASE = 'https://ecocleantisztito.hu'
SWITCH_CSS = (
    '.lang-switch{position:fixed;right:1rem;bottom:1rem;z-index:995;display:inline-flex;'
    'align-items:center;justify-content:center;min-width:2.75rem;height:2.75rem;padding:0 .8rem;'
    'border-radius:999px;background:#405b37;color:#fffef8;'
    'font:600 .875rem/1 system-ui,-apple-system,sans-serif;letter-spacing:.06em;'
    'text-decoration:none;box-shadow:0 3px 14px rgba(40,62,52,.28)}'
    '.lang-switch:hover,.lang-switch:focus-visible{background:#2f4429;color:#fff}'
    '@media print{.lang-switch{display:none}}'
)


def en_name(hu_file):
    special = {
        'karpittisztitas-matractisztitas.html': 'upholstery-and-mattress-cleaning.html',
        'karpittisztitas-elotte-utana.html': 'upholstery-cleaning-before-after.html',
    }
    if hu_file in special:
        return special[hu_file]
    if hu_file.startswith('karpittisztitas-'):
        return 'upholstery-cleaning-' + hu_file[len('karpittisztitas-'):]
    if hu_file.startswith('matractisztitas-'):
        return 'mattress-cleaning-' + hu_file[len('matractisztitas-'):]
    return hu_file


def head_block(hu_file):
    en_file = en_name(hu_file)
    return (
        f'\n    <link rel="alternate" hreflang="hu" href="{BASE}/{hu_file}">'
        f'\n    <link rel="alternate" hreflang="en" href="{BASE}/en/{en_file}">'
        f'\n    <link rel="alternate" hreflang="x-default" href="{BASE}/{hu_file}">'
    )


def switch_block(hu_file):
    return (
        '\n<!-- i18n language switch -->'
        f'\n<a class="lang-switch" href="en/{en_name(hu_file)}" hreflang="en" lang="en"'
        ' title="English version" aria-label="English version">EN</a>'
        f'\n<style>{SWITCH_CSS}</style>\n'
    )


def main():
    manifest_path = ROOT / 'release-support/release-manifest.json'
    current = json.loads(manifest_path.read_bytes())

    if current.get('englishOverlay'):
        parent_bytes = (HERE / 'baseline-manifest.json').read_bytes()
        report_bytes = (HERE / 'baseline-verification.json').read_bytes()
        previous = json.loads((HERE / 'overlay.json').read_bytes())
        # rebase: put every edited page back to its parent bytes first
        for name, rec in previous['pages'].items():
            restored = (OUT / name).read_text('utf-8')
            restored = restored.replace(rec['head'], '', 1).replace(rec['switch'], '', 1)
            assert sha(restored.encode()) == rec['beforeSha256'], 'Cannot rebase ' + name
            (OUT / name).write_text(restored, encoding='utf-8', newline='')
        sitemap_prev = previous['sitemap']
        sm = (OUT / 'sitemap.xml').read_text('utf-8').replace(sitemap_prev['added'], '', 1)
        assert sha(sm.encode()) == sitemap_prev['beforeSha256'], 'Cannot rebase sitemap.xml'
        (OUT / 'sitemap.xml').write_text(sm, encoding='utf-8', newline='')
    else:
        parent_bytes = manifest_path.read_bytes()
        report_bytes = (ROOT / 'release-support/release-verification.json').read_bytes()

    parent = json.loads(parent_bytes)
    assert json.loads(report_bytes)['manifestSha256'] == sha(parent_bytes), 'Parent report does not cover the parent manifest'

    manifest = json.loads(parent_bytes)
    english_pages = sorted(p.name for p in (OUT / 'en').glob('*.html'))
    assert english_pages, 'release/en is empty — generate the pages first'

    # ── 1. edit the Hungarian pages that have an English twin ────────────────
    pages = {}
    for en_file in english_pages:
        hu_file = next((h for h in parent['files'] if h.endswith('.html') and en_name(h) == en_file), None)
        if hu_file is None:
            continue
        before = (OUT / hu_file).read_bytes()
        assert sha(before) == parent['files'][hu_file]['sha256'], 'Parent page changed: ' + hu_file
        text = before.decode('utf-8')
        head, switch = head_block(hu_file), switch_block(hu_file)
        assert 'rel="canonical"' in text, 'No canonical to anchor hreflang: ' + hu_file
        text = text.replace('>', '>' + head, 0) if False else text
        # insert hreflang right after the canonical tag, switcher before </body>
        idx = text.index('rel="canonical"')
        close = text.index('>', idx) + 1
        text = text[:close] + head + text[close:]
        assert '</body>' in text, 'No </body>: ' + hu_file
        text = text.replace('</body>', switch + '</body>', 1)
        after = text.encode('utf-8')
        (OUT / hu_file).write_bytes(after)
        manifest['files'][hu_file] = {**parent['files'][hu_file], 'sha256': sha(after), 'bytes': len(after)}
        pages[hu_file] = {'beforeSha256': sha(before), 'afterSha256': sha(after),
                          'head': head, 'switch': switch}

    # ── 2. register the new English artifacts ────────────────────────────────
    added = {}
    for en_file in english_pages:
        data = (OUT / 'en' / en_file).read_bytes()
        name = 'en/' + en_file
        manifest['files'][name] = {'sha256': sha(data), 'bytes': len(data), 'source': 'release-support/english-overlay'}
        added[name] = sha(data)
    runtime = (OUT / 'ui/booking-live-en.js').read_bytes()
    manifest['files']['ui/booking-live-en.js'] = {
        'sha256': sha(runtime), 'bytes': len(runtime), 'source': 'release/ui/booking-live.js'}
    added['ui/booking-live-en.js'] = sha(runtime)

    # ── 3. sitemap ───────────────────────────────────────────────────────────
    sm_before = (OUT / 'sitemap.xml').read_bytes()
    entries = ''.join(
        f'\n<url>\n  <loc>{BASE}/en/{f}</loc>\n  <priority>0.80</priority>\n</url>'
        for f in english_pages)
    sm_text = sm_before.decode('utf-8')
    assert '</urlset>' in sm_text, 'sitemap.xml has no </urlset>'
    sm_text = sm_text.replace('</urlset>', entries + '\n\n</urlset>', 1)
    sm_after = sm_text.encode('utf-8')
    (OUT / 'sitemap.xml').write_bytes(sm_after)
    manifest['files']['sitemap.xml'] = {**parent['files']['sitemap.xml'],
                                        'sha256': sha(sm_after), 'bytes': len(sm_after)}

    # ── 4. record the overlay ────────────────────────────────────────────────
    overlay = {
        'version': 1,
        'parentSha256': sha(parent_bytes),
        'reportSha256': sha(report_bytes),
        'runtimeParentSha256': sha((OUT / 'ui/booking-live.js').read_bytes()),
        'pages': pages,
        'added': added,
        'sitemap': {'beforeSha256': sha(sm_before), 'afterSha256': sha(sm_after),
                    'added': entries + '\n\n'},
    }
    overlay_bytes = (json.dumps(overlay, ensure_ascii=False, indent=2) + '\n').encode()
    (HERE / 'overlay.json').write_bytes(overlay_bytes)
    (HERE / 'baseline-manifest.json').write_bytes(parent_bytes)
    (HERE / 'baseline-verification.json').write_bytes(report_bytes)
    manifest['englishOverlay'] = {'path': 'release-support/english-overlay/overlay.json',
                                  'sha256': sha(overlay_bytes)}
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n',
                             encoding='utf-8', newline='\n')
    print(json.dumps({'editedPages': len(pages), 'addedFiles': len(added)}))


if __name__ == '__main__':
    main()
