(function () {
"use strict";

const STORAGE_KEY = "kabamodo-save";

const TALENT = {
luck: {
maxLevel: 10,
baseRate: 10,
ratePerLevel: 5,
baseCost: 30,
costGrowth: 15
},

```
courage: {
  maxLevel: 10,
  baseRate: 50,
  ratePerLevel: 4,
  baseCost: 25,
  costGrowth: 12
}
```

};

const TAGS = [
{
name: "力量提升",
tier: "普通",
power: "+5%",
weight: 50
},
{
name: "速度提升",
tier: "普通",
power: "+5%",
weight: 50
},
{
name: "生命提升",
tier: "普通",
power: "+8%",
weight: 50
},
{
name: "幸運之星",
tier: "稀有",
power: "+10%",
weight: 25
},
{
name: "堅毅",
tier: "稀有",
power: "+12%",
weight: 25
},
{
name: "勇者之心",
tier: "稀有",
power: "+15%",
weight: 25
},
{
name: "傳說力量",
tier: "史詩",
power: "+25%",
weight: 8
},
{
name: "黃金意志",
tier: "史詩",
power: "+30%",
weight: 8
},
{
name: "命運眷顧",
tier: "傳說",
power: "+50%",
weight: 2
}
];

const state = {
can: 300,
fish: 300,
coin: 100,

```
luckLevel: 0,
courageLevel: 0,

reroll: 0,
charm: 0,
titleOwned: false,

currentTags: [],
pickedTags: [],

simStep: 0,
riskChoice: null
```

};

const $ = id => document.getElementById(id);

const screens = {
home: $("screen-home"),
draw: $("screen-draw"),
sim: $("screen-sim"),
result: $("screen-result")
};

function loadSave() {
try {
const saved = JSON.parse(
localStorage.getItem(STORAGE_KEY) || "{}"
);

```
  if (typeof saved.can === "number") state.can = saved.can;
  if (typeof saved.fish === "number") state.fish = saved.fish;
  if (typeof saved.coin === "number") state.coin = saved.coin;

  if (typeof saved.luckLevel === "number") {
    state.luckLevel = Math.max(
      0,
      Math.min(TALENT.luck.maxLevel, saved.luckLevel)
    );
  }

  if (typeof saved.courageLevel === "number") {
    state.courageLevel = Math.max(
      0,
      Math.min(TALENT.courage.maxLevel, saved.courageLevel)
    );
  }

  if (typeof saved.reroll === "number") state.reroll = saved.reroll;
  if (typeof saved.charm === "number") state.charm = saved.charm;
  if (typeof saved.titleOwned === "boolean") {
    state.titleOwned = saved.titleOwned;
  }
} catch (e) {
  console.warn("讀取存檔失敗", e);
}
```

}

function saveGame() {
localStorage.setItem(
STORAGE_KEY,
JSON.stringify({
can: state.can,
fish: state.fish,
coin: state.coin,
luckLevel: state.luckLevel,
courageLevel: state.courageLevel,
reroll: state.reroll,
charm: state.charm,
titleOwned: state.titleOwned
})
);
}

function getLuckRate() {
return Math.min(
90,
TALENT.luck.baseRate +
state.luckLevel * TALENT.luck.ratePerLevel
);
}

function getCourageRate() {
return Math.min(
95,
TALENT.courage.baseRate +
state.courageLevel * TALENT.courage.ratePerLevel
);
}

function getLuckCost() {
return (
TALENT.luck.baseCost +
state.luckLevel * TALENT.luck.costGrowth
);
}

function getCourageCost() {
return (
TALENT.courage.baseCost +
state.courageLevel * TALENT.courage.costGrowth
);
}

function updateCurrency() {
$("cur-can").textContent = state.can;
$("cur-fish").textContent = state.fish;
$("cur-coin").textContent = state.coin;
}

function updateTalents() {
$("luck-level").textContent =
"Lv." + state.luckLevel;

```
$("courage-level").textContent =
  "Lv." + state.courageLevel;

$("luck-rate").textContent =
  getLuckRate() + "%";

$("courage-rate").textContent =
  getCourageRate() + "%";

$("luck-cost").textContent =
  getLuckCost();

$("courage-cost").textContent =
  getCourageCost();

const luckButton = $("luck-upgrade-btn");
const courageButton = $("courage-upgrade-btn");

if (state.luckLevel >= TALENT.luck.maxLevel) {
  luckButton.textContent = "已達最高等級";
  luckButton.disabled = true;
} else {
  luckButton.innerHTML =
    "升級（<span id=\"luck-cost\">" +
    getLuckCost() +
    "</span> 🥫）";

  luckButton.disabled =
    state.can < getLuckCost();
}

if (state.courageLevel >= TALENT.courage.maxLevel) {
  courageButton.textContent = "已達最高等級";
  courageButton.disabled = true;
} else {
  courageButton.innerHTML =
    "升級（<span id=\"courage-cost\">" +
    getCourageCost() +
    "</span> 🐟）";

  courageButton.disabled =
    state.fish < getCourageCost();
}
```

}

function updateUI() {
updateCurrency();
updateTalents();
}

function showScreen(name) {
Object.values(screens).forEach(screen => {
screen.classList.add("hidden");
});

```
screens[name].classList.remove("hidden");
```

}

function random(min, max) {
return Math.random() * (max - min) + min;
}

function pickWeightedTag() {
const luckRate = getLuckRate();

```
const highTierChance = luckRate / 100;

let pool;

if (Math.random() < highTierChance) {
  pool = TAGS.filter(tag =>
    tag.tier === "稀有" ||
    tag.tier === "史詩" ||
    tag.tier === "傳說"
  );
} else {
  pool = TAGS.filter(tag =>
    tag.tier === "普通" ||
    tag.tier === "稀有"
  );
}

const totalWeight = pool.reduce(
  (sum, tag) => sum + tag.weight,
  0
);

let value = Math.random() * totalWeight;

for (const tag of pool) {
  value -= tag.weight;

  if (value <= 0) {
    return {
      ...tag
    };
  }
}

return {
  ...pool[pool.length - 1]
};
```

}

function drawTags() {
state.currentTags = [];
state.pickedTags = [];

```
const count = 6;

for (let i = 0; i < count; i++) {
  state.currentTags.push(pickWeightedTag());
}

renderTags();
```

}

function renderTags() {
const grid = $("tag-grid");

```
grid.innerHTML = "";

state.currentTags.forEach((tag, index) => {

  const card = document.createElement("div");

  card.className = "kb-tag-card";

  if (state.pickedTags.includes(index)) {
    card.classList.add("picked");
  }

  card.innerHTML = `
    <div class="kb-tag-tier">
      ${tag.tier}
    </div>

    <div class="kb-tag-name">
      ${tag.name}
    </div>

    <div class="kb-tag-power">
      ${tag.power}
    </div>
  `;

  card.addEventListener("click", () => {
    toggleTag(index);
  });

  grid.appendChild(card);
});

$("pick-count").textContent =
  state.pickedTags.length;

$("confirm-pick-btn").disabled =
  state.pickedTags.length !== 3;
```

}

function toggleTag(index) {

```
const position =
  state.pickedTags.indexOf(index);

if (position !== -1) {
  state.pickedTags.splice(position, 1);
  renderTags();
  return;
}

if (state.pickedTags.length >= 3) {
  return;
}

state.pickedTags.push(index);

renderTags();
```

}

function startSimulation() {

```
if (state.pickedTags.length !== 3) {
  return;
}

showScreen("sim");

state.simStep = 0;
state.riskChoice = null;

$("sim-log").innerHTML = "";

$("sim-choices").classList.add("hidden");
$("sim-choices").innerHTML = "";

$("sim-continue-btn").classList.add("hidden");

runSimulationStep();
```

}

function addLog(text, type) {

```
const line = document.createElement("div");

line.className =
  "kb-sim-log-line" +
  (type ? " " + type : "");

line.textContent = text;

$("sim-log").appendChild(line);
```

}

function runSimulationStep() {

```
if (state.simStep === 0) {

  addLog("🐹 加碼多多踏上了冒險旅程。");

  state.simStep++;

  setTimeout(runSimulationStep, 500);

  return;
}

if (state.simStep === 1) {

  const picked = state.pickedTags
    .map(index => state.currentTags[index]);

  addLog(
    "🏷️ 目前詞條：" +
    picked.map(tag => tag.name).join("、")
  );

  state.simStep++;

  setTimeout(runSimulationStep, 500);

  return;
}

if (state.simStep === 2) {

  addLog("❓ 遇到了需要勇氣做決定的事件。");

  showRiskChoices();

  return;
}

finishSimulation();
```

}

function showRiskChoices() {

```
const choices = $("sim-choices");

choices.innerHTML = "";

choices.classList.remove("hidden");

const safeButton =
  document.createElement("button");

safeButton.className = "kb-choice-btn";

safeButton.textContent =
  "🛡️ 穩妥行動：安全但獎勵較少";

safeButton.addEventListener(
  "click",
  () => chooseRisk(false)
);

const riskButton =
  document.createElement("button");

riskButton.className = "kb-choice-btn";

riskButton.textContent =
  "⚔️ 勇敢挑戰：成功獎勵大量增加";

riskButton.addEventListener(
  "click",
  () => chooseRisk(true)
);

choices.appendChild(safeButton);
choices.appendChild(riskButton);
```

}

function chooseRisk(isRisk) {

```
$("sim-choices").classList.add("hidden");

if (!isRisk) {

  addLog(
    "🛡️ 你選擇了穩妥行動。",
    "delta-pos"
  );

  state.riskChoice = "safe";

  state.simStep = 3;

  setTimeout(finishSimulation, 500);

  return;
}

const success =
  Math.random() <
  getCourageRate() / 100;

state.riskChoice =
  success ? "success" : "fail";

if (success) {

  addLog(
    "💪 膽識發揮作用！挑戰成功！",
    "delta-pos"
  );

} else {

  addLog(
    "💥 挑戰失敗了，但冒險仍然繼續。",
    "delta-neg"
  );
}

state.simStep = 3;

setTimeout(finishSimulation, 700);
```

}

function getResult() {

```
const picked =
  state.pickedTags
    .map(index => state.currentTags[index]);

let score = 0;

picked.forEach(tag => {

  if (tag.tier === "普通") score += 1;
  if (tag.tier === "稀有") score += 2;
  if (tag.tier === "史詩") score += 4;
  if (tag.tier === "傳說") score += 7;

});

if (state.riskChoice === "success") {
  score += 4;
}

if (state.riskChoice === "fail") {
  score -= 1;
}

if (score >= 15) {
  return {
    tier: "傳說級冒險",
    story: "這次的冒險非常成功！",
    can: 180,
    fish: 150,
    coin: 40
  };
}

if (score >= 9) {
  return {
    tier: "史詩級冒險",
    story: "收穫滿滿，這趟旅程相當精彩。",
    can: 120,
    fish: 100,
    coin: 25
  };
}

if (score >= 5) {
  return {
    tier: "稀有級冒險",
    story: "這次冒險有不少不錯的收穫。",
    can: 80,
    fish: 70,
    coin: 15
  };
}

return {
  tier: "普通級冒險",
  story: "平穩完成了一趟冒險。",
  can: 50,
  fish: 40,
  coin: 8
};
```

}

function finishSimulation() {

```
const result = getResult();

state.can += result.can;
state.fish += result.fish;
state.coin += result.coin;

$("result-tier").textContent =
  result.tier;

$("result-story").textContent =
  result.story;

$("reward-can").textContent =
  result.can;

$("reward-fish").textContent =
  result.fish;

$("reward-coin").textContent =
  result.coin;

$("last-result").classList.remove("hidden");

$("last-result-text").textContent =
  result.tier + "｜" + result.story;

saveGame();
updateUI();

showScreen("result");
```

}

$("luck-upgrade-btn").addEventListener(
"click",
() => {

```
  if (state.luckLevel >= TALENT.luck.maxLevel) {
    return;
  }

  const cost = getLuckCost();

  if (state.can < cost) {
    return;
  }

  state.can -= cost;
  state.luckLevel++;

  saveGame();
  updateUI();
}
```

);

$("courage-upgrade-btn").addEventListener(
"click",
() => {

```
  if (
    state.courageLevel >=
    TALENT.courage.maxLevel
  ) {
    return;
  }

  const cost = getCourageCost();

  if (state.fish < cost) {
    return;
  }

  state.fish -= cost;
  state.courageLevel++;

  saveGame();
  updateUI();
}
```

);

$("start-sim-btn").addEventListener(
"click",
() => {
drawTags();
showScreen("draw");
}
);

$("confirm-pick-btn").addEventListener(
"click",
startSimulation
);

$("reroll-btn").addEventListener(
"click",
() => {

```
  if (state.reroll <= 0) {
    return;
  }

  state.reroll--;

  drawTags();

  saveGame();
  updateUI();

  $("reroll-stock").textContent =
    state.reroll;
}
```

);

$("result-back-btn").addEventListener(
"click",
() => {
showScreen("home");
}
);

$("kb-shop-btn").addEventListener(
"click",
() => {
$("shop-overlay").classList.remove("hidden");
}
);

$("shop-close").addEventListener(
"click",
() => {
$("shop-overlay").classList.add("hidden");
}
);

$("shop-overlay").addEventListener(
"click",
event => {
if (event.target === $("shop-overlay")) {
$("shop-overlay").classList.add("hidden");
}
}
);

document.querySelectorAll(".kb-shop-buy-btn")
.forEach(button => {

```
  button.addEventListener(
    "click",
    () => {

      const item =
        button.dataset.item;

      const price =
        Number(button.dataset.price);

      if (state.coin < price) {
        return;
      }

      if (item === "title" && state.titleOwned) {
        return;
      }

      state.coin -= price;

      if (item === "reroll") {
        state.reroll++;
      }

      if (item === "charm") {
        state.charm++;
      }

      if (item === "title") {
        state.titleOwned = true;
        button.textContent = "已購買";
        button.disabled = true;
      }

      saveGame();
      updateUI();

      $("reroll-stock").textContent =
        state.reroll;
    }
  );
});
```

loadSave();
updateUI();

$("reroll-stock").textContent =
state.reroll;

})();
