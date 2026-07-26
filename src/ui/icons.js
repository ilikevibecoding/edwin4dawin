// ---------------------------------------------------------------------------
// NORTHSTAR RESCUE — interface iconography  (owner: fable1)
//
// Every interface glyph is authored here as inline SVG. One drawing system:
//   * 24 x 24 viewBox, geometry kept on the half-pixel grid
//   * stroke width 1.6, round caps and joins, corner radius 1.5
//   * `currentColor` throughout, so CSS owns the colour
// No external assets, no fonts, no emoji.
// ---------------------------------------------------------------------------

const STROKE = 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';

function svg24(body, cls = '') {
  return `<svg viewBox="0 0 24 24" class="icon ${cls}" aria-hidden="true" ${STROKE}>${body}</svg>`;
}

// ------------------------------------------------------------------ brand --

/**
 * The Northstar compass-star brand mark: an eight-point star (long cardinal
 * points, short intercardinals) inside a survey ring. Original device.
 * @param {number} size  rendered width/height in px (SVG scales freely)
 */
export function compassStar(size = 64, cls = 'brand-mark') {
  const star = 'M32 4 L34.9 25.1 L42.6 21.4 L38.9 29.1 L60 32 L38.9 34.9 '
    + 'L42.6 42.6 L34.9 38.9 L32 60 L29.1 38.9 L21.4 42.6 L25.1 34.9 '
    + 'L4 32 L25.1 29.1 L21.4 21.4 L29.1 25.1 Z';
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" class="${cls}" aria-hidden="true">`
    + `<circle cx="32" cy="32" r="29.5" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.4"/>`
    + `<circle cx="32" cy="32" r="24.5" fill="none" stroke="currentColor" stroke-width="0.8" opacity="0.22" stroke-dasharray="2.4 3.6"/>`
    + `<path d="${star}" fill="currentColor"/>`
    + `<path d="M32 4 L34.9 25.1 L32 32 Z" fill="#04141b" opacity="0.35"/>`
    + `<path d="M60 32 L38.9 34.9 L32 32 Z" fill="#04141b" opacity="0.35"/>`
    + `<path d="M32 60 L29.1 38.9 L32 32 Z" fill="#04141b" opacity="0.35"/>`
    + `<path d="M4 32 L25.1 29.1 L32 32 Z" fill="#04141b" opacity="0.35"/>`
    + `<circle cx="32" cy="32" r="2.4" fill="#04141b"/>`
    + `<circle cx="32" cy="32" r="1.1" fill="currentColor"/>`
    + `</svg>`;
}

// ----------------------------------------------------------------- glyphs --

const GLYPHS = {
  // vitals
  health: '<rect x="3.5" y="3.5" width="17" height="17" rx="1.5"/>'
    + '<path d="M12 7.5v9M7.5 12h9"/>',
  armor: '<path d="M12 3.5l7 2.6v5.4c0 4.4-2.9 7.6-7 9-4.1-1.4-7-4.6-7-9V6.1z"/>'
    + '<path d="M8.5 11.5l2.4 2.4 4.6-4.6"/>',

  // people / mission markers
  hostage: '<circle cx="12" cy="7" r="2.9"/>'
    + '<path d="M6.5 20.5v-2.2c0-2.9 2.4-4.8 5.5-4.8s5.5 1.9 5.5 4.8v2.2"/>'
    + '<path d="M9 16.4h6" opacity="0.6"/>',
  objective: '<path d="M12 3.5l8.5 8.5-8.5 8.5L3.5 12z"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
  extraction: '<path d="M8 3.5H4.5c-0.6 0-1 0.4-1 1V19.5c0 0.6 0.4 1 1 1H8"/>'
    + '<path d="M16 3.5h3.5c0.6 0 1 0.4 1 1V19.5c0 0.6-0.4 1-1 1H16"/>'
    + '<path d="M12 6.5v9M8.5 12.5l3.5 3.5 3.5-3.5"/>',
  waypoint: '<path d="M12 3.5l6 10.4H6z"/><path d="M12 17v3.5"/>',

  // interaction
  door: '<rect x="5.5" y="3.5" width="13" height="17" rx="1.5"/>'
    + '<path d="M18.5 20.5h-13"/><circle cx="15.2" cy="12" r="1" fill="currentColor" stroke="none"/>',
  keycard: '<rect x="3.5" y="6" width="17" height="12" rx="1.5"/>'
    + '<path d="M3.5 10h17" opacity="0.6"/><path d="M6.5 14.5h5"/><circle cx="16.8" cy="14.5" r="1.2"/>',
  terminal: '<rect x="3.5" y="4.5" width="17" height="12" rx="1.5"/>'
    + '<path d="M7 8.5l2.6 2-2.6 2M12 12.5h4"/><path d="M9 20h6"/>',
  lock: '<rect x="5.5" y="10.5" width="13" height="9.5" rx="1.5"/>'
    + '<path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7"/><path d="M12 14v2.5"/>',
  unlock: '<rect x="5.5" y="10.5" width="13" height="9.5" rx="1.5"/>'
    + '<path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 6.8-1"/><path d="M12 14v2.5"/>',
  warning: '<path d="M12 3.8L21.5 20H2.5z"/><path d="M12 9.5v4.5"/><circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none"/>',

  // state / navigation
  check: '<path d="M4.5 12.5l5 5 10-10"/>',
  cross: '<path d="M6 6l12 12M18 6L6 18"/>',
  chevronL: '<path d="M14.5 5.5L8 12l6.5 6.5"/>',
  chevronR: '<path d="M9.5 5.5L16 12l-6.5 6.5"/>',
  timer: '<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4.2l3 1.8M9.5 3.5h5"/>',
  map: '<path d="M3.5 6l5.5-2 6 2 5.5-2v14l-5.5 2-6-2-5.5 2z"/><path d="M9 4v14M15 6v14" opacity="0.5"/>',
  skull: '<path d="M12 3.5c4.7 0 8 3.2 8 7.4 0 2.4-1.2 4.2-3 5.3V19a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 19v-2.8c-1.8-1.1-3-2.9-3-5.3 0-4.2 3.3-7.4 8-7.4z"/>'
    + '<circle cx="9" cy="11" r="1.5"/><circle cx="15" cy="11" r="1.5"/><path d="M12 14.2v1.8"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/>'
    + '<path d="M12 3.5v2.6M12 17.9v2.6M3.5 12h2.6M17.9 12h2.6M6 6l1.9 1.9M16.1 16.1L18 18M18 6l-1.9 1.9M7.9 16.1L6 18"/>',

  // weapon classes (side profiles, simplified to a shared stencil language)
  wpn_pistol: '<path d="M3.5 9.5h15.5v3.4h-6.2l-1 4.6h-3.6l1-4.6H6.8L5 15.2H3.5z"/><path d="M16 9.5V8h2.5"/>',
  wpn_smg: '<path d="M2.5 10h17.5v3h-6.5l-0.8 4h-3.4l0.8-4H8.5v3.4h-2.6V13H2.5z"/><path d="M20 10V8.6h1.5M5 10V8h5"/>',
  wpn_carbine: '<path d="M2 10.5h19.5v2.4h-7l-0.8 4.4h-3.2l0.8-4.4h-3l-0.6 3h-2.6l0.6-3H2z"/><path d="M15 10.5L15.8 8h3M6.5 10.5V9h4"/>',
  wpn_shotgun: '<path d="M2 10.8h20v2.2h-8.5l-1.6 4h-3l1.6-4H2z"/><path d="M2 13v1.8h4.5"/><path d="M13 10.8V9.4h6"/>',
  wpn_sniper: '<path d="M1.5 11h21v2h-8l-0.7 4.5h-3l0.7-4.5H8l-0.8 3.5H4.6l0.8-3.5H1.5z"/><circle cx="12.5" cy="7.6" r="2.1"/><path d="M12.5 9.7V11"/>',
  wpn_knife: '<path d="M4 20l9.5-9.5c1.8-1.8 3.2-4.3 3.8-7 2 1.4 3.2 3.4 3.2 5.6 0 1.7-0.7 3.3-2 4.6L9 23z" transform="translate(0 -2.2)"/><path d="M8 14l2.5 2.5"/>',
  wpn_flash: '<rect x="8.5" y="7.5" width="7" height="12" rx="2.2"/><path d="M10 7.5V5.2h4v2.3M14 5.2l2.6-1.7"/>'
    + '<path d="M5.5 11l-2-1M5.5 15l-2 1M18.5 11l2-1M18.5 15l2 1" opacity="0.7"/>',
  wpn_smoke: '<rect x="8.5" y="6.5" width="7" height="13" rx="1.5"/><path d="M10 6.5V4.5h4v2M8.5 10.5h7" opacity="0.6"/>'
    + '<path d="M17.5 5.5c1.5 0 1.5 2 3 2" opacity="0.7"/>',
};

const FAMILY_TO_GLYPH = {
  pistol: 'wpn_pistol', smg: 'wpn_smg', rifle: 'wpn_carbine', carbine: 'wpn_carbine',
  shotgun: 'wpn_shotgun', sniper: 'wpn_sniper', melee: 'wpn_knife', knife: 'wpn_knife',
  grenade: 'wpn_flash', flash: 'wpn_flash', smoke: 'wpn_smoke',
};

/** An interface glyph by name. Unknown names get the objective diamond. */
export function icon(name, cls = '') {
  return svg24(GLYPHS[name] || GLYPHS.objective, cls ? `${cls} icon-${name}` : `icon-${name}`);
}

/** Weapon-class glyph for a weapon key or family name. */
export function weaponGlyph(keyOrFamily, cls = 'weapon-glyph') {
  const g = FAMILY_TO_GLYPH[String(keyOrFamily || '').toLowerCase()] || 'wpn_carbine';
  return svg24(GLYPHS[g], cls);
}

/** Names available, for the gallery / bible swatch sheet. */
export const ICON_NAMES = Object.keys(GLYPHS);

// ------------------------------------------------------- weapon profiles --
//
// Larger canvas-drawn side profiles for the loadout screen. Original,
// deliberately generic silhouettes built from shared primitives so every
// weapon reads as one product family. Not traced from anything.

function rr(ctx, x, y, w, h, r = 2) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Draw a stylised side profile of `key` into a 2D context. The drawing is
 * normalised to a 200 x 72 design space and scaled to fit (w, h).
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} key       weapon key ('carbine', 'pistol', ...)
 * @param {number} w @param {number} h
 * @param {{ink?:string, accent?:string}} [opts]
 */
export function drawWeaponProfile(ctx, key, w, h, opts = {}) {
  const ink = opts.ink || 'rgba(212, 228, 238, 0.92)';
  const accent = opts.accent || 'rgba(79, 208, 232, 0.9)';
  const fill = 'rgba(24, 40, 52, 0.85)';
  const scale = Math.min(w / 200, h / 72);
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.translate((w - 200 * scale) / 2, (h - 72 * scale) / 2);
  ctx.scale(scale, scale);
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = ink;
  ctx.fillStyle = fill;

  const body = (x, y, bw, bh, r) => { rr(ctx, x, y, bw, bh, r); ctx.fill(); ctx.stroke(); };
  const line = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };

  switch (key) {
    case 'pistol':
      body(52, 26, 74, 14, 3);                 // slide
      body(58, 40, 16, 22, 3);                 // grip
      ctx.transform(1, 0, -0.22, 1, 0, 0); body(76, 40, 13, 20, 2); ctx.setTransform(scale, 0, 0, scale, (w - 200 * scale) / 2, (h - 72 * scale) / 2); // trigger guard shear
      line(126, 30, 138, 30);                  // muzzle
      line(56, 26, 56, 22); line(120, 26, 120, 23); // sights
      break;
    case 'smg':
      body(30, 28, 108, 14, 3);                // receiver
      body(138, 30, 40, 9, 4);                 // suppressor can
      body(42, 42, 13, 20, 2);                 // grip
      body(84, 42, 11, 16, 2);                 // mag
      line(30, 32, 16, 32); line(16, 28, 16, 38); // folding stock
      line(60, 28, 60, 23); line(120, 28, 120, 24);
      break;
    case 'carbine':
      body(38, 28, 116, 13, 3);                // receiver + handguard
      line(154, 31, 176, 31); line(176, 28, 176, 34); // barrel + muzzle device
      body(50, 41, 13, 20, 2);                 // grip
      body(92, 41, 13, 22, 2);                 // magazine
      body(14, 26, 26, 12, 3);                 // stock
      line(70, 28, 70, 21); line(140, 28, 140, 22); // sights
      ctx.strokeStyle = accent; line(104, 24, 122, 24); ctx.strokeStyle = ink; // rail accent
      break;
    case 'shotgun':
      body(34, 29, 120, 12, 3);                // receiver
      body(154, 31, 30, 8, 3);                 // barrel
      body(96, 41, 34, 9, 3);                  // pump
      body(12, 27, 24, 13, 4);                 // stock
      body(46, 41, 12, 16, 2);                 // grip
      line(60, 29, 60, 24); line(150, 29, 150, 25);
      break;
    case 'sniper':
      body(30, 32, 130, 11, 3);                // chassis
      line(160, 36, 190, 36); line(190, 32, 190, 40); // barrel + brake
      body(70, 16, 44, 10, 5);                 // scope
      line(78, 26, 78, 32); line(106, 26, 106, 32);   // scope rings
      body(46, 43, 12, 18, 2);                 // grip
      body(88, 43, 12, 16, 2);                 // mag
      body(10, 30, 22, 14, 3);                 // stock
      line(126, 43, 126, 58); line(140, 43, 140, 58); // bipod
      break;
    case 'knife':
      ctx.beginPath();
      ctx.moveTo(36, 40); ctx.quadraticCurveTo(96, 18, 150, 30);
      ctx.quadraticCurveTo(120, 44, 36, 46); ctx.closePath();
      ctx.fill(); ctx.stroke();                // blade
      body(150, 30, 34, 14, 4);                // handle
      line(148, 26, 148, 48);                  // guard
      break;
    case 'flash':
    case 'smoke':
      body(84, 18, 32, 42, 8);                 // canister
      body(90, 10, 20, 9, 2);                  // fuse head
      line(110, 12, 126, 6);                   // spoon
      ctx.strokeStyle = accent;
      if (key === 'flash') { line(76, 30, 68, 26); line(76, 44, 68, 48); line(124, 30, 132, 26); line(124, 44, 132, 48); }
      else { line(88, 30, 112, 30); line(88, 40, 112, 40); }
      ctx.strokeStyle = ink;
      break;
    default:
      body(40, 28, 110, 14, 3);
      body(56, 42, 13, 18, 2);
  }
  ctx.restore();
}
