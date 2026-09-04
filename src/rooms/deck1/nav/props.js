// Phase-2 kit props for d1-nav and d1-tactical (Agent B, subagent 2). Richer versions of the shared Phase-1
// props (shared/props.js stays untouched): plotting stations, chairs, lockers, equipment columns, wall
// greebles (junction boxes, vents, conduits, intercoms), ceiling structure (beams, trays, downlights, rigs),
// floor inlays, hazard geometry, low rails and raised steps. Everything is world-space kit-bashing.
//
// Materials used here (all §10 shared keys): paintedMetal metalRough metal impPanel impFloor darkGloss
// emitWhite emitBlue emitRedImp emitAmber decal hazard (+ a screen material passed by the caller).
import * as THREE from "three";
import { rng } from "../../../kit.js";
import { decalRect } from "../../../textures.js";
import { IMP } from "../shared/palette.js";

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
export const WALL_OFF = 0.05; // wall panels sit 0.04 proud of the inner face; mount 1 cm in front of them
export const IND = ["emitBlue", "emitRedImp", "emitAmber", "emitBlue", "emitBlue", "emitAmber"];

// yaw about Y, then local tilt about X, then local roll about Z
export function quatYX(yaw, tilt = 0, roll = 0) {
  const q = new THREE.Quaternion().setFromAxisAngle(Y, yaw);
  if (tilt) q.multiply(new THREE.Quaternion().setFromAxisAngle(X, tilt));
  if (roll) q.multiply(new THREE.Quaternion().setFromAxisAngle(Z, roll));
  return q;
}

/**
 * Local frame for a prop. facing = quarter turns: local +z (the operator / room side) points to
 * 0: +z  1: +x  2: -z  3: -x. Local +x is "to the right" for someone standing on the +z side looking at -z.
 */
export function placer(kit, cx, cy, cz, facing = 0) {
  return placerRad(kit, cx, cy, cz, (facing * Math.PI) / 2);
}
/** Same as placer() with an arbitrary yaw in radians (local +z → (sin yaw, 0, cos yaw)). */
export function placerRad(kit, cx, cy, cz, a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const P = (ox, oy, oz) => [cx + ox * c + oz * s, cy + oy, cz - ox * s + oz * c];
  return {
    a,
    P,
    origin: [cx, cy, cz],
    box(mat, ox, oy, oz, sx, sy, sz, opts = {}) {
      const { tilt = 0, roll = 0, ...rest } = opts;
      return kit.add(mat, new THREE.BoxGeometry(sx, sy, sz), { pos: P(ox, oy, oz), quat: quatYX(a, tilt, roll), ...rest });
    },
    cyl(mat, ox, oy, oz, r, len, axis = "y", opts = {}) {
      const { segments = 12, r2, ...rest } = opts;
      const g = new THREE.CylinderGeometry(r2 !== undefined ? r2 : r, r, len, segments);
      const q = axis === "x" ? quatYX(a, 0, Math.PI / 2) : axis === "z" ? quatYX(a, Math.PI / 2) : quatYX(a);
      return kit.add(mat, g, { pos: P(ox, oy, oz), quat: q, uv: "scale", uvScale: [2 * Math.PI * r, len], ...rest });
    },
    // vertical screen facing local +z (thin box, image upright for a viewer on the +z side)
    screenV(mat, ox, oy, oz, w, h, uvRect = null, tilt = 0) {
      return kit.add(mat, new THREE.BoxGeometry(w, h, 0.01), { pos: P(ox, oy, oz), quat: quatYX(a, tilt), uv: "keep", ...(uvRect ? { uvRect } : {}) });
    },
    // horizontal screen facing +y (thin box, image upright for a viewer on the +z side looking down)
    screenH(mat, ox, oy, oz, w, d, uvRect = null, tilt = 0) {
      return kit.add(mat, new THREE.BoxGeometry(w, 0.01, d), { pos: P(ox, oy, oz), quat: quatYX(a, tilt), uv: "keep", ...(uvRect ? { uvRect } : {}) });
    },
    decal(ox, oy, oz, size, index, tilt = 0) {
      return kit.add("decal", new THREE.PlaneGeometry(size, size), { pos: P(ox, oy, oz), quat: quatYX(a, tilt), uv: "keep", uvRect: decalRect(index) });
    },
    // point on a slab tilted by `tilt` about local x: (ox, height above the slab centre plane, distance along the slab toward +z)
    onSlope(ox, h, d, tilt) {
      return [ox, h * Math.cos(tilt) - d * Math.sin(tilt), h * Math.sin(tilt) + d * Math.cos(tilt)];
    },
    collider(ox0, ox1, oy0, oy1, oz0, oz1, tag) {
      const mn = [Infinity, Infinity, Infinity];
      const mx = [-Infinity, -Infinity, -Infinity];
      for (const ox of [ox0, ox1])
        for (const oy of [oy0, oy1])
          for (const oz of [oz0, oz1]) {
            const p = P(ox, oy, oz);
            for (let i = 0; i < 3; i++) {
              mn[i] = Math.min(mn[i], p[i]);
              mx[i] = Math.max(mx[i], p[i]);
            }
          }
      kit.collider(mn, mx, tag);
    },
  };
}

export const FACE_FACING = { n: 0, w: 1, s: 2, e: 3 };
/** Placer anchored on an inner wall face: a = world along-coordinate (x for n/s, z for w/e), local +z = into the room. */
export function wallAnchor(kit, face, inner, a, y) {
  let cx;
  let cz;
  if (face === "n") [cx, cz] = [a, inner.min[2]];
  else if (face === "s") [cx, cz] = [a, inner.max[2]];
  else if (face === "w") [cx, cz] = [inner.min[0], a];
  else [cx, cz] = [inner.max[0], a];
  return placer(kit, cx, y, cz, FACE_FACING[face]);
}

// ---------------------------------------------------------------------------
// Stations and seating
// ---------------------------------------------------------------------------

/**
 * Plotting / operator station: stepped black plinth with armour ears, sloped desk with button rows and a
 * secondary screen, raised display housing with the main screen, indicator columns, footrest, cable duct.
 * p = placer at the floor centre; the operator stands/sits on local +z. ~50 primitives.
 */
export function station(kit, p, { w = 2.4, screenMat = "screenImp0", screenRect = null, deskMat = null, deskRect = null, seed = 0, label = 6 } = {}) {
  const rand = rng(seed + 11);
  const tilt = 0.24;
  // plinth: recessed base, body, ears
  p.box("paintedMetal", 0, 0.06, -0.02, w - 0.4, 0.12, 0.6, { color: IMP.black, texel: 1 });
  p.box("paintedMetal", 0, 0.42, -0.02, w - 0.12, 0.6, 0.74, { color: IMP.black, texel: 1 });
  p.box("paintedMetal", 0, 0.66, 0.36, w - 0.3, 0.08, 0.06, { color: IMP.dark, texel: 1 }); // front lip under the desk
  for (const s of [-1, 1]) {
    p.box("paintedMetal", s * (w / 2 - 0.03), 0.58, -0.02, 0.06, 1.16, 0.84, { color: IMP.dark, texel: 1 });
    p.box("metal", s * (w / 2 - 0.03), 0.9, 0.32, 0.07, 0.03, 0.2, { color: IMP.mid, texel: 2 }); // ear cap
  }
  // sloped desk slab (rises away from the operator)
  const dz = 0.08;
  p.box("darkGloss", 0, 0.9, dz, w - 0.14, 0.05, 0.6, { tilt });
  {
    const [tx, ty, tz] = p.onSlope(0, 0.005, 0.305, tilt);
    p.box("metal", tx, 0.9 + ty, dz + tz, w - 0.14, 0.02, 0.03, { color: IMP.mid, texel: 2, tilt }); // front edge trim
  }
  // buttons and switches on the desk (two rows), a slider bank and the secondary screen
  const cols = Math.max(6, Math.floor((w - 1.1) / 0.09));
  for (let r = 0; r < 2; r++) {
    for (let i = 0; i < cols; i++) {
      const ox = -w / 2 + 0.55 + i * 0.09;
      const [lx, ly, lz] = p.onSlope(ox, 0.032, 0.14 - r * 0.09, tilt);
      const v = rand();
      const mat = v < 0.55 ? "paintedMetal" : v < 0.75 ? "emitBlue" : v < 0.9 ? "emitAmber" : "emitRedImp";
      p.box(mat, lx, 0.9 + ly, dz + lz, 0.06, 0.014, 0.05, { color: IMP.black, texel: 4, tilt });
    }
  }
  for (let i = 0; i < 4; i++) {
    const ox = w / 2 - 0.5 + i * 0.1;
    const [lx, ly, lz] = p.onSlope(ox, 0.03, -0.1, tilt);
    p.box("metal", lx, 0.9 + ly, dz + lz, 0.02, 0.012, 0.22, { color: IMP.black, texel: 4, tilt });
    const k = -0.08 + rand() * 0.16;
    const [kx, ky, kz] = p.onSlope(ox, 0.045, -0.1 + k, tilt);
    p.box("metal", kx, 0.9 + ky, dz + kz, 0.03, 0.02, 0.03, { color: IMP.steel, texel: 4, tilt });
  }
  {
    const [sx, sy, sz] = p.onSlope(-w / 2 + 0.36, 0.031, -0.06, tilt);
    p.screenH(deskMat || screenMat, sx, 0.9 + sy, dz + sz, 0.44, 0.28, deskRect, tilt);
    const [bx, by, bz] = p.onSlope(-w / 2 + 0.36, 0.031, 0.14, tilt);
    p.box("emitBlue", bx, 0.9 + by, dz + bz, 0.4, 0.008, 0.02, { tilt });
  }
  // raised display housing at the back with the main screen facing the operator
  p.box("paintedMetal", 0, 1.13, -0.36, w - 0.22, 0.44, 0.16, { color: IMP.dark, texel: 1 });
  p.box("metal", 0, 1.36, -0.36, w - 0.18, 0.03, 0.2, { color: IMP.mid, texel: 2 });
  p.screenV(screenMat, 0, 1.15, -0.274, w - 0.42, 0.3, screenRect);
  p.box("emitBlue", 0, 0.955, -0.27, w - 0.5, 0.012, 0.006);
  // indicator columns at both ends of the housing
  for (const s of [-1, 1]) {
    for (let i = 0; i < 5; i++) p.box(IND[(i + seed + (s > 0 ? 2 : 0)) % IND.length], s * (w / 2 - 0.17), 1.02 + i * 0.06, -0.274, 0.03, 0.03, 0.006);
  }
  // footrest bar, back cable duct with two conduits, label
  p.cyl("metal", 0, 0.16, 0.42, 0.018, w - 0.5, "x", { color: IMP.steel, segments: 8 });
  for (const s of [-1, 1]) p.box("metal", s * (w / 2 - 0.26), 0.13, 0.4, 0.04, 0.08, 0.06, { color: IMP.mid });
  p.box("paintedMetal", 0, 0.05, -0.5, w - 0.4, 0.1, 0.08, { color: IMP.black, texel: 1 });
  for (const ox of [-0.3, 0.3]) p.cyl("metalRough", ox, 0.4, -0.5, 0.016, 0.6, "y", { color: IMP.mid, segments: 8 });
  p.decal(w / 2 - 0.4, 0.5, 0.354, 0.22, label);
  p.collider(-w / 2 - 0.04, w / 2 + 0.04, 0, 1.4, -0.56, 0.5, "station");
}

/** Operator chair: pedestal, pan + pad, tilted back, armrests. Occupant faces local -z. */
export function chair(kit, p, { pad = "paintedMetal", padColor = IMP.dark, shellColor = IMP.dark, backLed = false } = {}) {
  p.cyl("paintedMetal", 0, 0.02, 0, 0.27, 0.04, "y", { color: IMP.black, segments: 16, texel: 1 });
  p.cyl("metal", 0, 0.25, 0, 0.045, 0.42, "y", { color: IMP.mid, segments: 10, texel: 1 });
  p.box("paintedMetal", 0, 0.465, 0, 0.5, 0.07, 0.5, { color: shellColor, texel: 1 });
  p.box(pad, 0, 0.52, 0.01, 0.44, 0.04, 0.44, { color: padColor, texel: 2 });
  p.box("metal", 0, 0.62, 0.26, 0.08, 0.34, 0.04, { color: IMP.mid, texel: 2 });
  p.box("paintedMetal", 0, 0.86, 0.26, 0.48, 0.6, 0.06, { color: shellColor, texel: 1, tilt: 0.12 });
  p.box(pad, 0, 0.86, 0.225, 0.4, 0.5, 0.03, { color: padColor, texel: 2, tilt: 0.12 });
  // seat-row marker on the rear face of the back (briefing seating): (0, 0.25, 0.034) rotated by the back tilt
  if (backLed) p.box("emitBlue", 0, 1.104, 0.324, 0.16, 0.012, 0.006, { tilt: 0.12 });
  for (const s of [-1, 1]) {
    p.box("paintedMetal", s * 0.27, 0.71, 0.04, 0.05, 0.035, 0.36, { color: IMP.black, texel: 2 });
    p.box("metal", s * 0.27, 0.6, 0.14, 0.035, 0.2, 0.04, { color: IMP.mid, texel: 2 });
  }
}

// ---------------------------------------------------------------------------
// Wall-mounted equipment (p = wallAnchor at floor level unless noted)
// ---------------------------------------------------------------------------

/** Storage locker with panelled doors, handle, vent slats, status LED, label. p at floor, centred. */
export function locker(kit, p, { w = 0.8, h = 2.2, d = 0.55, seed = 0, label = 6, double = true } = {}) {
  const f = WALL_OFF + d;
  p.box("paintedMetal", 0, h / 2, WALL_OFF + d / 2, w, h, d, { color: IMP.dark, texel: 1 });
  p.box("metal", 0, h + 0.015, WALL_OFF + d / 2, w + 0.02, 0.03, d + 0.02, { color: IMP.mid, texel: 2 });
  p.box("impPanel", 0, h / 2 + 0.02, f + 0.008, w - 0.06, h - 0.16, 0.016, { color: IMP.grey, texel: 0.8 });
  if (double) p.box("paintedMetal", 0, h / 2 + 0.02, f + 0.017, 0.02, h - 0.16, 0.004, { color: IMP.black });
  for (const s of double ? [-1, 1] : [1]) {
    p.box("metal", s * 0.06, 1.05, f + 0.03, 0.025, 0.16, 0.025, { color: IMP.steel, texel: 2 });
    p.box("paintedMetal", s * 0.06, 1.05, f + 0.018, 0.05, 0.2, 0.004, { color: IMP.black });
  }
  for (let k = 0; k < 5; k++) p.box("metalRough", 0, 0.22 + k * 0.045, f + 0.02, w - 0.3, 0.012, 0.012, { color: IMP.black });
  p.box(seed % 2 ? "emitAmber" : "emitBlue", w / 2 - 0.1, h - 0.18, f + 0.02, 0.03, 0.03, 0.008);
  p.decal(0, h - 0.5, f + 0.02, 0.26, label);
  p.collider(-w / 2 - 0.02, w / 2 + 0.02, 0, h + 0.05, 0, f + 0.05, "locker");
}

/**
 * Equipment / data column: black body, recessed front with an LED matrix, vent slats, a small screen,
 * conduits from the top to the ceiling with a junction head. p at floor, centred.
 */
export function dataColumn(kit, p, { w = 0.8, h = 2.4, d = 0.7, ceilY = 4.2, seed = 0, screenMat = null, screenRect = null } = {}) {
  const rand = rng(seed + 3);
  const f = WALL_OFF + d;
  p.box("paintedMetal", 0, h / 2, WALL_OFF + d / 2, w, h, d, { color: IMP.black, texel: 1 });
  p.box("paintedMetal", 0, h / 2, f + 0.01, w - 0.08, h - 0.1, 0.02, { color: IMP.dark, texel: 1 }); // front frame plate
  p.box("darkGloss", 0, h * 0.62, f + 0.021, w - 0.24, h * 0.5, 0.01); // recessed instrument panel
  // LED matrix
  const rows = Math.floor((h * 0.5 - 0.4) / 0.09);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < 3; c++) {
      if (rand() < 0.3) continue;
      const v = rand();
      p.box(v < 0.55 ? "emitBlue" : v < 0.85 ? "emitAmber" : "emitRedImp", -w / 2 + 0.24 + c * 0.1, h * 0.4 + 0.25 + r * 0.09, f + 0.03, 0.035, 0.02, 0.008);
    }
  }
  if (screenMat) p.screenV(screenMat, w / 2 - 0.3, h * 0.72, f + 0.03, 0.34, 0.2, screenRect);
  // handles / vents / label
  for (let k = 0; k < 6; k++) p.box("metalRough", 0, 0.25 + k * 0.05, f + 0.03, w - 0.3, 0.012, 0.015, { color: IMP.mid });
  p.box("metal", 0, h * 0.34, f + 0.035, w - 0.3, 0.02, 0.02, { color: IMP.steel, texel: 2 });
  p.decal(0, h * 0.2, f + 0.03, 0.22, 9);
  // top: cap + conduits into the ceiling + junction head
  p.box("metal", 0, h + 0.02, WALL_OFF + d / 2, w + 0.04, 0.04, d + 0.04, { color: IMP.mid, texel: 2 });
  const run = ceilY - (h + 0.04) - 0.02;
  if (run > 0.2) {
    for (const ox of [-0.18, 0.18]) p.cyl("metalRough", ox, h + 0.04 + run / 2, WALL_OFF + 0.25, 0.035, run, "y", { color: IMP.mid, segments: 10 });
    p.box("metalRough", 0, h + 0.22, WALL_OFF + 0.25, 0.6, 0.3, 0.3, { color: IMP.dark, texel: 1 });
    p.box("emitAmber", 0.2, h + 0.22, WALL_OFF + 0.405, 0.04, 0.04, 0.01);
  }
  p.collider(-w / 2 - 0.02, w / 2 + 0.02, 0, h + 0.05, 0, f + 0.05, "column");
}

/** Junction box with face plate, two LEDs, HV stencil and conduits up/down. p at the box centre height. */
export function junctionBox(kit, p, { w = 0.32, h = 0.42, up = 0, down = 0, decal = 5, seed = 0 } = {}) {
  const d = 0.12;
  p.box("metalRough", 0, 0, WALL_OFF + d / 2, w, h, d, { color: IMP.mid, texel: 2 });
  p.box("paintedMetal", 0, 0, WALL_OFF + d + 0.005, w - 0.05, h - 0.05, 0.01, { color: IMP.dark, texel: 2 });
  p.box(seed % 2 ? "emitAmber" : "emitBlue", -w / 2 + 0.06, h / 2 - 0.07, WALL_OFF + d + 0.012, 0.03, 0.025, 0.006);
  p.box("emitRedImp", -w / 2 + 0.11, h / 2 - 0.07, WALL_OFF + d + 0.012, 0.03, 0.025, 0.006);
  if (decal !== null) p.decal(0, -0.04, WALL_OFF + d + 0.012, Math.min(w, h) * 0.6, decal);
  for (const s of [-1, 1]) p.cyl("metal", s * (w / 2 - 0.04), 0, WALL_OFF + d + 0.004, 0.01, 0.01, "z", { color: IMP.steel, segments: 6 });
  const pipe = (y0, y1) => {
    const L = y1 - y0;
    if (L < 0.05) return;
    p.cyl("metalRough", 0, (y0 + y1) / 2, WALL_OFF + 0.035, 0.022, L, "y", { color: IMP.mid, segments: 8 });
    for (let y = y0 + 0.3; y < y1 - 0.1; y += 0.7) p.box("metal", 0, y, WALL_OFF + 0.03, 0.08, 0.03, 0.07, { color: IMP.steel, texel: 2 });
  };
  if (up > 0) pipe(h / 2, h / 2 + up);
  if (down > 0) pipe(-h / 2 - down, -h / 2);
}

/** Recessed wall vent with angled slats. p at the vent centre height. */
export function vent(kit, p, { w = 0.7, h = 0.32 } = {}) {
  p.box("metalRough", 0, 0, WALL_OFF + 0.03, w, h, 0.06, { color: IMP.dark, texel: 2 });
  p.box("paintedMetal", 0, 0, WALL_OFF + 0.035, w - 0.08, h - 0.08, 0.058, { color: IMP.black, texel: 2 });
  const n = Math.max(3, Math.floor((h - 0.1) / 0.045));
  for (let k = 0; k < n; k++) p.box("metal", 0, -h / 2 + 0.06 + k * 0.045, WALL_OFF + 0.07, w - 0.1, 0.01, 0.03, { color: IMP.mid, texel: 2, tilt: 0.55 });
}

/** Intercom / call panel. p at the panel centre height. */
export function intercom(kit, p) {
  p.box("paintedMetal", 0, 0, WALL_OFF + 0.04, 0.22, 0.3, 0.08, { color: IMP.dark, texel: 2 });
  p.box("impPanel", 0, 0.02, WALL_OFF + 0.085, 0.18, 0.24, 0.01, { color: IMP.grey, texel: 2 });
  for (let k = 0; k < 6; k++) p.box("metal", 0, 0.1 - k * 0.022, WALL_OFF + 0.092, 0.12, 0.006, 0.004, { color: IMP.black });
  p.box("paintedMetal", -0.05, -0.08, WALL_OFF + 0.095, 0.03, 0.03, 0.01, { color: IMP.black });
  p.box("emitBlue", 0.05, -0.08, WALL_OFF + 0.092, 0.014, 0.014, 0.006);
}

/** Emergency / fire cabinet: deep red box with a stencil and a latch. p at floor level? no: at the cabinet centre. */
export function emergencyCabinet(kit, p) {
  p.box("paintedMetal", 0, 0, WALL_OFF + 0.11, 0.42, 0.62, 0.22, { color: new THREE.Color("#7a1a14"), texel: 1 });
  p.box("paintedMetal", 0, 0, WALL_OFF + 0.225, 0.38, 0.58, 0.01, { color: new THREE.Color("#8f2119"), texel: 1 });
  p.box("metal", 0.14, 0, WALL_OFF + 0.24, 0.02, 0.12, 0.02, { color: IMP.steel, texel: 2 });
  p.decal(0, 0.06, WALL_OFF + 0.232, 0.28, 13);
  p.box("hazard", 0, -0.29, WALL_OFF + 0.232, 0.38, 0.04, 0.005, { texel: 3 });
  p.collider(-0.23, 0.23, -0.35, 0.35, 0, WALL_OFF + 0.3, "cabinet");
}

/** Framed wall screen: deep bezel, inner lip, screen plate, LED trio, label plate. p at the screen centre height. */
export function framedScreen(kit, p, { w = 2.0, h = 1.2, mat, uvRect = null, bezel = 0.09, deep = 0.12, leds = true } = {}) {
  p.box("darkGloss", 0, 0, WALL_OFF + deep / 2, w + 2 * bezel, h + 2 * bezel, deep);
  p.box("metal", 0, 0, WALL_OFF + deep + 0.004, w + 0.04, h + 0.04, 0.008, { color: IMP.mid, texel: 2 });
  p.screenV(mat, 0, 0, WALL_OFF + deep + 0.012, w, h, uvRect);
  for (const s of [-1, 1]) p.box("metalRough", s * (w / 2 - 0.1), -h / 2 - bezel - 0.02, WALL_OFF + deep / 2, 0.16, 0.04, deep, { color: IMP.mid });
  if (leds) for (let i = 0; i < 3; i++) p.box(IND[i], -w / 2 + 0.1 + i * 0.07, -h / 2 - bezel / 2, WALL_OFF + deep + 0.004, 0.035, 0.02, 0.006);
  p.decal(w / 2 - 0.2, -h / 2 - bezel / 2, WALL_OFF + deep + 0.004, bezel * 0.9, 9);
}

/** Overhead readout bar: tilted housing on two brackets, wide screen, amber end caps. p at the bar centre height. */
export function readoutBar(kit, p, { w = 2.4, h = 0.26, mat, uvRect = null, tilt = 0.28 } = {}) {
  const d = 0.1;
  const oz = WALL_OFF + 0.14;
  for (const s of [-1, 1]) p.box("metalRough", s * (w / 2 - 0.25), 0.02, WALL_OFF + 0.06, 0.06, 0.1, 0.12, { color: IMP.mid, texel: 2 });
  p.box("paintedMetal", 0, 0, oz, w, h + 0.08, d, { color: IMP.dark, texel: 1, tilt });
  {
    const [, cy, cz] = p.onSlope(0, (h + 0.08) / 2 + 0.01, 0, tilt);
    p.box("metal", 0, cy, oz + cz, w + 0.02, 0.02, d + 0.02, { color: IMP.mid, texel: 2, tilt });
  }
  // front face centre of the tilted housing: the housing's +z offset rotated about local x by the tilt
  const [, fy, fz] = p.onSlope(0, 0, d / 2 + 0.006, tilt);
  p.screenV(mat, 0, fy, oz + fz, w - 0.16, h, uvRect, tilt);
  for (const s of [-1, 1]) p.box("emitAmber", s * (w / 2 - 0.04), fy, oz + fz, 0.02, h * 0.6, 0.006, { tilt });
}

/** Vertical conduit bundle between two manifold blocks (Kestrel-style). p at floor; y0..y1 is the run. */
export function conduitBundle(kit, p, { y0 = 1.2, y1 = 3.8, pipes = [[-0.1, 0.03], [0, 0.022], [0.1, 0.026]] } = {}) {
  const L = y1 - y0;
  for (const [ox, r] of pipes) p.cyl("metalRough", ox, (y0 + y1) / 2, WALL_OFF + r + 0.03, r, L, "y", { color: IMP.mid, segments: 10 });
  for (const y of [y0, y1]) p.box("paintedMetal", 0, y, WALL_OFF + 0.06, 0.34, 0.1, 0.12, { color: IMP.dark, texel: 2 });
  const n = Math.max(1, Math.floor(L / 0.9));
  for (let i = 1; i <= n; i++) {
    const y = y0 + (L * i) / (n + 1);
    p.box("metal", 0, y, WALL_OFF + 0.045, 0.3, 0.05, 0.09, { color: IMP.steel, texel: 2 });
  }
  p.box("emitBlue", 0.12, y0, WALL_OFF + 0.125, 0.03, 0.03, 0.006);
}

/** Horizontal pipe on a wall along the wall (local x), with clamps. p at the pipe centre height, centred. */
export function wallPipe(kit, p, { len = 4, r = 0.03, color = IMP.mid, clampEvery = 1.2 } = {}) {
  p.cyl("metalRough", 0, 0, WALL_OFF + r + 0.02, r, len, "x", { color, segments: 10 });
  for (let x = -len / 2 + 0.4; x < len / 2 - 0.2; x += clampEvery) p.box("metal", x, 0, WALL_OFF + r + 0.01, 0.06, r * 2 + 0.04, r * 2 + 0.02, { color: IMP.steel, texel: 2 });
}

/** Wall luminaire (over a door / above seating): angled housing with a downward emitter and two brackets. p at the housing centre height. */
export function wallLuminaire(kit, p, { w = 0.7, emit = "emitWhite" } = {}) {
  const tilt = -0.5;
  const oz = WALL_OFF + 0.13;
  for (const s of [-1, 1]) p.box("metalRough", s * (w / 2 - 0.08), 0.05, WALL_OFF + 0.05, 0.05, 0.1, 0.1, { color: IMP.mid, texel: 2 });
  p.box("paintedMetal", 0, 0, oz, w, 0.12, 0.2, { color: IMP.dark, texel: 1, tilt });
  const [, ey, ez] = p.onSlope(0, -0.061, 0, tilt);
  p.box(emit, 0, ey, oz + ez, w - 0.12, 0.006, 0.14, { tilt });
  const [, ly, lz] = p.onSlope(0, 0, 0.103, tilt);
  p.box("emitBlue", w / 2 - 0.04, ly, oz + lz, 0.02, 0.02, 0.006, { tilt });
}

/** Small mounted decal plate (stencil on a dark plate). p at the centre height. */
export function stencilPlate(kit, p, size, index, { plate = true } = {}) {
  if (plate) p.box("paintedMetal", 0, 0, WALL_OFF + 0.004, size * 1.1, size * 1.1, 0.008, { color: IMP.dark, texel: 2 });
  p.decal(0, 0, WALL_OFF + 0.012, size, index);
}

// ---------------------------------------------------------------------------
// Ceiling structure (world coordinates)
// ---------------------------------------------------------------------------

/** Box beam with a lighter flange and bolt heads on the underside. Axis-aligned by min/max. */
export function beam(kit, min, max, { color = IMP.dark, flange = true, bolts = true } = {}) {
  kit.boxMM("paintedMetal", min, max, { color, texel: 1 });
  const alongX = max[0] - min[0] > max[2] - min[2];
  if (flange) kit.boxMM("metal", [min[0] - 0.02, min[1] - 0.025, min[2] - 0.02], [max[0] + 0.02, min[1], max[2] + 0.02], { color: IMP.mid, texel: 1 });
  if (bolts) {
    const L = alongX ? max[0] - min[0] : max[2] - min[2];
    for (let s = 0.6; s < L - 0.3; s += 1.2) {
      for (const k of [0.3, 0.7]) {
        const x = alongX ? min[0] + s : min[0] + (max[0] - min[0]) * k;
        const z = alongX ? min[2] + (max[2] - min[2]) * k : min[2] + s;
        kit.cyl("metal", x, min[1] - 0.035, z, 0.022, 0.02, "y", { color: IMP.steel, segments: 6 });
      }
    }
  }
}

/**
 * Ceiling ribs: shallow lighter-grey stiffeners under the dark ceiling panels (they catch the downlights and
 * break the ceiling into bays). Runs along z at each x in `xs`, from z0 to z1; top face buried in the panel.
 */
export function ceilingRibs(kit, xs, z0, z1, ceilY, { w = 0.08, depth = 0.1, color = IMP.mid } = {}) {
  for (const x of xs) {
    kit.boxMM("metal", [x - w / 2, ceilY - depth, z0], [x + w / 2, ceilY + 0.01, z1], { color, texel: 1 });
    kit.boxMM("paintedMetal", [x - 0.012, ceilY - depth - 0.006, z0 + 0.02], [x + 0.012, ceilY - depth, z1 - 0.02], { color: IMP.black });
  }
}

/** Cable tray: U-channel with cable bundles and hangers to the ceiling. Straight run along x or z. */
export function cableTray(kit, from, to, y, { w = 0.36, hangTo = null, cables = 3 } = {}) {
  const alongX = Math.abs(to[0] - from[0]) > Math.abs(to[1] - from[1]);
  const x0 = Math.min(from[0], to[0]);
  const x1 = Math.max(from[0], to[0]);
  const z0 = Math.min(from[1], to[1]);
  const z1 = Math.max(from[1], to[1]);
  const L = alongX ? x1 - x0 : z1 - z0;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  if (alongX) {
    kit.boxMM("metalRough", [x0, y, cz - w / 2], [x1, y + 0.02, cz + w / 2], { color: IMP.dark, texel: 1 });
    kit.boxMM("metalRough", [x0, y, cz - w / 2], [x1, y + 0.09, cz - w / 2 + 0.02], { color: IMP.dark, texel: 1 });
    kit.boxMM("metalRough", [x0, y, cz + w / 2 - 0.02], [x1, y + 0.09, cz + w / 2], { color: IMP.dark, texel: 1 });
  } else {
    kit.boxMM("metalRough", [cx - w / 2, y, z0], [cx + w / 2, y + 0.02, z1], { color: IMP.dark, texel: 1 });
    kit.boxMM("metalRough", [cx - w / 2, y, z0], [cx - w / 2 + 0.02, y + 0.09, z1], { color: IMP.dark, texel: 1 });
    kit.boxMM("metalRough", [cx + w / 2 - 0.02, y, z0], [cx + w / 2, y + 0.09, z1], { color: IMP.dark, texel: 1 });
  }
  const cols = [IMP.black, IMP.mid, IMP.black, new THREE.Color("#3b3f62")];
  for (let i = 0; i < cables; i++) {
    const off = -w / 2 + 0.07 + (i * (w - 0.14)) / Math.max(1, cables - 1);
    const r = 0.018 + (i % 2) * 0.01;
    if (alongX) kit.cyl("paintedMetal", cx, y + 0.02 + r, cz + off, r, L - 0.05, "x", { color: cols[i % cols.length], segments: 8 });
    else kit.cyl("paintedMetal", cx + off, y + 0.02 + r, cz, r, L - 0.05, "z", { color: cols[i % cols.length], segments: 8 });
  }
  if (hangTo !== null && hangTo - (y + 0.09) > 0.03) {
    const hy = (y + 0.09 + hangTo) / 2;
    const hh = hangTo - (y + 0.09);
    for (let s = 0.5; s < L; s += 1.6) {
      for (const side of [-1, 1]) {
        const off = side * (w / 2 - 0.03);
        if (alongX) kit.box("metal", x0 + s, hy, cz + off, 0.03, hh, 0.03, { color: IMP.mid, texel: 2 });
        else kit.box("metal", cx + off, hy, z0 + s, 0.03, hh, 0.03, { color: IMP.mid, texel: 2 });
      }
    }
  }
}

/** Downlight housing: dark can, lighter rim, emitter disc, cross louvre. y = housing top (under the ceiling). */
export function downlight(kit, x, y, z, { r = 0.17, emit = "emitWhite" } = {}) {
  kit.cyl("metalRough", x, y - 0.06, z, r + 0.07, 0.12, "y", { color: IMP.dark, segments: 16, texel: 1 });
  kit.cyl("metal", x, y - 0.118, z, r + 0.05, 0.012, "y", { color: IMP.mid, segments: 16, texel: 1 });
  kit.cyl(emit, x, y - 0.126, z, r, 0.012, "y", { segments: 16 });
  kit.box("metalRough", x, y - 0.134, z, r * 2, 0.008, 0.02, { color: IMP.dark });
  kit.box("metalRough", x, y - 0.134, z, 0.02, 0.008, r * 2, { color: IMP.dark });
}

/** Ceiling vent grille (square). y = ceiling face. */
export function ceilingVent(kit, x, y, z, { w = 0.6, d = 0.6 } = {}) {
  kit.box("metalRough", x, y - 0.025, z, w, 0.05, d, { color: IMP.dark, texel: 2 });
  kit.box("paintedMetal", x, y - 0.056, z, w - 0.08, 0.012, d - 0.08, { color: IMP.black, texel: 2 });
  const n = Math.floor((d - 0.1) / 0.06);
  for (let k = 0; k < n; k++) kit.box("metal", x, y - 0.066, z - d / 2 + 0.08 + k * 0.06, w - 0.1, 0.008, 0.03, { color: IMP.mid, texel: 2 });
}

/** Projector rig hung over a table: frame ring of struts with lens emitters and hangers to the ceiling. */
export function projectorRig(kit, cx, cy, cz, { shape = "octagon", rx = 1.6, rz = 1.6, ceilY, lenses = 8, emit = "emitBlue" } = {}) {
  const h = 0.16;
  if (shape === "octagon") {
    const n = 8;
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2;
      const a1 = ((k + 1) / n) * Math.PI * 2;
      const mx = (Math.sin(a0) + Math.sin(a1)) / 2;
      const mz = (Math.cos(a0) + Math.cos(a1)) / 2;
      const len = 2 * rx * Math.sin(Math.PI / n);
      const yaw = Math.atan2(Math.sin(a0) - Math.sin(a1), Math.cos(a0) - Math.cos(a1));
      kit.add("paintedMetal", new THREE.BoxGeometry(0.12, h, len), { pos: [cx + mx * rx, cy, cz + mz * rx], rot: [0, yaw, 0], color: IMP.dark, texel: 1 });
      kit.add("metal", new THREE.BoxGeometry(0.14, 0.02, len), { pos: [cx + mx * rx, cy - h / 2 - 0.01, cz + mz * rx], rot: [0, yaw, 0], color: IMP.mid, texel: 2 });
      // lens under each strut midpoint
      kit.cyl("metalRough", cx + mx * rx, cy - h / 2 - 0.05, cz + mz * rx, 0.07, 0.06, "y", { color: IMP.black, segments: 10 });
      kit.cyl(emit, cx + mx * rx, cy - h / 2 - 0.085, cz + mz * rx, 0.045, 0.01, "y", { segments: 10 });
    }
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 8;
      const px = cx + Math.sin(a) * rx * 0.92;
      const pz = cz + Math.cos(a) * rx * 0.92;
      kit.box("metal", px, (cy + h / 2 + ceilY) / 2, pz, 0.05, ceilY - cy - h / 2, 0.05, { color: IMP.mid, texel: 2 });
    }
  } else {
    // rectangular frame
    kit.boxMM("paintedMetal", [cx - rx, cy - h / 2, cz - rz], [cx + rx, cy + h / 2, cz - rz + 0.12], { color: IMP.dark, texel: 1 });
    kit.boxMM("paintedMetal", [cx - rx, cy - h / 2, cz + rz - 0.12], [cx + rx, cy + h / 2, cz + rz], { color: IMP.dark, texel: 1 });
    kit.boxMM("paintedMetal", [cx - rx, cy - h / 2, cz - rz], [cx - rx + 0.12, cy + h / 2, cz + rz], { color: IMP.dark, texel: 1 });
    kit.boxMM("paintedMetal", [cx + rx - 0.12, cy - h / 2, cz - rz], [cx + rx, cy + h / 2, cz + rz], { color: IMP.dark, texel: 1 });
    kit.boxMM("metal", [cx - rx - 0.01, cy - h / 2 - 0.02, cz - rz - 0.01], [cx + rx + 0.01, cy - h / 2, cz - rz + 0.13], { color: IMP.mid, texel: 2 });
    kit.boxMM("metal", [cx - rx - 0.01, cy - h / 2 - 0.02, cz + rz - 0.13], [cx + rx + 0.01, cy - h / 2, cz + rz + 0.01], { color: IMP.mid, texel: 2 });
    const n = lenses;
    for (let k = 0; k < n; k++) {
      const u = (k + 0.5) / n;
      for (const side of [-1, 1]) {
        const lx = cx - rx + 0.2 + u * (2 * rx - 0.4);
        const lz = cz + side * (rz - 0.06);
        kit.cyl("metalRough", lx, cy - h / 2 - 0.05, lz, 0.06, 0.06, "y", { color: IMP.black, segments: 10 });
        kit.cyl(emit, lx, cy - h / 2 - 0.085, lz, 0.04, 0.01, "y", { segments: 10 });
      }
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.box("metal", cx + sx * (rx - 0.06), (cy + h / 2 + ceilY) / 2, cz + sz * (rz - 0.06), 0.05, ceilY - cy - h / 2, 0.05, { color: IMP.mid, texel: 2 });
  }
}

// ---------------------------------------------------------------------------
// Floor
// ---------------------------------------------------------------------------

/** Floor inlay band: black plate with two blue edge strips and cross ticks. Straight along x or z (min/max). */
export function floorInlay(kit, min, max, { emit = "emitBlue", ticks = true } = {}) {
  const alongX = max[0] - min[0] > max[2] - min[2];
  const y = min[1];
  kit.boxMM("paintedMetal", [min[0], y, min[2]], [max[0], y + 0.012, max[2]], { color: IMP.black, texel: 1 });
  const e = 0.035;
  if (alongX) {
    kit.boxMM(emit, [min[0] + 0.1, y + 0.006, min[2] + 0.03], [max[0] - 0.1, y + 0.016, min[2] + 0.03 + e]);
    kit.boxMM(emit, [min[0] + 0.1, y + 0.006, max[2] - 0.03 - e], [max[0] - 0.1, y + 0.016, max[2] - 0.03]);
    if (ticks) for (let x = min[0] + 1.0; x < max[0] - 0.5; x += 1.5) kit.boxMM(emit, [x, y + 0.006, min[2] + 0.03 + e], [x + 0.03, y + 0.016, max[2] - 0.03 - e]);
  } else {
    kit.boxMM(emit, [min[0] + 0.03, y + 0.006, min[2] + 0.1], [min[0] + 0.03 + e, y + 0.016, max[2] - 0.1]);
    kit.boxMM(emit, [max[0] - 0.03 - e, y + 0.006, min[2] + 0.1], [max[0] - 0.03, y + 0.016, max[2] - 0.1]);
    if (ticks) for (let z = min[2] + 1.0; z < max[2] - 0.5; z += 1.5) kit.boxMM(emit, [min[0] + 0.03 + e, y + 0.006, z], [max[0] - 0.03 - e, y + 0.016, z + 0.03]);
  }
}

/** Recessed floor access hatch: proud plate with hazard border, bolt heads, two recessed handles. */
export function floorHatch(kit, cx, y, cz, { w = 1.2, d = 0.9 } = {}) {
  kit.boxMM("hazard", [cx - w / 2 - 0.08, y, cz - d / 2 - 0.08], [cx + w / 2 + 0.08, y + 0.006, cz + d / 2 + 0.08], { texel: 3 });
  kit.boxMM("metal", [cx - w / 2, y, cz - d / 2], [cx + w / 2, y + 0.014, cz + d / 2], { color: IMP.mid, texel: 1 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.cyl("metal", cx + sx * (w / 2 - 0.08), y + 0.016, cz + sz * (d / 2 - 0.08), 0.02, 0.006, "y", { color: IMP.steel, segments: 8 });
  for (const sx of [-1, 1]) kit.boxMM("paintedMetal", [cx + sx * 0.25 - 0.08, y + 0.006, cz - 0.05], [cx + sx * 0.25 + 0.08, y + 0.015, cz + 0.05], { color: IMP.black });
}

/**
 * Raised floor block (tier / step) with a steel nosing along the exposed edges, an optional hazard riser stripe
 * and an optional emissive edge-marker strip 5 cm inboard of the nosing (glow = emissive material key).
 */
export function stepBlock(kit, min, max, { edges = ["e"], hazardRiser = false, glow = null, color = IMP.dark, tag = "tier", collide = true } = {}) {
  kit.boxMM("impFloor", min, max, { color, texel: 0.5 });
  const t = 0.035;
  const y1 = max[1];
  for (const e of edges) {
    if (e === "e") kit.boxMM("metal", [max[0] - t, y1, min[2]], [max[0], y1 + 0.006, max[2]], { color: IMP.steel });
    if (e === "w") kit.boxMM("metal", [min[0], y1, min[2]], [min[0] + t, y1 + 0.006, max[2]], { color: IMP.steel });
    if (e === "n") kit.boxMM("metal", [min[0], y1, min[2]], [max[0], y1 + 0.006, min[2] + t], { color: IMP.steel });
    if (e === "s") kit.boxMM("metal", [min[0], y1, max[2] - t], [max[0], y1 + 0.006, max[2]], { color: IMP.steel });
    if (glow) {
      const g0 = 0.06;
      const g1 = 0.08;
      if (e === "e") kit.boxMM(glow, [max[0] - g1, y1, min[2] + 0.1], [max[0] - g0, y1 + 0.008, max[2] - 0.1]);
      if (e === "w") kit.boxMM(glow, [min[0] + g0, y1, min[2] + 0.1], [min[0] + g1, y1 + 0.008, max[2] - 0.1]);
      if (e === "n") kit.boxMM(glow, [min[0] + 0.1, y1, min[2] + g0], [max[0] - 0.1, y1 + 0.008, min[2] + g1]);
      if (e === "s") kit.boxMM(glow, [min[0] + 0.1, y1, max[2] - g1], [max[0] - 0.1, y1 + 0.008, max[2] - g0]);
    }
    if (hazardRiser) {
      const h0 = min[1] + 0.02;
      const h1 = Math.min(max[1] - 0.02, min[1] + 0.1);
      if (e === "e") kit.boxMM("hazard", [max[0], h0, min[2] + 0.05], [max[0] + 0.006, h1, max[2] - 0.05], { texel: 3 });
      if (e === "w") kit.boxMM("hazard", [min[0] - 0.006, h0, min[2] + 0.05], [min[0], h1, max[2] - 0.05], { texel: 3 });
      if (e === "n") kit.boxMM("hazard", [min[0] + 0.05, h0, min[2] - 0.006], [max[0] - 0.05, h1, min[2]], { texel: 3 });
      if (e === "s") kit.boxMM("hazard", [min[0] + 0.05, h0, max[2]], [max[0] - 0.05, h1, max[2] + 0.006], { texel: 3 });
    }
  }
  if (collide) kit.collider([min[0] - 0.02, min[1], min[2] - 0.02], [max[0] + 0.02, max[1], max[2] + 0.02], tag);
}

/** Low rail (0.78 m): steel top tube, flat mid bar, posts with base plates. from/to = [x,z]. */
export function lowRail(kit, from, to, y, { h = 0.78, postEvery = 1.4, collide = true } = {}) {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const len = Math.hypot(dx, dz);
  if (len < 0.05) return;
  const cx = (from[0] + to[0]) / 2;
  const cz = (from[1] + to[1]) / 2;
  const yaw = Math.atan2(dx, dz);
  const q = quatYX(yaw);
  kit.add("metal", new THREE.CylinderGeometry(0.022, 0.022, len, 10), { pos: [cx, y + h, cz], quat: quatYX(yaw, Math.PI / 2), color: IMP.steel, uv: "scale", uvScale: [0.14, len] });
  kit.add("metal", new THREE.BoxGeometry(0.03, 0.05, len), { pos: [cx, y + h * 0.55, cz], quat: q, color: IMP.mid, texel: 2 });
  const n = Math.max(2, Math.round(len / postEvery) + 1);
  for (let i = 0; i < n; i++) {
    const s = (i / (n - 1)) * (len - 0.1) + 0.05;
    const px = from[0] + (dx / len) * s;
    const pz = from[1] + (dz / len) * s;
    kit.add("paintedMetal", new THREE.BoxGeometry(0.05, h, 0.05), { pos: [px, y + h / 2, pz], quat: q, color: IMP.dark, texel: 2 });
    kit.add("metal", new THREE.BoxGeometry(0.12, 0.02, 0.12), { pos: [px, y + 0.01, pz], quat: q, color: IMP.mid, texel: 2 });
  }
  if (collide) {
    kit.collider([Math.min(from[0], to[0]) - 0.05, y, Math.min(from[1], to[1]) - 0.05], [Math.max(from[0], to[0]) + 0.05, y + h + 0.05, Math.max(from[1], to[1]) + 0.05], "rail");
  }
}

/** Alternating black / yellow hazard chevron band built from the hazard texture (thin proud plate). */
export function hazardPlate(kit, min, max) {
  kit.boxMM("hazard", min, max, { texel: 3 });
}

/** A run of indicator LEDs (world, along x or z), for rims and edge panels. */
export function ledRun(kit, from, to, y, { n = 8, size = 0.03, seed = 0, normal = "y" } = {}) {
  const rand = rng(seed + 29);
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const x = from[0] + (to[0] - from[0]) * u;
    const z = from[1] + (to[1] - from[1]) * u;
    const v = rand();
    const mat = v < 0.5 ? "emitBlue" : v < 0.8 ? "emitAmber" : "emitRedImp";
    if (normal === "y") kit.box(mat, x, y, z, size, 0.006, size);
    else if (normal === "x") kit.box(mat, x, y, z, 0.006, size, size);
    else kit.box(mat, x, y, z, size, size, 0.006);
  }
}
