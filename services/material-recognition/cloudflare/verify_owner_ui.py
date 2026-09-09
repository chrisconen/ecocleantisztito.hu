"""Owner photo through live UI preprocessing and real authorized analysis.

Only the browser challenge is replaced by the authenticated operator endpoint.
No archive consent, bookings, email, or other writes. Credentials stay in Python.
"""
import argparse, json, sys
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect
from smoke import call

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--photo',type=Path,required=True);args=parser.parse_args()
    out=Path(__file__).parent.parent/'qa';results=[]
    with sync_playwright() as p:
        browser=p.chromium.launch()
        for width in (390,1440):
            context=browser.new_context(viewport={'width':width,'height':1000},reduced_motion='reduce',service_workers='block')
            calls=[];writes=[];errors=[]
            def intercept(route):
                req=route.request;path=urlsplit(req.url).path
                if path=='/api/material-health': route.fulfill(json={'enabled':True,'ready':True,'collection_enabled':False,'turnstile_site_key':''});return
                if path=='/api/material-analyze' and req.method=='POST':
                    payload=req.post_data_json
                    assert payload['archive_consent'] is False
                    payload.pop('turnstile_token',None)
                    status,result=call('/api/material-admin/analyze','POST',payload,owner=True)
                    calls.append({'http':status,'result':result})
                    route.fulfill(status=status,json=result);return
                if req.method not in ('GET','HEAD'): writes.append(req.url);route.abort();return
                if urlsplit(req.url).netloc not in ('ecocleantisztito.hu','fonts.googleapis.com','fonts.gstatic.com'): route.abort();return
                route.continue_()
            context.route('**/*',intercept)
            page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
            page.goto('https://ecocleantisztito.hu/karpittisztitas-gyor.html',wait_until='networkidle')
            page.locator('[data-material-file]').set_input_files(args.photo)
            expect(page.locator('[data-material-analyze]')).to_be_enabled()
            page.locator('[data-material-analyze]').click()
            panel=page.locator('[data-material-result] [data-novalife-status=likely_other]');panel.wait_for(timeout=90000)
            assert len(calls)==1 and calls[0]['http']==200
            result=calls[0]['result'];assert result['_meta']['reference_count']==3 and not result['_meta']['archive_saved']
            assert 'valószínűleg nem NovaLife' in panel.inner_text()
            assert 'nem zárja ki' not in panel.inner_text()
            assert page.locator('[data-material-result] .eco-material-result-actions a').first.get_attribute('href')=='#studio-kalkulator'
            assert not errors and not writes, (errors,writes)
            panel.screenshot(path=str(out/f'owner-result-live-{width}.png'),style='.nav{visibility:hidden!important}')
            results.append({'width':width,'status':result['novalife']['status'],'references':3,'archiveSaved':False,'calculatorLink':True,'headline':panel.locator('h3,h4').first.inner_text(),'passed':True})
            context.close()
        browser.close()
    (out/'owner-ui-live.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(results,ensure_ascii=False))
if __name__=='__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    try: main()
    except Exception as e:
        import traceback
        print('Owner UI verification failed: '+type(e).__name__+'; credentials hidden.')
        print(json.dumps([{'function':f.name,'line':f.lineno} for f in traceback.extract_tb(e.__traceback__)]))
        if type(e).__module__.startswith('playwright'): print(str(e)[:1400])
        sys.exit(1)
