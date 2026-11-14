/* Independent Chrome QA for the trial. Uses an isolated temporary profile.
 * Keyboard feedback checks position an existing 84HP wolf and delay its AI;
 * death uses real enemy AI with accelerated fixed steps. Neither fixture changes
 * HP, attack, damage or rewards. Completion runs ordinary pilot inputs on RAF.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
const repo=path.resolve(import.meta.dirname,'..');
const out=path.resolve(process.env.KNIGHT_BROWSER_QA_DIR||path.join(repo,'../../制作资料/过程记录/精修试玩_2026-11-13/阶段B浏览器'));
fs.mkdirSync(out,{recursive:true});
const url=process.argv[2]||'http://127.0.0.1:8877/';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const report={checks:[],scope:'Isolated Chrome with real assets/DOM. Real J key events for feedback; positioned existing enemy fixture, no stat edits. Death uses real AI/fixed steps; completion uses ordinary inputs on the running RAF loop.'};
let server,browser,ws,session,seq=0;const pending=new Map(),errors=[],logs=[];
function send(method,params={},sid=session){return new Promise((resolve,reject)=>{const id=++seq,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method));},25000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params,...(sid?{sessionId:sid}:{})}));});}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result?.value;}
function check(name,ok,details){report.checks.push({name,ok:!!ok,...(details!==undefined?{details}:{})});if(!ok)throw Error(name+': '+JSON.stringify(details));console.log('PASS '+name);}
async function until(expression,timeout=8000){const started=Date.now();while(Date.now()-started<timeout){const r=await evaluate(expression);if(r)return r;await sleep(25);}throw Error('Timed out: '+expression);}
async function shot(name,canvas=false){if(canvas){const data=await evaluate('knightGame.canvas.toDataURL("image/png")');fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(data.split(',')[1],'base64'));}else{const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(r.data,'base64'));}}
async function click(selector){const r=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing button');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height};})()`);if(!r.w||!r.h)throw Error('Hidden button '+selector);await send('Input.dispatchMouseEvent',{type:'mousePressed',x:r.x,y:r.y,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:r.x,y:r.y,button:'left',clickCount:1});await sleep(65);}
async function key(code,down){await send('Input.dispatchKeyEvent',{type:down?'keyDown':'keyUp',key:code==='KeyJ'?'j':code,code,windowsVirtualKeyCode:code==='KeyJ'?74:0});}
async function viewport(width,height,mobile=false){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});await sleep(180);}
try{
  try{const response=await fetch(url,{signal:AbortSignal.timeout(1500)});if(!response.ok)throw Error('HTTP '+response.status);}catch{
    server=spawn('python',['-m','http.server','8877','--bind','127.0.0.1','--directory',path.join(repo,'dist')],{cwd:repo,windowsHide:true,stdio:'ignore'});
    let ready=false;for(let i=0;i<30;i++){try{ready=(await fetch(url)).ok;}catch{}if(ready)break;await sleep(100);}if(!ready)throw Error('Local preview did not start');
  }
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'codex-knight-quality-'));
  browser=spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',['--headless=new','--no-first-run','--no-default-browser-check','--disable-extensions','--disable-background-networking','--disable-background-timer-throttling','--remote-debugging-port=0','--window-size=1440,1080',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
  browser.stderr.on('data',v=>{logs.push(v.toString());if(logs.length>20)logs.shift();});
  const portFile=path.join(profile,'DevToolsActivePort');for(let i=0;i<80&&!fs.existsSync(portFile);i++)await sleep(100);
  if(!fs.existsSync(portFile))throw Error('Chrome launch failed '+logs.join('').slice(-2500));
  const [port,endpoint]=fs.readFileSync(portFile,'utf8').trim().split(/\r?\n/);ws=new WebSocket(`ws://127.0.0.1:${port}${endpoint}`);
  await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
  ws.addEventListener('message',e=>{const r=JSON.parse(e.data),p=pending.get(r.id);if(p){pending.delete(r.id);clearTimeout(p.timer);r.error?p.reject(Error(JSON.stringify(r.error))):p.resolve(r.result);}else if(r.method==='Runtime.exceptionThrown')errors.push(r.params.exceptionDetails.exception?.description||r.params.exceptionDetails.text);else if(r.method==='Log.entryAdded'&&r.params.entry.level==='error')errors.push(r.params.entry.text);});
  const {targetId}=await send('Target.createTarget',{url:'about:blank'},null);session=(await send('Target.attachToTarget',{targetId,flatten:true},null)).sessionId;
  await send('Page.enable');await send('Runtime.enable');await send('Log.enable');await send('Page.navigate',{url});
  await until('!!window.knightGame');await send('Page.bringToFront');await viewport(1440,1080);
  await until('Object.values(knightGame.artsets).flat().every(a=>a?.ready)');
  check('real application and all painted art sets load',true);
  await viewport(390,844,true);await shot('首页390');
  const menu=await evaluate(`(()=>{const b=document.querySelector('#showcase-button'),r=b.getBoundingClientRect();return {scrollWidth:document.documentElement.scrollWidth,width:innerWidth,button:[r.left,r.right,r.width],recommended:b.classList.contains('primary')};})()`);
  check('390px homepage recommends trial without horizontal overflow',menu.scrollWidth<=392&&menu.button[0]>=0&&menu.button[1]<=392&&menu.recommended,menu);
  await viewport(1440,1080);await click('[data-action="new"]');await click('[data-action="resume"]');await evaluate('knightGame.setAudio(false)');
  await click('[data-action="pause"]');await click('#dialog-panel [data-action="home"]');
  const saved=await evaluate('localStorage.getItem("wangguodong-knight-v1")');
  check('campaign save is created through normal new-game UI',!!saved&&JSON.parse(saved).stageId===await evaluate('knightGame.levels[0].id'));
  report.campaignSave={bytes:saved.length,sha256:createHash('sha256').update(saved).digest('hex')};
  await evaluate(`window.__trialWrites=0;window.__setItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='wangguodong-knight-v1')window.__trialWrites++;return window.__setItem.call(this,k,v);};`);
  await click('[data-action="showcase"]');
  check('real trial click opens its own introduction',await evaluate('!document.querySelector("#game-overlay").hidden&&document.querySelector("#dialog-panel").textContent.includes("精修试玩")&&knightGame.showcase'));
  const wolves=await evaluate('knightGame.enemies.map(e=>({variant:e.variant,hp:e.hp,maxHp:e.maxHp}))');
  check('trial contains exactly three unchanged 84HP chargers',wolves.length===3&&wolves.every(e=>e.variant==='charger'&&e.hp===84&&e.maxHp===84),wolves);
  await click('#dialog-panel [data-action="resume"]');await sleep(180);await shot('试玩首图');await shot('首图柔云与道路',true);
  // Reposition the first existing wolf/player, with no HP/damage changes. Delay
  // its AI so real J key events can capture exact light/heavy contact frames.
  await evaluate(`(()=>{const g=knightGame,p=g.player,e=g.enemies[0];p.x=e.x-75;p.y=590;p.vx=p.vy=0;p.facing=1;g.camera=p.x-448;e.brain.state='recover';e.brain.left=10;window.__hits=[];window.__captureIndex=0;window.__damage=g._damageEnemy;g._damageEnemy=function(e,d,k,m){const i=this.player.attack?.index,r=window.__damage.call(this,e,d,k,m);window.__hits.push({index:i,hp:e.hp,damage:d});if(e.id===0&&i===window.__captureIndex){this.pause();this._draw();}return r;};})()`);
  await sleep(80);await shot('猎狼84HP_接敌',true);
  await key('KeyJ',true);await until('knightGame.paused&&window.__hits.length>0');await key('KeyJ',false);await shot('真实J轻击_局部接触',true);
  report.light=await evaluate('({hits:window.__hits,impact:knightGame.particles.find(p=>p.kind==="impact"),hitFlash:knightGame.enemies[0].hitFlash})');
  check('actual J keyboard creates one light contact and local effect',report.light.hits.length===1&&report.light.hits[0].index===0&&report.light.impact?.size>0,report.light);
  const white=await evaluate(`(()=>{const g=knightGame,e=g.enemies[0],flash=e.hitFlash;function sample(value){e.hitFlash=value;const out=document.createElement('canvas');out.width=240;out.height=200;const c=out.getContext('2d');c.fillStyle='#17232b';c.fillRect(0,0,240,200);c.translate(120-e.x,180-e.y);g._drawEnemy(c,e);return c.getImageData(0,45,240,135).data;}const a=sample(0),b=sample(flash);e.hitFlash=flash;let brighter=0,total=0,max=0;for(let i=0;i<a.length;i+=4){const d=(b[i]+b[i+1]+b[i+2]-a[i]-a[i+1]-a[i+2])/3;if(d>12)brighter++;total+=d;max=Math.max(max,d);}return {brighterPixels:brighter,averageLumaIncrease:total/(a.length/4),maxIncrease:max,flash};})()`);
  check('real painted enemy mask visibly brightens body pixels',white.brighterPixels>100&&white.averageLumaIncrease>2&&white.maxIncrease>20,white);
  await evaluate('window.__captureIndex=3;knightGame.resume()');await key('KeyJ',true);
  await until('knightGame.paused&&window.__hits.some(h=>h.index===3)');await key('KeyJ',false);await shot('真实J重击_死亡收束',true);
  report.heavy=await evaluate('({hits:window.__hits,impact:knightGame.particles.find(p=>p.kind==="impact"&&p.heavy),hitFlash:knightGame.enemies[0].hitFlash})');
  check('real held J completes three light strikes then one stronger heavy',JSON.stringify(report.heavy.hits.map(h=>h.index))==='[0,1,2,3]'&&report.heavy.impact.size>report.light.impact.size*1.4&&report.heavy.impact.max>report.light.impact.max*1.25,report.heavy);
  await evaluate('knightGame._damageEnemy=window.__damage');await click('[data-action="pause"]');await click('#dialog-panel [data-action="retry"]');await click('#dialog-panel [data-action="resume"]');
  // Real wolf AI can kill an idle player. Fixed-step acceleration avoids waiting
  // for ten natural charges; no damage/HP function is invoked by the fixture.
  const death=await evaluate(`(()=>{const g=knightGame;g.pause();g.player.x=905;let frames=0;for(;frames<12000&&!g.dead;frames++){g._update(1/60);g.pressed={};}return {dead:g.dead,frames,hp:g.player.hp,panel:document.querySelector('#dialog-panel').textContent};})()`);
  check('real enemy attacks open the trial death UI',death.dead&&death.hp===0&&death.panel.includes('重新挑战三只猎狼'),death);await shot('真实受伤死亡');
  await click('#dialog-panel [data-action="retry"]');
  check('actual retry resets trial and returns to its introduction',await evaluate('knightGame.showcase&&knightGame.player.x===140&&knightGame.enemies.every(e=>e.hp===84)&&document.querySelector("#dialog-panel").textContent.includes("精修试玩")'));
  await click('#dialog-panel [data-action="resume"]');
  await evaluate(fs.readFileSync(path.join(repo,'tools/campaign-pilot.js'),'utf8'));
  await evaluate(`window.__pilotResult=null;window.__pilotStart=performance.now();window.__pilotFrame=0;window.__pilot=new CampaignPilot();function drive(){const g=knightGame;if(g.gateEntered||g.dead){window.__pilotResult={completed:g.gateEntered,dead:g.dead,frames:window.__pilotFrame,seconds:(performance.now()-window.__pilotStart)/1000,hp:g.player.hp,kills:g.stageKills,encounters:g.adventure.clearedEncounters.size};return;}window.__pilot.step(g,window.__pilotFrame++);requestAnimationFrame(drive);}requestAnimationFrame(drive);`);
  report.performance=await evaluate(`new Promise(resolve=>{const g=knightGame,original=g._draw,draws=[],frames=[];let start=0,last=0;g._draw=function(){const t=performance.now(),r=original.call(this);draws.push(performance.now()-t);return r;};function frame(t){if(!start)start=t;if(last)frames.push(t-last);last=t;if(t-start<5000){requestAnimationFrame(frame);return;}g._draw=original;const p=(a,q)=>{a=[...a].sort((x,y)=>x-y);return a[Math.floor((a.length-1)*q)]||0;};resolve({seconds:(t-start)/1000,fps:frames.length*1000/(t-start),frameP95Ms:p(frames,.95),drawP95Ms:p(draws,.95),draws:draws.length});}requestAnimationFrame(frame);})`);
  check('running trial sustains a five-second render sample',report.performance.seconds>=5&&report.performance.draws>100&&report.performance.drawP95Ms<20,report.performance);
  const complete=await until('window.__pilotResult',35000);
  check('ordinary inputs on actual RAF complete the trial alive',complete.completed&&!complete.dead&&complete.kills===3&&complete.encounters===2,complete);
  const finish=await evaluate('({text:document.querySelector("#dialog-panel").textContent,next:!!document.querySelector("#dialog-panel [data-action=next]"),retry:!!document.querySelector("#dialog-panel [data-action=retry]"),home:!!document.querySelector("#dialog-panel [data-action=home]"),writes:window.__trialWrites})');
  check('F completion opens trial finish UI with retry/home, no camp progression',finish.text.includes('荒原试炼完成')&&finish.retry&&finish.home&&!finish.next&&finish.writes===0,finish);await shot('试玩完成');
  await click('#dialog-panel [data-action="home"]');
  check('all trial UI and gameplay paths preserve original save bytes',await evaluate('localStorage.getItem("wangguodong-knight-v1")')===saved&&await evaluate('window.__trialWrites')===0);
  await click('[data-action="continue"]');
  check('continue returns to normal campaign without rewriting the save',await evaluate('!knightGame.showcase&&knightGame.stage===knightGame.levels[0]&&knightGame.enemies.length>3')&&await evaluate('localStorage.getItem("wangguodong-knight-v1")')===saved);
  await click('#dialog-panel [data-action="resume"]');
  for(const [width,height,name] of [[844,390,'横屏'],[390,844,'竖屏']]){
    await viewport(width,height,true);await shot('11键'+name);
    const layout=await evaluate(`(()=>{const c=document.querySelector('#game-canvas').getBoundingClientRect(),t=document.querySelector('#touch-controls').getBoundingClientRect(),keys=[...document.querySelectorAll('#touch-controls button')].map(b=>{const r=b.getBoundingClientRect();return {x:r.x,right:r.right,w:r.width,h:r.height};});return {scrollWidth:document.documentElement.scrollWidth,canvas:{top:c.top,bottom:c.bottom,h:c.height},touch:{top:t.top,bottom:t.bottom},keys};})()`);
    check(name+' keeps 11 usable touch keys without horizontal overflow',layout.scrollWidth<=width+2&&layout.keys.length===11&&layout.keys.every(k=>k.w>=20&&k.h>=20&&k.x>=-1&&k.right<=width+2),layout);
    if(width>height)check('landscape shows battlefield and keys together',layout.canvas.h>=130&&layout.canvas.top>=0&&layout.touch.top>=layout.canvas.bottom-2&&layout.touch.bottom<=height+2,layout);
  }
  check('no application runtime or resource errors',errors.length===0,errors);report.ok=true;
}catch(error){report.ok=false;report.error=error.stack||String(error);console.error(report.error);process.exitCode=1;}
finally{
  report.errors=errors;report.passed=report.checks.filter(c=>c.ok).length;report.failed=report.checks.filter(c=>!c.ok).length;
  fs.writeFileSync(path.join(out,'quality-browser.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({ok:report.ok,passed:report.passed,failed:report.failed,out,performance:report.performance}));
  if(ws?.readyState===WebSocket.OPEN){try{await send('Browser.close',{},null);}catch{}ws.close();}
  if(browser?.exitCode===null)browser.kill();if(server?.exitCode===null)server.kill();
}
