/* Isolated combat regressions. Run after the motion implementation is complete.
   Images and Canvas are stubbed: this validates timing and gameplay, not visual QA. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..', 'dist');
const dt = 1 / 240;
const gradient = { addColorStop() {} };
const drawCalls = [];
const context = new Proxy({drawImage(...args){drawCalls.push(args);}}, {
  get: (target, key) => {
    if (key in target) return target[key];
    if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => gradient;
    if (key === 'measureText') return () => ({ width: 30 });
    return () => {};
  },
  set: (target, key, value) => (target[key] = value, true)
});
const storage = new Map();
const sandbox = {
  window: { addEventListener() {}, removeEventListener() {} },
  document: { createElement: () => ({ width: 0, height: 0, getContext: () => context }) },
  localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
  Image: class { constructor() { this.complete = false; this.naturalWidth = 0; this.naturalHeight = 0; } },
  requestAnimationFrame: () => 1, cancelAnimationFrame() {}, performance: { now: () => 0 },
  console, Math
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'content.js'), 'utf8'), sandbox);
const source=fs.readFileSync(path.join(root,'game.js'),'utf8');
// Expose the actual atlas metadata inside this isolated VM only; do not copy a
// second rectangle table or alter the shipped file.
const instrumented=source.replace('window.KnightGame = KnightGame;','window.__knightFramesForTest = KNIGHT_FRAMES.map(frame => Object.freeze(frame.slice())); window.KnightGame = KnightGame;');
assert.notEqual(instrumented,source,'Unable to expose sprite metadata in the test VM');
vm.runInContext(instrumented, sandbox);
const made = [];

function fixture(extraEnemies = []) {
  const game = new sandbox.window.KnightGame({ getContext: () => context }, {});
  game.setHero('wangguodong');
  game.startNew();
  game._updatePrincess = () => {};
  game._updateEnemy = () => {};
  const p = game.player;
  p.x = 400; p.y = 590; p.facing = 1;
  const target = game._makeEnemy({ type: 'skeleton', x: p.x + 74 }, 101);
  target.hp = target.maxHp = 10000;
  game.enemies = [target, ...extraEnemies.map((offset, index) => {
    const enemy = game._makeEnemy({ type: 'skeleton', x: p.x + offset }, 102 + index);
    enemy.hp = enemy.maxHp = 10000; return enemy;
  })];
  game.stageTotal = game.enemies.length;
  game.platforms = [];
  const hits = [];
  const damageEnemy = game._damageEnemy.bind(game);
  game._damageEnemy = (enemy, damage, knockback) => {
    hits.push({ id: enemy.id, damage, time: game.time, index: p.attack?.index, elapsed: p.attack?.elapsed, spriteFrame:p.attack?game._knightFrame(p.attack):null });
    damageEnemy(enemy, damage, knockback);
  };
  made.push(game);
  return { game, p, target, hits };
}

function frame(f, seconds = dt) {
  f.game._update(seconds);
  f.game.pressed = {};
}
function advance(f, seconds) {
  for (let elapsed = 0; elapsed < seconds - 1e-8; elapsed += dt) frame(f, Math.min(dt, seconds - elapsed));
}
function until(f, predicate, seconds = 1) {
  for (let elapsed = 0; elapsed < seconds; elapsed += dt) {
    if (predicate()) return;
    frame(f);
  }
  assert.ok(predicate(), 'Timed out waiting for a combat state');
}
function pulse(f, action) {
  f.game.setInput(action, true); frame(f); f.game.setInput(action, false);
}
function startSwing(f) {
  pulse(f, 'attack');
  assert.ok(f.p.attack, 'Attack input must create an attack state');
  return f.p.attack;
}

const checks = [];
function check(name, run) {
  try { run(); checks.push({ name, ok: true }); }
  catch (error) { checks.push({ name, ok: false, error: error.stack || String(error) }); }
}

check('windup causes no damage; one target is hit once during an entire swing', () => {
  const f = fixture(), initial = f.target.hp, attack = startSwing(f);
  assert.equal(attack.index, 0);
  assert.equal(f.hits.length, 0, 'Damage must not happen on button press');
  advance(f, attack.windup * .45);
  assert.equal(f.target.hp, initial, 'Windup must remain harmless');
  until(f, () => f.hits.length > 0, .4);
  const hitStart=attack.windup+attack.active*.38;
  assert.ok(f.hits[0].elapsed >= hitStart - 1e-8, 'Hit must wait until the weapon has swept forward');
  const damage = f.hits[0].damage;
  advance(f, attack.duration + .15);
  assert.equal(f.hits.length, 1, 'The same swing must not repeatedly damage one enemy');
  assert.equal(f.target.hp, initial - damage);
});

check('an enemy entering late in the active phase can still be hit once', () => {
  const f = fixture(); f.target.x = f.p.x + 600;
  const attack = startSwing(f);
  until(f, () => attack.elapsed >= attack.windup + attack.active * .3, .4);
  assert.equal(f.hits.length, 0);
  f.target.x = f.p.x + 70;
  advance(f, attack.active * .3);
  assert.equal(f.hits.length, 1, 'Active frames must check newly entering enemies');
  advance(f, attack.duration);
  assert.equal(f.hits.length, 1);
});

check('the initial active sweep remains harmless until the blade reaches its contact phase', () => {
  const f=fixture(),attack=startSwing(f);
  const hitStart=attack.windup+attack.active*.38;
  until(f,()=>attack.elapsed>=attack.windup+attack.active*.07,.3);
  assert.equal(f.hits.length,0,'Merely starting the swing must not freeze it above the enemy');
  advance(f,Math.max(0,hitStart-attack.elapsed-dt*.5));
  assert.equal(f.hits.length,0,'The enemy must not be hit before the contact threshold');
  until(f,()=>f.hits.length>0,.2);
  assert.ok(f.hits[0].elapsed>=hitStart-1e-8);
});

check('one active swing can strike multiple enemies without multiplying their damage', () => {
  const f = fixture([105]); startSwing(f);
  advance(f, .6);
  assert.equal(f.hits.filter(h => h.id === 101).length, 1);
  assert.equal(f.hits.filter(h => h.id === 102).length, 1);
});

check('held attack forms three distinct stages and lets the heavy attack finish its recovery', () => {
  const f = fixture(), starts = []; let previous = null;
  f.game.setInput('attack', true);
  for (let t = 0; t < 2.4; t += dt) {
    frame(f);
    const a = f.p.attack;
    if (a && a !== previous) starts.push({ attack: a, time: f.game.time });
    previous = a;
    if (starts.length === 4) break;
  }
  f.game.setInput('attack', false);
  assert.equal(starts.length, 4, 'Long press must automatically continue the attack sequence');
  assert.deepEqual(starts.map(s => s.attack.index), [0, 1, 2, 0]);
  const [opening,returning,finisher]=starts.map(item=>item.attack);
  for(const attack of [opening,returning,finisher]){
    assert.ok(attack.windup>0 && attack.active>0 && attack.recovery>0, 'All three readable motion phases must exist');
    assert.ok(Math.abs(attack.duration-attack.windup-attack.active-attack.recovery)<1e-8);
    assert.ok(attack.chainAt>=attack.windup+attack.active && attack.chainAt<=attack.duration+1e-8, 'Chaining must happen after the active sweep');
  }
  assert.ok(Math.abs(opening.duration-returning.duration)>.005,'The two light slashes must have distinguishable rhythms');
  assert.ok(finisher.windup>Math.max(opening.windup,returning.windup)*1.25,'The heavy attack needs a visibly longer anticipation');
  assert.ok(finisher.duration>Math.max(opening.duration,returning.duration)*1.25,'The finisher must read as a heavier complete motion');
  assert.ok(starts[1].time - starts[0].time >= starts[0].attack.chainAt - dt * 2);
  assert.ok(starts[3].time - starts[2].time >= starts[2].attack.duration - dt * 2, 'Heavy recovery must not be skipped');
  const light = f.hits.find(h => h.index === 0), heavy = f.hits.find(h => h.index === 2);
  assert.ok(light && heavy, 'Both light and heavy stages must connect');
  assert.ok(heavy.damage > light.damage * 1.35, 'The finisher must have heavier damage');
});

check('a short press buffered during recovery chains when the window opens', () => {
  const f = fixture(), first = startSwing(f);
  until(f, () => first.elapsed >= first.chainAt - .065, .6);
  pulse(f, 'attack');
  until(f, () => f.p.attack && f.p.attack !== first, .3);
  assert.equal(f.p.attack.index, 1);
});

check('attack input received during hitstop is retained and does not deal immediate damage', () => {
  const f = fixture(); f.game.hitstop = .06;
  pulse(f, 'attack');
  assert.ok(f.p.attackBuffer > 0, 'Hitstop must capture the attack buffer before returning');
  assert.equal(f.hits.length, 0);
  advance(f, .025);
  assert.equal(f.hits.length, 0);
  until(f, () => f.hits.length > 0, .35);
  assert.equal(f.hits.length, 1);
});

check('each swing keeps its captured facing even when movement reverses', () => {
  const f = fixture([-90]), attack = startSwing(f);
  f.game.setInput('left', true);
  until(f, () => f.hits.length > 0, .35);
  f.game.setInput('left', false);
  assert.equal(attack.facing, 1);
  assert.equal(f.hits.filter(h => h.id === 101).length, 1, 'The enemy originally ahead should be struck');
  assert.equal(f.hits.filter(h => h.id === 102).length, 0, 'A mid-swing turn must not hit behind the captured facing');
});

check('dash cancels the current windup and queued attacks without ghost damage', () => {
  const f = fixture(), attack = startSwing(f);
  advance(f, attack.windup * .3);
  f.p.attackBuffer = .15;
  pulse(f, 'dash');
  assert.ok(!f.p.attack, 'Dash must discard the active attack state');
  assert.equal(f.p.attackBuffer, 0, 'Dash must also discard queued attack input');
  assert.ok(f.p.attackTimer <= 0, 'Legacy attackTimer must not draw a phantom weapon swing');
  advance(f, .6);
  assert.equal(f.hits.length, 0);
});

check('canceling into a dash follows the newly requested movement direction', () => {
  const f = fixture(), attack = startSwing(f);
  advance(f, attack.windup * .25);
  f.game.setInput('left', true);
  pulse(f, 'dash');
  assert.equal(f.p.facing, -1, 'A retreating cancel must not dash toward the previous attack target');
  assert.ok(f.p.vx < 0, 'Dash velocity should follow the retreat direction');
});

check('holding attack during a dash cannot start a swing until the dash ends', () => {
  const f = fixture(); pulse(f, 'dash');
  f.game.setInput('attack', true);
  advance(f, .09);
  assert.ok(!f.p.attack, 'The dash and weapon swing must not overlap');
  assert.equal(f.hits.length, 0);
  until(f, () => !!f.p.attack, .25);
  assert.ok(f.p.dashTimer <= 0);
  f.game.setInput('attack', false);
});

check('letting the combo expire restarts the first light slash', () => {
  const f = fixture(), first = startSwing(f);
  advance(f, first.duration + 1.05);
  const restarted = startSwing(f);
  assert.equal(restarted.index, 0);
});

check('crossing into active time in a coarse frame still registers one strike', () => {
  const f = fixture(), attack = startSwing(f);
  attack.elapsed = attack.windup + attack.active * .38 - .006;
  f.game._updateAttack(1 / 30);
  assert.equal(f.hits.length, 1);
  f.game._updateAttack(1 / 30);
  assert.equal(f.hits.length, 1);
});

check('all three swings first connect on contact frame four and impact freeze holds that complete pose', () => {
  for(let index=0;index<3;index++){
    const f=fixture();f.p.attackCombo=(index+2)%3;f.p.lastAttack=f.game.time;
    const attack=startSwing(f);assert.equal(attack.index,index);
    until(f,()=>f.hits.length>0,.6);
    assert.equal(f.hits.length,1);assert.equal(f.hits[0].spriteFrame,4,'First damage must coincide with the painted contact pose');
    assert.ok(f.hits[0].elapsed>=attack.windup+attack.active*.38-1e-8);
    assert.equal(f.game._knightFrame(attack),4);
    const heldElapsed=attack.elapsed;advance(f,.01);
    assert.equal(attack.elapsed,heldElapsed,'Hitstop must keep the painted pose frozen');assert.equal(f.game._knightFrame(attack),4);
    advance(f,attack.duration+.2);assert.equal(f.hits.length,1,'Repeating the contact sprite must not repeat damage');
  }
});

check('held combo transitions preserve five-to-five and two-to-two without a recovery-frame flash', () => {
  for(const frameStep of [1/60,.034]){
    const f=fixture(),transitions=[];f.game.setInput('attack',true);
    for(let elapsed=0;elapsed<3&&transitions.length<2;elapsed+=frameStep){
      const old=f.p.attack,before=old?f.game._knightFrame(old):null;
      frame(f,frameStep);
      const current=f.p.attack;
      if(old&&current&&old!==current)transitions.push({from:old.index,to:current.index,before,after:f.game._knightFrame(current),fromFrame:current.fromFrame});
      if(current&&current.index<2&&current.elapsed>=current.windup+current.active){
        assert.equal(f.game._knightFrame(current),current.index===0?5:2,'Long-held chaining must not expose recovery frame six or seven before the next swing');
      }
    }
    f.game.setInput('attack',false);assert.equal(transitions.length,2);
    assert.deepEqual(transitions.map(item=>[item.from,item.to,item.before,item.after,item.fromFrame]),[[0,1,5,5,5],[1,2,2,2,2]]);
  }
});

check('frame selection stays in the eight complete poses and the heavy windup visibly holds the raised-sword pose', () => {
  const f=fixture(),attacks=[];let previous=null;
  f.game.setInput('attack',true);
  for(let elapsed=0;elapsed<3&&attacks.length<3;elapsed+=dt){frame(f);if(f.p.attack&&f.p.attack!==previous){attacks.push(f.p.attack);previous=f.p.attack;}}
  f.game.setInput('attack',false);assert.equal(attacks.length,3);
  for(const attack of attacks){
    for(let sample=0;sample<=120;sample++){
      const selected=f.game._knightFrame(attack,attack.duration*sample/120);
      assert.ok(Number.isInteger(selected)&&selected>=0&&selected<8,'Sprite selection must always be a complete atlas frame');
    }
    const contact=attack.windup+attack.active*.38;
    assert.notEqual(f.game._knightFrame(attack,contact-1e-6),4);
    assert.equal(f.game._knightFrame(attack,contact+1e-6),4);
  }
  const heavy=attacks[2];assert.equal(heavy.fromFrame,2);
  for(let sample=0;sample<24;sample++)assert.equal(f.game._knightFrame(heavy,heavy.windup*sample/24),2,'The finisher must hold the raised sword through its anticipation');
  const uppercut=attacks[1];
  assert.deepEqual([.1,.5,.8,.95].map(ratio=>f.game._knightFrame(uppercut,uppercut.windup+uppercut.active*ratio)),[5,4,3,2]);
});

check('each of the eight frames draws one intact source rectangle with equal scale and its foot anchor at the origin', () => {
  const f=fixture(),frames=sandbox.window.__knightFramesForTest;
  assert.equal(frames.length,8);
  const png=fs.readFileSync(path.join(root,f.game.attackImage.src));
  assert.equal(png.toString('ascii',1,4),'PNG');
  const atlasWidth=png.readUInt32BE(16),atlasHeight=png.readUInt32BE(20);
  f.game.attackImage.complete=true;f.game.attackImage.naturalWidth=atlasWidth;f.game.attackImage.naturalHeight=atlasHeight;
  f.p.attack=null;f.p.dashTimer=0;
  for(let index=0;index<frames.length;index++){
    const [sx,sy,w,h,anchorX,footY,scale]=frames[index];
    assert.ok(sx>=0&&sy>=0&&w>0&&h>0&&sx+w<=atlasWidth&&sy+h<=atlasHeight,'A full painted pose must stay within the real PNG');
    assert.ok(anchorX>=0&&anchorX<=w&&footY>=0&&footY<=h);
    for(let other=0;other<index;other++){const [ox,oy,ow,oh]=frames[other];assert.ok(sx>=ox+ow||ox>=sx+w||sy>=oy+oh||oy>=sy+h,'Complete frame rectangles must not overlap neighboring poses');}
    f.p.idleFrame=index;drawCalls.length=0;f.game._drawSpriteKnight(context,f.p);
    assert.equal(drawCalls.length,1,'A character pose must be drawn once instead of assembled from body parts');
    const call=drawCalls[0];assert.equal(call.length,9);assert.equal(call[0],f.game.attackImage);
    assert.deepEqual(call.slice(1,5),[sx,sy,w,h]);
    const [dx,dy,dw,dh]=call.slice(5);
    assert.ok(Math.abs(dw/w-dh/h)<1e-10,'Horizontal and vertical scale must match');
    assert.ok(Math.abs(dw/w-scale)<1e-10);
    assert.ok(Math.abs(dx+anchorX*dw/w)<1e-9,'The painted body anchor must land on local x=0');
    assert.ok(Math.abs(dy+footY*dh/h)<1e-9,'Every painted foot anchor must land on local y=0');
    drawCalls.length=0;f.game._drawPlayer(context);
    assert.equal(drawCalls.length,1,'The integrated player renderer must also draw exactly one complete pose');
    assert.equal(drawCalls[0][0],f.game.attackImage);
  }
});

for (const game of made) game.destroy();
const failed = checks.filter(c => !c.ok);
console.log(JSON.stringify({ passed: checks.length - failed.length, failed: failed.length, checks }, null, 2));
if (failed.length) process.exitCode = 1;
