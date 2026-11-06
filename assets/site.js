(()=>{'use strict';
document.documentElement.classList.add('js');
const $=s=>document.querySelector(s),page=document.body.dataset.page,photos=JSON.parse($('#gallery-data').textContent);
const routes={main:'/',vnevremeni:'/vnevremeni/',vglubine:'/vglubine/',info:'/about/'};
function legacyRoute(){const legacy=location.hash.slice(1),key=legacy.replace(/-min$/,'');if(routes[key]&&routes[key]!==location.pathname){location.replace(routes[key]+(legacy.endsWith('-min')?'#photos':''));return true}return false}
if(legacyRoute())return;addEventListener('hashchange',legacyRoute);
document.querySelectorAll('#nav a,#menu a').forEach(a=>{if(a.pathname===location.pathname)a.setAttribute('aria-current','page')});
const menu=$('#menu'),menuBtn=$('#menuBtn');menu.inert=true;
menuBtn.onclick=()=>{const open=menu.classList.toggle('open');menu.inert=!open;menuBtn.setAttribute('aria-expanded',String(open))};
document.addEventListener('click',e=>{if(!e.target.closest('#menu,#menuBtn')){menu.classList.remove('open');menu.inert=true;menuBtn.setAttribute('aria-expanded','false')}});
const sun='<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M1 12h2M21 12h2M4 4l2 2M18 18l2 2M4 20l2-2M18 6l2-2"/></svg>',moon='<svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>';
function theme(){const light=document.documentElement.classList.contains('light');$('#theme').innerHTML=light?moon:sun;$('meta[name=theme-color]').content=light?'#fff':'#000'}
theme();$('#theme').onclick=()=>{document.documentElement.classList.toggle('light');theme();try{localStorage.setItem('dv_theme',document.documentElement.classList.contains('light')?'light':'dark')}catch(e){}};
let index=0,auto=!matchMedia('(prefers-reduced-motion:reduce)').matches;
const image=$('#gimg'),bg=$('#gbg'),gal=$('#gal'),lb=$('#lb'),lbimg=$('#lbimg');let li=0;
function show(i){if(!photos.length)return;index=(i+photos.length)%photos.length;image.src=photos[index];image.alt=(page==='main'?'Уличная фотография':page==='vglubine'?'В глубине':'Вне времени')+', фотография '+(index+1)+' — Денис Волошин';bg.style.backgroundImage='url("'+photos[index]+'")'}
if(gal){show(0);gal.onclick=e=>{if(e.target.closest('a,button'))return;auto=false;show(index+(e.clientX<innerWidth/2?-1:1))};setInterval(()=>{if(auto&&!document.hidden&&!lb.open&&!document.body.hasAttribute('data-grid')&&scrollY<innerHeight/2)show(index+1)},5000)}
function gridState(){const open=location.hash==='#photos'||location.hash.endsWith('-min');document.body.toggleAttribute('data-grid',open);if(open)scrollTo(0,0)}
if($('#gridBtn')){$('#gridBtn').onclick=()=>{location.hash='photos'};$('#close').onclick=()=>{history.replaceState(null,'',location.pathname);gridState();scrollTo(0,0)};gridState();addEventListener('hashchange',gridState)}
function lbShow(i){li=(i+photos.length)%photos.length;lbimg.src=photos[li];lbimg.alt=(page==='vglubine'?'В глубине':'Вне времени')+', фотография '+(li+1)+' — Денис Волошин';$('#lbc').textContent=(li+1)+' / '+photos.length}
document.querySelectorAll('[data-photo]').forEach(a=>a.onclick=e=>{e.preventDefault();lbShow(+a.dataset.photo);lb.showModal()});
function close(){if(document.fullscreenElement)document.exitFullscreen();lb.close()}
$('#share').onclick=()=>window.open('https://pinterest.com/pin/create/button/?url='+encodeURIComponent(location.href)+'&media='+encodeURIComponent(photos[li])+'&description='+encodeURIComponent('Фотография Дениса Волошина'),'_blank','noopener');$('#lbclose').onclick=close;$('#lbprev').onclick=()=>lbShow(li-1);$('#lbnext').onclick=()=>lbShow(li+1);
$('#lbfs').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else lb.requestFullscreen?.().catch(()=>{})};
if(!lb.requestFullscreen)$('#lbfs').hidden=true;
lb.onclick=e=>{if(!e.target.closest('button'))lbShow(li+(e.clientX<innerWidth/2?-1:1))};
let start=null,swiped=false;lb.addEventListener('pointerdown',e=>{start=e.clientX;swiped=false});lb.addEventListener('pointerup',e=>{if(start!==null&&Math.abs(e.clientX-start)>50){lbShow(li+(e.clientX<start?1:-1));swiped=true}start=null});lb.addEventListener('click',e=>{if(swiped){e.stopImmediatePropagation();swiped=false}},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){menu.classList.remove('open');menu.inert=true;menuBtn.setAttribute('aria-expanded','false');return}if(!lb.open&&e.target.closest('a,button,input'))return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){const step=e.key==='ArrowLeft'?-1:1;if(lb.open){e.preventDefault();lbShow(li+step)}else if(gal&&!document.body.hasAttribute('data-grid')){auto=false;show(index+step)}}});
})();