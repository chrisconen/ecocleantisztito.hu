"""Private, owner-attested holdouts. No provider calls or reference activation."""
import argparse,hashlib,html,sys
from pathlib import Path
from archive import Archive,DEFAULT_ROOT,_json,_utc

EXPECTED={'likely_other':'Szövött textil / nem NovaLife-jellegű','possible_novalife':'NovaLife / hasonló bőrhatású felület','uncertain':'Nem eldönthető fotó'}

def add(archive,photo,expected,label,evidence,owner_permission):
    photo=Path(photo)
    if expected not in EXPECTED or not owner_permission or not 5<=len(evidence.strip())<=1000 or not 3<=len(label.strip())<=150:raise ValueError('Owner permission, label and evidence required')
    if not photo.is_file() or photo.is_symlink() or photo.stat().st_size>20*1024*1024:raise ValueError('Invalid source photo')
    original=photo.read_bytes();source_hash=hashlib.sha256(original).hexdigest()
    # Same metadata-stripping normalization as consented uploads, without inventing
    # an upload-consent record or putting this owner image in the customer inbox.
    from PIL import Image,ImageOps
    import io
    with Image.open(io.BytesIO(original)) as im:
        if im.width*im.height>40_000_000:raise ValueError('Photo dimensions too large')
        im=ImageOps.exif_transpose(im).convert('RGB');im.thumbnail((1200,1200));out=io.BytesIO();im.save(out,'JPEG',quality=90)
    data=out.getvalue();digest=hashlib.sha256(data).hexdigest();folder=archive.root/'ellenorzott-probak';directory=folder/digest
    record={'schema_version':1,'id':digest,'source_sha256':source_hash,'image_sha256':digest,'expected':expected,'label':label.strip(),'evidence':evidence.strip(),'evidence_kind':'owner_attestation','source_use':'owner_authorized_private_validation','created_utc':_utc(),'active_reference':False,'brand':'ismeretlen','composition':'ismeretlen'}
    with archive._locked():
        archive._check(folder,missing=True);folder.mkdir(exist_ok=True);archive._check(directory,missing=True)
        if (directory/'record.json').exists():
            old=archive._read_json(directory/'record.json')
            if hashlib.sha256(archive._read(directory/'photo.jpg',2*1024*1024)).hexdigest()!=digest:raise ValueError('Stored image hash mismatch')
            for key in ('expected','label','evidence','source_sha256'):
                if old[key]!=record[key]:raise ValueError('Existing specimen has different evidence; no overwrite')
            return digest
        directory.mkdir(exist_ok=True);archive._write(directory/'photo.jpg',data);archive._write(directory/'record.json',_json(record))
    gallery(archive);return digest

def gallery(archive):
    folder=archive.root/'ellenorzott-probak';rows=[];counts={k:0 for k in EXPECTED};e=html.escape
    with archive._locked():
        archive._check(folder,missing=True);folder.mkdir(exist_ok=True)
        for path in sorted(folder.iterdir()):
            archive._check(path)
            if not path.is_dir():continue
            import re
            if not re.fullmatch('[a-f0-9]{64}',path.name):raise ValueError('Invalid specimen path')
            r=archive._read_json(path/'record.json')
            if r['id']!=path.name or r['image_sha256']!=path.name or hashlib.sha256(archive._read(path/'photo.jpg',2*1024*1024)).hexdigest()!=path.name:raise ValueError('Specimen hash mismatch')
            counts[r['expected']]+=1
            rows.append(f'<article><img src="{path.name}/photo.jpg" alt="{e(r["label"],quote=True)}"><h2>{e(r["label"])}</h2><p>{e(EXPECTED[r["expected"]])}</p><p><b>Ellenőrzés alapja:</b> {e(r["evidence"])}</p><p>Tulajdonosi megállapítás. Pontos márka és szálösszetétel nincs igazolva. Inaktív kontrollminta.</p><code>{path.name}</code></article>')
        text='''<!doctype html><html lang="hu"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>ECO Clean · Ellenőrzött próbák</title><style>body{max-width:1000px;margin:32px auto;padding:0 20px;font:16px/1.6 system-ui;background:#f6f4ec;color:#354e42}article{background:white;padding:24px;margin:24px 0;border-radius:12px}img{max-width:100%;max-height:440px}code{overflow-wrap:anywhere}h1{font:40px Georgia}</style><h1>Ellenőrzött próbák</h1><p>Privát kontrollgyűjtemény, elkülönítve az aktív összehasonlító referenciáktól. A képek nem kerülnek automatikusan a szolgáltatóhoz. A döntés alapja mindig olvasható.</p>'''
        text+='<p>'+' · '.join(f'{e(EXPECTED[k])}: {v}' for k,v in counts.items())+'</p>'
        text+='''<details><summary>Mintagyűjtési terv</summary><ol><li>Szövött kontrollok: lapos szövés, zsenília, buklé, kord; több szín és közeli/normál távolság.</li><li>NovaLife kontrollok: igazolt gyártói megnevezés és ugyanarról a bútorról készült felületfotó. A szín önmagában nem bizonyíték.</li><li>Nehéz kontrollok: mikroszálas, velúros és bevonatos anyag, homályos vagy túl távoli fotó.</li><li>Írd le, ki és milyen bizonyíték alapján azonosította. Bizonytalan márkát ne tölts ki találgatással.</li><li>Azonos bútor másik kivágása nem független minta. A tesztfotó maradjon külön az aktív referenciáktól.</li><li>Új referencia élesítése előtt ugyanazokon a kontrollokon mérjük az eredményt. Mindkét tévedést számoljuk: NovaLife átengedése és szövött textil téves visszatartása.</li></ol><p>Ügyfélfotóhoz külön referenciafelhasználási engedély kell; az e-mailes válaszkérés nem ilyen engedély.</p></details>'''
        archive._write(folder/'index.html',(text+''.join(rows)+'</html>').encode('utf-8'))
    return folder/'index.html'

def main():
    p=argparse.ArgumentParser();p.add_argument('action',choices=['add','gallery']);p.add_argument('--root',type=Path,default=DEFAULT_ROOT);p.add_argument('--photo',type=Path);p.add_argument('--expected',choices=EXPECTED);p.add_argument('--label',default='');p.add_argument('--evidence',default='');p.add_argument('--owner-permission',action='store_true');a=p.parse_args();archive=Archive(a.root)
    if a.action=='add':print(add(archive,a.photo,a.expected,a.label,a.evidence,a.owner_permission))
    print(gallery(archive))
if __name__=='__main__':
    try:main()
    except Exception as e:print('Validation sample operation failed: '+type(e).__name__+'; private details withheld.');sys.exit(1)
