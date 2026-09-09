"""Explicit live-provider smoke using ONLY the generated armchair fixture.

This makes one API attempt per invocation. It never archives a photo, reads a
customer upload or writes provider responses. A passing result proves transport
and response-contract integration, not material-recognition accuracy.
"""
import argparse
import base64
from datetime import datetime, timezone
import io
import json
import os
from pathlib import Path
import time
import urllib.error
from PIL import Image
import providers
import server

HERE = Path(__file__).resolve().parent
FIXTURE = HERE.parent.parent / 'demo/material-recognition/assets/fotel-bukle-olvasosarok.webp'
REPORT = HERE / 'qa/provider-live.json'
SAFE_ERROR_CODES = {'INVALID_ARGUMENT', 'UNAUTHENTICATED', 'PERMISSION_DENIED', 'RESOURCE_EXHAUSTED',
                    'NOT_FOUND', 'UNAVAILABLE', 'DEADLINE_EXCEEDED', 'INTERNAL', 'FAILED_PRECONDITION',
                    'invalid_api_key', 'insufficient_quota', 'model_not_found', 'rate_limit_exceeded'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--provider', choices=('gemini', 'openai'), required=True)
    args = parser.parse_args()
    model = providers.DEFAULT_MODELS[args.provider]
    key = os.getenv('GEMINI_API_KEY', os.getenv('GOOGLE_API_KEY', '')) if args.provider == 'gemini' else os.getenv('OPENAI_API_KEY', '')
    report = {'checked_at': datetime.now(timezone.utc).isoformat(), 'provider': args.provider, 'model': model,
              'fixture': 'demo/material-recognition/assets/fotel-bukle-olvasosarok.webp', 'fixture_kind': 'generated_interior',
              'customer_data': False, 'collection': False, 'references': 0, 'transport_attempts': 0,
              'real_calls': 0, 'http_status': None, 'status': 'not_run', 'elapsed_seconds': 0,
              'accuracy_claim': False}
    started = time.monotonic()
    if not key:
        report.update(status='unconfigured', error_code='key_unavailable')
    else:
        with Image.open(FIXTURE) as image:
            image = image.convert('RGB')
            image.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
            output = io.BytesIO()
            image.save(output, 'JPEG', quality=80, optimize=True)
            report.update(image_width=image.width, image_height=image.height, image_bytes=len(output.getvalue()))
            b64 = base64.b64encode(output.getvalue()).decode('ascii')
        original_builder = providers.urllib.request.build_opener

        def monitored_builder(*handlers):
            opener = original_builder(*handlers)
            class Monitor:
                def open(self, request, timeout):
                    report['transport_attempts'] += 1
                    try:
                        response = opener.open(request, timeout=timeout)
                        report['http_status'] = response.status
                        report['real_calls'] += 1
                        return response
                    except urllib.error.HTTPError as error:
                        report['http_status'] = error.code
                        report['real_calls'] += 1
                        # Parse a bounded error body in memory, keep ONLY an allowlisted code.
                        try:
                            parsed = json.loads(error.read(4096))
                            block = parsed.get('error', {})
                            code = block.get('status') or block.get('code')
                            if isinstance(code, str) and code in SAFE_ERROR_CODES:
                                report['error_code'] = code
                        except (ValueError, AttributeError, TypeError):
                            pass
                        raise
                    except (urllib.error.URLError, OSError):
                        report['error_code'] = 'network_unavailable'
                        raise
            return Monitor()

        providers.urllib.request.build_opener = monitored_builder
        try:
            prompt = (HERE / 'prompt.txt').read_text(encoding='utf-8')
            raw = providers.call(args.provider, key, model, prompt, b64, 'image/jpeg',
                                 'Generált enteriőrképpel végzett technikai próba. Nem ügyfélfotó. A képből csak bizonytalan anyagbecslés adható.', references=[])
            clean = server.sanitize_result(raw)
            report.update(status='passed', result_keys=sorted(clean), image_kind=clean['kep_tipus'], material=clean['anyag'])
        except (providers.ProviderFailure, server.ProviderError, ValueError, TypeError):
            report.update(status='failed')
            report.setdefault('error_code', 'provider_contract_failure')
        finally:
            providers.urllib.request.build_opener = original_builder
    report['elapsed_seconds'] = round(time.monotonic() - started, 3)
    previous = []
    if REPORT.exists():
        try:
            previous = json.loads(REPORT.read_text(encoding='utf-8')).get('attempts', [])
        except (ValueError, AttributeError):
            previous = []
    attempts = previous[-19:] + [report]
    document = {'attempts': attempts, 'real_calls_total': sum(item.get('real_calls', 0) for item in attempts),
                'note': 'Generated fixture only. Successful inference verifies API integration, not recognition accuracy.'}
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(document, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False))
    return 0 if report['status'] == 'passed' else 1


if __name__ == '__main__':
    raise SystemExit(main())
