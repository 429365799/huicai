(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.PaletteGameCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const EMPTY_CELL = -1;
  const BLOCKED_CELL = -2;

  const DIRECTIONS = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  function cloneBoard(board) {
    return board.map((row) => row.slice());
  }

  // Portal pairs add a permanent adjacency edge. Like an ordinary edge, it
  // carries paint only while both endpoints have the same color.
  function getNeighbors(board, row, col, portals = []) {
    const cells = DIRECTIONS.map(([dr, dc]) => [row + dr, col + dc]);
    for (const [a, b] of portals) {
      if (a[0] === row && a[1] === col) cells.push(b);
      if (b[0] === row && b[1] === col) cells.push(a);
    }
    return cells.filter(([r, c]) => board[r]?.[c] >= 0);
  }

  function getComponent(board, startRow, startCol, portals = []) {
    const rows = board.length;
    const cols = board[0].length;
    const color = board[startRow] && board[startRow][startCol];
    if (color === undefined || color < 0) return [];

    const queue = [[startRow, startCol]];
    const visited = new Set([`${startRow},${startCol}`]);
    const cells = [];

    for (let index = 0; index < queue.length; index += 1) {
      const [row, col] = queue[index];
      cells.push([row, col]);

      for (const [nextRow, nextCol] of getNeighbors(board, row, col, portals)) {
        const key = `${nextRow},${nextCol}`;
        if (
          nextRow >= 0 &&
          nextRow < rows &&
          nextCol >= 0 &&
          nextCol < cols &&
          !visited.has(key) &&
          board[nextRow][nextCol] === color
        ) {
          visited.add(key);
          queue.push([nextRow, nextCol]);
        }
      }
    }

    return cells;
  }

  function getComponents(board, portals = []) {
    const visited = new Set();
    const components = [];

    for (let row = 0; row < board.length; row += 1) {
      for (let col = 0; col < board[row].length; col += 1) {
        const key = `${row},${col}`;
        if (board[row][col] < 0 || visited.has(key)) continue;
        const cells = getComponent(board, row, col, portals);
        cells.forEach(([cellRow, cellCol]) => visited.add(`${cellRow},${cellCol}`));
        components.push({ color: board[row][col], cells });
      }
    }

    return components;
  }

  function countPlayableRegions(board) {
    const rows = board.length;
    const visited = new Set();
    let regionCount = 0;

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < board[row].length; col += 1) {
        const startKey = `${row},${col}`;
        if (board[row][col] < 0 || visited.has(startKey)) continue;
        regionCount += 1;
        const queue = [[row, col]];
        visited.add(startKey);

        for (let index = 0; index < queue.length; index += 1) {
          const [currentRow, currentCol] = queue[index];
          for (const [rowDelta, colDelta] of DIRECTIONS) {
            const nextRow = currentRow + rowDelta;
            const nextCol = currentCol + colDelta;
            const key = `${nextRow},${nextCol}`;
            if (
              nextRow >= 0 &&
              nextRow < rows &&
              nextCol >= 0 &&
              nextCol < board[nextRow].length &&
              board[nextRow][nextCol] >= 0 &&
              !visited.has(key)
            ) {
              visited.add(key);
              queue.push([nextRow, nextCol]);
            }
          }
        }
      }
    }

    return regionCount;
  }

  function recolor(board, cells, color) {
    const nextBoard = cloneBoard(board);
    cells.forEach(([row, col]) => {
      nextBoard[row][col] = color;
    });
    return nextBoard;
  }

  function isSolved(board, targetColor) {
    return board.every((row) => row.every((cell) => cell < 0 || cell === targetColor));
  }

  // Contract each initial same-color region into a node. Nodes never split when
  // painting, so this graph preserves every legal move on the original grid.
  function solveRegions(board, targetColor, colorCount, maxDepth, portals = []) {
    const components = getComponents(board);
    const owners = board.map((row) => row.map(() => -1));
    components.forEach((component, index) => {
      component.cells.forEach(([row, col]) => { owners[row][col] = index; });
    });
    const neighbors = components.map(() => new Set());
    components.forEach((component, index) => {
      for (const [row, col] of component.cells) {
        for (const [r, c] of getNeighbors(board, row, col, portals)) {
          const other = owners[r]?.[c];
          if (other >= 0 && other !== index) neighbors[index].add(other);
        }
      }
    });
    const initial = components.map((component) => component.color);
    const failed = new Map();

    function search(state, remaining) {
      const nonTarget = new Set(state.filter((color) => color !== targetColor));
      if (nonTarget.size === 0) return [];
      if (nonTarget.size > remaining) return null;
      const key = state.join(",");
      if ((failed.get(key) ?? -1) >= remaining) return null;

      const visited = new Set();
      const candidates = [];
      for (let index = 0; index < state.length; index += 1) {
        if (visited.has(index)) continue;
        const group = [index];
        visited.add(index);
        const border = new Set();
        for (let cursor = 0; cursor < group.length; cursor += 1) {
          for (const other of neighbors[group[cursor]]) {
            if (state[other] !== state[index]) border.add(other);
            else if (!visited.has(other)) {
              visited.add(other);
              group.push(other);
            }
          }
        }
        // Include all colors, including moves that do not immediately merge.
        // Difficulty verification must not assume the intended strategy.
        for (let color = 0; color < colorCount; color += 1) {
          if (color === state[index]) continue;
          const next = state.slice();
          group.forEach((node) => { next[node] = color; });
          const gain = [...border].filter((node) => state[node] === color).length;
          candidates.push({ next, index, color, gain });
        }
      }
      candidates.sort((a, b) => b.gain - a.gain);
      for (const candidate of candidates) {
        const suffix = search(candidate.next, remaining - 1);
        if (suffix) {
          const [row, col] = components[candidate.index].cells[0];
          return [{ row, col, color: candidate.color }, ...suffix];
        }
      }
      failed.set(key, remaining);
      return null;
    }

    for (let depth = 0; depth <= maxDepth; depth += 1) {
      const solution = search(initial, depth);
      if (solution) return solution;
    }
    return null;
  }

  function findShortestMove(board, targetColor, colorCount, maxDepth, portals = []) {
    return solveRegions(board, targetColor, colorCount, maxDepth, portals)?.[0] || null;
  }

  class PaletteGame {
    constructor(level) {
      this.level = level;
      this.reset();
    }

    reset() {
      this.board = cloneBoard(this.level.board);
      this.movesRemaining = this.level.moveLimit;
      this.selectedColor = this.level.initialColor ?? 0;
      this.history = [];
      this.status = "playing";
      this.continuationUsed = false;
    }

    selectColor(color) {
      if (color >= 0 && color < this.level.colors.length) {
        this.selectedColor = color;
      }
    }

    paint(row, col) {
      if (this.status !== "playing") return { changed: false, reason: "finished" };
      const currentColor = this.board[row] && this.board[row][col];
      if (currentColor === undefined || currentColor < 0) {
        return { changed: false, reason: "blocked" };
      }
      if (currentColor === this.selectedColor) {
        return { changed: false, reason: "same-color" };
      }

      const cells = getComponent(this.board, row, col, this.level.portals);
      this.history.push({
        board: cloneBoard(this.board),
        movesRemaining: this.movesRemaining,
        status: this.status,
      });
      this.board = recolor(this.board, cells, this.selectedColor);
      this.movesRemaining -= 1;

      if (isSolved(this.board, this.level.targetColor)) {
        this.status = "won";
      } else if (this.movesRemaining <= 0) {
        this.status = "lost";
      }

      return { changed: true, cells, status: this.status };
    }

    undo() {
      const previous = this.history.pop();
      if (!previous) return false;
      this.board = previous.board;
      this.movesRemaining = previous.movesRemaining;
      this.status = previous.status;
      return true;
    }

    continueWithMoves(extraMoves) {
      if (this.status !== "lost" || this.continuationUsed) return false;
      if (!Number.isInteger(extraMoves) || extraMoves <= 0) return false;
      this.movesRemaining += extraMoves;
      this.status = "playing";
      this.continuationUsed = true;
      return true;
    }

    getHint() {
      return findShortestMove(
        this.board,
        this.level.targetColor,
        this.level.colors.length,
        Math.max(this.movesRemaining, 1),
        this.level.portals,
      );
    }
  }

  return {
    BLOCKED_CELL,
    EMPTY_CELL,
    PaletteGame,
    cloneBoard,
    countPlayableRegions,
    findShortestMove,
    getComponent,
    getComponents,
    solveRegions,
    isSolved,
  };
});
