"""Have Claude screen additional structured metadata missed by the first extraction."""
import concurrent.futures,json
from run_claude_batches import HERE,batch

def main():
    original={r['text'] for r in json.loads((HERE/'corpus.json').read_text('utf-8'))}
    mapped={r['after'] for f in HERE.glob('claude-map-*.json') for r in json.loads(f.read_text('utf-8'))}
    rows=[{'id':r['id'],'text':r['text']} for r in json.loads((HERE/'final-corpus.json').read_text('utf-8')) if r['text'] not in original|mapped and len(r['text'].split())>2 and not r['text'].startswith(('http','/'))]
    groups=[rows[n:n+100] for n in range(0,len(rows),100)]
    (HERE/'extra-review-input.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'extraTexts':len(rows),'batches':len(groups)}),flush=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        jobs=[pool.submit(batch,100+i,g) for i,g in enumerate(groups)]
        for job in concurrent.futures.as_completed(jobs):print(json.dumps(job.result()),flush=True)

if __name__=='__main__':main()
