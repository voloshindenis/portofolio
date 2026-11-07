'use strict';
const fs = require('node:fs/promises');
const meta = require('../assets/metadata.js');

function setCover(content, key, photoId, expectedId) {
  if (!Object.hasOwn(content.projects, key) || ![photoId, expectedId].every(id => /^p-[a-f0-9]{12}$/.test(id)))
    throw Error('Выберите кадр из проекта.');
  const project = content.projects[key];
  if (!project.data.some(photo => photo.id === photoId)) throw Error('Кадр уже удалён из проекта.');
  const current = meta.seriesCover(content, key)?.id;
  if (project.coverId === photoId) return false;
  if (current !== photoId && current !== expectedId) throw Error('Обложка уже изменилась. Обновите список и повторите.');
  project.coverId = photoId;
  return true;
}

async function checkPublished(content, key, photoId) {
  if (meta.seriesCover(content, key)?.id !== photoId) throw Error('В каталоге выбрана другая обложка.');
  const page = meta.page(content, key);
  const html = await fs.readFile(key + '/index.html', 'utf8');
  const tags = ['og:image', 'og:image:secure_url', 'og:image:alt', 'og:image:width', 'og:image:height', 'twitter:image', 'twitter:image:alt'].map(name => {
    const tag = html.match(new RegExp('<meta (?:name|property)="' + name + '" content="[^"]*">'));
    if (!tag) throw Error('Отсутствует тег ' + name);
    return tag[0];
  });
  for (let attempt = 0; attempt < 18; attempt++) {
    try {
      const options = {cache:'no-store', signal:AbortSignal.timeout(15000)};
      const response = await fetch(page.url + '?check-cover=' + Date.now(), options);
      if (!response.ok) throw Error('HTTP ' + response.status);
      const live = await response.text();
      if (tags.every(tag => live.includes(tag))) {
        const image = await fetch(page.image, {...options, method:'HEAD'});
        if (image.ok && image.headers.get('content-type')?.startsWith('image/')) return;
      }
    } catch (error) { console.log('Проверка обложки:', error.message); }
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  throw Error('Обложка пока не подтверждена на публичной странице серии.');
}

async function main() {
  const file = 'src/content.json';
  const content = JSON.parse(await fs.readFile(file, 'utf8'));
  const {PHOTO_PROJECT:key, PHOTO_ID:photoId, EXPECTED_COVER:expectedId} = process.env;
  if (process.argv.includes('--check-published')) return checkPublished(content, key, photoId);
  const changed = setCover(content, key, photoId, expectedId);
  if (changed) {
    await fs.writeFile(file + '.tmp', JSON.stringify(content, null, 2) + '\n');
    await fs.rename(file + '.tmp', file);
  }
  if (process.env.GITHUB_OUTPUT) await fs.appendFile(process.env.GITHUB_OUTPUT, 'changed=' + changed + '\n');
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = {setCover};
