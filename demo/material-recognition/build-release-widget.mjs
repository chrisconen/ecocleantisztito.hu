/* Widget-only production overlay. Default: plan; --write applies the reviewed plan. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {integrateMaterialRecognition} from './component.mjs';
const require=createRequire(path.join(process.env.TEMP,'ecoclean-demo-qa/package.json'));
const {JSDOM}=require('jsdom');
const workspace=path.resolve(import.meta.dirname,'../..'),release=path.join(workspace,'release');
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
const write=process.argv.includes('--write');
const support=path.join(workspace,'release-support'),manifestPath=path.join(support,'release-manifest.json');
const currentManifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const baselineDir=path.join(support,'material-widget-baseline');
const baselineManifestBytes=currentManifest.widgetOverlay?fs.readFileSync(path.join(baselineDir,'release-manifest.json')):fs.readFileSync(manifestPath);
const baseline=JSON.parse(baselineManifestBytes);
const baselineReportBytes=currentManifest.widgetOverlay?fs.readFileSync(path.join(baselineDir,'release-verification.json')):fs.readFileSync(path.join(support,'release-verification.json'));
const baselineReport=JSON.parse(baselineReportBytes);
if(baseline.widgetOverlay||baselineReport.issues?.length||baselineReport.manifestSha256!==sha(baselineManifestBytes))throw Error('Baseline is not an exactly verified original release');
let medBytes=currentManifest.widgetOverlay?fs.readFileSync(path.join(baselineDir,'mediterranean-manifest.json')):fs.readFileSync(path.join(workspace,'demo/mediterranean/manifest.json'));
if(sha(medBytes)!==baseline.approvedMediterranean.manifestSha256)medBytes=execFileSync('git',['show','HEAD:demo/mediterranean/manifest.json'],{cwd:workspace});
if(sha(medBytes)!==baseline.approvedMediterranean.manifestSha256)throw Error('Historical Mediterranean approval snapshot not found');
const excluded=new Set(['kalocsa','baja','kiskoros','szekszard','paks','solt','dunafoldvar'].map(c=>`karpittisztitas-${c}.html`));
const files=['index.html',...Object.keys(baseline.files).filter(file=>/^karpittisztitas-[a-z]+\.html$/.test(file)&&!excluded.has(file)&&file!=='karpittisztitas-matractisztitas.html').sort(),...excluded,'karpittisztitas-matractisztitas.html'];
if(files.length!==35||new Set(files).size!==35||files.some(f=>!/^index\.html$|^karpittisztitas-[a-z-]+\.html$/.test(f)))throw Error('Unexpected 35-page scope');
const markers=['style','section','script'];
function strip(source){
 for(const name of markers){const start=`<!-- ECO-MATERIAL:${name}:START -->`,end=`<!-- ECO-MATERIAL:${name}:END -->`;
  const count=source.split(start).length-1;if(count>1||count!==source.split(end).length-1)throw Error('Invalid overlay markers');
  if(count){const a=source.indexOf(start),b=source.indexOf(end,a);source=source.slice(0,a)+source.slice(b+end.length);}
 }return source;
}
const block=(name,html)=>`<!-- ECO-MATERIAL:${name}:START -->\n${html}\n<!-- ECO-MATERIAL:${name}:END -->`;
const pages=[],outputs=[];
for(const file of files){
 const source=fs.readFileSync(path.join(release,file),'utf8'),base=strip(source);
 if(sha(base)!==baseline.files[file]?.sha256)throw Error(`${file}: original release differs from verified baseline`);
 const dom=new JSDOM(base,{includeNodeLocations:true}),d=dom.window.document;
 if(d.querySelector('#anyagfelismero,script[src*="material-recognition/app.js"],link[href*="material-recognition/design.css"]'))throw Error(`${file}: unmarked widget exists; manual review required`);
 const next=file==='index.html'?'#booking':'#arak',anchor=d.querySelector(next);
 if(!anchor)throw Error(`${file}: missing real next anchor ${next}`);
 const sectionOffset=dom.nodeLocation(anchor)?.startOffset;
 const headOffset=dom.nodeLocation(d.head)?.endTag?.startOffset,bodyOffset=dom.nodeLocation(d.body)?.endTag?.startOffset;
 if(![sectionOffset,headOffset,bodyOffset].every(Number.isInteger))throw Error(`${file}: insertion boundary missing`);
 const oldIds=new Set([...d.querySelectorAll('[id]')].map(el=>el.id));
 const widget=integrateMaterialRecognition(d,{home:file==='index.html',next,assetUrl:'material-recognition/assets/fotel-bukle-olvasosarok.webp'});
 for(const el of [widget,...widget.querySelectorAll('[id]')])if(el.id&&oldIds.has(el.id))throw Error(`${file}: widget ID collision ${el.id}`);
 let output=base;
 for(const [offset,html] of [[headOffset,block('style','<link rel="stylesheet" href="material-recognition/design.css">')],[sectionOffset,block('section',widget.outerHTML)],[bodyOffset,block('script','<script src="material-recognition/app.js" defer></script>')]].sort((a,b)=>b[0]-a[0]))output=output.slice(0,offset)+html+output.slice(offset);
 if(strip(output)!==base)throw Error(`${file}: original content changed`);
 const check=new JSDOM(output).window.document;
 if(check.querySelectorAll('#anyagfelismero').length!==1||!check.querySelector(check.querySelector('[data-material-app]').dataset.next))throw Error(`${file}: invalid output`);
 if(!check.head.querySelector('link[href="material-recognition/design.css"]')||check.title!==d.title)throw Error(`${file}: widget insertion changed HTML parsing`);
 pages.push({file,next,bookingMode:excluded.has(file)||file==='karpittisztitas-matractisztitas.html'?'existing-email-route':'existing-online-route',originalSha256:sha(base),outputSha256:sha(output),originalBytesPreserved:true});
 outputs.push([file,output,base]);dom.window.close();
}
const dependencies=[['demo/material-recognition/app.js','material-recognition/app.js'],['demo/material-recognition/design.css','material-recognition/design.css'],['demo/material-recognition/assets/fotel-bukle-olvasosarok.webp','material-recognition/assets/fotel-bukle-olvasosarok.webp']].map(([source,file])=>({source,file,sha256:sha(fs.readFileSync(path.join(workspace,source)))}));
const report={scope:'widget-only release overlay; original HTML byte-preserved outside owned markers',pages,dependencies};
const additional=new Set(dependencies.map(d=>d.file));
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.relative(release,path.join(dir,e.name)).replaceAll('\\','/')]);}
for(const file of walk(release))if(!baseline.files[file]&&!additional.has(file))throw Error(`Unreviewed release addition: ${file}`);
for(const [file,record] of Object.entries(baseline.files))if(!files.includes(file)&&sha(fs.readFileSync(path.join(release,file)))!==record.sha256)throw Error(`Unreviewed release change: ${file}`);
report.baseline={manifest:'release-support/material-widget-baseline/release-manifest.json',manifestSha256:sha(baselineManifestBytes),verification:'release-support/material-widget-baseline/release-verification.json',verificationSha256:sha(baselineReportBytes),mediterranean:'release-support/material-widget-baseline/mediterranean-manifest.json',mediterraneanSha256:sha(medBytes)};
if(write){
 fs.mkdirSync(baselineDir,{recursive:true});
 for(const [name,bytes] of [['release-manifest.json',baselineManifestBytes],['release-verification.json',baselineReportBytes],['mediterranean-manifest.json',medBytes]])fs.writeFileSync(path.join(baselineDir,name),bytes);
 const originalPages=path.join(import.meta.dirname,'release-baseline');fs.mkdirSync(originalPages,{recursive:true});
 for(const [file,output,base] of outputs){const original=path.join(originalPages,file);if(!fs.existsSync(original))fs.writeFileSync(original,base);fs.writeFileSync(path.join(release,file),output);}
 for(const dep of dependencies){const dest=path.join(release,dep.file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(workspace,dep.source),dest);}
 fs.writeFileSync(path.join(import.meta.dirname,'release-overlay.json'),JSON.stringify(report,null,2)+'\n');
 const overlayBytes=JSON.stringify(report,null,2)+'\n';fs.writeFileSync(path.join(support,'material-widget-overlay.json'),overlayBytes);
 const nextManifest=structuredClone(baseline);nextManifest.widgetOverlay={path:'release-support/material-widget-overlay.json',sha256:sha(overlayBytes)};
 for(const [file,output] of outputs)nextManifest.files[file]={...nextManifest.files[file],sha256:sha(output),bytes:Buffer.byteLength(output)};
 for(const dep of dependencies)nextManifest.files[dep.file]={sha256:dep.sha256,bytes:fs.statSync(path.join(release,dep.file)).size,source:dep.source};
 fs.writeFileSync(manifestPath,JSON.stringify(nextManifest,null,2)+'\n');
}
console.log(JSON.stringify({mode:write?'written':'plan-only',...report},null,2));
