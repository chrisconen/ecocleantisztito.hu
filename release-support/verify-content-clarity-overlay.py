"""Verify reviewed changes, reverse them, and run the untouched parent proof."""
from pathlib import Path
import hashlib, importlib.util, json, sys
ROOT = Path(__file__).resolve().parent.parent
HERE = ROOT/'release-support/content-clarity'
sha = lambda data: hashlib.sha256(data).hexdigest()

def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m

def verify(manifest, read_current=None):
    try:
        artifact = read_current or (lambda name: (ROOT/'release'/name).read_bytes())
        ref = manifest['contentClarityOverlay']
        assert ref['path'] == 'release-support/content-clarity/overlay.json'
        raw = (ROOT/ref['path']).read_bytes()
        assert sha(raw) == ref['sha256']
        overlay = json.loads(raw)
        assert overlay['version'] == 1
        pb, rb = (HERE/'baseline-manifest.json').read_bytes(), (HERE/'baseline-verification.json').read_bytes()
        assert sha(pb) == overlay['parentSha256'] and sha(rb) == overlay['reportSha256']
        parent, report = json.loads(pb), json.loads(rb)
        assert report['issues'] == [] and report['manifestSha256'] == sha(pb)
        assert not parent.get('contentClarityOverlay')
        assert set(manifest) == set(parent)|{'contentClarityOverlay'}
        assert all(manifest[k] == parent[k] for k in parent if k != 'files')
        changes_raw = (HERE/'replacements.json').read_bytes()
        assert sha(changes_raw) == overlay['replacementsSha256']
        assert sha((HERE/'tariff.json').read_bytes()) == overlay['tariffSha256']
        changes = json.loads(changes_raw)
        assert set(changes) == set(overlay['files'])
        builder = load('clarity_builder', HERE/'build.py')
        additions = overlay.get('addedAssets', {})
        assert set(manifest['files']) == set(parent['files']) | set(additions)
        if additions:
            added, records, mapping_sha = builder.added_assets(parent)
            assert mapping_sha == overlay['addedAssetsMappingSha256']
            assert records == additions
            for name, data in added.items():
                assert manifest['files'][name] == records[name] and artifact(name) == data, 'Added asset differs: '+name
        restored = {}
        for name, record in parent['files'].items():
            data = artifact(name)
            if name in changes:
                rec = overlay['files'][name]
                assert sha(data) == rec['afterSha256'], name
                assert manifest['files'][name] == dict(record, sha256=sha(data), bytes=len(data))
                before = builder.restore(data, rec['edits'])
                assert sha(before) == rec['beforeSha256'] == record['sha256'], name
                derived, edits = builder.apply(before, changes[name])
                assert derived == data and edits == rec['edits'], name
                restored[name] = before
            else:
                assert manifest['files'][name] == record and sha(data) == record['sha256'], name
        gate = load('clarity_parent', ROOT/'release-support/verify-english-overlay.py')
        return gate.verify(parent, read_current=lambda n: restored.get(n, artifact(n)))
    except (AssertionError, OSError, ValueError, KeyError, TypeError) as error:
        return ['Content clarity proof: '+str(error)]

if __name__ == '__main__':
    issues = verify(json.loads((ROOT/'release-support/release-manifest.json').read_bytes()))
    print(json.dumps(dict(issues=issues))); sys.exit(bool(issues))
