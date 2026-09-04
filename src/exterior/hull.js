// Star Destroyer exterior: the lofted wedge (with knife-edge trenches), the keel with the hangar
// wells cut through it, the terraced dorsal superstructure, the command tower with its bridge module,
// shield domes and sensor mast, the stern engine block and the ventral reactor bulb.
// Surface detail (greebles, turbolasers, hatches, antennas, windows, running lights) lives in greebles.js.
import * as THREE from "three";
import { Kit, loft, taperedBox, panelWithHoles, worldUVs, insideOut } from "../kit.js";
import { HULL, halfWidth, dorsalY, keelY, TERRACES, TOWER_BASE, TOWER, ENGINES, REACTOR_BULB, HANGAR_WELL, SHUTTLE_WELL, ROOMS, terraceTopY, towerBaseTopY } from "../config/layout.js";
import { IMP, NO_SHADOW_KEYS, addExteriorDetailMaterials } from "../materials/imperial.js";

const TEXEL = 1 / 48; // one hull-plate tile per 48 m

const lcg = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};
const hash2 = (a, b) => {
  let h = (a * 374761393 + b * 668265263) >>> 0;
  h = ((h ^ (h >>> 13)) * 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

// per-triangle tone jitter so neighbouring facets never read as one flat sheet
function facetTint(geo, base, spread = 0.05, seed = 1) {
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  const rnd = lcg(seed);
  for (let i = 0; i < n; i += 3) {
    const k = 1 + (rnd() - 0.5) * 2 * spread;
    for (let j = 0; j < 3; j++) {
      arr[(i + j) * 3] = base.r * k;
      arr[(i + j) * 3 + 1] = base.g * k;
      arr[(i + j) * 3 + 2] = base.b * k;
    }
  }
  geo.setAttribute("color", new THREE.BufferAttribute(arr, 3));
}

// Plate patchwork for lofted geometry: loft() emits two triangles (six vertices) per quad in station
// order, so quad q of a section with `segs` quads is segment floor(q / segs), side q % segs. `tone`
// returns the quad's colour from (segment, side, centroid, normal); both triangles get the same colour,
// which is what makes the tone changes read as plate seams instead of diagonal splits.
function quadTint(geo, segs, tone) {
  const pos = geo.attributes.position;
  const n = pos.count;
  const arr = new Float32Array(n * 3);
  const c = new THREE.Vector3();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  for (let i = 0; i + 5 < n; i += 6) {
    const q = i / 6;
    c.set(0, 0, 0);
    for (let j = 0; j < 6; j++) c.add(a.fromBufferAttribute(pos, i + j));
    c.multiplyScalar(1 / 6);
    a.fromBufferAttribute(pos, i + 1).sub(b.fromBufferAttribute(pos, i));
    nrm.fromBufferAttribute(pos, i + 2).sub(b);
    nrm.copy(a.cross(nrm)).normalize();
    const col = tone(Math.floor(q / segs), q % segs, c, nrm);
    for (let j = 0; j < 6; j++) {
      arr[(i + j) * 3] = col.r;
      arr[(i + j) * 3 + 1] = col.g;
      arr[(i + j) * 3 + 2] = col.b;
    }
  }
  geo.setAttribute("color", new THREE.BufferAttribute(arr, 3));
}
// plate-batch tone: rows of plates (one station segment) share a batch tint, each plate adds its own
const PATCH = [0.9, 0.95, 1.0, 1.0, 1.0, 1.045, 1.09];
const ROW = [0.975, 1.0, 1.0, 1.03];
const patchMul = (seg, side) => PATCH[Math.floor(hash2(seg, side) * PATCH.length)] * ROW[Math.floor(hash2(seg, 977) * ROW.length)];

// Cross-section of the main wedge at z, as an OPEN polyline from the starboard keel corner, around
// the starboard edge, over the top and down the port edge to the port keel corner (CCW seen from +Z).
// The dorsal and keel slopes carry two extra (colinear) points each so the loft splits them into
// three plate columns for the patchwork tint.
const SLOPE_SPLIT = [0.36, 0.68];
function wedgeSection(z) {
  const w = halfWidth(z);
  const e = HULL.edgeHalf;
  const yd = dorsalY(z);
  const yk = keelY(z);
  const wt = w * HULL.dorsalPlateauFrac;
  const wk = w * HULL.keelFlatFrac;
  const td = Math.min(HULL.edgeTrenchDepth, w * 0.45);
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const kS = [wk, yk];
  const eLoS = [w, -e];
  const eHiS = [w, e];
  const dS = [wt, yd];
  const dP = [-wt, yd];
  const eHiP = [-w, e];
  const eLoP = [-w, -e];
  const kP = [-wk, yk];
  // always 20 points so every station lofts to the next
  return [
    kS,
    mix(kS, eLoS, SLOPE_SPLIT[0]),
    mix(kS, eLoS, SLOPE_SPLIT[1]),
    eLoS,
    [w - td, -e * 0.45], // trench floor
    [w - td, e * 0.45],
    eHiS,
    mix(eHiS, dS, 1 - SLOPE_SPLIT[1]),
    mix(eHiS, dS, 1 - SLOPE_SPLIT[0]),
    dS,
    dP,
    mix(dP, eHiP, SLOPE_SPLIT[0]),
    mix(dP, eHiP, SLOPE_SPLIT[1]),
    eHiP,
    [-w + td, e * 0.45],
    [-w + td, -e * 0.45],
    eLoP,
    mix(eLoP, kP, 1 - SLOPE_SPLIT[1]),
    mix(eLoP, kP, 1 - SLOPE_SPLIT[0]),
    kP,
  ];
}
// region tone of wedge side `i` (see wedgeSection): the plateau is the reference grey, the open slopes
// a shade darker and warmer, the trench walls darker still, the keel slopes darkest
const SIDE_TONE = (() => {
  const t = (r, g, b) => IMP.hull.clone().multiply(new THREE.Color(r, g, b));
  const keel = t(0.86, 0.86, 0.87);
  const trench = t(0.9, 0.9, 0.9);
  const slope = t(0.94, 0.935, 0.92);
  const plateau = IMP.hull.clone();
  return [keel, keel, keel, trench, trench, trench, slope, slope, slope, plateau, slope, slope, slope, trench, trench, trench, keel, keel, keel];
})();

// Shield dome as irregular armour gores: latitude bands of uneven height, each split into gores of
// uneven width with a random rotational offset per band so the seams never line up; every panel sits at
// its own radius (+-0.5 %) with a small gap that shows the dark inner sphere as a seam. Flat normals.
function goreDome(r, seed) {
  const rnd = lcg(seed);
  const thetaMax = Math.PI * 0.8;
  const nBands = 7;
  const ws = [];
  let acc = 0;
  for (let i = 0; i < nBands; i++) {
    const w = 0.6 + rnd() * 0.8;
    ws.push(w);
    acc += w;
  }
  const edges = [0];
  for (let i = 0; i < nBands; i++) edges.push(edges[i] + (ws[i] / acc) * thetaMax);
  const pos = [];
  const col = [];
  const cen = new THREE.Vector3();
  const nA = new THREE.Vector3();
  const nB = new THREE.Vector3();
  const tri = (a, b, c, tone) => {
    // wind outward: flip if the face normal points toward the centre
    cen.set((a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3);
    nA.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    nB.set(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
    const out = nA.cross(nB).dot(cen) >= 0;
    if (out) pos.push(...a, ...b, ...c);
    else pos.push(...a, ...c, ...b);
    for (let k = 0; k < 3; k++) col.push(tone.r, tone.g, tone.b);
  };
  const P = (rr, th, ph) => [Math.sin(th) * Math.cos(ph) * rr, Math.cos(th) * rr, Math.sin(th) * Math.sin(ph) * rr];
  const tone = new THREE.Color();
  for (let b = 0; b < nBands; b++) {
    const t0 = edges[b];
    const t1 = edges[b + 1];
    const midT = (t0 + t1) / 2;
    const circ = Math.sin(midT) * 2 * Math.PI * r;
    const nG = Math.max(4, Math.round((circ / (r * 0.4)) * (0.8 + rnd() * 0.4)));
    const off = rnd() * Math.PI * 2;
    const gw = [];
    let s = 0;
    for (let g = 0; g < nG; g++) {
      const w = 0.6 + rnd() * 0.8;
      gw.push(w);
      s += w;
    }
    let a = off;
    const tg = 0.006; // half gap in theta
    for (let g = 0; g < nG; g++) {
      const a0 = a;
      const a1 = a + (gw[g] / s) * Math.PI * 2;
      a = a1;
      const rr = r * (1 + (rnd() - 0.5) * 0.01);
      const gapPhi = 0.011 / Math.max(0.12, Math.sin(midT));
      const ph0 = a0 + gapPhi;
      const ph1 = a1 - gapPhi;
      const k = rnd();
      if (k < 0.08) tone.copy(IMP.hullDark).multiplyScalar(0.9 + rnd() * 0.2);
      else tone.copy(IMP.hullLight).multiplyScalar(0.92 + rnd() * 0.14);
      if (b === 0) {
        tri(P(rr, 0, 0), P(rr, t1 - tg, ph0), P(rr, t1 - tg, ph1), tone);
        continue;
      }
      const th0 = t0 + tg;
      const th1 = t1 - tg;
      const c00 = P(rr, th0, ph0);
      const c01 = P(rr, th0, ph1);
      const c10 = P(rr, th1, ph0);
      const c11 = P(rr, th1, ph1);
      // a mid point keeps wide gores from reading as a single flat facet
      const cm = P(rr, midT, (ph0 + ph1) / 2);
      tri(c00, c01, cm, tone);
      tri(c01, c11, cm, tone);
      tri(c11, c10, cm, tone);
      tri(c10, c00, cm, tone);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

export function buildExterior(mats, opts = {}) {
  addExteriorDetailMaterials(mats);
  const group = new THREE.Group();
  group.name = "exterior";
  const kit = new Kit(mats);
  const hullCol = IMP.hull;

  // ---- main wedge (open loft, keel strip separate) ------------------------------------------
  // stations every 40..70 m (irregular, seeded) so the plate patchwork has plausible plate rows
  const zs = [HULL.bowZ, HULL.bowZ + 4];
  {
    const rnd = lcg(4242);
    let z = HULL.bowZ + 4;
    while (z < HULL.sternZ - 60) {
      z += 40 + rnd() * 30;
      zs.push(Math.round(z));
    }
    zs.push(HULL.sternZ);
  }
  // the tip station needs the same point count as the rest: build every station with the full profile
  const stations = zs.map((z) => ({ z, points: wedgeSection(Math.max(z, HULL.bowZ + 4)) }));
  stations[0].points = stations[0].points.map(([x, y]) => [x * 0.05, y * 0.05]);
  {
    const g = loft(stations, { open: true });
    worldUVs(g, TEXEL);
    const merged = kit.add("hullPlate", g, { uv: "keep", color: hullCol });
    const c = new THREE.Color();
    quadTint(merged, stations[0].points.length - 1, (seg, side) => c.copy(SIDE_TONE[side]).multiplyScalar(patchMul(seg, side)));
  }
  // trench interiors darker: a second, slightly inset loft of just the trench walls would double
  // geometry; instead tint the trench facets via a dedicated dark loft strip
  {
    const trench = (side) =>
      zs.slice(1).map((z) => {
        const w = halfWidth(z);
        const e = HULL.edgeHalf;
        const td = Math.min(HULL.edgeTrenchDepth, w * 0.5);
        return { z, points: side > 0 ? [[w - td + 0.05, -e * 0.45], [w - td + 0.05, e * 0.45]] : [[-w + td - 0.05, e * 0.45], [-w + td - 0.05, -e * 0.45]] };
      });
    for (const side of [-1, 1]) {
      const g = loft(trench(side), { open: true });
      worldUVs(g, TEXEL * 4);
      kit.add("hullDark", g, { uv: "keep", color: IMP.trench });
    }
  }
  // ---- keel strips with the hangar wells cut out ----------------------------------------------
  {
    const wells = [HANGAR_WELL, SHUTTLE_WELL].sort((a, b) => a.z0 - b.z0);
    const ranges = [];
    let z = HULL.bowZ + 4;
    for (const w of wells) {
      ranges.push({ z0: z, z1: w.z0, hole: null });
      ranges.push({ z0: w.z0, z1: w.z1, hole: w });
      z = w.z1;
    }
    ranges.push({ z0: z, z1: HULL.sternZ, hole: null });
    const keelPts = (z, hole) => {
      const wk = halfWidth(z) * HULL.keelFlatFrac;
      const y = keelY(z);
      // loft() winds (a0, b1, b0) with b further aft, so a strip whose points run port -> starboard
      // (along +x) gets a normal facing down (-y): the keel has to be seen from below
      if (!hole) return [[[-wk, y], [wk, y]]];
      return [
        [[-wk, y], [hole.x0, y]],
        [[hole.x1, y], [wk, y]],
      ];
    };
    const keelTone = new THREE.Color();
    for (const r of ranges) {
      // split long strips into ~60 m plates so the keel carries the patchwork too
      const n = Math.max(1, Math.round((r.z1 - r.z0) / 60));
      const zz = [];
      for (let i = 0; i <= n; i++) zz.push(r.z0 + ((r.z1 - r.z0) * i) / n);
      const a = keelPts(r.z0, r.hole);
      for (let i = 0; i < a.length; i++) {
        const st = zz.map((z) => ({ z, points: keelPts(z, r.hole)[i] }));
        const g = loft(st, { open: true });
        worldUVs(g, TEXEL);
        const merged = kit.add("hullPlate", g, { uv: "keep", color: IMP.hullDark });
        quadTint(merged, 1, (seg) => keelTone.copy(IMP.hullDark).multiplyScalar(patchMul(seg + Math.round(r.z0), 31 + i)));
      }
      if (r.hole) {
        // well shaft walls from the keel up to the deck opening, plus a lit rim
        const h = r.hole;
        const yTop = h.yDeck + 0.5;
        const yBot = keelY((h.z0 + h.z1) / 2) - 0.2;
        const t = 1.2;
        kit.boxMM("hullDark", [h.x0 - t, yBot, h.z0 - t], [h.x0, yTop, h.z1 + t], { color: IMP.trench, texel: 0.1 });
        kit.boxMM("hullDark", [h.x1, yBot, h.z0 - t], [h.x1 + t, yTop, h.z1 + t], { color: IMP.trench, texel: 0.1 });
        kit.boxMM("hullDark", [h.x0, yBot, h.z0 - t], [h.x1, yTop, h.z0], { color: IMP.trench, texel: 0.1 });
        kit.boxMM("hullDark", [h.x0, yBot, h.z1], [h.x1, yTop, h.z1 + t], { color: IMP.trench, texel: 0.1 });
        // rim lights around the opening (visible from below): dashed rows of dim cool strips, not a
        // continuous blown-white tube
        const rimCol = new THREE.Color(0.2, 0.22, 0.27);
        for (const [x0, x1, z0, z1, alongZ] of [
          [h.x0 - 2.3, h.x0 - 1.6, h.z0, h.z1, true],
          [h.x1 + 1.6, h.x1 + 2.3, h.z0, h.z1, true],
          [h.x0, h.x1, h.z0 - 2.3, h.z0 - 1.6, false],
          [h.x0, h.x1, h.z1 + 1.6, h.z1 + 2.3, false],
        ]) {
          const L = alongZ ? z1 - z0 : x1 - x0;
          const n = Math.max(2, Math.round(L / 6));
          for (let k = 0; k < n; k++) {
            const c = (alongZ ? z0 : x0) + ((k + 0.5) * L) / n;
            if (alongZ) kit.boxMM("emitTint", [x0, yBot - 0.28, c - 1.2], [x1, yBot - 0.1, c + 1.2], { color: rimCol });
            else kit.boxMM("emitTint", [c - 1.2, yBot - 0.28, z0], [c + 1.2, yBot - 0.1, z1], { color: rimCol });
          }
        }
        // approach lights: rows of red/green markers on the keel leading to the well
        for (let k = 1; k <= 6; k++) {
          const zz = h.z0 - k * 12;
          const yy = keelY(zz) - 0.6;
          kit.box("emitRed", h.x0 - 6, yy, zz, 1.2, 0.6, 1.2);
          kit.box("emitGreen", h.x1 + 6, yy, zz, 1.2, 0.6, 1.2);
        }
      }
    }
  }
  // ---- stern face --------------------------------------------------------------------------
  {
    const pts = wedgeSection(HULL.sternZ);
    const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    const g = new THREE.ShapeGeometry(shape, 1);
    g.translate(0, 0, HULL.sternZ);
    worldUVs(g, TEXEL);
    kit.add("hullPlate", g, { uv: "keep", color: IMP.hullDark });
    // engine block: a recessed dark plate carrying the thrusters, inset from the stern silhouette
    {
      const cy = -8;
      const inset = pts.map(([x, y]) => new THREE.Vector2(x * 0.86, cy + (y - cy) * 0.8));
      const blk = new THREE.ExtrudeGeometry(new THREE.Shape(inset), { depth: 0.8, bevelEnabled: false });
      blk.translate(0, 0, HULL.sternZ - 0.2);
      worldUVs(blk, TEXEL * 6);
      kit.add("hullDark", blk, { uv: "keep", color: IMP.trench });
      // armoured rim around the recessed engine block: a frame (the inset plate outline is the hole),
      // so the dark block reads as a 2 m deep recess with the bells emerging from it
      const lipShape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x * 0.9, cy + (y - cy) * 0.86)));
      lipShape.holes.push(new THREE.Path(inset.slice().reverse()));
      const lip = new THREE.ExtrudeGeometry(lipShape, { depth: 2.6, bevelEnabled: false });
      lip.translate(0, 0, HULL.sternZ - 0.1);
      worldUVs(lip, TEXEL);
      kit.add("hullPlate", lip, { uv: "keep", color: IMP.hullLight });
      // inner step of the recess wall (a second, thinner frame) so the rim has a stepped profile
      const lip2Shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x * 0.88, cy + (y - cy) * 0.83)));
      lip2Shape.holes.push(new THREE.Path(inset.slice().reverse()));
      const lip2 = new THREE.ExtrudeGeometry(lip2Shape, { depth: 1.2, bevelEnabled: false });
      lip2.translate(0, 0, HULL.sternZ - 0.1);
      worldUVs(lip2, TEXEL * 4);
      kit.add("hullDark", lip2, { uv: "keep", color: IMP.hullDark });
    }
    for (const e of [...ENGINES.main, ...ENGINES.secondary]) {
      const L = e.r > 30 ? ENGINES.bellLength : ENGINES.bellLength * 0.6;
      // outer bell (open cylinder, slightly flared aft)
      const bell = new THREE.CylinderGeometry(e.r * 1.04, e.r * 0.92, L, 40, 1, true);
      bell.rotateX(Math.PI / 2);
      kit.add("hullDark", bell, { pos: [e.x, e.y, HULL.sternZ + L / 2], color: IMP.hullDark, uv: "scale", uvScale: [12, 2] });
      // the bore: one emissive frustum from the throat to the lip, so the ion glow fills the whole
      // mouth from any angle (a dark inner wall used to hide the glow off-axis and leave a blown
      // crescent). The bore shader runs its gradient along uv.x: 0 at the throat, 1 at the lip.
      {
        const Lb = L * 0.96;
        const bore = insideOut(new THREE.CylinderGeometry(e.r * 0.99, e.r * 0.74, Lb, 48, 1, true));
        bore.rotateX(Math.PI / 2);
        const pos = bore.attributes.position;
        const uv = bore.attributes.uv;
        for (let i = 0; i < pos.count; i++) {
          const t = (pos.getZ(i) + Lb / 2) / Lb; // 0 at the throat, 1 at the mouth
          const ang = Math.atan2(pos.getY(i), pos.getX(i)) / (Math.PI * 2) + 0.5;
          uv.setXY(i, t, ang);
        }
        kit.add("emitEngineBore", bore, { pos: [e.x, e.y, HULL.sternZ + 0.02 * L + Lb / 2], uv: "keep" });
        // throat plate (uv.x = 0: the core)
        const throat = new THREE.CircleGeometry(e.r * 0.745, 48);
        const tuv = throat.attributes.uv;
        for (let i = 0; i < tuv.count; i++) tuv.setXY(i, 0, tuv.getY(i));
        kit.add("emitEngineBore", throat, { pos: [e.x, e.y, HULL.sternZ + 0.025 * L], uv: "keep" });
        // two dark baffle rings inside the bore break the glow into stages
        for (const f of [0.42, 0.72]) {
          const rb = e.r * (0.74 + (0.99 - 0.74) * f);
          const ring = new THREE.TorusGeometry(rb, e.r * 0.018, 6, 48);
          kit.add("hullDark", ring, { pos: [e.x, e.y, HULL.sternZ + 0.02 * L + f * Lb], color: IMP.trench, uv: "scale", uvScale: [8, 1] });
        }
      }
      // lip ring closing the gap between the bore mouth and the bell's outer edge
      {
        const lip = new THREE.RingGeometry(e.r * 0.985, e.r * 1.045, 48);
        kit.add("hullDark", lip, { pos: [e.x, e.y, HULL.sternZ + L - 0.02], color: IMP.hullDark, uv: "scale", uvScale: [8, 1] });
      }
      // ring vanes around the mouth
      for (let k = 0; k < 3; k++) {
        const ring = new THREE.TorusGeometry(e.r * (0.95 + k * 0.04), e.r * 0.02, 8, 48);
        kit.add("hullPlate", ring, { pos: [e.x, e.y, HULL.sternZ + L * (0.35 + k * 0.28)], color: IMP.hullLight, uv: "scale", uvScale: [8, 1] });
      }
      // mounting collar: an open sleeve with an annular end plate. (A capped cylinder here put a solid
      // disc across the bell root that hid the throat and the inner bore from astern, leaving exactly
      // the dark disc with a blown crescent the review called out.)
      const collar = new THREE.CylinderGeometry(e.r * 1.16, e.r * 1.16, 6, 40, 1, true);
      collar.rotateX(Math.PI / 2);
      kit.add("hullPlate", collar, { pos: [e.x, e.y, HULL.sternZ + 3], color: hullCol, uv: "scale", uvScale: [16, 0.5] });
      kit.add("hullPlate", new THREE.RingGeometry(e.r * 0.9, e.r * 1.16, 40), { pos: [e.x, e.y, HULL.sternZ + 6], color: IMP.hullDark, uv: "scale", uvScale: [8, 1] });
    }
  }
  // ---- dorsal terraces ----------------------------------------------------------------------
  {
    const buildTerrace = (t, baseYOf, seed) => {
      const st = [];
      const zs2 = [t.z0, t.z0 + 45, t.z0 + 120];
      {
        const rnd = lcg(seed);
        let z = t.z0 + 120;
        while (z < HULL.sternZ - 55) {
          z += 40 + rnd() * 30;
          zs2.push(Math.round(z));
        }
        zs2.push(HULL.sternZ);
      }
      for (const z of zs2) {
        const w = halfWidth(z);
        const top = w * t.halfTopFrac;
        const base = top + t.slopeRun;
        const yb = baseYOf(z);
        const rise = z < t.z0 + 45 ? t.rise * Math.max(0.02, (z - t.z0) / 45) : t.rise;
        st.push({ z, points: [[base, yb], [top, yb + rise], [-top, yb + rise], [-base, yb]] });
      }
      const g = loft(st, { open: true, capEnd: false });
      worldUVs(g, TEXEL);
      return g;
    };
    const tc = new THREE.Color();
    const t1 = buildTerrace(TERRACES[0], (z) => dorsalY(z) - 0.3, 515);
    const t1Col = IMP.hull.clone().multiply(new THREE.Color(1.03, 1.035, 1.05));
    quadTint(kit.add("hullPlate", t1, { uv: "keep", color: hullCol }), 3, (seg, side) => tc.copy(t1Col).multiplyScalar(patchMul(seg + 100, side)));
    const t2 = buildTerrace(TERRACES[1], (z) => dorsalY(z) + TERRACES[0].rise - 0.3, 516);
    quadTint(kit.add("hullPlate", t2, { uv: "keep", color: IMP.hullLight }), 3, (seg, side) => tc.copy(IMP.hullLight).multiplyScalar(patchMul(seg + 200, side)));
    // stern faces of the terraces (they end flush with the stern)
    for (const [t, y0, y1] of [
      [TERRACES[0], dorsalY(HULL.sternZ), dorsalY(HULL.sternZ) + TERRACES[0].rise],
      [TERRACES[1], dorsalY(HULL.sternZ) + TERRACES[0].rise, dorsalY(HULL.sternZ) + TERRACES[0].rise + TERRACES[1].rise],
    ]) {
      const w = halfWidth(HULL.sternZ);
      const top = w * t.halfTopFrac;
      const base = top + t.slopeRun;
      const shape = new THREE.Shape([new THREE.Vector2(-base, y0), new THREE.Vector2(base, y0), new THREE.Vector2(top, y1), new THREE.Vector2(-top, y1)]);
      const g = new THREE.ShapeGeometry(shape, 1);
      g.translate(0, 0, HULL.sternZ + 0.05);
      worldUVs(g, TEXEL);
      kit.add("hullPlate", g, { uv: "keep", color: IMP.hullDark });
    }
    // tower base block (T3)
    const tb = TOWER_BASE;
    const yb = dorsalY((tb.z0 + tb.z1) / 2) + TERRACES[0].rise + TERRACES[1].rise - 0.3;
    const g3 = taperedBox((tb.halfTop + tb.slopeRun) * 2, tb.z1 - tb.z0, tb.halfTop * 2, tb.z1 - tb.z0 - 16, tb.rise + 0.3, { shearZ: 4 });
    worldUVs(g3, TEXEL);
    kit.add("hullPlate", g3, { pos: [0, yb, (tb.z0 + tb.z1) / 2], uv: "keep", color: hullCol });
    // plinth: T2's top rises with z, so the block's flat base would float ~3.6 m above it at the front
    // and its base is wider than T2's top everywhere. A vertical foundation slab, sunk deep enough to
    // meet T2's flanks, carries the block; the buried part is hidden inside the terrace.
    kit.boxMM("hullPlate", [-(tb.halfTop + tb.slopeRun) + 1.5, yb - 22, tb.z0 + 0.4], [tb.halfTop + tb.slopeRun - 1.5, yb + 0.4, tb.z1 - 0.4], { color: IMP.hullDark, texel: TEXEL });
  }
  // ---- command tower ------------------------------------------------------------------------
  {
    const nk = TOWER.neck;
    const y0 = towerBaseTopY() - 0.5;
    const h = nk.yTop - y0;
    const neck = taperedBox(nk.halfBase * 2, nk.z1 - nk.z0, nk.halfTop * 2, nk.z1 - nk.z0 - 12, h, { shearZ: 2 });
    worldUVs(neck, TEXEL);
    kit.add("hullPlate", neck, { pos: [0, y0, (nk.z0 + nk.z1) / 2], uv: "keep", color: hullCol });
    // neck detail. The front face recedes 8 m and the flanks taper 6 m over the neck's height, so
    // everything follows the tapered faces instead of standing vertical.
    const neckFrontZ = (y) => nk.z0 + 8 * ((y - y0) / h); // front face z at height y (shearZ 2 + taper)
    const neckBackZ = (y) => nk.z1 - 4 * ((y - y0) / h);
    const neckHalfX = (y) => nk.halfBase - (nk.halfBase - nk.halfTop) * ((y - y0) / h);
    // spine ribs on the front face
    for (const s of [-1, 1]) {
      for (let k = 0; k < 4; k++) {
        const x = s * (nk.halfBase - 6 - k * 7);
        const ry0 = y0 + 4;
        const ry1 = nk.yTop - 3;
        const rib = taperedBox(2.4, 3, 2.4, 3.0001, ry1 - ry0, { shearZ: neckFrontZ(ry1) - neckFrontZ(ry0) });
        worldUVs(rib, TEXEL * 4);
        kit.add("hullPlate", rib, { pos: [x, ry0, neckFrontZ(ry0)], uv: "keep", color: IMP.hullLight });
      }
    }
    // stepped armour: a two-step skirt where the neck rises from the tower base, a flared cap under
    // the bridge module, and two ledge bands around the middle so the column reads as layered plate
    const band = (yb, hb, out, color, mat = "hullPlate") => {
      const hx0 = neckHalfX(yb) + out;
      const hx1 = neckHalfX(yb + hb) + out;
      const zf0 = neckFrontZ(yb) - out;
      const zf1 = neckFrontZ(yb + hb) - out;
      const zb0 = neckBackZ(yb) + out;
      const zb1 = neckBackZ(yb + hb) + out;
      const g = taperedBox(hx0 * 2, zb0 - zf0, hx1 * 2, zb1 - zf1, hb, { shearZ: (zf1 + zb1) / 2 - (zf0 + zb0) / 2 });
      worldUVs(g, TEXEL * 2);
      kit.add(mat, g, { pos: [0, yb, (zf0 + zb0) / 2], uv: "keep", color });
    };
    band(y0, 3.6, 7.5, IMP.hullDark);
    band(y0 + 3.6, 4.4, 4.2, hullCol);
    band(y0 + 8.0, 1.6, 1.8, IMP.hullDark, "hullDark");
    for (const f of [0.42, 0.72]) {
      const yb = y0 + h * f;
      band(yb, 1.2, 2.4, IMP.hullDark, "hullDark");
      band(yb + 1.2, 2.6, 1.7, IMP.hullLight);
    }
    // (the module's 3 m underside ledge starts at yTop - 3, so the cap stops there)
    band(nk.yTop - 7.6, 4.6, 3.2, hullCol);
    band(nk.yTop - 9.8, 2.2, 1.6, IMP.hullDark, "hullDark");
    // flank armour: four vertical plates per side following the taper, with dark recessed channels
    // between them (the greeble windows sit in the channels, bright on dark)
    for (const s of [-1, 1]) {
      for (let k = 0; k < 4; k++) {
        const zf = 0.14 + k * 0.24; // fraction of the flank depth
        const ry0 = y0 + 10.5;
        const ry1 = nk.yTop - 8;
        const hz = (y) => neckFrontZ(y) + zf * (neckBackZ(y) - neckFrontZ(y));
        const plate = taperedBox(2.6, 3.2, 2.6, 3.2001, ry1 - ry0, { shearX: s * (neckHalfX(ry1) - neckHalfX(ry0)), shearZ: hz(ry1) - hz(ry0) });
        worldUVs(plate, TEXEL * 4);
        kit.add("hullPlate", plate, { pos: [s * (neckHalfX(ry0) + 0.6), ry0, hz(ry0)], uv: "keep", color: IMP.hullLight });
        if (k < 3) {
          const zc = zf + 0.12;
          const cz = (y) => neckFrontZ(y) + zc * (neckBackZ(y) - neckFrontZ(y));
          const chan = taperedBox(0.3, 5.2, 0.3, 5.2001, ry1 - ry0 - 2, { shearX: s * (neckHalfX(ry1 - 1) - neckHalfX(ry0 + 1)), shearZ: cz(ry1 - 1) - cz(ry0 + 1) });
          worldUVs(chan, TEXEL * 4);
          kit.add("hullDark", chan, { pos: [s * (neckHalfX(ry0 + 1) + 0.02), ry0 + 1, cz(ry0 + 1)], uv: "keep", color: IMP.trench });
        }
      }
    }
    // bridge module: box with the window band opening cut out of the front face
    const bm = TOWER.bridgeModule;
    const W = bm.halfX * 2;
    const H = bm.y1 - bm.y0;
    const D = bm.z1 - bm.z0;
    const cy = (bm.y0 + bm.y1) / 2;
    const cz = (bm.z0 + bm.z1) / 2;
    const wb = ROOMS.bridge.windowBand;
    // the casement opening is far wider than the glass: the bridge's own frame slab (x +-22.4) plugs
    // the middle, armoured blind panels set back in a dark recess fill the rest out to x +-46
    const CAS_X = 46;
    const CAS_Y0 = wb.y0 - 2.4;
    const CAS_Y1 = wb.y1 + 2.4;
    const hole = { x: 0, y: (CAS_Y0 + CAS_Y1) / 2 - cy, w: CAS_X * 2, h: CAS_Y1 - CAS_Y0 };
    const front = panelWithHoles(W, H, 1.0, [hole]);
    worldUVs(front, TEXEL);
    kit.add("hullPlate", front, { pos: [0, cy, bm.z0 + 0.5], uv: "keep", color: IMP.hullLight });
    // dark recessed backing behind the blind panels either side of the bridge's own frame slab
    // (x +-22.4, z 548.3..548.8); nothing may enter the bridge room (x +-21, y 190..199, z > 548)
    for (const s of [-1, 1]) kit.boxMM("hullDark", [Math.min(s * 22.4, s * (CAS_X + 0.5)), CAS_Y0 - 0.5, bm.z0 + 1.6], [Math.max(s * 22.4, s * (CAS_X + 0.5)), CAS_Y1 + 0.5, bm.z0 + 2.4], { color: IMP.trench, texel: 0.2 });
    // closures above and below the bridge slab (under the bridge floor / over its ceiling)
    kit.boxMM("hullDark", [-22.4, CAS_Y0 - 0.2, bm.z0 + 0.9], [22.4, 190.0, bm.z0 + 2.0], { color: IMP.trench, texel: 0.2 });
    kit.boxMM("hullDark", [-22.4, 199.3, bm.z0 + 0.9], [22.4, CAS_Y1 + 0.2, bm.z0 + 2.0], { color: IMP.trench, texel: 0.2 });
    // outer frame lip: head, sill and jambs standing 1.2 m proud of the face
    const lipZ0 = bm.z0 - 1.2;
    const lipZ1 = bm.z0 + 2.0;
    kit.boxMM("hullDark", [-CAS_X - 1.2, CAS_Y0 - 1.4, lipZ0], [CAS_X + 1.2, CAS_Y0, lipZ1], { color: IMP.trench, texel: 0.2 });
    kit.boxMM("hullDark", [-CAS_X - 1.2, CAS_Y1, lipZ0], [CAS_X + 1.2, CAS_Y1 + 1.4, lipZ1], { color: IMP.trench, texel: 0.2 });
    kit.boxMM("hullDark", [-CAS_X - 1.2, CAS_Y0, lipZ0], [-CAS_X, CAS_Y1, lipZ1], { color: IMP.trench, texel: 0.2 });
    kit.boxMM("hullDark", [CAS_X, CAS_Y0, lipZ0], [CAS_X + 1.2, CAS_Y1, lipZ1], { color: IMP.trench, texel: 0.2 });
    // a lighter armour rim on the lip's outer face so the casement reads as a set-in frame
    kit.boxMM("hullPlate", [-CAS_X - 2.6, CAS_Y0 - 2.8, bm.z0 - 0.6], [CAS_X + 2.6, CAS_Y0 - 1.4, bm.z0 + 0.4], { color: IMP.hullDark, texel: TEXEL * 4 });
    kit.boxMM("hullPlate", [-CAS_X - 2.6, CAS_Y1 + 1.4, bm.z0 - 0.6], [CAS_X + 2.6, CAS_Y1 + 2.8, bm.z0 + 0.4], { color: IMP.hullDark, texel: TEXEL * 4 });
    // centre pillar in front of the bridge slab's solid middle (the glass banks start at |x| 1.75)
    kit.boxMM("hullDark", [-1.3, CAS_Y0, bm.z0 - 1.4], [1.3, CAS_Y1, bm.z0 + 0.3], { color: IMP.hullDark, texel: 0.2 });
    kit.boxMM("hullDark", [-0.9, CAS_Y0 + 0.5, bm.z0 - 1.6], [0.9, CAS_Y1 - 0.5, bm.z0 - 1.4], { color: IMP.trench, texel: 0.2 });
    // mullions at the edge of the bridge slab and between the blind panels
    for (const s of [-1, 1]) {
      for (const x of [22.8, 30.7, 38.6]) kit.boxMM("hullDark", [s * x - 0.45, CAS_Y0, bm.z0 - 0.6], [s * x + 0.45, CAS_Y1, bm.z0 + 1.8], { color: IMP.trench, texel: 0.2 });
      // blind panels: armoured plates set 1 m back in the recess, each with a bevelled inner plate
      for (const [xa, xb] of [
        [23.25, 30.25],
        [31.15, 38.15],
        [39.05, 45.6],
      ]) {
        const lo = Math.min(s * xa, s * xb);
        const hi = Math.max(s * xa, s * xb);
        kit.boxMM("hullPlate", [lo, CAS_Y0 + 0.5, bm.z0 + 0.9], [hi, CAS_Y1 - 0.5, bm.z0 + 1.6], { color: IMP.hullDark, texel: TEXEL * 4 });
        kit.boxMM("hullPlate", [lo + 0.7, CAS_Y0 + 1.3, bm.z0 + 0.6], [hi - 0.7, CAS_Y1 - 1.3, bm.z0 + 0.9], { color: IMP.hullLight, texel: TEXEL * 4 });
      }
    }
    // other five faces
    kit.boxMM("hullPlate", [-bm.halfX, bm.y0, bm.z0 + 1], [bm.halfX, bm.y0 + 1, bm.z1], { color: IMP.hullDark, texel: TEXEL });
    kit.boxMM("hullPlate", [-bm.halfX, bm.y1 - 1, bm.z0 + 1], [bm.halfX, bm.y1, bm.z1], { color: IMP.hullLight, texel: TEXEL });
    // aft face: viewport band cut out for the observation deck (ROOMS.observation south wall, floor y 190)
    {
      const ob = ROOMS.observation;
      const aftHole = { x: (ob.box[0] + ob.box[2]) / 2, y: 190 + 2.7 - cy, w: 33.0, h: 4.6 };
      const aft = panelWithHoles(W, H, 1.0, [aftHole]);
      worldUVs(aft, TEXEL);
      kit.add("hullPlate", aft, { pos: [0, cy, bm.z1 - 0.5], uv: "keep", color: hullCol });
    }
    kit.boxMM("hullPlate", [-bm.halfX, bm.y0, bm.z0 + 1], [-bm.halfX + 1, bm.y1, bm.z1], { color: hullCol, texel: TEXEL });
    kit.boxMM("hullPlate", [bm.halfX - 1, bm.y0, bm.z0 + 1], [bm.halfX, bm.y1, bm.z1], { color: hullCol, texel: TEXEL });
    // module trim: a stepped ledge along the front and sides (windows on the flanks are greebles.js's)
    kit.boxMM("hullPlate", [-bm.halfX - 2, bm.y0 - 3, bm.z0 - 2], [bm.halfX + 2, bm.y0, bm.z1 + 2], { color: IMP.hullDark, texel: TEXEL });
    // shield generator domes on pedestals: irregular armour gores over a dark inner sphere, a base collar
    let domeSeed = 7001;
    for (const d of TOWER.domes) {
      const ped = new THREE.CylinderGeometry(d.r * 0.55, d.r * 0.8, d.y - d.r * 0.55 - bm.y1, 24);
      kit.add("hullPlate", ped, { pos: [d.x, (bm.y1 + d.y - d.r * 0.55) / 2, d.z], color: IMP.hullDark, uv: "scale", uvScale: [4, 1] });
      kit.add("hullDark", new THREE.SphereGeometry(d.r * 0.982, 24, 16), { pos: [d.x, d.y, d.z], color: IMP.trench, uv: "scale", uvScale: [6, 3] });
      const gores = goreDome(d.r, domeSeed++);
      // kit.add assigns a uniform vertex colour; put the per-panel tones back afterwards
      const panelTones = gores.attributes.color.array.slice();
      kit.add("hullPlate", gores, { pos: [d.x, d.y, d.z], uv: "world", texel: TEXEL * 2.5 }).setAttribute("color", new THREE.BufferAttribute(panelTones, 3));
      // equatorial band + polar cap + base collar hugging the underside
      kit.add("hullDark", new THREE.TorusGeometry(d.r * 1.008, d.r * 0.05, 8, 64), { pos: [d.x, d.y - d.r * 0.1, d.z], rot: [Math.PI / 2, 0, 0], color: IMP.trench, uv: "scale", uvScale: [8, 1] });
      kit.add("hullDark", new THREE.CylinderGeometry(d.r * 0.18, d.r * 0.25, 1.5, 16), { pos: [d.x, d.y + d.r, d.z], color: IMP.trench, uv: "scale", uvScale: [2, 0.2] });
      const yc = d.y - d.r * 0.55;
      kit.add("hullDark", new THREE.CylinderGeometry(d.r * 0.85, d.r * 0.93, 3.2, 32), { pos: [d.x, yc + 1.2, d.z], color: IMP.hullDark, uv: "scale", uvScale: [10, 0.5] });
      kit.add("hullDark", new THREE.TorusGeometry(d.r * 0.9, 0.5, 8, 48), { pos: [d.x, yc + 2.9, d.z], rot: [Math.PI / 2, 0, 0], color: IMP.trench, uv: "scale", uvScale: [8, 1] });
    }
    // sensor / comms mast
    const m = TOWER.mast;
    kit.add("hullPlate", new THREE.CylinderGeometry(m.r, m.r * 1.6, m.y1 - m.y0, 12), { pos: [m.x, (m.y0 + m.y1) / 2, m.z], color: hullCol, uv: "scale", uvScale: [4, 3] });
    kit.boxMM("hullPlate", [m.x - 7, m.y1 - 6, m.z - 5], [m.x + 7, m.y1, m.z + 5], { color: IMP.hullLight, texel: TEXEL * 4 });
    kit.boxMM("hullPlate", [m.x - 9, m.y1 - 2, m.z - 1.2], [m.x + 9, m.y1 - 0.6, m.z + 1.2], { color: IMP.hullDark, texel: TEXEL * 4 });
    for (let k = 0; k < 3; k++) kit.add("hullPlate", new THREE.CylinderGeometry(0.25, 0.25, 12 - k * 3, 6), { pos: [m.x - 4 + k * 4, m.y1 + (12 - k * 3) / 2, m.z], color: IMP.steel, uv: "scale", uvScale: [0.5, 2] });
    kit.box("emitRed", m.x, m.y1 + 12.5, m.z, 0.8, 0.8, 0.8);
    kit.box("emitRed", m.x - 4, m.y1 + 12.3, m.z, 0.6, 0.6, 0.6);
  }
  // ---- reactor bulb --------------------------------------------------------------------------
  {
    const b = REACTOR_BULB;
    kit.add("hullPlate", new THREE.SphereGeometry(b.r, 48, 32), { pos: [b.x, b.y, b.z], color: hullCol, uv: "scale", uvScale: [8, 4] });
    // weld collar where the bulb meets the keel, and equatorial armour bands below it
    kit.add("hullDark", new THREE.TorusGeometry(b.r + 0.6, 2.2, 10, 72), { pos: [b.x, keelY(b.z) - 1.5, b.z], rot: [Math.PI / 2, 0, 0], color: IMP.trench, uv: "scale", uvScale: [8, 1] });
    for (let k = 0; k < 3; k++) kit.add("hullDark", new THREE.TorusGeometry(b.r * (1.0 + k * 0.004), b.r * 0.025, 8, 64), { pos: [b.x, b.y - b.r * 0.35 + k * 8, b.z], rot: [Math.PI / 2, 0, 0], color: IMP.trench, uv: "scale", uvScale: [8, 1] });
  }

  const meshes = kit.build(group, { noShadow: NO_SHADOW_KEYS });
  for (const m of meshes) {
    m.castShadow = !NO_SHADOW_KEYS.has(m.name.replace(/^kit_/, ""));
    m.receiveShadow = true;
  }
  let tris = 0;
  for (const m of meshes) if (m.geometry) tris += m.geometry.attributes.position.count / 3;
  return {
    group,
    meshes,
    stats: { meshes: meshes.length, triangles: Math.round(tris) },
    update() {},
  };
}
