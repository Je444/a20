(function () {
  /* =====================================================
     基本設定
  ===================================================== */
  const STAGES = [
    { name: '第一關', enemyHp: 100, spawnInterval: 2600, enemySpeedMul: 1.0, enemyDamage: 6, stars: '★' },
    { name: '第二關', enemyHp: 160, spawnInterval: 2100, enemySpeedMul: 1.2, enemyDamage: 8, stars: '★★' },
    { name: '第三關', enemyHp: 230, spawnInterval: 1700, enemySpeedMul: 1.45, enemyDamage: 10, stars: '★★★' },
  ];

  const UNIT_TYPES = {
    basic: { cost: 10, hp: 30, damage: 8, speed: 1.0, color: '#EDEDF2', radius: 14, icon: '🐱', name: '小貓兵' },
    tank: { cost: 30, hp: 90, damage: 14, speed: 0.6, color: '#FF8A5B', radius: 20, icon: '🐈', name: '重裝貓' },
  };

  const MOVE_SPEED = 90;

  /* =====================================================
     DOM 參照
  ===================================================== */
  const mapScreen = document.getElementById('map-screen');
  const battleScreen = document.getElementById('battle-screen');
  const stageNodes = Array.from(document.querySelectorAll('.stage-node'));
  const stageInfoTitle = document.querySelector('#stage-info .stage-info-title');
  const infoHp = document.getElementById('info-hp');
  const infoDifficulty = document.getElementById('info-difficulty');
  const battleStartBtn = document.getElementById('battle-start');
  const battleBackBtn = document.getElementById('battle-back');
  const battleStageTitle = document.getElementById('battle-stage-title');
  const playerCat = document.querySelector('.player-cat');
  const worldMap = document.querySelector('.world-map');

  const hpMeEl = document.getElementById('hp-me');
  const hpEnemyEl = document.getElementById('hp-enemy');
  const energyFillEl = document.getElementById('energy-fill');
  const messageEl = document.getElementById('game-message');
  const deployBasicBtn = document.getElementById('deploy-basic');
  const deployTankBtn = document.getElementById('deploy-tank');
  const canvas = document.getElementById('battle-canvas');
  const ctx = canvas.getContext('2d');
  const CW = canvas.width, CH = canvas.height;
  const GROUND_Y = CH - 40;

  const myBookBtn = document.getElementById('my-book-btn');
  const enemyBookBtn = document.getElementById('enemy-book-btn');
  const formationBtn = document.getElementById('formation-btn');
  const menuOverlay = document.getElementById('menu-overlay');
  const menuClose = document.getElementById('menu-close');
  const menuTitle = document.getElementById('menu-title');
  const menuContent = document.getElementById('menu-content');

  /* =====================================================
     進度存取（localStorage）
  ===================================================== */
  function getClearedCount() {
    return parseInt(localStorage.getItem('catsGameCleared') || '0', 10);
  }
  function setClearedCount(n) {
    localStorage.setItem('catsGameCleared', String(n));
  }

  let selectedStage = 0;
  let battleState = null;
  let rafId = null;
  let lastTime = 0;
  let spawnTimer = 0;

  /* =====================================================
     地圖畫面：關卡節點顯示狀態
  ===================================================== */
  function renderMapNodes() {
    const cleared = getClearedCount();
    const unlocked = Math.min(cleared + 1, STAGES.length);

    stageNodes.forEach((node, i) => {
      const clearLabel = node.querySelector('.stage-clear');
      const isLocked = i >= unlocked;
      node.classList.toggle('locked', isLocked);
      if (i < cleared) {
        clearLabel.textContent = 'CLEAR!';
      } else if (i === cleared) {
        clearLabel.textContent = 'NEW!';
      } else {
        clearLabel.textContent = 'LOCK';
      }
    });

    const defaultIndex = Math.min(cleared, STAGES.length - 1);
    selectStage(defaultIndex);
  }

  function selectStage(index) {
    const node = stageNodes[index];
    if (!node || node.classList.contains('locked')) return;
    selectedStage = index;

    stageNodes.forEach(n => n.classList.remove('selected'));
    node.classList.add('selected');

    const cfg = STAGES[index];
    stageInfoTitle.textContent = cfg.name;
    infoHp.textContent = cfg.enemyHp;
    infoDifficulty.textContent = cfg.stars;

    movePlayerCatTo(node);
  }

  function movePlayerCatTo(node) {
    if (!playerCat || !worldMap) return;
    const mapRect = worldMap.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    const x = nodeRect.left + nodeRect.width / 2 - mapRect.left;
    const y = nodeRect.top + nodeRect.height / 2 - mapRect.top + 46;
    playerCat.style.left = x + 'px';
    playerCat.style.top = y + 'px';
    playerCat.style.bottom = 'auto';
    playerCat.style.transform = 'translate(-50%, -50%)';
  }

  stageNodes.forEach((node, i) => {
    node.addEventListener('click', () => selectStage(i));
  });

  /* =====================================================
     切換地圖 / 戰鬥畫面
  ===================================================== */
  battleStartBtn.addEventListener('click', () => {
    mapScreen.classList.add('hidden');
    battleScreen.classList.remove('hidden');
    battleStageTitle.textContent = STAGES[selectedStage].name;
    startBattle(selectedStage);
  });

  battleBackBtn.addEventListener('click', () => {
    battleScreen.classList.add('hidden');
    mapScreen.classList.remove('hidden');
    if (rafId) cancelAnimationFrame(rafId);
    renderMapNodes();
  });

  /* =====================================================
     音效
  ===================================================== */
  function playBeep(freq, duration) {
    try {
      const volume = parseInt(localStorage.getItem('clubGameVolume') || '60', 10) / 100;
      if (volume <= 0) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const actx = new AudioCtx();
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      osc.frequency.value = freq;
      osc.type = 'square';
      gain.gain.value = volume * 0.15;
      osc.connect(gain);
      gain.connect(actx.destination);
      osc.start();
      osc.stop(actx.currentTime + duration);
      setTimeout(() => actx.close(), duration * 1000 + 100);
    } catch (e) { /* 忽略音效錯誤 */ }
  }

  /* =====================================================
     戰鬥邏輯
  ===================================================== */
  function startBattle(stageIndex) {
    const cfg = STAGES[stageIndex];
    battleState = {
      running: true,
      energy: 0,
      maxEnergy: 100,
      energyRate: 12,
      myHp: 100,
      myMaxHp: 100,
      enemyHp: cfg.enemyHp,
      enemyMaxHp: cfg.enemyHp,
      myUnits: [],
      enemyUnits: [],
    };
    spawnTimer = 0;
    messageEl.textContent = '';
    messageEl.className = 'game-message';
    updateBars();
    if (rafId) cancelAnimationFrame(rafId);
    lastTime = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  function updateBars() {
    hpMeEl.style.width = Math.max(0, (battleState.myHp / battleState.myMaxHp) * 100) + '%';
    hpEnemyEl.style.width = Math.max(0, (battleState.enemyHp / battleState.enemyMaxHp) * 100) + '%';
    energyFillEl.style.width = Math.min(100, (battleState.energy / battleState.maxEnergy) * 100) + '%';
  }

  function spawnUnit(side, type) {
    const t = UNIT_TYPES[type];
    const unit = {
      side, type,
      x: side === 'me' ? 40 : CW - 40,
      hp: t.hp, maxHp: t.hp,
      damage: t.damage, speed: t.speed,
      color: t.color, radius: t.radius,
    };
    if (side === 'me') battleState.myUnits.push(unit);
    else battleState.enemyUnits.push(unit);
  }

  function deploy(type) {
    if (!battleState || !battleState.running) return;
    const cost = UNIT_TYPES[type].cost;
    if (battleState.energy < cost) return;
    battleState.energy -= cost;
    spawnUnit('me', type);
    playBeep(520, 0.08);
  }

  deployBasicBtn.addEventListener('click', () => deploy('basic'));
  deployTankBtn.addEventListener('click', () => deploy('tank'));

  function findTarget(unit, enemies) {
    let nearest = null, nearestDist = Infinity;
    enemies.forEach(e => {
      const d = Math.abs(e.x - unit.x);
      if (d < nearestDist) { nearestDist = d; nearest = e; }
    });
    return { target: nearest, dist: nearestDist };
  }

  function loop(now) {
    const dt = Math.min(50, now - lastTime) / 1000;
    lastTime = now;
    const cfg = STAGES[selectedStage];

    if (battleState.running) {
      battleState.energy = Math.min(battleState.maxEnergy, battleState.energy + battleState.energyRate * dt);

      spawnTimer += dt * 1000;
      if (spawnTimer >= cfg.spawnInterval) {
        spawnTimer = 0;
        spawnUnit('enemy', Math.random() < 0.25 ? 'tank' : 'basic');
      }

      const ATTACK_RANGE = 26;
      battleState.myUnits.forEach(u => {
        const { target, dist } = findTarget(u, battleState.enemyUnits);
        if (target && dist < ATTACK_RANGE) {
          target.hp -= u.damage * dt * 2;
        } else {
          u.x += u.speed * MOVE_SPEED * dt;
          if (u.x >= CW - 30) battleState.enemyHp -= u.damage * dt * 1.5;
        }
      });

      battleState.enemyUnits.forEach(u => {
        const { target, dist } = findTarget(u, battleState.myUnits);
        if (target && dist < ATTACK_RANGE) {
          target.hp -= u.damage * dt * 2;
        } else {
          u.x -= u.speed * MOVE_SPEED * cfg.enemySpeedMul * dt;
          if (u.x <= 30) battleState.myHp -= cfg.enemyDamage * dt;
        }
      });

      battleState.myUnits = battleState.myUnits.filter(u => u.hp > 0);
      battleState.enemyUnits = battleState.enemyUnits.filter(u => u.hp > 0);

      updateBars();

      if (battleState.enemyHp <= 0) endBattle(true);
      else if (battleState.myHp <= 0) endBattle(false);
    }

    draw();
    rafId = requestAnimationFrame(loop);
  }

  function endBattle(won) {
    battleState.running = false;
    if (won) {
      messageEl.textContent = '🎉 過關了！';
      messageEl.className = 'game-message win';
      playBeep(880, 0.25);
      const cleared = getClearedCount();
      if (selectedStage + 1 > cleared) {
        setClearedCount(selectedStage + 1);
      }
    } else {
      messageEl.textContent = '💀 基地被攻陷了，再試一次';
      messageEl.className = 'game-message lose';
      playBeep(160, 0.3);
    }
  }

  function drawUnit(u) {
    ctx.beginPath();
    ctx.arc(u.x, GROUND_Y, u.radius, 0, Math.PI * 2);
    ctx.fillStyle = u.color;
    ctx.fill();
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(u.side === 'me' ? '🐱' : '👾', u.x, GROUND_Y + 5);
    const w = u.radius * 2;
    const pct = Math.max(0, u.hp / u.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(u.x - w / 2, GROUND_Y - u.radius - 10, w, 4);
    ctx.fillStyle = u.side === 'me' ? '#66dfbf' : '#ff775d';
    ctx.fillRect(u.x - w / 2, GROUND_Y - u.radius - 10, w * pct, 4);
  }

  function draw() {
    ctx.clearRect(0, 0, CW, CH);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y + 20);
    ctx.lineTo(CW, GROUND_Y + 20);
    ctx.stroke();
    ctx.font = '26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏠', 20, GROUND_Y + 8);
    ctx.fillText('🏰', CW - 20, GROUND_Y + 8);

    if (!battleState) return;
    battleState.myUnits.forEach(drawUnit);
    battleState.enemyUnits.forEach(drawUnit);
  }

  /* =====================================================
     圖鑑 / 編隊 彈窗
  ===================================================== */
  function openMenu(title, contentHtml) {
    menuTitle.textContent = title;
    menuContent.innerHTML = contentHtml;
    menuOverlay.classList.remove('hidden');
  }
  function closeMenu() {
    menuOverlay.classList.add('hidden');
  }

  function unitCardsHtml() {
    return Object.values(UNIT_TYPES).map(u => `
      <div class="book-card">
        <span class="book-card-icon">${u.icon}</span>
        <div>${u.name}</div>
        <div style="font-size:12px;font-weight:400;margin-top:6px;">
          HP ${u.hp}　攻擊 ${u.damage}
        </div>
      </div>
    `).join('');
  }

  myBookBtn.addEventListener('click', () => openMenu('我方圖鑑', unitCardsHtml()));
  enemyBookBtn.addEventListener('click', () => openMenu('敵人圖鑑', unitCardsHtml()));
  formationBtn.addEventListener('click', () => openMenu('編隊', `
    <div class="book-card" style="grid-column: 1 / -1;">
      目前所有貓咪都會自動出戰，編隊功能開發中，敬請期待！
    </div>
  `));
  menuClose.addEventListener('click', closeMenu);
  menuOverlay.addEventListener('click', (e) => {
    if (e.target === menuOverlay) closeMenu();
  });

  /* =====================================================
     初始化
  ===================================================== */
  renderMapNodes();
  window.addEventListener('resize', () => {
    if (!mapScreen.classList.contains('hidden')) {
      movePlayerCatTo(stageNodes[selectedStage]);
    }
  });
})();
