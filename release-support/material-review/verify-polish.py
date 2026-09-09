"""Responsive and four-state material UX checks. API calls are fixtures only."""
import json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
BASE='https://ecocleantisztito.hu/' if '--live' in sys.argv else 'http://127.0.0.1:8089/release/'
OUT=Path(__file__).parent/'qa';OUT.mkdir(exist_ok=True)
reports=[]
with sync_playwright() as p:
 browser=p.chromium.launch()
 for width in (320,360,390,768,1440):
  page=browser.new_page(viewport={'width':width,'height':1000},reduced_motion='reduce')
  page.route('**/api/**',lambda r:r.fulfill(json={'ready':True,'enabled':True,'review_enabled':True}))
  page.goto(BASE+'index.html',wait_until='networkidle')
  bad=page.locator('.service-title,.config-status,.config-header').evaluate_all('(es)=>es.filter(e=>{const r=e.getBoundingClientRect();return r.left<0||r.right>innerWidth+1||e.scrollWidth>e.clientWidth+1}).map(e=>e.className)')
  reports.append({'width':width,'overflow':bad})
  if '--probe' not in sys.argv:assert not bad,reports[-1]
  if width==320:
   page.locator('.services-grid').screenshot(path=str(OUT/('mobile-before.png' if '--probe' in sys.argv else 'mobile-after.png')))
   page.locator('.config-header').screenshot(path=str(OUT/('header-before.png' if '--probe' in sys.argv else 'header-after.png')))
  page.close()
 browser.close()
print(json.dumps(reports))
