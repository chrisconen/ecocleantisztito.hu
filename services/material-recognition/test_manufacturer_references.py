"""Manufacturer catalogue provenance/import tests; temporary synthetic pixels only."""
import base64
from contextlib import redirect_stdout
import hashlib
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import uuid
from PIL import Image

import archive
import import_novalife_references as importer
import sync
from test_sync import FakeOpener, remote_fixture


def jpeg(color='#b9ad96'):
    stream = io.BytesIO()
    Image.new('RGB', (48, 48), color).save(stream, 'JPEG')
    return stream.getvalue()


class ManufacturerReferenceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.sources_dir = self.base / 'source-files'
        self.sources_dir.mkdir()
        self.sources = []
        for source, color in zip(importer.SOURCES, ['#b9ad96', '#f0d8b0', '#444444']):
            raw = jpeg(color)
            (self.sources_dir / ('ecoclean-novalife-' + source['name'] + '.jpg')).write_bytes(raw)
            self.sources.append({**source, 'sha256': hashlib.sha256(raw).hexdigest()})
        self.manifest_patch = patch.object(importer, 'SOURCES', tuple(self.sources))
        self.manifest_patch.start()
        self.addCleanup(self.manifest_patch.stop)
        self.prepared = importer.prepare(self.sources_dir)
        self.root = self.base / 'private-library'
        self.library = archive.Archive(self.root)

    def args(self, item=None):
        item = item or self.prepared[0]
        return dict(b64=item['b64'], record_id=item['id'], source_url=item['source_url'],
                    source_sha256=item['sha256'], material=importer.MATERIAL,
                    label=item['label'], owner_approved=True)

    def import_one(self, item=None):
        return self.library.import_manufacturer_reference(**self.args(item))

    def read(self, reference=False, item=None):
        item = item or self.prepared[0]
        directory = self.root / ('references/andante' if reference else 'inbox') / item['id']
        return json.loads((directory / 'record.json').read_text('utf-8'))

    def test_catalogue_provenance_never_fabricates_consent_or_physical_verification(self):
        self.assertTrue(self.import_one())
        source, ref = self.read(), self.read(True)
        for record in (source, ref):
            self.assertEqual(record['source_kind'], 'manufacturer_catalog')
            self.assertNotIn('consent', record)
            self.assertNotIn('provider', record)
            self.assertNotIn('model', record)
            self.assertEqual(record['provenance']['source_sha256'], self.sources[0]['sha256'])
            self.assertEqual(record['provenance']['source_url'], self.sources[0]['source_url'])
            self.assertIs(record['source_use_approval']['owner_approved_private_reference_use'], True)
            self.assertIs(record['source_use_approval']['customer_upload_consent'], False)
        self.assertEqual(ref['status'], 'catalog_reference')
        self.assertEqual(ref['verification']['method'], 'manufacturer_catalog_source_review')
        self.assertIs(ref['verification']['human_verified'], False)
        self.assertIs(ref['verification']['material_physically_verified'], False)
        self.assertEqual(self.library.references(), [])
        self.library.activate(self.prepared[0]['id'])
        dto = self.library.references()[0]
        self.assertEqual(set(dto), {'id', 'label', 'brand', 'material', 'b64', 'media'})
        self.assertIn('Gyártói katalógusfotó, tulajdonosi jóváhagyással; nem helyszíni ellenőrzés:', dto['label'])
        self.assertLessEqual(len(dto['label']), 160)
        self.assertEqual(dto['brand'], 'Andante')

    def test_explicit_owner_approval_hash_and_source_host_required(self):
        for extra in ({'owner_approved': False}, {'owner_approved': 1}, {'source_sha256': '0' * 64},
                      {'source_url': 'https://evil.example/sample.jpg'}, {'source_url': self.sources[0]['source_url'] + '?secret=x'},
                      {'source_url': 'http://andante.hu/wp-content/uploads/2022/05/sample.jpg'}, {'b64': 'invalid'}):
            with self.subTest(extra=extra):
                self.assertRaises(archive.ArchiveError, self.library.import_manufacturer_reference, **{**self.args(), **extra})
        self.assertEqual(list((self.root / 'inbox').iterdir()), [])

    def test_existing_customer_reference_requirements_are_not_relaxed(self):
        raw = base64.b64encode(jpeg()).decode('ascii')
        record_id = self.library.collect(raw, 'image/jpeg', 'fixture', 'fixture')
        self.assertRaises(archive.ArchiveError, self.library.promote, record_id, material='bouclé', brand='Andante', label='Synthetic customer photo', evidence='Not inspected', human_verified=False)
        path = self.root / 'inbox' / record_id / 'record.json'
        record = json.loads(path.read_text('utf-8'))
        record['source_kind'] = 'manufacturer_catalog'
        path.write_text(json.dumps(record), encoding='utf-8')
        self.assertRaises(archive.ArchiveError, self.library._record, record_id)

    def test_catalogue_verification_or_provenance_tampering_fails_closed(self):
        self.import_one()
        self.library.activate(self.prepared[0]['id'])
        path = self.root / 'references/andante' / self.prepared[0]['id'] / 'record.json'
        original = path.read_bytes()
        for mutate in (lambda r: r.update(consent=archive.Archive._consent()),
                       lambda r: r['verification'].update(human_verified=True),
                       lambda r: r['verification'].update(material_physically_verified=True),
                       lambda r: r['verification'].update(method='physical_inspection'),
                       lambda r: r['source_use_approval'].update(owner_approved_private_reference_use=False),
                       lambda r: r['provenance'].update(source_url='https://evil.example/x.jpg'),
                       lambda r: r.update(label='Személyesen ellenőrzött anyag')):
            record = json.loads(original)
            mutate(record)
            path.write_text(json.dumps(record), encoding='utf-8')
            self.assertRaises(archive.ArchiveError, self.library.references)
        path.write_bytes(original)
        self.assertEqual(len(self.library.references()), 1)

    def test_repeated_import_is_idempotent_and_rejected_sample_is_not_reactivated(self):
        self.import_one()
        self.library.activate(self.prepared[0]['id'])
        before = {str(path.relative_to(self.root)): path.read_bytes() for path in self.root.rglob('record.json')}
        self.assertFalse(self.import_one())
        self.assertEqual(before, {str(path.relative_to(self.root)): path.read_bytes() for path in self.root.rglob('record.json')})
        self.library.reject(self.prepared[0]['id'])
        self.assertEqual(self.library.references(), [])
        self.assertRaises(archive.ArchiveError, self.import_one)

    def test_pair_creation_failure_does_not_leave_a_source_or_active_reference(self):
        original = self.library._new_record
        calls = []
        def fail_second(*args, **kwargs):
            calls.append(args)
            if len(calls) == 2:
                raise OSError('injected offline failure')
            return original(*args, **kwargs)
        with patch.object(self.library, '_new_record', side_effect=fail_second):
            self.assertRaises(archive.ArchiveError, self.import_one)
        self.assertEqual(list((self.root / 'inbox').iterdir()), [])
        self.assertEqual(list((self.root / 'references/andante').iterdir()), [])
        self.assertEqual(self.library.references(), [])

    def existing_reference(self):
        record_id = self.library.collect(base64.b64encode(jpeg()).decode(), 'image/jpeg', 'fixture', 'fixture')
        self.library.promote(record_id, material='bouclé', brand='ismeretlen', label='Existing synthetic fixture', evidence='Offline synthetic fixture; no real material claim', human_verified=True, active=True)
        return record_id

    def test_batch_preserves_existing_selection_and_preflights_four_reference_limit(self):
        existing = self.existing_reference()
        report = importer.apply(self.prepared, self.library)
        self.assertFalse(report['published'])
        self.assertEqual([r['id'] for r in self.library.references()], [existing] + [r['id'] for r in self.prepared])
        self.assertEqual(importer.apply(self.prepared, self.library)['new_imports'], 0)
        self.assertRaises(archive.ArchiveError, self.library.activate_many, [str(uuid.uuid4())])
        self.assertEqual(len(self.library.references()), 4)

    def test_import_batch_refuses_capacity_conflict_before_writing_catalogue_photos(self):
        original_ids = [self.existing_reference(), self.existing_reference()]
        self.assertRaises(archive.ArchiveError, importer.apply, self.prepared, self.library)
        self.assertEqual([r['id'] for r in self.library.references()], original_ids)
        self.assertEqual(len(list((self.root / 'inbox').iterdir())), 2)

    def test_gallery_names_catalogue_source_without_claiming_personal_inspection(self):
        self.import_one()
        content = self.library.gallery().read_text('utf-8')
        self.assertIn('Gyártói katalógusminta (nem helyszíni anyagvizsgálat)', content)
        self.assertIn(self.sources[0]['source_url'], content)
        self.assertNotIn('Személyesen ellenőrizve:', content)
        self.assertIn('nem ügyfélfeltöltés és nem ügyfél-hozzájárulás', content)

    def test_readonly_plan_never_constructs_archive_reads_credentials_or_uses_network(self):
        destination = self.base / 'not-created'
        with patch.object(importer, 'Archive') as library, patch.object(importer, 'load_config') as config, patch.object(sync.urllib.request, 'build_opener') as network, redirect_stdout(io.StringIO()) as output:
            self.assertEqual(importer.main(['--source-dir', str(self.sources_dir), '--root', str(destination)]), 0)
        report = json.loads(output.getvalue())
        self.assertEqual((report['writes'], report['network_calls']), (0, 0))
        self.assertEqual(len(report['samples']), 3)
        library.assert_not_called(); config.assert_not_called(); network.assert_not_called()
        self.assertFalse(destination.exists())

    def test_prepare_rejects_changed_source_before_archive_or_publish(self):
        first = self.sources_dir / ('ecoclean-novalife-' + self.sources[0]['name'] + '.jpg')
        first.write_bytes(jpeg('#112233'))
        self.assertRaises(archive.ArchiveError, importer.prepare, self.sources_dir)

    def test_explicit_publish_sends_only_six_field_dtos_through_existing_authenticated_contract(self):
        opener = FakeOpener()
        opener.responses = [{'ok': True, 'count': 3}]
        config = {'endpoint': 'https://ecocleantisztito.hu', 'token': 'fixture-token-never-live-000000000000000'}
        with patch.object(importer, 'load_config', return_value=config), patch.object(sync.urllib.request, 'build_opener', return_value=opener):
            report = importer.apply(self.prepared, self.library, publish=True)
        self.assertTrue(report['published'])
        self.assertEqual(len(opener.requests), 1)
        request = opener.requests[0]
        self.assertEqual(request.full_url, 'https://ecocleantisztito.hu/api/material-admin/references')
        sent = json.loads(request.data)
        self.assertEqual(len(sent['references']), 3)
        for dto in sent['references']:
            self.assertEqual(set(dto), {'id', 'label', 'brand', 'material', 'b64', 'media'})
            self.assertIn('nem helyszíni ellenőrzés', dto['label'])
        self.assertNotIn('customer_upload_consent', json.dumps(sent))

    def test_publication_failure_leaves_explicit_local_activation_retryable(self):
        config = {'endpoint': 'https://ecocleantisztito.hu', 'token': 'fixture-token-never-live-000000000000000'}
        with patch.object(importer, 'load_config', return_value=config), patch.object(importer.SyncClient, 'publish_references', side_effect=sync.SyncError('offline fixture')):
            self.assertRaises(sync.SyncError, importer.apply, self.prepared, self.library, publish=True)
        self.assertEqual(len(self.library.references()), 3)
        self.assertEqual(importer.apply(self.prepared, self.library)['new_imports'], 0)

    def test_customer_sync_coexists_with_catalogue_and_rejects_uuid_collision_safely(self):
        self.import_one()
        self.library.activate(self.prepared[0]['id'])
        item, record = remote_fixture()
        opener = FakeOpener()
        opener.responses = [{'items': [item], 'cursor': None}, record]
        with patch.object(sync.urllib.request, 'build_opener', return_value=opener):
            client = sync.SyncClient(self.library, 'https://ecocleantisztito.hu', 'fixture-token-never-live-000000000000000')
            self.assertEqual(client.pull_once()['imported'], 1)
            collision, _ = remote_fixture(record_id=self.prepared[0]['id'])
            opener.responses = [{'items': [collision], 'cursor': None}]
            self.assertRaises(sync.SyncError, client.pull_once)
        self.assertEqual(self.library.references()[0]['id'], self.prepared[0]['id'])


if __name__ == '__main__':
    unittest.main()
