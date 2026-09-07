from pathlib import Path
from playwright.sync_api import sync_playwright
from playwright.async_api import async_playwright
import asyncio, json, sys, os

OUT=Path(__file__).resolve().parent
BASE=os.environ.get('ECO_QA_BASE','http://127.0.0.1:8089/demo/')
ARTIFACT=Path(os.environ.get('ECO_QA_OUTPUT',str(OUT)))
ARTIFACT.mkdir(parents=True,exist_ok=True)
label=sys.argv[1] if len(sys.argv)>1 else 'before'

async def audit():
 inventory=json.loads((OUT.parent/'rollout/inventory.json').read_text('utf-8'))
 pages=[r['file'] for r in inventory if r['family']!='redirect']
 widths=[2560,1440,1024,768,390,320]
 if label=='services':
  pages=[file for file in pages if file.startswith(('takaritas-','ablaktisztitas-'))]
  widths=[1440,768,390]
 if label.startswith('regional'):
  pages=[file for file in pages if 'process-timeline' in (OUT.parent/file).read_text('utf-8')]
  widths=[1920,1440,1100,1024,900,768,760,600,390,320]
  if label=='regional-before':pages=['ablaktisztitas-balatonfured.html','takaritas-balatonlelle.html'];widths=[1440]
 results=[];issues=[];semaphore=asyncio.Semaphore(4)
 measure='''() => {
  const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
  const errors=[],h=document.querySelector('h1'),copy=h?.closest('.subpage-hero-content,.eco-hero__copy,.hero-content')||h?.parentElement;
  if(document.documentElement.dataset.theme!=='light'||document.querySelector('#themeToggle,.theme-toggle'))errors.push('Light-only presentation violated');
  if(!h||!copy)return {errors:['Missing hero heading'],grids:0};
  const hbox=rect(h),cbox=rect(copy),width=innerWidth;
  if(hbox.width<Math.min(width-50,width>=1200?450:270))errors.push('Narrow hero copy: '+hbox.width);
  if(hbox.x< -1||hbox.right>width+1)errors.push('Hero heading outside viewport');
  function checkText(el,label) {
    const box=rect(el);if(box.width===0||box.height===0)return;
    const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let node;
    while(node=walker.nextNode())for(const match of node.textContent.matchAll(/\\S+/g)){
      const range=document.createRange();range.setStart(node,match.index);range.setEnd(node,match.index+match[0].length);
      // Range rectangles include the font's full em box, which can extend beyond
      // a heading's line box without clipping. Measure horizontal containment.
      for(const r of range.getClientRects())if(r.left<box.x-2||r.right>box.right+2){errors.push(label+' text overflows: '+match[0]);return;}
    }
  }
  checkText(h,'Heading');
  const description=copy.querySelector('.subpage-hero-desc,.eco-lead,.hero-subtitle,.hero-description');if(description)checkText(description,'Description');
  document.querySelectorAll('.trust-badge-card__title,.trust-badge-card__desc').forEach(e=>checkText(e,'Trust card'));
  const photo=document.querySelector('.subpage-editorial,.eco-figure,.hero-image-wrapper,.hero-visual');
  if(photo){const box=rect(photo);if(box.width<100||box.height<100)errors.push('Hero image collapsed');if(Math.min(cbox.right,box.right)-Math.max(cbox.x,box.x)>3&&Math.min(cbox.bottom,box.bottom)-Math.max(cbox.y,box.y)>3)errors.push('Hero image and copy overlap');}
  const grids=[...document.querySelectorAll('.eco-rollout :is(.why-us-grid,.pricing-grid,.services-grid,.benefits-grid,.industry-grid,.guarantees-grid,.seasonal-grid,.health-grid,.stats-grid)')].filter(e=>e.children.length===4);
  for(const grid of grids){
    const cells=[...grid.children].map(rect),rows=new Set(cells.map(r=>Math.round(r.y))),columns=new Set(cells.map(r=>Math.round(r.x))),expected=grid.matches('.matrac-choose__cards')?1:width>1100?4:width>600?2:1;
    if(columns.size!==expected||rows.size!==4/expected)errors.push('Four-card grid is '+columns.size+' columns / '+rows.size+' rows: '+grid.className);
    if(Math.max(...cells.map(r=>r.width))-Math.min(...cells.map(r=>r.width))>2)errors.push('Unequal card widths: '+grid.className);
  }
  const regional=[];
  function verifyRows(grid,counts,name){
   const cells=[...grid.children].map(rect),rows=[];
   for(const cell of cells){let row=rows.find(row=>Math.abs(row[0].y-cell.y)<2);if(!row){row=[];rows.push(row);}row.push(cell);}
   if(JSON.stringify(rows.map(row=>row.length))!==JSON.stringify(counts))errors.push(name+' rows: '+JSON.stringify(rows.map(row=>row.length)));
   const box=rect(grid),gap=parseFloat(getComputedStyle(grid).columnGap)||0;
   rows.forEach(row=>{
    if(Math.max(...row.map(r=>r.width))-Math.min(...row.map(r=>r.width))>2)errors.push(name+' unequal widths');
    if(Math.abs(row.reduce((sum,r)=>sum+r.width,0)+gap*(row.length-1)-box.width)>2)errors.push(name+' row does not fill available width');
    if(row.some(r=>r.x<box.x-1||r.right>box.right+1||r.x<0||r.right>width+1))errors.push(name+' outside bounds');
   });
   grid.querySelectorAll('h3,p,.number,.label').forEach(e=>checkText(e,name));
   regional.push({name,rows:rows.map(row=>row.length),width:box.width,cardWidths:rows.map(row=>row.map(r=>r.width))});
  }
  document.querySelectorAll('.eco-subpage .process-timeline:has(> :nth-child(5):last-child)').forEach(grid=>verifyRows(grid,width>760?[3,2]:[1,1,1,1,1],'Five steps'));
  document.querySelectorAll('.eco-subpage .subpage-hero .trust-badges:has(> :nth-child(4):last-child)').forEach(grid=>verifyRows(grid,width>600?[4]:[2,2],'Hero figures'));
  document.querySelectorAll('.eco-subpage .why-us-detailed .content-blocks:has(> :nth-child(4):last-child)').forEach(grid=>verifyRows(grid,width>768?[2,2]:[1,1,1,1],'Detailed cards'));
  return {errors,grids:grids.length,regional,headingWidth:hbox.width,headingHeight:hbox.height};
 }'''
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True)
  context=await browser.new_context(reduced_motion='reduce')
  await context.add_init_script("localStorage.setItem('ecoclean-demo-theme','dark');localStorage.setItem('ecoclean-theme','dark');")
  async def route_request(route):
   if any(host in route.request.url for host in ['127.0.0.1:8089','fonts.googleapis.com','fonts.gstatic.com']):await route.continue_()
   else:await route.abort()
  await context.route('**/*',route_request)
  async def visit(file):
   async with semaphore:
    page=await context.new_page()
    try:
     await page.goto(BASE+file,wait_until='networkidle',timeout=30000)
     await page.evaluate('document.fonts.ready')
     for width in widths:
      await page.set_viewport_size({'width':width,'height':1000})
      await page.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
      result=await page.evaluate(measure);result.update(file=file,width=width)
      if label=='services':
       expected='cleaning-atrium.webp' if file.startswith('takaritas-') else 'window-storefront.webp'
       hero_image=await page.locator('.editorial-hero-photo').evaluate('e=>({src:e.currentSrc,loaded:e.complete&&e.naturalWidth>0,naturalWidth:e.naturalWidth,naturalHeight:e.naturalHeight})')
       result['image']=hero_image
       if not hero_image['loaded'] or not hero_image['src'].endswith('/'+expected):result['errors'].append('Incorrect or unloaded service hero image')
       if file in ['takaritas-gyor.html','ablaktisztitas-gyor.html'] and width in [1440,390]:
        await page.locator('.subpage-hero').screenshot(path=str(ARTIFACT/f'service-hero-{file[:-5]}-{width}.png'),style='#nav,.theme-toggle{visibility:hidden!important}')
      if label.startswith('regional') and file in ['ablaktisztitas-balatonfured.html','takaritas-balatonlelle.html'] and width in [1440,768,390]:
       for name,selector in [('hero','.subpage-hero'),('steps','.process-timeline'),('details','.why-us-detailed .content-blocks')]:
        await page.locator(selector).screenshot(path=str(ARTIFACT/f'{label}-{file[:-5]}-{name}-{width}.png'),style='#nav,.theme-toggle{visibility:hidden!important}')
      results.append(result)
      for error in result['errors']:issues.append({'file':file,'width':width,'error':error})
     if len(results)%120==0:print('Measured viewports:',len(results),flush=True)
    except Exception as e:issues.append({'file':file,'error':str(e)})
    finally:await page.close()
  await asyncio.gather(*(visit(file) for file in pages))
  await browser.close()
 report={'pages':len(pages),'viewports':len(results),'widths':widths,'fourCardChecks':sum(r['grids'] for r in results),'issues':issues,'results':results}
 (ARTIFACT/(f'{label}-audit.json' if label.startswith('regional') else 'service-hero-audit.json' if label=='services' else 'layout-audit.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps({'pages':len(pages),'viewports':len(results),'fourCardChecks':report['fourCardChecks'],'issueCount':len(issues),'first':issues[:12]},ensure_ascii=False),flush=True)
 return bool(issues)

if label in ['audit','services'] or label.startswith('regional'):sys.exit(asyncio.run(audit()))

async def mattress_audit():
 files=[f.name for f in sorted(OUT.parent.glob('matractisztitas-*.html')) if 'matrac-choose__cards' in f.read_text('utf-8')]
 widths=[1920,1440,1024,768,390,320]
 if label=='mattress-before':files=['matractisztitas-gyor.html','matractisztitas-paks.html'];widths=[1440]
 results=[];issues=[];semaphore=asyncio.Semaphore(4)
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True)
  context=await browser.new_context(reduced_motion='reduce')
  async def route_request(route):
   if any(host in route.request.url for host in ['127.0.0.1:8089','fonts.googleapis.com','fonts.gstatic.com']):await route.continue_()
   else:await route.abort()
  await context.route('**/*',route_request)
  async def visit(file):
   async with semaphore:
    page=await context.new_page()
    try:
     await page.goto(BASE+file,wait_until='networkidle')
     await page.evaluate('document.fonts.ready')
     for width in widths:
      await page.set_viewport_size({'width':width,'height':1000})
      await page.locator('.matrac-choose').scroll_into_view_if_needed()
      await page.wait_for_function("()=>[...document.querySelectorAll('.mc-ba img')].every(e=>e.complete&&e.naturalWidth>0)")
      await page.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
      result=await page.evaluate('''()=>{
       const grid=document.querySelector('.matrac-choose__cards'),box=grid.getBoundingClientRect(),cards=[...grid.children],rects=cards.map(e=>e.getBoundingClientRect()),errors=[];
       if(cards.length!==4)errors.push('Expected four cards');
       rects.forEach((r,i)=>{
        if(Math.abs(r.left-box.left)>1||Math.abs(r.width-box.width)>1)errors.push('Card does not fill its column');
        if(i&&r.top<rects[i-1].bottom)errors.push('Cards are not vertically stacked');
        if(r.left<0||r.right>innerWidth)errors.push('Card outside viewport');
       });
       grid.querySelectorAll('h3,p').forEach(el=>{
        const r=el.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(el);
        if([...range.getClientRects()].some(t=>t.left<r.left-2||t.right>r.right+2))errors.push('Text overflows: '+el.innerText);
       });
       const slider=document.querySelector('.mc-ba'),r=slider.getBoundingClientRect();
       if(r.width<250||r.height<150||r.left<0||r.right>innerWidth)errors.push('Comparison image collapsed or outside viewport');
       return {errors,columns:getComputedStyle(grid).gridTemplateColumns,cardWidth:box.width,imageWidth:r.width};
      }''')
      result.update(file=file,width=width);results.append(result)
      issues.extend({'file':file,'width':width,'error':e} for e in result['errors'])
      if file in ['matractisztitas-gyor.html','matractisztitas-paks.html'] and width in [1440,390]:
       await page.locator('.matrac-choose').screenshot(path=str(ARTIFACT/f'{label}-{file[:-5]}-{width}.png'),style='#nav,.theme-toggle{visibility:hidden!important}')
    except Exception as e:issues.append({'file':file,'error':str(e)})
    finally:await page.close()
  await asyncio.gather(*(visit(file) for file in files))
  await browser.close()
 report={'pages':len(files),'viewports':len(results),'issues':issues,'results':results}
 (ARTIFACT/f'{label}-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps({'pages':len(files),'viewports':len(results),'issueCount':len(issues),'first':issues[:8]},ensure_ascii=False))
 return bool(issues)

if label.startswith('mattress'):sys.exit(asyncio.run(mattress_audit()))

if label=='health':
 results=[]
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True)
  context=browser.new_context(reduced_motion='reduce')
  context.route('**/*',lambda route: route.continue_() if any(host in route.request.url for host in ['127.0.0.1:8089','fonts.googleapis.com','fonts.gstatic.com']) else route.abort())
  for file in ['index.html','karpittisztitas-gyor.html','karpittisztitas-paks.html']:
   page=context.new_page()
   page.goto(BASE+file,wait_until='networkidle')
   page.evaluate('document.fonts.ready')
   for width in [1440,768,390]:
    page.set_viewport_size({'width':width,'height':1000})
    page.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
    button=page.locator('.ba-cta-inline').first
    button.scroll_into_view_if_needed()
    page.mouse.move(0,0)
    normal=button.evaluate('e=>getComputedStyle(e).color')
    button.hover()
    hover=button.evaluate('e=>getComputedStyle(e).color')
    button.focus()
    focus=button.evaluate('e=>getComputedStyle(e).color')
    assert normal==hover==focus=='rgb(255, 255, 255)', (file,width,normal,hover,focus)
    if file=='karpittisztitas-gyor.html' and width==1440:
     button.screenshot(path=str(ARTIFACT/'health-call-button.png'))
    result={'file':file,'width':width,'buttonColors':[normal,hover,focus]}
    photo=page.locator('.atkairtas-image img')
    if photo.count():
     photo.scroll_into_view_if_needed()
     page.wait_for_function("() => {const e=document.querySelector('.atkairtas-image img');return e.complete&&e.naturalWidth>0;}")
     photo.evaluate('e=>e.decode()')
     metrics=photo.evaluate('''e=>{
      const box=e.getBoundingClientRect(),frame=e.parentElement.getBoundingClientRect(),layout=e.closest('.atkairtas-layout').getBoundingClientRect(),cards=e.closest('.atkairtas-layout').querySelector('.atkairtas-cards').getBoundingClientRect(),style=getComputedStyle(e);
      return {width:box.width,height:box.height,naturalWidth:e.naturalWidth,naturalHeight:e.naturalHeight,frameWidth:frame.width,frameHeight:frame.height,belowCards:box.top>=cards.bottom,besideCards:box.left>=cards.right&&Math.abs(box.top-cards.top)<1,objectFit:style.objectFit,borderRadius:style.borderRadius,inViewport:box.left>=0&&box.right<=innerWidth};
     }''')
     assert abs(metrics['width']/metrics['height']-metrics['naturalWidth']/metrics['naturalHeight'])<.002, (file,width,metrics)
     assert abs(metrics['width']-metrics['frameWidth'])<1, (file,width,metrics)
     assert abs(metrics['height']-metrics['frameHeight'])<1, (file,width,metrics)
     assert metrics['besideCards' if width>760 else 'belowCards'], (file,width,metrics)
     assert metrics['inViewport'] and metrics['objectFit']=='contain' and metrics['borderRadius']=='0px', (file,width,metrics)
     result['image']=metrics
     if file=='karpittisztitas-gyor.html' and width in [1440,390]:
      page.locator('.why-us').filter(has=photo).screenshot(path=str(ARTIFACT/f'health-section-{width}.png'))
    results.append(result)
   page.close()
  browser.close()
 (ARTIFACT/'health-probe.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps({'passed':len(results),'imageChecks':sum('image' in r for r in results),'results':results},ensure_ascii=False))
 sys.exit(0)

samples=[('index.html',2560),('karpittisztitas-gyor.html',2560),('karpittisztitas-paks.html',2560),('karpittisztitas-gyor.html',1440),('karpittisztitas-gyor.html',1024),('matractisztitas-mosonmagyarovar.html',390),('karpittisztitas-gyor.html',320),('karpittisztitas-elotte-utana.html',320),('karpittisztitas-matractisztitas.html',2560),('karpittisztitas-paks.html',768)]
if label=='cards':samples=[('karpittisztitas-gyor.html',1440)]
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 context=browser.new_context(reduced_motion='reduce')
 context.route('**/*',lambda route: route.continue_() if any(host in route.request.url for host in ['127.0.0.1:8089','fonts.googleapis.com','fonts.gstatic.com']) else route.abort())
 for file,width in samples:
  page=context.new_page()
  page.set_viewport_size({'width':width,'height':1000})
  page.goto(BASE+file,wait_until='networkidle')
  page.evaluate('document.fonts.ready')
  result=page.evaluate('''() => {
   const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};
   const h=document.querySelector('h1'),copy=h.closest('.subpage-hero-content,.eco-hero__copy,.hero-content'),style=getComputedStyle(copy);
   const walker=document.createTreeWalker(h,NodeFilter.SHOW_TEXT);let node;while((node=walker.nextNode())&&!node.textContent.trim()){};const range=document.createRange();range.selectNodeContents(node);
   return {h1:{text:h.innerText,rect:rect(h),scrollWidth:h.scrollWidth,font:getComputedStyle(h).fontSize,fontEmBox:rect(range),overflow:getComputedStyle(h).overflow},copy:{rect:rect(copy),padding:style.padding},grids:[...document.querySelectorAll('[class*="grid"],.subpage-hero-trust')].filter(el=>el.children.length===4 && getComputedStyle(el).display==='grid').map(el=>({class:el.className,columns:getComputedStyle(el).gridTemplateColumns,rect:rect(el),items:[...el.children].map(rect)}))};
  }''')
  result.update(file=file,width=width);results.append(result)
  page.screenshot(path=str(ARTIFACT/f'{label}-{file[:-5]}-{width}.png'))
  if file=='karpittisztitas-gyor.html' and width==1440:page.locator('.why-us-grid').first.screenshot(path=str(ARTIFACT/f'{label}-four-cards-1440.png'))
  page.close()
 browser.close()
(ARTIFACT/f'{label}-probe.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps([{'file':r['file'],'width':r['width'],'heading':r['h1'],'padding':r['copy']['padding']} for r in results],ensure_ascii=False))
