'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {setCover} = require('../scripts/set-cover.cjs');
const meta = require('../assets/metadata.js');
function makeSeries(name, prefix, count) {
  return {name, data:Array.from({length:count}, (_, index) => {
    const id = 'p-' + prefix + String(index).padStart(11,'0');
    return {id, thumb:'/assets/thumbs/' + id, url:'https://example.org/' + id + '.jpg', width:1200, height:800};
  })};
}

test('series preview follows the chosen photo across reorders and leaves direct photo links independent', () => {
  const projects = {vglubine:makeSeries('В глубине','a',3), vnevremeni:makeSeries('Вне времени','b',1)};
  const defaults = {image:projects.vglubine.data[0].url, imageAlt:'Обложка', title:'Серия', description:'Проект'};
  const content = {projects,seo:{main:{...defaults,path:'/'},vglubine:{...defaults,path:'/vglubine/'},vnevremeni:{...defaults,path:'/vnevremeni/'}}};
  const key = 'vglubine', project = content.projects[key];
  const old = meta.seriesCover(content,key);
  const other = project.data.find(photo => photo.id !== old.id);
  const before = project.data.map(photo => photo.id);
  const home = meta.page(content,'main');
  const otherProject = meta.page(content,'vnevremeni');
  const frame = meta.page(content,key,old.id);
  assert.ok(setCover(content,key,other.id,old.id));
  assert.deepEqual(project.data.map(photo => photo.id),before);
  assert.deepEqual(meta.page(content,key,old.id),frame);
  assert.deepEqual(meta.page(content,'main'),home);
  assert.deepEqual(meta.page(content,'vnevremeni'),otherProject);
  project.data.reverse();
  const series = meta.page(content,key);
  const expected = meta.SITE + other.thumb + '-800.jpg';
  assert.equal(meta.tags(series)['og:image'],expected);
  assert.equal(meta.tags(series)['twitter:image'],expected);
  assert.equal(meta.schema(series)['@graph'].at(-1).image,expected);
  assert.equal(meta.page(content,key,old.id).image,frame.image);
  assert.equal(series.imageHeight,Math.round(other.height * 800 / other.width));
  assert.equal(setCover(content,key,other.id,old.id),false);
  const third = project.data.find(photo => ![other.id,old.id].includes(photo.id));
  assert.throws(() => setCover(content,key,third.id,old.id));
  assert.throws(() => setCover(content,key,content.projects.vnevremeni.data[0].id,other.id));
});
