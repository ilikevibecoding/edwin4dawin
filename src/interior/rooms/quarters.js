// Deck 3 — Crew Quarters (d3_quarters). A 30 m central aisle under dim blue night lighting with
// seven sleeping bays either side: each bay is a partitioned cubicle with two pairs of triple bunks,
// footlockers, a rear locker wall and a small table. Amber reading lamps glow inside the stacks. A
// wash alcove with a trough sink and refresher cubicles closes the far end; a duty desk sits by the
// door.
import * as THREE from "three";
import { PALETTE } from "../../materials.js";
import { roomShell, wallScreen, impConsole, wallSegment, IMP_THEME } from "../imperial.js";
import { pointLight, wallFrame, ceilingFrame, panelGrid } from "../builders.js";
import { rng } from "../../kit.js";
import { decalRect, GRATE_TILE } from "../../textures.js";
import { ensureCrewMaterials, SIGN, baySign, signRect, wallSign, lockerBank, floorGrime, scuffRun, wallGrime, cableTray, ventGrille, intercom, stool, wallShelf } from "./crewProps.js";

const BUNK_W = 0.9;
const BUNK_L = 2.0;

/**
 * Triple bunk stack. Footprint x0..x0+0.9, z0..z0+2.0. `open` = +1: the open (alcove) side faces +x.
 * `aisleEnd` = "zmax" | "zmin": which short end faces the aisle (gets the privacy panel + ladder).
 */
function bunkStack(kit, ctx, { x0, z0, open, aisleEnd, seed, bay, privacy = true }) {
  const rand = rng(seed);
  const x1 = x0 + BUNK_W;
  const z1 = z0 + BUNK_L;
  const xc = (x0 + x1) / 2;
  const zc = (z0 + z1) / 2;
  const H = 2.62;
  const tiers = [0.32, 1.12, 1.92];
  const back = open > 0 ? x0 + 0.03 : x1 - 0.03; // back (partition) side x
  // corner posts + back-side rails
  for (const px of [x0 + 0.03, x1 - 0.03]) for (const pz of [z0 + 0.03, z1 - 0.03]) kit.box("paintedMetal", px, H / 2, pz, 0.06, H, 0.06, { color: PALETTE.impBlack, texel: 2 });
  kit.box("paintedMetal", back, H - 0.03, zc, 0.04, 0.06, BUNK_L, { color: PALETTE.impBlack, texel: 2 });
  // back panel (privacy / structure) full height on the closed long side
  kit.box("impPanel1", back + (open > 0 ? 0.02 : -0.02), H / 2, zc, 0.03, H - 0.05, BUNK_L - 0.1, { color: PALETTE.impGrey, uv: "keep" });
  const headZ = aisleEnd === "zmax" ? z0 + 0.3 : z1 - 0.3;
  for (let t = 0; t < tiers.length; t++) {
    const y = tiers[t];
    // platform + side rail toward the alcove
    kit.box("paintedMetal", xc, y - 0.04, zc, BUNK_W, 0.08, BUNK_L, { color: PALETTE.impDark, texel: 1.5 });
    kit.box("paintedMetal", open > 0 ? x1 - 0.02 : x0 + 0.02, y + 0.02, zc, 0.03, 0.12, BUNK_L, { color: PALETTE.impMid, texel: 2 });
    // mattress (light grey sheet), blanket (grey / charcoal), pillow at the head end
    kit.box("fabric", xc, y + 0.06, zc, BUNK_W - 0.12, 0.12, BUNK_L - 0.12, { color: PALETTE.impLight, uv: "world", texel: 2 });
    const r = rand();
    const blanketCol = r < 0.5 ? PALETTE.impMid : r < 0.8 ? PALETTE.impDark : PALETTE.impGrey;
    if (rand() < 0.75) {
      // blanket spread over the foot two thirds
      const footward = aisleEnd === "zmax" ? 1 : -1;
      kit.box("fabric", xc, y + 0.13, zc + footward * 0.3, BUNK_W - 0.1, 0.05, 1.25, { color: blanketCol, uv: "world", texel: 2 });
    } else {
      // folded blanket at the foot
      const footZ = aisleEnd === "zmax" ? z1 - 0.35 : z0 + 0.35;
      kit.box("fabric", xc, y + 0.17, footZ, BUNK_W - 0.3, 0.12, 0.45, { color: blanketCol, uv: "world", texel: 2 });
    }
    kit.box("fabric", xc, y + 0.15, headZ, 0.5, 0.09, 0.32, { color: PALETTE.impWhite, uv: "world", texel: 2 });
    // occasional personal item: helmet, datapad, folded tunic
    const item = rand();
    if (item < 0.15) kit.add("crew_white", new THREE.SphereGeometry(0.15, 12, 8), { pos: [xc, y + 0.27, zc + (aisleEnd === "zmax" ? 0.55 : -0.55)], color: PALETTE.impWhite });
    else if (item < 0.3) kit.box("darkGloss", xc + 0.15, y + 0.135, zc, 0.22, 0.015, 0.15);
    else if (item < 0.42) kit.box("fabric", xc - 0.1, y + 0.16, zc + (aisleEnd === "zmax" ? 0.45 : -0.45), 0.35, 0.07, 0.3, { color: PALETTE.impBlack, uv: "world", texel: 2 });
    // reading lamp on the back panel near the head + a lit strip under the tier above
    const lit = rand() < 0.55;
    const lampX = back + (open > 0 ? 0.08 : -0.08);
    kit.box("paintedMetal", lampX, y + 0.62, headZ, 0.1, 0.07, 0.14, { color: PALETTE.impBlack, texel: 2 });
    kit.box(lit ? "emitAmber" : "rubber", lampX + (open > 0 ? 0.052 : -0.052), y + 0.6, headZ, 0.006, 0.04, 0.1, { color: PALETTE.rubber });
    // small personal screen / shelf on the back panel at the foot end
    const footZ2 = aisleEnd === "zmax" ? z1 - 0.4 : z0 + 0.4;
    if (t < 2 || rand() < 0.5) {
      kit.box("darkGloss", lampX, y + 0.55, footZ2, 0.02, 0.16, 0.24);
      if (rand() < 0.7) {
        const sg = new THREE.PlaneGeometry(0.2, 0.12);
        sg.rotateY(open > 0 ? Math.PI / 2 : -Math.PI / 2);
        kit.add("impScreen0", sg, { pos: [lampX + (open > 0 ? 0.012 : -0.012), y + 0.55, footZ2], uv: "keep" });
      }
    }
  }
  // ladder on the open side at the aisle end
  const lz = aisleEnd === "zmax" ? z1 - 0.12 : z0 + 0.12;
  const lx = open > 0 ? x1 + 0.05 : x0 - 0.05;
  for (const dz of [-0.14, 0.14]) kit.cyl("metal", lx, 1.15, lz + dz, 0.014, 2.2, "y", { color: PALETTE.steel, segments: 6 });
  for (let k = 0; k < 7; k++) kit.cyl("metal", lx, 0.3 + k * 0.3, lz, 0.012, 0.3, "z", { color: PALETTE.steel, segments: 6 });
  // privacy panel at the aisle end: grey panel with a bay stencil, black frame
  if (privacy) {
    const pz = aisleEnd === "zmax" ? z1 + 0.02 : z0 - 0.02;
    kit.box("impPanel", xc, H / 2, pz, BUNK_W + 0.06, H, 0.04, { color: PALETTE.impGrey, uv: "keep" });
    kit.box("paintedMetal", xc, H / 2, pz, BUNK_W + 0.1, 0.06, 0.06, { color: PALETTE.impBlack, texel: 2 });
    kit.box("paintedMetal", xc, 0.08, pz, BUNK_W + 0.1, 0.16, 0.06, { color: PALETTE.impBlack, texel: 2 });
    if (bay !== undefined) {
      const g = new THREE.PlaneGeometry(0.7, 0.175);
      g.rotateY(aisleEnd === "zmax" ? 0 : Math.PI);
      kit.add("crew_signLit", g, { pos: [xc, 2.25, pz + (aisleEnd === "zmax" ? 0.025 : -0.025)], uv: "keep", uvRect: signRect(baySign(bay)) });
      const d = new THREE.PlaneGeometry(0.3, 0.3);
      d.rotateY(aisleEnd === "zmax" ? 0 : Math.PI);
      kit.add("decal", d, { pos: [xc, 1.3, pz + (aisleEnd === "zmax" ? 0.022 : -0.022)], uv: "keep", uvRect: decalRect(seed % 2 ? 9 : 6) });
    }
  }
  kit.collider([x0 - 0.02, 0, z0 - 0.04], [x1 + 0.02, H, z1 + 0.04], "bunk");
  if (open > 0) kit.collider([x1, 0, lz - 0.2], [x1 + 0.1, 2.3, lz + 0.2], "ladder");
  else kit.collider([x0 - 0.1, 0, lz - 0.2], [x0, 2.3, lz + 0.2], "ladder");
}

function footlocker(kit, x, z, yaw, seed) {
  const rand = rng(seed);
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const add = (mat, geo, lx, ly, lz, extra = {}) => {
    const p = new THREE.Vector3(lx, ly, lz).applyQuaternion(q).add(new THREE.Vector3(x, 0, z));
    kit.add(mat, geo, { pos: [p.x, p.y, p.z], quat: q, ...extra });
  };
  add("impPanel1", new THREE.BoxGeometry(0.8, 0.42, 0.45), 0, 0.23, 0, { color: rand() < 0.3 ? PALETTE.impMid : PALETTE.impGrey, uv: "keep" });
  add("paintedMetal", new THREE.BoxGeometry(0.84, 0.05, 0.49), 0, 0.045, 0, { color: PALETTE.impBlack, texel: 2 });
  add("paintedMetal", new THREE.BoxGeometry(0.84, 0.03, 0.49), 0, 0.43, 0, { color: PALETTE.impBlack, texel: 2 });
  add("metal", new THREE.BoxGeometry(0.2, 0.03, 0.02), 0, 0.3, 0.235, { color: PALETTE.steel });
  add(rand() < 0.5 ? "emitBlue" : "rubber", new THREE.BoxGeometry(0.03, 0.02, 0.006), 0.3, 0.3, 0.232, { color: PALETTE.rubber });
  if (rand() < 0.35) {
    // boots on top
    add("rubber", new THREE.BoxGeometry(0.11, 0.26, 0.3), -0.12, 0.58, 0, { color: PALETTE.rubber });
    add("rubber", new THREE.BoxGeometry(0.11, 0.26, 0.3), 0.08, 0.58, 0.02, { color: PALETTE.rubber });
  }
  kit.collider([x - 0.45, 0, z - 0.3], [x + 0.45, 0.45, z + 0.3], "footlocker");
}

export function buildQuarters(kit, ctx) {
  ensureCrewMaterials(ctx);
  const [min, max] = ctx.bounds; // x -34..-2.9, y 0..3.6, z -30..-8
  const H = max[1];
  const rand = rng(ctx.seed + 9);
  const aisleZ = -19;

  roomShell(kit, ctx, {
    ceiling: false,
    walls: { rows: [0, 0.5, 2.1, 2.9, H], styles: { panel: 0.7, vent: 0.1, greeble: 0.08, strip: 0.04, screen: 0.03, conduit: 0.05 }, paints: [[PALETTE.impLight, 0.55], [PALETTE.impWhite, 0.25], [PALETTE.impGrey, 0.14], [PALETTE.impMid, 0.06]] },
  });
  // night ceiling: large dark panels (cheap) and one dim blue strip over the aisle instead of the
  // white strips impCeiling would add
  {
    const f = ceilingFrame(kit, min[0], min[2], H);
    panelGrid(f, max[0] - min[0], max[2] - min[2], {
      rowH: 2.2,
      panelW: 2.2,
      kick: false,
      topPipes: false,
      seed: ctx.seed * 17 + 3,
      collide: false,
      styles: { panel: 0.86, greeble: 0.06, vent: 0.08 },
      paints: [[PALETTE.impGrey, 0.55], [PALETTE.impMid, 0.45]],
      ...IMP_THEME,
      accent: "emitBlue",
      decals: false,
    });
    const L = max[0] - min[0] - 1.2;
    kit.box("paintedMetal", (min[0] + max[0]) / 2, H - 0.06, aisleZ, L + 0.2, 0.1, 0.42, { color: PALETTE.impDark, texel: 2 });
    kit.box("emitBlue", (min[0] + max[0]) / 2, H - 0.1, aisleZ, L, 0.03, 0.07, { uv: "keep" });
  }

  // ------------------------------------------------------------------ lights (6): blue night + amber bays + wash
  for (const x of [-8.5, -18.5, -28.5]) ctx.light(pointLight(0x3d6fe8, 9, 17, [x, H - 0.5, aisleZ]));
  ctx.light(pointLight(0xffb060, 3.2, 6, [-7.85, 1.8, -21.4]));
  ctx.light(pointLight(0xffb060, 3.2, 6, [-11.45, 1.8, -16.6]));
  ctx.light(pointLight(0xdfe8ff, 5, 7, [-33.0, 2.8, aisleZ]));

  // blue floor light channels along both aisle edges
  for (const z of [aisleZ - 1.3, aisleZ + 1.3]) {
    kit.boxMM("paintedMetal", [-33.6, 0, z - 0.08], [-3.6, 0.02, z + 0.08], { color: PALETTE.impBlack, texel: 2 });
    kit.boxMM("emitBlue", [-33.4, 0.02, z - 0.025], [-3.8, 0.03, z + 0.025]);
  }
  // ceiling: blue strip lights over each bay lane
  const bayX0 = -31.0;
  const pitch = 3.6;
  const nBays = 7;
  for (let i = 0; i < nBays; i++) {
    const xb = bayX0 + i * pitch;
    const xc = xb + 1.55;
    for (const s of [-1, 1]) {
      const z0 = s < 0 ? -29.6 : aisleZ + 1.5;
      const z1 = s < 0 ? aisleZ - 1.5 : -8.4;
      kit.box("paintedMetal", xc, H - 0.05, (z0 + z1) / 2, 0.3, 0.08, z1 - z0, { color: PALETTE.impDark, texel: 2 });
      kit.box("emitBlue", xc, H - 0.095, (z0 + z1) / 2, 0.08, 0.02, z1 - z0 - 0.4);
    }
  }

  // ------------------------------------------------------------------ bays
  for (let i = 0; i < nBays; i++) {
    const xb = bayX0 + i * pitch;
    const bunkA = xb; // x xb..xb+0.9, open toward +x
    const bunkB = xb + 2.2; // x xb+2.2..xb+3.1, open toward -x
    const alc = xb + 1.55; // alcove centre
    // partition between this bay and the next (and the wash zone before the first)
    const px = xb + 3.35;
    for (const s of [-1, 1]) {
      const zA = s < 0 ? -29.85 : aisleZ + 1.4;
      const zB = s < 0 ? aisleZ - 1.4 : -8.15;
      kit.box("impPanel1", px, 1.4, (zA + zB) / 2, 0.12, 2.8, zB - zA, { color: i % 3 === 1 ? PALETTE.impGrey : PALETTE.impLight, uv: "keep" });
      kit.box("paintedMetal", px, 2.83, (zA + zB) / 2, 0.16, 0.06, zB - zA, { color: PALETTE.impBlack, texel: 2 });
      kit.box("paintedMetal", px, 0.06, (zA + zB) / 2, 0.16, 0.12, zB - zA, { color: PALETTE.impBlack, texel: 2 });
      kit.collider([px - 0.08, 0, Math.min(zA, zB)], [px + 0.08, 2.85, Math.max(zA, zB)], "partition");
      if (i === 0) {
        const px0 = xb - 0.25;
        kit.box("impPanel1", px0, 1.4, (zA + zB) / 2, 0.12, 2.8, zB - zA, { color: PALETTE.impLight, uv: "keep" });
        kit.box("paintedMetal", px0, 2.83, (zA + zB) / 2, 0.16, 0.06, zB - zA, { color: PALETTE.impBlack, texel: 2 });
        kit.collider([px0 - 0.08, 0, Math.min(zA, zB)], [px0 + 0.08, 2.85, Math.max(zA, zB)], "partition");
      }
      // aisle-end lintel over the bay opening with a lit bay number
      const lz = s < 0 ? aisleZ - 1.42 : aisleZ + 1.42;
      kit.box("paintedMetal", alc, 2.75, lz, 3.3, 0.2, 0.12, { color: PALETTE.impDark, texel: 2 });
      const g = new THREE.PlaneGeometry(0.9, 0.225);
      g.rotateY(s < 0 ? 0 : Math.PI);
      kit.add("crew_signLit", g, { pos: [alc, 2.75, lz + (s < 0 ? 0.065 : -0.065)], uv: "keep", uvRect: signRect(baySign(nBays - i)) });
    }
    for (const s of [-1, 1]) {
      // pair 1 (aisle end) and pair 2 (deeper), heads away from the aisle
      const aisleEnd = s < 0 ? "zmax" : "zmin";
      const p1z0 = s < 0 ? aisleZ - 1.4 - BUNK_L : aisleZ + 1.4;
      const p2z0 = s < 0 ? p1z0 - 3.6 : p1z0 + 3.6;
      const seedBase = ctx.seed * 7 + i * 31 + (s < 0 ? 0 : 500);
      bunkStack(kit, ctx, { x0: bunkA, z0: p1z0, open: 1, aisleEnd, seed: seedBase + 1, bay: nBays - i });
      bunkStack(kit, ctx, { x0: bunkB, z0: p1z0, open: -1, aisleEnd, seed: seedBase + 2, bay: nBays - i });
      bunkStack(kit, ctx, { x0: bunkA, z0: p2z0, open: 1, aisleEnd, seed: seedBase + 3, privacy: false });
      bunkStack(kit, ctx, { x0: bunkB, z0: p2z0, open: -1, aisleEnd, seed: seedBase + 4, privacy: false });
      // footlockers at the head ends of pair 1 (in the cross lane) and pair 2
      const laneZ = s < 0 ? p1z0 - 0.3 : p1z0 + BUNK_L + 0.3;
      footlocker(kit, bunkA + 0.45, laneZ, 0, seedBase + 5);
      footlocker(kit, bunkB + 0.45, laneZ, 0.06, seedBase + 6);
      const lane2Z = s < 0 ? p2z0 - 0.3 : p2z0 + BUNK_L + 0.3;
      footlocker(kit, alc, lane2Z, Math.PI / 2, seedBase + 7);
      // rear zone: locker wall along the outer bulkhead, a table with two stools in the alcove
      const wallZ = s < 0 ? min[2] : max[2];
      lockerBank(kit, ctx, { x: alc, z: wallZ, yaw: s < 0 ? 0 : Math.PI, n: 6, w: 0.5, h: 2.0, d: 0.5, seed: seedBase + 8, color: i % 2 ? PALETTE.impGrey : PALETTE.impLight });
      const tz = s < 0 ? min[2] + 1.9 : max[2] - 1.9;
      kit.box("paintedMetal", alc, 0.72, tz, 0.9, 0.05, 0.7, { color: PALETTE.impDark, texel: 2 });
      kit.box("darkGloss", alc, 0.752, tz, 0.84, 0.012, 0.64);
      kit.cyl("metal", alc, 0.35, tz, 0.05, 0.7, "y", { color: PALETTE.impMid, segments: 10 });
      kit.cyl("metal", alc, 0.02, tz, 0.3, 0.04, "y", { color: PALETTE.impBlack, segments: 14 });
      kit.collider([alc - 0.45, 0, tz - 0.35], [alc + 0.45, 0.78, tz + 0.35], "table");
      stool(kit, alc - 0.7, tz + (s < 0 ? 0.1 : -0.1));
      if (rand() < 0.7) stool(kit, alc + 0.7, tz - (s < 0 ? 0.15 : -0.15));
      // cups / datapad on the table
      kit.cyl("metal", alc + 0.2, 0.81, tz + 0.1, 0.04, 0.1, "y", { color: PALETTE.steel, segments: 8 });
      if (rand() < 0.5) kit.box("darkGloss", alc - 0.2, 0.765, tz - 0.1, 0.22, 0.015, 0.15);
      // wall screen above the lockers (every other bay), a vent in the rest
      const side = s < 0 ? "zmin" : "zmax";
      const u = s < 0 ? alc - min[0] : max[0] - alc;
      if (i % 2 === 0) wallScreen(kit, ctx, { side, u, v: 2.75, w: 1.2, h: 0.6, screen: 0 });
      else {
        const seg = wallSegment(ctx.bounds, side);
        const { frame } = wallFrame(kit, seg.from, seg.to, 0);
        ventGrille(frame, u, 2.75, 0.9, 0.4);
      }
      // rubber mat down the alcove floor + a scuffed patch
      const mz0 = s < 0 ? min[2] + 0.6 : aisleZ + 1.5;
      const mz1 = s < 0 ? aisleZ - 1.5 : max[2] - 0.6;
      kit.boxMM("rubber", [alc - 0.55, 0, mz0], [alc + 0.55, 0.012, mz1], { color: PALETTE.rubber, texel: 2 });
      floorGrime(kit, alc, laneZ, 1.4, 1.0, rand() * 0.5);
    }
  }

  // ------------------------------------------------------------------ door-end zone (x -5.8..-3.4): duty desk + notice screens
  {
    impConsole(kit, ctx, { x: -4.5, z: -22.4, yaw: -Math.PI / 2, w: 1.6, d: 0.7, screens: [0, 2], chair: true, seed: ctx.seed + 4 });
    wallScreen(kit, ctx, { side: "xmax", u: -15.6 - min[2], v: 1.9, w: 1.6, h: 0.9, screen: 2 });
    wallScreen(kit, ctx, { side: "xmax", u: -23.6 - min[2], v: 2.3, w: 1.0, h: 0.6, screen: 4 });
    // lockers either side against the end walls
    lockerBank(kit, ctx, { x: -4.6, z: min[2], yaw: 0, n: 4, w: 0.5, h: 2.0, d: 0.5, seed: ctx.seed + 44 });
    lockerBank(kit, ctx, { x: -4.6, z: max[2], yaw: Math.PI, n: 4, w: 0.5, h: 2.0, d: 0.5, seed: ctx.seed + 45, color: PALETTE.impLight });
    const seg = wallSegment(ctx.bounds, "xmax");
    const { frame } = wallFrame(kit, seg.from, seg.to, 0);
    intercom(frame, -17.4 - min[2], 1.45);
    wallShelf(frame, -15.6 - min[2], 1.2, 1.4, 0.25);
    for (let k = 0; k < 4; k++) frame.box("darkGloss", -16.1 - min[2] + k * 0.32, 1.28, 0.12, 0.22, 0.13, 0.02);
    frame.collider(-16.3 - min[2], -14.9 - min[2], 1.0, 1.4, 0, 0.27, "shelf");
  }
  wallSign(kit, ctx, { side: "xmax", u: aisleZ - min[2], v: 3.33, w: 1.8, cell: SIGN.QUARTERS, lit: true });

  // ------------------------------------------------------------------ wash alcove at the far end (x -34..-31.25)
  {
    const seg = wallSegment(ctx.bounds, "xmin");
    const { frame } = wallFrame(kit, seg.from, seg.to, 0); // u = max.z - z
    const u = max[2] - aisleZ; // 11
    // trough sink along the xmin wall, four taps, mirror strip, vanity light
    frame.box("paintedMetal", u, 0.42, 0.3, 3.2, 0.84, 0.6, { color: PALETTE.impDark, texel: 1.5 });
    frame.box("metal", u, 0.87, 0.32, 3.3, 0.06, 0.66, { color: PALETTE.steel, texel: 1 });
    frame.box("darkGloss", u, 0.905, 0.36, 3.0, 0.012, 0.44);
    for (let k = 0; k < 4; k++) {
      const tu = u - 1.2 + k * 0.8;
      frame.cylV("metal", tu, 1.05, 0.12, 0.016, 0.34, { color: PALETTE.steel, segments: 8 });
      frame.cylN("metal", tu, 1.22, 0.22, 0.016, 0.24, { color: PALETTE.steel, segments: 8 });
      frame.box("rubber", tu, 1.26, 0.12, 0.08, 0.02, 0.03, { color: PALETTE.rubber });
      frame.box("impPanel", tu, 0.42, 0.61, 0.7, 0.6, 0.02, { color: PALETTE.impGrey, uv: "keep" });
    }
    frame.box("darkGloss", u, 1.75, 0.02, 3.0, 0.7, 0.02);
    frame.box("paintedMetal", u, 1.75, 0.0, 3.1, 0.8, 0.02, { color: PALETTE.impBlack, texel: 2 });
    frame.box("paintedMetal", u, 2.2, 0.06, 3.1, 0.08, 0.12, { color: PALETTE.impDark, texel: 2 });
    frame.box("emitWhiteSoft", u, 2.165, 0.1, 2.9, 0.02, 0.06, { uv: "keep" });
    frame.collider(u - 1.65, u + 1.65, 0, 1.0, 0, 0.66, "sink");
    // towel hooks with towels
    for (let k = 0; k < 3; k++) {
      const tu = u - 2.0 + k * 0.25;
      frame.box("metal", tu, 1.35, 0.04, 0.03, 0.03, 0.08, { color: PALETTE.steel });
      frame.box("fabric", tu, 1.05, 0.06, 0.16, 0.6, 0.04, { color: k === 1 ? PALETTE.impMid : PALETTE.impWhite, uv: "world", texel: 3 });
    }
    // WASH sign + a floor drain grate
    wallSign(kit, ctx, { side: "xmin", u, v: 2.7, w: 1.0, cell: SIGN.WASH, lit: true });
    const g = new THREE.PlaneGeometry(1.24, 0.9);
    g.rotateX(-Math.PI / 2);
    kit.boxMM("paintedMetal", [-33.3, -0.08, aisleZ - 0.45], [-32.06, 0.0, aisleZ + 0.45], { color: PALETTE.impBlack, texel: 2 });
    kit.add("grate", g, { pos: [-32.68, 0.003, aisleZ], uv: "scale", uvScale: [1, 1] });
    // refresher cubicles either side of the alcove (doors facing +x), occupancy lamps
    for (const s of [-1, 1]) {
      for (let k = 0; k < 3; k++) {
        const zc = s < 0 ? -22.6 - k * 1.5 : -15.4 + k * 1.5;
        const dx = -31.9;
        kit.box("impPanel1", dx, 1.1, zc, 0.06, 2.2, 1.3, { color: PALETTE.impLight, uv: "keep" });
        kit.box("paintedMetal", dx - 0.02, 1.1, zc - 0.7, 0.1, 2.3, 0.1, { color: PALETTE.impBlack, texel: 2 });
        kit.box("paintedMetal", dx - 0.02, 1.1, zc + 0.7, 0.1, 2.3, 0.1, { color: PALETTE.impBlack, texel: 2 });
        kit.box("paintedMetal", dx - 0.02, 2.3, zc, 0.1, 0.1, 1.5, { color: PALETTE.impBlack, texel: 2 });
        kit.box(k === 1 ? "emitRed" : "emitGreen", dx + 0.035, 1.9, zc, 0.01, 0.04, 0.16);
        kit.box("metal", dx + 0.04, 1.0, zc + 0.45, 0.02, 0.2, 0.03, { color: PALETTE.steel });
        for (let v = 0; v < 5; v++) kit.box("paintedMetal", dx + 0.032, 0.4 + v * 0.05, zc, 0.006, 0.012, 0.6, { color: PALETTE.impBlack, texel: 2 });
        kit.collider([min[0], 0, zc - 0.75], [dx + 0.05, 2.35, zc + 0.75], "refresher");
      }
    }
    // pipes above the sink to the ceiling
    frame.cylU("metal", u, 2.45, 0.08, 0.04, 3.4, { color: PALETTE.steel, segments: 10 });
    for (const du of [-1.4, 1.4]) frame.cylV("metal", u + du, 2.9, 0.08, 0.04, 0.9, { color: PALETTE.steel, segments: 10 });
    wallGrime(kit, ctx, "xmin", u, 0.5, 3.0, 0.7);
  }

  // ------------------------------------------------------------------ wear, cables, vents
  scuffRun(kit, -4.0, aisleZ, -31.5, aisleZ, 9, ctx.seed + 51, 1.1);
  floorGrime(kit, -33.5, -29.4, 1.2, 1.2, 0.2);
  floorGrime(kit, -33.5, -8.6, 1.2, 1.2, -0.4);
  floorGrime(kit, -3.6, -29.3, 1.0, 1.2, 0.1);
  cableTray(kit, ctx, "xmax", 1.0, 9.0, 3.3);
  cableTray(kit, ctx, "xmax", 13.4, 21.0, 3.3);
  {
    // a blue night lamp fixture over the door with a warning stencil beside it
    const seg = wallSegment(ctx.bounds, "xmax");
    const { frame } = wallFrame(kit, seg.from, seg.to, 0);
    frame.add("decal", new THREE.PlaneGeometry(0.4, 0.4), aisleZ - min[2] + 1.9, 1.9, 0.004, { uv: "keep", uvRect: decalRect(15) });
  }
  if (ctx.audioZone) ctx.audioZone({ kind: "quiet", pos: [-18, 1.5, -19], radius: 12 });
  void GRATE_TILE;
}
