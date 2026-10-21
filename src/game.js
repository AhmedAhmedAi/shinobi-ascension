/* ============================================================
   SHINOBI ASCENSION — vertical slice
   Vanilla Canvas 2D. Original IP. No dependencies.
   ============================================================ */

import {
  SAVE_VERSION, WORLD, xpForLevel, attrCost, MAX_ATTR_RANK, MAX_SKILL_RANK,
  HEROES, SKILLS, ATTRIBUTES, ENEMIES, ZONES, THEMES,
  heroById, zoneById, skillById,
} from './data.js';
import { sdk } from './sdk.js';
import { audio } from './audio.js';

const $ = (id) => document.getElementById(id);
const TAU = Math.PI * 2;
const DPR = Math.min(2, window.devicePixelRatio || 1);

const canvas = $('game');
const ctx = canvas.getContext('2d', { alpha: false });

let view = { w: window.innerWidth, h: window.innerHeight };
let state = defaultState();
let scene = 'title';
let run = null;
let paused = false;
let selectedZone = 'forest';
let activeTab = 'map';
let lastTime = 0;
let keys = new Set();
let camera = { x: 0, y: 0 };
let shake = 0;
let flash = 0;
let sfxOn = true;
let saveTimer = 0;
let bannerTimer = 0;
let levelTimer = 0;
let frameCount = 0;

const bgCache = new Map();
const hudCache = new Map();
const joystick = { x: 0, y: 0, active: false, id: null };

/* ============================================================
   STATE
   ============================================================ */

function defaultState() {
  return {
    version: SAVE_VERSION,
    hero: 'kaito',
    level: 1,
    xp: 0,
    coins: 0,
    skillPoints: 0,
    attributes: { power: 0, vitality: 0, agility: 0, focus: 0 },
    skillRanks: { dash: 1 },
    evolution: null,
    zoneClears: {},
    stats: { kills: 0, runs: 0, bestCombo: 0, totalCoins: 0, bestRank: {} },
  };
}

function normalize(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  const out = defaultState();

  out.hero = 'kaito';
  out.level = clamp(Math.floor(Number(s.level) || 1), 1, 60);
  out.xp = Math.max(0, Math.floor(Number(s.xp) || 0));
  out.coins = Math.max(0, Math.floor(Number(s.coins) || 0));
  out.skillPoints = Math.max(0, Math.floor(Number(s.skillPoints) || 0));

  for (const a of ATTRIBUTES) {
    out.attributes[a.id] = clamp(Math.floor(Number(s.attributes?.[a.id]) || 0), 0, MAX_ATTR_RANK);
  }

  for (const sk of SKILLS) {
    const rank = Math.floor(Number(s.skillRanks?.[sk.id]) || 0);
    if (rank > 0) out.skillRanks[sk.id] = clamp(rank, 1, MAX_SKILL_RANK);
  }

  for (const z of ZONES) {
    out.zoneClears[z.id] = Math.max(0, Math.floor(Number(s.zoneClears?.[z.id]) || 0));
  }

  const evo = HEROES[0].evolutions.find((e) => e.id === s.evolution);
  out.evolution = evo ? evo.id : null;

  out.stats = {
    kills: Math.max(0, Math.floor(Number(s.stats?.kills) || 0)),
    runs: Math.max(0, Math.floor(Number(s.stats?.runs) || 0)),
    bestCombo: Math.max(0, Math.floor(Number(s.stats?.bestCombo) || 0)),
    totalCoins: Math.max(0, Math.floor(Number(s.stats?.totalCoins) || 0)),
    bestRank: {},
  };
  for (const z of ZONES) {
    const r = s.stats?.bestRank?.[z.id];
    if (r === 'S' || r === 'A' || r === 'B' || r === 'C') out.stats.bestRank[z.id] = r;
  }

  ensureUnlockedSkills(out, false);
  return out;
}

function ensureUnlockedSkills(s, announce) {
  for (const sk of SKILLS) {
    if (sk.hero !== 'kaito') continue;
    if (s.level >= sk.unlock && !(s.skillRanks[sk.id] > 0)) {
      s.skillRanks[sk.id] = 1;
      if (announce) {
        toast(`New technique: <b>${sk.name}</b>`, '', sk.icon);
        audio.unlock();
        if (run && run.player) ring(run.player.x, run.player.y, '#39d7ff', 70);
      }
    }
  }
}

function getEvolution() {
  return HEROES[0].evolutions.find((e) => e.id === state.evolution) || null;
}

function getStats() {
  const a = state.attributes;
  const lvl = state.level;
  const evo = getEvolution();

  let maxHp = 120 + (lvl - 1) * 6 + a.vitality * 14;
  let damage = 12 + (lvl - 1) * 1.2 + a.power * 3;
  let speed = 220 + a.agility * 7;
  let crit = 0.05 + a.focus * 0.008 + (lvl >= 8 ? 0.1 : 0);
  const energyMax = 100 + a.focus * 4;
  let energyMult = 1;
  let dashMult = 1;

  if (evo) {
    const b = evo.buffs;
    if (b.damageMult) damage *= b.damageMult;
    if (b.critBonus) crit += b.critBonus;
    if (b.speedMult) speed *= b.speedMult;
    if (b.dashCdMult) dashMult = b.dashCdMult;
    if (b.energyMult) energyMult = b.energyMult;
  }

  return {
    maxHp,
    damage,
    speed,
    crit: Math.min(0.75, crit),
    energyMax,
    energyRegen: 12,
    energyMult,
    dashMult,
    evo,
  };
}

function skillRank(id) {
  return state.skillRanks[id] || 0;
}

function skillPower(id) {
  return 1 + 0.2 * (Math.max(1, skillRank(id)) - 1);
}

function skillCooldown(sk) {
  const rank = Math.max(1, skillRank(sk.id));
  const st = getStats();
  let cd = sk.cd * (1 - 0.06 * (rank - 1));
  if (sk.id === 'dash') cd *= st.dashMult;
  return Math.max(0.2, cd);
}

function skillCost(sk) {
  return sk.energy * getStats().energyMult;
}

/* ============================================================
   UTILITIES
   ============================================================ */

function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function rand(a, b) { return a + Math.random() * (b - a); }
function dist2(a, b) { const dx = a.x - b.x; const dy = a.y - b.y; return dx * dx + dy * dy; }
function fmt(n) {
  const v = Math.round(n);
  if (v >= 1000000) return (v / 1000000).toFixed(1).replace('.0', '') + 'M';
  if (v >= 10000) return (v / 1000).toFixed(1).replace('.0', '') + 'k';
  return v.toLocaleString('en-US');
}
function setText(id, value) {
  const el = $(id);
  if (!el) return;
  if (hudCache.get(id) === value) return;
  hudCache.set(id, value);
  el.textContent = value;
}
function setWidth(id, pct) {
  const el = $(id);
  if (el) el.style.width = `${clamp(pct, 0, 100)}%`;
}

function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ============================================================
   SCREENS / TOASTS
   ============================================================ */

function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => {
    s.classList.toggle('active', s.id === id);
  });
}

function setHudVisible(visible) {
  const hud = $('hud');
  hud.classList.toggle('hidden', !visible);
  hud.setAttribute('aria-hidden', String(!visible));
  if (visible) updateTouchUI();
}

function toast(html, kind = '', icon = '') {
  const box = $('toasts');
  while (box.children.length >= 3) box.firstElementChild.remove();
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.innerHTML = `<span class="t-icon">${icon}</span><span class="t-text">${html}</span>`;
  box.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 340);
  }, 2600);
}

function showBanner(text) {
  const el = $('wave-banner');
  el.textContent = text;
  el.classList.remove('hidden');
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => el.classList.add('hidden'), 1350);
}

function showLevelBanner(level) {
  const el = $('level-banner');
  el.innerHTML = `<span>LEVEL UP</span><b>${level}</b>`;
  el.classList.remove('hidden');
  clearTimeout(levelTimer);
  levelTimer = setTimeout(() => el.classList.add('hidden'), 1800);
}

function updateTouchUI() {
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  $('joystick').classList.toggle('hidden', !coarse);
}

/* ============================================================
   SAVE
   ============================================================ */

function saveSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 300);
}

async function saveNow() {
  const ok = await sdk.save(JSON.stringify(state));
  const el = $('save-state');
  if (el) el.textContent = ok ? 'Progress saved' : 'Save unavailable';
  return ok;
}

/* ============================================================
   PROGRESSION
   ============================================================ */

function gainXp(amount) {
  if (!Number.isFinite(amount) || amount <= 0) return;
  state.xp += Math.round(amount);
  let gained = 0;
  while (state.level < 60 && state.xp >= xpForLevel(state.level)) {
    state.xp -= xpForLevel(state.level);
    state.level++;
    state.skillPoints++;
    gained++;
    onLevelUp();
  }
  if (state.level >= 60) state.xp = 0;
  if (gained) saveSoon();
}

function onLevelUp() {
  const lvl = state.level;
  audio.levelUp();
  ensureUnlockedSkills(state, true);

  if (lvl === 8) toast('Passive unlocked: <b>Static Charge</b>', '', '✦');
  if (lvl === 10) toast('Evolution available in the <b>Evolve</b> tab.', 'gold', '✦');

  const zone = ZONES.find((z) => z.unlock === lvl);
  if (zone) toast(`New area open: <b>${zone.name}</b>`, 'green', '🗺️');

  if (scene === 'run' && run && run.player) {
    const st = getStats();
    run.player.maxHp = st.maxHp;
    run.player.maxEnergy = st.energyMax;
    run.player.hp = Math.min(st.maxHp, run.player.hp + st.maxHp * 0.2);
    run.player.energy = st.energyMax;
    ring(run.player.x, run.player.y, '#ffd166', 70);
    showLevelBanner(lvl);
  }

  if (scene === 'dojo') renderDojo();
}

/* ============================================================
   DOJO
   ============================================================ */

function openDojo(tab) {
  scene = 'dojo';
  document.body.dataset.scene = 'dojo';
  run = null;
  paused = false;
  shake = 0;
  flash = 0;
  hidePause();
  $('pause-overlay').classList.add('hidden');
  $('evolve-overlay').classList.add('hidden');
  $('help-overlay').classList.add('hidden');
  setHudVisible(false);
  if (tab) activeTab = tab;
  if (!ZONES.some((z) => z.id === selectedZone)) selectedZone = 'forest';
  showScreen('screen-dojo');
  renderDojo();
  if (state.level === 1 && state.stats.runs === 0) {
    toast('Clear the <b>Bamboo Forest</b> to begin your legend.', '', '🌿');
  }
}

function renderDojo() {
  if (scene !== 'dojo') return;
  renderDojoHeader();

  document.querySelectorAll('.tab').forEach((t) => {
    const on = t.dataset.tab === activeTab;
    t.classList.toggle('active', on);
    t.setAttribute('aria-selected', String(on));
  });
  document.querySelectorAll('.tab-panel').forEach((p) => {
    p.classList.toggle('active', p.dataset.panel === activeTab);
  });

  if (activeTab === 'map') renderMap();
  else if (activeTab === 'skills') renderSkills();
  else if (activeTab === 'shop') renderShop();
  else if (activeTab === 'evolve') renderEvolve();
}

function renderDojoHeader() {
  setText('dojo-level', String(state.level));
  setText('dojo-coins', fmt(state.coins));
  const need = xpForLevel(state.level);
  setWidth('dojo-xp', (state.xp / need) * 100);
  setText('dojo-xp-text', `${Math.floor(state.xp)} / ${need} XP`);

  const sp = state.skillPoints;
  const sb = $('badge-skills');
  sb.classList.toggle('hidden', sp <= 0);
  if (sp > 0) sb.textContent = String(sp);

  const eb = $('badge-evolve');
  eb.classList.toggle('hidden', !(state.level >= 10 && !state.evolution));
}

function renderMap() {
  const nodes = ZONES.map((z) => {
    const open = state.level >= z.unlock;
    const clears = state.zoneClears[z.id] || 0;
    const cls = [
      'map-node',
      open ? '' : 'locked',
      clears ? 'cleared' : '',
      selectedZone === z.id ? 'selected' : '',
    ].join(' ');
    const sub = !open ? `LV ${z.unlock}` : clears ? `CLEARED ×${clears}` : 'OPEN';
    return `
      <button class="${cls}" style="left:${z.map.x}%;top:${z.map.y}%" data-zone="${z.id}" aria-label="${z.name}${open ? '' : `, locked until level ${z.unlock}`}">
        <span class="node-icon">${z.icon}</span>
        <span class="node-label">${z.name}</span>
        <span class="node-sub">${sub}</span>
      </button>`;
  }).join('');

  $('map-nodes').innerHTML = nodes;
  renderMapDetail();
}

function renderMapDetail() {
  const z = zoneById(selectedZone);
  const idx = ZONES.findIndex((x) => x.id === z.id);
  const open = state.level >= z.unlock;
  const clears = state.zoneClears[z.id] || 0;
  const rank = state.stats.bestRank[z.id] || '—';
  const boss = ENEMIES[z.boss];

  const tags = z.tags.map((t) => `<span>${t}</span>`).join('');
  const rows = `
    <div class="detail-rows">
      <div><span>Recommended</span><b>Lv. ${z.unlock}</b></div>
      <div><span>Boss</span><b>${boss.name}</b></div>
      <div><span>Clears</span><b>${clears}</b></div>
      <div><span>Best rank</span><b>${rank}</b></div>
      <div><span>Clear reward</span><b class="gold">◈ ${z.clear.coins} · ${z.clear.xp} XP</b></div>
    </div>`;

  const action = open
    ? `<button class="primary detail-enter" data-enter="${z.id}">Enter ${z.name}</button>`
    : `<div class="detail-lock">Reach level <b>${z.unlock}</b> to open this area.<br>You are level ${state.level}.</div>`;

  $('map-detail').innerHTML = `
    <p class="detail-kicker">ZONE 0${idx + 1} · ${open ? 'OPEN' : 'LOCKED'}</p>
    <h3>${z.name}</h3>
    <p class="detail-desc">${z.desc}</p>
    <div class="detail-tags">${tags}</div>
    ${rows}
    ${action}`;
}

function renderSkills() {
  setText('skill-points', String(state.skillPoints));

  const cards = SKILLS.filter((s) => s.hero === 'kaito').map((sk) => {
    const unlocked = state.level >= sk.unlock;
    const rank = skillRank(sk.id);
    const maxed = rank >= MAX_SKILL_RANK;
    const pips = Array.from({ length: MAX_SKILL_RANK }, (_, i) =>
      `<i class="${i < rank ? 'on' : ''}"></i>`).join('');

    let button;
    if (!unlocked) button = `<button class="upgrade" disabled>UNLOCKS AT LV. ${sk.unlock}</button>`;
    else if (maxed) button = `<button class="upgrade" disabled>MAX RANK</button>`;
    else if (state.skillPoints < 1) button = `<button class="upgrade" disabled>NEED SKILL POINT</button>`;
    else button = `<button class="upgrade" data-upgrade="${sk.id}">UPGRADE · 1 SP</button>`;

    return `
      <article class="skill-card ${unlocked ? 'unlocked' : 'locked'}">
        <div class="skill-icon">${sk.icon}</div>
        <div>
          <div class="skill-head">
            <h3>${sk.name}</h3>
            <span class="skill-rank">${unlocked ? `RANK ${rank}` : `LV. ${sk.unlock}`}</span>
          </div>
          <p class="skill-desc">${sk.desc}</p>
          <p class="skill-lock">${unlocked ? sk.rankNote : `Unlocks at level ${sk.unlock}`}</p>
          <div class="pips">${pips}</div>
        </div>
        ${button}
      </article>`;
  }).join('');

  const passive = HEROES[0].passive;
  const pUnlocked = state.level >= passive.unlock;
  const passiveCard = `
    <article class="skill-card passive ${pUnlocked ? 'unlocked' : 'locked'}">
      <div class="skill-icon">${passive.icon}</div>
      <div>
        <div class="skill-head">
          <h3>${passive.name}</h3>
          <span class="skill-rank">PASSIVE</span>
        </div>
        <p class="skill-desc">${passive.desc}</p>
        <p class="skill-lock">${pUnlocked ? 'ACTIVE' : `UNLOCKS AT LV. ${passive.unlock}`}</p>
      </div>
    </article>`;

  $('skills-grid').innerHTML = cards + passiveCard;

  const evo = getEvolution();
  if (evo) {
    $('skills-grid').insertAdjacentHTML('beforeend', `
      <article class="skill-card unlocked" style="grid-column:1/-1">
        <div class="skill-icon">${evo.icon}</div>
        <div>
          <div class="skill-head"><h3>${evo.name}</h3><span class="skill-rank">EVOLUTION</span></div>
          <p class="skill-desc">${evo.desc}</p>
          <div class="detail-tags">${evo.perks.map((p) => `<span>${p}</span>`).join('')}</div>
        </div>
      </article>`);
  }
}

function renderShop() {
  setText('shop-coins', fmt(state.coins));

  const rows = ATTRIBUTES.map((a) => {
    const rank = state.attributes[a.id] || 0;
    const maxed = rank >= MAX_ATTR_RANK;
    const cost = attrCost(rank);
    const current = rank === 0 ? 'No bonus yet' : a.effect(rank);
    const next = maxed ? '' : ` → <em>${a.next(rank)}</em>`;
    const button = maxed
      ? `<button class="buy max" disabled>MAXED</button>`
      : `<button class="buy" data-buy="${a.id}" ${state.coins < cost ? 'disabled' : ''}><span class="coin-glyph">◈</span> ${fmt(cost)}</button>`;

    return `
      <div class="shop-row">
        <div class="shop-icon">${a.icon}</div>
        <div class="shop-info">
          <h3>${a.name} <span>RANK ${rank}</span></h3>
          <p>${current}${next}</p>
        </div>
        ${button}
      </div>`;
  }).join('');

  $('shop-list').innerHTML = rows;
}

function renderEvolve() {
  const evos = HEROES[0].evolutions;
  const current = getEvolution();

  if (state.level < 10) {
    const pct = (state.level / 10) * 100;
    $('evolve-panel').innerHTML = `
      <div class="evo-locked">
        <div class="lock-big">✦</div>
        <h3>The storm is not ready</h3>
        <p>Reach level 10 to choose your path.<br>You are level <b>${state.level}</b>.</p>
        <div class="evo-progress"><i style="width:${pct}%"></i></div>
      </div>`;
    return;
  }

  if (current) {
    $('evolve-panel').innerHTML = `
      <div class="evo-current">
        <div class="detail-kicker">PATH CHOSEN</div>
        <h3>${current.name}</h3>
        <p>${current.desc}</p>
        <div class="detail-tags">${current.perks.map((p) => `<span>${p}</span>`).join('')}</div>
      </div>
      <p class="save-state" style="margin-top:14px">This choice is permanent for the current journey.</p>`;
    return;
  }

  $('evolve-panel').innerHTML = `
    <div class="evolve-choices">
      ${evos.map((e, i) => `
        <article class="evo-card ${i === 1 ? 'path-b' : ''}">
          <div class="evo-icon">${e.icon}</div>
          <h3>${e.name}</h3>
          <p>${e.desc}</p>
          <ul>${e.perks.map((p) => `<li>${p}</li>`).join('')}</ul>
          <button class="primary" data-evolve-open="${e.id}">Choose ${e.name}</button>
        </article>`).join('')}
    </div>`;
}

/* ============================================================
   ACTIONS
   ============================================================ */

function upgradeSkill(id) {
  const sk = skillById(id);
  if (!sk) return;
  const rank = skillRank(id);
  if (rank <= 0 || rank >= MAX_SKILL_RANK || state.skillPoints < 1) {
    audio.error();
    return;
  }
  state.skillPoints--;
  state.skillRanks[id] = rank + 1;
  audio.unlock();
  toast(`<b>${sk.name}</b> upgraded to rank ${rank + 1}`, '', sk.icon);
  saveSoon();
  renderDojoHeader();
  renderSkills();
}

function buyAttribute(id) {
  const a = ATTRIBUTES.find((x) => x.id === id);
  if (!a) return;
  const rank = state.attributes[id] || 0;
  const cost = attrCost(rank);
  if (rank >= MAX_ATTR_RANK || state.coins < cost) {
    audio.error();
    return;
  }
  state.coins -= cost;
  state.attributes[id] = rank + 1;
  audio.coin();
  toast(`<b>${a.name}</b> rank ${rank + 1}`, 'gold', a.icon);
  saveSoon();
  renderDojoHeader();
  renderShop();
}

function openEvolveOverlay() {
  if (state.level < 10 || state.evolution) return;
  const evos = HEROES[0].evolutions;
  $('evolve-choices').innerHTML = evos.map((e, i) => `
    <article class="evo-card ${i === 1 ? 'path-b' : ''}">
      <div class="evo-icon">${e.icon}</div>
      <h3>${e.name}</h3>
      <p>${e.desc}</p>
      <ul>${e.perks.map((p) => `<li>${p}</li>`).join('')}</ul>
      <button class="primary" data-confirm-evolve="${e.id}">Confirm ${e.name}</button>
    </article>`).join('');
  $('evolve-overlay').classList.remove('hidden');
  audio.ui();
}

function chooseEvolution(id) {
  const evo = HEROES[0].evolutions.find((e) => e.id === id);
  if (!evo || state.evolution) return;
  state.evolution = id;
  $('evolve-overlay').classList.add('hidden');
  audio.unlock();
  toast(`Path chosen: <b>${evo.name}</b>`, 'gold', evo.icon);
  saveNow();
  renderDojo();
}

/* ============================================================
   RUN SETUP
   ============================================================ */

function startRun(zoneId) {
  const zone = zoneById(zoneId);
  if (state.level < zone.unlock) {
    toast(`<b>${zone.name}</b> opens at level ${zone.unlock}.`, '', '🔒');
    audio.error();
    return;
  }

  audio.init();
  hidePause();
  $('evolve-overlay').classList.add('hidden');
  $('help-overlay').classList.add('hidden');
  showScreen(null);
  setHudVisible(true);
  $('toasts').innerHTML = '';

  const st = getStats();
  const p = {
    x: WORLD.w / 2,
    y: WORLD.h / 2,
    radius: 16,
    hp: st.maxHp,
    maxHp: st.maxHp,
    energy: st.energyMax,
    maxEnergy: st.energyMax,
    facing: { x: 0, y: 1 },
    attackTimer: 0.25,
    invuln: 0,
    hitFlash: 0,
    dashTimer: 0,
    dashDir: { x: 0, y: 1 },
    dashHits: new Set(),
    cooldowns: Object.fromEntries(SKILLS.map((s) => [s.id, 0])),
    trail: [],
    trailTimer: 0,
  };

  run = {
    zone,
    player: p,
    enemies: [],
    projectiles: [],
    pickups: [],
    particles: [],
    texts: [],
    beams: [],
    slashes: [],
    pendingSpawns: [],
    ambient: makeAmbient(zone.theme),
    bg: getBackground(zone.theme),
    wave: 0,
    phase: 'wave',
    phaseTimer: 0,
    bossSpawned: false,
    boss: null,
    kills: 0,
    coins: 0,
    xp: 0,
    time: 0,
    combo: 0,
    comboTimer: 0,
    maxCombo: 0,
    damageTaken: 0,
    over: false,
    victory: false,
    endDelay: 0,
    rank: 'C',
    finalCoins: 0,
    finalXp: 0,
  };

  scene = 'run';
  document.body.dataset.scene = 'run';
  paused = false;
  lastTime = performance.now();
  shake = 0;
  flash = 0;

  $('hud-zone').textContent = zone.name;
  $('hud-wave').textContent = `WAVE 1 / ${zone.waves.length}`;
  $('boss-wrap').classList.add('hidden');
  $('wave-banner').classList.add('hidden');
  $('combo').classList.add('hidden');
  $('level-banner').classList.add('hidden');

  buildSkillBar();
  updateTouchUI();

  camera.x = camAxis(p.x, view.w, WORLD.w);
  camera.y = camAxis(p.y, view.h, WORLD.h);

  spawnWave(1);
}

function spawnWave(n) {
  if (!run) return;
  run.wave = n;
  run.phase = 'wave';
  const list = run.zone.waves[n - 1] || [];
  list.forEach((type, i) => {
    const pos = spawnPoint();
    run.pendingSpawns.push({
      x: pos.x, y: pos.y, type,
      t: 0.45 + i * 0.16,
      max: 0.45 + i * 0.16,
    });
  });
  showBanner(`WAVE ${n}`);
  audio.wave();
}

function spawnBoss() {
  if (!run) return;
  run.phase = 'boss';
  run.bossSpawned = true;
  const p = run.player;
  const x = clamp(p.x, 260, WORLD.w - 260);
  const y = clamp(p.y - 360, 220, WORLD.h - 220);
  const e = makeEnemy(run.zone.boss, x, y);
  e.atkTimer = 1.2;
  run.enemies.push(e);
  run.boss = e;

  $('boss-wrap').classList.remove('hidden');
  $('boss-name').textContent = e.def.name;
  $('boss-hp').style.width = '100%';
  showBanner('BOSS');
  audio.boss();
  shake = 10;
  ring(x, y, e.def.color, 90);
}

function spawnPoint() {
  const p = run.player;
  for (let i = 0; i < 24; i++) {
    const a = Math.random() * TAU;
    const d = rand(420, 640);
    const x = clamp(p.x + Math.cos(a) * d, 60, WORLD.w - 60);
    const y = clamp(p.y + Math.sin(a) * d, 60, WORLD.h - 60);
    if (Math.hypot(x - p.x, y - p.y) > 320) return { x, y };
  }
  return { x: clamp(p.x + 430, 60, WORLD.w - 60), y: p.y };
}

function makeEnemy(type, x, y) {
  const def = ENEMIES[type];
  const lvl = state.level;
  const clears = Math.min(5, state.zoneClears[run.zone.id] || 0);
  const tier = run.zone.tier;
  const hp = Math.round(def.hp * (1 + 0.16 * (lvl - 1)) * tier * (1 + 0.25 * clears));
  const dmg = def.dmg * (1 + 0.09 * (lvl - 1)) * tier;

  return {
    type,
    def,
    x, y,
    hp,
    maxHp: hp,
    dmg,
    radius: def.radius,
    atkTimer: rand(0.6, 1.4),
    windup: 0,
    stun: 0,
    hitFlash: 0,
    knockX: 0,
    knockY: 0,
    boss: !!def.boss,
    enraged: false,
    telegraph: null,
    dead: false,
  };
}

function makeAmbient(themeId) {
  const list = [];
  for (let i = 0; i < 54; i++) {
    const isEmber = themeId === 'volcano' || themeId === 'fortress';
    list.push({
      x: rand(0, WORLD.w),
      y: rand(0, WORLD.h),
      vx: rand(-7, 7),
      vy: isEmber ? rand(-18, -5) : rand(-5, 5),
      size: rand(1.2, 3.6),
      alpha: rand(0.12, 0.45),
      phase: rand(0, TAU),
      type: themeId === 'caverns' ? 'shard' : isEmber ? 'ember' : 'dust',
    });
  }
  return list;
}

/* ============================================================
   INPUT
   ============================================================ */

function getMoveVector() {
  let x = 0;
  let y = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
  if (joystick.active) {
    x += joystick.x;
    y += joystick.y;
  }
  const len = Math.hypot(x, y);
  if (len > 1) { x /= len; y /= len; }
  return { x, y };
}

function castSkill(id) {
  if (scene !== 'run' || !run || paused || run.over) return;
  const sk = skillById(id);
  if (!sk) return;
  if (state.level < sk.unlock) {
    toast(`<b>${sk.name}</b> unlocks at level ${sk.unlock}.`, '', '🔒');
    audio.error();
    return;
  }

  const p = run.player;
  if ((p.cooldowns[id] || 0) > 0) return;

  const cost = skillCost(sk);
  if (p.energy < cost) {
    audio.error();
    return;
  }

  if (sk.type === 'chain' && !nearestEnemy(p.x, p.y, sk.range)) {
    audio.error();
    return;
  }

  p.energy -= cost;
  p.cooldowns[id] = skillCooldown(sk);
  const st = getStats();
  const rank = Math.max(1, skillRank(id));

  if (sk.type === 'dash') {
    const input = getMoveVector();
    let dx = input.x;
    let dy = input.y;
    if (!dx && !dy) { dx = p.facing.x; dy = p.facing.y; }
    const len = Math.hypot(dx, dy) || 1;
    p.dashDir = { x: dx / len, y: dy / len };
    p.facing = p.dashDir;
    p.dashTimer = 0.18;
    p.invuln = Math.max(p.invuln, 0.38);
    p.dashHits = new Set();
    audio.dash();
    for (let i = 0; i < 6; i++) {
      addParticle({
        x: p.x, y: p.y, vx: rand(-40, 40), vy: rand(-40, 40),
        life: 0.3, max: 0.3, size: rand(2, 5), color: '#39d7ff', type: 'spark',
      });
    }
    return;
  }

  if (sk.type === 'projectile') {
    const target = nearestEnemy(p.x, p.y, 760);
    let ang;
    if (target) {
      ang = Math.atan2(target.y - p.y, target.x - p.x);
      p.facing = { x: Math.cos(ang), y: Math.sin(ang) };
    } else {
      ang = Math.atan2(p.facing.y, p.facing.x);
    }
    run.projectiles.push({
      x: p.x + Math.cos(ang) * 20,
      y: p.y + Math.sin(ang) * 20,
      vx: Math.cos(ang) * 760,
      vy: Math.sin(ang) * 760,
      radius: 8,
      dmg: st.damage * sk.mult * skillPower(id),
      from: 'player',
      color: '#7fe8ff',
      kind: 'bolt',
      life: 1.2,
      aoe: 0,
    });
    burst(p.x + Math.cos(ang) * 22, p.y + Math.sin(ang) * 22, '#7fe8ff', 6, 160, 2.4);
    audio.cast();
    return;
  }

  if (sk.type === 'chain') {
    let target = nearestEnemy(p.x, p.y, sk.range);
    if (!target) return;
    const hits = new Set();
    const points = [{ x: p.x, y: p.y }];
    let maxTargets = sk.targets + (rank >= 3 ? 1 : 0) + (rank >= 5 ? 1 : 0);
    const dmg = st.damage * sk.mult * skillPower(id);

    for (let i = 0; i < maxTargets && target; i++) {
      hits.add(target);
      points.push({ x: target.x, y: target.y });
      damageEnemy(target, dmg);
      target = nearestEnemy(target.x, target.y, 190, hits);
    }

    run.beams.push({ points, life: 0.28, max: 0.28, color: '#9ef2ff' });
    audio.chain();
    shake = Math.max(shake, 4);
    return;
  }

  if (sk.type === 'aoe') {
    const radius = sk.radius * (1 + 0.12 * (rank - 1));
    const dmg = st.damage * sk.mult * skillPower(id);
    for (const e of run.enemies) {
      if (e.dead) continue;
      if (Math.hypot(e.x - p.x, e.y - p.y) <= radius + e.radius) {
        damageEnemy(e, dmg);
        if (sk.id === 'storm') {
          const a = Math.atan2(e.y - p.y, e.x - p.x);
          const mul = e.boss ? 40 : 170;
          e.knockX += Math.cos(a) * mul;
          e.knockY += Math.sin(a) * mul;
        }
        if (sk.stun) e.stun = Math.max(e.stun, sk.stun);
      }
    }
    run.particles.push({
      type: 'ring', x: p.x, y: p.y, life: 0.55, max: 0.55,
      size: radius, color: sk.id === 'ultimate' ? '#ffd166' : '#8be9ff',
    });
    if (sk.id === 'ultimate') {
      flash = Math.max(flash, 0.35);
      shake = Math.max(shake, 16);
      audio.ultimate();
    } else {
      shake = Math.max(shake, 8);
      audio.storm();
    }
    return;
  }
}

/* ============================================================
   COMBAT
   ============================================================ */

function nearestEnemy(x, y, range, exclude) {
  let best = null;
  let bd = range * range;
  for (const e of run.enemies) {
    if (e.dead) continue;
    if (exclude && exclude.has(e)) continue;
    const dx = e.x - x;
    const dy = e.y - y;
    const d = dx * dx + dy * dy;
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

function damageEnemy(e, amount) {
  if (!e || e.dead || !run || run.over) return;
  const st = getStats();
  const crit = Math.random() < st.crit;
  let dmg = amount * rand(0.9, 1.1);
  if (crit) dmg *= 1.8;
  dmg = Math.max(1, Math.round(dmg));

  e.hp -= dmg;
  e.hitFlash = 0.12;
  run.combo++;
  run.comboTimer = 3;
  run.maxCombo = Math.max(run.maxCombo, run.combo);

  addText(e.x + rand(-8, 8), e.y - e.radius - 8, String(dmg), crit ? '#ffd166' : '#eafcff', crit);
  burst(e.x, e.y, crit ? '#ffd166' : e.def.color, crit ? 9 : 5, crit ? 200 : 130, crit ? 3 : 2);
  audio.hit(crit);

  if (e.hp <= 0) killEnemy(e);
}

function killEnemy(e) {
  if (!e || e.dead) return;
  e.dead = true;
  run.kills++;
  state.stats.kills++;

  const xp = Math.round(e.def.xp * (1 + 0.05 * (state.level - 1)) * run.zone.tier);
  const coins = Math.round(e.def.coins * (1 + 0.1 * (state.level - 1)) * run.zone.tier);
  run.xp += xp;
  run.coins += coins;
  state.coins += coins;
  state.stats.totalCoins += coins;

  addText(e.x, e.y - e.radius - 18, `+${xp} XP`, '#8be9ff');
  spawnCoinBurst(e.x, e.y, coins);
  burst(e.x, e.y, e.def.color, e.boss ? 26 : 11, e.boss ? 320 : 210, e.boss ? 4 : 3);

  if (e.boss) {
    ring(e.x, e.y, e.def.color, e.radius * 5);
    shake = 20;
    finishRun(true);
    return;
  }

  if (Math.random() < 0.09) spawnHealth(e.x, e.y);
  gainXp(xp);
}

function spawnCoinBurst(x, y, coins) {
  addText(x, y - 30, `+${coins} ◈`, '#ffc857');
  for (let i = 0; i < 5; i++) {
    addParticle({
      x, y, vx: rand(-80, 80), vy: rand(-130, -40),
      life: rand(0.35, 0.6), max: 0.6, size: rand(1.5, 3.2),
      color: '#ffc857', type: 'coin',
    });
  }
  if (run.kills % 2 === 0) audio.coin();
}

function spawnHealth(x, y) {
  run.pickups.push({
    type: 'health',
    x, y,
    value: Math.round(getStats().maxHp * 0.16),
    life: 18,
    phase: rand(0, TAU),
    dead: false,
  });
}

function damagePlayer(amount) {
  if (!run || run.over) return;
  const p = run.player;
  if (p.invuln > 0 || p.dashTimer > 0) return;

  const dmg = Math.max(1, Math.round(amount));
  p.hp -= dmg;
  p.invuln = 0.6;
  p.hitFlash = 0.2;
  run.damageTaken += dmg;
  run.combo = 0;
  run.comboTimer = 0;

  addText(p.x, p.y - 28, `-${dmg}`, '#ff8b95', true);
  burst(p.x, p.y, '#ff5c6c', 10, 220, 3);
  shake = Math.max(shake, 9);
  flash = Math.max(flash, 0.45);
  audio.hurt();

  if (p.hp <= 0) {
    p.hp = 0;
    finishRun(false);
  }
}

function finishRun(victory) {
  if (!run || run.over) return;
  run.over = true;
  run.victory = !!victory;
  run.endDelay = victory ? 1.15 : 0.9;

  state.stats.runs++;
  state.stats.bestCombo = Math.max(state.stats.bestCombo, run.maxCombo);

  let bonusCoins = 0;
  let bonusXp = 0;

  if (victory) {
    const prev = state.zoneClears[run.zone.id] || 0;
    const first = prev === 0;
    bonusCoins = first ? run.zone.clear.coins : Math.floor(run.zone.clear.coins * 0.4);
    bonusXp = first ? run.zone.clear.xp : Math.floor(run.zone.clear.xp * 0.25);

    state.coins += bonusCoins;
    state.stats.totalCoins += bonusCoins;
    state.zoneClears[run.zone.id] = prev + 1;

    run.clearCoins = bonusCoins;
    run.clearXp = bonusXp;
    $('boss-wrap').classList.add('hidden');

    gainXp(bonusXp);
    ring(run.player.x, run.player.y, '#ffd166', 140);
    flash = Math.max(flash, 0.3);
    shake = Math.max(shake, 12);
    audio.victory();
  } else {
    $('boss-wrap').classList.add('hidden');
    flash = Math.max(flash, 0.5);
    burst(run.player.x, run.player.y, '#39d7ff', 20, 280, 3.4);
    audio.death();
  }

  run.finalCoins = run.coins + bonusCoins;
  run.finalXp = run.xp + bonusXp;
  run.rank = computeRank(run);

  const rankOrder = { C: 1, B: 2, A: 3, S: 4 };
  const prevRank = state.stats.bestRank[run.zone.id];
  if (!prevRank || rankOrder[run.rank] > rankOrder[prevRank]) {
    state.stats.bestRank[run.zone.id] = run.rank;
  }

  const score = Math.round(run.kills * 12 + run.maxCombo * 8 + (victory ? 200 : 0) + run.time / 10);
  sdk.sendScore(score);
  saveNow();
}

function computeRank(r) {
  const score = r.kills * 12 + r.maxCombo * 8 + (r.victory ? 200 : 0) + Math.floor(r.time / 10);
  if (score >= 900) return 'S';
  if (score >= 650) return 'A';
  if (score >= 400) return 'B';
  return 'C';
}

/* ============================================================
   UPDATE
   ============================================================ */

function updateRun(dt) {
  if (!run || run.over) return;
  run.time += dt;

  updatePlayer(dt);
  updateEnemies(dt);
  updateProjectiles(dt);
  updatePickups(dt);
  updateSpawns(dt);
  updateParticles(dt);
  updateTexts(dt);
  updateBeams(dt);
  updateSlashes(dt);
  updateAmbient(dt);
  updateCombo(dt);
  updateShake(dt);
  updateCamera(dt);

  run.enemies = run.enemies.filter((e) => !e.dead);

  updatePhase(dt);
  updateHUD();
}

function updatePlayer(dt) {
  const p = run.player;
  const st = getStats();
  p.maxHp = st.maxHp;
  p.maxEnergy = st.energyMax;
  if (p.hp > p.maxHp) p.hp = p.maxHp;

  for (const k in p.cooldowns) {
    p.cooldowns[k] = Math.max(0, p.cooldowns[k] - dt);
  }
  p.energy = Math.min(p.maxEnergy, p.energy + st.energyRegen * dt);

  if (p.invuln > 0) p.invuln -= dt;
  if (p.hitFlash > 0) p.hitFlash -= dt;

  const input = getMoveVector();
  const moving = input.x !== 0 || input.y !== 0;

  if (p.dashTimer > 0) {
    p.dashTimer -= dt;
    p.x += p.dashDir.x * 900 * dt;
    p.y += p.dashDir.y * 900 * dt;
    p.invuln = Math.max(p.invuln, 0.05);

    if (st.evo?.buffs.dashDamage) {
      for (const e of run.enemies) {
        if (e.dead || p.dashHits.has(e)) continue;
        if (Math.hypot(e.x - p.x, e.y - p.y) < 48 + e.radius) {
          p.dashHits.add(e);
          damageEnemy(e, st.damage * 1.2);
        }
      }
    }

    for (let i = 0; i < 2; i++) {
      addParticle({
        x: p.x + rand(-8, 8), y: p.y + rand(-8, 8),
        vx: -p.dashDir.x * 80 + rand(-30, 30),
        vy: -p.dashDir.y * 80 + rand(-30, 30),
        life: 0.25, max: 0.25, size: rand(2, 4),
        color: '#39d7ff', type: 'spark',
      });
    }
  } else {
    p.x += input.x * st.speed * dt;
    p.y += input.y * st.speed * dt;
    if (moving) {
      p.facing = { x: input.x, y: input.y };
    }
  }

  p.x = clamp(p.x, 34, WORLD.w - 34);
  p.y = clamp(p.y, 34, WORLD.h - 34);

  p.trailTimer -= dt;
  if ((moving || p.dashTimer > 0) && p.trailTimer <= 0) {
    p.trail.push({ x: p.x, y: p.y, life: 0.28, max: 0.28 });
    p.trailTimer = 0.04;
    if (p.trail.length > 12) p.trail.shift();
  }
  for (const t of p.trail) t.life -= dt;
  p.trail = p.trail.filter((t) => t.life > 0);

  p.attackTimer -= dt;
  if (p.attackTimer <= 0) {
    const target = nearestEnemy(p.x, p.y, 104);
    if (target) {
      p.attackTimer = 0.55;
      const ang = Math.atan2(target.y - p.y, target.x - p.x);
      p.facing = { x: Math.cos(ang), y: Math.sin(ang) };
      damageEnemy(target, st.damage);
      run.slashes.push({ x: p.x, y: p.y, angle: ang, life: 0.13, max: 0.13, range: 74 });
      audio.slash();
    } else {
      p.attackTimer = 0.12;
    }
  }
}

function updateEnemies(dt) {
  const p = run.player;

  for (let i = run.enemies.length - 1; i >= 0; i--) {
    const e = run.enemies[i];
    if (e.dead) { run.enemies.splice(i, 1); continue; }
    if (e.hitFlash > 0) e.hitFlash -= dt;
    if (e.stun > 0) { e.stun -= dt; continue; }

    if (e.boss) {
      updateBoss(e, dt);
      if (run.over) return;
      continue;
    }

    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    let mx = 0;
    let my = 0;

    if (e.def.kind === 'ranged') {
      const desired = e.def.range * 0.62;
      if (d > desired + 34) { mx = dx / d; my = dy / d; }
      else if (d < desired - 34) { mx = -dx / d; my = -dy / d; }
      else { mx = (-dy / d) * 0.45; my = (dx / d) * 0.45; }
    } else if (d > e.def.range * 0.8) {
      mx = dx / d;
      my = dy / d;
    }

    e.x += (mx * e.def.speed + e.knockX) * dt;
    e.y += (my * e.def.speed + e.knockY) * dt;
    e.knockX *= Math.exp(-7 * dt);
    e.knockY *= Math.exp(-7 * dt);

    e.x = clamp(e.x, 24, WORLD.w - 24);
    e.y = clamp(e.y, 24, WORLD.h - 24);

    e.atkTimer -= dt;

    if (e.windup > 0) {
      e.windup -= dt;
      if (e.windup <= 0) {
        if (e.def.kind === 'ranged') {
          enemyShoot(e);
        } else if (Math.hypot(p.x - e.x, p.y - e.y) < e.def.range + p.radius + 8) {
          damagePlayer(e.dmg);
        }
      }
      continue;
    }

    if (e.atkTimer <= 0 && d < e.def.range + (e.def.kind === 'ranged' ? 40 : 8)) {
      e.windup = e.def.windup;
      e.atkTimer = e.def.atkCd;
    }
  }

  // soft separation
  for (let i = 0; i < run.enemies.length; i++) {
    const a = run.enemies[i];
    if (a.dead) continue;
    for (let j = i + 1; j < run.enemies.length; j++) {
      const b = run.enemies[j];
      if (b.dead) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const min = a.radius + b.radius + 2;
      const d2 = dx * dx + dy * dy;
      if (d2 > 0 && d2 < min * min) {
        const d = Math.sqrt(d2);
        const push = (min - d) / d * 0.5;
        const ax = dx * push;
        const ay = dy * push;
        if (!a.boss) { a.x -= ax; a.y -= ay; }
        if (!b.boss) { b.x += ax; b.y += ay; }
      }
    }
  }
}

function enemyShoot(e) {
  const p = run.player;
  const ang = Math.atan2(p.y - e.y, p.x - e.x);
  const speed = e.def.projSpeed || 260;
  run.projectiles.push({
    x: e.x + Math.cos(ang) * (e.radius + 4),
    y: e.y + Math.sin(ang) * (e.radius + 4),
    vx: Math.cos(ang) * speed,
    vy: Math.sin(ang) * speed,
    radius: e.def.aoeRadius ? 8 : 5,
    dmg: e.dmg,
    from: 'enemy',
    color: e.def.color,
    kind: e.def.aoeRadius ? 'orb' : 'arrow',
    life: 3.4,
    aoe: e.def.aoeRadius || 0,
  });
  burst(e.x + Math.cos(ang) * 16, e.y + Math.sin(ang) * 16, e.def.color, 4, 90, 2);
  audio.cast();
}

function updateBoss(e, dt) {
  const p = run.player;
  const dist = Math.hypot(p.x - e.x, p.y - e.y) || 1;

  if (e.telegraph) {
    e.telegraph.t -= dt;
    if (e.telegraph.t <= 0) {
      resolveBossTelegraph(e);
      e.telegraph = null;
    }
    return;
  }

  if (!e.enraged && e.hp / e.maxHp <= e.def.enrageAt) {
    e.enraged = true;
    audio.boss();
    toast(`<b>${e.def.name}</b> is enraged!`, 'gold', '⚠️');
    ring(e.x, e.y, '#ff5c6c', 90);
    shake = Math.max(shake, 8);
  }

  const speed = e.def.speed * (e.enraged ? 1.3 : 1);
  let mx = 0;
  let my = 0;
  if (dist > 120) {
    mx = (p.x - e.x) / dist;
    my = (p.y - e.y) / dist;
  } else {
    mx = (-(p.y - e.y) / dist) * 0.35;
    my = ((p.x - e.x) / dist) * 0.35;
  }
  e.x += (mx * speed + e.knockX) * dt;
  e.y += (my * speed + e.knockY) * dt;
  e.knockX *= Math.exp(-7 * dt);
  e.knockY *= Math.exp(-7 * dt);
  e.x = clamp(e.x, 60, WORLD.w - 60);
  e.y = clamp(e.y, 60, WORLD.h - 60);

  e.atkTimer -= dt;
  if (e.atkTimer <= 0) {
    if (Math.random() < 0.55) {
      e.telegraph = {
        type: 'slam', x: p.x, y: p.y,
        radius: e.def.slamRadius, t: 0.9, max: 0.9,
      };
    } else {
      e.telegraph = {
        type: 'fan', x: e.x, y: e.y,
        radius: 120, t: 0.55, max: 0.55,
      };
    }
    e.atkTimer = e.enraged ? 2.0 : 3.0;
  }
}

function resolveBossTelegraph(e) {
  const tg = e.telegraph;
  const p = run.player;

  if (tg.type === 'slam') {
    if (Math.hypot(p.x - tg.x, p.y - tg.y) < tg.radius + p.radius) {
      damagePlayer(e.dmg * 1.15);
    }
    run.particles.push({
      type: 'ring', x: tg.x, y: tg.y, life: 0.45, max: 0.45,
      size: tg.radius, color: '#ff5c6c',
    });
    burst(tg.x, tg.y, '#ff5c6c', 18, 260, 3.4);
    shake = Math.max(shake, 15);
    audio.storm();
  } else {
    const base = Math.atan2(p.y - e.y, p.x - e.x);
    const count = e.def.fanCount;
    const rings = e.enraged ? 2 : 1;
    for (let r = 0; r < rings; r++) {
      for (let i = 0; i < count; i++) {
        const a = base + (i - (count - 1) / 2) * 0.21 + r * 0.105;
        run.projectiles.push({
          x: e.x + Math.cos(a) * (e.radius + 6),
          y: e.y + Math.sin(a) * (e.radius + 6),
          vx: Math.cos(a) * e.def.fanSpeed,
          vy: Math.sin(a) * e.def.fanSpeed,
          radius: 6,
          dmg: e.dmg * 0.72,
          from: 'enemy',
          color: '#ff7a8a',
          kind: 'orb',
          life: 3.2,
          aoe: 0,
        });
      }
    }
    shake = Math.max(shake, 7);
    audio.cast();
  }
}

function updateProjectiles(dt) {
  const p = run.player;
  for (let i = run.projectiles.length - 1; i >= 0; i--) {
    const pr = run.projectiles[i];
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;
    pr.life -= dt;

    if (pr.from === 'player') {
      for (const e of run.enemies) {
        if (e.dead) continue;
        if (Math.hypot(pr.x - e.x, pr.y - e.y) < pr.radius + e.radius) {
          damageEnemy(e, pr.dmg);
          pr.dead = true;
          burst(pr.x, pr.y, pr.color, 5, 120, 2);
          break;
        }
      }
    } else if (Math.hypot(pr.x - p.x, pr.y - p.y) < pr.radius + p.radius) {
      damagePlayer(pr.dmg);
      pr.dead = true;
      burst(pr.x, pr.y, pr.color, 6, 130, 2);
    }

    if (pr.life <= 0 || pr.x < 0 || pr.y < 0 || pr.x > WORLD.w || pr.y > WORLD.h) {
      if (pr.from === 'enemy' && pr.aoe) {
        run.particles.push({
          type: 'ring', x: pr.x, y: pr.y, life: 0.35, max: 0.35,
          size: pr.aoe, color: pr.color,
        });
        if (Math.hypot(pr.x - p.x, pr.y - p.y) < pr.aoe + p.radius) {
          damagePlayer(pr.dmg * 0.8);
        }
      }
      pr.dead = true;
    }

    if (pr.dead) run.projectiles.splice(i, 1);
  }
}

function updatePickups(dt) {
  const p = run.player;
  for (let i = run.pickups.length - 1; i >= 0; i--) {
    const pu = run.pickups[i];
    pu.life -= dt;
    const dx = p.x - pu.x;
    const dy = p.y - pu.y;
    const d = Math.hypot(dx, dy) || 1;

    if (d < 120) {
      pu.x += (dx / d) * 280 * dt;
      pu.y += (dy / d) * 280 * dt;
    }
    if (d < 24) {
      const heal = Math.min(pu.value, p.maxHp - p.hp);
      p.hp += heal;
      addText(p.x, p.y - 34, `+${Math.round(heal)} HP`, '#5ee0a0', true);
      ring(p.x, p.y, '#5ee0a0', 40);
      audio.xp();
      pu.dead = true;
    }
    if (pu.life <= 0) pu.dead = true;
    if (pu.dead) run.pickups.splice(i, 1);
  }
}

function updateSpawns(dt) {
  for (let i = run.pendingSpawns.length - 1; i >= 0; i--) {
    const s = run.pendingSpawns[i];
    s.t -= dt;
    if (s.t <= 0) {
      run.enemies.push(makeEnemy(s.type, s.x, s.y));
      burst(s.x, s.y, '#ff5c6c', 8, 130, 2.4);
      run.pendingSpawns.splice(i, 1);
    }
  }
}

function updateParticles(dt) {
  for (let i = run.particles.length - 1; i >= 0; i--) {
    const p = run.particles[i];
    p.life -= dt;
    if (p.type === 'ring') {
      p.size += 260 * dt;
    } else {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.exp(-3.2 * dt);
      p.vy *= Math.exp(-3.2 * dt);
      if (p.type === 'ember') p.vy -= 22 * dt;
    }
    if (p.life <= 0) run.particles.splice(i, 1);
  }
}

function updateTexts(dt) {
  for (let i = run.texts.length - 1; i >= 0; i--) {
    const t = run.texts[i];
    t.life -= dt;
    t.y += t.vy * dt;
    t.vy *= Math.exp(-2.2 * dt);
    if (t.life <= 0) run.texts.splice(i, 1);
  }
}

function updateBeams(dt) {
  for (let i = run.beams.length - 1; i >= 0; i--) {
    run.beams[i].life -= dt;
    if (run.beams[i].life <= 0) run.beams.splice(i, 1);
  }
}

function updateSlashes(dt) {
  for (let i = run.slashes.length - 1; i >= 0; i--) {
    run.slashes[i].life -= dt;
    if (run.slashes[i].life <= 0) run.slashes.splice(i, 1);
  }
}

function updateAmbient(dt) {
  for (const a of run.ambient) {
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    if (a.x < -20) a.x = WORLD.w + 20;
    if (a.x > WORLD.w + 20) a.x = -20;
    if (a.y < -20) a.y = WORLD.h + 20;
    if (a.y > WORLD.h + 20) a.y = -20;
  }
}

function updateCombo(dt) {
  if (run.combo <= 0) return;
  run.comboTimer -= dt;
  if (run.comboTimer <= 0) {
    run.combo = 0;
    run.comboTimer = 0;
  }
}

function updateShake(dt) {
  shake = Math.max(0, shake - dt * 55);
  flash = Math.max(0, flash - dt * 2.4);
}

function updateCamera(dt) {
  const p = run.player;
  const tx = camAxis(p.x, view.w, WORLD.w);
  const ty = camAxis(p.y, view.h, WORLD.h);
  const k = 1 - Math.exp(-9 * dt);
  camera.x = lerp(camera.x, tx, k);
  camera.y = lerp(camera.y, ty, k);
}

function camAxis(pos, viewSize, worldSize) {
  if (viewSize >= worldSize) return (worldSize - viewSize) / 2;
  return clamp(pos - viewSize / 2, 0, worldSize - viewSize);
}

function updatePhase(dt) {
  if (run.over) return;

  if (run.phase === 'breather') {
    run.phaseTimer -= dt;
    if (run.phaseTimer <= 0) spawnWave(run.wave + 1);
    return;
  }

  if (run.phase === 'wave' && run.enemies.length === 0 && run.pendingSpawns.length === 0 && !run.bossSpawned) {
    if (run.wave < run.zone.waves.length) {
      run.phase = 'breather';
      run.phaseTimer = 1.7;
    } else {
      spawnBoss();
    }
  }
}

/* ============================================================
   HUD
   ============================================================ */

function buildSkillBar() {
  const list = SKILLS.filter((s) => s.hero === 'kaito');
  $('skill-bar').innerHTML = list.map((sk, i) => {
    const key = sk.id === 'dash' ? 'SPACE' : String(i);
    return `
      <button class="skill-btn ${sk.id === 'ultimate' ? 'ult' : ''}" data-skill="${sk.id}" aria-label="${sk.name}">
        <span class="skill-glyph">${sk.icon}</span>
        <span class="key">${key}</span>
        <i class="cd"></i>
        <span class="cd-text"></span>
      </button>`;
  }).join('');
}

function updateHUD() {
  if (!run) return;
  const p = run.player;

  setText('hud-level', String(state.level));
  setWidth('hud-hp', (p.hp / p.maxHp) * 100);
  setText('hud-hp-text', `${Math.ceil(p.hp)} / ${Math.ceil(p.maxHp)}`);
  setWidth('hud-energy', (p.energy / p.maxEnergy) * 100);
  setWidth('hud-xp', (state.xp / xpForLevel(state.level)) * 100);
  setText('hud-coins', fmt(state.coins));
  setText('hud-wave', run.boss ? 'BOSS FIGHT' : `WAVE ${run.wave} / ${run.zone.waves.length}`);

  const bossWrap = $('boss-wrap');
  if (run.boss && !run.boss.dead) {
    bossWrap.classList.remove('hidden');
    setText('boss-name', run.boss.def.name);
    setWidth('boss-hp', (run.boss.hp / run.boss.maxHp) * 100);
  } else {
    bossWrap.classList.add('hidden');
  }

  const comboEl = $('combo');
  const showCombo = run.combo >= 2;
  comboEl.classList.toggle('hidden', !showCombo);
  if (showCombo) setText('combo-value', String(run.combo));

  const st = getStats();
  const bar = $('skill-bar');
  for (const sk of SKILLS) {
    if (sk.hero !== 'kaito') continue;
    const btn = bar.querySelector(`[data-skill="${sk.id}"]`);
    if (!btn) continue;
    const unlocked = state.level >= sk.unlock;
    btn.classList.toggle('locked', !unlocked);
    btn.disabled = !unlocked;

    const cd = p.cooldowns[sk.id] || 0;
    const max = skillCooldown(sk);
    const overlay = btn.querySelector('.cd');
    const txt = btn.querySelector('.cd-text');
    if (overlay) overlay.style.transform = `scaleY(${max ? clamp(cd / max, 0, 1) : 0})`;
    if (txt) txt.textContent = unlocked && cd > 0.15 ? String(Math.ceil(cd)) : '';

    btn.classList.toggle('no-energy', unlocked && cd <= 0 && p.energy < skillCost(sk));
  }
}

/* ============================================================
   RENDER
   ============================================================ */

function render() {
  if (!run) return;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#050810';
  ctx.fillRect(0, 0, view.w, view.h);

  const sx = shake > 0 ? rand(-shake, shake) : 0;
  const sy = shake > 0 ? rand(-shake, shake) : 0;

  ctx.save();
  ctx.translate(-camera.x + sx, -camera.y + sy);

  ctx.drawImage(run.bg, 0, 0);
  drawAmbient();
  drawPickups();
  drawSpawnMarkers();
  drawTelegraphs();
  drawEnemies();
  drawSlashes();
  drawProjectiles();
  drawPlayer();
  drawBeams();
  drawParticles();
  drawTexts();

  ctx.restore();

  if (flash > 0) {
    ctx.fillStyle = `rgba(255, 46, 68, ${clamp(flash * 0.35, 0, 0.28)})`;
    ctx.fillRect(0, 0, view.w, view.h);
  }
}

function drawAmbient() {
  const th = THEMES[run.zone.theme];
  const t = run.time;
  for (const a of run.ambient) {
    if (a.x < camera.x - 30 || a.x > camera.x + view.w + 30) continue;
    if (a.y < camera.y - 30 || a.y > camera.y + view.h + 30) continue;
    const alpha = a.alpha * (0.65 + 0.35 * Math.sin(t * 2 + a.phase));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = th.particle;
    if (a.type === 'shard') {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(t * 0.5 + a.phase);
      ctx.fillRect(-a.size / 2, -a.size / 2, a.size, a.size);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.size, 0, TAU);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawPlayer() {
  const p = run.player;
  if (!p) return;

  for (const t of p.trail) {
    ctx.globalAlpha = (t.life / t.max) * 0.22;
    ctx.fillStyle = '#39d7ff';
    ctx.beginPath();
    ctx.arc(t.x, t.y, 7, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const blink = p.invuln > 0 && Math.sin(run.time * 46) > 0 ? 0.55 : 1;
  const bob = Math.sin(run.time * 9) * 1.3;

  ctx.save();
  ctx.globalAlpha = blink;
  ctx.translate(p.x, p.y + bob);

  // shadow
  ctx.globalAlpha = blink * 0.32;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(0, 16, 15, 5, 0, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = blink;

  // scarf
  const bx = -p.facing.x;
  const by = -p.facing.y;
  const sway = Math.sin(run.time * 9) * 4;
  ctx.strokeStyle = '#2bc6e8';
  ctx.lineCap = 'round';
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(bx * 3, by * 3);
  ctx.quadraticCurveTo(bx * 14 + sway, by * 14 + 8, bx * 25 + sway * 1.6, by * 25 + 15);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(43, 198, 232, 0.55)';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(bx * 4, by * 4);
  ctx.quadraticCurveTo(bx * 12 - sway, by * 12 + 12, bx * 21 - sway, by * 21 + 18);
  ctx.stroke();

  // cloak
  ctx.fillStyle = '#0b2130';
  ctx.beginPath();
  ctx.ellipse(0, 2, 15, 17, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#14384d';
  ctx.beginPath();
  ctx.ellipse(0, -1, 11.5, 13.5, 0, 0, TAU);
  ctx.fill();

  // shoulder plates
  ctx.fillStyle = '#07131d';
  ctx.beginPath();
  ctx.ellipse(-11, -3, 5, 6, -0.3, 0, TAU);
  ctx.ellipse(11, -3, 5, 6, 0.3, 0, TAU);
  ctx.fill();

  // head
  ctx.fillStyle = '#081521';
  ctx.beginPath();
  ctx.arc(0, -11, 10, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#183247';
  ctx.beginPath();
  ctx.arc(0, -10, 7.4, 0, TAU);
  ctx.fill();

  // mask
  ctx.fillStyle = '#050b11';
  ctx.fillRect(-7.4, -12.2, 14.8, 4.4);

  // eyes
  const ex = p.facing.x * 2.6;
  const ey = p.facing.y * 2;
  ctx.fillStyle = '#6ff0ff';
  ctx.beginPath();
  ctx.arc(-3 + ex, -10 + ey, 1.5, 0, TAU);
  ctx.arc(3 + ex, -10 + ey, 1.5, 0, TAU);
  ctx.fill();

  // rim light
  ctx.strokeStyle = 'rgba(57, 215, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, 15.5, Math.PI * 0.9, Math.PI * 1.9);
  ctx.stroke();

  // sword
  const ang = Math.atan2(p.facing.y, p.facing.x) + 0.55;
  ctx.save();
  ctx.rotate(ang);
  ctx.strokeStyle = '#c8eefb';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(7, -2);
  ctx.lineTo(27, -2);
  ctx.stroke();
  ctx.strokeStyle = '#ffc857';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(7, -5);
  ctx.lineTo(7, 1);
  ctx.stroke();
  ctx.restore();

  if (p.hitFlash > 0) {
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, TAU);
    ctx.fill();
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawEnemies() {
  const sorted = [...run.enemies].sort((a, b) => a.y - b.y);
  for (const e of sorted) {
    if (!e.dead) drawEnemy(e);
  }
}

function drawEnemy(e) {
  const p = run.player;
  const ang = Math.atan2(p.y - e.y, p.x - e.x);
  const r = e.radius;
  const flash = e.hitFlash > 0;
  const col = flash ? '#ffffff' : e.def.color;
  const acc = flash ? '#ffffff' : e.def.accent;

  ctx.save();
  ctx.translate(e.x, e.y);

  // shadow
  ctx.globalAlpha = 0.32;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.8, r * 0.95, r * 0.4, 0, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;

  if (e.boss) {
    const pulse = 1 + Math.sin(run.time * 3) * 0.05;
    ctx.strokeStyle = e.enraged ? 'rgba(255, 92, 108, 0.55)' : `${col}55`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.35 * pulse, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = e.enraged ? 'rgba(255, 92, 108, 0.2)' : `${col}22`;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.7 * pulse, 0, TAU);
    ctx.stroke();
  }

  switch (e.def.shape) {
    case 'bandit': {
      ctx.fillStyle = acc;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(0, -2, r * 0.82, 0, TAU); ctx.fill();
      ctx.fillStyle = '#1a0e0c';
      ctx.fillRect(-r * 0.78, -r * 0.24, r * 1.56, r * 0.3);
      break;
    }
    case 'archer': {
      ctx.fillStyle = acc;
      ctx.beginPath();
      ctx.moveTo(-r, r * 0.9);
      ctx.lineTo(0, -r * 1.35);
      ctx.lineTo(r, r * 0.9);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(0, -r * 0.1, r * 0.55, 0, TAU); ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r * 0.85, 0, r * 0.85, -1.25, 1.25);
      ctx.stroke();
      break;
    }
    case 'brute': {
      ctx.fillStyle = acc;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(0, -2, r * 0.8, 0, TAU); ctx.fill();
      ctx.fillStyle = acc;
      ctx.beginPath();
      ctx.ellipse(-r * 0.82, -r * 0.15, r * 0.38, r * 0.48, -0.3, 0, TAU);
      ctx.ellipse(r * 0.82, -r * 0.15, r * 0.38, r * 0.48, 0.3, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(r * 0.75, r * 0.2);
      ctx.lineTo(r * 1.25, r * 0.75);
      ctx.stroke();
      break;
    }
    case 'rogue': {
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = acc;
      ctx.fillRect(-r * 0.75, -r * 0.75, r * 1.5, r * 1.5);
      ctx.fillStyle = col;
      ctx.fillRect(-r * 0.5, -r * 0.5, r, r);
      ctx.rotate(-Math.PI / 4);
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.9, -r * 0.5); ctx.lineTo(-r * 1.4, -r * 0.8);
      ctx.moveTo(r * 0.9, -r * 0.5); ctx.lineTo(r * 1.4, -r * 0.8);
      ctx.stroke();
      break;
    }
    case 'mage': {
      ctx.fillStyle = acc;
      ctx.beginPath();
      ctx.moveTo(-r, r);
      ctx.lineTo(0, -r * 0.7);
      ctx.lineTo(r, r);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(0, -r * 0.3, r * 0.45, 0, TAU); ctx.fill();
      ctx.fillStyle = '#d8fff8';
      ctx.beginPath(); ctx.arc(r * 0.9, -r * 0.4, r * 0.22, 0, TAU); ctx.fill();
      break;
    }
    case 'crawler': {
      ctx.fillStyle = acc;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 1.1, r * 0.7, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.ellipse(0, -1, r * 0.85, r * 0.5, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.5;
      for (let i = -1; i <= 1; i += 2) {
        ctx.beginPath();
        ctx.moveTo(i * r * 0.5, r * 0.3);
        ctx.lineTo(i * r * 1.1, r * 0.75);
        ctx.moveTo(i * r * 0.2, r * 0.35);
        ctx.lineTo(i * r * 0.55, r * 0.85);
        ctx.stroke();
      }
      break;
    }
    case 'golem': {
      ctx.fillStyle = acc;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU - Math.PI / 2;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-r * 0.45, -r * 0.5);
      ctx.lineTo(-r * 0.1, 0);
      ctx.lineTo(-r * 0.3, r * 0.45);
      ctx.moveTo(r * 0.2, -r * 0.55);
      ctx.lineTo(r * 0.45, r * 0.1);
      ctx.stroke();
      break;
    }
    case 'imp': {
      ctx.fillStyle = acc;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(0, -1, r * 0.75, 0, TAU); ctx.fill();
      ctx.fillStyle = acc;
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, -r * 0.6); ctx.lineTo(-r * 0.85, -r * 1.35); ctx.lineTo(-r * 0.2, -r * 0.85);
      ctx.moveTo(r * 0.6, -r * 0.6); ctx.lineTo(r * 0.85, -r * 1.35); ctx.lineTo(r * 0.2, -r * 0.85);
      ctx.fill();
      break;
    }
    case 'shadow': {
      ctx.fillStyle = acc;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        const rr = i % 2 === 0 ? r * 1.15 : r * 0.75;
        const x = Math.cos(a) * rr;
        const y = Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, TAU); ctx.fill();
      break;
    }
    case 'void_archer': {
      ctx.fillStyle = acc;
      ctx.beginPath();
      ctx.moveTo(-r, r * 0.9);
      ctx.lineTo(0, -r * 1.45);
      ctx.lineTo(r, r * 0.9);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(0, -r * 0.15, r * 0.52, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#e2b8ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r * 0.85, 0, r * 0.85, -1.25, 1.25);
      ctx.stroke();
      break;
    }
    case 'boss':
    default: {
      ctx.fillStyle = acc;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(0, -3, r * 0.82, 0, TAU); ctx.fill();

      ctx.fillStyle = acc;
      ctx.beginPath();
      ctx.moveTo(-r * 0.75, -r * 0.55);
      ctx.lineTo(-r * 1.25, -r * 1.5);
      ctx.lineTo(-r * 0.2, -r * 0.95);
      ctx.moveTo(r * 0.75, -r * 0.55);
      ctx.lineTo(r * 1.25, -r * 1.5);
      ctx.lineTo(r * 0.2, -r * 0.95);
      ctx.fill();

      ctx.fillStyle = e.enraged ? '#ff3e52' : '#ffe08a';
      ctx.beginPath();
      ctx.arc(-r * 0.28 + Math.cos(ang) * 3, -r * 0.1 + Math.sin(ang) * 2, r * 0.1, 0, TAU);
      ctx.arc(r * 0.28 + Math.cos(ang) * 3, -r * 0.1 + Math.sin(ang) * 2, r * 0.1, 0, TAU);
      ctx.fill();
      break;
    }
  }

  // generic eyes for non-boss
  if (!e.boss) {
    ctx.fillStyle = flash ? '#333' : '#ffe6a8';
    const ox = Math.cos(ang) * r * 0.25;
    const oy = Math.sin(ang) * r * 0.2;
    ctx.beginPath();
    ctx.arc(-r * 0.22 + ox, -r * 0.1 + oy, Math.max(1.4, r * 0.1), 0, TAU);
    ctx.arc(r * 0.22 + ox, -r * 0.1 + oy, Math.max(1.4, r * 0.1), 0, TAU);
    ctx.fill();
  }

  // wind-up arc
  if (e.windup > 0 && e.def.kind !== 'boss') {
    const k = 1 - e.windup / e.def.windup;
    ctx.strokeStyle = `rgba(255, 92, 108, ${0.35 + 0.5 * k})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r + 7, -Math.PI / 2, -Math.PI / 2 + TAU * k);
    ctx.stroke();
  }

  // stun sparks
  if (e.stun > 0) {
    ctx.fillStyle = '#ffd166';
    for (let i = 0; i < 3; i++) {
      const a = run.time * 6 + (i / 3) * TAU;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * (r + 8), -r - 8 + Math.sin(a) * 4, 1.8, 0, TAU);
      ctx.fill();
    }
  }

  ctx.restore();

  // hp bar
  if (e.hp < e.maxHp && !e.boss) {
    const w = r * 2.2;
    ctx.fillStyle = 'rgba(3, 8, 12, 0.75)';
    ctx.fillRect(e.x - w / 2, e.y - r - 12, w, 3.5);
    ctx.fillStyle = e.hp / e.maxHp > 0.5 ? '#7ee8a8' : '#ff7a8a';
    ctx.fillRect(e.x - w / 2, e.y - r - 12, w * clamp(e.hp / e.maxHp, 0, 1), 3.5);
  }
}

function drawTelegraphs() {
  for (const e of run.enemies) {
    if (!e.boss || !e.telegraph || e.dead) continue;
    const tg = e.telegraph;
    const k = 1 - tg.t / tg.max;

    if (tg.type === 'slam') {
      ctx.save();
      ctx.setLineDash([7, 7]);
      ctx.strokeStyle = 'rgba(255, 92, 108, 0.8)';
      ctx.lineWidth = 2;
      ctx.fillStyle = `rgba(255, 50, 70, ${0.08 + 0.16 * k})`;
      ctx.beginPath();
      ctx.arc(tg.x, tg.y, tg.radius, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(255, 160, 170, 0.8)';
      ctx.beginPath();
      ctx.arc(tg.x, tg.y, tg.radius * k, 0, TAU);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.save();
      ctx.setLineDash([6, 8]);
      ctx.strokeStyle = `rgba(255, 92, 108, ${0.4 + 0.4 * k})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, tg.radius + k * 20, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function drawProjectiles() {
  for (const pr of run.projectiles) {
    ctx.save();
    ctx.translate(pr.x, pr.y);

    if (pr.kind === 'bolt') {
      ctx.rotate(Math.atan2(pr.vy, pr.vx));
      ctx.shadowColor = pr.color;
      ctx.shadowBlur = 14;
      ctx.strokeStyle = pr.color;
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.moveTo(-11, 0);
      ctx.lineTo(10, 0);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.lineTo(7, 0);
      ctx.stroke();
    } else if (pr.kind === 'arrow') {
      ctx.rotate(Math.atan2(pr.vy, pr.vx));
      ctx.fillStyle = pr.color;
      ctx.shadowColor = pr.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-5, 3.5);
      ctx.lineTo(-3, 0);
      ctx.lineTo(-5, -3.5);
      ctx.closePath();
      ctx.fill();
    } else {
      const g = ctx.createRadialGradient(0, 0, 1, 0, 0, pr.radius * 2.4);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.35, pr.color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, pr.radius * 2.4, 0, TAU);
      ctx.fill();
      if (pr.aoe) {
        ctx.strokeStyle = `${pr.color}66`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, pr.aoe, 0, TAU);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
  ctx.shadowBlur = 0;
}

function drawPickups() {
  for (const pu of run.pickups) {
    const bob = Math.sin(run.time * 4 + pu.phase) * 3;
    ctx.save();
    ctx.translate(pu.x, pu.y + bob);
    const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 18);
    g.addColorStop(0, 'rgba(160, 255, 205, 0.9)');
    g.addColorStop(0.45, 'rgba(94, 224, 160, 0.55)');
    g.addColorStop(1, 'rgba(94, 224, 160, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 18, 0, TAU); ctx.fill();
    ctx.fillStyle = '#b8ffda';
    ctx.fillRect(-2, -6, 4, 12);
    ctx.fillRect(-6, -2, 12, 4);
    ctx.restore();
  }
}

function drawSpawnMarkers() {
  for (const s of run.pendingSpawns) {
    const k = 1 - s.t / s.max;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.strokeStyle = `rgba(255, 92, 108, ${0.3 + 0.6 * k})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 5]);
    ctx.rotate(run.time * 1.5);
    ctx.beginPath();
    ctx.arc(0, 0, 18 + k * 8, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = `rgba(255, 92, 108, ${0.08 + 0.15 * k})`;
    ctx.beginPath(); ctx.arc(0, 0, 16 + k * 8, 0, TAU); ctx.fill();
    ctx.restore();
  }
}

function drawSlashes() {
  for (const s of run.slashes) {
    const k = s.life / s.max;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.angle);
    ctx.strokeStyle = `rgba(158, 242, 255, ${k * 0.85})`;
    ctx.lineWidth = 4 * k + 1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, s.range, -0.9, 0.9);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255, 255, 255, ${k * 0.5})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, s.range - 4, -0.78, 0.78);
    ctx.stroke();
    ctx.restore();
  }
}

function drawBeams() {
  for (const b of run.beams) {
    const k = b.life / b.max;
    ctx.save();
    ctx.strokeStyle = `rgba(120, 235, 255, ${k * 0.5})`;
    ctx.lineWidth = 6;
    ctx.shadowColor = '#8be9ff';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    for (let i = 0; i < b.points.length; i++) {
      const pt = b.points[i];
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else {
        const prev = b.points[i - 1];
        const mx = (prev.x + pt.x) / 2 + rand(-7, 7);
        const my = (prev.y + pt.y) / 2 + rand(-7, 7);
        ctx.lineTo(mx, my);
        ctx.lineTo(pt.x, pt.y);
      }
    }
    ctx.stroke();
    ctx.strokeStyle = `rgba(255, 255, 255, ${k * 0.85})`;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
  }
  ctx.shadowBlur = 0;
}

function drawParticles() {
  for (const p of run.particles) {
    const k = clamp(p.life / p.max, 0, 1);
    ctx.globalAlpha = k;
    if (p.type === 'ring') {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2 + 2 * k;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TAU);
      ctx.stroke();
    } else if (p.type === 'coin') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.size * 0.7, p.size, 0, 0, TAU);
      ctx.fill();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TAU);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawTexts() {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const t of run.texts) {
    const k = clamp(t.life / t.max, 0, 1);
    ctx.globalAlpha = k;
    ctx.font = `800 ${t.size}px "Avenir Next", "Trebuchet MS", sans-serif`;
    ctx.fillStyle = t.color;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 4;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

/* ============================================================
   PARTICLES / TEXT HELPERS
   ============================================================ */

function addParticle(p) {
  if (!run) return;
  if (run.particles.length > 320) run.particles.shift();
  run.particles.push({ ...p, max: p.max ?? p.life });
}

function burst(x, y, color, count = 6, speed = 160, size = 2.4) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * TAU;
    const s = rand(speed * 0.35, speed);
    addParticle({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: rand(0.22, 0.5),
      max: 0.5,
      size: rand(size * 0.6, size * 1.4),
      color,
      type: 'spark',
    });
  }
}

function ring(x, y, color, size) {
  run.particles.push({
    type: 'ring', x, y, life: 0.5, max: 0.5, size, color,
  });
}

function addText(x, y, text, color = '#fff', big = false) {
  if (!run) return;
  if (run.texts.length > 70) run.texts.shift();
  run.texts.push({
    x, y, text, color,
    life: big ? 1.05 : 0.8,
    max: big ? 1.05 : 0.8,
    size: big ? 19 : 13,
    vy: -34,
  });
}

/* ============================================================
   BACKGROUNDS
   ============================================================ */

function getBackground(themeId) {
  if (!bgCache.has(themeId)) bgCache.set(themeId, buildBackground(themeId));
  return bgCache.get(themeId);
}

function buildBackground(themeId) {
  const c = document.createElement('canvas');
  c.width = WORLD.w;
  c.height = WORLD.h;
  const g = c.getContext('2d');
  const th = THEMES[themeId];
  const rnd = mulberry32(hashString(themeId));

  const grad = g.createLinearGradient(0, 0, WORLD.w, WORLD.h);
  grad.addColorStop(0, th.ground1);
  grad.addColorStop(0.55, th.ground2);
  grad.addColorStop(1, th.ground1);
  g.fillStyle = grad;
  g.fillRect(0, 0, WORLD.w, WORLD.h);

  // soft color blooms
  for (let i = 0; i < 16; i++) {
    const x = rnd() * WORLD.w;
    const y = rnd() * WORLD.h;
    const r = 140 + rnd() * 320;
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, `${th.accent}22`);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg;
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
  }

  if (themeId === 'forest') drawForestBg(g, rnd, th);
  else if (themeId === 'village') drawVillageBg(g, rnd, th);
  else if (themeId === 'caverns') drawCavernBg(g, rnd, th);
  else if (themeId === 'volcano') drawVolcanoBg(g, rnd, th);
  else drawFortressBg(g, rnd, th);

  // center crest
  drawCrest(g, WORLD.w / 2, WORLD.h / 2, 260, th.accent, 0.05);

  // vignette
  const vg = g.createRadialGradient(
    WORLD.w / 2, WORLD.h / 2, Math.min(WORLD.w, WORLD.h) * 0.2,
    WORLD.w / 2, WORLD.h / 2, Math.max(WORLD.w, WORLD.h) * 0.72,
  );
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  g.fillStyle = vg;
  g.fillRect(0, 0, WORLD.w, WORLD.h);

  // border
  g.strokeStyle = 'rgba(0,0,0,0.35)';
  g.lineWidth = 46;
  g.strokeRect(0, 0, WORLD.w, WORLD.h);

  return c;
}

function drawForestBg(g, rnd, th) {
  for (let i = 0; i < 140; i++) {
    const x = rnd() * WORLD.w;
    const y = rnd() * WORLD.h;
    g.fillStyle = `rgba(60, 140, 100, ${0.02 + rnd() * 0.04})`;
    g.beginPath();
    g.ellipse(x, y, 20 + rnd() * 70, 8 + rnd() * 28, rnd() * TAU, 0, TAU);
    g.fill();
  }

  for (let i = 0; i < 78; i++) {
    const x = rnd() * WORLD.w;
    const y = rnd() * WORLD.h;
    const h = 90 + rnd() * 230;
    const w = 3.5 + rnd() * 4;
    const sway = (rnd() - 0.5) * 26;
    const shade = 0.1 + rnd() * 0.12;
    g.strokeStyle = `rgba(72, 168, 122, ${shade})`;
    g.lineWidth = w;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + sway * 0.4, y - h * 0.55, x + sway, y - h);
    g.stroke();

    g.strokeStyle = `rgba(40, 110, 82, ${shade + 0.06})`;
    g.lineWidth = 1;
    for (let s = 1; s < 4; s++) {
      const yy = y - (h * s) / 4;
      const xx = x + sway * (s / 4);
      g.beginPath();
      g.moveTo(xx - w * 0.7, yy);
      g.lineTo(xx + w * 0.7, yy);
      g.stroke();
    }

    g.fillStyle = `rgba(95, 200, 145, ${shade * 0.9})`;
    for (let l = 0; l < 4; l++) {
      const a = rnd() * TAU;
      g.beginPath();
      g.ellipse(
        x + sway + Math.cos(a) * 18,
        y - h + Math.sin(a) * 10,
        10 + rnd() * 12, 3 + rnd() * 3,
        a, 0, TAU,
      );
      g.fill();
    }
  }

  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(80, 190, 140, ${0.05 + rnd() * 0.08})`;
    g.beginPath();
    g.arc(rnd() * WORLD.w, rnd() * WORLD.h, 1 + rnd() * 2, 0, TAU);
    g.fill();
  }

  for (let i = 0; i < 8; i++) {
    const x = rnd() * WORLD.w;
    const y = rnd() * WORLD.h;
    const r = 160 + rnd() * 220;
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, 'rgba(90, 190, 150, 0.055)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg;
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
  }
}

function drawVillageBg(g, rnd, th) {
  g.fillStyle = 'rgba(140, 100, 66, 0.055)';
  g.fillRect(0, WORLD.h * 0.46, WORLD.w, 130);
  g.fillRect(WORLD.w * 0.58, 0, 120, WORLD.h);

  for (let i = 0; i < 18; i++) {
    const x = 90 + rnd() * (WORLD.w - 300);
    const y = 90 + rnd() * (WORLD.h - 260);
    const w = 90 + rnd() * 130;
    const h = 62 + rnd() * 65;

    g.fillStyle = 'rgba(0,0,0,0.28)';
    g.fillRect(x + 10, y + 12, w, h);

    g.fillStyle = '#1a1214';
    g.fillRect(x, y, w, h);

    g.fillStyle = '#2b1c18';
    g.beginPath();
    if (rnd() < 0.22) {
      g.moveTo(x - 12, y);
      g.lineTo(x + w * 0.45, y - 38);
      g.lineTo(x + w * 0.62, y);
    } else {
      g.moveTo(x - 14, y);
      g.lineTo(x + w / 2, y - 46);
      g.lineTo(x + w + 14, y);
    }
    g.closePath();
    g.fill();

    const windows = 1 + Math.floor(rnd() * 3);
    for (let k = 0; k < windows; k++) {
      const wx = x + 12 + k * (w / (windows + 0.5));
      const wy = y + 16 + rnd() * (h * 0.4);
      g.fillStyle = `rgba(255, 176, 92, ${0.18 + rnd() * 0.22})`;
      g.fillRect(wx, wy, 11, 14);
      const rg = g.createRadialGradient(wx + 5, wy + 7, 0, wx + 5, wy + 7, 26);
      rg.addColorStop(0, 'rgba(255, 176, 92, 0.12)');
      rg.addColorStop(1, 'rgba(255, 176, 92, 0)');
      g.fillStyle = rg;
      g.beginPath();
      g.arc(wx + 5, wy + 7, 26, 0, TAU);
      g.fill();
    }

    g.strokeStyle = 'rgba(120, 86, 60, 0.25)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(x, y + h);
    g.lineTo(x + w, y + h);
    g.stroke();
  }

  for (let i = 0; i < 16; i++) {
    const x = rnd() * WORLD.w;
    const y = rnd() * WORLD.h;
    g.strokeStyle = 'rgba(120, 96, 70, 0.22)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + 34, y);
    g.moveTo(x, y);
    g.lineTo(x, y - 26);
    g.stroke();
  }

  for (let i = 0; i < 14; i++) {
    const x = 60 + rnd() * (WORLD.w - 120);
    const y = 60 + rnd() * (WORLD.h - 120);
    const rg = g.createRadialGradient(x, y, 0, x, y, 30);
    rg.addColorStop(0, 'rgba(255, 170, 90, 0.16)');
    rg.addColorStop(1, 'rgba(255, 170, 90, 0)');
    g.fillStyle = rg;
    g.beginPath();
    g.arc(x, y, 30, 0, TAU);
    g.fill();
    g.fillStyle = 'rgba(255, 200, 120, 0.5)';
    g.beginPath();
    g.arc(x, y, 2.2, 0, TAU);
    g.fill();
  }
}

function drawCavernBg(g, rnd, th) {
  for (let i = 0; i < 26; i++) {
    const x = rnd() * WORLD.w;
    const y = rnd() * WORLD.h;
    const r = 40 + rnd() * 130;
    g.fillStyle = 'rgba(8, 13, 22, 0.5)';
    g.beginPath();
    const points = 7 + Math.floor(rnd() * 4);
    for (let k = 0; k < points; k++) {
      const a = (k / points) * TAU;
      const rr = r * (0.65 + rnd() * 0.5);
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr * 0.8;
      if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath();
    g.fill();
  }

  for (let i = 0; i < 34; i++) {
    const x = rnd() * WORLD.w;
    const y = rnd() * WORLD.h;
    const size = 10 + rnd() * 34;
    const rg = g.createRadialGradient(x, y, 0, x, y, size * 2.2);
    rg.addColorStop(0, 'rgba(90, 190, 255, 0.12)');
    rg.addColorStop(1, 'rgba(90, 190, 255, 0)');
    g.fillStyle = rg;
    g.beginPath();
    g.arc(x, y, size * 2.2, 0, TAU);
    g.fill();

    g.fillStyle = `rgba(${100 + rnd() * 60}, ${180 + rnd() * 60}, 255, ${0.12 + rnd() * 0.14})`;
    g.beginPath();
    g.moveTo(x, y - size);
    g.lineTo(x + size * 0.42, y);
    g.lineTo(x, y + size * 0.5);
    g.lineTo(x - size * 0.42, y);
    g.closePath();
    g.fill();
  }

  for (let i = 0; i < 60; i++) {
    g.fillStyle = `rgba(160, 225, 255, ${0.06 + rnd() * 0.1})`;
    g.beginPath();
    g.arc(rnd() * WORLD.w, rnd() * WORLD.h, 1 + rnd() * 1.8, 0, TAU);
    g.fill();
  }

  for (let i = 0; i < 5; i++) {
    const x = rnd() * WORLD.w;
    const y = rnd() * WORLD.h;
    const rx = 90 + rnd() * 130;
    const ry = 40 + rnd() * 60;
    const rg = g.createRadialGradient(x, y, 0, x, y, rx);
    rg.addColorStop(0, 'rgba(70, 150, 255, 0.1)');
    rg.addColorStop(1, 'rgba(70, 150, 255, 0)');
    g.fillStyle = rg;
    g.beginPath();
    g.ellipse(x, y, rx, ry, 0, 0, TAU);
    g.fill();
  }
}

function drawVolcanoBg(g, rnd, th) {
  for (let i = 0; i < 34; i++) {
    const x = rnd() * WORLD.w;
    const y = rnd() * WORLD.h;
    const r = 20 + rnd() * 70;
    g.fillStyle = 'rgba(8, 5, 5, 0.55)';
    g.beginPath();
    g.ellipse(x, y, r, r * 0.6, rnd() * TAU, 0, TAU);
    g.fill();
  }

  g.lineCap = 'round';
  for (let i = 0; i < 16; i++) {
    let x = rnd() * WORLD.w;
    let y = rnd() * WORLD.h;
    g.strokeStyle = `rgba(255, 92, 32, ${0.1 + rnd() * 0.14})`;
    g.lineWidth = 2 + rnd() * 3;
    g.shadowColor = '#ff5a1e';
    g.shadowBlur = 16;
    g.beginPath();
    g.moveTo(x, y);
    const steps = 4 + Math.floor(rnd() * 5);
    for (let s = 0; s < steps; s++) {
      x += (rnd() - 0.5) * 150;
      y += (rnd() - 0.5) * 120;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  g.shadowBlur = 0;

  for (let i = 0; i < 10; i++) {
    const x = rnd() * WORLD.w;
    const y = rnd() * WORLD.h;
    const rx = 30 + rnd() * 80;
    const ry = 14 + rnd() * 30;
    const rg = g.createRadialGradient(x, y, 0, x, y, rx);
    rg.addColorStop(0, 'rgba(255, 120, 40, 0.22)');
    rg.addColorStop(0.6, 'rgba(200, 50, 10, 0.12)');
    rg.addColorStop(1, 'rgba(200, 50, 10, 0)');
    g.fillStyle = rg;
    g.beginPath();
    g.ellipse(x, y, rx, ry, 0, 0, TAU);
    g.fill();
  }

  for (let i = 0; i < 46; i++) {
    g.fillStyle = `rgba(255, 170, 100, ${0.08 + rnd() * 0.16})`;
    g.beginPath();
    g.arc(rnd() * WORLD.w, rnd() * WORLD.h, 0.8 + rnd() * 1.8, 0, TAU);
    g.fill();
  }
}

function drawFortressBg(g, rnd, th) {
  const tile = 82;
  for (let y = 0; y < WORLD.h; y += tile) {
    for (let x = 0; x < WORLD.w; x += tile) {
      const alt = ((x / tile + y / tile) | 0) % 2 === 0;
      g.fillStyle = alt ? 'rgba(30, 22, 46, 0.35)' : 'rgba(14, 10, 22, 0.28)';
      g.fillRect(x, y, tile, tile);
    }
  }
  g.strokeStyle = 'rgba(120, 90, 170, 0.06)';
  g.lineWidth = 1;
  for (let y = 0; y < WORLD.h; y += tile) {
    g.beginPath(); g.moveTo(0, y); g.lineTo(WORLD.w, y); g.stroke();
  }
  for (let x = 0; x < WORLD.w; x += tile) {
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, WORLD.h); g.stroke();
  }

  for (let i = 0; i < 12; i++) {
    const x = 70 + rnd() * (WORLD.w - 140);
    const y = 70 + rnd() * (WORLD.h - 140);
    const r = 18 + rnd() * 14;
    g.fillStyle = 'rgba(26, 18, 40, 0.8)';
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(140, 100, 200, 0.15)';
    g.lineWidth = 2;
    g.beginPath(); g.arc(x, y, r + 5, 0, TAU); g.stroke();
  }

  for (let i = 0; i < 8; i++) {
    const x = 90 + rnd() * (WORLD.w - 180);
    const y = 80 + rnd() * (WORLD.h - 160);
    g.fillStyle = 'rgba(60, 30, 90, 0.32)';
    g.fillRect(x - 22, y, 44, 86);
    g.fillStyle = 'rgba(160, 120, 220, 0.18)';
    g.beginPath();
    g.moveTo(x, y + 10);
    g.lineTo(x + 17, y + 32);
    g.lineTo(x, y + 54);
    g.lineTo(x - 17, y + 32);
    g.closePath();
    g.fill();
  }

  for (let i = 0; i < 20; i++) {
    const x = rnd() * WORLD.w;
    const y = rnd() * WORLD.h;
    const rg = g.createRadialGradient(x, y, 0, x, y, 34);
    rg.addColorStop(0, 'rgba(190, 130, 255, 0.13)');
    rg.addColorStop(1, 'rgba(190, 130, 255, 0)');
    g.fillStyle = rg;
    g.beginPath(); g.arc(x, y, 34, 0, TAU); g.fill();
    g.fillStyle = 'rgba(220, 190, 255, 0.55)';
    g.beginPath(); g.arc(x, y, 1.8, 0, TAU); g.fill();
  }
}

function drawCrest(g, x, y, r, color, alpha) {
  g.save();
  g.translate(x, y);
  g.globalAlpha = alpha;
  g.strokeStyle = color;
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(0, -r);
  g.lineTo(r * 0.72, 0);
  g.lineTo(0, r);
  g.lineTo(-r * 0.72, 0);
  g.closePath();
  g.stroke();
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(0, -r * 0.6);
  g.lineTo(r * 0.43, 0);
  g.lineTo(0, r * 0.6);
  g.lineTo(-r * 0.43, 0);
  g.closePath();
  g.stroke();
  g.beginPath();
  g.moveTo(-r * 0.5, r * 0.5);
  g.lineTo(r * 0.5, -r * 0.5);
  g.stroke();
  g.restore();
}

/* ============================================================
   RESULT
   ============================================================ */

function showResult() {
  if (!run || scene === 'result') return;
  scene = 'result';
  document.body.dataset.scene = 'result';
  paused = false;
  setHudVisible(false);
  showScreen('screen-result');

  const victory = run.victory;
  $('result-eyebrow').textContent = victory ? 'ZONE CLEARED' : 'THE STORM ENDS';
  $('result-title').textContent = victory ? 'Victory' : 'Defeat';

  const rankEl = $('rank-stamp');
  rankEl.textContent = run.rank;
  rankEl.dataset.rank = run.rank;

  setText('rs-zone', run.zone.name);
  setText('rs-kills', String(run.kills));
  setText('rs-coins', fmt(run.finalCoins));
  setText('rs-xp', fmt(run.finalXp));
  setText('rs-combo', String(run.maxCombo));
  const mm = Math.floor(run.time / 60);
  const ss = String(Math.floor(run.time % 60)).padStart(2, '0');
  setText('rs-time', `${mm}:${ss}`);

  let note;
  if (victory) {
    const next = ZONES.find((z) => z.unlock === state.level && z.id !== run.zone.id);
    note = next
      ? `${next.name} is now open.`
      : 'The next land waits at a higher level. Keep growing.';
  } else {
    note = 'You keep everything you earned. Spend it in the dojo and return sharper.';
  }
  $('result-note').textContent = note;
  saveNow();
}

/* ============================================================
   PAUSE / HELP
   ============================================================ */

function pauseGame() {
  if (scene !== 'run' || !run || run.over || paused) return;
  paused = true;
  $('pause-overlay').classList.remove('hidden');
  audio.ui();
}

function hidePause() {
  $('pause-overlay').classList.add('hidden');
  paused = false;
}

function resumeGame() {
  hidePause();
  lastTime = performance.now();
  audio.ui();
}

function togglePause() {
  if (paused) resumeGame();
  else pauseGame();
}

function openHelp() {
  $('help-overlay').classList.remove('hidden');
  audio.ui();
}

function closeHelp() {
  $('help-overlay').classList.add('hidden');
  audio.ui();
}

function abandonRun() {
  if (!run) {
    openDojo('map');
    return;
  }
  const zone = run.zone.id;
  state.stats.runs++;
  saveNow();
  run = null;
  paused = false;
  selectedZone = zone;
  openDojo('map');
  toast('Run abandoned. Rewards kept.', '', '🚪');
}

/* ============================================================
   INPUT SETUP
   ============================================================ */

function setupInput() {
  window.addEventListener('keydown', (e) => {
    audio.init();
    keys.add(e.code);

    if (e.code === 'Escape') {
      if (!$('help-overlay').classList.contains('hidden')) { closeHelp(); return; }
      if (!$('evolve-overlay').classList.contains('hidden')) { $('evolve-overlay').classList.add('hidden'); return; }
      if (scene === 'run') togglePause();
      return;
    }

    if (scene !== 'run' || paused || !run || run.over) return;

    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
    if (e.repeat) return;

    if (e.code === 'Space') castSkill('dash');
    else if (e.code === 'Digit1') castSkill('spark');
    else if (e.code === 'Digit2') castSkill('chain');
    else if (e.code === 'Digit3') castSkill('storm');
    else if (e.code === 'Digit4') castSkill('ultimate');
    else if (e.code === 'KeyM') toggleSfx();
  });

  window.addEventListener('keyup', (e) => {
    keys.delete(e.code);
  });

  window.addEventListener('blur', () => keys.clear());

  const joyEl = $('joystick');
  const knob = $('stick-knob');

  function moveStick(ev) {
    const r = joyEl.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = (ev.clientX - cx) / (r.width * 0.34);
    let dy = (ev.clientY - cy) / (r.height * 0.34);
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    joystick.x = dx;
    joystick.y = dy;
    knob.style.transform = `translate(${dx * 34}px, ${dy * 34}px)`;
  }

  joyEl.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    joystick.active = true;
    joystick.id = e.pointerId;
    joyEl.setPointerCapture(e.pointerId);
    moveStick(e);
  });
  joyEl.addEventListener('pointermove', (e) => {
    if (joystick.active && e.pointerId === joystick.id) moveStick(e);
  });
  const endStick = (e) => {
    if (e.pointerId !== joystick.id) return;
    joystick.active = false;
    joystick.id = null;
    joystick.x = 0;
    joystick.y = 0;
    knob.style.transform = '';
  };
  joyEl.addEventListener('pointerup', endStick);
  joyEl.addEventListener('pointercancel', endStick);

  $('skill-bar').addEventListener('pointerdown', (e) => {
    const btn = e.target.closest('[data-skill]');
    if (!btn) return;
    e.preventDefault();
    castSkill(btn.dataset.skill);
  });

  window.addEventListener('resize', resize);
}

function toggleSfx() {
  sfxOn = !sfxOn;
  audio.setEnabled(sfxOn && sdk.audioEnabled);
  const btn = $('btn-sfx');
  if (btn) btn.textContent = `SFX: ${sfxOn ? 'ON' : 'OFF'}`;
}

function resize() {
  view.w = window.innerWidth;
  view.h = window.innerHeight;
  canvas.width = Math.floor(view.w * DPR);
  canvas.height = Math.floor(view.h * DPR);
  canvas.style.width = `${view.w}px`;
  canvas.style.height = `${view.h}px`;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.imageSmoothingEnabled = true;
  if (run) {
    camera.x = camAxis(run.player.x, view.w, WORLD.w);
    camera.y = camAxis(run.player.y, view.h, WORLD.h);
  }
  updateTouchUI();
}

/* ============================================================
   UI SETUP
   ============================================================ */

function setupUI() {
  $('btn-start').addEventListener('click', () => {
    audio.init();
    sdk.gameReady();
    openDojo('map');
  });

  $('btn-title-help').addEventListener('click', openHelp);
  $('btn-help').addEventListener('click', openHelp);
  $('btn-help-close').addEventListener('click', closeHelp);

  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      activeTab = tab.dataset.tab;
      audio.ui();
      renderDojo();
    });
  });

  $('map-nodes').addEventListener('click', (e) => {
    const node = e.target.closest('[data-zone]');
    if (!node) return;
    selectedZone = node.dataset.zone;
    audio.ui();
    renderMap();
  });

  $('map-detail').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-enter]');
    if (!btn) return;
    audio.ui();
    startRun(btn.dataset.enter);
  });

  $('skills-grid').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-upgrade]');
    if (!btn) return;
    upgradeSkill(btn.dataset.upgrade);
  });

  $('shop-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-buy]');
    if (!btn) return;
    buyAttribute(btn.dataset.buy);
  });

  $('evolve-panel').addEventListener('click', (e) => {
    if (e.target.closest('[data-evolve-open]')) openEvolveOverlay();
  });

  $('evolve-choices').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-confirm-evolve]');
    if (!btn) return;
    chooseEvolution(btn.dataset.confirmEvolve);
  });

  $('btn-evolve-cancel').addEventListener('click', () => {
    $('evolve-overlay').classList.add('hidden');
    audio.ui();
  });

  $('btn-pause').addEventListener('click', pauseGame);
  $('btn-resume').addEventListener('click', resumeGame);

  $('btn-restart').addEventListener('click', () => {
    if (!run) return;
    const zone = run.zone.id;
    hidePause();
    startRun(zone);
  });

  $('btn-quit').addEventListener('click', () => {
    hidePause();
    abandonRun();
  });

  $('btn-sfx').addEventListener('click', toggleSfx);

  $('btn-run-again').addEventListener('click', () => {
    const zone = run ? run.zone.id : selectedZone;
    startRun(zone);
  });

  $('btn-to-dojo').addEventListener('click', () => {
    const zone = run ? run.zone.id : selectedZone;
    selectedZone = zone;
    run = null;
    openDojo('map');
  });

  $('help-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'help-overlay') closeHelp();
  });

  $('evolve-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'evolve-overlay') $('evolve-overlay').classList.add('hidden');
  });

  window.addEventListener('beforeunload', () => {
    if (state) sdk.save(JSON.stringify(state));
  });
}

/* ============================================================
   LOOP / BOOT
   ============================================================ */

function loop(ts) {
  frameCount++;
  const dt = Math.min(0.033, Math.max(0.001, (ts - lastTime) / 1000 || 0.016));
  lastTime = ts;

  try {
    if (scene === 'run' && run) {
      if (run.over) {
        run.endDelay -= dt;
        updateParticles(dt);
        updateTexts(dt);
        updateAmbient(dt);
        updateShake(dt);
        if (run.endDelay <= 0) showResult();
      } else if (!paused) {
        updateRun(dt);
      }
      render();
    }
  } catch (err) {
    window.__lastGameError = String(err && err.stack ? err.stack : err);
    console.error('[shinobi] frame error', err);
  }

  requestAnimationFrame(loop);
}

async function boot() {
  setupUI();
  setupInput();
  resize();

  const raw = await sdk.load();
  if (raw) {
    try {
      state = normalize(JSON.parse(raw));
    } catch (err) {
      state = defaultState();
    }
  }

  audio.setEnabled(sdk.audioEnabled);
  sdk.onAudioEnabledChange((enabled) => {
    audio.setEnabled(enabled && sfxOn);
  });
  sdk.onPause(() => {
    if (scene === 'run') pauseGame();
  });
  sdk.onResume(() => {
    // Wait for the player to resume deliberately. The pause overlay stays open.
  });

  const startBtn = $('btn-start');
  if (state.level > 1) startBtn.textContent = `Continue · Lv. ${state.level}`;

  showScreen('screen-title');
  scene = 'title';
  document.body.dataset.scene = 'title';
  lastTime = performance.now();

  requestAnimationFrame((ts) => {
    lastTime = ts;
    sdk.firstFrameReady();
    setTimeout(() => sdk.gameReady(), 60);
    requestAnimationFrame(loop);
  });
}

/* ============================================================
   DEBUG API (safe to keep in the prototype)
   ============================================================ */

window.__shinobi = {
  get state() { return state; },
  get run() { return run; },
  get scene() { return scene; },
  get keys() { return [...keys]; },
  get paused() { return paused; },
  get frames() { return frameCount; },
  startLoop() { requestAnimationFrame(loop); },
  setKey(code, down) {
    if (down) keys.add(code);
    else keys.delete(code);
  },
  addXp(n) { gainXp(n); if (scene === 'dojo') renderDojo(); },
  addCoins(n) {
    state.coins += n;
    saveSoon();
    if (scene === 'dojo') renderDojo();
  },
  setLevel(n) {
    const old = state.level;
    state.level = clamp(Math.floor(n), 1, 60);
    if (state.level > old) state.skillPoints += state.level - old;
    ensureUnlockedSkills(state, false);
    saveSoon();
    if (scene === 'dojo') renderDojo();
  },
  start(zone) { startRun(zone || selectedZone); },
  finish(victory = true) { finishRun(victory); },
  tick(seconds = 1) {
    if (!run) return;
    const steps = Math.min(600, Math.floor(seconds * 60));
    for (let i = 0; i < steps; i++) {
      if (run.over) break;
      updateRun(1 / 60);
    }
  },
  openDojo,
  reset() {
    state = defaultState();
    saveNow();
    location.reload();
  },
};

boot();
