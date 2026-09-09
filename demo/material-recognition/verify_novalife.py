#!/usr/bin/env python3
"""Local-only NovaLife integration QA; generated fixture and mocked API calls.

Capture before rebuilding: python demo/material-recognition/verify_novalife.py --capture-baseline
Verify after rebuilding:   python demo/material-recognition/verify_novalife.py
No live API or challenge requests, bookings, form submissions, or emails.
"""
from __future__ import annotations

import argparse
import asyncio
from collections import Counter
from dataclasses import dataclass, field
import hashlib
from html.parser import HTMLParser
import json
import io
from pathlib import Path
import re
import sys
from urllib.parse import urlsplit

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
OUT = HERE / 'qa'
BASELINE = OUT / 'novalife-baseline.json'
MANIFEST = ROOT / 'release-support' / 'material-widget-overlay.json'
WIDTHS = (320, 390, 768, 1440)
REPRESENTATIVES = {'index.html', 'karpittisztitas-gyor.html', 'karpittisztitas-kalocsa.html'}
HEADINGS = {'likely_other': 'A fotó alapján valószínűleg nem NovaLife.',
            'possible_novalife': 'NovaLife vagy hasonló bevonat gyanúja',
            'label_novalife': 'NovaLife-jelölés látható',
            'uncertain': 'A NovaLife nem zárható ki a fotóból'}
PHONE = 'tel:+36702408141'
ANSWER = {'kep_tipus': 'anyag', 'anyag': 'Szövött kárpit – offline teszt',
          'anyag_alt': 'A pontos összetételt a gyártói címke pontosíthatja.', 'biztonsag': 99,
          'indoklas': 'Generált képpel, helyben helyettesített válasz; nem anyagfelismerési pontosságmérés.',
          'tisztitasi_kod': 'ismeretlen', 'modszer': 'A kezelési címke és szakmai anyagpróba ellenőrzése szükséges.',
          'kerulendo': ['Ismeretlen folttisztító alkalmazása.'], 'kockazatok': ['A bevonat sérülhet.'],
          'ellenorzes': 'Gyártói címke, bevonat, színtartósság.', 'kerdes_ugyfelnek': 'Megvan a kezelési címke?'}
REASON = 'A közeli fotó alapján a felület bevonata nem igazolható teljes bizonyossággal. A gyártói címke és szakmai ellenőrzés szükséges.'

LAYOUT = r'''() => {
 const issues=[], selectors=['.eco-novalife-cta','.eco-material'];
 if(document.documentElement.scrollWidth>innerWidth+1)issues.push({kind:'document_overflow',scrollWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,
  elements:[...document.querySelectorAll('body *')].map(el=>{const r=el.getBoundingClientRect();return {el,r};}).filter(({r})=>r.width>0&&r.right>innerWidth+1).slice(0,12).map(({el,r})=>({tag:el.tagName,class:el.className,text:el.textContent.slice(0,100),right:r.right}))});
 for(const selector of selectors){const box=document.querySelector(selector);if(!box)continue;
  for(const el of box.querySelectorAll('h2,h3,h4,p,label,a,button,summary,strong,li')){
   const b=el.getBoundingClientRect(),style=getComputedStyle(el);if(!b.width||!b.height||style.display==='none'||style.visibility==='hidden')continue;
   const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let node;
   while(node=walker.nextNode())for(const match of node.textContent.matchAll(/\S+/g)){
    const range=document.createRange();range.setStart(node,match.index);range.setEnd(node,match.index+match[0].length);
    if([...range.getClientRects()].some(rect=>rect.width>0&&(rect.left<b.left-2||rect.right>b.right+2)))
      issues.push({kind:'text_overflow',selector,tag:el.tagName,word:match[0].slice(0,70)});
   }
  }
 }
 return [...new Map(issues.map(x=>[JSON.stringify(x),x])).values()];
}'''

PLACEMENT = r'''() => {
 const cta=document.querySelector('.eco-novalife-cta'),widget=document.querySelector('.eco-material');
 const notes=[...document.querySelectorAll('.pricing-note-box')].filter(n=>/andante/i.test(n.textContent));
 const price=document.querySelector('#priceConfigurator')||document.querySelector('#arak');
 const nearNote=notes.some(n=>n.contains(cta)||n.nextElementSibling===cta||n.previousElementSibling===cta);
 const noteStyles=notes.map(n=>{const p=n.querySelector('p'),s=p&&getComputedStyle(p);return {columns:s?.columnCount,text:n.textContent.slice(0,100)};});
 return {notes:notes.length,nearNote,insidePrice:!!price?.contains(cta),priceId:price?.id,
   widgetAfterPrice:!!(price&&widget&&(price.compareDocumentPosition(widget)&Node.DOCUMENT_POSITION_FOLLOWING)),
   ctaHref:cta?.querySelector('a')?.getAttribute('href'),noteStyles};
}'''


@dataclass
class Node:
    tag: str
    attrs: dict = field(default_factory=dict)
    parent: 'Node | None' = None
    children: list = field(default_factory=list)

    def text(self):
        return re.sub(r'\s+', ' ', ''.join(child.text() if isinstance(child, Node) else child
                                         for child in self.children)).strip()

    def ancestors(self):
        node = self
        while node:
            yield node
            node = node.parent

    def classes(self):
        return set(self.attrs.get('class', '').split())

    def owned(self):
        return any(node.classes() & {'eco-material', 'eco-novalife-cta'} for node in self.ancestors())


class Document(HTMLParser):
    VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}

    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.root = Node('document')
        self.stack = [self.root]
        self.nodes = []
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        node = Node(tag, dict(attrs), self.stack[-1])
        self.stack[-1].children.append(node)
        self.nodes.append(node)
        if tag not in self.VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in self.VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                self.stack = self.stack[:index]
                break

    def handle_data(self, data):
        self.stack[-1].children.append(data)


def files():
    pages = json.loads(MANIFEST.read_text(encoding='utf-8'))['pages']
    result = [page['file'] for page in pages]
    if len(result) != 35 or len(set(result)) != 35 or any(Path(name).name != name or not name.endswith('.html') for name in result):
        raise ValueError('Expected exactly 35 unique release HTML pages.')
    return result


def page_signature(name):
    source = (ROOT / 'release' / name).read_text(encoding='utf-8')
    document = Document(source)
    anchors, forms, warnings = [], [], []
    for node in document.nodes:
        if node.owned():
            continue
        if node.tag == 'a':
            attributes = {key: node.attrs.get(key, '') for key in ('id', 'href', 'target', 'rel', 'onclick')}
            attributes['text'] = node.text()
            attributes['navigation'] = any(ancestor.tag in ('header', 'nav') or
                                           ancestor.attrs.get('role') == 'navigation' for ancestor in node.ancestors())
            anchors.append(attributes)
        elif node.tag == 'form':
            descendants = [child for child in document.nodes if node in list(child.ancestors()) and
                           child.tag in ('input', 'select', 'textarea', 'button')]
            forms.append({'attrs': node.attrs, 'controls': [{'tag': child.tag, 'attrs': child.attrs} for child in descendants]})
        if 'pricing-note-box' in node.classes():
            section = next((ancestor for ancestor in node.ancestors() if ancestor.tag == 'section'), None)
            warnings.append({'text': node.text()[:500], 'section_id': section.attrs.get('id') if section else None})
    return {'source_sha256': hashlib.sha256(source.encode()).hexdigest(), 'anchors': anchors,
            'forms': forms, 'warnings': warnings,
            'primary_apps': sum('data-material-app' in node.attrs for node in document.nodes),
            'novalife_ctas': sum('eco-novalife-cta' in node.classes() for node in document.nodes)}


def capture_baseline():
    if BASELINE.exists():
        raise ValueError('Baseline already exists; refusing to overwrite pre-change evidence.')
    pages = {name: page_signature(name) for name in files()}
    if any(page['novalife_ctas'] for page in pages.values()):
        raise ValueError('NovaLife CTA already present; cannot call this a pre-change baseline.')
    OUT.mkdir(exist_ok=True)
    BASELINE.write_text(json.dumps({'scope': 'pre-NovaLife release links/forms/pricing placement', 'pages': pages},
                                   ensure_ascii=False, indent=2), encoding='utf-8')
    return {'pages': len(pages), 'pricing_note_pages': sum(bool(page['warnings']) for page in pages.values()),
            'andante_note_pages': sum(any('andante' in warning['text'].casefold() for warning in page['warnings'])
                                     for page in pages.values()), 'baseline': str(BASELINE)}


def preserved_issues(name, before, after):
    issues = []
    for kind in ('anchors', 'forms'):
        previous = Counter(json.dumps(value, ensure_ascii=False, sort_keys=True) for value in before[kind])
        current = Counter(json.dumps(value, ensure_ascii=False, sort_keys=True) for value in after[kind])
        for value, count in (previous - current).items():
            entry = json.loads(value)
            issues.append({'file': name, 'check': 'preserved_' + kind, 'missing': count,
                           'href': entry.get('href') if kind == 'anchors' else entry.get('attrs', {}).get('id')})
    return issues


def fixture(color='#c1b298'):
    from PIL import Image, ImageDraw
    image = Image.new('RGB', (180, 120), color)
    draw = ImageDraw.Draw(image)
    for x in range(0, 180, 9):
        draw.line((x, 0, x, 120), fill='#9d8f78', width=2)
    for y in range(0, 120, 9):
        draw.line((0, y, 180, y), fill='#dfd3be', width=2)
    output = io.BytesIO()
    image.save(output, 'PNG')
    return {'name': 'offline-generated-weave.png', 'mimeType': 'image/png', 'buffer': output.getvalue()}


async def browser_verification(args, selected):
    from playwright.async_api import async_playwright
    issues, cases, screenshots, blocked_writes, unexpected_api, pre_existing = [], [], [], [], [], []
    prior_report = OUT / 'release-layout-verification.json'
    prior_layout = json.loads(prior_report.read_text(encoding='utf-8')) if prior_report.exists() else {}
    prior_overflow = {(item['file'], item['viewport'], item['baselineDocumentWidth'])
                      for item in prior_layout.get('baselineComparisons', [])
                      if item.get('classification') == 'pre-existing original-page overflow'
                      and item['baselineDocumentWidth'] == item['widgetRemovedDocumentWidth']}
    total_posts = views = 0
    base_origin = 'http://127.0.0.1:8089'
    allowed_reads = {'127.0.0.1:8089', 'fonts.googleapis.com', 'fonts.gstatic.com'}
    first_image, second_image = fixture(), fixture('#b1b8ad')
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        for name in selected:
            context = await browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
            await context.add_init_script("Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.__novaClipboard=text;}},configurable:true});")
            page = await context.new_page()
            page.set_default_timeout(8000)
            posts, js_errors = [], []
            page.on('pageerror', lambda error: js_errors.append(str(error)))
            mode = {'ready': True, 'status': 200, 'answer': dict(ANSWER), 'delay': 0}

            async def intercept(route):
                request, address = route.request, urlsplit(route.request.url)
                headers = {'Access-Control-Allow-Origin': base_origin, 'Access-Control-Allow-Headers': 'content-type',
                           'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'}
                if address.path == '/api/material-health':
                    await route.fulfill(json={'enabled': True, 'ready': mode['ready'], 'collection_enabled': True,
                                              'turnstile_site_key': ''}, headers=headers)
                    return
                if address.path == '/api/material-analyze':
                    if request.method == 'OPTIONS':
                        await route.fulfill(status=204, headers=headers)
                        return
                    assert request.method == 'POST', 'Unexpected analysis method'
                    payload = request.post_data_json
                    posts.append({'fields': sorted(payload), 'media_type': payload.get('media_type'),
                                  'archive_consent': payload.get('archive_consent'),
                                  'image_hash': hashlib.sha256(str(payload.get('image')).encode()).hexdigest()})
                    if mode['delay']:
                        await asyncio.sleep(mode['delay'])
                    await route.fulfill(status=mode['status'], json=mode['answer'], headers=headers)
                    return
                if '/api/material-' in address.path or address.netloc == 'challenges.cloudflare.com':
                    unexpected_api.append({'file': name, 'path': address.path})
                    await route.abort()
                    return
                if request.method not in ('GET', 'HEAD'):
                    blocked_writes.append({'file': name, 'method': request.method, 'path': address.path})
                    await route.abort()
                    return
                if address.netloc in allowed_reads:
                    await route.continue_()
                else:
                    await route.abort()

            await context.route('**/*', intercept)
            file_issues = []

            def require(condition, message):
                if not condition:
                    raise AssertionError(message)

            async def measure(state, *, click_cta=False):
                nonlocal views
                for width in WIDTHS:
                    await page.set_viewport_size({'width': width, 'height': 1000})
                    await page.locator('.eco-novalife-cta' if click_cta else '[data-material-result]').scroll_into_view_if_needed()
                    await page.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
                    for problem in await page.evaluate(LAYOUT):
                        finding = {'file': name, 'width': width, 'state': state, **problem}
                        if (problem['kind'] == 'document_overflow' and
                                (name, width, problem['scrollWidth']) in prior_overflow):
                            finding['baselineEvidence'] = 'demo/material-recognition/qa/release-layout-verification.json'
                            pre_existing.append(finding)
                        else:
                            file_issues.append(finding)
                    views += 1
                    if click_cta:
                        link = page.locator('.eco-novalife-cta a[href="#anyagfelismero"]')
                        require(await link.count() == 1, 'CTA must contain one local material-guide link')
                        bounds = await link.bounding_box()
                        require(bounds is not None and bounds['height'] >= 40, f'CTA touch target too short at {width}px')
                        if not args.no_screenshots and name in REPRESENTATIVES:
                            path = OUT / f'novalife-{args.scope}-{name[:-5]}-cta-{width}.png'
                            await page.locator('.eco-novalife-cta').screenshot(path=str(path))
                            screenshots.append(path.name)
                            path = OUT / f'novalife-{args.scope}-{name[:-5]}-cta-context-{width}.png'
                            await page.screenshot(path=str(path))
                            screenshots.append(path.name)
                        await link.click()
                        # Existing site navigation may prevent the native hash
                        # update while scrolling. Assert the actual destination.
                        await page.wait_for_function('''() => {const r=document.querySelector('#anyagfelismero').getBoundingClientRect();return r.top>=-2&&r.top<innerHeight*.8;}''')
                        require(await page.locator('[data-material-pick]').is_visible(), 'CTA did not reach the upload app')
                    elif not args.no_screenshots and name in REPRESENTATIVES and width in (320, 1440) and state in HEADINGS:
                        path = OUT / f'novalife-{args.scope}-{name[:-5]}-{state}-{width}.png'
                        await page.locator('[data-material-result]').screenshot(path=str(path))
                        screenshots.append(path.name)
                        if state == 'uncertain':
                            await page.locator('.eco-material-novalife').scroll_into_view_if_needed()
                            path = OUT / f'novalife-{args.scope}-{name[:-5]}-{state}-context-{width}.png'
                            await page.screenshot(path=str(path))
                            screenshots.append(path.name)

            async def submit(answer, expected):
                mode.update(answer=answer, status=200)
                before = len(posts)
                await page.locator('[data-material-analyze]').click()
                await page.wait_for_function('''expected=>document.querySelector('[data-material-app]').getAttribute('aria-busy')==='false'&&!document.querySelector('[data-material-result]').hidden&&document.querySelector('.eco-material-novalife')?.dataset.novalifeStatus===expected''', arg=expected)
                require(len(posts) == before + 1, 'One explicit analysis click must cause exactly one mocked POST')
                panel = page.locator('.eco-material-novalife')
                require(await panel.locator('h3').inner_text() == HEADINGS[expected], 'Wrong NovaLife status heading')
                require(await panel.locator('[data-material-followup="label"]').count() == 1, 'Missing label-photo followup')
                text = await page.locator('[data-material-result]').inner_text()
                require(not re.search(r'\d+(?:[,.]\d+)?\s*%', text), 'Percentage confidence is visible')
                require(await page.locator('[data-material-result] meter,[data-material-result] progress,[data-material-result] [role="progressbar"]').count() == 0, 'Numeric confidence meter is visible')
                require(not re.search(r'biztosan nem NovaLife|garantáltan tisztítható|nyugodtan tisztítható', text, re.I), 'Unjustified cleaning/brand certification')
                require('nem anyagvizsgálati igazolás vagy tisztítási engedély' in text, 'Photo result lost its qualification')
                next_link = page.locator('.eco-material-result-actions a')
                expected_href = await page.locator('[data-material-app]').get_attribute('data-next') if expected == 'likely_other' else PHONE
                require(await next_link.get_attribute('href') == expected_href, 'NovaLife routing bypasses professional clarification')
                if expected == 'likely_other':
                    require(await page.locator(expected_href).count() == 1, 'Original calculator/form anchor is missing')
                if expected == 'uncertain':
                    require(await panel.locator('[data-material-followup="detail"]').count() == 1, 'Uncertain outcome lacks detail-photo followup')
                require('provider' not in posts[-1]['fields'] and 'model' not in posts[-1]['fields'], 'Customer request exposes provider selection')
                if name in REPRESENTATIVES:
                    await page.locator('.eco-material-result-actions button').click()
                    await page.wait_for_function('document.querySelector(".eco-material-copy-status").textContent.includes("kimásoltuk")')
                    copied = await page.evaluate('window.__novaClipboard')
                    require(HEADINGS[expected] in copied, 'Copied result lost the NovaLife outcome')
                    reason = await page.locator('.eco-material-novalife-reason').all_text_contents()
                    require(not reason or reason[0] in copied, 'Copied result lost the NovaLife reasoning')
                    require(not re.search(r'\d+(?:[,.]\d+)?\s*%', copied), 'Copied result includes numeric certainty')
                    if expected == 'likely_other':
                        await next_link.click()
                        await page.wait_for_function('selector=>{const r=document.querySelector(selector).getBoundingClientRect();return r.top>=-2&&r.top<innerHeight*.8;}', arg=expected_href)

            try:
                await page.goto(f'{base_origin}/{args.scope}/{name}', wait_until='networkidle')
                await page.evaluate('document.fonts.ready')
                require(await page.locator('[data-material-app]').count() == 1, 'Expected one primary app')
                require(await page.locator('#anyagfelismero').count() == 1, 'Expected one unique material anchor')
                require(await page.locator('.eco-novalife-cta').count() == 1, 'Expected one NovaLife CTA')
                placement = await page.evaluate(PLACEMENT)
                require(placement['ctaHref'] == '#anyagfelismero', 'CTA must stay on this page')
                if placement['notes']:
                    require(placement['nearNote'], 'CTA is detached from the existing ANDANTE pricing warning')
                else:
                    require(placement['insidePrice'], 'Index/Mediterranean CTA must stay in the pricing area')
                if name != 'index.html':
                    require(placement['widgetAfterPrice'], 'Primary app should follow the price section')
                await measure('initial', click_cta=True)
                require(not posts, 'CTA navigation or initial load submitted a photo')
                if name in REPRESENTATIVES or args.all_states:
                    await page.locator('[data-material-file]').set_input_files(first_image)
                    await page.wait_for_function('!document.querySelector("[data-material-analyze]").disabled')
                    require(not posts, 'Uploading a photo automatically started analysis')
                    for state in HEADINGS:
                        answer = {**ANSWER, 'kep_tipus': 'cimke' if state == 'label_novalife' else 'anyag',
                                  'novalife': {'status': state, 'reason': REASON}}
                        await submit(answer, state)
                        require(await page.locator('.eco-material-novalife-reason').inner_text() == REASON, 'Reason was lost or changed')
                        await measure(state)
                    await submit(dict(ANSWER), 'uncertain')
                    require(await page.locator('.eco-material-novalife-reason').count() == 0, 'Legacy response retained stale NovaLife reasoning')
                    await measure('legacy')

                if name in REPRESENTATIVES:
                    await submit({**ANSWER, 'novalife': {'status': 'label_novalife', 'reason': REASON}}, 'possible_novalife')
                    require(await page.locator('.eco-material-code b').inner_text() == 'Címke szükséges', 'Fabric image was treated as a cleaning label')
                    unsafe_reason = '<img src=x onerror="window.__novaInjected=true"> helyi teszt'
                    await submit({**ANSWER, 'novalife': {'status': 'unknown-from-old-backend', 'reason': unsafe_reason}}, 'uncertain')
                    require(await page.locator('.eco-material-novalife-reason').inner_text() == unsafe_reason, 'Reason must be rendered as literal text')
                    require(await page.locator('.eco-material-novalife-reason img').count() == 0 and not await page.evaluate('!!window.__novaInjected'), 'Reason executed as HTML')

                    # Both suggested next steps must actually open the existing input.
                    for kind in ('detail', 'label'):
                        before = len(posts)
                        await page.locator('[data-material-archive-consent]').check()
                        async with page.expect_file_chooser() as chooser_info:
                            await page.locator(f'[data-material-followup="{kind}"]').click()
                        chooser = await chooser_info.value
                        await chooser.set_files(second_image)
                        await page.wait_for_function('!document.querySelector("[data-material-analyze]").disabled')
                        require(await page.locator('[data-material-result]').is_hidden(), 'New photo did not clear the stale result')
                        require(not await page.locator('[data-material-archive-consent]').is_checked(), 'Consent was reused for a different photo')
                        require(len(posts) == before, 'Followup upload submitted automatically')
                        await submit({**ANSWER, 'novalife': {'status': 'uncertain', 'reason': REASON}}, 'uncertain')

                    # A failed explicit request can be retried without a stale result.
                    before = len(posts)
                    mode['status'] = 503
                    await page.locator('[data-material-analyze]').click()
                    await page.wait_for_function('document.querySelector("[data-material-status]").classList.contains("is-error")&&!document.querySelector("[data-material-analyze]").disabled')
                    require(len(posts) == before + 1 and await page.locator('[data-material-result]').is_hidden(), 'Failed request retained a previous certification/result')
                    await submit({**ANSWER, 'novalife': {'status': 'likely_other', 'reason': REASON}}, 'likely_other')

                    mode['ready'] = False
                    await page.reload(wait_until='networkidle')
                    await page.locator('[data-material-file]').set_input_files(first_image)
                    await page.locator('.eco-material-preview').wait_for(state='visible')
                    require(await page.locator('[data-material-analyze]').is_disabled(), 'Offline health did not block analysis')
                    before = len(posts)
                    mode['ready'] = True
                    await page.locator('[data-material-retry]').click()
                    await page.wait_for_function('!document.querySelector("[data-material-analyze]").disabled')
                    require(len(posts) == before, 'Health retry submitted a photo')
                cases.append({'file': name, 'passed': not file_issues, 'mockedPosts': len(posts), 'placement': placement})
            except Exception as error:
                diagnostic = await page.evaluate('''()=>{const node=document.querySelector('#anyagfelismero'),r=node?.getBoundingClientRect();return {hash:location.hash,scrollY,viewport:innerHeight,targetTop:r?.top,targetHeight:r?.height,widgetCount:document.querySelectorAll('[data-material-app]').length,ctaCount:document.querySelectorAll('.eco-novalife-cta').length};}''')
                file_issues.append({'file': name, 'check': 'interaction', 'error': str(error)[:1200], 'diagnostic': diagnostic})
                cases.append({'file': name, 'passed': False, 'mockedPosts': len(posts)})
            file_issues.extend({'file': name, 'check': 'javascript', 'error': error[:700]} for error in js_errors)
            issues.extend(file_issues)
            total_posts += len(posts)
            print(json.dumps({'file': name, 'issues': len(file_issues), 'mockedPosts': len(posts),
                              'firstIssue': file_issues[0] if file_issues else None}, ensure_ascii=False), flush=True)
            await context.close()
        await browser.close()
    return {'cases': cases, 'views': views, 'issues': issues, 'mockedPosts': total_posts,
            'preExistingIssues': pre_existing,
            'blockedWrites': blocked_writes, 'unexpectedApi': unexpected_api, 'screenshots': screenshots,
            'liveProviderCalls': 0, 'liveTurnstileCalls': 0}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--capture-baseline', action='store_true')
    parser.add_argument('--scope', choices=('release', 'demo'), default='release')
    parser.add_argument('--pages', nargs='+', help='Optional representative subset; default verifies all 35 pages')
    parser.add_argument('--no-screenshots', action='store_true')
    parser.add_argument('--all-states', action='store_true', help='Repeat shared component state checks on every page; default uses three representative layouts')
    args = parser.parse_args()
    if args.capture_baseline:
        report = capture_baseline()
        print(json.dumps(report, ensure_ascii=False))
        return 0
    all_files = files()
    selected = args.pages or all_files
    if any(name not in all_files for name in selected) or len(selected) != len(set(selected)):
        parser.error('Requested pages must be unique names from the release manifest.')
    OUT.mkdir(exist_ok=True)
    static_issues = []
    if args.scope == 'release':
        if not BASELINE.exists():
            parser.error('Pre-change baseline is missing; cannot verify preserved links/forms.')
        baseline = json.loads(BASELINE.read_text(encoding='utf-8'))['pages']
        for name in selected:
            current = page_signature(name)
            static_issues.extend(preserved_issues(name, baseline[name], current))
            if current['primary_apps'] != 1 or current['novalife_ctas'] != 1:
                static_issues.append({'file': name, 'check': 'source_counts', 'apps': current['primary_apps'], 'ctas': current['novalife_ctas']})
    report = asyncio.run(browser_verification(args, selected))
    report.update(scope=args.scope, pages=len(selected), widths=list(WIDTHS), fullCoverage=len(selected) == 35,
                  statePages=[name for name in selected if name in REPRESENTATIVES or args.all_states],
                  staticIssues=static_issues, preservedBaseline=str(BASELINE.relative_to(ROOT)))
    suffix = '-subset' if args.pages else ''
    target = OUT / f'novalife-{args.scope}{suffix}-verification.json'
    target.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'report': str(target), 'pages': len(selected), 'views': report['views'],
                      'issues': len(report['issues']), 'staticIssues': len(static_issues),
                      'blockedWrites': len(report['blockedWrites']), 'mockedPosts': report['mockedPosts'],
                      'liveProviderCalls': 0}, ensure_ascii=False))
    return int(bool(static_issues or report['issues'] or report['blockedWrites'] or report['unexpectedApi']))


if __name__ == '__main__':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    raise SystemExit(main())
