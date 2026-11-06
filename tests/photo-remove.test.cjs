'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {prepareRemoval,applyRemoval}=require('../scripts/remove-photo.cjs');
const meta=require('../assets/metadata.js');
const id='p-123456789abc',other='p-abcdef123456';
const photo={id,url:'https://example.com/photo.jpg',thumb:'/assets/thumbs/'+id,width:1600,height:1000};
const input={project:'vnevremeni',photoId:id,url:photo.url};
function fixture(){return {projects:{vnevremeni:{name:'Вне времени',data:[{...photo}]},vglubine:{name:'В глубине',data:[{...photo,id:other,url:'https://example.com/other.jpg',thumb:'/assets/thumbs/'+other}]}},seo:{main:{path:'/',image:photo.url},vnevremeni:{path:'/vnevremeni/',image:photo.url},vglubine:{path:'/vglubine/',image:'https://example.com/other.jpg'}}};}
test('removal validates exact project, ID, original URL and thumbnail path',()=>{
  for(const bad of [{project:'../outside'},{photoId:'../../index'},{url:'https://other.example/image.jpg'}])assert.throws(()=>prepareRemoval({...input,...bad},fixture()));
  const data=fixture();data.projects.vnevremeni.data[0].thumb='/outside';assert.throws(()=>prepareRemoval(input,data));
});
test('removal deletes only selected files, updates covers, and safely supports empty projects',async()=>{
  const scratch=path.resolve(__dirname,'../.photo-import/tests');await fs.mkdir(scratch,{recursive:true});const root=await fs.mkdtemp(path.join(scratch,'remove-'));
  try{
    const data=fixture();await fs.mkdir(path.join(root,'src'),{recursive:true});await fs.mkdir(path.join(root,'assets/thumbs'),{recursive:true});
    for(const [key,p] of Object.entries(data.projects))for(const x of p.data){await fs.mkdir(path.join(root,key,x.id),{recursive:true});await fs.writeFile(path.join(root,key,x.id,'index.html'),'photo');for(const size of [400,800])await fs.writeFile(path.join(root,'assets/thumbs',x.id+'-'+size+'.jpg'),'image');}
    await applyRemoval(root,prepareRemoval(input,data),data);
    assert.equal(data.projects.vnevremeni.data.length,0);assert.equal(data.projects.vglubine.data.length,1);
    await assert.rejects(fs.access(path.join(root,'vnevremeni',id,'index.html')));
    for(const size of [400,800]){await assert.rejects(fs.access(path.join(root,'assets/thumbs',id+'-'+size+'.jpg')));await fs.access(path.join(root,'assets/thumbs',other+'-'+size+'.jpg'));}
    await fs.access(path.join(root,'vglubine',other,'index.html'));
    assert.equal(meta.page(data,'vnevremeni').image,'https://example.com/other.jpg');
    assert.equal(prepareRemoval(input,data).alreadyRemoved,true);
    await applyRemoval(root,prepareRemoval(input,data),data);
    const remaining=data.projects.vglubine.data[0];await applyRemoval(root,prepareRemoval({project:'vglubine',photoId:other,url:remaining.url},data),data);
    assert.equal(meta.page(data,'main').image,'https://denisvoloshin.ru/favicon.png');
    assert.equal(meta.page(data,'vglubine').imageType,'image/png');
  }finally{assert(root.startsWith(scratch+path.sep));await fs.rm(root,{recursive:true,force:true});}
});
