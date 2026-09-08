"use strict";

const assert = require("node:assert/strict");
const Core = require("../src/game-core.js");
// Preserve regression coverage for the original three-level prototype.
const levelPack = { levels: require("../src/level.js").legacyLevels };

const componentBoard = [
  [0, 0, 1],
  [0, 1, 1],
  [1, 1, 0],
];
assert.deepEqual(Core.getComponent(componentBoard, 0, 0).sort(), [[0, 0], [0, 1], [1, 0]].sort());
assert.equal(Core.getComponent(componentBoard, 2, 2).length, 1, "对角同色格不能连通");

const solutions = [
  [
    { color: 0, row: 1, col: 2 },
    { color: 3, row: 0, col: 1 },
    { color: 1, row: 0, col: 1 },
  ],
  [
    { color: 2, row: 4, col: 5 },
    { color: 0, row: 4, col: 5 },
    { color: 1, row: 4, col: 5 },
    { color: 2, row: 4, col: 5 },
    { color: 3, row: 4, col: 5 },
  ],
  [
    { color: 3, row: 0, col: 1 },
    { color: 3, row: 0, col: 3 },
    { color: 3, row: 1, col: 2 },
    { color: 2, row: 0, col: 1 },
    { color: 0, row: 0, col: 1 },
  ],
];

assert.equal(levelPack.levels.length, 3, "应提供三个等级的关卡");

levelPack.levels.forEach((level, levelIndex) => {
  assert.equal(
    Core.findShortestMove(level.board, level.targetColor, level.colors.length, level.moveLimit - 1),
    null,
    `${level.difficulty}关不应存在少于 ${level.moveLimit} 步的解`,
  );
  const game = new Core.PaletteGame(level);
  const initialBoard = Core.cloneBoard(game.board);
  const initialMoves = game.movesRemaining;

  const [sameRow, sameCol] = Core.getComponents(game.board)[0].cells[0];
  game.selectColor(game.board[sameRow][sameCol]);
  assert.equal(game.paint(sameRow, sameCol).reason, "same-color", `${level.difficulty}关染成原色不应消耗步数`);
  assert.equal(game.movesRemaining, initialMoves);

  const firstMove = solutions[levelIndex][0];
  game.selectColor(firstMove.color);
  const firstResult = game.paint(firstMove.row, firstMove.col);
  assert.equal(firstResult.changed, true);
  assert.deepEqual(firstResult.cells[0], [firstMove.row, firstMove.col], "扩散动画必须从点击格开始");
  assert.equal(game.undo(), true);
  assert.deepEqual(game.board, initialBoard);

  for (const move of solutions[levelIndex]) {
    game.selectColor(move.color);
    game.paint(move.row, move.col);
  }
  assert.equal(game.status, "won", `${level.difficulty}关应可在限定步数内完成`);
  assert.equal(game.movesRemaining, 0);
  assert.equal(Core.isSolved(game.board, level.targetColor), true);

  const hintGame = new Core.PaletteGame(level);
  for (let step = 0; step < level.moveLimit && hintGame.status === "playing"; step += 1) {
    const hintMove = hintGame.getHint();
    assert.ok(hintMove, `${level.difficulty}关在剩余步数内应存在提示`);
    hintGame.selectColor(hintMove.color);
    hintGame.paint(hintMove.row, hintMove.col);
  }
  assert.equal(hintGame.status, "won", `${level.difficulty}关应能沿动态提示通关`);
});

// Design contracts: sparse independent obstacles, exact five-move solution,
// repeated growth of the SAME region, and a tempting but losing first move.
const level = levelPack.levels[1];
assert.equal(level.rows, 10);
assert.equal(level.cols, 10);
assert.equal(level.colors.length, 4);
assert.equal(level.moveLimit, 5);
assert.equal(Core.countPlayableRegions(level.board), 1);
const obstacles = [];
level.board.forEach((row, r) => row.forEach((color, c) => {
  if (color === Core.BLOCKED_CELL) obstacles.push([r, c]);
  else assert.ok(color >= 0 && color < 4);
}));
assert.equal(obstacles.length, 6);
for (let i = 0; i < obstacles.length; i += 1) {
  for (let j = i + 1; j < obstacles.length; j += 1) {
    const [r, c] = obstacles[i];
    const [y, x] = obstacles[j];
    assert.ok(Math.max(Math.abs(r - y), Math.abs(c - x)) > 1, "障碍物不能边接或角接");
  }
}
const obstacleGame = new Core.PaletteGame(level);
for (const [row, col] of obstacles) {
  assert.equal(obstacleGame.paint(row, col).reason, "blocked");
}
assert.equal(obstacleGame.movesRemaining, 5);
assert.deepEqual(obstacleGame.board, level.board);

const growing = new Core.PaletteGame(level);
const sizes = [Core.getComponent(growing.board, 4, 5).length];
for (const color of [2, 0, 1, 2, 3]) {
  growing.selectColor(color);
  assert.equal(growing.paint(4, 5).changed, true);
  sizes.push(Core.getComponent(growing.board, 4, 5).length);
}
assert.deepEqual(sizes, [7, 29, 47, 67, 76, 94]);
assert.equal(growing.status, "won");
for (const [row, col] of obstacles) assert.equal(growing.board[row][col], Core.BLOCKED_CELL);

// Enumerate all 17 regions x 3 other colors, including non-merging moves.
const viableStarts = [];
for (const component of Core.getComponents(level.board)) {
  for (let color = 0; color < 4; color += 1) {
    if (color === component.color) continue;
    const trial = new Core.PaletteGame(level);
    const [row, col] = component.cells[0];
    trial.selectColor(color);
    trial.paint(row, col);
    if (Core.solveRegions(trial.board, 3, 4, 4)) viableStarts.push({ row, col, color });
  }
}
assert.deepEqual(viableStarts, [{ row: 4, col: 5, color: 2 }]);
const greedy = new Core.PaletteGame(level);
greedy.selectColor(1);
greedy.paint(4, 2);
assert.equal(Core.getComponent(greedy.board, 4, 2).length, 40);
assert.equal(greedy.getHint(), null, "面积最大的开局也可能错过五步解");
assert.equal(greedy.undo(), true);
assert.ok(greedy.getHint(), "撤销错误开局后提示应恢复");

const continued = new Core.PaletteGame(levelPack.levels[0]);
continued.status = "lost";
continued.movesRemaining = 0;
assert.equal(continued.continueWithMoves(2), true, "失败后应能获得一次续画步数");
assert.equal(continued.status, "playing");
assert.equal(continued.movesRemaining, 2);
assert.equal(continued.continueWithMoves(2), false, "同一次挑战不能重复续画");
assert.equal(continued.movesRemaining, 2);
continued.reset();
assert.equal(continued.continuationUsed, false, "重新挑战后应恢复续画资格");
assert.equal(continued.continueWithMoves(2), false, "进行中的关卡不能提前领取续画步数");

console.log("PALETTE_GAME_CORE_TEST=PASS");
