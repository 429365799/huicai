"use strict";

// Offline only. Writes candidates to stdout, never runs in the game or builds.
const Core = require("../src/game-core.js");

function random(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function makeBoard(seed, size = 8, seedCount = 17) {
  const rng = random(seed);
  const seeds = [];
  while (seeds.length < seedCount) {
    const r = Math.floor(rng() * size), c = Math.floor(rng() * size);
    if (seeds.some((p) => p.r === r && p.c === c)) continue;
    seeds.push({ r, c, color: Math.floor(rng() * 4), bias: rng() * 0.6 });
  }
  const board = Array.from({ length: size }, (_, r) => Array.from({ length: size }, (_, c) => {
    let winner, distance = Infinity;
    for (const p of seeds) {
      const d = (p.r - r) ** 2 + (p.c - c) ** 2 + p.bias;
      if (d < distance) { distance = d; winner = p; }
    }
    return winner.color;
  }));
  return board;
}

// Exhaust all possible fixed starting regions and color sequences. If null,
// no strategy that repeatedly paints one growing region can meet the limit.
function solveAnchored(board, target, limit, portals = []) {
  function search(state, r, c, left) {
    if (Core.isSolved(state, target)) return [];
    if (!left) return null;
    const nonTarget = new Set(state.flat().filter((n) => n >= 0 && n !== target));
    if (nonTarget.size > left) return null;
    const cells = Core.getComponent(state, r, c, portals);
    for (let color = 0; color < 4; color++) {
      if (color === state[r][c]) continue;
      const next = Core.cloneBoard(state);
      cells.forEach(([y, x]) => { next[y][x] = color; });
      const suffix = search(next, r, c, left - 1);
      if (suffix) return [{ row: r, col: c, color }, ...suffix];
    }
    return null;
  }
  for (const comp of Core.getComponents(board, portals)) {
    const [r, c] = comp.cells[0];
    const result = search(board, r, c, limit);
    if (result) return result;
  }
  return null;
}

function viableStarts(level) {
  const good = [];
  for (const comp of Core.getComponents(level.board, level.portals)) {
    for (let color = 0; color < 4; color++) {
      if (color === comp.color) continue;
      const [row, col] = comp.cells[0];
      const game = new Core.PaletteGame(level);
      game.selectColor(color);
      game.paint(row, col);
      if (Core.solveRegions(game.board, level.targetColor, 4, level.moveLimit - 1, level.portals)) {
        good.push({ row, col, color });
      }
    }
  }
  return good;
}

if (require.main === module) {
  const kind = process.argv[2] || "expand";
  const firstSeed = Number(process.argv[3] || 1);
  const tries = Number(process.argv[4] || 300);
  const limit = kind === "expand" ? 4 : 5;
  let found = 0;
  for (let seed = firstSeed; seed < firstSeed + tries; seed++) {
    const board = makeBoard(seed, 8, kind === "portal" || kind === "prepare" ? 23 : 17);
    const components = Core.getComponents(board);
    if (components.length < 10 || components.length > 17) continue;
    if (components.filter((c) => c.cells.length === 1).length > 2) continue;
    const targetColor = seed % 4;
    const portals = kind === "portal" ? [[[1, 1], [6, 6]]] : [];
    if (portals.length && board[1][1] === board[6][6]) continue;
    const solution = Core.solveRegions(board, targetColor, 4, limit, portals);
    if (solution?.length !== limit) continue;
    const anchored = solveAnchored(board, targetColor, limit, portals);
    if (kind === "prepare" && anchored) continue;
    if ((kind === "expand" || kind === "return") && !anchored) continue;
    if (kind === "portal" && Core.solveRegions(board, targetColor, 4, limit)) continue;
    const level = { board, targetColor, moveLimit: limit, colors: [0, 1, 2, 3], portals };
    const starts = viableStarts(level);
    if (starts.length > (kind === "prepare" ? 6 : 3)) continue;
    console.log(JSON.stringify({ seed, kind, ...level, components: components.length, solution, anchored, starts }));
    if (++found >= 2) break;
  }
  if (!found) console.error(`NO_CANDIDATE ${kind} seeds=${firstSeed}..${firstSeed + tries - 1}`);
}

module.exports = { random, makeBoard, solveAnchored, viableStarts };
