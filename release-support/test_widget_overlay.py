"""Offline proof-gate tests: mutations must fail without touching the actual release."""
from pathlib import Path
import hashlib,importlib.util,json,tempfile,unittest
spec=importlib.util.spec_from_file_location('overlay',Path(__file__).with_name('verify-widget-overlay.py'));gate=importlib.util.module_from_spec(spec);spec.loader.exec_module(gate)
def digest(data):return hashlib.sha256(data).hexdigest()
class ProofTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name);gate.ROOT=self.root
  def save(name,obj):
   data=json.dumps(obj).encode();p=self.root/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data);return digest(data)
  self.save=save
  pages=['index.html','karpittisztitas-matractisztitas.html']+['karpittisztitas-'+chr(97+i//26)+chr(97+i%26)+'.html' for i in range(33)]
  med={'pages':[{'file':f} for f in pages[:15]]};medsha=save('release-support/base/med.json',med)
  base={'files':{},'approvedMediterranean':{'manifestSha256':medsha,'pages':pages[:15]},'unresolved':[]};overlay={'pages':[],'dependencies':[]}
  for file in pages:
   next='#booking' if file=='index.html' else '#arak';original=f'<html><head></head><body><section id="{next[1:]}">ORIGINAL</section></body></html>'.encode();output=original
   for name,content in [('style','<link href="material-recognition/design.css">'),('section',f'<section id="anyagfelismero"><div data-material-app data-next="{next}"></div></section>'),('script','<script src="material-recognition/app.js"></script>')]:output+=f'<!-- ECO-MATERIAL:{name}:START -->{content}<!-- ECO-MATERIAL:{name}:END -->'.encode()
   p=self.root/'release'/file;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(output);base['files'][file]={'sha256':digest(original),'bytes':len(original)};overlay['pages'].append({'file':file,'next':next,'originalSha256':digest(original),'outputSha256':digest(output)})
  (self.root/'release/original.css').write_bytes(b'original');base['files']['original.css']={'sha256':digest(b'original'),'bytes':8}
  basesha=save('release-support/base/manifest.json',base);reportsha=save('release-support/base/report.json',{'issues':[],'manifestSha256':basesha})
  overlay['baseline']={'manifest':'release-support/base/manifest.json','manifestSha256':basesha,'verification':'release-support/base/report.json','verificationSha256':reportsha,'mediterranean':'release-support/base/med.json','mediterraneanSha256':medsha}
  manifest=json.loads(json.dumps(base))
  for p in overlay['pages']:manifest['files'][p['file']]['sha256']=p['outputSha256']
  for file in ('material-recognition/app.js','material-recognition/design.css','material-recognition/assets/fotel-bukle-olvasosarok.webp'):
   p=self.root/'release'/file;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b'widget');overlay['dependencies'].append({'file':file,'sha256':digest(b'widget')});manifest['files'][file]={'sha256':digest(b'widget')}
  manifest['widgetOverlay']={'path':'release-support/overlay.json','sha256':save('release-support/overlay.json',overlay)};self.manifest=manifest
 def tearDown(self):self.temp.cleanup()
 def test_valid_exact_overlay(self):self.assertEqual(gate.verify(self.manifest),[])
 def test_original_html_tamper_even_with_new_page_hash(self):
  p=self.root/'release/index.html';data=p.read_bytes().replace(b'ORIGINAL',b'ALTERED');p.write_bytes(data);self.manifest['files']['index.html']['sha256']=digest(data);self.assertTrue(gate.verify(self.manifest))
 def test_unrelated_asset_tamper(self):
  (self.root/'release/original.css').write_bytes(b'changed');self.assertTrue(gate.verify(self.manifest))
 def test_baseline_proof_tamper(self):
  self.save('release-support/base/report.json',{'issues':[],'manifestSha256':'forged'});self.assertTrue(gate.verify(self.manifest))
 def test_regional_link_tamper(self):
  p=self.root/'release/karpittisztitas-aa.html';p.write_bytes(p.read_bytes().replace(b'data-next="#arak"',b'data-next="#booking"'));self.assertTrue(gate.verify(self.manifest))
 def test_manifest_metadata_tamper(self):
  self.manifest['approvedMediterranean']['manifestSha256']='changed';self.assertTrue(gate.verify(self.manifest))
if __name__=='__main__':unittest.main()
