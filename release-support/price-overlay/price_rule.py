"""The one deterministic price rule, shared by the builder and the proof.

The owner raised every upholstery and mattress cleaning price by 15% on
2026-09-11, rounded to the nearest 500 Ft. Travel fees, machine rental, parking
and capacity-reservation amounts are not cleaning prices and never move.

`apply(text) -> (text, edits)` is pure: the verifier re-derives the published
bytes from the restored parent bytes and refuses anything else.
"""
import re

NBSP = ' '
PERCENT = 1.15
STEP = 500
SMALL_STEP = 100          # 2000 Ft alatt az 500-as kerekites elnyelne az emelest
SMALL_BELOW = 2000
MIN_PRICE = 3000          # ez alatt nincs tisztitasi ar a lapokon ("0 Ft", "1 000-3 000 Ft" parkolas)
APPROX_STEP = 1000        # a "~35 000 Ft-tol" jellegu becsult ar kerek ezres marad

NUM = r'\+?\s?(?:\d{1,3}(?:[.\s' + NBSP + r']\d{3})+|\d{3,6})'
PRICE_RE = re.compile(
    r'(?:<span[^>]*>\s*(?P<a>' + NUM + r')\s*</span>(?=\s*(?:&nbsp;|\s)*Ft\b)'
    r'|(?P<b>' + NUM + r')(?=\s*(?:&nbsp;|\s)*Ft\b))')
# Ezek kozeleben allo osszeg nem tisztitasi ar.
SKIP = re.compile(r'kisz[aá]ll|parkol|kauci[oó]|/\s*nap\b|naponta|b[eé]rl|Puzzi|K[aä]rcher'
                  r'|foglal[aá]si|km-ig|belv[aá]ros|k[uü]lv[aá]ros', re.I)
BEFORE, AFTER = 260, 140  # a kontextusablak merete karakterben

PAGES = re.compile(r'^(karpittisztitas-|matractisztitas-|komarom\.html$|karpittisztito-gep-berles\.html$)')


def selects(name):
    """Csak a karpit-/matracoldalak arai mozognak; index.html es ui/* mas retege."""
    return bool(PAGES.match(name)) and name.endswith('.html')


def raise_price(value, approx):
    if approx:
        return round(value * PERCENT / APPROX_STEP) * APPROX_STEP
    step = STEP if value >= SMALL_BELOW else SMALL_STEP
    return int((value * PERCENT + step / 2) // step * step)


def format_like(value, sample):
    """A forrasban hasznalt ezres elvalasztot tartja meg (pont, szokoz, nbsp vagy semmi)."""
    separator = re.search(r'\d([.\s' + NBSP + r'])\d{3}', sample)
    return f'{value:,}'.replace(',', separator.group(1)) if separator else str(value)


def apply(text):
    """Returns (new_text, edits); offsets are byte positions in the PUBLISHED text,
    so `restore` can undo them from the highest offset down without re-indexing."""
    out, pos, edits, emitted = [], 0, [], 0
    for match in PRICE_RE.finditer(text):
        raw = match.group('a') or match.group('b')
        digits = re.sub(r'[^\d]', '', raw)
        if not digits:
            continue
        value = int(digits)
        if value < MIN_PRICE or SKIP.search(text[max(0, match.start() - BEFORE):match.end() + AFTER]):
            continue
        approx = text[max(0, match.start() - 2):match.start()].strip().endswith('~')
        prefix = raw[:re.search(r'\d', raw).start()]          # '+' es szokozok valtozatlanul
        new = prefix + format_like(raise_price(value, approx), raw)
        if new == raw:
            continue
        start, end = match.span('a') if match.group('a') is not None else match.span('b')
        gap = text[pos:start]
        out.append(gap)
        emitted += len(gap.encode('utf-8'))
        edits.append({'offset': emitted, 'before': raw, 'after': new})
        out.append(new)
        emitted += len(new.encode('utf-8'))
        pos = end
    out.append(text[pos:])
    return ''.join(out), edits


def restore(data, edits):
    """Reverses the published bytes back to the parent bytes, by recorded offset."""
    for edit in sorted(edits, key=lambda e: -e['offset']):
        offset, after, before = edit['offset'], edit['after'].encode('utf-8'), edit['before'].encode('utf-8')
        if data[offset:offset + len(after)] != after:
            raise ValueError('Price edit does not match published bytes at ' + str(offset))
        data = data[:offset] + before + data[offset + len(after):]
    return data
