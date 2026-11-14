/* QA pilot uses ordinary inputs and earned equipment only; no HP/damage injection or stage skips. */
(function(root){
  'use strict';
  class CampaignPilot{
    constructor(){this.stageId=null;this.lastJump=-10;this.frame=0;}
    controls(g,a){for(const action of ['left','right','attack','jump','dash','combo','interact','throw','guard'])g.setInput(action,!!a[action]);}
    step(g,frame){
      const tick=Number.isFinite(frame)?frame:this.frame++,now=tick/60,p=g.player;
      if(g.paused||g.dead||g.won||!g.adventure){this.controls(g,{});return {kind:'inactive'};}
      if(this.stageId!==g.stage.id){this.stageId=g.stage.id;this.lastJump=-10;}
      const a={},adv=g.adventure,s=g.getState(),alive=g.enemies.filter(e=>e.hp>0&&!e.dormant);
      let target=null,kind='travel',destination={x:g.stage.portalX,y:590},wantJump=false;
      if(alive.length){
        target=alive.sort((x,y)=>Math.abs(x.x-p.x)+Math.abs(x.y-p.y)*.4-Math.abs(y.x-p.x)-Math.abs(y.y-p.y)*.4)[0];kind='combat';
        const dx=target.x-p.x,dy=p.y-target.y,dir=Math.sign(dx)||p.facing;
        const desired=target.type==='dragon'?120:65;
        destination={x:target.x-dir*desired,y:target.y};
        if(dy>110&&target.type!=='bat'){
          const options=(g.platforms||[]).filter(q=>q.y<p.y-35&&q.y>=p.y-215&&q.x+q.w>p.x-350&&q.x<p.x+350);
          options.sort((a,b)=>Math.abs(a.x+a.w*.5-target.x)+Math.abs(a.y-target.y)-Math.abs(b.x+b.w*.5-target.x)-Math.abs(b.y-target.y));
          const q=options[0];if(q)destination={x:q.x+q.w*.5,y:q.y};
          wantJump=(p.onGround||p.jumps===1&&p.vy>-200)&&Math.abs(destination.x-p.x)<195;
        }
        if(Math.abs(dx)<(target.type==='dragon'?265:190)&&Math.abs(dy)<105){a.attack=true;a.combo=s.comboEnergy>=100;}
        if((Math.abs(dx)>160||Math.abs(dy)>95)&&Math.hypot(dx,dy)<490&&s.ranged?.canThrow&&p.facing===dir)a.throw=tick%3===0;
        const tell=target.brain?.state==='tell'&&target.brain.left<.25||target.tell>0&&target.tell<.25;
        if(tell&&Math.abs(dx)<260)wantJump=wantJump||p.onGround||p.jumps===1&&p.vy>-180;
        if(target.type==='bat'&&Math.abs(dx)<260)wantJump=wantJump||p.onGround||p.jumps===1&&p.vy>-180;
        const incoming=g.projectiles.some(b=>!b.friendly&&Math.abs(b.x-p.x)<110&&Math.abs(b.y-(p.y-50))<90);
        if(incoming&&p.onGround)wantJump=true;
        if(incoming&&p.dashCooldown<=0&&p.invuln<=0)a.dash=true;
        if((g.enemyFields||[]).some(f=>Math.abs(f.x-p.x)<(f.r||75)+50&&(f.tell||0)<.3))wantJump=wantJump||p.onGround||p.jumps===1&&p.vy>-150;
      }else{
        const next=adv.encounters.find(e=>!adv.clearedEncounters.has(e.id));if(next)destination={x:next.x+30,y:590};
        else if(Math.abs(destination.x-p.x)<85&&Math.abs(p.y-590)<65)a.interact=tick%10===0;
      }
      const dx=destination.x-p.x,dir=Math.sign(dx)||p.facing;
      a.left=dx<-18;a.right=dx>18;
      // When above a grounded target, walk off the closest platform edge first.
      if(destination.y-p.y>100&&p.onGround){
        const q=g.platforms.find(q=>Math.abs(q.y-p.y)<4&&p.x>q.x-19&&p.x<q.x+q.w+19);
        if(q){const edge=p.x-q.x<q.x+q.w-p.x?-1:1;a.left=edge<0;a.right=edge>0;}
      }
      const nextObstacle=(g.stage.obstacles||[]).find(o=>['gap','poison','lava','vent','runeBeam','pendulum','rockfall','boulder'].includes(o.kind)&&(dir>0?o.x+o.w>p.x-25&&o.x-p.x<135:o.x<p.x+25&&p.x-o.x-o.w<135));
      if(nextObstacle){
        const hazardous=nextObstacle.kind==='gap'||nextObstacle.kind==='poison'||nextObstacle.kind==='lava'||nextObstacle.kind==='pendulum'||['vent','runeBeam','rockfall','boulder'].includes(nextObstacle.kind);
        if(hazardous&&p.onGround)wantJump=true;
        if(hazardous&&p.jumps===1&&p.vy>-150&&p.x>nextObstacle.x-80&&p.x<nextObstacle.x+nextObstacle.w+80)wantJump=true;
      }
      if(g.hazards?.some(h=>Math.abs(h.x-p.x)<120&&h.tell<.5))wantJump=wantJump||p.onGround||p.jumps===1&&p.vy>-200;
      a.jump=wantJump&&now-this.lastJump>.14;if(a.jump)this.lastJump=now;
      this.controls(g,a);return {kind,destination,targetId:target?.id,actions:a};
    }
  }
  root.CampaignPilot=CampaignPilot;if(typeof module==='object'&&module.exports)module.exports=CampaignPilot;
})(typeof window!=='undefined'?window:globalThis);
