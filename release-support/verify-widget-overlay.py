"""Verify a narrowly scoped material widget against the exact previously approved release."""
from pathlib import Path
from html.parser import HTMLParser
import hashlib,json,re,sys
ROOT=Path(__file__).resolve().parent.parent
def sha(data):return hashlib.sha256(data).hexdigest()
def strip_widget(data):
 for name in ('style','section','script'):
  start=f'<!-- ECO-MATERIAL:{name}:START -->'.encode();end=f'<!-- ECO-MATERIAL:{name}:END -->'.encode()
  if data.count(start)!=1 or data.count(end)!=1:raise ValueError('Missing or duplicate widget marker '+name)
  a=data.index(start);b=data.index(end,a);data=data[:a]+data[b+len(end):]
 return data
def verify(manifest):
 errors=[]
 def check(ok,message):
  if not ok:errors.append(message)
 def load_bound(relative,digest):
  path=(ROOT/relative).resolve()
  if not path.is_relative_to((ROOT/'release-support').resolve()) or path.is_symlink():raise ValueError('Invalid provenance path')
  data=path.read_bytes();check(sha(data)==digest,'Provenance hash mismatch: '+relative);return json.loads(data)
 try:
  ref=manifest['widgetOverlay'];overlay=load_bound(ref['path'],ref['sha256']);proof=overlay['baseline']
  base=load_bound(proof['manifest'],proof['manifestSha256']);prior=load_bound(proof['verification'],proof['verificationSha256']);med=load_bound(proof['mediterranean'],proof['mediterraneanSha256'])
  check(not base.get('widgetOverlay'),'Nested widget baseline is forbidden')
  check(not prior.get('issues') and prior['manifestSha256']==proof['manifestSha256'],'Baseline was not exactly verified')
  check(not base.get('unresolved'),'Baseline has unresolved dependencies')
  check(proof['mediterraneanSha256']==base['approvedMediterranean']['manifestSha256'],'Historical Mediterranean approval changed')
  check(len(med['pages'])==15 and sorted(p['file'] for p in med['pages'])==sorted(base['approvedMediterranean']['pages']),'Historical Mediterranean scope changed')
  for key,value in base.items():
   if key!='files':check(manifest.get(key)==value,'Original release metadata changed: '+key)
  check(set(manifest)==set(base)|{'widgetOverlay'},'Unexpected release metadata additions')
  expected={'index.html','karpittisztitas-matractisztitas.html'}|{p for p in base['files'] if re.fullmatch(r'karpittisztitas-[a-z]+\.html',p)}
  pages={p['file']:p for p in overlay['pages']};check(len(pages)==len(overlay['pages'])==35 and set(pages)==expected,'Widget 35-page scope changed')
  allowed={'material-recognition/app.js','material-recognition/design.css','material-recognition/assets/fotel-bukle-olvasosarok.webp'}
  deps={d['file']:d for d in overlay['dependencies']};check(len(deps)==len(overlay['dependencies'])==3 and set(deps)==allowed,'Widget asset scope changed')
  check(set(manifest['files'])==set(base['files'])|allowed,'Release file set exceeds widget scope')
  for file,record in base['files'].items():
   data=(ROOT/'release'/file).read_bytes()
   if file in pages:
    page=pages[file];check(sha(strip_widget(data))==record['sha256']==page['originalSha256'],'Original HTML bytes changed: '+file)
    check(sha(data)==page['outputSha256']==manifest['files'][file]['sha256'],'Widget page hash changed: '+file)
    check(page.get('next')==('#booking' if file=='index.html' else '#arak'),'Regional widget route changed: '+file)
    class Scan(HTMLParser):
     def __init__(self):super().__init__();self.ids=[];self.targets=[]
     def handle_starttag(self,tag,attrs):
      a=dict(attrs)
      if 'id' in a:self.ids.append(a['id'])
      if 'data-material-app' in a:self.targets.append(a.get('data-next'))
    doc=Scan();doc.feed(data.decode('utf-8-sig'));check(doc.ids.count('anyagfelismero')==1 and doc.targets==[page['next']] and page['next'][1:] in doc.ids,'Widget anchor missing or duplicated: '+file)
   else:check(sha(data)==record['sha256'] and manifest['files'][file]==record,'Unrelated production file changed: '+file)
  for file,dep in deps.items():check(sha((ROOT/'release'/file).read_bytes())==dep['sha256']==manifest['files'][file]['sha256'],'Widget dependency changed: '+file)
 except (OSError,ValueError,KeyError,TypeError) as exc:errors.append('Widget proof incomplete: '+str(exc))
 return errors
if __name__=='__main__':
 manifest=json.loads((ROOT/'release-support/release-manifest.json').read_text('utf-8'));errors=verify(manifest);print(json.dumps({'issues':errors},ensure_ascii=False));sys.exit(bool(errors))
