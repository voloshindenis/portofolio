const test=require('node:test');
const assert=require('node:assert/strict');
const {prepareReorder}=require('../scripts/reorder-photos.cjs');
const photos=[1,2,3].map(n=>({id:'p-'+String(n).padStart(12,'0'),url:'https://example.com/'+n+'.jpg',thumb:'/assets/thumbs/'+n,alt:'Caption '+n,width:6192,height:4128}));
const source=()=>({projects:{vglubine:{data:structuredClone(photos)},vnevremeni:{data:[{id:'p-000000000004',url:'other'}]}},seo:{home:{image:photos[0].url}}});
const baseIds=photos.map(p=>p.id),input={project:'vglubine',baseIds,orderIds:[baseIds[2],baseIds[0],baseIds[1]]};
test('reordering preserves every photo field and does not change other content',()=>{
  const content=source(),before=structuredClone(content),result=prepareReorder(input,content);
  assert.deepEqual(result.data,[photos[2],photos[0],photos[1]]);assert.deepEqual(content,before);assert.equal(result.unchanged,false);
});
test('duplicates, omissions, foreign photos and stale snapshots cannot overwrite a gallery',()=>{
  for(const orderIds of [[baseIds[0],baseIds[0],baseIds[1]],baseIds.slice(1),[...baseIds,'p-000000000004'],['../bad',...baseIds.slice(1)]])assert.throws(()=>prepareReorder({...input,orderIds},source()));
  assert.throws(()=>prepareReorder({...input,baseIds:[...baseIds].reverse()},source()),/Порядок/);
  const changed=source();changed.projects.vglubine.data.push({id:'p-000000000005'});assert.throws(()=>prepareReorder(input,changed),/Состав/);
  assert.throws(()=>prepareReorder({...input,project:'vnevremeni'},source()),/Состав/);
});
test('retrying an already applied order is safe',()=>{
  const content=source();content.projects.vglubine.data=prepareReorder(input,content).data;
  assert.equal(prepareReorder(input,content).unchanged,true);
});
