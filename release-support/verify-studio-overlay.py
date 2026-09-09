"""Bind a Studio release to its exact reviewed parent, including copy/widget proof.

prepare(manifest) -> (errors, parent_manifest, reader), reader(file) -> bytes.
The reader is valid only when errors is empty. No files are written. This gate
checks scope, byte provenance and the original homepage; the full release gate
also checks Studio DOM preservation and JavaScript syntax independently.
"""
from pathlib import Path, PurePosixPath
from html.parser import HTMLParser
import hashlib
import importlib.util
import json
import re

ROOT = Path(__file__).resolve().parent.parent
MAX_FILE = 32 * 1024 * 1024
BASE = 'release-support/studio/'
START = b'<!-- ECO-STUDIO:handoff:START -->'
END = b'<!-- ECO-STUDIO:handoff:END -->'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def digest(value):
    require(isinstance(value, str) and re.fullmatch('[0-9a-f]{64}', value), 'Invalid SHA-256')
    return value


def relative(value):
    require(isinstance(value, str) and value and '\\' not in value and '\x00' not in value, 'Invalid relative path')
    path = PurePosixPath(value)
    require(not path.is_absolute() and str(path) == value and
            not any(part in ('.', '..') or ':' in part for part in path.parts), 'Non-canonical relative path')
    return path


def read_path(root, name):
    target = root
    for part in ('', *relative(name).parts):
        target = target / part
        require(not target.is_symlink() and not (hasattr(target, 'is_junction') and target.is_junction()),
                'Symlink/junction path forbidden: ' + name)
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


class Handoff(HTMLParser):
    def __init__(self):
        super().__init__()
        self.events = []

    def handle_starttag(self, tag, attrs):
        require(len(dict(attrs)) == len(attrs), 'Duplicate handoff attribute')
        self.events.append(('start', tag, dict(attrs)))

    def handle_endtag(self, tag):
        self.events.append(('end', tag, {}))

    def handle_data(self, data):
        require(not data.strip(), 'Inline handoff text/script forbidden')

    def handle_comment(self, data):
        raise ValueError('Nested handoff comment forbidden')

    def handle_decl(self, data):
        raise ValueError('Handoff declaration forbidden')


def check_handoff(current, original, dependencies):
    require(START not in original and END not in original, 'Handoff already exists in baseline')
    require(current.count(START) == current.count(END) == 1, 'Missing/duplicate homepage handoff marker')
    a, b = current.index(START), current.index(END)
    require(a < b and current[b + len(END):].startswith(b'</body>'), 'Handoff must be inserted immediately before </body>')
    require(current[:a] + current[b + len(END):] == original, 'Homepage changed outside exact handoff block')
    doc = Handoff()
    doc.feed(current[a + len(START):b].decode('utf-8'))
    doc.close()
    require([(event, tag) for event, tag, _ in doc.events] ==
            [('start', 'link'), ('start', 'script'), ('end', 'script'), ('start', 'script'), ('end', 'script')],
            'Handoff must contain only the stylesheet and two deferred scripts')
    for index, file in ((0, 'studio/handoff.css'), (1, 'studio/configurator.js'), (3, 'studio/booking-handoff.js')):
        attrs = doc.events[index][2]
        key = 'href' if index == 0 else 'src'
        require(set(attrs) == ({'href', 'rel'} if index == 0 else {'src', 'defer'}), 'Unexpected handoff attributes')
        require(attrs['rel'] == 'stylesheet' if index == 0 else attrs['defer'] in (None, ''), 'Invalid handoff stylesheet/defer')
        require(file in dependencies and isinstance(attrs[key], str), 'Missing handoff dependency')
        require(attrs[key] == file + '?v=' + dependencies[file]['sha256'][:12], 'Handoff asset revision/path mismatch')


class StudioPage(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids, self.mounts, self.bodies = [], [], []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if 'id' in a:
            self.ids.append(a['id'])
        if 'data-studio-configurator' in a:
            self.mounts.append(a)
        if tag == 'body':
            self.bodies.append(a)


def check_studio_page(file, data):
    doc = StudioPage()
    doc.feed(data.decode('utf-8-sig'))
    require(len(doc.bodies) == 1 and 'eco-studio' in doc.bodies[0].get('class', '').split(), 'Studio body class missing: ' + file)
    require(doc.ids.count('studio-kalkulator') == 1 and len(doc.mounts) == 1, 'Missing/duplicate Studio calculator: ' + file)
    mount = doc.mounts[0]
    city = file[len('karpittisztitas-'):-len('.html')]
    require(mount.get('data-city') == city and mount.get('data-source-page') == file and
            mount.get('data-assets') == 'studio/assets', 'Studio calculator route mismatch: ' + file)


def prepare(manifest):
    errors, parent, restored = [], None, {}
    def reader(file):
        return restored[file] if file in restored else artifact(file)
    try:
        require(isinstance(manifest, dict), 'Invalid release manifest')
        overlay = bound(manifest['studioOverlay'], BASE + 'overlay.json')
        require(isinstance(overlay, dict) and set(overlay) == {'version', 'baseline', 'pages', 'dependencies', 'sources'} and
                type(overlay['version']) is int and overlay['version'] == 1, 'Unsupported Studio overlay schema')
        baseline = overlay['baseline']
        require(isinstance(baseline, dict) and set(baseline) == {'manifest', 'manifestSha256', 'verification', 'verificationSha256'},
                'Invalid Studio baseline schema')
        parent = bound({'path': baseline['manifest'], 'sha256': baseline['manifestSha256']}, BASE + 'baseline-manifest.json')
        prior = bound({'path': baseline['verification'], 'sha256': baseline['verificationSha256']}, BASE + 'baseline-verification.json')
        require('studioOverlay' not in parent, 'Nested Studio baseline forbidden')
        require(prior.get('issues') == [] and prior.get('manifestSha256') == baseline['manifestSha256'], 'Studio baseline was not exactly verified')
        require(not parent.get('unresolved'), 'Studio baseline has unresolved dependencies')
        require(set(manifest) == set(parent) | {'studioOverlay'}, 'Studio changed release metadata keys')
        for key, value in parent.items():
            require(key == 'files' or manifest[key] == value, 'Studio changed release metadata: ' + key)
        med = parent['approvedMediterranean']['pages']
        require(isinstance(med, list) and len(set(med)) == len(med) == 15, 'Invalid preserved Mediterranean scope')
        expected = {'index.html'} | {name for name in parent['files']
                                    if re.fullmatch(r'karpittisztitas-[a-z]+\.html', name) and name not in med}
        records = overlay['pages']
        require(isinstance(records, list) and len(records) == len(expected) == 27, 'Studio must cover exactly 26 online upholstery pages and index')
        pages = {}
        for record in records:
            require(isinstance(record, dict) and set(record) == {'file', 'baseline', 'beforeSha256', 'afterSha256'}, 'Invalid Studio page record')
            file = record['file']
            relative(file)
            require(file in expected and file not in pages, 'Duplicate/out-of-scope Studio page: ' + file)
            require(record['baseline'] == BASE + 'baseline/' + file, 'Unexpected Studio HTML baseline path')
            original = read_path(ROOT, record['baseline'])
            require(sha(original) == digest(record['beforeSha256']) == parent['files'][file]['sha256'], 'Studio baseline HTML hash mismatch: ' + file)
            require(digest(record['afterSha256']) == manifest['files'][file]['sha256'], 'Studio output hash not bound to manifest: ' + file)
            restored[file], pages[file] = original, record
        deps = {}
        require(isinstance(overlay['dependencies'], list) and 0 < len(overlay['dependencies']) <= 64, 'Invalid Studio dependency list')
        for dep in overlay['dependencies']:
            require(isinstance(dep, dict) and set(dep) == {'file', 'sha256', 'bytes'}, 'Invalid Studio dependency record')
            file = dep['file']
            relative(file)
            require(file.startswith('studio/') and PurePosixPath(file).suffix in {'.css', '.js', '.webp'} and
                    file not in parent['files'] and file not in deps, 'Duplicate/colliding/out-of-scope Studio dependency')
            data = artifact(file)
            require(type(dep['bytes']) is int and dep['bytes'] == len(data) and sha(data) == digest(dep['sha256']), 'Studio dependency hash/size mismatch: ' + file)
            require(manifest['files'][file] == {'sha256': dep['sha256'], 'bytes': dep['bytes'], 'source': 'demo/' + file},
                    'Studio dependency manifest record mismatch: ' + file)
            deps[file] = dep
        require(set(manifest['files']) == set(parent['files']) | set(deps), 'Studio changed artifact file set beyond scope')
        sources = {}
        require(isinstance(overlay['sources'], list) and 0 < len(overlay['sources']) <= 128, 'Invalid Studio source list')
        for source in overlay['sources']:
            require(isinstance(source, dict) and set(source) == {'path', 'sha256'}, 'Invalid Studio source record')
            file = source['path']
            relative(file)
            require(file.startswith(('demo/studio/', BASE)) and file not in sources, 'Duplicate/out-of-scope Studio source')
            require(sha(read_path(ROOT, file)) == digest(source['sha256']), 'Studio source hash mismatch: ' + file)
            sources[file] = source['sha256']
        required_sources = {'demo/studio/transform.mjs', 'demo/studio/targets.json', 'demo/studio/asset-manifest.json', BASE + 'build.mjs'}
        require(required_sources <= set(sources), 'Missing Studio transformation source provenance')
        for file, dep in deps.items():
            require(sources.get('demo/' + file) == dep['sha256'], 'Studio asset differs from its bound source: ' + file)
        for file, old in parent['files'].items():
            data = artifact(file)
            current = manifest['files'][file]
            require(sha(data) == current['sha256'], 'Current artifact hash mismatch: ' + file)
            if file in pages:
                require(current == dict(old, sha256=sha(data), bytes=len(data)), 'Studio changed unrelated file metadata: ' + file)
                if file == 'index.html':
                    check_handoff(data, restored[file], deps)
                else:
                    check_studio_page(file, data)
            else:
                require(current == old and sha(data) == old['sha256'], 'Unlisted artifact changed: ' + file)
        # Always run the existing proof code against recovered parent bytes. The
        # old overlay records and their historical proofs are never rewritten.
        if parent.get('copyOverlay') or parent.get('widgetOverlay'):
            is_copy = bool(parent.get('copyOverlay'))
            name = 'verify-copy-overlay.py' if is_copy else 'verify-widget-overlay.py'
            spec = importlib.util.spec_from_file_location('studio_parent_gate', Path(__file__).with_name(name))
            gate = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(gate)
            gate.ROOT = ROOT
            errors.extend(gate.verify(parent, **({'read_current': reader} if is_copy else {'reader': reader})))
    except (OSError, ValueError, KeyError, TypeError, UnicodeError, AttributeError, IndexError, RecursionError) as exc:
        errors.append('Studio proof incomplete: ' + str(exc))
    return errors, parent, reader


def verify(manifest):
    return prepare(manifest)[0]


if __name__ == '__main__':
    import sys
    manifest = json.loads((ROOT / 'release-support/release-manifest.json').read_text('utf-8'))
    errors = verify(manifest)
    print(json.dumps({'issues': errors}, ensure_ascii=False))
    sys.exit(bool(errors))
