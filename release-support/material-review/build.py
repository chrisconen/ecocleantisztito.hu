"""Narrow follow-up: replace the two material-widget assets and their revisions."""
from pathlib import Path
import hashlib,json,re,sys
from brand_copy import brand_html,restore_html
ROOT=Path(__file__).resolve().parents[2];HERE=Path(__file__).parent;OUT=ROOT/'release'
sha=lambda b:hashlib.sha256(b).hexdigest()
manifest_path=ROOT/'release-support/release-manifest.json';current=json.loads(manifest_path.read_bytes())
if current.get('reviewOverlay'):
    parent_bytes=(HERE/'baseline-manifest.json').read_bytes();report_bytes=(HERE/'baseline-verification.json').read_bytes()
else:
    parent_bytes=manifest_path.read_bytes();report_bytes=(ROOT/'release-support/release-verification.json').read_bytes()
parent=json.loads(parent_bytes);report=json.loads(report_bytes)
assert not parent.get('reviewOverlay') and report['issues']==[] and report['manifestSha256']==sha(parent_bytes)
widget=json.loads((ROOT/parent['widgetOverlay']['path']).read_bytes());pages=[r['file'] for r in widget['pages']];assert len(set(pages))==35
files=[];outputs={};sources=[];assets={}
for name in ('app.js','design.css'):
    file='material-recognition/'+name;source='demo/material-review/'+name;data=(ROOT/source).read_bytes();old=(HERE/'baseline'/name).read_bytes() if current.get('reviewOverlay') else (OUT/file).read_bytes()
    assert sha(old)==parent['files'][file]['sha256'];assets[file]=(old,data);sources.append({'path':source,'sha256':sha(data)})
    files.append({'file':file,'beforeSha256':sha(old),'afterSha256':sha(data),'baseline':'release-support/material-review/baseline/'+name});outputs[file]=data
previous=json.loads((HERE/'overlay.json').read_bytes()) if current.get('reviewOverlay') else None
home_source='demo/material-review/home-mobile.css';home_old_path=HERE/'baseline/ui-design.css'
home_old=home_old_path.read_bytes() if home_old_path.exists() else (OUT/'ui/design.css').read_bytes()
assert sha(home_old)==parent['files']['ui/design.css']['sha256']
home_patch=(ROOT/home_source).read_bytes();home_new=home_old+home_patch
assets['ui/design.css']=(home_old,home_new);sources.append({'path':home_source,'sha256':sha(home_patch)})
files.append({'file':'ui/design.css','beforeSha256':sha(home_old),'afterSha256':sha(home_new),'baseline':'release-support/material-review/baseline/ui-design.css'});outputs['ui/design.css']=home_new
for file in pages:
    old=(OUT/file).read_bytes()
    if previous:
        record=next(r for r in previous['files'] if r['file']==file)
        if record.get('copyEdits'):old=restore_html(old.decode('utf-8'),record['copyEdits']).encode('utf-8')
        for edit in record['edits']:
            assert old.count(edit['after'].encode())==1;old=old.replace(edit['after'].encode(),edit['before'].encode())
    assert sha(old)==parent['files'][file]['sha256'];data=old;edits=[]
    for asset,(before,after) in assets.items():
        if asset=='ui/design.css' and file!='index.html':continue
        a=asset+'?v='+sha(before)[:12];b=asset+'?v='+sha(after)[:12];assert data.count(a.encode())==1;data=data.replace(a.encode(),b.encode());edits.append({'before':a,'after':b})
    branded,copy_edits=brand_html(data.decode('utf-8'));data=branded.encode('utf-8')
    files.append({'file':file,'beforeSha256':sha(old),'afterSha256':sha(data),'edits':edits,'copyEdits':copy_edits});outputs[file]=data
overlay={'version':3,'baseline':{'manifest':'release-support/material-review/baseline-manifest.json','manifestSha256':sha(parent_bytes),'verification':'release-support/material-review/baseline-verification.json','verificationSha256':sha(report_bytes)},'files':files,'sources':sources}
overlay_bytes=(json.dumps(overlay,ensure_ascii=False,indent=2)+'\n').encode();manifest=json.loads(parent_bytes);manifest['reviewOverlay']={'path':'release-support/material-review/overlay.json','sha256':sha(overlay_bytes)}
for file,data in outputs.items(): manifest['files'][file]={**parent['files'][file],'sha256':sha(data),'bytes':len(data)}
if '--write' in sys.argv:
    (HERE/'baseline').mkdir(exist_ok=True);(HERE/'baseline-manifest.json').write_bytes(parent_bytes);(HERE/'baseline-verification.json').write_bytes(report_bytes)
    for file,(old,new) in assets.items():(HERE/'baseline'/('ui-design.css' if file=='ui/design.css' else Path(file).name)).write_bytes(old)
    for file,data in outputs.items():(OUT/file).write_bytes(data)
    (HERE/'overlay.json').write_bytes(overlay_bytes);manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'written':'--write' in sys.argv,'pages':len(pages),'assets':len(assets)}))
