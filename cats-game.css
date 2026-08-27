(function () {

  /* =====================================================
     基本元素
  ===================================================== */

  const mapScreen =
    document.getElementById("map-screen");

  const battleScreen =
    document.getElementById("battle-screen");

  const battleStart =
    document.getElementById("battle-start");

  const battleBack =
    document.getElementById("battle-back");

  const battleStageTitle =
    document.getElementById("battle-stage-title");

  const stageInfo =
    document.getElementById("stage-info");

  const infoHp =
    document.getElementById("info-hp");

  const infoDifficulty =
    document.getElementById("info-difficulty");

  const stageNodes =
    document.querySelectorAll(".stage-node");


  /* =====================================================
     圖鑑
  ===================================================== */

  const menuOverlay =
    document.getElementById("menu-overlay");

  const menuClose =
    document.getElementById("menu-close");

  const menuTitle =
    document.getElementById("menu-title");

  const menuContent =
    document.getElementById("menu-content");

  const myBookBtn =
    document.getElementById("my-book-btn");

  const enemyBookBtn =
    document.getElementById("enemy-book-btn");

  const formationBtn =
    document.getElementById("formation-btn");


  /* =====================================================
     關卡資料
  ===================================================== */

  const STAGES = [

    {
      name: "第一關",
      enemyHp: 100,
      spawnInterval: 2600,
      enemySpeedMul: 1.0,
      enemyDamage: 6,
      difficulty: "★"
    },

    {
      name: "第二關",
      enemyHp: 160,
      spawnInterval: 2100,
      enemySpeedMul: 1.2,
      enemyDamage: 8,
      difficulty: "★★"
    },

    {
      name: "第三關",
      enemyHp: 230,
      spawnInterval: 1700,
      enemySpeedMul: 1.45,
      enemyDamage: 10,
      difficulty: "★★★"
    }

  ];


  /* =====================================================
     解鎖
  ===================================================== */

  let unlocked =
    parseInt(
      localStorage.getItem(
        "catsGameUnlocked"
      ) || "1",
      10
    );


  let currentStage = 0;


  /* =====================================================
     選關
  ===================================================== */

  function updateStageNodes() {

    stageNodes.forEach(
      (node, index) => {

        const isLocked =
          index + 1 > unlocked;

        node.classList.toggle(
          "locked",
          isLocked
        );

        const clearText =
          node.querySelector(
            ".stage-clear"
          );

        if (isLocked) {

          clearText.textContent =
            "LOCK";

        } else if (
          index + 1 < unlocked
        ) {

          clearText.textContent =
            "CLEAR!";

        } else {

          clearText.textContent =
            "NEW!";

        }

      }
    );

  }


  function selectStage(index) {

    if (index + 1 > unlocked) {

      playBeep(180, 0.08);

      return;

    }


    currentStage = index;

    const stage =
      STAGES[currentStage];


    stageInfo.querySelector(
      ".stage-info-title"
    ).textContent =
      stage.name;


    infoHp.textContent =
      stage.enemyHp;


    infoDifficulty.textContent =
      stage.difficulty;


    stageNodes.forEach(
      node =>
        node.classList.remove(
          "selected"
        )
    );


    stageNodes[currentStage]
      .classList.add("selected");

  }


  stageNodes.forEach(
    (node) => {

      node.addEventListener(
        "click",
        () => {

          const index =
            parseInt(
              node.dataset.stage,
              10
            );

          selectStage(index);

        }
      );

    }
  );


  /* =====================================================
     開始戰鬥
  ===================================================== */

  battleStart.addEventListener(
    "click",
    () => {

      startBattleScreen();

    }
  );


  function startBattleScreen() {

    mapScreen.classList.add(
      "hidden"
    );

    battleScreen.classList.remove(
      "hidden"
    );

    battleStageTitle.textContent =
      STAGES[currentStage].name;

    startStage();

  }


  /* =====================================================
     回到地圖
  ===================================================== */

  battleBack.addEventListener(
    "click",
    () => {

      if (rafId) {

        cancelAnimationFrame(
          rafId
        );

        rafId = null;

      }

      state = null;

      battleScreen.classList.add(
        "hidden"
      );

      mapScreen.classList.remove(
        "hidden"
      );

      updateStageNodes();

    }
  );


  /* =====================================================
     圖鑑
  ===================================================== */

  function openMenu(
    title,
    cards
  ) {

    menuTitle.textContent =
      title;

    menuContent.innerHTML = "";

    cards.forEach(
      card => {

        const div =
          document.createElement(
            "div"
          );

        div.className =
          "book-card";

        div.innerHTML = `
          <span class="book-card-icon">
            ${card.icon}
          </span>

          ${card.name}
        `;

        menuContent.appendChild(
          div
        );

      }
    );


    menuOverlay.classList.remove(
      "hidden"
    );

  }


  myBookBtn.addEventListener(
    "click",
    () => {

      openMenu(
        "我方圖鑑",
        [
          {
            icon: "🐱",
            name: "小貓兵"
          },
          {
            icon: "🐈",
            name: "重裝貓"
          },
          {
            icon: "😺",
            name: "貓咪戰士"
          },
          {
            icon: "😸",
            name: "快速貓"
          }
        ]
      );

    }
  );


  enemyBookBtn.addEventListener(
    "click",
    () => {

      openMenu(
        "敵人圖鑑",
        [
          {
            icon: "👾",
            name: "小怪"
          },
          {
            icon: "👹",
            name: "重裝怪"
          },
          {
            icon: "🐲",
            name: "巨龍"
          }
        ]
      );

    }
  );


  formationBtn.addEventListener(
    "click",
    () => {

      openMenu(
        "編隊",
        [
          {
            icon: "🐱",
            name: "小貓兵"
          },
          {
            icon: "🐈",
            name: "重裝貓"
          }
        ]
      );

    }
  );


  menuClose.addEventListener(
    "click",
    () => {

      menuOverlay.classList.add(
        "hidden"
      );

    }
  );


  menuOverlay.addEventListener(
    "click",
    event => {

      if (
        event.target ===
        menuOverlay
      ) {

        menuOverlay.classList.add(
          "hidden"
        );

      }

    }
  );


  /* =====================================================
     以下是原本戰鬥系統
  ===================================================== */

  const canvas =
    document.getElementById(
      "battle-canvas"
    );

  const ctx =
    canvas.getContext("2d");


  const CW =
    canvas.width;

  const CH =
    canvas.height;

  const GROUND_Y =
    CH - 40;


  const hpMeEl =
    document.getElementById(
      "hp-me"
    );

  const hpEnemyEl =
    document.getElementById(
      "hp-enemy"
    );

  const energyFillEl =
    document.getElementById(
      "energy-fill"
    );

  const messageEl =
    document.getElementById(
      "game-message"
    );


  const deployBasicBtn =
    document.getElementById(
      "deploy-basic"
    );

  const deployTankBtn =
    document.getElementById(
      "deploy-tank"
    );


  /* =====================================================
     單位
  ===================================================== */

  const UNIT_TYPES = {

    basic: {
      cost: 10,
      hp: 30,
      damage: 8,
      speed: 1.0,
      color: "#EDEDF2",
      radius: 14
    },

    tank: {
      cost: 30,
      hp: 90,
      damage: 14,
      speed: 0.6,
      color: "#FF8A5B",
      radius: 20
    }

  };


  const MOVE_SPEED = 90;


  let state = null;

  let rafId = null;

  let lastTime = 0;

  let spawnTimer = 0;


  /* =====================================================
     音效
  ===================================================== */

  function playBeep(
    freq,
    duration
  ) {

    try {

      const volume =
        (
          parseInt(
            localStorage.getItem(
              "clubGameVolume"
            ) || "60",
            10
          )
        ) / 100;


      if (volume <= 0)
        return;


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
        "square";


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

      // 音效錯誤不影響遊戲

    }

  }


  /* =====================================================
     開始關卡
  ===================================================== */

  function startStage() {

    const cfg =
      STAGES[currentStage];


    state = {

      running: true,

      energy: 0,

      maxEnergy: 100,

      energyRate: 12,

      myHp: 100,

      myMaxHp: 100,

      enemyHp:
        cfg.enemyHp,

      enemyMaxHp:
        cfg.enemyHp,

      myUnits: [],

      enemyUnits: []

    };


    spawnTimer = 0;


    messageEl.textContent =
      "";

    messageEl.className =
      "game-message";


    updateBars();


    if (rafId) {

      cancelAnimationFrame(
        rafId
      );

    }


    lastTime =
      performance.now();


    rafId =
      requestAnimationFrame(
        loop
      );

  }


  /* =====================================================
     更新血條
  ===================================================== */

  function updateBars() {

    if (!state)
      return;


    hpMeEl.style.width =
      Math.max(
        0,
        (
          state.myHp /
          state.myMaxHp
        ) * 100
      ) + "%";


    hpEnemyEl.style.width =
      Math.max(
        0,
        (
          state.enemyHp /
          state.enemyMaxHp
        ) * 100
      ) + "%";


    energyFillEl.style.width =
      Math.min(
        100,
        (
          state.energy /
          state.maxEnergy
        ) * 100
      ) + "%";

  }


  /* =====================================================
     生成單位
  ===================================================== */

  function spawnUnit(
    side,
    type
  ) {

    const t =
      UNIT_TYPES[type];


    const unit = {

      side,

      type,

      x:
        side === "me"
          ? 40
          : CW - 40,

      hp: t.hp,

      maxHp: t.hp,

      damage: t.damage,

      speed: t.speed,

      color: t.color,

      radius: t.radius

    };


    if (side === "me") {

      state.myUnits.push(
        unit
      );

    } else {

      state.enemyUnits.push(
        unit
      );

    }

  }


  /* =====================================================
     出兵
  ===================================================== */

  function deploy(type) {

    if (
      !state ||
      !state.running
    )
      return;


    const cost =
      UNIT_TYPES[type].cost;


    if (
      state.energy <
      cost
    )
      return;


    state.energy -=
      cost;


    spawnUnit(
      "me",
      type
    );


    playBeep(
      520,
      0.08
    );

  }


  deployBasicBtn.addEventListener(
    "click",
    () =>
      deploy("basic")
  );


  deployTankBtn.addEventListener(
    "click",
    () =>
      deploy("tank")
  );


  /* =====================================================
     尋找敵人
  ===================================================== */

  function findTarget(
    unit,
    enemies
  ) {

    let nearest = null;

    let nearestDist =
      Infinity;


    enemies.forEach(
      enemy => {

        const d =
          Math.abs(
            enemy.x -
            unit.x
          );


        if (
          d <
          nearestDist
        ) {

          nearestDist = d;

          nearest = enemy;

        }

      }
    );


    return {
      target: nearest,
      dist: nearestDist
    };

  }


  /* =====================================================
     主循環
  ===================================================== */

  function loop(now) {

    if (!state)
      return;


    const dt =
      Math.min(
        50,
        now - lastTime
      ) / 1000;


    lastTime =
      now;


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


      /* 敵人生成 */

      spawnTimer +=
        dt * 1000;


      if (
        spawnTimer >=
        cfg.spawnInterval
      ) {

        spawnTimer = 0;


        spawnUnit(
          "enemy",
          Math.random() < 0.25
            ? "tank"
            : "basic"
        );

      }


      /* 戰鬥 */

      const ATTACK_RANGE =
        26;


      state.myUnits.forEach(
        u => {

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
            dist <
              ATTACK_RANGE
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
              u.x >=
              CW - 30
            ) {

              state.enemyHp -=
                u.damage *
                dt *
                1.5;

            }

          }

        }
      );


      state.enemyUnits.forEach(
        u => {

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
            dist <
              ATTACK_RANGE
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

        }
      );


      state.myUnits =
        state.myUnits.filter(
          u => u.hp > 0
        );


      state.enemyUnits =
        state.enemyUnits.filter(
          u => u.hp > 0
        );


      updateBars();


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


  /* =====================================================
     關卡結束
  ===================================================== */

  function endStage(
    won
  ) {

    state.running =
      false;


    if (won) {

      messageEl.textContent =
        "🎉 過關了！";


      messageEl.className =
        "game-message win";


      playBeep(
        880,
        0.25
      );


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
          "catsGameUnlocked",
          String(unlocked)
        );

      }

    } else {

      messageEl.textContent =
        "基地被攻陷了，再試一次";


      messageEl.className =
        "game-message lose";


      playBeep(
        160,
        0.3
      );

    }

  }


  /* =====================================================
     畫單位
  ===================================================== */

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
      "16px sans-serif";


    ctx.textAlign =
      "center";


    ctx.fillText(
      u.side === "me"
        ? "🐱"
        : "👾",
      u.x,
      GROUND_Y + 5
    );


    /* 血條 */

    const w =
      u.radius * 2;


    const pct =
      Math.max(
        0,
        u.hp /
        u.maxHp
      );


    ctx.fillStyle =
      "rgba(0,0,0,.4)";


    ctx.fillRect(
      u.x - w / 2,
      GROUND_Y -
        u.radius -
        10,
      w,
      4
    );


    ctx.fillStyle =
      u.side === "me"
        ? "#6FE7DD"
        : "#FF8A5B";


    ctx.fillRect(
      u.x - w / 2,
      GROUND_Y -
        u.radius -
        10,
      w * pct,
      4
    );

  }


  /* =====================================================
     畫面
  ===================================================== */

  function draw() {

    ctx.clearRect(
      0,
      0,
      CW,
      CH
    );


    /* 地面 */

    ctx.strokeStyle =
      "rgba(255,255,255,.08)";


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
      "26px sans-serif";


    ctx.textAlign =
      "center";


    ctx.fillText(
      "🏠",
      20,
      GROUND_Y + 8
    );


    ctx.fillText(
      "🏰",
      CW - 20,
      GROUND_Y + 8
    );


    if (!state)
      return;


    state.myUnits.forEach(
      drawUnit
    );


    state.enemyUnits.forEach(
      drawUnit
    );

  }


  /* =====================================================
     初始化
  ===================================================== */

  updateStageNodes();

  selectStage(0);

})();
