/* ============================================================
   SHINOBI ASCENSION — original vector art
   Inline SVG only. No external assets.
   ============================================================ */

const PATHS = {
  dash: `
    <path d="M2 8h10M2 12h14M2 16h10" stroke-width="2"/>
    <path d="M15 6l5 6-5 6"/>
  `,
  arrow: `
    <path d="M3 21 21 3M14 3h7v7M3 21l5-1-4-4-1 5Z"/>
  `,
  rain: `
    <path d="M4 4h16M6 9l-2 5M10 8l-2 6M14 9l-2 5M18 8l-2 6M8 16l-1 4M13 15l-1 5M18 16l-1 4"/>
  `,
  volley: `
    <path d="M4 20 18 6M13 4h7v7M4 13l7-1M11 20l1-7M4 7l3 1M16 21l-1-3"/>
  `,
  trap: `
    <path d="M4 20h16M6 20l2-8 4 4 4-4 2 8M12 12V4M8 8l4-4 4 4"/>
  `,
  skyfall: `
    <path d="M12 2v3M7 5l2 2M17 5l-2 2M3 9h3M18 9h3M3 13h18M7 17l5-4 5 4M12 13v9"/>
  `,
  blink: `
    <path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3"/>
    <circle cx="12" cy="12" r="3"/>
  `,
  arcane: `
    <path d="M12 2 3 7v10l9 5 9-5V7l-9-5Z"/>
    <path d="M12 6v12M7 9l10 6M17 9 7 15"/>
  `,
  frost: `
    <path d="M12 2v20M3 7l18 10M21 7 3 17M8 4l4 3 4-3M8 20l4-3 4 3"/>
  `,
  meteor: `
    <path d="M4 4l7 7M8 2l5 5M2 8l5 5M11 13l5-5 5 5-5 8-5-8Z"/>
    <path d="M16 3l-1 4 4-1"/>
  `,
  barrier: `
    <path d="M12 2 4 6v6c0 5 3.4 8.2 8 10 4.6-1.8 8-5 8-10V6l-8-4Z"/>
    <path d="M7 12h10M12 7v10"/>
  `,
  singularity: `
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 2a10 10 0 0 1 10 10M12 22A10 10 0 0 1 2 12M7 7l3 3M17 17l-3-3M17 7l-3 3M7 17l3-3"/>
  `,
  spark: `
    <path d="M13.5 2 5 14h5.2L9 22l8.5-12h-5.3L13.5 2Z" fill="currentColor" stroke="none"/>
  `,
  chain: `
    <circle cx="4.5" cy="12" r="2"/>
    <circle cx="19" cy="6" r="2"/>
    <circle cx="19" cy="18" r="2"/>
    <path d="M6.5 11l2.5-2 2.5 3 2.5-2 2.5-2M6.5 13l2.5 2 2.5-3 2.5 2 2.5 2"/>
  `,
  storm: `
    <path d="M6 10a4 4 0 0 1 7.5-1.5A3.5 3.5 0 0 1 18 12H6a2 2 0 0 1 0-2Z"/>
    <path d="M12 12l-2 4h3l-2 5"/>
    <path d="M6 16l-1 2M18 16l1 2"/>
  `,
  ultimate: `
    <path d="M5 9a4 4 0 0 1 7.2-2A3.2 3.2 0 0 1 17 9"/>
    <path d="M3 10h16"/>
    <path d="M12 11l-3 5h4l-2 6"/>
    <path d="M7 19l-2 2M17 19l2 2"/>
  `,
  execution: `
    <path d="M6 10.5a6 6 0 0 1 12 0c0 3-1.6 4.5-3.2 5.2V20H9.2v-4.3C7.6 15 6 13.5 6 10.5Z"/>
    <circle cx="9.4" cy="10.5" r="1.2" fill="currentColor" stroke="none"/>
    <circle cx="14.6" cy="10.5" r="1.2" fill="currentColor" stroke="none"/>
    <path d="M9.2 20.5h5.6M10 22v1.5M12 22v1.5M14 22v1.5"/>
  `,
  gale: `
    <path d="M2 8h13a3 3 0 1 0-3-3M2 12h18a3 3 0 1 1-3 3M2 16h10"/>
  `,
  static: `
    <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>
    <circle cx="12" cy="12" r="3"/>
  `,
  assassin: `
    <path d="M4 20 15 9l-2-2L2 18l2 2Z"/>
    <path d="M20 20 9 9l2-2 11 11-2 2Z"/>
    <path d="M14 4h6v6"/>
  `,
  dancer: `
    <path d="M3 15c4-7 14-7 18 0M5 19c3-4 11-4 14 0M8 11c2-3 6-3 8 0"/>
    <path d="M12 3v4M10 5h4"/>
  `,
  power: `
    <path d="M5 19 19 5M14 5h5v5M3 21l4-1"/>
    <path d="M4 20l2-4 3 3-4 2Z" fill="currentColor" stroke="none"/>
  `,
  vitality: `
    <path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9Z"/>
    <path d="M8 11h2l1-2 2 5 1-3h2"/>
  `,
  agility: `
    <path d="M3 15h7c3 0 5-2 7-5l2-3 2 2-2 4c-2 3-4 5-8 5H3Z"/>
    <path d="M3 19h10M15 5l3 1"/>
  `,
  focus: `
    <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12Z"/>
    <circle cx="12" cy="12" r="2.5"/>
    <path d="M12 4v2M12 18v2"/>
  `,
  armor: `
    <path d="M12 2 4 6v6c0 5 3.4 8.2 8 10 4.6-1.8 8-5 8-10V6l-8-4Z"/>
    <path d="M8 11h3l1-3 2 7 1-4h2"/>
  `,
  heal: `
    <circle cx="12" cy="12" r="9"/>
    <path d="M12 8v8M8 12h8"/>
  `,
  charge: `
    <path d="M3 13h11M3 17h8M17 6l4 6-4 6M14 12h7"/>
  `,
  fist: `
    <path d="M7 12V7a2 2 0 0 1 4 0v5M11 12V5a2 2 0 0 1 4 0v7M15 12V7a2 2 0 0 1 4 0v9c0 3-2 5-5 5H9c-3 0-5-2-5-5v-4l-1-2c-.5-1 .2-2 1.2-2.2 1-.2 1.7.3 2.2 1.2L7 11"/>
  `,
  quake: `
    <path d="M3 19 7 9l5 6 3-4 6 8H3Z"/>
    <path d="M7 9l2 4 2-1M8 16c2 1 5 1 8 0"/>
  `,
  breaker: `
    <path d="M12 2v7M12 15v7M4 12h5M15 12h5M5.6 5.6l3.5 3.5M14.9 14.9l3.5 3.5M18.4 5.6l-3.5 3.5M9.1 14.9l-3.5 3.5"/>
    <circle cx="12" cy="12" r="2.5"/>
  `,
  shield: `
    <path d="M12 2 4 6v6c0 5 3.4 8.2 8 10 4.6-1.8 8-5 8-10V6l-8-4Z"/>
    <path d="M9 12l2 2 4-4"/>
  `,
  fortress: `
    <path d="M4 21V8l3-2v3l3-3v3l2-4 2 4v-3l3 3V6l3 2v13H4Z"/>
    <path d="M10 21v-5h4v5M8 12h2M14 12h2"/>
  `,
  ember: `
    <path d="M12 2c2 5-3 6-3 11a3 3 0 0 0 6 0c0-2-1-3-1-5 3 1 5 4 5 7a7 7 0 0 1-14 0c0-5 4-7 7-13Z"/>
  `,
  fan: `
    <path d="M4 20 20 4M4 20l6-1M4 20l1-6M20 4l-6 1M20 4l-1 6"/>
    <path d="M9 15l6-6"/>
  `,
  smoke: `
    <path d="M5 18c-2 0-3-1.5-3-3.2C2 12 4 10.5 6 11c.2-3 2.6-5 5.6-5 2.3 0 4.2 1.3 5 3.2 2.8-.5 5 1.7 5 4.6 0 2.4-1.8 4.2-4.2 4.2H5Z"/>
    <path d="M8 15c1 1 2 1 3 0M13 15c1 1 2 1 3 0"/>
  `,
  firestorm: `
    <path d="M6 10a4 4 0 0 1 7.5-1.5A3.5 3.5 0 0 1 18 12H6a2 2 0 0 1 0-2Z"/>
    <path d="M12 13c1 2-2 3-2 5a2 2 0 0 0 4 0c0-1-.5-1.5-.5-2.5 1.5.5 2.5 2 2.5 3.5a4 4 0 0 1-8 0c0-2.5 2.5-3.5 4-6Z"/>
  `,
  pyre: `
    <path d="M12 22c4 0 7-3 7-7 0-5-5-7-7-13-2 6-7 8-7 13 0 4 3 7 7 7Z"/>
    <path d="M12 18c1.5 0 3-1.2 3-3 0-2-2-3-3-5-1 2-3 3-3 5 0 1.8 1.5 3 3 3Z"/>
  `,
  silkstep: `
    <path d="M2 7c5 0 5 4 10 4s5-4 10-4M2 13c5 0 5 4 10 4s5-4 10-4M2 19c5 0 5 4 10 4s5-4 10-4"/>
  `,
  thread: `
    <path d="M3 20 21 4"/>
    <circle cx="3" cy="20" r="1.5" fill="currentColor"/>
    <path d="M14 4h7v7"/>
  `,
  bind: `
    <circle cx="6" cy="7" r="3"/>
    <circle cx="18" cy="7" r="3"/>
    <circle cx="12" cy="18" r="3"/>
    <path d="M6 10l6 5M18 10l-6 5M6 7h12"/>
  `,
  web: `
    <circle cx="12" cy="12" r="9"/>
    <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4M12 6a6 6 0 0 0-6 6M12 6a6 6 0 0 1 6 6M12 18a6 6 0 0 1-6-6M12 18a6 6 0 0 0 6-6"/>
  `,
  puppet: `
    <path d="M4 4h16M12 4v7"/>
    <circle cx="6" cy="10" r="2"/>
    <circle cx="18" cy="10" r="2"/>
    <circle cx="12" cy="13" r="2"/>
    <path d="M6 12v5M18 12v5M12 15v6M8 21h8"/>
  `,
  fire: `
    <path d="M12 2c2 5-3 6-3 11a3 3 0 0 0 6 0c0-2-1-3-1-5 3 1 5 4 5 7a7 7 0 0 1-14 0c0-5 4-7 7-13Z"/>
  `,
  silk: `
    <path d="M3 6c6 0 6 4 12 4s3-4 6-4M3 12c6 0 6 4 12 4s3-4 6-4M3 18c6 0 6 4 12 4s3-4 6-4"/>
  `,
  rage: `
    <path d="M12 2 9 9l-5 1 4 4-1 6 5-3 5 3-1-6 4-4-5-1-3-7Z"/>
    <path d="M12 9v4M12 16v.1"/>
  `,
  star: `
    <path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z"/>
  `,
  lock: `
    <rect x="4" y="10" width="16" height="11" rx="2"/>
    <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>
  `,
  coin: `
    <circle cx="12" cy="12" r="8"/>
    <path d="m12 7 4 5-4 5-4-5 4-5Z"/>
  `,
  forest: `
    <path d="M12 21V9"/>
    <path d="M12 12C8 12 6 9 6 6c4 0 6 2 6 6ZM12 15c4 0 6-3 6-6-4 0-6 2-6 6Z"/>
  `,
  village: `
    <path d="M3 11 12 4l9 7"/>
    <path d="M6 10v10h12V10M10 20v-5h4v5"/>
  `,
  caverns: `
    <path d="M12 3 6 12l3 1-2 8 7-6 2 5 2-8 3-1-5-8Z"/>
    <path d="M12 8v5"/>
  `,
  volcano: `
    <path d="M3 20 9 9l3 4 2-3 7 10H3Z"/>
    <path d="M9 9l2 4 2-1M8 16c2 1 4 1 6 0"/>
  `,
  fortress: `
    <path d="M4 21V8l3-2v3l3-3v3l2-4 2 4v-3l3 3V6l3 2v13H4Z"/>
    <path d="M10 21v-5h4v5M8 12h2M14 12h2"/>
  `,
  shrine: `
    <path d="M3 21h18M5 21V10l7-6 7 6v11"/>
    <path d="M9 21v-6h6v6M5 10h14M12 4v3"/>
  `,
  sky: `
    <path d="M3 20 9 8l4 6 3-4 5 10H3Z"/>
    <path d="M8 6h2L9 9M16 4h2l-1 3M4 11h2l-1 2"/>
  `,
  trophy: `
    <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/>
    <path d="M8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4M12 13v5M8 21h8M9 18h6"/>
  `,
};

const ELEMENT = {
  storm: ['#0b3b52', '#39d7ff', '#eaffff'],
  iron: ['#4a2a08', '#ffb347', '#fff0c8'],
  fire: ['#4a1206', '#ff6b3d', '#ffe0b0'],
  silk: ['#2b1b52', '#a78bfa', '#f0e8ff'],
  wind: ['#0b2a1b', '#63e6a4', '#eafff2'],
  arcane: ['#0b1c40', '#6ea8ff', '#eaf4ff'],
};

export function icon(name, size = 24, className = '') {
  const body = PATHS[name] || PATHS.spark;
  return `<svg class="icon ${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}

function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ============================================================
   HERO PORTRAIT — used on the select screen, hub, and rage bar
   ============================================================ */

export function heroPortrait(hero, opts = {}) {
  const rage = !!opts.rage;
  const size = opts.size || 140;
  const cls = opts.class || '';
  const stage = !!opts.stage;
  const animate = stage && opts.animate !== false;
  const p = opts.palette || {};
  const color = p.aura || hero.color || '#39d7ff';
  const scarf = p.scarf || hero.color || '#39d7ff';
  const cloak = p.cloak || '#0a1c2a';
  const cloak2 = p.cloak2 || '#12344a';
  const hood = p.hood || '#081521';
  const eye = rage ? '#fff3c4' : (p.eye || '#6ff0ff');
  const uid = `${hero.id}-${rage ? 'rage' : 'calm'}`;
  const isMira = hero.id === 'mira';
  const isRen = hero.id === 'ren';
  const isSora = hero.id === 'sora';
  const isArcher = hero.id === 'yuki';
  const isWizard = hero.id === 'aster';

  const shoulders = isMira
    ? `<path d="M28 105c10-14 28-17 40-8l-7 20c-11-7-20-7-29-1Z" fill="#140d06" stroke="${p.trim || '#ffd166'}" stroke-width="1.4" opacity=".9"/>
       <path d="M112 105c-10-14-28-17-40-8l7 20c11-7 20-7 29-1Z" fill="#140d06" stroke="${p.trim || '#ffd166'}" stroke-width="1.4" opacity=".9"/>`
    : `<path d="M34 108c7-10 20-12 28-7l-5 14c-8-4-14-4-21 0Z" fill="${hood}" opacity=".9"/>
       <path d="M106 108c-7-10-20-12-28-7l5 14c8-4 14-4 21 0Z" fill="${hood}" opacity=".9"/>`;

  const soraRibbons = isSora ? `
    <path d="M38 116c-18 14-24 34-36 42 16 2 34-13 44-36Z" fill="${scarf}" opacity=".5"/>
    <path d="M102 116c18 14 24 34 36 42-16 2-34-13-44-36Z" fill="${scarf}" opacity=".5"/>` : `
    <path d="M46 110c-20 10-24 35-42 46 18 3 40-11 52-36Z" fill="${scarf}" opacity=".75"/>
    <path d="M52 118c-14 12-14 32-26 42 15 0 30-16 36-35Z" fill="${scarf}" opacity=".45"/>`;

  const renFlames = isRen ? `
    <path d="M70 34c-4 12-12 14-10 26-6-3-8-10-7-17-6 7-8 17-3 27 6 12 22 12 28 0 5-11 0-24-8-36Z" fill="${scarf}" opacity=".45"/>
    <path d="M72 48c-2 6-6 7-5 13 4-2 6 2 5 6 6-3 6-12 0-19Z" fill="${eye}" opacity=".5"/>` : '';

  const rageFlames = rage ? `
    <path d="M70 12c-8 18-24 22-20 42-10-5-13-17-10-28-9 10-13 27-4 41 10 16 34 16 44 0 9-15 5-34-10-55Z" fill="${color}" opacity=".32"/>
    <path d="M70 30c-4 9-11 12-9 21 6-3 9 3 8 9 9-5 8-19 1-30Z" fill="${eye}" opacity=".55"/>` : '';

  const archerProps = isArcher ? `
    <path d="M108 58c18 18 18 48 0 66" stroke="${p.trim || '#ffd166'}" stroke-width="2.4" fill="none" opacity=".75"/>
    <path d="M108 58c-6 18-6 48 0 66" stroke="${scarf}" stroke-width="1" fill="none" opacity=".45"/>
    <path d="M104 48c-2-10 4-18 12-22-2 10-4 16-12 22Z" fill="${scarf}" opacity=".8"/>
    <path d="M104 48c2-8 6-13 12-16" stroke="${eye}" stroke-width="1" opacity=".55"/>` : '';
  const wizardProps = isWizard ? `
    <circle cx="70" cy="64" r="44" stroke="${color}" stroke-opacity=".18" stroke-width="1.2" stroke-dasharray="2 5"/>
    <path d="M42 118c-14 8-22 22-26 38 14-6 28-16 38-30Z" fill="${scarf}" opacity=".35"/>
    <path d="M98 118c14 8 22 22 26 38-14-6-28-16-38-30Z" fill="${scarf}" opacity=".35"/>` : '';

  const headgear = isMira ? `
    <path d="M40 74c0-28 13-46 30-46s30 18 30 46c-10 6-50 6-60 0Z" fill="${hood}" stroke="${p.trim || '#ffd166'}" stroke-width="1.6"/>
    <path d="M38 64 18 40l8 30 14 4M102 64l20-24-8 30-14 4" fill="${p.trim || '#ffd166'}" opacity=".85"/>
    <path d="M54 74h32v7H54Z" fill="#071018"/>
    <path d="M62 44h16M70 34v20" stroke="${p.trim || '#ffd166'}" stroke-width="1.4" opacity=".7"/>` :
    isRen ? `
    <path d="M70 8 26 58h88Z" fill="${scarf}" stroke="${p.trim || '#ffd166'}" stroke-width="1.4"/>
    <path d="M18 58h104" stroke="${p.trim || '#ffd166'}" stroke-width="3"/>
    <path d="M56 72h28v6H56Z" fill="#0c0504"/>
    <path d="M56 34c8-6 20-6 28 0" stroke="${eye}" stroke-width="1" opacity=".45"/>` :
    isSora ? `
    <path d="M32 72c2-28 18-44 38-44s36 16 38 44c-7 9-20 13-38 13s-31-4-38-13Z" fill="${cloak2}" stroke="${p.trim || '#e0c080'}" stroke-width="1.1"/>
    <path d="M41 58c-4-14 2-24 10-30M99 58c4-14-2-24-10-30" stroke="${color}" stroke-width="1.4" opacity=".55"/>
    <path d="M48 76c12-5 32-5 44 0v6c-14-4-30-4-44 0Z" fill="#0a0610"/>
    <path d="M104 66c12 6 16 16 20 28-12-4-22-12-28-22Z" fill="${scarf}" opacity=".45"/>` :
    isWizard ? `
    <path d="M70 6 48 60h44Z" fill="${scarf}" stroke="${p.trim || color}" stroke-width="1.4"/>
    <path d="M46 60h48" stroke="${p.trim || color}" stroke-width="3"/>
    <path d="M62 34h16M70 24v20" stroke="${eye}" stroke-opacity=".7" stroke-width="1.4"/>
    <circle cx="70" cy="18" r="2" fill="${eye}"/>` :
    isArcher ? `
    <path d="M54 32c-8-6-10-14-6-22 8 4 12 10 12 18Z" fill="${scarf}" opacity=".85"/>
    <path d="M54 32c-4-6-5-11-4-16" stroke="${eye}" stroke-width="1" opacity=".5"/>` : '';

  const outfit = isMira ? `
    <path d="M50 112h40l-5 24H55Z" fill="#1a1008" stroke="${p.trim || '#ffd166'}" stroke-width="1" opacity=".8"/>
    <path d="M54 120h32M58 128h24" stroke="${p.trim || '#ffd166'}" stroke-width="1.2" opacity=".6"/>
    <path d="M86 104l22-18-3 18-14 12Z" fill="${scarf}" opacity=".25"/>` :
    isRen ? `
    <path d="M38 112c-10 20-14 34-16 48 14-8 26-20 34-40Z" fill="${scarf}" opacity=".4"/>
    <path d="M102 112c10 20 14 34 16 48-14-8-26-20-34-40Z" fill="${scarf}" opacity=".4"/>
    <path d="M52 104c8 8 28 8 36 0" stroke="${eye}" stroke-width="1.2" opacity=".55"/>` :
    isSora ? `
    <path d="M38 116c-14 18-20 34-22 50 12-8 24-20 34-38Z" fill="${scarf}" opacity=".4"/>
    <path d="M102 116c14 18 20 34 22 50-12-8-24-20-34-38Z" fill="${scarf}" opacity=".4"/>
    <path d="M46 110c16 8 32 8 48 0" stroke="${p.trim || '#e0c080'}" stroke-width="2" opacity=".6"/>` :
    isArcher ? `
    <path d="M94 106 112 98l6 16-16 12Z" fill="${hood}" stroke="${scarf}" stroke-width="1"/>
    <path d="M101 101l8-20M107 101l10-16M113 103l12-12" stroke="${p.trim || '#ffd166'}" stroke-width="1.4"/>
    <path d="M42 110c-10 8-16 20-18 32 10-6 18-16 24-26Z" fill="${scarf}" opacity=".4"/>` :
    isWizard ? `
    <path d="M42 116c-12 14-18 28-20 44 12-8 24-20 32-36Z" fill="${scarf}" opacity=".35"/>
    <path d="M98 116c12 14 18 28 20 44-12-8-24-20-32-36Z" fill="${scarf}" opacity=".35"/>
    <path d="M50 116l4 4 4-4 4 4 4-4 4 4 4-4" stroke="${p.trim || '#ffd166'}" stroke-width="1.2" opacity=".7"/>` : '';


  return `<svg class="hero-portrait ${cls}" width="${size}" height="${Math.round(size * 1.2)}" viewBox="0 0 140 168" fill="none" aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id="hp-${uid}" cx="50%" cy="42%" r="55%">
        <stop offset="0" stop-color="${color}" stop-opacity="${rage ? 0.45 : 0.24}"/>
        <stop offset="1" stop-color="${color}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="hc-${uid}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${cloak2}"/>
        <stop offset="1" stop-color="${cloak}"/>
      </linearGradient>
    </defs>
    <ellipse cx="70" cy="88" rx="60" ry="70" fill="url(#hp-${uid})"/>
    <circle cx="70" cy="76" r="58" stroke="${color}" stroke-opacity="${rage ? 0.35 : 0.15}" stroke-width="1.5"/>
    ${rageFlames}
    ${archerProps}
    ${wizardProps}
    <path d="M28 160c2-40 18-58 42-62h0c24 4 40 22 42 62Z" fill="url(#hc-${uid})" stroke="${p.trim || color}" stroke-opacity=".28" stroke-width="1.2"/>
    ${soraRibbons}
    ${shoulders}
    ${outfit}
    <path d="M46 76c-2-28 8-44 24-46 16 2 26 18 24 46-10 12-38 12-48 0Z" fill="${hood}"/>
    ${headgear}
    <path d="M50 80c0-22 7-36 20-38 13 2 20 16 20 38-8 9-32 9-40 0Z" fill="${cloak2}" opacity=".85"/>
    <ellipse cx="70" cy="78" rx="16" ry="18" fill="#071018"/>
    <path d="M53 76c6-5 28-5 34 0v8c-10-4-24-4-34 0Z" fill="#03080d"/>
    <path d="M58 77 68 79 65 85 55 82Z" fill="${eye}"/>
    <path d="M82 77 72 79 75 85 85 82Z" fill="${eye}"/>
    <path d="M56 94c9 4 19 4 28 0" stroke="${cloak}" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M46 76c-2-28 8-44 24-46 16 2 26 18 24 46" stroke="${p.trim || color}" stroke-opacity=".4" stroke-width="1.3"/>
    <path d="M70 33l2.5 4.5-2.5 4.5-2.5-4.5Z" fill="${p.trim || '#ffc857'}"/>
    ${isMira ? `<path d="M32 104c8-8 18-10 26-6M108 104c-8-8-18-10-26-6" stroke="${p.trim || '#ffd166'}" stroke-width="2" opacity=".7"/>` : ''}
    ${isSora ? `<path d="M42 58c-8-8-10-18-6-26M98 58c8-8 10-18 6-26" stroke="${color}" stroke-width="1.4" stroke-opacity=".55"/>` : ''}
    ${isRen ? `<path d="M42 70c-6-12-2-24 8-32" stroke="${scarf}" stroke-width="1.5" stroke-opacity=".6"/>` : ''}
    ${stage ? portraitWeaponRig(hero, {
      color, scarf, trim: p.trim || '#ffc857', hood, cloak2, animate,
    }) : ''}
  </svg>`;
}

/* Held weapon rig used by the character-select showcase. The grip is the
   origin of every weapon, so the hand, arm, and swing animation line up. */
function portraitWeaponRig(hero, o) {
  const { color, scarf, trim, hood, cloak2, animate } = o;
  const swings = {
    kaito: { values: '-8; 42; 8; -8', keys: '0;.32;.68;1', dur: '3.6s' },
    mira: { values: '-4; 24; -2; -4', keys: '0;.35;.7;1', dur: '4.2s' },
    ren: { values: '-12; 30; 6; -12', keys: '0;.34;.7;1', dur: '3.9s' },
    sora: { values: '-12; 22; -20; -12', keys: '0;.32;.68;1', dur: '3.4s' },
    yuki: { values: '-5; 3; -5', keys: '0;.5;1', dur: '3.2s' },
    aster: { values: '-8; 10; -8', keys: '0;.5;1', dur: '4.4s' },
  };
  const swing = swings[hero.id] || swings.kaito;
  const swingAnim = animate
    ? `<animateTransform attributeName="transform" type="rotate" values="${swing.values}" keyTimes="${swing.keys}" dur="${swing.dur}" repeatCount="indefinite"/>`
    : '';

  let weapon = '';
  if (hero.id === 'mira') {
    weapon = `
      <path d="M0 0H25" stroke="#24170c" stroke-width="5.6" stroke-linecap="round"/>
      <path d="M1 0H24" stroke="#7a4a24" stroke-width="3.2"/>
      <path d="M5-3 7 3M11-3 13 3M17-3 19 3" stroke="${trim}" stroke-width="1" opacity=".8"/>
      <circle cx="0" cy="0" r="2.8" fill="${trim}"/>
      <path d="M24-13 36-10 40-4 40 4 36 10 24 13Z" fill="${color}" fill-opacity=".72" stroke="#1a0f06" stroke-width="1.5"/>
      <path d="M30-11V11" stroke="${trim}" stroke-width="2.4"/>
      <path d="M25-7 35-5M25 7 35 5" stroke="${trim}" stroke-width=".9" opacity=".8"/>
      <circle cx="30" cy="-7" r="1.2" fill="#fff3c4"/><circle cx="30" cy="0" r="1.2" fill="${trim}"/><circle cx="30" cy="7" r="1.2" fill="#fff3c4"/>
    `;
  } else if (hero.id === 'ren') {
    weapon = `
      <path d="M0 0 16-1" stroke="#24120a" stroke-width="3.4" stroke-linecap="round"/>
      <path d="M2 0 15-1" stroke="${trim}" stroke-width="1" opacity=".85"/>
      <circle cx="0" cy="0" r="2.6" fill="${trim}"/>
      <path d="M17 0A22 22 0 0 1 34-20 22 22 0 0 1 39 0 22 22 0 0 1 34 20 22 22 0 0 1 17 0Z" fill="${scarf}" fill-opacity=".42" stroke="${trim}" stroke-width="1.4"/>
      <path d="M18 0 38-19M18 0 41 0M18 0 38 19M18 0 29-14M18 0 29 14M18 0 21-17M18 0 21 17" stroke="${color}" stroke-width=".9" opacity=".75"/>
      <circle cx="18" cy="0" r="2.6" fill="${trim}"/>
      <path d="M18 3 15 12" stroke="${trim}" stroke-width=".8"/><circle cx="15" cy="13" r="1.5" fill="${trim}"/>
    `;
  } else if (hero.id === 'sora') {
    weapon = `
      <path d="M0 0H10" stroke="#2a1944" stroke-width="4.2" stroke-linecap="round"/>
      <path d="M1 0H9" stroke="${trim}" stroke-width="1.7" opacity=".9"/>
      <path d="M3-2 5 2M7-2 9 2" stroke="#f0e8ff" stroke-width=".7" opacity=".6"/>
      <circle cx="10" cy="0" r="2.8" fill="${trim}"/>
      <path d="M10 0C17-13 27 13 37 3" stroke="${color}" stroke-width="4" opacity=".45" stroke-linecap="round"/>
      <path d="M10 0C17-11 26 11 36 3" stroke="${scarf}" stroke-width="1.7" stroke-linecap="round"/>
      <path d="M10 0C17-9 24 9 34 3" stroke="#f0e8ff" stroke-width=".6" opacity=".8"/>
      <path d="M36 3 42 6 38 10Z" fill="#f0e8ff" stroke="${trim}" stroke-width=".5"/>
    `;
  } else if (hero.id === 'yuki') {
    weapon = `
      <path d="M5-23C17-13 17-7 11 0 17 7 17 13 5 23" stroke="#061a13" stroke-width="4.4" fill="none" stroke-linecap="round"/>
      <path d="M5-23C16-13 16-7 10 0 16 7 16 13 5 23" stroke="${color}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <path d="M5-23 2-21M5 23 2 21" stroke="${trim}" stroke-width="1.5"/>
      <path d="M5-22 5 22" stroke="${scarf}" stroke-width=".9" opacity=".8"/>
      <path d="M5 0H33" stroke="${trim}" stroke-width="1.1"/>
      <g>
        ${animate ? '<animateTransform attributeName="transform" type="translate" values="0 0;8 0;0 0" dur="3.2s" repeatCount="indefinite"/>' : ''}
        <path d="M5 0H38" stroke="${color}" stroke-width="1.7"/>
        <path d="M34-3 40 0 34 3Z" fill="${trim}"/>
        <path d="M10 0 6-3M10 0 6 3" stroke="${trim}" stroke-width="1.1"/>
      </g>
      <path d="M3-6H9M3 6H9" stroke="${trim}" stroke-width="2"/>
    `;
  } else if (hero.id === 'aster') {
    const ox = 31;
    weapon = `
      <path d="M0 0 27-2" stroke="#0b1528" stroke-width="4.4" stroke-linecap="round"/>
      <path d="M1 0 26-2" stroke="${color}" stroke-width="2" opacity=".9"/>
      <path d="M7-3 7 1M13-2 13 2M19-2 19 2" stroke="${trim}" stroke-width="1" opacity=".8"/>
      <path d="M25-1C26-8 29-12 33-12M25-1C26 6 29 10 33 10" stroke="${trim}" stroke-width="1.5" fill="none"/>
      <g>
        ${animate ? `<animateTransform attributeName="transform" type="rotate" from="0 ${ox} -1" to="360 ${ox} -1" dur="9s" repeatCount="indefinite"/>` : ''}
        <circle cx="${ox}" cy="-1" r="6" fill="${color}" fill-opacity=".65" stroke="${trim}" stroke-width="1.2"/>
        <circle cx="${ox}" cy="-1" r="2" fill="#f4eaff"/>
        <circle cx="${ox}" cy="-1" r="10" stroke="${trim}" stroke-width=".8" stroke-dasharray="2 3" opacity=".8"/>
      </g>
    `;
  } else {
    weapon = `
      <path d="M0 0 7-3" stroke="#061018" stroke-width="3.8" stroke-linecap="round"/>
      <path d="M1 0 6-2" stroke="${trim}" stroke-width="1.6"/>
      <path d="M3-3 5-1M5-3 7-1" stroke="#f0e8ff" stroke-width=".7" opacity=".6"/>
      <ellipse cx="7" cy="-2" rx="2.2" ry="5" fill="${trim}" stroke="#061018" stroke-width=".7"/>
      <path d="M7-3 36-24" stroke="#061018" stroke-width="5" stroke-linecap="round"/>
      <path d="M8-3 36-24" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M9-4 35-24" stroke="#ffffff" stroke-width=".9" opacity=".85"/>
      <circle cx="0" cy="0" r="2.6" fill="${trim}" stroke="#061018" stroke-width=".8"/>
    `;
  }

  return `<g class="portrait-weapon-rig">
    <path d="M82 108Q90 113 98 120" stroke="${cloak2}" stroke-width="7.4" stroke-linecap="round"/>
    <path d="M82 108Q90 113 98 120" stroke="${trim}" stroke-width="1" stroke-opacity=".4"/>
    <g transform="translate(98 120)">
      <g class="portrait-swing">
        ${swingAnim}
        ${weapon}
      </g>
      <circle cx="0" cy="0" r="4.8" fill="${trim}" stroke="${hood}" stroke-width="1.1"/>
      <path d="M-3-1.4H3M-3 1.5H3" stroke="${hood}" stroke-width=".7" opacity=".8"/>
      <path d="M4.6-1.2 6.6 0 4.4 1.2" stroke="${hood}" stroke-width=".7" opacity=".7" fill="none"/>
    </g>
  </g>`;
}

/* ============================================================
   SKILL ART — full illustrated button face
   ============================================================ */

export function skillArt(sk, size = 64) {
  const [bg, mid, hi] = ELEMENT[sk.element] || ELEMENT.storm;
  const uid = `${sk.id}-art`;
  const ico = PATHS[sk.icon] || PATHS.spark;
  const rays = sk.type === 'aoe' || sk.type === 'beam'
    ? `<path d="M32 2v9M32 53v9M2 32h9M53 32h9M10 10l6 6M48 48l6 6M54 10l-6 6M16 48l-6 6" stroke="${mid}" stroke-opacity=".45" stroke-width="1.4"/>`
    : '';
  return `<svg class="skill-art" width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id="sg-${uid}" cx="50%" cy="38%" r="65%">
        <stop offset="0" stop-color="${mid}" stop-opacity=".55"/>
        <stop offset=".55" stop-color="${bg}" stop-opacity=".9"/>
        <stop offset="1" stop-color="#04080d"/>
      </radialGradient>
      <linearGradient id="sl-${uid}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${hi}" stop-opacity=".9"/>
        <stop offset="1" stop-color="${mid}" stop-opacity=".15"/>
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="29" fill="url(#sg-${uid})" stroke="${mid}" stroke-opacity=".5" stroke-width="1.2"/>
    <circle cx="32" cy="32" r="23" stroke="${mid}" stroke-opacity=".22" stroke-width="1" stroke-dasharray="3 5"/>
    ${rays}
    <path d="M8 47c10-4 16-2 24 4" stroke="${mid}" stroke-opacity=".25" stroke-width="2"/>
    <path d="M56 17c-10 4-16 2-24-4" stroke="${mid}" stroke-opacity=".25" stroke-width="2"/>
    <g transform="translate(14 14) scale(1.5)" stroke="${hi}" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round">${ico}</g>
  </svg>`;
}

/* ============================================================
   BLADE ART
   ============================================================ */

export function bladeArt(blade, powerRank = 0, size = 64) {
  const b = blade || { edge: '#dff9ff', glow: '#39d7ff', hilt: '#ffc857', shape: 'katana' };
  const uid = `bl-${b.id || 'x'}-${powerRank}`;
  const rank = Math.min(12, Math.max(0, powerRank));
  const runes = rank >= 9
    ? `<path d="M38 22l4 4-4 4M46 30l3 3-3 3" stroke="${b.glow}" stroke-opacity=".7" stroke-width="1.2"/>`
    : '';
  const shape = b.shape === 'cleaver'
    ? `<path d="M30 54 44 16l10 5-7 30Z" fill="${b.edge}" opacity=".9"/><path d="M43 20l8 4" stroke="${b.glow}" stroke-width="2"/>`
    : b.shape === 'curve'
      ? `<path d="M30 54C44 40 50 26 48 14c4 12 1 28-10 42Z" fill="${b.edge}" opacity=".9"/><path d="M32 52c8-10 13-22 14-33" stroke="${b.glow}" stroke-width="1.6"/>`
      : b.shape === 'needle'
        ? `<path d="M32 56 44 10l3 2-8 44Z" fill="${b.edge}" opacity=".95"/><path d="M44 13l2 1" stroke="${b.glow}" stroke-width="2"/>`
        : `<path d="M32 56 44 12l4 2-9 42Z" fill="${b.edge}" opacity=".95"/><path d="M34 52 44 15" stroke="${b.glow}" stroke-width="1.7"/>`;
  return `<svg class="blade-art" width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="bg-${uid}" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stop-color="${b.edge}" stop-opacity=".35"/>
        <stop offset="1" stop-color="${b.glow}" stop-opacity=".9"/>
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="28" fill="${b.glow}" opacity=".08"/>
    ${runes}
    ${shape}
    <rect x="26" y="50" width="12" height="4" rx="1" fill="${b.hilt}"/>
    <rect x="29" y="54" width="6" height="7" rx="2" fill="#3a2412"/>
    <path d="M28 10c3-4 6-4 9 0" stroke="${b.glow}" stroke-opacity=".35" stroke-width="1.2"/>
  </svg>`;
}

/* ============================================================
   WEAPON ART — stage badge
   ============================================================ */

export function weaponArt(heroId, color = '#39d7ff', size = 40) {
  const common = `width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false" class="weapon-art"`;
  if (heroId === 'mira') {
    return `<svg ${common}>
      <path d="M22 44 30 16" stroke="${color}" stroke-width="3.4" stroke-linecap="round"/>
      <path d="M24 16h20l-2 16H26Z" fill="${color}" opacity=".55" stroke="${color}" stroke-width="1.4"/>
      <path d="M30 20v8M38 20v8" stroke="#fff" stroke-opacity=".7" stroke-width="1"/>
    </svg>`;
  }
  if (heroId === 'ren') {
    return `<svg ${common}>
      <path d="M10 38 22 10" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
      <path d="M22 10c10 2 16 10 18 20-9-2-15-8-18-20Z" fill="${color}" opacity=".45" stroke="${color}" stroke-width="1.3"/>
      <path d="M23 14 38 27M24 19l14 6M28 14l9 8" stroke="#ffd166" stroke-width="1.2"/>
    </svg>`;
  }
  if (heroId === 'sora') {
    return `<svg ${common}>
      <path d="M8 34c12-18 22-20 32-8-10 2-15 10-24 12" stroke="${color}" stroke-width="2.8" stroke-linecap="round"/>
      <path d="M39 27l5 5-7 2" fill="${color}"/>
      <circle cx="10" cy="35" r="3" stroke="${color}" stroke-width="1.2"/>
    </svg>`;
  }
  if (heroId === 'yuki') {
    return `<svg ${common}>
      <path d="M15 6c16 10 16 26 0 36" stroke="${color}" stroke-width="2.6" fill="none"/>
      <path d="M15 6v36" stroke="${color}" stroke-opacity=".5" stroke-width="1"/>
      <path d="M8 24h33M37 19l5 5-5 5" stroke="#ffd166" stroke-width="1.6"/>
    </svg>`;
  }
  if (heroId === 'aster') {
    return `<svg ${common}>
      <path d="M12 40 32 10" stroke="#0b1528" stroke-width="4" stroke-linecap="round"/>
      <path d="M13 39 32 10" stroke="${color}" stroke-width="1.6"/>
      <path d="M23 14 20 18M27 11 24 15" stroke="#ffd166" stroke-width="1.3"/>
      <circle cx="34" cy="10" r="6" fill="${color}" opacity=".55" stroke="#ffd166" stroke-width="1.2"/>
      <circle cx="34" cy="10" r="2" fill="#fff"/>
      <circle cx="34" cy="10" r="10" stroke="${color}" stroke-opacity=".55" stroke-dasharray="2 3"/>
    </svg>`;
  }
  return `<svg ${common}>
    <path d="M10 38 36 8" stroke="${color}" stroke-width="4" stroke-linecap="round"/>
    <path d="M11 37 37 7" stroke="#fff" stroke-opacity=".8" stroke-width="1.3"/>
    <path d="M9 40l5-2-3-3-2 5Z" fill="#ffd166"/>
    <path d="M17 31l4 4" stroke="#ffd166" stroke-width="3"/>
  </svg>`;
}

/* ============================================================
   ATTRIBUTE CARD ART — changes visibly with every star
   ============================================================ */

export function statArt(attrId, rank = 0, color = '#39d7ff', size = 104) {
  const r = Math.max(0, Math.min(12, rank));
  const uid = `${attrId}-${r}`;
  const tier = Math.floor(r / 3);
  const extra = r % 3;
  const glow = 0.18 + r * 0.045;
  const lines = [];
  for (let i = 0; i < 6 + r; i++) {
    const a = (i / (6 + r)) * Math.PI * 2 + r * 0.13;
    const inner = 34 + (i % 3) * 3;
    const outer = 43 + tier * 2 + (i % 2) * 3;
    lines.push(`<path d="M${52 + Math.cos(a) * inner} ${54 + Math.sin(a) * inner}L${52 + Math.cos(a) * outer} ${54 + Math.sin(a) * outer}" stroke="${color}" stroke-opacity="${0.12 + extra * 0.05}" stroke-width="1.4"/>`);
  }
  let subject = '';
  if (attrId === 'power') {
    subject = `<path d="M38 74 65 30l5 4-22 48Z" fill="${color}" opacity=".85"/><path d="M41 72 65 34" stroke="#fff" stroke-opacity=".7" stroke-width="1.4"/><rect x="31" y="72" width="18" height="4" rx="1" fill="#ffc857"/>`;
  } else if (attrId === 'vitality') {
    subject = `<path d="M52 84S28 69 28 49c0-11 8-17 17-17 5 0 9 3 11 7 2-4 6-7 11-7 9 0 17 6 17 17 0 20-24 35-24 35Z" fill="${color}" opacity=".8"/><path d="M40 52h8l3-6 5 16 4-10h6" stroke="#fff" stroke-opacity=".8" stroke-width="2" fill="none"/>`;
  } else if (attrId === 'agility') {
    subject = `<path d="M26 58h26c10 0 16-6 22-18l4 4-7 15c-7 13-16 19-30 19H26Z" fill="${color}" opacity=".8"/><path d="M25 72h34M58 42l10 3" stroke="#fff" stroke-opacity=".7" stroke-width="1.6"/>`;
  } else if (attrId === 'focus') {
    subject = `<path d="M22 54s12-20 30-20 30 20 30 20-12 20-30 20-30-20-30-20Z" fill="${color}" opacity=".35"/><circle cx="52" cy="54" r="11" fill="${color}" opacity=".8"/><circle cx="52" cy="54" r="4" fill="#fff" opacity=".8"/>`;
  } else {
    subject = `<path d="M52 24 30 35v17c0 14 9 23 22 28 13-5 22-14 22-28V35Z" fill="${color}" opacity=".55"/><path d="M39 52h8l4-10 5 20 4-10h6" stroke="#fff" stroke-opacity=".8" stroke-width="2" fill="none"/>`;
  }
  return `<svg class="stat-art" width="${size}" height="${size}" viewBox="0 0 104 104" fill="none" aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id="sa-${uid}" cx="50%" cy="48%" r="55%">
        <stop offset="0" stop-color="${color}" stop-opacity="${glow + 0.12}"/>
        <stop offset="1" stop-color="${color}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="52" cy="54" r="46" fill="url(#sa-${uid})"/>
    <circle cx="52" cy="54" r="38" stroke="${color}" stroke-opacity="${0.2 + r * 0.02}" stroke-width="1.4"/>
    <circle cx="52" cy="54" r="${30 + tier * 2}" stroke="${color}" stroke-opacity=".18" stroke-width="1" stroke-dasharray="2 5"/>
    ${lines.join('')}
    ${subject}
  </svg>`;
}
