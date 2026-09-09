import base64,hashlib,io,json,tempfile,unittest
from pathlib import Path
from PIL import Image
from archive import Archive
import review_inbox
from review_inbox import pull_reviews,validate
from sync import SyncError

class ReviewTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.archive=Archive(Path(self.temp.name)/'private')
  data=io.BytesIO();Image.new('RGB',(16,16),'tan').save(data,'JPEG');self.photo=data.getvalue();self.id='11111111-2222-4333-8444-555555555555';self.sha=hashlib.sha256(self.photo).hexdigest()
  self.record={'schema_version':1,'id':self.id,'received_utc':'2026-09-09T10:00:00Z','email':'test@example.invalid','note':'<script>alert(1)</script>','sha256':self.sha,'consent':{'purpose':'email_material_review','granted':True,'schema_version':1},'status':'pending','analysis_summary':None}
 def tearDown(self): self.temp.cleanup()
 def client(self,corrupt=False):
  owner=self
  class Client:
   archive=owner.archive
   def _request(self,path,**kwargs):
    if path.endswith('/reviews'):return {'items':[{'id':owner.id,'received_utc':owner.record['received_utc'],'sha256':owner.sha}],'cursor':None}
    return {'record':owner.record,'image':base64.b64encode(b'bad' if corrupt else owner.photo).decode()}
  return Client()
 def test_download_and_private_draft_gallery_never_activate_reference(self):
  self.assertEqual(pull_reviews(self.client()),1);self.assertEqual(pull_reviews(self.client()),0)
  folder=self.archive.root/'emailes-ellenorzes';self.assertEqual((folder/self.id/'photo.jpg').read_bytes(),self.photo)
  page=(folder/'index.html').read_text('utf-8');self.assertIn('&lt;script&gt;',page);self.assertNotIn('<script>',page);self.assertIn('mailto:test@example.invalid',page)
  self.assertEqual(self.archive.references(),[])
 def test_hash_or_consent_mismatch_never_persist(self):
  with self.assertRaises(SyncError):pull_reviews(self.client(True))
  self.assertFalse((self.archive.root/'emailes-ellenorzes'/self.id/'request.json').exists())
  self.record['consent']['granted']=False
  with self.assertRaises(SyncError):validate(self.record,self.id)
 def test_completion_requires_sent_reply_and_human_evidence(self):
  pull_reviews(self.client())
  with self.assertRaises(ValueError):review_inbox.complete(self.archive,self.id,'woven','',True)
  with self.assertRaises(ValueError):review_inbox.complete(self.archive,self.id,'woven','Kereszteződő fonalak',False)
  review_inbox.complete(self.archive,self.id,'woven','Kereszteződő fonalak',True)
  saved=json.loads((self.archive.root/'emailes-ellenorzes'/self.id/'completed.json').read_bytes())
  self.assertEqual(saved['outcome'],'woven');self.assertIn('completed_utc',saved)
  self.assertEqual(self.archive.references(),[])
  page=(self.archive.root/'emailes-ellenorzes'/'index.html').read_text('utf-8')
  self.assertIn('0 válaszra vár',page);self.assertIn('1 lezárva',page)
  self.assertIn('Kereszteződő fonalak',page)
  with self.assertRaises(ValueError):review_inbox.complete(self.archive,self.id,'novalife','Másik döntés',True)
 def test_oldest_pending_first_and_closed_collapsed(self):
  pull_reviews(self.client())
  newer=self.id
  self.id='00000000-2222-4333-8444-555555555555';self.record=dict(self.record,id=self.id,received_utc='2026-09-08T10:00:00Z',email='older@example.invalid')
  pull_reviews(self.client());page=(self.archive.root/'emailes-ellenorzes'/'index.html').read_text('utf-8')
  self.assertLess(page.index('older@example.invalid'),page.index('test@example.invalid'))
  review_inbox.complete(self.archive,self.id,'more_photo','A kép életlen, új fotót kértünk',True)
  page=(self.archive.root/'emailes-ellenorzes'/'index.html').read_text('utf-8')
  self.assertIn('1 válaszra vár · 1 lezárva',page)
  self.assertLess(page.index('<summary>Lezárt kérések'),page.index('older@example.invalid'))
if __name__=='__main__':unittest.main()
