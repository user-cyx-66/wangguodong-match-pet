const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Game, PopGame, cluster, clusters, seeded } = require('../Wangguodong/game/engine.js');
function blank() { const g = new Game({ rng: seeded(91) }); g.board = Array.from({ length: 64 }, (_, i) => g.tile(((i / 8 | 0) * 2 + i % 8) % 6)); return g; }

test('fresh match-three rounds include two immediately usable specials', () => {
  const g = new Game(); assert.equal(g.board.filter(t => t.special).length, 2);
  const move = g.activate(18); assert.ok(move); assert.equal(g.moves, g.spec.moves - 1);
  assert.ok(g.settle(move.initial).some(w => w.count >= 8));
});
test('two stripes make a cross; stripe and bomb clear three rows and columns', () => {
  let g = blank(); g.board[27].special = 'row'; g.board[28].special = 'row'; let s = g.swap(27, 28);
  assert.ok(s.combo); const w = g.wave(s.initial); assert.ok(w.cells.includes(4)); assert.ok(w.cells.includes(60)); assert.ok(w.cells.includes(24));
  g = blank(); g.board[27].special = 'bomb'; g.board[28].special = 'column'; s = g.swap(27, 28);
  const wave = g.wave(s.initial); assert.ok(wave.count >= 39); assert.ok(wave.specials.length >= 2);
});
test('rainbow plus a bomb converts every target-color piece before exploding', () => {
  const g = blank(); g.board[27].special = 'rainbow'; g.board[28].special = 'bomb'; const color = g.board[28].color;
  const s = g.swap(27, 28); assert.match(s.combo, /彩虹/);
  assert.ok(g.board.filter(t => t.color === color && t.special === 'bomb').length >= 8);
  assert.ok(g.wave(s.initial).count >= 40);
});
test('flood fill includes only orthogonally connected cells and never wraps rows', () => {
  const b = Array(64).fill(null); for (const i of [6, 7, 8, 15, 23, 24]) b[i] = { color: 2 };
  assert.deepEqual(new Set(cluster(b, 7)), new Set([6, 7, 15, 23])); assert.equal(cluster(b, 8).length, 1);
  assert.equal(clusters(b).length, 1);
});
test('large connected pops use quadratic score and clear in one action', () => {
  const g = new PopGame({ rng: seeded(93) }), group = g.groups()[0], before = g.remaining();
  const w = g.pop(group[0]); assert.ok(group.length >= 6); assert.equal(w.points, group.length ** 2 * 5);
  assert.equal(g.remaining(), before - group.length); assert.equal(g.turns, 1); g.drop(); assert.equal(g.remaining(), before - group.length);
});
test('pop gravity packs downward and moves empty columns left without refilling', () => {
  const g = new PopGame(); g.board.fill(null); let id = 1;
  for (const [i, color] of [[0, 1], [16, 2], [3, 4], [19, 3]]) g.board[i] = { id: id++, color, special: null };
  g.drop(); assert.equal(g.remaining(), 4);
  assert.equal(g.board[48].color, 1); assert.equal(g.board[56].color, 2);
  assert.equal(g.board[49].color, 4); assert.equal(g.board[57].color, 3);
  assert.ok(g.board.filter((t, i) => i % 8 >= 2).every(t => t === null));
});
test('pop settlement adds the leftover bonus once and uses it toward the target', () => {
  const g = new PopGame(); g.board.fill(null); g.score = 0;
  g.finishTurn(); assert.equal(g.bonus, 2000); assert.equal(g.score, 2000); assert.equal(g.status, 'won');
  g.finishTurn(); assert.equal(g.score, 2000);
  const h = new PopGame(); h.board.fill(null); h.board[63] = { color: 0 }; h.board[62] = { color: 1 }; h.score = 0; h.target = 5000;
  h.finishTurn(); assert.equal(h.bonus, 1920); assert.equal(h.status, 'lost');
});
test('pop shuffle is limited, preserves pieces and tools do not create new ones', () => {
  const g = new PopGame({ rng: seeded(82) }), ids = g.board.map(t => t.id).sort((a,b)=>a-b);
  assert.equal(g.shuffle(), true); assert.equal(g.shuffles, 0); assert.equal(g.shuffle(), false);
  assert.deepEqual(g.board.map(t => t.id).sort((a,b)=>a-b), ids);
  g.charge = 24; const targets = g.skill(0); const before = g.remaining(); g.clear(targets); g.drop(); assert.equal(g.remaining(), before - targets.length);
});
test('200 random pop rounds terminate, conserve their pieces and never pay bonus twice', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const g = new PopGame({ rng: seeded(seed) }); let turns = 0;
    while (g.status === 'playing') {
      const group = g.groups()[0]; if (!group) { g.finishTurn(); break; }
      const before = g.remaining(); g.pop(group[0]); g.drop(); assert.equal(g.remaining(), before - group.length);
      const tiles = g.board.filter(Boolean); assert.equal(new Set(tiles.map(t=>t.id)).size, tiles.length);
      g.finishTurn(); assert.ok(++turns <= 32);
    }
    const score = g.score; g.finishTurn(); assert.equal(g.score, score); assert.ok(['won','lost'].includes(g.status));
  }
});
