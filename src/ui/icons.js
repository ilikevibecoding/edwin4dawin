/**
 * UI ICON FOUNDRY — Northstar Rescue
 * Owner: Fable 1 (art direction, visual bible & interface).
 *
 * Every glyph is generated as inline SVG markup: no image files, no icon
 * fonts, no emoji, zero network requests. All icons share one construction
 * grid (32×32 for glyphs, 48×24 for weapon silhouettes), a 2.4 px stroke
 * weight and `currentColor`, so they recolour with the surrounding text.
 */

import { reg, OWNERS } from '../core/assets.js';

const S = 'fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';
const SF = 'fill="currentColor"';

/* ------------------------------------------------------------------ */
/* Glyph library                                                       */
/* ------------------------------------------------------------------ */

export const ICONS = {
  /* --- vitals / status ------------------------------------------- */
  health: {
    vb: '0 0 32 32',
    body: `<path ${SF} d="M13 5h6a1 1 0 0 1 1 1v6h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-6v6a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-6H6a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h6V6a1 1 0 0 1 1-1z"/>`,
  },
  armor: {
    vb: '0 0 32 32',
    body: `<path ${SF} fill-rule="evenodd" d="M16 3l10.5 3.8V15c0 6.8-4.3 11.4-10.5 14C9.8 26.4 5.5 21.8 5.5 15V6.8L16 3zm0 3.2L8.5 8.9V15c0 5.2 3 8.9 7.5 11.1 4.5-2.2 7.5-5.9 7.5-11.1V8.9L16 6.2z"/><path ${SF} d="M16 8.4l5 1.8V15c0 3.7-2 6.4-5 8.2V8.4z"/>`,
  },
  ammo: {
    vb: '0 0 32 32',
    body: `<path ${SF} d="M16 2.6c2.9 1.2 4.6 3.5 4.6 6.6H11.4c0-3.1 1.7-5.4 4.6-6.6z"/><rect ${SF} x="11.4" y="10.6" width="9.2" height="12.4" rx="0.8"/><rect ${SF} x="10" y="24.6" width="12" height="4.4" rx="0.9"/>`,
  },
  check: {
    vb: '0 0 32 32',
    body: `<path ${S} d="M6 17.5l6.5 6.5L26 8.5"/>`,
  },
  alert: {
    vb: '0 0 32 32',
    body: `<path ${S} d="M16 4.5L29.5 27.5H2.5z"/><path ${SF} d="M14.6 12h2.8l-.5 8h-1.8zM16 22.4a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6z"/>`,
  },
  skull: {
    vb: '0 0 32 32',
    body: `<path ${SF} fill-rule="evenodd" d="M16 3.5c5.8 0 10.4 4.4 10.4 10.2 0 3.4-1.6 5.8-3.6 7.4v4.3c0 .8-.6 1.4-1.4 1.4h-1.2v2h-2.6v-2h-3.2v2h-2.6v-2h-1.2c-.8 0-1.4-.6-1.4-1.4v-4.3c-2-1.6-3.6-4-3.6-7.4C5.6 7.9 10.2 3.5 16 3.5zm-4.4 8.3a2.9 2.9 0 1 0 0 5.8 2.9 2.9 0 0 0 0-5.8zm8.8 0a2.9 2.9 0 1 0 0 5.8 2.9 2.9 0 0 0 0-5.8zM16 18.6l1.8 3.4h-3.6z"/>`,
  },
  star: {
    vb: '0 0 32 32',
    body: `<path ${SF} d="M16 1.5l3.1 11.4L30.5 16l-11.4 3.1L16 30.5l-3.1-11.4L1.5 16l11.4-3.1z"/>`,
  },
  timer: {
    vb: '0 0 32 32',
    body: `<circle ${S} cx="16" cy="18" r="10"/><path ${S} d="M16 12v6.4l4.4 3M13 3h6M16 3v4.5"/>`,
  },
  footstep: {
    vb: '0 0 32 32',
    body: `<ellipse ${SF} cx="10.5" cy="9" rx="4" ry="6"/><ellipse ${SF} cx="10.8" cy="19.2" rx="2.5" ry="3"/><ellipse ${SF} cx="21.5" cy="14" rx="4" ry="6"/><ellipse ${SF} cx="21.2" cy="24.2" rx="2.5" ry="3"/>`,
  },
  hostage: {
    vb: '0 0 32 32',
    body: `<circle ${SF} cx="16" cy="8" r="4.4"/><path ${SF} d="M16 14.4c-5.8 0-9.4 3.4-9.4 8.6v5.5h18.8V23c0-5.2-3.6-8.6-9.4-8.6z"/>`,
  },
  objective: {
    vb: '0 0 32 32',
    body: `<path ${SF} fill-rule="evenodd" d="M16 2.5L29.5 16 16 29.5 2.5 16 16 2.5zm0 5.4L7.9 16l8.1 8.1 8.1-8.1L16 7.9z"/><circle ${SF} cx="16" cy="16" r="2.6"/>`,
  },
  extraction: {
    vb: '0 0 32 32',
    body: `<path ${SF} d="M16 2.5l8 9.5h-4.6v8.6h-6.8V12H8z"/><path ${S} d="M4.5 20v8h23v-8"/>`,
  },
  door: {
    vb: '0 0 32 32',
    body: `<path ${S} d="M6 28.5V4.5h15"/><path ${SF} d="M21 4.5l7 2.4v21.6l-7-1.4V4.5z"/><circle cx="23.4" cy="16" r="1.4" fill="#0b1420"/><path ${S} d="M3 28.5h11"/>`,
  },
  key: {
    vb: '0 0 32 32',
    body: `<rect ${S} x="4" y="6" width="24" height="20" rx="4"/><path ${S} d="M10 21.5h12"/>`,
  },
  /* --- utility / weapons glyph size ------------------------------- */
  flash: {
    vb: '0 0 32 32',
    body: `<circle ${SF} cx="16" cy="16" r="4.6"/><path ${S} d="M16 3.5v5M16 23.5v5M3.5 16h5M23.5 16h5M7.2 7.2l3.5 3.5M21.3 21.3l3.5 3.5M24.8 7.2l-3.5 3.5M10.7 21.3l-3.5 3.5"/>`,
  },
  smoke: {
    vb: '0 0 32 32',
    body: `<rect ${SF} x="11.5" y="13" width="9" height="15.5" rx="2"/><rect ${SF} x="13.5" y="9.5" width="5" height="3"/><circle ${SF} cx="9" cy="7.5" r="3"/><circle ${SF} cx="16" cy="4.8" r="3.8"/><circle ${SF} cx="23" cy="7.5" r="3"/>`,
  },
  /* --- crosshair previews ----------------------------------------- */
  'crosshair-dynamic': {
    vb: '0 0 32 32',
    body: `<path ${S} d="M16 3v7M16 22v7M3 16h7M22 16h7"/><circle ${SF} cx="16" cy="16" r="1.6"/>`,
  },
  'crosshair-cross': {
    vb: '0 0 32 32',
    body: `<path ${S} d="M16 5v22M5 16h22"/>`,
  },
  'crosshair-dot': {
    vb: '0 0 32 32',
    body: `<circle ${SF} cx="16" cy="16" r="3"/>`,
  },
  'crosshair-none': {
    vb: '0 0 32 32',
    body: `<circle ${S} cx="16" cy="16" r="10.5"/><path ${S} d="M8.6 23.4L23.4 8.6"/>`,
  },
  /* --- settings category glyphs ----------------------------------- */
  audio: {
    vb: '0 0 32 32',
    body: `<path ${SF} d="M5 12h5.5L18 5v22l-7.5-7H5z"/><path ${S} d="M22 11.5a6.4 6.4 0 0 1 0 9M25.5 8a11 11 0 0 1 0 16"/>`,
  },
  graphics: {
    vb: '0 0 32 32',
    body: `<rect ${S} x="3.5" y="5.5" width="25" height="16.5" rx="2"/><path ${S} d="M12 27h8M16 22.5V27M7.5 17.5l4.5-5 3.5 3.5 5-6 4 5"/>`,
  },
  mouse: {
    vb: '0 0 32 32',
    body: `<rect ${S} x="9.5" y="3.5" width="13" height="25" rx="6.5"/><path ${S} d="M16 3.5v7"/><rect ${SF} x="14.6" y="8" width="2.8" height="5" rx="1.4"/>`,
  },
  keyboard: {
    vb: '0 0 32 32',
    body: `<rect ${S} x="2.5" y="9" width="27" height="14.5" rx="2"/><path ${SF} d="M6.5 13h3v2.6h-3zM12 13h3v2.6h-3zM17.5 13h3v2.6h-3zM23 13h3v2.6h-3zM6.5 18h3v2.6h-3zM23 18h3v2.6h-3zM12 18h8.5v2.6H12z"/>`,
  },
  access: {
    vb: '0 0 32 32',
    body: `<circle ${S} cx="16" cy="16" r="13"/><circle ${SF} cx="16" cy="8.6" r="2.6"/><path ${SF} d="M8 12.2l6.2 1.1v4.4l-2.4 7 2.3.8 2.4-6.4 2.4 6.4 2.3-.8-2.4-7v-4.4l6.2-1.1-.4-2.2-7.6 1h-1l-7.6-1z"/>`,
  },
  gear: {
    vb: '0 0 32 32',
    body: `<path ${SF} fill-rule="evenodd" d="M13.6 2.8h4.8l.7 3.4c.8.3 1.6.7 2.3 1.2l3.3-1.2 2.4 4.2-2.6 2.3a9 9 0 0 1 0 2.6l2.6 2.3-2.4 4.2-3.3-1.2c-.7.5-1.5.9-2.3 1.2l-.7 3.4h-4.8l-.7-3.4a9.6 9.6 0 0 1-2.3-1.2l-3.3 1.2-2.4-4.2 2.6-2.3a9 9 0 0 1 0-2.6l-2.6-2.3 2.4-4.2 3.3 1.2c.7-.5 1.5-.9 2.3-1.2l.7-3.4zM16 11.6a4.4 4.4 0 1 0 0 8.8 4.4 4.4 0 0 0 0-8.8z"/>`,
  },
  /* --- weapon silhouettes (48×24) --------------------------------- */
  pistol: {
    vb: '0 0 48 24',
    body: `<rect ${SF} x="8" y="5.5" width="27" height="5.5" rx="1"/><rect ${SF} x="8" y="3.5" width="3" height="2.5"/><rect ${SF} x="32.5" y="3.8" width="2.5" height="2.2"/><path ${SF} d="M26 11h8.5l-3 10.5h-7.2l1.4-7.2c-3.4-.2-5.6-1.3-6.2-3.3z"/><path ${S} d="M20.5 11v2.4a3 3 0 0 0 3 3h1.2"/>`,
  },
  smg: {
    vb: '0 0 48 24',
    body: `<rect ${SF} x="9" y="7" width="25" height="6" rx="1"/><rect ${SF} x="2.5" y="8.2" width="6.5" height="3.4" rx="1"/><rect ${SF} x="34" y="8.3" width="9" height="3" rx="0.6"/><rect ${SF} x="39" y="5" width="2.2" height="3.3"/><rect ${SF} x="13" y="4.6" width="2.6" height="2.4"/><path ${SF} d="M18.5 13h6l-1.8 8.5h-6z"/><path ${SF} d="M27.5 13h5.5l-2 7h-5z"/>`,
  },
  rifle: {
    vb: '0 0 48 24',
    body: `<rect ${SF} x="11" y="8" width="22" height="5" rx="0.8"/><path ${SF} d="M2.5 8.6L11 8v5.8l-5.5 2.4h-3z"/><rect ${SF} x="33" y="9" width="11.5" height="2.6"/><rect ${SF} x="40.5" y="5.8" width="2" height="3.2"/><rect ${SF} x="15" y="5.2" width="3.4" height="2.8"/><path ${SF} d="M19 13h6l-1.9 8h-6z"/><path ${SF} d="M13 13h4l-1.4 5.4h-3.8z"/>`,
  },
  shotgun: {
    vb: '0 0 48 24',
    body: `<rect ${SF} x="18" y="7.2" width="27.5" height="3" rx="0.7"/><rect ${SF} x="22" y="10.8" width="21" height="2.6" rx="1.3"/><rect ${SF} x="11" y="7.2" width="8" height="6.2" rx="0.8"/><path ${SF} d="M2.5 8L11 7.2v7l-5.5 2.6h-3z"/><rect ${SF} x="26" y="13.8" width="7" height="3.4" rx="1.4"/>`,
  },
  dmr: {
    vb: '0 0 48 24',
    body: `<rect ${SF} x="11" y="9" width="20" height="4.4" rx="0.8"/><rect ${SF} x="31" y="9.8" width="14.5" height="2.4"/><rect ${SF} x="14.5" y="3.6" width="10.5" height="3.4" rx="1.7"/><rect ${SF} x="16.4" y="6.8" width="2" height="2.4"/><rect ${SF} x="21.6" y="6.8" width="2" height="2.4"/><path ${SF} d="M2.5 9.6L11 9v6l-5 3h-3.5z"/><path ${SF} d="M18.5 13.4h5l-1.6 6.4h-5z"/><path ${SF} d="M13 13.4h3.6l-1.2 4.6h-3.5z"/>`,
  },
  knife: {
    vb: '0 0 48 24',
    body: `<path ${SF} d="M2.5 14.5C10 7.5 20 5.5 30.5 7.5l-2.6 7c-9 2.6-18.4 2-25.4 0z"/><rect ${SF} x="29.5" y="7" width="2.6" height="9.5" rx="0.8"/><rect ${SF} x="32.5" y="8.2" width="12" height="6" rx="2.4"/>`,
  },
};

/* Aliases used by weapon defs / hud state. */
ICONS.melee = ICONS.knife;
ICONS.grenade = ICONS.flash;
ICONS.utility = ICONS.flash;

/* ------------------------------------------------------------------ */
/* Factories                                                           */
/* ------------------------------------------------------------------ */

/** SVG markup string for an icon. */
export function iconMarkup(name, { size = 20, cls = '', label = '' } = {}) {
  const def = ICONS[name] ?? ICONS.objective;
  const [, , vw, vh] = def.vb.split(' ').map(Number);
  const h = Math.round((size * vh) / vw);
  const aria = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"';
  return `<svg class="icon ${cls}" width="${size}" height="${h}" viewBox="${def.vb}" ${aria} xmlns="http://www.w3.org/2000/svg">${def.body}</svg>`;
}

/** SVG element for an icon. */
export function icon(name, opts = {}) {
  const tpl = document.createElement('template');
  tpl.innerHTML = iconMarkup(name, opts).trim();
  return tpl.content.firstChild;
}

export function hasIcon(name) {
  return !!ICONS[name];
}

/** Weapon silhouette by the `hudIcon` field in weapon defs. */
export function weaponIcon(hudIcon, opts = {}) {
  return icon(ICONS[hudIcon] ? hudIcon : 'rifle', { size: 44, ...opts });
}

/** Keyboard key cap element, e.g. keycap('E') or keycap('Left Mouse'). */
export function keycap(label) {
  const el = document.createElement('span');
  el.className = 'keycap' + (String(label).length > 2 ? ' keycap-wide' : '');
  el.textContent = label;
  return el;
}

/** Difficulty pips: `filled` of `max` small diamonds. */
export function pips(filled, max = 4) {
  const el = document.createElement('span');
  el.className = 'pips';
  el.setAttribute('aria-label', `difficulty ${filled} of ${max}`);
  for (let i = 0; i < max; i++) {
    const p = document.createElement('span');
    p.className = 'pip' + (i < filled ? ' on' : '');
    el.appendChild(p);
  }
  return el;
}

/**
 * The NORTHSTAR RESCUE title mark: a faceted four-point star with a
 * compass ring, drawn once as SVG. Used on the title screen and loading.
 */
export function titleMark(size = 96) {
  const tpl = document.createElement('template');
  tpl.innerHTML = `
<svg class="title-mark" width="${size}" height="${size}" viewBox="0 0 96 96" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
  <circle cx="48" cy="48" r="44" fill="none" stroke="rgba(127,212,255,0.30)" stroke-width="1.4"/>
  <circle cx="48" cy="48" r="37.5" fill="none" stroke="rgba(127,212,255,0.16)" stroke-width="1" stroke-dasharray="2.5 5"/>
  <g fill="none" stroke="rgba(127,212,255,0.5)" stroke-width="1.4">
    <path d="M48 1.5v7M48 87.5v7M1.5 48h7M87.5 48h7"/>
  </g>
  <path d="M48 12L54.5 41.5 84 48 54.5 54.5 48 84 41.5 54.5 12 48 41.5 41.5Z" fill="#7fd4ff"/>
  <path d="M48 12L54.5 41.5 48 48Z" fill="#d6ecfa"/>
  <path d="M84 48L54.5 54.5 48 48Z" fill="#d6ecfa"/>
  <path d="M48 84L41.5 54.5 48 48Z" fill="#1f6fb2"/>
  <path d="M12 48L41.5 41.5 48 48Z" fill="#1f6fb2"/>
  <circle cx="48" cy="48" r="3.2" fill="#0b1420" stroke="#d6ecfa" stroke-width="1.2"/>
</svg>`.trim();
  return tpl.content.firstChild;
}

/* ------------------------------------------------------------------ */
/* Shared UI preference application                                    */
/* ------------------------------------------------------------------ */

/** Push uiScale / colour-blind mode / motion prefs into the DOM. */
export function applyUiPrefs(settings) {
  try {
    const scale = Number(settings?.get?.('uiScale')) || 1;
    document.documentElement.style.setProperty('--ui-scale', String(scale));
    const cb = settings?.get?.('colorBlindMode') ?? 'off';
    document.body.dataset.colorblind = cb;
    document.body.dataset.reducedMotion = settings?.get?.('reducedCameraMotion') ? '1' : '0';
  } catch (err) {
    console.warn('[ui] could not apply UI preferences', err);
  }
}

/* ------------------------------------------------------------------ */
/* Asset registration (mandatory)                                      */
/* ------------------------------------------------------------------ */

let manifestDone = false;

/** Registers every Fable 1 UI asset family. Idempotent. */
export function registerUiManifest() {
  if (manifestDone) return;
  manifestDone = true;

  const base = {
    category: 'ui',
    owner: OWNERS.FABLE1,
    dimensions: 'screen space (resolution independent, rem/clamp sizing)',
    pivot: 'DOM flow / top-left; overlays anchored to viewport edges',
    materials: 'CSS custom properties mirroring the UI palette in src/art/palette.js',
    textures: 'none — vector SVG, DOM and Canvas2D only, zero external files',
    collision: 'none (screen-space UI)',
    lod: 'none — vector, crisp at any resolution; verified at 1280×720 and 1920×1080',
    status: 'production',
  };

  reg({
    ...base,
    id: 'ui.theme',
    name: 'Interface theme & typography treatment',
    files: ['src/ui/styles.css'],
    usedIn: ['every screen and the HUD'],
    acceptance: 'Cold navy/cyan palette per the colour script; red reserved for danger; legible at 720p and 1080p; respects --ui-scale; no scrollbars or layout shift; web-safe font stacks only (offline).',
  });
  reg({
    ...base,
    id: 'ui.icons',
    name: 'Vector icon set (glyphs, weapon silhouettes, key caps, pips)',
    files: ['src/ui/icons.js'],
    usedIn: ['HUD', 'menus', 'briefing', 'loadout', 'settings'],
    acceptance: `All ${Object.keys(ICONS).length} glyphs share the 2.4px stroke grid, use currentColor, and are generated inline with no emoji or external assets.`,
  });
  reg({
    ...base,
    id: 'ui.title',
    name: 'NORTHSTAR RESCUE title treatment & star mark',
    files: ['src/ui/icons.js', 'src/ui/menus.js', 'src/ui/styles.css'],
    usedIn: ['title screen', 'loading screen', 'credits'],
    acceptance: 'Original faceted four-point star with compass ring; display type is a letter-spaced web-safe stack; animated snow stays restrained and pauses under reduced-motion.',
  });
  reg({
    ...base,
    id: 'ui.hud',
    name: 'In-mission HUD layer',
    files: ['src/ui/hud.js', 'src/ui/styles.css'],
    usedIn: ['gameplay'],
    animations: ['hitmarker pop', 'damage direction fade', 'notification slide', 'timer critical pulse', 'low-health vignette'],
    acceptance: 'Shows health/armor/ammo/weapon/utility/objective/hostages/timer/compass/interact/subtitles; minimal at rest; every element driven by update(state) with change-detection (no per-frame layout churn).',
  });
  reg({
    ...base,
    id: 'ui.crosshair',
    name: 'Dynamic crosshair family',
    files: ['src/ui/hud.js', 'src/ui/styles.css'],
    usedIn: ['gameplay', 'settings live preview'],
    acceptance: 'Four styles (dynamic / cross / dot / none); dynamic style tracks spread in device pixels via a CSS custom property; hidden while scoped.',
  });
  reg({
    ...base,
    id: 'ui.minimap',
    name: 'Tactical minimap & briefing floor plan',
    files: ['src/ui/minimap.js'],
    usedIn: ['HUD', 'mission briefing'],
    acceptance: 'Architectural plan rendered from ROOMS/OPENINGS rectangles (rooms, corridors, stairs, doors, windows); north-up; player wedge, hostage/objective/enemy markers, extraction zone; compact and expanded modes.',
  });
  reg({
    ...base,
    id: 'ui.menus',
    name: 'Menu screen system (13 screens)',
    files: ['src/ui/menus.js', 'src/ui/styles.css'],
    usedIn: ['title', 'settings', 'controls', 'difficulty', 'briefing', 'loadout', 'loading', 'pause', 'victory', 'defeat', 'restartConfirm', 'gallery', 'credits'],
    acceptance: 'All screens reachable; full keyboard navigation (arrows/Tab/Enter/Esc); every DEFAULTS setting exposed with live preview and reset; Esc never traps; data-testid on every interactive control.',
  });
}
