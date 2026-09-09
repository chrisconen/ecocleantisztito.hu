"""Delegate Hungarian wording to Claude CLI in bounded, tool-free batches."""
import concurrent.futures, json, os, re, subprocess, time
from pathlib import Path

HERE=Path(__file__).resolve().parent
CLI=Path(os.environ['APPDATA'])/'npm/node_modules/@anthropic-ai/claude-code/bin/claude.exe'
PROMPT='''Te Claude vagy, az ECO Clean magyar weboldalának nyelvi szerkesztője.
A tulajdonos kifejezetten téged kért meg: a teljes saját weboldalszöveg KIZÁRÓLAG TEGEZŐ legyen.
Az alábbi id/text listából írd át a magázó megszólításokat természetes, professzionális,
barátságos egyes szám második személyre. Pl. Önnek→neked, Válasszon→Válassz,
Kérjen→Kérj, otthona→otthonod, családja→családod, Foglaljon→Foglalj.
Csak a saját, ügyfélhez szóló szövegben javíts. A semleges harmadik személyt hagyd
meg (pl. "az eljárás eltávolítja"). A többes szám első személy (kérjük) önmagában
nem magázás. A szó szerinti ügyfélvéleményeket ne írd át.
Ne változtass tényeket, számokat, árakat, helyeket, szolgáltatásokat, üzleti/jogi
feltételeket. URL, selector, kód, HTML-tag, attribútum, ${...} interpoláció,
backslash és idézőjel érintetlen. Tisztán technikai kódot hagyd ki.
Ha tagok közé tördelt szövegrész hiányos, csak a megszólítást javítsd, ne toldd ki.
Válaszod KIZÁRÓLAG JSON-tömb legyen: [{"id":"eredeti id","before":"pontos eredeti text","after":"teljes tegező szöveg"}].
Csak tényleges változásokat adj vissza. Már tegező vagy semleges szövegnél nincs sor.
Ne használj eszközt, ne írj magyarázatot vagy markdown keretet.
'''

def batch(index,rows):
    target=HERE/f'claude-map-{index:03d}.json'
    if target.exists():return {'batch':index,'cached':True,'changes':len(json.loads(target.read_text('utf-8')))}
    prompt=PROMPT+'\nSZÖVEGEK:\n'+json.dumps(rows,ensure_ascii=False,separators=(',',':'))
    start=time.monotonic()
    response=subprocess.run([str(CLI),'-p','--safe-mode','--tools','','--effort','medium','--output-format','json'],input=prompt,encoding='utf-8',capture_output=True,timeout=300,cwd=HERE)
    if response.returncode:raise RuntimeError(f'Claude batch {index} failed (exit {response.returncode})')
    envelope=json.loads(response.stdout);result=envelope.get('result','').strip()
    if result.startswith('```'):result=re.sub(r'^```(?:json)?\s*|\s*```$','',result)
    data=json.loads(result)
    allowed={row['id']:row['text'] for row in rows}
    if not isinstance(data,list):raise ValueError('Claude did not return a list')
    for row in data:
        if (not isinstance(row,dict) or row.get('id') not in allowed or row.get('before')!=allowed[row['id']] or
            not isinstance(row.get('after'),str) or not row['after'].strip()):raise ValueError(f'Invalid Claude row in batch {index}')
    target.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (HERE/f'claude-receipt-{index:03d}.json').write_text(json.dumps({k:envelope.get(k) for k in ['session_id','duration_ms','total_cost_usd','usage','modelUsage','is_error']},indent=2),encoding='utf-8')
    return {'batch':index,'changes':len(data),'seconds':round(time.monotonic()-start,1)}

def main():
    corpus=json.loads((HERE/'corpus.json').read_text('utf-8'))
    candidates={r['id'] for r in json.loads((HERE/'candidates.json').read_text('utf-8'))}
    # Prioritize clearly formal text, then screen every remaining consumer text.
    rows=[{'id':r['id'],'text':r['text']} for r in sorted(corpus,key=lambda r:r['id'] not in candidates)]
    groups=[];current=[];chars=0
    for row in rows:
        n=len(row['text'])
        if current and (len(current)>=130 or chars+n>12500):groups.append(current);current=[];chars=0
        current.append(row);chars+=n
    if current:groups.append(current)
    (HERE/'claude-batch-plan.json').write_text(json.dumps({'texts':len(rows),'batches':len(groups),'sizes':[len(g) for g in groups]},indent=2),encoding='utf-8')
    if not CLI.is_file():raise RuntimeError('Claude executable missing')
    print(json.dumps(batch(1,groups[0])),flush=True)
    failures=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        jobs={pool.submit(batch,i+1,group):i+1 for i,group in enumerate(groups) if i>0}
        for job in concurrent.futures.as_completed(jobs):
            try:print(json.dumps(job.result()),flush=True)
            except Exception as e:failures.append({'batch':jobs[job],'error':type(e).__name__});print(json.dumps(failures[-1]),flush=True)
    print(json.dumps({'batches':len(groups),'failures':failures}),flush=True)
    return bool(failures)

if __name__=='__main__':raise SystemExit(main())
