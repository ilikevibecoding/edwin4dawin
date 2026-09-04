// Shuttle Docking Bay — a 98 m hall aft of the main hangar with a 28 × 50 m well down to the belly. A
// Lambda-class-style shuttle (original procedural geometry: angular lofted fuselage, windowed cockpit,
// tall dorsal fin, two wings folded up, skids, boarding ramp, engine glow) sits on a raised landing
// platform on the port side; fuel pumps on the forward wall feed hoses to the platform, a control kiosk
// watches the well, pallets and containers line the starboard and aft walls, and dashed amber approach
// lights ring the well mouth. The blast door to the hangar is carved by the shell (2 m throat lined here).
import * as THREE from "three";
import { Kit, prism } from "../../core/kit.js";
import { Placer, stairs, railing, barrel, pipeRun, cableBundle } from "../../core/props.js";
import { hazardBay, floorDecal, floorLine, floorRect, strip, workLight, screenPanel, frameScreen, ledCluster, placeCrate, placeContainer, containerProtos, gantryCrane, machineBlock, valveStack, louvreVent, terminalKiosk, doorThroat, fixDoorSides, wallU, setLightLevel } from "../engineering/machinery.js";
import { DECAL, ledRect } from "../../textures.js";

export const meta = { id: "shuttle_bay", stream: "deck-rooms" };

// ---------------------------------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------------------------------
/** Flat-shaded loft between two equal-length convex polygons (local XY, CCW seen from +Z) at za < zb. */
function loft(a, b, za, zb, { capA = true, capB = true } = {}) {
  const n = a.length;
  const v = [];
  const push = (p, z) => v.push(p[0], p[1], z);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    push(a[i], za), push(a[j], za), push(b[j], zb);
    push(a[i], za), push(b[j], zb), push(b[i], zb);
  }
  if (capA) for (let i = 1; i < n - 1; i++) push(a[0], za), push(a[i + 1], za), push(a[i], za);
  if (capB) for (let i = 1; i < n - 1; i++) push(b[0], zb), push(b[i], zb), push(b[i + 1], zb);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
}

/** Irregular octagon (w × h) centred at (0, cy): chamfered bottom and top corners, vertical flanks. */
function oct(w, h, cy) {
  return [
    [-w / 2, cy - h * 0.25],
    [-w / 2 + w * 0.2, cy - h / 2],
    [w / 2 - w * 0.2, cy - h / 2],
    [w / 2, cy - h * 0.25],
    [w / 2, cy + h * 0.25],
    [w / 2 - w * 0.22, cy + h / 2],
    [-w / 2 + w * 0.22, cy + h / 2],
    [-w / 2, cy + h * 0.25],
  ];
}

const lerpPoly = (a, b, t) => a.map(([x, y], i) => [x + (b[i][0] - x) * t, y + (b[i][1] - y) * t]);
function scalePoly(pts, k) {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return pts.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);
}

// ---------------------------------------------------------------------------------------------------
// The shuttle
// ---------------------------------------------------------------------------------------------------
const SH = { zNose: -9.7, zRear: 8.5, hinge: [2.35, 4.6], wingTilt: 0.24 };

/**
 * Lambda-class-style shuttle, nose toward local −Z, resting on its skids at local y 0. ~19 m long,
 * 16 m tall with the wings folded up. Returns the world position of the engine bank for the glow light.
 */
function lambdaShuttle(ctx, pos, yaw) {
  const { kit, IMP } = ctx;
  const P = new Placer(kit, pos, yaw);
  const HULL = IMP.hullLight;
  const DARK = IMP.hullDark;
  const HM = "plate"; // clean light plating (the exterior hull texture is scaled for 40 m plates)
  const DM = "paintedMetal";
  const put = (mat, geo, opts = {}) => P.add(mat, geo, 0, 0, 0, { uv: "world", texel: 0.5, ...opts });
  /** Box between two local points (w across, h thick). */
  const strut = (mat, a, b, w, opts = {}) => {
    const A = new THREE.Vector3(...a);
    const B = new THREE.Vector3(...b);
    const d = B.clone().sub(A);
    const L = d.length();
    const { h = w, ...rest } = opts;
    const g = new THREE.BoxGeometry(w, h, L);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d.normalize()));
    const m = A.add(B).multiplyScalar(0.5);
    g.translate(m.x, m.y, m.z);
    return put(mat, g, rest);
  };

  // ---- fuselage: main body, tapering nose hull, glazed cockpit, sensor tip
  const A = oct(4.4, 3.6, 3.5); // body section (bottom 1.7, top 5.3)
  const B = oct(3.4, 2.9, 3.65); // nose hull end
  const Cc = oct(2.2, 1.7, 3.85); // cockpit front
  const T = oct(0.9, 0.6, 3.75); // sensor nose
  put(HM, loft(A, A, -2.5, SH.zRear), { color: HULL });
  put(HM, loft(B, A, -6.5, -2.5), { color: HULL });
  put("darkGloss", loft(Cc, B, -8.8, -6.5), { color: IMP.plateBlue });
  put(DM, loft(T, Cc, SH.zNose, -8.8), { color: DARK });
  // cockpit framing: rings at both ends + mid mullion ring + edge struts over the glazing
  put(DM, loft(scalePoly(B, 1.03), scalePoly(B, 1.03), -6.62, -6.38), { color: DARK });
  put(DM, loft(scalePoly(Cc, 1.06), scalePoly(Cc, 1.06), -8.92, -8.68), { color: DARK });
  const M = scalePoly(lerpPoly(Cc, B, 0.5), 1.02);
  put(DM, loft(M, M, -7.72, -7.58), { color: DARK });
  for (let i = 0; i < 8; i++) strut(DM, [B[i][0], B[i][1], -6.5], [Cc[i][0], Cc[i][1], -8.8], 0.1, { color: DARK });
  // body seams + emblems on the vertical flanks, ventral keel, dorsal fairing, sensor hump, shoulder intakes
  for (const s of [-1, 1]) {
    P.box("paintedMetal", s * 2.21, 3.5, 3.0, 0.03, 0.05, 10.6, { color: IMP.trim });
    for (const z of [-1.4, 0.8, 3.0, 5.2, 7.4]) P.box("paintedMetal", s * 2.21, 3.5, z, 0.03, 1.7, 0.05, { color: IMP.trim });
    P.decal(s * 2.23, 3.5, 6.2, 1.3, 1.3, DECAL.EMBLEM, { rot: [0, (s * Math.PI) / 2, 0] });
    P.decal(s * 2.23, 3.55, -0.2, 0.9, 0.9, DECAL.NUMBER2, { rot: [0, (s * Math.PI) / 2, 0] });
    P.box(DM, s * 1.95, 4.95, 1.2, 0.9, 0.5, 3.2, { color: DARK, uv: "world", texel: 0.5 });
    P.box("paintedMetal", s * 1.95, 4.95, -0.42, 0.7, 0.34, 0.06, { color: IMP.black });
  }
  P.box(DM, 0, 1.72, 3.0, 1.8, 0.3, 9.6, { color: DARK, uv: "world", texel: 0.5 });
  P.box(DM, 0, 5.4, 3.5, 1.1, 0.5, 9.2, { color: DARK, uv: "world", texel: 0.5 });
  P.box(HM, 0, 5.32, -2.6, 1.6, 0.4, 2.2, { color: HULL, uv: "world", texel: 0.5 });
  P.cyl("paintedMetal", 0.5, 5.6, -2.3, 0.22, 0.3, "y", { color: IMP.black, segments: 12 });
  P.add("metal", new THREE.SphereGeometry(0.2, 10, 6), -0.5, 5.55, -2.4, { color: IMP.steelDark, uv: "scale", uvScale: [1, 1] });
  P.box("emitWhite", 0, 2.14, -6.2, 0.5, 0.05, 0.4, { uv: "keep" });
  for (const s of [-1, 1]) strut("metal", [s * 0.6, 2.35, -5.6], [s * 0.9, 1.6, -5.9], 0.03, { color: IMP.steelDark });

  // ---- rear: engine block with three flared nozzles and glow discs, hatch panel
  P.box(DM, 0, 3.5, SH.zRear + 0.25, 4.0, 3.0, 0.5, { color: DARK, uv: "world", texel: 0.5 });
  P.box("paintedMetal", 0, 2.1, SH.zRear + 0.52, 1.6, 0.9, 0.04, { color: IMP.black });
  for (const [ex, ey] of [[-1.3, 3.2], [0, 3.95], [1.3, 3.2]]) {
    P.cyl("metal", ex, ey, SH.zRear + 0.85, 0.5, 0.7, "z", { r2: 0.62, color: IMP.gunmetal, segments: 16 });
    P.cyl("paintedMetal", ex, ey, SH.zRear + 1.1, 0.56, 0.12, "z", { color: IMP.black, segments: 16 });
    P.cyl("engineGlow", ex, ey, SH.zRear + 1.05, 0.44, 0.06, "z", { segments: 16, uv: "keep" });
  }
  P.decal(0, 4.7, SH.zRear + 0.51, 0.7, 0.7, DECAL.WARNING);

  // ---- dorsal fin: raked trapezoid with dark edge caps, inset panels, mast + beacon
  const FIN = [[-1.0, 5.1], [8.0, 5.1], [7.6, 16.0], [3.8, 16.0]];
  const finGeo = (pts, t) => prism(pts, t).rotateY(-Math.PI / 2);
  put(HM, finGeo(FIN, 0.4), { color: HULL });
  for (const s of [-1, 1]) put(DM, finGeo(scalePoly(FIN, 0.72), 0.02).translate(s * 0.21, 0, 0), { color: DARK });
  strut(DM, [0, 5.1, -1.0], [0, 16.0, 3.8], 0.46, { h: 0.5, color: DARK });
  strut(DM, [0, 5.1, 8.0], [0, 16.0, 7.6], 0.44, { h: 0.3, color: DARK });
  P.box(DM, 0, 16.0, 5.7, 0.44, 0.25, 3.9, { color: DARK });
  for (const fy of [8.0, 11.0, 14.0]) {
    const le = -1.0 + 4.8 * ((fy - 5.1) / 10.9);
    const te = 8.0 - 0.4 * ((fy - 5.1) / 10.9);
    for (const q of [-1, 1]) P.box(DM, q * 0.21, fy, (le + te) / 2, 0.02, 0.05, te - le - 1.0, { color: IMP.trim });
  }
  P.cyl("metal", 0, 16.9, 6.0, 0.03, 1.8, "y", { color: IMP.steel, segments: 6 });
  P.box("emitRed", 0, 17.86, 6.0, 0.14, 0.14, 0.14, { uv: "keep" });

  // ---- wings folded up (tilted outward by wingTilt), hinge drums, brackets, actuators
  const WING = [[-1.5, 0], [7.5, 0], [6.8, 11.5], [3.6, 11.5]];
  const [hx, hy] = SH.hinge;
  for (const s of [-1, 1]) {
    const alpha = -s * SH.wingTilt;
    const W = (g) => g.rotateY(-Math.PI / 2).rotateZ(alpha).translate(s * hx, hy, 0);
    put(HM, W(prism(WING, 0.35)), { color: HULL });
    for (const q of [-1, 1]) put(DM, W(prism(scalePoly(WING, 0.78), 0.02).translate(0, 0, q * 0.185)), { color: DARK });
    // edge caps (leading, trailing, tip) as boxes laid along the outline in the wing plane
    const edge = (a, b, w, h, color) => {
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const g = new THREE.BoxGeometry(L, h, w).rotateZ(Math.atan2(b[1] - a[1], b[0] - a[0])).translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0);
      put(color === DARK ? DM : HM, W(g), { color });
    };
    edge(WING[0], WING[3], 0.42, 0.5, DARK);
    edge(WING[1], WING[2], 0.42, 0.3, DARK);
    edge(WING[3], WING[2], 0.42, 0.25, DARK);
    edge([3.0, 0.6], [5.2, 10.8], 0.38, 0.16, IMP.hullMid);
    // chord-wise panel seams on both faces
    for (const sp of [2.6, 5.4, 8.2, 10.2]) {
      const le = -1.5 + 5.1 * (sp / 11.5);
      const te = 7.5 - 0.7 * (sp / 11.5);
      for (const q of [-1, 1]) put(DM, W(new THREE.BoxGeometry(te - le - 0.9, 0.05, 0.02).translate((le + te) / 2, sp, q * 0.19)), { color: IMP.trim });
    }
    put("emitWhite", W(new THREE.BoxGeometry(0.3, 0.12, 0.44).translate(5.2, 11.3, 0)), { uv: "keep" });
    // hinge drum + brackets + actuator ram from the hull shoulder to the wing
    P.cyl("metal", s * hx, hy, 3.0, 0.3, 9.2, "z", { color: IMP.gunmetal, segments: 14 });
    for (const z of [-1.0, 3.0, 7.0]) P.box(DM, s * (hx - 0.1), hy, z, 0.9, 0.9, 0.5, { color: DARK, uv: "world", texel: 0.5 });
    strut("metal", [s * 2.1, 3.3, 4.2], [s * (hx + 1.6 * Math.sin(SH.wingTilt)), hy + 1.6 * Math.cos(SH.wingTilt), 4.2], 0.12, { color: IMP.steel });
    strut("metal", [s * 2.1, 3.3, 1.0], [s * (hx + 1.6 * Math.sin(SH.wingTilt)), hy + 1.6 * Math.cos(SH.wingTilt), 1.0], 0.12, { color: IMP.steel });
  }

  // ---- landing skids (two aft, one forward) and the lowered boarding ramp
  const skid = (x, z, top) => {
    P.cyl("metal", x, (0.3 + top) / 2, z, 0.16, top - 0.3, "y", { color: IMP.steelDark, segments: 10 });
    P.box("paintedMetal", x, 0.55, z, 0.5, 0.36, 0.7, { color: IMP.gunmetal, texel: 1 });
    P.box("paintedMetal", x, 0.15, z, 1.1, 0.3, 2.4, { color: IMP.black, texel: 1 });
    P.box("paintedMetal", x, 0.32, z, 0.6, 0.06, 2.0, { color: IMP.hazardYellow, texel: 1 });
    strut("metal", [x, 0.5, z + 1.0], [x * 0.6, top - 0.05, z + 2.0], 0.08, { color: IMP.steel });
  };
  skid(-1.6, 5.0, 1.75);
  skid(1.6, 5.0, 1.75);
  skid(0, -5.0, 2.05);
  strut(HM, [0, 1.62, -1.0], [0, 0.08, -5.6], 2.0, { h: 0.14, color: HULL });
  for (const s of [-1, 1]) strut("hazard", [s * 0.92, 1.71, -1.0], [s * 0.92, 0.17, -5.6], 0.12, { h: 0.02, texel: 2 });
  P.box("paintedMetal", 0, 1.74, -1.7, 2.14, 0.3, 1.5, { color: IMP.black, texel: 1 });
  P.box("emitAmber", 0, 1.6, -1.1, 1.7, 0.02, 0.06, { uv: "keep" });
  P.box("emitAmber", 0, 1.6, -2.35, 1.7, 0.02, 0.06, { uv: "keep" });

  P.collider([-2.4, 0, SH.zNose], [2.4, 5.6, SH.zRear + 1.2], "shuttle");
  P.collider([-1.1, 0, -5.8], [1.1, 1.7, -1.0], "ramp");
  return { engines: P.world(0, 3.6, SH.zRear + 2.6), ramp: P.world(0, 0, -5.6), socket: P.world(-1.6, 1.75, 0.8) };
}

// ---------------------------------------------------------------------------------------------------
// Bay furniture
// ---------------------------------------------------------------------------------------------------
/** Ground power unit: wheeled cart with a panel, reel and an amber lamp; cable to a socket. */
function powerCart(kit, IMP, { pos, yaw = 0, to }) {
  const P = new Placer(kit, pos, yaw);
  P.box("paintedMetal", 0, 0.65, 0, 1.3, 0.9, 2.0, { color: IMP.plateWarm, texel: 1 });
  P.box("paintedMetal", 0, 1.16, 0, 1.36, 0.12, 2.06, { color: IMP.black, texel: 1 });
  P.box("hazard", 0, 0.32, 0, 1.32, 0.12, 2.02, { texel: 3 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.cyl("rubber", sx * 0.6, 0.22, sz * 0.7, 0.22, 0.2, "x", { color: IMP.black, segments: 10 });
  P.box("darkGloss", 0, 0.9, -1.02, 0.7, 0.35, 0.03);
  P.box("leds", 0, 0.9, -1.04, 0.6, 0.12, 0.01, { uv: "keep", uvRect: ledRect(7) });
  P.cyl("metal", 0, 1.45, 0.4, 0.35, 0.5, "x", { color: IMP.gunmetal, segments: 12 });
  P.box("emitAmber", 0.45, 1.3, -0.7, 0.16, 0.16, 0.16, { uv: "keep" });
  P.decal(0.66, 0.75, 0.3, 0.5, 0.5, DECAL.NUMBER3, { rot: [0, Math.PI / 2, 0] });
  P.collider([-0.7, 0, -1.05], [0.7, 1.3, 1.05], "cart");
  const from = P.world(0, 1.45, 0.4);
  cableBundle(kit, { from: [from.x, from.y, from.z], to, sag: 0.5, n: 2, r: 0.03, color: IMP.black });
}

/** Cargo pallet with instanced crates on it. */
function pallet(kit, IMP, [x, z], y, { seed = 1, stack = 2 } = {}) {
  kit.box("paintedMetal", x, y + 0.08, z, 2.4, 0.16, 2.4, { color: IMP.black, texel: 1 });
  kit.box("hazard", x, y + 0.165, z, 2.42, 0.02, 2.42, { texel: 1 });
  kit.collider([x - 1.2, y, z - 1.2], [x + 1.2, y + 0.16, z + 1.2], "pallet");
  const spots = [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]];
  const n = 2 + (seed % 3);
  for (let i = 0; i < n; i++) {
    const [dx, dz] = spots[(i + seed) % 4];
    const c = i % 2 ? IMP.plateDark : IMP.gunmetal;
    placeCrate(kit, [x + dx, y + 0.16, z + dz], (seed * 0.37 + i) % 0.5, { size: [1.1, 0.8 + ((seed + i) % 3) * 0.15, 1.1], color: c, band: (seed + i) % 2 === 0 });
  }
  if (stack > 1) placeCrate(kit, [x - 0.6, y + 0.16 + 0.95, z - 0.6], 0.15, { size: [1.0, 0.7, 1.0], color: IMP.plateWarm, band: true, collide: false });
}

// ---------------------------------------------------------------------------------------------------
// Room
// ---------------------------------------------------------------------------------------------------
export function build(ctx) {
  const { kit, IMP } = ctx;
  const F = ctx.floor; // -40
  const C = ctx.ceil; // -14
  const { x0, x1, z0, z1 } = ctx.inner;
  const W = ctx.def.well; // x -14..14, z 110..160
  fixDoorSides(ctx);
  ctx.shell({
    skipFloor: true,
    walls: { zmin: { pilasterEvery: 12, panelW: 2.4 }, zmax: { pilasterEvery: 12, panelW: 2.4 }, xmin: { pilasterEvery: 14, panelW: 2.4 }, xmax: { pilasterEvery: 14, panelW: 2.4 } },
    ceiling: { panelW: 3.0 },
    stripSpacing: 8,
    seed: 61,
  });
  ctx.floorWithWell("deckGrey", IMP.plateDark);
  doorThroat(ctx, "hg_shuttle");

  // ---- landing platform (port side, forward) with the shuttle on it
  const PX0 = -29,
    PX1 = -9,
    PZ0 = 83,
    PZ1 = 107,
    PT = F + 1.0;
  const SX = -19,
    SZ = 96;
  kit.boxMM("paintedMetal", [PX0 + 0.2, F, PZ0 + 0.2], [PX1 - 0.2, PT - 0.18, PZ1 - 0.2], { color: IMP.black, texel: 1 });
  kit.boxMM("deckGrey", [PX0, PT - 0.18, PZ0], [PX1, PT, PZ1], { color: IMP.plateLight, texel: 0.5 });
  kit.collider([PX0, F, PZ0], [PX1, PT, PZ1], "platform");
  hazardBay(kit, [PX0, PZ0], [PX1, PZ1], PT, { w: 0.35 });
  // structural ribs in the skirt + amber edge lights
  for (const z of [PZ0 + 2, PZ0 + 8, PZ0 + 14, PZ0 + 20, PZ1 - 2]) kit.box("paintedMetal", PX1 - 0.1, (F + PT) / 2, z, 0.3, PT - F - 0.2, 0.6, { color: IMP.plateDark, texel: 1 });
  for (const x of [PX0 + 2, PX0 + 8, PX0 + 14, PX1 - 2]) kit.box("paintedMetal", x, (F + PT) / 2, PZ0 + 0.1, 0.6, PT - F - 0.2, 0.3, { color: IMP.plateDark, texel: 1 });
  strip(kit, [PX0 + 0.6, PT - 0.5, PZ0 - 0.02], [PX1 - 0.6, PT - 0.42, PZ0 + 0.02], "emitAmber");
  strip(kit, [PX1 - 0.02, PT - 0.5, PZ0 + 0.6], [PX1 + 0.02, PT - 0.42, PZ1 - 0.6], "emitAmber");
  // landing circle, skid pads, stencils
  const ring = new THREE.RingGeometry(8.4, 8.75, 48);
  ring.rotateX(-Math.PI / 2);
  kit.add("paintedMetal", ring, { pos: [SX, PT + 0.004, SZ], color: IMP.hazardYellow, texel: 2 });
  for (const [dx, dz] of [[-1.6, 5.0], [1.6, 5.0], [0, -5.0]]) hazardBay(kit, [SX + dx - 1.1, SZ + dz - 1.8], [SX + dx + 1.1, SZ + dz + 1.8], PT, { w: 0.14 });
  floorDecal(kit, [SX - 7.2, SZ + 4.5], PT, 2.6, DECAL.EMBLEM);
  floorDecal(kit, [PX1 - 2.2, PZ0 + 2.4], PT, 2.4, DECAL.BAY_CODE, Math.PI / 2);
  floorDecal(kit, [SX + 6.8, SZ - 6], PT, 1.8, DECAL.NUMBER1);
  floorDecal(kit, [SX - 7, SZ - 6], PT, 1.8, DECAL.WARNING);
  // stairs: front edge (climb toward +z) and starboard edge (climb toward −x)
  stairs(kit, { pos: [-13, F, PZ0 - 1.5], yaw: Math.PI, rise: PT - F, width: 2.4 });
  stairs(kit, { pos: [PX1 + 1.5, F, 100], yaw: Math.PI / 2, rise: PT - F, width: 2.4 });
  for (const [x, z] of [[PX0 + 0.5, PZ0 + 0.5], [PX1 - 0.5, PZ0 + 0.5], [PX1 - 0.5, PZ1 - 0.5], [PX0 + 0.5, PZ1 - 0.5]]) {
    kit.box("paintedMetal", x, PT + 0.5, z, 0.24, 1.0, 0.24, { color: IMP.black, texel: 1 });
    kit.box("emitAmber", x, PT + 1.06, z, 0.3, 0.14, 0.3, { uv: "keep" });
  }
  const shuttle = lambdaShuttle(ctx, [SX, PT, SZ], 0);
  // fuel coupling post by the aft-starboard skid + ground power cart at the ramp
  machineBlock(kit, { pos: [SX + 3.4, PT, SZ + 3.4], yaw: -Math.PI / 2, size: [0.9, 1.2, 0.8], color: IMP.plateDark, accent: "emitAmber", seed: 4, screen: false, vents: false });
  valveStack(kit, { pos: [SX + 3.4, PT, SZ + 4.4], yaw: -Math.PI / 2, n: 1, r: 0.09, h: 1.4, wheel: IMP.red });
  powerCart(kit, IMP, { pos: [SX - 4.6, PT, SZ - 6.4], yaw: 0.35, to: shuttle.socket.toArray() });

  // ---- fuel station on the forward wall (west of the door): pumps, valves, header, hoses to the platform
  {
    const pz = z0 + 1.0;
    machineBlock(kit, { pos: [-24, F, pz], yaw: Math.PI, size: [2.6, 2.4, 1.6], color: IMP.plateDark, accent: "emitAmber", seed: 11, stencil: DECAL.WARNING });
    machineBlock(kit, { pos: [-18.5, F, pz], yaw: Math.PI, size: [2.6, 2.4, 1.6], color: IMP.plateDark, accent: "emitAmber", seed: 12, stencil: DECAL.WARNING });
    valveStack(kit, { pos: [-21.25, F, z0 + 0.7], yaw: Math.PI, n: 3, r: 0.1, h: 2.2, wheel: IMP.red });
    pipeRun(kit, { points: [[-28.5, F + 3.2, z0 + 0.5], [-12.5, F + 3.2, z0 + 0.5]], r: 0.22, color: IMP.steel, clamps: 5 });
    for (const x of [-24, -18.5]) pipeRun(kit, { points: [[x, F + 3.2, z0 + 0.5], [x, F + 2.5, z0 + 0.5], [x, F + 2.5, pz - 0.5]], r: 0.12, color: IMP.steelDark, clamps: 1 });
    pipeRun(kit, { points: [[-21.25, F + 3.2, z0 + 0.5], [-21.25, F + 2.3, z0 + 0.5]], r: 0.1, color: IMP.steelDark });
    hazardBay(kit, [-25.8, z0 + 0.15], [-16.7, z0 + 2.6], F, { w: 0.22, mat: "hazardRed" });
    // hoses: pump 1 → coupling on the platform; pump 2 → reel on the platform's front edge
    pipeRun(kit, { points: [[-24, F + 0.5, pz + 0.9], [-24, F + 0.09, pz + 2.2], [-24, F + 0.09, PZ0 - 0.6], [-24, PT + 0.09, PZ0 + 0.3], [SX + 3.0, PT + 0.09, SZ + 2.6], [SX + 3.4, PT + 0.5, SZ + 3.0]], r: 0.09, color: IMP.black, mat: "rubber" });
    pipeRun(kit, { points: [[-18.5, F + 0.5, pz + 0.9], [-18.5, F + 0.09, pz + 2.2], [-18.5, F + 0.09, PZ0 - 0.6], [-17.5, PT + 0.09, PZ0 + 0.3], [-17.5, PT + 0.6, PZ0 + 1.2]], r: 0.09, color: IMP.black, mat: "rubber" });
    kit.box("paintedMetal", -17.5, PT + 0.45, PZ0 + 1.5, 0.9, 0.9, 0.5, { color: IMP.plateDark, texel: 1 });
    kit.cyl("paintedMetal", -17.5, PT + 1.05, PZ0 + 1.5, 0.55, 0.5, "x", { color: IMP.black, segments: 16 });
    kit.add("rubber", new THREE.TorusGeometry(0.42, 0.09, 6, 20), { pos: [-17.5, PT + 1.05, PZ0 + 1.5], rot: [0, Math.PI / 2, 0], color: IMP.black });
    kit.collider([-18.1, PT, PZ0 + 1.1], [-16.9, PT + 1.6, PZ0 + 1.9], "reel");
    const { frame } = ctx.wall("zmin");
    frame.decal(wallU(ctx, "zmin", -21.25), 5.0, 0.01, 1.6, 1.6, DECAL.WARNING);
    frame.decal(wallU(ctx, "zmin", -14.5), 6.5, 0.01, 2.6, 2.6, DECAL.BAY_CODE);
    frame.decal(wallU(ctx, "zmin", 16), 6.5, 0.01, 2.6, 2.6, DECAL.NUMBER1);
    frameScreen(frame, wallU(ctx, "zmin", 20), 3.2, 3.0, 1.8, 15, { accent: "emitAmber" });
    // hazard chevrons framing the blast door
    frame.box("hazard", wallU(ctx, "zmin", 0), 14.3, 0.02, 21.4, 0.6, 0.04, { texel: 1 });
    frame.box("hazard", wallU(ctx, "zmin", -10.4), 7.0, 0.02, 0.6, 14.0, 0.04, { texel: 1 });
    frame.box("hazard", wallU(ctx, "zmin", 10.4), 7.0, 0.02, 0.6, 14.0, 0.04, { texel: 1 });
  }

  // ---- door lane toward the well + landing markings around the well mouth
  floorLine(kit, [-7, z0 + 0.4], [-7, 104], F, { w: 0.16 });
  floorLine(kit, [7, z0 + 0.4], [7, 104], F, { w: 0.16 });
  for (const z of [80, 92]) floorDecal(kit, [0, z], F, 2.6, DECAL.ARROW, Math.PI);
  floorRect(kit, [W.x0 - 4.4, W.z0 - 4.6], [W.x1 + 4.4, W.z1 + 4.6], F, { w: 0.16 });
  for (const [x, z, idx] of [[W.x0 - 6, W.z0 - 2.5, DECAL.NUMBER1], [W.x1 + 6, W.z0 - 2.5, DECAL.NUMBER2], [W.x0 - 6, W.z1 + 2.5, DECAL.NUMBER3], [W.x1 + 6, W.z1 + 2.5, DECAL.NUMBER0]]) floorDecal(kit, [x, z], F, 2.2, idx, Math.PI);
  floorDecal(kit, [0, W.z1 + 6.5], F, 3.0, DECAL.BAY_CODE, Math.PI);
  for (const z of [113, 121]) floorDecal(kit, [-22, z], F, 2.4, DECAL.ARROW, 0);
  // dashed amber approach lights (instanced) ringing the mouth, bollards at the corners and mid-sides
  kit.proto("appr", "emitAmber", new THREE.BoxGeometry(1.6, 0.06, 0.3).translate(0, 0.03, 0));
  kit.proto("bollard", "paintedMetal", new THREE.BoxGeometry(0.24, 1.0, 0.24).translate(0, 0.5, 0));
  kit.proto("bollard_cap", "emitAmber", new THREE.BoxGeometry(0.3, 0.14, 0.3).translate(0, 1.06, 0));
  for (let z = W.z0 - 1.2; z <= W.z1 + 1.2; z += 3.2) for (const s of [-1, 1]) kit.place("appr", { pos: [s * (W.x1 + 3.2), F, z], rot: [0, Math.PI / 2, 0] });
  for (let x = -16; x <= 16; x += 3.2) for (const s of [-1, 1]) kit.place("appr", { pos: [x, F, s > 0 ? W.z1 + 3.4 : W.z0 - 3.4] });
  for (const [x, z] of [[W.x0 - 2.6, W.z0 - 2.6], [W.x1 + 2.6, W.z0 - 2.6], [W.x0 - 2.6, W.z1 + 2.6], [W.x1 + 2.6, W.z1 + 2.6], [W.x0 - 2.6, 135], [W.x1 + 2.6, 135]]) {
    kit.place("bollard", { pos: [x, F, z], color: IMP.black });
    kit.place("bollard_cap", { pos: [x, F, z] });
    kit.collider([x - 0.15, F, z - 0.15], [x + 0.15, F + 1.1, z + 0.15], "bollard");
  }
  // shaft collar: amber guide strips and corner ribs down the well (the exterior lines the shaft itself)
  for (const y of [F - 2.2, F - 8.2]) {
    kit.boxMM("emitAmber", [W.x0 + 0.02, y, W.z0 + 0.6], [W.x0 + 0.1, y + 0.15, W.z1 - 0.6], { uv: "keep" });
    kit.boxMM("emitAmber", [W.x1 - 0.1, y, W.z0 + 0.6], [W.x1 - 0.02, y + 0.15, W.z1 - 0.6], { uv: "keep" });
    kit.boxMM("emitAmber", [W.x0 + 0.6, y, W.z0 + 0.02], [W.x1 - 0.6, y + 0.15, W.z0 + 0.1], { uv: "keep" });
    kit.boxMM("emitAmber", [W.x0 + 0.6, y, W.z1 - 0.1], [W.x1 - 0.6, y + 0.15, W.z1 - 0.02], { uv: "keep" });
  }
  for (const [x, z] of [[W.x0 + 0.3, W.z0 + 0.3], [W.x1 - 0.3, W.z0 + 0.3], [W.x0 + 0.3, W.z1 - 0.3], [W.x1 - 0.3, W.z1 - 0.3]]) kit.box("paintedMetal", x, (F + W.bellyY) / 2, z, 0.6, F - W.bellyY, 0.6, { color: IMP.black, texel: 1 });
  for (const z of [W.z0 + 12.5, W.z0 + 25, W.z0 + 37.5]) for (const s of [-1, 1]) kit.box("paintedMetal", s > 0 ? W.x1 - 0.2 : W.x0 + 0.2, (F + W.bellyY) / 2, z, 0.4, F - W.bellyY, 0.8, { color: IMP.plateDark, texel: 1 });

  // ---- control kiosk on a low pad by the well's forward-starboard corner (beacon mast, status board)
  const beacon = new THREE.Group();
  {
    const kx = 20,
      kz = 102;
    kit.boxMM("paintedMetal", [kx - 2.2, F, kz - 2.2], [kx + 2.2, F + 0.3, kz + 2.2], { color: IMP.black, texel: 1 });
    kit.boxMM("deckBlack", [kx - 2.1, F + 0.28, kz - 2.1], [kx + 2.1, F + 0.32, kz + 2.1], { color: IMP.plateLight, texel: 0.5 });
    kit.collider([kx - 2.2, F, kz - 2.2], [kx + 2.2, F + 0.32, kz + 2.2], "kiosk-pad");
    hazardBay(kit, [kx - 2.2, kz - 2.2], [kx + 2.2, kz + 2.2], F + 0.32, { w: 0.18 });
    railing(kit, { from: [kx - 2.2, kz - 2.2], to: [kx - 2.2, kz + 2.2], y: F + 0.32 });
    railing(kit, { from: [kx - 2.2, kz + 2.2], to: [kx + 2.2, kz + 2.2], y: F + 0.32 });
    terminalKiosk(kit, { pos: [kx - 1.0, F + 0.32, kz - 0.6], yaw: Math.PI / 2, accent: "emitAmber", index: 15 });
    terminalKiosk(kit, { pos: [kx - 1.0, F + 0.32, kz + 0.7], yaw: Math.PI / 2, accent: "emitAmber", index: 3 });
    screenPanel(kit, { pos: [kx + 1.0, F + 1.32, kz + 1.9], yaw: 0, w: 2.4, h: 1.4, index: 15, accent: "emitAmber", stand: true, collide: true });
    ledCluster(kit, { pos: [kx + 1.6, F + 1.0, kz - 1.9], yaw: Math.PI, w: 0.8, h: 0.3, index: 9, accent: "emitAmber" });
    kit.cyl("metal", kx + 1.8, F + 0.32 + 1.9, kz - 1.6, 0.06, 3.8, "y", { color: IMP.steelDark, segments: 8 });
    kit.box("paintedMetal", kx + 1.8, F + 0.32 + 3.85, kz - 1.6, 0.4, 0.1, 0.4, { color: IMP.black, texel: 1 });
    const bk = new Kit(ctx.materials);
    bk.box("emitAmber", 0.16, 0, 0, 0.16, 0.2, 0.34, { uv: "keep" });
    bk.box("emitAmber", -0.16, 0, 0, 0.16, 0.2, 0.34, { uv: "keep" });
    bk.box("paintedMetal", 0, 0, 0, 0.16, 0.22, 0.16, { color: IMP.black });
    bk.build(beacon);
    beacon.position.set(kx + 1.8, F + 0.32 + 4.05, kz - 1.6);
    ctx.add(beacon);
  }

  // ---- starboard wall: pallet row + drums; aft wall: container stacks
  for (let i = 0; i < 5; i++) pallet(kit, IMP, [26.4, 78 + i * 5.6], F, { seed: 3 + i, stack: i % 2 });
  hazardBay(kit, [23.8, 76.2], [29.4, 102.6], F, { w: 0.22 });
  for (let i = 0; i < 6; i++) barrel(kit, { pos: [27.2 + (i % 3) * 0.85, F, 73.6 + Math.floor(i / 3) * 0.85], r: 0.38, h: 1.05, color: i % 2 ? IMP.plateDark : IMP.plateBlue, band: i % 3 ? IMP.hazardYellow : IMP.red });
  hazardBay(kit, [26.4, z0 + 0.4], [29.4, 75.2], F, { w: 0.18, mat: "hazardRed" });
  containerProtos(kit);
  for (const [x, c] of [[-24.5, IMP.plate], [-20, IMP.plateBlue], [-15.5, IMP.plateWarm], [-11, IMP.plateLight]]) placeContainer(kit, [x, F, z1 - 1.3], Math.PI / 2, { color: c });
  for (const [x, c] of [[-24.5, IMP.plateDark], [-20, IMP.plate]]) placeContainer(kit, [x, F + 1.7, z1 - 1.3], Math.PI / 2, { color: c, collide: false });
  for (const [x, c] of [[22, IMP.plateDark], [26.5, IMP.plate]]) placeContainer(kit, [x, F, z1 - 1.3], Math.PI / 2, { color: c });
  hazardBay(kit, [-27.2, z1 - 2.6], [-8.3, z1 - 0.2], F, { w: 0.2 });
  hazardBay(kit, [19.3, z1 - 2.6], [29.2, z1 - 0.2], F, { w: 0.2 });
  for (const [x, z] of [[-4, 166], [-2.4, 166], [-3.2, 167.4]]) placeCrate(kit, [x, F, z], 0.2, { size: [1.3, 0.9, 1.3], color: IMP.gunmetal });

  // ---- wall dressing: emblems, status boards, vents, numbers, amber base strips
  {
    const { frame } = ctx.wall("xmax");
    frame.decal(wallU(ctx, "xmax", 120), 13.5, 0.01, 6.0, 6.0, DECAL.EMBLEM);
    frame.decal(wallU(ctx, "xmax", 150), 9.0, 0.01, 2.2, 2.2, DECAL.RESTRICTED);
    frameScreen(frame, wallU(ctx, "xmax", 110), 4.4, 3.2, 1.9, 15, { accent: "emitAmber" });
    frameScreen(frame, wallU(ctx, "xmax", 114.5), 4.4, 3.2, 1.9, 11, { accent: "emitAmber" });
    louvreVent(kit, { pos: [x1 - 0.02, F + 18, 96], yaw: Math.PI / 2, w: 5.0, h: 2.4 });
    louvreVent(kit, { pos: [x1 - 0.02, F + 18, 140], yaw: Math.PI / 2, w: 5.0, h: 2.4 });
  }
  {
    const { frame } = ctx.wall("xmin");
    frame.decal(wallU(ctx, "xmin", 135), 13.5, 0.01, 6.0, 6.0, DECAL.EMBLEM);
    frame.decal(wallU(ctx, "xmin", 116), 8.5, 0.01, 2.4, 2.4, DECAL.BAY_CODE);
    frame.decal(wallU(ctx, "xmin", 156), 8.5, 0.01, 2.2, 2.2, DECAL.TEXT_C);
    frameScreen(frame, wallU(ctx, "xmin", 92), 5.0, 3.4, 2.0, 3, { accent: "emitAmber" });
    louvreVent(kit, { pos: [x0 + 0.02, F + 18, 120], yaw: -Math.PI / 2, w: 5.0, h: 2.4 });
    louvreVent(kit, { pos: [x0 + 0.02, F + 18, 156], yaw: -Math.PI / 2, w: 5.0, h: 2.4 });
  }
  {
    const { frame } = ctx.wall("zmax");
    frame.decal(wallU(ctx, "zmax", 0), 13.0, 0.01, 7.5, 7.5, DECAL.EMBLEM);
    frameScreen(frame, wallU(ctx, "zmax", -8), 6.0, 4.0, 2.4, 15, { accent: "emitAmber" });
    frameScreen(frame, wallU(ctx, "zmax", 8), 6.0, 4.0, 2.4, 11, { accent: "emitAmber" });
    frame.decal(wallU(ctx, "zmax", 14), 5.5, 0.01, 2.0, 2.0, DECAL.RESTRICTED);
    frame.box("hazard", wallU(ctx, "zmax", 0), 3.2, 0.02, 52, 0.4, 0.04, { texel: 1 });
    louvreVent(kit, { pos: [-20, F + 18, z1 - 0.02], yaw: 0, w: 5.0, h: 2.4 });
    louvreVent(kit, { pos: [20, F + 18, z1 - 0.02], yaw: 0, w: 5.0, h: 2.4 });
  }
  strip(kit, [x0 + 0.05, F + 0.6, z0 + 1], [x0 + 0.09, F + 0.65, z1 - 1], "emitAmber");
  strip(kit, [x1 - 0.09, F + 0.6, z0 + 1], [x1 - 0.05, F + 0.65, z1 - 1], "emitAmber");

  // ---- overhead: transverse beams, crane over the platform hung from them, conduits
  const BEAMS = [86, 100, 114, 128, 142, 156];
  for (const z of BEAMS) {
    kit.boxMM("paintedMetal", [x0, C - 1.3, z - 0.5], [x1, C, z + 0.5], { color: IMP.plateDark, texel: 1 });
    kit.boxMM("paintedMetal", [x0, C - 1.35, z - 0.7], [x1, C - 1.1, z + 0.7], { color: IMP.black, texel: 1 });
  }
  const craneY = C - 3.4;
  gantryCrane(kit, { x0: PX0 + 1, x1: PX1 - 1, z0: PZ0 - 1, z1: PZ1 + 1, y: craneY, bridgeZ: 104.5, trolleyX: SX + 4, hookDrop: 4.5 });
  for (const z of [86, 100]) for (const x of [PX0 + 1, PX1 - 1]) kit.box("paintedMetal", x, (craneY + C - 1.3) / 2, z, 0.34, C - 1.3 - craneY, 0.34, { color: IMP.black, texel: 1 });
  pipeRun(kit, { points: [[x0 + 0.5, C - 1.6, 79], [x0 + 0.5, C - 1.6, z1 - 3]], r: 0.16, color: IMP.steelDark, clamps: 6 });
  pipeRun(kit, { points: [[x0 + 1.1, C - 1.6, 79], [x0 + 1.1, C - 1.6, z1 - 3]], r: 0.1, color: IMP.plateBlue, clamps: 0 });
  pipeRun(kit, { points: [[x1 - 0.5, C - 1.6, 79], [x1 - 0.5, C - 1.6, z1 - 3]], r: 0.16, color: IMP.steelDark, clamps: 6 });

  // ---- lights: shadowed spot on the shuttle, cool fill over the apron and the well, amber wash in the
  // mouth, engine glow, warm pallets, pump station
  ctx.spot(0xf0f4ff, 1100, 46, 0.5, [SX + 2, C - 1.6, SZ - 2], [SX, PT, SZ], { penumbra: 0.5, shadow: true, mapSize: 1024 });
  workLight(ctx, [10, C, 88], { drop: 10, size: 2.6, intensity: 3000, distance: 76 });
  workLight(ctx, [0, C, 120], { drop: 10, size: 2.6, intensity: 3000, distance: 76 });
  workLight(ctx, [0, C, 152], { drop: 10, size: 2.6, intensity: 2800, distance: 76 });
  workLight(ctx, [25, C, 88], { drop: 12, size: 1.8, intensity: 900, distance: 42, warm: true });
  const wellLight = ctx.light(0xffb547, 700, 46, [0, F + 5, 135]);
  const engineLight = ctx.light(0x8fc0ff, 140, 16, shuttle.engines.toArray());
  const pumpLight = ctx.light(0xffb547, 220, 18, [-21.2, F + 3.6, z0 + 2.6]);
  void pumpLight;
  const wellBase = wellLight.intensity;
  const engineBase = engineLight.intensity;

  ctx.animate((dt, t) => {
    beacon.rotation.y += dt * 2.6;
    setLightLevel(wellLight, wellBase, 0.75 + 0.25 * Math.sin(t * 1.5));
    setLightLevel(engineLight, engineBase, 0.85 + 0.15 * Math.sin(t * 7.3) * Math.sin(t * 3.1));
  });
}
