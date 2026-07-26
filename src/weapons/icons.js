import { WEAPONS } from './defs.js';
import { UI } from '../art/palette.js';
import { reg, OWNERS } from '../core/assets.js';

/**
 * Weapon, ammunition and utility icons — Northstar Rescue.
 * Owner: Fable 4. Everything is drawn with Canvas2D; no external files.
 *
 * All silhouettes are original fictional designs matching the 3D models in
 * models.js (muzzle pointing right). Two render styles:
 *   'hud'       — flat light silhouette on a transparent background
 *   'inventory' — panel background, gradient-filled silhouette, name plate
 */

const CACHE = new Map();

function makeCanvas(w, h = w) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  return cv;
}

function cached(key, make) {
  let c = CACHE.get(key);
  if (!c) {
    c = make();
    CACHE.set(key, c);
  }
  return c;
}

function poly(ctx, pts, close = true) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  if (close) ctx.closePath();
}

function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

/* ------------------------------------------------------------------ */
/* Weapon silhouettes — authored in a 100 × 44 design box, muzzle right */
/* ------------------------------------------------------------------ */

const SILHOUETTES = {
  'pistol.vsc9'(ctx) {
    // slide with front chamfer + front/rear sight nubs
    poly(ctx, [[30, 8], [92, 8], [96, 11], [96, 17], [30, 17]]);
    ctx.fill();
    ctx.fillRect(33, 5, 3, 3);
    ctx.fillRect(90, 5, 3, 3);
    // frame + dust cover
    poly(ctx, [[30, 17], [94, 17], [94, 22], [62, 22], [58, 24], [30, 24]]);
    ctx.fill();
    // raked grip with mag base
    poly(ctx, [[30, 17], [46, 17], [40, 40], [37, 42], [24, 42], [23, 39]]);
    ctx.fill();
    // trigger guard + trigger
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(48, 22);
    ctx.lineTo(60, 22);
    ctx.lineTo(60, 30);
    ctx.lineTo(50, 30);
    ctx.closePath();
    ctx.stroke();
    ctx.fillRect(53, 22, 2.6, 7);
  },

  'smg.kestrel'(ctx) {
    // tube receiver + end cap
    rr(ctx, 22, 10, 52, 10, 3);
    ctx.fill();
    // handguard + compensator
    rr(ctx, 66, 11, 16, 8, 2);
    ctx.fill();
    ctx.fillRect(82, 12, 12, 6);
    ctx.fillRect(95, 13, 3, 4);
    // sights
    ctx.fillRect(28, 6, 3, 4);
    ctx.fillRect(70, 7, 3, 4);
    // lower + grip
    poly(ctx, [[30, 20], [66, 20], [66, 25], [46, 25], [44, 40], [37, 40], [38, 25], [30, 25]]);
    ctx.fill();
    // forward magazine
    poly(ctx, [[52, 25], [62, 25], [61, 41], [51, 41]]);
    ctx.fill();
    // folding strut stock
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(22, 12);
    ctx.lineTo(6, 12);
    ctx.moveTo(22, 17);
    ctx.lineTo(6, 17);
    ctx.stroke();
    ctx.fillRect(3, 9, 4, 12);
  },

  'rifle.northwind'(ctx) {
    // upper + rail
    ctx.fillRect(26, 11, 44, 8);
    ctx.fillRect(26, 8, 44, 3);
    // handguard, barrel, prongs
    rr(ctx, 66, 11.5, 20, 7, 2);
    ctx.fill();
    ctx.fillRect(86, 13, 8, 4);
    ctx.fillRect(94, 12, 4, 6);
    // optic + front sight
    ctx.fillRect(40, 3, 9, 6);
    ctx.fillRect(72, 6, 3, 6);
    // lower + grip
    poly(ctx, [[30, 19], [64, 19], [64, 24], [50, 24], [48, 39], [41, 39], [42, 24], [30, 24]]);
    ctx.fill();
    // curved magazine
    poly(ctx, [[52, 24], [62, 24], [60, 33], [56, 40], [48, 38], [51, 30]]);
    ctx.fill();
    // buffer tube + stock
    ctx.fillRect(14, 12, 12, 5);
    poly(ctx, [[14, 10], [8, 10], [4, 13], [4, 26], [9, 26], [14, 19]]);
    ctx.fill();
  },

  'shotgun.borealis'(ctx) {
    // receiver
    ctx.fillRect(28, 10, 22, 11);
    // barrel + mag tube + standoff
    ctx.fillRect(50, 11.5, 42, 4);
    ctx.fillRect(50, 17, 34, 3.4);
    ctx.fillRect(92, 10.5, 5, 6);
    // bead + ghost ring
    ctx.fillRect(88, 8, 2.6, 3);
    ctx.fillRect(31, 6, 3.4, 4);
    // sliding wood fore-end
    rr(ctx, 58, 16, 16, 8, 2.5);
    ctx.fill();
    // wrist + wooden stock with pad
    poly(ctx, [[28, 12], [22, 12], [10, 16], [4, 20], [4, 33], [10, 33], [16, 25], [28, 21]]);
    ctx.fill();
    ctx.fillRect(2, 19, 3, 15);
    // trigger guard
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(32, 21);
    ctx.lineTo(42, 21);
    ctx.lineTo(42, 27);
    ctx.lineTo(34, 27);
    ctx.closePath();
    ctx.stroke();
  },

  'dmr.meridian'(ctx) {
    // scope with bells
    ctx.fillRect(34, 4, 26, 5);
    poly(ctx, [[60, 3], [68, 2], [68, 10], [60, 10]]);
    ctx.fill();
    poly(ctx, [[34, 3.4], [28, 3], [28, 10], [34, 10]]);
    ctx.fill();
    ctx.fillRect(42, 9, 3, 4);
    ctx.fillRect(54, 9, 3, 4);
    // action + chassis
    ctx.fillRect(26, 13, 40, 7);
    // heavy barrel + brake
    ctx.fillRect(66, 14, 24, 4.6);
    ctx.fillRect(90, 13, 7, 7);
    // bolt handle
    poly(ctx, [[30, 20], [33, 20], [36, 26], [33, 27]]);
    ctx.fill();
    // grip + magazine
    poly(ctx, [[44, 20], [58, 20], [58, 24], [50, 24], [47, 37], [41, 37], [43, 24]]);
    ctx.fill();
    poly(ctx, [[56, 24], [65, 24], [64, 34], [55, 33]]);
    ctx.fill();
    // skeletal stock with cheek riser + hook
    poly(ctx, [[26, 13], [14, 13], [14, 10], [6, 10], [4, 13], [4, 30], [10, 30], [12, 24], [20, 22], [26, 20]]);
    ctx.fill();
  },

  'knife.talon'(ctx) {
    // clip-point blade
    poly(ctx, [[36, 15], [78, 13], [96, 20], [78, 26], [36, 25]]);
    ctx.fill();
    // fuller
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillRect(44, 17.4, 30, 2.2);
    ctx.restore();
    // guard
    ctx.fillRect(33, 10, 4, 22);
    // handle with rings + pommel
    rr(ctx, 12, 15.5, 21, 10, 4);
    ctx.fill();
    ctx.fillRect(8, 16.5, 5, 8);
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillRect(18, 15.5, 2, 10);
    ctx.fillRect(24, 15.5, 2, 10);
    ctx.restore();
  },

  'flash.halo'(ctx) {
    grenadeBody(ctx);
    // radiating flash ticks
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i - 2.5) * 0.42;
      ctx.moveTo(50 + Math.cos(a) * 20, 22 + Math.sin(a) * 18);
      ctx.lineTo(50 + Math.cos(a) * 27, 22 + Math.sin(a) * 25);
    }
    ctx.stroke();
  },

  'smoke.veil'(ctx) {
    grenadeBody(ctx);
    // drifting puffs
    ctx.beginPath();
    ctx.arc(68, 8, 4.5, 0, Math.PI * 2);
    ctx.arc(76, 5, 3.4, 0, Math.PI * 2);
    ctx.arc(82, 9, 2.6, 0, Math.PI * 2);
    ctx.fill();
  },
};

function grenadeBody(ctx) {
  // canister
  rr(ctx, 42, 10, 16, 30, 4);
  ctx.fill();
  // band cut
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillRect(42, 22, 16, 3);
  ctx.restore();
  // fuze + lever + ring
  ctx.fillRect(46, 5, 8, 6);
  poly(ctx, [[54, 6], [62, 9], [61, 30], [58, 30], [58, 11], [53, 9]]);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(41, 7, 4, 0, Math.PI * 2);
  ctx.stroke();
}

/* ------------------------------------------------------------------ */
/* Renderers                                                           */
/* ------------------------------------------------------------------ */

function drawStyled(drawFn, { size = 128, style = 'hud', label = '' } = {}) {
  const cv = makeCanvas(size);
  const ctx = cv.getContext('2d');
  const pad = size * 0.08;

  if (style === 'inventory') {
    ctx.fillStyle = UI.bgPanel;
    rr(ctx, 1, 1, size - 2, size - 2, size * 0.1);
    ctx.fill();
    ctx.strokeStyle = UI.stroke;
    ctx.lineWidth = Math.max(1, size / 96);
    rr(ctx, 1, 1, size - 2, size - 2, size * 0.1);
    ctx.stroke();
  }

  // silhouette layer, centred in a 100 × 44 design box
  ctx.save();
  const boxH = style === 'inventory' ? size * 0.56 : size * 0.7;
  const s = Math.min((size - pad * 2) / 100, boxH / 44);
  ctx.translate((size - 100 * s) / 2, (size - 44 * s) / 2 - (style === 'inventory' ? size * 0.06 : 0));
  ctx.scale(s, s);
  if (style === 'inventory') {
    const grad = ctx.createLinearGradient(0, 0, 0, 44);
    grad.addColorStop(0, '#d9e7f2');
    grad.addColorStop(0.55, '#a9bccb');
    grad.addColorStop(1, '#7e93a4');
    ctx.fillStyle = grad;
    ctx.strokeStyle = grad;
  } else {
    ctx.fillStyle = 'rgba(230,241,250,0.95)';
    ctx.strokeStyle = 'rgba(230,241,250,0.95)';
  }
  drawFn(ctx);
  ctx.restore();

  if (style === 'inventory' && label) {
    ctx.fillStyle = UI.accent;
    ctx.fillRect(size * 0.12, size * 0.78, size * 0.76, Math.max(1, size / 128));
    ctx.fillStyle = UI.text;
    ctx.font = `600 ${Math.max(9, size * 0.1)}px ${UI.fontUi}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label.toUpperCase(), size / 2, size * 0.885);
  }
  return cv;
}

/**
 * HUD / inventory icon for a weapon id (also accepts family shorthands
 * 'pistol'|'smg'|'rifle'|'shotgun'|'dmr'|'knife'|'flash'|'smoke').
 */
export function weaponIcon(weaponId, { size = 128, style = 'hud' } = {}) {
  const alias = {
    pistol: 'pistol.vsc9', smg: 'smg.kestrel', rifle: 'rifle.northwind',
    shotgun: 'shotgun.borealis', dmr: 'dmr.meridian', knife: 'knife.talon',
    melee: 'knife.talon', flash: 'flash.halo', smoke: 'smoke.veil', grenade: 'flash.halo',
  };
  const id = SILHOUETTES[weaponId] ? weaponId : (alias[weaponId] ?? 'rifle.northwind');
  return cached(`wpn:${id}:${size}:${style}`, () =>
    drawStyled(SILHOUETTES[id], { size, style, label: WEAPONS[id]?.name ?? id }));
}

/**
 * Ammunition icon. kind: '9mm'|'5.56'|'7.62'|'12ga' or a weapon family
 * ('pistol'/'smg' → 9mm, 'rifle' → 5.56, 'dmr' → 7.62, 'shotgun' → 12ga).
 */
export function ammoIcon(kind, { size = 64, style = 'hud' } = {}) {
  const map = {
    pistol: '9mm', smg: '9mm', '9mm': '9mm',
    rifle: '5.56', 556: '5.56', '5.56': '5.56',
    dmr: '7.62', 762: '7.62', '7.62': '7.62',
    shotgun: '12ga', shell: '12ga', '12ga': '12ga',
  };
  const k = map[kind] ?? '9mm';
  return cached(`ammo:${k}:${size}:${style}`, () =>
    drawStyled((ctx) => {
      ctx.save();
      ctx.translate(50, 22);
      ctx.rotate(-Math.PI / 2); // cartridges drawn nose-up
      ctx.translate(-50, -22);
      if (k === '12ga') {
        // shotshell: hull + brass head
        rr(ctx, 30, 14, 46, 16, 3);
        ctx.fill();
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillRect(40, 14, 2.5, 16);
        ctx.restore();
        ctx.fillRect(24, 12.5, 8, 19);
        ctx.fillRect(22, 12, 3, 20);
      } else {
        const scale = k === '9mm' ? 0.72 : k === '5.56' ? 0.92 : 1.05;
        ctx.save();
        ctx.translate(50, 22);
        ctx.scale(scale, scale);
        ctx.translate(-50, -22);
        // case, shoulder, projectile
        rr(ctx, 26, 16, 34, 12, 2);
        ctx.fill();
        poly(ctx, [[60, 16], [68, 18.5], [68, 25.5], [60, 28]]);
        ctx.fill();
        poly(ctx, [[68, 18.5], [82, 21], [84, 22], [82, 23], [68, 25.5]]);
        ctx.fill();
        ctx.fillRect(23, 15, 4, 14);
        ctx.restore();
      }
      ctx.restore();
    }, { size, style, label: k }));
}

/** Utility icon: 'flash.halo'|'smoke.veil'|'knife.talon' (or shorthands). */
export function utilityIcon(id, { size = 64, style = 'hud' } = {}) {
  const alias = { flash: 'flash.halo', smoke: 'smoke.veil', knife: 'knife.talon', melee: 'knife.talon' };
  const full = SILHOUETTES[id] ? id : (alias[id] ?? 'flash.halo');
  return cached(`util:${full}:${size}:${style}`, () =>
    drawStyled(SILHOUETTES[full], { size, style, label: WEAPONS[full]?.name ?? full }));
}

/** Data-URL convenience for CSS/background usage. */
export function iconDataUrl(weaponId, opts = {}) {
  return weaponIcon(weaponId, opts).toDataURL('image/png');
}

export function clearIconCache() {
  CACHE.clear();
}

/* ------------------------------------------------------------------ */
/* Manifest registration                                               */
/* ------------------------------------------------------------------ */

let registered = false;
export function registerWeaponIconManifest() {
  if (registered) return;
  registered = true;
  const base = {
    category: 'ui',
    owner: OWNERS.FABLE4,
    files: ['src/weapons/icons.js'],
    pivot: 'canvas centre; silhouettes authored in a 100×44 design box, muzzle right',
    textures: ['Canvas2D, no external files; cached per (id, size, style)'],
    collision: 'n/a — UI asset',
    lod: 'vector-drawn at request size; default 128 px (weapons) / 64 px (ammo, utility)',
    status: 'built',
  };
  reg({
    ...base,
    id: 'wpn.icon.weapons',
    name: 'Weapon silhouette icons (8 weapons, hud + inventory styles)',
    usedIn: 'HUD weapon panel, loadout menu, pickup prompts',
    dimensions: 'square canvas, any size (default 128 px)',
    materials: ['hud: flat #e6f1fa silhouette', 'inventory: panel bg, steel gradient fill, accent underline, name plate'],
    acceptance: 'Each of the 8 weapon ids renders a distinct original silhouette matching its 3D model; family shorthands alias correctly; data-URL export works.',
  });
  reg({
    ...base,
    id: 'wpn.icon.ammo',
    name: 'Ammunition icons (9mm, 5.56, 7.62, 12ga)',
    usedIn: 'HUD ammo counter, pickup prompts',
    dimensions: 'square canvas, any size (default 64 px)',
    materials: ['cartridge/shotshell silhouettes drawn nose-up, calibre-scaled'],
    acceptance: 'Four calibres visually distinct at 24 px; weapon-family shorthands map to the right calibre.',
  });
  reg({
    ...base,
    id: 'wpn.icon.utility',
    name: 'Utility icons (flash, smoke, knife)',
    usedIn: 'HUD utility slots, loadout menu',
    dimensions: 'square canvas, any size (default 64 px)',
    materials: ['grenade canister with flash ticks / smoke puffs; knife silhouette'],
    acceptance: 'Flash and smoke devices distinguishable at HUD size; consistent with weaponIcon renders of the same ids.',
  });
}
