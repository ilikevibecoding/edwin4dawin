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
  clearHW: 1.14, // frame reveals narrow the clear opening to 2.28
  clearH: 2.86, // inner header lowers the clear height inside the cabin
  leafW: 1.24,
  leafH: 2.965, // leaf height: from the sill plate (0.045) to 1 cm inside the wall above the hole
  leafLift: 0.045, // leaf bottom rides just above the sill plate
  leafTravel: 1.07, // open leaves stop 7 cm short of the reveal so their edge stays visible
  leafT: 0.1,
  leafD: -0.08, // leaf plane centre: inside the lobby wall thickness
  postOuter: 1.6, // jambs run from the reveal (1.14) out to 1.60: a 0.46 m heavy frame
  lintelU: 3.3,
  hoodD: 0.33, // lintel indicator hood front, measured from the bounds face (wall face is at 0.16)
  spawnD: 1.2, // feet position after a ride: 1.2 m inside the doors
  panelD: 1.3, // deck-select panel centre depth on the right-hand wall
  panelU: 1.2,
  btnA: 1.2, // deck buttons column (depth) and top button height
  btnU0: 1.36,
  btnStep: 0.1,
  dispA: 1.39, // 7-segment readout column on the deck-select panel
  callA: 2.13, // call panel centre along the lobby face, viewer's right of the door (0.35 m clear of the jamb)
  callU: 1.2,
  plqU: 1.9, // back-wall deck readout plate centre height
  lightD: 2.6, // cabin point light: deep and low so it cannot pool on the lobby floor
  lightU: 2.2,
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
// dark kick plate, one vent + one equipment panel in the top row, and a varied middle row of inset
// details (vent / indicator cluster / raised plate / plain) so no two neighbours repeat.
// ---------------------------------------------------------------------------
const MID_VARIANTS = ["inset", "vent", "plain", "lamps"];

function panelField(kit, C, wall, h0, h1, rand, opts = {}) {
  const gap = 0.025;
  const faceT = 0.03;
  const { kickTop = 0.34, rows = [0.365, 1.3, 1.325, 2.35, 2.375, 3.02], cols = 4, ventCol = 1, gearCol = 3, skip = null, midRow = null, midOffset = 0 } = opts;
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
        // vent: matte black recess with angled slats
        wall.box(a, b, v0, v1, 0.0, faceT, "liftMatte", { color: C.impBlack });
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
        wall.box(cx - 0.11, cx + 0.11, cv - 0.09, cv + 0.07, -0.062, -0.055, "blackGloss", { color: C.impBlack });
        wall.box(cx - 0.08, cx - 0.05, cv - 0.06, cv - 0.03, -0.066, -0.06, "emitBlue", {});
        wall.box(cx - 0.03, cx + 0.0, cv - 0.06, cv - 0.03, -0.066, -0.06, "emitRedImp", {});
        wall.box(cx + 0.02, cx + 0.05, cv - 0.06, cv - 0.03, -0.066, -0.06, "emitAmber", {});
        wall.box(cx + 0.06, cx + 0.09, cv + 0.09, v1 + 0.03, -0.03, -0.006, "paintedMetal", { color: C.impMid, texel: 2 });
        wall.box(cx + 0.045, cx + 0.105, v1 - 0.05, v1 - 0.01, -0.036, 0.0, "paintedMetal", { color: C.impDark });
        continue;
      }
      if (row === 1) {
        const kind = midRow ? midRow[ci] : MID_VARIANTS[(ci + midOffset) % MID_VARIANTS.length];
        const cx = (a + b) / 2;
        const cv = (v0 + v1) / 2;
        if (kind === "inset") {
          // raised inner plate (alternate tint so it reads as a plate) with a recessed horizontal seam
          wall.box(a + 0.1, b - 0.1, v0 + 0.1, v1 - 0.1, -0.012, 0.0, "impPanel", { color: col === C.impWhite ? C.impGrey : C.impWhite, texel: 1.0 });
          const sv = v0 + 0.1 + (v1 - v0 - 0.2) * 0.62;
          wall.box(a + 0.1, b - 0.1, sv, sv + 0.014, -0.012, -0.004, "paintedMetal", { color: C.impBlack });
        } else if (kind === "vent") {
          // inset louvre: dark recess ringed by the panel, 7 angled slats
          wall.box(a + 0.12, b - 0.12, v0 + 0.14, v1 - 0.14, -0.008, 0.0, "liftMatte", { color: C.impBlack });
          const slats = 7;
          for (let s = 0; s < slats; s++) {
            const sv = v0 + 0.2 + ((v1 - v0 - 0.4) * s) / (slats - 1);
            wall.box(a + 0.16, b - 0.16, sv - 0.01, sv + 0.01, -0.02, -0.008, "paintedMetal", { color: C.impMid, texel: 2 });
          }
          wall.box(a + 0.12, b - 0.12, v0 + 0.14, v0 + 0.17, -0.014, -0.008, "paintedMetal", { color: C.impMid });
          wall.box(a + 0.12, b - 0.12, v1 - 0.17, v1 - 0.14, -0.014, -0.008, "paintedMetal", { color: C.impMid });
        } else if (kind === "lamps") {
          // indicator cluster: bezel, black gloss plate, two rows of small lamps and a readout strip
          wall.box(cx - 0.19, cx + 0.19, cv - 0.11, cv + 0.11, -0.006, 0.0, "paintedMetal", { color: C.impMid, texel: 2 });
          wall.box(cx - 0.17, cx + 0.17, cv - 0.09, cv + 0.09, -0.014, -0.006, "liftMatte", { color: C.impBlack });
          const lampMats = [
            ["emitBlue", "emitBlue", "emitAmber", "emitBlue"],
            ["emitRedImp", "emitGreen", "emitBlue", "emitAmber"],
          ];
          lampMats.forEach((rowMats, ri2) => {
            rowMats.forEach((m, k) => {
              const lx = cx - 0.13 + k * 0.045;
              const lv = cv + 0.05 - ri2 * 0.045;
              wall.box(lx - 0.01, lx + 0.01, lv - 0.01, lv + 0.01, -0.018, -0.014, m, {});
            });
          });
          wall.box(cx + 0.03, cx + 0.15, cv + 0.02, cv + 0.07, -0.018, -0.014, "screenImp2", { uv: "keep" });
          wall.box(cx - 0.13, cx + 0.15, cv - 0.07, cv - 0.055, -0.017, -0.014, "emitBlue", {});
        }
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

// Recessed push button: dark bezel ring standing 1.3 cm proud of the face, a black gloss cap sunk 5 mm
// inside it. The lit ring (network.js lamp) sits between cap and bezel.
function pushButton(frame, C, a, b, nFace, size) {
  const half = size / 2;
  const ring = 0.006;
  for (const [da, db, sa, sb] of [
    [0, half - ring / 2, size, ring],
    [0, -half + ring / 2, size, ring],
    [half - ring / 2, 0, ring, size - 2 * ring],
    [-half + ring / 2, 0, ring, size - 2 * ring],
  ]) {
    frame.box("paintedMetal", a + da, b + db, nFace + 0.0065, sa, sb, 0.013, { color: C.impDark, texel: 3 });
  }
  frame.box("blackGloss", a, b, nFace + 0.0065, size - 2 * ring - 0.02, size - 2 * ring - 0.02, 0.007, { color: C.impBlack });
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
  B("impFloor", [-HB, 0, 0], [HB, G.floorT, G.depth], { color: C.impDark, texel: 0.5 }); // floor: the lobbies' dark deck plate
  B("paintedMetal", [HI + 0.03, 0, 0], [HB, G.boxH, G.depth], { color: C.impBlack, texel: 0.5 }); // R wall core
  B("paintedMetal", [-HB, 0, 0], [-HI - 0.03, G.boxH, G.depth], { color: C.impBlack, texel: 0.5 }); // L wall core
  B("paintedMetal", [-HB, 0, G.inD1 + 0.03], [HB, G.boxH, G.depth], { color: C.impBlack, texel: 0.5 }); // back core
  // door wall core: sides + header (the opening through it is narrower/lower than the lobby's hole,
  // so its cut faces read as a dark reveal from the lobby)
  B("paintedMetal", [G.clearHW, 0, 0], [HB, G.boxH, G.inD0 - 0.03], { color: C.impBlack, texel: 0.5 });
  B("paintedMetal", [-HB, 0, 0], [-G.clearHW, G.boxH, G.inD0 - 0.03], { color: C.impBlack, texel: 0.5 });
  B("paintedMetal", [-G.clearHW, G.clearH, 0], [G.clearHW, G.boxH, G.inD0 - 0.03], { color: C.impBlack, texel: 0.5 });

  // ---- ceiling: grey slab with a recessed channel holding a housed, louvred fixture ------------------
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
  // fixture: dark housing hung in the channel, a narrow diffuser under it, louvre fins below that
  B("blackGloss", [-0.3, chTop - 0.12, c0 + 0.05], [0.3, chTop, c1 - 0.05], { color: C.impDark });
  B("emitWhite", [-0.13, chTop - 0.135, c0 + 0.1], [0.13, chTop - 0.12, c1 - 0.1], {}); // diffuser
  B("paintedMetal", [-0.3, chTop - 0.135, c0 + 0.05], [-0.13, chTop - 0.12, c1 - 0.05], { color: C.impDark }); // housing cheeks
  B("paintedMetal", [0.13, chTop - 0.135, c0 + 0.05], [0.3, chTop - 0.12, c1 - 0.05], { color: C.impDark });
  const finU0 = chTop - 0.18;
  const finU1 = chTop - 0.135;
  for (let dz = c0 + 0.1; dz <= c1 - 0.1 + 1e-6; dz += 0.07) {
    B("paintedMetal", [-0.29, finU0, dz - 0.004], [0.29, finU1, dz + 0.004], { color: C.impDark, texel: 2 }); // louvre fin
  }
  B("paintedMetal", [-0.32, finU0 - 0.02, c0 + 0.05], [-0.29, finU0, c1 - 0.05], { color: C.impMid, texel: 2 }); // fin rails
  B("paintedMetal", [0.29, finU0 - 0.02, c0 + 0.05], [0.32, finU0, c1 - 0.05], { color: C.impMid, texel: 2 });
  // perimeter ceiling seam (dark cove)
  B("paintedMetal", [-HI, G.ceil - 0.02, G.inD0], [HI, G.ceil, G.inD0 + 0.05], { color: C.impBlack });
  B("paintedMetal", [-HI, G.ceil - 0.02, G.inD1 - 0.05], [HI, G.ceil, G.inD1], { color: C.impBlack });
  B("paintedMetal", [-HI, G.ceil - 0.02, G.inD0], [-HI + 0.05, G.ceil, G.inD1], { color: C.impBlack });
  B("paintedMetal", [HI - 0.05, G.ceil - 0.02, G.inD0], [HI, G.ceil, G.inD1], { color: C.impBlack });

  // ---- floor border frame + sill plate between lobby floor and cabin floor ----------------------
  const fb = G.floorT;
  B("paintedMetal", [-HI, fb, G.inD0], [-HI + 0.12, fb + 0.012, G.inD1], { color: C.impMid, texel: 1.5 });
  B("paintedMetal", [HI - 0.12, fb, G.inD0], [HI, fb + 0.012, G.inD1], { color: C.impMid, texel: 1.5 });
  B("paintedMetal", [-HI, fb, G.inD1 - 0.12], [HI, fb + 0.012, G.inD1], { color: C.impMid, texel: 1.5 });
  B("paintedMetal", [-HI, fb, 0.26], [-G.clearHW, fb + 0.012, 0.38], { color: C.impMid, texel: 1.5 });
  B("paintedMetal", [G.clearHW, fb, 0.26], [HI, fb + 0.012, 0.38], { color: C.impMid, texel: 1.5 });
  // sill: mid-grey gloss plate 4 cm high spanning from 0.38 m into the lobby to the inner reveal
  // (reads against both dark floors), light edge lines on both long edges, black leaf guide slot
  B("blackGloss", [-1.32, 0, -0.38], [1.32, 0.04, 0.26], { color: C.impMid, texel: 1 });
  B("impPanel", [-1.32, 0.04, -0.38], [1.32, 0.047, -0.35], { color: C.impWhite, texel: 2 });
  B("impPanel", [-1.32, 0.04, 0.23], [1.32, 0.047, 0.26], { color: C.impWhite, texel: 2 });
  B("paintedMetal", [-1.2, 0.04, G.leafD - 0.06], [1.2, 0.046, G.leafD + 0.06], { color: C.impBlack, texel: 2 });

  // ---- wall panel fields -----------------------------------------------------------------------
  panelField(kit, C, W.rWall, G.inD0 + 0.14, G.inD1 - 0.14, rand, { cols: 4, ventCol: 2, gearCol: 0, midRow: ["inset", "plain", "vent", "lamps"] });
  panelField(kit, C, W.lWall, G.inD0 + 0.14, G.inD1 - 0.14, rand, { cols: 4, ventCol: 1, gearCol: 3, midRow: ["lamps", "plain", "inset", "vent"] });
  const placard = (a, b, v0, v1) => Math.abs((a + b) / 2) < 0.1 && v0 > 1.0 && v1 < 2.5;
  panelField(kit, C, W.back, -HI + 0.14, HI - 0.14, rand, { cols: 3, ventCol: 1, gearCol: -1, skip: placard, midRow: ["vent", "plain", "lamps"] });
  // door wall inner strips beside the reveal
  panelField(kit, C, W.frontInner, -HI + 0.14, -1.32, rand, { cols: 1, ventCol: -1, gearCol: -1, midRow: ["inset"] });
  panelField(kit, C, W.frontInner, 1.32, HI - 0.14, rand, { cols: 1, ventCol: -1, gearCol: -1, midRow: ["plain"] });
  // head-height light line recessed in the seam between the middle and top panel rows, all three walls
  const sU0 = 2.352;
  const sU1 = 2.373;
  B("emitWhite", [-HI + 0.16, sU0, G.inD1 + 0.008], [HI - 0.16, sU1, G.inD1 + 0.024], {});
  B("emitWhite", [HI + 0.008, sU0, G.inD0 + 0.16], [HI + 0.024, sU1, G.inD1 - 0.16], {});
  B("emitWhite", [-HI - 0.024, sU0, G.inD0 + 0.16], [-HI - 0.008, sU1, G.inD1 - 0.16], {});
  // back-wall deck readout: mid-grey bezel, matte black plate (a glossy one mirrors the cabin light right
  // over the digit), DECK label, lift id, blue accent line; digit + travel arrows are network lamps
  {
    const f = cab.frames.back;
    const cw = (HI * 2 - 0.28 - 0.05) / 3;
    W.back.box(-cw / 2, cw / 2, 1.325, 2.35, 0.0, 0.03, "impPanel", { color: C.impGrey, texel: 1.0 });
    W.back.box(-0.4, 0.4, G.plqU - 0.37, G.plqU + 0.37, -0.012, 0.0, "liftMatte", { color: C.impMid });
    W.back.box(-0.38, 0.38, G.plqU - 0.35, G.plqU + 0.35, -0.018, -0.012, "liftMatte", { color: C.impBlack });
    decal(f, "deck", -0.27, G.plqU + 0.26, 0.0185, 0.14);
    decal(f, "t" + Math.min(4, Math.max(1, cab.deck)), 0.27, G.plqU - 0.27, 0.0185, 0.13);
    W.back.box(-0.3, 0.3, G.plqU - 0.31, G.plqU - 0.302, -0.02, -0.018, "emitBlue", {});
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

  // ---- grab rails at 1.02 m: full width between the corner posts, bracketed every ≤ 0.8 m ----------
  {
    const rU = 1.02;
    const axisR = Math.abs(cab.R.x) > 0.5 ? "x" : "z"; // world axis of the cabin's r direction
    const axisD = axisR === "x" ? "z" : "x";
    const rail = (p0, p1, axis) => {
      const mid = p0.clone().add(p1).multiplyScalar(0.5);
      kit.cyl("paintedMetal", mid.x, mid.y, mid.z, 0.022, p0.distanceTo(p1), axis, { color: C.impHullLight, segments: 14, texel: 2 });
    };
    // bracket: wall plate + arm from the wall face (at local n = 0, proud negative) to the rail centre
    const bracket = (wall, h, n1) => {
      wall.box(h - 0.035, h + 0.035, rU - 0.055, rU + 0.055, -0.01, 0.0, "blackGloss", { color: C.impDark });
      wall.box(h - 0.013, h + 0.013, rU - 0.016, rU + 0.016, n1, -0.01, "paintedMetal", { color: C.impDark, texel: 3 });
    };
    const postIn = HI - 0.12; // inner face of the corner posts
    // back wall
    rail(cab.P(-postIn, rU, G.inD1 - 0.08), cab.P(postIn, rU, G.inD1 - 0.08), axisR);
    for (const rr of [-1.44, -0.72, 0, 0.72, 1.44]) bracket(W.back, rr, -0.08);
    // left wall: front post to back post
    rail(cab.P(-(HI - 0.08), rU, G.inD0 + 0.12), cab.P(-(HI - 0.08), rU, G.inD1 - 0.12), axisD);
    for (const dd of [0.38, 1.2, 2.0, 2.8, 3.62]) bracket(W.lWall, dd, -0.08);
    // right wall: from the deck-select housing to the back post
    rail(cab.P(HI - 0.08, rU, G.panelD + 0.24), cab.P(HI - 0.08, rU, G.inD1 - 0.12), axisD);
    for (const dd of [G.panelD + 0.3, 2.3, 3.0, 3.62]) bracket(W.rWall, dd, -0.08);
  }

  // ---- inner door reveal (heavy frame seen from inside) + header + lit reveal strips ---------------
  const rvN0 = G.inD0;
  const rvN1 = G.inD0 + 0.06;
  B("blackGloss", [G.clearHW, 0, rvN0], [1.32, G.ceil, rvN1], { color: C.impMid, texel: 1.5 });
  B("blackGloss", [-1.32, 0, rvN0], [-G.clearHW, G.ceil, rvN1], { color: C.impMid, texel: 1.5 });
  B("blackGloss", [-1.32, G.clearH, rvN0], [1.32, G.ceil, rvN1], { color: C.impMid, texel: 1.5 });
  B("paintedMetal", [-1.32, G.clearH + 0.02, rvN1], [1.32, G.clearH + 0.04, rvN1 + 0.012], { color: C.impBlack }); // header slot for the status lamp
  for (const s of [-1, 1]) B("emitWhite", [s * (G.clearHW - 0.008), 0.35, rvN0 + 0.015], [s * G.clearHW, 2.75, rvN0 + 0.045], {});
  decal(cab.frames.frontInner, "standClear", 0, G.clearH + 0.135, rvN1 - G.inD0 + 0.002, 0.62);

  // ---- deck-select panel housing (right-hand wall, centre 1.2 m) --------------------------------
  {
    const f = cab.frames.rWall;
    const a = G.panelD;
    // housing n 0..0.07, bezel to 0.075; the interactable face (network.js) is a mesh at n 0.075..0.083,
    // so everything that must read on the face sits at n ≥ 0.084
    f.box("blackGloss", a, 1.21, 0.035, 0.44, 0.72, 0.07, { color: C.impBlack });
    f.box("paintedMetal", a, 1.21, 0.0725, 0.42, 0.7, 0.005, { color: C.impDark, texel: 2 }); // bezel
    for (let k = 0; k < 4; k++) pushButton(f, C, G.btnA, G.btnU0 - k * G.btnStep, 0.083, 0.068);
    f.box("blackGloss", G.dispA, 1.3, 0.0845, 0.1, 0.16, 0.003, { color: C.impBlack }); // readout well
    f.box("blackGloss", G.dispA, 0.985, 0.086, 0.18, 0.1, 0.006, { color: C.impBlack }); // small display bezel
    f.box("screenImp1", G.dispA, 0.985, 0.091, 0.16, 0.08, 0.004, { uv: "keep" }); // small display
    decal(f, "deckSelect", a, 1.515, 0.0765, 0.3);
    decal(f, "t" + Math.min(4, Math.max(1, cab.deck)), a, 1.67, 0.032, 0.14);
    for (let k = 0; k < 4; k++) decal(f, "d" + (k + 1), a - 0.165, G.btnU0 - k * G.btnStep, 0.0845, 0.05);
    // tiny fixed indicators along the bottom of the face
    f.box("emitBlue", a - 0.13, 0.925, 0.086, 0.02, 0.012, 0.004, {});
    f.box("emitRedImp", a - 0.1, 0.925, 0.086, 0.02, 0.012, 0.004, {});
    f.box("emitAmber", a - 0.07, 0.925, 0.086, 0.02, 0.012, 0.004, {});
  }

  // ---- lobby side: heavy jambs with panel lines, lit reveals, header track, lintel + hood, call panel
  {
    const f = cab.frames.lobby;
    const PO = G.postOuter;
    const fd0 = -0.27; // inner jamb band front (11 cm proud of the lobby wall face at -0.16)
    const fd1 = -0.24; // outer band front
    const grooveU = [1.0, 1.9, 2.8]; // horizontal panel lines across both bands
    const grooveH = 0.025;
    const segs = (u0, u1, fn) => {
      let cur = u0;
      for (const g of grooveU) {
        if (g > cur && g + grooveH < u1) {
          fn(cur, g);
          cur = g + grooveH;
        }
      }
      fn(cur, u1);
    };
    for (const s of [-1, 1]) {
      const R0 = s * G.clearHW;
      const R1 = s * 1.39;
      const R2 = s * 1.45;
      const R3 = s * PO;
      // groove backings, each 1.5 cm behind its band's face (the vertical groove floor carries the strip)
      B("paintedMetal", [R0, 0.32, fd0 + 0.015], [R1, G.doorH, -G.wallT], { color: C.impBlack, texel: 1 });
      B("paintedMetal", [R1, 0.32, fd1 - 0.005], [R2, G.doorH, -G.wallT], { color: C.impBlack, texel: 1 });
      B("paintedMetal", [R2, 0.32, fd1 + 0.015], [R3, G.doorH, -G.wallT], { color: C.impBlack, texel: 1 });
      segs(0.32, G.doorH, (u0, u1) => {
        B("blackGloss", [R0, u0, fd0], [R1, u1, -G.wallT], { color: C.impMid, texel: 1.5 }); // inner band (gloss)
        B("impPanel", [R2, u0, fd1], [R3, u1, -G.wallT], { color: C.impMid, texel: 1.5 }); // outer band (matte)
      });
      // vertical groove between the bands carries the frame light strip (diffuser-mapped emitter)
      B("emitCoolSoft", [s * 1.407, 0.4, fd1 - 0.017], [s * 1.433, 2.9, fd1 - 0.005], { uv: "keep" });
      // lit reveal: a thin white strip on the jamb's inner face so the reveal is never a black slit
      B("emitWhite", [s * (G.clearHW - 0.008), 0.35, -0.205], [R0, 2.85, -0.175], {});
      // foot block with a light cap line
      B("blackGloss", [R0, 0, -0.29], [R3, 0.3, -G.wallT], { color: C.impDark, texel: 1.5 });
      B("paintedMetal", [R0, 0.3, -0.292], [R3, 0.32, -G.wallT], { color: C.impHullLight, texel: 2 });
    }
    // header track across the opening: black channel with a lighter running rail on its lower lip
    B("blackGloss", [-G.clearHW, 2.9, -0.22], [G.clearHW, G.doorH + 0.001, -G.wallT], { color: C.impBlack });
    B("paintedMetal", [-G.clearHW, 2.885, -0.225], [G.clearHW, 2.905, -0.2], { color: C.impMid, texel: 2 });
    // lintel: two bands (mid over the door, dark above) with a groove between, TURBOLIFT plate on the dark band
    B("blackGloss", [-PO, G.doorH, fd0], [PO, 3.12, -G.wallT], { color: C.impMid, texel: 1.5 });
    B("paintedMetal", [-PO, 3.12, fd1 - 0.01], [PO, 3.145, -G.wallT], { color: C.impBlack, texel: 1 }); // groove floor
    B("impPanel", [-PO, 3.145, fd1], [PO, G.lintelU, -G.wallT], { color: C.impMid, texel: 1.5 });
    decal(f, "turbolift", 0, 3.2225, -fd1 - G.wallT + 0.002, 0.56);
    // indicator hood above the lintel: projects G.hoodD off the wall (9 cm beyond the jamb face) so the
    // readout stays in front of any lobby-side trim; matte black face (a glossy one only mirrors the lobby)
    const hd = -G.hoodD;
    B("blackGloss", [-0.6, G.lintelU, hd + 0.01], [0.6, G.lintelU + 0.3, -G.wallT], { color: C.impBlack, texel: 2 });
    B("liftMatte", [-0.56, G.lintelU + 0.03, hd + 0.002], [0.56, G.lintelU + 0.27, hd + 0.01], { color: C.impDark });
    B("liftMatte", [-0.54, G.lintelU + 0.05, hd - 0.001], [0.54, G.lintelU + 0.25, hd + 0.002], { color: C.impBlack });
    B("blackGloss", [-0.62, G.lintelU + 0.28, hd - 0.012], [0.62, G.lintelU + 0.3, -G.wallT], { color: C.impDark }); // cap (keeps the 3.6 m clearance)
    B("blackGloss", [-0.62, G.lintelU - 0.01, hd - 0.012], [0.62, G.lintelU + 0.01, -G.wallT], { color: C.impDark }); // sill
    for (const s of [-1, 1]) B("blackGloss", [s * 0.6, G.lintelU + 0.01, hd - 0.006], [s * 0.62, G.lintelU + 0.28, -G.wallT], { color: C.impDark }); // cheeks

    // call panel: heavy housing on the wall, 0.35 m clear of the jamb, recessed lit call button
    // housing n 0..0.07, bezel to 0.075, interactable face mesh 0.075..0.083 (network.js), details ≥ 0.084
    const a = G.callA;
    f.box("blackGloss", a, G.callU, 0.035, 0.36, 0.6, 0.07, { color: C.impBlack });
    f.box("paintedMetal", a, G.callU, 0.0725, 0.34, 0.58, 0.005, { color: C.impDark, texel: 2 }); // bezel
    f.box("blackGloss", a, G.callU + 0.36, 0.012, 0.36, 0.1, 0.024, { color: C.impBlack }); // label plate
    f.box("paintedMetal", a, G.callU + 0.36, 0.0245, 0.34, 0.08, 0.001, { color: C.impDark, texel: 2 });
    decal(f, "turbolift", a, G.callU + 0.36, 0.0255, 0.3);
    pushButton(f, C, a, G.callU - 0.06, 0.083, 0.13);
    decal(f, "call", a, G.callU - 0.185, 0.0845, 0.1);
    decal(f, "deck", a - 0.06, G.callU + 0.17, 0.0845, 0.09);
    decal(f, "d" + Math.min(4, Math.max(1, cab.deck)), a + 0.07, G.callU + 0.17, 0.0845, 0.06);
    f.box("emitBlue", a - 0.11, G.callU - 0.235, 0.086, 0.02, 0.012, 0.004, {});
    f.box("emitRedImp", a - 0.08, G.callU - 0.235, 0.086, 0.02, 0.012, 0.004, {});
  }

  // ---- colliders (static) ----------------------------------------------------------------------
  COL([HI, 0, 0], [HB, G.boxH, G.depth], "lift-wall");
  COL([-HB, 0, 0], [-HI, G.boxH, G.depth], "lift-wall");
  COL([-HB, 0, G.inD1], [HB, G.boxH, G.depth], "lift-wall");
  COL([G.clearHW, 0, 0], [HB, G.boxH, G.inD0 + 0.06], "lift-wall");
  COL([-HB, 0, 0], [-G.clearHW, G.boxH, G.inD0 + 0.06], "lift-wall");
  COL([G.clearHW, 0, -0.29], [G.postOuter, G.lintelU, -G.wallT], "lift-frame");
  COL([-G.postOuter, 0, -0.29], [-G.clearHW, G.lintelU, -G.wallT], "lift-frame");

  // ---- light: one point deep and low in the cabin (never reaches the lobby floor); the ride animates it
  const lp = cab.P(0, G.lightU, G.lightD);
  const light = { type: "point", pos: [lp.x, lp.y, lp.z], color: 0xdfe8ff, intensity: 8, distance: 4.0, decay: 2, priority: 0.4 };
  ctx.lights.push(light);
  cab.light = light;
  cab.lightBase = { pos: [lp.x, lp.y, lp.z], color: 0xdfe8ff, intensity: 8 };
  return { light };
}
