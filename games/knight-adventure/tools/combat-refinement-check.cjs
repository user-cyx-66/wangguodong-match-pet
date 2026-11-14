/* Focused contact rules for the chicken / charger refinement.
 * Uses real shipped game methods in deterministic VM fixtures. Canvas and images
 * are stubbed; these checks make no claim about painted frames, white pixels,
 * real browser FPS, or the artistic quality of an effect.
 * Run: node tools/combat-refinement-check.cjs [--baseline] [--label=NAME]
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const dist=path.resolve(__dirname,'../dist');
const record=path.resolve(__dirname,'../../../制作资料/过程记录/精修试玩_2026-11-13');
const baseline=process.argv.includes('--baseline');
const label=process.argv.find(v=>v.startsWith('--label='))?.slice(8)||(baseline?'baseline':'current');
assert.match(label,/^[a-zA-Z0-9_-]+$/,'Report label must be a simple filename');
const DT=1/120,checks=[],games=[];
const sourceHashes={};
function source(file){
  const archived=path.join(record,'基线源码',file);
  const filePath=baseline&&fs.existsSync(archived)?archived:path.join(dist,file);
  const content=fs.readFileSync(filePath,'utf8');
  sourceHashes[file]={path:filePath,sha256:crypto.createHash('sha256').update(content).digest('hex')};
  return content;
}
// Read once, so another agent saving a production change cannot mix versions
// between fixtures in this one test run.
const scripts=['content.js','adventure.js','artsets.js','game.js','stage-rules.js','enemy-variety.js'].map(file=>({file,code:source(file)}));
function environment(){
  let state=0x6041;const math=Object.create(Math);
  math.random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return(state>>>0)/4294967296;};
  const gradient={addColorStop(){}};
  const ctx=new Proxy({}, {get:(t,k)=>k in t?t[k]:k==='createLinearGradient'||k==='createRadialGradient'?()=>gradient:k==='measureText'?()=>({width:80}):()=>{},set:(t,k,v)=>(t[k]=v,true)});
  const storage=new Map(),events=[];
  const canvas={width:1280,height:720,addEventListener(){},removeEventListener(){},getContext:()=>ctx};
  const sandbox={window:{addEventListener(){},removeEventListener(){},devicePixelRatio:1},
    document:{hidden:false,visibilityState:'visible',addEventListener(){},removeEventListener(){},createElement:()=>({...canvas})},
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
    Image:class{constructor(){this.complete=false;this.naturalWidth=0;this.naturalHeight=0;}addEventListener(){}},
    requestAnimationFrame:()=>1,cancelAnimationFrame(){},performance:{now:()=>0},console,Math:math};
  vm.createContext(sandbox);
  for(const {file,code} of scripts)vm.runInContext(code,sandbox,{filename:file});
  const g=new sandbox.window.KnightGame(canvas,{onEvent:event=>events.push({...event})});
  g.setAudio(false);g.startNew();games.push(g);
  // Isolate one real enemy on safe ground; retain the real enemy/damage code.
  const p=g.player;p.x=500;p.y=590;p.vx=0;p.vy=0;p.facing=1;p.onGround=true;p.invuln=100;
  g.platforms=[];g.projectiles=[];g.hazards=[];g.enemyFields=[];
  const enemy=g._makeEnemy({type:'wolf',variant:'charger',x:575},9001);
  enemy.hp=enemy.maxHp=100000;enemy.brain.state='recover';enemy.brain.left=100;
  g.enemies=[enemy];g.stageTotal=1;
  // Adventure has its own world population triggers, unrelated to contact.
  sandbox.window.KnightAdventure.update=()=>{};
  sandbox.window.KnightStageRules.update=()=>{};
  const damageCalls=[],bursts=[];const original=g._damageEnemy.bind(g),burst=g._burst.bind(g);
  g._damageEnemy=(...args)=>{const hp=args[0].hp;const attack=p.attack;const value=original(...args);if(args[0].hp<hp)damageCalls.push({enemy:args[0],damage:hp-args[0].hp,attack,index:attack?.index,elapsed:attack?.elapsed,knockback:args[0].knockback,stun:args[0].stun});return value;};
  g._burst=(...args)=>{bursts.push(args.slice());return burst(...args);};
  return {g,p,enemy,ctx,sandbox,events,damageCalls,bursts};
}
function check(name,fn){try{checks.push({name,ok:true,details:fn()});}catch(error){checks.push({name,ok:false,error:error.stack||String(error)});}}
function tick(f,dt=DT){f.g._update(dt);f.g.pressed={};}
function advance(f,time,dt=DT,before){for(let t=0;t<time-1e-8;t+=dt){before?.();tick(f,Math.min(dt,time-t));}}
function prepareSwing(f,index){f.p.attackCombo=(index+3)%4;f.p.lastAttack=f.g.time;f.g._attack();assert.equal(f.p.attack.index,index);return f.p.attack;}
function contact(f,index){const a=prepareSwing(f,index);for(let i=0;i<150&&!f.damageCalls.length;i++)f.g._updateAttack(DT);assert.ok(f.damageCalls.length,'Expected a real melee contact');return a;}
function round(v){return Math.round(v*10000)/10000;}

check('normal input deals no windup damage and only one hit to a target during its full swing',()=>{
  const f=environment();f.g.setInput('attack',true);tick(f);f.g.setInput('attack',false);
  const a=f.p.attack;assert.ok(a);const hp=f.enemy.hp;
  advance(f,a.windup*.6);assert.equal(f.enemy.hp,hp,'The windup may not hurt the target');
  advance(f,a.duration+.2);assert.equal(f.damageCalls.length,1,'A held contact pose may not repeat damage');
  assert.equal(f.damageCalls[0].attack,a);assert.ok(f.damageCalls[0].elapsed>=a.windup);
  return {damage:f.damageCalls[0].damage,firstContact:round(f.damageCalls[0].elapsed),windup:a.windup};
});

check('re-entering the same contact and adding a second target never reapplies damage or knockback',()=>{
  const f=environment(),a=contact(f,0),hp=f.enemy.hp;
  // Simulate the first impulse having already decayed. Repeated overlap must not
  // reset it just because the contact phase is still being sampled.
  f.g._updateEnemy(f.enemy,.03);const impulse=f.enemy.knockback;
  for(let i=0;i<12;i++)f.g._strike(a);
  assert.equal(f.enemy.hp,hp);assert.equal(f.enemy.knockback,impulse);
  const second=f.g._makeEnemy({type:'wolf',variant:'charger',x:f.p.x+80},9002);
  second.hp=second.maxHp=100000;f.g.enemies.push(second);
  f.g._strike(a);const secondHp=second.hp,secondImpulse=second.knockback;
  for(let i=0;i<12;i++)f.g._strike(a);
  assert.equal(f.enemy.hp,hp);assert.equal(second.hp,secondHp);assert.equal(second.knockback,secondImpulse);
  assert.equal(f.damageCalls.length,2);
  return {targets:2,appliedContacts:f.damageCalls.length,remainingFirstImpulse:round(impulse)};
});

check('knockback moves once in both the stunned and recovery update branches',()=>{
  const rows=[];
  for(const direction of [-1,1]){
    const stunned=environment(),recovering=environment();
    for(const f of [stunned,recovering]){f.p.facing=direction;f.enemy.x=f.p.x+direction*75;contact(f,0);}
    stunned.enemy.stun=.5;recovering.enemy.stun=0;
    const sx=stunned.enemy.x,rx=recovering.enemy.x;
    for(let i=0;i<6;i++){stunned.g._updateEnemy(stunned.enemy,DT);recovering.g._updateEnemy(recovering.enemy,DT);}
    const a=(stunned.enemy.x-sx)*direction,b=(recovering.enemy.x-rx)*direction;
    assert.ok(a>0&&b>0,'Both phases should move away from the sword');
    assert.ok(Math.abs(a-b)<.5,'Changing enemy state may not double the same knockback');
    rows.push({direction,stunnedDistance:round(a),recoveringDistance:round(b)});
  }
  return rows;
});

check('one knockback impulse decays monotonically, is symmetric, and is stable at 60/120 Hz',()=>{
  const rows=[];
  for(const index of [0,3])for(const direction of [-1,1])for(const hz of [60,120]){
    const f=environment();f.p.facing=direction;f.enemy.x=f.p.x+direction*75;contact(f,index);
    // No voluntary movement: measure one impulse independently of charger AI.
    f.enemy.brain.state='recover';f.enemy.brain.left=100;
    const start=f.enemy.x;let previous=Math.abs(f.enemy.knockback),maxStep=0;
    for(let i=0;i<hz;i++){
      const before=f.enemy.x;f.g._updateEnemy(f.enemy,1/hz);
      const current=Math.abs(f.enemy.knockback);
      assert.ok(current<=previous+.001,'The original hit may not be reapplied on later frames');
      maxStep=Math.max(maxStep,Math.abs(f.enemy.x-before));previous=current;
    }
    const distance=(f.enemy.x-start)*direction;
    assert.ok(distance>5&&distance<80,'Single contact should displace visibly without a repeated shove');
    assert.ok(previous<1,'The enemy must settle after a single impulse');
    rows.push({index:index+1,direction,hz,distance:round(distance),remainingImpulse:round(previous),maxStep:round(maxStep)});
  }
  for(const row of rows){
    const opposite=rows.find(x=>x.index===row.index&&x.hz===row.hz&&x.direction===-row.direction);
    assert.ok(Math.abs(opposite.distance-row.distance)<.5,'Left/right impulse should behave alike');
    const otherRate=rows.find(x=>x.index===row.index&&x.direction===row.direction&&x.hz!==row.hz);
    assert.ok(Math.abs(otherRate.distance-row.distance)<3,'Normal frame-rate variation should not multiply displacement');
  }
  return rows;
});

check('a heavy hit interrupts a charger instead of resuming its old lunge immediately after stun',()=>{
  const f=environment();Object.assign(f.enemy.brain,{state:'active',left:.42,direction:-1,hit:false});
  const start=f.enemy.x;contact(f,3);
  let leftmost=f.enemy.x;
  for(let i=0;i<36;i++){f.g._updateEnemy(f.enemy,DT);leftmost=Math.min(leftmost,f.enemy.x);}
  // This is an observed motion contract. It does not prescribe a brain state,
  // recovery field, impulse integration formula, or an animation name.
  const retreat=f.enemy.x-start;
  assert.ok(retreat>=4,'Heavy contact must create a visible opening; old lunge reclaimed '+round(-retreat)+' px within 300 ms');
  assert.ok(leftmost>=start-2,'The interrupted charge must not pass through the attacker during the opening');
  return {netRetreatAt300ms:round(retreat),leftmost:round(leftmost),start};
});

check('light and heavy contacts have clearly different weight without a fullscreen damage flash',()=>{
  const rows=[];
  for(const index of [0,3]){
    const f=environment(),a=contact(f,index);
    rows.push({index:index+1,windup:a.windup,damage:f.damageCalls[0].damage,stop:f.g.hitstop,shake:f.g.shake,recoil:f.p.recoil,
      knockback:Math.abs(f.enemy.knockback),stun:f.enemy.stun,burstCount:f.bursts.reduce((n,b)=>n+b[2],0),flash:f.g.flash});
    assert.equal(f.g.flash,0,'Normal melee contact should not cover the entire screen with a damage flash');
  }
  const [light,heavy]=rows;
  assert.ok(heavy.windup>light.windup*1.5,'Heavy needs readable anticipation');
  assert.ok(heavy.damage>light.damage*1.5,'Heavy needs meaningfully stronger damage');
  assert.ok(heavy.stop>light.stop*1.3,'Heavy contact needs a stronger short impact pause');
  assert.ok(heavy.knockback>light.knockback*1.4,'Heavy should throw the target farther');
  assert.ok(heavy.shake>light.shake*1.4||heavy.recoil>light.recoil*1.4,'The heavy should visibly carry more impact');
  return rows;
});

check('contact effects stay local, distinguish light and heavy, expire quickly, and do not appear on a miss',()=>{
  const rows=[];
  for(const index of [0,3])for(const direction of [-1,1]){
    const f=environment();f.p.facing=direction;f.enemy.x=f.p.x+direction*75;const a=contact(f,index);
    const effects=f.g.particles.filter(p=>p.kind==='impact');
    assert.equal(effects.length,1,'One actual contact needs one localized impact effect');
    const effect=effects[0];
    assert.ok((effect.x-f.p.x)*direction>0&&Math.abs(effect.x-f.enemy.x)<90,'Impact should appear beside the contacted body');
    assert.ok(effect.y<f.enemy.y-12&&effect.y>f.enemy.y-160,'Contact light should stay on the enemy silhouette');
    assert.ok(effect.life>0&&effect.life<=.28,'Contact effects must clear quickly enough to keep the duel readable');
    for(let i=0;i<6;i++)f.g._strike(a);
    assert.equal(f.g.particles.filter(p=>p.kind==='impact').length,1,'Repeated contact samples must not spawn another impact');
    rows.push({index:index+1,direction,x:effect.x,y:effect.y,life:effect.life,size:effect.size,color:effect.color});
    f.g._updateEffects(.35);
    assert.equal(f.g.particles.filter(p=>p.kind==='impact').length,0,'Impact may not linger after its lifetime');
  }
  const light=rows.find(r=>r.index===1),heavy=rows.find(r=>r.index===4);
  assert.ok(heavy.size>light.size*1.4,'Heavy contact must have a distinctly larger local shape');
  assert.ok(heavy.life>light.life*1.25,'Heavy contact needs a more sustained local accent');
  assert.notEqual(heavy.color,light.color,'Light and heavy accents should have distinct color treatments');
  const miss=environment();miss.enemy.x=miss.p.x+400;const a=prepareSwing(miss,0);
  for(let i=0;i<100;i++)miss.g._updateAttack(DT);
  assert.equal(miss.damageCalls.length,0);assert.equal(miss.g.particles.filter(p=>p.kind==='impact').length,0);
  assert.equal(a.connected,false,'A whiff may not claim a connected contact');
  return rows;
});

check('normal impact pause is bounded and multiple overlapped targets cannot stack it into a lock',()=>{
  const rows=[];
  for(const index of [0,3])for(const targets of [1,6]){
    const f=environment();
    for(let i=1;i<targets;i++){const e=f.g._makeEnemy({type:'wolf',variant:'charger',x:f.p.x+70+i},9001+i);e.hp=e.maxHp=100000;e.brain.state='recover';e.brain.left=100;f.g.enemies.push(e);}
    const a=contact(f,index),initial=f.g.hitstop;
    assert.ok(initial>0&&initial<=.09,'Normal contact pause must remain below 90 ms');
    let frozen=0;const atContact=a.elapsed;
    for(let i=0;i<60&&a.elapsed===atContact;i++){tick(f);frozen+=DT;}
    assert.ok(a.elapsed>atContact,'Simulation must resume after the contact pause');
    assert.ok(frozen<=.11,'A single contact may not freeze simulation for over 110 ms');
    advance(f,.6);assert.ok(!f.p.attack,'Attack recovery must still finish');
    rows.push({index:index+1,targets,requestedStop:initial,observedFreeze:round(frozen)});
  }
  for(const index of [1,4]){const one=rows.find(x=>x.index===index&&x.targets===1),many=rows.find(x=>x.index===index&&x.targets===6);assert.ok(many.requestedStop<=one.requestedStop+DT,'More targets may not accumulate pause duration');}
  return rows;
});

check('death rewards once, cannot attack, fades out, and retry clears contact state',()=>{
  const f=environment();f.enemy.hp=1;
  Object.assign(f.enemy.brain,{state:'active',left:.42,direction:-1,hit:false});
  const gold=f.g.gold;contact(f,3);assert.equal(f.enemy.hp,0);assert.equal(f.g.stageKills,1);
  const reward=f.g.gold-gold,hp=f.p.hp,x=f.enemy.x;
  f.p.invuln=0;
  let outgoingAttempts=0;const damagePlayer=f.g._damagePlayer.bind(f.g);
  f.g._damagePlayer=(...args)=>{outgoingAttempts++;return damagePlayer(...args);};
  // Reusing the same target from an overlapping sword or a returning ball must
  // not award another kill or revive any hostile behavior.
  for(let i=0;i<12;i++)f.g._damageEnemy(f.enemy,999,255);
  assert.equal(f.g.gold-gold,reward);assert.equal(f.g.stageKills,1);
  f.g.hitstop=0;advance(f,.55);
  assert.equal(f.p.hp,hp,'A dead charger may not finish its lunge damage');
  assert.equal(outgoingAttempts,0,'Dead foes may not attempt damage even when the player is vulnerable');
  assert.equal(f.enemy.x,x,'Dead foes may not continue to charge');
  let deadDraws=0;const draw=f.g._drawEnemy.bind(f.g);
  f.g._drawEnemy=(ctx,e)=>{if(e===f.enemy)deadDraws++;return draw(ctx,e);};
  f.g._draw();assert.equal(deadDraws,0,'Expired death pose must leave the draw list');
  f.g.retry();assert.equal(f.g.hitstop,0);assert.equal(f.g.player.attack,null);
  assert.ok(f.g.enemies.every(e=>e.hp>0&&!(e.deadTimer>0)),'Retry should restore live foes without old death timers');
  return {reward,killCount:1,outgoingAttempts,deathTimer:round(f.enemy.deadTimer),expiredDrawCalls:deadDraws};
});

for(const g of games)g.destroy();
const failed=checks.filter(c=>!c.ok);
const report={label,baseline,scope:'Deterministic contact behavior only; stubbed Canvas/images; no pixel fidelity or real FPS claim',sourceHashes,passed:checks.length-failed.length,failed:failed.length,checks};
fs.mkdirSync(record,{recursive:true});fs.writeFileSync(path.join(record,'combat-rules-'+label+'.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));if(failed.length)process.exitCode=1;
