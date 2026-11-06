'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const {validateInput,isPublicAddress} = require('../scripts/photo-input.cjs');
const {preparePhoto,applyPhoto} = require('../scripts/import-photo.cjs');
const content=()=>({projects:{vglubine:{name:'В глубине',data:[]},vnevremeni:{name:'Вне времени',data:[]}}});
const input={project:'vglubine',url:'https://static.tildacdn.com/example/photo.jpg',alt:'Поезд на станции'};
const image=()=>sharp({create:{width:1600,height:1000,channels:3,background:'#777'}}).jpeg().toBuffer();
test('input validation rejects malformed and private URLs',()=>{
  for(const url of ['http://x.com/a.jpg','file:///tmp/a','https://user:pass@x.com/a','https://127.0.0.1/a.jpg','https://192.168.1.2/a','https://[::1]/a','https://x.local/a','https://a.com:8080/a'])assert.throws(()=>validateInput({...input,url},content()));
  assert.throws(()=>validateInput({...input,project:'../bad'},content()));
  assert.throws(()=>validateInput({...input,alt:'a'.repeat(301)},content()));
  assert.equal(validateInput({...input,url:input.url+'#photo'},content()).url,input.url);
});
test('DNS addresses exclude internal and transition networks',()=>{
  for(const address of ['127.0.0.1','10.0.0.1','172.16.0.1','192.168.1.1','169.254.169.254','100.64.0.1','0.0.0.0','::1','::ffff:127.0.0.1','fe80::1','fc00::1','2001:db8::1','2002:7f00:1::'])assert.equal(isPublicAddress(address),false,address);
  for(const address of ['1.1.1.1','8.8.8.8','2606:4700:4700::1111'])assert.equal(isPublicAddress(address),true,address);
});
test('import creates proper thumbnails, dimensions and stable ID',async()=>{
  const bytes=await image(),data=content();
  const prepared=await preparePhoto(input,data,async()=>bytes);
  assert.equal(prepared.existing,false);assert.equal(prepared.photo.width,1600);assert.equal(prepared.photo.height,1000);assert.equal(prepared.photo.alt,input.alt);
  for(const width of [400,800]){const m=await sharp(prepared.thumbnails[width]).metadata();assert.equal(m.width,width);assert.equal(m.height,width*1000/1600);assert.equal(m.format,'jpeg');}
  assert.equal((await preparePhoto(input,data,async()=>bytes)).photo.id,prepared.photo.id);
  const scratch=path.resolve(__dirname,'../.photo-import/tests');await fs.mkdir(scratch,{recursive:true});
  const root=await fs.mkdtemp(path.join(scratch,'import-'));
  try{
    await fs.mkdir(path.join(root,'src'));await applyPhoto(root,prepared,data);
    const saved=JSON.parse(await fs.readFile(path.join(root,'src/content.json')));
    assert.equal(saved.projects.vglubine.data.length,1);assert.equal(saved.projects.vnevremeni.data.length,0);
    const again=await preparePhoto(input,saved,async()=>{throw Error('Duplicate should not download');});assert.equal(again.existing,true);
    await assert.rejects(()=>preparePhoto({...input,url:'https://example.com/copy.jpg'},saved,async()=>bytes),/уже есть/);
  }finally{assert(path.resolve(root).startsWith(scratch+path.sep));await fs.rm(root,{recursive:true,force:true});}
});
test('EXIF orientation is reflected in size and previews',async()=>{
  const bytes=await sharp(await image()).withMetadata({orientation:6}).jpeg().toBuffer();
  const result=await preparePhoto(input,content(),async()=>bytes);
  assert.equal(result.photo.width,1000);assert.equal(result.photo.height,1600);
  const thumb=await sharp(result.thumbnails[800]).metadata();assert.equal(thumb.height,1280);assert(!thumb.orientation || thumb.orientation===1);
});
test('invalid bytes and tiny images leave content unchanged',async()=>{
  const data=content();
  await assert.rejects(()=>preparePhoto(input,data,async()=>Buffer.from('<html>not an image</html>')));
  const tiny=await sharp({create:{width:10,height:10,channels:3,background:'#fff'}}).png().toBuffer();
  await assert.rejects(()=>preparePhoto(input,data,async()=>tiny),/маленькая/);
  assert.equal(data.projects.vglubine.data.length,0);
});
