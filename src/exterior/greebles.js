// Instanced exterior detail: layered armour plates on the two hull planes, the superstructure "city"
// (blocks, towers, bays, gantries, domes, masts, dishes, buttresses), trench machinery, hatches, docking
// pads and service points. Every repeated element is an InstancedMesh; layouts are deterministic grids
// with seeded variation so nothing overlaps: each area keeps an occupancy list.
import * as THREE from "three";
import { HULL, SUPERSTRUCTURE, TOWER } from "../config/shipSpec.js";
import { TRENCH_HALF, TRENCH_DEPTH, EDGE_YAW, UP, dorsal, surfaceY, surfaceNormal, surfaceQuat, frameQuat, merge, box, bevelBox, atlasBox, atlasQuad, macroTint, instancedFromList, overlapsAny } from "./util.js";

const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _n = new THREE.Vector3();
const _c = new THREE.Color();

function item(list, p, q, s, c) {
  list.push({ m: new THREE.Matrix4().compose(p, q, s), c: c.clone() });
}

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
export function buildHullPlates(ctx) {
  const { rand, mats, detail, exclude } = ctx;
  const fams = {
    slab: { geo: bevelBox(30, 1.5, 30, 0.55), w: 30, d: 30, th: 1.5, list: [] },
    skin: { geo: bevelBox(30, 0.6, 30, 0.25), w: 30, d: 30, th: 0.6, list: [] },
    strip: { geo: bevelBox(8, 0.9, 60, 0.35), w: 8, d: 60, th: 0.9, list: [] },
  };
  const cells = [];
  for (const top of [true, false]) {
    for (const side of [-1, 1]) {
      let z = HULL.bowZ + 34;
      const zEnd = HULL.sternZ - 10;
      while (z < zEnd - 12) {
        const rowD = 18 + rand() * 34;
        const z1 = Math.min(z + rowD, zEnd);
        const hwRow = HULL.halfWidthAt(z) - 9;
        let x = 5 + rand() * 8;
        if (top && z1 > 144 && z < 566) x = Math.max(x, 167);
        if (!top && z1 > HULL.keelPlate.z0 - 6 && z < HULL.keelPlate.z1 + 6) x = Math.max(x, HULL.keelPlate.x + 5);
        while (x < hwRow - 10) {
          let cw = 14 + rand() * 34;
          if (x + cw > hwRow) cw = hwRow - x;
          if (cw < 10) break;
          const gap = 2.4;
          const rect = { x0: side > 0 ? x : -(x + cw), x1: side > 0 ? x + cw : -x, z0: z, z1 };
          const cell = { ...rect, top, plate: null, th: 0 };
          const r = rand();
          const blocked = overlapsAny(rect, top ? exclude.top : exclude.bottom, 3);
          if (!blocked && r > 0.3) {
            let fam = r < 0.62 ? "slab" : r < 0.88 ? "skin" : "strip";
            const w = cw - gap;
            const d = z1 - z - gap;
            if (fam === "strip" && !(w < 20 && d > 26)) fam = "slab";
            const cx = side * (x + cw / 2);
            const cz = (z + z1) / 2;
            const f = fams[fam];
            surfaceQuat(cx, cz, top, _q);
            surfaceNormal(cx, cz, top, _n);
            _p.set(cx, surfaceY(cx, cz, top), cz).addScaledVector(_n, 0.04);
            _s.set(w / f.w, 1, d / f.d);
            macroTint(cx, _p.y, cz, _n.y, _c);
            // per-plate paint batch: distinct grey levels with a faint warm/cool drift
            _c.multiplyScalar(0.84 + rand() * 0.24);
            const hue = (rand() - 0.5) * 0.05;
            _c.r *= 1 + hue;
            _c.b *= 1 - hue * 1.3;
            item(f.list, _p, _q, _s, _c);
            cell.plate = fam;
            cell.th = f.th;
          }
          if (!blocked) cells.push(cell);
          x += cw + gap;
        }
        z = z1 + 2.4;
      }
    }
  }
  for (const [name, f] of Object.entries(fams)) instancedFromList(f.geo, mats.plate, f.list, detail.mid, "plates_" + name);
  return cells;
}

// Hatches (4 m), vents and service-access clusters on free hull cells and on some plate tops.
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
  for (const cell of cells) {
    const w = cell.x1 - cell.x0;
    const d = cell.z1 - cell.z0;
    if (w < 12 || d < 12) continue;
    const r = rand();
    if (cell.plate) {
      // a few hatches sit on top of plates
      if (r < 0.14) {
        const n = 1 + Math.floor(rand() * 3);
        for (let k = 0; k < n; k++) place(hatches, cell.x0 + 4 + rand() * (w - 8), cell.z0 + 4 + rand() * (d - 8), cell.top, cell.th + 0.02 + 0.175, rand() < 0.5 ? 0 : Math.PI / 2, 1);
      }
      continue;
    }
    if (r < 0.3) {
      const n = 1 + Math.floor(rand() * 4);
      const yaw = rand() < 0.5 ? 0 : Math.PI / 2;
      const x0 = cell.x0 + 3 + rand() * Math.max(0, w - 6 - n * 5);
      const z = cell.z0 + 3 + rand() * (d - 6);
      for (let k = 0; k < n; k++) place(hatches, x0 + k * 5 + 2, z, cell.top, 0.175, yaw, 1);
    } else if (r < 0.42) {
      place(services, cell.x0 + w / 2 + (rand() - 0.5) * (w - 10), cell.z0 + d / 2 + (rand() - 0.5) * (d - 10), cell.top, 0.25, rand() < 0.5 ? 0 : Math.PI, 1);
    } else if (r < 0.58) {
      const n = 1 + Math.floor(rand() * 3);
      for (let k = 0; k < n; k++) place(vents, cell.x0 + 3 + rand() * (w - 6), cell.z0 + 3 + rand() * (d - 6), cell.top, 0.35, rand() < 0.5 ? 0 : Math.PI / 2, 0.9);
    } else if (r < 0.64) {
      place(sensors, cell.x0 + w / 2, cell.z0 + d / 2, cell.top, 0.4, rand() * Math.PI, 1);
    }
  }
  instancedFromList(hatchGeo, mats.atlas, hatches, detail.near, "hatches");
  instancedFromList(ventGeo, mats.atlas, vents, detail.near, "vents");
  instancedFromList(serviceGeo, mats.atlas, services, detail.near, "serviceHatches");
  instancedFromList(sensorGeo, mats.atlas, sensors, detail.near, "sensorPanels");
}

// Docking pads: 60 m flat areas with painted markings and edge lights, on the dorsal hull beside the
// superstructure and ahead of it. Returns their footprints so the plates avoid them.
export const PAD_SPOTS = [
  [-225, 300],
  [225, 300],
  [-255, 450],
  [255, 450],
  [-70, 20],
  [70, 20],
];
export function buildDockingPads(ctx) {
  const { mats, detail, atlas } = ctx;
  const A = atlas.cells;
  const padGeo = atlasBox(60, 0.6, 60, { py: A.pad, ny: A.dark, side: A.plate });
  const list = [];
  for (const [x, z] of PAD_SPOTS) {
    surfaceNormal(x, z, true, _n);
    frameQuat(_n, _q);
    _p.set(x, dorsal(x, z), z).addScaledVector(_n, 0.3);
    _s.set(1, 1, 1);
    _c.setRGB(1, 1, 1);
    item(list, _p, _q, _s, _c);
  }
  instancedFromList(padGeo, mats.atlas, list, detail.mid, "dockingPads");
}
export function padRects(margin = 3) {
  return PAD_SPOTS.map(([x, z]) => ({ x0: x - 30 - margin, x1: x + 30 + margin, z0: z - 30 - margin, z1: z + 30 + margin }));
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

  const L = { blocks: [], towers: [], bays: [], mach: [], gantries: [], domes: [], masts: [], dishes: [], ribs: [], wallBoxes: [], pipes: [], smallPlates: [], bezels: [] };
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
  for (const a of areas) {
    gridFill(rand, a.x0, a.x1, a.z0, a.z1, [8, 26], 2.2, (cell) => {
      if (cell.w < 5 || cell.d < 5) return;
      const x = cell.uc;
      const z = cell.vc;
      const r = rand();
      const big = Math.min(cell.w, cell.d);
      if (r < 0.28) {
        freeCells.push({ x0: cell.u0, x1: cell.u1, z0: cell.v0, z1: cell.v1, y: a.y });
        return;
      }
      if (r < 0.58) {
        const h = 4 + rand() * 10 + big * 0.25;
        addAt(L.blocks, x, a.y, z, cell.w, h, cell.d, 0);
        blockTops.push({ x, z, w: cell.w, d: cell.d, y: a.y + h });
        return;
      }
      if (r < 0.7) {
        const h = 16 + rand() * 26;
        addAt(L.towers, x, a.y, z, cell.w, h, cell.d, 0);
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
        const h = 7 + rand() * 8;
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
        addAt(L.gantries, x, a.y, z, cell.w, h, cell.d, 0, 0.55 + rand() * 0.2);
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
    } else if (r < 0.45) {
      const h = 8 + rand() * 18;
      addAt(L.masts, b.x + (rand() - 0.5) * (b.w - 3), b.y, b.z + (rand() - 0.5) * (b.d - 3), 1, h, 1, rand() * Math.PI, 0.55);
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
    } else if (r < 0.55) {
      const h = 10 + rand() * 22;
      addAt(L.masts, f.x0 + w / 2, f.y, f.z0 + d / 2, 1, h, 1, rand() * Math.PI, 0.55);
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
            addAt(L.wallBoxes, xw + side * (sx / 2 + 0.1), by, za + sz / 2 + rand() * Math.max(0, span - sz), sx, sy, sz, 0, 0.5 + rand() * 0.35);
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
        addAt(L.pipes, xw + side * (r + 0.3), yb, zc2, r, r, Math.min(seg, t.z1 - 6 - zp), 0, 0.45 + rand() * 0.2);
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

  // --- neck: ribs on the four faces, window rows, bays
  {
    const nH = neck.y1 - neck.y0;
    const nY = (neck.y0 + neck.y1) / 2;
    const faces = [
      { c: [0, nY, neck.z0], yaw: Math.PI, len: neck.halfX * 2, axis: "x" },
      { c: [0, nY, neck.z1], yaw: 0, len: neck.halfX * 2, axis: "x" },
      { c: [-neck.halfX, nY, (neck.z0 + neck.z1) / 2], yaw: -Math.PI / 2, len: neck.z1 - neck.z0, axis: "z" },
      { c: [neck.halfX, nY, (neck.z0 + neck.z1) / 2], yaw: Math.PI / 2, len: neck.z1 - neck.z0, axis: "z" },
    ];
    for (const f of faces) {
      const out = new THREE.Vector3(Math.sin(f.yaw), 0, Math.cos(f.yaw));
      const along = new THREE.Vector3(-out.z, 0, out.x);
      const nRibs = Math.floor(f.len / 14);
      for (let i = 0; i <= nRibs; i++) {
        const u = -f.len / 2 + 2 + (i / nRibs) * (f.len - 4);
        _p.set(f.c[0], neck.y0 - 2, f.c[2]).addScaledVector(along, u).addScaledVector(out, 0.9);
        setYaw(f.yaw);
        _s.set(2.4, nH + 2, 1.8);
        macroTint(_p.x, nY, _p.z, 0, _c);
        _c.multiplyScalar(lightTone());
        item(L.ribs, _p, _q, _s, _c);
      }
      for (const yy of [neck.y0 + 18, neck.y0 + 44, neck.y0 + 70, neck.y0 + 96]) {
        _p.set(f.c[0], yy, f.c[2]).addScaledVector(out, 0.25);
        windowQuad(f.len - 6, yy === neck.y0 + 44 ? 5 : 2.5, [_p.x, _p.y, _p.z], [0, f.yaw, 0]);
      }
      for (let i = 0; i < nRibs; i++) {
        if (rand() < 0.5) continue;
        const u = -f.len / 2 + 2 + ((i + 0.5) / nRibs) * (f.len - 4);
        const yy = neck.y0 + 8 + rand() * (nH - 30);
        let onBand = false;
        for (const band of [18, 44, 70, 96]) if (Math.abs(yy - (neck.y0 + band)) < 6) onBand = true;
        if (onBand) continue;
        _p.set(f.c[0], yy, f.c[2]).addScaledVector(along, u).addScaledVector(out, 0.7);
        addAt(L.bays, _p.x, _p.y, _p.z, 9, 5 + rand() * 4, 1.5, f.yaw, 1);
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
        addAt(L.masts, cell.uc, slab.y1, cell.vc, 1, 10 + rand() * 24, 1, rand() * Math.PI, 0.55);
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
        else addAt(L.wallBoxes, xw + side * 1.3, sY + (rand() - 0.5) * 16, z, 2.6, 2 + rand() * 3, 4 + rand() * 6, 0, 0.55);
      }
    }
    for (let x = -slab.halfX + 14; x < slab.halfX - 10; x += 16 + rand() * 14) {
      if (rand() < 0.45) addAt(L.bays, x, sY + (rand() - 0.5) * 12, slab.z1 + 0.7, 9, 5, 1.5, 0, 1);
      else addAt(L.wallBoxes, x, sY + (rand() - 0.5) * 16, slab.z1 + 1.3, 4 + rand() * 6, 2 + rand() * 3, 2.6, 0, 0.55);
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
      // brow above and sill below
      addAt(L.bezels, cx, o.y1 + fw + 0.9, zf - 1.3, w + fw * 2 + 2, 1.8, 2.6, 0, 1);
      addAt(L.bezels, cx, o.y0 - fw - 0.5, zf - 0.9, w + fw * 2 + 1, 1.0, 1.8, 0, 1);
    }
  }

  instancedFromList(blockGeo, mats.hull, L.blocks, detail.mid, "cityBlocks");
  instancedFromList(towerGeo, mats.hull, L.towers, detail.mid, "cityTowers");
  instancedFromList(bayGeo, mats.atlas, L.bays, detail.mid, "bays");
  instancedFromList(machGeo, mats.atlas, L.mach, detail.near, "machineryBlocks");
  instancedFromList(gantryGeo, mats.greebleDark, L.gantries, detail.near, "gantries");
  instancedFromList(domeGeo, mats.hullUv, L.domes, detail.near, "sensorDomes");
  instancedFromList(mastGeo, mats.greebleDark, L.masts, detail.near, "antennaMasts");
  instancedFromList(dishGeo, mats.greeble, L.dishes, detail.near, "dishes");
  instancedFromList(ribGeo, mats.hull, L.ribs, detail.mid, "buttresses");
  instancedFromList(wallBoxGeo, mats.greebleDark, L.wallBoxes, detail.near, "wallBoxes");
  instancedFromList(pipeGeo, mats.greebleDark, L.pipes, detail.near, "wallPipes");
  instancedFromList(smallPlateGeo, mats.plate, L.smallPlates, detail.near, "smallPlates");
  instancedFromList(bezelGeo, mats.atlas, L.bezels, detail.near, "windowBezels");
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
  const darkTone = () => 0.32 + rand() * 0.4;
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
        _c.setScalar(0.4 + rand() * 0.25);
        item(L.pipes, _p, _q, _s, _c);
        zp += len + 6 + rand() * 30;
      }
    }
  }
  instancedFromList(unitGeo, mats.greebleDark, L.units, detail.mid, "trenchUnits");
  instancedFromList(pipeGeo, mats.greebleDark, L.pipes, detail.mid, "trenchPipes");
  instancedFromList(unitGeo, mats.greeble, L.ribs, detail.mid, "trenchRibs");
  instancedFromList(bayGeo, mats.atlas, L.bays, detail.mid, "trenchBays");
  instancedFromList(winGeo, mats.atlas, L.windows, detail.near, "trenchWindows");
  instancedFromList(ductGeo, mats.atlas, L.ducts, detail.near, "trenchDucts");
}
