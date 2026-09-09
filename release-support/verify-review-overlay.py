"""Verify an exact two-asset/widget-revision update, then the original proof chain."""
from pathlib import Path
import hashlib,importlib.util,json,re,sys
ROOT=Path(__file__).resolve().parent.parent
def verify(manifest):
    errors=[]
    try:
        spec=importlib.util.spec_from_file_location('review_parent',ROOT/'release-support/verify-studio-overlay.py');gate=importlib.util.module_from_spec(spec);spec.loader.exec_module(gate);gate.ROOT=ROOT
        sha=gate.sha;need=gate.require
        overlay=gate.bound(manifest['reviewOverlay'],'release-support/material-review/overlay.json')
        need(set(overlay)=={'version','baseline','files','sources'} and overlay['version']==1,'Review overlay schema')
        b=overlay['baseline'];need(set(b)=={'manifest','manifestSha256','verification','verificationSha256'},'Review baseline schema')
        parent=gate.bound({'path':b['manifest'],'sha256':b['manifestSha256']},'release-support/material-review/baseline-manifest.json')
        report=gate.bound({'path':b['verification'],'sha256':b['verificationSha256']},'release-support/material-review/baseline-verification.json')
        need(not parent.get('reviewOverlay') and report['issues']==[] and report['manifestSha256']==b['manifestSha256'],'Unverified review parent')
        need(set(manifest)==set(parent)|{'reviewOverlay'} and set(manifest['files'])==set(parent['files']),'Review scope metadata')
        for k in parent:need(k=='files' or manifest[k]==parent[k],'Review changed metadata '+k)
        widget=gate.bound(parent['widgetOverlay'],'release-support/material-widget-overlay.json');pages={p['file'] for p in widget['pages']};need(len(pages)==35,'Review page scope')
        assets={'material-recognition/app.js','material-recognition/design.css'};restored={};records={r['file']:r for r in overlay['files']}
        need(len(records)==len(overlay['files'])==37 and set(records)==pages|assets,'Review file scope')
        need(len(overlay['sources'])==2 and {s['path'] for s in overlay['sources']}=={'demo/material-review/app.js','demo/material-review/design.css'},'Review source scope')
        for source in overlay['sources']:
            need(set(source)=={'path','sha256'} and source['path'] in {'demo/material-review/app.js','demo/material-review/design.css'},'Review source path')
            name='material-recognition/'+Path(source['path']).name;data=gate.artifact(name)
            need(sha(gate.read_path(ROOT,source['path']))==source['sha256']==sha(data),'Review asset source hash')
        for file,r in records.items():
            data=gate.artifact(file);need(sha(data)==r['afterSha256']==manifest['files'][file]['sha256'],'Review current hash '+file)
            need(manifest['files'][file]==dict(parent['files'][file],sha256=sha(data),bytes=len(data)),'Review changed file metadata')
            if file in assets:
                need(set(r)=={'file','beforeSha256','afterSha256','baseline'} and r['baseline']=='release-support/material-review/baseline/'+Path(file).name,'Review asset baseline')
                original=gate.read_path(ROOT,r['baseline'])
            else:
                need(set(r)=={'file','beforeSha256','afterSha256','edits'} and len(r['edits'])==2,'Review HTML edits')
                original=data;seen=set()
                for edit in r['edits']:
                    need(set(edit)=={'before','after'},'Review edit schema');asset=edit['before'].split('?')[0]
                    need(asset in assets and asset not in seen,'Review revision asset');seen.add(asset)
                    need(edit['before']==asset+'?v='+parent['files'][asset]['sha256'][:12] and edit['after']==asset+'?v='+manifest['files'][asset]['sha256'][:12],'Review asset version')
                    need(original.count(edit['after'].encode())==1,'Review ambiguous revision');original=original.replace(edit['after'].encode(),edit['before'].encode())
            need(sha(original)==r['beforeSha256']==parent['files'][file]['sha256'],'Review parent restoration '+file);restored[file]=original
        for file,record in parent['files'].items():
            if file not in records:need(manifest['files'][file]==record and sha(gate.artifact(file))==record['sha256'],'Review unlisted change '+file)
        reader=lambda file:restored[file] if file in restored else gate.artifact(file)
        errors.extend(gate.verify(parent,read_current=reader))
    except (OSError,ValueError,KeyError,TypeError,AttributeError,UnicodeError) as e:errors.append('Review proof: '+str(e))
    return errors
if __name__=='__main__':
    errors=verify(json.loads((ROOT/'release-support/release-manifest.json').read_bytes()));print(json.dumps({'issues':errors}));sys.exit(bool(errors))
