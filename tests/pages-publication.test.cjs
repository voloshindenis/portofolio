'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../scripts/request-pages-build.cjs'),'utf8');
async function runWith(runs) {
  const messages = [], errors = [], process = {env:{GITHUB_TOKEN:'test'},exitCode:0};
  let poll = 0;
  await vm.runInNewContext(source,{
    require:()=>({execFileSync:()=> 'current-commit\n'}), process, Date, AbortSignal,
    console:{log:message=>messages.push(message),error:message=>errors.push(message)},
    setTimeout:resolve=>resolve(),
    fetch:async(url,options)=>({ok:true,json:async()=>options.method==='POST'?{}:{workflow_runs:runs(poll++)}})
  });
  return {messages,errors,exitCode:process.exitCode,poll};
}
const build = (extra={}) => ({path:'dynamic/pages/pages-build-deployment',head_sha:'current-commit',created_at:new Date().toISOString(),status:'completed',conclusion:'success',html_url:'https://github.com/example/run',...extra});
test('waits for the requested Pages deployment, ignoring unrelated and older runs',async()=>{
  const result = await runWith(i=>i===0?[
    build({head_sha:'older-commit'}),build({created_at:'2020-01-01T00:00:00Z'}),build({path:'.github/workflows/other.yml'})
  ]:[build()]);
  assert.equal(result.exitCode,0);
  assert.equal(result.poll,2);
  assert.match(result.messages.at(-1),/current-commit/);
});
test('does not report success when the requested Pages deployment fails',async()=>{
  const result = await runWith(()=>[build({conclusion:'failure'})]);
  assert.equal(result.exitCode,1);
  assert.match(result.errors[0],/failure/);
});
test('a cancelled duplicate must not hide the successful deployment of the same commit', async () => {
  const result = await runWith(() => [build({conclusion:'cancelled'}), build()]);
  assert.equal(result.exitCode, 0);
  assert.match(result.messages.at(-1), /current-commit/);
});
test('waits for a replacement that becomes visible after cancellation', async () => {
  const cancelled = build({conclusion:'cancelled'});
  const result = await runWith(i => {
    if (i === 0) return [cancelled];
    if (i === 1) return [cancelled, build({status:'in_progress', conclusion:null})];
    return [cancelled, build()];
  });
  assert.equal(result.exitCode, 0);
  assert.equal(result.poll, 3);
});
test('a cancelled build alone cannot confirm publication', async () => {
  const result = await runWith(() => [build({conclusion:'cancelled'}), build({head_sha:'different'})]);
  assert.equal(result.exitCode, 1);
  assert.match(result.errors[0], /cancelled/);
});
