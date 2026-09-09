"""Synthetic owner-authorized review round trip; no model calls or email sending.

Creates one clearly labelled test request, verifies private desktop download,
then removes only that request and its two known local test files.
"""
import base64,io,json,sys
from pathlib import Path
from PIL import Image
from smoke import call
from archive import Archive,DEFAULT_ROOT
from sync import SyncClient,load_config
from review_inbox import pull_reviews,gallery

def main():
    buff=io.BytesIO();Image.new('RGB',(16,16),'beige').save(buff,'JPEG');archive=Archive(DEFAULT_ROOT)
    note='ECO Clean operator review test: generated image, not a customer request.'
    payload={'image':'data:image/jpeg;base64,'+base64.b64encode(buff.getvalue()).decode(),'media_type':'image/jpeg','note':note,'email':'ecoclean-review-test@example.invalid','review_consent':True,'analysis_summary':None}
    status,ack=call('/api/material-admin/review','POST',payload,owner=True)
    assert status==200 and ack.get('review_saved') is True
    identifier=ack['review_id'];directory=DEFAULT_ROOT/'emailes-ellenorzes'/identifier
    try:
        status,item=call('/api/material-admin/reviews/'+identifier,owner=True);assert status==200 and item['record']['note']==note and item['record']['analysis_summary'] is None
        downloaded=pull_reviews(SyncClient(archive,**load_config(DEFAULT_ROOT/'sync-config.json')))
        assert directory.resolve().parent==(DEFAULT_ROOT/'emailes-ellenorzes').resolve()
        record=json.loads((directory/'request.json').read_bytes());assert record['email']==payload['email'] and record['consent']['purpose']=='email_material_review'
        assert (directory/'photo.jpg').is_file()
        result={'reviewSaved':True,'privateDownload':True,'emailAndPhotoLinked':True,'referenceConsentGranted':False,'modelCalls':0,'emailsSent':0}
    finally:
        status,deleted=call('/api/material-admin/reviews/'+identifier,'DELETE',owner=True);assert status==200 and deleted.get('deleted') is True
        with archive._locked():
            archive._check(directory,missing=True)
            if directory.exists():
                assert directory.resolve().parent==(DEFAULT_ROOT/'emailes-ellenorzes').resolve()
                assert {f.name for f in directory.iterdir()}=={'request.json','photo.jpg'}
                assert archive._read_json(directory/'request.json')['note']==note
                for name in ('request.json','photo.jpg'):
                    path=directory/name;archive._check(path);path.unlink()
                directory.rmdir()
        gallery(archive)
    result['syntheticRequestRemoved']=True
    (Path(__file__).parent.parent/'qa/review-live.json').write_text(json.dumps(result,indent=2),encoding='utf-8');print(json.dumps(result))
if __name__=='__main__':
    try:main()
    except Exception as e:print('Review live check failed: '+type(e).__name__+'; private content withheld.');sys.exit(1)
