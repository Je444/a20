(function(){
"use strict";

/* =====================================================
   關卡與角色設定
   五個卡槽；角色名稱不顯示在戰鬥卡片，只顯示圖片與價格。
   ===================================================== */
const STAGES=[
 {name:"第一關",enemyHp:236000,spawnInterval:2600,enemySpeedMul:1,enemyDamage:6,stars:"★"},
 {name:"第二關",enemyHp:360000,spawnInterval:2100,enemySpeedMul:1.2,enemyDamage:8,stars:"★★"},
 {name:"第三關",enemyHp:520000,spawnInterval:1700,enemySpeedMul:1.45,enemyDamage:10,stars:"★★★"}
];

const UNIT_TYPES={
 cat1:{cost:150,hp:180,damage:40,speed:1.0,radius:25,icon:"assets/cat1.svg",cooldown:900},
 cat2:{cost:300,hp:360,damage:70,speed:.78,radius:31,icon:"assets/cat2.svg",cooldown:1400},
 cat3:{cost:540,hp:700,damage:125,speed:.62,radius:38,icon:"assets/cat3.svg",cooldown:2100},
 cat4:{cost:690,hp:950,damage:170,speed:.52,radius:43,icon:"assets/cat4.svg",cooldown:2600},
 cat5:{cost:950,hp:1350,damage:250,speed:.42,radius:48,icon:"assets/cat5.svg",cooldown:3400}
};

const MAX_MONEY=6000;
const START_MONEY=1869;
const MONEY_RATE=75;
const MOVE_SPEED=125;

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

let selectedStage=0, battleState=null, rafId=null, lastTime=0, spawnTimer=0;
let canvasScaleX=1,canvasScaleY=1;

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
 startBattle(selectedStage);
});

/* ---------- 音效 ---------- */
function playBeep(freq,duration){
 try{
  const volume=parseInt(localStorage.getItem("clubGameVolume")||"60",10)/100;
  if(volume<=0)return;
  const AudioCtx=window.AudioContext||window.webkitAudioContext;
  const a=new AudioCtx(),o=a.createOscillator(),g=a.createGain();
  o.frequency.value=freq;o.type="square";g.gain.value=volume*.1;o.connect(g);g.connect(a.destination);
  o.start();o.stop(a.currentTime+duration);setTimeout(()=>a.close(),duration*1000+100);
 }catch(e){}
}

/* ---------- 戰鬥 ---------- */
function resizeCanvas(){
 const rect=canvas.getBoundingClientRect();
 canvasScaleX=rect.width/canvas.width;
 canvasScaleY=rect.height/canvas.height;
}
function startBattle(stageIndex){
 const cfg=STAGES[stageIndex];
 battleState={
   running:true,paused:false,money:START_MONEY,maxMoney:MAX_MONEY,moneyRate:MONEY_RATE,
   myHp:1200000,myMaxHp:1200000,enemyHp:cfg.enemyHp,enemyMaxHp:cfg.enemyHp,
   myUnits:[],enemyUnits:[],cooldowns:{}
 };
 unitCards.forEach(c=>c.classList.remove("cooldown"));
 messageEl.textContent="";
 messageEl.className="game-message";
 pausePanel.classList.add("hidden");
 resizeCanvas();
 if(rafId)cancelAnimationFrame(rafId);
 lastTime=performance.now();
 rafId=requestAnimationFrame(loop);
 updateHud();
}
function updateHud(){
 if(!battleState)return;
 moneyValue.textContent=Math.floor(battleState.money).toLocaleString();
 myHpText.textContent=`${Math.max(0,Math.floor(battleState.myHp)).toLocaleString()} / ${battleState.myMaxHp.toLocaleString()}`;
 enemyHpText.textContent=`${Math.max(0,Math.floor(battleState.enemyHp)).toLocaleString()} / ${battleState.enemyMaxHp.toLocaleString()}`;
 unitCards.forEach(card=>{
   const type=card.dataset.unit,cost=Number(card.dataset.cost);
   const available=battleState.money>=cost&&!battleState.cooldowns[type];
   card.classList.toggle("affordable",available);
   card.classList.toggle("disabled",!available);
 });
}
function spawnUnit(side,type){
 const t=UNIT_TYPES[type];
 const unit={
   side,type,x:side==="me"?150:canvas.width-150,y:canvas.height*.64,
   hp:t.hp,maxHp:t.hp,damage:t.damage,speed:t.speed,radius:t.radius
 };
 (side==="me"?battleState.myUnits:battleState.enemyUnits).push(unit);
}
function deploy(type){
 if(!battleState||!battleState.running||battleState.paused)return;
 const t=UNIT_TYPES[type];
 if(battleState.money<t.cost||battleState.cooldowns[type])return;
 battleState.money-=t.cost;
 battleState.cooldowns[type]=t.cooldown;
 const card=document.querySelector(`.unit-card[data-unit="${type}"]`);
 if(card){
   card.classList.add("cooldown");
   setTimeout(()=>card.classList.remove("cooldown"),t.cooldown);
   setTimeout(()=>{if(battleState)delete battleState.cooldowns[type]},t.cooldown);
 }
 spawnUnit("me",type);
 playBeep(520,.08);
 updateHud();
}
unitCards.forEach(card=>card.addEventListener("click",()=>deploy(card.dataset.unit)));

function findTarget(unit,enemies){
 let nearest=null,dist=Infinity;
 enemies.forEach(e=>{const d=Math.abs(e.x-unit.x);if(d<dist){dist=d;nearest=e}});
 return {target:nearest,dist};
}
function loop(now){
 const dt=Math.min(50,now-lastTime)/1000;lastTime=now;
 if(battleState&&battleState.running&&!battleState.paused){
   battleState.money=Math.min(MAX_MONEY,battleState.money+battleState.moneyRate*dt);
   spawnTimer+=dt*1000;
   const cfg=STAGES[selectedStage];
   if(spawnTimer>=cfg.spawnInterval){spawnTimer=0;spawnUnit("enemy",Math.random()<.25?"cat3":"cat1")}
   const attackRange=70;

   battleState.myUnits.forEach(u=>{
     const {target,dist}=findTarget(u,battleState.enemyUnits);
     if(target&&dist<attackRange)target.hp-=u.damage*dt*1.7;
     else{u.x+=u.speed*MOVE_SPEED*dt;if(u.x>=canvas.width-120)battleState.enemyHp-=u.damage*dt*1.2}
   });
   battleState.enemyUnits.forEach(u=>{
     const {target,dist}=findTarget(u,battleState.myUnits);
     if(target&&dist<attackRange)target.hp-=u.damage*dt*1.3;
     else{u.x-=u.speed*MOVE_SPEED*cfg.enemySpeedMul*dt;if(u.x<=120)battleState.myHp-=cfg.enemyDamage*dt*40}
   });
   battleState.myUnits=battleState.myUnits.filter(u=>u.hp>0);
   battleState.enemyUnits=battleState.enemyUnits.filter(u=>u.hp>0);
   updateHud();
   if(battleState.enemyHp<=0)endBattle(true);
   else if(battleState.myHp<=0)endBattle(false);
 }
 draw();
 rafId=requestAnimationFrame(loop);
}

function endBattle(won){
 if(!battleState)return;
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

function drawUnit(u){
 const x=u.x,y=u.y,r=u.radius;
 ctx.save();
 ctx.globalAlpha=.18;ctx.fillStyle="#000";ctx.beginPath();ctx.ellipse(x,y+r*.8,r*1.15,r*.35,0,0,Math.PI*2);ctx.fill();
 ctx.globalAlpha=1;
 ctx.fillStyle=u.side==="me"?"#fff2b5":"#8c77a9";
 ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
 ctx.lineWidth=4;ctx.strokeStyle="#242424";ctx.stroke();
 ctx.font=`${Math.max(28,r*1.45)}px sans-serif`;ctx.textAlign="center";ctx.textBaseline="middle";
 ctx.fillText(u.side==="me"?"🐱":"👾",x,y+2);
 const w=r*2,pct=Math.max(0,u.hp/u.maxHp);
 ctx.fillStyle="rgba(0,0,0,.65)";ctx.fillRect(x-w/2,y-r-13,w,6);
 ctx.fillStyle=u.side==="me"?"#72e06f":"#ff5e55";ctx.fillRect(x-w/2,y-r-13,w*pct,6);
 ctx.restore();
}
function draw(){
 ctx.clearRect(0,0,canvas.width,canvas.height);
 ctx.strokeStyle="rgba(255,255,255,.10)";ctx.lineWidth=3;
 ctx.beginPath();ctx.moveTo(0,canvas.height*.70);ctx.lineTo(canvas.width,canvas.height*.70);ctx.stroke();
 if(!battleState)return;
 battleState.myUnits.forEach(drawUnit);battleState.enemyUnits.forEach(drawUnit);
}

/* ---------- 暫停 ---------- */
pauseBtn.addEventListener("click",()=>{
 if(!battleState||!battleState.running)return;
 battleState.paused=!battleState.paused;
 pausePanel.classList.toggle("hidden",!battleState.paused);
});
pauseResume.addEventListener("click",()=>{if(battleState){battleState.paused=false;pausePanel.classList.add("hidden")}});
pauseExit.addEventListener("click",()=>goBackToMap());

function goBackToMap(){
 if(rafId)cancelAnimationFrame(rafId);
 battleState=null;
 pausePanel.classList.add("hidden");
 battleScreen.classList.add("hidden");
 mapScreen.classList.remove("hidden");
 renderMapNodes();
}
battleBackBtn.addEventListener("click",goBackToMap);

/* ---------- 圖鑑 ---------- */
function openMenu(title,contentHtml){menuTitle.textContent=title;menuContent.innerHTML=contentHtml;menuOverlay.classList.remove("hidden")}
function closeMenu(){menuOverlay.classList.add("hidden")}
function unitCardsHtml(){
 return Object.entries(UNIT_TYPES).map(([id,u])=>`
 <div class="book-card">
   <img src="${u.icon}" style="width:70px;height:70px;object-fit:contain">
   <div>${u.cost}元</div>
   <div style="font-size:12px;font-weight:400;margin-top:6px">HP ${u.hp}　攻擊 ${u.damage}</div>
 </div>`).join("");
}
myBookBtn.addEventListener("click",()=>openMenu("我方圖鑑",unitCardsHtml()));
enemyBookBtn.addEventListener("click",()=>openMenu("敵人圖鑑",unitCardsHtml()));
formationBtn.addEventListener("click",()=>openMenu("編隊",`<div class="book-card" style="grid-column:1/-1">目前五個角色會依卡槽出戰，編隊介面之後可以再細化。</div>`));
menuClose.addEventListener("click",closeMenu);
menuOverlay.addEventListener("click",e=>{if(e.target===menuOverlay)closeMenu()});

/* 初始化 */
renderMapNodes();
window.addEventListener("resize",()=>{
 resizeCanvas();
 if(!mapScreen.classList.contains("hidden"))movePlayerCatTo(stageNodes[selectedStage]);
});
})();