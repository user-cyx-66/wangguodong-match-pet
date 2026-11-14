(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const content = window.GAME_CONTENT || {levels:[],upgrades:{},ending:[]};
  const levels = content.levels || [], total = levels.length;
  const symbols={weapon:'⚔',armor:'♜',charm:'✦'};
  const menu=$('menu-screen'),play=$('play-screen'),overlay=$('game-overlay'),dialog=$('dialog-panel');
  let game,state={},panel=null,sound=true,menuAux=null,panelStack=[];
  let previousHp=null,previousStage=-1,damageFeedbackToken=0;
  const heroes={ikun:{name:'银发小鸡骑士',portrait:'assets/ikun-knight.png',cover:'assets/ikun-knight.png'}};
  const preferredHero='ikun';let renderedHero=null;
  const setText=(id,value)=>{const node=$(id),text=String(value);if(node&&node.textContent!==text)node.textContent=text;};
  const setFill=(id,value)=>{const node=$(id),width=Math.max(0,Math.min(100,value))+'%';if(node&&node.style.width!==width)node.style.width=width;};
  function pulseInput(action){if(panel||play.hidden)return;game.setInput(action,true);setTimeout(()=>game.setInput(action,false),60);$('game-canvas').focus({preventScroll:true});}
  const chapter=index=>index===total-1?'终章 · '+(index+1)+' / '+total:'第 '+(index+1)+' / '+total+' 章';
  const dialogue=lines=>'<div class="dialog-lines">'+(lines||[]).map(l=>'<p><strong>'+esc(l.speaker)+'</strong>'+esc(l.text)+'</p>').join('')+'</div>';
  const countText=(item,key,totalFallback)=>Math.max(0,Number(item?.[key])||0)+' / '+Math.max(0,Number(item?.total ?? totalFallback)||0);
  function toast(message){
    const el=document.createElement('div');el.className='toast';el.textContent=message;
    $('toasts').append(el);setTimeout(()=>el.remove(),3100);
    while($('toasts').children.length>3)$('toasts').firstChild.remove();
  }
  function heroPickerHtml(){
    return '<div class="hero-picker"><div class="hero-picker-label">出战角色 <small>独自握剑 · 召唤同行</small></div><div class="hero-identity"><span aria-hidden="true">✦</span><strong>银发小鸡骑士</strong><small>王果冻 · 可召唤坐骑</small></div></div>';
  }
  function renderHero(id,force=false){
    id='ikun';if(id===renderedHero&&!force)return;
    renderedHero=id;const hero=heroes[id];document.body.dataset.hero=id;
    setText('player-name',hero.name);$('player-avatar').dataset.hero=id;
    $('player-portrait').src=hero.portrait;$('player-portrait').alt=hero.name;$('hero-cover').src=hero.cover;
    setText('hero-edition',game?.showcase?'精修试玩 · 猎狼试炼':'单人战役 · 召唤之约');
  }
  function updateState(s){
    state=s||{};renderHero('ikun');
    const hp=Math.max(0,state.hp||0),max=Math.max(1,state.maxHp||100),index=Number(state.stageIndex)||0,trial=!!state.showcase,level=(trial?game?.stage:levels[index])||{};
    setText('hero-edition',trial?'精修试玩 · 猎狼试炼':'单人战役 · 召唤之约');
    const healthRatio=hp/max,healthText=Math.ceil(hp)+' / '+max;
    setFill('health-fill',healthRatio*100);setText('health-text',healthText);
    setFill('battle-health-fill',healthRatio*100);setText('battle-health-text',healthText);
    $('battle-health-meter').setAttribute('aria-valuenow',String(Math.round(healthRatio*100)));
    const lowHealth=hp>0&&healthRatio<=.3;
    document.body.classList.toggle('low-health',lowHealth);$('health-warning').hidden=!lowHealth;
    if(previousHp!==null&&previousStage===index&&hp<previousHp&&!play.hidden){
      const token=++damageFeedbackToken;
      document.body.classList.add('player-hurt');setText('damage-feedback','−'+Math.ceil(previousHp-hp));
      setTimeout(()=>{if(token===damageFeedbackToken){document.body.classList.remove('player-hurt');setText('damage-feedback','');}},420);
    }
    previousHp=hp;previousStage=index;
    setFill('xp-fill',(state.xp||0)/Math.max(1,state.xpToNext||100)*100);
    setText('player-level','Lv.'+(state.level||1));setText('gold',Math.floor(state.gold||0));
    setText('stage-number',trial?'精修试玩':chapter(index));setText('stage-name',state.stageName||level.name||'风雨荒原');
    const adv=state.adventure||{},active=adv.activeEncounter,encounters=adv.encounters||{};
    const remaining=state.enemiesRemaining??Math.max(0,(state.stageTotal||0)-(state.stageKills||0));
    setText('quest-progress',trial?(active?active.label+' · 剩余 '+Math.max(0,active.remaining??remaining)+' 只猎狼':adv.canExit?'两处战区已突破 · 到右侧出口按 F':'沿灯火前进 · 击败三只猎狼'):state.won?'蔡乙先王子已获救':active?active.label+' · 剩余 '+Math.max(0,active.remaining??remaining)+' 名敌人':adv.canExit?(index===total-1?'恶龙已倒下 · 前往右端囚笼按 F 救援':'战区已突破 · 前往出口'):'留意本章机关 · 突破前方战区');
    const mechanic=level.mechanicHint||level.featureHint||'观察敌人的出招预警，用格挡、跳跃和投球应对。';
    setText('stage-mechanic',mechanic);setText('battle-mechanic',mechanic);
    setText('adventure-objective',trial?level.goal:adv.objective||level.goal||'突破战区，留意本章机关。');
    setText('encounter-progress','战区 '+countText(encounters,'cleared',level.encounters?.length||3));
    setText('relic-progress','奖励碎片 '+countText(adv.relics,'collected',level.relics?.length||3));
    setText('beacon-progress','路灯 '+countText(adv.beacons,'lit',level.beacons?.length||3));
    setText('chest-progress','宝箱 '+countText(adv.chests,'opened',level.chests?.length||0));
    setText('checkpoint-status',trial?'试玩不影响战役存档':'战区自动保存');
    $('checkpoint-status').setAttribute('title',trial?'战役存档保留，重新挑战从试玩起点开始':'突破战区后自动记录进度');
    setText('save-status',trial?'精修试玩 · 不影响战役存档':'自动存档');
    $('relic-progress').hidden=trial;$('chest-progress').hidden=trial;
    for(const [id,item] of [['relic-progress',adv.relics],['beacon-progress',adv.beacons],['encounter-progress',encounters]]){
      const key=id==='relic-progress'?'collected':id==='beacon-progress'?'lit':'cleared';
      $(id).classList.toggle('complete',!!item?.total&&Number(item[key])>=Number(item.total));
    }
    const energy=Math.min(100,Math.max(0,state.comboEnergy||0));
    setFill('combo-fill',energy);$('combo-icon').classList.toggle('ready',energy>=100);
    setText('combo-label',energy>=100?'剑气爆发已就绪':'剑气爆发');
    setText('combo-hint',energy>=100?'按 E · 释放蓄积剑气':'攻击蓄能 '+Math.floor(energy)+'%');
    const combat=state.combat||{},step=Math.max(0,Math.min(4,Number(combat.step)||0));
    setText('combat-state',combat.label||'待机');
    document.querySelectorAll('[data-combo-step]').forEach(node=>node.classList.toggle('active',Number(node.dataset.comboStep)===step));
    const stamina=Math.max(0,Number(combat.guardStamina??100)),guardMax=Math.max(1,Number(combat.guardMax)||100);
    setFill('guard-fill',stamina/guardMax*100);setText('guard-state',combat.guarding?'横剑格挡':stamina<guardMax*.18?'耐力不足 · 松开恢复':'按住 L / 鼠标右键');
    $('guard-meter').setAttribute('aria-valuenow',String(Math.round(stamina/guardMax*100)));
    $('guard-meter').classList.toggle('guarding',!!combat.guarding);$('guard-meter').classList.toggle('low',stamina<guardMax*.18);
    const ranged=state.ranged||{},canThrow=ranged.canThrow===true,rangedCooldown=Math.max(0,Number(ranged.cooldown)||0),rangedMax=Math.max(.01,Number(ranged.cooldownMax)||.12);
    const ballState=ranged.state||'ready',ballLabels={ready:'可以投掷',windup:'准备出手',outbound:'篮球飞行中',returning:'正在回收',cooldown:'接球准备'};
    setText('ranged-state',ranged.label||ballLabels[ballState]||'准备中');
    setText('ranged-hint',ballState==='cooldown'?'接球准备 · 即刻再战':ballState==='outbound'||ballState==='returning'?'快速回收中 · 可继续挥剑或防御':ballState==='windup'?'快速出手':'Q / 鼠标左键 · 快速投掷');
    const ballProgress=ballState==='cooldown'?(1-rangedCooldown/rangedMax)*100:ballState==='ready'?100:0;
    setFill('ranged-fill',ballProgress);$('ranged-meter').setAttribute('aria-valuenow',String(Math.round(Math.max(0,Math.min(100,ballProgress)))));
    $('ranged-meter').classList.toggle('ready',canThrow);$('ranged-meter').classList.toggle('in-flight',ballState==='outbound'||ballState==='returning');
    setText('throw-button',canThrow?'投球 Q':ballState==='ready'?(state.paused?'已暂停':'准备中'):ballState==='cooldown'?rangedCooldown.toFixed(1)+'s':ballState==='windup'?'出手中':'等待回收');$('throw-button').disabled=!canThrow;
    document.querySelectorAll('[data-input="throw"]').forEach(node=>{node.disabled=!canThrow;const text=canThrow||ballState==='ready'?'篮球':ballState==='cooldown'?rangedCooldown.toFixed(1)+'s':ballState==='windup'?'出手':'回收中';if(node.textContent!==text)node.textContent=text;});
    const mount=state.mount||{},mounted=!!mount.mounted,summoned=!!mount.summoned,cooldown=Math.max(0,Number(mount.cooldown)||0),mountTransition=mount.state==='summoning'||mount.state==='dismissing';
    setText('mount-state',mount.label||(mounted?'骑乘中':summoned?'已召唤':'尚未召唤'));
    setText('mount-hint',mounted?'G 下骑 · 落地后可收回':mount.canRide?'G 上骑 · 王果冻就在身边':cooldown>0?'再次召唤还需 '+cooldown.toFixed(1)+' 秒':summoned?'靠近王果冻，落地后按 G':'R 召唤，再靠近按 G 骑乘');
    setText('summon-button',mounted?'先下骑':mount.state==='summoning'?'召唤中':mount.state==='dismissing'?'收回中':summoned?'收回 R':cooldown>0?'冷却 '+Math.ceil(cooldown)+'s':'召唤 R');
    $('summon-button').disabled=mounted||mountTransition||cooldown>0;
    setText('ride-button',mounted?'下骑 G':'上骑 G');$('ride-button').disabled=!mounted&&!mount.canRide;
    document.querySelectorAll('[data-input="ride"]').forEach(node=>{node.disabled=!mounted&&!mount.canRide;node.textContent=mounted?'下骑':'上骑';});
    document.querySelectorAll('[data-input="summon"]').forEach(node=>{node.disabled=mounted||mountTransition||cooldown>0;node.textContent=mount.state==='summoning'?'出现中':mount.state==='dismissing'?'收回中':summoned?'收回':'召唤';});
    document.body.classList.toggle('mounted',mounted);
    $('boss-hud').hidden=!state.boss;
    if(state.boss){setText('boss-name',state.boss.name||'精英守卫');setText('boss-kind',index===total-1?'最终之战':'精英对决');setFill('boss-fill',state.boss.hp/Math.max(1,state.boss.maxHp)*100);}
  }
  function displayGame(){menu.hidden=true;play.hidden=false;document.body.dataset.screen='play';}
  function displayMenu(){
    game?.exitToMenu();panel=null;panelStack=[];menuAux=null;$('page-aux')?.remove();
    overlay.hidden=true;play.hidden=true;menu.hidden=false;document.body.dataset.screen='menu';
    const saved=game?.hasSave();$('continue-button').hidden=!saved;
    $('start-button').className='button subtle';
    $('start-button').textContent=saved?'重开十二章战役':'开始十二章战役';
    $('save-note').textContent=saved?'战役存档已保留 · 精修试玩不会覆盖旅程':'精修试玩不影响战役存档 · 支持键盘与触屏';
    setText('hero-edition','精修试玩 · 完整战役');
  }
  function openPanel(kind,html,wide=false){
    panel=kind;game?.pause();overlay.hidden=false;dialog.className='dialog-panel'+(wide?' wide':'');dialog.innerHTML=html;
    renderHero(game?.heroId||preferredHero,true);
    setTimeout(()=>dialog.querySelector('button:not([disabled])')?.focus({preventScroll:true}),20);
  }
  function closePanel(){panel=null;overlay.hidden=true;game?.resume();$('game-canvas').focus({preventScroll:true});}
  function stageIntro(index){
    const trial=!!game?.showcase,level=(trial?game.stage:levels[index])||{};
    const hint=trial?'按住 J 完成三轻一重，重击可打断冲锋；L 正面格挡<br>两处战区清理后，到右侧出口按 F · 试玩不影响战役存档':'J 连击 / 空中斩 · 空中 S + J 下劈 · Q / 左键快速投球<br>短按跳低跃，长按高跃 · 路灯自动点亮，战区自动存档';
    openPanel('intro','<p class="dialog-eyebrow">'+(trial?'精修试玩':chapter(index))+' · '+esc(level.region||'荒原誓约')+'</p><div class="dialog-symbol">✦</div><h2>'+esc(level.name||'新的旅程')+'</h2><p class="dialog-description">'+esc(level.description||'握紧长剑，沿誓灯向前。')+'</p>'+dialogue(level.intro)+'<div class="chapter-goal">'+esc(level.mechanicHint||level.featureHint||level.goal||'突破战区，留意机关。')+'</div><p class="intro-hint">'+hint+'</p><div class="dialog-actions"><button class="button primary" data-action="resume">'+(trial?'开始试炼':index===0?'握紧长剑，出发':'继续向前')+' →</button></div>');
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
    const trial=!!game?.showcase;
    openPanel('pause','<p class="dialog-eyebrow">'+(trial?'精修试玩':chapter(state.stageIndex||0))+' · 已暂停</p><div class="dialog-symbol">Ⅱ</div><h2>骑士也需要歇一会儿。</h2><p class="dialog-description">战斗、坐骑与机关均已暂停。<br>'+(trial?'试玩不影响战役存档；重新挑战会从第一处战区开始。':'战区突破后自动保存，路灯经过时自动点亮。')+'</p>'+heroPickerHtml()+'<div class="dialog-actions"><button class="button primary" data-action="resume">继续'+(trial?'试玩':'冒险')+'</button>'+(trial?'<button class="button" data-action="retry">重新挑战</button>':'<button class="button" data-action="route">战役地图</button>')+'<button class="button" data-action="help">操作说明</button><button class="button subtle" data-action="home">'+(trial?'退出试玩':'保存并回首页')+'</button></div>');
  }
  function death(){
    if(game?.showcase){
      openPanel('death','<p class="dialog-eyebrow">精修试玩 · 再试一次</p><div class="dialog-symbol">❧</div><h2>看清冲锋，再接上重击。</h2><p class="dialog-description">重新挑战三只猎狼，从第一处战区开始。<br>战役存档保留，可以随时回首页继续旅程。</p><div class="dialog-actions"><button class="button primary" data-action="retry">重新挑战 →</button><button class="button subtle" data-action="home">回到首页</button></div>');return;
    }
    const point=state.adventure?.checkpoint?.id?'最近完成的战区':'本章起点';
    openPanel('death','<p class="dialog-eyebrow">这一次，先休息一下</p><div class="dialog-symbol">❧</div><h2>勇气不会因为跌倒而消失。</h2><p class="dialog-description">休整一下，重新握紧长剑。<br>保留成长与装备，从'+point+'重新挑战。</p><div class="dialog-actions"><button class="button primary" data-action="retry">再战一次 →</button><button class="button subtle" data-action="home">保存并回首页</button></div>');
  }
  function showcaseComplete(){
    updateState(game.getState());
    openPanel('showcase-complete','<p class="dialog-eyebrow">精修试玩 · 两处战区已突破</p><div class="ending-medal">✦</div><h2>猎狼退去，灯火还在。</h2><p class="dialog-description">三只猎狼已击败，荒原试炼完成。<br>再试一次，练习格挡与重击；也可回首页继续完整战役。</p><div class="dialog-actions"><button class="button primary" data-action="retry">再试一次 →</button><button class="button" data-action="home">回到首页</button></div>');
  }
  function victory(){
    openPanel('victory','<p class="dialog-eyebrow">召唤之约 · 旅程完成</p><div class="ending-medal">♛</div><h2>恶龙倒下，誓约兑现。</h2><p class="ending-names">银发小鸡骑士与王果冻 · 蔡乙先王子已获救</p>'+dialogue(content.ending)+'<div class="stats-row"><span><strong>'+total+'</strong>章节完成</span><span><strong>Lv.'+(state.level||1)+'</strong>骑士等级</span><span><strong>'+Object.values(state.upgrades||{}).reduce((a,b)=>a+Number(b),0)+'</strong>装备强化</span></div><div class="dialog-actions"><button class="button primary" data-action="home">带着故事回家</button><button class="button" data-action="new">再来一次冒险</button></div>',true);
  }
  function helpHtml(){
    const controls=(content.controls||[]).map(c=>'<div><kbd>'+esc(c.key)+'</kbd><span>'+esc(c.label)+'</span></div>').join('');
    if(game?.showcase)return '<p class="dialog-eyebrow">精修试玩 · 操作说明</p><h2>看准冲锋，接上第四剑。</h2><div class="help-grid">'+controls+'</div><p class="help-note"><strong>本次目标</strong>：突破两处战区，击败三只猎狼，沿灯火走到右侧光门按 F 完成试玩。中间的跳台是可选路线，地面也能通过。</p><p class="help-note"><strong>按住 J 打出三轻一重</strong>，第四剑可中断猎狼冲锋。猎狼脚下亮起箭头时将锁定方向；按住 L 或鼠标右键正面格挡，也可跳跃或 K 闪避。</p><p class="help-note"><strong>Q / 左键投球，R 召唤王果冻，靠近按 G 骑乘</strong>，均沿用原有操作。试玩不影响战役存档；死亡或选择重新挑战，会从第一处战区再来。</p><div class="dialog-actions"><button class="button primary" data-action="close-help">回到试玩</button></div>';
    return '<p class="dialog-eyebrow">骑士手册</p><h2>看准时机，打出自己的节奏。</h2><div class="help-grid">'+controls+'<div><kbd>空中 J</kbd><span>腾空斩击</span></div><div><kbd>空中 S + J</kbd><span>向下重劈</span></div><div><kbd>触屏</kbd><span>使用画面下方按钮</span></div></div><p class="help-note"><strong>关卡目标</strong>：突破战区，穿过出口。每章有不同路线、机关和敌人组合，地图会显示本章玩法。路灯经过时自动点亮，碎片和宝箱是额外奖励，战区突破后自动记录进度。最后一章击败恶龙，再到右端囚笼按 F 救出蔡乙先王子。</p><p class="help-note"><strong>J 三轻一重</strong>，空中按 J 腾空斩击，空中按住 S 再按 J 向下重劈。短按跳跃低跃，长按高跃，空中可二段跳。<strong>按住 L 或鼠标右键格挡</strong>，看准命中时机招架反击；K 冲刺，能量满时 E 释放剑气。</p><p class="help-note"><strong>Q / 战场鼠标左键快速投篮球</strong>：取球后迅速出手，篮球命中或达到射程后自动快速回收，接回只需短暂准备即可再投。出手后可用 J 或 L 接上近战与防御，飞行期间保持单球。步行与骑乘均能使用。</p><p class="help-note"><strong>R 召唤王果冻，靠近并落地按 G 上骑</strong>；骑乘后按 G 下骑，再按 R 收回。空中不能上下骑。生命条在战场左下方显示实际生命，受伤会扣血；生命归零后可以保留成长与装备再战。</p><div class="dialog-actions"><button class="button primary" data-action="close-help">回到战场</button></div>';

  }
  function routeCards(inGame){
    return levels.map((l,i)=>{
      const current=inGame&&i===(state.stageIndex||0),done=inGame&&(state.won||i<(state.stageIndex||0));
      return '<div class="route-step '+(current?'current':done?'done':'')+'"><span>'+String(i+1).padStart(2,'0')+'</span><p>'+esc(l.name)+'<small>'+esc(l.mechanicHint||l.featureHint||l.region||'')+'</small></p>'+(current?'<b>当前</b>':done?'<b>✓</b>':'')+'</div>';
    }).join('');
  }
  function routeHtml(){
    return '<p class="dialog-eyebrow">召唤之约 · 战役地图</p><h2>'+total+' 章旅途，把王子接回家。</h2><p class="dialog-description">不同路线、机关与敌人组合 · 战区自动保存<br>碎片与宝箱提供额外奖励，路灯经过时自动点亮。</p><div class="route-grid">'+routeCards(!play.hidden)+'</div><div class="dialog-actions"><button class="button primary" data-action="close-aux">回到旅途</button></div>';
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
    if(event.type==='stageClear'){if(game?.showcase)showcaseComplete();else camp();}
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
    const button=event.target.closest('[data-action]');if(!button||button.disabled)return;
    event.preventDefault();const action=button.dataset.action;
    if(action==='summon'||action==='ride'||action==='throw'){pulseInput(action);return;}
    if(action==='showcase'){panelStack=[];displayGame();game.startShowcase();}
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
    button.addEventListener('pointerdown',event=>{event.preventDefault();if(panel||button.disabled)return;button.setPointerCapture(event.pointerId);button.classList.add('pressed');game.setInput(button.dataset.input,true);if(['summon','ride','throw','dash','combo','interact'].includes(button.dataset.input))setTimeout(release,60);});
    button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
  }
  window.addEventListener('blur',()=>{for(const b of document.querySelectorAll('[data-input]')){b.classList.remove('pressed');game.setInput(b.dataset.input,false);}if(!play.hidden&&!panel)pausePanel();});
  displayMenu();
})();
