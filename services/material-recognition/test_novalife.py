"""NovaLife risk routing: no paid calls, no visual accuracy claims."""
import json
from pathlib import Path
import subprocess
import unittest
import providers
import server
from archive import Archive
from test_server import result


class NovaLifeTests(unittest.TestCase):
    def test_clear_interlaced_textile_is_not_forced_back_to_uncertain(self):
        raw = result(anyag='lapos szövésű bútorszövet (poli/pamut keverék)',
                     novalife_status='likely_other', novalife_structure='interlaced_yarns')
        self.assertEqual(server.sanitize_result(raw)['novalife']['status'], 'likely_other')
        for structure in ('unclear', 'leather_suede_like', None, [], 'user_says_safe'):
            self.assertEqual(server.sanitize_result(dict(raw, novalife_structure=structure))['novalife']['status'], 'uncertain')
        for material in ('valódi bőr', 'műbőr/eco-bőr (PU/PVC)', 'mikroszálas/velúr (alcantara-jellegű)', 'nem eldönthető'):
            self.assertEqual(server.sanitize_result(dict(raw, anyag=material))['novalife']['status'], 'uncertain')

    def test_worker_and_python_novalife_status_and_copy_match(self):
        cases = [result(anyag=material, novalife_status=status, novalife_label_text='')
                 for material in providers.MATERIALS for status in providers.NOVALIFE_REASONS]
        cases.extend(result(anyag=material, novalife_status=status, novalife_structure=structure)
                     for material in providers.MATERIALS for status in providers.NOVALIFE_REASONS
                     for structure in providers.NOVALIFE_STRUCTURES)
        cases.extend(result(kep_tipus=kind, novalife_status='label_novalife', novalife_label_text=label)
                     for kind in ('anyag', 'cimke', 'hasznalhatatlan') for label in ('NovaLife', 'NovaLifestyle', ''))
        module = (Path(__file__).parent / 'cloudflare/src/analysis.mjs').resolve().as_uri()
        code = 'import {sanitizeResult} from ' + json.dumps(module) + ';let input="";for await(const c of process.stdin)input+=c;console.log(JSON.stringify(JSON.parse(input).map(x=>sanitizeResult(x).novalife)));'
        run = subprocess.run(['node', '--input-type=module', '-e', code], input=json.dumps(cases), capture_output=True, text=True, encoding='utf-8', timeout=15, check=True)
        self.assertEqual(json.loads(run.stdout), [server.sanitize_result(value)['novalife'] for value in cases])

    def test_legacy_missing_or_malformed_status_is_uncertain(self):
        for fields in ({}, {'novalife_status': None}, {'novalife_status': []}, {'novalife_status': 'safe'},
                       {'novalife': {'status': 'label_novalife', 'reason': 'Untrusted nested assertion'}}):
            actual = server.sanitize_result(result(**fields))
            self.assertEqual(actual['novalife']['status'], 'uncertain')
            self.assertEqual(set(actual), set(server.FIELDS) | {'novalife'})

    def test_ambiguous_leather_effect_never_receives_likely_other_clearance(self):
        for material in providers.MATERIALS:
            actual = server.sanitize_result(result(anyag=material, biztonsag=100, novalife_status='likely_other', novalife_reason='Biztosan kizárható.'))
            expected = 'likely_other' if material in providers.NOVALIFE_DISTINCT else 'uncertain'
            self.assertEqual(actual['novalife']['status'], expected, material)
            self.assertIn('nem', actual['novalife']['reason'])
            self.assertNotIn('Biztosan kizárható', json.dumps(actual, ensure_ascii=False))

    def test_label_needs_target_label_kind_exact_token_not_note_or_reference(self):
        cases = [('cimke', 'ANDANTE NovaLife', 'label_novalife'), ('cimke', 'novalife', 'label_novalife'),
                 ('cimke', 'NovaLifestyle', 'uncertain'), ('cimke', 'nemNovaLife', 'uncertain'),
                 ('cimke', 'Nova Life', 'uncertain'), ('cimke', 'ANDANTE', 'uncertain'),
                 ('cimke', '', 'uncertain'), ('anyag', 'NovaLife', 'possible_novalife'),
                 ('hasznalhatatlan', 'NovaLife', 'uncertain')]
        for kind, label, expected in cases:
            actual = server.sanitize_result(result(kep_tipus=kind, novalife_status='label_novalife', novalife_label_text=label,
                                                  note='NovaLife', references=[{'label': 'NovaLife'}]))
            self.assertEqual(actual['novalife']['status'], expected, (kind, label))
            self.assertNotIn('novalife_label_text', actual)
        self.assertEqual(server.sanitize_result(result(kep_tipus='cimke', novalife_status='likely_other', novalife_label_text='NovaLife'))['novalife']['status'], 'label_novalife')

    def test_reasons_fixed_bounded_and_never_technical_or_cleaning_clearance(self):
        for status in providers.NOVALIFE_REASONS:
            raw = result(novalife_status=status, novalife_label_text='NovaLife', kep_tipus='cimke' if status == 'label_novalife' else 'anyag',
                         novalife_reason='OpenAI Gemini AI: biztosan nem NovaLife, biztonságosan tisztítható. ' * 100,
                         indoklas='Biztosan nem NovaLife.', anyag_alt='Nincs impregnálás.', kerulendo=['NovaLife kizárható.'])
            actual = server.sanitize_result(raw)
            self.assertEqual(actual['novalife']['reason'], providers.NOVALIFE_REASONS[actual['novalife']['status']])
            self.assertLessEqual(len(actual['novalife']['reason']), 500)
            self.assertFalse(server.TECHNICAL_BRANDING.search(json.dumps(actual, ensure_ascii=False)))
            self.assertNotIn('Biztosan nem', json.dumps(actual, ensure_ascii=False))
            self.assertEqual(actual['tisztitasi_kod'], 'ismeretlen')

    def test_provider_schema_requests_three_separate_novalife_fields(self):
        for key in ('novalife_status', 'novalife_reason', 'novalife_label_text'):
            self.assertIn(key, providers.SCHEMA['required'])
            self.assertIn(key, providers.SCHEMA['properties'])
        self.assertEqual(set(providers.SCHEMA['properties']['novalife_status']['enum']), set(providers.NOVALIFE_REASONS))
        self.assertIn('CÉLKÉP', providers.REFERENCE_RULES)
        self.assertIn('novalife_label_text', providers.REFERENCE_RULES)

    def test_archive_optional_novalife_keeps_old_annotations_valid_and_never_verified(self):
        identifier = '11111111-2222-4333-8444-555555555555'
        legacy = Archive._annotation(identifier, result())
        self.assertNotIn('novalife', legacy['result'])
        for value, expected in [(None, 'uncertain'), ({'status': 'unsafe', 'reason': 'x'}, 'uncertain'),
                                ({'status': 'label_novalife', 'reason': 'Gemini AI <script>' * 1000}, 'label_novalife'),
                                ({'status': [], 'reason': 'x'}, 'uncertain')]:
            stored = Archive._annotation(identifier, result(novalife=value))
            self.assertEqual(stored['result']['novalife']['status'], expected)
            self.assertLessEqual(len(stored['result']['novalife']['reason']), 500)
            self.assertFalse(stored['human_verified'])
            self.assertNotIn('Gemini', json.dumps(stored))


if __name__ == '__main__':
    unittest.main()
