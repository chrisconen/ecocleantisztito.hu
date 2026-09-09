"""All 35 release widgets, four widths; API intercepted, no submissions."""
from pathlib import Path
from urllib.parse import urlsplit
from playwright.async_api import async_playwright
import asyncio,json,sys
sys.stdout.reconfigure(encoding='utf-8');HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[1]
FILES=[p['file'] for p in json.loads((ROOT/'release-support/material-widget-overlay.json').read_text('utf-8'))['pages']]
MEASURE=r'''()=>{const s=document.querySelector('.eco-material'),issues=[];if(document.documentElement.scrollWidth>innerWidth+1)issues.push('Document overflow');for(const e of s.querySelectorAll('h2,h3,p,button,label,summary')){const b=e.getBoundingClientRect();if(!b.width||!b.height)continue;const w=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode())for(const m of n.textContent.matchAll(/\S+/g)){const r=document.createRange();r.setStart(n,m.index);r.setEnd(n,m.index+m[0].length);if([...r.getClientRects()].some(x=>x.left<b.left-2||x.right>b.right+2))issues.push('Text overflow '+m[0]);}}return [...new Set(issues)];}'''
async def main():
 issues=[];writes=[];views=0
 async with async_playwright() as p:
  browser=await p.chromium.launch();context=await browser.new_context(reduced_motion='reduce');page=await context.new_page()
  async def route(r):
   u=urlsplit(r.request.url)
   if '/api/' in u.path:await r.fulfill(json={'ready':False,'enabled':True,'collection_enabled':False});return
   if r.request.method not in ('GET','HEAD'):writes.append(r.request.url);await r.abort();return
   if u.netloc in ('127.0.0.1:8089','fonts.googleapis.com','fonts.gstatic.com'):await r.continue_()
   else:await r.abort()
  await context.route('**/*',route)
  for file in FILES:
   await page.goto('http://127.0.0.1:8089/release/'+file,wait_until='networkidle');await page.evaluate('document.fonts.ready')
   for width in (320,390,768,1440):
    await page.set_viewport_size({'width':width,'height':1000});await page.locator('.eco-material').scroll_into_view_if_needed();await page.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');views+=1
    issues.extend({'file':file,'width':width,'error':e} for e in await page.evaluate(MEASURE))
   await page.locator('[data-material-example]').click()
   for width in (320,1440):
    await page.set_viewport_size({'width':width,'height':1000});views+=1;issues.extend({'file':file,'width':width,'state':'sample','error':e} for e in await page.evaluate(MEASURE))
  await browser.close()
 report={'pages':len(FILES),'views':views,'issues':issues,'externalWrites':writes,'liveProviderCalls':0};(HERE/'qa/release-layout-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(report,ensure_ascii=False));raise SystemExit(bool(issues or writes))
asyncio.run(main())
