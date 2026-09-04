// d4-hangar rack tiers: two tiers of gantry cradles along both side walls (7 slots per tier per side,
// fighter centres at (+-70, -62 | -46, z 30..90) - clear of both bay doors, 16 m between tiers). Each
// slot: overhead beam from the wall, two hinged clamp arms (closed: hanging 8 m apart on the fighter's
// wing panels; open: swung up clear of the traffic system's approach along the slot's x axis), carriage
// + winch, umbilical reel + hose, housed amber slot lamps (one on the beam end toward the hall, one under
// the beam onto the fighter) + label. Service platforms (1.4 m wide) with lit rails run along the wall at
// each tier behind a deep fascia carrying a blue-white work-light strip (the tiers read as lit galleries
// from the deck), detouring around the frame ribs, with a two-railed stair from the deck to tier 1 and
// caged ladders to tier 2. Exposes the slot list for the traffic system; the arms follow each slot's
// `occupied` flag, which that system writes.
import * as THREE from "three";
import { Batch, Batcher, sharedCylinder, axisQuat } from "./batch.js";
import { FLOOR, HALL, WALL_T, DOORS, RACK, RIB_Z, RIB_W, RIB_D, STAIRS, LADDER_Z, RAIL_H, RAIL_MID, HG } from "./layout.js";
import { label, railRun, ladder, housedLamp, hazardBlocks } from "./util.js";
import { contactShadow } from "./deck.js";

const WALL_FACE = HALL.x1 - WALL_T - 0.12; // 79.72: wall panel front
const RIB_FACE = HALL.x1 - WALL_T - RIB_D; // 78.64: rib front
const PLATE_T = 0.3;

// clamp arms: hinge 0.25 m under the beam, arm reaching down to 1.2 m below the fighter centre
const ARM_PIVOT_DY = 4.5 - 0.25; // pivot height above the fighter centre (beam underside - 0.25)
const ARM_L = ARM_PIVOT_DY + 1.2; // 5.45 m pivot -> foot
const ARM_PIVOT_DX = RACK.clampDX + 0.25; // hinge centre |dx| from the fighter centre (arm inner face at 4.0)
const ARM_OPEN = { hall: THREE.MathUtils.degToRad(92), wall: THREE.MathUtils.degToRad(55) }; // swing outward
const ARM_SWING_S = 2.5; // seconds for a full open <-> close
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = new THREE.Vector3(), _one = new THREE.Vector3(1, 1, 1);
const _Y = new THREE.Vector3(0, 1, 0), _Z = new THREE.Vector3(0, 0, 1);

/** Builds everything; returns { slots, update(t) } (update swings the clamp arms after `occupied`). */
export function buildRacks(ctx) {
  const { kit, PALETTE, materials, group } = ctx;
  const B = new Batcher(kit);
  const slots = [];
  const arms = []; // two per slot, [hall-side, wall-side]: {pivot, yaw, open}
  for (const s of [-1, 1]) {
    const sideName = s < 0 ? "port" : "starboard";
    for (const tier of RACK.tiers) {
      buildPlatform(ctx, B, s, tier);
      RACK.slotsZ.forEach((z, i) => {
        const id = `R-${s < 0 ? "P" : "S"}${tier.tier}-${String(i + 1).padStart(2, "0")}`;
        buildCradle(ctx, B, s, tier, z, id, arms);
        slots.push({ id, pos: [s * RACK.centreX, tier.y, z], yaw: 0, tier: tier.tier, side: sideName, occupied: false });
      });
      // one low-priority point light per tier per side over the middle of the platform
      ctx.lights.push({ type: "point", pos: [s * 76.5, tier.platformY + 3.2, 60], color: 0xd6e4ff, intensity: 60, distance: 34, priority: 0.35 });
    }
    buildStairs(ctx, B, s, STAIRS[sideName]);
    for (const z of LADDER_Z) ladder(B, kit, s * WALL_FACE, z, FLOOR, RACK.tiers[1].platformY, -s, { cage: true });
  }
  B.flush();

  // ---- hinged clamp arms: one InstancedMesh (56 instances), posed from each slot's occupancy
  const mesh = new THREE.InstancedMesh(armGeometry(PALETTE), materials.paintedMetal, arms.length);
  mesh.name = "rack-clamp-arms";
  mesh.frustumCulled = false;
  mesh.castShadow = mesh.receiveShadow = true;
  group.add(mesh);
  const pose = (i, amount) => {
    const a = arms[i];
    // yaw puts the arm's inner face toward the fighter; the swing is about the hinge (z) axis, outward
    _q.setFromAxisAngle(_Y, a.yaw).multiply(_q2.setFromAxisAngle(_Z, -a.open * (1 - amount)));
    _m.compose(_v.set(a.pivot[0], a.pivot[1], a.pivot[2]), _q, _one);
    mesh.setMatrixAt(i, _m);
  };
  const states = slots.map(() => ({ init: false, amount: 0, from: 0, target: 0, tFlip: -Infinity }));
  for (let i = 0; i < slots.length; i++) {
    pose(2 * i, 0);
    pose(2 * i + 1, 0);
  }
  mesh.instanceMatrix.needsUpdate = true;

  // 0 = open (clear of the approach), 1 = closed on the wings; the first update snaps to the state the
  // traffic system left after populating the racks, later flips swing over ARM_SWING_S seconds of t
  const update = (t) => {
    let dirty = false;
    for (let i = 0; i < slots.length; i++) {
      const st = states[i];
      const want = slots[i].occupied ? 1 : 0;
      if (!st.init) {
        st.init = true;
        st.amount = st.from = st.target = want;
      } else if (want !== st.target) {
        st.from = st.amount;
        st.target = want;
        st.tFlip = t;
      } else if (st.amount === st.target) continue;
      if (st.amount !== st.target) {
        const k = Math.min(1, Math.max(0, (t - st.tFlip) / ARM_SWING_S));
        st.amount = k >= 1 ? st.target : st.from + (st.target - st.from) * k * k * (3 - 2 * k);
      }
      pose(2 * i, st.amount);
      pose(2 * i + 1, st.amount);
      dirty = true;
    }
    if (dirty) mesh.instanceMatrix.needsUpdate = true;
  };
  /** per slot: 0 = arms open (swung up), 1 = closed on the fighter */
  const clampState = () => slots.map((s, i) => ({ id: s.id, occupied: !!s.occupied, amount: +states[i].amount.toFixed(3) }));
  return { slots, update, clampState };
}

/**
 * Clamp arm in its hinge frame: pivot at the origin, hinge axis z, arm hanging along -y, inner face
 * (toward the fighter) at +x. Hinge drum + cheek plates, the arm bar with two bands, a rubber grip pad
 * 11 cm proud of the inner face over the lower 2 m, a hydraulic cylinder on the outer face, foot cap.
 */
function armGeometry(PALETTE) {
  const g = new Batch();
  const impDark = PALETTE.impDark, impMid = PALETTE.impMid;
  g.addGeometry(sharedCylinder(1, 1, 14), { quat: axisQuat("z"), scale: [0.32, 0.9, 0.32], color: impMid });
  for (const sz of [-1, 1]) g.box(0, -0.08, sz * 0.475, 0.6, 0.76, 0.05, { color: impMid });
  g.box(0, -(ARM_L + 0.3) / 2, 0, 0.5, ARM_L - 0.3, 0.8, { color: impDark, texel: 0.5 });
  for (const y of [-1.6, -3.2]) g.box(0, y, 0, 0.54, 0.24, 0.84, { color: impMid });
  g.box(0.305, -ARM_L + 1.2, 0, 0.11, 2.0, 1.4, { color: 0x222326 });
  g.box(0.27, -ARM_L + 1.2, 0, 0.04, 2.2, 1.56, { color: HG.gunmetal });
  g.addGeometry(sharedCylinder(1, 1, 10), { pos: [-0.4, -2.1, 0], scale: [0.12, 3.0, 0.12], color: HG.steel });
  g.addGeometry(sharedCylinder(1, 1, 8), { pos: [-0.4, -0.45, 0], scale: [0.06, 0.4, 0.06], color: HG.steel });
  g.box(-0.38, -3.7, 0, 0.26, 0.2, 0.3, { color: HG.gunmetal });
  g.box(-0.38, -0.3, 0, 0.26, 0.16, 0.3, { color: HG.gunmetal });
  g.box(0, -ARM_L - 0.03, 0, 0.6, 0.06, 0.9, { color: impMid });
  return g.geometry();
}

// ---------------------------------------------------------------------------
function ribsInZone() {
  return RIB_Z.filter((z) => z > RACK.zoneZ0 && z < RACK.zoneZ1);
}

/**
 * z spans of the platform plate for a side/tier. Tier 1 ends where the deck stair lands (`openEnd`: no
 * end rail there); tier 2 runs the whole zone.
 */
function plateSpans(s, tier) {
  if (tier.tier === 1) {
    const st = STAIRS[s < 0 ? "port" : "starboard"];
    return [{ z0: RACK.zoneZ0, z1: Math.min(st.top, st.foot) - 0.02, openEnd: "z1" }];
  }
  return [{ z0: RACK.zoneZ0, z1: RACK.zoneZ1 }];
}

function buildPlatform(ctx, B, s, tier) {
  const { kit, PALETTE } = ctx;
  const py = tier.platformY;
  const xIn = RACK.platformX0, xOut = WALL_FACE; // |x| inner edge .. wall
  const mm = (x0, x1) => [Math.min(s * x0, s * x1), Math.max(s * x0, s * x1)];
  const ribs = ribsInZone().filter((z) => plateSpans(s, tier).some(({ z0, z1 }) => z > z0 && z < z1));
  const detourX = RIB_FACE - 1.7; // detour plate inner edge (|x|)
  const ladderZ = new Set(LADDER_Z);
  const ribHalf = RIB_W / 2 + 0.3; // rib body + side flanges + 6 cm

  for (const { z0, z1, openEnd } of plateSpans(s, tier)) {
    // main plate pieces between ribs (body + flanges) and ladder holes (+-0.6)
    const breaks = [];
    for (const z of ribs) if (z > z0 && z < z1) breaks.push([z - ribHalf, z + ribHalf]);
    for (const z of ladderZ) if (z > z0 && z < z1) breaks.push([z - 0.6, z + 0.6, "ladder"]);
    breaks.sort((a, b) => a[0] - b[0]);
    let cursor = z0;
    const pieces = [];
    for (const [a, b, kind] of breaks) {
      if (a > cursor) pieces.push([cursor, a]);
      if (kind === "ladder") {
        // the ladder hole only takes the wall-side half of the plate; keep the inner half continuous
        const [xa, xb] = mm(xIn, xIn + 0.7);
        B.boxMM("grate", 0xffffff, [xa, py - PLATE_T, a], [xb, py, b], { texel: 0.8 });
      }
      cursor = b;
    }
    if (cursor < z1) pieces.push([cursor, z1]);
    for (const [a, b] of pieces) {
      let [xa, xb] = mm(xIn, xOut);
      B.boxMM("grate", 0xffffff, [xa, py - PLATE_T, a], [xb, py, b], { texel: 0.8 });
      // deep fascia beam along the inner edge (0.6 m, dark) with a steel top lip, a 10 cm blue-white
      // work-light strip recessed in a black channel on its hall face and a downlight strip under it:
      // from the deck each tier reads as a lit gallery edge, not a dark line
      [xa, xb] = mm(xIn - 0.02, xIn + 0.14);
      B.boxMM("paintedMetal", PALETTE.impDark, [xa, py - PLATE_T - 0.6, a], [xb, py - 0.02, b], { texel: 0.5 });
      [xa, xb] = mm(xIn - 0.03, xIn + 0.16);
      B.boxMM("metal", HG.steel, [xa, py - 0.02, a], [xb, py + 0.03, b]);
      [xa, xb] = mm(xIn - 0.05, xIn - 0.02);
      B.boxMM("paintedMetal", PALETTE.impBlack, [xa, py - PLATE_T - 0.42, a + 0.2], [xb, py - PLATE_T - 0.22, b - 0.2]);
      [xa, xb] = mm(xIn - 0.055, xIn - 0.045);
      B.boxMM("emitWhite", 0xffffff, [xa, py - PLATE_T - 0.4, a + 0.25], [xb, py - PLATE_T - 0.24, b - 0.25]);
      [xa, xb] = mm(xIn, xIn + 0.12);
      B.boxMM("emitWhite", 0xffffff, [xa, py - PLATE_T - 0.61, a + 0.3], [xb, py - PLATE_T - 0.6, b - 0.3]);
      // wall strip at knee height along the back of the platform
      [xa, xb] = mm(xOut - 0.12, xOut);
      B.boxMM("paintedMetal", PALETTE.impBlack, [xa, py + 0.82, a + 0.15], [xb, py + 0.96, b - 0.15]);
      [xa, xb] = mm(xOut - 0.13, xOut - 0.12);
      B.boxMM("emitWhite", 0xffffff, [xa, py + 0.86, a + 0.2], [xb, py + 0.92, b - 0.2]);
      // brackets under the plate every 6 m
      for (let z = a + 2; z < b - 1; z += 6) {
        [xa, xb] = mm(xIn + 0.1, xOut);
        B.boxMM("paintedMetal", PALETTE.impDark, [xa, py - PLATE_T - 0.3, z - 0.12], [xb, py - PLATE_T, z + 0.12], { texel: 0.5 });
        [xa, xb] = mm(xOut - 0.4, xOut);
        B.boxMM("paintedMetal", PALETTE.impDark, [xa, py - 1.6, z - 0.12], [xb, py - PLATE_T, z + 0.12], { texel: 0.5 });
        B.tube("metal", HG.gunmetal, [s * (xIn + 0.3), py - PLATE_T - 0.25, z], [s * (xOut - 0.2), py - 1.5, z], 0.05, 8);
      }
    }
    // rails: inner edge (with detours around ribs), end rails across the plate
    const path = [];
    path.push([s * (xIn + 0.1), z0]);
    for (const z of ribs) {
      if (z <= z0 || z >= z1) continue;
      path.push([s * (xIn + 0.1), z - 1.6], [s * (detourX + 0.1), z - 1.6], [s * (detourX + 0.1), z + 1.6], [s * (xIn + 0.1), z + 1.6]);
    }
    path.push([s * (xIn + 0.1), z1]);
    for (let i = 0; i < path.length - 1; i++) railRun(B, kit, path[i], path[i + 1], py, { collide: false, kick: true, lit: true });
    if (openEnd !== "z0") railRun(B, kit, [s * (xIn + 0.1), z0], [s * (xOut - 0.05), z0], py, { collide: false, kick: true, lit: true });
    if (openEnd !== "z1") railRun(B, kit, [s * (xIn + 0.1), z1], [s * (xOut - 0.05), z1], py, { collide: false, kick: true, lit: true });
    // detour plates around the ribs + a filler in front of the rib face between the main plate ends
    for (const z of ribs) {
      if (z <= z0 || z >= z1) continue;
      let [xa, xb] = mm(detourX, xIn + 0.05);
      B.boxMM("grate", 0xffffff, [xa, py - PLATE_T, z - 1.6], [xb, py, z + 1.6], { texel: 0.8 });
      [xa, xb] = mm(xIn + 0.05, RIB_FACE - 0.03);
      B.boxMM("grate", 0xffffff, [xa, py - PLATE_T, z - ribHalf], [xb, py, z + ribHalf], { texel: 0.8 });
      const [ta, tb] = mm(detourX - 0.02, detourX + 0.12);
      B.boxMM("paintedMetal", PALETTE.impDark, [ta, py - PLATE_T - 0.05, z - 1.6], [tb, py + 0.02, z + 1.6], { texel: 0.5 });
      // hanger rods from the rib to the detour corners
      for (const dz of [-1.4, 1.4]) B.tube("metal", HG.gunmetal, [s * (detourX + 0.2), py, z + dz], [s * (RIB_FACE - 0.1), py + 2.6, z + dz], 0.05, 8);
    }
    // support columns to the deck (tier 1) / to tier 1 (tier 2) at both span ends
    for (const z of [z0 + 0.4, z1 - 0.4]) {
      const [xa, xb] = mm(xIn + 0.15, xIn + 0.55);
      const yBottom = tier.tier === 1 ? FLOOR : RACK.tiers[0].platformY;
      B.boxMM("paintedMetal", PALETTE.impDark, [xa, yBottom, z - 0.2], [xb, py - PLATE_T, z + 0.2], { texel: 0.5 });
      if (tier.tier === 1) {
        const [fa, fb] = mm(xIn, xIn + 0.7);
        B.boxMM("metal", HG.gunmetal, [fa, FLOOR, z - 0.35], [fb, FLOOR + 0.12, z + 0.35]);
        // black/yellow bands round the column foot (piano-key blocks, no texture)
        hazardBlocks(B, [Math.min(xa, xb) - 0.01, FLOOR + 0.12, z - 0.21], [Math.max(xa, xb) + 0.01, FLOOR + 1.32, z + 0.21], "y", { block: 0.2 });
        kit.collider([Math.min(fa, fb), FLOOR, z - 0.35], [Math.max(fa, fb), FLOOR + 3, z + 0.35], "rack-column");
        contactShadow(kit, (fa + fb) / 2, z, 0.7, 0.7, 0.6);
      }
    }
  }
}

// ---------------------------------------------------------------------------
function buildCradle(ctx, B, s, tier, z, id, arms) {
  const { kit, PALETTE } = ctx;
  const ty = tier.y;
  const P = [s * RACK.centreX, ty, z];
  const mm = (x0, x1) => [Math.min(s * x0, s * x1), Math.max(s * x0, s * x1)];
  // every static box goes through here so the 4.2 m clearance around the fighter is checked at build time
  const box = (mat, color, x0, x1, y0, y1, z0, z1, opts, near = false) => {
    const [xa, xb] = mm(x0, x1);
    if (!near) {
      const dx = Math.max(xa - P[0], 0, P[0] - xb), dy = Math.max(y0 - P[1], 0, P[1] - y1), dz = Math.max(z0 - P[2], 0, P[2] - z1);
      const d = Math.hypot(dx, dy, dz);
      if (d < RACK.clearR) console.warn(`[d4-hangar] rack ${id}: geometry ${mat} within ${d.toFixed(2)} m of the fighter centre`);
    }
    B.boxMM(mat, color, [xa, y0, z0], [xb, y1, z1], opts);
  };
  const impDark = PALETTE.impDark, impMid = PALETTE.impMid;
  const X0 = RACK.centreX; // 70
  const beamB = ty + 4.5, beamT = ty + 5.7;

  // overhead beam + flanges + wall gusset
  box("paintedMetal", impDark, X0 - 5.0, WALL_FACE, beamB, beamT, z - 0.5, z + 0.5, { texel: 0.5 });
  box("paintedMetal", impMid, X0 - 5.0, WALL_FACE, beamB, beamB + 0.14, z - 0.8, z + 0.8, { texel: 0.5 });
  box("paintedMetal", impMid, X0 - 5.0, WALL_FACE, beamT - 0.14, beamT, z - 0.8, z + 0.8, { texel: 0.5 });
  box("paintedMetal", impDark, WALL_FACE - 1.5, WALL_FACE, ty + 2.6, beamB, z - 0.6, z + 0.6, { texel: 0.5 });
  for (let x = X0 - 3.5; x < WALL_FACE - 1.5; x += 3.0) box("metal", HG.gunmetal, x - 0.06, x + 0.06, beamB + 0.14, beamT - 0.14, z - 0.52, z + 0.52);
  // carriage + winch drum + amber warning light on top of the beam
  box("paintedMetal", impMid, X0 - 1.4, X0 + 1.4, beamT, beamT + 0.9, z - 0.9, z + 0.9, { texel: 0.5 });
  B.cyl("metal", HG.gunmetal, P[0], beamT + 1.15, z, 0.35, 1.2, "z", 14);
  box("emitAmber", 0xffffff, X0 - 0.15, X0 + 0.15, beamT + 1.5, beamT + 1.7, z - 0.15, z + 0.15);
  box("metal", HG.gunmetal, X0 - 0.1, X0 + 0.1, beamT + 0.9, beamT + 1.5, z - 0.1, z + 0.1);
  // clamp arm hinges under the beam at +-4.25 m (bracket + status lights); the arms themselves are the
  // instanced, animated pieces registered here: hall-side arm swings toward the hall, wall-side toward the wall
  for (const side of [-1, 1]) {
    const xp = X0 + side * ARM_PIVOT_DX; // hinge centre |x|
    box("paintedMetal", impMid, xp - 0.45, xp + 0.45, beamB - 0.3, beamB, z - 0.55, z + 0.55, { texel: 0.5 });
    box("emitBlue", 0xffffff, xp - 0.1, xp + 0.1, beamB - 0.1, beamB - 0.02, z + 0.56, z + 0.6);
    box("emitGreen", 0xffffff, xp - 0.1, xp + 0.1, beamB - 0.22, beamB - 0.14, z + 0.56, z + 0.6);
    // yaw 0: inner face toward +x, so the arm whose fighter lies at +x keeps yaw 0, the other turns round
    const fighterAtPlusX = s * side < 0;
    arms.push({ pivot: [s * xp, ty + ARM_PIVOT_DY, z], yaw: fighterAtPlusX ? 0 : Math.PI, open: side < 0 ? ARM_OPEN.hall : ARM_OPEN.wall });
  }
  // umbilical reel on the wall, hose (square section, batched) along the beam and down the outer arm
  const reelY = tier.platformY + 2.1;
  B.cyl("metal", HG.gunmetal, s * (WALL_FACE - 0.5), reelY, z + 2.6, 0.5, 0.8, "x", 16);
  B.cyl("rubber", HG.rubber, s * (WALL_FACE - 0.5), reelY, z + 2.6, 0.43, 0.9, "x", 16);
  box("metal", HG.gunmetal, WALL_FACE - 0.6, WALL_FACE, reelY - 0.65, reelY - 0.55, z + 2.4, z + 2.8);
  const hy = beamB - 0.24; // hose runs 10 cm under the beam's bottom flange
  box("rubber", HG.rubber, WALL_FACE - 0.58, WALL_FACE - 0.42, reelY + 0.35, hy + 0.08, z + 2.52, z + 2.68);
  box("rubber", HG.rubber, WALL_FACE - 0.58, WALL_FACE - 0.42, hy - 0.08, hy + 0.08, z + 0.67, z + 2.68);
  box("rubber", HG.rubber, X0 + 4.47, WALL_FACE - 0.42, hy - 0.08, hy + 0.08, z + 0.67, z + 0.83);
  box("rubber", HG.rubber, X0 + 4.47, X0 + 4.63, ty - 0.5, hy + 0.08, z + 0.67, z + 0.83);
  box("metal", HG.steel, X0 + 4.4, X0 + 4.85, ty - 0.75, ty - 0.45, z + 0.58, z + 0.92, {}, true);
  // housed amber slot lamps: a wide one on the beam's hall-facing end (the slot reads as a lit cradle
  // from the deck) and one under the beam between the hinges shining down onto the fighter's spine;
  // lit label over the end lamp, slot stencil + status panel on the wall behind (not where a tier-1
  // slot's wall strip is taken by a bay door hole and its surround)
  housedLamp(B, "emitAmber", [s * (X0 - 5.0), beamB + 0.34, z], [-s, 0, 0], [1.5, 0.2, 0.42], { inset: 0.04 });
  housedLamp(B, "emitAmber", [s * X0, beamB - 0.001, z], [0, -1, 0], [1.4, 0.16, 0.5], { inset: 0.04 });
  const lab = id.slice(2); // "P1-03"
  box("paintedMetal", PALETTE.impBlack, X0 - 5.02, X0 - 5.0, beamB + 0.66, beamB + 1.16, z - 0.9, z + 0.9);
  label(kit, "hgSign", lab, [s * (X0 - 5.03), beamB + 0.91, z], [-s, 0, 0], 1.6);
  const inDoorZone = tier.tier === 1 && DOORS.some((d) => d.kind === "bay" && Math.sign(d.dir[0]) === s && z - 3.9 < d.pos[2] + d.w / 2 + 2.6 && z - 2.1 > d.pos[2] - d.w / 2 - 2.6);
  if (!inDoorZone) {
    label(kit, "hgSign", lab, [s * (WALL_FACE - 0.02), tier.platformY + 2.6, z - 3.0], [-s, 0, 0], 1.8);
    box("paintedMetal", PALETTE.impBlack, WALL_FACE - 0.1, WALL_FACE, tier.platformY + 1.2, tier.platformY + 1.9, z - 3.6, z - 2.8, { texel: 0.5 });
    box("screenImp1", 0xffffff, WALL_FACE - 0.12, WALL_FACE - 0.1, tier.platformY + 1.3, tier.platformY + 1.8, z - 3.55, z - 2.85, { fit: true });
    box("emitRedImp", 0xffffff, WALL_FACE - 0.12, WALL_FACE - 0.1, tier.platformY + 1.95, tier.platformY + 2.05, z - 3.55, z - 3.4);
    box("emitGreen", 0xffffff, WALL_FACE - 0.12, WALL_FACE - 0.1, tier.platformY + 1.95, tier.platformY + 2.05, z - 3.3, z - 3.15);
  }
}

// ---------------------------------------------------------------------------
/** deck -> tier-1 stair from `foot` (deck) to `top` (platform end), two handrails (open side + wall side) */
function buildStairs(ctx, B, s, { foot, top }) {
  const { kit, PALETTE } = ctx;
  const y0 = FLOOR, y1 = RACK.tiers[0].platformY;
  const dir = Math.sign(top - foot); // climbing direction along z
  const rise = y1 - y0, run = Math.abs(top - foot);
  const n = 20;
  const xIn = RACK.platformX0 + 0.1, xOut = WALL_FACE - 0.1;
  const mm = (a, b) => [Math.min(s * a, s * b), Math.max(s * a, s * b)];
  const [xa, xb] = mm(xIn, xOut);
  for (let i = 1; i <= n; i++) {
    const yt = y0 + (rise * i) / n, zc = foot + (dir * run * (i - 0.5)) / n;
    B.boxMM("grate", 0xffffff, [xa, yt - 0.12, zc - 0.22], [xb, yt, zc + 0.22], { texel: 0.8 });
    // yellow nosing on the leading (downhill) edge
    const ze = zc - dir * 0.2;
    B.boxMM("painted", HG.yellow, [xa, yt - 0.04, ze - 0.04], [xb, yt + 0.005, ze + 0.04]);
  }
  // stringers: the treads embed 4 cm into their top edge; the upper end stays flush with the landing plate
  const ang = Math.atan2(rise, run);
  const len = Math.hypot(rise, run);
  for (const x of [xIn - 0.04, xOut + 0.04]) {
    kit.add("paintedMetal", new THREE.BoxGeometry(0.08, 0.32, len), { pos: [s * x, (y0 + y1) / 2 - 0.12, (foot + top) / 2], rot: [-ang * dir, 0, 0], color: PALETTE.impDark, texel: 0.5 });
  }
  // handrails: open side on posts every 4 steps, wall side on brackets; light top rail, dark mid rail
  for (const [x, wallSide] of [[xIn - 0.04, false], [xOut + 0.04, true]]) {
    B.tube("metal", HG.steel, [s * x, y0 + RAIL_H, foot], [s * x, y1 + RAIL_H, top], 0.03, 8);
    B.tube("paintedMetal", HG.gunmetal, [s * x, y0 + RAIL_MID, foot], [s * x, y1 + RAIL_MID, top], 0.02, 8);
    for (let i = 0; i <= n; i += 4) {
      const yt = y0 + (rise * i) / n, zc = foot + (dir * run * i) / n;
      if (wallSide) {
        const [ba, bb] = mm(x - 0.03, WALL_FACE);
        B.boxMM("metal", HG.gunmetal, [ba, yt + RAIL_H - 0.08, zc - 0.03], [bb, yt + RAIL_H - 0.03, zc + 0.03]);
      } else {
        const [pa, pb] = mm(x - 0.04, x + 0.04);
        B.boxMM("paintedMetal", HG.gunmetal, [pa, yt, zc - 0.04], [pb, yt + RAIL_H, zc + 0.04]);
      }
    }
  }
  // foot plate + collider (the whole stair volume blocks the player at deck level)
  const [fa, fb] = mm(xIn - 0.2, xOut + 0.1);
  const zf0 = Math.min(foot, top), zf1 = Math.max(foot, top);
  B.boxMM("metal", HG.gunmetal, [fa, FLOOR, foot - dir * 0.15 - 0.2], [fb, FLOOR + 0.03, foot - dir * 0.15 + 0.2]);
  kit.collider([fa, FLOOR, zf0 - 0.25], [fb, y1 + 1, zf1 + 0.25], "stairs");
}
