'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const same=(a,b)=>a.length===b.length&&a.every((id,i)=>id===b[i]);
function prepareReorder(input,content){
  if(!['vnevremeni','vglubine'].includes(input.project)||!content.projects[input.project])throw Error('Выберите проект.');
  for(const ids of [input.orderIds,input.baseIds])if(!Array.isArray(ids)||ids.length>1000||ids.some(id=>typeof id!=='string'||!/^p-[a-f0-9]{12}$/.test(id))||new Set(ids).size!==ids.length)throw Error('Некорректный список фотографий.');
  const project=content.projects[input.project],current=project.data.map(p=>p.id);
  if(!same([...current].sort(),[...input.orderIds].sort())||!same([...current].sort(),[...input.baseIds].sort()))throw Error('Состав проекта изменился. Обновите список фотографий.');
  const unchanged=same(current,input.orderIds);
  if(!unchanged&&!same(current,input.baseIds))throw Error('Порядок фотографий изменился. Обновите список и повторите.');
  const photos=new Map(project.data.map(p=>[p.id,p]));
  return {project:input.project,orderIds:input.orderIds,data:input.orderIds.map(id=>photos.get(id)),unchanged};
}
async function main(){
  const root=path.resolve(__dirname,'..'),file=path.join(root,'src','content.json');
  const content=JSON.parse(await fs.readFile(file,'utf8'));
  const result=prepareReorder({project:process.env.PHOTO_PROJECT,orderIds:JSON.parse(process.env.PHOTO_IDS||'null'),baseIds:JSON.parse(process.env.EXPECTED_IDS||'null')},content);
  if(!result.unchanged){content.projects[result.project].data=result.data;await fs.writeFile(file+'.tmp',JSON.stringify(content,null,2)+'\n');await fs.rename(file+'.tmp',file);}
  await fs.mkdir(path.join(root,'.photo-import'),{recursive:true});
  await fs.writeFile(path.join(root,'.photo-import','reordered.json'),JSON.stringify({project:result.project,orderIds:result.orderIds,unchanged:result.unchanged}));
  if(process.env.GITHUB_OUTPUT)await fs.appendFile(process.env.GITHUB_OUTPUT,'unchanged='+result.unchanged+'\n');
  console.log(result.unchanged?'Порядок уже сохранён.':'Порядок изменён. Все фотографии и их адреса сохранены.');
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={prepareReorder};
