/* ============================================================
   SHINOBI ASCENSION — vertical slice
   Vanilla Canvas 2D. Original IP. No dependencies.
   ============================================================ */

import {
  SAVE_VERSION, WORLD, MAX_LEVEL, xpForLevel, attrCost, MAX_ATTR_RANK, MAX_SKILL_RANK,
  HEROES, SKILLS, SKILLS_BY_HERO, ATTRIBUTES, ENEMIES, ZONES, THEMES,
  SKINS, BLADES, heroById, zoneById, skillById,
  skinById, bladeById, skillPrice, defaultLoadout, rageArtFor,
} from './data.js';
import { sdk } from './sdk.js';
import { audio } from './audio.js';
import { icon as iconSVG, heroPortrait, skillArt, bladeArt, statArt, weaponArt } from './icons.js';

const $ = (id) => document.getElementById(id);
const TAU = Math.PI * 2;
const DPR = Math.min(2, window.devicePixelRatio || 1);
const REDUCED_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

const canvas = $('game');
const ctx = canvas.getContext('2d', { alpha: false });

let view = { w: window.innerWidth, h: window.innerHeight };
let state = defaultState();
let scene = 'select';
let run = null;
let paused = false;
let selectedZone = 'forest';
let activeTab = 'map';
let shopTab = 'skins';
let selectedSlot = 0;
let lastTime = 0;
let keys = new Set();
let camera = { x: 0, y: 0 };
let shake = 0;
let flash = 0;
let healFlash = 0;
let sfxOn = true;
let saveTimer = 0;
let bannerTimer = 0;
let levelTimer = 0;
let frameCount = 0;
let touchHintSeen = false;
let booted = false;
let rageWarned = false;
let recentUpgrade = '';
let recentRage = 0;

const bgCache = new Map();
const hudCache = new Map();
const joystick = { x: 0, y: 0, active: false, id: null, originX: 0, originY: 0 };

// Five-slot arc: four equipped techniques plus the fixed dash.
const WORLD_ZOOM = 0.8;
const SKILL_LAYOUT = {
  dash: { right: 188, bottom: 12, size: 56 },
  slot0: { right: 150, bottom: 70, size: 56 },
  slot1: { right: 100, bottom: 118, size: 58 },
  slot2: { right: 38, bottom: 132, size: 62 },
  slot3: { right: 2, bottom: 66, size: 74 },
};

/* ============================================================
   STATE
   ============================================================ */

function blankAttributes() {
  return Object.fromEntries(ATTRIBUTES.map((a) => [a.id, 0]));
}

function blankStats() {
  return { kills: 0, runs: 0, bestCombo: 0, totalCoins: 0, bestRank: {} };
}

function defaultHeroProgress() {
  return {
    level: 1,
    xp: 0,
    coins: 0,
    skillPoints: 0,
    attributes: blankAttributes(),
    zoneClears: {},
    stats: blankStats(),
  };
}

function cloneHeroProgress(p) {
  const src = p || defaultHeroProgress();
  return {
    level: clamp(Math.floor(Number(src.level) || 1), 1, MAX_LEVEL),
    xp: Math.max(0, Math.floor(Number(src.xp) || 0)),
    coins: Math.max(0, Math.floor(Number(src.coins) || 0)),
    skillPoints: Math.max(0, Math.floor(Number(src.skillPoints) || 0)),
    attributes: { ...src.attributes },
    zoneClears: { ...src.zoneClears },
    stats: { ...src.stats, bestRank: { ...(src.stats?.bestRank || {}) } },
  };
}

function normalizeHeroProgress(raw) {
  const p = defaultHeroProgress();
  if (!raw || typeof raw !== 'object') return p;
  p.level = clamp(Math.floor(Number(raw.level) || 1), 1, MAX_LEVEL);
  p.xp = Math.max(0, Math.floor(Number(raw.xp) || 0));
  p.coins = Math.max(0, Math.floor(Number(raw.coins) || 0));
  p.skillPoints = Math.max(0, Math.floor(Number(raw.skillPoints) || 0));

  while (p.level < MAX_LEVEL && p.xp >= xpForLevel(p.level)) {
    p.xp -= xpForLevel(p.level);
    p.level++;
    p.skillPoints++;
  }
  if (p.level >= MAX_LEVEL) p.xp = 0;

  for (const a of ATTRIBUTES) {
    p.attributes[a.id] = clamp(Math.floor(Number(raw.attributes?.[a.id]) || 0), 0, MAX_ATTR_RANK);
  }
  for (const z of ZONES) {
    p.zoneClears[z.id] = Math.max(0, Math.floor(Number(raw.zoneClears?.[z.id]) || 0));
  }

  p.stats = {
    kills: Math.max(0, Math.floor(Number(raw.stats?.kills) || 0)),
    runs: Math.max(0, Math.floor(Number(raw.stats?.runs) || 0)),
    bestCombo: Math.max(0, Math.floor(Number(raw.stats?.bestCombo) || 0)),
    totalCoins: Math.max(0, Math.floor(Number(raw.stats?.totalCoins) || 0)),
    bestRank: {},
  };
  for (const z of ZONES) {
    const r = raw.stats?.bestRank?.[z.id];
    if (r === 'S' || r === 'A' || r === 'B' || r === 'C') p.stats.bestRank[z.id] = r;
  }
  return p;
}

function snapshotActiveProgress(s) {
  return cloneHeroProgress({
    level: s.level,
    xp: s.xp,
    coins: s.coins,
    skillPoints: s.skillPoints,
    attributes: s.attributes || blankAttributes(),
    zoneClears: s.zoneClears || {},
    stats: s.stats || blankStats(),
  });
}

function saveActiveHeroProgress(s) {
  if (!s || !s.hero) return;
  if (!s.heroProgress) s.heroProgress = {};
  const p = s.heroProgress[s.hero] || defaultHeroProgress();
  p.level = s.level;
  p.xp = s.xp;
  p.coins = s.coins;
  p.skillPoints = s.skillPoints;
  p.attributes = { ...(s.attributes || blankAttributes()) };
  p.zoneClears = { ...(s.zoneClears || {}) };
  p.stats = {
    ...(s.stats || blankStats()),
    bestRank: { ...(s.stats?.bestRank || {}) },
  };
  s.heroProgress[s.hero] = p;
}

function loadActiveHeroProgress(s, heroId = s.hero) {
  if (!s.heroProgress) s.heroProgress = {};
  const p = s.heroProgress[heroId] || defaultHeroProgress();
  s.level = clamp(Math.floor(Number(p.level) || 1), 1, MAX_LEVEL);
  s.xp = Math.max(0, Math.floor(Number(p.xp) || 0));
  s.coins = Math.max(0, Math.floor(Number(p.coins) || 0));
  s.skillPoints = Math.max(0, Math.floor(Number(p.skillPoints) || 0));
  s.attributes = { ...p.attributes };
  s.zoneClears = { ...p.zoneClears };
  s.stats = { ...p.stats, bestRank: { ...(p.stats?.bestRank || {}) } };
  s.heroProgress[heroId] = p;
  return p;
}

function switchHero(id) {
  if (!HEROES.some((h) => h.id === id)) return false;
  if (id !== state.hero) {
    saveActiveHeroProgress(state);
    state.hero = id;
    loadActiveHeroProgress(state, id);
  }
  ensureUnlockedSkills(state, false);
  saveActiveHeroProgress(state);
  return true;
}

function defaultState() {
  const freeSkins = SKINS.filter((s) => s.price === 0);
  const heroSkins = {};
  for (const h of HEROES) {
    heroSkins[h.id] = freeSkins.find((s) => s.hero === h.id)?.id || '';
  }
  const loadout = {};
  const evolutions = {};
  const heroProgress = {};
  for (const h of HEROES) {
    loadout[h.id] = defaultLoadout(h.id);
    evolutions[h.id] = null;
    heroProgress[h.id] = defaultHeroProgress();
  }
  const start = heroProgress.kaito;
  return {
    version: SAVE_VERSION,
    hero: 'kaito',
    level: start.level,
    xp: start.xp,
    coins: start.coins,
    skillPoints: start.skillPoints,
    attributes: { ...start.attributes },
    skillRanks: {},
    evolutions,
    loadout,
    zoneClears: { ...start.zoneClears },
    heroProgress,
    cosmetics: {
      heroSkins,
      bladeSkin: 'blade-borrowed',
      ownedSkins: freeSkins.map((s) => s.id),
      ownedBlades: BLADES.filter((b) => b.price === 0).map((b) => b.id),
    },
    stats: { ...start.stats, bestRank: { ...start.stats.bestRank } },
  };
}

function normalize(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  const out = defaultState();

  out.hero = HEROES.some((h) => h.id === s.hero) ? s.hero : 'kaito';
  out.level = clamp(Math.floor(Number(s.level) || 1), 1, MAX_LEVEL);
  out.xp = Math.max(0, Math.floor(Number(s.xp) || 0));
  out.coins = Math.max(0, Math.floor(Number(s.coins) || 0));
  out.skillPoints = Math.max(0, Math.floor(Number(s.skillPoints) || 0));

  while (out.level < MAX_LEVEL && out.xp >= xpForLevel(out.level)) {
    out.xp -= xpForLevel(out.level);
    out.level++;
    out.skillPoints++;
  }
  if (out.level >= MAX_LEVEL) out.xp = 0;

  for (const a of ATTRIBUTES) {
    out.attributes[a.id] = clamp(Math.floor(Number(s.attributes?.[a.id]) || 0), 0, MAX_ATTR_RANK);
  }

  for (const sk of SKILLS) {
    const rank = Math.floor(Number(s.skillRanks?.[sk.id]) || 0);
    if (rank > 0) out.skillRanks[sk.id] = clamp(rank, 1, MAX_SKILL_RANK);
  }

  for (const h of HEROES) {
    const rawEvo = s.evolutions?.[h.id] || (h.id === 'kaito' ? s.evolution : null);
    out.evolutions[h.id] = h.evolutions.some((e) => e.id === rawEvo) ? rawEvo : null;
  }

  for (const h of HEROES) {
    const source = Array.isArray(s.loadout?.[h.id])
      ? s.loadout[h.id]
      : Array.isArray(s.loadout)
        ? s.loadout
        : [];
    out.loadout[h.id] = source.slice(0, 4).map((id) => (typeof id === 'string' ? id : ''));
  }

  for (const z of ZONES) {
    out.zoneClears[z.id] = Math.max(0, Math.floor(Number(s.zoneClears?.[z.id]) || 0));
  }

  const ownedSkins = new Set(out.cosmetics.ownedSkins);
  const ownedBlades = new Set(out.cosmetics.ownedBlades);
  for (const id of s.cosmetics?.ownedSkins || []) {
    if (skinById(id)) ownedSkins.add(id);
  }
  for (const id of s.cosmetics?.ownedBlades || []) {
    if (bladeById(id)) ownedBlades.add(id);
  }
  out.cosmetics.ownedSkins = [...ownedSkins];
  out.cosmetics.ownedBlades = [...ownedBlades];

  for (const h of HEROES) {
    const selected = s.cosmetics?.heroSkins?.[h.id];
    const skin = skinById(selected);
    out.cosmetics.heroSkins[h.id] = skin && skin.hero === h.id && ownedSkins.has(skin.id)
      ? skin.id
      : SKINS.find((x) => x.hero === h.id && x.price === 0)?.id || '';
  }
  const blade = bladeById(s.cosmetics?.bladeSkin);
  out.cosmetics.bladeSkin = blade && ownedBlades.has(blade.id) ? blade.id : 'blade-borrowed';

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

  // v3 saves had one shared progression block. Give each hero an independent
  // profile, seeding every hero from the old shared values once for compatibility.
  const hasSavedProgress = !!(s.heroProgress && typeof s.heroProgress === 'object');
  const legacy = snapshotActiveProgress(out);
  out.heroProgress = {};
  for (const h of HEROES) {
    out.heroProgress[h.id] = hasSavedProgress
      ? normalizeHeroProgress(s.heroProgress[h.id])
      : cloneHeroProgress(legacy);
  }
  loadActiveHeroProgress(out);
  ensureUnlockedSkills(out, false);
  saveActiveHeroProgress(out);
  return out;
}

function fillLoadoutFor(s, heroId) {
  const active = SKILLS_BY_HERO[heroId].filter((sk) => sk.slot === 'active');
  const source = Array.isArray(s.loadout[heroId]) ? s.loadout[heroId] : [];
  const list = [];
  for (const id of source) {
    const sk = skillById(id);
    if (sk && sk.hero === heroId && sk.slot === 'active' && !list.includes(id)) list.push(id);
  }
  while (list.length < 4) list.push('');

  const unlocked = active.filter((sk) => s.skillRanks[sk.id] > 0).map((sk) => sk.id);
  for (let i = 0; i < 4; i++) {
    if (list[i] && !(s.skillRanks[list[i]] > 0)) list[i] = '';
    if (!list[i]) list[i] = unlocked.find((id) => !list.includes(id)) || '';
  }
  const execution = active.find((sk) => sk.type === 'execution' && s.skillRanks[sk.id] > 0);
  if (execution && !list.includes(execution.id)) list[3] = execution.id;
  s.loadout[heroId] = list.slice(0, 4);
}

function ensureUnlockedSkills(s, announce) {
  if (!s.heroProgress) s.heroProgress = {};
  saveActiveHeroProgress(s);
  for (const h of HEROES) {
    const p = s.heroProgress[h.id] || (s.heroProgress[h.id] = defaultHeroProgress());
    for (const sk of SKILLS_BY_HERO[h.id]) {
      if (sk.type === 'execution' && p.level < sk.unlock) {
        if (s.skillRanks[sk.id]) s.skillRanks[sk.id] = 0;
        continue;
      }
      if (p.level >= sk.unlock && !(s.skillRanks[sk.id] > 0)) {
        s.skillRanks[sk.id] = 1;
        if (announce && h.id === s.hero) {
          toast(`New technique: <b>${sk.name}</b> · equip it in the Arsenal`, '', iconSVG(sk.icon, 16));
          audio.unlock();
          if (run && run.player) ring(run.player.x, run.player.y, sk.color || '#43e0ff', 70);
        }
      }
    }
  }
  for (const h of HEROES) fillLoadoutFor(s, h.id);
}

function getHero() {
  return heroById(state.hero);
}

function previousZoneFor(zone) {
  if (!zone) return null;
  const idx = ZONES.findIndex((z) => z.id === zone.id);
  return idx > 0 ? ZONES[idx - 1] : null;
}

function isZoneUnlocked(zone) {
  if (!zone) return false;
  const prev = previousZoneFor(zone);
  return !prev || (state.zoneClears[prev.id] || 0) > 0;
}

function highestUnlockedZone() {
  return [...ZONES].reverse().find((z) => isZoneUnlocked(z)) || ZONES[0];
}

function getEvolution() {
  return getHero().evolutions.find((e) => e.id === state.evolutions[state.hero]) || null;
}

function getSkin() {
  const hero = getHero();
  return skinById(state.cosmetics.heroSkins[hero.id]) || SKINS.find((s) => s.hero === hero.id && s.price === 0);
}

function getBlade() {
  return bladeById(state.cosmetics.bladeSkin);
}

function getStats() {
  const hero = getHero();
  const b = hero.base;
  const a = state.attributes;
  const lvl = state.level;
  const evo = getEvolution();

  let maxHpMult = 1;
  let damageMult = 1;
  let speedMult = 1;
  let critBonus = 0;
  let armor = b.armor + a.armor * 0.015;
  let energyMult = 1;
  let energyRegenMult = 1;
  let dashMult = 1;
  let skillDamageMult = 1;
  let projectileMult = 1;
  let pierceBonus = 0;
  let cooldownMult = 1;
  let rangeMult = 1;
  let chainBonus = 0;
  let aoeKnockback = 0;
  let dashDamage = false;
  let dashFire = false;
  let burnBonus = 0;
  let zoneBonus = 1;
  let slowBonus = 0;
  let shieldBonus = 0;

  if (lvl >= hero.passive.unlock) {
    if (hero.id === 'kaito') critBonus += 0.1;
    else if (hero.id === 'mira') armor += 0.15;
    else if (hero.id === 'ren') skillDamageMult *= 1.15;
    else if (hero.id === 'sora') energyRegenMult *= 1.25;
    else if (hero.id === 'yuki') projectileMult *= 1.15;
    else if (hero.id === 'aster') energyRegenMult *= 1.25;
  }

  if (evo) {
    const e = evo.buffs;
    if (e.damageMult) damageMult *= e.damageMult;
    if (e.critBonus) critBonus += e.critBonus;
    if (e.speedMult) speedMult *= e.speedMult;
    if (e.dashCdMult) dashMult *= e.dashCdMult;
    if (e.energyMult) energyMult *= e.energyMult;
    if (e.maxHpMult) maxHpMult *= e.maxHpMult;
    if (e.armorBonus) armor += e.armorBonus;
    if (e.skillDamageMult) skillDamageMult *= e.skillDamageMult;
    if (e.projectileMult) projectileMult *= e.projectileMult;
    if (e.pierceBonus) pierceBonus += e.pierceBonus;
    if (e.cooldownMult) cooldownMult *= e.cooldownMult;
    if (e.energyRegenMult) energyRegenMult *= e.energyRegenMult;
    if (e.rangeMult) rangeMult *= e.rangeMult;
    if (e.chainBonus) chainBonus += e.chainBonus;
    if (e.aoeKnockback) aoeKnockback = Math.max(aoeKnockback, e.aoeKnockback);
    if (e.dashDamage) dashDamage = true;
    if (e.dashFire) dashFire = true;
    if (e.burnBonus) burnBonus += e.burnBonus;
    if (e.zoneBonus) zoneBonus *= e.zoneBonus;
    if (e.slowBonus) slowBonus += e.slowBonus;
    if (e.shieldBonus) shieldBonus += e.shieldBonus;
  }

  const raging = !!(run && run.player && run.player.rageActive > 0);
  if (raging) {
    damageMult *= 1.35;
    speedMult *= 1.1;
    critBonus += 0.1;
    energyRegenMult *= 1.5;
    skillDamageMult *= 1.2;
  }

  let maxHp = (b.hp + (lvl - 1) * b.hpPer + a.vitality * 8) * maxHpMult;
  let damage = (b.damage + (lvl - 1) * b.damagePer + a.power * 2) * damageMult;
  let speed = (b.speed + a.agility * 4) * speedMult;
  let crit = b.crit + a.focus * 0.005 + critBonus;
  const energyMax = b.energy + a.focus * 2;

  return {
    hero,
    maxHp,
    damage,
    speed,
    crit: clamp(crit, 0, 0.8),
    energyMax,
    energyRegen: b.regen * energyRegenMult,
    energyMult,
    costMult: energyMult * (raging ? 0.75 : 1),
    dashMult,
    skillDamageMult,
    projectileMult,
    pierceBonus,
    cooldownMult,
    rangeMult,
    chainBonus,
    aoeKnockback,
    dashDamage,
    dashFire,
    burnBonus,
    zoneBonus,
    slowBonus,
    shieldBonus,
    armor: clamp(armor, 0, 0.7),
    evo,
    raging,
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
  let cd = sk.cd * (1 - 0.06 * (rank - 1)) * st.cooldownMult;
  if (sk.type === 'dash') cd *= st.dashMult;
  return Math.max(0.2, cd);
}

function skillCost(sk) {
  return sk.energy * getStats().costMult;
}

/* ============================================================
   UTILITIES
   ============================================================ */

function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function rand(a, b) { return a + Math.random() * (b - a); }
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
  const screens = $('screens');
  if (screens) screens.style.display = id ? '' : 'none';
  document.querySelectorAll('.screen').forEach((s) => {
    s.classList.toggle('active', s.id === id);
  });
}

function setHudVisible(visible) {
  const hud = $('hud');
  hud.classList.toggle('hidden', !visible);
  hud.setAttribute('aria-hidden', String(!visible));
  updateTouchUI();
}

function resetJoystick() {
  joystick.active = false;
  joystick.id = null;
  joystick.x = 0;
  joystick.y = 0;
  const knob = $('stick-knob');
  if (knob) knob.style.transform = '';
  const el = $('joystick');
  if (el) el.classList.add('hidden');
}

function updateTouchUI() {
  const coarse = !!(window.matchMedia && (
    window.matchMedia('(any-pointer: coarse)').matches ||
    window.matchMedia('(pointer: coarse)').matches
  ));
  const active = coarse && scene === 'run' && !paused && !!run && !run.over &&
    run.phase !== 'intermission' && run.phase !== 'cleared' && run.phase !== 'bossdeath' &&
    !run.execution;
  const layer = $('touch-layer');
  if (layer) layer.classList.toggle('hidden', !active);
  if (!active) resetJoystick();
}

function showTouchHint() {
  if (touchHintSeen) return;
  if (!(window.matchMedia && (
    window.matchMedia('(any-pointer: coarse)').matches ||
    window.matchMedia('(pointer: coarse)').matches
  ))) return;
  touchHintSeen = true;
  const el = $('touch-hint');
  if (!el) return;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3800);
}

function hideTouchHint() {
  const el = $('touch-hint');
  if (el) el.classList.add('hidden');
}

function toast(html, kind = '', icon = '') {
  if (run?.execution) return;
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
  if (run?.execution) return;
  const el = $('level-banner');
  el.innerHTML = `<span>LEVEL UP</span><b>${level}</b>`;
  el.classList.remove('hidden');
  clearTimeout(levelTimer);
  levelTimer = setTimeout(() => el.classList.add('hidden'), 1800);
}

function showWaveClear(sub = 'Catch your breath') {
  const el = $('wave-clear');
  if (!el) return;
  $('wave-clear-sub').textContent = sub;
  el.classList.remove('hidden');
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';
}

function hideWaveClear() {
  const el = $('wave-clear');
  if (el) el.classList.add('hidden');
}

function showBossVictory(name) {
  const el = $('boss-victory');
  if (!el) return;
  const kicker = el.querySelector('p');
  if (kicker) kicker.textContent = 'BOSS DEFEATED · CHAPTER CLEARED';
  $('boss-victory-name').textContent = name;
  $('boss-victory-stars').textContent = '★ ★ ★ ★';
  el.classList.remove('hidden');
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';
}

function hideBossVictory() {
  const el = $('boss-victory');
  if (el) el.classList.add('hidden');
}

/* ============================================================
   SAVE
   ============================================================ */

function saveSoon() {
  if (!booted) return;
  saveActiveHeroProgress(state);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 300);
}

async function saveNow() {
  if (!booted) return false;
  saveActiveHeroProgress(state);
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
  while (state.level < MAX_LEVEL && state.xp >= xpForLevel(state.level)) {
    state.xp -= xpForLevel(state.level);
    state.level++;
    state.skillPoints++;
    gained++;
    onLevelUp();
  }
  if (state.level >= MAX_LEVEL) state.xp = 0;
  if (gained) saveSoon();
}

function onLevelUp() {
  const lvl = state.level;
  const hero = getHero();
  audio.levelUp();
  ensureUnlockedSkills(state, true);

  if (lvl === hero.passive.unlock) {
    toast(`Passive unlocked: <b>${hero.passive.name}</b>`, 'gold', iconSVG(hero.passive.icon, 16));
  }
  if (lvl === 10) {
    toast('Evolution available in the <b>Evolve</b> tab.', 'gold', iconSVG('static', 16));
  }

  if (scene === 'run' && run && run.player) {
    const st = getStats();
    run.player.maxHp = st.maxHp;
    run.player.maxEnergy = st.energyMax;
    run.player.hp = Math.min(st.maxHp, run.player.hp + st.maxHp * 0.2);
    run.player.energy = st.energyMax;
    run.player.loadout = (state.loadout[state.hero] || []).slice(0, 4);
    buildSkillBar();
    ring(run.player.x, run.player.y, '#ffd166', 70);
    showLevelBanner(lvl);
  }

  if (scene === 'dojo') renderDojo();
}

/* ============================================================
   DOJO
   ============================================================ */

/* ============================================================
   HERO SELECT
   ============================================================ */

function openHeroSelect() {
  scene = 'select';
  document.body.dataset.scene = 'select';
  run = null;
  paused = false;
  shake = 0;
  flash = 0;
  healFlash = 0;
  hidePause();
  hideBossVictory();
  hideWaveClear();
  $('low-hp').classList.add('hidden');
  $('toasts').innerHTML = '';
  ['pause-overlay', 'evolve-overlay', 'help-overlay', 'intermission-overlay'].forEach((id) => $(id)?.classList.add('hidden'));
  setHudVisible(false);
  showScreen('screen-select');
  saveActiveHeroProgress(state);
  ensureUnlockedSkills(state, false);
  renderHeroSelect();
  audio.duckMusic(false);
  audio.playMusic('dojo');
}

function renderHeroSelect() {
  const roster = $('hero-roster');
  if (!roster) return;
  saveActiveHeroProgress(state);
  const hero = getHero();
  const skin = skinById(state.cosmetics.heroSkins[hero.id]) || SKINS.find((s) => s.hero === hero.id && s.price === 0);
  const elementLabels = { kaito: 'STORM', mira: 'IRON', ren: 'EMBER', sora: 'SILK', yuki: 'WIND', aster: 'ARCANE' };
  const weaponLabels = { kaito: 'KATANA', mira: 'WARHAMMER', ren: 'WAR FAN', sora: 'SILK WHIP', yuki: 'STORM BOW', aster: 'ARCANE STAFF' };
  const maxHp = Math.max(...HEROES.map((h) => h.base.hp));
  const maxDmg = Math.max(...HEROES.map((h) => h.base.damage));
  const maxSpd = Math.max(...HEROES.map((h) => h.base.speed));
  const maxArm = Math.max(...HEROES.map((h) => h.base.armor));

  const screen = $('screen-select');
  if (screen) {
    screen.style.setProperty('--hero-color', hero.color);
    screen.style.setProperty('--hero-accent', hero.accent);
  }

  const art = $('selected-hero-art');
  if (art) art.innerHTML = heroPortrait(hero, { palette: skin?.palette, size: 320, stage: true, animate: !REDUCED_MOTION });
  setText('selected-hero-level', String(state.level));
  const el = $('selected-element');
  if (el) el.textContent = elementLabels[hero.id] || hero.role;
  setText('selected-hero-role', `${hero.role.toUpperCase()} · ${hero.title.toUpperCase()}`);
  setText('selected-hero-name', hero.name.toUpperCase());
  setText('selected-hero-title', hero.title);
  setText('selected-weapon', `WEAPON · ${weaponLabels[hero.id] || 'BLADE'}`);
  const weaponEl = $('selected-weapon-art');
  if (weaponEl) weaponEl.innerHTML = weaponArt(hero.id, hero.color, 36);
  setText('selected-hero-blurb', hero.blurb);

  const statRows = [
    { key: 'HP', value: hero.base.hp, max: maxHp, color: '#ff5c6c' },
    { key: 'DMG', value: hero.base.damage, max: maxDmg, color: '#ffb347' },
    { key: 'SPD', value: hero.base.speed, max: maxSpd, color: '#63e6a4' },
    { key: 'ARM', value: Math.round(hero.base.armor * 100), max: Math.round(maxArm * 100), color: '#43e0ff' },
  ];
  $('selected-stats').innerHTML = statRows.map((s) => {
    const pct = clamp((s.value / Math.max(1, s.max)) * 100, 12, 100);
    return `<div class="stat-line"><span>${s.key}</span><div class="stat-track"><i style="width:${pct}%;background:${s.color}"></i></div><b>${s.value}${s.key === 'ARM' ? '%' : ''}</b></div>`;
  }).join('');

  const skills = SKILLS_BY_HERO[hero.id].filter((sk) => sk.slot === 'active');
  $('selected-skills').innerHTML = skills.map((sk) => {
    const unlocked = skillRank(sk.id) > 0;
    return `<div class="preview-skill ${unlocked ? '' : 'locked'} ${sk.type === 'execution' && unlocked ? 'execution' : ''}" title="${sk.name}${unlocked ? '' : ` · unlocks at level ${sk.unlock}`}">
      ${skillArt(sk, 38)}
      <span>${sk.name}</span>
    </div>`;
  }).join('');

  const passive = hero.passive;
  const pUnlocked = state.level >= passive.unlock;
  $('selected-passive').innerHTML = `<span class="passive-badge ${pUnlocked ? '' : 'locked'}">${iconSVG(passive.icon, 16)}</span>
    <span><b>${passive.name}</b><em>${pUnlocked ? 'ACTIVE' : `UNLOCKS AT LV. ${passive.unlock}`}</em><small>${passive.desc}</small></span>`;

  roster.innerHTML = HEROES.map((h) => {
    const selected = h.id === state.hero;
    const s = skinById(state.cosmetics.heroSkins[h.id]) || SKINS.find((x) => x.hero === h.id && x.price === 0);
    const p = state.heroProgress?.[h.id];
    return `<button class="roster-card ${selected ? 'selected' : ''}" data-hero="${h.id}" role="listitem" type="button" style="--hero-color:${h.color}">
      <span class="roster-level">LV ${p?.level || 1}</span>
      <span class="roster-portrait">${heroPortrait(h, { palette: s?.palette, size: 62 })}</span>
      <span class="roster-name">${h.name}</span>
      <span class="roster-role">${h.role}</span>
    </button>`;
  }).join('');

  const btn = $('btn-enter-camp');
  if (btn) btn.textContent = `ENTER THE CAMP AS ${hero.name.toUpperCase()}`;
}

function cycleHero(dir) {
  const idx = HEROES.findIndex((h) => h.id === state.hero);
  switchHero(HEROES[(idx + dir + HEROES.length) % HEROES.length].id);
  saveSoon();
  audio.ui();
  renderHeroSelect();
}

function chooseHero(id) {
  if (!switchHero(id)) return;
  saveSoon();
  audio.unlock();
  openDojo('map');
}

/* ============================================================
   CAMP / HUB
   ============================================================ */

function openDojo(tab) {
  scene = 'dojo';
  document.body.dataset.scene = 'dojo';
  run = null;
  paused = false;
  $('hud')?.classList.remove('cinematic');
  shake = 0;
  flash = 0;
  healFlash = 0;
  hidePause();
  hideBossVictory();
  hideWaveClear();
  $('low-hp').classList.add('hidden');
  $('toasts').innerHTML = '';
  ['pause-overlay', 'evolve-overlay', 'help-overlay', 'intermission-overlay'].forEach((id) => $(id)?.classList.add('hidden'));
  setHudVisible(false);
  if (tab) activeTab = tab;
  if (!ZONES.some((z) => z.id === selectedZone)) selectedZone = 'forest';
  if (!isZoneUnlocked(zoneById(selectedZone))) selectedZone = highestUnlockedZone().id;
  if (!state.loadout[state.hero]) fillLoadoutFor(state, state.hero);
  showScreen('screen-dojo');
  renderDojo();
  audio.duckMusic(false);
  audio.playMusic('dojo');
  if (state.level === 1 && state.stats.runs === 0) {
    toast('Clear the <b>Bamboo Forest</b> to begin your legend.', '', iconSVG('forest', 16));
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
  const hero = getHero();
  const skin = getSkin();
  const evo = getEvolution();
  const hub = $('hub-hero');
  if (hub) {
    hub.innerHTML = `<div class="hub-portrait">${heroPortrait(hero, { palette: skin?.palette, size: 46 })}</div>
      <div class="hub-identity">
        <span class="eyebrow">${hero.role}</span>
        <strong>${hero.name}</strong>
        <em>${evo ? evo.name : hero.title}</em>
      </div>`;
  }

  setText('dojo-level', String(state.level));
  setText('dojo-coins', fmt(state.coins));
  const need = xpForLevel(state.level);
  setWidth('dojo-xp', (state.xp / need) * 100);
  setText('dojo-xp-text', `${Math.floor(state.xp)} / ${need} XP`);

  const sp = state.skillPoints;
  const sb = $('badge-skills');
  if (sb) {
    sb.classList.toggle('hidden', sp <= 0);
    if (sp > 0) sb.textContent = String(sp);
  }

  const eb = $('badge-evolve');
  if (eb) eb.classList.toggle('hidden', !(state.level >= 10 && !evo));
}

function renderMap() {
  const nodes = ZONES.map((z) => {
    const open = isZoneUnlocked(z);
    const prev = previousZoneFor(z);
    const clears = state.zoneClears[z.id] || 0;
    const rank = state.stats.bestRank[z.id] || '';
    const cls = [
      'map-node',
      open ? '' : 'locked',
      clears ? 'cleared' : '',
      selectedZone === z.id ? 'selected' : '',
    ].join(' ');
    const sub = !open ? 'LOCKED' : clears ? `CLEARED ×${clears}${rank ? ` · ${rank}` : ''}` : 'OPEN';
    return `
      <button class="${cls}" style="left:${z.map.x}%;top:${z.map.y}%" data-zone="${z.id}" aria-label="${z.name}${open ? '' : `, clear ${prev ? prev.name : 'the previous chapter'} first`}">
        <span class="node-icon">${iconSVG(z.icon, 22)}</span>
        <span class="node-label">${z.name}</span>
        <span class="node-sub">${sub}</span>
      </button>`;
  }).join('');

  $('map-nodes').innerHTML = nodes;
  const cleared = ZONES.filter((z) => (state.zoneClears[z.id] || 0) > 0).length;
  setText('map-progress', `${cleared} / ${ZONES.length} CHAPTERS`);
  renderMapDetail();
}

function renderMapDetail() {
  const z = zoneById(selectedZone);
  const idx = ZONES.findIndex((x) => x.id === z.id);
  const open = isZoneUnlocked(z);
  const prev = previousZoneFor(z);
  const clears = state.zoneClears[z.id] || 0;
  const rank = state.stats.bestRank[z.id] || '—';
  const boss = ENEMIES[z.boss];
  const prevBoss = prev ? ENEMIES[prev.boss] : null;
  const hero = getHero();
  const tags = z.tags.map((t) => `<span>${t}</span>`).join('');
  const unlockLabel = !prev ? 'OPEN' : open ? 'OPEN' : `Defeat ${prevBoss.name}`;
  const rows = `
    <div class="detail-rows">
      <div><span>Unlock</span><b>${unlockLabel}</b></div>
      <div><span>Boss</span><b>${boss.name}</b></div>
      <div><span>Waves</span><b>${z.waves.length} + boss</b></div>
      <div><span>Clears</span><b>${clears}</b></div>
      <div><span>Best rank</span><b>${rank}</b></div>
      <div><span>First clear</span><b class="gold">◈ ${z.clear.coins} · ${z.clear.xp} XP</b></div>
    </div>`;

  const action = open
    ? `<button class="primary detail-enter" data-enter="${z.id}">DEPLOY ${hero.name.toUpperCase()}</button>`
    : `<div class="detail-lock">Defeat <b>${prevBoss.name}</b> in <b>${prev.name}</b> to open this chapter.</div>`;

  $('map-detail').innerHTML = `
    <div class="detail-watermark">${iconSVG(z.icon, 150)}</div>
    <p class="detail-kicker">CHAPTER ${String(idx + 1).padStart(2, '0')} · ${open ? 'OPEN' : 'LOCKED'}</p>
    <h3>${z.name}</h3>
    <p class="detail-desc">${z.desc}</p>
    <div class="detail-tags">${tags}</div>
    ${rows}
    ${action}`;
}

function renderLoadout() {
  const hero = getHero();
  const list = state.loadout[hero.id] || ['', '', '', ''];
  selectedSlot = clamp(selectedSlot, 0, 3);
  const slots = [];
  for (let i = 0; i < 4; i++) {
    const sk = skillById(list[i]);
    const equipped = sk && sk.hero === hero.id && sk.slot === 'active' && skillRank(sk.id) > 0;
    slots.push(`<button class="loadout-slot ${i === selectedSlot ? 'selected' : ''} ${equipped ? '' : 'empty'}" data-slot="${i}" type="button">
      <span class="slot-key">${i + 1}</span>
      <span class="slot-art">${equipped ? skillArt(sk, 38) : iconSVG('lock', 20)}</span>
      <span class="slot-meta"><b>${equipped ? sk.name : 'EMPTY SLOT'}</b><span>${equipped ? (sk.type === 'execution' ? 'EXECUTION · F' : `RANK ${skillRank(sk.id)}`) : 'SELECT, THEN EQUIP'}</span></span>
    </button>`);
  }
  $('loadout-slots').innerHTML = slots.join('');
  $('loadout-hint').textContent = `Slot ${selectedSlot + 1} selected · equip a technique below`;
}

function renderSkills() {
  setText('skill-points', String(state.skillPoints));
  renderLoadout();

  const hero = getHero();
  const loadout = state.loadout[hero.id] || [];
  const skills = SKILLS_BY_HERO[hero.id];
  const cards = skills.map((sk) => {
    const rank = skillRank(sk.id);
    const unlocked = rank > 0;
    const maxed = rank >= MAX_SKILL_RANK;
    const isDash = sk.slot === 'dash';
    const equipped = loadout.includes(sk.id);
    const pips = Array.from({ length: MAX_SKILL_RANK }, (_, i) =>
      `<i class="${i < rank ? 'on' : ''}"></i>`).join('');

    let upgrade;
    if (!unlocked) upgrade = `<button data-open-shop="${sk.id}" type="button">UNLOCK IN SHOP</button>`;
    else if (maxed) upgrade = `<button disabled type="button">MAX RANK</button>`;
    else if (state.skillPoints < 1) upgrade = `<button disabled type="button">NEED SKILL POINT</button>`;
    else upgrade = `<button data-upgrade="${sk.id}" type="button">UPGRADE · 1 SP</button>`;

    let equip;
    if (isDash) equip = `<button disabled type="button">ALWAYS EQUIPPED</button>`;
    else if (!unlocked) equip = `<button disabled type="button">LOCKED</button>`;
    else equip = `<button class="equip" data-equip="${sk.id}" type="button">${equipped ? 'MOVE TO SLOT' : 'EQUIP'}</button>`;

    return `
      <article class="skill-card ${unlocked ? 'unlocked' : 'locked'} ${sk.type === 'execution' ? 'execution' : ''}">
        <div class="skill-icon">${skillArt(sk, 52)}</div>
        <div>
          <div class="skill-head">
            <h3>${sk.name}</h3>
            <span class="skill-rank">${isDash ? 'DASH' : sk.type === 'execution' ? (unlocked ? 'EXECUTION' : `LV. ${sk.unlock}`) : (unlocked ? `RANK ${rank}` : `LV. ${sk.unlock}`)}</span>
          </div>
          <p class="skill-desc">${sk.desc}</p>
          <p class="skill-lock">${unlocked ? sk.rankNote : `Unlocks at level ${sk.unlock}, or buy it in the shop`}</p>
          <div class="pips">${pips}</div>
        </div>
        <div class="skill-actions">${upgrade}${equip}</div>
      </article>`;
  }).join('');

  const passive = hero.passive;
  const pUnlocked = state.level >= passive.unlock;
  const passiveCard = `
    <article class="skill-card passive ${pUnlocked ? 'unlocked' : 'locked'}">
      <div class="skill-icon">${iconSVG(passive.icon, 30)}</div>
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
      <article class="skill-card evolution unlocked">
        <div class="skill-icon">${iconSVG(evo.icon, 30)}</div>
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
  document.querySelectorAll('.shop-tab').forEach((t) => {
    const on = t.dataset.shoptab === shopTab;
    t.classList.toggle('active', on);
    t.setAttribute('aria-selected', String(on));
  });

  if (shopTab === 'skins') {
    const skins = [...SKINS].sort((a, b) => {
      const ac = a.hero === state.hero ? 0 : 1;
      const bc = b.hero === state.hero ? 0 : 1;
      return ac - bc;
    });
    $('shop-list').innerHTML = skins.map((skin) => {
      const hero = heroById(skin.hero);
      const owned = state.cosmetics.ownedSkins.includes(skin.id);
      const equipped = state.cosmetics.heroSkins[hero.id] === skin.id;
      const canBuy = state.coins >= skin.price;
      let action;
      if (equipped) action = `<span class="shop-equipped">EQUIPPED</span>`;
      else if (owned) action = `<button class="shop-buy" data-equip-skin="${skin.id}" type="button">EQUIP</button>`;
      else action = `<button class="shop-buy" data-buy-skin="${skin.id}" ${canBuy ? '' : 'disabled'} type="button">UNLOCK</button>`;
      return `<article class="shop-card ${equipped ? 'equipped' : ''}">
        <div class="shop-card-art">${heroPortrait(hero, { palette: skin.palette, size: 96 })}</div>
        <span class="shop-kicker">${hero.name} · ${hero.role}</span>
        <h3>${skin.name}</h3>
        <p>${skin.desc}</p>
        <div class="shop-card-foot">
          <span class="shop-price">${skin.price ? `<span class="coin-glyph">◈</span> ${fmt(skin.price)}` : 'FREE'}</span>
          ${action}
        </div>
      </article>`;
    }).join('');
    return;
  }

  if (shopTab === 'blades') {
    $('shop-list').innerHTML = BLADES.map((blade) => {
      const owned = state.cosmetics.ownedBlades.includes(blade.id);
      const equipped = state.cosmetics.bladeSkin === blade.id;
      const canBuy = state.coins >= blade.price;
      let action;
      if (equipped) action = `<span class="shop-equipped">EQUIPPED</span>`;
      else if (owned) action = `<button class="shop-buy" data-equip-blade="${blade.id}" type="button">EQUIP</button>`;
      else action = `<button class="shop-buy" data-buy-blade="${blade.id}" ${canBuy ? '' : 'disabled'} type="button">UNLOCK</button>`;
      return `<article class="shop-card ${equipped ? 'equipped' : ''}">
        <div class="shop-card-art">${bladeArt(blade, state.attributes.power, 96)}</div>
        <span class="shop-kicker">BLADE · ${blade.shape.toUpperCase()}</span>
        <h3>${blade.name}</h3>
        <p>${blade.desc}</p>
        <div class="shop-card-foot">
          <span class="shop-price">${blade.price ? `<span class="coin-glyph">◈</span> ${fmt(blade.price)}` : 'FREE'}</span>
          ${action}
        </div>
      </article>`;
    }).join('');
    return;
  }

  const hero = getHero();
  const techniques = SKILLS_BY_HERO[hero.id].filter((sk) => sk.slot === 'active');
  $('shop-list').innerHTML = techniques.map((sk) => {
    const rank = skillRank(sk.id);
    const owned = rank > 0;
    const price = skillPrice(sk);
    const canBuy = state.coins >= price;
    const levelLocked = sk.type === 'execution' && state.level < sk.unlock;
    let action;
    if (levelLocked) action = `<button class="shop-buy" disabled type="button">LV. ${sk.unlock}</button>`;
    else if (owned) action = `<button class="shop-buy" data-focus-skill="${sk.id}" type="button">UPGRADE IN ARSENAL</button>`;
    else action = `<button class="shop-buy" data-buy-technique="${sk.id}" ${canBuy ? '' : 'disabled'} type="button">UNLOCK</button>`;
    return `<article class="shop-card ${owned ? 'equipped' : ''}">
      <div class="shop-card-art">${skillArt(sk, 84)}</div>
      <span class="shop-kicker">${hero.name} · TECHNIQUE</span>
      <h3>${sk.name}</h3>
      <p>${sk.desc}</p>
      <div class="shop-card-foot">
        <span class="shop-price">${owned ? `RANK ${rank}` : `<span class="coin-glyph">◈</span> ${fmt(price)}`}</span>
        ${action}
      </div>
    </article>`;
  }).join('');
}

function renderEvolve() {
  const hero = getHero();
  const evos = hero.evolutions;
  const current = getEvolution();

  if (state.level < 10) {
    const pct = (state.level / 10) * 100;
    $('evolve-panel').innerHTML = `
      <div class="evo-locked">
        <div class="lock-big">${iconSVG('lock', 34)}</div>
        <h3>${hero.name}'s storm is not ready</h3>
        <p>Reach level 10 to choose a path.<br>You are level <b>${state.level}</b>.</p>
        <div class="evo-progress"><i style="width:${pct}%"></i></div>
      </div>`;
    return;
  }

  if (current) {
    $('evolve-panel').innerHTML = `
      <div class="evo-current">
        <div class="detail-kicker">PATH CHOSEN · ${hero.name.toUpperCase()}</div>
        <h3>${current.name}</h3>
        <p>${current.desc}</p>
        <div class="detail-tags">${current.perks.map((p) => `<span>${p}</span>`).join('')}</div>
      </div>
      <p class="save-state" style="margin-top:14px">This choice is permanent for this hero.</p>`;
    return;
  }

  $('evolve-panel').innerHTML = `
    <div class="evolve-choices">
      ${evos.map((e, i) => `
        <article class="evo-card ${i === 1 ? 'path-b' : ''}">
          <div class="evo-icon">${iconSVG(e.icon, 30)}</div>
          <h3>${e.name}</h3>
          <p>${e.desc}</p>
          <ul>${e.perks.map((p) => `<li>${p}</li>`).join('')}</ul>
          <button class="primary" data-evolve-open="${e.id}" type="button">Choose ${e.name}</button>
        </article>`).join('')}
    </div>`;
}

/* ============================================================
   ACTIONS
   ============================================================ */

function upgradeSkill(id, source = 'dojo') {
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
  toast(`<b>${sk.name}</b> upgraded to rank ${rank + 1}`, '', iconSVG(sk.icon, 16));
  saveSoon();
  if (source === 'run' && run) {
    renderIntermission();
  } else {
    renderDojoHeader();
    renderSkills();
  }
}

function buyAttribute(id, source = 'dojo') {
  const a = ATTRIBUTES.find((x) => x.id === id);
  if (!a) return;
  const rank = state.attributes[id] || 0;
  const cost = attrCost(rank);
  if (source === 'run' && run?.attrBought) {
    audio.error();
    toast('Only one attribute upgrade per intermission.', '', iconSVG('power', 16));
    return;
  }
  if (rank >= MAX_ATTR_RANK || state.coins < cost) {
    audio.error();
    return;
  }
  const hpBefore = run && source === 'run' ? run.player.maxHp : 0;
  state.coins -= cost;
  state.attributes[id] = rank + 1;
  if (source === 'run' && run) {
    run.attrBought = true;
    run.attrPick = id;
  }
  recentUpgrade = id;
  audio.coin();
  toast(`<b>${a.name}</b> rank ${rank + 1}`, 'gold', iconSVG(a.icon, 16));
  saveSoon();

  if (source === 'run' && run) {
    const st = getStats();
    run.player.maxHp = st.maxHp;
    run.player.maxEnergy = st.energyMax;
    const gained = st.maxHp - hpBefore;
    if (gained > 0) run.player.hp = Math.min(st.maxHp, run.player.hp + gained);
    renderIntermission();
  } else {
    renderDojoHeader();
    renderShop();
  }
}

function buyTechnique(id) {
  const sk = skillById(id);
  if (!sk || sk.hero !== state.hero || sk.slot !== 'active' || skillRank(id) > 0) return;
  if (sk.type === 'execution' && state.level < sk.unlock) {
    toast(`<b>${sk.name}</b> unlocks at level ${sk.unlock}.`, '', iconSVG('lock', 16));
    audio.error();
    return;
  }
  const price = skillPrice(sk);
  if (state.coins < price) {
    audio.error();
    return;
  }
  state.coins -= price;
  state.skillRanks[id] = 1;
  fillLoadoutFor(state, state.hero);
  audio.unlock();
  toast(`Technique unlocked: <b>${sk.name}</b>`, 'gold', iconSVG(sk.icon, 16));
  saveSoon();
  renderDojoHeader();
  renderShop();
}

function buySkin(id) {
  const skin = skinById(id);
  if (!skin || state.cosmetics.ownedSkins.includes(id)) return;
  if (state.coins < skin.price) {
    audio.error();
    return;
  }
  state.coins -= skin.price;
  state.cosmetics.ownedSkins.push(id);
  state.cosmetics.heroSkins[skin.hero] = id;
  audio.unlock();
  toast(`Skin unlocked: <b>${skin.name}</b>`, 'gold', iconSVG('star', 16));
  saveSoon();
  renderDojoHeader();
  renderShop();
}

function equipSkin(id) {
  const skin = skinById(id);
  if (!skin || !state.cosmetics.ownedSkins.includes(id)) return;
  state.cosmetics.heroSkins[skin.hero] = id;
  audio.ui();
  toast(`<b>${skin.name}</b> equipped`, '', iconSVG('star', 16));
  saveSoon();
  renderDojoHeader();
  renderShop();
}

function buyBlade(id) {
  const blade = bladeById(id);
  if (!blade || state.cosmetics.ownedBlades.includes(id)) return;
  if (state.coins < blade.price) {
    audio.error();
    return;
  }
  state.coins -= blade.price;
  state.cosmetics.ownedBlades.push(id);
  state.cosmetics.bladeSkin = id;
  audio.unlock();
  toast(`Blade unlocked: <b>${blade.name}</b>`, 'gold', iconSVG('star', 16));
  saveSoon();
  renderDojoHeader();
  renderShop();
}

function equipBlade(id) {
  const blade = bladeById(id);
  if (!blade || !state.cosmetics.ownedBlades.includes(id)) return;
  state.cosmetics.bladeSkin = id;
  audio.ui();
  toast(`<b>${blade.name}</b> equipped`, '', iconSVG('star', 16));
  saveSoon();
  renderShop();
}

function equipSkill(id) {
  const sk = skillById(id);
  if (!sk || sk.hero !== state.hero || sk.slot !== 'active' || skillRank(id) <= 0) {
    audio.error();
    return;
  }
  const list = state.loadout[state.hero].slice(0, 4);
  for (let i = 0; i < 4; i++) {
    if (list[i] === id) list[i] = '';
  }
  list[selectedSlot] = id;
  state.loadout[state.hero] = list;
  audio.equip();
  toast(`<b>${sk.name}</b> equipped to slot ${selectedSlot + 1}`, '', iconSVG(sk.icon, 16));
  saveSoon();
  renderSkills();
}

function focusSkill(id) {
  const sk = skillById(id);
  if (!sk) return;
  activeTab = 'skills';
  audio.ui();
  renderDojo();
  toast(`Upgrade <b>${sk.name}</b> in the Arsenal.`, '', iconSVG(sk.icon, 16));
}

function healCost() {
  return 60 + state.level * 10;
}

function healRun() {
  if (!run || run.phase !== 'intermission') return;
  const cost = healCost();
  if (state.coins < cost || run.player.hp >= run.player.maxHp) {
    audio.error();
    return;
  }
  state.coins -= cost;
  const amount = run.player.maxHp * 0.3;
  run.player.hp = Math.min(run.player.maxHp, run.player.hp + amount);
  run.particles.push({
    type: 'ring', x: run.player.x, y: run.player.y,
    life: 0.6, max: 0.6, size: 50, color: '#5ee0a0',
  });
  audio.heal();
  toast('Vitality restored.', 'green', iconSVG('heal', 16));
  saveSoon();
  renderIntermission();
}

function openEvolveOverlay() {
  if (state.level < 10 || getEvolution()) return;
  const hero = getHero();
  const evos = hero.evolutions;
  $('evolve-choices').innerHTML = evos.map((e, i) => `
    <article class="evo-card ${i === 1 ? 'path-b' : ''}">
      <div class="evo-icon">${iconSVG(e.icon, 30)}</div>
      <h3>${e.name}</h3>
      <p>${e.desc}</p>
      <ul>${e.perks.map((p) => `<li>${p}</li>`).join('')}</ul>
      <button class="primary" data-confirm-evolve="${e.id}" type="button">Confirm ${e.name}</button>
    </article>`).join('');
  $('evolve-overlay').classList.remove('hidden');
  audio.ui();
}

function chooseEvolution(id) {
  const hero = getHero();
  const evo = hero.evolutions.find((e) => e.id === id);
  if (!evo || state.evolutions[hero.id]) return;
  state.evolutions[hero.id] = id;
  $('evolve-overlay').classList.add('hidden');
  audio.unlock();
  toast(`Path chosen: <b>${evo.name}</b>`, 'gold', iconSVG(evo.icon, 16));
  saveNow();
  renderDojo();
}

/* ============================================================
   BETWEEN WAVES
   ============================================================ */

function openIntermission(nextIsBoss) {
  if (!run || run.over || run.phase === 'intermission') return;
  hideWaveClear();
  run.phase = 'intermission';
  run.nextIsBoss = !!nextIsBoss;
  run.attrBought = false;
  run.attrPick = '';
  run.projectiles = [];
  run.zones = [];
  run.player.dashTimer = 0;

  $('intermission-title').textContent = nextIsBoss ? 'THE BOSS WAITS' : 'CATCH YOUR BREATH';
  $('inter-kicker').textContent = `WAVE ${run.wave} CLEARED`;
  $('inter-next').textContent = nextIsBoss
    ? 'NEXT: CHAPTER BOSS'
    : `NEXT: WAVE ${run.wave + 1}`;
  $('btn-next-wave').textContent = nextIsBoss ? 'FACE THE BOSS' : 'NEXT WAVE';
  $('btn-inter-heal').textContent = `HEAL 30% · ◈ ${healCost()}`;

  recentUpgrade = '';
  renderIntermission();
  const overlay = $('intermission-overlay');
  overlay.classList.remove('hidden');
  overlay.style.animation = 'none';
  void overlay.offsetWidth;
  overlay.style.animation = '';
  audio.duckMusic(true);
  audio.wave();
  updateTouchUI();
  saveSoon();
}

function renderIntermission() {
  if (!run) return;
  setText('inter-coins', fmt(state.coins));

  const recent = recentUpgrade;
  recentUpgrade = '';
  const kicker = $('inter-kicker');
  if (kicker) kicker.textContent = `WAVE ${run.wave} CLEARED · ${run.attrBought ? 'UPGRADE CLAIMED' : 'CHOOSE ONE UPGRADE'}`;

  const cards = ATTRIBUTES.map((a, i) => {
    const rank = state.attributes[a.id] || 0;
    const maxed = rank >= MAX_ATTR_RANK;
    const cost = attrCost(rank);
    const current = rank === 0 ? 'No bonus yet' : a.effect(rank);
    const next = maxed ? '' : ` → <em>${a.next(rank)}</em>`;
    const picked = run.attrPick === a.id;
    const locked = run.attrBought && !picked;
    const stars = Array.from({ length: MAX_ATTR_RANK }, (_, s) =>
      `<i class="${s < rank ? 'on' : ''}"></i>`).join('');
    let button;
    if (maxed) button = `<button class="stat-buy max" disabled type="button">MASTERED</button>`;
    else if (picked) button = `<button class="stat-buy picked" disabled type="button">CLAIMED</button>`;
    else if (locked) button = `<button class="stat-buy" disabled type="button">LOCKED</button>`;
    else button = `<button class="stat-buy" data-buy-run="${a.id}" ${state.coins < cost ? 'disabled' : ''} type="button"><span class="coin-glyph">◈</span> ${fmt(cost)}</button>`;
    return `<article class="stat-card ${recent === a.id ? 'leveled' : ''} ${picked ? 'picked' : ''} ${locked ? 'locked-choice' : ''}" style="--i:${i};--stat-color:${a.color}">
      <div class="stat-card-head"><span class="stat-short">${a.short}</span><span class="stat-rank">RANK ${rank}</span></div>
      <div class="stat-art-wrap">${statArt(a.id, rank, a.color, 88)}</div>
      <h3>${a.name}</h3>
      <p class="stat-desc">${a.desc}</p>
      <p class="stat-effect">${current}${next}</p>
      <div class="stat-stars">${stars}</div>
      ${button}
    </article>`;
  }).join('');
  $('inter-shop').innerHTML = cards;

  const hero = getHero();
  const unlocked = SKILLS_BY_HERO[hero.id].filter((sk) => skillRank(sk.id) > 0);
  const skillRows = unlocked.map((sk) => {
    const rank = skillRank(sk.id);
    const maxed = rank >= MAX_SKILL_RANK;
    const label = maxed ? 'MAX' : state.skillPoints < 1 ? 'NO SP' : 'UPGRADE · 1 SP';
    return `<div class="inter-skill-card">
      <div class="inter-skill-icon">${skillArt(sk, 42)}</div>
      <div>
        <h3>${sk.name}</h3>
        <p>Rank ${rank} / ${MAX_SKILL_RANK} · ${sk.rankNote}</p>
      </div>
      <button data-upgrade-run="${sk.id}" ${maxed || state.skillPoints < 1 ? 'disabled' : ''} type="button">${label}</button>
    </div>`;
  }).join('');

  const section = document.querySelector('.inter-skill-section .section-label em');
  if (section) section.textContent = `${state.skillPoints} skill point${state.skillPoints === 1 ? '' : 's'}`;
  $('inter-skills').innerHTML = skillRows || '<p class="modal-hint">No techniques unlocked yet.</p>';

  const cost = healCost();
  const healBtn = $('btn-inter-heal');
  healBtn.textContent = `HEAL 30% · ◈ ${cost}`;
  healBtn.disabled = run.player.hp >= run.player.maxHp || state.coins < cost;
}

function nextWave() {
  if (!run || run.phase !== 'intermission') return;
  const bossNext = run.nextIsBoss;
  $('intermission-overlay').classList.add('hidden');
  audio.duckMusic(false);
  run.phase = 'wave';
  run.nextIsBoss = false;
  updateTouchUI();
  if (bossNext) spawnBoss();
  else spawnWave(run.wave + 1);
  saveSoon();
}

/* ============================================================
   RUN SETUP
   ============================================================ */

function startRun(zoneId) {
  const zone = zoneById(zoneId);
  if (!isZoneUnlocked(zone)) {
    const prev = previousZoneFor(zone);
    toast(`Clear <b>${prev ? prev.name : 'the previous chapter'}</b> first to open this chapter.`, '', iconSVG('lock', 16));
    audio.error();
    return;
  }

  run = null;
  audio.init();
  hidePause();
  hideWaveClear();
  hideBossVictory();
  audio.duckMusic(false);
  audio.playMusic(zone.theme);
  ['evolve-overlay', 'help-overlay', 'intermission-overlay'].forEach((id) => $(id)?.classList.add('hidden'));
  showScreen(null);
  setHudVisible(true);
  $('hud')?.classList.remove('cinematic');
  $('toasts').innerHTML = '';
  $('low-hp').classList.add('hidden');

  const hero = getHero();
  const skin = getSkin();
  const blade = getBlade();
  const st = getStats();
  const dash = SKILLS_BY_HERO[hero.id].find((sk) => sk.slot === 'dash');
  const loadout = (state.loadout[hero.id] || []).slice(0, 4);
  const execution = SKILLS_BY_HERO[hero.id].find((sk) => sk.type === 'execution' && skillRank(sk.id) > 0);
  if (execution && !loadout.includes(execution.id)) {
    loadout[3] = execution.id;
    state.loadout[hero.id] = loadout.slice(0, 4);
  }
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
    shield: 0,
    dashTimer: 0,
    dashDir: { x: 0, y: 1 },
    dashHits: new Set(),
    cooldowns: Object.fromEntries(SKILLS.map((s) => [s.id, 0])),
    trail: [],
    trailTimer: 0,
    walkPhase: 0,
    moving: false,
    attackAnim: 0,
    swingSide: 1,
    ghosts: [],
    dashStart: null,
    hero,
    skin,
    blade,
    loadout,
    dashSkill: dash,
    executionCharge: 0,
    rage: 0,
    rageMax: 100,
    rageActive: 0,
    rageDuration: 8,
    rageUsed: false,
    hpPulse: 0,
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
    fx: [],
    zones: [],
    pendingSpawns: [],
    ambient: makeAmbient(zone.theme),
    bg: getBackground(zone.theme),
    wave: 0,
    phase: 'wave',
    phaseTimer: 0,
    clearTimer: 0,
    nextIsBoss: false,
    bossSpawned: false,
    boss: null,
    bossDeath: null,
    execution: null,
    attrBought: false,
    attrPick: '',
    fireworkTimer: 0,
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
  healFlash = 0;
  rageWarned = false;

  $('hud-zone').textContent = zone.name;
  $('hud-wave').textContent = `WAVE 1 / ${zone.waves.length}`;
  $('boss-wrap').classList.add('hidden');
  $('wave-banner').classList.add('hidden');
  $('combo').classList.add('hidden');
  $('level-banner').classList.add('hidden');

  setupHudHero(hero, skin);
  setupRageUI(hero, skin, st);
  buildSkillBar();
  updateHUD();
  updateTouchUI();
  showTouchHint();

  camera.x = camAxis(p.x, view.w / WORLD_ZOOM, WORLD.w);
  camera.y = camAxis(p.y, view.h / WORLD_ZOOM, WORLD.h);

  spawnWave(1);
}

function spawnWave(n) {
  if (!run) return;
  run.wave = n;
  run.phase = 'wave';
  const list = run.zone.waves[n - 1] || [];
  list.forEach((type, i) => {
    const pos = spawnPoint();
    const elite = n === run.zone.waves.length && i % 4 === 0;
    run.pendingSpawns.push({
      x: pos.x, y: pos.y, type, elite,
      t: 0.4 + i * 0.13,
      max: 0.4 + i * 0.13,
    });
  });

  // Reinforcement pack: extends the wave without putting every enemy on screen
  // at once, and forces the player to keep moving instead of bursting one pack.
  if (list.length) {
    const extra = Math.max(3, Math.ceil(list.length * 0.55));
    for (let i = 0; i < extra; i++) {
      const type = list[(i * 3 + 1) % list.length];
      const pos = spawnPoint();
      const elite = n === run.zone.waves.length && i % 3 === 0;
      const t = 3.8 + i * 0.18;
      run.pendingSpawns.push({ x: pos.x, y: pos.y, type, elite, t, max: t });
    }
  }
  showBanner(`WAVE ${n}`);
  audio.wave();
}

function spawnBoss() {
  if (!run) return;
  run.phase = 'boss';
  run.bossSpawned = true;
  const p = run.player;
  const x = clamp(p.x, 260, WORLD.w - 260);
  const y = clamp(p.y - 380, 220, WORLD.h - 220);
  const e = makeEnemy(run.zone.boss, x, y);
  e.atkTimer = 1.2;
  run.enemies.push(e);
  run.boss = e;

  $('boss-wrap').classList.remove('hidden');
  $('boss-name').textContent = e.def.name;
  $('boss-hp').style.width = '100%';
  showBanner('BOSS');
  audio.playMusic('boss');
  audio.boss();
  shake = 10;
  ring(x, y, e.def.color, 90);
}

function spawnPoint() {
  const p = run.player;
  for (let i = 0; i < 24; i++) {
    const a = Math.random() * TAU;
    const d = rand(480, 760);
    const x = clamp(p.x + Math.cos(a) * d, 70, WORLD.w - 70);
    const y = clamp(p.y + Math.sin(a) * d, 70, WORLD.h - 70);
    if (Math.hypot(x - p.x, y - p.y) > 340) return { x, y };
  }
  return { x: clamp(p.x + 480, 70, WORLD.w - 70), y: p.y };
}

function makeEnemy(type, x, y, opts = {}) {
  const def = ENEMIES[type];
  const elite = !!opts.elite;
  const lvl = state.level;
  const clears = Math.min(5, state.zoneClears[run.zone.id] || 0);
  const tier = run.zone.tier;
  const boss = !!def.boss;
  const levelScale = 1 + (boss ? 0.06 : 0.115) * (lvl - 1);
  const hpTier = Math.pow(tier, boss ? 0.7 : 0.9);
  const dmgLevel = 1 + (boss ? 0.035 : 0.055) * (lvl - 1);
  const dmgTier = Math.pow(tier, boss ? 0.55 : 0.6);
  const hp = Math.round(def.hp * levelScale * hpTier * (1 + 0.25 * clears) * (elite ? 1.45 : 1));
  const dmg = def.dmg * dmgLevel * dmgTier * (elite ? 1.18 : 1);

  return {
    type,
    def,
    x, y,
    hp,
    maxHp: hp,
    dmg,
    radius: def.radius + (elite ? 2 : 0),
    atkTimer: rand(0.6, 1.4),
    windup: 0,
    stun: 0,
    slow: 0,
    burnT: 0,
    burnDps: 0,
    burnTick: 0,
    hitFlash: 0,
    knockX: 0,
    knockY: 0,
    boss,
    elite,
    enraged: false,
    telegraph: null,
    dead: false,
    walkPhase: rand(0, TAU),
    spawnT: 0.35,
    attackAnim: 0,
    phase: rand(0, TAU),
    guard: 0,
    guardTimer: rand(1.5, 3),
    charging: 0,
    chargeDir: null,
    chargeHitCd: 0,
    attackIndex: 0,
    deathAlpha: 1,
  };
}

function makeAmbient(themeId) {
  const list = [];
  const isEmber = themeId === 'volcano' || themeId === 'fortress';
  const isShrine = themeId === 'shrine';
  const isSky = themeId === 'sky';
  for (let i = 0; i < 64; i++) {
    list.push({
      x: rand(0, WORLD.w),
      y: rand(0, WORLD.h),
      vx: rand(-7, 7),
      vy: isEmber ? rand(-18, -5) : isSky ? rand(4, 14) : rand(-5, 5),
      size: rand(1.2, 3.6),
      alpha: rand(0.12, 0.45),
      phase: rand(0, TAU),
      type: themeId === 'caverns' ? 'shard' : isEmber ? 'ember' : isShrine ? 'bubble' : isSky ? 'snow' : 'dust',
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

function executionSkillFor(heroId) {
  return SKILLS_BY_HERO[heroId].find((sk) => sk.type === 'execution') || null;
}

function startExecution(sk, info) {
  if (!run || run.execution) return;
  const p = run.player;
  const hero = getHero();
  const normals = run.enemies.filter((e) => !e.dead && !e.boss);
  const boss = run.enemies.find((e) => !e.dead && e.boss) || null;
  const duration = REDUCED_MOTION ? 1.45 : 2.55;
  const killSpan = Math.max(0.35, duration - 0.85);
  const queue = normals.map((e, i) => ({
    e,
    at: 0.3 + (i / Math.max(1, normals.length)) * killSpan + rand(0, 0.04),
  }));

  run.execution = {
    t: 0,
    duration,
    sk,
    hero,
    color: info.color,
    element: info.element,
    queue,
    boss,
    bossAt: 0.58,
    bossDone: false,
    finale: false,
    kills: 0,
  };

  p.invuln = Math.max(p.invuln, duration + 0.6);
  p.attackTimer = Math.max(p.attackTimer, duration);
  p.dashTimer = 0;
  run.projectiles = run.projectiles.filter((pr) => pr.from !== 'enemy');
  $('hud')?.classList.add('cinematic');
  updateTouchUI();

  audio.execution();
  executionOpeningFx(hero.id, info.color);
  ring(p.x, p.y, info.color, 180);
  shake = REDUCED_MOTION ? 0 : 13;
}

function updateExecution(dt) {
  const ex = run.execution;
  if (!ex) return;

  ex.t += dt;
  run.time += dt;

  while (ex.queue.length && ex.t >= ex.queue[0].at) {
    const item = ex.queue.shift();
    if (item.e.dead) continue;
    executionKillFx(ex.hero.id, item.e.x, item.e.y, ex.color, ex.element);
    killEnemy(item.e);
    ex.kills++;
    run.combo++;
    run.comboTimer = 3;
    run.maxCombo = Math.max(run.maxCombo, run.combo);
  }

  if (ex.boss && !ex.bossDone && ex.t >= ex.bossAt) {
    ex.bossDone = true;
    const boss = ex.boss;
    if (!boss.dead) {
      boss.guard = 0;
      const rank = Math.max(1, skillRank(ex.sk.id));
      const bossDmg = Math.max(getStats().damage * 9, boss.maxHp * (0.22 + 0.03 * Math.min(5, rank - 1)));
      const capped = Math.max(1, Math.min(bossDmg, Math.floor(boss.hp - 1)));
      executionBossFx(boss.x, boss.y, ex.color, ex.element);
      if (boss.hp > 2) damageEnemy(boss, capped, { dot: true, noCrit: true, noVariance: true });
      if (!boss.dead) {
        boss.stun = Math.max(boss.stun, ex.sk.stun || 2.4);
        boss.slow = Math.max(boss.slow, 2.5);
      }
      shake = Math.max(shake, REDUCED_MOTION ? 0 : 16);
    }
  }

  if (ex.t >= 1.24 && !ex.finale) {
    ex.finale = true;
    executionFinaleFx(ex.hero.id, ex.color);
    shake = Math.max(shake, REDUCED_MOTION ? 0 : 17);
  }

  updateParticles(dt);
  updateTexts(dt);
  updateFx(dt);
  updateAmbient(dt);
  updateShake(dt);
  updateCamera(dt);
  updateHUD();

  if (ex.t >= ex.duration) finishExecution();
}

function finishExecution() {
  if (!run?.execution) return;
  run.execution = null;
  $('hud')?.classList.remove('cinematic');
  run.enemies = run.enemies.filter((e) => !e.dead);
  run.player.invuln = Math.max(run.player.invuln, 0.35);
  if (run.phase === 'wave') updatePhase(0);
  updateHUD();
  updateTouchUI();
}

function executionOpeningFx(heroId, color) {
  if (!run) return;
  const p = run.player;
  fxShockwave(p.x, p.y, color, 190, 0.8);
  fxWind(p.x, p.y, color, 130);
  burst(p.x, p.y, color, 32, 360, 4.5);
  ring(p.x, p.y, color, 160);

  if (heroId === 'kaito') {
    for (let i = 0; i < 10; i++) {
      const a = rand(0, TAU);
      const d = rand(40, 290);
      fxStrike(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, color);
    }
    fxLine(p.x, p.y, p.x, p.y - 240, color, 18, 0.55, 'beam');
  } else if (heroId === 'mira') {
    for (let i = 0; i < 12; i++) {
      const a = rand(0, TAU);
      const d = rand(40, 240);
      fxRockSpikes(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 42, 4, color);
    }
    fxShockwave(p.x, p.y, '#ffe6a3', 260, 0.9);
  } else if (heroId === 'ren') {
    fxFlameRing(p.x, p.y, 170, color);
    for (let i = 0; i < 9; i++) {
      const a = rand(0, TAU);
      const d = rand(40, 250);
      fxFlameRing(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 50, i % 2 ? '#ffd166' : color);
    }
  } else if (heroId === 'sora') {
    fxWebBurst(p.x, p.y, 240, color);
    for (let i = 0; i < 8; i++) {
      const a = rand(0, TAU);
      const d = rand(60, 300);
      fxSilkLine(p.x, p.y, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, color, 0.55);
    }
  } else if (heroId === 'yuki') {
    for (let i = 0; i < 10; i++) {
      const a = rand(0, TAU);
      const d = rand(80, 330);
      fxLine(p.x, p.y - 260, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, i % 2 ? color : '#d8ffe8', 3, 0.5, 'arrow');
    }
    fxWindSlash(p.x, p.y, 220, color);
  } else {
    fxArcaneSigil(p.x, p.y, 250, color);
    for (let i = 0; i < 8; i++) {
      const a = rand(0, TAU);
      const d = rand(60, 290);
      fxArcaneSigil(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 36, color);
    }
  }
}

function executionKillFx(heroId, x, y, color, element) {
  if (!run) return;
  const p = run.player;
  if (heroId === 'kaito') {
    fxLine(p.x, p.y, x, y, color, 3, 0.28, 'beam');
    fxStrike(x, y, color);
    fxShockwave(x, y, color, 38, 0.28);
  } else if (heroId === 'mira') {
    fxRockSpikes(x, y, 44, 5, color);
    fxShockwave(x, y, color, 58, 0.32);
  } else if (heroId === 'ren') {
    fxFlameRing(x, y, 56, color);
    burst(x, y, '#ffd166', 9, 180, 2.8);
  } else if (heroId === 'sora') {
    fxSilkLine(p.x, p.y, x, y, color, 0.34);
    fxWebBurst(x, y, 42, color);
  } else if (heroId === 'yuki') {
    fxLine(p.x, p.y - 160, x, y, color, 3, 0.34, 'arrow');
    fxWindSlash(x, y, 44, color);
  } else {
    fxLine(p.x, p.y, x, y, color, 3, 0.32, 'beam');
    fxArcaneSigil(x, y, 42, color);
  }
  burst(x, y, color, 7, 190, 2.5);
}

function executionBossFx(x, y, color, element) {
  fxShockwave(x, y, color, 120, 0.65);
  fxWind(x, y, color, 90);
  if (element === 'iron') { fxRockSpikes(x, y, 60, 8, color); burst(x, y, '#ffd166', 18, 260, 4); }
  else if (element === 'fire') { fxFlameRing(x, y, 100, color); }
  else if (element === 'silk') { fxWebBurst(x, y, 100, color); fxSilkLine(x, y, run.player.x, run.player.y, color, 0.5); }
  else if (element === 'wind') { fxWindSlash(x, y, 100, color); }
  else if (element === 'arcane') { fxArcaneSigil(x, y, 100, color); }
  else { fxStrike(x, y, color); fxLine(x, y, run.player.x, run.player.y, color, 8, 0.4, 'beam'); }
  burst(x, y, color, 20, 280, 4);
}

function executionFinaleFx(heroId, color) {
  if (!run) return;
  const p = run.player;
  fxShockwave(p.x, p.y, color, 320, 0.9);
  fxWind(p.x, p.y, color, 220);
  ring(p.x, p.y, color, 250);
  if (heroId === 'kaito') {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      fxStrike(p.x + Math.cos(a) * 190, p.y + Math.sin(a) * 190, color);
    }
  } else if (heroId === 'mira') {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      fxRockSpikes(p.x + Math.cos(a) * 150, p.y + Math.sin(a) * 150, 54, 5, color);
    }
  } else if (heroId === 'ren') {
    fxFlameRing(p.x, p.y, 210, color);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      fxFlameRing(p.x + Math.cos(a) * 120, p.y + Math.sin(a) * 120, 55, i % 2 ? '#ffd166' : color);
    }
  } else if (heroId === 'sora') {
    fxWebBurst(p.x, p.y, 260, color);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      fxSilkLine(p.x, p.y, p.x + Math.cos(a) * 300, p.y + Math.sin(a) * 300, color, 0.6);
    }
  } else if (heroId === 'yuki') {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      fxLine(p.x, p.y - 260, p.x + Math.cos(a) * 300, p.y + Math.sin(a) * 300, i % 2 ? color : '#d8ffe8', 3, 0.55, 'arrow');
    }
    fxWindSlash(p.x, p.y, 250, color);
  } else {
    fxArcaneSigil(p.x, p.y, 280, color);
    fxArcaneSigil(p.x, p.y, 170, '#ffffff');
  }
  burst(p.x, p.y, color, 24, 360, 4.5);
}

function castSkill(id) {
  if (scene !== 'run' || !run || paused || run.over || run.execution) return;
  if (run.phase !== 'wave' && run.phase !== 'boss') return;
  const sk = skillById(id);
  if (!sk || sk.hero !== state.hero) return;
  if (!(skillRank(id) > 0)) {
    toast(`<b>${sk.name}</b> is not unlocked.`, '', iconSVG('lock', 16));
    audio.error();
    return;
  }

  const p = run.player;
  if ((p.cooldowns[id] || 0) > 0) return;

  const st = getStats();
  const cost = skillCost(sk);
  if (p.energy < cost) {
    audio.error();
    return;
  }
  if (sk.type === 'execution' && (p.executionCharge || 0) < 100) {
    audio.error();
    toast(`<b>${sk.name}</b> is still charging · ${Math.floor(p.executionCharge || 0)}%`, '', iconSVG('execution', 16));
    return;
  }

  if (sk.type === 'chain' && !nearestEnemy(p.x, p.y, (sk.range || 240) * st.rangeMult)) {
    audio.error();
    return;
  }

  p.energy -= cost;
  p.cooldowns[id] = skillCooldown(sk);
  const rank = Math.max(1, skillRank(id));
  const power = skillPower(id);
  const dmgBase = st.damage * power * st.skillDamageMult;
  const hero = getHero();
  const color = sk.color || hero.color;
  const element = sk.element;

  if (sk.type === 'execution') {
    p.executionCharge = 0;
    startExecution(sk, { rank, power, color, element, st });
    return;
  }

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
    p.ghostTimer = 0;
    p.dashStart = { x: p.x, y: p.y };
    if (sk.shield) p.shield = Math.max(p.shield, sk.shield + st.shieldBonus);
    if (sk.dashFire || st.dashFire) {
      spawnPlayerZone(p.x, p.y, 46, dmgBase * 0.55, '#ff7a3d', 2.2, 0);
    }
    const dashDist = sk.distance + 20 * (rank - 1);
    const ex = p.x + p.dashDir.x * dashDist;
    const ey = p.y + p.dashDir.y * dashDist;
    const persona = p.skin?.palette?.aura || color;
    fxDash(p.x, p.y, ex, ey, persona);
    fxWind(p.x, p.y, persona, 52);
    fxShockwave(p.x, p.y, persona, 38, 0.3);
    if (hero.id === 'kaito') {
      fxLightning([{ x: p.x, y: p.y }, { x: ex, y: ey }], persona, 3.6, 0.28);
      burst(ex, ey, persona, 8, 190, 2.6);
    } else if (hero.id === 'mira') {
      fxRockSpikes(ex, ey, 34, 4, persona);
      fxShockwave(ex, ey, persona, 62, 0.4);
      burst(ex, ey, '#ffe6a3', 10, 180, 2.8);
    } else if (hero.id === 'ren') {
      fxFlameRing(p.x, p.y, 42, persona);
      fxFlameRing(ex, ey, 34, persona);
      burst(ex, ey, '#ffd166', 9, 170, 2.4);
    } else if (hero.id === 'sora') {
      fxSilkLine(p.x, p.y, ex, ey, persona, 0.38);
      fxWebBurst(ex, ey, 38, persona);
    } else if (hero.id === 'yuki') {
      fxLine(p.x, p.y, ex, ey, persona, 4, 0.38, 'arrow');
      fxWindSlash(ex, ey, 50, persona);
    } else {
      fxArcaneSigil(p.x, p.y, 42, persona);
      fxArcaneSigil(ex, ey, 36, persona);
      fxLine(p.x, p.y, ex, ey, persona, 3, 0.34, 'beam');
    }
    audio.dash();
    for (let i = 0; i < 7; i++) {
      addParticle({
        x: p.x, y: p.y, vx: rand(-45, 45), vy: rand(-45, 45),
        life: 0.3, max: 0.3, size: rand(2, 5), color, type: 'spark',
      });
    }
    return;
  }

  if (sk.type === 'projectile') {
    const target = nearestEnemy(p.x, p.y, 900);
    let baseAng;
    if (target) {
      baseAng = Math.atan2(target.y - p.y, target.x - p.x);
      p.facing = { x: Math.cos(baseAng), y: Math.sin(baseAng) };
    } else {
      baseAng = Math.atan2(p.facing.y, p.facing.x);
    }
    const count = (sk.count || 1) + (sk.count && rank >= 3 ? 1 : 0) + (sk.count && rank >= 5 ? 1 : 0);
    const spread = sk.spread || 0;
    for (let i = 0; i < count; i++) {
      const ang = baseAng + (i - (count - 1) / 2) * spread;
      run.projectiles.push({
        x: p.x + Math.cos(ang) * 22,
        y: p.y + Math.sin(ang) * 22,
        vx: Math.cos(ang) * (sk.projSpeed || 790),
        vy: Math.sin(ang) * (sk.projSpeed || 790),
        radius: sk.aoeRadius ? 9 : 8,
        dmg: dmgBase * sk.mult * st.projectileMult,
        from: 'player',
        color,
        kind: sk.element === 'fire' ? 'ember' : sk.element === 'silk' ? 'thread' : sk.element === 'wind' ? 'arrow' : sk.element === 'arcane' ? 'arcane' : 'bolt',
        life: 1.35,
        aoe: sk.aoeRadius || 0,
        burn: !!sk.burn,
        slow: sk.slow || 0,
        pierce: (sk.pierce ? sk.pierce + (rank >= 3 ? 1 : 0) + (rank >= 5 ? 1 : 0) : 0) + st.pierceBonus,
        hitSet: new Set(),
        seed: rand(0, 1000),
      });
    }
    burst(p.x + Math.cos(baseAng) * 22, p.y + Math.sin(baseAng) * 22, color, 7, 170, 2.6);
    const ox = p.x + Math.cos(baseAng) * 18;
    const oy = p.y + Math.sin(baseAng) * 18;
    const tx = p.x + Math.cos(baseAng) * 68;
    const ty = p.y + Math.sin(baseAng) * 68;
    if (element === 'storm') fxLightning([{ x: ox, y: oy }, { x: tx, y: ty }], color, 2.4, 0.18);
    else if (element === 'fire') fxFlameRing(ox, oy, 26, color);
    else if (element === 'silk') fxSilkLine(ox, oy, tx, ty, color, 0.2);
    else if (element === 'wind') fxWindSlash(ox, oy, 30, color);
    else if (element === 'arcane') fxArcaneSigil(ox, oy, 26, color);
    else fxElementHit(element, ox, oy, color, 24);
    if (element === 'wind') audio.bow();
    else if (element === 'silk') audio.silk();
    else if (element === 'arcane') audio.arcane();
    else if (element === 'fire') audio.fire();
    else audio.cast();
    return;
  }

  if (sk.type === 'chain') {
    let target = nearestEnemy(p.x, p.y, (sk.range || 280) * st.rangeMult);
    if (!target) return;
    const hits = new Set();
    const points = [{ x: p.x, y: p.y }];
    const maxTargets = (sk.targets || 3) + (rank >= 3 ? 1 : 0) + (rank >= 5 ? 1 : 0) + st.chainBonus;
    const dmg = dmgBase * sk.mult;

    for (let i = 0; i < maxTargets && target; i++) {
      hits.add(target);
      points.push({ x: target.x, y: target.y });
      damageEnemy(target, dmg);
      if (sk.slow) target.slow = Math.max(target.slow, sk.slow + st.slowBonus);
      if (sk.burn) applyBurn(target, dmg * 0.16, 3 + st.burnBonus);
      if (element === 'storm') fxStrike(target.x, target.y, color);
      else if (element === 'silk') fxWebBurst(target.x, target.y, 28, color);
      target = nearestEnemy(target.x, target.y, (sk.chainRange || 190) * st.rangeMult, hits);
    }

    if (element === 'silk') {
      for (let i = 1; i < points.length - 1; i++) {
        fxSilkLine(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y, color, 0.3);
      }
      fxWebBurst(p.x, p.y, 46, color);
      audio.silk();
    } else {
      fxLightning(points, color, 4, 0.36);
      audio.chain();
    }
    shake = Math.max(shake, 5);
    return;
  }

  if (sk.type === 'beam') {
    const target = nearestEnemy(p.x, p.y, 620);
    const ang = target
      ? Math.atan2(target.y - p.y, target.x - p.x)
      : Math.atan2(p.facing.y, p.facing.x);
    p.facing = { x: Math.cos(ang), y: Math.sin(ang) };
    const length = (sk.range || 320) * st.rangeMult;
    const width = (sk.width || 76) * (1 + 0.05 * (rank - 1)) * st.rangeMult;
    const x1 = p.x;
    const y1 = p.y;
    const x2 = p.x + Math.cos(ang) * length;
    const y2 = p.y + Math.sin(ang) * length;
    const dmg = dmgBase * sk.mult;
    const hitSet = new Set();

    for (const e of run.enemies) {
      if (e.dead || hitSet.has(e)) continue;
      if (pointLineDistance(e.x, e.y, x1, y1, x2, y2) <= width / 2 + e.radius) {
        hitSet.add(e);
        damageEnemy(e, dmg);
        if (sk.knockback || st.aoeKnockback) {
          const mul = e.boss ? 35 : (sk.knockback || st.aoeKnockback) * 0.7;
          e.knockX += Math.cos(ang) * mul;
          e.knockY += Math.sin(ang) * mul;
        }
        if (sk.stun) e.stun = Math.max(e.stun, sk.stun);
        if (sk.slow) e.slow = Math.max(e.slow, sk.slow + st.slowBonus);
        if (sk.burn) applyBurn(e, dmg * 0.16, 3 + st.burnBonus);
        burst(e.x, e.y, color, 8, 180, 2.8);
      }
    }

    if (element === 'storm') {
      fxLightning([{ x: x1, y: y1 }, { x: x2, y: y2 }], color, 5, 0.34);
      fxShockwave(x2, y2, color, width, 0.4);
      fxWind(x1, y1, color, width * 1.1);
      audio.storm();
    } else if (element === 'iron') {
      fxLine(x1, y1, x2, y2, color, width, 0.34, 'beam');
      fxRockSpikes(x2, y2, 48, 5, color);
      fxShockwave(x2, y2, color, width, 0.45);
      audio.quake();
    } else if (element === 'wind') {
      fxLine(x1, y1, x2, y2, color, width, 0.34, 'arrow');
      fxWindSlash(x2, y2, 52, color);
      fxShockwave(x2, y2, color, width, 0.4);
      audio.wind();
    } else if (element === 'fire') {
      fxLine(x1, y1, x2, y2, color, width * 0.7, 0.3, 'beam');
      fxFlameRing(x2, y2, 54, color);
      audio.fire();
    } else if (element === 'silk') {
      fxSilkLine(x1, y1, x2, y2, color, 0.32);
      fxWebBurst(x2, y2, 48, color);
      audio.silk();
    } else {
      fxLine(x1, y1, x2, y2, color, width * 0.8, 0.32, 'beam');
      fxArcaneSigil(x2, y2, 48, color);
      audio.arcane();
    }
    shake = Math.max(shake, 9);
    return;
  }

  if (sk.type === 'zone') {
    const target = nearestEnemy(p.x, p.y, 620);
    const zx = target ? target.x : p.x;
    const zy = target ? target.y : p.y;
    const radius = (sk.radius || 150) * (1 + 0.12 * (rank - 1)) * st.rangeMult;
    spawnPlayerZone(zx, zy, radius, dmgBase * sk.mult, color, (sk.life || 4) * st.zoneBonus, (sk.slow || 0) + st.slowBonus);
    if (sk.id === 'a_meteor') { fxFlameRing(zx, zy, radius * 0.7, '#ff9a5c'); fxArcaneSigil(zx, zy, radius * 0.45, '#6ea8ff'); audio.fire(); }
    else if (element === 'fire') { fxFlameRing(zx, zy, radius * 0.8, color); audio.fire(); }
    else if (element === 'silk') { fxWebBurst(zx, zy, radius * 0.75, color); audio.silk(); }
    else if (element === 'wind') { fxWindSlash(zx, zy, radius * 0.75, color); audio.wind(); }
    else if (element === 'arcane') { fxArcaneSigil(zx, zy, radius * 0.7, color); audio.arcane(); }
    else if (element === 'iron') { fxRockSpikes(zx, zy, radius * 0.55, 5, color); audio.quake(); }
    else { fxShockwave(zx, zy, color, radius, 0.5); fxWind(zx, zy, color, radius); audio.cast(); }
    return;
  }

  if (sk.type === 'buff') {
    if (sk.heal) {
      const amount = p.maxHp * (sk.heal + 0.01 * (rank - 1));
      p.hp = Math.min(p.maxHp, p.hp + amount);
      addText(p.x, p.y - 34, `+${Math.round(amount)} HP`, '#63e6a4', true);
      healFlash = Math.max(healFlash, 0.6);
    }
    if (sk.shield) p.shield = Math.max(p.shield, sk.shield + st.shieldBonus + (rank - 1) * 0.5);
    if (sk.invuln) p.invuln = Math.max(p.invuln, sk.invuln + (rank - 1) * 0.05);
    if (sk.zoneRadius) {
      spawnPlayerZone(p.x, p.y, sk.zoneRadius, dmgBase * (sk.zoneDps || 0.9), color, (sk.zoneLife || 3) * st.zoneBonus, 0);
    }
    if (element === 'iron') { fxRockSpikes(p.x, p.y, 44, 4, color); fxShockwave(p.x, p.y, color, 82, 0.55); audio.quake(); }
    else if (element === 'fire') { fxFlameRing(p.x, p.y, 60, color); audio.fire(); }
    else if (element === 'silk') { fxWebBurst(p.x, p.y, 60, color); audio.silk(); }
    else if (element === 'wind') { fxWindSlash(p.x, p.y, 60, color); audio.wind(); }
    else if (element === 'arcane') { fxArcaneSigil(p.x, p.y, 58, color); audio.arcane(); }
    else { fxShockwave(p.x, p.y, color, 78, 0.55); fxWind(p.x, p.y, color, 60); audio.cast(); }
    ring(p.x, p.y, '#8effd1', 48);
    audio.heal();
    return;
  }

  if (sk.type === 'aoe') {
    const radius = (sk.radius || 150) * (1 + 0.12 * (rank - 1)) * st.rangeMult;
    const dmg = dmgBase * sk.mult;
    for (const e of run.enemies) {
      if (e.dead) continue;
      if (Math.hypot(e.x - p.x, e.y - p.y) <= radius + e.radius) {
        damageEnemy(e, dmg);
        const kb = sk.knockback || st.aoeKnockback;
        if (kb) {
          const a = Math.atan2(e.y - p.y, e.x - p.x);
          const mul = e.boss ? 40 : kb;
          e.knockX += Math.cos(a) * mul;
          e.knockY += Math.sin(a) * mul;
        }
        if (sk.stun) e.stun = Math.max(e.stun, sk.stun);
        if (sk.slow) e.slow = Math.max(e.slow, sk.slow + st.slowBonus);
        if (sk.burn) applyBurn(e, dmg * 0.16, 3 + st.burnBonus);
      }
    }
    if (sk.shield) p.shield = Math.max(p.shield, sk.shield + st.shieldBonus);
    run.particles.push({
      type: 'ring', x: p.x, y: p.y, life: 0.55, max: 0.55,
      size: radius, color,
    });
    if (element === 'storm') {
      fxShockwave(p.x, p.y, color, radius, 0.6);
      fxWind(p.x, p.y, color, radius * 0.8);
      const strikeCount = sk.mult >= 3 ? 7 : 4;
      for (let i = 0; i < strikeCount; i++) {
        const a = rand(0, TAU);
        const d = rand(radius * 0.25, radius * 0.95);
        fxStrike(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, color);
      }
      if (sk.mult >= 3) audio.ultimate(); else audio.storm();
    } else if (element === 'iron') {
      fxShockwave(p.x, p.y, color, radius, 0.65);
      for (let i = 0; i < 6; i++) {
        const a = rand(0, TAU);
        const d = rand(radius * 0.3, radius * 0.8);
        fxRockSpikes(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 38, 4, color);
      }
      audio.quake();
    } else if (element === 'fire') {
      fxFlameRing(p.x, p.y, radius * 0.7, color);
      fxShockwave(p.x, p.y, color, radius, 0.6);
      if (sk.mult >= 3) audio.ultimate(); else audio.fire();
    } else if (element === 'silk') {
      fxWebBurst(p.x, p.y, radius * 0.85, color);
      fxShockwave(p.x, p.y, color, radius, 0.55);
      audio.silk();
    } else if (element === 'wind') {
      fxWindSlash(p.x, p.y, radius * 0.75, color);
      fxShockwave(p.x, p.y, color, radius, 0.5);
      audio.wind();
    } else if (element === 'arcane') {
      fxArcaneSigil(p.x, p.y, radius * 0.65, color);
      fxShockwave(p.x, p.y, color, radius, 0.55);
      if (sk.mult >= 3) audio.ultimate(); else audio.arcane();
    } else {
      fxShockwave(p.x, p.y, color, radius, 0.6);
      audio.cast();
    }
    if (sk.mult >= 3) {
      flash = Math.max(flash, 0.42);
      shake = Math.max(shake, 18);
    } else {
      shake = Math.max(shake, 10);
    }
    return;
  }
}

function pointLineDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = dx * dx + dy * dy;
  if (!len) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len;
  t = clamp(t, 0, 1);
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

function spawnPlayerZone(x, y, r, dps, color, life, slow = 0) {
  if (!run) return;
  run.zones.push({
    x, y, r, dmg: dps, color, from: 'player',
    delay: 0, life, maxLife: life,
    tick: 0.35, slow, dead: false,
  });
}

function applyBurn(e, dps, duration) {
  if (!e || e.dead) return;
  e.burnT = Math.max(e.burnT || 0, duration);
  e.burnDps = Math.max(e.burnDps || 0, dps);
  e.burnTick = Math.min(e.burnTick || 0.35, 0.2);
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

function damageEnemy(e, amount, opts = {}) {
  if (!e || e.dead || !run || run.over) return;
  const st = getStats();
  const crit = !opts.dot && !opts.noCrit && Math.random() < st.crit;
  let dmg = amount * (opts.noVariance ? 1 : rand(0.9, 1.1));
  if (crit) dmg *= 1.8;
  dmg = Math.max(1, Math.round(dmg));
  if (e.guard > 0) {
    dmg = Math.max(1, Math.round(dmg * 0.25));
    addText(e.x, e.y - e.radius - 18, 'GUARD', '#ffd166');
  }

  e.hp -= dmg;
  e.hitFlash = 0.12;
  addExecutionCharge(opts.dot ? 0.12 : 0.4);
  if (!opts.dot) {
    run.combo++;
    run.comboTimer = 3;
    run.maxCombo = Math.max(run.maxCombo, run.combo);
    addRage(crit ? 3.2 : 2.1);
  }

  addText(e.x + rand(-8, 8), e.y - e.radius - 8, String(dmg), crit ? '#ffd166' : (opts.dot ? '#ffb36b' : '#eafcff'), crit && !opts.dot);
  burst(e.x, e.y, crit ? '#ffd166' : e.def.color, crit ? 9 : (opts.dot ? 2 : 5), crit ? 200 : 130, crit ? 3 : 2);
  if (crit) {
    shake = Math.max(shake, 4.5);
    for (let i = 0; i < 4; i++) {
      addParticle({
        x: e.x, y: e.y, vx: rand(-180, 180), vy: rand(-180, 180),
        life: 0.22, max: 0.22, size: rand(1.5, 3),
        color: '#eaffff', type: 'spark',
      });
    }
  }
  if (!opts.dot) audio.hit(crit);

  if (e.hp <= 0) killEnemy(e);
}

function killEnemy(e) {
  if (!e || e.dead) return;
  e.dead = true;
  run.kills++;
  state.stats.kills++;
  addRage(4.5);
  if (!run.execution) addExecutionCharge(5);

  const eliteMul = e.elite ? 1.55 : 1;
  const xp = Math.round(e.def.xp * (1 + 0.05 * (state.level - 1)) * run.zone.tier * eliteMul);
  const coins = Math.round(e.def.coins * (1 + 0.1 * (state.level - 1)) * run.zone.tier * eliteMul);
  run.xp += xp;
  run.coins += coins;
  state.coins += coins;
  state.stats.totalCoins += coins;

  addText(e.x, e.y - e.radius - 18, `+${xp} XP`, '#8be9ff');
  spawnCoinBurst(e.x, e.y, coins);
  burst(e.x, e.y, e.def.color, e.boss ? 26 : 11, e.boss ? 320 : 210, e.boss ? 4 : 3);

  if (e.boss) {
    gainXp(xp);
    ring(e.x, e.y, e.def.color, e.radius * 5);
    shake = 24;
    beginBossDeath(e);
    return;
  }

  const dropChance = run.player.hp < run.player.maxHp * 0.35 ? 0.3 : 0.11;
  if (Math.random() < dropChance) spawnHealth(e.x, e.y);
  gainXp(xp);
}

function beginBossDeath(e) {
  if (!run) return;
  run.phase = 'bossdeath';
  run.bossDeath = {
    enemy: e,
    x: e.x,
    y: e.y,
    def: e.def,
    t: 2.35,
    max: 2.35,
  };
  run.fireworkTimer = 0;
  e.deathAlpha = 1;
  e.dead = true;
  hideWaveClear();
  $('wave-banner').classList.add('hidden');
  $('level-banner').classList.add('hidden');
  $('toasts').innerHTML = '';
  showBossVictory(e.def.name);
  audio.stopMusic();
  audio.boss();
  flash = Math.max(flash, 0.55);
  shake = Math.max(shake, 24);
  ring(e.x, e.y, e.def.color, e.radius * 5);
  ring(e.x, e.y, '#ffd166', e.radius * 7);
  for (let i = 0; i < 36; i++) {
    const a = rand(0, TAU);
    const s = rand(90, 330);
    addParticle({
      x: e.x, y: e.y,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60,
      life: rand(0.5, 1.2), max: 1.2,
      size: rand(2, 5), color: i % 3 === 0 ? '#ffd166' : e.def.color,
      type: 'spark',
    });
  }
  updateHUD();
}

function damagePlayer(amount) {
  if (!run || run.over) return;
  if (run.phase === 'bossdeath' || run.phase === 'cleared') return;
  const p = run.player;
  if (p.invuln > 0 || p.dashTimer > 0) return;

  const st = getStats();
  let dmg = Math.max(1, Math.round(amount * (1 - st.armor)));
  if (p.shield > 0) {
    dmg = Math.max(1, Math.round(dmg * 0.5));
    addText(p.x, p.y - 46, 'SHIELD', '#8be9ff');
  }
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

function addRage(amount) {
  if (!run || run.over || !run.player) return;
  if (run.phase !== 'wave' && run.phase !== 'boss') return;
  const p = run.player;
  if (p.rageActive > 0) return;
  p.rage = clamp(p.rage + amount, 0, p.rageMax);
  if (p.rage >= p.rageMax && !rageWarned) {
    rageWarned = true;
    toast('<b>RAGE READY</b> · press R to transform', 'gold', iconSVG('rage', 16));
    audio.rageReady();
    ring(p.x, p.y, '#ff5c6c', 70);
  }
}

function addExecutionCharge(amount) {
  if (!run || run.over || run.execution || !run.player) return;
  if (run.phase !== 'wave' && run.phase !== 'boss') return;
  const p = run.player;
  const before = p.executionCharge || 0;
  if (before >= 100) return;
  p.executionCharge = clamp(before + amount, 0, 100);
  if (p.executionCharge >= 100 && before < 100) {
    toast('<b>EXECUTION READY</b> · press F', 'gold', iconSVG('execution', 16));
    audio.unlock();
    ring(p.x, p.y, getSkin()?.palette?.aura || getHero().color, 80);
  }
}

function activateRage() {
  if (!run || run.over || paused || run.execution) return;
  if (run.phase !== 'wave' && run.phase !== 'boss') return;
  const p = run.player;
  if (p.rageActive > 0) {
    if (!p.rageUsed) castRageArt();
    return;
  }
  if (p.rage < p.rageMax) {
    audio.error();
    return;
  }
  p.rage = 0;
  p.rageActive = p.rageDuration;
  p.rageUsed = false;
  rageWarned = false;
  for (const k in p.cooldowns) p.cooldowns[k] = 0;
  p.invuln = Math.max(p.invuln, 0.45);
  showBanner('RAGE MODE');
  toast(`<b>${getHero().name}</b> has awakened. Press R again for the Rage Art.`, 'gold', iconSVG('rage', 16));
  fxShockwave(p.x, p.y, '#ff5c6c', 150, 0.8);
  fxWind(p.x, p.y, '#ffd166', 110);
  ring(p.x, p.y, '#ff5c6c', 100);
  shake = Math.max(shake, 15);
  flash = Math.max(flash, 0.38);
  recentRage = 1;
  audio.rage();
  saveSoon();
}

function castRageArt() {
  if (!run || run.over || run.execution || run.phase !== 'boss' && run.phase !== 'wave') return;
  const p = run.player;
  if (p.rageActive <= 0 || p.rageUsed) return;
  p.rageUsed = true;
  const hero = getHero();
  const st = getStats();
  const color = getSkin()?.palette?.aura || hero.color;
  const dmg = st.damage * 5.5 * st.skillDamageMult;
  const radius = 300 * st.rangeMult;

  if (hero.id === 'kaito') {
    for (const e of run.enemies) {
      if (e.dead) continue;
      if (Math.hypot(e.x - p.x, e.y - p.y) < radius + e.radius) {
        damageEnemy(e, dmg);
        e.stun = Math.max(e.stun, 2.2);
      }
    }
    for (let i = 0; i < 14; i++) {
      const a = rand(0, TAU);
      const d = rand(0, radius);
      fxStrike(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, i % 3 === 0 ? '#ffd166' : color);
    }
    fxShockwave(p.x, p.y, color, radius, 0.9);
  } else if (hero.id === 'mira') {
    for (const e of run.enemies) {
      if (e.dead) continue;
      if (Math.hypot(e.x - p.x, e.y - p.y) < radius + e.radius) {
        damageEnemy(e, dmg);
        const a = Math.atan2(e.y - p.y, e.x - p.x);
        e.knockX += Math.cos(a) * 360;
        e.knockY += Math.sin(a) * 360;
        e.stun = Math.max(e.stun, 1.4);
      }
    }
    const heal = p.maxHp * 0.3;
    p.hp = Math.min(p.maxHp, p.hp + heal);
    p.shield = Math.max(p.shield, 5 + st.shieldBonus);
    addText(p.x, p.y - 38, `+${Math.round(heal)} HP`, '#63e6a4', true);
    fxShockwave(p.x, p.y, '#ffd166', radius, 0.9);
    fxWind(p.x, p.y, '#ffb347', radius * 0.8);
    fxRockSpikes(p.x, p.y, 60, 8, '#ffb347');
    audio.heal();
  } else if (hero.id === 'ren') {
    for (let i = 0; i < 5; i++) {
      const a = rand(0, TAU);
      const d = rand(60, radius * 0.7);
      spawnPlayerZone(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 110, dmg * 0.28, color, 4, 0);
    }
    for (const e of run.enemies) {
      if (!e.dead && Math.hypot(e.x - p.x, e.y - p.y) < radius + e.radius) {
        damageEnemy(e, dmg);
        applyBurn(e, dmg * 0.2, 5);
      }
    }
    fxShockwave(p.x, p.y, color, radius, 1);
    fxFlameRing(p.x, p.y, radius * 0.75, color);
  } else if (hero.id === 'yuki') {
    const target = nearestEnemy(p.x, p.y, 760);
    const ang = target ? Math.atan2(target.y - p.y, target.x - p.x) : Math.atan2(p.facing.y, p.facing.x);
    const len = 720 * st.rangeMult;
    const x2 = p.x + Math.cos(ang) * len;
    const y2 = p.y + Math.sin(ang) * len;
    for (const e of run.enemies) {
      if (e.dead) continue;
      if (pointLineDistance(e.x, e.y, p.x, p.y, x2, y2) < 55 + e.radius) {
        damageEnemy(e, dmg * 1.1);
        e.stun = Math.max(e.stun, 1.2);
        e.slow = Math.max(e.slow, 3);
      }
    }
    for (let i = 0; i < 6; i++) {
      const sx = p.x + rand(-40, 40);
      const sy = p.y + rand(-40, 40);
      fxLine(sx, sy, x2 + rand(-80, 80), y2 + rand(-80, 80), i % 2 ? color : '#d8ffe8', 3, 0.35, 'arrow');
    }
    fxWindSlash(x2, y2, 90, color);
    fxShockwave(x2, y2, color, 120, 0.7);
    fxShockwave(p.x, p.y, color, radius, 0.8);
  } else if (hero.id === 'aster') {
    for (const e of run.enemies) {
      if (e.dead) continue;
      if (Math.hypot(e.x - p.x, e.y - p.y) < radius * 1.15 + e.radius) {
        damageEnemy(e, dmg);
        e.stun = Math.max(e.stun, 2.0);
        e.slow = Math.max(e.slow, 4);
      }
    }
    for (let i = 0; i < 6; i++) {
      const a = rand(0, TAU);
      const d = rand(0, radius * 0.9);
      spawnPlayerZone(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 85, dmg * 0.22, i % 2 ? color : '#7fd8ff', 2.5, 2);
    }
    fxShockwave(p.x, p.y, color, radius * 1.2, 1);
    fxWind(p.x, p.y, '#7fd8ff', radius);
    fxArcaneSigil(p.x, p.y, radius * 0.65, color);
  } else {
    let target = nearestEnemy(p.x, p.y, 650);
    const hits = new Set();
    const points = [{ x: p.x, y: p.y }];
    for (let i = 0; i < 10 && target; i++) {
      hits.add(target);
      points.push({ x: target.x, y: target.y });
      damageEnemy(target, dmg * 0.62);
      target.stun = Math.max(target.stun, 1.6);
      target.slow = Math.max(target.slow, 4);
      fxWebBurst(target.x, target.y, 34, color);
      target = nearestEnemy(target.x, target.y, 330, hits);
    }
    for (let i = 1; i < points.length - 1; i++) {
      fxSilkLine(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y, color, 0.35);
    }
    fxWebBurst(p.x, p.y, 70, color);
    fxShockwave(p.x, p.y, color, radius, 0.8);
  }

  showBanner('RAGE ART');
  toast(`<b>${rageArtFor(hero.id).name}</b> unleashed.`, 'gold', iconSVG('rage', 16));
  shake = Math.max(shake, 22);
  flash = Math.max(flash, 0.55);
  audio.ultimate();
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
    value: Math.round(getStats().maxHp * 0.2),
    life: 24,
    phase: rand(0, TAU),
    dead: false,
  });
}

function finishRun(victory) {
  if (!run || run.over) return;
  run.over = true;
  run.execution = null;
  $('hud')?.classList.remove('cinematic');
  run.victory = !!victory;
  run.endDelay = victory ? 1.1 : 0.9;
  updateTouchUI();
  hideBossVictory();
  hideWaveClear();
  audio.stopMusic();
  $('intermission-overlay').classList.add('hidden');

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
    burst(run.player.x, run.player.y, getSkin()?.palette?.aura || '#39d7ff', 20, 280, 3.4);
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

  const score = Math.round(run.kills * 12 + run.maxCombo * 8 + (victory ? 240 : 0) + run.time / 10);
  sdk.sendScore(score);
  saveNow();
}

function computeRank(r) {
  const score = r.kills * 12 + r.maxCombo * 8 + (r.victory ? 240 : 0) + Math.floor(r.time / 10);
  if (score >= 1500) return 'S';
  if (score >= 1000) return 'A';
  if (score >= 600) return 'B';
  return 'C';
}

/* ============================================================
   UPDATE
   ============================================================ */

function updateRun(dt) {
  if (!run || run.over) return;

  if (run.execution) {
    updateExecution(dt);
    return;
  }

  if (run.phase === 'intermission') {
    updateParticles(dt);
    updateTexts(dt);
    updateFx(dt);
    updateAmbient(dt);
    updateShake(dt);
    updateCamera(dt);
    updateHUD();
    return;
  }

  if (run.phase === 'cleared') {
    run.clearTimer -= dt;
    updateParticles(dt);
    updateTexts(dt);
    updateFx(dt);
    updateAmbient(dt);
    updateShake(dt);
    updateCamera(dt);
    updateHUD();
    if (run.clearTimer <= 0) openIntermission(run.nextIsBoss);
    return;
  }

  if (run.phase === 'bossdeath') {
    const bd = run.bossDeath;
    if (bd) {
      bd.t -= dt;
      if (bd.enemy) bd.enemy.deathAlpha = clamp(bd.t / bd.max, 0, 1);
    }
    run.fireworkTimer -= dt;
    if (run.fireworkTimer <= 0) {
      spawnFirework();
      run.fireworkTimer = 0.24;
    }
    updateParticles(dt * 0.4);
    updateTexts(dt);
    updateFx(dt * 0.4);
    updateAmbient(dt * 0.45);
    updateShake(dt);
    updateCamera(dt);
    updateHUD();
    if (bd && bd.t <= 0) {
      run.bossDeath = null;
      finishRun(true);
    }
    return;
  }

  run.time += dt;

  updatePlayer(dt);
  updateEnemies(dt);
  updateProjectiles(dt);
  updatePickups(dt);
  updateSpawns(dt);
  updateZones(dt);
  updateParticles(dt);
  updateTexts(dt);
  updateBeams(dt);
  updateSlashes(dt);
  updateFx(dt);
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

  const cdRate = p.rageActive > 0 ? 1.5 : 1;
  for (const k in p.cooldowns) {
    p.cooldowns[k] = Math.max(0, p.cooldowns[k] - dt * cdRate);
  }
  p.energy = Math.min(p.maxEnergy, p.energy + st.energyRegen * dt);

  if (p.invuln > 0) p.invuln -= dt;
  if (p.hitFlash > 0) p.hitFlash -= dt;
  if (p.shield > 0) p.shield -= dt;
  if (p.hpPulse > 0) p.hpPulse -= dt;

  if (p.rageActive > 0) {
    p.rageActive -= dt;
    if (p.rageActive <= 0) {
      p.rageActive = 0;
      p.rageUsed = false;
      toast('<b>Rage faded.</b> Fill the storm again.', '', iconSVG('rage', 16));
      audio.ui();
    }
  }

  const input = getMoveVector();
  const moving = input.x !== 0 || input.y !== 0;
  p.moving = moving || p.dashTimer > 0;
  p.walkPhase += dt * (p.dashTimer > 0 ? 18 : p.moving ? 11 : 2.2);
  if (p.attackAnim > 0) p.attackAnim -= dt;

  if (p.dashTimer > 0) {
    p.dashTimer -= dt;
    p.x += p.dashDir.x * 900 * dt;
    p.y += p.dashDir.y * 900 * dt;
    p.invuln = Math.max(p.invuln, 0.05);

    p.ghostTimer = (p.ghostTimer || 0) - dt;
    if (p.ghostTimer <= 0) {
      p.ghosts.push({
        x: p.x, y: p.y, life: 0.3, max: 0.3,
        angle: Math.atan2(p.dashDir.y, p.dashDir.x),
      });
      p.ghostTimer = 0.028;
    }

    if (st.dashDamage) {
      for (const e of run.enemies) {
        if (e.dead || p.dashHits.has(e)) continue;
        if (Math.hypot(e.x - p.x, e.y - p.y) < 48 + e.radius) {
          p.dashHits.add(e);
          damageEnemy(e, st.damage * 1.2);
          const aura = p.skin?.palette?.aura || p.hero?.color || '#39d7ff';
          fxShockwave(e.x, e.y, aura, 30, 0.2);
          burst(e.x, e.y, aura, 7, 160, 2.4);
        }
      }
    }

    for (let i = 0; i < 2; i++) {
      addParticle({
        x: p.x + rand(-8, 8), y: p.y + rand(-8, 8),
        vx: -p.dashDir.x * 80 + rand(-30, 30),
        vy: -p.dashDir.y * 80 + rand(-30, 30),
        life: 0.25, max: 0.25, size: rand(2, 4),
        color: getSkin()?.palette?.aura || '#39d7ff', type: 'spark',
      });
    }

    if (p.dashTimer <= 0) {
      p.dashTimer = 0;
      p.dashHits.clear();
      const hero = p.hero || getHero();
      const aura = p.skin?.palette?.aura || hero.color || '#39d7ff';
      fxShockwave(p.x, p.y, aura, 64, 0.38);
      fxWind(p.x, p.y, aura, 56);
      if (hero.id === 'kaito') fxStrike(p.x, p.y, aura);
      else if (hero.id === 'mira') fxRockSpikes(p.x, p.y, 34, 3, aura);
      else if (hero.id === 'ren') fxFlameRing(p.x, p.y, 42, aura);
      else if (hero.id === 'sora') fxWebBurst(p.x, p.y, 40, aura);
      else if (hero.id === 'yuki') fxWindSlash(p.x, p.y, 48, aura);
      else fxArcaneSigil(p.x, p.y, 40, aura);
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

  for (const g of p.ghosts) g.life -= dt;
  p.ghosts = p.ghosts.filter((g) => g.life > 0);

  p.attackTimer -= dt;
  if (p.attackTimer <= 0) {
    const hero = p.hero || getHero();
    const auto = hero.auto || { type: 'melee', range: 126, cd: 0.55, mult: 1 };
    const target = nearestEnemy(p.x, p.y, auto.range);
    if (target) {
      p.attackTimer = auto.cd * (p.rageActive > 0 ? 0.78 : 1);
      p.attackAnim = 0.24;
      p.swingSide *= -1;
      const ang = Math.atan2(target.y - p.y, target.x - p.x);
      p.facing = { x: Math.cos(ang), y: Math.sin(ang) };
      const color = p.skin?.palette?.aura || hero.color;
      const dmg = st.damage * (auto.mult || 1) * (auto.type === 'projectile' ? st.projectileMult : 1);

      if (auto.type === 'projectile') {
        run.projectiles.push({
          x: p.x + Math.cos(ang) * 22,
          y: p.y + Math.sin(ang) * 22,
          vx: Math.cos(ang) * (auto.speed || 760),
          vy: Math.sin(ang) * (auto.speed || 760),
          radius: 7,
          dmg,
          from: 'player',
          color,
          kind: auto.kind || 'bolt',
          life: 1.5,
          aoe: 0,
          burn: !!auto.burn,
          slow: auto.slow || 0,
          pierce: st.pierceBonus,
          hitSet: new Set(),
          seed: rand(0, 1000),
        });
        burst(p.x + Math.cos(ang) * 22, p.y + Math.sin(ang) * 22, color, 5, 110, 2);
        if (hero.id === 'yuki') audio.bow();
        else if (hero.id === 'aster') audio.arcane();
        else audio.cast();
      } else if (auto.type === 'whip') {
        damageEnemy(target, dmg);
        target.slow = Math.max(target.slow, auto.slow || 0);
        fxSilkLine(p.x, p.y, target.x, target.y, color);
        fxWebBurst(target.x, target.y, 34, color);
        fxShockwave(target.x, target.y, color, 34, 0.24);
        burst(target.x, target.y, color, 6, 140, 2.2);
        shake = Math.max(shake, 1.8);
        audio.silk();
      } else {
        damageEnemy(target, dmg);
        fxShockwave(target.x, target.y, color, 30, 0.22);
        burst(target.x, target.y, color, hero.id === 'mira' ? 10 : 6, hero.id === 'mira' ? 170 : 140, 2.4);
        if (hero.id === 'mira') {
          fxRockSpikes(target.x, target.y, 26, 3, color);
          burst(target.x, target.y, '#ffe6a3', 4, 120, 1.8);
        } else {
          run.slashes.push({
            x: p.x, y: p.y, angle: ang, color,
            life: 0.18, max: 0.18, range: 92, side: p.swingSide,
          });
          if (hero.id === 'kaito') fxLine(p.x, p.y, target.x, target.y, color, 2.4, 0.16, 'beam');
        }
        shake = Math.max(shake, 2.2);
        audio.blade();
      }
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
    if (e.spawnT > 0) e.spawnT -= dt;
    if (e.attackAnim > 0) e.attackAnim -= dt;
    if (e.chargeHitCd > 0) e.chargeHitCd -= dt;
    if (e.slow > 0) e.slow -= dt;
    if (e.burnT > 0) {
      e.burnT -= dt;
      e.burnTick -= dt;
      if (e.burnTick <= 0) {
        e.burnTick = 0.5;
        damageEnemy(e, Math.max(1, e.burnDps * 0.5), { dot: true });
        if (e.dead) continue;
      }
    }
    if (e.stun > 0) { e.stun -= dt; continue; }

    if (e.boss) {
      updateBoss(e, dt);
      if (run.over) return;
      continue;
    }

    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    const ranged = e.def.kind === 'ranged' || e.def.kind === 'caster';
    e.walkPhase += dt * (7 + e.def.speed / 34);

    // Ronin guard cycle
    if (e.def.ability === 'guard') {
      e.guardTimer -= dt;
      if (e.guard > 0) e.guard -= dt;
      if (e.guardTimer <= 0 && e.guard <= 0) {
        e.guard = e.def.guardTime;
        e.guardTimer = e.def.guardCd;
        ring(e.x, e.y, '#ffd166', 26);
        audio.ui();
      }
    }

    // Charging enemies
    if (e.charging > 0) {
      e.charging -= dt;
      const sp = (e.def.chargeSpeed || 500) * (e.slow > 0 ? 0.55 : 1);
      e.x += e.chargeDir.x * sp * dt;
      e.y += e.chargeDir.y * sp * dt;
      e.x = clamp(e.x, 24, WORLD.w - 24);
      e.y = clamp(e.y, 24, WORLD.h - 24);

      if (e.def.trail === 'fire' && Math.random() < 0.45) {
        spawnEnemyZone(e.x, e.y, 28, e.dmg * 0.18, '#ff7a3c', 0, 1.1);
      }
      addParticle({
        x: e.x + rand(-10, 10), y: e.y + rand(-10, 10),
        vx: rand(-30, 30), vy: rand(-30, 30),
        life: 0.24, max: 0.24, size: rand(2, 4),
        color: e.def.color, type: 'spark',
      });

      if (e.chargeHitCd <= 0 && Math.hypot(p.x - e.x, p.y - e.y) < e.radius + p.radius + 10) {
        damagePlayer(e.dmg * 1.2);
        e.chargeHitCd = 0.7;
      }
      if (e.charging <= 0) { e.charging = 0; e.chargeDir = null; }
      continue;
    }

    let mx = 0;
    let my = 0;

    if (ranged) {
      const desired = e.def.range * 0.62;
      if (d > desired + 34) { mx = dx / d; my = dy / d; }
      else if (d < desired - 34) { mx = -dx / d; my = -dy / d; }
      else { mx = (-dy / d) * 0.45; my = (dx / d) * 0.45; }
    } else if (d > e.def.range * 0.8) {
      mx = dx / d;
      my = dy / d;
    }

    const speed = e.def.speed * (e.guard > 0 ? 0.35 : 1) * (e.slow > 0 ? 0.55 : 1);
    e.x += (mx * speed + e.knockX) * dt;
    e.y += (my * speed + e.knockY) * dt;
    e.knockX *= Math.exp(-7 * dt);
    e.knockY *= Math.exp(-7 * dt);

    e.x = clamp(e.x, 24, WORLD.w - 24);
    e.y = clamp(e.y, 24, WORLD.h - 24);

    e.atkTimer -= dt;

    if (e.windup > 0) {
      e.windup -= dt;
      if (e.windup <= 0) {
        e.attackAnim = 0.22;
        resolveEnemyAttack(e);
      }
      continue;
    }

    const triggerRange = e.def.ability === 'zone' || e.def.ability === 'blink'
      ? e.def.range + 20
      : e.def.range + (ranged ? 40 : 8);

    if (e.atkTimer <= 0 && d < triggerRange) {
      e.windup = e.def.windup;
      e.atkTimer = e.def.atkCd;
      e.attackAnim = 0.25;
      e.attackDir = Math.atan2(p.y - e.y, p.x - e.x);
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

function resolveEnemyAttack(e) {
  const p = run.player;
  const dx = p.x - e.x;
  const dy = p.y - e.y;
  const d = Math.hypot(dx, dy) || 1;
  const ability = e.def.ability;

  if (ability === 'charge') {
    e.charging = 0.4;
    e.chargeDir = { x: dx / d, y: dy / d };
    e.attackDir = Math.atan2(dy, dx);
    fxWind(e.x, e.y, e.def.color, 42);
    audio.cast();
    return;
  }

  if (ability === 'volley') {
    enemyVolley(e, e.def.fanCount || 3);
    return;
  }

  if (ability === 'zone') {
    spawnEnemyZone(p.x, p.y, e.def.zoneRadius || 72, e.dmg, e.def.color, 0.55, 2.4);
    fxWind(p.x, p.y, e.def.color, 50);
    audio.cast();
    return;
  }

  if (ability === 'blink') {
    blinkEnemy(e);
    return;
  }

  if (e.def.kind === 'ranged' || e.def.kind === 'caster') {
    enemyShoot(e);
  } else if (d < e.def.range + p.radius + 12) {
    damagePlayer(e.dmg);
  }
}

function enemyVolley(e, count) {
  const p = run.player;
  const base = Math.atan2(p.y - e.y, p.x - e.x);
  const speed = e.def.projSpeed || 260;
  for (let i = 0; i < count; i++) {
    const a = base + (i - (count - 1) / 2) * 0.17;
    run.projectiles.push({
      x: e.x + Math.cos(a) * (e.radius + 4),
      y: e.y + Math.sin(a) * (e.radius + 4),
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      radius: 5.5,
      dmg: e.dmg * 0.82,
      from: 'enemy',
      color: e.def.color,
      kind: 'arrow',
      life: 3.2,
      aoe: 0,
    });
  }
  burst(e.x, e.y, e.def.color, 8, 130, 2.2);
  audio.cast();
}

function blinkEnemy(e) {
  const p = run.player;
  const oldX = e.x;
  const oldY = e.y;
  const a = rand(0, TAU);
  e.x = clamp(p.x + Math.cos(a) * 100, 40, WORLD.w - 40);
  e.y = clamp(p.y + Math.sin(a) * 100, 40, WORLD.h - 40);
  fxDash(oldX, oldY, e.x, e.y, e.def.color);
  fxShockwave(e.x, e.y, e.def.color, 76, 0.4);
  spawnEnemyZone(e.x, e.y, e.def.zoneRadius || 76, e.dmg, e.def.color, 0.4, 1.8);
  shake = Math.max(shake, 5);
  audio.cast();
}

function spawnEnemyZone(x, y, r, dmg, color, delay = 0, life = 2.4) {
  if (!run) return;
  run.zones.push({
    x, y, r, dmg, color, from: 'enemy',
    delay, life, maxLife: life,
    tick: 0.25,
    slow: 0,
    dead: false,
  });
}

function updateZones(dt) {
  const p = run.player;
  for (let i = run.zones.length - 1; i >= 0; i--) {
    const z = run.zones[i];
    if (z.delay > 0) {
      z.delay -= dt;
      continue;
    }
    z.life -= dt;
    z.tick -= dt;
    if (z.tick <= 0) {
      z.tick = 0.35;
      if (z.from === 'player') {
        for (const e of run.enemies) {
          if (e.dead) continue;
          if (Math.hypot(e.x - z.x, e.y - z.y) < z.r + e.radius) {
            damageEnemy(e, z.dmg * 0.35, { dot: true });
            if (z.slow) e.slow = Math.max(e.slow, z.slow);
          }
        }
      } else if (Math.hypot(p.x - z.x, p.y - z.y) < z.r + p.radius * 0.6) {
        damagePlayer(z.dmg * 0.45);
      }
    }
    if (z.life <= 0) run.zones.splice(i, 1);
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
  if (e.attackAnim > 0) e.attackAnim -= dt;

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
    toast(`<b>${e.def.name}</b> is enraged!`, 'gold', iconSVG('rage', 16));
    ring(e.x, e.y, '#ff5c6c', 90);
    fxShockwave(e.x, e.y, '#ff5c6c', 140, 0.6);
    shake = Math.max(shake, 8);
  }

  const speed = e.def.speed * (e.enraged ? 1.3 : 1) * (e.slow > 0 ? 0.55 : 1);
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
  e.walkPhase += dt * 5;

  e.atkTimer -= dt;
  if (e.atkTimer <= 0) {
    const attacks = e.def.attacks || ['slam', 'fan'];
    const type = attacks[e.attackIndex % attacks.length];
    e.attackIndex = (e.attackIndex + 1) % attacks.length;
    startBossAttack(e, type);
    e.atkTimer = e.enraged ? 2.1 : 3.0;
  }
}

function startBossAttack(e, type) {
  const p = run.player;
  e.attackAnim = 0.32;

  if (type === 'slam') {
    e.telegraph = {
      type: 'slam', x: p.x, y: p.y,
      radius: e.def.slamRadius, t: 0.9, max: 0.9,
    };
  } else if (type === 'fan') {
    e.telegraph = {
      type: 'fan', x: e.x, y: e.y,
      radius: 120, t: 0.55, max: 0.55,
    };
  } else if (type === 'charge') {
    e.telegraph = {
      type: 'charge', x: e.x, y: e.y,
      tx: p.x, ty: p.y, t: 0.8, max: 0.8,
    };
  } else if (type === 'spikes') {
    const zones = [];
    const count = e.def.spikeCount || 3;
    const base = Math.atan2(p.y - e.y, p.x - e.x);
    for (let i = 0; i < count; i++) {
      const a = base + (i - (count - 1) / 2) * 0.7;
      const d = 50 + i * 20;
      zones.push({
        x: clamp(p.x + Math.cos(a) * d, 60, WORLD.w - 60),
        y: clamp(p.y + Math.sin(a) * d, 60, WORLD.h - 60),
        r: e.def.spikeRadius || 70,
      });
    }
    e.telegraph = { type: 'spikes', zones, t: 0.9, max: 0.9 };
  } else if (type === 'meteors') {
    const zones = [];
    const count = e.def.meteorCount || 3;
    for (let i = 0; i < count; i++) {
      zones.push({
        x: clamp(p.x + rand(-180, 180), 60, WORLD.w - 60),
        y: clamp(p.y + rand(-150, 150), 60, WORLD.h - 60),
        r: e.def.meteorRadius || 80,
      });
    }
    e.telegraph = { type: 'meteors', zones, t: 1.1, max: 1.1 };
  } else if (type === 'ring') {
    e.telegraph = {
      type: 'ring', x: e.x, y: e.y,
      radius: e.def.ringRadius || 190, t: 1.0, max: 1.0,
    };
  } else if (type === 'blink') {
    e.telegraph = {
      type: 'blink', x: e.x, y: e.y,
      tx: p.x, ty: p.y,
      radius: e.def.blinkRadius || 120, t: 0.55, max: 0.55,
    };
  } else {
    e.telegraph = {
      type: 'slam', x: p.x, y: p.y,
      radius: e.def.slamRadius, t: 0.9, max: 0.9,
    };
  }

  audio.cast();
}

function resolveBossTelegraph(e) {
  const tg = e.telegraph;
  const p = run.player;
  const color = e.def.color;

  if (tg.type === 'slam') {
    if (Math.hypot(p.x - tg.x, p.y - tg.y) < tg.radius + p.radius) {
      damagePlayer(e.dmg * 1.15);
    }
    fxShockwave(tg.x, tg.y, color, tg.radius * 1.15, 0.55);
    burst(tg.x, tg.y, color, 18, 260, 3.4);
    shake = Math.max(shake, 15);
    audio.storm();
    return;
  }

  if (tg.type === 'fan') {
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
    fxWind(e.x, e.y, color, 70);
    shake = Math.max(shake, 7);
    audio.cast();
    return;
  }

  if (tg.type === 'charge') {
    const oldX = e.x;
    const oldY = e.y;
    e.x = tg.tx;
    e.y = tg.ty;
    fxDash(oldX, oldY, e.x, e.y, color);
    fxShockwave(e.x, e.y, color, 100, 0.45);
    if (Math.hypot(p.x - e.x, p.y - e.y) < 100 + p.radius) {
      damagePlayer(e.dmg * 1.25);
    }
    shake = Math.max(shake, 12);
    audio.dash();
    return;
  }

  if (tg.type === 'spikes' || tg.type === 'meteors') {
    for (const z of tg.zones) {
      if (Math.hypot(p.x - z.x, p.y - z.y) < z.r + p.radius) {
        damagePlayer(e.dmg * (tg.type === 'meteors' ? 1.25 : 1.05));
      }
      fxStrike(z.x, z.y, tg.type === 'meteors' ? '#ff8a4c' : color);
      fxShockwave(z.x, z.y, tg.type === 'meteors' ? '#ff8a4c' : color, z.r, 0.45);
      burst(z.x, z.y, tg.type === 'meteors' ? '#ff8a4c' : color, 12, 200, 3);
    }
    shake = Math.max(shake, 12);
    audio.storm();
    return;
  }

  if (tg.type === 'ring') {
    if (Math.hypot(p.x - e.x, p.y - e.y) < tg.radius + p.radius) {
      damagePlayer(e.dmg * 1.1);
    }
    fxShockwave(e.x, e.y, color, tg.radius, 0.6);
    fxWind(e.x, e.y, color, tg.radius * 0.65);
    shake = Math.max(shake, 12);
    audio.storm();
    return;
  }

  if (tg.type === 'blink') {
    const oldX = e.x;
    const oldY = e.y;
    e.x = clamp(tg.tx + rand(-28, 28), 60, WORLD.w - 60);
    e.y = clamp(tg.ty + rand(-28, 28), 60, WORLD.h - 60);
    fxDash(oldX, oldY, e.x, e.y, color);
    fxShockwave(e.x, e.y, color, tg.radius, 0.55);
    if (Math.hypot(p.x - e.x, p.y - e.y) < tg.radius + p.radius) {
      damagePlayer(e.dmg * 1.1);
    }
    shake = Math.max(shake, 9);
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

    if (pr.from === 'player' && pr.kind === 'bolt') {
      if (Math.random() < 0.75) {
        addParticle({
          x: pr.x + rand(-4, 4), y: pr.y + rand(-4, 4),
          vx: rand(-24, 24), vy: rand(-24, 24),
          life: 0.18, max: 0.18, size: rand(1.2, 2.8),
          color: '#9ef2ff', type: 'spark',
        });
      }
    }

    if (pr.from === 'player') {
      for (const e of run.enemies) {
        if (e.dead) continue;
        if (pr.hitSet && pr.hitSet.has(e)) continue;
        if (Math.hypot(pr.x - e.x, pr.y - e.y) < pr.radius + e.radius) {
          if (!pr.hitSet) pr.hitSet = new Set();
          pr.hitSet.add(e);
          damageEnemy(e, pr.dmg);
          if (pr.burn) applyBurn(e, pr.dmg * 0.16, 3 + getStats().burnBonus);
          if (pr.slow) e.slow = Math.max(e.slow, pr.slow);
          if (pr.aoe) {
            for (const other of run.enemies) {
              if (other === e || other.dead) continue;
              if (Math.hypot(other.x - e.x, other.y - e.y) < pr.aoe + other.radius) {
                damageEnemy(other, pr.dmg * 0.45);
                if (pr.burn) applyBurn(other, pr.dmg * 0.1, 2.5);
              }
            }
            fxShockwave(e.x, e.y, pr.color, pr.aoe, 0.35);
          }
          if (pr.pierce > 0) pr.pierce--;
          else pr.dead = true;
          fxProjectileImpact(pr.kind, e.x, e.y, pr.color);
          fxShockwave(e.x, e.y, pr.color || '#8be9ff', 30, 0.24);
          burst(pr.x, pr.y, pr.color, 6, 160, 2.2);
          shake = Math.max(shake, 3);
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

    if (d < 165) {
      pu.x += (dx / d) * 310 * dt;
      pu.y += (dy / d) * 310 * dt;
    }
    if (d < 28 && p.hp < p.maxHp) {
      const heal = Math.min(pu.value, p.maxHp - p.hp);
      p.hp += heal;
      p.hpPulse = 0.8;
      healFlash = Math.max(healFlash, 0.55);
      addText(p.x, p.y - 38, `+${Math.round(heal)} HP`, '#63e6a4', true);
      ring(p.x, p.y, '#63e6a4', 46);
      burst(p.x, p.y, '#63e6a4', 16, 180, 2.6);
      audio.heal();
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
      run.enemies.push(makeEnemy(s.type, s.x, s.y, { elite: s.elite }));
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
      if (p.type === 'firework') p.vy += 95 * dt;
    }
    if (p.life <= 0) run.particles.splice(i, 1);
  }
}

function updateFx(dt) {
  for (let i = run.fx.length - 1; i >= 0; i--) {
    const f = run.fx[i];
    f.life -= dt;
    if (f.type === 'wave') {
      const k = 1 - f.life / f.max;
      f.r = f.maxR * (0.15 + 0.85 * k);
    }
    if (f.life <= 0) run.fx.splice(i, 1);
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
  if (REDUCED_MOTION) shake = 0;
  else shake = Math.max(0, shake - dt * 55);
  flash = Math.max(0, flash - dt * 2.4);
  healFlash = Math.max(0, healFlash - dt * 2.2);
}

function updateCamera(dt) {
  const p = run.player;
  const tx = camAxis(p.x, view.w / WORLD_ZOOM, WORLD.w);
  const ty = camAxis(p.y, view.h / WORLD_ZOOM, WORLD.h);
  const k = 1 - Math.exp(-9 * dt);
  camera.x = lerp(camera.x, tx, k);
  camera.y = lerp(camera.y, ty, k);
}

function camAxis(pos, viewSize, worldSize) {
  if (viewSize >= worldSize) return (worldSize - viewSize) / 2;
  return clamp(pos - viewSize / 2, 0, worldSize - viewSize);
}

function updatePhase(dt) {
  if (run.over || run.phase !== 'wave') return;

  if (run.enemies.length === 0 && run.pendingSpawns.length === 0 && !run.bossSpawned) {
    run.phase = 'cleared';
    run.clearTimer = 1.15;
    run.nextIsBoss = run.wave >= run.zone.waves.length;
    showWaveClear(run.nextIsBoss ? 'THE BOSS STIRS' : 'CATCH YOUR BREATH');
    audio.wave();
    updateTouchUI();
  }
}

/* ============================================================
   HUD
   ============================================================ */

function setupHudHero(hero, skin) {
  const el = $('hud-hero');
  if (el) el.innerHTML = heroPortrait(hero, { palette: skin?.palette, size: 38 });
}

function setupRageUI(hero, skin, st) {
  const high = $('rage-portrait-high');
  const low = $('rage-portrait-low');
  if (high) high.innerHTML = heroPortrait(hero, { palette: skin?.palette, rage: true, size: 48 });
  if (low) low.innerHTML = heroPortrait(hero, { palette: skin?.palette, rage: false, size: 48 });
  const panel = $('rage-panel');
  if (panel) panel.className = '';
  const fill = $('rage-fill');
  if (fill) fill.style.height = '0%';
  setText('rage-value', '0');
  const btn = $('btn-rage');
  if (btn) {
    btn.textContent = 'CHARGE';
    btn.disabled = true;
  }
  const lowHp = $('low-hp');
  if (lowHp) lowHp.classList.add('hidden');
}

function buildSkillBar() {
  if (!run) return;
  const p = run.player;
  const dash = p.dashSkill;
  const items = [];
  if (dash) {
    const pos = SKILL_LAYOUT.dash;
    items.push(`<button class="skill-btn dash" data-skill="${dash.id}" aria-label="${dash.name}" style="right:${pos.right}px;bottom:${pos.bottom}px;width:${pos.size}px;height:${pos.size}px">
      ${skillArt(dash, pos.size)}
      <span class="skill-name">DASH</span>
      <span class="key">SPACE</span>
      <i class="cd"></i>
      <span class="cd-text"></span>
    </button>`);
  }
  for (let i = 0; i < 4; i++) {
    const sk = skillById(p.loadout[i]);
    const pos = SKILL_LAYOUT[`slot${i}`];
    if (!sk) {
      items.push(`<button class="skill-btn locked empty" data-slot="${i}" aria-label="Empty technique slot" disabled style="right:${pos.right}px;bottom:${pos.bottom}px;width:${pos.size}px;height:${pos.size}px">
        <span class="skill-glyph">${iconSVG('lock', 22)}</span>
        <span class="skill-name">EMPTY</span>
        <span class="key">${i + 1}</span>
      </button>`);
      continue;
    }
    const ult = (sk.mult || 0) >= 3 || (sk.energy || 0) >= 45;
    const execution = sk.type === 'execution';
    items.push(`<button class="skill-btn ${ult ? 'ult' : ''} ${execution ? 'execution' : ''}" data-skill="${sk.id}" aria-label="${sk.name}" style="right:${pos.right}px;bottom:${pos.bottom}px;width:${pos.size}px;height:${pos.size}px">
      ${skillArt(sk, pos.size)}
      <span class="skill-name">${sk.name}</span>
      <span class="key">${execution ? 'F' : i + 1}</span>
      <span class="lock-badge">${iconSVG('lock', 14)}</span>
      <i class="cd"></i>
      <span class="cd-text"></span>
    </button>`);
  }
  $('skill-bar').innerHTML = items.join('');
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

  let waveText;
  if (run.phase === 'intermission') waveText = 'INTERMISSION';
  else if (run.phase === 'cleared') waveText = 'WAVE CLEARED';
  else if (run.phase === 'bossdeath') waveText = 'CHAPTER CLEARED';
  else if (run.boss) waveText = 'BOSS FIGHT';
  else waveText = `WAVE ${run.wave} / ${run.zone.waves.length}`;
  setText('hud-wave', waveText);

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

  const hpBar = $('hp-bar');
  if (hpBar) hpBar.classList.toggle('healing', p.hpPulse > 0);

  const lowHp = $('low-hp');
  const hpRatio = p.hp / p.maxHp;
  if (lowHp) {
    const low = hpRatio < 0.3 && !run.over;
    lowHp.classList.toggle('hidden', !low);
    lowHp.classList.toggle('critical', hpRatio < 0.15);
  }

  const ragePanel = $('rage-panel');
  const raging = p.rageActive > 0;
  if (ragePanel) {
    ragePanel.classList.toggle('ready', !raging && p.rage >= p.rageMax);
    ragePanel.classList.toggle('raging', raging);
  }
  const ragePct = raging ? (p.rageActive / p.rageDuration) * 100 : (p.rage / p.rageMax) * 100;
  const fill = $('rage-fill');
  if (fill) fill.style.height = `${clamp(ragePct, 0, 100)}%`;
  setText('rage-value', String(Math.round(ragePct)));
  const rageBtn = $('btn-rage');
  if (rageBtn) {
    if (raging) {
      rageBtn.textContent = p.rageUsed ? 'RAGING' : 'RAGE ART';
      rageBtn.disabled = p.rageUsed;
    } else if (p.rage >= p.rageMax) {
      rageBtn.textContent = 'RAGE';
      rageBtn.disabled = false;
    } else {
      rageBtn.textContent = 'CHARGE';
      rageBtn.disabled = true;
    }
  }

  const st = getStats();
  const bar = $('skill-bar');
  const all = [p.dashSkill, ...p.loadout.map((id) => skillById(id))].filter(Boolean);
  for (const sk of all) {
    const btn = bar.querySelector(`[data-skill="${sk.id}"]`);
    if (!btn) continue;
    const unlocked = skillRank(sk.id) > 0;
    btn.classList.toggle('locked', !unlocked);
    btn.disabled = !unlocked;

    const overlay = btn.querySelector('.cd');
    const txt = btn.querySelector('.cd-text');
    const execution = sk.type === 'execution';
    const charge = clamp(p.executionCharge || 0, 0, 100);
    const charging = unlocked && execution && charge < 100;
    btn.classList.toggle('charging', charging);
    if (charging) {
      if (overlay) overlay.style.transform = `scaleY(${1 - charge / 100})`;
      if (txt) txt.textContent = `${Math.floor(charge)}%`;
      btn.classList.remove('no-energy');
      continue;
    }

    const cd = p.cooldowns[sk.id] || 0;
    const max = skillCooldown(sk);
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

  const vw = view.w / WORLD_ZOOM;
  const vh = view.h / WORLD_ZOOM;
  ctx.save();
  ctx.scale(WORLD_ZOOM, WORLD_ZOOM);
  ctx.translate(-camera.x + sx / WORLD_ZOOM, -camera.y + sy / WORLD_ZOOM);

  const bgW = Math.min(vw, WORLD.w);
  const bgH = Math.min(vh, WORLD.h);
  const bgX = clamp(camera.x, 0, Math.max(0, WORLD.w - bgW));
  const bgY = clamp(camera.y, 0, Math.max(0, WORLD.h - bgH));
  ctx.drawImage(run.bg, bgX, bgY, bgW, bgH, bgX, bgY, bgW, bgH);
  const playerLight = ctx.createRadialGradient(run.player.x, run.player.y, 24, run.player.x, run.player.y, 300);
  playerLight.addColorStop(0, hexA(run.player.skin?.palette?.aura || '#43e0ff', 0.09));
  playerLight.addColorStop(0.55, hexA(run.player.skin?.palette?.aura || '#43e0ff', 0.025));
  playerLight.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = playerLight;
  ctx.beginPath();
  ctx.arc(run.player.x, run.player.y, 300, 0, TAU);
  ctx.fill();
  drawAmbient();
  drawPickups();
  drawSpawnMarkers();
  drawZones();
  drawTelegraphs();
  drawEnemies();
  drawBossDeath();
  drawSlashes();
  drawProjectiles();
  drawPlayer();
  drawBeams();
  drawFx();
  drawParticles();
  drawTexts();

  ctx.restore();

  if (flash > 0) {
    ctx.fillStyle = `rgba(255, 46, 68, ${clamp(flash * 0.35, 0, 0.28)})`;
    ctx.fillRect(0, 0, view.w, view.h);
  }
  if (healFlash > 0) {
    ctx.fillStyle = `rgba(70, 255, 150, ${clamp(healFlash * 0.22, 0, 0.3)})`;
    ctx.fillRect(0, 0, view.w, view.h);
  }
  if (run.player.rageActive > 0) {
    const g = ctx.createRadialGradient(view.w / 2, view.h / 2, Math.min(view.w, view.h) * 0.3, view.w / 2, view.h / 2, Math.max(view.w, view.h) * 0.7);
    g.addColorStop(0, 'rgba(255, 60, 60, 0)');
    g.addColorStop(1, 'rgba(255, 40, 50, 0.18)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, view.w, view.h);
  }
  drawExecutionOverlay();
}

function drawExecutionOverlay() {
  if (!run?.execution) return;
  const ex = run.execution;
  const w = view.w;
  const h = view.h;
  const inA = Math.min(1, ex.t / 0.26);
  const outA = Math.min(1, Math.max(0, (ex.duration - ex.t) / 0.42));
  const a = Math.min(inA, outA);
  const cx = w / 2;

  ctx.save();
  ctx.globalAlpha = a;

  const tint = ctx.createRadialGradient(cx, h * 0.5, 20, cx, h * 0.5, Math.max(w, h) * 0.7);
  tint.addColorStop(0, hexA(ex.color, 0.16));
  tint.addColorStop(0.55, 'rgba(3, 5, 12, 0.42)');
  tint.addColorStop(1, 'rgba(1, 2, 6, 0.82)');
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(cx, h * 0.54);
  ctx.rotate(ex.t * 0.08);
  ctx.strokeStyle = hexA(ex.color, 0.14);
  ctx.lineWidth = 1;
  for (let i = 0; i < 22; i++) {
    const ang = (i / 22) * TAU;
    ctx.beginPath();
    ctx.moveTo(Math.cos(ang) * 120, Math.sin(ang) * 120);
    ctx.lineTo(Math.cos(ang) * Math.max(w, h), Math.sin(ang) * Math.max(w, h));
    ctx.stroke();
  }
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = hexA(ex.color, 0.08);
  ctx.font = `900 ${Math.min(150, w * 0.16)}px "Avenir Next", "Trebuchet MS", sans-serif`;
  ctx.fillText(ex.hero.name.toUpperCase(), cx, h * 0.53);

  ctx.fillStyle = hexA(ex.color, 0.95);
  ctx.font = '900 10px "Avenir Next", "Trebuchet MS", sans-serif';
  ctx.letterSpacing = '4px';
  ctx.fillText('EXECUTION', cx, h * 0.66);

  const titleSize = Math.min(42, Math.max(21, w * 0.055));
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${titleSize}px "Avenir Next", "Trebuchet MS", sans-serif`;
  ctx.shadowColor = ex.color;
  ctx.shadowBlur = 20;
  ctx.fillText(ex.sk.name.toUpperCase(), cx, h * 0.72);
  ctx.shadowBlur = 0;

  ctx.fillStyle = hexA(ex.color, 0.9);
  ctx.font = '800 9px "Avenir Next", "Trebuchet MS", sans-serif';
  ctx.fillText(`${ex.hero.name.toUpperCase()} · ${ex.hero.role.toUpperCase()}`, cx, h * 0.78);

  const bar = Math.min(58, h * 0.09) * Math.min(1, ex.t / 0.22);
  ctx.fillStyle = '#02040a';
  ctx.fillRect(0, 0, w, bar);
  ctx.fillRect(0, h - bar, w, bar);
  ctx.strokeStyle = hexA(ex.color, 0.42);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, bar);
  ctx.lineTo(w, bar);
  ctx.moveTo(0, h - bar);
  ctx.lineTo(w, h - bar);
  ctx.stroke();

  const lineW = Math.min(w * 0.58, 520);
  const lineX = cx - lineW / 2;
  const lineY = h - bar - 20;
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(lineX, lineY, lineW, 2);
  ctx.fillStyle = ex.color;
  ctx.fillRect(lineX, lineY, lineW * clamp(ex.t / ex.duration, 0, 1), 2);

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(236, 249, 255, 0.72)';
  ctx.font = '800 8px "Avenir Next", "Trebuchet MS", sans-serif';
  ctx.fillText(ex.kills > 0 ? `${ex.kills} ${ex.kills === 1 ? 'FOE' : 'FOES'} EXECUTED` : 'THE STAGE IS YOURS', 20, h - bar - 34);

  if (ex.t < 0.2) {
    ctx.globalAlpha = (1 - ex.t / 0.2) * 0.72;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

function drawAmbient() {
  const th = THEMES[run.zone.theme];
  const t = run.time;
  for (const a of run.ambient) {
    if (a.x < camera.x - 30 || a.x > camera.x + view.w / WORLD_ZOOM + 30) continue;
    if (a.y < camera.y - 30 || a.y > camera.y + view.h / WORLD_ZOOM + 30) continue;
    const alpha = a.alpha * (0.65 + 0.35 * Math.sin(t * 2 + a.phase));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = th.particle;
    if (a.type === 'shard') {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(t * 0.5 + a.phase);
      ctx.fillRect(-a.size / 2, -a.size / 2, a.size, a.size);
      ctx.restore();
    } else if (a.type === 'snow') {
      ctx.fillStyle = 'rgba(235, 242, 255, 0.8)';
      ctx.fillRect(a.x, a.y, a.size * 0.8, a.size * 0.8);
    } else if (a.type === 'bubble') {
      ctx.strokeStyle = th.particle;
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.size, 0, TAU);
      ctx.stroke();
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
  const hero = p.hero || getHero();
  const pal = p.skin?.palette || {};
  const auraColor = pal.aura || hero.color || '#39d7ff';
  const scarfColor = pal.scarf || hero.color || '#39d7ff';
  const cloak = pal.cloak || '#0a1c2a';
  const cloak2 = pal.cloak2 || '#12344a';
  const hood = pal.hood || '#081521';
  const eyeColor = pal.eye || '#6ff0ff';
  const trim = pal.trim || '#ffc857';
  const powerRank = state.attributes.power || 0;
  const armorRank = state.attributes.armor || 0;
  const agiRank = state.attributes.agility || 0;
  const focusRank = state.attributes.focus || 0;
  const vitRank = state.attributes.vitality || 0;
  const raging = p.rageActive > 0;
  const rageColor = '#ff5c6c';

  // Dash ghosts
  for (const g of p.ghosts) {
    const k = g.life / g.max;
    ctx.save();
    ctx.globalAlpha = k * 0.3;
    ctx.translate(g.x, g.y);
    ctx.fillStyle = raging ? rageColor : auraColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 17, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -14, 8, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = k * 0.55;
    ctx.strokeStyle = raging ? '#ffd166' : '#bff7ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-Math.cos(g.angle) * 8, -Math.sin(g.angle) * 8);
    ctx.lineTo(-Math.cos(g.angle) * 24, -Math.sin(g.angle) * 24);
    ctx.stroke();
    ctx.restore();
  }

  // Soft speed trail
  for (const t of p.trail) {
    const k = t.life / t.max;
    ctx.globalAlpha = k * (raging ? 0.22 : 0.16);
    ctx.fillStyle = raging ? rageColor : auraColor;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 8 * k + 2, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const blink = p.invuln > 0 && Math.sin(run.time * 46) > 0 ? 0.55 : 1;
  const moving = p.moving;
  const bob = moving
    ? Math.abs(Math.sin(p.walkPhase)) * 2.2
    : Math.sin(run.time * 2.2) * 1.1;
  const attackT = p.attackAnim > 0 ? 1 - p.attackAnim / 0.24 : 0;
  const facingAngle = Math.atan2(p.facing.y, p.facing.x);

  ctx.save();
  ctx.globalAlpha = blink;
  ctx.translate(p.x, p.y + bob);
  ctx.scale(1.22, 1.22);

  // Shadow
  ctx.globalAlpha = blink * 0.35;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(0, 20, 16, 5, 0, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = blink;

  // Ground light keeps the hero readable against dark arenas.
  const ground = ctx.createRadialGradient(0, 18, 2, 0, 18, 34);
  ground.addColorStop(0, hexA(raging ? rageColor : auraColor, raging ? 0.24 : 0.12));
  ground.addColorStop(1, hexA(raging ? rageColor : auraColor, 0));
  ctx.fillStyle = ground;
  ctx.beginPath();
  ctx.ellipse(0, 18, 34, 12, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = hexA(raging ? rageColor : auraColor, 0.3);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(0, 18, 23, 7, 0, 0, TAU);
  ctx.stroke();

  // Aura
  const auraR = 34 + focusRank * 0.7 + (raging ? 20 : 0);
  const aura = ctx.createRadialGradient(0, 2, 6, 0, 2, auraR);
  aura.addColorStop(0, hexA(raging ? rageColor : auraColor, raging ? 0.24 : 0.12));
  aura.addColorStop(1, hexA(raging ? rageColor : auraColor, 0));
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 2, auraR, 0, TAU);
  ctx.fill();

  if (raging) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const a = run.time * 3.2 + i * 2.1;
      ctx.strokeStyle = i % 2 ? 'rgba(255, 209, 102, 0.4)' : 'rgba(255, 92, 108, 0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 29 + i * 6 + Math.sin(run.time * 4 + i) * 2, a, a + 1.5);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (p.shield > 0) {
    ctx.strokeStyle = `rgba(139, 233, 255, ${0.35 + Math.sin(run.time * 6) * 0.15})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, TAU);
    ctx.stroke();
  }

  // Body proportions per hero
  const bodyScale = hero.id === 'mira' ? 1.24 : hero.id === 'sora' ? 0.94 : hero.id === 'yuki' ? 0.97 : 1.02;
  ctx.save();
  ctx.scale(bodyScale, 1);

  // Legs / tabi boots
  const legSwing = moving ? Math.sin(p.walkPhase) * 3 : 0;
  ctx.fillStyle = hood;
  ctx.beginPath();
  ctx.ellipse(-6, 12 + legSwing, 4.2, 8, -0.06, 0, TAU);
  ctx.ellipse(6, 12 - legSwing, 4.2, 8, 0.06, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = hexA(trim, 0.6);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-9, 15 + legSwing); ctx.lineTo(-3, 15 + legSwing);
  ctx.moveTo(3, 15 - legSwing); ctx.lineTo(9, 15 - legSwing);
  ctx.stroke();

  if (hero.id === 'mira') {
    ctx.fillStyle = '#1a1208';
    ctx.strokeStyle = hexA(trim, 0.65);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(-15, 4, 7, 15, -0.25, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-17, 0); ctx.lineTo(-13, 4); ctx.lineTo(-17, 8);
    ctx.stroke();
  }
  if (hero.id === 'yuki') {
    ctx.fillStyle = hood;
    ctx.strokeStyle = hexA(trim, 0.45);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-8, -2);
    ctx.lineTo(-17, -12);
    ctx.lineTo(-13, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = hexA(scarfColor, 0.8);
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-13 + i * 2, -12 + i * 3);
      ctx.lineTo(-18 + i * 2, -20 + i * 3);
      ctx.stroke();
    }
  }

  // Scarf / ribbons / ash trail behind the body
  const bx = -p.facing.x;
  const by = -p.facing.y;
  const sway = Math.sin(run.time * 8) * 5;
  const scarfLen = 28 + agiRank * 1.4 + (raging ? 8 : 0);
  if (hero.id === 'sora') {
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = hexA(scarfColor, 0.55 - i * 0.14);
      ctx.lineWidth = 2.4 - i * 0.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bx * (2 + i * 2), by * (2 + i * 2) - 4);
      ctx.quadraticCurveTo(
        bx * (12 + i * 5) + sway * (i + 1),
        by * (12 + i * 5) + 6,
        bx * scarfLen + sway * (1.5 + i * 0.4),
        by * scarfLen + 14 + i * 5,
      );
      ctx.stroke();
    }
  } else {
    ctx.strokeStyle = scarfColor;
    ctx.lineCap = 'round';
    ctx.lineWidth = hero.id === 'ren' ? 5.2 : 4.6;
    ctx.beginPath();
    ctx.moveTo(bx * 2, by * 2 - 5);
    ctx.quadraticCurveTo(bx * 16 + sway, by * 16 + 6, bx * scarfLen + sway * 1.5, by * scarfLen + 14);
    ctx.stroke();
    ctx.strokeStyle = hexA(scarfColor, 0.55);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(bx * 3, by * 3 - 3);
    ctx.quadraticCurveTo(bx * 13 - sway, by * 13 + 11, bx * (scarfLen - 6) - sway, by * (scarfLen - 6) + 18);
    ctx.stroke();
  }

  // Cloak / body
  ctx.fillStyle = cloak;
  ctx.beginPath();
  ctx.moveTo(-12, -5);
  ctx.quadraticCurveTo(-17, 8, -11, 19);
  ctx.quadraticCurveTo(0, 23, 11, 19);
  ctx.quadraticCurveTo(17, 8, 12, -5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = cloak2;
  ctx.beginPath();
  ctx.moveTo(-9, -4);
  ctx.quadraticCurveTo(-11, 8, -7, 17);
  ctx.quadraticCurveTo(0, 20, 7, 17);
  ctx.quadraticCurveTo(11, 8, 9, -4);
  ctx.closePath();
  ctx.fill();

  // Chest wrap / hero emblem
  ctx.strokeStyle = hexA(trim, 0.5);
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-8, -4);
  ctx.lineTo(8, 6);
  ctx.stroke();
  if (hero.id === 'mira') {
    ctx.fillStyle = hexA(trim, 0.5);
    ctx.fillRect(-7, 1, 14, 2);
  }
  if (vitRank > 0) {
    ctx.fillStyle = hexA('#ff7a8a', 0.2 + vitRank * 0.035);
    ctx.beginPath();
    ctx.moveTo(0, -1);
    ctx.lineTo(2.3, 1.8);
    ctx.lineTo(0, 4.6);
    ctx.lineTo(-2.3, 1.8);
    ctx.closePath();
    ctx.fill();
  }

  // Belt
  ctx.fillStyle = hexA(trim, 0.75);
  ctx.fillRect(-8.5, 6, 17, 2.5);
  ctx.fillStyle = trim;
  ctx.beginPath();
  ctx.moveTo(0, 5); ctx.lineTo(2.2, 8.2); ctx.lineTo(0, 11.4); ctx.lineTo(-2.2, 8.2);
  ctx.closePath();
  ctx.fill();

  if (hero.id === 'mira') {
    ctx.fillStyle = '#1a1208';
    ctx.strokeStyle = hexA(trim, 0.55);
    ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 7 - 4, 12);
      ctx.lineTo(i * 7 + 4, 12);
      ctx.lineTo(i * 7 + 2, 24);
      ctx.lineTo(i * 7 - 2, 24);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = hexA(trim, 0.22);
    ctx.fillRect(-6, -4, 12, 4);
  }
  if (hero.id === 'ren') {
    ctx.fillStyle = hexA(scarfColor, 0.3);
    ctx.beginPath();
    ctx.ellipse(-13, 6, 6, 10, -0.3, 0, TAU);
    ctx.ellipse(13, 6, 6, 10, 0.3, 0, TAU);
    ctx.fill();
    ctx.fillStyle = cloak;
    ctx.beginPath();
    ctx.moveTo(-11, 18); ctx.lineTo(-5, 18); ctx.lineTo(-7, 29); ctx.closePath();
    ctx.moveTo(11, 18); ctx.lineTo(5, 18); ctx.lineTo(7, 29); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = hexA(trim, 0.55);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-11, 22); ctx.lineTo(11, 22);
    ctx.stroke();
  }
  if (hero.id === 'sora') {
    ctx.strokeStyle = hexA(scarfColor, 0.55);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, 8);
    ctx.quadraticCurveTo(0, 12, 10, 8);
    ctx.stroke();
    ctx.fillStyle = cloak;
    ctx.beginPath();
    ctx.moveTo(-11, 18); ctx.lineTo(-8, 18); ctx.lineTo(-10, 30); ctx.closePath();
    ctx.moveTo(11, 18); ctx.lineTo(8, 18); ctx.lineTo(10, 30); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = hexA(trim, 0.5);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-11, 9); ctx.lineTo(11, 9);
    ctx.stroke();
  }
  if (hero.id === 'yuki') {
    ctx.strokeStyle = hexA(trim, 0.5);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-13, -2);
    ctx.lineTo(-9, 12);
    ctx.moveTo(13, -2);
    ctx.lineTo(9, 12);
    ctx.stroke();
    ctx.fillStyle = hexA(scarfColor, 0.2);
    ctx.beginPath();
    ctx.moveTo(-14, 16); ctx.lineTo(-8, 16); ctx.lineTo(-11, 26); ctx.closePath();
    ctx.moveTo(14, 16); ctx.lineTo(8, 16); ctx.lineTo(11, 26); ctx.closePath();
    ctx.fill();
  }
  if (hero.id === 'aster') {
    ctx.strokeStyle = hexA(trim, 0.55);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-11, 18); ctx.lineTo(-7, 18); ctx.lineTo(-9, 29); ctx.closePath();
    ctx.moveTo(11, 18); ctx.lineTo(7, 18); ctx.lineTo(9, 29); ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = hexA('#ffd166', 0.65);
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.arc(i * 6, 21 + (i === 0 ? 2 : 0), 1, 0, TAU);
      ctx.fill();
    }
  }

  // Shoulder plates grow with Armor rank
  const shoulder = 5.2 + Math.min(3, armorRank * 0.28);
  ctx.fillStyle = hood;
  ctx.beginPath();
  ctx.ellipse(-11, -2, shoulder, shoulder + 1.2, -0.28, 0, TAU);
  ctx.ellipse(11, -2, shoulder, shoulder + 1.2, 0.28, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = hexA(trim, 0.35 + armorRank * 0.035);
  ctx.lineWidth = 1 + armorRank * 0.04;
  ctx.beginPath();
  ctx.arc(-11, -2, shoulder + 0.2, Math.PI * 0.8, Math.PI * 1.9);
  ctx.arc(11, -2, shoulder + 0.2, Math.PI * 1.1, Math.PI * 2.2);
  ctx.stroke();
  if (armorRank >= 4) {
    ctx.strokeStyle = hexA(trim, 0.22);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-15, 4); ctx.lineTo(-11, 8);
    ctx.moveTo(15, 4); ctx.lineTo(11, 8);
    ctx.stroke();
  }
  if (armorRank >= 9) {
    ctx.fillStyle = hexA(trim, 0.55);
    ctx.beginPath();
    ctx.arc(-11, -2, 2.2, 0, TAU);
    ctx.arc(11, -2, 2.2, 0, TAU);
    ctx.fill();
  }

  // Hooded head
  const headTilt = p.facing.y * 1.2;
  ctx.fillStyle = hood;
  ctx.beginPath();
  ctx.moveTo(-10, -11);
  ctx.quadraticCurveTo(-13, -28, 0, -31 + headTilt);
  ctx.quadraticCurveTo(13, -28, 10, -11);
  ctx.quadraticCurveTo(0, -5, -10, -11);
  ctx.closePath();
  ctx.fill();

  if (hero.id === 'mira') {
    ctx.fillStyle = hood;
    ctx.strokeStyle = trim;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, -18 + headTilt, 12, Math.PI * 1.02, Math.PI * 1.98);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = trim;
    ctx.beginPath();
    ctx.moveTo(-9, -26 + headTilt);
    ctx.lineTo(-17, -36 + headTilt);
    ctx.lineTo(-5, -30 + headTilt);
    ctx.moveTo(9, -26 + headTilt);
    ctx.lineTo(17, -36 + headTilt);
    ctx.lineTo(5, -30 + headTilt);
    ctx.fill();
    ctx.fillStyle = '#071018';
    ctx.fillRect(-6, -20 + headTilt, 12, 3);
  }
  if (hero.id === 'ren') {
    ctx.fillStyle = scarfColor;
    ctx.beginPath();
    ctx.moveTo(0, -48 + headTilt);
    ctx.lineTo(-16, -27 + headTilt);
    ctx.lineTo(16, -27 + headTilt);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = trim;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-19, -27 + headTilt);
    ctx.lineTo(19, -27 + headTilt);
    ctx.stroke();
    ctx.strokeStyle = hexA(eyeColor, 0.55);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-8, -42 + headTilt); ctx.lineTo(-5, -31 + headTilt);
    ctx.stroke();
  }
  if (hero.id === 'sora') {
    ctx.fillStyle = cloak2;
    ctx.strokeStyle = trim;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-11, -11);
    ctx.quadraticCurveTo(-13, -31, 0, -34 + headTilt);
    ctx.quadraticCurveTo(13, -31, 11, -11);
    ctx.quadraticCurveTo(6, -7, 0, -6);
    ctx.quadraticCurveTo(-6, -7, -11, -11);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = hexA(scarfColor, 0.7);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-11, -13); ctx.quadraticCurveTo(-3, -8, 0, -6);
    ctx.moveTo(11, -13); ctx.quadraticCurveTo(3, -8, 0, -6);
    ctx.stroke();
    ctx.fillStyle = scarfColor;
    ctx.beginPath();
    ctx.moveTo(9, -28 + headTilt);
    ctx.quadraticCurveTo(17, -36 + headTilt, 15, -46 + headTilt);
    ctx.quadraticCurveTo(9, -38 + headTilt, 7, -29 + headTilt);
    ctx.closePath();
    ctx.fill();
  }
  if (hero.id === 'aster') {
    ctx.fillStyle = scarfColor;
    ctx.beginPath();
    ctx.moveTo(0, -46 + headTilt);
    ctx.lineTo(-11, -23 + headTilt);
    ctx.lineTo(11, -23 + headTilt);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = trim;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-13, -23 + headTilt);
    ctx.lineTo(13, -23 + headTilt);
    ctx.stroke();
    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    ctx.arc(0, -36 + headTilt, 1.4, 0, TAU);
    ctx.fill();
  }
  if (hero.id === 'yuki') {
    ctx.fillStyle = scarfColor;
    ctx.beginPath();
    ctx.moveTo(-7, -28 + headTilt);
    ctx.quadraticCurveTo(-16, -38 + headTilt, -10, -46 + headTilt);
    ctx.quadraticCurveTo(-2, -36 + headTilt, -3, -27 + headTilt);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = hexA(eyeColor, 0.55);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-9, -42 + headTilt);
    ctx.lineTo(-5, -31 + headTilt);
    ctx.stroke();
  }

  // Hood inner + face
  ctx.fillStyle = cloak2;
  ctx.beginPath();
  ctx.ellipse(0, -18 + headTilt * 0.4, 7.8, 8.6, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#050b11';
  ctx.beginPath();
  ctx.ellipse(0, -16.5 + headTilt * 0.4, 6.7, 6.2, 0, 0, TAU);
  ctx.fill();

  // Eyes
  const ex = p.facing.x * 2.8;
  const ey = p.facing.y * 2.2 + headTilt * 0.4;
  ctx.fillStyle = raging ? '#ffd166' : eyeColor;
  ctx.shadowColor = raging ? rageColor : auraColor;
  ctx.shadowBlur = 8 + focusRank * 0.4;
  ctx.beginPath();
  ctx.ellipse(-3 + ex, -17 + ey, 1.7, 1.2, -0.15, 0, TAU);
  ctx.ellipse(3 + ex, -17 + ey, 1.7, 1.2, 0.15, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Hood rim + crest
  ctx.strokeStyle = hexA(raging ? rageColor : auraColor, 0.5);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-10, -12);
  ctx.quadraticCurveTo(-11, -27, 0, -30 + headTilt);
  ctx.quadraticCurveTo(11, -27, 10, -12);
  ctx.stroke();
  ctx.fillStyle = trim;
  ctx.beginPath();
  ctx.moveTo(0, -26 + headTilt);
  ctx.lineTo(2, -23.5 + headTilt);
  ctx.lineTo(0, -21 + headTilt);
  ctx.lineTo(-2, -23.5 + headTilt);
  ctx.closePath();
  ctx.fill();

  // Back arm
  ctx.fillStyle = cloak2;
  ctx.beginPath();
  ctx.ellipse(-12, 3, 3.6, 6, -0.25, 0, TAU);
  ctx.fill();

  // Weapon arm
  const baseAngle = facingAngle + 0.65;
  let swing = baseAngle;
  let armLen = hero.id === 'mira' ? 17 : 14;
  if (attackT > 0) {
    swing = baseAngle + (attackT - 0.45) * 2.5 * p.swingSide;
    armLen += 4;
  }
  ctx.save();
  ctx.translate(9, -2);
  ctx.rotate(swing);
  ctx.strokeStyle = hexA(cloak2, 1);
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(armLen, 0);
  ctx.stroke();
  ctx.fillStyle = hood;
  ctx.beginPath();
  ctx.arc(armLen, 0, 3.4, 0, TAU);
  ctx.fill();

  drawHeroWeapon2(p.blade || getBlade(), hero, armLen, powerRank, raging, trim, p.skin?.palette || {});

  // Glove wrapped around the weapon grip.
  ctx.fillStyle = trim;
  ctx.strokeStyle = hexA(hood, 0.9);
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(armLen, 0, 4.5, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(armLen + 1, -2);
  ctx.lineTo(armLen + 3.8, -1);
  ctx.moveTo(armLen + 1, 1.8);
  ctx.lineTo(armLen + 3.8, 2.4);
  ctx.stroke();

  ctx.restore();

  // Attack flash at the hand
  if (attackT > 0) {
    ctx.globalAlpha = blink * (1 - attackT) * 0.85;
    ctx.fillStyle = raging ? '#ffd166' : '#eaffff';
    ctx.beginPath();
    ctx.arc(12, -2, 4 + attackT * 5, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = blink;
  }

  if (p.hitFlash > 0) {
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = blink;
  }

  ctx.restore(); // body scale
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawHeroWeapon(blade, hero, armLen, powerRank, raging, trim) {
  const borrowed = !blade || blade.id === 'blade-borrowed';
  const heroEdge = { kaito: '#dff9ff', mira: '#ffe6a3', ren: '#ffd0a0', sora: '#ead8ff' };
  const edge = borrowed ? (heroEdge[hero.id] || '#dff9ff') : (blade.edge || '#dff9ff');
  const glow = raging ? '#ffd166' : (borrowed ? hero.color : (blade.glow || '#39d7ff'));
  const rankGlow = powerRank >= 12 ? '#ff5c6c'
    : powerRank >= 9 ? '#ffd166'
      : powerRank >= 6 ? '#ffb347'
        : powerRank >= 3 ? '#8be9ff'
          : glow;
  const hilt = blade.hilt || trim;
  const len = (blade.shape === 'needle' || blade.shape === 'katana' ? 24 : 22) + powerRank * 1.15 + (raging ? 6 : 0);
  const start = armLen + 3;
  const end = start + len;

  ctx.save();
  ctx.shadowColor = rankGlow;
  ctx.shadowBlur = 10 + powerRank * 0.8;

  if (hero.id === 'yuki') {
    // Curved storm-bow held at the grip; the arrow is drawn through the hand.
    ctx.save();
    ctx.translate(armLen + 2, 0);
    ctx.strokeStyle = hexA(glow, 0.45);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, 22, -1.35, 1.35);
    ctx.stroke();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 22, -1.35, 1.35);
    ctx.stroke();
    ctx.strokeStyle = hexA(edge, 0.8);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.cos(-1.35) * 22, Math.sin(-1.35) * 22);
    ctx.lineTo(Math.cos(1.35) * 22, Math.sin(1.35) * 22);
    ctx.stroke();
    ctx.strokeStyle = rankGlow;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(31, 0);
    ctx.stroke();
    ctx.fillStyle = edge;
    ctx.beginPath();
    ctx.moveTo(32, 0); ctx.lineTo(27, -3); ctx.lineTo(27, 3); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.shadowBlur = 0;
    ctx.restore();
    return;
  }

  if (hero.id === 'aster') {
    // Arcane orb held above the palm, with two turning sigils.
    const ox = armLen + 9;
    ctx.fillStyle = rankGlow;
    ctx.beginPath();
    ctx.arc(ox, 0, 6.5 + powerRank * 0.1, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#f0e8ff';
    ctx.beginPath();
    ctx.arc(ox, 0, 2.4, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = hexA(rankGlow, 0.7);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(ox, 0, 12 + powerRank * 0.12, run.time * 2, run.time * 2 + 2.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ox, 0, 17 + powerRank * 0.12, -run.time * 1.4, -run.time * 1.4 + 1.2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
    return;
  }

  if (hero.id === 'mira') {
    // Warhammer: a heavy haft and a block of iron.
    const wide = 1.1;
    ctx.strokeStyle = '#3b2b1c';
    ctx.lineWidth = 4.6;
    ctx.beginPath();
    ctx.moveTo(armLen + 1, 0);
    ctx.lineTo(end + 4, 0);
    ctx.stroke();
    const headX = end + 4;
    ctx.fillStyle = hexA(edge, 0.85);
    ctx.beginPath();
    ctx.moveTo(headX, -12 * wide);
    ctx.lineTo(headX + 16, -8 * wide);
    ctx.lineTo(headX + 18, 8 * wide);
    ctx.lineTo(headX, 12 * wide);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = hexA(rankGlow, 0.85);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = hilt;
    ctx.fillRect(headX - 3, -3.2, 3, 6.4);
    if (powerRank >= 6) {
      ctx.strokeStyle = hexA(rankGlow, 0.65);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(headX + 4, -6 * wide); ctx.lineTo(headX + 12, -3 * wide);
      ctx.moveTo(headX + 4, 6 * wide); ctx.lineTo(headX + 12, 3 * wide);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.restore();
    return;
  }

  if (hero.id === 'ren') {
    // War fan: ribs of ash and a burning crescent.
    ctx.strokeStyle = '#3a2216';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(armLen + 1, 0);
    ctx.lineTo(end, 0);
    ctx.stroke();
    ctx.strokeStyle = hexA(rankGlow, 0.55);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(end - 2, 0, 22, -1.15, 1.15);
    ctx.stroke();
    for (let i = -2; i <= 2; i++) {
      ctx.strokeStyle = hexA(edge, 0.8 - Math.abs(i) * 0.1);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(end - 2, 0);
      ctx.lineTo(end - 2 + Math.cos(i * 0.42) * 23, Math.sin(i * 0.42) * 23);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(end - 2, 0, 3, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
    return;
  }

  if (hero.id === 'sora') {
    // A living silk whip with a needle tip.
    ctx.strokeStyle = hexA(rankGlow, 0.45);
    ctx.lineWidth = 4.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(armLen + 1, 0);
    ctx.quadraticCurveTo(armLen + 18, -14, end + 18, 4);
    ctx.stroke();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(armLen + 1, 0);
    ctx.quadraticCurveTo(armLen + 18, -12, end + 18, 4);
    ctx.stroke();
    ctx.fillStyle = '#f0e8ff';
    ctx.beginPath();
    ctx.moveTo(end + 22, 7);
    ctx.lineTo(end + 14, 2);
    ctx.lineTo(end + 16, 11);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
    return;
  }

  if (blade.shape === 'cleaver') {
    const wide = 1;
    ctx.fillStyle = hexA(edge, 0.9);
    ctx.beginPath();
    ctx.moveTo(start, -2 * wide);
    ctx.lineTo(end, (-6 - powerRank * 0.12) * wide);
    ctx.lineTo(end + 5, 2 * wide);
    ctx.lineTo(start, 5 * wide);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = hexA(glow, 0.8);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(start + 2, 0);
    ctx.lineTo(end + 2, -1);
    ctx.stroke();
  } else if (blade.shape === 'curve') {
    ctx.strokeStyle = hexA(edge, 0.95);
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(start, 0);
    ctx.quadraticCurveTo((start + end) / 2, -8, end, -4);
    ctx.stroke();
    ctx.strokeStyle = hexA(glow, 0.8);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(start + 2, 0);
    ctx.quadraticCurveTo((start + end) / 2, -5, end - 1, -3);
    ctx.stroke();
  } else if (blade.shape === 'needle') {
    ctx.strokeStyle = hexA(glow, 0.4);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(start, 0);
    ctx.lineTo(end, 0);
    ctx.stroke();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(start, 0);
    ctx.lineTo(end, 0);
    ctx.stroke();
  } else {
    // Katana
    ctx.strokeStyle = hexA(rankGlow, 0.35 + powerRank * 0.02);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(start, 0);
    ctx.lineTo(end, 0);
    ctx.stroke();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(start, 0);
    ctx.lineTo(end, 0);
    ctx.stroke();
    if (powerRank >= 8) {
      ctx.strokeStyle = hexA(rankGlow, 0.75);
      ctx.lineWidth = 1.1;
      for (let i = 0; i < 4; i++) {
        const x = start + 5 + i * ((len - 8) / 4);
        ctx.beginPath();
        ctx.moveTo(x, -2.4);
        ctx.lineTo(x + 2.2, 0);
        ctx.lineTo(x, 2.4);
        ctx.stroke();
      }
    }
  }

  // Guard + hilt
  ctx.fillStyle = hilt;
  ctx.fillRect(start - 2, -3.2, 3, 6.4);
  ctx.strokeStyle = '#3a2412';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(armLen + 1, 0);
  ctx.lineTo(start - 2, 0);
  ctx.stroke();

  // Power-rank runes
  if (powerRank >= 4) {
    ctx.strokeStyle = hexA(rankGlow, 0.65);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(start + 7, 0, 2.4, 0, TAU);
    ctx.stroke();
  }
  if (powerRank >= 8) {
    ctx.fillStyle = hexA(rankGlow, 0.8);
    ctx.beginPath();
    ctx.arc(start + 13, 0, 1.8, 0, TAU);
    ctx.fill();
  }
  if (powerRank >= 12) {
    ctx.strokeStyle = hexA(rankGlow, 0.6);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(end - 4, 0, 3.2, 0, TAU);
    ctx.stroke();
  }

  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawHeroWeapon2(blade, hero, armLen, powerRank, raging, trim, pal = {}) {
  const heroEdge = {
    kaito: '#eaffff', mira: '#ffe6a3', ren: '#ffd0a0',
    sora: '#ead8ff', yuki: '#d8ffe8', aster: '#d8ecff',
  };
  const kaito = hero.id === 'kaito';
  const borrowed = !blade || blade.id === 'blade-borrowed';
  const persona = pal.aura || hero.color || '#39d7ff';
  const weaponColor = raging ? '#ffd166' : persona;
  const edge = kaito && !borrowed ? (blade.edge || heroEdge.kaito) : (pal.eye || heroEdge[hero.id] || '#eaffff');
  const glow = raging ? '#ffd166' : (kaito && !borrowed ? (blade.glow || persona) : persona);
  const accent = pal.trim || trim;
  const scarf = pal.scarf || persona;
  const hilt = kaito && !borrowed ? (blade.hilt || accent) : accent;
  const start = armLen + 4;
  const len = (kaito && (blade.shape === 'needle' || blade.shape === 'katana') ? 25 : 24) + powerRank * 0.7 + (raging ? 4 : 0);
  const end = start + len;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = glow;
  ctx.shadowBlur = 9 + powerRank * 0.7;

  const stroke = (color, width, path, shadow = true) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    if (!shadow) ctx.shadowBlur = 0;
    ctx.beginPath();
    path();
    ctx.stroke();
    if (!shadow) ctx.shadowColor = glow;
  };

  if (hero.id === 'mira') {
    // Long haft and a symmetrical, visibly heavy hammer head.
    stroke('#24170c', 6.8, () => { ctx.moveTo(armLen + 1, 0); ctx.lineTo(end - 3, 0); });
    stroke('#7a4a24', 4.2, () => { ctx.moveTo(armLen + 1, 0); ctx.lineTo(end - 3, 0); }, false);
    for (let i = 0; i < 4; i++) {
      const hx = armLen + 4 + i * (Math.max(8, end - armLen - 10) / 4);
      stroke(hexA(accent, 0.8), 1.1, () => { ctx.moveTo(hx, -3); ctx.lineTo(hx + 2.5, 3); }, false);
    }
    ctx.fillStyle = hilt;
    ctx.beginPath(); ctx.arc(armLen, 0, 3.2, 0, TAU); ctx.fill();

    ctx.save();
    ctx.translate(end, 0);
    ctx.shadowBlur = 14 + powerRank;
    const grad = ctx.createLinearGradient(-4, -15, 12, 15);
    grad.addColorStop(0, '#4a3418');
    grad.addColorStop(0.42, '#ffe6a3');
    grad.addColorStop(0.7, hexA(persona, 0.95));
    grad.addColorStop(1, '#5c3b16');
    ctx.fillStyle = grad;
    ctx.strokeStyle = '#1a0f06';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-1, -14);
    ctx.lineTo(8, -12);
    ctx.lineTo(13, -6);
    ctx.lineTo(13, 6);
    ctx.lineTo(8, 12);
    ctx.lineTo(-1, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = hexA(accent, 0.9);
    ctx.fillRect(5.5, -12, 3, 24);
    ctx.strokeStyle = '#1a0f06';
    ctx.lineWidth = 1;
    ctx.strokeRect(5.5, -12, 3, 24);
    for (const yy of [-8, 0, 8]) {
      ctx.fillStyle = yy === 0 ? '#fff3c4' : hexA(accent, 0.8);
      ctx.beginPath(); ctx.arc(7, yy, 1.5, 0, TAU); ctx.fill();
    }
    if (powerRank >= 5) {
      stroke(hexA(accent, 0.7), 1.05, () => {
        ctx.moveTo(-3, -9); ctx.lineTo(4, -4); ctx.lineTo(1, 1);
        ctx.moveTo(-3, 9); ctx.lineTo(4, 4); ctx.lineTo(1, -1);
      }, false);
    }
    ctx.restore();
    ctx.restore();
    return;
  }

  if (hero.id === 'ren') {
    // Folding war fan with a filled membrane, ribs, and a tassel.
    stroke('#2b160d', 4.6, () => { ctx.moveTo(armLen + 1, 0); ctx.lineTo(end - 4, 0); });
    stroke(hexA(accent, 0.7), 3, () => { ctx.moveTo(armLen + 1, 0); ctx.lineTo(end - 4, 0); }, false);
    ctx.fillStyle = hilt;
    ctx.beginPath(); ctx.arc(armLen + 1, 0, 3, 0, TAU); ctx.fill();

    const px = end - 2;
    const radius = 25;
    const fan = ctx.createRadialGradient(px, 0, 2, px, 0, radius);
    fan.addColorStop(0, '#2a0d06');
    fan.addColorStop(0.55, hexA(scarf, 0.72));
    fan.addColorStop(1, hexA(persona, 0.16));
    ctx.fillStyle = fan;
    ctx.strokeStyle = '#1a0904';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.arc(px, 0, radius, -1.2, 1.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = hexA(accent, 0.95);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(px, 0, radius, -1.2, 1.2);
    ctx.stroke();
    for (let i = -3; i <= 3; i++) {
      const a = i * 0.34;
      stroke(hexA(accent, i === 0 ? 0.95 : 0.65), 1.1, () => {
        ctx.moveTo(px, 0);
        ctx.lineTo(px + Math.cos(a) * (radius - 1), Math.sin(a) * (radius - 1));
      }, false);
    }
    ctx.fillStyle = hexA('#ffd166', 0.95);
    ctx.beginPath(); ctx.arc(px, 0, 3.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = hexA(accent, 0.75);
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(px, 3); ctx.lineTo(px - 3, 12); ctx.stroke();
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.arc(px - 3, 13, 2, 0, TAU); ctx.fill();
    ctx.restore();
    return;
  }

  if (hero.id === 'sora') {
    // Wrapped handle, coiled silk, and a silver needle tip.
    stroke('#2a1944', 5.2, () => { ctx.moveTo(armLen + 1, 0); ctx.lineTo(armLen + 13, 0); });
    stroke(hexA(accent, 0.8), 3.2, () => { ctx.moveTo(armLen + 1, 0); ctx.lineTo(armLen + 13, 0); }, false);
    for (let i = 0; i < 3; i++) {
      const hx = armLen + 3 + i * 3.4;
      stroke(hexA('#f0e8ff', 0.55), 0.9, () => { ctx.moveTo(hx, -3); ctx.lineTo(hx + 2, 3); }, false);
    }
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.arc(armLen + 13, 0, 3.4, 0, TAU); ctx.fill();

    const hx = armLen + 13;
    const tipX = hx + 31;
    const whip = () => {
      ctx.moveTo(hx, 0);
      ctx.bezierCurveTo(hx + 9, -15, hx + 18, 13, tipX, 3);
    };
    stroke(hexA(persona, 0.35), 5.2, whip);
    stroke(hexA(scarf, 0.95), 2.4, whip, false);
    stroke(hexA('#f0e8ff', 0.7), 0.8, whip, false);
    ctx.fillStyle = edge;
    ctx.beginPath();
    ctx.moveTo(tipX + 8, 4);
    ctx.lineTo(tipX - 1, 0);
    ctx.lineTo(tipX + 1, 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = hexA('#f0e8ff', 0.8);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (hero.id === 'yuki') {
    // Recurve storm bow with a nocked arrow.
    ctx.save();
    ctx.translate(armLen + 2, 0);
    const limb = () => {
      ctx.moveTo(0, -24);
      ctx.quadraticCurveTo(11, -17, 5, -7);
      ctx.quadraticCurveTo(1, 0, 5, 7);
      ctx.quadraticCurveTo(11, 17, 0, 24);
    };
    stroke('#061a13', 6, limb);
    stroke(hexA(persona, 0.95), 3, limb, false);
    stroke(hexA(edge, 0.85), 1.1, limb, false);
    ctx.strokeStyle = hexA(accent, 0.95);
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(4.5, -23); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 24); ctx.lineTo(4.5, 23); ctx.stroke();
    ctx.strokeStyle = hexA(edge, 0.7);
    ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(1, -23); ctx.lineTo(1, 23); ctx.stroke();
    ctx.fillStyle = accent;
    ctx.fillRect(-2, -5, 6, 10);
    ctx.strokeStyle = '#061a13';
    ctx.lineWidth = 0.9;
    ctx.strokeRect(-2, -5, 6, 10);
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(34, 0); ctx.stroke();
    ctx.fillStyle = hexA('#eaffff', 0.95);
    ctx.beginPath(); ctx.moveTo(35, 0); ctx.lineTo(29, -3); ctx.lineTo(29, 3); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = hexA(accent, 0.85);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(8, 0); ctx.lineTo(4, -3);
    ctx.moveTo(8, 0); ctx.lineTo(4, 3);
    ctx.stroke();
    ctx.restore();
    ctx.restore();
    return;
  }

  if (hero.id === 'aster') {
    // Arcane staff with a caged orb; the shaft is clearly held in the hand.
    ctx.save();
    ctx.translate(armLen + 1, 0);
    const staffEnd = end + 5;
    stroke('#0b1528', 5.6, () => { ctx.moveTo(-4, 0); ctx.lineTo(staffEnd, 0); });
    stroke(hexA(persona, 0.72), 3.4, () => { ctx.moveTo(-4, 0); ctx.lineTo(staffEnd, 0); }, false);
    stroke(hexA(accent, 0.55), 1, () => { ctx.moveTo(-2, -2); ctx.lineTo(staffEnd - 2, 2); }, false);
    for (let i = 0; i < 3; i++) {
      const hx = 7 + i * 8;
      stroke(hexA(accent, 0.78), 1.2, () => { ctx.moveTo(hx, -3.2); ctx.lineTo(hx, 3.2); }, false);
    }
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.arc(-4, 0, 3, 0, TAU); ctx.fill();
    const ox = staffEnd + 7;
    ctx.shadowBlur = 18 + powerRank;
    ctx.strokeStyle = hexA(accent, 0.95);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ox, 0, 11.5, -1.1, 1.1); ctx.stroke();
    ctx.beginPath(); ctx.arc(ox, 0, 11.5, Math.PI - 1.1, Math.PI + 1.1); ctx.stroke();
    const orb = ctx.createRadialGradient(ox - 2, -3, 1, ox, 0, 9);
    orb.addColorStop(0, '#f2f8ff');
    orb.addColorStop(0.45, hexA(persona, 0.95));
    orb.addColorStop(1, hexA(persona, 0.15));
    ctx.fillStyle = orb;
    ctx.beginPath(); ctx.arc(ox, 0, 9, 0, TAU); ctx.fill();
    ctx.strokeStyle = hexA('#eaf4ff', 0.85);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(ox, 0, 9, 0, TAU); ctx.stroke();
    ctx.strokeStyle = hexA(accent, 0.65);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(ox, 0, 14 + powerRank * 0.12, run.time * 1.8, run.time * 1.8 + 2.1); ctx.stroke();
    ctx.restore();
    ctx.restore();
    return;
  }

  // Kaito: readable katana silhouette with dark outline, guard, wrapped hilt and runes.
  const guardX = start + 1;
  const hiltGrad = ctx.createLinearGradient(armLen, -3, guardX, 3);
  hiltGrad.addColorStop(0, '#08131b');
  hiltGrad.addColorStop(0.5, hilt);
  hiltGrad.addColorStop(1, '#08131b');
  stroke('#061018', 6, () => { ctx.moveTo(armLen + 1, 0); ctx.lineTo(guardX - 2, 0); });
  stroke(hiltGrad, 4.2, () => { ctx.moveTo(armLen + 1, 0); ctx.lineTo(guardX - 2, 0); }, false);
  for (let i = 0; i < 3; i++) {
    const hx = armLen + 3 + i * 3.2;
    stroke(hexA(accent, 0.75), 0.9, () => { ctx.moveTo(hx, -3); ctx.lineTo(hx + 2, 3); }, false);
  }
  ctx.fillStyle = accent;
  ctx.beginPath(); ctx.arc(armLen, 0, 3.1, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#061018';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.ellipse(guardX, 0, 3.2, 8, 0, 0, TAU); ctx.fill();
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.beginPath(); ctx.ellipse(guardX, 0, 1.8, 6, 0, 0, TAU); ctx.fill();

  if (blade.shape === 'cleaver') {
    ctx.fillStyle = hexA(edge, 0.93);
    ctx.strokeStyle = '#061018';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(guardX + 1, -3);
    ctx.lineTo(end - 4, -9);
    ctx.lineTo(end + 5, 1);
    ctx.lineTo(guardX + 1, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = hexA(glow, 0.65);
    ctx.beginPath(); ctx.moveTo(end - 6, -6); ctx.lineTo(end + 2, -2); ctx.lineTo(end - 6, 0); ctx.closePath(); ctx.fill();
  } else if (blade.shape === 'curve') {
    ctx.strokeStyle = '#061018';
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(guardX + 1, 0); ctx.quadraticCurveTo((guardX + end) / 2 + 2, -11, end + 4, -7); ctx.stroke();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.moveTo(guardX + 1, 0); ctx.quadraticCurveTo((guardX + end) / 2 + 2, -10, end + 4, -7); ctx.stroke();
    ctx.strokeStyle = hexA(glow, 0.8);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(guardX + 2, -1); ctx.quadraticCurveTo((guardX + end) / 2 + 4, -8, end + 2, -6); ctx.stroke();
  } else if (blade.shape === 'needle') {
    ctx.strokeStyle = '#061018';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(guardX + 1, 0); ctx.lineTo(end + 7, 0); ctx.stroke();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(guardX + 1, 0); ctx.lineTo(end + 7, 0); ctx.stroke();
    ctx.strokeStyle = hexA(glow, 0.9);
    ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(guardX + 2, 0); ctx.lineTo(end + 6, 0); ctx.stroke();
  } else {
    ctx.strokeStyle = '#061018';
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(guardX + 1, 0); ctx.quadraticCurveTo((guardX + end) / 2, -1.8, end + 4, -1); ctx.stroke();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 3.1;
    ctx.beginPath(); ctx.moveTo(guardX + 1, 0); ctx.quadraticCurveTo((guardX + end) / 2, -1.2, end + 4, -1); ctx.stroke();
    ctx.strokeStyle = hexA(glow, 0.95);
    ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(guardX + 2, 0); ctx.quadraticCurveTo((guardX + end) / 2, -0.6, end + 3, -0.5); ctx.stroke();
  }

  if (powerRank >= 4) {
    ctx.strokeStyle = hexA(glow, 0.62);
    ctx.lineWidth = 1;
    for (let i = 0; i < Math.min(4, Math.floor(powerRank / 3)); i++) {
      const x = guardX + 7 + i * 5;
      ctx.beginPath();
      ctx.moveTo(x, -2.2);
      ctx.lineTo(x + 2, 0);
      ctx.lineTo(x, 2.2);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function hexA(hex, alpha) {
  const h = String(hex || '#39d7ff').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function drawEnemies() {
  const sorted = [...run.enemies].sort((a, b) => a.y - b.y);
  for (const e of sorted) {
    if (!e.dead) drawEnemy(e);
  }
}

function drawBossDeath() {
  const bd = run.bossDeath;
  if (!bd || !bd.enemy) return;
  const enemy = bd.enemy;
  drawEnemy(enemy);
  const k = clamp(bd.t / bd.max, 0, 1);
  ctx.save();
  ctx.globalAlpha = k * 0.8;
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(bd.x, bd.y, enemy.radius * (1.2 + (1 - k) * 5), 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = k * 0.45;
  ctx.strokeStyle = enemy.def.color;
  ctx.beginPath();
  ctx.arc(bd.x, bd.y, enemy.radius * (2 + (1 - k) * 8), 0, TAU);
  ctx.stroke();
  ctx.restore();
}

const HUMANOID_ENEMY_SHAPES = new Set([
  'bandit', 'archer', 'brute', 'rogue', 'mage', 'adept', 'ronin',
  'pyromancer', 'guard', 'monk', 'sentinel', 'skysentinel', 'dancer',
  'drowned', 'tide', 'void_archer', 'skyblade',
]);

function drawHumanoidEnemy(e, r, col, acc, ang) {
  const v = e.def.shape;
  const robe = ['mage', 'pyromancer', 'adept', 'drowned', 'tide', 'monk', 'dancer'].includes(v);
  const mech = v === 'sentinel' || v === 'skysentinel';
  const brute = v === 'brute';
  const monk = v === 'monk';
  const archer = v === 'archer' || v === 'void_archer';
  const caster = ['mage', 'pyromancer', 'adept', 'drowned', 'tide'].includes(v);
  const katana = v === 'ronin' || v === 'skyblade';
  const guard = v === 'guard';
  const step = Math.sin(e.walkPhase || 0) * r * 0.05;
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);

  // Legs and feet
  if (!robe && !mech) {
    ctx.fillStyle = acc;
    ctx.beginPath();
    ctx.ellipse(-r * 0.26, r * 0.72 + step, r * 0.16, r * 0.28, -0.08, 0, TAU);
    ctx.ellipse(r * 0.26, r * 0.72 - step, r * 0.16, r * 0.28, 0.08, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1a120c';
    ctx.beginPath();
    ctx.ellipse(-r * 0.28, r * 0.93 + step, r * 0.2, r * 0.09, 0, 0, TAU);
    ctx.ellipse(r * 0.28, r * 0.93 - step, r * 0.2, r * 0.09, 0, 0, TAU);
    ctx.fill();
  }

  // Torso / robe / armor
  if (robe) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.42);
    ctx.quadraticCurveTo(r * 0.62, -r * 0.1, r * 0.72, r * 0.92);
    ctx.quadraticCurveTo(0, r * 1.12, -r * 0.72, r * 0.92);
    ctx.quadraticCurveTo(-r * 0.62, -r * 0.1, 0, -r * 0.42);
    ctx.fill();
    ctx.strokeStyle = acc;
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.strokeStyle = hexA(acc, 0.75);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.48, r * 0.18);
    ctx.lineTo(r * 0.48, r * 0.18);
    ctx.stroke();
  } else if (mech) {
    ctx.fillStyle = col;
    ctx.fillRect(-r * 0.5, -r * 0.45, r, r * 1.05);
    ctx.strokeStyle = acc;
    ctx.lineWidth = 2;
    ctx.strokeRect(-r * 0.5, -r * 0.45, r, r * 1.05);
    ctx.fillStyle = acc;
    ctx.fillRect(-r * 0.65, -r * 0.4, r * 0.24, r * 0.34);
    ctx.fillRect(r * 0.41, -r * 0.4, r * 0.24, r * 0.34);
    ctx.fillStyle = hexA(acc, 0.65);
    ctx.fillRect(-r * 0.3, r * 0.05, r * 0.6, r * 0.08);
    ctx.strokeStyle = hexA(acc, 0.6);
    ctx.lineWidth = 1;
    ctx.strokeRect(-r * 0.35, r * 0.28, r * 0.7, r * 0.22);
  } else {
    ctx.fillStyle = brute ? acc : col;
    ctx.beginPath();
    ctx.moveTo(-r * 0.58, -r * 0.32);
    ctx.quadraticCurveTo(0, -r * 0.52, r * 0.58, -r * 0.32);
    ctx.lineTo(r * 0.46, r * 0.58);
    ctx.quadraticCurveTo(0, r * 0.72, -r * 0.46, r * 0.58);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = brute ? col : acc;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = brute ? col : acc;
    ctx.fillRect(-r * 0.42, r * 0.12, r * 0.84, r * 0.12);
  }

  // Arms
  ctx.fillStyle = mech ? acc : brute ? acc : col;
  ctx.beginPath();
  ctx.ellipse(-r * 0.68, r * 0.02, r * 0.16, r * 0.32, -0.25, 0, TAU);
  ctx.ellipse(r * 0.68, r * 0.02, r * 0.16, r * 0.32, 0.25, 0, TAU);
  ctx.fill();
  ctx.fillStyle = acc;
  ctx.beginPath();
  ctx.arc(-r * 0.72, r * 0.3, r * 0.12, 0, TAU);
  ctx.arc(r * 0.72, r * 0.3, r * 0.12, 0, TAU);
  ctx.fill();

  // Head
  const headY = -r * 0.68;
  if (mech) {
    ctx.fillStyle = acc;
    ctx.fillRect(-r * 0.3, headY - r * 0.28, r * 0.6, r * 0.5);
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(-r * 0.3, headY - r * 0.28, r * 0.6, r * 0.5);
    ctx.fillStyle = '#eafcff';
    ctx.fillRect(-r * 0.2, headY - r * 0.08, r * 0.12, r * 0.07);
    ctx.fillRect(r * 0.08, headY - r * 0.08, r * 0.12, r * 0.07);
  } else if (monk) {
    ctx.fillStyle = acc;
    ctx.beginPath(); ctx.arc(0, headY, r * 0.32, 0, TAU); ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(0, headY - r * 0.04, r * 0.24, Math.PI, TAU); ctx.fill();
    ctx.fillStyle = '#f5e8c4';
    ctx.beginPath();
    ctx.arc(-r * 0.11, headY + r * 0.02, r * 0.045, 0, TAU);
    ctx.arc(r * 0.11, headY + r * 0.02, r * 0.045, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#6e4a26';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, headY + r * 0.12, r * 0.08, 0.2, Math.PI - 0.2); ctx.stroke();
  } else {
    // Hood/face base
    ctx.fillStyle = acc;
    ctx.beginPath(); ctx.arc(0, headY, r * 0.33, 0, TAU); ctx.fill();
    ctx.fillStyle = '#160d09';
    ctx.beginPath(); ctx.ellipse(0, headY + r * 0.04, r * 0.24, r * 0.17, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f3d6a0';
    ctx.beginPath(); ctx.ellipse(0, headY + r * 0.07, r * 0.18, r * 0.11, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.arc(-r * 0.09 + dx * r * 0.04, headY + r * 0.02 + dy * r * 0.02, r * 0.035, 0, TAU);
    ctx.arc(r * 0.09 + dx * r * 0.04, headY + r * 0.02 + dy * r * 0.02, r * 0.035, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#2a160c';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-r * 0.07, headY + r * 0.14);
    ctx.quadraticCurveTo(0, headY + r * 0.17, r * 0.07, headY + r * 0.14);
    ctx.stroke();
  }

  // Headgear
  if (v === 'ronin' || v === 'skyblade') {
    ctx.fillStyle = v === 'skyblade' ? '#d8e4ff' : '#c39a58';
    ctx.beginPath();
    ctx.moveTo(-r * 0.62, headY - r * 0.12);
    ctx.lineTo(0, headY - r * 0.5);
    ctx.lineTo(r * 0.62, headY - r * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#24160c';
    ctx.lineWidth = 1;
    ctx.stroke();
  } else if (archer || v === 'bandit' || v === 'rogue') {
    ctx.fillStyle = v === 'void_archer' ? '#2a1840' : col;
    ctx.beginPath();
    ctx.arc(0, headY - r * 0.06, r * 0.36, Math.PI * 1.06, Math.PI * 1.94);
    ctx.lineTo(r * 0.22, headY + r * 0.08);
    ctx.quadraticCurveTo(0, headY - r * 0.1, -r * 0.22, headY + r * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = acc;
    ctx.lineWidth = 1;
    ctx.stroke();
    if (v === 'bandit') {
      ctx.fillStyle = acc;
      ctx.fillRect(-r * 0.25, headY - r * 0.06, r * 0.5, r * 0.07);
      ctx.strokeStyle = acc;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-r * 0.25, headY - r * 0.02);
      ctx.lineTo(-r * 0.5, headY + r * 0.15);
      ctx.stroke();
    }
  } else if (caster) {
    ctx.fillStyle = v === 'pyromancer' ? '#ff8a4c' : v === 'tide' ? '#7ffff0' : col;
    ctx.beginPath();
    ctx.moveTo(-r * 0.38, headY - r * 0.12);
    ctx.lineTo(0, headY - r * 0.58);
    ctx.lineTo(r * 0.38, headY - r * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = acc;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = acc;
    ctx.beginPath(); ctx.arc(0, headY - r * 0.45, r * 0.05, 0, TAU); ctx.fill();
  } else if (v === 'guard' || mech) {
    ctx.fillStyle = acc;
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, headY - r * 0.1);
    ctx.lineTo(-r * 0.24, headY - r * 0.4);
    ctx.lineTo(r * 0.24, headY - r * 0.4);
    ctx.lineTo(r * 0.4, headY - r * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  } else if (v === 'dancer') {
    ctx.strokeStyle = acc;
    ctx.lineWidth = 2;
    for (let i = 0; i < 2; i++) {
      const a = run.time * 2.5 + i * Math.PI;
      ctx.beginPath();
      ctx.arc(0, headY, r * (0.4 + i * 0.15), a, a + 1.1);
      ctx.stroke();
    }
  }

  // Weapons
  ctx.lineCap = 'round';
  if (archer) {
    ctx.strokeStyle = v === 'void_archer' ? '#d8b8ff' : acc;
    ctx.lineWidth = r * 0.08;
    ctx.beginPath();
    ctx.arc(r * 0.52, r * 0.06, r * 0.42, -1.25, 1.25);
    ctx.stroke();
    ctx.strokeStyle = hexA(acc, 0.55);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(r * 0.52, -r * 0.36);
    ctx.lineTo(r * 0.52, r * 0.48);
    ctx.stroke();
    ctx.strokeStyle = '#f0e8ff';
    ctx.lineWidth = r * 0.045;
    ctx.beginPath();
    ctx.moveTo(r * 0.52, r * 0.06);
    ctx.lineTo(r * 0.95, r * 0.06);
    ctx.stroke();
    ctx.fillStyle = acc;
    ctx.beginPath();
    ctx.moveTo(-r * 0.55, r * 0.1);
    ctx.lineTo(-r * 0.9, -r * 0.2);
    ctx.lineTo(-r * 0.5, -r * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d8f4ff';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.55 + i * r * 0.1, -r * 0.18);
      ctx.lineTo(-r * 0.5 + i * r * 0.1, -r * 0.48);
      ctx.lineTo(-r * 0.42 + i * r * 0.1, -r * 0.2);
      ctx.closePath();
      ctx.fill();
    }
  } else if (caster) {
    const ex = r * 0.85;
    const ey = -r * 0.1;
    ctx.strokeStyle = '#3a2412';
    ctx.lineWidth = r * 0.09;
    ctx.beginPath();
    ctx.moveTo(r * 0.58, r * 0.35);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.fillStyle = v === 'pyromancer' ? '#ffd166' : v === 'tide' ? '#7ffff0' : acc;
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(ex, ey, r * 0.16, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
  } else if (katana) {
    ctx.strokeStyle = '#eaf6ff';
    ctx.lineWidth = r * 0.08;
    ctx.beginPath();
    ctx.moveTo(r * 0.6, r * 0.3);
    ctx.lineTo(r * 1.35, -r * 0.35);
    ctx.stroke();
    ctx.strokeStyle = acc;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(r * 0.64, r * 0.28);
    ctx.lineTo(r * 1.36, -r * 0.36);
    ctx.stroke();
    if (v === 'skyblade') {
      ctx.strokeStyle = '#bfe8ff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.3, -r * 0.1); ctx.lineTo(-r * 0.95, -r * 0.55);
      ctx.stroke();
    }
  } else if (v === 'rogue') {
    ctx.strokeStyle = '#eaf6ff';
    ctx.lineWidth = r * 0.06;
    ctx.beginPath();
    ctx.moveTo(r * 0.6, r * 0.25); ctx.lineTo(r * 1.15, -r * 0.2);
    ctx.moveTo(-r * 0.6, r * 0.25); ctx.lineTo(-r * 1.15, -r * 0.2);
    ctx.stroke();
  } else if (v === 'bandit') {
    ctx.strokeStyle = '#eaf6ff';
    ctx.lineWidth = r * 0.06;
    ctx.beginPath();
    ctx.moveTo(r * 0.62, r * 0.28); ctx.lineTo(r * 1.18, r * 0.02);
    ctx.stroke();
  } else if (guard) {
    ctx.fillStyle = acc;
    ctx.beginPath();
    ctx.moveTo(-r * 0.8, -r * 0.1);
    ctx.lineTo(-r * 1.1, r * 0.55);
    ctx.lineTo(-r * 0.6, r * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#eaf6ff';
    ctx.lineWidth = r * 0.06;
    ctx.beginPath();
    ctx.moveTo(r * 0.75, r * 0.55); ctx.lineTo(r * 1.5, -r * 1.1);
    ctx.stroke();
  } else if (brute) {
    ctx.fillStyle = acc;
    ctx.beginPath(); ctx.arc(r * 0.75, r * 0.28, r * 0.18, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#3a2412';
    ctx.lineWidth = r * 0.09;
    ctx.beginPath();
    ctx.moveTo(r * 0.65, r * 0.3); ctx.lineTo(r * 1.3, -r * 0.4);
    ctx.stroke();
    ctx.fillStyle = acc;
    ctx.beginPath(); ctx.arc(r * 1.34, -r * 0.44, r * 0.2, 0, TAU); ctx.fill();
  } else if (v === 'dancer') {
    ctx.strokeStyle = acc;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 2; i++) {
      const a = run.time * 3 + i * Math.PI;
      ctx.beginPath();
      ctx.arc(0, 0, r * (0.9 + i * 0.2), a, a + 1.4);
      ctx.stroke();
    }
  }

  // Small chest sigil / sash to make the silhouette readable.
  ctx.fillStyle = hexA(acc, 0.8);
  ctx.beginPath();
  ctx.arc(0, r * 0.15, r * 0.07, 0, TAU);
  ctx.fill();
}

function drawBossShape(e, r, col, acc) {
  const style = e.def.style;
  const eyeColor = e.enraged ? '#ff5c6c' : '#ffe9a8';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (style === 'training') {
    // Broad-shouldered training master: legs, wrapped torso, headband and staff.
    ctx.fillStyle = acc;
    ctx.beginPath();
    ctx.ellipse(-r * 0.32, r * 0.86, r * 0.21, r * 0.34, -0.1, 0, TAU);
    ctx.ellipse(r * 0.32, r * 0.86, r * 0.21, r * 0.34, 0.1, 0, TAU);
    ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-r * 0.76, -r * 0.25);
    ctx.quadraticCurveTo(0, -r * 0.55, r * 0.76, -r * 0.25);
    ctx.lineTo(r * 0.52, r * 0.72);
    ctx.quadraticCurveTo(0, r * 0.92, -r * 0.52, r * 0.72);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = acc;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = acc;
    ctx.fillRect(-r * 0.5, r * 0.22, r, r * 0.15);
    ctx.beginPath();
    ctx.ellipse(-r * 0.8, -r * 0.02, r * 0.22, r * 0.44, -0.28, 0, TAU);
    ctx.ellipse(r * 0.8, -r * 0.02, r * 0.22, r * 0.44, 0.28, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-r * 0.88, r * 0.42, r * 0.17, 0, TAU);
    ctx.arc(r * 0.88, r * 0.42, r * 0.17, 0, TAU);
    ctx.fill();
    ctx.fillStyle = acc;
    ctx.beginPath(); ctx.arc(0, -r * 0.82, r * 0.4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1b1009';
    ctx.beginPath(); ctx.ellipse(0, -r * 0.72, r * 0.32, r * 0.24, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    ctx.arc(-r * 0.14, -r * 0.8, r * 0.055, 0, TAU);
    ctx.arc(r * 0.14, -r * 0.8, r * 0.055, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = r * 0.17;
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r * 0.98);
    ctx.lineTo(r * 0.4, -r * 0.98);
    ctx.stroke();
    ctx.strokeStyle = '#7a4a24';
    ctx.lineWidth = r * 0.11;
    ctx.beginPath();
    ctx.moveTo(r * 0.65, r * 0.3);
    ctx.lineTo(r * 1.35, -r * 1.05);
    ctx.stroke();
    ctx.strokeStyle = acc;
    ctx.lineWidth = r * 0.06;
    ctx.beginPath();
    ctx.moveTo(r * 1.18, -r * 0.75);
    ctx.lineTo(r * 1.4, -r * 1.1);
    ctx.stroke();
    return;
  }

  if (style === 'chief') {
    // Horned warlord with a cape and a heavy axe.
    ctx.fillStyle = 'rgba(35, 18, 10, 0.55)';
    ctx.beginPath();
    ctx.moveTo(-r * 0.55, -r * 0.18);
    ctx.quadraticCurveTo(-r * 1.25, r * 0.35, -r * 0.85, r * 1.15);
    ctx.lineTo(r * 0.85, r * 1.15);
    ctx.quadraticCurveTo(r * 1.25, r * 0.35, r * 0.55, -r * 0.18);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = acc;
    ctx.beginPath();
    ctx.ellipse(-r * 0.34, r * 0.85, r * 0.24, r * 0.36, -0.08, 0, TAU);
    ctx.ellipse(r * 0.34, r * 0.85, r * 0.24, r * 0.36, 0.08, 0, TAU);
    ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-r * 0.85, -r * 0.25);
    ctx.lineTo(-r * 0.6, -r * 0.5);
    ctx.lineTo(r * 0.6, -r * 0.5);
    ctx.lineTo(r * 0.85, -r * 0.25);
    ctx.lineTo(r * 0.55, r * 0.72);
    ctx.lineTo(-r * 0.55, r * 0.72);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = acc;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = acc;
    ctx.fillRect(-r * 0.55, r * 0.12, r * 1.1, r * 0.16);
    ctx.beginPath();
    ctx.ellipse(-r * 0.9, -r * 0.02, r * 0.24, r * 0.46, -0.3, 0, TAU);
    ctx.ellipse(r * 0.9, -r * 0.02, r * 0.24, r * 0.46, 0.3, 0, TAU);
    ctx.fill();
    ctx.fillStyle = acc;
    ctx.beginPath(); ctx.arc(0, -r * 0.82, r * 0.4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2a1008';
    ctx.beginPath(); ctx.ellipse(0, -r * 0.76, r * 0.31, r * 0.22, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    ctx.arc(-r * 0.13, -r * 0.83, r * 0.05, 0, TAU);
    ctx.arc(r * 0.13, -r * 0.83, r * 0.05, 0, TAU);
    ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-r * 0.35, -r * 1.12);
    ctx.quadraticCurveTo(-r * 0.75, -r * 1.55, -r * 0.95, -r * 1.12);
    ctx.quadraticCurveTo(-r * 0.62, -r * 1.18, -r * 0.35, -r * 1.12);
    ctx.moveTo(r * 0.35, -r * 1.12);
    ctx.quadraticCurveTo(r * 0.75, -r * 1.55, r * 0.95, -r * 1.12);
    ctx.quadraticCurveTo(r * 0.62, -r * 1.18, r * 0.35, -r * 1.12);
    ctx.fill();
    // Axe
    ctx.strokeStyle = '#3b2412';
    ctx.lineWidth = r * 0.12;
    ctx.beginPath();
    ctx.moveTo(r * 0.82, r * 0.35);
    ctx.lineTo(r * 1.55, -r * 0.85);
    ctx.stroke();
    ctx.fillStyle = acc;
    ctx.beginPath();
    ctx.moveTo(r * 1.5, -r * 0.82);
    ctx.lineTo(r * 1.75, -r * 0.25);
    ctx.lineTo(r * 1.3, -r * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#2a1008';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    return;
  }

  if (style === 'guardian') {
    // Stone guardian: blocky body, huge shoulders, glowing core.
    ctx.fillStyle = acc;
    ctx.fillRect(-r * 0.42, r * 0.62, r * 0.35, r * 0.6);
    ctx.fillRect(r * 0.07, r * 0.62, r * 0.35, r * 0.6);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-r * 0.58, -r * 0.55);
    ctx.lineTo(-r * 0.92, -r * 0.28);
    ctx.lineTo(-r * 0.68, r * 0.48);
    ctx.lineTo(0, r * 0.75);
    ctx.lineTo(r * 0.68, r * 0.48);
    ctx.lineTo(r * 0.92, -r * 0.28);
    ctx.lineTo(r * 0.58, -r * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = acc;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.fillStyle = acc;
    ctx.fillRect(-r * 0.78, -r * 0.72, r * 0.45, r * 0.32);
    ctx.fillRect(r * 0.33, -r * 0.72, r * 0.45, r * 0.32);
    ctx.beginPath();
    ctx.arc(-r * 0.9, r * 0.15, r * 0.25, 0, TAU);
    ctx.arc(r * 0.9, r * 0.15, r * 0.25, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1b2c38';
    ctx.fillRect(-r * 0.28, -r * 0.83, r * 0.56, r * 0.36);
    ctx.fillStyle = eyeColor;
    ctx.fillRect(-r * 0.18, -r * 0.76, r * 0.12, r * 0.08);
    ctx.fillRect(r * 0.06, -r * 0.76, r * 0.12, r * 0.08);
    ctx.fillStyle = e.enraged ? '#ff5c6c' : '#72f5c8';
    ctx.beginPath(); ctx.arc(0, r * 0.03, r * 0.17, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#eafcff';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(0, r * 0.03, r * 0.25, 0, TAU); ctx.stroke();
    return;
  }

  if (style === 'oni') {
    // Muscular horned oni with a spiked club.
    ctx.fillStyle = acc;
    ctx.beginPath();
    ctx.ellipse(-r * 0.35, r * 0.82, r * 0.24, r * 0.38, -0.08, 0, TAU);
    ctx.ellipse(r * 0.35, r * 0.82, r * 0.24, r * 0.38, 0.08, 0, TAU);
    ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-r * 0.82, -r * 0.3);
    ctx.quadraticCurveTo(-r * 0.7, r * 0.6, 0, r * 0.8);
    ctx.quadraticCurveTo(r * 0.7, r * 0.6, r * 0.82, -r * 0.3);
    ctx.quadraticCurveTo(0, -r * 0.6, -r * 0.82, -r * 0.3);
    ctx.fill();
    ctx.fillStyle = acc;
    ctx.beginPath();
    ctx.ellipse(-r * 0.88, r * 0.02, r * 0.3, r * 0.5, -0.35, 0, TAU);
    ctx.ellipse(r * 0.88, r * 0.02, r * 0.3, r * 0.5, 0.35, 0, TAU);
    ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(0, -r * 0.78, r * 0.44, 0, TAU); ctx.fill();
    ctx.fillStyle = acc;
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r * 1.02);
    ctx.lineTo(-r * 0.75, -r * 1.5);
    ctx.lineTo(-r * 0.16, -r * 1.16);
    ctx.moveTo(r * 0.4, -r * 1.02);
    ctx.lineTo(r * 0.75, -r * 1.5);
    ctx.lineTo(r * 0.16, -r * 1.16);
    ctx.fill();
    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    ctx.arc(-r * 0.16, -r * 0.82, r * 0.06, 0, TAU);
    ctx.arc(r * 0.16, -r * 0.82, r * 0.06, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#fff0d0';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-r * 0.22, -r * 0.58);
    ctx.lineTo(-r * 0.06, -r * 0.52);
    ctx.lineTo(0, -r * 0.62);
    ctx.lineTo(r * 0.06, -r * 0.52);
    ctx.lineTo(r * 0.22, -r * 0.58);
    ctx.stroke();
    ctx.strokeStyle = '#3a1a10';
    ctx.lineWidth = r * 0.14;
    ctx.beginPath(); ctx.moveTo(r * 0.78, r * 0.35); ctx.lineTo(r * 1.55, -r * 0.65); ctx.stroke();
    ctx.fillStyle = acc;
    ctx.beginPath(); ctx.arc(r * 1.55, -r * 0.7, r * 0.27, 0, TAU); ctx.fill();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      ctx.beginPath();
      ctx.moveTo(r * 1.55 + Math.cos(a) * r * 0.2, -r * 0.7 + Math.sin(a) * r * 0.2);
      ctx.lineTo(r * 1.55 + Math.cos(a) * r * 0.42, -r * 0.7 + Math.sin(a) * r * 0.42);
      ctx.strokeStyle = '#2a0f08';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    return;
  }

  if (style === 'shadow') {
    // Floating crowned wraith king with a tattered cloak and twin blades.
    ctx.fillStyle = 'rgba(8, 5, 18, 0.85)';
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.05);
    ctx.quadraticCurveTo(r * 0.95, -r * 0.4, r * 0.72, r * 0.9);
    ctx.quadraticCurveTo(r * 0.45, r * 0.55, r * 0.2, r * 1.15);
    ctx.quadraticCurveTo(0, r * 0.75, -r * 0.2, r * 1.15);
    ctx.quadraticCurveTo(-r * 0.45, r * 0.55, -r * 0.72, r * 0.9);
    ctx.quadraticCurveTo(-r * 0.95, -r * 0.4, 0, -r * 1.05);
    ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(0, -r * 0.55, r * 0.42, 0, TAU); ctx.fill();
    ctx.fillStyle = '#0b0614';
    ctx.beginPath(); ctx.ellipse(0, -r * 0.54, r * 0.32, r * 0.22, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    ctx.arc(-r * 0.13, -r * 0.58, r * 0.055, 0, TAU);
    ctx.arc(r * 0.13, -r * 0.58, r * 0.055, 0, TAU);
    ctx.fill();
    ctx.fillStyle = acc;
    ctx.beginPath();
    ctx.moveTo(-r * 0.42, -r * 0.9);
    ctx.lineTo(-r * 0.28, -r * 1.25);
    ctx.lineTo(-r * 0.08, -r * 0.92);
    ctx.lineTo(0, -r * 1.3);
    ctx.lineTo(r * 0.08, -r * 0.92);
    ctx.lineTo(r * 0.28, -r * 1.25);
    ctx.lineTo(r * 0.42, -r * 0.9);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = acc;
    ctx.lineWidth = r * 0.09;
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, -r * 0.1); ctx.lineTo(-r * 1.3, -r * 0.95);
    ctx.moveTo(r * 0.6, -r * 0.1); ctx.lineTo(r * 1.3, -r * 0.95);
    ctx.stroke();
    ctx.fillStyle = '#e6d4ff';
    ctx.beginPath();
    ctx.arc(-r * 0.3, r * 0.3, r * 0.05, 0, TAU);
    ctx.arc(0, r * 0.4, r * 0.05, 0, TAU);
    ctx.arc(r * 0.3, r * 0.3, r * 0.05, 0, TAU);
    ctx.fill();
    return;
  }

  if (style === 'tide') {
    // Robed tide empress with a coral crown, flowing dress, and trident.
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.7);
    ctx.quadraticCurveTo(r * 0.65, -r * 0.2, r * 0.9, r * 1.05);
    ctx.quadraticCurveTo(0, r * 1.35, -r * 0.9, r * 1.05);
    ctx.quadraticCurveTo(-r * 0.65, -r * 0.2, 0, -r * 0.7);
    ctx.fill();
    ctx.strokeStyle = acc;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = acc;
    ctx.beginPath(); ctx.arc(0, -r * 0.7, r * 0.38, 0, TAU); ctx.fill();
    ctx.fillStyle = '#06201e';
    ctx.beginPath(); ctx.ellipse(0, -r * 0.64, r * 0.28, r * 0.2, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    ctx.arc(-r * 0.12, -r * 0.7, r * 0.055, 0, TAU);
    ctx.arc(r * 0.12, -r * 0.7, r * 0.055, 0, TAU);
    ctx.fill();
    ctx.fillStyle = acc;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * r * 0.13, -r * 1.02);
      ctx.lineTo(i * r * 0.13 + r * 0.07, -r * 1.36);
      ctx.lineTo(i * r * 0.13 + r * 0.14, -r * 1.02);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = '#d8fff8';
    ctx.lineWidth = r * 0.09;
    ctx.beginPath();
    ctx.moveTo(r * 0.68, r * 0.4); ctx.lineTo(r * 1.45, -r * 1.0); ctx.stroke();
    ctx.lineWidth = r * 0.06;
    ctx.beginPath();
    ctx.moveTo(r * 1.45, -r * 1.0);
    ctx.lineTo(r * 1.65, -r * 1.22);
    ctx.moveTo(r * 1.45, -r * 1.0);
    ctx.lineTo(r * 1.25, -r * 1.22);
    ctx.stroke();
    ctx.fillStyle = '#7ffff0';
    ctx.beginPath(); ctx.arc(r * 1.45, -r * 1.02, r * 0.14, 0, TAU); ctx.fill();
    return;
  }

  if (style === 'storm') {
    // Armored storm emperor: winged helm, broad plates, and a lightning spear.
    ctx.fillStyle = acc;
    ctx.beginPath();
    ctx.ellipse(-r * 0.34, r * 0.86, r * 0.22, r * 0.36, -0.08, 0, TAU);
    ctx.ellipse(r * 0.34, r * 0.86, r * 0.22, r * 0.36, 0.08, 0, TAU);
    ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-r * 0.82, -r * 0.35);
    ctx.lineTo(-r * 0.6, -r * 0.6);
    ctx.lineTo(r * 0.6, -r * 0.6);
    ctx.lineTo(r * 0.82, -r * 0.35);
    ctx.lineTo(r * 0.6, r * 0.72);
    ctx.lineTo(-r * 0.6, r * 0.72);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d8e4ff';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = acc;
    ctx.beginPath();
    ctx.ellipse(-r * 0.92, -r * 0.1, r * 0.28, r * 0.42, -0.3, 0, TAU);
    ctx.ellipse(r * 0.92, -r * 0.1, r * 0.28, r * 0.42, 0.3, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#d8e4ff';
    ctx.beginPath();
    ctx.moveTo(-r * 0.48, -r * 0.9);
    ctx.lineTo(-r * 0.9, -r * 1.4);
    ctx.lineTo(-r * 0.2, -r * 1.1);
    ctx.moveTo(r * 0.48, -r * 0.9);
    ctx.lineTo(r * 0.9, -r * 1.4);
    ctx.lineTo(r * 0.2, -r * 1.1);
    ctx.fill();
    ctx.fillStyle = acc;
    ctx.beginPath(); ctx.arc(0, -r * 0.86, r * 0.38, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1a1d2e';
    ctx.beginPath(); ctx.ellipse(0, -r * 0.82, r * 0.28, r * 0.2, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    ctx.arc(-r * 0.12, -r * 0.88, r * 0.05, 0, TAU);
    ctx.arc(r * 0.12, -r * 0.88, r * 0.05, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#eaf4ff';
    ctx.lineWidth = r * 0.09;
    ctx.beginPath();
    ctx.moveTo(r * 0.75, r * 0.4); ctx.lineTo(r * 1.65, -r * 1.0); ctx.stroke();
    ctx.strokeStyle = '#8be9ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(r * 1.3, -r * 0.6); ctx.lineTo(r * 1.1, -r * 0.45); ctx.lineTo(r * 1.2, -r * 0.3); ctx.lineTo(r * 1.0, -r * 0.14);
    ctx.stroke();
    return;
  }

  // Fallback: old boss orb.
  ctx.fillStyle = acc;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(0, -3, r * 0.82, 0, TAU); ctx.fill();
  ctx.fillStyle = eyeColor;
  ctx.beginPath();
  ctx.arc(-r * 0.28, -r * 0.1, r * 0.1, 0, TAU);
  ctx.arc(r * 0.28, -r * 0.1, r * 0.1, 0, TAU);
  ctx.fill();
}

function drawEnemy(e) {
  const p = run.player;
  const ang = Math.atan2(p.y - e.y, p.x - e.x);
  const r = e.radius;
  const flash = e.hitFlash > 0;
  const col = flash ? '#ffffff' : e.def.color;
  const acc = flash ? '#ffffff' : e.def.accent;
  const spawnK = e.spawnT > 0 ? 1 - e.spawnT / 0.35 : 1;
  const bob = Math.sin(e.walkPhase) * 1.4;
  const baseAlpha = (0.35 + 0.65 * spawnK) * (e.deathAlpha == null ? 1 : e.deathAlpha);

  ctx.save();
  ctx.globalAlpha = baseAlpha;
  ctx.translate(e.x, e.y + bob);
  ctx.scale(0.82 + 0.18 * spawnK, 0.82 + 0.18 * spawnK);

  // shadow
  ctx.globalAlpha = 0.32 * (e.deathAlpha == null ? 1 : e.deathAlpha);
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.8, r * 0.95, r * 0.4, 0, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = baseAlpha;

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

  if (HUMANOID_ENEMY_SHAPES.has(e.def.shape)) {
    drawHumanoidEnemy(e, r, col, acc, ang);
  } else {
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
    case 'wolf': {
      ctx.fillStyle = acc;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 1.15, r * 0.7, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.ellipse(0, -2, r * 0.92, r * 0.52, 0, 0, TAU); ctx.fill();
      const hx = Math.cos(ang) * r * 0.8;
      const hy = Math.sin(ang) * r * 0.55;
      ctx.fillStyle = acc;
      ctx.beginPath(); ctx.arc(hx, hy - 2, r * 0.42, 0, TAU); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(hx, hy - 2, r * 0.32, 0, TAU); ctx.fill();
      ctx.fillStyle = acc;
      ctx.beginPath();
      ctx.moveTo(hx - r * 0.24, hy - r * 0.3); ctx.lineTo(hx - r * 0.45, hy - r * 0.75); ctx.lineTo(hx - r * 0.06, hy - r * 0.45);
      ctx.moveTo(hx + r * 0.24, hy - r * 0.3); ctx.lineTo(hx + r * 0.45, hy - r * 0.75); ctx.lineTo(hx + r * 0.06, hy - r * 0.45);
      ctx.fill();
      ctx.strokeStyle = acc;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-Math.cos(ang) * r * 0.9, -Math.sin(ang) * r * 0.6);
      ctx.lineTo(-Math.cos(ang) * r * 1.6, -Math.sin(ang) * r * 0.9);
      ctx.stroke();
      break;
    }
    case 'adept': {
      ctx.fillStyle = acc;
      ctx.beginPath();
      ctx.moveTo(-r, r);
      ctx.lineTo(0, -r * 1.2);
      ctx.lineTo(r, r);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(0, -r * 0.25, r * 0.48, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#a7ffe1';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.arc(0, -r * 0.2, r * (1.1 + i * 0.28), run.time * 2 + i * 2, run.time * 2 + i * 2 + 1.5);
        ctx.stroke();
      }
      break;
    }
    case 'ronin': {
      ctx.fillStyle = acc;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.72, r * 1.05, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.ellipse(0, -1, r * 0.52, r * 0.8, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#24160c';
      ctx.beginPath();
      ctx.moveTo(-r * 1.2, -r * 0.65);
      ctx.lineTo(0, -r * 1.1);
      ctx.lineTo(r * 1.2, -r * 0.65);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#e8d5b0';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(r * 0.45, -r * 0.1);
      ctx.lineTo(r * 1.65, -r * 0.8);
      ctx.stroke();
      break;
    }
    case 'pyromancer': {
      ctx.fillStyle = acc;
      ctx.beginPath();
      ctx.moveTo(-r, r);
      ctx.quadraticCurveTo(0, -r * 0.8, r, r);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(0, -r * 0.3, r * 0.42, 0, TAU); ctx.fill();
      const ox = Math.cos(run.time * 2 + e.phase) * r * 0.9;
      const oy = Math.sin(run.time * 2 + e.phase) * r * 0.5 - r * 0.4;
      ctx.fillStyle = '#ffd166';
      ctx.shadowColor = '#ff7a3c';
      ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(ox, oy, r * 0.22, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
      break;
    }
    case 'beast': {
      ctx.fillStyle = acc;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 1.1, r * 0.75, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.ellipse(0, -2, r * 0.82, r * 0.52, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#d8f4ff';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * r * 0.5, -r * 0.35);
        ctx.lineTo(i * r * 0.5 + r * 0.2, -r * 1.15);
        ctx.lineTo(i * r * 0.5 + r * 0.42, -r * 0.3);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      for (let i = -1; i <= 1; i += 2) {
        ctx.beginPath();
        ctx.moveTo(i * r * 0.55, r * 0.35);
        ctx.lineTo(i * r * 0.85, r * 0.85);
        ctx.stroke();
      }
      break;
    }
    case 'hound': {
      ctx.fillStyle = acc;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 1.2, r * 0.62, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.ellipse(0, -2, r * 0.95, r * 0.45, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, -r * 0.1); ctx.lineTo(-r * 0.2, r * 0.15); ctx.lineTo(r * 0.25, -r * 0.05); ctx.lineTo(r * 0.65, r * 0.2);
      ctx.stroke();
      ctx.fillStyle = '#ffd166';
      ctx.beginPath(); ctx.arc(Math.cos(ang) * r * 0.75, Math.sin(ang) * r * 0.45, r * 0.18, 0, TAU); ctx.fill();
      break;
    }
    case 'dancer': {
      ctx.fillStyle = acc;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.55, r * 1, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.ellipse(0, -2, r * 0.38, r * 0.78, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ffb347';
      ctx.lineWidth = 2.4;
      for (let i = 0; i < 2; i++) {
        const a = run.time * 3 + i * Math.PI;
        ctx.beginPath();
        ctx.arc(0, 0, r * (1.05 + i * 0.2), a, a + 1.2);
        ctx.stroke();
      }
      break;
    }
    case 'nightmare': {
      ctx.fillStyle = acc;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.85, 0, TAU); ctx.fill();
      ctx.fillStyle = '#120b20';
      ctx.beginPath(); ctx.arc(0, -2, r * 0.55, 0, TAU); ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU + Math.sin(run.time * 2 + e.phase) * 0.2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.4, Math.sin(a) * r * 0.4);
        ctx.lineTo(Math.cos(a) * r * 1.35, Math.sin(a) * r * 1.35);
        ctx.stroke();
      }
      ctx.fillStyle = '#e6d4ff';
      ctx.beginPath();
      ctx.arc(-r * 0.2, -r * 0.25, r * 0.09, 0, TAU);
      ctx.arc(r * 0.2, -r * 0.25, r * 0.09, 0, TAU);
      ctx.fill();
      break;
    }
    case 'drowned': {
      ctx.fillStyle = acc;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.85, r * 1.05, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(0, -r * 0.45, r * 0.6, 0, TAU); ctx.fill();
      ctx.fillStyle = '#06201e';
      ctx.fillRect(-r * 0.55, -r * 0.2, r * 1.1, r * 0.22);
      ctx.strokeStyle = '#a7fff0';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, r * 0.7); ctx.lineTo(-r * 0.8, r * 1.2);
      ctx.moveTo(0, r * 0.8); ctx.lineTo(r * 0.05, r * 1.35);
      ctx.moveTo(r * 0.6, r * 0.65); ctx.lineTo(r * 0.8, r * 1.15);
      ctx.stroke();
      break;
    }
    case 'tide': {
      ctx.fillStyle = acc;
      ctx.beginPath();
      ctx.moveTo(-r * 0.9, r);
      ctx.quadraticCurveTo(0, -r * 1.1, r * 0.9, r);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(0, -r * 0.35, r * 0.42, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#c8fff4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -r * 0.35, r * 0.7, run.time * 2, run.time * 2 + 1.7);
      ctx.stroke();
      ctx.fillStyle = '#d8fff8';
      ctx.beginPath();
      ctx.arc(r * 0.8, -r * 0.55 + Math.sin(run.time * 3) * 3, r * 0.18, 0, TAU);
      ctx.fill();
      break;
    }
    case 'guard': {
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
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(0, -r * 0.1, r * 0.55, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#fff0c8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.05, -2.4, -0.7);
      ctx.stroke();
      break;
    }
    case 'wraith': {
      ctx.fillStyle = acc;
      ctx.globalAlpha *= 0.8;
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.2);
      ctx.quadraticCurveTo(r, -r * 0.2, r * 0.7, r);
      ctx.quadraticCurveTo(r * 0.3, r * 0.55, 0, r * 1.2);
      ctx.quadraticCurveTo(-r * 0.3, r * 0.55, -r * 0.7, r);
      ctx.quadraticCurveTo(-r, -r * 0.2, 0, -r * 1.2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(0, -r * 0.35, r * 0.38, 0, TAU); ctx.fill();
      ctx.fillStyle = '#eaf6ff';
      ctx.beginPath();
      ctx.arc(-r * 0.14, -r * 0.4, r * 0.07, 0, TAU);
      ctx.arc(r * 0.14, -r * 0.4, r * 0.07, 0, TAU);
      ctx.fill();
      break;
    }
    case 'skyblade': {
      ctx.fillStyle = acc;
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.45);
      ctx.lineTo(r * 0.75, 0);
      ctx.lineTo(0, r * 1.2);
      ctx.lineTo(-r * 0.75, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(0, -r * 0.1, r * 0.42, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#eaf6ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(r * 0.45, -r * 0.5); ctx.lineTo(r * 1.45, -r * 1.1);
      ctx.moveTo(-r * 0.45, -r * 0.5); ctx.lineTo(-r * 1.45, -r * 1.1);
      ctx.stroke();
      break;
    }
    case 'monk': {
      ctx.fillStyle = acc;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, TAU); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(0, -r * 0.2, r * 0.55, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#d8e4ff';
      ctx.lineWidth = 2;
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.arc(0, -r * 0.2, r * (1.1 + i * 0.25), run.time * 2 + i * 2, run.time * 2 + i * 2 + 1.6);
        ctx.stroke();
      }
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(0, -r * 0.2, r * 0.12, 0, TAU);
      ctx.fill();
      break;
    }
    case 'serpent': {
      ctx.strokeStyle = acc;
      ctx.lineWidth = r * 0.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-r * 1.1, r * 0.4);
      ctx.quadraticCurveTo(0, -r * 1.1, r * 1.1, r * 0.2);
      ctx.stroke();
      ctx.strokeStyle = col;
      ctx.lineWidth = r * 0.45;
      ctx.beginPath();
      ctx.moveTo(-r * 1.1, r * 0.4);
      ctx.quadraticCurveTo(0, -r * 1.1, r * 1.1, r * 0.2);
      ctx.stroke();
      ctx.fillStyle = '#eaf6ff';
      ctx.beginPath();
      ctx.arc(r * 1.25, r * 0.15, r * 0.18, 0, TAU);
      ctx.fill();
      break;
    }
    case 'sentinel':
    case 'skysentinel': {
      ctx.fillStyle = acc;
      ctx.fillRect(-r * 0.85, -r * 0.95, r * 1.7, r * 1.9);
      ctx.fillStyle = col;
      ctx.fillRect(-r * 0.58, -r * 0.72, r * 1.16, r * 1.4);
      ctx.fillStyle = '#071018';
      ctx.fillRect(-r * 0.55, -r * 0.35, r * 1.1, r * 0.3);
      ctx.strokeStyle = '#eaf6ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, -r * 1.1); ctx.lineTo(0, -r * 1.5); ctx.lineTo(r * 0.8, -r * 1.1);
      ctx.stroke();
      break;
    }
    case 'boss': {
      drawBossShape(e, r, col, acc);
      break;
    }
    default: {
      ctx.fillStyle = acc;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(0, -3, r * 0.82, 0, TAU); ctx.fill();
      ctx.fillStyle = e.enraged ? '#ff3e52' : '#ffe08a';
      ctx.beginPath();
      ctx.arc(-r * 0.28, -r * 0.1, r * 0.1, 0, TAU);
      ctx.arc(r * 0.28, -r * 0.1, r * 0.1, 0, TAU);
      ctx.fill();
      break;
    }
  }
  }

  // Status auras
  if (e.slow > 0) {
    ctx.strokeStyle = 'rgba(159, 216, 255, 0.52)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r + 6, run.time * 1.6, run.time * 1.6 + 2.1);
    ctx.stroke();
  }
  if (e.burnT > 0) {
    for (let i = 0; i < 3; i++) {
      const a = run.time * 3 + i * 2.1;
      ctx.fillStyle = i % 2 ? '#ffb36b' : '#ff7a3d';
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.75, -r * 0.9 + Math.sin(a) * r * 0.3, 1.8, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // charge motion lines
  if (e.charging > 0 && e.chargeDir) {
    ctx.strokeStyle = `${col}88`;
    ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) {
      const ox = -e.chargeDir.y * i * 7;
      const oy = e.chargeDir.x * i * 7;
      ctx.beginPath();
      ctx.moveTo(-e.chargeDir.x * r + ox, -e.chargeDir.y * r + oy);
      ctx.lineTo(-e.chargeDir.x * r * 2.1 + ox, -e.chargeDir.y * r * 2.1 + oy);
      ctx.stroke();
    }
  }

  // Ronin guard
  if (e.guard > 0) {
    ctx.globalAlpha = 0.55 + 0.25 * Math.sin(run.time * 10);
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, r + 7, -1.2, 1.2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Elite crown and aura
  if (e.elite) {
    ctx.strokeStyle = 'rgba(255, 200, 87, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, r + 8, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = '#ffd166';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * r * 0.38 - r * 0.13, -r - 7);
      ctx.lineTo(i * r * 0.38, -r - 18);
      ctx.lineTo(i * r * 0.38 + r * 0.13, -r - 7);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Melee swing arc
  if (!e.boss && e.attackAnim > 0) {
    const k = 1 - e.attackAnim / 0.25;
    const a = e.attackDir != null ? e.attackDir : ang;
    ctx.globalAlpha = 0.7 * (1 - k);
    ctx.strokeStyle = '#ffe6b8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r + 9, a - 0.8 + k * 1.6, a - 0.2 + k * 1.6);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Boss style flourishes
  if (e.boss) {
    const style = e.def.style;
    if (style === 'guardian') {
      ctx.fillStyle = 'rgba(50, 65, 80, 0.7)';
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU + Math.PI / 4;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85, r * 0.22, r * 0.12, a, 0, TAU);
        ctx.fill();
      }
    } else if (style === 'oni' || e.enraged) {
      ctx.strokeStyle = 'rgba(255, 122, 58, 0.55)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const a = run.time * 2 + i * 2.1;
        ctx.beginPath();
        ctx.arc(0, 0, r * (1.15 + i * 0.12), a, a + 1.4);
        ctx.stroke();
      }
    } else if (style === 'shadow') {
      ctx.strokeStyle = 'rgba(192, 138, 255, 0.5)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + Math.sin(run.time + i) * 0.12;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9);
        ctx.lineTo(Math.cos(a) * r * 1.45, Math.sin(a) * r * 1.45);
        ctx.stroke();
      }
    } else if (style === 'chief') {
      ctx.fillStyle = 'rgba(60, 24, 12, 0.8)';
      ctx.beginPath();
      ctx.moveTo(-r * 0.9, -r * 0.5);
      ctx.lineTo(-r * 1.5, r * 0.2);
      ctx.lineTo(-r * 0.8, r * 0.5);
      ctx.moveTo(r * 0.9, -r * 0.5);
      ctx.lineTo(r * 1.5, r * 0.2);
      ctx.lineTo(r * 0.8, r * 0.5);
      ctx.fill();
    } else if (style === 'tide') {
      ctx.strokeStyle = 'rgba(127, 255, 224, 0.45)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const a = run.time * 1.2 + i * 2.1;
        ctx.beginPath();
        ctx.arc(0, 0, r * (1.3 + i * 0.18), a, a + 1.9);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(127, 255, 224, 0.16)';
      ctx.beginPath(); ctx.arc(0, 0, r * 1.2, 0, TAU); ctx.fill();
    } else if (style === 'storm') {
      ctx.strokeStyle = 'rgba(207, 217, 255, 0.55)';
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 4; i++) {
        const a = run.time * 1.8 + i * 1.6;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 1.1, Math.sin(a) * r * 1.1);
        ctx.lineTo(Math.cos(a + 0.3) * r * 1.7, Math.sin(a + 0.3) * r * 1.7);
        ctx.stroke();
      }
    } else if (style === 'training') {
      ctx.strokeStyle = 'rgba(255, 209, 102, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.2, run.time * 2, run.time * 2 + 2.4);
      ctx.stroke();
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

function drawZones() {
  for (const z of run.zones) {
    if (z.delay > 0) {
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.25 * Math.sin(run.time * 20);
      ctx.strokeStyle = z.color;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(z.x, z.y, z.r, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = z.color;
      ctx.beginPath();
      ctx.arc(z.x, z.y, z.r, 0, TAU);
      ctx.fill();
      ctx.restore();
      continue;
    }

    const k = clamp(z.life / z.maxLife, 0, 1);
    ctx.save();
    const g = ctx.createRadialGradient(z.x, z.y, 4, z.x, z.y, z.r);
    g.addColorStop(0, `${z.color}55`);
    g.addColorStop(0.55, `${z.color}22`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.65 * k;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(z.x, z.y, z.r, 0, TAU);
    ctx.fill();

    ctx.globalAlpha = 0.45 * k;
    ctx.strokeStyle = z.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(z.x, z.y, z.r * (0.88 + 0.06 * Math.sin(run.time * 7 + z.x)), 0, TAU);
    ctx.stroke();

    for (let i = 0; i < 4; i++) {
      const a = run.time * 1.6 + i * 1.7;
      const d = z.r * (0.25 + 0.55 * ((i * 37) % 100) / 100);
      ctx.globalAlpha = 0.5 * k;
      ctx.fillStyle = z.color;
      ctx.beginPath();
      ctx.arc(z.x + Math.cos(a) * d, z.y + Math.sin(a) * d * 0.7, 1.6, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawTelegraphs() {
  for (const e of run.enemies) {
    if (!e.boss || !e.telegraph || e.dead) continue;
    const tg = e.telegraph;
    const k = 1 - tg.t / tg.max;
    const danger = '#ff5c6c';

    ctx.save();
    ctx.strokeStyle = danger;
    ctx.fillStyle = 'rgba(255, 60, 80, 0.12)';

    if (tg.type === 'slam') {
      ctx.setLineDash([7, 7]);
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.arc(tg.x, tg.y, tg.radius, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(tg.x, tg.y, Math.max(4, tg.radius * k), 0, TAU);
      ctx.stroke();
    } else if (tg.type === 'fan') {
      ctx.setLineDash([6, 8]);
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5 + 0.4 * k;
      ctx.beginPath();
      ctx.arc(e.x, e.y, tg.radius + k * 20, 0, TAU);
      ctx.stroke();
    } else if (tg.type === 'charge') {
      const ang = Math.atan2(tg.ty - tg.y, tg.tx - tg.x);
      ctx.setLineDash([12, 9]);
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.4 + 0.4 * k;
      ctx.beginPath();
      ctx.moveTo(tg.x, tg.y);
      ctx.lineTo(tg.tx, tg.ty);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(tg.tx, tg.ty, 92, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = danger;
      ctx.beginPath();
      ctx.moveTo(tg.tx + Math.cos(ang) * 18, tg.ty + Math.sin(ang) * 18);
      ctx.lineTo(tg.tx + Math.cos(ang + 2.5) * 18, tg.ty + Math.sin(ang + 2.5) * 18);
      ctx.lineTo(tg.tx + Math.cos(ang - 2.5) * 18, tg.ty + Math.sin(ang - 2.5) * 18);
      ctx.closePath();
      ctx.fill();
    } else if (tg.type === 'spikes' || tg.type === 'meteors') {
      for (const z of tg.zones) {
        ctx.setLineDash([6, 7]);
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.65;
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.r, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(z.x, z.y, Math.max(4, z.r * k), 0, TAU);
        ctx.stroke();
        if (tg.type === 'meteors') {
          ctx.globalAlpha = 0.5 + 0.5 * k;
          ctx.fillStyle = '#ff9a5c';
          ctx.beginPath();
          ctx.arc(z.x, z.y, 5 + 6 * k, 0, TAU);
          ctx.fill();
          ctx.fillStyle = 'rgba(255, 60, 80, 0.12)';
        }
      }
    } else if (tg.type === 'ring') {
      ctx.globalAlpha = 0.35 + 0.35 * k;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.x, e.y, tg.radius, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 0.18 + 0.22 * k;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(e.x, e.y, tg.radius * k, 0, TAU);
      ctx.stroke();
    } else if (tg.type === 'blink') {
      ctx.globalAlpha = 0.5 + 0.4 * k;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 6]);
      ctx.beginPath();
      ctx.arc(tg.tx, tg.ty, tg.radius, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(tg.tx, tg.ty, tg.radius * (1 - k), 0, TAU);
      ctx.stroke();
    }

    ctx.restore();
  }
}

function drawProjectiles() {
  for (const pr of run.projectiles) {
    ctx.save();
    ctx.translate(pr.x, pr.y);

    if (pr.kind === 'bolt') {
      ctx.rotate(Math.atan2(pr.vy, pr.vx));
      const j = Math.sin(run.time * 80 + pr.seed) * 3;
      ctx.shadowColor = pr.color;
      ctx.shadowBlur = 18;
      ctx.strokeStyle = pr.color;
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(-8, j);
      ctx.lineTo(-2, -j);
      ctx.lineTo(4, j * 0.7);
      ctx.lineTo(12, 0);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-9, 0);
      ctx.lineTo(-4, -j * 0.5);
      ctx.lineTo(2, j * 0.4);
      ctx.lineTo(9, 0);
      ctx.stroke();
      ctx.fillStyle = '#eaffff';
      ctx.beginPath();
      ctx.arc(11, 0, 2.6, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = pr.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 12, -0.7, 0.7);
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
    } else if (pr.kind === 'thread') {
      ctx.rotate(Math.atan2(pr.vy, pr.vx));
      ctx.strokeStyle = pr.color;
      ctx.shadowColor = pr.color;
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-11, 0);
      ctx.lineTo(9, 0);
      ctx.stroke();
      ctx.fillStyle = '#f0e8ff';
      ctx.beginPath();
      ctx.arc(10, 0, 2.4, 0, TAU);
      ctx.fill();
    } else if (pr.kind === 'ember') {
      const g = ctx.createRadialGradient(0, 0, 1, 0, 0, pr.radius * 2.8);
      g.addColorStop(0, '#fff3c4');
      g.addColorStop(0.35, pr.color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, pr.radius * 2.8, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(0, 0, 2.4, 0, TAU);
      ctx.fill();
    } else if (pr.kind === 'arcane') {
      ctx.shadowColor = pr.color;
      ctx.shadowBlur = 14;
      const g = ctx.createRadialGradient(0, 0, 1, 0, 0, pr.radius * 2.6);
      g.addColorStop(0, '#f4eaff');
      g.addColorStop(0.4, pr.color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, pr.radius * 2.6, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = pr.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 9 + Math.sin(run.time * 12 + pr.seed) * 2, 0, TAU);
      ctx.stroke();
      ctx.shadowBlur = 0;
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
  const low = run.player.hp < run.player.maxHp * 0.4;
  for (const pu of run.pickups) {
    const bob = Math.sin(run.time * 4 + pu.phase) * 3;
    const pulse = 0.7 + Math.sin(run.time * 5 + pu.phase) * 0.2;
    ctx.save();
    ctx.translate(pu.x, pu.y + bob);

    // Beacon so health is readable across a busy arena.
    const beam = ctx.createLinearGradient(0, -92, 0, 16);
    beam.addColorStop(0, 'rgba(99, 230, 164, 0)');
    beam.addColorStop(0.6, low ? 'rgba(120, 255, 190, 0.2)' : 'rgba(99, 230, 164, 0.12)');
    beam.addColorStop(1, low ? 'rgba(160, 255, 210, 0.4)' : 'rgba(99, 230, 164, 0.2)');
    ctx.fillStyle = beam;
    ctx.fillRect(-4, -92, 8, 108);

    const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 22);
    g.addColorStop(0, low ? 'rgba(210, 255, 230, 1)' : 'rgba(180, 255, 215, 0.9)');
    g.addColorStop(0.45, low ? 'rgba(99, 230, 164, 0.7)' : 'rgba(94, 224, 160, 0.55)');
    g.addColorStop(1, 'rgba(94, 224, 160, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 22 * pulse + 4, 0, TAU); ctx.fill();

    ctx.strokeStyle = low ? 'rgba(190, 255, 220, 0.9)' : 'rgba(99, 230, 164, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, 14 + pulse * 4, 0, TAU); ctx.stroke();

    ctx.fillStyle = '#d8ffe8';
    ctx.fillRect(-2.5, -7, 5, 14);
    ctx.fillRect(-7, -2.5, 14, 5);
    ctx.fillStyle = low ? '#ffffff' : '#a7ffd0';
    ctx.font = '800 7px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HP', 0, 26);
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
    const k = clamp(s.life / s.max, 0, 1);
    const r = s.range;
    const color = s.color || '#39d7ff';
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.angle);
    ctx.lineCap = 'round';

    // Wide glow
    ctx.globalAlpha = k * 0.16;
    ctx.strokeStyle = color;
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.arc(0, 0, r, -1.08, 1.08);
    ctx.stroke();

    // Main crescent
    const g = ctx.createLinearGradient(0, -r, 0, r);
    g.addColorStop(0, `rgba(255, 255, 255, ${k})`);
    g.addColorStop(0.5, hexA(color, k * 0.9));
    g.addColorStop(1, hexA(color, k * 0.15));
    ctx.globalAlpha = 1;
    ctx.strokeStyle = g;
    ctx.lineWidth = 2 + 6 * k;
    ctx.beginPath();
    ctx.arc(0, 0, r, -1.02, 1.02);
    ctx.stroke();

    // Inner white core
    ctx.strokeStyle = `rgba(255, 255, 255, ${k * 0.85})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, r - 5, -0.88, 0.88);
    ctx.stroke();

    // Motion streaks
    for (let i = 0; i < 3; i++) {
      const a = -0.75 + i * 0.55;
      ctx.globalAlpha = k * (0.35 - i * 0.07);
      ctx.strokeStyle = hexA(color, 0.8);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (r - 18), Math.sin(a) * (r - 18));
      ctx.lineTo(Math.cos(a) * (r + 10), Math.sin(a) * (r + 10));
      ctx.stroke();
    }

    // Leading edge flash
    const lead = 1.02 * (s.side > 0 ? 1 : -1);
    ctx.globalAlpha = k * 0.9;
    ctx.fillStyle = '#eaffff';
    ctx.beginPath();
    ctx.arc(Math.cos(lead) * (r + 3), Math.sin(lead) * (r + 3), 2.6 + 4 * k, 0, TAU);
    ctx.fill();

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

function drawFx() {
  for (const f of run.fx) {
    const k = clamp(f.life / f.max, 0, 1);
    ctx.save();
    if (f.type === 'lightning' || f.type === 'strike') {
      ctx.globalAlpha = k;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.shadowColor = f.color;
      ctx.shadowBlur = 16;
      ctx.strokeStyle = f.color;
      ctx.lineWidth = f.width * 3;
      ctx.beginPath();
      drawPathPoints(f.pts);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#f4ffff';
      ctx.lineWidth = Math.max(1, f.width);
      ctx.beginPath();
      drawPathPoints(f.pts);
      ctx.stroke();
      if (f.branches) {
        for (const branch of f.branches) {
          ctx.strokeStyle = f.color;
          ctx.globalAlpha = k * 0.7;
          ctx.lineWidth = Math.max(1, f.width * 0.7);
          ctx.beginPath();
          drawPathPoints(branch);
          ctx.stroke();
        }
      }
      if (f.type === 'strike') {
        ctx.globalAlpha = k * 0.7;
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 28 + (1 - k) * 40, 0, TAU);
        ctx.stroke();
      }
    } else if (f.type === 'wave') {
      ctx.globalAlpha = k * 0.8;
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = k * 0.35;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * 0.72, 0, TAU);
      ctx.stroke();
    } else if (f.type === 'wind') {
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot + (1 - k) * 2.6);
      ctx.globalAlpha = k * 0.65;
      ctx.strokeStyle = f.color;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const r = f.radius * (0.45 + i * 0.22);
        ctx.lineWidth = 2.5 - i * 0.5;
        ctx.beginPath();
        ctx.arc(0, 0, r, -0.9, 0.55);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.82, 2.1, 3.1);
        ctx.stroke();
      }
    } else if (f.type === 'silk') {
      ctx.globalAlpha = k * 0.85;
      ctx.strokeStyle = f.color;
      ctx.shadowColor = f.color;
      ctx.shadowBlur = 12;
      ctx.lineCap = 'round';
      for (let i = 0; i < 2; i++) {
        const off = i === 0 ? 0 : 5;
        ctx.lineWidth = i === 0 ? 3.2 : 1.2;
        ctx.beginPath();
        ctx.moveTo(f.x1, f.y1);
        ctx.quadraticCurveTo((f.x1 + f.x2) / 2, (f.y1 + f.y2) / 2 - 16 - off, f.x2, f.y2);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    } else if (f.type === 'spikes') {
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot);
      ctx.globalAlpha = k;
      ctx.fillStyle = f.color;
      for (let i = 0; i < f.count; i++) {
        const a = (i / f.count) * TAU + 0.4;
        const d = f.r * (0.55 + (i % 3) * 0.18);
        ctx.save();
        ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(d, -4);
        ctx.lineTo(d + f.r * 0.9, 0);
        ctx.lineTo(d, 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    } else if (f.type === 'flame') {
      ctx.translate(f.x, f.y);
      ctx.globalAlpha = k * 0.9;
      const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, f.r);
      grad.addColorStop(0, '#ffe6a3');
      grad.addColorStop(0.35, f.color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, f.r, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, f.r * (0.7 + 0.2 * k), 0, TAU);
      ctx.stroke();
      for (let i = 0; i < 5; i++) {
        const a = run.time * 3 + i * 1.25;
        ctx.fillStyle = '#ffd166';
        ctx.globalAlpha = k * 0.8;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * f.r * 0.6, Math.sin(a) * f.r * 0.45 - 4 * k, 2.2, 0, TAU);
        ctx.fill();
      }
    } else if (f.type === 'web') {
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot);
      ctx.globalAlpha = k * 0.7;
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * f.r, Math.sin(a) * f.r);
        ctx.stroke();
      }
      for (let ring = 0.25; ring <= 1; ring += 0.25) {
        ctx.globalAlpha = k * 0.5;
        ctx.beginPath();
        ctx.arc(0, 0, f.r * ring, 0, TAU);
        ctx.stroke();
      }
    } else if (f.type === 'sigil') {
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot + (1 - k) * 2);
      ctx.globalAlpha = k * 0.85;
      ctx.strokeStyle = f.color;
      ctx.shadowColor = f.color;
      ctx.shadowBlur = 12;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, f.r, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, f.r * 0.7, 0, TAU);
      ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * f.r * 0.48, Math.sin(a) * f.r * 0.48);
        ctx.lineTo(Math.cos(a) * f.r * 0.92, Math.sin(a) * f.r * 0.92);
        ctx.stroke();
      }
      ctx.fillStyle = '#fff3c4';
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * f.r * 0.3, Math.sin(a) * f.r * 0.3, 1.6, 0, TAU);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    } else if (f.type === 'windslash') {
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot + (1 - k) * 1.2);
      ctx.globalAlpha = k * 0.85;
      ctx.strokeStyle = f.color;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        ctx.lineWidth = 3 - i * 0.7;
        ctx.beginPath();
        ctx.arc(0, 0, f.r * (0.55 + i * 0.2), -1.1, 1.15);
        ctx.stroke();
      }
    } else if (f.type === 'line') {
      const dx = f.x2 - f.x1;
      const dy = f.y2 - f.y1;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      ctx.globalAlpha = k * 0.8;
      ctx.strokeStyle = f.color;
      ctx.shadowColor = f.color;
      ctx.shadowBlur = 14;
      ctx.lineCap = 'round';
      ctx.lineWidth = f.width;
      ctx.beginPath();
      ctx.moveTo(f.x1, f.y1);
      ctx.lineTo(f.x2, f.y2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1, f.width * 0.22);
      ctx.beginPath();
      ctx.moveTo(f.x1, f.y1);
      ctx.lineTo(f.x2, f.y2);
      ctx.stroke();
      if (f.shape === 'arrow') {
        ctx.fillStyle = f.color;
        const a = Math.atan2(dy, dx);
        ctx.translate(f.x2, f.y2);
        ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-18, -9);
        ctx.lineTo(-12, 0);
        ctx.lineTo(-18, 9);
        ctx.closePath();
        ctx.fill();
      }
    } else if (f.type === 'dash') {
      const dx = f.x2 - f.x1;
      const dy = f.y2 - f.y1;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      ctx.globalAlpha = k * 0.55;
      ctx.strokeStyle = f.color;
      ctx.lineCap = 'round';
      for (let i = -2; i <= 2; i++) {
        const off = i * 7;
        ctx.lineWidth = i === 0 ? 5 : 2;
        ctx.beginPath();
        ctx.moveTo(f.x1 + nx * off, f.y1 + ny * off);
        ctx.lineTo(f.x2 + nx * off, f.y2 + ny * off);
        ctx.stroke();
      }
      ctx.globalAlpha = k;
      ctx.fillStyle = '#eaffff';
      for (let i = 0; i < 4; i++) {
        const t = (i + 1) / 5;
        ctx.beginPath();
        ctx.arc(f.x1 + dx * t, f.y1 + dy * t, 1.8, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

function drawPathPoints(points) {
  if (!points || !points.length) return;
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
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

function spawnFirework() {
  if (!run) return;
  const p = run.player;
  const colors = ['#ffd166', '#ff5c6c', '#43e0ff', '#b18cff', '#63e6a4', '#ffb347'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const x = clamp(p.x + rand(-view.w / WORLD_ZOOM * 0.42, view.w / WORLD_ZOOM * 0.42), 40, WORLD.w - 40);
  const y = clamp(p.y + rand(-view.h / WORLD_ZOOM * 0.38, view.h / WORLD_ZOOM * 0.18), 40, WORLD.h - 40);
  for (let i = 0; i < 28; i++) {
    const a = rand(0, TAU);
    const s = rand(60, 300);
    addParticle({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: rand(0.6, 1.35),
      max: 1.35,
      size: rand(1.6, 3.8),
      color: i % 5 === 0 ? '#ffffff' : color,
      type: 'firework',
    });
  }
  run.particles.push({ type: 'ring', x, y, life: 0.6, max: 0.6, size: 20, color });
  audio.firework();
}

function jitterPath(points, subdivisions = 6, jitter = 9) {
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    for (let s = 0; s < subdivisions; s++) {
      const t = s / subdivisions;
      const off = (Math.random() - 0.5) * jitter * 2;
      out.push({
        x: a.x + dx * t + nx * off,
        y: a.y + dy * t + ny * off,
      });
    }
  }
  const last = points[points.length - 1];
  if (last) out.push({ x: last.x, y: last.y });
  return out;
}

function fxLightning(points, color = '#8be9ff', width = 3, life = 0.3) {
  if (!run || !points || points.length < 2) return;
  const pts = jitterPath(points, 6, 10);
  const branches = [];
  for (let i = 1; i < pts.length - 2; i += 4) {
    if (Math.random() > 0.5) continue;
    const p = pts[i];
    const branch = [{ x: p.x, y: p.y }];
    let bx = p.x;
    let by = p.y;
    for (let s = 0; s < 3; s++) {
      bx += rand(-18, 18);
      by += rand(-18, 18);
      branch.push({ x: bx, y: by });
    }
    branches.push(branch);
  }
  run.fx.push({ type: 'lightning', pts, branches, color, width, life, max: life });
}

function fxStrike(x, y, color = '#8be9ff') {
  if (!run) return;
  const pts = jitterPath([
    { x: x + rand(-20, 20), y: y - 430 },
    { x, y },
  ], 9, 14);
  const branches = [];
  for (let i = 2; i < pts.length - 2; i += 5) {
    const p = pts[i];
    branches.push([
      { x: p.x, y: p.y },
      { x: p.x + rand(-35, 35), y: p.y + rand(-35, 35) },
      { x: p.x + rand(-55, 55), y: p.y + rand(-55, 55) },
    ]);
  }
  run.fx.push({ type: 'strike', pts, branches, x, y, color, width: 4, life: 0.38, max: 0.38 });
  fxShockwave(x, y, color, 74, 0.42);
}

function fxShockwave(x, y, color = '#8be9ff', maxR = 80, life = 0.5) {
  if (!run) return;
  run.fx.push({ type: 'wave', x, y, r: 8, maxR, color, life, max: life });
}

function fxWind(x, y, color = '#8be9ff', radius = 60) {
  if (!run) return;
  run.fx.push({
    type: 'wind', x, y, radius, color,
    rot: rand(0, TAU), life: 0.5, max: 0.5,
  });
}

function fxDash(x1, y1, x2, y2, color = '#39d7ff') {
  if (!run) return;
  run.fx.push({ type: 'dash', x1, y1, x2, y2, color, life: 0.32, max: 0.32 });
}

function fxSilkLine(x1, y1, x2, y2, color = '#c4b5fd', life = 0.25) {
  if (!run) return;
  run.fx.push({ type: 'silk', x1, y1, x2, y2, color, life, max: life });
}

function fxRockSpikes(x, y, r = 28, count = 4, color = '#ffb347') {
  if (!run) return;
  run.fx.push({ type: 'spikes', x, y, r, count, color, rot: rand(0, TAU), life: 0.38, max: 0.38 });
}

function fxFlameRing(x, y, r = 40, color = '#ff6b3d') {
  if (!run) return;
  run.fx.push({ type: 'flame', x, y, r, color, life: 0.45, max: 0.45 });
}

function fxWebBurst(x, y, r = 44, color = '#c4b5fd') {
  if (!run) return;
  run.fx.push({ type: 'web', x, y, r, color, rot: rand(0, TAU), life: 0.45, max: 0.45 });
}

function fxArcaneSigil(x, y, r = 44, color = '#8f7bff') {
  if (!run) return;
  run.fx.push({ type: 'sigil', x, y, r, color, rot: rand(0, TAU), life: 0.5, max: 0.5 });
}

function fxWindSlash(x, y, r = 48, color = '#63e6a4') {
  if (!run) return;
  run.fx.push({ type: 'windslash', x, y, r, color, rot: rand(0, TAU), life: 0.36, max: 0.36 });
}

function fxLine(x1, y1, x2, y2, color = '#8be9ff', width = 10, life = 0.3, shape = 'beam') {
  if (!run) return;
  run.fx.push({ type: 'line', x1, y1, x2, y2, color, width, shape, life, max: life });
}

function fxElementHit(element, x, y, color, r = 34) {
  if (!run) return;
  if (element === 'storm') {
    fxShockwave(x, y, color, r, 0.3);
    burst(x, y, color, 6, 150, 2);
  } else if (element === 'iron') {
    fxRockSpikes(x, y, Math.min(r, 34), 4, color);
    fxShockwave(x, y, color, r, 0.32);
  } else if (element === 'fire') {
    fxFlameRing(x, y, r, color);
    burst(x, y, '#ffd166', 7, 150, 2.4);
  } else if (element === 'silk') {
    fxWebBurst(x, y, r, color);
    fxShockwave(x, y, color, r, 0.3);
  } else if (element === 'wind') {
    fxWindSlash(x, y, r, color);
    burst(x, y, color, 5, 120, 2);
  } else if (element === 'arcane') {
    fxArcaneSigil(x, y, r, color);
    fxShockwave(x, y, color, r, 0.32);
  }
}

function fxProjectileImpact(kind, x, y, color) {
  if (kind === 'arrow') {
    fxWindSlash(x, y, 34, color);
    burst(x, y, color, 5, 130, 2);
  } else if (kind === 'ember') {
    fxFlameRing(x, y, 38, color);
    burst(x, y, '#ffd166', 7, 160, 2.4);
  } else if (kind === 'thread') {
    fxWebBurst(x, y, 34, color);
  } else if (kind === 'arcane') {
    fxArcaneSigil(x, y, 34, color);
  } else {
    fxShockwave(x, y, color, 30, 0.26);
    burst(x, y, color, 5, 140, 2);
  }
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
  else if (themeId === 'shrine') drawShrineBg(g, rnd, th);
  else if (themeId === 'sky') drawSkyBg(g, rnd, th);
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

function drawShrineBg(g, rnd, th) {
  // Still black water with pale ripples.
  for (let i = 0; i < 44; i++) {
    const x = rnd() * WORLD.w;
    const y = rnd() * WORLD.h;
    const rx = 50 + rnd() * 180;
    g.strokeStyle = `rgba(127, 255, 224, ${0.025 + rnd() * 0.045})`;
    g.lineWidth = 1 + rnd() * 1.4;
    g.beginPath();
    g.ellipse(x, y, rx, rx * (0.16 + rnd() * 0.08), 0, 0, TAU);
    g.stroke();
  }

  // Drowned stone arches.
  for (let i = 0; i < 9; i++) {
    const x = 60 + rnd() * (WORLD.w - 180);
    const y = 90 + rnd() * (WORLD.h - 220);
    const w = 80 + rnd() * 130;
    const h = 120 + rnd() * 170;
    g.strokeStyle = 'rgba(24, 52, 50, 0.8)';
    g.lineWidth = 14;
    g.beginPath();
    g.moveTo(x, y + h);
    g.lineTo(x, y + 35);
    g.quadraticCurveTo(x + w / 2, y - 26, x + w, y + 35);
    g.lineTo(x + w, y + h);
    g.stroke();
    g.strokeStyle = 'rgba(96, 146, 128, 0.16)';
    g.lineWidth = 2;
    g.stroke();
  }

  // Lantern glows.
  for (let i = 0; i < 18; i++) {
    const x = rnd() * WORLD.w;
    const y = rnd() * WORLD.h;
    const rg = g.createRadialGradient(x, y, 0, x, y, 34);
    rg.addColorStop(0, 'rgba(127, 255, 224, 0.18)');
    rg.addColorStop(1, 'rgba(127, 255, 224, 0)');
    g.fillStyle = rg;
    g.beginPath(); g.arc(x, y, 34, 0, TAU); g.fill();
    g.fillStyle = 'rgba(200, 255, 240, 0.6)';
    g.beginPath(); g.arc(x, y, 2.2, 0, TAU); g.fill();
  }

  // Scattered pale petals / offerings.
  for (let i = 0; i < 54; i++) {
    g.fillStyle = `rgba(180, 240, 220, ${0.05 + rnd() * 0.1})`;
    g.beginPath();
    g.ellipse(rnd() * WORLD.w, rnd() * WORLD.h, 2 + rnd() * 5, 1 + rnd() * 2, rnd() * TAU, 0, TAU);
    g.fill();
  }
}

function drawSkyBg(g, rnd, th) {
  // Wind streaks.
  for (let i = 0; i < 42; i++) {
    const x = rnd() * WORLD.w;
    const y = rnd() * WORLD.h;
    const len = 30 + rnd() * 120;
    g.strokeStyle = `rgba(207, 217, 255, ${0.025 + rnd() * 0.05})`;
    g.lineWidth = 1 + rnd() * 1.8;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + len * 0.5, y - 10 - rnd() * 16, x + len, y);
    g.stroke();
  }

  // Floating citadel platforms.
  for (let i = 0; i < 10; i++) {
    const x = 80 + rnd() * (WORLD.w - 160);
    const y = 90 + rnd() * (WORLD.h - 180);
    const w = 70 + rnd() * 130;
    const h = 26 + rnd() * 44;
    g.fillStyle = 'rgba(14, 24, 42, 0.7)';
    g.beginPath();
    g.moveTo(x - w / 2, y);
    g.lineTo(x + w / 2, y);
    g.lineTo(x + w * 0.28, y + h);
    g.lineTo(x - w * 0.24, y + h);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(180, 205, 255, 0.16)';
    g.lineWidth = 1.4;
    g.stroke();
  }

  // Cloud banks.
  for (let i = 0; i < 22; i++) {
    const x = rnd() * WORLD.w;
    const y = rnd() * WORLD.h;
    const r = 50 + rnd() * 130;
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, 'rgba(150, 180, 255, 0.07)');
    rg.addColorStop(1, 'rgba(150, 180, 255, 0)');
    g.fillStyle = rg;
    g.beginPath(); g.ellipse(x, y, r, r * 0.38, 0, 0, TAU); g.fill();
  }

  // Far lightning.
  for (let i = 0; i < 8; i++) {
    let x = rnd() * WORLD.w;
    let y = rnd() * WORLD.h;
    g.strokeStyle = 'rgba(190, 215, 255, 0.16)';
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(x, y);
    for (let s = 0; s < 4; s++) {
      x += (rnd() - 0.5) * 60;
      y += (rnd() - 0.5) * 70;
      g.lineTo(x, y);
    }
    g.stroke();
  }

  for (let i = 0; i < 50; i++) {
    g.fillStyle = `rgba(235, 242, 255, ${0.06 + rnd() * 0.1})`;
    g.beginPath();
    g.arc(rnd() * WORLD.w, rnd() * WORLD.h, 0.8 + rnd() * 1.6, 0, TAU);
    g.fill();
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
  hideWaveClear();
  hideBossVictory();
  $('low-hp').classList.add('hidden');
  $('level-banner').classList.add('hidden');
  $('toasts').innerHTML = '';
  $('intermission-overlay').classList.add('hidden');
  setHudVisible(false);
  showScreen('screen-result');
  selectedZone = run.zone.id;

  const victory = run.victory;
  $('result-eyebrow').textContent = victory ? 'CHAPTER CLEARED' : 'THE STORM ENDS';
  $('result-title').textContent = victory ? 'VICTORY' : 'DEFEAT';

  const rankEl = $('rank-stamp');
  rankEl.textContent = run.rank;
  rankEl.dataset.rank = run.rank;
  const starCount = run.rank === 'S' ? 4 : run.rank === 'A' ? 3 : run.rank === 'B' ? 2 : 1;
  $('result-stars').textContent = '★ '.repeat(starCount) + '☆ '.repeat(4 - starCount);

  setText('rs-zone', run.zone.name);
  setText('rs-kills', String(run.kills));
  setText('rs-coins', fmt(run.finalCoins));
  setText('rs-xp', fmt(run.finalXp));
  setText('rs-combo', String(run.maxCombo));
  const mm = Math.floor(run.time / 60);
  const ss = String(Math.floor(run.time % 60)).padStart(2, '0');
  setText('rs-time', `${mm}:${ss}`);
  $('result-reward').innerHTML = `<span>SPOILS</span><b>◈ ${fmt(run.finalCoins)} · ${fmt(run.finalXp)} XP</b>`;

  const idx = ZONES.findIndex((z) => z.id === run.zone.id);
  const nextZone = ZONES[idx + 1];
  let note;
  if (victory) {
    if (!nextZone) {
      note = 'All seven chapters are complete. The Broken Lands remember your name.';
    } else {
      note = `${nextZone.name} is open. The next chapter is ready.`;
    }
  } else {
    note = 'You keep everything you earned. Return to camp, sharpen your build, and take the chapter again.';
  }
  $('result-note').textContent = note;

  const nextBtn = $('btn-next-map');
  const nextOpen = victory && nextZone && isZoneUnlocked(nextZone);
  if (nextOpen) {
    nextBtn.classList.remove('hidden');
    nextBtn.dataset.zone = nextZone.id;
    nextBtn.textContent = `NEXT CHAPTER · ${nextZone.name.toUpperCase()}`;
  } else {
    nextBtn.classList.add('hidden');
    nextBtn.dataset.zone = '';
  }
  const again = $('btn-run-again');
  if (again) again.className = nextOpen ? 'ghost' : 'primary';

  saveNow();
}

/* ============================================================
   PAUSE / HELP
   ============================================================ */

function pauseGame() {
  if (scene !== 'run' || !run || run.over || paused) return;
  if (run.phase !== 'wave' && run.phase !== 'boss') return;
  paused = true;
  updateTouchUI();
  audio.stopMusic(false);
  audio.duckMusic(true);
  $('pause-overlay').classList.remove('hidden');
  audio.ui();
}

function hidePause() {
  $('pause-overlay').classList.add('hidden');
  paused = false;
}

function resumeGame() {
  hidePause();
  updateTouchUI();
  if (run && !run.over && scene === 'run') {
    audio.playMusic(run.boss ? 'boss' : run.zone.theme);
    audio.duckMusic(false);
  }
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
  toast('Run abandoned. Rewards kept.', '', iconSVG('dash', 16));
}

/* ============================================================
   INPUT SETUP
   ============================================================ */

function setupInput() {
  window.addEventListener('keydown', (e) => {
    audio.init();
    keys.add(e.code);

    if (e.code === 'Escape') {
      if (!$('intermission-overlay').classList.contains('hidden')) return;
      if (!$('help-overlay').classList.contains('hidden')) { closeHelp(); return; }
      if (!$('evolve-overlay').classList.contains('hidden')) { $('evolve-overlay').classList.add('hidden'); return; }
      if (scene === 'run') togglePause();
      return;
    }

    if (scene === 'select') {
      if (e.code === 'ArrowLeft') { e.preventDefault(); cycleHero(-1); return; }
      if (e.code === 'ArrowRight') { e.preventDefault(); cycleHero(1); return; }
      if (e.code === 'Enter' && document.activeElement === document.body) {
        $('btn-enter-camp')?.click();
        return;
      }
    }

    if (scene !== 'run' || paused || !run || run.over) return;

    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
    if (e.repeat) return;

    if (e.code === 'Space') {
      if (run && run.player?.dashSkill) castSkill(run.player.dashSkill.id);
    } else if (e.code === 'Digit1') {
      if (run && run.player?.loadout?.[0]) castSkill(run.player.loadout[0]);
    } else if (e.code === 'Digit2') {
      if (run && run.player?.loadout?.[1]) castSkill(run.player.loadout[1]);
    } else if (e.code === 'Digit3') {
      if (run && run.player?.loadout?.[2]) castSkill(run.player.loadout[2]);
    } else if (e.code === 'Digit4') {
      if (run && run.player?.loadout?.[3]) castSkill(run.player.loadout[3]);
    } else if (e.code === 'KeyR') {
      activateRage();
    } else if (e.code === 'KeyF') {
      const executionId = run?.player?.loadout?.find((sid) => skillById(sid)?.type === 'execution');
      if (executionId) castSkill(executionId);
    } else if (e.code === 'KeyM') {
      toggleSfx();
    }
  });

  window.addEventListener('keyup', (e) => {
    keys.delete(e.code);
  });

  window.addEventListener('blur', () => {
    keys.clear();
    resetJoystick();
  });

  const layer = $('touch-layer');
  const knob = $('stick-knob');
  const stick = $('joystick');
  const MAX_STICK = 54;

  function placeStick(x, y) {
    if (!stick) return;
    stick.style.left = `${x}px`;
    stick.style.top = `${y}px`;
    stick.classList.remove('hidden');
  }

  function moveStick(clientX, clientY) {
    let dx = clientX - joystick.originX;
    let dy = clientY - joystick.originY;
    const len = Math.hypot(dx, dy);
    const clamped = Math.min(len, MAX_STICK);
    if (len > 0.001) { dx /= len; dy /= len; } else { dx = 0; dy = 0; }
    joystick.x = dx * (clamped / MAX_STICK);
    joystick.y = dy * (clamped / MAX_STICK);
    if (knob) knob.style.transform = `translate(${dx * clamped}px, ${dy * clamped}px)`;
  }

  layer.addEventListener('pointerdown', (e) => {
    if (scene !== 'run' || paused || !run || run.over) return;
    if (run.phase !== 'wave' && run.phase !== 'boss') return;
    if (joystick.active) return;
    e.preventDefault();
    hideTouchHint();
    joystick.active = true;
    joystick.id = e.pointerId;
    joystick.originX = e.clientX;
    joystick.originY = e.clientY;
    joystick.x = 0;
    joystick.y = 0;
    placeStick(e.clientX, e.clientY);
    if (knob) knob.style.transform = '';
    try {
      layer.setPointerCapture(e.pointerId);
    } catch (err) {
      // Synthetic pointer events and older browsers cannot capture.
    }
  });

  layer.addEventListener('pointermove', (e) => {
    if (!joystick.active || e.pointerId !== joystick.id) return;
    e.preventDefault();
    moveStick(e.clientX, e.clientY);
  });

  const endStick = (e) => {
    if (!joystick.active || e.pointerId !== joystick.id) return;
    resetJoystick();
  };

  layer.addEventListener('pointerup', endStick);
  layer.addEventListener('pointercancel', endStick);
  layer.addEventListener('lostpointercapture', () => resetJoystick());

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
  if (btn) btn.textContent = `AUDIO: ${sfxOn ? 'ON' : 'OFF'}`;
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
    camera.x = camAxis(run.player.x, view.w / WORLD_ZOOM, WORLD.w);
    camera.y = camAxis(run.player.y, view.h / WORLD_ZOOM, WORLD.h);
  }
  updateTouchUI();
}

/* ============================================================
   UI SETUP
   ============================================================ */

function setupUI() {
  $('btn-select-help')?.addEventListener('click', openHelp);
  $('btn-help')?.addEventListener('click', openHelp);
  $('btn-help-close')?.addEventListener('click', closeHelp);

  $('hero-roster')?.addEventListener('click', (e) => {
    const card = e.target.closest('[data-hero]');
    if (!card) return;
    audio.init();
    switchHero(card.dataset.hero);
    saveSoon();
    audio.ui();
    renderHeroSelect();
  });

  $('btn-prev-hero')?.addEventListener('click', () => cycleHero(-1));
  $('btn-next-hero')?.addEventListener('click', () => cycleHero(1));

  $('btn-enter-camp')?.addEventListener('click', () => {
    audio.init();
    saveSoon();
    openDojo('map');
  });

  $('btn-change-hero')?.addEventListener('click', () => {
    audio.ui();
    openHeroSelect();
  });

  $('btn-change-hero-result')?.addEventListener('click', () => {
    audio.ui();
    openHeroSelect();
  });

  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      activeTab = tab.dataset.tab;
      audio.ui();
      renderDojo();
    });
  });

  document.querySelectorAll('.shop-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      shopTab = tab.dataset.shoptab;
      audio.ui();
      renderShop();
    });
  });

  $('map-nodes')?.addEventListener('click', (e) => {
    const node = e.target.closest('[data-zone]');
    if (!node) return;
    selectedZone = node.dataset.zone;
    audio.ui();
    renderMap();
  });

  $('map-detail')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-enter]');
    if (!btn) return;
    audio.ui();
    startRun(btn.dataset.enter);
  });

  $('loadout-slots')?.addEventListener('click', (e) => {
    const slot = e.target.closest('[data-slot]');
    if (!slot) return;
    selectedSlot = clamp(Number(slot.dataset.slot) || 0, 0, 3);
    audio.ui();
    renderSkills();
  });

  $('skills-grid')?.addEventListener('click', (e) => {
    const upgrade = e.target.closest('[data-upgrade]');
    if (upgrade) { upgradeSkill(upgrade.dataset.upgrade); return; }
    const equip = e.target.closest('[data-equip]');
    if (equip) { equipSkill(equip.dataset.equip); return; }
    const shop = e.target.closest('[data-open-shop]');
    if (shop) {
      shopTab = 'techniques';
      activeTab = 'shop';
      audio.ui();
      renderDojo();
    }
  });

  $('shop-list')?.addEventListener('click', (e) => {
    const skinBtn = e.target.closest('[data-buy-skin]');
    if (skinBtn) { buySkin(skinBtn.dataset.buySkin); return; }
    const equipSkinBtn = e.target.closest('[data-equip-skin]');
    if (equipSkinBtn) { equipSkin(equipSkinBtn.dataset.equipSkin); return; }
    const bladeBtn = e.target.closest('[data-buy-blade]');
    if (bladeBtn) { buyBlade(bladeBtn.dataset.buyBlade); return; }
    const equipBladeBtn = e.target.closest('[data-equip-blade]');
    if (equipBladeBtn) { equipBlade(equipBladeBtn.dataset.equipBlade); return; }
    const techBtn = e.target.closest('[data-buy-technique]');
    if (techBtn) { buyTechnique(techBtn.dataset.buyTechnique); return; }
    const focus = e.target.closest('[data-focus-skill]');
    if (focus) { focusSkill(focus.dataset.focusSkill); }
  });

  $('evolve-panel')?.addEventListener('click', (e) => {
    if (e.target.closest('[data-evolve-open]')) openEvolveOverlay();
  });

  $('evolve-choices')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-confirm-evolve]');
    if (!btn) return;
    chooseEvolution(btn.dataset.confirmEvolve);
  });

  $('btn-evolve-cancel')?.addEventListener('click', () => {
    $('evolve-overlay').classList.add('hidden');
    audio.ui();
  });

  $('btn-pause')?.addEventListener('click', pauseGame);
  $('btn-resume')?.addEventListener('click', resumeGame);
  $('btn-rage')?.addEventListener('click', activateRage);

  $('btn-restart')?.addEventListener('click', () => {
    if (!run) return;
    const zone = run.zone.id;
    hidePause();
    startRun(zone);
  });

  $('btn-quit')?.addEventListener('click', () => {
    hidePause();
    abandonRun();
  });

  $('btn-sfx')?.addEventListener('click', toggleSfx);

  $('inter-shop')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-buy-run]');
    if (!btn) return;
    buyAttribute(btn.dataset.buyRun, 'run');
  });

  $('inter-skills')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-upgrade-run]');
    if (!btn) return;
    upgradeSkill(btn.dataset.upgradeRun, 'run');
  });

  $('btn-next-wave')?.addEventListener('click', () => {
    audio.ui();
    nextWave();
  });

  $('btn-inter-heal')?.addEventListener('click', () => {
    healRun();
  });

  $('btn-next-map')?.addEventListener('click', () => {
    const btn = $('btn-next-map');
    if (btn.dataset.zone) startRun(btn.dataset.zone);
  });

  $('btn-run-again')?.addEventListener('click', () => {
    const zone = run ? run.zone.id : selectedZone;
    startRun(zone);
  });

  $('btn-to-dojo')?.addEventListener('click', () => {
    const zone = run ? run.zone.id : selectedZone;
    selectedZone = zone;
    run = null;
    openDojo('map');
  });

  $('help-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'help-overlay') closeHelp();
  });

  $('evolve-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'evolve-overlay') $('evolve-overlay').classList.add('hidden');
  });

  window.addEventListener('beforeunload', () => {
    if (booted && state) sdk.save(JSON.stringify(state));
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
        render();
      } else if (!paused) {
        updateRun(dt);
        render();
      }
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
  } else {
    state = normalize(defaultState());
  }
  booted = true;

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

  openHeroSelect();
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
  get audio() { return audio; },
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
    state.level = clamp(Math.floor(n), 1, MAX_LEVEL);
    if (state.level > old) state.skillPoints += state.level - old;
    ensureUnlockedSkills(state, false);
    saveSoon();
    if (scene === 'dojo') renderDojo();
  },
  start(zone) { startRun(zone || selectedZone); },
  finish(victory = true) { finishRun(victory); },
  clearWave() {
    if (!run) return;
    run.enemies.forEach((e) => { e.dead = true; });
    run.pendingSpawns.length = 0;
  },
  tick(seconds = 1) {
    if (!run) return;
    const steps = Math.min(1200, Math.floor(seconds * 60));
    for (let i = 0; i < steps; i++) {
      if (run.over) break;
      updateRun(1 / 60);
    }
  },
  chooseHero(id) { switchHero(id); openDojo('map'); },
  openDojo,
  openHeroSelect,
  activateRage,
  castRageArt,
  castSkill,
  showResult,
  reset() {
    state = defaultState();
    saveNow();
    location.reload();
  },
};

boot();
