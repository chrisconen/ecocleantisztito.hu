"""Verify the English layer, then verify the complete parent proof chain.

The English site is almost entirely additive: 69 new pages plus one new booking
runtime. The only edits to existing artifacts are the reciprocal hreflang block
and the language switcher on each Hungarian page, and the new sitemap entries.

Verification removes exactly those recorded insertions, requires the result to
equal the pinned parent bytes, requires every added file to be genuinely new,
requires the English runtime to keep the Hungarian runtime's prices, endpoints
and logic values, and then runs the price proof against the restored package.

The historical baselines are immutable: do not regenerate them to bypass a failure.
"""
from pathlib import Path
import hashlib, importlib.util, json, re, sys

ROOT = Path(__file__).resolve().parent.parent
HERE = ROOT / 'release-support/english-overlay'
sha = lambda data: hashlib.sha256(data).hexdigest()


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def verify(manifest, read_current=None):
    errors = []
    try:
        artifact = read_current or (lambda name: (ROOT / 'release' / name).read_bytes())

        ref = manifest['englishOverlay']
        assert ref['path'] == 'release-support/english-overlay/overlay.json'
        data = (ROOT / ref['path']).read_bytes()
        assert sha(data) == ref['sha256'], 'Overlay record altered'
        overlay = json.loads(data)
        assert overlay['version'] == 2

        parent_bytes = (HERE / 'baseline-manifest.json').read_bytes()
        report_bytes = (HERE / 'baseline-verification.json').read_bytes()
        assert sha(parent_bytes) == overlay['parentSha256'], 'Parent manifest not the pinned one'
        assert sha(report_bytes) == overlay['reportSha256'], 'Parent report not the pinned one'
        parent = json.loads(parent_bytes)
        report = json.loads(report_bytes)
        assert report['issues'] == [] and report['manifestSha256'] == sha(parent_bytes)

        # the layer may only add englishOverlay and may not touch other keys
        assert set(manifest) == set(parent) | {'englishOverlay'}, 'Overlay changed manifest shape'
        assert all(manifest[k] == parent[k] for k in parent if k != 'files'), 'Overlay changed a sibling layer'

        added = set(overlay['added'])
        edited = set(overlay['pages']) | {'sitemap.xml'}
        assert set(manifest['files']) == set(parent['files']) | added, 'File set does not match the overlay record'
        assert not (added & set(parent['files'])), 'An "added" file already existed in the parent'

        restored = {}
        # ── added files: new, and recorded honestly ─────────────────────────
        for name, digest in overlay['added'].items():
            current = artifact(name)
            assert sha(current) == digest, 'Added artifact differs: ' + name
            assert manifest['files'][name]['sha256'] == digest, 'Manifest disagrees for ' + name

        # ── edited pages: remove exactly the recorded insertions ────────────
        for name, rec in overlay['pages'].items():
            current = artifact(name)
            assert sha(current) == rec['afterSha256'], 'Edited page differs: ' + name
            assert manifest['files'][name]['sha256'] == rec['afterSha256'], 'Manifest disagrees for ' + name
            text = current.decode('utf-8')
            # hreflang, the header switcher and its stylesheet
            back = text
            for fragment in [rec['head'], *rec['fragments']]:
                assert text.count(fragment) == 1, 'Insertion not found exactly once in ' + name
                back = back.replace(fragment, '', 1)
            back = back.encode('utf-8')
            assert sha(back) == rec['beforeSha256'] == parent['files'][name]['sha256'], \
                'Page differs from the parent beyond the recorded insertions: ' + name
            restored[name] = back

        # ── sitemap ────────────────────────────────────────────────────────
        sm = artifact('sitemap.xml')
        assert sha(sm) == overlay['sitemap']['afterSha256'], 'sitemap.xml differs'
        sm_text = sm.decode('utf-8')
        assert sm_text.count(overlay['sitemap']['added']) == 1, 'sitemap insertion not found exactly once'
        sm_back = sm_text.replace(overlay['sitemap']['added'], '', 1).encode('utf-8')
        assert sha(sm_back) == overlay['sitemap']['beforeSha256'] == parent['files']['sitemap.xml']['sha256'], \
            'sitemap.xml differs from the parent beyond the recorded entries'
        restored['sitemap.xml'] = sm_back

        # ── nothing else moved ─────────────────────────────────────────────
        for name, record in parent['files'].items():
            if name in edited:
                continue
            assert manifest['files'][name] == record, 'Unrelated manifest change: ' + name
            assert sha(artifact(name)) == record['sha256'], 'Unrelated artifact change: ' + name

        # ── the English runtime must stay the Hungarian program ────────────
        hu = artifact('ui/booking-live.js').decode('utf-8')
        assert sha(artifact('ui/booking-live.js')) == overlay['runtimeParentSha256'], \
            'English runtime was derived from a different Hungarian runtime'
        en = artifact('ui/booking-live-en.js').decode('utf-8')
        for value in ["'Kárpit'", "'Matrac'", "'Mindkettő'", "'Magánszemély'", "'Haziallat'", "'Allergias'"]:
            assert en.count(value) == hu.count(value), 'Logic value translated in the English runtime: ' + value
        for url in set(re.findall(r'https://[^\s\'"`]+', hu)):
            assert url in en, 'Endpoint missing from the English runtime: ' + url
        for amount in set(re.findall(r'price: (\d+)', hu)):
            assert ('price: ' + amount) in en, 'Price missing from the English runtime: ' + amount
        assert en.count("lang: 'en'") == 2, 'English runtime must tag both payloads'
        assert "lang: 'en'" not in hu, 'Hungarian runtime must not be tagged'

        # ── run the proof underneath against the restored package ──────────
        reader = lambda name: restored[name] if name in restored else artifact(name)
        parent_gate = load('english_parent', ROOT / 'release-support/verify-price-overlay.py')
        errors.extend(parent_gate.verify(parent, read_current=reader))
    except (AssertionError, OSError, ValueError, KeyError, TypeError, AttributeError, UnicodeError, IndexError) as error:
        errors.append('English proof: ' + str(error))
    return errors


if __name__ == '__main__':
    issues = verify(json.loads((ROOT / 'release-support/release-manifest.json').read_bytes()))
    print(json.dumps({'issues': issues}, ensure_ascii=False))
    sys.exit(bool(issues))
