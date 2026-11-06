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
  const requestedAt = Date.now();
  await api('/pages/builds','POST');
  for(let i=0;i<60;i++){
    const result = await api('/actions/runs?event=dynamic&head_sha='+commit+'&per_page=30');
    const build = (result.workflow_runs || []).find(run =>
      run.path === 'dynamic/pages/pages-build-deployment' &&
      run.head_sha === commit && Date.parse(run.created_at) >= requestedAt - 5000);
    if(build?.status === 'completed') {
      if(build.conclusion !== 'success') throw Error('Ошибка публикации GitHub Pages: '+build.conclusion+'. '+build.html_url);
      console.log('GitHub Pages опубликовал '+commit);return;
    }
    if(i % 6 === 0) console.log('GitHub Pages: '+(build?.status || 'ожидание запуска'));
    await new Promise(r=>setTimeout(r,10000));
  }
  throw Error('GitHub Pages пока не подтвердил публикацию. Проверьте статус сборки.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
