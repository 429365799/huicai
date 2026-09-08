"use strict";

const assert = require("node:assert/strict");
const Core = require("../src/game-core.js");

// Independent cell-by-cell BFS oracle. It deliberately does not use the region
// graph or its pruning, so solver mistakes cannot validate themselves.
function gridDistance(initial, colors, target, limit, portals = []) {
  const queue = [{ board: initial, depth: 0 }];
  const seen = new Set([JSON.stringify(initial)]);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const { board, depth } = queue[cursor];
    if (board.every((row) => row.every((color) => color < 0 || color === target))) return depth;
    if (depth === limit) continue;
    for (let row = 0; row < board.length; row += 1) {
      for (let col = 0; col < board[row].length; col += 1) {
        const from = board[row][col];
        if (from < 0) continue;
        for (let color = 0; color < colors; color += 1) {
          if (color === from) continue;
          const next = board.map((line) => line.slice());
          const todo = [[row, col]];
          next[row][col] = color;
          for (let index = 0; index < todo.length; index += 1) {
            const [r, c] = todo[index];
            const adjacent = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
            for (const [a, b] of portals) {
              if (a[0] === r && a[1] === c) adjacent.push(b);
              if (b[0] === r && b[1] === c) adjacent.push(a);
            }
            for (const [y, x] of adjacent) {
              if (next[y]?.[x] === from) {
                next[y][x] = color;
                todo.push([y, x]);
              }
            }
          }
          const key = JSON.stringify(next);
          if (!seen.has(key)) {
            seen.add(key);
            queue.push({ board: next, depth: depth + 1 });
          }
        }
      }
    }
  }
  return null;
}

for (let encoding = 0; encoding < 256; encoding += 1) {
  const cells = Array.from({ length: 4 }, (_, index) => (encoding >> (index * 2)) & 3);
  for (const obstacles of [false, true]) {
    const board = [[cells[0], cells[1]], [cells[2], obstacles ? -2 : cells[3]]];
    const expected = gridDistance(board, 4, 3, 4);
    const actual = Core.solveRegions(board, 3, 4, 4);
    assert.equal(actual?.length ?? null, expected);
    if (actual) {
      const game = new Core.PaletteGame({ board, colors: [0, 1, 2, 3], targetColor: 3, moveLimit: 4 });
      for (const move of actual) {
        game.selectColor(move.color);
        assert.equal(game.paint(move.row, move.col).changed, true);
      }
      assert.equal(Core.isSolved(game.board, 3), true);
    }
  }
}

for (const board of [
  [[0, -2, 1], [-2, -2, -2], [2, -2, 3]],
  [[0, 1, 0], [2, -2, 2], [0, 1, 0]],
  [[1, 0, 2], [1, -2, 2], [3, 0, 3]],
]) {
  for (let limit = 0; limit <= 4; limit += 1) {
    assert.equal(Core.solveRegions(board, 3, 4, limit)?.length ?? null, gridDistance(board, 4, 3, limit));
  }
}
for (let encoding = 0; encoding < 256; encoding++) {
  const cells = Array.from({ length: 4 }, (_, i) => (encoding >> (i * 2)) & 3);
  const board = [cells.slice(0, 2), cells.slice(2)];
  for (const portals of [[[[0, 0], [1, 1]]], [[[0, 0], [1, 1]], [[0, 1], [1, 0]]]]) {
    const expected = gridDistance(board, 4, 3, 4, portals);
    const solution = Core.solveRegions(board, 3, 4, 4, portals);
    assert.equal(solution?.length ?? null, expected, "传色图搜索必须与独立逐格 BFS 一致");
    const game = new Core.PaletteGame({ board, targetColor: 3, colors: [0, 1, 2, 3], moveLimit: 4, portals });
    for (const move of solution || []) {
      game.selectColor(move.color);
      game.paint(move.row, move.col);
    }
    assert.equal(Core.isSolved(game.board, 3), true);
  }
}
console.log("PALETTE_SOLVER_ORACLE_TEST=PASS (512 ordinary + 512 portal boards + obstacle cases)");
