import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(path.join(process.env.TEMP,'ecoclean-demo-qa','package.json'));
const css=require('css-tree'),out=path.dirname(fileURLToPath(import.meta.url));
const files=['design.css','subpages.css','modern.css',...fs.readdirSync(path.join(out,'rollout')).filter(f=>f.endsWith('.css')).map(f=>'rollout/'+f)];
const errors=[],missing=[];
for(const file of files){
  const raw=fs.readFileSync(path.join(out,file),'utf8');
  const ast=css.parse(raw,{positions:true,onParseError:error=>errors.push({file,line:error.line,message:error.message})});
  css.walk(ast,{visit:'Url',enter(node){
    const url=node.value;if(/^(https?:|data:|#|\/\/)/.test(url))return;
    if(!fs.existsSync(path.resolve(out,path.dirname(file),decodeURIComponent(url.split(/[?#]/)[0]))))missing.push({file,url});
  }});
}
fs.writeFileSync(path.join(out,'rollout/css-verification.json'),JSON.stringify({stylesheets:files.length,errors,missing},null,2));
console.log(JSON.stringify({stylesheets:files.length,errors:errors.length,missing:missing.length,first:errors.slice(0,8)},null,2));process.exitCode=errors.length||missing.length?1:0;
