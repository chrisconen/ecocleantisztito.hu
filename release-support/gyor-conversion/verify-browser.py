"""Read-only UI checks: original photo mapping, reputation trust boundary, booking continuity."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
import json, re
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT/'docs/gyor-audit-2026-09-19/conversion-qa'
OUT.mkdir(parents=True, exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(ROOT/'release')))
Thread(target=server.serve_forever, daemon=True).start()
origin = f'http://127.0.0.1:{server.server_port}'
records = []
reputation = dict(name='Kárpittisztítás ECO Clean', rating=5, total=212, googleMapsUri='https://maps.google.com/?cid=10581696163890001047', reviews=[])

def routes(context, data=None):
    def route(r):
        if r.request.method != 'GET': return r.abort()
        if r.request.url.startswith(origin+'/'): return r.continue_()
        if r.request.url.startswith('https://reviews.chris-conen.workers.dev/') and data is not None:
            return r.fulfill(status=200, content_type='application/json', body=json.dumps(data))
        return r.abort()
    context.route('**/*', route)

try:
 with sync_playwright() as p:
  browser = p.chromium.launch(headless=True)
  context = browser.new_context(reduced_motion='reduce')
  routes(context, reputation)
  for file in ['karpittisztitas-gyor.html', 'en/upholstery-cleaning-gyor.html']:
   for width in [320,390,768,1440]:
    page = context.new_page()
    page.set_viewport_size({'width':width,'height':960})
    errors=[]
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(origin+'/'+file, wait_until='networkidle')
    assert page.locator('[data-gyor-rating]').inner_text().startswith('5' if '/en/' in page.url else '5,0'), page.locator('[data-gyor-rating]').inner_text()
    assert '212' in page.locator('[data-gyor-rating]').inner_text()
    assert page.locator('h1').count()==1
    assert page.locator('.gyor-story').count()==3
    assert page.locator('.gyor-hero-proof img').first.get_attribute('src').endswith('karpittisztitas-elott-2.webp')
    assert page.locator('.gyor-hero-proof img').last.get_attribute('src').endswith('karpittisztitas-utan-2.webp')
    assert page.locator('.gyor-story').nth(2).locator('img').first.get_attribute('src').endswith('reference-chair-before-1.jpg')
    assert [int(re.sub(r'\D','',text)) for text in page.locator('.gyor-prices .gyor-price strong').all_inner_texts()]==[7900,17900,2400]
    assert page.evaluate("document.getElementById('gyor-referenciak').compareDocumentPosition(document.getElementById('studio-kalkulator')) & Node.DOCUMENT_POSITION_FOLLOWING")
    assert page.evaluate("document.getElementById('studio-kalkulator').compareDocumentPosition(document.getElementById('studio-szobak')) & Node.DOCUMENT_POSITION_FOLLOWING")
    if not page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'):
        page.screenshot(path=str(OUT/'overflow.png'))
        raise AssertionError((file,width,page.evaluate("[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&(r.right>innerWidth+1||r.left< -1)&&getComputedStyle(e).position!=='fixed'}).map(e=>({cls:e.className,text:e.textContent.slice(0,50),width:e.getBoundingClientRect().width})).slice(0,15)")))
    page.screenshot(path=str(OUT/(file.replace('/','-')+f'-hero-{width}.png')))
    page.locator('#gyor-referenciak').evaluate("e=>e.scrollIntoView({block:'start',behavior:'instant'})")
    page.locator('.gyor-story img').evaluate_all("images=>images.forEach(i=>i.loading='eager')")
    page.wait_for_function("[...document.querySelectorAll('.gyor-story img')].every(i=>i.complete&&i.naturalWidth>0)")
    page.screenshot(path=str(OUT/(file.replace('/','-')+f'-references-{width}.png')))
    assert page.locator('.gyor-story img').evaluate_all('(images)=>images.every(i=>i.complete&&i.naturalWidth>0)')
    if width<=390:
      page.evaluate('scrollTo(0,0)')
      page.locator('.nav-mobile-toggle').click()
      assert page.locator('.gyor-mobile-booking').is_hidden()
      page.locator('.nav-mobile-toggle').click()
    page.locator('.gyor-hero-copy .gyor-button').click()
    page.wait_for_function("()=>{const r=document.getElementById('studio-kalkulator').getBoundingClientRect();return r.top>=-1&&r.top<innerHeight/2}")
    config=page.locator('[data-studio-configurator]')
    config.locator('[data-group="sofa"] [data-delta="1"]').click()
    assert int(re.sub(r'\D','',config.locator('.med-config-total').inner_text()))==7900
    config.locator('[data-zone]').select_option('20km')
    assert int(re.sub(r'\D','',config.locator('.med-config-total').inner_text()))==22500
    config.locator('[data-zone]').select_option('kulso')
    assert int(re.sub(r'\D','',config.locator('.med-config-total').inner_text()))==7900
    assert not errors, errors
    records.append(dict(file=file,width=width,passed=True,checks='images, city prices, surrounding tariff, CTA, layout, reviews'))
    page.close()
  # Verify complete transfer of the Győr city tariff for each language.
  for file in ['karpittisztitas-gyor.html','en/upholstery-cleaning-gyor.html']:
    page=context.new_page()
    page.set_viewport_size({'width':390,'height':960})
    page.goto(origin+'/'+file,wait_until='networkidle')
    config=page.locator('[data-studio-configurator]')
    config.locator('[data-group="sofa"] [data-delta="1"]').click()
    config.locator('[data-booking-handoff]').click()
    page.wait_for_load_state('networkidle')
    page.locator('[data-studio-import]').click()
    assert page.evaluate('State.totalPrice')==7900
    assert page.evaluate('State.city')=='gyor'
    records.append(dict(flow=file+' → booking import',total=7900,passed=True))
    page.close()
  context.close()
  for name, data in [('unavailable',None),('wrong-business',dict(reputation,googleMapsUri='https://maps.google.com/?cid=123')),('malformed',dict(reputation,total=-1)),('changed-rating',dict(reputation,rating=4.8,total=213))]:
    ctx=browser.new_context();routes(ctx,data)
    page=ctx.new_page();page.goto(origin+'/karpittisztitas-gyor.html',wait_until='networkidle')
    label=page.locator('[data-gyor-rating]').inner_text()
    if name=='changed-rating': assert label=='4,8 / 5 · 213 Google-vélemény'
    else: assert label=='Google-vélemények · Kárpittisztítás ECO Clean'
    assert page.locator('.gyor-rating-link').get_attribute('href')=='https://maps.google.com/?cid=10581696163890001047'
    records.append(dict(flow='review '+name,passed=True));ctx.close()
  ctx=browser.new_context(java_script_enabled=False,viewport={'width':390,'height':960});routes(ctx)
  page=ctx.new_page();page.goto(origin+'/karpittisztitas-gyor.html',wait_until='networkidle')
  assert page.locator('.gyor-hero-proof img').evaluate_all('(images)=>images.every(i=>i.complete&&i.naturalWidth>0)')
  assert page.locator('.gyor-hero-copy .gyor-button').get_attribute('href')=='#studio-kalkulator'
  assert page.locator('.gyor-rating-link').is_visible()
  records.append(dict(flow='static photos and review link without JavaScript',passed=True))
  ctx.close();browser.close()
finally:
 server.shutdown()
 (OUT/'report.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(dict(checks=len(records),passed=all(r['passed'] for r in records))))
