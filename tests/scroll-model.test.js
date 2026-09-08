const assert=require('node:assert/strict');
const M=require('../src/scroll-model');
assert.deepEqual(M.point(0),{x:.51,y:.14});
assert.ok(Math.abs(M.point(1).y-.51)<1e-10);
for(const [w,h] of [[320,568],[390,844],[430,932]]){
  let previous=M.point(0);
  for(let i=0;i<=1000;i++){
    const t=i/1000,p=M.point(t),c=M.camera(w,h,724,2172,p,t);
    assert.ok(p.y>=previous.y && Math.abs(p.x-previous.x)<.003);
    assert.ok(c.scale>0 && Number.isFinite(c.y));
    assert.ok(c.y<=0 && c.y+2172*c.scale>=h-1e-8);
    const overview=M.camera(w,h,724,2172,p,t,1);
    assert.ok(Math.abs(overview.y*2+2172*overview.scale-h)<1e-8);
    previous=p;
  }
}
assert.ok(M.patches.every((p,i,a)=>p.y+p.ry<.6 && (!i || p.at>a[i-1].at)));
for(let i=0;i<=1000;i++){
  const t=1+i/1000,p=M.point(t),prev=M.point(Math.max(1,t-.001));
  assert.ok(p.y>=prev.y && p.y<=.801);
  for(const [w,h] of [[320,568],[390,844],[430,932]]){
    const c=M.camera(w,h,724,2172,p,1);
    assert.ok(c.y<=0 && c.y+2172*c.scale>=h-1e-8);
  }
}
assert.ok(Math.abs(M.point(1+1e-8).y-M.point(1).y)<1e-6);
assert.ok(M.downstream.every(p=>p.at+.34<=1 && p.y+p.ry<.9));
console.log('SCROLL_MODEL_TEST=PASS (3 viewports; continuous path; camera bounds; restoration stops before next creek)');
