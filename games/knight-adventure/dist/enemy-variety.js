/* Distinct enemy silhouettes and readable, interruptible combat patterns.
   Loaded after game.js. Every attack uses the normal damage/guard system. */
(function () {
  'use strict';
  const K=window.KnightGame;if(!K)return;
  const P=K.prototype,GROUND=590,TAU=Math.PI*2;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const labels={pouncer:'弹跳苔团',mushroom:'孢子伞菇',charger:'獠牙猎狼',archer:'游猎弓手',shieldguard:'铁盾守卫',frostmage:'霜纹术士',embermage:'烬火术士',golem:'古岩石像',nightwing:'月翼魔蝠',dragon:'灰烬恶龙'};
  const colors={pouncer:'#b2d77b',mushroom:'#e2b673',charger:'#cf967e',archer:'#c8cf9e',shieldguard:'#c9b179',frostmage:'#a5e4ed',embermage:'#ffbd83',golem:'#c7d2cb',nightwing:'#d5b2ed',dragon:'#f2bd77'};
  const oldMake=P._makeEnemy,oldEnemy=P._updateEnemy,oldDraw=P._drawEnemy,oldDamage=P._damageEnemy;
  const oldLoad=P._loadStage,oldProjectiles=P._updateProjectiles,oldProjectileDraw=P._drawProjectile,oldTerrain=P._drawTerrain;
  const spriteOrder=['pouncer','mushroom','charger','archer','shieldguard','frostmage','embermage','golem','nightwing'];
  const enemyArt={src:'assets/enemy-poses.png',ready:false,cache:[],failed:false};
  function loadEnemyArt(){
    if(typeof Image==='undefined')return;
    const im=new Image();enemyArt.image=im;
    const prepare=()=>{
      if(!im.naturalWidth||!im.naturalHeight||typeof document==='undefined'||!document.createElement)return;
      const cw=im.naturalWidth/6,ch=im.naturalHeight/3;
      for(let i=0;i<18;i++){
        const cache=document.createElement('canvas');cache.width=224;cache.height=224;const c=cache.getContext('2d');if(!c)return;
        const sx=Math.round((i%6)*cw),sy=Math.round(Math.floor(i/6)*ch),sw=Math.round((i%6+1)*cw)-sx,sh=Math.round((Math.floor(i/6)+1)*ch)-sy;
        // Leave a transparent guard pixel without scaling adjacent-cell pixels into this pose.
        c.imageSmoothingEnabled=true;c.drawImage(im,sx+1,sy+1,sw-2,sh-2,224/sw,224/sh,224*(sw-2)/sw,224*(sh-2)/sh);enemyArt.cache.push(cache);
      }
      enemyArt.flashCache=enemyArt.cache.map(frame=>{const mask=document.createElement('canvas');mask.width=frame.width;mask.height=frame.height;const mc=mask.getContext('2d');mc.drawImage(frame,0,0);mc.globalCompositeOperation='source-in';mc.fillStyle='#fff7db';mc.fillRect(0,0,mask.width,mask.height);return mask;});
      enemyArt.ready=enemyArt.cache.length===18;
    };
    im.addEventListener?.('load',prepare,{once:true});im.addEventListener?.('error',()=>{enemyArt.failed=true;},{once:true});im.src=enemyArt.src;
    if(im.complete&&im.naturalWidth)prepare();
  }
  loadEnemyArt();
  function laneClamp(g,e){e.x=e.lane?clamp(e.x,e.lane.min,e.lane.max):clamp(e.x,35,g.worldWidth-55);}
  function begin(e,move,tell){
    const b=e.brain;b.state='tell';b.move=move;b.left=tell;b.tellMax=tell;b.lockX=e.x;b.lockY=e.y;b.aimX=e.aimPlayerX;b.aimY=e.aimPlayerY;b.direction=e.facing;b.hit=false;
    e.tell=tell;e.action=move;
  }
  function recover(e,time){e.brain.state='recover';e.brain.left=time;e.tell=0;e.attack=0;e.action='idle';}
  function field(g,config){(g.enemyFields||(g.enemyFields=[])).push({age:0,tell:.65,life:.45,r:75,damage:13,color:'#f4bb8d',kind:'impact',...config});}
  function shot(g,e,kind,vx,vy,extra={}){g.projectiles.push({x:e.x+e.facing*24,y:e.y-(e.type==='dragon'?126:68),vx,vy,r:kind==='arrow'?6:9,life:3,friendly:false,damage:10*e.damageScale,kind,...extra});}
  function strike(g,e,reach,damage,height=92){
    const p=g.player,b=e.brain,dx=(p.x-e.x)*b.direction;
    if(!b.hit&&dx>-20&&dx<reach&&Math.abs(p.y-e.y)<height){g._damagePlayer(damage*e.damageScale,b.direction*230,e.x);b.hit=true;}
  }
  P._loadStage=function(...args){this.enemyFields=[];return oldLoad.apply(this,args);};
  P._makeEnemy=function(config,id){
    const e=oldMake.call(this,config,id);
    e.variant=config.variant||({slime:'pouncer',wolf:'charger',bat:'nightwing',skeleton:'shieldguard',dragon:'dragon'})[e.type];
    if(!labels[e.variant])return e;
    if(Number.isFinite(config.y)&&e.type!=='bat')e.y=config.y;
    if(e.y<GROUND-8&&e.type!=='bat'){
      const platform=(this.stage.platforms||[]).find(q=>e.x>=q.x&&e.x<=q.x+q.w&&Math.abs(e.y-q.y)<5);
      if(platform){const margin=Math.min(27,platform.w*.25);e.lane={min:platform.x+margin,max:platform.x+platform.w-margin};laneClamp(this,e);}
    }
    e.name=config.name||labels[e.variant];e.brain={state:'approach',left:.7+(id%4)*.17,sequence:0,direction:1,hit:false};
    e.shield=3;e.shieldOpen=0;e.intent='';
    return e;
  };
  P._updateEnemy=function(e,dt){
    if(!e.brain||!labels[e.variant])return oldEnemy.call(this,e,dt);
    if(e.dormant)return;
    const p=this.player,b=e.brain,v=e.variant;
    e.hitFlash=Math.max(0,e.hitFlash-dt);e.knockback*=Math.max(0,1-dt*8);e.shieldOpen=Math.max(0,e.shieldOpen-dt);
    if(e.hp<=0){e.deadTimer+=dt;return;}
    if(e.stun>0){e.stun=Math.max(0,e.stun-dt);e.x+=e.knockback*dt;laneClamp(this,e);return;}
    if(Math.abs(p.x-e.x)>1100)return;
    e.phase+=dt;e.aimPlayerX=p.x;e.aimPlayerY=p.y-50;
    e.x+=e.knockback*dt;laneClamp(this,e);
    if(v==='dragon'){updateDragon(this,e,dt);return;}
    if(v==='nightwing'&&b.state!=='active')e.y=GROUND-125+Math.sin(e.phase*2.6)*24;
    b.left-=dt;
    if(b.state==='recover'){
      e.intent='破绽';e.tell=0;
      if(b.left<=0){b.state='approach';b.left=.25;}
      return;
    }
    if(b.state==='tell'){
      e.tell=Math.max(0,b.left);
      if(b.left>0)return;
      b.state='active';b.hit=false;b.sequence++;e.attack=.3;e.tell=0;
      if(v==='pouncer'){
        b.left=.5;b.duration=.5;b.startX=e.x;b.endX=clamp(b.aimX,Math.max(35,e.x-240),Math.min(this.worldWidth-55,e.x+240));e.intent='跳扑';
      }else if(v==='charger'){
        b.left=.42;e.intent='冲锋';
      }else if(v==='nightwing'){
        b.left=.58;b.duration=.58;b.startX=e.x;b.startY=e.y;b.endX=clamp(b.aimX,35,this.worldWidth-55);b.endY=b.aimY+12;e.intent='俯冲';
      }else if(v==='mushroom'){
        const dx=clamp(b.aimX-e.x,-470,470),t=.8;
        shot(this,e,'spore',dx/t,((GROUND-18)-(e.y-68)-.5*620*t*t)/t,{gravity:620,damage:8*e.damageScale,r:11});
        recover(e,1.25);e.intent='散播孢子';
      }else if(v==='archer'){
        const vx=b.direction*380,flight=Math.max(.2,Math.abs(b.aimX-e.x)/380);
        shot(this,e,'arrow',vx,clamp((b.aimY-(e.y-68)-.5*230*flight*flight)/flight,-180,160),{gravity:230,damage:12*e.damageScale});
        recover(e,.85);
      }else if(v==='shieldguard'){
        b.left=.24;e.intent='盾后横斩';
      }else if(v==='golem'){
        b.left=.25;e.intent='震地';
        for(const direction of [-1,1])field(this,{x:e.x+direction*28,y:GROUND,kind:'wave',direction,speed:250,tell:0,life:.95,r:22,damage:14*e.damageScale,color:'#e6c2a0'});
        if(b.sequence%2===0)field(this,{x:b.aimX,y:GROUND,kind:'rock',tell:.8,life:.25,r:55,damage:17*e.damageScale});
        this._burst(e.x,e.y,9,'#c4b395',110);
      }else if(v==='frostmage'||v==='embermage'){
        const fire=v==='embermage';
        if(b.sequence%2){
          field(this,{x:b.aimX,y:GROUND,kind:fire?'ember':'frost',tell:.72,life:.35,r:70,damage:14*e.damageScale,color:fire?'#f6ad77':'#a4e8ef'});
        }else{
          const a=Math.atan2(b.aimY-(e.y-68),b.aimX-e.x);
          for(const spread of [-.2,0,.2])shot(this,e,fire?'cinder':'ice',Math.cos(a+spread)*245,Math.sin(a+spread)*245,{damage:10*e.damageScale});
        }
        recover(e,1.15);
      }
      return;
    }
    if(b.state==='active'){
      if(v==='pouncer'){
        const t=1-clamp(b.left/b.duration,0,1);e.x=b.startX+(b.endX-b.startX)*t;e.y=GROUND-Math.sin(t*Math.PI)*105;
        strike(this,e,63,11,75);
        if(b.left<=0){e.y=GROUND;field(this,{x:e.x,y:GROUND,kind:'ring',tell:0,life:.35,r:85,damage:9*e.damageScale,color:'#bddd91'});recover(e,.85);}
      }else if(v==='charger'){
        e.x=clamp(e.x+b.direction*480*dt,35,this.worldWidth-55);strike(this,e,68,14,80);
        if(b.left<=0)recover(e,.9);
      }else if(v==='nightwing'){
        const t=1-clamp(b.left/b.duration,0,1);e.x=b.startX+(b.endX-b.startX)*t;e.y=b.startY+(b.endY-b.startY)*Math.sin(t*Math.PI);
        if(Math.abs(p.x-e.x)<40&&Math.abs((p.y-44)-e.y)<48&&!b.hit){this._damagePlayer(11*e.damageScale,b.direction*180,e.x);b.hit=true;}
        if(b.left<=0)recover(e,.95);
      }else if(v==='shieldguard'){
        strike(this,e,143,15);
        if(b.left<=0)recover(e,.85);
      }else if(v==='golem'&&b.left<=0)recover(e,1.35);
      return;
    }
    // Only approach states track the player; a telegraph locks its direction.
    const dx=p.x-e.x,dist=Math.abs(dx);e.facing=dx>=0?1:-1;e.intent='';
    if(v==='pouncer'){
      if(dist>165)e.x+=e.facing*42*dt;
      if(b.left<=0&&dist<430){e.intent='蓄力跳扑 · 离开落点';begin(e,'pounce',.52);}
    }else if(v==='mushroom'){
      if(b.left<=0&&dist<580){e.intent='孢子抛射 · 看落点';begin(e,'spore',.7);}
    }else if(v==='charger'){
      if(dist>330)e.x+=e.facing*105*dt;
      if(b.left<=0&&dist<390){e.intent='锁向冲锋 · 跳跃躲避';begin(e,'charge',.64);}
    }else if(v==='archer'){
      if(dist<210)e.x-=e.facing*82*dt;else if(dist>430)e.x+=e.facing*55*dt;
      if(b.left<=0&&dist<650){e.intent='拉弓 · 格挡或闪避';begin(e,'arrow',.62);}
    }else if(v==='shieldguard'){
      if(e.shieldOpen<=0&&e.shield<=0)e.shield=3;
      if(dist>100)e.x+=e.facing*48*dt;
      if(b.left<=0&&dist<175){e.intent='横斩 · 绕后或格挡';begin(e,'slash',.62);}
    }else if(v==='golem'){
      if(dist>230)e.x+=e.facing*28*dt;
      if(b.left<=0&&dist<480){e.intent='震地蓄力 · 起跳';begin(e,'slam',.9);}
    }else if(v==='frostmage'||v==='embermage'){
      if(dist<170)e.x-=e.facing*50*dt;else if(dist>490)e.x+=e.facing*30*dt;
      if(b.left<=0&&dist<680){e.intent=b.sequence%2?'散射 · 找弹道空隙':'落点锁定 · 离开光圈';begin(e,'cast',.72);}
    }else if(v==='nightwing'&&b.left<=0&&dist<500){e.intent='俯冲 · 起跳或格挡';begin(e,'dive',.65);}
    laneClamp(this,e);
  };
  function updateDragon(g,e,dt){
    const p=g.player,b=e.brain,phase=e.hp/e.maxHp<=.5?2:1;e.dragonPhase=phase;b.left-=dt;
    if(phase===2&&!b.enraged){b.enraged=true;g._floater(e.x,e.y-275,'第二阶段 · 烬翼苏醒','#ffcc8e',23);g.shake=Math.max(g.shake,4);recover(e,.8);return;}
    if(b.state==='recover'){e.intent=phase===2?'烬翼苏醒 · 寻找破绽':'喘息 · 反击时机';if(b.left<=0){b.state='approach';b.left=.15;}return;}
    if(b.state==='approach'){
      e.facing=p.x>=e.x?1:-1;
      if(b.left<=0&&Math.abs(p.x-e.x)<850){
        const sequence=phase===2?['meteor','fire','quake','lunge']:['fire','lunge','quake'];
        const move=sequence[b.sequence%sequence.length];b.sequence++;
        e.intent=({fire:'扇形吐息 · 从弹道间跳过',lunge:'锁向突袭 · 侧移或闪避',quake:'地面震波 · 跳起',meteor:'陨石落点 · 离开光圈'})[move];
        begin(e,move,phase===2?.8:1.0);
      }return;
    }
    if(b.state==='tell'){
      e.tell=Math.max(0,b.left);if(b.left>0)return;e.tell=0;
      if(b.move==='fire'){
        const mx=e.x+b.direction*94,my=e.y-126,a=Math.atan2(b.aimY-my,b.aimX-mx),count=phase===2?7:5;
        for(let i=0;i<count;i++){const angle=a+(i-(count-1)/2)*.15;g.projectiles.push({x:mx,y:my,vx:Math.cos(angle)*285,vy:Math.sin(angle)*285,r:10,life:3.2,damage:15,kind:'cinder',friendly:false});}
        recover(e,phase===2?1.05:1.5);
      }else if(b.move==='quake'){
        for(const direction of [-1,1])field(g,{x:e.x+direction*70,y:GROUND,kind:'wave',direction,speed:phase===2?320:260,tell:.12,life:1.55,r:24,damage:18,color:'#ffbd7c'});
        if(phase===2)field(g,{x:b.aimX,y:GROUND,kind:'ember',tell:.95,life:.35,r:60,damage:16});
        g.shake=Math.max(g.shake,5);recover(e,1.5);
      }else if(b.move==='meteor'){
        for(let i=-1;i<=1;i++)field(g,{x:clamp(b.aimX+i*165,70,g.worldWidth-70),y:GROUND,kind:'rock',tell:.8+Math.abs(i)*.17,life:.3,r:56,damage:18,color:'#f3b27b'});
        recover(e,1.7);
      }else{b.state='active';b.left=.48;b.duration=.48;b.startX=e.x;b.endX=clamp(b.aimX+b.direction*45,100,g.worldWidth-140);b.hit=false;}
      return;
    }
    if(b.state==='active'){
      const t=1-clamp(b.left/b.duration,0,1);e.x=b.startX+(b.endX-b.startX)*(1-Math.pow(1-t,2));strike(g,e,115,21,160);
      if(b.left<=0)recover(e,phase===2?1.1:1.6);
    }
  }
  P._damageEnemy=function(e,damage,knockback,impact=null){
    if(e.variant==='shieldguard'&&e.hp>0&&e.shieldOpen<=0&&e.brain?.state!=='recover'&&e.brain?.state!=='active'&&(this.player.x-e.x)*e.facing>-8){
      const heavy=damage>=this._stats().attack*1.7;
      e.shield-=heavy?3:1;
      if(e.shield<=0){e.shieldOpen=2;recover(e,1.05);this._floater(e.x,e.y-116,'破盾！','#ffe6a1',20);this._burst(e.x+e.facing*26,e.y-44,10,'#ddd5ad',150);}
      else{damage*=.45;knockback*=.25;this._floater(e.x,e.y-105,'盾挡 · 重击可破','#e3d29e',13);}
    }
    return oldDamage.call(this,e,damage,knockback,impact);
  };
  P._updateProjectiles=function(dt){
    for(const b of this.projectiles){
      if(b.gravity)b.vy+=b.gravity*dt;
      if(b.kind==='spore'&&b.y>=GROUND-13){field(this,{x:b.x,y:GROUND,kind:'poison',tell:.35,life:1.15,r:46,damage:9,color:'#bddb89'});b.life=0;}
    }
    this.projectiles=this.projectiles.filter(b=>b.life>0);
    oldProjectiles.call(this,dt);
    for(const h of this.enemyFields||[]){
      h.age+=dt;if(h.age<h.tell)continue;
      h.life-=dt;if(h.kind==='wave')h.x+=h.direction*h.speed*dt;
      const p=this.player,low=h.kind==='wave'||h.kind==='ring'||h.kind==='poison';
      if(!h.hit&&Math.abs(p.x-h.x)<h.r+14&&p.y>GROUND-(low?48:145)){
        this._damagePlayer(h.damage,p.x>=h.x?200:-200,h.x,false);h.hit=true;
      }
    }
    this.enemyFields=(this.enemyFields||[]).filter(h=>h.life>0&&h.x>0&&h.x<this.worldWidth).slice(-40);
  };
  function shape(c,fill,draw,stroke='#222b2c',width=2.5){c.fillStyle=fill;c.strokeStyle=stroke;c.lineWidth=width;c.beginPath();draw();c.fill();c.stroke();}
  function ellipse(c,x,y,rx,ry,fill){shape(c,fill,()=>c.ellipse(x,y,rx,ry,0,0,TAU));}
  function line(c,color,width,points){c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
  function eyes(c,x,y,color='#f2e1a6',angry=false){
    for(const side of [-1,1]){ellipse(c,x+side*8,y,4,angry?3:5,color);c.fillStyle='#182023';c.fillRect(x+side*8+1,y-3,2,6);}
  }
  function armor(c,x,y,w,h,color){shape(c,color,()=>{c.moveTo(x-w*.5,y);c.lineTo(x+w*.5,y);c.lineTo(x+w*.43,y+h);c.quadraticCurveTo(x,y+h+6,x-w*.43,y+h);c.closePath();});line(c,'#ffffff50',2,[[x-w*.32,y+4],[x+w*.3,y+4]]);}
  function bodyKnight(c,e,variant){
    const b=e.brain,t=e.phase,attack=b.state==='active',wind=b.state==='tell',color=variant==='archer'?'#697c60':variant==='shieldguard'?'#687e85':variant==='embermage'?'#9c5e50':'#6d8c9a';
    const stride=b.state==='approach'?Math.sin(t*9)*5:0;
    if(variant==='frostmage'||variant==='embermage'){
      const fire=variant==='embermage',glow=fire?'#f4b77d':'#a7e4ed';
      shape(c,color,()=>{c.moveTo(-17,-68);c.lineTo(18,-68);c.lineTo(28,-7);c.quadraticCurveTo(0,1,-28,-7);c.closePath();});
      line(c,glow,2,[[-10,-54],[-5,-25],[0,-16],[8,-36],[15,-56]]);
      shape(c,fire?'#6a3c42':'#384f68',()=>{c.moveTo(-24,-66);c.lineTo(0,-113);c.lineTo(26,-66);c.closePath();});
      ellipse(c,1,-71,14,13,'#c9d2c3');eyes(c,3,-72,glow);
      line(c,'#4c3834',6,[[27,-5],[27,-87]]);ellipse(c,27,-93,10,13,glow);
      if(wind){c.globalAlpha=.3+.15*Math.sin(t*15);ellipse(c,27,-93,18,22,glow);c.globalAlpha=1;}
      line(c,color,12,[[-12,-49],[-27,-33],[wind?-10:-20,wind?-68:-26]]);
      return;
    }
    line(c,'#323f45',10,[[-10,-28],[-16,-6+stride]]);line(c,'#323f45',10,[[10,-28],[17,-6-stride]]);
    armor(c,0,-65,39,37,color);ellipse(c,0,-83,18,19,'#dbd5bf');eyes(c,3,-83,'#f5d19a',true);
    if(variant==='archer'){
      shape(c,'#506752',()=>{c.moveTo(-20,-75);c.quadraticCurveTo(-27,-116,8,-108);c.quadraticCurveTo(26,-104,22,-73);c.lineTo(9,-97);c.lineTo(-8,-96);c.closePath();});
      line(c,'#8b6a4e',4,[[32,-88],[44,-68],[42,-43],[29,-25]]);line(c,'#d5cfaa',1,[[32,-88],[wind?13:32,-56],[29,-25]]);
      line(c,'#d7cbb4',5,[[-12,-55],[wind?-5:14,-56],[wind?11:28,-57]]);
      if(wind)line(c,'#e9d7a3',2,[[13,-56],[54,-56]]);
      line(c,'#384d44',8,[[-15,-58],[-26,-20]]);
    }else{
      armor(c,0,-101,43,19,'#82959b');c.fillStyle='#202d34';c.fillRect(-10,-91,27,5);
      line(c,'#809497',12,[[14,-55],[attack?47:28,attack?-40:wind?-87:-51]]);
      line(c,'#dfddd0',5,[[attack?47:28,attack?-40:wind?-87:-51],[attack?105:wind?21:54,attack?-39:wind?-138:-95]]);
      if(e.shieldOpen<=0){
        shape(c,'#384d60',()=>{c.moveTo(-13,-76);c.lineTo(20,-72);c.lineTo(25,-37);c.quadraticCurveTo(7,-14,-15,-31);c.closePath();},'#b9b08c',3);
        line(c,'#b7bd9d',3,[[4,-66],[5,-35]]);line(c,'#b7bd9d',3,[[-6,-51],[16,-49]]);
      }else{line(c,'#687d83',10,[[-14,-53],[-25,-33]]);}
    }
  }
  function drawBody(g,c,e){
    const v=e.variant,b=e.brain,t=e.phase,tell=b.state==='tell',active=b.state==='active';
    if(['archer','shieldguard','frostmage','embermage'].includes(v)){bodyKnight(c,e,v);return;}
    if(v==='pouncer'){
      const squat=tell?.79:1+Math.sin(t*4)*.04;c.scale(1/squat,squat);
      const grad=c.createLinearGradient(0,-61,0,0);grad.addColorStop(0,'#c5e2a1');grad.addColorStop(1,'#507f67');
      shape(c,grad,()=>{c.moveTo(-34,-5);c.bezierCurveTo(-44,-23,-24,-64,0,-61);c.bezierCurveTo(28,-66,48,-23,34,-5);c.quadraticCurveTo(0,4,-34,-5);c.closePath();});
      eyes(c,6,-26,'#ffedbd');line(c,'#e7f3ce',3,[[-24,-33],[-19,-44],[-9,-47]]);
      shape(c,'#779e58',()=>{c.moveTo(-7,-58);c.quadraticCurveTo(-16,-82,-28,-71);c.quadraticCurveTo(-23,-54,-7,-58);c.moveTo(-4,-60);c.quadraticCurveTo(3,-84,14,-77);c.quadraticCurveTo(17,-59,-4,-60);});
    }else if(v==='mushroom'){
      ellipse(c,0,-14,24,13,'#657c55');armor(c,0,-54,34,41,'#d7cda9');
      shape(c,tell?'#cb9470':'#a3695e',()=>{c.moveTo(-42,-53);c.bezierCurveTo(-36,-111,30,-120,43,-53);c.quadraticCurveTo(0,-36,-42,-53);c.closePath();});
      for(const [x,y,r] of [[-21,-69,8],[0,-87,10],[23,-64,7]])ellipse(c,x,y,r,r*.65,'#efe0bd');
      eyes(c,3,-35,'#1c302b');
      if(tell){line(c,'#99c578',5,[[-20,-22],[-32,-35]]);ellipse(c,-32,-38,7,7,'#bfd78b');}
    }else if(v==='charger'){
      const run=active?Math.sin(t*24)*12:Math.sin(t*8)*4;
      line(c,'#394c51',12,[[-29,-33],[-35,-7+run*.4]]);line(c,'#536c73',12,[[25,-34],[37,-5-run*.4]]);
      ellipse(c,-2,-36,42,24,'#758e92');armor(c,-8,-59,45,25,'#4f6573');
      shape(c,'#9aaca6',()=>{c.moveTo(19,-51);c.lineTo(16,-82);c.lineTo(33,-66);c.lineTo(41,-78);c.lineTo(48,-48);c.lineTo(68,-34);c.lineTo(49,-24);c.lineTo(27,-28);c.closePath();});
      line(c,'#536d74',13,[[-39,-43],[-59,-56],[-52,-72]]);ellipse(c,46,-47,4,3,active?'#ffcc78':'#f6e2a3');ellipse(c,65,-34,4,3,'#1b2b30');
      shape(c,'#e3d6b6',()=>{c.moveTo(48,-27);c.lineTo(51,-18);c.lineTo(56,-28);c.closePath();});
    }else if(v==='golem'){
      const l=active?7:tell?-9:0;
      armor(c,-19,-28,29,27,'#617873');armor(c,18,-28,30,27,'#536a68');
      shape(c,'#7d9590',()=>{c.moveTo(-35,-101);c.lineTo(30,-107);c.lineTo(42,-38);c.lineTo(-37,-33);c.closePath();},'#293e40',3);
      armor(c,0,-129,46,34,'#a1aea0');eyes(c,3,-112,'#b6edcd',true);
      armor(c,-45,-83+l,26,44,'#627e79');armor(c,44,-83+l,27,44,'#627e79');
      line(c,'#bce3c6',3,[[-12,-90],[1,-73],[-6,-58],[10,-46]]);line(c,'#314e4b',2,[[16,-99],[10,-81],[23,-65]]);
      for(const [x,y] of [[-29,-80],[28,-50],[-21,-32]])ellipse(c,x,y,6,3,'#91ab78');
    }else if(v==='nightwing'){
      const flap=Math.sin(t*(active?19:11))*17;
      for(const side of [-1,1])shape(c,'#5d4c79',()=>{c.moveTo(side*7,-8);c.quadraticCurveTo(side*28,-51-flap,side*66,-31-flap);c.lineTo(side*42,-9);c.lineTo(side*28,-19);c.lineTo(side*16,5);c.closePath();},'#282b40',2);
      ellipse(c,0,-9,17,24,'#8b77a3');
      shape(c,'#a492b0',()=>{c.moveTo(-15,-22);c.lineTo(-14,-47);c.lineTo(-3,-26);c.moveTo(6,-26);c.lineTo(17,-46);c.lineTo(16,-18);});eyes(c,0,-15,'#f4c683',true);
      line(c,'#b9a2c4',1,[[23,-21],[43,-31],[60,-31-flap]]);
    }
  }
  P._drawEnemy=function(c,e){
    if(!e.brain||!labels[e.variant])return oldDraw.call(this,c,e);
    if(e.x<this.camera-260||e.x>this.camera+1540)return;
    const b=e.brain,v=e.variant,color=colors[v];
    drawTelegraph(this,c,e);
    if(v==='dragon'){
      oldDraw.call(this,c,e);
      if(e.dragonPhase===2&&e.hp>0){c.save();c.globalAlpha=.6;c.strokeStyle='#e9a374';c.lineWidth=3;c.beginPath();c.moveTo(e.x-42,e.y-100);c.lineTo(e.x-15,e.y-75);c.lineTo(e.x+18,e.y-85);c.stroke();c.restore();}
    }else{
      c.save();c.translate(e.x,e.y);this._shadow(c,0,3,v==='golem'?43:v==='nightwing'?24:33,.23);c.scale(e.facing,1);
      if(e.hp<=0){c.globalAlpha=clamp(1-e.deadTimer/.38,0,1);c.translate(0,e.deadTimer*25);c.rotate(e.deadTimer*.6);}
      if(e.stun>0){c.translate(e.hitDirection*(-Math.min(4,e.stun*18)),0);c.rotate((e.hitDirection||1)*Math.sin(e.hitFlash*25)*.035);}
      if(e.elite)c.scale(1.12,1.12);
      if(b.state==='tell'&&v!=='nightwing')c.translate(Math.sin(e.phase*30)*.8,Math.sin(e.phase*18)*.5);
      if(!drawSprite(c,e))drawBody(this,c,e);c.restore();
    }
    if(e.hp>0){
      const y=e.y-(v==='dragon'?285:v==='golem'?166:v==='nightwing'?81:136),w=v==='dragon'?178:e.elite?80:64;
      this._text(c,e.name,e.x,y-8,v==='dragon'?15:11,color,'center');
      c.fillStyle='rgba(11,22,27,.85)';c.fillRect(e.x-w/2-1,y-1,w+2,7);c.fillStyle=b.state==='recover'?'#b9d7a2':color;c.fillRect(e.x-w/2,y,w*clamp(e.hp/e.maxHp,0,1),5);
      if(e.intent&&b.state!=='approach')this._text(c,e.intent,e.x,y-28,11,b.state==='tell'?'#ffd598':'#c3d9c0','center');
    }
  };
  function drawSprite(c,e){
    const species=spriteOrder.indexOf(e.variant);if(!enemyArt.ready||species<0)return false;
    const b=e.brain;
    let pose=b.state==='active'||b.state==='tell'&&b.left<b.tellMax*.65?1:0;
    if(e.variant==='nightwing'&&b.state!=='tell'&&b.state!=='active')pose=Math.sin(e.phase*10)>.2?1:0;
    const frame=enemyArt.cache[species*2+pose];if(!frame)return false;
    const width=({pouncer:111,mushroom:124,charger:158,archer:147,shieldguard:154,frostmage:145,embermage:145,golem:190,nightwing:158})[e.variant];
    c.save();
    if(e.variant==='pouncer'&&b.state==='tell'){const t=1-b.left/b.tellMax;c.scale(1+t*.09,1-t*.09);}
    if(e.variant==='charger'&&b.state==='active')c.rotate(Math.sin(e.phase*24)*.025);
    if(['frostmage','embermage','mushroom'].includes(e.variant))c.translate(0,Math.sin(e.phase*3)*1.2);
    if(e.hp<=0){const t=clamp(e.deadTimer/.38,0,1);c.translate(0,8*t);c.scale(1+t*.13,1-t*.25);}
    c.drawImage(frame,-width*.5,-width*.88,width,width);
    if(e.hitFlash>0&&enemyArt.flashCache?.[species*2+pose]){c.save();c.globalAlpha=Math.min(.78,e.hitFlash*7);c.drawImage(enemyArt.flashCache[species*2+pose],-width*.5,-width*.88,width,width);c.restore();}
    c.restore();return true;
  }
  function drawTelegraph(g,c,e){
    const b=e.brain;if(e.hp<=0||b.state!=='tell')return;
    const progress=1-clamp(b.left/b.tellMax,0,1);c.save();c.strokeStyle='#f6bf82';c.fillStyle='rgba(244,174,112,.16)';c.lineWidth=2;
    if(e.variant==='charger'||(e.variant==='dragon'&&b.move==='lunge')){
      const length=e.variant==='dragon'?Math.abs(b.aimX-e.x)+120:250,x=b.direction>0?e.x:e.x-length;
      c.fillRect(x,GROUND-7,length,8);c.setLineDash([9,7]);c.strokeRect(x,GROUND-7,length,8);c.setLineDash([]);
      c.beginPath();c.moveTo(e.x+b.direction*length,GROUND-5);c.lineTo(e.x+b.direction*(length-15),GROUND-16);c.moveTo(e.x+b.direction*length,GROUND-5);c.lineTo(e.x+b.direction*(length-15),GROUND+5);c.stroke();
    }else if(e.variant==='pouncer'||e.variant==='nightwing'){
      c.beginPath();c.ellipse(b.aimX,GROUND,47+progress*14,10,0,0,TAU);c.fill();c.stroke();
    }else if(e.variant==='archer'){
      c.globalAlpha=.55;c.setLineDash([7,8]);c.beginPath();c.moveTo(e.x+b.direction*30,e.y-67);c.lineTo(b.aimX,b.aimY);c.stroke();c.setLineDash([]);
    }else if(e.variant==='golem'){
      c.beginPath();c.ellipse(e.x,GROUND,100+progress*36,12,0,0,TAU);c.fill();c.stroke();
    }else if(e.variant==='frostmage'||e.variant==='embermage'||e.variant==='mushroom'||b.move==='meteor'){
      c.beginPath();c.ellipse(b.aimX,GROUND,56,11,0,0,TAU);c.fill();c.stroke();
    }else if(e.variant==='shieldguard'){
      c.beginPath();c.ellipse(e.x+b.direction*72,GROUND-42,60,37,0,-Math.PI*.5,Math.PI*.5);c.stroke();
    }
    c.restore();
  }
  P._drawTerrain=function(c){
    oldTerrain.call(this,c);
    for(const h of this.enemyFields||[]){
      if(h.x<this.camera-160||h.x>this.camera+1440)continue;
      c.save();const ready=h.age>=h.tell,t=ready?1:clamp(h.age/h.tell,0,1);c.strokeStyle=h.color;c.fillStyle=h.color;c.lineWidth=2;c.globalAlpha=ready?.7:.28;
      c.beginPath();c.ellipse(h.x,GROUND,h.r,11,0,0,TAU);c.fill();c.globalAlpha=.9;c.stroke();
      if(!ready){c.globalAlpha=.65;c.beginPath();c.arc(h.x,GROUND-3,h.r*.72,-Math.PI*.5,-Math.PI*.5+TAU*t);c.stroke();}
      else if(h.kind==='wave'||h.kind==='ring'){c.lineWidth=5;c.beginPath();c.ellipse(h.x,GROUND-10,h.kind==='ring'?h.r*(1-h.life/.35):h.r,19,0,Math.PI,TAU);c.stroke();}
      else if(h.kind==='frost'||h.kind==='ember'||h.kind==='rock'){
        for(let i=-1;i<=1;i++)shape(c,h.color,()=>{c.moveTo(h.x+i*24-12,GROUND);c.lineTo(h.x+i*24,GROUND-(h.kind==='rock'?90:75)+Math.abs(i)*15);c.lineTo(h.x+i*24+13,GROUND);c.closePath();},h.color,1);
      }else{c.globalAlpha=.25;for(let i=0;i<4;i++){c.beginPath();c.arc(h.x-h.r*.65+i*h.r*.43,GROUND-10-((this.time*24+i*13)%35),5+i%2*3,0,TAU);c.fill();}}
      c.restore();
    }
  };
  P._drawProjectile=function(c,b){
    if(!['arrow','spore','ice','cinder'].includes(b.kind))return oldProjectileDraw.call(this,c,b);
    c.save();c.translate(b.x,b.y);c.rotate(Math.atan2(b.vy,b.vx));
    if(b.kind==='arrow'){
      line(c,'#e1d3af',3,[[-18,0],[11,0]]);shape(c,'#c8dfd3',()=>{c.moveTo(14,0);c.lineTo(5,-5);c.lineTo(7,0);c.lineTo(5,5);c.closePath();});line(c,'#a4b992',2,[[-17,-5],[-10,0],[-17,5]]);
    }else if(b.kind==='spore'){
      ellipse(c,0,0,11,9,'#c4d992');ellipse(c,-3,-3,3,2,'#f1edc6');
    }else if(b.kind==='ice'){
      shape(c,'#c7f1f2',()=>{c.moveTo(16,0);c.lineTo(-9,-7);c.lineTo(-5,0);c.lineTo(-9,7);c.closePath();},'#6eabbc',2);
    }else{
      shape(c,'#edb074',()=>{c.moveTo(12,0);c.bezierCurveTo(4,-12,-11,-3,-23,-5);c.quadraticCurveTo(-11,11,6,7);c.closePath();},'#a75847',1.5);ellipse(c,2,0,5,4,'#ffedb6');
    }
    c.restore();
  };
  window.KnightEnemyVariety={version:2,variants:Object.keys(labels),art:enemyArt};
})();
