"""Offline archive tests; generated fixtures and temporary directories only."""
import base64
from concurrent.futures import ThreadPoolExecutor
from contextlib import redirect_stdout
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
import uuid

from PIL import Image, PngImagePlugin

import archive


def fixture(format='PNG', size=(32, 24), metadata=False):
    photo = Image.new('RGB', size, '#b9ad96')
    out = io.BytesIO()
    extras = {}
    if metadata and format == 'PNG':
        info = PngImagePlugin.PngInfo()
        info.add_text('customer_note', 'PRIVATE FIXTURE ONLY')
        extras['pnginfo'] = info
    if metadata and format == 'JPEG':
        exif = Image.Exif()
        exif[0x010E] = 'PRIVATE FIXTURE ONLY'
        exif[0x0112] = 6
        extras['exif'] = exif
        extras['icc_profile'] = b'PRIVATE FIXTURE ONLY'
    photo.save(out, format, **extras)
    return base64.b64encode(out.getvalue()).decode('ascii'), {
        'PNG': 'image/png', 'JPEG': 'image/jpeg', 'WEBP': 'image/webp', 'GIF': 'image/gif'}[format]


class ArchiveTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / 'private-library'
        self.library = archive.Archive(self.path)

    def collect(self, **kw):
        return self.library.collect(*fixture(**kw), 'google', 'gemini-test-model')

    def read_record(self, record_id, reference=False):
        folder = 'references/andante' if reference else 'inbox'
        return json.loads((self.path / folder / record_id / 'record.json').read_text(encoding='utf-8'))

    def approve(self, record_id, **kw):
        args = dict(material='chenille', brand='Andante', label='Owner inspected sample',
                    evidence='Manufacturer label and specification checked offline', human_verified=True)
        args.update(kw)
        self.library.promote(record_id, **args)

    def test_formats_strip_metadata_and_store_minimal_pending_record(self):
        for format in ('PNG', 'JPEG', 'WEBP', 'GIF'):
            with self.subTest(format=format):
                record_id = self.collect(format=format, metadata=True)
                self.assertEqual(str(uuid.UUID(record_id)), record_id)
                directory = self.path / 'inbox' / record_id
                self.assertEqual({p.name for p in directory.iterdir()}, {'photo.jpg', 'record.json'})
                data = (directory / 'photo.jpg').read_bytes()
                self.assertNotIn(b'PRIVATE FIXTURE ONLY', data)
                with Image.open(io.BytesIO(data)) as photo:
                    self.assertEqual(photo.format, 'JPEG')
                    self.assertEqual(photo.mode, 'RGB')
                    self.assertFalse(photo.getexif())
                    self.assertFalse(set(photo.info) & {'exif', 'icc_profile', 'comment'})
                    self.assertEqual(photo.size, (24, 32) if format == 'JPEG' else (32, 24))
                record = self.read_record(record_id)
                self.assertEqual(record['status'], 'pending')
                self.assertEqual(record['sha256'], hashlib.sha256(data).hexdigest())
                self.assertTrue(record['received_utc'].endswith('Z'))
                self.assertTrue(record['consent']['granted'])
                self.assertEqual(record['consent']['schema_version'], 1)
                self.assertEqual(set(record), {'schema_version', 'id', 'received_utc', 'sha256',
                                              'media', 'provider', 'model', 'consent', 'status'})
        self.assertEqual(self.library.references(), [])

    def test_resize_and_reject_malformed_animated_or_mismatched_input(self):
        record_id = self.collect(size=(3000, 1000))
        with Image.open(self.path / 'inbox' / record_id / 'photo.jpg') as photo:
            self.assertEqual(photo.size, (2048, 683))
        valid, media = fixture()
        bad = [('%%%', media), (valid, 'image/jpeg'), (valid, ['image/png']),
               ('data:' + media + ';base64,' + valid, media), ('', media),
               (base64.b64encode(b'not a photo').decode(), media), fixture(size=(4, 4))]
        out = io.BytesIO()
        Image.new('RGB', (16, 16), 'red').save(out, 'GIF', save_all=True,
                                            append_images=[Image.new('RGB', (16, 16), 'blue')])
        bad.append((base64.b64encode(out.getvalue()).decode(), 'image/gif'))
        for b64, declared in bad:
            with self.subTest(declared=declared):
                self.assertRaises(archive.ArchiveError, self.library.collect, b64, declared, 'google', 'test')
        self.assertRaises(archive.ArchiveError, self.library.collect, valid, media, 'key\nsecret', 'test')
        self.assertEqual(len(list((self.path / 'inbox').iterdir())), 1)

    def test_annotation_is_separate_bounded_whitelisted_and_never_verified(self):
        record_id = self.collect()
        record_before = (self.path / 'inbox' / record_id / 'record.json').read_bytes()
        self.library.annotate(record_id, {'anyag': '<script>leather</script>', 'indoklas': 'x' * 9000,
                                         'biztonsag': 500, 'kockazatok': ['x' * 999] * 20,
                                         'note': 'private note', 'ip': '127.0.0.1', 'api_key': 'secret',
                                         'verified': True})
        path = self.path / 'inbox' / record_id / 'annotation.json'
        raw = path.read_bytes()
        annotation = json.loads(raw)
        self.assertEqual(annotation['status'], 'unverified_model_prediction')
        self.assertIs(annotation['human_verified'], False)
        self.assertNotIn(b'private note', raw)
        self.assertNotIn(b'secret', raw)
        self.assertNotIn('ip', annotation['result'])
        self.assertEqual(annotation['result']['biztonsag'], 100)
        self.assertEqual(len(annotation['result']['indoklas']), 1000)
        self.assertEqual(len(annotation['result']['kockazatok']), 8)
        self.assertEqual(len(annotation['result']['kockazatok'][0]), 240)
        self.assertEqual((self.path / 'inbox' / record_id / 'record.json').read_bytes(), record_before)
        self.assertEqual(self.library.references(), [])
        self.library.annotate(record_id, {'biztonsag': float('nan'), 'anyag': {'nested': 'bad'}})
        self.assertNotIn('biztonsag', json.loads(path.read_bytes())['result'])

    def test_human_verification_and_explicit_activation_are_required(self):
        record_id = self.collect()
        self.assertRaises(archive.ArchiveError, self.approve, record_id, human_verified=False)
        self.assertRaises(archive.ArchiveError, self.approve, record_id, evidence=' ')
        self.assertRaises(archive.ArchiveError, self.approve, record_id, brand='../Andante')
        self.assertRaises(archive.ArchiveError, self.library.activate, record_id)
        self.approve(record_id)
        self.assertEqual(self.library.references(), [])
        self.assertEqual(self.read_record(record_id)['status'], 'approved')
        reference = self.read_record(record_id, True)
        self.assertTrue(reference['verification']['human_verified'])
        self.library.activate(record_id)
        self.library.activate(record_id)
        refs = self.library.references()
        self.assertEqual(len(refs), 1)
        self.assertEqual(set(refs[0]), {'id', 'label', 'brand', 'material', 'b64', 'media'})
        self.assertEqual(refs[0]['id'], record_id)
        self.assertEqual(refs[0]['media'], 'image/jpeg')
        self.assertTrue(base64.b64decode(refs[0]['b64']).startswith(b'\xff\xd8'))
        self.library.deactivate(record_id)
        self.assertEqual(self.library.references(), [])

    def test_other_and_unknown_brands_supported_but_duplicate_ids_refused(self):
        for brand in ('IKEA', 'ismeretlen'):
            record_id = self.collect()
            self.approve(record_id, brand=brand, active=True)
            self.assertTrue((self.path / 'references' / 'other' / record_id / 'photo.jpg').exists())
            self.assertEqual(self.library.references()[-1]['brand'], brand)
        duplicate = self.path / 'references' / 'andante' / record_id
        duplicate.mkdir()
        self.assertRaises(archive.ArchiveError, self.library.references)

    def test_limit_four_deterministic_persistent_selection(self):
        ids = [self.collect() for _ in range(5)]
        for record_id in ids:
            self.approve(record_id)
        order = ids[1:4] + ids[:1]
        for record_id in order:
            self.library.activate(record_id)
        self.assertRaises(archive.ArchiveError, self.library.activate, ids[4])
        fresh = archive.Archive(self.path)
        self.assertEqual([r['id'] for r in fresh.references()], order)
        self.library.deactivate(ids[2])
        self.library.activate(ids[4])
        self.assertEqual([r['id'] for r in fresh.references()], [r for r in order if r != ids[2]] + [ids[4]])

    def test_reference_copy_and_aggregate_provider_budget(self):
        record_id = self.collect(size=(2500, 1800))
        self.approve(record_id)
        source = self.read_record(record_id)
        reference = self.read_record(record_id, True)
        self.assertEqual(reference['source_sha256'], source['sha256'])
        with Image.open(self.path / 'references' / 'andante' / record_id / 'photo.jpg') as photo:
            self.assertEqual(max(photo.size), 1200)
        with patch.object(archive, 'MAX_REFERENCE_BASE64_BYTES', 1):
            self.assertRaises(archive.ArchiveError, self.library.activate, record_id)
        self.assertEqual(self.library.references(), [])
        self.library.activate(record_id)
        self.assertLessEqual(len(self.library.references()[0]['b64']), 4 * ((archive.MAX_REFERENCE_BYTES + 2) // 3))
        with patch.object(archive, 'MAX_REFERENCE_BASE64_BYTES', 1):
            self.assertRaises(archive.ArchiveError, self.library.references)

    def test_references_fail_closed_on_tampered_photo_or_verification(self):
        record_id = self.collect()
        self.approve(record_id, active=True)
        path = self.path / 'references' / 'andante' / record_id
        original = (path / 'photo.jpg').read_bytes()
        (path / 'photo.jpg').write_bytes(original + b'changed')
        self.assertRaises(archive.ArchiveError, self.library.references)
        (path / 'photo.jpg').write_bytes(original)
        record = self.read_record(record_id, True)
        record['verification']['human_verified'] = False
        (path / 'record.json').write_text(json.dumps(record), encoding='utf-8')
        self.assertRaises(archive.ArchiveError, self.library.references)

    def test_selection_corruption_and_traversal_are_rejected(self):
        for record_id in ('../x', 'C:/private', '00000000-0000-0000-0000-000000000000', str(uuid.uuid4()).upper()):
            for method in (self.library.activate, self.library.deactivate, self.library.delete, self.library.reject):
                self.assertRaises(archive.ArchiveError, method, record_id)
        path = self.path / 'selection.json'
        for value in ({'schema_version': 1, 'active_ids': ['../x']},
                      {'schema_version': 1, 'active_ids': [str(uuid.uuid4())] * 5}, []):
            path.write_text(json.dumps(value), encoding='utf-8')
            self.assertRaises(archive.ArchiveError, self.library.references)
        path.write_text('{"schema_version":1,"active_ids":[],"active_ids":[]}', encoding='utf-8')
        self.assertRaises(archive.ArchiveError, self.library.references)
        self.assertRaises(archive.ArchiveError, archive.Archive, archive.PROJECT / '.private' / 'test-never-created')

    def test_quota_failure_leaves_no_partial_record_or_annotation(self):
        small = archive.Archive(Path(self.temp.name) / 'tiny', max_bytes=1)
        self.assertRaises(archive.ArchiveError, small.collect, *fixture(), 'google', 'test')
        self.assertEqual(list((small.root / 'inbox').iterdir()), [])
        record_id = self.collect()
        self.library.max_bytes = self.library._usage()
        self.assertRaises(archive.ArchiveError, self.library.annotate, record_id, {'anyag': 'textile'})
        self.assertFalse((self.path / 'inbox' / record_id / 'annotation.json').exists())
        self.assertEqual(list(self.path.rglob('.tmp-*')), [])
        self.assertEqual(list(self.path.rglob('.pending-*')), [])

    def test_atomic_write_failure_preserves_previous_annotation(self):
        record_id = self.collect()
        self.library.annotate(record_id, {'anyag': 'first'})
        path = self.path / 'inbox' / record_id / 'annotation.json'
        previous = path.read_bytes()
        with patch.object(archive.os, 'replace', side_effect=OSError('offline injected failure')):
            self.assertRaises(archive.ArchiveError, self.library.annotate, record_id, {'anyag': 'new'})
        self.assertEqual(path.read_bytes(), previous)
        self.assertEqual(list(self.path.rglob('.tmp-*')), [])

    def test_concurrent_instances_serialize_collection(self):
        libraries = [archive.Archive(self.path) for _ in range(2)]
        def collect(index):
            return libraries[index % 2].collect(*fixture(), 'google', 'test')
        with ThreadPoolExecutor(max_workers=6) as pool:
            ids = list(pool.map(collect, range(12)))
        self.assertEqual(len(set(ids)), 12)
        self.assertEqual(len(list((self.path / 'inbox').iterdir())), 12)
        for record_id in ids:
            self.assertEqual(self.read_record(record_id)['status'], 'pending')

    def test_other_process_fails_closed_while_archive_is_locked(self):
        script = ('import sys; from pathlib import Path; from archive import Archive, ArchiveError\n'
                  'try:\n Archive(Path(sys.argv[1]))\n'
                  'except ArchiveError:\n sys.exit(0)\n'
                  'sys.exit(7)\n')
        with self.library._locked():
            child = subprocess.run([sys.executable, '-c', script, str(self.path)],
                                   cwd=Path(archive.__file__).parent, capture_output=True, timeout=10)
        self.assertEqual(child.returncode, 0, child.stderr.decode(errors='replace'))

    def test_concurrent_collection_respects_shared_quota(self):
        self.collect()
        one_record = self.library._usage()
        self.library.max_bytes = one_record + 30
        def attempt(_):
            try:
                self.collect()
                return True
            except archive.ArchiveError:
                return False
        with ThreadPoolExecutor(max_workers=4) as pool:
            successes = list(pool.map(attempt, range(8)))
        self.assertFalse(any(successes))
        self.assertEqual(len(list((self.path / 'inbox').iterdir())), 1)
        self.assertLessEqual(self.library._usage(), self.library.max_bytes)

    def test_reject_removes_active_reference_and_delete_removes_both_copies(self):
        record_id = self.collect()
        self.approve(record_id, active=True)
        self.library.reject(record_id)
        self.assertEqual(self.library.references(), [])
        self.assertEqual(self.read_record(record_id)['status'], 'rejected')
        self.assertFalse((self.path / 'references' / 'andante' / record_id).exists())
        self.assertRaises(archive.ArchiveError, self.approve, record_id)
        self.library.delete(record_id)
        self.assertFalse((self.path / 'inbox' / record_id).exists())
        self.library.delete(record_id)  # Idempotent when already removed.

    def test_symlinks_and_hardlinks_are_rejected_without_touching_target(self):
        outside = Path(self.temp.name) / 'outside.jpg'
        outside.write_bytes(b'outside private fixture')
        record_id = self.collect()
        photo = self.path / 'inbox' / record_id / 'photo.jpg'
        photo.unlink()
        try:
            os.link(outside, photo)
        except OSError:
            self.skipTest('Filesystem does not allow hardlinks.')
        self.assertRaises(archive.ArchiveError, self.library.delete, record_id)
        self.assertRaises(archive.ArchiveError, self.library.gallery)
        self.assertEqual(outside.read_bytes(), b'outside private fixture')
        photo.unlink()
        try:
            photo.symlink_to(outside)
        except OSError:
            self.skipTest('Windows symlink creation requires developer mode or privilege.')
        self.assertRaises(archive.ArchiveError, self.library.gallery)
        self.assertRaises(archive.ArchiveError, self.library.delete, record_id)
        self.assertEqual(outside.read_bytes(), b'outside private fixture')

    def test_gallery_is_local_inert_and_escapes_model_and_owner_text(self):
        empty = self.library.gallery()
        self.assertIn('Aktív referenciák: 0/4', empty.read_text(encoding='utf-8'))
        record_id = self.collect()
        self.library.annotate(record_id, {'anyag': '<script>alert(1)</script>'})
        self.approve(record_id, label='<img src=x onerror=alert(2)>', evidence='<b>Inspected label</b>')
        self.library.activate(record_id)
        text = self.library.gallery().read_text(encoding='utf-8')
        self.assertIn('NEM ELLENŐRZÖTT AI-becslés', text)
        self.assertNotIn('<script>', text)
        self.assertIn('&lt;script&gt;', text)
        self.assertIn('&lt;img src=x onerror=alert(2)&gt;', text)
        self.assertIn('inbox/' + record_id + '/photo.jpg', text)
        self.assertNotIn('https://', text)
        self.assertNotIn('<form', text)
        self.assertIn('Aktív referenciák: 1/4', text)
        self.assertIn('Anyag: chenille', text)

    def test_cli_approval_requires_human_flag_and_refreshes_local_gallery(self):
        record_id = self.collect()
        args = ['--root', str(self.path), 'approve', '--id', record_id, '--material', 'chenille',
                '--brand', 'Andante', '--label', 'Test sample', '--evidence', 'Label verified']
        with patch('sys.stderr', new=io.StringIO()):
            self.assertRaises(SystemExit, archive.main, args)
        with redirect_stdout(io.StringIO()):
            self.assertEqual(archive.main(args + ['--human-verified']), 0)
        self.assertEqual(self.library.references(), [])
        with redirect_stdout(io.StringIO()):
            self.assertEqual(archive.main(['--root', str(self.path), 'activate', '--id', record_id]), 0)
        self.assertEqual(len(self.library.references()), 1)
        self.assertTrue((self.path / 'index.html').exists())


if __name__ == '__main__':
    unittest.main()
