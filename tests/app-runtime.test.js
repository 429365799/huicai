"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const Core = require("../src/game-core.js");
const levelPack = require("../src/level.js");
const Effects = require("../src/victory-effects.js");
const Theme = require("../src/theme.js");
const Ads = require("../src/ad-service.js");
const source = fs.readFileSync(require.resolve("../game.js"), "utf8");

// Deterministic render/input smoke test, not a substitute for browser visuals.
for (const [w, h] of [[390, 844], [375, 667], [320, 568]]) {
  let now = 10000;
  const audioPlays = [];
  const handlers = {};
  const ctx = new Proxy({}, { get: (_, key) => {
    if (key === "measureText") return (s) => ({ width: s.length * 12 });
    if (String(key).startsWith("create")) return () => ({ addColorStop() {} });
    return () => {};
  }, set: () => true });
  const scope = vm.createContext({
    Date: { now: () => now },
    require: (name) => ({
      "./src/game-core.js": Core,
      "./src/level.js": levelPack,
      "./src/victory-effects.js": Effects,
      "./src/theme.js": Theme,
      "./src/night-ui.js": require("../src/night-ui.js"),
      "./src/ad-service.js": Ads,
      "./src/platform.js": {
        target: "wechat", createCanvas: () => ({ getContext: () => ctx }),
        createInnerAudioContext: () => {
          let src = "";
          return { get src() { return src; }, set src(value) { src = value; }, play() { audioPlays.push(src); }, stop() {} };
        },
        getSystemInfoSync: () => ({ windowWidth: w, windowHeight: h, pixelRatio: 2 }),
        onTouchStart(fn) { handlers.start = fn; }, onTouchMove(fn) { handlers.move = fn; },
        onTouchEnd(fn) { handlers.end = fn; }, onTouchCancel(fn) { handlers.cancel = fn; },
        onWheel(fn) { handlers.wheel = fn; }, requestAnimationFrame() {},
      },
    })[name],
  });
  vm.runInContext(source, scope);
  const run = (code) => vm.runInContext(code, scope);
  const effectStyles = JSON.parse(run("JSON.stringify(PAINT_EFFECT_STYLES)"));
  assert.deepEqual(effectStyles, ["ink", "paper", "ripple", "brush", "bloom"]);
  const generatedStyles = JSON.parse(run("JSON.stringify(Array.from({length:25},(_,index)=>effectStyleForLevel(index)))"));
  assert.deepEqual(generatedStyles, effectStyles.flatMap(style => Array(5).fill(style)), "每五关使用同一动效，25关覆盖五套");
  assert.equal(run("effectStyleForLevel(25)"), "ink", "五种动效轮换后循环");
  assert.equal(run("effectStyleForLevel(7)"), run("effectStyleForLevel(7)"), "同一关重开时动效必须稳定");
  const effectMotions = effectStyles.map((style) => JSON.parse(run(`JSON.stringify(paintTileMotion({ linear: 0.5, progress: 0.875, entryRow: 0, entryCol: 1 }, 40, '${style}'))`)));
  assert.equal(new Set(effectMotions.map((motion) => JSON.stringify(motion))).size, 5, "五种方案必须有不同的运动配方");
  assert.ok(effectMotions.every((motion) => motion.scaleX >= 0.95 && motion.scaleY >= 0.95), "方案不得再把色块压成细线");
  assert.ok(effectMotions[0].lift < 0 && effectMotions[0].scaleX > 1, "墨滴涌色应轻微鼓起和上浮");
  assert.ok(Math.abs(effectMotions[1].rotation) > 0, "柔纸起伏应包含方向性倾斜");
  assert.ok(effectMotions[2].scaleX > 1, "水面涟漪应保留呼吸放大");
  assert.equal(effectMotions[3].scaleX, 1, "湿笔扫染不应缩放色块");
  assert.ok(effectMotions[4].scaleX > effectMotions[0].scaleX, "色露绽放应比墨滴涌色更舒展");
  assert.ok(effectMotions.every((motion) => motion.lift <= -3.2), "五套动效都应有更明显但克制的上跳");
  for (const style of effectStyles) run(`drawPaintEffect(0,0,40,'#E66B60',{linear:.5,progress:.875,entryRow:0,entryCol:-1},1,2,'${style}')`);
  const settledMotion = JSON.parse(run("JSON.stringify(paintTileMotion({ linear: 1, progress: 1, entryRow: 0, entryCol: 1 }, 40, 'bloom'))"));
  assert.equal(settledMotion.scaleX, 1, "动效结束后尺寸应完全恢复");
  assert.ok(Math.abs(settledMotion.lift) < 1e-9, "动效结束后不应残留位移");
  assert.equal(run("level.number"), 0, "默认应从入门关开始");
  assert.equal(run("tabScroll"), 0);
  run("handlePress(layout.book.x + 22, layout.book.y + 22); draw();");
  assert.equal(run("albumOpen"), true);
  assert.equal(run("layout.albumTabs.length"), 20);
  run("handlePress(layout.albumTabs[6].x + 20, layout.albumTabs[6].y + 20); draw();");
  assert.equal(run("level.number"), 6);
  assert.equal(run("albumOpen"), false);
  run("loadLevel(0);");
  run("handlePress(layout.hint.x + 10, layout.hint.y + 10)");
  assert.equal(run("hint"), null, "平台版未配置广告时不得免费发放提示");
  assert.equal(run("toast.text"), "提示广告暂不可用");
  const touch = (x, y) => ({ identifier: 7, clientX: x, clientY: y });
  const barX = run("layout.tabBar.x"), barWidth = run("layout.tabBar.w");
  const barY = run("layout.tabBar.y + 22");
  const before = run("JSON.stringify(game.board)");
  handlers.start({ touches: [touch(barX + barWidth - 20, barY)] });
  handlers.move({ touches: [touch(barX + 20, barY)] });
  handlers.end({ changedTouches: [touch(barX + 20, barY)] });
  assert.equal(run("levelIndex"), 0, "滑动不能触发切关");
  assert.equal(run("JSON.stringify(game.board)"), before);
  assert.ok(run("tabScroll") > 0);
  handlers.wheel({ clientX: barX + 20, clientY: barY, deltaX: 100000, deltaY: 0 });
  assert.equal(run("tabScroll"), run("layout.maxTabScroll"));
  // The last tab must be reachable; pressing is deferred until release.
  const lastX = run("layout.tabs.at(-1).x + 20");
  handlers.start({ touches: [touch(lastX, barY)] });
  assert.equal(run("levelIndex"), 0);
  handlers.end({ changedTouches: [touch(lastX, barY)] });
  assert.equal(run("level.number"), 19);
  const same = run("levelIndex");
  handlers.start({ touches: [touch(barX + 30, barY)] });
  handlers.cancel();
  handlers.end({ changedTouches: [touch(barX + 30, barY)] });
  assert.equal(run("levelIndex"), same, "取消手势不得误点");
  handlers.wheel({ clientX: barX + 20, clientY: barY, deltaX: -100000, deltaY: 0 });
  assert.equal(run("tabScroll"), 0);
  assert.equal(handlers.wheel({ clientX: barX + 20, clientY: 300, deltaX: 100, deltaY: 0 }), false);
  // Vertical movement also cancels tapping without scrolling the tab strip.
  handlers.start({ touches: [touch(barX + 30, barY)] });
  handlers.move({ touches: [touch(barX + 30, barY + 48)] });
  handlers.end({ changedTouches: [touch(barX + 30, barY + 48)] });
  assert.equal(run("levelIndex"), same);
  assert.equal(run("tabScroll"), 0);
  // More levels should expand the strip rather than shrink the touch targets.
  run("const originalLevels = levelPack.levels; levelPack.levels = [...originalLevels, ...originalLevels, ...originalLevels, ...originalLevels]; resize(width, height);");
  assert.equal(run("layout.tabs.length"), 80);
  assert.equal(run("layout.tabWidth"), 74);
  run("scrollTabs(layout.maxTabScroll);");
  assert.ok(run("layout.tabs.at(-1).x + layout.tabWidth <= layout.tabBar.x + layout.tabBar.w + 0.01"));
  run("levelPack.levels = originalLevels; loadLevel(0);");
  for (let i = 0; i < levelPack.levels.length; i++) {
    run(`scrollTabs(${i} * (layout.tabWidth + layout.tabGap)); handlePress(layout.tabs[${i}].x + 10, layout.tabs[${i}].y + 10); draw();`);
    assert.equal(run("levelIndex"), i);
    assert.ok(run("layout.hint.y + layout.hint.h") <= h - 12, "操作按钮不能超出底边");
    assert.ok(run("layout.board.y + layout.board.size") < run("layout.card.y + layout.card.h - 40"));
    const answer = Core.solveRegions(levelPack.levels[i].board, levelPack.levels[i].targetColor, 4, levelPack.levels[i].moveLimit, levelPack.levels[i].portals);
    for (const move of answer) {
      run(`handlePress(layout.palette.x + ${move.color} * (layout.palette.size + layout.palette.gap) + 10, layout.palette.y + 10);
        handlePress(layout.board.x + (${move.col} + 0.5) * layout.board.cell, layout.board.y + (${move.row} + 0.5) * layout.board.cell);`);
      assert.equal(run("!!paintAnimation"), true);
      assert.equal(run("paintAnimation.originRow"), move.row);
      assert.equal(run("paintAnimation.originCol"), move.col);
      assert.equal(run("paintAnimation.effectStyle"),run("effectStyleForLevel(level.number)"),"自动模式应固定使用本关分配的动效");
      const waveStart=run("paintAnimation.startedAt"),waveDuration=run("paintAnimation.totalDuration");
      assert.ok(waveDuration>=360&&waveDuration<=1600);
      assert.equal(run(`paintAnimation.steps.get('${move.row},${move.col}').depth`),0);
      const soundLayers=JSON.parse(run("JSON.stringify(paintAnimation.soundLayers)"));
      assert.equal(soundLayers.length,run("paintAnimation.maxDepth+1"),"每个传播深度只能对应一个声音层");
      assert.equal(soundLayers.flatMap(layer=>layer.cells).length,run("paintAnimation.cells.length"),"每个染色色块必须且只能归入一个声音层");
      soundLayers.forEach((layer,depth)=>{
        assert.equal(layer.depth,depth);
        for(const [row,col] of layer.cells)assert.equal(run(`paintAnimation.steps.get('${row},${col}').depth`),depth,"同一声音层中的格子必须具有相同传播深度");
      });
      now=waveStart+180;
      const originProgress=run(`paintCellState(${move.row},${move.col},Date.now()).progress`);
      assert.ok(originProgress>0&&originProgress<1,"点击格必须先进入局部晕染中间态");
      const originMotion=JSON.parse(run(`JSON.stringify(paintTileMotion(paintCellState(${move.row},${move.col},Date.now()),40,paintAnimation.effectStyle))`));
      assert.ok(originMotion.lift<=-3.2,"本关分组动效应在中点明显上浮");
      const floodEdges=JSON.parse(run("JSON.stringify([...paintAnimation.steps].filter(([,s])=>s.parent).map(([key,s])=>[key,s.depth,s.parent]))"));
      for(const [key,depth,parent] of floodEdges){const [row,col]=key.split(',').map(Number);const portal=(levelPack.levels[i].portals||[]).some(pair=>pair.some(p=>p[0]===row&&p[1]===col)&&pair.some(p=>p[0]===parent[0]&&p[1]===parent[1]));assert.ok(portal||Math.abs(row-parent[0])+Math.abs(col-parent[1])===1);assert.ok(depth>0);}
      const before = run("game.movesRemaining");
      run("handlePress(layout.tabs[0].x + 10, layout.tabs[0].y + 10);");
      assert.equal(run("game.movesRemaining"), before, "扩散中应锁定输入");
      const audioBefore=audioPlays.length;
      now=waveStart+waveDuration;
      run("updatePaintAnimation(Date.now())");
      const layerSounds=audioPlays.slice(audioBefore);
      assert.equal(layerSounds.length,soundLayers.length,"同一传播层无论包含几个格子都只能播放一次音效");
      layerSounds.forEach((src,depth)=>{
        const note=soundLayers.length<=1?0:Math.round(depth*23/(soundLayers.length-1));
        assert.ok(src.endsWith(`/paint-${note}.wav`),"声音应按本次总传播层数映射到完整24级音域");
      });
      now = waveStart + waveDuration + 200;
      run("draw();");
    }
    now += 1000;
    run("draw();");
    assert.equal(run("game.status"), "won");
    assert.ok(run("layout.modalButton"));
    assert.ok(run("layout.modalButton.h") >= 44, "通关主按钮必须满足移动端最小触控高度");
    assert.ok(run("layout.modalButton.y") >= 0 && run("layout.modalButton.y + layout.modalButton.h") <= h, "通关主按钮不得超出短屏");
    if (i === 0) {
      run("handlePress(layout.modalButton.x + 10, layout.modalButton.y + 10); draw();");
      assert.equal(run("level.number"), 1, "初染通关按钮应进入相映");
      assert.equal(run("level.title"), "相映");
      run("loadLevel(0);");
      continue;
    }
    run("handlePress(layout.undo.x + 10, layout.undo.y + 10); draw();");
    assert.equal(run("game.status"), "playing");
    assert.equal(run("game.movesRemaining"), 1);
    run("handlePress(layout.restart.x + 10, layout.restart.y + 10); draw();");
    assert.equal(run("game.movesRemaining"), levelPack.levels[i].moveLimit);
  }
}
console.log("PALETTE_APP_RUNTIME_TEST=PASS (20 levels x 3 viewports; five-level effect bands; layer-scaled 24-note relay; scroll/tap/cancel/80-level strip)");
