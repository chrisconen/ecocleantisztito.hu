"""Release UI checks with isolated API responses. No emails, archives or model calls."""
import base64,io,json,sys
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright,expect
live='--live' in sys.argv
BASE='https://ecocleantisztito.hu/' if live else 'http://127.0.0.1:8089/release/'
OUT=Path(__file__).parent/'qa';OUT.mkdir(exist_ok=True)
buff=io.BytesIO();Image.new('RGB',(40,40),'tan').save(buff,'JPEG');photo={'name':'generated-test.jpg','mimeType':'image/jpeg','buffer':buff.getvalue()}
fixture={'kep_tipus':'anyag','anyag':'lapos szövésű bútorszövet','anyag_alt':'Kereszteződő fonalak.','indoklas':'A fonalak jól láthatóan keresztezik egymást.','modszer':'Online egyeztetjük.','ellenorzes':'Részletfotó segíthet.','kerdes_ugyfelnek':'Megvan a címke?','kerulendo':[],'kockazatok':[],'tisztitasi_kod':'ismeretlen','novalife':{'status':'likely_other','reason':'A szövött textil eltér a NovaLife bőrhatású felületétől.'}}
reports=[]
with sync_playwright() as p:
 browser=p.chromium.launch()
 for file in ['index.html','karpittisztitas-gyor.html','karpittisztitas-kalocsa.html']:
  for width in (320,390,1440):
   context=browser.new_context(viewport={'width':width,'height':1050},reduced_motion='reduce',service_workers='block');posts=[];writes=[];errors=[];fail=[False]
   def intercept(route):
    req=route.request
    if req.url.endswith('/api/material-health'):route.fulfill(json={'enabled':True,'ready':True,'review_enabled':True,'collection_enabled':True,'turnstile_site_key':''});return
    if req.url.endswith('/api/material-review'):
     posts.append(('review',req.post_data_json));route.fulfill(status=503 if fail[0] else 200,json={'review_saved':not fail[0],'review_id':'11111111-2222-4333-8444-555555555555'});return
    if req.url.endswith('/api/material-analyze'):posts.append(('analyze',req.post_data_json));route.fulfill(json=fixture);return
    if req.method not in ('GET','HEAD'):writes.append(req.url);route.abort();return
    if '/api/' in req.url:route.fulfill(json={});return
    if req.url.startswith(BASE.split('/release/')[0]) or 'fonts.goog' in req.url:route.continue_()
    else:route.abort()
   context.route('**/*',intercept);page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE+file,wait_until='networkidle')
   baseline_width=page.evaluate('document.documentElement.scrollWidth')
   form=page.locator('.eco-material-review');expect(form).to_have_count(1);submit=form.locator('[data-review-submit]');expect(submit).to_be_disabled()
   page.locator('[data-material-file]').set_input_files(photo);expect(submit).to_be_enabled();form.locator('[data-review-email]').fill('bad');submit.click();assert not posts
   form.locator('[data-review-email]').fill('review@example.invalid');submit.click();assert not posts
   form.locator('[data-review-consent]').check();fail[0]=True;submit.click();expect(form.locator('[data-review-status]')).to_contain_text('nem sikerült');expect(submit).to_be_enabled();assert posts[-1][1]['review_consent'] is True and posts[-1][1]['analysis_summary'] is None
   fail[0]=False;submit.click();expect(form.locator('[data-review-status]')).to_contain_text('Megkaptuk');expect(submit).to_be_disabled();assert all(k=='review' for k,_ in posts)
   page.locator('[data-material-file]').set_input_files(photo);expect(form.locator('[data-review-consent]')).not_to_be_checked();expect(submit).to_be_enabled()
   page.locator('[data-material-analyze]').click();expect(page.locator('[data-novalife-status=likely_other]')).to_be_visible();assert 'helyszín' not in page.locator('[data-material-result]').inner_text().lower()
   page.locator('[data-material-result] a[href="#material-email-review"]').click();form.locator('[data-review-consent]').check();submit.click();expect(form.locator('[data-review-status]')).to_contain_text('Megkaptuk');assert posts[-1][1]['analysis_summary']['status']=='likely_other';assert sum(k=='analyze' for k,_ in posts)==1
   assert not errors and not writes,(errors,writes)
   assert page.evaluate('document.documentElement.scrollWidth')<=max(width,baseline_width)+1,'New document overflow'
   assert not page.locator('#anyagfelismero').evaluate("s=>[...s.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>innerWidth+1}).map(e=>e.className)"),'Widget overflow'
   if file=='karpittisztitas-gyor.html':form.screenshot(path=str(OUT/f'{"live" if live else "local"}-email-review-{width}.png'),style='.nav{visibility:hidden!important}')
   reports.append({'file':file,'width':width,'reviewWithoutAnalysis':True,'noDuplicateAnalysis':True,'validationAndRetry':True,'passed':True});context.close()
 browser.close()
(OUT/('live-ui.json' if live else 'ui.json')).write_text(json.dumps(reports,indent=2),encoding='utf-8');print(json.dumps({'cases':len(reports),'passed':True}))
