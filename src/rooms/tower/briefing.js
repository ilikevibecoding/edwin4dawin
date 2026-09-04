// Crew Briefing Room — an auditorium: three stepped rows (0.6 / 0.3 / 0 m) of instanced officer chairs with
// writing ledges, split by a central gloss aisle with blue edge lights, facing a 6 m display wall built from
// screen-atlas panels in a bezelled frame on the aft wall, the Imperial emblem above it, a presenter's podium
// with a holo emitter (rotating blue wireframe planet + orbit ring), computer banks and lockers in the side
// zones, three light channels across the ceiling. Accent blue.
import * as THREE from "three";
import { IMP } from "../../core/palette.js";
import { screenRect, ledRect, decalRect, DECAL } from "../../textures.js";
import { Instancer, chairProto, lightBand, screenArray } from "./tactical.js";

export const meta = { id: "briefing", stream: "tower-rooms" };

const AXIS_X = -22.5; // corridor door centre
const TIERS = [
  { z0: 215.4, z1: 218.0, h: 0.6, seatZ: 216.5 },
  { z0: 218.0, z1: 220.6, h: 0.3, seatZ: 219.1 },
  { z0: 220.6, z1: 223.2, h: 0.0, seatZ: 221.7 },
];
const BANK_HALF = 9.6; // seating block half width
const AISLE_HALF = 1.1;

export function build(ctx) {
  const { kit, props } = ctx;
  const { x0, x1, z0, z1 } = ctx.inner;
  const fy = ctx.floor;
  const ax = AXIS_X;

  ctx.shell({
    floorMat: "deckGrey",
    floorColor: IMP.plateDark,
    stripSpacing: 5.3,
    ceiling: { dir: "u", stripW: 0.34 },
    seed: 17,
    walls: {
      zmin: { styles: { plate: 0.8, panel: 0.1, hatch: 0.1 } },
      zmax: { styles: { plate: 0.9, panel: 0.1 } },
      xmin: { styles: { plate: 0.8, panel: 0.1, vent: 0.1 } },
      xmax: { styles: { plate: 0.8, panel: 0.1, vent: 0.1 } },
    },
  });
  for (const side of ["zmin", "zmax", "xmin", "xmax"]) lightBand(ctx.wall(side));

  const inst = new Instancer(ctx);
  const chair = chairProto(inst, "brief_chair", { color: IMP.fabricBlack });

  // ---- tiers ----
  const bx0 = ax - BANK_HALF;
  const bx1 = ax + BANK_HALF;
  for (const t of TIERS) {
    if (t.h > 0) {
      const ty = fy + t.h;
      kit.boxMM("plate", [bx0, fy, t.z0], [bx1, ty, t.z1], { color: IMP.plateDark, uv: "world", texel: 1 });
      kit.boxMM("deckGrey", [bx0 + 0.04, ty, t.z0 + 0.04], [bx1 - 0.04, ty + 0.012, t.z1 - 0.06], { color: IMP.plateDark, texel: 0.5 });
      // nosing + blue riser strip along the step down toward the screen
      kit.boxMM("paintedMetal", [bx0, ty - 0.08, t.z1 - 0.06], [bx1, ty, t.z1 + 0.01], { color: IMP.black, texel: 1 });
      kit.boxMM("emitBlue", [bx0 + 0.3, ty - 0.2, t.z1], [bx1 - 0.3, ty - 0.16, t.z1 + 0.012], { uv: "keep" });
      kit.collider([bx0, fy - 0.2, t.z0], [bx1, ty, t.z1], "tier");
    }
    // aisle inlay on this tier
    const ty = fy + t.h;
    kit.boxMM("darkGloss", [ax - AISLE_HALF, ty + 0.014, t.z0 + (t.h > 0 ? 0.05 : 0)], [ax + AISLE_HALF, ty + 0.024, t.z1 - (t.h > 0 ? 0.08 : 0)]);
    for (const s of [-1, 1]) kit.boxMM("emitBlue", [ax + s * (AISLE_HALF + 0.02) - 0.012, ty + 0.015, t.z0 + 0.05], [ax + s * (AISLE_HALF + 0.02) + 0.012, ty + 0.025, t.z1 - 0.08], { uv: "keep" });
    // seats + ledges, both banks
    for (const s of [-1, 1]) {
      const xs = [];
      for (let i = 0; i < 7; i++) xs.push(ax + s * (AISLE_HALF + 0.55 + i * 1.2));
      for (const x of xs) chair(x, ty, t.seatZ, Math.PI);
      ledge(kit, Math.min(...xs) - 0.5, Math.max(...xs) + 0.5, ty, t.seatZ + 0.78, xs);
    }
  }
  // top tier back face toward the entry: black kick + two-step stair in the aisle, hazard at its foot
  {
    const t = TIERS[0];
    kit.boxMM("paintedMetal", [bx0 - 0.02, fy, t.z0 - 0.03], [bx1 + 0.02, fy + t.h, t.z0], { color: IMP.black, texel: 1 });
    kit.boxMM("emitWhiteSoft", [bx0 + 0.3, fy + 0.25, t.z0 - 0.04], [ax - AISLE_HALF - 0.3, fy + 0.29, t.z0 - 0.03], { uv: "keep" });
    kit.boxMM("emitWhiteSoft", [ax + AISLE_HALF + 0.3, fy + 0.25, t.z0 - 0.04], [bx1 - 0.3, fy + 0.29, t.z0 - 0.03], { uv: "keep" });
    props.stairs(kit, { pos: [ax, fy, t.z0 - 0.6], yaw: Math.PI, width: 2 * AISLE_HALF, rise: t.h, run: 0.6, rails: false, stringers: false });
    kit.boxMM("hazard", [ax - 1.3, fy + 0.003, t.z0 - 1.1], [ax + 1.3, fy + 0.009, t.z0 - 0.62], { texel: 1.5 });
    // entry aisle inlay from the door to the stair
    kit.boxMM("darkGloss", [ax - AISLE_HALF, fy + 0.002, z0 + 1.3], [ax + AISLE_HALF, fy + 0.012, t.z0 - 1.15]);
    kit.boxMM("hazard", [ax - 1.5, fy + 0.003, z0 + 0.05], [ax + 1.5, fy + 0.009, z0 + 1.25], { texel: 1.5 });
  }

  // ---- display wall + emblem (aft) ----
  {
    const W = ctx.wall("zmax");
    const u = (x) => x1 - x;
    screenArray(W.frame, u(ax), 2.45, 3, 2, 1.9, 1.1, [3, 10, 1, 12, 0, 4], { gap: 0.06 });
    // blue bezel light lines above and below the array
    W.frame.box("emitBlue", u(ax), 2.45 + 1.38, 0.15, 6.4, 0.025, 0.02, { uv: "keep" });
    W.frame.box("emitBlue", u(ax), 2.45 - 1.38, 0.15, 6.4, 0.025, 0.02, { uv: "keep" });
    W.frame.decal(u(ax), 4.35, 0.06, 1.0, 1.0, DECAL.EMBLEM);
    W.frame.decal(u(ax - 3.9), 4.3, 0.06, 0.55, 0.55, DECAL.TEXT_A);
    W.frame.decal(u(ax + 3.9), 4.3, 0.06, 0.55, 0.55, DECAL.TEXT_B);
    // presenter's stage strip: gloss inlay along the screen wall with a blue edge
    kit.boxMM("darkGloss", [ax - 4.0, fy + 0.002, z1 - 3.4], [ax + 4.0, fy + 0.012, z1 - 0.2]);
    kit.boxMM("emitBlue", [ax - 4.0, fy + 0.003, z1 - 3.42], [ax + 4.0, fy + 0.013, z1 - 3.4], { uv: "keep" });
    podium(ctx, [ax + 3.2, fy, z1 - 2.4]);
    // equipment beside the display
    props.computerBank(kit, { pos: [ax - 6.2, fy, z1 - 0.6], yaw: Math.PI, w: 3.0, h: 2.4, d: 0.6, seed: 101, accent: "emitBlue" });
    props.computerBank(kit, { pos: [ax + 6.2, fy, z1 - 0.6], yaw: Math.PI, w: 3.0, h: 2.4, d: 0.6, seed: 102, accent: "emitBlue" });
    props.computerBank(kit, { pos: [x0 + 2.0, fy, z1 - 0.6], yaw: Math.PI, w: 3.0, h: 2.4, d: 0.6, seed: 103, accent: "emitBlue" });
    props.computerBank(kit, { pos: [x1 - 2.0, fy, z1 - 0.6], yaw: Math.PI, w: 3.0, h: 2.4, d: 0.6, seed: 104, accent: "emitBlue" });
  }

  // ---- side zones ----
  for (const side of ["xmin", "xmax"]) {
    const W = ctx.wall(side);
    const wx = side === "xmin" ? x0 : x1;
    const inward = side === "xmin" ? 1 : -1;
    const yaw = side === "xmin" ? Math.PI / 2 : -Math.PI / 2;
    const u = (z) => (side === "xmin" ? z1 - z : z - z0);
    props.computerBank(kit, { pos: [wx + inward * 0.6, fy, 216.6], yaw, w: 3.0, h: 2.4, d: 0.6, seed: side === "xmin" ? 111 : 112, accent: "emitBlue" });
    props.computerBank(kit, { pos: [wx + inward * 0.6, fy, 219.8], yaw, w: 3.0, h: 2.4, d: 0.6, seed: side === "xmin" ? 113 : 114, accent: "emitBlue" });
    screenArray(W.frame, u(223.8), 2.3, 2, 2, 1.2, 0.8, side === "xmin" ? [12, 3, 10, 1] : [4, 0, 12, 10]);
    props.wallPanel(kit, W.frame, u(226.4), 1.6, { w: 1.0, h: 0.7, accent: "emitBlue", seed: side === "xmin" ? 5 : 6 });
    W.frame.decal(u(213.6), 3.4, 0.06, 0.7, 0.7, DECAL.DECK_A);
    W.frame.decal(u(226.4), 2.8, 0.06, 0.6, 0.6, DECAL.ARROW);
  }

  // ---- forward wall: lockers west of the door, bench and panel east ----
  {
    const W = ctx.wall("zmin");
    const u = (x) => x - x0;
    props.lockerRow(kit, W.frame, u(x0 + 1.0), 8, { lw: 0.6, h: 2.0, d: 0.5, color: IMP.plateDark });
    W.frame.decal(u(x0 + 3.4), 2.7, 0.06, 0.7, 0.7, DECAL.TEXT_C);
    props.computerBank(kit, { pos: [ax - 6.0, fy, z0 + 0.6], yaw: 0, w: 3.0, h: 2.4, d: 0.6, seed: 121, accent: "emitBlue" });
    props.wallPanel(kit, W.frame, u(ax + 3.6), 1.6, { w: 1.0, h: 0.7, accent: "emitBlue", seed: 8 });
    W.frame.decal(u(ax), 3.8, 0.06, 1.0, 1.0, DECAL.EMBLEM);
    W.frame.decal(u(ax + 2.3), 3.4, 0.06, 0.6, 0.6, DECAL.DECK_A);
    W.frame.decal(u(ax - 2.3), 3.4, 0.06, 0.6, 0.6, DECAL.NUMBER2);
    props.computerBank(kit, { pos: [ax + 7.2, fy, z0 + 0.6], yaw: 0, w: 3.0, h: 2.4, d: 0.6, seed: 122, accent: "emitBlue" });
    props.computerBank(kit, { pos: [x1 - 1.8, fy, z0 + 0.6], yaw: 0, w: 2.6, h: 2.4, d: 0.6, seed: 123, accent: "emitBlue" });
  }

  // ---- lights ----
  ctx.light(0xdfe8ff, 30, 18, [ax - 5.0, fy + 4.4, 217.5], { decay: 1.5 });
  ctx.light(0xdfe8ff, 30, 18, [ax + 5.0, fy + 4.4, 217.5], { decay: 1.5 });
  ctx.light(0xdfe8ff, 28, 18, [ax - 5.0, fy + 4.4, 222.5], { decay: 1.5 });
  ctx.light(0xdfe8ff, 28, 18, [ax + 5.0, fy + 4.4, 222.5], { decay: 1.5 });
  ctx.light(0x5fb8ff, 22, 12, [ax, fy + 3.6, z1 - 2.2], { decay: 1.7 });
  ctx.light(0xdfe8ff, 24, 16, [x0 + 2.6, fy + 4.2, 220.0], { decay: 1.5 });
  ctx.light(0xdfe8ff, 24, 16, [x1 - 2.6, fy + 4.2, 220.0], { decay: 1.5 });
  inst.build();
}

// ---------------------------------------------------------------------------------------------------
/** Writing ledge in front of a seat row: black shelf on end supports, gloss top with a data pad per seat. */
function ledge(kit, xa, xb, y, z, seatXs) {
  const L = xb - xa;
  const cx = (xa + xb) / 2;
  kit.box("paintedMetal", cx, y + 0.72, z, L, 0.06, 0.36, { color: IMP.black, texel: 1 });
  kit.box("darkGloss", cx, y + 0.755, z, L - 0.04, 0.01, 0.32);
  kit.box("paintedMetal", cx, y + 0.36, z + 0.14, L, 0.72, 0.05, { color: IMP.plateDark, texel: 1 }); // modesty panel toward the screen
  kit.box("emitBlue", cx, y + 0.66, z + 0.166, L - 0.4, 0.02, 0.006, { uv: "keep" });
  for (const x of [xa + 0.1, xb - 0.1]) kit.box("paintedMetal", x, y + 0.36, z, 0.08, 0.72, 0.34, { color: IMP.black, texel: 1 });
  for (const x of seatXs) kit.box("screen", x, y + 0.762, z - 0.02, 0.44, 0.004, 0.24, { uv: "keep", uvRect: screenRect(12) });
  kit.collider([xa, y, z - 0.18], [xb, y + 0.78, z + 0.18], "ledge");
}

/** Presenter's podium: angular black stand with a gloss top, controls, emblem, and a holo emitter. */
function podium(ctx, pos) {
  const { kit } = ctx;
  const [x, y, z] = pos;
  const H = 1.12;
  kit.box("paintedMetal", x, y + 0.06, z, 1.0, 0.12, 0.8, { color: IMP.black, texel: 1 });
  kit.box("plate", x, y + H / 2, z, 0.7, H - 0.1, 0.55, { color: IMP.plateDark, uv: "world", texel: 1 });
  kit.box("paintedMetal", x, y + H - 0.03, z, 0.9, 0.06, 0.7, { color: IMP.black, texel: 1 });
  kit.box("darkGloss", x, y + H + 0.005, z, 0.84, 0.01, 0.64);
  kit.box("screen", x, y + H + 0.012, z - 0.12, 0.5, 0.004, 0.28, { uv: "keep", uvRect: screenRect(10) });
  kit.box("leds", x, y + H + 0.012, z + 0.2, 0.6, 0.004, 0.1, { uv: "keep", uvRect: ledRect(4) });
  for (const s of [-1, 1]) kit.box("emitBlue", x + s * 0.36, y + H / 2, z - 0.276, 0.02, H - 0.3, 0.005, { uv: "keep" });
  kit.add("decal", new THREE.PlaneGeometry(0.4, 0.4), { pos: [x, y + 0.7, z - 0.281], rot: [0, Math.PI, 0], uv: "keep", uvRect: decalRect(DECAL.EMBLEM) });
  kit.collider([x - 0.5, y, z - 0.4], [x + 0.5, y + H + 0.05, z + 0.4], "podium");
  // holo emitter on the aft corner of the top: small planet + orbit ring
  const ex = x + 0.25;
  const ez = z + 0.18;
  kit.cyl("paintedMetal", ex, y + H + 0.03, ez, 0.12, 0.04, "y", { color: IMP.black, segments: 16 });
  kit.add("emitBlue", new THREE.RingGeometry(0.08, 0.11, 24).rotateX(-Math.PI / 2), { pos: [ex, y + H + 0.052, ez], uv: "keep" });
  const holo = ctx.materials.holo.clone();
  holo.opacity = 0.18;
  const lineMat = new THREE.LineBasicMaterial({ color: 0x9ad4ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  const g = new THREE.Group();
  g.position.set(ex, y + H + 0.5, ez);
  g.add(new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(0.2, 1)), lineMat));
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 12), holo));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.005, 6, 48).rotateX(Math.PI / 2), holo);
  ring.rotation.z = 0.3;
  g.add(ring);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  g.add(moon);
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.06, 0.32, 24, 1, true), (() => { const m = ctx.materials.holo.clone(); m.opacity = 0.06; return m; })());
  cone.position.set(ex, y + H + 0.22, ez);
  ctx.add(g);
  ctx.add(cone);
  let t = 0;
  ctx.animate((dt) => {
    t += dt;
    g.rotation.y = t * 0.4;
    moon.position.set(Math.cos(t * 1.3) * 0.32, Math.sin(t * 1.3) * 0.32 * Math.sin(0.3), Math.sin(t * 1.3) * 0.32 * Math.cos(0.3));
    holo.opacity = 0.16 + 0.04 * Math.sin(t * 7);
  });
}
