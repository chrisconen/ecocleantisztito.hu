#!/usr/bin/env python3
"""Prepare/import the three owner-approved ANDANTE NovaLife catalogue samples.

Default is READ-ONLY: verify the existing downloaded files against pinned hashes
and print a plan. It neither creates an Archive nor reads credentials nor fetches.

After reviewing the plan, the already-authorized operator may explicitly run:
  python services/material-recognition/import_novalife_references.py --apply --owner-approved-source-use
  python services/material-recognition/import_novalife_references.py --apply --owner-approved-source-use --publish

--publish uses the existing private sync configuration and publishes the complete
active set, preserving any existing selection up to the four-reference limit.
It sends catalogue pixels/labels only to the authenticated Worker reference route;
there is no paid inference, customer upload, public release copy or scheduled task.
If publication fails, the local active selection remains ready for an explicit retry.

Provenance: original manufacturer URLs supplied/approved in the user session;
SHA256 pinned from those existing downloaded files. Approval acknowledges private
reference use, not a customer consent declaration, physical material inspection,
independent manufacturer's-claim validation, or a copyright licence determination.
"""
from __future__ import annotations
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import stat

from PIL import Image
import io
from archive import Archive, ArchiveError, DEFAULT_ROOT, MAX_IMAGE_BYTES, MAX_REFERENCES, PROJECT, _clean_photo, _reference_photo
from sync import SyncClient, SyncError, load_config

SOURCES = (
    {'id': '8adc229e-315b-4483-8746-a1c0d9ccf702', 'name': 'nuss', 'label': 'NovaLife Premium Nuss — ANDANTE gyártói forrás',
     'source_url': 'https://andante.hu/wp-content/uploads/2022/05/Novalife_premium_nuss.jpg',
     'sha256': '0bf3d5130b4005eefd4d423f0fc3ba8b416bd170dd09aed694e94e759132eab5'},
    {'id': '50e9a173-7d0c-4369-886c-9edcb4c96a51', 'name': 'ecru', 'label': 'NovaLife Premium Ecru 41 — ANDANTE gyártói forrás',
     'source_url': 'https://andante.hu/wp-content/uploads/2022/05/Novalife_premium_ecru_41.jpg',
     'sha256': 'f64da6a646b3701cb4e970fc8ce32afbdc36f9fdabfa69b7a86df1013d5f01b1'},
    {'id': 'f89ff693-53b6-4b6b-aefa-d65dc7a6c0e7', 'name': 'dunkelgrau', 'label': 'NovaLife Premium Dunkelgrau 45 — ANDANTE gyártói forrás',
     'source_url': 'https://andante.hu/wp-content/uploads/2024/08/Novalife-premium-dunkelgrau-45.jpg',
     'sha256': 'ab985ca87c8b838edbf35096274d2823c590244ba9339ee97b25db6b19f51aa9'},
)
MATERIAL = 'NovaLife Premium bőr-/vadbőrhatású szövet — gyártói megjelölés'


def prepare(source_dir: Path) -> list[dict]:
    prepared = []
    for source in SOURCES:
        path = source_dir / ('ecoclean-novalife-' + source['name'] + '.jpg')
        info = path.lstat()
        if (not stat.S_ISREG(info.st_mode) or stat.S_ISLNK(info.st_mode) or info.st_nlink != 1 or
                getattr(info, 'st_file_attributes', 0) & 0x400 or not 0 < info.st_size <= MAX_IMAGE_BYTES):
            raise ArchiveError('A manufacturer fixture is linked, missing or oversized.')
        with path.open('rb') as handle:
            opened = os.fstat(handle.fileno())
            if (opened.st_dev, opened.st_ino) != (info.st_dev, info.st_ino):
                raise ArchiveError('A manufacturer fixture changed during access.')
            raw = handle.read(MAX_IMAGE_BYTES + 1)
        if len(raw) > MAX_IMAGE_BYTES or hashlib.sha256(raw).hexdigest() != source['sha256']:
            raise ArchiveError('A manufacturer fixture differs from the approved pinned source.')
        encoded = base64.b64encode(raw).decode('ascii')
        normalized = _reference_photo(_clean_photo(encoded, 'image/jpeg'))
        with Image.open(io.BytesIO(normalized)) as image:
            dimensions = list(image.size)
        prepared.append({**source, 'b64': encoded, 'dimensions': dimensions, 'reference_bytes': len(normalized)})
    return prepared


def apply(prepared, library: Archive, *, publish=False, config_path=None):
    ids = [item['id'] for item in prepared]
    selected = library.references()  # Revalidate before making any changes.
    if len(set(ids) | {item['id'] for item in selected}) > MAX_REFERENCES:
        raise ArchiveError('The three samples do not fit alongside existing references; no selection was replaced.')
    config = load_config(config_path or library.root / 'sync-config.json') if publish else None
    imported = 0
    for item in prepared:
        imported += library.import_manufacturer_reference(item['b64'], record_id=item['id'], source_url=item['source_url'],
                    source_sha256=item['sha256'], material=MATERIAL, label=item['label'], owner_approved=True)
    library.activate_many(ids)
    library.gallery()
    report = {'applied': True, 'new_imports': imported, 'catalogue_samples': len(ids), 'active_total': len(library.references()),
              'published': False, 'customer_consent_claimed': False, 'physical_material_verification_claimed': False}
    if publish:
        count = SyncClient(library, **config).publish_references()
        report.update(published=True, published_count=count)
    return report


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--source-dir', type=Path, default=Path(os.environ.get('TEMP', str(Path.home() / 'AppData/Local/Temp'))))
    parser.add_argument('--root', type=Path, default=DEFAULT_ROOT)
    parser.add_argument('--config', type=Path, help='Private sync-config.json, only used with --publish')
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--owner-approved-source-use', action='store_true')
    parser.add_argument('--publish', action='store_true')
    args = parser.parse_args(argv)
    if (args.publish and not args.apply) or (args.apply and not args.owner_approved_source_use):
        parser.error('--apply requires --owner-approved-source-use; --publish also requires --apply.')
    try:
        root = args.root.resolve()
        if root == PROJECT.resolve() or PROJECT.resolve() in root.parents:
            raise ArchiveError('The reference library must remain outside public project files.')
        prepared = prepare(args.source_dir)
        if not args.apply:
            report = {'dry_run': True, 'destination': str(root), 'network_calls': 0, 'writes': 0,
                      'samples': [{key: item[key] for key in ('id', 'name', 'source_url', 'sha256', 'dimensions', 'reference_bytes')} for item in prepared],
                      'customer_consent_claimed': False, 'physical_material_verification_claimed': False}
        else:
            report = apply(prepared, Archive(root), publish=args.publish, config_path=args.config)
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 0
    except (ArchiveError, SyncError, OSError, ValueError):
        print('A referencia-előkészítés vagy közzététel nem fejeződött be. A korábbi referenciák nem kerültek automatikus lecserélésre. Közzétételi hiba esetén a helyi aktiválás már megtörténhetett; ellenőrizd a privát képtárat, majd próbáld újra kifejezetten.', flush=True)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
