'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../assets/site.js'),'utf8');
const part=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end));

function harness(initial='/'){
 const location={};const update=url=>{const u=new URL(url,'https://example.test');Object.assign(location,{href:u.href,pathname:u.pathname,search:u.search,hash:u.hash})};update(initial);
 const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{id,isConnected:true,getClientRects:()=>[{}],focus(){document.activeElement=this},setAttribute(){}});return nodes.get(id)};
 const document={activeElement:node('#about')},listeners={},stack=[{url:location.href,state:null}];let index=0,pending=0,backs=0;
 const history={get state(){return stack[index].state},pushState(state,unused,url){stack.splice(index+1);stack.push({url,state});index++;update(url)},replaceState(state,unused,url){stack[index]={url,state};update(url)},back(){pending++;backs++}};
 const menu={contains:()=>false,classList:{contains:()=>false}};
 const context=vm.createContext({URLSearchParams,location,history,document,menu,modal:{scrollTop:0},lbOn:false,PROJ:{vglubine:{data:[{id:'p-one'}]},vnevremeni:{data:[{id:'p-two'}]}},photoPath:(key,id)=>'/'+key+'/'+id+'/',render(){},$:node,addEventListener:(name,fn)=>listeners[name]=fn});
 vm.runInContext(part('const PATHS=','const gal=')+part('function openModal(', '/* ================= ГАЛЕРЕЯ')+'this.api={nav,openModal,closeTop,syncHistoryRoute,historyRoute,state:()=>S};',context);
 context.api.syncHistoryRoute();
 function traverse(step){index+=step;assert.ok(index>=0&&index<stack.length,'valid history traversal');update(stack[index].url);listeners.popstate()}
 return {api:context.api,history,stack,location,document,node,context,back:()=>traverse(-1),forward:()=>traverse(1),flush(){while(pending){pending--;traverse(-1)}},get index(){return index},get backs(){return backs}};
}

test('Back closes About at the same URL before leaving the series; Forward reopens it',()=>{
 const h=harness();h.api.nav({mode:'vglubine'});const url=h.location.href;h.api.openModal('vglubine');
 assert.equal(h.location.href,url);assert.equal(h.index,2);
 h.back();assert.equal(h.api.state().modal,null);assert.equal(h.api.state().mode,'vglubine');assert.equal(h.document.activeElement.id,'#about');
 h.back();assert.equal(h.api.state().mode,'main');
 h.forward();h.forward();assert.equal(h.api.state().modal,'vglubine');assert.equal(h.document.activeElement.id,'#mbox');
});

test('repeated close clicks traverse only once and leave no extra Back step',()=>{
 const h=harness();h.api.nav({mode:'vnevremeni'});h.api.openModal('vnevremeni');
 h.api.closeTop();h.api.closeTop();h.api.nav({mode:'main'});
 assert.equal(h.backs,1);assert.equal(h.api.state().modal,'vnevremeni');h.flush();assert.equal(h.index,1);
 h.back();assert.equal(h.api.state().mode,'main');
});

test('About action replaces its entry with the grid, preserving the parent series',()=>{
 const h=harness();h.api.nav({mode:'vglubine'});h.api.openModal('vglubine');h.api.nav({mode:'mini',from:'vglubine'});
 assert.equal(h.index,2);assert.equal(h.history.state.infoOverlay,undefined);
 h.back();assert.equal(h.api.state().mode,'vglubine');assert.equal(h.api.state().modal,null);
 h.back();assert.equal(h.api.state().mode,'main');
});

test('Info opened repeatedly uses one entry and restores after reload initialization',()=>{
 const h=harness('/vnevremeni/#mini');h.api.openModal('info');h.api.openModal('info');assert.equal(h.index,1);
 vm.runInContext('S=mk({});prevFocus=null;',h.context);h.api.syncHistoryRoute();assert.equal(h.api.state().modal,'info');assert.equal(h.api.state().mode,'mini');
 h.api.closeTop();h.flush();assert.equal(h.api.state().modal,null);assert.equal(h.api.state().from,'vnevremeni');
});

test('modal history cannot leak into another route or a photo link',()=>{
 const h=harness('/vglubine/');h.api.openModal('vglubine');const saved=h.history.state;
 h.history.replaceState(saved,'','/vnevremeni/');h.api.syncHistoryRoute();assert.equal(h.api.state().modal,null);
 h.history.replaceState(saved,'','/vglubine/p-one/');h.api.syncHistoryRoute();assert.equal(h.api.state().modal,null);assert.equal(h.api.state().photo,'p-one');
});

test('photo overlay history still survives frame replacement after using About',()=>{
 const h=harness('/vglubine/');h.api.openModal('vglubine');h.api.nav({mode:'mini',from:'vglubine'});
 h.api.nav({mode:'mini',from:'vglubine',photo:'p-one'});assert.equal(h.history.state.photoOverlay,true);assert.equal(h.history.state.infoOverlay,undefined);
 h.api.nav({mode:'mini',from:'vglubine',photo:'p-one'},{replace:true});assert.equal(h.history.state.photoOverlay,true);
 h.back();assert.equal(h.api.state().mode,'mini');assert.equal(h.api.state().photo,null);assert.equal(h.api.state().modal,null);
});
