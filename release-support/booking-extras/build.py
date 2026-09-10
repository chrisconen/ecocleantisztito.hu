"""Apply the reviewed root booking changes to the existing production runtime."""
from pathlib import Path
import difflib, hashlib, json, re, subprocess

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).parent
sha = lambda data: hashlib.sha256(data).hexdigest()

def apply_changes(before, after, target):
    old, new = before.splitlines(keepends=True), after.splitlines(keepends=True)
    edits = []
    for tag, a, b, c, d in difflib.SequenceMatcher(None, old, new, autojunk=False).get_opcodes():
        if tag == 'equal': continue
        if ''.join(old[a:b]).strip() == ''.join(new[c:d]).strip(): continue
        for context in range(0, 12):
            left = old[max(0, a-context):a]
            right = old[b:b+context]
            needle = ''.join(left + old[a:b] + right)
            replacement = ''.join(left + new[c:d] + right)
            if needle and target.count(needle) == 1:
                target = target.replace(needle, replacement, 1)
                edits.append({'before': needle, 'after': replacement})
                break
        else: raise ValueError('Cannot uniquely apply booking change: ' + ''.join(old[a:b])[:100])
    return target, edits

def main():
    manifest_path = ROOT/'release-support/release-manifest.json'
    current = json.loads(manifest_path.read_bytes())
    if current.get('bookingExtrasOverlay'):
        parent_bytes = (HERE/'baseline-manifest.json').read_bytes()
        report_bytes = (HERE/'baseline-verification.json').read_bytes()
    else:
        parent_bytes = manifest_path.read_bytes()
        report_bytes = (ROOT/'release-support/release-verification.json').read_bytes()
        (HERE/'baseline').mkdir(exist_ok=True)
        for name in ['index.html', 'ui/booking-live.js']:
            (HERE/'baseline'/Path(name).name).write_bytes((ROOT/'release'/name).read_bytes())
        (HERE/'root-before.js').write_bytes(subprocess.check_output(['git', 'show', 'HEAD:booking-config.js'], cwd=ROOT))
    parent = json.loads(parent_bytes)
    assert json.loads(report_bytes)['manifestSha256'] == sha(parent_bytes)
    old_root = (HERE/'root-before.js').read_text('utf-8-sig')
    root = (ROOT/'booking-config.js').read_text('utf-8-sig')
    original = (HERE/'baseline/booking-live.js').read_text('utf-8-sig')
    runtime, edits = apply_changes(old_root, root, original)
    css = (ROOT/'style.css').read_text('utf-8')
    css = css[css.index('.mattress-extra,'):css.index('.upsell-group-title {')]
    outputs = {'ui/booking-live.js': runtime.encode(), 'ui/booking-extras.css': css.encode()}
    for name in ['booking-cart.js', 'booking-cart.css']:
        outputs['ui/'+name] = (ROOT/name).read_text('utf-8-sig').encode()
    html = (HERE/'baseline/index.html').read_text('utf-8')
    old_url = 'ui/booking-live.js?v=' + parent['files']['ui/booking-live.js']['sha256'][:12]
    new_url = 'ui/booking-live.js?v=' + sha(outputs['ui/booking-live.js'])[:12]
    assert html.count(old_url) == 1
    html = html.replace(old_url, new_url)
    html = html.replace('</head>', '<link rel="stylesheet" href="ui/booking-extras.css?v=' + sha(outputs['ui/booking-extras.css'])[:12] + '"></head>')
    html = html.replace('</head>', '<link rel="stylesheet" href="ui/booking-cart.css?v=' + sha(outputs['ui/booking-cart.css'])[:12] + '"></head>')
    html = html.replace('</body>', '<script defer src="ui/booking-cart.js?v=' + sha(outputs['ui/booking-cart.js'])[:12] + '"></script></body>')
    outputs['index.html'] = html.encode()
    overlay = {'version': 2, 'parentSha256': sha(parent_bytes), 'reportSha256': sha(report_bytes),
        'rootBeforeSha256': sha((HERE/'root-before.js').read_bytes()), 'edits': edits,
        'sources': {name: sha((ROOT/name).read_text('utf-8-sig').encode()) for name in ['booking-config.js', 'style.css', 'booking-cart.js', 'booking-cart.css']}}
    manifest = json.loads(parent_bytes)
    for name, data in outputs.items():
        source = Path(name).name if name.startswith('ui/booking-cart.') else 'style.css'
        manifest['files'][name] = {**parent['files'].get(name, {'source': source}), 'sha256': sha(data), 'bytes': len(data)}
        (ROOT/'release'/name).write_bytes(data)
    overlay_bytes = (json.dumps(overlay, ensure_ascii=False, indent=2)+'\n').encode()
    (HERE/'overlay.json').write_bytes(overlay_bytes)
    (HERE/'baseline-manifest.json').write_bytes(parent_bytes)
    (HERE/'baseline-verification.json').write_bytes(report_bytes)
    manifest['bookingExtrasOverlay'] = {'path': 'release-support/booking-extras/overlay.json', 'sha256': sha(overlay_bytes)}
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')
    print(json.dumps({'bookingEdits': len(edits), 'files': list(outputs)}))

if __name__ == '__main__': main()
