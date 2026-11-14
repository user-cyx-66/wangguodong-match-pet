/* Painted, cached scenery for the first chapter. Load after game.js and before
 * enemy-variety.js so its enemy-field warnings remain above the ground. */
(function () {
  'use strict';
  const P = window.KnightGame && window.KnightGame.prototype;
  if (!P || P._wastelandSceneryInstalled) return;
  P._wastelandSceneryInstalled = true;
  const oldBackground = P._drawBackground, oldTerrain = P._drawTerrain;
  const W = 1280, H = 720, GROUND = 590, TAU = Math.PI * 2;
  const FAR_Y = 140, MID_Y = 285, LAND_Y = 402;
  const LAMPS = [326, 620, 1850, 2745, 4110];
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  function rng(seed) {
    return function () { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; };
  }
  function surface(width, height) {
    const canvas = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(width, height) : document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    return canvas;
  }
  function ellipse(c, x, y, rx, ry, color, rotation) {
    c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, rotation || 0, 0, TAU); c.fill();
  }
  function poly(c, points, color, edge, width) {
    c.beginPath(); points.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]));
    c.closePath(); c.fillStyle = color; c.fill();
    if (edge) { c.strokeStyle = edge; c.lineWidth = width || 1; c.stroke(); }
  }
  function line(c, points, color, width) {
    c.strokeStyle = color; c.lineWidth = width || 1; c.beginPath();
    points.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke();
  }
  function glow(c, x, y, rx, ry, bright) {
    c.save(); c.translate(x, y); c.scale(1, ry / rx);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, bright); g.addColorStop(.45, 'rgba(226,181,104,.07)'); g.addColorStop(1, 'rgba(226,181,104,0)');
    c.fillStyle = g; c.fillRect(-rx, -rx, rx * 2, rx * 2); c.restore();
  }

  function sky(canvas) {
    const c = canvas.getContext('2d');
    const g = c.createLinearGradient(0, 0, 0, GROUND);
    g.addColorStop(0, '#273b49'); g.addColorStop(.48, '#566e78'); g.addColorStop(1, '#9baba0');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // Low, overlapping storm banks give the sky weight without a hard moon disc.
    const r = rng(4717);
    c.save();c.filter='blur(17px)';
    for (let row = 0; row < 4; row++) {
      for (let x = -150; x < W + 250; x += 145 + r() * 80) {
        const y = 36 + row * 66 + r() * 24;
        ellipse(c, x, y, 160 + r() * 100, 35 + r() * 26, ['rgba(26,44,58,.30)', 'rgba(34,51,66,.25)', 'rgba(50,70,82,.19)', 'rgba(115,138,143,.13)'][row], -.06);
      }
    }
    c.restore();
    const breakInCloud = c.createRadialGradient(968, 216, 12, 968, 216, 365);
    breakInCloud.addColorStop(0, 'rgba(222,221,181,.17)'); breakInCloud.addColorStop(1, 'rgba(222,221,181,0)');
    c.fillStyle = breakInCloud; c.fillRect(580, 0, 700, 565);
    c.strokeStyle = 'rgba(174,191,190,.07)'; c.lineWidth = 1.4;
    for (let i = 0; i < 18; i++) {
      const x = r() * W, y = 65 + r() * 240;
      c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x + 30, y - 9, x + 96, y - 10, x + 139, y - 6); c.stroke();
    }
  }

  function hill(c, width, base, amplitude, phase, color) {
    c.fillStyle = color; c.beginPath(); c.moveTo(-100, GROUND + 20);
    for (let x = -100; x < width + 200; x += 130) {
      const y = base + Math.sin(x / 320 + phase) * amplitude + Math.sin(x / 139 + phase) * amplitude * .18;
      if (x === -100) c.lineTo(x, y);
      else c.quadraticCurveTo(x - 65, y - 13, x, y);
    }
    c.lineTo(width + 160, GROUND + 20); c.closePath(); c.fill();
  }

  function distantCity(c, x, base) {
    c.save(); c.translate(x, base);
    const r = rng(5099);
    // Broken silhouettes, empty windows and broad walls stay subdued in rain.
    for (let i = 0; i < 10; i++) {
      const dx = -240 + i * 49, height = 42 + r() * 40;
      poly(c, [[dx,0],[dx,-height],[dx+9,-height-8],[dx+25,-height-11],[dx+44,-height],[dx+44,0]], '#566b71');
      c.fillStyle = 'rgba(39,59,65,.48)'; c.fillRect(dx + 14, -height + 19, 7, 12);
    }
    poly(c, [[-132,0],[-132,-107],[-116,-119],[-115,-151],[-101,-155],[-99,-141],[-77,-144],[-67,-132],[-66,-32],[-26,-30],[-25,-163],[-40,-165],[-40,-179],[-25,-177],[-23,-205],[-8,-205],[-5,-190],[9,-198],[19,-183],[29,-188],[29,-175],[38,-171],[37,-52],[73,-48],[73,-126],[60,-131],[61,-143],[76,-139],[83,-159],[96,-155],[101,-138],[117,-145],[127,-129],[126,0]], '#415b65');
    poly(c, [[-131,-102],[-67,-127],[-67,-116],[-132,-91]], '#62797d');
    poly(c, [[-24,-160],[37,-173],[37,-163],[-24,-150]], '#6b8082');
    line(c, [[-99,-129],[-100,-43],[-89,-28],[-94,0]], 'rgba(25,48,57,.45)', 2);
    line(c, [[14,-166],[6,-128],[19,-106],[13,-52]], 'rgba(24,47,56,.5)', 2);
    c.fillStyle = '#2e4a55';
    for (const p of [[-104,-112],[-86,-77],[-6,-165],[17,-145],[-4,-115],[93,-110],[93,-77]]) {
      c.beginPath(); c.moveTo(p[0]-3,p[1]+13); c.lineTo(p[0]-3,p[1]); c.quadraticCurveTo(p[0],p[1]-5,p[0]+3,p[1]); c.lineTo(p[0]+3,p[1]+13); c.closePath(); c.fill();
    }
    // Warm sliver of the distant destination, not a gameplay marker.
    c.fillStyle = 'rgba(222,195,138,.36)'; c.fillRect(-4,-162,2,8);
    poly(c, [[-190,0],[-190,-47],[-156,-48],[-154,-67],[-137,-63],[-129,-48],[-50,-48],[-47,-62],[-30,-57],[-21,-48],[53,-48],[56,-61],[70,-66],[75,-48],[158,-48],[161,0]], '#4c656c');
    c.strokeStyle = 'rgba(137,157,151,.16)'; c.lineWidth = 1;
    for (let y = -34; y < -2; y += 12) { c.beginPath(); c.moveTo(-185, y); c.lineTo(156, y); c.stroke(); }
    c.fillStyle = '#344e59'; c.beginPath(); c.moveTo(-19,0); c.lineTo(-19,-18); c.quadraticCurveTo(2,-53,23,-18); c.lineTo(23,0); c.closePath(); c.fill();
    c.restore();
  }

  function far(canvas) {
    const c = canvas.getContext('2d'), width = canvas.width;
    c.translate(0, -FAR_Y);
    hill(c, width, 325, 48, .6, '#71858a');
    hill(c, width, 390, 52, 3.7, '#637e85');
    distantCity(c, 1035, 468);
    // An eroded pass follows the ruined city instead of repeating fir silhouettes.
    hill(c, width, 476, 48, .3, '#526f74');
    c.strokeStyle = 'rgba(180,194,180,.13)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0,478); c.bezierCurveTo(300,405,422,488,636,480); c.bezierCurveTo(904,466,1064,476,1260,472); c.stroke();
    const fog = c.createLinearGradient(0, 395, 0, 590);
    fog.addColorStop(0, 'rgba(177,192,181,0)'); fog.addColorStop(.55, 'rgba(177,192,181,.14)'); fog.addColorStop(1, 'rgba(177,192,181,.32)');
    c.fillStyle = fog; c.fillRect(0, 395, width, 195);
  }

  function bareTree(c, x, y, scale) {
    c.save(); c.translate(x, y); c.scale(scale, scale);
    c.lineCap = 'round'; c.strokeStyle = '#344f55'; c.lineWidth = 8;
    c.beginPath(); c.moveTo(0,0); c.bezierCurveTo(-12,-48,4,-82,-15,-154); c.moveTo(-4,-67); c.bezierCurveTo(-36,-92,-46,-86,-60,-120); c.moveTo(-8,-105); c.bezierCurveTo(27,-111,31,-133,45,-146); c.stroke();
    c.lineWidth = 3;
    line(c, [[-15,-144],[-35,-161],[-33,-180]], '#344f55', 3);
    line(c, [[31,-130],[53,-132],[61,-145]], '#344f55', 3);
    line(c, [[-43,-96],[-67,-102],[-78,-98]], '#344f55', 3);
    ellipse(c, -29, -98, 23, 7, 'rgba(100,124,103,.36)', -.4);
    ellipse(c, 34, -128, 17, 6, 'rgba(100,124,103,.32)', -.4);
    c.restore();
  }

  function mid(canvas) {
    const c = canvas.getContext('2d'), width = canvas.width;
    c.translate(0, -MID_Y);
    hill(c, width, 539, 35, 2.1, '#3c5a5b');
    // A pale old track bends from the city down into the player's road.
    c.fillStyle = 'rgba(165,170,146,.22)'; c.beginPath(); c.moveTo(1023,476);
    c.bezierCurveTo(976,497,744,514,725,536); c.bezierCurveTo(696,556,861,571,920,590);
    c.lineTo(627,590); c.bezierCurveTo(600,560,636,540,702,521); c.bezierCurveTo(766,504,974,490,1000,476); c.closePath(); c.fill();
    for (const [x,y,s] of [[82,565,1.12],[470,555,.62],[1550,573,.86],[2430,562,1.08],[2940,572,.57]]) bareTree(c,x,y,s);
    const r = rng(9247);
    for (let x = 40; x < width + 40; x += 63 + r() * 65) {
      const y = 555 + r() * 25;
      ellipse(c,x,y,25+r()*28,7+r()*8,'rgba(37,69,61,.48)',-.08);
      ellipse(c,x+8,y-3,19+r()*15,6+r()*6,'rgba(91,116,91,.17)',-.12);
    }
    // Mid-distance stone fragments: low shapes keep head and tell height clear.
    for (const [x,y,s] of [[542,552,.58],[1710,568,.8],[2605,557,.7]]) brokenWall(c,x,y,s,true);
    c.strokeStyle = 'rgba(38,59,58,.62)'; c.lineWidth = 3;
    for (let x = 920; x < 1410; x += 52) {
      const y = 566 + Math.sin(x*.01)*4;
      line(c, [[x,y],[x-3,y-35]], 'rgba(36,60,57,.65)', 4);
      line(c, [[x-12,y-23],[x+49,y-29]], 'rgba(48,70,64,.70)', 3);
    }
    const mist = c.createLinearGradient(0, 526, 0, 591);
    mist.addColorStop(0,'rgba(160,183,167,0)'); mist.addColorStop(.65,'rgba(160,183,167,.085)'); mist.addColorStop(1,'rgba(160,183,167,0)');
    c.fillStyle = mist; c.fillRect(0,526,width,65);
  }

  function stone(c, x, y, w, h, r, color) {
    const skew = (r()-.5)*w*.12;
    poly(c, [[x+3,y+2],[x+w*.36,y],[x+w-4,y+1],[x+w,y+h*.55],[x+w-4,y+h],[x+skew+4,y+h-1],[x,y+h*.45]], color, 'rgba(26,43,42,.24)', 1);
    line(c, [[x+5,y+2],[x+w*.45,y+1],[x+w-6,y+3]], 'rgba(174,186,164,.19)', .9);
  }

  function brokenWall(c, x, y, scale, distant) {
    c.save(); c.translate(x,y); c.scale(scale,scale);
    poly(c,[[-63,0],[-65,-57],[-69,-59],[-68,-88],[-39,-90],[-34,-115],[-12,-108],[-10,-91],[10,-89],[10,-67],[32,-65],[35,-39],[74,-40],[77,0]],distant?'#506760':'#4f5b53',distant?'#60756a':'#253f3e',1.5);
    const r=rng(7771);
    c.save(); c.beginPath(); c.moveTo(-63,0); c.lineTo(-68,-88); c.lineTo(-39,-90); c.lineTo(-34,-115); c.lineTo(-12,-108); c.lineTo(-10,-91); c.lineTo(10,-89); c.lineTo(10,-67); c.lineTo(32,-65); c.lineTo(35,-39); c.lineTo(74,-40); c.lineTo(77,0); c.closePath(); c.clip();
    for(let row=0;row<6;row++)for(let j=0;j<5;j++)stone(c,-83+j*37+(row%2)*18,-118+row*24,34,21,r,distant?'#526a61':['#5a6659','#627060','#4b5e54'][j%3]);
    c.restore();
    line(c,[[-67,-88],[-39,-89],[-34,-115],[-12,-108]],distant?'#7a8974':'#90967c',3);
    poly(c,[[-63,-14],[-52,-46],[-20,-49],[7,-18],[49,-15],[78,0],[-65,0]],'rgba(49,76,55,.56)');
    ellipse(c,-28,-89,15,3,'rgba(139,157,101,.45)',-.15);
    for(const [dx,dy,s] of [[-81,-1,15],[86,1,20],[60,3,13]])stone(c,dx,dy-s*.55,s,s*.55,r,distant?'#526961':'#697365');
    c.restore();
  }

  function fence(c, x, y, width, broken) {
    c.save(); c.translate(x,y); c.lineCap='round';
    for(let i=0;i<=width/52;i++){
      const dx=i*52,slant=Math.sin(i*5)*4;
      poly(c,[[dx-4,0],[dx-4+slant,-57],[dx+1+slant,-63],[dx+6+slant,-56],[dx+5,0]],'#4c5041','#293e38',1);
      line(c,[[dx-2,-53],[dx-1,-10]],'rgba(157,145,107,.36)',1.5);
    }
    for(const h of [22,43]){
      const end=broken?width-40:width;
      poly(c,[[-9,-h],[end,-h-5],[end+2,-h+3],[-8,-h+8]],'#666149','#31453b',1);
      line(c,[[-3,-h+1],[end-4,-h-3]],'rgba(173,158,115,.3)',1);
    }
    if(broken)poly(c,[[width-34,-34],[width-27,-40],[width+43,-6],[width+38,0]],'#646148','#31453b',1);
    c.restore();
  }

  function sign(c,x,y) {
    c.save(); c.translate(x,y); c.rotate(-.035);
    poly(c,[[-5,0],[-5,-136],[1,-144],[7,-139],[6,0]],'#5c5846','#263e39',2);
    line(c,[[-1,-132],[1,-12]],'#a19168',1.5);
    poly(c,[[-47,-129],[30,-132],[49,-119],[29,-105],[-45,-104]],'#796c4d','#35483e',2);
    line(c,[[-39,-124],[25,-127],[37,-119]],'#b4a077',1);
    // A small crown and a plain directional arrow read without extra UI text.
    line(c,[[-31,-116],[-30,-122],[-25,-118],[-20,-123],[-15,-118],[-11,-123],[-11,-115],[-31,-115]],'#d5c28a',1.5);
    line(c,[[0,-119],[25,-119],[19,-124]],'#d5c28a',2); line(c,[[25,-119],[19,-114]],'#d5c28a',2);
    poly(c,[[-29,-96],[26,-96],[26,-80],[-39,-79],[-48,-86]],'#5e6650','#30453b',1.5);
    line(c,[[-28,-88],[13,-88]],'#b3b18a',1.2);
    c.restore();
  }

  function tent(c,x,y) {
    c.save(); c.translate(x,y);
    ellipse(c,0,4,147,12,'rgba(17,33,32,.28)');
    poly(c,[[-119,0],[-47,-126],[11,-135],[112,-7]],'#5d6252','#293f3c',2);
    poly(c,[[-119,0],[-47,-126],[-18,-15],[-55,-6]],'#78816a','#3f5449',1.5);
    poly(c,[[-47,-126],[11,-135],[112,-7],[35,-3],[-18,-15]],'#626e5b','#3b5047',1.5);
    poly(c,[[-55,-6],[-44,-75],[-18,-15]],'#263e3b');
    line(c,[[-46,-125],[11,-135],[112,-7]],'#9b9d7d',2);
    line(c,[[-14,-114],[38,-23],[94,-9]],'rgba(181,180,139,.25)',1.5);
    poly(c,[[54,-65],[62,-49],[57,-24],[48,-28]],'#324b43');
    line(c,[[-48,-126],[-150,0]],'#849078',1); line(c,[[11,-135],[151,1]],'#849078',1);
    line(c,[[-150,-7],[-151,5]],'#474e40',3); line(c,[[151,-7],[150,5]],'#474e40',3);
    // Empty camp: a rolled blanket, crate and a cold hearth.
    ellipse(c,-93,-1,27,8,'#7a775c'); ellipse(c,-115,-3,5,8,'#505e4d');
    poly(c,[[101,0],[99,-35],[138,-37],[143,-1]],'#5e5943','#2c4037',2);
    line(c,[[102,-32],[139,-4],[102,-3],[137,-34]],'#91815c',3);
    c.restore();
  }

  function cart(c,x,y) {
    c.save(); c.translate(x,y); c.rotate(.09);
    poly(c,[[-64,-22],[-78,-72],[59,-72],[48,-24]],'#5a5d48','#2c4139',2);
    for(let i=0;i<4;i++)line(c,[[-72,-65+i*12],[54,-65+i*12]],'#918463',2);
    for(const dx of [-44,43]){
      c.strokeStyle='#34453b';c.lineWidth=8;c.beginPath();c.arc(dx,-17,25,0,TAU);c.stroke();c.strokeStyle='#938365';c.lineWidth=2;c.stroke();
      for(let i=0;i<4;i++){const a=i*Math.PI/4;line(c,[[dx-Math.cos(a)*23,-17-Math.sin(a)*23],[dx+Math.cos(a)*23,-17+Math.sin(a)*23]],'#82795a',2);}
    }
    line(c,[[51,-29],[117,0]],'#6d6951',6);
    poly(c,[[-20,-74],[-30,-100],[-2,-111],[24,-95],[36,-73]],'#7b7f65','#415346',2);
    c.restore();
  }

  function puddle(c,x,y,w,h,seed) {
    const r=rng(seed);
    c.fillStyle='rgba(98,130,137,.52)'; c.strokeStyle='rgba(161,181,173,.27)';c.lineWidth=1;
    c.beginPath();c.moveTo(x-w*.5,y);
    c.bezierCurveTo(x-w*.43,y-h,x-w*.2,y-h*.85,x-w*.04,y-h*.7);
    c.bezierCurveTo(x+w*.29,y-h*1.2,x+w*.6,y-h*.4,x+w*.48,y+h*.2);
    c.bezierCurveTo(x+w*.43,y+h*.9,x+w*.13,y+h*.45,x-w*.1,y+h*.8);
    c.bezierCurveTo(x-w*.4,y+h*.6,x-w*.3,y+h*.3,x-w*.5,y);c.closePath();c.fill();c.stroke();
    for(let i=0;i<6;i++){
      const dx=x+(r()-.5)*w*.68,dy=y+(r()-.5)*h*.75;
      line(c,[[dx,dy],[dx+10+r()*29,dy-.6]],'rgba(184,204,193,.25)',1);
    }
  }

  function grass(c,x,y,size,r) {
    c.lineCap='round';
    for(let i=0;i<6;i++){
      const h=size*(.6+r()*.6),dx=(r()-.5)*size;
      c.strokeStyle=['#6c8161','#7d8c68','#4c6954'][i%3]; c.lineWidth=i%2?1.1:1.8;
      c.beginPath();c.moveTo(x+dx*.3,y);c.quadraticCurveTo(x+dx*.7,y-h*.7,x+dx-4,y-h);c.stroke();
    }
  }

  function lantern(c,x) {
    // Light remains behind all game entities and their warnings.
    glow(c,x+18,GROUND-83,91,105,'rgba(255,217,146,.24)');
    glow(c,x+18,GROUND+25,103,17,'rgba(230,192,120,.17)');
    poly(c,[[x-4,GROUND],[x-4,GROUND-125],[x+2,GROUND-132],[x+9,GROUND-125],[x+7,GROUND]],'#4c5141','#263d36',2);
    line(c,[[x,GROUND-120],[x+24,GROUND-120],[x+28,GROUND-109]],'#9a8d62',3);
    line(c,[[x+20,GROUND-118],[x+20,GROUND-102]],'#314639',2);
    poly(c,[[x+7,GROUND-101],[x+32,GROUND-101],[x+30,GROUND-68],[x+10,GROUND-68]],'#786e49','#283f36',2);
    const glass=c.createLinearGradient(x+10,0,x+30,0);
    glass.addColorStop(0,'#b98a4d');glass.addColorStop(.45,'#f1d28b');glass.addColorStop(1,'#b98b54');
    poly(c,[[x+12,GROUND-96],[x+27,GROUND-96],[x+26,GROUND-73],[x+13,GROUND-73]],glass);
    line(c,[[x+19,GROUND-98],[x+19,GROUND-71]],'rgba(81,75,48,.65)',1.5);
    poly(c,[[x+5,GROUND-102],[x+16,GROUND-110],[x+24,GROUND-110],[x+35,GROUND-102]],'#7d8060','#2f4438',1.5);
    ellipse(c,x+18,GROUND+1,22,3,'rgba(31,47,35,.32)');
    line(c,[[x+12,GROUND+17],[x+24,GROUND+17]],'rgba(229,199,137,.25)',1.3);
    line(c,[[x+6,GROUND+24],[x+31,GROUND+24]],'rgba(229,199,137,.18)',1.8);
    line(c,[[x+14,GROUND+32],[x+25,GROUND+32]],'rgba(229,199,137,.13)',1);
  }

  function land(canvas, worldWidth) {
    const c=canvas.getContext('2d'),r=rng(372889);c.translate(0,-LAND_Y);
    const grad=c.createLinearGradient(0,GROUND-8,0,H);
    grad.addColorStop(0,'#5d6b5a');grad.addColorStop(.12,'#56645a');grad.addColorStop(.60,'#3f524b');grad.addColorStop(1,'#293d39');
    c.fillStyle=grad;c.fillRect(0,GROUND-2,worldWidth+32,H-GROUND+2);
    // Broad slabs at the foot line grow toward the viewer; no decorative grass
    // wall across the player's feet, and no fake pits in the combat surface.
    const rows=[[592,12,46],[608,18,62],[632,24,85],[663,31,111],[702,38,147]];
    for(let row=0;row<rows.length;row++){
      const [y,h,size]=rows[row];
      for(let x=-size;x<worldWidth+size;){
        const w=size*(.75+r()*.65),yy=y+(r()-.5)*3;
        stone(c,x+3,yy,w-5,h,r,['#5f6c61','#627067','#56665d','#6b7566','#4d6158'][Math.floor(r()*5)]);
        if(r()>.77)line(c,[[x+w*.3,yy+2],[x+w*.42,yy+h*.5],[x+w*.33,yy+h-2]],'rgba(29,49,44,.28)',1);
        x+=w;
      }
    }
    // Cold shallow reflections occupy the lower road, leaving silhouettes clear.
    for(const p of [[650,641,215,9],[1125,696,183,11],[1670,624,187,7],[2220,674,260,12],[2820,633,208,8],[3395,688,240,12],[3830,624,177,7],[4350,670,235,10]])puddle(c,...p,Math.round(p[0]));
    for(let x=0;x<worldWidth;x+=23+r()*27){
      const y=GROUND-1;
      if(r()>.73)grass(c,x,y,7+r()*9,r);
      if(r()>.47){const yy=623+r()*94;ellipse(c,x+9,yy,2+r()*4,1+r()*1.7,'rgba(177,186,154,.16)',-.1);}
    }
    // Landmarks bracket the open fighting spaces at 800–1700 and 3000–3960.
    fence(c,29,GROUND-2,188,true);sign(c,423,GROUND-2);
    brokenWall(c,1205,GROUND-18,.72,false);
    tent(c,2085,GROUND-17);fence(c,2360,GROUND-10,152,true);
    cart(c,2860,GROUND-11);brokenWall(c,4020,GROUND-8,.85,false);
    sign(c,4285,GROUND-2);
    for(const x of [52,228,448,1190,1269,1816,2235,2403,2789,2913,3980,4063,4252])grass(c,x,GROUND-1,13+r()*10,r);
    // Foreground tufts sit below the actual collision line and cannot hide tells.
    for(let x=32;x<worldWidth;x+=130+r()*170){grass(c,x,710+r()*18,15+r()*13,r);stone(c,x+29,684+r()*31,10+r()*16,5+r()*7,r,'#526458');}
    line(c,[[0,GROUND+.5],[worldWidth,GROUND+.5]],'rgba(181,191,154,.48)',1.4);
    for(const x of LAMPS)if(x<worldWidth-20)lantern(c,x);
  }

  function build(game) {
    const width=Math.max(W,Math.ceil(game.worldWidth||4600));
    const cache={width,sky:surface(W,H),far:surface(Math.ceil(width*.16)+W+2,GROUND-FAR_Y),mid:surface(Math.ceil(width*.44)+W+2,GROUND-MID_Y),land:surface(width+32,H-LAND_Y),builds:1};
    sky(cache.sky);far(cache.far);mid(cache.mid);land(cache.land,width);
    return cache;
  }
  function getCache(game) {
    if(!game._wastelandScenery||game._wastelandScenery.width!==Math.max(W,Math.ceil(game.worldWidth||4600)))game._wastelandScenery=build(game);
    return game._wastelandScenery;
  }
  function strip(c,canvas,x,y,targetX) {
    const sx=clamp(Math.floor(x),0,canvas.width-W),height=canvas.height;
    c.drawImage(canvas,sx,0,W,height,targetX,y,W,height);
  }

  P._drawBackground=function(c) {
    if(this.stageIndex!==0)return oldBackground.call(this,c);
    const a=getCache(this),cam=clamp(this.camera||0,0,a.width-W);
    c.save();c.drawImage(a.sky,0,0);
    strip(c,a.far,cam*.16,FAR_Y,0);strip(c,a.mid,cam*.44,MID_Y,0);
    c.restore();
  };
  P._drawTerrain=function(c) {
    if(this.stageIndex!==0)return oldTerrain.call(this,c);
    const a=getCache(this),cam=Math.floor(clamp(this.camera||0,0,a.width-W)),t=this.realTime||0;
    const viewX=Math.max(0,Math.round(this.camera||0)-32),viewW=Math.min(W+64,a.land.width-viewX);
    c.save();c.drawImage(a.land,viewX,0,viewW,a.land.height,viewX,LAND_Y,viewW,a.land.height);
    // Keep the original platforms' exact top and dimensions. Stone piers and
    // broken timber suggest physical weight while remaining visual only.
    for(const p of this.platforms||[]){
      if(p.x+p.w<cam-40||p.x>cam+W+40)continue;
      const r=rng(831+Math.round(p.x));
      const h=p.h||26;
      poly(c,[[p.x,p.y],[p.x+p.w,p.y],[p.x+p.w-7,p.y+h],[p.x+4,p.y+h]],'#5c6758','#2c423a',1.5);
      c.fillStyle='#9b9e7c';c.fillRect(p.x,p.y,p.w,3);
      c.fillStyle='#79896b';c.fillRect(p.x+3,p.y+3,p.w-6,3);
      for(let x=p.x+6;x<p.x+p.w-12;x+=38)stone(c,x,p.y+8,Math.min(34,p.x+p.w-x-3),h-10,r,'#59695a');
      line(c,[[p.x+15,p.y+h],[p.x+29,p.y+h+20],[p.x+50,p.y+h]],'#43594b',5);
      line(c,[[p.x+p.w-15,p.y+h],[p.x+p.w-29,p.y+h+20],[p.x+p.w-50,p.y+h]],'#43594b',5);
      ellipse(c,p.x+25,p.y+2,20,2,'rgba(181,188,129,.28)');
    }
    // A few moving pin lights and ripples; all broad glows stay in the cache.
    for(const x of LAMPS){
      if(x<cam-50||x>cam+W+50||x>a.width-20)continue;
      c.globalAlpha=.48+Math.sin(t*5+x)*.1;
      ellipse(c,x+20,GROUND-84,2,7,'#fff0b7');
      c.globalAlpha=.14+Math.sin(t*3+x)*.04;
      line(c,[[x+11,GROUND+25],[x+29,GROUND+25]],'#f8d896',1.5);
    }
    c.globalAlpha=1;c.strokeStyle='rgba(178,200,194,.18)';c.lineWidth=1;
    for(const x of [648,1678,2224,2810,3390,4350]){
      if(x<cam-50||x>cam+W+50)continue;
      const phase=(t*.7+x*.013)%1,y=x===648?641:x===1678?624:x===2224?674:x===2810?633:x===3390?688:670;
      c.globalAlpha=(1-phase)*.32;c.beginPath();c.ellipse(x+Math.sin(x)*14,y,3+phase*20,1+phase*3,0,0,TAU);c.stroke();
    }
    c.restore();
  };
  window.KnightWastelandScenery={version:1};
})();
