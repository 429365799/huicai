const assert = require('node:assert/strict');
const flow = require('../src/story-flow');
const {levels} = require('../src/level');
const cells = levels[0].board;
const route = flow.flood(cells);
assert.equal(route.length,cells.flat().filter(v=>v>=0).length);
assert.equal(new Set(route.map(([r,c])=>`${r},${c}`)).size,route.length);
for(const [r,c,d] of route) {
  if(d) assert(route.some(([a,b,e])=>e===d-1 && Math.abs(a-r)+Math.abs(b-c)===1));
  assert.equal(flow.radius(900,d,50),0);
  assert(flow.radius(1500,d,50)<=flow.radius(1800,d,50));
  assert(flow.radius(flow.duration,d,50)>0);
}
assert(flow.leafAt(1000).y>flow.leafAt(300).y+20);
assert(flow.leafAt(1000).angle>flow.leafAt(300).angle);
for(let t=0;t<=2700;t+=10) {
  const leaf=flow.leafAt(t);
  assert(leaf.x>=40 && leaf.x<=70 && leaf.y>=50 && leaf.y<=96);
  assert(leaf.scale>=.35 && leaf.scale<=1);
}
console.log('STORY_FLOW_TEST=PASS (connected reveal, bounded leaf motion, monotonic masks)');
