(function build(){
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const content=JSON.parse(fs.readFileSync(path.join(root,'src/content.json'),'utf8'));
const template=fs.readFileSync(path.join(root,'src/template.html'),'utf8');
const js=fs.readFileSync(path.join(root,'assets/site.js'),'utf8');
const sizes=js.match(/const THUMB_SIZES='([^']+)'/)[1];
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const grid=k=>content.projects[k].data.map((x,i)=>`<a class="gi" href="/${k}/?photo=${x.id}#mini" data-act="mph" data-v="${i}" data-project="${k}"><img src="${x.thumb}-800.jpg" srcset="${x.thumb}-400.jpg 400w, ${x.thumb}-800.jpg 800w" sizes="${sizes}" width="${x.width}" height="${x.height}" alt="${esc(content.projects[k].name)}, фото ${i+1}" loading="lazy" decoding="async"></a>`).join('');
const nav=Object.entries(content.projects).map(([k,p])=>`<a href="/${k}/" data-k="${k}" data-act="go" data-v="${k}"><span>${esc(p.name)}</span></a>`).join('')+'<button data-k="info" data-act="info" data-v="info"><span>Инфо</span></button>';
for(const key of ['main',...Object.keys(content.projects)]){
 const p=content.projects[key],seo=content.seo[key],url='https://denisvoloshin.ru'+seo.path;
 const first=p?p.data[0]:content.projects.vnevremeni.data[0];
 const description=p?`<h2 class="mt">${esc(p.name.toUpperCase())}</h2><div class="tx"><p>${esc(p.text)}</p></div><div class="row"><span class="it">${esc(p.loc)}</span><a class="lnk" href="/${key}/#mini" data-act="mini" data-v="${key}">перейти в галерею →</a></div>`:content.info;
 const slots={MODE:key,PAGE_TITLE:esc(p?p.name:'Денис Волошин — уличный фотограф'),FIRST_PHOTO:esc(first.url),FIRST_ALT:esc((p?p.name:'Вне времени')+', фото 1'),GRID_PROJECT:p?key:'',GRID:p?grid(key):Object.keys(content.projects).map(grid).join(''),NAV:nav,DESCRIPTION:description,PROJECT_PATH:p?'/'+key+'/':'/'};
 let html=template.replace(/\{\{([A-Z_]+)\}\}/g,(_,name)=>{if(!(name in slots))throw Error('Unknown placeholder '+name);return slots[name];});
 html=html.replace(/<title>[^<]+<\/title>/,`<title>${esc(seo.title)}</title>`).replace(/(<link id="canonical" rel="canonical" href=")[^"]+"/,`$1${url}"`);
 const metas={description:seo.description,'og:title':seo.title,'og:description':seo.description,'og:url':url,'og:image':seo.image,'og:image:alt':seo.imageAlt,'twitter:title':seo.title,'twitter:description':seo.description,'twitter:image':seo.image,'twitter:image:alt':seo.imageAlt};
 for(const [name,value] of Object.entries(metas)){
  const re=new RegExp('(<meta (?:name|property)="'+name+'" content=")[^"]*(">)');
  if(!re.test(html))throw Error('Missing meta '+name);
  html=html.replace(re,(_,a,b)=>a+esc(value)+b);
 }
 html=html.replace(/(<script id="structured-data" type="application\/ld\+json">)([\s\S]*?)(<\/script>)/,(_,a,json,b)=>{
  const schema=JSON.parse(json),page=schema['@graph'][2];
  Object.assign(page,{'@type':p?'CollectionPage':'WebPage','@id':url+'#webpage',url,name:seo.title,description:seo.description,image:seo.image});
  return a+JSON.stringify(schema).replaceAll('<','\\u003c')+b;
 });
 const out=path.join(root,p?key+'/index.html':'index.html');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,html);
}
fs.writeFileSync(path.join(root,'assets/content.js'),'window.PORTFOLIO='+JSON.stringify(content).replaceAll('<','\\u003c')+';\n');
console.log('Built 3 pages with static galleries, descriptions and navigation.');
})();
