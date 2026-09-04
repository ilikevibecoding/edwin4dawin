// Superstructure: the stepped "city" tiers on the dorsal plateau (lit window faces, plated tops,
// central canyon), the command tower (neck, bridge module with the bridge windows, twin deflector
// domes, comms mast), turbolaser batteries and the dorsal sensor / antenna clusters.
// Static geometry is batched per material; repeated detail is instanced.
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { rng, setVertexColor } from "../kit.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { CITY, TOWER, dorsalH, cityTopY } from "./dims.js";
import { Batcher } from "./batch.js";

const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _c = new THREE.Color();

/** Tapered block: plan trapezoid (half-width hw0 at zs → hw1 at ze), from y0 up by h. Returns { top, side } geometries. */
function taperedBlock(hw0, hw1, zs, ze, y0, h) {
  const shape = new THREE.Shape([new THREE.Vector2(-hw0, zs), new THREE.Vector2(hw0, zs), new THREE.Vector2(hw1, ze), new THREE.Vector2(-hw1, ze)]);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
  // shape lies in (x, z): rotateX(+90°) maps shape-y → world z and the extrusion → world -y, so lift by h
  geo.rotateX(Math.PI / 2);
  geo.translate(0, y0 + h, 0);
  const g = geo.toNonIndexed();
  g.computeVertexNormals();
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const top = [];
  const side = [];
  for (let i = 0; i < pos.count; i += 3) {
    const ny = nor.getY(i);
    const tri = [];
    for (let k = 0; k < 3; k++) tri.push(pos.getX(i + k), pos.getY(i + k), pos.getZ(i + k));
    if (ny > 0.5) top.push(...tri);
    else if (ny > -0.5) side.push(...tri);
  }
  const build = (arr) => {
    const bg = new THREE.BufferGeometry();
    bg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(arr), 3));
    bg.computeVertexNormals();
    return bg;
  };
  return { top: build(top), side: build(side) };
}

/** Instanced greeble field on top of a tier: towers, boxes, vents. */
function tierGreebles(rand, tier, y, count, hwInset = 4) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const z = tier.zs + 6 + rand() * (tier.ze - tier.zs - 12);
    const hw = tier.hw0 + ((tier.hw1 - tier.hw0) * (z - tier.zs)) / (tier.ze - tier.zs) - hwInset;
    let x = (rand() * 2 - 1) * hw;
    if (tier === CITY.tiers[CITY.tiers.length - 1] && Math.abs(x) < CITY.canyonHalf + 3) x = Math.sign(x || 1) * (CITY.canyonHalf + 3 + rand() * Math.max(1, hw - CITY.canyonHalf - 3));
    const w = 2 + rand() * 7;
    const d = 2 + rand() * 7;
    const h = 2 + rand() * (rand() < 0.15 ? 26 : 9);
    _v.set(x, y + h / 2 - 0.3, z);
    _s.set(w, h, d);
    _m.compose(_v, _q.identity(), _s);
    const k = 0.62 + rand() * 0.3;
    items.push({ m: _m.clone(), c: [k, k, k * 1.03] });
  }
  return items;
}

function instanced(geo, material, items, castShadow = true) {
  const mesh = new THREE.InstancedMesh(geo, material, items.length);
  for (let i = 0; i < items.length; i++) {
    mesh.setMatrixAt(i, items[i].m);
    if (items[i].c) mesh.setColorAt(i, _c.setRGB(items[i].c[0], items[i].c[1], items[i].c[2]));
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  mesh.computeBoundingSphere();
  return mesh;
}

/** Row of small lit windows along a line (instanced boxes), replacing continuous neon bars. */
function windowRow(items, x0, y, z0, x1, z1, count, rand, size = [1.2, 0.7, 0.4]) {
  for (let i = 0; i < count; i++) {
    if (rand() < 0.22) continue; // dark windows
    const t = (i + 0.5) / count;
    _v.set(x0 + (x1 - x0) * t, y + (rand() - 0.5) * 0.2, z0 + (z1 - z0) * t);
    _s.set(size[0], size[1], size[2]);
    _m.compose(_v, _q.identity(), _s);
    items.push({ m: _m.clone() });
  }
}

/** Heavy turbolaser turret geometry (merged): base ring, rotating housing, twin barrels. */
export function turretGeometry() {
  const parts = [];
  const add = (g, x, y, z, rx = 0, ry = 0, rz = 0) => {
    g.rotateX(rx);
    g.rotateY(ry);
    g.rotateZ(rz);
    g.translate(x, y, z);
    parts.push(g.toNonIndexed());
  };
  add(new THREE.CylinderGeometry(9, 10, 3, 16), 0, 1.5, 0);
  add(new THREE.BoxGeometry(12, 6, 14), 0, 6, -1);
  add(new THREE.BoxGeometry(14, 3, 8), 0, 9, 1);
  for (const s of [-1, 1]) {
    add(new THREE.CylinderGeometry(1.1, 1.4, 22, 10), s * 3.2, 7.5, -13, Math.PI / 2 - 0.12);
    add(new THREE.BoxGeometry(2.4, 2.4, 6), s * 3.2, 7.5, -5);
  }
  const merged = mergeGeometries(parts, false);
  merged.computeVertexNormals();
  const uv = merged.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * 2);
  setVertexColor(merged, 0xffffff);
  return merged;
}

export function buildSuperstructure(materials) {
  const group = new THREE.Group();
  group.name = "superstructure";
  const rand = rng(777);
  const lod0 = new THREE.Group(); // fine detail toggled by distance
  lod0.name = "superstructure_lod0";
  group.add(lod0);
  const batch = new Batcher(materials);
  const windows = [];

  // --- city tiers
  let baseY = null;
  CITY.tiers.forEach((t, i) => {
    const y0 = i === 0 ? dorsalH(t.zs) - 6 : baseY;
    const h = t.h + (i === 0 ? dorsalH(t.ze) - dorsalH(t.zs) + 6 : 0);
    const { top, side } = taperedBlock(t.hw0, t.hw1, t.zs, t.ze, y0, h);
    batch.add("hullDark", top, PALETTE.hullDark, 0.02);
    batch.add(i === 2 ? "city" : "cityDense", side, PALETTE.hullGrey, 0.02);
    baseY = y0 + h;
    const items = tierGreebles(rand, t, baseY, i === 0 ? 260 : i === 1 ? 200 : 140);
    const gm = instanced(new THREE.BoxGeometry(1, 1, 1), materials.hull2, items);
    setVertexColor(gm.geometry, 0xffffff);
    gm.name = "tierGreebles_" + i;
    lod0.add(gm);
    // sparse lit windows along the tier faces at deck lines
    for (let k = 0; k < 3; k++) {
      const yy = y0 + h * (0.25 + 0.25 * k);
      for (const s of [-1, 1]) windowRow(windows, s * (t.hw0 + 0.35), yy, t.zs + 4, s * (t.hw1 + 0.35), t.ze - 4, Math.round((t.ze - t.zs) / 9), rand, [0.6, 0.5, 1.4]);
    }
  });
  const cityTop = baseY;

  // canyon along the top tier: two raised walls with the slot between them
  {
    const t = CITY.tiers[2];
    for (const s of [-1, 1]) {
      const { top, side } = taperedBlock(4, 6, t.zs + 10, t.ze - 60, cityTop, 9);
      top.translate(s * (CITY.canyonHalf + 6), 0, 0);
      side.translate(s * (CITY.canyonHalf + 6), 0, 0);
      batch.add("hullDark", top, PALETTE.hullDark, 0.02);
      batch.add("city", side, PALETTE.hullGrey, 0.02);
    }
  }

  // --- tower neck + shoulder blocks
  const nk = TOWER.neck;
  {
    const { top, side } = taperedBlock(nk.x * 0.92, nk.x, nk.z0, nk.z1, cityTop - 2, nk.yTop - cityTop + 2);
    batch.add("hullDark", top, PALETTE.hullDark, 0.02);
    batch.add("city", side, PALETTE.hullGrey, 0.02);
  }
  for (const s of [-1, 1]) {
    batch.box("hullDark", s * (nk.x + 6), cityTop + 10, (nk.z0 + nk.z1) / 2, 12, 20, 40, PALETTE.hullDark);
    batch.box("city", s * (nk.x + 12), cityTop + 8, (nk.z0 + nk.z1) / 2 + 6, 1.5, 12, 26, PALETTE.hullGrey);
  }

  // --- bridge module: the wide bar
  const br = TOWER.bridge;
  const bw = br.x * 2;
  const bd = br.z1 - br.z0;
  const bh = br.y1 - br.y0;
  const bcz = (br.z0 + br.z1) / 2;
  const bcy = (br.y0 + br.y1) / 2;
  batch.box("hull", 0, bcy, bcz, bw, bh, bd, PALETTE.hullGrey, 0.03);
  batch.box("hullDark", 0, br.y0 - 1.5, bcz, bw + 2, 3, bd + 2, PALETTE.hullDark);
  batch.box("hullDark", 0, br.y1 + 1, bcz, bw - 8, 2, bd - 6, PALETTE.hullDark);
  for (const s of [-1, 1]) {
    batch.box("city", s * (br.x + 1), bcy, bcz, 2, bh - 4, bd - 4, PALETTE.hullGrey);
    batch.box("hullDark", s * (br.x - 14), br.y1 + 2, bcz + 6, 22, 4, 30, PALETTE.hullDark);
  }
  // bridge windows: a recessed dark band across the front face with the glass strip inside
  const wn = TOWER.windows;
  batch.box("hullDark", 0, (wn.y0 + wn.y1) / 2, wn.z + 0.2, wn.x * 2 + 6, wn.y1 - wn.y0 + 3, 2.4, PALETTE.hullBlack);
  batch.box("exteriorGlass", 0, (wn.y0 + wn.y1) / 2, wn.z - 0.9, wn.x * 2, wn.y1 - wn.y0, 0.6, PALETTE.impBlack);
  {
    const items = [];
    for (let x = -wn.x + 3; x < wn.x; x += 3) {
      _v.set(x, (wn.y0 + wn.y1) / 2, wn.z - 1.1);
      _s.set(0.5, wn.y1 - wn.y0, 0.6);
      _m.compose(_v, _q.identity(), _s);
      items.push({ m: _m.clone(), c: [0.35, 0.36, 0.38] });
    }
    const mm = instanced(new THREE.BoxGeometry(1, 1, 1), materials.hullDark, items, false);
    setVertexColor(mm.geometry, 0xffffff);
    lod0.add(mm);
  }
  // observation-deck window rows along the bridge module's front and sides
  windowRow(windows, -br.x + 16, br.y0 + 6, br.z0 - 0.3, br.x - 16, br.z0 - 0.3, 34, rand);
  windowRow(windows, -br.x - 0.3, bcy, br.z0 + 6, -br.x - 0.3, br.z1 - 6, 10, rand, [0.4, 0.8, 1.2]);
  windowRow(windows, br.x + 0.3, bcy, br.z0 + 6, br.x + 0.3, br.z1 - 6, 10, rand, [0.4, 0.8, 1.2]);
  // neck observation gallery windows (deck 2, world z ≈ 568, y ≈ 151.5)
  windowRow(windows, -15, 151.6, nk.z0 - 0.3, 15, nk.z0 - 0.3, 12, rand, [1.4, 1.0, 0.5]);

  // --- deflector domes
  const dm = TOWER.domes;
  for (const s of [-1, 1]) {
    const geo = new THREE.SphereGeometry(dm.r, 40, 28);
    geo.translate(s * dm.x, dm.y, dm.z);
    batch.add("hull", geo, PALETTE.hullLight, 0.04);
    batch.box("hullDark", s * dm.x, br.y1 + 1.5, dm.z, dm.r * 1.4, 3, dm.r * 1.4, PALETTE.hullDark);
    for (let k = 0; k < 6; k++) {
      const ring = new THREE.TorusGeometry(dm.r + 0.25, 0.35, 6, 40);
      ring.rotateY((k / 6) * Math.PI);
      ring.translate(s * dm.x, dm.y, dm.z);
      batch.add("hullDark", ring, PALETTE.hullDark, 0.1);
    }
  }
  // --- comms mast between the domes
  const ms = TOWER.mast;
  {
    const geo = new THREE.CylinderGeometry(ms.r * 0.7, ms.r, ms.y1 - ms.y0, 10);
    geo.translate(0, (ms.y0 + ms.y1) / 2, ms.z);
    batch.add("hullDark", geo, PALETTE.hullGrey, 0.1);
    batch.box("hullDark", 0, ms.y1 + 1.5, ms.z, 8, 3, 8, PALETTE.hullDark);
    batch.box("hullDark", 0, ms.y0 + 3, ms.z, 10, 6, 10, PALETTE.hullDark);
    const dish = new THREE.CylinderGeometry(6, 1, 1.2, 16, 1, true);
    dish.rotateX(-0.6);
    dish.translate(0, ms.y1 - 8, ms.z - 4);
    batch.add("hull", dish, PALETTE.hullLight, 0.1);
    for (let k = 0; k < 4; k++) {
      const spike = new THREE.CylinderGeometry(0.15, 0.4, 14, 6);
      spike.translate(Math.cos((k / 4) * Math.PI * 2) * 3, ms.y1 + 8, ms.z + Math.sin((k / 4) * Math.PI * 2) * 3);
      batch.add("hullDark", spike, PALETTE.hullDark, 0.1);
    }
    batch.box("exteriorRed", 0, ms.y1 + 3.6, ms.z, 1.2, 1.2, 1.2, PALETTE.impRed);
  }

  batch.build(group, { name: "superstructure" });

  // lit windows (instanced)
  const wm = instanced(new THREE.BoxGeometry(1, 1, 1), materials.exteriorLight, windows, false);
  wm.name = "windows";
  group.add(wm);

  // --- turbolaser batteries: heavy turrets flanking the city on the dorsal plateau
  const turretGeo = turretGeometry();
  const turrets = [];
  for (const s of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const z = 240 + k * 110;
      const t0 = CITY.tiers[0];
      const hw = t0.hw0 + ((t0.hw1 - t0.hw0) * (z - t0.zs)) / (t0.ze - t0.zs);
      _v.set(s * (hw + 22), dorsalH(z) + 0.5, z);
      _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), s > 0 ? -0.5 : 0.5);
      _s.set(1, 1, 1);
      _m.compose(_v, _q, _s);
      turrets.push({ m: _m.clone(), c: [0.72, 0.73, 0.76] });
    }
  }
  const tm = instanced(turretGeo, materials.hull, turrets);
  tm.name = "turbolasers";
  group.add(tm);
  // light point-defence turrets along the plateau edge (smaller), instanced
  const small = [];
  for (const s of [-1, 1]) {
    for (let z = -560; z < 700; z += 95) {
      const hw = (460 * (z + 800)) / 1560;
      _v.set(s * (hw * 0.6 - 6), dorsalH(z) + 0.4, z);
      _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), s * 0.9 + rand() * 0.6);
      _s.set(0.35, 0.35, 0.35);
      _m.compose(_v, _q, _s);
      small.push({ m: _m.clone(), c: [0.6, 0.61, 0.64] });
    }
  }
  const sm = instanced(turretGeo, materials.hullDark, small);
  sm.name = "pointDefence";
  lod0.add(sm);

  // --- sensor arrays / antennas on the city tops
  {
    const items = [];
    for (let i = 0; i < 60; i++) {
      const t = CITY.tiers[Math.floor(rand() * 3)];
      const z = t.zs + 8 + rand() * (t.ze - t.zs - 16);
      const hw = t.hw0 + ((t.hw1 - t.hw0) * (z - t.zs)) / (t.ze - t.zs) - 3;
      const x = (rand() * 2 - 1) * hw;
      const y = cityTopY(z) + 0.5;
      const h = 4 + rand() * 18;
      _v.set(x, y + h / 2, z);
      _s.set(0.4 + rand() * 0.5, h, 0.4 + rand() * 0.5);
      _m.compose(_v, _q.identity(), _s);
      items.push({ m: _m.clone(), c: [0.5, 0.5, 0.52] });
    }
    const am = instanced(new THREE.BoxGeometry(1, 1, 1), materials.hullDark, items, false);
    setVertexColor(am.geometry, 0xffffff);
    am.name = "antennas";
    lod0.add(am);
  }

  return { group, lod0, cityTop };
}
