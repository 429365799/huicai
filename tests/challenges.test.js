"use strict";
const assert = require("node:assert/strict");
const Core = require("../src/game-core.js");
const pack = require("../src/level.js");
const Theme = require("../src/theme.js");
const evidence = require("../docs/campaign-evidence.json");
const { makeBoard, solveAnchored, viableStarts } = require("../tools/design-challenges.js");
const { specs, stoneCells, solveWithoutRepeat } = require("../tools/generate-campaign.js");

assert.equal(pack.levels.length, 20);
assert.equal(new Set(pack.levels.map(l => l.id)).size, 20);
assert.equal(new Set(pack.levels.map(l => l.title)).size, 20);
assert.deepEqual(pack.levels.map(l => l.number), Array.from({ length: 20 }, (_, i) => i));
const intro = pack.levels[0];
assert.equal(intro.title, "初染");
assert.deepEqual(intro.board, pack.legacyLevels[0].board, "保留 6×6 切角三步入门");
assert.equal(Core.solveRegions(intro.board, intro.targetColor, 4, 3)?.length, 3);

// Reject color-permuted, mirrored or rotated copies disguised as new puzzles.
function fingerprint(board) {
  const variants = [];
  let current = board;
  for (let turn = 0; turn < 4; turn++) {
    for (const grid of [current, current.map(row => row.slice().reverse())]) {
      const colors = new Map();
      variants.push(grid.flat().map(c => {
        if (c < 0) return c;
        if (!colors.has(c)) colors.set(c, colors.size);
        return colors.get(c);
      }).join(","));
    }
    current = current[0].map((_, c) => current.map(row => row[c]).reverse());
  }
  return variants.sort()[0];
}
assert.equal(new Set(pack.levels.map(l => fingerprint(l.board))).size, 20);

for (const level of pack.levels) {
  assert.equal(level.colors.length, 4);
  assert.equal(new Set(level.board.flat().filter(c => c >= 0)).size, 4);
  assert.equal(level.chapter, Theme.get(level.number).chapter);
  assert.ok(level.moveLimit >= 3 && level.moveLimit <= 5);
  assert.ok(level.rules.length === 2 && level.rules.every(line => line.length <= 24));
  assert.equal(Core.countPlayableRegions(level.board), 1, "忽略传色点时彩格也必须物理连通");
  assert.ok(level.board.every(row => row.length === level.cols));
  if (level.number === 0) continue;
  const spec = specs.find(s => s.number === level.number);
  const proof = evidence.find(p => p.number === level.number);
  assert.ok(proof && spec);
  assert.equal(level.mechanic, spec.kind);
  assert.deepEqual(level.board, proof.board);
  assert.deepEqual(level.portals, proof.portals);
  const substrate = makeBoard(proof.authoring.seed, spec.size, spec.seeds);
  const rebuilt = Core.cloneBoard(substrate);
  const stones = stoneCells(spec.size, spec.stones);
  for (const [r, c] of stones) rebuilt[r][c] = -2;
  assert.deepEqual(level.board, rebuilt, "种子和砚石布局应可离线复现");
  assert.ok(stones.length <= level.rows * level.cols * 0.08);
  for (const a of stones) for (const b of stones) {
    if (a !== b) assert.ok(Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])) > 1);
  }
  assert.ok(level.board.flat().every(c => Number.isInteger(c) && (c === -2 || c >= 0 && c < 4)));
  assert.ok(Core.getComponents(level.board).filter(c => c.cells.length === 1).length <= 2, "避免碎色孤岛");
  const endpoints = level.portals.flat();
  assert.equal(new Set(endpoints.map(p => p.join(","))).size, endpoints.length);
  for (const [r, c] of endpoints) assert.ok(level.board[r]?.[c] >= 0);

  const start = performance.now();
  const solution = Core.solveRegions(level.board, level.targetColor, 4, level.moveLimit, level.portals);
  assert.equal(solution?.length, level.moveLimit, "验证最短步数，不只是预设答案");
  const game = new Core.PaletteGame(level);
  function replay(answer) {
    game.reset();
    for (const move of answer) {
      const before = Core.cloneBoard(game.board);
      const remaining = game.movesRemaining;
      game.selectColor(move.color);
      const result = game.paint(move.row, move.col);
      assert.equal(result.changed, true);
      assert.deepEqual(result.cells[0], [move.row, move.col]);
      assert.equal(game.undo(), true);
      assert.deepEqual(game.board, before);
      assert.equal(game.movesRemaining, remaining);
      game.paint(move.row, move.col);
    }
    assert.equal(game.status, "won");
    assert.equal(game.paint(0, 0).reason, "finished");
  }
  replay(solution);
  replay(proof.authoring.solution);
  game.reset();
  for (let i = 0; i < level.moveLimit; i++) {
    const hint = game.getHint();
    assert.ok(hint);
    game.selectColor(hint.color);
    assert.equal(game.paint(hint.row, hint.col).changed, true);
  }
  assert.equal(game.status, "won");
  const starts = viableStarts(level);
  assert.equal(starts.length, proof.authoring.starts);
  assert.ok(starts.length >= spec.starts[0] && starts.length <= spec.starts[1]);

  if (level.mechanics.includes("return")) {
    assert.equal(solveWithoutRepeat(level.board, level.targetColor, level.moveLimit, level.portals), null, "回色必须影响解法");
  }
  if (stones.length) {
    assert.deepEqual(proof.authoring.substrate, substrate);
    assert.ok(Core.solveRegions(substrate, level.targetColor, 4, level.moveLimit - 1, level.portals), "移除砚石恢复原色应至少省一步");
  }
  if (level.portals.length) {
    assert.equal(Core.solveRegions(level.board, level.targetColor, 4, level.moveLimit), null, "去掉传色点后原步数无解");
  }
  if (level.mechanic === "prepare") {
    assert.equal(solveAnchored(level.board, level.targetColor, level.moveLimit, level.portals), null, "不能固定任意一个起点过关");
  } else {
    assert.ok(proof.authoring.anchored);
    game.reset();
    for (const move of proof.authoring.anchored) {
      const before = Core.getComponent(game.board, move.row, move.col, level.portals).length;
      game.selectColor(move.color);
      assert.equal(game.paint(move.row, move.col).changed, true);
      assert.ok(Core.getComponent(game.board, move.row, move.col, level.portals).length > before, "每笔都能连上更大面积");
    }
    assert.equal(game.status, "won");
  }
  console.log(level.number + " " + level.title + " shortest=" + solution.length + " starts=" + starts.length
    + " regions=" + proof.authoring.regions + " checksMs=" + Math.round(performance.now() - start));
}
assert.deepEqual(pack.levels[19].mechanics, ["expand", "return", "obstacle", "portal", "prepare"]);

// Independent explicit portal lifecycle: connect -> recolor both -> undo twice.
const linked = new Core.PaletteGame({ board: [[0, 2, 1]], colors: [0, 1, 2, 3], targetColor: 3, moveLimit: 5, portals: [[[0, 0], [0, 2]]] });
linked.selectColor(1);
assert.deepEqual(linked.paint(0, 0).cells, [[0, 0]]);
linked.selectColor(3);
assert.deepEqual(linked.paint(0, 2).cells, [[0, 2], [0, 0]]);
assert.deepEqual(linked.board, [[3, 2, 3]]);
linked.undo();
assert.deepEqual(linked.board, [[1, 2, 1]]);
linked.undo();
assert.deepEqual(linked.board, [[0, 2, 1]]);
console.log("PALETTE_CHALLENGES_TEST=PASS (20 puzzles; shortest solutions; seeds; causal mechanics)");
