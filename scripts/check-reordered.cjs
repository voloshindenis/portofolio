'use strict';
const fs=require('node:fs/promises');
async function main(){
  const expected=JSON.parse(await fs.readFile('.photo-import/reordered.json','utf8'));
  for(let attempt=0;attempt<18;attempt++){
    const response=await fetch('https://denisvoloshin.ru/assets/content.js?order-check='+Date.now(),{signal:AbortSignal.timeout(20000),cache:'no-store'});
    const text=await response.text(),prefix='window.PORTFOLIO=';
    const content=response.ok&&text.startsWith(prefix)?JSON.parse(text.slice(prefix.length).trim().replace(/;$/,'')):null;
    const actual=content?.projects?.[expected.project]?.data.map(p=>p.id);
    if(JSON.stringify(actual)===JSON.stringify(expected.orderIds)){console.log('Порядок фотографий проверен на публичном сайте.');return;}
    await new Promise(resolve=>setTimeout(resolve,10000));
  }
  throw Error('Публичный сайт пока не содержит сохранённый порядок. Проверьте публикацию GitHub Pages.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
