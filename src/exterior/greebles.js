// Instanced exterior detail: layered armour plates on the two hull planes, the superstructure "city"
// (blocks, towers, bays, gantries, domes, masts, dishes, buttresses), trench machinery, hatches, docking
// pads and service points. Every repeated element is an InstancedMesh; layouts are deterministic grids
// with seeded variation so nothing overlaps: each area keeps an occupancy list.
import * as THREE from "three";
import { HULL, SUPERSTRUCTURE, TOWER } from "../config/shipSpec.js";
import { TRENCH_HALF, TRENCH_DEPTH, EDGE_YAW, UP, dorsal, surfaceY, surfaceNormal, surfaceQuat, frameQuat, merge, box, bevelBox, atlasBox, atlasQuad, macroTint, instancedFromList, layerMesh, overlapsAny } from "./util.js";
import { CENTRE_CHANNEL, FLANK_CHANNEL, REACTOR } from "./ventral.js";

const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _n = new THREE.Vector3();
const _c = new THREE.Color();

function item(list, p, q, s, c) {
  list.push({ m: new THREE.Matrix4().compose(p, q, s), c: c.clone() });
}

// Dorsal spine ridge footprint (built in hull.js); the plates and fittings keep clear of it.
export const SPINE = { halfBase: 15, halfTop: 8.5, height: 3.6, z0: -700, z1: 146 };

// Terrace descriptors: spec box plus the sloped front (rises from the footprint edge to the top over `inset`).
export function terraceDescriptors() {
  return SUPERSTRUCTURE.terraces.map(([hx, z0, z1, yTop]) => ({ hx, z0, z1, yTop, inset: yTop * 0.25 }));
}

// Iterate a planar rect with rows of random depth and cells of random width. fn(cell) with cell in (u, v).
function gridFill(rand, u0, u1, v0, v1, [cMin, cMax], gap, fn) {
  let v = v0;
  while (v < v1 - cMin * 0.6) {
    const d = Math.min(cMin + rand() * (cMax - cMin), v1 - v);
    let u = u0;
    while (u < u1 - cMin * 0.5) {
      let w = cMin + rand() * (cMax - cMin);
      if (u + w > u1) w = u1 - u;
      if (w < cMin * 0.5) break;
      fn({ u0: u, u1: u + w, v0: v, v1: v + d, w: w - gap, d: d - gap, uc: u + w / 2, vc: v + d / 2 });
      u += w + gap;
    }
    v += d + gap;
  }
}

// ---------------------------------------------------------------------------
// hull armour plates
// ---------------------------------------------------------------------------
// Recursive partition of a rectangle into plates of four size classes. Every sub-rectangle first draws
// its own target size, so a large plate survives wherever the draw comes before the split and seams never
// line up across the hull (T-junctions instead of a lattice). Emits { x0, x1, z0, z1 }.
const PLATE_CLASSES = [
  [0.1, 68, 112],
  [0.4, 36, 68],
  [0.8, 18, 36],
  [1.0, 10, 18],
];
// the belly is paint groups, not armour: mostly 40–90 m groups whose sub-panels come from the plating map
const BELLY_CLASSES = [
  [0.4, 60, 90],
  [0.8, 40, 60],
  [1.0, 24, 40],
];
function partition(rand, rect, out, classes = PLATE_CLASSES) {
  const w = rect.x1 - rect.x0;
  const d = rect.z1 - rect.z0;
  const r = rand();
  const cls = classes.find(([p]) => r <= p) || classes[classes.length - 1];
  const target = cls[1] + rand() * (cls[2] - cls[1]);
  const longest = Math.max(w, d);
  if (longest <= target || longest < 14) {
    out.push({ ...rect });
    return;
  }
  // split the longer side (or the aspect-heavy one) at a random ratio
  const ratio = 0.35 + rand() * 0.3;
  if (w >= d) {
    const xm = rect.x0 + w * ratio;
    partition(rand, { x0: rect.x0, x1: xm, z0: rect.z0, z1: rect.z1 }, out, classes);
    partition(rand, { x0: xm, x1: rect.x1, z0: rect.z0, z1: rect.z1 }, out, classes);
  } else {
    const zm = rect.z0 + d * ratio;
    partition(rand, { x0: rect.x0, x1: rect.x1, z0: rect.z0, z1: zm }, out, classes);
    partition(rand, { x0: rect.x0, x1: rect.x1, z0: zm, z1: rect.z1 }, out, classes);
  }
}

// Dorsal plates are raised chamfered slabs / skins / strips; ventral plates are flat "paint" quads drawn
// with polygonOffset (no side faces, so nothing sparkles at grazing angles) whose value jitter gives the
// belly its legible plating. Returns the cells (plate or bare) for the fittings pass.
// up-facing flat plate with a darker border (vertex colours), for the belly's paint groups: the border is
// the group seam, the plating map inside it supplies the sub-panels
function borderedPlane(size, border, tone) {
  const h = size / 2;
  const i = h - border;
  const quads = [
    [-i, -i, i, i, 1],
    [-h, -h, h, -i, tone],
    [-h, i, h, h, tone],
    [-h, -i, -i, i, tone],
    [i, -i, h, i, tone],
  ];
  const pos = [];
  const col = [];
  for (const [x0, z0, x1, z1, t] of quads) {
    // faces +y: counter-clockwise seen from above
    pos.push(x0, 0, z0, x0, 0, z1, x1, 0, z1, x0, 0, z0, x1, 0, z1, x1, 0, z0);
    for (let k = 0; k < 6; k++) col.push(t, t, t);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(pos.length / 3 * 2), 2)); // world-projected material; attribute only has to exist
  g.computeVertexNormals();
  return g;
}

export function buildHullPlates(ctx) {
  const { rand, mats, detail, exclude } = ctx;
  const fams = {
    slab: { geo: bevelBox(30, 1.5, 30, 0.55), w: 30, d: 30, th: 1.5, list: [] },
    skin: { geo: bevelBox(30, 0.6, 30, 0.25), w: 30, d: 30, th: 0.6, list: [] },
    strip: { geo: bevelBox(8, 0.9, 60, 0.35), w: 8, d: 60, th: 0.9, list: [] },
    paint: { geo: borderedPlane(30, 1.1, 0.74), w: 30, d: 30, th: 0, list: [] },
  };
  const cells = [];
  const gap = 2.4;
  for (const top of [true, false]) {
    for (const side of [-1, 1]) {
      // partition short z-bands of the flank (each as wide as its narrow, forward end) so the wedge edge
      // is followed in steps of random length; the leftover slivers along the edge show the bare hull
      const rects = [];
      let zb = HULL.bowZ + 30;
      while (zb < HULL.sternZ - 40) {
        const z1 = Math.min(zb + (top ? 80 + rand() * 70 : 110 + rand() * 90), HULL.sternZ - 10);
        partition(rand, { x0: 4, x1: HULL.halfWidthAt(zb) - 9, z0: zb, z1 }, rects, top ? PLATE_CLASSES : BELLY_CLASSES);
        zb = z1;
      }
      // the ventral flank channels (ventral.js) run at 56 % of the half-width: rects crossing that band are
      // split around it so no paint plate lies across a channel
      if (!top) {
        const split = [];
        for (const r of rects) {
          const b0 = HULL.halfWidthAt(r.z0) * FLANK_CHANNEL.s - FLANK_CHANNEL.halfW - 3;
          const b1 = HULL.halfWidthAt(r.z1) * FLANK_CHANNEL.s + FLANK_CHANNEL.halfW + 3;
          if (r.z1 < FLANK_CHANNEL.z0 || r.z0 > FLANK_CHANNEL.z1 || r.x1 <= b0 || r.x0 >= b1) {
            split.push(r);
            continue;
          }
          if (b0 - r.x0 > 9) split.push({ ...r, x1: b0 });
          if (r.x1 - b1 > 9) split.push({ ...r, x0: b1 });
        }
        rects.length = 0;
        rects.push(...split);
      }
      for (const r of rects) {
        let x1 = r.x1;
        let x0 = r.x0;
        if (top && r.z1 > 144 && r.z0 < 566) x0 = Math.max(x0, 167);
        if (top && r.z1 > SPINE.z0 - 4 && r.z0 < SPINE.z1 + 4) x0 = Math.max(x0, SPINE.halfBase + 3);
        if (!top && r.z1 > HULL.keelPlate.z0 - 6 && r.z0 < HULL.keelPlate.z1 + 6) x0 = Math.max(x0, HULL.keelPlate.x + 5);
        if (!top && r.z1 > REACTOR.z - REACTOR.hole - 4 && r.z0 < REACTOR.z + REACTOR.hole + 4) x0 = Math.max(x0, REACTOR.hole + 4); // reactor recess
        if (!top && r.z1 > CENTRE_CHANNEL.z0 - 4 && r.z0 < CENTRE_CHANNEL.z1 + 4) x0 = Math.max(x0, CENTRE_CHANNEL.halfW + 4); // centreline channel
        const w = x1 - x0 - gap;
        const d = r.z1 - r.z0 - gap;
        if (w < 7 || d < 7) continue;
        const rect = { x0: side > 0 ? x0 : -x1, x1: side > 0 ? x1 : -x0, z0: r.z0, z1: r.z1 };
        const cell = { ...rect, top, plate: null, th: 0 };
        if (overlapsAny(rect, top ? exclude.top : exclude.bottom, 3)) continue;
        const rr = rand();
        if (rr > 0.28) {
          let fam;
          if (!top) fam = "paint";
          else if (w < 16 && d > 30) fam = "strip";
          else if (d < 16 && w > 30) fam = "strip";
          else fam = rr < 0.68 ? "slab" : "skin";
          const cx = side * (x0 + x1) / 2;
          const cz = (r.z0 + r.z1) / 2;
          const f = fams[fam];
          surfaceQuat(cx, cz, top, _q);
          surfaceNormal(cx, cz, top, _n);
          _p.set(cx, surfaceY(cx, cz, top), cz).addScaledVector(_n, fam === "paint" ? 0.05 : 0.04);
          if (fam === "strip" && d < w) {
            // strips run along z; yaw the long axis across for the wide-and-shallow case
            _q2.setFromAxisAngle(UP, Math.PI / 2);
            _q.multiply(_q2);
            _s.set(d / f.w, 1, w / f.d);
          } else _s.set(w / f.w, 1, d / f.d);
          macroTint(cx, _p.y, cz, _n.y, _c);
          // per-plate paint batch: ±10 % value jitter (±18 % on the belly's big groups) with a faint warm/cool drift
          _c.multiplyScalar(top ? 0.9 + rand() * 0.2 : 0.82 + rand() * 0.36);
          const hue = (rand() - 0.5) * 0.05;
          _c.r *= 1 + hue;
          _c.b *= 1 - hue * 1.3;
          item(f.list, _p, _q, _s, _c);
          cell.plate = fam;
          cell.th = f.th;
        }
        cells.push(cell);
      }
    }
  }
  // the three raised families share one mesh (and one shadow pass); the flat paint quads keep their own
  layerMesh(
    ["slab", "skin", "strip"].map((n) => ({ geo: fams[n].geo, list: fams[n].list })),
    mats.plate,
    detail.mid,
    "plates",
  );
  instancedFromList(fams.paint.geo, mats.paint, fams.paint.list, detail.mid, "plates_paint");
  return cells;
}

// Hatches (4 m), vents and service-access clusters: hardpoints cluster along the trench edges and around
// the superstructure base with randomised spacing; the open dorsal plane stays nearly bare so no lattice
// forms at distance. A few hatches ride on plate tops.
export function buildHullFittings(ctx, cells) {
  const { rand, mats, detail, atlas } = ctx;
  const A = atlas.cells;
  const hatchGeo = atlasBox(4, 0.35, 4, { py: A.hatch, ny: A.dark, side: A.dark });
  const ventGeo = atlasBox(3, 0.7, 5, { py: A.vent, ny: A.dark, side: A.dark });
  const serviceGeo = atlasBox(8, 0.5, 8, { py: A.service, ny: A.dark, side: A.plate });
  const sensorGeo = atlasBox(6, 0.8, 6, { py: A.sensor, ny: A.dark, side: A.dark });
  const hatches = [];
  const vents = [];
  const services = [];
  const sensors = [];
  const place = (list, cx, cz, top, lift, yaw, tone) => {
    surfaceNormal(cx, cz, top, _n);
    frameQuat(_n, _q);
    _q2.setFromAxisAngle(UP, yaw);
    _q.multiply(_q2);
    _p.set(cx, surfaceY(cx, cz, top), cz).addScaledVector(_n, lift);
    _s.set(1, 1, 1);
    macroTint(cx, _p.y, cz, _n.y, _c);
    _c.multiplyScalar(tone);
    item(list, _p, _q, _s, _c);
  };
  // density of hardpoints at a hull position: high beside the trench and around the superstructure
  const density = (x, z, top) => {
    const edge = HULL.halfWidthAt(z) - Math.abs(x);
    let k = 0.04;
    if (edge < 90) k = Math.max(k, 0.9 * (1 - edge / 90));
    if (top) {
      const dxSup = Math.max(0, Math.abs(x) - 165);
      const dzSup = Math.max(0, 140 - z, z - 600);
      const dSup = Math.hypot(dxSup, dzSup);
      if (dSup < 80) k = Math.max(k, 0.85 * (1 - dSup / 80));
    } else {
      const dKeel = Math.hypot(Math.max(0, Math.abs(x) - 70), Math.max(0, HULL.keelPlate.z0 - 20 - z, z - HULL.keelPlate.z1 - 20));
      if (dKeel < 70) k = Math.max(k, 0.7 * (1 - dKeel / 70));
    }
    return k;
  };
  for (const cell of cells) {
    const w = cell.x1 - cell.x0;
    const d = cell.z1 - cell.z0;
    if (w < 12 || d < 12) continue;
    const cx = (cell.x0 + cell.x1) / 2;
    const cz = (cell.z0 + cell.z1) / 2;
    const k = density(cx, cz, cell.top);
    if (rand() > k) continue;
    const r = rand();
    if (cell.plate) {
      if (cell.plate === "paint" || r < 0.5) {
        const n = 1 + Math.floor(rand() * 3);
        for (let q = 0; q < n; q++) place(hatches, cell.x0 + 4 + rand() * (w - 8), cell.z0 + 4 + rand() * (d - 8), cell.top, cell.th + 0.02 + 0.175, rand() < 0.5 ? 0 : Math.PI / 2, 1);
      }
      continue;
    }
    if (r < 0.4) {
      // a run of hatches with irregular pitch
      const n = 2 + Math.floor(rand() * 4);
      const yaw = rand() < 0.5 ? 0 : Math.PI / 2;
      let x = cell.x0 + 3 + rand() * Math.max(0, w - 6 - n * 5.5);
      const z = cell.z0 + 3 + rand() * (d - 6);
      for (let q = 0; q < n && x + 4 < cell.x1 - 2; q++) {
        place(hatches, x + 2, z + (rand() - 0.5) * 2, cell.top, 0.175, yaw, 1);
        x += 4.6 + rand() * 4;
      }
    } else if (r < 0.55) {
      place(services, cell.x0 + w / 2 + (rand() - 0.5) * (w - 10), cell.z0 + d / 2 + (rand() - 0.5) * (d - 10), cell.top, 0.25, rand() < 0.5 ? 0 : Math.PI, 1);
    } else if (r < 0.8) {
      const n = 1 + Math.floor(rand() * 4);
      for (let q = 0; q < n; q++) place(vents, cell.x0 + 3 + rand() * (w - 6), cell.z0 + 3 + rand() * (d - 6), cell.top, 0.35, rand() < 0.5 ? 0 : Math.PI / 2, 0.9);
    } else {
      place(sensors, cell.x0 + w / 2, cell.z0 + d / 2, cell.top, 0.4, rand() * Math.PI, 1);
    }
  }
  layerMesh(
    [
      { geo: hatchGeo, list: hatches },
      { geo: ventGeo, list: vents },
      { geo: serviceGeo, list: services },
      { geo: sensorGeo, list: sensors },
    ],
    mats.atlas,
    detail.near,
    "hatches",
  );
}

// Docking pads: flat landing areas of three kinds (square pad with the painted ring, round pad, long
// lit strip) in different sizes and headings beside and ahead of the superstructure. The layout is not
// mirrored, so from a distance the deck shows a handful of different marks rather than one repeated
// stamp. padRects() returns their footprints so the plates avoid them.
export const PADS = [
  { x: -225, z: 300, w: 60, d: 60, kind: "square" },
  { x: 240, z: 322, w: 40, d: 88, kind: "strip", yaw: 0.1 },
  { x: -262, z: 458, w: 48, d: 48, kind: "round" },
  { x: 258, z: 472, w: 62, d: 62, kind: "square", yaw: 0.36 },
  { x: -58, z: 28, w: 36, d: 36, kind: "round" },
  { x: 116, z: -72, w: 26, d: 26, kind: "square", yaw: -0.2 },
];
function remapUV(g, rect) {
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, rect[0] + uv.getX(i) * (rect[2] - rect[0]), rect[1] + uv.getY(i) * (rect[3] - rect[1]));
  return g;
}
// unit-diameter round pad: plate-grey rim, pad markings on the cap
function roundPadGeo(A) {
  const side = remapUV(new THREE.CylinderGeometry(0.5, 0.5, 1, 40, 1, true), A.plate);
  const cap = remapUV(new THREE.CircleGeometry(0.5, 40), A.pad).rotateX(-Math.PI / 2).translate(0, 0.5, 0);
  return merge([side, cap]);
}
// landing strip: plain slab, lit rails along both long edges, a hazard centreline, threshold bars
function stripPadGeo(A, w, d) {
  const parts = [atlasBox(w, 0.6, d, { py: A.plate, ny: A.dark, side: A.plate })];
  for (const s of [-1, 1]) parts.push(atlasBox(d - 4, 0.25, 1.6, { py: A.edgeLights, side: A.dark }).rotateY(Math.PI / 2).translate(s * (w / 2 - 1.6), 0.4, 0));
  parts.push(atlasBox(3, 0.2, d - 12, { py: A.hazard, side: A.dark }).translate(0, 0.4, 0));
  for (const s of [-1, 1]) parts.push(atlasBox(w - 6, 0.2, 2.5, { py: A.dark, side: A.dark }).translate(0, 0.4, s * (d / 2 - 3.5)));
  return merge(parts);
}
export function buildDockingPads(ctx) {
  const { mats, detail, atlas } = ctx;
  const A = atlas.cells;
  const layers = { square: { geo: atlasBox(1, 1, 1, { py: A.pad, ny: A.dark, side: A.plate }), list: [] }, round: { geo: roundPadGeo(A), list: [] } };
  const strips = [];
  for (const p of PADS) {
    surfaceNormal(p.x, p.z, true, _n);
    frameQuat(_n, _q);
    if (p.yaw) {
      _q2.setFromAxisAngle(UP, p.yaw);
      _q.multiply(_q2);
    }
    _p.set(p.x, dorsal(p.x, p.z), p.z).addScaledVector(_n, 0.3);
    _c.setRGB(1, 1, 1);
    if (p.kind === "strip") {
      _s.set(1, 1, 1);
      const list = [];
      item(list, _p, _q, _s, _c);
      strips.push({ geo: stripPadGeo(A, p.w, p.d), list });
    } else {
      _s.set(p.w, 0.6, p.kind === "round" ? p.w : p.d);
      item(layers[p.kind].list, _p, _q, _s, _c);
    }
  }
  layerMesh([layers.square, layers.round, ...strips], mats.atlas, detail.mid, "dockingPads");
}
export function padRects(margin = 3) {
  return PADS.map((p) => {
    const r = Math.hypot(p.w, p.d) / 2 + margin;
    return { x0: p.x - r, x1: p.x + r, z0: p.z - r, z1: p.z + r };
  });
}

// ---------------------------------------------------------------------------
// superstructure city
// ---------------------------------------------------------------------------
export function buildSuperstructure(ctx) {
  const { rand, mats, detail, atlas, windowQuad } = ctx;
  const A = atlas.cells;
  const terraces = terraceDescriptors();
  const { neck, slab } = TOWER;

  // instance geometries (unit-sized, scaled per instance)
  const blockGeo = merge([box(0, 0.5, 0, 1, 1, 1), box(0, 1.13, 0, 0.62, 0.26, 0.62)]);
  const towerGeo = merge([box(0, 0.5, 0, 0.5, 1, 0.5), box(0, 1.02, 0, 0.72, 0.05, 0.72), box(0, 1.1, 0, 0.3, 0.12, 0.3), box(0, 0.7, 0, 0.62, 0.06, 0.62)]);
  const bayGeo = atlasBox(1, 1, 1, { pz: A.bay, py: A.plate, side: A.dark });
  const machGeo = atlasBox(1, 1, 1, { all: A.machinery, py: A.dark });
  const gantryGeo = merge([
    box(-0.45, 0.5, -0.45, 0.1, 1, 0.1),
    box(0.45, 0.5, -0.45, 0.1, 1, 0.1),
    box(-0.45, 0.5, 0.45, 0.1, 1, 0.1),
    box(0.45, 0.5, 0.45, 0.1, 1, 0.1),
    box(0, 0.97, 0, 1, 0.06, 0.14),
    box(0, 0.97, 0, 0.14, 0.06, 1),
    box(0, 0.6, 0, 1, 0.04, 0.08),
  ]);
  const domeGeo = merge([new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), new THREE.CylinderGeometry(0.72, 0.8, 0.5, 20).translate(0, 0.25, 0)]);
  const mastGeo = merge([new THREE.CylinderGeometry(0.3, 0.55, 1, 8).translate(0, 0.5, 0), box(0, 0.86, 0, 1.6, 0.06, 0.06), box(0, 0.7, 0, 0.06, 0.06, 1.2), box(0, 0.3, 0, 1.2, 0.05, 0.05)]);
  const dishPts = [];
  for (let i = 0; i <= 8; i++) {
    const r = i / 8;
    dishPts.push(new THREE.Vector2(r, 0.32 * r * r));
  }
  const dishGeo = merge([new THREE.LatheGeometry(dishPts, 20).translate(0, 0.02, 0), new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6).translate(0, 0.2, 0), new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6).translate(0, -0.3, 0), new THREE.SphereGeometry(0.06, 8, 6).translate(0, 0.46, 0)]);
  const ribGeo = box(0, 0.5, 0, 1, 1, 1);
  const wallBoxGeo = box(0, 0, 0, 1, 1, 1);
  const pipeGeo = new THREE.CylinderGeometry(1, 1, 1, 12).rotateX(Math.PI / 2);
  const smallPlateGeo = bevelBox(10, 0.4, 10, 0.18);
  const bezelGeo = atlasBox(1, 1, 1, { all: A.plate });
  const recessGeo = new THREE.PlaneGeometry(1, 1); // flat dark panel, faces +z
  const wallVentGeo = atlasQuad(1, 1, A.vent);
  const drumGeo = merge([new THREE.CylinderGeometry(0.5, 0.5, 1, 18).translate(0, 0.5, 0), new THREE.CylinderGeometry(0.42, 0.42, 0.08, 18).translate(0, 1.03, 0), new THREE.TorusGeometry(0.5, 0.03, 6, 18).rotateX(Math.PI / 2).translate(0, 0.34, 0), new THREE.TorusGeometry(0.5, 0.03, 6, 18).rotateX(Math.PI / 2).translate(0, 0.68, 0)]);
  const vPipeGeo = new THREE.CylinderGeometry(1, 1, 1, 10).translate(0, 0.5, 0); // vertical pipe, base at origin
  const ladderGeo = merge([box(-0.32, 5, 0, 0.14, 10, 0.14), box(0.32, 5, 0, 0.14, 10, 0.14), ...Array.from({ length: 10 }, (_, i) => box(0, 0.5 + i, 0, 0.78, 0.08, 0.08))]);
  const Z_AXIS = new THREE.Vector3(0, 0, 1);

  const L = { blocks: [], towers: [], bays: [], mach: [], gantries: [], domes: [], masts: [], dishes: [], ribs: [], wallBoxes: [], pipes: [], smallPlates: [], bezels: [], recess: [], wallVents: [], drums: [], vPipes: [], ladders: [] };
  const lightTone = () => 0.92 + rand() * 0.14;

  const setYaw = (yaw) => _q.setFromAxisAngle(UP, yaw);
  const addAt = (list, x, y, z, sx, sy, sz, yaw, tone = lightTone(), q = null) => {
    if (q) _q.copy(q);
    else setYaw(yaw);
    _p.set(x, y, z);
    _s.set(sx, sy, sz);
    macroTint(x, y, z, 1, _c);
    _c.multiplyScalar(tone);
    item(list, _p, _q, _s, _c);
  };

  // --- terrace tops: ring areas between one terrace edge and the next terrace footprint
  const areas = [];
  for (let i = 0; i < terraces.length; i++) {
    const t = terraces[i];
    const next = terraces[i + 1];
    const zTop0 = t.z0 + t.inset + 3;
    const zTop1 = t.z1 - 3;
    if (next) {
      areas.push({ x0: -t.hx + 3, x1: -next.hx - 3, z0: zTop0, z1: zTop1, y: t.yTop, out: "-x" });
      areas.push({ x0: next.hx + 3, x1: t.hx - 3, z0: zTop0, z1: zTop1, y: t.yTop, out: "+x" });
      areas.push({ x0: -next.hx - 3, x1: next.hx + 3, z0: zTop0, z1: next.z0 - 3, y: t.yTop, out: "-z" });
    } else {
      areas.push({ x0: -t.hx + 3, x1: -neck.halfX - 4, z0: zTop0, z1: zTop1, y: t.yTop, out: "-x" });
      areas.push({ x0: neck.halfX + 4, x1: t.hx - 3, z0: zTop0, z1: zTop1, y: t.yTop, out: "+x" });
      areas.push({ x0: -neck.halfX - 4, x1: neck.halfX + 4, z0: zTop0, z1: neck.z0 - 4, y: t.yTop, out: "-z" });
    }
  }
  const outYaw = { "-x": -Math.PI / 2, "+x": Math.PI / 2, "-z": Math.PI, "+z": 0 };
  const blockTops = []; // { x, z, w, d, y } for domes / masts / dishes
  const freeCells = [];
  // asymmetric masses: a few hand-placed structures that differ port / starboard so the tiers stop reading
  // as a mirrored staircase (the grid fill keeps clear of their footprints)
  const t1 = terraces[0];
  const t2 = terraces[1];
  const t3 = terraces[2];
  const specials = [
    { kind: "hangarBlock", x: -139, z: 330, w: 30, d: 64, h: 15, y: t1.yTop },
    { kind: "commsBlock", x: 100, z: 262, w: 27, d: 26, h: 24, y: t2.yTop },
    { kind: "stepBlock", x: -62, z: 410, w: 22, d: 40, h: 12, y: t3.yTop },
    { kind: "tanks", x: 140, z: 470, w: 32, d: 40, h: 12, y: t1.yTop },
    { kind: "lowBay", x: -101, z: 340, w: 28, d: 52, h: 8, y: t2.yTop },
  ];
  const specialRects = specials.map((s) => ({ x0: s.x - s.w / 2 - 2, x1: s.x + s.w / 2 + 2, z0: s.z - s.d / 2 - 2, z1: s.z + s.d / 2 + 2 }));
  for (const s of specials) {
    if (s.kind === "tanks") {
      for (const [dx, dz, r] of [
        [-8, -11, 7],
        [8, -11, 7],
        [-8, 8, 7],
        [8, 8, 7],
      ]) addAt(L.drums, s.x + dx, s.y, s.z + dz, r * 2, s.h + (rand() - 0.5) * 3, r * 2, 0, 0.9 + rand() * 0.1);
      addAt(L.wallBoxes, s.x, s.y + 1.2, s.z, s.w - 4, 2.4, 3, 0, 0.8);
      continue;
    }
    addAt(L.blocks, s.x, s.y, s.z, s.w, s.h, s.d, 0, s.kind === "commsBlock" ? 0.96 : 0.86 + rand() * 0.12);
    blockTops.push({ x: s.x, z: s.z, w: s.w, d: s.d, y: s.y + s.h });
    // dark recess along the outboard face, lit row above it
    const side = s.x < 0 ? -1 : 1;
    const xf = s.x + side * (s.w / 2 + 0.06);
    _q.setFromAxisAngle(UP, side > 0 ? Math.PI / 2 : -Math.PI / 2);
    _p.set(xf, s.y + s.h * 0.42, s.z);
    _s.set(s.d - 6, s.h * 0.45, 1);
    _c.setRGB(1, 1, 1);
    item(L.recess, _p, _q, _s, _c);
    windowQuad(s.d - 10, 2.5, [s.x + side * (s.w / 2 + 0.3), s.y + s.h - 2.6, s.z], [0, side > 0 ? Math.PI / 2 : -Math.PI / 2, 0]);
    if (s.kind === "commsBlock") {
      addAt(L.masts, s.x - 6, s.y + s.h, s.z + 4, 1.4, 28, 1.4, 0.4, 0.75);
      _q.setFromAxisAngle(UP, 2.2);
      _q2.setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.6);
      _q.multiply(_q2);
      addAt(L.dishes, s.x + 6, s.y + s.h + 3.5, s.z - 5, 6, 6, 6, 0, 0.9, _q);
    }
  }
  for (const a of areas) {
    gridFill(rand, a.x0, a.x1, a.z0, a.z1, [8, 26], 2.2, (cell) => {
      if (cell.w < 5 || cell.d < 5) return;
      if (overlapsAny({ x0: cell.u0, x1: cell.u1, z0: cell.v0, z1: cell.v1 }, specialRects)) return;
      const x = cell.uc;
      const z = cell.vc;
      const r = rand();
      const big = Math.min(cell.w, cell.d);
      if (r < 0.25) {
        freeCells.push({ x0: cell.u0, x1: cell.u1, z0: cell.v0, z1: cell.v1, y: a.y });
        return;
      }
      if (r < 0.62) {
        const h = 4 + rand() * 10 + big * 0.25;
        addAt(L.blocks, x, a.y, z, cell.w, h, cell.d, 0, 0.82 + rand() * 0.24);
        blockTops.push({ x, z, w: cell.w, d: cell.d, y: a.y + h });
        return;
      }
      if (r < 0.68) {
        const h = 12 + rand() * 22;
        addAt(L.towers, x, a.y, z, cell.w, h, cell.d, 0, 0.86 + rand() * 0.2);
        // lit rows on the shaft faces
        const fw = cell.w * 0.5;
        const fd = cell.d * 0.5;
        for (const yy of [a.y + h * 0.42, a.y + h * 0.7]) {
          windowQuad(fw - 1, 2.5, [x, yy, z - fd / 2 - 0.15], [0, Math.PI, 0]);
          windowQuad(fw - 1, 2.5, [x, yy, z + fd / 2 + 0.15], [0, 0, 0]);
          windowQuad(fd - 1, 2.5, [x - fw / 2 - 0.15, yy, z], [0, -Math.PI / 2, 0]);
          windowQuad(fd - 1, 2.5, [x + fw / 2 + 0.15, yy, z], [0, Math.PI / 2, 0]);
        }
        return;
      }
      if (r < 0.8) {
        const h = 6 + rand() * 7;
        const yaw = outYaw[a.out];
        // the lit face is +z in the geometry: yaw it toward the terrace edge, sizes swap with the yaw
        const along = Math.abs(Math.sin(yaw)) > 0.5 ? cell.d : cell.w;
        const deep = Math.abs(Math.sin(yaw)) > 0.5 ? cell.w : cell.d;
        addAt(L.bays, x, a.y + h / 2, z, along, h, deep, yaw, 1);
        blockTops.push({ x, z, w: cell.w, d: cell.d, y: a.y + h });
        return;
      }
      if (r < 0.89) {
        const h = 3.5 + rand() * 5;
        addAt(L.mach, x, a.y + h / 2, z, cell.w * 0.7, h, cell.d * 0.7, rand() < 0.5 ? 0 : Math.PI / 2, 1);
        return;
      }
      if (r < 0.95) {
        const h = 9 + rand() * 9;
        addAt(L.gantries, x, a.y, z, cell.w, h, cell.d, 0, 0.72 + rand() * 0.25);
        return;
      }
      const rr = big * 0.32;
      addAt(L.domes, x, a.y, z, rr, rr, rr, 0, 1);
    });
  }
  // rooftop furniture: domes, masts, dishes on block tops and in free cells
  for (const b of blockTops) {
    const r = rand();
    const m = Math.min(b.w, b.d);
    if (m < 5) continue;
    if (r < 0.2) {
      const rr = m * (0.2 + rand() * 0.15);
      addAt(L.domes, b.x + (rand() - 0.5) * (b.w - 2 * rr), b.y, b.z + (rand() - 0.5) * (b.d - 2 * rr), rr, rr, rr, 0, 1);
    } else if (r < 0.34) {
      const h = 6 + rand() * 12;
      addAt(L.masts, b.x + (rand() - 0.5) * (b.w - 3), b.y, b.z + (rand() - 0.5) * (b.d - 3), 1, h, 1, rand() * Math.PI, 0.75);
    } else if (r < 0.46) {
      // stepped second tier on top of the block
      const tw = b.w * (0.45 + rand() * 0.3);
      const td = b.d * (0.45 + rand() * 0.3);
      const th = 2.5 + rand() * 5;
      addAt(L.blocks, b.x + (rand() - 0.5) * (b.w - tw), b.y, b.z + (rand() - 0.5) * (b.d - td), tw, th, td, 0, 0.82 + rand() * 0.24);
    } else if (r < 0.62) {
      const rr = 2.5 + rand() * Math.min(5, m * 0.3);
      // dishes point up and outward: tilt about a random horizontal axis
      _q.setFromAxisAngle(UP, rand() * Math.PI * 2);
      _q2.setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.35 + rand() * 0.7);
      _q.multiply(_q2);
      addAt(L.dishes, b.x, b.y + rr * 0.55, b.z, rr, rr, rr, 0, 0.9, _q);
    }
  }
  for (const f of freeCells) {
    const w = f.x1 - f.x0;
    const d = f.z1 - f.z0;
    const r = rand();
    if (r < 0.35 && w > 6 && d > 6) {
      // small plate layer on bare terrace deck
      const n = 1 + Math.floor(rand() * 2);
      for (let k = 0; k < n; k++) {
        const pw = 4 + rand() * Math.min(10, w - 2);
        const pd = 4 + rand() * Math.min(10, d - 2);
        const px = f.x0 + pw / 2 + rand() * Math.max(0, w - pw);
        const pz = f.z0 + pd / 2 + rand() * Math.max(0, d - pd);
        setYaw(0);
        _p.set(px, f.y + 0.02, pz);
        _s.set(pw / 10, 1, pd / 10);
        macroTint(px, f.y, pz, 1, _c);
        _c.multiplyScalar(lightTone());
        item(L.smallPlates, _p, _q, _s, _c);
      }
    } else if (r < 0.46) {
      const h = 8 + rand() * 16;
      addAt(L.masts, f.x0 + w / 2, f.y, f.z0 + d / 2, 1, h, 1, rand() * Math.PI, 0.75);
    } else if (r < 0.7) {
      const rr = Math.min(w, d) * 0.3;
      addAt(L.domes, f.x0 + w / 2, f.y, f.z0 + d / 2, rr, rr, rr, 0, 1);
    }
  }

  // --- terrace walls: buttress ribs, bays, machinery boxes, pipes, small plates, window rows
  for (const t of terraces) {
    for (const side of [-1, 1]) {
      const xw = side * t.hx;
      const yaw = side > 0 ? Math.PI / 2 : -Math.PI / 2;
      let z = t.z0 + t.inset + 6;
      const ribZs = [];
      while (z < t.z1 - 6) {
        const yBase = dorsal(xw, z) - 1;
        const h = t.yTop - 1.5 - yBase;
        addAt(L.ribs, xw + side * 1.1, yBase, z, 2.2, h, 3.2, 0, lightTone());
        ribZs.push(z);
        z += 22 + rand() * 18;
      }
      // window rows in two bands near the top
      const len = t.z1 - (t.z0 + t.inset) - 8;
      const zc = (t.z0 + t.inset + t.z1) / 2;
      windowQuad(len, 5, [xw + side * 0.25, t.yTop - 8, zc], [0, yaw, 0]);
      windowQuad(len, 2.5, [xw + side * 0.25, t.yTop - 16, zc], [0, yaw, 0]);
      // dark recessed panels (port carries more of them) and louvred vents, clear of the window bands
      const wallLen = t.z1 - (t.z0 + t.inset);
      const nRec = side < 0 ? 3 + Math.floor(rand() * 3) : 1 + Math.floor(rand() * 2);
      for (let i = 0; i < nRec; i++) {
        const w = 12 + rand() * 26;
        const h = 4 + rand() * 6;
        const zr = t.z0 + t.inset + 10 + w / 2 + rand() * Math.max(1, wallLen - 20 - w);
        const yBase = dorsal(xw, zr) + 3;
        const yc = yBase + h / 2 + 2 + rand() * Math.max(1, t.yTop - 20 - yBase - h);
        if (Math.abs(yc - (t.yTop - 8)) < h / 2 + 3 || Math.abs(yc - (t.yTop - 16)) < h / 2 + 2) continue;
        setYaw(yaw);
        _p.set(xw + side * 0.06, yc, zr);
        _s.set(w, h, 1);
        _c.setRGB(1, 1, 1);
        item(L.recess, _p, _q, _s, _c);
      }
      const nVent = 2 + Math.floor(rand() * 3);
      for (let i = 0; i < nVent; i++) {
        const w = 4 + rand() * 5;
        const h = 3 + rand() * 2.5;
        const zr = t.z0 + t.inset + 8 + rand() * (wallLen - 16);
        const yBase = dorsal(xw, zr) + 3;
        const yc = yBase + h / 2 + 1 + rand() * Math.max(1, t.yTop - 22 - yBase - h);
        setYaw(yaw);
        _p.set(xw + side * 0.08, yc, zr);
        _s.set(w, h, 1);
        _c.setRGB(1, 1, 1);
        item(L.wallVents, _p, _q, _s, _c);
      }
      // bays and boxes between ribs
      for (let i = 0; i + 1 < ribZs.length; i++) {
        const za = ribZs[i] + 2.5;
        const zb = ribZs[i + 1] - 2.5;
        const span = zb - za;
        if (span < 8) continue;
        const zm = (za + zb) / 2;
        const yBase = dorsal(xw, zm) + 3;
        const r = rand();
        if (r < 0.35) {
          const bw = Math.min(16, span - 2);
          const bh = 6 + rand() * 6;
          const by = yBase + 6 + rand() * Math.max(1, t.yTop - 24 - yBase - 6);
          addAt(L.bays, xw + side * 0.7, by, zm, bw, bh, 1.6, yaw, 1);
        } else if (r < 0.75) {
          const n = 1 + Math.floor(rand() * 3);
          for (let k = 0; k < n; k++) {
            const sx = 2 + rand() * 3.5;
            const sy = 2 + rand() * 5;
            const sz = Math.min(span - 2, 4 + rand() * 10);
            const by = yBase + 2 + rand() * Math.max(1, t.yTop - 22 - yBase);
            addAt(L.wallBoxes, xw + side * (sx / 2 + 0.1), by, za + sz / 2 + rand() * Math.max(0, span - sz), sx, sy, sz, 0, 0.7 + rand() * 0.35);
          }
        } else {
          // small plate on the wall face
          const pw = Math.min(12, span - 2);
          const ph = 5 + rand() * 8;
          const by = yBase + 4 + rand() * Math.max(1, t.yTop - 26 - yBase);
          _q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), side > 0 ? -Math.PI / 2 : Math.PI / 2);
          _p.set(xw + side * 0.02, by, zm);
          _s.set(ph / 10, 1, pw / 10);
          macroTint(xw, by, zm, 0, _c);
          _c.multiplyScalar(lightTone());
          item(L.smallPlates, _p, _q, _s, _c);
        }
      }
      // pipe run along the wall base
      let zp = t.z0 + t.inset + 4;
      while (zp < t.z1 - 12) {
        const seg = 18 + rand() * 34;
        const r = 0.6 + rand() * 0.6;
        const zc2 = zp + Math.min(seg, t.z1 - 6 - zp) / 2;
        const yb = dorsal(xw, zc2) + 2.5 + r;
        addAt(L.pipes, xw + side * (r + 0.3), yb, zc2, r, r, Math.min(seg, t.z1 - 6 - zp), 0, 0.68 + rand() * 0.25);
        zp += seg + 3 + rand() * 12;
      }
    }
    // sloped front: window rows and plates on the slope
    const yBaseF = dorsal(0, t.z0) + 2;
    const slopeH = t.yTop - yBaseF;
    _n.set(0, t.inset, -t.yTop).normalize();
    const slopeAngle = Math.atan2(t.inset, t.yTop); // tilt back from vertical
    const width = t.hx * 2 - 10;
    for (const f of [0.42, 0.68]) {
      const yy = yBaseF + slopeH * f;
      const zz = t.z0 + (yy / t.yTop) * t.inset;
      windowQuad(width, f === 0.42 ? 5 : 2.5, [0, yy + _n.y * 0.25, zz + _n.z * 0.25], [slopeAngle, Math.PI, 0]);
    }
    // dark recesses on the slope at different offsets per tier (never mirrored)
    {
      const nRec = 2 + Math.floor(rand() * 2);
      for (let i = 0; i < nRec; i++) {
        const w = 14 + rand() * 30;
        const h = 4 + rand() * 4;
        const xc = -t.hx + 8 + w / 2 + rand() * Math.max(1, width - 8 - w);
        const f = 0.12 + rand() * 0.22 + (rand() < 0.5 ? 0 : 0.36);
        const yy = yBaseF + slopeH * f;
        if (Math.abs(yy - (yBaseF + slopeH * 0.42)) < h / 2 + 3.5 || Math.abs(yy - (yBaseF + slopeH * 0.68)) < h / 2 + 2.5) continue;
        const zz = t.z0 + (yy / t.yTop) * t.inset;
        _q.setFromUnitVectors(Z_AXIS, _n);
        _p.set(xc, yy, zz).addScaledVector(_n, 0.06);
        _s.set(w, h, 1);
        _c.setRGB(1, 1, 1);
        item(L.recess, _p, _q, _s, _c);
      }
    }
    // small plates on the slope
    gridFill(rand, -t.hx + 4, t.hx - 4, yBaseF + 3, t.yTop - 4, [6, 16], 1.6, (cell) => {
      if (rand() < 0.45) return;
      if (cell.w < 4 || cell.d < 4) return;
      const yy = cell.vc;
      // skip the window bands
      for (const f of [0.42, 0.68]) if (Math.abs(yy - (yBaseF + slopeH * f)) < cell.d / 2 + 3.5) return;
      const zz = t.z0 + (yy / t.yTop) * t.inset;
      frameQuat(_n, _q, UP);
      _p.set(cell.uc, yy, zz).addScaledVector(_n, 0.03);
      _s.set(cell.w / 10, 1, cell.d / 10);
      macroTint(cell.uc, yy, zz, _n.y, _c);
      _c.multiplyScalar(lightTone());
      item(L.smallPlates, _p, _q, _s, _c);
    });
  }

  // --- neck: everything here is sized to read from 600 m. Each face gets proud ribs (every third one
  // heavier), one wide dark channel plus a narrow one on the other side (off-centre, different per face),
  // dark storey bands crossing under the ribs, a tall lit window row per storey split by the channels,
  // lit bays inside the wide channel, two heavy dark pipe runs, wide ladder stacks and window bays.
  {
    const nH = neck.y1 - neck.y0;
    const nY = (neck.y0 + neck.y1) / 2;
    const faces = [
      { c: [0, nY, neck.z0], yaw: Math.PI, len: neck.halfX * 2, ch: 0.18 },
      { c: [0, nY, neck.z1], yaw: 0, len: neck.halfX * 2, ch: -0.22 },
      { c: [-neck.halfX, nY, (neck.z0 + neck.z1) / 2], yaw: -Math.PI / 2, len: neck.z1 - neck.z0, ch: 0.12 },
      { c: [neck.halfX, nY, (neck.z0 + neck.z1) / 2], yaw: Math.PI / 2, len: neck.z1 - neck.z0, ch: -0.16 },
    ];
    // [height above the neck base, window row height]; a dark storey band runs just under each row
    const storeys = [
      [12, 4],
      [36, 5],
      [60, 4],
      [84, 5],
      [105, 3.5],
    ];
    // dark flat panel at the current _p / _q
    const recessAt = (w, h, tone) => {
      _s.set(w, h, 1);
      _c.setScalar(tone);
      item(L.recess, _p, _q, _s, _c);
    };
    for (const f of faces) {
      const out = new THREE.Vector3(Math.sin(f.yaw), 0, Math.cos(f.yaw));
      const along = new THREE.Vector3(-out.z, 0, out.x);
      const at = (u, y, o) => _p.set(f.c[0], y, f.c[2]).addScaledVector(along, u).addScaledVector(out, o);
      const chU = f.len * f.ch;
      const chW = 11;
      const ch2U = -f.len * f.ch * 0.95;
      const ch2W = 4.5;
      const inChannel = (u, m) => Math.abs(u - chU) < chW / 2 + m || Math.abs(u - ch2U) < ch2W / 2 + m;
      // the two channels, dark grey (the recess material is lifted; the instance colour brings it down)
      setYaw(f.yaw);
      at(chU, neck.y0 + nH * 0.47, 0.06);
      recessAt(chW, nH - 12, 0.42);
      at(ch2U, neck.y0 + nH * 0.44, 0.06);
      recessAt(ch2W, nH - 20, 0.5);
      // face segments between the channels: storey bands and the lit rows above them run inside these
      const chans = [
        [chU, chW],
        [ch2U, ch2W],
      ].sort((a, b) => a[0] - b[0]);
      const spans = [
        [-f.len / 2 + 3, chans[0][0] - chans[0][1] / 2 - 1],
        [chans[0][0] + chans[0][1] / 2 + 1, chans[1][0] - chans[1][1] / 2 - 1],
        [chans[1][0] + chans[1][1] / 2 + 1, f.len / 2 - 3],
      ];
      storeys.forEach(([dy, h], si) => {
        for (const [ua, ub] of spans) {
          if (ub - ua < 5) continue;
          setYaw(f.yaw);
          at((ua + ub) / 2, neck.y0 + dy - h / 2 - 2.2, 0.06);
          recessAt(ub - ua, 2.2, 0.5);
          at((ua + ub) / 2, neck.y0 + dy, 0.25);
          windowQuad(ub - ua, h, [_p.x, _p.y, _p.z], [0, f.yaw, 0]);
        }
        // lit bay inside the wide channel on alternate storeys
        if (si % 2 === 0) {
          at(chU, neck.y0 + dy + 1, 0.5);
          addAt(L.bays, _p.x, _p.y, _p.z, chW - 3, h + 2, 1, f.yaw, 1);
        }
      });
      // ribs (every third heavier), leaving the wide channel open
      const nRibs = Math.floor(f.len / 14);
      const ribU = [];
      for (let i = 0; i <= nRibs; i++) {
        const u = -f.len / 2 + 2 + (i / nRibs) * (f.len - 4);
        if (Math.abs(u - chU) < chW / 2 + 1.5) continue;
        ribU.push(u);
        const heavy = i % 3 === 0;
        at(u, neck.y0 - 2, heavy ? 1.4 : 1.0);
        setYaw(f.yaw);
        _s.set(heavy ? 3.6 : 2.6, nH + 2, heavy ? 2.8 : 2.0);
        macroTint(_p.x, nY, _p.z, 0, _c);
        _c.multiplyScalar(heavy ? 0.9 : lightTone());
        item(L.ribs, _p, _q, _s, _c);
      }
      // two heavy dark pipe runs per face, in the bays between ribs
      let placed = 0;
      for (let tries = 0; tries < 20 && placed < 2; tries++) {
        const i = Math.floor(rand() * (ribU.length - 1));
        const u = (ribU[i] + ribU[i + 1]) / 2 + (rand() - 0.5) * 4;
        if (inChannel(u, 3) || Math.abs(u) > f.len / 2 - 4) continue;
        const rad = 1.6 + rand() * 0.8;
        at(u, neck.y0 - 1, rad + 0.3);
        setYaw(0);
        _s.set(rad, nH - 6 - rand() * 12, rad);
        _c.setScalar(0.5 + rand() * 0.2);
        item(L.vPipes, _p, _q, _s, _c);
        // a bracket collar every 24 m
        for (let y = neck.y0 + 10; y < neck.y1 - 8; y += 24) {
          at(u, y, rad * 0.5 + 0.3);
          setYaw(f.yaw);
          _s.set(rad * 2 + 1.2, 1.6, rad + 0.8);
          _c.setScalar(0.62);
          item(L.wallBoxes, _p, _q, _s, _c);
        }
        placed++;
      }
      // small pipes and wide ladder stacks hug the ribs
      for (let i = 0; i < ribU.length; i++) {
        const r = rand();
        if (r < 0.22) {
          const rad = 0.5 + rand() * 0.5;
          const u = ribU[i] + (rand() < 0.5 ? -1 : 1) * (1.6 + rad);
          if (inChannel(u, rad + 0.5) || Math.abs(u) > f.len / 2 - 2) continue;
          at(u, neck.y0 - 1, rad + 0.15);
          setYaw(0);
          _s.set(rad, nH - 4 - rand() * 20, rad);
          _c.setScalar(0.72 + rand() * 0.28);
          item(L.vPipes, _p, _q, _s, _c);
        } else if (r < 0.4) {
          const u = ribU[i] + (rand() < 0.5 ? -1 : 1) * 2.6;
          if (inChannel(u, 1.5) || Math.abs(u) > f.len / 2 - 3) continue;
          const segs = 3 + Math.floor(rand() * ((nH - 12) / 10 - 3));
          const yStart = neck.y0 + 2 + rand() * Math.max(0, nH - 8 - segs * 10);
          for (let k = 0; k < segs; k++) {
            at(u, yStart + k * 10, 0.6);
            setYaw(f.yaw);
            _s.set(2.4, 1, 1.6);
            _c.setScalar(0.92);
            item(L.ladders, _p, _q, _s, _c);
          }
        }
      }
      // window bays between the storeys
      for (let i = 0; i + 1 < ribU.length; i++) {
        if (rand() < 0.6) continue;
        const u = (ribU[i] + ribU[i + 1]) / 2;
        if (inChannel(u, 5)) continue;
        const yy = neck.y0 + 20 + rand() * (nH - 40);
        let onRow = false;
        for (const [dy, h] of storeys) if (Math.abs(yy - (neck.y0 + dy)) < h / 2 + 5) onRow = true;
        if (onRow) continue;
        at(u, yy, 0.7);
        addAt(L.bays, _p.x, _p.y, _p.z, 9, 5 + rand() * 3, 1.5, f.yaw, 1);
      }
    }
  }

  // --- slab: rooftop masts and sensor blocks (dome pedestals and spire kept clear), side/aft bays
  {
    const clear = (x, z) => Math.hypot(Math.abs(x) - 90, z - 530) < 26 || Math.hypot(x, z - TOWER.spire.z) < 9;
    gridFill(rand, -slab.halfX + 6, slab.halfX - 6, slab.z0 + 6, slab.z1 - 6, [8, 18], 2, (cell) => {
      if (clear(cell.uc, cell.vc) || cell.w < 4 || cell.d < 4) return;
      const r = rand();
      if (r < 0.3) {
        const pw = 4 + rand() * Math.min(9, cell.w - 1);
        const pd = 4 + rand() * Math.min(9, cell.d - 1);
        setYaw(0);
        _p.set(cell.uc, slab.y1 + 0.02, cell.vc);
        _s.set(pw / 10, 1, pd / 10);
        macroTint(cell.uc, slab.y1, cell.vc, 1, _c);
        _c.multiplyScalar(lightTone());
        item(L.smallPlates, _p, _q, _s, _c);
      } else if (r < 0.45) {
        addAt(L.masts, cell.uc, slab.y1, cell.vc, 1, 10 + rand() * 24, 1, rand() * Math.PI, 0.75);
      } else if (r < 0.55) {
        const h = 2.5 + rand() * 3;
        addAt(L.mach, cell.uc, slab.y1 + h / 2, cell.vc, cell.w * 0.7, h, cell.d * 0.7, 0, 1);
      } else if (r < 0.62) {
        const rr = 2 + rand() * 3;
        _q.setFromAxisAngle(UP, rand() * Math.PI * 2);
        _q2.setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.3 + rand() * 0.8);
        _q.multiply(_q2);
        addAt(L.dishes, cell.uc, slab.y1 + rr * 0.55, cell.vc, rr, rr, rr, 0, 0.9, _q);
      } else if (r < 0.68) {
        const h = 2 + rand() * 4;
        addAt(L.blocks, cell.uc, slab.y1, cell.vc, cell.w * 0.8, h, cell.d * 0.8, 0);
      }
    });
    const sY = (slab.y0 + slab.y1) / 2;
    for (const side of [-1, 1]) {
      const xw = side * slab.halfX;
      const yaw = side > 0 ? Math.PI / 2 : -Math.PI / 2;
      for (let z = slab.z0 + 12; z < slab.z1 - 10; z += 18 + rand() * 14) {
        if (rand() < 0.5) addAt(L.bays, xw + side * 0.7, sY + (rand() - 0.5) * 12, z, 9, 5, 1.5, yaw, 1);
        else addAt(L.wallBoxes, xw + side * 1.3, sY + (rand() - 0.5) * 16, z, 2.6, 2 + rand() * 3, 4 + rand() * 6, 0, 0.78);
      }
    }
    for (let x = -slab.halfX + 14; x < slab.halfX - 10; x += 16 + rand() * 14) {
      if (rand() < 0.45) addAt(L.bays, x, sY + (rand() - 0.5) * 12, slab.z1 + 0.7, 9, 5, 1.5, 0, 1);
      else addAt(L.wallBoxes, x, sY + (rand() - 0.5) * 16, slab.z1 + 1.3, 4 + rand() * 6, 2 + rand() * 3, 2.6, 0, 0.78);
    }
    // forward face: bezels around the real openings (frame + brow + sill), all outside the glass
    for (const o of ctx.openings) {
      const zf = slab.z0;
      const w = o.x1 - o.x0;
      const h = o.y1 - o.y0;
      const cx = (o.x0 + o.x1) / 2;
      const cy = (o.y0 + o.y1) / 2;
      const fw = 0.7;
      const depth = 1.1;
      const zc = zf - depth / 2 + 0.02;
      addAt(L.bezels, o.x0 - fw / 2, cy, zc, fw, h + fw * 2, depth, 0, 1);
      addAt(L.bezels, o.x1 + fw / 2, cy, zc, fw, h + fw * 2, depth, 0, 1);
      addAt(L.bezels, cx, o.y1 + fw / 2, zc, w + fw * 2, fw, depth, 0, 1);
      addAt(L.bezels, cx, o.y0 - fw / 2, zc, w + fw * 2, fw, depth, 0, 1);
    }
  }

  // one mesh per material / LOD / interior-culling group (see HIDE_INSIDE in hull.js)
  layerMesh(
    [
      { geo: blockGeo, list: L.blocks },
      { geo: towerGeo, list: L.towers },
      { geo: ribGeo, list: L.ribs },
      { geo: drumGeo, list: L.drums },
    ],
    mats.hull,
    detail.mid,
    "cityBlocks",
  );
  layerMesh(
    [
      { geo: bayGeo, list: L.bays },
      { geo: machGeo, list: L.mach },
      { geo: bezelGeo, list: L.bezels },
    ],
    mats.atlas,
    detail.mid,
    "bays",
  );
  layerMesh(
    [
      { geo: gantryGeo, list: L.gantries },
      { geo: mastGeo, list: L.masts },
      { geo: wallBoxGeo, list: L.wallBoxes },
      { geo: pipeGeo, list: L.pipes },
      { geo: vPipeGeo, list: L.vPipes },
      { geo: ladderGeo, list: L.ladders },
    ],
    mats.greebleDark,
    detail.near,
    "gantries",
  );
  instancedFromList(domeGeo, mats.hullUv, L.domes, detail.near, "sensorDomes");
  instancedFromList(dishGeo, mats.greeble, L.dishes, detail.near, "dishes");
  instancedFromList(smallPlateGeo, mats.plate, L.smallPlates, detail.near, "smallPlates");
  instancedFromList(recessGeo, mats.darkFlat, L.recess, detail.mid, "terraceRecess");
  instancedFromList(wallVentGeo, mats.atlasFlat, L.wallVents, detail.near, "wallVents");
}

// ---------------------------------------------------------------------------
// trench machinery: both flanks, full length, everything inside the recess
// ---------------------------------------------------------------------------
export function buildTrench(ctx) {
  const { rand, mats, detail, atlas } = ctx;
  const A = atlas.cells;
  const unitGeo = box(0, 0, 0, 1, 1, 1);
  const pipeGeo = new THREE.CylinderGeometry(1, 1, 1, 10).rotateX(Math.PI / 2);
  const bayGeo = atlasBox(1, 1, 1, { pz: A.bay, side: A.dark, py: A.dark, ny: A.dark });
  const winGeo = atlasQuad(1, 1, A.windowRow);
  const ductGeo = atlasBox(1, 1, 1, { pz: A.duct, side: A.dark });
  const L = { units: [], pipes: [], ribs: [], bays: [], windows: [], ducts: [] };
  const darkTone = () => 0.62 + rand() * 0.4;
  for (const s of [-1, 1]) {
    const yaw = s * EDGE_YAW;
    const outward = s > 0 ? Math.PI / 2 : -Math.PI / 2;
    // position at signed depth `d` from the edge, along the flank at z
    const at = (z, d, y) => _p.set(s * (HULL.halfWidthAt(z) - d), y, z);
    let z = HULL.bowZ + 60;
    let nextRib = z + 10;
    let nextBay = z + 30 + rand() * 40;
    let nextWin = z + 16;
    while (z < HULL.sternZ - 24) {
      // machinery unit
      const sx = 3 + rand() * 4.5;
      const sy = 2 + rand() * 5;
      const sz = 4 + rand() * 10;
      const d = Math.max(sx / 2 + 0.4, TRENCH_DEPTH - sx / 2 - rand() * 3);
      const y = (rand() * 2 - 1) * (TRENCH_HALF - sy / 2 - 0.6);
      at(z, d, y);
      _q.setFromAxisAngle(UP, yaw);
      _s.set(sx, sy, sz);
      _c.setScalar(darkTone());
      item(L.units, _p, _q, _s, _c);
      if (rand() < 0.5) {
        // stacked smaller box beside it
        at(z + sz * 0.6, TRENCH_DEPTH - 1.5 - rand() * 2, y + (rand() - 0.5) * 6);
        _s.set(2 + rand() * 2, 1.5 + rand() * 2.5, 2 + rand() * 4);
        _c.setScalar(darkTone());
        item(L.units, _p, _q, _s, _c);
      }
      if (z >= nextRib) {
        at(z, 1.6, 0);
        _s.set(1.8, TRENCH_HALF * 2 - 0.4, 2.6);
        _c.setScalar(0.5 + rand() * 0.2);
        item(L.ribs, _p, _q, _s, _c);
        nextRib = z + 28 + rand() * 26;
      }
      if (z >= nextBay) {
        at(z, TRENCH_DEPTH - 0.9, (rand() - 0.5) * 4);
        _q.setFromAxisAngle(UP, outward + yaw);
        _s.set(10 + rand() * 6, 5 + rand() * 3, 1.6);
        _c.setScalar(1);
        item(L.bays, _p, _q, _s, _c);
        nextBay = z + 50 + rand() * 60;
      }
      if (z >= nextWin) {
        at(z, TRENCH_DEPTH - 0.25, (rand() - 0.5) * 12);
        _q.setFromAxisAngle(UP, outward + yaw);
        _s.set(6 + rand() * 6, 1.2, 1);
        _c.setScalar(1);
        item(L.windows, _p, _q, _s, _c);
        nextWin = z + 12 + rand() * 18;
      }
      if (rand() < 0.12) {
        at(z, TRENCH_DEPTH - 1.2, (rand() - 0.5) * 8);
        _q.setFromAxisAngle(UP, outward + yaw);
        _s.set(4 + rand() * 3, 3 + rand() * 3, 2.2);
        _c.setScalar(1);
        item(L.ducts, _p, _q, _s, _c);
      }
      z += 12 + rand() * 10;
    }
    // long pipe runs at two heights
    for (const [y, r, d] of [
      [5.4, 1.1, 6.0],
      [-4.6, 1.5, 7.2],
      [0.8, 0.7, 4.2],
    ]) {
      let zp = HULL.bowZ + 70 + rand() * 40;
      while (zp < HULL.sternZ - 60) {
        const len = 50 + rand() * 110;
        const zc = zp + len / 2;
        if (zc + len / 2 > HULL.sternZ - 20) break;
        at(zc, d, y + (rand() - 0.5) * 0.6);
        _q.setFromAxisAngle(UP, yaw);
        _s.set(r, r, len / Math.cos(EDGE_YAW));
        _c.setScalar(0.66 + rand() * 0.3);
        item(L.pipes, _p, _q, _s, _c);
        zp += len + 6 + rand() * 30;
      }
    }
  }
  layerMesh(
    [
      { geo: unitGeo, list: L.units },
      { geo: pipeGeo, list: L.pipes },
    ],
    mats.greebleDark,
    detail.mid,
    "trenchUnits",
  );
  instancedFromList(unitGeo, mats.greeble, L.ribs, detail.mid, "trenchRibs");
  layerMesh(
    [
      { geo: bayGeo, list: L.bays },
      { geo: winGeo, list: L.windows },
      { geo: ductGeo, list: L.ducts },
    ],
    mats.atlas,
    detail.mid,
    "trenchBays",
  );
}
