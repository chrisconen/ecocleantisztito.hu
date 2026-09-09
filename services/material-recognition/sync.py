#!/usr/bin/env python3
"""Privát felhőképek letöltése a saját számítógépre, külön referencia-közzététellel.

  python services/material-recognition/sync.py --once
  python services/material-recognition/sync.py --watch --interval 300
  python services/material-recognition/sync.py --publish-references

Alapmappa: E:/ECOCLEAN/anyag-referenciak (a webszerverek gyökerén kívül).
A sync-config.json két mezőt tartalmaz: endpoint és token. A titkos tokent
az üzemeltető helyezi ebbe a privát fájlba; ne írd parancssorba vagy Gitbe.
Az endpoint kizárólag https://ecocleantisztito.hu lehet, átirányítás tilos.

A --once és --watch csak letölt, majd helyi galériát készít. Az AI-becslés
nem jelent anyagigazolást. Referenciát az archive.py approve + activate
parancsaival válassz; csak a külön --publish-references továbbítja az aktív,
ember által ellenőrzött készletet. Az üres aktív lista a távoli készletet üríti.

A letöltési bizonylatok megmaradnak a .sync-receipts mappában: egy később
helyben törölt fotó nem jelenik meg újra a következő lekérdezéskor. Ezek csak
azonosítót, hash-t és technikai eredetadatokat tartalmaznak. A kliens nem töröl
és nem nyugtáz távoli képeket. A hibás oldal újrapróbálható; minden kör a
manifest elejéről indul, és a már ellenőrzötten tárolt elemeket kihagyja.

Bizalmi határ: a HTTPS-végpont és a jogosult bearer token bizonyítja a forrást;
a hash csak a letöltött bájtok egyezését igazolja. A helyi könyvtárhoz és
konfigurációhoz csak a tulajdonosnak legyen hozzáférése. Nincs képtartalom-,
ügyfélmegjegyzés-, fejléc- vagy tokennaplózás, csak összesített eredményszámok.
"""
from __future__ import annotations

import argparse
import base64
import binascii
from datetime import datetime
import http.client
import json
import os
from pathlib import Path
import re
import stat
import time
from urllib.parse import urlencode, urlsplit
import urllib.error
import urllib.request

from archive import Archive, ArchiveError, DEFAULT_ROOT, MAX_IMAGE_BYTES, PROJECT, _id, _identifier, _json

ALLOWED_ENDPOINTS = frozenset({'https://ecocleantisztito.hu'})
MAX_MANIFEST_BYTES = 128 * 1024
MAX_ITEM_BYTES = 6 * 1024 ** 2
MAX_PUBLISH_BYTES = 6 * 1024 ** 2 + 32 * 1024
MAX_MANIFEST_ITEMS = 100
MAX_PAGES = 1000
MAX_CURSOR = 2048
ITEM_FIELDS = frozenset({'id', 'sha256', 'received_utc', 'provider', 'model', 'bytes'})


class SyncError(ValueError):
    """Safe diagnostic; never contains credentials, URLs with cursors or payloads."""


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def strict_json(data):
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result:
                raise ValueError()
            result[key] = value
        return result
    try:
        return json.loads(data, object_pairs_hook=pairs,
                          parse_constant=lambda _: (_ for _ in ()).throw(ValueError()))
    except (ValueError, UnicodeError, RecursionError):
        raise SyncError('Hibás szinkronadat érkezett.') from None


def _endpoint(value):
    if not isinstance(value, str) or len(value) > 200:
        raise SyncError('Nem engedélyezett szinkronvégpont.')
    try:
        parsed = urlsplit(value)
    except ValueError:
        raise SyncError('Nem engedélyezett szinkronvégpont.') from None
    if (parsed.scheme != 'https' or parsed.username or parsed.password or parsed.query or parsed.fragment or
            parsed.path not in ('', '/') or value.rstrip('/') not in ALLOWED_ENDPOINTS):
        raise SyncError('Nem engedélyezett szinkronvégpont.')
    return value.rstrip('/')


def _token(value):
    if not isinstance(value, str) or not re.fullmatch(r'[A-Za-z0-9._~+/-]{32,512}={0,2}', value):
        raise SyncError('Hibás szinkronkonfiguráció.')
    return value


def load_config(path: Path) -> dict:
    """Read a small owner-managed config; reject webroot, links and special files."""
    path = Path(path).absolute()
    if '..' in path.parts or path == PROJECT or PROJECT in path.parents:
        raise SyncError('A szinkronkonfiguráció legyen a webszerverek gyökerén kívül.')
    try:
        for part in (path, *path.parents):
            info = part.lstat()
            if stat.S_ISLNK(info.st_mode) or getattr(info, 'st_file_attributes', 0) & 0x400:
                raise SyncError('A szinkronkonfiguráció nem lehet hivatkozás.')
        before = path.lstat()
        if not stat.S_ISREG(before.st_mode) or before.st_size > 4096 or before.st_nlink != 1:
            raise SyncError('Hibás szinkronkonfiguráció.')
        fd = os.open(path, os.O_RDONLY | getattr(os, 'O_NOFOLLOW', 0))
        with os.fdopen(fd, 'rb') as handle:
            after = os.fstat(handle.fileno())
            if (before.st_dev, before.st_ino) != (after.st_dev, after.st_ino):
                raise SyncError('A szinkronkonfiguráció olvasás közben megváltozott.')
            raw = handle.read(4097)
        if len(raw) > 4096:
            raise SyncError('Hibás szinkronkonfiguráció.')
        value = strict_json(raw)
        if not isinstance(value, dict) or set(value) != {'endpoint', 'token'}:
            raise SyncError('Hibás szinkronkonfiguráció.')
        return {'endpoint': _endpoint(value['endpoint']), 'token': _token(value['token'])}
    except OSError:
        raise SyncError('A privát szinkronkonfiguráció nem olvasható.') from None


def _manifest_item(value):
    if not isinstance(value, dict) or set(value) != ITEM_FIELDS:
        raise SyncError('Hibás manifest-bejegyzés.')
    try:
        _id(value['id'])
        _identifier(value['provider'])
        _identifier(value['model'])
        if (not isinstance(value['sha256'], str) or not re.fullmatch('[0-9a-f]{64}', value['sha256']) or
                type(value['bytes']) is not int or not 1 <= value['bytes'] <= MAX_IMAGE_BYTES):
            raise ValueError()
        received = value['received_utc']
        if not isinstance(received, str) or len(received) > 32 or not received.endswith('Z') or 'T' not in received:
            raise ValueError()
        datetime.fromisoformat(received[:-1] + '+00:00')
    except (ValueError, TypeError):
        raise SyncError('Hibás manifest-bejegyzés.') from None
    return value


class SyncClient:
    def __init__(self, archive: Archive, endpoint: str, token: str, timeout=30):
        if type(timeout) not in (int, float) or not 1 <= timeout <= 120:
            raise SyncError('A hálózati időkorlát 1–120 másodperc lehet.')
        self.archive = archive
        self.endpoint, self._token = _endpoint(endpoint), _token(token)
        self.timeout = timeout
        self._opener = urllib.request.build_opener(NoRedirect())
        self.receipts = archive.root / '.sync-receipts'
        with archive._locked():
            archive._check(self.receipts, missing=True)
            self.receipts.mkdir(mode=0o700, exist_ok=True)
            archive._check(self.receipts)

    def _request(self, path, *, payload=None, limit=MAX_MANIFEST_BYTES):
        url = self.endpoint + path
        body = None
        headers = {'Authorization': 'Bearer ' + self._token, 'Accept': 'application/json',
                   'User-Agent': 'ECOClean-PrivateSync/1'}
        if payload is not None:
            body = json.dumps(payload, ensure_ascii=False, allow_nan=False, separators=(',', ':')).encode('utf-8')
            if len(body) > MAX_PUBLISH_BYTES:
                raise SyncError('A referencia-készlet meghaladja a küldési korlátot.')
            headers['Content-Type'] = 'application/json'
        request = urllib.request.Request(url, data=body, headers=headers,
                                         method='POST' if payload is not None else 'GET')
        try:
            with self._opener.open(request, timeout=self.timeout) as response:
                if response.geturl() != url or response.status != 200:
                    raise SyncError('A szinkronvégpont átirányítást vagy váratlan választ adott.')
                if response.headers.get('Content-Type', '').split(';', 1)[0].lower() != 'application/json':
                    raise SyncError('A szinkronvégpont nem JSON-adatot küldött.')
                length = response.headers.get('Content-Length')
                if length is not None and (not length.isdecimal() or int(length) > limit):
                    raise SyncError('A szinkronválasz meghaladja a méretkorlátot.')
                raw = response.read(limit + 1)
                if len(raw) > limit:
                    raise SyncError('A szinkronválasz meghaladja a méretkorlátot.')
            return strict_json(raw)
        except urllib.error.HTTPError as error:
            # Do not read response bodies or format exception URLs/headers.
            status = int(error.code)
            error.close()
            raise SyncError(f'A szinkronkérés sikertelen (HTTP {status}).') from None
        except (urllib.error.URLError, OSError, TimeoutError, http.client.HTTPException):
            raise SyncError('A szinkronvégpont nem érhető el; a következő kör újrapróbálja.') from None

    def _receipt_path(self, item):
        return self.receipts / (_id(item['id']) + '.json')

    def _already_local(self, item):
        with self.archive._locked():
            receipt = self._receipt_path(item)
            self.archive._check(receipt, missing=True)
            recorded = receipt.exists()
            if recorded and self.archive._read_json(receipt) != dict(item, schema_version=1):
                raise SyncError('A letöltési bizonylat és a távoli bejegyzés eltér.')
            directory = self.archive._directory(item['id'])
            self.archive._check(directory, missing=True)
            if directory.exists():
                record = self.archive._record(item['id'])
                photo = self.archive._photo(item['id'], record)
                if any(record.get(key) != item[key] for key in ITEM_FIELDS - {'bytes'}) or len(photo) != item['bytes']:
                    raise SyncError('A távoli azonosító egy eltérő helyi képre mutat.')
                return True
            # A receipt intentionally survives the owner's later photo deletion.
            return recorded

    def _checkpoint(self, item):
        with self.archive._locked():
            path = self._receipt_path(item)
            self.archive._check(path, missing=True)
            value = dict(item, schema_version=1)
            if path.exists():
                if self.archive._read_json(path) != value:
                    raise SyncError('Ütköző letöltési bizonylat.')
                return
            self.archive._write(path, _json(value))

    def pull_once(self) -> dict:
        cursor, seen_cursors, seen_items = None, set(), set()
        counts = {'imported': 0, 'skipped': 0, 'pages': 0}
        try:
            for _ in range(MAX_PAGES):
                path = '/api/material-admin/manifest'
                if cursor is not None:
                    path += '?' + urlencode({'cursor': cursor})
                manifest = self._request(path)
                if (not isinstance(manifest, dict) or set(manifest) != {'items', 'cursor'} or
                        not isinstance(manifest['items'], list) or len(manifest['items']) > MAX_MANIFEST_ITEMS):
                    raise SyncError('Hibás manifest-oldal.')
                next_cursor = manifest['cursor']
                if next_cursor is not None:
                    if (not isinstance(next_cursor, str) or not 1 <= len(next_cursor) <= MAX_CURSOR or
                            any(ord(c) < 32 or ord(c) == 127 for c in next_cursor) or next_cursor in seen_cursors):
                        raise SyncError('Hibás vagy ismétlődő lapozási kurzor.')
                # Validate a whole page before making any local import.
                items = [_manifest_item(item) for item in manifest['items']]
                ids = [item['id'] for item in items]
                if len(set(ids)) != len(ids) or seen_items.intersection(ids):
                    raise SyncError('Ismétlődő képek a manifestben.')
                for item in items:
                    if self._already_local(item):
                        self._checkpoint(item)
                        counts['skipped'] += 1
                        continue
                    response = self._request('/api/material-admin/items/' + item['id'], limit=MAX_ITEM_BYTES)
                    if not isinstance(response, dict) or set(response) != {'record', 'image', 'annotation'}:
                        raise SyncError('Hibás távoli képrekord.')
                    record = response['record']
                    if not isinstance(record, dict) or any(record.get(key) != item[key] for key in ITEM_FIELDS - {'bytes'}):
                        raise SyncError('A letöltött kép nem egyezik a manifesttel.')
                    image = response['image']
                    try:
                        if (not isinstance(image, str) or len(image) > 4 * ((MAX_IMAGE_BYTES + 2) // 3) or
                                len(base64.b64decode(image, validate=True)) != item['bytes']):
                            raise ValueError()
                    except (ValueError, binascii.Error):
                        raise SyncError('A letöltött kép mérete vagy kódolása hibás.') from None
                    imported = self.archive.import_remote(record, image, response['annotation'])
                    self._checkpoint(item)
                    counts['imported' if imported else 'skipped'] += 1
                # There is no persisted cursor/remote acknowledgement to skip a
                # failed item. Completed receipts make restarting inexpensive.
                counts['pages'] += 1
                seen_items.update(ids)
                if next_cursor is None:
                    return counts
                seen_cursors.add(next_cursor)
                cursor = next_cursor
            raise SyncError('A manifest túllépte az egy körre engedélyezett oldalszámot.')
        finally:
            # Partial successful downloads remain reviewable after network errors.
            self.archive.gallery()

    def publish_references(self) -> int:
        references = self.archive.references()
        response = self._request('/api/material-admin/references', payload={'references': references})
        if (not isinstance(response, dict) or response.get('ok') is not True or
                type(response.get('count')) is not int or response['count'] != len(references)):
            raise SyncError('A referencia-közzététel visszaigazolása hiányzik vagy eltér.')
        return len(references)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--root', type=Path, default=DEFAULT_ROOT, help='Privát helyi képtár, a projektmappán kívül')
    parser.add_argument('--config', type=Path, help='Privát sync-config.json; alapértelmezés: a képtárban')
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument('--once', action='store_true', help='Egyszeri letöltés és galériafrissítés')
    action.add_argument('--watch', action='store_true', help='Ismétlődő letöltés, referencia-közzététel nélkül')
    action.add_argument('--publish-references', action='store_true', help='Csak a helyben aktivált készlet közzététele')
    parser.add_argument('--interval', type=int, default=300, help='Lekérdezések közötti idő másodpercben, legalább 30')
    args = parser.parse_args(argv)
    if not 30 <= args.interval <= 86400:
        parser.error('Az időköz 30–86400 másodperc lehet.')
    try:
        config = load_config(args.config or args.root / 'sync-config.json')
        client = SyncClient(Archive(args.root), **config)
        if args.publish_references:
            print(f'Közzétett, ellenőrzött referenciák: {client.publish_references()}.')
            return 0
        while True:
            try:
                result = client.pull_once()
                print(f'Új helyi képek: {result["imported"]}; korábban tárolt képek: {result["skipped"]}.', flush=True)
            except (SyncError, ArchiveError, OSError):
                print('A szinkronizálás nem fejeződött be. A korábban tárolt képek megmaradtak; újrapróbálható.', flush=True)
                if not args.watch:
                    return 1
            if not args.watch:
                return 0
            time.sleep(args.interval)
    except KeyboardInterrupt:
        return 0
    except (SyncError, ArchiveError, OSError):
        print('A szinkronizálás nem indult el. Ellenőrizd a privát konfigurációt, jogosultságot és a tárhelyet.')
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
