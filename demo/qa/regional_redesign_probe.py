from pathlib import Path
from playwright.async_api import async_playwright
import asyncio, json, sys

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'qa'
CITIES=['kalocsa','baja','kiskoros','szekszard','paks','solt','dunafoldvar']
FILES=[f'{service}-{city}.html' for service in ['karpittisztitas','matractisztitas'] for city in CITIES]
if '--quick' in sys.argv:FILES=['karpittisztitas-kalocsa.html','matractisztitas-kalocsa.html']
WIDTHS=[2560,1920,1440,1100,1024,900,768,600,390,320]

MEASURE=r'''() => {
  const errors=[],rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
  if(document.documentElement.scrollWidth>innerWidth)errors.push('Document overflows '+document.documentElement.scrollWidth+'/'+innerWidth);
  if(document.querySelector('#themeToggle,.theme-toggle'))errors.push('Theme toggle present');
  if(document.documentElement.dataset.theme!=='light')errors.push('Not light theme');
  const h=document.querySelector('h1'),copy=document.querySelector('.eco-hero__copy'),image=document.querySelector('.eco-figure');
  const hb=rect(h),cb=rect(copy),ib=rect(image);
  if(Math.min(cb.right,ib.right)-Math.max(cb.x,ib.x)>2&&Math.min(cb.bottom,ib.bottom)-Math.max(cb.y,ib.y)>2)errors.push('Hero copy overlaps photo');
  if(hb.x<0||hb.right>innerWidth)errors.push('Heading outside viewport');
  const checks=[...document.querySelectorAll('.eco-hero :is(h1,p,li,.t,.eco-badge),section :is(h2,h3),.service-card p,.timeline-item p,.mc-card p')];
  for(const el of checks){
    const box=rect(el);if(!box.width||!box.height)continue;
    const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let n;
    while(n=walker.nextNode())for(const m of n.textContent.matchAll(/\S+/g)){
      const range=document.createRange();range.setStart(n,m.index);range.setEnd(n,m.index+m[0].length);
      for(const r of range.getClientRects())if(r.left<box.x-2||r.right>box.right+2){errors.push('Text overflow '+el.className+': '+m[0]);break;}
    }
  }
  function rows(selector,expected){
    const grid=document.querySelector(selector);if(!grid)return null;
    const items=[...grid.children].filter(e=>getComputedStyle(e).display!=='none').map(rect),groups=[];
    for(const box of items){let row=groups.find(r=>Math.abs(r[0].y-box.y)<2);if(!row){row=[];groups.push(row)}row.push(box)}
    const actual=groups.map(r=>r.length);
    if(expected&&JSON.stringify(expected)!==JSON.stringify(actual))errors.push(selector+' rows '+JSON.stringify(actual));
    return actual;
  }
  const stats=rows('.eco-trust',[3]),benefits=rows('.benefits-grid',innerWidth>900?[3,3]:innerWidth>560?[2,2,2]:[1,1,1,1,1,1]);
  const comparison=rows('.matrac-choose__cards',[1,1,1,1]);
  const steps=rows('.timeline',innerWidth>760?[3]:[1,1,1]);
  return {errors,heading:hb,stats,benefits,steps,comparison};
}'''

async def main():
    results=[];issues=[];interactions=[];semaphore=asyncio.Semaphore(4)
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True)
        context=await browser.new_context(reduced_motion='reduce')
        async def route_request(route):
            if any(host in route.request.url for host in ['127.0.0.1:8089','fonts.googleapis.com','fonts.gstatic.com']):await route.continue_()
            else:await route.abort()
        await context.route('**/*',route_request)
        async def visit(file):
            async with semaphore:
                page=await context.new_page()
                try:
                    await page.goto('http://127.0.0.1:8089/demo/'+file,wait_until='networkidle',timeout=30000)
                    await page.evaluate('document.fonts.ready')
                    before=await page.evaluate("() => ({text:document.body.innerText,links:[...document.querySelectorAll('a[href]')].map(e=>e.getAttribute('href'))})")
                    if '--integrated' not in sys.argv:
                        await page.evaluate("document.body.classList.add('eco-regional-redesign')")
                        await page.add_style_tag(path=str(ROOT/'regional-redesign.css'))
                    after=await page.evaluate("() => ({text:document.body.innerText,links:[...document.querySelectorAll('a[href]')].map(e=>e.getAttribute('href'))})")
                    if before['links']!=after['links']:issues.append({'file':file,'error':'Links changed'})
                    if ''.join(before['text'].split())!=''.join(after['text'].split()):issues.append({'file':file,'error':'Visible content changed'})
                    await page.evaluate("document.querySelectorAll('img[loading=lazy]').forEach(e=>e.loading='eager')")
                    for width in WIDTHS:
                        await page.set_viewport_size({'width':width,'height':1000})
                        await page.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
                        result=await page.evaluate(MEASURE);result.update(file=file,width=width)
                        results.append(result)
                        issues.extend({'file':file,'width':width,'error':error} for error in result['errors'])
                        if file in ['karpittisztitas-kalocsa.html','matractisztitas-kalocsa.html'] and width in [1440,390,320]:
                            await page.evaluate('window.scrollTo(0,0)')
                            await page.screenshot(path=str(OUT/f'regional-redesign-{file[:-5]}-hero-{width}.png'))
                            for label,selector in [('services','.services-grid'),('benefits','.benefits-grid'),('process','.timeline'),('comparison','.matrac-choose-section' if file.startswith('matrac') else '.ba-promo-section')]:
                                if width==1440 or label=='comparison':
                                    await page.locator(selector).screenshot(path=str(OUT/f'regional-redesign-{file[:-5]}-{label}-{width}.png'))
                    await page.set_viewport_size({'width':1440,'height':1000})
                    await page.evaluate('window.scrollTo(0,0)')
                    desktop=page.locator('.desktop-menu .has-submenu>a').first
                    await desktop.click()
                    assert await desktop.get_attribute('aria-expanded')=='true','Desktop menu did not open'
                    await page.locator('.desktop-menu .has-submenu.open>ul').wait_for(state='visible',timeout=3000)
                    await page.keyboard.press('Escape')
                    await page.set_viewport_size({'width':390,'height':900})
                    toggle=page.locator('.bixol-mobile-hamburger')
                    await toggle.click()
                    assert await toggle.get_attribute('aria-expanded')=='true','Mobile menu did not open'
                    await page.locator('.bixol-mobile-menu .has-submenu>a').first.click()
                    await page.locator('.bixol-mobile-menu .has-submenu.open>ul').wait_for(state='visible',timeout=3000)
                    await page.keyboard.press('Escape')
                    assert await toggle.get_attribute('aria-expanded')=='false','Mobile menu did not close'
                    slider=page.locator('[role=slider]').first
                    if await slider.count():
                        await slider.focus();initial=await slider.get_attribute('aria-valuenow')
                        await slider.press('ArrowRight');final=await slider.get_attribute('aria-valuenow')
                        assert initial!=final,'Slider did not respond to keyboard'
                    interactions.append({'file':file,'desktopMenu':True,'mobileMenu':True,'comparisonKeyboard':bool(await slider.count())})
                    print('Checked',file,flush=True)
                except Exception as e:issues.append({'file':file,'error':str(e)})
                finally:await page.close()
        await asyncio.gather(*(visit(file) for file in FILES))
        await browser.close()
    report={'pages':len(FILES),'viewports':len(results),'widths':WIDTHS,'issues':issues,'interactions':interactions,'results':results}
    (OUT/'regional-redesign-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'pages':len(FILES),'viewports':len(results),'issues':len(issues),'firstIssues':issues[:15],'interactions':len(interactions)},ensure_ascii=False),flush=True)
    return bool(issues)

sys.exit(asyncio.run(main()))
