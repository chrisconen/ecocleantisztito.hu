"""Flag address-form candidates for contextual editorial review, not blind replacement."""
import json,re
from pathlib import Path
HERE=Path(__file__).resolve().parent
words='ön önnek önnel önt önök önöket önöknek kérjen hívjon válasszon válassza foglaljon foglalja adja adjon írjon küldje küldjön olvassa nézze ismerje tudja tudjon tudta tekintse ellenőrizze vegye töltse tartsa élvezze látogasson próbálja kattintson konfigurálja bízza dőljön kockáztasson győződjön érdeklődjön keressen segítsen vásároljon tegye helyezze hagyja olvasson válaszoljon találja mondja jelölje jelentkezzen értesüljön szeretne szeretné vállalnak foglalhat kérhet leadhat tud szíveskedjen'.split()
pattern=re.compile(r'(?<!\w)(?:'+'|'.join(words)+r')(?!\w)',re.I)
rows=[r for r in json.loads((HERE/'final-corpus.json').read_text('utf-8')) if pattern.search(r['text'])]
(HERE/'residual-review.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps([{'id':r['id'],'text':r['text'],'kinds':r['kinds']} for r in rows],ensure_ascii=False,indent=2))
