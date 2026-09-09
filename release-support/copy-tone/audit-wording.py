"""Review Claude's exact word-level changes without rendering whole paragraphs."""
import difflib,json,re
from pathlib import Path
HERE=Path(__file__).resolve().parent
changes=[]
for file in sorted(HERE.glob('claude-map-*.json')):
    for row in json.loads(file.read_text('utf-8')):
        before,after=row['before'],row['after']
        a=re.findall(r'\w+|[^\w\s]',before,re.UNICODE);b=re.findall(r'\w+|[^\w\s]',after,re.UNICODE)
        edits=[]
        for kind,i,j,k,l in difflib.SequenceMatcher(None,a,b,autojunk=False).get_opcodes():
            if kind!='equal':edits.append({'before':' '.join(a[i:j]),'after':' '.join(b[k:l])})
        changes.append({'id':row.get('id'),'map':file.name,'edits':edits})
target=HERE/'wording-diff.json';target.write_text(json.dumps(changes,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'translations':len(changes),'wordChanges':sum(len(c['edits']) for c in changes)}))
