from pathlib import Path
from playwright.async_api import async_playwright
from urllib.parse import urlsplit, unquote, parse_qs
import asyncio,json,sys,re

DIR=Path(__file__).resolve().parent
ROOT=DIR.parents[1]
MODE='live' if '--live' in sys.argv else 'release' if '--release' in sys.argv else 'demo'
BASE='https://ecocleantisztito.hu/' if MODE=='live' else 'http://127.0.0.1:8089/'+('release/' if MODE=='release' else 'demo/')
OUT=DIR/'qa'/(MODE if MODE!='demo' else '');OUT.mkdir(parents=True,exist_ok=True)
manifest=json.loads((DIR/'manifest.json').read_text('utf-8'))
FILES=[x['file'] for x in manifest['pages']]
WIDTHS=[320,390,680,768,1024,1200,1440,1920]
if '--quick' in sys.argv:
    FILES=['karpittisztitas-kalocsa.html','matractisztitas-kalocsa.html','karpittisztitas-matractisztitas.html']
    WIDTHS=[390,1440]
MEASURE=r'''() => {
 const errors=[],rect=e=>e.getBoundingClientRect();
 if(document.documentElement.scrollWidth>innerWidth+1)errors.push('Document overflows: '+document.documentElement.scrollWidth);
 if(document.querySelectorAll('.med-product').length!==6)errors.push('Not six configurator products');
 if([...document.querySelectorAll('a[href]')].some(a=>/#(?:booking|foglalas)|megrendeles\.html/i.test(a.getAttribute('href'))))errors.push('Regional online booking link remains');
 if(document.querySelector('[data-booking-url],script[src*="booking"],script[src*="calendar"]'))errors.push('Regional calendar integration remains');
 if(document.querySelector('[id=themeToggle],.theme-toggle'))errors.push('Theme control remains');
 if(/\p{Extended_Pictographic}/u.test(document.body.innerText))errors.push('Emoji remains');
 if(document.querySelector('h1').getBoundingClientRect().width>innerWidth)errors.push('Hero heading overflow');
 for(const el of document.querySelectorAll('main h1,main h2,main h3,main p,main label,main summary')){
  const b=rect(el);if(!b.width||!b.height)continue;
  const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let n;
  while(n=walker.nextNode())for(const m of n.textContent.matchAll(/\S+/g)){
   const r=document.createRange();r.setStart(n,m.index);r.setEnd(n,m.index+m[0].length);
   for(const box of r.getClientRects())if(box.left<b.left-2||box.right>b.right+2){errors.push('Text overflow '+el.className+': '+m[0]);break;}
  }
 }
 function rows(selector,expected){
  const items=[...document.querySelector(selector).children].map(rect),groups=[];
  for(const b of items){let row=groups.find(r=>Math.abs(r[0].top-b.top)<2);if(!row){row=[];groups.push(row)}row.push(b)}
  const counts=groups.map(r=>r.length);if(JSON.stringify(counts)!==JSON.stringify(expected))errors.push(selector+' rows '+JSON.stringify(counts));return counts;
 }
 const furniture=rows('.med-furniture-grid',innerWidth>900?[3,3]:innerWidth>680?[2,2,2]:[1,1,1,1,1,1]);
 const products=rows('.med-config-products',innerWidth>900?[3,3]:innerWidth>680?[2,2,2]:[1,1,1,1,1,1]);
 const process=rows('.med-process-grid',innerWidth>1199?[4]:innerWidth>680?[2,2]:[1,1,1,1]);
 const mites=document.querySelector('.med-mites-grid'),children=[...mites.children].map(rect);
 if(innerWidth>680&&Math.abs(children[0].left-children[1].left)<10)errors.push('Mite text and image are not side by side');
 for(const img of document.querySelectorAll('.med-result-figure img,.med-zoom-image img')){
  if(!img.getClientRects().length)continue;
  if(!img.complete||!img.naturalWidth)errors.push('Missing image '+img.getAttribute('src'));
  if(getComputedStyle(img).objectFit!=='contain')errors.push('Cropped result or educational image');
 }
 const missing=[...document.querySelectorAll('img[src]')].filter(i=>i.getAttribute('src')&&(!i.complete||!i.naturalWidth)).map(i=>i.getAttribute('src'));
 if(missing.length)errors.push('Incomplete images '+missing.join(','));
 const anchors=[...document.querySelectorAll('a[href^="#"]')].map(a=>a.getAttribute('href')).filter(h=>h.length>1&&!document.getElementById(decodeURIComponent(h.slice(1))));
 if(anchors.length)errors.push('Missing anchors '+[...new Set(anchors)].join(','));
 return {errors,furniture,products,process,h1:document.querySelector('h1').innerText,height:document.documentElement.scrollHeight};
}'''

async def main():
    results=[];issues=[];interactions=[];outbound=[]
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True)
        context=await browser.new_context(reduced_motion='reduce')
        async def route_request(route):
            host=urlsplit(route.request.url).netloc
            if route.request.method not in ('GET','HEAD'):
                outbound.append(route.request.url);await route.abort();return
            if host in ('127.0.0.1:8089','ecocleantisztito.hu','www.ecocleantisztito.hu','fonts.googleapis.com','fonts.gstatic.com'):await route.continue_()
            else:await route.abort()
        await context.route('**/*',route_request)
        for file in FILES:
            page=await context.new_page();console=[];missing=[]
            page.on('pageerror',lambda error:console.append(str(error)))
            page.on('response',lambda r:missing.append(r.url) if r.status>=400 and r.url.startswith(BASE) else None)
            await page.goto(BASE+file,wait_until='networkidle')
            await page.evaluate("document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager')")
            await page.evaluate("Promise.all([...document.images].filter(i=>i.getAttribute('src')).map(i=>i.decode().catch(()=>{})))")
            await page.evaluate('document.fonts.ready')
            for width in WIDTHS:
                await page.set_viewport_size({'width':width,'height':1000})
                await page.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
                m=await page.evaluate(MEASURE);m.update(file=file,width=width)
                results.append(m);issues.extend({'file':file,'width':width,'error':e} for e in m['errors'])
                if file in ['karpittisztitas-kalocsa.html','matractisztitas-kalocsa.html','karpittisztitas-matractisztitas.html'] and width in [390,1440]:
                    await page.evaluate('scrollTo(0,0)')
                    await page.screenshot(path=str(OUT/f'{file[:-5]}-hero-{width}.png'))
                    if file=='karpittisztitas-kalocsa.html':
                        for label,selector in [('lookbook','.med-furniture-grid'),('history','.med-history'),('config','.med-config-layout'),('mites','.med-mites'),('soil','.med-soil-grid')]:
                            await page.locator(selector).screenshot(path=str(OUT/f'{label}-{width}.png'))
                    if file=='matractisztitas-kalocsa.html':await page.locator('.med-result-row').screenshot(path=str(OUT/f'mattress-result-{width}.png'))
            try:
                await page.set_viewport_size({'width':390,'height':900})
                email=page.locator('[data-email-inquiry]')
                assert await email.get_attribute('href') is None,'Empty inquiry has email link'
                plus=page.locator('[data-product=armchair] [data-delta="1"]')
                await plus.click()
                await page.locator('[data-city-select]').select_option('kiskoros')
                assert int(re.sub(r'\D','',await page.locator('.med-config-total').inner_text()))==6500,'Armchair price'
                await page.locator('[data-zone]').select_option('belvaros')
                assert int(re.sub(r'\D','',await page.locator('.med-config-total').inner_text()))==10000,'Travel total'
                await page.locator('[data-product=mattress] [data-variant]').select_option('king-ab')
                await page.locator('[data-product=mattress] [data-delta="1"]').click()
                assert int(re.sub(r'\D','',await page.locator('.med-config-total').inner_text()))==25200,'Mixed discount'
                address=urlsplit(await email.get_attribute('href'));query=parse_qs(address.query)
                assert address.scheme=='mailto' and address.path=='info@ecocleantisztito.hu','Email recipient'
                body=query['body'][0]
                assert 'Kiskőrös' in query['subject'][0] and 'Település: Kiskőrös' in body,'Email city'
                assert '180 × 200 cm · két oldal' in body and 'Kárpitozott fotel' in body,'Email variants'
                assert 'Kiszállás · Városon belül' in body and 'kedvezmény · 10%' in body,'Email breakdown'
                assert re.search(r'25\s*200 Ft',body),'Email total'
                assert 'nem időpontfoglalás' in body,'Email inquiry disclaimer'
                await page.locator('[data-city-select]').select_option('baja')
                assert 'Baja' in parse_qs(urlsplit(await email.get_attribute('href')).query)['subject'][0],'City updates email'
                await page.locator('[data-city-select]').select_option('')
                assert await email.get_attribute('href') is None,'Missing city disables email'
                await page.locator('[data-city-select]').select_option('baja')
                await page.locator('.med-email-fallback summary').click()
                await page.evaluate("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('QA: clipboard unavailable')}}})")
                await page.locator('[data-copy-inquiry]').click()
                assert 'Jelöltük' in await page.locator('[data-copy-status]').inner_text(),'Manual copy fallback'
                assert await page.locator('[data-email-text]').evaluate('(e)=>e.selectionEnd===e.value.length && e.selectionStart===0'),'Selected email text'
                await page.evaluate("window.__inquiryCopy=''; Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__inquiryCopy=text}}})")
                await page.locator('[data-copy-inquiry]').click()
                assert await page.evaluate('window.__inquiryCopy')==await page.locator('[data-email-text]').input_value(),'Copy preserves complete email'
                if file=='karpittisztitas-kalocsa.html':
                    for width in [390,1440]:
                        await page.set_viewport_size({'width':width,'height':1000})
                        await page.locator('.med-config-summary').screenshot(path=str(OUT/f'email-inquiry-{width}.png'))
                        populated=await page.evaluate(MEASURE)
                        assert not populated['errors'],'Populated email layout: '+str(populated['errors'])
                await page.set_viewport_size({'width':390,'height':900})
                await page.locator('[data-reset]').click()
                assert await page.locator('.med-config-total').inner_text()=='0 Ft','Reset'
                assert await email.get_attribute('href') is None and await page.locator('[data-email-text]').input_value()=='','Reset clears stale inquiry'
                range=page.locator('.med-result-figure input').first
                await range.focus();await range.press('Home')
                assert await range.input_value()=='0','Range home'
                await range.press('ArrowRight');assert await range.input_value()=='1','Range arrow'
                await page.locator('[data-mite-tab=sofa]').click();await page.locator('[data-mite-tab=sofa]').press('ArrowRight')
                assert await page.locator('#mite-mattress').is_visible(),'Mite tab'
                await page.locator('#mite-mattress [data-zoom]').click();assert await page.locator('.med-image-dialog').is_visible(),'Zoom'
                await page.keyboard.press('Escape');assert not await page.locator('.med-image-dialog').is_visible(),'Zoom escape'
                await page.locator('.med-hotspot-tabs [data-hotspot="1"]').click()
                assert 'Karfa' in await page.locator('#med-hotspot-detail h3').inner_text(),'Hotspot'
                await page.locator('.bixol-mobile-hamburger').click();assert await page.locator('.bixol-mobile-menu').is_visible(),'Menu open'
                await page.keyboard.press('Escape');assert await page.locator('.bixol-mobile-hamburger').get_attribute('aria-expanded')=='false','Menu close'
                await page.set_viewport_size({'width':1440,'height':900})
                menu=page.locator('.desktop-menu .has-submenu>a').first;await menu.click()
                assert await menu.get_attribute('aria-expanded')=='true','Desktop menu'
                await page.keyboard.press('Escape');assert await menu.get_attribute('aria-expanded')=='false','Desktop escape'
                interactions.append({'file':file,'passed':True})
            except Exception as e:issues.append({'file':file,'error':'Interaction: '+str(e)})
            issues.extend({'file':file,'error':'Console: '+e} for e in console)
            issues.extend({'file':file,'error':'HTTP asset: '+e} for e in missing)
            # Every original result image must still be present, with source paths from the builder manifest.
            expected=next(x for x in manifest['pages'] if x['file']==file)['retainedPairs']
            actual=await page.locator('.med-result-figure img').evaluate_all('(els)=>els.map(e=>e.getAttribute("src"))')
            for source in [s for pair in expected for s in pair]:
                if MODE!='demo':source=source.removeprefix('../')
                if source not in actual:issues.append({'file':file,'error':'Lost comparison '+source})
            await page.close()
        await browser.close()
    report={'mode':MODE,'base':BASE,'viewports':len(results),'pages':len(FILES),'interactions':interactions,'issues':issues,'blockedWrites':outbound,'results':results}
    (OUT/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({k:report[k] for k in ['pages','viewports','issues','blockedWrites']},ensure_ascii=False))
    raise SystemExit(bool(issues or outbound))

async def capture_debug():
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True)
        page=await browser.new_page(viewport={'width':1440,'height':1000})
        await page.goto('http://127.0.0.1:8089/demo/karpittisztitas-kalocsa.html',wait_until='networkidle')
        await page.locator('.med-history').scroll_into_view_if_needed()
        state=await page.evaluate("() => {const s=document.querySelector('.med-skip');return {active:document.activeElement.outerHTML.slice(0,200),skipTop:getComputedStyle(s).top,rect:s.getBoundingClientRect().toJSON(),scrollY}}")
        await page.screenshot(path=str(OUT/'history-viewport-debug.png'))
        await page.locator('.med-history').screenshot(path=str(OUT/'history-element-debug.png'))
        print(json.dumps(state))
        await browser.close()

asyncio.run(capture_debug() if '--capture-debug' in sys.argv else main())
