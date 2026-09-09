"""Manual paid NovaLife pilot. Images stay in memory; no R2 archive/reference activation.

Manufacturer swatches have known catalogue provenance, not independently certified
physical composition. This small pilot is NOT a sensitivity/accuracy benchmark.
An optional owner-authorized photo has unknown NovaLife ground truth.
"""
import argparse, base64, io, json, sys, time
from pathlib import Path
from urllib.request import Request, urlopen
from PIL import Image, ImageOps
from smoke import call

SWATCHES = [
    'https://andante.hu/wp-content/uploads/2022/05/Novalife_premium_nuss.jpg',
    'https://andante.hu/wp-content/uploads/2022/05/Novalife_premium_hellgrau_11.jpg',
    'https://andante.hu/wp-content/uploads/2022/05/Novalife_premium_ecru_41.jpg',
]

def analyze(data):
    with Image.open(io.BytesIO(data)) as original:
        im=ImageOps.exif_transpose(original).convert('RGB'); im.thumbnail((1200,1200))
        out=io.BytesIO(); im.save(out,'JPEG',quality=85)
    payload={'image':'data:image/jpeg;base64,'+base64.b64encode(out.getvalue()).decode(),
             'media_type':'image/jpeg','note':'','archive_consent':False}
    start=time.monotonic()
    status,result=call('/api/material-admin/analyze','POST',payload,owner=True)
    return {'http_status':status,'seconds':round(time.monotonic()-start,2),
            'material':result.get('anyag'), 'image_kind':result.get('kep_tipus'),
            'visual_reason':result.get('indoklas'),
            'novalife':result.get('novalife'), 'archive_meta':result.get('_meta')}

def main():
    p=argparse.ArgumentParser();p.add_argument('--owner-photo',type=Path)
    p.add_argument('--owner-only',action='store_true')
    p.add_argument('--expected-references',type=int,choices=range(5));args=p.parse_args()
    if args.owner_only and not args.owner_photo: p.error('--owner-only requires --owner-photo')
    results=[]
    for url in ([] if args.owner_only else SWATCHES):
        with urlopen(Request(url,headers={'User-Agent':'ECOClean-MaterialValidation/1'}),timeout=30) as r:
            data=r.read(5*1024*1024+1)
        if len(data)>5*1024*1024: raise ValueError('Fixture too large')
        row={'source':url,'ground_truth':'manufacturer-listed NovaLife swatch',
             'reference_overlap':bool(args.expected_references and ('nuss' in url or 'ecru' in url)),**analyze(data)}
        row['false_clearance']=row.get('novalife',{}).get('status')=='likely_other'
        results.append(row); print(json.dumps(row,ensure_ascii=False),flush=True)
    if args.owner_photo:
        row={'source':'owner-authorized caravan photo; local path omitted',
             'ground_truth':'unknown',**analyze(args.owner_photo.read_bytes())}
        results.append(row); print(json.dumps(row,ensure_ascii=False),flush=True)
    report={'scope':'small pilot, not accuracy measurement','archived':False,'results':results}
    report['expected_reference_count']=args.expected_references
    target=Path(__file__).resolve().parent.parent/('qa/novalife-references-live.json' if args.expected_references is not None else 'qa/novalife-owner-live.json' if args.owner_only else 'qa/novalife-live.json')
    target.parent.mkdir(exist_ok=True);target.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    return 0 if all(x['http_status']==200 and x.get('novalife') and not x.get('false_clearance') and (args.expected_references is None or x.get('archive_meta',{}).get('reference_count')==args.expected_references) for x in results) else 1

if __name__=='__main__':
    try: sys.exit(main())
    except Exception as e:
        print('Pilot failed ('+type(e).__name__+'); credentials and image content hidden.');sys.exit(1)
