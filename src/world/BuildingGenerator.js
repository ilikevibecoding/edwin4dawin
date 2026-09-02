import * as THREE from 'three';
import { box, plane, cylinder, sphere, extrudeProfile, setVertexColor, placement, polygon } from './geo.js';
import { makeRng, smoothstep } from './util.js';
import { SIDEWALK_H } from './layout.js';
import { PATCH_SIZE } from './materials.js';
import { addWetPatch } from './Ground.js';

export const FLOOR_H = 3.3;
const T = 0.45; // wall thickness
const RECESS = 0.24; // window recess depth
const GROUND_Y = SIDEWALK_H; // doors/sills sit on the sidewalk level

/**
 * Facade styles: wall texture + tint (vertex color multiplier), optional exposed-stone ground floor,
 * paint colors for shutters/frames/doors, roof set. Tints multiply the (already colored) textures,
 * so values > 1 brighten.
 */
export const STYLES = {
  ochre_stone: { wall: 'clay_plaster', tint: [1.08, 0.92, 0.66], groundStone: 'sandstone', quoins: true, shutter: [0.22, 0.34, 0.26], frame: [1.7, 1.62, 1.45], door: [0.55, 0.36, 0.22], roof: 'roofTiles' },
  stone_house: { wall: 'rustic', tint: [1.0, 0.97, 0.92], groundStone: null, quoins: false, shutter: [0.42, 0.3, 0.2], frame: [0.55, 0.4, 0.28], door: [0.5, 0.33, 0.2], roof: 'roofTiles', stoneSurround: true },
  white_blue: { wall: 'plastered_wall_02', tint: [1.2, 1.18, 1.12], groundStone: 'stoneBlocks', quoins: true, shutter: [0.2, 0.42, 0.75], frame: [0.3, 0.5, 0.85], door: [0.25, 0.42, 0.72], roof: 'roofTiles', stoneSurround: true },
  pink: { wall: 'beige_wall_002', tint: [1.35, 0.98, 0.9], groundStone: null, quoins: true, shutter: [0.38, 0.33, 0.28], frame: [1.7, 1.66, 1.6], door: [0.4, 0.28, 0.18], roof: 'roofTiles' },
  yellow: { wall: 'beige_wall_001', tint: [1.3, 1.12, 0.78], groundStone: 'sandstone', quoins: false, shutter: [0.25, 0.33, 0.3], frame: [1.7, 1.66, 1.6], door: [0.35, 0.25, 0.16], roof: 'roofTiles' },
  // painted_plaster_wall scans grey-mauve; the warm tints below pull it to cream so it never reads lilac in shade.
  beige: { wall: 'painted_plaster_wall', tint: [1.16, 1.06, 0.88], groundStone: 'stoneBlocks', quoins: true, shutter: [0.5, 0.36, 0.24], frame: [1.6, 1.55, 1.45], door: [0.45, 0.3, 0.18], roof: 'roofTilesOld' },
  // The café front faces east and sits in shade most of the day: neutral beige plaster keeps it cream there
  // (painted_plaster_wall went lilac under the blue skylight).
  cafe: { wall: 'plastered_wall_02', tint: [1.16, 1.11, 0.98], groundStone: 'stoneBlocks', quoins: true, shutter: [0.25, 0.3, 0.35], frame: [0.28, 0.3, 0.33], door: [0.62, 0.46, 0.32], roof: 'roofTiles', shop: true },
  white_green: { wall: 'white_plaster_rough_02', tint: [1.25, 1.24, 1.2], groundStone: 'sandstone', quoins: false, shutter: [0.2, 0.4, 0.3], frame: [1.7, 1.68, 1.6], door: [0.24, 0.4, 0.3], roof: 'roofTilesOld', stoneSurround: true },
};

/**
 * Build one building into the shared batcher. Everything is generated in a wall frame
 * (u along the wall, v up, +z outward, wall body in z ∈ [-T, 0]) then transformed to world space.
 * Returns { colliders: [...], balconies: [...] } for physics registration.
 */
export function buildBuilding(ctx, spec) {
  const { mats, batch } = ctx;
  const rng = makeRng(hashId(spec.id));
  const baseStyle = STYLES[spec.style] || STYLES.beige;
  // Per-building paint variation: two houses sharing a style never read as copies.
  const jit = [rng.range(0.93, 1.07), rng.range(0.95, 1.05), rng.range(0.93, 1.07)];
  const style = { ...baseStyle, tint: baseStyle.tint.map((c, i) => c * jit[i]) };
  const floors = spec.floors;
  const H = floors * FLOOR_H + 0.35; // wall height to the eave
  const { w, d } = spec;
  const M = placement(spec.x, 0, spec.z, spec.rot);
  const plain = !!spec.plain;

  const wallMat = style.wall === 'rustic' ? mats.rusticStone : mats.wall(style.wall);
  const stoneMat = style.groundStone ? mats[style.groundStone] : null;
  const stoneTop = stoneMat ? FLOOR_H + 0.2 : 0;
  const roofMat = mats[style.roof] || mats.roofTiles;
  const results = { colliders: [], balconies: [], ivy: [] };

  // Grime: darker toward the base, faint dust toward the eaves (vertex colors).
  const grimeTint = (base) => (x, y) => {
    const g = 1 - 0.38 * (1 - smoothstep(GROUND_Y - 0.1, GROUND_Y + 1.7, y));
    const top = 1 - 0.06 * smoothstep(H - 3, H, y);
    return [base[0] * g * top, base[1] * g * top, base[2] * g * top];
  };
  const stoneTint = [1, 1, 1];

  /** Add a geometry defined in the wall frame `frame` (Matrix4 wall→world). */
  const addWall = (mat, geo, color, frame) => {
    if (color) setVertexColor(geo, color);
    geo.applyMatrix4(frame);
    batch.add(mat, geo, null);
  };

  const sideDetail = plain ? 'low' : 'mid';
  const sides = [
    { name: 'front', L: w, theta: 0, anchor: [0, 0, d / 2], detail: 'full' },
    { name: 'back', L: w, theta: Math.PI, anchor: [0, 0, -d / 2], detail: 'low' },
    { name: 'right', L: d - 2 * T, theta: Math.PI / 2, anchor: [w / 2, 0, 0], detail: sideDetail },
    { name: 'left', L: d - 2 * T, theta: -Math.PI / 2, anchor: [-w / 2, 0, 0], detail: sideDetail },
  ];

  const ridgeAlongX = spec.ridge ? spec.ridge === 'x' : w >= d;
  const pitch = spec.roof === 'flat' ? 0 : 24 * (Math.PI / 180);
  const overhang = 0.55;

  for (const side of sides) {
    const local = new THREE.Matrix4()
      .makeTranslation(side.anchor[0], side.anchor[1], side.anchor[2])
      .multiply(new THREE.Matrix4().makeRotationY(side.theta))
      .multiply(new THREE.Matrix4().makeTranslation(-side.L / 2, 0, 0));
    const frame = new THREE.Matrix4().multiplyMatrices(M, local);
    const openings = layoutOpenings(side, spec, style, floors, rng, plain);
    buildWallPieces(side.L, H, openings, frame, { wallMat, stoneMat, stoneTop, tint: style.tint, grimeTint, addWall, mats });
    for (const op of openings) buildOpening(op, side, frame, { style, mats, addWall, rng, plain, results, spec, M, H });
    if (side.detail !== 'low') buildFacadeLayers(side, openings, frame, H, { style, mats, addWall, rng, plain, stoneMat, stoneTop, wallMat, floors, spec });

    // Gable end wall (triangle under the roof) on the sides perpendicular to the ridge.
    if (pitch > 0) {
      const isGableSide = ridgeAlongX ? side.name === 'left' || side.name === 'right' : side.name === 'front' || side.name === 'back';
      if (isGableSide) {
        const span = (ridgeAlongX ? d : w) / 2 + overhang;
        const rise = span * Math.tan(pitch) - overhang * Math.tan(pitch);
        const prof = [
          [0, H - 0.01],
          [side.L, H - 0.01],
          [side.L / 2, H + rise - 0.02],
        ];
        const g = extrudeProfile(prof, T, { z: -T / 2 });
        addWall(wallMat, g, grimeTint(style.tint), frame);
      }
    }

    // Wall collider (split into stone base / plaster upper for impact surfaces).
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spec.rot + side.theta);
    const center = new THREE.Vector3(side.L / 2, 0, -T / 2).applyMatrix4(frame);
    const surfUpper = style.wall === 'rustic' ? 'stone' : 'plaster';
    if (stoneMat) {
      results.colliders.push({ center: new THREE.Vector3(center.x, stoneTop / 2, center.z), half: new THREE.Vector3(side.L / 2, stoneTop / 2, T / 2), quat: q, surface: 'stone' });
      results.colliders.push({ center: new THREE.Vector3(center.x, (stoneTop + H) / 2, center.z), half: new THREE.Vector3(side.L / 2, (H - stoneTop) / 2, T / 2), quat: q, surface: surfUpper });
    } else {
      results.colliders.push({ center: new THREE.Vector3(center.x, H / 2, center.z), half: new THREE.Vector3(side.L / 2, H / 2, T / 2), quat: q, surface: surfUpper });
    }

    // Drainpipes + gutter on detailed sides.
    if (!plain && side.detail !== 'low') {
      // Side pipes go at the back corner (right side: u = L is the back; left side: u = 0), so they never
      // double up with the front pipes on the same corner.
      const pipeU = side.name === 'front' ? [0.32, side.L - 0.32] : [side.name === 'right' ? side.L - 0.32 : 0.32];
      for (const u of pipeU) {
        addWall(mats.zinc, cylinder(0.055, 0.055, H - 0.25, 10, { x: u, y: (H + 0.05) / 2 + 0.1, z: 0.1 }), [1, 1, 1], frame);
        for (let y = 1.2; y < H; y += 2.6) addWall(mats.zinc, box(0.16, 0.05, 0.14, { x: u, y, z: 0.06 }), [0.8, 0.8, 0.8], frame);
        addWall(mats.zinc, cylinder(0.055, 0.055, 0.5, 10, { x: u, y: 0.2, z: 0.2, rotX: Math.PI / 2 }), [1, 1, 1], frame);
        // Run-off staining: a dark streak up the wall behind the pipe and a damp patch where the shoe spills.
        addWall(mats.grime, decalPlane(0.5, 1.6, { x: u, y: GROUND_Y + 0.8, z: 0.008, uRepeat: 0.3 }), null, frame);
        const foot = new THREE.Vector3(u, 0, 0.75).applyMatrix4(frame);
        const dir = new THREE.Vector3(0, 0, 1).transformDirection(frame);
        addWetPatch(ctx, foot.x, foot.z, 0.42, 0.62, Math.atan2(dir.x, dir.z));
      }
      if (pitch > 0) addWall(mats.zinc, cylinder(0.07, 0.07, side.L + 0.1, 10, { x: side.L / 2, y: H + 0.04, z: 0.12, rotZ: Math.PI / 2 }), [1, 1, 1], frame);
    }
  }

  // --- Quoins (alternating corner blocks) ----------------------------------------------------------
  // Flatter (6 cm proud) and toned to a sandy dressed stone so they frame the corner instead of
  // reading as bright white pillows against the plaster.
  if (style.quoins && !plain) {
    const corners = [
      [w / 2, d / 2, 1, 1],
      [-w / 2, d / 2, -1, 1],
      [w / 2, -d / 2, 1, -1],
      [-w / 2, -d / 2, -1, -1],
    ];
    const qTint = [0.88, 0.85, 0.79];
    for (const [cx, cz, sx, sz] of corners) {
      for (let y = stoneTop + 0.25, k = 0; y < H - 0.55; y += 0.5, k++) {
        const long = k % 2 === 0 ? 0.62 : 0.4;
        const short = k % 2 === 0 ? 0.4 : 0.62;
        const g1 = box(long, 0.4, 0.06, { x: cx - (sx * long) / 2 + sx * 0.03, y, z: cz + sz * 0.0 });
        const g2 = box(0.06, 0.4, short, { x: cx + sx * 0.0, y, z: cz - (sz * short) / 2 + sz * 0.03 });
        for (const g of [g1, g2]) {
          g.applyMatrix4(M);
          batch.add(mats.trimStone, g, qTint.map((c) => c * rng.range(0.94, 1.04)));
        }
      }
    }
  }

  // --- String course between stone ground floor and plaster ------------------------------------
  if (stoneMat) {
    for (const side of sides) {
      const local = new THREE.Matrix4()
        .makeTranslation(side.anchor[0], 0, side.anchor[2])
        .multiply(new THREE.Matrix4().makeRotationY(side.theta))
        .multiply(new THREE.Matrix4().makeTranslation(-side.L / 2, 0, 0));
      const frame = new THREE.Matrix4().multiplyMatrices(M, local);
      const ext = side.name === 'front' || side.name === 'back' ? 0.12 : -0.0;
      addWall(mats.trimStone, box(side.L + 2 * ext, 0.14, 0.14, { x: side.L / 2, y: stoneTop + 0.07, z: 0.0 }), [1, 1, 1], frame);
    }
  }

  // --- Roof --------------------------------------------------------------------------------------
  if (pitch > 0) buildGableRoof(spec, H, ridgeAlongX, pitch, overhang, { mats, batch, roofMat, style, rng, results, M, plain });
  else buildFlatRoof(spec, H, { mats, batch, style, rng, results, M, plain });

  return results;
}

function hashId(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Window/door layout for one side in wall coordinates (u along the wall, v up). */
function layoutOpenings(side, spec, style, floors, rng, plain) {
  const L = side.L;
  const ops = [];
  const margin = 1.15;
  if (L < 2 * margin + 0.8) return ops;
  const n = Math.max(1, Math.round((L - 2 * margin) / 2.75) + 1);
  const spacing = n > 1 ? (L - 2 * margin) / (n - 1) : 0;
  const isFront = side.name === 'front';
  const balconyFloor = spec.balcony === 'iron_top' ? floors - 1 : 1;
  const doorBay = isFront ? Math.round((spec.door ?? 0.5) * (n - 1)) : side.detail === 'mid' && rng.chance(0.4) ? rng.int(0, n - 1) : -1;
  const balconyBays = new Set();
  if (isFront && spec.balcony && floors > 1) {
    if (spec.balcony === 'loggia') for (let i = 0; i < n; i++) balconyBays.add(i);
    else if (n >= 3) {
      balconyBays.add(1);
      if (n >= 5) balconyBays.add(n - 2);
    } else balconyBays.add(0);
  } else if (side.detail === 'mid' && spec.balcony && spec.balcony !== 'loggia' && floors > 1 && n >= 2 && !plain) {
    balconyBays.add(rng.int(0, n - 1));
  }

  for (let f = 0; f < floors; f++) {
    const base = f * FLOOR_H + GROUND_Y;
    for (let i = 0; i < n; i++) {
      const u = margin + i * spacing;
      if (f === 0) {
        if (i === doorBay) {
          const arch = spec.arch || style.stoneSurround || rng.chance(0.5);
          ops.push({ kind: 'door', u0: u - 0.75, u1: u + 0.75, v0: base, v1: base + (arch ? 2.95 : 2.55), arch, bay: i });
        } else if (style.shop && isFront) {
          ops.push({ kind: 'shop', u0: u - 1.05, u1: u + 1.05, v0: base + 0.55, v1: base + 2.65, bay: i });
        } else {
          ops.push({ kind: 'win', u0: u - 0.55, u1: u + 0.55, v0: base + 1.05, v1: base + 2.6, floor: 0, grille: true, bay: i });
        }
      } else if (f === balconyFloor && balconyBays.has(i)) {
        ops.push({ kind: 'bdoor', u0: u - 0.6, u1: u + 0.6, v0: base + 0.02, v1: base + 2.35, floor: f, bay: i, loggia: spec.balcony === 'loggia', balconyStyle: spec.balcony });
      } else {
        ops.push({ kind: 'win', u0: u - 0.5, u1: u + 0.5, v0: base + 0.95, v1: base + 2.4, floor: f, bay: i });
      }
    }
  }
  return ops;
}

/** Wall body as boxes around the openings (true recesses), band-split so ground floor can be stone. */
function buildWallPieces(L, H, openings, frame, o) {
  const cuts = new Set([0, H]);
  if (o.stoneTop > 0) cuts.add(o.stoneTop);
  for (const op of openings) {
    cuts.add(op.v0);
    cuts.add(op.v1);
  }
  const ys = [...cuts].filter((y) => y >= 0 && y <= H).sort((a, b) => a - b);
  for (let bi = 0; bi < ys.length - 1; bi++) {
    const ya = ys[bi];
    const yb = ys[bi + 1];
    if (yb - ya < 1e-4) continue;
    const inBand = openings.filter((op) => op.v0 <= ya + 1e-6 && op.v1 >= yb - 1e-6).sort((a, b) => a.u0 - b.u0);
    const mat = o.stoneMat && yb <= o.stoneTop + 1e-6 ? o.stoneMat : o.wallMat;
    const color = mat === o.wallMat ? o.grimeTint(o.tint) : o.grimeTint([1, 1, 1]);
    let u = 0;
    const pieces = [];
    for (const op of inBand) {
      if (op.u0 > u + 1e-4) pieces.push([u, op.u0]);
      u = Math.max(u, op.u1);
    }
    if (u < L - 1e-4) pieces.push([u, L]);
    for (const [u0, u1] of pieces) {
      const g = box(u1 - u0, yb - ya, T, { x: (u0 + u1) / 2, y: (ya + yb) / 2, z: -T / 2 });
      o.addWall(mat, g, color, frame);
    }
  }
}

/**
 * Decal quad facing +Z with v ∈ [0,1] over its height (alpha maps are authored bottom-opaque → top-clear)
 * and u repeating every `1/uRepeat` of the width. `flip` puts the opaque end at the top (streaks).
 */
function decalPlane(w, h, { x = 0, y = 0, z = 0, uRepeat = 1, flip = false } = {}) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * uRepeat, flip ? 1 - uv.getY(i) : uv.getY(i));
  g.translate(x, y, z);
  return g;
}

/** u-intervals of the wall free of any opening that intersects the vertical band [y0, y1] (margin m). */
function bandPieces(L, openings, y0, y1, m = 0.08) {
  const hits = openings.filter((op) => op.v1 + m > y0 && op.v0 - m < y1).sort((a, b) => a.u0 - b.u0);
  const out = [];
  let u = 0;
  for (const op of hits) {
    if (op.u0 - m > u + 1e-3) out.push([u, op.u0 - m]);
    u = Math.max(u, op.u1 + m);
  }
  if (u < L - 1e-3) out.push([u, L]);
  return out;
}

/**
 * Second-layer facade detail (all sides except the hidden backs): cornice under the eaves, floor string
 * courses, a cement skirting on plaster-only facades, a splash-zone grime band, chipped-plaster brick
 * patches, and the café fascia sign / street plaques. Everything is thin geometry or alpha decals with
 * polygonOffset, batched into the existing materials.
 */
function buildFacadeLayers(side, openings, frame, H, o) {
  const { style, mats, addWall, rng, plain, stoneMat, stoneTop, floors, spec } = o;
  const L = side.L;
  const isFront = side.name === 'front';
  const detailed = !plain;
  const stone = [0.93, 0.9, 0.85];
  // Side walls are T shorter at each end than the building; run their bands out to the corners.
  const ext = isFront || side.name === 'back' ? 0 : T;
  const extend = ([u0, u1]) => [u0 <= 1e-3 ? -ext : u0, u1 >= L - 1e-3 ? L + ext : u1];

  // Cornice: dressed-stone band just under the soffit, proud of the wall (roof fascia is at H - 0.1).
  addWall(mats.trimStone, box(L + 2 * ext + 0.3, 0.24, 0.14, { x: L / 2, y: H - 0.34, z: 0.07 }), stone, frame);
  addWall(mats.trimStone, box(L + 2 * ext + 0.22, 0.08, 0.08, { x: L / 2, y: H - 0.5, z: 0.04 }), stone.map((c) => c * 0.96), frame);

  // Floor string courses (skip the level already marked by the stone base's course).
  for (let f = 1; f < floors; f++) {
    const y = f * FLOOR_H + GROUND_Y + 0.05;
    if (stoneMat && Math.abs(y - stoneTop) < 0.3) continue;
    for (const [u0, u1] of bandPieces(L, openings, y - 0.06, y + 0.06, 0.02).map(extend)) {
      if (u1 - u0 < 0.3) continue;
      addWall(mats.trimStone, box(u1 - u0, 0.12, 0.06, { x: (u0 + u1) / 2, y, z: 0.03 }), stone, frame);
    }
  }

  // Skirting (cement plinth band) on facades with no stone ground floor, split around doors/shopfronts.
  const skirtH = 0.5;
  if (!stoneMat) {
    for (const [u0, u1] of bandPieces(L, openings, GROUND_Y, GROUND_Y + skirtH, 0.12).map(extend)) {
      if (u1 - u0 < 0.15) continue;
      addWall(mats.concrete, box(u1 - u0, skirtH, 0.035, { x: (u0 + u1) / 2, y: GROUND_Y + skirtH / 2, z: 0.0175 }), [0.66, 0.64, 0.6], frame);
    }
  }

  // Splash-zone grime: dark band fading upward from the skirting / pavement, split around openings.
  const gy0 = stoneMat ? GROUND_Y : GROUND_Y + skirtH;
  const gh = stoneMat ? 0.9 : 0.75;
  for (const [u0, u1] of bandPieces(L, openings, gy0, gy0 + gh, 0.05).map(extend)) {
    if (u1 - u0 < 0.2) continue;
    addWall(mats.grime, decalPlane(u1 - u0, gh, { x: (u0 + u1) / 2, y: gy0 + gh / 2, z: 0.006, uRepeat: (u1 - u0) / gh }), null, frame);
  }

  // Chipped plaster revealing brick (plaster facades only; never over an opening or another patch).
  if (detailed && style.wall !== 'rustic') {
    const n = rng.int(isFront ? 1 : 0, isFront ? 3 : 2);
    const placed = [];
    const [pw, ph] = PATCH_SIZE;
    const yLow = (stoneMat ? stoneTop : GROUND_Y + skirtH) + ph * 0.5 + 0.1;
    for (let i = 0; i < n; i++) {
      for (let tries = 0; tries < 14; tries++) {
        const s = rng.range(0.7, 1.15);
        const hw = (pw * s) / 2;
        const hh = (ph * s) / 2;
        const u = rng.range(hw + 0.8, L - hw - 0.8); // clear of the corner quoins, which would slice the blob
        // Mostly low (base damage), occasionally high under a sill.
        const v = rng.chance(0.75) ? rng.range(yLow, Math.min(H - 1, yLow + 1.4)) : rng.range(yLow, H - 1.0);
        const rect = { u0: u - hw, u1: u + hw, v0: v - hh, v1: v + hh };
        const hit = [...openings, ...placed].some((r) => r.u0 - 0.12 < rect.u1 && r.u1 + 0.12 > rect.u0 && r.v0 - 0.12 < rect.v1 && r.v1 + 0.12 > rect.v0);
        if (hit || rect.v1 > H - 0.6) continue;
        placed.push(rect);
        const g = new THREE.PlaneGeometry(pw * s, ph * s);
        if (rng.chance(0.5)) {
          const uv = g.attributes.uv;
          for (let k = 0; k < uv.count; k++) uv.setX(k, 1 - uv.getX(k));
        }
        g.rotateZ(rng.range(-0.12, 0.12));
        g.translate(u, v, 0.005);
        addWall(mats.brickPatch, g, null, frame);
        break;
      }
    }
  }

  // Service clutter on the fronts: a black cable clipped along the facade just above the ground-floor
  // lintels, and on some gable-roofed houses a satellite dish on a short mast at the eave.
  if (detailed && isFront) {
    const cy = GROUND_Y + 2.98;
    const dark = [0.08, 0.08, 0.08];
    addWall(mats.iron, cylinder(0.011, 0.011, L, 4, { x: L / 2, y: cy, z: 0.03, rotZ: Math.PI / 2, open: true }), dark, frame);
    for (let u = 0.9; u < L - 0.5; u += 2.3) addWall(mats.iron, box(0.04, 0.05, 0.04, { x: u, y: cy, z: 0.02 }), dark, frame);
    const eaveFront = spec.roof !== 'flat' && (spec.ridge ? spec.ridge === 'x' : spec.w >= spec.d); // not a gable end
    if (eaveFront && rng.chance(0.5)) {
      // Mast 0.7 m in from the wall line so the dish sits low against the tiles (roof top there is
      // ≈ H + 0.68 for the 24° pitch) instead of floating against the sky beyond the eave.
      const du = rng.chance(0.5) ? 1.6 : L - 1.6;
      const ry = H + 0.46;
      const tilt = Math.PI / 2 - 0.6;
      addWall(mats.iron, cylinder(0.035, 0.035, 0.7, 6, { x: du, y: ry + 0.3, z: -0.7 }), dark, frame);
      addWall(mats.paintedMetal, cylinder(0.36, 0.32, 0.035, 14, { x: du, y: ry + 0.62, z: -0.55, rotX: -tilt }), [0.86, 0.86, 0.84], frame);
      addWall(mats.iron, cylinder(0.012, 0.012, 0.34, 4, { x: du, y: ry + 0.5, z: -0.4, rotX: -tilt + 0.95, open: true }), dark, frame);
    }
  }

  // Café fascia sign over the shopfront, centred on the door bay; street plaques on a few corners.
  if (style.shop && isFront) {
    const door = openings.find((op) => op.kind === 'door');
    const uc = door ? (door.u0 + door.u1) / 2 : L / 2;
    const sw = 3.0; // narrow enough to clear the neighbouring balcony slabs
    const sh = 0.62;
    const sy = FLOOR_H + GROUND_Y + 0.28; // between awning bar and first-floor sills
    addWall(mats.paint, box(sw + 0.1, sh + 0.1, 0.06, { x: uc, y: sy, z: 0.03 }), [0.22, 0.2, 0.18], frame);
    const g = new THREE.PlaneGeometry(sw, sh);
    g.translate(uc, sy, 0.065);
    addWall(mats.signCafe, g, null, frame);
    // Two small downlights on the board.
    for (const s of [-1, 1]) {
      addWall(mats.iron, cylinder(0.02, 0.02, 0.35, 6, { x: uc + s * (sw / 2 - 0.4), y: sy + sh / 2 + 0.2, z: 0.2, rotX: Math.PI / 2 }), [1, 1, 1], frame);
      addWall(mats.iron, cylinder(0.06, 0.04, 0.12, 8, { x: uc + s * (sw / 2 - 0.4), y: sy + sh / 2 + 0.14, z: 0.36 }), [1, 1, 1], frame);
    }
  }
  if (isFront && spec.plaque) {
    // Above the first/last ground-floor window, between the string course and the first-floor sills
    // (clear of the drainpipe at the corner, the balcony slab and the facade cable).
    const u = spec.plaque === 'left' ? 1.15 : L - 1.15;
    const py = 3.85;
    const g = new THREE.PlaneGeometry(0.62, 0.31);
    g.translate(u, py, 0.03);
    addWall(mats.paint, box(0.64, 0.33, 0.03, { x: u, y: py, z: 0.012 }), [0.75, 0.75, 0.72], frame);
    addWall(mats.streetPlaque, g, null, frame);
  }
}

/** Window / door / balcony contents for one opening (wall frame). */
function buildOpening(op, side, frame, o) {
  const { style, mats, addWall, rng, plain, spec } = o;
  const uc = (op.u0 + op.u1) / 2;
  const wo = op.u1 - op.u0;
  const ho = op.v1 - op.v0;
  const frameCol = style.frame;
  const isFront = side.name === 'front';
  const detailed = !plain && side.detail !== 'low';

  if (op.kind === 'door') {
    // Arch infill above the springline (wall material) makes the opening arched.
    if (op.arch) {
      const r = wo / 2;
      const ys = op.v1 - r;
      const prof = [[op.u0, ys], [op.u0, op.v1 + 0.001], [op.u1, op.v1 + 0.001], [op.u1, ys]];
      for (let i = 1; i < 16; i++) {
        const a = (i / 16) * Math.PI;
        prof.push([uc + Math.cos(a) * r, ys + Math.sin(a) * r]);
      }
      const mat = style.groundStone ? mats[style.groundStone] : style.wall === 'rustic' ? mats.rusticStone : mats.wall(style.wall);
      addWall(mat, extrudeProfile(prof, T, { z: -T / 2 }), style.groundStone || style.wall === 'rustic' ? [1, 1, 1] : style.tint, frame);
      // Stone voussoir arch + jambs.
      const arch = [];
      for (let i = 0; i <= 18; i++) arch.push([uc + Math.cos((i / 18) * Math.PI) * (r + 0.24), ys + Math.sin((i / 18) * Math.PI) * (r + 0.24)]);
      for (let i = 18; i >= 0; i--) arch.push([uc + Math.cos((i / 18) * Math.PI) * (r + 0.01), ys + Math.sin((i / 18) * Math.PI) * (r + 0.01)]);
      addWall(mats.trimStone, extrudeProfile(arch, 0.07, { z: 0.005 }), [1.05, 1.02, 0.98], frame);
      addWall(mats.trimStone, box(0.24, ys - op.v0, 0.07, { x: op.u0 - 0.12, y: (ys + op.v0) / 2, z: 0.005 }), [1.05, 1.02, 0.98], frame);
      addWall(mats.trimStone, box(0.24, ys - op.v0, 0.07, { x: op.u1 + 0.12, y: (ys + op.v0) / 2, z: 0.005 }), [1.05, 1.02, 0.98], frame);
      // Fanlight (dark glass) in the arch, door leaves below.
      const fan = [[op.u0 + 0.05, ys]];
      for (let i = 0; i <= 12; i++) fan.push([uc + Math.cos((i / 12) * Math.PI) * (r - 0.05), ys + Math.sin((i / 12) * Math.PI) * (r - 0.05)]);
      addWall(mats.glass, extrudeProfile(fan, 0.03, { z: -0.3 }), null, frame);
      addWall(mats.interior, plane(wo, r + 0.1, { x: uc, y: ys + r / 2, z: -0.4 }), null, frame);
      addWall(mats.paint, box(wo - 0.06, 0.08, 0.08, { x: uc, y: ys, z: -0.3 }), style.door, frame);
    } else {
      addWall(mats.trimStone, box(wo + 0.5, 0.24, 0.08, { x: uc, y: op.v1 + 0.12, z: 0.0 }), [1.05, 1.02, 0.98], frame);
      addWall(mats.trimStone, box(0.22, ho, 0.07, { x: op.u0 - 0.11, y: (op.v0 + op.v1) / 2, z: 0.005 }), [1.05, 1.02, 0.98], frame);
      addWall(mats.trimStone, box(0.22, ho, 0.07, { x: op.u1 + 0.11, y: (op.v0 + op.v1) / 2, z: 0.005 }), [1.05, 1.02, 0.98], frame);
    }
    const leafH = op.arch ? op.v1 - wo / 2 - op.v0 - 0.04 : ho - 0.04;
    // Heavy wooden double door, recessed 0.3 m, with panel rails and iron studs.
    addWall(mats.woodBrown, box(wo - 0.04, leafH, 0.08, { x: uc, y: op.v0 + leafH / 2, z: -0.32 }), style.door, frame);
    addWall(mats.woodBrown, box(0.05, leafH - 0.1, 0.03, { x: uc, y: op.v0 + leafH / 2, z: -0.27 }), style.door.map((c) => c * 0.8), frame);
    for (const yy of [0.35, leafH * 0.5, leafH - 0.3]) addWall(mats.woodBrown, box(wo - 0.1, 0.09, 0.03, { x: uc, y: op.v0 + yy, z: -0.27 }), style.door.map((c) => c * 0.8), frame);
    addWall(mats.iron, sphere(0.035, { x: uc - 0.12, y: op.v0 + 1.05, z: -0.24, seg: 8 }), [1, 1, 1], frame);
    addWall(mats.iron, sphere(0.035, { x: uc + 0.12, y: op.v0 + 1.05, z: -0.24, seg: 8 }), [1, 1, 1], frame);
    // Threshold step (12 cm, climbable) and wall lamp.
    addWall(mats.trimStone, box(wo + 0.5, 0.1, 0.5, { x: uc, y: op.v0 + 0.05, z: 0.1 }), [0.95, 0.94, 0.9], frame);
    if (detailed) {
      // Coir doormat on the step (colour varies house to house) — small eye-height cue that someone lives here.
      const matCol = rng.pick([[0.34, 0.2, 0.11], [0.16, 0.13, 0.1], [0.3, 0.26, 0.18]]);
      addWall(mats.paint, box(Math.min(wo - 0.1, 0.78), 0.02, 0.42, { x: uc, y: op.v0 + 0.11, z: 0.06 }), matCol, frame);
      const lampU = op.u1 + 0.55;
      addWall(mats.iron, box(0.05, 0.05, 0.32, { x: lampU, y: op.v0 + 2.55, z: 0.16 }), [1, 1, 1], frame);
      addWall(mats.iron, box(0.2, 0.32, 0.2, { x: lampU, y: op.v0 + 2.37, z: 0.3 }), [1, 1, 1], frame);
      addWall(mats.lampGlass, box(0.15, 0.24, 0.15, { x: lampU, y: op.v0 + 2.37, z: 0.3 }), null, frame);
      addWall(mats.iron, box(0.24, 0.04, 0.24, { x: lampU, y: op.v0 + 2.55, z: 0.3 }), [1, 1, 1], frame);
    }
    return;
  }

  if (op.kind === 'shop') {
    // Café shopfront: big window in a dark painted frame (four bars + centre mullion), awning above,
    // menu board on the wall. Glass sits just behind the frame, lit interior plane deeper in the wall.
    const vc = (op.v0 + op.v1) / 2;
    const fw = 0.12;
    addWall(mats.paint, box(wo + 0.24, fw, 0.1, { x: uc, y: op.v1 + 0.06, z: -0.1 }), frameCol, frame);
    addWall(mats.paint, box(wo + 0.24, fw, 0.1, { x: uc, y: op.v0 - 0.06, z: -0.1 }), frameCol, frame);
    addWall(mats.paint, box(fw, ho, 0.1, { x: op.u0 - 0.06, y: vc, z: -0.1 }), frameCol, frame);
    addWall(mats.paint, box(fw, ho, 0.1, { x: op.u1 + 0.06, y: vc, z: -0.1 }), frameCol, frame);
    addWall(mats.paint, box(0.06, ho, 0.06, { x: uc, y: vc, z: -0.1 }), frameCol, frame);
    addWall(mats.glass, plane(wo, ho, { x: uc, y: vc, z: -0.14 }), null, frame);
    // Lit café interior behind the glass (the building shell is hollow and would read as a black void).
    addWall(mats.interior, plane(wo + 0.2, ho + 0.2, { x: uc, y: vc, z: -0.38 }), null, frame);
    addWall(mats.trimStone, box(wo + 0.4, 0.1, 0.3, { x: uc, y: op.v0 - 0.05, z: -0.05 }), [1, 1, 1], frame);
    if (spec.awning && isFront) {
      const aw = wo + 0.9;
      const depth = 1.7;
      const tilt = 17 * (Math.PI / 180);
      const y0 = op.v1 + 0.28;
      addWall(mats.canvasStripe, box(aw, 0.03, depth, { x: uc, y: y0 - Math.sin(tilt) * depth * 0.5, z: Math.cos(tilt) * depth * 0.5, rotX: tilt }), [1, 1, 1], frame);
      addWall(mats.canvasStripe, box(aw, 0.22, 0.03, { x: uc, y: y0 - Math.sin(tilt) * depth - 0.1, z: Math.cos(tilt) * depth }), [1, 1, 1], frame);
      for (const s of [-1, 1]) {
        addWall(mats.iron, cylinder(0.02, 0.02, depth, 6, { x: uc + (s * aw) / 2 - s * 0.03, y: y0 - Math.sin(tilt) * depth * 0.5 - 0.03, z: Math.cos(tilt) * depth * 0.5, rotX: tilt + Math.PI / 2 }), [1, 1, 1], frame);
        addWall(mats.iron, cylinder(0.02, 0.02, Math.cos(tilt) * depth, 6, { x: uc + (s * aw) / 2 - s * 0.03, y: y0 - 0.02, z: (Math.cos(tilt) * depth) / 2, rotX: Math.PI / 2 }), [1, 1, 1], frame);
      }
    }
    return;
  }

  // ---- windows & balcony doors ----
  const bal = op.kind === 'bdoor';
  const low = side.detail === 'low';
  // Frame + glass, recessed.
  const fz = -RECESS + 0.03;
  addWall(mats.paint, box(0.08, ho, 0.07, { x: op.u0 + 0.04, y: (op.v0 + op.v1) / 2, z: fz }), frameCol, frame);
  addWall(mats.paint, box(0.08, ho, 0.07, { x: op.u1 - 0.04, y: (op.v0 + op.v1) / 2, z: fz }), frameCol, frame);
  addWall(mats.paint, box(wo, 0.08, 0.07, { x: uc, y: op.v1 - 0.04, z: fz }), frameCol, frame);
  addWall(mats.paint, box(wo, 0.1, 0.07, { x: uc, y: op.v0 + 0.05, z: fz }), frameCol, frame);
  if (!low) {
    addWall(mats.paint, box(0.05, ho - 0.16, 0.05, { x: uc, y: (op.v0 + op.v1) / 2, z: fz }), frameCol, frame);
    addWall(mats.paint, box(wo - 0.16, 0.05, 0.05, { x: uc, y: op.v0 + ho * (bal ? 0.72 : 0.62), z: fz }), frameCol, frame);
  }
  addWall(mats.glass, plane(wo - 0.14, ho - 0.16, { x: uc, y: (op.v0 + op.v1) / 2, z: -RECESS - 0.02 }), null, frame);
  // Dark interior backing so the glass never reads as a hole.
  addWall(mats.interior, plane(wo, ho, { x: uc, y: (op.v0 + op.v1) / 2, z: -RECESS - 0.08 }), null, frame);

  const sill = [1.06, 1.03, 0.98];
  if (!bal) {
    addWall(mats.trimStone, box(wo + 0.28, 0.09, RECESS + 0.1, { x: uc, y: op.v0 - 0.045, z: -RECESS / 2 + 0.05 }), sill, frame);
  }
  if (low) {
    if (bal) buildBalcony(op, side, frame, o);
    return;
  }
  if (style.stoneSurround) {
    addWall(mats.trimStone, box(0.16, ho + 0.02, 0.06, { x: op.u0 - 0.08, y: (op.v0 + op.v1) / 2, z: 0.0 }), sill, frame);
    addWall(mats.trimStone, box(0.16, ho + 0.02, 0.06, { x: op.u1 + 0.08, y: (op.v0 + op.v1) / 2, z: 0.0 }), sill, frame);
    addWall(mats.trimStone, box(wo + 0.34, 0.2, 0.07, { x: uc, y: op.v1 + 0.1, z: 0.0 }), sill, frame);
  } else {
    addWall(mats.trimStone, box(wo + 0.3, 0.18, 0.06, { x: uc, y: op.v1 + 0.09, z: 0.0 }), sill, frame);
  }

  // Shutters: open (folded against the wall), closed (inside the recess) or half.
  if (detailed || isFront) {
    const state = op.kind === 'bdoor' ? 'open' : rng.pick(['open', 'open', 'closed', 'half']);
    const leafW = wo / 2 + 0.02;
    const leafH = ho - 0.06;
    const shutterLeaf = (x, z, col) => {
      // Louvres live in the shutter texture; rails and stiles (2 mm proud) frame the leaf so it reads as a
      // built panel instead of a textured slab.
      const yc = (op.v0 + op.v1) / 2;
      const rail = col.map((c) => c * 0.88);
      addWall(mats.shutter, box(leafW, leafH, 0.035, { x, y: yc, z }), col, frame);
      addWall(mats.paint, box(leafW, 0.09, 0.045, { x, y: op.v1 - 0.075, z }), rail, frame);
      addWall(mats.paint, box(leafW, 0.11, 0.045, { x, y: op.v0 + 0.03 + 0.055, z }), rail, frame);
      for (const s of [-1, 1]) addWall(mats.paint, box(0.06, leafH, 0.045, { x: x + s * (leafW / 2 - 0.03), y: yc, z }), rail, frame);
    };
    const openL = () => shutterLeaf(op.u0 - leafW / 2 - 0.02, 0.03, style.shutter);
    const openR = () => shutterLeaf(op.u1 + leafW / 2 + 0.02, 0.03, style.shutter);
    const closedL = () => shutterLeaf(op.u0 + leafW / 2 - 0.02, -0.06, style.shutter);
    const closedR = () => shutterLeaf(op.u1 - leafW / 2 + 0.02, -0.06, style.shutter);
    if (state === 'open') {
      openL();
      openR();
    } else if (state === 'closed') {
      closedL();
      closedR();
    } else {
      openL();
      closedR();
    }
  }

  // Ground-floor security grille.
  if (op.grille && detailed && isFront) {
    for (let x = op.u0 + 0.16; x < op.u1 - 0.05; x += 0.16) addWall(mats.iron, cylinder(0.012, 0.012, ho - 0.05, 4, { x, y: (op.v0 + op.v1) / 2, z: -0.05, open: true }), [1, 1, 1], frame);
    for (const yy of [op.v0 + 0.35, op.v1 - 0.35]) addWall(mats.iron, box(wo - 0.04, 0.03, 0.03, { x: uc, y: yy, z: -0.05 }), [1, 1, 1], frame);
  }

  // Grime streaks under the sill (alpha decal, flipped so the dark end is at the top).
  if (detailed && !bal && rng.chance(0.75)) {
    const gh = 0.9 + rng.range(0, 0.5);
    addWall(mats.grime, decalPlane(wo + 0.25, gh, { x: uc, y: op.v0 - 0.05 - gh / 2, z: 0.006, uRepeat: (wo + 0.25) / gh, flip: true }), null, frame);
  }

  // Balcony structure.
  if (bal) buildBalcony(op, side, frame, o);

  // Occasional AC unit beside upper-floor windows on side walls.
  if (detailed && !isFront && op.floor > 0 && rng.chance(0.25)) {
    const ux = op.u1 + 0.75;
    if (ux < side.L - 0.6) {
      addWall(mats.paintedMetal, box(0.78, 0.55, 0.3, { x: ux, y: op.v0 + 0.3, z: 0.15 }), [0.9, 0.9, 0.88], frame);
      addWall(mats.iron, box(0.7, 0.04, 0.3, { x: ux, y: op.v0 + 0.0, z: 0.15 }), [1, 1, 1], frame);
    }
  }
}

function buildBalcony(op, side, frame, o) {
  const { mats, addWall, results, spec, rng } = o;
  const uc = (op.u0 + op.u1) / 2;
  const isWood = op.balconyStyle === 'wood' || op.loggia;
  const depth = op.loggia ? 1.45 : 1.0;
  const bw = op.loggia ? side.L - 2.2 : (op.u1 - op.u0) + 1.0;
  const bx = op.loggia ? side.L / 2 : uc;
  const y0 = op.v0 - 0.02; // slab top
  const slabT = 0.16;

  if (op.loggia && op.bay !== 0) {
    // Only the first bay emits the shared loggia structure; other bays just get their doors.
    return;
  }

  // Slab + corbels
  if (isWood) {
    addWall(mats.woodBrown, box(bw, slabT, depth, { x: bx, y: y0 - slabT / 2, z: depth / 2 }), [0.62, 0.5, 0.38], frame);
    const n = Math.max(2, Math.round(bw / 1.3));
    for (let i = 0; i < n; i++) {
      const x = bx - bw / 2 + 0.2 + (i * (bw - 0.4)) / (n - 1);
      addWall(mats.woodBrown, box(0.14, 0.2, depth - 0.1, { x, y: y0 - slabT - 0.1, z: (depth - 0.1) / 2 }), [0.5, 0.4, 0.3], frame);
    }
  } else {
    addWall(mats.trimStone, box(bw, slabT, depth, { x: bx, y: y0 - slabT / 2, z: depth / 2 }), [1.02, 1.0, 0.96], frame);
    addWall(mats.trimStone, box(bw + 0.06, 0.06, depth + 0.03, { x: bx, y: y0 - 0.03, z: depth / 2 + 0.015 }), [1.02, 1.0, 0.96], frame);
    for (const s of [-1, 1]) addWall(mats.trimStone, box(0.22, 0.34, depth - 0.15, { x: bx + s * (bw / 2 - 0.3), y: y0 - slabT - 0.17, z: (depth - 0.15) / 2 }), [1.0, 0.98, 0.94], frame);
  }

  // Railing
  const railH = 1.02;
  const zf = depth - 0.06;
  if (isWood) {
    const col = [0.55, 0.42, 0.3];
    const dark = [0.4, 0.3, 0.2];
    // Posts, hand rail, bottom rail, turned balusters.
    const posts = [bx - bw / 2 + 0.07, bx + bw / 2 - 0.07];
    if (op.loggia) for (let x = posts[0] + 2.6; x < posts[1] - 1.0; x += 2.6) posts.push(x);
    for (const x of posts) addWall(mats.woodBrown, box(0.14, op.loggia ? 2.85 : railH + 0.08, 0.14, { x, y: y0 + (op.loggia ? 2.85 : railH + 0.08) / 2, z: zf }), dark, frame);
    addWall(mats.woodBrown, box(bw, 0.07, 0.1, { x: bx, y: y0 + railH, z: zf }), col, frame);
    addWall(mats.woodBrown, box(bw, 0.06, 0.08, { x: bx, y: y0 + 0.1, z: zf }), col, frame);
    for (const s of [-1, 1]) {
      const x = bx + s * (bw / 2 - 0.05);
      addWall(mats.woodBrown, box(0.1, 0.07, depth - 0.1, { x, y: y0 + railH, z: (depth - 0.1) / 2 }), col, frame);
      addWall(mats.woodBrown, box(0.08, 0.06, depth - 0.1, { x, y: y0 + 0.1, z: (depth - 0.1) / 2 }), col, frame);
    }
    const balusterGeo = () => box(0.05, railH - 0.16, 0.05, { x: 0, y: 0, z: 0 });
    for (let x = bx - bw / 2 + 0.3; x < bx + bw / 2 - 0.2; x += 0.16) {
      const g = balusterGeo();
      g.translate(x, y0 + 0.13 + (railH - 0.16) / 2, zf);
      addWall(mats.woodBrown, g, col, frame);
    }
    for (const s of [-1, 1]) {
      for (let z = 0.25; z < depth - 0.2; z += 0.16) {
        const g = balusterGeo();
        g.translate(bx + s * (bw / 2 - 0.05), y0 + 0.13 + (railH - 0.16) / 2, z);
        addWall(mats.woodBrown, g, col, frame);
      }
    }
    if (op.loggia) {
      // Tiled canopy over the gallery, resting on the posts.
      const tilt = 22 * (Math.PI / 180);
      const cd = depth + 0.5;
      const yTop = y0 + 2.95;
      addWall(mats.roofTiles, box(bw + 0.4, 0.08, cd, { x: bx, y: yTop - Math.sin(tilt) * cd * 0.5, z: (Math.cos(tilt) * cd) / 2, rotX: tilt }), [1, 1, 1], frame);
      addWall(mats.woodBrown, box(bw + 0.4, 0.12, 0.05, { x: bx, y: yTop - Math.sin(tilt) * cd - 0.1, z: Math.cos(tilt) * cd }), dark, frame);
      addWall(mats.woodBrown, box(bw, 0.12, 0.12, { x: bx, y: yTop - Math.sin(tilt) * cd + 0.0, z: zf }), dark, frame);
      for (let x = bx - bw / 2 + 0.4; x < bx + bw / 2; x += 0.8) addWall(mats.woodBrown, box(0.08, 0.1, cd - 0.1, { x, y: yTop - Math.sin(tilt) * cd * 0.5 - 0.09, z: (Math.cos(tilt) * cd) / 2, rotX: tilt }), dark, frame);
    }
  } else {
    const col = [1, 1, 1];
    for (const s of [-1, 1]) addWall(mats.iron, box(0.04, railH, 0.04, { x: bx + s * (bw / 2 - 0.04), y: y0 + railH / 2, z: zf }), col, frame);
    addWall(mats.iron, box(bw, 0.045, 0.045, { x: bx, y: y0 + railH, z: zf }), col, frame);
    addWall(mats.iron, box(bw, 0.035, 0.035, { x: bx, y: y0 + 0.12, z: zf }), col, frame);
    for (const s of [-1, 1]) {
      const x = bx + s * (bw / 2 - 0.04);
      addWall(mats.iron, box(0.045, 0.045, depth - 0.06, { x, y: y0 + railH, z: (depth - 0.06) / 2 }), col, frame);
      addWall(mats.iron, box(0.035, 0.035, depth - 0.06, { x, y: y0 + 0.12, z: (depth - 0.06) / 2 }), col, frame);
    }
    for (let x = bx - bw / 2 + 0.17; x < bx + bw / 2 - 0.1; x += 0.13) addWall(mats.iron, cylinder(0.012, 0.012, railH - 0.14, 4, { x, y: y0 + 0.12 + (railH - 0.14) / 2, z: zf, open: true }), col, frame);
    for (const s of [-1, 1]) for (let z = 0.2; z < depth - 0.15; z += 0.13) addWall(mats.iron, cylinder(0.012, 0.012, railH - 0.14, 4, { x: bx + s * (bw / 2 - 0.04), y: y0 + 0.12 + (railH - 0.14) / 2, z, open: true }), col, frame);
    // Small decorative scroll at the rail center.
    addWall(mats.iron, cylinder(0.14, 0.14, 0.03, 12, { x: bx, y: y0 + 0.55, z: zf, rotX: Math.PI / 2, open: true }), col, frame);
  }

  // Potted plant / satellite dish clutter on some balconies.
  if (rng.chance(0.5) && !op.loggia) {
    addWall(mats.paintedMetal, sphere(0.32, { x: bx + bw / 2 - 0.5, y: y0 + 1.35, z: depth - 0.35, sx: 1, sy: 1, sz: 0.35, seg: 12, rotX: -0.6 }), [0.85, 0.85, 0.85], frame);
    addWall(mats.iron, cylinder(0.02, 0.02, 0.5, 6, { x: bx + bw / 2 - 0.5, y: y0 + 1.1, z: depth - 0.1 }), [1, 1, 1], frame);
  }

  // Collider (world space).
  const center = new THREE.Vector3(bx, y0 - slabT / 2, depth / 2).applyMatrix4(frame);
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spec.rot + side.theta);
  results.colliders.push({ center, half: new THREE.Vector3(bw / 2, slabT / 2, depth / 2), quat: q, surface: isWood ? 'wood' : 'stone' });
  results.balconies.push({ center: new THREE.Vector3(bx, y0, depth / 2).applyMatrix4(frame), yaw: spec.rot + side.theta });
}

function buildGableRoof(spec, H, ridgeAlongX, pitch, o, r) {
  const { mats, batch, roofMat, style, rng, results, M, plain } = r;
  const { w, d } = spec;
  const along = ridgeAlongX ? w : d; // ridge length (without overhang)
  const across = ridgeAlongX ? d : w; // span perpendicular to the ridge
  const half = across / 2 + o;
  const yE = H + 0.02;
  const rise = half * Math.tan(pitch);
  const yR = yE + rise;
  const slopeLen = half / Math.cos(pitch);
  const add = (mat, geo, color) => {
    geo.applyMatrix4(M);
    batch.add(mat, geo, color);
  };
  // Build in a frame where the ridge runs along X, then rotate 90° if the ridge is along Z.
  const R = ridgeAlongX ? new THREE.Matrix4() : new THREE.Matrix4().makeRotationY(Math.PI / 2);
  const addR = (mat, geo, color) => {
    geo.applyMatrix4(R);
    add(mat, geo, color);
  };
  // Per-building tile colour (some roofs redder, some faded/browner) plus a weathering gradient:
  // darker, mossier near the eaves, sun-bleached toward the ridge. Vertex colours, so still one batch.
  const k = rng.range(0.84, 1.1);
  const warm = rng.range(-0.05, 0.1);
  const tileTint = [k * (1 + warm), k, k * (1 - warm * 0.8)];
  const yBase = yE + M.elements[13];
  const shade = (x, y) => {
    const t = Math.min(1, Math.max(0, (y - yBase) / Math.max(rise, 0.01)));
    const f = 0.84 + 0.22 * t;
    return [tileTint[0] * f, tileTint[1] * f, tileTint[2] * f];
  };
  for (const s of [-1, 1]) {
    const cz = s * (half / 2);
    const cy = (yE + yR) / 2 + 0.05;
    addR(roofMat, box(along + 2 * o, 0.1, slopeLen, { x: 0, y: cy, z: cz, rotX: -s * pitch }), shade);
    // Eave course: the bottom row of tiles hangs 4 cm past the slab and turns down, giving the roof edge a
    // visible thickness/shadow line (the reference eaves read as a dark tile lip, not a knife edge).
    addR(roofMat, box(along + 2 * o + 0.04, 0.09, 0.16, { x: 0, y: yE + 0.02, z: s * (half + 0.03) }), tileTint.map((c) => c * 0.72));
    // Fascia + soffit under the overhang, rafter tails.
    addR(mats.woodBrown, box(along + 2 * o, 0.17, 0.05, { x: 0, y: yE - 0.12, z: s * (half - 0.02) }), [0.5, 0.4, 0.3]);
    addR(mats.woodBrown, box(along + 2 * o, 0.04, o + 0.05, { x: 0, y: yE - 0.2, z: s * (half - o / 2 - 0.02) }), [0.6, 0.5, 0.4]);
    if (!plain) {
      for (let x = -along / 2 - o + 0.3; x < along / 2 + o; x += 1.0) {
        addR(mats.woodBrown, box(0.08, 0.12, o + 0.25, { x, y: yE - 0.27, z: s * (half - o / 2 - 0.05) }), [0.45, 0.36, 0.27]);
      }
    }
  }
  // Ridge cap and end caps.
  addR(roofMat, box(along + 2 * o + 0.1, 0.12, 0.34, { x: 0, y: yR + 0.08, z: 0 }), tileTint.map((c) => c * 0.9));
  // Chimneys
  const chimneys = plain ? 1 : rng.int(1, 2);
  for (let i = 0; i < chimneys; i++) {
    const cx = rng.range(-along / 2 + 1.2, along / 2 - 1.2);
    const cz = rng.range(0.6, half * 0.55) * rng.sign();
    const ySlope = yR - Math.abs(cz) * Math.tan(pitch);
    const chH = 1.3 + rng.range(0, 0.5);
    const g = box(0.62, chH, 0.62, { x: cx, y: ySlope + chH / 2 - 0.35, z: cz });
    setVertexColor(g, style.tint);
    addR(mats.wall(style.wall === 'rustic' ? 'plaster_stone_wall_01' : style.wall), g, null);
    addR(mats.trimStone, box(0.8, 0.1, 0.8, { x: cx, y: ySlope + chH - 0.3, z: cz }), [1, 1, 1]);
    addR(mats.terracotta, cylinder(0.12, 0.14, 0.35, 10, { x: cx - 0.15, y: ySlope + chH - 0.08, z: cz }), [0.75, 0.6, 0.5]);
    addR(mats.terracotta, cylinder(0.12, 0.14, 0.35, 10, { x: cx + 0.15, y: ySlope + chH - 0.08, z: cz }), [0.75, 0.6, 0.5]);
  }
  // Satellite dish on the ridge occasionally. Kept low on a stout mast with a foot bracket: a tall thin mast
  // vanishes at distance (sub-pixel) and the dish then reads as a disc floating over the roof.
  if (!plain && rng.chance(0.6)) {
    const x = rng.range(-along / 2 + 1, along / 2 - 1);
    const dark = [0.1, 0.1, 0.1];
    addR(mats.iron, box(0.3, 0.12, 0.4, { x, y: yR + 0.18, z: 0 }), dark);
    addR(mats.iron, cylinder(0.04, 0.04, 0.4, 6, { x, y: yR + 0.34, z: 0 }), dark);
    addR(mats.paintedMetal, cylinder(0.34, 0.3, 0.035, 14, { x, y: yR + 0.5, z: 0.16, rotX: -(Math.PI / 2 - 0.6) }), [0.86, 0.86, 0.84]);
    addR(mats.iron, cylinder(0.012, 0.012, 0.34, 4, { x, y: yR + 0.4, z: 0.32, rotX: -(Math.PI / 2 - 0.6) + 0.95, open: true }), dark);
  }
  // Colliders for the two slopes.
  for (const s of [-1, 1]) {
    const local = new THREE.Vector3(0, (yE + yR) / 2 + 0.05, s * (half / 2)).applyMatrix4(R);
    const center = local.applyMatrix4(M);
    const qLocal = new THREE.Quaternion().setFromEuler(new THREE.Euler(-s * pitch, 0, 0));
    const qR = new THREE.Quaternion().setFromRotationMatrix(R);
    const qM = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spec.rot);
    const q = qM.multiply(qR).multiply(qLocal);
    results.colliders.push({ center, half: new THREE.Vector3((along + 2 * o) / 2, 0.06, slopeLen / 2), quat: q, surface: 'stone' });
  }
}

function buildFlatRoof(spec, H, r) {
  const { mats, batch, style, results, M, plain } = r;
  const { w, d } = spec;
  const add = (mat, geo, color) => {
    geo.applyMatrix4(M);
    batch.add(mat, geo, color);
  };
  // Deck, parapet with coping.
  add(mats.terracotta, polygon([[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]], [], H + 0.02), [0.8, 0.7, 0.62]);
  const pH = 0.75;
  const pT = 0.3;
  const wallMat = mats.wall(style.wall);
  for (const [cx, cz, lx, lz] of [
    [0, d / 2 - pT / 2, w, pT],
    [0, -d / 2 + pT / 2, w, pT],
    [w / 2 - pT / 2, 0, pT, d - 2 * pT],
    [-w / 2 + pT / 2, 0, pT, d - 2 * pT],
  ]) {
    const g = box(lx, pH, lz, { x: cx, y: H + pH / 2, z: cz });
    setVertexColor(g, style.tint);
    add(wallMat, g, null);
    add(mats.trimStone, box(lx + 0.06, 0.08, lz + 0.06, { x: cx, y: H + pH + 0.04, z: cz }), [1, 1, 1]);
  }
  // Rooftop clutter: water tank, AC units, a dish, a small stair bulkhead.
  add(mats.paintedMetal, cylinder(0.7, 0.7, 1.2, 16, { x: -w / 4, y: H + 0.62, z: -d / 4 }), [0.85, 0.85, 0.82]);
  add(mats.iron, box(1.6, 0.12, 1.6, { x: -w / 4, y: H + 0.08, z: -d / 4 }), [1, 1, 1]);
  add(mats.paintedMetal, box(0.9, 0.7, 0.9, { x: w / 4, y: H + 0.37, z: -d / 5 }), [0.88, 0.88, 0.86]);
  const bh = box(2.2, 2.3, 2.6, { x: w / 4, y: H + 1.15, z: d / 4 });
  setVertexColor(bh, style.tint);
  add(wallMat, bh, null);
  add(mats.roofTiles, box(2.5, 0.1, 2.9, { x: w / 4, y: H + 2.33, z: d / 4, rotX: 0.2 }), [1, 1, 1]);
  if (!plain) {
    add(mats.iron, cylinder(0.025, 0.025, 1.4, 6, { x: -w / 3, y: H + 0.7, z: d / 3 }), [1, 1, 1]);
    add(mats.paintedMetal, sphere(0.45, { x: -w / 3, y: H + 1.4, z: d / 3 + 0.15, sz: 0.3, seg: 14, rotX: -0.9 }), [0.9, 0.9, 0.9]);
  }
  // Parapet colliders (stops grenades rolling off? mostly for bullets).
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spec.rot);
  results.colliders.push({ center: new THREE.Vector3(0, H + 0.01, 0).applyMatrix4(M), half: new THREE.Vector3(w / 2, 0.02, d / 2), quat: q, surface: 'stone' });
}
