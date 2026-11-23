"""Verify the audit-fix layer: undo its recorded replacements, re-derive them from the rules, then run the untouched parent (B2B) proof."""
from pathlib import Path
import hashlib, importlib.util, json, sys
ROOT = Path(__file__).resolve().parent.parent
HERE = ROOT / 'release-support/site-fixes'
sha = lambda data: hashlib.sha256(data).hexdigest()


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m


def verify(manifest, read_current=None):
    try:
        artifact = read_current or (lambda name: (ROOT / 'release' / name).read_bytes())
        ref = manifest['siteFixesOverlay']
        assert ref['path'] == 'release-support/site-fixes/overlay.json'
        raw = (ROOT / ref['path']).read_bytes()
        assert sha(raw) == ref['sha256'], 'Overlay record altered'
        overlay = json.loads(raw)
        assert overlay['version'] == 1
        pb, rb = (HERE / 'baseline-manifest.json').read_bytes(), (HERE / 'baseline-verification.json').read_bytes()
        assert sha(pb) == overlay['parentSha256'] and sha(rb) == overlay['reportSha256'], 'Baseline altered'
        parent, report = json.loads(pb), json.loads(rb)
        assert report['issues'] == [] and report['manifestSha256'] == sha(pb)
        assert parent.get('b2bOverlay') and not parent.get('siteFixesOverlay')
        assert set(manifest) == set(parent) | {'siteFixesOverlay'}
        assert all(manifest[k] == parent[k] for k in parent if k != 'files')
        builder = load('site_fixes_builder', HERE / 'build.py')
        current = {p.relative_to(HERE).as_posix(): sha(p.read_bytes()) for p in builder.inputs()}
        assert current == overlay['inputs'], 'Builder input altered'
        added = overlay['added']
        assert set(manifest['files']) == set(parent['files']) | set(added) and not set(parent['files']) & set(added)
        for name, rec in added.items():
            assert manifest['files'][name] == rec and sha(artifact(name)) == rec['sha256'], 'Added file differs: ' + name
        restored, hits = {}, {}
        for name, record in parent['files'].items():
            data = artifact(name)
            if name in overlay['files']:
                rec = overlay['files'][name]
                assert sha(data) == rec['afterSha256'], name
                assert manifest['files'][name] == dict(record, sha256=sha(data), bytes=len(data)), name
                before = builder.restore(data, rec['edits'])
                assert sha(before) == rec['beforeSha256'] == record['sha256'], name
                after, edits = builder.inject(name, before, hits)
                assert after == data and edits == rec['edits'], 'Replacement not reproducible: ' + name
                restored[name] = before
            else:
                assert manifest['files'][name] == record and sha(data) == record['sha256'], name
                assert builder.inject(name, data)[1] == [], 'Rule would also apply to unrecorded file: ' + name
        assert hits == overlay['hits'], 'Rule hit counts differ'
        gate = load('site_fixes_parent', ROOT / 'release-support/verify-b2b-overlay.py')
        return gate.verify(parent, read_current=lambda n: restored.get(n, artifact(n)))
    except (AssertionError, OSError, ValueError, KeyError, TypeError) as error:
        return ['Site-fixes proof: ' + str(error)]


if __name__ == '__main__':
    issues = verify(json.loads((ROOT / 'release-support/release-manifest.json').read_bytes()))
    print(json.dumps(dict(issues=issues))); sys.exit(bool(issues))
