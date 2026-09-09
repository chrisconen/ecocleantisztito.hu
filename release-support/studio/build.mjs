import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {createStudioTransformer} from '../../demo/studio/transform.mjs';
const dir=import.meta.dirname,root=path.resolve(dir,'../..'),out=path.join(root,'release'),studio=path.join(root,'demo/studio');
const require=createRequire(path.join(process.env.TEMP,'ecoclean-demo-qa/package.json')),{JSDOM}=require('jsdom');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const manifestPath=path.join(root,'release-support/release-manifest.json');
const currentBytes=fs.readFileSync(manifestPath),current=JSON.parse(currentBytes);
const write=process.argv.includes('--write');
const baselineBytes=current.studioOverlay?fs.readFileSync(path.join(dir,'baseline-manifest.json')):currentBytes;
const baseline=JSON.parse(baselineBytes);
const verificationBytes=current.studioOverlay?fs.readFileSync(path.join(dir,'baseline-verification.json')):fs.readFileSync(path.join(root,'release-support/release-verification.json'));
const verification=JSON.parse(verificationBytes);
if(baseline.studioOverlay||verification.issues.length||verification.manifestSha256!==sha(baselineBytes))throw Error('Unverified parent release');
const targets=JSON.parse(fs.readFileSync(path.join(studio,'targets.json'))).filter(t=>t.service==='karpittisztitas');
if(targets.length!==26)throw Error('Unexpected online upholstery scope');
const input=file=>{const b=fs.readFileSync(current.studioOverlay?path.join(dir,'baseline',file):path.join(out,file));if(sha(b)!==baseline.files[file]?.sha256)throw Error('Baseline mismatch '+file);return b;};
const updates=new Map(),originals=new Map(),evidence=[];
const dependencies=new Map(),sources=[];
function source(file){const data=fs.readFileSync(path.join(root,file));sources.push({path:file,sha256:sha(data)});return data;}
const assets=JSON.parse(source('demo/studio/asset-manifest.json'));
for(const file of ['design.css','handoff.css','configurator.js','interactions.js','booking-handoff.js',...assets.map(a=>'assets/'+a.file)]){
 const name='studio/'+file,data=source('demo/'+name);
 if(file.startsWith('assets/')&&sha(data)!==assets.find(a=>a.file===path.basename(file)).sha256)throw Error('Studio image changed: '+file);
 if(baseline.files[name])throw Error('Studio dependency collides with existing file '+name);
 dependencies.set(name,data);
}
for(const file of ['transform.mjs','targets.json'])source('demo/studio/'+file);
source('release-support/studio/build.mjs');
const ref=fs.readFileSync(path.join(out,'karpittisztitas-kalocsa.html'));
if(sha(ref)!==baseline.files['karpittisztitas-kalocsa.html'].sha256)throw Error('Regional reference changed');
const transformer=createStudioTransformer(ref.toString('utf8'));
function version(url){return dependencies.has(url)?url+'?v='+sha(dependencies.get(url)).slice(0,12):url;}
for(const target of targets){
 const before=input(target.file);originals.set(target.file,before);
 const rendered=transformer.render(before,target),dom=new JSDOM(rendered.html),d=dom.window.document;
 if(!d.body.classList.contains('eco-site')||d.querySelector('meta[content*="noindex"]'))throw Error('Production mode lost');
 for(const el of d.querySelectorAll('script[src],link[href]')){const attr=el.hasAttribute('src')?'src':'href';el.setAttribute(attr,version(el.getAttribute(attr)));}
 const hero=d.querySelector('.editorial-hero-photo');
 for(const attr of ['og:image','twitter:image']){const el=d.querySelector(`meta[property="${attr}"],meta[name="${attr}"]`);if(el)el.content='https://ecocleantisztito.hu/'+hero.getAttribute('src');}
 const heroAlt=d.querySelector('meta[property="og:image:alt"]');if(heroAlt)heroAlt.content=hero.alt;
 // Keep the material CTA and app targeting the new local calculator.
 if(d.querySelector('[data-material-app]')?.dataset.next!=='#studio-kalkulator')throw Error('Material guide continuation not connected');
 updates.set(target.file,Buffer.from(dom.serialize()));evidence.push(rendered.evidence);dom.window.close();
}
transformer.close();
const home=input('index.html');originals.set('index.html',home);
const handoff='<!-- ECO-STUDIO:handoff:START --><link rel="stylesheet" href="'+version('studio/handoff.css')+'"><script defer src="'+version('studio/configurator.js')+'"></script><script defer src="'+version('studio/booking-handoff.js')+'"></script><!-- ECO-STUDIO:handoff:END -->';
if(home.includes('ECO-STUDIO:handoff')||!home.includes('</body>'))throw Error('Unexpected homepage handoff state');
updates.set('index.html',Buffer.from(home.toString('utf8').replace('</body>',handoff+'</body>')));
const overlay={version:1,baseline:{manifest:'release-support/studio/baseline-manifest.json',manifestSha256:sha(baselineBytes),verification:'release-support/studio/baseline-verification.json',verificationSha256:sha(verificationBytes)},pages:[...updates].map(([file,data])=>({file,baseline:'release-support/studio/baseline/'+file,beforeSha256:baseline.files[file].sha256,afterSha256:sha(data)})),dependencies:[...dependencies].map(([file,data])=>({file,sha256:sha(data),bytes:data.length})),sources};
const report={mode:write?'written':'plan',upholsteryPages:targets.length,homeReceiver:true,dependencies:dependencies.size,changedExistingFiles:updates.size,protectedExistingFiles:Object.keys(baseline.files).length-updates.size};
if(write){
 fs.mkdirSync(path.join(dir,'baseline'),{recursive:true});
 fs.writeFileSync(path.join(dir,'baseline-manifest.json'),baselineBytes);fs.writeFileSync(path.join(dir,'baseline-verification.json'),verificationBytes);
 for(const [file,data] of originals)fs.writeFileSync(path.join(dir,'baseline',file),data);
 const manifest=structuredClone(baseline),overlayBytes=JSON.stringify(overlay,null,2)+'\n';
 fs.writeFileSync(path.join(dir,'overlay.json'),overlayBytes);manifest.studioOverlay={path:'release-support/studio/overlay.json',sha256:sha(overlayBytes)};
 for(const [file,data] of [...dependencies,...updates]){const dest=path.join(out,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,data);manifest.files[file]={...(baseline.files[file]||{source:'demo/'+file}),sha256:sha(data),bytes:data.length};}
 fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
 fs.writeFileSync(path.join(dir,'content-evidence.json'),JSON.stringify(evidence,null,2)+'\n');
 fs.writeFileSync(path.join(dir,'build-report.json'),JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify(report));
