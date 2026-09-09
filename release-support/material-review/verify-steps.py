"""Home process section geometry and visual checks; read-only browser activity."""
import json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
base='https://ecocleantisztito.hu/' if '--live' in sys.argv else 'http://127.0.0.1:8089/release/'
out=Path(__file__).parent/'qa';out.mkdir(exist_ok=True);rows=[]
with sync_playwright() as p:
 browser=p.chromium.launch()
 for width in (320,390,768,1440):
  page=browser.new_page(viewport={'width':width,'height':1100},reduced_motion='reduce')
  page.route('**/api/**',lambda r:r.fulfill(json={}))
  page.goto(base+'index.html',wait_until='networkidle');section=page.locator('.how-it-works');section.scroll_into_view_if_needed()
  numbers=page.locator('.how-it-works .step-number').evaluate_all('es=>es.map(e=>{const s=getComputedStyle(e),a=getComputedStyle(e,"::after"),b=getComputedStyle(e,"::before"),r=e.getBoundingClientRect();return {text:e.textContent,background:s.background,borderRadius:s.borderRadius,shadow:s.boxShadow,before:b.content,after:a.content,afterBackground:a.background,afterShadow:a.boxShadow,width:r.width,height:r.height,left:r.left,right:r.right}})')
  overflow=section.evaluate('s=>[...s.querySelectorAll("*")].filter(e=>{let r=e.getBoundingClientRect();return r.width&&(r.left<0||r.right>innerWidth+1)}).map(e=>e.className)')
  if '--before' not in sys.argv:
   assert len(numbers)==3 and not overflow,(width,numbers,overflow)
   assert all(n['shadow']=='none' and n['borderRadius']=='0px' and n['after']=='none' for n in numbers),numbers
  section.screenshot(path=str(out/f'steps-{"before" if "--before" in sys.argv else "live" if "--live" in sys.argv else "after"}-{width}.png'),style='.nav{visibility:hidden!important}')
  rows.append({'width':width,'numbers':numbers,'overflow':overflow});page.close()
 browser.close()
print(json.dumps(rows))
