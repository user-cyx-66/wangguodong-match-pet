(function () {
  'use strict';

  const GROUND = 590;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const number = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const idOf = (item, index, prefix) => String(item.id ?? `${prefix}-${index + 1}`);
  const list = value => Array.isArray(value) ? value : [];
  const labelNumber = index => ['一', '二', '三', '四', '五'][index] || String(index + 1);

  function stageId(game) { return String(game.stage?.id || `stage-${game.stageIndex || 0}`); }
  function owned(values, items) {
    const allowed = new Set(items.map(item => item.id));
    return new Set(list(values).map(String).filter(id => allowed.has(id)));
  }
  function objects(stage, key, prefix) {
    return list(stage[key]).map((item, index) => ({...item,id:idOf(item,index,prefix),x:number(item.x,0),y:number(item.y,GROUND)}));
  }
  function emit(game, text) { if (typeof game._event === 'function') game._event({type:'toast',text}); }
  function sound(game, name) { if (typeof game._sound === 'function') game._sound(name); }
  function burst(game, x, y, color, count = 16) { if (typeof game._burst === 'function') game._burst(x,y,count,color,140); }
  function save(game) { if (typeof game._save === 'function') game._save(); if (typeof game._notify === 'function') game._notify(); }
  function stateOf(game) { return game.adventure || init(game); }

  function init(game, saved) {
    const stage = game.stage || {};
    const encounters = objects(stage,'encounters','encounter').sort((a,b)=>a.x-b.x).map((item,index) => ({
      ...item,label:item.label || `第${labelNumber(index)}段遭遇战`,
      arena:[Math.max(30,item.x-180),Math.min((game.worldWidth||stage.width||6000)-35,item.x+850)],enemyIds:new Set()
    }));
    const relics = objects(stage,'relics','relic'), beacons = objects(stage,'beacons','beacon');
    const chests = objects(stage,'chests','chest'), checkpoints = objects(stage,'checkpoints','checkpoint').map((item,index)=>({...item,label:item.label||`检查点${labelNumber(index)}`}));
    const hazards = objects(stage,'hazardZones','hazard').map((item,index) => {
      const period = Math.max(2.5,number(item.period,5));
      const active = clamp(number(item.active,1.15),.3,period-1.05);
      return {...item,type:['spikes','flame','ice'].includes(item.type)?item.type:'spikes',w:Math.max(30,number(item.w,115)),period,active,warning:Math.min(.9,period-active-.15),offset:number(item.offset,index*.71)};
    });
    const snapshot = saved && (!saved.stageId || String(saved.stageId)===stageId(game)) ? saved : {};
    const a = {
      version:1,stageId:stageId(game),elapsed:0,encounters,relicItems:relics,beaconItems:beacons,chestItems:chests,checkpointItems:checkpoints,hazards,
      clearedEncounters:owned(snapshot.clearedEncounters,encounters),relics:owned(snapshot.relics,relics),beacons:owned(snapshot.beacons,beacons),chests:owned(snapshot.chests,chests),
      checkpointIds:owned(snapshot.checkpointIds,checkpoints),checkpointId:null,checkpointX:140,checkpointLabel:'旅途起点',activeEncounter:null,
      ripples:[],hazardWarnings:new Map(),hazardCooldowns:new Map(),doorHintAt:-10,interacted:false
    };
    let checkpoint = checkpoints.find(item=>item.id===String(snapshot.checkpointId));
    if (!checkpoint && a.checkpointIds.size) checkpoint = checkpoints.filter(item=>a.checkpointIds.has(item.id)).sort((x,y)=>y.x-x.x)[0];
    if (checkpoint) {a.checkpointIds.add(checkpoint.id);a.checkpointId=checkpoint.id;a.checkpointX=checkpoint.x;a.checkpointLabel=checkpoint.label;}
    game.adventure = a;
    const configs = list(stage.enemies);
    for (let index=0;index<(game.enemies||[]).length;index++) {
      const enemy = game.enemies[index], config = configs[index] || {};
      const source = config.encounter ?? config.encounterId ?? enemy.encounter;
      let encounter = encounters.find(item=>item.id===String(source));
      if (!encounter && typeof source==='number') encounter=encounters[source];
      if (!encounter && encounters.length) {
        encounter = encounters.filter(item=>item.x<=enemy.x+180).pop() || encounters[0];
      }
      if (!encounter) {enemy.dormant=false;continue;}
      enemy.encounter=encounter.id;encounter.enemyIds.add(enemy.id);
      if (a.clearedEncounters.has(encounter.id)) {enemy.hp=0;enemy.deadTimer=1;enemy.dormant=false;}
      else enemy.dormant=enemy.hp>0;
    }
    game.stageKills=(game.enemies||[]).filter(enemy=>enemy.hp<=0).length;
    return a;
  }

  function members(game, encounter) { return (game.enemies||[]).filter(enemy=>enemy.encounter===encounter.id); }
  function remaining(game, encounter) { return members(game,encounter).filter(enemy=>enemy.hp>0).length; }
  function needed(items) { return Math.min(3,items.length); }

  function canExit(game) {
    const a=stateOf(game);
    return a.clearedEncounters.size>=a.encounters.length && (game.enemies||[]).every(enemy=>enemy.hp<=0) && a.relics.size>=needed(a.relicItems) && a.beacons.size>=needed(a.beaconItems);
  }

  function objective(game) {
    const a=stateOf(game),active=a.encounters.find(item=>item.id===a.activeEncounter);
    if(active)return `遭遇战 · ${active.label} · 剩余 ${remaining(game,active)} 个敌人`;
    if(canExit(game))return game.stageIndex===(game.levels?.length||12)-1?'前往右侧囚笼，按 F 救出蔡乙先王子':'光门已开启 · 前往右侧出口，按 F 进入营地';
    const relicNeed=needed(a.relicItems),beaconNeed=needed(a.beaconItems),next=a.encounters.find(item=>!a.clearedEncounters.has(item.id));
    const missing=[...a.relicItems.filter(item=>!a.relics.has(item.id)).map(item=>({...item,kind:'星辉碎片'})),...a.beaconItems.filter(item=>!a.beacons.has(item.id)).map(item=>({...item,kind:'誓灯'}))];
    const behind=missing.filter(item=>item.x<game.player.x-110).sort((x,y)=>y.x-x.x)[0];
    if(behind)return `← 沿路找回${behind.kind} · 碎片 ${a.relics.size}/${relicNeed} · 誓灯 ${a.beacons.size}/${beaconNeed}`;
    if(next)return `前往 ${next.label} · 碎片 ${a.relics.size}/${relicNeed} · 誓灯 ${a.beacons.size}/${beaconNeed}`;
    return `寻找剩余目标 · 星辉碎片 ${a.relics.size}/${relicNeed} · 誓灯 ${a.beacons.size}/${beaconNeed}`;
  }

  function state(game) {
    const a=stateOf(game),active=a.encounters.find(item=>item.id===a.activeEncounter);
    return {
      relics:{collected:a.relics.size,total:needed(a.relicItems)},beacons:{lit:a.beacons.size,total:needed(a.beaconItems)},chests:{opened:a.chests.size,total:a.chestItems.length},
      encounters:{cleared:a.clearedEncounters.size,total:a.encounters.length},checkpoint:{id:a.checkpointId,x:a.checkpointX,label:a.checkpointLabel},
      activeEncounter:active?{id:active.id,label:active.label,remaining:remaining(game,active),arena:[...active.arena]}:null,canExit:canExit(game),objective:objective(game)
    };
  }

  function serialize(game) {
    const a=stateOf(game);
    // A kill can save during impact freeze, before the next exploration update.
    const cleared=new Set(a.clearedEncounters);
    for(const encounter of a.encounters){const group=members(game,encounter);if(group.length&&group.every(enemy=>enemy.hp<=0))cleared.add(encounter.id);}
    return {version:1,stageId:a.stageId,clearedEncounters:[...cleared],relics:[...a.relics],beacons:[...a.beacons],chests:[...a.chests],checkpointIds:[...a.checkpointIds],checkpointId:a.checkpointId,checkpointX:a.checkpointX,checkpointLabel:a.checkpointLabel};
  }

  function encounterUpdate(game,a) {
    let active=a.encounters.find(item=>item.id===a.activeEncounter);
    if(active && remaining(game,active)===0){
      a.clearedEncounters.add(active.id);a.activeEncounter=null;
      a.ripples.push({x:(active.arena[0]+active.arena[1])*.5,y:GROUND-70,life:1.5,max:1.5,color:'#e4d49c'});
      emit(game,`${active.label} 已清理 · 战区解锁，继续探索`);sound(game,'clear');save(game);active=null;
    }
    if(!active){
      const next=a.encounters.find(item=>!a.clearedEncounters.has(item.id));
      if(next && game.player.x>=next.x-150){
        if(remaining(game,next)===0){a.clearedEncounters.add(next.id);save(game);}
        else{
          a.activeEncounter=next.id;active=next;
          for(const enemy of members(game,next))enemy.dormant=false;
          emit(game,`遭遇战：${next.label} · 击败 ${remaining(game,next)} 个敌人后道路开放`);sound(game,'dash');
        }
      }
    }
    if(active){
      const [left,right]=active.arena,p=game.player,before=p.x;
      p.x=clamp(p.x,left+20,right-20);if(p.x!==before)p.vx=0;
      for(const enemy of members(game,active))if(enemy.hp>0){enemy.x=clamp(enemy.x,left+38,right-38);enemy.dormant=false;}
    }
  }

  function centerY(item) { return item.y-35; }
  function closeTo(game,item,reach=92) {return Math.abs(game.player.x-item.x)<reach && Math.abs((game.player.y-35)-centerY(item))<75;}

  function collectRelics(game,a) {
    for(const item of a.relicItems){
      if(a.relics.has(item.id) || !closeTo(game,item,37))continue;
      a.relics.add(item.id);burst(game,item.x,centerY(item),'#acdff0',22);sound(game,'coin');
      a.ripples.push({x:item.x,y:centerY(item),life:.75,max:.75,color:'#b7e4ef'});
      emit(game,`找到星辉碎片 ${a.relics.size}/${needed(a.relicItems)} · 小小的光，也会照亮长路`);save(game);
    }
  }

  function interact(game,a) {
    a.interacted=false;
    if(!game.pressed?.interact)return;
    const candidates=[];
    for(const item of a.beaconItems)if(!a.beacons.has(item.id)&&closeTo(game,item))candidates.push({item,kind:'beacon'});
    for(const item of a.chestItems)if(!a.chests.has(item.id)&&closeTo(game,item))candidates.push({item,kind:'chest'});
    for(const item of a.checkpointItems)if(a.checkpointId!==item.id&&closeTo(game,item))candidates.push({item,kind:'checkpoint'});
    candidates.sort((x,y)=>Math.abs(x.item.x-game.player.x)-Math.abs(y.item.x-game.player.x));
    const candidate=candidates[0];
    if(candidate){
      const {item,kind}=candidate;a.interacted=true;
      if(kind==='beacon'){
        a.beacons.add(item.id);burst(game,item.x,item.y-74,'#f1d99b',20);sound(game,'upgrade');
        emit(game,`誓灯已点亮 ${a.beacons.size}/${needed(a.beaconItems)} · 王德敏的魔法照亮了道路`);
      }else if(kind==='chest'){
        const gold=Math.max(1,Math.floor(number(item.gold,35)));
        a.chests.add(item.id);game.gold=(game.gold||0)+gold;burst(game,item.x,item.y-25,'#e8ce85',20);sound(game,'coin');
        emit(game,`打开旅人宝箱 · 获得 ${gold} 金币`);
      }else{
        const first=!a.checkpointIds.has(item.id);a.checkpointIds.add(item.id);
        a.checkpointId=item.id;a.checkpointX=item.x;a.checkpointLabel=item.label;
        if(first){
          const maxHp=typeof game._stats==='function'?game._stats().maxHp:(game.player.maxHp||100);
          game.player.hp=Math.min(maxHp,game.player.hp+Math.ceil(maxHp*.4));burst(game,item.x,item.y-40,'#d4c4ed',23);sound(game,'upgrade');
        }
        emit(game,`${item.label}已记录${first?' · 恢复部分生命':''}，倒下后从这里再出发`);
      }
      save(game);
    }else if(Math.abs(game.player.x-(game.stage.portalX||game.worldWidth-130))<135&&!canExit(game)&&a.elapsed-a.doorHintAt>1){
      a.doorHintAt=a.elapsed;emit(game,`${game.stageIndex===(game.levels?.length||12)-1?'囚笼封印仍未解除':'光门仍在等待'}：战区 ${a.clearedEncounters.size}/${a.encounters.length}，碎片 ${a.relics.size}/${needed(a.relicItems)}，誓灯 ${a.beacons.size}/${needed(a.beaconItems)}`);
    }
  }

  function hazardPhase(a,h) {
    const elapsed=a.elapsed+h.offset,cycle=((elapsed%h.period)+h.period)%h.period;
    const hitStart=h.period-h.active,warnStart=hitStart-h.warning;
    return {kind:cycle>=hitStart?'active':cycle>=warnStart?'warning':'safe',cycle,cycleIndex:Math.floor(elapsed/h.period),progress:cycle>=hitStart?(cycle-hitStart)/h.active:cycle>=warnStart?(cycle-warnStart)/h.warning:0};
  }

  function hazardUpdate(game,a,dt) {
    const p=game.player;
    for(const h of a.hazards){
      const phase=hazardPhase(a,h),near=Math.abs(p.x-(h.x+h.w*.5))<h.w*.5+210;
      if(phase.kind==='warning'&&near&&a.hazardWarnings.get(h.id)!==phase.cycleIndex){
        a.hazardWarnings.set(h.id,phase.cycleIndex);
        emit(game,h.type==='flame'?'火焰即将喷发 · 等待熄灭，或二段跳越过':h.type==='ice'?'寒潮正在聚集 · 留意蓝色光圈，跳跃躲避':'地刺即将升起 · 看准预警，跳跃或等待通过');
      }
      if(phase.kind!=='active')continue;
      const height=h.type==='flame'?112:h.type==='ice'?67:39;
      const overlapping=p.x+17>h.x&&p.x-17<h.x+h.w&&p.y>h.y-height&&p.y-70<h.y+8;
      if(!overlapping)continue;
      if(h.type==='ice')p.vx*=Math.pow(.08,dt);
      if((p.invuln||0)>0 || (a.hazardCooldowns.get(h.id)||0)>a.elapsed)continue;
      a.hazardCooldowns.set(h.id,a.elapsed+1.05);
      const damage=number(h.damage,h.type==='flame'?15:h.type==='ice'?8:12)+Math.floor((game.stageIndex||0)/4);
      if(typeof game._damagePlayer==='function')game._damagePlayer(damage,p.x<h.x+h.w*.5?-140:140);
    }
  }

  function update(game,dt) {
    const a=stateOf(game);
    if(game.dead||game.won)return;
    a.elapsed+=Math.max(0,dt);
    for(const ripple of a.ripples)ripple.life-=dt;
    a.ripples=a.ripples.filter(ripple=>ripple.life>0);
    encounterUpdate(game,a);
    collectRelics(game,a);
    interact(game,a);
    hazardUpdate(game,a,dt);
  }

  function text(c,message,x,y,size,color='#e8e2cf',align='center') {
    c.save();c.font=`600 ${size}px "Microsoft YaHei", "PingFang SC", sans-serif`;c.textAlign=align;c.textBaseline='alphabetic';
    c.lineWidth=3.5;c.strokeStyle='rgba(12,21,29,.85)';c.strokeText(message,x,y);c.fillStyle=color;c.fillText(message,x,y);c.restore();
  }
  function glow(c,x,y,r,color) {
    const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'rgba(215,224,202,0)');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);
  }
  function visible(game,x,w=140) {return x+w>game.camera-80&&x-w<game.camera+1280+80;}

  function drawRelic(game,c,a,item,t) {
    if(a.relics.has(item.id))return;
    const y=centerY(item)-8+Math.sin(t*2.6+item.x)*5;
    glow(c,item.x,y,38,'rgba(153,220,236,.24)');c.save();c.translate(item.x,y);c.rotate(Math.sin(t*1.4)*.12);
    c.fillStyle='#abd9e5';c.strokeStyle='#e0f5ed';c.lineWidth=1.4;c.beginPath();c.moveTo(0,-17);c.lineTo(11,-2);c.lineTo(4,14);c.lineTo(-10,4);c.closePath();c.fill();c.stroke();
    c.fillStyle='#ecfff5';c.beginPath();c.moveTo(0,-13);c.lineTo(3,-1);c.lineTo(-3,8);c.lineTo(-5,-1);c.closePath();c.fill();c.restore();
    if(closeTo(game,item,145))text(c,'星辉碎片 · 触碰拾取',item.x,item.y-91,13,'#c5e7e8');
  }

  function drawBeacon(game,c,a,item,t) {
    const lit=a.beacons.has(item.id);c.save();c.translate(item.x,item.y);
    if(lit)glow(c,0,-60,91,'rgba(238,210,132,.19)');
    c.fillStyle='#414d52';c.strokeStyle='#899797';c.lineWidth=1;c.beginPath();c.moveTo(-19,0);c.lineTo(-15,-14);c.lineTo(-8,-18);c.lineTo(-9,-53);c.lineTo(9,-53);c.lineTo(8,-18);c.lineTo(15,-14);c.lineTo(19,0);c.closePath();c.fill();c.stroke();
    c.fillStyle=lit?'#ecd59a':'#7b8b91';c.beginPath();c.moveTo(0,-82);c.lineTo(12,-66);c.lineTo(0,-51);c.lineTo(-12,-66);c.closePath();c.fill();
    c.strokeStyle=lit?'#f3e8bb':'#a3b6b9';c.lineWidth=1.4;c.beginPath();c.arc(0,-66,18,Math.sin(t)*.2,Math.PI*1.7+Math.sin(t)*.2);c.stroke();
    if(lit){c.strokeStyle='rgba(244,220,158,.4)';c.beginPath();c.ellipse(0,-42+Math.sin(t*2)*2,27,6,0,0,Math.PI*2);c.stroke();}
    c.restore();if(closeTo(game,item,135))text(c,lit?'誓灯已点亮':'F  点亮誓灯',item.x,item.y-104,14,lit?'#dfcf9b':'#e6e1cf');
  }

  function drawChest(game,c,a,item) {
    const open=a.chests.has(item.id);c.save();c.translate(item.x,item.y);c.fillStyle='#75573e';c.strokeStyle='#bd9d68';c.lineWidth=1.5;
    c.beginPath();c.roundRect?c.roundRect(-20,-27,40,26,3):c.rect(-20,-27,40,26);c.fill();c.stroke();
    c.save();c.translate(0,-24);if(open){c.translate(-18,-7);c.rotate(-.6);}
    c.fillStyle='#927046';c.beginPath();c.moveTo(-21,0);c.quadraticCurveTo(-22,-15,0,-15);c.quadraticCurveTo(22,-15,21,0);c.closePath();c.fill();c.stroke();c.restore();
    c.fillStyle='#c6ab72';c.fillRect(-13,-29,3,28);c.fillRect(10,-29,3,28);c.fillRect(-3,-19,6,8);
    if(open){c.fillStyle='#e7cf8c';c.beginPath();c.ellipse(0,-17,9,3,0,0,Math.PI*2);c.fill();}
    c.restore();if(closeTo(game,item,140))text(c,open?'旅人宝箱 · 已开启':`F  开启宝箱 · ${Math.floor(number(item.gold,35))} 金币`,item.x,item.y-64,13,open?'#b6bfb3':'#ebd398');
  }

  function drawCheckpoint(game,c,a,item,t) {
    const activated=a.checkpointIds.has(item.id),current=a.checkpointId===item.id;
    c.save();c.translate(item.x,item.y);
    if(current)glow(c,0,-36,77,'rgba(190,168,228,.16)');
    c.fillStyle='#45545c';c.beginPath();c.moveTo(-20,0);c.lineTo(-14,-10);c.lineTo(11,-10);c.lineTo(18,0);c.closePath();c.fill();
    c.strokeStyle=activated?'#c7c1d8':'#a0aab1';c.lineWidth=3;c.beginPath();c.moveTo(0,-7);c.lineTo(0,-96);c.stroke();
    c.fillStyle=activated?'#b7a2cd':'#79798e';c.beginPath();c.moveTo(2,-89);c.bezierCurveTo(14,-95,24,-81,36+Math.sin(t*3)*3,-85);c.lineTo(33,-57);c.bezierCurveTo(20,-54,15,-67,2,-62);c.closePath();c.fill();
    c.strokeStyle='#e4d8c6';c.lineWidth=1;c.beginPath();c.moveTo(15,-81);c.lineTo(22,-73);c.lineTo(15,-65);c.moveTo(10,-73);c.lineTo(27,-73);c.stroke();
    c.restore();if(closeTo(game,item,140))text(c,current?`${item.label} · 已记录`:`F  记录${item.label}${activated?'':' · 恢复生命'}`,item.x,item.y-115,13,current?'#d3c8e9':'#e7e1d3');
  }

  function drawHazard(game,c,a,h,t) {
    const phase=hazardPhase(a,h),active=phase.kind==='active',warning=phase.kind==='warning';
    c.save();c.translate(h.x,h.y);
    c.fillStyle=h.type==='ice'?'rgba(117,174,194,.18)':'rgba(13,24,29,.4)';c.fillRect(0,-3,h.w,7);
    if(warning){c.fillStyle=h.type==='ice'?`rgba(156,213,238,${.16+Math.sin(t*15)*.08})`:`rgba(249,179,103,${.2+Math.sin(t*15)*.1})`;c.fillRect(0,-7,h.w,12);c.strokeStyle=h.type==='ice'?'#a4d7e4':'#e9b77f';c.lineWidth=1.3;c.beginPath();c.moveTo(0,-9);c.lineTo(h.w,-9);c.stroke();}
    if(h.type==='spikes'){
      const height=active?35:warning?12:6;c.fillStyle=active?'#c2d0cd':'#687d83';c.strokeStyle=active?'#e0e0c8':'#8c9c9c';c.lineWidth=1;
      for(let x=4;x<h.w-5;x+=18){c.beginPath();c.moveTo(x,1);c.lineTo(x+7,-height);c.lineTo(x+14,1);c.closePath();c.fill();c.stroke();}
    }else if(h.type==='flame'){
      c.fillStyle='#514641';for(let x=5;x<h.w;x+=24)c.fillRect(x,-4,12,6);
      if(active){
        for(let x=6;x<h.w;x+=20){const height=67+Math.sin(t*12+x)*20;const g=c.createLinearGradient(0,-height,0,0);g.addColorStop(0,'rgba(255,174,91,0)');g.addColorStop(.35,'rgba(243,151,80,.7)');g.addColorStop(1,'#f3d78c');c.fillStyle=g;c.beginPath();c.moveTo(x-7,1);c.quadraticCurveTo(x-16,-height*.5,x+Math.sin(t*8+x)*5,-height);c.quadraticCurveTo(x+17,-height*.45,x+13,1);c.fill();}
      }
    }else{
      c.strokeStyle=active?'#c0ebf1':'#729ba7';c.lineWidth=1;
      for(let x=9;x<h.w;x+=24){c.beginPath();c.moveTo(x-7,0);c.lineTo(x,-(active?26:12));c.lineTo(x+7,0);c.stroke();}
      if(active){c.strokeStyle='rgba(183,226,239,.55)';c.lineWidth=2;for(let i=0;i<4;i++){const y=-14-i*15;c.beginPath();c.moveTo(0,y);c.bezierCurveTo(h.w*.3,y-13,h.w*.6,y+12,h.w,y-4);c.stroke();}}
    }
    c.restore();
    if(warning&&Math.abs(game.player.x-h.x-h.w*.5)<h.w*.5+230)text(c,h.type==='flame'?'即将喷发':h.type==='ice'?'寒潮预警':'地刺预警',h.x+h.w*.5,h.y-111,13,h.type==='ice'?'#c4e5f1':'#f3c894');
  }

  function drawScenery(game,c,a,t) {
    const key=String(game.stage.theme||game.stage.biome||game.stage.id||''),fire=/lava|flame|volcano|fire|熔|火/.test(key),ice=/ice|frost|snow|冰|雪/.test(key),castle=/castle|throne|tower|fort|城|堡|塔/.test(key);
    const width=game.worldWidth||6000;
    for(let x=630,index=0;x<width-350;x+=890,index++){
      if(!visible(game,x,170))continue;
      c.save();c.translate(x,GROUND);c.globalAlpha=.72;
      if(fire){
        c.fillStyle='#504044';c.beginPath();c.moveTo(-28,0);c.lineTo(-22,-50);c.lineTo(-7,-65);c.lineTo(10,-31);c.lineTo(31,0);c.fill();c.strokeStyle='#ca8860';c.lineWidth=2;c.beginPath();c.moveTo(-9,-47);c.lineTo(-4,-25);c.lineTo(5,-18);c.lineTo(0,-4);c.stroke();glow(c,-3,-15,39,'rgba(220,131,83,.14)');
      }else if(ice){
        c.fillStyle='#7297a6';c.strokeStyle='#a3c3c9';c.lineWidth=1;c.beginPath();c.moveTo(-25,0);c.lineTo(-19,-31);c.lineTo(-11,-41);c.lineTo(-3,-13);c.lineTo(8,-62);c.lineTo(21,-35);c.lineTo(24,0);c.closePath();c.fill();c.stroke();
      }else if(/mine|矿/.test(key)){
        c.strokeStyle='#6f6473';c.lineWidth=3;c.beginPath();c.moveTo(-50,-3);c.lineTo(46,-3);c.moveTo(-49,-13);c.lineTo(45,-13);c.stroke();c.lineWidth=2;for(let rail=-43;rail<45;rail+=18){c.beginPath();c.moveTo(rail,-17);c.lineTo(rail+6,0);c.stroke();}
        c.fillStyle='#5b5365';c.strokeStyle='#a08aa7';c.lineWidth=1;c.beginPath();c.moveTo(-23,-22);c.lineTo(-17,-62);c.lineTo(-4,-80);c.lineTo(7,-37);c.lineTo(16,-58);c.lineTo(27,-35);c.lineTo(24,-10);c.closePath();c.fill();c.stroke();c.fillStyle='#b7a3d5';c.beginPath();c.moveTo(-12,-60);c.lineTo(-4,-73);c.lineTo(0,-35);c.closePath();c.fill();glow(c,-5,-42,38,'rgba(194,165,232,.15)');
      }else if(/swamp|沼/.test(key)){
        c.fillStyle='rgba(134,167,137,.2)';c.beginPath();c.ellipse(0,-1,78,7,0,0,Math.PI*2);c.fill();c.strokeStyle='#84937a';c.lineWidth=2;
        for(let reed=-42;reed<45;reed+=14){const bend=Math.sin(t*1.5+reed)*4;c.beginPath();c.moveTo(reed,0);c.quadraticCurveTo(reed-8,-20,reed+bend,-45-(reed%3)*6);c.stroke();c.fillStyle='#a3ac7f';c.beginPath();c.ellipse(reed+bend,-47-(reed%3)*6,3,8,.2,0,Math.PI*2);c.fill();}
        glow(c,18,-21,30,'rgba(202,218,135,.13)');
      }else if(/sky|cloud|浮空|云/.test(key)){
        c.fillStyle='#697c84';c.strokeStyle='#adbfbd';c.lineWidth=1;c.fillRect(-16,-56,22,56);c.strokeRect(-16,-56,22,56);c.fillRect(-23,-64,36,9);c.fillRect(-23,-8,36,8);
        c.strokeStyle='#c5bea1';c.lineWidth=1;c.beginPath();c.moveTo(-9,-51);c.lineTo(-9,-13);c.moveTo(-2,-51);c.lineTo(-2,-13);c.stroke();c.fillStyle='#b2a6bd';c.beginPath();c.moveTo(8,-54);c.bezierCurveTo(35,-61,34,-35,59+Math.sin(t*2)*7,-39);c.lineTo(43,-24);c.bezierCurveTo(26,-38,24,-42,8,-35);c.closePath();c.fill();
      }else if(/forest|密林/.test(key)){
        c.strokeStyle='#496456';c.lineWidth=9;c.beginPath();c.moveTo(-27,-1);c.quadraticCurveTo(-5,-8,-8,-35);c.moveTo(-8,-8);c.quadraticCurveTo(21,-14,38,-4);c.stroke();c.fillStyle='#638364';
        for(let leaf=0;leaf<5;leaf++){const lx=-26+leaf*15,ly=-17-Math.sin(leaf)*9;c.beginPath();c.ellipse(lx,ly,11,4,-.4+leaf*.2,0,Math.PI*2);c.fill();}
        for(let spark=0;spark<4;spark++){const sx=-35+spark*23+Math.sin(t+spark)*8,sy=-45-Math.sin(t*.8+spark)*11;c.fillStyle='#d6e4a6';c.beginPath();c.arc(sx,sy,1.5,0,Math.PI*2);c.fill();glow(c,sx,sy,12,'rgba(205,229,152,.1)');}
      }else if(/ruin|遗迹/.test(key)){
        c.save();c.translate(-9,-3);c.rotate(.17);c.fillStyle='#5d686a';c.strokeStyle='#9aa49b';c.lineWidth=1;c.fillRect(-16,-81,27,81);c.strokeRect(-16,-81,27,81);c.fillRect(-23,-90,40,10);for(let groove=-10;groove<10;groove+=7){c.beginPath();c.moveTo(groove,-76);c.lineTo(groove,-7);c.stroke();}c.restore();c.fillStyle='#69716b';c.fillRect(21,-12,26,12);c.fillRect(33,-21,20,9);
      }else if(castle){
        c.fillStyle='#4c5662';c.strokeStyle='#858a8b';c.lineWidth=1;c.fillRect(-20,-76,27,76);c.strokeRect(-20,-76,27,76);for(let y=-61;y<0;y+=18){c.beginPath();c.moveTo(-20,y);c.lineTo(7,y);c.stroke();}c.fillRect(-26,-84,39,9);c.fillStyle='#7e748c';c.beginPath();c.moveTo(7,-63);c.lineTo(41,-58);c.lineTo(31,-38);c.lineTo(40,-20);c.lineTo(7,-26);c.closePath();c.fill();
      }else{
        c.fillStyle='#4d655e';c.strokeStyle='#81958b';c.lineWidth=1;c.beginPath();c.moveTo(-27,0);c.lineTo(-23,-51);c.quadraticCurveTo(-6,-76,11,-50);c.lineTo(15,0);c.closePath();c.fill();c.stroke();c.strokeStyle='#b1b69a';c.lineWidth=1.2;c.beginPath();c.moveTo(-13,-47);c.lineTo(-3,-36);c.lineTo(-13,-25);c.moveTo(-19,-36);c.lineTo(4,-36);c.stroke();c.fillStyle='#586955';c.beginPath();c.ellipse(-5,-2,37,6,0,0,Math.PI*2);c.fill();
      }
      c.restore();
    }
  }

  function drawArena(game,c,a,t) {
    const encounter=a.encounters.find(item=>item.id===a.activeEncounter);if(!encounter)return;
    const pulse=.35+Math.sin(t*5)*.12;
    for(const x of encounter.arena){
      if(!visible(game,x))continue;
      const g=c.createLinearGradient(0,GROUND-210,0,GROUND+8);g.addColorStop(0,'rgba(211,197,150,0)');g.addColorStop(.65,`rgba(222,199,140,${pulse})`);g.addColorStop(1,'rgba(248,223,160,.85)');c.fillStyle=g;c.fillRect(x-4,GROUND-210,8,218);
      c.strokeStyle='rgba(233,217,173,.6)';c.lineWidth=1;for(let i=0;i<4;i++){const y=GROUND-25-((t*31+i*43)%170);c.beginPath();c.moveTo(x-8,y);c.lineTo(x,y-8);c.lineTo(x+8,y);c.stroke();}
    }
    const x=(game.camera||0)+640;c.save();c.fillStyle='rgba(23,31,38,.77)';c.fillRect(x-218,177,436,36);text(c,`${encounter.label} · 清理敌人后道路开放`,x,201,15,'#e8d7af');c.restore();
  }

  function draw(game,c) {
    const a=stateOf(game),t=game.realTime||game.time||0;
    c.save();drawScenery(game,c,a,t);
    for(const h of a.hazards)if(visible(game,h.x,h.w+70))drawHazard(game,c,a,h,t);
    for(const item of a.relicItems)if(visible(game,item.x))drawRelic(game,c,a,item,t);
    for(const item of a.beaconItems)if(visible(game,item.x))drawBeacon(game,c,a,item,t);
    for(const item of a.chestItems)if(visible(game,item.x))drawChest(game,c,a,item);
    for(const item of a.checkpointItems)if(visible(game,item.x))drawCheckpoint(game,c,a,item,t);
    drawArena(game,c,a,t);
    for(const ripple of a.ripples){if(!visible(game,ripple.x))continue;c.save();c.globalAlpha=ripple.life/ripple.max;c.strokeStyle=ripple.color;c.lineWidth=2;c.beginPath();c.arc(ripple.x,ripple.y,20+(1-ripple.life/ripple.max)*65,0,Math.PI*2);c.stroke();c.restore();}
    const portalX=game.stage.portalX||game.worldWidth-130;
    if(!canExit(game)&&Math.abs(game.player.x-portalX)<240)text(c,`${game.stageIndex===(game.levels?.length||12)-1?'囚笼封印 · ':''}星辉 ${a.relics.size}/${needed(a.relicItems)} · 誓灯 ${a.beacons.size}/${needed(a.beaconItems)} · 战区 ${a.clearedEncounters.size}/${a.encounters.length}`,portalX,GROUND-194,14,'#d8d8cb');
    c.restore();
  }

  window.KnightAdventure={init,update,draw,state,serialize,objective,canExit,onDeath:game=>serialize(game)};
})();
