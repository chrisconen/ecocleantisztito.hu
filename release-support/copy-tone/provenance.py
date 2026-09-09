"""Summarize actual Claude delegation without publishing session or usage details."""
import hashlib,json
from pathlib import Path
HERE=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
receipts=list(HERE.glob('claude-receipt-*.json'))
models=sorted({model for p in receipts for model in json.loads(p.read_text('utf-8')).get('modelUsage',{})})
maps=sorted(HERE.glob('claude-map-*.json'))
out={'delegate':'Authenticated Claude CLI','models':models,'completedBatches':len(receipts),
     'initialTexts':json.loads((HERE/'claude-batch-plan.json').read_text('utf-8'))['texts'],
     'additionalMetadataTexts':len(json.loads((HERE/'extra-review-input.json').read_text('utf-8'))),
     'finalFaqReviewQuestions':len(json.loads((HERE/'claude-map-200.json').read_text('utf-8'))),
     'changedUniqueTexts':sum(len(json.loads(p.read_text('utf-8'))) for p in maps),
     'maps':[{'file':p.name,'sha256':sha(p)} for p in maps],
     'finalCorpusSha256':sha(HERE/'final-corpus.json'),
     'editorialReview':'editorial-review.json'}
(HERE/'delegation.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:v for k,v in out.items() if k!='maps'}))
