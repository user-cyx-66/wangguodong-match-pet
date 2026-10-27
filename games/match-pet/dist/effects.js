(function () {
  'use strict';
  const palette = ['#69b0d2', '#e78d9d', '#94b970', '#efc45c', '#bd93d3', '#e79e79'];
  class BoardEffects {
    constructor(canvas, board) {
      this.canvas = canvas; this.board = board; this.ctx = canvas.getContext('2d'); this.items = []; this.frame = null; this.totalBursts = 0;
      this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      new ResizeObserver(() => this.resize()).observe(canvas.parentElement); this.resize();
    }
    resize() { const r = this.canvas.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1); this.width = r.width; this.height = r.height; this.canvas.width = Math.round(r.width * dpr); this.canvas.height = Math.round(r.height * dpr); this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    position(index) { const a = this.board.children[index]?.getBoundingClientRect(), b = this.canvas.getBoundingClientRect(); return a ? { x: a.x - b.x + a.width / 2, y: a.y - b.y + a.height / 2, size: a.width } : { x: 0, y: 0, size: 40 }; }
    burst(wave) {
      this.totalBursts++; if (this.reduced) return;
      const now = performance.now(), big = wave.count >= 8 || wave.specials?.length;
      wave.cells.forEach((index, j) => {
        const p = this.position(index), el = this.board.children[index];
        const color = palette[wave.colors?.[j] ?? +(el?.className.match(/color-(\d)/)?.[1] || 3)];
        const particles = wave.count > 35 ? 5 : big ? 9 : 5;
        for (let n = 0; n < particles; n++) {
          const angle = Math.random() * Math.PI * 2, speed = 40 + Math.random() * (big ? 170 : 95);
          this.items.push({ kind: n % 3 === 0 ? 'star' : 'chip', born: now + Math.min(j * 5, 85), life: 430 + Math.random() * 260, x: p.x, y: p.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 65, color, size: 3 + Math.random() * 4, spin: Math.random() * 8 });
        }
        this.items.push({ kind: 'ring', born: now, life: 330, x: p.x, y: p.y, radius: p.size * .65, color });
      });
      for (const special of (wave.specials || []).slice(0, 12)) {
        const p = this.position(special.index);
        if (special.type === 'row' || special.type === 'column') this.items.push({ kind: 'beam', ...p, vertical: special.type === 'column', born: now, life: 370, color: '#eac268' });
        else if (special.type === 'bomb') this.items.push({ kind: 'ring', ...p, born: now, life: 450, radius: p.size * 2.6, color: '#dc9b7b' });
        else if (special.type === 'rainbow') wave.cells.slice(0, 24).forEach((i, n) => this.items.push({ kind: 'arc', ...p, target: this.position(i), born: now + n * 4, life: 350, color: palette[n % 6] }));
      }
      if (big) {
        this.items.push({ kind: 'flash', born: now, life: 150, color: '#fff4d4' });
        const shell = this.board.parentElement, strength = Math.min(5, 1.5 + wave.count / 12);
        shell.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${strength}px,-2px)` }, { transform: `translate(-${strength}px,2px)` }, { transform: 'translate(0,0)' }], { duration: 190, easing: 'ease-out' });
      }
      if (this.items.length > 900) this.items.splice(0, this.items.length - 900);
      if (!this.frame) this.frame = requestAnimationFrame(t => this.draw(t));
    }
    draw(time) {
      const ctx = this.ctx; ctx.clearRect(0, 0, this.width, this.height);
      this.items = this.items.filter(o => time - o.born < o.life);
      for (const o of this.items) {
        const age = time - o.born; if (age < 0) continue;
        const t = age / o.life, sec = age / 1000; ctx.save(); ctx.globalAlpha = (1 - t) ** 1.25; ctx.fillStyle = ctx.strokeStyle = o.color;
        if (o.kind === 'chip' || o.kind === 'star') {
          ctx.translate(o.x + o.vx * sec, o.y + o.vy * sec + 200 * sec * sec); ctx.rotate(o.spin * sec); const s = o.size * (1 - t * .4);
          if (o.kind === 'chip') ctx.fillRect(-s / 2, -s / 2, s * 1.8, s);
          else { ctx.beginPath(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, r = k % 2 ? s * .3 : s; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); }
        } else if (o.kind === 'ring') { ctx.lineWidth = 2.5 * (1 - t); ctx.beginPath(); ctx.arc(o.x, o.y, o.radius * Math.sqrt(t), 0, Math.PI * 2); ctx.stroke(); }
        else if (o.kind === 'beam') {
          ctx.shadowColor = o.color; ctx.shadowBlur = 16; ctx.lineWidth = 12 * (1 - t); ctx.beginPath(); if (o.vertical) { ctx.moveTo(o.x, 0); ctx.lineTo(o.x, this.height); } else { ctx.moveTo(0, o.y); ctx.lineTo(this.width, o.y); } ctx.stroke(); ctx.strokeStyle = 'white'; ctx.lineWidth = 4 * (1 - t); ctx.stroke();
        } else if (o.kind === 'arc') { ctx.lineWidth = 2; ctx.shadowColor = o.color; ctx.shadowBlur = 10; ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.quadraticCurveTo((o.x + o.target.x) / 2, Math.min(o.y, o.target.y) - 50, o.target.x, o.target.y); ctx.stroke(); }
        else if (o.kind === 'flash') { ctx.globalAlpha *= .26; ctx.fillRect(0, 0, this.width, this.height); }
        ctx.restore();
      }
      if (this.items.length) this.frame = requestAnimationFrame(t => this.draw(t));
      else { this.frame = null; ctx.clearRect(0, 0, this.width, this.height); }
    }
  }
  window.BoardEffects = BoardEffects;
})();
