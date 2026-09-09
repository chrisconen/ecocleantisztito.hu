"""Actual release Studio→booking QA, with all network writes intercepted.

Local: python release-support/studio/verify-booking.py
       python release-support/studio/verify-booking.py --base http://127.0.0.1:8089/release/
Live:  python release-support/studio/verify-booking.py --live

Run only after the release builder is ready. Uses the served booking runtime;
does not patch production scripts, submit orders, send email, or call availability.
All availability requests receive fixtures. Every other non-GET/HEAD is aborted
and fails the run. Material-health is an offline fixture and external scripts are
blocked. Contact fields contain .invalid fixture data in an isolated browser only.
"""
from pathlib import Path
from datetime import date, timedelta, datetime, timezone
from urllib.parse import urlsplit, quote, urljoin
import argparse
import hashlib
import json
import sys
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
SOURCE = 'karpittisztitas-gyor.html'
LIVE = 'https://ecocleantisztito.hu/'
CONTACT = {'nameInput': 'Offline Studio Test', 'phoneInput': '+36301234567', 'emailInput': 'offline@example.invalid'}


def snapshot(page):
    return page.evaluate('''() => ({
      items: JSON.parse(JSON.stringify(State.selectedItems)),
      extras: JSON.parse(JSON.stringify(State.globalUpsells)),
      city: State.city, zone: State.travelZone, total: State.totalPrice,
      duration: State.totalDuration, discount: State.discount,
      large: State.isLargeOrder, service: State.serviceType,
      slot: BookingCalendar.state.selectedSlot, date: BookingCalendar.state.selectedDate,
      andante: document.querySelector('#andanteCheckbox')?.checked ?? false,
      name: document.querySelector('#nameInput').value,
      phone: document.querySelector('#phoneInput').value,
      email: document.querySelector('#emailInput').value
    })''')


def fragment(data):
    return '#booking?eco-config=' + quote(json.dumps(data, ensure_ascii=False, separators=(',', ':')), safe='')


def navigate(page, base, path):
    page.goto('about:blank')
    page.goto(urljoin(base, path), wait_until='networkidle')
    page.evaluate('document.fonts.ready')


def no_overflow(page):
    actual = page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})')
    assert actual['scroll'] <= actual['width'] + 1, actual


def seed_cart(page, name='Offline Studio Test'):
    # Initialize the existing release form through its real service button.
    # Contact controls can remain hidden until a slot is chosen; seed their values
    # without selecting an appointment, to verify that import preserves prior data.
    page.locator('#serviceType [data-value="Kárpit"]').click()
    page.locator('[data-item-id="karpit_fotel"] .counter-btn').last.click()
    values = {**CONTACT, 'nameInput': name}
    for field, value in values.items():
        page.locator('#' + field).evaluate('(el, value) => { el.value = value; el.dispatchEvent(new Event("input", {bubbles:true})); }', value)
    assert snapshot(page)['items']['karpit_fotel']['count'] == 1


def observed_prices(page):
    return page.evaluate('''() => ({pricing:PRICING,extras:UPSELLS,discounts:DISCOUNTS,largeThreshold:LARGE_ORDER.threshold})''')


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--live', action='store_true')
    mode.add_argument('--base', default=None)
    parser.add_argument('--output', type=Path, default=Path(__file__).parent / 'qa')
    args = parser.parse_args(argv)
    base = LIVE if args.live else (args.base or 'http://127.0.0.1:8089/release/')
    parsed = urlsplit(base)
    if (not args.live and (parsed.scheme != 'http' or parsed.hostname not in ('localhost', '127.0.0.1'))) or parsed.query or parsed.fragment:
        parser.error('--base must be a loopback HTTP directory; use --live for the production site.')
    base = base.rstrip('/') + '/'
    origin = parsed.scheme + '://' + parsed.netloc
    homepage = urlsplit(urljoin(base, 'index.html')).path
    out = args.output.resolve()
    if not out.is_relative_to(ROOT):
        parser.error('--output must remain inside the project workspace.')
    out.mkdir(parents=True, exist_ok=True)
    reports, issues, blocked_writes, availability, preflights, served_assets = [], [], [], [], [], set()
    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    local_paths = ['index.html', SOURCE, 'ui/booking-live.js', 'ui/calendar-live.js', 'studio/configurator.js', 'studio/booking-handoff.js']
    local_hashes = {name: hashlib.sha256((ROOT / 'release' / name).read_bytes()).hexdigest() for name in local_paths if (ROOT / 'release' / name).exists()}

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        for width in (390, 1440):
            context = browser.new_context(viewport={'width': width, 'height': 1000}, reduced_motion='reduce', service_workers='block')
            page = context.new_page()
            page.set_default_timeout(15000)
            errors, missing = [], []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('dialog', lambda dialog: (errors.append('Unexpected dialog: ' + dialog.message), dialog.dismiss()))

            def response_seen(response):
                target = urlsplit(response.url)
                if target.netloc == parsed.netloc and response.status >= 400:
                    missing.append({'path': target.path, 'status': response.status})
                if target.netloc == parsed.netloc and target.path.endswith(('.js', '.css')):
                    served_assets.add(response.url)
            page.on('response', response_seen)

            def network(route):
                req = route.request
                target = urlsplit(req.url)
                is_availability = target.netloc == 'hub.centaur-lang.dev' and target.path == '/webhook/check-availability'
                cors = {'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Access-Control-Allow-Headers': 'content-type'}
                if req.method not in ('GET', 'HEAD'):
                    if is_availability and req.method == 'OPTIONS':
                        preflights.append(target.path)
                        route.fulfill(status=204, headers=cors)
                    elif is_availability and req.method == 'POST':
                        availability.append({'width': width, 'payload': req.post_data_json})
                        route.fulfill(headers=cors, json={'success': True, 'days': [{'date': tomorrow, 'status': 'limited', 'slots': [
                            {'startMinutes': 540, 'startTime': '09:00', 'endTime': '17:00', 'maxDuration': 480,
                             'status': 'available', 'fitsRequested': True, 'isFirstSlot': True}
                        ]}]})
                    else:
                        blocked_writes.append({'width': width, 'method': req.method, 'host': target.netloc, 'path': target.path})
                        route.abort()
                    return
                if target.path.endswith('/api/material-health'):
                    route.fulfill(json={'enabled': False, 'ready': False, 'collection_enabled': False})
                    return
                if target.netloc == parsed.netloc and '/api/' not in target.path:
                    route.continue_()
                elif target.netloc in ('fonts.googleapis.com', 'fonts.gstatic.com'):
                    route.continue_()
                else:
                    route.abort()
            context.route('**/*', network)
            case = {'width': width, 'page': SOURCE}
            try:
                navigate(page, base, SOURCE)
                configurator = page.locator('[data-studio-configurator]')
                configurator.locator('.med-product').first.wait_for()
                assert configurator.count() == 1
                assert configurator.locator('.med-product').count() == 6
                assert configurator.locator('button:not([type="button"])').count() == 0
                assert configurator.locator('.studio-tariff-note').count() == 0
                mattress_guide = configurator.locator('[data-group="mattress"] [data-extra-guide]')
                assert mattress_guide.count() == 1
                wet_anchor = mattress_guide.get_attribute('href')
                assert wet_anchor and wet_anchor.startswith('#studio-config-') and wet_anchor.endswith('-matrac_nedves_tisztitas'), wet_anchor
                wet_label = configurator.locator(wet_anchor)
                assert wet_label.count() == 1
                assert wet_label.evaluate('(el) => el.tagName') == 'LABEL'
                assert wet_label.locator('[data-extra="matrac_nedves_tisztitas"]').count() == 1
                assert 'nedves' in mattress_guide.inner_text().lower()
                for group in ('sectional', 'sofa'):
                    atka_label = configurator.locator('[data-group="' + group + '"] label').filter(has=page.locator('[data-item-extra="atkairtas"]'))
                    assert atka_label.inner_text().startswith('Atkairtás'), atka_label.inner_text()
                    assert 'Száraz mélytisztítás' not in atka_label.inner_text()
                case['mattressWetExtraGuide'] = True
                case['atkairtasLabel'] = True
                assert configurator.locator('[data-booking-handoff]').get_attribute('href') is None

                configurator.locator('[data-group="armchair"] [data-delta="1"]').click()
                configurator.locator('[data-zone]').select_option('kulso')
                configurator.locator('[data-reset]').click()
                assert configurator.evaluate('(el) => el.ecoStudioConfigurator.snapshot().items.length') == 0
                assert configurator.locator('[data-zone]').input_value() == ''
                assert configurator.locator('[data-booking-handoff]').get_attribute('href') is None

                configurator.locator('[data-group="sectional"] [data-delta="1"]').click()
                configurator.locator('[data-group="sectional"] [data-item-extra="atkairtas"]').check()
                configurator.locator('[data-group="sectional"] [data-item-extra="agyazhato"]').check()
                for _ in range(2):
                    configurator.locator('[data-group="dining"] [data-delta="1"]').click()
                for extra in ['karpit_folteltavolitas', 'karpit_impregnalas']:
                    configurator.locator('[data-extra="' + extra + '"]').check()
                configurator.locator('[data-group="mattress"] [data-variant]').select_option('matrac_francia_ab')
                configurator.locator('[data-group="mattress"] [data-delta="1"]').click()
                configurator.locator('[data-zone]').select_option('belvaros')
                selection = configurator.evaluate('(el) => el.ecoStudioConfigurator.snapshot()')
                estimate = configurator.evaluate('(el) => el.ecoStudioConfigurator.calculate()')
                shown_total = configurator.locator('.med-config-total').inner_text()
                assert int(''.join(c for c in shown_total if c.isdigit())) == estimate['total']
                no_overflow(page)
                configurator.locator('.med-config-summary').screenshot(path=str(out / f'booking-source-{width}.png'))

                with page.expect_navigation(wait_until='networkidle'):
                    configurator.locator('[data-booking-handoff]').click()
                assert urlsplit(page.url).path == homepage
                panel = page.locator('.studio-handoff')
                panel.wait_for(state='visible')
                assert shown_total in panel.inner_text()
                before = snapshot(page)
                assert not before['items'] and before['slot'] is None and not before['andante']
                case['servedPricing'] = observed_prices(page)
                seed_cart(page)
                panel.screenshot(path=str(out / f'booking-review-{width}.png'))
                panel.locator('[data-studio-import]').click()
                page.wait_for_function('location.hash === "#booking"')
                actual = snapshot(page)
                expected_items = {item['id']: {'count': item['count'], 'upsells': item['upsells'], 'category': item['id'].split('_')[0]} for item in selection['items']}
                assert actual['items'] == expected_items, (actual['items'], expected_items)
                assert sorted(actual['extras']) == sorted(selection['extras'])
                assert (actual['total'], actual['duration'], actual['discount']) == (estimate['total'], estimate['duration'], estimate['discount'])
                assert actual['city'] == 'gyor' and actual['zone'] == 'belvaros'
                assert actual['slot'] is None and actual['date'] is None and not actual['andante']
                assert (actual['name'], actual['phone'], actual['email']) == tuple(CONTACT.values())
                assert page.locator('#upsellOptions input:checked').count() == len(selection['extras'])
                assert page.locator('.item-upsell input:checked').count() == sum(len(item['upsells']) for item in selection['items'])
                assert page.locator('[name="travelZone"]:checked').input_value() == 'belvaros'
                page.evaluate('EcoStudioBookingHandoff.start()')
                assert page.locator('.studio-handoff').count() == 1
                no_overflow(page)
                panel.screenshot(path=str(out / f'booking-imported-{width}.png'))
                case.update(total=actual['total'], duration=actual['duration'], items=len(actual['items']), explicitImport=True, contactPreserved=True)

                navigate(page, base, 'index.html' + fragment(selection))
                seed_cart(page)
                discard_before = snapshot(page)
                page.locator('.studio-handoff button').last.click()
                assert snapshot(page) == discard_before
                assert page.locator('.studio-handoff').count() == 0
                assert urlsplit(page.url).fragment == 'booking'

                invalid = ['#booking?eco-config=%XX']
                for city in ['kalocsa', 'baja', 'kiskoros', 'szekszard', 'paks', 'solt', 'dunafoldvar']:
                    invalid.append(fragment({**selection, 'city': city, 'sourcePage': 'karpittisztitas-' + city + '.html'}))
                for altered in [{'totalPrice': 1}, {'travelZone': 'unknown'}, {'city': 'sopron'}, {'version': 2}]:
                    invalid.append(fragment({**selection, **altered}))
                for value in invalid:
                    navigate(page, base, 'index.html' + value)
                    assert page.locator('.studio-handoff').count() == 1
                    assert page.locator('[data-studio-import]').count() == 0
                    rejected = snapshot(page)
                    assert not rejected['items'] and rejected['city'] is None and rejected['slot'] is None
                    assert urlsplit(page.url).fragment == 'booking'
                case['invalidPayloadsRejected'] = len(invalid)

                large = {**selection, 'items': [{'id': 'karpit_u_kanape', 'count': 10, 'upsells': []}], 'extras': []}
                navigate(page, base, 'index.html' + fragment(large))
                large_estimate = page.evaluate('(value) => EcoStudioConfig.calculate(value)', large)
                assert large_estimate['duration'] > 480 and large_estimate['isLargeOrder']
                assert not snapshot(page)['items']
                page.locator('[data-studio-import]').click()
                page.wait_for_function('location.hash === "#booking"')
                large_actual = snapshot(page)
                assert large_actual['large'] and large_actual['duration'] == large_estimate['duration']
                assert (large_actual['total'], large_actual['discount']) == (large_estimate['total'], large_estimate['discount'])
                assert large_actual['items'] == {'karpit_u_kanape': {'count': 10, 'upsells': [], 'category': 'karpit'}}
                assert large_actual['slot'] is None and large_actual['date'] is None and not large_actual['andante']
                assert page.locator('#largeOrderPanel').is_visible()
                assert not page.locator('#calendarWrapper').is_visible()
                assert not page.locator('#bookingFormWrapper').is_visible()
                assert int(''.join(c for c in page.locator('#largeOrderPrice').inner_text() if c.isdigit())) == large_estimate['total']
                assert 'nagyobb összeállítás' in page.locator('.studio-handoff [role="status"]').inner_text()
                no_overflow(page)
                page.locator('#largeOrderPanel').screenshot(path=str(out / f'booking-large-{width}.png'))
                case['largeOrder'] = {'total': large_actual['total'], 'duration': large_actual['duration'], 'quoteVisible': True, 'calendarHidden': True}

                # Mutate only this isolated browser's constants. Every mismatch
                # must fail before altering the visitor's existing basket/contact.
                mutations = {
                    'itemPrice': "PRICING.karpit.l_kanape.price += 1",
                    'itemDuration': "PRICING.karpit.l_kanape.duration += 1",
                    'itemExtra': "PRICING.karpit.l_kanape.atkaPrice += 1",
                    'globalExtra': "UPSELLS.karpit.folteltavolitas.price += 1",
                    'travelCost': "PRICING.travelZones.belvaros.fee += 1",
                    'discount': "DISCOUNTS.combo.percent += 1",
                }
                case['driftRejectedBeforeMutation'] = []
                for label, mutation in mutations.items():
                    navigate(page, base, 'index.html' + fragment(selection))
                    seed_cart(page, 'Offline Drift Test')
                    before = snapshot(page)
                    page.evaluate(mutation)
                    page.locator('[data-studio-import]').click()
                    assert snapshot(page) == before, label + ' drift changed the basket'
                    drift_status = page.locator('.studio-handoff [role="status"]').inner_text()
                    assert 'változ' in drift_status, (label, drift_status)
                    assert page.locator('[data-studio-import]').is_enabled()
                    assert urlsplit(page.url).fragment.startswith('booking?eco-config=')
                    case['driftRejectedBeforeMutation'].append(label)
                assert not errors, errors
                assert not missing, missing
                case['ok'] = True
            except Exception as error:
                case.update(ok=False, error=str(error), pageErrors=errors, missing=missing, url=page.url)
                issues.append(case)
                page.screenshot(path=str(out / f'booking-failure-{width}.png'), full_page=True)
            reports.append(case)
            print(json.dumps({key: value for key, value in case.items() if key != 'servedPricing'}, ensure_ascii=False), flush=True)
            context.close()
        browser.close()
    changed = [name for name, before in local_hashes.items() if hashlib.sha256((ROOT / 'release' / name).read_bytes()).hexdigest() != before]
    report = {'base': base, 'live': args.live, 'checkedUtc': datetime.now(timezone.utc).isoformat(), 'cases': reports,
              'issues': issues, 'blockedWrites': blocked_writes, 'mockedAvailabilityRequests': len(availability),
              'mockedAvailabilityPreflights': len(preflights), 'realWrites': 0, 'servedAssetUrls': sorted(served_assets),
              'reviewedLocalSha256': local_hashes, 'localFilesChangedDuringQA': changed}
    output = out / ('booking-live-verification.json' if args.live else 'booking-release-verification.json')
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'report': str(output), 'cases': len(reports), 'issues': len(issues), 'blockedWrites': len(blocked_writes), 'realWrites': 0}, ensure_ascii=False))
    return 1 if issues or blocked_writes or changed else 0


if __name__ == '__main__':
    sys.exit(main())
