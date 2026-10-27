(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const content = window.GAME_CONTENT || {levels:[],upgrades:{},ending:[]};
  const levels = content.levels || [], total = levels.length;
  const symbols={weapon:'⚔',armor:'♜',charm:'✦'};
  const menu=$('menu-screen'),play=$('play-screen'),overlay=$('game-overlay'),dialog=$('dialog-panel');
  let game,state={},panel=null,sound=true,menuAux=null,panelStack=[];
  const heroChoiceKey='wangguodong-knight-hero-v1';
  const heroes={ikun:{name:'ikun 骑士',portrait:'assets/ikun-knight.png',cover:'assets/ikun-knight.png'},wangguodong:{name:'王果冻',portrait:'assets/cat-portrait.png',cover:'assets/knight-cover.png'}};
  let preferredHero='ikun',renderedHero=null;
  try{const saved=localStorage.getItem(heroChoiceKey);if(Object.hasOwn(heroes,saved))preferredHero=saved;}catch{}
  const chapter=index=>index===total-1?'终章 · '+(index+1)+' / '+total:'第 '+(index+1)+' / '+total+' 章';
  const dialogue=lines=>'<div class="dialog-lines">'+(lines||[]).map(l=>'<p><strong>'+esc(l.speaker)+'</strong>'+esc(l.text)+'</p>').join('')+'</div>';
  const countText=(item,key,totalFallback)=>Math.max(0,Number(item?.[key])||0)+' / '+Math.max(0,Number(item?.total ?? totalFallback)||0);
  function toast(message){
    const el=document.createElement('div');el.className='toast';el.textContent=message;
    $('toasts').append(el);setTimeout(()=>el.remove(),3100);
    while($('toasts').children.length>3)$('toasts').firstChild.remove();
  }
  function heroPickerHtml(){
    const selected=game?.heroId||preferredHero;
    return '<div class="hero-picker" role="group" aria-label="选择骑士形象"><div class="hero-picker-label">出战形象 <small>随时切换 · 沿用当前旅程</small></div><div class="hero-options">'+Object.entries(heroes).map(([id,hero])=>'<button class="hero-option" data-action="select-hero" data-hero="'+id+'" aria-pressed="'+(id===selected)+'"><span aria-hidden="true">'+(id==='ikun'?'✦':'♜')+'</span>'+hero.name+(id==='ikun'?'<small>试用</small>':'')+'</button>').join('')+'</div></div>';
  }
  function renderHero(id,force=false){
    if(!Object.hasOwn(heroes,id))id=preferredHero;
    if(id===renderedHero&&!force)return;
    renderedHero=id;const hero=heroes[id];document.body.dataset.hero=id;
    $('player-name').textContent=hero.name;$('player-avatar').dataset.hero=id;
    $('player-portrait').src=hero.portrait;$('player-portrait').alt=hero.name;$('hero-cover').src=hero.cover;
    $('hero-edition').textContent=id==='ikun'?'ikun 骑士 · 试用形象':'一只小猫的英雄旅程';
    document.querySelectorAll('[data-action="select-hero"]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.hero===id)));
  }
  function selectHero(id){
    if(!Object.hasOwn(heroes,id)||!game?.setHero(id))return;
    preferredHero=id;try{localStorage.setItem(heroChoiceKey,id);}catch{}
    renderHero(id,true);
    if(!play.hidden){toast('已换为'+heroes[id].name+' · 旅程继续');if(!panel)$('game-canvas').focus({preventScroll:true});}
  }
  function updateState(s){
    state=s||{};
    renderHero(state.heroId||game?.heroId||preferredHero);
    const hp=Math.max(0,state.hp||0),max=Math.max(1,state.maxHp||100),index=Number(state.stageIndex)||0,level=levels[index]||{};
    $('health-fill').style.width=Math.max(0,Math.min(100,hp/max*100))+'%';
    $('health-text').textContent=Math.ceil(hp)+' / '+max;
    $('xp-fill').style.width=Math.min(100,(state.xp||0)/Math.max(1,state.xpToNext||100)*100)+'%';
    $('player-level').textContent='Lv.'+(state.level||1);$('gold').textContent=Math.floor(state.gold||0);
    $('stage-number').textContent=chapter(index);$('stage-name').textContent=state.stageName||level.name||'风雨荒原';
    const adv=state.adventure||{},active=adv.activeEncounter,encounters=adv.encounters||{};
    const remaining=state.enemiesRemaining??Math.max(0,(state.stageTotal||0)-(state.stageKills||0));
    $('quest-progress').textContent=active?active.label+' · 剩余 '+Math.max(0,active.remaining??remaining)+' 名敌人':(adv.canExit?(index===total-1?'恶龙已倒下 · 前往右端囚笼按 F 救援':'誓约已完成 · 前往光门按 F'):'沿誓灯前进 · 留意前方战区');
    if(state.won)$('quest-progress').textContent='蔡乙先王子已获救';
    $('adventure-objective').textContent=adv.objective||level.goal||'清空战区，收集碎片，点亮誓灯。';
    $('encounter-progress').textContent='战区 '+countText(encounters,'cleared',level.encounters?.length||3);
    $('relic-progress').textContent='碎片 '+countText(adv.relics,'collected',level.relics?.length||3);
    $('beacon-progress').textContent='誓灯 '+countText(adv.beacons,'lit',level.beacons?.length||3);
    $('chest-progress').textContent='宝箱 '+countText(adv.chests,'opened',level.chests?.length||0);
    const checkpoint=adv.checkpoint,checkpointIndex=(level.checkpoints||[]).findIndex(c=>c.id===checkpoint?.id);
    $('checkpoint-status').textContent=checkpoint?.id?'检查点 '+(checkpointIndex>=0?checkpointIndex+1:'')+' 已记录':'检查点 · 尚未记录';
    $('checkpoint-status').classList.toggle('recorded',!!checkpoint?.id);
    for(const [id,item,key] of [['relic-progress',adv.relics,'collected'],['beacon-progress',adv.beacons,'lit'],['encounter-progress',encounters,'cleared']]){
      $(id).classList.toggle('complete',!!item?.total&&Number(item[key])>=Number(item.total));
    }
    const energy=Math.min(100,Math.max(0,state.comboEnergy||0));
    $('combo-fill').style.width=energy+'%';$('combo-icon').classList.toggle('ready',energy>=100);
    $('combo-label').textContent=energy>=100?'誓约合击已就绪':'誓约合击';
    $('combo-hint').textContent=energy>=100?'按 E · 与公主并肩出击':'攻击蓄能 '+Math.floor(energy)+'%';
    $('boss-hud').hidden=!state.boss;
    if(state.boss){
      $('boss-name').textContent=state.boss.name||'精英守卫';
      $('boss-kind').textContent=index===total-1?'最终之战':'精英对决';
      $('boss-fill').style.width=Math.max(0,Math.min(100,state.boss.hp/Math.max(1,state.boss.maxHp)*100))+'%';
    }
  }
  function displayGame(){menu.hidden=true;play.hidden=false;document.body.dataset.screen='play';}
  function displayMenu(){
    game?.exitToMenu();panel=null;panelStack=[];menuAux=null;$('page-aux')?.remove();
    overlay.hidden=true;play.hidden=true;menu.hidden=false;document.body.dataset.screen='menu';
    const saved=game?.hasSave();$('continue-button').hidden=!saved;
    $('start-button').className=saved?'button subtle':'button primary large';
    $('start-button').textContent=saved?'重新启程':'启程冒险 →';
    $('save-note').textContent=saved?'旅程已保存 · 继续上次的冒险':'进度自动保存在当前浏览器 · 支持键盘与触屏';
  }
  function openPanel(kind,html,wide=false){
    panel=kind;game?.pause();overlay.hidden=false;dialog.className='dialog-panel'+(wide?' wide':'');dialog.innerHTML=html;
    renderHero(game?.heroId||preferredHero,true);
    setTimeout(()=>dialog.querySelector('button:not([disabled])')?.focus({preventScroll:true}),20);
  }
  function closePanel(){panel=null;overlay.hidden=true;game?.resume();$('game-canvas').focus({preventScroll:true});}
  function stageIntro(index){
    const level=levels[index]||{};
    openPanel('intro','<p class="dialog-eyebrow">'+chapter(index)+' · '+esc(level.region||'荒原誓约')+'</p><div class="dialog-symbol">✦</div><h2>'+esc(level.name||'新的旅程')+'</h2><p class="dialog-description">'+esc(level.description||'与王德敏公主一起向前。')+'</p>'+dialogue(level.intro)+'<div class="chapter-goal">'+esc(level.goal||'收集碎片，点亮誓灯。')+'</div><p class="intro-hint">碎片自动拾取 · 誓灯、宝箱与检查点靠近按 F</p><div class="dialog-actions"><button class="button primary" data-action="resume">'+(index===0?'握紧长剑，出发':'继续向前')+' →</button></div>');
  }
  function equipmentCards(){
    return Object.entries(content.upgrades||{}).map(([key,def])=>{
      const level=Number(state.upgrades?.[key]||0),maximum=def.maxLevel||8,maxed=level>=maximum,cost=def.costs?.[level]??9999;
      return '<div class="equipment-card"><span aria-hidden="true">'+(symbols[key]||'✦')+'</span><h3>'+esc(def.name)+'</h3><div class="equipment-level">第 '+level+' / '+maximum+' 阶</div><small>'+esc(def.description)+'</small><button class="button '+(!maxed&&(state.gold||0)>=cost?'primary':'')+'" data-action="upgrade" data-key="'+esc(key)+'" '+(maxed||(state.gold||0)<cost?'disabled':'')+'>'+(maxed?'已达最高阶':'升级 · ◈ '+cost)+'</button></div>';
    }).join('');
  }
  function camp(){
    updateState(game.getState());const level=levels[state.stageIndex||0]||{},adv=state.adventure||{};
    openPanel('camp','<p class="dialog-eyebrow">关卡完成 · 篝火营地</p><h2>走过的路，会留在剑上。</h2>'+dialogue(level.outro)+'<div class="camp-achievements"><span>碎片 '+countText(adv.relics,'collected',3)+'</span><span>誓灯 '+countText(adv.beacons,'lit',3)+'</span><span>宝箱 '+countText(adv.chests,'opened',3)+'</span></div><div class="camp-gold">可用金币 ◈ '+Math.floor(state.gold||0)+' · 下一章将恢复全部生命</div><div class="equipment-grid">'+equipmentCards()+'</div><div class="stats-row"><span><strong>'+(state.stats?.attack||'—')+'</strong>攻击</span><span><strong>'+(state.stats?.defense??'—')+'</strong>防御</span><span><strong>'+(state.maxHp||'—')+'</strong>生命</span></div><div class="dialog-actions"><button class="button subtle" data-action="home">保存并回首页</button><button class="button primary" data-action="next">前往'+esc(levels[(state.stageIndex||0)+1]?.name||'下一章')+' →</button></div>',true);
  }
  function pausePanel(){
    if(panel)return;
    openPanel('pause','<p class="dialog-eyebrow">冒险暂停 · '+chapter(state.stageIndex||0)+'</p><div class="dialog-symbol">Ⅱ</div><h2>骑士也需要歇一会儿。</h2><p class="dialog-description">王德敏公主在原地等你。<br>旗帜旁按 F 记录检查点，第一次激活还能恢复生命。</p>'+heroPickerHtml()+'<div class="dialog-actions"><button class="button primary" data-action="resume">继续冒险</button><button class="button" data-action="route">战役地图</button><button class="button" data-action="help">操作说明</button><button class="button subtle" data-action="home">保存并回首页</button></div>');
  }
  function death(){
    const point=state.adventure?.checkpoint?.id?'最近检查点':'本章起点';
    openPanel('death','<p class="dialog-eyebrow">这一次，先休息一下</p><div class="dialog-symbol">❧</div><h2>勇气不会因为跌倒而消失。</h2><p class="dialog-description">王德敏：「再来一次，我一直在你身边。」<br>保留成长与装备，从'+point+'重新挑战。</p><div class="dialog-actions"><button class="button primary" data-action="retry">再战一次 →</button><button class="button subtle" data-action="home">保存并回首页</button></div>');
  }
  function victory(){
    openPanel('victory','<p class="dialog-eyebrow">荒原誓约 · 旅程完成</p><div class="ending-medal">♛</div><h2>恶龙倒下，誓约兑现。</h2><p class="ending-names">王果冻骑士 × 王德敏公主 · 蔡乙先王子已获救</p>'+dialogue(content.ending)+'<div class="stats-row"><span><strong>'+total+'</strong>章节完成</span><span><strong>Lv.'+(state.level||1)+'</strong>骑士等级</span><span><strong>'+Object.values(state.upgrades||{}).reduce((a,b)=>a+Number(b),0)+'</strong>装备强化</span></div><div class="dialog-actions"><button class="button primary" data-action="home">带着故事回家</button><button class="button" data-action="new">再来一次冒险</button></div>',true);
  }
  function helpHtml(){
    const controls=(content.controls||[]).map(c=>'<div><kbd>'+esc(c.key)+'</kbd><span>'+esc(c.label)+'</span></div>').join('');
    return '<p class="dialog-eyebrow">骑士手册</p><h2>挥剑，探路，并肩向前。</h2><div class="help-grid">'+controls+'<div><kbd>触屏</kbd><span>使用画面下方按钮</span></div></div><p class="help-note">每章三处战区，清空敌人后才能继续。主路上的 <strong>3 枚誓约碎片</strong>会自动拾取，<strong>3 盏誓灯</strong>需要按 F 点亮；两项齐全后再到光门按 F。最后一章击败恶龙后，还需到右端王子囚笼前按 F 完成救援。宝箱在支路高台上，属于额外奖励。</p><p class="help-note">检查点旗帜旁按 F 记录，首次激活可恢复生命。公主会主动跟随和施法；能量 100 时按 E 合击。连按或按住 J 连击，跳跃中也能挥剑；用 K 冲刺躲过敌人的预警攻击。</p><p class="help-note">旧版已通关存档会带着原有成长，从扩展战役第 5 章继续。</p><div class="dialog-actions"><button class="button primary" data-action="close-help">我准备好了</button></div>';
  }
  function routeCards(inGame){
    return levels.map((l,i)=>{
      const current=inGame&&i===(state.stageIndex||0),done=inGame&&(state.won||i<(state.stageIndex||0));
      return '<div class="route-step '+(current?'current':done?'done':'')+'"><span>'+String(i+1).padStart(2,'0')+'</span><p>'+esc(l.name)+'<small>'+esc(l.region||'')+'</small></p>'+(current?'<b>当前</b>':done?'<b>✓</b>':'')+'</div>';
    }).join('');
  }
  function routeHtml(){
    return '<p class="dialog-eyebrow">荒原誓约 · 战役地图</p><h2>'+total+' 章旅途，一起走到底。</h2><p class="dialog-description">每章三处战区 · 主路寻碎片与誓灯 · 高台寻宝<br>地图记录旅途顺序，继续冒险会回到当前关卡。</p><div class="route-grid">'+routeCards(!play.hidden)+'</div><div class="dialog-actions"><button class="button primary" data-action="close-aux">回到旅途</button></div>';
  }
  function openAux(kind,html,wide){
    if(play.hidden){
      if(menuAux)return;
      menuAux=kind;const shell=document.createElement('div');shell.id='page-aux';shell.className='page-help';
      shell.innerHTML='<div class="dialog-panel '+(wide?'wide':'')+'" role="dialog" aria-modal="true" aria-label="'+(kind==='route'?'战役地图':'操作说明')+'">'+html+'</div>';
      document.body.append(shell);shell.querySelector('button')?.focus();
    }else{
      if(panel===kind)return;
      panelStack.push(panel?{kind:panel,html:dialog.innerHTML,wide:dialog.classList.contains('wide')}:null);
      openPanel(kind,html,wide);
    }
  }
  function closeAux(){
    if(menuAux){$('page-aux')?.remove();menuAux=null;return;}
    const prior=panelStack.pop();
    if(prior)openPanel(prior.kind,prior.html,prior.wide);else closePanel();
  }
  function onEvent(event){
    if(!event)return;
    if(event.type==='stageStart'){displayGame();stageIntro(event.stageIndex||0);}
    if(event.type==='stageClear')camp();
    if(event.type==='death'){updateState(game.getState());death();}
    if(event.type==='victory'){updateState(game.getState());victory();}
    if(event.type==='toast')toast(event.text||'');
  }
  $('campaign-count').textContent=total+' 章战役';
  $('chapter-strip').innerHTML=routeCards(false);
  $('menu-hero-picker').innerHTML=heroPickerHtml();
  if(typeof window.KnightGame!=='function'){$('start-button').disabled=true;$('save-note').textContent='游戏文件未完整加载，请保留整个文件夹后重新打开。';return;}
  game=new window.KnightGame($('game-canvas'),{onState:updateState,onEvent});window.knightGame=game;
  game.setHero(preferredHero);renderHero(preferredHero,true);
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-action]');if(!button)return;
    event.preventDefault();const action=button.dataset.action;
    if(action==='select-hero')selectHero(button.dataset.hero);
    if(action==='new'){
      if(game.hasSave()&&panel!=='victory'){
        if(play.hidden)displayGame();
        openPanel('confirm-new','<p class="dialog-eyebrow">新的誓约</p><h2>重新开始这段冒险？</h2><p class="dialog-description">当前的金币、等级、装备和探索进度将由新旅程替换。</p><div class="dialog-actions"><button class="button primary" data-action="confirm-new">重新启程</button><button class="button" data-action="cancel-new">保留现有旅程</button></div>');
      }else{displayGame();game.startNew();}
    }
    if(action==='confirm-new'){panelStack=[];displayGame();game.startNew();}
    if(action==='cancel-new')displayMenu();
    if(action==='continue'){displayGame();game.continueGame();}
    if(action==='resume')closePanel();
    if(action==='pause')pausePanel();
    if(action==='home')displayMenu();
    if(action==='next'){panel=null;panelStack=[];overlay.hidden=true;game.nextStage();}
    if(action==='retry'){panel=null;panelStack=[];overlay.hidden=true;game.retry();}
    if(action==='help')openAux('help',helpHtml(),true);
    if(action==='route')openAux('route',routeHtml(),true);
    if(action==='close-aux'||action==='close-help')closeAux();
    if(action==='sound'){
      sound=!sound;game.setAudio(sound);$('sound-button').innerHTML=sound?'♫ <span>音效开</span>':'♪ <span>音效关</span>';
      $('sound-button').setAttribute('aria-label',sound?'关闭音效':'打开音效');$('sound-button').title=sound?'关闭音效':'打开音效';
    }
    if(action==='upgrade'){const result=game.buyUpgrade(button.dataset.key);updateState(game.getState());if(result?.ok===false)toast(result.reason||'金币还不够，再去冒险吧。');camp();}
  });
  document.addEventListener('keydown',event=>{
    if(event.code==='Escape'||event.code==='KeyP'){
      if(event.repeat)return;
      if(menuAux){event.preventDefault();closeAux();return;}
      if(!play.hidden){event.preventDefault();if(panel==='help'||panel==='route')closeAux();else if(panel==='pause')closePanel();else if(!panel)pausePanel();}
    }
    if((event.code==='Enter'||event.code==='Space')&&panel==='intro'){event.preventDefault();event.stopPropagation();closePanel();}
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&!play.hidden&&!panel)pausePanel();});
  for(const button of document.querySelectorAll('[data-input]')){
    const release=()=>{button.classList.remove('pressed');game.setInput(button.dataset.input,false);};
    button.addEventListener('pointerdown',event=>{event.preventDefault();if(panel)return;button.setPointerCapture(event.pointerId);button.classList.add('pressed');game.setInput(button.dataset.input,true);});
    button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
  }
  window.addEventListener('blur',()=>{for(const b of document.querySelectorAll('[data-input]')){b.classList.remove('pressed');game.setInput(b.dataset.input,false);}if(!play.hidden&&!panel)pausePanel();});
  displayMenu();
})();
