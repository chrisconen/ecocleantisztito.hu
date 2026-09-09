"""Apply narrow grammatical corrections found while reviewing Claude's edits."""
import json
from pathlib import Path
HERE=Path(__file__).resolve().parent
corrections={
 '4fd211f7f1e17dd9':('Vállalsz','Vállaltok','FAQ question addresses the ECO Clean team.'),
 '880cd7697d919a11':('vállalsz','vállaltok','FAQ question addresses the ECO Clean team.'),
 '3b2f992afc6c2ebb':('vállalsz','vállaltok','FAQ question addresses the ECO Clean team.'),
 'ac9a27df872ed276':('ágybetéted','ágybetéteid','Preserve the original plural number of mattresses.'),
}
log=[]
for file in HERE.glob('claude-map-*.json'):
    rows=json.loads(file.read_text('utf-8'));changed=False
    for row in rows:
        if row['id'] not in corrections:continue
        old,new,reason=corrections[row['id']]
        if old in row['after']:
            before=row['after'];row['after']=before.replace(old,new);changed=True
            log.append({'id':row['id'],'map':file.name,'claudeAfter':before,'reviewedAfter':row['after'],'reason':reason})
    if changed:file.write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
if log:(HERE/'editorial-review.json').write_text(json.dumps(log,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'editorialCorrections':len(log)}))
