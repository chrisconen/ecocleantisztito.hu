"""Verify the bounded price increase, then verify the complete parent proof chain.

The published pages must be exactly the parent bytes with the recorded price
edits applied, and re-deriving the rule from the restored bytes must reproduce
them. Nothing else in the package may differ. The historical baselines are
immutable: do not regenerate them to bypass a failure.
"""
from pathlib import Path
import importlib.util, json, sys

ROOT = Path(__file__).resolve().parent.parent
HERE = ROOT / 'release-support/price-overlay'


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def verify(manifest, read_current=None):
    errors = []
    try:
        gate = load('price_helpers', ROOT / 'release-support/verify-studio-overlay.py')
        gate.ROOT = ROOT
        sha, need = gate.sha, gate.require
        artifact = read_current or (lambda name: gate.read_path(ROOT / 'release', name))
        rule = load('price_rule', HERE / 'price_rule.py')

        overlay = gate.bound(manifest['priceOverlay'], 'release-support/price-overlay/overlay.json')
        need(set(overlay) == {'version', 'baseline', 'rule', 'ruleSha256', 'files'} and overlay['version'] == 1,
             'Price overlay schema')
        need(sha(gate.read_path(HERE, 'price_rule.py')) == overlay['ruleSha256'], 'Price rule differs')
        need(overlay['rule'] == {'percent': rule.PERCENT, 'step': rule.STEP, 'smallStep': rule.SMALL_STEP,
                                 'smallBelow': rule.SMALL_BELOW, 'minPrice': rule.MIN_PRICE,
                                 'approxStep': rule.APPROX_STEP}, 'Price rule constants')

        base = overlay['baseline']
        need(set(base) == {'manifest', 'manifestSha256', 'verification', 'verificationSha256'}, 'Price baseline schema')
        parent = gate.bound({'path': base['manifest'], 'sha256': base['manifestSha256']},
                            'release-support/price-overlay/baseline-manifest.json')
        report = gate.bound({'path': base['verification'], 'sha256': base['verificationSha256']},
                            'release-support/price-overlay/baseline-verification.json')
        need(not parent.get('priceOverlay') and report['issues'] == []
             and report['manifestSha256'] == base['manifestSha256'], 'Unverified price parent')
        need(set(manifest) == set(parent) | {'priceOverlay'}
             and set(manifest['files']) == set(parent['files']), 'Price scope metadata')
        for key in parent:
            need(key == 'files' or manifest[key] == parent[key], 'Price changed metadata ' + key)

        records = {record['file']: record for record in overlay['files']}
        need(len(records) == len(overlay['files']) and records, 'Price file scope')
        restored = {}
        for name, record in records.items():
            need(set(record) == {'file', 'beforeSha256', 'afterSha256', 'edits'}, 'Price record schema')
            need(rule.selects(name), 'Price layer may only touch cleaning pages: ' + name)
            data = artifact(name)
            need(sha(data) == record['afterSha256'] == manifest['files'][name]['sha256'], 'Price current hash ' + name)
            need(manifest['files'][name] == dict(parent['files'][name], sha256=sha(data), bytes=len(data)),
                 'Price changed file metadata ' + name)
            original = rule.restore(data, record['edits'])
            need(sha(original) == record['beforeSha256'] == parent['files'][name]['sha256'],
                 'Price parent restoration ' + name)
            derived, edits = rule.apply(original.decode('utf-8'))
            need(derived.encode('utf-8') == data and edits == record['edits'],
                 'Only the deterministic price rule is allowed: ' + name)
            restored[name] = original

        for name, record in parent['files'].items():
            if name not in records:
                need(manifest['files'][name] == record and sha(artifact(name)) == record['sha256'],
                     'Unrelated price change ' + name)

        reader = lambda name: restored[name] if name in restored else artifact(name)
        parent_gate = load('price_parent', ROOT / 'release-support/verify-booking-extras-overlay.py')
        errors.extend(parent_gate.verify(parent, read_current=reader))
    except (AssertionError, OSError, ValueError, KeyError, TypeError, AttributeError, UnicodeError, IndexError) as error:
        errors.append('Price proof: ' + str(error))
    return errors


if __name__ == '__main__':
    issues = verify(json.loads((ROOT / 'release-support/release-manifest.json').read_bytes()))
    print(json.dumps({'issues': issues}))
    sys.exit(bool(issues))
