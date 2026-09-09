"""Read-only verification of the deployed widget overlay, without paid calls."""
from concurrent.futures import ThreadPoolExecutor
import hashlib,json,html,re
from pathlib import Path
from urllib.request import Request,urlopen

ROOT=Path(__file__).resolve().parent.parent
overlay=json.loads((ROOT/'release-support/material-widget-overlay.json').read_text('utf-8'))
targets=[(p['file'],p['outputSha256']) for p in overlay['pages']]+[(d['file'],d['sha256']) for d in overlay['dependencies']]
def restore_cloudflare_email(data):
    # Same narrow transform already verified by verify-live.py. The full
    # restored document must still match the release SHA; no fuzzy matching.
    def decode(encoded):
        value=bytes.fromhex(encoded)
        return bytes(b ^ value[0] for b in value[1:]).decode('utf-8')
    text=data.decode('utf-8')
    text=re.sub(r'href="/cdn-cgi/l/email-protection#([a-fA-F0-9]+)"',lambda m:'href="'+html.escape('mailto:'+decode(m[1]),quote=True)+'"',text)
    text=re.sub(r'<span class="__cf_email__" data-cfemail="([a-fA-F0-9]+)">\[email&#160;protected\]</span>',lambda m:html.escape(decode(m[1]),quote=False),text)
    text=re.sub(r'<a href="/cdn-cgi/l/email-protection" class="__cf_email__" data-cfemail="([a-fA-F0-9]+)">\[email&#160;protected\]</a>',lambda m:html.escape(decode(m[1]),quote=False),text)
    text=re.sub(r'<script data-cfasync="false" src="/cdn-cgi/scripts/[a-fA-F0-9]{8}/cloudflare-static/email-decode.min.js"></script>','',text)
    return text.encode('utf-8')
def check(target):
    name,expected=target
    req=Request('https://ecocleantisztito.hu/'+name,headers={'User-Agent':'ECOClean-ReleaseVerification/1'})
    try:
        with urlopen(req,timeout=30) as response:
            data=response.read(4*1024*1024)
            csp=response.headers.get('Content-Security-Policy','')
            directives={part.split()[0]:part.split()[1:] for part in csp.split(';') if part.strip()}
            protected=all('https://challenges.cloudflare.com' in directives.get(k,[]) for k in ('script-src','frame-src'))
            exact=hashlib.sha256(data).hexdigest()==expected
            restored=not exact and name.endswith('.html') and hashlib.sha256(restore_cloudflare_email(data)).hexdigest()==expected
            return {'file':name,'status':response.status,'hash_match':exact or restored,'verification':'exact' if exact else 'cloudflare-email-protection' if restored else 'mismatch','turnstile_csp':protected}
    except Exception as error:return {'file':name,'error':type(error).__name__}
with ThreadPoolExecutor(max_workers=4) as pool:results=list(pool.map(check,targets))
errors=[r for r in results if r.get('status')!=200 or not r.get('hash_match') or not r.get('turnstile_csp')]
report={'checked':len(results),'issues':errors,'results':results}
path=ROOT/'services/material-recognition/qa/live-release.json'
path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps({'checked':len(results),'issues':errors}));raise SystemExit(bool(errors))
