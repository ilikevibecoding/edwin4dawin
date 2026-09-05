// Exterior shell of the Kestrel (the original freighter interior) so it reads as a parked ship on
// the hangar deck: a plated hull around the cabin volume (two layers of offset plates over a darker
// base skin so the seams read, bolt rows, tri-tone livery: cream upper hull / grey-brown lower hull /
// orange cheat line), a raked bow bulkhead with the cockpit nose protruding from it (exterior canopy
// frame outside the interior windshield, brow, chin and nose cap), tapered engine nacelles with intake
// grilles and dim idle glows, a door surround with a hood overhanging the ramp head (soffit lamp), the
// boarding ramp with chevron treads and hydraulic rams, four landing-gear legs (oleo struts with twin
// hydraulic actuators, hoses and torque links) on pads with chocks, umbilical cables to deck sockets
// and a fuel line from the deck reel. The Imperial ground kit staged at the ramp foot (crates,
// bollards, droid) and the warm door-spill light are placed by the hangar builder (hangar.js), which
// owns the deck and the light budget.
// Built in the Kestrel's local frame (aft door at z = 0, bow at -z, cabin floor at y = 0, deck at
// y = -clearance). The kit here is the ship's: kit.light() is not collected by buildShip. Material keys
// are limited to the ones the interior already uses (the shell merges into the ship's meshes).
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { KESTREL } from "../spec.js";
import { decalRect } from "../textures.js";
import { ensureHangarMaterials } from "../textures_hangar.js";
import { tube, hose, hgChocks } from "./hangar_kit.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
// livery
const CREAM = PALETTE.cream;
const CREAM2 = PALETTE.creamDark;
const BROWN = new THREE.Color("#7b7064"); // grey-brown lower hull plates
const BROWN2 = new THREE.Color("#5c544b"); // base skin under them (shows in the seams)
const ORANGE = PALETTE.orange;

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Raised hull plates on an axis-aligned face. `axis` is the face normal ('x'|'y'|'z'), `sign` its
 * direction, `at` the face's coordinate; (u, v) are the in-plane axes (x: u = z, v = y · y: u = x,
 * v = z · z: u = x, v = y). A grid of plates proud of the face by alternating steps, separated by seam
 * gaps that expose the base skin; a second smaller plate on some of them; bolt heads along the plate
 * edges. `color(i, j, r)` picks the plate tint. Returns the plates placed (for decals on top of them).
 */
function plateField(kit, o) {
  const { axis, sign, at, u0, u1, v0, v1, uStep = 2.2, vStep = 1.0, seam = 0.06, steps = [0.06, 0.1], layer2 = 0.3, skip = 0.1, bolts = 0.45, mat = "painted2", mat2 = "painted1", color, rand } = o;
  const P = (u, v, w) => (axis === "x" ? [at + sign * w, v, u] : axis === "y" ? [u, at + sign * w, v] : [u, v, at + sign * w]);
  const S = (su, sv, sw) => (axis === "x" ? [sw, sv, su] : axis === "y" ? [su, sw, sv] : [su, sv, sw]);
  const nu = Math.max(1, Math.round((u1 - u0) / uStep));
  const nv = Math.max(1, Math.round((v1 - v0) / vStep));
  const du = (u1 - u0) / nu;
  const dv = (v1 - v0) / nv;
  const out = [];
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      const r = rand();
      if (r < skip) continue; // recessed cell: the base skin shows
      const step = steps[(i + j) % steps.length];
      const ua = u0 + i * du + seam / 2;
      const ub = u0 + (i + 1) * du - seam / 2;
      const va = v0 + j * dv + seam / 2;
      const vb = v0 + (j + 1) * dv - seam / 2;
      const c = color(i, j, r);
      const size = S(ub - ua, vb - va, step);
      kit.box(mat, ...P((ua + ub) / 2, (va + vb) / 2, step / 2), ...size, { color: c, uv: "world", texel: 0.5 });
      let top = step;
      if (r > 1 - layer2 && ub - ua > 0.9 && vb - va > 0.5) {
        const in2 = 0.22;
        const s2 = S(ub - ua - 2 * in2, vb - va - 2 * in2, 0.05);
        kit.box(mat2, ...P((ua + ub) / 2, (va + vb) / 2, step + 0.025), ...s2, { color: c, uv: "world", texel: 0.5 });
        top = step + 0.05;
      }
      if (bolts) {
        // bolt heads along the long edges (6-sided, dark)
        const n = Math.max(2, Math.round((ub - ua) / bolts));
        for (let k = 0; k < n; k++) {
          const u = ua + ((ub - ua) * (k + 0.5)) / n;
          for (const v of [va + 0.09, vb - 0.09]) kit.cyl("metal", ...P(u, v, step + 0.012), 0.028, 0.024, axis, { color: PALETTE.darkMetal, segments: 6 });
        }
      }
      out.push({ ua, ub, va, vb, top });
    }
  }
  return out;
}

export function buildKestrelShell(kit) {
  ensureHangarMaterials(kit.materials); // hangar_tread / hangar_spillWarm, whichever cell builds first
  const rand = rng(4711);
  const L = KESTREL.local; // x0 -5.5, x1 5.2, z0 -25.5, z1 0.3, h 3.0
  const clr = KESTREL.clearance; // deck is at y = -clr
  const yD = -clr;
  const t = 0.35; // hull skin thickness
  const yB = -0.55; // belly (below the cabin deck slab)
  const yT = L.h + 0.45; // roof
  const x0 = L.x0 - t - 0.6;
  const x1 = L.x1 + t + 0.6;
  const xc = (x0 + x1) / 2;
  const zAft = L.z1 + 0.4;
  // the main body ends at a raked bow bulkhead; the cockpit nose protrudes from it. The interior
  // cockpit (ship.js) is 4.8 m wide from z -16.3 to the windshield at z -21.2 (foot) / -22.0 (head)
  const zBow = -19.6;
  const rake = 1.3; // the bulkhead's top leans this far aft over its height
  const zRoofFwd = zBow + rake - 0.2;
  const zMid = (zBow + zAft) / 2;
  const len = zAft - zBow;
  const yCheat = [1.15, 1.45]; // orange cheat line band
  const livery = (v) => (v < yCheat[0] ? BROWN : CREAM);
  const jitter = (c, r) => c.clone().multiplyScalar(0.94 + 0.1 * r);

  // --- main body base skin: side plates, roof, belly. The skin is the darker tone of each band so the
  //     plate seams read as dark lines
  for (const [xa, xb] of [[x0, x0 + t], [x1 - t, x1]]) {
    kit.boxMM("painted1", [xa, yCheat[0], zBow], [xb, yT, zAft], { color: CREAM2, uv: "world", texel: 0.35 });
    kit.boxMM("paintedMetal", [xa, yB, zBow], [xb, yCheat[0], zAft], { color: BROWN2, uv: "world", texel: 0.5 });
  }
  kit.boxMM("painted1", [x0, yT - t, zRoofFwd], [x1, yT, zAft], { color: CREAM2, uv: "world", texel: 0.35 });
  kit.boxMM("metal", [x0, yB, zBow], [x1, yB + t, zAft], { color: PALETTE.gunmetal, uv: "world", texel: 0.5 });
  // chamfered roof edges and belly chines: the slab reads as a hull, not a container
  for (const s of [-1, 1]) {
    const xe = s < 0 ? x0 : x1;
    kit.box("painted2", xe - s * 0.42, yT - 0.42, (zRoofFwd + zAft) / 2, 1.25, 0.32, zAft - zRoofFwd - 0.3, { color: CREAM2, uv: "world", texel: 0.35, rot: [0, 0, (s * Math.PI) / 4] });
    kit.box("metal", xe - s * 0.36, yB + 0.36, zMid, 1.05, 0.28, len - 0.3, { color: PALETTE.gunmetal, uv: "world", texel: 0.5, rot: [0, 0, (-s * Math.PI) / 4] });
  }
  // --- side plating: two fields per side (below / above the cheat line), the cheat line itself as a
  //     continuous proud strip, and the hull number decal on one upper plate
  for (const s of [-1, 1]) {
    const xf = s < 0 ? x0 : x1;
    plateField(kit, { axis: "x", sign: s, at: xf, u0: zBow + 0.5, u1: zAft - 0.4, v0: yB + 0.12, v1: yCheat[0] - 0.05, uStep: 2.3, vStep: 0.8, steps: [0.06, 0.1], mat: "paintedMetal", mat2: "painted1", color: (i, j, r) => jitter(BROWN, r), rand });
    const upper = plateField(kit, { axis: "x", sign: s, at: xf, u0: zBow + 0.5, u1: zAft - 0.4, v0: yCheat[1] + 0.05, v1: yT - 0.12, uStep: 2.3, vStep: 0.95, steps: [0.08, 0.13], color: (i, j, r) => jitter(CREAM, r), rand });
    kit.boxMM("painted", [Math.min(xf, xf + s * 0.04), yCheat[0], zBow + 0.6], [Math.max(xf, xf + s * 0.04), yCheat[1], zAft - 0.5], { color: ORANGE, uv: "keep" });
    kit.boxMM("painted", [Math.min(xf, xf + s * 0.03), yCheat[1] + 0.02, zBow + 0.6], [Math.max(xf, xf + s * 0.03), yCheat[1] + 0.06, zAft - 0.5], { color: PALETTE.darkMetal, uv: "keep" });
    // hull number: on whichever upper plate sits at z ≈ -6, y ≈ 2.4
    const plate = upper.find((p) => p.ua < -6 && p.ub > -6 && p.va < 2.4 && p.vb > 2.4) || upper[0];
    const g = new THREE.PlaneGeometry(0.85, 0.85);
    g.rotateY(s > 0 ? Math.PI / 2 : -Math.PI / 2);
    kit.add("decal", g, { pos: [xf + s * (plate.top + 0.012), (plate.va + plate.vb) / 2, (plate.ua + plate.ub) / 2], uv: "keep", uvRect: decalRect(2) });
    // greebles along the flank: recessed vent boxes and a conduit run at the top of the lower band
    for (let z = zBow + 2.5; z < zAft - 2; z += 4.6) {
      kit.box("metal", xf + s * 0.1, yB + 0.55, z, 0.2, 0.36, 0.9, { color: PALETTE.darkMetal });
      for (let k = 0; k < 4; k++) kit.box("metal", xf + s * 0.2, yB + 0.43 + k * 0.08, z, 0.02, 0.02, 0.8, { color: PALETTE.steel });
    }
    kit.cyl("metal", xf + s * 0.14, yCheat[0] - 0.14, zMid, 0.05, len - 1.6, "z", { color: PALETTE.steel, segments: 8 });
    for (let z = zBow + 1.2; z < zAft - 1; z += 2.3) kit.box("metal", xf + s * 0.12, yCheat[0] - 0.14, z, 0.16, 0.16, 0.1, { color: PALETTE.darkMetal });
  }
  // --- roof plating (seen from the flight-control booth and the catwalks) and the dorsal spine
  plateField(kit, { axis: "y", sign: 1, at: yT, u0: x0 + 0.55, u1: x1 - 0.55, v0: zRoofFwd + 0.4, v1: zAft - 0.4, uStep: 2.4, vStep: 2.1, steps: [0.05, 0.08], bolts: 0.6, color: (i, j, r) => jitter(CREAM, r), rand });
  kit.boxMM("metal", [-0.8, yT, -18], [0.8, yT + 0.5, -3], { color: PALETTE.gunmetal, uv: "world", texel: 0.5 });
  for (let z = -17; z < -3; z += 2.5) kit.box("metal", 0, yT + 0.5, z, 1.7, 0.08, 0.12, { color: PALETTE.darkMetal }); // spine ribs
  kit.cyl("metal", 0, yT + 1.4, -14, 0.08, 1.8, "y", { color: PALETTE.steel, segments: 8 }); // sensor mast
  kit.box("emitRed", 0, yT + 2.4, -14, 0.12, 0.12, 0.12);
  kit.add("metal", new THREE.SphereGeometry(0.7, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.4), { pos: [1.6, yT + 0.4, -8], color: PALETTE.steel, uv: "world", texel: 1 }); // comms dish
  kit.boxMM("painted", [-0.7, yT + 0.5, -10.5], [0.7, yT + 0.58, -9.0], { color: ORANGE, uv: "keep" }); // hatch stripe

  // --- bow: raked bulkhead (two side pieces and a top piece around the cockpit nose), corner armour
  const rakeA = Math.atan2(rake, yT - yB);
  const raked = (mat, xa, xb, ya, yb, color, thick = 0.4) => {
    const cy = (ya + yb) / 2;
    const cz = zBow + (rake * (cy - yB)) / (yT - yB);
    kit.box(mat, (xa + xb) / 2, cy, cz, xb - xa, (yb - ya) / Math.cos(rakeA), thick, { color, uv: "world", texel: 0.4, rot: [rakeA, 0, 0] });
  };
  const nx = 3.0; // cockpit nose half-width (interior walls are at ±2.56)
  raked("painted1", x0, -nx + 0.05, yB, yT, CREAM2);
  raked("painted1", nx - 0.05, x1, yB, yT, CREAM2);
  raked("painted1", -nx, nx, 3.2, yT, CREAM2);
  raked("paintedMetal", x0, -nx + 0.05, yB + 0.05, yCheat[0], BROWN2, 0.46); // lower band on the bulkhead
  raked("paintedMetal", nx - 0.05, x1, yB + 0.05, yCheat[0], BROWN2, 0.46);
  raked("painted", x0 + 0.3, -nx - 0.2, yCheat[0], yCheat[1], ORANGE, 0.47);
  raked("painted", nx + 0.2, x1 - 0.3, yCheat[0], yCheat[1], ORANGE, 0.47);
  // a few raised plates on the bulkhead's cream band (proud of the raked face)
  for (const [xa, xb] of [[x0 + 0.4, -nx - 0.3], [nx + 0.3, x1 - 0.4]]) {
    raked("painted2", xa, xb, yCheat[1] + 0.15, 2.45, CREAM, 0.56);
    raked("painted2", xa + 0.5, xb - 0.5, 2.6, yT - 0.35, CREAM, 0.56);
  }
  // dark rail along the roof / bulkhead seam and corner armour at the bow and stern corners
  kit.box("metal", xc, yT - 0.06, zBow + rake, x1 - x0, 0.22, 0.3, { color: PALETTE.darkMetal, rot: [rakeA / 2, 0, 0] });
  for (const [x, z, a] of [[x0, zBow + 0.1, Math.PI / 4], [x1, zBow + 0.1, -Math.PI / 4], [x0, zAft - 0.1, -Math.PI / 4], [x1, zAft - 0.1, Math.PI / 4]]) {
    kit.box("metal", x, (yB + yT) / 2, z, 0.5, yT - yB - 0.2, 0.22, { color: PALETTE.darkMetal, uv: "world", texel: 0.5, rot: [0, a, 0] });
  }

  // --- cockpit nose: skins around the interior cockpit, brow over the windshield, exterior canopy
  //     frame outside the interior windshield (its glazing bars line up with the interior struts so
  //     they cost the pilots no view), chin under the ship.js nose hull (y 0.35–0.93) and a nose cap
  const zNose = -22.3; // forward end of the nose skins (the windshield head is at z -22.0)
  const zNoseAft = zBow + 1.7; // tucked under the raked bulkhead
  for (const s of [-1, 1]) {
    kit.boxMM("painted1", [Math.min(s * nx, s * (nx - 0.35)), yB, zNose], [Math.max(s * nx, s * (nx - 0.35)), 3.05, zNoseAft], { color: CREAM2, uv: "world", texel: 0.35 });
    plateField(kit, { axis: "x", sign: s, at: s * nx, u0: zNose + 0.15, u1: zBow - 0.1, v0: yCheat[1] + 0.05, v1: 2.9, uStep: 1.3, vStep: 0.75, steps: [0.06, 0.1], skip: 0, color: (i, j, r) => jitter(CREAM, r), rand });
    plateField(kit, { axis: "x", sign: s, at: s * nx, u0: zNose + 0.15, u1: zBow - 0.1, v0: yB + 0.1, v1: yCheat[0] - 0.05, uStep: 1.3, vStep: 0.85, steps: [0.06, 0.1], skip: 0, mat: "paintedMetal", color: (i, j, r) => jitter(BROWN, r), rand });
    kit.boxMM("painted", [Math.min(s * nx, s * (nx + 0.04)), yCheat[0], zNose + 0.1], [Math.max(s * nx, s * (nx + 0.04)), yCheat[1], zBow], { color: ORANGE, uv: "keep" });
    // nav light housing on the cheek: red port, teal-green starboard
    kit.box("metal", s * (nx + 0.1), 2.3, zNose + 0.5, 0.2, 0.3, 0.5, { color: PALETTE.darkMetal });
    kit.box(s < 0 ? "emitRed" : "emitTeal", s * (nx + 0.21), 2.3, zNose + 0.5, 0.02, 0.12, 0.3);
  }
  kit.boxMM("painted1", [-nx - 0.05, 3.05, zNose + 0.05], [nx + 0.05, 3.25, zNoseAft], { color: CREAM2, uv: "world", texel: 0.35 });
  plateField(kit, { axis: "y", sign: 1, at: 3.25, u0: -nx + 0.3, u1: nx - 0.3, v0: zNose + 0.4, v1: zBow - 0.2, uStep: 1.6, vStep: 1.2, steps: [0.05, 0.08], skip: 0, bolts: 0.5, color: (i, j, r) => jitter(CREAM, r), rand });
  kit.boxMM("metal", [-nx, yB - 0.02, zNose], [nx, yB + 0.3, zNoseAft], { color: PALETTE.gunmetal, uv: "world", texel: 0.5 }); // nose belly
  // brow / visor over the windshield head (its lip stays above the pilots' sight line)
  kit.box("painted1", 0, 3.08, zNose - 0.25, 2 * nx + 0.1, 0.12, 0.7, { color: CREAM2, uv: "world", texel: 0.35, rot: [-0.25, 0, 0] });
  kit.box("metal", 0, 2.99, zNose - 0.58, 2 * nx + 0.14, 0.08, 0.1, { color: PALETTE.darkMetal, rot: [-0.25, 0, 0] });
  // exterior canopy frame: windshield plane origin (y 0.95, z -21.2), V up the slope, N outward
  {
    const O = V(0, 0.95, -21.2);
    const Vd = V(0, 1.8, -0.8);
    const Lw = Vd.length();
    const Vh = Vd.clone().normalize();
    // the pane leans forward as it rises, so its outside normal points forward and down
    const N = V(0, Vh.z, -Vh.y); // (0, -0.406, -0.914)
    const rx = Math.atan2(Vh.z, Vh.y); // -24°: a y-long box rotated by rx runs up the slope
    const at = (u, v, w) => O.clone().addScaledVector(V(1, 0, 0), u).addScaledVector(Vh, v).addScaledVector(N, w);
    const bar = (u, v, w, su, sv, sw, mat = "metal", color = PALETTE.darkMetal) => {
      const p = at(u, v, w);
      kit.box(mat, p.x, p.y, p.z, su, sv, sw, { color, rot: [rx, 0, 0] });
    };
    // perimeter (jambs over the interior side fillers, sill and head rails; the sill sits above the
    // ship.js nose plate at y 0.98)
    for (const s of [-1, 1]) bar(s * 2.62, Lw / 2, 0.22, 0.34, Lw + 0.4, 0.14);
    bar(0, 0.14, 0.22, 5.6, 0.16, 0.14);
    bar(0, Lw + 0.06, 0.22, 5.6, 0.16, 0.14);
    // glazing bars on the interior struts (x ±0.782, and the middle rail)
    const strut = 0.11;
    const pw = (4.8 - strut * 4) / 3;
    for (const c of [1, 2]) bar(-2.4 + strut / 2 + c * (pw + strut), Lw / 2, 0.19, 0.1, Lw - 0.1, 0.08);
    bar(0, Lw / 2, 0.19, 4.8, 0.09, 0.08);
    // sensor blisters on the sill, hazard tag on a jamb
    for (const u of [-1.5, 1.5]) bar(u, 0.2, 0.32, 0.3, 0.08, 0.08, "metal", PALETTE.steel);
    bar(2.62, 0.5, 0.3, 0.2, 0.5, 0.01, "hazard", 0xffffff);
  }
  // chin: solid blocks under the ship.js nose hull (y 0.35–0.93, z -25..-21.25) so nothing shows through
  // from the side, faced with a plate sloping up from the nose belly to the nose cap
  kit.boxMM("paintedMetal", [-nx + 0.05, -0.22, -23.6], [nx - 0.05, 0.4, zNose + 0.05], { color: BROWN2, uv: "world", texel: 0.5 });
  kit.boxMM("paintedMetal", [-nx + 0.05, 0.1, -24.75], [nx - 0.05, 0.4, -23.5], { color: BROWN2, uv: "world", texel: 0.5 });
  kit.box("paintedMetal", 0, -0.08, -23.75, 2 * nx - 0.1, 0.24, 3.0, { color: BROWN, uv: "world", texel: 0.5, rot: [0.262, 0, 0] });
  {
    const cap = new THREE.SphereGeometry(1, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    cap.scale(nx - 0.1, 0.95, 0.3);
    cap.rotateX(-Math.PI / 2);
    kit.add("paintedMetal", cap, { pos: [0, 0.62, -25.0], color: BROWN, uv: "world", texel: 0.6 });
    for (const s of [-1, 1]) kit.box("metal", s * 2.3, 0.62, -24.6, 0.6, 0.2, 1.2, { color: PALETTE.darkMetal });
  }
  kit.collider([x0, yB, zBow - 0.3], [-nx, yT, zBow + rake], "bow");
  kit.collider([nx, yB, zBow - 0.3], [x1, yT, zBow + rake], "bow");
  kit.collider([-nx - 0.1, yB, -25.6], [nx + 0.1, 3.3, zBow], "nose");

  // --- aft face around the door opening (door at x -0.85..0.85, y 0..2.35): base skin + plates
  kit.boxMM("painted1", [x0, yB, zAft - t], [-0.95, yT, zAft], { color: CREAM2, uv: "world", texel: 0.35 });
  kit.boxMM("painted1", [0.95, yB, zAft - t], [x1, yT, zAft], { color: CREAM2, uv: "world", texel: 0.35 });
  kit.boxMM("painted1", [-0.95, 2.45, zAft - t], [0.95, yT, zAft], { color: CREAM2, uv: "world", texel: 0.35 });
  kit.boxMM("painted1", [-0.95, yB, zAft - t], [0.95, 0, zAft], { color: CREAM2, uv: "world", texel: 0.35 });
  for (const [xa, xb] of [[x0 + 0.4, -1.75], [1.75, x1 - 0.4]]) {
    plateField(kit, { axis: "z", sign: 1, at: zAft, u0: xa, u1: xb, v0: yB + 0.1, v1: yCheat[0] - 0.05, uStep: 2.2, vStep: 0.8, steps: [0.05, 0.08], mat: "paintedMetal", color: (i, j, r) => jitter(BROWN, r), rand });
    plateField(kit, { axis: "z", sign: 1, at: zAft, u0: xa, u1: xb, v0: yCheat[1] + 0.05, v1: yT - 0.12, uStep: 2.2, vStep: 0.95, steps: [0.06, 0.1], color: (i, j, r) => jitter(CREAM, r), rand });
    kit.boxMM("painted", [xa, yCheat[0], zAft], [xb, yCheat[1], zAft + 0.04], { color: ORANGE, uv: "keep" });
  }
  // door surround: proud dark jambs and header, threshold sill plate, hazard bands on the jambs
  for (const s of [-1, 1]) {
    kit.box("metal", s * 1.25, 1.15, zAft + 0.12, 0.6, 3.5, 0.24, { color: PALETTE.darkMetal, uv: "world", texel: 0.5 });
    kit.box("hazard", s * 1.25, 0.35, zAft + 0.25, 0.4, 0.5, 0.02, { texel: 3 });
    kit.box("emitAmber", s * 1.25, 2.2, zAft + 0.25, 0.1, 0.4, 0.02);
  }
  kit.box("metal", 0, 2.75, zAft + 0.12, 3.1, 0.6, 0.24, { color: PALETTE.darkMetal, uv: "world", texel: 0.5 });
  kit.box("metal", 0, -0.12, zAft + 0.14, 2.6, 0.24, 0.28, { color: PALETTE.steel, uv: "world", texel: 0.5 });
  // hood: the upper hull carries on 3.6 m over the ramp head (a cantilevered tail with a dark chamfered lip,
  // plated cheek plates either side and a warm soffit lamp) — long enough that its lip and cheeks are in
  // frame from the door camera looking down the ramp, so the ramp view reads as leaving a ship
  const hz1 = zAft + 3.6;
  const hw = 3.2;
  kit.boxMM("painted1", [-hw, yT - 0.45, zAft], [hw, yT, hz1], { color: CREAM2, uv: "world", texel: 0.35 });
  plateField(kit, { axis: "y", sign: 1, at: yT, u0: -hw + 0.2, u1: hw - 0.2, v0: zAft + 0.2, v1: hz1 - 0.5, uStep: 1.5, vStep: 1.4, steps: [0.05, 0.08], skip: 0, color: (i, j, r) => jitter(CREAM, r), rand });
  kit.boxMM("metal", [-hw, yT - 0.55, hz1 - 0.5], [hw, yT - 0.4, hz1], { color: PALETTE.darkMetal, uv: "world", texel: 0.5 });
  kit.box("painted2", 0, yT - 0.22, hz1 - 0.02, hw * 2, 0.3, 0.3, { color: CREAM2, uv: "world", texel: 0.35, rot: [Math.PI / 4, 0, 0] }); // chamfered lip
  kit.boxMM("painted", [-hw + 0.4, yT - 0.35, hz1 - 0.28], [hw - 0.4, yT - 0.05, hz1 - 0.24], { color: ORANGE, uv: "keep" }); // cheat line across the lip
  for (const s of [-1, 1]) {
    const xa = Math.min(s * hw, s * (hw - 0.15));
    const xb = Math.max(s * hw, s * (hw - 0.15));
    kit.boxMM("painted1", [xa, 2.0, zAft], [xb, yT - 0.4, hz1 - 0.2], { color: CREAM2, uv: "world", texel: 0.35 });
    // cheek plating (these are the flat slabs in the ramp view): plates, bolts, a stencil and a service hatch
    plateField(kit, { axis: "x", sign: s, at: s * hw, u0: zAft + 0.1, u1: hz1 - 0.3, v0: 2.1, v1: yT - 0.45, uStep: 1.1, vStep: 0.45, steps: [0.05, 0.08], skip: 0, layer2: 0, bolts: 0.35, color: (i, j, r) => jitter(CREAM, r), rand });
    const g = new THREE.PlaneGeometry(0.7, 0.7);
    g.rotateY(s > 0 ? Math.PI / 2 : -Math.PI / 2);
    kit.add("decal", g, { pos: [s * (hw + 0.1), 2.55, zAft + 2.6], uv: "keep", uvRect: decalRect(7) }); // NO STEP
    kit.boxMM("metal", [Math.min(s * hw, s * (hw - 0.2)), 1.85, zAft], [Math.max(s * hw, s * (hw - 0.2)), 2.05, hz1 - 0.2], { color: PALETTE.darkMetal, uv: "world", texel: 0.5 }); // cheek bottom rail
    kit.box("emitAmber", s * (hw - 0.08), 2.25, hz1 - 0.5, 0.02, 0.1, 0.4);
    kit.box("hazard", s * (hw - 0.09), 2.6, zAft + 0.7, 0.02, 0.5, 0.5, { texel: 3 });
  }
  kit.box("metal", 0, yT - 0.52, zAft + 1.6, 1.9, 0.14, 0.5, { color: PALETTE.darkMetal });
  kit.box("hangar_spillWarm", 0, yT - 0.6, zAft + 1.6, 1.7, 0.02, 0.36, { uv: "keep" });
  for (let i = 0; i < 5; i++) kit.box("metal", -0.68 + i * 0.34, yT - 0.63, zAft + 1.6, 0.02, 0.08, 0.4, { color: PALETTE.darkMetal }); // louvres
  kit.collider([-hw, 1.85, zAft], [-hw + 0.2, yT, hz1], "hoodCheek");
  kit.collider([hw - 0.2, 1.85, zAft], [hw, yT, hz1], "hoodCheek");

  // --- belly detail: keel strake, vent grilles, a retracted-turret dome
  kit.boxMM("paintedMetal", [-0.9, yB - 0.3, zBow + 2], [0.9, yB, zAft - 3], { color: PALETTE.gunmetal, uv: "world", texel: 0.5 });
  for (const z of [-17, -11, -5]) for (const s of [-1, 1]) kit.box("metal", s * 3.6, yB - 0.08, z, 1.6, 0.16, 0.9, { color: PALETTE.steel, uv: "world", texel: 1 });
  kit.add("metal", new THREE.SphereGeometry(0.9, 16, 8, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), { pos: [2.2, yB, -14], color: PALETTE.gunmetal, uv: "world", texel: 1 });

  // --- engine nacelles on the aft quarters (the corridor's z = 0 end is the stern): tapered barrel in
  //     the livery (cream forward section, grey-brown aft), intake cone with a grille and a dim warm
  //     glow behind it, plating rings, dorsal fin, pylons, and the idle-blue nozzle
  for (const s of [-1, 1]) {
    // 0.25 m of daylight between the hull side and the barrel: the nacelle hangs on its pylons instead
    // of merging into the hull (and the side plating stays visible behind it)
    const px = s * (x1 + 1.75);
    const py = 1.2;
    const rBarrel = (z) => (z < -5.5 ? 1.38 + (0.12 * (z + 12.3)) / 6.8 : 1.5); // tapered profile
    // intake: cone from r 0.78 at the mouth to the barrel, dark lip ring, grille bars over a glow disc
    kit.cyl("metal", px, py, -13.0, 0.78, 1.4, "z", { color: PALETTE.darkMetal, segments: 20, r2: 1.38 });
    kit.add("metal", new THREE.RingGeometry(0.62, 0.8, 20), { pos: [px, py, -13.68], color: PALETTE.steel, uv: "keep" });
    kit.add("emitAmberDim", new THREE.CircleGeometry(0.62, 20), { pos: [px, py, -13.5], uv: "keep" });
    for (let k = -2; k <= 2; k++) kit.box("metal", px, py + k * 0.24, -13.64, 1.28, 0.05, 0.06, { color: PALETTE.darkMetal });
    kit.box("metal", px, py, -13.64, 0.06, 1.28, 0.06, { color: PALETTE.darkMetal });
    // barrel: cream, widening aft (the deck camera sees its underside, which only the environment and
    // the deck work light reach — the grey-brown of the hull's lower band went black there), a
    // grey-brown aft collar and the orange ring at the join
    kit.cyl("painted2", px, py, -8.9, 1.38, 6.8, "z", { color: CREAM, segments: 24, texel: 0.5, r2: 1.5 });
    kit.cyl("painted2", px, py, -3.4, 1.5, 4.2, "z", { color: CREAM, segments: 24, texel: 0.5, r2: 1.5 });
    kit.cyl("paintedMetal", px, py, -1.7, 1.53, 0.8, "z", { color: BROWN, segments: 24, texel: 0.5 });
    kit.cyl("painted", px, py, -5.5, 1.53, 0.3, "z", { color: ORANGE, segments: 24 });
    for (const z of [-11.6, -7.6, -5.0, -2.5]) kit.cyl("metal", px, py, z, rBarrel(z) + 0.05, 0.1, "z", { color: PALETTE.darkMetal, segments: 24 }); // plating rings
    // nozzle: open dark cone (outer skin, inside-out liner) with the dim idle glow at its throat. The
    // old closed cylinder's end cap faced the deck camera as a black disc and hid the glow behind it
    kit.cyl("metal", px, py, -0.6, 1.5, 1.9, "z", { color: PALETTE.darkMetal, segments: 24, r2: 1.2, open: true });
    {
      const liner = new THREE.CylinderGeometry(1.14, 0.72, 1.75, 24, 1, true); // top (+z after the rotate) is the lip
      liner.scale(-1, 1, 1); // mirrored: reversed winding, so the inside faces render …
      const n = liner.attributes.normal;
      for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i)); // … and are lit as inside faces
      liner.rotateX(Math.PI / 2);
      // heat-blackened liner in the non-metal rubber set: the metal ones (polished, then "matte" paintedMetal)
      // both threw the deck work light back as a white sheen off the inside of the cone
      kit.add("rubber", liner, { pos: [px, py, -0.53], color: PALETTE.gunmetal, uv: "scale", uvScale: [6, 2] });
      // dark bulkhead closing the throat: without it the barrel's flat cream end cap (z -1.3) shows through the
      // liner's narrow end and the deck work light turns it into a white blob; the glow sits just in front
      kit.add("rubber", new THREE.CircleGeometry(1.1, 24), { pos: [px, py, -1.27], color: PALETTE.gunmetal, uv: "keep" });
      kit.add("hangar_blueDim", new THREE.CircleGeometry(0.42, 24), { pos: [px, py, -1.22], uv: "keep" }); // idle throat glow (40 % blueDim)
      kit.add("metal", new THREE.RingGeometry(1.14, 1.3, 24), { pos: [px, py, 0.36], color: PALETTE.darkMetal, uv: "keep" }); // lip
    }
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      kit.box("metal", px + Math.cos(a) * 1.3, py + Math.sin(a) * 1.3, 0.05, 0.12, 0.3, 0.6, { color: PALETTE.gunmetal, rot: [0, 0, a] }); // nozzle petals
    }
    // dorsal fin and outboard strake, access hatch with hazard tag, conduit along the top
    kit.box("painted1", px, py + 1.65, -7, 0.08, 0.5, 5.5, { color: CREAM2, uv: "world", texel: 0.5 });
    kit.box("painted", px, py + 1.93, -7, 0.1, 0.06, 5.3, { color: ORANGE, uv: "keep" });
    kit.box("metal", px + s * 1.55, py, -4.5, 0.3, 0.12, 4.5, { color: PALETTE.darkMetal, uv: "world", texel: 1 });
    kit.box("metal", px + s * 1.5, py + 0.5, -10.0, 0.14, 0.7, 1.1, { color: PALETTE.darkMetal });
    kit.box("hazard", px + s * 1.58, py + 0.5, -10.0, 0.02, 0.3, 0.9, { texel: 3 });
    kit.cyl("metal", px - s * 0.5, py + 1.5, -6.5, 0.06, 9, "z", { color: PALETTE.steel, segments: 8 });
    for (let z = -10.5; z < -2.5; z += 2) kit.box("metal", px - s * 0.5, py + 1.5, z, 0.2, 0.2, 0.1, { color: PALETTE.darkMetal });
    // pylons to the body (main + forward strut) with the fuel/power lines between them
    const xi = s * x1;
    kit.boxMM("painted1", [Math.min(px, xi), 0.6, -9], [Math.max(px, xi), 1.8, -3], { color: CREAM2, uv: "world", texel: 0.5 });
    kit.boxMM("painted", [Math.min(px, xi), 1.15, -8.9], [Math.max(px, xi), 1.45, -3.1], { color: ORANGE, uv: "keep" });
    kit.boxMM("metal", [Math.min(px, xi), 0.9, -11.6], [Math.max(px, xi), 1.5, -11.0], { color: PALETTE.darkMetal, uv: "world", texel: 0.5 });
    for (const y of [0.75, 1.65]) kit.cyl("metal", (px + xi) / 2, y, -6, 0.05, Math.abs(px - xi), "x", { color: PALETTE.steel, segments: 8 });
    kit.collider([px - 1.6, -clr, -13.8], [px + 1.6, 2.9, 0.4], "enginePod");
  }

  // --- landing gear: four legs (oleo strut in a housing, twin hydraulic actuators, drag brace, torque
  //     link, hoses) on wide pads, chocked
  for (const [sx, sz] of [[x0 + 1.6, -17], [x1 - 1.6, -17], [x0 + 1.6, -3.5], [x1 - 1.6, -3.5]]) {
    const s = sx < 0 ? -1 : 1;
    kit.box("paintedMetal", sx, yB - 0.3, sz, 1.1, 0.6, 1.2, { color: PALETTE.gunmetal, uv: "world", texel: 1 }); // housing
    kit.box("hazard", sx, yB - 0.3, sz, 1.12, 0.14, 1.22, { texel: 3 });
    const yTop = yB - 0.6;
    const yCol = yD + 0.75;
    kit.cyl("metal", sx, (yTop + yD + 0.5) / 2, sz, 0.2, yTop - (yD + 0.5), "y", { color: PALETTE.steel, segments: 12 }); // strut
    kit.cyl("metal", sx, yCol, sz, 0.28, 0.5, "y", { color: PALETTE.darkMetal, segments: 12 }); // oleo collar
    kit.cyl("metal", sx, yTop - 0.25, sz, 0.26, 0.5, "y", { color: PALETTE.gunmetal, segments: 12 }); // upper gland
    kit.box("hazard", sx, yTop - 0.55, sz, 0.42, 0.1, 0.42, { texel: 3 });
    // twin actuators fore / aft of the strut: cylinder body from the housing, piston into the collar
    for (const d of [-1, 1]) {
      const top = V(sx, yTop - 0.1, sz + d * 0.42);
      const foot = V(sx, yCol + 0.2, sz + d * 0.3);
      const mid = top.clone().lerp(foot, 0.5);
      tube(kit, "metal", top, mid, 0.075, { color: PALETTE.darkMetal, segments: 10 });
      tube(kit, "metal", mid, foot, 0.04, { color: PALETTE.steel, segments: 8 });
      kit.box("metal", top.x, top.y, top.z, 0.22, 0.16, 0.2, { color: PALETTE.gunmetal });
    }
    tube(kit, "metal", V(sx, yD + 0.55, sz), V(sx - s * 0.05, yB - 0.2, sz + 1.5), 0.07, { color: PALETTE.steel, segments: 8 }); // drag brace
    kit.box("metal", sx, yB - 0.3, sz + 1.5, 0.3, 0.3, 0.4, { color: PALETTE.gunmetal });
    // torque links (scissor) outboard, hydraulic hoses looping from the housing to the collar
    tube(kit, "metal", V(sx + s * 0.25, yCol + 0.15, sz), V(sx + s * 0.42, (yCol + yTop) / 2, sz), 0.04, { color: PALETTE.darkMetal, segments: 8 });
    tube(kit, "metal", V(sx + s * 0.42, (yCol + yTop) / 2, sz), V(sx + s * 0.25, yTop - 0.15, sz), 0.04, { color: PALETTE.darkMetal, segments: 8 });
    kit.box("metal", sx + s * 0.42, (yCol + yTop) / 2, sz, 0.12, 0.12, 0.2, { color: PALETTE.steel });
    hose(kit, "rubber", V(sx - s * 0.3, yTop - 0.05, sz - 0.3), V(sx - s * 0.2, yCol + 0.25, sz - 0.2), 0.25, 0.028, 5, { color: PALETTE.rubber });
    hose(kit, "rubber", V(sx - s * 0.35, yTop - 0.05, sz + 0.15), V(sx - s * 0.22, yCol + 0.2, sz + 0.1), 0.2, 0.022, 5, { color: PALETTE.rubber });
    kit.box("metal", sx, yD + 0.36, sz, 0.9, 0.2, 0.9, { color: PALETTE.gunmetal }); // pad ball housing
    kit.box("metal", sx, yD + 0.13, sz, 2.0, 0.26, 1.5, { color: PALETTE.darkMetal, uv: "world", texel: 1 }); // pad
    kit.box("hazard", sx, yD + 0.13, sz, 2.02, 0.12, 1.52, { texel: 3 });
    for (const dx of [-0.8, 0.8]) for (const dz of [-0.55, 0.55]) kit.cyl("metal", sx + dx, yD + 0.27, sz + dz, 0.05, 0.03, "y", { color: PALETTE.steel, segments: 6 }); // pad bolts
    hgChocks(kit, sx, sz, 0, 1.0, yD);
    kit.collider([sx - 1.0, yD, sz - 0.75], [sx + 1.0, yD + 0.4, sz + 0.75], "gearPad");
    kit.collider([sx - 0.45, yD + 0.4, sz - 0.5], [sx + 0.45, 0, sz + 0.5], "strut");
  }

  // --- boarding ramp from the aft threshold (y 0, z 0.3) down to the deck (y -clr, z 0.3 + length)
  const rl = KESTREL.ramp.length;
  const rw = KESTREL.ramp.width;
  const rz0 = zAft;
  const rz1 = zAft + rl;
  const ang = Math.atan2(clr, rl);
  const slant = Math.hypot(clr, rl);
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), ang);
  const rampMid = [0, -clr / 2 - 0.07, (rz0 + rz1) / 2];
  // dark slab with #c8781e-on-#1a1a1a chevron treads (≈ 40 % coverage), black edge trims underneath
  kit.add("hangar_tread", new THREE.BoxGeometry(rw, 0.14, slant), { pos: rampMid, quat: q, color: 0xffffff, uv: "world", texel: 1.6 });
  kit.add("metal", new THREE.BoxGeometry(rw + 0.16, 0.1, slant), { pos: [0, rampMid[1] - 0.05, rampMid[2]], quat: q, color: PALETTE.darkMetal, uv: "world", texel: 1 });
  for (const s of [-1, 1]) {
    // side rails: rail tube + posts, with a dim amber landing-light strip along the kick plate
    const px = s * (rw / 2 + 0.05);
    const rail = new THREE.CylinderGeometry(0.025, 0.025, slant, 8).rotateX(Math.PI / 2);
    kit.add("metal", rail, { pos: [px, -clr / 2 + 0.95, (rz0 + rz1) / 2], quat: q, color: PALETTE.steel, uv: "scale", uvScale: [0.2, 7] });
    kit.add("metal", new THREE.BoxGeometry(0.06, 0.16, slant - 0.2), { pos: [px, -clr / 2 + 0.06, (rz0 + rz1) / 2], quat: q, color: PALETTE.darkMetal, uv: "world", texel: 1 });
    kit.add("emitAmberDim", new THREE.BoxGeometry(0.02, 0.04, slant - 0.6), { pos: [px + s * 0.035, -clr / 2 + 0.1, (rz0 + rz1) / 2], quat: q, uv: "keep" });
    for (let i = 0; i <= 3; i++) {
      const k = i / 3;
      kit.cyl("metal", px, -clr * k + 0.5, rz0 + rl * k, 0.02, 1.0, "y", { color: PALETTE.gunmetal, segments: 8 });
    }
    kit.collider([px - 0.05, -clr, rz0], [px + 0.05, 1.2, rz1], "ramprail");
    // hinge brackets at the ramp head and the hydraulic ram: cylinder from a belly hardpoint, piston to the ramp
    kit.box("metal", s * (rw / 2 + 0.25), -0.08, rz0 + 0.1, 0.3, 0.36, 0.5, { color: PALETTE.darkMetal });
    const hard = V(s * 1.15, yB - 0.1, rz0 + 0.3);
    const foot = V(s * 0.75, -clr * 0.5 - 0.22, rz0 + rl * 0.5);
    const mid = hard.clone().lerp(foot, 0.55);
    tube(kit, "metal", hard, mid, 0.11, { color: PALETTE.darkMetal, segments: 10 });
    tube(kit, "metal", mid, foot, 0.06, { color: PALETTE.steel, segments: 8 });
    kit.box("metal", s * 1.15, yB - 0.15, rz0 + 0.3, 0.4, 0.3, 0.5, { color: PALETTE.gunmetal });
    // upper rams outside the rails: from a jamb hardpoint down to an outrigger bracket at the ramp's
    // mid-length (these are the ones in frame from the door camera)
    const uHard = V(s * 1.62, 1.45, rz0 + 0.35);
    const uFoot = V(s * (rw / 2 + 0.32), -clr * 0.45 - 0.05, rz0 + rl * 0.45);
    const uMid = uHard.clone().lerp(uFoot, 0.5);
    kit.box("metal", uHard.x, uHard.y, uHard.z - 0.05, 0.34, 0.5, 0.4, { color: PALETTE.gunmetal });
    tube(kit, "metal", uHard, uMid, 0.1, { color: PALETTE.darkMetal, segments: 10 });
    tube(kit, "metal", uMid, uFoot, 0.055, { color: PALETTE.steel, segments: 8 });
    kit.box("metal", uFoot.x, uFoot.y - 0.02, uFoot.z, 0.28, 0.2, 0.36, { color: PALETTE.darkMetal });
    kit.box("hazard", uFoot.x + s * 0.145, uFoot.y - 0.02, uFoot.z, 0.01, 0.18, 0.34, { texel: 3 });
  }
  // deck foot plate where the ramp lands, and its two amber deck lamps
  kit.box("metal", 0, yD + 0.03, rz1 + 0.15, rw + 0.4, 0.06, 0.7, { color: PALETTE.darkMetal, uv: "world", texel: 1 });
  for (const s of [-1, 1]) kit.box("emitAmber", s * (rw / 2 + 0.35), yD + 0.05, rz1 + 0.3, 0.16, 0.04, 0.16);
  kit.ramp(-rw / 2, rz0, rw / 2, rz1, "z", rz0, rz1, 0, -clr, "kestrel-ramp");
  // --- deck-side services: fuel reel with the line up to the port fuel receptacle, two power umbilicals
  //     from belly sockets to deck junction boxes, a maintenance cart on the starboard side
  const reel = V(x1 + 1.2, yD + 0.45, -16);
  kit.cyl("metal", reel.x, reel.y, reel.z, 0.45, 0.4, "x", { color: PALETTE.darkMetal, segments: 16 });
  kit.box("metal", reel.x, yD + 0.2, reel.z, 0.5, 0.4, 1.1, { color: PALETTE.gunmetal });
  kit.box("hazard", reel.x, yD + 0.24, reel.z, 0.52, 0.12, 1.12, { texel: 3 });
  kit.collider([x1 + 0.6, yD, -16.6], [x1 + 1.8, yD + 1, -15.4], "reel");
  kit.cyl("metal", x1 + 0.12, 0.35, -14.2, 0.2, 0.2, "x", { color: PALETTE.darkMetal, segments: 12 }); // fuel receptacle ring (proud of the plates)
  kit.box("hazard", x1 + 0.17, 0.35, -14.2, 0.02, 0.7, 0.7, { texel: 3 });
  hose(kit, "rubber", V(reel.x - 0.4, reel.y + 0.1, reel.z), V(x1 + 0.9, yD + 0.08, -15.0), 0.1, 0.06, 4, { color: PALETTE.rubber });
  hose(kit, "rubber", V(x1 + 0.9, yD + 0.08, -15.0), V(x1 + 0.3, 0.35, -14.2), -0.25, 0.06, 6, { color: PALETTE.rubber });
  const socket = (sx, sz) => {
    kit.box("metal", sx, yD + 0.22, sz, 0.6, 0.44, 0.5, { color: PALETTE.gunmetal, uv: "world", texel: 1 });
    kit.box("hazard", sx, yD + 0.24, sz, 0.62, 0.1, 0.52, { texel: 3 });
    kit.box("emitAmber", sx, yD + 0.36, sz + 0.26, 0.2, 0.05, 0.01);
    kit.collider([sx - 0.3, yD, sz - 0.25], [sx + 0.3, yD + 0.45, sz + 0.25], "socket");
  };
  for (const [bx, bz, dx, dz] of [
    [-2.8, -7.5, x0 - 1.4, -6.2],
    [3.2, -12.5, x1 + 1.6, -11.0],
  ]) {
    kit.cyl("metal", bx, yB - 0.12, bz, 0.16, 0.24, "y", { color: PALETTE.darkMetal, segments: 10 }); // belly socket
    socket(dx, dz);
    hose(kit, "rubber", V(bx, yB - 0.24, bz), V(dx, yD + 0.44, dz), 0.35, 0.05, 7, { color: PALETTE.rubber });
  }
  kit.box("painted", x0 - 1.6, yD + 0.45, -8.5, 1.0, 0.9, 1.6, { color: ORANGE, uv: "keep" });
  kit.box("metal", x0 - 1.6, yD + 0.95, -8.5, 1.0, 0.1, 1.6, { color: PALETTE.steel });
  for (const [dx, dz] of [[-0.4, -0.65], [0.4, -0.65], [-0.4, 0.65], [0.4, 0.65]]) kit.cyl("rubber", x0 - 1.6 + dx, yD + 0.12, -8.5 + dz, 0.12, 0.08, "x", { color: PALETTE.rubber, segments: 10 });
  kit.collider([x0 - 2.2, yD, -9.4], [x0 - 1.0, yD + 1.1, -7.6], "cart");
}
