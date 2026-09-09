"""Offline copy provenance/context mutations; all artifacts live in temp dirs."""
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
spec = importlib.util.spec_from_file_location('copy_gate', HERE / 'verify-copy-overlay.py')
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)


def digest(data):
    return hashlib.sha256(data).hexdigest()


class CopyProofTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        gate.ROOT = self.root
        script = b"const label = 'Valasszon idopontot'; const count = 1 + 2; const message = `Kerjuk, ${name} valasszon.`; const pattern = /[\"']/g; /* Valasszon */"
        version = digest(script)[:12]
        html = ('<!doctype html><html><head><meta name="description" content="Kérjük, válasszon.">'
                '<script src="ui/site.js?v=' + version + '"></script></head><body>'
                '<a href="#booking" class="button">Kérjük, válasszon időpontot.</a>'
                '<form id="booking" action="/book"><input name="customer" placeholder="Adja meg nevét"></form>'
                '<script>const status = "Kérjük várjon"; const x = 1 + 2;</script>'
                '<script type="application/ld+json">{"name":"Válasszon időpontot","url":"https://example.test/"}</script>'
                '</body></html>').encode('utf-8')
        self.originals = {'index.html': html, 'ui/site.js': script, 'style.css': b'body{color:black}'}
        self.parent = {'pages': 1, 'unresolved': [], 'files': {name: {'sha256': digest(data), 'bytes': len(data), 'source': 'fixture'}
                                                           for name, data in self.originals.items()}}
        self.make([('index.html', 'Kérjük, válasszon időpontot.', 'Válassz időpontot.', 'text')])

    def tearDown(self):
        self.temp.cleanup()

    def write(self, name, data):
        target = self.root / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)

    def save(self, name, value):
        data = json.dumps(value, ensure_ascii=False, indent=2).encode('utf-8')
        self.write(name, data)
        return digest(data)

    def bind(self):
        self.manifest['copyOverlay'] = {'path': 'release-support/copy-tone/overlay.json',
                                       'sha256': self.save('release-support/copy-tone/overlay.json', self.overlay)}

    def make(self, changes):
        self.manifest = copy.deepcopy(self.parent)
        parent_sha = self.save('release-support/copy-tone/baseline-manifest.json', self.parent)
        self.overlay = {'version': 1, 'baseline': {
            'manifest': 'release-support/copy-tone/baseline-manifest.json', 'manifestSha256': parent_sha,
            'verification': 'release-support/copy-tone/baseline-verification.json',
            'verificationSha256': self.save('release-support/copy-tone/baseline-verification.json',
                                            {'issues': [], 'manifestSha256': parent_sha})}, 'files': []}
        for name, data in self.originals.items():
            edits = []
            for file, before, after, kind in changes:
                if file == name:
                    edits.append({'start': data.index(before.encode('utf-8')), 'before': before, 'after': after, 'kind': kind})
            edits.sort(key=lambda edit: edit['start'])
            output = data
            for edit in reversed(edits):
                a = edit['start']
                output = output[:a] + edit['after'].encode('utf-8') + output[a + len(edit['before'].encode('utf-8')):]
            self.write('release/' + name, output)
            if edits:
                self.overlay['files'].append({'file': name, 'beforeSha256': digest(data), 'afterSha256': digest(output), 'edits': edits})
                self.manifest['files'][name].update(sha256=digest(output), bytes=len(output))
        self.bind()

    def test_valid_unicode_reversal_reader(self):
        errors, parent, reader = gate.prepare(self.manifest)
        self.assertEqual(errors, [])
        self.assertEqual(parent, self.parent)
        for name, data in self.originals.items():
            self.assertEqual(reader(name), data)

    def test_attributes_inline_js_jsonld_and_multiple_offsets(self):
        self.make([('index.html', 'Kérjük, válasszon.', 'Válassz.', 'attribute'),
                   ('index.html', 'Adja meg nevét', 'Add meg a neved', 'attribute'),
                   ('index.html', 'Kérjük várjon', 'Várj egy pillanatot', 'js-string'),
                   ('index.html', 'Válasszon időpontot', 'Válassz időpontot', 'jsonld-string')])
        self.assertEqual(gate.verify(self.manifest), [])

    def test_js_strings_and_interpolated_template(self):
        self.make([('ui/site.js', 'Valasszon idopontot', 'Valassz idopontot', 'js-string'),
                   ('ui/site.js', 'Kerjuk, ', 'Kerlek, ', 'js-string'),
                   ('ui/site.js', ' valasszon.', ' valassz.', 'js-string')])
        self.assertEqual(gate.verify(self.manifest), [])

    def test_derived_asset_revision(self):
        old = self.originals['ui/site.js']
        new = old.replace(b'Valasszon idopontot', b'Valassz idopontot')
        self.make([('ui/site.js', 'Valasszon idopontot', 'Valassz idopontot', 'js-string'),
                   ('index.html', 'ui/site.js?v=' + digest(old)[:12], 'ui/site.js?v=' + digest(new)[:12], 'asset-version')])
        self.assertEqual(gate.verify(self.manifest), [])

    def test_wrong_asset_revision(self):
        old = self.originals['ui/site.js']
        self.make([('index.html', 'ui/site.js?v=' + digest(old)[:12], 'ui/site.js?v=000000000000', 'asset-version')])
        self.assertTrue(gate.verify(self.manifest))

    def test_url_change_rejected(self):
        self.make([('index.html', '#booking', '#elsewhere', 'attribute')])
        self.assertTrue(gate.verify(self.manifest))

    def test_url_cannot_be_disguised_as_asset_revision(self):
        self.make([('index.html', '#booking', 'ui/site.js?v=' + digest(self.originals['ui/site.js'])[:12], 'asset-version')])
        self.assertTrue(gate.verify(self.manifest))

    def test_asset_path_substitution_rejected(self):
        old = 'ui/site.js?v=' + digest(self.originals['ui/site.js'])[:12]
        self.make([('index.html', old, 'https://attacker.test/a.js?v=000000000000', 'asset-version')])
        self.assertTrue(gate.verify(self.manifest))

    def test_operator_change_rejected(self):
        self.make([('ui/site.js', '1 + 2', '1 - 2', 'js-string')])
        self.assertTrue(gate.verify(self.manifest))

    def test_javascript_url_string_rejected(self):
        self.make([('ui/site.js', 'Valasszon idopontot', 'https://attacker.test/', 'js-string')])
        self.assertTrue(gate.verify(self.manifest))

    def test_consumer_message_prefix_is_not_a_url(self):
        self.make([('ui/site.js', 'Valasszon idopontot', 'Hiba: valassz idopontot', 'js-string')])
        self.assertEqual(gate.verify(self.manifest), [])

    def test_template_expression_change_rejected(self):
        self.make([('ui/site.js', '${name}', '${other}', 'js-string')])
        self.assertTrue(gate.verify(self.manifest))

    def test_regex_change_rejected(self):
        self.make([('ui/site.js', '/["\']/g', '/["\']/i', 'js-string')])
        self.assertTrue(gate.verify(self.manifest))

    def test_comment_change_rejected(self):
        self.make([('ui/site.js', '/* Valasszon */', '/* Valassz */', 'js-string')])
        self.assertTrue(gate.verify(self.manifest))

    def test_string_breakout_rejected(self):
        self.make([('ui/site.js', 'Valasszon idopontot', "Valassz'; evil(); const another = 'x", 'js-string')])
        self.assertTrue(gate.verify(self.manifest))

    def test_html_injection_rejected(self):
        self.make([('index.html', 'Kérjük, válasszon időpontot.', '</a><script>evil()</script><a>Válassz', 'text')])
        self.assertTrue(gate.verify(self.manifest))

    def test_attribute_breakout_rejected(self):
        self.make([('index.html', 'Adja meg nevét', 'Név" oninput="evil()', 'attribute')])
        self.assertTrue(gate.verify(self.manifest))

    def test_jsonld_url_change_rejected(self):
        self.make([('index.html', 'https://example.test/', 'https://attacker.test/', 'jsonld-string')])
        self.assertTrue(gate.verify(self.manifest))

    def test_jsonld_key_change_rejected(self):
        self.make([('index.html', '"name":"', '"description":"', 'jsonld-string')])
        self.assertTrue(gate.verify(self.manifest))

    def test_overlap_rejected(self):
        edits = self.overlay['files'][0]['edits']
        edits.append(dict(edits[0]))
        self.bind()
        self.assertTrue(gate.verify(self.manifest))

    def test_duplicate_file_rejected(self):
        self.overlay['files'].append(copy.deepcopy(self.overlay['files'][0]))
        self.bind()
        self.assertTrue(gate.verify(self.manifest))

    def test_wrong_offset_rejected(self):
        self.overlay['files'][0]['edits'][0]['start'] += 1
        self.bind()
        self.assertTrue(gate.verify(self.manifest))

    def test_boolean_offset_rejected(self):
        self.overlay['files'][0]['edits'][0]['start'] = True
        self.bind()
        self.assertTrue(gate.verify(self.manifest))

    def test_unknown_kind_rejected(self):
        self.overlay['files'][0]['edits'][0]['kind'] = 'trusted-code'
        self.bind()
        self.assertTrue(gate.verify(self.manifest))

    def test_baseline_hash_tamper(self):
        self.write('release-support/copy-tone/baseline-manifest.json', b'{}')
        self.assertTrue(gate.verify(self.manifest))

    def test_baseline_not_exactly_verified(self):
        self.overlay['baseline']['verificationSha256'] = self.save('release-support/copy-tone/baseline-verification.json',
                                                                  {'issues': [], 'manifestSha256': '0' * 64})
        self.bind()
        self.assertTrue(gate.verify(self.manifest))

    def test_unlisted_change_even_with_manifest_hash(self):
        self.write('release/style.css', b'body{color:red}')
        self.manifest['files']['style.css'].update(sha256=digest(b'body{color:red}'), bytes=len(b'body{color:red}'))
        self.assertTrue(gate.verify(self.manifest))

    def test_manifest_metadata_tamper(self):
        self.manifest['pages'] = 99
        self.assertTrue(gate.verify(self.manifest))

    def test_added_artifact_rejected(self):
        self.manifest['files']['extra.js'] = {'sha256': digest(b''), 'bytes': 0}
        self.assertTrue(gate.verify(self.manifest))

    def test_traversal_path_rejected(self):
        self.overlay['files'][0]['file'] = '../index.html'
        self.bind()
        self.assertTrue(gate.verify(self.manifest))

    def test_nested_copy_baseline_rejected(self):
        self.parent['copyOverlay'] = {'path': 'old', 'sha256': '0' * 64}
        self.make([('index.html', 'Kérjük, válasszon időpontot.', 'Válassz időpontot.', 'text')])
        self.assertTrue(gate.verify(self.manifest))

    def test_package_gate_requires_copy_proof(self):
        self.originals.update({'CNAME': b'ecocleantisztito.hu', 'sitemap.xml': b'<urlset/>', 'robots.txt': b'',
                               'ui/booking-live.js': b';', 'ui/calendar-live.js': b';', 'book': b''})
        self.parent['files'] = {name: {'sha256': digest(data), 'bytes': len(data), 'source': 'fixture'}
                                for name, data in self.originals.items()}
        self.make([('index.html', 'Kérjük, válasszon időpontot.', 'Válassz időpontot.', 'text')])
        manifest_sha = self.save('release-support/release-manifest.json', self.manifest)
        self.save('release-support/release-verification.json', {'issues': [], 'manifestSha256': manifest_sha})
        for name in ('verify-package.py', 'verify-copy-overlay.py'):
            self.write('release-support/' + name, (HERE / name).read_bytes())
        command = [sys.executable, str(self.root / 'release-support/verify-package.py')]
        result = subprocess.run(command, cwd=self.root, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.write('release-support/copy-tone/baseline-verification.json', b'{}')
        result = subprocess.run(command, cwd=self.root, capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Provenance hash mismatch', result.stdout)

    def test_original_reader_default_widget_contract_unchanged(self):
        spec = importlib.util.spec_from_file_location('widget_tests_for_copy', HERE / 'test_widget_overlay.py')
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        fixture = module.ProofTests('test_valid_exact_overlay')
        fixture.setUp()
        try:
            read = lambda name: (fixture.root / 'release' / name).read_bytes()
            self.assertEqual(module.gate.verify(fixture.manifest), [])
            self.assertEqual(module.gate.verify(fixture.manifest, reader=read), [])
            self.assertTrue(module.gate.verify(fixture.manifest, reader=lambda name: b'tampered'))
        finally:
            fixture.tearDown()

    def test_copy_recovery_still_requires_parent_widget_proof(self):
        spec = importlib.util.spec_from_file_location('widget_chain_fixture', HERE / 'test_widget_overlay.py')
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        fixture = module.ProofTests('test_valid_exact_overlay')
        fixture.setUp()
        original_root = self.root
        try:
            self.root = fixture.root
            gate.ROOT = self.root
            self.write('release-support/verify-widget-overlay.py', (HERE / 'verify-widget-overlay.py').read_bytes())
            self.parent = copy.deepcopy(fixture.manifest)
            self.originals = {name: (self.root / 'release' / name).read_bytes() for name in self.parent['files']}
            self.make([('index.html', 'ORIGINAL', 'TEGEZO', 'text')])
            errors, parent, reader = gate.prepare(self.manifest)
            self.assertEqual(errors, [])
            self.assertEqual(parent, self.parent)
            self.assertEqual(reader('index.html'), self.originals['index.html'])
            self.write('release-support/base/report.json', b'{}')
            self.assertTrue(gate.verify(self.manifest))
        finally:
            fixture.tearDown()
            self.root = original_root
            gate.ROOT = self.root


if __name__ == '__main__':
    unittest.main()
