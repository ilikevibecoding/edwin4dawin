import * as THREE from 'three';
import * as G from '../art/geometry.js';
import * as KIT from '../map/kit.js';
import { reg, OWNERS } from '../core/assets.js';
import { rngFor } from '../core/rng.js';
import { screenFacePart, bookRowFace } from './signage.js';

/**
 * PROP LIBRARY — Northstar Rescue
 * Owner: Fable 3 (props, materials, decals & environmental storytelling).
 *
 * Every prop builds a part list in LOCAL space with the pivot at the footprint
 * centre on the floor (y = 0 at the base). Yaw 0 faces −Z (north), matching the
 * world convention. `prop(id, opts)` bakes `opts.pos` / `opts.rot` /
 * `opts.scale` into every part matrix, collider AABB and screen anchor and
 * returns the world-space result ready for `batchParts`.
 *
 * House rules honoured here:
 *  - `G.bevelBox` everywhere the player can get within 4 m; sharp `G.box`
 *    only for far-LOD proxies.
 *  - Real-world metric sizes (desk 1.6×0.75×0.8, chair seat 0.46, filing
 *    cabinet 0.45×1.32×0.62, server rack 0.6×2.0×1.0, monitor 0.54×0.33 …).
 *  - Several material families per prop: frame ≠ top ≠ fabric ≠ plastic.
 *  - Small clutter never gets a collider.
 */

const P = KIT.part;
const COL = KIT.collider;
const BB = G.bevelBox;
const BOX = G.box;
const CYL = G.cyl;
const SPH = G.sphere;
const CAP = G.capsule;
const TOR = G.torus;
const PLN = G.plane;

/** Centered-footprint collider helper: w×h×d box at (cx, y0, cz). */
function cbox(w, h, d, surface, tag, cx = 0, cz = 0, y0 = 0) {
  return COL(cx - w / 2, y0, cz - d / 2, cx + w / 2, y0 + h, cz + d / 2, surface, tag);
}

/** Local lathe cache so repeated cups/bottles/pots share one geometry. */
const LATHES = new Map();
function lathe(key, pts, seg = 18) {
  let g = LATHES.get(key);
  if (!g) {
    g = G.lathe(pts, seg);
    LATHES.set(key, g);
  }
  return g;
}

/**
 * Flat-panel screen assembly facing −Z. Powered panels carry a content quad
 * from the shared screen atlas (map + emissiveMap) so they read as content,
 * not a clipped light source. Returns parts + screen anchor.
 */
function flatScreen(w, h, cy, { depth = 0.028, bezel = 0.014, on = true, kind = 'monitor', z = 0, content = 'spreadsheet' } = {}) {
  const face = on
    ? screenFacePart(content, w, h, [0, cy, z - depth / 2 - 0.0015], [0, Math.PI, 0])
    : P(PLN(w, h), 'plastic.smooth', [0, cy, z - depth / 2 - 0.0015], [0, Math.PI, 0]);
  const parts = [
    P(BB(w + bezel * 2, h + bezel * 2, depth, 0.005), 'plastic.smooth', [0, cy, z]),
    face,
  ];
  return { parts, screen: { pos: [0, cy, z - depth / 2 - 0.002], rot: 0, kind } };
}

/** Pick a plausible desk-monitor content kind. */
const MONITOR_CONTENT = ['spreadsheet', 'mail', 'dashboard', 'cad', 'locked', 'mail', 'spreadsheet', 'login'];
function pickContent(rng) {
  return MONITOR_CONTENT[Math.floor(rng() * MONITOR_CONTENT.length)];
}

/**
 * A shelf's worth of books: a shadowed block plus one flat-colour spine face
 * from the signage atlas (crisp at gameplay distance — no speckle noise).
 */
function bookRow(width, y0, rng, z = 0, maxH = 0.24, twoSided = false) {
  const seed = Math.floor(rng() * 8);
  const inset = rng() < 0.25 ? 0.1 + rng() * 0.12 : 0;
  const w = width - inset;
  const off = inset * (rng() < 0.5 ? 0.5 : -0.5);
  const d = 0.16;
  const cy = y0 + maxH / 2;
  const parts = [
    P(BOX(w, maxH, d), 'plastic.smooth', [off, cy, z + 0.01]),
    bookRowFace(seed, w, maxH, [off, cy, z + 0.01 - d / 2 - 0.0015]),
  ];
  if (twoSided) parts.push(bookRowFace(seed + 3, w, maxH, [off, cy, z + 0.01 + d / 2 + 0.0015], [0, 0, 0]));
  return parts;
}

/**
 * Tip a built chair over onto its back (evacuation storytelling): rotates the
 * whole part list ~95° about X around the rear floor contact and swaps the
 * collider for a low knocked-over box.
 */
function tipBack(parts, zPivot = 0.3, lift = 0.045, tag = 'chairTipped') {
  const A = new THREE.Matrix4().makeTranslation(0, lift, zPivot)
    .multiply(new THREE.Matrix4().makeRotationX(1.66))
    .multiply(new THREE.Matrix4().makeTranslation(0, 0, -zPivot));
  return {
    parts: parts.map((p) => ({ ...p, matrix: A.clone().multiply(p.matrix) })),
    colliders: [COL(-0.34, 0, -0.12, 0.34, 0.56, 1.32, 'carpet', tag)],
  };
}

/** Task-chair castor: rubber wheel + fork. */
function castor(x, z) {
  return [
    P(SPH(0.03, 10, 8), 'rubber.black', [x, 0.032, z]),
    P(CYL(0.012, 0.012, 0.05, 8), 'plastic.dark', [x, 0.07, z]),
  ];
}

/* ================================================================== */
/* Definition table                                                    */
/* ================================================================== */

export const PROPS = {};
const ORDER = [];

/**
 * Register a prop definition.
 * spec: { build, lod1?, mats, use, coll, acc, variants? }
 */
function def(id, name, size, tags, cat, spec) {
  PROPS[id] = {
    id, name, size, tags,
    build: spec.build,
    buildLod1: spec.lod1 ?? null,
    cat,
    mats: spec.mats,
    use: spec.use,
    coll: spec.coll,
    acc: spec.acc,
    variants: spec.variants ?? ['intact'],
  };
  ORDER.push(id);
}

/* ================================================================== */
/* OFFICE FURNITURE                                                    */
/* ================================================================== */

def('prop.deskStandard', 'Standard workstation desk', [1.6, 0.75, 0.8], ['office', 'cover'], 'furniture', {
  mats: ['laminate.grey', 'metal.paintedDark', 'plastic.dark'],
  use: 'openplanA, openplanB, it, execante',
  coll: 'single AABB 1.6 × 0.75 × 0.8 (solid under-desk volume)',
  acc: 'Reads as a metal-leg office desk at 8 m: 36 mm laminate top with beveled edge, C-legs with foot bars, rear modesty panel, cable grommet. Variants: intact | worn (darker top, skewed modesty panel).',
  variants: ['intact', 'worn'],
  build(o = {}) {
    const worn = o.variant === 'worn';
    const topMat = worn ? 'laminate.dark' : 'laminate.grey';
    const parts = [
      // Top with visible edge profile: main slab + slightly inset under-slab
      P(BB(1.6, 0.036, 0.8, 0.01), topMat, [0, 0.732, 0]),
      P(BB(1.52, 0.024, 0.72, 0.006), 'metal.paintedDark', [0, 0.702, 0]),
      // Cable grommet at the rear of the top
      P(CYL(0.032, 0.032, 0.01, 12), 'plastic.dark', [0.55, 0.752, 0.3]),
    ];
    // C-legs: two verticals + floor foot each side
    for (const sx of [-0.72, 0.72]) {
      parts.push(P(BB(0.07, 0.68, 0.06, 0.006), 'metal.paintedDark', [sx, 0.37, -0.24]));
      parts.push(P(BB(0.07, 0.68, 0.06, 0.006), 'metal.paintedDark', [sx, 0.37, 0.28]));
      parts.push(P(BB(0.08, 0.03, 0.7, 0.006), 'metal.paintedDark', [sx, 0.018, 0.02]));
    }
    // Modesty panel
    parts.push(P(BB(1.4, 0.34, 0.02, 0.005), 'metal.paintedDark', [0, 0.5, 0.33], worn ? [0, 0.02, 0.015] : undefined));
    return { parts, colliders: [cbox(1.6, 0.75, 0.8, 'wood', 'desk')] };
  },
  lod1() {
    return {
      parts: [
        P(BOX(1.6, 0.05, 0.8), 'laminate.grey', [0, 0.725, 0]),
        P(BOX(1.5, 0.7, 0.1), 'metal.paintedDark', [0, 0.35, 0.3]),
      ],
      colliders: [cbox(1.6, 0.75, 0.8, 'wood', 'desk')],
    };
  },
});

def('prop.deskReception', 'Reception counter desk', [3.2, 1.12, 1.0], ['office', 'cover', 'lobby'], 'furniture', {
  mats: ['wood.veneer', 'laminate.white', 'metal.brushed', 'drywall.brand'],
  use: 'lobby',
  coll: 'single AABB 3.2 × 1.12 × 1.0',
  acc: 'Two-tier reception counter: 0.74 m worktop behind a 1.12 m veneer transaction front with brushed-steel reveal and brand-navy accent band. Silhouette reads at 8 m; usable chest-high cover.',
  build() {
    const parts = [
      // Public front: full-height veneer with accent band and steel base reveal
      P(BB(3.2, 1.0, 0.12, 0.01), 'wood.veneer', [0, 0.56, -0.44]),
      P(BB(3.2, 0.09, 0.13, 0.006), 'drywall.brand', [0, 0.74, -0.442]),
      P(BB(3.14, 0.06, 0.1, 0.005), 'metal.brushed', [0, 0.03, -0.44]),
      // Transaction top overhanging the front
      P(BB(3.24, 0.05, 0.34, 0.012), 'wood.veneer', [0, 1.095, -0.36]),
      // Staff worktop
      P(BB(3.05, 0.035, 0.62, 0.008), 'laminate.white', [0, 0.725, 0.12]),
      // End panels
      P(BB(0.1, 1.0, 0.9, 0.01), 'wood.veneer', [-1.55, 0.5, 0.0]),
      P(BB(0.1, 1.0, 0.9, 0.01), 'wood.veneer', [1.55, 0.5, 0.0]),
      // Under-counter pedestals
      P(BB(0.42, 0.6, 0.5, 0.008), 'metal.paintedDark', [-0.9, 0.3, 0.14]),
      P(BB(0.42, 0.6, 0.5, 0.008), 'metal.paintedDark', [0.9, 0.3, 0.14]),
    ];
    return { parts, colliders: [cbox(3.2, 1.12, 1.0, 'wood', 'reception')] };
  },
  lod1() {
    return {
      parts: [
        P(BOX(3.2, 1.12, 0.5), 'wood.veneer', [0, 0.56, -0.25]),
        P(BOX(3.05, 0.74, 0.6, 0.01), 'laminate.white', [0, 0.37, 0.14]),
      ],
      colliders: [cbox(3.2, 1.12, 1.0, 'wood', 'reception')],
    };
  },
});

def('prop.deskExec', 'Executive desk', [2.2, 0.76, 1.05], ['office', 'cover', 'exec'], 'furniture', {
  mats: ['wood.dark', 'metal.brushed', 'leather.dark'],
  use: 'exec, execante',
  coll: 'single AABB 2.2 × 0.76 × 1.05',
  acc: 'Dark-veneer executive desk: 40 mm top with brushed reveal, twin drawer pedestals with individual drawer fronts and pulls, leather desk inlay. No bare untextured faces.',
  build() {
    const parts = [
      P(BB(2.2, 0.04, 1.05, 0.012), 'wood.dark', [0, 0.74, 0]),
      P(BB(1.0, 0.006, 0.6, 0.002), 'leather.dark', [0, 0.764, -0.05]),
      P(BB(2.1, 0.03, 0.95, 0.006), 'metal.brushed', [0, 0.705, 0]),
      // Modesty front (public side −Z)
      P(BB(1.9, 0.52, 0.03, 0.006), 'wood.dark', [0, 0.42, -0.48]),
    ];
    // Drawer pedestals with three drawer fronts each
    for (const sx of [-0.85, 0.85]) {
      parts.push(P(BB(0.46, 0.66, 0.98, 0.008), 'wood.dark', [sx, 0.36, 0]));
      for (let i = 0; i < 3; i++) {
        const y = 0.14 + i * 0.2;
        parts.push(P(BB(0.4, 0.16, 0.014, 0.004), 'wood.dark', [sx, y, 0.494]));
        parts.push(P(BB(0.12, 0.018, 0.02, 0.004), 'metal.brushed', [sx, y + 0.05, 0.5]));
      }
    }
    return { parts, colliders: [cbox(2.2, 0.76, 1.05, 'wood', 'desk')] };
  },
  lod1() {
    return {
      parts: [P(BOX(2.2, 0.76, 1.05), 'wood.dark', [0, 0.38, 0])],
      colliders: [cbox(2.2, 0.76, 1.05, 'wood', 'desk')],
    };
  },
});

def('prop.cubiclePanel', 'Cubicle partition panel', [1.5, 1.35, 0.06], ['office', 'cover'], 'furniture', {
  mats: ['fabric.cubicle', 'fabric.cubicleTeal', 'metal.aluminium'],
  use: 'openplanA, openplanB',
  coll: 'single AABB matching panel footprint (chest-high cover)',
  acc: '1.35 m acoustic panel: aluminium perimeter frame, fabric face with visible seam, cap rail and stabiliser feet. Stands unsupported. Variants: grey | teal fabric. opts.width stretches 0.9–1.8 m.',
  variants: ['grey', 'teal'],
  build(o = {}) {
    const w = Math.min(1.8, Math.max(0.9, o.width ?? 1.5));
    const fabric = o.variant === 'teal' ? 'fabric.cubicleTeal' : 'fabric.cubicle';
    const parts = [
      P(BB(w - 0.06, 1.16, 0.052, 0.006), fabric, [0, 0.66, 0]),
      // Seam line: slim recessed band across the fabric
      P(BB(w - 0.08, 0.014, 0.056, 0.003), 'metal.aluminium', [0, 0.66, 0]),
      // Frame: posts, top cap, bottom rail
      P(BB(0.05, 1.3, 0.06, 0.005), 'metal.aluminium', [-(w / 2 - 0.025), 0.69, 0]),
      P(BB(0.05, 1.3, 0.06, 0.005), 'metal.aluminium', [w / 2 - 0.025, 0.69, 0]),
      P(BB(w, 0.05, 0.07, 0.008), 'metal.aluminium', [0, 1.325, 0]),
      P(BB(w, 0.09, 0.06, 0.005), 'metal.paintedDark', [0, 0.085, 0]),
      // Stabiliser feet
      P(BB(0.06, 0.025, 0.3, 0.005), 'metal.paintedDark', [-(w / 2 - 0.03), 0.0125, 0]),
      P(BB(0.06, 0.025, 0.3, 0.005), 'metal.paintedDark', [w / 2 - 0.03, 0.0125, 0]),
    ];
    return { parts, colliders: [cbox(w, 1.35, 0.1, 'carpet', 'cubicle')] };
  },
});

def('prop.tableConference', 'Conference table', [3.6, 0.75, 1.2], ['office', 'cover'], 'furniture', {
  mats: ['wood.veneer', 'metal.paintedDark', 'plastic.dark'],
  use: 'conference',
  coll: 'single AABB 3.6 × 0.75 × 1.2',
  acc: '3.6 × 1.2 m veneer conference table: 45 mm top with edge reveal, twin column pedestals with cross feet, centre cable hatch. Ten chairs fit around it at real spacing.',
  build() {
    const parts = [
      P(BB(3.6, 0.045, 1.2, 0.014), 'wood.veneer', [0, 0.728, 0]),
      P(BB(3.5, 0.03, 1.1, 0.008), 'metal.paintedDark', [0, 0.69, 0]),
      P(BB(0.5, 0.018, 0.24, 0.005), 'plastic.dark', [0, 0.755, 0]),
    ];
    for (const sx of [-1.15, 1.15]) {
      parts.push(P(BB(0.16, 0.66, 0.7, 0.012), 'metal.paintedDark', [sx, 0.36, 0]));
      parts.push(P(BB(0.6, 0.05, 1.0, 0.01), 'metal.paintedDark', [sx, 0.028, 0]));
    }
    return { parts, colliders: [cbox(3.6, 0.75, 1.2, 'wood', 'table')] };
  },
  lod1() {
    return {
      parts: [P(BOX(3.6, 0.08, 1.2), 'wood.veneer', [0, 0.71, 0]), P(BOX(2.6, 0.68, 0.7), 'metal.paintedDark', [0, 0.34, 0])],
      colliders: [cbox(3.6, 0.75, 1.2, 'wood', 'table')],
    };
  },
});

def('prop.tableBoardroom', 'Boardroom table', [4.2, 0.75, 1.4], ['office', 'cover', 'exec'], 'furniture', {
  mats: ['wood.dark', 'metal.brushed', 'plastic.dark'],
  use: 'boardroom',
  coll: 'single AABB 4.2 × 0.75 × 1.4',
  acc: 'Fourteen-seat dark-veneer boardroom table with brushed twin plinths, under-top reveal and two flush cable hatches. Reads as the room centrepiece at 10 m.',
  build() {
    const parts = [
      P(BB(4.2, 0.05, 1.4, 0.016), 'wood.dark', [0, 0.725, 0]),
      P(BB(4.05, 0.035, 1.25, 0.008), 'metal.paintedDark', [0, 0.683, 0]),
      P(BB(0.5, 0.016, 0.26, 0.005), 'plastic.dark', [-1.0, 0.754, 0]),
      P(BB(0.5, 0.016, 0.26, 0.005), 'plastic.dark', [1.0, 0.754, 0]),
    ];
    for (const sx of [-1.35, 1.35]) {
      parts.push(P(BB(0.7, 0.62, 0.9, 0.014), 'metal.brushed', [sx, 0.36, 0]));
      parts.push(P(BB(0.8, 0.06, 1.05, 0.012), 'metal.brushed', [sx, 0.032, 0]));
    }
    return { parts, colliders: [cbox(4.2, 0.75, 1.4, 'wood', 'table')] };
  },
  lod1() {
    return {
      parts: [P(BOX(4.2, 0.08, 1.4), 'wood.dark', [0, 0.71, 0]), P(BOX(3.0, 0.68, 0.9), 'metal.brushed', [0, 0.34, 0])],
      colliders: [cbox(4.2, 0.75, 1.4, 'wood', 'table')],
    };
  },
});

def('prop.tableRound', 'Round collaboration table', [1.4, 0.74, 1.4], ['office'], 'furniture', {
  mats: ['laminate.white', 'metal.painted'],
  use: 'openplanB, breakroom, execlounge',
  coll: 'single AABB 1.4 × 0.74 × 1.4',
  acc: 'Ø1.4 m white laminate table on a column base with a four-spoke foot. Chairs tuck under the rim without clipping.',
  build(o = {}) {
    const r = (o.radius ?? 0.7);
    const parts = [
      P(CYL(r, r, 0.038, 28), 'laminate.white', [0, 0.72, 0]),
      P(CYL(r - 0.03, r - 0.03, 0.02, 28), 'metal.painted', [0, 0.694, 0]),
      P(CYL(0.045, 0.055, 0.66, 14), 'metal.painted', [0, 0.36, 0]),
    ];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      parts.push(P(BB(0.09, 0.035, r * 0.85, 0.008), 'metal.painted', [Math.sin(a) * r * 0.42, 0.02, Math.cos(a) * r * 0.42], [0, a, 0]));
    }
    return { parts, colliders: [cbox(r * 2, 0.74, r * 2, 'wood', 'table')] };
  },
});

def('prop.tableBreak', 'Break-room table', [1.1, 0.74, 1.1], ['breakroom'], 'breakroom', {
  mats: ['vinyl.plank', 'metal.painted'],
  use: 'breakroom',
  coll: 'single AABB 1.1 × 0.74 × 1.1',
  acc: 'Ø1.1 m café table, wood-look top with edge band on a pedestal base. Four chairs fit.',
  build() {
    const parts = [
      P(CYL(0.55, 0.55, 0.034, 24), 'vinyl.plank', [0, 0.722, 0]),
      P(CYL(0.56, 0.56, 0.014, 24), 'metal.painted', [0, 0.7, 0]),
      P(CYL(0.04, 0.05, 0.65, 12), 'metal.painted', [0, 0.36, 0]),
      P(CYL(0.3, 0.34, 0.03, 20), 'metal.painted', [0, 0.02, 0]),
    ];
    return { parts, colliders: [cbox(1.1, 0.74, 1.1, 'wood', 'table')] };
  },
});

def('prop.tableSide', 'Side table', [0.5, 0.52, 0.5], ['office', 'lounge'], 'furniture', {
  mats: ['wood.pale', 'metal.brushed'],
  use: 'lobby, waiting, mezz, execlounge, boardroomW',
  coll: 'single AABB 0.5 × 0.52 × 0.5',
  acc: 'Ø0.5 m side table: pale veneer disc on three splayed brushed legs.',
  build() {
    const parts = [P(CYL(0.25, 0.25, 0.03, 20), 'wood.pale', [0, 0.5, 0])];
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      parts.push(P(CYL(0.014, 0.018, 0.52, 8), 'metal.brushed', [Math.sin(a) * 0.15, 0.25, Math.cos(a) * 0.15], [0.16 * Math.cos(a), 0, -0.16 * Math.sin(a)]));
    }
    return { parts, colliders: [cbox(0.5, 0.52, 0.5, 'wood', 'table')] };
  },
});

def('prop.tableCoffee', 'Coffee table', [1.1, 0.4, 0.6], ['office', 'lounge'], 'furniture', {
  mats: ['wood.veneer', 'metal.blackAnodised'],
  use: 'lobby, waiting, exec, execlounge',
  coll: 'single AABB 1.1 × 0.4 × 0.6',
  acc: 'Low lounge table: veneer slab with under-shelf on black frame legs.',
  build() {
    const parts = [
      P(BB(1.1, 0.032, 0.6, 0.01), 'wood.veneer', [0, 0.384, 0]),
      P(BB(0.95, 0.018, 0.48, 0.005), 'metal.blackAnodised', [0, 0.14, 0]),
    ];
    for (const sx of [-0.5, 0.5]) {
      for (const sz of [-0.25, 0.25]) parts.push(P(BB(0.035, 0.37, 0.035, 0.005), 'metal.blackAnodised', [sx, 0.185, sz]));
    }
    return { parts, colliders: [cbox(1.1, 0.4, 0.6, 'wood', 'table')] };
  },
});

/* ---- Seating ---- */

def('prop.chairTask', 'Task chair', [0.66, 1.02, 0.66], ['office', 'seat'], 'furniture', {
  mats: ['fabric.chair', 'plastic.dark', 'metal.brushed', 'rubber.black'],
  use: 'openplanA, openplanB, it, execante, copy, server',
  coll: 'single AABB 0.6 × 1.0 × 0.6',
  acc: 'Real task chair anatomy: five-star base with castors, gas lift, tilt mechanism, contoured seat pan at 0.46 m, lumbar back, T-armrests. Variants: intact (grey) | alt (warm fabric) | worn (sagged back, one armrest missing) | tipped (knocked onto its back, low collider).',
  variants: ['intact', 'alt', 'worn', 'tipped'],
  build(o = {}) {
    const worn = o.variant === 'worn';
    const fab = o.variant === 'alt' ? 'fabric.chairAlt' : 'fabric.chair';
    const parts = [];
    // Five-star base
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3;
      const x = Math.sin(a) * 0.27;
      const z = Math.cos(a) * 0.27;
      parts.push(P(BB(0.055, 0.04, 0.3, 0.01), 'plastic.dark', [Math.sin(a) * 0.15, 0.055, Math.cos(a) * 0.15], [0, a, -0.1]));
      parts.push(...castor(x, z));
    }
    // Gas lift
    parts.push(P(CYL(0.028, 0.028, 0.18, 10), 'metal.brushed', [0, 0.17, 0]));
    parts.push(P(CYL(0.04, 0.04, 0.14, 10), 'plastic.dark', [0, 0.1, 0]));
    // Tilt mechanism + seat pan
    parts.push(P(BB(0.22, 0.05, 0.26, 0.008), 'plastic.dark', [0, 0.4, 0]));
    parts.push(P(BB(0.48, 0.075, 0.46, 0.022), fab, [0, 0.455, 0.01], worn ? [0.03, 0, 0.02] : undefined));
    // Back: post + lumbar cushion
    parts.push(P(BB(0.05, 0.3, 0.035, 0.008), 'plastic.dark', [0, 0.58, 0.23], [worn ? -0.22 : -0.12, 0, 0]));
    parts.push(P(BB(0.45, 0.56, 0.075, 0.024), fab, [0, 0.83, 0.245], [worn ? -0.2 : -0.1, 0, 0]));
    // Armrests
    const arms = worn ? [-0.27] : [-0.27, 0.27];
    for (const sx of arms) {
      parts.push(P(BB(0.035, 0.2, 0.05, 0.006), 'plastic.dark', [sx, 0.54, 0.06]));
      parts.push(P(BB(0.06, 0.03, 0.24, 0.01), 'plastic.dark', [sx, 0.65, 0.02]));
    }
    if (o.variant === 'tipped') return tipBack(parts);
    return { parts, colliders: [cbox(0.6, 1.0, 0.6, 'carpet', 'chair')] };
  },
  lod1(o = {}) {
    const fab = o.variant === 'alt' ? 'fabric.chairAlt' : 'fabric.chair';
    return {
      parts: [
        P(BOX(0.48, 0.08, 0.46), fab, [0, 0.45, 0]),
        P(BOX(0.45, 0.56, 0.08), fab, [0, 0.83, 0.24]),
        P(CYL(0.03, 0.03, 0.38, 6), 'metal.brushed', [0, 0.22, 0]),
        P(CYL(0.28, 0.28, 0.04, 8), 'plastic.dark', [0, 0.05, 0]),
      ],
      colliders: [cbox(0.6, 1.0, 0.6, 'carpet', 'chair')],
    };
  },
});

def('prop.chairExec', 'Executive chair', [0.7, 1.22, 0.7], ['office', 'seat', 'exec'], 'furniture', {
  mats: ['leather.dark', 'metal.brushed', 'plastic.dark', 'rubber.black'],
  use: 'exec, boardroom, execante',
  coll: 'single AABB 0.66 × 1.2 × 0.66',
  acc: 'High-back leather executive chair: five-star polished base, castors, gas lift, padded seat/back with headrest bulge, loop armrests. Variants: intact | tan.',
  variants: ['intact', 'tan'],
  build(o = {}) {
    const lea = o.variant === 'tan' ? 'leather.tan' : 'leather.dark';
    const parts = [];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      parts.push(P(BB(0.06, 0.045, 0.32, 0.012), 'metal.brushed', [Math.sin(a) * 0.16, 0.06, Math.cos(a) * 0.16], [0, a, -0.09]));
      parts.push(...castor(Math.sin(a) * 0.29, Math.cos(a) * 0.29));
    }
    parts.push(P(CYL(0.03, 0.03, 0.2, 10), 'metal.brushed', [0, 0.18, 0]));
    parts.push(P(BB(0.52, 0.1, 0.5, 0.03), lea, [0, 0.47, 0.01]));
    parts.push(P(BB(0.5, 0.72, 0.1, 0.032), lea, [0, 0.87, 0.26], [-0.09, 0, 0]));
    parts.push(P(BB(0.4, 0.14, 0.09, 0.028), lea, [0, 1.16, 0.285], [-0.14, 0, 0]));
    for (const sx of [-0.3, 0.3]) {
      parts.push(P(TOR(0.1, 0.02, 8, 14, Math.PI), 'metal.brushed', [sx, 0.56, 0.05], [0, Math.PI / 2, 0]));
      parts.push(P(BB(0.05, 0.025, 0.22, 0.008), lea, [sx, 0.66, 0.03]));
    }
    return { parts, colliders: [cbox(0.66, 1.2, 0.66, 'carpet', 'chair')] };
  },
  lod1(o = {}) {
    const lea = o.variant === 'tan' ? 'leather.tan' : 'leather.dark';
    return {
      parts: [
        P(BOX(0.52, 0.1, 0.5), lea, [0, 0.46, 0]),
        P(BOX(0.5, 0.85, 0.1), lea, [0, 0.95, 0.25]),
        P(CYL(0.28, 0.28, 0.06, 8), 'metal.brushed', [0, 0.06, 0]),
      ],
      colliders: [cbox(0.66, 1.2, 0.66, 'carpet', 'chair')],
    };
  },
});

def('prop.chairConference', 'Conference chair', [0.56, 0.88, 0.58], ['office', 'seat'], 'furniture', {
  mats: ['fabric.chairAlt', 'metal.brushed', 'plastic.dark'],
  use: 'conference, boardroom (spares), copy',
  coll: 'single AABB 0.56 × 0.88 × 0.58',
  acc: 'Cantilever visitor chair: continuous tube frame, padded seat and back, plastic glides. Stacks visually with itself. Variant: tipped (knocked onto its back).',
  variants: ['intact', 'tipped'],
  build(o = {}) {
    const parts = [
      // Cantilever tube frame: floor rails + risers + arm loop simplified as bars
      P(BB(0.04, 0.03, 0.56, 0.01), 'metal.brushed', [-0.24, 0.02, 0.0]),
      P(BB(0.04, 0.03, 0.56, 0.01), 'metal.brushed', [0.24, 0.02, 0.0]),
      P(CYL(0.016, 0.016, 0.44, 8), 'metal.brushed', [-0.24, 0.24, -0.22], [0.18, 0, 0]),
      P(CYL(0.016, 0.016, 0.44, 8), 'metal.brushed', [0.24, 0.24, -0.22], [0.18, 0, 0]),
      P(BB(0.5, 0.06, 0.46, 0.018), 'fabric.chairAlt', [0, 0.46, -0.02]),
      P(CYL(0.016, 0.016, 0.4, 8), 'metal.brushed', [-0.24, 0.62, 0.16], [-0.28, 0, 0]),
      P(CYL(0.016, 0.016, 0.4, 8), 'metal.brushed', [0.24, 0.62, 0.16], [-0.28, 0, 0]),
      P(BB(0.48, 0.4, 0.06, 0.018), 'fabric.chairAlt', [0, 0.72, 0.22], [-0.12, 0, 0]),
    ];
    if (o.variant === 'tipped') return tipBack(parts, 0.28);
    return { parts, colliders: [cbox(0.56, 0.88, 0.58, 'carpet', 'chair')] };
  },
});

def('prop.chairWaiting', 'Waiting-room chair', [0.58, 0.82, 0.6], ['office', 'seat', 'lobby'], 'furniture', {
  mats: ['fabric.sofa', 'metal.painted', 'plastic.dark'],
  use: 'waiting, lobby, execante',
  coll: 'single AABB 0.58 × 0.82 × 0.6',
  acc: 'Four-leg waiting chair with wide padded seat and back on a painted steel frame; gangs into rows on a shared beam when placed side by side.',
  build() {
    const parts = [
      P(BB(0.54, 0.08, 0.5, 0.024), 'fabric.sofa', [0, 0.44, 0]),
      P(BB(0.54, 0.42, 0.07, 0.024), 'fabric.sofa', [0, 0.66, 0.24], [-0.14, 0, 0]),
      P(BB(0.5, 0.04, 0.44, 0.008), 'metal.painted', [0, 0.38, 0]),
    ];
    for (const sx of [-0.24, 0.24]) {
      for (const sz of [-0.22, 0.22]) parts.push(P(CYL(0.015, 0.017, 0.38, 8), 'metal.painted', [sx, 0.19, sz]));
    }
    return { parts, colliders: [cbox(0.58, 0.82, 0.6, 'carpet', 'chair')] };
  },
});

def('prop.chairBreak', 'Break-room shell chair', [0.52, 0.8, 0.54], ['breakroom', 'seat'], 'breakroom', {
  mats: ['plastic.white', 'metal.painted'],
  use: 'breakroom',
  coll: 'single AABB 0.52 × 0.8 × 0.54',
  acc: 'Moulded shell café chair: one-piece seat/back shell on four splayed steel legs. Variant: dark shell.',
  variants: ['white', 'dark'],
  build(o = {}) {
    const shell = o.variant === 'dark' ? 'plastic.dark' : 'plastic.white';
    const parts = [
      P(BB(0.48, 0.045, 0.46, 0.02), shell, [0, 0.45, 0]),
      P(BB(0.46, 0.42, 0.045, 0.02), shell, [0, 0.65, 0.21], [-0.16, 0, 0]),
    ];
    for (const sx of [-0.2, 0.2]) {
      for (const sz of [-0.19, 0.21]) {
        parts.push(P(CYL(0.013, 0.015, 0.45, 8), 'metal.painted', [sx * 1.05, 0.22, sz], [sz > 0 ? -0.12 : 0.12, 0, sx > 0 ? -0.1 : 0.1]));
      }
    }
    return { parts, colliders: [cbox(0.52, 0.8, 0.54, 'vinyl', 'chair')] };
  },
});

def('prop.sofa', 'Three-seat sofa', [2.0, 0.82, 0.85], ['lounge', 'cover'], 'furniture', {
  mats: ['fabric.sofa', 'wood.dark', 'leather.tan'],
  use: 'lobby, waiting, exec, execlounge',
  coll: 'single AABB 2.0 × 0.82 × 0.85',
  acc: 'Three-seat sofa: plinth, three seat cushions with gaps, three back cushions, padded arms, timber feet. Variant: leather (tan). Usable waist-high cover.',
  variants: ['fabric', 'leather'],
  build(o = {}) {
    const fab = o.variant === 'leather' ? 'leather.tan' : 'fabric.sofa';
    const parts = [
      P(BB(1.96, 0.24, 0.8, 0.02), fab, [0, 0.22, 0]),
      P(BB(1.96, 0.42, 0.18, 0.03), fab, [0, 0.56, 0.32]),
    ];
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * 0.62;
      parts.push(P(BB(0.58, 0.14, 0.58, 0.04), fab, [x, 0.4, -0.06]));
      parts.push(P(BB(0.56, 0.3, 0.16, 0.05), fab, [x, 0.6, 0.27], [-0.1, 0, 0]));
    }
    for (const sx of [-0.94, 0.94]) parts.push(P(BB(0.14, 0.56, 0.78, 0.04), fab, [sx, 0.4, 0]));
    for (const sx of [-0.88, 0.88]) {
      for (const sz of [-0.34, 0.34]) parts.push(P(CYL(0.025, 0.035, 0.09, 8), 'wood.dark', [sx, 0.045, sz]));
    }
    return { parts, colliders: [cbox(2.0, 0.82, 0.85, 'carpet', 'sofa')] };
  },
  lod1(o = {}) {
    const fab = o.variant === 'leather' ? 'leather.tan' : 'fabric.sofa';
    return {
      parts: [P(BOX(2.0, 0.5, 0.85), fab, [0, 0.3, 0]), P(BOX(2.0, 0.4, 0.2), fab, [0, 0.6, 0.32])],
      colliders: [cbox(2.0, 0.82, 0.85, 'carpet', 'sofa')],
    };
  },
});

def('prop.chairLounge', 'Lounge chair', [0.85, 0.78, 0.85], ['lounge', 'seat'], 'furniture', {
  mats: ['leather.tan', 'fabric.sofa', 'metal.blackAnodised'],
  use: 'mezz, execlounge, boardroomW, exec',
  coll: 'single AABB 0.85 × 0.78 × 0.85',
  acc: 'Deep lounge chair: thick seat and wrap-around back on a black steel sled. Variants: tan leather | storm fabric.',
  variants: ['tan', 'fabric'],
  build(o = {}) {
    const fab = o.variant === 'fabric' ? 'fabric.sofa' : 'leather.tan';
    const parts = [
      P(BB(0.72, 0.2, 0.66, 0.045), fab, [0, 0.3, -0.02]),
      P(BB(0.72, 0.44, 0.14, 0.05), fab, [0, 0.56, 0.3], [-0.16, 0, 0]),
      P(BB(0.16, 0.34, 0.6, 0.045), fab, [-0.36, 0.42, 0]),
      P(BB(0.16, 0.34, 0.6, 0.045), fab, [0.36, 0.42, 0]),
      P(BB(0.76, 0.035, 0.05, 0.008), 'metal.blackAnodised', [0, 0.1, -0.3]),
      P(BB(0.76, 0.035, 0.05, 0.008), 'metal.blackAnodised', [0, 0.1, 0.3]),
      P(BB(0.05, 0.1, 0.66, 0.008), 'metal.blackAnodised', [-0.34, 0.05, 0]),
      P(BB(0.05, 0.1, 0.66, 0.008), 'metal.blackAnodised', [0.34, 0.05, 0]),
    ];
    return { parts, colliders: [cbox(0.85, 0.78, 0.85, 'carpet', 'chair')] };
  },
});

/* ---- Storage ---- */

def('prop.cabinetFiling', 'Filing cabinet', [0.45, 1.32, 0.62], ['office', 'cover', 'storage'], 'furniture', {
  mats: ['metal.painted', 'metal.brushed', 'plastic.dark', 'paper.white'],
  use: 'openplanA, archive, execante, records2, northcorr',
  coll: 'single AABB 0.45 × 1.32 × 0.62',
  acc: 'Four-drawer steel filing cabinet 0.45 × 1.32 × 0.62 with recessed drawer fronts, bar pulls and label holders. Variants: intact | open (top drawer pulled, files visible) | worn (dented, one pull missing). Chest-high cover.',
  variants: ['intact', 'open', 'worn'],
  build(o = {}) {
    const open = o.variant === 'open';
    const worn = o.variant === 'worn';
    const parts = [
      P(BB(0.45, 1.3, 0.62, 0.008), 'metal.painted', [0, 0.66, 0]),
      P(BB(0.46, 0.02, 0.63, 0.005), 'metal.painted', [0, 1.31, 0]),
    ];
    for (let i = 0; i < 4; i++) {
      const y = 0.2 + i * 0.3;
      const isOpen = open && i === 3;
      const zf = isOpen ? -0.55 : -0.312;
      parts.push(P(BB(0.4, 0.26, 0.018, 0.005), 'metal.painted', [0, y, zf]));
      if (!(worn && i === 1)) parts.push(P(BB(0.16, 0.022, 0.025, 0.004), 'metal.brushed', [0, y + 0.09, zf - 0.012]));
      parts.push(P(BB(0.09, 0.032, 0.008, 0.002), 'plastic.dark', [0.12, y + 0.02, zf - 0.012]));
      if (isOpen) {
        // Drawer box + hanging files
        parts.push(P(BB(0.38, 0.2, 0.5, 0.005), 'metal.painted', [0, y - 0.02, -0.3]));
        for (let f = 0; f < 6; f++) parts.push(P(BB(0.34, 0.14, 0.012, 0.002), 'paper.cream', [0, y + 0.05, -0.14 - f * 0.055]));
      }
    }
    if (worn) parts.push(P(BB(0.2, 0.16, 0.02, 0.004), 'metal.paintedDark', [0.1, 0.35, -0.31], [0, 0, 0.2]));
    const colliders = [cbox(0.45, 1.32, 0.62, 'metal', 'cabinet')];
    if (open) colliders.push(cbox(0.4, 1.32, 0.3, 'metal', 'cabinet', 0, -0.45));
    return { parts, colliders };
  },
});

def('prop.drawerUnit', 'Mobile drawer pedestal', [0.42, 0.6, 0.55], ['office', 'storage'], 'furniture', {
  mats: ['metal.painted', 'plastic.dark', 'metal.brushed'],
  use: 'openplanA, it, execante',
  coll: 'single AABB 0.42 × 0.6 × 0.55',
  acc: 'Under-desk pedestal: three drawers, cushion top pad, four castors. Rolls under the standard desk without clipping.',
  build() {
    const parts = [
      P(BB(0.42, 0.52, 0.55, 0.008), 'metal.painted', [0, 0.32, 0]),
      P(BB(0.4, 0.03, 0.53, 0.012), 'fabric.chair', [0, 0.595, 0]),
    ];
    for (let i = 0; i < 3; i++) {
      const y = 0.16 + i * 0.15;
      parts.push(P(BB(0.36, 0.12, 0.014, 0.004), 'metal.painted', [0, y, -0.278]));
      parts.push(P(BB(0.12, 0.016, 0.02, 0.003), 'metal.brushed', [0, y + 0.04, -0.288]));
    }
    for (const sx of [-0.16, 0.16]) for (const sz of [-0.21, 0.21]) parts.push(...castor(sx, sz));
    return { parts, colliders: [cbox(0.42, 0.6, 0.55, 'metal', 'pedestal')] };
  },
});

def('prop.shelfUnit', 'Open shelving unit', [0.9, 1.8, 0.35], ['office', 'storage', 'cover'], 'furniture', {
  mats: ['metal.paintedDark', 'laminate.grey'],
  use: 'it, copy, openplanB',
  coll: 'single AABB 0.9 × 1.8 × 0.35',
  acc: 'Steel frame shelving with five laminate shelves; posts read individually at 2 m. Dressed by dress.js with boxes/binders.',
  build() {
    const parts = [];
    for (const sx of [-0.43, 0.43]) {
      for (const sz of [-0.155, 0.155]) parts.push(P(BB(0.04, 1.8, 0.04, 0.005), 'metal.paintedDark', [sx, 0.9, sz]));
    }
    for (let i = 0; i < 5; i++) parts.push(P(BB(0.88, 0.028, 0.34, 0.006), 'laminate.grey', [0, 0.12 + i * 0.4, 0]));
    return { parts, colliders: [cbox(0.9, 1.8, 0.35, 'metal', 'shelf')] };
  },
});

def('prop.rackArchive', 'Mobile archive racking', [4.0, 2.2, 0.48], ['storage', 'cover'], 'furniture', {
  mats: ['metal.painted', 'metal.paintedDark', 'cardboard.box', 'signage.atlas (flat file-spine strips)'],
  use: 'archive, records2',
  coll: 'single AABB run × 2.2 × 0.48',
  acc: 'Mobile racking run: steel uprights and shelves on a floor rail, end panel with drive wheel, shelves dressed with archive boxes and file runs. opts.length sets run 2–5 m. Full-height cover.',
  build(o = {}) {
    const L = Math.min(5, Math.max(2, o.length ?? 4));
    const rng = o.rng ?? rngFor('rackArchive');
    const parts = [
      // Floor rail + base
      P(BB(L + 0.1, 0.05, 0.5, 0.008), 'metal.paintedDark', [0, 0.025, 0]),
      // End panel with drive wheel
      P(BB(0.05, 2.1, 0.48, 0.008), 'metal.painted', [-L / 2 + 0.025, 1.1, 0]),
      P(TOR(0.11, 0.018, 8, 18), 'metal.paintedDark', [-L / 2 - 0.005, 1.05, 0], [0, Math.PI / 2, 0]),
      P(CYL(0.02, 0.02, 0.1, 8), 'metal.paintedDark', [-L / 2 - 0.02, 1.05, 0], [0, 0, Math.PI / 2]),
      P(BB(0.05, 2.1, 0.48, 0.008), 'metal.painted', [L / 2 - 0.025, 1.1, 0]),
    ];
    const bays = Math.round(L / 1.0);
    const bayW = L / bays;
    for (let b = 1; b < bays; b++) parts.push(P(BB(0.04, 2.1, 0.46, 0.006), 'metal.painted', [-L / 2 + b * bayW, 1.1, 0]));
    for (let s = 0; s < 5; s++) {
      const y = 0.16 + s * 0.46;
      parts.push(P(BB(L - 0.08, 0.03, 0.44, 0.006), 'metal.painted', [0, y, 0]));
      // Archive boxes / file runs per bay
      for (let b = 0; b < bays; b++) {
        const bx = -L / 2 + (b + 0.5) * bayW;
        const style = rng();
        if (style < 0.55) {
          const n = 2 + Math.floor(rng() * 2);
          for (let i = 0; i < n; i++) {
            parts.push(P(BB(0.3, 0.26, 0.38, 0.006), 'cardboard.box', [bx + (i - (n - 1) / 2) * 0.31, y + 0.15, 0]));
          }
        } else if (style < 0.85) {
          parts.push(...bookRow(bayW - 0.12, y + 0.015, rng, 0, 0.3, true).map((p) => {
            p.matrix = new THREE.Matrix4().makeTranslation(bx, 0, 0).multiply(p.matrix);
            return p;
          }));
        }
        // else: empty bay — someone has been through these files
      }
    }
    return { parts, colliders: [cbox(L, 2.2, 0.48, 'metal', 'rack')] };
  },
  lod1(o = {}) {
    const L = Math.min(5, Math.max(2, o.length ?? 4));
    return {
      parts: [P(BOX(L, 2.2, 0.48), 'metal.painted', [0, 1.1, 0])],
      colliders: [cbox(L, 2.2, 0.48, 'metal', 'rack')],
    };
  },
});

def('prop.bookcase', 'Veneer bookcase', [0.9, 2.0, 0.32], ['office', 'storage', 'cover'], 'furniture', {
  mats: ['wood.veneer', 'plastic.smooth', 'signage.atlas (flat book-spine strips)'],
  use: 'exec, boardroom, execante',
  coll: 'single AABB 0.9 × 2.0 × 0.32',
  acc: 'Closed-back veneer bookcase, four shelves dressed with flat-colour spine strips (darker foot band, pale title bar — no speckle noise); occasional gaps and inset rows for life.',
  build(o = {}) {
    const rng = o.rng ?? rngFor('bookcase');
    const parts = [
      P(BB(0.9, 2.0, 0.05, 0.008), 'wood.veneer', [0, 1.0, 0.135]),
      P(BB(0.05, 2.0, 0.32, 0.008), 'wood.veneer', [-0.425, 1.0, 0]),
      P(BB(0.05, 2.0, 0.32, 0.008), 'wood.veneer', [0.425, 1.0, 0]),
      P(BB(0.9, 0.05, 0.32, 0.008), 'wood.veneer', [0, 1.975, 0]),
      P(BB(0.9, 0.08, 0.32, 0.008), 'wood.veneer', [0, 0.04, 0]),
    ];
    for (let s = 0; s < 4; s++) {
      const y = 0.1 + s * 0.46;
      parts.push(P(BB(0.8, 0.028, 0.3, 0.005), 'wood.veneer', [0, y + 0.014, 0]));
      parts.push(...bookRow(0.76, y + 0.03, rng, 0.02, 0.3));
    }
    return { parts, colliders: [cbox(0.9, 2.0, 0.32, 'wood', 'bookcase')] };
  },
  lod1() {
    return {
      parts: [P(BOX(0.9, 2.0, 0.32), 'wood.veneer', [0, 1.0, 0])],
      colliders: [cbox(0.9, 2.0, 0.32, 'wood', 'bookcase')],
    };
  },
});

def('prop.lockerBank', 'Staff locker bank', [1.2, 1.8, 0.45], ['office', 'storage', 'cover'], 'furniture', {
  mats: ['metal.brushedV', 'metal.paintedDark', 'plastic.dark'],
  use: 'openplanB',
  coll: 'single AABB 1.2 × 1.8 × 0.45',
  acc: 'Four-column locker bank with vent slots, individual doors, latches and number plates; one door ajar for storytelling.',
  build() {
    const parts = [P(BB(1.2, 1.76, 0.45, 0.008), 'metal.paintedDark', [0, 0.9, 0]), P(BB(1.22, 0.04, 0.46, 0.006), 'metal.paintedDark', [0, 1.8, 0])];
    for (let c = 0; c < 4; c++) {
      const x = -0.45 + c * 0.3;
      const ajar = c === 2;
      parts.push(P(BB(0.27, 1.66, 0.02, 0.004), 'metal.brushedV', [x, 0.9, ajar ? -0.26 : -0.226], ajar ? [0, 0.5, 0] : undefined));
      parts.push(P(BB(0.05, 0.09, 0.015, 0.003), 'plastic.dark', [x + 0.09, 1.12, ajar ? -0.28 : -0.235]));
      for (let v = 0; v < 3; v++) parts.push(P(BB(0.16, 0.012, 0.01, 0.002), 'metal.paintedDark', [x, 0.3 + v * 0.05, ajar ? -0.27 : -0.238]));
    }
    return { parts, colliders: [cbox(1.2, 1.8, 0.45, 'metal', 'locker')] };
  },
});

def('prop.credenza', 'Credenza sideboard', [1.8, 0.72, 0.5], ['office', 'storage', 'exec', 'cover'], 'furniture', {
  mats: ['wood.dark', 'metal.brushed', 'laminate.white'],
  use: 'boardroom, boardroomW, exec, execlounge',
  coll: 'single AABB 1.8 × 0.72 × 0.5',
  acc: 'Low executive sideboard: veneer carcass, four sliding door fronts with brushed pulls, plinth recess. Waist-high cover.',
  build() {
    const parts = [
      P(BB(1.8, 0.62, 0.5, 0.01), 'wood.dark', [0, 0.39, 0]),
      P(BB(1.84, 0.035, 0.54, 0.01), 'wood.dark', [0, 0.7, 0]),
      P(BB(1.68, 0.08, 0.42, 0.006), 'metal.paintedDark', [0, 0.04, 0]),
    ];
    for (let i = 0; i < 4; i++) {
      const x = -0.66 + i * 0.44;
      parts.push(P(BB(0.42, 0.5, 0.016, 0.004), i % 2 ? 'wood.dark' : 'laminate.white', [x, 0.39, -0.256]));
      parts.push(P(BB(0.016, 0.14, 0.02, 0.003), 'metal.brushed', [x + 0.17, 0.39, -0.262]));
    }
    return { parts, colliders: [cbox(1.8, 0.72, 0.5, 'wood', 'credenza')] };
  },
});

def('prop.consoleTable', 'Corridor console table', [1.2, 0.8, 0.35], ['office', 'exec'], 'furniture', {
  mats: ['wood.dark', 'metal.blackAnodised'],
  use: 'execspine, execcorr, mezz',
  coll: 'single AABB 1.2 × 0.8 × 0.35',
  acc: 'Slim wall console on black frame; carries lamp/plant clutter from dress.js.',
  build() {
    const parts = [P(BB(1.2, 0.035, 0.35, 0.01), 'wood.dark', [0, 0.78, 0])];
    for (const sx of [-0.55, 0.55]) {
      parts.push(P(BB(0.035, 0.78, 0.035, 0.005), 'metal.blackAnodised', [sx, 0.39, -0.15]));
      parts.push(P(BB(0.035, 0.78, 0.035, 0.005), 'metal.blackAnodised', [sx, 0.39, 0.15]));
    }
    parts.push(P(BB(1.1, 0.03, 0.3, 0.006), 'metal.blackAnodised', [0, 0.12, 0]));
    return { parts, colliders: [cbox(1.2, 0.8, 0.35, 'wood', 'console')] };
  },
});

def('prop.displayCase', 'Brand display case', [0.6, 1.5, 0.6], ['exec', 'lobby'], 'furniture', {
  mats: ['wood.dark', 'glass.clear', 'metal.brushed', 'drywall.brand'],
  use: 'execcorr, lobby',
  coll: 'single AABB 0.6 × 1.5 × 0.6',
  acc: 'Museum-style display plinth with glass hood and a lit model/award inside; glass reads as glass.',
  build() {
    const parts = [
      P(BB(0.6, 0.9, 0.6, 0.012), 'wood.dark', [0, 0.45, 0]),
      P(BB(0.56, 0.02, 0.56, 0.005), 'metal.brushed', [0, 0.91, 0]),
      P(BOX(0.5, 0.55, 0.5), 'glass.clear', [0, 1.2, 0]),
      P(BB(0.5, 0.02, 0.5, 0.005), 'metal.brushed', [0, 1.48, 0]),
      // Award: star on a small plinth
      P(BB(0.14, 0.05, 0.14, 0.006), 'wood.dark', [0, 0.945, 0]),
      P(CYL(0.02, 0.05, 0.16, 5), 'metal.brushed', [0, 1.08, 0]),
      P(SPH(0.05, 8, 6), 'metal.brushed', [0, 1.2, 0]),
    ];
    return { parts, colliders: [cbox(0.6, 1.5, 0.6, 'wood', 'display')] };
  },
});

def('prop.coatStand', 'Coat stand', [0.45, 1.75, 0.45], ['office'], 'furniture', {
  mats: ['metal.blackAnodised', 'fabric.sofa', 'fabric.chairAlt'],
  use: 'execante, conference, it, boardroom',
  coll: 'single AABB 0.45 × 1.75 × 0.45 (thin pole, small box)',
  acc: 'Pole coat stand with four hook arms and splayed feet. Variant: coat (a draped winter coat hangs on it).',
  variants: ['bare', 'coat'],
  build(o = {}) {
    const parts = [P(CYL(0.02, 0.024, 1.7, 10), 'metal.blackAnodised', [0, 0.85, 0])];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      parts.push(P(CYL(0.009, 0.009, 0.2, 6), 'metal.blackAnodised', [Math.sin(a) * 0.09, 1.62, Math.cos(a) * 0.09], [Math.cos(a) * 1.1, 0, -Math.sin(a) * 1.1]));
      parts.push(P(BB(0.05, 0.03, 0.35, 0.008), 'metal.blackAnodised', [Math.sin(a) * 0.14, 0.025, Math.cos(a) * 0.14], [0, a, 0]));
    }
    if (o.variant === 'coat') {
      parts.push(P(BB(0.4, 0.85, 0.22, 0.05), 'fabric.sofa', [0.1, 1.2, 0.02], [0, 0.3, 0.06]));
      parts.push(P(BB(0.34, 0.3, 0.18, 0.05), 'fabric.chairAlt', [0.1, 0.72, 0.02], [0, 0.3, 0]));
    }
    return { parts, colliders: [cbox(0.4, 1.75, 0.4, 'metal', 'coatstand')] };
  },
});

def('prop.coatHookRail', 'Wall coat hooks', [0.8, 0.12, 0.14], ['office'], 'furniture', {
  mats: ['wood.pale', 'metal.brushed', 'fabric.sofa'],
  use: 'breakroom, copy, janitor, it',
  coll: 'none — wall mounted above head height of blockage',
  acc: 'Wall rail with four hooks; variant hangs a coat and a scarf. Mount at 1.6 m.',
  variants: ['bare', 'coat'],
  build(o = {}) {
    const parts = [P(BB(0.8, 0.09, 0.02, 0.005), 'wood.pale', [0, 0.06, 0])];
    for (let i = 0; i < 4; i++) {
      const x = -0.3 + i * 0.2;
      parts.push(P(CYL(0.01, 0.01, 0.07, 6), 'metal.brushed', [x, 0.05, -0.045], [Math.PI / 2.4, 0, 0]));
    }
    if (o.variant === 'coat') {
      parts.push(P(BB(0.34, 0.7, 0.14, 0.045), 'fabric.sofa', [-0.1, -0.32, -0.09]));
      parts.push(P(BB(0.1, 0.5, 0.06, 0.02), 'fabric.chairAlt', [0.18, -0.22, -0.07]));
    }
    return { parts, colliders: [] };
  },
});

def('prop.plantFloor', 'Potted floor plant', [0.55, 1.5, 0.55], ['decor'], 'furniture', {
  mats: ['plastic.dark', 'fabric.cubicleTeal', 'concrete.dark', 'dirtless'],
  use: 'lobby, waiting, spine, exec, mezz, execcorr',
  coll: 'single AABB 0.5 × 0.9 × 0.5 (pot only; foliage non-blocking)',
  acc: 'Office ficus: tapered pot, soil disc, trunk and a clustered foliage crown in desaturated evergreen. Silhouette reads at 8 m. Variants: dark pot | concrete pot.',
  variants: ['dark', 'concrete'],
  build(o = {}) {
    const rng = o.rng ?? rngFor('plant');
    const potMat = o.variant === 'concrete' ? 'concrete.dark' : 'plastic.dark';
    const parts = [
      P(lathe('pot.floor', [[0.0, 0], [0.19, 0], [0.24, 0.42], [0.2, 0.44], [0.16, 0.42], [0.16, 0.05], [0, 0.05]]), potMat, [0, 0, 0]),
      P(CYL(0.155, 0.155, 0.02, 14), 'concrete.dark', [0, 0.41, 0]),
      P(CYL(0.02, 0.028, 0.55, 8), 'wood.dark', [0, 0.68, 0]),
    ];
    for (let i = 0; i < 7; i++) {
      const a = rng() * Math.PI * 2;
      const r = 0.05 + rng() * 0.16;
      const y = 1.0 + rng() * 0.38;
      const s = 0.12 + rng() * 0.1;
      parts.push(P(SPH(1, 8, 6), 'fabric.cubicleTeal', [Math.sin(a) * r, y, Math.cos(a) * r], [rng(), rng(), rng()], [s * 1.3, s, s * 1.15]));
    }
    return { parts, colliders: [cbox(0.5, 0.9, 0.5, 'plastic', 'plant')] };
  },
  lod1() {
    return {
      parts: [
        P(CYL(0.22, 0.17, 0.44, 8), 'plastic.dark', [0, 0.22, 0]),
        P(SPH(0.3, 8, 6), 'fabric.cubicleTeal', [0, 1.2, 0], undefined, [1, 1.3, 1]),
      ],
      colliders: [cbox(0.5, 0.9, 0.5, 'plastic', 'plant')],
    };
  },
});

def('prop.rugArea', 'Area rug', [2.6, 0.02, 1.8], ['decor'], 'furniture', {
  mats: ['carpet.exec', 'carpet.warm', 'leather.dark'],
  use: 'exec, execlounge, boardroomW',
  coll: 'none — flat floor dressing, walkable',
  acc: 'Bound-edge area rug: 18 mm pile slab with a stitched leather binding strip on all four sides; lies flat, no collider. Variants: exec (slate) | warm.',
  variants: ['exec', 'warm'],
  build(o = {}) {
    const m = o.variant === 'warm' ? 'carpet.warm' : 'carpet.exec';
    const w = 2.6;
    const d = 1.8;
    return {
      parts: [
        P(BB(w - 0.06, 0.016, d - 0.06, 0.004), m, [0, 0.008, 0]),
        P(BB(w, 0.014, 0.05, 0.003), 'leather.dark', [0, 0.007, -d / 2 + 0.025]),
        P(BB(w, 0.014, 0.05, 0.003), 'leather.dark', [0, 0.007, d / 2 - 0.025]),
        P(BB(0.05, 0.014, d - 0.1, 0.003), 'leather.dark', [-w / 2 + 0.025, 0.007, 0]),
        P(BB(0.05, 0.014, d - 0.1, 0.003), 'leather.dark', [w / 2 - 0.025, 0.007, 0]),
      ],
      colliders: [],
    };
  },
});

def('prop.lampFloor', 'Floor lamp', [0.42, 1.62, 0.42], ['decor'], 'furniture', {
  mats: ['metal.blackAnodised', 'fabric.chairAlt', 'emissive.warm'],
  use: 'exec, execlounge, waiting',
  coll: 'small AABB 0.34 × 1.62 × 0.34 on the base',
  acc: 'Standing lamp: weighted disc base, slim column, drum shade in warm fabric with an emissive under-disc when lit. Variants: on | off.',
  variants: ['on', 'off'],
  build(o = {}) {
    const on = o.variant !== 'off';
    return {
      parts: [
        P(CYL(0.155, 0.17, 0.028, 16), 'metal.blackAnodised', [0, 0.014, 0]),
        P(CYL(0.013, 0.013, 1.28, 8), 'metal.blackAnodised', [0, 0.67, 0]),
        P(CYL(0.165, 0.185, 0.3, 16, true), 'fabric.chairAlt', [0, 1.44, 0]),
        P(CYL(0.15, 0.15, 0.006, 14), on ? 'emissive.warm' : 'plastic.dark', [0, 1.3, 0]),
      ],
      colliders: [cbox(0.34, 1.62, 0.34, 'metal', 'lamp')],
    };
  },
});

def('prop.decanterSet', 'Decanter set', [0.42, 0.26, 0.26], ['decor', 'desk'], 'clutter', {
  mats: ['metal.brushed', 'glass.tinted'],
  use: 'exec side table, execlounge',
  coll: 'none — small clutter',
  acc: 'Brushed tray with a faceted decanter (stopper) and two tumblers; glass reads by silhouette and tint.',
  build(o = {}) {
    const rng = o.rng ?? rngFor('decanter');
    return {
      parts: [
        P(BB(0.4, 0.016, 0.24, 0.004), 'metal.brushed', [0, 0.008, 0]),
        P(lathe('decanter', [[0, 0], [0.055, 0], [0.062, 0.05], [0.05, 0.13], [0.02, 0.15], [0.02, 0.2], [0.028, 0.21], [0, 0.21]], 10), 'glass.tinted', [-0.1, 0.016, 0]),
        P(SPH(0.024, 8, 6), 'glass.tinted', [-0.1, 0.24, 0]),
        P(CYL(0.033, 0.029, 0.085, 10), 'glass.tinted', [0.06, 0.059, 0.05], [0, rng(), 0]),
        P(CYL(0.033, 0.029, 0.085, 10), 'glass.tinted', [0.13, 0.059, -0.05], [0, rng(), 0]),
      ],
      colliders: [],
    };
  },
});

def('prop.coatDraped', 'Draped coat', [0.5, 0.62, 0.26], ['clutter', 'story'], 'clutter', {
  mats: ['fabric.sofa', 'fabric.cubicle', 'leather.dark'],
  use: 'chair backs, coat stand — evacuation storytelling',
  coll: 'none — soft dressing',
  acc: 'Winter coat left draped over a chair back or hook: shoulder roll, two hanging front panels, sleeves swinging free, contrast collar. Pivot at the hem (y=0). Variants: navy | grey.',
  variants: ['navy', 'grey'],
  build(o = {}) {
    const m = o.variant === 'grey' ? 'fabric.cubicle' : 'fabric.sofa';
    const rng = o.rng ?? rngFor('coat');
    const sway = (rng() - 0.5) * 0.1;
    return {
      parts: [
        // back panel falling behind the chair back
        P(BB(0.42, 0.5, 0.045, 0.012), m, [0, 0.29, 0.055], [0.1, sway, 0]),
        // two front halves, slightly splayed
        P(BB(0.19, 0.44, 0.04, 0.01), m, [-0.11, 0.24, -0.02], [-0.08, sway, 0.1]),
        P(BB(0.19, 0.4, 0.04, 0.01), m, [0.11, 0.22, -0.025], [-0.1, sway, -0.13]),
        // shoulder roll over the support
        P(CAP(0.055, 0.3, 4, 8), m, [0, 0.56, 0.015], [0, 0, Math.PI / 2]),
        // sleeves
        P(CAP(0.04, 0.3, 4, 8), m, [-0.235, 0.36, 0.01], [0.1, 0, 0.28]),
        P(CAP(0.04, 0.28, 4, 8), m, [0.235, 0.34, 0.02], [-0.06, 0, -0.32]),
        // collar
        P(BB(0.2, 0.05, 0.06, 0.008), 'leather.dark', [0, 0.585, -0.015], [-0.25, 0, 0]),
      ],
      colliders: [],
    };
  },
});

def('prop.benchStone', 'Stone bench', [1.8, 0.45, 0.55], ['decor', 'cover'], 'furniture', {
  mats: ['concrete.polished', 'concrete.dark'],
  use: 'lobby, mezz',
  coll: 'single AABB 1.8 × 0.45 × 0.55 (knee-high hard cover)',
  acc: 'Polished concrete lobby bench: 120 mm slab seat with eased edges on two rough-cast plinths; sits dead flat, believable architectural furniture that doubles as low cover.',
  build() {
    return {
      parts: [
        P(BB(1.8, 0.12, 0.55, 0.014), 'concrete.polished', [0, 0.39, 0]),
        P(BB(0.5, 0.34, 0.44, 0.01), 'concrete.dark', [-0.55, 0.17, 0]),
        P(BB(0.5, 0.34, 0.44, 0.01), 'concrete.dark', [0.55, 0.17, 0]),
      ],
      colliders: [cbox(1.8, 0.45, 0.55, 'concrete', 'bench')],
    };
  },
});

def('prop.planterLow', 'Interior planter run', [1.8, 0.55, 0.5], ['decor', 'cover'], 'furniture', {
  mats: ['metal.paintedDark', 'concrete.dark', 'fabric.cubicleTeal'],
  use: 'lobby, mezz — natural chest-high cover with foliage',
  coll: 'single AABB 1.8 × 0.55 × 0.5 (planter box only; foliage non-blocking)',
  acc: 'Rectangular steel planter with rolled rim and recessed soil bed, dressed with a staggered evergreen hedge to ~0.95 m. Cover you can shoot over standing, hide behind crouched.',
  build(o = {}) {
    const rng = o.rng ?? rngFor('planterLow');
    const parts = [
      P(BB(1.8, 0.52, 0.5, 0.012), 'metal.paintedDark', [0, 0.26, 0]),
      P(BB(1.84, 0.05, 0.54, 0.008), 'metal.paintedDark', [0, 0.525, 0]),
      P(BB(1.68, 0.03, 0.38, 0.006), 'concrete.dark', [0, 0.51, 0]),
    ];
    for (let i = 0; i < 6; i++) {
      const x = -0.72 + i * 0.29 + (rng() - 0.5) * 0.08;
      const s = 0.14 + rng() * 0.09;
      parts.push(P(SPH(1, 8, 6), 'fabric.cubicleTeal', [x, 0.62 + rng() * 0.18, (rng() - 0.5) * 0.16], [rng(), rng(), rng()], [s, s * 1.35, s]));
    }
    return { parts, colliders: [cbox(1.8, 0.55, 0.5, 'metal', 'planter')] };
  },
});

def('prop.whiteboard', 'Whiteboard', [1.8, 1.2, 0.06], ['office', 'wall'], 'furniture', {
  mats: ['laminate.white', 'metal.aluminium', 'plastic.dark'],
  use: 'conference, it, openplanB, boardroom, copy',
  coll: 'none — wall mounted',
  acc: 'Wall whiteboard: white face, aluminium frame, pen tray with markers and an eraser. Writing overlay applied by signage.js at dressing time. Pivot at board centre-bottom against the wall (+Z into wall).',
  build() {
    const parts = [
      P(BB(1.8, 1.2, 0.03, 0.006), 'laminate.white', [0, 0.6, 0]),
      P(BB(1.84, 0.04, 0.05, 0.005), 'metal.aluminium', [0, 1.21, 0]),
      P(BB(1.84, 0.04, 0.05, 0.005), 'metal.aluminium', [0, -0.01, 0]),
      P(BB(0.04, 1.2, 0.05, 0.005), 'metal.aluminium', [-0.91, 0.6, 0]),
      P(BB(0.04, 1.2, 0.05, 0.005), 'metal.aluminium', [0.91, 0.6, 0]),
      P(BB(0.5, 0.025, 0.07, 0.005), 'metal.aluminium', [0, 0.02, -0.045]),
      P(CYL(0.008, 0.008, 0.12, 6), 'plastic.dark', [-0.1, 0.045, -0.06], [0, 0, Math.PI / 2]),
      P(CYL(0.008, 0.008, 0.12, 6), 'plastic.smooth', [0.08, 0.045, -0.06], [0, 0.4, Math.PI / 2]),
      P(BB(0.11, 0.03, 0.05, 0.006), 'fabric.chair', [0.2, 0.05, -0.06]),
    ];
    return { parts, colliders: [] };
  },
});

def('prop.wallClock', 'Wall clock', [0.32, 0.32, 0.06], ['office', 'wall'], 'furniture', {
  mats: ['plastic.dark', 'plastic.white', 'metal.blackAnodised'],
  use: 'most rooms',
  coll: 'none — wall mounted',
  acc: 'Ø0.32 office clock: dark rim, white face, hour/minute hands frozen at 10:08 (storm knocked the power). Pivot at clock centre against wall.',
  build() {
    return {
      parts: [
        P(CYL(0.16, 0.16, 0.045, 20), 'plastic.dark', [0, 0, -0.005], [Math.PI / 2, 0, 0]),
        P(CYL(0.14, 0.14, 0.012, 20), 'plastic.white', [0, 0, -0.028], [Math.PI / 2, 0, 0]),
        P(BB(0.012, 0.09, 0.006, 0.002), 'metal.blackAnodised', [-0.026, 0.033, -0.036], [0, 0, 0.6]),
        P(BB(0.01, 0.12, 0.006, 0.002), 'metal.blackAnodised', [0.018, 0.05, -0.036], [0, 0, -0.3]),
      ],
      colliders: [],
    };
  },
});

/* ================================================================== */
/* ELECTRONICS                                                         */
/* ================================================================== */

def('prop.monitor', '24-inch monitor', [0.56, 0.53, 0.2], ['electronics', 'desk'], 'electronics', {
  mats: ['plastic.smooth', 'plastic.dark', 'screen.atlas (content map + emissiveMap)', 'metal.brushed'],
  use: 'every desk',
  coll: 'none — desk clutter scale',
  acc: '24" panel (0.54 × 0.33 visible) on column stand and flat foot; powered face shows original screen content (spreadsheet / mail / dashboard / CAD / lock screen) from the shared screen atlas, paired with a screens[] entry. Variants: on | off (dark glass) | nosignal.',
  variants: ['on', 'off', 'nosignal'],
  build(o = {}) {
    const on = o.variant !== 'off';
    const rng = o.rng ?? rngFor('monitor');
    const content = o.variant === 'nosignal' ? 'nosignal' : (o.content ?? pickContent(rng));
    const fs = flatScreen(0.54, 0.33, 0.36, { on, kind: 'monitor', content });
    const parts = [
      ...fs.parts,
      P(BB(0.05, 0.24, 0.03, 0.006), 'plastic.dark', [0, 0.14, 0.05], [-0.1, 0, 0]),
      P(BB(0.24, 0.015, 0.19, 0.005), 'metal.brushed', [0, 0.008, 0.05]),
      P(BB(0.06, 0.02, 0.02, 0.004), 'plastic.dark', [0.2, 0.185, -0.017]),
    ];
    return { parts, colliders: [], screens: on ? [fs.screen] : [] };
  },
});

def('prop.monitorDual', 'Dual-monitor arm setup', [1.14, 0.56, 0.22], ['electronics', 'desk'], 'electronics', {
  mats: ['plastic.smooth', 'metal.blackAnodised', 'screen.atlas (content map + emissiveMap)'],
  use: 'openplanA, it, server desk',
  coll: 'none — desk clutter scale',
  acc: 'Two 24" panels angled 8° inwards on a shared pole arm with a weighted base; both faces carry distinct original screen content; two screens[] entries.',
  build(o = {}) {
    const rng = o.rng ?? rngFor('monitorDual');
    const screens = [];
    const parts = [
      P(CYL(0.02, 0.02, 0.42, 8), 'metal.blackAnodised', [0, 0.21, 0.06]),
      P(BB(0.26, 0.016, 0.2, 0.005), 'metal.blackAnodised', [0, 0.008, 0.06]),
    ];
    for (const [sx, ang] of [[-0.285, 0.14], [0.285, -0.14]]) {
      const M = new THREE.Matrix4().compose(
        new THREE.Vector3(sx, 0, 0),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ang, 0)),
        new THREE.Vector3(1, 1, 1),
      );
      const fs = flatScreen(0.54, 0.33, 0.38, { kind: 'monitor', content: pickContent(rng) });
      for (const p of fs.parts) parts.push({ ...p, matrix: M.clone().multiply(p.matrix) });
      const sp = new THREE.Vector3(...fs.screen.pos).applyMatrix4(M);
      screens.push({ pos: [sp.x, sp.y, sp.z], rot: ang, kind: 'monitor' });
      parts.push(P(BB(0.16, 0.03, 0.05, 0.006), 'metal.blackAnodised', [sx / 2, 0.4, 0.045], [0, ang / 2, 0]));
    }
    return { parts, colliders: [], screens };
  },
});

def('prop.laptop', 'Laptop, open', [0.34, 0.24, 0.24], ['electronics', 'desk'], 'electronics', {
  mats: ['metal.aluminium', 'plastic.dark', 'screen.atlas (content map + emissiveMap)'],
  use: 'it, execante, conference, exec',
  coll: 'none — small clutter',
  acc: '14" aluminium laptop open at 105°: keyboard deck with key field and trackpad, lid screen with original content (mail / lock screen / spreadsheet) + screens[] entry. Variant: closed.',
  variants: ['open', 'closed'],
  build(o = {}) {
    if (o.variant === 'closed') {
      return { parts: [P(BB(0.33, 0.024, 0.23, 0.006), 'metal.aluminium', [0, 0.012, 0])], colliders: [], screens: [] };
    }
    const rng = o.rng ?? rngFor('laptop');
    const content = o.content ?? ['mail', 'locked', 'spreadsheet', 'dashboard'][Math.floor(rng() * 4)];
    const tilt = -Math.PI / 2 + 0.26;
    const parts = [
      P(BB(0.33, 0.014, 0.23, 0.005), 'metal.aluminium', [0, 0.007, 0]),
      P(BB(0.28, 0.006, 0.12, 0.002), 'plastic.dark', [0, 0.015, -0.02]),
      P(BB(0.1, 0.004, 0.07, 0.002), 'plastic.smooth', [0, 0.015, 0.075]),
      P(BB(0.33, 0.012, 0.22, 0.005), 'metal.aluminium', [0, 0.105, 0.142], [tilt, 0, 0]),
      screenFacePart(content, 0.3, 0.19, [0, 0.108, 0.135], [tilt + Math.PI, 0, 0]),
    ];
    return { parts, colliders: [], screens: [{ pos: [0, 0.11, 0.13], rot: 0, kind: 'laptop' }] };
  },
});

def('prop.computerTower', 'Desktop tower PC', [0.18, 0.42, 0.45], ['electronics'], 'electronics', {
  mats: ['plastic.dark', 'metal.paintedDark', 'emissive.ledGreen'],
  use: 'under every workstation desk',
  coll: 'none — sits inside desk collider footprint',
  acc: 'Mid-tower: front panel with optical bay lines, power button, status LED, side vent. Variant: off (no LED).',
  variants: ['on', 'off'],
  build(o = {}) {
    const parts = [
      P(BB(0.18, 0.42, 0.45, 0.006), 'metal.paintedDark', [0, 0.21, 0]),
      P(BB(0.17, 0.4, 0.015, 0.004), 'plastic.dark', [0, 0.21, -0.226]),
      P(BB(0.12, 0.014, 0.008, 0.002), 'plastic.smooth', [0, 0.36, -0.234]),
      P(BB(0.12, 0.014, 0.008, 0.002), 'plastic.smooth', [0, 0.33, -0.234]),
      P(CYL(0.011, 0.011, 0.008, 8), 'plastic.smooth', [0, 0.28, -0.234], [Math.PI / 2, 0, 0]),
    ];
    if (o.variant !== 'off') parts.push(P(BB(0.008, 0.008, 0.006, 0.001), 'emissive.ledGreen', [0.04, 0.28, -0.235]));
    for (let i = 0; i < 4; i++) parts.push(P(BB(0.004, 0.3, 0.3, 0.001), 'plastic.dark', [0.089, 0.2, 0.05]));
    return { parts, colliders: [] };
  },
});

def('prop.keyboard', 'Keyboard', [0.44, 0.03, 0.15], ['electronics', 'desk'], 'clutter', {
  mats: ['plastic.dark', 'plastic.grey'],
  use: 'every workstation',
  coll: 'none — small clutter',
  acc: 'Full-size board: wedge base, raised key field with row breaks and a distinct spacebar. Reads as a keyboard from standing height.',
  build(o = {}) {
    const rng = o.rng ?? rngFor('kb');
    const yawJit = (rng() - 0.5) * 0.14;
    const parts = [
      P(BB(0.44, 0.018, 0.15, 0.005), 'plastic.dark', [0, 0.009, 0], [0.02, yawJit, 0]),
      P(BB(0.4, 0.01, 0.028, 0.003), 'plastic.grey', [0, 0.022, -0.048], [0.02, yawJit, 0]),
      P(BB(0.4, 0.01, 0.052, 0.003), 'plastic.grey', [0, 0.022, -0.002], [0.02, yawJit, 0]),
      P(BB(0.26, 0.01, 0.02, 0.003), 'plastic.grey', [-0.04, 0.022, 0.05], [0.02, yawJit, 0]),
      P(BB(0.09, 0.011, 0.019, 0.003), 'plastic.grey', [0.13, 0.022, 0.05], [0.02, yawJit, 0]),
    ];
    return { parts, colliders: [] };
  },
});

def('prop.mouse', 'Mouse + pad', [0.26, 0.03, 0.22], ['electronics', 'desk'], 'clutter', {
  mats: ['rubber.black', 'plastic.smooth'],
  use: 'every workstation',
  coll: 'none — small clutter',
  acc: 'Rubber desk pad with a low-profile mouse (body, scroll notch). Variant: noPad.',
  variants: ['pad', 'noPad'],
  build(o = {}) {
    const parts = [];
    if (o.variant !== 'noPad') parts.push(P(BB(0.26, 0.004, 0.22, 0.002), 'rubber.black', [0, 0.002, 0]));
    parts.push(P(SPH(1, 10, 8), 'plastic.smooth', [0.02, 0.016, 0.01], undefined, [0.031, 0.017, 0.055]));
    parts.push(P(BB(0.006, 0.004, 0.014, 0.001), 'rubber.black', [0.02, 0.032, -0.02]));
    return { parts, colliders: [] };
  },
});

def('prop.deskPhone', 'Desk phone', [0.22, 0.09, 0.2], ['electronics', 'desk'], 'electronics', {
  mats: ['plastic.dark', 'plastic.grey', 'plastic.smooth'],
  use: 'reception, desks, conference',
  coll: 'none — small clutter',
  acc: 'Office IP phone: wedge body, handset in cradle, keypad grid, small display. Variant: offHook (handset beside body, cord loop).',
  variants: ['onHook', 'offHook'],
  build(o = {}) {
    const off = o.variant === 'offHook';
    const parts = [
      P(BB(0.2, 0.045, 0.18, 0.008), 'plastic.dark', [0.01, 0.024, 0], [-0.16, 0, 0]),
      P(BB(0.08, 0.012, 0.05, 0.003), 'plastic.smooth', [0.035, 0.058, -0.045], [-0.16, 0, 0]),
    ];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      parts.push(P(BB(0.016, 0.008, 0.014, 0.002), 'plastic.grey', [0.005 + c * 0.026, 0.05 - r * 0.004, 0.02 + r * 0.03], [-0.16, 0, 0]));
    }
    if (off) {
      parts.push(P(BB(0.05, 0.028, 0.19, 0.012), 'plastic.dark', [-0.14, 0.014, 0.02], [0, 0.5, 0]));
      parts.push(P(TOR(0.02, 0.005, 5, 10), 'plastic.dark', [-0.08, 0.01, 0.06], [Math.PI / 2, 0, 0]));
    } else {
      parts.push(P(BB(0.045, 0.03, 0.17, 0.012), 'plastic.dark', [-0.075, 0.05, 0], [-0.16, 0, 0]));
    }
    return { parts, colliders: [] };
  },
});

def('prop.headset', 'Headset on hook', [0.18, 0.2, 0.1], ['electronics', 'desk'], 'clutter', {
  mats: ['plastic.dark', 'rubber.black'],
  use: 'openplanA, it',
  coll: 'none — small clutter',
  acc: 'Call-centre headset resting on a desk stand: headband arc, two earcups, mic boom.',
  build() {
    return {
      parts: [
        P(CYL(0.03, 0.045, 0.14, 8), 'plastic.dark', [0, 0.07, 0]),
        P(TOR(0.07, 0.009, 6, 16, Math.PI), 'plastic.dark', [0, 0.14, 0], [0, 0, 0]),
        P(SPH(1, 8, 6), 'rubber.black', [-0.07, 0.12, 0], undefined, [0.02, 0.032, 0.03]),
        P(SPH(1, 8, 6), 'rubber.black', [0.07, 0.12, 0], undefined, [0.02, 0.032, 0.03]),
        P(CYL(0.004, 0.004, 0.09, 5), 'plastic.dark', [-0.075, 0.08, -0.025], [0.5, 0, 0.25]),
      ],
      colliders: [],
    };
  },
});

def('prop.dockingStation', 'Docking station', [0.28, 0.05, 0.09], ['electronics', 'desk'], 'clutter', {
  mats: ['plastic.dark', 'metal.aluminium', 'emissive.ledAmber'],
  use: 'openplanA, it, execante',
  coll: 'none — small clutter',
  acc: 'Laptop dock bar with port row, status LED, and one cable stub.',
  build() {
    return {
      parts: [
        P(BB(0.28, 0.035, 0.09, 0.008), 'plastic.dark', [0, 0.018, 0]),
        P(BB(0.24, 0.008, 0.01, 0.002), 'metal.aluminium', [0, 0.03, -0.042]),
        P(BB(0.006, 0.006, 0.004, 0.001), 'emissive.ledAmber', [0.12, 0.03, -0.046]),
        P(CYL(0.004, 0.004, 0.12, 5), 'rubber.black', [0.15, 0.01, 0.05], [0.9, 0.4, 0]),
      ],
      colliders: [],
    };
  },
});

def('prop.printerDesk', 'Desktop printer', [0.48, 0.3, 0.4], ['electronics'], 'electronics', {
  mats: ['plastic.grey', 'plastic.dark', 'paper.white'],
  use: 'execante, it, copy',
  coll: 'none — sits on furniture',
  acc: 'Small laser printer: body with output slot, raised control pad, paper in the out-tray. Variant: jam (lid propped, paper askew).',
  variants: ['ok', 'jam'],
  build(o = {}) {
    const jam = o.variant === 'jam';
    const parts = [
      P(BB(0.46, 0.24, 0.38, 0.014), 'plastic.grey', [0, 0.13, 0]),
      P(BB(0.4, 0.03, 0.26, 0.008), 'plastic.dark', [0, 0.265, 0.02], jam ? [0.35, 0, 0] : undefined),
      P(BB(0.34, 0.012, 0.05, 0.004), 'plastic.dark', [0, 0.2, -0.2]),
      P(BB(0.07, 0.01, 0.05, 0.003), 'plastic.smooth', [0.16, 0.257, -0.12]),
      P(BB(0.28, 0.006, 0.2, 0.002), 'paper.white', [0, 0.21, -0.1], jam ? [0.1, 0.3, 0] : [0.06, 0.05, 0]),
    ];
    return { parts, colliders: [] };
  },
});

def('prop.copierFloor', 'Floor-standing copier', [1.1, 1.22, 0.68], ['electronics', 'cover'], 'electronics', {
  mats: ['plastic.grey', 'plastic.dark', 'metal.painted', 'paper.white', 'screen.atlas (copier panel content)'],
  use: 'copy, openplanA',
  coll: 'single AABB 1.1 × 1.22 × 0.68',
  acc: 'Multifunction copier: cabinet base, scanner deck with raised feeder lid, angled control screen with READY panel content (screens[] entry), three paper drawers, side output tray with paper. Waist-high cover. Variant: open (front service door ajar, toner visible, panel shows PAPER JAM).',
  variants: ['closed', 'open'],
  build(o = {}) {
    const open = o.variant === 'open';
    const parts = [
      P(BB(0.98, 0.5, 0.62, 0.012), 'metal.painted', [0, 0.27, 0]),
      P(BB(1.02, 0.42, 0.66, 0.014), 'plastic.grey', [0, 0.72, 0]),
      P(BB(0.98, 0.06, 0.6, 0.01), 'plastic.dark', [0, 0.96, 0]),
      P(BB(0.62, 0.07, 0.46, 0.012), 'plastic.grey', [-0.12, 1.03, 0]),
      P(BB(0.4, 0.05, 0.34, 0.01), 'plastic.dark', [-0.12, 1.09, 0.05], [0.12, 0, 0]),
      // Control screen on an angled arm
      P(BB(0.26, 0.16, 0.03, 0.006), 'plastic.dark', [0.38, 1.06, -0.18], [-0.5, 0, 0]),
      screenFacePart(open ? 'copierJam' : 'copier', 0.22, 0.12, [0.38, 1.065, -0.198], [-0.5 + Math.PI, 0, 0]),
      // Paper drawers
      ...[0.12, 0.26, 0.4].map((y) => P(BB(0.9, 0.11, 0.02, 0.005), 'plastic.grey', [0, y, -0.32])),
      ...[0.12, 0.26, 0.4].map((y) => P(BB(0.2, 0.02, 0.012, 0.003), 'plastic.dark', [0, y + 0.03, -0.328])),
      // Side output tray with a stack
      P(BB(0.34, 0.02, 0.4, 0.006), 'plastic.grey', [-0.62, 0.78, 0], [0, 0, 0.12]),
      P(BB(0.28, 0.03, 0.2, 0.004), 'paper.white', [-0.62, 0.815, 0], [0, 0.06, 0.12]),
    ];
    if (open) {
      parts.push(P(BB(0.42, 0.36, 0.02, 0.005), 'plastic.grey', [0.2, 0.68, -0.42], [0, 0.9, 0]));
      parts.push(P(CYL(0.05, 0.05, 0.3, 10), 'plastic.dark', [0, 0.66, -0.28], [0, 0, Math.PI / 2]));
    }
    return {
      parts,
      colliders: [cbox(1.1, 1.22, 0.68, 'plastic', 'copier')],
      screens: [{ pos: [0.38, 1.065, -0.2], rot: 0, kind: 'monitor' }],
    };
  },
  lod1() {
    return {
      parts: [P(BOX(1.05, 1.15, 0.66), 'plastic.grey', [0, 0.58, 0])],
      colliders: [cbox(1.1, 1.22, 0.68, 'plastic', 'copier')],
    };
  },
});

def('prop.paperTrays', 'Stacked paper trays', [0.36, 0.26, 0.3], ['office', 'desk'], 'clutter', {
  mats: ['plastic.dark', 'paper.white', 'paper.cream'],
  use: 'copy, execante, openplanA',
  coll: 'none — small clutter',
  acc: 'Three stacked letter trays on riser posts with uneven paper piles in two of them.',
  build(o = {}) {
    const rng = o.rng ?? rngFor('trays');
    const parts = [];
    for (let i = 0; i < 3; i++) {
      const y = 0.02 + i * 0.085;
      parts.push(P(BB(0.34, 0.02, 0.28, 0.005), 'plastic.dark', [0, y, 0]));
      parts.push(P(BB(0.02, 0.05, 0.26, 0.004), 'plastic.dark', [-0.16, y + 0.03, 0]));
      parts.push(P(BB(0.02, 0.05, 0.26, 0.004), 'plastic.dark', [0.16, y + 0.03, 0]));
      if (i < 2 && rng() < 0.85) {
        parts.push(P(BB(0.28, 0.014 + rng() * 0.02, 0.21, 0.003), i === 0 ? 'paper.white' : 'paper.cream', [0, y + 0.025, 0], [0, (rng() - 0.5) * 0.15, 0]));
      }
    }
    return { parts, colliders: [] };
  },
});

def('prop.displayWall', 'Wall conference display', [1.48, 0.9, 0.09], ['electronics', 'wall'], 'electronics', {
  mats: ['plastic.smooth', 'metal.blackAnodised', 'screen.atlas (content map + emissiveMap)'],
  use: 'conference, boardroom, waiting',
  coll: 'none — wall mounted',
  acc: '65" display on a wall bracket: slim bezel, content face (title slide / dashboard via opts.content) + screens[] entry, soundbar beneath. Pivot at panel centre against wall (+Z into wall). Variant: off.',
  variants: ['on', 'off'],
  build(o = {}) {
    const on = o.variant !== 'off';
    const parts = [
      P(BB(1.48, 0.86, 0.045, 0.006), 'plastic.smooth', [0, 0, -0.045]),
      on
        ? screenFacePart(o.content ?? 'slides', 1.42, 0.8, [0, 0, -0.0695], [0, Math.PI, 0])
        : P(PLN(1.42, 0.8), 'plastic.smooth', [0, 0, -0.0695], [0, Math.PI, 0]),
      P(BB(0.5, 0.3, 0.04, 0.005), 'metal.blackAnodised', [0, 0, -0.01]),
      P(BB(1.0, 0.06, 0.06, 0.008), 'metal.blackAnodised', [0, -0.52, -0.05]),
    ];
    return { parts, colliders: [], screens: on ? [{ pos: [0, 0, -0.072], rot: 0, kind: 'monitor' }] : [] };
  },
});

def('prop.securityMonitorBank', 'Security monitor bank', [0.94, 0.68, 0.18], ['electronics'], 'electronics', {
  mats: ['metal.paintedDark', 'plastic.smooth', 'screen.atlas (CCTV quad splits)'],
  use: 'vestibule, server',
  coll: 'none — sits on desk/console',
  acc: 'Rack of 2 × 2 CCTV monitors on a shared stand; each face shows a labelled quad-split camera view (one dead feed reads NO SIGNAL), registered as "security" screens; cable loom behind.',
  build() {
    const screens = [];
    const parts = [P(BB(0.9, 0.05, 0.16, 0.008), 'metal.paintedDark', [0, 0.025, 0.01])];
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 2; c++) {
        const x = -0.23 + c * 0.46;
        const y = 0.21 + r * 0.31;
        parts.push(P(BB(0.44, 0.29, 0.06, 0.006), 'plastic.smooth', [x, y, 0.02]));
        parts.push(screenFacePart((r + c) % 2 === 0 ? 'cctv' : 'cctv2', 0.4, 0.25, [x, y, -0.012], [0, Math.PI, 0]));
        screens.push({ pos: [x, y, -0.014], rot: 0, kind: 'security' });
      }
    }
    parts.push(P(BB(0.7, 0.5, 0.03, 0.006), 'metal.paintedDark', [0, 0.36, 0.07]));
    parts.push(P(CYL(0.02, 0.02, 0.4, 6), 'rubber.black', [0.3, 0.2, 0.09], [0.3, 0, 0.2]));
    return { parts, colliders: [], screens };
  },
});

def('prop.serverRack', 'Server rack', [0.6, 2.0, 1.0], ['electronics', 'cover'], 'electronics', {
  mats: ['metal.paintedDark', 'metal.blackAnodised', 'plastic.dark', 'emissive.ledGreen', 'emissive.ledAmber'],
  use: 'server',
  coll: 'single AABB 0.6 × 2.0 × 1.0 (full-height cover)',
  acc: '42U rack 0.6 × 2.0 × 1.0: frame, side panels, populated front with distinct 1U/2U server faces, drive slots and per-unit status LEDs; screens[] "server" entry for the KVM row. Variants: closed (perforated door) | open (equipment exposed).',
  variants: ['open', 'closed'],
  build(o = {}) {
    const rng = o.rng ?? rngFor('rack');
    const closed = o.variant === 'closed';
    const parts = [
      P(BB(0.6, 2.0, 1.0, 0.012), 'metal.paintedDark', [0, 1.0, 0.02]),
      P(BB(0.62, 0.06, 1.02, 0.008), 'metal.blackAnodised', [0, 0.03, 0.02]),
      P(BB(0.62, 0.04, 1.02, 0.008), 'metal.blackAnodised', [0, 1.98, 0.02]),
    ];
    let y = 0.14;
    while (y < 1.86) {
      const u = rng() < 0.3 ? 0.135 : 0.075;
      const kind = rng();
      if (kind < 0.72) {
        parts.push(P(BB(0.52, u - 0.014, 0.03, 0.004), kind < 0.36 ? 'metal.blackAnodised' : 'plastic.dark', [0, y + u / 2, -0.475]));
        const nLed = 1 + Math.floor(rng() * 3);
        for (let l = 0; l < nLed; l++) {
          parts.push(P(BB(0.007, 0.007, 0.006, 0.001), rng() < 0.75 ? 'emissive.ledGreen' : 'emissive.ledAmber', [0.2 - l * 0.03, y + u / 2, -0.492]));
        }
        if (kind < 0.2) for (let d = 0; d < 4; d++) parts.push(P(BB(0.09, u - 0.03, 0.008, 0.002), 'metal.paintedDark', [-0.18 + d * 0.1, y + u / 2, -0.49]));
      } else if (kind < 0.86) {
        // Blanking panel
        parts.push(P(BB(0.52, u - 0.01, 0.012, 0.003), 'metal.paintedDark', [0, y + u / 2, -0.47]));
      } else {
        // Cable brush strip
        parts.push(P(BB(0.52, u - 0.02, 0.02, 0.003), 'rubber.black', [0, y + u / 2, -0.472]));
      }
      y += u + 0.008;
    }
    if (closed) parts.push(P(BB(0.56, 1.82, 0.02, 0.005), 'metal.paintedDark', [0, 1.02, -0.51]));
    return {
      parts,
      colliders: [cbox(0.6, 2.0, 1.0, 'metal', 'serverRack')],
      screens: [{ pos: [0, 1.4, -0.5], rot: 0, kind: 'server' }],
    };
  },
  lod1() {
    return {
      parts: [P(BOX(0.6, 2.0, 1.0), 'metal.paintedDark', [0, 1.0, 0])],
      colliders: [cbox(0.6, 2.0, 1.0, 'metal', 'serverRack')],
    };
  },
});

def('prop.switchShelf', 'Network switch shelf', [0.6, 0.5, 0.32], ['electronics', 'wall'], 'electronics', {
  mats: ['metal.paintedDark', 'plastic.dark', 'emissive.ledGreen', 'rubber.black'],
  use: 'it, server, copy',
  coll: 'none — wall mounted above desks',
  acc: 'Wall-mount comms bracket: two switch units with port rows and blinking-green LED strips, patch cables dropping to a loom. Pivot at bracket centre against wall.',
  build() {
    const parts = [
      P(BB(0.6, 0.03, 0.3, 0.006), 'metal.paintedDark', [0, -0.22, -0.14]),
      P(BB(0.03, 0.5, 0.03, 0.004), 'metal.paintedDark', [-0.27, 0, -0.02]),
      P(BB(0.03, 0.5, 0.03, 0.004), 'metal.paintedDark', [0.27, 0, -0.02]),
    ];
    for (let i = 0; i < 2; i++) {
      const y = -0.16 + i * 0.1;
      parts.push(P(BB(0.5, 0.05, 0.26, 0.005), 'plastic.dark', [0, y, -0.14]));
      for (let px = 0; px < 8; px++) parts.push(P(BB(0.012, 0.012, 0.008, 0.001), 'metal.paintedDark', [-0.18 + px * 0.05, y, -0.276]));
      parts.push(P(BB(0.04, 0.008, 0.006, 0.001), 'emissive.ledGreen', [0.21, y + 0.012, -0.276]));
    }
    for (let c = 0; c < 3; c++) parts.push(P(CYL(0.004, 0.004, 0.34, 5), 'rubber.black', [-0.15 + c * 0.05, -0.02, -0.24], [0.2 + c * 0.1, 0, 0.1]));
    return { parts, colliders: [] };
  },
});

def('prop.ups', 'Floor UPS unit', [0.26, 0.46, 0.6], ['electronics'], 'electronics', {
  mats: ['metal.paintedDark', 'plastic.dark', 'emissive.ledAmber'],
  use: 'server, it',
  coll: 'single AABB 0.26 × 0.46 × 0.6',
  acc: 'Tower UPS: heavy body, vent slots, angled status panel with amber LED, thick outlet cable.',
  build() {
    return {
      parts: [
        P(BB(0.26, 0.44, 0.6, 0.01), 'metal.paintedDark', [0, 0.23, 0]),
        P(BB(0.2, 0.09, 0.02, 0.005), 'plastic.dark', [0, 0.38, -0.3], [-0.3, 0, 0]),
        P(BB(0.02, 0.02, 0.006, 0.001), 'emissive.ledAmber', [0.03, 0.385, -0.312], [-0.3, 0, 0]),
        ...[0, 1, 2].map((i) => P(BB(0.005, 0.28, 0.4, 0.001), 'plastic.dark', [0.128, 0.2, 0.02 + i * 0])),
        P(CYL(0.009, 0.009, 0.4, 6), 'rubber.black', [0.08, 0.03, 0.32], [1.2, 0.4, 0]),
      ],
      colliders: [cbox(0.26, 0.46, 0.6, 'metal', 'ups')],
    };
  },
});

def('prop.cableBundle', 'Floor cable bundle', [0.9, 0.05, 0.3], ['electronics', 'floor'], 'clutter', {
  mats: ['rubber.black', 'plastic.dark', 'plastic.grey'],
  use: 'server, it, openplanA under desks',
  coll: 'none — flat floor clutter',
  acc: 'Loose cable run: three sagging conductors with slight lateral wander plus a velcro-tied loop; hugs the floor, never floats.',
  build(o = {}) {
    const rng = o.rng ?? rngFor('cables');
    const parts = [];
    for (let c = 0; c < 3; c++) {
      const zoff = (c - 1) * 0.07 + (rng() - 0.5) * 0.03;
      const segs = 4;
      for (let s = 0; s < segs; s++) {
        const x = -0.36 + (s + 0.5) * (0.72 / segs);
        parts.push(P(CYL(0.006, 0.006, 0.72 / segs + 0.02, 5), c === 1 ? 'plastic.grey' : 'rubber.black',
          [x, 0.008, zoff + Math.sin(s * 1.7 + c) * 0.03], [Math.PI / 2 + (rng() - 0.5) * 0.06, 0, Math.PI / 2 + Math.sin(s + c) * 0.14]));
      }
    }
    parts.push(P(TOR(0.05, 0.008, 5, 12), 'plastic.dark', [0.3, 0.012, 0.02], [Math.PI / 2, 0, 0]));
    return { parts, colliders: [] };
  },
});

def('prop.cableDrop', 'Wall cable drop', [0.12, 1.2, 0.06], ['electronics', 'wall'], 'clutter', {
  mats: ['rubber.black', 'plastic.grey'],
  use: 'server, it, mechanical',
  coll: 'none — wall dressing',
  acc: 'Vertical cable drop from tray height: three cables with a sag and a wall clip; pivot at floor against wall.',
  build() {
    return {
      parts: [
        P(CYL(0.007, 0.007, 1.2, 5), 'rubber.black', [-0.02, 0.6, -0.02], [0, 0, 0.02]),
        P(CYL(0.006, 0.006, 1.18, 5), 'plastic.grey', [0.005, 0.59, -0.025], [0, 0, -0.03]),
        P(CYL(0.007, 0.007, 1.16, 5), 'rubber.black', [0.03, 0.58, -0.02], [0, 0, 0.05]),
        P(BB(0.08, 0.03, 0.03, 0.004), 'plastic.grey', [0, 1.1, -0.02]),
        P(BB(0.08, 0.03, 0.03, 0.004), 'plastic.grey', [0, 0.4, -0.02]),
      ],
      colliders: [],
    };
  },
});

def('prop.deskLamp', 'Desk lamp', [0.16, 0.42, 0.34], ['electronics', 'desk'], 'electronics', {
  mats: ['metal.blackAnodised', 'emissive.warm', 'plastic.dark'],
  use: 'exec, execante, reception',
  coll: 'none — small clutter',
  acc: 'Task lamp: weighted base, two-segment arm, cone head with a warm emissive underside. Variant: off.',
  variants: ['on', 'off'],
  build(o = {}) {
    const on = o.variant !== 'off';
    return {
      parts: [
        P(CYL(0.08, 0.09, 0.02, 14), 'metal.blackAnodised', [0, 0.01, 0]),
        P(CYL(0.01, 0.01, 0.24, 7), 'metal.blackAnodised', [0.02, 0.13, 0.03], [0.25, 0, -0.15]),
        P(CYL(0.009, 0.009, 0.22, 7), 'metal.blackAnodised', [0.0, 0.32, -0.06], [-0.85, 0, 0.1]),
        P(CYL(0.028, 0.055, 0.1, 12), 'metal.blackAnodised', [-0.01, 0.4, -0.16], [-2.2, 0, 0]),
        P(CYL(0.026, 0.026, 0.008, 12), on ? 'emissive.warm' : 'plastic.dark', [-0.01, 0.365, -0.185], [-2.2, 0, 0]),
      ],
      colliders: [],
    };
  },
});

/* ================================================================== */
/* BREAK ROOM / KITCHEN                                                */
/* ================================================================== */

def('prop.kitchenRun', 'Kitchen base cabinet run', [1.8, 0.92, 0.62], ['breakroom', 'cover'], 'breakroom', {
  mats: ['wood.pale', 'laminate.white', 'metal.stainless', 'metal.brushed', 'plastic.dark'],
  use: 'breakroom, execlounge coffee point',
  coll: 'single AABB run × 0.92 × 0.62',
  acc: 'Base cabinet run against a wall (+Z into wall): kick recess, door-and-drawer fronts with bar pulls, 30 mm counter with bullnose bevel. opts.width 1.2–3.0 m; variant "sink" insets a stainless bowl and gooseneck faucet.',
  variants: ['plain', 'sink'],
  build(o = {}) {
    const w = Math.min(3.0, Math.max(1.2, o.width ?? 1.8));
    const parts = [
      P(BB(w - 0.08, 0.1, 0.52, 0.006), 'plastic.dark', [0, 0.05, 0.04]),
      P(BB(w, 0.72, 0.58, 0.008), 'wood.pale', [0, 0.5, 0.01]),
      P(BB(w + 0.04, 0.034, 0.64, 0.012), 'laminate.white', [0, 0.885, 0]),
      P(BB(w, 0.06, 0.02, 0.005), 'laminate.white', [0, 0.93, 0.3]),
    ];
    const nDoors = Math.max(2, Math.round(w / 0.45));
    const dw = (w - 0.06) / nDoors;
    for (let i = 0; i < nDoors; i++) {
      const x = -w / 2 + 0.03 + (i + 0.5) * dw;
      if (i === 1) {
        // Drawer stack
        for (let d = 0; d < 3; d++) {
          parts.push(P(BB(dw - 0.02, 0.19, 0.016, 0.004), 'wood.pale', [x, 0.24 + d * 0.22, -0.288]));
          parts.push(P(BB(0.12, 0.016, 0.02, 0.003), 'metal.brushed', [x, 0.32 + d * 0.22, -0.296]));
        }
      } else {
        parts.push(P(BB(dw - 0.02, 0.62, 0.016, 0.004), 'wood.pale', [x, 0.46, -0.288]));
        parts.push(P(BB(0.016, 0.12, 0.02, 0.003), 'metal.brushed', [x + dw / 2 - 0.05, 0.6, -0.296]));
      }
    }
    if (o.variant === 'sink') {
      const sx = -w / 4;
      parts.push(P(BB(0.5, 0.02, 0.42, 0.004), 'metal.stainless', [sx, 0.895, 0]));
      parts.push(P(BB(0.42, 0.16, 0.34, 0.006), 'metal.stainless', [sx, 0.81, 0]));
      parts.push(P(CYL(0.012, 0.012, 0.24, 8), 'metal.stainless', [sx + 0.16, 1.0, 0.16]));
      parts.push(P(TOR(0.09, 0.011, 6, 14, Math.PI * 0.9), 'metal.stainless', [sx + 0.16, 1.12, 0.1], [0, Math.PI / 2, 0.2]));
    }
    return { parts, colliders: [cbox(w, 0.92, 0.62, 'wood', 'kitchen')] };
  },
});

def('prop.kitchenWallCabinet', 'Kitchen wall cabinets', [1.8, 0.7, 0.35], ['breakroom', 'wall'], 'breakroom', {
  mats: ['wood.pale', 'laminate.white', 'metal.brushed'],
  use: 'breakroom',
  coll: 'none — mounted at 1.45 m, above walking height',
  acc: 'Upper cabinet run with individual door fronts, pulls and a light pelmet; one door ajar showing mugs. Pivot at cabinet bottom centre against wall.',
  build(o = {}) {
    const w = Math.min(2.4, Math.max(1.2, o.width ?? 1.8));
    const parts = [P(BB(w, 0.68, 0.33, 0.008), 'wood.pale', [0, 0.34, 0])];
    const nDoors = Math.max(2, Math.round(w / 0.45));
    const dw = (w - 0.04) / nDoors;
    for (let i = 0; i < nDoors; i++) {
      const x = -w / 2 + 0.02 + (i + 0.5) * dw;
      const ajar = i === nDoors - 1;
      parts.push(P(BB(dw - 0.018, 0.64, 0.016, 0.004), 'laminate.white', [x + (ajar ? 0.05 : 0), 0.34, ajar ? -0.22 : -0.172], ajar ? [0, 0.65, 0] : undefined));
      parts.push(P(BB(0.014, 0.1, 0.018, 0.003), 'metal.brushed', [x + dw / 2 - 0.04, 0.3, ajar ? -0.24 : -0.182]));
      if (ajar) {
        parts.push(P(lathe('mug', [[0, 0], [0.04, 0], [0.045, 0.1], [0.036, 0.1], [0.033, 0.012], [0, 0.012]], 12), 'plastic.white', [x - 0.05, 0.06, -0.06]));
        parts.push(P(lathe('mug', [[0, 0], [0.04, 0], [0.045, 0.1], [0.036, 0.1], [0.033, 0.012], [0, 0.012]], 12), 'plastic.grey', [x + 0.04, 0.06, -0.09]));
      }
    }
    parts.push(P(BB(w, 0.05, 0.36, 0.006), 'wood.pale', [0, -0.026, 0]));
    return { parts, colliders: [] };
  },
});

def('prop.refrigerator', 'Refrigerator', [0.72, 1.82, 0.72], ['breakroom', 'cover'], 'breakroom', {
  mats: ['metal.brushedV', 'plastic.dark', 'plastic.white', 'rubber.black'],
  use: 'breakroom',
  coll: 'single AABB 0.72 × 1.82 × 0.72',
  acc: 'Two-door fridge/freezer: brushed doors with full-length pulls, door seams, kick vent, top hinge caps. Full-height cover. Variant: notes (paper scraps held to the door).',
  variants: ['clean', 'notes'],
  build(o = {}) {
    const parts = [
      P(BB(0.72, 1.78, 0.7, 0.014), 'metal.brushedV', [0, 0.9, 0.01]),
      P(BB(0.7, 0.6, 0.03, 0.006), 'metal.brushedV', [0, 1.48, -0.352]),
      P(BB(0.7, 1.1, 0.03, 0.006), 'metal.brushedV', [0, 0.6, -0.352]),
      P(BB(0.03, 0.5, 0.035, 0.005), 'metal.brushed', [-0.28, 1.48, -0.372]),
      P(BB(0.03, 0.9, 0.035, 0.005), 'metal.brushed', [-0.28, 0.62, -0.372]),
      P(BB(0.66, 0.06, 0.02, 0.004), 'plastic.dark', [0, 0.04, -0.35]),
      P(BB(0.72, 0.02, 0.7, 0.005), 'plastic.dark', [0, 1.8, 0.01]),
    ];
    if (o.variant === 'notes') {
      parts.push(P(BB(0.1, 0.14, 0.004, 0.001), 'paper.white', [0.12, 1.3, -0.372], [0, 0, 0.08]));
      parts.push(P(BB(0.09, 0.09, 0.004, 0.001), 'paper.cream', [-0.05, 1.15, -0.372], [0, 0, -0.12]));
      parts.push(P(BB(0.1, 0.07, 0.004, 0.001), 'paper.white', [0.15, 0.95, -0.372], [0, 0, 0.04]));
    }
    return { parts, colliders: [cbox(0.72, 1.82, 0.72, 'metal', 'fridge')] };
  },
  lod1() {
    return {
      parts: [P(BOX(0.72, 1.8, 0.72), 'metal.brushedV', [0, 0.9, 0])],
      colliders: [cbox(0.72, 1.82, 0.72, 'metal', 'fridge')],
    };
  },
});

def('prop.microwave', 'Microwave oven', [0.5, 0.3, 0.38], ['breakroom'], 'breakroom', {
  mats: ['plastic.dark', 'plastic.smooth', 'plastic.grey', 'emissive.ledGreen'],
  use: 'breakroom counter',
  coll: 'none — sits on counter',
  acc: 'Countertop microwave: dark body, smoked door window with frame, keypad column, clock LED.',
  build() {
    return {
      parts: [
        P(BB(0.5, 0.3, 0.38, 0.01), 'plastic.dark', [0, 0.15, 0]),
        P(BB(0.34, 0.24, 0.014, 0.004), 'plastic.smooth', [-0.05, 0.15, -0.196]),
        P(BB(0.28, 0.18, 0.006, 0.002), 'plastic.smooth', [-0.05, 0.15, -0.202]),
        P(BB(0.1, 0.24, 0.012, 0.003), 'plastic.grey', [0.18, 0.15, -0.196]),
        P(BB(0.05, 0.016, 0.006, 0.001), 'emissive.ledGreen', [0.18, 0.24, -0.203]),
        P(BB(0.015, 0.08, 0.01, 0.002), 'plastic.grey', [0.11, 0.15, -0.202]),
      ],
      colliders: [],
    };
  },
});

def('prop.coffeeMachine', 'Coffee machine', [0.32, 0.4, 0.34], ['breakroom'], 'breakroom', {
  mats: ['plastic.dark', 'metal.brushed', 'glass.tinted', 'emissive.ledAmber'],
  use: 'breakroom, execlounge',
  coll: 'none — sits on counter',
  acc: 'Drip coffee machine: column body, hotplate, glass carafe half full of coffee, filter head, amber warm light.',
  build() {
    return {
      parts: [
        P(BB(0.3, 0.4, 0.2, 0.01), 'plastic.dark', [0, 0.2, 0.06]),
        P(BB(0.3, 0.07, 0.32, 0.008), 'plastic.dark', [0, 0.035, 0]),
        P(CYL(0.085, 0.085, 0.008, 14), 'metal.brushed', [0, 0.074, -0.06]),
        P(BB(0.26, 0.09, 0.3, 0.01), 'plastic.dark', [0, 0.36, 0.0]),
        P(lathe('carafe', [[0, 0], [0.075, 0], [0.085, 0.13], [0.05, 0.17], [0.055, 0.19], [0, 0.19]], 14), 'glass.tinted', [0, 0.078, -0.06]),
        P(CYL(0.06, 0.07, 0.07, 12), 'wood.dark', [0, 0.115, -0.06]),
        P(BB(0.015, 0.012, 0.008, 0.001), 'emissive.ledAmber', [0.1, 0.06, -0.1]),
      ],
      colliders: [],
    };
  },
});

def('prop.coffeePot', 'Coffee pot', [0.17, 0.19, 0.17], ['breakroom', 'desk'], 'clutter', {
  mats: ['glass.tinted', 'plastic.dark', 'wood.dark'],
  use: 'breakroom, conference',
  coll: 'none — small clutter',
  acc: 'Standalone glass carafe with lid and handle, half full of coffee.',
  build() {
    return {
      parts: [
        P(lathe('carafe', [[0, 0], [0.075, 0], [0.085, 0.13], [0.05, 0.17], [0.055, 0.19], [0, 0.19]], 14), 'glass.tinted', [0, 0, 0]),
        P(CYL(0.055, 0.065, 0.06, 12), 'wood.dark', [0, 0.035, 0]),
        P(CYL(0.045, 0.045, 0.014, 12), 'plastic.dark', [0, 0.195, 0]),
        P(TOR(0.05, 0.009, 5, 10, Math.PI * 0.8), 'plastic.dark', [0.085, 0.1, 0], [0, 0, Math.PI / 2 - 0.3]),
      ],
      colliders: [],
    };
  },
});

def('prop.kettle', 'Electric kettle', [0.2, 0.26, 0.2], ['breakroom'], 'clutter', {
  mats: ['metal.stainless', 'plastic.dark'],
  use: 'breakroom, execlounge',
  coll: 'none — small clutter',
  acc: 'Cordless kettle on its base: stainless body, dark lid, handle loop, spout wedge.',
  build() {
    return {
      parts: [
        P(CYL(0.1, 0.1, 0.015, 14), 'plastic.dark', [0, 0.008, 0]),
        P(lathe('kettle', [[0, 0.015], [0.085, 0.015], [0.095, 0.1], [0.07, 0.21], [0, 0.21]], 16), 'metal.stainless', [0, 0, 0]),
        P(CYL(0.03, 0.03, 0.03, 10), 'plastic.dark', [0, 0.225, 0]),
        P(TOR(0.055, 0.011, 5, 12, Math.PI * 0.9), 'plastic.dark', [0.09, 0.13, 0], [0, 0, Math.PI / 2 - 0.2]),
        P(BB(0.03, 0.05, 0.04, 0.008), 'metal.stainless', [-0.09, 0.16, 0], [0, 0, 0.5]),
      ],
      colliders: [],
    };
  },
});

def('prop.vendingMachine', 'Vending machine', [0.95, 1.85, 0.82], ['breakroom', 'cover'], 'breakroom', {
  mats: ['metal.paintedDark', 'glass.tinted', 'plastic.dark', 'plastic.smooth', 'emissive.screen', 'cardboard.box', 'plastic.white', 'plastic.grey'],
  use: 'breakroom, midcorr',
  coll: 'single AABB 0.95 × 1.85 × 0.82 (full-height cover)',
  acc: '"Polar Snacks" vending machine: painted cabinet, glass front over five product shelves with coil rows of varied packages, keypad column, glowing header panel, delivery flap. Branding face applied by signage.js. Variant: dark (powered down).',
  variants: ['lit', 'dark'],
  build(o = {}) {
    const rng = o.rng ?? rngFor('vending');
    const lit = o.variant !== 'dark';
    const parts = [
      P(BB(0.95, 1.85, 0.8, 0.014), 'metal.paintedDark', [0, 0.925, 0.01]),
      // Header panel (emissive when lit) — brand quad added by signage
      P(BB(0.86, 0.22, 0.02, 0.005), lit ? 'emissive.screen' : 'plastic.smooth', [-0.02, 1.68, -0.402]),
      // Glass front
      P(BOX(0.66, 1.28, 0.012), 'glass.tinted', [-0.09, 0.94, -0.408]),
      P(BB(0.7, 0.05, 0.03, 0.005), 'metal.paintedDark', [-0.09, 0.27, -0.4]),
      // Keypad column
      P(BB(0.16, 1.3, 0.025, 0.005), 'plastic.dark', [0.375, 0.95, -0.402]),
      P(BB(0.1, 0.14, 0.012, 0.003), 'plastic.grey', [0.375, 1.32, -0.415]),
      P(CYL(0.025, 0.025, 0.012, 10), 'plastic.smooth', [0.375, 1.1, -0.412], [Math.PI / 2, 0, 0]),
      // Delivery flap
      P(BB(0.6, 0.16, 0.02, 0.005), 'plastic.dark', [-0.09, 0.16, -0.405]),
    ];
    // Product shelves
    const prodMats = ['plastic.white', 'plastic.grey', 'cardboard.box', 'plastic.smooth', 'plastic.dark'];
    for (let s = 0; s < 5; s++) {
      const y = 0.42 + s * 0.24;
      parts.push(P(BB(0.62, 0.014, 0.3, 0.003), 'metal.painted', [-0.09, y, -0.24]));
      for (let c = 0; c < 5; c++) {
        if (rng() < 0.2) continue; // sold out slot
        const x = -0.33 + c * 0.12;
        parts.push(P(BB(0.075, 0.13, 0.05, 0.006), prodMats[Math.floor(rng() * prodMats.length)], [x, y + 0.075, -0.3], [0, (rng() - 0.5) * 0.2, 0]));
      }
    }
    return { parts, colliders: [cbox(0.95, 1.85, 0.82, 'metal', 'vending')] };
  },
  lod1() {
    return {
      parts: [P(BOX(0.95, 1.85, 0.8), 'metal.paintedDark', [0, 0.925, 0]), P(BOX(0.66, 1.3, 0.02), 'glass.tinted', [-0.09, 0.94, -0.4])],
      colliders: [cbox(0.95, 1.85, 0.82, 'metal', 'vending')],
    };
  },
});

def('prop.waterCooler', 'Water cooler', [0.36, 1.28, 0.36], ['breakroom', 'office'], 'breakroom', {
  mats: ['plastic.white', 'glass.frosted', 'plastic.dark', 'plastic.grey'],
  use: 'waiting, spine, execante, breakroom',
  coll: 'single AABB 0.36 × 1.28 × 0.36',
  acc: 'Bottle-top water cooler: cabinet, inverted 19 L bottle with visible waterline taper, two taps, cup sleeve on the side.',
  build() {
    return {
      parts: [
        P(BB(0.34, 0.94, 0.34, 0.012), 'plastic.white', [0, 0.48, 0]),
        P(lathe('coolerBottle', [[0, 0], [0.13, 0], [0.145, 0.2], [0.13, 0.3], [0.05, 0.36], [0, 0.36]], 14), 'glass.frosted', [0, 0.94, 0]),
        P(BB(0.2, 0.06, 0.08, 0.008), 'plastic.dark', [0, 0.78, -0.19]),
        P(CYL(0.012, 0.012, 0.05, 8), 'plastic.smooth', [-0.05, 0.75, -0.21]),
        P(CYL(0.012, 0.012, 0.05, 8), 'plastic.grey', [0.05, 0.75, -0.21]),
        P(CYL(0.035, 0.035, 0.3, 10), 'plastic.grey', [0.2, 0.75, 0.05]),
        P(BB(0.24, 0.05, 0.24, 0.006), 'plastic.dark', [0, 0.025, 0]),
      ],
      colliders: [cbox(0.36, 1.28, 0.36, 'plastic', 'cooler')],
    };
  },
});

def('prop.mug', 'Ceramic mug', [0.09, 0.1, 0.09], ['clutter'], 'clutter', {
  mats: ['plastic.white', 'plastic.grey', 'plastic.dark'],
  use: 'desks, breakroom',
  coll: 'none — small clutter',
  acc: 'Office mug with handle; three colour ways picked by variant/rng. Sits flat on any surface.',
  variants: ['white', 'grey', 'navy'],
  build(o = {}) {
    const m = o.variant === 'grey' ? 'plastic.grey' : o.variant === 'navy' ? 'plastic.dark' : 'plastic.white';
    return {
      parts: [
        P(lathe('mug', [[0, 0], [0.04, 0], [0.045, 0.1], [0.036, 0.1], [0.033, 0.012], [0, 0.012]], 12), m, [0, 0, 0]),
        P(TOR(0.026, 0.007, 5, 10, Math.PI), 'plastic.white' === m ? 'plastic.white' : m, [0.045, 0.05, 0], [0, 0, Math.PI / 2]),
      ],
      colliders: [],
    };
  },
});

def('prop.cupPaper', 'Paper cup', [0.08, 0.11, 0.08], ['clutter'], 'clutter', {
  mats: ['paper.white', 'plastic.white'],
  use: 'breakroom, water cooler, desks',
  coll: 'none — small clutter',
  acc: 'Takeaway cup with lid; variant: tipped (on its side).',
  variants: ['upright', 'tipped'],
  build(o = {}) {
    const tipped = o.variant === 'tipped';
    const body = P(CYL(0.038, 0.028, 0.1, 12), 'paper.white', tipped ? [0, 0.038, 0] : [0, 0.05, 0], tipped ? [0, 0, Math.PI / 2 - 0.05] : undefined);
    const lid = P(CYL(0.04, 0.04, 0.012, 12), 'plastic.white', tipped ? [-0.055, 0.038, 0] : [0, 0.105, 0], tipped ? [0, 0, Math.PI / 2] : undefined);
    return { parts: [body, lid], colliders: [] };
  },
});

def('prop.plateStack', 'Plate stack', [0.2, 0.08, 0.2], ['breakroom'], 'clutter', {
  mats: ['plastic.white'],
  use: 'breakroom counter/sink',
  coll: 'none — small clutter',
  acc: 'Stack of five dinner plates with slight rotation jitter.',
  build(o = {}) {
    const rng = o.rng ?? rngFor('plates');
    const parts = [];
    for (let i = 0; i < 5; i++) {
      parts.push(P(CYL(0.095, 0.075, 0.014, 16), 'plastic.white', [(rng() - 0.5) * 0.008, 0.008 + i * 0.015, (rng() - 0.5) * 0.008]));
    }
    return { parts, colliders: [] };
  },
});

def('prop.foodContainer', 'Food container', [0.16, 0.08, 0.12], ['breakroom'], 'clutter', {
  mats: ['plastic.white', 'plastic.smooth', 'glass.frosted'],
  use: 'breakroom tables, fridge',
  coll: 'none — small clutter',
  acc: 'Lunch container with translucent lid; variant: open (lid leaning beside it).',
  variants: ['closed', 'open'],
  build(o = {}) {
    const open = o.variant === 'open';
    const parts = [P(BB(0.15, 0.06, 0.11, 0.01), 'glass.frosted', [0, 0.03, 0])];
    if (open) parts.push(P(BB(0.15, 0.012, 0.11, 0.004), 'plastic.white', [0.1, 0.006, 0.03], [0, 0.4, 0]));
    else parts.push(P(BB(0.155, 0.012, 0.115, 0.004), 'plastic.white', [0, 0.066, 0]));
    return { parts, colliders: [] };
  },
});

def('prop.snackBox', 'Snack packaging', [0.12, 0.16, 0.06], ['breakroom'], 'clutter', {
  mats: ['cardboard.box', 'plastic.white', 'plastic.smooth'],
  use: 'breakroom, vending surrounds, desks',
  coll: 'none — small clutter',
  acc: 'Small product boxes/pouches in three shapes chosen by rng; sits upright or fallen.',
  build(o = {}) {
    const rng = o.rng ?? rngFor('snack');
    const kind = rng();
    const parts = [];
    if (kind < 0.4) parts.push(P(BB(0.11, 0.15, 0.05, 0.004), 'cardboard.box', [0, 0.075, 0], [0, rng() * 6, 0]));
    else if (kind < 0.7) parts.push(P(BB(0.1, 0.04, 0.14, 0.008), 'plastic.smooth', [0, 0.02, 0], [0, rng() * 6, 0]));
    else parts.push(P(BB(0.08, 0.12, 0.04, 0.01), 'plastic.white', [0, 0.06, 0], [0.1, rng() * 6, 0.06]));
    return { parts, colliders: [] };
  },
});

def('prop.binTrash', 'Trash bin', [0.4, 0.62, 0.4], ['breakroom', 'office'], 'breakroom', {
  mats: ['plastic.dark', 'plastic.grey', 'paper.white'],
  use: 'breakroom, copy, corridors',
  coll: 'single AABB 0.4 × 0.62 × 0.4',
  acc: 'Swing-lid waste bin: tapered body, lid with flap, overflowing paper variant. Variants: closed | full.',
  variants: ['closed', 'full'],
  build(o = {}) {
    const parts = [
      P(CYL(0.19, 0.16, 0.56, 14), 'plastic.dark', [0, 0.28, 0]),
      P(CYL(0.2, 0.2, 0.05, 14), 'plastic.grey', [0, 0.585, 0]),
    ];
    if (o.variant === 'full') {
      parts.push(P(SPH(1, 8, 6), 'paper.white', [0.04, 0.62, 0.02], undefined, [0.09, 0.05, 0.08]));
      parts.push(P(SPH(1, 8, 6), 'paper.cream', [-0.06, 0.6, -0.04], undefined, [0.06, 0.04, 0.06]));
      parts.push(P(BB(0.09, 0.05, 0.06, 0.008), 'paper.white', [0.12, 0.025, 0.16], [0.4, 1.1, 0.2]));
    } else {
      parts.push(P(BB(0.16, 0.02, 0.14, 0.005), 'plastic.grey', [0, 0.6, 0], [0.25, 0, 0]));
    }
    return { parts, colliders: [cbox(0.4, 0.62, 0.4, 'plastic', 'bin')] };
  },
});

def('prop.binRecycle', 'Recycling bin', [0.36, 0.55, 0.36], ['breakroom', 'office'], 'breakroom', {
  mats: ['plastic.smooth', 'paper.white'],
  use: 'copy, breakroom, openplanA',
  coll: 'single AABB 0.36 × 0.55 × 0.36',
  acc: 'Open-top recycling bin (blue-read smooth plastic) with paper sticking out; slot band suggests the waste stream.',
  build() {
    return {
      parts: [
        P(BB(0.34, 0.52, 0.34, 0.014), 'plastic.smooth', [0, 0.26, 0]),
        P(BB(0.36, 0.05, 0.36, 0.008), 'plastic.smooth', [0, 0.5, 0]),
        P(BB(0.26, 0.1, 0.2, 0.004), 'paper.white', [0.02, 0.54, 0], [0.1, 0.5, 0.12]),
      ],
      colliders: [cbox(0.36, 0.55, 0.36, 'plastic', 'bin')],
    };
  },
});

def('prop.binOffice', 'Under-desk waste bin', [0.26, 0.3, 0.26], ['office'], 'clutter', {
  mats: ['metal.paintedDark', 'paper.white'],
  use: 'every second desk',
  coll: 'none — small clutter',
  acc: 'Small mesh-read bin beside a desk; variant with a crumpled paper ball inside.',
  variants: ['empty', 'paper'],
  build(o = {}) {
    const parts = [P(CYL(0.125, 0.1, 0.3, 12, true), 'metal.paintedDark', [0, 0.15, 0])];
    parts.push(P(CYL(0.1, 0.1, 0.01, 12), 'metal.paintedDark', [0, 0.008, 0]));
    if (o.variant === 'paper') parts.push(P(SPH(0.05, 7, 5), 'paper.white', [0.01, 0.1, 0.01], [0.4, 0.9, 0.2], [1, 0.8, 0.9]));
    return { parts, colliders: [] };
  },
});

def('prop.dispenserTowel', 'Paper-towel dispenser', [0.3, 0.36, 0.13], ['restroom', 'breakroom', 'wall'], 'restroom', {
  mats: ['plastic.white', 'paper.white'],
  use: 'restroom, breakroom, janitor',
  coll: 'none — wall mounted',
  acc: 'Wall dispenser with a towel tongue hanging from the slot. Pivot at unit centre against wall.',
  build() {
    return {
      parts: [
        P(BB(0.3, 0.36, 0.12, 0.012), 'plastic.white', [0, 0, -0.06]),
        P(BB(0.24, 0.02, 0.1, 0.004), 'plastic.grey', [0, -0.17, -0.06]),
        P(BB(0.12, 0.09, 0.006, 0.002), 'paper.white', [0, -0.21, -0.09], [0.15, 0, 0.05]),
      ],
      colliders: [],
    };
  },
});

def('prop.dispenserSoap', 'Soap dispenser', [0.12, 0.18, 0.11], ['restroom', 'wall'], 'restroom', {
  mats: ['plastic.white', 'plastic.smooth'],
  use: 'restroom, breakroom sink, janitor',
  coll: 'none — wall mounted',
  acc: 'Wall soap dispenser with sight window and push bar. Pivot at unit centre against wall.',
  build() {
    return {
      parts: [
        P(BB(0.12, 0.18, 0.09, 0.01), 'plastic.white', [0, 0, -0.045]),
        P(BB(0.05, 0.09, 0.006, 0.002), 'plastic.smooth', [0, 0.01, -0.092]),
        P(BB(0.08, 0.03, 0.04, 0.006), 'plastic.smooth', [0, -0.1, -0.075]),
      ],
      colliders: [],
    };
  },
});

/* ================================================================== */
/* RESTROOM                                                            */
/* ================================================================== */

def('prop.vanityUnit', 'Restroom vanity', [1.6, 0.86, 0.56], ['restroom'], 'restroom', {
  mats: ['laminate.white', 'plastic.white', 'metal.stainless', 'metal.brushed'],
  use: 'restroom',
  coll: 'single AABB run × 0.86 × 0.56',
  acc: 'Two-basin vanity against a wall (+Z into wall): counter with apron, inset basins, monobloc faucets, under-counter P-traps. opts.width 1.2–2.4 m; opts.basins 1–3.',
  build(o = {}) {
    const w = Math.min(2.4, Math.max(1.2, o.width ?? 1.6));
    const nb = Math.min(3, Math.max(1, o.basins ?? 2));
    const parts = [
      P(BB(w, 0.04, 0.56, 0.01), 'laminate.white', [0, 0.84, 0]),
      P(BB(w, 0.12, 0.03, 0.006), 'laminate.white', [0, 0.77, -0.265]),
    ];
    for (let i = 0; i < nb; i++) {
      const x = -w / 2 + ((i + 0.5) * w) / nb;
      parts.push(P(lathe('basin', [[0, 0.02], [0.14, 0.02], [0.17, 0.1], [0.185, 0.11], [0, 0.11]], 16), 'plastic.white', [x, 0.75, -0.02], [Math.PI, 0, 0]));
      parts.push(P(CYL(0.014, 0.018, 0.14, 8), 'metal.stainless', [x, 0.9, 0.14]));
      parts.push(P(CYL(0.01, 0.01, 0.1, 8), 'metal.stainless', [x, 0.955, 0.09], [1.1, 0, 0]));
      // P-trap
      parts.push(P(CYL(0.02, 0.02, 0.22, 8), 'metal.brushed', [x, 0.6, 0.1]));
      parts.push(P(TOR(0.05, 0.02, 6, 10, Math.PI), 'metal.brushed', [x, 0.48, 0.1], [0, 0, Math.PI]));
      parts.push(P(CYL(0.02, 0.02, 0.16, 8), 'metal.brushed', [x, 0.52, 0.18], [1.35, 0, 0]));
    }
    return { parts, colliders: [cbox(w, 0.86, 0.56, 'ceramic', 'vanity')] };
  },
});

def('prop.mirrorWall', 'Restroom mirror', [1.5, 0.9, 0.03], ['restroom', 'wall'], 'restroom', {
  mats: ['metal.stainless', 'metal.aluminium'],
  use: 'restroom above vanity',
  coll: 'none — wall mounted',
  acc: 'Frameless mirror band with clip hardware; polished stainless face reads specular under the restroom fluorescents. Pivot at mirror centre against wall.',
  build(o = {}) {
    const w = Math.min(2.4, Math.max(0.6, o.width ?? 1.5));
    return {
      parts: [
        P(BB(w, 0.9, 0.02, 0.004), 'metal.stainless', [0, 0, -0.012]),
        P(BB(w + 0.02, 0.025, 0.03, 0.004), 'metal.aluminium', [0, -0.462, -0.012]),
        P(BB(w + 0.02, 0.025, 0.03, 0.004), 'metal.aluminium', [0, 0.462, -0.012]),
      ],
      colliders: [],
    };
  },
});

def('prop.toilet', 'Toilet', [0.4, 0.78, 0.68], ['restroom'], 'restroom', {
  mats: ['plastic.white', 'metal.brushed', 'plastic.smooth'],
  use: 'restroom stalls',
  coll: 'single AABB 0.4 × 0.78 × 0.68',
  acc: 'Close-coupled WC: pedestal, elongated bowl, cistern with flush button, seat + lid, floor bolt caps. Variant: lidUp.',
  variants: ['lidDown', 'lidUp'],
  build(o = {}) {
    const lidUp = o.variant === 'lidUp';
    const parts = [
      P(BB(0.24, 0.3, 0.3, 0.03), 'plastic.white', [0, 0.15, 0.1]),
      P(CYL(0.19, 0.13, 0.18, 14), 'plastic.white', [0, 0.3, -0.1], undefined, [1, 1, 1.25]),
      P(CYL(0.2, 0.2, 0.05, 14), 'plastic.white', [0, 0.415, -0.1], undefined, [1, 1, 1.3]),
      P(BB(0.4, 0.32, 0.16, 0.02), 'plastic.white', [0, 0.6, 0.24]),
      P(CYL(0.02, 0.02, 0.01, 8), 'metal.brushed', [0, 0.765, 0.24]),
      P(CYL(0.03, 0.03, 0.015, 8), 'plastic.white', [-0.09, 0.02, 0.02]),
      P(CYL(0.03, 0.03, 0.015, 8), 'plastic.white', [0.09, 0.02, 0.02]),
    ];
    if (lidUp) {
      parts.push(P(CYL(0.21, 0.21, 0.02, 14), 'plastic.smooth', [0, 0.55, 0.15], [Math.PI / 2 - 0.25, 0, 0], [1, 1, 1.3]));
    } else {
      parts.push(P(CYL(0.21, 0.21, 0.02, 14), 'plastic.smooth', [0, 0.45, -0.1], undefined, [1, 1, 1.3]));
    }
    return { parts, colliders: [cbox(0.4, 0.78, 0.68, 'ceramic', 'toilet')] };
  },
  lod1() {
    return {
      parts: [P(BOX(0.38, 0.42, 0.6), 'plastic.white', [0, 0.21, -0.02]), P(BOX(0.4, 0.34, 0.16), 'plastic.white', [0, 0.6, 0.24])],
      colliders: [cbox(0.4, 0.78, 0.68, 'ceramic', 'toilet')],
    };
  },
});

def('prop.urinal', 'Wall urinal', [0.36, 0.62, 0.34], ['restroom', 'wall'], 'restroom', {
  mats: ['plastic.white', 'metal.stainless'],
  use: 'restroom',
  coll: 'single AABB 0.36 × 0.62 × 0.34 offset onto the wall',
  acc: 'Wall-hung urinal: shell body, hood, flush pipe from above, drain dome. Pivot at bowl centre against wall, bowl lip at ~0.6 m when mounted at 0.45 m.',
  build() {
    return {
      parts: [
        P(SPH(1, 12, 10), 'plastic.white', [0, 0.28, -0.13], undefined, [0.17, 0.3, 0.16]),
        P(BB(0.32, 0.2, 0.14, 0.03), 'plastic.white', [0, 0.5, -0.09]),
        P(CYL(0.014, 0.014, 0.34, 8), 'metal.stainless', [0, 0.76, -0.06]),
        P(CYL(0.03, 0.03, 0.03, 8), 'metal.stainless', [0, 0.6, -0.06]),
        P(CYL(0.035, 0.035, 0.012, 10), 'metal.stainless', [0, 0.235, -0.14], [0.5, 0, 0]),
      ],
      colliders: [cbox(0.36, 0.7, 0.34, 'ceramic', 'urinal', 0, -0.1, 0.1)],
    };
  },
});

def('prop.stallPartition', 'Toilet stall partition', [1.1, 1.9, 1.5], ['restroom', 'cover'], 'restroom', {
  mats: ['laminate.grey', 'metal.aluminium', 'metal.brushed'],
  use: 'restroom',
  coll: 'side panel + door AABBs (0.2 m floor gap preserved visually)',
  acc: 'Cubicle: side panel on pilaster feet, front stile, door with latch and hinge blocks. Variants: closed | ajar (door swung 35°) | open (door at 80°) | panelOnly (end panel with no door — closes the last stall of a run). Panels float 0.2 m off the floor on feet like a real washroom system.',
  variants: ['closed', 'ajar', 'open', 'panelOnly'],
  build(o = {}) {
    const ang = o.variant === 'open' ? 1.4 : o.variant === 'ajar' ? 0.6 : 0;
    const parts = [
      // Side panel (at +X edge), on feet
      P(BB(0.025, 1.6, 1.5, 0.006), 'laminate.grey', [0.55, 1.0, 0]),
      P(CYL(0.015, 0.02, 0.2, 8), 'metal.aluminium', [0.55, 0.1, -0.6]),
      P(CYL(0.015, 0.02, 0.2, 8), 'metal.aluminium', [0.55, 0.1, 0.55]),
    ];
    if (o.variant === 'panelOnly') {
      return { parts, colliders: [COL(0.53, 0, -0.75, 0.57, 1.9, 0.75, 'wood', 'stall')] };
    }
    parts.push(
      // Front stile beside the door
      P(BB(0.14, 1.6, 0.025, 0.006), 'laminate.grey', [-0.48, 1.0, -0.737]),
      P(CYL(0.015, 0.02, 0.2, 8), 'metal.aluminium', [-0.48, 0.1, -0.737]),
      // Head rail
      P(BB(1.12, 0.04, 0.04, 0.006), 'metal.aluminium', [0, 1.82, -0.737]),
    );
    // Door 0.6 wide hinged at x -0.41
    const hx = -0.41;
    const M = new THREE.Matrix4().compose(
      new THREE.Vector3(hx, 0, -0.75),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -ang, 0)),
      new THREE.Vector3(1, 1, 1),
    );
    const doorParts = [
      P(BB(0.6, 1.6, 0.025, 0.006), 'laminate.grey', [0.3, 1.0, 0]),
      P(BB(0.03, 0.08, 0.04, 0.004), 'metal.brushed', [0.55, 1.0, -0.02]),
      P(BB(0.04, 0.1, 0.03, 0.004), 'metal.brushed', [0.02, 1.3, 0]),
      P(BB(0.04, 0.1, 0.03, 0.004), 'metal.brushed', [0.02, 0.5, 0]),
    ];
    for (const p of doorParts) parts.push({ ...p, matrix: M.clone().multiply(p.matrix) });
    const colliders = [
      COL(0.53, 0, -0.75, 0.57, 1.9, 0.75, 'wood', 'stall'),
      COL(-0.55, 0, -0.76, -0.41, 1.9, -0.71, 'wood', 'stall'),
    ];
    if (ang < 0.1) colliders.push(COL(-0.41, 0, -0.78, 0.2, 1.9, -0.72, 'wood', 'stallDoor'));
    return { parts, colliders };
  },
});

def('prop.handDryer', 'Hand dryer', [0.3, 0.34, 0.2], ['restroom', 'wall'], 'restroom', {
  mats: ['metal.brushed', 'plastic.dark'],
  use: 'restroom',
  coll: 'none — wall mounted',
  acc: 'Wall hand dryer: brushed shell, dark nozzle throat, indicator dot. Pivot at unit centre against wall.',
  build() {
    return {
      parts: [
        P(BB(0.3, 0.3, 0.17, 0.02), 'metal.brushed', [0, 0.02, -0.085]),
        P(BB(0.22, 0.08, 0.1, 0.014), 'plastic.dark', [0, -0.15, -0.1]),
        P(CYL(0.006, 0.006, 0.006, 6), 'plastic.smooth', [0.1, 0.1, -0.172], [Math.PI / 2, 0, 0]),
      ],
      colliders: [],
    };
  },
});

/* ================================================================== */
/* MAINTENANCE / LOADING                                               */
/* ================================================================== */

def('prop.electricalPanel', 'Electrical panel', [0.5, 0.72, 0.15], ['maintenance', 'wall'], 'maintenance', {
  mats: ['metal.painted', 'metal.paintedDark', 'plastic.dark', 'emissive.ledRed'],
  use: 'mechanical, loading, janitor, garage',
  coll: 'none — wall mounted, shallow',
  acc: 'Distribution board: grey enclosure with door seam, latch, conduit stub top and bottom, fault LED. Label applied by signage.js. Variant: open (breaker rows visible). Pivot at panel centre against wall.',
  variants: ['closed', 'open'],
  build(o = {}) {
    const open = o.variant === 'open';
    const parts = [
      P(BB(0.5, 0.72, 0.13, 0.008), 'metal.painted', [0, 0, -0.065]),
      P(CYL(0.022, 0.022, 0.3, 8), 'metal.galvanised', [0.12, 0.5, -0.06]),
      P(CYL(0.018, 0.018, 0.26, 8), 'metal.galvanised', [-0.1, -0.48, -0.06]),
      P(BB(0.01, 0.01, 0.006, 0.001), 'emissive.ledRed', [0.17, 0.28, -0.133]),
    ];
    if (open) {
      parts.push(P(BB(0.46, 0.68, 0.014, 0.004), 'metal.painted', [-0.44, 0, -0.11], [0, 1.2, 0]));
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 2; c++) {
          parts.push(P(BB(0.05, 0.055, 0.02, 0.003), 'plastic.dark', [-0.06 + c * 0.12, 0.26 - r * 0.072, -0.135]));
        }
      }
    } else {
      parts.push(P(BB(0.44, 0.64, 0.014, 0.004), 'metal.painted', [0, 0, -0.135]));
      parts.push(P(BB(0.025, 0.09, 0.02, 0.003), 'metal.paintedDark', [0.19, 0, -0.14]));
    }
    return { parts, colliders: [] };
  },
});

def('prop.breakerBox', 'Small breaker box', [0.3, 0.42, 0.12], ['maintenance', 'wall'], 'maintenance', {
  mats: ['metal.painted', 'metal.galvanised'],
  use: 'janitor, server, garage',
  coll: 'none — wall mounted',
  acc: 'Compact breaker enclosure with hinge knuckles and a single conduit drop. Pivot at box centre against wall.',
  build() {
    return {
      parts: [
        P(BB(0.3, 0.42, 0.11, 0.008), 'metal.painted', [0, 0, -0.055]),
        P(BB(0.26, 0.38, 0.012, 0.004), 'metal.painted', [0, 0, -0.114]),
        P(CYL(0.014, 0.014, 0.22, 8), 'metal.galvanised', [0, -0.32, -0.05]),
        P(BB(0.02, 0.05, 0.02, 0.003), 'metal.galvanised', [-0.145, 0.12, -0.06]),
        P(BB(0.02, 0.05, 0.02, 0.003), 'metal.galvanised', [-0.145, -0.12, -0.06]),
      ],
      colliders: [],
    };
  },
});

def('prop.transformerCabinet', 'Transformer cabinet', [1.0, 1.4, 0.8], ['maintenance', 'cover'], 'maintenance', {
  mats: ['metal.painted', 'metal.galvanised', 'metal.paintedDark', 'emissive.ledAmber'],
  use: 'mechanical',
  coll: 'single AABB 1.0 × 1.4 × 0.8 (chest-high cover)',
  acc: 'Floor-standing transformer: ribbed cabinet with vent louvres, lifting eyes, conduit risers, hum-worthy mass; hazard label from signage.js.',
  build() {
    const parts = [
      P(BB(1.0, 1.32, 0.8, 0.014), 'metal.painted', [0, 0.7, 0]),
      P(BB(1.04, 0.05, 0.84, 0.01), 'metal.painted', [0, 1.38, 0]),
      P(BB(0.9, 0.08, 0.84, 0.008), 'metal.paintedDark', [0, 0.04, 0]),
      P(CYL(0.035, 0.035, 0.6, 8), 'metal.galvanised', [0.3, 1.6, 0.2]),
      P(CYL(0.028, 0.028, 0.5, 8), 'metal.galvanised', [-0.25, 1.6, 0.2]),
      P(BB(0.015, 0.02, 0.008, 0.001), 'emissive.ledAmber', [0.32, 1.05, -0.404]),
    ];
    for (let i = 0; i < 6; i++) parts.push(P(BB(0.8, 0.03, 0.015, 0.003), 'metal.paintedDark', [0, 0.35 + i * 0.12, -0.402]));
    for (const sx of [-0.42, 0.42]) parts.push(P(TOR(0.035, 0.012, 5, 10), 'metal.paintedDark', [sx, 1.41, 0], [Math.PI / 2, 0, 0]));
    return { parts, colliders: [cbox(1.0, 1.4, 0.8, 'metal', 'transformer')] };
  },
});

def('prop.hvacUnit', 'Air handling unit', [2.4, 1.8, 1.2], ['maintenance', 'cover'], 'maintenance', {
  mats: ['metal.galvanised', 'metal.painted', 'metal.paintedDark', 'plastic.dark'],
  use: 'mechanical',
  coll: 'single AABB 2.4 × 1.8 × 1.2 (full cover block)',
  acc: 'Packaged AHU: panelled casing with seam battens, two access doors with latches, fan intake grille, duct collar at the top and vibration feet.',
  build() {
    const parts = [
      P(BB(2.4, 1.6, 1.2, 0.018), 'metal.galvanised', [0, 0.9, 0]),
      // Panel seams
      ...[-0.6, 0, 0.6].map((x) => P(BB(0.03, 1.56, 1.22, 0.004), 'metal.painted', [x, 0.9, 0])),
      // Access doors
      P(BB(0.5, 0.9, 0.02, 0.005), 'metal.painted', [-0.9, 0.75, -0.605]),
      P(BB(0.5, 0.9, 0.02, 0.005), 'metal.painted', [-0.28, 0.75, -0.605]),
      P(BB(0.03, 0.12, 0.03, 0.004), 'metal.paintedDark', [-0.7, 0.75, -0.615]),
      P(BB(0.03, 0.12, 0.03, 0.004), 'metal.paintedDark', [-0.08, 0.75, -0.615]),
      // Intake grille
      ...[0, 1, 2, 3, 4, 5].map((i) => P(BB(0.7, 0.05, 0.015, 0.003), 'plastic.dark', [0.7, 0.5 + i * 0.14, -0.605])),
      // Duct collar + duct stub up
      P(BB(0.7, 0.3, 0.7, 0.02), 'metal.galvanised', [0.6, 1.85, 0.1]),
      P(BB(0.6, 0.5, 0.6, 0.015), 'metal.galvanised', [0.6, 2.2, 0.1]),
      // Feet
      ...[[-1.05, -0.45], [-1.05, 0.45], [1.05, -0.45], [1.05, 0.45]].map(([x, z]) => P(BB(0.16, 0.12, 0.16, 0.01), 'rubber.black', [x, 0.06, z])),
    ];
    return { parts, colliders: [cbox(2.4, 1.9, 1.2, 'metal', 'hvac')] };
  },
  lod1() {
    return {
      parts: [P(BOX(2.4, 1.7, 1.2), 'metal.galvanised', [0, 0.9, 0])],
      colliders: [cbox(2.4, 1.9, 1.2, 'metal', 'hvac')],
    };
  },
});

def('prop.pipeManifold', 'Pipe riser & valves', [0.7, 2.4, 0.35], ['maintenance'], 'maintenance', {
  mats: ['metal.galvanised', 'metal.paintedRed', 'metal.painted', 'metal.brushed'],
  use: 'mechanical, janitor, garage',
  coll: 'single AABB 0.7 × 2.4 × 0.35 against wall',
  acc: 'Wall pipe group: two galvanised risers with flanges and a red sprinkler main, branch tee, two hand wheels and a gauge. Variant: sprinkler (all red, tagged). Pivot at floor against wall.',
  variants: ['mixed', 'sprinkler'],
  build(o = {}) {
    const sprk = o.variant === 'sprinkler';
    const mainMat = sprk ? 'metal.paintedRed' : 'metal.galvanised';
    const parts = [
      P(CYL(0.05, 0.05, 2.4, 12), mainMat, [-0.18, 1.2, -0.12]),
      P(CYL(0.035, 0.035, 2.4, 10), sprk ? 'metal.paintedRed' : 'metal.painted', [0.05, 1.2, -0.12]),
      P(CYL(0.028, 0.028, 2.2, 10), 'metal.galvanised', [0.24, 1.1, -0.12]),
      // Flanges
      P(CYL(0.08, 0.08, 0.03, 12), mainMat, [-0.18, 0.5, -0.12]),
      P(CYL(0.08, 0.08, 0.03, 12), mainMat, [-0.18, 1.7, -0.12]),
      // Branch tee out from the wall
      P(CYL(0.035, 0.035, 0.3, 10), mainMat, [-0.05, 1.1, -0.12], [0, 0, Math.PI / 2]),
      // Hand wheels
      P(TOR(0.07, 0.012, 6, 14), 'metal.paintedRed', [-0.18, 1.32, -0.24], [Math.PI / 2, 0, 0]),
      P(CYL(0.012, 0.012, 0.1, 6), 'metal.brushed', [-0.18, 1.28, -0.2], [0.6, 0, 0]),
      P(TOR(0.05, 0.01, 6, 12), 'metal.paintedRed', [0.24, 0.9, -0.2], [Math.PI / 2, 0, 0]),
      // Gauge
      P(CYL(0.045, 0.045, 0.03, 12), 'metal.brushed', [0.05, 1.5, -0.2], [Math.PI / 2, 0, 0]),
      P(CYL(0.036, 0.036, 0.006, 12), 'plastic.white', [0.05, 1.5, -0.217], [Math.PI / 2, 0, 0]),
    ];
    return { parts, colliders: [cbox(0.7, 2.4, 0.35, 'metal', 'pipes', 0, -0.1)] };
  },
});

def('prop.fireExtinguisher', 'Fire extinguisher', [0.18, 0.55, 0.18], ['maintenance', 'safety'], 'maintenance', {
  mats: ['metal.paintedRed', 'metal.brushed', 'rubber.black', 'plastic.dark'],
  use: 'every wing — corridors, plant, garage, kitchens',
  coll: 'none — small clutter (bracket-mounted or floor)',
  acc: '6 kg extinguisher: red cylinder with dome, valve head with lever and pin, hose clipped down the side, gauge dot. Variants: wall (with bracket, pivot at tank centre against wall) | floor.',
  variants: ['floor', 'wall'],
  build(o = {}) {
    const wall = o.variant === 'wall';
    const zoff = wall ? -0.1 : 0;
    const yoff = wall ? -0.28 : 0;
    const parts = [
      P(lathe('extinguisher', [[0, 0], [0.075, 0], [0.08, 0.06], [0.08, 0.38], [0.05, 0.45], [0, 0.45]], 14), 'metal.paintedRed', [0, yoff + (wall ? 0.28 - 0.28 : 0), zoff]),
      P(CYL(0.02, 0.02, 0.06, 8), 'metal.brushed', [0, yoff + 0.48, zoff]),
      P(BB(0.03, 0.02, 0.11, 0.004), 'metal.brushed', [0, yoff + 0.52, zoff - 0.03]),
      P(CYL(0.009, 0.009, 0.3, 6), 'rubber.black', [0.08, yoff + 0.28, zoff], [0, 0, 0.1]),
      P(CYL(0.016, 0.016, 0.05, 6), 'plastic.dark', [0.085, yoff + 0.12, zoff], [0.3, 0, 0]),
      P(CYL(0.015, 0.015, 0.012, 8), 'plastic.white', [0.02, yoff + 0.46, zoff - 0.035], [Math.PI / 2, 0, 0]),
    ];
    if (wall) parts.push(P(BB(0.08, 0.5, 0.04, 0.006), 'metal.paintedDark', [0, -0.03, -0.02]));
    return { parts, colliders: [] };
  },
});

def('prop.fireCabinet', 'Fire equipment cabinet', [0.45, 0.7, 0.2], ['maintenance', 'safety', 'wall'], 'maintenance', {
  mats: ['metal.paintedRed', 'glass.clear', 'metal.brushed'],
  use: 'northcorr, southcorr, loading, garage',
  coll: 'none — wall mounted, shallow',
  acc: 'Recessed fire cabinet: red frame, glazed door showing an extinguisher silhouette inside, pull latch. Pivot at cabinet centre against wall.',
  build() {
    return {
      parts: [
        P(BB(0.45, 0.7, 0.18, 0.008), 'metal.paintedRed', [0, 0, -0.02]),
        P(BOX(0.34, 0.58, 0.008), 'glass.clear', [0, 0, -0.115]),
        P(BB(0.05, 0.02, 0.03, 0.003), 'metal.brushed', [0.16, 0, -0.115]),
        P(lathe('extinguisher', [[0, 0], [0.075, 0], [0.08, 0.06], [0.08, 0.38], [0.05, 0.45], [0, 0.45]], 12), 'metal.paintedRed', [0, -0.31, 0.02]),
      ],
      colliders: [],
    };
  },
});

def('prop.sprinklerHead', 'Sprinkler head', [0.08, 0.09, 0.08], ['maintenance', 'ceiling'], 'maintenance', {
  mats: ['metal.brushed', 'metal.paintedRed'],
  use: 'all suspended ceilings',
  coll: 'none — ceiling fixture',
  acc: 'Pendent sprinkler: escutcheon ring, drop, frame arms and a red bulb dot. Pivot at ceiling plane, hangs down.',
  build() {
    return {
      parts: [
        P(CYL(0.04, 0.04, 0.008, 12), 'metal.brushed', [0, -0.004, 0]),
        P(CYL(0.012, 0.012, 0.05, 8), 'metal.brushed', [0, -0.03, 0]),
        P(CYL(0.003, 0.02, 0.03, 6), 'metal.brushed', [0, -0.065, 0]),
        P(SPH(0.007, 6, 5), 'metal.paintedRed', [0, -0.052, 0]),
      ],
      colliders: [],
    };
  },
});

def('prop.smokeDetector', 'Smoke detector', [0.14, 0.05, 0.14], ['maintenance', 'ceiling'], 'maintenance', {
  mats: ['plastic.white', 'emissive.ledRed'],
  use: 'all rooms',
  coll: 'none — ceiling fixture',
  acc: 'Ceiling smoke detector puck with vent ring shadow and a red standby LED. Pivot at ceiling plane.',
  build() {
    return {
      parts: [
        P(CYL(0.065, 0.055, 0.035, 14), 'plastic.white', [0, -0.018, 0]),
        P(CYL(0.03, 0.03, 0.01, 10), 'plastic.white', [0, -0.04, 0]),
        P(SPH(0.005, 6, 5), 'emissive.ledRed', [0.03, -0.037, 0]),
      ],
      colliders: [],
    };
  },
});

def('prop.janitorCart', 'Janitor cart', [1.1, 1.0, 0.55], ['maintenance', 'cover'], 'maintenance', {
  mats: ['plastic.grey', 'plastic.dark', 'fabric.sofa', 'metal.painted', 'plastic.white'],
  use: 'janitor, southcorr',
  coll: 'single AABB 1.1 × 1.0 × 0.55',
  acc: 'Cleaning cart: chassis with two shelves, vinyl waste-bag sack, push handle, four castors, bottles on the top tray.',
  build(o = {}) {
    const rng = o.rng ?? rngFor('cart');
    const parts = [
      P(BB(0.7, 0.03, 0.5, 0.008), 'plastic.grey', [-0.15, 0.12, 0]),
      P(BB(0.7, 0.03, 0.5, 0.008), 'plastic.grey', [-0.15, 0.5, 0]),
      P(BB(0.7, 0.035, 0.52, 0.01), 'plastic.grey', [-0.15, 0.86, 0]),
      ...[-0.48, 0.18].map((x) => P(BB(0.04, 0.86, 0.04, 0.005), 'plastic.dark', [x, 0.48, -0.22])),
      ...[-0.48, 0.18].map((x) => P(BB(0.04, 0.86, 0.04, 0.005), 'plastic.dark', [x, 0.48, 0.22])),
      // Waste bag on the end frame
      P(CYL(0.2, 0.16, 0.55, 10), 'fabric.sofa', [0.38, 0.62, 0]),
      P(TOR(0.2, 0.015, 5, 12), 'metal.painted', [0.38, 0.9, 0], [Math.PI / 2, 0, 0]),
      // Push handle
      P(CYL(0.014, 0.014, 0.4, 8), 'metal.painted', [-0.52, 0.95, 0], [Math.PI / 2, 0, 0]),
      ...[-0.18, 0.18].map((z) => P(CYL(0.012, 0.012, 0.16, 6), 'metal.painted', [-0.52, 0.9, z], [0.3, 0, 0])),
    ];
    for (const sx of [-0.42, 0.1]) for (const sz of [-0.2, 0.2]) parts.push(...castor(sx, sz));
    for (let i = 0; i < 3; i++) {
      parts.push(P(lathe('spray', [[0, 0], [0.032, 0], [0.036, 0.1], [0.014, 0.13], [0.014, 0.2], [0, 0.2]], 10), i === 1 ? 'plastic.white' : 'plastic.smooth', [-0.35 + i * 0.16, 0.885, (rng() - 0.5) * 0.2]));
    }
    return { parts, colliders: [cbox(1.1, 1.0, 0.55, 'plastic', 'cart')] };
  },
});

def('prop.mopBucket', 'Mop bucket & wringer', [0.42, 0.9, 0.42], ['maintenance'], 'maintenance', {
  mats: ['plastic.smooth', 'plastic.grey', 'metal.painted', 'fabric.cubicle', 'wood.pale'],
  use: 'janitor, southcorr',
  coll: 'single AABB 0.42 × 0.35 × 0.42 (bucket only; mop pole non-blocking)',
  acc: 'Wheeled mop bucket with wringer basket and a mop standing in it, head down, handle leaning 15°.',
  build() {
    const parts = [
      P(lathe('bucket', [[0, 0.05], [0.17, 0.05], [0.19, 0.32], [0.17, 0.32], [0.15, 0.07], [0, 0.07]], 14), 'plastic.smooth', [0, 0, 0]),
      P(BB(0.2, 0.14, 0.16, 0.012), 'plastic.grey', [0, 0.38, 0.06]),
      P(CYL(0.012, 0.012, 0.18, 6), 'plastic.grey', [0, 0.5, 0.12], [0.5, 0, 0]),
      ...castor(-0.14, -0.14), ...castor(0.14, -0.14), ...castor(-0.14, 0.14), ...castor(0.14, 0.14),
      // Mop
      P(CYL(0.014, 0.014, 1.3, 8), 'wood.pale', [-0.05, 0.85, -0.05], [0.26, 0, 0.13]),
      P(CYL(0.05, 0.07, 0.18, 8), 'fabric.cubicle', [-0.14, 0.22, -0.16], [0.26, 0, 0.13]),
    ];
    return { parts, colliders: [cbox(0.42, 0.35, 0.42, 'plastic', 'bucket')] };
  },
});

def('prop.mopLean', 'Leaning mop', [0.16, 1.45, 0.3], ['maintenance'], 'clutter', {
  mats: ['wood.pale', 'fabric.cubicle', 'metal.painted'],
  use: 'janitor',
  coll: 'none — thin lean-to prop',
  acc: 'Mop leaning against a wall at 12°, head on the floor. Pivot at head against wall.',
  build() {
    return {
      parts: [
        P(CYL(0.013, 0.013, 1.4, 8), 'wood.pale', [0, 0.7, -0.14], [-0.2, 0, 0]),
        P(CYL(0.055, 0.075, 0.16, 8), 'fabric.cubicle', [0, 0.07, -0.02], [-0.2, 0, 0]),
        P(CYL(0.016, 0.016, 0.04, 8), 'metal.painted', [0, 0.16, -0.045], [-0.2, 0, 0]),
      ],
      colliders: [],
    };
  },
});

def('prop.broomLean', 'Leaning broom', [0.28, 1.4, 0.3], ['maintenance'], 'clutter', {
  mats: ['wood.pale', 'plastic.dark'],
  use: 'janitor, loading, westyard',
  coll: 'none — thin lean-to prop',
  acc: 'Push broom leaning against a wall: handle, angled head block with bristle band. Pivot at head against wall.',
  build() {
    return {
      parts: [
        P(CYL(0.012, 0.012, 1.35, 8), 'wood.pale', [0, 0.68, -0.13], [-0.19, 0, 0.04]),
        P(BB(0.26, 0.05, 0.06, 0.008), 'plastic.dark', [0, 0.05, -0.02]),
        P(BB(0.24, 0.04, 0.045, 0.006), 'fabric.cubicle', [0, 0.02, -0.02]),
      ],
      colliders: [],
    };
  },
});

def('prop.cleaningBottles', 'Cleaning bottle cluster', [0.3, 0.28, 0.2], ['maintenance'], 'clutter', {
  mats: ['plastic.white', 'plastic.smooth', 'plastic.grey'],
  use: 'janitor shelves, under sinks',
  coll: 'none — small clutter',
  acc: 'Three mixed bottles: spray bottle with trigger, jug with handle recess, squeeze bottle; rng varies arrangement.',
  build(o = {}) {
    const rng = o.rng ?? rngFor('bottles');
    const parts = [
      P(lathe('spray', [[0, 0], [0.032, 0], [0.036, 0.1], [0.014, 0.13], [0.014, 0.2], [0, 0.2]], 10), 'plastic.smooth', [-0.09, 0, (rng() - 0.5) * 0.06]),
      P(BB(0.02, 0.05, 0.03, 0.005), 'plastic.grey', [-0.09, 0.21, -0.02]),
      P(BB(0.11, 0.24, 0.09, 0.02), 'plastic.white', [0.04, 0.12, 0], [0, rng() * 0.6, 0]),
      P(CYL(0.02, 0.02, 0.03, 8), 'plastic.grey', [0.04, 0.255, 0]),
      P(lathe('squeeze', [[0, 0], [0.03, 0], [0.035, 0.12], [0.012, 0.16], [0.012, 0.19], [0, 0.19]], 10), 'plastic.grey', [0.14, 0, 0.05]),
    ];
    return { parts, colliders: [] };
  },
});

def('prop.shelvingUtility', 'Utility shelving', [1.2, 1.8, 0.5], ['maintenance', 'storage', 'cover'], 'maintenance', {
  mats: ['metal.galvanised', 'metal.paintedDark', 'cardboard.box', 'plastic.white', 'plastic.grey'],
  use: 'janitor, mechanical, loading, southcorr',
  coll: 'single AABB 1.2 × 1.8 × 0.5',
  acc: 'Boltless steel shelving with four shelves, dressed with boxes, bottles and paper stock by rng; density scales with opts.fill 0–1.',
  build(o = {}) {
    const rng = o.rng ?? rngFor('utilityShelf');
    const fill = o.fill ?? 0.8;
    const parts = [];
    for (const sx of [-0.58, 0.58]) for (const sz of [-0.23, 0.23]) parts.push(P(BB(0.045, 1.8, 0.045, 0.005), 'metal.paintedDark', [sx, 0.9, sz]));
    for (let s = 0; s < 4; s++) {
      const y = 0.14 + s * 0.52;
      parts.push(P(BB(1.16, 0.035, 0.48, 0.006), 'metal.galvanised', [0, y, 0]));
      let x = -0.5;
      while (x < 0.45) {
        if (rng() < fill * 0.8) {
          const kind = rng();
          if (kind < 0.5) {
            const bw = 0.22 + rng() * 0.16;
            parts.push(P(BB(bw, 0.2 + rng() * 0.12, 0.34, 0.006), 'cardboard.box', [x + bw / 2, y + 0.12, (rng() - 0.5) * 0.06], [0, (rng() - 0.5) * 0.15, 0]));
            x += bw + 0.05;
          } else if (kind < 0.75) {
            parts.push(P(BB(0.11, 0.24, 0.09, 0.02), 'plastic.white', [x + 0.07, y + 0.14, 0]));
            x += 0.17;
          } else {
            parts.push(P(BB(0.24, 0.12, 0.3, 0.004), 'paper.white', [x + 0.13, y + 0.08, 0]));
            x += 0.3;
          }
        } else x += 0.2;
      }
    }
    return { parts, colliders: [cbox(1.2, 1.8, 0.5, 'metal', 'shelving')] };
  },
  lod1() {
    return {
      parts: [P(BOX(1.2, 1.8, 0.5), 'metal.galvanised', [0, 0.9, 0])],
      colliders: [cbox(1.2, 1.8, 0.5, 'metal', 'shelving')],
    };
  },
});

def('prop.boxCardboard', 'Cardboard box', [0.5, 0.35, 0.4], ['maintenance', 'storage'], 'maintenance', {
  mats: ['cardboard.box', 'paper.white'],
  use: 'loading, archive, copy, everywhere goods live',
  coll: 'single AABB matching box (only ≥0.3 m sizes)',
  acc: 'Corrugated box with taped seam and a shipping label from signage.js. Variants: S (0.3) | M (0.5) | L (0.65) | open (flaps up).',
  variants: ['S', 'M', 'L', 'open'],
  build(o = {}) {
    const v = o.variant ?? 'M';
    const s = v === 'S' ? 0.3 : v === 'L' ? 0.65 : 0.5;
    const h = s * 0.7;
    const parts = [P(BB(s, h, s * 0.8, 0.008), 'cardboard.box', [0, h / 2, 0])];
    if (v === 'open') {
      parts.push(P(BB(s * 0.46, 0.012, s * 0.8, 0.004), 'cardboard.box', [-s * 0.4, h + 0.1, 0], [0, 0, 1.2]));
      parts.push(P(BB(s * 0.46, 0.012, s * 0.8, 0.004), 'cardboard.box', [s * 0.4, h + 0.1, 0], [0, 0, -1.2]));
    } else {
      parts.push(P(BB(0.05, 0.004, s * 0.82, 0.001), 'paper.white', [0, h + 0.001, 0]));
    }
    const colliders = s >= 0.3 ? [cbox(s, h, s * 0.8, 'wood', 'box')] : [];
    return { parts, colliders };
  },
});

def('prop.crateShipping', 'Shipping crate', [1.2, 0.9, 0.8], ['maintenance', 'cover'], 'maintenance', {
  mats: ['wood.pale', 'wood.dark', 'metal.galvanised'],
  use: 'loading, garage, westyard',
  coll: 'single AABB 1.2 × 0.9 × 0.8 (waist-high cover)',
  acc: 'Timber crate: plank faces with visible batten frame, galvanised corner straps, stencilled label from signage.js.',
  build() {
    const parts = [P(BB(1.16, 0.86, 0.76, 0.01), 'wood.pale', [0, 0.45, 0])];
    // Battens
    for (const y of [0.08, 0.45, 0.82]) {
      parts.push(P(BB(1.2, 0.07, 0.8, 0.006), 'wood.dark', [0, y, 0]));
    }
    for (const sx of [-0.57, 0.57]) parts.push(P(BB(0.07, 0.9, 0.8, 0.006), 'wood.dark', [sx, 0.45, 0]));
    for (const sx of [-0.58, 0.58]) for (const sz of [-0.39, 0.39]) parts.push(P(BB(0.04, 0.9, 0.04, 0.004), 'metal.galvanised', [sx, 0.45, sz]));
    return { parts, colliders: [cbox(1.2, 0.9, 0.8, 'wood', 'crate')] };
  },
  lod1() {
    return { parts: [P(BOX(1.2, 0.9, 0.8), 'wood.pale', [0, 0.45, 0])], colliders: [cbox(1.2, 0.9, 0.8, 'wood', 'crate')] };
  },
});

def('prop.pallet', 'Wooden pallet', [1.2, 0.14, 1.0], ['maintenance'], 'maintenance', {
  mats: ['wood.pale'],
  use: 'loading, southcorr, westyard',
  coll: 'single AABB 1.2 × 0.14 × 1.0 (step-over height)',
  acc: 'Euro pallet: seven deck boards, three bearers, three bottom boards; gaps read from 3 m.',
  build() {
    const parts = [];
    for (let i = 0; i < 7; i++) parts.push(P(BB(1.2, 0.022, 0.1, 0.003), 'wood.pale', [0, 0.128, -0.42 + i * 0.14]));
    for (const x of [-0.55, 0, 0.55]) parts.push(P(BB(0.1, 0.09, 1.0, 0.005), 'wood.pale', [x, 0.072, 0]));
    for (const z of [-0.45, 0, 0.45]) parts.push(P(BB(1.2, 0.022, 0.1, 0.003), 'wood.pale', [0, 0.012, z]));
    return { parts, colliders: [cbox(1.2, 0.14, 1.0, 'wood', 'pallet')] };
  },
});

def('prop.palletLoad', 'Loaded pallet', [1.2, 1.15, 1.0], ['maintenance', 'cover'], 'maintenance', {
  mats: ['wood.pale', 'cardboard.box', 'glass.frosted'],
  use: 'loading, garage',
  coll: 'single AABB 1.2 × 1.15 × 1.0 (chest-high cover)',
  acc: 'Pallet stacked two courses high with boxes and a shrink-wrap band; box sizes jittered by rng.',
  build(o = {}) {
    const rng = o.rng ?? rngFor('palletLoad');
    const base = PROPS['prop.pallet'].build(o);
    const parts = [...base.parts];
    for (let course = 0; course < 2; course++) {
      const y = 0.14 + course * 0.42;
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          if (course === 1 && rng() < 0.2) continue;
          parts.push(P(BB(0.5, 0.4, 0.42, 0.008), 'cardboard.box', [-0.28 + i * 0.56, y + 0.2, -0.24 + j * 0.48], [0, (rng() - 0.5) * 0.06, 0]));
        }
      }
    }
    parts.push(P(BOX(1.14, 0.72, 0.94), 'glass.frosted', [0, 0.52, 0]));
    return { parts, colliders: [cbox(1.2, 1.15, 1.0, 'wood', 'palletLoad')] };
  },
  lod1() {
    return { parts: [P(BOX(1.2, 1.1, 1.0), 'cardboard.box', [0, 0.55, 0])], colliders: [cbox(1.2, 1.15, 1.0, 'wood', 'palletLoad')] };
  },
});

def('prop.handTruck', 'Hand truck', [0.5, 1.2, 0.55], ['maintenance'], 'maintenance', {
  mats: ['metal.painted', 'rubber.black', 'plastic.dark'],
  use: 'loading, southcorr, eastcorr',
  coll: 'single AABB 0.5 × 1.2 × 0.5',
  acc: 'Two-wheel sack truck leaning 15° against its wheels: frame rails, cross bars, toe plate, rubber wheels with hubs.',
  build() {
    const lean = -0.26;
    const parts = [
      ...[-0.18, 0.18].map((x) => P(CYL(0.014, 0.014, 1.15, 8), 'metal.painted', [x, 0.58, 0.08], [lean, 0, 0])),
      ...[0.35, 0.7, 1.05].map((y) => P(CYL(0.012, 0.012, 0.36, 6), 'metal.painted', [0, y, 0.08 + Math.tan(-lean) * (y - 0.58) * -1], [lean, 0, Math.PI / 2])),
      P(TOR(0.09, 0.014, 5, 12, Math.PI), 'metal.painted', [0, 1.16, -0.08], [lean - 0.3, 0, 0]),
      P(BB(0.44, 0.012, 0.3, 0.004), 'metal.painted', [0, 0.03, -0.13]),
      ...[-0.22, 0.22].map((x) => P(CYL(0.11, 0.11, 0.05, 14), 'rubber.black', [x, 0.11, 0.14], [0, 0, Math.PI / 2])),
      ...[-0.25, 0.25].map((x) => P(CYL(0.035, 0.035, 0.02, 10), 'plastic.dark', [x, 0.11, 0.14], [0, 0, Math.PI / 2])),
    ];
    return { parts, colliders: [cbox(0.5, 1.2, 0.5, 'metal', 'handtruck')] };
  },
});

def('prop.ladderStep', 'Step ladder', [0.55, 1.5, 0.9], ['maintenance'], 'maintenance', {
  mats: ['metal.aluminium', 'plastic.dark'],
  use: 'mechanical, archive, loading, janitor',
  coll: 'single AABB 0.55 × 1.5 × 0.9',
  acc: 'A-frame aluminium ladder, open: two rails per side, four treads, top cap, spreader bars. Variant: folded (leans on wall).',
  variants: ['open', 'folded'],
  build(o = {}) {
    if (o.variant === 'folded') {
      const parts = [
        ...[-0.22, 0.22].map((x) => P(BB(0.05, 1.9, 0.03, 0.005), 'metal.aluminium', [x, 0.93, -0.1], [-0.2, 0, 0])),
        ...[0.3, 0.7, 1.1, 1.5].map((y) => P(BB(0.4, 0.03, 0.06, 0.004), 'metal.aluminium', [0, y, -0.1 - Math.tan(0.2) * (y - 0.93)], [-0.2, 0, 0])),
      ];
      return { parts, colliders: [cbox(0.55, 1.9, 0.3, 'metal', 'ladder', 0, -0.15)] };
    }
    const tilt = 0.32;
    const parts = [P(BB(0.5, 0.04, 0.14, 0.006), 'plastic.dark', [0, 1.46, 0])];
    for (const [sz, dir] of [[-0.42, tilt], [0.42, -tilt]]) {
      for (const sx of [-0.24, 0.24]) parts.push(P(BB(0.05, 1.52, 0.03, 0.005), 'metal.aluminium', [sx, 0.73, sz / 2 + Math.sign(sz) * 0.12], [dir, 0, 0]));
    }
    for (let i = 0; i < 4; i++) {
      const y = 0.3 + i * 0.36;
      const z = -0.42 + (y / 1.5) * 0.36;
      parts.push(P(BB(0.44, 0.025, 0.09, 0.004), 'metal.aluminium', [0, y, z + 0.14]));
    }
    parts.push(P(BB(0.02, 0.015, 0.7, 0.003), 'metal.aluminium', [-0.2, 0.8, 0]));
    parts.push(P(BB(0.02, 0.015, 0.7, 0.003), 'metal.aluminium', [0.2, 0.8, 0]));
    return { parts, colliders: [cbox(0.55, 1.5, 0.9, 'metal', 'ladder')] };
  },
});

def('prop.toolCase', 'Tool case', [0.5, 0.24, 0.25], ['maintenance'], 'clutter', {
  mats: ['plastic.dark', 'metal.brushed', 'plastic.smooth'],
  use: 'mechanical, it, loading',
  coll: 'none — small clutter',
  acc: 'Site tool case: ribbed lid, twin latches, handle. Variant: open (lid up, tray with tool bars visible).',
  variants: ['closed', 'open'],
  build(o = {}) {
    const open = o.variant === 'open';
    const parts = [
      P(BB(0.5, 0.14, 0.25, 0.012), 'plastic.dark', [0, 0.07, 0]),
      P(BB(0.5, 0.09, 0.25, 0.012), 'plastic.dark', open ? [0, 0.245, 0.16] : [0, 0.185, 0], open ? [-1.9, 0, 0] : undefined),
      P(BB(0.12, 0.03, 0.04, 0.006), 'plastic.smooth', [0, open ? 0.145 : 0.235, -0.125]),
    ];
    if (!open) {
      parts.push(P(BB(0.05, 0.05, 0.015, 0.003), 'metal.brushed', [-0.15, 0.12, -0.128]));
      parts.push(P(BB(0.05, 0.05, 0.015, 0.003), 'metal.brushed', [0.15, 0.12, -0.128]));
    } else {
      parts.push(P(BB(0.42, 0.02, 0.18, 0.004), 'plastic.grey', [0, 0.145, -0.01]));
      parts.push(P(CYL(0.01, 0.01, 0.24, 6), 'metal.brushed', [-0.1, 0.16, 0], [0, 0, Math.PI / 2]));
      parts.push(P(CYL(0.008, 0.008, 0.2, 6), 'metal.brushed', [0.08, 0.16, 0.03], [0, 0.2, Math.PI / 2]));
    }
    return { parts, colliders: [] };
  },
});

def('prop.coneWarning', 'Warning cone', [0.3, 0.52, 0.3], ['maintenance', 'safety'], 'maintenance', {
  mats: ['metal.paintedRed', 'plastic.white'],
  use: 'corridors, loading, garage, court',
  coll: 'none — knock-over scale clutter',
  acc: 'Traffic cone: square base, tapered body in safety red with a reflective white band.',
  build() {
    return {
      parts: [
        P(BB(0.3, 0.03, 0.3, 0.008), 'metal.paintedRed', [0, 0.015, 0]),
        P(CYL(0.022, 0.12, 0.48, 12), 'metal.paintedRed', [0, 0.27, 0]),
        P(CYL(0.065, 0.085, 0.1, 12), 'plastic.white', [0, 0.24, 0]),
      ],
      colliders: [],
    };
  },
});

def('prop.wetFloorSign', 'Wet floor A-sign', [0.3, 0.6, 0.5], ['maintenance', 'safety'], 'maintenance', {
  mats: ['plastic.smooth', 'plastic.white'],
  use: 'northcorr, restroom approach, janitor',
  coll: 'none — knock-over scale clutter',
  acc: 'A-frame caution sign; face text painted by signage.js. Two hinged boards with a spine gap.',
  build() {
    return {
      parts: [
        P(BB(0.3, 0.55, 0.02, 0.006), 'plastic.smooth', [0, 0.27, -0.11], [0.38, 0, 0]),
        P(BB(0.3, 0.55, 0.02, 0.006), 'plastic.smooth', [0, 0.27, 0.11], [-0.38, 0, 0]),
        P(CYL(0.01, 0.01, 0.26, 6), 'plastic.white', [0, 0.52, 0], [0, 0, Math.PI / 2]),
      ],
      colliders: [],
    };
  },
});

def('prop.matFloor', 'Walk-off floor mat', [1.5, 0.02, 0.9], ['maintenance', 'floor'], 'maintenance', {
  mats: ['rubber.black', 'fabric.cubicle'],
  use: 'vestibule, entrances, loading personnel door',
  coll: 'none — flat, walkable',
  acc: 'Entrance mat: rubber border with a coarse fibre centre; lies dead flat, no collider, no z-fight (raised 8 mm).',
  build(o = {}) {
    const w = o.width ?? 1.5;
    const d = o.depth ?? 0.9;
    return {
      parts: [
        P(BB(w, 0.014, d, 0.004), 'rubber.black', [0, 0.007, 0]),
        P(BB(w - 0.12, 0.008, d - 0.12, 0.002), 'fabric.cubicle', [0, 0.016, 0]),
      ],
      colliders: [],
    };
  },
});

def('prop.barrier', 'Loading barrier', [1.4, 1.0, 0.45], ['maintenance', 'safety'], 'maintenance', {
  mats: ['metal.painted', 'plastic.smooth'],
  use: 'loading, garage, eastyard',
  coll: 'single AABB 1.4 × 1.0 × 0.45',
  acc: 'A-frame barrier: two leg trestles and a plank with hazard striping from signage.js.',
  build() {
    const parts = [];
    for (const sx of [-0.6, 0.6]) {
      parts.push(P(BB(0.05, 1.0, 0.04, 0.006), 'metal.painted', [sx, 0.5, -0.14], [0.28, 0, 0]));
      parts.push(P(BB(0.05, 1.0, 0.04, 0.006), 'metal.painted', [sx, 0.5, 0.14], [-0.28, 0, 0]));
      parts.push(P(BB(0.05, 0.04, 0.5, 0.006), 'metal.painted', [sx, 0.02, 0]));
    }
    parts.push(P(BB(1.4, 0.2, 0.03, 0.006), 'plastic.smooth', [0, 0.82, 0]));
    return { parts, colliders: [cbox(1.4, 1.0, 0.45, 'metal', 'barrier')] };
  },
});

def('prop.garagePanel', 'Shutter control panel', [0.24, 0.3, 0.12], ['maintenance', 'wall'], 'maintenance', {
  mats: ['metal.painted', 'plastic.smooth', 'plastic.dark', 'emissive.ledGreen', 'emissive.ledRed'],
  use: 'garage, loading (beside shutters)',
  coll: 'none — wall mounted',
  acc: 'Roller-door control station: box with UP/STOP/DOWN buttons, status LEDs, conduit drop. Pivot at box centre against wall.',
  build() {
    return {
      parts: [
        P(BB(0.24, 0.3, 0.1, 0.008), 'metal.painted', [0, 0, -0.05]),
        P(CYL(0.02, 0.02, 0.008, 10), 'emissive.ledGreen', [-0.05, 0.08, -0.104], [Math.PI / 2, 0, 0]),
        P(CYL(0.02, 0.02, 0.008, 10), 'emissive.ledRed', [0.05, 0.08, -0.104], [Math.PI / 2, 0, 0]),
        P(CYL(0.022, 0.022, 0.012, 10), 'plastic.smooth', [-0.05, -0.02, -0.104], [Math.PI / 2, 0, 0]),
        P(CYL(0.022, 0.022, 0.012, 10), 'plastic.dark', [0.05, -0.02, -0.104], [Math.PI / 2, 0, 0]),
        P(CYL(0.022, 0.022, 0.012, 10), 'plastic.smooth', [0, -0.09, -0.104], [Math.PI / 2, 0, 0]),
        P(CYL(0.014, 0.014, 0.3, 8), 'metal.galvanised', [0, 0.28, -0.05]),
      ],
      colliders: [],
    };
  },
});

def('prop.drum', 'Steel drum', [0.6, 0.9, 0.6], ['maintenance', 'cover'], 'maintenance', {
  mats: ['metal.painted', 'metal.paintedDark'],
  use: 'garage, westyard',
  coll: 'single AABB 0.6 × 0.9 × 0.6 (waist-high cover)',
  acc: '200 L drum with two rolling ribs and a bung cap; variant: dark.',
  variants: ['grey', 'dark'],
  build(o = {}) {
    const m = o.variant === 'dark' ? 'metal.paintedDark' : 'metal.painted';
    return {
      parts: [
        P(CYL(0.29, 0.29, 0.88, 18), m, [0, 0.44, 0]),
        P(TOR(0.295, 0.012, 5, 18), m, [0, 0.3, 0], [Math.PI / 2, 0, 0]),
        P(TOR(0.295, 0.012, 5, 18), m, [0, 0.58, 0], [Math.PI / 2, 0, 0]),
        P(CYL(0.03, 0.03, 0.02, 8), 'metal.paintedDark', [0.15, 0.89, 0]),
      ],
      colliders: [cbox(0.6, 0.9, 0.6, 'metal', 'drum')],
    };
  },
});

/* ================================================================== */
/* DESK CLUTTER & SMALL PROPS                                          */
/* ================================================================== */

def('prop.paperSheet', 'Loose paper sheet', [0.21, 0.002, 0.3], ['clutter', 'desk'], 'clutter', {
  mats: ['paper.white'],
  use: 'desks, copy, floors near printers',
  coll: 'none — small clutter',
  acc: 'Single A4 sheet with rng yaw and a faint curl; sits 1 mm above the surface.',
  build(o = {}) {
    const rng = o.rng ?? rngFor('sheet');
    return { parts: [P(BB(0.21, 0.0016, 0.297, 0.0005), 'paper.white', [0, 0.002, 0], [0, rng() * Math.PI * 2, (rng() - 0.5) * 0.02])], colliders: [] };
  },
});

def('prop.paperStack', 'Paper stack', [0.24, 0.12, 0.32], ['clutter', 'desk'], 'clutter', {
  mats: ['paper.white', 'paper.cream'],
  use: 'desks, copy, archive',
  coll: 'none — small clutter',
  acc: 'Stack of 3–5 reams/piles with alternating jitter; height varies with rng.',
  build(o = {}) {
    const rng = o.rng ?? rngFor('stack');
    const parts = [];
    let y = 0;
    const n = 3 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
      const h = 0.012 + rng() * 0.028;
      parts.push(P(BB(0.215, h, 0.3, 0.002), rng() < 0.7 ? 'paper.white' : 'paper.cream', [(rng() - 0.5) * 0.02, y + h / 2, (rng() - 0.5) * 0.02], [0, (rng() - 0.5) * 0.3, 0]));
      y += h;
    }
    return { parts, colliders: [] };
  },
});

def('prop.folder', 'Manila folder', [0.24, 0.015, 0.32], ['clutter', 'desk'], 'clutter', {
  mats: ['paper.cream', 'paper.white'],
  use: 'desks, archive, conference table',
  coll: 'none — small clutter',
  acc: 'Folder with sheets poking out at an angle; variant: open (cover flipped, page visible).',
  variants: ['closed', 'open'],
  build(o = {}) {
    const rng = o.rng ?? rngFor('folder');
    const yaw = (rng() - 0.5) * 0.7;
    const parts = [
      P(BB(0.24, 0.006, 0.32, 0.001), 'paper.cream', [0, 0.004, 0], [0, yaw, 0]),
      P(BB(0.21, 0.004, 0.29, 0.001), 'paper.white', [0.01, 0.009, 0.005], [0, yaw + 0.06, 0]),
    ];
    if (o.variant === 'open') parts.push(P(BB(0.24, 0.004, 0.32, 0.001), 'paper.cream', [Math.cos(yaw) * -0.245, 0.003, Math.sin(yaw) * 0.245], [0, yaw, 0]));
    else parts.push(P(BB(0.24, 0.005, 0.32, 0.001), 'paper.cream', [0, 0.013, 0], [0, yaw, 0.015]));
    return { parts, colliders: [] };
  },
});

def('prop.binderRow', 'Binder row', [0.5, 0.32, 0.29], ['clutter', 'storage'], 'clutter', {
  mats: ['plastic.dark', 'plastic.smooth', 'plastic.grey', 'paper.white'],
  use: 'shelves, desks, archive',
  coll: 'none — sits on furniture',
  acc: '3–6 lever-arch binders with spine label strips; count set by opts.count or rng, one may lean.',
  build(o = {}) {
    const rng = o.rng ?? rngFor('binders');
    const n = o.count ?? 3 + Math.floor(rng() * 4);
    const mats = ['plastic.dark', 'plastic.smooth', 'plastic.grey'];
    const parts = [];
    let x = -(n * 0.075) / 2;
    for (let i = 0; i < n; i++) {
      const lean = i === n - 1 && rng() < 0.4 ? 0.22 : 0;
      parts.push(P(BB(0.065, 0.315, 0.285, 0.006), mats[Math.floor(rng() * 3)], [x + 0.036 + lean * 0.1, 0.158, 0], [0, 0, lean]));
      parts.push(P(BB(0.04, 0.12, 0.004, 0.001), 'paper.white', [x + 0.036 + lean * 0.14, 0.19, -0.145], [0, 0, lean]));
      x += 0.075;
    }
    return { parts, colliders: [] };
  },
});

def('prop.notebook', 'Notebook', [0.15, 0.02, 0.21], ['clutter', 'desk'], 'clutter', {
  mats: ['plastic.smooth', 'paper.white'],
  use: 'desks, conference',
  coll: 'none — small clutter',
  acc: 'A5 notebook with cover overhang and page block; variant: open with page split.',
  variants: ['closed', 'open'],
  build(o = {}) {
    const rng = o.rng ?? rngFor('nb');
    const yaw = (rng() - 0.5) * 0.9;
    if (o.variant === 'open') {
      return {
        parts: [
          P(BB(0.15, 0.006, 0.21, 0.001), 'paper.white', [-0.076, 0.004, 0], [0, yaw, 0.03]),
          P(BB(0.15, 0.006, 0.21, 0.001), 'paper.white', [0.076, 0.004, 0], [0, yaw, -0.03]),
        ],
        colliders: [],
      };
    }
    return {
      parts: [
        P(BB(0.15, 0.014, 0.21, 0.003), 'paper.white', [0, 0.008, 0], [0, yaw, 0]),
        P(BB(0.152, 0.004, 0.212, 0.001), 'plastic.smooth', [0, 0.017, 0], [0, yaw, 0]),
      ],
      colliders: [],
    };
  },
});

def('prop.pen', 'Pen', [0.14, 0.01, 0.02], ['clutter', 'desk'], 'clutter', {
  mats: ['plastic.smooth', 'metal.brushed'],
  use: 'every desk',
  coll: 'none — small clutter',
  acc: 'Ballpoint with clip nub; random yaw. Variant: pencil (pale wood shaft).',
  variants: ['pen', 'pencil'],
  build(o = {}) {
    const rng = o.rng ?? rngFor('pen');
    const yaw = rng() * Math.PI * 2;
    if (o.variant === 'pencil') {
      return { parts: [P(CYL(0.004, 0.004, 0.15, 6), 'wood.pale', [0, 0.005, 0], [Math.PI / 2, yaw, 0])], colliders: [] };
    }
    return {
      parts: [
        P(CYL(0.0045, 0.0035, 0.13, 6), 'plastic.smooth', [0, 0.005, 0], [Math.PI / 2, yaw, 0]),
        P(BB(0.004, 0.003, 0.03, 0.001), 'metal.brushed', [Math.sin(yaw) * 0.03, 0.009, Math.cos(yaw) * 0.03], [0, yaw, 0]),
      ],
      colliders: [],
    };
  },
});

def('prop.stapler', 'Stapler', [0.06, 0.06, 0.16], ['clutter', 'desk'], 'clutter', {
  mats: ['plastic.smooth', 'metal.brushed'],
  use: 'desks, copy',
  coll: 'none — small clutter',
  acc: 'Stapler: base, anvil strip, arched top arm with hinge rise at the back.',
  build(o = {}) {
    const rng = o.rng ?? rngFor('stapler');
    const yaw = rng() * Math.PI * 2;
    const parts = [
      P(BB(0.045, 0.02, 0.155, 0.005), 'plastic.smooth', [0, 0.01, 0], [0, yaw, 0]),
      P(BB(0.02, 0.012, 0.14, 0.003), 'metal.brushed', [0, 0.026, 0], [0, yaw, 0]),
      P(BB(0.042, 0.022, 0.15, 0.007), 'plastic.smooth', [Math.sin(yaw) * 0.004, 0.045, Math.cos(yaw) * 0.004], [-0.06, yaw, 0]),
    ];
    return { parts, colliders: [] };
  },
});

def('prop.tapeDispenser', 'Tape dispenser', [0.05, 0.07, 0.14], ['clutter', 'desk'], 'clutter', {
  mats: ['plastic.dark', 'plastic.white'],
  use: 'desks, copy',
  coll: 'none — small clutter',
  acc: 'Weighted tape dispenser with a visible tape ring and cutter tongue.',
  build(o = {}) {
    const rng = o.rng ?? rngFor('tape');
    const yaw = rng() * Math.PI * 2;
    return {
      parts: [
        P(BB(0.04, 0.05, 0.13, 0.01), 'plastic.dark', [0, 0.026, 0], [0, yaw, 0]),
        P(TOR(0.03, 0.011, 6, 12), 'plastic.white', [0, 0.05, 0], [0, yaw, Math.PI / 2]),
        P(BB(0.036, 0.01, 0.02, 0.002), 'plastic.dark', [Math.sin(yaw + Math.PI / 2) * 0.0, 0.055, Math.cos(yaw) * 0.06], [0, yaw, 0]),
      ],
      colliders: [],
    };
  },
});

def('prop.scissors', 'Scissors', [0.08, 0.008, 0.2], ['clutter', 'desk'], 'clutter', {
  mats: ['metal.brushed', 'plastic.smooth'],
  use: 'copy, desks',
  coll: 'none — small clutter',
  acc: 'Scissors lying flat, blades slightly open, moulded handles.',
  build(o = {}) {
    const rng = o.rng ?? rngFor('scissors');
    const yaw = rng() * Math.PI * 2;
    const parts = [];
    for (const s of [-1, 1]) {
      const M = new THREE.Matrix4().compose(
        new THREE.Vector3(0, 0.004, 0),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw + s * 0.09, 0)),
        new THREE.Vector3(1, 1, 1),
      );
      const blade = P(BB(0.012, 0.004, 0.11, 0.001), 'metal.brushed', [s * 0.004, 0, -0.055]);
      const handle = P(TOR(0.016, 0.005, 5, 10), 'plastic.smooth', [s * 0.012, 0, 0.065], [Math.PI / 2, 0, 0]);
      parts.push({ ...blade, matrix: M.clone().multiply(blade.matrix) });
      parts.push({ ...handle, matrix: M.clone().multiply(handle.matrix) });
    }
    return { parts, colliders: [] };
  },
});

def('prop.stickyNotes', 'Sticky note pads', [0.08, 0.02, 0.08], ['clutter', 'desk'], 'clutter', {
  mats: ['paper.cream', 'paper.white'],
  use: 'desks, monitors',
  coll: 'none — small clutter',
  acc: 'Two offset note pads; individual stuck notes are provided by the decal module for verticals.',
  build(o = {}) {
    const rng = o.rng ?? rngFor('sticky');
    return {
      parts: [
        P(BB(0.076, 0.012, 0.076, 0.002), 'paper.cream', [0, 0.007, 0], [0, rng(), 0]),
        P(BB(0.076, 0.008, 0.076, 0.002), 'paper.white', [0.03, 0.005, 0.04], [0, rng(), 0]),
      ],
      colliders: [],
    };
  },
});

def('prop.clipCup', 'Paper-clip cup', [0.07, 0.09, 0.07], ['clutter', 'desk'], 'clutter', {
  mats: ['plastic.dark', 'metal.brushed'],
  use: 'desks',
  coll: 'none — small clutter',
  acc: 'Pen cup with clip wires and two pens sticking out at angles.',
  build(o = {}) {
    const rng = o.rng ?? rngFor('clips');
    return {
      parts: [
        P(CYL(0.034, 0.03, 0.085, 12, true), 'plastic.dark', [0, 0.043, 0]),
        P(CYL(0.03, 0.03, 0.008, 12), 'plastic.dark', [0, 0.005, 0]),
        P(CYL(0.004, 0.004, 0.13, 6), 'plastic.smooth', [0.01, 0.09, 0], [0.25, rng(), 0.1]),
        P(CYL(0.004, 0.004, 0.12, 6), 'metal.brushed', [-0.012, 0.085, 0.008], [-0.2, rng(), -0.12]),
      ],
      colliders: [],
    };
  },
});

def('prop.idBadge', 'ID badge on lanyard', [0.09, 0.006, 0.16], ['clutter', 'desk', 'story'], 'clutter', {
  mats: ['plastic.white', 'fabric.chair', 'plastic.smooth'],
  use: 'desks, reception, floors (dropped in the evacuation)',
  coll: 'none — small clutter',
  acc: 'Staff badge with lanyard puddle beside it; a human trace — dropped where people fled.',
  build(o = {}) {
    const rng = o.rng ?? rngFor('badge');
    const yaw = rng() * Math.PI * 2;
    return {
      parts: [
        P(BB(0.056, 0.003, 0.086, 0.001), 'plastic.white', [0, 0.002, 0], [0, yaw, 0]),
        P(BB(0.02, 0.004, 0.026, 0.001), 'plastic.smooth', [Math.sin(yaw) * 0.01, 0.004, Math.cos(yaw) * 0.01], [0, yaw, 0]),
        P(TOR(0.028, 0.004, 4, 10, Math.PI * 1.5), 'fabric.chair', [Math.sin(yaw + 1) * 0.05, 0.004, Math.cos(yaw + 1) * 0.05], [Math.PI / 2, rng(), 0]),
      ],
      colliders: [],
    };
  },
});

def('prop.keycard', 'Key card', [0.054, 0.002, 0.086], ['clutter', 'story'], 'clutter', {
  mats: ['plastic.smooth'],
  use: 'security desk, server, exec',
  coll: 'none — small clutter',
  acc: 'Access card, face up; objective-adjacent storytelling piece.',
  build(o = {}) {
    const rng = o.rng ?? rngFor('keycard');
    return { parts: [P(BB(0.054, 0.0018, 0.086, 0.0005), 'plastic.smooth', [0, 0.002, 0], [0, rng() * Math.PI * 2, 0])], colliders: [] };
  },
});

def('prop.calendarDesk', 'Desk calendar', [0.16, 0.09, 0.1], ['clutter', 'desk'], 'clutter', {
  mats: ['paper.white', 'metal.brushed'],
  use: 'desks, reception',
  coll: 'none — small clutter',
  acc: 'Tent calendar: wire spine, two angled page faces.',
  build() {
    return {
      parts: [
        P(BB(0.155, 0.1, 0.006, 0.001), 'paper.white', [0, 0.048, -0.036], [0.42, 0, 0]),
        P(BB(0.155, 0.1, 0.006, 0.001), 'paper.white', [0, 0.048, 0.036], [-0.42, 0, 0]),
        P(CYL(0.005, 0.005, 0.15, 6), 'metal.brushed', [0, 0.092, 0], [0, 0, Math.PI / 2]),
      ],
      colliders: [],
    };
  },
});

def('prop.photoFrame', 'Desk photo frame', [0.13, 0.16, 0.06], ['clutter', 'desk', 'story'], 'clutter', {
  mats: ['wood.dark', 'glass.clear', 'paper.cream'],
  use: 'desks — humanises the workstations',
  coll: 'none — small clutter',
  acc: 'Photo frame leaning on its strut: frame, glass sheet, photo backing. Variant: fallen (face down — someone left in a hurry).',
  variants: ['standing', 'fallen'],
  build(o = {}) {
    if (o.variant === 'fallen') {
      return {
        parts: [
          P(BB(0.13, 0.012, 0.16, 0.003), 'wood.dark', [0, 0.007, 0], [0, 0.5, 0]),
        ],
        colliders: [],
      };
    }
    const tilt = -0.16;
    return {
      parts: [
        P(BB(0.13, 0.16, 0.01, 0.003), 'wood.dark', [0, 0.08, 0], [tilt, 0, 0]),
        P(BB(0.1, 0.13, 0.004, 0.001), 'paper.cream', [0, 0.08, -0.006], [tilt, 0, 0]),
        P(BB(0.04, 0.12, 0.006, 0.001), 'wood.dark', [0, 0.055, 0.045], [-0.5, 0, 0]),
      ],
      colliders: [],
    };
  },
});

def('prop.brochureStack', 'Company brochures', [0.22, 0.03, 0.3], ['clutter', 'lobby'], 'clutter', {
  mats: ['paper.white', 'plastic.smooth'],
  use: 'lobby, waiting, execante',
  coll: 'none — small clutter',
  acc: 'Fanned stack of tri-fold brochures; cover art applied via signage where visible on stands.',
  build(o = {}) {
    const rng = o.rng ?? rngFor('brochure');
    const parts = [];
    for (let i = 0; i < 4; i++) {
      parts.push(P(BB(0.1, 0.004, 0.21, 0.001), 'paper.white', [(rng() - 0.5) * 0.06, 0.003 + i * 0.005, (rng() - 0.5) * 0.05], [0, (rng() - 0.5) * 0.8, 0]));
    }
    return { parts, colliders: [] };
  },
});

def('prop.cupCoffeeTakeout', 'Takeaway coffee cup', [0.09, 0.13, 0.09], ['clutter'], 'clutter', {
  mats: ['paper.cream', 'plastic.dark', 'paper.white'],
  use: 'desks, conference, security desk',
  coll: 'none — small clutter',
  acc: 'Corrugated-sleeve coffee cup with sip lid. Variant: dropped (on its side, lid popped off nearby — pair with a spill decal).',
  variants: ['upright', 'dropped'],
  build(o = {}) {
    if (o.variant === 'dropped') {
      return {
        parts: [
          P(CYL(0.04, 0.03, 0.12, 12), 'paper.white', [0, 0.037, 0], [0, 0.3, Math.PI / 2 - 0.06]),
          P(CYL(0.041, 0.037, 0.05, 12), 'paper.cream', [0.004, 0.039, 0], [0, 0.3, Math.PI / 2 - 0.06]),
          P(CYL(0.042, 0.042, 0.012, 12), 'plastic.dark', [-0.14, 0.006, 0.06], [0.2, 0, 0]),
        ],
        colliders: [],
      };
    }
    return {
      parts: [
        P(CYL(0.04, 0.03, 0.12, 12), 'paper.white', [0, 0.06, 0]),
        P(CYL(0.041, 0.037, 0.05, 12), 'paper.cream', [0, 0.055, 0]),
        P(CYL(0.042, 0.042, 0.012, 12), 'plastic.dark', [0, 0.125, 0]),
      ],
      colliders: [],
    };
  },
});

def('prop.bottleWater', 'Water bottle', [0.07, 0.24, 0.07], ['clutter'], 'clutter', {
  mats: ['glass.frosted', 'plastic.smooth'],
  use: 'desks, conference table',
  coll: 'none — small clutter',
  acc: 'Half-litre bottle with shoulder taper and cap; variant: tipped.',
  variants: ['upright', 'tipped'],
  build(o = {}) {
    const tipped = o.variant === 'tipped';
    const rot = tipped ? [0, 0, Math.PI / 2 - 0.04] : undefined;
    const pos = tipped ? [0, 0.033, 0] : [0, 0, 0];
    return {
      parts: [
        P(lathe('bottle', [[0, 0], [0.032, 0], [0.033, 0.14], [0.016, 0.2], [0.014, 0.23], [0, 0.23]], 12), 'glass.frosted', pos, rot),
        P(CYL(0.015, 0.015, 0.018, 10), 'plastic.smooth', tipped ? [-0.24, 0.033, 0] : [0, 0.238, 0], rot),
      ],
      colliders: [],
    };
  },
});

def('prop.canDrink', 'Drink can', [0.066, 0.115, 0.066], ['clutter'], 'clutter', {
  mats: ['metal.aluminium', 'plastic.smooth'],
  use: 'breakroom, desks, vending surrounds',
  coll: 'none — small clutter',
  acc: '330 ml can with neck taper and a brand band; variant: crushed (squashed, on side).',
  variants: ['upright', 'crushed'],
  build(o = {}) {
    if (o.variant === 'crushed') {
      return {
        parts: [P(CYL(0.033, 0.033, 0.08, 12), 'metal.aluminium', [0, 0.025, 0], [0.3, 0.8, Math.PI / 2], [1, 1, 0.62])],
        colliders: [],
      };
    }
    return {
      parts: [
        P(CYL(0.033, 0.033, 0.1, 12), 'metal.aluminium', [0, 0.052, 0]),
        P(CYL(0.028, 0.033, 0.012, 12), 'metal.aluminium', [0, 0.108, 0]),
        P(CYL(0.0331, 0.0331, 0.045, 12, true), 'plastic.smooth', [0, 0.05, 0]),
      ],
      colliders: [],
    };
  },
});

def('prop.wrapperFood', 'Food wrapper', [0.14, 0.02, 0.1], ['clutter'], 'clutter', {
  mats: ['plastic.smooth', 'paper.cream'],
  use: 'breakroom tables, bins, desks',
  coll: 'none — small clutter',
  acc: 'Crumpled wrapper: two overlapping crushed shells with random yaw.',
  build(o = {}) {
    const rng = o.rng ?? rngFor('wrapper');
    return {
      parts: [
        P(SPH(1, 7, 5), 'plastic.smooth', [0, 0.012, 0], [rng(), rng() * 6, rng()], [0.055, 0.014, 0.04]),
        P(SPH(1, 7, 5), 'paper.cream', [0.03, 0.01, 0.02], [rng(), rng() * 6, rng()], [0.03, 0.01, 0.03]),
      ],
      colliders: [],
    };
  },
});

def('prop.deskOrganiser', 'Desk organiser', [0.25, 0.12, 0.15], ['clutter', 'desk'], 'clutter', {
  mats: ['plastic.dark', 'paper.white', 'plastic.smooth'],
  use: 'desks',
  coll: 'none — small clutter',
  acc: 'Multi-bay organiser: two upright letter slots with paper, pen tray with a pen.',
  build(o = {}) {
    const rng = o.rng ?? rngFor('organiser');
    return {
      parts: [
        P(BB(0.25, 0.02, 0.15, 0.005), 'plastic.dark', [0, 0.01, 0]),
        P(BB(0.006, 0.11, 0.14, 0.002), 'plastic.dark', [-0.11, 0.065, 0]),
        P(BB(0.006, 0.11, 0.14, 0.002), 'plastic.dark', [-0.03, 0.065, 0]),
        P(BB(0.006, 0.09, 0.14, 0.002), 'plastic.dark', [0.05, 0.055, 0]),
        P(BB(0.06, 0.09, 0.12, 0.002), 'paper.white', [-0.07, 0.06, 0], [0.06, 0, 0.08]),
        P(CYL(0.004, 0.004, 0.12, 6), 'plastic.smooth', [0.09, 0.03, 0], [0.3, rng(), 0.2]),
      ],
      colliders: [],
    };
  },
});

def('prop.plantDesk', 'Desk plant', [0.14, 0.24, 0.14], ['clutter', 'decor'], 'clutter', {
  mats: ['plastic.grey', 'fabric.cubicleTeal', 'concrete.dark'],
  use: 'desks, counters, window sills',
  coll: 'none — small clutter',
  acc: 'Small succulent: pot, soil, 5-leaf rosette of squashed spheres.',
  build(o = {}) {
    const rng = o.rng ?? rngFor('deskplant');
    const parts = [
      P(lathe('potS', [[0, 0], [0.05, 0], [0.06, 0.09], [0.05, 0.095], [0.045, 0.02], [0, 0.02]], 12), 'plastic.grey', [0, 0, 0]),
      P(CYL(0.045, 0.045, 0.012, 10), 'concrete.dark', [0, 0.085, 0]),
    ];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + rng();
      parts.push(P(SPH(1, 7, 5), 'fabric.cubicleTeal', [Math.sin(a) * 0.035, 0.13 + rng() * 0.04, Math.cos(a) * 0.035], [0.6, a, 0], [0.018, 0.05, 0.028]));
    }
    return { parts, colliders: [] };
  },
});

def('prop.backpack', 'Backpack', [0.34, 0.46, 0.22], ['clutter', 'story'], 'clutter', {
  mats: ['fabric.sofa', 'rubber.black', 'plastic.dark'],
  use: 'under desks, lockers, waiting — abandoned in the evacuation',
  coll: 'none — soft floor clutter',
  acc: 'Slumped backpack leaning on a surface: main body, front pocket, two straps splayed on the floor.',
  build(o = {}) {
    const rng = o.rng ?? rngFor('backpack');
    const yaw = (rng() - 0.5) * 0.6;
    return {
      parts: [
        P(BB(0.32, 0.42, 0.18, 0.05), 'fabric.sofa', [0, 0.21, 0], [-0.22, yaw, 0.04]),
        P(BB(0.24, 0.2, 0.07, 0.03), 'fabric.sofa', [0, 0.13, -0.12], [-0.22, yaw, 0]),
        P(BB(0.06, 0.015, 0.3, 0.006), 'rubber.black', [-0.12, 0.008, 0.12], [0, yaw + 0.5, 0]),
        P(BB(0.06, 0.015, 0.28, 0.006), 'rubber.black', [0.14, 0.008, 0.1], [0, yaw - 0.4, 0]),
        P(BB(0.05, 0.03, 0.02, 0.005), 'plastic.dark', [0, 0.36, -0.11], [-0.22, yaw, 0]),
      ],
      colliders: [],
    };
  },
});

def('prop.briefcase', 'Briefcase', [0.45, 0.34, 0.12], ['clutter', 'story'], 'clutter', {
  mats: ['leather.dark', 'metal.brushed'],
  use: 'exec, execante, boardroom',
  coll: 'none — small clutter',
  acc: 'Standing briefcase: leather shell, two latches, handle arc. Variant: flat (lying down).',
  variants: ['standing', 'flat'],
  build(o = {}) {
    const flat = o.variant === 'flat';
    const rot = flat ? [Math.PI / 2 - 0.02, 0.4, 0] : [0, 0, 0];
    const y = flat ? 0.062 : 0.17;
    return {
      parts: [
        P(BB(0.45, 0.34, 0.12, 0.02), 'leather.dark', [0, y, 0], rot),
        P(TOR(0.05, 0.011, 5, 12, Math.PI), 'leather.dark', flat ? [0.22, 0.062, -0.09] : [0, 0.36, 0], flat ? [0, 0, Math.PI / 2] : undefined),
        P(BB(0.03, 0.02, 0.01, 0.003), 'metal.brushed', flat ? [-0.1, 0.125, -0.02] : [-0.1, 0.3, -0.065], rot),
        P(BB(0.03, 0.02, 0.01, 0.003), 'metal.brushed', flat ? [0.1, 0.125, -0.02] : [0.1, 0.3, -0.065], rot),
      ],
      colliders: [],
    };
  },
});

def('prop.umbrella', 'Umbrella', [0.1, 0.85, 0.1], ['clutter'], 'clutter', {
  mats: ['fabric.chair', 'metal.blackAnodised', 'plastic.dark'],
  use: 'lobby stand, coat corners',
  coll: 'none — small clutter',
  acc: 'Furled umbrella leaning at 10°: canopy roll, shaft, crook handle. Variant: floor (lying flat).',
  variants: ['leaning', 'floor'],
  build(o = {}) {
    const flat = o.variant === 'floor';
    const rot = flat ? [Math.PI / 2 - 0.02, 0.7, 0] : [-0.17, 0, 0.05];
    const y = flat ? 0.035 : 0.42;
    return {
      parts: [
        P(CYL(0.032, 0.012, 0.62, 10), 'fabric.chair', [0, y + (flat ? 0 : 0.08), flat ? 0 : -0.06], rot),
        P(CYL(0.006, 0.006, 0.82, 6), 'metal.blackAnodised', [0, y, flat ? 0 : -0.07], rot),
        P(TOR(0.035, 0.007, 5, 10, Math.PI), 'plastic.dark', flat ? [0.38, 0.03, -0.28] : [0.035, 0.06, 0.0], flat ? [0, 0.7, 0] : [0, 0, Math.PI]),
      ],
      colliders: [],
    };
  },
});

/* ================================================================== */
/* EXTERIOR                                                            */
/* ================================================================== */

def('prop.planterExt', 'Exterior planter', [1.2, 0.62, 0.5], ['exterior', 'cover'], 'furniture', {
  mats: ['concrete.dark', 'snow.fresh', 'fabric.cubicleTeal', 'wood.dark'],
  use: 'court, entrance approach',
  coll: 'single AABB 1.2 × 0.62 × 0.5 (knee-high hard cover)',
  acc: 'Board-formed concrete planter with a snow cap, dormant shrub twigs poking through; snow overhangs the rim slightly.',
  build(o = {}) {
    const rng = o.rng ?? rngFor('planter');
    const parts = [
      P(BB(1.2, 0.58, 0.5, 0.014), 'concrete.dark', [0, 0.29, 0]),
      P(BB(1.14, 0.09, 0.44, 0.03), 'snow.fresh', [0, 0.6, 0]),
    ];
    for (let i = 0; i < 5; i++) {
      const x = -0.45 + rng() * 0.9;
      parts.push(P(CYL(0.006, 0.01, 0.3 + rng() * 0.25, 5), 'wood.dark', [x, 0.75, (rng() - 0.5) * 0.3], [(rng() - 0.5) * 0.5, 0, (rng() - 0.5) * 0.5]));
    }
    return { parts, colliders: [cbox(1.2, 0.64, 0.5, 'concrete', 'planter')] };
  },
});

def('prop.bollard', 'Steel bollard', [0.22, 0.95, 0.22], ['exterior'], 'maintenance', {
  mats: ['metal.paintedDark', 'metal.brushed', 'snow.fresh'],
  use: 'court, eastyard vehicle edges',
  coll: 'single AABB 0.22 × 0.95 × 0.22',
  acc: 'Ø0.18 bollard with domed cap, reflective band and a snow collar at the base.',
  build() {
    return {
      parts: [
        P(CYL(0.09, 0.09, 0.9, 14), 'metal.paintedDark', [0, 0.45, 0]),
        P(SPH(0.09, 12, 8), 'metal.paintedDark', [0, 0.9, 0]),
        P(CYL(0.092, 0.092, 0.06, 14), 'metal.brushed', [0, 0.72, 0]),
        P(CYL(0.16, 0.2, 0.07, 12), 'snow.fresh', [0, 0.035, 0]),
      ],
      colliders: [cbox(0.22, 0.95, 0.22, 'metal', 'bollard')],
    };
  },
});

def('prop.snowDrift', 'Snow drift mound', [2.2, 0.55, 1.4], ['exterior'], 'maintenance', {
  mats: ['snow.fresh'],
  use: 'court, westyard, eastyard, building edges',
  coll: 'single low AABB (step-up height) for L size; none for S',
  acc: 'Wind-formed drift: two merged squashed domes, long axis along the wind. Variants: S | M | L scale the footprint.',
  variants: ['S', 'M', 'L'],
  build(o = {}) {
    const v = o.variant ?? 'M';
    const s = v === 'S' ? 0.55 : v === 'L' ? 1.5 : 1.0;
    const parts = [
      P(SPH(1, 14, 10), 'snow.fresh', [0, 0.02 * s, 0], undefined, [1.1 * s, 0.34 * s, 0.7 * s]),
      P(SPH(1, 12, 8), 'snow.fresh', [0.55 * s, 0.01 * s, 0.2 * s], undefined, [0.6 * s, 0.22 * s, 0.45 * s]),
    ];
    const colliders = v === 'L' ? [cbox(2.0 * s, 0.3 * s, 1.2 * s, 'snow', 'drift')] : [];
    return { parts, colliders };
  },
});

def('prop.gritBin', 'Grit bin', [0.9, 0.75, 0.6], ['exterior'], 'maintenance', {
  mats: ['plastic.smooth', 'plastic.dark', 'snow.fresh'],
  use: 'court, westyard',
  coll: 'single AABB 0.9 × 0.75 × 0.6',
  acc: 'Municipal grit bin: hopper body with sloped lid, hinge spine, snow on top; "GRIT" label via signage.',
  build() {
    return {
      parts: [
        P(BB(0.9, 0.55, 0.6, 0.03), 'plastic.smooth', [0, 0.3, 0]),
        P(BB(0.92, 0.16, 0.62, 0.04), 'plastic.dark', [0, 0.64, 0], [0.08, 0, 0]),
        P(BB(0.86, 0.05, 0.5, 0.02), 'snow.fresh', [0, 0.74, -0.02], [0.08, 0, 0]),
      ],
      colliders: [cbox(0.9, 0.75, 0.6, 'plastic', 'gritbin')],
    };
  },
});

def('prop.vanUtility', 'Utility van (parked)', [2.1, 2.15, 4.9], ['exterior', 'cover', 'vehicle'], 'maintenance', {
  mats: ['metal.painted', 'glass.tinted', 'rubber.black', 'plastic.dark', 'metal.brushed', 'snow.fresh'],
  use: 'eastyard (extraction approach)',
  coll: 'body + cab AABBs (full vehicle blocker)',
  acc: 'Believable blocky panel van, long axis on Z, nose −Z: cab with windshield and side glass, box body with door seams, bumpers, four wheels with hubs, roof snow cap, mirrors. "Polar Logistics" livery quad from signage. Reads as a van at 30 m; never as a detailed car.',
  build() {
    const parts = [
      // Box body (rear 3 m)
      P(BB(2.05, 1.65, 3.0, 0.05), 'metal.painted', [0, 1.18, 0.85]),
      // Cab
      P(BB(1.95, 1.0, 1.7, 0.07), 'metal.painted', [0, 0.85, -1.5]),
      P(BB(1.85, 0.62, 1.2, 0.09), 'metal.painted', [0, 1.55, -1.2], [0.06, 0, 0]),
      // Windshield + side glass
      P(BB(1.7, 0.5, 0.03, 0.01), 'glass.tinted', [0, 1.52, -1.83], [0.35, 0, 0]),
      P(BB(0.02, 0.42, 0.85, 0.008), 'glass.tinted', [-0.965, 1.5, -1.25]),
      P(BB(0.02, 0.42, 0.85, 0.008), 'glass.tinted', [0.965, 1.5, -1.25]),
      // Bumpers
      P(BB(2.0, 0.22, 0.18, 0.03), 'plastic.dark', [0, 0.48, -2.32]),
      P(BB(2.0, 0.22, 0.15, 0.03), 'plastic.dark', [0, 0.48, 2.37]),
      // Grille + lights
      P(BB(1.3, 0.25, 0.05, 0.012), 'plastic.dark', [0, 0.9, -2.36]),
      P(BB(0.32, 0.14, 0.04, 0.01), 'plastic.smooth', [-0.75, 1.05, -2.35]),
      P(BB(0.32, 0.14, 0.04, 0.01), 'plastic.smooth', [0.75, 1.05, -2.35]),
      // Rear door seams
      P(BB(0.03, 1.5, 0.03, 0.004), 'metal.paintedDark', [0, 1.15, 2.36]),
      P(BB(0.02, 0.16, 0.05, 0.004), 'metal.brushed', [-0.2, 1.1, 2.37]),
      // Side door seam
      P(BB(0.03, 1.4, 0.03, 0.004), 'metal.paintedDark', [-1.035, 1.1, 0.1], [Math.PI / 2, 0, 0]),
      // Mirrors
      P(BB(0.06, 0.22, 0.14, 0.01), 'plastic.dark', [-1.08, 1.62, -1.7]),
      P(BB(0.06, 0.22, 0.14, 0.01), 'plastic.dark', [1.08, 1.62, -1.7]),
      // Roof snow
      P(BB(1.9, 0.09, 2.8, 0.04), 'snow.fresh', [0, 2.06, 0.85]),
      P(BB(1.7, 0.06, 1.0, 0.03), 'snow.fresh', [0, 1.9, -1.25], [0.06, 0, 0]),
    ];
    // Wheels
    for (const [x, z] of [[-0.88, -1.6], [0.88, -1.6], [-0.88, 1.5], [0.88, 1.5]]) {
      parts.push(P(CYL(0.36, 0.36, 0.24, 16), 'rubber.black', [x, 0.36, z], [0, 0, Math.PI / 2]));
      parts.push(P(CYL(0.17, 0.17, 0.25, 10), 'metal.brushed', [x, 0.36, z], [0, 0, Math.PI / 2]));
    }
    return {
      parts,
      colliders: [
        COL(-1.05, 0, -0.65, 1.05, 2.1, 2.4, 'metal', 'van'),
        COL(-1.0, 0, -2.4, 1.0, 1.9, -0.65, 'metal', 'van'),
      ],
    };
  },
  lod1() {
    return {
      parts: [
        P(BOX(2.05, 1.7, 3.0), 'metal.painted', [0, 1.15, 0.85]),
        P(BOX(1.95, 1.3, 1.7), 'metal.painted', [0, 0.95, -1.5]),
      ],
      colliders: [
        COL(-1.05, 0, -0.65, 1.05, 2.1, 2.4, 'metal', 'van'),
        COL(-1.0, 0, -2.4, 1.0, 1.9, -0.65, 'metal', 'van'),
      ],
    };
  },
});

def('prop.lightPole', 'Yard light pole', [0.6, 5.2, 0.6], ['exterior'], 'maintenance', {
  mats: ['metal.paintedDark', 'plastic.smooth', 'emissive.warm', 'snow.fresh'],
  use: 'court, eastyard, westyard',
  coll: 'single AABB on the pole shaft',
  acc: '5 m pole on a concrete-read base: tapered shaft, single cobra head with a warm emissive face, snow on the head. Variant: off.',
  variants: ['on', 'off'],
  build(o = {}) {
    const on = o.variant !== 'off';
    return {
      parts: [
        P(CYL(0.14, 0.16, 0.5, 12), 'concrete.dark', [0, 0.25, 0]),
        P(CYL(0.05, 0.08, 4.6, 12), 'metal.paintedDark', [0, 2.8, 0]),
        P(BB(0.16, 0.12, 0.85, 0.02), 'metal.paintedDark', [0, 5.12, -0.38]),
        P(BB(0.14, 0.02, 0.5, 0.005), on ? 'emissive.warm' : 'plastic.smooth', [0, 5.05, -0.52]),
        P(BB(0.18, 0.06, 0.8, 0.02), 'snow.fresh', [0, 5.2, -0.38]),
      ],
      colliders: [cbox(0.3, 5.1, 0.3, 'metal', 'pole')],
    };
  },
});

def('prop.bikeRack', 'Bike rack', [1.8, 0.8, 0.3], ['exterior'], 'maintenance', {
  mats: ['metal.galvanised', 'snow.fresh'],
  use: 'court',
  coll: 'single AABB 1.8 × 0.8 × 0.3',
  acc: 'Three galvanised hoop stands in a row with snow ridges balanced on top; nobody biked in today.',
  build() {
    const parts = [];
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * 0.7;
      parts.push(P(TOR(0.32, 0.025, 8, 16, Math.PI), 'metal.galvanised', [x, 0.42, 0], [0, 0, 0]));
      parts.push(P(CYL(0.025, 0.025, 0.42, 8), 'metal.galvanised', [x - 0.32, 0.21, 0]));
      parts.push(P(CYL(0.025, 0.025, 0.42, 8), 'metal.galvanised', [x + 0.32, 0.21, 0]));
      parts.push(P(BB(0.5, 0.05, 0.08, 0.02), 'snow.fresh', [x, 0.75, 0]));
    }
    return { parts, colliders: [cbox(1.8, 0.8, 0.3, 'metal', 'bikerack')] };
  },
});

def('prop.stanchion', 'Queue stanchion', [0.36, 1.0, 0.36], ['lobby'], 'furniture', {
  mats: ['metal.brushed', 'fabric.chair', 'rubber.black'],
  use: 'lobby, vestibule',
  coll: 'single AABB 0.36 × 1.0 × 0.36 (post only)',
  acc: 'Rope-queue post: weighted base, polished shaft, ball top; dress.js links pairs with a sagging belt part. Variant: belt (includes a 1.5 m belt to +X).',
  variants: ['post', 'belt'],
  build(o = {}) {
    const parts = [
      P(CYL(0.18, 0.18, 0.04, 16), 'rubber.black', [0, 0.02, 0]),
      P(CYL(0.025, 0.025, 0.92, 10), 'metal.brushed', [0, 0.5, 0]),
      P(SPH(0.04, 10, 8), 'metal.brushed', [0, 0.97, 0]),
    ];
    if (o.variant === 'belt') {
      const span = o.span ?? 1.5;
      parts.push(P(BB(span - 0.1, 0.05, 0.012, 0.004), 'fabric.chair', [span / 2, 0.86, 0], [0, 0, 0.03]));
    }
    return { parts, colliders: [cbox(0.36, 1.0, 0.36, 'metal', 'stanchion')] };
  },
});

def('prop.turnstile', 'Badge turnstile', [1.1, 1.02, 0.35], ['lobby', 'cover'], 'furniture', {
  mats: ['metal.brushedV', 'glass.clear', 'plastic.dark', 'emissive.ledRed'],
  use: 'vestibule',
  coll: 'two pedestal AABBs with the wing gap open',
  acc: 'Speed-gate lane: two brushed pedestals with card readers (red LED) and retracted glass wings; the 0.55 m lane between them stays passable.',
  build() {
    const parts = [];
    for (const sx of [-0.44, 0.44]) {
      parts.push(P(BB(0.22, 0.98, 0.35, 0.014), 'metal.brushedV', [sx, 0.49, 0]));
      parts.push(P(BB(0.16, 0.02, 0.1, 0.004), 'plastic.dark', [sx, 0.99, -0.08]));
      parts.push(P(BB(0.014, 0.012, 0.05, 0.002), 'emissive.ledRed', [sx, 1.0, -0.14]));
      parts.push(P(BOX(0.015, 0.5, 0.18), 'glass.clear', [sx + (sx < 0 ? 0.12 : -0.12), 0.62, 0.06]));
    }
    return {
      parts,
      colliders: [
        cbox(0.22, 1.02, 0.35, 'metal', 'turnstile', -0.44, 0),
        cbox(0.22, 1.02, 0.35, 'metal', 'turnstile', 0.44, 0),
      ],
    };
  },
});

/* ================================================================== */
/* prop() — world-space instancing                                     */
/* ================================================================== */

/**
 * Build a prop instance in world space.
 * opts: { pos:[x,y,z], rot: yawRadians, rng, variant, scale, lod, ...propSpecific }
 */
export function prop(id, opts = {}) {
  const d = PROPS[id];
  if (!d) {
    console.error(`[props] unknown prop id "${id}"`);
    return { parts: [], faces: [], screenFaces: [], colliders: [], screens: [], dynamic: null };
  }
  const pos = opts.pos ?? [0, 0, 0];
  const yaw = opts.rot ?? 0;
  const s = opts.scale ?? 1;
  const o = {
    ...opts,
    rng: opts.rng ?? rngFor(`${id}@${pos.map((v) => (+v).toFixed(2)).join(',')}`),
  };
  const useLod = opts.lod === 1 && d.buildLod1;
  const res = (useLod ? d.buildLod1(o) : d.build(o)) ?? {};
  const colliders = res.colliders ?? [];
  const screens = res.screens ?? [];

  // Split canvas-atlas faces (book spines, screen content) out of the static
  // batch: they carry pre-baked UVs and their own shared materials, and merge
  // into dedicated meshes in dress.js. Everything else batches by family.
  const parts = [];
  const faces = [];
  const screenFaces = [];
  const smallProp = Math.max(d.size[0], d.size[1], d.size[2]) < 0.6;
  for (const p of res.parts ?? []) {
    if (p.matName === 'signage.atlas') faces.push(p);
    else if (p.matName === 'screen.atlas') screenFaces.push(p);
    else {
      // Small clutter: stretch noisy organic families so high-frequency
      // texture detail doesn't read as dirt at gameplay distance.
      if (smallProp && p.uvScale === undefined && /^(paper|fabric|leather|cardboard)\./.test(p.matName)) {
        p.uvScale = 1.8;
      }
      parts.push(p);
    }
  }

  const M = new THREE.Matrix4().compose(
    new THREE.Vector3(pos[0], pos[1], pos[2]),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)),
    new THREE.Vector3(s, s, s),
  );
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const xf = (x, y, z) => [
    pos[0] + (x * cos + z * sin) * s,
    pos[1] + y * s,
    pos[2] + (-x * sin + z * cos) * s,
  ];

  return {
    parts: parts.map((p) => ({ ...p, matrix: M.clone().multiply(p.matrix) })),
    faces: faces.map((p) => ({ ...p, matrix: M.clone().multiply(p.matrix) })),
    screenFaces: screenFaces.map((p) => ({ ...p, matrix: M.clone().multiply(p.matrix) })),
    colliders: colliders.map((c) => {
      const corners = [xf(c.x0, 0, c.z0), xf(c.x1, 0, c.z0), xf(c.x0, 0, c.z1), xf(c.x1, 0, c.z1)];
      const xs = corners.map((q) => q[0]);
      const zs = corners.map((q) => q[2]);
      return {
        ...c,
        x0: Math.min(...xs), x1: Math.max(...xs),
        z0: Math.min(...zs), z1: Math.max(...zs),
        y0: pos[1] + c.y0 * s, y1: pos[1] + c.y1 * s,
      };
    }),
    screens: screens.map((sc) => ({ ...sc, pos: xf(sc.pos[0], sc.pos[1], sc.pos[2]), rot: (sc.rot ?? 0) + yaw })),
    dynamic: res.dynamic ?? null,
  };
}

/** Approximate horizontal clearance radius of a prop's footprint. */
export function propRadius(id) {
  const d = PROPS[id];
  if (!d) return 0.3;
  return Math.hypot(d.size[0], d.size[2]) / 2;
}

/* ================================================================== */
/* Manifest registration                                               */
/* ================================================================== */

let registered = false;
export function registerPropManifest() {
  if (registered) return;
  registered = true;
  for (const id of ORDER) {
    const d = PROPS[id];
    const [w, h, dd] = d.size;
    reg({
      id: d.id,
      name: d.name,
      category: d.cat,
      owner: OWNERS.FABLE3,
      files: ['src/props/library.js', 'src/props/dress.js'],
      usedIn: d.use,
      dimensions: `${w} × ${h} × ${dd} m (w × h × d)`,
      pivot: 'footprint centre at floor (y = 0); yaw 0 faces −Z; wall/ceiling props note their mount plane in acceptance',
      materials: d.mats,
      textures: ['procedural family maps: baseColor + normal + roughness (see mat.* entries)'],
      collision: d.coll,
      lod: d.buildLod1
        ? 'LOD0 merged into static batch; buildLod1(opts) exposes a simplified silhouette (< 25% tris) for gallery/dynamic use — batched statics do not runtime-switch'
        : 'single LOD (< ~600 tris); merged into per-material static batches',
      status: 'accepted',
      acceptance: `${d.acc} Variants: ${d.variants.join(' | ')}. Base at y=0 — never floats; small clutter carries no collider.`,
      evidence: ['screenshots/gallery/props.png'],
    });
  }
}
