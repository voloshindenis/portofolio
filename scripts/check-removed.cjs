'use strict';
const fs=require('node:fs');
const result=JSON.parse(fs.readFileSync('.photo-import/removed.json','utf8'));
(async()=>{
  for(let i=0;i<18;i++){
    const bust='?verify='+Date.now();
    const options={cache:'no-store',signal:AbortSignal.timeout(20000)};
    const [page,content,sitemap]=await Promise.all([fetch(result.url+bust,options),fetch('https://denisvoloshin.ru/assets/content.js'+bust,options),fetch('https://denisvoloshin.ru/sitemap.xml'+bust,options)]);
    const [data,xml]=await Promise.all([content.text(),sitemap.text()]);
    const current=content.ok && data.startsWith('window.PORTFOLIO=')?JSON.parse(data.slice('window.PORTFOLIO='.length).trim().replace(/;$/,'')):null;
    if(page.status===404 && current?.projects?.[result.project] && !current.projects[result.project].data.some(p=>p.id===result.id) && sitemap.ok && !xml.includes('<loc>'+result.url+'</loc>')){
      console.log('Фотография удалена с сайта: '+result.url);return;
    }
    await new Promise(resolve=>setTimeout(resolve,10000));
  }
  throw Error('Сайт пока не подтвердил удаление. Проверьте публикацию GitHub Pages.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
