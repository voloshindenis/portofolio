(function(){'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],sleep=ms=>new Promise(r=>setTimeout(r,ms));

/* ================= ДАННЫЕ ================= */
const {projects:PROJ,info:INFO,seo:SEO}=window.PORTFOLIO;
const vnevremeniDataFull=PROJ.vnevremeni.data,vglubineDataFull=PROJ.vglubine.data;

/* ================= ХЕЛПЕРЫ ================= */
const GALMODES=['main','vnevremeni','vglubine'],urls=a=>a.map(x=>x.url);
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
const allUrls=()=>[...new Set([...urls(vnevremeniDataFull),...urls(vglubineDataFull)])];
const load=u=>new Promise(r=>{const m=new Image();m.onload=m.onerror=r;m.src=u});
const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
const pad=n=>String(n).padStart(2,'0');

/* [ГБЗ] Главы проекта «Год без зеркал» (статус считался по датам) — закомментировано
const START=new Date(2026,8,1),now=new Date();
const day=Math.min(365,Math.max(0,Math.floor((now-START)/864e5)+1));
const chapters=TITLES.map((title,i)=>{const s=new Date(2026,8+i,1),e=new Date(2026,9+i,1);
 return{id:i+1,title,st:now>=e?'completed':now>=s?'current':'upcoming',dates:MONTHS[i]+' '+s.getFullYear(),...CONTENT[i+1]}});
const ch=id=>chapters.find(c=>c.id===id),curCh=chapters.find(c=>c.st==='current');
*/

/* ================= СОСТОЯНИЕ И РОУТЕР ================= */
/* Build-time and client metadata use the same photo URL and preview image. */
const META=window.PortfolioMetadata,{SITE,photoPath}=META;
let seoKey=null;
function updateSeo(key,id){
 const p=META.page(window.PORTFOLIO,key,id);if(seoKey===p.path)return;seoKey=p.path;
 document.title=p.title;
 $('h1.sr-only').textContent=p.heading;
 $('#canonical').href=p.url;
 Object.entries(META.tags(p)).forEach(([name,value])=>{const attr=name.startsWith('og:')?'property':'name';document.querySelector('meta['+attr+'="'+name+'"]').content=value});
 $('#structured-data').textContent=JSON.stringify(META.schema(p));
}

const PATHS={main:'/',vnevremeni:'/vnevremeni/',vglubine:'/vglubine/'};
const mk=s=>({mode:'main',from:null,chapter:null,modal:null,photo:null,...s});
let S=mk({}),prevFocus=null/* [ГБЗ] ,chapterPushed=false */;
function parse(path=location.pathname,hash=location.hash,search=location.search){
 const h=hash.slice(1),segments=path.split('/').filter(Boolean),segment=segments[0];
 let mode=Object.hasOwn(PROJ,segment)?segment:'main',state;
 if(segments.length===2&&Object.hasOwn(PROJ,segment)&&PROJ[segment].data.some(x=>x.id===segments[1]))return{mode:'mini',from:segment,photo:segments[1]};
 if(h.endsWith('-min')&&Object.hasOwn(PROJ,h.slice(0,-4)))state={mode:'mini',from:h.slice(0,-4)};
 else if(Object.hasOwn(PROJ,h))state={mode:h};
 else state=h==='mini'&&PROJ[mode]?{mode:'mini',from:mode}:{mode};
 const key=state.from||state.mode,id=new URLSearchParams(search).get('photo');
 if(id&&PROJ[key]?.data.some(x=>x.id===id))return{mode:'mini',from:key,photo:id};
 return state;
}
const ser=s=>{
 const query=new URLSearchParams(location.search);query.delete('photo');
 const path=s.photo?photoPath(s.from,s.photo):(PATHS[s.mode==='mini'?s.from:s.mode]||'/');
 return path+(query.size?'?'+query:'')+(s.mode==='mini'&&!s.photo?'#mini':'');
};
function nav(s,o={}){
 const previous=S;S=mk(s);const url=ser(S);
 if(url!==location.pathname+location.search+location.hash){
  const state=o.replace?history.state:{photoOverlay:!!(S.photo&&!previous.photo&&previous.mode==='mini'&&previous.from===S.from)};
  history[o.replace?'replaceState':'pushState'](state,'',url);
 }
 render();
}
addEventListener('popstate',()=>nav(parse(),{replace:true}));
addEventListener('hashchange',()=>nav(parse(),{replace:true}));

const gal=$('#gal'),grid=$('#grid'),modal=$('#modal'),menu=$('#menu');
/* [ГБЗ] const proj=$('#proj'),chap=$('#chap'); */
let gridFor=$('#gg').dataset.project||null/* [ГБЗ] ,shown=null */;
const LBL={/* [ГБЗ] godbezzerkal:'Год без зеркал', */vnevremeni:'Вне времени',vglubine:'В глубине'};
function render(){
 const d=document.body.dataset,ov=S.modal||S.chapter,on=(el,v)=>el.classList.toggle('on',!!v);
 d.mode=S.mode;ov?d.ov='1':delete d.ov;
 updateSeo(S.mode==='mini'?S.from:S.mode,S.photo);
 on(gal,GALMODES.includes(S.mode));on(grid,S.mode==='mini');on(modal,S.modal);
 /* [ГБЗ] on(proj,S.mode==='godbezzerkal');on(chap,S.chapter); */
 if(GALMODES.includes(S.mode))setGal(S.mode);else G.mode=null;
 if(S.mode==='mini'&&gridFor!==S.from)buildGrid(S.from);
 /* [ГБЗ] if(S.chapter!==shown){shown=S.chapter;if(shown){buildChapter(shown);chap.scrollTop=0}else setTimeout(()=>{if(!S.chapter)$('#chc').innerHTML=''},450)} */
 if(S.modal){$('#mbox').innerHTML=S.modal==='info'?INFO:modalHtml(S.modal)}
 const mt=$('#mt');mt.textContent=S.mode==='mini'?PROJ[S.from].name.toUpperCase():'';mt.dataset.v=S.from||'';mt.href=PATHS[S.from]||'/';
 $$('#nav [data-k],#menu [data-k]').forEach(b=>b.classList.toggle('act',b.dataset.k===S.mode||(S.mode==='mini'&&b.dataset.k===S.from)));
 menu.classList.remove('open');$('#menuBtn').setAttribute('aria-expanded','false');
 $('#gridBtn').href=(PATHS[S.mode]||'/')+'#mini';
 syncLb();
}
function modalHtml(k){const p=PROJ[k];
 return`<h2 class="mt">${p.name.toUpperCase()}</h2><div class="tx"><p>${p.text}</p></div><div class="row"><span class="it">${p.loc}</span><a class="lnk" href="${PATHS[k]}#mini" data-act="mini" data-v="${k}">перейти в галерею →</a></div>`}
function openModal(k){prevFocus=document.activeElement;S={...S,modal:k};render();$('#mbox').focus()}
/* [ГБЗ] function closeChapter(){if(chapterPushed){chapterPushed=false;history.back()}else nav({mode:'godbezzerkal'},{replace:true})} */
function closeTop(){
 if(lbOn)return lbClose();
 if(S.modal){S={...S,modal:null};render();prevFocus&&prevFocus.focus&&prevFocus.focus();return}
 /* [ГБЗ] if(S.chapter)return closeChapter(); */
 if(S.mode==='mini')nav({mode:S.from})}

/* ================= ГАЛЕРЕЯ ================= */
const gimg=$('#gimg'),gbg=$('#gbg');let G={mode:null,list:[],i:0},gBusy=false,autoOn=!reduce;
const pre=d=>{const u=G.list[(G.i+d+G.list.length)%G.list.length];u&&load(u)};
function setGal(mode){if(G.mode===mode)return;
 G={mode,list:mode==='main'?shuffle(allUrls()):urls(PROJ[mode].data),i:0};autoOn=!reduce;
 gimg.src=G.list[0]||'';gimg.alt=photoAlt(G.list[0]);gbg.style.backgroundImage=`url('${G.list[0]}')`;gimg.style.opacity=1;pre(1);pre(-1)}
async function galGo(d){if(gBusy||!G.list.length)return;gBusy=true;
 const i=(G.i+d+G.list.length)%G.list.length,u=G.list[i];gimg.style.opacity=0;await sleep(150);await load(u);
 gimg.src=u;gimg.alt=photoAlt(u);gbg.style.backgroundImage=`url('${u}')`;gimg.style.opacity=1;G.i=i;gBusy=false;pre(1);pre(-1)}
gal.addEventListener('click',e=>{autoOn=false;galGo(e.clientX<innerWidth/2?-1:1)});
setInterval(()=>{if(autoOn&&GALMODES.includes(S.mode)&&!S.modal&&!S.chapter&&!lbOn&&!document.hidden)galGo(1)},5000);
const THUMB_SIZES='(max-width:347px) calc(100vw - 40px), (max-width:505px) calc((100vw - 48px)/2), (max-width:663px) calc((100vw - 56px)/3), (max-width:768px) calc((100vw - 64px)/4), (max-width:955px) calc((100vw - 160px)/2), (max-width:1231px) calc((100vw - 176px)/3), (max-width:1507px) calc((100vw - 192px)/4), (max-width:1600px) calc((100vw - 208px)/5), 278.4px';
function photoAlt(url){
 for(const p of Object.values(PROJ)){const i=p.data.findIndex(x=>x.url===url);if(i>=0)return p.data[i].alt||p.name+', фото '+(i+1)}
 return 'Фотография Дениса Волошина';
}
function gridHtml(k){const p=PROJ[k];
 const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 return p.data.map((x,i)=>`<a class="gi" href="${photoPath(k,x.id)}" data-act="mph" data-v="${i}" data-project="${k}"><img src="${x.thumb}-800.jpg" srcset="${x.thumb}-400.jpg 400w, ${x.thumb}-800.jpg 800w" sizes="${THUMB_SIZES}" width="${x.width}" height="${x.height}" alt="${esc(x.alt||p.name+', фото '+(i+1))}" loading="lazy" decoding="async"></a>`).join('');
}
function buildGrid(k){gridFor=k;$('#gg').dataset.project=k;$('#gg').innerHTML=gridHtml(k);grid.scrollTop=0}

/* ================= ЛАЙТБОКС ================= */
const lbE=$('#lb'),lbImg=$('#lbimg');let lb={list:[],i:0},lbOn=false,lbBusy=false,sx=null,swiped=false,lbVersion=0,lbFocus=null,shareTimer;
const lbCnt=()=>{$('#lbc').textContent=`${lb.i+1} / ${lb.list.length}`};
function syncLb(){
 if(!S.photo||!PROJ[S.from]){
  if(lbOn){lbE.classList.remove('on');lbOn=false;lbBusy=false;lbVersion++;clearTimeout(shareTimer);
   if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});
   if(lbFocus?.isConnected)lbFocus.focus();
  }
  return;
 }
 const p=PROJ[S.from],i=p.data.findIndex(x=>x.id===S.photo);if(i<0)return;
 if(lbOn&&lb.list[lb.i]===p.data[i].url)return;
 const opening=!lbOn;if(opening)lbFocus=document.activeElement;
 lbVersion++;clearTimeout(shareTimer);lb={list:urls(p.data),i};lbImg.src=lb.list[i];lbImg.alt=photoAlt(lb.list[i]);lbImg.style.opacity=1;
 lbCnt();lbE.classList.add('on');lbOn=true;if(opening)lbE.focus();
}
function lbClose(){
 if(!lbOn)return;
 if(history.state?.photoOverlay)history.back();
 else nav({mode:'mini',from:S.from},{replace:true});
}
async function lbGo(d){if(lbBusy||!lb.list.length)return;lbBusy=true;
 const version=lbVersion,i=(lb.i+d+lb.list.length)%lb.list.length,u=lb.list[i];lbImg.style.opacity=0;await sleep(150);
 await load(u);if(!lbOn||lbVersion!==version){lbBusy=false;return}
 nav({...S,photo:PROJ[S.from].data[i].id},{replace:true});lbBusy=false;load(lb.list[(i+d+lb.list.length)%lb.list.length]);
}
lbE.addEventListener('pointerdown',e=>{sx=e.clientX;swiped=false});
lbE.addEventListener('pointerup',e=>{if(sx===null)return;const dx=e.clientX-sx;sx=null;if(Math.abs(dx)>50){swiped=true;lbGo(dx<0?1:-1)}});
lbE.addEventListener('click',e=>{if(swiped){swiped=false;return}if(e.target.closest('button'))return;lbGo(e.clientX<innerWidth/2?-1:1)});
if(!document.documentElement.requestFullscreen)$('#lbfs').hidden=true;

function shareFeedback(text){
 clearTimeout(shareTimer);$('#lbc').textContent=text;
 shareTimer=setTimeout(()=>{if(lbOn)lbCnt()},2200);
}
async function sharePhoto(){
 if(!lbOn||!S.photo)return;
 const {url,title}=META.page(window.PORTFOLIO,S.from,S.photo);
 if(navigator.share){
  try{await navigator.share({title,url});return}
  catch(e){if(e.name==='AbortError')return}
 }
 try{
  if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
  await navigator.clipboard.writeText(url);shareFeedback('Ссылка скопирована');
 }catch(e){window.prompt('Ссылка на фотографию — скопируйте её:',url)}
}

/* [ГБЗ] ПРОЕКТ «ГОД БЕЗ ЗЕРКАЛ» И ГЛАВЫ — закомментировано
function cardHtml(c){const pv=c.photos&&c.photos[0];
 return`<button class="card ${c.st}${pv?' has':''}" ${c.st==='completed'?`data-act="chapter" data-v="${c.id}"`:'disabled'}>${pv?`<div class="pv" style="background-image:url('${pv}')"></div>`:''}<div><div><i class="dot"></i>Глава ${pad(c.id)}</div><div class="cname">${c.title}</div></div><div class="cb"><span>${c.dates}</span><span>→</span></div></button>`}
$('#cg').innerHTML=chapters.map(cardHtml).join('');
$('#pf').style.width=day/365*100+'%';
$('#psub').textContent=`12 глав · 12 месяцев · день ${day} из 365`;
if(curCh){$('#livet').textContent=`Год без зеркал · Глава ${pad(curCh.id)}`;$('#live').classList.add('has')}
let chapPhotos=[];
function videoHtml(id){if(!id)return'';
 const url='https://www.youtube.com/watch?v='+id;
 const box=location.protocol==='file:'
  ?`<a class="vid vf" href="${url}" target="_blank" rel="noopener noreferrer" style="background-image:url('https://i.ytimg.com/vi/${id}/hqdefault.jpg')"><span>▶ Смотреть влог на YouTube</span></a>`
  :`<div class="vid"><iframe src="https://www.youtube.com/embed/${id}?rel=0&modestbranding=1" title="Влог главы" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
 return box+`<p class="cap vl"><a href="${url}" target="_blank" rel="noopener noreferrer">Не воспроизводится? Открыть на YouTube</a></p>`}
function buildChapter(id){const c=ch(id),n=pad(id);chapPhotos=c.photos||[];
 const ph=chapPhotos.length?chapPhotos.map((u,i)=>`<button data-act="ph" data-v="${i}"><img src="${u}" alt="Глава ${n}, фото ${i+1}" loading="lazy" decoding="async"></button>`).join(''):'<p class="ph0">Фотографии будут добавлены</p>';
 const sm=[].concat(c.summary||'Вывод будет добавлен после завершения главы.').map(p=>`<p>${p}</p>`).join('');
 const pt=c.portrait?`<button class="pt" data-act="one" data-v="${c.portrait}" style="background-image:url('${c.portrait}')" aria-label="Автопортрет"></button>`:'<div class="pt" style="display:flex"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg></div>';
 $('#chc').innerHTML=`<h1 class="ct">${c.title}</h1><div class="cm"><span>Глава ${n}</span><span>${c.dates}</span></div>
${videoHtml(c.videoId)}
<div class="lab">Фотографии · ${chapPhotos.length}</div><div class="ph">${ph}</div>
<div class="lab">Автопортрет</div>${pt}<p class="cap">${c.portraitCaption||'«Автопортрет будет добавлен»'}</p>
<div class="lab">Вывод</div>${c.conclusionImage?`<div class="cc"><button data-act="one" data-v="${c.conclusionImage}"><img src="${c.conclusionImage}" alt="Изображение к выводу" loading="lazy"></button><div>${sm}</div></div>`:`<div class="cc">${sm}</div>`}`}
*/

/* ================= ТЕМА ================= */
const SUN='<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>',MOON='<svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>';
function setTheme(light,save){document.documentElement.classList.toggle('light',light);$('meta[name=theme-color]').content=light?'#fff':'#000';$('#theme').innerHTML=light?MOON:SUN;
 if(save)try{localStorage.setItem('dv_theme',light?'light':'dark')}catch(e){}}

/* ================= СОБЫТИЯ ================= */
const A={
 go:v=>nav({mode:v}),info:()=>openModal('info'),about:()=>openModal(S.mode==='mini'?S.from:S.mode),
 grid:()=>nav({mode:'mini',from:S.mode}),mini:v=>nav({mode:'mini',from:v}),
 /* [ГБЗ] chapter:v=>{chapterPushed=true;nav({mode:'godbezzerkal',chapter:+v})},
 ph:v=>openLb(chapPhotos,+v),one:v=>openLb([...new Set([v,...chapPhotos])],0), */
 mph:v=>{const x=PROJ[S.from]?.data[+v];if(x)nav({mode:'mini',from:S.from,photo:x.id})},
 theme:()=>{const r=document.documentElement;r.classList.add('tt');setTheme(!r.classList.contains('light'),true);setTimeout(()=>r.classList.remove('tt'),400)},
 menu:()=>{const o=menu.classList.toggle('open');$('#menuBtn').setAttribute('aria-expanded',o)},
 close:closeTop,lbclose:lbClose,lbprev:()=>lbGo(-1),lbnext:()=>lbGo(1),
 lbfs:()=>{document.fullscreenElement?document.exitFullscreen():lbE.requestFullscreen&&lbE.requestFullscreen().catch(()=>{})},
 share:sharePhoto};
document.addEventListener('click',e=>{const t=e.target.closest('[data-act]');
 if(t){
  if(t.matches('a[href]')){if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||t.hasAttribute('download')||t.target==='_blank')return;e.preventDefault()}
  A[t.dataset.act]&&A[t.dataset.act](t.dataset.v);return
 }
 if(menu.classList.contains('open')&&!e.target.closest('#menu'))menu.classList.remove('open')});
modal.addEventListener('click',e=>{if(e.target===modal)closeTop()});
document.addEventListener('keydown',e=>{const k=e.key;
 if(lbOn){if(k==='ArrowLeft')lbGo(-1);else if(k==='ArrowRight')lbGo(1);else if(k==='Escape')lbClose();else return;e.preventDefault();return}
 if(k==='Escape'){closeTop();return}
 const step=k==='ArrowLeft'||k==='ArrowRight'||(k===' '&&!e.target.closest('button,a'));
 if(!step||S.modal||S.chapter)return;const d=k==='ArrowLeft'?-1:1;
 if(GALMODES.includes(S.mode)){e.preventDefault();autoOn=false;galGo(d)}});

/* ================= ЗАПУСК ================= */
const NAV=[/* [ГБЗ] ['godbezzerkal','Год без зеркал'], */['vnevremeni','Вне времени'],['vglubine','В глубине'],['info','Инфо']];
setTheme(document.documentElement.classList.contains('light'));
nav(parse(),{replace:true});
})();
