'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
test('adding or removing photos changes the content asset URL on every generated page',async()=>{
  const repo=path.resolve(__dirname,'..'),scratch=path.join(repo,'.photo-import/tests');await fs.mkdir(scratch,{recursive:true});const root=await fs.mkdtemp(path.join(scratch,'versions-'));
  try{
    for(const folder of ['src','assets','scripts'])await fs.mkdir(path.join(root,folder));
    for(const file of ['src/content.json','src/template.html','assets/site.js','assets/site.css','assets/metadata.js','scripts/build.cjs'])await fs.copyFile(path.join(repo,file),path.join(root,file));
    const build=()=>execFileSync(process.execPath,[path.join(root,'scripts/build.cjs')],{stdio:'pipe'});
    const version=async()=>{const html=await fs.readFile(path.join(root,'vnevremeni/index.html'),'utf8');return html.match(/\/assets\/content\.js\?v=([a-f0-9]{16})/)[1];};
    build();const first=await version(),file=path.join(root,'src/content.json'),content=JSON.parse(await fs.readFile(file));
    const p=content.projects.vnevremeni.data[0];content.projects.vnevremeni.data.push({...p,id:'p-000000000001'});await fs.writeFile(file,JSON.stringify(content));build();const added=await version();assert.notEqual(added,first);
    const contentBytes=await fs.readFile(path.join(root,'assets/content.js'));assert.equal(added,crypto.createHash('sha256').update(contentBytes).digest('hex').slice(0,16));
    const photoHtml=await fs.readFile(path.join(root,'vnevremeni/p-000000000001/index.html'),'utf8');assert(photoHtml.includes('content.js?v='+added));
    content.projects.vnevremeni.data=[];content.projects.vglubine.data=[];await fs.writeFile(file,JSON.stringify(content));build();assert.notEqual(await version(),added);
  }finally{assert(root.startsWith(scratch+path.sep));await fs.rm(root,{recursive:true,force:true});}
});
