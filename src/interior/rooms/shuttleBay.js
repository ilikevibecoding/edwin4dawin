// Deck 5 — Shuttle & Secondary Docking Bay. A 53.6 × 70 × 18 m bay off the main hangar's port
// portal: a raised landing pad with painted markings and a blue ring light, an Imperial-style shuttle
// parked on it with its wings folded up (panel lines, edge lights, wing-tip cannon pods) and the
// boarding ramp down, docking clamps and fuel lines, floodlight masts, ground crew by the portal (two
// deck crew, a tug, a bowser with lines to the pad, carts, containers), cargo pallets, a glassed control
// booth and a huge closed space door in the far wall — dark plated leaves with horizontal seams in a
// red-lit frame, set 12 m forward of the pad axis (the shuttle parks 4 m aft of the centre mark) so it
// reads past the shuttle's nose from the portal. Lit by one cool key over the shuttle, a warm flood over
// the apron and the red door glow.
//
// Deck-local metres, floor y = 0. Room bounds x -90..-36.4, y 0..18, z -140..-70.
import * as THREE from "three";
import { PALETTE } from "../../materials.js";
import { impWall, impFloor, impCeiling, impConsole, wallScreen, equipmentRack, crate, railing, pipeRun, pillar, wallSegment } from "../imperial.js";
import { pointLight, wallFrame } from "../builders.js";
import { rng } from "../../kit.js";
import { decalRect } from "../../textures.js";
import { bowser, toolCart, cargoPod } from "./hangar.js";

const PAD = { x: -64, z: -105, hw: 15, hd: 12, y: 0.12 }; // landing pad centre, half extents, height
const SHUTTLE_Z = PAD.z + 4; // parked a little off the pad's centre mark, toward the aft half of the pad
const DOOR_Z = PAD.z - 12; // space door centre: forward of the pad axis so it is not hidden behind the shuttle from the portal
const SHUTTLE_YAW = -0.85; // parked in 3/4 view: nose toward the portal (+x) and forward (-z)
const YELLOW = new THREE.Color("#d9b23c");
const KEY = [PAD.x + 5, 15.6, SHUTTLE_Z - 3]; // cool key light over the shuttle's nose quarter

export function buildShuttleBay(kit, ctx) {
  const [min, max] = ctx.bounds;
  const rand = rng(ctx.seed + 21);
  ensureMaterials(ctx);
  shell(kit, ctx);
  landingPad(kit, ctx);
  const hookup = shuttle(kit, ctx, PAD.x, SHUTTLE_Z, SHUTTLE_YAW);
  clampsAndFuel(kit, ctx, min, max, hookup);
  blastDoor(kit, ctx, min, max);
  controlBooth(kit, ctx, -46, -75.5);
  cargo(kit, ctx, min, max, rand);
  groundCrew(kit, ctx);
  floodMasts(kit, ctx);
  lighting(kit, ctx, min, max);
}

function ensureMaterials(ctx) {
  const m = ctx.materials;
  if (!m.sb_ring) {
    m.sb_ring = m.emitBlue.clone();
    m.sb_ring.emissiveIntensity = 1.1;
  }
  if (!m.sb_padStrip) {
    m.sb_padStrip = m.emitWhite.clone();
    m.sb_padStrip.emissiveIntensity = 0.8;
  }
  if (!m.sb_doorRed) {
    m.sb_doorRed = m.emitRed.clone();
    m.sb_doorRed.emissiveIntensity = 3.2;
  }
}

// ---------------------------------------------------------------------------
function shell(kit, ctx) {
  const [min, max] = ctx.bounds;
  const H = max[1];
  impFloor(kit, ctx, {});
  for (const side of ["zmin", "zmax", "xmin", "xmax"]) {
    // big plates: every panel carries bolts / hatches, so panel count is the triangle budget here
    impWall(kit, ctx, side, {
      rows: [0, 0.6, 2.4, 6.2, 10.4, 14.4, H],
      panelW: 4.4,
      paints: [
        [PALETTE.impLight, 0.56],
        [PALETTE.impGrey, 0.3],
        [PALETTE.impMid, 0.14],
      ],
      styles: { panel: 0.74, vent: 0.05, greeble: 0.07, strip: 0.08, screen: 0.02, conduit: 0.04 },
      seed: ctx.seed * 5 + side.length,
      cove: true,
    });
  }
  impCeiling(kit, ctx, {
    panelW: 6,
    rowH: 6,
    spacing: 9,
    lights: false,
    styles: { panel: 0.9, greeble: 0.03, vent: 0.07 },
    paints: [
      [PALETTE.impGrey, 0.6],
      [PALETTE.impMid, 0.3],
      [PALETTE.impLight, 0.1],
    ],
  });
  // pilasters and a string course; a heavy lintel over the portal to the main bay
  for (const z of [-136, DOOR_Z - 15.5, DOOR_Z + 15.5, -88, -76]) pillar(kit, min[0] + 0.4, z, 0, H, 0.8, PALETTE.impMid);
  for (const x of [-84, -72, -60, -48]) {
    pillar(kit, x, min[2] + 0.4, 0, H, 0.8, PALETTE.impMid);
    pillar(kit, x, max[2] - 0.4, 0, H, 0.8, PALETTE.impMid);
  }
  for (const side of ["zmin", "zmax", "xmin", "xmax"]) {
    const seg = wallSegment(ctx.bounds, side);
    const { frame, length } = wallFrame(kit, seg.from, seg.to, 0);
    frame.box("paintedMetal", length / 2, 6.28, 0.1, length, 0.16, 0.2, { color: PALETTE.impBlack, texel: 2 });
  }
  const portal = ctx.doors.find((d) => d.wall === "z");
  if (portal) {
    kit.boxMM("paintedMetal", [max[0] - 0.5, portal.h + 0.3, portal.pos[1] - portal.w / 2 - 1.4], [max[0] + 0.3, portal.h + 1.8, portal.pos[1] + portal.w / 2 + 1.4], { color: PALETTE.impDark, texel: 1.5 });
    kit.boxMM("hazard", [max[0] - 0.52, portal.h + 0.35, portal.pos[1] - portal.w / 2 - 1.2], [max[0] - 0.5, portal.h + 1.05, portal.pos[1] + portal.w / 2 + 1.2], { texel: 0.7 });
    kit.boxMM("emitAmber", [max[0] - 0.51, portal.h + 1.3, portal.pos[1] - portal.w / 2], [max[0] - 0.5, portal.h + 1.5, portal.pos[1] + portal.w / 2], {});
  }
}

// ---------------------------------------------------------------------------
// Landing pad: raised gloss slab, hazard edge, painted boundary + ring + centre cross, lit corner strips
// ---------------------------------------------------------------------------
function landingPad(kit, ctx) {
  const { x, z, hw, hd, y } = PAD;
  kit.boxMM("floorGloss", [x - hw, 0, z - hd], [x + hw, y, z + hd], { texel: 0.33 });
  kit.boxMM("hazard", [x - hw - 0.02, 0, z - hd - 0.02], [x + hw + 0.02, y - 0.01, z + hd + 0.02], { texel: 0.5 });
  kit.collider([x - hw, 0, z - hd], [x + hw, y, z + hd], "pad");
  const paint = (x0, z0, x1, z1) => kit.boxMM("impPanel", [x0, y, z0], [x1, y + 0.008, z1], { color: YELLOW, uv: "keep" });
  const t = 0.3;
  const m = 1.2;
  paint(x - hw + m, z - hd + m, x + hw - m, z - hd + m + t);
  paint(x - hw + m, z + hd - m - t, x + hw - m, z + hd - m);
  paint(x - hw + m, z - hd + m, x - hw + m + t, z + hd - m);
  paint(x + hw - m - t, z - hd + m, x + hw - m, z + hd - m);
  // touchdown ring and cross, and the blue pad ring light recessed just outside the painted ring
  const ring = new THREE.RingGeometry(6.2, 6.7, 56);
  ring.rotateX(-Math.PI / 2);
  kit.add("impPanel", ring, { pos: [x, y + 0.008, z], color: YELLOW, uv: "keep" });
  paint(x - 4.5, z - t / 2, x + 4.5, z + t / 2);
  paint(x - t / 2, z - 4.5, x + t / 2, z + 4.5);
  const ringHousing = new THREE.RingGeometry(7.0, 7.5, 64);
  ringHousing.rotateX(-Math.PI / 2);
  kit.add("paintedMetal", ringHousing, { pos: [x, y + 0.006, z], color: PALETTE.impBlack, uv: "keep" });
  const ringLight = new THREE.RingGeometry(7.1, 7.4, 64);
  ringLight.rotateX(-Math.PI / 2);
  kit.add("sb_ring", ringLight, { pos: [x, y + 0.012, z], uv: "keep" });
  // corner brackets in white and recessed white light strips along the long edges
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const cx = x + sx * (hw - 3.2);
      const cz = z + sz * (hd - 3.2);
      kit.boxMM("impPanel", [Math.min(cx, cx + sx * 2.4), y, cz - 0.15], [Math.max(cx, cx + sx * 2.4), y + 0.008, cz + 0.15], { color: PALETTE.impWhite, uv: "keep" });
      kit.boxMM("impPanel", [cx - 0.15, y, Math.min(cz, cz + sz * 2.4)], [cx + 0.15, y + 0.008, Math.max(cz, cz + sz * 2.4)], { color: PALETTE.impWhite, uv: "keep" });
    }
    kit.boxMM("paintedMetal", [x - hw + 0.4, y, z + sx * (hd - 0.6) - 0.16], [x + hw - 0.4, y + 0.01, z + sx * (hd - 0.6) + 0.16], { color: PALETTE.impBlack, texel: 2 });
    kit.boxMM("sb_padStrip", [x - hw + 0.6, y + 0.01, z + sx * (hd - 0.6) - 0.06], [x + hw - 0.6, y + 0.022, z + sx * (hd - 0.6) + 0.06], {});
  }
  // approach lane from the portal: amber lane lights in the floor
  for (let lx = PAD.x + PAD.hw + 2; lx < -38; lx += 2.6) {
    for (const s of [-1, 1]) {
      kit.boxMM("paintedMetal", [lx, 0, z + s * 5 - 0.2], [lx + 1.4, 0.02, z + s * 5 + 0.2], { color: PALETTE.impBlack, texel: 2 });
      kit.boxMM("emitAmber", [lx + 0.1, 0.02, z + s * 5 - 0.08], [lx + 1.3, 0.032, z + s * 5 + 0.08], {});
    }
  }
  void ctx;
}

// ---------------------------------------------------------------------------
// The shuttle: wedge nose, boxy fuselage with a raised cockpit, tall swept dorsal fin, two wings
// folded up on the hull's shoulders, three landing struts and a lowered starboard boarding ramp.
// Local frame: origin at the pad centre, nose toward -z, +x = starboard; `yaw` turns the whole craft
// (positive = nose swings toward -x). Colliders are AABBs of the rotated parts, chained along the hull.
// ---------------------------------------------------------------------------
function shuttle(kit, ctx, X, Z, yaw = 0) {
  const Y = PAD.y;
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const P = (x, y, z) => {
    const v = new THREE.Vector3(x, 0, z).applyQuaternion(q);
    return [X + v.x, Y + y, Z + v.z];
  };
  const add = (mat, geo, x, y, z, opts = {}) => kit.add(mat, geo, { pos: P(x, y, z), quat: q, ...opts });
  const box = (mat, x, y, z, sx, sy, sz, opts = {}) => add(mat, new THREE.BoxGeometry(sx, sy, sz), x, y, z, opts);
  const cylZ = (mat, x, y, z, r, len, opts = {}) => add(mat, new THREE.CylinderGeometry(r, r, len, opts.segments || 12).rotateX(Math.PI / 2), x, y, z, opts);
  // AABB collider of a local box (centre, half extents) after the yaw
  const col = (cx, y0, cz, hx, y1, hz, tag) => {
    const c = Math.abs(Math.cos(yaw));
    const s = Math.abs(Math.sin(yaw));
    const ex = hx * c + hz * s;
    const ez = hx * s + hz * c;
    const [wx, , wz] = P(cx, 0, cz);
    kit.collider([wx - ex, Y + y0, wz - ez], [wx + ex, Y + y1, wz + ez], tag);
  };
  // landing struts + pads
  for (const [sx, sz] of [
    [0, -4.6],
    [-2.0, 4.2],
    [2.0, 4.2],
  ]) {
    add("metal", new THREE.CylinderGeometry(0.16, 0.16, 1.5, 10), sx, 0.95, sz, { color: PALETTE.steel });
    add("tiePanel", new THREE.CylinderGeometry(0.3, 0.3, 0.5, 10), sx, 1.55, sz);
    box("tiePanel", sx, 0.12, sz, 0.9, 0.24, 0.9);
    col(sx, 0, sz, 0.45, 1.8, 0.45, "strut");
  }
  // fuselage: belly, main hull, upper spine, side skirts
  box("tiePanel", 0, 1.95, 1.0, 2.6, 0.7, 10.4);
  box("tieHull", 0, 3.1, 1.0, 3.4, 2.0, 11.0);
  box("tieHull", 0, 4.3, 1.4, 2.4, 0.6, 9.6);
  for (const s of [-1, 1]) {
    box("tiePanel", s * 1.72, 3.0, 1.0, 0.08, 1.2, 9.6);
    box("tieHull", s * 1.75, 3.65, 1.0, 0.1, 0.25, 10.4);
    // cheek pods
    box("tieHull", s * 1.5, 2.45, -3.6, 0.9, 0.9, 3.6);
  }
  // wedge nose (4-sided frustum pointing -z) and the raised cockpit with dark glazing
  const nose = new THREE.CylinderGeometry(0.55, 1.95, 5.4, 4, 1);
  nose.rotateY(Math.PI / 4);
  nose.rotateX(-Math.PI / 2);
  nose.scale(1.24, 0.74, 1); // square section → the hull's 3.4 × 2.0 cross-section
  add("tieHull", nose, 0, 3.1, -7.1);
  box("tiePanel", 0, 3.95, -5.4, 1.6, 0.12, 2.2);
  box("tieHull", 0, 5.0, -2.8, 2.2, 1.3, 2.8);
  box("tieGlass", 0, 5.25, -4.22, 1.8, 0.55, 0.04);
  for (const s of [-1, 1]) box("tieGlass", s * 1.11, 5.25, -3.2, 0.04, 0.5, 1.6);
  box("tiePanel", 0, 5.7, -2.8, 2.3, 0.12, 2.9);
  // dorsal fin: swept trapezoid, dark leading edge, white marker light at the tip
  const fin = new THREE.Shape([new THREE.Vector2(-1.6, 0), new THREE.Vector2(5.4, 0), new THREE.Vector2(5.2, 9.4), new THREE.Vector2(2.6, 9.4)]);
  const finG = new THREE.ExtrudeGeometry(fin, { depth: 0.36, bevelEnabled: false });
  finG.rotateY(-Math.PI / 2); // shape x → +z, depth → -x
  finG.translate(0.18, 0, 0);
  add("tieHull", finG, 0, 4.5, 0);
  const finPanel = new THREE.Shape([new THREE.Vector2(-0.6, 1.0), new THREE.Vector2(4.4, 1.0), new THREE.Vector2(4.4, 8.2), new THREE.Vector2(2.9, 8.2)]);
  for (const s of [-1, 1]) {
    const pg = new THREE.ExtrudeGeometry(finPanel, { depth: 0.04, bevelEnabled: false });
    pg.rotateY(-Math.PI / 2);
    pg.translate(s > 0 ? 0.2 : -0.16, 0, 0);
    add("tiePanel", pg, 0, 4.5, 0);
  }
  box("emitWhite", 0, 14.0, 3.9, 0.5, 0.12, 0.5);
  box("emitRed", 0, 5.3, 5.3, 0.44, 0.15, 0.15);
  // wings folded up: hinged on the hull shoulders, leaning 22° outward
  const wing = new THREE.Shape([new THREE.Vector2(-3.4, 0), new THREE.Vector2(3.4, 0), new THREE.Vector2(3.0, 9.6), new THREE.Vector2(-0.6, 9.6)]);
  const wingIn = new THREE.Shape([new THREE.Vector2(-2.6, 0.9), new THREE.Vector2(2.6, 0.9), new THREE.Vector2(2.4, 8.4), new THREE.Vector2(0.0, 8.4)]);
  for (const s of [-1, 1]) {
    const lean = -s * 0.38;
    const wg = new THREE.ExtrudeGeometry(wing, { depth: 0.26, bevelEnabled: false });
    wg.rotateY(-Math.PI / 2);
    wg.translate(0.13, 0, 0);
    wg.rotateZ(lean);
    add("tieHull", wg, s * 1.9, 4.0, 1.4);
    for (const f of [-1, 1]) {
      const ig = new THREE.ExtrudeGeometry(wingIn, { depth: 0.04, bevelEnabled: false });
      ig.rotateY(-Math.PI / 2);
      ig.translate(f > 0 ? 0.15 : -0.15, 0, 0);
      ig.rotateZ(lean);
      add("tiePanel", ig, s * 1.9, 4.0, 1.4);
    }
    // wing greebles, placed in the wing shape's frame (shape x = fore/aft, y = up the wing, depth
    // = across the slab) and run through the same transform chain as the slab itself
    const onWing = (mat, geo, sx, sy, depth) => {
      geo.translate(sx, sy, depth);
      geo.rotateY(-Math.PI / 2);
      geo.translate(0.13, 0, 0);
      geo.rotateZ(lean);
      add(mat, geo, s * 1.9, 4.0, 1.4);
    };
    const lead = (sy) => -3.4 + 2.8 * (sy / 9.6); // leading (forward) edge x at height sy
    const trail = (sy) => 3.4 - 0.4 * (sy / 9.6); // trailing edge
    const atX = (xf) => 0.13 - xf; // shape depth that lands a geometry's centre at final wing x = xf
    for (const f of [-1, 1]) {
      const depth = atX(f > 0 ? 0.17 : -0.21); // flush with the inner panel face on each side
      // raised panel lines across the wing and two spars up it
      for (const sy of [2.2, 4.0, 5.8, 7.4]) {
        const x0 = lead(sy) + 0.5;
        const x1 = trail(sy) - 0.5;
        onWing("tieHull", new THREE.BoxGeometry(x1 - x0, 0.07, 0.04), (x0 + x1) / 2, sy, depth);
      }
      for (const sx of [-1.4, 1.3]) onWing("tieHull", new THREE.BoxGeometry(0.07, 6.4, 0.04), sx, 4.6, depth);
      // hatch plates and a marker stencil
      onWing("tiePanel", new THREE.BoxGeometry(0.9, 0.6, 0.05), 0.4, 3.0, depth);
      onWing("tiePanel", new THREE.BoxGeometry(0.7, 0.5, 0.05), 1.6, 6.6, depth);
      onWing("emitRed", new THREE.BoxGeometry(0.5, 0.09, 0.04), 0.9, 4.9, depth);
    }
    // white edge lights along the leading edge and an amber one on the trailing edge
    for (const sy of [2.6, 5.2, 7.8]) onWing("emitWhite", new THREE.BoxGeometry(0.16, 0.4, 0.34), lead(sy) + 0.06, sy, atX(0));
    onWing("emitAmber", new THREE.BoxGeometry(0.16, 0.4, 0.34), trail(4.8) - 0.06, 4.8, atX(0));
    // wing-tip cannon pod: fairing through the slab, twin barrels reaching forward past the leading edge
    onWing("tiePanel", new THREE.BoxGeometry(2.0, 0.7, 0.6), 0.9, 8.9, atX(0));
    for (const xf of [-0.16, 0.16]) {
      onWing("tieHull", new THREE.CylinderGeometry(0.11, 0.13, 3.4, 10).rotateZ(Math.PI / 2), -0.6, 8.95, atX(xf));
      onWing("tiePanel", new THREE.CylinderGeometry(0.15, 0.15, 0.5, 10).rotateZ(Math.PI / 2), -2.2, 8.95, atX(xf));
    }
    // hinge fairing and a red tip light (the wings stay well above head height: no collider needed)
    cylZ("tiePanel", s * 1.9, 4.0, 1.4, 0.45, 5.6);
    const tip = new THREE.Vector3(0, 9.7, 1.4).applyAxisAngle(new THREE.Vector3(0, 0, 1), lean);
    box("emitRed", s * 1.9 + tip.x, 4.0 + tip.y, tip.z, 0.3, 0.2, 0.6);
  }
  // engines: rear block with three blue thrusters
  box("tiePanel", 0, 3.0, 6.7, 3.0, 1.8, 0.9);
  for (const ex of [-0.9, 0, 0.9]) {
    cylZ("tieHull", ex, 3.0, 7.05, 0.36, 0.3, { segments: 14 });
    add("emitBlue", new THREE.CircleGeometry(0.28, 14), ex, 3.0, 7.22);
  }
  // starboard boarding ramp: lit hatch in the hull side, slab down to the pad at ~24°
  box("emitWhite", 1.66, 2.55, 2.4, 0.06, 1.5, 1.7);
  box("tiePanel", 1.7, 3.4, 2.4, 0.16, 0.2, 2.0);
  box("tiePanel", 1.7, 2.55, 2.4 - 0.95, 0.16, 1.9, 0.14);
  box("tiePanel", 1.7, 2.55, 2.4 + 0.95, 0.16, 1.9, 0.14);
  const rampLen = 4.4;
  const rampAng = Math.atan2(1.7, rampLen);
  const rg = new THREE.BoxGeometry(Math.hypot(1.7, rampLen), 0.14, 1.7);
  rg.rotateZ(-rampAng); // the hull end is the high end
  add("tiePanel", rg, 1.7 + rampLen / 2, 0.85 + 0.07, 2.4);
  for (let i = 0; i < 8; i++) {
    const u = 0.4 + i * 0.5;
    box("metal", 1.7 + u, 1.7 - (1.7 / rampLen) * u + 0.085, 2.4, 0.08, 0.02, 1.6, { color: PALETTE.steel });
  }
  for (const s of [-1, 1]) {
    const hg = new THREE.CylinderGeometry(0.03, 0.03, Math.hypot(1.7, rampLen), 8);
    hg.rotateZ(Math.PI / 2 - rampAng);
    add("metal", hg, 1.7 + rampLen / 2, 0.85 + 0.9, 2.4 + s * 0.8, { color: PALETTE.steel });
  }
  // the ramp is walkable as a run of steppable slabs (a rotated ramp cannot be one axis-aligned ramp collider)
  const segs = 6;
  for (let i = 0; i < segs; i++) {
    const u0 = (i / segs) * rampLen;
    const u1 = ((i + 1) / segs) * rampLen;
    const top = 1.7 - (1.7 / rampLen) * u0;
    col(1.7 + (u0 + u1) / 2, 0, 2.4, (u1 - u0) / 2, top, 0.85, "ramp");
  }
  // hull colliders: a chain of blocks along the fuselage (the belly is 1.6 m up: the player walks around)
  for (const lz of [-8.6, -6.0, -3.4, -0.8, 1.8, 4.4, 6.6]) col(0, 0, lz, 1.8, 5.8, 1.4, "shuttle");
  for (const s of [-1, 1]) for (const lz of [-4.6, -2.6]) col(s * 1.5, 0, lz, 0.5, 3.0, 1.0, "cheek");
  // hookup pedestal on the pad's port side with umbilicals plugged into the belly
  const hook = P(-3.6, 0, 1.2);
  kit.box("paintedMetal", hook[0], Y + 0.45, hook[2], 0.6, 0.9, 0.6, { color: PALETTE.impDark, texel: 2 });
  kit.box("emitBlue", hook[0], Y + 0.95, hook[2], 0.3, 0.02, 0.3);
  kit.collider([hook[0] - 0.3, Y, hook[2] - 0.3], [hook[0] + 0.3, Y + 0.9, hook[2] + 0.3], "pedestal");
  pipeRun(kit, [P(-3.6, 0.3, 1.5), P(-2.4, 0.6, 3.0), P(-0.8, 1.55, 3.0)], 0.07, PALETTE.impBlack, "rubber");
  pipeRun(kit, [P(-3.6, 0.3, 0.9), P(-2.2, 0.7, -0.8), P(-0.6, 1.55, -0.6)], 0.06, PALETTE.impMid, "rubber");
  void ctx;
  return hook;
}

// ---------------------------------------------------------------------------
// Docking clamps at the pad corners and fuel lines from a bunker on the forward wall
// ---------------------------------------------------------------------------
function clampsAndFuel(kit, ctx, min, max, hookup) {
  const { x, z, hw, hd } = PAD;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const cx = x + sx * (hw + 1.6);
      const cz = z + sz * (hd - 4);
      kit.box("paintedMetal", cx, 0.6, cz, 2.0, 1.2, 1.6, { color: PALETTE.impDark, texel: 1.5 });
      kit.box("hazard", cx, 0.25, cz, 2.04, 0.3, 1.64, { texel: 1 });
      // arm folded over the pad edge, hydraulic ram, indicator lamp
      kit.box("metal", cx - sx * 0.5, 1.5, cz, 2.4, 0.4, 0.5, { color: PALETTE.gunmetal });
      kit.box("metal", cx - sx * 1.75, 1.15, cz, 0.5, 0.9, 0.6, { color: PALETTE.gunmetal });
      kit.cyl("metal", cx - sx * 0.5, 1.75, cz + 0.6, 0.1, 1.6, "x", { color: PALETTE.steel, segments: 8 });
      kit.box("emitAmber", cx, 1.22, cz - 0.81, 0.4, 0.08, 0.01);
      kit.collider([cx - 1.05, 0, cz - 0.85], [cx + 1.05, 1.7, cz + 0.85], "clamp");
      kit.collider([cx - sx * 2.0 - 0.3, 0, cz - 0.35], [cx - sx * 2.0 + 0.3, 1.6, cz + 0.35], "clamp");
    }
  }
  // fuel bunker on the forward wall (zmin): two horizontal tanks in a cage, manifold, lines to the pad
  const bz = min[2] + 2.4;
  for (const bx of [-70, -63]) {
    kit.cyl("paintedMetal", bx, 1.6, bz, 1.2, 5.2, "x", { color: PALETTE.impGrey, segments: 18, texel: 1 });
    for (const s of [-1, 1]) kit.add("paintedMetal", new THREE.SphereGeometry(1.2, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateZ(s * (Math.PI / 2)), { pos: [bx + s * 2.6, 1.6, bz], color: PALETTE.impGrey, texel: 1 });
    kit.cyl("hazard", bx, 1.6, bz, 1.22, 0.4, "x", { segments: 18, texel: 1 });
    for (const s of [-1.8, 1.8]) kit.box("paintedMetal", bx + s, 0.3, bz, 0.5, 0.6, 2.6, { color: PALETTE.impBlack, texel: 2 });
    kit.box("paintedMetal", bx, 1.3, bz - 1.35, 0.6, 0.8, 0.14, { color: PALETTE.impDark, texel: 2 });
    kit.box("impScreen4", bx, 1.4, bz - 1.43, 0.4, 0.3, 0.01, { uv: "keep" });
    kit.box("emitGreen", bx + 0.15, 1.05, bz - 1.43, 0.1, 0.06, 0.01);
    kit.collider([bx - 3.9, 0, bz - 1.4], [bx + 3.9, 2.9, bz + 1.3], "tank");
  }
  railing(kit, -75, bz + 3.0, -58, bz + 3.0, 0);
  railing(kit, -75, bz - 1.9, -75, bz + 3.0, 0);
  railing(kit, -58, bz - 1.9, -58, bz + 3.0, 0);
  // manifold + lines along the floor and across the pad to the shuttle's hookup pedestal
  kit.boxMM("paintedMetal", [-67.5, 0, bz + 1.6], [-65.5, 0.6, bz + 2.3], { color: PALETTE.impDark, texel: 2 });
  for (const dx of [-0.6, 0.6]) kit.cyl("metal", -66.5 + dx, 0.8, bz + 1.95, 0.22, 0.05, "y", { color: new THREE.Color("#b8352a"), segments: 12 });
  const hx = hookup[0];
  const hz = hookup[2];
  pipeRun(kit, [[-66.5, 0.35, bz + 2.3], [-66.5, 0.12, bz + 4.0], [hx - 0.3, 0.12, z - hd - 0.6], [hx - 0.3, PAD.y + 0.06, z - hd + 0.4], [hx - 0.3, PAD.y + 0.06, hz - 0.2]], 0.08, PALETTE.impMid, "metal");
  pipeRun(kit, [[-66.0, 0.35, bz + 2.3], [-66.0, 0.1, bz + 4.0], [hx + 0.3, 0.1, z - hd - 0.6], [hx + 0.3, PAD.y + 0.05, z - hd + 0.4], [hx + 0.3, PAD.y + 0.05, hz - 0.2]], 0.06, PALETTE.impBlack, "rubber");
  void max;
}

// ---------------------------------------------------------------------------
// Closed space door in the far wall (xmin): two dark armoured leaves with deep horizontal seams and a
// hazard centre join, standing proud of the wall in a heavy black frame with wide red-lit edges
// ---------------------------------------------------------------------------
function blastDoor(kit, ctx, min, max) {
  const x = min[0];
  const zc = DOOR_Z;
  const hw = 12; // half width along z
  const h = 15;
  const d = 1.4; // frame depth: the door stands well proud of the plate wall
  // frame: jambs, head, sill, black with a light-grey chamfer band and coarse hazard strips
  kit.boxMM("paintedMetal", [x, 0, zc - hw - 1.6], [x + d + 0.3, h + 1.6, zc - hw], { color: PALETTE.impBlack, texel: 1.5 });
  kit.boxMM("paintedMetal", [x, 0, zc + hw], [x + d + 0.3, h + 1.6, zc + hw + 1.6], { color: PALETTE.impBlack, texel: 1.5 });
  kit.boxMM("paintedMetal", [x, h, zc - hw - 1.6], [x + d + 0.3, h + 1.6, zc + hw + 1.6], { color: PALETTE.impBlack, texel: 1.5 });
  kit.boxMM("paintedMetal", [x, 0, zc - hw], [x + d + 0.3, 0.35, zc + hw], { color: PALETTE.impBlack, texel: 1.5 });
  for (const s of [-1, 1]) {
    const zj = zc + s * (hw + 0.8);
    kit.boxMM("impPanel", [x + d + 0.3, 0.4, zj - 0.5], [x + d + 0.32, h + 1.5, zj + 0.5], { color: PALETTE.impLight, uv: "keep" });
    kit.boxMM("hazard", [x + d + 0.3, 0.4, zj - 0.5 + (s < 0 ? 0 : 0.6)], [x + d + 0.33, h + 1.5, zj + 0.5 - (s < 0 ? 0.6 : 0)], { texel: 0.5 });
  }
  // wide red-lit inner edges of the frame (jambs + head), the room's red key
  for (const s of [-1, 1]) kit.boxMM("sb_doorRed", [x + d - 0.1, 0.4, zc + s * hw + (s < 0 ? -0.34 : 0.02)], [x + d + 0.28, h + 0.3, zc + s * hw + (s < 0 ? -0.02 : 0.34)], {});
  kit.boxMM("sb_doorRed", [x + d - 0.1, h + 0.02, zc - hw], [x + d + 0.28, h + 0.34, zc + hw], {});
  // leaves: dark slab, five rows of long armour plates in 0.2 m relief separated by deep seams, a
  // black centre join with hazard bands and an amber seam lamp
  for (const s of [-1, 1]) {
    const z0 = s < 0 ? zc - hw : zc + 0.14;
    const z1 = s < 0 ? zc - 0.14 : zc + hw;
    kit.boxMM("paintedMetal", [x, 0.35, z0], [x + d - 0.5, h, z1], { color: PALETTE.impBlack, texel: 0.8 });
    const rows = 5;
    for (let j = 0; j < rows; j++) {
      const py0 = 0.7 + (j / rows) * (h - 1.4);
      const py1 = 0.7 + ((j + 1) / rows) * (h - 1.4) - 0.36;
      const pz0 = z0 + 0.45;
      const pz1 = z1 - 0.45;
      kit.boxMM("impPanel1", [x + d - 0.5, py0, pz0], [x + d - 0.3, py1, pz1], { color: j % 2 ? PALETTE.impDark : PALETTE.impMid, uv: "keep" });
      // recessed lifting-eye plates and a bolt strip along the plate's lower edge
      kit.boxMM("paintedMetal", [x + d - 0.3, py0 + 0.1, pz0 + 0.3], [x + d - 0.28, py0 + 0.35, pz1 - 0.3], { color: PALETTE.impBlack, texel: 2 });
      for (const zz of [pz0 + 2.5, (pz0 + pz1) / 2, pz1 - 2.5]) kit.boxMM("paintedMetal", [x + d - 0.3, (py0 + py1) / 2 - 0.5, zz - 0.5], [x + d - 0.29, (py0 + py1) / 2 + 0.5, zz + 0.5], { color: PALETTE.impBlack, texel: 2 });
    }
    // meeting edge: hazard band on the leaf's inner edge + amber seam lamp
    kit.boxMM("hazard", [x + d - 0.34, 0.5, s < 0 ? zc - 1.6 : zc + 0.14], [x + d - 0.3, h - 0.3, s < 0 ? zc - 0.14 : zc + 1.6], { texel: 0.5 });
    kit.boxMM("emitAmber", [x + d - 0.31, 0.8, s < 0 ? zc - 0.5 : zc + 0.18], [x + d - 0.29, h - 0.6, s < 0 ? zc - 0.18 : zc + 0.5], {});
    // track shoes at the sill
    for (const zz of [z0 + 1.5, (z0 + z1) / 2, z1 - 1.5]) kit.boxMM("metal", [x + d - 0.6, 0.35, zz - 0.5], [x + d - 0.2, 0.7, zz + 0.5], { color: PALETTE.gunmetal });
  }
  kit.collider([x, 0, zc - hw - 1.6], [x + d + 0.35, h + 1.6, zc + hw + 1.6], "blastdoor");
  // door number plate on the frame head (the head reaches to 0.4 under the ceiling), floor hazard band in front
  kit.boxMM("paintedMetal", [x + d + 0.3, h + 0.35, zc - 4.2], [x + d + 0.42, h + 1.35, zc + 4.2], { color: PALETTE.impBlack, texel: 2 });
  kit.boxMM("emitWhite", [x + d + 0.42, h + 0.55, zc - 3.8], [x + d + 0.44, h + 1.15, zc + 3.8], {});
  kit.boxMM("emitRed", [x + d + 0.42, h + 1.38, zc - 4.2], [x + d + 0.44, h + 1.5, zc + 4.2], {});
  kit.boxMM("hazard", [x + d + 0.35, 0, zc - hw - 1.6], [x + d + 2.4, 0.012, zc + hw + 1.6], { texel: 0.5 });
  const seg = wallSegment(ctx.bounds, "xmin");
  const { frame } = wallFrame(kit, seg.from, seg.to, 0);
  frame.add("decal", new THREE.PlaneGeometry(2.4, 2.4), seg.from[1] - (zc - hw - 4), 4.0, 0.012, { uv: "keep", uvRect: decalRect(10) });
  frame.add("decal", new THREE.PlaneGeometry(2.4, 2.4), seg.from[1] - (zc + hw + 4), 4.0, 0.012, { uv: "keep", uvRect: decalRect(10) });
  void max;
}

// ---------------------------------------------------------------------------
// Control booth: glassed cabin on a plinth by the aft wall, consoles facing the pad
// ---------------------------------------------------------------------------
function controlBooth(kit, ctx, x, z) {
  const w = 7;
  const d = 4.4;
  const x0 = x - w / 2;
  const x1 = x + w / 2;
  const z0 = z - d / 2;
  const z1 = z + d / 2;
  const plinth = 0.4;
  kit.boxMM("floorGloss", [x0 - 0.6, 0, z0 - 0.6], [x1 + 0.6, plinth, z1 + 0.6], { texel: 0.5 });
  kit.boxMM("hazard", [x0 - 0.62, 0, z0 - 0.62], [x1 + 0.62, plinth - 0.01, z1 + 0.62], { texel: 1 });
  kit.collider([x0 - 0.6, 0, z0 - 0.6], [x1 + 0.6, plinth, z1 + 0.6], "plinth");
  const sill = plinth + 1.1;
  const top = plinth + 2.9;
  // solid lower walls (open on the aft side toward the wall for the entrance), glass above
  kit.boxMM("impPanel", [x0, plinth, z0], [x1, sill, z0 + 0.16], { color: PALETTE.impLight, uv: "keep" });
  kit.boxMM("impPanel", [x0, plinth, z0], [x0 + 0.16, sill, z1], { color: PALETTE.impLight, uv: "keep" });
  kit.boxMM("impPanel", [x1 - 0.16, plinth, z0], [x1, sill, z1], { color: PALETTE.impLight, uv: "keep" });
  kit.boxMM("paintedMetal", [x0 - 0.05, sill, z0 - 0.05], [x1 + 0.05, sill + 0.12, z0 + 0.2], { color: PALETTE.impBlack, texel: 2 });
  kit.boxMM("paintedMetal", [x0 - 0.05, top - 0.12, z0 - 0.05], [x1 + 0.05, top, z0 + 0.2], { color: PALETTE.impBlack, texel: 2 });
  for (const xx of [x0, x0 + w / 3, x0 + (2 * w) / 3, x1]) kit.box("paintedMetal", xx, (sill + top) / 2, z0 + 0.08, 0.12, top - sill, 0.2, { color: PALETTE.impBlack, texel: 2 });
  const gf = new THREE.PlaneGeometry(w, top - sill);
  kit.add("bridgeGlass", gf, { pos: [x, (sill + top) / 2, z0 + 0.08], uv: "keep" });
  for (const xx of [x0 + 0.08, x1 - 0.08]) {
    const gs = new THREE.PlaneGeometry(d, top - sill);
    gs.rotateY(Math.PI / 2);
    kit.add("bridgeGlass", gs, { pos: [xx, (sill + top) / 2, z], uv: "keep" });
    kit.box("paintedMetal", xx, (sill + top) / 2, z0, 0.2, top - sill, 0.12, { color: PALETTE.impBlack, texel: 2 });
    kit.box("paintedMetal", xx, (sill + top) / 2, z1, 0.2, top - sill, 0.12, { color: PALETTE.impBlack, texel: 2 });
    kit.box("paintedMetal", xx, (sill + top) / 2, z0 + d / 2, 0.2, top - sill, 0.12, { color: PALETTE.impBlack, texel: 2 });
  }
  kit.boxMM("paintedMetal", [x0 - 0.4, top, z0 - 0.4], [x1 + 0.4, top + 0.35, z1 + 0.4], { color: PALETTE.impDark, texel: 1.5 });
  kit.boxMM("emitWhiteSoft", [x0 + 0.5, top - 0.02, z - 0.2], [x1 - 0.5, top, z + 0.2], { uv: "keep" });
  kit.boxMM("emitBlue", [x0 + 1, top + 0.1, z0 - 0.42], [x1 - 1, top + 0.25, z0 - 0.4], {});
  kit.collider([x0 - 0.1, plinth, z0 - 0.1], [x1 + 0.1, top, z0 + 0.2], "boothglass");
  kit.collider([x0 - 0.1, plinth, z0], [x0 + 0.2, top, z1], "boothwall");
  kit.collider([x1 - 0.2, plinth, z0], [x1 + 0.1, top, z1], "boothwall");
  // consoles facing the pad (-z), operator screens on the aft wall
  for (const cx of [x - 2.2, x + 0.2]) impConsole(kit, ctx, { x: cx, z: z0 + 1.3, y: plinth, yaw: 0, w: 2.0, d: 0.8, screens: [0, 1], chair: cx < x, seed: ctx.seed + cx });
  const seg = wallSegment(ctx.bounds, "zmax");
  wallScreen(kit, ctx, { side: "zmax", u: seg.from[0] - x, v: plinth + 2.0, w: 2.4, h: 1.2, screen: 2 });
  equipmentRack(kit, ctx, { side: "zmax", u: seg.from[0] - (x1 - 1.0), w: 1.2, h: 2.2, seed: ctx.seed + 5, lit: "emitAmber" });
}

// ---------------------------------------------------------------------------
function cargo(kit, ctx, min, max, rand) {
  // pallets with strapped crate stacks near the portal, a loader tug, drums by the wall
  const pallet = (x, z, n, seed) => {
    kit.box("paintedMetal", x, 0.08, z, 2.6, 0.16, 2.0, { color: PALETTE.impDark, texel: 2 });
    kit.box("hazard", x, 0.08, z + 1.01, 2.6, 0.12, 0.02, { texel: 1 });
    for (let i = 0; i < n; i++) {
      const sx = 1.0 + rand() * 0.6;
      crate(kit, ctx, { x: x + (i % 2 ? 0.65 : -0.65), y: 0.16 + Math.floor(i / 2) * 0.95, z, sx, sy: 0.95, sz: 1.2 + rand() * 0.5, yaw: (rand() - 0.5) * 0.15, seed: seed + i });
    }
  };
  pallet(-42.5, -124, 4, ctx.seed + 31);
  pallet(-46, -127.5, 3, ctx.seed + 41);
  pallet(-41.5, -130.5, 2, ctx.seed + 51);
  pallet(-52, -80, 4, ctx.seed + 61);
  // cargo loader tug: low chassis, cab, forks
  const tx = -47;
  const tz = -121;
  kit.box("paintedMetal", tx, 0.5, tz, 1.6, 0.6, 3.0, { color: PALETTE.impMid, texel: 1.5 });
  kit.box("paintedMetal", tx, 1.35, tz + 0.9, 1.4, 1.1, 1.2, { color: PALETTE.impDark, texel: 1.5 });
  kit.box("tieGlass", tx, 1.5, tz + 0.29, 1.2, 0.6, 0.04);
  kit.box("hazard", tx, 0.2, tz, 1.64, 0.2, 3.04, { texel: 1 });
  for (const sx of [-0.7, 0.7]) kit.box("metal", tx + sx, 0.25, tz - 2.2, 0.12, 0.1, 1.6, { color: PALETTE.steel });
  for (const [sx, sz] of [
    [-0.85, -1.0],
    [0.85, -1.0],
    [-0.85, 1.0],
    [0.85, 1.0],
  ]) {
    kit.cyl("rubber", tx + sx, 0.3, tz + sz, 0.3, 0.3, "x", { color: PALETTE.impBlack, segments: 12 });
  }
  kit.box("emitAmber", tx, 1.95, tz + 0.9, 0.3, 0.1, 0.3);
  kit.collider([tx - 0.9, 0, tz - 3.0], [tx + 0.9, 2.0, tz + 1.5], "tug");
  // drums by the forward wall
  for (let i = 0; i < 5; i++) {
    const x = -50 + i * 1.1 + (rand() - 0.5) * 0.3;
    const z = min[2] + 1.6 + (rand() - 0.5) * 0.4;
    kit.cyl("paintedMetal", x, 0.6, z, 0.42, 1.2, "y", { color: i % 2 ? PALETTE.impMid : PALETTE.impGrey, segments: 14, texel: 1 });
    kit.cyl("hazard", x, 0.6, z, 0.43, 0.2, "y", { segments: 14, texel: 1 });
    kit.collider([x - 0.45, 0, z - 0.45], [x + 0.45, 1.25, z + 0.45], "drum");
  }
  // wall dressing: racks and screens on the aft wall away from the booth, warning decals by the portal
  equipmentRack(kit, ctx, { side: "zmax", u: 28, w: 1.4, h: 2.6, seed: ctx.seed + 7 }); // x = -64.4
  wallScreen(kit, ctx, { side: "zmax", u: 26, v: 1.7, w: 1.4, h: 0.8, screen: 1 });
  const decal = (side, u, v, idx, size = 1.2) => {
    const seg = wallSegment(ctx.bounds, side);
    const { frame } = wallFrame(kit, seg.from, seg.to, 0);
    frame.add("decal", new THREE.PlaneGeometry(size, size), u, v, 0.012, { uv: "keep", uvRect: decalRect(idx) });
  };
  decal("xmax", -95 - min[2] + 2.2, 2.4, 1, 1.4);
  decal("xmax", -115 - min[2] - 2.2, 2.4, 7, 1.4);
  decal("xmax", -105 - min[2], 13.2, 10, 2.4);
  void max;
}

// ---------------------------------------------------------------------------
// Ground crew on the apron between the portal and the pad — the foreground of the fixed view from
// the portal (camera x -38, z -105 looking -x): a bowser on the right with its fuel lines run across
// the apron to the pad's near clamp, two deck crew (one at the coupling, one walking a hose), a tug
// cart on the left, tool carts and containers
// ---------------------------------------------------------------------------
function groundCrew(kit, ctx) {
  bowser(kit, ctx, -44.6, -112.0, 0.35);
  tugCart(kit, ctx, -44.2, -100.2, 0.5);
  toolCart(kit, ctx, -41.5, -113.6, 0.4);
  toolCart(kit, ctx, -42.4, -96.6, -0.9);
  toolCart(kit, ctx, -52.5, -93.5, 0.3);
  cargoPod(kit, ctx, { x: -40.8, z: -97.9, sx: 1.4, sy: 1.1, sz: 1.2, yaw: 0.25 - Math.PI / 2, tone: 1, label: 11 });
  cargoPod(kit, ctx, { x: -40.9, y: 1.1, z: -97.8, sx: 1.1, sy: 0.8, sz: 1.0, yaw: -0.1 - Math.PI / 2, tone: 2, label: 6 });
  // fuel lines from the bowser's pump to the pad edge by the near clamp, with a floor coupling block
  pipeRun(kit, [[-44.0, 0.15, -109.4], [-46.2, 0.1, -109.6], [-48.4, 0.1, -110.3], [-49.2, PAD.y + 0.08, -110.9], [-51.5, PAD.y + 0.08, -110.2]], 0.06, PALETTE.impBlack, "rubber");
  pipeRun(kit, [[-44.4, 0.12, -109.7], [-46.6, 0.08, -110.0], [-48.4, 0.08, -110.9], [-49.2, PAD.y + 0.06, -111.5]], 0.045, PALETTE.impMid, "rubber");
  kit.box("paintedMetal", -48.6, 0.18, -111.0, 0.9, 0.36, 1.0, { color: PALETTE.impDark, texel: 2 });
  kit.box("emitAmber", -48.6, 0.37, -111.0, 0.3, 0.02, 0.3);
  kit.collider([-49.05, 0, -111.5], [-48.15, 0.4, -110.5], "coupling");
  // deck crew: one crouched at the coupling, one standing by the tug with a hose over the shoulder
  crewFigure(kit, ctx, { x: -47.9, z: -110.0, yaw: -2.3, crouch: true });
  crewFigure(kit, ctx, { x: -45.2, z: -103.6, yaw: 2.4 });
  pipeRun(kit, [[-45.0, 1.35, -103.4], [-44.4, 0.9, -102.9], [-44.2, 0.1, -102.6], [-45.6, 0.1, -102.8]], 0.05, PALETTE.impBlack, "rubber");
}

/** Deck crew figure: capsule torso, cylinder legs and arms, black helmet with a dark visor, in Imperial grey. */
function crewFigure(kit, ctx, { x, z, yaw = 0, crouch = false }) {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const add = (mat, geo, lx, ly, lz, extra = {}) => {
    const v = new THREE.Vector3(lx, ly, lz).applyQuaternion(q);
    return kit.add(mat, geo, { pos: [v.x + x, ly, v.z + z], quat: q, ...extra });
  };
  const grey = { color: PALETTE.impGrey, texel: 3 };
  const legH = crouch ? 0.5 : 0.85;
  for (const s of [-1, 1]) {
    add("paintedMetal", new THREE.CylinderGeometry(0.09, 0.1, legH, 8), s * 0.13, legH / 2 + 0.05, crouch ? -0.15 : 0, grey);
    add("rubber", new THREE.BoxGeometry(0.16, 0.1, 0.3), s * 0.13, 0.05, 0.04, { color: PALETTE.impBlack });
  }
  const torsoY = legH + 0.05 + 0.42;
  add("paintedMetal", new THREE.CapsuleGeometry(0.2, 0.5, 4, 10), 0, torsoY, 0, grey);
  add("rubber", new THREE.BoxGeometry(0.42, 0.08, 0.28), 0, legH + 0.12, 0, { color: PALETTE.impBlack });
  add("emitBlue", new THREE.BoxGeometry(0.06, 0.03, 0.01), 0.1, torsoY + 0.14, 0.2);
  // arms: down at the sides, or forward when crouched at the coupling
  for (const s of [-1, 1]) {
    const arm = new THREE.CylinderGeometry(0.055, 0.06, 0.62, 8);
    if (crouch) arm.rotateX(-1.1);
    add("paintedMetal", arm, s * 0.27, crouch ? torsoY - 0.05 : torsoY - 0.1, crouch ? 0.28 : 0.02, grey);
  }
  // helmet: black dome with a dark visor band and a chin guard
  const headY = torsoY + 0.5;
  add("paintedMetal", new THREE.SphereGeometry(0.15, 12, 8), 0, headY, 0, { color: PALETTE.impBlack, texel: 3 });
  add("darkGloss", new THREE.BoxGeometry(0.2, 0.07, 0.06), 0, headY + 0.01, 0.13);
  add("paintedMetal", new THREE.BoxGeometry(0.22, 0.08, 0.1), 0, headY - 0.12, 0.08, { color: PALETTE.impDark, texel: 3 });
  kit.collider([x - 0.3, 0, z - 0.3], [x + 0.3, headY + 0.15, z + 0.3], "crew");
  void ctx;
}

/** Tug cart: low four-wheel tractor with a drawbar, a seat, a roll bar with a beacon and a rear hitch. */
function tugCart(kit, ctx, x, z, yaw) {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const add = (mat, geo, lx, ly, lz, extra = {}) => {
    const v = new THREE.Vector3(lx, ly, lz).applyQuaternion(q);
    return kit.add(mat, geo, { pos: [v.x + x, ly, v.z + z], quat: q, ...extra });
  };
  const box = (mat, lx, ly, lz, w, h, d, extra = {}) => add(mat, new THREE.BoxGeometry(w, h, d), lx, ly, lz, extra);
  box("paintedMetal", 0, 0.45, 0, 1.4, 0.5, 2.6, { color: PALETTE.impMid, texel: 1.5 });
  box("hazard", 0, 0.24, 0, 1.42, 0.14, 2.62, { texel: 1 });
  box("paintedMetal", 0, 0.95, -0.7, 1.2, 0.5, 1.0, { color: PALETTE.impDark, texel: 2 }); // engine cowl
  box("rubber", 0, 0.85, 0.5, 0.7, 0.16, 0.6, { color: PALETTE.impBlack }); // seat
  box("rubber", 0, 1.15, 0.85, 0.7, 0.5, 0.1, { color: PALETTE.impBlack });
  add("metal", new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), 0, 1.0, -0.15, { color: PALETTE.steel });
  add("metal", new THREE.TorusGeometry(0.16, 0.02, 6, 14).rotateX(Math.PI / 2 - 0.5), 0, 1.22, -0.2, { color: PALETTE.impBlack });
  for (const s of [-1, 1]) box("paintedMetal", s * 0.6, 1.4, 0.4, 0.08, 1.2, 0.08, { color: PALETTE.impDark, texel: 2 }); // roll bar
  box("paintedMetal", 0, 2.0, 0.4, 1.28, 0.08, 0.08, { color: PALETTE.impDark, texel: 2 });
  add("emitAmber", new THREE.CylinderGeometry(0.08, 0.08, 0.14, 10), 0, 2.11, 0.4);
  for (const sx of [-0.75, 0.75]) for (const sz of [-0.95, 0.95]) add("rubber", new THREE.CylinderGeometry(0.28, 0.28, 0.24, 12).rotateZ(Math.PI / 2), sx, 0.28, sz, { color: PALETTE.impBlack });
  box("metal", 0, 0.3, 1.6, 0.1, 0.1, 0.7, { color: PALETTE.steel }); // drawbar
  box("metal", 0, 0.3, 1.98, 0.3, 0.16, 0.1, { color: PALETTE.gunmetal });
  box("emitRed", -0.5, 0.75, 1.31, 0.14, 0.06, 0.01);
  box("emitWhiteDim", 0.5, 0.75, -1.31, 0.14, 0.06, 0.01);
  const c = Math.abs(Math.cos(yaw));
  const s = Math.abs(Math.sin(yaw));
  const ex = (1.6 * c + 4.2 * s) / 2;
  const ez = (1.6 * s + 4.2 * c) / 2;
  kit.collider([x - ex, 0, z - ez], [x + ex, 2.2, z + ez], "tug");
  void ctx;
}

// ---------------------------------------------------------------------------
// Floodlight masts at the pad corners (emissive heads; the room's real lights are the key, the apron
// flood and the door glow)
// ---------------------------------------------------------------------------
const MASTS = [
  [PAD.x - PAD.hw - 4, PAD.z - PAD.hd - 3],
  [PAD.x + PAD.hw + 4, PAD.z - PAD.hd - 3],
  [PAD.x - PAD.hw - 4, PAD.z + PAD.hd + 3],
  [PAD.x + PAD.hw + 4, PAD.z + PAD.hd + 3],
];
function floodMasts(kit, ctx) {
  for (const [x, z] of MASTS) {
    kit.box("paintedMetal", x, 0.3, z, 1.2, 0.6, 1.2, { color: PALETTE.impBlack, texel: 2 });
    kit.box("hazard", x, 0.3, z, 1.22, 0.2, 1.22, { texel: 1 });
    kit.box("paintedMetal", x, 5.0, z, 0.4, 9.0, 0.4, { color: PALETTE.impMid, texel: 1.5 });
    const dx = Math.sign(PAD.x - x);
    const dz = Math.sign(PAD.z - z);
    kit.box("paintedMetal", x + dx * 0.5, 9.2, z + dz * 0.5, 1.6, 0.8, 1.6, { color: PALETTE.impDark, texel: 2 });
    kit.box("emitWhiteDim", x + dx * 0.5, 8.78, z + dz * 0.5, 1.3, 0.04, 1.3);
    kit.box("emitRed", x, 9.75, z, 0.2, 0.15, 0.2);
    kit.collider([x - 0.6, 0, z - 0.6], [x + 0.6, 9.6, z + 0.6], "mast");
  }
  void ctx;
}

// ---------------------------------------------------------------------------
// Lighting: three real lights — a cool key hung over the shuttle's nose quarter, a warm flood over
// the apron by the portal, the red glow of the space door — plus their fixtures
// ---------------------------------------------------------------------------
function lighting(kit, ctx, min, max) {
  const H = max[1];
  ctx.light(pointLight(0xcfe0ff, 260, 50, KEY));
  ctx.light(pointLight(0xffb060, 70, 34, [-44, 10.5, -105]));
  ctx.light(pointLight(0xff3020, 40, 34, [min[0] + 5, 7.5, DOOR_Z]));
  // key: four-lamp head on a stem from the ceiling
  kit.cyl("paintedMetal", KEY[0], (H + KEY[1] + 1.1) / 2, KEY[2], 0.14, H - KEY[1] - 1.1, "y", { color: PALETTE.impDark, segments: 8, texel: 0.5 });
  kit.box("paintedMetal", KEY[0], KEY[1] + 0.7, KEY[2], 2.4, 0.8, 2.4, { color: PALETTE.impDark, texel: 1.5 });
  for (const dx of [-0.6, 0.6]) for (const dz of [-0.6, 0.6]) kit.box("emitWhite", KEY[0] + dx, KEY[1] + 0.29, KEY[2] + dz, 1.0, 0.04, 1.0);
  kit.box("emitRed", KEY[0], KEY[1] + 1.2, KEY[2], 0.24, 0.2, 0.24);
  // warm apron pendant: amber lens under a shallow housing
  kit.cyl("paintedMetal", -44, (H + 11.2) / 2, -105, 0.1, H - 11.2, "y", { color: PALETTE.impDark, segments: 8, texel: 0.5 });
  kit.box("paintedMetal", -44, 11.0, -105, 1.8, 0.5, 1.8, { color: PALETTE.impBlack, texel: 2 });
  kit.box("emitAmber", -44, 10.74, -105, 1.5, 0.03, 1.5);
  void kit;
}
