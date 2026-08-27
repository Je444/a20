(function () {
"use strict";

const STAGES = [
    {
        name: "第一關",
        enemyHp: 236000,
        spawnInterval: 2600,
        enemySpeedMul: 1.0,
        enemyDamage: 6,
        stars: "★",
        maxEnemies: 10
    },
    {
        name: "第二關",
        enemyHp: 360000,
        spawnInterval: 2100,
        enemySpeedMul: 1.2,
        enemyDamage: 8,
        stars: "★★",
        maxEnemies: 13
    },
    {
        name: "第三關",
        enemyHp: 520000,
        spawnInterval: 1700,
        enemySpeedMul: 1.45,
        enemyDamage: 10,
        stars: "★★★",
        maxEnemies: 16
    }
];

const UNIT_TYPES = {
    cat1: {
        cost: 150,
        hp: 180,
        damage: 40,
        speed: 1.00,
        radius: 34,
        icon: "assets/battle/cat1.svg",
        cardIcon: "assets/cat1.svg",
        cooldown: 900,
        attackRange: 72,
        attackTime: .16
    },

    cat2: {
        cost: 300,
        hp: 360,
        damage: 70,
        speed: .78,
        radius: 40,
        icon: "assets/battle/cat2.svg",
        cardIcon: "assets/cat2.svg",
        cooldown: 1400,
        attackRange: 78,
        attackTime: .20
    },

    cat3: {
        cost: 540,
        hp: 700,
        damage: 125,
        speed: .62,
        radius: 47,
        icon: "assets/battle/cat3.svg",
        cardIcon: "assets/cat3.svg",
        cooldown: 2100,
        attackRange: 92,
        attackTime: .24
    },

    cat4: {
        cost: 690,
        hp: 950,
        damage: 170,
        speed: .52,
        radius: 52,
        icon: "assets/battle/cat4.svg",
        cardIcon: "assets/cat4.svg",
        cooldown: 2600,
        attackRange: 100,
        attackTime: .27
    },

    cat5: {
        cost: 950,
        hp: 1350,
        damage: 250,
        speed: .42,
        radius: 58,
        icon: "assets/battle/cat5.svg",
        cardIcon: "assets/cat5.svg",
        cooldown: 3400,
        attackRange: 110,
        attackTime: .30
    }
};

const ENEMY_TYPES = {
    enemy1: {
        hp: 240,
        damage: 22,
        speed: .55,
        radius: 35,
        icon: "assets/battle/enemy1.svg",
        attackCooldown: 1250,
        attackRange: 70,
        attackTime: .18
    },

    enemy2: {
        hp: 680,
        damage: 58,
        speed: .34,
        radius: 48,
        icon: "assets/battle/enemy2.svg",
        attackCooldown: 1900,
        attackRange: 90,
        attackTime: .23
    }
};

const MAX_MONEY = 6000;
const START_MONEY = 1869;
const MONEY_RATE = 75;

const CANVAS_W = 1800;
const CANVAS_H = 900;

const GROUND_Y = 650;

const LEFT_BASE_X = 150;
const RIGHT_BASE_X = 1650;

const PLAYER_SPAWN_X = 1540;
const ENEMY_SPAWN_X = 260;

const BASE_ATTACK_RANGE = 150;
const BASE_ATTACK_COOLDOWN = 1500;

const mapScreen = document.getElementById("map-screen");
const battleScreen = document.getElementById("battle-screen");

const stageNodes = Array.from(
    document.querySelectorAll(".stage-node")
);

const stageInfoTitle =
    document.querySelector("#stage-info .stage-info-title");

const infoHp =
    document.getElementById("info-hp");

const infoDifficulty =
    document.getElementById("info-difficulty");

const battleStartBtn =
    document.getElementById("battle-start");

const battleBackBtn =
    document.getElementById("battle-back");

const playerCat =
    document.querySelector(".player-cat");

const worldMap =
    document.querySelector(".world-map");

const canvas =
    document.getElementById("battle-canvas");

const ctx =
    canvas.getContext("2d");

const moneyValue =
    document.getElementById("money-value");

const myHpText =
    document.getElementById("my-hp-text");

const enemyHpText =
    document.getElementById("enemy-hp-text");

const hpMeEl =
    document.getElementById("hp-me");

const hpEnemyEl =
    document.getElementById("hp-enemy");

const energyFillEl =
    document.getElementById("energy-fill");

const messageEl =
    document.getElementById("game-message");

const pauseBtn =
    document.getElementById("battle-pause");

const pausePanel =
    document.getElementById("pause-panel");

const pauseResume =
    document.getElementById("pause-resume");

const pauseExit =
    document.getElementById("pause-exit");

const unitCards =
    Array.from(document.querySelectorAll(".unit-card"));

const myBookBtn =
    document.getElementById("my-book-btn");

const enemyBookBtn =
    document.getElementById("enemy-book-btn");

const formationBtn =
    document.getElementById("formation-btn");

const menuOverlay =
    document.getElementById("menu-overlay");

const menuClose =
    document.getElementById("menu-close");

const menuTitle =
    document.getElementById("menu-title");

const menuContent =
    document.getElementById("menu-content");

let selectedStage = 0;
let battleState = null;
let rafId = null;
let lastTime = 0;
let spawnTimer = 0;

const imageCache = {};

function loadImage(src) {
    if (imageCache[src]) {
        return imageCache[src];
    }

    const img = new Image();

    img.src = src;

    imageCache[src] = img;

    return img;
}

Object.values(UNIT_TYPES).forEach(unit => {
    loadImage(unit.icon);
});

Object.values(ENEMY_TYPES).forEach(unit => {
    loadImage(unit.icon);
});


function getClearedCount() {
    return parseInt(
        localStorage.getItem("catsGameCleared") || "0",
        10
    );
}

function setClearedCount(n) {
    localStorage.setItem(
        "catsGameCleared",
        String(n)
    );
}


function renderMapNodes() {
    const cleared = getClearedCount();

    const unlocked =
        Math.min(
            cleared + 1,
            STAGES.length
        );

    stageNodes.forEach((node, index) => {

        const label =
            node.querySelector(".stage-clear");

        const locked =
            index >= unlocked;

        node.classList.toggle(
            "locked",
            locked
        );

        if (index < cleared) {
            label.textContent = "CLEAR!";
        } else if (index === cleared) {
            label.textContent = "NEW!";
        } else {
            label.textContent = "LOCK";
        }
    });

    selectStage(
        Math.min(
            cleared,
            STAGES.length - 1
        )
    );
}


function selectStage(index) {

    const node =
        stageNodes[index];

    if (
        !node ||
        node.classList.contains("locked")
    ) {
        return;
    }

    selectedStage = index;

    stageNodes.forEach(node => {
        node.classList.remove("selected");
    });

    node.classList.add("selected");

    const cfg =
        STAGES[index];

    stageInfoTitle.textContent =
        cfg.name;

    infoHp.textContent =
        cfg.enemyHp.toLocaleString();

    infoDifficulty.textContent =
        cfg.stars;

    movePlayerCatTo(node);
}


function movePlayerCatTo(node) {

    if (!playerCat || !worldMap) {
        return;
    }

    const mapRect =
        worldMap.getBoundingClientRect();

    const nodeRect =
        node.getBoundingClientRect();

    const x =
        nodeRect.left +
        nodeRect.width / 2 -
        mapRect.left;

    const y =
        nodeRect.top +
        nodeRect.height / 2 -
        mapRect.top +
        46;

    playerCat.style.left =
        x + "px";

    playerCat.style.top =
        y + "px";

    playerCat.style.bottom =
        "auto";

    playerCat.style.transform =
        "translate(-50%,-50%)";
}


stageNodes.forEach((node, index) => {

    node.addEventListener(
        "click",
        () => selectStage(index)
    );

});


battleStartBtn.addEventListener(
    "click",
    () => {

        mapScreen.classList.add("hidden");

        battleScreen.classList.remove("hidden");

        startBattle(selectedStage);
    }
);


function playBeep(freq, duration) {

    try {

        const volume =
            parseInt(
                localStorage.getItem(
                    "clubGameVolume"
                ) || "60",
                10
            ) / 100;

        if (volume <= 0) {
            return;
        }

        const AudioCtx =
            window.AudioContext ||
            window.webkitAudioContext;

        const audio =
            new AudioCtx();

        const oscillator =
            audio.createOscillator();

        const gain =
            audio.createGain();

        oscillator.frequency.value =
            freq;

        oscillator.type =
            "square";

        gain.gain.value =
            volume * .08;

        oscillator.connect(gain);

        gain.connect(audio.destination);

        oscillator.start();

        oscillator.stop(
            audio.currentTime +
            duration
        );

        setTimeout(
            () => audio.close(),
            duration * 1000 + 100
        );

    } catch (e) {}

}


function clamp(value, min, max) {
    return Math.max(
        min,
        Math.min(max, value)
    );
}


function randomRange(min, max) {
    return min +
        Math.random() *
        (max - min);
}


function getLaneY(index) {

    const offsets = [
        0,
        -24,
        24,
        -45,
        45,
        -65,
        65
    ];

    return GROUND_Y +
        offsets[
            index %
            offsets.length
        ];
}


function startBattle(stageIndex) {

    const cfg =
        STAGES[stageIndex];

    battleState = {

        running: true,

        paused: false,

        money: START_MONEY,

        maxMoney: MAX_MONEY,

        moneyRate: MONEY_RATE,

        myHp: 1200000,

        myMaxHp: 1200000,

        enemyHp: cfg.enemyHp,

        enemyMaxHp: cfg.enemyHp,

        myUnits: [],

        enemyUnits: [],

        cooldowns: {},

        particles: [],

        nextId: 1,

        baseCooldownMe: 0,

        baseCooldownEnemy: 0

    };

    spawnTimer = 0;

    messageEl.textContent = "";

    messageEl.className =
        "game-message";

    pausePanel.classList.add(
        "hidden"
    );

    updateHud();

    if (rafId) {
        cancelAnimationFrame(rafId);
    }

    lastTime =
        performance.now();

    rafId =
        requestAnimationFrame(loop);
}


function updateHud() {

    if (!battleState) {
        return;
    }

    moneyValue.textContent =
        Math.floor(
            battleState.money
        ).toLocaleString();

    myHpText.textContent =
        `${Math.max(
            0,
            Math.floor(
                battleState.myHp
            )
        ).toLocaleString()} / ${battleState.myMaxHp.toLocaleString()}`;

    enemyHpText.textContent =
        `${Math.max(
            0,
            Math.floor(
                battleState.enemyHp
            )
        ).toLocaleString()} / ${battleState.enemyMaxHp.toLocaleString()}`;

    hpMeEl.style.width =
        clamp(
            battleState.myHp /
            battleState.myMaxHp *
            100,
            0,
            100
        ) + "%";

    hpEnemyEl.style.width =
        clamp(
            battleState.enemyHp /
            battleState.enemyMaxHp *
            100,
            0,
            100
        ) + "%";

    energyFillEl.style.width =
        clamp(
            battleState.money /
            battleState.maxMoney *
            100,
            0,
            100
        ) + "%";


    unitCards.forEach(card => {

        const type =
            card.dataset.unit;

        const cost =
            Number(card.dataset.cost);

        const remaining =
            battleState.cooldowns[type] || 0;

        const affordable =
            battleState.money >= cost &&
            remaining <= 0;

        card.classList.toggle(
            "affordable",
            affordable
        );

        card.classList.toggle(
            "disabled",
            !affordable
        );

        card.classList.toggle(
            "cooldown",
            remaining > 0
        );

        const text =
            card.querySelector(
                ".cooldown-text"
            );

        if (text) {
            text.textContent =
                remaining > 0
                    ? (remaining / 1000).toFixed(1)
                    : "";
        }

    });
}


function makeUnit(
    side,
    type,
    spawnIndex = 0
) {

    const data =
        side === "me"
            ? UNIT_TYPES[type]
            : ENEMY_TYPES[type];

    return {

        id:
            battleState.nextId++,

        side,

        type,

        x:
            side === "me"
                ? PLAYER_SPAWN_X
                : ENEMY_SPAWN_X,

        y:
            getLaneY(spawnIndex),

        hp:
            data.hp,

        maxHp:
            data.hp,

        damage:
            data.damage,

        speed:
            data.speed,

        radius:
            data.radius,

        attackRange:
            data.attackRange,

        attackCooldown:
            data.cooldown ??
            data.attackCooldown,

        attackTimer:
            randomRange(0, 350),

        attackAnim: 0,

        hitFlash: 0,

        dead: false

    };
}


function spawnUnit(
    side,
    type
) {

    const list =
        side === "me"
            ? battleState.myUnits
            : battleState.enemyUnits;

    const unit =
        makeUnit(
            side,
            type,
            list.length
        );

    const direction =
        side === "me"
            ? -1
            : 1;

    const last =
        list[list.length - 1];

    if (last) {

        const minimum =
            unit.radius +
            last.radius +
            12;

        const distance =
            Math.abs(
                unit.x -
                last.x
            );

        if (distance < minimum) {

            unit.x =
                last.x +
                direction *
                minimum;
        }
    }

    list.push(unit);

    createBurst(
        unit.x,
        unit.y,
        side === "me"
            ? "#fff0a0"
            : "#c89be8",
        7
    );
}


function deploy(type) {

    if (
        !battleState ||
        !battleState.running ||
        battleState.paused
    ) {
        return;
    }

    const data =
        UNIT_TYPES[type];

    const remaining =
        battleState.cooldowns[type] || 0;

    if (
        battleState.money <
        data.cost ||
        remaining > 0
    ) {
        return;
    }

    battleState.money -=
        data.cost;

    battleState.cooldowns[type] =
        data.cooldown;

    spawnUnit(
        "me",
        type
    );

    playBeep(
        520,
        .08
    );

    updateHud();
}


unitCards.forEach(card => {

    card.addEventListener(
        "click",
        () => {

            deploy(
                card.dataset.unit
            );

        }
    );

});


function chooseEnemyType(
    stageIndex
) {

    const r =
        Math.random();

    if (stageIndex === 0) {
        return r < .82
            ? "enemy1"
            : "enemy2";
    }

    if (stageIndex === 1) {
        return r < .62
            ? "enemy1"
            : "enemy2";
    }

    return r < .42
        ? "enemy1"
        : "enemy2";
}


function distanceX(a, b) {
    return Math.abs(
        a.x - b.x
    );
}


function isColliding(a, b) {

    return distanceX(a, b) <=
        a.radius +
        b.radius +
        6;
}


function findTarget(
    unit,
    enemies
) {

    let best = null;

    let bestDistance =
        Infinity;

    for (const enemy of enemies) {

        if (enemy.dead) {
            continue;
        }

        const distance =
            distanceX(
                unit,
                enemy
            );

        const overlap =
            isColliding(
                unit,
                enemy
            );

        const ahead =
            unit.side === "me"
                ? enemy.x <= unit.x + 5
                : enemy.x >= unit.x - 5;

        if (
            (ahead || overlap) &&
            distance < bestDistance
        ) {

            best =
                enemy;

            bestDistance =
                distance;
        }
    }

    return {
        target: best,
        distance: bestDistance
    };
}


function blockedByFriend(
    unit,
    friends
) {

    for (const friend of friends) {

        if (
            friend === unit ||
            friend.dead
        ) {
            continue;
        }

        const distance =
            distanceX(
                unit,
                friend
            );

        const minimum =
            unit.radius +
            friend.radius +
            5;

        if (
            distance < minimum
        ) {

            if (
                unit.side === "me" &&
                friend.x > unit.x
            ) {
                return true;
            }

            if (
                unit.side === "enemy" &&
                friend.x < unit.x
            ) {
                return true;
            }
        }
    }

    return false;
}


function attack(
    attacker,
    target
) {

    if (
        !target ||
        target.dead
    ) {
        return;
    }

    attacker.attackTimer =
        attacker.attackCooldown;

    attacker.attackAnim =
        .22;

    target.hitFlash =
        .12;

    target.hp -=
        attacker.damage;

    createHit(
        attacker,
        target
    );

    playBeep(
        attacker.side === "me"
            ? 610
            : 210,
        .035
    );

    if (target.hp <= 0) {

        target.dead =
            true;

        createBurst(
            target.x,
            target.y,
            attacker.side === "me"
                ? "#ffdb4a"
                : "#d7a6ff",
            12
        );
    }
}


function baseAttack(
    side,
    target
) {

    if (
        !target ||
        target.dead
    ) {
        return;
    }

    if (side === "me") {

        battleState.baseCooldownMe =
            BASE_ATTACK_COOLDOWN;

        target.hp -= 90;

    } else {

        battleState.baseCooldownEnemy =
            BASE_ATTACK_COOLDOWN;

        target.hp -= 55;
    }

    target.hitFlash =
        .12;

    createHit(
        {
            side
        },
        target,
        true
    );
}


function updateUnit(
    unit,
    dt,
    stageIndex
) {

    if (unit.dead) {
        return;
    }

    const friends =
        unit.side === "me"
            ? battleState.myUnits
            : battleState.enemyUnits;

    const enemies =
        unit.side === "me"
            ? battleState.enemyUnits
            : battleState.myUnits;

    unit.attackTimer =
        Math.max(
            0,
            unit.attackTimer -
            dt * 1000
        );

    unit.attackAnim =
        Math.max(
            0,
            unit.attackAnim -
            dt
        );

    unit.hitFlash =
        Math.max(
            0,
            unit.hitFlash -
            dt
        );


    const result =
        findTarget(
            unit,
            enemies
        );

    const target =
        result.target;

    const distance =
        result.distance;


    if (target) {

        const attackDistance =
            unit.attackRange +
            target.radius;

        const collision =
            isColliding(
                unit,
                target
            );

        if (
            collision ||
            distance <= attackDistance
        ) {

            if (
                unit.attackTimer <= 0
            ) {
                attack(
                    unit,
                    target
                );
            }

            return;
        }
    }


    if (
        blockedByFriend(
            unit,
            friends
        )
    ) {
        return;
    }


    const speed =
        unit.speed *
        125 *
        (
            unit.side === "enemy"
                ? STAGES[
                    stageIndex
                ].enemySpeedMul
                : 1
        );


    if (unit.side === "me") {

        const stopX =
            LEFT_BASE_X +
            BASE_ATTACK_RANGE;

        unit.x =
            Math.max(
                stopX,
                unit.x -
                speed * dt
            );

    } else {

        const stopX =
            RIGHT_BASE_X -
            BASE_ATTACK_RANGE;

        unit.x =
            Math.min(
                stopX,
                unit.x +
                speed * dt
            );
    }
}


function updateBaseCombat(dt) {

    battleState.baseCooldownMe =
        Math.max(
            0,
            battleState.baseCooldownMe -
            dt * 1000
        );

    battleState.baseCooldownEnemy =
        Math.max(
            0,
            battleState.baseCooldownEnemy -
            dt * 1000
        );


    const enemyNearBase =
        battleState.enemyUnits
            .filter(
                unit =>
                    !unit.dead &&
                    unit.x >=
                    RIGHT_BASE_X -
                    BASE_ATTACK_RANGE
            )
            .sort(
                (a, b) =>
                    b.x - a.x
            )[0];


    const myNearBase =
        battleState.myUnits
            .filter(
                unit =>
                    !unit.dead &&
                    unit.x <=
                    LEFT_BASE_X +
                    BASE_ATTACK_RANGE
            )
            .sort(
                (a, b) =>
                    a.x - b.x
            )[0];


    if (
        enemyNearBase &&
        battleState.baseCooldownMe <= 0
    ) {

        baseAttack(
            "me",
            enemyNearBase
        );
    }


    if (
        myNearBase &&
        battleState.baseCooldownEnemy <= 0
    ) {

        baseAttack(
            "enemy",
            myNearBase
        );
    }
}


function loop(now) {

    const dt =
        Math.min(
            50,
            now - lastTime
        ) / 1000;

    lastTime =
        now;


    if (
        battleState &&
        battleState.running &&
        !battleState.paused
    ) {

        const cfg =
            STAGES[selectedStage];


        battleState.money =
            Math.min(
                MAX_MONEY,
                battleState.money +
                battleState.moneyRate *
                dt
            );


        Object.keys(
            battleState.cooldowns
        ).forEach(type => {

            battleState.cooldowns[type] =
                Math.max(
                    0,
                    battleState.cooldowns[type] -
                    dt * 1000
                );

        });


        spawnTimer +=
            dt * 1000;


        const enemyCount =
            battleState.enemyUnits
                .filter(
                    unit => !unit.dead
                )
                .length;


        if (
            spawnTimer >=
            cfg.spawnInterval &&
            enemyCount <
            cfg.maxEnemies
        ) {

            spawnTimer = 0;

            spawnUnit(
                "enemy",
                chooseEnemyType(
                    selectedStage
                )
            );
        }


        battleState.myUnits.forEach(
            unit =>
                updateUnit(
                    unit,
                    dt,
                    selectedStage
                )
        );


        battleState.enemyUnits.forEach(
            unit =>
                updateUnit(
                    unit,
                    dt,
                    selectedStage
                )
        );


        updateBaseCombat(dt);


        battleState.myUnits =
            battleState.myUnits.filter(
                unit => !unit.dead
            );


        battleState.enemyUnits =
            battleState.enemyUnits.filter(
                unit => !unit.dead
            );


        updateParticles(dt);

        updateHud();


        if (
            battleState.enemyHp <= 0
        ) {

            endBattle(true);

        } else if (
            battleState.myHp <= 0
        ) {

            endBattle(false);
        }
    }


    draw();

    rafId =
        requestAnimationFrame(loop);
}


function endBattle(won) {

    if (
        !battleState ||
        !battleState.running
    ) {
        return;
    }

    battleState.running =
        false;

    if (won) {

        messageEl.textContent =
            "🎉 過關了！";

        messageEl.className =
            "game-message win";

        playBeep(
            880,
            .25
        );

        const cleared =
            getClearedCount();

        if (
            selectedStage + 1 >
            cleared
        ) {

            setClearedCount(
                selectedStage + 1
            );
        }

    } else {

        messageEl.textContent =
            "基地被攻陷了，再試一次";

        messageEl.className =
            "game-message lose";

        playBeep(
            160,
            .3
        );
    }

    updateHud();
}


function createBurst(
    x,
    y,
    color,
    count
) {

    if (!battleState) {
        return;
    }

    for (
        let i = 0;
        i < count;
        i++
    ) {

        battleState.particles.push({

            x,

            y,

            vx:
                randomRange(
                    -90,
                    90
                ),

            vy:
                randomRange(
                    -130,
                    -20
                ),

            life:
                randomRange(
                    .25,
                    .55
                ),

            maxLife:
                .55,

            color,

            size:
                randomRange(
                    3,
                    8
                )
        });
    }
}


function createHit(
    attacker,
    target,
    base = false
) {

    if (!battleState) {
        return;
    }

    const x =
        target.x;

    const y =
        target.y - 20;


    for (
        let i = 0;
        i < (base ? 8 : 5);
        i++
    ) {

        battleState.particles.push({

            x:
                x +
                randomRange(
                    -8,
                    8
                ),

            y:
                y +
                randomRange(
                    -8,
                    8
                ),

            vx:
                randomRange(
                    -60,
                    60
                ),

            vy:
                randomRange(
                    -80,
                    20
                ),

            life:
                randomRange(
                    .12,
                    .3
                ),

            maxLife:
                .3,

            color:
                attacker.side === "enemy"
                    ? "#e6a6ff"
                    : "#ffe15a",

            size:
                randomRange(
                    3,
                    7
                )
        });
    }
}


function updateParticles(dt) {

    if (!battleState) {
        return;
    }

    battleState.particles =
        battleState.particles.filter(
            particle => {

                particle.life -=
                    dt;

                particle.x +=
                    particle.vx *
                    dt;

                particle.y +=
                    particle.vy *
                    dt;

                particle.vy +=
                    280 * dt;

                return particle.life > 0;
            }
        );
}


function roundedRectPath(
    x,
    y,
    width,
    height,
    radius
) {

    radius =
        Math.min(
            radius,
            Math.abs(width) / 2,
            Math.abs(height) / 2
        );

    ctx.beginPath();

    ctx.moveTo(
        x + radius,
        y
    );

    ctx.lineTo(
        x + width - radius,
        y
    );

    ctx.quadraticCurveTo(
        x + width,
        y,
        x + width,
        y + radius
    );

    ctx.lineTo(
        x + width,
        y + height - radius
    );

    ctx.quadraticCurveTo(
        x + width,
        y + height,
        x + width - radius,
        y + height
    );

    ctx.lineTo(
        x + radius,
        y + height
    );

    ctx.quadraticCurveTo(
        x,
        y + height,
        x,
        y + height - radius
    );

    ctx.lineTo(
        x,
        y + radius
    );

    ctx.quadraticCurveTo(
        x,
        y,
        x + radius,
        y
    );

    ctx.closePath();
}


function drawBackground() {

    const gradient =
        ctx.createLinearGradient(
            0,
            0,
            0,
            CANVAS_H
        );

    gradient.addColorStop(
        0,
        "#1a1c25"
    );

    gradient.addColorStop(
        .58,
        "#24252a"
    );

    gradient.addColorStop(
        1,
        "#171717"
    );

    ctx.fillStyle =
        gradient;

    ctx.fillRect(
        0,
        0,
        CANVAS_W,
        CANVAS_H
    );


    ctx.fillStyle =
        "rgba(255,255,255,.035)";

    for (
        let x = 0;
        x < CANVAS_W;
        x += 110
    ) {

        ctx.fillRect(
            x,
            420 + (x % 3) * 18,
            55,
            3
        );
    }


    ctx.fillStyle =
        "#3e3e3e";

    ctx.fillRect(
        0,
        GROUND_Y,
        CANVAS_W,
        CANVAS_H - GROUND_Y
    );


    ctx.fillStyle =
        "rgba(255,255,255,.08)";

    ctx.fillRect(
        0,
        GROUND_Y,
        CANVAS_W,
        4
    );


    ctx.fillStyle =
        "rgba(0,0,0,.28)";

    for (
        let x = 40;
        x < CANVAS_W;
        x += 95
    ) {

        ctx.beginPath();

        ctx.ellipse(
            x,
            GROUND_Y +
            80 +
            (x % 4) * 12,
            18,
            4,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }
}


function drawBase(
    x,
    side
) {

    ctx.save();

    ctx.translate(
        x,
        GROUND_Y + 4
    );


    ctx.fillStyle =
        "rgba(0,0,0,.35)";

    ctx.beginPath();

    ctx.ellipse(
        0,
        30,
        115,
        18,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();


    if (side === "enemy") {

        ctx.fillStyle =
            "#725d35";

        ctx.strokeStyle =
            "#30281a";

        ctx.lineWidth =
            8;

        roundedRectPath(
            -75,
            -180,
            150,
            210,
            18
        );

        ctx.fill();

        ctx.stroke();


        ctx.fillStyle =
            "#a88a4e";

        ctx.beginPath();

        ctx.moveTo(
            -65,
            -180
        );

        ctx.lineTo(
            0,
            -225
        );

        ctx.lineTo(
            65,
            -180
        );

        ctx.closePath();

        ctx.fill();

        ctx.stroke();


        ctx.fillStyle =
            "#1d1d1d";

        ctx.beginPath();

        ctx.arc(
            0,
            -120,
            42,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.font =
            "52px sans-serif";

        ctx.textAlign =
            "center";

        ctx.textBaseline =
            "middle";

        ctx.fillText(
            "👾",
            0,
            -120
        );

    } else {

        ctx.fillStyle =
            "#f7f7f7";

        ctx.strokeStyle =
            "#252525";

        ctx.lineWidth =
            8;

        roundedRectPath(
            -78,
            -190,
            156,
            220,
            12
        );

        ctx.fill();

        ctx.stroke();


        ctx.fillStyle =
            "#bfe7ef";

        for (
            let y = -155;
            y < 25;
            y += 34
        ) {

            ctx.fillRect(
                -72,
                y,
                144,
                15
            );
        }


        ctx.font =
            "58px sans-serif";

        ctx.textAlign =
            "center";

        ctx.textBaseline =
            "middle";

        ctx.fillText(
            "🐱",
            0,
            -215
        );
    }


    ctx.fillStyle =
        "#777";

    ctx.strokeStyle =
        "#202020";

    ctx.lineWidth =
        10;


    if (side === "enemy") {

        roundedRectPath(
            0,
            -125,
            112,
            44,
            22
        );

    } else {

        roundedRectPath(
            -112,
            -125,
            112,
            44,
            22
        );
    }

    ctx.fill();

    ctx.stroke();

    ctx.restore();
}


function drawUnit(unit) {

    const data =
        unit.side === "me"
            ? UNIT_TYPES[unit.type]
            : ENEMY_TYPES[unit.type];

    const image =
        imageCache[data.icon];

    const size =
        unit.radius *
        2.45;


    ctx.save();


    ctx.globalAlpha =
        .28;

    ctx.fillStyle =
        "#000";

    ctx.beginPath();

    ctx.ellipse(
        unit.x,
        unit.y +
        unit.radius * .72,
        unit.radius * 1.2,
        9,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.globalAlpha =
        1;


    if (unit.hitFlash > 0) {

        ctx.globalAlpha =
            .45;

        ctx.fillStyle =
            "#fff";

        ctx.beginPath();

        ctx.arc(
            unit.x,
            unit.y,
            unit.radius * 1.05,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.globalAlpha =
            1;
    }


    const direction =
        unit.side === "me"
            ? -1
            : 1;

    const lunge =
        unit.attackAnim > 0
            ? Math.sin(
                (unit.attackAnim / .22) *
                Math.PI
            ) * 10
            : 0;


    ctx.translate(
        unit.x +
        direction * lunge,
        unit.y
    );


    if (unit.side === "me") {

        ctx.scale(
            -1,
            1
        );
    }


    if (
        image &&
        image.complete &&
        image.naturalWidth
    ) {

        ctx.drawImage(
            image,
            -size / 2,
            -size / 2,
            size,
            size
        );

    } else {

        ctx.fillStyle =
            unit.side === "me"
                ? "#fff"
                : "#a58bb2";

        ctx.beginPath();

        ctx.arc(
            0,
            0,
            unit.radius,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }


    ctx.restore();


    const width =
        unit.radius *
        2.1;

    const percentage =
        clamp(
            unit.hp /
            unit.maxHp,
            0,
            1
        );


    ctx.fillStyle =
        "rgba(0,0,0,.7)";

    ctx.fillRect(
        unit.x -
        width / 2,
        unit.y -
        unit.radius -
        16,
        width,
        7
    );


    ctx.fillStyle =
        unit.side === "me"
            ? "#69e06b"
            : "#ff6258";

    ctx.fillRect(
        unit.x -
        width / 2,
        unit.y -
        unit.radius -
        16,
        width *
        percentage,
        7
    );
}


function drawParticles() {

    if (!battleState) {
        return;
    }

    for (
        const particle
        of battleState.particles
    ) {

        ctx.globalAlpha =
            clamp(
                particle.life /
                particle.maxLife,
                0,
                1
            );

        ctx.fillStyle =
            particle.color;

        ctx.fillRect(
            particle.x,
            particle.y,
            particle.size,
            particle.size
        );
    }

    ctx.globalAlpha =
        1;
}


function draw() {

    ctx.clearRect(
        0,
        0,
        CANVAS_W,
        CANVAS_H
    );

    drawBackground();


    drawBase(
        LEFT_BASE_X,
        "enemy"
    );

    drawBase(
        RIGHT_BASE_X,
        "me"
    );


    if (!battleState) {
        return;
    }


    battleState.myUnits.forEach(
        drawUnit
    );

    battleState.enemyUnits.forEach(
        drawUnit
    );

    drawParticles();


    ctx.strokeStyle =
        "rgba(255,255,255,.035)";

    ctx.lineWidth =
        2;

    ctx.beginPath();

    ctx.moveTo(
        LEFT_BASE_X +
        BASE_ATTACK_RANGE,
        GROUND_Y - 90
    );

    ctx.lineTo(
        LEFT_BASE_X +
        BASE_ATTACK_RANGE,
        GROUND_Y + 20
    );

    ctx.moveTo(
        RIGHT_BASE_X -
        BASE_ATTACK_RANGE,
        GROUND_Y - 90
    );

    ctx.lineTo(
        RIGHT_BASE_X -
        BASE_ATTACK_RANGE,
        GROUND_Y + 20
    );

    ctx.stroke();
}


pauseBtn.addEventListener(
    "click",
    () => {

        if (
            !battleState ||
            !battleState.running
        ) {
            return;
        }

        battleState.paused =
            !battleState.paused;

        pausePanel.classList.toggle(
            "hidden",
            !battleState.paused
        );
    }
);


pauseResume.addEventListener(
    "click",
    () => {

        if (!battleState) {
            return;
        }

        battleState.paused =
            false;

        pausePanel.classList.add(
            "hidden"
        );
    }
);


function goBackToMap() {

    if (rafId) {
        cancelAnimationFrame(
            rafId
        );
    }

    rafId = null;

    battleState = null;

    pausePanel.classList.add(
        "hidden"
    );

    battleScreen.classList.add(
        "hidden"
    );

    mapScreen.classList.remove(
        "hidden"
    );

    renderMapNodes();
}


pauseExit.addEventListener(
    "click",
    goBackToMap
);


battleBackBtn.addEventListener(
    "click",
    goBackToMap
);


function openMenu(
    title,
    contentHtml
) {

    menuTitle.textContent =
        title;

    menuContent.innerHTML =
        contentHtml;

    menuOverlay.classList.remove(
        "hidden"
    );
}


function closeMenu() {

    menuOverlay.classList.add(
        "hidden"
    );
}


function unitCardsHtml() {

    return Object.entries(
        UNIT_TYPES
    ).map(
        ([id, unit]) => `

        <div class="book-card">

            <img
                src="${unit.cardIcon}"
                alt="${unit.cost}"
            >

            <div>
                ${unit.cost} 元
            </div>

            <div style="
                font-size:12px;
                font-weight:400;
                margin-top:6px;
            ">
                HP ${unit.hp}
               　
                攻擊 ${unit.damage}
            </div>

        </div>

        `
    ).join("");
}


myBookBtn.addEventListener(
    "click",
    () =>
        openMenu(
            "我方圖鑑",
            unitCardsHtml()
        )
);


enemyBookBtn.addEventListener(
    "click",
    () =>
        openMenu(
            "敵人圖鑑",
            `

            <div class="book-card">

                <img
                    src="${ENEMY_TYPES.enemy1.icon}"
                    alt="敵人1"
                >

                <div>
                    敵人 1
                </div>

                <div style="
                    font-size:12px;
                    font-weight:400;
                    margin-top:6px;
                ">
                    HP ${ENEMY_TYPES.enemy1.hp}
                   　
                    攻擊 ${ENEMY_TYPES.enemy1.damage}
                </div>

            </div>


            <div class="book-card">

                <img
                    src="${ENEMY_TYPES.enemy2.icon}"
                    alt="敵人2"
                >

                <div>
                    敵人 2
                </div>

                <div style="
                    font-size:12px;
                    font-weight:400;
                    margin-top:6px;
                ">
                    HP ${ENEMY_TYPES.enemy2.hp}
                   　
                    攻擊 ${ENEMY_TYPES.enemy2.damage}
                </div>

            </div>

            `
        )
);


formationBtn.addEventListener(
    "click",
    () =>
        openMenu(
            "編隊",
            `

            <div
                class="book-card"
                style="grid-column:1/-1"
            >
                目前五個角色會依照卡槽出戰。
            </div>

            `
        )
);


menuClose.addEventListener(
    "click",
    closeMenu
);


menuOverlay.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            menuOverlay
        ) {
            closeMenu();
        }

    }
);


renderMapNodes();


window.addEventListener(
    "resize",
    () => {

        if (
            !mapScreen.classList.contains(
                "hidden"
            )
        ) {

            movePlayerCatTo(
                stageNodes[
                    selectedStage
                ]
            );
        }

    }
);

})();
