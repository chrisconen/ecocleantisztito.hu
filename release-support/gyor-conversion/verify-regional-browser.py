"""Local-only rollout checks. No bookings, emails or other external writes."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from urllib.parse import unquote
import json,re
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'docs/gyor-audit-2026-09-19/regional-conversion-qa';OUT.mkdir(parents=True,exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'release')))
Thread(target=server.serve_forever,daemon=True).start()
origin=f'http://127.0.0.1:{server.server_port}'
records=[]
def total(config):return int(re.sub(r'\D','',config.locator('.med-config-total').inner_text()))
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True)
  context=browser.new_context(reduced_motion='reduce')
  def route(r):
    if r.request.url.startswith(origin+'/') and r.request.method=='GET':return r.continue_()
    if r.request.url.startswith('https://reviews.chris-conen.workers.dev/') and r.request.method=='GET':return r.fulfill(status=200,content_type='application/json',body=json.dumps(dict(rating=5,total=212,googleMapsUri='https://maps.google.com/?cid=10581696163890001047',reviews=[])))
    return r.abort()
  context.route('**/*',route)
  for city in ['szombathely','mosonmagyarovar','baja','dunafoldvar']:
   med=city in ['baja','dunafoldvar']
   for en in [False,True]:
    file=('en/upholstery-cleaning-' if en else 'karpittisztitas-')+city+'.html'
    for width in [320,390,768,1440]:
     page=context.new_page();page.set_viewport_size(dict(width=width,height=960));errors=[]
     page.on('pageerror',lambda error:errors.append(str(error)))
     page.goto(origin+'/'+file,wait_until='networkidle')
     assert not errors,(file,errors)
     assert page.locator('.gyor-hero img').evaluate_all('images=>images.every(i=>i.complete&&i.naturalWidth>0)')
     assert '212' in page.locator('[data-gyor-rating]').inner_text()
     if not page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'):
      page.screenshot(path=str(OUT/'overflow.png'))
      raise AssertionError((file,width,page.evaluate("[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&(r.right>innerWidth+1||r.left< -1)&&getComputedStyle(e).position!=='fixed'}).map(e=>({cls:e.className,text:e.textContent.slice(0,50),width:e.getBoundingClientRect().width})).slice(0,20)")))
     page.screenshot(path=str(OUT/(file.replace('/','-')+f'-{width}.png')))
     if width<=390:
      toggle=page.locator('.bixol-mobile-hamburger' if med else '.nav-mobile-toggle')
      toggle.click();assert page.locator('.gyor-mobile-booking').is_hidden()
      (page.locator('[data-conversion-menu-close]') if med else toggle).click()
     page.locator('.gyor-hero-copy .gyor-button').click()
     target='arak' if med else 'studio-kalkulator'
     page.wait_for_function("id=>{const r=document.getElementById(id).getBoundingClientRect();return r.top>=-1&&r.top<innerHeight/2}",arg=target)
     config=page.locator('[data-med-configurator]' if med else '[data-studio-configurator]')
     config.locator(('[data-product="straight-sofa"]' if med else '[data-group="sofa"]')+' [data-delta="1"]').click()
     base=15500 if med else 18000
     assert total(config)==base,(file,total(config))
     for zone,fee in [('belvaros',3500),('kulso',4000),('20km',4500),('40km',5500)]:
      config.locator('[data-zone]').select_option(zone)
      assert total(config)==base+fee,(file,zone,total(config))
     if width==390:
      if med:
       mail=config.locator('[data-email-inquiry]');assert mail.count()==1
       text=unquote(mail.get_attribute('href'));assert 'info@ecocleantisztito.hu' in text and '21000' in re.sub(r'\s','',text)
       assert config.locator('[data-booking-handoff]').count()==0
      else:
       config.locator('[data-booking-handoff]').click();page.wait_for_load_state('networkidle')
       page.locator('[data-studio-import]').click()
       assert page.evaluate('State.city')==city
       assert page.evaluate('State.totalPrice')==23500
       assert page.evaluate('State.travelZone')=='40km'
     records.append(dict(file=file,width=width,basePrice=base,travelFees=[3500,4000,4500,5500],flow='inquiry' if med else 'booking',passed=True))
     page.close()
  browser.close()
finally:
 server.shutdown()
 (OUT/'report.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(dict(checks=len(records),passed=all(r['passed'] for r in records))))
