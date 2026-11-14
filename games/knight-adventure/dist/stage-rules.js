/* Region-specific traversal and hazards. Coordinates are in world space. */
(function () {
  'use strict';
  const GROUND=590,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const list=g=>Array.isArray(g.stage?.obstacles)?g.stage.obstacles:[];
  const visible=(g,o,pad=180)=>o.x+o.w+pad>g.camera&&o.x-pad<g.camera+1280;
  function state(g){
    if(!g.stageRuleState||g.stageRuleState.player!==g.player)g.stageRuleState={player:g.player,clock:0,hits:new Map(),spring:new Map(),lastGap:null};
    return g.stageRuleState;
  }
  function phase(t,o){
    const period=o.period||4,cycle=((t+(o.offset||0))%period+period)%period;
    const warn=period-1.45,active=period-.65;
    return {cycle,period,warning:cycle>=warn&&cycle<active,active:cycle>=active,progress:clamp((cycle-active)/.65,0,1)};
  }
  function floorAt(g,x){return list(g).some(o=>o.kind==='gap'&&x>o.x+3&&x<o.x+o.w-3)?null:GROUND;}
  function hurt(g,s,key,damage,x,push=160){
    if((s.hits.get(key)||0)>s.clock||g.player.invuln>0)return;
    s.hits.set(key,s.clock+.95);g._damagePlayer?.(damage,g.player.x<x?-push:push,x,false);
  }
  function pendulum(t,o){const a=Math.sin((t+(o.offset||0))/(o.period||3.8)*Math.PI*2)*.9;return {x:o.x+Math.sin(a)*178,y:GROUND-205+Math.cos(a)*178,a};}
  function rock(t,o){const p=phase(t,o);return {phase:p,x:o.x+o.w*.5,y:GROUND-380+Math.min(1,p.progress)*400};}
  function boulder(t,o){const p=phase(t,o);return {phase:p,x:o.x+(p.active?p.progress:0)*o.w,y:GROUND-23};}
  function update(g,dt){
    if(!g.player||g.dead||g.won)return;
    const s=state(g),p=g.player;s.clock+=Math.max(0,dt);g.stageEnvironment={windX:0,slippery:false,drag:1};
    const env=g.stageEnvironment;
    for(const q of g.platforms||[]){
      if(!q.motion)continue;const m=q.motion,axis=m.axis||'y',prev=q[axis],t=(1-Math.cos(s.clock/(m.period||5)*Math.PI*2))*.5;
      q[axis]=m.from+(m.to-m.from)*t;
      if(p.onGround&&Math.abs(p.y-(axis==='y'?prev:q.y))<5&&p.x>q.x-15&&p.x<q.x+q.w+15){p[axis]+=q[axis]-prev;}
    }
    for(const [i,o] of list(g).entries()){
      const inside=p.x+15>o.x&&p.x-15<o.x+o.w,feet=p.y>GROUND-34&&p.y<GROUND+30,key=o.kind+'-'+i;
      if(o.kind==='gap'){
        if(inside&&p.y>GROUND+120)s.lastGap=o;
        continue;
      }
      if(o.kind==='ice'&&inside&&feet)env.slippery=true;
      if(o.kind==='puddle'&&inside&&feet)env.drag=Math.min(env.drag,.72);
      if(o.kind==='gust'&&inside){const strength=(o.strength||150)*(.3+.7*Math.max(0,Math.sin(s.clock/(o.period||5)*Math.PI*2)));env.windX+=strength;}
      if(o.kind==='spring'&&inside&&p.onGround&&Math.abs(p.y-GROUND)<8&&(s.spring.get(key)||0)<s.clock){
        p.vy=-(o.power||745);p.onGround=false;p.jumps=1;p.jumpClock=0;p.coyote=0;s.spring.set(key,s.clock+.65);g._burst?.(p.x,GROUND-12,9,'#d6e4a4',100);g._sound?.('jump');
      }
      if(o.kind==='updraft'&&inside&&p.y>260){
        p.vy=Math.min(p.vy,p.onGround?-620:-310);p.onGround=false;p.jumps=Math.max(1,p.jumps);p.coyote=0;
      }
      if((o.kind==='poison'||o.kind==='lava')&&inside&&feet)hurt(g,s,key,o.kind==='lava'?12:7,o.x+o.w*.5,110);
      if(o.kind==='vent'||o.kind==='runeBeam'){
        const ph=phase(s.clock,o),height=o.kind==='vent'?155:205;
        if(ph.active&&inside&&p.y>GROUND-height&&p.y<GROUND+25)hurt(g,s,key,o.kind==='vent'?16:14,o.x+o.w*.5);
      }
      if(o.kind==='pendulum'){
        const b=pendulum(s.clock,o),cy=p.y-(g.mount?.state==='mounted'?100:52);
        if(Math.hypot(p.x-b.x,cy-b.y)<46)hurt(g,s,key,13,b.x);
      }
      if(o.kind==='rockfall'){
        const b=rock(s.clock,o),cy=p.y-50;
        if(b.phase.active&&Math.abs(p.x-b.x)<42&&Math.abs(cy-b.y)<62)hurt(g,s,key,16,b.x,100);
      }
      if(o.kind==='boulder'){
        const b=boulder(s.clock,o);
        if(b.phase.active&&Math.abs(p.x-b.x)<43&&p.y>GROUND-75)hurt(g,s,key,15,b.x,230);
      }
    }
    if(p.y>790){
      const gap=s.lastGap||list(g).filter(o=>o.kind==='gap').sort((a,b)=>Math.abs(p.x-a.x)-Math.abs(p.x-b.x))[0];
      const safe=gap?(p.vx<0?gap.x+gap.w+55:gap.x-55):g.adventure?.checkpointX||140;
      hurt(g,s,'fall',Math.max(15,Math.round((g._stats?.().maxHp||100)*.14)),p.x,0);
      if(!g.dead){p.x=clamp(safe,35,g.worldWidth-80);p.y=GROUND;p.vx=0;p.vy=0;p.onGround=true;p.jumps=0;p.invuln=Math.max(.8,p.invuln||0);g._burst?.(p.x,p.y-20,10,'#ddd3bc',80);}
      s.lastGap=null;
    }
  }
  function label(c,text,x,y,color){c.font='600 13px "Microsoft YaHei",sans-serif';c.textAlign='center';c.fillStyle='rgba(13,24,31,.8)';c.fillRect(x-90,y-17,180,25);c.fillStyle=color||'#e9e4c5';c.fillText(text,x,y);}
  function glow(c,x,y,r,color){const a=c.createRadialGradient(x,y,0,x,y,r);a.addColorStop(0,color);a.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=a;c.fillRect(x-r,y-r,r*2,r*2);}
  function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
  function draw(g,c){
    const s=state(g),t=s.clock,p=g.player,theme=g.stage.theme;
    c.save();
    for(const o of list(g)){
      if(!visible(g,o))continue;const near=Math.abs(p.x-o.x-o.w*.5)<o.w*.5+220,ph=phase(t,o);
      if(o.kind==='gap'){
        const grad=c.createLinearGradient(0,GROUND-4,0,720);grad.addColorStop(0,theme==='sky'?'#93adc7':'#15232b');grad.addColorStop(1,theme==='sky'?'#536d8e':'#060e17');c.fillStyle=grad;c.fillRect(o.x,GROUND-2,o.w,150);
        c.strokeStyle=theme==='sky'?'#d9e1de':'#a2a298';c.lineWidth=5;c.beginPath();c.moveTo(o.x-13,GROUND);c.lineTo(o.x,GROUND);c.lineTo(o.x+5,GROUND+23);c.moveTo(o.x+o.w-5,GROUND+23);c.lineTo(o.x+o.w,GROUND);c.lineTo(o.x+o.w+13,GROUND);c.stroke();
        if(theme!=='sky'){c.strokeStyle='#625c55';c.lineWidth=3;for(let i=0;i<3;i++){c.beginPath();c.moveTo(o.x+10+i*12,GROUND+10);c.lineTo(o.x+15+i*9,GROUND+40+i*8);c.stroke();}}
        if(near&&p.onGround)label(c,'缺口 · 二段跳跨越',o.x+o.w*.5,GROUND-104,'#e4d5b6');
      }else if(['puddle','ice','poison','lava'].includes(o.kind)){
        const ice=o.kind==='ice',hot=o.kind==='lava',poison=o.kind==='poison';
        const color=ice?'#9ecedb':hot?'#e87935':poison?'#7d9f4c':'#527b86';
        ellipse(c,o.x+o.w*.5,GROUND+3,o.w*.53,ice?6:9,color);
        c.strokeStyle=ice?'#d4f4f4':hot?'#f9c779':poison?'#c0d17b':'#91afac';c.lineWidth=1.2;
        for(let i=0;i<Math.floor(o.w/42);i++){const x=o.x+18+i*42,y=GROUND+Math.sin(t*2+i)*2;c.beginPath();c.moveTo(x,y);c.lineTo(x+22,y-2);c.stroke();if(hot||poison)ellipse(c,x+8,GROUND-4-Math.sin(t*2+i)*3,3,2,color);}
        if(hot)glow(c,o.x+o.w*.5,GROUND-8,o.w*.6,'rgba(235,115,44,.14)');
        if(near)label(c,ice?'冰面 · 提前刹车':hot?'熔流 · 踩岩台通过':poison?'毒沼 · 离开地面':'浅水 · 速度降低',o.x+o.w*.5,GROUND-72,color);
      }else if(o.kind==='spring'){
        const squash=(s.spring.get(o.kind+'-'+list(g).indexOf(o))||0)>t?5:0;
        c.fillStyle='#6b7754';c.fillRect(o.x+o.w*.4,GROUND-26+ squash,13,27);ellipse(c,o.x+o.w*.5,GROUND-27+squash,o.w*.48,18-squash*.3,'#91b99a');ellipse(c,o.x+o.w*.5,GROUND-32+squash,o.w*.38,8,'#c5dfa0');
        glow(c,o.x+o.w*.5,GROUND-31,40,'rgba(200,231,150,.2)');if(near)label(c,'发光菌盖 · 踩踏弹跳',o.x+o.w*.5,GROUND-81,'#c9e3aa');
      }else if(o.kind==='gust'||o.kind==='updraft'){
        const up=o.kind==='updraft',color=up?'#b9e5ed':'#d1dfe9',strength=(o.strength||150)>=0?1:-1;
        c.save();c.globalAlpha=up?.34:.22;c.strokeStyle=color;c.lineWidth=2;
        for(let i=0;i<(up?6:9);i++){const x=o.x+(i*103+t*(up?8:90*strength)+o.w*20)%o.w,y=GROUND-25-((i*79+t*(up?105:5))%250);c.beginPath();if(up){c.moveTo(x,y+24);c.quadraticCurveTo(x+14,y+2,x,y-23);c.moveTo(x-5,y-14);c.lineTo(x,y-23);c.lineTo(x+5,y-14);}else{c.moveTo(x-26*strength,y);c.quadraticCurveTo(x,y-10,x+24*strength,y);c.moveTo(x+15*strength,y-5);c.lineTo(x+24*strength,y);c.lineTo(x+15*strength,y+5);}c.stroke();}c.restore();
        if(up){ellipse(c,o.x+o.w*.5,GROUND-2,o.w*.55,10,'rgba(171,216,236,.4)');if(near)label(c,'上升气流 · 横移离开',o.x+o.w*.5,GROUND-290,color);}
      }else if(o.kind==='pendulum'){
        const b=pendulum(t,o);c.strokeStyle='#3b3d43';c.lineWidth=5;c.beginPath();c.moveTo(o.x,GROUND-205);c.lineTo(b.x,b.y);c.stroke();c.strokeStyle='#b3aaa0';c.lineWidth=1;c.beginPath();c.moveTo(o.x+2,GROUND-205);c.lineTo(b.x+2,b.y);c.stroke();
        c.fillStyle='#68747b';c.strokeStyle='#c6c5b5';c.lineWidth=2;c.beginPath();for(let i=0;i<8;i++){const a=i/8*Math.PI*2;const x=b.x+Math.cos(a)*(i%2?20:29),y=b.y+Math.sin(a)*(i%2?20:29);i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.fill();c.stroke();ellipse(c,b.x,b.y,7,7,'#c5bb9e');ellipse(c,b.x,GROUND+1,31,5,'rgba(0,0,0,.3)');
        if(near)label(c,'摆锤回廊 · 看准空隙',o.x,GROUND-242,'#d3c2aa');
      }else if(o.kind==='rockfall'){
        const b=rock(t,o);c.strokeStyle='#8c897d';c.lineWidth=2;c.beginPath();c.moveTo(b.x-35,GROUND-360);c.lineTo(b.x-12,GROUND-335);c.lineTo(b.x+2,GROUND-362);c.lineTo(b.x+27,GROUND-340);c.stroke();
        if(ph.warning){ellipse(c,b.x,GROUND,37+Math.sin(t*20)*5,8,'rgba(237,183,105,.4)');label(c,'落石预警',b.x,GROUND-78,'#f0cc8d');}
        if(ph.active){ellipse(c,b.x,GROUND,40,8,'rgba(224,175,104,.2)');c.fillStyle='#8e8290';c.strokeStyle='#ccc0b6';c.lineWidth=2;c.beginPath();c.moveTo(b.x-24,b.y-11);c.lineTo(b.x-9,b.y-29);c.lineTo(b.x+20,b.y-19);c.lineTo(b.x+29,b.y+8);c.lineTo(b.x+4,b.y+25);c.lineTo(b.x-25,b.y+13);c.closePath();c.fill();c.stroke();}
      }else if(o.kind==='boulder'){
        const b=boulder(t,o);c.strokeStyle='#806d62';c.lineWidth=3;c.beginPath();c.moveTo(o.x,GROUND-8);c.lineTo(o.x+o.w,GROUND-8);c.stroke();
        if(ph.warning){c.fillStyle='rgba(231,164,105,.2)';c.fillRect(o.x,GROUND-4,o.w,8);if(near)label(c,'滚石将至 · 跳跃躲避',o.x+o.w*.5,GROUND-85,'#e5c093');}
        if(ph.active){ellipse(c,b.x,b.y,26,26,'#8c7c74');c.strokeStyle='#c7b396';c.lineWidth=3;c.beginPath();c.arc(b.x,b.y,22,t*10,t*10+Math.PI*1.4);c.stroke();}
      }else if(o.kind==='vent'||o.kind==='runeBeam'){
        const rune=o.kind==='runeBeam',color=rune?'#c2a4ee':'#f3ad69';c.fillStyle=rune?'#6c587e':'#5e4540';c.fillRect(o.x,GROUND-7,o.w,10);
        if(ph.warning){c.globalAlpha=.3+Math.sin(t*20)*.15;c.fillStyle=color;c.fillRect(o.x,GROUND-10,o.w,14);c.globalAlpha=1;if(near)label(c,rune?'符文将亮 · 等暗区通过':'喷口预警 · 先避开',o.x+o.w*.5,GROUND-95,color);}
        if(ph.active){const h=rune?205:155;const grad=c.createLinearGradient(0,GROUND-h,0,GROUND);grad.addColorStop(0,rune?'rgba(194,164,238,.05)':'rgba(245,155,85,0)');grad.addColorStop(.4,rune?'rgba(194,164,238,.45)':'rgba(245,155,85,.55)');grad.addColorStop(1,color);c.fillStyle=grad;c.fillRect(o.x,GROUND-h,o.w,h);c.strokeStyle=color;c.lineWidth=rune?2:3;for(let i=1;i<4;i++){c.beginPath();c.moveTo(o.x+o.w*i/4,GROUND);c.bezierCurveTo(o.x+o.w*i/4+Math.sin(t*13+i)*12,GROUND-h*.3,o.x+o.w*i/4-9,GROUND-h*.7,o.x+o.w*i/4,GROUND-h);c.stroke();}}
      }
    }
    // Region-specific platform supports make alternate routes legible.
    for(const q of g.platforms||[]){
      if(q.x+q.w<g.camera-60||q.x>g.camera+1340)continue;
      if(theme==='forest'){
        c.strokeStyle='#536c52';c.lineWidth=7;c.beginPath();c.moveTo(q.x+18,q.y+20);c.quadraticCurveTo(q.x+q.w*.5,q.y+48,q.x+q.w-9,q.y+13);c.stroke();c.fillStyle='#7ca271';for(let i=0;i<4;i++)ellipse(c,q.x+25+i*(q.w-40)/4,q.y+23+(i%2)*5,13,4,'#7ca271');
      }else if(q.motion){
        c.strokeStyle='#675a68';c.lineWidth=3;c.beginPath();c.moveTo(q.x+14,290);c.lineTo(q.x+14,GROUND);c.moveTo(q.x+q.w-14,290);c.lineTo(q.x+q.w-14,GROUND);c.stroke();c.strokeStyle='#ad92bd';c.lineWidth=2;c.strokeRect(q.x-4,q.y-3,q.w+8,28);if(Math.abs(p.x-q.x-q.w*.5)<170)label(c,'升降矿台',q.x+q.w*.5,q.y-26,'#d0b2e6');
      }else if(theme==='sky'){
        for(let i=0;i<3;i++)ellipse(c,q.x+q.w*(i+1)/4,q.y+28,q.w*.27,12,'rgba(209,226,234,.3)');
      }
    }
    c.restore();
  }
  window.KnightStageRules={update,draw,floorAt};
})();
