#!/usr/bin/env python3
"""Private, local photo archive and explicit human reference curation.

The caller MUST obtain the current photo-storage/reference-sharing consent before
calling collect(). No network calls are made here. The default library is outside
the public release and must stay excluded from Git and ALL static HTTP servers.
This is an owner-controlled directory, not an encrypted vault: use a private OS
account/ACL and do not allow untrusted local users to modify it.

Owner workflow (run from the project directory; --root overrides the location):
  python services/material-recognition/archive.py gallery
  # Open the printed index.html locally. Verify the actual material/brand using
  # a manufacturer label/document or a professional inspection, not AI output.
  python services/material-recognition/archive.py approve --id UUID \
      --material "chenille" --brand Andante --label "Andante sofa sample" \
      --evidence "Manufacturer label and purchase specification checked" \
      --human-verified
  python services/material-recognition/archive.py activate --id UUID
  python services/material-recognition/archive.py deactivate --id UUID
  python services/material-recognition/archive.py reject --id UUID
  python services/material-recognition/archive.py delete --id UUID

approve copies the clean image into references/andante or references/other,
grouped by its human-verified brand, and is INACTIVE by default. Unknown brands
use "ismeretlen". Only explicitly activated, revalidated references (at most four) are
returned to the provider integration. reject retains the inbox photo, removes
its reference, and disables it; delete permanently removes both copies.
gallery regenerates the local HTML; collection/annotation never publish it.
All successful owner mutations refresh it. No API key, IP, or customer note is
accepted or stored. Model annotations are restricted, bounded and UNVERIFIED.

Writes use same-filesystem atomic replacement and a thread + process lock.
The byte cap includes existing files and temporary-write overhead. Interrupted
temporary files consume quota and are never automatically promoted or selected.
"""
from __future__ import annotations

import argparse
import base64
import binascii
from contextlib import contextmanager
from datetime import datetime, timezone
import hashlib
import html
import io
import json
import math
import os
from pathlib import Path
import re
import stat
import threading
import uuid
import warnings

from PIL import Image, ImageOps, UnidentifiedImageError

PROJECT = Path(__file__).resolve().parents[2]
DEFAULT_ROOT = PROJECT.parent / 'anyag-referenciak'
DEFAULT_MAX_BYTES = 2 * 1024 ** 3
MAX_IMAGE_BYTES = 4 * 1024 ** 2
MAX_PIXELS = 16_000_000
MAX_REFERENCES = 4
MAX_REFERENCE_BYTES = 1024 ** 2
MAX_REFERENCE_BASE64_BYTES = 6 * 1024 ** 2
MAX_JSON_BYTES = 24 * 1024
MAX_ENTRIES = 100_000
MAX_GALLERY_RECORDS = 500
SCHEMA_VERSION = 1
CONSENT_VERSION = 1
MEDIA = {'image/jpeg': 'JPEG', 'image/png': 'PNG', 'image/webp': 'WEBP', 'image/gif': 'GIF'}
TEXT_FIELDS = ('kep_tipus', 'anyag', 'anyag_alt', 'indoklas', 'tisztitasi_kod',
               'modszer', 'ellenorzes', 'kerdes_ugyfelnek', 'cimke_szoveg')
LIST_FIELDS = ('kerulendo', 'kockazatok')
_LOCK = threading.RLock()  # Shared even by multiple Archive instances in one process.


class ArchiveError(ValueError):
    """The archive operation was refused; no user content is included in errors."""


def _utc():
    return datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')


def _id(value):
    if not isinstance(value, str):
        raise ArchiveError('Expected a canonical UUID record ID.')
    try:
        parsed = uuid.UUID(value)
    except ValueError:
        raise ArchiveError('Expected a canonical UUID record ID.') from None
    if parsed.version != 4 or str(parsed) != value:
        raise ArchiveError('Expected a canonical UUID4 record ID.')
    return value


def _text(value, limit, required=False):
    if not isinstance(value, str):
        if required:
            raise ArchiveError('A nonempty text label or evidence is required.')
        return ''
    if required and len(value) > limit:
        raise ArchiveError('A label or evidence is too long.')
    value = value[:limit]
    # Remove controls, surrogates and bidi overrides from owner/model metadata.
    clean = ''.join(c for c in value if c in '\n\t' or
                    (32 <= ord(c) < 0xD800 or 0xE000 <= ord(c) <= 0x10FFFF)
                    and ord(c) != 127 and not 0x80 <= ord(c) <= 0x9F
                    and ord(c) not in range(0x202A, 0x202F)
                    and ord(c) not in range(0x2066, 0x206A)).strip()
    if required and (not clean or len(clean) > limit):
        raise ArchiveError('A label or evidence is empty or too long.')
    return clean[:limit]


def _identifier(value):
    if not isinstance(value, str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}', value):
        raise ArchiveError('Invalid provider or model identifier.')
    return value


def _json(value):
    try:
        data = (json.dumps(value, ensure_ascii=False, allow_nan=False, indent=2) + '\n').encode('utf-8')
    except (ValueError, TypeError, UnicodeError, RecursionError):
        raise ArchiveError('Invalid archive metadata encoding.') from None
    if len(data) > MAX_JSON_BYTES:
        raise ArchiveError('Archive metadata exceeds the size limit.')
    return data


def _clean_photo(b64, media):
    if not isinstance(b64, str) or not isinstance(media, str) or media not in MEDIA or not b64 or len(b64) > 4 * ((MAX_IMAGE_BYTES + 2) // 3):
        raise ArchiveError('Invalid or oversized image.')
    try:
        raw = base64.b64decode(b64, validate=True)
        if len(raw) > MAX_IMAGE_BYTES or base64.b64encode(raw).decode('ascii') != b64:
            raise ArchiveError('Invalid or oversized image.')
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(raw)) as photo:
                if photo.format != MEDIA[media] or getattr(photo, 'n_frames', 1) != 1:
                    raise ArchiveError('The declared format must match a single still image.')
                width, height = photo.size
                if min(width, height) < 8 or max(width, height) > 8000 or width * height > MAX_PIXELS:
                    raise ArchiveError('Image dimensions exceed archive limits.')
                photo.verify()
            with Image.open(io.BytesIO(raw)) as photo:
                photo.load()
                oriented = ImageOps.exif_transpose(photo)
                oriented.thumbnail((2048, 2048), Image.Resampling.LANCZOS)
                # A new pixel-only image prevents EXIF/GPS/ICC/comment inheritance.
                clean = Image.new('RGB', oriented.size, 'white')
                rgba = oriented.convert('RGBA')
                clean.paste(rgba, mask=rgba.getchannel('A'))
                output = io.BytesIO()
                clean.save(output, 'JPEG', quality=90, optimize=True)
                data = output.getvalue()
                if len(data) > MAX_IMAGE_BYTES:
                    raise ArchiveError('Encoded image exceeds archive limits.')
                return data
    except ArchiveError:
        raise
    except (ValueError, TypeError, binascii.Error, OSError, SyntaxError, UnidentifiedImageError,
            Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise ArchiveError('Invalid or unreadable image.') from None


def _reference_photo(data):
    """Bound each outbound example independently; archive originals stay intact."""
    with Image.open(io.BytesIO(data)) as source:
        source.load()
        source.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
        clean = Image.new('RGB', source.size)
        clean.paste(source.convert('RGB'))
        for quality in (85, 75, 65, 50):
            out = io.BytesIO()
            clean.save(out, 'JPEG', quality=quality, optimize=True)
            encoded = out.getvalue()
            if len(encoded) <= MAX_REFERENCE_BYTES:
                return encoded
    raise ArchiveError('Reference image cannot fit the provider size budget.')


class Archive:
    def __init__(self, root: Path, max_bytes=DEFAULT_MAX_BYTES):
        if type(max_bytes) is not int or max_bytes <= 0:
            raise ArchiveError('max_bytes must be a positive integer.')
        path = Path(root)
        if '..' in path.parts:
            raise ArchiveError('Archive paths must not contain parent traversal.')
        self.root = path.absolute()
        if self.root == PROJECT or PROJECT in self.root.parents:
            raise ArchiveError('The private archive must be outside the project web roots.')
        self.max_bytes = max_bytes
        with _LOCK:
            self._check(self.root, missing=True)
            self.root.mkdir(parents=True, exist_ok=True, mode=0o700)
            self._check(self.root)
        with self._locked():
            for directory in ('inbox', 'references', 'references/andante', 'references/other'):
                path = self.root / directory
                self._check(path, missing=True)
                path.mkdir(mode=0o700, exist_ok=True)
                self._check(path)
            self._usage()

    def _check(self, path, missing=False):
        """Reject symlinks, junctions and reparse points, including root ancestors."""
        path = Path(path)
        if path != self.root and self.root not in path.parents:
            raise ArchiveError('Path is outside the archive.')
        for part in reversed((path, *path.parents)):
            try:
                info = part.lstat()
            except FileNotFoundError:
                if missing:
                    continue
                raise ArchiveError('Archive path does not exist.') from None
            if stat.S_ISLNK(info.st_mode) or getattr(info, 'st_file_attributes', 0) & 0x400:
                raise ArchiveError('Linked archive paths are forbidden.')
            if not (stat.S_ISDIR(info.st_mode) or stat.S_ISREG(info.st_mode)):
                raise ArchiveError('Unsupported archive file type.')
            if stat.S_ISREG(info.st_mode) and info.st_nlink != 1:
                raise ArchiveError('Hard-linked archive files are forbidden.')

    @contextmanager
    def _locked(self):
        with _LOCK:
            self._check(self.root)
            path = self.root / '.archive.lock'
            self._check(path, missing=True)
            fd = None
            acquired = False
            try:
                fd = os.open(path, os.O_RDWR | os.O_CREAT | getattr(os, 'O_NOFOLLOW', 0), 0o600)
                self._check(path)
                if os.fstat(fd).st_size == 0:
                    os.write(fd, b'0')
                if os.name == 'nt':
                    import msvcrt
                    os.lseek(fd, 0, os.SEEK_SET)
                    msvcrt.locking(fd, msvcrt.LK_NBLCK, 1)
                else:
                    import fcntl
                    fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
                acquired = True
                yield
            except OSError:
                raise ArchiveError('Archive is busy or unavailable.') from None
            finally:
                if fd is not None:
                    if acquired:
                        if os.name == 'nt':
                            import msvcrt
                            os.lseek(fd, 0, os.SEEK_SET)
                            msvcrt.locking(fd, msvcrt.LK_UNLCK, 1)
                        else:
                            import fcntl
                            fcntl.flock(fd, fcntl.LOCK_UN)
                    os.close(fd)

    def _usage(self):
        total = count = 0
        stack = [self.root]
        while stack:
            directory = stack.pop()
            self._check(directory)
            with os.scandir(directory) as entries:
                for entry in entries:
                    count += 1
                    if count > MAX_ENTRIES:
                        raise ArchiveError('Archive file count exceeds the limit.')
                    path = Path(entry.path)
                    self._check(path)
                    info = path.lstat()
                    if stat.S_ISDIR(info.st_mode):
                        stack.append(path)
                    else:
                        total += info.st_size
        return total

    def _reserve(self, size):
        if self._usage() + size > self.max_bytes:
            raise ArchiveError('Archive storage quota exceeded.')

    def _write(self, path, data):
        self._check(path, missing=True)
        self._reserve(len(data))  # Include both old and temporary bytes at peak.
        temp = path.parent / ('.tmp-' + str(uuid.uuid4()))
        try:
            with open(temp, 'xb') as handle:
                os.chmod(temp, 0o600)
                handle.write(data)
                handle.flush()
                os.fsync(handle.fileno())
            self._check(path, missing=True)
            os.replace(temp, path)
        finally:
            if temp.exists():
                self._check(temp)
                temp.unlink()

    def _read(self, path, limit):
        self._check(path)
        before = path.lstat()
        if not stat.S_ISREG(before.st_mode) or before.st_size > limit:
            raise ArchiveError('Archive file is invalid or oversized.')
        fd = os.open(path, os.O_RDONLY | getattr(os, 'O_NOFOLLOW', 0))
        with os.fdopen(fd, 'rb') as handle:
            opened = os.fstat(handle.fileno())
            if (opened.st_dev, opened.st_ino) != (before.st_dev, before.st_ino):
                raise ArchiveError('Archive file changed during access.')
            data = handle.read(limit + 1)
        if len(data) > limit:
            raise ArchiveError('Archive file is oversized.')
        return data

    def _read_json(self, path):
        def pairs(items):
            result = {}
            for key, value in items:
                if key in result:
                    raise ValueError('duplicate key')
                result[key] = value
            return result
        try:
            return json.loads(self._read(path, MAX_JSON_BYTES), object_pairs_hook=pairs,
                              parse_constant=lambda _: (_ for _ in ()).throw(ValueError()))
        except (ValueError, UnicodeError, RecursionError):
            raise ArchiveError('Invalid archive metadata.') from None

    def _directory(self, record_id, reference=False, brand=None):
        record_id = _id(record_id)
        if not reference:
            return self.root / 'inbox' / record_id
        paths = [self.root / 'references' / group / record_id for group in ('andante', 'other')]
        present = []
        for path in paths:
            self._check(path, missing=True)
            if path.exists():
                present.append(path)
        if len(present) > 1:
            raise ArchiveError('Duplicate reference ID across brand collections.')
        if brand is not None:
            target = paths[0 if brand == 'Andante' else 1]
            if present and present[0] != target:
                raise ArchiveError('Reference ID already belongs to a different collection.')
            return target
        return present[0] if present else paths[0]

    def _record(self, record_id, reference=False):
        directory = self._directory(record_id, reference)
        record = self._read_json(directory / 'record.json')
        if (not isinstance(record, dict) or record.get('id') != record_id or
                record.get('schema_version') != SCHEMA_VERSION or record.get('media') != 'image/jpeg' or
                not isinstance(record.get('sha256'), str) or
                not re.fullmatch('[0-9a-f]{64}', record['sha256']) or
                record.get('consent') != self._consent()):
            raise ArchiveError('Invalid archive record.')
        if reference:
            brand = _text(record.get('brand'), 160, True)
            expected_group = 'andante' if brand == 'Andante' else 'other'
            if (record.get('status') != 'verified_reference' or brand != record['brand'] or
                    '/' in brand or '\\' in brand or directory.parent.name != expected_group):
                raise ArchiveError('Reference is not human verified.')
            verification = record.get('verification')
            if (not isinstance(verification, dict) or verification.get('human_verified') is not True or
                    not _text(verification.get('evidence'), 2000) or not verification.get('verified_utc')):
                raise ArchiveError('Reference has no human verification evidence.')
            for key in ('material', 'label'):
                if _text(record.get(key), 160, required=True) != record[key]:
                    raise ArchiveError('Reference labels are invalid.')
        elif record.get('status') not in ('pending', 'approved', 'rejected'):
            raise ArchiveError('Invalid inbox status.')
        return record

    @staticmethod
    def _consent():
        return {'schema_version': CONSENT_VERSION, 'granted': True,
                'purposes': ['local_photo_archive', 'human_reference_curation',
                             'approved_reference_sharing_with_model_provider']}

    def _photo(self, record_id, record, reference=False):
        data = self._read(self._directory(record_id, reference) / 'photo.jpg', MAX_IMAGE_BYTES)
        if hashlib.sha256(data).hexdigest() != record['sha256']:
            raise ArchiveError('Archived image integrity check failed.')
        try:
            with Image.open(io.BytesIO(data)) as picture:
                if (picture.format != 'JPEG' or min(picture.size) < 8 or max(picture.size) > 2048 or
                        picture.getexif() or any(key in picture.info for key in ('exif', 'icc_profile', 'comment'))):
                    raise ArchiveError('Reference image is not a sanitized JPEG.')
                picture.load()
                picture.verify()
        except (OSError, ValueError, SyntaxError, Image.DecompressionBombError):
            raise ArchiveError('Archived image validation failed.') from None
        return data

    def _selected(self):
        path = self.root / 'selection.json'
        self._check(path, missing=True)
        if not path.exists():
            return []
        value = self._read_json(path)
        if (not isinstance(value, dict) or value.get('schema_version') != SCHEMA_VERSION or
                not isinstance(value.get('active_ids'), list) or len(value['active_ids']) > MAX_REFERENCES):
            raise ArchiveError('Invalid reference selection.')
        ids = [_id(item) for item in value['active_ids']]
        if len(ids) != len(set(ids)):
            raise ArchiveError('Duplicate active reference IDs.')
        return ids

    def _select(self, ids):
        self._write(self.root / 'selection.json', _json({'schema_version': SCHEMA_VERSION, 'active_ids': ids}))

    def _new_record(self, directory, record, photo, annotation=None):
        encoded = _json(record)
        files = [('photo.jpg', photo), ('record.json', encoded)]
        if annotation is not None:
            files.append(('annotation.json', _json(annotation)))
        self._check(directory, missing=True)
        if directory.exists():
            raise ArchiveError('A record already exists at this ID.')
        self._reserve(sum(len(data) for _, data in files))
        temp = directory.parent / ('.pending-' + str(uuid.uuid4()))
        temp.mkdir(mode=0o700)
        try:
            for name, data in files:
                with open(temp / name, 'xb') as handle:
                    os.chmod(temp / name, 0o600)
                    handle.write(data)
                    handle.flush()
                    os.fsync(handle.fileno())
            self._check(directory, missing=True)
            os.replace(temp, directory)
        finally:
            if temp.exists():
                self._remove_directory(temp)

    def collect(self, b64: str, media: str, provider: str, model: str) -> str:
        """Store a consented image; b64 is bare base64, never a URL/data URI."""
        provider, model = _identifier(provider), _identifier(model)
        photo = _clean_photo(b64, media)
        record_id = str(uuid.uuid4())
        record = {'schema_version': SCHEMA_VERSION, 'id': record_id,
                  'received_utc': _utc(), 'sha256': hashlib.sha256(photo).hexdigest(),
                  'media': 'image/jpeg', 'provider': provider, 'model': model,
                  'consent': self._consent(), 'status': 'pending'}
        with self._locked():
            self._new_record(self._directory(record_id), record, photo)
        return record_id

    @staticmethod
    def _annotation(record_id: str, result: dict) -> dict:
        if not isinstance(result, dict):
            raise ArchiveError('Model annotation must be an object.')
        sanitized = {key: _text(result.get(key), 1000) for key in TEXT_FIELDS if key in result}
        for key in LIST_FIELDS:
            value = result.get(key)
            if isinstance(value, list):
                sanitized[key] = [_text(item, 240) for item in value[:8] if isinstance(item, str)]
        confidence = result.get('biztonsag')
        if type(confidence) is int or type(confidence) is float and math.isfinite(confidence):
            sanitized['biztonsag'] = max(0, min(100, confidence))
        if 'novalife' in result:
            # Old 11-field annotations remain valid. New optional data is bounded
            # and retains UNVERIFIED status, including remotely synchronized data.
            from providers import public_novalife
            sanitized['novalife'] = public_novalife(result['novalife'])
        return {'schema_version': SCHEMA_VERSION, 'record_id': _id(record_id),
                'status': 'unverified_model_prediction', 'human_verified': False,
                'recorded_utc': _utc(), 'result': sanitized}

    def annotate(self, record_id: str, result: dict) -> None:
        annotation = self._annotation(record_id, result)
        with self._locked():
            self._record(record_id)
            self._write(self._directory(record_id) / 'annotation.json', _json(annotation))

    def import_remote(self, record: dict, image: str, annotation: dict | None = None) -> bool:
        """Atomically import an immutable consented cloud item, preserving its UUID.

        A matching existing record returns False without changing local curation
        or annotations. Conflicting UUIDs fail closed. The authenticated sync
        service establishes consent provenance; a hash verifies bytes, not truth.
        """
        fields = {'schema_version', 'id', 'received_utc', 'sha256', 'media',
                  'provider', 'model', 'consent', 'status'}
        if (not isinstance(record, dict) or set(record) != fields or
                type(record.get('schema_version')) is not int or record['schema_version'] != SCHEMA_VERSION or
                record.get('media') != 'image/jpeg' or record.get('status') != 'pending' or
                _json(record.get('consent')) != _json(self._consent())):
            raise ArchiveError('Invalid remote archive record or consent.')
        record_id = _id(record['id'])
        _identifier(record['provider'])
        _identifier(record['model'])
        if not isinstance(record['sha256'], str) or not re.fullmatch('[0-9a-f]{64}', record['sha256']):
            raise ArchiveError('Invalid remote image hash.')
        received = record['received_utc']
        try:
            if not isinstance(received, str) or len(received) > 32 or not received.endswith('Z'):
                raise ValueError()
            parsed = datetime.fromisoformat(received[:-1] + '+00:00')
            if parsed.tzinfo is None or 'T' not in received:
                raise ValueError()
        except (ValueError, TypeError):
            raise ArchiveError('Invalid remote UTC timestamp.') from None
        if not isinstance(image, str) or not image or len(image) > 4 * ((MAX_IMAGE_BYTES + 2) // 3):
            raise ArchiveError('Invalid remote image encoding or size.')
        try:
            photo = base64.b64decode(image, validate=True)
            if (len(photo) > MAX_IMAGE_BYTES or base64.b64encode(photo).decode('ascii') != image or
                    hashlib.sha256(photo).hexdigest() != record['sha256'] or not photo.endswith(b'\xff\xd9')):
                raise ValueError()
            with warnings.catch_warnings():
                warnings.simplefilter('error', Image.DecompressionBombWarning)
                with Image.open(io.BytesIO(photo)) as picture:
                    if (picture.format != 'JPEG' or min(picture.size) < 8 or max(picture.size) > 2048 or
                            picture.mode != 'RGB' or picture.getexif() or
                            any(key in picture.info for key in ('exif', 'icc_profile', 'comment'))):
                        raise ValueError()
                    # Browser/Pillow JPEGs may contain only the ordinary JFIF
                    # header, never EXIF, Photoshop/IPTC, comments or thumbnails.
                    for tag, data in picture.applist:
                        if tag != 'APP0' or not data.startswith(b'JFIF\x00') or len(data) != 14 or data[-2:] != b'\x00\x00':
                            raise ValueError()
                    picture.load()
                    picture.verify()
        except (ValueError, TypeError, binascii.Error, OSError, SyntaxError, UnidentifiedImageError,
                Image.DecompressionBombError, Image.DecompressionBombWarning):
            raise ArchiveError('Remote JPEG integrity or metadata validation failed.') from None
        prediction = self._annotation(record_id, annotation) if annotation is not None else None
        # Copy just the bounded expected metadata, never a caller-owned mapping.
        clean_record = json.loads(_json(record))
        with self._locked():
            directory = self._directory(record_id)
            self._check(directory, missing=True)
            if directory.exists():
                existing = self._record(record_id)
                self._photo(record_id, existing)
                if dict(existing, status='pending') != clean_record:
                    raise ArchiveError('Remote UUID conflicts with an existing archive record.')
                return False
            reference = self._directory(record_id, True)
            if reference.exists():
                raise ArchiveError('Refusing to replace an existing curated reference.')
            self._new_record(directory, clean_record, photo, prediction)
            return True

    def promote(self, record_id: str, *, material: str, brand: str = 'ismeretlen', label: str,
                evidence: str, human_verified=False, active=False) -> None:
        if human_verified is not True or type(active) is not bool:
            raise ArchiveError('Explicit human verification is required.')
        brand = _text(brand, 160, True)
        if '/' in brand or '\\' in brand:
            raise ArchiveError('Brand names must not contain path separators.')
        if brand.casefold() == 'andante':
            brand = 'Andante'
        material, label = _text(material, 160, True), _text(label, 160, True)
        evidence = _text(evidence, 2000, True)
        with self._locked():
            source = self._record(record_id)
            if source['status'] != 'pending':
                raise ArchiveError('Only a pending inbox record can be approved.')
            selected = self._selected()
            if active and len(selected) >= MAX_REFERENCES:
                raise ArchiveError('At most four references may be active.')
            photo = _reference_photo(self._photo(record_id, source))
            if active:
                existing = self._references(selected)
                if sum(len(item['b64']) for item in existing) + 4 * ((len(photo) + 2) // 3) > MAX_REFERENCE_BASE64_BYTES:
                    raise ArchiveError('Selected references exceed the provider request budget.')
            record = dict(source, status='verified_reference', material=material, brand=brand, label=label,
                          source_sha256=source['sha256'], sha256=hashlib.sha256(photo).hexdigest(),
                          verification={'human_verified': True, 'evidence': evidence, 'verified_utc': _utc()})
            # Preflight the complete operation, including temporary replacements.
            changed_source = dict(source, status='approved')
            self._reserve(len(photo) + len(_json(record)) + len(_json(changed_source)) + MAX_JSON_BYTES)
            self._new_record(self._directory(record_id, True, brand), record, photo)
            self._write(self._directory(record_id) / 'record.json', _json(changed_source))
            if active:
                self._select(selected + [record_id])

    def activate(self, record_id: str) -> None:
        with self._locked():
            record = self._record(record_id, True)
            self._photo(record_id, record, True)
            selected = self._selected()
            if record_id not in selected:
                if len(selected) >= MAX_REFERENCES:
                    raise ArchiveError('At most four references may be active.')
                self._references(selected + [record_id])
                self._select(selected + [record_id])

    def deactivate(self, record_id: str) -> None:
        _id(record_id)
        with self._locked():
            selected = self._selected()
            if record_id in selected:
                self._select([item for item in selected if item != record_id])

    def references(self) -> list[dict]:
        """Fail closed if any selected reference is missing, unverified or changed."""
        with self._locked():
            return self._references(self._selected())

    def _references(self, selected):
        result, total = [], 0
        for record_id in selected:
            record = self._record(record_id, True)
            photo = self._photo(record_id, record, True)
            if len(photo) > MAX_REFERENCE_BYTES:
                raise ArchiveError('Reference exceeds the provider image budget; curate a smaller example.')
            b64 = base64.b64encode(photo).decode('ascii')
            total += len(b64)
            if total > MAX_REFERENCE_BASE64_BYTES:
                raise ArchiveError('Selected references exceed the provider request budget.')
            result.append({key: record[key] for key in ('id', 'label', 'brand', 'material')})
            result[-1].update(b64=b64, media='image/jpeg')
        return result

    def _remove_directory(self, directory):
        self._check(directory, missing=True)
        if not directory.exists():
            return
        paths = list(directory.iterdir())
        for path in paths:
            self._check(path)
            if path.name not in ('photo.jpg', 'record.json', 'annotation.json') or not path.is_file():
                raise ArchiveError('Refusing to delete unexpected archive content.')
        for path in paths:
            path.unlink()
        directory.rmdir()

    def reject(self, record_id: str) -> None:
        with self._locked():
            record = self._record(record_id)
            selected = self._selected()
            if record_id in selected:
                self._select([item for item in selected if item != record_id])
            self._write(self._directory(record_id) / 'record.json', _json(dict(record, status='rejected')))
            self._remove_directory(self._directory(record_id, True))

    def delete(self, record_id: str) -> None:
        """Permanently remove this UUID's inbox and reference copies."""
        _id(record_id)
        with self._locked():
            selected = self._selected()
            if record_id in selected:
                self._select([item for item in selected if item != record_id])
            self._remove_directory(self._directory(record_id, True))
            self._remove_directory(self._directory(record_id))

    def gallery(self) -> Path:
        """Generate an inert local HTML review page; never starts an HTTP server."""
        def escape(value):
            return html.escape(str(value), quote=True)
        with self._locked():
            selected = self._selected()
            rows = []
            candidates = []
            for directory in (self.root / 'inbox').iterdir():
                self._check(directory)
                if directory.name.startswith('.pending-'):
                    continue
                _id(directory.name)
                candidates.append((directory.stat().st_mtime_ns, directory.name, directory))
                if len(candidates) > MAX_ENTRIES:
                    raise ArchiveError('Archive record count exceeds the limit.')
            candidates.sort(reverse=True)
            directories = [item[2] for item in candidates[:MAX_GALLERY_RECORDS]]
            for record_id in selected:
                if self._directory(record_id) not in directories:
                    directories.append(self._directory(record_id))
            for directory in directories:
                record_id = _id(directory.name)
                record = self._record(record_id)
                self._photo(record_id, record)
                reference_path = self._directory(record_id, True)
                self._check(reference_path, missing=True)
                reference = self._record(record_id, True) if reference_path.exists() else None
                annotation_path = directory / 'annotation.json'
                self._check(annotation_path, missing=True)
                annotation = self._read_json(annotation_path) if annotation_path.exists() else None
                state = 'AKTÍV REFERENCIA' if record_id in selected else {
                    'pending': 'ELLENŐRZÉSRE VÁR', 'approved': 'JÓVÁHAGYVA, INAKTÍV',
                    'rejected': 'ELUTASÍTVA'}[record['status']]
                details = f'<p><strong>{escape(state)}</strong> — {escape(record["received_utc"])}</p>'
                if reference:
                    details += ('<p>Személyesen ellenőrizve: ' + escape(reference['material']) + ' · ' + escape(reference['brand']) + ' · ' +
                                escape(reference['label']) + '</p><p>Az ellenőrzés alapja: ' +
                                escape(reference['verification']['evidence']) + '</p>')
                if annotation:
                    details += '<details><summary>NEM ELLENŐRZÖTT AI-becslés — nem igazolja az anyagot</summary><pre>' + escape(json.dumps(annotation.get('result', {}), ensure_ascii=False, indent=2)) + '</pre></details>'
                category = reference['material'] if reference else 'Még nem jóváhagyott képek'
                rows.append((category, record['received_utc'], record_id,
                             f'<article><a href="inbox/{record_id}/photo.jpg"><img loading="lazy" src="inbox/{record_id}/photo.jpg" alt="Privát anyagminta"></a><h2>{record_id}</h2>{details}</article>'))
            sections, previous = [], None
            for category, _, _, row in sorted(rows):
                if category != previous:
                    sections.append('<h2>Anyag: ' + escape(category) + '</h2>')
                    previous = category
                sections.append(row)
            document = ('<!doctype html><html lang="hu"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
                        '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src \'self\' file:; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\'">'
                        '<title>Privát anyag- és referenciatár</title><style>body{font:16px system-ui;max-width:1050px;margin:40px auto;padding:0 20px;background:#f6f4ef;color:#222}article{background:white;padding:20px;margin:24px 0;border:1px solid #ccc}img{max-width:100%;max-height:360px}h2{font-size:16px;overflow-wrap:anywhere}pre{white-space:pre-wrap;overflow-wrap:anywhere}p{line-height:1.5}</style>'
                        '<h1>Privát anyag- és referenciatár</h1><p>CSAK HELYBEN — ezt a mappát ne tedd közzé, ne töltsd fel, és ne szolgáld ki webszerverrel. '
                        'A képek tárolási hozzájárulását a szerver rögzíti. Az AI-becslés nem ellenőrzött. A jóváhagyáshoz külön emberi ellenőrzés kell; '
                        'csak a kifejezetten aktivált mintákat kapja meg a beállított modellszolgáltató referenciaként.</p>'
                        f'<p>Frissítve: {escape(_utc())}. Aktív referenciák: {len(selected)}/4.</p>'
                        f'<p>A legutóbb módosított {MAX_GALLERY_RECORDS} beérkezett kép és az aktív referenciák láthatók, ellenőrzött anyag szerint rendezve. '
                        'A régebbi képek megmaradnak az inbox mappában; azonosítójuk alapján kezelhetők.</p>'
                        '<p>Jóváhagyás: archive.py approve --id UUID --material ANYAG --brand MÁRKA --label MEGNEVEZÉS --evidence ELLENŐRZÉS_ALAPJA --human-verified; '
                        'majd activate --id UUID. Az Andante minták külön gyűjteménybe kerülnek; ismeretlen márkánál használd az „ismeretlen” értéket. '
                        'A deactivate kikapcsolja a referenciaként megosztást; a reject elutasít, de megtartja a beérkezett képet; a delete végleg törli mindkét példányt. '
                        'Az oldal frissítéséhez futtasd a gallery parancsot. Ez az oldal nem futtat szkripteket, nincs követés vagy űrlap.</p>' +
                        ''.join(sections) + '</html>')
            path = self.root / 'index.html'
            self._write(path, document.encode('utf-8'))
            return path


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--root', type=Path, default=DEFAULT_ROOT, help='A privát helyi képtár mappája')
    parser.add_argument('--max-bytes', type=int, default=DEFAULT_MAX_BYTES, help='Tárhelykorlát bájtban, az átmeneti írásokkal együtt')
    commands = parser.add_subparsers(dest='command', required=True)
    commands.add_parser('gallery', help='Helyben megnyitható ellenőrző index.html készítése')
    for name in ('approve', 'activate', 'deactivate', 'reject', 'delete'):
        command = commands.add_parser(name)
        command.add_argument('--id', required=True, dest='record_id')
        if name == 'approve':
            for field in ('material', 'label', 'evidence'):
                command.add_argument('--' + field, required=True)
            command.add_argument('--brand', default='ismeretlen', help='Ellenőrzött márka; alapértelmezés: ismeretlen')
            command.add_argument('--human-verified', action='store_true', required=True,
                                 help='Az anyagot és az ismert márkát AI-becsléstől függetlenül ellenőriztem')
            command.add_argument('--active', action='store_true', help='A referencia aktiválása is (legfeljebb négy)')
    args = parser.parse_args(argv)
    try:
        archive = Archive(args.root, args.max_bytes)
        if args.command == 'approve':
            archive.promote(args.record_id, material=args.material, brand=args.brand, label=args.label,
                            evidence=args.evidence, human_verified=args.human_verified, active=args.active)
        elif args.command != 'gallery':
            getattr(archive, args.command)(args.record_id)
        print(archive.gallery())
        return 0
    except (ArchiveError, OSError):
        parser.exit(1, 'A képtár művelete nem sikerült: hibás adat, nem biztonságos/sérült tárhely, betelt korlát vagy foglalt képtár.\n')


if __name__ == '__main__':
    raise SystemExit(main())
