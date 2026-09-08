"""Preserve the current verified artifact and the fifteen stable design inputs."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib,json,subprocess

ROOT=Path(__file__).resolve().parent.parent
sha=lambda data:hashlib.sha256(data).hexdigest()
manifest=json.loads((ROOT/'release-support/release-manifest.json').read_text('utf-8'))
approved=json.loads((ROOT/'demo/mediterranean/manifest.json').read_text('utf-8'))
revision=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
backup=ROOT/'backups'/('ecoclean-before-mediterranean-'+revision[:7]+'.zip')
backup.parent.mkdir(exist_ok=True)
baseline=ROOT/'demo/mediterranean/baseline';baseline.mkdir(exist_ok=True)
for page in approved['pages']:
    source=ROOT/'release'/page['file']
    data=source.read_bytes()
    if sha(data)!=page['sourceSha256']:raise RuntimeError('Unapproved baseline '+page['file'])
    target=baseline/page['file']
    if target.exists() and target.read_bytes()!=data:raise RuntimeError('Existing baseline differs '+page['file'])
    target.write_bytes(data)
for name,record in manifest['files'].items():
    target=(ROOT/'release'/name).resolve()
    if not target.is_relative_to((ROOT/'release').resolve()) or sha(target.read_bytes())!=record['sha256']:
        raise RuntimeError('Current release is not the verified artifact: '+name)
if not backup.exists():
    with ZipFile(backup,'x',ZIP_DEFLATED) as archive:
        for name in manifest['files']:archive.write(ROOT/'release'/name,'release/'+name)
        for name in ['release-manifest.json','release-verification.json']:
            archive.write(ROOT/'release-support'/name,'release-support/'+name)
record={'commit':revision,'archive':backup.relative_to(ROOT).as_posix(),'sha256':sha(backup.read_bytes()),'files':len(manifest['files']),'baselinePages':len(approved['pages'])}
(ROOT/'backups/mediterranean-before.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
print(json.dumps(record))
