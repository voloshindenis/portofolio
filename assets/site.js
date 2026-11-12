(function(){'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],sleep=ms=>new Promise(r=>setTimeout(r,ms));

/* ================= ДАННЫЕ ================= */
const {projects:PROJ,info:INFO}=window.PORTFOLIO;
const vnevremeniDataFull=PROJ.vnevremeni.data,vglubineDataFull=PROJ.vglubine.data;

/* ================= ХЕЛПЕРЫ ================= */
const GALMODES=['main','vnevremeni','vglubine'],urls=a=>a.map(x=>x.url);
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
const allUrls=()=>[...new Set([...urls(vnevremeniDataFull),...urls(vglubineDataFull)])];
// Preloads never reject: speculative neighbour loads must not produce unhandled errors.
const load=u=>new Promise(resolve=>{
 const image=new Image();let settled=false;
 const finish=ok=>{if(settled)return;settled=true;clearTimeout(timer);image.onload=image.onerror=null;resolve(ok)};
 const timer=setTimeout(()=>finish(false),20000);
 image.onerror=()=>finish(false);
 image.onload=async()=>{
  try{if(image.decode)await image.decode();finish(image.naturalWidth>0)}catch(e){finish(false)}
 };
 image.src=u;
});
const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;

/* ================= СОСТОЯНИЕ И РОУТЕР ================= */
/* Build-time and client metadata use the same photo URL and preview image. */
const META=window.PortfolioMetadata,{photoPath}=META;
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
const mk=s=>({mode:'main',from:null,modal:null,photo:null,...s});
let S=mk({}),prevFocus=null;
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

// Isolate overlays without changing their layout or transition animations.
function syncFocusScope(){
 const viewer=!!S.photo,info=!!S.modal;
 const allowed=viewer?[lbE]:info?[modal,$('#top')]:null;
 for(const el of document.body.children){
  if(el.matches('script'))continue;
  el.inert=allowed?!allowed.includes(el):el===menu&&!menu.classList.contains('open');
 }
}
function trapOverlayTab(event){
 if(event.key!=='Tab'||(!lbOn&&!S.modal))return;
 const roots=lbOn?[lbE]:[modal,$('#top')];
 const items=$$('a[href],button,[tabindex]')
  .filter(el=>roots.some(root=>root.contains(el))&&!el.disabled&&el.tabIndex>=0&&!el.closest('[inert]')&&el.getClientRects().length&&getComputedStyle(el).visibility==='visible');
 if(!items.length){event.preventDefault();return}
 const index=items.indexOf(document.activeElement);
 if(index<0||event.shiftKey&&index===0||!event.shiftKey&&index===items.length-1){
  event.preventDefault();items[event.shiftKey?items.length-1:0].focus();
 }
}

let gridFor=$('#gg').dataset.project||null;
function render(){
 const d=document.body.dataset,ov=S.modal,on=(el,v)=>el.classList.toggle('on',!!v);
 d.mode=S.mode;ov?d.ov='1':delete d.ov;
 updateSeo(S.mode==='mini'?S.from:S.mode,S.photo);
 on(gal,GALMODES.includes(S.mode));on(grid,S.mode==='mini');on(modal,S.modal);

 if(GALMODES.includes(S.mode))setGal(S.mode);else G.mode=null;
 if(S.mode==='mini'&&gridFor!==S.from)buildGrid(S.from);

 if(S.modal){$('#mbox').innerHTML=S.modal==='info'?INFO:modalHtml(S.modal)}
 const mt=$('#mt');mt.textContent=S.mode==='mini'?PROJ[S.from].name.toUpperCase():'';mt.dataset.v=S.from||'';mt.href=PATHS[S.from]||'/';
 for(const link of menu.querySelectorAll('a[data-v]')){
   const mini=S.mode==='mini';
   link.dataset.act=mini?'mini':'go';
   link.href=PATHS[link.dataset.v]+(mini?'#mini':'');
 }
 const activeSection=S.modal==='info'?'info':S.mode==='mini'?S.from:S.mode;
 $$('#nav [data-k],#menu [data-k]').forEach(b=>b.classList.toggle('act',b.dataset.k===activeSection));
 menu.classList.remove('open');$('#menuBtn').setAttribute('aria-expanded','false');
 $('#gridBtn').href=(PATHS[S.mode]||'/')+'#mini';
 syncFocusScope();
 syncLb();
}
function modalHtml(k){const p=PROJ[k];
 return`<h2 class="mt">${p.name.toUpperCase()}</h2><div class="tx"><p>${p.text}</p></div><div class="row"><span class="it">${p.loc}</span><a class="lnk" href="${PATHS[k]}#mini" data-act="mini" data-v="${k}">перейти в галерею →</a></div>`}
function openModal(k){prevFocus=menu.contains(document.activeElement)?$('#menuBtn'):document.activeElement;S={...S,modal:k};render();modal.scrollTop=0;$('#mbox').focus({preventScroll:true})}

function closeTop(){
 if(lbOn)return lbClose();
 if(menu.classList.contains('open')){menu.classList.remove('open');$('#menuBtn').setAttribute('aria-expanded','false');syncFocusScope();$('#menuBtn').focus();return}
 if(S.modal){S={...S,modal:null};render();prevFocus&&prevFocus.focus&&prevFocus.focus();return}

 if(S.mode==='mini')nav({mode:S.from})}

/* ================= ГАЛЕРЕЯ ================= */
const gimg=$('#gimg'),gbg=$('#gbg');let G={mode:null,list:[],i:0},gRequest=null,autoOn=!reduce;
const pre=d=>{const u=G.list[(G.i+d+G.list.length)%G.list.length];u&&load(u)};
async function setGal(mode){if(G.mode===mode)return;
 const state=G={mode,list:mode==='main'?shuffle(allUrls()):urls(PROJ[mode].data),i:0};autoOn=!reduce;
 const request=gRequest={};gimg.style.opacity=1;
 try{
  const u=state.list[0];
  if(!u||!await load(u)||G!==state||gRequest!==request||S.mode!==mode)return;
  gimg.src=u;gimg.alt=photoAlt(u,mode);gbg.style.backgroundImage=`url('${u}')`;pre(1);pre(-1);
 }finally{if(gRequest===request)gRequest=null}
}
async function galGo(d){if(gRequest||!G.list.length)return;
 const state=G,request=gRequest={},i=(state.i+d+state.list.length)%state.list.length,u=state.list[i];
 const current=()=>G===state&&gRequest===request&&S.mode===state.mode;
 try{
  if(!await load(u)||!current())return;
  gimg.style.opacity=0;await sleep(150);if(!current())return;
  gimg.src=u;gimg.alt=photoAlt(u,state.mode);gbg.style.backgroundImage=`url('${u}')`;state.i=i;pre(1);pre(-1);
 }finally{if(gRequest===request){gimg.style.opacity=1;gRequest=null}}
}
gal.addEventListener('click',e=>{autoOn=false;galGo(e.clientX<innerWidth/2?-1:1)});
setInterval(()=>{if(autoOn&&GALMODES.includes(S.mode)&&!S.modal&&!lbOn&&!document.hidden)galGo(1)},5000);
const THUMB_SIZES='auto, (max-width:347px) calc(100vw - 40px), (max-width:505px) calc((100vw - 48px)/2), (max-width:663px) calc((100vw - 56px)/3), (max-width:768px) calc((100vw - 64px)/4), (max-width:955px) calc((100vw - 160px)/2), (max-width:1231px) calc((100vw - 176px)/3), (max-width:1507px) calc((100vw - 192px)/4), (max-width:1600px) calc((100vw - 208px)/5), 278.4px';
function photoAlt(url,projectKey){
 for(const p of (PROJ[projectKey]?[PROJ[projectKey]]:Object.values(PROJ))){const i=p.data.findIndex(x=>x.url===url);if(i>=0)return p.data[i].alt||p.name+', фото '+(i+1)}
 return 'Фотография Дениса Волошина';
}
function gridHtml(k){const p=PROJ[k];
 const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 return p.data.map((x,i)=>`<a class="gi" href="${photoPath(k,x.id)}" data-act="mph"><img src="${x.thumb}-800.jpg" srcset="${x.thumb}-400.jpg 400w, ${x.thumb}-800.jpg 800w" sizes="${THUMB_SIZES}" width="${x.width}" height="${x.height}" alt="${esc(x.alt||p.name+', фото '+(i+1))}" loading="lazy" decoding="async"></a>`).join('');
}
function buildGrid(k){gridFor=k;$('#gg').dataset.project=k;$('#gg').innerHTML=gridHtml(k);grid.scrollTop=0}

/* ================= ЛАЙТБОКС ================= */
const lbE=$('#lb'),lbImg=$('#lbimg');let lb={list:[],i:0},lbOn=false,lbBusy=false,lbVersion=0,lbFocus=null,shareTimer;
const resetViewerGesture=bindViewerGestures(lbE,lbImg,lbGo);
const lbCnt=()=>{$('#lbc').textContent=`${lb.i+1} / ${lb.list.length}`};
function syncLb(){
 if(!S.photo||!PROJ[S.from]){
  if(lbOn){resetViewerGesture();lbE.classList.remove('on');lbOn=false;lbBusy=false;lbVersion++;clearTimeout(shareTimer);
   if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});
   if(lbFocus?.isConnected)lbFocus.focus();
  }
  return;
 }
 const p=PROJ[S.from],i=p.data.findIndex(x=>x.id===S.photo);if(i<0)return;
 if(lbOn&&lb.project===S.from&&lb.i===i)return;
 resetViewerGesture();
 const opening=!lbOn;if(opening)lbFocus=document.activeElement;
 lbVersion++;lbBusy=false;clearTimeout(shareTimer);lb={project:S.from,list:urls(p.data),i};lbImg.src=lb.list[i];lbImg.alt=p.data[i].alt||p.name+', фото '+(i+1);lbImg.style.opacity=1;
 lbCnt();lbE.classList.add('on');lbOn=true;if(opening)lbE.focus();
}
function lbClose(){
 if(!lbOn)return;
 if(history.state?.photoOverlay)history.back();
 else nav({mode:'mini',from:S.from},{replace:true});
}
async function lbGo(d){if(lbBusy||!lb.list.length)return;lbBusy=true;
 const version=lbVersion,project=S.from,i=(lb.i+d+lb.list.length)%lb.list.length,u=lb.list[i];
 const current=()=>lbOn&&lbVersion===version&&S.from===project;
 try{
  if(!await load(u)||!current())return;
  lbImg.style.opacity=0;await sleep(150);if(!current())return;
  nav({...S,photo:PROJ[project].data[i].id},{replace:true});
  load(PROJ[project].data[(i+d+PROJ[project].data.length)%PROJ[project].data.length].url);
 }finally{if(lbVersion===version){lbImg.style.opacity=1;lbBusy=false}}
}
function bindViewerGestures(viewer,image,step){
 const touches=new Map();
 const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
 let scale=1,offsetX=0,offsetY=0,start=null,pinchStart=null,suppressClick=false;

 function reset(){
  scale=1;offsetX=0;offsetY=0;
  image.style.removeProperty('transform');
  if(touches.size)suppressClick=true;
  touches.clear();start=null;pinchStart=null;
 }
 function setView(nextScale,x,y){
  const frame=viewer.getBoundingClientRect(),rect=image.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  const ratio=nextScale/scale;
  // The untransformed image can sit off-centre in landscape to clear the controls.
  function bound(value,centre,extent,low,high){
   if(extent<=high-low)return 0;
   return clamp(value,high-centre-extent/2,low-centre+extent/2);
  }
  offsetX=bound(x,rect.left+rect.width/2-offsetX,rect.width*ratio,frame.left,frame.right);
  offsetY=bound(y,rect.top+rect.height/2-offsetY,rect.height*ratio,frame.top,frame.bottom);
  scale=nextScale;
  image.style.transform=scale===1?'':`translate(${offsetX}px,${offsetY}px) scale(${scale})`;
 }
 function pair(){
  const [a,b]=touches.values();
  return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y))};
 }
 function beginPinch(){
  pinchStart=null;
  if(touches.size!==2)return;
  const mid=pair(),rect=image.getBoundingClientRect();
  pinchStart={mid,scale,offsetX,offsetY,anchorX:mid.x-rect.left-rect.width/2,anchorY:mid.y-rect.top-rect.height/2};
 }
 function updatePinch(){
  const mid=pair(),base=pinchStart;
  const nextScale=clamp(base.scale*mid.distance/base.mid.distance,1,4);
  const ratio=nextScale/base.scale;
  setView(nextScale,base.offsetX+mid.x-base.mid.x+base.anchorX*(1-ratio),
                    base.offsetY+mid.y-base.mid.y+base.anchorY*(1-ratio));
 }
 viewer.addEventListener('pointerdown',event=>{
  if(event.button!==0)return;
  if(!touches.size){
   suppressClick=false;
   if(event.target.closest('button'))return;
   start={id:event.pointerId,x:event.clientX,y:event.clientY};
  }
  if(event.pointerType!=='touch')return;
  touches.set(event.pointerId,{x:event.clientX,y:event.clientY});
  viewer.setPointerCapture(event.pointerId);
  beginPinch();
  if(touches.size>1||scale>1)suppressClick=true;
 });
 viewer.addEventListener('pointermove',event=>{
  const previous=touches.get(event.pointerId);
  if(!previous)return;
  const current={x:event.clientX,y:event.clientY};
  touches.set(event.pointerId,current);
  if(pinchStart){
   updatePinch();
  }else if(touches.size===1&&scale>1){
   setView(scale,offsetX+current.x-previous.x,offsetY+current.y-previous.y);
  }
 });
 viewer.addEventListener('pointerup',event=>{
  if(touches.delete(event.pointerId))beginPinch();
  if(start?.id!==event.pointerId)return;
  const dx=event.clientX-start.x,dy=event.clientY-start.y;
  start=null;
  if(suppressClick)return;
  if(Math.abs(dx)>50&&(event.pointerType!=='touch'||Math.abs(dx)>Math.abs(dy))){
   suppressClick=true;step(dx<0?1:-1);
  }else if(event.pointerType==='touch'&&Math.hypot(dx,dy)>12)suppressClick=true;
 });
 function cancel(event){
  if(touches.delete(event.pointerId)||start?.id===event.pointerId){
   beginPinch();start=null;suppressClick=true;
  }
 }
 viewer.addEventListener('pointercancel',cancel);
 viewer.addEventListener('lostpointercapture',cancel);
 viewer.addEventListener('click',event=>{
  if(suppressClick&&event.detail){event.stopPropagation();return;}
  if(scale===1&&!event.target.closest('button'))step(event.clientX<innerWidth/2?-1:1);
 });
 window.addEventListener('resize',reset);
 return reset;
}
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

/* ================= ТЕМА ================= */
const SUN='<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>',MOON='<svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>';
function setTheme(light,save){document.documentElement.classList.toggle('light',light);$('meta[name=theme-color]').content=light?'#fff':'#000';$('#theme').innerHTML=light?MOON:SUN;
 if(save)try{localStorage.setItem('dv_theme',light?'light':'dark')}catch(e){}}

/* ================= СОБЫТИЯ ================= */
const A={
 go:v=>nav({mode:v}),info:()=>openModal('info'),about:()=>openModal(S.mode==='mini'?S.from:S.mode),
 grid:()=>nav({mode:'mini',from:S.mode}),mini:v=>nav({mode:'mini',from:v}),
 theme:()=>{const r=document.documentElement;r.classList.add('tt');setTheme(!r.classList.contains('light'),true);setTimeout(()=>r.classList.remove('tt'),400)},
 menu:()=>{const o=menu.classList.toggle('open');$('#menuBtn').setAttribute('aria-expanded',o);syncFocusScope()},
 close:closeTop,lbclose:lbClose,lbprev:()=>lbGo(-1),lbnext:()=>lbGo(1),
 lbfs:()=>{document.fullscreenElement?document.exitFullscreen():lbE.requestFullscreen&&lbE.requestFullscreen().catch(()=>{})},
 share:sharePhoto};
document.addEventListener('click',e=>{const t=e.target.closest('[data-act]');
 if(t){
  if(t.dataset.act==='mph'&&t.matches('a[href]')){
   if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||t.target==='_blank')return;
   const [project,id]=new URL(t.href,location.href).pathname.split('/').filter(Boolean);
   if(!PROJ[project]?.data.some(photo=>photo.id===id))return;
   e.preventDefault();nav({mode:'mini',from:project,photo:id});return;
  }
  if(t.matches('a[href]')){if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||t.hasAttribute('download')||t.target==='_blank')return;e.preventDefault()}
  A[t.dataset.act]&&A[t.dataset.act](t.dataset.v);return
 }
 if(menu.classList.contains('open')&&!e.target.closest('#menu')){menu.classList.remove('open');$('#menuBtn').setAttribute('aria-expanded','false');syncFocusScope()}});
modal.addEventListener('click',e=>{if(e.target===modal)closeTop()});
document.addEventListener('keydown',e=>{const k=e.key;
 if(k==='Tab'){trapOverlayTab(e);return}
 if(lbOn){if(k==='ArrowLeft')lbGo(-1);else if(k==='ArrowRight')lbGo(1);else if(k==='Escape')lbClose();else return;e.preventDefault();return}
 if(k==='Escape'){closeTop();return}
 const step=k==='ArrowLeft'||k==='ArrowRight'||(k===' '&&!e.target.closest('button,a'));
 if(!step||S.modal)return;const d=k==='ArrowLeft'?-1:1;
 if(GALMODES.includes(S.mode)){e.preventDefault();autoOn=false;galGo(d)}});

/* ================= ЗАПУСК ================= */
setTheme(document.documentElement.classList.contains('light'));
nav(parse(),{replace:true});
})();
;(() => {
  const grid = document.getElementById('gg');
  grid.classList.add('packed');
  const gap = 6;
  function layout() {
    const tiles = [...grid.children];
    const css = getComputedStyle(grid);
    const rightScrollbar = grid.parentElement.offsetWidth - grid.parentElement.clientWidth;
    const width = grid.clientWidth - parseFloat(css.paddingLeft) - Math.max(0,parseFloat(css.paddingRight) - rightScrollbar);
    if (!width || !tiles.length) return;
    let top = parseFloat(css.paddingTop), index = 0;
    let seed = grid.dataset.project === 'vglubine' ? 3 : 19;
    const random = () => (seed = (Math.imul(seed,1664525)+1013904223)>>>0)/4294967296;
    const ratio = tile => {const img=tile.firstElementChild;return Number(img.getAttribute('width'))/Number(img.getAttribute('height')) || 1.5};
    function place(tile,x,y,w,h) {
      Object.assign(tile.style,{position:'absolute',left:(parseFloat(css.paddingLeft)+x)+'px',top:y+'px',width:w+'px',height:h+'px'});
    }
    if (width < 600) {
      const cellWidth = (width - gap) / 2;
      for (let i = 0; i < tiles.length; i += 2) {
        const pair = tiles.slice(i, i + 2);
        let rowHeight = 0;
        pair.forEach((tile, column) => {
          const height = cellWidth / ratio(tile);
          place(tile, column * (cellWidth + gap), top, cellWidth, height);
          rowHeight = Math.max(rowHeight, height);
        });
        top += rowHeight + gap;
      }
      grid.style.height = (top - gap + parseFloat(css.paddingBottom)) + 'px';
      return;
    }
    while(index<tiles.length){
      const remaining=tiles.length-index;
      if (remaining >= 6 && matchMedia('(min-width:992px) and (hover:hover) and (pointer:fine)').matches) {
        const counts = random() < .5 ? [1,2,3] : [2,1,3];
        const slots = counts.flatMap((n,col)=>Array.from({length:n},(_,row)=>({col,row,level:row/n})));
        slots.sort((a,b)=>a.level-b.level || a.col-b.col);
        slots.forEach((slot,i)=>slot.tile=tiles[index+i]);
        const columns=counts.map((n,col)=>slots.filter(s=>s.col===col));
        const weights=columns.map(group=>1/group.reduce((sum,s)=>sum+1/ratio(s.tile),0));
        const height=(width-2*gap+weights.reduce((sum,w,c)=>sum+w*(counts[c]-1)*gap,0))/weights.reduce((a,b)=>a+b,0);
        let x=0;
        columns.forEach((group,c)=>{
          const w=weights[c]*(height-(group.length-1)*gap);
          let y=top;
          for(const {tile} of group){const h=w/ratio(tile);place(tile,x,y,w,h);y+=h+gap}
          x+=w+gap;
        });
        index+=6;top+=height+gap;continue;
      }
      const stacked=remaining>=3 && (index===0 || random()<0.59);
      if(stacked){
        const left=random()<0.5;
        const [a,b,c]=tiles.slice(index,index+3);
        const big=left?a:b,upper=left?b:a;
        const combined=1/ratio(upper)+1/ratio(c);
        const smallWidth=(width-gap-ratio(big)*gap)/(1+ratio(big)*combined);
        const height=smallWidth*combined+gap,bigWidth=width-gap-smallWidth;
        const x=left?bigWidth+gap:0;
        place(big,left?0:smallWidth+gap,top,bigWidth,height);
        place(upper,x,top,smallWidth,smallWidth/ratio(upper));
        place(c,x,top+smallWidth/ratio(upper)+gap,smallWidth,smallWidth/ratio(c));
        index+=3;top+=height+gap;
      } else {
        const count=Math.min(remaining,width<600? (remaining===1?1:2) : (random()<0.5?2:3));
        const row=tiles.slice(index,index+count);
        // A lone last photo keeps the first slot of a two-photo row.
        const height = count === 1
          ? (width - gap) / (2 * ratio(row[0]))
          : (width - gap * (count - 1)) / row.reduce((sum,t)=>sum+ratio(t),0);
        let x=0;
        for(const tile of row){const w=ratio(tile)*height;place(tile,x,top,w,height);x+=w+gap}
        index+=count;top+=height+gap;
      }
    }
    grid.style.height=(top-gap+parseFloat(css.paddingBottom))+'px';
  }
  new MutationObserver(layout).observe(grid,{childList:true});
  let lastWidth;
  new ResizeObserver(([entry])=>{if(entry.contentRect.width!==lastWidth){lastWidth=entry.contentRect.width;layout()}}).observe(grid);
  layout();
})();
