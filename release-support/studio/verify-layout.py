"""Studio release/live browser QA. All API requests mocked; external writes blocked."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,urljoin,unquote
from collections import Counter
from playwright.async_api import async_playwright
import argparse,asyncio,hashlib,json,sys
sys.stdout.reconfigure(encoding='utf-8')
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--baseline',type=Path,default=HERE/'baseline');parser.add_argument('--live',action='store_true');parser.add_argument('--base');parser.add_argument('--quick',action='store_true');parser.add_argument('--nav-only',action='store_true');args=parser.parse_args()
BASE=(args.base or ('https://ecocleantisztito.hu/' if args.live else 'http://127.0.0.1:8089/release/')).rstrip('/')+'/'
OUT=HERE/'qa';OUT.mkdir(exist_ok=True)
EXCLUDED={f'karpittisztitas-{city}.html' for city in ['kalocsa','baja','kiskoros','szekszard','paks','solt','dunafoldvar','matractisztitas']}
class OriginalImages(HTMLParser):
 def __init__(self):super().__init__();self.images=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='img' and a.get('src') and 'data-generated-interior' not in a:self.images.append(a['src'])
def original_images(file):
 p=args.baseline/file
 if not p.is_file():raise RuntimeError('Missing current-release baseline: '+str(p))
 scan=OriginalImages();scan.feed(p.read_text('utf-8-sig'));return scan.images
FILES=sorted(p.name for p in args.baseline.glob('karpittisztitas-*.html') if p.name not in EXCLUDED)
if len(FILES)!=26:raise RuntimeError(f'Expected 26 online upholstery baseline pages, found {len(FILES)} in {args.baseline}')
if args.quick or args.nav_only:FILES=['karpittisztitas-gyor.html']
SECTIONS=['#studio-szobak','.med-furniture','#studio-kalkulator','.med-history','.med-value','.med-soil','.med-mites','.med-care','#studio-anyagok','.med-process','.med-closing','#studio-kerdesek','#anyagfelismero']
MEASURE=r'''(sections)=>{
 const issues=[],rect=e=>e.getBoundingClientRect();
 if(document.documentElement.scrollWidth>innerWidth+1)issues.push('Document overflow '+document.documentElement.scrollWidth);
 if(!document.body.classList.contains('eco-studio'))issues.push('Studio body class missing');
 for(const s of sections)if(document.querySelectorAll(s).length!==1)issues.push('Required section count '+s);
 if(document.querySelectorAll('[data-studio-configurator] .med-product').length!==6)issues.push('Six calculator product cards missing');
 if(document.querySelectorAll('h1').length!==1)issues.push('H1 count');
 const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);if(new Set(ids).size!==ids.length)issues.push('Duplicate ids');
 const copy=document.body.cloneNode(true);copy.querySelectorAll('script,style,.eco-material,.eco-novalife-cta').forEach(e=>e.remove());
 if(/[\p{Extended_Pictographic}\uFE0F\u200D]/u.test(copy.textContent.replace(/[©®™]/g,'')))issues.push('Emoji outside material widget');
 const hero=document.querySelector('.subpage-hero .subpage-editorial img,.subpage-hero img[data-generated-interior],.subpage-editorial img');
 if(!hero||!hero.getAttribute('src').split('?')[0].endsWith('studio/assets/l-alaku-kanape-vilagos-nappali.webp'))issues.push('New Studio hero image missing');
 if(hero&&(!hero.alt||!hero.naturalWidth))issues.push('Hero alt or decoded image missing');
 const icons=[...document.querySelectorAll('.studio-icon')];if(icons.length<10)issues.push('Generated Studio icons missing');
 if(icons.some(e=>getComputedStyle(e).backgroundImage==='none'))issues.push('Generated icon atlas CSS absent');
 for(const img of document.images)if(img.getAttribute('src')&&(!img.complete||!img.naturalWidth))issues.push('Missing image '+img.getAttribute('src'));
 for(const img of document.querySelectorAll('img[src*="studio/assets/"]')){if(!img.alt.trim())issues.push('Missing relevant alt '+img.getAttribute('src'));if(img.naturalWidth&&(Number(img.getAttribute('width'))!==img.naturalWidth||Number(img.getAttribute('height'))!==img.naturalHeight))issues.push('Image dimensions '+img.getAttribute('src'));}
 for(const a of document.querySelectorAll('a[href^="#"]')){const id=a.getAttribute('href').slice(1);if(id&&!document.getElementById(decodeURIComponent(id)))issues.push('Missing anchor '+id);}
 for(const el of document.querySelectorAll('section h1,section h2,section h3,section p,section label,section summary,.eco-novalife-cta h3,.eco-novalife-cta p')){
  const b=rect(el);if(!b.width||!b.height)continue;const w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let n;
  while(n=w.nextNode())for(const m of n.textContent.matchAll(/\S+/g)){const r=document.createRange();r.setStart(n,m.index);r.setEnd(n,m.index+m[0].length);if([...r.getClientRects()].some(x=>x.left<b.left-2||x.right>b.right+2))issues.push('Text overflow '+el.className+' '+m[0]);}
 }
 const rows=(s,expected)=>{const e=document.querySelector(s);if(!e){issues.push('Missing grid '+s);return;}const groups=[];for(const b of [...e.children].map(rect).filter(b=>b.width&&b.height)){let row=groups.find(r=>Math.abs(r[0].top-b.top)<2);if(!row){row=[];groups.push(row);}row.push(b);}const counts=groups.map(r=>r.length);if(JSON.stringify(counts)!==JSON.stringify(expected))issues.push(s+' grid '+counts);};
 rows('.med-config-products',innerWidth>900?[3,3]:innerWidth>680?[2,2,2]:[1,1,1,1,1,1]);
 rows('.med-furniture-grid',innerWidth>900?[3,3]:innerWidth>680?[2,2,2]:[1,1,1,1,1,1]);
 rows('.med-process-grid',innerWidth>1199?[4]:innerWidth>680?[2,2]:[1,1,1,1]);
 if(document.querySelector('.subpage-hero-trust'))rows('.subpage-hero-trust',innerWidth>900?[4]:[2,2]);
 const mite=document.querySelector('.med-mites-grid');if(mite){const boxes=[...mite.children].map(rect);if(innerWidth>680&&boxes.length>1&&Math.abs(boxes[0].left-boxes[1].left)<10)issues.push('Mite text and image not side by side');}
 for(const img of document.querySelectorAll('.med-zoom-image img'))if(img.getClientRects().length&&getComputedStyle(img).objectFit!=='contain')issues.push('Mite image cropped');
 return {issues:[...new Set(issues)],height:document.documentElement.scrollHeight,h1:document.querySelector('h1')?.innerText,hero:hero?.getAttribute('src'),products:document.querySelectorAll('[data-studio-configurator] .med-product').length,icons:icons.length};
}'''
async def main():
 issues=[];writes=[];results=[];interactions=[];originals=[];api_gets=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True);context=await browser.new_context(reduced_motion='reduce')
  async def route(r):
   u=urlsplit(r.request.url)
   if r.request.method not in ('GET','HEAD'):writes.append(r.request.url);await r.abort();return
   if '/api/' in u.path:
    api_gets.append(r.request.url);await r.fulfill(json={'enabled':True,'ready':False,'collection_enabled':False},headers={'Access-Control-Allow-Origin':urlsplit(BASE).scheme+'://'+urlsplit(BASE).netloc});return
   if u.netloc in (urlsplit(BASE).netloc,'fonts.googleapis.com','fonts.gstatic.com'):await r.continue_()
   else:await r.abort()
  await context.route('**/*',route)
  for file in FILES:
   page=await context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   try:
    response=await page.goto(urljoin(BASE,file),wait_until='networkidle');assert response and response.ok,f'Page HTTP {response.status if response else "missing"}'
    await page.locator('[data-studio-configurator] .med-product').nth(5).wait_for(state='attached',timeout=12000)
    await page.evaluate("document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager')")
    await page.evaluate("Promise.all([...document.images].filter(i=>i.getAttribute('src')).map(i=>i.decode().catch(()=>{})))");await page.evaluate('document.fonts.ready')
    atlas=await page.evaluate(r'''async()=>{const e=document.querySelector('.studio-icon');if(!e)return false;const url=getComputedStyle(e).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1];if(!url)return false;const i=new Image();i.src=url;try{await i.decode();return i.naturalWidth>0;}catch{return false;}}''');assert atlas,'Generated icon atlas image failed to decode'
    for width in ([1440] if args.nav_only else [320,390,768,1440]+([1920] if file=='karpittisztitas-gyor.html' else [])):
     await page.set_viewport_size({'width':width,'height':1000});await page.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
     measured=await page.evaluate(MEASURE,SECTIONS);measured.update(file=file,width=width);results.append(measured);issues.extend({'file':file,'width':width,'error':e} for e in measured['issues'])
     if file=='karpittisztitas-gyor.html' and width in (320,390,1440,1920):
      prefix=('live-' if args.live else 'local-')+file[:-5];await page.evaluate('scrollTo(0,0)');await page.screenshot(path=str(OUT/f'{prefix}-hero-{width}.png'))
      if width in (390,1440):
       for label,selector in [('config','#studio-kalkulator'),('mattress-card','[data-group=mattress]'),('soil','.med-soil'),('mites','.med-mites'),('rooms','#studio-szobak'),('novalife','.eco-novalife-cta')]:await page.locator(selector).first.screenshot(path=str(OUT/f'{prefix}-{label}-{width}.png'),style='.nav{visibility:hidden!important}')
    if args.nav_only:
     nav=await page.locator('.nav-cta a[href*="berles"] .studio-icon').evaluate('e=>({filter:getComputedStyle(e).filter,blend:getComputedStyle(e).mixBlendMode,background:getComputedStyle(e).backgroundImage,width:e.getBoundingClientRect().width})')
     assert 'invert' not in nav['filter'] and 'grayscale' in nav['filter'] and nav['blend']=='multiply' and nav['width']>0,'Rental icon contrast rule'
     interactions.append({'file':file,'passed':True,'navContrast':nav});await page.close();continue
    reference=Counter(unquote(urljoin(urljoin(BASE,file),src)) for src in original_images(file));actual=Counter(unquote(src) for src in await page.locator('img[src]').evaluate_all('(els)=>els.map(e=>e.src)'))
    lost=list((reference-actual).elements());originals.append({'file':file,'originalImageCount':sum(reference.values()),'missing':lost})
    issues.extend({'file':file,'error':'Original reference image lost '+src} for src in lost)
    guide=page.locator('[data-extra-guide]');assert await guide.count()==1,'Mattress wet-cleaning guide missing';guide_target=await guide.get_attribute('href');extra=page.locator('[data-extra=matrac_nedves_tisztitas]');guide_cases=[]
    assert await page.locator('.studio-tariff-note').count()==0,'Removed tariff note remains';assert 'Atkairtás' in await page.locator('[data-group=sofa] .med-product-options').inner_text(),'Sofa extra copy'
    for with_mattress in (False,True):
     if with_mattress:await page.locator('[data-group=mattress] [data-delta="1"]').click()
     before=await page.locator('.med-config-total').inner_text();assert not await extra.is_checked(),'Unexpected initial wet-cleaning selection';await guide.click()
     await page.wait_for_function('id=>document.activeElement.id===id',arg=guide_target[1:]);box=await page.locator(guide_target).bounding_box();assert box and box['y']>=0 and box['y']+box['height']<=await page.evaluate('innerHeight'),'Guide target not scrolled into view'
     assert not await extra.is_checked(),'Guide selected wet-cleaning extra';assert await page.locator('.med-config-total').inner_text()==before,'Guide changed amount';guide_cases.append({'withMattress':with_mattress,'totalUnchanged':before,'focusedTarget':guide_target})
    await page.locator('[data-reset]').click()
    await page.locator('[data-compare] input[type=range]').fill('70');await page.locator('[data-compare] input[type=range]').dispatch_event('input');assert await page.locator('[data-compare]').evaluate('e=>e.style.getPropertyValue("--reveal")')=='70%','History slider'
    await page.locator('#studio-kerdesek .med-faq-item').nth(1).locator('summary').focus();await page.keyboard.press('Enter');assert await page.locator('#studio-kerdesek .med-faq-item').nth(1).get_attribute('open') is not None,'Care FAQ keyboard'
    await page.locator('[data-room-tab=living]').click();await page.locator('[data-room-tab=living]').press('ArrowRight');assert await page.locator('#room-dining').is_visible(),'Room keyboard'
    await page.locator('#room-dining [data-config-focus]').click();assert await page.locator('[data-group=dining] button[data-delta="1"]').is_visible(),'Room to calculator'
    await page.locator('[data-mite-tab=sofa]').click();await page.locator('[data-mite-tab=sofa]').press('ArrowRight');assert await page.locator('#mite-mattress').is_visible(),'Mite keyboard'
    await page.locator('#mite-mattress [data-zoom]').click();assert await page.locator('.med-image-dialog').is_visible(),'Zoom dialog';await page.keyboard.press('Escape');assert not await page.locator('.med-image-dialog').is_visible(),'Zoom escape'
    await page.locator('.med-hotspot-tabs [data-hotspot="2"]').click();assert 'ülőlap' in (await page.locator('#med-hotspot-detail h3').inner_text()).lower(),'Soil hotspot'
    await page.locator('.studio-material').nth(1).locator('summary').click();assert await page.locator('.studio-material').nth(1).get_attribute('open') is not None,'Material details'
    await page.locator('[data-group=sofa] [data-delta="1"]').click();assert await page.locator('[data-group=sofa] [data-count]').inner_text()=='1 db','Product count';link=page.locator('[data-booking-handoff]');assert await link.get_attribute('aria-disabled')=='false','Handoff enabled'
    href=await link.get_attribute('href');assert urlsplit(href).path.endswith('index.html') and urlsplit(href).fragment.startswith('booking?eco-config='),'Booking route'
    decoded=await page.evaluate('hash=>EcoStudioConfig.decode(hash)','#'+urlsplit(href).fragment);assert decoded['sourcePage']==file and decoded['city']==file.removeprefix('karpittisztitas-').removesuffix('.html'),'Handoff city/source';assert any(i['id']=='karpit_szofa' and i['count']==1 for i in decoded['items']),'Handoff selected item'
    await page.set_viewport_size({'width':390,'height':900});await page.locator('.nav-mobile-toggle').click();assert await page.locator('.nav-mobile-toggle').get_attribute('aria-expanded')=='true','Mobile menu'
    menu=await page.locator('.nav-mobile').inner_text();assert not any(c in menu for c in ['🏠','🛋','🛏','📍','📅','📞']),'Dynamic mobile emoji';await page.keyboard.press('Escape');assert await page.locator('.nav-mobile-toggle').get_attribute('aria-expanded')=='false','Menu escape'
    await page.locator('[data-reset]').click();assert await page.locator('[data-booking-handoff]').get_attribute('aria-disabled')=='true','Reset calculator'
    interactions.append({'file':file,'passed':True,'mattressGuide':guide_cases})
   except Exception as e:issues.append({'file':file,'error':str(e)})
   issues.extend({'file':file,'error':'JS '+e} for e in errors);await page.close()
   print(json.dumps({'checked':len(interactions),'file':file,'issuesSoFar':len(issues)}),flush=True)
  await browser.close()
 report={'base':BASE,'pages':len(FILES),'viewports':len(results),'issues':issues,'blockedWrites':writes,'liveProcessingCalls':0,'mockedApiGets':len(api_gets),'interactions':interactions,'originalPhotos':originals,'results':results,'baselineHashes':{f:hashlib.sha256((args.baseline/f).read_bytes()).hexdigest() for f in FILES}}
 (OUT/(('live-' if args.live else '')+'nav-contrast.json' if args.nav_only else 'live-layout.json' if args.live else 'quick-layout.json' if args.quick else 'layout.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({k:report[k] for k in ('pages','viewports','issues','blockedWrites')},ensure_ascii=False));raise SystemExit(bool(issues or writes))
asyncio.run(main())
