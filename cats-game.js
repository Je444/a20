(function () {

  /* =========================================================
     Canvas
  ========================================================= */

  const canvas =
    document.getElementById('battle-canvas');

  const ctx =
    canvas.getContext('2d');

  const CW =
    canvas.width;

  const CH =
    canvas.height;

  const GROUND_Y =
    CH - 40;


  /* =========================================================
     DOM
  ========================================================= */

  const hpMeEl =
    document.getElementById('hp-me');

  const hpEnemyEl =
    document.getElementById('hp-enemy');

  const energyFillEl =
    document.getElementById('energy-fill');

  const messageEl =
    document.getElementById('game-message');


  /* 地圖 */

  const mapScreen =
    document.getElementById('map-screen');

  const myBookScreen =
    document.getElementById('my-book-screen');

  const enemyBookScreen =
    document.getElementById('enemy-book-screen');

  const teamScreen =
    document.getElementById('team-screen');

  const battleScreen =
    document.getElementById('battle-screen');


  /* 彈窗 */

  const stageModal =
    document.getElementById('stage-modal');

  const stageModalTitle =
    document.getElementById('stage-modal-title');

  const stageModalDescription =
    document.getElementById('stage-modal-description');

  const stageStartBtn =
    document.getElementById('stage-start-btn');

  const stageCancelBtn =
    document.getElementById('stage-cancel-btn');


  /* =========================================================
     關卡資料
  ========================================================= */

  const STAGES = [

    {
      name: '1',
      description: '第一個戰場。先熟悉基本戰鬥方式。',
      enemyHp: 100,
      spawnInterval: 2600,
      enemySpeedMul: 1.0,
      enemyDamage: 6
    },

    {
      name: '2',
      description: '敵軍數量增加，開始真正考驗你的編隊。',
      enemyHp: 160,
      spawnInterval: 2100,
      enemySpeedMul: 1.2,
      enemyDamage: 8
    },

    {
      name: '3',
      description: '敵方守軍更強，準備迎接更激烈的戰鬥。',
      enemyHp: 230,
      spawnInterval: 1700,
      enemySpeedMul: 1.45,
      enemyDamage: 10
    }

  ];


  /* =========================================================
     單位
  ========================================================= */

  const MOVE_SPEED = 90;

  const UNIT_TYPES = {

    basic: {
      cost: 10,
      hp: 30,
      damage: 8,
      speed: 1.0,
      color: '#EDEDF2',
      radius: 14
    },

    tank: {
      cost: 30,
      hp: 90,
      damage: 14,
      speed: 0.6,
      color: '#FF8A5B',
      radius: 20
    }

  };


  /* =========================================================
     遊戲狀態
  ========================================================= */

  let unlocked =
    parseInt(
      localStorage.getItem('catsGameUnlocked') || '1',
      10
    );

  if (unlocked < 1) {
    unlocked = 1;
  }

  if (unlocked > STAGES.length) {
    unlocked = STAGES.length;
  }


  let currentStage = 0;

  let state = null;

  let rafId = null;

  let lastTime = 0;

  let spawnTimer = 0;


  /* =========================================================
     UI：切換頁面
  ========================================================= */

  function showScreen(screen) {

    const screens = [

      mapScreen,
      myBookScreen,
      enemyBookScreen,
      teamScreen,
      battleScreen

    ];

    screens.forEach(el => {

      if (el) {
        el.classList.remove('active');
      }

    });


    if (screen) {
      screen.classList.add('active');
    }

  }


  /* =========================================================
     地圖關卡
  ========================================================= */

  function renderMapStages() {

    STAGES.forEach((stage, index) => {

      const btn =
        document.getElementById(
          `stage-${index + 1}`
        );

      if (!btn) {
        return;
      }


      /*
        index 0 = 第一關
        index 1 = 第二關
        index 2 = 第三關
      */

      const available =
        index + 1 <= unlocked;


      btn.classList.toggle(
        'unlocked',
        available
      );


      btn.classList.toggle(
        'locked',
        !available
      );


      btn.disabled =
        !available;

    });

  }


  /* =========================================================
     點擊地圖關卡
  ========================================================= */

  function openStage(index) {

    if (index < 0 || index >= STAGES.length) {
      return;
    }


    if (index + 1 > unlocked) {
      return;
    }


    currentStage = index;

    const cfg =
      STAGES[currentStage];


    stageModalTitle.textContent =
      `關卡 ${cfg.name}`;


    stageModalDescription.textContent =
      cfg.description;


    stageModal.classList.add('show');

  }


  /* =========================================================
     關閉彈窗
  ========================================================= */

  function closeStageModal() {

    stageModal.classList.remove('show');

  }


  /* =========================================================
     開始指定關卡
  ========================================================= */

  function startSelectedStage() {

    closeStageModal();

    startStage();

  }


  /* =========================================================
     開始戰鬥
  ========================================================= */

  function startStage() {

    showScreen(battleScreen);


    const cfg =
      STAGES[currentStage];


    state = {

      running: true,

      energy: 0,

      maxEnergy: 100,

      energyRate: 12,

      myHp: 100,

      myMaxHp: 100,

      enemyHp: cfg.enemyHp,

      enemyMaxHp: cfg.enemyHp,

      myUnits: [],

      enemyUnits: []

    };


    spawnTimer = 0;


    messageEl.textContent =
      '';


    messageEl.className =
      'game-message';


    updateBars();


    if (rafId) {
      cancelAnimationFrame(rafId);
    }


    lastTime =
      performance.now();


    rafId =
      requestAnimationFrame(loop);

  }


  /* =========================================================
     返回地圖
  ========================================================= */

  function returnToMap() {

    if (state) {
      state.running = false;
    }


    showScreen(mapScreen);

    renderMapStages();

  }


  /* =========================================================
     血條
  ========================================================= */

  function updateBars() {

    if (!state) {
      return;
    }


    hpMeEl.style.width =
      Math.max(
        0,
        (
          state.myHp /
          state.myMaxHp
        ) * 100
      ) + '%';


    hpEnemyEl.style.width =
      Math.max(
        0,
        (
          state.enemyHp /
          state.enemyMaxHp
        ) * 100
      ) + '%';


    energyFillEl.style.width =
      Math.min(
        100,
        (
          state.energy /
          state.maxEnergy
        ) * 100
      ) + '%';

  }


  /* =========================================================
     音效
  ========================================================= */

  function playBeep(freq, duration) {

    try {

      const volume =
        parseInt(
          localStorage.getItem(
            'clubGameVolume'
          ) || '60',
          10
        ) / 100;


      if (volume <= 0) {
        return;
      }


      const AudioCtx =
        window.AudioContext ||
        window.webkitAudioContext;


      const actx =
        new AudioCtx();


      const osc =
        actx.createOscillator();


      const gain =
        actx.createGain();


      osc.frequency.value =
        freq;


      osc.type =
        'square';


      gain.gain.value =
        volume * 0.15;


      osc.connect(gain);

      gain.connect(
        actx.destination
      );


      osc.start();

      osc.stop(
        actx.currentTime +
        duration
      );


      setTimeout(
        () => actx.close(),
        duration * 1000 + 100
      );

    } catch (e) {

      /* 音效錯誤不影響遊戲 */

    }

  }


  /* =========================================================
     生成單位
  ========================================================= */

  function spawnUnit(side, type) {

    const t =
      UNIT_TYPES[type];


    const unit = {

      side,

      type,

      x:
        side === 'me'
          ? 40
          : CW - 40,

      hp: t.hp,

      maxHp: t.hp,

      damage: t.damage,

      speed: t.speed,

      color: t.color,

      radius: t.radius

    };


    if (side === 'me') {

      state.myUnits.push(unit);

    } else {

      state.enemyUnits.push(unit);

    }

  }


  /* =========================================================
     玩家派兵
  ========================================================= */

  function deploy(type) {

    if (!state || !state.running) {
      return;
    }


    const cost =
      UNIT_TYPES[type].cost;


    if (state.energy < cost) {
      return;
    }


    state.energy -= cost;


    spawnUnit(
      'me',
      type
    );


    playBeep(
      520,
      0.08
    );

  }


  /* =========================================================
     找最近敵人
  ========================================================= */

  function findTarget(
    unit,
    enemies
  ) {

    let nearest = null;

    let nearestDist = Infinity;


    enemies.forEach(e => {

      const d =
        Math.abs(
          e.x - unit.x
        );


      if (d < nearestDist) {

        nearestDist = d;

        nearest = e;

      }

    });


    return {
      target: nearest,
      dist: nearestDist
    };

  }


  /* =========================================================
     主迴圈
  ========================================================= */

  function loop(now) {

    const dt =
      Math.min(
        50,
        now - lastTime
      ) / 1000;


    lastTime = now;


    const cfg =
      STAGES[currentStage];


    if (state.running) {


      /* 能量 */

      state.energy =
        Math.min(
          state.maxEnergy,

          state.energy +
          state.energyRate *
          dt
        );


      /* 敵軍生成 */

      spawnTimer +=
        dt * 1000;


      if (
        spawnTimer >=
        cfg.spawnInterval
      ) {

        spawnTimer = 0;


        spawnUnit(

          'enemy',

          Math.random() < 0.25
            ? 'tank'
            : 'basic'

        );

      }


      /* =====================================================
         我方
      ===================================================== */

      const ATTACK_RANGE = 26;


      state.myUnits.forEach(u => {

        const {
          target,
          dist
        } =
          findTarget(
            u,
            state.enemyUnits
          );


        if (
          target &&
          dist < ATTACK_RANGE
        ) {

          target.hp -=
            u.damage *
            dt *
            2;

        } else {

          u.x +=
            u.speed *
            MOVE_SPEED *
            dt;


          if (
            u.x >= CW - 30
          ) {

            state.enemyHp -=
              u.damage *
              dt *
              1.5;

          }

        }

      });


      /* =====================================================
         敵方
      ===================================================== */

      state.enemyUnits.forEach(u => {

        const {
          target,
          dist
        } =
          findTarget(
            u,
            state.myUnits
          );


        if (
          target &&
          dist < ATTACK_RANGE
        ) {

          target.hp -=
            u.damage *
            dt *
            2;

        } else {

          u.x -=
            u.speed *
            MOVE_SPEED *
            cfg.enemySpeedMul *
            dt;


          if (
            u.x <= 30
          ) {

            state.myHp -=
              cfg.enemyDamage *
              dt;

          }

        }

      });


      /* 清除死亡 */

      state.myUnits =
        state.myUnits.filter(
          u => u.hp > 0
        );


      state.enemyUnits =
        state.enemyUnits.filter(
          u => u.hp > 0
        );


      updateBars();


      /* 勝負 */

      if (
        state.enemyHp <= 0
      ) {

        endStage(true);

      } else if (
        state.myHp <= 0
      ) {

        endStage(false);

      }

    }


    draw();


    rafId =
      requestAnimationFrame(
        loop
      );

  }


  /* =========================================================
     結束關卡
  ========================================================= */

  function endStage(won) {

    state.running =
      false;


    if (won) {

      messageEl.textContent =
        '🎉 過關了！';


      messageEl.className =
        'game-message win';


      playBeep(
        880,
        0.25
      );


      /*
        解鎖下一關
      */

      if (
        currentStage + 2 >
        unlocked
      ) {

        unlocked =
          currentStage + 2;


        if (
          unlocked >
          STAGES.length
        ) {

          unlocked =
            STAGES.length;

        }


        localStorage.setItem(
          'catsGameUnlocked',
          String(unlocked)
        );


        renderMapStages();

      }

    } else {

      messageEl.textContent =
        '基地被攻陷了，再試一次';


      messageEl.className =
        'game-message lose';


      playBeep(
        160,
        0.3
      );

    }

  }


  /* =========================================================
     畫單位
  ========================================================= */

  function drawUnit(u) {

    ctx.beginPath();


    ctx.arc(
      u.x,
      GROUND_Y,
      u.radius,
      0,
      Math.PI * 2
    );


    ctx.fillStyle =
      u.color;


    ctx.fill();


    ctx.font =
      '16px sans-serif';


    ctx.textAlign =
      'center';


    ctx.fillText(

      u.side === 'me'
        ? '🐱'
        : '👾',

      u.x,

      GROUND_Y + 5

    );


    /* 小血條 */

    const w =
      u.radius * 2;


    const pct =
      Math.max(
        0,
        u.hp / u.maxHp
      );


    ctx.fillStyle =
      'rgba(0,0,0,0.4)';


    ctx.fillRect(

      u.x - w / 2,

      GROUND_Y -
      u.radius -
      10,

      w,

      4

    );


    ctx.fillStyle =
      u.side === 'me'
        ? '#6FE7DD'
        : '#FF8A5B';


    ctx.fillRect(

      u.x - w / 2,

      GROUND_Y -
      u.radius -
      10,

      w * pct,

      4

    );

  }


  /* =========================================================
     畫面
  ========================================================= */

  function draw() {

    ctx.clearRect(
      0,
      0,
      CW,
      CH
    );


    /* 地面 */

    ctx.strokeStyle =
      'rgba(255,255,255,0.08)';


    ctx.beginPath();


    ctx.moveTo(
      0,
      GROUND_Y + 20
    );


    ctx.lineTo(
      CW,
      GROUND_Y + 20
    );


    ctx.stroke();


    /* 基地 */

    ctx.font =
      '26px sans-serif';


    ctx.textAlign =
      'center';


    ctx.fillText(
      '🏠',
      20,
      GROUND_Y + 8
    );


    ctx.fillText(
      '🏰',
      CW - 20,
      GROUND_Y + 8
    );


    if (!state) {
      return;
    }


    state.myUnits.forEach(
      drawUnit
    );


    state.enemyUnits.forEach(
      drawUnit
    );

  }


  /* =========================================================
     地圖按鈕
  ========================================================= */

  document
    .querySelectorAll('.map-stage')
    .forEach(btn => {

      btn.addEventListener(
        'click',
        () => {

          const index =
            Number(
              btn.dataset.stage
            );


          openStage(index);

        }
      );

    });


  /* =========================================================
     圖鑑、編隊
  ========================================================= */

  document
    .getElementById('my-book-btn')
    .addEventListener(
      'click',
      () => showScreen(myBookScreen)
    );


  document
    .getElementById('enemy-book-btn')
    .addEventListener(
      'click',
      () => showScreen(enemyBookScreen)
    );


  document
    .getElementById('team-btn')
    .addEventListener(
      'click',
      () => showScreen(teamScreen)
    );


  /* =========================================================
     戰鬥開始
  ========================================================= */

  document
    .getElementById('quick-battle-btn')
    .addEventListener(
      'click',
      () => {

        /*
          戰鬥開始按鈕直接進入
          目前已解鎖的第一個關卡
        */

        currentStage =
          Math.max(
            0,
            Math.min(
              unlocked - 1,
              STAGES.length - 1
            )
          );


        startStage();

      }
    );


  /* =========================================================
     彈窗
  ========================================================= */

  stageStartBtn.addEventListener(
    'click',
    startSelectedStage
  );


  stageCancelBtn.addEventListener(
    'click',
    closeStageModal
  );


  stageModal.addEventListener(
    'click',
    event => {

      if (
        event.target === stageModal
      ) {

        closeStageModal();

      }

    }
  );


  /* =========================================================
     返回地圖
  ========================================================= */

  document
    .querySelectorAll(
      '.return-map'
    )
    .forEach(btn => {

      btn.addEventListener(
        'click',
        returnToMap
      );

    });


  document
    .getElementById(
      'battle-return-map'
    )
    .addEventListener(
      'click',
      returnToMap
    );


  /* =========================================================
     出兵
  ========================================================= */

  document
    .getElementById('deploy-basic')
    .addEventListener(
      'click',
      () => deploy('basic')
    );


  document
    .getElementById('deploy-tank')
    .addEventListener(
      'click',
      () => deploy('tank')
    );


  /* =========================================================
     初始
  ========================================================= */

  renderMapStages();

  showScreen(mapScreen);

})();
