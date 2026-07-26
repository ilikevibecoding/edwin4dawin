// Exterior & snowbound atmosphere (Fable 2): façade panel reveals + floor bands, curtain-wall
// mullion caps, parapet + snow caps, entrance canopy/portal, wall-base snow drifts, plowed-path
// vs deep-snow ground variation, entrance plaza + loading apron + courtyard site furniture, and
// cheap distant surroundings (lit-window silhouettes + treeline) that read through the fog.
import * as THREE from 'three';
import { FLOORS } from './layout.js';
import { WALL_TOPS } from './builder.js';
import { cosmeticRng } from '../core/rng.js';

const EXT_T = 0.34;

function exteriorSide(seg) {
  if (seg.exterior) return seg.outDir ?? 1;
  if (seg.roomA?.exterior) return -1;
  if (seg.roomB?.exterior) return 1;
  return 0;
}

// Wall-base drift exclusions (plowed zones): {axis, at, lo, hi}
const DRIFT_EXCLUDE = [
  { axis: 'z', at: 36, lo: 14.6, hi: 19.4 },  // entry path to the vestibule
  { axis: 'z', at: 0, lo: 3.5, hi: 29.5 },    // plowed loading apron
  { axis: 'x', at: 0, lo: 12.4, hi: 14.6 },   // courtyard fire-exit landing
];

// ---------------------------------------------------------------------------
export function buildFacade(map, kit, segments) {
  for (const seg of segments) {
    const s = exteriorSide(seg);
    if (!s) continue;
    const f = FLOORS[seg.floor];
    const y0 = f.y, y1 = WALL_TOPS[seg.floor];
    const face = seg.at + (EXT_T / 2) * s;
    const yardWall = seg.exterior && seg.roomA?.exterior; // plaza/courtyard perimeter wall

    const put = (matName, along, alongLen, proud, y, h, opts = {}) => {
      const cx = seg.axis === 'x' ? face + (proud / 2) * s : along;
      const cz = seg.axis === 'x' ? along : face + (proud / 2) * s;
      kit.box(matName, seg.axis === 'x' ? proud : alongLen, h, seg.axis === 'x' ? alongLen : proud, cx, y, cz, opts);
    };

    if (yardWall) {
      // site wall: precast cap + snow, drifts on the inside face
      const mid = (seg.from + seg.to) / 2, len = seg.to - seg.from;
      const capX = seg.axis === 'x' ? seg.at : mid;
      const capZ = seg.axis === 'x' ? mid : seg.at;
      kit.box('parapet', seg.axis === 'x' ? EXT_T + 0.12 : len + 0.12, 0.09, seg.axis === 'x' ? len + 0.12 : EXT_T + 0.12, capX, y1 + 0.045, capZ, { cast: false });
      kit.box('snow', seg.axis === 'x' ? EXT_T + 0.04 : len + 0.04, 0.08, seg.axis === 'x' ? len + 0.04 : EXT_T + 0.04, capX, y1 + 0.13, capZ, { cast: false });
      driftRun(kit, seg, seg.from, seg.to, seg.at - (EXT_T / 2) * s, -s, y0);
      continue;
    }

    // building façade
    if (seg.floor === 1) {
      // parapet cap + snow along the roof edge
      const mid = (seg.from + seg.to) / 2, len = seg.to - seg.from + 0.2;
      const capX = seg.axis === 'x' ? seg.at : mid;
      const capZ = seg.axis === 'x' ? mid : seg.at;
      kit.box('parapet', seg.axis === 'x' ? EXT_T + 0.16 : len, 0.12, seg.axis === 'x' ? len : EXT_T + 0.16, capX, y1 + 0.34, capZ, { cast: false });
      kit.box('snow', seg.axis === 'x' ? EXT_T + 0.08 : len - 0.06, 0.09, seg.axis === 'x' ? len - 0.06 : EXT_T + 0.08, capX, y1 + 0.44, capZ, { cast: false });
    } else {
      // floor-line band between storeys
      put('facadeReveal', (seg.from + seg.to) / 2, seg.to - seg.from, 0.03, 3.5, 0.16, { cast: false });
    }
    // vertical panel reveals on solid runs, world-grid aligned so panels line up across runs
    for (const [a, b] of seg.runs ?? []) {
      for (let p = Math.ceil((a + 0.3) / 2.4) * 2.4; p < b - 0.3; p += 2.4) {
        put('facadeReveal', p, 0.05, 0.025, (y0 + y1) / 2, y1 - y0 - 0.24, { cast: false });
      }
    }
    // per-opening dressing
    for (const op of seg.openings) {
      if (op.type !== 'window') continue;
      const sillH = op.sill ?? 0.9, headH = op.head ?? 2.5;
      // snow packed on the exterior sill
      put('snow', op.center, op.w + 0.06, 0.09, y0 + sillH + 0.075, 0.055, { cast: false });
      // curtain/ribbon mullion caps (match the builder's pane layout)
      if (op.kind === 'curtain' || op.kind === 'ribbon') {
        const count = Math.max(1, Math.round(op.w / 1.7));
        const paneW = (op.w - 0.05 * (count + 1)) / count;
        const capH = headH - sillH + 0.14;
        const capY = y0 + (sillH + headH) / 2;
        for (let i = 0; i <= count; i++) {
          const off = -op.w / 2 + 0.025 + i * (paneW + 0.05);
          const cap = op.center + off;
          const cx = seg.axis === 'x' ? face + 0.045 * s : cap;
          const cz = seg.axis === 'x' ? cap : face + 0.045 * s;
          kit.box('mullionCap', seg.axis === 'x' ? 0.09 : 0.08, capH, seg.axis === 'x' ? 0.08 : 0.09, cx, capY, cz, { cast: false });
        }
        // head cap rail
        put('mullionCap', op.center, op.w + 0.1, 0.08, y0 + headH + 0.05, 0.1, { cast: false });
      }
    }
    // wall-base treatment on solid runs + under windows (never across doors):
    // a darker ground-line band (cheap ambient-occlusion read where facade meets snow) + drifts
    if (seg.floor === 0) {
      const spans = [...(seg.runs ?? [])];
      for (const op of seg.openings) {
        if (op.type === 'window' && (op.sill ?? 0.9) >= 0.35) spans.push([op.center - op.w / 2, op.center + op.w / 2]);
      }
      for (const [a, b] of spans) {
        if (b - a > 0.5) put('facadeBase', (a + b) / 2, b - a - 0.04, 0.018, y0 + 0.21, 0.42, { cast: false });
        driftRun(kit, seg, a, b, face, s, y0);
      }
    }
  }
}

function driftRun(kit, seg, from, to, face, s, y0) {
  if (y0 > 0.01) return;
  for (const ex of DRIFT_EXCLUDE) {
    if (ex.axis === seg.axis && Math.abs(seg.at - ex.at) < 0.4) {
      if (from < ex.hi && to > ex.lo) {
        if (ex.lo - from > 0.6) driftRun(kit, { ...seg }, from, ex.lo, face, s, y0);
        if (to - ex.hi > 0.6) driftRun(kit, { ...seg }, ex.hi, to, face, s, y0);
        return;
      }
    }
  }
  if (to - from < 1.0) return;
  const runAxis = seg.axis === 'x' ? 'z' : 'x'; // drifts run ALONG the wall
  // one continuous tapered ribbon per span — heights undulate, ends feather to the ground
  const a = from + 0.04, b = to - 0.04;
  const n = Math.max(3, Math.round((b - a) / 1.1) + 1);
  const nodes = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const taper = Math.min(1, Math.min(i, n - 1 - i) / 1.4);
    nodes.push({
      p: a + t * (b - a),
      h: taper * cosmeticRng.range(0.16, 0.42),
      depth: 0.22 + taper * cosmeticRng.range(0.3, 0.7),
    });
  }
  kit.ribbon('snow', runAxis, face, nodes, s, { cast: false });
}

// ---------------------------------------------------------------------------
// Site work: plaza, loading apron, courtyard
// ---------------------------------------------------------------------------
export function buildSite(map, kit) {
  plaza(map, kit);
  loadingApron(map, kit);
  courtyard(map, kit);
}

function groundOverlay(kit, matName, x0, z0, x1, z1, top = 0.02) {
  kit.box(matName, x1 - x0, top, z1 - z0, (x0 + x1) / 2, top / 2, (z0 + z1) / 2, { cast: false });
}

function bench(kit, x, z, alongX = true) {
  const L = 1.7, D = 0.48;
  const w = alongX ? L : D, d = alongX ? D : L;
  for (const [ox, oz] of alongX ? [[-0.7, 0], [0.7, 0]] : [[0, -0.7], [0, 0.7]]) {
    // bollardMetal (clean painted, low metal): the shared paintedMetal sparkles at true tiling
    kit.box('bollardMetal', 0.07, 0.42, 0.4, x + ox, 0.21, z + oz);
  }
  for (let i = 0; i < 3; i++) {
    const off = -D / 2 + 0.06 + i * 0.17;
    kit.box('wood', alongX ? L : 0.13, 0.045, alongX ? 0.13 : L, x + (alongX ? 0 : off), 0.46, z + (alongX ? off : 0));
  }
  kit.box('snow', alongX ? L - 0.1 : 0.14, 0.045, alongX ? 0.14 : L - 0.1,
    x + (alongX ? 0 : D / 2 - 0.09), 0.505, z + (alongX ? D / 2 - 0.09 : 0), { cast: false });
  kit.collide(x - w / 2, 0, z - d / 2, x + w / 2, 0.5, z + d / 2, { tag: 'bench', material: 'wood', blockSight: false });
}

function bollard(kit, x, z) {
  kit.cyl('bollardMetal', 0.09, 0.1, 0.85, x, 0, z, { seg: 10 });
  kit.cyl('snow', 0.1, 0.095, 0.05, x, 0.85, z, { cast: false, seg: 10 });
  kit.collide(x - 0.09, 0, z - 0.09, x + 0.09, 0.85, z + 0.09, { tag: 'bollard', material: 'metal', blockSight: false });
}

function plaza(map, kit) {
  // plowed walk path: spawn → bend → vestibule (asphalt showing through the snow)
  groundOverlay(kit, 'plowedAsphalt', 15, 36, 19, 39.4);
  groundOverlay(kit, 'plowedAsphalt', 15, 39.4, 28.2, 41.6);
  groundOverlay(kit, 'plowedAsphalt', 24.2, 41.6, 28.2, 45);
  // plow banks along the path edges (tapered ribbons so the ends feather out)
  const bank = (axis, face, mid, len, dir, hMax, depth) => {
    const a = mid - len / 2, b = mid + len / 2;
    const n = Math.max(3, Math.round(len / 1.2) + 1);
    const nodes = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const taper = Math.min(1, Math.min(i, n - 1 - i) / 1.2);
      nodes.push({ p: a + t * (b - a), h: taper * hMax * cosmeticRng.range(0.75, 1.25), depth: 0.18 + taper * depth });
    }
    kit.ribbon('snow', axis, face, nodes, dir, { cast: false });
  };
  bank('x', 39.35, 23.7, 8.8, -1, 0.24, 0.5);
  bank('x', 41.65, 19.6, 9.0, 1, 0.22, 0.5);
  bank('z', 24.15, 43.3, 3.4, -1, 0.2, 0.45);
  bank('z', 28.25, 43.3, 3.4, 1, 0.2, 0.45);
  bank('z', 14.95, 37.6, 3.0, -1, 0.2, 0.4);
  bank('z', 19.05, 37.6, 3.0, 1, 0.2, 0.4);

  // deep-snow variation: soft mounds + raised patches away from the walk line
  const mound = (x, z, r, h) => {
    const geo = new THREE.SphereGeometry(r, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2);
    geo.scale(1, h / r, 1);
    geo.translate(x, 0.01, z);
    kit.add('snow', geo, { cast: false });
  };
  const patch = (x0, z0, x1, z1, h) => {
    kit.box('snow', x1 - x0, h, z1 - z0, (x0 + x1) / 2, h / 2, (z0 + z1) / 2, { cast: false });
    kit.collide(x0, 0, z0, x1, h, z1, { tag: 'snowbank', material: 'snow', blockSight: false, blockShot: false });
  };
  patch(4.4, 41.2, 9.6, 44.8, 0.14);
  patch(31.6, 41.8, 35.8, 44.8, 0.12);
  mound(7.2, 39.8, 1.6, 0.35); mound(12.4, 43.2, 2.0, 0.4); mound(33.8, 39.2, 1.5, 0.3);
  mound(29.8, 44.0, 1.7, 0.32); mound(10.2, 34.6, 1.2, 0.26);

  // entrance canopy + portal surround over the vestibule doors (17, 36)
  kit.box('canopySteel', 6.4, 0.14, 2.25, 17, 2.96, 37.16);
  kit.box('snow', 6.34, 0.09, 2.18, 17, 3.07, 37.16, { cast: false });
  kit.box('canopySteel', 6.4, 0.1, 0.12, 17, 2.86, 38.24, { cast: false }); // drip edge
  // soffit shadow panel — the canopy underside reads occluded even where the fill lights miss
  kit.box('soffitShadow', 6.3, 0.012, 2.14, 17, 2.878, 37.12, { cast: false, receive: false });
  for (const sx of [14.2, 19.8]) { // tie rods to the facade
    kit.box('canopySteel', 0.045, 0.045, 2.3, sx, 3.4, 37.2, { rotX: 0.42, cast: false });
  }
  kit.collide(13.8, 2.89, 36.17, 20.2, 3.12, 38.28, { tag: 'canopy', material: 'metal', blockSight: false });
  for (const sx of [15.85, 18.15]) kit.box('canopySteel', 0.16, 2.9, 0.16, sx, 1.45, 36.24); // portal jambs
  kit.box('canopySteel', 2.62, 0.24, 0.16, 17, 2.77, 36.24, { cast: false });

  // bollard line shielding the entrance
  for (const bx of [13.9, 15.3, 18.7, 20.1]) bollard(kit, bx, 37.5);

  // bare flagpoles (winter — flags stowed)
  for (const [fx, fz, fh] of [[29.6, 38.5, 7.6], [31.3, 40.3, 7.1], [33.0, 42.1, 6.6]]) {
    kit.cyl('parapet', 0.17, 0.2, 0.14, fx, 0, fz, { seg: 10 });
    kit.cyl('flagpoleMetal', 0.028, 0.036, fh, fx, 0.14, fz, { seg: 8 });
    kit.cyl('flagpoleMetal', 0.05, 0.05, 0.09, fx, fh + 0.14, fz, { seg: 8 });
    kit.cyl('snow', 0.19, 0.16, 0.05, fx, 0.14, fz, { cast: false, seg: 10 });
    kit.collide(fx - 0.06, 0, fz - 0.06, fx + 0.06, fh, fz + 0.06, { tag: 'pole', material: 'metal', blockSight: false, blockShot: false });
  }

  // bench + bike rack against the gallery curtain wall
  bench(kit, 24.2, 37.0, true);
  for (const hx of [9.5, 10.3, 11.1]) {
    for (const hz of [37.0, 37.7]) kit.cyl('brushedMetal', 0.024, 0.024, 0.72, hx, 0, hz, { seg: 8 });
    kit.box('brushedMetal', 0.05, 0.05, 0.78, hx, 0.745, 37.35);
    kit.box('snow', 0.06, 0.035, 0.74, hx, 0.785, 37.35, { cast: false });
  }
  kit.collide(9.3, 0, 36.85, 11.3, 0.78, 37.85, { tag: 'rack', material: 'metal', blockSight: false, blockShot: false });

  // signage monolith with the building name (faces the spawn approach, joins the flagpole group)
  const mx = 27.2, mz = 38.6;
  kit.box('parapet', 2.4, 0.22, 0.62, mx, 0.11, mz);
  kit.box('monolithShell', 2.2, 1.62, 0.34, mx, 1.03, mz);
  const plate = new THREE.BoxGeometry(1.98, 1.06, 0.04);
  plate.translate(mx, 1.12, mz + 0.19);
  kit.add('signMonolith', plate, { uv: 0, cast: false });
  kit.box('snow', 2.22, 0.07, 0.37, mx, 1.875, mz, { cast: false });
  kit.collide(mx - 1.2, 0, mz - 0.31, mx + 1.2, 1.9, mz + 0.31, { tag: 'monolith', material: 'concrete', blockSight: false });
}

function loadingApron(map, kit) {
  groundOverlay(kit, 'apronConcrete', 1.2, -7.6, 29.8, -0.02, 0.03);
  // painted markings: dock hatch zone + shutter approach lane
  const y = 0.036;
  for (const [x0, z0, x1, z1] of [
    [16.9, -4.3, 17.06, -0.1], [20.94, -4.3, 21.1, -0.1], [16.9, -4.3, 21.1, -4.14],
  ]) kit.box('markingYellow', x1 - x0, 0.006, z1 - z0, (x0 + x1) / 2, y, (z0 + z1) / 2, { cast: false, receive: false });
  for (let i = 0; i < 4; i++) {
    kit.box('markingYellow', 0.14, 0.006, 3.3, 17.7 + i * 0.86, y, -2.2, { rotY: 0.62, cast: false, receive: false });
  }
  for (let z = -6.6; z < -0.8; z += 1.5) kit.box('markingWhite', 0.13, 0.006, 0.8, 7, y, z, { cast: false, receive: false });
  // dock bumpers + canopies (with soffit shadow panels)
  for (const bx of [17.75, 20.25]) kit.box('dockRubber', 0.5, 0.32, 0.22, bx, 0.55, -0.29);
  kit.box('canopySteel', 4.3, 0.12, 1.5, 19, 2.78, -0.92);
  kit.box('snow', 4.24, 0.08, 1.44, 19, 2.88, -0.92, { cast: false });
  kit.box('soffitShadow', 4.2, 0.012, 1.4, 19, 2.712, -0.9, { cast: false, receive: false });
  kit.box('canopySteel', 1.8, 0.1, 1.05, 26.5, 2.5, -0.7);
  kit.box('snow', 1.74, 0.07, 1.0, 26.5, 2.59, -0.7, { cast: false });
  kit.box('soffitShadow', 1.7, 0.012, 0.96, 26.5, 2.442, -0.68, { cast: false, receive: false });
  // signage over the shutter + dock
  const sign = (mat, w, h, x, y2, z) => {
    const g = new THREE.BoxGeometry(w, h, 0.06);
    g.translate(x, y2, z);
    kit.add(mat, g, { uv: 0, cast: false });
  };
  sign('signGarage', 3.2, 0.52, 7, 3.16, -0.2);
  sign('signLoading', 2.6, 0.46, 19, 3.12, -0.2);
  // bollards guarding the openings
  for (const bx of [4.3, 9.7, 14.9, 23.1]) bollard(kit, bx, -0.75);
}

function courtyard(map, kit) {
  // shovelled walk: door → bench loop (concrete pavers under thin snow)
  groundOverlay(kit, 'apronConcrete', -2.7, 9.4, -0.7, 29.2, 0.018);
  groundOverlay(kit, 'apronConcrete', -6.2, 17.7, -2.7, 19.6, 0.018);
  bench(kit, -6.8, 18.6, false);
  // planters along the building wall
  for (const pz of [10.6, 24.6]) {
    kit.box('planterShell', 0.5, 0.5, 1.25, -1.05, 0.25, pz);
    kit.box('trimDark', 0.54, 0.05, 1.29, -1.05, 0.475, pz, { cast: false });
    kit.box('planterSoil', 0.4, 0.04, 1.15, -1.05, 0.44, pz, { cast: false });
    kit.box('snow', 0.42, 0.05, 0.5, -1.05, 0.47, pz + 0.3, { cast: false });
    kit.collide(-1.3, 0, pz - 0.625, -0.8, 0.5, pz + 0.625, { tag: 'planter', material: 'metal', blockSight: false });
  }
  // ash bin near the smokers bench
  kit.cyl('bollardMetal', 0.13, 0.13, 0.62, -1.1, 0, 16.4, { seg: 10 });
  kit.cyl('trimDark', 0.135, 0.135, 0.05, -1.1, 0.62, 16.4, { cast: false, seg: 10 });
  kit.collide(-1.23, 0, 16.27, -0.97, 0.66, 16.53, { tag: 'bin', material: 'metal', blockSight: false, blockShot: false });
  // drift mounds in the corners
  const mound = (x, z, r, h) => {
    const geo = new THREE.SphereGeometry(r, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2);
    geo.scale(1, h / r, 1);
    geo.translate(x, 0.01, z);
    kit.add('snow', geo, { cast: false });
  };
  mound(-6.6, 9.6, 1.6, 0.4); mound(-6.8, 28.4, 1.8, 0.42); mound(-1.6, 21.8, 1.2, 0.26);
}

// ---------------------------------------------------------------------------
// Distant surroundings: silhouette blocks with lit-window grids + treeline (fog does the rest)
// ---------------------------------------------------------------------------
export function buildSurroundings(map, kit) {
  const blocks = [
    [-46, -30, 26, 14], [-20, -44, 30, 22], [30, -52, 34, 18], [78, -20, 22, 26],
    [92, 20, 28, 20], [80, 62, 36, 16], [30, 82, 40, 22], [-30, 72, 30, 18], [-52, 34, 22, 24],
    [-44, 6, 18, 30], [64, -40, 24, 34], [56, 74, 26, 28],
  ];
  let i = 0;
  for (const [x, z, w, h] of blocks) {
    const mat = i % 3 === 0 ? 'cityLit' : 'cityDark';
    const geo = new THREE.BoxGeometry(w, h, w * 0.8);
    geo.translate(x, h / 2 - 0.3, z);
    // the cityShell canvas holds an 8x8 window grid per repeat → ~21 m tile puts windows at a
    // believable 2.6 m storey pitch (uv 2.9 tiled the whole grid every 2.9 m: dollhouse windows)
    kit.add(mat, geo, { uv: 21, cast: false });
    kit.box('snow', w + 0.3, 0.5, w * 0.8 + 0.3, x, h - 0.1, z, { cast: false }); // roof snow
    i++;
  }
  // treeline ring
  for (let k = 0; k < 30; k++) {
    const a = (k / 30) * Math.PI * 2;
    const r = 60 + (k % 5) * 8;
    const tx = 24 + Math.cos(a) * r;
    const tz = 18 + Math.sin(a) * r * 0.82;
    const th = 6.5 + (k % 4) * 2;
    kit.cyl('treeTrunk', 0.22, 0.3, 1.6, tx, -0.2, tz, { cast: false, seg: 6 });
    const cone = new THREE.ConeGeometry(1.9 + (k % 3) * 0.5, th, 7);
    cone.translate(tx, th / 2 + 1.1, tz);
    kit.add('treeSnowy', cone, { cast: false });
    const cap = new THREE.ConeGeometry(0.9 + (k % 3) * 0.2, th * 0.34, 7);
    cap.translate(tx, th * 0.82 + 1.1, tz);
    kit.add('snow', cap, { cast: false });
  }
}
