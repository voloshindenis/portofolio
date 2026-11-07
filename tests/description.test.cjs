'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {execFileSync} = require('node:child_process');
const {editDescription} = require('../scripts/edit-description.cjs');
const catalog = structuredClone(require('../src/content.json'));
const project = 'vnevremeni';
const fixture = {id:'p-000000000021', url:'https://example.org/21.jpg', width:1200, height:800, thumb:'/thumbs/21'};
catalog.projects[project].data = [fixture, {...fixture,id:'p-000000000022',url:'https://example.org/22.jpg',thumb:'/thumbs/22'}];
catalog.projects.vglubine.data = [{...fixture,id:'p-000000000023',alt:'Другая серия'}];
const original = catalog.projects[project].data[0];
const expectedAlt = original.alt || '';
const alt = 'Портрет «У окна» & <свет> "$&"';

test('edit targets only the permanent photo ID, survives a reorder and is idempotent', () => {
  const content = structuredClone(catalog);
  content.projects[project].data.reverse();
  const expected = structuredClone(content);
  expected.projects[project].data.find(photo => photo.id === original.id).alt = alt;
  assert.equal(editDescription(content, project, original.id, {expectedAlt, alt}), true);
  assert.deepEqual(content, expected);
  assert.equal(editDescription(content, project, original.id, {expectedAlt, alt}), false);
  assert.throws(() => editDescription(content, project, original.id, {expectedAlt, alt:'Устаревшая версия'}));
  assert.deepEqual(content, expected);
  assert.equal(editDescription(content, project, original.id, {expectedAlt:alt, alt:'  '}), true);
  assert.equal(content.projects[project].data.find(photo => photo.id === original.id).alt, undefined);
});
test('invalid edits leave the catalog intact', () => {
  const content = structuredClone(catalog);
  for (const value of [undefined, 4, 'a'.repeat(301), 'a\u0000b'])
    assert.throws(() => editDescription(content, project, original.id, {expectedAlt, alt:value}));
  assert.throws(() => editDescription(content, project, original.id, {alt}));
  assert.throws(() => editDescription(content, project, 'p-ffffffffffff', {expectedAlt, alt}));
  assert.deepEqual(content, catalog);
});
test('build preserves URLs and markup while publishing escaped alt and preview metadata', t => {
  const root = path.join(__dirname,'..');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-description-'));
  t.after(() => fs.rmSync(temp, {recursive:true, force:true}));
  for (const name of ['src/content.json','src/template.html','assets/metadata.js','assets/site.js','assets/site.css','scripts/build.cjs']) {
    fs.mkdirSync(path.dirname(path.join(temp,name)), {recursive:true});
    fs.copyFileSync(path.join(root,name), path.join(temp,name));
  }
  const read = name => fs.readFileSync(path.join(temp,name),'utf8');
  const build = () => execFileSync(process.execPath,['scripts/build.cjs'],{cwd:temp});
  const page = project+'/'+original.id+'/index.html';
  fs.writeFileSync(path.join(temp,'src/content.json'), JSON.stringify(catalog));
  build();
  const previous = read(page), sitemap = read('sitemap.xml');
  const content = structuredClone(catalog);
  editDescription(content, project, original.id, {expectedAlt, alt});
  fs.writeFileSync(path.join(temp,'src/content.json'),JSON.stringify(content));
  build();
  const html = read(page), escaped = 'Портрет «У окна» &amp; &lt;свет&gt; &quot;$&amp;&quot;';
  const links = source => [...source.matchAll(/(?:src|href|srcset)="([^"]+)"/g)].map(match => match[1].replace(/content\.js\?v=[a-f0-9]+/, 'content.js'));
  assert.deepEqual(links(html), links(previous));
  assert.equal(read('sitemap.xml'), sitemap);
  assert.ok(html.includes('alt="'+escaped+'"'));
  assert.ok(html.includes('property="og:image:alt" content="'+escaped+'"'));
  assert.ok(html.includes('name="twitter:image:alt" content="'+escaped+'"'));
  assert.ok(read(project+'/index.html').match(/<img[^>]+id="gimg"[^>]+>/)[0].includes('alt="'+escaped+'"'));
  const graph = JSON.parse(html.match(/<script id="structured-data"[^>]*>(.*?)<\/script>/s)[1])['@graph'];
  assert.equal(graph.find(item=>item['@type']==='ImageObject').name,alt);
});
