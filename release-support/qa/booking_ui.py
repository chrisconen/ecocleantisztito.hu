"""Browser-level release integration checks. ALL remote requests are intercepted."""
from pathlib import Path
from datetime import date, timedelta
from urllib.parse import urlsplit
import json,sys
from playwright.sync_api import sync_playwright

OUT=Path(__file__).resolve().parent
LIVE='--live' in sys.argv
BASE='https://ecocleantisztito.hu/' if LIVE else 'http://127.0.0.1:8089/release/'
PREFIX='live-' if LIVE else ''
CASES=[argument for argument in sys.argv[1:] if not argument.startswith('--')]
day=(date.today()+timedelta(days=1)).isoformat()
reports=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    for width,scenario in [(1440,'normal'),(390,'normal'),(1440,'large'),(390,'large'),(1440,'conflict'),(390,'network')]:
        if CASES and scenario not in CASES:continue
        context=browser.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce')
        page=context.new_page()
        errors=[];writes=[];alerts=[];missing=[]
        page.on('pageerror',lambda error: errors.append(str(error)))
        page.on('dialog',lambda dialog: (alerts.append(dialog.message),dialog.dismiss()))
        page.on('response',lambda response: missing.append(response.url) if response.status>=400 and response.url.startswith(BASE) else None)
        def route(request):
            url=request.request.url
            if urlsplit(url).netloc in ('127.0.0.1:8089','ecocleantisztito.hu','www.ecocleantisztito.hu') and request.request.method in ('GET','HEAD'):
                request.continue_();return
            if url.endswith('/check-availability'):
                request.fulfill(json={'success':True,'days':[{'date':day,'status':'limited','slots':[
                    {'startMinutes':540,'startTime':'09:00','endTime':'11:00','maxDuration':120,'status':'available','fitsRequested':True,'isFirstSlot':True},
                    {'startMinutes':720,'startTime':'12:00','endTime':'15:00','maxDuration':180,'status':'available','fitsRequested':True,'isFirstSlot':False}
                ]}]});return
            if url.endswith(('/booking-request-hu','/large-order-request')):
                writes.append({'endpoint':urlsplit(url).path,'payload':request.request.post_data_json})
                if scenario=='network':request.abort();return
                request.fulfill(json={'success':scenario!='conflict','error':'SLOT_CONFLICT' if scenario=='conflict' else None});return
            if urlsplit(url).netloc in ('fonts.googleapis.com','fonts.gstatic.com'):
                request.continue_();return
            request.abort()
        context.route('**/*',route)
        page.goto(BASE+'index.html',wait_until='networkidle')
        page.evaluate('document.fonts.ready')
        plus=page.locator('[data-item-id="karpit_szofa"] .counter-btn').last
        for _ in range(20 if scenario=='large' else 1):plus.click()
        page.locator('#citySelect').select_option('gyor')
        page.locator('label:has([name="travelZone"][value="belvaros"])').click()
        if scenario=='large':
            page.locator('#largeOrderPanel').wait_for(state='visible')
            for id,value in {'largeOrderName':'Offline Test Company','largeOrderEmail':'offline@example.invalid','largeOrderPhone':'+36301234567','largeOrderAddress':'Offline teszt cím','largeOrderMessage':'Intercepted browser test'}.items():page.locator('#'+id).fill(value)
            assert page.locator('#largeOrderPrice').evaluate('(e)=>getComputedStyle(e).color')=='rgb(65, 91, 70)'
            page.locator('#largeOrderPanel').screenshot(path=str(OUT/f'{PREFIX}booking-large-{width}.png'),style='#nav{visibility:hidden!important}')
            page.locator('.large-order-submit').click()
        else:
            page.locator(f'[data-date="{day}"]').click()
            page.locator('[data-calendar-action="slot"][data-minutes="720"]').click()
            assert page.locator('[data-calendar-action="confirm"]').is_disabled()
            page.locator('[data-calendar-flexibility]').check()
            page.locator('[data-calendar-action="confirm"]').click()
            assert page.locator('[data-calendar-action="back"]').evaluate('(e)=>{const b=e.getBoundingClientRect();const r=document.createRange();r.selectNodeContents(e);return [...r.getClientRects()].every(v=>v.left>=b.left&&v.right<=b.right&&v.top>=b.top&&v.bottom<=b.bottom)}')
            for id,value in {'nameInput':'Offline Browser Test','emailInput':'offline@example.invalid','emailConfirmInput':'offline@example.invalid','phoneInput':'+36301234567','streetInput':'Offline utca 1.','cityInput':'Győr','plzInput':'9021','messageInput':'Intercepted browser test'}.items():page.locator('#'+id).fill(value)
            page.locator('#andanteLink').click()
            page.locator('.andante-modal-confirm').click()
            assert page.locator('#andanteCheckbox').evaluate('(e)=>e.getBoundingClientRect().width<=24')
            assert page.locator('.andante-checkbox-text').evaluate('(e)=>{const b=e.getBoundingClientRect();const r=document.createRange();r.selectNodeContents(e);return [...r.getClientRects()].every(v=>v.left>=b.left-2&&v.right<=b.right+2)}')
            page.locator('#bookingFormWrapper').screenshot(path=str(OUT/f'{PREFIX}booking-form-{width}-{scenario}.png'),style='#nav{visibility:hidden!important}')
            page.locator('.btn-submit').click()
        try:
            page.locator('#bookingResult[open]').wait_for(timeout=10000)
        except Exception:
            print(json.dumps({'width':width,'scenario':scenario,'alerts':alerts,'errors':errors,'writeCount':len(writes),'invalidFields':page.locator('input:invalid').evaluate_all('(nodes)=>nodes.map(e=>e.id)')}))
            raise
        assert len(writes)==1,writes
        assert not alerts,alerts
        assert not errors,errors
        assert not missing,missing
        message=page.locator('#bookingResult').inner_text()
        assert ('elküldve' in message) if scenario in ('normal','large') else ('betelt' in message if scenario=='conflict' else 'Nem tudtuk ellenőrizni' in message)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        page.locator('#bookingResult').screenshot(path=str(OUT/f'{PREFIX}booking-result-{width}-{scenario}.png'))
        reports.append({'width':width,'scenario':scenario,'writesIntercepted':len(writes),'endpoint':writes[0]['endpoint'],'payloadKeys':sorted(writes[0]['payload']),'consoleErrors':errors,'missingAssets':missing,'alerts':alerts})
        context.close()
    browser.close()
(OUT/(PREFIX+'booking-ui'+('-'+CASES[0] if CASES else '')+'.json')).write_text(json.dumps(reports,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'cases':len(reports),'interceptedWrites':sum(r['writesIntercepted'] for r in reports),'realBookingWrites':0,'issues':0}))
