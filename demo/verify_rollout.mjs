import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(path.join(process.env.TEMP,'ecoclean-demo-qa','package.json'));
const {JSDOM,VirtualConsole}=require('jsdom');
const out=path.dirname(fileURLToPath(import.meta.url)),root=path.dirname(out);
const inventory=JSON.parse(fs.readFileSync(path.join(out,'rollout/inventory.json'),'utf8'));
const issues=[],counts={pages:0,links:0,assets:0,headings:0,paragraphs:0,runtime:0,faq:0,menus:0,sliders:0};
const check=(condition,file,message)=>{if(!condition)issues.push({file,message});};
const txt=e=>e.textContent.replace(/\s+/g,' ').trim();
const list=(d,selector)=>[...d.querySelectorAll(selector)].map(txt);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const read=(base,file)=>fs.readFileSync(path.join(base,file),'utf8');
const filePart=url=>decodeURIComponent(url.split(/[?#]/)[0]);
const local=url=>url&&!/^(https?:|\/\/|data:|tel:|mailto:|#|javascript:)/i.test(url);
const staticLog=new VirtualConsole();
function visibleText(doc){const c=doc.body.cloneNode(true);c.querySelectorAll('script,style,.subpage-editorial,#themeToggle,.theme-toggle').forEach(e=>e.remove());return txt(c);}
for(const rec of inventory){
  const file=rec.file,raw=fs.readFileSync(path.join(root,file));
  check(crypto.createHash('sha256').update(raw).digest('hex')===rec.sha256,file,'Production source changed');
  if(rec.family==='homepage')continue;
  const sourceDom=new JSDOM(raw.toString('utf8'),{virtualConsole:staticLog}),targetDom=new JSDOM(read(out,file),{virtualConsole:staticLog});
  const s=sourceDom.window.document,d=targetDom.window.document;
  counts.pages++;
  check(visibleText(s)===visibleText(d),file,'Original visible text changed');
  check(same(list(s,'h1,h2,h3,h4,h5,h6'),list(d,'h1,h2,h3,h4,h5,h6')),file,'Heading parity');counts.headings+=s.querySelectorAll('h1,h2,h3,h4,h5,h6').length;
  check(same(list(s,'p'),list(d,'p')),file,'Paragraph parity');counts.paragraphs+=s.querySelectorAll('p').length;
  const sections=x=>[...x.querySelectorAll('section')].map(e=>[e.id,e.className]);
  check(same(sections(s),sections(d)),file,'Section order/classes');
  check(same(list(s,'header a,nav a,.nav a,.nav-mobile a'),list(d,'header a,nav a,.nav a,.nav-mobile a')),file,'Navigation label parity');
  const schemas=x=>[...x.querySelectorAll('script[type="application/ld+json"]')].map(e=>e.textContent.trim());
  check(same(schemas(s),schemas(d)),file,'Structured data changed');
  for(const sel of ['meta[name="description"]','link[rel="canonical"]','meta[property="og:title"]','meta[property="og:image"]'])check(s.querySelector(sel)?.outerHTML===d.querySelector(sel)?.outerHTML,file,'Metadata changed: '+sel);
  check(d.querySelector('meta[name="robots"]')?.content==='noindex, nofollow',file,'Missing demo noindex');
  for(const a of d.querySelectorAll('a[href]')){
    const url=a.getAttribute('href');counts.links++;
    if(local(url)){
      const target=path.resolve(out,filePart(url));check(fs.existsSync(target),file,'Missing link: '+url);
      if(url.includes('.html'))check(path.dirname(target)===out,file,'HTML link escapes demo: '+url);
    }else if(url.startsWith('#')&&url!=='#')check(Boolean(d.getElementById(decodeURIComponent(url.slice(1)))),file,'Missing anchor: '+url);
  }
  for(const el of d.querySelectorAll('img[src],script[src],link[rel="stylesheet"],link[rel="icon"],[data-full]')){
    const url=el.getAttribute('data-full')||el.getAttribute('src')||el.getAttribute('href');counts.assets++;
    if(local(url))check(fs.existsSync(path.resolve(out,filePart(url))),file,'Missing asset: '+url);
  }
  for(const el of d.querySelectorAll('.ba-img-before,.ba-img-after,.mc-ba__before,.mc-ba__after,.matrac-why__imgbtn img')){
    const id=el.className.split(/\s+/).filter(Boolean).map(x=>'.'+x).join('');
    const orig=id?s.querySelector(id):null;if(orig&&orig.src)check(path.basename(filePart(orig.getAttribute('src')))===path.basename(filePart(el.getAttribute('src'))),file,'Genuine comparison/microscopy image changed');
  }
  sourceDom.window.close();targetDom.window.close();
}
fs.writeFileSync(path.join(out,'rollout/static-audit.json'),JSON.stringify({counts,issues},null,2));
console.log('Static audit: '+JSON.stringify({counts,issues:issues.length,first:issues.slice(0,8)}));
if(process.argv.includes('--static'))process.exitCode=issues.length?1:0;
else {
  for(const rec of inventory.filter(x=>!['homepage','redirect'].includes(x.family))){
    const file=rec.file,errors=[],requests=[];
    let html=read(out,file).replace(/<script\b([^>]*?)src="([^"]+)"([^>]*)><\/script>/g,(all,before,src)=>{
      if(!local(src))return '';
      return '<script>'+read(out,filePart(src)).replace(/<\/script/gi,'<\\/script')+'</script>';
    });
    const log=new VirtualConsole();log.on('jsdomError',e=>{if(e.type!=='css parsing'&&e.type!=='not implemented')errors.push(e.message);});
    const dom=new JSDOM(html,{url:'http://localhost:8089/demo/'+file,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:log,beforeParse(w){
      w.matchMedia=()=>({matches:true,addEventListener(){}});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLElement.prototype.scrollBy=function(args){this.scrollLeft+=args.left;};
      w.IntersectionObserver=class{observe(){}unobserve(){}disconnect(){}};
      w.fetch=async(url,options)=>{requests.push({url,options});throw Error('Simulated offline');};
      w.AbortSignal.timeout=()=>new w.AbortController().signal;w.alert=()=>{};
      w.localStorage.setItem('ecoclean-demo-theme','dark');w.localStorage.setItem('ecoclean-theme','dark');
    }});
    const w=dom.window,d=w.document;
    if(d.readyState==='loading')await new Promise(resolve=>d.addEventListener('DOMContentLoaded',resolve,{once:true}));
    await new Promise(resolve=>setTimeout(resolve,25));counts.runtime++;
    check(root!==null&&d.documentElement.dataset.theme==='light',file,'Default light palette');
    check(!d.querySelector('#themeToggle,.theme-toggle'),file,'Theme toggle removed');
    check(d.querySelectorAll('.faq-question').length>=d.querySelectorAll('.faq-item').length,file,'Every FAQ item has a control');
    for(const q of d.querySelectorAll('.faq-question')){
      if(!q.closest('.faq-item')?.querySelector('.faq-answer'))continue;
      q.click();check(q.getAttribute('aria-expanded')==='true',file,'FAQ opens');q.click();check(q.getAttribute('aria-expanded')==='false',file,'FAQ closes');counts.faq++;
    }
    const toggle=d.querySelector('.nav-mobile-toggle,.bixol-mobile-hamburger');
    if(toggle){toggle.click();check(toggle.getAttribute('aria-expanded')==='true',file,'Mobile menu opens');d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));check(toggle.getAttribute('aria-expanded')==='false',file,'Mobile menu closes');counts.menus++;}
    for(const trigger of d.querySelectorAll('.nav-item[data-menu]')){
      trigger.click();check(d.getElementById('megaMenuContainer').classList.contains('active'),file,'Mega menu opens');
      for(const city of d.querySelectorAll('.mega-city'))check(fs.existsSync(path.resolve(out,filePart(city.getAttribute('href')))),file,'Dynamic city link: '+city.getAttribute('href'));
      d.getElementById('megaMenuCloseBtn')?.click();counts.menus++;
    }
    for(const trigger of d.querySelectorAll('.desktop-menu .has-submenu>a')){trigger.click();check(trigger.getAttribute('aria-expanded')==='true',file,'Regional dropdown opens');trigger.click();check(trigger.getAttribute('aria-expanded')==='false',file,'Regional dropdown closes');counts.menus++;}
    for(const slider of d.querySelectorAll('[role="slider"]')){
      slider.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));check(slider.getAttribute('aria-valuenow')==='55',file,'Comparison keyboard movement');
      slider.dispatchEvent(new w.KeyboardEvent('keydown',{key:'End',bubbles:true}));check(slider.getAttribute('aria-valuenow')==='100',file,'Comparison End');
      slider.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Home',bubbles:true}));check(slider.getAttribute('aria-valuenow')==='0',file,'Comparison Home');counts.sliders++;
      slider.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));check(slider.getAttribute('aria-valuenow')==='5',file,'Comparison moves away from zero');
    }
    for(const slider of d.querySelectorAll('.before-after-slider input[type="range"]')){slider.value='75';slider.dispatchEvent(new w.Event('input'));check(slider.parentElement.querySelector('.after-image').style.clipPath==='inset(0 25% 0 0)',file,'Native comparison range');check(slider.parentElement.style.getPropertyValue('--slider-position')==='75%',file,'Native comparison handle');counts.sliders++;}
    for(const counter of d.querySelectorAll('.trust-number[data-target]'))check(counter.textContent.trim()!=='0',file,'Counters reach source targets');
    const microscope=d.querySelector('.matrac-why__imgbtn');
    if(microscope){microscope.click();const modal=d.querySelector('.matrac-why__modal');check(modal.classList.contains('open'),file,'Microscopy opens');check(fs.existsSync(path.resolve(out,filePart(modal.querySelector('img').getAttribute('src')))),file,'Microscopy full image resolves');d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));check(!modal.classList.contains('open'),file,'Microscopy closes');}
    if(rec.family==='gallery'){
      const tiles=()=>d.querySelectorAll('.gal-tile');check(tiles().length>0,file,'Gallery initially rendered');const initial=tiles().length;
      d.getElementById('galLoadMoreBtn').click();check(tiles().length>initial,file,'Gallery load more');
      d.querySelectorAll('#galFilter button').forEach(button=>{button.click();check(tiles().length>0,file,'Gallery category '+button.textContent);});
      tiles()[0].click();check(d.getElementById('lightbox').classList.contains('open'),file,'Gallery lightbox opens');const img=d.getElementById('lbImg'),first=img.src;d.getElementById('lbNext').click();check(img.src!==first,file,'Gallery next photo');d.getElementById('lbPrev').click();check(img.src===first,file,'Gallery previous photo');d.getElementById('lbClose').click();check(!d.getElementById('lightbox').classList.contains('open'),file,'Gallery lightbox closes');
    }
    check(errors.length===0,file,'Runtime errors: '+errors.join('; '));
    check(requests.every(r=>!r.options?.method||r.options.method==='GET'),file,'Unexpected write request');
    check(requests.every(r=>String(r.url).includes('reviews')),file,'Unexpected service request');
    dom.window.close();
    if(counts.runtime%30===0)console.log('Runtime checked: '+counts.runtime);
  }
  fs.writeFileSync(path.join(out,'rollout/verification.json'),JSON.stringify({date:'2026-09-07',method:'JSDOM, no browser rendering',counts,issues},null,2));
  console.log(JSON.stringify({counts,issues:issues.length,first:issues.slice(0,15)},null,2));process.exitCode=issues.length?1:0;
}
