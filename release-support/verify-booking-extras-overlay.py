"""Verify the booking-only delta and then verify the complete original release chain."""
from pathlib import Path
import hashlib, importlib.util, json, sys

ROOT = Path(__file__).resolve().parent.parent
HERE = ROOT/'release-support/booking-extras'
sha = lambda data: hashlib.sha256(data).hexdigest()

def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

def verify(manifest):
    try:
        ref = manifest['bookingExtrasOverlay']
        assert ref['path'] == 'release-support/booking-extras/overlay.json'
        data = (ROOT/ref['path']).read_bytes()
        assert sha(data) == ref['sha256']
        overlay = json.loads(data)
        assert overlay['version'] == 3
        parent_bytes = (HERE/'baseline-manifest.json').read_bytes()
        report_bytes = (HERE/'baseline-verification.json').read_bytes()
        assert sha(parent_bytes) == overlay['parentSha256']
        assert sha(report_bytes) == overlay['reportSha256']
        parent, report = json.loads(parent_bytes), json.loads(report_bytes)
        assert report['issues'] == [] and report['manifestSha256'] == sha(parent_bytes)
        assert set(manifest) == set(parent) | {'bookingExtrasOverlay'}
        assert all(manifest[k] == parent[k] for k in parent if k != 'files')
        assert set(manifest['files']) == set(parent['files']) | {'ui/booking-extras.css', 'ui/booking-cart.js', 'ui/booking-cart.css', 'ui/calendar-status.css'}
        assert set(overlay['sources']) == {'booking-config.js', 'style.css', 'booking-cart.js', 'booking-cart.css', 'release-support/calendar-status.css'}
        for name, digest in overlay['sources'].items():
            assert sha((ROOT/name).read_text('utf-8-sig').encode()) == digest, 'Booking source differs: '+name
        assert sha((HERE/'root-before.js').read_bytes()) == overlay['rootBeforeSha256']
        assert sha((HERE/'baseline/calendar-live.js').read_bytes()) == overlay['calendarBaselineSha256']
        restored = {name: (HERE/'baseline'/Path(name).name).read_bytes() for name in ['index.html', 'ui/booking-live.js', 'ui/calendar-live.js']}
        for name, baseline in restored.items():
            assert sha(baseline) == parent['files'][name]['sha256'], 'Wrong booking baseline: '+name
        builder = load_module('booking_extras_builder', HERE/'build.py')
        runtime, edits = builder.apply_changes((HERE/'root-before.js').read_text('utf-8-sig'), (ROOT/'booking-config.js').read_text('utf-8-sig'), restored['ui/booking-live.js'].decode('utf-8-sig').replace('\r\n', '\n'))
        assert edits == overlay['edits']
        css = (ROOT/'style.css').read_text('utf-8')
        css = css[css.index('.mattress-extra,'):css.index('.upsell-group-title {')]
        expected = {'ui/booking-live.js': runtime.encode(), 'ui/booking-extras.css': css.encode()}
        expected['ui/calendar-live.js'] = builder.apply_calendar_legend(restored['ui/calendar-live.js'].decode('utf-8')).encode('utf-8')
        expected['ui/calendar-status.css'] = (ROOT/'release-support/calendar-status.css').read_bytes()
        for name in ['booking-cart.js', 'booking-cart.css']:
            expected['ui/'+name] = (ROOT/name).read_text('utf-8-sig').encode()
        old_url = 'ui/booking-live.js?v='+parent['files']['ui/booking-live.js']['sha256'][:12]
        html = restored['index.html'].decode().replace('\r\n', '\n')
        assert html.count(old_url) == 1 and html.count('</head>') == 1
        html = html.replace(old_url, 'ui/booking-live.js?v='+sha(expected['ui/booking-live.js'])[:12])
        old_cal = 'ui/calendar-live.js?v='+parent['files']['ui/calendar-live.js']['sha256'][:12]
        assert html.count(old_cal) == 1
        html = html.replace(old_cal, 'ui/calendar-live.js?v='+sha(expected['ui/calendar-live.js'])[:12])
        html = html.replace('</head>', '<link rel="stylesheet" href="ui/calendar-status.css?v='+sha(expected['ui/calendar-status.css'])[:12]+'"></head>')
        html = html.replace('</head>', '<link rel="stylesheet" href="ui/booking-extras.css?v='+sha(expected['ui/booking-extras.css'])[:12]+'"></head>')
        html = html.replace('</head>', '<link rel="stylesheet" href="ui/booking-cart.css?v='+sha(expected['ui/booking-cart.css'])[:12]+'"></head>')
        assert html.count('</body>') == 1
        expected['index.html'] = html.replace('</body>', '<script defer src="ui/booking-cart.js?v='+sha(expected['ui/booking-cart.js'])[:12]+'"></script></body>').encode()
        for name, record in manifest['files'].items():
            current = (ROOT/'release'/name).read_bytes()
            if name in expected:
                assert current == expected[name], 'Unexpected booking patch: '+name
                if name == 'ui/calendar-status.css':
                    source = 'release-support/calendar-status.css'
                else:
                    source = Path(name).name if name.startswith('ui/booking-cart.') else 'style.css'
                assert record == {**parent['files'].get(name, {'source': source}), 'sha256': sha(current), 'bytes': len(current)}
            else:
                assert record == parent['files'][name] and sha(current) == record['sha256'], 'Unrelated release change: '+name
        gate = load_module('booking_review_parent', ROOT/'release-support/verify-review-overlay.py')
        return gate.verify(parent, read_current=lambda name: restored[name] if name in restored else (ROOT/'release'/name).read_bytes())
    except (AssertionError, OSError, ValueError, KeyError, TypeError) as error:
        return ['Booking extras proof: '+str(error)]

if __name__ == '__main__':
    errors = verify(json.loads((ROOT/'release-support/release-manifest.json').read_bytes()))
    print(json.dumps({'issues': errors}))
    sys.exit(bool(errors))
