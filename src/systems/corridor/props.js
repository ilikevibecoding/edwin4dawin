// Imperial props shared by the Deck 4 aft-complex rooms (any deck owner may import them):
// consoles, operator seats, lockers, benches, wall placards, status boards, corridor dressing (wall
// terminals, vents, junction drops, section markers), fire points and the lit sign plates used for
// interactables. Everything is kit-bashed (one draw call per material key).
//
//   import { Placer, impConsole, impSeat, impLocker, impBench, deckPlacard, statusBoard, wallTerminal,
//            ventPanel, junctionDrop, sectionMarker, firePoint, floorDigit, makeSignPlate, matteScreens } from "../../systems/corridor/props.js";
//
// Text on placards / boards / labels is real stencil text from text.js when the module registered the
// text materials (`materials: textMaterials` in the manifest); otherwise those elements fall back to
// plain plates. Yaw convention: yaw 0 = the prop's local +z points at world +z (toward the operator /
// the room); positive yaw turns local +z toward +x (three.js rotation about +Y).
import * as THREE from "three";
import { rng } from "../../kit.js";
import { MAT, col } from "./imperial.js";
import { stencilText, textAtlas, textMaterials, TEXT_LIT_MAT, ADVANCE, GLYPH_ASPECT } from "./text.js";

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const X_AXIS = new THREE.Vector3(1, 0, 0);
const SCREENS = ["screenImp0", "screenImp1", "screenImp2", "screenImp3"];
export const MATTE_SCREENS = ["screenMatte0", "screenMatte1", "screenMatte2", "screenMatte3"];

/**
 * Matte clones of the harness's screenImp0-3 for a module's manifest `materials` hook:
 *
 *   materials: (base) => ({ ...textMaterials(), ...matteScreens(base) }),
 *
 * The stock screens are roughness 0.15, so a wall-mounted display mirrors every ceiling pool as a white
 * blob from wherever the viewer happens to stand. Put the whole room on screenMatte0-3 (same textures,
 * roughness 0.42: a soft sheen, no hotspots) — replacing rather than adding keeps the material count.
 */
export function matteScreens(base, roughness = 0.42) {
  const out = {};
  SCREENS.forEach((name, i) => {
    const src = base && base[name];
    if (!src) return;
    const m = src.clone();
    m.roughness = roughness;
    out[MATTE_SCREENS[i]] = m;
  });
  return out;
}

/** Places boxes/cylinders in a yawed local frame (origin at the prop's floor centre). */
export class Placer {
  constructor(kit, origin, yaw = 0) {
    this.kit = kit;
    this.o = origin;
    this.yaw = yaw;
    this.c = Math.cos(yaw);
    this.s = Math.sin(yaw);
    this.q = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, yaw);
  }
  p(lx, ly, lz) {
    return [this.o[0] + this.c * lx + this.s * lz, this.o[1] + ly, this.o[2] - this.s * lx + this.c * lz];
  }
  /** world direction of local +z (the prop's facing) */
  get normal() {
    return [this.s, 0, this.c];
  }
  quat(local = null) {
    return local ? this.q.clone().multiply(local) : this.q;
  }
  box(mat, lx, ly, lz, sx, sy, sz, opts = {}) {
    const { tilt = 0, ...rest } = opts;
    const q = tilt ? this.quat(new THREE.Quaternion().setFromAxisAngle(X_AXIS, tilt)) : this.q;
    return this.kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: this.p(lx, ly, lz), quat: q, ...rest });
  }
  // cylinder along a local axis
  cyl(mat, lx, ly, lz, r, len, axis = "y", opts = {}) {
    const g = new THREE.CylinderGeometry(r, r, len, opts.segments || 12, 1, false);
    if (axis === "x") g.rotateZ(Math.PI / 2);
    else if (axis === "z") g.rotateX(Math.PI / 2);
    const { segments, ...rest } = opts;
    return this.kit.add(mat, g, { pos: this.p(lx, ly, lz), quat: this.q, uv: "scale", uvScale: [2 * Math.PI * r, len], ...rest });
  }
  // point on a tilted sub-frame: centre (lx,ly,lz), tilt about local X, offset (u across, v up-the-slope, n normal)
  onTilted(lx, ly, lz, tilt, u, v, n) {
    const off = new THREE.Vector3(u, n, -v).applyQuaternion(new THREE.Quaternion().setFromAxisAngle(X_AXIS, tilt));
    return [lx + off.x, ly + off.y, lz + off.z];
  }
  /** stencil text on the local +z face at local (lx, ly, lz); see text.js for the options */
  text(str, lx, ly, lz, o = {}) {
    return stencilText(this.kit, { text: str, pos: this.p(lx, ly, lz), normal: this.normal, up: [0, 1, 0], ...o });
  }
  /** world AABB of a local box (for colliders) */
  aabb(lx0, lx1, ly0, ly1, lz0, lz1) {
    const pts = [this.p(lx0, 0, lz0), this.p(lx1, 0, lz0), this.p(lx0, 0, lz1), this.p(lx1, 0, lz1)];
    const min = [Math.min(...pts.map((p) => p[0])), this.o[1] + ly0, Math.min(...pts.map((p) => p[2]))];
    const max = [Math.max(...pts.map((p) => p[0])), this.o[1] + ly1, Math.max(...pts.map((p) => p[2]))];
    return [min, max];
  }
  collider(lx0, lx1, ly0, ly1, lz0, lz1, tag) {
    const [min, max] = this.aabb(lx0, lx1, ly0, ly1, lz0, lz1);
    this.kit.collider(min, max, tag);
  }
}

const IND = [MAT.red, MAT.blue, MAT.amber, MAT.blue, MAT.red];
const hasText = (kit) => !!(kit.materials && kit.materials[TEXT_LIT_MAT]);

/**
 * Recessed display with a bezel: four dark frame bars 9 mm proud of the mount face, the screen plane
 * 6 mm behind their front. `frame(u, v, n)` maps a 2-D position + normal offset on the mount face to local
 * coords (tilted or vertical); `tilt` is the mount's tilt so the boxes lie flat on it.
 */
function bezelScreen(P, frame, u, v, w, h, tex, tilt, gloss) {
  const b = 0.022;
  const n0 = 0.004;
  // on a tilted mount the box's local y is the mount normal (dims w, thickness, h); on a vertical face
  // the normal is local z (dims w, h, thickness)
  const tilted = Math.abs(tilt) > 1e-6;
  const put = (mat, du, dv, sw, sh, n, th, opts) => {
    const [x, y, z] = frame(u + du, v + dv, n);
    if (tilted) P.box(mat, x, y, z, sw, th, sh, { tilt, ...opts });
    else P.box(mat, x, y, z, sw, sh, th, opts);
  };
  const black = col("impBlack");
  put(MAT.dark, 0, h / 2 + b / 2, w + 2 * b, b, n0 + 0.0125, 0.025, { color: black });
  put(MAT.dark, 0, -h / 2 - b / 2, w + 2 * b, b, n0 + 0.0125, 0.025, { color: black });
  put(MAT.dark, -w / 2 - b / 2, 0, b, h, n0 + 0.0125, 0.025, { color: black });
  put(MAT.dark, w / 2 + b / 2, 0, b, h, n0 + 0.0125, 0.025, { color: black });
  put(gloss, 0, 0, w + 0.004, h + 0.004, n0 + 0.003, 0.006, { color: black });
  put(tex, 0, 0, w, h, n0 + 0.0075, 0.004, { uv: "keep" });
}

/**
 * Traffic/operations console: matte-black desk, sloped instrument panel and a vertical display bank
 * facing the operator (+z). `layout` 0..3 picks a different arrangement of bezelled displays, indicator
 * fields, keypads and sliders; `screens` cycles the screenImp textures (default all four).
 * @param {object} o { pos:[x,floorY,z], yaw, w=2.0, d=0.9, layout=0, screens=SCREENS, gloss="blackGloss", seed, collide=true, tag }
 */
export function impConsole(kit, o) {
  const { pos, yaw = 0, w = 2.0, d = 0.9, layout = 0, screens = SCREENS, gloss = "blackGloss", seed = 1, collide = true, tag = "console" } = o;
  const P = new Placer(kit, pos, yaw);
  const rand = rng(seed);
  const black = col("impBlack");
  const dark = col("impDark");
  const tex = (i) => screens[i % screens.length];
  // plinth + body + desk top on the operator side, blue toe line; the body is impDark so the console
  // reads as a form in a dim room — the panel faces, plinth and display bank stay black for contrast
  P.box(MAT.dark, 0, 0.06, 0, w - 0.2, 0.12, d - 0.2, { color: black, texel: 1 });
  P.box(MAT.dark, 0, 0.12 + 0.35, 0, w, 0.7, d, { color: dark, texel: 1 });
  P.box(gloss, 0, 0.84, d / 2 - 0.26, w, 0.04, 0.52, { color: black });
  P.box(MAT.blue, 0, 0.125, d / 2 - 0.002, w - 0.5, 0.012, 0.01);
  for (const sx of [-1, 1]) P.box(MAT.dark, sx * (w / 2 - 0.01), 0.55, 0, 0.04, 0.86, d + 0.04, { color: black, texel: 1 });
  // sloped instrument panel (+tilt about X lifts the -z edge toward the display bank)
  const tilt = 0.42;
  const pc = [0, 0.95, -0.05];
  P.box(MAT.dark, pc[0], pc[1], pc[2], w - 0.08, 0.05, 0.6, { color: black, tilt, texel: 1 });
  const onPanel = (u, v, n) => P.onTilted(pc[0], pc[1], pc[2], tilt, u, v, 0.025 + n);
  const dot = (u, v, mat, sw = 0.04, sh = 0.035) => {
    const [x, y, z] = onPanel(u, v, 0.004);
    P.box(mat, x, y, z, sw, 0.008, sh, { tilt, color: black });
  };
  const dotBlock = (u0, v0, cols, rows, on = 0.7) => {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) dot(u0 + c * 0.07, v0 - r * 0.075, rand() < on ? IND[Math.floor(rand() * IND.length)] : MAT.dark);
  };
  const keypad = (u0, v0, cols, rows) => {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const [x, y, z] = onPanel(u0 + c * 0.055, v0 - r * 0.055, 0.01);
        P.box(MAT.dark, x, y, z, 0.042, 0.02, 0.042, { tilt, color: rand() < 0.15 ? col("impMid") : dark });
      }
    }
  };
  const sliders = (u0, u1, v, n) => {
    for (let c = 0; c < n; c++) {
      const u = u0 + ((u1 - u0) * (c + 0.5)) / n;
      const [x, y, z] = onPanel(u, v, 0.004);
      P.box(rand() < 0.5 ? MAT.blue : MAT.dark, x, y, z, 0.05, 0.008, 0.16, { tilt, color: dark });
      const [x2, y2, z2] = onPanel(u, v + (rand() - 0.5) * 0.1, 0.02);
      P.box(MAT.steel, x2, y2, z2, 0.04, 0.02, 0.03, { tilt, color: col("impGrey") });
    }
  };
  const hw = w / 2;
  if (layout === 0) {
    bezelScreen(P, onPanel, 0, 0.12, Math.min(0.9, w * 0.45), 0.2, tex(0), tilt, gloss);
    for (const s of [-1, 1]) dotBlock(s * (hw - 0.3) - 0.14, 0.22, 5, 4);
    sliders(-Math.min(0.75, hw - 0.35), Math.min(0.75, hw - 0.35), -0.14, 12);
  } else if (layout === 1) {
    for (const s of [-1, 1]) bezelScreen(P, onPanel, s * 0.34, 0.11, 0.44, 0.2, tex(s < 0 ? 1 : 2), tilt, gloss);
    dotBlock(-0.14, 0.24, 5, 3);
    keypad(-hw + 0.3, -0.06, 5, 3);
    dotBlock(hw - 0.52, -0.05, 4, 3, 0.55);
    sliders(-0.5, 0.5, -0.17, 8);
  } else if (layout === 2) {
    for (let i = -1; i <= 1; i++) bezelScreen(P, onPanel, i * 0.36, 0.13, 0.3, 0.16, tex(i + 1), tilt, gloss);
    dotBlock(-hw + 0.2, 0.24, 3, 6, 0.6);
    dotBlock(hw - 0.34, 0.24, 3, 6, 0.6);
    keypad(-0.45, -0.07, 9, 2);
    sliders(0.15, Math.min(0.75, hw - 0.35), -0.14, 5);
  } else {
    bezelScreen(P, onPanel, -0.32, 0.1, 0.56, 0.24, tex(3), tilt, gloss);
    keypad(0.08, 0.2, 6, 4);
    dotBlock(hw - 0.42, 0.24, 4, 2, 0.8);
    sliders(-hw + 0.25, -0.05, -0.16, 6);
    dot(hw - 0.2, -0.14, MAT.red, 0.06, 0.06);
    dot(hw - 0.3, -0.14, MAT.amber, 0.06, 0.06);
  }
  // vertical display bank at the window side, screens facing the operator
  const bz = -d / 2 + 0.12;
  P.box(MAT.dark, 0, 1.12, bz, w - 0.12, 0.6, 0.1, { color: black, texel: 1 });
  P.box(MAT.dark, 0, 1.43, bz - 0.02, w - 0.04, 0.05, 0.16, { color: dark, texel: 1 });
  const bank = (u, v, n) => [u, v, bz + 0.05 + n];
  const span = w - 0.4;
  if (layout === 0) {
    for (let i = 0; i < 2; i++) bezelScreen(P, bank, (i - 0.5) * (span / 2 + 0.06), 1.12, span / 2 - 0.04, 0.38, tex(i + 1), 0, gloss);
  } else if (layout === 1) {
    bezelScreen(P, bank, 0, 1.15, span - 0.2, 0.36, tex(0), 0, gloss);
  } else if (layout === 2) {
    for (let i = -1; i <= 1; i++) bezelScreen(P, bank, i * (span / 3 + 0.02), 1.12, span / 3 - 0.08, 0.42, tex(i + 2), 0, gloss);
  } else {
    bezelScreen(P, bank, -span * 0.2, 1.12, span * 0.56, 0.4, tex(1), 0, gloss);
    bezelScreen(P, bank, span * 0.32, 1.12, span * 0.3, 0.4, tex(2), 0, gloss);
  }
  for (let c = 0; c < 10; c++) {
    const x = (c - 4.5) * ((w - 0.5) / 10);
    P.box(rand() < 0.6 ? IND[Math.floor(rand() * IND.length)] : MAT.dark, x, 0.86, bz + 0.056, 0.05, 0.02, 0.008, { color: black });
  }
  if (collide) P.collider(-w / 2 - 0.02, w / 2 + 0.02, 0, 1.5, -d / 2 - 0.02, d / 2 + 0.02, tag);
  return P;
}

/**
 * Operator chair facing -z (toward the console): disc base, pedestal with gas-lift collar, seat pan with
 * cushion, split backrest (lumbar cut) on a spine, armrests on supports.
 */
export function impSeat(kit, o) {
  const { pos, yaw = 0, gloss = "blackGloss", collide = true, tag = "seat" } = o;
  const P = new Placer(kit, pos, yaw);
  const black = col("impBlack");
  const dark = col("impDark");
  const mid = col("impMid");
  P.cyl(MAT.dark, 0, 0.02, 0, 0.3, 0.04, "y", { color: black, segments: 18 });
  P.cyl(MAT.steel, 0, 0.045, 0, 0.12, 0.01, "y", { color: col("impGrey"), segments: 14 });
  P.cyl(MAT.dark, 0, 0.24, 0, 0.042, 0.4, "y", { color: dark, segments: 10 });
  P.cyl(MAT.dark, 0, 0.42, 0, 0.065, 0.06, "y", { color: black, segments: 12 });
  // seat pan + cushion
  P.box(MAT.dark, 0, 0.47, 0, 0.5, 0.05, 0.5, { color: black });
  P.box(gloss, 0, 0.525, 0, 0.46, 0.06, 0.46, { color: dark });
  P.box(MAT.dark, 0, 0.5, -0.255, 0.4, 0.03, 0.02, { color: mid });
  // backrest: spine, lumbar pad and upper pad with a cut between them
  const lean = 0.14;
  P.box(MAT.dark, 0, 0.83, 0.27, 0.08, 0.7, 0.03, { color: black, tilt: lean });
  P.box(gloss, 0, 0.7, 0.245, 0.44, 0.2, 0.06, { color: dark, tilt: lean });
  P.box(gloss, 0, 1.0, 0.285, 0.44, 0.32, 0.06, { color: dark, tilt: lean });
  P.box(MAT.dark, 0, 1.0, 0.31, 0.48, 0.36, 0.015, { color: dark, tilt: lean });
  P.box(MAT.dark, 0, 0.7, 0.27, 0.48, 0.24, 0.015, { color: dark, tilt: lean });
  // armrests
  for (const s of [-1, 1]) {
    P.box(MAT.dark, s * 0.27, 0.62, 0.1, 0.04, 0.2, 0.05, { color: black });
    P.box(MAT.dark, s * 0.27, 0.735, 0.04, 0.06, 0.03, 0.36, { color: dark });
    P.box(gloss, s * 0.27, 0.755, 0.04, 0.05, 0.012, 0.3, { color: mid });
  }
  if (collide) P.collider(-0.3, 0.3, 0, 1.2, -0.3, 0.35, tag);
  return P;
}

/**
 * Equipment locker; door faces +z. Louvred vents with depth, recessed hinge seam, vertical pull handle,
 * lit label plate (status colour + stencil code when text materials are registered).
 */
export function impLocker(kit, o) {
  const { pos, yaw = 0, w = 0.6, h = 2.0, d = 0.5, status = MAT.blue, label = null, seed = 1, collide = true, tag = "locker" } = o;
  const P = new Placer(kit, pos, yaw);
  const rand = rng(seed);
  const black = col("impBlack");
  const dark = col("impDark");
  P.box(MAT.dark, 0, h / 2, 0, w, h, d, { color: dark, texel: 1 });
  P.box(MAT.dark, 0, 0.04, 0, w - 0.04, 0.08, d - 0.04, { color: black });
  const face = d / 2;
  P.box(MAT.panel, 0.01, h / 2 + 0.05, face + 0.01, w - 0.08, h - 0.18, 0.02, { color: col(rand() < 0.5 ? "impGrey" : "impWhite"), uv: "keep" });
  P.box(MAT.dark, -w / 2 + 0.03, h / 2 + 0.05, face + 0.012, 0.012, h - 0.18, 0.018, { color: black }); // hinge seam
  // louvre bank low: black slots with proud steel slats
  for (let k = 0; k < 4; k++) {
    const y = 0.32 + k * 0.06;
    P.box(MAT.dark, 0.01, y, face + 0.02, w - 0.24, 0.022, 0.006, { color: black });
    P.box(MAT.steel, 0.01, y + 0.012, face + 0.032, w - 0.24, 0.01, 0.024, { color: col("impGrey"), tilt: -0.5 });
  }
  // handle: two stubs + vertical bar
  const hx = w / 2 - 0.12;
  const hy = Math.min(h * 0.52, 1.05);
  for (const dy of [-0.09, 0.09]) P.box(MAT.dark, hx, hy + dy, face + 0.035, 0.03, 0.03, 0.03, { color: black });
  P.box(MAT.steel, hx, hy, face + 0.055, 0.026, 0.24, 0.026, { color: col("impGrey") });
  // label plate near the top: status lamp + code
  const ly = h - 0.24;
  P.box(MAT.dark, 0.01, ly, face + 0.024, w - 0.2, 0.09, 0.012, { color: black });
  P.box(status, -w / 2 + 0.14, ly, face + 0.032, 0.05, 0.05, 0.006);
  if (label && hasText(kit)) P.text(label, 0.06, ly, face + 0.032, { size: 0.045, color: "white", lit: true, maxWidth: w - 0.34 });
  else P.box(MAT.panel, 0.06, ly, face + 0.031, w - 0.36, 0.03, 0.004, { color: col("impGrey"), uv: "keep" });
  if (collide) P.collider(-w / 2, w / 2, 0, h, -d / 2, d / 2 + 0.06, tag);
  return P;
}

/** Wall bench: three slats on a steel frame carried by two inverted-T brackets; wall at -z. */
export function impBench(kit, o) {
  const { pos, yaw = 0, len = 1.8, gloss = "blackGloss", collide = true, tag = "bench" } = o;
  const P = new Placer(kit, pos, yaw);
  const black = col("impBlack");
  const dark = col("impDark");
  const steel = col("impGrey");
  // frame rails + slats
  for (const z of [-0.18, 0.18]) P.box(MAT.steel, 0, 0.42, z, len - 0.12, 0.03, 0.03, { color: steel });
  for (const z of [-0.15, 0, 0.15]) P.box(gloss, 0, 0.46, z, len, 0.035, 0.12, { color: dark });
  // brackets: post + foot + a top plate under the rails
  for (const s of [-1, 1]) {
    const x = s * (len / 2 - 0.2);
    P.box(MAT.dark, x, 0.2, 0, 0.06, 0.4, 0.32, { color: dark, texel: 1 });
    P.box(MAT.dark, x, 0.02, 0, 0.16, 0.04, 0.44, { color: black });
    P.box(MAT.dark, x, 0.415, 0, 0.14, 0.03, 0.4, { color: black });
  }
  // wall stay bar behind the seat
  P.box(MAT.dark, 0, 0.3, -0.22, len - 0.3, 0.04, 0.03, { color: black });
  P.box(MAT.strip, 0, 0.395, 0.19, len - 0.5, 0.01, 0.01);
  if (collide) P.collider(-len / 2, len / 2, 0, 0.6, -0.25, 0.25, tag);
  return P;
}

/**
 * Wall-mounted fire point: red cabinet with a stencilled FIRE label, pull handle and a chevron base plate
 * (`hazard`). `pos` is the cabinet centre at floor level on the wall's inner face; local +z points into
 * the room.
 */
export function firePoint(kit, o) {
  const { pos, yaw = 0, collide = true, hazard = true, tag = "firepoint" } = o;
  const P = new Placer(kit, pos, yaw);
  P.box(MAT.dark, 0, 1.1, 0.11, 0.5, 0.7, 0.22, { color: col("impDark"), texel: 1 });
  P.box(MAT.panel, 0, 1.1, 0.225, 0.42, 0.62, 0.01, { color: col("impRed"), uv: "keep" });
  if (hasText(kit)) {
    P.text("FIRE", 0, 1.3, 0.232, { size: 0.08, color: "white", lit: false });
    P.text("POINT", 0, 0.96, 0.232, { size: 0.05, color: "white", lit: false });
  } else {
    P.box(MAT.panel, 0, 1.3, 0.232, 0.3, 0.03, 0.004, { color: col("impWhite"), uv: "keep" });
    P.box(MAT.panel, 0, 0.98, 0.232, 0.2, 0.03, 0.004, { color: col("impWhite"), uv: "keep" });
  }
  P.box(MAT.steel, 0.15, 1.1, 0.24, 0.03, 0.12, 0.02, { color: col("impGrey") });
  if (hazard) P.box("hazard", 0, 0.03, 0.14, 0.6, 0.06, 0.28, { texel: 3 });
  else P.box(MAT.dark, 0, 0.03, 0.14, 0.6, 0.06, 0.28, { color: col("impBlack") });
  if (collide) P.collider(-0.3, 0.3, 0, 1.6, 0, 0.3, tag);
  return P;
}

// Axis-aligned wall-mounted plate helper: `pos` is the plate centre on the wall's inner face, `normal`
// points into the room. Returns a Placer whose local +z is the normal.
function wallPlacer(kit, pos, normal) {
  const yaw = Math.atan2(normal[0], normal[2]);
  return new Placer(kit, pos, yaw);
}

const ACC = (accent) => (accent === "impRed" ? MAT.red : accent === "impAmber" ? MAT.amber : accent === "impGreen" ? "emitGreen" : MAT.blue);
const ACC_TEXT = (accent) => (accent === "impRed" ? "red" : accent === "impAmber" ? "amber" : "blue");

/**
 * Wayfinding placard: black plate with an emissive accent bar, a stencilled title line, an optional
 * second line in the accent colour and an optional arrow glyph (→ ← ↑ ↓) on the right.
 * @param {object} o { pos, normal, w=0.9, h=0.32, title="SECTION", sub=null, arrow=null, accent="impBlue", lit=true }
 */
export function deckPlacard(kit, o) {
  const { pos, normal = [0, 0, 1], w = 0.9, h = 0.32, title = "SECTION", sub = null, arrow = null, accent = "impBlue", lit = true } = o;
  const P = wallPlacer(kit, pos, normal);
  P.box(MAT.dark, 0, 0, 0.012, w, h, 0.024, { color: col("impBlack"), texel: 2 });
  P.box(MAT.dark, 0, 0, 0.026, w - 0.03, h - 0.03, 0.004, { color: col("impDark"), texel: 2 });
  P.box(ACC(accent), -w / 2 + 0.06, 0, 0.03, 0.035, h - 0.1, 0.004);
  const textX0 = -w / 2 + 0.12;
  const arrowW = arrow ? h * 0.7 : 0;
  const textW = w - 0.18 - arrowW - (arrow ? 0.06 : 0);
  if (hasText(kit)) {
    const two = !!sub;
    const titleSize = Math.min(two ? h * 0.36 : h * 0.44, 0.13);
    P.text(title, textX0, two ? h * 0.17 : 0, 0.031, { size: titleSize, color: "white", lit, align: "left", maxWidth: textW });
    if (two) P.text(sub, textX0, -h * 0.2, 0.031, { size: Math.min(h * 0.26, 0.085), color: ACC_TEXT(accent), lit, align: "left", maxWidth: textW });
    if (arrow) P.text(arrow, w / 2 - 0.06 - arrowW / 2, 0, 0.031, { size: h * 0.62, color: "white", lit });
  } else {
    P.box(MAT.panel, textX0 + textW * 0.35, 0.05, 0.031, textW * 0.7, 0.04, 0.004, { color: col("impWhite"), uv: "keep" });
    P.box(MAT.panel, textX0 + textW * 0.25, -0.05, 0.031, textW * 0.5, 0.03, 0.004, { color: col("impGrey"), uv: "keep" });
  }
  return P;
}

/**
 * Small painted section marker (corridor identity): dark plate, accent bar, stencil code such as "4-E 03".
 */
export function sectionMarker(kit, o) {
  const { pos, normal = [0, 0, 1], text = "4-E 01", accent = "impBlue", w = 0.56, h = 0.2 } = o;
  const P = wallPlacer(kit, pos, normal);
  P.box(MAT.dark, 0, 0, 0.008, w, h, 0.016, { color: col("impBlack"), texel: 2 });
  P.box(MAT.panel, -w / 2 + 0.05, 0, 0.018, 0.03, h - 0.06, 0.004, { color: col(accent), uv: "keep" });
  if (hasText(kit)) P.text(text, 0.03, 0, 0.018, { size: Math.min(h * 0.6, 0.11), color: ACC_TEXT(accent), lit: false, maxWidth: w - 0.18 });
  else P.box(MAT.panel, 0.03, 0, 0.018, w - 0.2, 0.04, 0.004, { color: col(accent), uv: "keep" });
  return P;
}

/**
 * Wall terminal at reading height: dark housing, bezelled display, keypad, accent line, status lamps.
 * `pos` = centre of the unit on the wall face (y included; 1.4 m is the corridor convention).
 */
export function wallTerminal(kit, o) {
  const { pos, normal = [0, 0, 1], screen = "screenImp1", accent = "impBlue", gloss = "blackGloss", seed = 1, w = 0.5, h = 0.62, collide = true, tag = "terminal" } = o;
  const P = wallPlacer(kit, pos, normal);
  const rand = rng(seed);
  const black = col("impBlack");
  P.box(MAT.dark, 0, 0, 0.045, w, h, 0.09, { color: col("impDark"), texel: 1 });
  P.box(MAT.dark, 0, 0, 0.092, w - 0.04, h - 0.04, 0.006, { color: black, texel: 1 });
  const face = (u, v, n) => [u, v, 0.095 + n];
  bezelScreen(P, face, 0, h * 0.18, w - 0.14, h * 0.36, screen, 0, gloss);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) P.box(MAT.dark, -w / 2 + 0.09 + c * 0.055, -h * 0.2 - r * 0.055, 0.105, 0.042, 0.042, 0.02, { color: rand() < 0.2 ? col("impMid") : col("impDark") });
  for (let r = 0; r < 3; r++) P.box(IND[(r + Math.floor(rand() * 3)) % IND.length], w / 2 - 0.08, -h * 0.2 - r * 0.055, 0.1, 0.04, 0.02, 0.008);
  P.box(ACC(accent), 0, -h / 2 + 0.04, 0.097, w - 0.16, 0.012, 0.004);
  if (collide) P.collider(-w / 2, w / 2, -h / 2, h / 2, 0, 0.11, tag);
  return P;
}

/**
 * Vent with depth: proud dark frame, black throat and six slanted steel louvres.
 * `pos` = centre on the wall face (y included).
 */
export function ventPanel(kit, o) {
  const { pos, normal = [0, 0, 1], w = 0.9, h = 0.46, depth = 0.11 } = o;
  const P = wallPlacer(kit, pos, normal);
  const black = col("impBlack");
  const dark = col("impDark");
  const f = 0.05;
  P.box(MAT.dark, 0, h / 2 - f / 2, depth / 2, w, f, depth, { color: dark, texel: 1 });
  P.box(MAT.dark, 0, -h / 2 + f / 2, depth / 2, w, f, depth, { color: dark, texel: 1 });
  P.box(MAT.dark, -w / 2 + f / 2, 0, depth / 2, f, h, depth, { color: dark, texel: 1 });
  P.box(MAT.dark, w / 2 - f / 2, 0, depth / 2, f, h, depth, { color: dark, texel: 1 });
  P.box(MAT.dark, 0, 0, 0.006, w - 2 * f, h - 2 * f, 0.012, { color: black, texel: 2 });
  const n = 6;
  const pitch = (h - 2 * f - 0.04) / n;
  for (let i = 0; i < n; i++) {
    const y = -h / 2 + f + 0.02 + pitch * (i + 0.5);
    P.box(MAT.steel, 0, y, depth - 0.035, w - 2 * f - 0.02, 0.012, 0.06, { color: col("impGrey"), tilt: 0.6 });
  }
  return P;
}

/**
 * Junction box with a conduit drop: box at 1.5 m with indicator lamps and a stencilled code, steel conduit
 * up to the ceiling with clamps, a second conduit down to a floor-level distribution block.
 * `pos` = wall-face point at floor level under the box; `ceilY` = ceiling face height.
 */
export function junctionDrop(kit, o) {
  const { pos, normal = [0, 0, 1], ceilY, accent = "impBlue", code = null, seed = 1 } = o;
  const P = wallPlacer(kit, pos, normal);
  const rand = rng(seed);
  const black = col("impBlack");
  const dark = col("impDark");
  const by = 1.5;
  const top = ceilY - pos[1] - 0.03;
  P.box(MAT.dark, 0, by, 0.07, 0.4, 0.3, 0.14, { color: dark, texel: 2 });
  P.box(MAT.panel, 0, by, 0.142, 0.34, 0.24, 0.006, { color: col("impMid"), uv: "keep" });
  P.box(ACC(accent), 0.11, by + 0.07, 0.148, 0.03, 0.02, 0.006);
  P.box(MAT.red, 0.06, by + 0.07, 0.148, 0.02, 0.02, 0.006);
  for (let k = 0; k < 3; k++) P.box(MAT.dark, -0.12 + k * 0.05, by - 0.07, 0.148, 0.03, 0.03, 0.006, { color: black });
  if (code && hasText(kit)) P.text(code, -0.02, by + 0.07, 0.146, { size: 0.045, color: "dark", align: "left", maxWidth: 0.2 });
  // conduits: up to the ceiling and down to the floor block
  P.cyl(MAT.steel, 0.1, (by + 0.15 + top) / 2, 0.06, 0.02, top - (by + 0.15), "y", { color: col("impGrey"), segments: 8 });
  P.cyl(MAT.steel, -0.1, (by - 0.15 + 0.32) / 2, 0.06, 0.016, by - 0.15 - 0.32, "y", { color: col("impGrey"), segments: 8 });
  for (const cy of [by + 0.5, Math.min(top - 0.2, by + 1.2)]) P.box(MAT.dark, 0.1, cy, 0.05, 0.08, 0.04, 0.1, { color: dark });
  P.box(MAT.dark, -0.1, 0.8, 0.05, 0.07, 0.04, 0.1, { color: dark });
  P.box(MAT.dark, -0.06, 0.2, 0.06, 0.3, 0.24, 0.12, { color: black, texel: 2 });
  P.box(rand() < 0.5 ? MAT.amber : ACC(accent), -0.14, 0.28, 0.122, 0.02, 0.02, 0.004);
  return P;
}

/**
 * Large wall status board: frame, title line, 2×2 bezelled display panels, legend column of coloured
 * lamps with stencilled labels. pos = board centre on the wall face, normal into the room.
 */
export function statusBoard(kit, o) {
  const {
    pos,
    normal = [0, 0, 1],
    w = 3.0,
    h = 1.6,
    screens = SCREENS,
    title = "HANGAR 4 - TRAFFIC STATUS",
    legendRows = ["LAUNCH CYCLE", "RECOVERY", "TRACTOR", "BAYS 1-6", "GANTRY", "FUEL / ORD"],
    gloss = "blackGloss",
    seed = 5,
  } = o;
  const P = wallPlacer(kit, pos, normal);
  const rand = rng(seed);
  P.box(MAT.dark, 0, 0, 0.04, w, h, 0.08, { color: col("impBlack"), texel: 1 });
  P.box(MAT.dark, 0, 0, 0.085, w - 0.08, h - 0.08, 0.01, { color: col("impDark"), texel: 1 });
  P.box(MAT.strip, 0, h / 2 - 0.06, 0.092, w - 0.3, 0.014, 0.006);
  if (hasText(kit)) P.text(title, -w / 2 + 0.16, h / 2 - 0.15, 0.094, { size: 0.075, color: "white", lit: true, align: "left", maxWidth: w - 0.4 });
  const legendW = 0.95;
  const gridW = w - legendW - 0.3;
  const sw = (gridW - 0.1) / 2;
  const sh = (h - 0.46) / 2;
  const face = (u, v, n) => [u, v, 0.09 + n];
  for (let i = 0; i < 4; i++) {
    const cx = -w / 2 + 0.14 + sw / 2 + (i % 2) * (sw + 0.1);
    const cy = -0.1 + (i < 2 ? sh / 2 + 0.03 : -sh / 2 - 0.03);
    bezelScreen(P, face, cx, cy, sw - 0.05, sh - 0.05, screens[i % screens.length], 0, gloss);
  }
  const lx = w / 2 - legendW - 0.08;
  const n = legendRows.length;
  for (let i = 0; i < n; i++) {
    const y = h / 2 - 0.34 - i * ((h - 0.5) / n);
    P.box(IND[(i + Math.floor(rand() * 2)) % IND.length], lx + 0.06, y, 0.094, 0.05, 0.05, 0.006);
    if (hasText(kit)) P.text(legendRows[i], lx + 0.16, y, 0.094, { size: 0.05, color: "white", lit: true, align: "left", maxWidth: legendW - 0.24 });
    else P.box(MAT.panel, lx + 0.16 + (legendW - 0.3) / 2, y, 0.094, legendW - 0.3, 0.03, 0.006, { color: col("impGrey"), uv: "keep" });
  }
  return P;
}

// 7-segment digit map: a b c d e f g  (top, upper-right, lower-right, bottom, lower-left, upper-left, middle)
const SEG7 = {
  0: "abcdef",
  1: "bc",
  2: "abged",
  3: "abgcd",
  4: "fgbc",
  5: "afgcd",
  6: "afgedc",
  7: "abc",
  8: "abcdefg",
  9: "abcdfg",
};
/**
 * Big floor digit built from bars, 1 cm proud (no texture needed). Prefer text.js `stencilDigit` (outlined,
 * worn paint) when the module registers text materials.
 */
export function floorDigit(kit, o) {
  const { digit = "4", pos, size = 2.4, mat = MAT.panel, tint = "impWhite", bar = 0.28, y = pos[1], up = [0, 0, -1] } = o;
  const segs = SEG7[String(digit)] || "";
  const hgt = size;
  const wid = size * 0.55;
  const yaw = Math.atan2(up[0], up[2]) + Math.PI; // local +z (glyph "up") points along `up`
  const P = new Placer(kit, [pos[0], y, pos[2]], yaw);
  const H = (cx, cz, len) => P.box(mat, cx, 0.005, cz, len, 0.01, bar, { color: col(tint), uv: "keep" });
  const V = (cx, cz, len) => P.box(mat, cx, 0.005, cz, bar, 0.01, len, { color: col(tint), uv: "keep" });
  const hw = wid / 2;
  const hh = hgt / 2;
  const half = hh / 2;
  if (segs.includes("a")) H(0, -hh + bar / 2, wid);
  if (segs.includes("d")) H(0, hh - bar / 2, wid);
  if (segs.includes("g")) H(0, 0, wid);
  if (segs.includes("b")) V(hw - bar / 2, -half, hh);
  if (segs.includes("c")) V(hw - bar / 2, half, hh);
  if (segs.includes("f")) V(-hw + bar / 2, -half, hh);
  if (segs.includes("e")) V(-hw + bar / 2, half, hh);
  return P;
}

// glyph quads for a stand-alone text mesh (outside the kit), merged into one geometry
function textGeometry(str, size, color) {
  const { cells } = textAtlas();
  const s = String(str).toUpperCase();
  const adv = size * ADVANCE;
  const width = s.length * adv;
  const gw = size * GLYPH_ASPECT;
  const geos = [];
  for (let i = 0; i < s.length; i++) {
    const cell = cells.get(`${color}:${s[i]}`);
    if (!cell) continue;
    const g = new THREE.PlaneGeometry(gw, size).toNonIndexed();
    const [px, py, w, h] = cell;
    const uv = g.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, (px + uv.getX(k) * w) / 1024, 1 - (py + (1 - uv.getY(k)) * h) / 1024);
    g.translate(-width / 2 + adv * (i + 0.5), size * 0.014, 0);
    geos.push(g);
  }
  return { geometry: geos.length ? mergeSimple(geos) : null, width };
}

/**
 * Lit sign plate for interactables: returns { group, material }. Give the group to ctx.group and the
 * material to the interactable (the hover tint edits material.emissive). Shows real stencil text
 * (`text`, e.g. "FLIGHT CONTROL") with an arrow glyph when `arrow` is "up" | "down" | "left" | "right".
 * normal: facing direction, w/h plate size, pos = plate centre.
 */
export function makeSignPlate(materials, o) {
  const { w = 0.6, h = 0.32, color = 0x0d0f14, emissive = 0x3a7bff, emissiveIntensity = 0.9, arrow = null, text = null, textColor = "white", pos = [0, 0, 0], normal = [0, 0, 1] } = o;
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color, emissive: new THREE.Color(emissive), emissiveIntensity, roughness: 0.35, metalness: 0.1 });
  const plate = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.03), material);
  plate.position.z = 0.015;
  group.add(plate);
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1a1c22, roughness: 0.6, metalness: 0.2 });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, h + 0.06, 0.02), frameMat);
  frame.position.z = 0.004;
  group.add(frame);
  // dark text field so the glyphs read against the glowing plate
  const field = new THREE.Mesh(new THREE.BoxGeometry(w - 0.08, h - 0.08, 0.01), frameMat);
  field.position.z = 0.032;
  group.add(field);
  let textMesh = null;
  try {
    const mats = textMaterials();
    const arrowGlyph = arrow === "up" ? "↑" : arrow === "down" ? "↓" : arrow === "left" ? "←" : arrow === "right" ? "→" : "";
    const line = text ? `${arrowGlyph}${arrowGlyph ? " " : ""}${text}` : arrowGlyph;
    if (line) {
      const size = Math.min(h * 0.5, ((w - 0.16) / Math.max(1, line.length)) / ADVANCE);
      const { geometry } = textGeometry(line, size, textColor);
      if (geometry) {
        textMesh = new THREE.Mesh(geometry, mats[TEXT_LIT_MAT]);
        textMesh.position.z = 0.04;
        group.add(textMesh);
      }
    }
  } catch (e) {
    /* no DOM canvas (tests): plate without text */
  }
  if (!textMesh && materials && materials.emitWhite) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(w - 0.2, 0.03, 0.006), materials.emitWhite);
    bar.position.z = 0.04;
    group.add(bar);
  }
  group.position.set(pos[0], pos[1], pos[2]);
  group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(normal[0], normal[1], normal[2]).normalize());
  return { group, material };
}

// minimal non-indexed merge (positions + normals + uvs) so props.js has no dependency on the addons
function mergeSimple(geos) {
  let count = 0;
  for (const g of geos) count += g.attributes.position.count;
  const pos = new Float32Array(count * 3);
  const nor = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  let off = 0;
  for (const g of geos) {
    const p = g.attributes.position;
    const n = g.attributes.normal;
    const u = g.attributes.uv;
    pos.set(p.array, off * 3);
    if (n) nor.set(n.array, off * 3);
    if (u) uv.set(u.array, off * 2);
    off += p.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  out.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return out;
}
