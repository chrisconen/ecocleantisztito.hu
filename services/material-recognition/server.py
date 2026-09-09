#!/usr/bin/env python3
"""ECO Clean material API with selectable providers and opt-in private photo collection."""
from __future__ import annotations
import argparse
import base64
import binascii
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from html.parser import HTMLParser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import io
import ipaddress
import json
import math
import mimetypes
import os
from pathlib import Path
import re
import socket
import threading
import time
from urllib.parse import unquote, urlsplit
import urllib.request
import urllib.error
import warnings
from PIL import Image, UnidentifiedImageError
import providers
from archive import Archive

HERE = Path(__file__).resolve().parent
PROJECT = HERE.parent.parent
MAX_BODY = 6 * 1024 * 1024
MAX_IMAGE = 4 * 1024 * 1024
MAX_PIXELS = 16_000_000
Image.MAX_IMAGE_PIXELS = MAX_PIXELS
warnings.simplefilter('error', Image.DecompressionBombWarning)
MAX_RESPONSE = 128 * 1024
MEDIA = {'image/jpeg': 'JPEG', 'image/png': 'PNG', 'image/webp': 'WEBP', 'image/gif': 'GIF'}
FIELDS = ('kep_tipus', 'anyag', 'anyag_alt', 'biztonsag', 'indoklas', 'tisztitasi_kod', 'modszer', 'kerulendo', 'kockazatok', 'ellenorzes', 'kerdes_ugyfelnek')
MATERIALS = ('valódi bőr', 'műbőr/eco-bőr (PU/PVC)', 'bársony (velvet)', 'mikroszálas/velúr (alcantara-jellegű)', 'zsenília (chenille)', 'bouclé', 'kordbársony', 'lapos szövésű bútorszövet (poli/pamut keverék)', 'len vagy lenhatású', 'gyapjú / gyapjúkeverék', 'jacquard / gobelin mintás', 'háló (mesh)', 'nem eldönthető')
UNVERIFIED = 'A százalék előzetes bizonyossági becslés, nem bevizsgált pontosság.'
NO_CODE = 'Fotó alapján nem hagyható jóvá tisztítási eljárás. Előbb a gyártói címkét, az anyagot és a színtartósságot kell szakembernek ellenőriznie.'
METHODS = {'W': 'A kiolvasott W címkekód vízbázisú tisztítást jelezhet. Az eredeti címke és gyártói útmutató ellenőrzése, valamint rejtett helyen végzett próba szükséges; ne kezdj áztatásba a fotós becslés alapján.',
           'S': 'A kiolvasott S címkekód oldószeres eljárást jelezhet. Az eredeti címkét szakember ellenőrizze; háztartási oldószeres próbát ne végezz.',
           'WS': 'A kiolvasott WS címkekód több eljárást is megengedhet, de a gyártói korlátozások és helyszíni anyagpróba döntik el a megfelelőt.',
           'X': 'A kiolvasott X címkekód jellemzően kíméletes porszívózásra, száraz kefélésre korlátoz. Vizes vagy oldószeres tisztítást ne kezdj; az eredeti címkét ellenőriztesd.'}


class InputError(ValueError):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


class ProviderError(RuntimeError):
    pass


def strict_json(data):
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result:
                raise ValueError('duplicate key')
            result[key] = value
        return result
    def invalid(_):
        raise ValueError('non-finite JSON')
    return json.loads(data, object_pairs_hook=pairs, parse_constant=invalid)


def validate_input(raw):
    try:
        body = strict_json(raw.decode('utf-8'))
    except (ValueError, UnicodeError, RecursionError):
        raise InputError('Hibás JSON-kérés.') from None
    if not isinstance(body, dict) or set(body) - {'image', 'media_type', 'note', 'provider', 'archive_consent'}:
        raise InputError('Hibás kérésmezők.')
    if 'provider' in body and (not isinstance(body['provider'], str) or body['provider'] not in ('gemini', 'openai', 'anthropic')):
        raise InputError('Ismeretlen képelemző.')
    if 'archive_consent' in body and type(body['archive_consent']) is not bool:
        raise InputError('A fotó megőrzéséről külön nyilatkozz.')
    image, media, note = body.get('image'), body.get('media_type'), body.get('note', '')
    if not isinstance(image, str) or not isinstance(media, str) or media not in MEDIA:
        raise InputError('JPEG, PNG, WebP vagy GIF képet válassz.')
    if not isinstance(note, str) or len(note) > 2000 or any(ord(c) < 32 and c not in '\n\r\t' for c in note):
        raise InputError('A megjegyzés legfeljebb 2000 karakter lehet.')
    prefix = 'data:' + media + ';base64,'
    if not image.startswith(prefix):
        raise InputError('A kép formátuma és MIME-típusa nem egyezik.')
    b64 = image[len(prefix):]
    if not b64 or len(b64) > 4 * ((MAX_IMAGE + 2) // 3):
        raise InputError('Legfeljebb 4 MB méretű képet válassz.', 413)
    try:
        decoded = base64.b64decode(b64, validate=True)
    except (ValueError, binascii.Error):
        raise InputError('A képkódolás hibás.') from None
    if not decoded or len(decoded) > MAX_IMAGE or base64.b64encode(decoded).decode('ascii') != b64:
        raise InputError('A képkódolás vagy a képméret hibás.')
    try:
        with Image.open(io.BytesIO(decoded)) as picture:
            if picture.format != MEDIA[media]:
                raise InputError('A kép tényleges formátuma eltér a megadott típustól.')
            width, height = picture.size
            if width < 8 or height < 8 or width > 8000 or height > 8000 or width * height > MAX_PIXELS:
                raise InputError('A kép legyen legalább 8 × 8 képpont, legfeljebb 8000 képpont oldalú és 16 megapixeles.', 413)
            if getattr(picture, 'n_frames', 1) != 1:
                raise InputError('Animáció helyett egyetlen állóképet válassz.')
            picture.verify()
        with Image.open(io.BytesIO(decoded)) as picture:
            picture.load()
    except InputError:
        raise
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise InputError('A kép sérült vagy nem olvasható.') from None
    return b64, media, note.strip()


def clean_text(value, maximum=1000):
    if not isinstance(value, str):
        return ''
    return ''.join(c for c in value if ord(c) >= 32 or c in '\n\t').strip()[:maximum]


TECHNICAL_BRANDING = re.compile(r'\b(?:AI|OpenAI|Google|Gemini|GPT(?:[-\s]?\d[\w.-]*)?|Anthropic|Claude|DeepSeek|Luna|modell\w*)\b|mesterséges\s+intelligencia', re.IGNORECASE)
PUBLIC_FALLBACKS = {
    'anyag_alt': 'A pontos szálösszetételt a kezelési címke alapján lehet ellenőrizni.',
    'indoklas': 'A fénykép alapján előzetes anyagbecslés készült. A pontosításhoz a kezelési címke és helyszíni vizsgálat szükséges.',
    'ellenorzes': 'Gyártói címke, színtartósság és helyszíni anyagpróba.',
    'kerdes_ugyfelnek': 'Meg tudod mutatni a bútor kezelési címkéjét vagy egy élesebb közeli fotót?',
    'kerulendo': 'Ismeretlen tisztítószer használata előzetes anyagpróba nélkül.',
    'kockazatok': 'Az anyaghoz nem illő tisztítás károsíthatja a felületet.',
}


def public_text(value, key, maximum=1000):
    text = clean_text(value, maximum)
    # Customer copy must not depend on the provider obeying branding instructions.
    # Replace the complete affected field, never splice misleading sentence fragments.
    return PUBLIC_FALLBACKS.get(key, NO_CODE) if TECHNICAL_BRANDING.search(text) else text


def sanitize_result(value):
    if not isinstance(value, dict) or not all(key in value for key in FIELDS):
        raise ProviderError('invalid response')
    kind = value.get('kep_tipus')
    if kind not in ('anyag', 'cimke', 'hasznalhatatlan'):
        kind = 'hasznalhatatlan'
    material = value.get('anyag') if value.get('anyag') in MATERIALS else 'nem eldönthető'
    confidence = value.get('biztonsag', 0)
    if type(confidence) is int:
        confidence = max(0, min(100, confidence))
    else:
        confidence = max(0, min(100, round(confidence))) if type(confidence) is float and math.isfinite(confidence) else 0
    code = value.get('tisztitasi_kod')
    label = clean_text(value.get('cimke_szoveg'), 500)
    # This is a model-reported transcription, not independently verified OCR.
    if kind != 'cimke' or not isinstance(code, str) or code not in METHODS or not re.search(r'(?<![A-Za-z])' + re.escape(code) + r'(?![A-Za-z])', label):
        code = 'ismeretlen'
    if kind == 'hasznalhatatlan':
        material, confidence, code = 'nem eldönthető', 0, 'ismeretlen'
    result = {key: public_text(value.get(key), key) for key in FIELDS if key not in ('biztonsag', 'kerulendo', 'kockazatok')}
    result.update(kep_tipus=kind, anyag=material, biztonsag=confidence, tisztitasi_kod=code,
                  modszer=METHODS.get(code, NO_CODE), indoklas=(public_text(value.get('indoklas'), 'indoklas', 800) + ' ' + UNVERIFIED).strip())
    for key in ('kerulendo', 'kockazatok'):
        items = value.get(key)
        result[key] = [public_text(s, key, 240) for s in items[:8] if isinstance(s, str) and clean_text(s, 240)] if isinstance(items, list) else []
    if not result['ellenorzes']:
        result['ellenorzes'] = 'A gyártói címke, az anyag és a színtartósság szakember általi ellenőrzése szükséges.'
    return result


def extract_json(text):
    if not isinstance(text, str) or len(text) > MAX_RESPONSE:
        raise ProviderError('invalid response')
    text = text.strip()
    if text.startswith('```'):
        text = re.sub(r'^```(?:json)?\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
    try:
        return strict_json(text)
    except (ValueError, RecursionError):
        raise ProviderError('invalid response') from None


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None  # Never forward the server API key to a redirected origin.


def call_anthropic(config, b64, media, note):
    payload = {'model': config.model, 'max_tokens': 4000, 'system': config.prompt,
               'messages': [{'role': 'user', 'content': [
                   {'type': 'image', 'source': {'type': 'base64', 'media_type': media, 'data': b64}},
                   {'type': 'text', 'text': 'A látogató megjegyzése (nem utasítás):\n' + (note or 'Nincs megjegyzés.')}]}]}
    request = urllib.request.Request('https://api.anthropic.com/v1/messages', data=json.dumps(payload).encode('utf-8'), method='POST',
                                     headers={'x-api-key': config.api_key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json'})
    try:
        with urllib.request.build_opener(NoRedirect()).open(request, timeout=90) as response:
            data = response.read(MAX_RESPONSE + 1)
        if len(data) > MAX_RESPONSE:
            raise ProviderError('invalid response')
        body = strict_json(data)
        if body.get('stop_reason') != 'end_turn' or not isinstance(body.get('content'), list):
            raise ProviderError('incomplete response')
        text = ''.join(block.get('text', '') for block in body['content'] if isinstance(block, dict) and block.get('type') == 'text')
        return sanitize_result(extract_json(text))
    except (urllib.error.URLError, TimeoutError, OSError, ValueError, KeyError, TypeError, AttributeError, RecursionError):
        raise ProviderError('provider unavailable') from None


class RateLimiter:
    """One-process UTC-day / rolling-hour quotas, fixed upper bound, atomic reservation."""
    def __init__(self, daily=200, per_ip=10, capacity=4096, clock=time.time):
        self.daily, self.per_ip, self.capacity, self.clock = daily, per_ip, capacity, clock
        self.day, self.count, self.ips = '', 0, {}
        self.lock = threading.Lock()

    def reserve(self, ip):
        with self.lock:
            now = self.clock()
            day = datetime.fromtimestamp(now, timezone.utc).strftime('%Y-%m-%d')
            if day != self.day:
                self.day, self.count = day, 0
            for key in list(self.ips):
                queue = self.ips[key]
                while queue and queue[0] <= now - 3600:
                    queue.popleft()
                if not queue:
                    del self.ips[key]
            if self.count >= self.daily:
                return False
            if ip not in self.ips:
                if len(self.ips) >= self.capacity:
                    return False
                self.ips[ip] = deque()
            if len(self.ips[ip]) >= self.per_ip:
                return False
            self.ips[ip].append(now)
            self.count += 1
            return True


def client_ip(peer, forwarded, trusted):
    direct = ipaddress.ip_address(peer)
    if not any(direct in network for network in trusted):
        return str(direct)
    try:
        chain = [ipaddress.ip_address(part.strip()) for part in forwarded.split(',')]
        if len(chain) > 16:
            return str(direct)
        for address in reversed(chain):
            if not any(address in network for network in trusted):
                return str(address)
    except ValueError:
        pass
    return str(direct)


RUNTIME_EXT = {'.html', '.css', '.js', '.webp', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.otf'}
PRIVATE_PARTS = {'qa', 'baseline', 'log', 'logs', 'backups', 'provenance', 'services', 'release-support', 'originals', 'node_modules'}


def safe_public_path(root, relative):
    path = Path(relative)
    if path.is_absolute() or any(part.startswith('.') or part.lower() in PRIVATE_PARTS for part in path.parts) or path.suffix.lower() not in RUNTIME_EXT:
        return None
    resolved = (root / path).resolve()
    return resolved if resolved.is_relative_to(root.resolve()) and resolved.is_file() else None


class RuntimeLinks(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if value and key in ('src', 'href', 'poster', 'data-full', 'data-src'):
                self.links.append(value)


def public_files(root):
    """Frozen startup allowlist: named public pages and their runtime dependency closure."""
    pages = {'index.html'}
    for name in ('release-support/release-manifest.json', 'demo/studio/manifest.json', 'demo/mediterranean/manifest.json'):
        source = root / name
        if source.exists():
            document = json.loads(source.read_text(encoding='utf-8'))
            records = document.get('pages', [])
            if isinstance(records, list):
                pages.update(item.get('file', '') if isinstance(item, dict) else item for item in records)
    allowed, queue = {}, []
    for name in pages:
        if isinstance(name, str) and '/' not in name and name.endswith('.html'):
            candidate = safe_public_path(root, 'demo/' + name)
            if candidate:
                allowed['/demo/' + name] = candidate
                queue.append(candidate)
    # Script-generated image paths do not appear in static HTML.
    for folder in ('demo/assets', 'demo/studio/assets', 'demo/mediterranean/assets', 'img'):
        directory = root / folder
        if directory.is_dir():
            for candidate in directory.rglob('*'):
                if candidate.is_file() and candidate.suffix.lower() in RUNTIME_EXT - {'.html', '.js', '.css'}:
                    rel = candidate.relative_to(root).as_posix()
                    safe = safe_public_path(root, rel)
                    if safe:
                        allowed['/' + rel] = safe
    scanned = set()
    while queue:
        file = queue.pop()
        if file in scanned:
            continue
        scanned.add(file)
        text = file.read_text(encoding='utf-8')
        if file.suffix == '.html':
            parser = RuntimeLinks()
            parser.feed(text)
            urls = parser.links
        else:
            urls = re.findall(r'url\(\s*[\"\']?([^\s\)\"\']+)', text)
        for url in urls:
            parsed = urlsplit(url)
            if parsed.scheme or parsed.netloc or not parsed.path:
                continue
            target = (root / unquote(parsed.path).lstrip('/')) if parsed.path.startswith('/') else file.parent / unquote(parsed.path)
            try:
                relative = target.resolve().relative_to(root.resolve()).as_posix()
            except ValueError:
                continue
            if Path(relative).suffix == '.html':
                continue  # HTML must be explicitly selected above, not discovered by arbitrary links.
            safe = safe_public_path(root, relative)
            if safe:
                allowed['/' + relative] = safe
                if safe.suffix == '.css':
                    queue.append(safe)
    return allowed


@dataclass
class Config:
    api_key: str = field(default='', repr=False)
    model: str = 'claude-opus-5'
    enabled: bool = True
    prompt: str = ''
    origins: frozenset = frozenset()
    public_origin: str = ''
    trusted_proxies: tuple = ()
    public: dict = field(default_factory=dict)
    limiter: RateLimiter = field(default_factory=RateLimiter)
    provider: object = call_anthropic
    provider_settings: dict = field(default_factory=dict, repr=False)
    default_provider: str = 'gemini'
    archive: object = None
    inflight: threading.BoundedSemaphore = field(default_factory=lambda: threading.BoundedSemaphore(4))

    @property
    def ready(self):
        if self.provider_settings:
            return self.provider_ready(self.default_provider)
        return bool(self.enabled and self.api_key and self.model and self.prompt)

    def provider_ready(self, name):
        setting = self.provider_settings.get(name, {})
        return bool(self.enabled and self.prompt and setting.get('key') and setting.get('model'))

    def health(self):
        # Preserve the legacy injectable provider contract used by offline tests.
        value = {'enabled': self.enabled, 'ready': self.ready}
        if self.provider_settings:
            value.update(collection_enabled=self.archive is not None)
        return value


class Handler(BaseHTTPRequestHandler):
    server_version = 'ECOMaterial'
    sys_version = ''

    def setup(self):
        super().setup()
        self.connection.settimeout(15)

    @property
    def config(self):
        return self.server.config

    def log_message(self, *_):
        pass

    def send_error(self, code, message=None, explain=None):
        self.send_json(code, {'hiba': 'A kérés nem dolgozható fel.'})

    def origin_ok(self):
        if not self.host_ok():
            return False
        origin = self.headers.get('Origin')
        if not origin:
            return True
        if origin in self.config.origins:
            return True
        if self.config.public_origin and origin == self.config.public_origin:
            return True
        return origin == 'http://' + self.headers.get('Host', '') and self.headers.get('Host') in self.local_hosts()

    def local_hosts(self):
        port = self.server.server_port
        return {'127.0.0.1:' + str(port), 'localhost:' + str(port)}

    def host_ok(self):
        hosts = self.headers.get_all('Host', [])
        allowed = self.local_hosts()
        if self.config.public_origin:
            allowed.add(urlsplit(self.config.public_origin).netloc)
        return len(hosts) == 1 and hosts[0] in allowed

    def send_data(self, status, data, media='application/json; charset=utf-8', head=False):
        self.close_connection = True
        try:
            self.send_response(status)
            self.send_header('Content-Type', media)
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('Referrer-Policy', 'same-origin')
            self.send_header('Connection', 'close')
            origin = self.headers.get('Origin')
            if origin and self.origin_ok():
                self.send_header('Access-Control-Allow-Origin', origin)
                self.send_header('Vary', 'Origin')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            if not head:
                self.wfile.write(data)
        except (BrokenPipeError, ConnectionResetError, TimeoutError):
            pass

    def send_json(self, status, value, head=False):
        self.send_data(status, json.dumps(value, ensure_ascii=False).encode('utf-8'), head=head)

    def do_OPTIONS(self):
        if not self.host_ok():
            return self.send_json(421, {'hiba': 'Nem engedélyezett kiszolgálónév.'})
        if self.path not in ('/api/material-analyze', '/api/material-health'):
            return self.send_json(404, {'hiba': 'Nincs ilyen végpont.'})
        if not self.origin_ok() or self.headers.get('Access-Control-Request-Method', '') not in ('GET', 'POST'):
            return self.send_json(403, {'hiba': 'Ez az eredet nem engedélyezett.'})
        headers = self.headers.get('Access-Control-Request-Headers', '').lower().split(',')
        if any(value.strip() not in ('', 'content-type') for value in headers):
            return self.send_json(403, {'hiba': 'Nem engedélyezett kérésfejléc.'})
        return self.send_data(204, b'')

    def do_HEAD(self):
        self.do_GET(head=True)

    def do_GET(self, head=False):
        if not self.host_ok():
            return self.send_json(421, {'hiba': 'Nem engedélyezett kiszolgálónév.'}, head)
        path = urlsplit(self.path).path
        if path == '/api/material-health':
            return self.send_json(200, self.config.health(), head)
        if path in ('/', '/demo/'):
            path = '/demo/index.html'
        try:
            decoded = unquote(path, errors='strict')
        except UnicodeError:
            return self.send_json(404, {'hiba': 'Nincs ilyen oldal.'}, head)
        if '\\' in decoded or any(part.startswith('.') for part in decoded.split('/') if part):
            return self.send_json(404, {'hiba': 'Nincs ilyen oldal.'}, head)
        file = self.config.public.get(decoded)
        if file:
            try:
                return self.send_data(200, file.read_bytes(), mimetypes.guess_type(file.name)[0] or 'application/octet-stream', head)
            except OSError:
                pass
        return self.send_json(404, {'hiba': 'Nincs ilyen oldal.'}, head)

    def do_POST(self):
        if not self.host_ok():
            return self.send_json(421, {'hiba': 'Nem engedélyezett kiszolgálónév.'})
        if self.path != '/api/material-analyze':
            return self.send_json(404, {'hiba': 'Nincs ilyen végpont.'})
        if not self.origin_ok():
            return self.send_json(403, {'hiba': 'Ez az eredet nem engedélyezett.'})
        lengths = self.headers.get_all('Content-Length', [])
        if self.headers.get('Transfer-Encoding') or len(lengths) != 1 or not re.fullmatch(r'[0-9]{1,8}', lengths[0]):
            return self.send_json(411, {'hiba': 'Érvényes Content-Length fejléc szükséges.'})
        size = int(lengths[0])
        if size < 1 or size > MAX_BODY:
            return self.send_json(413, {'hiba': 'A kérés mérete túl nagy vagy üres.'})
        if self.headers.get('Content-Type', '').split(';')[0].strip().lower() != 'application/json':
            return self.send_json(415, {'hiba': 'JSON-kérés szükséges.'})
        if not self.config.ready:
            return self.send_json(503, {'hiba': 'A képfelismerés jelenleg nem érhető el. Egyeztess velünk telefonon.'})
        if not self.config.inflight.acquire(blocking=False):
            return self.send_json(503, {'hiba': 'Az elemző foglalt. Próbáld újra később.'})
        archive_id = None
        meta = {}
        try:
            raw = self.rfile.read(size)
            if len(raw) != size:
                raise InputError('A kérés hiányosan érkezett meg.')
            b64, media, note = validate_input(raw)
            options = strict_json(raw)
            selected = self.config.default_provider
            if 'provider' in options:
                raise InputError('A képelemző beállítását az üzemeltető kezeli.')
            consent = options.get('archive_consent', False)
            if self.config.provider_settings and not self.config.provider_ready(selected):
                return self.send_json(503, {'hiba': 'A kiválasztott képelemző jelenleg nem érhető el.'})
            if consent and self.config.archive is None:
                return self.send_json(503, {'hiba': 'A fotógyűjtő nem érhető el. Megőrzés nélkül továbbra is kérhetsz elemzést.'})
            ip = client_ip(self.client_address[0], self.headers.get('X-Forwarded-For', ''), self.config.trusted_proxies)
            if not self.config.limiter.reserve(ip):
                return self.send_json(429, {'hiba': 'Az elemzési keret most betelt. Próbáld újra később.'})
            if self.config.provider_settings:
                spec = self.config.provider_settings[selected]
                meta = {'archive_requested': consent, 'archive_saved': False, 'reference_count': 0}
                try:
                    references = self.config.archive.references() if self.config.archive else []
                    if consent:
                        archive_id = self.config.archive.collect(b64, media, selected, spec['model'])
                        meta['archive_saved'] = True
                except Exception:
                    return self.send_json(503, {'hiba': 'A privát fotógyűjtő nem érhető el. Az elemzés nem indult el.', '_meta': meta})
                meta['reference_count'] = len(references)
                result = sanitize_result(providers.call(selected, spec['key'], spec['model'], self.config.prompt,
                                                        b64, media, note, references=references))
            else:
                result = self.config.provider(self.config, b64, media, note)
            # Even a replacement provider must obey the public output contract.
            if not isinstance(result, dict) or set(result) != set(FIELDS):
                raise ProviderError('invalid response')
            if archive_id:
                try:
                    self.config.archive.annotate(archive_id, result)
                except Exception:
                    # The photo is already safely collected; annotation is optional.
                    meta['annotation_saved'] = False
            return self.send_json(200, {**result, **({'_meta': meta} if meta else {})})
        except InputError as error:
            return self.send_json(error.status, {'hiba': str(error)})
        except (TimeoutError, socket.timeout):
            return self.send_json(408, {'hiba': 'A feltöltés időtúllépés miatt megszakadt.'})
        except Exception:
            return self.send_json(502, {'hiba': 'Az elemzés most nem érhető el. Próbáld újra később.', **({'_meta': meta} if meta else {})})
        finally:
            if archive_id:
                try:
                    self.config.archive.gallery()
                except Exception:
                    pass  # Owner CLI can regenerate the private gallery later.
            self.config.inflight.release()


class Server(ThreadingHTTPServer):
    daemon_threads = True
    request_queue_size = 16
    allow_reuse_address = False
    allow_reuse_port = False

    def server_bind(self):
        # Windows SO_REUSEADDR can otherwise admit an existing wildcard listener.
        if os.name == 'nt' and hasattr(socket, 'SO_EXCLUSIVEADDRUSE'):
            # An exclusive specific-address bind can still coexist with an older
            # non-exclusive wildcard listener on Windows. Reject occupied ports
            # with a wildcard reservation probe before binding the loopback host.
            if self.server_address[1] and self.address_family == socket.AF_INET:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
                    probe.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
                    probe.bind(('0.0.0.0', self.server_address[1]))
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        super().server_bind()

    def __init__(self, address, config):
        self.config = config
        self.workers = threading.BoundedSemaphore(8)
        super().__init__(address, Handler)

    def process_request(self, request, address):
        if not self.workers.acquire(blocking=False):
            try:
                data = b'{"hiba":"Az elemzo foglalt."}'
                request.sendall(b'HTTP/1.1 503 Service Unavailable\r\nContent-Type: application/json\r\nContent-Length: ' + str(len(data)).encode('ascii') + b'\r\nConnection: close\r\nCache-Control: no-store\r\n\r\n' + data)
            except OSError:
                pass
            self.shutdown_request(request)
            return
        try:
            super().process_request(request, address)
        except Exception:
            self.workers.release()
            raise

    def process_request_thread(self, request, address):
        try:
            super().process_request_thread(request, address)
        finally:
            self.workers.release()

    def handle_error(self, request, client_address):
        pass  # No raw exception, address, note or response logging.


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', default=8096, type=int)
    parser.add_argument('--serve-demo', action='store_true')
    parser.add_argument('--dev-cors', action='store_true')
    args = parser.parse_args()
    allowed = set(filter(None, (s.strip() for s in os.getenv('MATERIAL_ALLOWED_ORIGINS', '').split(','))))
    public_origin = os.getenv('MATERIAL_PUBLIC_ORIGIN', '').strip()
    if args.dev_cors:
        allowed.update(('http://127.0.0.1:8089', 'http://localhost:8089'))
    try:
        trusted = tuple(ipaddress.ip_network(s.strip()) for s in os.getenv('MATERIAL_TRUSTED_PROXIES', '').split(',') if s.strip())
        daily = int(os.getenv('MATERIAL_DAILY_LIMIT', os.getenv('KARPIT_NAPI_LIMIT', '200')))
        hourly = int(os.getenv('MATERIAL_IP_HOURLY_LIMIT', os.getenv('KARPIT_IP_LIMIT', '10')))
        if not 1 <= daily <= 100000 or not 1 <= hourly <= 1000:
            raise ValueError()
        for origin in allowed | ({public_origin} if public_origin else set()):
            parsed = urlsplit(origin)
            if parsed.scheme not in ('http', 'https') or not parsed.netloc or parsed.path or parsed.query or parsed.fragment or parsed.username:
                raise ValueError()
    except ValueError:
        parser.error('Érvénytelen korlát, proxyhálózat vagy engedélyezett eredet.')
    settings = {
        'gemini': {'key': os.getenv('GEMINI_API_KEY', os.getenv('GOOGLE_API_KEY', '')), 'model': 'gemini-2.5-flash-lite', 'label': 'Gemini 2.5 Flash-Lite'},
        'openai': {'key': os.getenv('OPENAI_API_KEY', ''), 'model': 'gpt-5.6-luna', 'label': 'GPT-5.6 Luna'},
    }
    default_provider = os.getenv('MATERIAL_PROVIDER', 'gemini')
    if default_provider not in settings:
        parser.error('MATERIAL_PROVIDER: gemini vagy openai lehet.')
    photo_archive = None
    if os.getenv('MATERIAL_COLLECTION_ENABLED', '1') == '1':
        try:
            archive_root = Path(os.getenv('MATERIAL_ARCHIVE_DIR', str(PROJECT.parent / 'anyag-referenciak'))).resolve()
            # Never put visitor photos in a static website's source/output tree.
            if archive_root.is_relative_to(PROJECT):
                raise ValueError('unsafe archive folder')
            photo_archive = Archive(archive_root)
            photo_archive.gallery()
        except Exception:
            parser.error('A privát fotógyűjtő nem hozható létre. Használj írható, nem nyilvános mappát.')
    config = Config(provider_settings=settings, default_provider=default_provider, archive=photo_archive,
                    enabled=os.getenv('MATERIAL_ENABLED', '1') == '1', prompt=(HERE / 'prompt.txt').read_text(encoding='utf-8'),
                    origins=frozenset(allowed), public_origin=public_origin, trusted_proxies=trusted, limiter=RateLimiter(daily, hourly),
                    public=public_files(PROJECT) if args.serve_demo else {})
    try:
        server = Server((args.host, args.port), config)
    except OSError:
        parser.error('A kiszolgáló nem indítható ezen a címen/porton. Lehet, hogy már másik szolgáltatás használja; válassz szabad portot.')
    print(f'ECO Clean material API: http://{args.host}:{args.port} (ready={str(config.ready).lower()}, demo={args.serve_demo})', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
