'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const meta = require('../assets/metadata.js');

function editDescription(content, project, photoId, change) {
  if (!Object.hasOwn(content.projects, project) || !/^p-[a-f0-9]{12}$/.test(photoId)) {
    throw Error('Некорректный проект или идентификатор фотографии.');
  }
  if (typeof change?.expectedAlt !== 'string' || typeof change?.alt !== 'string') {
    throw Error('Передайте исходное и новое описание.');
  }
  const alt = change.alt.trim().replace(/\s+/g, ' ');
  if (alt.length > 300 || /[\u0000-\u001f\u007f]/.test(alt)) throw Error('Недопустимое описание кадра.');
  const photo = content.projects[project].data.find(item => item.id === photoId);
  if (!photo) throw Error('Кадр уже удалён из проекта.');
  const current = photo.alt || '';
  if (current === alt) return false;
  if (current !== change.expectedAlt) throw Error('Описание уже изменилось. Обновите список и повторите.');
  if (alt) photo.alt = alt;
  else delete photo.alt;
  return true;
}

async function verifyPublication(content, project, photoId) {
  const page = meta.page(content, project, photoId);
  const localHtml = await fs.readFile(path.join(project, photoId, 'index.html'), 'utf8');
  const tag = localHtml.match(/<meta property="og:image:alt" content="[^"]*">/)[0];
  const prefix = 'window.PORTFOLIO=';
  for (let i = 0; i < 18; i++) {
    const suffix = '?check-description=' + Date.now();
    try {
      const [html, script] = await Promise.all([page.url, meta.SITE + '/assets/content.js'].map(async url => {
        const response = await fetch(url + suffix, {cache:'no-store', signal:AbortSignal.timeout(15000)});
        if (!response.ok) throw Error('HTTP ' + response.status);
        return response.text();
      }));
      const live = JSON.parse(script.slice(prefix.length).trim().replace(/;$/, ''));
      const photo = live.projects[project].data.find(item => item.id === photoId);
      if (photo && (photo.alt || '') === (page.photo.alt || '') && html.includes(tag)
          && html.includes('rel="canonical" href="' + page.url + '"')) return;
    } catch (error) { console.log('Проверка публикации:', error.message); }
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  throw Error('Новое описание пока не подтверждено на сайте.');
}

async function main() {
  const file = 'src/content.json';
  const content = JSON.parse(await fs.readFile(file, 'utf8'));
  const {PHOTO_PROJECT:project, PHOTO_ID:photoId, DESCRIPTION_CHANGE:raw} = process.env;
  if (process.argv.includes('--check-published')) return verifyPublication(content, project, photoId);
  const changed = editDescription(content, project, photoId, JSON.parse(raw));
  if (changed) {
    await fs.writeFile(file + '.tmp', JSON.stringify(content, null, 2) + '\n');
    await fs.rename(file + '.tmp', file);
  }
  if (process.env.GITHUB_OUTPUT) await fs.appendFile(process.env.GITHUB_OUTPUT, 'changed=' + changed + '\n');
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = {editDescription};
