"""Verify the B2B mattress layer: undo its recorded insertions, re-derive them, then run the untouched parent proof."""
from pathlib import Path
import hashlib, importlib.util, json, sys
ROOT = Path(__file__).resolve().parent.parent
HERE = ROOT / 'release-support/b2b-hygiene'
sha = lambda data: hashlib.sha256(data).hexdigest()

def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m

def verify(manifest, read_current=None):
    try:
        artifact = read_current or (lambda name: (ROOT / 'release' / name).read_bytes())
        ref = manifest['b2bOverlay']
        assert ref['path'] == 'release-support/b2b-hygiene/overlay.json'
        raw = (ROOT / ref['path']).read_bytes()
        assert sha(raw) == ref['sha256'], 'Overlay record altered'
        overlay = json.loads(raw)
        assert overlay['version'] == 1
        pb, rb = (HERE / 'baseline-manifest.json').read_bytes(), (HERE / 'baseline-verification.json').read_bytes()
        assert sha(pb) == overlay['parentSha256'] and sha(rb) == overlay['reportSha256'], 'Baseline altered'
        parent, report = json.loads(pb), json.loads(rb)
        assert report['issues'] == [] and report['manifestSha256'] == sha(pb)
        assert not parent.get('b2bOverlay')
        assert set(manifest) == set(parent) | {'b2bOverlay'}
        assert all(manifest[k] == parent[k] for k in parent if k != 'files')
        for key, path in (('buildSha256', 'build.py'), ('contentSha256', 'content.py'), ('dataSha256', 'data/ksh-2025.json')):
            assert sha((HERE / path).read_bytes()) == overlay[key], 'Builder input altered: ' + path
        builder = load('b2b_builder', HERE / 'build.py')
        added = overlay['added']
        assert set(manifest['files']) == set(parent['files']) | set(added) and not set(parent['files']) & set(added)
        for name, rec in added.items():
            assert manifest['files'][name] == rec and sha(artifact(name)) == rec['sha256'], 'Added file differs: ' + name
        restored = {}
        for name, record in parent['files'].items():
            data = artifact(name)
            if name in overlay['files']:
                rec = overlay['files'][name]
                assert sha(data) == rec['afterSha256'], name
                assert manifest['files'][name] == dict(record, sha256=sha(data), bytes=len(data)), name
                before = builder.restore(data, rec['edits'])
                assert sha(before) == rec['beforeSha256'] == record['sha256'], name
                after, edits = builder.inject(name, before)
                assert after == data and edits == rec['edits'], 'Insertion not reproducible: ' + name
                restored[name] = before
            else:
                assert manifest['files'][name] == record and sha(data) == record['sha256'], name
        gate = load('b2b_parent', ROOT / 'release-support/verify-content-clarity-overlay.py')
        return gate.verify(parent, read_current=lambda n: restored.get(n, artifact(n)))
    except (AssertionError, OSError, ValueError, KeyError, TypeError) as error:
        return ['B2B proof: ' + str(error)]

if __name__ == '__main__':
    issues = verify(json.loads((ROOT / 'release-support/release-manifest.json').read_bytes()))
    print(json.dumps(dict(issues=issues))); sys.exit(bool(issues))
