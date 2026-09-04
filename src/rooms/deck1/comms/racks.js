// Comms equipment: rack cabinets (open-front with visible cabling / closed with a door display), patch frames,
// patch cables, overhead cable trays (U-channel and ladder), bundle drops, ducting, pipes and the ceiling beams.
// World-space kit-bashing.
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
// per-rack indicator palettes: blue-dominant (default), amber-heavy, blue with a rare red, and a fault rack
const PALETTES = [LED_MATS, LED_MATS, ["emitBlue", "emitBlue", "emitAmber", "emitAmber", "emitAmber", "emitRedImp"], ["emitBlue", "emitBlue", "emitBlue", "emitBlue", "emitBlue", "emitBlue", "emitBlue", "emitRedImp"], ["emitAmber", "emitBlue", "emitRedImp", "emitRedImp", "emitBlue", "emitRedImp"]];
const CABLE_COLS = [IMP.black, IMP.black, IMP.blue, IMP.mid, IMP.amber];

/**
 * One rack cabinet. x0 = west edge, zBack = wall-side z, f = +1 (face toward +z) | -1 (face toward -z).
 * type "open": no door, module stack with a vertical cable channel and loose patch loops.
 * type "closed": full-height door with a 0.3 m display, handle, vents; doorOpen swings it 75° into the aisle
 * (hinge on the west edge) so the module stack behind is visible.
 * pulledTray slides one drawer module (0.85–1.6 m) 0.32 m into the aisle on its rails, board and LEDs exposed.
 * Each rack draws its own indicator fill (55–88 %), palette and matrix pattern (grid / rows / columns / block)
 * from its seed, so no two cabinets carry the same LED field.
 * Returns the face z and the patch points used for cabling.
 */
export function rack(kit, x0, y0, zBack, f, seed, { type = "open", doorOpen = false, pulledTray = false } = {}) {
  const rand = rng(seed);
  const skip = 0.12 + rand() * 0.45;
  const mats = pick(rand, PALETTES);
  const pattern = pick(rand, ["grid", "grid", "rows", "cols", "block"]);
  let pulled = false;
  const x1 = x0 + RACK_W;
  const zFace = zBack + f * RACK_D;
  const zIn = (d) => zFace - f * d; // d metres behind the face plane
  const zmm = (d0, d1) => [Math.min(zIn(d0), zIn(d1)), Math.max(zIn(d0), zIn(d1))];
  const boxD = (mat, xa, xb, ya, yb, d0, d1, opts) => {
    const [za, zb] = zmm(d0, d1);
    kit.boxMM(mat, [xa, y0 + ya, za], [xb, y0 + yb, zb], opts);
  };
  const closed = type === "closed";
  const showModules = !closed || doorOpen;
  // body (sides, back, top): mid grey so the cabinets read as equipment under the aisle wash, not black slabs
  boxD("paintedMetal", x0, x1, 0, RACK_H, 0.06, RACK_D, { color: IMP.mid, texel: 1 });
  boxD("darkGloss", x0 + 0.05, x1 - 0.05, 0.1, RACK_H - 0.08, 0.05, 0.06);
  // front frame rails, kick and cap
  boxD("metal", x0, x0 + 0.06, 0.12, RACK_H - 0.1, 0.0, 0.06, { color: IMP.grey, texel: 2 });
  boxD("metal", x1 - 0.06, x1, 0.12, RACK_H - 0.1, 0.0, 0.06, { color: IMP.grey, texel: 2 });
  boxD("paintedMetal", x0, x1, 0, 0.12, 0.0, 0.06, { color: IMP.black, texel: 1 });
  boxD("paintedMetal", x0, x1, RACK_H - 0.1, RACK_H, 0.0, 0.06, { color: IMP.black, texel: 1 });
  // kick vent slats
  for (let k = 0; k < 3; k++) boxD("metal", x0 + 0.15, x1 - 0.15, 0.03 + k * 0.03, 0.04 + k * 0.03, -0.004, 0.0, { color: IMP.dark });
  // side panel seams + a latch on each side (the sides face the neighbours; the row ends show them)
  for (const xs of [x0, x1]) {
    boxD("metal", xs - 0.004, xs + 0.004, 0.3, RACK_H - 0.3, 0.44, 0.46, { color: IMP.dark });
    boxD("metal", xs - 0.01, xs + 0.01, 1.35, 1.45, 0.3, 0.36, { color: IMP.dark });
  }
  // top cap trim + cable entry box on the roof (wall side) with cables rising to the tray
  boxD("metal", x0 + 0.02, x1 - 0.02, RACK_H, RACK_H + 0.02, 0.02, RACK_D - 0.02, { color: IMP.grey, texel: 2 });
  boxD("metalRough", x0 + 0.35, x1 - 0.35, RACK_H + 0.02, RACK_H + 0.18, 0.5, 0.85, { color: IMP.mid, texel: 2 });

  const patch = [];
  if (showModules) {
    // modules from the kick up to the cap; open racks keep a 0.14 m cable channel on the right inside the frame
    const mx0 = x0 + 0.07;
    const mx1 = closed ? x1 - 0.07 : x1 - 0.21;
    const mw = mx1 - mx0;
    let y = 0.14;
    let idx = 0;
    const heights = [0.13, 0.22, 0.31, 0.4, 0.22, 0.13];
    while (y < RACK_H - 0.12 - 0.13) {
      let h = pick(rand, heights);
      if (y + h > RACK_H - 0.12) h = RACK_H - 0.12 - y;
      if (h < 0.1) break;
      const ya = y;
      const yb = y + h - 0.015;
      const cy = (ya + yb) / 2;
      let r = rand();
      if (pulledTray && !pulled && h >= 0.2 && ya > 0.85 && ya < 1.6) r = 0; // force a drawer where the tray goes
      if (r < 0.34) {
        // drawer: dark face, wide handle, one status LED. The rack's pulled tray is the first drawer between
        // 0.85 and 1.6 m: face, handle and LEDs slide `out` into the aisle on grey rails, with the black tray body
        // and a gloss board with a service LED row exposed on top
        const out = pulledTray && !pulled && h >= 0.2 && ya > 0.85 && ya < 1.6 ? 0.32 : 0;
        if (out) {
          pulled = true;
          boxD("paintedMetal", mx0 + 0.03, mx1 - 0.03, ya + 0.012, yb - 0.03, 0.03 - out, 0.06, { color: IMP.black, texel: 1 });
          for (const rx of [mx0, mx1 - 0.014]) boxD("metal", rx, rx + 0.014, ya + 0.015, ya + 0.045, 0.03 - out, 0.05, { color: IMP.grey });
          boxD("darkGloss", mx0 + 0.05, mx1 - 0.05, yb - 0.03, yb - 0.024, 0.05 - out, 0.02);
          for (let k = 0; k < 4; k++) led(kit, pick(rand, mats), mx0 + 0.1 + k * 0.06, y0 + yb - 0.024, zIn(0.1 - out), "y", 1, 0.014, 0.006);
          const [ta, tb] = zmm(-out, 0.0);
          kit.collider([mx0, y0 + ya, ta], [mx1, y0 + yb, tb], "rack-tray");
        }
        boxD("paintedMetal", mx0, mx1, ya, yb, 0.008 - out, 0.05 - out, { color: IMP.dark, texel: 1 });
        boxD("metal", mx0 + mw * 0.3, mx1 - mw * 0.3, cy - 0.012, cy + 0.012, -0.018 - out, 0.008 - out, { color: IMP.grey, texel: 2 });
        boxD("metal", mx0 + mw * 0.3, mx0 + mw * 0.3 + 0.02, cy - 0.012, cy + 0.012, -0.018 - out, 0.0 - out, { color: IMP.grey });
        boxD("metal", mx1 - mw * 0.3 - 0.02, mx1 - mw * 0.3, cy - 0.012, cy + 0.012, -0.018 - out, 0.0 - out, { color: IMP.grey });
        led(kit, pick(rand, mats), mx1 - 0.06, y0 + cy, zIn(0.008 - out), "z", f, 0.02);
        if (h > 0.2) led(kit, "emitBlue", mx0 + 0.06, y0 + cy, zIn(0.008 - out), "z", f, 0.02);
      } else if (r < 0.64) {
        // LED matrix module: indicator grid on a gloss face, thinned by the rack's fill and pattern
        boxD("paintedMetal", mx0, mx1, ya, yb, 0.008, 0.05, { color: IMP.dark, texel: 1 });
        boxD("darkGloss", mx0 + 0.02, mx1 - 0.02, ya + 0.02, yb - 0.02, 0.004, 0.008);
        const rowsN = Math.max(1, Math.floor((h - 0.05) / 0.05));
        const colsN = 6 + Math.floor(rand() * 6);
        const pitch = (mw - 0.16) / colsN;
        for (let rr = 0; rr < rowsN; rr++)
          for (let cc = 0; cc < colsN; cc++) {
            const inPattern = pattern === "rows" ? rr % 2 === 0 : pattern === "cols" ? cc % 2 === 0 : pattern === "block" ? cc < colsN * 0.55 || rand() < 0.25 : true;
            if (!inPattern || rand() < skip) continue;
            const lx = mx0 + 0.08 + pitch * (cc + 0.5);
            const ly = ya + 0.035 + rr * 0.05;
            led(kit, pick(rand, mats), lx, y0 + ly, zIn(0.004), "z", f, 0.02, 0.006);
          }
        if (rand() < 0.5) patch.push([mx1 - 0.1, y0 + cy, zIn(0.0)]);
      } else if (r < 0.8) {
        // readout module: small screen + three LEDs + two toggles
        boxD("paintedMetal", mx0, mx1, ya, yb, 0.008, 0.05, { color: IMP.mid, texel: 1 });
        const sh = Math.min(0.12, h - 0.05);
        const sw = sh * 2;
        const sx = mx0 + 0.08;
        const [za, zb] = zmm(0.0, 0.008);
        kit.boxMM("commsUI", [sx, y0 + cy - sh / 2, za], [sx + sw, y0 + cy + sh / 2, zb], { uv: "keep", uvRect: uvRect(UI["readout" + (idx % 8)]) });
        for (let k = 0; k < 3; k++) led(kit, pick(rand, mats), sx + sw + 0.06 + k * 0.05, y0 + cy, zIn(0.008), "z", f, 0.02);
        for (let k = 0; k < 2; k++) boxD("metal", mx1 - 0.12 - k * 0.07, mx1 - 0.09 - k * 0.07, cy - 0.02, cy + 0.02, -0.02, 0.008, { color: IMP.grey });
        patch.push([mx1 - 0.05, y0 + cy, zIn(0.0)]);
      } else {
        // blanking / vent module
        boxD("paintedMetal", mx0, mx1, ya, yb, 0.008, 0.05, { color: IMP.mid, texel: 1 });
        const n = Math.max(2, Math.floor((h - 0.04) / 0.03));
        for (let k = 0; k < n; k++) boxD("metal", mx0 + 0.1, mx1 - 0.1, ya + 0.02 + k * 0.03, ya + 0.028 + k * 0.03, -0.004, 0.008, { color: IMP.black });
      }
      y += h;
      idx++;
    }
    if (!closed) {
      // vertical cable channel: dark trough, a six-cable trunk, tie clamps, loops out to two module patch points
      boxD("darkGloss", mx1 + 0.01, x1 - 0.07, 0.14, RACK_H - 0.12, 0.02, 0.06);
      const tx = mx1 + 0.08;
      for (let k = 0; k < 6; k++) {
        const cx = tx - 0.03 + (k % 3) * 0.03;
        const cd = k < 3 ? 0.03 : 0.006;
        cable(kit, "paintedMetal", [cx, y0 + RACK_H - 0.1, zIn(cd)], [cx, y0 + 0.16, zIn(cd)], 0.011, { color: pick(rand, CABLE_COLS) });
      }
      for (let yy = 0.5; yy < RACK_H - 0.3; yy += 0.55) boxD("metal", tx - 0.06, tx + 0.06, yy, yy + 0.03, -0.01, 0.04, { color: IMP.grey });
      for (let i = 0; i < Math.min(3, patch.length); i++) {
        const p = patch[(i * 2) % patch.length];
        cable(kit, "paintedMetal", [tx, p[1] + 0.25 + i * 0.1, zIn(-0.01)], [p[0] + 0.02, p[1], p[2]], 0.008, { color: pick(rand, CABLE_COLS), sag: 0.06, pieces: 3 });
      }
    }
  }

  if (closed) {
    // door: frame plate proud of the rails, gloss inset, 0.3 m display with bezel + LEDs, handle, lock, vents
    const th = doorOpen ? -f * 1.31 : 0; // 75° into the aisle
    const xh = x0 + 0.02; // hinge (west edge)
    const zh = zIn(-0.015);
    const s = Math.sin(th);
    const c = Math.cos(th);
    const dbox = (mat, u0, u1, v0, v1, w0, w1, opts = {}) => {
      // door-local: u along the width from the hinge, v up, w toward the room (+f z when closed)
      const uc = (u0 + u1) / 2;
      const wc = ((w0 + w1) / 2) * f;
      const g = new THREE.BoxGeometry(u1 - u0, v1 - v0, w1 - w0);
      const rot = f < 0 ? Math.PI + th : th; // closed door front faces +z (f>0) or -z (f<0)
      kit.add(mat, g, { pos: [xh + uc * c + wc * s, y0 + (v0 + v1) / 2, zh - uc * s + wc * c], rot: [0, rot, 0], ...opts });
    };
    const dw = RACK_W - 0.04;
    dbox("paintedMetal", 0, dw, 0.13, RACK_H - 0.11, -0.015, 0.015, { color: IMP.dark, texel: 1 });
    dbox("darkGloss", 0.06, dw - 0.06, 0.45, RACK_H - 0.5, 0.015, 0.019);
    // display: 0.6 × 0.3 console page in a black bezel at chest height, four LEDs under it
    const du = dw / 2;
    dbox("paintedMetal", du - 0.34, du + 0.34, 1.42, 1.78, 0.015, 0.03, { color: IMP.black, texel: 2 });
    const cell = pick(rand, ["console0", "console1", "console2", "console3"]);
    dbox("commsUI", du - 0.3, du + 0.3, 1.45, 1.75, 0.03, 0.034, { uv: "keep", uvRect: uvRect(UI[cell]) });
    for (let k = 0; k < 4; k++) dbox(pick(rand, mats), du - 0.15 + k * 0.1, du - 0.13 + k * 0.1, 1.36, 1.38, 0.015, 0.023);
    // handle bar with stand-offs + lock cylinder
    dbox("metal", dw - 0.16, dw - 0.13, 1.15, 1.55, 0.06, 0.09, { color: IMP.grey });
    dbox("metal", dw - 0.16, dw - 0.13, 1.17, 1.2, 0.015, 0.06, { color: IMP.grey });
    dbox("metal", dw - 0.16, dw - 0.13, 1.5, 1.53, 0.015, 0.06, { color: IMP.grey });
    dbox("metal", dw - 0.3, dw - 0.24, 1.32, 1.38, 0.015, 0.025, { color: IMP.black });
    // vents top and bottom, label plate + stencil
    for (const vy of [0.22, RACK_H - 0.5]) for (let k = 0; k < 5; k++) dbox("metal", 0.2, dw - 0.2, vy + k * 0.035, vy + 0.01 + k * 0.035, 0.015, 0.019, { color: IMP.black });
    dbox("impPanel", 0.12, 0.3, 2.0, 2.07, 0.015, 0.02, { color: IMP.white, texel: 2 });
    {
      const cr = decalRect(pick(rand, [5, 13, 1, 14]));
      const g = new THREE.PlaneGeometry(0.16, 0.16);
      const uc = dw - 0.32;
      const wc = 0.021 * f;
      const rot = f < 0 ? Math.PI + th : th;
      kit.add("decal", g, { pos: [xh + uc * c + wc * s, y0 + 2.1, zh - uc * s + wc * c], rot: [0, rot, 0], uv: "keep", uvRect: cr });
    }
    if (doorOpen) {
      // inside of the open door: document pocket and the latch plate
      dbox("paintedMetal", 0.15, 0.55, 0.9, 1.25, -0.03, -0.015, { color: IMP.black, texel: 2 });
      dbox("metal", dw - 0.2, dw - 0.05, 1.28, 1.42, -0.025, -0.015, { color: IMP.grey });
      const zo = f > 0 ? [zFace, zFace + 1.18] : [zFace - 1.18, zFace];
      kit.collider([xh - 0.05, y0, zo[0]], [xh + 0.36, y0 + RACK_H, zo[1]], "rack-door");
    } else {
      // hinge knuckles on the closed door edge
      for (const hy of [0.4, 1.3, 2.2]) boxD("metal", x0 + 0.005, x0 + 0.035, hy, hy + 0.12, -0.04, -0.005, { color: IMP.grey });
    }
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
    if (!closed) {
      const g2 = new THREE.PlaneGeometry(0.14, 0.14);
      if (f < 0) g2.rotateY(Math.PI);
      kit.add("decal", g2, { pos: [x1 - 0.2, y0 + RACK_H - 0.25, zIn(-0.006)], uv: "keep", uvRect: decalRect(pick(rand, [5, 5, 13, 1])) });
    }
  }
  // roof cables up to the tray
  const trayY = y0 + 3.28;
  for (let k = 0; k < 2; k++) {
    const cx = x0 + 0.45 + k * 0.3;
    cable(kit, "paintedMetal", [cx, y0 + RACK_H + 0.18, zIn(0.67)], [cx + (rand() - 0.5) * 0.2, trayY, zIn(0.55 + rand() * 0.1)], 0.014, { color: k ? IMP.blue : IMP.black });
  }
  kit.collider([x0, y0, Math.min(zBack, zFace)], [x1, y0 + RACK_H, Math.max(zBack, zFace)], "rack");
  return { zFace, patch: doorOpen || !closed ? patch : [], x0, x1, f, zBack };
}

// Thick cable bundle dropping from the row tray into a rack's roof entry box, with a clamp band mid-way.
export function bundleDrop(kit, r, y0, trayY, trayZ, rand) {
  const xc = (r.x0 + r.x1) / 2 - 0.15;
  const zTop = r.zBack + r.f * 0.33;
  const yTop = y0 + RACK_H + 0.18;
  for (let k = 0; k < 5; k++) {
    const ox = (k % 3) * 0.03 - 0.03;
    const oz = k < 3 ? 0 : 0.03;
    cable(kit, "paintedMetal", [xc + ox, trayY + 0.01, trayZ + oz * r.f], [xc + ox * 1.4, yTop, zTop + oz * r.f], 0.013, { color: pick(rand, CABLE_COLS) });
  }
  const ym = (trayY + yTop) / 2;
  const zm = (trayZ + zTop) / 2;
  kit.box("metal", xc, ym, zm, 0.13, 0.04, 0.09, { color: IMP.grey });
  kit.box("metal", xc, ym - 0.18, zm, 0.13, 0.03, 0.09, { color: IMP.dark });
}

// Amber service lamp clipped to a rack rail at (x, y, zFace): housing, hood, emitter facing the aisle, flex to the kick.
export function workLamp(kit, x, y, zFace, f) {
  const zo = (d) => zFace + f * d;
  kit.boxMM("paintedMetal", [x - 0.09, y - 0.07, Math.min(zo(0.0), zo(0.09))], [x + 0.09, y + 0.07, Math.max(zo(0.0), zo(0.09))], { color: IMP.black, texel: 2 });
  kit.boxMM("metal", [x - 0.11, y + 0.06, Math.min(zo(0.0), zo(0.13))], [x + 0.11, y + 0.085, Math.max(zo(0.0), zo(0.13))], { color: IMP.mid });
  kit.boxMM("emitAmber", [x - 0.06, y - 0.045, Math.min(zo(0.09), zo(0.097))], [x + 0.06, y + 0.045, Math.max(zo(0.09), zo(0.097))]);
  kit.boxMM("metal", [x - 0.02, y - 0.16, Math.min(zo(0.0), zo(0.05))], [x + 0.02, y - 0.07, Math.max(zo(0.0), zo(0.05))], { color: IMP.grey });
  cable(kit, "paintedMetal", [x, y - 0.07, zo(0.04)], [x + 0.25, y - 1.1, zo(0.02)], 0.008, { color: IMP.black, sag: 0.12, pieces: 4 });
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
  boxD("paintedMetal", x0 + 0.05, x1 - 0.05, 0, RACK_H, 0.8, RACK_D, { color: IMP.dark, texel: 1 });
  boxD("metal", x0, x0 + 0.08, 0, RACK_H, 0.1, 0.18, { color: IMP.grey, texel: 2 });
  boxD("metal", x1 - 0.08, x1, 0, RACK_H, 0.1, 0.18, { color: IMP.grey, texel: 2 });
  boxD("paintedMetal", x0, x1, 0, 0.12, 0.0, RACK_D, { color: IMP.black, texel: 1 });
  boxD("paintedMetal", x0, x1, RACK_H - 0.08, RACK_H, 0.0, RACK_D, { color: IMP.black, texel: 1 });
  // vertical cable trunk on the back plate
  boxD("metalRough", x0 + 0.15, x0 + 0.4, 0.12, RACK_H - 0.08, 0.6, 0.8, { color: IMP.mid, texel: 1 });
  // panels with port rows and LEDs
  const panels = [];
  for (let k = 0; k < 6; k++) {
    const ya = 0.3 + k * 0.36;
    boxD("paintedMetal", x0 + 0.08, x1 - 0.08, ya, ya + 0.1, 0.1, 0.2, { color: IMP.mid, texel: 1 });
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
  return { zFace, patch: [], x0, x1, f, zBack };
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

// Axis-aligned run helper shared by the trays: a, b = [x, z]; returns {alongX, lo, hi, c, bx}
function run(kit, a, b) {
  const alongX = Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1]);
  const lo = alongX ? Math.min(a[0], b[0]) : Math.min(a[1], b[1]);
  const hi = alongX ? Math.max(a[0], b[0]) : Math.max(a[1], b[1]);
  const c = alongX ? a[1] : a[0];
  const mm = (l0, l1, y0, y1, c0, c1) => (alongX ? [[l0, y0, c0], [l1, y1, c1]] : [[c0, y0, l0], [c1, y1, l1]]);
  const bx = (mat, l0, l1, y0, y1, c0, c1, opts) => {
    const [mn, mx] = mm(l0, l1, y0, y1, c0, c1);
    kit.boxMM(mat, mn, mx, opts);
  };
  const cyl = (mat, l0, l1, y, cc, r, opts) => {
    if (alongX) kit.cyl(mat, (l0 + l1) / 2, y, cc, r, l1 - l0, "x", opts);
    else kit.cyl(mat, cc, y, (l0 + l1) / 2, r, l1 - l0, "z", opts);
  };
  return { alongX, lo, hi, c, bx, cyl };
}

// Hanger rods (pairs) from a tray up to the ceiling with a cross bracket; first rod `hangStart` in from the run start
function hangers(kit, R, y, ceilY, w, hangEvery, hangStart = 0.6) {
  if (ceilY <= y + 0.15) return;
  for (let l = R.lo + hangStart; l < R.hi - 0.3; l += hangEvery) {
    for (const s of [-1, 1]) {
      const cc = R.c + s * (w / 2 - 0.03);
      if (R.alongX) kit.cyl("metal", l, (y + 0.09 + ceilY) / 2, cc, 0.012, ceilY - y - 0.09, "y", { color: IMP.mid, segments: 6 });
      else kit.cyl("metal", cc, (y + 0.09 + ceilY) / 2, l, 0.012, ceilY - y - 0.09, "y", { color: IMP.mid, segments: 6 });
    }
    R.bx("metal", l - 0.04, l + 0.04, y + 0.09, y + 0.12, R.c - w / 2 - 0.02, R.c + w / 2 + 0.02, { color: IMP.dark });
  }
}

/**
 * Cable tray: U-channel running from a to b ([x,z]) at height y with cross ribs, cables and hanger rods
 * up to ceilY. w = width. Axis-aligned only.
 */
export function cableTray(kit, a, b, y, ceilY, { w = 0.4, hangEvery = 2.2, hangStart = 0.6, ribEvery = 0.5, cables = 3, seed = 1 } = {}) {
  const rand = rng(seed);
  const R = run(kit, a, b);
  const { lo, hi, c, bx } = R;
  bx("metal", lo, hi, y, y + 0.02, c - w / 2, c + w / 2, { color: IMP.mid, texel: 2 });
  bx("metal", lo, hi, y, y + 0.09, c - w / 2, c - w / 2 + 0.02, { color: IMP.dark, texel: 2 });
  bx("metal", lo, hi, y, y + 0.09, c + w / 2 - 0.02, c + w / 2, { color: IMP.dark, texel: 2 });
  for (let l = lo + 0.25; l < hi; l += ribEvery) bx("metal", l - 0.015, l + 0.015, y + 0.02, y + 0.035, c - w / 2 + 0.02, c + w / 2 - 0.02, { color: IMP.mid });
  const cols = [IMP.black, IMP.blue, IMP.dark, IMP.mid];
  for (let k = 0; k < cables; k++) {
    const off = -w / 2 + 0.07 + (k * (w - 0.14)) / Math.max(1, cables - 1) + (rand() - 0.5) * 0.02;
    const r = 0.012 + rand() * 0.012;
    R.cyl("paintedMetal", lo + 0.05, hi - 0.05, y + 0.02 + r, c + off, r, { color: cols[k % cols.length], segments: 6 });
  }
  hangers(kit, R, y, ceilY, w, hangEvery, hangStart);
}

/**
 * Ladder tray: two side rails with rungs (no floor) so the cable bundle on it stays visible from below; runs
 * from a to b ([x,z]) at height y, hanger rods up to ceilY.
 */
export function ladderTray(kit, a, b, y, ceilY, { w = 0.45, rungEvery = 0.3, cables = 4, hangEvery = 2.4, hangStart = 0.6, seed = 1 } = {}) {
  const rand = rng(seed);
  const R = run(kit, a, b);
  const { lo, hi, c, bx } = R;
  bx("metal", lo, hi, y, y + 0.06, c - w / 2, c - w / 2 + 0.03, { color: IMP.grey, texel: 2 });
  bx("metal", lo, hi, y, y + 0.06, c + w / 2 - 0.03, c + w / 2, { color: IMP.grey, texel: 2 });
  for (let l = lo + 0.15; l < hi - 0.05; l += rungEvery) bx("metal", l - 0.012, l + 0.012, y + 0.01, y + 0.03, c - w / 2 + 0.03, c + w / 2 - 0.03, { color: IMP.mid });
  for (let k = 0; k < cables; k++) {
    const off = -w / 2 + 0.09 + (k * (w - 0.18)) / Math.max(1, cables - 1) + (rand() - 0.5) * 0.02;
    const r = 0.014 + rand() * 0.01;
    R.cyl("paintedMetal", lo + 0.03, hi - 0.03, y + 0.03 + r, c + off, r, { color: CABLE_COLS[k % CABLE_COLS.length], segments: 6 });
  }
  // tie straps over the bundle every third rung
  for (let l = lo + 0.45; l < hi - 0.2; l += rungEvery * 3) bx("metal", l - 0.015, l + 0.015, y + 0.03, y + 0.075, c - w / 2 + 0.06, c + w / 2 - 0.06, { color: IMP.black });
  hangers(kit, R, y, ceilY, w, hangEvery, hangStart);
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
 * Ceiling structure under the shell ceiling: beams across x with bolted flanges, cross beams along z.
 * (Light fixtures are separate: see linearLuminaire / recessedDownlight / spotHead in fixtures.js.)
 */
export function ceilingStructure(kit, x0, x1, z0, z1, ceilY, { beamsZ = [], beamsX = [] } = {}) {
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
}
