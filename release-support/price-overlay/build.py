"""Apply the 2026-09-11 price increase to the verified release, as a bounded overlay.

Runs on top of the existing booking-extras release. It never rebuilds the
package and never touches a file another layer owns: only the upholstery and
mattress pages' own price strings change. Re-running is idempotent: the parent
bytes are recovered by reversing the recorded edits, so no baseline copies of
the pages are duplicated into the repository.
"""
from pathlib import Path
import hashlib, json, sys

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE))
import price_rule

sha = lambda data: hashlib.sha256(data).hexdigest()


def main():
    manifest_path = ROOT / 'release-support/release-manifest.json'
    current = json.loads(manifest_path.read_bytes())
    previous = {}
    if current.get('priceOverlay'):
        parent_bytes = (HERE / 'baseline-manifest.json').read_bytes()
        report_bytes = (HERE / 'baseline-verification.json').read_bytes()
        previous = {r['file']: r['edits'] for r in json.loads((HERE / 'overlay.json').read_bytes())['files']}
    else:
        parent_bytes = manifest_path.read_bytes()
        report_bytes = (ROOT / 'release-support/release-verification.json').read_bytes()
    parent = json.loads(parent_bytes)
    report = json.loads(report_bytes)
    assert report['issues'] == [] and report['manifestSha256'] == sha(parent_bytes), 'Unverified price parent'
    assert not parent.get('priceOverlay'), 'Parent already carries a price overlay'

    manifest = json.loads(parent_bytes)
    records = []
    for name in sorted(parent['files']):
        if not price_rule.selects(name):
            continue
        published = (ROOT / 'release' / name).read_bytes()
        before = price_rule.restore(published, previous[name]) if name in previous else published
        assert sha(before) == parent['files'][name]['sha256'], 'Wrong price parent bytes: ' + name
        after_text, edits = price_rule.apply(before.decode('utf-8'))
        if not edits:
            continue
        after = after_text.encode('utf-8')
        assert price_rule.restore(after, edits) == before, 'Price edit is not reversible: ' + name
        (ROOT / 'release' / name).write_bytes(after)
        manifest['files'][name] = {**parent['files'][name], 'sha256': sha(after), 'bytes': len(after)}
        records.append({'file': name, 'beforeSha256': sha(before), 'afterSha256': sha(after), 'edits': edits})

    overlay = {
        'version': 1,
        'baseline': {
            'manifest': 'release-support/price-overlay/baseline-manifest.json',
            'manifestSha256': sha(parent_bytes),
            'verification': 'release-support/price-overlay/baseline-verification.json',
            'verificationSha256': sha(report_bytes),
        },
        'rule': {'percent': price_rule.PERCENT, 'step': price_rule.STEP, 'smallStep': price_rule.SMALL_STEP,
                 'smallBelow': price_rule.SMALL_BELOW, 'minPrice': price_rule.MIN_PRICE,
                 'approxStep': price_rule.APPROX_STEP},
        'ruleSha256': sha((HERE / 'price_rule.py').read_bytes()),
        'files': records,
    }
    overlay_bytes = (json.dumps(overlay, ensure_ascii=False, indent=2) + '\n').encode()
    (HERE / 'overlay.json').write_bytes(overlay_bytes)
    (HERE / 'baseline-manifest.json').write_bytes(parent_bytes)
    (HERE / 'baseline-verification.json').write_bytes(report_bytes)
    manifest['priceOverlay'] = {'path': 'release-support/price-overlay/overlay.json', 'sha256': sha(overlay_bytes)}
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(json.dumps({'pages': len(records), 'edits': sum(len(r['edits']) for r in records)}))


if __name__ == '__main__':
    main()
