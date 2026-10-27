'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const sandbox={window:{},console,Math};vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','dist','adventure.js'),'utf8'),sandbox);
const Adventure=sandbox.window.KnightAdventure;
const report=[];
function check(name,run){try{run();report.push({name,ok:true});}catch(error){report.push({name,ok:false,error:error.stack});}}
function fixture(overrides={}){
  const stage={id:'test-forest',width:7000,portalX:6870,palette:{},
    encounters:[{id:'first',x:1000,label:'雨桥'},{id:'second',x:3000,label:'古道'},{id:'third',x:5000,label:'残塔'}],
    enemies:[{encounter:'first',x:1100},{encounter:'first',x:1320},{encounter:'second',x:3100},{encounter:'third',x:5100}],
    relics:[{id:'r1',x:1450,y:590},{id:'r2',x:3450,y:590},{id:'r3',x:5450,y:590}],
    beacons:[{id:'b1',x:1650,y:590},{id:'b2',x:3650,y:590},{id:'b3',x:5650,y:590}],
    chests:[{id:'c1',x:800,y:490,gold:42}],checkpoints:[{id:'cp1',x:1800},{id:'cp2',x:3800}],
    hazardZones:[{id:'h1',x:2200,w:130,type:'spikes',period:5,active:1.2}],...overrides};
  const events=[],hits=[];
  const game={stage,stageIndex:0,worldWidth:stage.width,camera:0,time:0,realTime:0,gold:0,stageKills:0,player:{x:140,y:590,hp:30,vx:100,invuln:0},pressed:{},saves:0,
    enemies:stage.enemies.map((config,id)=>({...config,id,hp:40,maxHp:40,y:590,type:'wolf'})),
    _stats:()=>({maxHp:100}),_save(){this.saves++;},_notify(){},_event:e=>events.push(e),_sound(){},_burst(){},_damagePlayer(damage,push){hits.push({damage,push,time:this.time});this.player.hp-=damage;}};
  Adventure.init(game);
  return {game,events,hits};
}
function tick(f,dt=.016){f.game.time+=dt;f.game.realTime+=dt;Adventure.update(f.game,dt);f.game.pressed={};}
function press(f){f.game.pressed.interact=true;tick(f);}
function cleared(f,extra={}){Adventure.init(f.game,{stageId:f.game.stage.id,clearedEncounters:['first','second','third'],...extra});}

check('dormant groups remain inactive before the first trigger',()=>{
  const f=fixture();tick(f);assert.ok(f.game.enemies.every(e=>e.dormant));assert.equal(Adventure.state(f.game).activeEncounter,null);assert.equal(f.game.player.x,140);
});
check('a trigger activates only its wave and constrains both player and enemies to the arena',()=>{
  const f=fixture();f.game.player.x=850;tick(f);assert.equal(Adventure.state(f.game).activeEncounter.id,'first');
  assert.ok(f.game.enemies.slice(0,2).every(e=>!e.dormant));assert.ok(f.game.enemies.slice(2).every(e=>e.dormant));
  f.game.player.x=4000;f.game.enemies[0].x=4000;tick(f);assert.equal(f.game.player.x,1830);assert.equal(f.game.player.vx,0);assert.equal(f.game.enemies[0].x,1812);
});
check('clearing a wave opens its boundary, announces progress, and saves once',()=>{
  const f=fixture();f.game.player.x=850;tick(f);f.game.enemies[0].hp=0;f.game.enemies[1].hp=0;tick(f);
  assert.equal(Adventure.state(f.game).activeEncounter,null);assert.equal(Adventure.state(f.game).encounters.cleared,1);assert.ok(f.events.some(e=>e.text.includes('战区解锁')));assert.ok(f.game.saves>0);
  f.game.player.x=2200;tick(f);assert.equal(f.game.player.x,2200);
});
check('relics collect by touch without requiring interaction and cannot be collected twice',()=>{
  const f=fixture();f.game.player.x=1450;tick(f);assert.equal(Adventure.state(f.game).relics.collected,1);const saves=f.game.saves;tick(f);assert.equal(Adventure.state(f.game).relics.collected,1);assert.equal(f.game.saves,saves);
});
check('F chooses one nearest interaction, while standing close alone does nothing',()=>{
  const f=fixture({beacons:[{id:'b1',x:1500,y:590}],chests:[{id:'c1',x:1520,y:590,gold:42}],checkpoints:[{id:'cp1',x:1550}]});
  f.game.player.x=1500;tick(f);assert.equal(Adventure.state(f.game).beacons.lit,0);assert.equal(f.game.gold,0);
  press(f);assert.equal(Adventure.state(f.game).beacons.lit,1);assert.equal(f.game.gold,0);assert.equal(Adventure.state(f.game).checkpoint.id,null);
  press(f);assert.equal(f.game.gold,42);assert.equal(Adventure.state(f.game).chests.opened,1);
  press(f);assert.equal(Adventure.state(f.game).checkpoint.id,'cp1');press(f);assert.equal(f.game.gold,42);
});
check('a chest on a platform cannot be opened from too far below it',()=>{
  const f=fixture();f.game.player.x=800;press(f);assert.equal(f.game.gold,0);f.game.player.y=490;press(f);assert.equal(f.game.gold,42);
});
check('checkpoints heal once and revisiting an earlier checkpoint cannot farm healing',()=>{
  const f=fixture();cleared(f);f.game.player.x=1800;press(f);assert.equal(f.game.player.hp,70);assert.equal(Adventure.state(f.game).checkpoint.x,1800);
  f.game.player.hp=20;press(f);assert.equal(f.game.player.hp,20);
  f.game.player.x=3800;press(f);assert.equal(f.game.player.hp,60);f.game.player.hp=20;f.game.player.x=1800;press(f);assert.equal(f.game.player.hp,20);
});
check('serialization is JSON safe and restores cleared groups, collectibles, gold chest state, and checkpoints',()=>{
  const f=fixture();cleared(f,{relics:['r1'],beacons:['b1'],chests:['c1'],checkpointIds:['cp1'],checkpointId:'cp1'});
  const saved=JSON.parse(JSON.stringify(Adventure.serialize(f.game))),restored=fixture();Adventure.init(restored.game,saved);
  assert.equal(Adventure.state(restored.game).encounters.cleared,3);assert.ok(restored.game.enemies.every(e=>e.hp===0));assert.equal(restored.game.stageKills,4);
  assert.equal(Adventure.state(restored.game).relics.collected,1);assert.equal(Adventure.state(restored.game).beacons.lit,1);assert.equal(Adventure.state(restored.game).chests.opened,1);assert.equal(Adventure.state(restored.game).checkpoint.x,1800);
  assert.deepEqual(JSON.parse(JSON.stringify(Adventure.onDeath(restored.game))),saved);
});
check('progress from another stage is rejected',()=>{
  const f=fixture();Adventure.init(f.game,{stageId:'another-map',clearedEncounters:['first'],relics:['r1'],beacons:['b1'],checkpointIds:['cp1'],checkpointId:'cp1'});
  assert.equal(Adventure.state(f.game).encounters.cleared,0);assert.equal(Adventure.state(f.game).relics.collected,0);assert.equal(Adventure.state(f.game).checkpoint.id,null);
});
check('a last enemy killed during hitstop is preserved even before the next exploration update',()=>{
  const f=fixture();f.game.player.x=850;tick(f);f.game.enemies[0].hp=0;f.game.enemies[1].hp=0;
  const saved=Adventure.serialize(f.game);assert.ok(saved.clearedEncounters.includes('first'));
  const restored=fixture();Adventure.init(restored.game,JSON.parse(JSON.stringify(saved)));assert.equal(Adventure.state(restored.game).encounters.cleared,1);assert.ok(restored.game.enemies.slice(0,2).every(e=>e.hp===0));
});
check('exit requires all encounter waves plus three shards and three lit beacons',()=>{
  const f=fixture();cleared(f,{relics:['r1','r2'],beacons:['b1','b2','b3']});assert.equal(Adventure.canExit(f.game),false);
  f.game.player.x=5450;tick(f);assert.equal(Adventure.canExit(f.game),true);assert.ok(Adventure.objective(f.game).includes('光门已开启'));
});
check('a locked exit explains exactly which objectives are incomplete',()=>{
  const f=fixture();cleared(f,{relics:['r1'],beacons:['b1','b2']});f.game.player.x=6870;press(f);assert.ok(f.events.some(e=>e.text.includes('光门仍在等待')&&e.text.includes('碎片 1/3')&&e.text.includes('誓灯 2/3')));
});
check('periodic hazards announce a warning before dealing damage and do not hit an airborne player',()=>{
  const f=fixture();cleared(f);f.game.player.x=2250;tick(f,2.8);assert.equal(f.hits.length,0);tick(f,.2);assert.equal(f.hits.length,0);assert.ok(f.events.some(e=>e.text.includes('地刺即将升起')));
  tick(f,.9);assert.equal(f.hits.length,1);tick(f,.05);assert.equal(f.hits.length,1);
  const air=fixture();cleared(air);air.game.player.x=2250;air.game.player.y=400;tick(air,3.95);assert.equal(air.hits.length,0);
});
check('flame and ice hazards also have warning phases and safe jump clearance',()=>{
  for(const type of ['flame','ice']){const f=fixture({hazardZones:[{id:'haz',x:2200,w:130,type,period:5,active:1.2}]});cleared(f);f.game.player.x=2250;tick(f,3);assert.equal(f.hits.length,0);assert.ok(f.events.length>0);f.game.player.y=400;tick(f,.95);assert.equal(f.hits.length,0);}
});
check('rendering every object, active barrier, and all hazard phases does not throw',()=>{
  const gradient={addColorStop(){}};const context=new Proxy({}, {get:(target,key)=>key in target?target[key]:key==='createLinearGradient'||key==='createRadialGradient'?()=>gradient:()=>{},set:(target,key,value)=>(target[key]=value,true)});
  const f=fixture();f.game.player.x=850;tick(f);for(const elapsed of [0,3.1,3.95]){f.game.adventure.elapsed=elapsed;f.game.camera=1700;Adventure.draw(f.game,context);f.game.camera=500;Adventure.draw(f.game,context);}
});
check('all twelve authored stages bind valid waves and render their theme branches',()=>{
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..','dist','content.js'),'utf8'),sandbox);
  const levels=sandbox.window.GAME_CONTENT.levels;assert.equal(levels.length,12);
  const gradient={addColorStop(){}};const context=new Proxy({}, {get:(target,key)=>key in target?target[key]:key==='createLinearGradient'||key==='createRadialGradient'?()=>gradient:()=>{},set:(target,key,value)=>(target[key]=value,true)});
  for(const level of levels){
    const f=fixture(level);assert.equal(Adventure.state(f.game).encounters.total,3,level.id);assert.equal(Adventure.state(f.game).relics.total,3);assert.equal(Adventure.state(f.game).beacons.total,3);
    assert.ok(f.game.enemies.every(enemy=>enemy.dormant&&level.encounters.some(encounter=>encounter.id===enemy.encounter)),level.id+' enemy binding');
    for(const encounter of level.encounters){for(const enemy of f.game.enemies.filter(item=>item.encounter===encounter.id))assert.ok(enemy.x>=encounter.x-180&&enemy.x<=encounter.x+850,level.id+' arena range');}
    for(const camera of [0,1800,4000,level.width-1280]){f.game.camera=camera;Adventure.draw(f.game,context);}
  }
});
const failed=report.filter(item=>!item.ok);console.log(JSON.stringify({passed:report.length-failed.length,failed:failed.length,checks:report},null,2));if(failed.length)process.exitCode=1;
