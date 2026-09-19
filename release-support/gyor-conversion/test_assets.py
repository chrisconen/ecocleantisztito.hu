"""Meaningful boundary checks for the new public asset inclusion path."""
import importlib.util, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('builder', ROOT/'release-support/content-clarity/build.py')
builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)

class AssetBoundary(unittest.TestCase):
    def test_rejects_parent_aliases_and_path_escapes(self):
        for name in ['index.html','INDEX.HTML','img/../index.html','img/./test.jpg','../test.jpg','/test.jpg','img//test.jpg','img\\test.jpg','C:/test.jpg']:
            with self.subTest(name=name), self.assertRaises(AssertionError):
                builder.added_target(name, ['index.html'], set())

    def test_rejects_duplicate_case_insensitive_destination(self):
        seen=set()
        self.assertEqual(builder.added_target('img/example.jpg', [], seen), (ROOT/'release/img/example.jpg').resolve())
        with self.assertRaises(AssertionError): builder.added_target('img/EXAMPLE.jpg', [], seen)

    def test_each_public_asset_is_exactly_its_declared_source(self):
        import json
        parent=json.loads((ROOT/'release-support/content-clarity/baseline-manifest.json').read_bytes())
        outputs, records, _=builder.added_assets(parent)
        for name, data in outputs.items():
            self.assertEqual(data, (ROOT/records[name]['source']).read_bytes())
            self.assertEqual(data, (ROOT/'release'/name).read_bytes())

if __name__=='__main__': unittest.main()
