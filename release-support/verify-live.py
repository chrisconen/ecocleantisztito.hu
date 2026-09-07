"""Read-only verification of the deployed static artifact; never submits orders."""
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from concurrent.futures import ThreadPoolExecutor
import hashlib, html, json, re
from datetime import datetime, timezone

ROOT=Path(__file__).resolve().parent.parent
BASE='https://ecocleantisztito.hu/'
manifest=json.loads((ROOT/'release-support/release-manifest.json').read_text('utf-8'))
# Exact Cloudflare-managed robots prefix observed and reviewed on 2026-09-07.
# It allows search and adds AI crawler policies; the site's own rules follow.
ROBOTS_PREFIX_BYTES=1836
ROBOTS_PREFIX_SHA256='842b34303164ead41bccb7c05d1707422e98d108753b397b6dcc19683eb02101'

def decode_email(encoded):
    data=bytes.fromhex(encoded)
    return bytes(value ^ data[0] for value in data[1:]).decode('utf-8')

def restore_cloudflare_email(data):
    """Reverse only the observed Cloudflare email protection transform.

    The restored bytes must still match the complete release SHA-256. Other
    injected code, missing content, changed attributes or whitespace fail.
    """
    text=data.decode('utf-8')
    text=re.sub(r'href="/cdn-cgi/l/email-protection#([a-fA-F0-9]+)"',
                lambda m:'href="'+html.escape('mailto:'+decode_email(m[1]),quote=True)+'"',text)
    text=re.sub(r'<span class="__cf_email__" data-cfemail="([a-fA-F0-9]+)">\[email&#160;protected\]</span>',
                lambda m:html.escape(decode_email(m[1]),quote=False),text)
    text=re.sub(r'<a href="/cdn-cgi/l/email-protection" class="__cf_email__" data-cfemail="([a-fA-F0-9]+)">\[email&#160;protected\]</a>',
                lambda m:html.escape(decode_email(m[1]),quote=False),text)
    text=re.sub(r'<script data-cfasync="false" src="/cdn-cgi/scripts/[a-fA-F0-9]{8}/cloudflare-static/email-decode.min.js"></script>','',text)
    return text.encode('utf-8')
def fetch(item):
    name,record=item
    url=BASE+quote(name,safe='/')
    try:
        with urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0','Cache-Control':'no-cache'}),timeout=25) as response:
            data=response.read()
            result={'file':name,'status':response.status,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'cache':response.headers.get('CF-Cache-Status')}
            result['matches']=result['sha256']==record['sha256']
            result['verification']='exact' if result['matches'] else 'mismatch'
            if name=='robots.txt' and not result['matches'] and hashlib.sha256(data[:ROBOTS_PREFIX_BYTES]).hexdigest()==ROBOTS_PREFIX_SHA256:
                result['restoredSha256']=hashlib.sha256(data[ROBOTS_PREFIX_BYTES:]).hexdigest()
                result['matches']=result['restoredSha256']==record['sha256']
                if result['matches']:result['verification']='cloudflare-managed-robots'
            if name.endswith('.html') and b'<html' in data.lower():
                text=data.decode('utf-8-sig')
                result['hasDemo']=('DEMÓ ·' in text or 'id="demoResult"' in text or 'class="missing-source"' in text)
                result['hasThemeControl']='id="themeToggle"' in text
                if not result['matches']:
                    restored=restore_cloudflare_email(data)
                    result['restoredSha256']=hashlib.sha256(restored).hexdigest()
                    result['matches']=result['restoredSha256']==record['sha256']
                    if result['matches']:result['verification']='cloudflare-email-protection'
            return result
    except (HTTPError,URLError,TimeoutError) as error:
        if name=='.nojekyll' and getattr(error,'code',0)==404 and record['sha256']==hashlib.sha256(b'').hexdigest():
            return {'file':name,'status':404,'matches':True,'verification':'non-public-build-marker'}
        return {'file':name,'status':getattr(error,'code',0),'matches':False,'error':str(error)}

with ThreadPoolExecutor(max_workers=6) as pool:
    results=list(pool.map(fetch,manifest['files'].items()))
issues=[r for r in results if not r['matches'] or r.get('hasDemo') or r.get('hasThemeControl')]
exclusions=[]
for name in ['demo/index.html','release/index.html','release-support/release-manifest.json','backups/ecoclean-before-redesign-173e4d1.zip','ecocleantisztito.hu.txt','adatvedelem.html','aszf.html','impresszum.html']:
    try:
        with urlopen(Request(BASE+name,headers={'User-Agent':'Mozilla/5.0'}),timeout=20) as response:
            exclusions.append({'path':name,'status':response.status})
    except HTTPError as error:exclusions.append({'path':name,'status':error.code})
    except (URLError,TimeoutError) as error:exclusions.append({'path':name,'status':0,'error':str(error)})
counts={kind:sum(r.get('verification')==kind for r in results) for kind in ['exact','cloudflare-email-protection','cloudflare-managed-robots','non-public-build-marker']}
report={'checkedAt':datetime.now(timezone.utc).isoformat(),'manifestSha256':hashlib.sha256((ROOT/'release-support/release-manifest.json').read_bytes()).hexdigest(),'files':len(results),'matching':sum(r['matches'] for r in results),'verification':counts,'issues':issues,'excludedPaths':exclusions,'results':results}
(ROOT/'release-support/qa/live-assets.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'files':len(results),'matching':report['matching'],'verification':counts,'issues':issues[:12],'excludedPaths':exclusions},ensure_ascii=False))
raise SystemExit(bool(issues or any(r['status']!=404 for r in exclusions)))
