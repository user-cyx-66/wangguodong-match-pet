const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Game, LEVELS, matches, possibleMoves, adjacent, seeded } = require('../dist/engine.js');

function blank(level = 0) {
  const g = new Game({ level, rng: seeded(2381) });
  g.board = Array.from({ length: 64 }, (_, i) => g.tile(((i / 8 | 0) * 2 + i % 8) % 6));
  g.ice.fill(false); return g;
}
function put(g, indices, color, special = null) { for (const i of indices) g.board[i] = g.tile(color, special); }

test('all 12 levels start with a stable, playable board and the requested ice count', () => {
  for (let level = 0; level < LEVELS.length; level++) for (let seed = 1; seed <= 30; seed++) {
    const g = new Game({ level, rng: seeded(seed) });
    assert.equal(g.board.length, 64); assert.equal(matches(g.board).cells.length, 0);
    assert.ok(possibleMoves(g.board).length); assert.equal(g.ice.filter(Boolean).length, LEVELS[level].ice);
  }
});
test('row boundaries and invalid swaps never consume a move or change a board', () => {
  const g = blank(), before = JSON.stringify(g.board);
  assert.equal(adjacent(7, 8), false); assert.equal(adjacent(-1, 0), false);
  assert.equal(g.swap(7, 8).valid, false); assert.equal(g.swap(0, 1).valid, false);
  assert.equal(JSON.stringify(g.board), before); assert.equal(g.moves, 24);
  possibleMoves(g.board); assert.equal(JSON.stringify(g.board), before);
});
test('three matches score, charge and count fish; ice stays at board positions', () => {
  const g = blank(); put(g, [16, 17, 18], 0); g.ice[17] = true;
  const wave = g.wave(); assert.equal(wave.count, 3); assert.equal(wave.points, 105);
  assert.equal(g.collected, 3); assert.equal(g.charge, 3); assert.equal(g.ice[17], false);
  assert.equal(g.board[17], null); g.drop(); assert.ok(g.board.every(Boolean));
});
test('four creates a direction-specific special at the swapped cell', () => {
  let g = blank(); put(g, [24, 25, 26, 27], 5); let wave = g.wave(null, [26]);
  assert.equal(g.board[26].special, 'row'); assert.equal(wave.count, 3);
  g = blank(); put(g, [4, 12, 20, 28], 1); wave = g.wave(null, [12]);
  assert.equal(g.board[12].special, 'column'); assert.equal(wave.count, 3);
});
test('five creates rainbow and intersecting T/L creates a bomb', () => {
  let g = blank(); put(g, [40, 41, 42, 43, 44], 5); g.wave(null, [43]);
  assert.equal(g.board[43].special, 'rainbow');
  g = blank(); put(g, [25, 26, 27, 18, 34], 3); g.wave(null, [26]);
  assert.equal(g.board[26].special, 'bomb');
});
test('special pieces chain through row, column and blast areas', () => {
  const g = blank(); g.board[24].special = 'row'; g.board[27].special = 'column'; g.board[11].special = 'bomb';
  const wave = g.wave([24]); assert.ok(wave.cells.includes(3)); assert.ok(wave.cells.includes(10)); assert.ok(wave.cells.includes(59));
  assert.ok(wave.count >= 20);
});
test('rainbow swap clears the chosen color, two rainbows clear all 64', () => {
  let g = blank(); g.board[0].special = 'rainbow'; const target = g.board[1].color;
  const expected = g.board.filter(t => t.color === target).length + 1;
  let result = g.swap(0, 1); assert.equal(result.valid, true); assert.equal(new Set(result.initial).size, expected);
  assert.equal(g.moves, 23);
  g = blank(); g.board[0].special = 'rainbow'; g.board[1].special = 'rainbow'; result = g.swap(0, 1);
  assert.equal(new Set(result.initial).size, 64);
});
test('last move wins before the out-of-moves loss check', () => {
  const g = blank(); g.moves = 0; g.score = g.spec.score; g.finishTurn(); assert.equal(g.status, 'won');
  const h = blank(); h.moves = 0; h.finishTurn(); assert.equal(h.status, 'lost');
});
test('cat skill and hammer cost no move and cannot be used without a charge', () => {
  const g = blank(); assert.equal(g.skill(0), null); g.charge = 24;
  const skill = g.skill(0); assert.ok(skill.length > 0); assert.equal(g.charge, 0); assert.equal(g.moves, 24);
  assert.deepEqual(g.hammerAt(0), [0]); assert.equal(g.hammerAt(0), null); assert.equal(g.moves, 24);
});
test('shuffle is free and always produces a stable playable board', () => {
  const g = blank(); assert.equal(possibleMoves(g.board).length, 0); g.finishTurn();
  assert.ok(possibleMoves(g.board).length); assert.equal(matches(g.board).cells.length, 0); assert.equal(g.moves, 24);
});
test('unlimited mode has no loss, and randomized legal turns stay consistent', () => {
  for (let seed = 10; seed < 35; seed++) {
    const g = new Game({ mode: 'zen', rng: seeded(seed) }); let oldScore = 0;
    for (let step = 0; step < 80; step++) {
      const moves = possibleMoves(g.board); assert.ok(moves.length);
      const [a, b] = moves[g.rand(moves.length)]; const swap = g.swap(a, b); assert.ok(swap.valid);
      const waves = g.settle(swap.initial, swap.preferred); assert.ok(waves.length);
      assert.ok(g.score > oldScore); oldScore = g.score;
      assert.equal(matches(g.board).cells.length, 0); assert.equal(g.board.filter(Boolean).length, 64);
      assert.equal(new Set(g.board.map(t => t.id)).size, 64); assert.ok(possibleMoves(g.board).length);
      assert.equal(g.status, 'playing'); assert.equal(g.moves, g.spec.moves);
    }
  }
});
