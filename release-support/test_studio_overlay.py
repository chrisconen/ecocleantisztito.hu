"""Offline Studio scope and provenance mutations, including copy/widget ancestry."""
from pathlib import Path
import copy
import hashlib
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest

HERE = Path(__file__).resolve().parent


def load(name):
    spec = importlib.util.spec_from_file_location(name.replace('-', '_'), HERE / name)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


gate = load('verify-studio-overlay.py')


def sha(data):
    return hashlib.sha256(data).hexdigest()


class StudioProofTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        gate.ROOT = self.root
        for name in ('verify-widget-overlay.py', 'verify-copy-overlay.py', 'verify-studio-overlay.py', 'verify-package.py'):
            self.write('release-support/' + name, (HERE / name).read_bytes())
        self.online = ['karpittisztitas-' + chr(97 + i) + '.html' for i in range(26)]
        regional = ['karpittisztitas-region' + chr(97 + i) + '.html' for i in range(7)]
        mattresses = ['matractisztitas-region' + chr(97 + i) + '.html' for i in range(7)]
        combo = 'karpittisztitas-matractisztitas.html'
        med = regional + mattresses + [combo]
        widget_pages = ['index.html', *self.online, *regional, combo]
        original = {}
        script = b"const label = 'Valasszon'; const total = 1 + 2;"
        for name in widget_pages + mattresses + ['matractisztitas-a.html']:
            anchor = 'booking' if name == 'index.html' else 'arak'
            head = '<script src="ui/site.js?v=' + sha(script)[:12] + '"></script>' if name == 'index.html' else ''
            original[name] = ('<!doctype html><html><head>' + head + '</head><body class="eco-site">'
                              '<section id="' + anchor + '">Valasszon</section></body></html>').encode()
        original.update({'ui/site.js': script, 'original.css': b'body{color:black}', 'CNAME': b'example.test',
                         'sitemap.xml': b'<urlset/>', 'robots.txt': b'User-agent: *',
                         'ui/booking-live.js': b'void 0;', 'ui/calendar-live.js': b'void 0;'})
        med_sha = self.save('release-support/base/med.json', {'pages': [{'file': file} for file in med]})
        base = {'pages': 43, 'approvedMediterranean': {'pages': med, 'manifestSha256': med_sha}, 'unresolved': [],
                'files': {file: self.record(data) for file, data in original.items()}}
        base_sha = self.save('release-support/base/manifest.json', base)
        widget = {'baseline': {'manifest': 'release-support/base/manifest.json', 'manifestSha256': base_sha,
                              'verification': 'release-support/base/report.json',
                              'verificationSha256': self.save('release-support/base/report.json', {'issues': [], 'manifestSha256': base_sha}),
                              'mediterranean': 'release-support/base/med.json', 'mediterraneanSha256': med_sha},
                  'pages': [], 'dependencies': []}
        widget_manifest = copy.deepcopy(base)
        widget_bytes = dict(original)
        for file in widget_pages:
            next_anchor = '#booking' if file == 'index.html' else '#arak'
            parts = [('style', '<link href="material-recognition/design.css">'),
                     ('section', '<section id="anyagfelismero"><div data-material-app data-next="' + next_anchor + '"></div></section>'),
                     ('cta', '<aside class="eco-novalife-cta"><a href="#anyagfelismero">Anyag</a></aside>'),
                     ('script', '<script src="material-recognition/app.js"></script>')]
            insertion = ''.join('<!-- ECO-MATERIAL:' + key + ':START -->' + value + '<!-- ECO-MATERIAL:' + key + ':END -->' for key, value in parts).encode()
            data = original[file].replace(b'</body>', insertion + b'</body>')
            widget_bytes[file] = data
            widget_manifest['files'][file] = self.record(data)
            widget['pages'].append({'file': file, 'next': next_anchor, 'originalSha256': sha(original[file]), 'outputSha256': sha(data)})
        for file in ('material-recognition/app.js', 'material-recognition/design.css', 'material-recognition/assets/fotel-bukle-olvasosarok.webp'):
            widget_bytes[file] = b'widget'
            widget_manifest['files'][file] = self.record(b'widget')
            widget['dependencies'].append({'file': file, 'sha256': sha(b'widget')})
        widget_manifest['widgetOverlay'] = {'path': 'release-support/widget.json', 'sha256': self.save('release-support/widget.json', widget)}
        copy_baseline = self.save('release-support/copy-tone/baseline-manifest.json', widget_manifest)
        self.copy_overlay = {'version': 1, 'baseline': {
            'manifest': 'release-support/copy-tone/baseline-manifest.json', 'manifestSha256': copy_baseline,
            'verification': 'release-support/copy-tone/baseline-verification.json',
            'verificationSha256': self.save('release-support/copy-tone/baseline-verification.json', {'issues': [], 'manifestSha256': copy_baseline})}, 'files': []}
        self.parent = copy.deepcopy(widget_manifest)
        self.parent_bytes = {}
        new_script = script.replace(b'Valasszon', b'Valassz')
        for file, data in widget_bytes.items():
            edits = []
            if b'Valasszon' in data:
                edits.append({'start': data.index(b'Valasszon'), 'before': 'Valasszon', 'after': 'Valassz',
                              'kind': 'js-string' if file.endswith('.js') else 'text'})
            if file == 'index.html':
                before, after = 'ui/site.js?v=' + sha(script)[:12], 'ui/site.js?v=' + sha(new_script)[:12]
                edits.append({'start': data.index(before.encode()), 'before': before, 'after': after, 'kind': 'asset-version'})
            edits.sort(key=lambda row: row['start'])
            current = data
            for edit in reversed(edits):
                a = edit['start']
                current = current[:a] + edit['after'].encode() + current[a + len(edit['before'].encode()):]
            self.parent_bytes[file] = current
            self.parent['files'][file] = self.record(current)
            if edits:
                self.copy_overlay['files'].append({'file': file, 'beforeSha256': sha(data), 'afterSha256': sha(current), 'edits': edits})
        self.parent['copyOverlay'] = {'path': 'release-support/copy-tone/overlay.json',
                                      'sha256': self.save('release-support/copy-tone/overlay.json', self.copy_overlay)}
        self.manifest = copy.deepcopy(self.parent)
        self.overlay = {'version': 1, 'baseline': {}, 'pages': [], 'dependencies': [], 'sources': []}
        for file, data in self.parent_bytes.items():
            self.write('release/' + file, data)
        self.rebind_parent()
        for file in ('studio/design.css', 'studio/handoff.css', 'studio/configurator.js', 'studio/booking-handoff.js', 'studio/interactions.js', 'studio/assets/photo.webp'):
            data = b'body{color:black}' if file.endswith('.css') else b'void 0;' if file.endswith('.js') else b'fixture'
            self.add_dependency(file, data)
        for file in ('demo/studio/transform.mjs', 'demo/studio/targets.json', 'demo/studio/asset-manifest.json', 'release-support/studio/build.mjs'):
            self.add_source(file, b'[]' if file.endswith('.json') else b'export {};')
        deps = {row['file']: row for row in self.overlay['dependencies']}
        version = lambda file: file + '?v=' + deps[file]['sha256'][:12]
        self.handoff = (gate.START + ('<link rel="stylesheet" href="' + version('studio/handoff.css') + '">'
                        '<script defer src="' + version('studio/configurator.js') + '"></script>'
                        '<script defer src="' + version('studio/booking-handoff.js') + '"></script>').encode() + gate.END)
        for file in ['index.html', *self.online]:
            before = self.parent_bytes[file]
            if file == 'index.html':
                data = before.replace(b'</body>', self.handoff + b'</body>')
            else:
                city = file[len('karpittisztitas-'):-5]
                mount = ('<section id="studio-kalkulator"><div data-studio-configurator data-city="' + city + '" data-source-page="' + file + '" data-assets="studio/assets"></div></section>').encode()
                data = before.replace(b'class="eco-site"', b'class="eco-site eco-studio"').replace(b'</body>', mount + b'</body>')
            self.write('release-support/studio/baseline/' + file, before)
            self.write('release/' + file, data)
            self.manifest['files'][file] = self.record(data)
            self.overlay['pages'].append({'file': file, 'baseline': 'release-support/studio/baseline/' + file,
                                          'beforeSha256': sha(before), 'afterSha256': sha(data)})
        self.bind()

    def tearDown(self):
        self.temp.cleanup()

    @staticmethod
    def record(data):
        return {'sha256': sha(data), 'bytes': len(data), 'source': 'fixture'}

    def write(self, file, data):
        target = self.root / file
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)

    def save(self, file, value):
        data = json.dumps(value, ensure_ascii=False, indent=2).encode()
        self.write(file, data)
        return sha(data)

    def add_source(self, file, data):
        self.write(file, data)
        self.overlay['sources'].append({'path': file, 'sha256': sha(data)})

    def add_dependency(self, file, data):
        self.write('release/' + file, data)
        self.add_source('demo/' + file, data)
        self.overlay['dependencies'].append({'file': file, 'sha256': sha(data), 'bytes': len(data)})
        self.manifest['files'][file] = {'sha256': sha(data), 'bytes': len(data), 'source': 'demo/' + file}

    def bind(self):
        self.manifest['studioOverlay'] = {'path': 'release-support/studio/overlay.json',
                                        'sha256': self.save('release-support/studio/overlay.json', self.overlay)}

    def rebind_parent(self):
        digest = self.save('release-support/studio/baseline-manifest.json', self.parent)
        self.overlay['baseline'] = {'manifest': 'release-support/studio/baseline-manifest.json', 'manifestSha256': digest,
                                    'verification': 'release-support/studio/baseline-verification.json',
                                    'verificationSha256': self.save('release-support/studio/baseline-verification.json', {'issues': [], 'manifestSha256': digest})}

    def revise_page(self, file, data):
        self.write('release/' + file, data)
        self.manifest['files'][file].update(sha256=sha(data), bytes=len(data))
        next(row for row in self.overlay['pages'] if row['file'] == file)['afterSha256'] = sha(data)
        self.bind()

    def test_valid_complete_chain_and_parent_reader(self):
        errors, parent, reader = gate.prepare(self.manifest)
        self.assertEqual(errors, [])
        self.assertEqual(parent, self.parent)
        for file, data in self.parent_bytes.items():
            self.assertEqual(reader(file), data)

    def test_copy_adapter_reads_html_and_asset_revision_from_same_parent(self):
        copy_gate = load('verify-copy-overlay.py')
        copy_gate.ROOT = self.root
        self.write('release/ui/site.js', b'current later-layer script')
        self.assertEqual(copy_gate.verify(self.parent, read_current=self.parent_bytes.__getitem__), [])
        self.assertTrue(copy_gate.verify(self.parent))

    def test_baseline_html_tamper(self):
        self.write('release-support/studio/baseline/index.html', b'forged')
        self.assertTrue(gate.verify(self.manifest))

    def test_baseline_report_tamper(self):
        self.save('release-support/studio/baseline-verification.json', {'issues': [], 'manifestSha256': 'forged'})
        self.assertTrue(gate.verify(self.manifest))

    def test_baseline_path_traversal(self):
        self.overlay['pages'][0]['baseline'] = 'release-support/studio/baseline/../index.html'
        self.bind()
        self.assertTrue(gate.verify(self.manifest))

    def test_source_tamper(self):
        self.write('demo/studio/transform.mjs', b'changed')
        self.assertTrue(gate.verify(self.manifest))

    def test_source_cannot_be_omitted(self):
        self.overlay['sources'] = [row for row in self.overlay['sources'] if row['path'] != 'demo/studio/transform.mjs']
        self.bind()
        self.assertTrue(gate.verify(self.manifest))

    def test_dependency_source_cannot_diverge_even_with_rebound_hash(self):
        file = 'demo/studio/design.css'
        self.write(file, b'body{color:red}')
        next(row for row in self.overlay['sources'] if row['path'] == file)['sha256'] = sha(b'body{color:red}')
        self.bind()
        self.assertTrue(gate.verify(self.manifest))

    def test_duplicate_page(self):
        self.overlay['pages'][-1] = copy.deepcopy(self.overlay['pages'][0])
        self.bind()
        self.assertTrue(gate.verify(self.manifest))

    def test_mattress_and_email_region_cannot_enter_scope(self):
        for file in ('matractisztitas-a.html', 'karpittisztitas-regiona.html'):
            with self.subTest(file=file):
                original = self.overlay['pages'][-1]['file']
                self.overlay['pages'][-1]['file'] = file
                self.bind()
                self.assertTrue(gate.verify(self.manifest))
                self.overlay['pages'][-1]['file'] = original

    def test_unlisted_mattress_change_even_with_current_hash(self):
        file, data = 'matractisztitas-a.html', b'changed'
        self.write('release/' + file, data)
        self.manifest['files'][file] = self.record(data)
        self.assertTrue(gate.verify(self.manifest))

    def test_existing_record_source_cannot_change(self):
        self.manifest['files'][self.online[0]]['source'] = 'new source'
        self.assertTrue(gate.verify(self.manifest))

    def test_metadata_cannot_change(self):
        self.manifest['pages'] += 1
        self.assertTrue(gate.verify(self.manifest))

    def test_homepage_outside_block_change_even_with_rebound_hash(self):
        data = (self.root / 'release/index.html').read_bytes().replace(b'Valassz', b'Altered')
        self.revise_page('index.html', data)
        self.assertTrue(gate.verify(self.manifest))

    def test_duplicate_handoff_marker(self):
        data = (self.root / 'release/index.html').read_bytes().replace(gate.START, gate.START * 2)
        self.revise_page('index.html', data)
        self.assertTrue(gate.verify(self.manifest))

    def test_handoff_cannot_move_before_another_element(self):
        data = self.parent_bytes['index.html'].replace(b'<section', self.handoff + b'<section', 1)
        self.revise_page('index.html', data)
        self.assertTrue(gate.verify(self.manifest))

    def test_handoff_inline_script_rejected(self):
        data = (self.root / 'release/index.html').read_bytes().replace(b'</script>' + gate.END, b'evil()</script>' + gate.END)
        self.revise_page('index.html', data)
        self.assertTrue(gate.verify(self.manifest))

    def test_handoff_remote_url_rejected(self):
        data = (self.root / 'release/index.html').read_bytes().replace(b'src="studio/configurator', b'src="https://attacker.test/studio/configurator')
        self.revise_page('index.html', data)
        self.assertTrue(gate.verify(self.manifest))

    def test_handoff_unversioned_or_stale_asset_rejected(self):
        data = (self.root / 'release/index.html').read_bytes()
        dep = next(row for row in self.overlay['dependencies'] if row['file'] == 'studio/handoff.css')
        data = data.replace(('?v=' + dep['sha256'][:12]).encode(), b'?v=000000000000')
        self.revise_page('index.html', data)
        self.assertTrue(gate.verify(self.manifest))

    def test_wrong_calculator_city_rejected(self):
        file = self.online[0]
        data = (self.root / ('release/' + file)).read_bytes().replace(b'data-city="a"', b'data-city="other"')
        self.revise_page(file, data)
        self.assertTrue(gate.verify(self.manifest))

    def test_new_dependency_outside_scope(self):
        self.add_dependency('unexpected.js', b'void 0;')
        self.bind()
        self.assertTrue(gate.verify(self.manifest))

    def test_new_html_dependency_rejected(self):
        self.add_dependency('studio/extra.html', b'<html></html>')
        self.bind()
        self.assertTrue(gate.verify(self.manifest))

    def test_asset_file_cannot_be_unlisted(self):
        self.overlay['dependencies'].pop()
        self.bind()
        self.assertTrue(gate.verify(self.manifest))

    def test_nested_studio_baseline_rejected(self):
        self.parent['studioOverlay'] = copy.deepcopy(self.manifest['studioOverlay'])
        self.rebind_parent()
        self.bind()
        self.assertTrue(gate.verify(self.manifest))

    def test_copy_proof_not_bypassed_by_studio(self):
        self.copy_overlay['files'][0]['edits'][-1]['before'] = 'Altered'
        ref = {'path': 'release-support/copy-tone/overlay.json', 'sha256': self.save('release-support/copy-tone/overlay.json', self.copy_overlay)}
        self.parent['copyOverlay'] = self.manifest['copyOverlay'] = ref
        self.rebind_parent()
        self.bind()
        errors = gate.verify(self.manifest)
        self.assertTrue(any('Copy proof incomplete' in error for error in errors), errors)

    def test_widget_proof_not_bypassed_by_studio_and_copy(self):
        self.save('release-support/base/report.json', {'issues': ['forged'], 'manifestSha256': 'wrong'})
        errors = gate.verify(self.manifest)
        self.assertTrue(any('Provenance hash mismatch' in error for error in errors), errors)

    def package(self):
        manifest_sha = self.save('release-support/release-manifest.json', self.manifest)
        self.save('release-support/release-verification.json', {'issues': [], 'manifestSha256': manifest_sha})
        return subprocess.run([sys.executable, '-X', 'utf8', str(self.root / 'release-support/verify-package.py')],
                              capture_output=True, text=True, encoding='utf-8', timeout=60)

    def test_package_dispatch_accepts_studio_and_preserves_old_chain(self):
        result = self.package()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.save('release-support/base/report.json', {'issues': ['forged']})
        result = self.package()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Provenance hash mismatch', result.stdout)


if __name__ == '__main__':
    unittest.main()
