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
    '穿过旧驿道，把三盏誓灯重新点亮。王德敏公主已经带好了法杖。',
    '萤火虫照着林间小径。树冠高台藏有补给，主路上的誓灯则指向下一处遗迹。',
    '倾斜石柱之间留着高台捷径。收齐誓约碎片，修复通往雾堡的印记。',
    '古堡深处的守门人不肯让路。逐一突破三处战区，击败它再进入北境。',
    '风雪掩住了旧路，冰带让脚下更滑。点亮誓灯，也给归途留一条明亮的线。',
    '沼泽的雾会学人说话。跟着真正的誓灯前进，在浮台上寻找遗失的补给箱。',
    '晶石在深处微微发光。穿过三段矿道战区，避开间歇喷发的热气与石刺。',
    '黑曜猎首带领兽群守着南门。留好冲刺和合击，拆开它们的包围。',
    '热风穿过黑色岩壁。观察火口亮起的预警，在间歇中穿过火带。',
    '云海托起古老回廊。连续的平台藏着支路宝箱，地面长廊始终可以通行。',
    '执刑者守在禁庭尽头。穿过三道护阵，收齐誓约，让王座之门失去束缚。',
    '穿过王座前的守军，点亮最后三盏誓灯。与公主并肩击败恶龙，再到右端囚笼按 F，救出蔡乙先王子。'
  ];
  const intros=[
    [['王德敏公主','蔡乙先被带去龙巢了。先沿誓灯找路，怪物我们一起打。'],['王果冻','好。剑有一点重，不过我答应陪你走到底。']],
    [['王德敏公主','树皮上刻了一个小小的王冠。蔡乙先经过这里。'],['王果冻','那我们留个爪印。他以后就知道是谁来接他了。']],
    [['王果冻','这些石柱比剑还大，搬起来会不会更累？'],['王德敏公主','不用搬。踩着它们上去，我替你看着下方。']],
    [['王德敏公主','守门人被恶龙的咒印控制了。先打碎它的护阵。'],['王果冻','收到。你破咒，我让它先放下剑。']],
    [['王果冻','公主，你有没有觉得，胡须快变成冰棍了？'],['王德敏公主','靠近我的光。寒冷的路，我们也一起走。']],
    [['王果冻','刚才那团雾说，我该回家睡觉。'],['王德敏公主','它也叫我放弃。别听它的，听我们说好的那一句。']],
    [['王德敏公主','这些晶石能给护符充能。高台上的宝箱也别错过。'],['王果冻','明白。找人救人很要紧，捡装备也很要紧。']],
    [['王果冻','它的牙齿比我的剑柄还长。'],['王德敏公主','别盯着牙齿，盯着它冲锋前的动作。我的法术会跟上你。']],
    [['王果冻','这次是真的热。我的披风是不是快熟了？'],['王德敏公主','还没有。火口发亮时先停一下，我们不抢那半步。']],
    [['王果冻','我现在比飞鸟还高，能算飞猫吗？'],['王德敏公主','算很会跳的小骑士。先把前面的蝙蝠请下去。']],
    [['王德敏公主','它把最后一道护阵绑在自己身上。打倒它，王座就会现身。'],['王果冻','到这里了，谁也别想让我们回头。']],
    [['恶龙','走过这么多路，就凭你这只小猫，也敢来我的王座？'],['王德敏公主','还有我。王果冻，走到这里的每一步，都算数。'],['王果冻','嗯。把蔡乙先还给我们。']]
  ];
  const outros=[
    [['王果冻','第一盏到第三盏，一盏也没落下。'],['王德敏公主','很好。前面是密林，树下也许还有王子留下的记号。']],
    [['王德敏公主','信里说，龙巢外有十二道封印。我们走对路了。'],['王果冻','十二道就十二道。下一道，先借我喝口水。']],
    [['王果冻','断桥后面果然还有路。'],['王德敏公主','也有追兵的脚印。雾堡里有人在等我们，先检查好装备。']],
    [['王德敏公主','咒印解开了。它替我们打开了北境的门。'],['王果冻','谢谢你，守门人。下次见面，希望不用先打一架。']],
    [['王果冻','回头看，真的有两行脚印。'],['王德敏公主','等蔡乙先回来，就会有第三行。走吧，前面能避风。']],
    [['王果冻','“走到底。”这句果然比雾响。'],['王德敏公主','王子的求救信还很清楚。矿道那头，就是黑曜哨城。']],
    [['王德敏公主','矿工留下了近路。我们不用绕过整座山。'],['王果冻','太好了。我宣布，修路的人也是英雄。']],
    [['王果冻','现在我能看看牙齿了吗？'],['王德敏公主','等回去再画给你看。先去山上，龙巢的门快打开了。']],
    [['王德敏公主','山路过去了。浮空回廊就在云上。'],['王果冻','向上走？好吧，骑士今天还要负责练腿。']],
    [['王德敏公主','十二道封印，只剩最后两道。蔡乙先离我们很近了。'],['王果冻','那就再握紧一点。我的爪子，现在很稳。']],
    [['王果冻','门开了。里面的声音，是蔡乙先！'],['王德敏公主','最后一战。听我的信号，像一路上那样，一起出手。']],
    [['王果冻','剑还在，爪子也还在。公主，我们做到了！'],['王德敏公主','蔡乙先，出来吧。我们来接你回家。']]
  ];
  const bosses={3:{type:'skeleton',name:'雾堡守门人'},7:{type:'wolf',name:'黑曜猎首'},10:{type:'skeleton',name:'王座执刑者'},11:{type:'dragon',name:'灰烬恶龙 · 格里莫'}};
  const patterns=[['slime','wolf','slime','bat','skeleton','wolf','slime'],['skeleton','bat','wolf','slime','skeleton','bat','wolf'],['wolf','skeleton','bat','wolf','slime','skeleton','bat']];
  const lines=items=>items.map(([speaker,text])=>({speaker,text}));
  const levels=table.map((s,index)=>{
    const [id,name,theme,width,count,region,battleNames,skyTop,skyBottom,ground,accent]=s;
    const anchors=[900,Math.round((width-1450)/2),width-2350],names=battleNames.split('|');
    const encounters=anchors.map((x,i)=>({id:'e'+(i+1),x,label:names[i]}));
    const enemies=[],platforms=[],hazardZones=[];
    anchors.forEach((x,wave)=>{
      const n=Math.floor(count/3)+(wave<count%3?1:0);
      for(let j=0;j<n;j++){
        const boss=wave===2 && j===n-1?bosses[index]:null;
        const elite=!!boss||(index>=2&&j===Math.floor(n/2)&&wave===index%3);
        const type=boss?boss.type:patterns[(index+wave)%3][j%7];
        enemies.push({type,x:x+70+Math.round(j*650/Math.max(1,n-1)),y:GROUND,encounter:encounters[wave].id,
          ...(elite?{elite:true,hpScale:boss?(type==='dragon'?2.4:2.2):1.45,damageScale:boss?1.2:1.1,name:boss?boss.name:'精锐'+({slime:'苔团',wolf:'游猎者',bat:'夜翼',skeleton:'守卫'}[type]||'守卫')}:{}),
          ...(boss?{boss:true}:{})});
      }
      platforms.push({x:x-480,y:490,w:210,h:24},{x:x-190,y:420,w:190,h:24},{x:x+200,y:465-(wave%2)*20,w:220,h:24},{x:x+1090,y:490,w:210,h:24},{x:x+1380,y:420,w:200,h:24});
      if(index!==0||wave!==0){
        const type=theme==='snow'?'ice':(['volcano','mine','throne'].includes(theme)?'flame':'spikes');
        hazardZones.push({id:'hazard-'+wave,x:x-340,w:type==='ice'?210:105+(index%3)*18,type,period:4.4+(wave%2)*.6,active:type==='ice'?2.3:1.35});
      }
    });
    return {id,name,theme,width,region,description:descriptions[index],portalX:width-160,
      palette:{skyTop,skyBottom,ground,accent,mist:theme==='snow'?'#e2f2ef':'#c4cdd0'},platforms,enemies,encounters,
      relics:anchors.map((x,i)=>({id:'relic-'+(i+1),x:x+1000,y:GROUND})),
      beacons:anchors.map((x,i)=>({id:'beacon-'+(i+1),x:x+1150,y:GROUND})),
      checkpoints:anchors.map((x,i)=>({id:'checkpoint-'+(i+1),x:x+1290})),
      chests:anchors.map((x,i)=>({id:'chest-'+(i+1),x:x+1480,y:420,gold:24+index*3+i*7})),
      hazardZones,intro:lines(intros[index]),outro:lines(outros[index]),
      goal:index===11?'突破三处战区，收齐3枚碎片、点亮3盏誓灯，击败恶龙后到右端囚笼按 F 救出蔡乙先。':'突破三处战区，收齐3枚碎片、点亮3盏誓灯，再到光门按 F。'};
  });
  window.GAME_CONTENT={
    title:'王果冻骑士：荒原誓约',subtitle:'小小骑士，也有很大的勇气。',campaignVersion:3,groundY:GROUND,levels,
    upgrades:{
      weapon:{name:'骑士长剑',description:'磨亮剑刃，提高挥剑与合击的力量。',maxLevel:8,costs:[35,65,105,155,215,285,365,455]},
      armor:{name:'银色板甲',description:'加固银甲，提高生命和防御，护住小肚皮。',maxLevel:8,costs:[30,55,90,135,190,255,330,415]},
      charm:{name:'誓约护符',description:'强化公主的法术支援、合击与蓄能。',maxLevel:8,costs:[40,70,110,160,220,290,370,460]}
    },
    ending:[
      {speaker:'蔡乙先王子',text:'从第一声剑响开始，我就知道你们没有忘记我。谢谢你们。'},
      {speaker:'王德敏公主',text:'十二道封印，三十六盏誓灯。你看，我们说到做到了。'},
      {speaker:'王果冻',text:'回家的路可以慢一点吗？我还想把那些宝箱，再认真检查一遍。'},
      {speaker:'旁白',text:'后来，人们记住了一位小小骑士、一位勇敢公主，和他们一起走完的漫长归途。'}
    ],
    controls:[{key:'A / D · ← / →',label:'左右移动'},{key:'W / ↑ / 空格',label:'跳跃 / 二段跳'},{key:'J',label:'挥剑 / 连击'},{key:'K',label:'冲刺 / 短暂无敌'},{key:'E',label:'公主合击（能量100）'},{key:'F',label:'誓灯 / 宝箱 / 检查点 / 光门 / 救援'},{key:'P / Esc',label:'暂停'}],
    tips:['每关有三处战区，清空当前战区后，光障才会解除。','主路上的三枚誓约碎片会自动拾取；三盏誓灯需要靠近后按 F。','检查点旗帜旁按 F 记录进度，首次激活可恢复生命。','高台上的宝箱是支路奖励，二段跳能帮助你抵达。','连按或按住 J 连击；跳跃中也能挥剑。','王德敏公主会主动施法；能量满时按 E 发动合击。','精英出手前有预警，留一次冲刺应对它的强攻。','三类装备都有八阶成长，可以在营地按自己的习惯强化。']
  };
})();
