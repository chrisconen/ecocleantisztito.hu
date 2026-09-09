"""Private email-review inbox. Downloads only; mail links open drafts, never send.

The review queue is separate from the reusable material-reference collection.
"""
import argparse,base64,hashlib,html,io,json,re,sys
from pathlib import Path
from urllib.parse import quote
from PIL import Image
from archive import Archive,ArchiveError,DEFAULT_ROOT,_id,_json
from sync import SyncClient,SyncError,load_config

def validate(value,identifier):
    if not isinstance(value,dict) or set(value)!={'schema_version','id','received_utc','email','note','sha256','consent','status','analysis_summary'}: raise SyncError('Invalid review record')
    _id(identifier)
    if value['id']!=identifier or value['schema_version']!=1 or value['status']!='pending' or value['consent']!={'purpose':'email_material_review','granted':True,'schema_version':1}: raise SyncError('Invalid review consent')
    if not isinstance(value['email'],str) or len(value['email'])>254 or not re.fullmatch(r"[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}",value['email']): raise SyncError('Invalid review email')
    if not isinstance(value['note'],str) or len(value['note'])>1000 or not isinstance(value['received_utc'],str) or len(value['received_utc'])>40 or not re.fullmatch('[0-9a-f]{64}',value['sha256']): raise SyncError('Invalid review metadata')
    return value

def gallery(archive):
    folder=archive.root/'emailes-ellenorzes';cards=[]
    with archive._locked():
        archive._check(folder,missing=True);folder.mkdir(exist_ok=True)
        for path in sorted(folder.iterdir(),reverse=True):
            archive._check(path)
            if not path.is_dir(): continue
            _id(path.name)
            if not (path/'request.json').exists(): continue
            r=validate(archive._read_json(path/'request.json'),path.name);e=html.escape
            closed=(path/'completed.json').exists()
            drafts=[]
            for title,answer in [
                ('Ellenőriztem: szövött textil','A beküldött fotót ellenőriztük: szövött textilt mutat, nem az ANDANTE NovaLife bőrhatású anyagát. A tisztítás és az időpont egyeztetésével kapcsolatban szívesen segítünk.'),
                ('Ellenőriztem: NovaLife-gyanú','A beküldött fotó alapján NovaLife vagy hasonló bőrhatású anyag merül fel. Kérjük, küldd el a bútor kezelési címkéjét vagy eredeti anyagmegjelölését, hogy még foglalás előtt tisztázhassuk a lehetőségeket.'),
                ('További fotót kérek','A beküldött képen nem látszik elég részlet. Kérjük, küldj egy éles, közeli fotót természetes oldalfényben, és ha megvan, a kezelési címke képét is.')]:
                body='Szia!\n\n'+answer+'\n\nÜdv,\nECO Clean\ninfo@ecocleantisztito.hu\n\nKérésazonosító: '+r['id']
                href='mailto:'+quote(r['email'],safe='@')+'?subject='+quote('ECO Clean – szövetellenőrzés')+'&body='+quote(body)
                drafts.append('<a class="button" href="'+e(href,quote=True)+'">'+title+' – válaszlevél</a>')
            summary=r.get('analysis_summary');summary_text='Nem készült automatikus elemzés.' if not summary else 'Nem ellenőrzött előzetes becslés: '+str(summary.get('material',''))+' / '+str(summary.get('status',''))
            cards.append(f'<article><img src="{path.name}/photo.jpg" alt="Ellenőrzésre beküldött szövet"><div><small>{e(r["received_utc"])} · {"Lezárva" if closed else "Válaszra vár"}</small><h2>{e(r["email"])}</h2><p>{e(r["note"])}</p><p class="muted">{e(summary_text)}</p><p>Előbb ellenőrizd a fotót. Az alábbi gombok a levelezőben megnyitható, szerkeszthető vázlatot készítenek. Nem küldenek automatikusan e-mailt.</p>{"".join(drafts)}<details><summary>Lezárás a válasz elküldése után</summary><code>python services/material-recognition/review_inbox.py complete --id {path.name}</code></details></div></article>')
        page='''<!doctype html><html lang="hu"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>ECO Clean · E-mailes szövetellenőrzések</title><style>body{margin:0;background:#f6f4ec;color:#354e42;font:16px/1.65 system-ui}main{max-width:1200px;margin:auto;padding:36px}h1{font:42px Georgia}h2{overflow-wrap:anywhere}article{display:grid;grid-template-columns:40% 1fr;gap:28px;background:white;border:1px solid #d7decd;border-radius:14px;padding:24px;margin:28px 0}img{width:100%;max-height:520px;object-fit:contain;border-radius:8px}.button{display:block;margin:10px 0;padding:12px 18px;background:#e9eee1;color:#354e42;border-radius:8px;text-decoration:none}small,.muted{color:#697565}code{display:block;overflow-wrap:anywhere}details{margin-top:20px}@media(max-width:760px){article{grid-template-columns:1fr}main{padding:20px}h1{font-size:32px}}</style><main><small>ECO CLEAN · PRIVÁT ELLENŐRZÉSI LISTA</small><h1>Fotó alapján, még foglalás előtt.</h1><p>Itt találod az e-mailes ellenőrzést kérő ügyfelek képeit és elérhetőségét. Ezek a képek nem kerülnek a tanuló-/referenciagyűjteménybe.</p>'''+(''.join(cards) or '<p>Jelenleg nincs beküldött ellenőrzési kérés.</p>')+'</main></html>'
        archive._write(folder/'index.html',page.encode('utf-8'))
    return folder/'index.html'

def pull_reviews(client):
    archive=client.archive;folder=archive.root/'emailes-ellenorzes';cursor=None;seen=set();downloaded=0
    for _ in range(100):
        page=client._request('/api/material-admin/reviews'+('?cursor='+quote(cursor,safe='') if cursor else ''))
        if not isinstance(page,dict) or set(page)!={'items','cursor'} or not isinstance(page['items'],list) or len(page['items'])>100: raise SyncError('Invalid review manifest')
        for item in page['items']:
            if not isinstance(item,dict) or set(item)!={'id','received_utc','sha256'}: raise SyncError('Invalid review manifest item')
            identifier=item['id'];_id(identifier)
            with archive._locked():
                directory=folder/identifier;archive._check(directory,missing=True)
                if (directory/'request.json').exists() and (directory/'photo.jpg').exists():
                    existing=validate(archive._read_json(directory/'request.json'),identifier)
                    if existing['sha256']!=item['sha256'] or hashlib.sha256(archive._read(directory/'photo.jpg',2*1024*1024)).hexdigest()!=item['sha256']: raise SyncError('Local review hash mismatch')
                    continue
            data=client._request('/api/material-admin/reviews/'+identifier,limit=4*1024*1024)
            if not isinstance(data,dict) or set(data)!={'record','image'} or not isinstance(data['image'],str) or len(data['image'])>3*1024*1024: raise SyncError('Invalid review payload')
            record=validate(data['record'],identifier);image=base64.b64decode(data['image'],validate=True)
            if len(image)>2*1024*1024 or hashlib.sha256(image).hexdigest()!=record['sha256'] or record['sha256']!=item['sha256']: raise SyncError('Invalid review image hash')
            with Image.open(io.BytesIO(image)) as picture:
                if picture.format!='JPEG' or max(picture.size)>1200: raise SyncError('Invalid review image')
                picture.verify()
            with archive._locked():
                archive._check(folder,missing=True);folder.mkdir(exist_ok=True);archive._check(directory,missing=True);directory.mkdir(exist_ok=True)
                archive._write(directory/'photo.jpg',image);archive._write(directory/'request.json',_json(record));downloaded+=1
        cursor=page['cursor']
        if cursor is None: break
        if not isinstance(cursor,str) or not cursor or len(cursor)>2048 or cursor in seen: raise SyncError('Invalid review cursor')
        seen.add(cursor)
    else: raise SyncError('Too many review pages')
    gallery(archive);return downloaded

def main():
    p=argparse.ArgumentParser();p.add_argument('action',choices=['sync','gallery','complete']);p.add_argument('--root',type=Path,default=DEFAULT_ROOT);p.add_argument('--id');a=p.parse_args();archive=Archive(a.root)
    if a.action=='sync': print(json.dumps({'downloaded':pull_reviews(SyncClient(archive,**load_config(a.root/'sync-config.json')))}))
    if a.action=='complete':
        _id(a.id)
        with archive._locked():
            path=archive.root/'emailes-ellenorzes'/a.id;validate(archive._read_json(path/'request.json'),a.id);archive._write(path/'completed.json',_json({'completed_by_operator':True}))
    print(str(gallery(archive)))
if __name__=='__main__':
    try: main()
    except Exception as e: print('Review inbox failed: '+type(e).__name__+'; private content withheld.');sys.exit(1)
