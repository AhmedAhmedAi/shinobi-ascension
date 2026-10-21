/* ============================================================
   SHINOBI ASCENSION — game data
   All content is original. No third-party IP.
   ============================================================ */

export const SAVE_KEY = 'shinobi-ascension-save-v1';
export const SAVE_VERSION = 1;

export const WORLD = { w: 1800, h: 1300 };

export const XP_BASE = 80;
export const XP_GROWTH = 1.22;

export function xpForLevel(level) {
  return Math.round(XP_BASE * Math.pow(XP_GROWTH, level - 1));
}

export function attrCost(rank) {
  return Math.floor(30 * Math.pow(1.32, rank));
}

export const MAX_ATTR_RANK = 12;
export const MAX_SKILL_RANK = 5;
export const SKILL_UNLOCKS = [1, 2, 4, 6, 10];

/* ------------------------------------------------------------
   HEROES
   ------------------------------------------------------------ */

export const HEROES = [
  {
    id: 'kaito',
    name: 'Kaito',
    title: 'The Stormstep',
    role: 'Assassin',
    unlocked: true,
    color: '#39d7ff',
    blurb: 'A swift blade who turns momentum into lightning.',
    passive: {
      id: 'static-charge',
      name: 'Static Charge',
      icon: 'static',
      unlock: 8,
      desc: '+10% critical chance.',
    },
    evolutions: [
      {
        id: 'assassin',
        name: 'Thunder Assassin',
        icon: 'assassin',
        tag: 'Burst damage',
        desc: 'You stop moving like a storm and start striking like one. Every dash is a blade.',
        perks: ['+25% damage', '+10% critical chance', 'Storm Dash damages enemies'],
        buffs: { damageMult: 1.25, critBonus: 0.1, dashDamage: true },
      },
      {
        id: 'dancer',
        name: 'Wind Dancer',
        tag: 'Speed & mobility',
        icon: 'dancer',
        desc: 'You never stand still. Enemies swing at the place you were a heartbeat ago.',
        perks: ['+20% move speed', '−40% dash cooldown', '−15% skill energy cost'],
        buffs: { speedMult: 1.2, dashCdMult: 0.6, energyMult: 0.85 },
      },
    ],
  },
  {
    id: 'mira',
    name: 'Mira',
    title: 'The Iron Lotus',
    role: 'Guardian',
    unlocked: false,
    color: '#ffb347',
    blurb: 'A wall that walks. A mountain that hits back.',
    evolutions: [],
  },
  {
    id: 'ren',
    name: 'Ren',
    title: 'The Ashcaller',
    role: 'Ninjutsu',
    unlocked: false,
    color: '#ff7a5c',
    blurb: 'Every ember remembers the hand that made it.',
    evolutions: [],
  },
  {
    id: 'sora',
    name: 'Sora',
    title: 'The Threadweaver',
    role: 'Controller',
    unlocked: false,
    color: '#a78bfa',
    blurb: 'The battlefield is a loom. She pulls the strings.',
    evolutions: [],
  },
];

/* ------------------------------------------------------------
   SKILLS — Kaito
   ------------------------------------------------------------ */

export const SKILLS = [
  {
    id: 'dash',
    hero: 'kaito',
    name: 'Storm Dash',
    icon: 'dash',
    unlock: 1,
    cd: 2.2,
    energy: 0,
    type: 'dash',
    mult: 0,
    distance: 150,
    desc: 'Dash forward and become untouchable for a heartbeat. Rank: longer dash, shorter cooldown.',
    rankNote: '+20px range · −0.08s cooldown',
  },
  {
    id: 'spark',
    hero: 'kaito',
    name: 'Spark Bolt',
    icon: 'spark',
    unlock: 2,
    cd: 1.4,
    energy: 8,
    type: 'projectile',
    mult: 1.6,
    desc: 'Hurl a bolt of lightning at the nearest enemy.',
    rankNote: '+20% damage',
  },
  {
    id: 'chain',
    hero: 'kaito',
    name: 'Chain Lightning',
    icon: 'chain',
    unlock: 4,
    cd: 5,
    energy: 22,
    type: 'chain',
    mult: 1.2,
    targets: 4,
    range: 280,
    desc: 'Lightning leaps between up to 4 enemies. Each rank adds power and, at rank 3 and 5, a target.',
    rankNote: '+20% damage · +1 target at rank 3/5',
  },
  {
    id: 'storm',
    hero: 'kaito',
    name: 'Thunder Storm',
    icon: 'storm',
    unlock: 6,
    cd: 8,
    energy: 30,
    type: 'aoe',
    mult: 2.2,
    radius: 150,
    desc: 'A ring of thunder erupts around you, damaging and knocking back everything nearby.',
    rankNote: '+15% damage · +12% radius',
  },
  {
    id: 'ultimate',
    hero: 'kaito',
    name: 'Thunderfall',
    icon: 'ultimate',
    unlock: 10,
    cd: 18,
    energy: 55,
    type: 'aoe',
    mult: 4,
    radius: 240,
    stun: 1.5,
    desc: 'The sky answers. A massive strike stuns every enemy in a wide radius.',
    rankNote: '+10% damage',
  },
];

/* ------------------------------------------------------------
   ATTRIBUTES
   ------------------------------------------------------------ */

export const ATTRIBUTES = [
  {
    id: 'power',
    name: 'Power',
    icon: 'power',
    desc: 'Sharpen your strikes.',
    effect: (rank) => `+${rank * 3} damage`,
    next: (rank) => `+${(rank + 1) * 3} damage`,
  },
  {
    id: 'vitality',
    name: 'Vitality',
    icon: 'vitality',
    desc: 'Endure what would break others.',
    effect: (rank) => `+${rank * 14} max health`,
    next: (rank) => `+${(rank + 1) * 14} max health`,
  },
  {
    id: 'agility',
    name: 'Agility',
    icon: 'agility',
    desc: 'Move before the world can answer.',
    effect: (rank) => `+${rank * 7} speed`,
    next: (rank) => `+${(rank + 1) * 7} speed`,
  },
  {
    id: 'focus',
    name: 'Focus',
    icon: 'focus',
    desc: 'Hold more storm, strike more true.',
    effect: (rank) => `+${rank * 4} energy · +${(rank * 0.8).toFixed(1)}% crit`,
    next: (rank) => `+${(rank + 1) * 4} energy · +${((rank + 1) * 0.8).toFixed(1)}% crit`,
  },
];

/* ------------------------------------------------------------
   ENEMIES
   ------------------------------------------------------------ */

export const ENEMIES = {
  bandit: {
    name: 'Bandit', kind: 'melee', shape: 'bandit',
    hp: 30, dmg: 8, speed: 88, radius: 14, xp: 10, coins: 4,
    atkCd: 1.1, range: 36, windup: 0.3,
    color: '#d06a5a', accent: '#5a2a24',
  },
  archer: {
    name: 'Archer', kind: 'ranged', shape: 'archer',
    hp: 24, dmg: 6, speed: 70, radius: 13, xp: 12, coins: 5,
    atkCd: 1.9, range: 210, windup: 0.35, projSpeed: 280,
    color: '#9d7bf0', accent: '#3a2a66',
  },
  brute: {
    name: 'Brute', kind: 'melee', shape: 'brute',
    hp: 95, dmg: 16, speed: 58, radius: 20, xp: 25, coins: 12,
    atkCd: 1.7, range: 42, windup: 0.5,
    color: '#d69a4c', accent: '#5c3a12',
  },
  rogue: {
    name: 'Rogue', kind: 'melee', shape: 'rogue',
    hp: 42, dmg: 10, speed: 128, radius: 13, xp: 14, coins: 6,
    atkCd: 1.0, range: 34, windup: 0.25,
    color: '#ff7a9c', accent: '#5a2335',
  },
  mage: {
    name: 'Shard Mage', kind: 'ranged', shape: 'mage',
    hp: 34, dmg: 11, speed: 62, radius: 15, xp: 18, coins: 8,
    atkCd: 2.2, range: 230, windup: 0.5, projSpeed: 240, aoeRadius: 62,
    color: '#5ee0c8', accent: '#1c4f47',
  },
  crawler: {
    name: 'Crawler', kind: 'melee', shape: 'crawler',
    hp: 18, dmg: 6, speed: 152, radius: 11, xp: 7, coins: 3,
    atkCd: 0.9, range: 30, windup: 0.2,
    color: '#b4e05a', accent: '#3e4f14',
  },
  golem: {
    name: 'Golem', kind: 'melee', shape: 'golem',
    hp: 170, dmg: 20, speed: 46, radius: 24, xp: 40, coins: 20,
    atkCd: 1.9, range: 50, windup: 0.6,
    color: '#8ea2b8', accent: '#33404f',
  },
  imp: {
    name: 'Ember Imp', kind: 'ranged', shape: 'imp',
    hp: 32, dmg: 9, speed: 112, radius: 12, xp: 15, coins: 7,
    atkCd: 1.6, range: 190, windup: 0.3, projSpeed: 320,
    color: '#ff9a4c', accent: '#5c2a0c',
  },
  shadow: {
    name: 'Shadow Blade', kind: 'melee', shape: 'shadow',
    hp: 70, dmg: 14, speed: 120, radius: 14, xp: 24, coins: 11,
    atkCd: 0.9, range: 38, windup: 0.25,
    color: '#8f7bff', accent: '#2d2352',
  },
  void_archer: {
    name: 'Void Archer', kind: 'ranged', shape: 'void_archer',
    hp: 50, dmg: 12, speed: 80, radius: 14, xp: 26, coins: 12,
    atkCd: 1.7, range: 240, windup: 0.4, projSpeed: 300,
    color: '#c06bff', accent: '#3b1a52',
  },
  wolf: {
    name: 'Mist Wolf', kind: 'charger', shape: 'wolf',
    hp: 55, dmg: 11, speed: 118, radius: 16, xp: 18, coins: 8,
    atkCd: 3.2, range: 46, windup: 0.55, chargeSpeed: 520,
    ability: 'charge',
    color: '#8fd3b0', accent: '#245c48',
  },
  wind_adept: {
    name: 'Wind Adept', kind: 'ranged', shape: 'adept',
    hp: 45, dmg: 9, speed: 86, radius: 14, xp: 20, coins: 9,
    atkCd: 2.4, range: 250, windup: 0.45, projSpeed: 270,
    ability: 'volley', fanCount: 3,
    color: '#7fe3c0', accent: '#1f5a4a',
  },
  ronin: {
    name: 'Ronin', kind: 'melee', shape: 'ronin',
    hp: 95, dmg: 14, speed: 82, radius: 16, xp: 26, coins: 12,
    atkCd: 2.0, range: 44, windup: 0.4,
    ability: 'guard', guardCd: 4.5, guardTime: 1.3,
    color: '#c9a06a', accent: '#4b2e18',
  },
  pyromancer: {
    name: 'Pyromancer', kind: 'caster', shape: 'pyromancer',
    hp: 52, dmg: 10, speed: 64, radius: 15, xp: 24, coins: 11,
    atkCd: 3.6, range: 240, windup: 0.7,
    ability: 'zone', zoneRadius: 74,
    color: '#ff8a4c', accent: '#5a2410',
  },
  crystal_beast: {
    name: 'Crystal Beast', kind: 'ranged', shape: 'beast',
    hp: 82, dmg: 12, speed: 70, radius: 18, xp: 28, coins: 13,
    atkCd: 2.8, range: 240, windup: 0.5, projSpeed: 280,
    ability: 'volley', fanCount: 5,
    color: '#7fd8ff', accent: '#244a6b',
  },
  lava_hound: {
    name: 'Lava Hound', kind: 'charger', shape: 'hound',
    hp: 72, dmg: 15, speed: 128, radius: 17, xp: 26, coins: 12,
    atkCd: 2.8, range: 44, windup: 0.45, chargeSpeed: 560,
    ability: 'charge', trail: 'fire',
    color: '#ff7a4c', accent: '#5c1a0a',
  },
  flame_dancer: {
    name: 'Flame Dancer', kind: 'caster', shape: 'dancer',
    hp: 62, dmg: 13, speed: 96, radius: 15, xp: 30, coins: 14,
    atkCd: 3.2, range: 230, windup: 0.55,
    ability: 'blink', zoneRadius: 84,
    color: '#ffb347', accent: '#5c2a0c',
  },
  nightmare: {
    name: 'Nightmare', kind: 'caster', shape: 'nightmare',
    hp: 86, dmg: 14, speed: 70, radius: 17, xp: 34, coins: 16,
    atkCd: 3.2, range: 240, windup: 0.6, projSpeed: 260,
    ability: 'volley', fanCount: 4,
    color: '#a78bfa', accent: '#2d2352',
  },

  /* bosses */
  training_master: {
    name: 'Training Master', kind: 'boss', shape: 'boss', boss: true, style: 'training',
    hp: 380, dmg: 14, speed: 88, radius: 26, xp: 150, coins: 60,
    atkCd: 2.8, range: 62, windup: 0.55,
    slamRadius: 135, fanCount: 9, fanSpeed: 230, enrageAt: 0.4,
    attacks: ['slam', 'fan'],
    color: '#e0c26a', accent: '#4f3d15',
  },
  bandit_chief: {
    name: 'Bandit Chief', kind: 'boss', shape: 'boss', boss: true, style: 'chief',
    hp: 700, dmg: 18, speed: 82, radius: 28, xp: 250, coins: 110,
    atkCd: 2.6, range: 66, windup: 0.55,
    slamRadius: 145, fanCount: 10, fanSpeed: 240, enrageAt: 0.4,
    attacks: ['charge', 'fan', 'ring'], chargeSpeed: 620, ringRadius: 190,
    color: '#e08a4a', accent: '#5a2a12',
  },
  stone_guardian: {
    name: 'Stone Guardian', kind: 'boss', shape: 'boss', boss: true, style: 'guardian',
    hp: 1100, dmg: 22, speed: 56, radius: 34, xp: 380, coins: 190,
    atkCd: 2.9, range: 74, windup: 0.7,
    slamRadius: 165, fanCount: 12, fanSpeed: 220, enrageAt: 0.4,
    attacks: ['spikes', 'slam', 'fan'], spikeCount: 3, spikeRadius: 72,
    color: '#9fb4c8', accent: '#33404f',
  },
  fire_oni: {
    name: 'Fire Oni', kind: 'boss', shape: 'boss', boss: true, style: 'oni',
    hp: 1600, dmg: 28, speed: 72, radius: 36, xp: 550, coins: 300,
    atkCd: 2.5, range: 78, windup: 0.6,
    slamRadius: 175, fanCount: 12, fanSpeed: 260, enrageAt: 0.4,
    attacks: ['meteors', 'ring', 'fan'], meteorCount: 3, meteorRadius: 84, ringRadius: 230,
    color: '#ff7a3a', accent: '#5c1a0a',
  },
  shadow_king: {
    name: 'Shadow King', kind: 'boss', shape: 'boss', boss: true, style: 'shadow',
    hp: 2300, dmg: 34, speed: 86, radius: 38, xp: 800, coins: 450,
    atkCd: 2.3, range: 82, windup: 0.55,
    slamRadius: 190, fanCount: 14, fanSpeed: 280, enrageAt: 0.42,
    attacks: ['blink', 'fan', 'spikes'], blinkRadius: 130, spikeCount: 4, spikeRadius: 78,
    color: '#c08aff', accent: '#2d2352',
  },
};

/* ------------------------------------------------------------
   ZONES
   ------------------------------------------------------------ */

export const ZONES = [
  {
    id: 'forest',
    name: 'Bamboo Forest',
    subtitle: 'Where the first step is taken',
    icon: 'forest',
    unlock: 1,
    tier: 1,
    theme: 'forest',
    boss: 'training_master',
    desc: 'Mist between the stalks. Bandits have made a training ground of the old path.',
    tags: ['Bandits', 'Mist Wolves', 'Wind Adepts'],
    map: { x: 12, y: 66 },
    waves: [
      ['bandit', 'bandit', 'archer', 'bandit', 'archer'],
      ['bandit', 'wolf', 'archer', 'wolf', 'archer', 'bandit'],
      ['brute', 'wind_adept', 'wolf', 'archer', 'wolf', 'brute', 'archer'],
    ],
    clear: { coins: 120, xp: 100 },
  },
  {
    id: 'village',
    name: 'Abandoned Village',
    subtitle: 'The lights went out years ago',
    icon: 'village',
    unlock: 3,
    tier: 1.3,
    theme: 'village',
    boss: 'bandit_chief',
    desc: 'Empty houses, full pockets. The chief who burned this place still walks its streets.',
    tags: ['Rogues', 'Ronin', 'Pyromancers'],
    map: { x: 32, y: 36 },
    waves: [
      ['rogue', 'rogue', 'archer', 'rogue', 'bandit'],
      ['rogue', 'ronin', 'archer', 'ronin', 'archer', 'rogue'],
      ['ronin', 'pyromancer', 'brute', 'rogue', 'ronin', 'brute', 'rogue'],
    ],
    clear: { coins: 220, xp: 180 },
  },
  {
    id: 'caverns',
    name: 'Crystal Caverns',
    subtitle: 'Something hums beneath the stone',
    icon: 'caverns',
    unlock: 6,
    tier: 1.6,
    theme: 'caverns',
    boss: 'stone_guardian',
    desc: 'The crystals remember every step. The guardian remembers every theft.',
    tags: ['Crawlers', 'Crystal Beasts', 'Golems'],
    map: { x: 52, y: 64 },
    waves: [
      ['crawler', 'crawler', 'mage', 'crawler', 'crawler'],
      ['crawler', 'crystal_beast', 'mage', 'crawler', 'mage', 'crawler'],
      ['golem', 'crystal_beast', 'mage', 'crawler', 'crystal_beast', 'mage', 'golem', 'crawler'],
    ],
    clear: { coins: 360, xp: 300 },
  },
  {
    id: 'volcano',
    name: 'Ember Volcano',
    subtitle: 'The mountain is still angry',
    icon: 'volcano',
    unlock: 10,
    tier: 2,
    theme: 'volcano',
    boss: 'fire_oni',
    desc: 'Ash falls like snow. The oni at the summit has been waiting for a worthy blade.',
    tags: ['Imps', 'Lava Hounds', 'Flame Dancers'],
    map: { x: 72, y: 34 },
    waves: [
      ['imp', 'imp', 'brute', 'imp', 'brute'],
      ['imp', 'lava_hound', 'mage', 'lava_hound', 'imp'],
      ['lava_hound', 'flame_dancer', 'brute', 'imp', 'lava_hound', 'brute', 'imp'],
    ],
    clear: { coins: 520, xp: 450 },
  },
  {
    id: 'fortress',
    name: 'Shadow Fortress',
    subtitle: 'The last door before the legend',
    icon: 'fortress',
    unlock: 15,
    tier: 2.5,
    theme: 'fortress',
    boss: 'shadow_king',
    desc: 'A castle built from the names of everyone who failed. Yours is not carved yet.',
    tags: ['Shadow Blades', 'Nightmares', 'Void Archers'],
    map: { x: 90, y: 62 },
    waves: [
      ['shadow', 'void_archer', 'shadow', 'shadow', 'void_archer'],
      ['shadow', 'nightmare', 'void_archer', 'shadow', 'void_archer'],
      ['shadow', 'nightmare', 'golem', 'void_archer', 'nightmare', 'shadow', 'void_archer'],
    ],
    clear: { coins: 700, xp: 650 },
  },
];

export const THEMES = {
  forest: {
    ground1: '#0b1d18', ground2: '#06110e', accent: '#2f8f68',
    glow: '#6fe3a8', particle: '#9ce8b8', fog: 'rgba(18, 58, 46, 0.5)',
  },
  village: {
    ground1: '#1a1417', ground2: '#0b080a', accent: '#8a5a3a',
    glow: '#ffb36b', particle: '#ffcf9a', fog: 'rgba(58, 36, 24, 0.5)',
  },
  caverns: {
    ground1: '#111a2c', ground2: '#070c15', accent: '#4c5fd0',
    glow: '#7fe3ff', particle: '#9fd8ff', fog: 'rgba(27, 42, 74, 0.5)',
  },
  volcano: {
    ground1: '#23100d', ground2: '#100605', accent: '#b83a1a',
    glow: '#ff7a3a', particle: '#ffb07a', fog: 'rgba(74, 26, 16, 0.5)',
  },
  fortress: {
    ground1: '#160f22', ground2: '#090610', accent: '#5a2a8a',
    glow: '#c08aff', particle: '#d9b8ff', fog: 'rgba(42, 26, 68, 0.5)',
  },
};

export function heroById(id) {
  return HEROES.find((h) => h.id === id) || HEROES[0];
}

export function zoneById(id) {
  return ZONES.find((z) => z.id === id) || ZONES[0];
}

export function skillById(id) {
  return SKILLS.find((s) => s.id === id);
}
