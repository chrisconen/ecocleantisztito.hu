import tempfile,unittest
from pathlib import Path
from PIL import Image
from archive import Archive
from validation_samples import add,gallery

class Samples(unittest.TestCase):
 def test_evidence_permission_idempotence_and_reference_isolation(self):
  with tempfile.TemporaryDirectory() as temp:
   root=Path(temp);archive=Archive(root/'private');photo=root/'source.jpg';Image.new('RGB',(32,32),'tan').save(photo)
   args=(archive,photo,'likely_other','Saját szövött minta','Tulajdonos által ismert, kereszteződő fonalak')
   with self.assertRaises(ValueError):add(*args,False)
   identifier=add(*args,True);self.assertEqual(identifier,add(*args,True))
   self.assertEqual(archive.references(),[]);self.assertEqual(list((archive.root/'inbox').iterdir()),[])
   page=gallery(archive).read_text('utf-8');self.assertIn('Tulajdonosi megállapítás',page)
   with self.assertRaises(ValueError):add(archive,photo,'possible_novalife','Másik döntés','Eltérő bizonyíték',True)
   (archive.root/'ellenorzott-probak'/identifier/'photo.jpg').write_bytes(b'bad')
   with self.assertRaises(ValueError):gallery(archive)

if __name__=='__main__':unittest.main()
