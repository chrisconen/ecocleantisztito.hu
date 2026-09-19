"""Booking relocation UI contract. External requests are mocked; no orders sent."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from datetime import date,timedelta
import json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'docs/gyor-audit-2026-09-19/homepage-booking-qa';OUT.mkdir(parents=True,exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def copyfile(self,source,outputfile):
  try:super().copyfile(source,outputfile)
  except (ConnectionAbortedError,ConnectionResetError,BrokenPipeError):pass # Legacy redirect cancels old page assets.
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'release')))
Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_port}'
records=[];day=(date.today()+timedelta(days=1)).isoformat()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True)
  for en in [False,True]:
   for width in [390,1440]:
    context=browser.new_context(viewport=dict(width=width,height=960),reduced_motion='reduce')
    requests=[];errors=[]
    def route(r):
     url=r.request.url
     if url.startswith(origin+'/') and r.request.method=='GET':return r.continue_()
     requests.append(url)
     if '/check-availability' in url:return r.fulfill(status=200,content_type='application/json',body=json.dumps(dict(success=True,days=[dict(date=day,status='limited',slots=[dict(startMinutes=900,startTime='15:00',endTime='17:00',maxDuration=120,status='available',fitsRequested=True,isFirstSlot=False)])])))
     if url.startswith('https://reviews.'):return r.fulfill(status=200,content_type='application/json',body=json.dumps(dict(rating=5,total=212,googleMapsUri='https://maps.google.com/?cid=10581696163890001047',reviews=[])))
     return r.abort()
    context.route('**/*',route);page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    home='en/index.html' if en else 'index.html';booking='en/booking.html' if en else 'megrendeles.html'
    page.goto(origin+'/'+home,wait_until='networkidle')
    assert page.locator('#bookingForm,#bookingCalendar,#priceConfigurator').count()==0
    assert not any('/check-availability' in u for u in requests)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    page.locator('.services-grid .service-card').first.click()
    try:page.wait_for_function("Math.abs(document.getElementById('teruletek').getBoundingClientRect().top)<innerHeight/2",timeout=4000)
    except:
     page.screenshot(path=str(OUT/'home-failure.png'))
     print(dict(errors=errors,url=page.url,info=page.evaluate("({scroll:scrollY,top:document.getElementById('teruletek').getBoundingClientRect().top,href:document.querySelector('.services-grid .service-card').getAttribute('href'),text:document.querySelector('.services-grid .service-card').textContent,overlay:document.querySelector('.mega-menu-overlay').className})")))
     raise
    assert page.locator('#teruletek .coverage-card').first.is_visible()
    assert not page.locator('#megaMenuContainer').is_visible()
    assert not errors,errors
    page.screenshot(path=str(OUT/f'home-city-menu-{en}-{width}.png'))
    for city,expected in [('gyor',7900),('szombathely',21500)]:
     file=('en/upholstery-cleaning-' if en else 'karpittisztitas-')+city+'.html'
     page.goto(origin+'/'+file,wait_until='networkidle')
     config=page.locator('[data-studio-configurator]')
     config.locator('[data-group="sofa"] [data-delta="1"]').click();config.locator('[data-zone]').select_option('belvaros')
     link=config.locator('[data-booking-handoff]');href=link.get_attribute('href');assert booking.split('/')[-1] in href
     link.click();page.wait_for_load_state('networkidle')
     assert page.url.startswith(origin+'/'+booking)
     page.locator('[data-studio-import]').click()
     assert page.evaluate('State.city')==city
     assert page.evaluate('State.totalPrice')==expected
     assert page.locator('#bookingForm').is_visible()
     assert page.locator('#bookingCalendar').inner_text()
     if city=='gyor' and width==390:
      page.locator('[data-calendar-action="date"][data-date="'+day+'"]').click()
      page.locator('[data-calendar-action="slot"][data-minutes="900"]').click()
      page.locator('[data-calendar-flexibility]').check()
      page.locator('[data-calendar-action="confirm"]').click()
      assert page.evaluate('BookingCalendar.isValid()')
     assert not errors,(en,width,errors)
     assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
     page.screenshot(path=str(OUT/f'booking-{city}-{en}-{width}.png'))
     # A previously saved homepage cart still reaches the same form and price.
     fragment=href[href.index('#'):]
     page.goto(origin+'/'+home+fragment,wait_until='networkidle')
     page.wait_for_url('**/'+booking+'#booking*')
     page.locator('[data-studio-import]').click()
     assert page.evaluate('State.totalPrice')==expected
     records.append(dict(language='en' if en else 'hu',width=width,city=city,total=expected,legacyCart=True,passed=True))
    page.goto(origin+'/'+home+'#booking',wait_until='networkidle');page.wait_for_url('**/'+booking+'#booking')
    assert page.locator('#priceConfigurator').is_visible()
    assert not errors,errors
    assert not any('booking-request' in u or 'large-order' in u for u in requests)
    context.close()
  browser.close()
finally:
 server.shutdown();(OUT/'report.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(dict(checks=len(records),passed=all(r['passed'] for r in records))))
