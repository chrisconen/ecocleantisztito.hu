from pathlib import Path
from PIL import Image
import json, shutil, hashlib

ROOT=Path(__file__).resolve().parent
records=json.loads((ROOT/'asset-sources.json').read_text('utf-8'))['assets']
out=ROOT/'assets'
(out/'originals').mkdir(parents=True,exist_ok=True)
manifest=[]
for item in records:
    source=Path(item['source'])
    original=out/'originals'/(item['name']+'.png')
    shutil.copy2(source,original)
    with Image.open(original) as im:
        im=im.convert('RGB')
        im.thumbnail((1800,1400),Image.Resampling.LANCZOS)
        target=out/(item['name']+'.webp')
        im.save(target,'WEBP',quality=88,method=6)
        manifest.append({'name':item['name'],'file':target.relative_to(ROOT).as_posix(),'size':im.size,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
(ROOT/'asset-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'images':len(manifest),'webpBytes':sum(x['bytes'] for x in manifest),'originalsPreserved':True}))
