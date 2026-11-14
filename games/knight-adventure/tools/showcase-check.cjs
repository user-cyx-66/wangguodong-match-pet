/* Portable behavior checks for the isolated first-map trial.
 * Node built-ins only. Rendering is stubbed, so no pixel/FPS claim is made.
 * Reports: KNIGHT_QA_DIR/showcase-qa.json (default: project/.qa-local).
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const CampaignPilot=require('./campaign-pilot.js');
const dist=path.resolve(__dirname,'../dist'),SAVE='wangguodong-knight-v1',DT=1/60;
const checks=[],made=[];
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
const scripts=[...html.matchAll(/<script\s+src="([^"?]+)(?:\?[^"\s]*)?"/g)].map(m=>m[1]).filter(f=>f!=='app.js');
function environment(){
  let seed=0x6041;const math=Object.create(Math);
  math.random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
  const gradient={addColorStop(){}};
  const ctx=new Proxy({}, {get:(t,k)=>k in t?t[k]:k==='createLinearGradient'||k==='createRadialGradient'?()=>gradient:k==='measureText'?()=>({width:80}):()=>{},set:(t,k,v)=>(t[k]=v,true)});
  const storage=new Map(),events=[];let writes=0;
  const canvas={width:1280,height:720,addEventListener(){},removeEventListener(){},getContext:()=>ctx};
  const sandbox={window:{addEventListener(){},removeEventListener(){},devicePixelRatio:1},
    document:{hidden:false,visibilityState:'visible',addEventListener(){},removeEventListener(){},createElement:()=>({...canvas})},
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>{writes++;storage.set(k,v);}},
    Image:class{constructor(){this.complete=false;this.naturalWidth=0;this.naturalHeight=0;}addEventListener(){}},
    requestAnimationFrame:()=>1,cancelAnimationFrame(){},performance:{now:()=>0},console,Math:math};
  vm.createContext(sandbox);
  for(const file of scripts)vm.runInContext(fs.readFileSync(path.join(dist,file),'utf8'),sandbox,{filename:file});
  const g=new sandbox.window.KnightGame(canvas,{onEvent:e=>events.push({...e})});g.setAudio(false);made.push(g);
  return {g,storage,events,sandbox,ctx,get writes(){return writes;}};
}
function check(name,fn){try{checks.push({name,ok:true,details:fn()});}catch(e){checks.push({name,ok:false,error:e.stack||String(e)});}}
function tick(g){g._update(DT);g.pressed={};}
function seedCampaign(f){
  f.g.startNew();f.g._loadStage(4,true);f.g.level=6;f.g.xp=17;f.g.gold=321;f.g.upgrades={weapon:2,armor:1,charm:3};f.g._save();
  // Preserve formatting too: a semantic JSON comparison could hide a write.
  const saved=' \n'+f.storage.get(SAVE)+'\n';f.storage.set(SAVE,saved);return saved;
}

check('the real HTML loads showcase after enemy behavior and exposes a recommended independent entry',()=>{
  assert.ok(scripts.indexOf('showcase.js')>scripts.indexOf('enemy-variety.js'));
  assert.ok(/id="showcase-button"[^>]*data-action="showcase"/.test(html));
  assert.ok(html.indexOf('id="showcase-button"')<html.indexOf('id="continue-button"'));
  for(const file of scripts)assert.ok(fs.existsSync(path.join(dist,file)));
  const f=environment();assert.equal(typeof f.g.startShowcase,'function');
  return {scripts,entry:'showcase-button'};
});

check('trial loading restores the exact 12-stage array and uses only three unarmored chargers on the first map',()=>{
  const f=environment(),levels=f.g.levels,original=JSON.stringify(levels),first=levels[0];f.g.startShowcase();
  assert.equal(f.g.levels,levels);assert.equal(levels.length,12);assert.equal(JSON.stringify(levels),original);
  assert.equal(f.g.getState().showcase,true);assert.equal(f.g.stageIndex,0);assert.equal(f.g.worldWidth,3600);
  assert.equal(f.g.stage.theme,first.theme);assert.deepEqual(f.g.stage.palette,first.palette);
  assert.equal(f.g.adventure.encounters.length,2);assert.equal(f.g.enemies.length,3);
  for(const e of f.g.enemies){assert.equal(e.type,'wolf');assert.equal(e.variant,'charger');assert.equal(e.maxHp,84);assert.equal(e.elite,false);assert.equal(e.boss,false);}
  assert.equal(f.g.heroId,'ikun');assert.equal(f.g.basketball.state,'ready');assert.equal(f.g.mount.state,'absent');
  assert.ok(f.g.platforms.every(p=>p.y>=455&&p.y<590&&p.w>=170));
  f.g._draw();
  return {campaignStages:levels.length,trialWidth:f.g.worldWidth,enemies:f.g.enemies.map(e=>({variant:e.variant,hp:e.maxHp})),platforms:f.g.platforms.length};
});

check('trial rewards, lamps, death, repeated menu exits and retry never write the campaign save',()=>{
  const f=environment(),saved=seedCampaign(f),before=f.writes;f.g.startShowcase();
  f.g._save();f.g.player.x=760;tick(f.g);
  f.g._damageEnemy(f.g.enemies[0],999,0);f.g.player.x=1520;tick(f.g);
  f.g.player.invuln=0;f.g._damagePlayer(9999,0,f.g.player.x+80,false);assert.equal(f.g.dead,true);
  f.g.retry();assert.equal(f.g.showcase,true);f.g.exitToMenu();f.g.exitToMenu();
  assert.equal(f.storage.get(SAVE),saved);assert.equal(f.writes,before,'No trial path may rewrite the existing campaign bytes');
  assert.equal(f.g.hasSave(),true);return {trialStorageWrites:f.writes-before,preservedCampaignBytes:saved.length};
});

check('exit then continue restores the original campaign growth and position without changing saved bytes',()=>{
  const f=environment(),saved=seedCampaign(f),before=f.writes,originalStage=f.g.stage.id;
  f.g.startShowcase();f.g.exitToMenu();f.g.continueGame();
  assert.equal(f.g.showcase,false);assert.equal(f.g.getState().showcase,false);assert.equal(f.g.stage.id,originalStage);
  assert.equal(f.g.stageIndex,4);assert.equal(f.g.level,6);assert.equal(f.g.gold,321);assert.equal(f.g.xp,17);
  assert.equal(JSON.stringify(f.g.upgrades),JSON.stringify({weapon:2,armor:1,charm:3}));
  assert.equal(f.storage.get(SAVE),saved);assert.equal(f.writes,before);
  return {stageIndex:f.g.stageIndex,gold:f.g.gold,level:f.g.level,saveUnchanged:true};
});

check('trial without a campaign leaves no save, while explicit new/continue enter a normal campaign',()=>{
  const f=environment();f.g.startShowcase();f.g.exitToMenu();assert.equal(f.g.hasSave(),false);assert.equal(f.storage.has(SAVE),false);
  f.g.continueGame();assert.equal(f.g.showcase,false);assert.equal(f.g.stage,f.g.levels[0]);assert.equal(f.g.hasSave(),true);
  f.g.startShowcase();f.g.startNew();assert.equal(f.g.showcase,false);assert.equal(f.g.stage,f.g.levels[0]);
  assert.equal(JSON.parse(f.storage.get(SAVE)).stageId,f.g.levels[0].id);return {createsNoTrialSave:true,explicitCampaignWorks:true};
});

check('retry resets the entire small trial and accidental next-stage actions cannot enter chapter two',()=>{
  const f=environment(),levels=f.g.levels;f.g.startShowcase();f.g.player.x=760;tick(f.g);
  f.g._damageEnemy(f.g.enemies[0],999,0);tick(f.g);assert.equal(f.g.adventure.clearedEncounters.size,1);
  f.g.gateEntered=true;f.g.retry();assert.equal(f.g.showcase,true);assert.equal(f.g.stageKills,0);assert.equal(f.g.gateEntered,false);
  assert.equal(f.g.player.x,140);assert.equal(f.g.adventure.clearedEncounters.size,0);assert.ok(f.g.enemies.every(e=>e.hp===84&&e.dormant));
  const stage=f.g.stage;f.g.nextStage();assert.equal(f.g.stage,stage);assert.equal(f.g.stageIndex,0);assert.equal(f.g.levels,levels);
  return {resetEnemies:f.g.enemies.length,resetPosition:f.g.player.x,blockedChapterAdvance:true};
});

check('a fresh trial charger survives all three light contacts and falls to the fourth heavy through ordinary held J',()=>{
  const f=environment();f.g.startShowcase();const target=f.g.enemies[0];f.g.player.x=target.x-75;target.brain.state='recover';target.brain.left=10;
  const hits=[],damage=f.g._damageEnemy.bind(f.g);
  f.g._damageEnemy=(e,...args)=>{const index=f.g.player.attack?.index;const before=e.hp;const result=damage(e,...args);if(e===target&&e.hp<before)hits.push({index,hp:e.hp});return result;};
  f.g.setInput('attack',true);let frames=0;
  for(;frames<300&&target.hp>0;frames++)tick(f.g);
  f.g.setInput('attack',false);
  assert.equal(JSON.stringify(hits.map(h=>h.index)),JSON.stringify([0,1,2,3]));
  assert.ok(hits.slice(0,3).every(h=>h.hp>0));assert.equal(target.hp,0);
  return {frames,hits};
});

check('ordinary inputs can clear both arenas and finish at F without HP/damage injection or save writes',()=>{
  const f=environment(),saved=seedCampaign(f);f.g.startShowcase();
  const pilot=new CampaignPilot(),before=f.writes;let frames=0,deaths=0;
  for(;frames<60*150&&!f.g.gateEntered;frames++){
    if(f.g.dead){deaths++;throw Error('Ordinary trial pilot died before completing the route');}
    pilot.step(f.g,frames);tick(f.g);
  }
  assert.equal(f.g.gateEntered,true,'Ordinary movement/combat/F must reach the trial completion event');
  assert.equal(f.g.stageKills,3);assert.equal(f.g.adventure.clearedEncounters.size,2);
  assert.equal(f.events.filter(e=>e.type==='stageClear').length,1);assert.equal(f.g.stageIndex,0);
  assert.ok(f.g.player.hp>0);assert.equal(f.g.won,false,'This short trial must not claim campaign rescue victory');
  assert.equal(f.storage.get(SAVE),saved);assert.equal(f.writes,before);
  return {seconds:Math.round(frames/60*100)/100,deaths,remainingHp:Math.round(f.g.player.hp),kills:f.g.stageKills,clearedArenas:f.g.adventure.clearedEncounters.size,saveWrites:0};
});

for(const g of made)g.destroy();
const failed=checks.filter(c=>!c.ok),report={scope:'Isolated first-map trial behavior, stubbed Canvas/images; no rendered-pixel/FPS claim',passed:checks.length-failed.length,failed:failed.length,checks};
const out=path.resolve(process.env.KNIGHT_QA_DIR||path.join(__dirname,'../.qa-local'));fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'showcase-qa.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
if(failed.length)process.exitCode=1;
