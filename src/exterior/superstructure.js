// Superstructure: the stepped "city" tiers on the dorsal plateau (lit window faces with vertical
// channels, pilasters, deck ledges and protruding bays; plated tops; central canyon with machinery),
// the command tower (neck with observation band and sensor pods, buttressed bridge module with the
// bridge windows, twin deflector domes on ported bases, comms mast), turbolaser batteries and
// point-defence. Static geometry is batched per material; repeated detail is instanced.
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { rng, setVertexColor } from "../kit.js";
import { CITY, TOWER, HULL, halfWidth, dorsalH, ventralH } from "./dims.js";
import { Batcher, instancedMesh, boxItem, mergeParts, grey } from "./batch.js";
import { platingFor } from "./hull.js";
import { wedgeGeometry } from "./details.js";

const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _e = new THREE.Euler();

/** Tapered block: plan trapezoid (half-width hw0 at zs → hw1 at ze), from y0 up by h. Returns { top, side } geometries. */
function taperedBlock(hw0, hw1, zs, ze, y0, h) {
  const shape = new THREE.Shape([new THREE.Vector2(-hw0, zs), new THREE.Vector2(hw0, zs), new THREE.Vector2(hw1, ze), new THREE.Vector2(-hw1, ze)]);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
  // shape lies in (x, z): rotateX(+90°) maps shape-y → world z and the extrusion → world -y, so lift by h
  geo.rotateX(Math.PI / 2);
  geo.translate(0, y0 + h, 0);
  const g = geo.index ? geo.toNonIndexed() : geo;
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

/** Row of small lit windows along a line (instanced boxes). */
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

/** Heavy turbolaser turret geometry (merged): base ring, pedestal, housing, twin barrels with sleeves and brakes. */
export function turretGeometry() {
  const parts = [];
  const add = (g, x, y, z, rx = 0, ry = 0, rz = 0) => {
    g.rotateX(rx);
    g.rotateY(ry);
    g.rotateZ(rz);
    g.translate(x, y, z);
    parts.push(g);
  };
  add(new THREE.CylinderGeometry(10.5, 11.2, 1.6, 20), 0, 0.8, 0);
  add(new THREE.TorusGeometry(10.1, 0.6, 6, 24), 0, 1.7, 0, Math.PI / 2);
  add(new THREE.CylinderGeometry(7.4, 8.4, 2.6, 12), 0, 2.9, 0);
  add(new THREE.BoxGeometry(13, 6.5, 15), 0, 7.4, -0.5);
  add(new THREE.BoxGeometry(14.2, 1.2, 16), 0, 4.6, -0.5);
  add(new THREE.BoxGeometry(10, 2.4, 9), 0, 11.6, 1);
  add(new THREE.BoxGeometry(9, 4, 4), 0, 7.2, 8.6);
  add(new THREE.SphereGeometry(1.6, 10, 8), 3.8, 12.9, 3);
  add(new THREE.CylinderGeometry(0.3, 0.3, 5, 6), -3.6, 15, 3.5);
  add(new THREE.BoxGeometry(9.8, 2.4, 3), 0, 8.6, -6.5);
  for (const s of [-1, 1]) {
    add(new THREE.CylinderGeometry(1.0, 1.35, 24, 10), s * 3.4, 8.6, -17, Math.PI / 2 - 0.1);
    add(new THREE.BoxGeometry(3.2, 3.2, 8), s * 3.4, 8.6, -8.5);
    add(new THREE.CylinderGeometry(1.55, 1.55, 2.4, 10), s * 3.4, 9.5, -28.4, Math.PI / 2 - 0.1);
  }
  const merged = mergeParts(parts, 0.06);
  return merged;
}

/**
 * Facade detail along a tier face from A to B (plan points), base y0, height h, outward normal n:
 * vertical dark channels, wider light pilasters, protruding bays with window strips, deck ledges and
 * a top cornice (ledges / cornice batched, the rest instanced).
 */
function facade(A, B, y0, h, n, rand, batch, dark, light, windows, spacing = 7) {
  const dx = B.x - A.x;
  const dz = B.y - A.y;
  const L = Math.hypot(dx, dz);
  const dir = new THREE.Vector2(dx / L, dz / L);
  const yaw = Math.atan2(-dir.y, dir.x); // local X → dir
  const at = (t, off, y) => _v.set(A.x + dir.x * t + n.x * off, y, A.y + dir.y * t + n.y * off);
  // ledges at deck lines + cornice
  for (let k = 1; k <= 2; k++) {
    at(L / 2, 0.45, y0 + (h * k) / 3);
    batch.rbox("hullDark", _v.x, _v.y, _v.z, L - 3, 0.7, 0.9, 0, yaw, 0, PALETTE.hullGrey.clone().multiplyScalar(0.85));
  }
  at(L / 2, 0.6, y0 + h - 0.9);
  batch.rbox("hull", _v.x, _v.y, _v.z, L - 1, 1.8, 1.2, 0, yaw, 0, PALETTE.hullGrey);
  at(L / 2, 0.4, y0 + 1.2);
  batch.rbox("hullDark", _v.x, _v.y, _v.z, L - 1, 2.4, 0.8, 0, yaw, 0, PALETTE.hullDark);
  // channels / pilasters / bays
  let t = 4 + rand() * spacing;
  let i = 0;
  while (t < L - 4) {
    const bay = i % 6 === 3 && t < L - 16;
    if (bay) {
      const bw = 8 + rand() * 6;
      const bh = h * (0.55 + rand() * 0.3);
      at(t + bw / 2, 1.8, y0 + bh / 2 + 0.5);
      light.push(boxItem(_v.x, _v.y, _v.z, bw, bh, 3.6, grey(0.72 + rand() * 0.1, 1.02), yaw));
      for (let k = 0; k < 2; k++) {
        at(t + bw / 2, 3.7, y0 + bh * (0.35 + 0.3 * k));
        windows.push(boxItem(_v.x, _v.y, _v.z, bw * 0.7, 0.5, 0.2, null, yaw));
      }
      t += bw + 3;
    } else {
      const pil = i % 3 === 2;
      at(t, pil ? 0.9 : 0.35, y0 + h / 2);
      if (pil) light.push(boxItem(_v.x, _v.y, _v.z, 2.2, h - 1.6, 1.8, grey(0.68 + rand() * 0.1, 1.02), yaw));
      else dark.push(boxItem(_v.x, _v.y, _v.z, 0.9, h - 3, 0.9, grey(0.16, 1.05), yaw));
      t += spacing * (0.8 + rand() * 0.4);
    }
    i++;
  }
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
  const dark = []; // instanced dark boxes (channels, ports, machinery)
  const light = []; // instanced light boxes (pilasters, bays, modules)
  const plateBucket = { plates: [], grooves: [], anchors: [] };
  const tierTops = [];
  let greebles = 0;

  // --- city tiers
  let baseY = null;
  const tierHW = (t, z) => t.hw0 + ((t.hw1 - t.hw0) * (z - t.zs)) / (t.ze - t.zs);
  CITY.tiers.forEach((t, i) => {
    const y0 = i === 0 ? dorsalH(t.zs) - 6 : baseY;
    const h = t.h + (i === 0 ? dorsalH(t.ze) - dorsalH(t.zs) + 6 : 0);
    const { top, side } = taperedBlock(t.hw0, t.hw1, t.zs, t.ze, y0, h);
    batch.add("hullDark", top, PALETTE.hullGrey.clone().multiplyScalar(0.6), 0.02);
    batch.add(i === 2 ? "city" : "cityDense", side, PALETTE.hullGrey, 0.02);
    baseY = y0 + h;
    tierTops.push(baseY);
    // facades: port / starboard long faces, front face, back face
    const yFace = i === 0 ? dorsalH(t.zs) + 1 : y0;
    const hFace = baseY - yFace;
    facade(new THREE.Vector2(-t.hw0, t.zs), new THREE.Vector2(-t.hw1, t.ze), yFace, hFace, new THREE.Vector2(-1, 0), rand, batch, dark, light, windows);
    facade(new THREE.Vector2(t.hw1, t.ze), new THREE.Vector2(t.hw0, t.zs), yFace, hFace, new THREE.Vector2(1, 0), rand, batch, dark, light, windows);
    facade(new THREE.Vector2(t.hw0, t.zs), new THREE.Vector2(-t.hw0, t.zs), yFace, hFace, new THREE.Vector2(0, -1), rand, batch, dark, light, windows, 6);
    facade(new THREE.Vector2(-t.hw1, t.ze), new THREE.Vector2(t.hw1, t.ze), yFace, hFace, new THREE.Vector2(0, 1), rand, batch, dark, light, windows, 6);
    // sparse lit windows along the tier faces at deck lines
    for (let k = 0; k < 3; k++) {
      const yy = yFace + hFace * (0.2 + 0.28 * k);
      for (const s of [-1, 1]) windowRow(windows, s * (t.hw0 + 0.35), yy, t.zs + 4, s * (t.hw1 + 0.35), t.ze - 4, Math.round((t.ze - t.zs) / 9), rand, [0.6, 0.5, 1.4]);
    }
    // plated top (hierarchical plating, finer than the hull), skipping the next tier's footprint
    const next = CITY.tiers[i + 1];
    const top0 = baseY;
    const surf = {
      side: 1,
      part: "tier" + i,
      isPlateau: true,
      hint: new THREE.Vector3(0, 1, 0),
      at(u, z, out) {
        return out.set((2 * u - 1) * tierHW(t, z), top0, z);
      },
      width(z) {
        return 2 * tierHW(t, z);
      },
      skip(x, z) {
        if (next && z > next.zs - 1.5 && z < next.ze + 1.5 && Math.abs(x) < tierHW(next, Math.min(Math.max(z, next.zs), next.ze)) + 1.5) return true;
        if (i === 2) {
          if (Math.abs(x) < CITY.canyonHalf + 13 && z > t.zs + 8 && z < t.ze - 58) return true;
          if (z > TOWER.neck.z0 - 4 && z < TOWER.neck.z1 + 4 && Math.abs(x) < TOWER.neck.x + 16) return true;
        }
        return false;
      },
    };
    platingFor(surf, rand, [plateBucket], { maxW: 22, thickness: 1.3, embed: 0.4, zStart: t.zs + 1, zEnd: t.ze - 1, bucket: () => 0, grooveDepth: 1, toneScale: 0.98 });
  });
  const cityTop = baseY;

  // canyon along the top tier: two raised walls with the slot between them, machinery in the slot
  {
    const t = CITY.tiers[2];
    for (const s of [-1, 1]) {
      const { top, side } = taperedBlock(4, 6, t.zs + 10, t.ze - 60, cityTop, 9);
      top.translate(s * (CITY.canyonHalf + 6), 0, 0);
      side.translate(s * (CITY.canyonHalf + 6), 0, 0);
      batch.add("hullDark", top, PALETTE.hullDark, 0.02);
      batch.add("city", side, PALETTE.hullGrey, 0.02);
    }
    for (let z = t.zs + 14; z < t.ze - 64; z += 5 + rand() * 6) {
      const w = 2 + rand() * 5;
      const hh = 1 + rand() * (rand() < 0.2 ? 7 : 3);
      const x = (rand() - 0.5) * (2 * CITY.canyonHalf - w - 1);
      dark.push(boxItem(x, cityTop + hh / 2, z, w, hh, 2 + rand() * 4, grey(0.3 + rand() * 0.3)));
      if (rand() < 0.5) windows.push(boxItem(x, cityTop + hh + 0.2, z, 0.5, 0.25, 1.4, null));
      greebles++;
    }
    // cross-bridges over the canyon
    for (const z of [t.zs + 60, t.zs + 150, t.zs + 235]) {
      batch.box("hull", 0, cityTop + 7.5, z, 2 * (CITY.canyonHalf + 6), 2.2, 6, PALETTE.hullGrey);
      windows.push(boxItem(0, cityTop + 6.2, z - 3.1, 14, 0.4, 0.2, null));
    }
  }

  // --- tower neck + shoulder blocks + observation band + sensor pods + neck channels
  const nk = TOWER.neck;
  {
    const { top, side } = taperedBlock(nk.x * 0.92, nk.x, nk.z0, nk.z1, cityTop - 2, nk.yTop - cityTop + 2);
    batch.add("hullDark", top, PALETTE.hullDark, 0.02);
    batch.add("city", side, PALETTE.hullGrey, 0.02);
    const nh = nk.yTop - cityTop;
    // vertical channels on the neck faces (front and sides), leaving the observation band clear
    for (let x = -nk.x * 0.92 + 5; x < nk.x * 0.92 - 4; x += 6.5) {
      if (Math.abs(x) < 17) continue;
      dark.push(boxItem(x, cityTop + nh / 2, nk.z0 - 0.35, 0.9, nh - 6, 0.9, grey(0.16, 1.05)));
    }
    for (const s of [-1, 1]) {
      const yaw = s * Math.atan((nk.x - nk.x * 0.92) / (nk.z1 - nk.z0));
      for (let z = nk.z0 + 6; z < nk.z1 - 5; z += 6.5) {
        const hw = nk.x * 0.92 + ((nk.x - nk.x * 0.92) * (z - nk.z0)) / (nk.z1 - nk.z0);
        dark.push(boxItem(s * (hw + 0.35), cityTop + nh / 2, z, 0.9, nh - 6, 0.9, grey(0.16, 1.05), -yaw));
      }
      // sensor pods on the neck flanks
      for (const z of [nk.z0 + 22, nk.z0 + 58]) {
        const hw = nk.x * 0.92 + ((nk.x - nk.x * 0.92) * (z - nk.z0)) / (nk.z1 - nk.z0);
        batch.cyl("hullDark", s * (hw + 3.2), cityTop + 26, z, 3.2, 3.2, 12, "z", PALETTE.hullDark, 12);
        batch.box("hullDark", s * (hw + 2.4), cityTop + 22, z, 4.8, 2, 8, PALETTE.hullBlack);
        const dish = new THREE.CylinderGeometry(3.6, 0.6, 1.2, 16, 1, true);
        dish.rotateZ(s * -Math.PI / 2 + s * 0.4);
        dish.translate(s * (hw + 7.8), cityTop + 27.5, z);
        batch.add("hull", dish, PALETTE.hullLight, 0.1);
      }
      // shoulder blocks
      batch.box("hullDark", s * (nk.x + 6), cityTop + 10, (nk.z0 + nk.z1) / 2, 12, 20, 40, PALETTE.hullDark);
      batch.box("city", s * (nk.x + 12), cityTop + 8, (nk.z0 + nk.z1) / 2 + 6, 1.5, 12, 26, PALETTE.hullGrey);
      light.push(boxItem(s * (nk.x + 6), cityTop + 21, (nk.z0 + nk.z1) / 2 - 8, 8, 2.4, 14, grey(0.72)));
      light.push(boxItem(s * (nk.x + 6), cityTop + 22.5, (nk.z0 + nk.z1) / 2 + 10, 5, 5, 6, grey(0.6)));
    }
    // observation gallery band (deck 2, world z ≈ 562, y ≈ 151.6): recess, glass strip, frame, lit segments
    batch.box("hullDark", 0, 151.6, nk.z0 + 0.2, 36, 4.2, 2.2, PALETTE.hullBlack);
    batch.box("exteriorGlass", 0, 151.6, nk.z0 - 0.6, 32, 2.2, 0.4, PALETTE.impBlack);
    batch.box("hull", 0, 154.4, nk.z0 - 1.1, 38, 1.2, 2.4, PALETTE.hullGrey);
    batch.box("hull", 0, 148.9, nk.z0 - 1.1, 38, 1.2, 2.4, PALETTE.hullGrey);
    for (let x = -14; x <= 14; x += 4) dark.push(boxItem(x, 151.6, nk.z0 - 1.0, 0.5, 2.4, 0.5, grey(0.3)));
    windowRow(windows, -15, 151.6, nk.z0 - 1.15, 15, nk.z0 - 1.15, 16, rand, [1.4, 1.2, 0.3]);
  }

  // --- bridge module: the wide bar with buttresses, panel channels, brow, window band
  const br = TOWER.bridge;
  const bw = br.x * 2;
  const bd = br.z1 - br.z0;
  const bh = br.y1 - br.y0;
  const bcz = (br.z0 + br.z1) / 2;
  const bcy = (br.y0 + br.y1) / 2;
  batch.box("hull", 0, bcy, bcz, bw, bh, bd, PALETTE.hullGrey, 0.03);
  batch.box("hullDark", 0, br.y0 - 1.5, bcz, bw + 2, 3, bd + 2, PALETTE.hullDark);
  batch.box("hullDark", 0, br.y1 + 1, bcz, bw - 8, 2, bd - 6, PALETTE.hullDark);
  const wedges = [];
  for (const s of [-1, 1]) {
    batch.box("city", s * (br.x + 1), bcy, bcz, 2, bh - 4, bd - 4, PALETTE.hullGrey);
    batch.box("hullDark", s * (br.x - 14), br.y1 + 2, bcz + 6, 22, 4, 30, PALETTE.hullDark);
    light.push(boxItem(s * (br.x - 14), br.y1 + 5.5, bcz + 2, 12, 3, 16, grey(0.7)));
    // buttress wedges: vertical face against the neck, horizontal face under the bar
    _v.set(s * (nk.x + 5.5), br.y0 - 3, bcz);
    _q.setFromEuler(_e.set(0, s > 0 ? 0 : Math.PI, -Math.PI / 2));
    _s.set(46, 34, 44);
    wedges.push({ m: _m.compose(_v, _q, _s).clone(), c: grey(0.66, 1.02) });
    // angled struts out to the bar ends
    for (const z of [bcz - 18, bcz + 18]) {
      const x0 = s * (nk.x + 4);
      const x1 = s * (br.x - 16);
      const y0 = cityTop + 14;
      const y1 = br.y0 - 2;
      const len = Math.hypot(x1 - x0, y1 - y0);
      const ang = Math.atan2(y1 - y0, x1 - x0);
      batch.rbox("hullDark", (x0 + x1) / 2, (y0 + y1) / 2, z, len, 4, 5, 0, 0, ang, PALETTE.hullDark);
    }
    // end caps: sensor cluster + dish on each end of the bar
    batch.cyl("hullDark", s * (br.x + 2.5), bcy + 6, bcz - 12, 3.5, 3.5, 5, "x", PALETTE.hullDark, 12);
    const dish = new THREE.CylinderGeometry(5, 0.6, 1.2, 16, 1, true);
    dish.rotateZ(s * -Math.PI / 2 + s * 0.3);
    dish.translate(s * (br.x + 6.5), bcy + 6, bcz - 12);
    batch.add("hull", dish, PALETTE.hullLight, 0.1);
    for (let k = 0; k < 3; k++) light.push(boxItem(s * (br.x + 1.8), br.y0 + 6 + k * 9, bcz + 8 + k * 6, 2.6, 4, 7, grey(0.62)));
    // corner antenna spikes on the bar top
    for (const z of [br.z0 + 5, br.z1 - 5]) dark.push(boxItem(s * (br.x - 5), br.y1 + 8, z, 0.5, 14, 0.5, grey(0.4)));
  }
  // panel channels on the bar's front face (either side of the window band) and back face
  for (let x = -br.x + 6; x < br.x - 5; x += 7.5) {
    if (Math.abs(x) < TOWER.windows.x + 5) {
      dark.push(boxItem(x, br.y0 + 4.5, br.z0 - 0.35, 0.8, 7, 0.8, grey(0.16, 1.05)));
      dark.push(boxItem(x, br.y1 - 5, br.z0 - 0.35, 0.8, 8, 0.8, grey(0.16, 1.05)));
    } else dark.push(boxItem(x, bcy, br.z0 - 0.35, 0.8, bh - 5, 0.8, grey(0.16, 1.05)));
    dark.push(boxItem(x, bcy, br.z1 + 0.35, 0.8, bh - 5, 0.8, grey(0.16, 1.05)));
  }
  // horizontal deck-line ledges on the bar's front / back faces, machinery blocks on the roof
  for (const zf of [br.z0 - 0.45, br.z1 + 0.45]) {
    batch.box("hullDark", 0, br.y0 + 9.5, zf, bw - 6, 0.6, 0.9, PALETTE.hullGrey.clone().multiplyScalar(0.85));
    batch.box("hullDark", 0, br.y1 - 8.5, zf, bw - 6, 0.6, 0.9, PALETTE.hullGrey.clone().multiplyScalar(0.85));
  }
  for (const s of [-1, 1]) {
    light.push(boxItem(s * 34, br.y1 + 3.6, bcz - 14, 14, 3.2, 9, grey(0.7)));
    light.push(boxItem(s * 28, br.y1 + 2.6, bcz + 18, 8, 1.6, 6, grey(0.62)));
    dark.push(boxItem(s * 40, br.y1 + 4.4, bcz + 12, 3, 4.8, 3, grey(0.3)));
    windows.push(boxItem(s * 34, br.y1 + 3.8, bcz - 18.6, 9, 0.5, 0.2, null));
  }
  // bridge windows: a recessed dark band across the front face with the glass strip inside; frame
  // lips above and below, mullions, a brow ledge (TOWER.windows y / z unchanged)
  const wn = TOWER.windows;
  batch.box("hullDark", 0, (wn.y0 + wn.y1) / 2, wn.z + 0.2, wn.x * 2 + 6, wn.y1 - wn.y0 + 3, 2.4, PALETTE.hullBlack);
  batch.box("exteriorGlass", 0, (wn.y0 + wn.y1) / 2, wn.z - 0.9, wn.x * 2, wn.y1 - wn.y0, 0.6, PALETTE.impBlack);
  batch.box("hull", 0, wn.y1 + 1.3, wn.z - 1.3, wn.x * 2 + 8, 1.4, 2.8, PALETTE.hullGrey);
  batch.box("hull", 0, wn.y0 - 1.2, wn.z - 1.3, wn.x * 2 + 8, 1.2, 2.8, PALETTE.hullGrey);
  batch.box("hullDark", 0, wn.y1 + 3.2, wn.z - 2.2, wn.x * 2 + 12, 1.6, 4.4, PALETTE.hullDark); // brow
  {
    const items = [];
    for (let x = -wn.x + 3; x < wn.x; x += 3) {
      const thick = Math.abs(x) < 0.1 ? 1.0 : 0.5;
      items.push(boxItem(x, (wn.y0 + wn.y1) / 2, wn.z - 1.1, thick, wn.y1 - wn.y0, 0.6, [0.35, 0.36, 0.38]));
    }
    items.push(boxItem(0, (wn.y0 + wn.y1) / 2, wn.z - 1.1, wn.x * 2, 0.3, 0.6, [0.35, 0.36, 0.38]));
    lod0.add(instancedMesh(new THREE.BoxGeometry(1, 1, 1), materials.hullDark, items, { name: "bridgeMullions" }));
  }
  // observation-deck window rows along the bridge module's front and sides
  windowRow(windows, -br.x + 16, br.y0 + 6, br.z0 - 0.3, br.x - 16, br.z0 - 0.3, 34, rand);
  windowRow(windows, -br.x - 0.3, bcy, br.z0 + 6, -br.x - 0.3, br.z1 - 6, 10, rand, [0.4, 0.8, 1.2]);
  windowRow(windows, br.x + 0.3, bcy, br.z0 + 6, br.x + 0.3, br.z1 - 6, 10, rand, [0.4, 0.8, 1.2]);
  windowRow(windows, -br.x + 30, br.y1 - 6, br.z1 + 0.3, br.x - 30, br.z1 + 0.3, 20, rand);

  // --- deflector domes on ported bases
  const dm = TOWER.domes;
  for (const s of [-1, 1]) {
    const geo = new THREE.SphereGeometry(dm.r, 40, 28);
    geo.translate(s * dm.x, dm.y, dm.z);
    batch.add("hull", geo, PALETTE.hullLight, 0.04);
    batch.cyl("hullDark", s * dm.x, br.y1 + 2.2, dm.z, dm.r * 1.12, dm.r * 1.18, 4.4, "y", PALETTE.hullDark, 24);
    batch.cyl("hull", s * dm.x, br.y1 + 5.2, dm.z, dm.r * 0.98, dm.r * 1.1, 2, "y", PALETTE.hullGrey, 24);
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      dark.push(boxItem(s * dm.x + Math.cos(a) * dm.r * 1.15, br.y1 + 2.4, dm.z + Math.sin(a) * dm.r * 1.15, 2.6, 2.2, 1.6, grey(0.1), -a));
    }
    for (let k = 0; k < 6; k++) {
      const ring = new THREE.TorusGeometry(dm.r + 0.25, 0.35, 6, 40);
      ring.rotateY((k / 6) * Math.PI);
      ring.translate(s * dm.x, dm.y, dm.z);
      batch.add("hullDark", ring, PALETTE.hullDark, 0.1);
    }
    const eq = new THREE.TorusGeometry(dm.r * 0.72, 0.5, 6, 40);
    eq.rotateX(Math.PI / 2);
    eq.translate(s * dm.x, dm.y + dm.r * 0.69, dm.z);
    batch.add("hullDark", eq, PALETTE.hullDark, 0.1);
  }
  // --- comms mast between the domes: tapered column, platforms, two dishes, cross-arms, spikes, beacon
  const ms = TOWER.mast;
  {
    const geo = new THREE.CylinderGeometry(ms.r * 0.7, ms.r, ms.y1 - ms.y0, 10);
    geo.translate(0, (ms.y0 + ms.y1) / 2, ms.z);
    batch.add("hullDark", geo, PALETTE.hullGrey, 0.1);
    batch.box("hullDark", 0, ms.y1 + 1.5, ms.z, 8, 3, 8, PALETTE.hullDark);
    batch.box("hullDark", 0, ms.y0 + 3, ms.z, 10, 6, 10, PALETTE.hullDark);
    batch.box("hull", 0, ms.y0 + 20, ms.z, 6, 1.2, 6, PALETTE.hullGrey);
    batch.box("hull", 0, ms.y0 + 38, ms.z, 5, 1.0, 5, PALETTE.hullGrey);
    const dish = new THREE.CylinderGeometry(6, 1, 1.2, 16, 1, true);
    dish.rotateX(-0.6);
    dish.translate(0, ms.y1 - 8, ms.z - 4);
    batch.add("hull", dish, PALETTE.hullLight, 0.1);
    const dish2 = new THREE.CylinderGeometry(4, 0.7, 1.0, 16, 1, true);
    dish2.rotateX(0.7);
    dish2.rotateY(Math.PI);
    dish2.translate(0, ms.y0 + 24, ms.z + 4);
    batch.add("hull", dish2, PALETTE.hullLight, 0.1);
    for (const [y, len, yaw] of [
      [ms.y0 + 30, 16, 0],
      [ms.y0 + 46, 12, Math.PI / 2],
      [ms.y1 - 14, 10, 0.4],
    ]) {
      batch.rbox("hullDark", 0, y, ms.z, len, 0.5, 0.5, 0, yaw, 0, PALETTE.hullDark);
      batch.rbox("hullDark", 0, y + 1.2, ms.z, 0.4, 2.4, 0.4, 0, 0, 0, PALETTE.hullDark);
    }
    for (let k = 0; k < 4; k++) {
      const spike = new THREE.CylinderGeometry(0.15, 0.4, 14, 6);
      spike.translate(Math.cos((k / 4) * Math.PI * 2) * 3, ms.y1 + 8, ms.z + Math.sin((k / 4) * Math.PI * 2) * 3);
      batch.add("hullDark", spike, PALETTE.hullDark, 0.1);
    }
    batch.box("exteriorRed", 0, ms.y1 + 3.6, ms.z, 1.2, 1.2, 1.2, PALETTE.impRed);
  }

  batch.build(group, { name: "superstructure" });

  // instanced detail groups
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  group.add(instancedMesh(boxGeo, materials.exteriorLight, windows, { name: "windows" }));
  lod0.add(instancedMesh(boxGeo, materials.hullDark, dark, { name: "channels" }));
  lod0.add(instancedMesh(boxGeo, materials.hull2, light, { name: "facadeBlocks", castShadow: true }));
  lod0.add(instancedMesh(wedgeGeometry(), materials.hull, wedges, { name: "bridgeButtresses", castShadow: true }));
  // tier-top plating (LOD like the hull plates: visible far out)
  group.add(instancedMesh(boxGeo, materials.hull2, plateBucket.plates, { name: "tierPlates", castShadow: true }));
  if (plateBucket.grooves.length) lod0.add(instancedMesh(boxGeo, materials.hullDark, plateBucket.grooves, { name: "tierGrooves" }));

  // --- turbolaser batteries: 6 heavy turrets per side (4 on the plateau, 2 raised on the tier-0 top)
  const turretGeo = turretGeometry();
  const turrets = [];
  const t0 = CITY.tiers[0];
  const t1 = CITY.tiers[1];
  for (const s of [-1, 1]) {
    [230, 330, 440, 550].forEach((z, k) => {
      const hw = tierHW(t0, z);
      _v.set(s * (hw + 26), dorsalH(z) + 1.7, z);
      _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), s * -(0.35 + k * 0.12));
      _s.set(1, 1, 1);
      turrets.push({ m: _m.compose(_v, _q, _s).clone(), c: grey(0.72, 1.03) });
      // pedestal pad
      batch.cyl("hullDark", s * (hw + 26), dorsalH(z) + 1.5, z, 13, 14, 1.4, "y", PALETTE.hullDark, 20);
    });
    for (const z of [470, 630]) {
      const hw = tierHW(t1, z);
      _v.set(s * (hw + 14), tierTops[0] + 1.2, z);
      _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), s * -0.7);
      _s.set(0.85, 0.85, 0.85);
      turrets.push({ m: _m.compose(_v, _q, _s).clone(), c: grey(0.7, 1.03) });
    }
  }
  batch.build(group, { name: "superstructure_pads" });
  group.add(instancedMesh(turretGeo, materials.hull, turrets, { name: "turbolasers", castShadow: true }));
  // light point-defence turrets: plateau edges (dorsal + ventral), trench lips
  const small = [];
  for (const s of [-1, 1]) {
    for (let z = -560; z < 720; z += 95) {
      const hw = halfWidth(z) * HULL.plateauDorsal;
      _v.set(s * (hw - 7), dorsalH(z) + 1.7, z);
      _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), s * 0.9 + rand() * 0.6);
      _s.set(0.32, 0.32, 0.32);
      small.push({ m: _m.compose(_v, _q, _s).clone(), c: grey(0.6, 1.03) });
    }
    for (let z = -480; z < 720; z += 130) {
      const hw = halfWidth(z) * HULL.plateauVentral;
      _v.set(s * (hw - 9), -ventralH(z) - 1.5, z);
      _q.setFromEuler(_e.set(Math.PI, s * 0.9 + rand() * 0.6, 0));
      _s.set(0.32, 0.32, 0.32);
      small.push({ m: _m.compose(_v, _q, _s).clone(), c: grey(0.55, 1.03) });
    }
    for (let z = -400; z < 700; z += 140) {
      const w = halfWidth(z);
      _v.set(s * (w - 3.5), HULL.trenchHalf + 0.2, z);
      _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), s * 1.4);
      _s.set(0.26, 0.26, 0.26);
      small.push({ m: _m.compose(_v, _q, _s).clone(), c: grey(0.55, 1.03) });
    }
  }
  lod0.add(instancedMesh(turretGeo, materials.hullDark, small, { name: "pointDefence" }));
  greebles += dark.length + light.length + turrets.length + small.length;

  return { group, lod0, cityTop, tierTops, anchors: plateBucket.anchors, stats: { greebles, tierPlates: plateBucket.plates.length } };
}
