// Comms equipment: rack cabinets with drawer modules / LED columns / readouts, patch frames, patch cables,
// overhead cable trays, ducting and the ceiling structure. World-space kit-bashing.
import * as THREE from "three";
import { rng } from "../../../kit.js";
import { decalRect } from "../../../textures.js";
import { IMP } from "../shared/palette.js";
import { cable, led, pick } from "./lib.js";
import { UI, uvRect } from "./ui.js";

export const RACK_W = 1.2;
export const RACK_D = 0.9;
export const RACK_H = 2.6;
const LED_MATS = ["emitBlue", "emitBlue", "emitBlue", "emitBlue", "emitBlue", "emitAmber", "emitAmber", "emitRedImp"];

/**
 * One rack cabinet. x0 = west edge, zBack = wall-side z, f = +1 (face toward +z) | -1 (face toward -z).
 * Returns the face z and the patch points used for cabling.
 */
export function rack(kit, x0, y0, zBack, f, seed) {
  const rand = rng(seed);
  const x1 = x0 + RACK_W;
  const zFace = zBack + f * RACK_D;
  const zIn = (d) => zFace - f * d; // d metres behind the face plane
  const zmm = (d0, d1) => [Math.min(zIn(d0), zIn(d1)), Math.max(zIn(d0), zIn(d1))];
  const boxD = (mat, xa, xb, ya, yb, d0, d1, opts) => {
    const [za, zb] = zmm(d0, d1);
    kit.boxMM(mat, [xa, y0 + ya, za], [xb, y0 + yb, zb], opts);
  };
  // body (sides, back, top) and a recessed gloss front behind the modules
  boxD("paintedMetal", x0, x1, 0, RACK_H, 0.06, RACK_D, { color: IMP.dark, texel: 1 });
  boxD("darkGloss", x0 + 0.05, x1 - 0.05, 0.1, RACK_H - 0.08, 0.05, 0.06);
  // front frame rails, kick and cap
  boxD("metal", x0, x0 + 0.06, 0.12, RACK_H - 0.1, 0.0, 0.06, { color: IMP.mid, texel: 2 });
  boxD("metal", x1 - 0.06, x1, 0.12, RACK_H - 0.1, 0.0, 0.06, { color: IMP.mid, texel: 2 });
  boxD("paintedMetal", x0, x1, 0, 0.12, 0.0, 0.06, { color: IMP.black, texel: 1 });
  boxD("paintedMetal", x0, x1, RACK_H - 0.1, RACK_H, 0.0, 0.06, { color: IMP.black, texel: 1 });
  // kick vent slats
  for (let k = 0; k < 3; k++) boxD("metal", x0 + 0.15, x1 - 0.15, 0.03 + k * 0.03, 0.04 + k * 0.03, -0.004, 0.0, { color: IMP.dark });
  // top cap trim + cable entry box on the roof (wall side) with cables rising to the tray
  boxD("metal", x0 + 0.02, x1 - 0.02, RACK_H, RACK_H + 0.02, 0.02, RACK_D - 0.02, { color: IMP.mid, texel: 2 });
  boxD("metalRough", x0 + 0.35, x1 - 0.35, RACK_H + 0.02, RACK_H + 0.18, 0.5, 0.85, { color: IMP.mid, texel: 2 });

  // modules from the kick up to the cap
  const mx0 = x0 + 0.07;
  const mx1 = x1 - 0.07;
  const mw = mx1 - mx0;
  let y = 0.14;
  let idx = 0;
  const patch = [];
  const heights = [0.13, 0.22, 0.31, 0.4, 0.22, 0.13];
  while (y < RACK_H - 0.12 - 0.13) {
    let h = pick(rand, heights);
    if (y + h > RACK_H - 0.12) h = RACK_H - 0.12 - y;
    if (h < 0.1) break;
    const ya = y;
    const yb = y + h - 0.015;
    const cy = (ya + yb) / 2;
    const r = rand();
    if (r < 0.34) {
      // drawer: black face, wide handle, one status LED
      boxD("paintedMetal", mx0, mx1, ya, yb, 0.008, 0.05, { color: IMP.black, texel: 1 });
      boxD("metal", mx0 + mw * 0.3, mx1 - mw * 0.3, cy - 0.012, cy + 0.012, -0.018, 0.008, { color: IMP.mid, texel: 2 });
      boxD("metal", mx0 + mw * 0.3, mx0 + mw * 0.3 + 0.02, cy - 0.012, cy + 0.012, -0.018, 0.0, { color: IMP.mid });
      boxD("metal", mx1 - mw * 0.3 - 0.02, mx1 - mw * 0.3, cy - 0.012, cy + 0.012, -0.018, 0.0, { color: IMP.mid });
      led(kit, pick(rand, LED_MATS), mx1 - 0.06, y0 + cy, zIn(0.008), "z", f, 0.02);
      if (h > 0.2) led(kit, "emitBlue", mx0 + 0.06, y0 + cy, zIn(0.008), "z", f, 0.02);
    } else if (r < 0.64) {
      // LED matrix module: dense indicator grid on a gloss face
      boxD("paintedMetal", mx0, mx1, ya, yb, 0.008, 0.05, { color: IMP.dark, texel: 1 });
      boxD("darkGloss", mx0 + 0.02, mx1 - 0.02, ya + 0.02, yb - 0.02, 0.004, 0.008);
      const rowsN = Math.max(1, Math.floor((h - 0.05) / 0.05));
      const colsN = 6 + Math.floor(rand() * 6);
      const pitch = (mw - 0.16) / colsN;
      for (let rr = 0; rr < rowsN; rr++)
        for (let cc = 0; cc < colsN; cc++) {
          if (rand() < 0.22) continue;
          const lx = mx0 + 0.08 + pitch * (cc + 0.5);
          const ly = ya + 0.035 + rr * 0.05;
          led(kit, pick(rand, LED_MATS), lx, y0 + ly, zIn(0.004), "z", f, 0.02, 0.006);
        }
      if (rand() < 0.5) patch.push([mx1 - 0.1, y0 + cy, zIn(0.0)]);
    } else if (r < 0.8) {
      // readout module: small screen + three LEDs + two toggles
      boxD("paintedMetal", mx0, mx1, ya, yb, 0.008, 0.05, { color: IMP.dark, texel: 1 });
      const sh = Math.min(0.12, h - 0.05);
      const sw = sh * 2;
      const sx = mx0 + 0.08;
      const [za, zb] = zmm(0.0, 0.008);
      kit.boxMM("commsUI", [sx, y0 + cy - sh / 2, za], [sx + sw, y0 + cy + sh / 2, zb], { uv: "keep", uvRect: uvRect(UI["readout" + (idx % 8)]) });
      for (let k = 0; k < 3; k++) led(kit, pick(rand, LED_MATS), sx + sw + 0.06 + k * 0.05, y0 + cy, zIn(0.008), "z", f, 0.02);
      for (let k = 0; k < 2; k++) boxD("metal", mx1 - 0.12 - k * 0.07, mx1 - 0.09 - k * 0.07, cy - 0.02, cy + 0.02, -0.02, 0.008, { color: IMP.mid });
      patch.push([mx1 - 0.05, y0 + cy, zIn(0.0)]);
    } else {
      // blanking / vent module
      boxD("paintedMetal", mx0, mx1, ya, yb, 0.008, 0.05, { color: IMP.dark, texel: 1 });
      const n = Math.max(2, Math.floor((h - 0.04) / 0.03));
      for (let k = 0; k < n; k++) boxD("metal", mx0 + 0.1, mx1 - 0.1, ya + 0.02 + k * 0.03, ya + 0.028 + k * 0.03, -0.004, 0.008, { color: IMP.black });
    }
    y += h;
    idx++;
  }
  // label plate + stencil on the cap
  {
    const [za, zb] = zmm(-0.004, 0.0);
    kit.boxMM("impPanel", [x0 + 0.12, y0 + RACK_H - 0.085, za], [x0 + 0.27, y0 + RACK_H - 0.02, zb], { color: IMP.white, texel: 2 });
    const g = new THREE.PlaneGeometry(0.12, 0.05);
    if (f < 0) g.rotateY(Math.PI);
    // spec-plate cell, cropped to its centre text lines
    const c = decalRect(9);
    const u0 = c[0] + (c[2] - c[0]) * 0.12;
    const u1 = c[0] + (c[2] - c[0]) * 0.88;
    const v0 = c[1] + (c[3] - c[1]) * 0.4;
    const v1 = c[1] + (c[3] - c[1]) * 0.62;
    kit.add("decal", g, { pos: [x0 + 0.195, y0 + RACK_H - 0.052, zIn(-0.0065)], uv: "keep", uvRect: [u0, v0, u1, v1] });
    const g2 = new THREE.PlaneGeometry(0.14, 0.14);
    if (f < 0) g2.rotateY(Math.PI);
    kit.add("decal", g2, { pos: [x1 - 0.2, y0 + RACK_H - 0.25, zIn(-0.006)], uv: "keep", uvRect: decalRect(pick(rand, [5, 5, 13, 1])) });
  }
  // roof cables up to the tray
  const trayY = y0 + 3.28;
  for (let k = 0; k < 2; k++) {
    const cx = x0 + 0.45 + k * 0.3;
    cable(kit, "paintedMetal", [cx, y0 + RACK_H + 0.18, zIn(0.67)], [cx + (rand() - 0.5) * 0.2, trayY, zIn(0.55 + rand() * 0.1)], 0.014, { color: k ? IMP.blue : IMP.black });
  }
  kit.collider([x0, y0, Math.min(zBack, zFace)], [x1, y0 + RACK_H, Math.max(zBack, zFace)], "rack");
  return { zFace, patch, x0, x1, f };
}

// Open patch/distribution frame in a rack slot: posts, patch panels with LED rows, looping cables.
export function patchFrame(kit, x0, y0, zBack, f, seed) {
  const rand = rng(seed);
  const x1 = x0 + RACK_W;
  const zFace = zBack + f * RACK_D;
  const zIn = (d) => zFace - f * d;
  const zmm = (d0, d1) => [Math.min(zIn(d0), zIn(d1)), Math.max(zIn(d0), zIn(d1))];
  const boxD = (mat, xa, xb, ya, yb, d0, d1, opts) => {
    const [za, zb] = zmm(d0, d1);
    kit.boxMM(mat, [xa, y0 + ya, za], [xb, y0 + yb, zb], opts);
  };
  // back plate against the wall, two posts, top and bottom rails
  boxD("paintedMetal", x0 + 0.05, x1 - 0.05, 0, RACK_H, 0.8, RACK_D, { color: IMP.black, texel: 1 });
  boxD("metal", x0, x0 + 0.08, 0, RACK_H, 0.1, 0.18, { color: IMP.mid, texel: 2 });
  boxD("metal", x1 - 0.08, x1, 0, RACK_H, 0.1, 0.18, { color: IMP.mid, texel: 2 });
  boxD("paintedMetal", x0, x1, 0, 0.12, 0.0, RACK_D, { color: IMP.black, texel: 1 });
  boxD("paintedMetal", x0, x1, RACK_H - 0.08, RACK_H, 0.0, RACK_D, { color: IMP.black, texel: 1 });
  // vertical cable trunk on the back plate
  boxD("metalRough", x0 + 0.15, x0 + 0.4, 0.12, RACK_H - 0.08, 0.6, 0.8, { color: IMP.mid, texel: 1 });
  // panels with port rows and LEDs
  const panels = [];
  for (let k = 0; k < 6; k++) {
    const ya = 0.3 + k * 0.36;
    boxD("paintedMetal", x0 + 0.08, x1 - 0.08, ya, ya + 0.1, 0.1, 0.2, { color: IMP.dark, texel: 1 });
    boxD("darkGloss", x0 + 0.1, x1 - 0.1, ya + 0.015, ya + 0.085, 0.095, 0.1);
    for (let p = 0; p < 12; p++) {
      const px = x0 + 0.14 + p * 0.078;
      boxD("paintedMetal", px, px + 0.03, ya + 0.028, ya + 0.058, 0.09, 0.095, { color: IMP.black });
      if (rand() < 0.75) led(kit, pick(rand, LED_MATS), px + 0.015, y0 + ya + 0.075, zIn(0.095), "z", f, 0.012, 0.005);
      if (rand() < 0.45) panels.push([px + 0.015, y0 + ya + 0.043, zIn(0.09)]);
    }
  }
  // looping patch cables between random ports
  for (let i = 0; i + 1 < panels.length && i < 26; i += 2) {
    const a = panels[i];
    const b = panels[(i * 7 + 3) % panels.length];
    if (Math.abs(a[1] - b[1]) < 0.05) continue;
    const col = pick(rand, [IMP.black, IMP.black, IMP.blue, IMP.amber, IMP.mid]);
    const aa = [a[0], a[1], zIn(0.0)];
    const bb = [b[0], b[1], zIn(0.0)];
    cable(kit, "paintedMetal", aa, bb, 0.007, { color: col, sag: 0.08 + rand() * 0.14, pieces: 4 });
  }
  kit.collider([x0, y0, Math.min(zBack, zFace)], [x1, y0 + RACK_H, Math.max(zBack, zFace)], "patch-frame");
  return { zFace, patch: [], x0, x1, f };
}

// Patch cables between two racks' patch points (drooping in front of the faces)
export function patchBetween(kit, a, b, rand) {
  if (!a.patch.length || !b.patch.length) return;
  const n = Math.min(2, a.patch.length, b.patch.length);
  for (let i = 0; i < n; i++) {
    const pa = a.patch[(i * 3) % a.patch.length];
    const pb = b.patch[(i * 5 + 1) % b.patch.length];
    const col = pick(rand, [IMP.black, IMP.black, IMP.blue, IMP.amber]);
    const off = 0.06 * a.f;
    cable(kit, "paintedMetal", [pa[0], pa[1], pa[2] + off], [pb[0], pb[1], pb[2] + off], 0.008, { color: col, sag: 0.18 + rand() * 0.2, pieces: 4 });
  }
}

/**
 * Cable tray: U-channel running from a to b ([x,z]) at height y with cross ribs, three cables and hanger rods
 * up to ceilY. w = width. Axis-aligned only.
 */
export function cableTray(kit, a, b, y, ceilY, { w = 0.4, hangEvery = 2.2, ribEvery = 0.5, cables = 3, seed = 1 } = {}) {
  const rand = rng(seed);
  const alongX = Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1]);
  const lo = alongX ? Math.min(a[0], b[0]) : Math.min(a[1], b[1]);
  const hi = alongX ? Math.max(a[0], b[0]) : Math.max(a[1], b[1]);
  const c = alongX ? a[1] : a[0];
  const len = hi - lo;
  const mm = (l0, l1, y0, y1, c0, c1) => (alongX ? [[l0, y0, c0], [l1, y1, c1]] : [[c0, y0, l0], [c1, y1, l1]]);
  const bx = (mat, l0, l1, y0, y1, c0, c1, opts) => {
    const [mn, mx] = mm(l0, l1, y0, y1, c0, c1);
    kit.boxMM(mat, mn, mx, opts);
  };
  bx("metal", lo, hi, y, y + 0.02, c - w / 2, c + w / 2, { color: IMP.mid, texel: 2 });
  bx("metal", lo, hi, y, y + 0.09, c - w / 2, c - w / 2 + 0.02, { color: IMP.dark, texel: 2 });
  bx("metal", lo, hi, y, y + 0.09, c + w / 2 - 0.02, c + w / 2, { color: IMP.dark, texel: 2 });
  for (let l = lo + 0.25; l < hi; l += ribEvery) bx("metal", l - 0.015, l + 0.015, y + 0.02, y + 0.035, c - w / 2 + 0.02, c + w / 2 - 0.02, { color: IMP.mid });
  const cols = [IMP.black, IMP.blue, IMP.dark, IMP.mid];
  for (let k = 0; k < cables; k++) {
    const off = -w / 2 + 0.07 + (k * (w - 0.14)) / Math.max(1, cables - 1) + (rand() - 0.5) * 0.02;
    const r = 0.012 + rand() * 0.012;
    if (alongX) kit.cyl("paintedMetal", (lo + hi) / 2, y + 0.02 + r, c + off, r, len - 0.1, "x", { color: cols[k % cols.length], segments: 6 });
    else kit.cyl("paintedMetal", c + off, y + 0.02 + r, (lo + hi) / 2, r, len - 0.1, "z", { color: cols[k % cols.length], segments: 6 });
  }
  if (ceilY > y + 0.15) {
    for (let l = lo + 0.6; l < hi - 0.3; l += hangEvery) {
      for (const s of [-1, 1]) {
        const cc = c + s * (w / 2 - 0.03);
        if (alongX) kit.cyl("metal", l, (y + 0.09 + ceilY) / 2, cc, 0.012, ceilY - y - 0.09, "y", { color: IMP.mid, segments: 6 });
        else kit.cyl("metal", cc, (y + 0.09 + ceilY) / 2, l, 0.012, ceilY - y - 0.09, "y", { color: IMP.mid, segments: 6 });
      }
      bx("metal", l - 0.04, l + 0.04, y + 0.09, y + 0.12, c - w / 2 - 0.02, c + w / 2 + 0.02, { color: IMP.dark });
    }
  }
}

// Rectangular duct along x or z with flanges, optional grilles on one face (dir = normal axis sign toward the room)
export function duct(kit, a, b, y0, y1, c0, c1, { alongX = true, flangeEvery = 1.6, grilles = [], grilleFace = null } = {}) {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const mm = (l0, l1, yy0, yy1, cc0, cc1) => (alongX ? [[l0, yy0, cc0], [l1, yy1, cc1]] : [[cc0, yy0, l0], [cc1, yy1, l1]]);
  const bx = (mat, l0, l1, yy0, yy1, cc0, cc1, opts) => {
    const [mn, mx] = mm(l0, l1, yy0, yy1, cc0, cc1);
    kit.boxMM(mat, mn, mx, opts);
  };
  bx("metalRough", lo, hi, y0, y1, c0, c1, { color: IMP.mid, texel: 1 });
  for (let l = lo + 0.4; l < hi - 0.2; l += flangeEvery) bx("metal", l - 0.025, l + 0.025, y0 - 0.03, y1 + 0.03, c0 - 0.03, c1 + 0.03, { color: IMP.dark, texel: 2 });
  // grilles: slatted plates on the face at c = grilleFace (c0 or c1), centred at the given along-coordinates
  for (const gl of grilles) {
    const outward = grilleFace === c0 ? -1 : 1;
    const face = grilleFace === c0 ? c0 : c1;
    const gw = 0.7;
    const gh = (y1 - y0) * 0.6;
    const gy = (y0 + y1) / 2;
    const f0 = Math.min(face, face + outward * 0.03);
    const f1 = Math.max(face, face + outward * 0.03);
    bx("paintedMetal", gl - gw / 2, gl + gw / 2, gy - gh / 2, gy + gh / 2, f0, f1, { color: IMP.dark, texel: 1 });
    const s0 = Math.min(face + outward * 0.03, face + outward * 0.04);
    const s1 = Math.max(face + outward * 0.03, face + outward * 0.04);
    const n = Math.floor(gh / 0.05);
    for (let k = 0; k < n; k++) bx("metal", gl - gw / 2 + 0.05, gl + gw / 2 - 0.05, gy - gh / 2 + 0.03 + k * 0.05, gy - gh / 2 + 0.04 + k * 0.05, s0, s1, { color: IMP.black });
  }
}

// Pipe run with brackets along x or z
export function pipe(kit, a, b, y, c, r, { alongX = true, color = IMP.steel, bracketEvery = 2.0, wallC = null } = {}) {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  if (alongX) kit.cyl("metal", (lo + hi) / 2, y, c, r, hi - lo, "x", { color, segments: 10 });
  else kit.cyl("metal", c, y, (lo + hi) / 2, r, hi - lo, "z", { color, segments: 10 });
  for (let l = lo + 0.5; l < hi - 0.2; l += bracketEvery) {
    if (alongX) kit.box("paintedMetal", l, y, c, 0.08, r * 2 + 0.06, r * 2 + 0.06, { color: IMP.dark, texel: 2 });
    else kit.box("paintedMetal", c, y, l, r * 2 + 0.06, r * 2 + 0.06, 0.08, { color: IMP.dark, texel: 2 });
    if (wallC !== null) {
      // stand-off to the wall
      const cw = Math.min(c, wallC);
      const cw1 = Math.max(c, wallC);
      if (alongX) kit.boxMM("paintedMetal", [l - 0.02, y - 0.02, cw], [l + 0.02, y + 0.02, cw1], { color: IMP.dark });
      else kit.boxMM("paintedMetal", [cw, y - 0.02, l - 0.02], [cw1, y + 0.02, l + 0.02], { color: IMP.dark });
    }
  }
}

/**
 * Ceiling structure under the shell ceiling: beams across x, cross beams along z, downlight housings with visible
 * emissive squares at the given light positions.
 */
export function ceilingStructure(kit, x0, x1, z0, z1, ceilY, { beamsZ = [], beamsX = [], downlights = [] } = {}) {
  for (const z of beamsZ) {
    kit.boxMM("paintedMetal", [x0, ceilY - 0.3, z - 0.12], [x1, ceilY, z + 0.12], { color: IMP.dark, texel: 1 });
    kit.boxMM("metal", [x0, ceilY - 0.33, z - 0.18], [x1, ceilY - 0.3, z + 0.18], { color: IMP.mid, texel: 2 });
    // bolt heads along the flange every 2 m
    for (let x = x0 + 1; x < x1 - 0.5; x += 2) {
      kit.box("metal", x, ceilY - 0.34, z - 0.14, 0.05, 0.02, 0.05, { color: IMP.steel });
      kit.box("metal", x, ceilY - 0.34, z + 0.14, 0.05, 0.02, 0.05, { color: IMP.steel });
    }
  }
  for (const x of beamsX) {
    kit.boxMM("paintedMetal", [x - 0.1, ceilY - 0.26, z0], [x + 0.1, ceilY, z1], { color: IMP.dark, texel: 1 });
    kit.boxMM("metal", [x - 0.15, ceilY - 0.28, z0], [x + 0.15, ceilY - 0.26, z1], { color: IMP.mid, texel: 2 });
  }
  for (const [x, , z] of downlights) {
    kit.box("metalRough", x, ceilY - 0.06, z, 0.62, 0.12, 0.62, { color: IMP.mid, texel: 2 });
    kit.box("paintedMetal", x, ceilY - 0.125, z, 0.5, 0.02, 0.5, { color: IMP.black, texel: 2 });
    kit.box("emitWhite", x, ceilY - 0.13, z, 0.34, 0.012, 0.34);
    // louvre fins
    for (const d of [-0.12, 0, 0.12]) kit.box("metalRough", x + d, ceilY - 0.14, z, 0.012, 0.03, 0.4, { color: IMP.dark });
  }
}
