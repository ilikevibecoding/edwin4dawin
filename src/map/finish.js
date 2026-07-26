// Interior architectural finish kit (Fable 2): baseboards, door casings, window stools, wainscot,
// crown trim, structural columns and emissive exit signage. Everything is emitted through the Kit
// merger (one draw call per material) and consumes wall-segment data computed by builder.js.
// LOCKED layout data is only read — no rects/openings are moved.
import { FLOORS } from './layout.js';

const DOOR_H = 2.05;
const BB_H = 0.09;    // baseboard height (visual bible: ~90mm)
const BB_D = 0.016;   // baseboard proudness
const CASE_W = 0.07;  // door casing width
const CASE_D = 0.02;

const WAINSCOT = {
  'exec-corr': { mat: 'woodTrim', panel: 'woodSlat', h: 1.05 },
  'exec':      { mat: 'woodTrim', panel: 'woodSlat', h: 1.05 },
  'rr-m':      { mat: 'trimPaint', panel: 'tileWainscot', h: 1.25, tile: true },
  'rr-w':      { mat: 'trimPaint', panel: 'tileWainscot', h: 1.25, tile: true },
};
const CROWN_ROOMS = new Set(['exec-corr', 'exec', 'asst']);

function finished(room) {
  if (!room || room.exterior || room.isVoid || room.stair || room.stairTop) return false;
  return !['concrete', 'concretePaint', 'raisedTile', 'snow'].includes(room.floorMat);
}

export function buildInteriorFinish(map, kit, segments) {
  for (const seg of segments) {
    if (seg.roomA?.isVoid || seg.roomB?.isVoid) continue;
    const f = FLOORS[seg.floor];
    const isExt = seg.exterior || seg.roomA?.exterior || seg.roomB?.exterior;
    const t = isExt ? 0.34 : 0.16;
    for (const side of [-1, 1]) {
      const room = side < 0 ? seg.roomA : seg.roomB;
      if (!finished(room)) continue;
      trimSide(map, kit, seg, side, room, f, t);
    }
    for (const op of seg.openings) openingTrim(map, kit, seg, op, f, t);
  }
  buildColumns(map, kit);
  buildExitSigns(map, kit, segments);
  serverLiner(kit);
}

// --- server room dark liner (WP-011b) -----------------------------------------
// The server's shell walls are pale (exteriorPanel / concretePaint faces), which fought the
// visual-bible "cool dark data center" identity no matter how low the fills went. Thin dark
// tech panels line the inside faces (door spans skipped). 22mm proud — cosmetic, no collider
// (the wall AABBs behind them already block everything).
function serverLiner(kit) {
  const H = 2.82, Y = 0.04; // below the deck beams, above the raised floor
  const runs = [
    { axis: 'z', face: 47.815, spans: [[0.2, 9.8]] },                   // east shell (x48)
    { axis: 'x', face: 0.185, spans: [[38.2, 47.8]] },                  // south shell (z0)
    { axis: 'z', face: 38.095, spans: [[0.2, 3.85], [5.15, 9.8]] },     // west, door-server-back
    { axis: 'x', face: 9.905, spans: [[38.2, 41.85], [43.15, 47.8]] },  // north, door-server-main
  ];
  for (const r of runs) {
    for (const [a, b] of r.spans) {
      const mid = (a + b) / 2, len = b - a;
      if (r.axis === 'x') kit.box('serverLiner', len, H, 0.022, mid, Y + H / 2, r.face, { cast: false });
      else kit.box('serverLiner', 0.022, H, len, r.face, Y + H / 2, mid, { cast: false });
    }
  }
}

// --- per-wall-face trim ------------------------------------------------------
function trimSide(map, kit, seg, side, room, f, t) {
  const face = seg.at + (t / 2) * side;
  const y0 = f.y;
  const wains = WAINSCOT[room.id];

  // spans: solid runs + under-window bands (sill walls carry base trim too)
  const spans = [...(seg.runs || [])];
  for (const op of seg.openings) {
    if ((op.type === 'window' || op.type === 'glasswall') && (op.sill ?? 0.9) >= 0.3) {
      spans.push([op.center - op.w / 2, op.center + op.w / 2, Math.min(op.sill ?? 0.9, 1.0)]);
    }
  }

  for (const [a, b, capH] of spans) {
    const len = b - a - 0.02;
    if (len < 0.08) continue;
    const mid = (a + b) / 2;
    const P = (w, h, d, y, matName, extra = {}) => {
      // box aligned to the wall: w along the wall, d proud of the face
      const cx = seg.axis === 'x' ? face + (d / 2) * side : mid;
      const cz = seg.axis === 'x' ? mid : face + (d / 2) * side;
      kit.box(matName, seg.axis === 'x' ? d : w, h, seg.axis === 'x' ? w : d, cx, y + h / 2, cz, extra);
    };
    if (wains && !(capH && capH < wains.h)) {
      const h = wains.h;
      P(len, h, wains.tile ? 0.012 : 0.024, y0, wains.panel, { cast: false });
      P(len, 0.05, wains.tile ? 0.016 : 0.04, y0 + h, wains.mat, { cast: false });
      if (!wains.tile) P(len, 0.11, 0.03, y0, wains.mat, { cast: false }); // wood base under panel
    } else {
      P(len, BB_H, BB_D, y0, 'trimPaint', { cast: false });
      if (wains && capH && capH - 0.12 > BB_H + 0.04) {
        P(len, capH - 0.12 - BB_H, wains.tile ? 0.012 : 0.024, y0 + BB_H, wains.panel, { cast: false });
      }
    }
  }
  // crown runs the full segment (door/window headers carry it past openings)
  if (CROWN_ROOMS.has(room.id) && seg.to - seg.from > 0.2) {
    const mid = (seg.from + seg.to) / 2, len = seg.to - seg.from - 0.02;
    const d = 0.05;
    const cx = seg.axis === 'x' ? face + (d / 2) * side : mid;
    const cz = seg.axis === 'x' ? mid : face + (d / 2) * side;
    kit.box('woodTrim', seg.axis === 'x' ? d : len, 0.09, seg.axis === 'x' ? len : d,
      cx, y0 + f.ceil - 0.045, cz, { cast: false });
  }
}

// --- opening trim: door casings, window stools -------------------------------
function openingTrim(map, kit, seg, op, f, t) {
  const y0 = f.y;
  const cAlong = op.center;
  const wallPos = seg.at;

  const sideRooms = [[-1, seg.roomA], [1, seg.roomB]];
  if (op.type === 'door') {
    if (op.kind === 'glass' || op.kind === 'glassDouble') return; // aluminum storefront: jambs suffice
    const matName = (op.kind === 'wood' || op.kind === 'woodDouble') ? 'woodTrim' : 'trimPaint';
    for (const [side, room] of sideRooms) {
      if (!finished(room)) continue;
      const face = wallPos + (t / 2) * side;
      const H = DOOR_H + 0.1;
      for (const off of [-op.w / 2 - CASE_W / 2 + 0.01, op.w / 2 + CASE_W / 2 - 0.01]) {
        const cx = seg.axis === 'x' ? face + (CASE_D / 2) * side : cAlong + off;
        const cz = seg.axis === 'x' ? cAlong + off : face + (CASE_D / 2) * side;
        kit.box(matName, seg.axis === 'x' ? CASE_D : CASE_W, H, seg.axis === 'x' ? CASE_W : CASE_D, cx, y0 + H / 2, cz, { cast: false });
      }
      const headW = op.w + 2 * CASE_W;
      const hx = seg.axis === 'x' ? face + (CASE_D / 2) * side : cAlong;
      const hz = seg.axis === 'x' ? cAlong : face + (CASE_D / 2) * side;
      kit.box(matName, seg.axis === 'x' ? CASE_D : headW, CASE_W, seg.axis === 'x' ? headW : CASE_D, hx, y0 + H + CASE_W / 2 - 0.01, hz, { cast: false });
    }
  } else if (op.type === 'window') {
    const sillH = op.sill ?? 0.9;
    for (const [side, room] of sideRooms) {
      if (!finished(room)) continue;
      const face = wallPos + (t / 2) * side;
      if (op.kind === 'curtain' || op.kind === 'ribbon') {
        // aluminum sill cap, low profile
        const d = 0.07, w = op.w + 0.06;
        const cx = seg.axis === 'x' ? face + (d / 2 - 0.02) * side : cAlong;
        const cz = seg.axis === 'x' ? cAlong : face + (d / 2 - 0.02) * side;
        kit.box('mullionCap', seg.axis === 'x' ? d : w, 0.04, seg.axis === 'x' ? w : d, cx, y0 + sillH + 0.045, cz, { cast: false });
      } else {
        // painted stool with believable depth + apron
        const d = 0.11, w = op.w + 0.14;
        const cx = seg.axis === 'x' ? face + (d / 2 - 0.03) * side : cAlong;
        const cz = seg.axis === 'x' ? cAlong : face + (d / 2 - 0.03) * side;
        kit.box('trimPaint', seg.axis === 'x' ? d : w, 0.035, seg.axis === 'x' ? w : d, cx, y0 + sillH + 0.043, cz, { cast: false });
        const ax = seg.axis === 'x' ? face + 0.012 * side : cAlong;
        const az = seg.axis === 'x' ? cAlong : face + 0.012 * side;
        kit.box('trimPaint', seg.axis === 'x' ? 0.024 : op.w + 0.06, 0.07, seg.axis === 'x' ? op.w + 0.06 : 0.024, ax, y0 + sillH - 0.01, az, { cast: false });
      }
    }
  }
}

// --- structural columns -------------------------------------------------------
// Large spans (open office, lobby mezz edge, loading bay, garage) get 0.44 m columns with
// base/cap trim. Positions chosen clear of patrol waypoints, door swings and the escort path.
const COLUMNS = [
  { x: 14, z: 30, floor: 0 },   // lobby: mezzanine edge SW corner of the void
  { x: 28, z: 30, floor: 0 },   // lobby: mezzanine edge SE corner of the void
  { x: 9.5, z: 6, floor: 0 },   // garage mid-bay
  { x: 22, z: 4, floor: 0 },    // loading south
  { x: 22, z: 9, floor: 0 },    // loading north
  { x: 7, z: 7.5, floor: 1 },   // open office line
  { x: 14, z: 7.5, floor: 1 },
  { x: 21, z: 7.5, floor: 1 },
];

function buildColumns(map, kit) {
  for (const c of COLUMNS) {
    const f = FLOORS[c.floor];
    const h = f.ceil;
    const S = 0.44;
    kit.box('columnPaint', S, h, S, c.x, f.y + h / 2, c.z);
    kit.box('trimDark', S + 0.1, 0.1, S + 0.1, c.x, f.y + 0.05, c.z, { cast: false });
    kit.box('trimDark', S + 0.06, 0.09, S + 0.06, c.x, f.y + h - 0.05, c.z, { cast: false });
    kit.collide(c.x - S / 2, f.y, c.z - S / 2, c.x + S / 2, f.y + h, c.z + S / 2, { tag: 'column', material: 'concrete' });
  }
}

// --- exit signage --------------------------------------------------------------
// Emissive EXIT plates above egress doors (green-white glow per visual bible).
// side: which room the plate faces into ('*' = both interior sides).
const EXIT_DOORS = {
  'door-entry': ['vest'], 'door-vest': ['lobby'],
  'door-garage': ['sc', 'garage'], 'door-loading': ['loading'],
  'door-mech': ['mech'], 'door-sc-it': ['sc', 'it'],
  'door-sta-sc': ['sc', 'stair-a'], 'door-courtyard': ['sc'],
  'door-dock': ['loading'], 'door-stb-sc': ['sc', 'stair-b'],
  'door-stb1': ['corr-w', 'stair-b1'], 'door-sta1-exec': ['exec-corr'],
  'door-sta1-mezz': ['mezz', 'stair-a1'],
};

function buildExitSigns(map, kit, segments) {
  for (const seg of segments) {
    for (const op of seg.openings) {
      let rooms = null;
      if (op.type === 'door' && EXIT_DOORS[op.id]) rooms = EXIT_DOORS[op.id];
      else if (op.type === 'arch' && op.a === 'lobby' && op.b === 'stair-a') rooms = ['lobby'];
      if (!rooms) continue;
      const f = FLOORS[seg.floor];
      const t = (seg.exterior || seg.roomA?.exterior || seg.roomB?.exterior) ? 0.34 : 0.16;
      for (const roomId of rooms) {
        const side = seg.roomA?.id === roomId ? -1 : seg.roomB?.id === roomId ? 1 : 0;
        if (!side) continue;
        const face = seg.at + (t / 2) * side;
        const y = f.y + Math.min(2.46, f.ceil - 0.24);
        const bx = seg.axis === 'x' ? face + 0.035 * side : op.center;
        const bz = seg.axis === 'x' ? op.center : face + 0.035 * side;
        kit.box('exitHousing', seg.axis === 'x' ? 0.06 : 0.56, 0.3, seg.axis === 'x' ? 0.56 : 0.06, bx, y, bz, { cast: false });
        const lx = seg.axis === 'x' ? face + 0.075 * side : op.center;
        const lz = seg.axis === 'x' ? op.center : face + 0.075 * side;
        kit.box('exitLens', seg.axis === 'x' ? 0.02 : 0.48, 0.22, seg.axis === 'x' ? 0.48 : 0.02, lx, y, lz, { uv: 0, cast: false });
      }
    }
  }
}
