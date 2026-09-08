const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(require.resolve('../game.js'),'utf8');
for(const scroll of [false,true]) for(const initialLevel of (scroll?[0,3]:[0])) for(const [w,h] of [[390,844],[375,667],[320,568]]) {
  let now=10000, clears=0;
  const signals=[];
  const ctx=new Proxy({}, {get:(_,key)=>key==='clearRect'?()=>clears++:key==='measureText'?s=>({width:s.length*10}):String(key).startsWith('create')?()=>({addColorStop(){}}):()=>{},set:()=>true});
  const scope=vm.createContext({Date:{now:()=>now},__PALETTE_PREVIEW_LEVEL__:initialLevel,__PALETTE_SCROLL_MODE__:scroll,__PALETTE_STORY_MODE__:true,__PALETTE_STORY_SIGNAL__:type=>signals.push(type),require:name=>({
    './src/game-core.js':require('../src/game-core'), './src/level.js':require('../src/level'), './src/victory-effects.js':require('../src/victory-effects'),
    './src/ad-service.js':require('../src/ad-service'),
    './src/theme.js':require('../src/theme'),
    './src/night-ui.js':require('../src/night-ui'),
    './src/platform.js':{target:'browser',createCanvas:()=>({getContext:()=>ctx}),getSystemInfoSync:()=>({windowWidth:w,windowHeight:h,pixelRatio:1}),onTouchStart(){},requestAnimationFrame(){}}
  })[name]});
  vm.runInContext(source,scope); const run=s=>vm.runInContext(s,scope);
  run('draw()'); assert(clears>0,'story canvas must clear to transparent');
  run('handlePress(layout.hint.x+10,layout.hint.y+10)');assert(run('hint'),'浏览器设计预览应保留 development-only 免费提示');
  run('hint=null');
  run('handlePress(layout.tabBar.x+100,112)');assert.equal(signals.length,0,'hidden tabs must not reset');
  const fixture=require('../src/level').levels[initialLevel];
  const solution=require('../src/game-core').solveRegions(fixture.board,fixture.targetColor,4,fixture.moveLimit,fixture.portals).map(m=>[m.row,m.col,m.color]);
  for(const [r,c,color] of solution) {
    run(`game.selectColor(${color});handlePress(layout.board.x+(${c}+.5)*layout.board.cell,layout.board.y+(${r}+.5)*layout.board.cell)`);
    now+=2000;run('draw()');
  }
  assert.equal(run('game.status'),'won');
  assert.deepEqual(signals,[...solution.map(()=> 'paint'),'won']);
  assert.equal(run('confettiEffect'),null);
  now+=2500;run('draw()');if(!scroll)assert(run('layout.modalButton.h>=44'));
  run('restart()');assert.equal(signals.at(-1),'reset');assert.equal(run('game.movesRemaining'),fixture.moveLimit);assert.equal(run('levelIndex'),initialLevel);
}
console.log('STORY_LIVE_TEST=PASS (3 viewports; transparent render; paint/win/reset signals; no confetti)');
