/* QA pilot: reads the running game and presses ordinary controls only.
   It never advances time, skips a stage, modifies stats, or handles UI panels. */
(function(root){
  'use strict';
  class CampaignPilot{
    constructor(){this.frame=0;this.lastJump=-10;this.escapeUntil=-1;this.escapeDirection=1;this.stageId=null;this.wasInactive=false;}
    controls(game,actions){for(const action of ['left','right','attack','jump','dash','combo','interact'])game.setInput(action,!!actions[action]);}
    step(game,frame){
      const tick=Number.isFinite(frame)?frame:this.frame++,now=tick/60;
      if(game.paused||game.dead||game.won||!game.adventure){this.controls(game,{});this.wasInactive=true;return{kind:game.dead?'dead':game.won?'won':'paused'};}
      if(this.stageId!==game.stage.id||this.wasInactive){this.stageId=game.stage.id;this.lastJump=-10;this.escapeUntil=-1;this.wasInactive=false;}
      const s=game.getState(),p=game.player,a=game.adventure,actions={};
      const alive=game.enemies.filter(enemy=>enemy.hp>0&&!enemy.dormant);
      let destination=null,kind='travel',target=null;
      const pulseJump=want=>{const fire=want&&now-this.lastJump>.08;if(fire)this.lastJump=now;return fire;};
      if(alive.length){
        target=alive.sort((x,y)=>Math.abs(x.x-p.x)-Math.abs(y.x-p.x))[0];
        const dx=target.x-p.x,desired=target.type==='dragon'?145:105;
        destination={x:target.x-Math.sign(dx||1)*desired,y:590};kind='combat';
        if(Math.abs(dx)>desired+13||p.facing!==Math.sign(dx||1)){actions.left=dx<0;actions.right=dx>0;}
        actions.attack=Math.abs(dx)<(target.type==='dragon'?260:190);actions.combo=s.comboEnergy>=100;
        if(p.y<515&&target.type!=='bat'&&p.onGround){const right=a.encounters.find(item=>item.id===a.activeEncounter)?.arena[1]||game.worldWidth;actions.right=p.x<right-90;actions.left=!actions.right;}
        const tell=target.tell>0&&target.tell<.3;
        let jump=tell&&p.jumps<2;
        if(target.type==='dragon'&&p.onGround&&tick%110<2)jump=true;
        const groundThreat=game.hazards.some(h=>Math.abs(h.x-p.x)<90&&(h.tell<=.6||h.tell<=0));
        if(groundThreat&&p.jumps<2)jump=true;
        if(p.jumps===1&&p.vy>-200&&(groundThreat||target.type==='dragon'))jump=true;
        actions.jump=pulseJump(jump);
        const incoming=game.projectiles.some(b=>!b.friendly&&Math.abs(b.x-p.x)<75&&Math.abs(b.y-(p.y-36))<60);
        actions.dash=p.dashCooldown<=0&&p.invuln<=0&&(incoming||(tell&&target.type==='dragon'&&target.action==='lunge'));
      }else{
        const items=[...a.relicItems.filter(item=>!a.relics.has(item.id)).map(item=>({...item,kind:'relic'})),...a.beaconItems.filter(item=>!a.beacons.has(item.id)).map(item=>({...item,kind:'beacon'})),...a.checkpointItems.filter(item=>!a.checkpointIds.has(item.id)).map(item=>({...item,kind:'checkpoint'})),...a.chestItems.filter(item=>!a.chests.has(item.id)).map(item=>({...item,kind:'chest'}))];
        const next=a.encounters.find(item=>!a.clearedEncounters.has(item.id));if(next)items.push({x:next.x-130,y:590,kind:'encounter'});
        items.sort((x,y)=>Math.abs(x.x-p.x)-Math.abs(y.x-p.x));destination=items[0]||{x:game.stage.portalX||game.worldWidth-160,y:590,kind:'exit'};kind=destination.kind;
        const dx=destination.x-p.x;actions.left=dx<-12;actions.right=dx>12;
        if(['beacon','checkpoint','chest','exit'].includes(kind)&&Math.abs(dx)<65&&Math.abs(p.y-destination.y)<68)actions.interact=tick%10===0;
        let jump=false;
        if(kind==='chest'&&destination.y<p.y-70&&Math.abs(dx)<170&&(p.onGround||p.jumps===1&&p.vy>-230))jump=true;
        const direction=Math.sign(dx||1),hazard=a.hazards.find(h=>direction>0?h.x+h.w>p.x-15&&h.x-p.x<140:h.x<p.x+15&&p.x-h.x-h.w<140);
        const landingAtGroundTarget=destination.y>=580&&Math.abs(dx)<280&&kind!=='encounter'&&kind!=='exit';
        if(hazard&&!landingAtGroundTarget&&direction*(hazard.x+hazard.w*.5-p.x)>-hazard.w*.5&&(p.onGround||p.jumps===1&&p.vy>-200))jump=true;
        if(destination.y>=580&&p.y<515&&p.onGround&&Math.abs(dx)<55){actions.right=true;actions.left=false;}
        actions.jump=pulseJump(jump);
      }
      if(destination?.y>=580&&p.y<515&&p.onGround&&Math.abs(destination.x-p.x)<180&&now>=this.escapeUntil){
        const platform=game.platforms.find(item=>Math.abs(item.y-p.y)<2&&p.x+19>item.x&&p.x-19<item.x+item.w);
        if(platform){this.escapeDirection=p.x-platform.x<platform.x+platform.w-p.x?-1:1;this.escapeUntil=now+.65;}
      }
      if(now<this.escapeUntil){actions.left=this.escapeDirection<0;actions.right=this.escapeDirection>0;actions.jump=false;actions.interact=false;}
      this.controls(game,actions);
      return{kind,destination,targetId:target?.id,actions};
    }
  }
  root.CampaignPilot=CampaignPilot;
  if(typeof module==='object'&&module.exports)module.exports=CampaignPilot;
})(typeof window!=='undefined'?window:globalThis);
