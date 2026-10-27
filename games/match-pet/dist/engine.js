/* Original match-three rules. Also loaded by Node for deterministic tests. */
(function (root) {
  'use strict';
  const SIZE = 8, COLORS = 6;
  const LEVELS = [
    { name: '第一份小鱼干', moves: 24, score: 900, fish: 0, ice: 0, note: '交换相邻点心，凑齐三个就能消除。' },
    { name: '猫咪的下午茶', moves: 25, score: 1400, fish: 12, ice: 0, note: '收集蓝色小鱼，给果冻加个餐。' },
    { name: '窗边的小确幸', moves: 25, score: 1800, fish: 16, ice: 0, note: '试试四连消，做出一整排的惊喜。' },
    { name: '融化一片薄荷冰', moves: 27, score: 1800, fish: 0, ice: 12, note: '在冰块所在的位置消除，就能把它融化。' },
    { name: '有你的周末', moves: 28, score: 2300, fish: 20, ice: 12, note: '攒满猫爪能量，让果冻帮你一把。' },
    { name: '粉色小约定', moves: 28, score: 2800, fish: 22, ice: 16, note: '五连会做出彩虹星，和任意点心交换试试。' },
    { name: '下雨也有好心情', moves: 29, score: 3200, fish: 25, ice: 20, note: '连锁消除会有额外分数，慢慢想，不着急。' },
    { name: '草莓云朵', moves: 30, score: 3600, fish: 28, ice: 24, note: '猫爪和小锤子都可以融冰哦。' },
    { name: '晚安前的拥抱', moves: 30, score: 4000, fish: 30, ice: 28, note: 'T 形、L 形相交消除，会留下小炸弹。' },
    { name: '星星住进小窝', moves: 32, score: 4600, fish: 32, ice: 32, note: '特效点心连在一起触发，会更热闹。' },
    { name: '把喜欢都给你', moves: 33, score: 5200, fish: 36, ice: 36, note: '先看看目标，再决定最值得的一步。' },
    { name: '我们的糖果小宇宙', moves: 35, score: 6000, fish: 40, ice: 40, note: '最后一站啦。慢慢玩，果冻一直陪着你。' }
  ];
  function seeded(seed) { let s = seed >>> 0; return () => { s += 0x6D2B79F5; let t = Math.imul(s ^ s >>> 15, 1 | s); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const adjacent = (a, b) => a >= 0 && b >= 0 && a < 64 && b < 64 && Math.abs(a % 8 - b % 8) + Math.abs((a / 8 | 0) - (b / 8 | 0)) === 1;
  function matches(board) {
    const groups = [], cells = new Set();
    for (const vertical of [false, true]) for (let line = 0; line < 8; line++) {
      let run = [];
      const finish = () => { if (run.length >= 3) { groups.push({ cells: run.slice(), vertical }); run.forEach(i => cells.add(i)); } run = []; };
      for (let p = 0; p <= 8; p++) {
        const i = vertical ? p * 8 + line : line * 8 + p;
        const tile = p < 8 ? board[i] : null;
        if (!tile || tile.special === 'rainbow' || (run.length && board[run[0]].color !== tile.color)) finish();
        if (tile && tile.special !== 'rainbow') run.push(i);
      }
    }
    return { groups, cells: [...cells] };
  }
  function possibleMoves(board) {
    const out = [];
    for (let a = 0; a < 64; a++) for (const b of [a + 1, a + 8]) {
      if (!adjacent(a, b) || !board[a] || !board[b]) continue;
      if (board[a].special || board[b].special) { out.push([a, b]); continue; }
      [board[a], board[b]] = [board[b], board[a]];
      const hit = matches(board).cells;
      if (hit.includes(a) || hit.includes(b)) out.push([a, b]);
      [board[a], board[b]] = [board[b], board[a]];
    }
    return out;
  }
  class Game {
    constructor({ level = 0, mode = 'story', rng = Math.random } = {}) {
      this.rng = rng; this.id = 0; this.level = Math.max(0, Math.min(11, level | 0)); this.mode = mode;
      this.spec = LEVELS[this.level]; this.score = 0; this.collected = 0; this.moves = this.spec.moves; this.charge = 0;
      this.hammer = 1; this.turns = 0; this.totalCleared = 0; this.status = 'playing'; this.ice = Array(64).fill(false);
      if (mode === 'story') {
        const spots = Array.from({ length: 64 }, (_, i) => i);
        for (let i = 63; i > 0; i--) { const j = this.rand(i + 1); [spots[i], spots[j]] = [spots[j], spots[i]]; }
        for (const i of spots.slice(0, this.spec.ice)) this.ice[i] = true;
      }
      this.board = this.freshBoard();
      // Give every round two toys to play with immediately.
      this.board[18].special = 'row'; this.board[45].special = 'bomb';
    }
    rand(n) { return Math.floor(this.rng() * n); }
    tile(color = this.rand(COLORS), special = null) { return { id: ++this.id, color, special }; }
    freshBoard() {
      for (let tries = 0; tries < 100; tries++) {
        const b = [];
        for (let i = 0; i < 64; i++) {
          let choices = Array.from({ length: COLORS }, (_, c) => c);
          if (i % 8 >= 2 && b[i - 1].color === b[i - 2].color) choices = choices.filter(c => c !== b[i - 1].color);
          if (i >= 16 && b[i - 8].color === b[i - 16].color) choices = choices.filter(c => c !== b[i - 8].color);
          b.push(this.tile(choices[this.rand(choices.length)]));
        }
        if (possibleMoves(b).length) return b;
      }
      throw new Error('没有生成可玩的棋盘');
    }
    swap(a, b) {
      if (this.status !== 'playing' || !adjacent(a, b)) return { valid: false };
      [this.board[a], this.board[b]] = [this.board[b], this.board[a]];
      const x = this.board[a], y = this.board[b];
      let initial = null, combo = null;
      if (x.special === 'rainbow' || y.special === 'rainbow') {
        initial = [a, b];
        if (x.special === 'rainbow' && y.special === 'rainbow') initial = this.board.map((_, i) => i);
        else {
          const other = x.special === 'rainbow' ? y : x, target = other.color, otherSpecial = other.special;
          this.board.forEach((t, i) => { if (t.color === target) { if (otherSpecial && t.special !== 'rainbow') t.special = otherSpecial === 'bomb' ? 'bomb' : (this.rand(2) ? 'row' : 'column'); initial.push(i); } });
          if (otherSpecial) combo = otherSpecial === 'bomb' ? '彩虹炸弹派对！' : '彩虹流星雨！';
        }
        if (x.special === 'rainbow' && y.special === 'rainbow') combo = '双彩虹 · 全屏清空！';
      } else if (x.special && y.special) {
        initial = [a, b]; const r = b / 8 | 0, c = b % 8;
        if (x.special === 'bomb' && y.special === 'bomb') {
          for (let rr = Math.max(0, r - 2); rr <= Math.min(7, r + 2); rr++) for (let cc = Math.max(0, c - 2); cc <= Math.min(7, c + 2); cc++) initial.push(rr * 8 + cc);
          combo = '双炸弹 · 大爆破！';
        } else if (x.special === 'bomb' || y.special === 'bomb') {
          for (let i = 0; i < 64; i++) if (Math.abs((i / 8 | 0) - r) <= 1 || Math.abs(i % 8 - c) <= 1) initial.push(i);
          combo = '十字风暴！';
        } else {
          for (let i = 0; i < 64; i++) if ((i / 8 | 0) === r || i % 8 === c) initial.push(i);
          combo = '十字星光！';
        }
      } else if (x.special || y.special) initial = [a, b];
      else { const m = matches(this.board); if (!m.cells.includes(a) && !m.cells.includes(b)) { [this.board[a], this.board[b]] = [this.board[b], this.board[a]]; return { valid: false }; } }
      if (this.mode === 'story') this.moves--;
      this.turns++;
      return { valid: true, initial, preferred: [b, a], combo };
    }
    activate(index) {
      const t = this.board[index]; if (this.status !== 'playing' || !t?.special) return null;
      if (this.mode === 'story') this.moves--; this.turns++;
      let initial = [index];
      if (t.special === 'rainbow') { const counts = Array(6).fill(0); this.board.forEach(v => counts[v.color]++); const color = counts.indexOf(Math.max(...counts)); this.board.forEach((v, i) => { if (v.color === color) initial.push(i); }); }
      return { initial, preferred: [], combo: t.special === 'rainbow' ? '彩虹扫场！' : null };
    }
    creationPlan(m, preferred) {
      const creations = new Map(), handled = new Set();
      // Intersecting runs form one connected component, with one special per component.
      for (let g = 0; g < m.groups.length; g++) {
        if (handled.has(g)) continue;
        let component = [g], joined = new Set(m.groups[g].cells); handled.add(g);
        for (let cursor = 0; cursor < component.length; cursor++) for (let k = 0; k < m.groups.length; k++) {
          if (!handled.has(k) && m.groups[k].cells.some(i => joined.has(i))) { handled.add(k); component.push(k); m.groups[k].cells.forEach(i => joined.add(i)); }
        }
        const runs = component.map(k => m.groups[k]);
        let special = runs.some(r => r.cells.length >= 5) ? 'rainbow' : runs.length > 1 ? 'bomb' : runs[0].cells.length === 4 ? (runs[0].vertical ? 'column' : 'row') : null;
        if (!special) continue;
        const candidates = [...joined].filter(i => !this.board[i].special);
        const at = preferred.find(i => candidates.includes(i)) ?? candidates.find(i => runs.filter(r => r.cells.includes(i)).length > 1) ?? candidates[0];
        if (at !== undefined) creations.set(at, { color: this.board[at].color, special });
      }
      return creations;
    }
    wave(initial = null, preferred = [], chain = 1) {
      const m = matches(this.board);
      if (!initial && !m.cells.length) return null;
      const creations = initial ? new Map() : this.creationPlan(m, preferred);
      const marked = new Set(initial || m.cells), queue = [...marked], specials = [];
      for (let p = 0; p < queue.length; p++) {
        const i = queue[p], t = this.board[i]; if (!t?.special) continue;
        specials.push({ index: i, type: t.special });
        let extra = [];
        if (t.special === 'row') extra = Array.from({ length: 8 }, (_, c) => (i / 8 | 0) * 8 + c);
        if (t.special === 'column') extra = Array.from({ length: 8 }, (_, r) => r * 8 + i % 8);
        if (t.special === 'bomb') for (let r = Math.max(0, (i / 8 | 0) - 1); r <= Math.min(7, (i / 8 | 0) + 1); r++) for (let c = Math.max(0, i % 8 - 1); c <= Math.min(7, i % 8 + 1); c++) extra.push(r * 8 + c);
        if (t.special === 'rainbow' && !initial?.includes(i)) { const color = this.rand(COLORS); this.board.forEach((v, j) => { if (v?.color === color) extra.push(j); }); }
        for (const j of extra) if (!marked.has(j)) { marked.add(j); queue.push(j); }
      }
      // If another special hits a newly created position, its creation still survives this wave.
      let fish = 0, ice = 0, count = 0;
      for (const i of marked) {
        if (!this.board[i]) continue;
        if (this.ice[i]) { this.ice[i] = false; ice++; }
        if (!creations.has(i)) { if (this.board[i].color === 0) fish++; this.board[i] = null; count++; }
      }
      for (const [i, t] of creations) this.board[i] = this.tile(t.color, t.special);
      const points = count * 30 * Math.min(chain, 5) + creations.size * 60 + ice * 15;
      this.score += points; this.collected += fish; this.totalCleared += count; this.charge = Math.min(24, this.charge + count);
      return { cells: [...marked], points, fish, ice, count, chain, specials, creations: [...creations].map(([i, t]) => ({ i, ...t })) };
    }
    drop() {
      for (let c = 0; c < 8; c++) {
        const tiles = []; for (let r = 7; r >= 0; r--) { const t = this.board[r * 8 + c]; if (t) tiles.push(t); }
        for (let r = 7; r >= 0; r--) this.board[r * 8 + c] = tiles[7 - r] || this.tile();
      }
    }
    settle(initial = null, preferred = []) {
      const waves = []; let wave, n = 0;
      while ((wave = this.wave(n === 0 ? initial : null, n === 0 ? preferred : [], n + 1))) {
        waves.push(wave); this.drop(); if (++n >= 100) { this.board = this.freshBoard(); break; }
      }
      this.finishTurn(); return waves;
    }
    goalMet() { return this.mode === 'story' && this.score >= this.spec.score && this.collected >= this.spec.fish && !this.ice.some(Boolean); }
    finishTurn() {
      if (this.goalMet()) this.status = 'won';
      else if (this.mode === 'story' && this.moves <= 0) this.status = 'lost';
      if (this.status === 'playing' && !possibleMoves(this.board).length) { this.shuffle(); return true; }
      return false;
    }
    shuffle() {
      if (this.status !== 'playing') return false;
      // Fisher-Yates keeps earned special pieces; a guaranteed fresh board is the fallback.
      for (let attempt = 0; attempt < 120; attempt++) {
        for (let i = 63; i > 0; i--) { const j = this.rand(i + 1); [this.board[i], this.board[j]] = [this.board[j], this.board[i]]; }
        if (!matches(this.board).cells.length && possibleMoves(this.board).length) return true;
      }
      this.board = this.freshBoard(); return true;
    }
    skill(index) {
      if (this.status !== 'playing' || this.charge < 24 || !this.board[index]) return null;
      this.charge = 0; const color = this.board[index].color;
      return this.board.flatMap((t, i) => t.color === color ? [i] : []);
    }
    hammerAt(index) { if (this.status !== 'playing' || !this.hammer || !this.board[index]) return null; this.hammer--; return [index]; }
    stars() { return 1 + (this.moves >= 5 ? 1 : 0) + (this.moves >= 10 ? 1 : 0); }
  }
  function cluster(board, start) {
    if (!board[start]) return [];
    const color = board[start].color, visited = new Set([start]), queue = [start];
    for (let p = 0; p < queue.length; p++) for (const i of [queue[p] - 1, queue[p] + 1, queue[p] - 8, queue[p] + 8]) {
      if (adjacent(queue[p], i) && !visited.has(i) && board[i]?.color === color) { visited.add(i); queue.push(i); }
    }
    return queue;
  }
  function clusters(board) {
    const seen = new Set(), groups = [];
    board.forEach((t, i) => { if (t && !seen.has(i)) { const g = cluster(board, i); g.forEach(j => seen.add(j)); if (g.length >= 2) groups.push(g); } });
    return groups.sort((a, b) => b.length - a.length);
  }
  class PopGame {
    constructor({ stage = 1, score = 0, rng = Math.random } = {}) {
      this.rng = rng; this.mode = 'pop'; this.level = 0; this.stage = Math.max(1, Math.min(999, stage | 0));
      this.target = 1000 + (this.stage - 1) * 1500 + Math.floor((this.stage - 1) ** 1.4 * 150);
      this.spec = { name: '点一大片，快乐加倍', score: this.target, fish: 0, ice: 0 };
      this.id = 0; this.score = score; this.roundStart = score; this.collected = 0; this.moves = 0; this.turns = 0;
      this.totalCleared = 0; this.charge = 0; this.hammer = 1; this.shuffles = 1; this.status = 'playing'; this.bonus = 0; this.settled = false;
      this.ice = Array(64).fill(false);
      // Slightly clustered starts give a juicy opening without deciding the whole board.
      for (let attempt = 0; attempt < 30; attempt++) {
        this.board = [];
        for (let i = 0; i < 64; i++) {
          const neighbor = i % 8 && this.rng() < .22 ? this.board[i - 1] : i >= 8 && this.rng() < .16 ? this.board[i - 8] : null;
          this.board.push({ id: ++this.id, color: neighbor ? neighbor.color : this.rand(5), special: null });
        }
        if (clusters(this.board)[0]?.length >= 9) break;
      }
    }
    rand(n) { return Math.floor(this.rng() * n); }
    groups() { return clusters(this.board); }
    remaining() { return this.board.filter(Boolean).length; }
    pop(index) { if (this.status !== 'playing') return null; const group = cluster(this.board, index); if (group.length < 2) return null; this.turns++; return this.clear(group); }
    clear(cells) {
      cells = [...new Set(cells)].filter(i => this.board[i]);
      let fish = 0; const colors = cells.map(i => this.board[i].color);
      for (const i of cells) { if (this.board[i].color === 0) fish++; this.board[i] = null; }
      const count = cells.length, points = count * count * 5;
      this.score += points; this.collected += fish; this.totalCleared += count; this.charge = Math.min(24, this.charge + count);
      return { cells, colors, points, count, fish, ice: 0, chain: 1, specials: [], creations: [], kind: 'pop' };
    }
    drop() {
      const columns = [];
      for (let c = 0; c < 8; c++) { const col = []; for (let r = 7; r >= 0; r--) if (this.board[r * 8 + c]) col.push(this.board[r * 8 + c]); if (col.length) columns.push(col); }
      this.board = Array(64).fill(null);
      columns.forEach((col, c) => col.forEach((t, n) => { this.board[(7 - n) * 8 + c] = t; }));
    }
    finishTurn() {
      if (this.status !== 'playing' || this.groups().length) return false;
      if (!this.settled) { this.bonus = Math.max(0, 2000 - this.remaining() ** 2 * 20); this.score += this.bonus; this.settled = true; }
      this.status = this.score >= this.target ? 'won' : 'lost'; return false;
    }
    shuffle() {
      if (this.status !== 'playing' || !this.shuffles || this.remaining() < 2) return false;
      const tiles = this.board.filter(Boolean); this.shuffles--;
      for (let attempt = 0; attempt < 60; attempt++) {
        for (let i = tiles.length - 1; i > 0; i--) { const j = this.rand(i + 1); [tiles[i], tiles[j]] = [tiles[j], tiles[i]]; }
        const occupied = this.board.flatMap((t, i) => t ? [i] : []); occupied.forEach((i, n) => { this.board[i] = tiles[n]; });
        if (this.groups().length) break;
      }
      return true;
    }
    skill(index) { if (this.status !== 'playing' || this.charge < 24 || !this.board[index]) return null; this.charge = 0; const color = this.board[index].color; return this.board.flatMap((t, i) => t?.color === color ? [i] : []); }
    hammerAt(index) { if (this.status !== 'playing' || !this.hammer || !this.board[index]) return null; this.hammer--; return [index]; }
  }
  root.MatchPet = { Game, PopGame, cluster, clusters, LEVELS, matches, possibleMoves, adjacent, seeded, SIZE, COLORS };
  if (typeof module !== 'undefined') module.exports = root.MatchPet;
})(globalThis);
