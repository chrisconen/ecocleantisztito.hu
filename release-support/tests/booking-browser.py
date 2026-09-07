"""Browser integration smoke: intercept ALL writes and external traffic offline."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import datetime
import json
import os

BASE = os.environ.get('ECO_QA_BASE', 'http://127.0.0.1:8089/release/')
OUT = Path(__file__).resolve().parent
date = str(datetime.date.today() + datetime.timedelta(days=1))
fixture = {'success': True, 'days': [{'date': date, 'status': 'limited', 'slots': [
    {'startMinutes': 540, 'startTime': '09:00', 'endTime': '11:00', 'maxDuration': 120, 'status': 'available', 'fitsRequested': True, 'isFirstSlot': True},
    {'startMinutes': 720, 'startTime': '12:00', 'endTime': '15:00', 'maxDuration': 180, 'status': 'available', 'fitsRequested': True, 'isFirstSlot': False}
]}]}
results = []
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for width in (1440, 390):
        writes, errors, availability_calls = [], [], []
        context = browser.new_context(viewport={'width': width, 'height': 1000}, reduced_motion='reduce')
        def intercept(route):
            url = route.request.url
            if url.endswith('/webhook/check-availability'):
                availability_calls.append(route.request.post_data_json)
                route.fulfill(json=fixture, headers={'Access-Control-Allow-Origin': '*'})
            elif '/webhook/booking-request' in url or url.endswith('/webhook/large-order-request'):
                writes.append({'path': url.rsplit('/', 1)[-1], 'body': route.request.post_data_json})
                route.fulfill(json={'success': True}, headers={'Access-Control-Allow-Origin': '*'})
            elif url.startswith('http://127.0.0.1:8089/'):
                route.continue_()
            else:
                route.abort()
        context.route('**/*', intercept)
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(BASE, wait_until='networkidle')
        assert page.locator('#configStatus').inner_text() == '● Online foglalás'
        page.locator('[onclick="incrementItem(\'karpit_szofa\', \'karpit\')"]').click()
        page.select_option('#citySelect', 'gyor')
        page.locator('label:has([name="travelZone"][value="belvaros"])').click()
        page.locator(f'[data-date="{date}"]').click()
        page.locator('[data-minutes="720"]').click()
        assert not page.evaluate('BookingCalendar.isValid()')
        page.locator('[data-calendar-flexibility]').check()
        page.locator('[data-calendar-action="confirm"]').click()
        assert page.evaluate('BookingCalendar.isValid()')
        page.select_option('#citySelect', 'sopron')
        assert not page.evaluate('BookingCalendar.isValid()')
        page.locator(f'[data-date="{date}"]').click()
        page.locator('[data-minutes="540"]').click()
        page.locator('[data-calendar-action="confirm"]').click()
        for field, value in {'nameInput': 'Offline Test', 'emailInput': 'offline@example.invalid', 'emailConfirmInput': 'offline@example.invalid', 'phoneInput': '+36 30 123 4567', 'streetInput': 'Offline utca 1.', 'plzInput': '9400', 'cityInput': 'Sopron'}.items():
            page.locator('#' + field).fill(value)
        page.evaluate('openAndanteModal()')
        page.locator('[onclick="confirmAndante()"]').click()
        assert page.locator('#andanteCheckbox').is_checked()
        page.locator('.btn-submit').click()
        page.locator('#bookingResult[open]').wait_for()
        assert 'elküldve' in page.locator('#bookingResultTitle').inner_text()
        assert len(writes) == 1 and writes[0]['path'] == 'booking-request-hu'
        assert writes[0]['body']['city'] == 'sopron'
        assert writes[0]['body']['totalPrice'] == 19000
        assert writes[0]['body']['date'] == date
        assert page.locator('.btn-submit').is_disabled()
        page.locator('#bookingResult').screenshot(path=str(OUT / f'booking-result-{width}.png'))
        page.locator('#bookingResult button').click()
        assert not page.locator('#bookingResult').is_visible()
        assert not errors, errors
        results.append({'width': width, 'availabilityCalls': len(availability_calls), 'interceptedBookings': len(writes), 'pageErrors': errors, 'resultDialog': 'passed', 'regionChange': 'passed', 'flexibility': 'passed'})
        context.close()
    browser.close()
print(json.dumps(results, ensure_ascii=False))
