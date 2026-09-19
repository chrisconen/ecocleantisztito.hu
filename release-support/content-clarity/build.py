"""Apply exact reviewed changes above the pinned, verified English release."""
from pathlib import Path
import hashlib, json, importlib.util

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).parent
sha = lambda data: hashlib.sha256(data).hexdigest()

def added_target(name, parent_names, seen):
    assert isinstance(name, str) and name and '\\' not in name and ':' not in name, 'Invalid added target'
    assert all(part not in ('', '.', '..') for part in name.split('/')), 'Noncanonical added target: '+name
    key = name.casefold()
    assert key not in {n.casefold() for n in parent_names} and key not in seen, 'Added target collision: '+name
    target = (ROOT/'release'/name).resolve()
    assert target.is_relative_to((ROOT/'release').resolve()), 'Added target escapes release'
    seen.add(key)
    return target

def added_assets(parent):
    """Explicit source-to-output mapping; additions cannot overwrite parent files."""
    mapping_path = ROOT/'release-support/gyor-conversion/assets.json'
    raw = mapping_path.read_bytes()
    mapping = json.loads(raw)
    outputs, records, seen = {}, {}, set()
    for name, source in mapping.items():
        target, origin = added_target(name, parent['files'], seen), (ROOT/source).resolve()
        assert origin.is_relative_to(ROOT.resolve()) and not origin.is_relative_to((ROOT/'release').resolve()), 'Invalid added source'
        assert origin.is_file() and not (ROOT/source).is_symlink(), source
        data = origin.read_bytes()
        outputs[name] = data
        records[name] = dict(source=source, bytes=len(data), sha256=sha(data))
    return outputs, records, sha(raw)

def restore(data, edits):
    for e in reversed(edits):
        a, b, pos = e['after'].encode(), e['before'].encode(), e['offset']
        assert data[pos:pos+len(a)] == a, 'Changed replacement bytes'
        data = data[:pos]+b+data[pos+len(a):]
    return data

def apply(data, replacements):
    edits = []
    for change in replacements:
        before, after = change['before'].encode(), change['after'].encode()
        assert before and before != after
        assert data.count(before) == change['count'], 'Replacement occurrence mismatch: '+change['before'][:100]
        positions, start = [], 0
        while (pos := data.find(before, start)) >= 0:
            positions.append(pos)
            start = pos+len(before)
        for pos in reversed(positions):
            edits.append(dict(offset=pos, before=change['before'], after=change['after']))
            data = data[:pos]+after+data[pos+len(before):]
    return data, edits

def main():
    mp, rp = ROOT/'release-support/release-manifest.json', ROOT/'release-support/release-verification.json'
    current = json.loads(mp.read_bytes())
    changes = json.loads((HERE/'replacements.json').read_bytes())
    if current.get('contentClarityOverlay'):
        old = json.loads((HERE/'overlay.json').read_bytes())
        parent_bytes = (HERE/'baseline-manifest.json').read_bytes()
        report_bytes = (HERE/'baseline-verification.json').read_bytes()
        parent = json.loads(parent_bytes)
        originals = {}
        for name, rec in old['files'].items():
            data = (ROOT/'release'/name).read_bytes()
            assert sha(data) == rec['afterSha256'], name
            originals[name] = restore(data, rec['edits'])
    else:
        parent_bytes, report_bytes = mp.read_bytes(), rp.read_bytes()
        parent = current
        originals = {}
        # First build accepts only an already verified package.
        spec = importlib.util.spec_from_file_location('parent', ROOT/'release-support/verify-english-overlay.py')
        gate = importlib.util.module_from_spec(spec); spec.loader.exec_module(gate)
        assert gate.verify(parent) == [], 'Parent proof failed'
        assert not (HERE/'baseline-manifest.json').exists(), 'Never overwrite a pinned baseline'
        (HERE/'baseline-manifest.json').write_bytes(parent_bytes)
        (HERE/'baseline-verification.json').write_bytes(report_bytes)
    report = json.loads(report_bytes)
    assert report['issues'] == [] and report['manifestSha256'] == sha(parent_bytes)
    outputs, records = {}, {}
    for name, replacements in changes.items():
        before = originals.get(name, (ROOT/'release'/name).read_bytes())
        assert sha(before) == parent['files'][name]['sha256'], name
        after, edits = apply(before, replacements)
        outputs[name] = after
        records[name] = dict(beforeSha256=sha(before), afterSha256=sha(after), edits=edits)
    assert set(originals) <= set(outputs), 'Do not silently drop existing changes'
    added, added_records, mapping_sha = added_assets(parent)
    if current.get('contentClarityOverlay'):
        for name, record in old.get('addedAssets', {}).items():
            assert name in added and sha((ROOT/'release'/name).read_bytes()) == record['sha256'], 'Changed added asset: '+name
    overlay = dict(version=1, parentSha256=sha(parent_bytes), reportSha256=sha(report_bytes),
                   replacementsSha256=sha((HERE/'replacements.json').read_bytes()),
                   tariffSha256=sha((HERE/'tariff.json').read_bytes()), files=records,
                   addedAssets=added_records, addedAssetsMappingSha256=mapping_sha)
    overlay_bytes = (json.dumps(overlay, ensure_ascii=False, indent=2)+'\n').encode()
    manifest = json.loads(parent_bytes)
    for name, data in outputs.items():
        manifest['files'][name] = dict(parent['files'][name], bytes=len(data), sha256=sha(data))
    manifest['files'].update(added_records)
    manifest['contentClarityOverlay'] = dict(path='release-support/content-clarity/overlay.json', sha256=sha(overlay_bytes))
    for name, data in outputs.items(): (ROOT/'release'/name).write_bytes(data)
    for name, data in added.items():
        target = ROOT/'release'/name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    (HERE/'overlay.json').write_bytes(overlay_bytes)
    mp.write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='')
    print(json.dumps(dict(changedFiles=len(outputs), replacements=sum(len(r['edits']) for r in records.values()))))

if __name__ == '__main__': main()
