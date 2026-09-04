// Turbolift cabin prefab: geometry that never moves (shell, panels, frame, call panel, deck-select
// housing, colliders, light descriptor). Everything is expressed in the cabin's local frame
//   r  across (R = dir × up, the player's right when facing the doors from inside)
//   u  up
//   d  depth INTO the cabin from the lobby wall's outer face (d = 0 at the door plane, 4.0 at the back)
// so one builder serves every lobby whatever way its lift faces. The lobby wall slab itself occupies
// d ∈ [-WALL_T, 0]; the lobby is at d < -WALL_T.
import * as THREE from "three";
import { rng } from "../../kit.js";
import { Frame } from "./frame.js";
import { LIFT_DOOR, LIFT_VOLUME } from "./helper.js";
import { labelRect, labelAspect } from "./labels.js";

export const G = {
  halfBox: LIFT_VOLUME.across / 2, // 2.0 reserved half width
  depth: LIFT_VOLUME.deep, // 4.0 reserved depth
  boxH: LIFT_VOLUME.high, // 3.6 reserved height
  halfIn: 1.6, // interior 3.2 wide
  inD0: 0.2, // interior starts behind the 0.2 door wall
  inD1: 3.8, // interior 3.6 deep
  ceil: 3.05, // interior ceiling (3.0 clear over the 0.03 floor plate)
  floorT: 0.03,
  doorHW: LIFT_DOOR.w / 2, // 1.2
  doorH: LIFT_DOOR.h, // 3.0
  wallT: 0.16, // lobby wall thickness (doors helper WALL_T)
  clearHW: 1.14, // frame lips narrow the clear opening to 2.28
  clearH: 2.86, // inner header lowers the clear height inside the cabin
  leafW: 1.24,
  leafTravel: 1.22,
  leafT: 0.1,
  leafD: -0.08, // leaf plane centre: inside the lobby wall thickness
  spawnD: 1.2, // feet position after a ride: 1.2 m inside the doors
  panelD: 1.3, // deck-select panel centre depth on the right-hand wall
  panelU: 1.2,
  callA: 2.02, // call panel centre, along the lobby face to the viewer's right of the door
  callU: 1.2,
  lintelU: 3.3,
  hoodD: 0.33, // lintel indicator hood front, measured from the bounds face (wall face is at 0.16)
};

/** Cabin descriptor for a lobby manifest that carries `lift`. */
export function makeCabin(ctx, manifest, roomId) {
  const lift = manifest.lift;
  const pos = new THREE.Vector3(lift.pos[0], lift.pos[1], lift.pos[2]);
  const dx = lift.dir[0] || 0;
  const dz = lift.dir[2] || 0;
  // snap to the dominant horizontal axis (rooms are axis-aligned)
  const F = Math.abs(dx) >= Math.abs(dz) ? new THREE.Vector3(dx >= 0 ? 1 : -1, 0, 0) : new THREE.Vector3(0, 0, dz >= 0 ? 1 : -1);
  if (Math.abs(Math.hypot(dx, dz) - 1) > 1e-3 || (Math.abs(dx) > 1e-6 && Math.abs(dz) > 1e-6)) {
    console.warn(`[lifts] ${lift.id}: dir ${lift.dir} is not an axis unit vector; using ${F.toArray()}`);
  }
  const U = new THREE.Vector3(0, 1, 0);
  const R = new THREE.Vector3().crossVectors(F, U); // right when facing the doors from inside
  const D = F.clone().negate(); // into the cabin
  let deck = manifest.deck;
  if (!(deck >= 1)) deck = parseInt(String(lift.id).replace(/\D/g, ""), 10) || 0;
  const cab = {
    id: String(lift.id),
    deck,
    name: manifest.name || roomId,
    roomId,
    lift,
    pos,
    F,
    R,
    U,
    D,
    yaw: THREE.MathUtils.radToDeg(Math.atan2(-F.x, -F.z)), // player yaw that faces the doors (faces dir)
    P(r, u, d) {
      return pos.clone().addScaledVector(R, r).addScaledVector(U, u).addScaledVector(D, d);
    },
    aabb(r0, u0, d0, r1, u1, d1) {
      const a = this.P(r0, u0, d0);
      const b = this.P(r1, u1, d1);
      return { min: [Math.min(a.x, b.x), Math.min(a.y, b.y), Math.min(a.z, b.z)], max: [Math.max(a.x, b.x), Math.max(a.y, b.y), Math.max(a.z, b.z)] };
    },
    local(p) {
      const dxw = p.x - pos.x;
      const dyw = p.y - pos.y;
      const dzw = p.z - pos.z;
      return { r: dxw * R.x + dzw * R.z, u: dyw, d: dxw * D.x + dzw * D.z };
    },
  };
  cab.spawn = cab.P(0, 0, G.spawnD);
  cab.basis = new THREE.Matrix4().makeBasis(R, U, D); // right-handed: R × U = D
  const kit = ctx.kit;
  const UxF = new THREE.Vector3().crossVectors(U, F); // viewer's right when standing in the lobby facing the door
  cab.frames = {
    lobby: new Frame(kit, cab.P(0, 0, -G.wallT), UxF, U), // n → into the lobby
    rWall: new Frame(kit, cab.P(G.halfIn, 0, 0), D, U), // a = depth, n → into the cabin
    lWall: new Frame(kit, cab.P(-G.halfIn, 0, 0), D.clone().negate(), U),
    back: new Frame(kit, cab.P(0, 0, G.inD1), R.clone().negate(), U), // n → toward the doors
    frontInner: new Frame(kit, cab.P(0, 0, G.inD0), R, U), // n → into the cabin
  };
  return cab;
}

// ---------------------------------------------------------------------------
// Imperial panel field on a flat wall: light-grey plates 3 cm proud of a black backing, 2.5 cm seams,
// dark kick plate, one vent + one equipment panel in the top row.
// ---------------------------------------------------------------------------
function panelField(kit, C, wall, h0, h1, rand, opts = {}) {
  const gap = 0.025;
  const faceT = 0.03;
  const { kickTop = 0.34, rows = [0.365, 1.3, 1.325, 2.35, 2.375, 3.02], cols = 4, ventCol = 1, gearCol = 3, skip = null } = opts;
  wall.box(h0 + gap / 2, h1 - gap / 2, G.floorT, kickTop, 0.012, faceT, "paintedMetal", { color: C.impDark, texel: 1.5 });
  const cw = (h1 - h0 - (cols - 1) * gap) / cols;
  for (let ri = 0; ri < rows.length; ri += 2) {
    const v0 = rows[ri];
    const v1 = rows[ri + 1];
    const row = ri / 2;
    for (let ci = 0; ci < cols; ci++) {
      const a = h0 + ci * (cw + gap);
      const b = a + cw;
      if (skip && skip(a, b, v0, v1)) continue;
      const top = row === 2;
      if (top && ci === ventCol) {
        // vent: black recess with angled slats
        wall.box(a, b, v0, v1, 0.0, faceT, "paintedMetal", { color: C.impBlack });
        const slats = 6;
        for (let s = 0; s < slats; s++) {
          const sv = v0 + 0.1 + ((v1 - v0 - 0.2) * s) / (slats - 1);
          wall.box(a + 0.08, b - 0.08, sv - 0.011, sv + 0.011, -0.012, 0.008, "paintedMetal", { color: C.impMid, texel: 2 });
        }
        wall.box(a, b, v0, v0 + 0.04, -0.008, 0.0, "paintedMetal", { color: C.impMid });
        wall.box(a, b, v1 - 0.04, v1, -0.008, 0.0, "paintedMetal", { color: C.impMid });
        continue;
      }
      const col = rand() < 0.72 ? C.impWhite : C.impGrey;
      wall.box(a, b, v0, v1, 0.0, faceT, "impPanel", { color: col, texel: 1.0 });
      if (top && ci === gearCol) {
        // equipment panel: junction box, two status lamps, conduit up to the ceiling seam
        const cx = (a + b) / 2;
        const cv = (v0 + v1) / 2;
        wall.box(cx - 0.13, cx + 0.13, cv - 0.11, cv + 0.09, -0.055, 0.0, "paintedMetal", { color: C.impDark, texel: 2 });
        wall.box(cx - 0.11, cx + 0.11, cv - 0.09, cv + 0.07, -0.062, -0.055, "darkGloss", {});
        wall.box(cx - 0.08, cx - 0.05, cv - 0.06, cv - 0.03, -0.066, -0.06, "emitBlue", {});
        wall.box(cx - 0.03, cx + 0.0, cv - 0.06, cv - 0.03, -0.066, -0.06, "emitRedImp", {});
        wall.box(cx + 0.02, cx + 0.05, cv - 0.06, cv - 0.03, -0.066, -0.06, "emitAmber", {});
        wall.box(cx + 0.06, cx + 0.09, cv + 0.09, v1 + 0.03, -0.03, -0.006, "paintedMetal", { color: C.impMid, texel: 2 });
        wall.box(cx + 0.045, cx + 0.105, v1 - 0.05, v1 - 0.01, -0.036, 0.0, "paintedMetal", { color: C.impDark });
        continue;
      }
      if (row === 1 && rand() < 0.45) {
        // raised inner plate (alternate tint so it reads as a plate, not a stray seam) with a recessed horizontal seam
        wall.box(a + 0.1, b - 0.1, v0 + 0.1, v1 - 0.1, -0.012, 0.0, "impPanel", { color: col === C.impWhite ? C.impGrey : C.impWhite, texel: 1.0 });
        wall.box(a + 0.1, b - 0.1, v0 + 0.1 + (v1 - v0 - 0.2) * 0.62, v0 + 0.1 + (v1 - v0 - 0.2) * 0.62 + 0.014, -0.012, -0.004, "paintedMetal", { color: C.impBlack });
      } else if (row === 0 && rand() < 0.5) {
        // low panel: a single dark horizontal groove
        wall.box(a + 0.06, b - 0.06, v0 + (v1 - v0) * 0.5, v0 + (v1 - v0) * 0.5 + 0.014, 0.0, 0.02, "paintedMetal", { color: C.impBlack });
      }
    }
  }
}

// wall adaptors: (h0,h1,v0,v1,n0,n1) with n = distance INTO the wall from its face (negative = proud)
function wallAdaptors(cab, kit) {
  const B = (mat, a, b, opts) => {
    const { min, max } = cab.aabb(a[0], a[1], a[2], b[0], b[1], b[2]);
    kit.boxMM(mat, min, max, opts);
  };
  return {
    B,
    rWall: { box: (h0, h1, v0, v1, n0, n1, mat, opts) => B(mat, [G.halfIn + n0, v0, h0], [G.halfIn + n1, v1, h1], opts) },
    lWall: { box: (h0, h1, v0, v1, n0, n1, mat, opts) => B(mat, [-G.halfIn - n1, v0, h0], [-G.halfIn - n0, v1, h1], opts) },
    back: { box: (h0, h1, v0, v1, n0, n1, mat, opts) => B(mat, [h0, v0, G.inD1 + n0], [h1, v1, G.inD1 + n1], opts) },
    frontInner: { box: (h0, h1, v0, v1, n0, n1, mat, opts) => B(mat, [h0, v0, G.inD0 - n1], [h1, v1, G.inD0 - n0], opts) },
  };
}

function decal(frame, name, cu, cv, cn, width) {
  const h = width / labelAspect(name);
  frame.add("liftDecal", new THREE.PlaneGeometry(width, h), cu, cv, cn, { uv: "keep", uvRect: labelRect(name) });
}

/**
 * Build every static part of one cabin into ctx.kit (+ colliders, + one light descriptor).
 * Returns { light } — the descriptor the ride animates.
 */
export function buildCabinStatic(ctx, cab, seed = 1) {
  const { kit, PALETTE: C } = ctx;
  const rand = rng(seed);
  const W = wallAdaptors(cab, kit);
  const { B } = W;
  const COL = (a, b, tag) => {
    const { min, max } = cab.aabb(a[0], a[1], a[2], b[0], b[1], b[2]);
    kit.collider(min, max, tag);
  };
  const HB = G.halfBox;
  const HI = G.halfIn;

  // ---- shell (black backing everywhere; panels sit 3 cm proud of it) --------------------------
  B("blackGloss", [-HB, 0, 0], [HB, G.floorT, G.depth], { color: C.impDark, texel: 0.5 }); // floor plate
  B("paintedMetal", [HI + 0.03, 0, 0], [HB, G.boxH, G.depth], { color: C.impBlack, texel: 0.5 }); // R wall core
  B("paintedMetal", [-HB, 0, 0], [-HI - 0.03, G.boxH, G.depth], { color: C.impBlack, texel: 0.5 }); // L wall core
  B("paintedMetal", [-HB, 0, G.inD1 + 0.03], [HB, G.boxH, G.depth], { color: C.impBlack, texel: 0.5 }); // back core
  // door wall core: sides + header (the opening through it is narrower/lower than the lobby's hole,
  // so its cut faces read as a dark reveal from the lobby)
  B("paintedMetal", [G.clearHW, 0, 0], [HB, G.boxH, G.inD0 - 0.03], { color: C.impBlack, texel: 0.5 });
  B("paintedMetal", [-HB, 0, 0], [-G.clearHW, G.boxH, G.inD0 - 0.03], { color: C.impBlack, texel: 0.5 });
  B("paintedMetal", [-G.clearHW, G.clearH, 0], [G.clearHW, G.boxH, G.inD0 - 0.03], { color: C.impBlack, texel: 0.5 });

  // ---- ceiling: grey slab with a recessed centre light channel ----------------------------------
  const ch = 0.35; // channel half width
  const chTop = G.ceil + 0.25;
  B("impPanel", [-HB, G.ceil, 0], [-ch, G.boxH, G.depth], { color: C.impGrey, texel: 0.8 });
  B("impPanel", [ch, G.ceil, 0], [HB, G.boxH, G.depth], { color: C.impGrey, texel: 0.8 });
  B("impPanel", [-ch, chTop, 0], [ch, G.boxH, G.depth], { color: C.impGrey, texel: 0.8 });
  B("impPanel", [-ch, G.ceil, 0], [ch, chTop, G.inD0 + 0.3], { color: C.impGrey, texel: 0.8 });
  B("impPanel", [-ch, G.ceil, G.inD1 - 0.3], [ch, chTop, G.depth], { color: C.impGrey, texel: 0.8 });
  const c0 = G.inD0 + 0.3;
  const c1 = G.inD1 - 0.3;
  B("paintedMetal", [-ch, G.ceil, c0], [-ch + 0.03, chTop, c1], { color: C.impBlack }); // channel linings
  B("paintedMetal", [ch - 0.03, G.ceil, c0], [ch, chTop, c1], { color: C.impBlack });
  B("paintedMetal", [-ch, G.ceil, c0], [ch, chTop, c0 + 0.03], { color: C.impBlack });
  B("paintedMetal", [-ch, G.ceil, c1 - 0.03], [ch, chTop, c1], { color: C.impBlack });
  B("emitCoolSoft", [-ch + 0.08, chTop - 0.03, c0 + 0.08], [ch - 0.08, chTop - 0.01, c1 - 0.08], { uv: "keep" }); // diffuser
  for (let k = 0; k < 7; k++) {
    const dz = c0 + 0.2 + ((c1 - c0 - 0.4) * k) / 6;
    B("paintedMetal", [-ch + 0.02, G.ceil + 0.05, dz - 0.012], [ch - 0.02, G.ceil + 0.08, dz + 0.012], { color: C.impMid, texel: 2 }); // grille ribs
  }
  // perimeter ceiling seam (dark cove)
  B("paintedMetal", [-HI, G.ceil - 0.02, G.inD0], [HI, G.ceil, G.inD0 + 0.05], { color: C.impBlack });
  B("paintedMetal", [-HI, G.ceil - 0.02, G.inD1 - 0.05], [HI, G.ceil, G.inD1], { color: C.impBlack });
  B("paintedMetal", [-HI, G.ceil - 0.02, G.inD0], [-HI + 0.05, G.ceil, G.inD1], { color: C.impBlack });
  B("paintedMetal", [HI - 0.05, G.ceil - 0.02, G.inD0], [HI, G.ceil, G.inD1], { color: C.impBlack });

  // ---- floor border frame + threshold + hazard sill -------------------------------------------
  const fb = G.floorT;
  B("paintedMetal", [-HI, fb, G.inD0], [-HI + 0.12, fb + 0.012, G.inD1], { color: C.impMid, texel: 1.5 });
  B("paintedMetal", [HI - 0.12, fb, G.inD0], [HI, fb + 0.012, G.inD1], { color: C.impMid, texel: 1.5 });
  B("paintedMetal", [-HI, fb, G.inD1 - 0.12], [HI, fb + 0.012, G.inD1], { color: C.impMid, texel: 1.5 });
  B("paintedMetal", [-HI, fb, G.inD0], [-G.clearHW, fb + 0.012, G.inD0 + 0.12], { color: C.impMid, texel: 1.5 });
  B("paintedMetal", [G.clearHW, fb, G.inD0], [HI, fb + 0.012, G.inD0 + 0.12], { color: C.impMid, texel: 1.5 });
  B("paintedMetal", [-G.clearHW, fb, G.inD0], [G.clearHW, fb + 0.02, G.inD0 + 0.06], { color: C.impMid, texel: 1.5 }); // inner sill
  B("paintedMetal", [-1.32, 0, -0.3], [1.32, 0.02, 0.0], { color: C.impMid, texel: 1.5 }); // lobby threshold plate
  B("hazard", [-1.32, 0, -0.38], [1.32, 0.012, -0.3], { texel: 4 }); // hazard sill on the lobby floor

  // ---- wall panel fields -----------------------------------------------------------------------
  panelField(kit, C, W.rWall, G.inD0 + 0.14, G.inD1 - 0.14, rand, { cols: 4, ventCol: 2, gearCol: 0 });
  panelField(kit, C, W.lWall, G.inD0 + 0.14, G.inD1 - 0.14, rand, { cols: 4, ventCol: 1, gearCol: 3 });
  const placard = (a, b, v0, v1) => Math.abs((a + b) / 2) < 0.1 && v0 > 1.0 && v1 < 2.5;
  panelField(kit, C, W.back, -HI + 0.14, HI - 0.14, rand, { cols: 3, ventCol: 1, gearCol: -1, skip: placard });
  // door wall inner strips beside the reveal
  panelField(kit, C, W.frontInner, -HI + 0.14, -1.32, rand, { cols: 1, ventCol: -1, gearCol: -1 });
  panelField(kit, C, W.frontInner, 1.32, HI - 0.14, rand, { cols: 1, ventCol: -1, gearCol: -1 });
  // head-height light line recessed in the seam between the middle and top panel rows, all three walls
  const sU0 = 2.352;
  const sU1 = 2.373;
  B("emitWhite", [-HI + 0.16, sU0, G.inD1 + 0.008], [HI - 0.16, sU1, G.inD1 + 0.024], {});
  B("emitWhite", [HI + 0.008, sU0, G.inD0 + 0.16], [HI + 0.024, sU1, G.inD1 - 0.16], {});
  B("emitWhite", [-HI - 0.024, sU0, G.inD0 + 0.16], [-HI - 0.008, sU1, G.inD1 - 0.16], {});
  // back-wall placard: darker panel, black inset plate, lift name + id, blue accent line
  {
    const f = cab.frames.back;
    const cw = (HI * 2 - 0.28 - 0.05) / 3;
    W.back.box(-cw / 2, cw / 2, 1.325, 2.35, 0.0, 0.03, "impPanel", { color: C.impGrey, texel: 1.0 });
    W.back.box(-0.38, 0.38, 1.46, 2.22, -0.016, 0.0, "paintedMetal", { color: C.impBlack, texel: 2 });
    W.back.box(-0.4, 0.4, 1.44, 1.46, -0.02, 0.0, "paintedMetal", { color: C.impMid });
    W.back.box(-0.4, 0.4, 2.22, 2.24, -0.02, 0.0, "paintedMetal", { color: C.impMid });
    decal(f, "turbolift", 0, 2.06, 0.0175, 0.56);
    decal(f, "t" + Math.min(4, Math.max(1, cab.deck)), 0, 1.79, 0.0175, 0.2);
    W.back.box(-0.3, 0.3, 1.575, 1.587, -0.022, -0.014, "emitBlue", {});
    for (let k = 0; k < 6; k++) W.back.box(-0.3 + k * 0.12, -0.28 + k * 0.12, 1.515, 1.53, -0.02, -0.014, k === 3 ? "emitAmber" : "emitBlue", {});
  }

  // ---- corner posts with blue-white light strips ------------------------------------------------
  for (const sr of [-1, 1]) {
    for (const front of [true, false]) {
      const d0 = front ? G.inD0 : G.inD1 - 0.12;
      const d1 = front ? G.inD0 + 0.12 : G.inD1;
      B("paintedMetal", [sr * (HI - 0.12), G.floorT, d0], [sr * HI, G.ceil, d1], { color: C.impBlack });
      // strip on the post's inward vertical edge, turned 45° toward the cabin centre
      const rr = sr * (HI - 0.12);
      const dd = front ? d1 : d0;
      const p = cab.P(rr, 1.55, dd);
      const n = cab.R.clone().multiplyScalar(-sr).addScaledVector(cab.D, front ? 1 : -1).normalize();
      const yaw = Math.atan2(n.x, n.z);
      kit.add("emitWhite", new THREE.BoxGeometry(0.035, 2.5, 0.014), { pos: [p.x + n.x * 0.004, p.y, p.z + n.z * 0.004], rot: [0, yaw, 0] });
      kit.add("paintedMetal", new THREE.BoxGeometry(0.06, 2.56, 0.02), { pos: [p.x - n.x * 0.012, p.y, p.z - n.z * 0.012], rot: [0, yaw, 0], color: C.impDark });
    }
  }

  // ---- handrail at 1.02 m on the back wall ----------------------------------------------------
  {
    const axis = Math.abs(cab.R.x) > 0.5 ? "x" : "z";
    // painted (dielectric) rails: bare metal would only mirror the dark interior and read black
    const rp = cab.P(0, 1.02, G.inD1 - 0.08);
    kit.cyl("paintedMetal", rp.x, rp.y, rp.z, 0.022, 2.7, axis, { color: C.impHullLight, segments: 14, texel: 2 });
    for (const rr of [-1.25, 0, 1.25]) {
      B("paintedMetal", [rr - 0.02, 0.985, G.inD1 - 0.09], [rr + 0.02, 1.05, G.inD1], { color: C.impDark });
    }
    // matching short rails on both side walls (grab points either side of the doors)
    for (const sr of [-1, 1]) {
      const sp = cab.P(sr * (HI - 0.08), 1.02, 2.6);
      kit.cyl("paintedMetal", sp.x, sp.y, sp.z, 0.02, 1.6, axis === "x" ? "z" : "x", { color: C.impHullLight, segments: 12, texel: 2 });
      for (const dd of [1.9, 3.3]) B("paintedMetal", [sr * (HI - 0.09), 0.985, dd - 0.02], [sr * HI, 1.05, dd + 0.02], { color: C.impDark });
    }
  }

  // ---- inner door reveal (heavy frame seen from inside) + header --------------------------------
  const rvN0 = G.inD0;
  const rvN1 = G.inD0 + 0.06;
  B("paintedMetal", [G.clearHW, 0, rvN0], [1.32, G.ceil, rvN1], { color: C.impMid, texel: 1.5 });
  B("paintedMetal", [-1.32, 0, rvN0], [-G.clearHW, G.ceil, rvN1], { color: C.impMid, texel: 1.5 });
  B("paintedMetal", [-1.32, G.clearH, rvN0], [1.32, G.ceil, rvN1], { color: C.impMid, texel: 1.5 });
  B("paintedMetal", [-1.32, G.clearH + 0.02, rvN1], [1.32, G.clearH + 0.04, rvN1 + 0.012], { color: C.impBlack }); // header slot for the status lamp
  decal(cab.frames.frontInner, "standClear", 0, G.clearH + 0.135, rvN1 - G.inD0 + 0.002, 0.62);

  // ---- deck-select panel housing (right-hand wall, centre 1.2 m) --------------------------------
  {
    const f = cab.frames.rWall;
    const a = G.panelD;
    // housing n 0..0.07, bezel to 0.075; the interactable face (network.js) is a mesh at n 0.075..0.083,
    // so everything that must read on the face sits at n ≥ 0.084
    f.box("paintedMetal", a, 1.21, 0.035, 0.36, 0.72, 0.07, { color: C.impBlack, texel: 2 });
    f.box("paintedMetal", a, 1.21, 0.0725, 0.34, 0.7, 0.005, { color: C.impDark, texel: 2 }); // bezel
    f.box("darkGloss", a + 0.06, 0.985, 0.086, 0.2, 0.1, 0.006, {}); // small display bezel
    f.box("screenImp1", a + 0.06, 0.985, 0.091, 0.18, 0.08, 0.004, { uv: "keep" }); // small display
    decal(f, "deckSelect", a, 1.51, 0.0765, 0.28);
    decal(f, "t" + Math.min(4, Math.max(1, cab.deck)), a, 1.67, 0.032, 0.14);
    for (let k = 0; k < 4; k++) decal(f, "d" + (k + 1), a - 0.04, 1.36 - k * 0.1, 0.0845, 0.07);
    // tiny fixed indicators along the bottom of the face
    f.box("emitBlue", a - 0.11, 0.925, 0.086, 0.02, 0.012, 0.004, {});
    f.box("emitRedImp", a - 0.08, 0.925, 0.086, 0.02, 0.012, 0.004, {});
    f.box("emitAmber", a - 0.05, 0.925, 0.086, 0.02, 0.012, 0.004, {});
  }

  // ---- lobby side: heavy frame, lips, lintel with indicator housing, call panel -----------------
  {
    const f = cab.frames.lobby;
    const post0 = G.doorHW;
    const post1 = 1.5;
    const fd0 = -0.27; // frame front (10-11 cm proud of the lobby wall face at -0.16)
    B("paintedMetal", [post0, 0, fd0], [post1, G.lintelU, -G.wallT], { color: C.impMid, texel: 1.5 });
    B("paintedMetal", [-post1, 0, fd0], [-post0, G.lintelU, -G.wallT], { color: C.impMid, texel: 1.5 });
    B("paintedMetal", [-post1, G.doorH, fd0], [post1, G.lintelU, -G.wallT], { color: C.impMid, texel: 1.5 }); // lintel
    // black lips cover the leaf edges / pocket slots (clear opening 2.28 × 2.94 from the lobby)
    B("paintedMetal", [G.clearHW, 0, -0.21], [post0 + 0.001, G.doorH, -G.wallT], { color: C.impBlack });
    B("paintedMetal", [-post0 - 0.001, 0, -0.21], [-G.clearHW, G.doorH, -G.wallT], { color: C.impBlack });
    B("paintedMetal", [-post0, G.doorH - 0.06, -0.21], [post0, G.doorH + 0.001, -G.wallT], { color: C.impBlack });
    // recessed post grooves + vertical light strips
    for (const s of [-1, 1]) {
      B("paintedMetal", [s * 1.31, 0.35, fd0 - 0.004], [s * 1.39, 2.95, fd0 + 0.03], { color: C.impBlack });
      // diffuser-mapped emitter: bright core, soft edges (a flat emitWhite bar blows out at 1 m)
      B("emitCoolSoft", [s * 1.337, 0.4, fd0 - 0.01], [s * 1.363, 2.9, fd0 + 0.0], { uv: "keep" });
      B("paintedMetal", [s * 1.22, 0.0, fd0 - 0.02], [s * 1.28, 0.3, fd0], { color: C.impDark }); // foot blocks
    }
    // indicator hood above the lintel: projects G.hoodD off the wall (6 cm beyond the frame face) so the
    // readout stays in front of any lobby-side header trim; matte face (a glossy one only mirrors the lobby)
    const hd = -G.hoodD;
    B("paintedMetal", [-0.6, G.lintelU, hd + 0.01], [0.6, G.lintelU + 0.3, -G.wallT], { color: C.impBlack, texel: 2 });
    B("paintedMetal", [-0.56, G.lintelU + 0.03, hd + 0.002], [0.56, G.lintelU + 0.27, hd + 0.01], { color: C.impDark, texel: 2 });
    B("paintedMetal", [-0.54, G.lintelU + 0.05, hd - 0.001], [0.54, G.lintelU + 0.25, hd + 0.002], { color: C.impBlack, texel: 2 });
    B("paintedMetal", [-0.62, G.lintelU + 0.28, hd - 0.012], [0.62, G.lintelU + 0.3, -G.wallT], { color: C.impDark }); // cap (keeps the 3.6 m clearance)
    B("paintedMetal", [-0.62, G.lintelU - 0.01, hd - 0.012], [0.62, G.lintelU + 0.01, -G.wallT], { color: C.impDark }); // sill
    for (const s of [-1, 1]) B("paintedMetal", [s * 0.6, G.lintelU + 0.01, hd - 0.006], [s * 0.62, G.lintelU + 0.28, -G.wallT], { color: C.impDark }); // cheeks
    decal(f, "turbolift", 0, G.doorH + 0.19, fd0 * -1 - G.wallT + 0.002, 0.7);

    // call panel: housing on the wall, 0.35 m clear of the frame
    // housing n 0..0.06, bezel to 0.065, interactable face mesh 0.065..0.073 (network.js), labels ≥ 0.0745
    const a = G.callA;
    f.box("paintedMetal", a, G.callU, 0.03, 0.34, 0.5, 0.06, { color: C.impBlack, texel: 2 });
    f.box("paintedMetal", a, G.callU, 0.0625, 0.32, 0.48, 0.005, { color: C.impDark, texel: 2 }); // bezel
    f.box("paintedMetal", a, G.callU + 0.32, 0.01, 0.34, 0.1, 0.02, { color: C.impBlack, texel: 2 }); // label plate
    decal(f, "turbolift", a, G.callU + 0.32, 0.0205, 0.3);
    decal(f, "call", a, G.callU - 0.115, 0.0745, 0.1);
    decal(f, "deck", a - 0.08, G.callU + 0.17, 0.0745, 0.09);
    decal(f, "d" + Math.min(4, Math.max(1, cab.deck)), a + 0.06, G.callU + 0.17, 0.0745, 0.06);
    f.box("emitBlue", a - 0.12, G.callU - 0.2, 0.076, 0.02, 0.012, 0.004, {});
    f.box("emitRedImp", a - 0.09, G.callU - 0.2, 0.076, 0.02, 0.012, 0.004, {});
  }

  // ---- colliders (static) ----------------------------------------------------------------------
  COL([HI, 0, 0], [HB, G.boxH, G.depth], "lift-wall");
  COL([-HB, 0, 0], [-HI, G.boxH, G.depth], "lift-wall");
  COL([-HB, 0, G.inD1], [HB, G.boxH, G.depth], "lift-wall");
  COL([G.clearHW, 0, 0], [HB, G.boxH, G.inD0 + 0.06], "lift-wall");
  COL([-HB, 0, 0], [-G.clearHW, G.boxH, G.inD0 + 0.06], "lift-wall");
  COL([G.clearHW, 0, -0.27], [1.5, G.lintelU, -G.wallT], "lift-frame");
  COL([-1.5, 0, -0.27], [-G.clearHW, G.lintelU, -G.wallT], "lift-frame");

  // ---- light: one point in the ceiling channel; the ride animates it --------------------------------
  const lp = cab.P(0, G.ceil - 0.15, 2.0);
  const light = { type: "point", pos: [lp.x, lp.y, lp.z], color: 0xdfe8ff, intensity: 9, distance: 6.5, decay: 2, priority: 0.85 };
  ctx.lights.push(light);
  cab.light = light;
  cab.lightBase = { pos: [lp.x, lp.y, lp.z], color: 0xdfe8ff, intensity: 9 };
  return { light };
}
