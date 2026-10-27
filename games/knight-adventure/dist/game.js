(function () {
  'use strict';

  const SAVE_KEY = 'wangguodong-knight-v1';
  const W = 1280, H = 720, GROUND = 590;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const rand = (lo, hi) => lo + Math.random() * (hi - lo);
  const lerp = (a, b, n) => a + (b - a) * n;
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const smooth = n => { n=clamp(n,0,1);return n*n*(3-2*n); };
  const SWINGS = [
    {windup:.15,active:.145,recovery:.205,chainAt:.405,reach:130,power:1,push:135,stop:.033,shake:2.4,
      ready:{angle:-1.73,lean:-.17,x:-5,y:5,scaleX:.97,scaleY:.97,gripX:-4,gripY:-101},
      end:{angle:.48,lean:.23,x:9,y:4,scaleX:1.035,scaleY:.98,gripX:25,gripY:-57}},
    {windup:.12,active:.15,recovery:.21,chainAt:.39,reach:136,power:1.12,push:110,stop:.04,shake:3,
      ready:{angle:1.04,lean:.12,x:2,y:5,scaleX:1.02,scaleY:.97,gripX:18,gripY:-52},
      end:{angle:-1.14,lean:-.14,x:6,y:-7,scaleX:.98,scaleY:1.025,gripX:17,gripY:-96}},
    {windup:.25,active:.18,recovery:.30,chainAt:.73,reach:155,power:1.85,push:180,stop:.075,shake:5,
      ready:{angle:-1.81,lean:-.21,x:-6,y:7,scaleX:1.04,scaleY:.94,gripX:-3,gripY:-106},
      end:{angle:.77,lean:.30,x:12,y:8,scaleX:1.055,scaleY:.95,gripX:27,gripY:-53}}
  ];
  const REST_POSE = {angle:.84,lean:0,x:0,y:0,scaleX:1,scaleY:1,gripX:7,gripY:-65};
  // Complete painted poses: paws, fur, body and sword stay in the same image.
  // Source rectangles are intentionally nonuniform so every sword tip is intact.
  const KNIGHT_FRAMES = [
    [0,0,443,475,246,447,.382], [443,0,444,475,256,447,.4],
    [887,0,443,475,253,447,.4], [1330,0,444,475,242,447,.4],
    [0,475,443,412,229,348,.4], [443,475,467,412,261,349,.4],
    [910,475,420,412,230,352,.4], [1330,475,444,412,235,348,.4]
  ];
  // Every skin owns whole-character poses. Frame indices share the same
  // anticipation, contact and recovery timing; combat progress stays independent.
  const IKUN_FRAMES = [
    [0,0,443,475,309,426,.46], [443,0,444,475,266,427,.46],
    [887,0,443,475,204,427,.46], [1330,0,444,475,182,429,.46],
    [0,475,490,412,260,335,.46], [490,475,435,412,210,338,.46],
    [925,475,405,412,189,339,.46], [1330,475,444,412,265,342,.46]
  ];
  const HEROES = {
    wangguodong:{name:'王果冻',image:'assets/knight-cat.png',atlas:'assets/knight-attack-frames-v4.png',frames:KNIGHT_FRAMES},
    ikun:{name:'ikun骑士',image:'assets/ikun-knight.png',atlas:'assets/ikun-attack-frames-v1.png',frames:IKUN_FRAMES}
  };
  const FALLBACK = [
    { name: '风雨荒原', width: 2600, palette: { skyTop: '#17292e', skyBottom: '#69857d', ground: '#263832', accent: '#91c9a2' }, platforms: [{x:500,y:465,w:220,h:25},{x:1160,y:455,w:240,h:25},{x:1900,y:470,w:180,h:25}], enemies: [{type:'slime',x:520},{type:'wolf',x:820},{type:'slime',x:1110},{type:'bat',x:1430},{type:'wolf',x:1730},{type:'skeleton',x:2100}] },
    { name: '雾影古堡', width: 2800, palette: { skyTop: '#131b32', skyBottom: '#605e83', ground: '#2b2c41', accent: '#aeacff' }, platforms: [{x:450,y:475,w:240,h:25},{x:1060,y:430,w:260,h:25},{x:1720,y:465,w:240,h:25}], enemies: [{type:'skeleton',x:500},{type:'bat',x:800},{type:'wolf',x:1100},{type:'skeleton',x:1460},{type:'bat',x:1750},{type:'skeleton',x:2070},{type:'wolf',x:2360}] },
    { name: '熔火山径', width: 3000, palette: { skyTop: '#281d35', skyBottom: '#aa6552', ground: '#39292f', accent: '#fba866' }, platforms: [{x:510,y:470,w:220,h:25},{x:1160,y:440,w:280,h:25},{x:1960,y:470,w:260,h:25}], enemies: [{type:'wolf',x:520},{type:'slime',x:810},{type:'bat',x:1080},{type:'skeleton',x:1350},{type:'wolf',x:1680},{type:'bat',x:1910},{type:'skeleton',x:2260},{type:'wolf',x:2600}] },
    { name: '恶龙王座', width: 2600, palette: { skyTop: '#180f27', skyBottom: '#7e516b', ground: '#302334', accent: '#f6bc71' }, platforms: [{x:550,y:470,w:240,h:25},{x:1130,y:450,w:240,h:25}], enemies: [{type:'skeleton',x:660},{type:'wolf',x:1150},{type:'dragon',x:2200}] }
  ];

  class KnightGame {
    constructor(canvas, options) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.canvas.width = W; this.canvas.height = H;
      this.options = options || {};
      this.content = window.GAME_CONTENT || {};
      this.levels = this.content.levels || this.content.stages || FALLBACK;
      this.input = {}; this.pressed = {};
      this.audioEnabled = true;
      this.mode = 'menu'; this.paused = true; this.dead = false; this.won = false;
      this.stageIndex = 0; this.level = 1; this.xp = 0; this.gold = 0;
      this.upgrades = {weapon:0, armor:0, charm:0};
      this.comboEnergy = 50; this.time = 0; this.realTime = 0;
      this.camera = 0; this.shake = 0; this.flash = 0; this.hitstop = 0;
      this.particles = []; this.floaters = []; this.projectiles = []; this.hazards = [];
      this.stateClock = 0; this.lastTime = 0; this.destroyed = false;
      this.heroAssets={};
      for(const [id,hero] of Object.entries(HEROES)){
        const asset=this.heroAssets[id]={image:new Image(),atlas:new Image(),frames:hero.frames};
        asset.image.onerror=()=>{asset.imageFailed=true;if(this.heroId===id)this.heroImageUnavailable=true;};
        asset.atlas.onerror=()=>{asset.atlasFailed=true;if(this.heroId===id)this.attackImageUnavailable=true;};
        asset.image.src=hero.image;asset.atlas.src=hero.atlas;
      }
      this.setHero('ikun');
      this.princessImage = new Image();
      this.princessImage.src = 'assets/princess.png';
      this.princessImage.onerror = () => { this.princessImageUnavailable = true; };
      this._keyDown = e => this._key(e, true);
      this._keyUp = e => this._key(e, false);
      this._blur = () => { this.input = {}; this.pressed = {}; };
      window.addEventListener('keydown', this._keyDown);
      window.addEventListener('keyup', this._keyUp);
      window.addEventListener('blur', this._blur);
      this._loadStage(0, false);
      this.paused = true; this.mode = 'menu';
      this._loop = now => {
        if (this.destroyed) return;
        let dt = Math.min((now - (this.lastTime || now)) / 1000, .034);
        this.lastTime = now; this.realTime += dt;
        if (this.mode === 'play' && !this.paused && !this.dead && !this.won) this._update(dt);
        else this._updateEffects(dt * .45);
        this._draw();
        this.stateClock += dt;
        if (this.stateClock >= .1) { this.stateClock = 0; this._notify(); }
        this.pressed = {};
        this.raf = requestAnimationFrame(this._loop);
      };
      this.raf = requestAnimationFrame(this._loop);
    }

    _key(e, down) {
      const map = {KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',KeyW:'jump',ArrowUp:'jump',Space:'jump',KeyJ:'attack',KeyK:'dash',KeyE:'combo',KeyF:'interact'};
      const action = map[e.code];
      if (action && this.mode === 'play') { e.preventDefault(); this.setInput(action, down); }
    }

    setInput(action, pressed) {
      if (action === 'special' || action === 'ability') action = 'combo';
      if (action === 'moveLeft') action = 'left';
      if (action === 'moveRight') action = 'right';
      if (pressed && !this.input[action]) this.pressed[action] = true;
      this.input[action] = !!pressed;
      if (pressed) this._ensureAudio();
    }

    hasSave() {
      try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); return !!(s && s.version === 1 && Number.isFinite(s.stageIndex)); } catch (_) { return false; }
    }

    startNew() {
      this._ensureAudio();
      this.level = 1; this.xp = 0; this.gold = 0; this.time = 0;
      this.upgrades = {weapon:0, armor:0, charm:0}; this.comboEnergy = 50;
      this.dead = false; this.won = false; this.paused = false; this.mode = 'play';
      this._loadStage(0, true); this._save(); this._notify();
      this._event({type:'stageStart',stageIndex:0});
    }

    continueGame() {
      let s;
      try { s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (_) {}
      if (!s || s.version !== 1) { this.startNew(); return; }
      this.level = clamp(Number(s.level) || 1, 1, 30);
      this.xp = Math.max(0, Number(s.xp) || 0); this.gold = Math.max(0, Number(s.gold) || 0);
      this.upgrades = {weapon:clamp(Number(s.upgrades?.weapon)||0,0,8),armor:clamp(Number(s.upgrades?.armor)||0,0,8),charm:clamp(Number(s.upgrades?.charm)||0,0,8)};
      this.comboEnergy = clamp(Number(s.comboEnergy) || 50,0,100);
      this.mode = 'play'; this.paused = false; this.dead = false; this.won = false;
      const expanded=s.campaignVersion===3;
      const legacyMap=[0,3,8,11];
      const index=expanded?Math.max(0,this.levels.findIndex(l=>l.id===s.stageId)):(s.won?4:(legacyMap[s.stageIndex]||0));
      this._loadStage(clamp(index,0,this.levels.length-1),true,expanded?s.adventure:null);
      if (expanded && (s.cleared || s.won)) {
        this.enemies.forEach(e=>{e.hp=0;e.deadTimer=1;});
        this.stageKills=this.stageTotal;this.clearShown=true;this.gateEntered=true;
        this.player.x=this.stage.portalX||this.worldWidth-180;this.princess.x=this.player.x-80;
        this.camera=clamp(this.player.x-W*.35,0,this.worldWidth-W);
        if (s.won || this.stageIndex===this.levels.length-1) { this.won=true;this.paused=true;this._notify();this._event({type:'victory'}); }
        else { this._notify();this._event({type:'stageClear',stageIndex:this.stageIndex}); }
        return;
      }
      this._notify(); this._event({type:'stageStart',stageIndex:this.stageIndex});
      this._event({type:'toast',text:expanded?'已从最近的篝火继续 · 已完成的战区与探索进度保留':'旧版成长已保留 · 欢迎来到十二关扩展旅程'});
    }

    pause() { this.paused = true; this.input = {}; this.pressed = {}; this._notify(); }
    resume() { if (this.mode === 'play' && !this.dead && !this.won) { this.paused = false; this.lastTime = performance.now(); this._ensureAudio(); this._notify(); } }

    retry() {
      const progress=window.KnightAdventure?.serialize(this);
      this.mode = 'play'; this.dead = false; this.won = false; this.paused = false;
      this.comboEnergy = Math.max(50, this.comboEnergy);
      this._loadStage(this.stageIndex,true,progress); this._save(); this._notify();
      this._event({type:'toast',text:'王德敏：再试一次，我一直在你身边。'});
    }

    nextStage() {
      if (this.stageIndex >= this.levels.length - 1) return;
      this.mode = 'play'; this.dead = false; this.won = false; this.paused = false;
      this.comboEnergy = Math.max(55, this.comboEnergy);
      this._loadStage(this.stageIndex + 1,true); this._save(); this._notify();
      this._event({type:'stageStart',stageIndex:this.stageIndex});
    }

    exitToMenu() { this._save(); this.mode = 'menu'; this.paused = true; this.input = {}; this.pressed = {}; this._notify(); }

    buyUpgrade(key) {
      if (!Object.prototype.hasOwnProperty.call(this.upgrades,key)) return {ok:false,reason:'未知装备'};
      const info = this.content.upgrades?.[key] || {maxLevel:4,costs:key==='weapon'?[35,70,120,180]:key==='armor'?[30,60,100,160]:[40,80,130,190]};
      const n = this.upgrades[key], max = info.maxLevel || 4;
      if (n >= max) return {ok:false,reason:'已达到最高等级'};
      const cost = info.costs?.[n] ?? Math.round((info.baseCost || 35) * Math.pow(info.costScale || 1.7,n));
      if (this.gold < cost) return {ok:false,reason:'金币不足'};
      const previousMax = this._stats().maxHp;
      this.gold -= cost; this.upgrades[key]++;
      this.player.hp = Math.min(this._stats().maxHp,this.player.hp+this._stats().maxHp-previousMax);
      this._save(); this._notify(); this._sound('upgrade');
      return {ok:true,reason:'升级成功'};
    }

    setAudio(enabled) { this.audioEnabled = !!enabled; if (enabled) this._ensureAudio(); }

    setHero(id) {
      if(!Object.prototype.hasOwnProperty.call(HEROES,id))return false;
      const hero=HEROES[id],asset=this.heroAssets[id];
      if(!hero||!asset)return false;
      this.heroId=id;this.heroName=hero.name;this.knightFrames=asset.frames;
      this.heroImage=asset.image;this.attackImage=asset.atlas;
      this.heroImageUnavailable=!!asset.imageFailed;this.attackImageUnavailable=!!asset.atlasFailed;
      this.bodyImage=this.attackImage;this.furImage=this.heroImage;
      if(this.player)this._notify();
      return true;
    }

    _stats() {
      return {attack:18 + this.upgrades.weapon*9 + (this.level-1)*3,defense:this.upgrades.armor*2,maxHp:100+this.upgrades.armor*25+(this.level-1)*10};
    }

    getState() {
      const stats = this._stats(), boss = this.enemies?.find(e=>(e.type==='dragon'||e.boss) && !e.dormant && e.hp>0);
      return {heroId:this.heroId,heroName:this.heroName,hp:Math.max(0,Math.ceil(this.player?.hp || 0)),maxHp:stats.maxHp,level:this.level,xp:this.xp,xpToNext:this.level*45,gold:this.gold,stageIndex:this.stageIndex,stageCount:this.levels.length,stageName:this.stage?.name || '',stageKills:this.stageKills || 0,stageTotal:this.stageTotal || 0,enemiesRemaining:this.enemies?.filter(e=>e.hp>0).length || 0,comboEnergy:Math.floor(this.comboEnergy),boss:boss?{hp:Math.max(0,Math.ceil(boss.hp)),maxHp:boss.maxHp,name:boss.name||'灰烬恶龙 · 格里莫',final:boss.type==='dragon'}:null,adventure:window.KnightAdventure?.state(this),upgrades:{...this.upgrades},stats:{attack:stats.attack,defense:stats.defense},paused:this.paused,dead:this.dead,won:this.won};
    }

    _notify() { if (typeof this.options.onState === 'function') this.options.onState(this.getState()); }
    _event(event) { if (typeof this.options.onEvent === 'function') this.options.onEvent(event); }

    _save() {
      if (this.mode === 'menu' && !this.started) return;
      try { localStorage.setItem(SAVE_KEY,JSON.stringify({version:1,campaignVersion:3,stageId:this.stage.id,stageIndex:this.stageIndex,level:this.level,xp:this.xp,gold:this.gold,upgrades:this.upgrades,comboEnergy:this.comboEnergy,adventure:window.KnightAdventure?.serialize(this),cleared:this.gateEntered||this.won,won:this.won})); } catch (_) {}
    }

    _loadStage(index, active, progress=null) {
      this.stageIndex = index; this.stage = this.levels[index] || FALLBACK[index] || FALLBACK[0];
      this.worldWidth = this.stage.width || 2800;
      this.platforms = this.stage.platforms || [];
      this.player = {x:140,y:GROUND,vx:0,vy:0,facing:1,hp:this._stats().maxHp,onGround:true,jumps:0,coyote:.12,invuln:0,attack:null,attackBuffer:0,attackTimer:0,attackCooldown:0,attackCombo:0,lastAttack:-2,dashTimer:0,dashCooldown:0,run:0,landing:0,recoil:0};
      this.princess = {x:70,y:GROUND-12,facing:1,castTimer:.7,castGlow:0};
      this.stageKills = 0; this.gateEntered = false; this.clearShown = false; this.endingDelay = 0;this.rescuing=false;
      this.enemies = (this.stage.enemies || FALLBACK[index]?.enemies || []).map((e,i)=>this._makeEnemy(e,i));
      this.stageTotal = this.enemies.length;
      this.projectiles = []; this.hazards = []; this.particles = []; this.floaters = [];
      this.camera = 0; this.shake = 0; this.flash = 0; this.hitstop = 0;
      this.input = {}; this.pressed = {};
      window.KnightAdventure?.init(this,progress);
      if(progress && (!progress.stageId || progress.stageId===this.stage.id) && Number.isFinite(progress.checkpointX)){
        this.player.x=clamp(progress.checkpointX,35,this.worldWidth-180);this.princess.x=this.player.x-80;
        this.camera=clamp(this.player.x-W*.35,0,this.worldWidth-W);
      }
      if (active) this.started = true;
    }

    _makeEnemy(config, id) {
      const type = config.type || 'slime';
      const base = ({slime:42,wolf:58,bat:34,skeleton:72,dragon:1600})[type] || 45;
      const hp=Math.round((base+this.stageIndex*(type==='dragon'?0:11))*(config.hpScale||1)*(config.elite?1.65:1));
      return {id,type,name:config.name,elite:!!config.elite,boss:!!config.boss,encounter:config.encounter,damageScale:config.damageScale||1,x:config.x || 500,y:type==='bat'?GROUND-112:GROUND,baseX:config.x || 500,vx:0,vy:0,maxHp:hp,hp,facing:-1,phase:rand(0,6.28),timer:rand(.7,1.9),hitFlash:0,knockback:0,attack:0,tell:0,action:'idle',actionCount:0,homeX:config.x||500,deadTimer:0};
    }

    _update(dt) {
      this.time += dt;
      this.shake = Math.max(0,this.shake-dt*25); this.flash = Math.max(0,this.flash-dt*2.8);
      this._updateEffects(dt);
      const p = this.player;
      // Keep a short tap made during impact freeze or recovery for the next swing.
      p.attackBuffer=this.pressed.attack ? .18 : Math.max(0,p.attackBuffer-dt);
      if (this.hitstop > 0) { this.hitstop -= dt; return; }
      p.invuln = Math.max(0,p.invuln-dt); p.attackCooldown = Math.max(0,p.attackCooldown-dt);
      p.landing=Math.max(0,p.landing-dt);p.recoil=Math.max(0,p.recoil-dt*10);
      p.dashCooldown = Math.max(0,p.dashCooldown-dt);
      p.dashTimer = Math.max(0,p.dashTimer-dt);
      const axis = (this.input.right?1:0)-(this.input.left?1:0);
      if (axis && !p.attack) p.facing = axis;
      if (this.pressed.jump && (p.jumps<2 || p.coyote>0)) {
        if (!p.onGround && p.coyote<=0 && p.jumps===0) p.jumps=1;
        p.vy = p.jumps ? -555 : -595; p.jumps++; p.onGround=false; p.coyote=0;
        this._burst(p.x,p.y,9,'#c8d9b5',110); this._sound('jump');
      }
      if (this.pressed.dash && p.dashCooldown<=0) {
        p.attack=null;p.attackTimer=0;p.attackCooldown=0;p.attackBuffer=0;
        if(axis)p.facing=axis;
        p.dashTimer = .19; p.dashCooldown = .85; p.invuln=Math.max(p.invuln,.24); p.vy*=.2;
        this._sound('dash');
      }
      const chainReady=p.attack && p.attack.index<2 && p.attack.elapsed>=p.attack.chainAt;
      if ((p.attackBuffer>0 || this.input.attack) && (!p.attack && p.attackCooldown<=0 || chainReady) && p.dashTimer<=0) this._attack();
      if (this.pressed.combo) {
        if (this.comboEnergy>=100) this._combinedAttack();
        else this._event({type:'toast',text:'合击能量尚未蓄满 · 攻击和击败敌人可充能'});
      }
      if (p.dashTimer>0) {
        p.vx=p.facing*780;
        if (Math.random()<.65) this.particles.push({x:p.x,y:p.y-34,vx:-p.facing*45,vy:0,life:.24,max:.24,size:24,color:'#f4e9c4',kind:'ghost'});
      } else {
        const control=p.attack?(p.attack.elapsed<p.attack.windup ? .48 : .72):1;
        p.vx=lerp(p.vx,axis*280*control,Math.min(1,dt*(p.onGround?16:8)));
      }
      const beforeY=p.y,wasGrounded=p.onGround,fallSpeed=p.vy;
      const active=p.attack && p.attack.elapsed>=p.attack.windup && p.attack.elapsed<p.attack.windup+p.attack.active;
      const thrust=active && p.onGround?SWINGS[p.attack.index].push*Math.sin(Math.PI*(p.attack.elapsed-p.attack.windup)/p.attack.active)*p.attack.facing:0;
      p.vy += (p.dashTimer>0?320:1530)*dt;
      p.x=clamp(p.x+(p.vx+thrust)*dt,26,this.worldWidth-30); p.y+=p.vy*dt;
      p.onGround=false;
      if (p.y>=GROUND) {p.y=GROUND;p.vy=0;p.onGround=true;p.jumps=0;}
      for (const platform of this.platforms) {
        if (p.vy>=0 && beforeY<=platform.y+6 && p.y>=platform.y && p.x+19>platform.x && p.x-19<platform.x+platform.w) {
          p.y=platform.y;p.vy=0;p.onGround=true;p.jumps=0;
        }
      }
      if(p.onGround && !wasGrounded && fallSpeed>180)p.landing=.18;
      if (p.onGround) p.coyote=.1; else p.coyote=Math.max(0,p.coyote-dt);
      p.run += Math.abs(p.vx)*dt*.035;
      if (p.onGround && Math.abs(p.vx)>80 && Math.random()<.2) this._burst(p.x-p.facing*15,p.y-1,1,'#a5afa3',35);
      this.comboEnergy=clamp(this.comboEnergy+dt*(.9+this.upgrades.charm*.16),0,100);
      window.KnightAdventure?.update(this,dt);
      this._updateAttack(dt);
      this._updatePrincess(dt);
      for (const enemy of this.enemies) this._updateEnemy(enemy,dt);
      this._updateProjectiles(dt);
      this._updateHazards(dt);
      const desired=clamp(p.x-W*.35,0,this.worldWidth-W);
      this.camera=lerp(this.camera,desired,Math.min(1,dt*5));
      if (this.enemies.every(e=>e.hp<=0)) {
        if(this.stageIndex===this.levels.length-1){
          this.projectiles=this.projectiles.filter(b=>b.friendly);this.hazards=[];
          p.invuln=Math.max(p.invuln,3);
        }
        if (!this.clearShown) { this.clearShown=true; this._save(); this._event({type:'toast',text:this.stageIndex===this.levels.length-1?'恶龙倒下了 · 完成誓灯后，到右侧囚笼按 F 解救王子':'战区已全部清理 · 完成沿途誓灯与碎片，前往光门'}); this._sound('clear'); }
        if (this.stageIndex===this.levels.length-1 && (!window.KnightAdventure || window.KnightAdventure.canExit(this))) {
          if(this.pressed.interact && Math.abs(p.x-(this.worldWidth-160))<120){this.rescuing=true;this._burst(this.worldWidth-160,GROUND-65,40,'#f5dfaa',180);this._sound('clear');}
          if(this.rescuing)this.endingDelay+=dt;
          if(this.endingDelay>2.2){this.won=true;this.paused=true;this._save();this._notify();this._event({type:'victory'});}
        } else if (this.stageIndex<this.levels.length-1 && !this.gateEntered && this.pressed.interact && Math.abs(p.x-(this.stage.portalX || this.worldWidth-130))<110 && (!window.KnightAdventure || window.KnightAdventure.canExit(this))) {
          this.gateEntered=true;this._save();this._event({type:'stageClear',stageIndex:this.stageIndex});
        }
      }
    }

    _attack() {
      const p=this.player;
      const from=p.attack?this._attackPose(p.attack):{...REST_POSE};
      const fromFrame=p.attack?this._knightFrame(p.attack):(p.idleFrame||0);
      p.attackCombo=this.time-p.lastAttack<.85?(p.attackCombo+1)%3:0;p.lastAttack=this.time;
      const swing=SWINGS[p.attackCombo],axis=(this.input.right?1:0)-(this.input.left?1:0);
      if(axis)p.facing=axis;
      const duration=swing.windup+swing.active+swing.recovery;
      p.attack={index:p.attackCombo,elapsed:0,duration,windup:swing.windup,active:swing.active,recovery:swing.recovery,chainAt:swing.chainAt,facing:p.facing,hits:new Set(),connected:false,fromAngle:from.angle,fromPose:from,fromFrame,sounded:false};
      p.attackTimer=duration;p.attackCooldown=duration;p.attackBuffer=0;
    }

    _attackPose(attack,elapsed=attack.elapsed) {
      const s=SWINGS[attack.index],from=attack.fromPose||REST_POSE;
      let a,b,t;
      if(elapsed<s.windup){a=from;b=s.ready;t=smooth(elapsed/s.windup);}
      else if(elapsed<s.windup+s.active){a=s.ready;b=s.end;t=1-Math.pow(1-clamp((elapsed-s.windup)/s.active,0,1),3);}
      else{a=s.end;b=REST_POSE;t=smooth((elapsed-s.windup-s.active)/s.recovery);}
      const pose={};for(const key of Object.keys(REST_POSE))pose[key]=lerp(a[key],b[key],t);
      return pose;
    }

    _updateAttack(dt) {
      const p=this.player,a=p.attack;if(!a)return;
      const previous=a.elapsed;a.elapsed=Math.min(a.duration,a.elapsed+dt);
      p.attackTimer=Math.max(0,a.duration-a.elapsed);
      if(a.elapsed>=a.windup && previous<a.windup+a.active){
        if(!a.sounded){this._sound(a.index===2?'heavySword':'sword');a.sounded=true;}
        if(a.elapsed>=a.windup+a.active*.38)this._strike(a);
      }
      if(a.elapsed>=a.duration){p.idleFrame=7;p.attack=null;p.attackTimer=0;p.attackCooldown=0;}
    }

    _strike(attack) {
      const p=this.player,s=SWINGS[attack.index];
      let hits=0;
      for(const e of this.enemies){
        if(e.hp<=0 || e.dormant || attack.hits.has(e.id))continue;
        const dx=e.x-p.x,dy=(e.y-(e.type==='dragon'?95:e.type==='bat'?10:28))-(p.y-38);
        const extent=e.type==='dragon'?92:24;
        if(dx*attack.facing>-extent-13 && dx*attack.facing<s.reach+extent && Math.abs(dy)<(e.type==='dragon'?155:82)){
          attack.hits.add(e.id);this._damageEnemy(e,this._stats().attack*s.power,attack.facing*(attack.index===2?220:130));hits++;
          this._burst(p.x+attack.facing*Math.min(Math.abs(dx),s.reach-10),p.y-45,attack.index===2?11:5,'#fff0bc',attack.index===2?210:125);
        }
      }
      if(hits){
        this.comboEnergy=clamp(this.comboEnergy+(attack.connected?0:3)+hits*1.5,0,100);attack.connected=true;
        this.hitstop=Math.max(this.hitstop,s.stop);this.shake=Math.max(this.shake,s.shake);p.recoil=attack.index===2?1:.55;
      }
    }

    _combinedAttack() {
      this.comboEnergy=0;this.player.invuln=Math.max(this.player.invuln,1.1);this.princess.castGlow=1;
      this.flash=.35;this.shake=8;this._sound('combo');
      this._floater(this.player.x,this.player.y-130,'星辉 · 双人合击','#ffe6a1',30);
      for(const e of this.enemies){if(e.hp>0 && !e.dormant && Math.abs(e.x-this.player.x)<600){this._damageEnemy(e,45+this._stats().attack+this.upgrades.charm*8,e.x>this.player.x?220:-220);this._burst(e.x,e.y-35,26,'#efd5ff',220);}}
      for(let i=0;i<38;i++)this.particles.push({x:this.player.x+rand(-500,500),y:GROUND-rand(10,320),vx:rand(-30,30),vy:rand(-120,-40),life:1,max:1,size:rand(2,7),color:i%2?'#ddbefa':'#ffe9a8',kind:'star'});
      this.projectiles=this.projectiles.filter(b=>b.friendly);
    }

    _updatePrincess(dt) {
      const c=this.princess,p=this.player,targetX=clamp(p.x-p.facing*91,30,this.worldWidth-30);
      c.x=lerp(c.x,targetX,Math.min(1,dt*3.6));c.y=lerp(c.y,p.y-8,Math.min(1,dt*4));c.facing=p.facing;
      c.castGlow=Math.max(0,c.castGlow-dt);c.castTimer-=dt;
      const targets=this.enemies.filter(e=>e.hp>0 && !e.dormant && Math.abs(e.x-p.x)<550).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x));
      if(c.castTimer<=0 && targets.length){
        const target=targets[0],from={x:c.x+c.facing*22,y:c.y-55},to={x:target.x,y:target.y-(target.type==='dragon'?100:28)};
        const angle=Math.atan2(to.y-from.y,to.x-from.x);
        this.projectiles.push({x:from.x,y:from.y,vx:Math.cos(angle)*490,vy:Math.sin(angle)*490,r:6,life:2.1,friendly:true,targetId:target.id,damage:7+this.upgrades.charm*3+(this.level-1)});
        c.castTimer=Math.max(.75,1.35-this.upgrades.charm*.07);c.castGlow=.3;
      }
    }

    _updateEnemy(e,dt) {
      if(e.dormant)return;
      e.hitFlash=Math.max(0,e.hitFlash-dt);e.knockback=lerp(e.knockback,0,Math.min(1,dt*8));
      if(e.hp<=0){e.deadTimer+=dt;return;}
      const p=this.player,dx=p.x-e.x;
      if(Math.abs(dx)>1050)return;
      e.facing=dx>=0?1:-1;e.phase+=dt;e.timer-=dt;
      if(e.type==='dragon'){this._updateDragon(e,dt);return;}
      let speed=0;
      if(e.type==='bat'){
        e.x+=(Math.abs(dx)>35?e.facing*75:0)*dt+e.knockback*dt;
        e.y=GROUND-98+Math.sin(e.phase*2.7)*32;
        if(e.timer<=0 && Math.abs(dx)<630){
          const a=Math.atan2((p.y-35)-(e.y-10),p.x-e.x);
          this.projectiles.push({x:e.x,y:e.y-10,vx:Math.cos(a)*200,vy:Math.sin(a)*200,r:8,life:4,friendly:false,damage:8*e.damageScale,kind:'orb'});
          e.timer=2.8;this._burst(e.x,e.y-15,5,'#cfb3eb',75);
        }
      }else{
        if(e.type==='slime'){
          if(e.timer<=0 && Math.abs(dx)<720){e.vy=-330;e.timer=1.45;}
          speed=Math.abs(dx)>42?e.facing*(e.y<GROUND?110:22):0;
          e.vy+=1100*dt;e.y=Math.min(GROUND,e.y+e.vy*dt);if(e.y===GROUND)e.vy=0;
        }else if(e.type==='wolf'){
          speed=Math.abs(dx)>52?e.facing*140:0;
          if(e.timer<=0 && Math.abs(dx)<320){e.tell=e.elite?.65:.45;e.timer=e.elite?2.3:2;}
          if(e.tell>0){speed=0;e.tell-=dt;if(e.tell<=0)e.attack=e.elite?.48:.35;}
          if(e.attack>0){e.attack-=dt;speed=e.facing*(e.elite?370:300);}
        }else{
          speed=Math.abs(dx)>73?e.facing*62:0;
          if(e.timer<=0 && Math.abs(dx)<(e.elite?380:170)){e.tell=e.elite?.9:.65;e.timer=e.elite?2.8:2.1;}
          if(e.tell>0){speed=0;e.tell-=dt;if(e.tell<=0){
            if(Math.abs(dx)<145 && Math.abs(p.y-e.y)<78)this._damagePlayer(12*e.damageScale,e.facing*240);
            if(e.elite){for(const offset of [-.18,0,.18]){const a=Math.atan2(p.y-35-(e.y-60),dx)+offset;this.projectiles.push({x:e.x,y:e.y-60,vx:Math.cos(a)*210,vy:Math.sin(a)*210,r:7,life:3.5,friendly:false,damage:10*e.damageScale,kind:'orb'});}}
          }}
        }
        e.x=clamp(e.x+(speed+e.knockback)*dt,35,this.worldWidth-55);
      }
      const reach=e.type==='wolf'?42:34;
      if(Math.abs(p.x-e.x)<reach && Math.abs((p.y-36)-(e.y-25))<49)this._damagePlayer((e.type==='wolf'?11:8)*e.damageScale,e.facing*200);
    }

    _updateDragon(e,dt) {
      const p=this.player;
      if(Math.abs(p.x-e.x)>830 && e.action==='idle')return;
      if(e.action==='idle' && e.timer<=0){
        const moves=['fire','quake','lunge'];e.action=moves[e.actionCount%3];e.actionCount++;e.tell=e.hp<e.maxHp*.45?.85:1.1;e.timer=0;
        e.targetX=clamp(p.x,145,this.worldWidth-250);
        this._floater(e.x,e.y-252,e.action==='fire'?'烈焰吐息':e.action==='quake'?'大地震击':'恶龙突袭','#ffd4a1',20);
      }
      if(e.tell>0){
        e.tell-=dt;
        if(e.tell<=0){
          if(e.action==='fire'){
            const mouthX=e.x+e.facing*88,mouthY=e.y-126;
            for(let i=0;i<5;i++){
              const a=Math.atan2(p.y-28-mouthY,p.x-mouthX)+(i-2)*.115;
              this.projectiles.push({x:mouthX,y:mouthY,vx:Math.cos(a)*(265+i*15),vy:Math.sin(a)*(265+i*15),r:12,life:5,friendly:false,damage:15,kind:'fire'});
            }
            this._burst(mouthX,mouthY,20,'#ffad52',170);this._sound('dragon');e.action='idle';e.timer=e.hp<e.maxHp*.45?1.35:2;
          }else if(e.action==='quake'){
            for(let i=-1;i<=1;i++)this.hazards.push({x:clamp(e.targetX+i*145,40,this.worldWidth-40),y:GROUND,w:88,tell:.75+Math.abs(i)*.15,life:.52,kind:'pillar',hit:false});
            this.shake=9;e.action='idle';e.timer=2;this._sound('dragon');
          }else{e.lungeTime=.6;e.lungeStart=e.x;e.lungeEnd=clamp(e.targetX+e.facing*60,300,this.worldWidth-200);}
        }
      }
      if(e.action==='lunge' && e.lungeTime>0){
        e.lungeTime-=dt;const progress=1-clamp(e.lungeTime/.6,0,1);e.x=lerp(e.lungeStart,e.lungeEnd,1-Math.pow(1-progress,2));
        if(Math.random()<.5)this._burst(e.x,GROUND,2,'#d3a187',100);
        if(e.lungeTime<=0){e.action='idle';e.timer=2.1;}
      }
      if(Math.abs(p.x-e.x)<87 && p.y>e.y-150)this._damagePlayer(e.action==='lunge'?20:13,e.facing*280);
    }

    _updateProjectiles(dt) {
      for(const b of this.projectiles){
        b.life-=dt;
        if(b.friendly){
          const target=this.enemies.find(e=>e.id===b.targetId && !e.dormant && e.hp>0);
          if(target){const a=Math.atan2(target.y-(target.type==='dragon'?100:25)-b.y,target.x-b.x);b.vx=lerp(b.vx,Math.cos(a)*490,Math.min(1,dt*7));b.vy=lerp(b.vy,Math.sin(a)*490,Math.min(1,dt*7));}
        }
        b.x+=b.vx*dt;b.y+=b.vy*dt;
        if(Math.random()<.35)this.particles.push({x:b.x,y:b.y,vx:-b.vx*.05,vy:-b.vy*.05,life:.25,max:.25,size:b.friendly?3:4,color:b.friendly?'#d6b4ff':'#ffb566',kind:'spark'});
        if(b.friendly){
          for(const e of this.enemies){if(e.hp>0 && !e.dormant && Math.abs(b.x-e.x)<(e.type==='dragon'?88:28) && Math.abs(b.y-(e.y-(e.type==='dragon'?90:26)))<(e.type==='dragon'?100:38)){this._damageEnemy(e,b.damage,25);b.life=0;this.comboEnergy=clamp(this.comboEnergy+1,0,100);break;}}
        }else if(Math.abs(b.x-this.player.x)<b.r+17 && Math.abs(b.y-(this.player.y-36))<b.r+31){this._damagePlayer(b.damage,b.vx>0?190:-190);b.life=0;}
        if(b.x<0 || b.x>this.worldWidth || b.y>GROUND+70)b.life=0;
      }
      this.projectiles=this.projectiles.filter(b=>b.life>0);
    }

    _updateHazards(dt) {
      for(const h of this.hazards){
        if(h.tell>0){h.tell-=dt;if(h.tell<=0){this._burst(h.x,GROUND,13,'#ffbd7b',160);this.shake=Math.max(this.shake,4);}}
        else{h.life-=dt;if(Math.abs(this.player.x-h.x)<h.w*.5+16 && this.player.y>GROUND-126)this._damagePlayer(17,this.player.x>h.x?220:-220);}
      }
      this.hazards=this.hazards.filter(h=>h.tell>0 || h.life>0);
    }

    _damageEnemy(e,damage,knockback) {
      if(e.hp<=0 || e.dormant)return;
      e.hp-=damage;e.hitFlash=.15;e.knockback=e.type==='dragon'?0:knockback;
      this._floater(e.x+rand(-8,8),e.y-(e.type==='dragon'?155:62),String(Math.round(damage)),damage>40?'#ffe5a1':'#fff1ce',damage>40?26:20);
      this._burst(e.x,e.y-(e.type==='dragon'?80:28),6,e.type==='dragon'?'#edb98a':'#e4d8ac',140);
      if(e.hp<=0){
        e.hp=0;this.stageKills++;
        const reward=(e.type==='dragon'?220:e.type==='skeleton'?14:e.type==='wolf'?12:10)*(e.boss?4:e.elite?2:1);
        this.gold+=reward;this.xp+=e.type==='dragon'?90:18+this.stageIndex*3;
        this.comboEnergy=clamp(this.comboEnergy+(e.type==='dragon'?30:8),0,100);
        this._floater(e.x,e.y-90,'+'+reward+' 金币','#efcd70',18);
        this._burst(e.x,e.y-35,e.type==='dragon'?70:16,e.type==='dragon'?'#ffc789':'#cce0b7',e.type==='dragon'?330:180);
        this._sound(e.type==='dragon'?'clear':'coin');
        if(e.type==='dragon'){this.shake=16;this.flash=.45;this.hitstop=.15;}
        this._levelUp();this._save();this._notify();
      }else this._sound('hit');
    }

    _levelUp() {
      while(this.xp>=this.level*45){
        this.xp-=this.level*45;this.level++;this.player.hp=this._stats().maxHp;
        this._burst(this.player.x,this.player.y-30,30,'#e4dca0',200);
        this._floater(this.player.x,this.player.y-120,'升级！ Lv.'+this.level,'#ffe6a0',29);
        this._event({type:'toast',text:'升至 '+this.level+' 级！生命恢复，攻击提升'});this._sound('upgrade');
      }
    }

    _damagePlayer(damage,knockback) {
      const p=this.player;
      const finalBattleCleared=this.stageIndex===this.levels.length-1 && this.enemies.length>0 && this.enemies.every(e=>e.hp<=0);
      if(p.invuln>0 || this.dead || this.won || finalBattleCleared)return;
      const amount=Math.max(2,Math.round(damage-this._stats().defense));
      p.hp-=amount;p.invuln=1.05;p.vx=knockback;p.recoil=1;p.x=clamp(p.x+knockback*.08,26,this.worldWidth-30);
      this.shake=6;this.flash=.12;this._floater(p.x,p.y-82,'−'+amount,'#ffb4a5',22);this._sound('hurt');
      this._burst(p.x,p.y-35,8,'#f2c2a4',130);
      if(p.hp<=0){p.hp=0;this.dead=true;this.paused=true;this._save();this._notify();this._event({type:'death'});}
    }

    _burst(x,y,count,color,speed) { for(let i=0;i<count;i++){const a=rand(0,Math.PI*2),v=rand(speed*.25,speed);this.particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-35,life:rand(.25,.7),max:.7,size:rand(2,5),color,kind:'spark'});} }
    _floater(x,y,text,color,size){this.floaters.push({x,y,text,color,size,life:1.1,max:1.1});}
    _updateEffects(dt){
      for(const p of this.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.kind!=='ghost')p.vy+=180*dt;}
      this.particles=this.particles.filter(p=>p.life>0).slice(-420);
      for(const f of this.floaters){f.life-=dt;f.y-=38*dt;}this.floaters=this.floaters.filter(f=>f.life>0);
    }

    _ensureAudio() {
      if(!this.audioEnabled)return;
      try{if(!this.audio){const AC=window.AudioContext||window.webkitAudioContext;if(AC)this.audio=new AC();}if(this.audio?.state==='suspended')this.audio.resume();}catch(_){}
    }
    _sound(kind){
      if(!this.audioEnabled || !this.audio || this.audio.state!=='running')return;
      const sounds={jump:[290,510,.1,'sine',.025],dash:[170,65,.12,'triangle',.035],sword:[570,110,.1,'triangle',.025],hit:[160,70,.08,'triangle',.035],hurt:[180,62,.2,'sawtooth',.025],coin:[710,1130,.12,'sine',.025],upgrade:[520,1040,.4,'sine',.035],combo:[340,900,.45,'triangle',.04],clear:[540,1080,.5,'sine',.04],dragon:[100,40,.4,'sawtooth',.03]};
      sounds.heavySword=[330,60,.16,'triangle',.038];
      const s=sounds[kind]||sounds.hit;
      try{const t=this.audio.currentTime,o=this.audio.createOscillator(),g=this.audio.createGain();o.type=s[3];o.frequency.setValueAtTime(s[0],t);o.frequency.exponentialRampToValueAtTime(s[1],t+s[2]);g.gain.setValueAtTime(s[4],t);g.gain.exponentialRampToValueAtTime(.001,t+s[2]);o.connect(g);g.connect(this.audio.destination);o.start(t);o.stop(t+s[2]);}catch(_){}
    }

    _draw() {
      const c=this.ctx;c.clearRect(0,0,W,H);
      this._drawBackground(c);
      c.save();c.translate(-Math.round(this.camera)+(this.shake?rand(-this.shake,this.shake):0),this.shake?rand(-this.shake*.4,this.shake*.4):0);
      this._drawTerrain(c);
      window.KnightAdventure?.draw(this,c);
      this._drawPortal(c);
      for(const h of this.hazards)this._drawHazard(c,h);
      for(const e of this.enemies)if(!e.dormant && (e.hp>0 || e.deadTimer<.38))this._drawEnemy(c,e);
      this._drawPrincess(c);
      this._drawPlayer(c);
      for(const b of this.projectiles)this._drawProjectile(c,b);
      this._drawEffects(c);
      if(this.stageIndex===this.levels.length-1)this._drawPrince(c);
      c.restore();
      this._drawAtmosphere(c);
      if(this.flash>0){c.fillStyle='rgba(255,235,195,'+this.flash*.5+')';c.fillRect(0,0,W,H);}
      const vignette=c.createRadialGradient(W*.5,H*.44,230,W*.5,H*.44,760);vignette.addColorStop(0,'rgba(8,12,20,0)');vignette.addColorStop(1,'rgba(5,8,15,.4)');c.fillStyle=vignette;c.fillRect(0,0,W,H);
      if(this.mode==='play' && !this.paused && !this.dead && !this.won)this._drawWorldHints(c);
    }

    _drawBackground(c) {
      const pal=this.stage.palette||FALLBACK[this.stageIndex]?.palette||FALLBACK[0].palette;
      const theme=this.stage.theme||['rain','castle','volcano','throne'][this.stageIndex%4];
      const sky=c.createLinearGradient(0,0,0,H);sky.addColorStop(0,pal.skyTop||'#152831');sky.addColorStop(1,pal.skyBottom||'#667e76');c.fillStyle=sky;c.fillRect(0,0,W,H);
      const t=this.realTime,cam=this.camera;
      c.save();c.globalAlpha=.25;c.fillStyle=theme==='volcano'?'#ffd8a2':theme==='snow'?'#d8f1f4':'#f1f1d5';c.beginPath();c.arc(1030-cam*.06,144,theme==='throne'?58:44,0,Math.PI*2);c.fill();c.restore();
      for(let layer=0;layer<3;layer++){
        const baseline=435+layer*58,offset=(cam*(.11+layer*.12))%520;
        c.fillStyle=['rgba(24,32,46,.3)','rgba(23,31,42,.4)','rgba(18,29,34,.52)'][layer];
        c.beginPath();c.moveTo(-560,baseline+180);
        for(let x=-560;x<W+560;x+=130){const y=baseline-60-Math.sin((x+layer*343)/220)*72-Math.sin((x+layer*167)/81)*22;c.lineTo(x-offset,y);}
        c.lineTo(W+560,H);c.lineTo(-560,H);c.closePath();c.fill();
      }
      if(['rain','forest','swamp'].includes(theme)){
        c.fillStyle='rgba(22,40,40,.65)';
        for(let i=-1;i<11;i++){let x=i*185-(cam*.42)%185;const base=560,h=130+(i%3)*35;c.fillRect(x,base-h,10,h);for(let j=0;j<3;j++){c.beginPath();c.moveTo(x-43+j*4,base-25-j*40);c.lineTo(x+5,base-h-30-j*5);c.lineTo(x+55-j*4,base-25-j*40);c.fill();}}
      }else if(['castle','ruins','fortress'].includes(theme)){
        c.fillStyle='rgba(27,26,45,.72)';
        for(let i=-1;i<8;i++){const x=i*260-(cam*.35)%260;const h=145+(i%3)*43;c.fillRect(x,560-h,115,h);for(let j=0;j<4;j++)c.fillRect(x+j*32-3,550-h,20,23);c.fillStyle='rgba(203,178,133,.22)';for(let j=0;j<3;j++)c.fillRect(x+26,565-h+j*45,17,24);c.fillStyle='rgba(27,26,45,.72)';}
      }else if(theme==='volcano'){
        c.fillStyle='rgba(47,31,41,.7)';for(let i=-1;i<7;i++){let x=i*310-(cam*.3)%310;c.beginPath();c.moveTo(x-170,570);c.lineTo(x+20,215+(i%3)*40);c.lineTo(x+235,570);c.fill();c.strokeStyle='rgba(247,151,95,.35)';c.lineWidth=4;c.beginPath();c.moveTo(x+20,260+(i%3)*40);c.lineTo(x+50,345);c.lineTo(x+18,400);c.lineTo(x+84,510);c.stroke();}
      }else if(theme==='snow'){
        for(let i=-1;i<7;i++){const x=i*295-(cam*.28)%295,y=190+(i%3)*43;c.fillStyle='#738d9a';c.beginPath();c.moveTo(x-180,590);c.lineTo(x+10,y);c.lineTo(x+218,590);c.fill();c.fillStyle='#d6e4e4';c.beginPath();c.moveTo(x+10,y);c.lineTo(x-55,y+132);c.lineTo(x+3,y+93);c.lineTo(x+31,y+133);c.lineTo(x+64,y+104);c.lineTo(x+89,y+148);c.fill();}
      }else if(theme==='mine'){
        c.fillStyle='rgba(18,32,42,.7)';c.beginPath();c.moveTo(0,0);for(let i=0;i<14;i++){const x=i*110-(cam*.25)%110;c.lineTo(x,120+(i%3)*43);c.lineTo(x+51,270+(i%2)*65);c.lineTo(x+80,130);}c.lineTo(W,0);c.fill();
        for(let i=-1;i<7;i++){const x=i*260-(cam*.4)%260;c.strokeStyle='rgba(72,101,111,.55)';c.lineWidth=18;c.beginPath();c.moveTo(x,590);c.lineTo(x+26,310);c.lineTo(x+191,310);c.lineTo(x+220,590);c.stroke();c.fillStyle='rgba(130,213,228,.19)';c.beginPath();c.moveTo(x+100,570);c.lineTo(x+112,490);c.lineTo(x+146,534);c.lineTo(x+135,570);c.fill();}
      }else if(theme==='sky'){
        for(let i=-1;i<7;i++){const x=i*300-(cam*.23)%300,y=330+Math.sin(i*8)*80;c.fillStyle='rgba(222,221,222,.16)';c.beginPath();c.ellipse(x,y,145,30,0,0,Math.PI*2);c.fill();c.fillStyle='rgba(42,53,70,.5)';c.beginPath();c.moveTo(x-70,y+50);c.lineTo(x+65,y+50);c.lineTo(x+14,y+135);c.lineTo(x-23,y+165);c.closePath();c.fill();c.fillStyle='rgba(157,180,166,.45)';c.fillRect(x-73,y+45,142,10);}
      }else{
        c.strokeStyle='rgba(36,25,43,.8)';c.lineWidth=30;
        for(let i=-1;i<7;i++){const x=i*320-(cam*.36)%320;c.beginPath();c.moveTo(x,570);c.lineTo(x,320);c.quadraticCurveTo(x+90,230,x+180,320);c.lineTo(x+180,570);c.stroke();}
      }
      for(let i=0;i<4;i++){const y=390+i*48;const mist=c.createLinearGradient(0,y-35,0,y+60);mist.addColorStop(0,'rgba(184,204,204,0)');mist.addColorStop(.5,'rgba(184,204,204,'+(i===3?.10:.045)+')');mist.addColorStop(1,'rgba(184,204,204,0)');c.fillStyle=mist;c.fillRect(0,y-35,W,95);}
    }

    _drawTerrain(c) {
      const pal=this.stage.palette||{};
      const theme=this.stage.theme||['rain','castle','volcano','throne'][this.stageIndex%4];
      const grad=c.createLinearGradient(0,GROUND,0,H);grad.addColorStop(0,pal.ground||'#293c35');grad.addColorStop(1,'#151c22');c.fillStyle=grad;c.fillRect(0,GROUND,this.worldWidth,H-GROUND+20);
      c.strokeStyle=theme==='volcano'?'#ae795f':theme==='snow'?'#d5e6e8':'#6d8270';c.lineWidth=3;c.beginPath();c.moveTo(0,GROUND+1);c.lineTo(this.worldWidth,GROUND+1);c.stroke();
      for(let x=Math.floor(this.camera/37)*37;x<this.camera+W+80;x+=37){
        const n=Math.sin(x*12.71)*.5+.5;
        if(theme==='volcano'){c.strokeStyle='rgba(237,139,78,.35)';c.lineWidth=2;c.beginPath();c.moveTo(x,GROUND+20+n*60);c.lineTo(x+15,GROUND+28+n*60);c.lineTo(x+24,GROUND+21+n*60);c.stroke();}
        else if(theme==='snow'){c.fillStyle='rgba(217,234,237,.48)';c.beginPath();c.ellipse(x,GROUND+3,22+n*8,4,0,0,Math.PI*2);c.fill();}
        else {c.strokeStyle=theme==='castle'?'#68647a':'#719078';c.lineWidth=1;c.beginPath();c.moveTo(x,GROUND+3);c.lineTo(x-6,GROUND-5-n*11);c.moveTo(x+3,GROUND+3);c.lineTo(x+9,GROUND-3-n*7);c.stroke();}
        c.fillStyle='rgba(156,166,157,.14)';c.fillRect(x+10,GROUND+35+n*65,7+n*15,2);
      }
      for(const p of this.platforms){
        c.fillStyle='#3b4746';c.fillRect(p.x,p.y,p.w,p.h||26);c.fillStyle=theme==='volcano'?'#9a6f5a':theme==='snow'?'#c6dbdf':'#758777';c.fillRect(p.x,p.y,p.w,4);c.fillStyle='#263335';
        for(let x=p.x+8;x<p.x+p.w;x+=44)c.fillRect(x,p.y+12,1,(p.h||26)-12);
        c.strokeStyle='rgba(173,193,165,.32)';c.lineWidth=2;c.beginPath();c.moveTo(p.x+10,p.y+6);c.lineTo(p.x+p.w-10,p.y+6);c.stroke();
      }
      for(let x=370;x<this.worldWidth;x+=610){
        c.fillStyle='#333335';c.fillRect(x,GROUND-52,14,52);c.fillStyle='#a1a094';c.fillRect(x-5,GROUND-57,25,10);
        const flame=c.createRadialGradient(x+7,GROUND-70,0,x+7,GROUND-70,42);flame.addColorStop(0,'rgba(255,200,115,.4)');flame.addColorStop(1,'rgba(255,174,90,0)');c.fillStyle=flame;c.fillRect(x-40,GROUND-115,95,95);
        c.fillStyle='#f4c47d';c.beginPath();c.ellipse(x+7,GROUND-67,5+Math.sin(this.realTime*9+x)*1.5,12,0,0,Math.PI*2);c.fill();
      }
    }

    _drawPortal(c) {
      if(this.stageIndex===this.levels.length-1)return;
      const x=this.stage.portalX||this.worldWidth-130,active=this.enemies.every(e=>e.hp<=0)&&(!window.KnightAdventure||window.KnightAdventure.canExit(this)),t=this.realTime;
      c.save();c.translate(x,GROUND);
      if(active){const glow=c.createRadialGradient(0,-65,5,0,-65,125);glow.addColorStop(0,'rgba(239,210,134,.24)');glow.addColorStop(1,'rgba(239,210,134,0)');c.fillStyle=glow;c.fillRect(-125,-190,250,230);}
      c.strokeStyle=active?'#d7c18a':'#687775';c.lineWidth=12;c.beginPath();c.moveTo(-47,0);c.lineTo(-47,-90);c.bezierCurveTo(-47,-156,47,-156,47,-90);c.lineTo(47,0);c.stroke();
      c.fillStyle=active?'rgba(220,205,147,.12)':'rgba(20,30,33,.3)';c.beginPath();c.moveTo(-38,0);c.lineTo(-38,-90);c.bezierCurveTo(-38,-140,38,-140,38,-90);c.lineTo(38,0);c.closePath();c.fill();
      if(active){c.strokeStyle='#ead4a0';c.lineWidth=1.5;for(let i=0;i<4;i++){const y=-20-((t*33+i*29)%110);c.globalAlpha=.3;c.beginPath();c.ellipse(0,y,28+Math.sin(t+i)*6,7,0,0,Math.PI*2);c.stroke();}c.globalAlpha=1;this._text(c,'F  进入营地',0,-167,16,'#f0dfb9','center');}
      c.restore();
    }

    _drawPlayer(c) {
      const p=this.player;
      if(p.invuln>0 && Math.floor(this.realTime*18)%2===0 && p.dashTimer<=0)c.globalAlpha=.55;
      c.save();c.translate(p.x,p.y);this._shadow(c,0,3,31,.28);c.scale(p.facing,1);
      const pose=p.attack?this._attackPose(p.attack):{...REST_POSE};
      if(!p.attack){pose.lean=clamp(p.vx*p.facing/280,-1,1)*.055;pose.y=p.onGround?Math.sin(p.run)*1.4:clamp(p.vy/600,-1,1)*1.5;}
      const land=p.landing>0?Math.sin(p.landing/.18*Math.PI):0;
      pose.y+=land*4;pose.scaleX+=land*.045;pose.scaleY-=land*.055;pose.x-=p.recoil*2;
      if(p.dashTimer>0){pose.lean=.24;pose.y=8;pose.scaleY=.92;pose.gripY=-62;pose.angle=.22;}
      if(this.knightFrames.length===8 && this.attackImage.complete && this.attackImage.naturalWidth && !this.attackImageUnavailable){
        c.translate(0,p.onGround?Math.sin(p.run)*1.1:clamp(p.vy/600,-1,1));
        c.scale(1+land*.025,1-land*.035);
        if(!p.attack)c.rotate(p.dashTimer>0?.14:clamp(p.vx*p.facing/280,-1,1)*.025);
        this._drawSpriteKnight(c,p);
      }else if(this.heroImage.complete && this.heroImage.naturalWidth && !this.heroImageUnavailable){
        c.rotate(pose.lean*.15);c.drawImage(this.heroImage,-75,-134,136,136);
      }else if(this.heroId==='wangguodong'){
        this._drawCat(c,{...p,attackTimer:0});
      }
      c.restore();c.globalAlpha=1;
      if(p.dashCooldown<=0 && p.invuln<=0){c.fillStyle='rgba(234,213,162,.8)';c.beginPath();c.arc(p.x-25,p.y-62,2,0,Math.PI*2);c.fill();}
    }

    _knightFrame(a,elapsed=a.elapsed) {
      if(elapsed<a.windup){
        const t=elapsed/a.windup,from=a.fromFrame||0;
        if(a.index===1)return t<.3?from:5;
        if(a.index===2){if(from===2)return 2;return t<.22?from:t<.48?1:2;}
        return t<.18?from:t<.6?1:2;
      }
      if(elapsed<a.windup+a.active){
        const t=(elapsed-a.windup)/a.active;
        if(a.index===1)return t<.38?5:t<.7?4:t<.88?3:2;
        return t<.38?3:t<.7?4:5;
      }
      const hold=a.index===2?a.windup+a.active+.07:a.chainAt+.035;
      if(elapsed<hold)return a.index===1?2:5;
      return elapsed<hold+(a.duration-hold)*.55?6:7;
    }

    _drawSpriteKnight(c,p) {
      const index=p.attack?this._knightFrame(p.attack):(p.dashTimer>0?1:(p.idleFrame||0));
      const [sx,sy,w,h,anchorX,footY,scale]=this.knightFrames[index];
      c.drawImage(this.attackImage,sx,sy,w,h,-anchorX*scale,-footY*scale,w*scale,h*scale);
    }

    _drawCat(c,p,unarmed=false) {
      const running=Math.sin(p.run),leg=p.onGround?running*5:4;
      c.strokeStyle='#2d3436';c.lineWidth=2;
      c.fillStyle='#dcd8bd';c.beginPath();c.moveTo(-15,-64);c.bezierCurveTo(-42,-58,-44,-18,-40+Math.sin(this.realTime*5)*6,-8);c.lineTo(-12,-18);c.closePath();c.fill();
      c.fillStyle='#8b9293';c.beginPath();c.ellipse(-10,-13+leg,10,13,0,0,Math.PI*2);c.ellipse(12,-13-leg,10,13,0,0,Math.PI*2);c.fill();c.stroke();
      c.fillStyle='#eee9dc';c.beginPath();c.ellipse(-12,-4+leg*.3,12,6,0,0,Math.PI*2);c.ellipse(14,-4-leg*.3,12,6,0,0,Math.PI*2);c.fill();
      const armor=c.createLinearGradient(-23,-60,23,-20);armor.addColorStop(0,'#abb9bb');armor.addColorStop(.45,'#e1e7e3');armor.addColorStop(1,'#71868a');c.fillStyle=armor;c.beginPath();c.moveTo(-22,-60);c.quadraticCurveTo(-31,-38,-19,-20);c.quadraticCurveTo(0,-13,22,-23);c.lineTo(25,-59);c.closePath();c.fill();c.stroke();
      c.strokeStyle='#829395';c.beginPath();c.moveTo(-19,-35);c.quadraticCurveTo(0,-28,20,-35);c.stroke();
      c.fillStyle='#b8ac90';c.strokeStyle='#3b3a37';c.beginPath();c.moveTo(-27,-78);c.lineTo(-28,-108);c.lineTo(-9,-94);c.quadraticCurveTo(4,-98,17,-93);c.lineTo(33,-110);c.lineTo(30,-76);c.quadraticCurveTo(31,-55,4,-54);c.quadraticCurveTo(-21,-54,-27,-78);c.fill();c.stroke();
      c.fillStyle='#b47d78';c.beginPath();c.moveTo(-23,-101);c.lineTo(-22,-84);c.lineTo(-11,-92);c.fill();c.beginPath();c.moveTo(29,-102);c.lineTo(20,-92);c.lineTo(28,-86);c.fill();
      c.fillStyle='#eee9db';c.beginPath();c.moveTo(0,-93);c.lineTo(-4,-78);c.bezierCurveTo(-18,-77,-18,-58,4,-56);c.bezierCurveTo(27,-56,31,-74,13,-79);c.lineTo(7,-93);c.fill();
      c.strokeStyle='#514e43';c.lineWidth=3;c.beginPath();c.moveTo(-16,-92);c.lineTo(-8,-86);c.lineTo(-10,-94);c.moveTo(-4,-95);c.lineTo(1,-88);c.lineTo(4,-96);c.moveTo(12,-94);c.lineTo(14,-86);c.lineTo(21,-92);c.moveTo(-24,-78);c.lineTo(-15,-75);c.moveTo(-23,-69);c.lineTo(-14,-68);c.moveTo(23,-78);c.lineTo(30,-81);c.stroke();
      c.fillStyle='#c7bd82';c.strokeStyle='#343a31';c.lineWidth=1.5;c.beginPath();c.ellipse(-10,-78,6.7,7.1,-.1,0,Math.PI*2);c.ellipse(16,-78,6.7,7.1,.1,0,Math.PI*2);c.fill();c.stroke();c.fillStyle='#252b2b';c.beginPath();c.ellipse(-9,-78,2.1,5.6,0,0,Math.PI*2);c.ellipse(17,-78,2.1,5.6,0,0,Math.PI*2);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(-11,-80,1.7,0,Math.PI*2);c.arc(15,-80,1.7,0,Math.PI*2);c.fill();
      c.fillStyle='#bf8d86';c.beginPath();c.moveTo(0,-69);c.lineTo(9,-69);c.lineTo(4,-64);c.closePath();c.fill();c.strokeStyle='#70645c';c.lineWidth=1;c.beginPath();c.moveTo(4,-64);c.lineTo(4,-61);c.moveTo(-15,-66);c.lineTo(-35,-69);c.moveTo(-14,-62);c.lineTo(-33,-62);c.moveTo(20,-65);c.lineTo(39,-68);c.moveTo(20,-61);c.lineTo(37,-61);c.stroke();
      if(!unarmed){
        if(p.attackTimer<=0){c.save();c.translate(19,-41);c.rotate(.42);c.fillStyle='#c9d4d0';c.strokeStyle='#687e85';c.beginPath();c.moveTo(-3,0);c.lineTo(-6,55);c.lineTo(0,69);c.lineTo(6,55);c.lineTo(3,0);c.fill();c.stroke();c.fillStyle='#b8a16c';c.fillRect(-13,-4,26,5);c.fillStyle='#6d5144';c.fillRect(-3,-18,6,15);c.restore();}
        c.fillStyle=armor;c.strokeStyle='#6f858a';c.lineWidth=2;c.beginPath();c.ellipse(-19,-49,11,12,-.4,0,Math.PI*2);c.ellipse(19,-47,10,12,.4,0,Math.PI*2);c.fill();c.stroke();c.fillStyle='#f0ebe0';c.beginPath();c.ellipse(15,-37,8,7,.2,0,Math.PI*2);c.ellipse(7,-40,8,7,-.1,0,Math.PI*2);c.fill();
      }
    }

    _drawPrincess(c) {
      const p=this.princess,t=this.realTime;
      c.save();c.translate(p.x,p.y+Math.sin(t*3)*2);this._shadow(c,0,12,23,.18);c.scale(p.facing,1);
      if(this.princessImage.complete && this.princessImage.naturalWidth && !this.princessImageUnavailable){
        const imageWidth=128*this.princessImage.naturalWidth/this.princessImage.naturalHeight;
        c.drawImage(this.princessImage,-imageWidth*.5,-124,imageWidth,128);
      }else{
      c.fillStyle='#9d7ac6';c.beginPath();c.moveTo(-10,-47);c.quadraticCurveTo(-22,-19,-21,3);c.lineTo(23,3);c.quadraticCurveTo(16,-27,11,-47);c.closePath();c.fill();c.fillStyle='#d2b7e5';c.beginPath();c.moveTo(-3,-43);c.lineTo(-10,0);c.lineTo(12,0);c.lineTo(6,-43);c.fill();
      c.fillStyle='#574054';c.beginPath();c.ellipse(-1,-64,18,24,0,0,Math.PI*2);c.fill();c.fillStyle='#f1cbb5';c.beginPath();c.ellipse(2,-64,12.5,16,0,0,Math.PI*2);c.fill();c.fillStyle='#574054';c.beginPath();c.moveTo(-12,-70);c.quadraticCurveTo(-5,-92,16,-72);c.lineTo(4,-76);c.lineTo(-5,-67);c.closePath();c.fill();
      c.fillStyle='#e6c675';c.beginPath();c.moveTo(-13,-82);c.lineTo(-15,-93);c.lineTo(-5,-88);c.lineTo(0,-99);c.lineTo(6,-89);c.lineTo(15,-94);c.lineTo(13,-82);c.closePath();c.fill();c.fillStyle='#9d6bb9';c.beginPath();c.arc(0,-87,2.8,0,Math.PI*2);c.fill();
      c.fillStyle='#3f343b';c.beginPath();c.arc(1,-64,1.4,0,Math.PI*2);c.arc(10,-64,1.4,0,Math.PI*2);c.fill();c.strokeStyle='#a97375';c.lineWidth=1.2;c.beginPath();c.arc(6,-58,3,0,Math.PI);c.stroke();
      c.strokeStyle='#ceb786';c.lineWidth=4;c.beginPath();c.moveTo(20,-11);c.lineTo(27,-75);c.stroke();c.fillStyle='#dbbfff';c.beginPath();c.moveTo(27,-89);c.lineTo(33,-79);c.lineTo(27,-68);c.lineTo(21,-79);c.closePath();c.fill();
      c.strokeStyle='#edc9ae';c.lineWidth=6;c.beginPath();c.moveTo(7,-43);c.lineTo(24,-46);c.stroke();
      }
      if(p.castGlow>0){const g=c.createRadialGradient(27,-79,0,27,-79,45);g.addColorStop(0,'rgba(234,208,255,.8)');g.addColorStop(1,'rgba(211,180,255,0)');c.fillStyle=g;c.fillRect(-18,-124,90,90);}
      c.restore();
      this._text(c,'王德敏',p.x,p.y-110,13,'#dcc9ef','center');
    }

    _drawEnemy(c,e) {
      if(e.x<this.camera-240 || e.x>this.camera+W+250)return;
      c.save();c.translate(e.x,e.y);if(e.hp<=0)c.globalAlpha=clamp(1-e.deadTimer/.38,0,1);
      this._shadow(c,0,3,e.type==='dragon'?100:26,.24);c.scale(e.facing,1);
      if(e.elite && e.type!=='dragon')c.scale(e.boss?1.4:1.18,e.boss?1.4:1.18);
      if(e.hitFlash>0)c.filter='brightness(1.7)';
      if(e.type==='dragon')this._drawDragon(c,e);
      else if(e.type==='slime'){
        const squash=1+Math.sin(e.phase*5)*.06;c.scale(1/squash,squash);const g=c.createLinearGradient(0,-48,0,0);g.addColorStop(0,this.stageIndex===2?'#e4a37e':'#a7c99e');g.addColorStop(1,this.stageIndex===2?'#885c64':'#577f78');c.fillStyle=g;c.strokeStyle='#3d635f';c.lineWidth=2;c.beginPath();c.moveTo(-27,-4);c.bezierCurveTo(-40,-12,-24,-42,-7,-45);c.bezierCurveTo(15,-53,40,-20,28,-4);c.quadraticCurveTo(0,8,-27,-4);c.fill();c.stroke();c.fillStyle='#273b38';c.beginPath();c.ellipse(0,-23,3,5,0,0,Math.PI*2);c.ellipse(13,-23,3,5,0,0,Math.PI*2);c.fill();c.strokeStyle='#e1eacc';c.lineWidth=3;c.beginPath();c.moveTo(-18,-26);c.quadraticCurveTo(-18,-36,-9,-37);c.stroke();
      }else if(e.type==='wolf'){
        const run=Math.sin(e.phase*12)*6;c.fillStyle='#728487';c.strokeStyle='#263b44';c.lineWidth=2;c.beginPath();c.ellipse(-3,-30,36,19,0,0,Math.PI*2);c.fill();c.stroke();c.strokeStyle='#60767d';c.lineWidth=9;c.beginPath();c.moveTo(-24,-23);c.lineTo(-30,-3+run*.3);c.moveTo(19,-23);c.lineTo(27,-4-run*.3);c.stroke();c.fillStyle='#86989a';c.beginPath();c.moveTo(13,-37);c.lineTo(10,-67);c.lineTo(29,-55);c.lineTo(34,-62);c.lineTo(43,-39);c.lineTo(54,-31);c.lineTo(43,-22);c.lineTo(21,-22);c.closePath();c.fill();c.strokeStyle='#263b44';c.lineWidth=2;c.stroke();c.strokeStyle='#74898b';c.lineWidth=11;c.beginPath();c.moveTo(-32,-33);c.quadraticCurveTo(-59,-45,-50,-54);c.stroke();c.fillStyle=e.attack>0?'#ffd19b':'#e5ce88';c.beginPath();c.arc(33,-40,3,0,Math.PI*2);c.fill();c.fillStyle='#263239';c.beginPath();c.arc(52,-31,3,0,Math.PI*2);c.fill();
      }else if(e.type==='bat'){
        const flap=Math.sin(e.phase*12)*18;c.fillStyle='#8e7aa9';c.strokeStyle='#423a60';c.lineWidth=2;
        for(const side of [-1,1]){c.beginPath();c.moveTo(0,-14);c.quadraticCurveTo(side*24,-45-flap,side*53,-27-flap*.5);c.lineTo(side*37,-8);c.lineTo(side*27,-16);c.lineTo(side*19,1);c.closePath();c.fill();c.stroke();}c.fillStyle='#5f557e';c.beginPath();c.ellipse(0,-10,13,20,0,0,Math.PI*2);c.fill();c.beginPath();c.moveTo(-13,-21);c.lineTo(-10,-38);c.lineTo(-2,-24);c.moveTo(3,-24);c.lineTo(12,-38);c.lineTo(14,-20);c.fill();c.fillStyle='#f3c98e';c.beginPath();c.arc(-4,-15,2,0,Math.PI*2);c.arc(5,-15,2,0,Math.PI*2);c.fill();
      }else{
        const run=Math.sin(e.phase*6)*4;c.strokeStyle='#c8c7b4';c.lineWidth=6;c.beginPath();c.moveTo(-6,-31);c.lineTo(-14,-3+run);c.moveTo(7,-31);c.lineTo(15,-3-run);c.moveTo(-11,-52);c.lineTo(-24,-29);c.moveTo(11,-52);c.lineTo(28,-35);c.stroke();c.fillStyle='#505960';c.strokeStyle='#a3ada4';c.lineWidth=2;c.beginPath();c.moveTo(-17,-57);c.lineTo(17,-57);c.lineTo(12,-28);c.lineTo(-12,-28);c.closePath();c.fill();c.stroke();c.strokeStyle='#c5c7b8';c.lineWidth=2;for(let y=-49;y<-32;y+=6){c.beginPath();c.moveTo(-10,y);c.quadraticCurveTo(0,y+6,10,y);c.stroke();}c.fillStyle='#d5d5c4';c.beginPath();c.ellipse(1,-70,17,18,0,0,Math.PI*2);c.fill();c.fillStyle='#41434c';c.beginPath();c.ellipse(-5,-71,4,5,0,0,Math.PI*2);c.ellipse(8,-71,4,5,0,0,Math.PI*2);c.fill();c.fillStyle='#bc7c74';c.fillRect(-4,-57,11,4);c.strokeStyle=e.tell>0?'#f2c087':'#b4c5c2';c.lineWidth=5;c.beginPath();c.moveTo(27,-27);c.lineTo(e.tell>0?15:51,e.tell>0?-87:-64);c.stroke();
      }
      c.filter='none';c.restore();
      if(e.elite && e.hp>0 && e.type!=='dragon'){
        const y=e.y-(e.type==='bat'?64:e.boss?148:126);c.fillStyle='#e4c47e';c.beginPath();c.moveTo(e.x-7,y);c.lineTo(e.x-9,y-9);c.lineTo(e.x-2,y-5);c.lineTo(e.x,y-12);c.lineTo(e.x+3,y-5);c.lineTo(e.x+9,y-9);c.lineTo(e.x+7,y);c.closePath();c.fill();
        this._text(c,e.name||'精英守卫',e.x,y-18,12,'#ead09a','center');
      }
      if(e.hp>0 && e.type!=='dragon' && e.hp<e.maxHp){c.fillStyle='rgba(9,18,26,.7)';c.fillRect(e.x-24,e.y-(e.type==='bat'?47:103),48,5);c.fillStyle='#d6b786';c.fillRect(e.x-24,e.y-(e.type==='bat'?47:103),48*e.hp/e.maxHp,5);}
      if(e.tell>0 && e.type!=='dragon'){this._text(c,'!',e.x,e.y-110,25,'#ffbc81','center');}
    }

    _drawDragon(c,e) {
      // The local head points right; mirroring follows the player.
      const breathe=Math.sin(e.phase*2)*3;
      c.save();c.translate(0,breathe);
      c.fillStyle='#55495e';c.strokeStyle='#282635';c.lineWidth=3;
      c.beginPath();c.moveTo(-34,-74);c.bezierCurveTo(-110,-110,-175,-36,-216,-57);c.bezierCurveTo(-172,-10,-104,-48,-50,-32);c.fill();c.stroke();
      const wingLift=Math.sin(e.phase*1.3)*7;
      c.fillStyle='#6d5c71';c.beginPath();c.moveTo(-15,-107);c.lineTo(-132,-236-wingLift);c.lineTo(-146,-122);c.lineTo(-99,-144);c.lineTo(-71,-89);c.lineTo(-42,-122);c.lineTo(-20,-74);c.closePath();c.fill();c.stroke();c.strokeStyle='#93808c';c.lineWidth=2;c.beginPath();c.moveTo(-15,-107);c.lineTo(-132,-236-wingLift);c.moveTo(-15,-107);c.lineTo(-99,-144);c.moveTo(-15,-107);c.lineTo(-71,-89);c.stroke();
      c.fillStyle='#766773';c.strokeStyle='#2c2b35';c.lineWidth=3;c.beginPath();c.ellipse(-6,-78,90,57,-.18,0,Math.PI*2);c.fill();c.stroke();
      c.fillStyle='#b19e91';c.beginPath();c.ellipse(25,-64,42,42,-.2,0,Math.PI*2);c.fill();
      c.strokeStyle='#6e6069';c.lineWidth=19;c.beginPath();c.moveTo(-48,-55);c.lineTo(-70,-14);c.lineTo(-41,-6);c.moveTo(37,-57);c.lineTo(42,-13);c.lineTo(70,-5);c.stroke();
      c.fillStyle='#b5aa98';c.beginPath();for(let i=0;i<3;i++){c.moveTo(45+i*12,-9);c.lineTo(50+i*12,1);c.lineTo(58+i*12,-6);}c.fill();
      c.fillStyle='#766773';c.strokeStyle='#292b36';c.lineWidth=3;c.beginPath();c.moveTo(31,-100);c.bezierCurveTo(34,-165,80,-181,102,-151);c.lineTo(135,-145);c.lineTo(144,-124);c.lineTo(119,-110);c.lineTo(77,-114);c.lineTo(61,-71);c.closePath();c.fill();c.stroke();
      c.fillStyle='#d1bfa1';c.beginPath();c.moveTo(62,-164);c.lineTo(54,-195);c.lineTo(78,-171);c.moveTo(89,-168);c.lineTo(102,-193);c.lineTo(105,-162);c.fill();
      c.fillStyle=e.action==='fire' && e.tell>0?'#fff0a5':'#f2b46d';c.beginPath();c.ellipse(104,-146,7,4,-.2,0,Math.PI*2);c.fill();c.fillStyle='#352a39';c.fillRect(104,-150,2,9);
      c.strokeStyle='#3a303b';c.lineWidth=3;c.beginPath();c.moveTo(108,-125);c.lineTo(141,-127);c.stroke();c.fillStyle='#d8c7a7';c.beginPath();c.moveTo(123,-128);c.lineTo(126,-120);c.lineTo(129,-128);c.fill();
      c.fillStyle='#baa894';for(let i=0;i<7;i++){const x=-80+i*20,y=-108-Math.sin(i*.65)*14;c.beginPath();c.moveTo(x,y+7);c.lineTo(x+6,y-14);c.lineTo(x+15,y+6);c.fill();}
      c.strokeStyle='rgba(189,171,159,.25)';c.lineWidth=1;for(let i=0;i<5;i++){c.beginPath();c.arc(-43+i*24,-72+(i%2)*9,8,0,Math.PI);c.stroke();}
      if(e.tell>0){
        const glow=c.createRadialGradient(133,-130,0,133,-130,55);glow.addColorStop(0,'rgba(255,187,94,.7)');glow.addColorStop(1,'rgba(255,187,94,0)');c.fillStyle=glow;c.fillRect(78,-185,110,110);
        if(e.action==='lunge'){c.fillStyle='rgba(246,157,102,.22)';c.fillRect(0,-10,430,10);}
      }
      c.restore();
    }

    _drawProjectile(c,b) {
      const color=b.friendly?'#dfbfff':b.kind==='fire'?'#ffc071':'#c09cdb';
      c.save();c.translate(b.x,b.y);const g=c.createRadialGradient(0,0,0,0,0,b.r*3);g.addColorStop(0,color);g.addColorStop(.35,color+'aa');g.addColorStop(1,color+'00');c.fillStyle=g;c.beginPath();c.arc(0,0,b.r*3,0,Math.PI*2);c.fill();c.fillStyle=b.friendly?'#fff3ff':'#fff2b4';c.beginPath();c.arc(0,0,b.r*.55,0,Math.PI*2);c.fill();c.restore();
    }

    _drawHazard(c,h) {
      if(h.tell>0){c.fillStyle='rgba(255,151,95,'+(.18+Math.sin(this.realTime*16)*.1)+')';c.fillRect(h.x-h.w*.5,GROUND-5,h.w,8);c.strokeStyle='#f8bd7b';c.lineWidth=2;c.beginPath();c.ellipse(h.x,GROUND,h.w*.55,10,0,0,Math.PI*2);c.stroke();}
      else{const a=clamp(h.life/.52,0,1),g=c.createLinearGradient(h.x,GROUND-150,h.x,GROUND);g.addColorStop(0,'rgba(255,190,105,0)');g.addColorStop(.5,'rgba(255,190,105,'+a*.6+')');g.addColorStop(1,'rgba(255,226,145,'+a+')');c.fillStyle=g;c.beginPath();c.moveTo(h.x-h.w*.5,GROUND);c.quadraticCurveTo(h.x-25,GROUND-100,h.x,GROUND-158);c.quadraticCurveTo(h.x+25,GROUND-100,h.x+h.w*.5,GROUND);c.fill();}
    }

    _drawEffects(c) {
      for(const p of this.particles){c.save();c.globalAlpha=clamp(p.life/p.max,0,1);c.fillStyle=p.color;if(p.kind==='ghost'){c.beginPath();c.ellipse(p.x,p.y,p.size*.55,p.size,0,0,Math.PI*2);c.fill();}else if(p.kind==='star'){c.translate(p.x,p.y);c.rotate(this.realTime);c.beginPath();c.moveTo(0,-p.size*2);c.lineTo(p.size*.5,-p.size*.5);c.lineTo(p.size*2,0);c.lineTo(p.size*.5,p.size*.5);c.lineTo(0,p.size*2);c.lineTo(-p.size*.5,p.size*.5);c.lineTo(-p.size*2,0);c.lineTo(-p.size*.5,-p.size*.5);c.fill();}else c.fillRect(p.x,p.y,p.size,p.size);c.restore();}
      for(const f of this.floaters){c.save();c.globalAlpha=Math.min(1,f.life/.35);this._text(c,f.text,f.x,f.y,f.size,f.color,'center');c.restore();}
    }

    _drawAtmosphere(c) {
      const t=this.realTime,theme=this.stage.theme||'rain';
      if(theme==='rain'){c.strokeStyle='rgba(193,212,215,.17)';c.lineWidth=1;for(let i=0;i<60;i++){const x=(i*167+t*115)%1400-60,y=(i*83+t*430)%800-80;c.beginPath();c.moveTo(x,y);c.lineTo(x-9,y+23);c.stroke();}}
      else if(theme==='snow'){c.fillStyle='#e9f3f4';for(let i=0;i<65;i++){c.globalAlpha=.2+(i%4)*.12;const x=(i*197+t*18+Math.sin(t+i)*19)%1340-20,y=(i*97+t*48)%760-20;c.beginPath();c.arc(x,y,1+(i%3)*.7,0,Math.PI*2);c.fill();}c.globalAlpha=1;}
      else{for(let i=0;i<35;i++){const x=(i*197+t*(theme==='volcano'?15:7))%1320-20,y=(i*127-t*(theme==='volcano'?25:7)+900)%740;c.globalAlpha=.15+(Math.sin(t+i)+1)*.15;c.fillStyle=theme==='volcano'?'#f4af7c':theme==='forest'?'#d0e4a1':theme==='swamp'?'#cadb98':'#b6bdd9';c.beginPath();c.arc(x,y,i%3===0?2:1,0,Math.PI*2);c.fill();}c.globalAlpha=1;}
    }

    _drawWorldHints(c) {
      if(this.time<13 && this.stageIndex===0){const a=this.time<10?1:clamp((13-this.time)/3,0,1);c.save();c.globalAlpha=a;c.fillStyle='rgba(14,25,30,.7)';c.fillRect(340,642,600,39);this._text(c,'J 挥剑   ·   K 无敌冲刺   ·   E 公主合击   ·   空格 二段跳',640,668,16,'#d5dcd0','center');c.restore();}
      const boss=this.enemies.find(e=>e.type==='dragon' && !e.dormant && e.hp>0);
      if(boss && boss.action!=='idle' && boss.tell>0){const hint=boss.action==='fire'?'烈焰将至 · 二段跳或 K 闪避':boss.action==='quake'?'避开脚下光圈 · 跳跃躲过震击':'恶龙蓄力突袭 · K 穿过攻击';c.fillStyle='rgba(37,20,27,.75)';c.fillRect(410,107,460,36);this._text(c,hint,640,132,17,'#f3d1ad','center');}
    }

    _drawPrince(c) {
      const x=this.worldWidth-160,y=GROUND;
      if(!this.rescuing && !this.won){
        c.save();c.strokeStyle='#7b7985';c.lineWidth=4;c.beginPath();c.moveTo(x-44,y);c.lineTo(x-44,y-132);c.quadraticCurveTo(x,y-167,x+44,y-132);c.lineTo(x+44,y);c.stroke();
        c.strokeStyle='rgba(146,137,153,.7)';c.lineWidth=2;for(let bx=x-28;bx<x+40;bx+=14){c.beginPath();c.moveTo(bx,y-135);c.lineTo(bx,y);c.stroke();}c.restore();
        if(Math.abs(this.player.x-x)<220)this._text(c,(!window.KnightAdventure||window.KnightAdventure.canExit(this))?'F  解开最后封印，救出王子':'先击败恶龙、收齐碎片并点亮誓灯',x,y-183,15,'#ead7a7','center');
      }
      c.save();c.translate(x,y);this._shadow(c,0,1,24,.2);c.fillStyle='#6e9aa7';c.beginPath();c.moveTo(-16,-55);c.lineTo(16,-55);c.lineTo(22,-12);c.lineTo(-22,-12);c.closePath();c.fill();c.fillStyle='#253b4b';c.fillRect(-14,-14,10,14);c.fillRect(6,-14,10,14);c.fillStyle='#edc7ab';c.beginPath();c.ellipse(0,-71,14,18,0,0,Math.PI*2);c.fill();c.fillStyle='#524437';c.beginPath();c.arc(0,-77,16,Math.PI,Math.PI*2);c.lineTo(14,-68);c.lineTo(0,-76);c.lineTo(-13,-66);c.fill();c.fillStyle='#dfc17e';c.beginPath();c.moveTo(-13,-85);c.lineTo(-15,-97);c.lineTo(-5,-91);c.lineTo(0,-102);c.lineTo(5,-91);c.lineTo(15,-97);c.lineTo(13,-85);c.fill();c.fillStyle='#433d3b';c.beginPath();c.arc(-5,-72,1.5,0,Math.PI*2);c.arc(6,-72,1.5,0,Math.PI*2);c.fill();c.strokeStyle='#946d62';c.lineWidth=1.5;c.beginPath();c.arc(0,-66,4,0,Math.PI);c.stroke();c.restore();this._text(c,'蔡乙先王子',x,y-118,18,'#f4dca6','center');
    }

    _shadow(c,x,y,r,alpha) {c.save();c.fillStyle='rgba(5,11,16,'+alpha+')';c.beginPath();c.ellipse(x,y,r,r*.22,0,0,Math.PI*2);c.fill();c.restore();}
    _text(c,text,x,y,size,color,align) {c.save();c.font='600 '+size+'px "Microsoft YaHei", "PingFang SC", sans-serif';c.textAlign=align||'left';c.textBaseline='alphabetic';c.lineWidth=4;c.strokeStyle='rgba(14,20,28,.75)';c.strokeText(text,x,y);c.fillStyle=color;c.fillText(text,x,y);c.restore();}

    destroy() {this.destroyed=true;cancelAnimationFrame(this.raf);window.removeEventListener('keydown',this._keyDown);window.removeEventListener('keyup',this._keyUp);window.removeEventListener('blur',this._blur);try{this.audio?.close();}catch(_){} }
  }
  window.KnightGame = KnightGame;
})();
