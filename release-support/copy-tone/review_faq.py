"""Resolve the customer-to-team voice in the remaining FAQ questions with Claude."""
import json
import run_claude_batches as claude
claude.PROMPT+='\nPONTOSÍTÁS: ezek a GYIK kérdései az ügyfél hangján az ECO Clean CSAPATÁHOZ szólnak. Itt többes szám második személy szükséges: Vállalnak→Vállaltok, vállalnak-e→vállaltok-e. Ezek nem harmadik személyű állítások. Minden alábbi kérdést javíts a megszólításon kívül változatlanul.\n'
rows=[{'id':r['id'],'text':r['text']} for r in json.loads((claude.HERE/'residual-review.json').read_text('utf-8')) if 'vállalnak' in r['text'].lower() and '?' in r['text']]
print(json.dumps({'faqQuestions':len(rows)}),flush=True)
print(json.dumps(claude.batch(200,rows)),flush=True)
