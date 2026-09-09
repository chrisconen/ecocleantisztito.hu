"""Private sync tests: synthetic pixels, temporary files, mocked urllib only."""
import base64
from contextlib import redirect_stdout
import hashlib
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import urllib.error
import uuid

from PIL import Image

import archive
import sync


TOKEN = 'fixture-only-token-never-a-live-credential-00000000'
ENDPOINT = 'https://ecocleantisztito.hu'


def remote_fixture(*, record_id=None, color='#b9ad96', metadata=False):
    out = io.BytesIO()
    extras = {}
    if metadata:
        exif = Image.Exif()
        exif[0x010E] = 'Private fixture metadata'
        extras['exif'] = exif
    Image.new('RGB', (48, 32), color).save(out, 'JPEG', **extras)
    data = out.getvalue()
    record = {'schema_version': 1, 'id': record_id or str(uuid.uuid4()),
              'received_utc': '2026-09-09T10:11:12.000Z', 'sha256': hashlib.sha256(data).hexdigest(),
              'media': 'image/jpeg', 'provider': 'google', 'model': 'fixture-model',
              'consent': archive.Archive._consent(), 'status': 'pending'}
    item = {key: record[key] for key in sync.ITEM_FIELDS - {'bytes'}}
    item['bytes'] = len(data)
    return item, {'record': record, 'image': base64.b64encode(data).decode('ascii'),
                  'annotation': {'anyag': 'chenille', 'biztonsag': 60, 'indoklas': 'Fixture model estimate'}}


class Response:
    def __init__(self, value, *, url=None, status=200, content_type='application/json', length=None):
        self.raw = value if isinstance(value, bytes) else json.dumps(value, ensure_ascii=False).encode('utf-8')
        self.url, self.status = url, status
        self.headers = {'Content-Type': content_type}
        if length is not None:
            self.headers['Content-Length'] = str(length)
        self.read_sizes = []

    def geturl(self):
        return self.url

    def read(self, size):
        self.read_sizes.append(size)
        return self.raw[:size]

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


class FakeOpener:
    def __init__(self):
        self.responses, self.requests = [], []

    def open(self, request, timeout):
        self.requests.append(request)
        if not self.responses:
            raise AssertionError('Unmocked network request refused by test fixture')
        response = self.responses.pop(0)
        if isinstance(response, BaseException):
            raise response
        if not isinstance(response, Response):
            response = Response(response)
        if response.url is None:
            response.url = request.full_url
        return response


class SyncTests(unittest.TestCase):
    def test_remote_novalife_and_legacy_annotations_both_sync_without_contract_change(self):
        first, old = remote_fixture()
        second, new = remote_fixture()
        new['annotation']['novalife'] = {'status': 'possible_novalife', 'reason': 'Unverified visual similarity'}
        self.transport.responses = [self.manifest([first, second]), old, new]
        self.assertEqual(self.client.pull_once()['imported'], 2)
        old_saved = json.loads((self.path / 'inbox' / first['id'] / 'annotation.json').read_text('utf-8'))
        new_saved = json.loads((self.path / 'inbox' / second['id'] / 'annotation.json').read_text('utf-8'))
        self.assertNotIn('novalife', old_saved['result'])
        self.assertEqual(new_saved['result']['novalife']['status'], 'possible_novalife')
        self.assertFalse(new_saved['human_verified'])

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / 'private-library'
        self.library = archive.Archive(self.path)
        self.transport = FakeOpener()
        self.network = patch.object(sync.urllib.request, 'build_opener', return_value=self.transport)
        self.network.start()
        self.addCleanup(self.network.stop)
        self.client = sync.SyncClient(self.library, ENDPOINT, TOKEN)

    def manifest(self, items, cursor=None):
        return {'items': items, 'cursor': cursor}

    def approve(self, record_id):
        self.library.promote(record_id, material='chenille', brand='Andante', label='Verified fixture',
                             evidence='Fixture manufacturer label checked', human_verified=True, active=True)

    def test_import_remote_preserves_uuid_sha_and_curation_idempotently(self):
        item, value = remote_fixture()
        self.assertTrue(self.library.import_remote(**value))
        record_id = item['id']
        directory = self.path / 'inbox' / record_id
        self.assertEqual((directory / 'photo.jpg').read_bytes(), base64.b64decode(value['image']))
        self.assertEqual(json.loads((directory / 'record.json').read_bytes()), value['record'])
        prediction = json.loads((directory / 'annotation.json').read_bytes())
        self.assertFalse(prediction['human_verified'])
        self.assertEqual(prediction['status'], 'unverified_model_prediction')
        self.approve(record_id)
        before = {path.name: path.read_bytes() for path in directory.iterdir()}
        value['annotation'] = {'anyag': 'Different later unverified assertion'}
        self.assertFalse(self.library.import_remote(**value))
        self.assertEqual({path.name: path.read_bytes() for path in directory.iterdir()}, before)
        self.assertEqual(self.library.references()[0]['material'], 'chenille')

    def test_import_remote_rejects_metadata_wrong_consent_hash_and_collision(self):
        _, with_metadata = remote_fixture(metadata=True)
        self.assertRaises(archive.ArchiveError, self.library.import_remote, **with_metadata)
        item, original = remote_fixture()
        for key, value in [('consent', {'schema_version': 1, 'granted': False}),
                           ('consent', {'unexpected': '\ud800'}), ('sha256', '0' * 64),
                           ('status', 'verified_reference'), ('id', '../outside'),
                           ('received_utc', '2026-09-09'), ('schema_version', True)]:
            bad = dict(original, record=dict(original['record'], **{key: value}))
            self.assertRaises(archive.ArchiveError, self.library.import_remote, **bad)
        extra = dict(original, record=dict(original['record'], api_key='must not persist'))
        self.assertRaises(archive.ArchiveError, self.library.import_remote, **extra)
        self.assertEqual(list((self.path / 'inbox').iterdir()), [])
        self.library.import_remote(**original)
        _, conflicting = remote_fixture(record_id=item['id'], color='blue')
        self.assertRaises(archive.ArchiveError, self.library.import_remote, **conflicting)

    def test_import_remote_is_atomic_with_annotation_on_quota_or_io_failure(self):
        item, value = remote_fixture()
        self.library.max_bytes = self.library._usage() + 1
        self.assertRaises(archive.ArchiveError, self.library.import_remote, **value)
        self.library.max_bytes = archive.DEFAULT_MAX_BYTES
        with patch.object(archive.os, 'replace', side_effect=OSError('injected offline failure')):
            self.assertRaises(archive.ArchiveError, self.library.import_remote, **value)
        self.assertFalse((self.path / 'inbox' / item['id']).exists())
        self.assertEqual(list(self.path.rglob('.pending-*')), [])

    def test_pagination_encodes_opaque_cursor_and_downloads_only_new_items(self):
        first, first_value = remote_fixture()
        second, second_value = remote_fixture()
        cursor = 'opaque/+?=& page'
        self.transport.responses = [self.manifest([first], cursor), first_value,
                                    self.manifest([second]), second_value]
        result = self.client.pull_once()
        self.assertEqual(result, {'imported': 2, 'skipped': 0, 'pages': 2})
        requests = self.transport.requests
        self.assertEqual(requests[2].full_url, ENDPOINT + '/api/material-admin/manifest?cursor=opaque%2F%2B%3F%3D%26+page')
        for request in requests:
            self.assertEqual(request.get_header('Authorization'), 'Bearer ' + TOKEN)
            self.assertEqual(request.method, 'GET')
        self.assertTrue((self.path / 'index.html').exists())
        self.transport.responses = [self.manifest([first, second])]
        self.assertEqual(self.client.pull_once(), {'imported': 0, 'skipped': 2, 'pages': 1})
        self.assertEqual(len(self.transport.requests), 5)

    def test_failed_item_does_not_skip_page_or_completed_receipts_on_retry(self):
        first, first_value = remote_fixture()
        second, second_value = remote_fixture()
        self.transport.responses = [self.manifest([first, second]), first_value,
                                    urllib.error.URLError('fixture endpoint failure ' + TOKEN)]
        with self.assertRaises(sync.SyncError) as error:
            self.client.pull_once()
        self.assertNotIn(TOKEN, str(error.exception))
        self.assertTrue((self.client.receipts / (first['id'] + '.json')).exists())
        self.assertFalse((self.client.receipts / (second['id'] + '.json')).exists())
        self.transport.responses = [self.manifest([first, second]), second_value]
        self.assertEqual(self.client.pull_once(), {'imported': 1, 'skipped': 1, 'pages': 1})
        self.assertEqual(self.transport.requests[3].full_url, ENDPOINT + '/api/material-admin/manifest')

    def test_receipts_prevent_resurrection_and_do_not_overwrite_owner_curation(self):
        item, value = remote_fixture()
        self.transport.responses = [self.manifest([item]), value]
        self.client.pull_once()
        self.approve(item['id'])
        self.transport.responses = [self.manifest([item])]
        self.assertEqual(self.client.pull_once()['skipped'], 1)
        self.assertEqual(len(self.library.references()), 1)
        self.library.delete(item['id'])
        self.transport.responses = [self.manifest([item])]
        self.assertEqual(self.client.pull_once()['skipped'], 1)
        self.assertFalse((self.path / 'inbox' / item['id']).exists())
        self.assertEqual(self.library.references(), [])
        receipt = json.loads((self.client.receipts / (item['id'] + '.json')).read_bytes())
        self.assertEqual(set(receipt), sync.ITEM_FIELDS | {'schema_version'})
        self.assertNotIn(TOKEN, json.dumps(receipt))

    def test_missing_receipt_can_resume_after_successful_import(self):
        item, value = remote_fixture()
        self.library.import_remote(**value)
        self.approve(item['id'])
        self.transport.responses = [self.manifest([item])]
        self.assertEqual(self.client.pull_once()['skipped'], 1)
        self.assertEqual(len(self.transport.requests), 1)
        self.assertTrue((self.client.receipts / (item['id'] + '.json')).exists())

    def test_remote_receipt_or_local_integrity_conflicts_fail_closed(self):
        item, value = remote_fixture()
        self.transport.responses = [self.manifest([item]), value]
        self.client.pull_once()
        changed = dict(item, sha256='0' * 64)
        self.transport.responses = [self.manifest([changed])]
        self.assertRaises(sync.SyncError, self.client.pull_once)
        (self.path / 'inbox' / item['id'] / 'photo.jpg').write_bytes(b'changed locally')
        self.transport.responses = [self.manifest([item])]
        self.assertRaises(archive.ArchiveError, self.client.pull_once)

    def test_manifest_and_item_must_agree_before_any_import(self):
        item, value = remote_fixture()
        _, other_value = remote_fixture()
        self.transport.responses = [self.manifest([item]), other_value]
        self.assertRaises(sync.SyncError, self.client.pull_once)
        self.assertEqual(list((self.path / 'inbox').iterdir()), [])
        self.transport.responses = [self.manifest([dict(item, bytes=item['bytes'] + 1)]), value]
        self.assertRaises(sync.SyncError, self.client.pull_once)
        self.assertEqual(list((self.path / 'inbox').iterdir()), [])

    def test_duplicate_invalid_and_cyclic_manifest_pages_are_refused(self):
        item, value = remote_fixture()
        bad_pages = [self.manifest([item, item]), self.manifest([dict(item, id='../escape')]),
                     self.manifest([item] * 101), self.manifest([], 'x\n'),
                     {'items': [], 'cursor': None, 'unexpected': 'no'}]
        for page in bad_pages:
            self.transport.responses = [page]
            self.assertRaises(sync.SyncError, self.client.pull_once)
        self.transport.responses = [self.manifest([], 'same'), self.manifest([], 'same')]
        self.assertRaises(sync.SyncError, self.client.pull_once)
        self.assertEqual(list((self.path / 'inbox').iterdir()), [])

    def test_transport_denies_redirects_http_and_untrusted_origins_without_secret_errors(self):
        for endpoint in ('http://ecocleantisztito.hu', 'https://example.invalid',
                         'https://ecocleantisztito.hu.evil.invalid', 'https://user@ecocleantisztito.hu',
                         'https://ecocleantisztito.hu/?token=fixture', 'https://['):
            self.assertRaises(sync.SyncError, sync.SyncClient, self.library, endpoint, TOKEN)
        self.assertIsNone(sync.NoRedirect().redirect_request(None, None, 302, None, {}, 'https://example.invalid'))
        self.transport.responses = [Response({}, url='https://example.invalid', status=200)]
        self.assertRaises(sync.SyncError, self.client.pull_once)
        self.transport.responses = [urllib.error.HTTPError(ENDPOINT, 401, TOKEN, {}, io.BytesIO(TOKEN.encode()))]
        with self.assertRaises(sync.SyncError) as error:
            self.client.pull_once()
        self.assertIn('401', str(error.exception))
        self.assertNotIn(TOKEN, str(error.exception))
        self.assertTrue(all(request.full_url.startswith(ENDPOINT + '/') for request in self.transport.requests))

    def test_transport_bounds_bytes_and_rejects_non_json_or_duplicate_keys(self):
        oversized = Response({}, length=sync.MAX_MANIFEST_BYTES + 1)
        self.transport.responses = [oversized]
        self.assertRaises(sync.SyncError, self.client.pull_once)
        self.assertEqual(oversized.read_sizes, [])
        streaming = Response(b'x' * (sync.MAX_MANIFEST_BYTES + 10))
        self.transport.responses = [streaming]
        self.assertRaises(sync.SyncError, self.client.pull_once)
        self.assertEqual(streaming.read_sizes, [sync.MAX_MANIFEST_BYTES + 1])
        for bad in (Response({}, content_type='text/html'), Response(b'{"items":[],"items":[],"cursor":null}'), Response(b'NaN')):
            self.transport.responses = [bad]
            self.assertRaises(sync.SyncError, self.client.pull_once)

    def test_publishing_is_explicit_verified_bounded_and_requires_matching_ack(self):
        item, value = remote_fixture()
        self.library.import_remote(**value)
        self.transport.responses = [{'ok': True, 'count': 0}]
        self.assertEqual(self.client.publish_references(), 0)
        self.assertEqual(json.loads(self.transport.requests[-1].data), {'references': []})
        self.approve(item['id'])
        self.transport.responses = [{'ok': True, 'count': 1}]
        self.assertEqual(self.client.publish_references(), 1)
        request = self.transport.requests[-1]
        self.assertEqual(request.method, 'POST')
        self.assertEqual(request.full_url, ENDPOINT + '/api/material-admin/references')
        sent = json.loads(request.data)
        self.assertEqual(set(sent), {'references'})
        self.assertEqual(set(sent['references'][0]), {'id', 'label', 'brand', 'material', 'b64', 'media'})
        self.assertNotIn(TOKEN.encode(), request.data)
        self.transport.responses = [{'ok': True, 'count': 0}]
        self.assertRaises(sync.SyncError, self.client.publish_references)

    def test_private_config_validation_and_no_token_in_cli_output(self):
        config = self.path / 'sync-config.json'
        config.write_text(json.dumps({'endpoint': ENDPOINT, 'token': TOKEN}), encoding='utf-8')
        self.assertEqual(sync.load_config(config), {'endpoint': ENDPOINT, 'token': TOKEN})
        self.assertRaises(sync.SyncError, sync.load_config, archive.PROJECT / 'must-not-read-config.json')
        for data in ({'endpoint': ENDPOINT, 'token': TOKEN + '\n'}, {'endpoint': ENDPOINT, 'token': TOKEN, 'extra': 1}):
            config.write_text(json.dumps(data), encoding='utf-8')
            output = io.StringIO()
            with redirect_stdout(output):
                self.assertEqual(sync.main(['--root', str(self.path), '--once']), 1)
            self.assertNotIn(TOKEN, output.getvalue())

    def test_watch_retries_without_publishing_or_logging_payloads(self):
        fake = unittest.mock.Mock()
        fake.pull_once.side_effect = [sync.SyncError('hidden fixture ' + TOKEN), {'imported': 1, 'skipped': 2, 'pages': 1}]
        output = io.StringIO()
        with patch.object(sync, 'load_config', return_value={'endpoint': ENDPOINT, 'token': TOKEN}), \
                patch.object(sync, 'Archive', return_value=self.library), \
                patch.object(sync, 'SyncClient', return_value=fake), \
                patch.object(sync.time, 'sleep', side_effect=[None, KeyboardInterrupt]), redirect_stdout(output):
            self.assertEqual(sync.main(['--watch', '--interval', '300']), 0)
        self.assertEqual(fake.pull_once.call_count, 2)
        fake.publish_references.assert_not_called()
        self.assertNotIn(TOKEN, output.getvalue())
        self.assertIn('Új helyi képek: 1', output.getvalue())


if __name__ == '__main__':
    unittest.main()
