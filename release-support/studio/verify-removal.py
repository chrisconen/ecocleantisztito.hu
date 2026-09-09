"""Verify explicit calculator removal without sending orders or API writes."""
import json
import sys
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

live = '--live' in sys.argv
base = 'https://ecocleantisztito.hu/' if live else 'http://127.0.0.1:8089/release/'
out = Path(__file__).parent / 'qa'
results = []
writes = []
with sync_playwright() as p:
    browser = p.chromium.launch()
    for width in (320, 390, 1440):
        context = browser.new_context(viewport={'width': width, 'height': 950}, reduced_motion='reduce', service_workers='block')
        def intercept(route):
            req = route.request
            if req.method not in ('GET', 'HEAD'):
                writes.append(req.url)
                route.abort()
            elif '/api/' in urlsplit(req.url).path:
                route.fulfill(json={'enabled': False, 'ready': False})
            elif urlsplit(req.url).netloc == urlsplit(base).netloc:
                route.continue_()
            else:
                route.abort()
        context.route('**/*', intercept)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(base + 'karpittisztitas-gyor.html', wait_until='networkidle')
        def click(selector): page.locator(selector).click()
        def state(): return page.evaluate("document.querySelector('[data-studio-configurator]').ecoStudioConfigurator.snapshot()")
        def total(): return page.locator('.med-config-total').inner_text()
        click('[data-group=sofa] [data-delta="1"]')
        click('[data-group=sofa] [data-delta="1"]')
        page.locator('[data-group=sofa] [data-item-extra=atkairtas]').check()
        click('[data-group=mattress] [data-delta="1"]')
        page.locator('[data-variant]').last.select_option('matrac_egyagyas_ab')
        click('[data-group=mattress] [data-delta="1"]')
        page.locator('[data-extra=matrac_nedves_tisztitas]').check()
        page.locator('[data-extra=karpit_impregnalas]').check()
        page.locator('[data-zone]').select_option('belvaros')
        assert page.locator('[data-remove-item]').count() == 3
        for button in page.locator('[data-remove-item]').all():
            assert button.inner_text() == 'Tétel törlése'
            assert button.locator('svg').count() == 1
            assert button.bounding_box()['height'] >= 44
        page.locator('.med-config-summary').screenshot(path=str(out / f'{"live" if live else "local"}-removal-{width}.png'))
        click('[data-remove-item=karpit_szofa]')
        s = state()
        assert len(s['items']) == 2 and all(i['id'].startswith('matrac_') for i in s['items'])
        assert s['extras'] == ['matrac_nedves_tisztitas']
        assert page.locator('[data-group=sofa] [data-count]').inner_text() == '0 db'
        assert page.locator('[data-group=sofa] [data-item-extra=atkairtas]').is_disabled()
        assert not page.locator('[data-group=sofa] [data-item-extra=atkairtas]').is_checked()
        assert ''.join(c for c in total() if c.isdigit()) == '38500', total()
        assert page.evaluate('document.activeElement.dataset.removeItem') == 'matrac_egyagyas_a'
        page.keyboard.press('Enter')
        assert [i['id'] for i in state()['items']] == ['matrac_egyagyas_ab']
        assert state()['extras'] == ['matrac_nedves_tisztitas']
        assert ''.join(c for c in total() if c.isdigit()) == '25500', total()
        assert page.locator('[data-group=mattress] [data-count]').inner_text() == '1 db'
        page.keyboard.press('Enter')
        assert state()['items'] == [] and state()['extras'] == []
        assert total() == '0 Ft'
        assert page.locator('[data-booking-handoff]').get_attribute('aria-disabled') == 'true'
        assert page.locator('[data-booking-handoff]').get_attribute('href') is None
        assert page.evaluate("document.activeElement.hasAttribute('data-reset')")
        assert page.locator('[data-group=mattress] [data-count]').inner_text() == '0 db'
        assert not errors, errors
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
        results.append({'width': width, 'passed': True, 'allQuantitiesRemoved': True, 'otherVariantsPreserved': True, 'extrasAndDiscountRecalculated': True, 'keyboardFocusPreserved': True})
        context.close()
    browser.close()
assert not writes, writes
report = {'base': base, 'results': results, 'writes': writes}
(out / ('live-removal.json' if live else 'removal.json')).write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report))
