"""Mock-only Turnstile + photo flow; never contacts real processing/challenge services."""
from pathlib import Path
from urllib.parse import urlsplit
from playwright.async_api import async_playwright
import asyncio,json,sys
sys.stdout.reconfigure(encoding='utf-8')
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[1];OUT=HERE/'qa';OUT.mkdir(exist_ok=True)
SCOPE='release' if '--release' in sys.argv else 'demo'
FILES=['index.html','karpittisztitas-gyor.html','karpittisztitas-kalocsa.html']
ANSWER={'kep_tipus':'anyag','anyag':'Buklé','anyag_alt':'Tesztminta.','biztonsag':70,'indoklas':'Kizárólag mockolt teszt.','tisztitasi_kod':'ismeretlen','modszer':'Kezelési címke szükséges.','kerulendo':[],'kockazatok':[],'ellenorzes':'Anyagpróba.','kerdes_ugyfelnek':'Van címke?'}
SCRIPT=r'''window.securityTest={serial:0,executions:0,resets:[],removes:[],mode:'hold',current:null};window.turnstile={render(box,config){const t=window.securityTest,id='mock-'+(++t.serial);t.current={id,box,config};const frame=document.createElement('div');frame.textContent='Biztonsági ellenőrzés – helyi teszt';frame.style.cssText='width:150px;min-height:140px;background:#f4f2ec;border:1px solid #ddd;padding:12px;box-sizing:border-box;font:14px sans-serif';box.replaceChildren(frame);return id;},execute(){window.securityTest.executions++;},reset(id){window.securityTest.resets.push(id);},remove(id){const t=window.securityTest;t.removes.push(id);if(t.current?.id===id)t.current.box.replaceChildren();}};'''
async def main():
 issues=[];writes=[];cases=[];views=0;total_posts=0
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True)
  for file in FILES:
   context=await browser.new_context(reduced_motion='reduce');page=await context.new_page();posts=[];errors=[];scripts=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   mode={'key':'mock-public-site-key','ready':True,'status':200,'script_fail':False}
   async def route(r):
    request=r.request;url=urlsplit(request.url);headers={'Access-Control-Allow-Origin':'http://127.0.0.1:8089','Access-Control-Allow-Headers':'content-type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'}
    if url.path=='/api/material-health':await r.fulfill(json={'enabled':True,'ready':mode['ready'],'collection_enabled':True,'turnstile_site_key':mode['key']},headers=headers);return
    if url.path=='/api/material-analyze':
     if request.method=='OPTIONS':await r.fulfill(status=204,headers=headers);return
     posts.append(request.post_data_json);await r.fulfill(status=mode['status'],json=ANSWER,headers=headers);return
    if url.netloc=='challenges.cloudflare.com':
     scripts.append(request.url)
     if mode['script_fail']:await r.abort()
     else:await r.fulfill(content_type='application/javascript',body=SCRIPT)
     return
    if request.method not in ('GET','HEAD'):writes.append(request.url);await r.abort();return
    if url.netloc in ('127.0.0.1:8089','fonts.googleapis.com','fonts.gstatic.com'):await r.continue_()
    else:await r.abort()
   await context.route('**/*',route)
   try:
    await page.goto(f'http://127.0.0.1:8089/{SCOPE}/{file}',wait_until='networkidle')
    assert not scripts,'Challenge script loaded before explicit action'
    await page.locator('[data-material-file]').set_input_files(str(ROOT/'demo/material-recognition/assets/fotel-bukle-olvasosarok.webp'))
    await page.wait_for_function('!document.querySelector("[data-material-analyze]").disabled')
    button=page.locator('[data-material-analyze]');await button.click();await page.wait_for_function('window.securityTest?.executions===1')
    assert await page.evaluate("securityTest.current.config.action==='material-analysis'&&securityTest.current.config.size==='compact'")
    assert not posts,'Photo posted before token';assert await button.is_disabled();await button.evaluate('el=>el.click()');assert not posts
    for width in (320,390,768,1440):
     await page.set_viewport_size({'width':width,'height':1000});await page.locator('[data-material-turnstile]').scroll_into_view_if_needed();views+=1
     bounds=await page.evaluate('''()=>{const e=document.querySelector('[data-material-turnstile]'),b=e.getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth+1,left:b.left,right:b.right,width:innerWidth};}''')
     assert not bounds['overflow'] and bounds['left']>=0 and bounds['right']<=width+1,str(bounds)
     await page.locator('.eco-material-workspace').screenshot(path=str(OUT/f'{SCOPE}-{file[:-5]}-turnstile-{width}.png'))
    await page.evaluate("securityTest.current.config.callback('single-use-token-1')");await page.wait_for_function('!document.querySelector("[data-material-analyze]").disabled')
    assert len(posts)==1 and posts[0]['turnstile_token']=='single-use-token-1' and 'provider' not in posts[0]
    assert await page.evaluate('securityTest.resets.length===1&&securityTest.removes.length===1')
    await button.click();await page.wait_for_function('securityTest.executions===2');assert len(posts)==1
    await page.evaluate("securityTest.current.config['error-callback']('mock-error')");await page.wait_for_function('!document.querySelector("[data-material-analyze]").disabled');assert len(posts)==1
    await button.click();await page.wait_for_function('securityTest.executions===3');await page.evaluate("securityTest.current.config['expired-callback']()");await page.wait_for_function('!document.querySelector("[data-material-analyze]").disabled');assert len(posts)==1
    await button.click();await page.wait_for_function('securityTest.executions===4');await page.evaluate('window.staleCallback=securityTest.current.config.callback');await page.locator('[data-material-example]').click();await page.evaluate("staleCallback('cancelled-token')");assert len(posts)==1
    assert await page.locator('[data-material-result]').get_attribute('data-sample')=='true'
    await button.click();await page.wait_for_function('securityTest.executions===5');mode['status']=503;await page.evaluate("securityTest.current.config.callback('single-use-token-2')");await page.wait_for_function('!document.querySelector("[data-material-analyze]").disabled');assert len(posts)==2
    assert posts[1]['turnstile_token']!=posts[0]['turnstile_token'];assert await page.evaluate('securityTest.resets.length===5&&securityTest.removes.length===5')
    script_count=len(scripts);mode.update(key='',ready=True,status=200);await page.reload(wait_until='networkidle');await page.locator('[data-material-file]').set_input_files(str(ROOT/'demo/material-recognition/assets/fotel-bukle-olvasosarok.webp'));await page.wait_for_function('!document.querySelector("[data-material-analyze]").disabled');await button.click();await page.wait_for_function('!document.querySelector("[data-material-analyze]").disabled');assert len(posts)==3 and 'turnstile_token' not in posts[2] and len(scripts)==script_count
    await page.locator('[data-material-example]').click();expected='#booking' if file=='index.html' else '#arak' if SCOPE=='release' or 'kalocsa' in file else '#studio-kalkulator';assert await page.locator('.eco-material-result-actions a').get_attribute('href')==expected
    mode.update(key='mock-key',ready=False);await page.reload(wait_until='networkidle');await page.locator('[data-material-file]').set_input_files(str(ROOT/'demo/material-recognition/assets/fotel-bukle-olvasosarok.webp'));await page.locator('.eco-material-preview').wait_for(state='visible');await page.locator('[data-material-example]').click();assert await page.locator('.eco-material-sample-banner').is_visible();assert await button.is_disabled() and len(scripts)==script_count
    mode.update(ready=True,script_fail=True);await page.reload(wait_until='networkidle');await page.locator('[data-material-file]').set_input_files(str(ROOT/'demo/material-recognition/assets/fotel-bukle-olvasosarok.webp'));await page.wait_for_function('!document.querySelector("[data-material-analyze]").disabled');await button.click();await page.wait_for_function('document.querySelector("[data-material-status]").textContent.includes("nem töltődött be")');assert len(posts)==3 and await button.is_enabled();await page.locator('[data-material-example]').click();assert await page.locator('.eco-material-sample-banner').is_visible()
    cases.append({'file':file,'passed':True,'mockedPosts':len(posts),'resetCycles':5})
   except Exception as e:issues.append({'file':file,'error':str(e)})
   issues.extend({'file':file,'error':'JS '+e} for e in errors);total_posts+=len(posts);await context.close()
  await browser.close()
 report={'scope':SCOPE,'views':views,'cases':cases,'issues':issues,'externalWrites':writes,'mockedPosts':total_posts,'liveProviderCalls':0,'liveTurnstileCalls':0}
 (OUT/f'{SCOPE}-turnstile-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(report,ensure_ascii=False));raise SystemExit(bool(issues or writes))
asyncio.run(main())
