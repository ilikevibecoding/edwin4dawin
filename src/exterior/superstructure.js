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
import { wedgeGeometry, HEAVY_TURRETS, heavyTurretX, TERRACES } from "./details.js";

const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _e = new THREE.Euler();

// Tower base: the wide trapezoid-section block on the top tier that the neck rises from (its top
// stays below the neck's observation-gallery opening at y 150.7).
export const TOWER_BASE = { hwB: 82, hwT: 76, h: 15, z0: 546, z1: 660 };

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

/**
 * Six-sided prism from 8 corners (bottom b0..b3, top t0..t3, same plan order). Every face is a planar
 * quad (all our prisms are linear in z), wound outward. Returns { top, side } geometries (the bottom
 * is omitted: it is always buried).
 */
function prism8(b, t) {
  const cx = b.concat(t).reduce((s, p) => [s[0] + p[0] / 8, s[1] + p[1] / 8, s[2] + p[2] / 8], [0, 0, 0]);
  const quadTris = (a, bb, c, d) => {
    // flip the winding when the normal points toward the centroid
    const ux = bb[0] - a[0], uy = bb[1] - a[1], uz = bb[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const mx = (a[0] + bb[0] + c[0] + d[0]) / 4 - cx[0], my = (a[1] + bb[1] + c[1] + d[1]) / 4 - cx[1], mz = (a[2] + bb[2] + c[2] + d[2]) / 4 - cx[2];
    const out = nx * mx + ny * my + nz * mz > 0;
    return out ? [...a, ...bb, ...c, ...a, ...c, ...d] : [...a, ...c, ...bb, ...a, ...d, ...c];
  };
  const build = (arr) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(arr), 3));
    g.computeVertexNormals();
    return g;
  };
  const top = build(quadTris(t[0], t[1], t[2], t[3]));
  const side = build([...quadTris(b[0], b[1], t[1], t[0]), ...quadTris(b[1], b[2], t[2], t[1]), ...quadTris(b[2], b[3], t[3], t[2]), ...quadTris(b[3], b[0], t[0], t[3])]);
  return { top, side };
}

/** Terrace prism around the tier-0 trapezoid: top follows the plateau slope, `h` above it. */
function terraceBlock(hw0, hw1, zs, ze, h) {
  const y0s = dorsalH(zs), y0e = dorsalH(ze);
  const b = [
    [-hw0, y0s - 2, zs],
    [hw0, y0s - 2, zs],
    [hw1, y0e - 2, ze],
    [-hw1, y0e - 2, ze],
  ];
  const t = [
    [-hw0, y0s + h, zs],
    [hw0, y0s + h, zs],
    [hw1, y0e + h, ze],
    [-hw1, y0e + h, ze],
  ];
  return prism8(b, t);
}

/** Block whose cross-section is an XY trapezoid (half-width hwB at the bottom, hwT at the top), z0..z1. */
function trapezoidBlock(hwB, hwT, y0, y1, z0, z1) {
  return prism8(
    [
      [-hwB, y0, z0],
      [hwB, y0, z0],
      [hwB, y0, z1],
      [-hwB, y0, z1],
    ],
    [
      [-hwT, y1, z0],
      [hwT, y1, z0],
      [hwT, y1, z1],
      [-hwT, y1, z1],
    ],
  );
}

/**
 * Vertical face plate in the XY plane at depth z..z+thick with a rectangular hole (the real window
 * opening of an interior room whose transparent glass sits just behind it). Exterior side faces -z.
 */
function facePlateWithHole(hw, y0, y1, z, thick, hole) {
  const shape = new THREE.Shape([new THREE.Vector2(-hw, y0), new THREE.Vector2(hw, y0), new THREE.Vector2(hw, y1), new THREE.Vector2(-hw, y1)]);
  const p = new THREE.Path([new THREE.Vector2(-hole.hw, hole.y0), new THREE.Vector2(-hole.hw, hole.y1), new THREE.Vector2(hole.hw, hole.y1), new THREE.Vector2(hole.hw, hole.y0)]);
  shape.holes.push(p);
  const g = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false, curveSegments: 2 });
  g.translate(0, 0, z);
  return g;
}

/**
 * Row of lit windows along a line: small tall panes (0.8 × 1.6 m) in clustered runs of 3–8 with
 * dark gaps between the runs, so from outside it reads as decks with rooms, not a string of
 * runway lights.
 */
function windowRow(items, x0, y, z0, x1, z1, rand, size = [0.8, 1.6, 0.4], step = 1.9) {
  const L = Math.hypot(x1 - x0, z1 - z0);
  let d = 1 + rand() * 3;
  while (d < L - 1) {
    const run = 3 + Math.floor(rand() * 6);
    for (let k = 0; k < run && d < L - 1; k++, d += step) {
      if (rand() < 0.12) continue; // dark pane
      const t = d / L;
      _v.set(x0 + (x1 - x0) * t, y, z0 + (z1 - z0) * t);
      _s.set(size[0], size[1], size[2]);
      _m.compose(_v, _q.identity(), _s);
      items.push({ m: _m.clone() });
    }
    d += 2 + rand() * 5;
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
 * Facade detail along a tier face from A to B (plan points) with outward normal n. The base may
 * slope (y0A at A → y0B at B, tier 0 follows the plateau); the top yTop is flat. Segments 5–11 m:
 * dark channels, light pilasters, recessed dark panels, protruding bays (random widths / heights)
 * with clustered window runs, plus deck ledges, cornice and plinth (ledges batched, the rest
 * instanced). No repeating template: every segment type is drawn from weighted randomness.
 */
function facade(A, B, y0A, y0B, yTop, n, rand, batch, dark, light, windows) {
  const dx = B.x - A.x;
  const dz = B.y - A.y;
  const L = Math.hypot(dx, dz);
  const dir = new THREE.Vector2(dx / L, dz / L);
  const yaw = Math.atan2(-dir.y, dir.x); // local X → dir
  const tilt = Math.atan2(y0B - y0A, L);
  const yBase = (t) => y0A + ((y0B - y0A) * t) / L;
  const at = (t, off, y) => _v.set(A.x + dir.x * t + n.x * off, y, A.y + dir.y * t + n.y * off);
  const hMin = yTop - Math.max(y0A, y0B);
  // flat ledges at deck lines below the cornice, cornice, sloping plinth along the base
  for (let k = 1; k <= 2; k++) {
    const y = yTop - 7.5 * k;
    if (y < Math.max(y0A, y0B) + 3) break;
    at(L / 2, 0.45, y);
    batch.rbox("hullDark", _v.x, _v.y, _v.z, L - 3, 0.7, 0.9, 0, yaw, 0, PALETTE.hullGrey.clone().multiplyScalar(0.85));
  }
  at(L / 2, 0.6, yTop - 0.9);
  batch.rbox("hull", _v.x, _v.y, _v.z, L - 1, 1.8, 1.2, 0, yaw, 0, PALETTE.hullGrey);
  at(L / 2, 0.4, (y0A + y0B) / 2 + 1.2);
  batch.rbox("hullDark", _v.x, _v.y, _v.z, L - 1, 2.4, 0.8, 0, yaw, tilt, PALETTE.hullDark);
  // segments
  let t = 3 + rand() * 6;
  while (t < L - 4) {
    const r = rand();
    const yb = yBase(t);
    const h = yTop - yb;
    if (r < 0.14 && t < L - 18 && hMin > 12) {
      // protruding bay with window runs
      const bw = 7 + rand() * 8;
      const bh = h * (0.45 + rand() * 0.4);
      const depth = 2.2 + rand() * 2.2;
      const yb2 = yBase(t + bw / 2);
      at(t + bw / 2, depth / 2 + 0.2, yb2 + bh / 2 + 0.4);
      light.push(boxItem(_v.x, _v.y, _v.z, bw, bh, depth, grey(0.6 + rand() * 0.12, 1.02), yaw));
      const rows = bh > 14 ? 3 : 2;
      for (let k = 0; k < rows; k++) {
        at(t + bw / 2, depth + 0.35, yb2 + bh * (0.25 + (0.5 * k) / (rows - 1)));
        windows.push(boxItem(_v.x, _v.y, _v.z, bw * (0.5 + rand() * 0.3), 1.2, 0.2, null, yaw));
      }
      if (rand() < 0.5) {
        at(t + bw / 2, depth * 0.5, yb2 + bh + 1.6);
        dark.push(boxItem(_v.x, _v.y, _v.z, bw * 0.5, 3.2, depth * 0.8, grey(0.3), yaw));
      }
      t += bw + 2 + rand() * 4;
    } else if (r < 0.3 && t < L - 12) {
      // recessed dark panel (reads as a set-back section) framed by two pilasters
      const pw = 4 + rand() * 6;
      const ph = h * (0.6 + rand() * 0.35);
      at(t + pw / 2, 0.25, yb + ph / 2 + 1.2);
      dark.push(boxItem(_v.x, _v.y, _v.z, pw, ph, 0.5, grey(0.2 + rand() * 0.08, 1.05), yaw));
      for (const e of [0, pw]) {
        at(t + e, 0.9, yb + h / 2);
        light.push(boxItem(_v.x, _v.y, _v.z, 1.6, h - 1.6, 1.8, grey(0.58 + rand() * 0.1, 1.02), yaw));
      }
      if (rand() < 0.6) {
        at(t + pw / 2, 0.6, yb + ph * (0.3 + rand() * 0.4));
        windows.push(boxItem(_v.x, _v.y, _v.z, pw * 0.6, 0.9, 0.2, null, yaw));
      }
      t += pw + 3 + rand() * 5;
    } else if (r < 0.55) {
      // pilaster (wide light rib)
      at(t, 0.9, yb + h / 2);
      light.push(boxItem(_v.x, _v.y, _v.z, 1.8 + rand() * 1.2, h - 1.6, 1.4 + rand() * 0.8, grey(0.6 + rand() * 0.12, 1.02), yaw));
      t += 5 + rand() * 6;
    } else {
      // dark channel
      at(t, 0.35, yb + h / 2);
      dark.push(boxItem(_v.x, _v.y, _v.z, 0.7 + rand() * 0.5, h - 3, 0.9, grey(0.16, 1.05), yaw));
      t += 5 + rand() * 6;
    }
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
  const terraceTop = TERRACES[TERRACES.length - 1].h;
  CITY.tiers.forEach((t, i) => {
    const y0 = i === 0 ? dorsalH(t.zs) - 6 : baseY;
    const h = t.h + (i === 0 ? dorsalH(t.ze) - dorsalH(t.zs) + 6 : 0);
    const { top, side } = taperedBlock(t.hw0, t.hw1, t.zs, t.ze, y0, h);
    batch.add("hullDark", top, PALETTE.hullGrey.clone().multiplyScalar(0.6), 0.02);
    // 0.01 tiling: 14 px city-light cells → ~0.7 m windows in deck rows ~8 m apart
    batch.add(i === 2 ? "city" : "cityDense", side, PALETTE.hullGrey, 0.01);
    baseY = y0 + h;
    tierTops.push(baseY);
    if (i === 0) {
      // shoulder terraces: two stepped bands following the plateau slope all around the base tier
      for (const tr of TERRACES) {
        const g = terraceBlock(t.hw0 + tr.out, t.hw1 + tr.out, t.zs - tr.out, t.ze + tr.out, tr.h);
        batch.add("hullDark", g.top, PALETTE.hullGrey.clone().multiplyScalar(0.72), 0.02);
        batch.add("cityDense", g.side, PALETTE.hullGrey, 0.01);
      }
      // channels on the terrace risers
      for (const s of [-1, 1]) {
        for (let z = t.zs - 4; z < t.ze + 4; z += 9 + rand() * 6) {
          const hw = tierHW(t, Math.min(Math.max(z, t.zs), t.ze));
          let yPrev = 0;
          for (const tr of TERRACES) {
            // riser of this step runs from the previous step's top to its own top
            dark.push(boxItem(s * (hw + tr.out + 0.3), dorsalH(z) + (yPrev + tr.h) / 2, z, 0.8, tr.h - yPrev - 1.6, 0.8, grey(0.16, 1.05)));
            yPrev = tr.h;
          }
        }
      }
    }
    // facades: port / starboard long faces (sloping base on tier 0), front face, back face
    const yA = i === 0 ? dorsalH(t.zs) + terraceTop + 0.3 : y0;
    const yB = i === 0 ? dorsalH(t.ze) + terraceTop + 0.3 : y0;
    facade(new THREE.Vector2(-t.hw0, t.zs), new THREE.Vector2(-t.hw1, t.ze), yA, yB, baseY, new THREE.Vector2(-1, 0), rand, batch, dark, light, windows);
    facade(new THREE.Vector2(t.hw1, t.ze), new THREE.Vector2(t.hw0, t.zs), yB, yA, baseY, new THREE.Vector2(1, 0), rand, batch, dark, light, windows);
    facade(new THREE.Vector2(t.hw0, t.zs), new THREE.Vector2(-t.hw0, t.zs), yA, yA, baseY, new THREE.Vector2(0, -1), rand, batch, dark, light, windows);
    facade(new THREE.Vector2(-t.hw1, t.ze), new THREE.Vector2(t.hw1, t.ze), yB, yB, baseY, new THREE.Vector2(0, 1), rand, batch, dark, light, windows);
    // clustered window runs along the long faces at deck lines (flat lines below the tier top)
    for (let k = 0; k < 3; k++) {
      const yy = baseY - 4 - 7.5 * k;
      if (yy < Math.max(yA, yB) + 2) break;
      for (const s of [-1, 1]) windowRow(windows, s * (t.hw0 + 0.3), yy, t.zs + 4, s * (t.hw1 + 0.3), t.ze - 4, rand, [0.4, 1.4, 0.8], 2.2);
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
          if (Math.abs(x) < CITY.canyonHalf + 13 && z > t.zs + 8 && z < TOWER_BASE.z0 - 2) return true;
          if (z > TOWER_BASE.z0 - 2 && z < TOWER_BASE.z1 + 2 && Math.abs(x) < TOWER_BASE.hwB + 2) return true;
        }
        return false;
      },
    };
    platingFor(surf, rand, [plateBucket], { maxW: 22, thickness: 1.3, embed: 0.4, zStart: t.zs + 1, zEnd: t.ze - 1, bucket: () => 0, grooveDepth: 1, toneScale: 0.98 });
  });
  const cityTop = baseY;

  // canyon along the top tier: two raised walls with the slot between them, machinery in the slot
  // (some of it taller than the walls so it shows from above and from the tower station)
  {
    const t = CITY.tiers[2];
    const zEndCanyon = TOWER_BASE.z0 - 6;
    for (const s of [-1, 1]) {
      const { top, side } = taperedBlock(4, 6, t.zs + 10, zEndCanyon, cityTop, 9);
      top.translate(s * (CITY.canyonHalf + 6), 0, 0);
      side.translate(s * (CITY.canyonHalf + 6), 0, 0);
      batch.add("hullDark", top, PALETTE.hullDark, 0.02);
      batch.add("city", side, PALETTE.hullGrey, 0.01);
    }
    for (let z = t.zs + 14; z < zEndCanyon - 6; z += 5 + rand() * 6) {
      const w = 2 + rand() * 5;
      const tall = rand() < 0.22;
      const hh = tall ? 9 + rand() * 8 : 1.5 + rand() * 4;
      const x = (rand() - 0.5) * (2 * CITY.canyonHalf - w - 1);
      dark.push(boxItem(x, cityTop + hh / 2, z, w, hh, 2 + rand() * 4, grey(0.3 + rand() * 0.3)));
      if (tall) for (let y = 3; y < hh - 1; y += 3.2) windows.push(boxItem(x + w / 2 + 0.05, cityTop + y, z, 0.2, 0.35, 1.4, null));
      else if (rand() < 0.5) windows.push(boxItem(x, cityTop + hh + 0.2, z, 0.5, 0.25, 1.4, null));
      greebles++;
    }
    // cross-bridges over the canyon
    for (const z of [t.zs + 60, t.zs + 140, t.zs + 198]) {
      batch.box("hull", 0, cityTop + 7.5, z, 2 * (CITY.canyonHalf + 6), 2.2, 6, PALETTE.hullGrey);
      windows.push(boxItem(0, cityTop + 6.2, z - 3.1, 14, 0.4, 0.2, null));
    }
  }

  // --- tower base (wide XY-trapezoid block on the top tier), neck with pilasters / ledges / pods,
  // observation band — the stack must read as the canonical trapezoid from the tower station
  const nk = TOWER.neck;
  {
    const tb = TOWER_BASE;
    const g = trapezoidBlock(tb.hwB, tb.hwT, cityTop - 1, cityTop + tb.h, tb.z0, tb.z1);
    batch.add("hullDark", g.top, PALETTE.hullGrey.clone().multiplyScalar(0.62), 0.02);
    batch.add("cityDense", g.side, PALETTE.hullGrey, 0.01);
    const yBase = cityTop + tb.h;
    // riser articulation on the base block: light ribs leaning with the sloping flanks, dark channels
    // on the front / back faces
    const hwMid = (tb.hwB + tb.hwT) / 2;
    const lean = Math.atan2(tb.hwB - tb.hwT, tb.h + 1);
    for (let z = tb.z0 + 6; z < tb.z1 - 4; z += 7 + rand() * 4) {
      for (const s of [-1, 1]) light.push(boxItem(s * (hwMid + 0.6), cityTop + tb.h / 2, z, 1.6, tb.h - 2, 1.6 + rand() * 1.2, grey(0.62 + rand() * 0.1, 1.02), 0, 0, s * lean));
    }
    for (let x = -tb.hwT + 3; x < tb.hwT - 2; x += 8 + rand() * 4) {
      for (const zf of [tb.z0 - 0.35, tb.z1 + 0.35]) dark.push(boxItem(x, cityTop + tb.h / 2, zf, 0.9, tb.h - 3, 0.9, grey(0.16, 1.05)));
    }
    // ledge around the top of the base block and machinery on its roof beside the neck
    batch.box("hullDark", 0, yBase + 0.5, (tb.z0 + tb.z1) / 2, tb.hwT * 2 + 2, 1.0, tb.z1 - tb.z0 + 2, PALETTE.hullDark);
    for (const s of [-1, 1]) {
      for (let z = tb.z0 + 6; z < TOWER.bridge.z0 + 4; z += 9 + rand() * 7) {
        const bw = 2.5 + rand() * 3;
        const bh = 2 + rand() * 4;
        const x = s * (nk.x + 10 + rand() * Math.max(0.5, tb.hwT - nk.x - bw - 11));
        dark.push(boxItem(x, yBase + 1 + bh / 2, z, bw, bh, 3 + rand() * 5, grey(0.3 + rand() * 0.25)));
        greebles++;
      }
      // shoulder housings on the roof against the neck flanks, ahead of the bridge buttresses
      light.push(boxItem(s * (nk.x + 4.5), yBase + 5.5, tb.z0 + 20, 8, 9, 30, grey(0.6, 1.02)));
      dark.push(boxItem(s * (nk.x + 9), yBase + 3.5, tb.z0 + 20, 1.4, 5, 22, grey(0.2, 1.05)));
    }

    // the neck block starts 0.8 m behind the face; the face itself is a plate with the observation
    // gallery's window opening (deck 2 room glass at world z = 562, y 150.9..153.4) so the room looks out
    const { top, side } = taperedBlock(nk.x * 0.92, nk.x, nk.z0 + 0.8, nk.z1, cityTop - 2, nk.yTop - cityTop + 2);
    batch.add("hullDark", top, PALETTE.hullDark, 0.02);
    batch.add("city", side, PALETTE.hullGrey, 0.01);
    batch.add("city", facePlateWithHole(nk.x * 0.92, cityTop - 2, nk.yTop, nk.z0, 0.8, { hw: 16.3, y0: 150.7, y1: 153.6 }), PALETTE.hullGrey, 0.01);
    const nh = nk.yTop - yBase;
    const nyc = (yBase + nk.yTop) / 2;
    // vertical articulation on the visible neck (above the base block): alternating dark channels and
    // light pilasters on the front face (clear of the observation band) and both flanks
    let k = 0;
    for (let x = -nk.x * 0.92 + 4; x < nk.x * 0.92 - 3; x += 6 + (k++ % 2) * 2.5) {
      if (Math.abs(x) < 19.5) continue;
      if (k % 3 === 0) light.push(boxItem(x, nyc, nk.z0 - 0.9, 2.2, nh - 1.6, 1.8, grey(0.62, 1.02)));
      else dark.push(boxItem(x, nyc, nk.z0 - 0.35, 0.9, nh - 2.5, 0.9, grey(0.16, 1.05)));
    }
    for (const s of [-1, 1]) {
      const yaw = s * Math.atan((nk.x - nk.x * 0.92) / (nk.z1 - nk.z0));
      let j = 0;
      for (let z = nk.z0 + 5; z < nk.z1 - 4; z += 6 + (j++ % 2) * 2.5) {
        const hw = nk.x * 0.92 + ((nk.x - nk.x * 0.92) * (z - nk.z0)) / (nk.z1 - nk.z0);
        if (j % 3 === 0) light.push(boxItem(s * (hw + 0.9), nyc, z, 1.8, nh - 1.6, 2.2, grey(0.62, 1.02), -yaw));
        else dark.push(boxItem(s * (hw + 0.35), nyc, z, 0.9, nh - 2.5, 0.9, grey(0.16, 1.05), -yaw));
      }
      // sensor pods on the neck flanks: framed housing (mid grey, not a black hole), pod, dish
      for (const z of [nk.z0 + 22, nk.z0 + 58]) {
        const hw = nk.x * 0.92 + ((nk.x - nk.x * 0.92) * (z - nk.z0)) / (nk.z1 - nk.z0);
        batch.box("hullDark", s * (hw + 2.0), yBase + 6.5, z, 4.0, 5, 9, PALETTE.hullGrey.clone().multiplyScalar(0.7));
        batch.box("hullDark", s * (hw + 1.2), yBase + 6.5, z, 2.4, 3.6, 7, PALETTE.hullDark);
        batch.cyl("hullDark", s * (hw + 3.4), yBase + 10.6, z, 3.2, 3.2, 12, "z", PALETTE.hullDark, 12);
        const dish = new THREE.CylinderGeometry(3.6, 0.6, 1.2, 16, 1, true);
        dish.rotateZ(s * -Math.PI / 2 + s * 0.4);
        dish.translate(s * (hw + 8.0), yBase + 12.1, z);
        batch.add("hull", dish, PALETTE.hullLight, 0.1);
      }
    }
    // horizontal ledge band around the neck between the observation band and the bridge bar
    batch.box("hullDark", 0, 158.6, (nk.z0 + nk.z1) / 2 + 0.4, nk.x * 2 + 1.6, 1.0, nk.z1 - nk.z0 + 1.2, PALETTE.hullGrey.clone().multiplyScalar(0.85));
    // observation gallery band: frame lips above / below the opening and dark side cheeks; the panes,
    // mullions and lit interior belong to the room itself (visible through the hole)
    batch.box("hull", 0, 154.4, nk.z0 - 1.1, 38, 1.2, 2.4, PALETTE.hullGrey);
    batch.box("hull", 0, 148.9, nk.z0 - 1.1, 38, 1.2, 2.4, PALETTE.hullGrey);
    for (const sx of [-1, 1]) batch.box("hullDark", sx * 17.6, 152.15, nk.z0 - 0.6, 2.6, 4.4, 1.4, PALETTE.hullBlack);
  }

  // --- bridge module: the wide bar with buttresses, panel channels, brow, window band
  const br = TOWER.bridge;
  const bw = br.x * 2;
  const bd = br.z1 - br.z0;
  const bh = br.y1 - br.y0;
  const bcz = (br.z0 + br.z1) / 2;
  const bcy = (br.y0 + br.y1) / 2;
  // the bar starts 0.8 m behind its front face; the face is a plate with the bridge window opening
  // (deck 1 bridge glass sits at world z = 591 just behind it, y 181.5..186.5)
  batch.box("hull", 0, bcy, (br.z0 + 0.8 + br.z1) / 2, bw, bh, bd - 0.8, PALETTE.hullGrey, 0.03);
  batch.add("hull", facePlateWithHole(br.x, br.y0, br.y1, br.z0, 0.8, { hw: TOWER.windows.x + 0.5, y0: TOWER.windows.y0 - 0.35, y1: TOWER.windows.y1 + 0.35 }), PALETTE.hullGrey, 0.03);
  batch.box("hullDark", 0, br.y0 - 1.5, bcz, bw + 2, 3, bd + 2, PALETTE.hullDark);
  batch.box("hullDark", 0, br.y1 + 1, bcz, bw - 8, 2, bd - 6, PALETTE.hullDark);
  const wedges = [];
  for (const s of [-1, 1]) {
    batch.box("city", s * (br.x + 1), bcy, bcz, 2, bh - 4, bd - 4, PALETTE.hullGrey);
    batch.box("hullDark", s * (br.x - 14), br.y1 + 2, bcz + 6, 22, 4, 30, PALETTE.hullDark);
    light.push(boxItem(s * (br.x - 14), br.y1 + 5.5, bcz + 2, 12, 3, 16, grey(0.7)));
    // buttress wedges: vertical face against the neck, horizontal face under the bar, standing on the
    // tower base block
    _v.set(s * (nk.x + 5.5), br.y0 - 3, bcz);
    _q.setFromEuler(_e.set(0, s > 0 ? 0 : Math.PI, -Math.PI / 2));
    _s.set(44, br.y0 - 3 - (cityTop + TOWER_BASE.h + 0.4), 44);
    wedges.push({ m: _m.compose(_v, _q, _s).clone(), c: grey(0.62, 1.02) });
    // angled struts out to the bar ends
    for (const z of [bcz - 18, bcz + 18]) {
      const x0 = s * (nk.x + 14);
      const x1 = s * (br.x - 16);
      const y0 = cityTop + TOWER_BASE.h + 2;
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
  // dark cheeks either side of the opening (no box across it: the room's glass is the pane)
  for (const sx of [-1, 1]) batch.box("hullDark", sx * (wn.x + 2.2), (wn.y0 + wn.y1) / 2, wn.z - 0.6, 3.4, wn.y1 - wn.y0 + 3, 1.6, PALETTE.hullBlack);
  batch.box("hull", 0, wn.y1 + 1.3, wn.z - 1.3, wn.x * 2 + 8, 1.4, 2.8, PALETTE.hullGrey);
  batch.box("hull", 0, wn.y0 - 1.2, wn.z - 1.3, wn.x * 2 + 8, 1.2, 2.8, PALETTE.hullGrey);
  batch.box("hullDark", 0, wn.y1 + 3.2, wn.z - 2.2, wn.x * 2 + 12, 1.6, 4.4, PALETTE.hullDark); // brow
  // near-black mullions aligned with the bridge's own frames (x = -22.5 + 3k) so from inside they hide
  // behind the room's mullions; from outside they read as the window band's structure
  for (let x = -22.5 + 3; x < 22.5 - 1; x += 3) dark.push(boxItem(x, (wn.y0 + wn.y1) / 2, wn.z - 0.5, 0.32, wn.y1 - wn.y0 + 0.6, 1.0, [0.05, 0.052, 0.06]));
  // deck window runs along the bridge module's front (two deck lines, clear of the window band), the
  // ends and the back
  windowRow(windows, -br.x + 12, br.y0 + 5.5, br.z0 - 0.55, -TOWER.windows.x - 8, br.z0 - 0.55, rand);
  windowRow(windows, TOWER.windows.x + 8, br.y0 + 5.5, br.z0 - 0.55, br.x - 12, br.z0 - 0.55, rand);
  windowRow(windows, -br.x + 12, br.y0 + 13.5, br.z0 - 0.55, -TOWER.windows.x - 8, br.z0 - 0.55, rand);
  windowRow(windows, TOWER.windows.x + 8, br.y0 + 13.5, br.z0 - 0.55, br.x - 12, br.z0 - 0.55, rand);
  windowRow(windows, -br.x - 0.3, bcy, br.z0 + 6, -br.x - 0.3, br.z1 - 6, rand, [0.4, 1.6, 0.8]);
  windowRow(windows, br.x + 0.3, bcy, br.z0 + 6, br.x + 0.3, br.z1 - 6, rand, [0.4, 1.6, 0.8]);
  windowRow(windows, -br.x + 24, br.y1 - 6, br.z1 + 0.3, br.x - 24, br.z1 + 0.3, rand);

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

  // instanced detail groups (tier-top grooves share the dark-box mesh with the channels)
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  group.add(instancedMesh(boxGeo, materials.ext_window, windows, { name: "windows" }));
  dark.push(...plateBucket.grooves);
  lod0.add(instancedMesh(boxGeo, materials.hullDark, dark, { name: "channels" }));
  lod0.add(instancedMesh(boxGeo, materials.hull2, light, { name: "facadeBlocks", castShadow: true }));
  lod0.add(instancedMesh(wedgeGeometry(), materials.hull, wedges, { name: "bridgeButtresses", castShadow: true }));
  // tier-top plating (LOD like the hull plates: visible far out)
  group.add(instancedMesh(boxGeo, materials.hull2, plateBucket.plates, { name: "tierPlates", castShadow: true }));

  // --- turbolaser batteries: 6 heavy turrets per side (4 large ones on the plateau beside the city on
  // dark pedestal pads, 2 smaller ones raised on the tier-0 top); the layout is shared with details.js
  const turretGeo = turretGeometry();
  const turrets = [];
  const t1 = CITY.tiers[1];
  const padTone = PALETTE.hullDark.clone().multiplyScalar(0.62);
  for (const s of [-1, 1]) {
    HEAVY_TURRETS.zs.forEach((z, k) => {
      const x = s * heavyTurretX(z);
      const sc = HEAVY_TURRETS.scale;
      _v.set(x, dorsalH(z) + 2.2, z);
      _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), s * -(0.35 + k * 0.12));
      _s.set(sc, sc, sc);
      turrets.push({ m: _m.compose(_v, _q, _s).clone(), c: grey(0.6, 1.03) });
      // pedestal pad: wide dark disc with a lighter rim ring and a step
      batch.cyl("hullDark", x, dorsalH(z) + 1.9, z, HEAVY_TURRETS.padR, HEAVY_TURRETS.padR + 1, 1.8, "y", padTone, 28);
      batch.cyl("hullDark", x, dorsalH(z) + 2.6, z, HEAVY_TURRETS.padR * 0.72, HEAVY_TURRETS.padR * 0.74, 1.2, "y", PALETTE.hullDark, 28);
      const ring = new THREE.TorusGeometry(HEAVY_TURRETS.padR + 0.6, 0.7, 6, 40);
      ring.rotateX(Math.PI / 2);
      ring.translate(x, dorsalH(z) + 2.4, z);
      batch.add("hull", ring, PALETTE.hullGrey.clone().multiplyScalar(0.8), 0.1);
    });
    for (const z of [470, 630]) {
      const hw = tierHW(t1, z);
      _v.set(s * (hw + 15.5), tierTops[0] + 1.2, z);
      _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), s * -0.7);
      _s.set(1.3, 1.3, 1.3);
      turrets.push({ m: _m.compose(_v, _q, _s).clone(), c: grey(0.6, 1.03) });
      batch.cyl("hullDark", s * (hw + 15.5), tierTops[0] + 1.0, z, 15.4, 15.8, 1.2, "y", padTone, 24);
    }
  }
  batch.build(group, { name: "superstructure_pads" });
  group.add(instancedMesh(turretGeo, materials.hull, turrets, { name: "turbolasers", castShadow: true }));
  // light point-defence turrets: plateau edges (dorsal + ventral), trench lips
  const small = [];
  for (const s of [-1, 1]) {
    for (let z = -560; z < 720; z += 95) {
      const hw = halfWidth(z) * HULL.plateauDorsal;
      _v.set(s * (hw - 8), dorsalH(z) + 1.7, z);
      _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), s * 0.9 + rand() * 0.6);
      _s.set(0.42, 0.42, 0.42);
      small.push({ m: _m.compose(_v, _q, _s).clone(), c: grey(0.5, 1.03) });
    }
    for (let z = -480; z < 720; z += 130) {
      const hw = halfWidth(z) * HULL.plateauVentral;
      _v.set(s * (hw - 10), -ventralH(z) - 1.5, z);
      _q.setFromEuler(_e.set(Math.PI, s * 0.9 + rand() * 0.6, 0));
      _s.set(0.42, 0.42, 0.42);
      small.push({ m: _m.compose(_v, _q, _s).clone(), c: grey(0.5, 1.03) });
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
