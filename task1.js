const HERO_MAX_HP = 100;
const ENEMY_MAX_HP = 100;
const HERO_ATTACK_MIN = 8;
const HERO_ATTACK_MAX = 15;
const ENEMY_ATTACK_MIN = 5;
const ENEMY_ATTACK_MAX = 14;
const HEAL_AMOUNT = 20;
const MAX_HEALS = 3;
const CRIT_CHANCE = 0.10;
const CRIT_MULTIPLIER = 1.5;
const MAX_LOG_ENTRIES = 5;

let heroHp = HERO_MAX_HP;
let enemyHp = ENEMY_MAX_HP;
let healsRemaining = MAX_HEALS;
let isHeroDefending = false;
let isGameOver = false;
let combatLog = [];

const heroHpFill = document.getElementById("hero-hp-fill");
const heroHpText = document.getElementById("hero-hp-text");
const heroPanel = document.getElementById("hero-panel");
const heroRoleBadge = document.getElementById("hero-status");

const enemyHpFill = document.getElementById("enemy-hp-fill");
const enemyHpText = document.getElementById("enemy-hp-text");
const enemyPanel = document.getElementById("enemy-panel");
const enemyRoleBadge = document.getElementById("enemy-status");

const btnAttack = document.getElementById("btn-attack");
const btnDefend = document.getElementById("btn-defend");
const btnHeal = document.getElementById("btn-heal");
const btnRestart = document.getElementById("btn-restart");

const battleBanner = document.getElementById("battle-banner");
const battleLogList = document.getElementById("battle-log-list");

function getRandomIntInclusive(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addLogEntry(message, type = "normal") {
  combatLog.push({ message, type });
  if (combatLog.length > MAX_LOG_ENTRIES) {
    combatLog.shift();
  }
}

function renderGameState() {
  if (!heroHpFill || !enemyHpFill) return;

  const heroPct = Math.max(0, (heroHp / HERO_MAX_HP) * 100);
  heroHpFill.style.width = heroPct + "%";
  heroHpText.textContent = `${heroHp} / ${HERO_MAX_HP} HP`;

  heroHpFill.classList.remove("warning-level", "danger-level");
  if (heroHp <= HERO_MAX_HP * 0.25) {
    heroHpFill.classList.add("danger-level");
  } else if (heroHp <= HERO_MAX_HP * 0.5) {
    heroHpFill.classList.add("warning-level");
  }

  const enemyPct = Math.max(0, (enemyHp / ENEMY_MAX_HP) * 100);
  enemyHpFill.style.width = enemyPct + "%";
  enemyHpText.textContent = `${enemyHp} / ${ENEMY_MAX_HP} HP`;

  enemyHpFill.classList.remove("warning-level", "danger-level");
  if (enemyHp <= ENEMY_MAX_HP * 0.25) {
    enemyHpFill.classList.add("danger-level");
  } else if (enemyHp <= ENEMY_MAX_HP * 0.5) {
    enemyHpFill.classList.add("warning-level");
  }

  if (isHeroDefending === true && isGameOver === false) {
    heroPanel.classList.add("defending-stance");
    heroRoleBadge.textContent = "Defending (-50%)";
  } else {
    heroPanel.classList.remove("defending-stance");
    heroRoleBadge.textContent = isGameOver ? (heroHp === 0 ? "Down" : "Victory") : "Active";
  }

  enemyRoleBadge.textContent = isGameOver ? (enemyHp === 0 ? "Destroyed" : "Active") : "Hostile";
  btnHeal.textContent = `🧪 Repair Shield (+${HEAL_AMOUNT} HP) [${healsRemaining}/${MAX_HEALS}]`;

  while (battleLogList.firstChild) {
    battleLogList.removeChild(battleLogList.firstChild);
  }

  for (const entry of combatLog) {
    const li = document.createElement("li");
    li.classList.add("battle-log-row");
    if (entry.type === "enemy") {
      li.classList.add("enemy-turn");
    } else if (entry.type === "crit") {
      li.classList.add("crit-hit");
    }
    li.textContent = entry.message;
    battleLogList.appendChild(li);
  }

  if (heroHp === 0 || enemyHp === 0) {
    isGameOver = true;
    btnAttack.disabled = true;
    btnDefend.disabled = true;
    btnHeal.disabled = true;

    btnRestart.classList.remove("btn-secondary-cargo");
    btnRestart.classList.add("btn-primary-cargo");

    battleBanner.classList.add("active");
    battleBanner.classList.remove("info-state", "win-state", "loss-state");

    if (enemyHp === 0 && heroHp > 0) {
      battleBanner.classList.add("win-state");
      battleBanner.textContent = "🏆 Route Secured! You neutralized the Cyber Hijacker!";
    } else if (heroHp === 0 && enemyHp > 0) {
      battleBanner.classList.add("loss-state");
      battleBanner.textContent = "💥 Mission Failed! Cargo Drone disabled by the enemy.";
    } else {
      battleBanner.classList.add("loss-state");
      battleBanner.textContent = "⚠️ Mutual Neutralization! Both drones were disabled.";
    }
  } else {
    btnAttack.disabled = false;
    btnDefend.disabled = false;
    btnHeal.disabled = healsRemaining <= 0;
  }
}

function showInvalidMoveAlert(msg) {
  battleBanner.className = "battle-banner-alert active info-state";
  battleBanner.textContent = msg;
}

function handleHeroAttack() {
  if (isGameOver === true || heroHp === 0) {
    showInvalidMoveAlert("The duel is finished. Click 'Restart Mission' to begin anew.");
    return;
  }

  battleBanner.className = "battle-banner-alert";

  let baseDamage = getRandomIntInclusive(HERO_ATTACK_MIN, HERO_ATTACK_MAX);
  const isCrit = Math.random() < CRIT_CHANCE;
  let finalDamage = baseDamage;
  let critText = "";

  if (isCrit === true) {
    finalDamage = Math.round(baseDamage * CRIT_MULTIPLIER);
    critText = " [CRITICAL OVERCHARGE!]";
  }

  enemyHp = Math.max(0, enemyHp - finalDamage);
  addLogEntry(`Cargo Guardian fires for ${finalDamage} damage!${critText}`, isCrit ? "crit" : "hero");

  if (enemyHp > 0) {
    resolveEnemyTurn();
  } else {
    isHeroDefending = false;
    renderGameState();
  }
}

function handleHeroDefend() {
  if (isGameOver === true || heroHp === 0) {
    showInvalidMoveAlert("The duel is finished. Click 'Restart Mission' to begin anew.");
    return;
  }

  battleBanner.className = "battle-banner-alert";
  isHeroDefending = true;
  addLogEntry("Cargo Guardian deploys energy barrier! Next incoming hit is halved.", "hero");

  resolveEnemyTurn();
}

function handleHeroHeal() {
  if (isGameOver === true) {
    showInvalidMoveAlert("Duel is already concluded. Click 'Restart Mission'.");
    return;
  }

  if (healsRemaining <= 0 && isGameOver === false) {
    showInvalidMoveAlert("No repair charges remaining! You must Attack or Defend.");
    return;
  }

  if (heroHp === HERO_MAX_HP && healsRemaining > 0) {
    showInvalidMoveAlert("Cargo Guardian is already at maximum HP (100)!");
    return;
  }

  battleBanner.className = "battle-banner-alert";
  const actualHeal = Math.min(HEAL_AMOUNT, HERO_MAX_HP - heroHp);
  heroHp += actualHeal;
  healsRemaining -= 1;
  addLogEntry(`Cargo Guardian repairs +${actualHeal} HP! (${healsRemaining} charge(s) left)`, "hero");

  resolveEnemyTurn();
}

function resolveEnemyTurn() {
  let enemyBaseDmg = getRandomIntInclusive(ENEMY_ATTACK_MIN, ENEMY_ATTACK_MAX);
  let enemyFinalDmg = enemyBaseDmg;

  if (isHeroDefending === true && enemyBaseDmg > 0) {
    enemyFinalDmg = Math.floor(enemyBaseDmg / 2);
    heroHp = Math.max(0, heroHp - enemyFinalDmg);
    addLogEntry(`Cyber Drone hits for ${enemyBaseDmg}, but barrier absorbs half (${enemyFinalDmg} taken)!`, "enemy");
  } else if (heroHp > 0 || enemyFinalDmg > 0) {
    heroHp = Math.max(0, heroHp - enemyFinalDmg);
    addLogEntry(`Cyber Drone strikes Cargo Guardian for ${enemyFinalDmg} damage!`, "enemy");
  }

  isHeroDefending = false;
  renderGameState();
}

function handleRestartMission() {
  heroHp = HERO_MAX_HP;
  enemyHp = ENEMY_MAX_HP;
  healsRemaining = MAX_HEALS;
  isHeroDefending = false;
  isGameOver = false;
  combatLog = [];

  battleBanner.className = "battle-banner-alert";
  battleBanner.textContent = "";

  btnRestart.classList.remove("btn-primary-cargo");
  btnRestart.classList.add("btn-secondary-cargo");

  addLogEntry("New security duel initialized! Cargo Guardian stands ready.", "normal");
  renderGameState();
}

function initTask1() {
  if (!btnAttack || !btnDefend || !btnHeal || !btnRestart) return;

  btnAttack.addEventListener("click", handleHeroAttack);
  btnDefend.addEventListener("click", handleHeroDefend);
  btnHeal.addEventListener("click", handleHeroHeal);
  btnRestart.addEventListener("click", handleRestartMission);

  addLogEntry("Security protocol online! Defeat the Cyber Hijacker before your HP hits 0.", "normal");
  renderGameState();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initTask1);
} else {
  initTask1();
}
