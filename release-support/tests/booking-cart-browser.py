"""Exercise the mobile cart against the packaged site; block all external requests."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
import json
import atexit
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT/'scratch/booking-cart-qa'
OUT.mkdir(exist_ok=True)
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
Thread(target=server.serve_forever, daemon=True).start()
atexit.register(server.server_close)
atexit.register(server.shutdown)
BASE = f'http://127.0.0.1:{server.server_port}'
assert urlopen(BASE+'/release/index.html').status == 200
results = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for width in [320, 390, 768, 1440]:
        context = browser.new_context(viewport={'width': width, 'height': 844}, reduced_motion='reduce')
        context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(BASE) else route.abort())
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(BASE+'/release/index.html', wait_until='networkidle')
        tab = page.locator('#bookingCartTab')
        drawer = page.locator('#bookingCartDrawer')
        badge = page.locator('.booking-cart-badge')
        summary = page.locator('#priceSummary')
        assert summary.count() == 1
        if width > 768:
            expect(tab).to_be_hidden()
            assert summary.evaluate('(el) => el.parentElement.id') == 'priceConfigurator'
            results.append({'width': width, 'desktopSummaryPreserved': True, 'errors': errors})
            context.close()
            continue
        expect(tab).to_be_hidden()
        expect(badge).to_have_text('0')
        expect(summary).to_be_hidden()

        plus = page.locator('[onclick="incrementItem(\'karpit_szofa\', \'karpit\')"]')
        minus = page.locator('[onclick="decrementItem(\'karpit_szofa\')"]')
        plus.click()
        expect(badge).to_have_text('1')
        expect(tab).to_be_visible()
        box = tab.bounding_box()
        assert box['x'] == 0 and abs(box['y'] + box['height']/2 - 422) < 2
        tab.click()
        expect(drawer).to_be_visible()
        expect(page.locator('#bookingCartQuantity')).to_have_text('1 bútor az összeállításodban')
        expect(page.get_by_role('button', name='Kosár bezárása')).to_be_focused()
        page.keyboard.press('Escape')
        expect(drawer).to_be_hidden()
        expect(tab).to_be_focused()

        plus.click()
        expect(badge).to_have_text('2')
        page.locator('[onclick="incrementItem(\'karpit_l_kanape\', \'karpit\')"]').click()
        expect(badge).to_have_text('3')
        page.locator('#pillows-karpit_szofa').fill('4')
        page.locator('#pillows-karpit_szofa').press('Tab')
        expect(badge).to_have_text('3')
        expected_price = page.evaluate('State.totalPrice')
        assert expected_price == 49875
        page.evaluate("document.querySelector('#step3').scrollIntoView({block:'start'})")
        before = page.evaluate('window.scrollY')
        tab.click()
        expect(drawer).to_be_visible()
        expect(summary).to_be_visible()
        expect(page.locator('#bookingCartQuantity')).to_have_text('3 bútor az összeállításodban')
        assert page.evaluate('State.totalPrice') == expected_price
        assert '49' in page.locator('#totalPrice').inner_text()
        assert '4 db' in page.locator('#summaryDetails').inner_text()
        assert drawer.evaluate('(el) => el.scrollWidth <= el.clientWidth')
        assert summary.evaluate('(el) => el.scrollWidth <= el.clientWidth')
        assert page.evaluate('document.body.style.position') == 'fixed'
        page.screenshot(path=str(OUT/f'cart-open-{width}.png'))
        page.get_by_role('button', name='Kosár bezárása').click()
        expect(drawer).to_be_hidden()
        assert abs(page.evaluate('window.scrollY')-before) < 2
        assert page.evaluate('document.body.style.position') != 'fixed'
        page.screenshot(path=str(OUT/f'cart-tab-{width}.png'))
        minus.click()
        expect(badge).to_have_text('2')
        minus.click()
        expect(badge).to_have_text('1')
        page.locator('[onclick="decrementItem(\'karpit_l_kanape\')"]').click()
        expect(badge).to_have_text('0')
        expect(tab).to_be_hidden()
        page.set_viewport_size({'width': 1100, 'height': 844})
        page.set_viewport_size({'width': width, 'height': 844})
        expect(tab).to_be_hidden()
        plus.click()
        expect(tab).to_be_visible()
        page.locator('#serviceType [data-value="Matrac"]').click()
        expect(badge).to_have_text('0')
        expect(tab).to_be_hidden()
        page.locator('[onclick="incrementItem(\'matrac_francia_ab\', \'matrac\')"]').click()
        page.locator('#upsell-matrac_francia_ab input').first.check()
        expect(badge).to_have_text('1')
        tab.click()
        assert page.locator('#summaryDetails').inner_text().find('2 oldal') >= 0
        # Native modal blocks background interaction, and backdrop closes the drawer.
        page.mouse.click(width-2, 422)
        expect(drawer).to_be_hidden()
        tab.click()
        page.set_viewport_size({'width': 1100, 'height': 844})
        expect(drawer).to_be_hidden()
        expect(tab).to_be_hidden()
        assert summary.evaluate('(el) => el.parentElement.id') == 'priceConfigurator'
        assert page.evaluate('document.body.style.position') != 'fixed'
        page.set_viewport_size({'width': width, 'height': 844})
        expect(tab).to_be_visible()
        expect(badge).to_have_text('1')
        expect(summary).to_be_hidden()
        if width == 390:
            page.locator('#serviceType [data-value="Mindkettő"]').click()
            for category, ids in {
                'karpit': ['szofa', 'l_kanape', 'u_kanape', 'fotel', 'ebedlo_szek', 'irodai_szek'],
                'matrac': ['egyagyas_a', 'egyagyas_ab', 'francia_a', 'francia_ab', 'gyerek_a', 'gyerek_ab', 'kisagy_a', 'kisagy_ab']
            }.items():
                for item in ids:
                    page.locator(f'[onclick="incrementItem(\'{category}_{item}\', \'{category}\')"]').click()
            expect(badge).to_have_text('14')
            tab.click()
            scroller = page.locator('.booking-cart-content')
            assert scroller.evaluate('(el) => el.scrollHeight > el.clientHeight')
            scroller.evaluate('(el) => { el.scrollTop = el.scrollHeight; }')
            expect(page.locator('#summaryDuration')).to_be_in_viewport()
            expect(page.get_by_role('button', name='Kosár bezárása')).to_be_in_viewport()
            page.screenshot(path=str(OUT/'cart-long-390.png'))
            page.get_by_role('button', name='Kosár bezárása').click()
        assert not errors, errors
        results.append({'width': width, 'badgeAndPrices': True, 'closeEscapeBackdrop': True, 'responsiveRestore': True, 'errors': errors})
        context.close()

    # Exercise real motion and repeated opens separately from reduced-motion checks.
    context = browser.new_context(viewport={'width': 390, 'height': 844})
    context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(BASE) else route.abort())
    page = context.new_page()
    page.goto(BASE+'/release/index.html', wait_until='networkidle')
    page.locator('[onclick="incrementItem(\'karpit_szofa\', \'karpit\')"]').click()
    for _ in range(2):
        page.locator('#bookingCartTab').click()
        expect(page.locator('#bookingCartDrawer')).to_be_visible()
        assert page.locator('#bookingCartDrawer').evaluate('(el) => getComputedStyle(el).animationName') == 'booking-cart-enter'
        page.get_by_role('button', name='Kosár bezárása').click()
        expect(page.locator('#bookingCartDrawer')).to_be_hidden()
    context.close()
    # Original homepage uses the same cart asset, without the release UI enhancer.
    context = browser.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce')
    context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(BASE) else route.abort())
    page = context.new_page()
    page.goto(BASE+'/index.html', wait_until='networkidle')
    expect(page.locator('#bookingCartTab')).to_be_hidden()
    page.locator('#serviceType [data-value="Kárpit"]').click()
    page.locator('[onclick="incrementItem(\'karpit_szofa\', \'karpit\')"]').click()
    expect(page.locator('.booking-cart-badge')).to_have_text('1')
    page.locator('#bookingCartTab').click()
    expect(page.locator('#priceSummary')).to_be_visible()
    page.get_by_role('button', name='Kosár bezárása').click()
    expect(page.locator('#bookingCartDrawer')).to_be_hidden()
    context.close()
    browser.close()

(OUT/'results.json').write_text(json.dumps(results, indent=2), encoding='utf-8')
print(json.dumps(results))
