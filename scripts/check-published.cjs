'use strict';
const fs = require('node:fs');
const result = JSON.parse(fs.readFileSync('.photo-import/result.json','utf8'));
(async()=>{
  for(let i=0;i<18;i++){
    const r = await fetch(result.url,{headers:{'User-Agent':'TelegramBot (like TwitterBot)'},signal:AbortSignal.timeout(20000)});
    const html = await r.text();
    if(r.ok && html.includes('https://denisvoloshin.ru/assets/thumbs/'+result.id+'-800.jpg')) {
      console.log('Фотография опубликована: '+result.url);return;
    }
    await new Promise(r=>setTimeout(r,10000));
  }
  throw Error('Новый кадр ещё не доступен на сайте. Проверьте публикацию GitHub Pages.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
