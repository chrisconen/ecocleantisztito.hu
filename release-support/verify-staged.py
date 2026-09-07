"""Verify staged artifact bytes and reject private release inputs before commit."""
from pathlib import Path
import hashlib, json, re, subprocess, sys

ROOT=Path(__file__).resolve().parent.parent
def git(*args):
    return subprocess.check_output(['git',*args],cwd=ROOT)

manifest_bytes=git('show',':release-support/release-manifest.json')
manifest=json.loads(manifest_bytes)
report=json.loads(git('show',':release-support/release-verification.json'))
errors=[]
if report['issues'] or report['manifestSha256']!=hashlib.sha256(manifest_bytes).hexdigest():
    errors.append('Staged report does not validate the staged manifest')
changed=[p.decode('utf-8') for p in git('diff','--cached','--name-only','-z').split(b'\0') if p]
entries={}
for row in git('ls-files','--stage','-z').split(b'\0'):
    if not row:continue
    metadata,name=row.split(b'\t',1)
    mode,blob,stage=metadata.split()
    if stage!=b'0':errors.append('Unresolved index stage')
    entries[name.decode('utf-8')]=(mode,blob)
expected={'release/'+name for name in manifest['files']}
actual={name for name in entries if name.startswith('release/')}
if expected!=actual:errors.append('Staged artifact file set differs from manifest')
requested=sorted(set(changed)|expected)
raw=subprocess.check_output(['git','cat-file','--batch'],cwd=ROOT,input=b''.join(entries[name][1]+b'\n' for name in requested))
position=0
for name in requested:
    end=raw.index(b'\n',position)
    header=raw[position:end].split();size=int(header[2])
    data=raw[end+1:end+1+size];position=end+size+2
    if name.startswith('release/'):
        if hashlib.sha256(data).hexdigest()!=manifest['files'][name[8:]]['sha256']:
            errors.append('Staged artifact hash mismatch: '+name)
    if name in changed:
        if re.search(r'(^|/)(backups|\.opencode|\.playwright-mcp|node_modules|\.env)(/|$)|ecocleantisztito\.hu\.txt$|\.(png|jpe?g)$',name) and not name.startswith('release/'):
            errors.append('Unexpected private or bulky source artifact: '+name)
        if re.search(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bgh[pousr]_[A-Za-z0-9]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{40,}\b|\bAKIA[A-Z0-9]{16}\b',data):
            errors.append('Credential signature in staged file: '+name)
print(json.dumps({'stagedFiles':len(changed),'releaseFiles':len(expected),'errors':errors}))
sys.exit(bool(errors))
