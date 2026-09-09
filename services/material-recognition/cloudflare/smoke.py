"""One controlled online request with a generated interior, never customer data."""
import argparse, base64, io, json, os, re, sys, time
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from PIL import Image

HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE.parent))
from archive import Archive, DEFAULT_ROOT
from sync import SyncClient, load_config

def call(path, method='GET', payload=None, owner=False):
    config=load_config(DEFAULT_ROOT/'sync-config.json')
    headers={'Content-Type':'application/json','Origin':config['endpoint'],'User-Agent':'ECOClean-PrivateSync/1'}
    if owner: headers['Authorization']='Bearer '+config['token']
    request=Request(config['endpoint']+path,method=method,headers=headers,data=None if payload is None else json.dumps(payload).encode())
    try:
        with urlopen(request,timeout=100) as response: return response.status,json.load(response)
    except HTTPError as error:
        try: value=json.loads(error.read(16384))
        except ValueError: value={}
        return error.code,value

def main():
    parser=argparse.ArgumentParser();parser.add_argument('action',choices=['probe','smoke','luna']);args=parser.parse_args()
    if args.action=='probe':
        status,health=call('/api/material-health')
        unauthorized,_=call('/api/material-admin/manifest')
        missing_token,_=call('/api/material-analyze','POST',{})
        print(json.dumps({'health_status':status,'health':health,'admin_without_token':unauthorized,'public_without_turnstile':missing_token}))
        return 0 if status==200 and health.get('ready') and unauthorized==401 and missing_token==403 else 1
    if args.action=='luna':
        source=(DEFAULT_ROOT/'credentials/openai-source.md').read_text('utf-8')
        keys=re.findall(r'sk-[A-Za-z0-9_-]+',source)
        if len(keys)!=1: raise RuntimeError('Private key unavailable')
        os.environ['OPENAI_API_KEY']=keys[0]
        import smoke_provider
        sys.argv=['smoke_provider.py','--provider','openai']
        return smoke_provider.main()
    config=load_config(DEFAULT_ROOT/'sync-config.json')
    _,before=call('/api/material-admin/manifest',owner=True)
    ids={i['id'] for i in before.get('items',[])}
    fixture=HERE.parents[2]/'demo/studio/assets/fotel-bukle-olvasosarok.webp'
    with Image.open(fixture) as image:
        image=image.convert('RGB');image.thumbnail((1200,1200));buffer=io.BytesIO();image.save(buffer,'JPEG',quality=80)
    payload={'image':'data:image/jpeg;base64,'+base64.b64encode(buffer.getvalue()).decode(),
             'media_type':'image/jpeg','note':'Generált enteriőrrel végzett tulajdonosi technikai próba, nem ügyfélfotó.','archive_consent':True}
    started=time.monotonic();status,result=call('/api/material-admin/analyze','POST',payload,owner=True)
    _,after=call('/api/material-admin/manifest',owner=True)
    added=[i for i in after.get('items',[]) if i['id'] not in ids]
    synced=SyncClient(Archive(DEFAULT_ROOT),**config).pull_once()
    report={'fixture':'generated interior, not customer photo','status':status,'elapsed_seconds':round(time.monotonic()-started,2),
            'public_fields':sorted(result),'archive_meta':result.get('_meta'),'created_records':[i['id'] for i in added],
            'sync':synced,'local_verified':all((DEFAULT_ROOT/'inbox'/i['id']/'photo.jpg').is_file() for i in added)}
    target=HERE.parent/'qa/cloudflare-live.json';target.parent.mkdir(exist_ok=True);target.write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False))
    return 0 if status==200 and len(added)==1 and report['local_verified'] and result.get('_meta',{}).get('archive_saved') else 1

if __name__=='__main__':
    try: raise SystemExit(main())
    except Exception as e: print('Smoke failed ('+type(e).__name__+'); credentials hidden.');sys.exit(1)
