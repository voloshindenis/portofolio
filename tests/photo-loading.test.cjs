'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../assets/site.js'),'utf8');
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}};
const tick=async()=>{for(let i=0;i<8;i++)await Promise.resolve()};
const part=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end));
const feedback=()=>({state:'hidden',retry:null,begin(){this.state='loading';this.retry=null},clear(){this.state='hidden';this.retry=null},error(retry){this.state='error';this.retry=retry}});

test('preloader distinguishes decoded success, network failure, decode failure and timeout',async()=>{
 const images=[],timers=new Set();
 class Image{constructor(){images.push(this);this.naturalWidth=1680}decode(){return Promise.resolve()}}
 const context=vm.createContext({Image,setTimeout:fn=>{timers.add(fn);return fn},clearTimeout:fn=>timers.delete(fn)});
 vm.runInContext(part('const load=','const reduce=')+'this.load=load;',context);
 const success=context.load('ok');await images[0].onload();assert.equal(await success,true);assert.equal(timers.size,0);
 const failed=context.load('broken');images[1].onerror();assert.equal(await failed,false);
 const invalid=context.load('invalid');images[2].decode=()=>Promise.reject(Error('decode'));await images[2].onload();assert.equal(await invalid,false);
 const stalled=context.load('stalled');const late=images[3].onload;[...timers][0]();assert.equal(await stalled,false);await late();assert.equal(timers.size,0);
});

function gallery(){
 const elements={'#gimg':{src:'a',alt:'a',style:{opacity:1}},'#gbg':{style:{backgroundImage:'a'}},'#seriesStatus':{textContent:'Вне времени · 01 / 03'}};
 const requests=[],fades=[],status=feedback();
 const context=vm.createContext({$:s=>elements[s],galFeedback:status,reduce:false,S:{mode:'vnevremeni'},PROJ:{vnevremeni:{name:'Вне времени',data:[{url:'a'},{url:'b'},{url:'c'}]},vglubine:{name:'В глубине',data:[{url:'x'},{url:'y'}]}},urls:a=>a.map(x=>x.url),photoAlt:u=>u,
  load:u=>{const d=deferred();requests.push({url:u,...d});return d.promise},sleep:()=>{const d=deferred();fades.push(d);return d.promise}});
 vm.runInContext(part("const gimg=$('#gimg')",'gal.addEventListener')+`
 G={mode:'vnevremeni',list:['a','b','c'],i:0};this.api={galGo,setGal,state:()=>G,busy:()=>!!gRequest};`,context);
 return {context,elements,requests,fades,status,api:context.api};
}
test('gallery keeps current photo until ready, then uses the existing fade',async()=>{
 const h=gallery(),pending=h.api.galGo(1);
 assert.equal(h.elements['#gimg'].src,'a');assert.equal(h.elements['#gimg'].style.opacity,1);assert.equal(h.fades.length,0);
 assert.equal(h.elements['#seriesStatus'].textContent,'Вне времени · 01 / 03');
 h.requests[0].resolve(true);await tick();assert.equal(h.elements['#gimg'].style.opacity,0);assert.equal(h.elements['#gimg'].src,'a');
 h.fades[0].resolve();await pending;assert.equal(h.elements['#gimg'].src,'b');assert.equal(h.elements['#gimg'].style.opacity,1);assert.equal(h.api.state().i,1);assert.equal(h.api.busy(),false);
 assert.equal(h.elements['#seriesStatus'].textContent,'Вне времени · 02 / 03');
});
test('failed gallery loads keep the frame and release the lock for retry',async()=>{
 const h=gallery(),pending=h.api.galGo(1);h.requests[0].resolve(false);await pending;
 assert.equal(h.elements['#gimg'].src,'a');assert.equal(h.elements['#gimg'].style.opacity,1);assert.equal(h.api.state().i,0);assert.equal(h.api.busy(),false);
 assert.equal(h.elements['#seriesStatus'].textContent,'Вне времени · 01 / 03');
 const retry=h.api.galGo(1);assert.equal(h.requests.length,2);h.requests[1].resolve(false);await retry;
});
test('late gallery loads cannot replace a new project or release its active request',async()=>{
 const h=gallery(),old=h.api.galGo(1);h.context.S.mode='vglubine';const next=h.api.setGal('vglubine');
 h.requests[0].resolve(true);await old;assert.equal(h.api.busy(),true);assert.equal(h.elements['#gimg'].src,'a');
 h.requests[1].resolve(true);await next;assert.equal(h.elements['#gimg'].src,'x');assert.equal(h.api.busy(),false);
 assert.equal(h.elements['#seriesStatus'].textContent,'В глубине · 01 / 02');
});
function viewer(){
 const elements=new Map();const element=()=>({style:{opacity:1},classList:{add(){},remove(){}},focus(){}});
 for(const key of ['#lb','#lbimg','#lbc'])elements.set(key,element());elements.get('#lbimg').src='a';
 const requests=[],fades=[],navigations=[],status=feedback();
 const context=vm.createContext({$:s=>elements.get(s),lbFeedback:status,grid:{querySelectorAll:()=>[]},matchMedia:()=>({matches:true}),bindViewerGestures:()=>()=>{},urls:a=>a.map(x=>x.url),PROJ:{vnevremeni:{name:'Series',data:[{id:'a',url:'a'},{id:'b',url:'b'}]}},S:{mode:'mini',from:'vnevremeni',photo:'a'},clearTimeout(){},document:{activeElement:null},history:{state:null},
  load:u=>{const d=deferred();requests.push(d);return d.promise},sleep:()=>{const d=deferred();fades.push(d);return d.promise}});
 context.nav=s=>{navigations.push(s.photo);context.S=s;context.api.syncLb()};
 vm.runInContext(part("const lbE=$('#lb')",'function bindViewerGestures')+`
 lbOn=true;lb={project:'vnevremeni',list:['a','b'],i:0};this.api={lbGo,syncLb,busy:()=>lbBusy,invalidate:()=>{lbVersion++;lbBusy=false}};`,context);
 return {context,requests,fades,navigations,status,image:elements.get('#lbimg'),api:context.api};
}
test('viewer preserves frame and URL during delay or failure, and can retry after success',async()=>{
 const h=viewer(),failed=h.api.lbGo(1);assert.equal(h.image.style.opacity,1);assert.deepEqual(h.navigations,[]);
 h.requests[0].resolve(false);await failed;assert.equal(h.image.src,'a');assert.equal(h.api.busy(),false);assert.deepEqual(h.navigations,[]);
 const success=h.api.lbGo(1);h.requests[1].resolve(true);await tick();assert.equal(h.image.style.opacity,0);assert.deepEqual(h.navigations,[]);
 h.fades[0].resolve();await success;assert.deepEqual(h.navigations,['b']);assert.equal(h.image.src,'b');assert.equal(h.image.style.opacity,1);assert.equal(h.api.busy(),false);
 const next=h.api.lbGo(-1);h.requests.at(-1).resolve(false);await next;assert.equal(h.api.busy(),false);
});
test('stale viewer request cannot navigate or unlock a newer request',async()=>{
 const h=viewer(),old=h.api.lbGo(1);h.api.invalidate();const current=h.api.lbGo(1);
 h.requests[0].resolve(true);await old;assert.deepEqual(h.navigations,[]);assert.equal(h.api.busy(),true);
 h.requests[1].resolve(false);await current;assert.equal(h.api.busy(),false);assert.equal(h.image.style.opacity,1);
});
test('closing and reopening during the fade does not leave the viewer invisible',async()=>{
 const h=viewer(),pending=h.api.lbGo(1);h.requests[0].resolve(true);await tick();assert.equal(h.image.style.opacity,0);
 h.context.S={mode:'mini',from:'vnevremeni',photo:null};h.api.syncLb();
 h.context.S={mode:'mini',from:'vnevremeni',photo:'a'};h.api.syncLb();
 assert.equal(h.image.style.opacity,1);h.fades[0].resolve();await pending;
 assert.equal(h.image.style.opacity,1);assert.equal(h.image.src,'a');assert.deepEqual(h.navigations,[]);assert.equal(h.api.busy(),false);
});

test('initial viewer load uses preview, offers retry and upgrades only after success',async()=>{
 const h=viewer();h.context.PROJ.vnevremeni.data[0].thumb='/preview/a';
 h.context.S.photo=null;h.api.syncLb();h.context.S.photo='a';h.api.syncLb();
 assert.equal(h.image.src,'/preview/a-800.jpg');assert.equal(h.status.state,'loading');
 h.requests[0].resolve(false);await tick();assert.equal(h.status.state,'error');assert.equal(h.image.src,'/preview/a-800.jpg');
 h.status.retry();assert.equal(h.status.state,'loading');h.requests[1].resolve(true);await tick();
 assert.equal(h.image.src,'a');assert.equal(h.status.state,'hidden');assert.deepEqual(h.navigations,[]);
});

test('late initial failure cannot overwrite feedback for a newer viewer frame',async()=>{
 const h=viewer();h.context.PROJ.vnevremeni.data[0].thumb='/preview/a';
 h.context.S.photo=null;h.api.syncLb();h.context.S.photo='a';h.api.syncLb();
 const next=h.api.lbGo(1);h.requests[0].resolve(false);await tick();assert.equal(h.status.state,'loading');
 h.requests[1].resolve(true);await tick();h.fades[0].resolve();await next;
 assert.equal(h.image.src,'b');assert.equal(h.status.state,'hidden');assert.deepEqual(h.navigations,['b']);
});

test('retry of failed next frame does not change URL until photo is ready',async()=>{
 const h=viewer();const first=h.api.lbGo(1);h.requests[0].resolve(false);await first;
 assert.equal(h.status.state,'error');const retry=h.status.retry();assert.equal(h.image.src,'a');assert.deepEqual(h.navigations,[]);
 h.requests[1].resolve(true);await tick();h.fades[0].resolve();await retry;await tick();
 assert.equal(h.image.src,'b');assert.deepEqual(h.navigations,['b']);assert.equal(h.status.state,'hidden');
});

test('gallery failure exposes retry, and a stale error cannot affect the new series',async()=>{
 const h=gallery(),pending=h.api.galGo(1);h.requests[0].resolve(false);await pending;
 assert.equal(h.status.state,'error');const retry=h.status.retry;
 h.context.S.mode='vglubine';const next=h.api.setGal('vglubine');retry();assert.equal(h.requests.length,2);
 h.requests[1].resolve(true);await next;assert.equal(h.status.state,'hidden');assert.equal(h.elements['#gimg'].src,'x');
});
