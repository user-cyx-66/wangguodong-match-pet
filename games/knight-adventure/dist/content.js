/* Campaign data shared by the route map, exploration module and game. */
(function () {
  'use strict';
  const GROUND=590;
  // id / title / theme / width / enemies / chapter subtitle / three battle names / sky / horizon / ground / accent
  const table=[
    ['wasteland','风雨荒原','rain',6600,12,'雨中的约定','旧驿道阻击|雨中废营|山口伏兵','#172a38','#627c87','#233936','#d7be7f'],
    ['firefly-forest','萤光密林','forest',6800,13,'树影间的来信','林口兽群|古树围猎|萤火哨岗','#122b2b','#527e67','#244b3b','#a8db9e'],
    ['broken-ruins','断桥遗迹','ruins',7000,14,'石头记得的路','碎石前庭|断桥守卫|遗迹封口','#273344','#8797a0','#3d4948','#d7d5a2'],
    ['castle','雾影古堡','castle',7200,15,'守门人的旧誓','外墙夜巡|回廊列阵|守门人之厅','#151b2e','#596175','#303441','#b8a4ef'],
    ['frost-ridge','霜风雪岭','snow',7400,14,'雪地里的两行脚印','雪松隘口|冰脊追击|风口围阵','#3d5470','#adcad7','#60777b','#bde9ed'],
    ['whisper-swamp','低语沼泽','swamp',7600,16,'听见自己的方向','苇岸伏击|迷雾浅滩|低语石阵','#1a2930','#657c65','#34483c','#c4d58a'],
    ['star-mine','星纹矿道','mine',7800,16,'地底仍有星光','废轨入口|晶洞守卫|升降井前','#171c2d','#55566d','#343642','#c8afe8'],
    ['obsidian-outpost','黑曜哨城','ruins',8000,17,'猎首的挑战','黑石哨岗|兽群长街|猎首决斗','#252638','#8a7370','#444047','#dfb28e'],
    ['volcano','熔火山径','volcano',8200,18,'余烬与爪印','焦岩关口|熔流栈道|余烬驻军','#261d2a','#a15d4e','#3b3032','#f1a16a'],
    ['cloud-walk','浮空回廊','sky',8400,18,'云上的约定','云门守军|星桥突围|风铃高廊','#31486e','#a8c7df','#667b83','#e1d5a0'],
    ['dragon-court','龙眠禁庭','castle',8600,19,'王座前的最后一剑','禁庭封阵|沉钟回廊|执刑者之誓','#211a32','#796676','#3b3445','#cfb2e4'],
    ['throne','恶龙王座','throne',9000,20,'小小骑士的荒原誓约','王座前军|锁链守卫|灰烬恶龙','#1a1728','#66545b','#302d39','#f0c080']
  ];
  const descriptions=[
    '穿过风雨中的旧驿道，利用顺风和浅水地形突破猎群。',
    '萤火虫照着林间小径。树冠高台藏有补给，主路上的誓灯则指向下一处遗迹。',
    '倾斜石柱和断桥之间留着跳跃路线，利用二段跳穿过缺口。',
    '古堡深处的守门人不肯让路。逐一突破三处战区，击败它再进入北境。',
    '风雪掩住了旧路，冰带让脚下更滑。点亮誓灯，也给归途留一条明亮的线。',
    '沼泽的雾会学人说话。跟着真正的誓灯前进，在浮台上寻找遗失的补给箱。',
    '晶石在深处微微发光。穿过三段矿道战区，避开间歇喷发的热气与石刺。',
    '黑曜猎首带领兽群守着南门。留好格挡耐力和剑气，拆开它们的包围。',
    '热风穿过黑色岩壁。观察火口亮起的预警，在间歇中穿过火带。',
    '云海托起古老回廊。连续的平台藏着支路宝箱，地面长廊始终可以通行。',
    '执刑者守在禁庭尽头。穿过三道护阵，收齐誓约，让王座之门失去束缚。',
    '穿过王座前军，观察恶龙两阶段的出招，获胜后到右端囚笼按 F 救援王子。'
  ];
  const intros=[
  [
    [
      "银发小鸡骑士",
      "蔡乙先被带去了龙巢。穿过雨幕，先找到第一条路。"
    ],
    [
      "旅途提示",
      "按 R 召唤王果冻，靠近并落地后按 G 上骑。"
    ]
  ],
  [
    [
      "银发小鸡骑士",
      "树皮上有一个小小的王冠记号。王子经过这里，我没有走错。"
    ]
  ],
  [
    [
      "银发小鸡骑士",
      "断桥另一侧还有路。收好剑，踩着石柱跳过去。"
    ]
  ],
  [
    [
      "银发小鸡骑士",
      "守门人的咒印在发光。等它出招，横剑挡住，再用重击拆开护阵。"
    ]
  ],
  [
    [
      "银发小鸡骑士",
      "风雪把誓灯藏起来了。王果冻，等我的召唤。"
    ]
  ],
  [
    [
      "银发小鸡骑士",
      "雾里都是叫人放弃的声音。可我答应过，要把王子接回来。"
    ]
  ],
  [
    [
      "银发小鸡骑士",
      "矿道的晶石能补充护符。高台宝箱也值得多走几步。"
    ]
  ],
  [
    [
      "银发小鸡骑士",
      "猎首的冲锋很快。先看清预警，留住格挡的耐力。"
    ]
  ],
  [
    [
      "银发小鸡骑士",
      "火口发亮就先停一步。骑得再快，也得看清前面的路。"
    ]
  ],
  [
    [
      "银发小鸡骑士",
      "云上的路没有扶手。收腿，起跳，再稳稳落地。"
    ]
  ],
  [
    [
      "银发小鸡骑士",
      "执刑者把最后的护阵绑在自己身上。拆开它，王座就会现身。"
    ]
  ],
  [
    [
      "灰烬恶龙",
      "一只小鸡骑士，也敢踏进我的王座？"
    ],
    [
      "银发小鸡骑士",
      "这把剑走过了十二章路。现在，把蔡乙先还给我。"
    ]
  ]
];
  const outros=[
  [
    [
      "银发小鸡骑士",
      "第一段路走过了。先在营地磨亮剑，前面是密林。"
    ]
  ],
  [
    [
      "银发小鸡骑士",
      "信里写着十二道封印。那就一道一道，全部走过去。"
    ]
  ],
  [
    [
      "银发小鸡骑士",
      "断桥后面果然有路。雾堡有人守门，我得检查好装备。"
    ]
  ],
  [
    [
      "银发小鸡骑士",
      "咒印解开了。谢谢你，守门人；下次见面，希望不用先打一架。"
    ]
  ],
  [
    [
      "银发小鸡骑士",
      "雪地里留下了我的脚印，还有王果冻的爪印。继续向前。"
    ]
  ],
  [
    [
      "银发小鸡骑士",
      "“走到底。”这句话，比雾里的声音响。下一站是星纹矿道。"
    ]
  ],
  [
    [
      "银发小鸡骑士",
      "矿工留了条近路。修路的人，也是旅途上的英雄。"
    ]
  ],
  [
    [
      "银发小鸡骑士",
      "包围破了，通向龙巢的山门也开了。再握紧一点。"
    ]
  ],
  [
    [
      "银发小鸡骑士",
      "火山过去了。到云上之前，先检查剑刃和鞍带。"
    ]
  ],
  [
    [
      "银发小鸡骑士",
      "只剩最后两道封印。蔡乙先，你再等一会儿。"
    ]
  ],
  [
    [
      "银发小鸡骑士",
      "王座的门开了。里面的声音，是蔡乙先！"
    ]
  ],
  [
    [
      "银发小鸡骑士",
      "长剑还在，勇气也还在。蔡乙先，我来接你回家。"
    ]
  ]
];
  const bosses={3:{type:'skeleton',variant:'shieldguard',name:'雾堡守门人'},7:{type:'wolf',variant:'charger',name:'黑曜猎首'},10:{type:'skeleton',variant:'golem',name:'王座执刑者'},11:{type:'dragon',name:'灰烬恶龙 · 格里莫'}};
  const plans=[
    {width:4600,at:[800,3000],spans:[900,960],waves:[['pouncer','pouncer','charger'],['pouncer','archer','charger','nightwing']],feature:'风雨追击',hint:'浅水会拖慢脚步，顺风路段可助跑越过障碍。',kinds:['puddle','gust']},
    {width:5900,at:[900,2650,4450],spans:[900,880,960],waves:[['mushroom','charger','nightwing'],['mushroom','archer','charger'],['mushroom','nightwing','charger','mushroom']],feature:'树冠双路线',hint:'踩发光蘑菇弹上树冠，地面和树上都能通过。',kinds:['spring','canopy']},
    {width:5600,at:[850,3600],spans:[940,1080],waves:[['archer','golem','pouncer','archer'],['golem','archer','charger','golem']],feature:'断桥跳台',hint:'桥面缺口会坠落；用二段跳，或踩石柱跨过去。',kinds:['gap','bridge']},
    {width:6200,at:[1000,2900,4700],spans:[980,920,1040],waves:[['shieldguard','archer','shieldguard'],['archer','nightwing','shieldguard','archer'],['shieldguard','golem','archer','shieldguard']],feature:'摆锤回廊',hint:'摆锤扫过低处；等锤摆开，或跳到壁架上绕行。',kinds:['pendulum','gallery']},
    {width:6000,at:[1000,4300],spans:[1020,1120],waves:[['frostmage','charger','nightwing','charger'],['frostmage','charger','frostmage','golem']],feature:'冰面与逆风',hint:'冰面刹车慢，阵风会改变跳跃距离；岩台可站稳。',kinds:['ice','gust']},
    {width:6200,at:[850,2800,4700],spans:[900,980,980],waves:[['mushroom','nightwing','mushroom'],['mushroom','archer','pouncer','mushroom'],['mushroom','golem','nightwing','mushroom']],feature:'毒沼浮台',hint:'绿色毒液会持续伤害，跳上苇台和石块通过。',kinds:['poison','stepping']},
    {width:6500,at:[950,3000,4950],spans:[980,980,1040],waves:[['golem','archer','pouncer'],['archer','golem','archer','nightwing'],['golem','golem','archer','charger']],feature:'落石矿井',hint:'金色落点先闪烁再落石；乘升降台可绕过矿轨。',kinds:['rockfall','elevator']},
    {width:6400,at:[650,2050,3450,4900],spans:[760,800,780,1040],waves:[['charger','charger'],['shieldguard','archer','charger'],['charger','nightwing','charger'],['shieldguard','charger','archer','charger']],feature:'猎群疾袭',hint:'四场紧凑遭遇战，横剑挡住正面，留意滚石长巷。',kinds:['boulder','outpost']},
    {width:6800,at:[900,3050,5150],spans:[1000,1000,1080],waves:[['embermage','golem','charger'],['embermage','nightwing','golem','pouncer'],['golem','embermage','charger','embermage']],feature:'熔流喷口',hint:'熔岩灼烧地面；喷口先亮橙光，熄灭后再穿行。',kinds:['lava','vent']},
    {width:7000,at:[1000,3200,5350],spans:[980,1040,1120],waves:[['archer','nightwing','frostmage'],['nightwing','archer','nightwing','charger'],['frostmage','archer','golem','nightwing']],feature:'浮空风道',hint:'蓝色风柱把你托向高处，横移离开气流后落到云台。',kinds:['gap','updraft']},
    {width:6600,at:[900,2900,4950],spans:[980,1020,1100],waves:[['shieldguard','golem','archer'],['shieldguard','frostmage','nightwing','golem'],['shieldguard','golem','archer','golem']],feature:'符文交叉阵',hint:'紫色光束按节拍点亮；看准暗区穿过，再拆开执刑者护阵。',kinds:['runeBeam','sanctum']},
    {width:7000,at:[900,3050,5200],spans:[980,1000,1300],waves:[['shieldguard','embermage','charger'],['golem','archer','nightwing','shieldguard'],['embermage','shieldguard','nightwing','dragon']],feature:'恶龙双阶段',hint:'恶龙会切换吐息、地震和突袭；观察预警，胜利后到右端救援。',kinds:['rockfall','throne']}
  ];
  const typeOf={pouncer:'slime',mushroom:'slime',charger:'wolf',archer:'skeleton',shieldguard:'skeleton',frostmage:'skeleton',embermage:'skeleton',golem:'skeleton',nightwing:'bat',dragon:'dragon'};
  const variantNames={pouncer:'跃击苔团',mushroom:'孢子蘑怪',charger:'奔袭猎狼',archer:'枯骨弓手',shieldguard:'塔盾卫士',frostmage:'霜纹术士',embermage:'余烬术士',golem:'岩壳魔像',nightwing:'俯冲夜翼'};
  const lines=items=>items.map(([speaker,text])=>({speaker,text}));
  const platform=(x,y,w=160,extra={})=>({x,y,w,h:22,oneWay:true,...extra});
  const obstacle=(kind,x,w=120,extra={})=>({kind,x,w,...extra});
  const levels=table.map((s,index)=>{
    const [id,name,theme,,,region,battleNames,skyTop,skyBottom,ground,accent]=s,plan=plans[index],width=plan.width;
    const names=battleNames.split('|'),encounters=plan.at.map((x,i)=>({id:'e'+(i+1),x,span:plan.spans[i],label:names[i]||'猎首决斗'}));
    const enemies=[],platforms=[],obstacles=[];
    encounters.forEach((enc,wave)=>{
      const variants=plan.waves[wave];
      variants.forEach((variant,j)=>{
        const isBoss=wave===encounters.length-1&&j===variants.length-1&&!!bosses[index],boss=isBoss?bosses[index]:null;
        const type=boss?boss.type:typeOf[variant],actual=boss?.variant||variant;
        enemies.push({type,variant:actual,x:enc.x+90+j*(enc.span-220)/Math.max(1,variants.length-1),y:GROUND,encounter:enc.id,
          name:boss?.name||variantNames[actual]||'灰烬恶龙',...(isBoss?{boss:true,elite:true,hpScale:type==='dragon'?2.0:2.1,damageScale:1.2}:{}),
          ...(index>3&&j===0?{elite:true,hpScale:1.2}: {})});
      });
    });
    // Routes are built for the region, not stamped five times around every fight.
    if(index===0){
      platforms.push(platform(1350,505,220),platform(2050,455,200),platform(3700,500,240));
      obstacles.push(obstacle('puddle',1550,220),obstacle('puddle',2600,180),obstacle('gust',2050,420,{strength:110,period:5}));
    }else if(index===1){
      for(let x=650;x<width-500;x+=950){platforms.push(platform(x+100,500,190),platform(x+330,405,230),platform(x+580,340,200),platform(x+790,455,160));obstacles.push(obstacle('spring',x,70,{power:745}));}
    }else if(index===2){
      for(const x of [2030,2840,4910]){obstacles.push(obstacle('gap',x,170));platforms.push(platform(x+44,525,80),platform(x-155,485,110),platform(x+245,470,150));}
      platforms.push(platform(1280,475,180),platform(4040,460,200));
    }else if(index===3){
      for(const [i,x] of [1550,2440,3650,5370].entries()){obstacles.push(obstacle('pendulum',x,175,{period:3.8,offset:i*.8}));platforms.push(platform(x-170,465,140),platform(x+160,465,140));}
    }else if(index===4){
      for(const x of [650,1750,3000,4550])obstacles.push(obstacle('ice',x,650));
      obstacles.push(obstacle('gust',2150,1500,{strength:-210,period:5.4}),obstacle('gust',4850,700,{strength:160,period:4.8}));
      for(const x of [1400,2750,4050,5400])platforms.push(platform(x,510,170));
    }else if(index===5){
      for(const x of [1500,2400,3350,4300,5350]){obstacles.push(obstacle('poison',x,240));platforms.push(platform(x-50,520,90),platform(x+80,475,95),platform(x+260,520,100));}
    }else if(index===6){
      for(const [i,x] of [1450,2200,3650,4350,5600].entries())obstacles.push(obstacle('rockfall',x,110,{period:3.6,offset:i*.65}));
      for(const x of [1700,3900]){platforms.push(platform(x,520,180,{motion:{axis:'y',from:520,to:340,period:5.5}}),platform(x+255,365,240),platform(x+590,455,170));}
    }else if(index===7){
      obstacles.push(obstacle('boulder',1700,620,{period:4.5}),obstacle('boulder',3950,620,{period:4.2,offset:1.5}));
      for(const x of [1350,2750,4200,5650])platforms.push(platform(x,490,165));
    }else if(index===8){
      for(const [i,x] of [1700,2600,3950,4650,5900].entries()){obstacles.push(obstacle('lava',x,210),obstacle('vent',x+45,100,{period:4.2,offset:i*.7}));platforms.push(platform(x-60,510,95),platform(x+70,455,90),platform(x+215,510,95));}
    }else if(index===9){
      for(const x of [1800,2650,4350,5050,6250]){obstacles.push(obstacle('gap',x,175),obstacle('updraft',x-95,90));platforms.push(platform(x+35,460,110),platform(x+270,405,180));}
    }else if(index===10){
      for(const [i,x] of [1700,2300,3700,4350,5700].entries()){obstacles.push(obstacle('runeBeam',x,70,{period:3.7,offset:i*.73}));platforms.push(platform(x-190,490,130),platform(x+150,445,160));}
    }else{
      obstacles.push(obstacle('rockfall',2400,110,{period:4.3}),obstacle('rockfall',4450,110,{period:4.7,offset:1.4}));
      platforms.push(platform(1600,490,220),platform(2600,430,190),platform(3900,485,200),platform(4700,445,190));
    }
    // A few ranged guards occupy the actual canopy/cloud route, so terrain changes combat range too.
    if(index===1||index===9){for(const enc of encounters){const archer=enemies.find(e=>e.encounter===enc.id&&e.variant==='archer');const q=platforms.find(q=>q.x>enc.x+180&&q.x+q.w<enc.x+enc.span-50&&!q.motion);if(archer&&q){archer.x=q.x+q.w*.5;archer.y=q.y;}}}
    const rewards=platforms.filter((q,i)=>!q.motion&&i%3===1).slice(0,3);
    const beacons=encounters.map((enc,i)=>({id:'beacon-'+(i+1),x:Math.min(width-310,enc.x+enc.span+70),y:GROUND}));
    const relics=rewards.map((q,i)=>({id:'relic-'+(i+1),x:q.x+q.w*.5,y:q.y}));
    const chests=rewards.filter((_,i)=>i%2===0).map((q,i)=>({id:'chest-'+(i+1),x:q.x+q.w*.8,y:q.y,gold:35+index*4+i*10}));
    const intro=lines(intros[index]);intro.push({speaker:'旅途提示',text:plan.feature+'：'+plan.hint+' 战斗结束自动保存，路过誓灯自动点亮。'});
    return {id,name,theme,width,region,feature:plan.feature,featureHint:plan.hint,mechanicHint:plan.hint,mechanicKinds:plan.kinds,description:plan.hint,portalX:width-160,
      palette:{skyTop,skyBottom,ground,accent,mist:theme==='snow'?'#e2f2ef':'#c4cdd0'},platforms,enemies,encounters,obstacles,
      physics:{grip:theme==='snow'?9:16,airGrip:8,speedScale:1},relics,beacons,checkpoints:[],chests,hazardZones:[],intro,outro:lines(outros[index]),
      goal:index===11?'击败王座守军和恶龙后，到右端囚笼按 F 救出蔡乙先。':'突破'+encounters.length+'处遭遇战，前往右侧光门按 F。星辉和宝箱是可选奖励。'};
  });
  window.GAME_CONTENT={
    title:'银发小鸡骑士：召唤之约',subtitle:'握紧剑，唤来同行者。',campaignVersion:4,groundY:GROUND,levels,
    upgrades:{
      weapon:{name:'骑士长剑',description:'磨亮剑刃，提高挥剑与剑气的力量。',maxLevel:8,costs:[35,65,105,155,215,285,365,455]},
      armor:{name:'银色板甲',description:'加固银甲，提高生命和防御，为冒险守住防线。',maxLevel:8,costs:[30,55,90,135,190,255,330,415]},
      charm:{name:'誓约护符',description:'强化单人剑气的力量与蓄能速度。',maxLevel:8,costs:[40,70,110,160,220,290,370,460]}
    },
    ending:[
      {speaker:'蔡乙先王子',text:'从第一声剑响开始，我就知道，你没有忘记我。谢谢你。'},
      {speaker:'银发小鸡骑士',text:'越过断桥、风雪和熔流。这把剑，一直握到了这里。'},
      {speaker:'旁白',text:'王果冻在囚笼旁轻轻摇了摇尾巴。归途很长，这次可以慢一点走。'}
    ],
    controls:[{key:'A / D · ← / →',label:'左右移动'},{key:'W / ↑ / 空格',label:'跳跃 / 二段跳'},{key:'J',label:'四段连击：三轻一重'},{key:'Q / 鼠标左键',label:'投篮球（回收并冷却后可再次出手）'},{key:'L / 鼠标右键',label:'按住横剑格挡前方攻击'},{key:'K',label:'冲刺 / 短暂无敌'},{key:'E',label:'单人剑气爆发（能量100）'},{key:'R',label:'召唤 / 收回王果冻'},{key:'G',label:'靠近并落地后上骑 / 下骑'},{key:'F',label:'宝箱 / 光门 / 救援'},{key:'P / Esc',label:'暂停'}],
    tips:['各关有不同路线、机关和敌人组合，入口提示会说明当前特色。','碎片和支路宝箱是可选奖励，不用折返补齐才能通关。','清完遭遇战自动保存；誓灯路过自动点亮，不用反复按 F。','宝箱是支路奖励，二段跳可帮助你抵达。','连按或按住 J：三下轻击后接一记重击。','按住 L 横剑格挡前方攻击，松开恢复耐力。','先按 R 召唤王果冻，再靠近并落地按 G 骑乘。','精英出手前有预警，留一次冲刺应对强攻。','能量满时按 E 释放单人剑气；护符能强化剑气和蓄能。','三类装备都有八阶成长，在营地按自己的习惯强化。']
  };
})();
