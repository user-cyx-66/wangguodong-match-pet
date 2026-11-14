/* Gameplay rules regression for the solo knight / summoned mount edition.
   Canvas and images are stubbed deliberately. This does not claim visual
   fidelity, browser performance, or 60 FPS; those require browser QA. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const CampaignPilot=require('./campaign-pilot.js');
const root=path.resolve(__dirname,'..','dist'),SAVE='wangguodong-knight-v1',DT=1/120;
const checks=[],made=[];
function environment({adventure=false,seed=0x6041}={}) {
  let state=seed>>>0;
  const math=Object.create(Math);math.random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return(state>>>0)/4294967296;};
  const gradient={addColorStop(){}};
  const ctx=new Proxy({}, {get:(t,k)=>k in t?t[k]:k==='createLinearGradient'||k==='createRadialGradient'?()=>gradient:k==='measureText'?()=>({width:80}):()=>{},set:(t,k,v)=>(t[k]=v,true)});
  const storage=new Map(),events=[],listeners=new Map();
  const canvas={width:1280,height:720,addEventListener(){},removeEventListener(){},getContext:()=>ctx};
  const sandbox={window:{addEventListener(k,v){listeners.set(k,v);},removeEventListener(){},devicePixelRatio:1},
    document:{hidden:false,visibilityState:'visible',addEventListener(){},removeEventListener(){},createElement:()=>({...canvas})},
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
    Image:class{constructor(){this.complete=false;this.naturalWidth=0;this.naturalHeight=0;}addEventListener(){}},
    requestAnimationFrame:()=>1,cancelAnimationFrame(){},performance:{now:()=>0},console,Math:math};
  vm.createContext(sandbox);
  for(const file of ['content.js',...(adventure?['adventure.js','stage-rules.js']:[]),...(fs.existsSync(path.join(root,'artsets.js'))?['artsets.js']:[]),'game.js',...(adventure?['enemy-variety.js']:[])])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),sandbox,{filename:file});
  const make=()=>{const g=new sandbox.window.KnightGame(canvas,{onEvent:event=>events.push({...event})});g.setAudio(false);made.push(g);return g;};
  return {sandbox,storage,events,make,ctx,listeners};
}
function fixture(){
  const e=environment(),g=e.make();g.startNew();
  const p=g.player;p.x=420;p.y=590;p.facing=1;
  const target=g._makeEnemy({type:'skeleton',x:p.x+75},101);target.hp=target.maxHp=100000;
  g.enemies=[target];g.stageTotal=1;g.platforms=[];g._updateEnemy=()=>{};
  const hits=[],starts=[];const origDamage=g._damageEnemy.bind(g),origAttack=g._attack.bind(g);
  g._damageEnemy=(enemy,damage,knockback)=>{hits.push({id:enemy.id,damage,index:g.player.attack?.index,attack:g.player.attack,elapsed:g.player.attack?.elapsed});origDamage(enemy,damage,knockback);};
  g._attack=()=>{const v=origAttack();if(g.player.attack)starts.push(g.player.attack);return v;};
  return {...e,g,p,target,hits,starts};
}
function tick(f,dt=DT){f.g._update(dt);f.g.pressed={};}
function advance(f,seconds,before){for(let t=0;t<seconds-1e-8;t+=DT){before?.();tick(f,Math.min(DT,seconds-t));}}
function until(f,predicate,seconds=2,before){for(let t=0;t<seconds;t+=DT){if(predicate())return;before?.();tick(f);}assert.ok(predicate(),'Timed out waiting for requested state');}
function pulse(f,action){f.g.setInput(action,true);tick(f);f.g.setInput(action,false);}
function keepAhead(f){return()=>{f.target.x=f.p.x+75;f.target.y=f.p.y;};}
function guard(f){f.g.setInput('guard',true);tick(f);assert.equal(f.g.getState().combat.guarding,true,'Guard must engage through ordinary input');}
function summonReady(f){pulse(f,'summon');until(f,()=>f.g.getState().mount.state==='ready',3);assert.equal(f.g.getState().mount.summoned,true);}
function check(name,fn){try{const details=fn();checks.push({name,ok:true,...(details?{details}: {})});}catch(e){checks.push({name,ok:false,error:e.stack||String(e)});}}

check('normal held input produces three light attacks and one heavy, then returns to the first',()=>{
  const f=fixture();f.g.setInput('attack',true);
  until(f,()=>f.starts.length>=5,5,keepAhead(f));f.g.setInput('attack',false);
  const a=f.starts.slice(0,5);
  assert.deepEqual(a.map(s=>s.index),[0,1,2,3,0]);
  for(const s of a)assert.ok(s.windup>0&&s.active>0&&s.recovery>0);
  const heavy=a[3],lights=a.slice(0,3);
  assert.ok(heavy.duration>Math.max(...lights.map(s=>s.duration)),'Heavy needs longer readable anticipation/recovery');
  assert.ok(heavy.windup>Math.max(...lights.map(s=>s.windup)),'Heavy needs a larger windup');
  const h=f.hits.find(x=>x.index===3),l=f.hits.find(x=>x.index===0);
  assert.ok(h&&l,'Both first and fourth strikes connect');assert.ok(h.damage>l.damage*1.35,'Heavy must deal meaningfully greater damage');
  return {sequence:a.map(s=>s.index+1),lightDamage:l.damage,heavyDamage:h.damage};
});
check('damage waits for the active contact phase and each swing hits each target once',()=>{
  const f=fixture();pulse(f,'attack');const a=f.p.attack;
  assert.ok(a);advance(f,a.windup*.5,keepAhead(f));assert.equal(f.hits.length,0);
  until(f,()=>f.hits.length>0,1,keepAhead(f));assert.ok(f.hits[0].elapsed>=a.windup);
  advance(f,a.duration+.2,keepAhead(f));assert.equal(f.hits.length,1);
  return {firstHitElapsed:f.hits[0].elapsed,windup:a.windup};
});
check('fourth heavy is a single hit even while the contact pose is held',()=>{
  const f=fixture();f.g.setInput('attack',true);until(f,()=>f.p.attack?.index===3,4,keepAhead(f));
  f.g.setInput('attack',false);const attack=f.p.attack;
  advance(f,attack.duration+.4,keepAhead(f));
  assert.equal(f.hits.filter(h=>h.attack===attack).length,1);assert.ok(!f.p.attack);
});
check('a buffered short press chains, and an expired combo restarts with light one',()=>{
  const f=fixture();pulse(f,'attack');const first=f.p.attack;
  until(f,()=>first.elapsed>=first.chainAt-.05,.8,keepAhead(f));pulse(f,'attack');
  until(f,()=>f.p.attack&&f.p.attack!==first,.5,keepAhead(f));assert.equal(f.p.attack.index,1);
  advance(f,2);pulse(f,'attack');assert.equal(f.p.attack.index,0);
});
check('a captured attack facing cannot hit the enemy behind by turning mid-swing',()=>{
  const f=fixture();pulse(f,'attack');const a=f.p.attack;
  const behind=f.g._makeEnemy({type:'skeleton',x:f.p.x-90},102);behind.hp=behind.maxHp=10000;f.g.enemies.push(behind);
  f.g.setInput('left',true);until(f,()=>f.hits.length>0,.8,keepAhead(f));f.g.setInput('left',false);
  assert.equal(a.facing,1);assert.equal(f.hits.filter(h=>h.id===102).length,0);
});
check('dash cancels a queued swing without phantom damage',()=>{
  const f=fixture();pulse(f,'attack');advance(f,.025);pulse(f,'dash');
  assert.equal(f.p.attack,null);advance(f,.7);assert.equal(f.hits.length,0);
});
check('front sword guard reduces damage and consumes guard stamina',()=>{
  const f=fixture();guard(f);advance(f,.18);const hp=f.p.hp,stamina=f.p.guardStamina;
  f.g._damagePlayer(20,-100,f.p.x+60,true);
  assert.ok(hp-f.p.hp<20,'Front guard must reduce incoming damage');assert.ok(f.p.guardStamina<stamina);
  return {blockedDamage:hp-f.p.hp,staminaSpent:stamina-f.p.guardStamina};
});
check('sword guard protects its facing and leaves back attacks and ground hazards dangerous',()=>{
  const rear=fixture();guard(rear);const hp=rear.p.hp;rear.g._damagePlayer(20,100,rear.p.x-60,true);assert.equal(hp-rear.p.hp,20);
  const left=fixture();left.p.facing=-1;guard(left);const lhp=left.p.hp;left.g._damagePlayer(20,100,left.p.x-60,true);assert.ok(lhp-left.p.hp<20);
  const hazard=fixture();guard(hazard);const hhp=hazard.p.hp;hazard.g._damagePlayer(20,0,hazard.p.x,false);assert.equal(hhp-hazard.p.hp,20);
});
check('releasing guard recovers stamina and a broken guard cannot stay permanently active',()=>{
  const f=fixture();guard(f);advance(f,.18);f.g._damagePlayer(20,-100,f.p.x+50,true);const spent=f.p.guardStamina;
  f.g.setInput('guard',false);advance(f,2.5);assert.ok(f.p.guardStamina>spent);
  guard(f);f.p.guardStamina=1;f.p.invuln=0;f.g._damagePlayer(80,-100,f.p.x+50,true);tick(f);
  assert.equal(f.g.getState().combat.guarding,false);assert.ok(f.p.guardStamina>=0);
});
check('ordinary jumping rises, supports the second jump, and lands safely',()=>{
  const f=fixture();pulse(f,'jump');assert.ok(f.p.y<590);assert.equal(f.p.jumps,1);
  advance(f,.1);pulse(f,'jump');assert.equal(f.p.jumps,2);assert.ok(f.p.vy<0);
  advance(f,2);assert.equal(f.p.onGround,true);assert.equal(f.p.y,590);assert.equal(f.p.jumps,0);
});
check('idle knight has no following princess drawing or autonomous friendly projectiles',()=>{
  const f=fixture(),hp=f.target.hp;let draws=0;
  f.g._drawPrincess=()=>{draws++;};advance(f,4);f.g._draw();
  assert.equal(draws,0);assert.equal(f.target.hp,hp);
  assert.equal(f.g.projectiles.filter(p=>p.friendly).length,0);
});
check('riding is blocked before summon; summon finishes into one ready mount',()=>{
  const f=fixture();assert.equal(f.g.getState().mount.state,'absent');pulse(f,'ride');assert.equal(f.g.getState().mount.mounted,false);
  summonReady(f);assert.equal(f.g.getState().mount.state,'ready');assert.equal(f.g.getState().mount.mounted,false);
  return {state:f.g.getState().mount.state};
});
check('distant riding is refused; approaching permits mounting and mounted movement is faster',()=>{
  const f=fixture();summonReady(f);f.p.x=Math.min(f.g.worldWidth-250,f.g.mount.x+600);pulse(f,'ride');assert.equal(f.g.getState().mount.mounted,false);
  f.p.x=f.g.mount.x+12;f.p.y=590;f.p.onGround=true;pulse(f,'ride');assert.equal(f.g.getState().mount.mounted,true);
  const start=f.p.x;f.g.setInput('right',true);advance(f,.55);f.g.setInput('right',false);
  const mountedDistance=f.p.x-start;
  const walking=fixture(),x=walking.p.x;walking.g.setInput('right',true);advance(walking,.55);walking.g.setInput('right',false);
  assert.ok(mountedDistance>(walking.p.x-x)*1.2,'Riding should alter movement, not only draw a larger sprite');
  return {mountedDistance,walkingDistance:walking.p.x-x};
});
check('riding input uses press edges and cannot repeatedly toggle from one held key',()=>{
  const f=fixture();summonReady(f);f.p.x=f.g.mount.x;f.g.setInput('ride',true);advance(f,.6);f.g.setInput('ride',false);
  assert.equal(f.g.getState().mount.mounted,true);
});
check('aerial dismount is rejected; grounded dismount returns to a safe world position',()=>{
  const f=fixture();summonReady(f);f.p.x=f.g.mount.x;pulse(f,'ride');assert.equal(f.g.getState().mount.mounted,true);
  pulse(f,'jump');pulse(f,'ride');assert.equal(f.g.getState().mount.mounted,true);
  advance(f,2);pulse(f,'ride');assert.equal(f.g.getState().mount.mounted,false);
  assert.ok(f.p.x>=26&&f.p.x<=f.g.worldWidth-30);assert.ok(f.p.onGround);
});
check('a narrow elevated platform refuses dismount instead of placing the rider in the air',()=>{
  const f=fixture();summonReady(f);f.p.x=f.g.mount.x;pulse(f,'ride');assert.equal(f.g.getState().mount.mounted,true);
  f.g.platforms=[{x:f.p.x-35,y:450,w:70,h:20}];f.p.y=450;f.p.onGround=true;f.p.vy=0;f.g.mount.y=450;
  pulse(f,'ride');assert.equal(f.g.getState().mount.mounted,true);assert.equal(f.p.y,450);
});
check('a held summon key starts once, and a later recall removes the unmounted summon',()=>{
  const f=fixture();let calls=0;const toggle=f.g._toggleSummon.bind(f.g);f.g._toggleSummon=()=>{calls++;return toggle();};
  f.g.setInput('summon',true);advance(f,2);f.g.setInput('summon',false);
  assert.equal(calls,1);assert.equal(f.g.getState().mount.state,'ready');
  pulse(f,'summon');until(f,()=>f.g.getState().mount.state==='absent',1);assert.equal(f.g.getState().mount.summoned,false);
});
check('the fixed-step loop advances equal travel over equal clock time at 20 Hz and 60 Hz',()=>{
  function travel(hz){const f=fixture();f.g._draw=()=>{};f.g.lastTime=1000;f.g.accumulator=0;f.g.input.right=true;const x=f.p.x;for(let i=1;i<=hz*2;i++)f.g._loop(1000+i*1000/hz);return f.p.x-x;}
  const low=travel(20),high=travel(60);assert.ok(Math.abs(low-high)<8,'Lower draw frequency must not slow movement by a large factor');
  return {logicTestOnly:true,travel20Hz:low,travel60Hz:high};
});
check('the menu does not render the hidden game and paused play does not redraw continuously',()=>{
  const e=environment(),g=e.make();let draws=0;g._draw=()=>{draws++;};g.lastTime=1000;
  for(let i=1;i<=60;i++)g._loop(1000+i*1000/60);assert.equal(draws,0);
  g.startNew();g.pause();draws=0;for(let i=1;i<=60;i++)g._loop(2000+i*1000/60);assert.ok(draws<=1);
  return {menuDraws:0,pausedDraws:draws};
});
check('death/retry resets transient mount and guard without losing growth',()=>{
  const f=fixture();f.g.gold=123;f.g.upgrades.weapon=2;summonReady(f);f.p.x=f.g.mount.x;pulse(f,'ride');
  f.p.invuln=0;f.g._damagePlayer(10000,0,f.p.x-50,false);assert.equal(f.g.dead,true);f.g.retry();
  assert.equal(f.g.dead,false);assert.equal(f.g.getState().mount.mounted,false);assert.equal(f.g.getState().combat.guarding,false);
  assert.equal(f.g.gold,123);assert.equal(f.g.upgrades.weapon,2);assert.equal(f.p===f.g.player,false);
});
check('legacy completed four-stage save keeps upgrades and safely enters expanded chapter five',()=>{
  const e=environment({adventure:true});e.storage.set(SAVE,JSON.stringify({version:1,stageIndex:3,won:true,level:6,xp:15,gold:321,upgrades:{weapon:3,armor:2,charm:1},comboEnergy:65}));
  const g=e.make();g.continueGame();assert.equal(g.stageIndex,4);assert.equal(g.level,6);assert.equal(g.gold,321);assert.equal(g.upgrades.weapon,3);assert.equal(g.won,false);assert.equal(g.getState().mount.mounted,false);
});
check('stable stage save restores automatic progress and keeps optional exploration',()=>{
  const e=environment({adventure:true}),level=e.sandbox.window.GAME_CONTENT.levels[6];
  const progress={version:1,stageId:level.id,clearedEncounters:[level.encounters[0].id],relics:[level.relics[0].id],beacons:[level.beacons[0].id],chests:[],checkpointIds:['old'],checkpointId:'old',checkpointX:99999};
  e.storage.set(SAVE,JSON.stringify({version:1,campaignVersion:3,stageId:level.id,stageIndex:0,level:7,xp:1,gold:80,upgrades:{weapon:2,armor:2,charm:1},adventure:progress}));
  const g=e.make();g.continueGame();assert.equal(g.stageIndex,6);assert.equal(g.player.x,g.adventure.checkpointX);assert.ok(g.player.x<g.worldWidth-300);assert.equal(g.getState().adventure.relics.collected,1);assert.equal(g.getState().adventure.beacons.lit,1);
  assert.ok(g.enemies.filter(n=>n.encounter===level.encounters[0].id).every(n=>n.hp===0));assert.equal(g.getState().adventure.checkpoint.id,null);
});
check('clearing monsters opens the exit without forcing optional relics or beacons',()=>{
  const e=environment({adventure:true}),g=e.make();g.startNew();g.enemies.forEach(n=>{n.hp=0;});g.player.x=g.stage.portalX;
  for(let i=0;i<8;i++){g.pressed.interact=true;g._update(1/60);g.pressed={};}
  assert.equal(g.gateEntered,true);assert.equal(g.getState().adventure.canExit,true);assert.ok(e.events.some(v=>v.type==='stageClear'));assert.equal(g.adventure.relics.size,0);
});
check('actual regional poison bypasses front sword guard but raised stepping stones protect the player',()=>{
  const e=environment({adventure:true}),g=e.make();g.startNew();g._loadStage(5,true);g._updateEnemy=()=>{};
  const o=g.stage.obstacles.find(o=>o.kind==='poison');assert.ok(o);g.player.x=o.x+o.w*.5;g.player.y=590;g.player.invuln=0;g.player.guarding=true;g.player.guardStamina=70;
  const hp=g.player.hp,calls=[],original=g._damagePlayer.bind(g);g._damagePlayer=(...args)=>{calls.push(args);return original(...args);};
  e.sandbox.window.KnightStageRules.update(g,DT);assert.equal(calls.length,1);assert.equal(calls[0][3],false);assert.ok(g.player.hp<hp);assert.equal(g.player.guardStamina,70);
  g.player.y=475;g.player.invuln=0;e.sandbox.window.KnightStageRules.update(g,1.1);assert.equal(calls.length,1);
  return {hazardKind:o.kind,damage:hp-g.player.hp};
});
check('all motion configurations reference existing PNGs with valid frame indices',()=>{
  const e=environment(),art=e.sandbox.window.KNIGHT_ARTSETS;assert.ok(art);assert.equal(art.attacks.length,4);
  assert.equal(new Set(art.attacks.map(s=>s.src)).size,4,'All four attacks need their own painted sequence');
  const sheets=[...art.attacks,art.guard,art.jump,art.mount,art.mountIdle,art.rider];
  const files=new Set();let configuredFrames=0;
  for(const sheet of sheets){
    assert.ok(sheet.src&&sheet.cols>0&&sheet.rows>0&&sheet.drawWidth>0);const p=path.resolve(root,sheet.src);assert.ok(p.startsWith(root+path.sep));
    const b=fs.readFileSync(p);assert.equal(b.toString('ascii',1,4),'PNG');const w=b.readUInt32BE(16),h=b.readUInt32BE(20);assert.ok(w>sheet.cols*4&&h>sheet.rows*4);
    assert.ok(sheet.indices.length>0&&sheet.indices.every(i=>Number.isInteger(i)&&i>=0&&i<sheet.cols*sheet.rows));
    for(const phase of ['windupFrames','activeFrames','recoveryFrames'])if(sheet[phase])assert.ok(sheet[phase].every(i=>sheet.indices.includes(i)));
    files.add(sheet.src);configuredFrames+=sheet.indices.length;
  }
  assert.ok(art.attacks.every(a=>a.indices.length===12));assert.equal(art.guard.indices.length,4);assert.equal(art.jump.indices.length,8);assert.equal(art.mount.indices.length,8);assert.equal(art.rider.indices.length,8);
  return {distinctPngFiles:files.size,configuredFrames,scope:'Configuration and PNG headers only; no claim about painted-pose quality'};
});

if(!process.argv.includes('--no-campaign'))check('ordinary inputs complete twelve chapters, earned upgrades and actual prince rescue',()=>{
  const e=environment({adventure:true}),g=e.make(),pilot=new CampaignPilot();g.startNew();
  let steps=0,handled=0,deaths=0,lastProgress=0,token='';const chapters=[];
  for(;steps<60*2400;steps++){
    while(handled<e.events.length){const ev=e.events[handled++];if(ev.type==='stageClear'){
      chapters.push({chapter:g.stageIndex+1,level:g.level,hp:Math.ceil(g.player.hp),relics:g.getState().adventure.relics.collected,beacons:g.getState().adventure.beacons.lit});
      g.pause();let changed=true;while(changed){changed=false;for(const key of ['armor','weapon','charm'])if(g.buyUpgrade(key).ok)changed=true;}g.nextStage();
    }if(ev.type==='death'){deaths++;assert.ok(deaths<=12,'Pilot exceeded twelve deaths at '+g.stage.id);g.retry();}}
    if(g.won){chapters.push({chapter:g.stageIndex+1,level:g.level,hp:Math.ceil(g.player.hp),relics:g.getState().adventure.relics.collected,beacons:g.getState().adventure.beacons.lit});break;}
    if(g.dead)continue;
    const action=pilot.step(g,steps);g._update(1/60);g.pressed={};
    const a=g.adventure,alive=g.enemies.filter(n=>n.hp>0&&!n.dormant);
    const next=[g.stageIndex,g.stageKills,a.relics.size,a.beacons.size,a.chests.size,a.checkpointIds.size,...alive.map(n=>Math.ceil(n.hp))].join('|');
    if(next!==token){token=next;lastProgress=steps;}
    assert.ok(steps-lastProgress<60*90,'Campaign stalled: '+JSON.stringify({stage:g.stage.id,action,player:{x:g.player.x,y:g.player.y},alive:alive.map(n=>({type:n.type,x:n.x,y:n.y,hp:n.hp}))}));
    if(steps%600===0)g._draw();
  }
  assert.equal(g.won,true,'Must reach actual rescue ending without injected health/damage or stage skips');assert.equal(chapters.length,12);assert.equal(g.rescuing,true);
  assert.ok(chapters.every(c=>c.hp>0));const save=JSON.parse(e.storage.get(SAVE));assert.equal(save.won,true);assert.equal(save.campaignVersion,4);
  const restored=e.make();restored.continueGame();assert.equal(restored.won,true);
  return {simulatedSeconds:Math.round(steps/60),deaths,chapters};
});

for(const g of made)g.destroy();
const failed=checks.filter(c=>!c.ok),report={scope:'Isolated deterministic gameplay rules; stubbed Canvas/images; no real FPS or visual claim',passed:checks.length-failed.length,failed:failed.length,checks};
const reportPath=path.join(path.resolve(process.env.KNIGHT_QA_DIR||path.join(__dirname,'..','.qa-local')),'solo-combat-qa.json');
fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));if(failed.length)process.exitCode=1;
