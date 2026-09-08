"use strict";

// Offline authoring only. stdout only; never search at game startup.
const Core = require("../src/game-core.js");
const { makeBoard, solveAnchored, viableStarts } = require("./design-challenges.js");
const specs = [
  { number: 1, title: "相映", kind: "expand", size: 6, seeds: 10, moves: 3, starts: [5, 24] },
  { number: 2, title: "汇色", kind: "expand", size: 6, seeds: 14, moves: 4, starts: [3, 12] },
  { number: 3, title: "聚流", kind: "expand", size: 8, seeds: 17, moves: 4, starts: [1, 4], seedStart: 10 },
  { number: 4, title: "借色", kind: "return", size: 6, seeds: 14, moves: 4, starts: [3, 12] },
  { number: 5, title: "回环", kind: "return", size: 8, seeds: 17, moves: 4, starts: [2, 8] },
  { number: 6, title: "渡色", kind: "return", size: 8, seeds: 19, moves: 5, starts: [2, 6] },
  { number: 7, title: "回澜", kind: "return", size: 8, seeds: 17, moves: 5, starts: [1, 3], seedStart: 3159 },
  { number: 8, title: "砚痕", kind: "obstacle", size: 6, seeds: 12, moves: 4, starts: [3, 12], stones: 1 },
  { number: 9, title: "疏径", kind: "obstacle", size: 8, seeds: 16, moves: 4, starts: [2, 8], stones: 2 },
  { number: 10, title: "曲岸", kind: "obstacle", size: 8, seeds: 19, moves: 5, starts: [2, 5], stones: 3, repeat: true },
  { number: 11, title: "绕石", kind: "obstacle", size: 10, seeds: 21, moves: 5, starts: [1, 3], stones: 4, repeat: true },
  { number: 12, title: "遥应", kind: "portal", size: 6, seeds: 13, moves: 4, starts: [3, 12], portal: true },
  { number: 13, title: "牵光", kind: "portal", size: 8, seeds: 19, moves: 4, starts: [2, 8], portal: true },
  { number: 14, title: "共鸣", kind: "portal", size: 8, seeds: 21, moves: 5, starts: [2, 5], portal: true, stones: 2 },
  { number: 15, title: "双生", kind: "portal", size: 8, seeds: 23, moves: 5, starts: [1, 3], portal: true, stones: 3, repeat: true },
  { number: 16, title: "落笔", kind: "prepare", size: 6, seeds: 17, moves: 4, starts: [3, 10] },
  { number: 17, title: "相承", kind: "prepare", size: 8, seeds: 22, moves: 5, starts: [2, 5], stones: 2 },
  { number: 18, title: "合潮", kind: "prepare", size: 8, seeds: 23, moves: 5, starts: [1, 4], portal: true },
  { number: 19, title: "归海", kind: "prepare", size: 10, seeds: 24, moves: 5, starts: [1, 3], portal: true, stones: 4 },
];

// Exhaust ANY clicked region/color sequence without reusing a paint color.
function solveWithoutRepeat(board, target, limit, portals = []) {
  const failed = new Set();
  function search(state, left, used) {
    if (Core.isSolved(state, target)) return [];
    const needed = new Set(state.flat().filter(c => c >= 0 && c !== target));
    if (!left || needed.size > left) return null;
    const key = left + "/" + used + "/" + state.flat().join(",");
    if (failed.has(key)) return null;
    for (const comp of Core.getComponents(state, portals)) {
      for (let color = 0; color < 4; color++) {
        if (color === comp.color || (used & (1 << color))) continue;
        const next = Core.cloneBoard(state);
        for (const [r, c] of comp.cells) next[r][c] = color;
        const suffix = search(next, left - 1, used | (1 << color));
        if (suffix) { const [row, col] = comp.cells[0]; return [{ row, col, color }, ...suffix]; }
      }
    }
    failed.add(key);
    return null;
  }
  return search(board, Math.min(limit, 4), 0);
}

function stoneCells(size, count = 0) {
  return [[1, 2], [size - 2, size - 3], [2, size - 2], [size - 3, 1]].slice(0, count);
}

function growingAnswer(board, target, moves, portals) {
  const answer = solveAnchored(board, target, moves, portals);
  if (!answer) return null;
  const state = Core.cloneBoard(board);
  for (const { row, col, color } of answer) {
    const cells = Core.getComponent(state, row, col, portals);
    for (const [r, c] of cells) state[r][c] = color;
    if (Core.getComponent(state, row, col, portals).length <= cells.length) return null;
  }
  return answer;
}

function generate(spec) {
  const { number, kind, size, seeds, moves } = spec;
  const first = spec.seedStart ?? 10000 + number * 1000;
  for (let seed = first; seed < first + 70000; seed++) {
    if ((seed - first) % 250 === 0) console.error("SEARCH " + number + " seed=" + seed);
    const board = makeBoard(seed, size, seeds);
    const substrate = Core.cloneBoard(board);
    const portals = spec.portal ? [[[1, 1], [size - 2, size - 2]]] : [];
    for (const [r, c] of stoneCells(size, spec.stones)) board[r][c] = -2;
    if (Core.countPlayableRegions(board) !== 1 || new Set(board.flat().filter(c => c >= 0)).size !== 4) continue;
    const comps = Core.getComponents(board);
    if (comps.length > 17 || comps.filter(c => c.cells.length === 1).length > 2) continue;
    if (portals.length && board[1][1] === board[size - 2][size - 2]) continue;
    const targetColor = seed % 4;
    const anchored = growingAnswer(board, targetColor, moves, portals);
    if (kind !== "prepare" && !anchored) continue;
    if (kind === "prepare" && solveAnchored(board, targetColor, moves, portals)) continue;
    const solution = Core.solveRegions(board, targetColor, 4, moves, portals);
    if (solution?.length !== moves) continue;
    if ((kind === "return" || spec.repeat) && solveWithoutRepeat(board, targetColor, moves, portals)) continue;
    if (portals.length && Core.solveRegions(board, targetColor, 4, moves)) continue;
    // Restoring original pigment under the stones must save at least one move.
    if (spec.stones && !Core.solveRegions(substrate, targetColor, 4, moves - 1, portals)) continue;
    const level = { id: "river-" + String(number).padStart(2, "0"), number, title: spec.title, mechanic: kind,
      board, targetColor, moveLimit: moves, portals, colors: [0, 1, 2, 3] };
    const starts = viableStarts(level);
    if (starts.length < spec.starts[0] || starts.length > spec.starts[1]) continue;
    delete level.colors;
    console.error("SELECTED " + number + " " + spec.title + " seed=" + seed + " starts=" + starts.length);
    return { ...level, authoring: { seed, size, seeds, starts: starts.length, regions: comps.length,
      solution, anchored, substrate: spec.stones ? substrate : undefined } };
  }
  throw new Error("No verified candidate for " + spec.title);
}

if (require.main === module) {
  const requested = process.argv[2] === undefined ? null : Number(process.argv[2]);
  const selection = requested === null ? specs : specs.filter(s => s.number === requested);
  for (const spec of selection) console.log(JSON.stringify(generate(spec)));
}
module.exports = { specs, generate, stoneCells, solveWithoutRepeat, growingAnswer };
