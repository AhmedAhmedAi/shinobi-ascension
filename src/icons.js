/* ============================================================
   SHINOBI ASCENSION — original vector icon set.
   Inline SVG, no external assets.
   ============================================================ */

const PATHS = {
  dash: `
    <path d="M2 8h10M2 12h14M2 16h10" stroke-width="2"/>
    <path d="M15 6l5 6-5 6"/>
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
  heal: `
    <circle cx="12" cy="12" r="9"/>
    <path d="M12 8v8M8 12h8"/>
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
  coin: `
    <circle cx="12" cy="12" r="8"/>
    <path d="m12 7 4 5-4 5-4-5 4-5Z"/>
  `,
  lock: `
    <rect x="4" y="10" width="16" height="11" rx="2"/>
    <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>
  `,
};

export function icon(name, size = 24, className = '') {
  const body = PATHS[name] || PATHS.spark;
  return `<svg class="icon ${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}
