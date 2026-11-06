'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const {validateInput} = require('./photo-input.cjs');
const {downloadPhoto} = require('./download-photo.cjs');

async function preparePhoto(input,content,download = downloadPhoto) {
  const clean = validateInput(input,content);
  const project = content.projects[clean.project];
  const existing = project.data.find(p => new URL(p.url).href === clean.url);
  if (existing) return {existing:true,photo:existing,project:clean.project};
  const bytes = await download(clean.url);
  const options = {limitInputPixels:120000000,failOn:'warning'};
  const metadata = await sharp(bytes,options).metadata();
  if (!['jpeg','png','webp'].includes(metadata.format) || (metadata.pages || 1) !== 1) throw Error('Нужна обычная фотография JPEG, PNG или WebP, без анимации.');
  const rotated = [5,6,7,8].includes(metadata.orientation);
  const width = rotated ? metadata.height : metadata.width;
  const height = rotated ? metadata.width : metadata.height;
  if (!width || !height || width < 320 || height < 320) throw Error('Фотография слишком маленькая: нужно хотя бы 320 пикселей по каждой стороне.');
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  const duplicate = project.data.find(p => p.sha256 === sha256);
  if (duplicate) throw Error('Эта фотография уже есть в проекте: https://denisvoloshin.ru/'+clean.project+'/'+duplicate.id+'/');
  const id = 'p-'+crypto.createHash('sha256').update(clean.project+'\n'+sha256).digest('hex').slice(0,12);
  if (Object.values(content.projects).some(p => p.data.some(x => x.id === id))) throw Error('Конфликт идентификатора фотографии. Добавление остановлено.');
  const photo = {url:clean.url,id,width,height,thumb:'/assets/thumbs/'+id,sha256};
  if (clean.alt) photo.alt = clean.alt;
  const thumbnails = {};
  for (const size of [400,800]) thumbnails[size] = await sharp(bytes,options).rotate().resize({width:size}).withIccProfile('srgb').jpeg({quality:88,mozjpeg:true}).toBuffer();
  return {existing:false,photo,project:clean.project,thumbnails};
}

async function applyPhoto(root,prepared,content) {
  if (prepared.existing) return;
  const target = path.join(root,'assets','thumbs');
  await fs.mkdir(target,{recursive:true});
  for (const size of [400,800]) await fs.writeFile(path.join(target,prepared.photo.id+'-'+size+'.jpg'),prepared.thumbnails[size],{flag:'wx'});
  content.projects[prepared.project].data.push(prepared.photo);
  const file = path.join(root,'src','content.json');
  await fs.writeFile(file+'.tmp',JSON.stringify(content,null,2)+'\n');
  await fs.rename(file+'.tmp',file);
}

async function main() {
  const root = path.resolve(__dirname,'..');
  const content = JSON.parse(await fs.readFile(path.join(root,'src','content.json'),'utf8'));
  const input = {project:process.env.PHOTO_PROJECT,url:process.env.PHOTO_URL,alt:process.env.PHOTO_ALT || ''};
  const prepared = await preparePhoto(input,content);
  const result = {existing:prepared.existing,id:prepared.photo.id,project:prepared.project,url:'https://denisvoloshin.ru/'+prepared.project+'/'+prepared.photo.id+'/'};
  await applyPhoto(root,prepared,content);
  await fs.mkdir(path.join(root,'.photo-import'),{recursive:true});
  await fs.writeFile(path.join(root,'.photo-import','result.json'),JSON.stringify(result));
  if (process.env.GITHUB_OUTPUT) await fs.appendFile(process.env.GITHUB_OUTPUT,'photo_url='+result.url+'\nexisting='+result.existing+'\n');
  console.log(prepared.existing ? 'Этот кадр уже есть в проекте.' : 'Фотография и две миниатюры подготовлены.');
  console.log(result.url);
}
if (require.main === module) main().catch(e => {console.error(e.message);process.exitCode=1;});
module.exports = {preparePhoto,applyPhoto};
