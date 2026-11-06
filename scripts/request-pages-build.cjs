'use strict';
const {execFileSync} = require('node:child_process');
const base = 'https://api.github.com/repos/voloshindenis/portofolio';
const headers = {Authorization:'Bearer '+process.env.GITHUB_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'PortfolioPublisher'};
async function api(route,method='GET') {
  const response = await fetch(base+route,{method,headers,signal:AbortSignal.timeout(30000)});
  const data = await response.json().catch(()=>({}));
  if (!response.ok) throw Error('GitHub Pages: HTTP '+response.status+'. '+(data.message||''));
  return data;
}
(async()=>{
  const commit = execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  await api('/pages/builds','POST');
  for(let i=0;i<60;i++){
    const build = await api('/pages/builds/latest');
    if(build.commit === commit && build.status === 'built') { console.log('GitHub Pages опубликовал '+commit);return; }
    if(build.commit === commit && build.status === 'errored') throw Error(build.error?.message||'Ошибка публикации GitHub Pages.');
    await new Promise(r=>setTimeout(r,10000));
  }
  throw Error('GitHub Pages пока не подтвердил публикацию. Проверьте статус сборки.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
