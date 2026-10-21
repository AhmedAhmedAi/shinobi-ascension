/* ============================================================
   SHINOBI ASCENSION — game data (v0.3 "Storm of Legends")
   All content is original. No third-party IP.
   ============================================================ */

export const SAVE_KEY = 'shinobi-ascension-save-v3';
export const SAVE_VERSION = 3;

export const WORLD = { w: 2200, h: 1600 };

export const XP_BASE = 150;
export const XP_GROWTH = 1.3;

export function xpForLevel(level) {
  return Math.round(XP_BASE * Math.pow(XP_GROWTH, level - 1));
}

export function attrCost(rank) {
  return Math.floor(40 * Math.pow(1.38, rank));
}

export const MAX_ATTR_RANK = 12;
export const MAX_SKILL_RANK = 5;
export const MAX_LEVEL = 60;

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
    accent: '#0b7c9c',
    blurb: 'A swift blade who turns momentum into lightning. Hit fast, chain harder, vanish before the thunder lands.',
    base: { hp: 120, hpPer: 6, damage: 12, damagePer: 1.2, speed: 220, crit: 0.05, energy: 100, regen: 12, armor: 0.02 },
    auto: { type: 'melee', range: 126, cd: 0.55, mult: 1 },
    passive: {
      id: 'static-charge', name: 'Static Charge', icon: 'static', unlock: 8,
      desc: '+10% critical chance. The storm builds in every strike.',
    },
    evolutions: [
      {
        id: 'assassin', name: 'Thunder Assassin', icon: 'assassin', tag: 'Burst damage',
        desc: 'You stop moving like a storm and start striking like one. Every dash is a blade.',
        perks: ['+25% damage', '+10% critical chance', 'Storm Dash damages enemies'],
        buffs: { damageMult: 1.25, critBonus: 0.1, dashDamage: true },
      },
      {
        id: 'dancer', name: 'Wind Dancer', icon: 'dancer', tag: 'Speed & mobility',
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
    unlocked: true,
    color: '#ffb347',
    accent: '#7a4a12',
    blurb: 'A wall that walks. A mountain that hits back. Mira walks into the storm and makes it break first.',
    base: { hp: 150, hpPer: 7.5, damage: 10, damagePer: 0.9, speed: 198, crit: 0.03, energy: 90, regen: 10, armor: 0.06 },
    auto: { type: 'melee', range: 138, cd: 0.7, mult: 1.12 },
    passive: {
      id: 'iron-skin', name: 'Iron Skin', icon: 'armor', unlock: 8,
      desc: '+15% damage reduction. The body remembers every blow it survived.',
    },
    evolutions: [
      {
        id: 'fortress', name: 'Iron Fortress', icon: 'fortress', tag: 'Unbreakable',
        desc: 'You become the gate no army passes. The mountain itself fights beside you.',
        perks: ['+30% max health', '+15% damage reduction', 'Worldbreaker stuns longer'],
        buffs: { maxHpMult: 1.3, armorBonus: 0.15, shieldBonus: 2 },
      },
      {
        id: 'breaker', name: 'Mountain Breaker', icon: 'quake', tag: 'Heavy impact',
        desc: 'Every step cracks the earth. Every strike makes the arena kneel.',
        perks: ['+25% damage', 'AoE attacks knock enemies back', '+20% AoE radius'],
        buffs: { damageMult: 1.25, aoeKnockback: 220, rangeMult: 1.2 },
      },
    ],
  },
  {
    id: 'ren',
    name: 'Ren',
    title: 'The Ashcaller',
    role: 'Fire Arts',
    unlocked: true,
    color: '#ff7a5c',
    accent: '#6b1f12',
    blurb: 'Every ember remembers the hand that made it. Ren paints the battlefield in fire and calls it art.',
    base: { hp: 112, hpPer: 5, damage: 14, damagePer: 1.4, speed: 212, crit: 0.06, energy: 110, regen: 14, armor: 0.02 },
    auto: { type: 'projectile', range: 235, cd: 0.7, mult: 0.85, kind: 'ember', speed: 620, burn: true },
    passive: {
      id: 'ember-soul', name: 'Ember Soul', icon: 'fire', unlock: 8,
      desc: '+15% skill damage. Your fire eats what it touches.',
    },
    evolutions: [
      {
        id: 'pyre', name: 'Pyre Sage', icon: 'fire', tag: 'Burn them all',
        desc: 'The flame stops being a tool and becomes a language. The whole field answers.',
        perks: ['+30% skill damage', '+2s burn duration', 'Fire zones last longer'],
        buffs: { skillDamageMult: 1.3, burnBonus: 2, zoneBonus: 1.2 },
      },
      {
        id: 'phantom', name: 'Ash Phantom', icon: 'smoke', tag: 'Elusive',
        desc: 'You are the smoke after the fire. Enemies strike ash and call it a victory.',
        perks: ['+15% move speed', '−30% dash cooldown', 'Ash Step leaves a burning trail'],
        buffs: { speedMult: 1.15, dashCdMult: 0.7, dashFire: true },
      },
    ],
  },
  {
    id: 'sora',
    name: 'Sora',
    title: 'The Threadweaver',
    role: 'Controller',
    unlocked: true,
    color: '#a78bfa',
    accent: '#3b2a66',
    blurb: 'The battlefield is a loom. Sora pulls the strings, and every enemy dances to her design.',
    base: { hp: 118, hpPer: 5.5, damage: 11, damagePer: 1.1, speed: 228, crit: 0.05, energy: 120, regen: 16, armor: 0.02 },
    auto: { type: 'whip', range: 210, cd: 0.55, mult: 1, slow: 1.2 },
    passive: {
      id: 'thread-flow', name: 'Thread Flow', icon: 'silk', unlock: 8,
      desc: '+25% energy regeneration. The threads never stop moving.',
    },
    evolutions: [
      {
        id: 'warden', name: 'Silk Warden', icon: 'silk', tag: 'Control',
        desc: 'A web is a promise. Sora makes the whole arena keep it.',
        perks: ['+25% energy | +20% skill range', 'Web Field slows longer'],
        buffs: { energyRegenMult: 1.25, rangeMult: 1.2, slowBonus: 2 },
      },
      {
        id: 'puppet', name: 'Puppet Master', icon: 'puppet', tag: 'Dominion',
        desc: 'Every enemy is a marionette. You need only decide how they fall.',
        perks: ['+20% damage', '+1 chain target', '+15% skill damage'],
        buffs: { damageMult: 1.2, chainBonus: 1, skillDamageMult: 1.15 },
      },
    ],
  },
  {
    id: 'yuki',
    name: 'Yuki',
    title: 'The Gale Archer',
    role: 'Ranger',
    unlocked: true,
    color: '#63e6a4',
    accent: '#1c6b4a',
    blurb: 'A bow made from a storm-torn branch. Yuki turns distance into a weapon and never lets the hunt end.',
    base: { hp: 110, hpPer: 5.2, damage: 13, damagePer: 1.3, speed: 232, crit: 0.07, energy: 100, regen: 13, armor: 0.02 },
    auto: { type: 'projectile', range: 380, cd: 0.52, mult: 1, kind: 'arrow', speed: 920 },
    passive: {
      id: 'keen-eye', name: 'Keen Eye', icon: 'focus', unlock: 8,
      desc: '+15% projectile damage. Every arrow finds the seam in the armor.',
    },
    evolutions: [
      {
        id: 'stormfeather', name: 'Stormfeather', icon: 'gale', tag: 'Wind & arrows',
        desc: 'The wind carries every shot. Distance is no longer a limitation.',
        perks: ['+25% projectile damage', '+20% move speed', '+15% skill range'],
        buffs: { projectileMult: 1.25, speedMult: 1.2, rangeMult: 1.15 },
      },
      {
        id: 'deadeye', name: 'Deadeye', icon: 'focus', tag: 'Precision',
        desc: 'One breath, one shot, one answer. Nothing survives the second arrow.',
        perks: ['+15% crit chance', 'Arrows pierce +1 enemy', '+20% projectile damage'],
        buffs: { critBonus: 0.15, pierceBonus: 1, projectileMult: 1.2 },
      },
    ],
  },
  {
    id: 'aster',
    name: 'Aster',
    title: 'The Arcanist',
    role: 'Mage',
    unlocked: true,
    color: '#6ea8ff',
    accent: '#1c3a7a',
    blurb: 'A scholar of forbidden light. Aster bends the arena around a single spoken word.',
    base: { hp: 105, hpPer: 5, damage: 15, damagePer: 1.4, speed: 205, crit: 0.05, energy: 130, regen: 18, armor: 0.01 },
    auto: { type: 'projectile', range: 330, cd: 0.72, mult: 1.05, kind: 'arcane', speed: 700 },
    passive: {
      id: 'mana-font', name: 'Mana Font', icon: 'arcane', unlock: 8,
      desc: '+25% energy regeneration. The well inside never runs dry.',
    },
    evolutions: [
      {
        id: 'archmage', name: 'Archmage', icon: 'arcane', tag: 'Raw magic',
        desc: 'The spells stop being gestures. They become weather.',
        perks: ['+30% skill damage', '+15% skill range', 'Meteor burns longer'],
        buffs: { skillDamageMult: 1.3, rangeMult: 1.15, burnBonus: 1 },
      },
      {
        id: 'chronomancer', name: 'Chronomancer', icon: 'arcane', tag: 'Time & flow',
        desc: 'Time is a door. Aster simply refuses to knock.',
        perks: ['−25% cooldowns', '+25% energy | +15% move speed'],
        buffs: { cooldownMult: 0.75, energyRegenMult: 1.25, speedMult: 1.15 },
      },
    ],
  },
];

export function heroById(id) {
  return HEROES.find((h) => h.id === id) || HEROES[0];
}

/* ------------------------------------------------------------
   SKILLS — six per hero: one dash + five actives
   type: dash | projectile | chain | aoe | beam | zone | buff
   ------------------------------------------------------------ */

export const SKILLS = [
  /* ------------------------------ KAITO ------------------------------ */
  {
    id: 'k_dash', hero: 'kaito', name: 'Storm Dash', icon: 'dash', element: 'storm', color: '#39d7ff',
    slot: 'dash', unlock: 1, cd: 2.2, energy: 0, type: 'dash', distance: 150,
    desc: 'Dash forward and become untouchable for a heartbeat.',
    rankNote: '+20px range · −6% cooldown',
  },
  {
    id: 'k_spark', hero: 'kaito', name: 'Spark Bolt', icon: 'spark', element: 'storm', color: '#7fe8ff',
    slot: 'active', unlock: 1, cd: 1.5, energy: 7, type: 'projectile', mult: 1.65,
    desc: 'Hurl a bolt of lightning at the nearest enemy.',
    rankNote: '+20% damage',
  },
  {
    id: 'k_chain', hero: 'kaito', name: 'Chain Lightning', icon: 'chain', element: 'storm', color: '#9ef2ff',
    slot: 'active', unlock: 3, cd: 4.8, energy: 20, type: 'chain', mult: 1.15,
    targets: 3, range: 300, chainRange: 200,
    desc: 'Lightning leaps between nearby enemies, growing sharper with every rank.',
    rankNote: '+20% damage · +1 target at rank 3/5',
  },
  {
    id: 'k_gale', hero: 'kaito', name: 'Gale Slash', icon: 'gale', element: 'storm', color: '#bff7ff',
    slot: 'active', unlock: 5, cd: 4.2, energy: 15, type: 'beam', mult: 1.25,
    range: 320, width: 74, knockback: 90,
    desc: 'A blade of compressed wind cuts a line through the arena.',
    rankNote: '+20% damage · wider slash',
  },
  {
    id: 'k_storm', hero: 'kaito', name: 'Thunder Storm', icon: 'storm', element: 'storm', color: '#8be9ff',
    slot: 'active', unlock: 8, cd: 8, energy: 28, type: 'aoe', mult: 2.2,
    radius: 160, knockback: 170,
    desc: 'A ring of thunder erupts around you, damaging and knocking back everything nearby.',
    rankNote: '+20% damage · +12% radius',
  },
  {
    id: 'k_ult', hero: 'kaito', name: 'Thunderfall: Judgment', icon: 'execution', element: 'storm', color: '#39d7ff',
    slot: 'active', unlock: 6, cd: 30, energy: 60, type: 'execution', stun: 2.5,
    desc: 'A cinematic storm executes every lesser foe in the arena. Bosses are left stunned and badly wounded.',
    rankNote: '+15% boss damage · -6% cooldown',
  },

  /* ------------------------------ MIRA ------------------------------ */
  {
    id: 'm_dash', hero: 'mira', name: 'Iron Charge', icon: 'charge', element: 'iron', color: '#ffb347',
    slot: 'dash', unlock: 1, cd: 2.8, energy: 0, type: 'dash', distance: 140, shield: 1.5,
    desc: 'Charge forward behind an iron guard.',
    rankNote: '+20px range · +0.2s guard',
  },
  {
    id: 'm_fist', hero: 'mira', name: 'Stone Fist', icon: 'fist', element: 'iron', color: '#ffcf7a',
    slot: 'active', unlock: 1, cd: 2.2, energy: 6, type: 'aoe', mult: 1.4,
    radius: 110, knockback: 120,
    desc: 'A short, brutal slam that shoves enemies away.',
    rankNote: '+20% damage · +8% radius',
  },
  {
    id: 'm_quake', hero: 'mira', name: 'Quake Slam', icon: 'quake', element: 'iron', color: '#ffb347',
    slot: 'active', unlock: 3, cd: 5, energy: 18, type: 'aoe', mult: 1.9,
    radius: 175, knockback: 210, stun: 0.45,
    desc: 'Drive your fist into the ground and let the earth answer.',
    rankNote: '+20% damage · +12% radius',
  },
  {
    id: 'm_breaker', hero: 'mira', name: 'Mountain Breaker', icon: 'breaker', element: 'iron', color: '#ffd166',
    slot: 'active', unlock: 5, cd: 6, energy: 22, type: 'beam', mult: 2.1,
    range: 340, width: 92, knockback: 190,
    desc: 'A straight-line shockwave that breaks formations and bones.',
    rankNote: '+20% damage · wider shockwave',
  },
  {
    id: 'm_bulwark', hero: 'mira', name: 'Worldbreaker', icon: 'execution', element: 'iron', color: '#ffb347',
    slot: 'active', unlock: 6, cd: 30, energy: 60, type: 'execution', stun: 2.5,
    desc: 'Mira calls the mountain down. Lesser foes are shattered; bosses are stunned and badly wounded.',
    rankNote: '+15% boss damage · -6% cooldown',
  },
  {
    id: 'm_fortress', hero: 'mira', name: 'Iron Fortress', icon: 'fortress', element: 'iron', color: '#ffb347',
    slot: 'active', unlock: 10, cd: 18, energy: 50, type: 'aoe', mult: 3.0,
    radius: 270, stun: 1.2, shield: 5,
    desc: 'Become the mountain. Crush everything around you and raise your guard.',
    rankNote: '+20% damage · +8% radius',
  },

  /* ------------------------------- REN ------------------------------- */
  {
    id: 'r_dash', hero: 'ren', name: 'Ash Step', icon: 'smoke', element: 'fire', color: '#ff9a6b',
    slot: 'dash', unlock: 1, cd: 2.4, energy: 0, type: 'dash', distance: 150, dashFire: true,
    desc: 'Slip through the smoke, leaving a trail of embers.',
    rankNote: '+20px range · −6% cooldown',
  },
  {
    id: 'r_ember', hero: 'ren', name: 'Ember Wave', icon: 'ember', element: 'fire', color: '#ff8a4c',
    slot: 'active', unlock: 1, cd: 1.6, energy: 8, type: 'projectile', mult: 1.65,
    aoeRadius: 58, burn: true,
    desc: 'A crescent of fire that explodes on impact and clings to the target.',
    rankNote: '+20% damage · +8% blast radius',
  },
  {
    id: 'r_fan', hero: 'ren', name: 'Flame Fan', icon: 'fan', element: 'fire', color: '#ff9a4c',
    slot: 'active', unlock: 3, cd: 3.4, energy: 16, type: 'projectile', mult: 0.8,
    count: 5, spread: 0.2, burn: true,
    desc: 'Throw a fan of five embers. Every one wants to burn.',
    rankNote: '+20% damage · +1 ember at rank 3/5',
  },
  {
    id: 'r_smoke', hero: 'ren', name: 'Pyre Requiem', icon: 'execution', element: 'fire', color: '#ff6b3d',
    slot: 'active', unlock: 6, cd: 30, energy: 60, type: 'execution', stun: 2.5,
    desc: 'Ren turns the arena into a funeral pyre. Lesser foes are consumed; bosses burn and stagger.',
    rankNote: '+15% boss damage · -6% cooldown',
  },
  {
    id: 'r_firestorm', hero: 'ren', name: 'Firestorm', icon: 'firestorm', element: 'fire', color: '#ff6b3d',
    slot: 'active', unlock: 8, cd: 8, energy: 28, type: 'aoe', mult: 2.1,
    radius: 165, burn: true,
    desc: 'A storm of falling embers erupts around you.',
    rankNote: '+20% damage · +12% radius',
  },
  {
    id: 'r_pyre', hero: 'ren', name: 'Pyre Nova', icon: 'pyre', element: 'fire', color: '#ffd166',
    slot: 'active', unlock: 10, cd: 18, energy: 52, type: 'aoe', mult: 3.6,
    radius: 240, stun: 0.8, burn: true,
    desc: 'Turn your own life-force into a sun. Everything around you burns.',
    rankNote: '+20% damage · +8% radius',
  },

  /* ------------------------------- SORA ------------------------------ */
  {
    id: 's_dash', hero: 'sora', name: 'Silk Step', icon: 'silkstep', element: 'silk', color: '#c4b5fd',
    slot: 'dash', unlock: 1, cd: 2.0, energy: 0, type: 'dash', distance: 160,
    desc: 'Step along a thread only you can see.',
    rankNote: '+20px range · −6% cooldown',
  },
  {
    id: 's_thread', hero: 'sora', name: 'Thread Shot', icon: 'thread', element: 'silk', color: '#c4b5fd',
    slot: 'active', unlock: 1, cd: 1.4, energy: 6, type: 'projectile', mult: 1.45,
    slow: 2,
    desc: 'A needle of silk that slows the target.',
    rankNote: '+20% damage · +0.5s slow',
  },
  {
    id: 's_bind', hero: 'sora', name: 'Binding Thread', icon: 'bind', element: 'silk', color: '#a78bfa',
    slot: 'active', unlock: 3, cd: 4.5, energy: 18, type: 'chain', mult: 1.05,
    targets: 3, range: 320, chainRange: 220, slow: 3,
    desc: 'Silk leaps from enemy to enemy, binding them in place.',
    rankNote: '+20% damage · +1 target at rank 3/5',
  },
  {
    id: 's_pulse', hero: 'sora', name: 'Silk Requiem', icon: 'execution', element: 'silk', color: '#c4b5fd',
    slot: 'active', unlock: 6, cd: 30, energy: 60, type: 'execution', stun: 2.5,
    desc: 'Sora pulls every thread at once. Lesser foes are cut down; bosses are bound and badly wounded.',
    rankNote: '+15% boss damage · -6% cooldown',
  },
  {
    id: 's_web', hero: 'sora', name: 'Web Field', icon: 'web', element: 'silk', color: '#c4b5fd',
    slot: 'active', unlock: 8, cd: 8, energy: 24, type: 'zone', mult: 1.4,
    radius: 155, life: 4, slow: 4,
    desc: 'Weave a field of razored silk that damages and slows everything inside.',
    rankNote: '+20% damage · +12% radius',
  },
  {
    id: 's_puppet', hero: 'sora', name: 'Puppet Storm', icon: 'puppet', element: 'silk', color: '#c4b5fd',
    slot: 'active', unlock: 10, cd: 18, energy: 48, type: 'aoe', mult: 3.2,
    radius: 250, stun: 1.0, slow: 3,
    desc: 'Cut every string at once. The arena dances to your command.',
    rankNote: '+20% damage · +8% radius',
  },

  /* ------------------------------ YUKI ------------------------------ */
  {
    id: 'y_dash', hero: 'yuki', name: 'Wind Step', icon: 'dash', element: 'wind', color: '#63e6a4',
    slot: 'dash', unlock: 1, cd: 2.0, energy: 0, type: 'dash', distance: 170,
    desc: 'Slide through the hunt on a current only you can feel.',
    rankNote: '+20px range · −6% cooldown',
  },
  {
    id: 'y_pierce', hero: 'yuki', name: 'Piercing Arrow', icon: 'arrow', element: 'wind', color: '#a7ffd0',
    slot: 'active', unlock: 1, cd: 1.7, energy: 8, type: 'projectile', mult: 1.7,
    pierce: 2, projSpeed: 900,
    desc: 'A long arrow that punches through the first target and keeps going.',
    rankNote: '+20% damage · +1 pierce at rank 3/5',
  },
  {
    id: 'y_rain', hero: 'yuki', name: 'Rain of Arrows', icon: 'rain', element: 'wind', color: '#63e6a4',
    slot: 'active', unlock: 3, cd: 5, energy: 20, type: 'zone', mult: 1.55,
    radius: 150, life: 3.4,
    desc: 'Call a storm of falling arrows onto the nearest pack.',
    rankNote: '+20% damage · +12% radius',
  },
  {
    id: 'y_volley', hero: 'yuki', name: "Hunter's Volley", icon: 'volley', element: 'wind', color: '#b8ffd8',
    slot: 'active', unlock: 5, cd: 3.2, energy: 16, type: 'projectile', mult: 0.9,
    count: 3, spread: 0.17, projSpeed: 850,
    desc: 'Loose a fan of three arrows. At higher ranks, the fan grows.',
    rankNote: '+20% damage · +1 arrow at rank 3/5',
  },
  {
    id: 'y_trap', hero: 'yuki', name: 'Gale Trap', icon: 'trap', element: 'wind', color: '#5ee0a0',
    slot: 'active', unlock: 8, cd: 7, energy: 22, type: 'zone', mult: 0.9,
    radius: 125, life: 4.5, slow: 4,
    desc: 'A field of cutting wind that pins everything inside.',
    rankNote: '+20% damage · +0.5s slow',
  },
  {
    id: 'y_skyfall', hero: 'yuki', name: 'Skyfall: Final Hunt', icon: 'execution', element: 'wind', color: '#63e6a4',
    slot: 'active', unlock: 6, cd: 30, energy: 60, type: 'execution', stun: 2.5,
    desc: 'Yuki empties the sky. Arrows find every lesser foe; bosses are pinned and badly wounded.',
    rankNote: '+15% boss damage · -6% cooldown',
  },

  /* ------------------------------ ASTER ----------------------------- */
  {
    id: 'a_dash', hero: 'aster', name: 'Blink', icon: 'blink', element: 'arcane', color: '#9fc4ff',
    slot: 'dash', unlock: 1, cd: 2.4, energy: 0, type: 'dash', distance: 180,
    desc: 'Step out of the world and back in somewhere safer.',
    rankNote: '+20px range · −6% cooldown',
  },
  {
    id: 'a_bolt', hero: 'aster', name: 'Arcane Bolt', icon: 'arcane', element: 'arcane', color: '#b8dcff',
    slot: 'active', unlock: 1, cd: 1.5, energy: 8, type: 'projectile', mult: 1.8,
    projSpeed: 740,
    desc: 'A lance of raw light that seeks the nearest life.',
    rankNote: '+20% damage',
  },
  {
    id: 'a_frost', hero: 'aster', name: 'Frost Nova', icon: 'frost', element: 'arcane', color: '#7fd8ff',
    slot: 'active', unlock: 3, cd: 4.8, energy: 18, type: 'aoe', mult: 1.4,
    radius: 160, slow: 2.6,
    desc: 'A ring of frost erupts around you, slowing everything it touches.',
    rankNote: '+20% damage · +12% radius',
  },
  {
    id: 'a_meteor', hero: 'aster', name: 'Meteor', icon: 'meteor', element: 'arcane', color: '#ff9a5c',
    slot: 'active', unlock: 5, cd: 6, energy: 25, type: 'zone', mult: 2.6,
    radius: 130, life: 1.4,
    desc: 'Call a burning star down on the nearest enemy.',
    rankNote: '+20% damage · +10% radius',
  },
  {
    id: 'a_barrier', hero: 'aster', name: 'Starfall Requiem', icon: 'execution', element: 'arcane', color: '#6ea8ff',
    slot: 'active', unlock: 6, cd: 30, energy: 60, type: 'execution', stun: 2.5,
    desc: 'Aster opens the sky. Lesser foes are erased; bosses are crushed under a falling star.',
    rankNote: '+15% boss damage · -6% cooldown',
  },
  {
    id: 'a_singularity', hero: 'aster', name: 'Singularity', icon: 'singularity', element: 'arcane', color: '#6ea8ff',
    slot: 'active', unlock: 10, cd: 18, energy: 52, type: 'aoe', mult: 3.4,
    radius: 260, stun: 1.6, slow: 3,
    desc: 'A point of nothing opens in the arena. Everything near it forgets how to move.',
    rankNote: '+20% damage · +8% radius',
  },
];

export function skillById(id) {
  return SKILLS.find((s) => s.id === id);
}

export const SKILLS_BY_HERO = Object.fromEntries(
  HEROES.map((h) => [h.id, SKILLS.filter((s) => s.hero === h.id)]),
);

export function skillPrice(sk) {
  return 120 * Math.max(1, sk.unlock);
}

export function defaultLoadout(heroId) {
  const active = SKILLS_BY_HERO[heroId].filter((s) => s.slot === 'active');
  const execution = active.find((s) => s.type === 'execution');
  return ['', '', '', execution?.id || active[0]?.id || ''];
}

/* ------------------------------------------------------------
   RAGE ARTS
   ------------------------------------------------------------ */

export const RAGE_ARTS = [
  { hero: 'kaito', name: 'Thunder God’s Descent', icon: 'ultimate', color: '#8be9ff', desc: 'A pillar of lightning stuns the arena.' },
  { hero: 'mira', name: 'Worldbreaker', icon: 'execution', color: '#ffd166', desc: 'Crack the earth, heal, and raise an iron shield.' },
  { hero: 'ren', name: 'Inferno Bloom', icon: 'fire', color: '#ff6b3d', desc: 'The whole arena becomes a garden of fire.' },
  { hero: 'sora', name: 'Marionette Requiem', icon: 'puppet', color: '#c4b5fd', desc: 'Every thread pulls at once, binding every enemy.' },
  { hero: 'yuki', name: 'Tempest Volley', icon: 'skyfall', color: '#63e6a4', desc: 'The sky itself becomes a quiver.' },
  { hero: 'aster', name: 'Starfall Requiem', icon: 'execution', color: '#6ea8ff', desc: 'A field of collapsing stars and frozen time.' },
];

export function rageArtFor(heroId) {
  return RAGE_ARTS.find((r) => r.hero === heroId) || RAGE_ARTS[0];
}

/* ------------------------------------------------------------
   ATTRIBUTES — five cards
   ------------------------------------------------------------ */

export const ATTRIBUTES = [
  {
    id: 'power', name: 'Power', icon: 'power', color: '#ff7a5c',
    desc: 'Sharpen every strike.',
    effect: (rank) => `+${rank * 2} damage`,
    next: (rank) => `+${(rank + 1) * 2} damage`,
    short: 'DMG',
  },
  {
    id: 'vitality', name: 'Vitality', icon: 'vitality', color: '#ff5c6c',
    desc: 'Endure what would break others.',
    effect: (rank) => `+${rank * 8} max health`,
    next: (rank) => `+${(rank + 1) * 8} max health`,
    short: 'HP',
  },
  {
    id: 'agility', name: 'Agility', icon: 'agility', color: '#5ee0a0',
    desc: 'Move before the world answers.',
    effect: (rank) => `+${rank * 4} speed`,
    next: (rank) => `+${(rank + 1) * 4} speed`,
    short: 'SPD',
  },
  {
    id: 'focus', name: 'Focus', icon: 'focus', color: '#a78bfa',
    desc: 'Hold more storm, strike more true.',
    effect: (rank) => `+${rank * 2} energy | +${(rank * 0.5).toFixed(1)}% crit`,
    next: (rank) => `+${(rank + 1) * 2} energy | +${((rank + 1) * 0.5).toFixed(1)}% crit`,
    short: 'FOC',
  },
  {
    id: 'armor', name: 'Armor', icon: 'armor', color: '#ffc857',
    desc: 'Turn aside the killing blow.',
    effect: (rank) => `${(rank * 1.5).toFixed(1)}% damage reduction`,
    next: (rank) => `${((rank + 1) * 1.5).toFixed(1)}% damage reduction`,
    short: 'ARM',
  },
];

/* ------------------------------------------------------------
   SKINS & BLADES
   ------------------------------------------------------------ */

export const SKINS = [
  {
    id: 'kaito-storm', hero: 'kaito', name: 'Stormstep', price: 0,
    desc: 'The borrowed blade and the storm that follows it.',
    palette: { cloak: '#0a1c2a', cloak2: '#12344a', hood: '#081521', scarf: '#2bc6e8', eye: '#6ff0ff', trim: '#ffc857', aura: '#39d7ff' },
  },
  {
    id: 'kaito-oni', hero: 'kaito', name: 'Crimson Oni', price: 900,
    desc: 'A mask painted in the last light of a burning village.',
    palette: { cloak: '#2a0a10', cloak2: '#4a1420', hood: '#16060a', scarf: '#ff6b3d', eye: '#ffd166', trim: '#ffb347', aura: '#ff5c4c' },
  },
  {
    id: 'mira-lotus', hero: 'mira', name: 'Iron Lotus', price: 0,
    desc: 'The armor of a guardian who has never taken a step back.',
    palette: { cloak: '#2a1c0e', cloak2: '#4a3418', hood: '#140d06', scarf: '#ffb347', eye: '#ffe0a3', trim: '#ffd166', aura: '#ffb347' },
  },
  {
    id: 'mira-jade', hero: 'mira', name: 'Jade Bulwark', price: 1000,
    desc: 'Living stone shaped into petals. Heavier than it looks.',
    palette: { cloak: '#0c241c', cloak2: '#184a38', hood: '#06140f', scarf: '#5ee0a0', eye: '#c8ffe8', trim: '#8effd1', aura: '#5ee0a0' },
  },
  {
    id: 'ren-ember', hero: 'ren', name: 'Ember Ash', price: 0,
    desc: 'A robe that smells of smoke and old victories.',
    palette: { cloak: '#2a1008', cloak2: '#4a1e10', hood: '#160804', scarf: '#ff7a3d', eye: '#ffd166', trim: '#ff9a4c', aura: '#ff6b3d' },
  },
  {
    id: 'ren-wraith', hero: 'ren', name: 'Ash Wraith', price: 1100,
    desc: 'What remains after the fire forgets your name.',
    palette: { cloak: '#181420', cloak2: '#2c2438', hood: '#0a0810', scarf: '#b8a6ff', eye: '#e0d4ff', trim: '#a78bfa', aura: '#8f7bff' },
  },
  {
    id: 'sora-silk', hero: 'sora', name: 'Moon Silk', price: 0,
    desc: 'Pale thread, quiet step, a web already around you.',
    palette: { cloak: '#1a1030', cloak2: '#2e1c54', hood: '#0d0718', scarf: '#a78bfa', eye: '#d9c8ff', trim: '#e0c080', aura: '#a78bfa' },
  },
  {
    id: 'sora-court', hero: 'sora', name: 'Winter Court', price: 1200,
    desc: 'A thread pulled from the first snowfall. It never melts.',
    palette: { cloak: '#101a2e', cloak2: '#22365a', hood: '#080d18', scarf: '#9fd8ff', eye: '#eaf6ff', trim: '#cfd9ff', aura: '#7fd8ff' },
  },
  {
    id: 'yuki-gale', hero: 'yuki', name: 'Gale Ranger', price: 0,
    desc: 'A green hood, a storm-torn bow, and a trail of leaves.',
    palette: { cloak: '#0c241c', cloak2: '#184a38', hood: '#06140f', scarf: '#63e6a4', eye: '#c8ffe8', trim: '#ffd166', aura: '#63e6a4' },
  },
  {
    id: 'yuki-moon', hero: 'yuki', name: 'Moonfeather', price: 1100,
    desc: 'Pale feathers catch the moon. The hunt becomes a quiet thing.',
    palette: { cloak: '#101a2e', cloak2: '#263a5c', hood: '#080d18', scarf: '#cfd9ff', eye: '#eaf6ff', trim: '#c0d8ff', aura: '#9fc4ff' },
  },
  {
    id: 'aster-arcane', hero: 'aster', name: 'Arcane Adept', price: 0,
    desc: 'Robes stitched with equations no one else can read.',
    palette: { cloak: '#101b34', cloak2: '#1c315c', hood: '#08101f', scarf: '#6ea8ff', eye: '#d8ecff', trim: '#ffd166', aura: '#6ea8ff' },
  },
  {
    id: 'aster-astral', hero: 'aster', name: 'Astral Sage', price: 1300,
    desc: 'A crown of dead stars, still burning for one more spell.',
    palette: { cloak: '#0e1530', cloak2: '#1e2c58', hood: '#070b18', scarf: '#ffd166', eye: '#fff3c4', trim: '#9fc4ff', aura: '#ffd166' },
  },
];

export function skinsForHero(heroId) {
  return SKINS.filter((s) => s.hero === heroId);
}

export function skinById(id) {
  return SKINS.find((s) => s.id === id);
}

export const BLADES = [
  {
    id: 'blade-borrowed', name: 'Borrowed Blade', price: 0,
    desc: 'Chipped, plain, and still sharp enough to change a story.',
    edge: '#dff9ff', glow: '#39d7ff', hilt: '#ffc857', shape: 'katana',
  },
  {
    id: 'blade-ember', name: 'Ember Fang', price: 700,
    desc: 'Forged inside a volcano. It has never really cooled.',
    edge: '#ffd0a0', glow: '#ff6b3d', hilt: '#7a2a12', shape: 'cleaver',
  },
  {
    id: 'blade-jade', name: 'Jade Reaper', price: 950,
    desc: 'A curve of green stone that hums when blood is near.',
    edge: '#c8ffe8', glow: '#5ee0a0', hilt: '#1c4f3a', shape: 'curve',
  },
  {
    id: 'blade-void', name: 'Void Needle', price: 1300,
    desc: 'So thin it cuts the space between seconds.',
    edge: '#ead8ff', glow: '#a78bfa', hilt: '#3b2a66', shape: 'needle',
  },
];

export function bladeById(id) {
  return BLADES.find((b) => b.id === id) || BLADES[0];
}

/* ------------------------------------------------------------
   ENEMIES
   ------------------------------------------------------------ */

export const ENEMIES = {
  /* --- Bamboo Forest --- */
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

  /* --- Abandoned Village --- */
  rogue: {
    name: 'Rogue', kind: 'melee', shape: 'rogue',
    hp: 42, dmg: 10, speed: 128, radius: 13, xp: 14, coins: 6,
    atkCd: 1.0, range: 34, windup: 0.25,
    color: '#ff7a9c', accent: '#5a2335',
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

  /* --- Crystal Caverns --- */
  crawler: {
    name: 'Crawler', kind: 'melee', shape: 'crawler',
    hp: 18, dmg: 6, speed: 152, radius: 11, xp: 7, coins: 3,
    atkCd: 0.9, range: 30, windup: 0.2,
    color: '#b4e05a', accent: '#3e4f14',
  },
  mage: {
    name: 'Shard Mage', kind: 'ranged', shape: 'mage',
    hp: 34, dmg: 11, speed: 62, radius: 15, xp: 18, coins: 8,
    atkCd: 2.2, range: 230, windup: 0.5, projSpeed: 240, aoeRadius: 62,
    color: '#5ee0c8', accent: '#1c4f47',
  },
  crystal_beast: {
    name: 'Crystal Beast', kind: 'ranged', shape: 'beast',
    hp: 82, dmg: 12, speed: 70, radius: 18, xp: 28, coins: 13,
    atkCd: 2.8, range: 240, windup: 0.5, projSpeed: 280,
    ability: 'volley', fanCount: 5,
    color: '#7fd8ff', accent: '#244a6b',
  },
  golem: {
    name: 'Golem', kind: 'melee', shape: 'golem',
    hp: 170, dmg: 20, speed: 46, radius: 24, xp: 40, coins: 20,
    atkCd: 1.9, range: 50, windup: 0.6,
    color: '#8ea2b8', accent: '#33404f',
  },
  stone_sentinel: {
    name: 'Stone Sentinel', kind: 'melee', shape: 'sentinel',
    hp: 220, dmg: 22, speed: 42, radius: 25, xp: 46, coins: 22,
    atkCd: 2.1, range: 54, windup: 0.65,
    ability: 'guard', guardCd: 5.2, guardTime: 1.6,
    color: '#a8b8c4', accent: '#3b4650',
  },

  /* --- Ember Volcano --- */
  imp: {
    name: 'Ember Imp', kind: 'ranged', shape: 'imp',
    hp: 32, dmg: 9, speed: 112, radius: 12, xp: 15, coins: 7,
    atkCd: 1.6, range: 190, windup: 0.3, projSpeed: 320,
    color: '#ff9a4c', accent: '#5c2a0c',
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

  /* --- Shadow Fortress --- */
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
  nightmare: {
    name: 'Nightmare', kind: 'caster', shape: 'nightmare',
    hp: 86, dmg: 14, speed: 70, radius: 17, xp: 34, coins: 16,
    atkCd: 3.2, range: 240, windup: 0.6, projSpeed: 260,
    ability: 'volley', fanCount: 4,
    color: '#a78bfa', accent: '#2d2352',
  },
  wraith: {
    name: 'Mirror Wraith', kind: 'caster', shape: 'wraith',
    hp: 78, dmg: 15, speed: 90, radius: 15, xp: 32, coins: 15,
    atkCd: 3.0, range: 220, windup: 0.5,
    ability: 'blink', zoneRadius: 80,
    color: '#8fb8ff', accent: '#243a66',
  },

  /* --- Sunken Shrine --- */
  drowned: {
    name: 'Drowned', kind: 'melee', shape: 'drowned',
    hp: 48, dmg: 11, speed: 138, radius: 14, xp: 20, coins: 9,
    atkCd: 1.0, range: 34, windup: 0.25,
    color: '#5fd0c0', accent: '#1b4a44',
  },
  tide_caller: {
    name: 'Tide Caller', kind: 'caster', shape: 'tide',
    hp: 58, dmg: 13, speed: 62, radius: 15, xp: 26, coins: 13,
    atkCd: 3.4, range: 250, windup: 0.65,
    ability: 'zone', zoneRadius: 82,
    color: '#7fffe0', accent: '#1c5a50',
  },
  shrine_guard: {
    name: 'Shrine Guard', kind: 'melee', shape: 'guard',
    hp: 145, dmg: 18, speed: 54, radius: 21, xp: 34, coins: 17,
    atkCd: 2.0, range: 48, windup: 0.55,
    ability: 'guard', guardCd: 4.8, guardTime: 1.4,
    color: '#c9b27a', accent: '#4b3d1c',
  },

  /* --- Sky Citadel --- */
  sky_blade: {
    name: 'Sky Blade', kind: 'melee', shape: 'skyblade',
    hp: 88, dmg: 16, speed: 136, radius: 14, xp: 34, coins: 16,
    atkCd: 1.0, range: 38, windup: 0.22,
    ability: 'blink',
    color: '#9fc4ff', accent: '#2b4270',
  },
  storm_monk: {
    name: 'Storm Monk', kind: 'ranged', shape: 'monk',
    hp: 72, dmg: 14, speed: 76, radius: 16, xp: 32, coins: 16,
    atkCd: 2.6, range: 260, windup: 0.5, projSpeed: 290,
    ability: 'volley', fanCount: 5,
    color: '#7f9cff', accent: '#24306b',
  },
  cloud_serpent: {
    name: 'Cloud Serpent', kind: 'charger', shape: 'serpent',
    hp: 105, dmg: 18, speed: 122, radius: 19, xp: 38, coins: 18,
    atkCd: 3.0, range: 50, windup: 0.5, chargeSpeed: 610,
    ability: 'charge',
    color: '#b8d8ff', accent: '#334c70',
  },
  sentinel: {
    name: 'Sky Sentinel', kind: 'melee', shape: 'skysentinel',
    hp: 210, dmg: 24, speed: 48, radius: 26, xp: 48, coins: 24,
    atkCd: 2.0, range: 56, windup: 0.6,
    ability: 'guard', guardCd: 5.0, guardTime: 1.5,
    color: '#d8e4ff', accent: '#45527a',
  },

  /* --- BOSSES --- */
  training_master: {
    name: 'Training Master', kind: 'boss', shape: 'boss', boss: true, style: 'training',
    hp: 450, dmg: 14, speed: 88, radius: 26, xp: 150, coins: 60,
    atkCd: 2.8, range: 62, windup: 0.55,
    slamRadius: 135, fanCount: 9, fanSpeed: 230, enrageAt: 0.4,
    attacks: ['slam', 'fan'],
    color: '#e0c26a', accent: '#4f3d15',
  },
  bandit_chief: {
    name: 'Bandit Chief', kind: 'boss', shape: 'boss', boss: true, style: 'chief',
    hp: 800, dmg: 18, speed: 82, radius: 28, xp: 250, coins: 110,
    atkCd: 2.6, range: 66, windup: 0.55,
    slamRadius: 145, fanCount: 10, fanSpeed: 240, enrageAt: 0.4,
    attacks: ['charge', 'fan', 'ring'], chargeSpeed: 620, ringRadius: 190,
    color: '#e08a4a', accent: '#5a2a12',
  },
  stone_guardian: {
    name: 'Stone Guardian', kind: 'boss', shape: 'boss', boss: true, style: 'guardian',
    hp: 1200, dmg: 22, speed: 56, radius: 34, xp: 380, coins: 190,
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
    hp: 1800, dmg: 34, speed: 86, radius: 38, xp: 800, coins: 450,
    atkCd: 2.3, range: 82, windup: 0.55,
    slamRadius: 190, fanCount: 14, fanSpeed: 280, enrageAt: 0.42,
    attacks: ['blink', 'fan', 'spikes'], blinkRadius: 130, spikeCount: 4, spikeRadius: 78,
    color: '#c08aff', accent: '#2d2352',
  },
  tide_empress: {
    name: 'Tide Empress', kind: 'boss', shape: 'boss', boss: true, style: 'tide',
    hp: 2400, dmg: 40, speed: 70, radius: 36, xp: 1100, coins: 650,
    atkCd: 2.2, range: 80, windup: 0.6,
    slamRadius: 190, fanCount: 14, fanSpeed: 270, enrageAt: 0.42,
    attacks: ['ring', 'fan', 'meteors', 'slam'], meteorCount: 4, meteorRadius: 86, ringRadius: 240,
    color: '#5fd0c0', accent: '#1b4a44',
  },
  storm_emperor: {
    name: 'Storm Emperor', kind: 'boss', shape: 'boss', boss: true, style: 'storm',
    hp: 3000, dmg: 46, speed: 92, radius: 40, xp: 1500, coins: 900,
    atkCd: 2.0, range: 86, windup: 0.5,
    slamRadius: 200, fanCount: 16, fanSpeed: 300, enrageAt: 0.45,
    attacks: ['blink', 'fan', 'ring', 'meteors'], blinkRadius: 145, meteorCount: 5, meteorRadius: 90, ringRadius: 250,
    color: '#9fc4ff', accent: '#2b4270',
  },
};

/* ------------------------------------------------------------
   ZONES — seven chapters, four waves each, boss at the end
   ------------------------------------------------------------ */

export const ZONES = [
  {
    id: 'forest', name: 'Bamboo Forest', subtitle: 'Where the first step is taken',
    icon: 'forest', unlock: 1, tier: 1, theme: 'forest', boss: 'training_master',
    desc: 'Mist between the stalks. Bandits have made a training ground of the old path.',
    tags: ['Bandits', 'Mist Wolves', 'Wind Adepts'], map: { x: 8, y: 64 },
    waves: [
      ['bandit', 'bandit', 'archer', 'wolf', 'bandit', 'archer', 'wolf', 'bandit'],
      ['bandit', 'wolf', 'archer', 'wind_adept', 'bandit', 'wolf', 'archer', 'bandit', 'wind_adept'],
      ['brute', 'wind_adept', 'wolf', 'archer', 'wolf', 'brute', 'archer', 'wolf', 'bandit', 'wind_adept'],
      ['brute', 'wind_adept', 'wolf', 'wolf', 'archer', 'brute', 'wind_adept', 'bandit', 'archer', 'wolf', 'brute', 'wind_adept'],
    ],
    clear: { coins: 120, xp: 100 },
  },
  {
    id: 'village', name: 'Abandoned Village', subtitle: 'The lights went out years ago',
    icon: 'village', unlock: 3, tier: 1.3, theme: 'village', boss: 'bandit_chief',
    desc: 'Empty houses, full pockets. The chief who burned this place still walks its streets.',
    tags: ['Rogues', 'Ronin', 'Pyromancers'], map: { x: 22, y: 38 },
    waves: [
      ['rogue', 'rogue', 'archer', 'bandit', 'rogue', 'archer', 'bandit', 'rogue'],
      ['rogue', 'ronin', 'archer', 'ronin', 'archer', 'rogue', 'pyromancer', 'bandit', 'rogue'],
      ['ronin', 'pyromancer', 'brute', 'rogue', 'ronin', 'brute', 'rogue', 'archer', 'pyromancer', 'ronin'],
      ['ronin', 'pyromancer', 'brute', 'rogue', 'ronin', 'brute', 'rogue', 'archer', 'pyromancer', 'ronin', 'brute', 'rogue'],
    ],
    clear: { coins: 220, xp: 180 },
  },
  {
    id: 'caverns', name: 'Crystal Caverns', subtitle: 'Something hums beneath the stone',
    icon: 'caverns', unlock: 6, tier: 1.6, theme: 'caverns', boss: 'stone_guardian',
    desc: 'The crystals remember every step. The guardian remembers every theft.',
    tags: ['Crawlers', 'Crystal Beasts', 'Golems'], map: { x: 36, y: 64 },
    waves: [
      ['crawler', 'crawler', 'mage', 'crawler', 'crawler', 'crystal_beast', 'crawler', 'mage'],
      ['crawler', 'crystal_beast', 'mage', 'crawler', 'mage', 'crawler', 'crystal_beast', 'crawler', 'mage'],
      ['golem', 'crystal_beast', 'mage', 'crawler', 'crystal_beast', 'mage', 'golem', 'crawler', 'stone_sentinel', 'mage'],
      ['golem', 'crystal_beast', 'mage', 'crawler', 'crystal_beast', 'mage', 'golem', 'crawler', 'stone_sentinel', 'crystal_beast', 'mage', 'golem'],
    ],
    clear: { coins: 360, xp: 300 },
  },
  {
    id: 'volcano', name: 'Ember Volcano', subtitle: 'The mountain is still angry',
    icon: 'volcano', unlock: 10, tier: 2, theme: 'volcano', boss: 'fire_oni',
    desc: 'Ash falls like snow. The oni at the summit has been waiting for a worthy blade.',
    tags: ['Imps', 'Lava Hounds', 'Flame Dancers'], map: { x: 50, y: 38 },
    waves: [
      ['imp', 'imp', 'brute', 'imp', 'brute', 'lava_hound', 'imp', 'flame_dancer'],
      ['imp', 'lava_hound', 'mage', 'lava_hound', 'imp', 'flame_dancer', 'lava_hound', 'imp', 'flame_dancer'],
      ['lava_hound', 'flame_dancer', 'brute', 'imp', 'lava_hound', 'brute', 'imp', 'flame_dancer', 'lava_hound', 'brute'],
      ['lava_hound', 'flame_dancer', 'brute', 'imp', 'lava_hound', 'brute', 'imp', 'flame_dancer', 'pyromancer', 'lava_hound', 'flame_dancer', 'brute'],
    ],
    clear: { coins: 520, xp: 450 },
  },
  {
    id: 'fortress', name: 'Shadow Fortress', subtitle: 'The last door before the legend',
    icon: 'fortress', unlock: 15, tier: 2.5, theme: 'fortress', boss: 'shadow_king',
    desc: 'A castle built from the names of everyone who failed. Yours is not carved yet.',
    tags: ['Shadow Blades', 'Nightmares', 'Void Archers'], map: { x: 64, y: 64 },
    waves: [
      ['shadow', 'void_archer', 'shadow', 'shadow', 'void_archer', 'wraith', 'shadow', 'void_archer'],
      ['shadow', 'nightmare', 'void_archer', 'shadow', 'void_archer', 'wraith', 'nightmare', 'shadow', 'wraith'],
      ['shadow', 'nightmare', 'golem', 'void_archer', 'nightmare', 'shadow', 'void_archer', 'wraith', 'golem', 'nightmare'],
      ['shadow', 'nightmare', 'golem', 'void_archer', 'nightmare', 'shadow', 'void_archer', 'wraith', 'sentinel', 'nightmare', 'shadow', 'void_archer'],
    ],
    clear: { coins: 700, xp: 650 },
  },
  {
    id: 'shrine', name: 'Sunken Shrine', subtitle: 'The tide remembers every prayer',
    icon: 'shrine', unlock: 18, tier: 3.0, theme: 'shrine', boss: 'tide_empress',
    desc: 'A drowned temple rises from the black water. Its empress has been waiting beneath the waves.',
    tags: ['Drowned', 'Tide Callers', 'Shrine Guards'], map: { x: 78, y: 36 },
    waves: [
      ['drowned', 'drowned', 'tide_caller', 'drowned', 'shrine_guard', 'tide_caller', 'drowned', 'wraith'],
      ['drowned', 'tide_caller', 'shrine_guard', 'drowned', 'wraith', 'tide_caller', 'drowned', 'shrine_guard', 'wraith'],
      ['shrine_guard', 'tide_caller', 'wraith', 'drowned', 'shrine_guard', 'tide_caller', 'wraith', 'drowned', 'shrine_guard', 'tide_caller'],
      ['shrine_guard', 'tide_caller', 'wraith', 'drowned', 'shrine_guard', 'tide_caller', 'wraith', 'drowned', 'shrine_guard', 'tide_caller', 'wraith', 'shrine_guard'],
    ],
    clear: { coins: 900, xp: 800 },
  },
  {
    id: 'sky', name: 'Sky Citadel', subtitle: 'The storm has a throne',
    icon: 'sky', unlock: 22, tier: 3.6, theme: 'sky', boss: 'storm_emperor',
    desc: 'A fortress suspended in the eye of a hurricane. The emperor has been waiting for someone worth striking.',
    tags: ['Sky Blades', 'Storm Monks', 'Cloud Serpents'], map: { x: 91, y: 58 },
    waves: [
      ['sky_blade', 'storm_monk', 'cloud_serpent', 'sky_blade', 'storm_monk', 'sky_blade', 'cloud_serpent', 'storm_monk'],
      ['sky_blade', 'cloud_serpent', 'storm_monk', 'sky_blade', 'storm_monk', 'sentinel', 'sky_blade', 'cloud_serpent', 'storm_monk'],
      ['sky_blade', 'cloud_serpent', 'storm_monk', 'sky_blade', 'storm_monk', 'sentinel', 'cloud_serpent', 'sky_blade', 'storm_monk', 'sentinel'],
      ['sky_blade', 'cloud_serpent', 'storm_monk', 'sky_blade', 'storm_monk', 'sentinel', 'cloud_serpent', 'sky_blade', 'storm_monk', 'sentinel', 'cloud_serpent', 'sky_blade'],
    ],
    clear: { coins: 1200, xp: 1050 },
  },
];

export function zoneById(id) {
  return ZONES.find((z) => z.id === id) || ZONES[0];
}

/* ------------------------------------------------------------
   THEMES
   ------------------------------------------------------------ */

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
  shrine: {
    ground1: '#0a2024', ground2: '#041012', accent: '#3fc9b0',
    glow: '#7fffe0', particle: '#b8fff0', fog: 'rgba(20, 58, 54, 0.5)',
  },
  sky: {
    ground1: '#101a2e', ground2: '#070d18', accent: '#5f7fd8',
    glow: '#cfd9ff', particle: '#eaf1ff', fog: 'rgba(32, 46, 78, 0.5)',
  },
};
