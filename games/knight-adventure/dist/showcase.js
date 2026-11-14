/* A short, isolated first-map trial. Campaign stages and saves remain intact.
 * Load after enemy-variety.js and before app.js. No new combat system. */
(function () {
  'use strict';
  const P=window.KnightGame?.prototype;
  if(!P||P._showcaseInstalled)return;
  P._showcaseInstalled=true;
  const oldStart=P.startNew,oldContinue=P.continueGame,oldRetry=P.retry;
  const oldLoad=P._loadStage,oldSave=P._save,oldState=P.getState,oldNext=P.nextStage,oldEvent=P._event,oldText=P._text;
  const ID='wasteland-showcase-v1';
  function preset(game){
    const base=game.levels[0];
    return {...base,id:ID,name:'风雨荒原 · 猎狼试炼',width:3600,portalX:3440,
      region:'风雨荒原',feature:'精修试玩',featureHint:'看清冲锋预警，用三轻一重打断猎狼，突破两处战区。',
      description:'沿着荒原灯火，先迎战一只猎狼，再突破双狼守住的出口。',
      mechanicHint:'J 三轻一重 · L 格挡冲锋 · 突破两处战区后，到右侧出口按 F',
      goal:'击败三只猎狼，突破两处战区，到右侧光门按 F 完成试玩。',
      intro:[{speaker:'银发小鸡骑士',text:'先看清它的冲锋。留住节奏，第三剑之后，用重击把它打退。'},
        {speaker:'试玩目标',text:'两处战区，共三只猎狼。跳台可自由尝试；篮球与王果冻照常可用。'}],
      outro:[],platforms:[{x:1590,y:515,w:200,h:22,oneWay:true},{x:1880,y:455,w:190,h:22,oneWay:true},
        {x:3200,y:520,w:170,h:22,oneWay:true}],
      encounters:[{id:'trial-1',x:760,span:720,label:'第一战 · 看准冲锋'},
        {id:'trial-2',x:2300,span:850,label:'第二战 · 双狼守路'}],
      enemies:[{x:940,encounter:'trial-1'},{x:2490,encounter:'trial-2'},{x:2830,encounter:'trial-2'}]
        .map(e=>({...e,type:'wolf',variant:'charger',name:'獠牙猎狼',y:590,hpScale:1.45,damageScale:.85})),
      obstacles:[{kind:'puddle',x:1690,w:200},{kind:'gust',x:1870,w:340,strength:65,period:5}],
      relics:[],chests:[],hazardZones:[],checkpoints:[],
      beacons:[{id:'trial-lamp-1',x:1520,y:590},{id:'trial-lamp-2',x:3220,y:590}]
    };
  }
  P._loadStage=function(index,...args){
    if(!this.showcase)return oldLoad.call(this,index,...args);
    const campaign=this.levels;
    this.levels=campaign.slice();this.levels[0]=preset(this);
    try{return oldLoad.call(this,0,...args);}finally{this.levels=campaign;}
  };
  P.startShowcase=function(){this.showcase=true;return oldStart.call(this);};
  P.startNew=function(...args){this.showcase=false;return oldStart.apply(this,args);};
  P.continueGame=function(...args){this.showcase=false;return oldContinue.apply(this,args);};
  P.retry=function(...args){return this.showcase?this.startShowcase():oldRetry.apply(this,args);};
  P.nextStage=function(...args){if(!this.showcase)return oldNext.apply(this,args);};
  P._save=function(...args){if(!this.showcase&&this.stage?.id!==ID)return oldSave.apply(this,args);};
  P.getState=function(){
    const state={...oldState.call(this),showcase:!!this.showcase};
    if(this.showcase&&state.adventure)state.adventure={...state.adventure,
      objective:state.adventure.canExit?'光门已开启 · 到右侧出口按 F 完成试玩':this.stage.goal};
    return state;
  };
  P._text=function(c,text,...args){return oldText.call(this,c,this.showcase&&text==='F  进入营地'?'F  完成试玩':text,...args);};
  P._event=function(event){
    if(this.showcase&&event?.type==='toast'&&/进度已自动保存/.test(event.text||''))
      event={...event,text:event.text.replace(/进度已自动保存(?:，前往出口)?/,'继续沿灯火前进').replace('本章战区','试玩战区')};
    return oldEvent.call(this,event);
  };
})();
