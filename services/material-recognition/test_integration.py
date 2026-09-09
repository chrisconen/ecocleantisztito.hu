"""Offline HTTP coverage for provider selection, consent and reference handoff."""
import json
import tempfile
from pathlib import Path
from unittest.mock import patch
import unittest
import server
import test_server
from test_server import image_payload, result


class MultiProviderTests(unittest.TestCase):
    # Reuse the existing actual HTTP fixture, but only run the tests below.
    def setUp(self):
        test_server.HTTPTests.setUp(self)
        self.config.provider_settings = {
            'gemini': {'key': 'fixture-google', 'model': 'gemini-2.5-flash-lite', 'label': 'Gemini 2.5 Flash-Lite'},
            'openai': {'key': 'fixture-openai', 'model': 'gpt-5.6-luna', 'label': 'GPT-5.6 Luna'},
        }
        self.temp = tempfile.TemporaryDirectory()
        self.config.archive = server.Archive(Path(self.temp.name) / 'archive')

    def tearDown(self):
        test_server.HTTPTests.tearDown(self)
        self.temp.cleanup()

    def request(self, *args, **kwargs):
        status, headers, raw = test_server.HTTPTests.request(self, *args, **kwargs)
        return status, raw, headers

    def post(self, **options):
        return self.request('POST', '/api/material-analyze', json.dumps(image_payload(**options)).encode(), {'Content-Type': 'application/json'})

    def test_selected_provider_only_and_no_collection_without_consent(self):
        self.config.default_provider = 'openai'
        raw = result(**{name: 'Gemini AI, OpenAI GPT-5.6 Luna modell' for name in server.PUBLIC_FALLBACKS if name not in ('kerulendo', 'kockazatok')},
                     kerulendo=['Gemini AI'], kockazatok=['OpenAI modell'])
        with patch.object(server.providers, 'call', return_value=raw) as call:
            status, data, _ = self.post(archive_consent=False)
        self.assertEqual(status, 200)
        body = json.loads(data)
        self.assertEqual(call.call_count, 1)
        self.assertEqual(call.call_args.args[:3], ('openai', 'fixture-openai', 'gpt-5.6-luna'))
        self.assertEqual(call.call_args.kwargs['references'], [])
        self.assertFalse(body['_meta']['archive_saved'])
        self.assertFalse(server.TECHNICAL_BRANDING.search(data.decode('utf-8')))
        self.assertEqual(body['tisztitasi_kod'], 'ismeretlen')
        self.assertEqual(list(Path(self.temp.name).rglob('photo.jpg')), [])

    def test_consent_collects_photo_and_unverified_annotation(self):
        with patch.object(server.providers, 'call', return_value=result()):
            status, data, _ = self.post(archive_consent=True)
        self.assertEqual(status, 200)
        self.assertTrue(json.loads(data)['_meta']['archive_saved'])
        self.assertEqual(len(list(Path(self.temp.name).rglob('photo.jpg'))), 1)
        self.assertEqual(self.config.archive.references(), [])
        serialized = '\n'.join(p.read_text('utf-8') for p in Path(self.temp.name).rglob('*.json'))
        self.assertNotIn('Offline fixture', serialized)  # User note is never archived.
        self.assertNotIn('fixture-google', serialized)

    def test_invalid_consent_provider_or_unavailable_key_never_calls(self):
        with patch.object(server.providers, 'call') as call:
            for options, expected in [({'archive_consent': 'true'}, 400), ({'provider': '../../bad'}, 400), ({'provider': 'anthropic'}, 400), ({'provider': 'openai'}, 400), ({'provider': 'gemini'}, 400)]:
                status, _, _ = self.post(**options)
                self.assertEqual(status, expected)
            self.config.provider_settings['openai']['key'] = ''
            self.config.default_provider = 'openai'
            self.assertEqual(self.post()[0], 503)
        call.assert_not_called()

    def test_archive_failure_stops_before_charge_and_disabled_collection_can_be_skipped(self):
        with patch.object(self.config.archive, 'collect', side_effect=OSError('private path')), patch.object(server.providers, 'call') as call:
            status, data, _ = self.post(archive_consent=True)
            self.assertEqual(status, 503)
            self.assertNotIn('private path', data.decode())
            call.assert_not_called()
        self.config.archive = None
        with patch.object(server.providers, 'call', return_value=result()) as call:
            self.assertEqual(self.post(archive_consent=True)[0], 503)
            self.assertEqual(self.post(archive_consent=False)[0], 200)
            self.assertEqual(call.call_count, 1)

    def test_provider_failure_preserves_consented_photo_reports_truth_and_no_fallback(self):
        with patch.object(server.providers, 'call', side_effect=RuntimeError('private upstream detail')) as call:
            status, data, _ = self.post(archive_consent=True)
        self.assertEqual(status, 502)
        self.assertEqual(call.call_count, 1)
        self.assertTrue(json.loads(data)['_meta']['archive_saved'])
        self.assertNotIn('private upstream detail', data.decode())
        self.assertEqual(len(list(Path(self.temp.name).rglob('photo.jpg'))), 1)

    def test_only_explicitly_active_human_reference_sent_to_provider(self):
        b64, media, _ = server.validate_input(json.dumps(image_payload()).encode())
        ident = self.config.archive.collect(b64, media, 'gemini', 'gemini-2.5-flash-lite')
        self.config.archive.promote(ident, material='bouclé', brand='Andante', label='Offline reference',
                                    evidence='Synthetic fixture, not a real material claim', human_verified=True)
        self.assertEqual(self.config.archive.references(), [])
        self.config.archive.activate(ident)
        self.config.default_provider = 'openai'
        with patch.object(server.providers, 'call', return_value=result()) as call:
            status, data, _ = self.post()
        self.assertEqual(status, 200)
        refs = call.call_args.kwargs['references']
        self.assertEqual(len(refs), 1)
        self.assertEqual(refs[0]['brand'], 'Andante')
        self.assertEqual(json.loads(data)['_meta']['reference_count'], 1)

    def test_health_hides_owner_configuration_and_no_silent_switch(self):
        self.config.provider_settings['gemini']['key'] = ''
        status, data, _ = self.request('GET', '/api/material-health')
        self.assertEqual(status, 200)
        health = json.loads(data)
        self.assertFalse(health['ready'])
        self.assertNotIn('default_provider', health)
        self.assertNotIn('providers', health)
        self.assertTrue(health['collection_enabled'])
        self.assertNotIn('fixture-', data.decode())
        self.assertNotIn('gemini', data.decode())


if __name__ == '__main__':
    unittest.main()
