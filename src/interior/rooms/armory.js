// Deck 3 — Armoury & Equipment Storage (d3_armory). A caged issue room: the visitor side by the
// secure door has the check-out counter, a hatch through the bars, return lockers and a bench; behind
// the cage stand the weapon racks (boxy blaster-rifle silhouettes), armour stands with abstract white
// plate, charge-pack charging lockers with red lamps and stacked munitions crates. White work light
// with red warning beacons at the cage line; restricted stencils everywhere. Deck-local, floor y = 0.
import * as THREE from "three";
import { PALETTE } from "../../materials.js";
import { roomShell, wallScreen, crate, wallSegment, impChair, railing } from "../imperial.js";
import { signPlate } from "../corridor.js";
import { pointLight, wallFrame } from "../builders.js";
import { rng } from "../../kit.js";
import { decalRect } from "../../textures.js";
import { ensureCrewMaterials, SIGN, wallSign, floorSign, floorGrime, scuffRun, wallGrime, cableTray, ventGrille, intercom, lockerBank, propFrame, stool, helmet } from "./crewProps.js";

const ARM_PAINTS = [
  [PALETTE.impLight, 0.45],
  [PALETTE.impGrey, 0.3],
  [PALETTE.impMid, 0.17],
  [PALETTE.impDark, 0.08],
];

/** Boxy blaster-rifle silhouette, barrel toward local +X, profile in the local XY plane. */
function rifle(kit, x, y, z, quat, seed) {
  const rand = rng(seed);
  const add = (mat, geo, lx, ly, lz, extra = {}) => {
    const p = new THREE.Vector3(lx, ly, lz).applyQuaternion(quat).add(new THREE.Vector3(x, y, z));
    kit.add(mat, geo, { pos: [p.x, p.y, p.z], quat: extra.quat || quat, ...extra });
  };
  const cylX = (r, len) => new THREE.CylinderGeometry(r, r, len, 8).rotateZ(Math.PI / 2);
  add("paintedMetal", new THREE.BoxGeometry(0.46, 0.09, 0.05), 0, 0, 0, { color: PALETTE.impBlack, texel: 3 });
  add("paintedMetal", new THREE.BoxGeometry(0.3, 0.025, 0.032), -0.02, 0.058, 0, { color: PALETTE.impDark, texel: 3 });
  add("metal", cylX(0.018, 0.17), 0.03, 0.092, 0, { color: PALETTE.gunmetal });
  add("paintedMetal", new THREE.BoxGeometry(0.17, 0.052, 0.042), 0.3, 0.0, 0, { color: PALETTE.impDark, texel: 3 });
  add("metal", cylX(0.013, 0.4), 0.46, 0.014, 0, { color: PALETTE.gunmetal });
  add("metal", cylX(0.022, 0.06), 0.65, 0.014, 0, { color: PALETTE.impBlack });
  add("paintedMetal", new THREE.BoxGeometry(0.06, 0.12, 0.034), 0.06, -0.095, 0, { color: PALETTE.impBlack, texel: 3 });
  const gq = quat.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.35));
  add("rubber", new THREE.BoxGeometry(0.045, 0.11, 0.034), -0.11, -0.085, 0, { color: PALETTE.rubber, quat: gq });
  add("paintedMetal", new THREE.BoxGeometry(0.24, 0.045, 0.03), -0.34, -0.005, 0, { color: PALETTE.impDark, texel: 3 });
  add("paintedMetal", new THREE.BoxGeometry(0.05, 0.12, 0.04), -0.47, -0.02, 0, { color: PALETTE.impBlack, texel: 3 });
  add(rand() < 0.75 ? "emitBlue" : "emitRed", new THREE.BoxGeometry(0.03, 0.012, 0.006), -0.08, 0.02, 0.027);
}

/** Heavy repeating blaster: longer, thicker, with a cooling shroud and a bipod, along local +X. */
function heavyBlaster(kit, x, y, z, quat) {
  const add = (mat, geo, lx, ly, lz, extra = {}) => {
    const p = new THREE.Vector3(lx, ly, lz).applyQuaternion(quat).add(new THREE.Vector3(x, y, z));
    kit.add(mat, geo, { pos: [p.x, p.y, p.z], quat, ...extra });
  };
  const cylX = (r, len, seg = 10) => new THREE.CylinderGeometry(r, r, len, seg).rotateZ(Math.PI / 2);
  add("paintedMetal", new THREE.BoxGeometry(0.62, 0.13, 0.09), 0, 0, 0, { color: PALETTE.impBlack, texel: 3 });
  add("paintedMetal", new THREE.BoxGeometry(0.5, 0.04, 0.05), 0, 0.085, 0, { color: PALETTE.impDark, texel: 3 });
  add("metal", cylX(0.045, 0.5), 0.55, 0.01, 0, { color: PALETTE.gunmetal });
  for (let i = 0; i < 4; i++) add("metal", cylX(0.055, 0.02, 12), 0.4 + i * 0.09, 0.01, 0, { color: PALETTE.impMid });
  add("metal", cylX(0.02, 0.3), 0.92, 0.01, 0, { color: PALETTE.gunmetal });
  add("paintedMetal", new THREE.BoxGeometry(0.1, 0.18, 0.06), 0.1, -0.13, 0, { color: PALETTE.impBlack, texel: 3 });
  add("paintedMetal", new THREE.BoxGeometry(0.3, 0.07, 0.05), -0.45, -0.01, 0, { color: PALETTE.impDark, texel: 3 });
  add("rubber", new THREE.BoxGeometry(0.06, 0.16, 0.06), -0.14, -0.1, 0, { color: PALETTE.rubber });
  add("emitRed", new THREE.BoxGeometry(0.05, 0.015, 0.006), -0.1, 0.03, 0.048);
}

/**
 * Weapon rack: back board with a base shelf and a clamp rail, `n` upright rifles (a few slots empty)
 * each with a slot lamp. Back at local z = 0, rifles facing +Z; rotated by yaw around (x, z).
 */
function weaponRack(kit, ctx, { x, z, yaw = 0, n = 7, seed = 1, heavy = false }) {
  const F = propFrame(kit, x, z, yaw);
  const rand = rng(seed);
  const pitch = heavy ? 0.42 : 0.21;
  const w = n * pitch + 0.2;
  const h = 2.2;
  // light back board and a real (0.05 thick) down-light so the black silhouettes read against it
  F.box("paintedMetal", 0, h / 2, 0.05, w, h, 0.1, { color: PALETTE.impDark, texel: 1.5 });
  F.box("impPanel1", 0, h / 2 + 0.05, 0.105, w - 0.1, h - 0.3, 0.012, { color: PALETTE.impLight, uv: "keep" });
  F.box("paintedMetal", 0, 0.08, 0.2, w, 0.16, 0.4, { color: PALETTE.impBlack, texel: 2 });
  F.box("hazard", 0, 0.165, 0.2, w - 0.04, 0.01, 0.38, { texel: 3 });
  F.box("paintedMetal", 0, h - 0.06, 0.2, w + 0.04, 0.1, 0.42, { color: PALETTE.impBlack, texel: 2 });
  F.box("emitWhiteDim", 0, h - 0.135, 0.22, w - 0.2, 0.05, 0.16, { uv: "keep" });
  F.box("paintedMetal", 0, 1.35, 0.26, w - 0.08, 0.05, 0.05, { color: PALETTE.impMid, texel: 2 });
  // standing weapons: local +X (barrel) → up; a slot lamp under each
  const up = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
  for (let i = 0; i < n; i++) {
    const lx = -w / 2 + 0.1 + (i + 0.5) * pitch;
    const filled = rand() > 0.1;
    F.box(filled ? "emitBlue" : "emitRed", lx, 0.19, 0.4, 0.05, 0.012, 0.03);
    F.box("paintedMetal", lx, 1.35, 0.3, 0.06, 0.09, 0.14, { color: PALETTE.impBlack, texel: 2 });
    if (!filled) continue;
    const p = F.at(lx, 0, 0.24);
    const q = F.q.clone().multiply(up);
    if (heavy) heavyBlaster(kit, p.x, 0.17 + 0.55, p.z, q);
    else rifle(kit, p.x, 0.17 + 0.5, p.z, q, seed * 3 + i);
  }
  F.add("decal", new THREE.PlaneGeometry(0.26, 0.26), -w / 2 + 0.25, h - 0.42, 0.112, { uv: "keep", uvRect: decalRect(9 + (seed % 3)) });
  F.collider(-w / 2, 0, w / 2, 0.42, h, "rack");
}

/** Armour stand: post with abstract white plate — boxed helmet with a dark visor, chest and shoulder plates. */
function armourStand(kit, x, z, yaw, seed) {
  const F = propFrame(kit, x, z, yaw);
  const rand = rng(seed);
  const kind = rand();
  kit.cyl("paintedMetal", x, 0.04, z, 0.32, 0.08, "y", { color: PALETTE.impBlack, segments: 16, texel: 2 });
  kit.add("emitWhite", new THREE.TorusGeometry(0.3, 0.008, 6, 28), { pos: [x, 0.085, z], rot: [Math.PI / 2, 0, 0] });
  kit.cyl("metal", x, 0.95, z, 0.03, 1.75, "y", { color: PALETTE.impMid, segments: 10 });
  F.box("paintedMetal", 0, 1.48, 0, 0.56, 0.04, 0.05, { color: PALETTE.impDark, texel: 2 });
  if (kind < 0.78) {
    // chest + back plates, abdomen band, shoulder bells
    F.box("crew_white", 0, 1.22, 0.12, 0.42, 0.5, 0.1, { color: PALETTE.impWhite });
    F.box("crew_white", 0, 1.3, 0.13, 0.3, 0.24, 0.1, { color: PALETTE.impWhite });
    F.box("crew_white", 0, 1.22, -0.1, 0.4, 0.46, 0.08, { color: PALETTE.impWhite });
    F.box("paintedMetal", 0, 1.0, 0.1, 0.36, 0.1, 0.12, { color: PALETTE.impBlack, texel: 2 });
    F.box("crew_white", 0, 0.92, 0.11, 0.3, 0.06, 0.1, { color: PALETTE.impWhite });
    for (const s of [-1, 1]) {
      F.box("crew_white", s * 0.31, 1.4, 0.02, 0.16, 0.14, 0.2, { color: PALETTE.impWhite });
      F.box("paintedMetal", s * 0.24, 1.42, 0.02, 0.04, 0.06, 0.16, { color: PALETTE.impBlack, texel: 2 });
    }
    F.box("paintedMetal", 0, 1.5, 0.0, 0.14, 0.06, 0.14, { color: PALETTE.impBlack, texel: 2 });
  }
  if (kind < 0.55 || kind > 0.9) {
    // helmet (boxed shell with brow, visor slit and vents)
    helmet(kit, x, 1.54, z, yaw);
  } else if (kind >= 0.78) {
    // empty stand: a helmet hook with a datapad tag
    F.box("darkGloss", 0.1, 1.52, 0.06, 0.08, 0.12, 0.01);
  }
  kit.collider([x - 0.34, 0, z - 0.34], [x + 0.34, 1.9, z + 0.34], "armour");
}

/** Charging rack: an open cabinet of charge-pack slots with red / green charge indicators. */
function chargeRack(kit, ctx, { x, z, yaw = 0, seed = 1 }) {
  const F = propFrame(kit, x, z, yaw);
  const rand = rng(seed);
  const w = 1.6;
  const h = 2.1;
  F.box("paintedMetal", 0, h / 2, 0.25, w, h, 0.5, { color: PALETTE.impDark, texel: 1.5 });
  F.box("paintedMetal", 0, 0.05, 0.25, w + 0.04, 0.1, 0.54, { color: PALETTE.impBlack, texel: 2 });
  F.box("hazard", 0, h + 0.03, 0.25, w + 0.04, 0.06, 0.54, { texel: 3 });
  for (let r = 0; r < 4; r++) {
    const y = 0.4 + r * 0.42;
    F.box("paintedMetal", 0, y - 0.02, 0.36, w - 0.1, 0.03, 0.28, { color: PALETTE.impMid, texel: 2 });
    const n = 6;
    for (let i = 0; i < n; i++) {
      const lx = -w / 2 + 0.17 + i * ((w - 0.34) / (n - 1));
      if (rand() < 0.2) {
        F.box("emitRed", lx, y + 0.06, 0.5, 0.05, 0.012, 0.006);
        continue;
      }
      F.box("paintedMetal", lx, y + 0.13, 0.36, 0.14, 0.26, 0.2, { color: PALETTE.impBlack, texel: 3 });
      F.box("darkGloss", lx, y + 0.13, 0.465, 0.1, 0.18, 0.01);
      const lv = rand();
      F.box(lv < 0.6 ? "emitGreen" : lv < 0.85 ? "emitAmber" : "emitRed", lx, y + 0.22, 0.47, 0.06, 0.012, 0.006);
      F.box("emitRed", lx, y + 0.02, 0.47, 0.02, 0.02, 0.006);
    }
  }
  F.box("emitRed", 0, h - 0.12, 0.505, w - 0.4, 0.02, 0.006);
  F.box("darkGloss", 0, h - 0.3, 0.505, 0.5, 0.14, 0.006);
  F.add("impScreen2", new THREE.PlaneGeometry(0.44, 0.1), 0, h - 0.3, 0.509, { uv: "keep" });
  F.collider(-w / 2, 0, w / 2, 0.54, h + 0.06, "chargerack");
}

/** Bar height of the issue cage; a solid panelled header closes it to the ceiling above this. */
const CAGE_H = 2.4;

/** Cage line: vertical bars between rails from z0 to z1 at x, with gaps, capped by a solid header. */
function cageWall(kit, x, z0, z1, gaps, H) {
  const spans = [[z0, z1]];
  for (const [g0, g1] of gaps) {
    const next = [];
    for (const [a, b] of spans) {
      if (g1 <= a || g0 >= b) next.push([a, b]);
      else {
        if (g0 > a) next.push([a, g0]);
        if (g1 < b) next.push([g1, b]);
      }
    }
    spans.length = 0;
    spans.push(...next);
  }
  for (const [a, b] of spans) {
    const len = b - a;
    const zc = (a + b) / 2;
    // bottom rail, top rail at the cage height, a mid rail, painted bars every 0.28 (open enough to
    // see the racks) and a security mesh below the mid rail; nothing rises past CAGE_H but the posts
    kit.box("paintedMetal", x, 0.06, zc, 0.1, 0.12, len, { color: PALETTE.impBlack, texel: 2 });
    kit.box("paintedMetal", x, CAGE_H - 0.05, zc, 0.1, 0.1, len, { color: PALETTE.impBlack, texel: 2 });
    kit.box("paintedMetal", x, 1.1, zc, 0.06, 0.05, len, { color: PALETTE.impMid, texel: 2 });
    const n = Math.max(1, Math.round(len / 0.34));
    const barH = CAGE_H - 0.22;
    for (let i = 0; i <= n; i++) {
      const z = a + (i / n) * len;
      kit.cyl("paintedMetal", x, 0.12 + barH / 2, z, 0.018, barH, "y", { color: PALETTE.impMid, segments: 6, texel: 3 });
    }
    const mg = new THREE.PlaneGeometry(len - 0.02, 0.96);
    mg.rotateY(Math.PI / 2);
    kit.add("crew_mesh", mg, { pos: [x, 0.6, zc], uv: "scale", uvScale: [(len - 0.02) / 0.4, 0.96 / 0.4] });
    kit.collider([x - 0.06, 0, a], [x + 0.06, H, b], "cage");
  }
  // solid header the full length of the cage line (over the gaps too): light panels between black
  // trims, so the cage reads as a built issue room rather than bars running into the ceiling
  {
    const zc = (z0 + z1) / 2;
    const len = z1 - z0;
    kit.box("impPanel1", x, (CAGE_H + H) / 2 + 0.02, zc, 0.12, H - CAGE_H - 0.12, len, { color: PALETTE.impGrey, uv: "keep" });
    kit.box("paintedMetal", x, CAGE_H + 0.04, zc, 0.16, 0.08, len, { color: PALETTE.impBlack, texel: 2 });
    kit.box("paintedMetal", x, H - 0.05, zc, 0.16, 0.1, len, { color: PALETTE.impBlack, texel: 2 });
    // plate seams and a mid trim so the header reads as built panelling, not one flat slab
    const nSeam = Math.max(2, Math.round(len / 1.3));
    for (let i = 1; i < nSeam; i++) kit.box("paintedMetal", x, (CAGE_H + H) / 2 + 0.02, z0 + (i / nSeam) * len, 0.14, H - CAGE_H - 0.12, 0.04, { color: PALETTE.impBlack, texel: 2 });
    kit.box("paintedMetal", x, CAGE_H + 0.42, zc, 0.14, 0.03, len, { color: PALETTE.impDark, texel: 2 });
    for (const [g0, g1] of gaps) kit.collider([x - 0.08, CAGE_H, g0], [x + 0.08, H, g1], "cagehead");
  }
  // posts at every span edge
  const edges = new Set();
  for (const [a, b] of spans) {
    edges.add(a);
    edges.add(b);
  }
  for (const z of edges) kit.box("paintedMetal", x, H / 2, z, 0.14, H, 0.14, { color: PALETTE.impDark, texel: 1.5 });
}

export function buildArmory(kit, ctx) {
  ensureCrewMaterials(ctx);
  const [min, max] = ctx.bounds; // x -56..-42.4, y 0..3.6, z -44..-28
  const H = max[1];
  const cageX = -47.6;
  const counterZ = -36;

  roomShell(kit, ctx, {
    ceiling: { lights: false, spacing: 6.5, along: "z", paints: [[PALETTE.impGrey, 0.55], [PALETTE.impMid, 0.35], [PALETTE.impDark, 0.1]] },
    walls: { rows: [0, 0.5, 1.6, 2.6, H], paints: ARM_PAINTS, styles: { panel: 0.66, vent: 0.1, greeble: 0.1, strip: 0.04, screen: 0.03, conduit: 0.07 }, theme: { accent: "emitWhiteDim", accent2: "emitRed" } },
  });
  // black rubber deck inside the cage, hazard line along the cage on the visitor side
  kit.boxMM("rubber", [min[0] + 0.2, 0, min[2] + 0.2], [cageX - 0.1, 0.012, max[2] - 0.2], { color: PALETTE.rubber });
  kit.boxMM("hazard", [cageX + 0.08, 0, min[2] + 0.2], [cageX + 0.24, 0.012, max[2] - 0.2], { texel: 4 });

  // ------------------------------------------------------------------ lights (6): white work light, red at the cage ends
  ctx.light(pointLight(0xe8f0ff, 10, 11, [-52.0, H - 0.6, -40.5]));
  ctx.light(pointLight(0xe8f0ff, 10, 11, [-52.0, H - 0.6, -31.5]));
  ctx.light(pointLight(0xf4f6ff, 9, 10, [-45.0, H - 0.6, -40.0]));
  ctx.light(pointLight(0xf4f6ff, 9, 10, [-45.0, H - 0.6, -32.0]));
  // red beacons flank the counter (z -39.5 / -32.5) so the red identity is in frame from the door
  const beaconZ = [-39.5, -32.5];
  const redA = ctx.light(pointLight(0xff3020, 5, 7, [cageX + 0.35, 3.0, beaconZ[0]]));
  const redB = ctx.light(pointLight(0xff3020, 5, 7, [cageX + 0.35, 3.0, beaconZ[1]]));
  // pulsing red beacons on the cage posts (material clone so other rooms keep steady red)
  const alert = ctx.materials.crew_alert;
  ctx.anim((dt, t) => {
    const k = 0.55 + 0.45 * Math.sin(t * 2.4);
    alert.emissiveIntensity = 0.6 + k * 2.4;
    redA.intensity = redA.userData.baseIntensity * (0.4 + k * 0.8);
    redB.intensity = redB.userData.baseIntensity * (0.4 + k * 0.8);
  });
  for (const z of beaconZ) {
    // beacon units bracketed off the visitor face of the cage header
    const bx = cageX + 0.2;
    kit.box("paintedMetal", cageX + 0.09, 3.0, z, 0.06, 0.34, 0.34, { color: PALETTE.impBlack, texel: 2 });
    kit.box("paintedMetal", bx, 2.9, z, 0.28, 0.06, 0.28, { color: PALETTE.impBlack, texel: 2 });
    kit.cyl("paintedMetal", bx, 2.96, z, 0.11, 0.06, "y", { color: PALETTE.impBlack, segments: 14 });
    kit.add("crew_alert", new THREE.SphereGeometry(0.1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), { pos: [bx, 2.99, z], uv: "keep" });
    kit.box("paintedMetal", bx, 3.14, z, 0.26, 0.04, 0.26, { color: PALETTE.impDark, texel: 2 });
    for (const s of [-1, 1]) kit.cyl("metal", bx + 0.06, 3.06, z + s * 0.12, 0.012, 0.16, "y", { color: PALETTE.gunmetal, segments: 6 });
  }

  // ------------------------------------------------------------------ cage with the counter hatch and an open gate
  const gate = [counterZ + 1.5, counterZ + 2.6];
  cageWall(kit, cageX, min[2] + 0.2, max[2] - 0.2, [[counterZ - 1.4, counterZ + 1.4], gate], H);
  // counter hatch: a deep black lintel under the header carrying the lit RESTRICTED plate toward the
  // visitor, with a thin dim strip under it (the hatch opening runs from the counter top to the lintel)
  {
    const len = 2.8;
    const lintelY0 = 1.95;
    const lintelY1 = CAGE_H;
    kit.box("paintedMetal", cageX, (lintelY0 + lintelY1) / 2, counterZ, 0.14, lintelY1 - lintelY0, len, { color: PALETTE.impBlack, texel: 2 });
    kit.box("emitWhiteDim", cageX + 0.08, lintelY0 - 0.005, counterZ, 0.03, 0.015, len - 0.3, { uv: "keep" });
    signPlate(kit, ctx, { side: "xmin", u: max[2] - counterZ, v: (lintelY0 + lintelY1) / 2 - 0.01, w: 2.4, h: 0.38, text: "Restricted", sub: "Authorised personnel only", accent: "#ff3a2a", bounds: [[cageX + 0.07, 0, min[2]], [max[0], H, max[2]]] });
    kit.collider([cageX - 0.07, lintelY0, counterZ - len / 2], [cageX + 0.14, H, counterZ + len / 2], "hatchlintel");
    // open gate leaf swung into the cage side
    const gz = gate[0];
    const gw = gate[1] - gate[0];
    kit.box("paintedMetal", cageX - gw / 2, 0.06, gz, gw, 0.12, 0.08, { color: PALETTE.impBlack, texel: 2 });
    kit.box("paintedMetal", cageX - gw / 2, 2.35, gz, gw, 0.1, 0.08, { color: PALETTE.impBlack, texel: 2 });
    kit.box("paintedMetal", cageX - gw / 2, 1.1, gz, gw, 0.05, 0.05, { color: PALETTE.impMid, texel: 2 });
    for (let i = 0; i <= 4; i++) kit.cyl("paintedMetal", cageX - 0.05 - (i / 4) * (gw - 0.1), 1.2, gz, 0.016, 2.3, "y", { color: PALETTE.impMid, segments: 6, texel: 3 });
    {
      const mg = new THREE.PlaneGeometry(gw - 0.12, 0.96);
      kit.add("crew_mesh", mg, { pos: [cageX - gw / 2, 0.6, gz], uv: "scale", uvScale: [(gw - 0.12) / 0.4, 0.96 / 0.4] });
    }
    kit.box("paintedMetal", cageX - gw + 0.06, 1.0, gz, 0.1, 0.3, 0.08, { color: PALETTE.impDark, texel: 2 });
    kit.box("emitGreen", cageX - gw + 0.06, 1.0, gz + 0.045, 0.03, 0.03, 0.006);
    kit.collider([cageX - gw - 0.02, 0, gz - 0.05], [cageX + 0.02, 2.4, gz + 0.05], "gateleaf");
    kit.box("paintedMetal", cageX, 2.45, gz + gw / 2, 0.14, 0.2, gw + 0.1, { color: PALETTE.impDark, texel: 2 });
    floorSign(kit, SIGN.AUTHORISED, cageX + 0.9, gz + gw / 2, 1.3, Math.PI / 2, false);
  }
  // check-out counter set into the cage gap, screen swung to the visitor, keypad, ledger datapads
  {
    const cw = 2.8;
    kit.box("paintedMetal", cageX - 0.05, 0.5, counterZ, 0.9, 1.0, cw, { color: PALETTE.impDark, texel: 1.5 });
    kit.box("impPanel1", cageX + 0.405, 0.55, counterZ, 0.02, 0.8, cw - 0.1, { color: PALETTE.impGrey, uv: "keep" });
    kit.box("paintedMetal", cageX - 0.05, 1.03, counterZ, 1.0, 0.06, cw + 0.04, { color: PALETTE.impBlack, texel: 2 });
    kit.box("darkGloss", cageX - 0.05, 1.065, counterZ, 0.94, 0.012, cw - 0.02);
    kit.box("emitRed", cageX + 0.42, 0.08, counterZ, 0.01, 0.015, cw - 0.4);
    kit.box("hazard", cageX + 0.415, 0.98, counterZ, 0.01, 0.06, cw - 0.2, { texel: 3 });
    // screen on an arm facing +x (visitor side)
    kit.cyl("metal", cageX - 0.2, 1.2, counterZ + 0.9, 0.025, 0.3, "y", { color: PALETTE.steel, segments: 8 });
    kit.box("darkGloss", cageX - 0.12, 1.5, counterZ + 0.9, 0.04, 0.4, 0.56);
    const sg = new THREE.PlaneGeometry(0.5, 0.34);
    sg.rotateY(Math.PI / 2);
    kit.add("impScreen1", sg, { pos: [cageX - 0.098, 1.5, counterZ + 0.9], uv: "keep" });
    kit.box("leds", cageX - 0.098, 1.27, counterZ + 0.9, 0.006, 0.03, 0.4, { uv: "keep" });
    // keypad / scanner plate for ident chips
    kit.box("paintedMetal", cageX + 0.2, 1.09, counterZ - 0.7, 0.3, 0.05, 0.4, { color: PALETTE.impBlack, texel: 2 });
    kit.box("emitBlue", cageX + 0.2, 1.118, counterZ - 0.7, 0.2, 0.006, 0.28);
    for (let k = 0; k < 3; k++) kit.box("darkGloss", cageX - 0.3 + k * 0.03, 1.15, counterZ - 0.2 + k * 0.05, 0.02, 0.16, 0.24);
    kit.cyl("metal", cageX - 0.3, 1.12, counterZ + 0.3, 0.035, 0.1, "y", { color: PALETTE.steel, segments: 8 });
    kit.collider([cageX - 0.55, 0, counterZ - cw / 2 - 0.02], [cageX + 0.45, 1.08, counterZ + cw / 2 + 0.02], "counter");
    impChair(kit, ctx, { x: cageX - 1.0, z: counterZ, yaw: -Math.PI / 2 });
    wallSign(kit, ctx, { side: "xmax", u: counterZ - min[2], v: 3.25, w: 1.6, cell: SIGN.ARMOURY, lit: true });
    floorSign(kit, SIGN.RESTRICTED, cageX + 1.6, counterZ, 1.8, Math.PI / 2, false);
    // queue rail 1.2 m out from the counter face with a gap at the hatch, and a visitor-facing issue
    // status board on the cage beside the hatch
    const qx = cageX + 0.45 + 1.2;
    railing(kit, qx, counterZ - 2.6, qx, counterZ - 0.5, 0, { h: 0.95 });
    railing(kit, qx, counterZ + 0.5, qx, counterZ + 2.6, 0, { h: 0.95 });
    {
      const bz = counterZ - 2.3;
      kit.box("paintedMetal", cageX + 0.1, 1.75, bz, 0.08, 0.86, 1.36, { color: PALETTE.impBlack, texel: 2 });
      kit.box("darkGloss", cageX + 0.145, 1.75, bz, 0.01, 0.76, 1.26);
      const sg = new THREE.PlaneGeometry(1.2, 0.7);
      sg.rotateY(Math.PI / 2);
      kit.add("impScreen3", sg, { pos: [cageX + 0.152, 1.75, bz], uv: "keep" });
      kit.box("leds", cageX + 0.152, 1.27, bz, 0.006, 0.03, 1.0, { uv: "keep" });
      kit.box("emitRed", cageX + 0.152, 2.24, bz, 0.006, 0.03, 0.5);
    }
  }

  // ------------------------------------------------------------------ visitor side: bench, return lockers, roster screens
  {
    const bx = -45.0;
    const bz = min[2] + 0.75;
    kit.box("paintedMetal", bx, 0.42, bz, 3.0, 0.06, 0.4, { color: PALETTE.impDark, texel: 2 });
    kit.box("rubber", bx, 0.475, bz, 2.96, 0.05, 0.36, { color: PALETTE.rubber });
    for (const s of [-1, 1]) kit.box("paintedMetal", bx + s * 1.3, 0.2, bz, 0.08, 0.4, 0.34, { color: PALETTE.impBlack, texel: 2 });
    kit.box("paintedMetal", bx, 0.12, bz, 2.4, 0.04, 0.05, { color: PALETTE.impMid, texel: 2 });
    kit.collider([bx - 1.55, 0, bz - 0.25], [bx + 1.55, 0.55, bz + 0.25], "bench");
    // helmet left on the bench + a kit bag
    helmet(kit, bx - 0.8, 0.5, bz, 0.4);
    kit.box("fabric", bx + 0.7, 0.62, bz, 0.5, 0.24, 0.3, { color: PALETTE.impDark, uv: "world", texel: 2, rot: [0, 0.3, 0] });
    lockerBank(kit, ctx, { x: -44.6, z: max[2], yaw: Math.PI, n: 5, w: 0.5, h: 2.0, d: 0.5, seed: ctx.seed + 41, color: PALETTE.impMid, lamp: "emitRed" });
    wallSign(kit, ctx, { side: "zmax", u: max[0] - -44.6, v: 2.45, w: 1.2, cell: SIGN.CHARGE, lit: false });
    wallScreen(kit, ctx, { side: "xmax", u: -40.4 - min[2], v: 1.9, w: 1.3, h: 0.8, screen: 1 });
    wallScreen(kit, ctx, { side: "xmax", u: -31.6 - min[2], v: 1.9, w: 1.3, h: 0.8, screen: 3 });
    const seg = wallSegment(ctx.bounds, "xmax");
    const { frame } = wallFrame(kit, seg.from, seg.to, 0); // u = z - min.z
    intercom(frame, -38.0 - min[2], 1.5);
    frame.add("decal", new THREE.PlaneGeometry(0.4, 0.4), -33.4 - min[2], 2.7, 0.004, { uv: "keep", uvRect: decalRect(5) });
    ventGrille(frame, -42.6 - min[2], 0.4, 0.8, 0.35);
    ventGrille(frame, -29.4 - min[2], 0.4, 0.8, 0.35);
    wallGrime(kit, ctx, "xmax", -29.0 - min[2], 0.5, 1.4, 0.6);
    scuffRun(kit, -43.2, counterZ, -47.0, counterZ, 4, ctx.seed + 43, 0.9);
    scuffRun(kit, -46.6, counterZ + 1.0, -46.9, counterZ + 2.0, 2, ctx.seed + 44, 0.7);
  }

  // ------------------------------------------------------------------ inside the cage: racks, armour, charging, crates
  weaponRack(kit, ctx, { x: -54.2, z: min[2] + 0.2, yaw: 0, n: 7, seed: ctx.seed + 51 });
  weaponRack(kit, ctx, { x: -52.0, z: min[2] + 0.2, yaw: 0, n: 7, seed: ctx.seed + 52 });
  weaponRack(kit, ctx, { x: -49.6, z: min[2] + 0.2, yaw: 0, n: 5, seed: ctx.seed + 53, heavy: true });
  weaponRack(kit, ctx, { x: -54.2, z: max[2] - 0.2, yaw: Math.PI, n: 7, seed: ctx.seed + 54 });
  weaponRack(kit, ctx, { x: -52.0, z: max[2] - 0.2, yaw: Math.PI, n: 7, seed: ctx.seed + 55 });
  chargeRack(kit, ctx, { x: -49.4, z: max[2] - 0.2, yaw: Math.PI, seed: ctx.seed + 56 });
  // central island: two racks back to back along z
  weaponRack(kit, ctx, { x: -51.4, z: -36.0, yaw: Math.PI / 2, n: 8, seed: ctx.seed + 57 });
  weaponRack(kit, ctx, { x: -51.4, z: -36.0, yaw: -Math.PI / 2, n: 8, seed: ctx.seed + 58 });
  kit.box("paintedMetal", -51.4, 2.24, -36.0, 0.5, 0.1, 2.3, { color: PALETTE.impBlack, texel: 2 });
  kit.box("emitWhiteDim", -51.4, 2.3, -36.0, 0.3, 0.02, 2.0, { uv: "keep" });
  // armour stands along the xmin wall
  for (let i = 0; i < 6; i++) {
    const z = -42.2 + i * 2.5;
    armourStand(kit, -55.2, z, Math.PI / 2, ctx.seed + 61 + i);
  }
  {
    const seg = wallSegment(ctx.bounds, "xmin");
    const { frame } = wallFrame(kit, seg.from, seg.to, 0); // u = max.z - z
    wallSign(kit, ctx, { side: "xmin", u: max[2] - -36, v: 3.15, w: 1.6, cell: SIGN.RESTRICTED, lit: true });
    cableTray(kit, ctx, "xmin", 0.8, 15.2, 2.9);
    for (let i = 0; i < 6; i++) {
      const u = max[2] - (-42.2 + i * 2.5);
      frame.box("darkGloss", u, 2.2, 0.012, 0.4, 0.12, 0.01);
      frame.add("decal", new THREE.PlaneGeometry(0.22, 0.22), u, 2.5, 0.004, { uv: "keep", uvRect: decalRect(i % 2 ? 6 : 9) });
      frame.box(i === 3 ? "emitRed" : "emitBlue", u - 0.25, 2.2, 0.02, 0.03, 0.03, 0.006);
    }
    ventGrille(frame, 2.0, 0.4, 0.8, 0.35);
    ventGrille(frame, 14.0, 0.4, 0.8, 0.35);
    wallGrime(kit, ctx, "xmin", 8.0, 0.45, 2.4, 0.55);
  }
  // munitions crates stacked in the far corners + a hand truck
  crate(kit, ctx, { x: -49.0, z: -42.6, sx: 1.2, sy: 0.9, sz: 1.0, yaw: 0.05, seed: ctx.seed + 71, color: PALETTE.impDark });
  crate(kit, ctx, { x: -49.0, y: 0.9, z: -42.6, sx: 1.0, sy: 0.7, sz: 0.9, yaw: -0.08, seed: ctx.seed + 72, color: PALETTE.impMid });
  crate(kit, ctx, { x: -48.6, z: -30.6, sx: 1.0, sy: 0.8, sz: 1.0, yaw: 0.2, seed: ctx.seed + 73, color: PALETTE.impDark });
  crate(kit, ctx, { x: -48.6, z: -29.3, sx: 1.0, sy: 0.6, sz: 1.0, yaw: -0.1, seed: ctx.seed + 74, color: PALETTE.impGrey });
  {
    const hx = -48.9;
    const hz = -40.6;
    kit.box("paintedMetal", hx, 0.2, hz, 0.5, 0.04, 0.6, { color: PALETTE.impDark, texel: 2, rot: [0.15, 0, 0] });
    kit.box("paintedMetal", hx, 0.7, hz + 0.28, 0.5, 1.1, 0.04, { color: PALETTE.impMid, texel: 2, rot: [0.15, 0, 0] });
    for (const s of [-1, 1]) kit.cyl("rubber", hx + s * 0.28, 0.1, hz + 0.25, 0.1, 0.06, "x", { color: PALETTE.rubber, segments: 12 });
    kit.box("impPanel1", hx, 0.5, hz - 0.02, 0.44, 0.5, 0.4, { color: PALETTE.impMid, uv: "keep", rot: [0.15, 0, 0] });
    kit.collider([hx - 0.3, 0, hz - 0.35], [hx + 0.3, 1.3, hz + 0.35], "handtruck");
  }
  // gun-cleaning bench between the island and the cage: a stripped rifle laid out, vice, lamp, tools
  {
    const bx = -49.2;
    const bz = -38.9;
    kit.box("paintedMetal", bx, 0.86, bz, 0.8, 0.06, 2.6, { color: PALETTE.impMid, texel: 2 });
    kit.box("metal", bx, 0.9, bz, 0.78, 0.02, 2.56, { color: PALETTE.steel, texel: 1 });
    kit.box("paintedMetal", bx, 0.42, bz, 0.7, 0.8, 2.4, { color: PALETTE.impDark, texel: 1.5 });
    for (const dz of [-0.75, 0.05, 0.85]) {
      kit.box("impPanel", bx + 0.36, 0.55, bz + dz, 0.02, 0.36, 0.7, { color: PALETTE.impGrey, uv: "keep" });
      kit.box("paintedMetal", bx + 0.375, 0.55, bz + dz + 0.2, 0.01, 0.03, 0.14, { color: PALETTE.impBlack, texel: 2 });
    }
    kit.box("paintedMetal", bx, 0.05, bz, 0.74, 0.1, 2.44, { color: PALETTE.impBlack, texel: 2 });
    // the stripped rifle: receiver in the vice, barrel, stock and small parts on a cloth
    kit.box("fabric", bx, 0.915, bz - 0.3, 0.6, 0.01, 1.2, { color: PALETTE.impDark, uv: "world", texel: 2 });
    kit.box("paintedMetal", bx + 0.15, 1.0, bz + 0.9, 0.24, 0.2, 0.16, { color: PALETTE.impBlack, texel: 2 });
    kit.box("metal", bx + 0.15, 1.02, bz + 0.9, 0.3, 0.06, 0.04, { color: PALETTE.steel });
    kit.cyl("metal", bx + 0.32, 1.02, bz + 0.9, 0.015, 0.16, "z", { color: PALETTE.steel, segments: 6 });
    kit.box("paintedMetal", bx + 0.15, 1.15, bz + 0.9, 0.46, 0.09, 0.05, { color: PALETTE.impBlack, texel: 3, rot: [0, Math.PI / 2, 0] });
    kit.cyl("metal", bx - 0.15, 0.94, bz - 0.5, 0.013, 0.5, "z", { color: PALETTE.gunmetal, segments: 8 });
    kit.box("paintedMetal", bx + 0.1, 0.94, bz - 0.7, 0.05, 0.05, 0.28, { color: PALETTE.impDark, texel: 3 });
    kit.box("paintedMetal", bx - 0.05, 0.94, bz - 0.05, 0.16, 0.045, 0.05, { color: PALETTE.impDark, texel: 3 });
    for (let i = 0; i < 6; i++) kit.cyl("metal", bx - 0.22 + (i % 3) * 0.08, 0.93, bz - 0.15 + Math.floor(i / 3) * 0.1, 0.012, 0.02, "y", { color: PALETTE.steel, segments: 6 });
    // tool tray with drivers, an oil can, a rag, and a hooded bench lamp on an arm
    kit.box("paintedMetal", bx - 0.2, 0.95, bz + 0.4, 0.34, 0.06, 0.5, { color: PALETTE.impBlack, texel: 3 });
    for (let i = 0; i < 5; i++) kit.cyl("metal", bx - 0.32 + i * 0.06, 1.0, bz + 0.4, 0.008, 0.2, "z", { color: i % 2 ? PALETTE.steel : PALETTE.impRed, segments: 6 });
    kit.cyl("metal", bx + 0.22, 1.0, bz - 1.05, 0.045, 0.16, "y", { color: PALETTE.steel, segments: 10 });
    kit.cyl("metal", bx + 0.22, 1.11, bz - 1.05, 0.01, 0.08, "y", { color: PALETTE.gunmetal, segments: 6 });
    kit.box("fabric", bx - 0.2, 0.93, bz - 1.05, 0.3, 0.03, 0.26, { color: PALETTE.impLight, uv: "world", texel: 2, rot: [0, 0.4, 0] });
    kit.cyl("metal", bx - 0.35, 1.3, bz + 1.2, 0.015, 0.8, "y", { color: PALETTE.impMid, segments: 8 });
    kit.cyl("metal", bx - 0.2, 1.7, bz + 0.9, 0.012, 0.7, "z", { color: PALETTE.impMid, segments: 8 });
    kit.box("paintedMetal", bx - 0.1, 1.62, bz + 0.5, 0.36, 0.1, 0.28, { color: PALETTE.impDark, texel: 2 });
    kit.box("emitWhiteSoft", bx - 0.1, 1.565, bz + 0.5, 0.3, 0.01, 0.22, { uv: "keep" });
    kit.collider([bx - 0.42, 0, bz - 1.32], [bx + 0.42, 0.95, bz + 1.32], "bench");
    stool(kit, bx - 0.85, bz + 0.3);
    floorGrime(kit, bx - 0.5, bz - 0.4, 1.2, 1.6, 0.2);
  }
  // issue cart: wheeled flat rack with rifles laid across it, ready for the counter
  {
    const F = propFrame(kit, -49.0, -33.4, 0.12);
    F.box("paintedMetal", 0, 0.08, 0, 1.4, 0.08, 0.7, { color: PALETTE.impBlack, texel: 2 });
    F.box("paintedMetal", 0, 0.62, 0, 1.36, 0.05, 0.66, { color: PALETTE.impMid, texel: 2 });
    F.box("hazard", 0, 0.65, 0, 1.3, 0.012, 0.6, { texel: 3 });
    for (const [dx, dz] of [[-0.6, -0.28], [0.6, -0.28], [-0.6, 0.28], [0.6, 0.28]]) F.box("paintedMetal", dx, 0.35, dz, 0.06, 0.55, 0.06, { color: PALETTE.impDark, texel: 2 });
    for (const dx of [-0.62, 0.62]) F.cyl("rubber", dx, 0.09, 0, 0.09, 0.05, "x", { color: PALETTE.rubber, segments: 12 });
    F.box("metal", 0.72, 0.95, 0, 0.03, 0.03, 0.6, { color: PALETTE.steel });
    for (const s of [-1, 1]) F.box("metal", 0.72, 0.8, s * 0.3, 0.03, 0.32, 0.03, { color: PALETTE.steel });
    for (let i = 0; i < 4; i++) {
      const p = F.at(-0.05, 0, -0.27 + i * 0.18);
      rifle(kit, p.x, 0.7 + (i % 2) * 0.05, p.z, F.q, ctx.seed + 90 + i);
    }
    F.box("darkGloss", 0.5, 0.66, 0.22, 0.2, 0.012, 0.14);
    F.collider(-0.72, -0.36, 0.78, 0.36, 1.0, "cart");
  }
  floorGrime(kit, -52.0, -42.2, 4.0, 1.6, 0.0);
  floorGrime(kit, -52.0, -29.8, 4.0, 1.6, 0.0);
  floorGrime(kit, -55.0, -36, 1.4, 6.0, 0.0);
  scuffRun(kit, -47.2, gate[0] + 0.5, -53.0, -37.0, 5, ctx.seed + 81, 0.9);
  floorSign(kit, SIGN.RESTRICTED, -52.0, -40.6, 1.6, Math.PI / 2, false);
  if (ctx.audioZone) ctx.audioZone({ kind: "hum", pos: [-49, 1.5, -36], radius: 8 });
}
