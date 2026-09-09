"""Verify exact reversible copy edits, then verify the recovered parent release.

prepare(manifest, read_current=None) -> (errors, parent_manifest, reader).
reader(file) -> bytes; read_current lets a later layer supply its exact parent.
The returned parent/reader are usable only when errors is empty. No files are
written. Full JavaScript AST/wording review belongs to the bound full release
verification; this dependency-free gate additionally checks lexical contexts.
"""
from pathlib import Path, PurePosixPath
from html.parser import HTMLParser
from urllib.parse import urlsplit
import hashlib
import importlib.util
import json
import re

ROOT = Path(__file__).resolve().parent.parent
MAX_FILE = 32 * 1024 * 1024
KINDS = {'text', 'attribute', 'js-string', 'jsonld-string', 'asset-version'}
TEXT_ATTRS = {'alt', 'title', 'placeholder', 'aria-label', 'aria-description', 'aria-valuetext'}
META_TEXT = {'description', 'keywords', 'og:title', 'og:description', 'og:site_name', 'twitter:title', 'twitter:description'}
JSON_TEXT = {'name', 'description', 'text', 'headline', 'alternateName', 'caption'}
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def digest(value):
    require(isinstance(value, str) and re.fullmatch('[0-9a-f]{64}', value), 'Invalid SHA-256')
    return value


def relative(value):
    require(isinstance(value, str) and value and '\\' not in value and '\x00' not in value,
            'Invalid relative path')
    path = PurePosixPath(value)
    require(not path.is_absolute() and str(path) == value and not any(part in ('.', '..') or ':' in part for part in path.parts),
            'Non-canonical relative path')
    return path


def read_path(root, name):
    parts = relative(name).parts
    target = root
    require(not target.is_symlink() and not (hasattr(target, 'is_junction') and target.is_junction()), 'Symlink root forbidden')
    for part in parts:
        target = target / part
        require(not target.is_symlink() and not (hasattr(target, 'is_junction') and target.is_junction()), 'Symlink path forbidden: ' + name)
    require(target.resolve().is_relative_to(root.resolve()) and target.is_file(), 'Invalid file: ' + name)
    require(target.stat().st_size <= MAX_FILE, 'File exceeds proof limit: ' + name)
    return target.read_bytes()


def artifact(name):
    return read_path(ROOT / 'release', name)


def bound(reference, expected):
    require(isinstance(reference, dict) and set(reference) == {'path', 'sha256'}, 'Invalid provenance reference')
    require(reference['path'] == expected, 'Unexpected provenance path')
    data = read_path(ROOT, expected)
    require(sha(data) == digest(reference['sha256']), 'Provenance hash mismatch: ' + expected)
    return json.loads(data)


def js_strings(source):
    """Conservative string/quasi spans. Operators/comments/regexes stay exact.

    Handles escapes, comments, regex character classes and nested template
    expressions. This is a lexical guard, not a substitute for the Node AST gate.
    """
    spans = []
    size = len(source)

    def quoted(i, quote):
        start = i + 1
        i = start
        while i < size:
            if source[i] == '\\':
                i += 2
            elif source[i] == quote:
                spans.append((start, i))
                return i + 1
            else:
                require(source[i] not in '\r\n', 'Unescaped newline in JavaScript string')
                i += 1
        raise ValueError('Unterminated JavaScript string')

    def template(i):
        start = i = i + 1
        while i < size:
            if source[i] == '\\':
                i += 2
            elif source[i] == '`':
                spans.append((start, i))
                return i + 1
            elif source.startswith('${', i):
                spans.append((start, i))
                i = scan(i + 2, True)
                start = i
            else:
                i += 1
        raise ValueError('Unterminated JavaScript template')

    def scan(i=0, expression=False):
        regex_allowed, braces = True, 0
        while i < size:
            c = source[i]
            if c.isspace():
                i += 1
                continue
            if source.startswith('//', i):
                end = source.find('\n', i + 2)
                i = size if end < 0 else end + 1
                continue
            if source.startswith('/*', i):
                end = source.find('*/', i + 2)
                require(end >= 0, 'Unterminated JavaScript comment')
                i = end + 2
                continue
            if c in "'\"":
                i = quoted(i, c)
                regex_allowed = False
                continue
            if c == '`':
                i = template(i)
                regex_allowed = False
                continue
            if c == '/' and regex_allowed:
                j, bracket = i + 1, False
                while j < size:
                    if source[j] == '\\':
                        j += 2
                        continue
                    if source[j] == '[':
                        bracket = True
                    elif source[j] == ']':
                        bracket = False
                    elif source[j] == '/' and not bracket:
                        break
                    require(source[j] not in '\r\n', 'Ambiguous JavaScript regex context')
                    j += 1
                require(j < size, 'Unterminated JavaScript regex')
                i = j + 1
                while i < size and source[i].isalpha():
                    i += 1
                regex_allowed = False
                continue
            if c.isalpha() or c in '_$':
                match = re.match(r'[\w$]+', source[i:])
                word = match.group(0)
                i += len(word)
                regex_allowed = word in {'return', 'throw', 'case', 'delete', 'void', 'typeof', 'yield', 'await', 'in', 'of', 'instanceof'}
                continue
            if c.isdigit():
                match = re.match(r'[\w.]+', source[i:])
                i += len(match.group(0))
                regex_allowed = False
                continue
            if c == '{':
                braces += 1
            elif c == '}':
                if expression and braces == 0:
                    return i + 1
                braces -= 1
            regex_allowed = c not in ')]}.'
            if source.startswith(('++', '--'), i):
                regex_allowed = False
                i += 1
            i += 1
        require(not expression, 'Unterminated JavaScript template expression')
        return i

    scan()
    return sorted(spans)


def masked(source, spans):
    result, cursor = [], 0
    for start, end in spans:
        result.extend((source[cursor:start], '\x00COPY\x00'))
        cursor = end
    result.append(source[cursor:])
    return ''.join(result)


def json_shape(value, key=None):
    if isinstance(value, dict):
        return {k: json_shape(v, k) for k, v in value.items()}
    if isinstance(value, list):
        return [json_shape(v, key) for v in value]
    if isinstance(value, str) and key in JSON_TEXT:
        return '\x00COPY\x00'
    return value


def asset_attribute(tag, attrs, name):
    return (tag == 'script' and name == 'src') or (tag == 'link' and name == 'href' and
            'stylesheet' in attrs.get('rel', '').lower().split())


def text_attribute(tag, attrs, name):
    return name in TEXT_ATTRS or (name == 'content' and tag == 'meta' and
            (attrs.get('name', '').lower() in META_TEXT or attrs.get('property', '').lower() in META_TEXT)) or (
            name == 'value' and tag == 'input' and attrs.get('type', '').lower() in {'button', 'submit', 'reset'})


class HtmlContexts(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=False)
        self.source, self.ranges, self.signature, self.stack = source, [], [], []
        self.lines = [0]
        self.lines.extend(match.end() for match in re.finditer('\n', source))
        self.feed(source)
        self.close()

    def source_offset(self):
        line, column = self.getpos()
        return self.lines[line - 1] + column

    def add(self, start, end, kind, value=None):
        if self.ranges and self.ranges[-1][1] == start and self.ranges[-1][2:] == (kind, value):
            previous = self.ranges.pop()
            start = previous[0]
        self.ranges.append((start, end, kind, value))

    def start(self, tag, attrs, closed=False):
        attributes = dict(attrs)
        signature = []
        for name, value in attrs:
            editable = text_attribute(tag, attributes, name) or asset_attribute(tag, attributes, name)
            signature.append((name, '\x00COPY\x00' if editable else value))
        self.signature.append(('startend' if closed else 'start', tag, signature))
        raw = self.get_starttag_text()
        i = re.match(r'<\s*[^\s/>]+', raw).end()
        while i < len(raw):
            match = re.match(r'\s*([^\s=/>]+)', raw[i:])
            if not match:
                break
            name = match.group(1).lower()
            i += match.end()
            while i < len(raw) and raw[i].isspace():
                i += 1
            if i >= len(raw) or raw[i] != '=':
                continue
            i += 1
            while i < len(raw) and raw[i].isspace():
                i += 1
            require(i < len(raw), 'Malformed attribute')
            if raw[i] in "'\"":
                quote, start = raw[i], i + 1
                end = raw.find(quote, start)
                require(end >= 0, 'Unterminated attribute')
                i = end + 1
            else:
                start = i
                value = re.match(r'[^\s>]+', raw[i:])
                require(value, 'Missing attribute value')
                end = i + len(value.group(0))
                i = end
            kind = 'attribute' if text_attribute(tag, attributes, name) else 'asset-version' if asset_attribute(tag, attributes, name) else None
            if kind:
                self.add(self.source_offset() + start, self.source_offset() + end, kind, raw[start:end])
        if not closed and tag not in VOID:
            self.stack.append((tag, attributes))

    def handle_starttag(self, tag, attrs):
        self.start(tag, attrs)

    def handle_startendtag(self, tag, attrs):
        self.start(tag, attrs, True)

    def handle_endtag(self, tag):
        self.signature.append(('end', tag))
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                del self.stack[index:]
                break

    def handle_data(self, data):
        start = self.source_offset()
        tag, attrs = self.stack[-1] if self.stack else ('', {})
        if tag == 'style':
            self.signature.append(('style', data))
        elif tag == 'script':
            media = attrs.get('type', '').lower()
            if media == 'application/ld+json':
                value = json.loads(data)
                self.signature.append(('jsonld', json_shape(value)))
                spans = js_strings(data)
                for a, b in spans:
                    if not data[b + 1:].lstrip().startswith(':'):
                        self.add(start + a, start + b, 'jsonld-string')
            elif media in ('', 'module', 'text/javascript', 'application/javascript'):
                spans = js_strings(data)
                self.signature.append(('script', masked(data, spans)))
                for a, b in spans:
                    self.add(start + a, start + b, 'js-string')
            else:
                self.signature.append(('script-opaque', data))
        else:
            self.add(start, start + len(data), 'text')

    def entity(self, name, prefix):
        start = self.source_offset()
        end = start + len(name) + len(prefix)
        if self.source[end:end + 1] == ';':
            end += 1
        self.add(start, end, 'text')

    def handle_entityref(self, name):
        self.entity(name, '&')

    def handle_charref(self, name):
        self.entity(name, '&#')

    def handle_comment(self, data):
        self.signature.append(('comment', data))

    def handle_decl(self, decl):
        self.signature.append(('decl', decl))

    def handle_pi(self, data):
        self.signature.append(('pi', data))


def contexts(data, file):
    source = data.decode('utf-8')
    if file.endswith('.html'):
        parsed = HtmlContexts(source)
        ranges, signature = parsed.ranges, parsed.signature
    elif file.endswith('.js'):
        spans = js_strings(source)
        ranges = [(a, b, 'js-string', None) for a, b in spans]
        signature = masked(source, spans)
    else:
        raise ValueError('Copy scope must be HTML or JavaScript: ' + file)
    positions, count = [0], 0
    for char in source:
        count += len(char.encode('utf-8'))
        positions.append(count)
    return [(positions[a], positions[b], kind, value) for a, b, kind, value in ranges], signature


def covering(ranges, start, size, kind):
    return next((entry for entry in ranges if entry[2] == kind and entry[0] <= start and start + size <= entry[1]), None)


def technical_string(value):
    return bool(re.match(r'^(?:(?:https?|mailto|tel|ftp|file|data|javascript|ws|wss):|//|#[A-Za-z][\w:-]*$|(?:\.?\.?/)?(?:api|assets|ui|material-recognition)/)', value, re.I)
                or re.fullmatch(r'[^\s<>]+\.(?:html?|js|css|json|webp|png|jpe?g|svg)(?:[?#].*)?', value, re.I))


def validate_asset(file, old, new, read_current):
    # Only a derived cache version may change; no path/query/host substitution.
    before, after = urlsplit(old), urlsplit(new)
    require(not before.scheme and not before.netloc and not before.fragment and
            not after.scheme and not after.netloc and not after.fragment, 'Asset revision must be local')
    require(before.path == after.path and not before.path.startswith('/') and
            re.fullmatch(r'v=[0-9a-f]{12}', after.query) and
            (not before.query or re.fullmatch(r'v=[0-9a-f]{12}', before.query)), 'Only the asset ?v= hash may change')
    relative(before.path)
    target = str(PurePosixPath(file).parent / before.path)
    require(target.endswith(('.js', '.css')), 'Asset version target must be JS or CSS')
    require(after.query == 'v=' + sha(read_current(target))[:12], 'Asset revision does not match current content')


def validate_context(file, before, after, edits, read_current):
    old_ranges, old_signature = contexts(before, file)
    new_ranges, new_signature = contexts(after, file)
    require(old_signature == new_signature, 'HTML structure/technical attributes or JavaScript syntax changed: ' + file)
    delta = 0
    for edit in edits:
        old_bytes, new_bytes = edit['before'].encode('utf-8'), edit['after'].encode('utf-8')
        old_range = covering(old_ranges, edit['start'], len(old_bytes), edit['kind'])
        new_range = covering(new_ranges, edit['start'] + delta, len(new_bytes), edit['kind'])
        require(old_range is not None and (not new_bytes or new_range is not None), 'Edit outside declared text context: ' + file)
        if edit['kind'] == 'js-string':
            old_value = before[old_range[0]:old_range[1]].decode('utf-8')
            new_value = after[new_range[0]:new_range[1]].decode('utf-8') if new_range else ''
            require(not technical_string(old_value) and not technical_string(new_value), 'JavaScript URL/path/anchor is not consumer copy: ' + file)
        if edit['kind'] == 'asset-version':
            require(new_range is not None, 'Cannot remove asset reference')
            validate_asset(file, old_range[3], new_range[3], read_current)
        delta += len(new_bytes) - len(old_bytes)


def recover(current, record):
    edits = record['edits']
    require(isinstance(edits, list) and 0 < len(edits) <= 10000, 'Missing or excessive edit records')
    pieces, cursor, previous_end, delta = [], 0, 0, 0
    for edit in edits:
        require(isinstance(edit, dict) and set(edit) == {'start', 'before', 'after', 'kind'}, 'Invalid edit schema')
        start, before, after = edit['start'], edit['before'], edit['after']
        require(type(start) is int and 0 <= start <= MAX_FILE and start >= previous_end, 'Overlapping/unsorted edit offsets')
        require(edit['kind'] in KINDS and isinstance(before, str) and isinstance(after, str), 'Invalid edit kind or text')
        require(before and before != after and max(len(before), len(after)) <= 1024 * 1024, 'Empty/no-op/oversized edit')
        old_bytes, new_bytes = before.encode('utf-8'), after.encode('utf-8')
        position = start + delta
        require(cursor <= position <= len(current) and current[position:position + len(new_bytes)] == new_bytes,
                'Replacement bytes do not match current artifact')
        pieces.extend((current[cursor:position], old_bytes))
        cursor = position + len(new_bytes)
        previous_end = start + len(old_bytes)
        delta += len(new_bytes) - len(old_bytes)
    pieces.append(current[cursor:])
    previous = b''.join(pieces)
    require(previous_end <= len(previous) <= MAX_FILE, 'Edit outside original artifact')
    forward = previous
    for edit in reversed(edits):
        a, old_bytes, new_bytes = edit['start'], edit['before'].encode('utf-8'), edit['after'].encode('utf-8')
        require(forward[a:a + len(old_bytes)] == old_bytes, 'Original replacement bytes differ')
        forward = forward[:a] + new_bytes + forward[a + len(old_bytes):]
    require(forward == current, 'Forward/reverse copy proof differs')
    return previous


def prepare(manifest, read_current=None):
    if read_current is None:
        read_current = artifact
    errors, parent, restored = [], None, {}
    def reader(file):
        return restored[file] if file in restored else read_current(file)
    try:
        require(isinstance(manifest, dict), 'Invalid release manifest')
        overlay = bound(manifest['copyOverlay'], 'release-support/copy-tone/overlay.json')
        require(isinstance(overlay, dict) and set(overlay) == {'version', 'baseline', 'files'} and
                type(overlay['version']) is int and overlay['version'] == 1, 'Unsupported copy overlay schema')
        baseline = overlay['baseline']
        require(isinstance(baseline, dict) and set(baseline) == {'manifest', 'manifestSha256', 'verification', 'verificationSha256'}, 'Invalid copy baseline schema')
        parent = bound({'path': baseline['manifest'], 'sha256': baseline['manifestSha256']},
                       'release-support/copy-tone/baseline-manifest.json')
        prior = bound({'path': baseline['verification'], 'sha256': baseline['verificationSha256']},
                      'release-support/copy-tone/baseline-verification.json')
        require('copyOverlay' not in parent, 'Nested copy baselines are forbidden')
        require(prior.get('issues') == [] and prior.get('manifestSha256') == baseline['manifestSha256'], 'Copy baseline was not exactly verified')
        require(not parent.get('unresolved'), 'Copy baseline has unresolved dependencies')
        require(set(manifest) == set(parent) | {'copyOverlay'}, 'Copy overlay changed release metadata keys')
        for key, value in parent.items():
            require(key == 'files' or manifest[key] == value, 'Copy overlay changed release metadata: ' + key)
        require(set(manifest['files']) == set(parent['files']), 'Copy overlay changed artifact file set')
        records = overlay['files']
        require(isinstance(records, list) and len(records) <= len(parent['files']), 'Invalid copy file scope')
        by_file = {}
        for record in records:
            require(isinstance(record, dict) and set(record) == {'file', 'beforeSha256', 'afterSha256', 'edits'}, 'Invalid copy file record')
            file = record['file']
            relative(file)
            require(file in parent['files'] and file not in by_file and file.endswith(('.html', '.js')), 'Duplicate or out-of-scope copy file')
            require(digest(record['beforeSha256']) == parent['files'][file]['sha256'] and
                    digest(record['afterSha256']) == manifest['files'][file]['sha256'], 'Copy file hash does not bind manifests')
            by_file[file] = record
        for file, old_record in parent['files'].items():
            current = read_current(file)
            current_record = manifest['files'][file]
            require(sha(current) == current_record['sha256'], 'Current artifact hash mismatch: ' + file)
            if file in by_file:
                expected = dict(old_record, sha256=sha(current), bytes=len(current))
                require(current_record == expected, 'Copy changed unrelated file metadata: ' + file)
                restored[file] = recover(current, by_file[file])
                require(sha(restored[file]) == old_record['sha256'], 'Recovered baseline hash mismatch: ' + file)
                validate_context(file, restored[file], current, by_file[file]['edits'], read_current)
            else:
                require(current_record == old_record and sha(current) == old_record['sha256'], 'Unlisted artifact changed: ' + file)
        if parent.get('widgetOverlay'):
            spec = importlib.util.spec_from_file_location('copy_parent_widget_gate', ROOT / 'release-support/verify-widget-overlay.py')
            gate = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(gate)
            gate.ROOT = ROOT
            errors.extend(gate.verify(parent, reader=reader))
    except (OSError, ValueError, KeyError, TypeError, UnicodeError, AttributeError, IndexError, RecursionError) as exc:
        errors.append('Copy proof incomplete: ' + str(exc))
    return errors, parent, reader


def verify(manifest, read_current=None):
    return prepare(manifest, read_current=read_current)[0]


if __name__ == '__main__':
    import sys
    manifest = json.loads((ROOT / 'release-support/release-manifest.json').read_text('utf-8'))
    errors = verify(manifest)
    print(json.dumps({'issues': errors}, ensure_ascii=False))
    sys.exit(bool(errors))
