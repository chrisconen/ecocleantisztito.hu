import unittest
from brand_copy import brand_text,brand_html,restore_html

class Branding(unittest.TestCase):
 def test_name_articles_and_idempotence(self):
  for a,b in [('NovaLife-jellegű','ANDANTE NovaLife-jellegű'),('a NovaLife','az ANDANTE NovaLife'),('A NovaLife','Az ANDANTE NovaLife'),('ANDANTE NovaLife','ANDANTE NovaLife')]:
   self.assertEqual(brand_text(a),b);self.assertEqual(brand_text(b),b)
 def test_exact_html_roundtrip_preserves_code_urls_and_entities(self):
  source='<p title="NovaLife">A NovaLife &amp; más</p><p>ANDANTE NovaLife</p><img src="NovaLife.jpg" alt="NovaLife minta"><script>const x="NovaLife";</script><!-- NovaLife -->'
  result,edits=brand_html(source)
  self.assertIn('src="NovaLife.jpg"',result);self.assertIn('const x="NovaLife"',result)
  self.assertIn('<!-- NovaLife -->',result);self.assertIn('&amp;',result)
  self.assertEqual(restore_html(result,edits),source);self.assertEqual(brand_html(result)[1],[])
  with self.assertRaises(AssertionError):restore_html(result.replace('más','eltérő'),edits)
 def test_case_variants_never_duplicate_brand(self):
  self.assertEqual(brand_text('a Andante NovaLife'), 'az ANDANTE NovaLife')
  self.assertEqual(brand_text('A NOVALIFE'), 'Az ANDANTE NovaLife')
 def test_all_current_release_html_is_branded(self):
  from pathlib import Path
  root=Path(__file__).resolve().parents[2]/'release'
  for path in root.glob('*.html'):
   self.assertEqual(brand_html(path.read_text('utf-8'))[1],[],path.name)

if __name__=='__main__':unittest.main()
