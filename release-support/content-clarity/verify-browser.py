"""Read-only local browser checks. External requests and every non-GET are blocked."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
import json, re
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'docs/gyor-audit-2026-09-19/local-tariff-nav-qa'
OUT.mkdir(parents=True,exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'release')))
Thread(target=server.serve_forever,daemon=True).start()
origin=f'http://127.0.0.1:{server.server_port}'
records=[]
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True)
  context=browser.new_context()
  context.route('**/*',lambda route:route.continue_() if route.request.url.startswith(origin) and route.request.method=='GET' else route.abort())
  for file in ['karpittisztitas-gyor.html','karpittisztitas-szombathely.html','matractisztitas-tatabanya.html','takaritas-szombathely.html','karpittisztitas-paks.html','komarom.html','en/upholstery-cleaning-szombathely.html']:
   for width in [390,1440]:
    page=context.new_page();page.set_viewport_size({'width':width,'height':950});errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(origin+'/'+file,wait_until='networkidle')
    assert not errors,(file,errors)
    if not page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'):
     page.screenshot(path=str(OUT/'overflow.png'))
     print(json.dumps(page.evaluate("({width:innerWidth,doc:document.documentElement.scrollWidth,body:document.body.scrollWidth,nodes:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&(r.right>innerWidth+1||e.scrollWidth>e.clientWidth+2)}).map(e=>({tag:e.tagName,cls:e.className,width:e.getBoundingClientRect().width,right:e.getBoundingClientRect().right,scroll:e.scrollWidth,position:getComputedStyle(e).position,text:e.textContent.slice(0,60)})).slice(0,25)})")))
     errors.append('Horizontal overflow: '+file+' '+str(width))
    if width==390:
     toggle=page.locator('.nav-mobile-toggle,.bixol-mobile-hamburger').first
     toggle.click()
     menu=page.locator('.nav-mobile,.bixol-mobile-menu').first
     assert menu.evaluate("e=>e.classList.contains('active')")
     page.wait_for_function("()=>{const e=document.querySelector('.nav-mobile.active,.bixol-mobile-menu.active');if(!e)return false;const r=e.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1}")
     links=menu.locator('.eco-local-nav a')
     assert links.count()>0
     href=links.last.get_attribute('href')
     page.screenshot(path=str(OUT/(file.replace('/','-')+f'-{width}.png')))
     links.last.click();page.wait_for_load_state('networkidle')
     assert page.url.endswith(href.replace('../','')),(file,page.url,href)
    else:
     page.screenshot(path=str(OUT/(file.replace('/','-')+f'-{width}.png')))
    records.append({'file':file,'width':width,'errors':errors,'passed':not errors})
    page.close()
  page=context.new_page();page.set_viewport_size({'width':390,'height':950})
  page.goto(origin+'/karpittisztitas-gyor.html',wait_until='networkidle')
  config=page.locator('[data-studio-configurator]')
  config.locator('[data-group="sofa"] [data-delta="1"]').click()
  assert int(re.sub(r'\D','',config.locator('.med-config-total').inner_text()))==7900
  config.locator('[data-zone]').select_option('20km')
  assert int(re.sub(r'\D','',config.locator('.med-config-total').inner_text()))==22500
  config.locator('[data-zone]').select_option('kulso')
  config.locator('[data-booking-handoff]').click();page.wait_for_load_state('networkidle')
  page.locator('[data-studio-import]').click()
  assert page.evaluate('State.totalPrice')==7900
  assert page.evaluate('State.city')=='gyor'
  assert page.evaluate('State.travelZone')=='kulso'
  page.screenshot(path=str(OUT/'gyor-imported-390.png'))
  records.append({'flow':'Győr sofa city → surroundings → city → booking import','total':7900,'passed':True})
  browser.close()
finally:server.shutdown()
(OUT/'report.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'checks':len(records),'passed':all(r['passed'] for r in records)}))
assert all(r['passed'] for r in records),[r for r in records if not r['passed']]
