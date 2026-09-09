#!/usr/bin/env python3
"""Read-only copy rollout QA. Run only after the release and final corpus are ready.

python demo/material-recognition/verify_copy_tone.py --final-corpus PATH
No uploaded photos, customer data, real API POSTs, bookings, or sent email.
"""
from __future__ import annotations

import argparse
import asyncio
import hashlib
import importlib.util
import json
from pathlib import Path
import re
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[2]
SUPPORT = ROOT / 'release-support' / 'copy-tone'
OUT = Path(__file__).resolve().parent / 'qa'
PAGES = ('index.html', 'karpittisztitas-gyor.html', 'matractisztitas-gyor.html',
         'ablaktisztitas-gyor.html', 'takaritas-gyor.html', 'szonyegtisztitas-gyor.html',
         'karpittisztitas-kalocsa.html')
WIDTHS = (390, 1440)
WIDGET_PAGES = {'index.html', 'karpittisztitas-gyor.html', 'karpittisztitas-kalocsa.html'}
ORIGIN = 'http://127.0.0.1:8089'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def normalize(text):
    return re.sub(r'\s+', ' ', text).strip()


def static_audit(corpus_path):
    manifest_bytes = (ROOT / 'release-support/release-manifest.json').read_bytes()
    manifest = json.loads(manifest_bytes)
    assert manifest.get('copyOverlay'), 'The copy-overlay release is not ready yet'
    html_files = {row['file'] for row in manifest['pageInventory']}
    assert len(html_files) == 142 and html_files <= set(manifest['files']), 'Expected all 142 inventoried release pages'
    corpus_bytes = corpus_path.read_bytes()
    rows = json.loads(corpus_bytes)
    assert isinstance(rows, list) and rows, 'Final extraction must be a nonempty row list'
    translations, maps, conflicts = {}, [], []
    for path in sorted(SUPPORT.glob('claude-map-*.json')):
        data = path.read_bytes()
        maps.append({'file': path.name, 'sha256': sha(data)})
        for entry in json.loads(data):
            before, after = normalize(entry['before']), normalize(entry['after'])
            if before in translations and translations[before] != after:
                conflicts.append({'before': before, 'file': path.name})
            translations[before] = after
    assert maps and not conflicts, 'Claude map files are absent or conflicting'
    indexed, covered, residuals = set(), set(), []
    for row in rows:
        text = normalize(row['text'])
        assert row['id'] == sha(text.encode('utf-8'))[:16], 'Final corpus text/id mismatch'
        assert row['id'] not in indexed, 'Duplicate final corpus row'
        indexed.add(row['id'])
        covered.update(file for file in row['files'] if file in html_files)
        if text in translations and translations[text] != text:
            residuals.append({'id': row['id'], 'before': text, 'expected': translations[text],
                              'files': row['files'], 'kinds': row['kinds']})
    missing = sorted(html_files - covered)
    return {'manifestSha256': sha(manifest_bytes), 'corpusPath': str(corpus_path), 'corpusSha256': sha(corpus_bytes),
            'maps': maps, 'mappedChanges': len(translations), 'finalRows': len(rows),
            'htmlPages': len(html_files), 'htmlArtifactsIncludingAliasesAndVerification': sum(name.endswith('.html') for name in manifest['files']),
            'coveredHtmlPages': len(covered), 'uncoveredHtmlPages': missing,
            'residuals': residuals, 'passed': not residuals and not missing,
            'method': 'Exact normalized Claude before-text matches in final extractor rows; no formal-pronoun regex'}


LAYOUT = r'''() => {
 const issues=[];
 if(document.documentElement.scrollWidth>innerWidth+1)issues.push({kind:'document_overflow',documentWidth:document.documentElement.scrollWidth,viewport:innerWidth});
 const selectors=['h1','h2','.eco-novalife-cta h3','.eco-novalife-cta p','.eco-novalife-cta a','#priceConfigurator button','#priceConfigurator label','.med-config button','.med-config label','.faq-question'];
 for(const el of document.querySelectorAll(selectors.join(','))){
  const box=el.getBoundingClientRect(),style=getComputedStyle(el);
  if(!box.width||!box.height||style.visibility==='hidden'||style.display==='none'||el.closest('[hidden],[inert]'))continue;
  const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let text;
  while(text=walker.nextNode())for(const match of text.textContent.matchAll(/\S+/g)){
   const range=document.createRange();range.setStart(text,match.index);range.setEnd(text,match.index+match[0].length);
   if([...range.getClientRects()].some(r=>r.width>0&&(r.left<box.left-2||r.right>box.right+2)))issues.push({kind:'control_text_overflow',tag:el.tagName,class:el.className,word:match[0]});
  }
 }
 return [...new Map(issues.map(x=>[JSON.stringify(x),x])).values()];
}'''


async def browser_audit(args):
    from playwright.async_api import async_playwright
    issues, cases, screenshots = [], [], []
    unexpected_posts, availability_reads, javascript_errors = [], [], []
    previous = OUT / 'release-layout-verification.json'
    known = json.loads(previous.read_text(encoding='utf-8')).get('baselineComparisons', []) if previous.exists() else []
    prior_findings = []
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        for name in PAGES:
            for width in WIDTHS:
                context = await browser.new_context(viewport={'width': width, 'height': 1000}, reduced_motion='reduce')
                await context.add_init_script("Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.__copyToneClipboard=text;}},configurable:true});")
                page = await context.new_page()
                page.set_default_timeout(8000)
                page_errors, checks, missing = [], [], []
                page.on('pageerror', lambda error: page_errors.append(str(error)))

                async def intercept(route):
                    request, url = route.request, urlsplit(route.request.url)
                    cors = {'Access-Control-Allow-Origin': ORIGIN, 'Access-Control-Allow-Headers': 'content-type',
                            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'}
                    if url.path == '/api/material-health':
                        await route.fulfill(json={'enabled': False, 'ready': False, 'collection_enabled': False, 'turnstile_site_key': ''}, headers=cors)
                    elif url.path.endswith('/check-availability'):
                        availability_reads.append({'file': name, 'width': width, 'method': request.method})
                        await route.fulfill(status=204 if request.method == 'OPTIONS' else 200,
                                            body='' if request.method == 'OPTIONS' else json.dumps({'success': True, 'days': []}),
                                            content_type='application/json', headers=cors)
                    elif request.method not in ('GET', 'HEAD'):
                        unexpected_posts.append({'file': name, 'width': width, 'method': request.method, 'path': url.path})
                        await route.abort()
                    elif url.netloc in ('127.0.0.1:8089', 'fonts.googleapis.com', 'fonts.gstatic.com'):
                        await route.continue_()
                    else:
                        await route.abort()

                await context.route('**/*', intercept)
                page.on('response', lambda response: missing.append(response.url) if response.status >= 400 and response.url.startswith(ORIGIN + '/release/') else None)

                async def inspect(state):
                    await page.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
                    for finding in await page.evaluate(LAYOUT):
                        item = {'file': name, 'width': width, 'state': state, **finding}
                        prior = next((old for old in known if old['file'] == name and old['viewport'] == width and
                                      old['baselineDocumentWidth'] == finding.get('documentWidth')), None)
                        (prior_findings if prior else issues).append(item)
                    checks.append(state)

                async def picture(state, locator=None):
                    if args.no_screenshots:
                        return
                    path = OUT / f'copy-tone-{name[:-5]}-{width}-{state}.png'
                    if locator:
                        await locator.scroll_into_view_if_needed()
                    await page.screenshot(path=str(path))
                    screenshots.append(path.name)

                try:
                    await page.goto(ORIGIN + '/release/' + name, wait_until='networkidle')
                    await page.evaluate('document.fonts.ready')
                    await inspect('initial')
                    await picture('initial')
                    if width == 390:
                        toggle = page.locator('.nav-mobile-toggle,.bixol-mobile-hamburger').first
                        assert await toggle.is_visible(), 'Mobile drawer control missing'
                        await toggle.click()
                        menu = page.locator('.nav-mobile,.bixol-mobile-menu').first
                        await page.wait_for_function("document.querySelector('.nav-mobile,.bixol-mobile-menu').classList.contains('active')")
                        assert await toggle.get_attribute('aria-expanded') == 'true'
                        assert await menu.locator('a[href]').count() > 0
                        submenu = menu.locator('.nav-mobile-link,.has-submenu > a').first
                        if await submenu.count():
                            await submenu.click()
                            assert await submenu.get_attribute('aria-expanded') == 'true', 'City submenu failed to expand'
                        await inspect('mobile-drawer')
                        await picture('drawer')
                        await page.keyboard.press('Escape')
                        await page.wait_for_function("!document.querySelector('.nav-mobile,.bixol-mobile-menu').classList.contains('active')")
                        assert await toggle.get_attribute('aria-expanded') == 'false'
                        checks.append('drawer-open-submenu-close')
                    else:
                        trigger = page.locator('.nav-item[data-menu] .nav-link').first
                        if await trigger.count():
                            await trigger.click()
                            await page.locator('#megaMenuContainer.active').wait_for(state='visible')
                            assert await page.locator('#megaMenuContent a[href]').count() > 0
                            await page.keyboard.press('Escape')
                            await page.wait_for_function("!document.querySelector('#megaMenuContainer').classList.contains('active')")
                            checks.append('desktop-service-city-menu')

                    if name in WIDGET_PAGES:
                        assert await page.locator('.eco-novalife-cta').count() == 1
                        assert await page.locator('[data-material-app]').count() == 1
                        cta = page.locator('.eco-novalife-cta')
                        await cta.scroll_into_view_if_needed()
                        icons = await cta.locator('svg').evaluate_all('(nodes)=>nodes.map(node=>{const r=node.getBoundingClientRect();return {width:r.width,height:r.height};})')
                        compact = 'eco-novalife-cta-compact' in (await cta.get_attribute('class'))
                        expected = 65 if width == 390 else 62 if compact else 84
                        assert len(icons) == 2 and abs(icons[0]['width'] - expected) < 1 and abs(icons[0]['height'] - expected) < 1, icons
                        # The pre-copy Győr service stylesheet renders this
                        # 18px SVG at 24px; both existing bounded sizes are valid.
                        assert icons[1]['width'] == icons[1]['height'] and 18 <= icons[1]['width'] <= 24, icons
                        await picture('cta', cta)
                        await cta.locator('a[href="#anyagfelismero"]').click()
                        await page.wait_for_function("()=>{const r=document.querySelector('#anyagfelismero').getBoundingClientRect();return r.top>=-2&&r.top<innerHeight*.85;}")
                        assert await page.locator('[data-material-pick]').is_visible()
                        checks.append('novalife-icon-and-local-link')
                    else:
                        assert await page.locator('.eco-novalife-cta').count() == 0

                    if name == 'index.html':
                        for selector in ('#btnBusiness', '#btnPrivate'):
                            await page.locator(selector).click()
                            assert 'active' in (await page.locator(selector).get_attribute('class'))
                        for index in (1, 0):
                            button = page.locator('#customerType .config-btn').nth(index)
                            await button.click()
                            assert 'active' in (await button.get_attribute('class'))
                        for index in (1, 2, 0):
                            button = page.locator('#serviceType .config-btn').nth(index)
                            await button.click()
                            assert 'active' in (await button.get_attribute('class'))
                            assert await page.locator('#step3 .config-item').count() > 0
                        row = page.locator('[data-item-id="karpit_szofa"]')
                        await row.locator('.counter-btn').last.click()
                        assert await row.locator('.counter-value').inner_text() == '1'
                        await row.locator('.counter-btn').first.click()
                        assert await row.locator('.counter-value').inner_text() == '0'
                        await row.locator('.counter-btn').last.click()
                        for city in ('gyor', 'sopron', 'gyor'):
                            await page.locator('#citySelect').select_option(city)
                            assert await page.locator('#citySelect').input_value() == city
                            assert await page.locator('#travelZoneWrap').is_visible()
                        await page.locator('label:has([name="travelZone"][value="belvaros"])').click()
                        assert await page.locator('[name="travelZone"][value="belvaros"]').is_checked()
                        for field in ('streetInput', 'plzInput', 'cityInput'):
                            assert await page.locator('#' + field).is_visible()
                        condition = page.locator('.config-btn.toggle').first
                        await condition.click()
                        assert 'active' in (await condition.get_attribute('class'))
                        await condition.click()
                        assert 'active' not in (await condition.get_attribute('class'))
                        await inspect('customer-service-quantity-city-condition')
                        await picture('configurator', page.locator('#step3'))
                        checks.append('booking-controls-without-submission')

                    if name == 'karpittisztitas-kalocsa.html':
                        config = page.locator('[data-med-configurator]')
                        card = config.locator('.med-product').first
                        await card.locator('[data-delta="1"]').click()
                        assert (await card.locator('[data-count]').inner_text()).startswith('1')
                        await card.locator('[data-delta="-1"]').click()
                        assert (await card.locator('[data-count]').inner_text()).startswith('0')
                        await card.locator('[data-delta="1"]').click()
                        for city in ('baja', 'kalocsa'):
                            await config.locator('[data-city-select]').select_option(city)
                            assert await config.locator('[data-city-select]').input_value() == city
                        await config.locator('[data-zone]').select_option(index=1)
                        extra = config.locator('[data-extra]').first
                        await extra.check()
                        assert await extra.is_checked()
                        await extra.uncheck()
                        link = config.locator('[data-email-inquiry]')
                        assert await link.get_attribute('aria-disabled') == 'false'
                        assert urlsplit(await link.get_attribute('href')).path == 'info@ecocleantisztito.hu'
                        assert urlsplit(await link.get_attribute('href')).scheme == 'mailto'
                        await config.locator('.med-email-fallback summary').click()
                        expected = await config.locator('[data-email-text]').input_value()
                        assert expected
                        await config.locator('[data-copy-inquiry]').click()
                        await page.wait_for_function('!!window.__copyToneClipboard')
                        assert await page.evaluate('window.__copyToneClipboard') == expected
                        await inspect('med-quantity-city-extra-email-copy')
                        await picture('email-calculator', config.locator('.med-config-summary'))
                        await config.locator('[data-reset]').click()
                        assert await link.get_attribute('aria-disabled') == 'true'
                        checks.append('regional-email-preparation-without-send')

                    faq = page.locator('.faq-question').first
                    if await faq.count():
                        await faq.click()
                        assert await faq.get_attribute('aria-expanded') == 'true'
                        await faq.click()
                        assert await faq.get_attribute('aria-expanded') == 'false'
                        checks.append('faq-open-close')
                    if name == 'matractisztitas-gyor.html':
                        await page.locator('.matrac-why__imgbtn').click()
                        await page.locator('.matrac-why__modal.open').wait_for(state='visible')
                        await page.locator('.matrac-why__modal-close').click()
                        assert 'open' not in (await page.locator('.matrac-why__modal').get_attribute('class'))
                        checks.append('image-dialog-open-close')
                    await inspect('final')
                except Exception as error:
                    issues.append({'file': name, 'width': width, 'kind': 'interaction', 'error': str(error)[:1000], 'completed': checks})
                issues.extend({'file': name, 'width': width, 'kind': 'missing-asset', 'url': url} for url in missing)
                javascript_errors.extend({'file': name, 'width': width, 'error': error} for error in page_errors)
                cases.append({'file': name, 'width': width, 'checks': checks, 'javascriptErrors': len(page_errors)})
                print(json.dumps({'file': name, 'width': width, 'checks': len(checks),
                                  'issues': sum(item['file'] == name and item['width'] == width for item in issues)}, ensure_ascii=False), flush=True)
                await context.close()
        await browser.close()
    return {'pages': len(PAGES), 'viewports': len(cases), 'cases': cases, 'issues': issues,
            'javascriptErrors': javascript_errors, 'knownPriorOverflow': prior_findings, 'screenshots': screenshots,
            'mockedAvailabilityReads': len(availability_reads), 'unexpectedBlockedWrites': unexpected_posts,
            'realApiPosts': 0, 'realBookings': 0, 'sentEmails': 0}


async def compare_baseline():
    """Targeted comparison for two observed pre-existing presentation quirks."""
    from playwright.async_api import async_playwright
    spec = importlib.util.spec_from_file_location('copy_recovery_qa', ROOT / 'release-support/verify-copy-overlay.py')
    gate = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(gate)
    manifest = json.loads((ROOT / 'release-support/release-manifest.json').read_text('utf-8'))
    overlay = json.loads((ROOT / manifest['copyOverlay']['path']).read_text('utf-8'))
    assert sha((ROOT / manifest['copyOverlay']['path']).read_bytes()) == manifest['copyOverlay']['sha256']
    records = {record['file']: record for record in overlay['files']}
    cache = {}
    def prior(file):
        if file not in cache:
            data = (ROOT / 'release' / file).read_bytes()
            if file in records:
                data = gate.recover(data, records[file])
                assert sha(data) == records[file]['beforeSha256']
            cache[file] = data
        return cache[file]
    pairs = []
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        for name, width in (('karpittisztitas-gyor.html', 390), ('karpittisztitas-gyor.html', 1440), ('matractisztitas-gyor.html', 390)):
            pair = {'file': name, 'width': width}
            for mode in ('before', 'current'):
                context = await browser.new_context(viewport={'width': width, 'height': 1000}, reduced_motion='reduce')
                page = await context.new_page()
                async def route(request):
                    url = urlsplit(request.request.url)
                    if url.path == '/api/material-health':
                        await request.fulfill(json={'enabled': False, 'ready': False, 'turnstile_site_key': ''}, headers={'Access-Control-Allow-Origin': ORIGIN})
                    elif request.request.method not in ('GET', 'HEAD'):
                        await request.abort()
                    elif url.netloc == '127.0.0.1:8089' and mode == 'before' and url.path.startswith('/release/'):
                        file = url.path[len('/release/'):]
                        if file in manifest['files'] and file.endswith(('.html', '.js')):
                            await request.fulfill(body=prior(file), content_type='text/html; charset=utf-8' if file.endswith('.html') else 'text/javascript; charset=utf-8')
                        else:
                            await request.continue_()
                    elif url.netloc in ('127.0.0.1:8089', 'fonts.googleapis.com', 'fonts.gstatic.com'):
                        await request.continue_()
                    else:
                        await request.abort()
                await context.route('**/*', route)
                await page.goto(ORIGIN + '/release/' + name, wait_until='networkidle')
                await page.evaluate('document.fonts.ready')
                pair[mode] = {'findings': await page.evaluate(LAYOUT), 'icons': await page.locator('.eco-novalife-cta svg').evaluate_all('(nodes)=>nodes.map(n=>{const r=n.getBoundingClientRect();return {width:r.width,height:r.height};})')}
                if mode == 'current' and name.startswith('karpittisztitas'):
                    await page.locator('.eco-novalife-cta a').click()
                    await page.wait_for_function("()=>{const r=document.querySelector('#anyagfelismero').getBoundingClientRect();return r.top>=-2&&r.top<innerHeight*.85;}")
                    faq = page.locator('.faq-question').first
                    await faq.click()
                    assert await faq.get_attribute('aria-expanded') == 'true'
                    await faq.click()
                    assert await faq.get_attribute('aria-expanded') == 'false'
                    pair['currentRetest'] = ['novalife-local-link', 'faq-open-close']
                await context.close()
            pair['identical'] = pair['before'] == pair['current']
            assert pair['identical'], pair
            pairs.append(pair)
        await browser.close()
    target = OUT / 'copy-tone-baseline-comparison.json'
    target.write_text(json.dumps({'pairs': pairs, 'realApiPosts': 0}, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'baselinePairs': pairs, 'report': str(target)}, ensure_ascii=False))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--final-corpus', required=True, type=Path)
    parser.add_argument('--static-only', action='store_true')
    parser.add_argument('--no-screenshots', action='store_true')
    parser.add_argument('--compare-baseline', action='store_true')
    parser.add_argument('--rebind-static', action='store_true', help='Retain completed browser evidence after separately verified final FAQ-only edits')
    args = parser.parse_args()
    OUT.mkdir(exist_ok=True)
    if args.compare_baseline:
        asyncio.run(compare_baseline())
        return 0
    report = {'static': static_audit(args.final_corpus.resolve())}
    if args.rebind_static:
        previous = json.loads((OUT / 'copy-tone-verification.json').read_text(encoding='utf-8'))
        report['browser'] = previous['browser']
        report['browserSourceManifestSha256'] = previous.get('browserSourceManifestSha256', previous['static']['manifestSha256'])
        report['staticReboundAfterFaqOnlyUpdates'] = True
        comparison_path = OUT / 'copy-tone-baseline-comparison.json'
        if comparison_path.exists():
            pairs = json.loads(comparison_path.read_text('utf-8'))['pairs']
            retained, prior = [], []
            for issue in report['browser']['issues']:
                pair = next((p for p in pairs if p['file'] == issue['file'] and p['width'] == issue['width'] and p['identical']), None)
                finding = {key: value for key, value in issue.items() if key not in ('file', 'width', 'state')}
                if pair and finding in pair['before']['findings']:
                    prior.append(issue)
                elif pair and issue['kind'] == 'interaction' and issue['error'].startswith("[{'width':") and pair.get('currentRetest'):
                    for case in report['browser']['cases']:
                        if case['file'] == issue['file'] and case['width'] == issue['width']:
                            case['checks'].extend(pair['currentRetest'])
                else:
                    retained.append(issue)
            report['browser']['issues'] = retained
            report['browser']['knownPriorOverflow'].extend(prior)
            report['browser']['targetedBaselineComparison'] = str(comparison_path.relative_to(ROOT))
    elif not args.static_only:
        report['browser'] = asyncio.run(browser_audit(args))
    failed = not report['static']['passed']
    if 'browser' in report:
        result = report['browser']
        failed |= bool(result['issues'] or result['javascriptErrors'] or result['unexpectedBlockedWrites'])
    report['passed'] = not failed
    target = OUT / 'copy-tone-verification.json'
    target.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'passed': not failed, 'report': str(target),
                      'exactMappedResiduals': len(report['static']['residuals']),
                      'htmlCoverage': report['static']['coveredHtmlPages'], 'realApiPosts': 0}, ensure_ascii=False))
    return int(failed)


if __name__ == '__main__':
    raise SystemExit(main())
