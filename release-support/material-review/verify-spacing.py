"""Measure the process section's top spacing on both regional designs."""
import json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
base='https://ecocleantisztito.hu/' if '--live' in sys.argv else 'http://127.0.0.1:8089/release/'
out=Path(__file__).parent/'qa';out.mkdir(exist_ok=True);rows=[]
with sync_playwright() as p:
 browser=p.chromium.launch()
 for file in ('karpittisztitas-gyor.html','karpittisztitas-kalocsa.html','matractisztitas-kalocsa.html'):
  for width in (320,390,1440):
   page=browser.new_page(viewport={'width':width,'height':1050},reduced_motion='reduce');page.route('**/api/**',lambda r:r.fulfill(json={}))
   page.goto(base+file,wait_until='networkidle');section=page.locator('#hogyan-mukodik.med-process');section.scroll_into_view_if_needed()
   result=section.evaluate('s=>{const a=s.getBoundingClientRect(),b=s.querySelector(".med-eyebrow").getBoundingClientRect();return {padding:parseFloat(getComputedStyle(s).paddingTop),gap:b.top-a.top,overflow:s.scrollWidth>s.clientWidth+1}}')
   if '--before' not in sys.argv:assert 48<=result['padding']<=88 and result['gap']>=48 and not result['overflow'],(file,width,result)
   if file=='karpittisztitas-gyor.html':section.screenshot(path=str(out/f'process-spacing-{"before" if "--before" in sys.argv else "live" if "--live" in sys.argv else "after"}-{width}.png'),style='.nav{visibility:hidden!important}')
   rows.append({'file':file,'width':width,**result});page.close()
 browser.close()
print(json.dumps(rows))
