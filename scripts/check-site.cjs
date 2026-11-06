'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname,'..');
const content = JSON.parse(fs.readFileSync(path.join(root,'src/content.json'),'utf8'));
const meta = require('../assets/metadata.js');
const sitemap = fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
let count=0;
for(const [key,project] of Object.entries(content.projects)) {
  const ids=new Set();
  for(const photo of project.data) {
    assert.match(photo.id,/^p-[a-f0-9]{12}$/); assert(!ids.has(photo.id));ids.add(photo.id);
    assert(Number.isInteger(photo.width) && photo.width>0 && Number.isInteger(photo.height) && photo.height>0);
    const seo = meta.page(content,key,photo.id);
    const html = fs.readFileSync(path.join(root,seo.path,'index.html'),'utf8');
    assert(html.includes('<link id="canonical" rel="canonical" href="'+seo.url+'">'));
    assert(html.includes('<meta property="og:image" content="'+seo.image+'">'));
    assert(html.includes('<meta name="twitter:image" content="'+seo.image+'">'));
    assert(sitemap.includes('<loc>'+seo.url+'</loc>'));
    for(const size of [400,800]) {
      const image=fs.readFileSync(path.join(root,photo.thumb+'-'+size+'.jpg'));
      assert(image.length>100 && image[0]===255 && image[1]===216);
    }
    count++;
  }
}
console.log('Checked '+count+' photo pages, previews and sitemap entries.');
