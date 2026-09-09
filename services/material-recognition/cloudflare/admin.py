"""Operator bootstrap; credentials are read/written only outside the web root.

Never prints API responses, credentials or subprocess secret output.
"""
import argparse, json, os, re, secrets, subprocess, sys, tomllib
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError

ACCOUNT = 'a8e651d499cf817da0adb827299ff60c'
PRIVATE = Path('E:/ECOCLEAN/anyag-referenciak')
HERE = Path(__file__).resolve().parent

def api(path, method='GET', data=None):
    auth = tomllib.loads((Path.home()/'.wrangler/config/default.toml').read_text('utf-8'))['oauth_token']
    req = Request('https://api.cloudflare.com/client/v4/'+path, method=method,
                  headers={'Authorization':'Bearer '+auth,'Content-Type':'application/json'},
                  data=None if data is None else json.dumps(data).encode())
    try:
        with urlopen(req, timeout=40) as res: result = json.load(res)
    except HTTPError as e:
        raise RuntimeError('Cloudflare API HTTP '+str(e.code)+' ('+path.split('?')[0]+')') from None
    if not result.get('success'): raise RuntimeError('Cloudflare API unsuccessful')
    return result['result']

def inspect():
    zones = api('zones?name=ecocleantisztito.hu')
    widgets = api(f'accounts/{ACCOUNT}/challenges/widgets')
    sub = api(f'accounts/{ACCOUNT}/workers/subdomain')
    print(json.dumps({'zones':[{'id':z['id'],'name':z['name'],'status':z['status']} for z in zones],
                      'widgets':[{'name':w.get('name'),'sitekey':w.get('sitekey'),'domains':w.get('domains')} for w in widgets],
                      'workers_subdomain':sub.get('subdomain')},ensure_ascii=False))

def security():
    zone='23205feeb014f4f3fba2dc284b267d22'
    rules=api(f'zones/{zone}/rulesets')
    for rule in rules:
        if rule.get('phase') in ('http_response_headers_transform','http_request_firewall_custom'):
            full=api(f'zones/{zone}/rulesets/'+rule['id'])
            print(json.dumps({'id':full['id'],'phase':full.get('phase'),'rules':full.get('rules')},ensure_ascii=False))

def configure():
    # Reuse only this task's specifically named widget; other site widgets are untouched.
    name = 'ECO Clean material photos'
    widgets = api(f'accounts/{ACCOUNT}/challenges/widgets')
    found = [w for w in widgets if w.get('name') == name]
    if len(found)>1: raise RuntimeError('Ambiguous material Turnstile widget')
    widget = api(f'accounts/{ACCOUNT}/challenges/widgets/'+found[0]['sitekey']) if found else api(
        f'accounts/{ACCOUNT}/challenges/widgets','POST',{'name':name,'domains':['ecocleantisztito.hu','www.ecocleantisztito.hu'],'mode':'managed'})
    PRIVATE.mkdir(parents=True,exist_ok=True)
    config_path=PRIVATE/'sync-config.json'
    config=json.loads(config_path.read_text('utf-8')) if config_path.exists() else {'endpoint':'https://ecocleantisztito.hu','token':secrets.token_urlsafe(48)}
    config_path.write_text(json.dumps(config,indent=2)+'\n',encoding='utf-8')
    source=(PRIVATE/'credentials/openai-source.md').read_text('utf-8')
    keys=re.findall(r'sk-[A-Za-z0-9_-]+',source)
    if len(keys)!=1: raise RuntimeError('Expected exactly one private OpenAI key')
    gemini=os.environ.get('GEMINI_API_KEY','')
    if not gemini: raise RuntimeError('GEMINI_API_KEY missing')
    credentials={'GEMINI_API_KEY':gemini,'OPENAI_API_KEY':keys[0],
                 'TURNSTILE_SECRET_KEY':widget['secret'],'MATERIAL_SYNC_TOKEN':config['token']}
    (PRIVATE/'credentials/worker-secrets.json').write_text(json.dumps(credentials),encoding='utf-8')
    wrangler=json.loads((HERE/'wrangler.json').read_text('utf-8'))
    wrangler['vars']['TURNSTILE_SITE_KEY']=widget['sitekey']
    (HERE/'wrangler.json').write_text(json.dumps(wrangler,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'configured':True,'sitekey':widget['sitekey'],'private_config':str(config_path)}))

def upload_secrets():
    data=(PRIVATE/'credentials/worker-secrets.json').read_text('utf-8')
    cli=Path(os.environ['APPDATA'])/'npm/node_modules/wrangler/bin/wrangler.js'
    run=subprocess.run(['node',str(cli),'secret','bulk','--config',str(HERE/'wrangler.json')],
                       input=data,text=True,capture_output=True,cwd=HERE,timeout=180)
    # Never echo subprocess output: it could contain provider values on failure.
    if run.returncode: raise RuntimeError('Wrangler secret bulk failed, exit '+str(run.returncode))
    print('Four Worker secrets uploaded; values hidden.')

def audit():
    values=list(json.loads((PRIVATE/'credentials/worker-secrets.json').read_text('utf-8')).values())
    files=subprocess.check_output(['git','diff','--cached','--name-only','-z'],cwd=HERE).split(b'\0')
    root=HERE.parents[2]
    exposed=[]
    for raw in filter(None,files):
        name=raw.decode('utf-8')
        data=subprocess.check_output(['git','show',':'+name],cwd=root)
        if any(v.encode() in data for v in values): exposed.append(name)
    print(json.dumps({'staged_files':len(list(filter(None,files))),'credential_matches':len(exposed),'files':exposed}))
    if exposed: raise RuntimeError('Staged credential leak; publication forbidden')

def status():
    value=json.loads((PRIVATE/'sync-status.json').read_text('utf-8'))
    print(json.dumps(value))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('action',choices=['inspect','security','configure','upload-secrets','audit','status']);args=p.parse_args()
    try: {'inspect':inspect,'security':security,'configure':configure,'upload-secrets':upload_secrets,'audit':audit,'status':status}[args.action]()
    except Exception as e:
        print(str(e) if isinstance(e,RuntimeError) else 'Bootstrap failed ('+type(e).__name__+')',file=sys.stderr);sys.exit(1)
