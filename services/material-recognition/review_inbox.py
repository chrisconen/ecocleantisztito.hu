"""Private email-review inbox. Downloads only; mail links open drafts, never send.

The review queue is separate from the reusable material-reference collection.
"""
import argparse,base64,hashlib,html,io,json,re,sys
from datetime import datetime,timezone
from pathlib import Path
from urllib.parse import quote
from PIL import Image
from archive import Archive,ArchiveError,DEFAULT_ROOT,_id,_json
from sync import SyncClient,SyncError,load_config

OUTCOMES={'woven':'Szövött textil, nem ANDANTE NovaLife-jellegű', 'novalife':'ANDANTE NovaLife / hasonló felület', 'more_photo':'További fotót kértünk'}
def utc():return datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00','Z')

def complete(archive,identifier,outcome,evidence,reply_sent):
    _id(identifier)
    if outcome not in OUTCOMES or not isinstance(evidence,str) or not 5<=len(evidence.strip())<=1000 or reply_sent is not True:raise ValueError('Human decision, evidence and sent-reply confirmation required')
    with archive._locked():
        path=archive.root/'emailes-ellenorzes'/identifier;validate(archive._read_json(path/'request.json'),identifier)
        archive._check(path/'completed.json',missing=True)
        if (path/'completed.json').exists():raise ValueError('Already closed; existing decision is preserved')
        archive._write(path/'completed.json',_json({'completed_by_operator':True,'completed_utc':utc(),'outcome':outcome,'evidence':evidence.strip(),'reply_sent_attested':True}))
    gallery(archive)

def validate(value,identifier):
    if not isinstance(value,dict) or set(value)!={'schema_version','id','received_utc','email','note','sha256','consent','status','analysis_summary'}: raise SyncError('Invalid review record')
    _id(identifier)
    if value['id']!=identifier or value['schema_version']!=1 or value['status']!='pending' or value['consent']!={'purpose':'email_material_review','granted':True,'schema_version':1}: raise SyncError('Invalid review consent')
    if not isinstance(value['email'],str) or len(value['email'])>254 or not re.fullmatch(r"[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}",value['email']): raise SyncError('Invalid review email')
    if not isinstance(value['note'],str) or len(value['note'])>1000 or not isinstance(value['received_utc'],str) or len(value['received_utc'])>40 or not re.fullmatch('[0-9a-f]{64}',value['sha256']): raise SyncError('Invalid review metadata')
    return value

def gallery(archive):
    folder=archive.root/'emailes-ellenorzes';cards=[];closed_cards=[];entries=[]
    with archive._locked():
        archive._check(folder,missing=True);folder.mkdir(exist_ok=True)
        for path in folder.iterdir():
            archive._check(path)
            if not path.is_dir(): continue
            _id(path.name)
            if not (path/'request.json').exists(): continue
            r=validate(archive._read_json(path/'request.json'),path.name);entries.append((r['received_utc'],path.name,path,r))
        for _,__,path,r in sorted(entries):
            e=html.escape
            closed=(path/'completed.json').exists()
            decision_note=''
            if closed:
                decision=archive._read_json(path/'completed.json')
                decision_note='<p><b>Rögzített döntés:</b> '+e(OUTCOMES.get(decision.get('outcome'),'Korábbi lezárás'))+' · '+e(decision.get('completed_utc',''))+'<br>'+e(decision.get('evidence',''))+'</p>'
            drafts=[]
            for title,answer in [
                ('Ellenőriztem: szövött textil','A beküldött fotót ellenőriztük: szövött textilt mutat, nem az ANDANTE NovaLife bőrhatású anyagát. A tisztítás és az időpont egyeztetésével kapcsolatban szívesen segítünk.'),
                ('Ellenőriztem: ANDANTE NovaLife-gyanú','A beküldött fotó alapján ANDANTE NovaLife vagy hasonló bőrhatású anyag merül fel. Kérjük, küldd el a bútor kezelési címkéjét vagy eredeti anyagmegjelölését, hogy még foglalás előtt tisztázhassuk a lehetőségeket.'),
                ('További fotót kérek','A beküldött képen nem látszik elég részlet. Kérjük, küldj egy éles, közeli fotót természetes oldalfényben, és ha megvan, a kezelési címke képét is.')]:
                body='Szia!\n\n'+answer+'\n\nÜdv,\nECO Clean\ninfo@ecocleantisztito.hu\n\nKérésazonosító: '+r['id']
                href='mailto:'+quote(r['email'],safe='@')+'?subject='+quote('ECO Clean – szövetellenőrzés')+'&body='+quote(body)
                drafts.append('<a class="button" href="'+e(href,quote=True)+'">'+title+' – válaszlevél</a>')
            summary=r.get('analysis_summary');summary_text='Nem készült automatikus elemzés.' if not summary else 'Nem ellenőrzött előzetes becslés: '+str(summary.get('material',''))+' / '+str(summary.get('status',''))
            (closed_cards if closed else cards).append(f'<article><img src="{path.name}/photo.jpg" alt="Ellenőrzésre beküldött szövet"><div><small>{e(r["received_utc"])} · {"Lezárva" if closed else "Válaszra vár"}</small><h2>{e(r["email"])}</h2><p>{e(r["note"])}</p><p class="muted">{e(summary_text)}</p>{decision_note}<p>Előbb ellenőrizd a fotót. Az alábbi gombok a levelezőben megnyitható, szerkeszthető vázlatot készítenek. Nem küldenek automatikusan e-mailt.</p>{"".join(drafts)}<details><summary>Lezárás a válasz elküldése után</summary><code>python services/material-recognition/review_inbox.py work</code></details></div></article>')
        page='''<!doctype html><html lang="hu"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>ECO Clean · E-mailes szövetellenőrzések</title><style>body{margin:0;background:#f6f4ec;color:#354e42;font:16px/1.65 system-ui}main{max-width:1200px;margin:auto;padding:36px}h1{font:42px Georgia}h2{overflow-wrap:anywhere}article{display:grid;grid-template-columns:40% 1fr;gap:28px;background:white;border:1px solid #d7decd;border-radius:14px;padding:24px;margin:28px 0}img{width:100%;max-height:520px;object-fit:contain;border-radius:8px}.button{display:block;margin:10px 0;padding:12px 18px;background:#e9eee1;color:#354e42;border-radius:8px;text-decoration:none}small,.muted{color:#697565}code{display:block;overflow-wrap:anywhere}details{margin-top:20px}@media(max-width:760px){article{grid-template-columns:1fr}main{padding:20px}h1{font-size:32px}}</style><main><small>ECO CLEAN · PRIVÁT ELLENŐRZÉSI LISTA</small><h1>Fotó alapján, még foglalás előtt.</h1><p>Itt találod az e-mailes ellenőrzést kérő ügyfelek képeit és elérhetőségét. Ezek a képek nem kerülnek a tanuló-/referenciagyűjteménybe.</p>'''+(f'<p><strong>{len(cards)} válaszra vár · {len(closed_cards)} lezárva</strong></p><p>Lista készült: {utc()}. Helyi pillanatkép; friss online ellenőrzéshez indítsd a munkanapot az indítófájllal.</p><details><summary>Napi ellenőrzési rutin</summary><ol><li>Munkanap elején és végén frissítsd a listát. Sikertelen szinkronnál ne tekintsd üresnek az online várólistát.</li><li>A legrégebbi megválaszolatlan fotóval kezdd. A szerkezetet vizsgáld, a becslést külön kezeld.</li><li>Ellenőrizd a címzettet, szerkeszd és küldd el a választ a leveleződben.</li><li>Az indítóban rögzítsd a döntést és az indokot, majd zárd le a kérést.</li><li>Új fotó kérése esetén a beérkező válaszokat a levelezőben is kövesd.</li></ol><p>Referenciahasználathoz külön engedély kell. Az e-mailes ellenőrzés önmagában nem jogosít fel rá.</p></details>'+(''.join(cards) or '<p>Jelenleg nincs helyben megválaszolatlan kérés.</p>')+f'<details><summary>Lezárt kérések ({len(closed_cards)})</summary>'+''.join(closed_cards)+'</details>')+'</main></html>'
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

def work(archive):
    # Fresh server read is required before claiming the workday list is current.
    pull_reviews(SyncClient(archive,**load_config(archive.root/'sync-config.json')))
    import webbrowser
    webbrowser.open(gallery(archive).as_uri())
    while True:
        with archive._locked():
            pending=[]
            for path in (archive.root/'emailes-ellenorzes').iterdir():
                archive._check(path)
                if not path.is_dir():continue
                _id(path.name)
                if (path/'request.json').exists() and not (path/'completed.json').exists():
                    r=validate(archive._read_json(path/'request.json'),path.name);pending.append((r['received_utc'],path.name,r['email']))
        pending.sort()
        if not pending:print('Nincs helyben megválaszolatlan kérés.');return
        for n,(received,identifier,email) in enumerate(pending,1):print(f'{n}. {received} · {email} · {identifier[:8]}')
        choice=input('Melyik kérésre küldted már el a választ? Sorszám, vagy Enter a kilépéshez: ').strip()
        if not choice:return
        if not choice.isdigit() or not 1<=int(choice)<=len(pending):continue
        for n,label in enumerate(OUTCOMES.values(),1):print(f'{n}. {label}')
        answer=input('Döntés sorszáma: ').strip()
        if answer not in ('1','2','3'):continue
        evidence=input('Mi alapján döntöttél? (5–1000 karakter): ').strip()
        sent=input('A válaszlevelet már elküldted? Írd be: ELKÜLDTEM: ').strip()
        if sent!='ELKÜLDTEM':print('Nem zártuk le.');continue
        try:complete(archive,pending[int(choice)-1][1],list(OUTCOMES)[int(answer)-1],evidence,True)
        except ValueError:print('Nem zártuk le. Ellenőrizd a döntést és az indoklást.');continue
        print('Döntés rögzítve. Frissítsd a böngészőben a listát.')

def main():
    p=argparse.ArgumentParser();p.add_argument('action',choices=['sync','gallery','complete','work']);p.add_argument('--root',type=Path,default=DEFAULT_ROOT);p.add_argument('--id');p.add_argument('--outcome',choices=OUTCOMES);p.add_argument('--evidence');p.add_argument('--reply-sent',action='store_true');a=p.parse_args();archive=Archive(a.root)
    if a.action=='work':work(archive);return
    if a.action=='sync':print(json.dumps({'downloaded':pull_reviews(SyncClient(archive,**load_config(a.root/'sync-config.json')))}))
    if a.action=='complete':complete(archive,a.id,a.outcome,a.evidence,a.reply_sent)
    print(str(gallery(archive)))
if __name__=='__main__':
    try: main()
    except Exception as e: print('Review inbox failed: '+type(e).__name__+'; private content withheld.');sys.exit(1)
