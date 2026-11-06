'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
function prepareRemoval(input,content) {
  if (!['vnevremeni','vglubine'].includes(input.project) || !content.projects[input.project]) throw Error('Выберите проект.');
  if (!/^p-[a-f0-9]{12}$/.test(input.photoId || '')) throw Error('Некорректный идентификатор кадра.');
  const photo=content.projects[input.project].data.find(p=>p.id===input.photoId);
  if (photo && photo.url !== input.url) throw Error('Фотография изменилась. Обновите список и подтвердите удаление заново.');
  if (photo && photo.thumb !== '/assets/thumbs/'+photo.id) throw Error('Некорректный путь миниатюр.');
  return {project:input.project,id:input.photoId,photo,alreadyRemoved:!photo};
}
async function applyRemoval(root,prepared,content) {
  if(prepared.alreadyRemoved)return;
  const project=content.projects[prepared.project];
  project.data=project.data.filter(p=>p.id!==prepared.id);
  const remaining=Object.values(content.projects).flatMap(p=>p.data);
  for(const [key,seo] of Object.entries(content.seo || {})) {
    if(seo.image===prepared.photo.url && !remaining.some(p=>p.url===seo.image)) {
      const next=content.projects[key]?.data[0] || remaining[0];
      seo.image=next?.url || '';seo.imageAlt=next?.alt || 'Фотография Дениса Волошина';
    }
  }
  const removeFile=async parts=>{
    const target=path.resolve(root,...parts);
    if(!target.startsWith(path.resolve(root)+path.sep))throw Error('Недопустимый путь.');
    await fs.unlink(target).catch(e=>{if(e.code!=='ENOENT')throw e;});
  };
  await removeFile([prepared.project,prepared.id,'index.html']);
  const route=path.resolve(root,prepared.project,prepared.id);
  if(!route.startsWith(path.resolve(root)+path.sep))throw Error('Недопустимый путь.');
  await fs.rmdir(route).catch(e=>{if(!['ENOENT','ENOTEMPTY'].includes(e.code))throw e;});
  if(!remaining.some(p=>p.thumb===prepared.photo.thumb))for(const size of [400,800])await removeFile(['assets','thumbs',prepared.id+'-'+size+'.jpg']);
  const file=path.join(root,'src','content.json');
  await fs.writeFile(file+'.tmp',JSON.stringify(content,null,2)+'\n');await fs.rename(file+'.tmp',file);
}
async function main(){
  const root=path.resolve(__dirname,'..'),content=JSON.parse(await fs.readFile(path.join(root,'src','content.json'),'utf8'));
  const prepared=prepareRemoval({project:process.env.PHOTO_PROJECT,photoId:process.env.PHOTO_ID,url:process.env.PHOTO_URL},content);
  await applyRemoval(root,prepared,content);
  const result={id:prepared.id,project:prepared.project,alreadyRemoved:prepared.alreadyRemoved,url:'https://denisvoloshin.ru/'+prepared.project+'/'+prepared.id+'/'};
  await fs.mkdir(path.join(root,'.photo-import'),{recursive:true});await fs.writeFile(path.join(root,'.photo-import','removed.json'),JSON.stringify(result));
  if(process.env.GITHUB_OUTPUT)await fs.appendFile(process.env.GITHUB_OUTPUT,'already_removed='+prepared.alreadyRemoved+'\n');
  console.log(prepared.alreadyRemoved?'Фотография уже удалена.':'Удалены кадр, его страница и миниатюры.');
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={prepareRemoval,applyRemoval};
