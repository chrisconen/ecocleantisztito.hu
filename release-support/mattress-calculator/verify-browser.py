"""Local responsive UI and booking continuity. No external customer writes."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
import json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'docs/gyor-audit-2026-09-19/mattress-calculator-qa';OUT.mkdir(parents=True,exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def copyfile(self,source,outputfile):
  try:super().copyfile(source,outputfile)
  except (ConnectionAbortedError,ConnectionResetError,BrokenPipeError):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'release')))
Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_port}'
rows=[]
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True)
  for city in ['gyor','szombathely','mosonmagyarovar']:
   for en in [False,True]:
    for width in ([320] if city=='mosonmagyarovar' else [320,390,1440]):
     context=browser.new_context(viewport=dict(width=width,height=960),reduced_motion='reduce');errors=[]
     def route(r):
      if r.request.url.startswith(origin+'/') and r.request.method=='GET':return r.continue_()
      if '/check-availability' in r.request.url:return r.fulfill(status=200,content_type='application/json',body='{"success":true,"days":[]}')
      return r.abort()
     context.route('**/*',route);page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
     file=('en/mattress-cleaning-' if en else 'matractisztitas-')+city+'.html';page.goto(origin+'/'+file,wait_until='networkidle')
     for a in page.locator('a[href="#matrac-kalkulator"]').all():
      if a.is_visible():a.click();break
     page.wait_for_function("(()=>{const r=document.getElementById('matrac-kalkulator').getBoundingClientRect();return r.top>=0&&r.top<innerHeight/2})()")
     calc=page.locator('[data-mattress-calculator]');assert calc.locator('[data-mc-type]').is_visible()
     assert not calc.locator('[data-mc-booking]').get_attribute('href')
     calc.locator('[data-mc-type]').select_option('matrac_francia_ab');calc.locator('[data-mc-delta="1"]').click()
     calc.locator('[data-mc-extra="matrac_nedves_tisztitas"]').check();calc.locator('[data-mc-extra="matrac_agykeret"]').check()
     calc.locator('[data-mc-zone]').select_option('20km')
     assert calc.evaluate('el=>el.mattressCalculator.calculate().total')==45000
     calc.locator('[data-mc-zone]').select_option('belvaros');expected=15600 if city=='gyor' else 44000
     assert calc.evaluate('el=>el.mattressCalculator.calculate().total')==expected
     assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(file,width,'overflow')
     page.screenshot(path=str(OUT/(file.replace('/','-')+f'-{width}.png')),full_page=False)
     link=calc.locator('[data-mc-booking]');assert ('booking.html' if en else 'megrendeles.html') in link.get_attribute('href')
     link.click();page.wait_for_load_state('networkidle');page.locator('[data-studio-import]').click()
     assert page.evaluate('State.city')==city
     assert page.evaluate('State.serviceType')=='Matrac'
     assert page.evaluate('State.totalPrice')==expected
     assert page.evaluate('State.selectedItems.matrac_francia_ab.count')==1
     assert sorted(page.evaluate('State.selectedItems.matrac_francia_ab.upsells'))==['agykeret','nedves_tisztitas']
     assert page.locator('#bookingForm').is_visible()
     assert not errors,(file,width,errors)
     rows.append(dict(file=file,width=width,total=expected,service='Matrac',wetBothSides=True,frame=True,passed=True));context.close()
  browser.close()
finally:
 server.shutdown();(OUT/'report.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(dict(checks=len(rows),passed=all(r['passed'] for r in rows))))
