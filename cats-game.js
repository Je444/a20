(function(){
"use strict";

/* =====================================================
   貓咪攻城戰 v3
   核心：
   1. 角色真正向敵方基地移動
   2. 前後單位發生碰撞後停下
   3. 依攻擊冷卻時間真正「一下一下」攻擊
   4. 敵人依關卡自動生成
   5. 使用 SVG 角色圖，而不是只畫 emoji
   6. 基地有真正的攻擊範圍與推進終點
   ===================================================== */

const STAGES=[
  {name:"第一關",enemyHp:236000,spawnInterval:2600,enemySpeedMul:1.0,enemyDamage:6,stars:"★",maxEnemies:10},
  {name:"第二關",enemyHp:360000,spawnInterval:2100,enemySpeedMul:1.2,enemyDamage:8,stars:"★★",maxEnemies:13},
  {name:"第三關",enemyHp:520000,spawnInterval:1700,enemySpeedMul:1.45,enemyDamage:10,stars:"★★★",maxEnemies:16}
];

const UNIT_TYPES={
  cat1:{cost:150,hp:180,damage:40,speed:1.00,radius:34,icon:"assets/battle/cat1.svg", cardIcon:"assets/cat1.svg",cooldown:900,attackRange:72,attackTime:.16},
  cat2:{cost:300,hp:360,damage:70,speed:.78,radius:40,icon:"assets/battle/cat2.svg", cardIcon:"assets/cat2.svg",cooldown:1400,attackRange:78,attackTime:.20},
  cat3:{cost:540,hp:700,damage:125,speed:.62,radius:47,icon:"assets/battle/cat3.svg", cardIcon:"assets/cat3.svg",cooldown:2100,attackRange:92,attackTime:.24},
  cat4:{cost:690,hp:950,damage:170,speed:.52,radius:52,icon:"assets/battle/cat4.svg", cardIcon:"assets/cat4.svg",cooldown:2600,attackRange:100,attackTime:.27},
  cat5:{cost:950,hp:1350,damage:250,speed:.42,radius:58,icon:"assets/battle/cat5.svg", cardIcon:"assets/cat5.svg",cooldown:3400,attackRange:110,attackTime:.30}
};

const ENEMY_TYPES={
  enemy1:{hp:240,damage:22,speed:.55,radius:35,icon:"assets/battle/enemy1.svg",attackCooldown:1250,attackRange:70,attackTime:.18},
  enemy2:{hp:680,damage:58,speed:.34,radius:48,icon:"assets/battle/enemy2.svg",attackCooldown:1900,attackRange:90,attackTime:.23}
};

const MAX_MONEY=6000;
const START_MONEY=1869;
const MONEY_RATE=75;
const CANVAS_W=1800;
const CANVAS_H=900;
const GROUND_Y=650;
const LEFT_BASE_X=150;
const RIGHT_BASE_X=1650;
const PLAYER_SPAWN_X=1550;
const ENEMY_SPAWN_X=250;
const BASE_ATTACK_RANGE=120;
const BASE_ATTACK_COOLDOWN=1500;

const mapScreen=document.getElementById("map-screen");
const battleScreen=document.getElementById("battle-screen");
const stageNodes=Array.from(document.querySelectorAll(".stage-node"));
const stageInfoTitle=document.querySelector("#stage-info .stage-info-title");
const infoHp=document.getElementById("info-hp");
const infoDifficulty=document.getElementById("info-difficulty");
const battleStartBtn=document.getElementById("battle-start");
const battleBackBtn=document.getElementById("battle-back");
const battleStageTitle=document.getElementById("battle-stage-title");
const playerCat=document.querySelector(".player-cat");
const worldMap=document.querySelector(".world-map");
const canvas=document.getElementById("battle-canvas");
const ctx=canvas.getContext("2d");
const moneyValue=document.getElementById("money-value");
const myHpText=document.getElementById("my-hp-text");
const enemyHpText=document.getElementById("enemy-hp-text");
const messageEl=document.getElementById("game-message");
const pauseBtn=document.getElementById("battle-pause");
const pausePanel=document.getElementById("pause-panel");
const pauseResume=document.getElementById("pause-resume");
const pauseExit=document.getElementById("pause-exit");
const unitCards=Array.from(document.querySelectorAll(".unit-card"));

const myBookBtn=document.getElementById("my-book-btn");
const enemyBookBtn=document.getElementById("enemy-book-btn");
const formationBtn=document.getElementById("formation-btn");
const menuOverlay=document.getElementById("menu-overlay");
const menuClose=document.getElementById("menu-close");
const menuTitle=document.getElementById("menu-title");
const menuContent=document.getElementById("menu-content");

let selectedStage=0;
let battleState=null;
let rafId=null;
let lastTime=0;
let spawnTimer=0;
let canvasScaleX=1,canvasScaleY=1;
const imageCache={};

function loadImage(src){
  if(imageCache[src]) return imageCache[src];
  const img=new Image();
  img.src=src;
  imageCache[src]=img;
  return img;
}
Object.values(UNIT_TYPES).forEach(u=>loadImage(u.icon));
Object.values(ENEMY_TYPES).forEach(u=>loadImage(u.icon));

/* ---------- 地圖 ---------- */
function getClearedCount(){return parseInt(localStorage.getItem("catsGameCleared")||"0",10)}
function setClearedCount(n){localStorage.setItem("catsGameCleared",String(n))}
function renderMapNodes(){
  const cleared=getClearedCount();
  const unlocked=Math.min(cleared+1,STAGES.length);
  stageNodes.forEach((node,i)=>{
    const label=node.querySelector(".stage-clear");
    node.classList.toggle("locked",i>=unlocked);
    label.textContent=i<cleared?"CLEAR!":i===cleared?"NEW!":"LOCK";
  });
  selectStage(Math.min(cleared,STAGES.length-1));
}
function selectStage(index){
  const node=stageNodes[index];
  if(!node||node.classList.contains("locked"))return;
  selectedStage=index;
  stageNodes.forEach(n=>n.classList.remove("selected"));
  node.classList.add("selected");
  const cfg=STAGES[index];
  stageInfoTitle.textContent=cfg.name;
  infoHp.textContent=cfg.enemyHp.toLocaleString();
  infoDifficulty.textContent=cfg.stars;
  movePlayerCatTo(node);
}
function movePlayerCatTo(node){
  if(!playerCat||!worldMap)return;
  const mapRect=worldMap.getBoundingClientRect(),nodeRect=node.getBoundingClientRect();
  playerCat.style.left=(nodeRect.left+nodeRect.width/2-mapRect.left)+"px";
  playerCat.style.top=(nodeRect.top+nodeRect.height/2-mapRect.top+46)+"px";
  playerCat.style.bottom="auto";
  playerCat.style.transform="translate(-50%,-50%)";
}
stageNodes.forEach((node,i)=>node.addEventListener("click",()=>selectStage(i)));

battleStartBtn.addEventListener("click",()=>{
  mapScreen.classList.add("hidden");
  battleScreen.classList.remove("hidden");
  battleStageTitle.textContent=STAGES[selectedStage].name;
  startBattle(selectedStage);
});

/* ---------- 音效 ---------- */
function playBeep(freq,duration){
  try{
    const volume=parseInt(localStorage.getItem("clubGameVolume")||"60",10)/100;
    if(volume<=0)return;
    const AudioCtx=window.AudioContext||window.webkitAudioContext;
    const a=new AudioCtx(),o=a.createOscillator(),g=a.createGain();
    o.frequency.value=freq;o.type="square";g.gain.value=volume*.08;
    o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+duration);
    setTimeout(()=>a.close(),duration*1000+100);
  }catch(e){}
}

/* ---------- 工具 ---------- */
function resizeCanvas(){
  const rect=canvas.getBoundingClientRect();
  canvasScaleX=rect.width/CANVAS_W;
  canvasScaleY=rect.height/CANVAS_H;
}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function distanceX(a,b){return Math.abs(a.x-b.x)}
function randomRange(a,b){return a+Math.random()*(b-a)}
function getLaneY(side,index){
  // 不同單位有些微上下偏移，避免所有角色完全疊成一條線。
  const offsets=[0,-26,26,-48,48,-70,70];
  const off=offsets[index%offsets.length];
  return GROUND_Y+off;
}

/* ---------- 戰鬥初始化 ---------- */
function startBattle(stageIndex){
  const cfg=STAGES[stageIndex];
  battleState={
    running:true,
    paused:false,
    money:START_MONEY,
    maxMoney:MAX_MONEY,
    moneyRate:MONEY_RATE,
    myHp:1200000,
    myMaxHp:1200000,
    enemyHp:cfg.enemyHp,
    enemyMaxHp:cfg.enemyHp,
    myUnits:[],
    enemyUnits:[],
    cooldowns:{},
    particles:[],
    shake:0,
    baseCooldownMe:0,
    baseCooldownEnemy:0,
    nextId:1
  };
  spawnTimer=0;
  messageEl.textContent="";
  messageEl.className="game-message";
  pausePanel.classList.add("hidden");
  resizeCanvas();
  if(rafId)cancelAnimationFrame(rafId);
  lastTime=performance.now();
  updateHud();
  rafId=requestAnimationFrame(loop);
}

/* ---------- HUD ---------- */
function updateHud(){
  if(!battleState)return;
  moneyValue.textContent=Math.floor(battleState.money).toLocaleString();
  myHpText.textContent=`${Math.max(0,Math.floor(battleState.myHp)).toLocaleString()} / ${battleState.myMaxHp.toLocaleString()}`;
  enemyHpText.textContent=`${Math.max(0,Math.floor(battleState.enemyHp)).toLocaleString()} / ${battleState.enemyMaxHp.toLocaleString()}`;

  unitCards.forEach(card=>{
    const type=card.dataset.unit;
    const cost=Number(card.dataset.cost);
    const remaining=battleState.cooldowns[type]||0;
    const available=battleState.money>=cost&&remaining<=0;
    card.classList.toggle("affordable",available);
    card.classList.toggle("disabled",!available);
    card.classList.toggle("cooldown",remaining>0);
    const txt=card.querySelector(".cooldown-text");
    if(txt)txt.textContent=remaining>0?(remaining/1000).toFixed(1):"";
  });
}

/* ---------- 出生 / 生成 ---------- */
function makeUnit(side,type,spawnIndex=0){
  const t=side==="me"?UNIT_TYPES[type]:ENEMY_TYPES[type];
  return {
    id:battleState.nextId++,
    side,type,
    x:side==="me"?PLAYER_SPAWN_X:ENEMY_SPAWN_X,
    y:getLaneY(side,spawnIndex),
    hp:t.hp,maxHp:t.hp,
    damage:t.damage,speed:t.speed,radius:t.radius,
    attackRange:t.attackRange,
    attackCooldown:t.cooldown ?? t.attackCooldown,
    attackTimer:randomRange(0,260),
    attackAnim:0,
    hitFlash:0,
    dead:false
  };
}
function spawnUnit(side,type){
  const list=side==="me"?battleState.myUnits:battleState.enemyUnits;
  const unit=makeUnit(side,type,list.length);
  // 避免同一基地出口完全重疊。
  const last=list[list.length-1];
  if(last && Math.abs(unit.x-last.x)<unit.radius+last.radius+12){
    unit.x += side==="me"?-(unit.radius+last.radius+14):(unit.radius+last.radius+14);
  }
  list.push(unit);
  createBurst(unit.x,unit.y,side==="me"?"#fff0a0":"#c89be8",7);
}

/* ---------- 玩家派兵 ---------- */
function deploy(type){
  if(!battleState||!battleState.running||battleState.paused)return;
  const t=UNIT_TYPES[type];
  const remaining=battleState.cooldowns[type]||0;
  if(battleState.money<t.cost||remaining>0)return;
  battleState.money-=t.cost;
  battleState.cooldowns[type]=t.cooldown;
  spawnUnit("me",type);
  playBeep(520,.08);
  updateHud();
}
unitCards.forEach(card=>card.addEventListener("click",()=>deploy(card.dataset.unit)));

/* ---------- 敵人生成規則 ---------- */
function chooseEnemyType(stageIndex){
  const r=Math.random();
  if(stageIndex===0)return r<.82?"enemy1":"enemy2";
  if(stageIndex===1)return r<.62?"enemy1":"enemy2";
  return r<.42?"enemy1":"enemy2";
}

/* ---------- 真正碰撞 ---------- */
function isColliding(a,b){
  return distanceX(a,b)<=a.radius+b.radius+8;
}
function nearestTarget(unit,enemies){
  let best=null,bestDist=Infinity;
  for(const e of enemies){
    if(e.dead)continue;
    const d=distanceX(unit,e);
    // 正常狀態只鎖定前方；如果已經發生碰撞，雙方都視為可攻擊，避免穿透或卡死。
    const overlapping=d<=unit.radius+e.radius+10;
    const isAhead=unit.side==="me"?e.x<=unit.x+8:e.x>=unit.x-8;
    if((isAhead||overlapping)&&d<bestDist){best=e;bestDist=d;}
  }
  return {target:best,dist:bestDist};
}
function hasBlockingUnit(unit,friends){
  for(const f of friends){
    if(f===unit||f.dead)continue;
    const d=distanceX(unit,f);
    if(d>0 && d<unit.radius+f.radius+5){
      if(unit.side==="me" && f.x>unit.x)return true;
      if(unit.side==="enemy" && f.x<unit.x)return true;
    }
  }
  return false;
}

/* ---------- 攻擊 ---------- */
function attack(attacker,target){
  if(!target||target.dead)return;
  attacker.attackTimer=attacker.attackCooldown;
  attacker.attackAnim=.22;
  target.hitFlash=.12;
  target.hp-=attacker.damage;
  createHit(attacker,target);
  playBeep(attacker.side==="me"?610:210,.035);
  if(target.hp<=0){
    target.dead=true;
    createBurst(target.x,target.y,attacker.side==="me"?"#ffdb4a":"#d7a6ff",12);
  }
}

/* ---------- 基地攻擊 ---------- */
function baseAttack(side,target){
  if(!target||target.dead)return;
  if(side==="me"){
    battleState.baseCooldownMe=BASE_ATTACK_COOLDOWN;
    target.hp-=90;
    target.hitFlash=.12;
    createHit({x:RIGHT_BASE_X,y:GROUND_Y},target,true);
  }else{
    battleState.baseCooldownEnemy=BASE_ATTACK_COOLDOWN;
    target.hp-=55;
    target.hitFlash=.12;
    createHit({x:LEFT_BASE_X,y:GROUND_Y},target,true);
  }
}

/* ---------- 更新單位 ---------- */
function updateUnit(unit,dt,stageIndex){
  if(unit.dead)return;
  const friends=unit.side==="me"?battleState.myUnits:battleState.enemyUnits;
  const enemies=unit.side==="me"?battleState.enemyUnits:battleState.myUnits;
  unit.attackTimer=Math.max(0,unit.attackTimer-dt*1000);
  unit.attackAnim=Math.max(0,unit.attackAnim-dt);
  unit.hitFlash=Math.max(0,unit.hitFlash-dt);

  const {target,dist}=nearestTarget(unit,enemies);
  const inAttackRange=target && dist<=unit.attackRange+target.radius;
  const collision=target && isColliding(unit,target);

  if(inAttackRange||collision){
    // 碰到敵人後停下，等攻擊冷卻。
    if(unit.attackTimer<=0)attack(unit,target);
    return;
  }

  if(hasBlockingUnit(unit,friends))return;

  const speed=unit.speed*125*(unit.side==="enemy"?STAGES[stageIndex].enemySpeedMul:1);
  if(unit.side==="me"){
    // 我方貓塔在右側：從右往左推進
    unit.x=Math.max(LEFT_BASE_X+80,unit.x-speed*dt);
  }else{
    // 敵方基地在左側：從左往右推進
    unit.x=Math.min(RIGHT_BASE_X-80,unit.x+speed*dt);
  }
}

/* ---------- 主循環 ---------- */
function loop(now){
  const dt=Math.min(50,now-lastTime)/1000;
  lastTime=now;

  if(battleState&&battleState.running&&!battleState.paused){
    const cfg=STAGES[selectedStage];

    battleState.money=Math.min(MAX_MONEY,battleState.money+battleState.moneyRate*dt);

    // 更新卡槽冷卻
    Object.keys(battleState.cooldowns).forEach(k=>{
      battleState.cooldowns[k]=Math.max(0,battleState.cooldowns[k]-dt*1000);
    });

    // 敵人自動生成
    spawnTimer+=dt*1000;
    if(spawnTimer>=cfg.spawnInterval && battleState.enemyUnits.filter(u=>!u.dead).length<cfg.maxEnemies){
      spawnTimer=0;
      spawnUnit("enemy",chooseEnemyType(selectedStage));
    }

    battleState.myUnits.forEach(u=>updateUnit(u,dt,selectedStage));
    battleState.enemyUnits.forEach(u=>updateUnit(u,dt,selectedStage));

    // 基地附近的單位會受到基地攻擊
    const meFront=battleState.enemyUnits.filter(u=>!u.dead&&u.x>=RIGHT_BASE_X-210).sort((a,b)=>b.x-a.x)[0];
    const enemyFront=battleState.myUnits.filter(u=>!u.dead&&u.x<=LEFT_BASE_X+210).sort((a,b)=>a.x-b.x)[0];

    battleState.baseCooldownMe=Math.max(0,battleState.baseCooldownMe-dt*1000);
    battleState.baseCooldownEnemy=Math.max(0,battleState.baseCooldownEnemy-dt*1000);
    if(meFront&&battleState.baseCooldownMe<=0)baseAttack("me",meFront);
    if(enemyFront&&battleState.baseCooldownEnemy<=0)baseAttack("enemy",enemyFront);

    // 單位攻擊死亡後清理
    battleState.myUnits=battleState.myUnits.filter(u=>!u.dead);
    battleState.enemyUnits=battleState.enemyUnits.filter(u=>!u.dead);

    updateParticles(dt);
    battleState.shake=Math.max(0,battleState.shake-dt);

    updateHud();

    if(battleState.enemyHp<=0)endBattle(true);
    else if(battleState.myHp<=0)endBattle(false);
  }

  draw();
  rafId=requestAnimationFrame(loop);
}

/* ---------- 結束 ---------- */
function endBattle(won){
  if(!battleState||!battleState.running)return;
  battleState.running=false;
  messageEl.textContent=won?"🎉 過關了！":"基地被攻陷了，再試一次";
  messageEl.className=won?"game-message win":"game-message lose";
  playBeep(won?880:160,.25);
  if(won){
    const cleared=getClearedCount();
    if(selectedStage+1>cleared)setClearedCount(selectedStage+1);
  }
  updateHud();
}

/* ---------- 粒子 ---------- */
function createBurst(x,y,color,count){
  for(let i=0;i<count;i++){
    battleState.particles.push({
      x,y,vx:randomRange(-90,90),vy:randomRange(-130,-20),
      life:randomRange(.25,.55),maxLife:.55,color,size:randomRange(3,8)
    });
  }
}
function createHit(attacker,target,base=false){
  const x=target.x,y=target.y-20;
  for(let i=0;i<(base?8:5);i++){
    battleState.particles.push({
      x:x+randomRange(-8,8),y:y+randomRange(-8,8),
      vx:randomRange(-60,60),vy:randomRange(-80,20),
      life:randomRange(.12,.3),maxLife:.3,color:attacker.side==="enemy"?"#e6a6ff":"#ffe15a",
      size:randomRange(3,7)
    });
  }
}
function updateParticles(dt){
  battleState.particles=battleState.particles.filter(p=>{
    p.life-=dt;
    p.x+=p.vx*dt;
    p.y+=p.vy*dt;
    p.vy+=280*dt;
    return p.life>0;
  });
}

/* ---------- 繪圖 ---------- */
function drawBackground(){
  const grad=ctx.createLinearGradient(0,0,0,CANVAS_H);
  grad.addColorStop(0,"#1a1c25");
  grad.addColorStop(.58,"#24252a");
  grad.addColorStop(1,"#171717");
  ctx.fillStyle=grad;
  ctx.fillRect(0,0,CANVAS_W,CANVAS_H);

  // 遠景
  ctx.fillStyle="rgba(255,255,255,.035)";
  for(let x=0;x<CANVAS_W;x+=110){
    ctx.fillRect(x,420+(x%3)*18,55,3);
  }

  // 地面
  ctx.fillStyle="#3e3e3e";
  ctx.fillRect(0,GROUND_Y,CANVAS_W,CANVAS_H-GROUND_Y);
  ctx.fillStyle="rgba(255,255,255,.08)";
  ctx.fillRect(0,GROUND_Y,CANVAS_W,4);

  // 地面小石頭
  ctx.fillStyle="rgba(0,0,0,.28)";
  for(let x=40;x<CANVAS_W;x+=95){
    ctx.beginPath();
    ctx.ellipse(x,GROUND_Y+80+(x%4)*12,18,4,0,0,Math.PI*2);
    ctx.fill();
  }
}
function roundedRectPath(x,y,w,h,r){
  // 不依賴 CanvasRenderingContext2D.roundRect，避免部分手機瀏覽器因此中斷整個戰鬥主循環。
  r=Math.min(r,Math.abs(w)/2,Math.abs(h)/2);
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}
function drawBase(x,side){
  ctx.save();
  ctx.translate(x,GROUND_Y+4);

  ctx.fillStyle="rgba(0,0,0,.35)";
  ctx.beginPath();ctx.ellipse(0,30,115,18,0,0,Math.PI*2);ctx.fill();

  if(side==="enemy"){
    ctx.fillStyle="#725d35";ctx.strokeStyle="#30281a";ctx.lineWidth=8;
    roundedRectPath(-75,-180,150,210,18);ctx.fill();ctx.stroke();
    ctx.fillStyle="#a88a4e";ctx.beginPath();ctx.moveTo(-65,-180);ctx.lineTo(0,-225);ctx.lineTo(65,-180);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle="#1d1d1d";ctx.beginPath();ctx.arc(0,-120,42,0,Math.PI*2);ctx.fill();
    ctx.font="52px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("👾",0,-120);
  }else{
    ctx.fillStyle="#f7f7f7";ctx.strokeStyle="#252525";ctx.lineWidth=8;
    roundedRectPath(-78,-190,156,220,12);ctx.fill();ctx.stroke();
    ctx.fillStyle="#bfe7ef";
    for(let y=-155;y<25;y+=34)ctx.fillRect(-72,y,144,15);
    ctx.font="58px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("🐱",0,-215);
  }

  // 炮管
  ctx.fillStyle="#777";ctx.strokeStyle="#202020";ctx.lineWidth=10;
  roundedRectPath(side==="enemy"?-112:-10,-125,112,44,22);ctx.fill();ctx.stroke();
  ctx.restore();
}
function drawUnit(u){
  const t=u.side==="me"?UNIT_TYPES[u.type]:ENEMY_TYPES[u.type];
  const img=imageCache[t.icon];
  const size=u.radius*2.45;
  ctx.save();

  // 影子
  ctx.globalAlpha=.28;ctx.fillStyle="#000";
  ctx.beginPath();ctx.ellipse(u.x,u.y+u.radius*.72,u.radius*1.2,9,0,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=1;

  // 受擊閃白
  if(u.hitFlash>0){
    ctx.globalAlpha=.45;
    ctx.fillStyle="#fff";
    ctx.beginPath();ctx.arc(u.x,u.y,u.radius*1.05,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;
  }

  // 攻擊時向前小幅位移，讓動作更明顯
  const dir=u.side==="me"?1:-1;
  const lunge=u.attackAnim>0?Math.sin((u.attackAnim/.22)*Math.PI)*10:0;
  ctx.translate(u.x+dir*lunge,u.y);

  // 敵人朝左、我方朝右
  if(dir<0)ctx.scale(-1,1);

  if(img&&img.complete&&img.naturalWidth){
    ctx.drawImage(img,-size/2,-size/2,size,size);
  }else{
    ctx.fillStyle=u.side==="me"?"#fff":"#a58bb2";
    ctx.beginPath();ctx.arc(0,0,u.radius,0,Math.PI*2);ctx.fill();
  }

  ctx.restore();

  // 血條
  const w=u.radius*2.1,pct=clamp(u.hp/u.maxHp,0,1);
  ctx.fillStyle="rgba(0,0,0,.7)";
  ctx.fillRect(u.x-w/2,u.y-u.radius-16,w,7);
  ctx.fillStyle=u.side==="me"?"#69e06b":"#ff6258";
  ctx.fillRect(u.x-w/2,u.y-u.radius-16,w*pct,7);
}
function drawParticles(){
  for(const p of battleState.particles){
    ctx.globalAlpha=clamp(p.life/p.maxLife,0,1);
    ctx.fillStyle=p.color;
    ctx.fillRect(p.x,p.y,p.size,p.size);
  }
  ctx.globalAlpha=1;
}
function draw(){
  ctx.clearRect(0,0,CANVAS_W,CANVAS_H);
  drawBackground();

  if(!battleState){
    drawBase(LEFT_BASE_X,"enemy");
    drawBase(RIGHT_BASE_X,"me");
    return;
  }

  ctx.save();
  if(battleState.shake>0)ctx.translate(randomRange(-3,3),randomRange(-3,3));

  drawBase(LEFT_BASE_X,"enemy");
  drawBase(RIGHT_BASE_X,"me");

  battleState.myUnits.forEach(drawUnit);
  battleState.enemyUnits.forEach(drawUnit);
  drawParticles();

  // 基地攻擊範圍提示線
  ctx.strokeStyle="rgba(255,255,255,.035)";
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.moveTo(LEFT_BASE_X+BASE_ATTACK_RANGE,GROUND_Y-90);
  ctx.lineTo(LEFT_BASE_X+BASE_ATTACK_RANGE,GROUND_Y+20);
  ctx.moveTo(RIGHT_BASE_X-BASE_ATTACK_RANGE,GROUND_Y-90);
  ctx.lineTo(RIGHT_BASE_X-BASE_ATTACK_RANGE,GROUND_Y+20);
  ctx.stroke();

  ctx.restore();
}

/* ---------- 暫停 ---------- */
pauseBtn.addEventListener("click",()=>{
  if(!battleState||!battleState.running)return;
  battleState.paused=!battleState.paused;
  pausePanel.classList.toggle("hidden",!battleState.paused);
});
pauseResume.addEventListener("click",()=>{
  if(battleState){
    battleState.paused=false;
    pausePanel.classList.add("hidden");
  }
});
pauseExit.addEventListener("click",goBackToMap);
function goBackToMap(){
  if(rafId)cancelAnimationFrame(rafId);
  rafId=null;
  battleState=null;
  pausePanel.classList.add("hidden");
  battleScreen.classList.add("hidden");
  mapScreen.classList.remove("hidden");
  renderMapNodes();
}
battleBackBtn.addEventListener("click",goBackToMap);

/* ---------- 圖鑑 ---------- */
function openMenu(title,contentHtml){
  menuTitle.textContent=title;
  menuContent.innerHTML=contentHtml;
  menuOverlay.classList.remove("hidden");
}
function closeMenu(){menuOverlay.classList.add("hidden")}
function unitCardsHtml(){
  return Object.entries(UNIT_TYPES).map(([id,u])=>`
    <div class="book-card">
      <img src="${u.icon}" style="width:70px;height:70px;object-fit:contain">
      <div>${u.cost}元</div>
      <div style="font-size:12px;font-weight:400;margin-top:6px">
        HP ${u.hp}　攻擊 ${u.damage}
      </div>
    </div>`).join("");
}
myBookBtn.addEventListener("click",()=>openMenu("我方圖鑑",unitCardsHtml()));
enemyBookBtn.addEventListener("click",()=>openMenu("敵人圖鑑",`
  <div class="book-card">
    <img src="${ENEMY_TYPES.enemy1.icon}" style="width:70px;height:70px;object-fit:contain">
    <div>敵人 1</div>
    <div style="font-size:12px;font-weight:400;margin-top:6px">HP ${ENEMY_TYPES.enemy1.hp}　攻擊 ${ENEMY_TYPES.enemy1.damage}</div>
  </div>
  <div class="book-card">
    <img src="${ENEMY_TYPES.enemy2.icon}" style="width:70px;height:70px;object-fit:contain">
    <div>敵人 2</div>
    <div style="font-size:12px;font-weight:400;margin-top:6px">HP ${ENEMY_TYPES.enemy2.hp}　攻擊 ${ENEMY_TYPES.enemy2.damage}</div>
  </div>
`));
formationBtn.addEventListener("click",()=>openMenu("編隊",`
  <div class="book-card" style="grid-column:1/-1">
    目前五個角色會依卡槽出戰。下一版可以再加入「拖曳排序、選擇出戰角色」。
  </div>
`));
menuClose.addEventListener("click",closeMenu);
menuOverlay.addEventListener("click",e=>{if(e.target===menuOverlay)closeMenu()});

/* ---------- 初始化 ---------- */
renderMapNodes();
resizeCanvas();
window.addEventListener("resize",()=>{
  resizeCanvas();
  if(!mapScreen.classList.contains("hidden"))movePlayerCatTo(stageNodes[selectedStage]);
});
})();
