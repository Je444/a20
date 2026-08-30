(function () {
  /* =====================================================
     詞條池設定
  ===================================================== */
  const TIERS = [
    { key: 'white',   name: '白',  color: '#EDEDF2', power: 1,  weight: 35   },
    { key: 'black',   name: '黑',  color: '#8b8b95', power: 2,  weight: 20   },
    { key: 'green',   name: '綠',  color: '#6fe0a0', power: 3,  weight: 15   },
    { key: 'blue',    name: '藍',  color: '#6fb3e7', power: 4,  weight: 10   },
    { key: 'purple',  name: '紫',  color: '#b78bff', power: 5,  weight: 7    },
    { key: 'cyan',    name: '青',  color: '#5be6e6', power: 6,  weight: 5    },
    { key: 'gold',    name: '金',  color: '#ffcf4d', power: 7,  weight: 3.2  },
    { key: 'red',     name: '紅',  color: '#ff6b5e', power: 8,  weight: 1.8  },
    { key: 'rainbow', name: '彩',  color: '#e07bff', power: 10, weight: 0.9  },
    { key: 'ex',      name: 'EX',  color: '#fff6c8', power: 15, weight: 0.1  },
  ];
  const GREEN_INDEX = TIERS.findIndex(t => t.key === 'green');
  const MAX_LEVEL = 23;
  const TIER_MAX_WEIGHTS = [0.1, 0.1, 0.1, 18.0, 17.5, 14.0, 9.2, 25.0, 15.0, 1.0]; // Lv.20 滿級時的目標機率（總和=100）
  const TIER_BASE_WEIGHTS = TIERS.map(t => t.weight); // Lv.0 起始權重

  const DESCRIPTORS = [
    '敏銳嗅覺', '堅韌步伐', '幸運符咒', '神秘直覺', '過人膽識',
    '貪吃本能', '夜視能力', '順風耳', '鋼鐵胃', '冒險家的心',
    '順手牽羊', '過目不忘',
  ];
  const EX_NAMES = ['多多之心', '隱藏城鎮地圖', '傳說鑰匙', '時間沙漏'];

  /* =====================================================
     事件池
  ===================================================== */
  const AUTO_EVENTS = [
    '{name}走進一片陌生的森林，四處張望…',
    '路上撿到一顆閃亮的石頭，感覺是好兆頭！',
    '遇到一隻友善的小動物，分享了一點食物。',
    '天氣突然變差，{name}加快了腳步。',
    '發現了一條沒走過的小路，猶豫了一下還是走了進去。',
    '肚子餓了，靠著隨身的乾糧撐了過去。',
  ];

  const MAJOR_EVENTS = [
    {
      text: '前方出現一個深不見底的洞穴，隱約傳出奇怪的聲音…',
      choices: [
        { label: '謹慎地繞路而行', risk: 'safe' },
        { label: '跟著聲音走進去看看', risk: 'risky' },
      ],
    },
    {
      text: '遇到另一隻探險中的旅伴，牠邀請{name}一起合作。',
      choices: [
        { label: '答應合作，穩紮穩打', risk: 'safe' },
        { label: '婉拒邀請，自己單獨闖蕩', risk: 'risky' },
      ],
    },
    {
      text: '看到一棵結滿奇異果實的樹，不確定能不能吃。',
      choices: [
        { label: '只採摘看起來安全的果實', risk: 'safe' },
        { label: '大膽嘗一口最鮮豔的那顆', risk: 'risky' },
      ],
    },
    {
      text: '眼前有兩條岔路，一條寬敞平坦，一條狹窄崎嶇。',
      choices: [
        { label: '走寬敞平坦的路', risk: 'safe' },
        { label: '挑戰狹窄崎嶇的捷徑', risk: 'risky' },
      ],
    },
  ];

  /* =====================================================
     狀態存取
  ===================================================== */
  const KEY = {
    can: 'kbCan', fish: 'kbFish', coin: 'kbCoin',
    luck: 'kbLuckLv', courage: 'kbCourageLv',
    reroll: 'kbRerollStock', charm: 'kbCharmStock', title: 'kbHasTitle',
  };
  function getNum(k, d = 0) { return parseInt(localStorage.getItem(k) || String(d), 10); }
  function setNum(k, v) { localStorage.setItem(k, String(v)); }
  function getBool(k) { return localStorage.getItem(k) === '1'; }
  function setBool(k, v) { localStorage.setItem(k, v ? '1' : '0'); }

  let state = {
    can: getNum(KEY.can), fish: getNum(KEY.fish), coin: getNum(KEY.coin),
    luckLv: getNum(KEY.luck), courageLv: getNum(KEY.courage),
    rerollStock: getNum(KEY.reroll), charmStock: getNum(KEY.charm),
    hasTitle: getBool(KEY.title),
  };
  function persist() {
    setNum(KEY.can, state.can); setNum(KEY.fish, state.fish); setNum(KEY.coin, state.coin);
    setNum(KEY.luck, state.luckLv); setNum(KEY.courage, state.courageLv);
    setNum(KEY.reroll, state.rerollStock); setNum(KEY.charm, state.charmStock);
    setBool(KEY.title, state.hasTitle);
  }

  /* =====================================================
     DOM
  ===================================================== */
  const el = (id) => document.getElementById(id);
  const curCan = el('cur-can'), curFish = el('cur-fish'), curCoin = el('cur-coin');
  const luckLevelEl = el('luck-level'), courageLevelEl = el('courage-level');
  const luckCostEl = el('luck-cost'), courageCostEl = el('courage-cost');
  const luckBtn = el('luck-upgrade-btn'), courageBtn = el('courage-upgrade-btn');
  const startBtn = el('start-sim-btn');
  const lastResultBox = el('last-result'), lastResultText = el('last-result-text');

  const screens = {
    home: el('screen-home'), draw: el('screen-draw'), sim: el('screen-sim'), result: el('screen-result'),
  };
  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.add('hidden'));
    screens[name].classList.remove('hidden');
  }

  const tagGrid = el('tag-grid');
  const pickCountEl = el('pick-count');
  const confirmPickBtn = el('confirm-pick-btn');
  const rerollBtn = el('reroll-btn'), rerollStockEl = el('reroll-stock');

  const simLog = el('sim-log');
  const simChoices = el('sim-choices');
  const simContinueBtn = el('sim-continue-btn');

  const resultTierEl = el('result-tier'), resultStoryEl = el('result-story');
  const rewardCanEl = el('reward-can'), rewardFishEl = el('reward-fish'), rewardCoinEl = el('reward-coin');
  const resultBackBtn = el('result-back-btn');

  const shopBtn = el('kb-shop-btn'), shopOverlay = el('shop-overlay'), shopClose = el('shop-close');

  /* =====================================================
     天賦成本 & 效果
  ===================================================== */
  function luckCost(lv) {
    if (lv === 21) return 999999; // 21→22：故意卡關
    if (lv === 22) return 50;     // 22→23：突然變便宜
    return 30 * (lv + 1);
  }
  function courageCost(lv) {
    if (lv === 21) return 999999; // 21→22：故意卡關
    if (lv === 22) return 50;     // 22→23：突然變便宜
    return 25 * (lv + 1);
  }

  const luckProbListEl = el('luck-prob-list'), courageProbEl = el('courage-prob');

  function renderLuckProbList(luckLv) {
    const probs = calcTierProbs(luckLv);
    luckProbListEl.innerHTML = probs.map(p => `
      <span class="kb-prob-chip" style="color:${p.color};border-color:${p.color}66">
        ${p.name} ${p.pct.toFixed(1)}%
      </span>
    `).join('');
  }

  function updateHomeUI() {
    curCan.textContent = state.can;
    curFish.textContent = state.fish;
    curCoin.textContent = state.coin;
    luckLevelEl.textContent = 'Lv.' + state.luckLv;
    courageLevelEl.textContent = 'Lv.' + state.courageLv;
    if (state.luckLv >= MAX_LEVEL) {
      luckBtn.textContent = 'MAX';
      luckBtn.disabled = true;
    } else {
      luckBtn.innerHTML = `升級（<span id="luck-cost">${luckCost(state.luckLv)}</span> 🥫）`;
      luckBtn.disabled = state.can < luckCost(state.luckLv);
    }
    if (state.courageLv >= MAX_LEVEL) {
      courageBtn.textContent = 'MAX';
      courageBtn.disabled = true;
    } else {
      courageBtn.innerHTML = `升級（<span id="courage-cost">${courageCost(state.courageLv)}</span> 🐟）`;
      courageBtn.disabled = state.fish < courageCost(state.courageLv);
    }
    rerollStockEl.textContent = state.rerollStock;
    renderLuckProbList(state.luckLv);
    courageProbEl.textContent = calcRiskySuccessProb(state.courageLv).toFixed(1) + '%';
  }

  luckBtn.addEventListener('click', () => {
    const cost = luckCost(state.luckLv);
    if (state.luckLv >= MAX_LEVEL || state.can < cost) return;
    state.can -= cost; state.luckLv += 1;
    persist(); updateHomeUI();
  });
  courageBtn.addEventListener('click', () => {
    const cost = courageCost(state.courageLv);
    if (state.courageLv >= MAX_LEVEL || state.fish < cost) return;
    state.fish -= cost; state.courageLv += 1;
    persist(); updateHomeUI();
  });

  /* =====================================================
     抽詞條邏輯
  ===================================================== */
  function computeTierWeights(luckLv, forceMinIndex = 0) {
    const t = Math.min(luckLv, MAX_LEVEL) / MAX_LEVEL;
    return TIERS.map((tier, i) => {
      let w = TIER_BASE_WEIGHTS[i] + (TIER_MAX_WEIGHTS[i] - TIER_BASE_WEIGHTS[i]) * t;
      if (i < forceMinIndex) w = 0;
      return w;
    });
  }

  function calcTierProbs(luckLv) {
    const weights = computeTierWeights(luckLv);
    const total = weights.reduce((a, b) => a + b, 0);
    return TIERS.map((t, i) => ({
      name: t.name,
      color: t.color,
      pct: total > 0 ? (weights[i] / total) * 100 : 0,
    }));
  }

  function calcRiskySuccessProb(courageLv) {
    // 對應 resolveChoice 裡的判定：roll = random(0,100) + courageLv*2.25 >= 45
    const prob = (55 + courageLv * 2.25);
    return Math.min(100, Math.max(0, prob));
  }

  function pickWeightedTier(forceMinIndex = 0) {
    const weights = computeTierWeights(state.luckLv, forceMinIndex);
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < TIERS.length; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return TIERS.length - 1;
  }

  function makeTag(forceMinIndex) {
    const tierIndex = pickWeightedTier(forceMinIndex);
    const tier = TIERS[tierIndex];
    const name = tier.key === 'ex'
      ? EX_NAMES[Math.floor(Math.random() * EX_NAMES.length)]
      : DESCRIPTORS[Math.floor(Math.random() * DESCRIPTORS.length)];
    return { tierIndex, tier, name };
  }

  let currentTags = [];
  let pickedIndexes = [];
  let usedCharmThisDraw = false;

  function renderTagGrid() {
    tagGrid.innerHTML = '';
    currentTags.forEach((tag, i) => {
      const card = document.createElement('button');
      card.className = 'kb-tag-card' + (pickedIndexes.includes(i) ? ' picked' : '');
      card.style.background = `linear-gradient(160deg, ${tag.tier.color}22, transparent)`;
      card.style.borderColor = pickedIndexes.includes(i) ? '#ff3b3b' : tag.tier.color;
      card.innerHTML = `
        <div class="kb-tag-tier" style="color:${tag.tier.color}">${tag.tier.name}</div>
        <div class="kb-tag-name">${tag.name}</div>
        <div class="kb-tag-power">強度 ${tag.tier.power}</div>
      `;
      card.addEventListener('click', () => toggleTagPick(i));
      tagGrid.appendChild(card);
    });
    pickCountEl.textContent = pickedIndexes.length;
    confirmPickBtn.disabled = pickedIndexes.length !== 3;
  }

  function toggleTagPick(i) {
    const idx = pickedIndexes.indexOf(i);
    if (idx >= 0) {
      pickedIndexes.splice(idx, 1);
    } else {
      if (pickedIndexes.length >= 3) return;
      pickedIndexes.push(i);
    }
    renderTagGrid();
  }

  function startDraw() {
    const forceMin = usedCharmThisDraw ? GREEN_INDEX : 0;
    currentTags = Array.from({ length: 7 }, () => makeTag(forceMin));
    pickedIndexes = [];
    renderTagGrid();
    rerollStockEl.textContent = state.rerollStock;
    rerollBtn.disabled = state.rerollStock <= 0;
    showScreen('draw');
  }

  rerollBtn.addEventListener('click', () => {
    if (state.rerollStock <= 0) return;
    state.rerollStock -= 1;
    persist();
    startDraw();
  });

  startBtn.addEventListener('click', () => {
    usedCharmThisDraw = state.charmStock > 0;
    if (usedCharmThisDraw) { state.charmStock -= 1; persist(); }
    startDraw();
  });

  /* =====================================================
     模擬過程
  ===================================================== */
  let simScore = 0;
  let simSteps = [];
  let simStepIndex = 0;
  let simTagsUsed = [];

  confirmPickBtn.addEventListener('click', () => {
    simTagsUsed = pickedIndexes.map(i => currentTags[i]);
    const basePower = simTagsUsed.reduce((sum, t) => sum + t.tier.power, 0);
    simScore = 0;
    simStepIndex = 0;
    simLog.innerHTML = '';
    simChoices.classList.add('hidden');
    simContinueBtn.classList.remove('hidden');

    const mascotName = '加碼多多';
    const shuffledAuto = [...AUTO_EVENTS].sort(() => Math.random() - 0.5).slice(0, 3);
    const majorEvent = MAJOR_EVENTS[Math.floor(Math.random() * MAJOR_EVENTS.length)];

    simSteps = [
      { type: 'auto', text: shuffledAuto[0].replace('{name}', mascotName), power: basePower },
      { type: 'major', event: majorEvent, mascotName },
      { type: 'auto', text: shuffledAuto[1].replace('{name}', mascotName), power: basePower },
      { type: 'auto', text: shuffledAuto[2].replace('{name}', mascotName), power: basePower },
    ];

    showScreen('sim');
    runNextStep();
  });

  function logLine(text, delta) {
    const line = document.createElement('div');
    let cls = 'kb-sim-log-line';
    let suffix = '';
    if (typeof delta === 'number') {
      cls += delta >= 0 ? ' delta-pos' : ' delta-neg';
      suffix = ` (${delta >= 0 ? '+' : ''}${delta})`;
    }
    line.className = cls;
    line.textContent = text + suffix;
    simLog.appendChild(line);
    simLog.scrollTop = simLog.scrollHeight;
  }

  function runNextStep() {
    if (simStepIndex >= simSteps.length) {
      simContinueBtn.classList.add('hidden');
      finishSimulation();
      return;
    }
    const step = simSteps[simStepIndex];
    if (step.type === 'auto') {
      const delta = Math.round(step.power * (0.4 + Math.random() * 0.5));
      simScore += delta;
      logLine(step.text, delta);
      simStepIndex += 1;
      simContinueBtn.classList.remove('hidden');
    } else if (step.type === 'major') {
      logLine('【重大事件】' + step.event.text);
      simContinueBtn.classList.add('hidden');
      simChoices.classList.remove('hidden');
      simChoices.innerHTML = '';
      step.event.choices.forEach(choice => {
        const btn = document.createElement('button');
        btn.className = 'kb-choice-btn';
        btn.textContent = choice.label;
        btn.addEventListener('click', () => resolveChoice(choice));
        simChoices.appendChild(btn);
      });
    }
  }

  function resolveChoice(choice) {
    simChoices.classList.add('hidden');
    const basePower = simTagsUsed.reduce((sum, t) => sum + t.tier.power, 0);
    let delta;
    if (choice.risk === 'safe') {
      delta = Math.round(basePower * 0.5);
      logLine('選擇了「' + choice.label + '」，穩穩地過關了。', delta);
    } else {
      const roll = Math.random() * 100 + state.courageLv * 2.25;
      if (roll >= 45) {
        delta = Math.round(basePower * 1.6);
        logLine('選擇了「' + choice.label + '」，運氣不錯，大有收穫！', delta);
      } else {
        delta = -Math.round(basePower * 0.6);
        logLine('選擇了「' + choice.label + '」，結果出了點意外…', delta);
      }
    }
    simScore += delta;
    simStepIndex += 1;
    simContinueBtn.classList.remove('hidden');
  }

  simContinueBtn.addEventListener('click', runNextStep);

  /* =====================================================
     結算
  ===================================================== */
  function finishSimulation() {
    const basePower = simTagsUsed.reduce((sum, t) => sum + t.tier.power, 0);
    const baseline = basePower * 3;
    const ratio = simScore / Math.max(1, baseline);

    let tierLabel, tierColor, story;
    if (ratio >= 1.5) { tierLabel = '🌟 大成功'; tierColor = 'var(--mint)'; story = '加碼多多滿載而歸，這次的冒險超乎想像！'; }
    else if (ratio >= 1.1) { tierLabel = '✅ 成功'; tierColor = 'var(--mint)'; story = '順利完成了這趟探險，收穫不錯。'; }
    else if (ratio >= 0.8) { tierLabel = '🙂 普通'; tierColor = 'var(--text)'; story = '平平淡淡地回來了，算是穩紮穩打。'; }
    else if (ratio >= 0.5) { tierLabel = '😥 小失敗'; tierColor = 'var(--coral)'; story = '這次運氣不太好，但至少平安回來了。'; }
    else { tierLabel = '💀 慘敗'; tierColor = 'var(--coral)'; story = '這趟冒險狀況百出，加碼多多灰頭土臉地回來了。'; }

    const rewardCan = Math.max(3, Math.round(10 + simScore * 0.8));
    const rewardFish = Math.max(2, Math.round(6 + simScore * 0.5));
    const rarestPower = Math.max(...simTagsUsed.map(t => t.tier.power));
    const rewardCoin = Math.max(1, Math.round(2 + rarestPower * 1.2 + (ratio >= 1.5 ? 5 : 0)));

    state.can += rewardCan;
    state.fish += rewardFish;
    state.coin += rewardCoin;
    persist();

    resultTierEl.textContent = tierLabel;
    resultTierEl.style.color = tierColor;
    resultStoryEl.textContent = story;
    rewardCanEl.textContent = rewardCan;
    rewardFishEl.textContent = rewardFish;
    rewardCoinEl.textContent = rewardCoin;

    lastResultBox.classList.remove('hidden');
    lastResultText.textContent = `${tierLabel}　🥫+${rewardCan}　🐟+${rewardFish}　🪙+${rewardCoin}`;

    showScreen('result');
  }

  resultBackBtn.addEventListener('click', () => {
    updateHomeUI();
    showScreen('home');
  });

  /* =====================================================
     商店
  ===================================================== */
  shopBtn.addEventListener('click', () => {
    document.querySelectorAll('.kb-shop-buy-btn').forEach(btn => {
      const price = Number(btn.dataset.price);
      if (btn.dataset.item === 'title' && state.hasTitle) {
        btn.textContent = '已擁有';
        btn.disabled = true;
      } else {
        btn.disabled = state.coin < price;
      }
    });
    shopOverlay.classList.remove('hidden');
  });
  shopClose.addEventListener('click', () => shopOverlay.classList.add('hidden'));
  shopOverlay.addEventListener('click', (e) => { if (e.target === shopOverlay) shopOverlay.classList.add('hidden'); });

  document.querySelectorAll('.kb-shop-buy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const price = Number(btn.dataset.price);
      const item = btn.dataset.item;
      if (state.coin < price) return;
      state.coin -= price;
      if (item === 'reroll') state.rerollStock += 1;
      else if (item === 'charm') state.charmStock += 1;
      else if (item === 'title') { state.hasTitle = true; btn.textContent = '已擁有'; btn.disabled = true; }
      persist();
      updateHomeUI();
      curCoin.textContent = state.coin;
      document.querySelectorAll('.kb-shop-buy-btn').forEach(b => {
        const p = Number(b.dataset.price);
        if (b.dataset.item === 'title' && state.hasTitle) { b.disabled = true; }
        else b.disabled = state.coin < p;
      });
    });
  });

  /* =====================================================
     初始化
  ===================================================== */
  updateHomeUI();
  showScreen('home');
})();
