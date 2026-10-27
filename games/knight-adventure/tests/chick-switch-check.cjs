'use strict';
// Behavior checks for the optional character skin. This does not judge artwork.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..','dist'),storage=new Map(),drawCalls=[],scaleCalls=[];
const gradient={addColorStop(){}};
const context=new Proxy({drawImage(...a){drawCalls.push(a);},scale(...a){scaleCalls.push(a);}}, {
 get:(t,k)=>k in t?t[k]:k==='createLinearGradient'||k==='createRadialGradient'?()=>gradient:k==='measureText'?()=>({width:30}):()=>{},
 set:(t,k,v)=>(t[k]=v,true)
});
const sandbox={window:{addEventListener(){},removeEventListener(){}},document:{createElement:()=>({getContext:()=>context})},
 localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
 Image:class{constructor(){this.complete=false;this.naturalWidth=0;this.naturalHeight=0;}},
 requestAnimationFrame:()=>1,cancelAnimationFrame(){},performance:{now:()=>0},console,Math};
vm.createContext(sandbox);
for(const file of ['content.js','adventure.js','game.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),sandbox);
const made=[],checks=[],plain=o=>JSON.parse(JSON.stringify(o));
const make=()=>{const g=new sandbox.window.KnightGame({getContext:()=>context});g.setAudio(false);made.push(g);return g;};
const check=(name,run)=>{try{run();checks.push({name,ok:true});}catch(e){checks.push({name,ok:false,error:e.stack});}};
const ready=g=>{for(const a of Object.values(g.heroAssets)){for(const im of [a.image,a.atlas]){const p=fs.readFileSync(path.join(root,im.src));im.complete=true;im.naturalWidth=p.readUInt32BE(16);im.naturalHeight=p.readUInt32BE(20);}}};

check('trial defaults to the selected chicken without removing the original cat',()=>{
 const g=make();assert.equal(g.heroId,'ikun');assert.equal(g.getState().heroName,'ikun骑士');
 assert.equal(g.setHero('wangguodong'),true);assert.equal(g.getState().heroId,'wangguodong');
 assert.ok(fs.existsSync(path.join(root,g.heroImage.src)));assert.ok(fs.existsSync(path.join(root,g.attackImage.src)));
 assert.equal(g.setHero('ikun'),true);assert.equal(g.heroImage,g.heroAssets.ikun.image);assert.equal(g.attackImage,g.heroAssets.ikun.atlas);
});

check('unknown and prototype hero names do not change the chosen character',()=>{
 const g=make();for(const id of ['bad','__proto__','toString','constructor',null]){assert.equal(g.setHero(id),false);assert.equal(g.heroId,'ikun');}
});

check('switching mid-combat preserves player, attack, stats, exploration and saved progress',()=>{
 const g=make();g.startNew();g._loadStage(4,true);g.level=7;g.xp=33;g.gold=321;g.upgrades={weapon:2,armor:1,charm:3};g.player.hp=113;
 const a=g.adventure;a.relics.add(a.relicItems[0].id);a.beacons.add(a.beaconItems[0].id);
 g.player.x=770;g._attack();g._save();
 const player=g.player,attack=player.attack,stage=g.stage,before=plain(g.getState()),adventure=JSON.stringify(sandbox.window.KnightAdventure.serialize(g)),saved=storage.get('wangguodong-knight-v1');
 g.setHero('wangguodong');g.setHero('ikun');
 assert.equal(g.player,player);assert.equal(g.player.attack,attack);assert.equal(g.stage,stage);
 assert.deepEqual(plain(g.getState()),before);assert.equal(JSON.stringify(sandbox.window.KnightAdventure.serialize(g)),adventure);
 assert.equal(storage.get('wangguodong-knight-v1'),saved,'Changing a costume must not overwrite the campaign save');
});

check('continue loads existing growth and exploration while keeping the chosen character',()=>{
 const g=make();g.startNew();g._loadStage(5,true);g.level=8;g.xp=24;g.gold=456;g.upgrades={weapon:3,armor:2,charm:1};
 g.adventure.relics.add(g.adventure.relicItems[0].id);g.adventure.beacons.add(g.adventure.beaconItems[0].id);g._save();
 const expected=JSON.parse(storage.get('wangguodong-knight-v1'));
 for(const id of ['wangguodong','ikun']){const h=make();h.setHero(id);h.continueGame();assert.equal(h.heroId,id);assert.equal(h.stageIndex,5);assert.equal(h.level,8);assert.equal(h.gold,456);assert.deepEqual(plain(h.upgrades),expected.upgrades);assert.deepEqual(plain(sandbox.window.KnightAdventure.serialize(h)),expected.adventure);}
});

check('new adventure and retry retain the requested skin',()=>{
 const g=make();for(const id of ['ikun','wangguodong']){g.setHero(id);g.startNew();assert.equal(g.heroId,id);g.retry();assert.equal(g.heroId,id);}
});

check('both skins draw all eight complete frame rectangles at equal scale and on the foot anchor',()=>{
 const g=make();ready(g);g.startNew();g.player.attack=null;g.player.dashTimer=0;
 for(const id of ['ikun','wangguodong']){g.setHero(id);const frames=plain(g.knightFrames);assert.equal(frames.length,8);
  for(let index=0;index<8;index++){
   const [sx,sy,w,h,ax,fy,scale]=frames[index];assert.ok(sx>=0&&sy>=0&&w>0&&h>0&&scale>0);assert.ok(sx+w<=g.attackImage.naturalWidth&&sy+h<=g.attackImage.naturalHeight);
   assert.ok(ax>=0&&ax<=w&&fy>=0&&fy<=h);for(let j=0;j<index;j++){const [x,y,ww,hh]=frames[j];assert.ok(sx>=x+ww||x>=sx+w||sy>=y+hh||y>=sy+h,'Frames cannot include neighboring artwork');}
   g.player.idleFrame=index;drawCalls.length=0;g._drawPlayer(context);assert.equal(drawCalls.length,1);const c=drawCalls[0];assert.equal(c[0],g.attackImage);assert.equal(c.length,9);assert.deepEqual(c.slice(1,5),[sx,sy,w,h]);assert.ok(Math.abs(c[7]/w-c[8]/h)<1e-10);assert.ok(Math.abs(c[5]+ax*scale)<1e-10);assert.ok(Math.abs(c[6]+fy*scale)<1e-10);
  }
 }
});

check('left and right facing mirror the same selected whole-character art',()=>{
 const g=make();ready(g);g.startNew();for(const id of ['ikun','wangguodong']){g.setHero(id);for(const facing of [-1,1]){g.player.facing=facing;drawCalls.length=0;scaleCalls.length=0;g._drawPlayer(context);assert.equal(drawCalls[0][0],g.heroAssets[id].atlas);assert.deepEqual(scaleCalls[0],[facing,1]);}}
});

check('a missing chicken atlas uses only its own reference image and never the cat',()=>{
 const g=make();ready(g);g.startNew();const chick=g.heroAssets.ikun;chick.atlasFailed=true;g.setHero('ikun');drawCalls.length=0;g._drawPlayer(context);
 assert.equal(drawCalls.length,1);assert.equal(drawCalls[0][0],chick.image);assert.notEqual(drawCalls[0][0],g.heroAssets.wangguodong.image);
 chick.imageFailed=true;g.setHero('ikun');drawCalls.length=0;g._drawPlayer(context);assert.equal(drawCalls.length,0,'A total load failure must not substitute another character');
});

for(const g of made)g.destroy();const failed=checks.filter(c=>!c.ok);console.log(JSON.stringify({passed:checks.length-failed.length,failed:failed.length,checks},null,2));if(failed.length)process.exitCode=1;
