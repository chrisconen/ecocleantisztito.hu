"""Offline unit/integration tests. The Anthropic provider is always mocked."""
import base64
from concurrent.futures import ThreadPoolExecutor
from contextlib import redirect_stderr, redirect_stdout
import http.client
import io
import ipaddress
import json
from pathlib import Path
import socket
import tempfile
import threading
import unittest
from unittest.mock import patch
import urllib.error
from PIL import Image
import server


def image_payload(format='PNG', **overrides):
    output = io.BytesIO()
    Image.new('RGB', (16, 16), '#b9ad96').save(output, format)
    media = {'PNG': 'image/png', 'JPEG': 'image/jpeg', 'WEBP': 'image/webp', 'GIF': 'image/gif'}[format]
    return {'image': 'data:' + media + ';base64,' + base64.b64encode(output.getvalue()).decode(), 'media_type': media, 'note': 'Offline fixture', **overrides}


def result(**overrides):
    return {'kep_tipus': 'anyag', 'anyag': 'bouclé', 'anyag_alt': 'Hurkolt felület', 'biztonsag': 75,
            'indoklas': 'Hurkolt szálak látszanak.', 'tisztitasi_kod': 'W', 'modszer': 'NE legyen jóváhagyott eljárás.',
            'kerulendo': ['Áztatás'], 'kockazatok': ['Színvesztés'], 'ellenorzes': 'Gyártói címke és anyagpróba.',
            'kerdes_ugyfelnek': 'Lefotóznád a címkét?', **overrides}


class ValidationTests(unittest.TestCase):
    def test_customer_result_omits_provider_and_technical_branding(self):
        for phrase in ('Gemini szerint', 'Az OpenAI GPT-5.6 Luna úgy látja', 'AI-becslés', 'A modell szerint', 'mesterséges intelligencia', 'A Claude és a Google becslése'):
            raw = result(**{name: phrase for name in ('anyag_alt', 'indoklas', 'ellenorzes', 'kerdes_ugyfelnek')},
                         kerulendo=[phrase], kockazatok=[phrase])
            clean = server.sanitize_result(raw)
            self.assertFalse(server.TECHNICAL_BRANDING.search(json.dumps(clean, ensure_ascii=False)))
            self.assertTrue(all(clean[key] for key in server.PUBLIC_FALLBACKS))

    def test_supported_mime_and_real_decoding(self):
        for format in ('PNG', 'JPEG', 'WEBP', 'GIF'):
            with self.subTest(format=format):
                payload = image_payload(format)
                self.assertEqual(server.validate_input(json.dumps(payload).encode())[1:], (payload['media_type'], 'Offline fixture'))

    def test_invalid_inputs(self):
        cases = [b'not JSON', b'{"image":1,"image":2}', b'NaN', b'[]', b'{"note":null}',
                 json.dumps(image_payload(note=1)).encode(), json.dumps(image_payload(note='a' * 2001)).encode(),
                 json.dumps(image_payload(extra='unexpected')).encode(), json.dumps(image_payload(media_type='image/jpeg')).encode(),
                 json.dumps(image_payload(image='data:image/png;base64,%%%')).encode(),
                 json.dumps(image_payload(image='data:image/png;base64,' + base64.b64encode(b'not an image').decode())).encode(),
                 json.dumps(image_payload(image='https://example.invalid/photo.png')).encode()]
        for raw in cases:
            with self.subTest(raw=raw[:40]):
                self.assertRaises(server.InputError, server.validate_input, raw)

    def test_decoded_image_and_pixel_bounds(self):
        with patch.object(server, 'MAX_IMAGE', 2):
            self.assertRaises(server.InputError, server.validate_input, json.dumps(image_payload()).encode())
        with patch.object(server, 'MAX_PIXELS', 16):
            self.assertRaises(server.InputError, server.validate_input, json.dumps(image_payload()).encode())

    def test_schema_clamps_and_removes_unknown_fields(self):
        clean = server.sanitize_result(result(biztonsag=900, anyag='invented material', unexpected='never return', kockazatok=['x'] * 20))
        self.assertEqual(set(clean), set(server.FIELDS))
        self.assertEqual(clean['biztonsag'], 100)
        self.assertEqual(clean['anyag'], 'nem eldönthető')
        self.assertEqual(clean['tisztitasi_kod'], 'ismeretlen')
        self.assertEqual(clean['modszer'], server.NO_CODE)
        self.assertIn('nem bevizsgált pontosság', clean['indoklas'])
        self.assertEqual(len(clean['kockazatok']), 8)
        self.assertEqual(server.sanitize_result(result(biztonsag=True))['biztonsag'], 0)
        self.assertEqual(server.sanitize_result(result(biztonsag=float('nan')))['biztonsag'], 0)
        self.assertEqual(server.sanitize_result(result(biztonsag=10 ** 500))['biztonsag'], 100)
        self.assertEqual(server.sanitize_result(result(kep_tipus='cimke', tisztitasi_kod=['W']))['tisztitasi_kod'], 'ismeretlen')
        self.assertRaises(server.ProviderError, server.sanitize_result, {'anyag': 'bouclé'})

    def test_cleaning_code_needs_label_and_exact_transcription(self):
        for kind, code, label, expected in [('anyag', 'W', 'W', 'ismeretlen'), ('cimke', 'W', '', 'ismeretlen'),
                                             ('cimke', 'S', 'WS', 'ismeretlen'), ('cimke', 'X', 'TEXTILE', 'ismeretlen'),
                                             ('cimke', 'WS', 'Cleaning code: WS', 'WS'), ('cimke', 'X', 'X', 'X'),
                                             ('hasznalhatatlan', 'W', 'W', 'ismeretlen')]:
            with self.subTest(kind=kind, code=code, label=label):
                clean = server.sanitize_result(result(kep_tipus=kind, tisztitasi_kod=code, cimke_szoveg=label))
                self.assertEqual(clean['tisztitasi_kod'], expected)
                self.assertNotIn('cimke_szoveg', clean)


class ProviderTests(unittest.TestCase):
    def test_exact_provider_contract_and_no_raw_response_leak(self):
        raw = {'content': [{'type': 'text', 'text': json.dumps(result(kep_tipus='cimke', cimke_szoveg='W'))}], 'stop_reason': 'end_turn'}
        class Response(io.BytesIO):
            pass
        captured = []
        class Opener:
            def open(self, request, timeout):
                captured.append((request, timeout))
                return Response(json.dumps(raw).encode())
        config = server.Config(api_key='offline-test-key', model='test-vision-model', prompt='test system prompt')
        with patch.object(server.urllib.request, 'build_opener', return_value=Opener()):
            clean = server.call_anthropic(config, 'aGVsbG8=', 'image/png', 'Untrusted note')
        request, timeout = captured[0]
        payload = json.loads(request.data)
        self.assertEqual(request.full_url, 'https://api.anthropic.com/v1/messages')
        self.assertEqual(request.get_header('X-api-key'), 'offline-test-key')
        self.assertEqual(payload['model'], 'test-vision-model')
        self.assertEqual(payload['messages'][0]['content'][0]['source']['media_type'], 'image/png')
        self.assertIn('nem utasítás', payload['messages'][0]['content'][1]['text'])
        self.assertEqual(clean['tisztitasi_kod'], 'W')
        self.assertEqual(timeout, 90)
        self.assertIsNone(server.NoRedirect().redirect_request(None, None, 302, '', {}, 'https://evil.invalid/'))

    def test_errors_are_generic_and_never_logged(self):
        config = server.Config(api_key='sensitive-test-key', prompt='test')
        output = io.StringIO()
        for failure in [urllib.error.HTTPError('https://api.anthropic.com', 401, 'private upstream message', {}, io.BytesIO(b'private response')),
                        TimeoutError('private timeout context')]:
            with self.subTest(error=type(failure).__name__), redirect_stdout(output), redirect_stderr(output):
                with patch.object(server.urllib.request, 'build_opener') as mocked:
                    mocked.return_value.open.side_effect = failure
                    with self.assertRaises(server.ProviderError) as error:
                        server.call_anthropic(config, '', 'image/png', 'private note')
                    self.assertEqual(str(error.exception), 'provider unavailable')
        self.assertEqual(output.getvalue(), '')


class QuotaTests(unittest.TestCase):
    def test_parallel_limits_are_atomic(self):
        limiter = server.RateLimiter(daily=5, per_ip=100)
        with ThreadPoolExecutor(max_workers=20) as pool:
            results = list(pool.map(lambda n: limiter.reserve(str(n)), range(100)))
        self.assertEqual(sum(results), 5)
        self.assertEqual(limiter.count, 5)

    def test_per_ip_memory_expiry_and_day_rollover(self):
        clock = [100000]
        limiter = server.RateLimiter(daily=10, per_ip=1, capacity=2, clock=lambda: clock[0])
        self.assertTrue(limiter.reserve('a'))
        self.assertFalse(limiter.reserve('a'))
        self.assertTrue(limiter.reserve('b'))
        self.assertFalse(limiter.reserve('c'))
        self.assertEqual(len(limiter.ips), 2)
        clock[0] += 3601
        self.assertTrue(limiter.reserve('c'))
        self.assertEqual(len(limiter.ips), 1)
        clock[0] += 86400
        self.assertTrue(limiter.reserve('c'))
        self.assertEqual(limiter.count, 1)

    def test_forwarded_ip_ignored_unless_direct_peer_is_trusted(self):
        networks = (ipaddress.ip_network('127.0.0.1/32'),)
        self.assertEqual(server.client_ip('192.0.2.10', '1.2.3.4', networks), '192.0.2.10')
        self.assertEqual(server.client_ip('127.0.0.1', '1.2.3.4', ()), '127.0.0.1')
        self.assertEqual(server.client_ip('127.0.0.1', '9.9.9.9, 1.2.3.4', networks), '1.2.3.4')
        self.assertEqual(server.client_ip('127.0.0.1', 'bad input', networks), '127.0.0.1')


class HTTPTests(unittest.TestCase):
    def setUp(self):
        self.calls = []
        def provider(config, b64, media, note):
            self.calls.append((media, note))
            return server.sanitize_result(result())
        self.config = server.Config(api_key='offline-test-key', prompt='test', provider=provider,
                                    origins=frozenset({'http://127.0.0.1:8089'}), public=server.public_files(server.PROJECT))
        self.http = server.Server(('127.0.0.1', 0), self.config)
        self.thread = threading.Thread(target=self.http.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.http.shutdown()
        self.http.server_close()
        self.thread.join()

    def request(self, method, path, data=None, headers=None):
        connection = http.client.HTTPConnection('127.0.0.1', self.http.server_port, timeout=3)
        connection.request(method, path, body=data, headers=headers or {})
        response = connection.getresponse()
        content = response.read()
        result = response.status, dict(response.getheaders()), content
        connection.close()
        return result

    def test_post_contract_cors_and_no_persistence(self):
        status, headers, raw = self.request('POST', '/api/material-analyze', json.dumps(image_payload()),
                                           {'Content-Type': 'application/json', 'Origin': 'http://127.0.0.1:8089'})
        self.assertEqual(status, 200)
        self.assertEqual(headers['Access-Control-Allow-Origin'], 'http://127.0.0.1:8089')
        self.assertEqual(set(json.loads(raw)), set(server.FIELDS))
        self.assertEqual(self.calls, [('image/png', 'Offline fixture')])
        self.assertFalse((server.HERE / 'log').exists())

    def test_health_and_disabled_provider(self):
        self.config.api_key = ''
        status, _, raw = self.request('GET', '/api/material-health')
        self.assertEqual((status, json.loads(raw)), (200, {'enabled': True, 'ready': False}))
        status, _, raw = self.request('POST', '/api/material-analyze', json.dumps(image_payload()), {'Content-Type': 'application/json'})
        self.assertEqual(status, 503)
        self.assertEqual(self.calls, [])
        self.assertNotIn('key', raw.decode())

    def test_cors_denied_and_preflight(self):
        status, headers, _ = self.request('POST', '/api/material-analyze', '{}', {'Content-Type': 'application/json', 'Origin': 'https://evil.invalid'})
        self.assertEqual(status, 403)
        self.assertNotIn('Access-Control-Allow-Origin', headers)
        for origin, expected in [('http://127.0.0.1:8089', 204), ('https://evil.invalid', 403), ('null', 403)]:
            status, _, _ = self.request('OPTIONS', '/api/material-analyze', headers={'Origin': origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type'})
            self.assertEqual(status, expected)
        self.assertEqual(self.calls, [])

    def test_length_content_type_and_unknown_endpoints(self):
        for headers, expected in [({'Content-Length': '-1', 'Content-Type': 'application/json'}, 411),
                                   ({'Content-Length': str(server.MAX_BODY + 1), 'Content-Type': 'application/json'}, 413),
                                   ({'Content-Type': 'text/plain'}, 415),
                                   ({'Transfer-Encoding': 'chunked', 'Content-Type': 'application/json'}, 411)]:
            status, _, _ = self.request('POST', '/api/material-analyze', '{}', headers)
            self.assertEqual(status, expected)
        status, _, _ = self.request('POST', '/api', '{}', {'Content-Type': 'application/json'})
        self.assertEqual(status, 404)
        self.assertEqual(self.calls, [])
        # Duplicate Content-Length must be rejected before reading a body.
        with socket.create_connection(('127.0.0.1', self.http.server_port), timeout=3) as client:
            client.sendall(('POST /api/material-analyze HTTP/1.0\r\nHost: 127.0.0.1:' + str(self.http.server_port) + '\r\nContent-Length: 2\r\nContent-Length: 3\r\nContent-Type: application/json\r\n\r\n{}').encode())
            self.assertIn(b'411', client.recv(4096).split(b'\r\n')[0])

    def test_host_guard_blocks_dns_rebinding_and_allows_explicit_public_origin(self):
        status, headers, _ = self.request('POST', '/api/material-analyze', json.dumps(image_payload()),
                                         {'Host': 'evil.invalid', 'Origin': 'http://evil.invalid', 'Content-Type': 'application/json'})
        self.assertEqual(status, 421)
        self.assertNotIn('Access-Control-Allow-Origin', headers)
        self.assertEqual(self.calls, [])
        self.config.public_origin = 'https://ecocleantisztito.hu'
        status, headers, _ = self.request('POST', '/api/material-analyze', json.dumps(image_payload()),
                                         {'Host': 'ecocleantisztito.hu', 'Origin': 'https://ecocleantisztito.hu', 'Content-Type': 'application/json'})
        self.assertEqual(status, 200)
        self.assertEqual(headers['Access-Control-Allow-Origin'], 'https://ecocleantisztito.hu')

    def test_invalid_input_does_not_spend_provider_quota(self):
        status, _, _ = self.request('POST', '/api/material-analyze', '{}', {'Content-Type': 'application/json'})
        self.assertEqual(status, 400)
        self.assertEqual(self.config.limiter.count, 0)
        self.assertEqual(self.calls, [])

    def test_worker_saturation_returns_bounded_safe_error(self):
        reserved = 0
        while self.http.workers.acquire(blocking=False):
            reserved += 1
        try:
            status, _, raw = self.request('GET', '/api/material-health')
            self.assertEqual(status, 503)
            self.assertEqual(set(json.loads(raw)), {'hiba'})
        finally:
            for _ in range(reserved):
                self.http.workers.release()

    def test_bind_conflict_fails_instead_of_sharing_existing_listener(self):
        with self.assertRaises(OSError):
            unexpected = server.Server(('127.0.0.1', self.http.server_port), self.config)
            unexpected.server_close()
        self.assertFalse(server.Server.allow_reuse_address)
        # A wildcard listener is the Windows failure mode found in the live probe.
        for reuse in (False, True):
            with self.subTest(existing_listener_reuses_address=reuse), socket.socket(socket.AF_INET, socket.SOCK_STREAM) as occupied:
                occupied.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, int(reuse))
                occupied.bind(('0.0.0.0', 0))
                occupied.listen(1)
                with self.assertRaises(OSError):
                    unexpected = server.Server(('127.0.0.1', occupied.getsockname()[1]), self.config)
                    unexpected.server_close()
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as free_probe:
            free_probe.bind(('127.0.0.1', 0))
            free_port = free_probe.getsockname()[1]
        available = server.Server(('127.0.0.1', free_port), self.config)
        try:
            self.assertEqual(available.server_address, ('127.0.0.1', free_port))
            if hasattr(socket, 'SO_EXCLUSIVEADDRUSE'):
                self.assertTrue(available.socket.getsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE))
        finally:
            available.server_close()

    def test_provider_error_and_rate_limit_are_safe(self):
        def fail(*_):
            raise RuntimeError('private secret upstream text')
        self.config.provider = fail
        payload = json.dumps(image_payload())
        status, _, raw = self.request('POST', '/api/material-analyze', payload, {'Content-Type': 'application/json'})
        self.assertEqual(status, 502)
        self.assertNotIn('private', raw.decode())
        self.config.limiter = server.RateLimiter(daily=1)
        self.config.limiter.reserve('anything')
        status, _, _ = self.request('POST', '/api/material-analyze', payload, {'Content-Type': 'application/json'})
        self.assertEqual(status, 429)

    def test_static_public_allowlist_and_private_denial(self):
        for path in ['/demo/index.html', '/demo/karpittisztitas-gyor.html', '/demo/studio/configurator.js', '/demo/studio/design.css']:
            status, _, _ = self.request('GET', path)
            self.assertEqual(status, 200, path)
        for path in ['/server.py', '/.git/config', '/services/material-recognition/server.py', '/demo/studio/manifest.json',
                     '/demo/studio/baseline/index.html', '/demo/studio/qa/booking-verification.json', '/demo/../index.html',
                     '/demo/%2e%2e/index.html', '/demo/studio/provenance/original-server.py', '/ecocleantisztito.hu.txt', '/demo/studio/build.mjs']:
            status, _, _ = self.request('GET', path)
            self.assertEqual(status, 404, path)
        status, headers, raw = self.request('HEAD', '/demo/studio/configurator.js')
        self.assertEqual(status, 200)
        self.assertTrue(int(headers['Content-Length']) > 0)
        self.assertEqual(raw, b'')


if __name__ == '__main__':
    unittest.main()
