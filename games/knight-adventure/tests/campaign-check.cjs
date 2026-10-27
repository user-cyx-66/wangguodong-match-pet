/* The campaign run below uses only ordinary inputs and public progression APIs.
   Isolated save/immunity fixtures are deliberately separate from that run. */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const CampaignPilot=require('./campaign-pilot.js');
const root=path.resolve(__dirname,'..','dist'),SAVE='wangguodong-knight-v1',DT=1/60;
function environment(seed=0x2179){
  let randomState=seed>>>0;
  const seededMath=Object.create(Math);seededMath.random=()=>{randomState^=randomState<<13;randomState^=randomState>>>17;randomState^=randomState<<5;return(randomState>>>0)/4294967296;};
  const gradient={addColorStop(){}};
  const context=new Proxy({}, {get:(target,key)=>key in target?target[key]:key==='createLinearGradient'||key==='createRadialGradient'?()=>gradient:key==='measureText'?()=>({width:60}):()=>{},set:(target,key,value)=>(target[key]=value,true)});
  const storage=new Map(),events=[];
  const sandbox={window:{addEventListener(){},removeEventListener(){}},document:{createElement:()=>({getContext:()=>context})},
    localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
    Image:class{constructor(){this.complete=false;this.naturalWidth=0;this.naturalHeight=0;}},requestAnimationFrame:()=>1,cancelAnimationFrame(){},performance:{now:()=>0},console,Math:seededMath};
  vm.createContext(sandbox);for(const filename of ['content.js','adventure.js','game.js'])vm.runInContext(fs.readFileSync(path.join(root,filename),'utf8'),sandbox);
  function make(){return new sandbox.window.KnightGame({getContext:()=>context},{onEvent:event=>events.push({...event})});}
  return {sandbox,storage,events,make,context};
}
const checks=[];
function check(name,run){try{const details=run();checks.push({name,ok:true,...(details?{details}: {})});}catch(error){checks.push({name,ok:false,error:error.stack||String(error)});}}
function rawTick(game,dt=DT){game._update(dt);game.pressed={};}

check('legacy completed four-stage save preserves growth and enters expanded stage five',()=>{
  const e=environment();e.storage.set(SAVE,JSON.stringify({version:1,stageIndex:3,won:true,level:6,xp:15,gold:321,upgrades:{weapon:3,armor:2,charm:1},comboEnergy:65}));
  const g=e.make();g.continueGame();assert.equal(g.stageIndex,4);assert.equal(g.level,6);assert.equal(g.gold,321);assert.equal(g.upgrades.weapon,3);assert.equal(g.upgrades.armor,2);assert.equal(g.won,false);assert.ok(g.enemies.every(enemy=>enemy.dormant));g.destroy();
});
check('new saves restore by stable stage ID and recover their cleared waves and checkpoint',()=>{
  const e=environment(),level=e.sandbox.window.GAME_CONTENT.levels[6],cp=level.checkpoints[0];
  const progress={version:1,stageId:level.id,clearedEncounters:[level.encounters[0].id],relics:[level.relics[0].id],beacons:[level.beacons[0].id],chests:[],checkpointIds:[cp.id],checkpointId:cp.id,checkpointX:cp.x};
  e.storage.set(SAVE,JSON.stringify({version:1,campaignVersion:3,stageId:level.id,stageIndex:0,level:7,xp:1,gold:80,upgrades:{weapon:2,armor:2,charm:1},adventure:progress}));
  const g=e.make();g.continueGame();assert.equal(g.stageIndex,6);assert.equal(g.player.x,cp.x);assert.equal(g.getState().adventure.relics.collected,1);assert.equal(g.getState().adventure.beacons.lit,1);assert.ok(g.enemies.filter(enemy=>enemy.encounter===level.encounters[0].id).every(enemy=>enemy.hp===0));g.destroy();
});
check('retry revives at the recorded checkpoint while retaining exploration and finished encounters',()=>{
  const e=environment(),g=e.make();g.startNew();const a=e.sandbox.window.KnightAdventure,stage=g.stage;
  for(const enemy of g.enemies)if(enemy.encounter===stage.encounters[0].id)enemy.hp=0;
  g.player.x=stage.relics[0].x;rawTick(g);
  g.player.x=stage.beacons[0].x;g.setInput('interact',true);rawTick(g);g.setInput('interact',false);
  g.player.x=stage.checkpoints[0].x;g.setInput('interact',true);rawTick(g);g.setInput('interact',false);
  const before=JSON.parse(JSON.stringify(a.serialize(g)));g.player.hp=1;g._damagePlayer(99,0);assert.equal(g.dead,true);g.retry();
  assert.equal(g.dead,false);assert.equal(g.player.hp,g._stats().maxHp);assert.equal(g.player.x,stage.checkpoints[0].x);
  const after=JSON.parse(JSON.stringify(a.serialize(g)));assert.deepEqual(after,before);assert.ok(g.enemies.filter(enemy=>enemy.encounter===stage.encounters[0].id).every(enemy=>enemy.hp===0));g.destroy();
});
check('defeating all enemies cannot open a stage exit before shards and beacons are complete',()=>{
  const e=environment(),g=e.make();g.startNew();for(const enemy of g.enemies)enemy.hp=0;
  g.player.x=g.stage.portalX;for(let i=0;i<5;i++){g.pressed.interact=true;rawTick(g);}
  assert.equal(g.gateEntered,false);assert.ok(!e.events.some(event=>event.type==='stageClear'));assert.equal(g.getState().adventure.canExit,false);g.destroy();
});
check('dormant enemies ignore sword, direct damage, princess target selection, combo, and friendly projectiles',()=>{
  const e=environment(),g=e.make();g.startNew();const target=g.enemies[0],hp=target.hp;
  g.player.x=target.x-65;assert.equal(target.dormant,true);
  g._damageEnemy(target,999,0);assert.equal(target.hp,hp);
  g._attack();for(let i=0;i<40;i++)g._updateAttack(DT);assert.equal(target.hp,hp);
  g.comboEnergy=100;g._combinedAttack();assert.equal(target.hp,hp);
  g.princess.castTimer=0;g._updatePrincess(.1);assert.equal(g.projectiles.filter(p=>p.friendly).length,0);
  g.projectiles.push({x:target.x,y:target.y-25,vx:0,vy:0,r:8,life:1,friendly:true,targetId:target.id,damage:999});g._updateProjectiles(.01);assert.equal(target.hp,hp);
  const before=target.timer;g._updateEnemy(target,.1);assert.equal(target.timer,before);
  g._loadStage(11,true);assert.equal(g.getState().boss,null);g.destroy();
});

function normalCampaign(){
  const e=environment(Number(process.env.CAMPAIGN_SEED)||0x2179),g=e.make(),pilot=new CampaignPilot();
  g.startNew();
  let steps=0,deaths=0,handledEvents=0,lastProgress=0,progressToken='';
  const stages=[],deathsByStage={},bosses=new Map(),startWall=Date.now();
  let stageStarted=0,activeMeta={id:g.stage.id,name:g.stage.name};
  function finishStage(){
    const s=g.getState();stages.push({index:g.stageIndex+1,id:activeMeta.id,name:activeMeta.name,seconds:Math.round((steps-stageStarted)*DT),level:s.level,hp:s.hp,maxHp:s.maxHp,gold:s.gold,upgrades:{...s.upgrades},relics:s.adventure.relics.collected,beacons:s.adventure.beacons.lit,chests:s.adventure.chests.opened,checkpoints:g.adventure.checkpointIds.size});
    stageStarted=steps;
  }
  for(;steps<60*2400;steps++){
    const now=steps*DT;
    while(handledEvents<e.events.length){
      const event=e.events[handledEvents++];
      if(event.type==='stageClear'){
        finishStage();g.pause();
        // Spend only naturally earned coins. Emphasize safety first, then damage.
        let changed=true;while(changed){changed=false;for(const key of ['armor','weapon','charm'])if(g.buyUpgrade(key).ok)changed=true;}
        g.nextStage();activeMeta={id:g.stage.id,name:g.stage.name};
      }
      if(event.type==='death'){
        deaths++;deathsByStage[g.stage.id]=(deathsByStage[g.stage.id]||0)+1;
        if(deaths>12)throw Error('Normal campaign exceeded 12 deaths: '+JSON.stringify({stage:g.stage.id,state:g.getState(),deathsByStage}));
        g.retry();
      }
    }
    const s=g.getState(),p=g.player,a=g.adventure;
    if(s.won){finishStage();break;}
    if(g.dead)continue;
    const alive=g.enemies.filter(enemy=>enemy.hp>0&&!enemy.dormant);
    for(const boss of alive.filter(enemy=>enemy.boss||enemy.type==='dragon')){
      const key=g.stage.id+':'+boss.id;
      if(!bosses.has(key))bosses.set(key,{stage:g.stage.id,enemyId:boss.id,name:boss.name||boss.type,maxHp:boss.maxHp,start:now,last:now,hp:boss.hp});
      const record=bosses.get(key);record.last=now;record.hp=boss.hp;
    }
    const {kind,destination}=pilot.step(g,steps);rawTick(g);
    for(const record of bosses.values())if(record.stage===g.stage.id&&!record.defeated){const enemy=g.enemies.find(item=>item.id===record.enemyId);if(enemy&&enemy.hp<=0){record.hp=0;record.last=now;record.defeated=true;}}
    const token=[g.stageIndex,g.stageKills,a.relics.size,a.beacons.size,a.chests.size,a.checkpointIds.size,...alive.map(enemy=>Math.ceil(enemy.hp))].join('|');
    if(token!==progressToken){progressToken=token;lastProgress=steps;}
    if(steps-lastProgress>60*80)throw Error('Campaign navigation stalled: '+JSON.stringify({seconds:Math.round(now),stage:g.stage.id,p:{x:p.x,y:p.y,vx:p.vx,vy:p.vy},kind,destination,state:g.getState(),alive:alive.map(enemy=>({type:enemy.type,x:enemy.x,y:enemy.y,hp:enemy.hp}))}));
    if(steps%600===0)g._draw();
  }
  const result={won:g.won,simulatedSeconds:Math.round(steps*DT),wallSeconds:+((Date.now()-startWall)/1000).toFixed(2),deaths,deathsByStage,stages,bosses:[...bosses.values()].map(b=>({stage:b.stage,name:b.name,maxHp:b.maxHp,seconds:Math.round(b.last-b.start),remainingHp:Math.ceil(b.hp)})),final:g.getState()};
  console.log(JSON.stringify({normalCampaign:result},null,2));
  assert.equal(g.won,true,'A normal-input adventure run must reach the actual ending');assert.equal(stages.length,12);
  assert.ok(g.rescuing,'The pilot must walk to the prince and press the rescue control');
  assert.ok(stages.every(stage=>stage.relics===3&&stage.beacons===3));
  const saved=JSON.parse(e.storage.get(SAVE));assert.equal(saved.campaignVersion,3);assert.equal(saved.stageId,e.sandbox.window.GAME_CONTENT.levels[11].id);assert.equal(saved.won,true);
  assert.ok([...e.storage.keys()].every(key=>key===SAVE));g.destroy();return {simulatedSeconds:result.simulatedSeconds,deaths,completedStages:stages.length,bosses:result.bosses};
}
check('normal inputs complete all twelve adventure stages with real enemies and hazards',normalCampaign);
const failed=checks.filter(item=>!item.ok);console.log(JSON.stringify({passed:checks.length-failed.length,failed:failed.length,checks},null,2));if(failed.length)process.exitCode=1;
