/* Independent rules checks for the recoverable basketball.
   Canvas/Image are stubs. This file does not claim rendered-pose fidelity,
   asset correctness in a browser, or actual FPS. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..','dist'),DT=1/120,SAVE='wangguodong-knight-v1';
const made=[],checks=[];
function environment({adventure=false}={}){
  let seed=0x71424;
  const math=Object.create(Math);math.random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
  const gradient={addColorStop(){}};
  const ctx=new Proxy({}, {get:(t,k)=>k in t?t[k]:k==='createLinearGradient'||k==='createRadialGradient'?()=>gradient:k==='measureText'?()=>({width:80}):()=>{},set:(t,k,v)=>(t[k]=v,true)});
  const storage=new Map(),events=[],listeners=new Map(),canvasListeners=new Map();
  const canvas={width:1280,height:720,getContext:()=>ctx,addEventListener(k,v){canvasListeners.set(k,v);},removeEventListener(){}};
  const sandbox={window:{addEventListener(k,v){listeners.set(k,v);},removeEventListener(){},devicePixelRatio:1},
    document:{hidden:false,visibilityState:'visible',addEventListener(){},removeEventListener(){},createElement:()=>({...canvas})},
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
    Image:class{constructor(){this.complete=false;this.naturalWidth=0;this.naturalHeight=0;}addEventListener(){}},
    requestAnimationFrame:()=>1,cancelAnimationFrame(){},performance:{now:()=>0},Math:math,console};
  vm.createContext(sandbox);
  for(const file of ['content.js',...(adventure?['adventure.js']:[]),'artsets.js','game.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),sandbox,{filename:file});
  const make=()=>{const g=new sandbox.window.KnightGame(canvas,{onEvent:event=>events.push({...event})});g.setAudio(false);made.push(g);return g;};
  return {sandbox,storage,events,listeners,canvasListeners,make};
}
function fixture({facing=1,range=300,adventure=false,type='skeleton',variant,playerY=590,targetY=590,platforms=[]}={}){
  const e=environment({adventure}),g=e.make();g.startNew();const p=g.player;p.x=800;p.y=playerY;p.vx=0;p.vy=0;p.onGround=true;p.facing=facing;
  const target=g._makeEnemy({type,variant,x:p.x+range*facing,y:targetY},101);target.y=targetY;if(variant)target.variant=variant;target.hp=target.maxHp=10000;target.dormant=false;
  g.enemies=[target];g.stageTotal=1;g.platforms=platforms.map(q=>({...q}));g._updateEnemy=()=>{};
  const hits=[],damage=g._damageEnemy.bind(g);
  g._damageEnemy=(enemy,amount,knockback)=>{hits.push({time:g.time,id:enemy.id,amount,knockback,state:g.basketball?.state});return damage(enemy,amount,knockback);};
  return {...e,g,p,target,hits};
}
function tick(f,dt=DT){f.g._update(dt);f.g.pressed={};}
function advance(f,seconds,before){for(let t=0;t<seconds-1e-8;t+=DT){before?.();tick(f,Math.min(DT,seconds-t));}}
function until(f,predicate,seconds=4){for(let t=0;t<seconds;t+=DT){if(predicate())return;tick(f);}assert.ok(predicate(),'Timed out: '+JSON.stringify({ranged:f.g.getState().ranged,ball:f.g.basketball,player:{x:f.p.x,y:f.p.y},hits:f.hits}));}
function pulse(f,action){f.g.setInput(action,true);tick(f);f.g.setInput(action,false);}
function throwBall(f){pulse(f,'throw');assert.ok(f.p.throw,'Ordinary throw input must start the visible windup');}
function ready(f){return f.g.getState().ranged.state==='ready'&&f.g.getState().ranged.canThrow;}
function check(name,fn){try{const details=fn();checks.push({name,ok:true,...(details?{details}:{})});}catch(e){checks.push({name,ok:false,error:e.stack||String(e)});}}

check('new game starts with one ready basketball and keyboard Q starts its windup',()=>{
  const f=fixture();const r=f.g.getState().ranged;
  assert.equal(r.state,'ready');assert.equal(r.canThrow,true);assert.equal(r.cooldown,0);
  f.listeners.get('keydown')({code:'KeyQ',preventDefault(){}});tick(f);
  f.listeners.get('keyup')({code:'KeyQ',preventDefault(){}});
  assert.equal(f.g.getState().ranged.state,'windup');assert.ok(f.p.throw);assert.equal(f.hits.length,0);
});
check('ordinary input visibly winds up before releasing and cannot deal premature damage',()=>{
  const f=fixture();throwBall(f);advance(f,.1);
  assert.equal(f.g.getState().ranged.state,'windup');assert.equal(f.hits.length,0);
  until(f,()=>f.g.getState().ranged.state!=='windup',1);
  assert.ok(['outbound','returning'].includes(f.g.getState().ranged.state));
});
check('left mouse button uses the same one-shot throw input and releases without a stuck key',()=>{
  const f=fixture();const down=f.canvasListeners.get('pointerdown'),up=f.listeners.get('pointerup');
  assert.equal(typeof down,'function');assert.equal(typeof up,'function');
  down({button:0,preventDefault(){}});tick(f);up({button:0,preventDefault(){}});
  assert.ok(f.p.throw);assert.equal(f.g.input.throw,false);until(f,()=>ready(f),5);assert.equal(f.hits.length,1);
});
check('basketball hits a grounded enemy at genuinely ranged distance and knocks it away once',()=>{
  const f=fixture(),hp=f.target.hp;throwBall(f);until(f,()=>f.hits.length>0,2);
  assert.equal(f.hits[0].id,f.target.id);assert.ok(hp>f.target.hp);assert.ok(f.hits[0].knockback>0);
  assert.equal(f.hits[0].amount,f.g._stats().attack*1.25,'Basketball should inherit the current attack growth');
  assert.ok(Math.abs(f.target.x-f.p.x)>200,'Fixture must stay outside ordinary sword reach');
  until(f,()=>ready(f),5);assert.equal(f.hits.length,1,'Outbound and returning legs must not double-hit');
  return {targetDistance:300,damage:hp-f.target.hp};
});
check('the returning ball never damages another enemy on its way back',()=>{
  const f=fixture();throwBall(f);until(f,()=>f.hits.length===1,2);
  const first=f.hits[0].id;
  const intercept=f.g._makeEnemy({type:'skeleton',x:(f.g.basketball.x+f.p.x)*.5},102);intercept.hp=intercept.maxHp=10000;intercept.dormant=false;
  f.g.enemies.push(intercept);const hp=intercept.hp;
  until(f,()=>ready(f),5);assert.equal(intercept.hp,hp);assert.ok(f.hits.every(h=>h.id===first));
});
check('the ranged collision also works for a flying bat and the larger dragon body',()=>{
  const details=[];
  for(const type of ['bat','dragon']){
    const f=fixture({type,range:330});throwBall(f);until(f,()=>f.hits.length>0,3);
    assert.equal(f.hits[0].id,f.target.id);assert.equal(f.hits.length,1);
    details.push({type,damage:f.hits[0].amount});
  }
  return {targets:details};
});
check('nearest physical impact wins even when a farther target is first in the enemy array',()=>{
  const f=fixture({range:220});const near=f.target,far=f.g._makeEnemy({type:'skeleton',x:f.p.x+390},102);
  far.hp=far.maxHp=10000;far.dormant=false;f.g.enemies=[far,near];throwBall(f);until(f,()=>ready(f),5);
  assert.equal(f.hits.length,1);assert.equal(f.hits[0].id,near.id);assert.equal(far.hp,10000);
});
check('throws respect facing in both directions and do not damage a target behind the rider',()=>{
  const left=fixture({facing:-1});throwBall(left);until(left,()=>left.hits.length>0,2);assert.ok(left.hits[0].knockback<0);
  const behind=fixture({range:-300});throwBall(behind);until(behind,()=>ready(behind),5);assert.equal(behind.hits.length,0);
});
check('a distant target outside the throw range is not hit and the missed ball comes back',()=>{
  const f=fixture({range:850});throwBall(f);until(f,()=>ready(f),6);assert.equal(f.hits.length,0);assert.equal(f.target.hp,10000);
  assert.equal(f.g.getState().ranged.canThrow,true);
});
check('repeated taps while the ball is out cannot create simultaneous throws or extra hits',()=>{
  const f=fixture();throwBall(f);until(f,()=>f.g.getState().ranged.state==='outbound',1);
  for(let n=0;n<12;n++){pulse(f,'throw');advance(f,.015);}
  until(f,()=>f.g.getState().ranged.state==='cooldown',3);
  assert.equal(f.hits.length,1);assert.equal(f.p.throw,null);assert.equal(f.g.getState().ranged.canThrow,false);
  pulse(f,'throw');assert.equal(f.p.throw,null);assert.equal(f.g.getState().ranged.state,'cooldown');
});
check('one held Q press cannot automatically launch again after its ball has returned and cooled down',()=>{
  const f=fixture();f.g.setInput('throw',true);advance(f,7);f.g.setInput('throw',false);
  assert.equal(f.hits.length,1);assert.equal(ready(f),true);
  throwBall(f);until(f,()=>f.hits.length===2,2);assert.equal(f.hits.length,2);
});
check('sword combat can resume after the throw follow-through while the basketball is still away',()=>{
  const f=fixture({range:-500});throwBall(f);
  until(f,()=>!f.p.throw&&['outbound','returning'].includes(f.g.getState().ranged.state),2);
  pulse(f,'attack');assert.ok(f.p.attack,'The ranged weapon must not lock out the sword until the ball returns');
  assert.ok(['outbound','returning'].includes(f.g.getState().ranged.state));
});
check('dash cancels an unreleased windup without a phantom flying ball',()=>{
  const f=fixture();throwBall(f);advance(f,.06);pulse(f,'dash');advance(f,.65);
  assert.equal(f.p.throw,null);assert.equal(f.hits.length,0);assert.ok(!['outbound','returning'].includes(f.g.getState().ranged.state));
});
check('the ball has an actual curved trajectory when there is no aim target',()=>{
  const f=fixture({range:-500});throwBall(f);until(f,()=>f.g.getState().ranged.state==='outbound',1);
  const points=[];
  for(let n=0;n<3;n++){points.push({x:f.g.basketball.x,y:f.g.basketball.y});advance(f,.12);}
  assert.ok(points[1].x>points[0].x&&points[2].x>points[1].x);
  const first=points[1].y-points[0].y,second=points[2].y-points[1].y;
  assert.ok(second>first+1,'Gravity should change the vertical increment, not move a flat sprite horizontally');
  return {points};
});
check('normal jump followed by a throw can hit a ground target while the knight is airborne',()=>{
  const f=fixture();pulse(f,'jump');advance(f,.12);assert.equal(f.p.onGround,false);throwBall(f);
  until(f,()=>f.hits.length>0,3);assert.equal(f.hits[0].id,f.target.id);
});
check('mounted throwing uses its higher release point and still deals one recoverable ranged hit',()=>{
  const f=fixture();pulse(f,'summon');until(f,()=>f.g.getState().mount.state==='ready',2);
  f.p.x=f.g.mount.x;pulse(f,'ride');assert.equal(f.g.getState().mount.mounted,true);
  f.target.x=f.p.x+300;throwBall(f);until(f,()=>f.g.getState().ranged.state==='outbound',1);
  assert.ok(f.g.basketball.y<f.p.y-100,'Mounted throw needs to originate near the seated rider, not under the cat');
  until(f,()=>ready(f),5);assert.equal(f.hits.length,1);assert.equal(f.g.getState().mount.mounted,true);
});
check('pause freezes the actual loop state for the projectile, cooldown and damage',()=>{
  const f=fixture();throwBall(f);until(f,()=>f.g.getState().ranged.state==='outbound',1);
  f.g.pause();const b=f.g.basketball,snapshot={state:b.state,x:b.x,y:b.y,timer:b.timer,cooldown:b.cooldown,hits:f.hits.length};
  f.g.lastTime=1000;f.g._draw=()=>{};
  for(let i=1;i<=90;i++)f.g._loop(1000+i*1000/60);
  assert.deepEqual({state:b.state,x:b.x,y:b.y,timer:b.timer,cooldown:b.cooldown,hits:f.hits.length},snapshot);
  f.g.resume();until(f,()=>f.hits.length>0,2);
});
check('backpack ball recovers to the moving knight and becomes usable after cooldown',()=>{
  const f=fixture({range:-500});throwBall(f);until(f,()=>f.g.getState().ranged.state==='returning',2);
  f.g.setInput('left',true);advance(f,.45);f.g.setInput('left',false);until(f,()=>ready(f),5);
  const before=f.p.x;throwBall(f);until(f,()=>f.g.getState().ranged.state==='outbound',1);
  assert.ok(Math.abs(f.g.basketball.originX-before)<90,'Next release must follow the current rider instead of the old throw origin');
});
check('a real encounter barrier blocks a throw against an otherwise active enemy outside the arena',()=>{
  const e=environment({adventure:true}),g=e.make();g.startNew();g._updateEnemy=()=>{};
  const f={...e,g,p:g.player,hits:[]},a=g.adventure,enc=a.encounters[0];
  g.player.x=enc.x;g.player.y=590;g.player.onGround=true;g.player.facing=1;
  tick(f);assert.equal(a.activeEncounter,enc.id,'Fixture must activate the real campaign barrier');
  g.player.x=enc.arena[1]-65;
  const outside=g._makeEnemy({type:'skeleton',x:enc.arena[1]+160},888);outside.hp=outside.maxHp=10000;outside.dormant=false;
  g.enemies.push(outside);const damage=g._damageEnemy.bind(g);g._damageEnemy=(enemy,...rest)=>{f.hits.push(enemy.id);return damage(enemy,...rest);};
  throwBall(f);let furthest=-Infinity;
  for(let t=0;t<3;t+=DT){tick(f);if(g.basketball.state==='outbound')furthest=Math.max(furthest,g.basketball.x);}
  assert.ok(furthest<=enc.arena[1]+1,'Ball must turn back at the barrier');assert.equal(outside.hp,10000);assert.ok(!f.hits.includes(outside.id));
});
check('a solid platform wall blocks the outbound ball instead of allowing a target behind it to be hit',()=>{
  const f=fixture();f.g.platforms=[{x:f.p.x+130,y:320,w:35,h:270}];throwBall(f);until(f,()=>ready(f),5);
  assert.equal(f.hits.length,0);assert.equal(f.target.hp,10000);
});
check('swept collision catches a thin solid even when one update travels past its full width',()=>{
  const f=fixture();throwBall(f);until(f,()=>f.g.getState().ranged.state==='outbound',1);
  const start=f.g.basketball.x,x=start+17;
  f.g.platforms=[{x,y:300,w:2,h:290}];tick(f,.05);
  assert.equal(f.g.getState().ranged.state,'returning');assert.ok(f.g.basketball.x<x);
  assert.equal(f.hits.length,0);
  return {startX:start,wallX:x,collisionX:f.g.basketball.x};
});
check('death and retry clear a transient throw without losing equipment or gold',()=>{
  const f=fixture();f.g.gold=456;f.g.upgrades.weapon=2;throwBall(f);until(f,()=>f.g.getState().ranged.state==='outbound',1);
  f.p.invuln=0;f.g._damagePlayer(10000,0,f.p.x-50,false);assert.equal(f.g.dead,true);f.g.retry();
  assert.equal(f.g.dead,false);assert.equal(f.g.player.throw,null);assert.equal(f.g.getState().ranged.state,'ready');assert.equal(f.g.gold,456);assert.equal(f.g.upgrades.weapon,2);
});
check('pre-basketball saves restore normal progression and receive one ready transient basketball',()=>{
  const e=environment({adventure:true});const level=e.sandbox.window.GAME_CONTENT.levels[5];
  e.storage.set(SAVE,JSON.stringify({version:1,campaignVersion:3,stageId:level.id,stageIndex:5,level:8,xp:14,gold:234,upgrades:{weapon:3,armor:2,charm:1},comboEnergy:70}));
  const g=e.make();g.continueGame();assert.equal(g.stageIndex,5);assert.equal(g.level,8);assert.equal(g.gold,234);assert.equal(g.upgrades.weapon,3);assert.equal(g.getState().ranged.state,'ready');assert.equal(g.getState().ranged.canThrow,true);
});

check('a 300px throw is ready again in under one second without the old long recovery',()=>{
  const f=fixture();const start=f.g.time;throwBall(f);until(f,()=>ready(f),2);
  const elapsed=f.g.time-start;assert.ok(elapsed<1,`Throw cycle took ${elapsed}s`);assert.equal(f.hits.length,1);return {seconds:elapsed};
});
check('held-ball release and visible world origin share exact anchors in both directions, walking and mounted',()=>{
  for(const mounted of [false,true])for(const facing of [-1,1]){
    const f=fixture({facing});if(mounted){f.g.mount.state='mounted';f.g.mount.run=2.1;f.p.vx=425*facing;}
    const hand=f.g._ballWorld(f.g._ballHeldLocal(.12,mounted),mounted),release=f.g._ballGrip();
    assert.ok(Math.hypot(hand.x-release.x,hand.y-release.y)<.001);
    const near=f.g._ballWorld(f.g._ballHeldLocal(.11999,mounted),mounted);assert.ok(Math.hypot(near.x-release.x,near.y-release.y)<.1);
  }
});
check('recall lands on the current visible backpack anchor instead of jumping from hand to back',()=>{
  const f=fixture();throwBall(f);until(f,()=>f.g.basketball.state==='returning',1);
  until(f,()=>f.g.basketball.state==='cooldown',1);const b=f.g.basketball,home=f.g._ballHome();
  assert.ok(Math.hypot(b.x-home.x,b.y-home.y)<.001);assert.ok(b.cooldown<=.12);
});
check('released throwing recovery can be cancelled with sword or guard while preserving one flying ball',()=>{
  for(const action of ['attack','guard']){const f=fixture({range:450});throwBall(f);until(f,()=>f.g.basketball.state==='outbound',1);
    pulse(f,action);assert.equal(f.p.throw,null);assert.ok(action==='attack'?f.p.attack:f.p.guarding);
    until(f,()=>ready(f),2);assert.ok(f.hits.length<=1);
  }
});
check('mounted fast throws still hit close ground targets instead of passing above their heads',()=>{
  for(const facing of [-1,1]){const f=fixture({facing,range:200});f.g.mount.state='mounted';throwBall(f);until(f,()=>ready(f),2);assert.equal(f.hits.length,1);}
});
check('jump height responds to holding the key and airborne sword attacks include a downward plunge',()=>{
  const heights=[];for(const hold of [false,true]){const f=fixture();pulse(f,'jump');f.g.setInput('jump',hold);let min=f.p.y;advance(f,.75,()=>{min=Math.min(min,f.p.y);});heights.push(590-min);}
  assert.ok(heights[1]>heights[0]+35);
  const f=fixture();pulse(f,'jump');f.g.setInput('jump',true);advance(f,.14);f.g.setInput('down',true);pulse(f,'attack');assert.ok(f.p.attack.aerial&&f.p.attack.dive);assert.ok(f.p.vy>500);return {shortJump:heights[0],heldJump:heights[1]};
});
check('a correctly timed front parry prevents HP loss while a late block still spends stamina',()=>{
  const f=fixture();f.p.guarding=true;f.p.guardTime=.06;const hp=f.p.hp,energy=f.g.comboEnergy;f.g._damagePlayer(20,-150,f.p.x+100,true);assert.equal(f.p.hp,hp);assert.ok(f.g.comboEnergy>energy);
  f.p.invuln=0;f.p.guarding=true;f.p.guardTime=.3;const stamina=f.p.guardStamina;f.g._damagePlayer(20,-150,f.p.x+100,true);assert.ok(f.p.hp<hp);assert.ok(f.p.guardStamina<stamina);
});

// Regression fixtures for a visible mushroom beneath a traversable canopy.
check('canopy screenshot: a player on y405 hits a mushroom on y590 below the same ledge',()=>{
  const f=fixture({type:'slime',variant:'mushroom',playerY:405,range:90,platforms:[{x:750,y:405,w:230,h:22,oneWay:true}]});
  throwBall(f);until(f,()=>ready(f),3);assert.equal(f.hits.length,1,'Standing on the thin canopy must not shield the visible mushroom underneath');assert.equal(f.hits[0].id,f.target.id);
  return {playerY:405,mushroomY:590,horizontalDistance:90,damage:10000-f.target.hp};
});
check('steep down throws can hit near mushrooms at 200px and 50px horizontal distances',()=>{
  for(const range of [200,50]){const f=fixture({type:'slime',variant:'mushroom',playerY:405,range,platforms:[{x:700,y:405,w:420,h:22,oneWay:true}]});throwBall(f);until(f,()=>ready(f),3);assert.equal(f.hits.length,1,`Downward throw at dx=${range} must reach its target`);}
});
check('a target within 20px of the release x is eligible when it is in front of the player',()=>{
  const f=fixture({type:'slime',variant:'mushroom',playerY:405,range:55,platforms:[{x:750,y:405,w:230,h:22,oneWay:true}]});
  assert.ok(Math.abs(f.target.x-f.g._ballGrip().x)<20,'Fixture must reproduce the old hand-x rejection');throwBall(f);until(f,()=>ready(f),3);assert.equal(f.hits.length,1);
});
check('left and right high-ground attacks use symmetric targeting and thin-platform behavior',()=>{
  for(const facing of [-1,1]){const f=fixture({facing,type:'slime',variant:'mushroom',playerY:405,range:90,platforms:[{x:620,y:405,w:360,h:22,oneWay:true}]});throwBall(f);until(f,()=>ready(f),3);assert.equal(f.hits.length,1,`Failed facing ${facing}`);assert.equal(Math.sign(f.hits[0].knockback),facing);}
});
check('a mushroom directly below the player can be hit from either facing',()=>{
  for(const facing of [-1,1]){const f=fixture({facing,type:'slime',variant:'mushroom',playerY:405,range:0,platforms:[{x:700,y:405,w:220,h:22,oneWay:true}]});throwBall(f);until(f,()=>ready(f),3);assert.equal(f.hits.length,1);}
});
check('the highest forest canopy does not exclude ground enemies just because feet differ by 250px',()=>{
  const f=fixture({type:'slime',variant:'mushroom',playerY:340,range:120,platforms:[{x:750,y:340,w:230,h:22,oneWay:true}]});throwBall(f);until(f,()=>ready(f),3);assert.equal(f.hits.length,1);
});
check('a ground throw reaches an enemy above a one-way canopy from below',()=>{
  const f=fixture({type:'slime',variant:'mushroom',targetY:405,range:90,platforms:[{x:850,y:405,w:230,h:22,oneWay:true}]});throwBall(f);until(f,()=>ready(f),3);assert.equal(f.hits.length,1);
});
check('a farther traversable ledge does not make an otherwise reachable enemy immune to the basketball',()=>{
  const f=fixture({type:'slime',variant:'mushroom',range:350,platforms:[{x:940,y:440,w:130,h:22,oneWay:true}]});throwBall(f);until(f,()=>ready(f),3);assert.equal(f.hits.length,1);
});
check('explicit projectile-blocking terrain still stops the basketball even if marked one-way',()=>{
  const f=fixture({type:'slime',variant:'mushroom',platforms:[{x:940,y:250,w:30,h:340,oneWay:true,blocksProjectiles:true}]});throwBall(f);until(f,()=>ready(f),3);assert.equal(f.hits.length,0);assert.equal(f.target.hp,10000);
});
check('a ball overlapping the visible mushroom cap damages it instead of passing above the old slime-sized box',()=>{
  const f=fixture({type:'slime',variant:'mushroom',range:300});const b=f.g.basketball;
  Object.assign(b,{state:'outbound',x:f.target.x-100,y:f.target.y-100,vx:1100,vy:0,originX:f.target.x-100,age:0,spin:0});
  for(let t=0;t<.3&&b.state==='outbound';t+=DT)tick(f);
  assert.equal(f.hits.length,1,'The visible cap and its collision body must agree');assert.equal(f.hits[0].id,f.target.id);
});

for(const g of made)g.destroy();
const failed=checks.filter(v=>!v.ok),report={scope:'Independent deterministic basketball gameplay rules; Canvas and Image are stubbed. Not browser visuals or measured FPS.',passed:checks.length-failed.length,failed:failed.length,checks};
const reportFile=path.join(path.resolve(process.env.KNIGHT_QA_DIR||path.join(__dirname,'..','.qa-local')),'basketball-flow-qa.json');
fs.mkdirSync(path.dirname(reportFile),{recursive:true});fs.writeFileSync(reportFile,JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));if(failed.length)process.exitCode=1;
