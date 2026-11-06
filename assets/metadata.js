(function(){'use strict';
const SITE='https://denisvoloshin.ru';
const photoPath=(key,id)=>'/'+key+'/'+encodeURIComponent(id)+'/';
function page(content,key,id){
 key=Object.hasOwn(content.seo,key)?key:'main';
 const project=content.projects[key],index=project?project.data.findIndex(x=>x.id===id):-1;
 const photo=index<0?null:project.data[index],base=content.seo[key];
 const photos=Object.values(content.projects).flatMap(p=>p.data);
 const source=photo||photos.find(x=>x.url===base.image)||project?.data[0]||photos[0]||{url:SITE+'/favicon.png',width:512,height:512};
 const path=photo?photoPath(key,photo.id):base.path;
 const image=photo?SITE+photo.thumb+'-800.jpg':source.url;
 const imageAlt=photo?(photo.alt||project.name+', фото '+(index+1)):base.imageAlt;
 return {key,photo,path,url:SITE+path,image,imageAlt,
  title:photo?project.name+' — фото '+(index+1)+' | Денис Волошин':base.title,
  description:photo?'Фотография '+(index+1)+' из проекта «'+project.name+'» Дениса Волошина. '+base.description:base.description,
  heading:photo?imageAlt:(project?project.name:'Денис Волошин — уличный фотограф'),
  imageType:image.endsWith('/favicon.png')?'image/png':'image/jpeg',imageWidth:photo?800:source.width,imageHeight:photo?Math.round(source.height*800/source.width):source.height};
}
function tags(p){return {
 description:p.description,'og:title':p.title,'og:description':p.description,'og:url':p.url,
 'og:image':p.image,'og:image:secure_url':p.image,'og:image:type':p.imageType,
 'og:image:width':String(p.imageWidth),'og:image:height':String(p.imageHeight),'og:image:alt':p.imageAlt,
 'twitter:title':p.title,'twitter:description':p.description,'twitter:image':p.image,'twitter:image:alt':p.imageAlt
};}
function schema(p){
 const author={'@id':SITE+'/#author'},website={'@id':SITE+'/#website'};
 const item={'@type':p.photo?'ItemPage':p.key==='main'?'WebPage':'CollectionPage','@id':p.url+'#webpage',url:p.url,name:p.title,description:p.description,inLanguage:'ru',isPartOf:website,author,image:p.image};
 const graph=[
  {'@type':'Person',...author,name:'Денис Волошин',url:SITE+'/',jobTitle:'Фотограф',sameAs:['https://www.instagram.com/denis___voloshin']},
  {'@type':'WebSite',...website,url:SITE+'/',name:'Денис Волошин — фотограф',inLanguage:'ru',creator:author},item
 ];
 if(p.photo){
  item.isPartOf={'@id':SITE+'/'+p.key+'/#webpage'};
  item.mainEntity={'@id':p.url+'#photograph'};
  graph.push({'@type':'ImageObject','@id':p.url+'#photograph',url:p.url,contentUrl:p.photo.url,thumbnailUrl:p.image,name:p.imageAlt,caption:p.description,width:p.photo.width,height:p.photo.height,creator:author});
 }
 return {'@context':'https://schema.org','@graph':graph};
}
const api={SITE,photoPath,page,tags,schema};
if(typeof module==='object'&&module.exports)module.exports=api;
else window.PortfolioMetadata=api;
})();
