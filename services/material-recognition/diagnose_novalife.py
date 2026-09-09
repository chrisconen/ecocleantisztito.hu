"""Owner-authorized comparison pilot; no photo storage, no reference activation.

Runs the actual Worker adapter locally with its active reference set. Reports only
bounded classification fields and reference count, never keys or encoded images.
"""
import argparse, base64, io, json, os, subprocess, sys
from pathlib import Path
from PIL import Image, ImageOps
from archive import Archive, DEFAULT_ROOT
from urllib.request import Request, urlopen

def main():
    p=argparse.ArgumentParser();source=p.add_mutually_exclusive_group(required=True);source.add_argument('--photo', type=Path);source.add_argument('--reference-index', type=int, choices=range(3));source.add_argument('--holdout', action='store_true');p.add_argument('--report', required=True);args=p.parse_args()
    if not args.report.replace('-', '').isalnum(): raise ValueError('Invalid report name')
    references=Archive(DEFAULT_ROOT).references()
    if args.holdout:
        with urlopen(Request('https://andante.hu/wp-content/uploads/2022/05/Novalife_premium_hellgrau_11.jpg',headers={'User-Agent':'ECOClean-MaterialValidation/1'}),timeout=30) as response: data=response.read(5*1024*1024+1)
        if len(data)>5*1024*1024: raise ValueError('Fixture too large')
    elif args.reference_index is not None: data=base64.b64decode(references[args.reference_index]['b64'])
    else: data=args.photo.read_bytes()
    with Image.open(io.BytesIO(data)) as original:
        im=ImageOps.exif_transpose(original).convert('RGB');im.thumbnail((1200,1200));out=io.BytesIO();im.save(out,'JPEG',quality=85)
    payload={'key':os.environ['GEMINI_API_KEY'],'image':base64.b64encode(out.getvalue()).decode(),'references':references}
    worker=(Path(__file__).parent/'cloudflare/src/analysis.mjs').resolve().as_uri()
    code='''import {analyze} from WORKER;
let input='';for await(const c of process.stdin)input+=c;const data=JSON.parse(input);
const originalFetch=globalThis.fetch;let raw,images=0,referenceLabels=[];
globalThis.fetch=async (url,options)=>{const request=JSON.parse(options.body);const parts=request.contents[0].parts;
images=parts.filter(p=>p.inlineData).length;
referenceLabels=parts.filter(p=>p.text?.startsWith('REFERENCIA')).map(p=>JSON.parse(p.text.split('\\n')[1]).label);
const response=await originalFetch(url,options);const body=await response.clone().json();
raw=JSON.parse(body.candidates[0].content.parts.map(p=>p.text||'').join(''));return response;};
const result=await analyze({GEMINI_API_KEY:data.key},new Uint8Array(Buffer.from(data.image,'base64')),'',data.references);
console.log(JSON.stringify({imagesSent:images,referenceLabels,raw:Object.fromEntries(['anyag','indoklas','novalife_status','novalife_structure','novalife_reason'].map(k=>[k,raw[k]])),result}));
'''.replace('WORKER',json.dumps(worker))
    run=subprocess.run(['node','--input-type=module','-e',code],input=json.dumps(payload),text=True,encoding='utf-8',capture_output=True,timeout=100)
    if run.returncode: raise RuntimeError('Worker pilot failed; upstream output withheld')
    report=json.loads(run.stdout);dest=Path(__file__).parent/'qa'/f'{args.report}.json';dest.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False))
if __name__=='__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    try: main()
    except Exception as e: print('Pilot failed: '+type(e).__name__+'; credentials and image data hidden.');sys.exit(1)
