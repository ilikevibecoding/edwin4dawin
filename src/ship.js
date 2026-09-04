// Legacy Kestrel rooms (corridor, cockpit, quarters, galley, refresher). These became the
// auxiliary-flight-control wing of the Star Destroyer's command deck; the shared builders they
// use live in interior/lib.js so the new decks are built from the same kit.
import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { Kit, panelWithHoles, rng, insideOut, fitUVs } from "./kit.js";
import { PALETTE } from "./materials.js";
import { decalRect, GRATE_TILE } from "./textures.js";
import {
  UP, X_AXIS, Z_AXIS, WALL_T, DOOR_H, Frame, wallFrame, ceilingFrame, panelGrid, porthole,
  LIGHT_SCALE, pointLight, chamferBoxes, windowSpot, jitterPanelUVs, colorGeo,
} from "./interior/lib.js";

// Corridor dimensions (local wing space: corridor runs from z=0 aft to z=-16 forward).
const COR = { hw: 1.4, h: 2.8, zAft: 0, zFwd: -16, chamfer: 0.7, wallT: WALL_T * 2 };


// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------
function buildCorridor(kit, ctx) {
  const { hw, h, zAft, zFwd, chamfer } = COR;
  const len = zAft - zFwd;
  const zMid = (zAft + zFwd) / 2;

  // --- floor: side plates + grated trench (plates run under the shared walls up to the room decks)
  const plateOut = hw + COR.wallT;
  kit.boxMM("deck", [0.62, -0.12, zFwd - 0.4], [plateOut, 0, zAft + 0.4], { color: PALETTE.cream, texel: 0.5 });
  kit.boxMM("deck", [-plateOut, -0.12, zFwd - 0.4], [-0.62, 0, zAft + 0.4], { color: PALETTE.cream, texel: 0.5 });
  // trench
  kit.boxMM("metal", [-0.62, -0.46, zFwd - 0.4], [0.62, -0.36, zAft + 0.4], { color: PALETTE.darkMetal, texel: 1 });
  kit.boxMM("metal", [-0.66, -0.4, zFwd - 0.4], [-0.6, 0, zAft + 0.4], { color: PALETTE.gunmetal, texel: 1 });
  kit.boxMM("metal", [0.6, -0.4, zFwd - 0.4], [0.66, 0, zAft + 0.4], { color: PALETTE.gunmetal, texel: 1 });
  // teal light channels in the trench
  kit.boxMM("emitTeal", [-0.5, -0.36, zFwd], [-0.44, -0.33, zAft]);
  kit.boxMM("emitTeal", [0.44, -0.36, zFwd], [0.5, -0.33, zAft]);
  // trench pipes and cable trays
  kit.cyl("metal", -0.22, -0.24, zMid, 0.05, len + 0.8, "z", { color: PALETTE.steel, segments: 10 });
  kit.cyl("metal", 0.18, -0.26, zMid, 0.035, len + 0.8, "z", { color: PALETTE.orange, segments: 8 });
  kit.cyl("metal", 0.3, -0.22, zMid, 0.03, len + 0.8, "z", { color: PALETTE.gunmetal, segments: 8 });
  for (let z = zAft - 0.6; z > zFwd; z -= 1.2) {
    kit.box("metal", -0.22, -0.24, z, 0.15, 0.15, 0.08, { color: PALETTE.darkMetal });
    kit.box("metal", 0.24, -0.25, z + 0.4, 0.22, 0.12, 0.08, { color: PALETTE.darkMetal });
  }
  // grate: one cut-out textured quad (tile = 1.24 m across x, 0.9 m along z)
  {
    const gl = len + 0.8;
    const g = new THREE.PlaneGeometry(1.24, gl);
    g.rotateX(-Math.PI / 2);
    kit.add("grate", g, { pos: [0, -0.004, zMid], uv: "scale", uvScale: [1.24 / GRATE_TILE[0], gl / GRATE_TILE[1]], color: 0xffffff });
    // rails as real geometry, proud of the quad: relief up close, and running along the view axis they
    // never alias the way the crossbars did
    for (const x of [-0.61, -0.305, 0, 0.305, 0.61]) kit.box("metal", x, -0.02, zMid, 0.035, 0.05, gl, { color: PALETTE.gunmetal, texel: 2 });
  }
  // rubber trim between grate and plates
  kit.boxMM("rubber", [0.62, 0, zFwd - 0.4], [0.7, 0.02, zAft + 0.4], { color: PALETTE.rubber, texel: 2 });
  kit.boxMM("rubber", [-0.7, 0, zFwd - 0.4], [-0.62, 0.02, zAft + 0.4], { color: PALETTE.rubber, texel: 2 });

  // --- side walls (left faces +X, right faces -X)
  const leftOpen = [
    { type: "door", u0: 6.65, u1: 7.95, v0: 0, v1: DOOR_H }, // quarters z -6.65..-7.95
    { type: "porthole", u0: 12.1, u1: 13.1, v0: 1.2, v1: 2.1, r: 0.3 }, // z ~ -12.6
    { type: "porthole", u0: 2.0, u1: 3.0, v0: 1.2, v1: 2.1, r: 0.3 }, // z ~ -2.5
  ];
  const rightOpen = [
    { type: "door", u0: len - 4.75, u1: len - 3.45, v0: 0, v1: DOOR_H }, // bathroom z -3.45..-4.75
    { type: "door", u0: len - 11.25, u1: len - 9.95, v0: 0, v1: DOOR_H }, // galley z -9.95..-11.25
    { type: "porthole", u0: len - 7.7, u1: len - 6.7, v0: 1.2, v1: 2.1, r: 0.3 }, // z ~ -7.2
  ];
  const wallH = 2.1;
  {
    const { frame, length } = wallFrame(kit, [-hw, zAft], [-hw, zFwd]);
    panelGrid(frame, length, wallH, { openings: leftOpen, rows: [0, 0.45, 1.5, wallH], seed: 101, topPipes: false, tag: "corL" });
  }
  {
    const { frame, length } = wallFrame(kit, [hw, zFwd], [hw, zAft]);
    panelGrid(frame, length, wallH, { openings: rightOpen, rows: [0, 0.45, 1.5, wallH], seed: 202, topPipes: false, tag: "corR" });
  }

  // --- chamfers (45deg) with conduit runs
  const chLen = Math.hypot(chamfer, h - wallH);
  {
    // left chamfer: from wall top (x=-hw,y=wallH) up to ceiling (x=-hw+chamfer, y=h)
    const o = new THREE.Vector3(-hw, wallH, zAft);
    const U = new THREE.Vector3(0, 0, -1);
    const V = new THREE.Vector3(chamfer, h - wallH, 0);
    const f = new Frame(kit, o, U, V);
    panelGrid(f, len, chLen, { rows: [0, chLen], kick: false, topPipes: false, seed: 303, collide: false, styles: { panel: 1 }, paints: [[PALETTE.cream, 0.8], [PALETTE.creamDark, 0.2]] });
    f.cylU("metal", len / 2, chLen * 0.35, 0.09, 0.07, len + 0.8, { color: PALETTE.steel, segments: 14 });
    f.cylU("metal", len / 2, chLen * 0.7, 0.07, 0.045, len + 0.8, { color: PALETTE.gunmetal, segments: 10 });
    f.cylU("rubber", len / 2, chLen * 0.53, 0.03, 0.02, len + 0.8, { color: PALETTE.rubber, segments: 8 });
    for (let u = 1.5; u < len; u += 3) {
      f.box("metal", u, chLen * 0.35, 0.09, 0.12, 0.22, 0.2, { color: PALETTE.darkMetal });
      f.box("painted", u + 0.7, chLen * 0.7, 0.07, 0.4, 0.12, 0.12, { color: PALETTE.orange, uv: "keep" });
      f.box("metal", u + 1.5, chLen * 0.53, 0.03, 0.06, 0.07, 0.07, { color: PALETTE.gunmetal });
    }
    chamferBoxes(f, len, chLen, 2.5);
  }
  {
    const o = new THREE.Vector3(hw, wallH, zFwd);
    const U = new THREE.Vector3(0, 0, 1);
    const V = new THREE.Vector3(-chamfer, h - wallH, 0);
    const f = new Frame(kit, o, U, V);
    panelGrid(f, len, chLen, { rows: [0, chLen], kick: false, topPipes: false, seed: 404, collide: false, styles: { panel: 1 }, paints: [[PALETTE.cream, 0.8], [PALETTE.creamDark, 0.2]] });
    f.cylU("metal", len / 2, chLen * 0.35, 0.09, 0.07, len + 0.8, { color: PALETTE.steel, segments: 14 });
    f.cylU("metal", len / 2, chLen * 0.7, 0.07, 0.045, len + 0.8, { color: PALETTE.orange, segments: 10 });
    f.cylU("rubber", len / 2, chLen * 0.53, 0.03, 0.02, len + 0.8, { color: PALETTE.rubber, segments: 8 });
    for (let u = 1.5; u < len; u += 3) {
      f.box("metal", u, chLen * 0.35, 0.09, 0.12, 0.22, 0.2, { color: PALETTE.darkMetal });
      f.box("metal", u + 1.5, chLen * 0.53, 0.03, 0.06, 0.07, 0.07, { color: PALETTE.gunmetal });
    }
    chamferBoxes(f, len, chLen, 4.0);
  }

  // --- flat ceiling: two panel strips with a central light channel
  const cw = hw - chamfer; // 0.7 half width of flat ceiling
  const chanHalf = 0.17;
  {
    const f = ceilingFrame(kit, -cw, zFwd, h);
    panelGrid(f, cw - chanHalf, len, { rowH: 1.0, panelW: 1.0, kick: false, topPipes: false, seed: 505, collide: false, styles: { panel: 0.8, greeble: 0.1, vent: 0.1 } });
  }
  {
    const f = ceilingFrame(kit, chanHalf, zFwd, h);
    panelGrid(f, cw - chanHalf, len, { rowH: 1.0, panelW: 1.0, kick: false, topPipes: false, seed: 606, collide: false, styles: { panel: 0.8, greeble: 0.1, vent: 0.1 } });
  }
  // channel recess + light strips per bay (diffuser strip is narrower than the housing so it reads as a fixture)
  kit.boxMM("metal", [-chanHalf, h - 0.02, zFwd], [chanHalf, h + 0.12, zAft], { color: PALETTE.darkMetal });
  // fixtures in the gaps between ribs: housing, end caps, louvre fins over a narrow diffuser (a fixture
  // with a shape, not a bare glowing bar)
  for (let z = zAft - 1.5; z > zFwd; z -= 3) {
    kit.box("metalRough", 0, h - 0.06, z, 0.28, 0.06, 2.3, { color: PALETTE.gunmetal });
    kit.box("emitWarmSoft", 0, h - 0.1, z, 0.1, 0.03, 2.1, { uv: "keep" });
    for (const dz of [-1.11, 1.11]) kit.box("metalRough", 0, h - 0.1, z + dz, 0.26, 0.08, 0.08, { color: PALETTE.darkMetal });
    for (let f = -0.9; f <= 0.9; f += 0.2) kit.box("metalRough", 0, h - 0.115, z + f, 0.2, 0.01, 0.02, { color: PALETTE.darkMetal });
    for (const dx of [-0.13, 0.13]) kit.box("metalRough", dx, h - 0.09, z, 0.02, 0.07, 2.3, { color: PALETTE.darkMetal });
  }
  // four warm point lights hung well below the ceiling (the panels beside the fixtures don't blow out,
  // and 0.6 m down nobody can tell which fixture a pool belongs to)
  for (const z of [-1.5, -5.5, -9.5, -13.5]) ctx.lights.warm.push(pointLight(0xffc48c, 6.5, 10, [0, h - 0.6, z]));
  // teal trench light (soft floor glow; the strips themselves carry the look through bloom)
  ctx.lights.teal.push(pointLight(0x4fd8cc, 2.6, 10, [0, -0.1, zMid]));

  // --- handrails along both walls (broken at the doorways), with brackets
  const railY = 1.02;
  const railSpans = (openings) => {
    let spans = [[0.4, len - 0.4]];
    for (const d of openings.filter((o) => o.type === "door")) {
      const next = [];
      for (const [a, b] of spans) {
        if (d.u1 + 0.25 <= a || d.u0 - 0.25 >= b) next.push([a, b]);
        else {
          if (d.u0 - 0.25 > a) next.push([a, d.u0 - 0.25]);
          if (d.u1 + 0.25 < b) next.push([d.u1 + 0.25, b]);
        }
      }
      spans = next;
    }
    return spans;
  };
  for (const side of [-1, 1]) {
    const opens = side < 0 ? leftOpen : rightOpen;
    const x = side * (hw - 0.12);
    for (const [a, b] of railSpans(opens)) {
      // u runs aft->fwd on the left wall, fwd->aft on the right
      const zA = side < 0 ? zAft - a : zFwd + a;
      const zB = side < 0 ? zAft - b : zFwd + b;
      const zc = (zA + zB) / 2;
      const L = Math.abs(zB - zA);
      kit.cyl("metal", x, railY, zc, 0.022, L, "z", { color: PALETTE.steel, segments: 10, texel: 2 });
      kit.cyl("rubber", x, railY, zc, 0.024, Math.min(0.5, L * 0.3), "z", { color: PALETTE.rubber, segments: 10 });
      const n = Math.max(2, Math.round(L / 1.5));
      for (let i = 0; i < n; i++) {
        const zb = Math.min(zA, zB) + 0.12 + ((L - 0.24) * i) / Math.max(1, n - 1);
        kit.box("metal", side * (hw - 0.06), railY, zb, 0.12, 0.05, 0.05, { color: PALETTE.gunmetal });
        kit.box("metal", side * (hw - 0.03), railY - 0.05, zb, 0.06, 0.1, 0.06, { color: PALETTE.darkMetal });
      }
    }
  }

  // --- wall props: extinguisher by the bathroom door, junction box with cable drop near the galley
  {
    const ex = hw - 0.12;
    const ez = -2.6;
    kit.box("metal", hw - 0.04, 0.7, ez, 0.08, 0.4, 0.2, { color: PALETTE.darkMetal });
    kit.cyl("painted", ex, 0.62, ez, 0.075, 0.5, "y", { color: new THREE.Color("#c8392b"), uv: "keep", segments: 14 });
    kit.cyl("metal", ex, 0.9, ez, 0.03, 0.08, "y", { color: PALETTE.steel, segments: 10 });
    kit.box("metal", ex, 0.96, ez + 0.02, 0.05, 0.03, 0.14, { color: PALETTE.gunmetal });
    kit.box("hazard", ex, 0.55, ez, 0.16, 0.06, 0.16, { texel: 3 });
    kit.collider([hw - 0.25, 0, ez - 0.14], [hw, 1.1, ez + 0.14], "extinguisher");
    const jz = -12.0;
    kit.box("metal", hw - 0.07, 1.55, jz, 0.12, 0.42, 0.36, { color: PALETTE.gunmetal });
    kit.box("painted", hw - 0.135, 1.55, jz, 0.01, 0.34, 0.28, { color: PALETTE.creamDark, uv: "keep" });
    kit.box("leds", hw - 0.142, 1.68, jz, 0.004, 0.03, 0.22, { uv: "keep" });
    kit.box("emitOrange", hw - 0.142, 1.44, jz + 0.08, 0.004, 0.03, 0.03);
    for (const [dz, r] of [[-0.1, 0.018], [0.0, 0.022], [0.1, 0.016]]) {
      kit.cyl("rubber", hw - 0.04, 0.85, jz + dz, r, 1.0, "y", { color: PALETTE.rubber, segments: 8 });
    }
    kit.box("metal", hw - 0.06, 0.33, jz, 0.1, 0.08, 0.36, { color: PALETTE.darkMetal });
  }
  // --- port wall, forward of the porthole: a vertical conduit bundle with clamps and a valve, an
  // intercom box and a gauge plate (the cells beside the porthole were bare plates at nose range)
  {
    const wx = -hw;
    const pz = -13.34;
    const pipes = [
      [0.0, 0.03, PALETTE.steel],
      [0.08, 0.02, PALETTE.orange],
      [0.15, 0.025, PALETTE.gunmetal],
    ];
    // the bundle runs between two manifold blocks above the handrail (y 1.15 .. 2.1)
    for (const [dz, r, col] of pipes) kit.cyl("metal", wx + 0.07 + r, 1.62, pz + dz, r, 0.92, "y", { color: col, segments: 10 });
    for (const y of [1.15, 2.06]) kit.box("paintedMetal", wx + 0.09, y, pz + 0.075, 0.18, 0.08, 0.34, { color: PALETTE.darkMetal, texel: 2 });
    for (const y of [1.36, 1.86]) {
      kit.box("paintedMetal", wx + 0.08, y, pz + 0.075, 0.14, 0.05, 0.3, { color: PALETTE.gunmetal, texel: 2 });
      kit.cyl("metal", wx + 0.155, y, pz - 0.09, 0.012, 0.03, "x", { color: PALETTE.steel, segments: 8 });
      kit.cyl("metal", wx + 0.155, y, pz + 0.24, 0.012, 0.03, "x", { color: PALETTE.steel, segments: 8 });
    }
    // valve wheel on the steel line + stem
    kit.cyl("metal", wx + 0.12, 1.6, pz, 0.018, 0.14, "x", { color: PALETTE.darkMetal, segments: 8 });
    kit.add("painted", new THREE.TorusGeometry(0.075, 0.012, 8, 20), { pos: [wx + 0.2, 1.6, pz], rot: [0, Math.PI / 2, 0], color: PALETTE.orange, uv: "keep" });
    for (const a of [0, Math.PI / 3, (2 * Math.PI) / 3]) {
      kit.add("metal", new THREE.BoxGeometry(0.012, 0.15, 0.012), { pos: [wx + 0.2, 1.6, pz], rot: [a, 0, 0], color: PALETTE.steel });
    }
    // gauge plate beside the valve
    kit.box("paintedMetal", wx + 0.03, 1.6, pz - 0.2, 0.06, 0.16, 0.14, { color: PALETTE.gunmetal, texel: 2 });
    kit.box("darkGloss", wx + 0.062, 1.62, pz - 0.2, 0.004, 0.08, 0.08);
    kit.box("leds", wx + 0.063, 1.54, pz - 0.2, 0.004, 0.02, 0.1, { uv: "keep" });
    // intercom: painted box with speaker slats, call button and a stencil; cable drop to the rail bracket
    const iz = pz - 0.42;
    kit.box("paintedMetal", wx + 0.04, 1.62, iz, 0.08, 0.3, 0.22, { color: PALETTE.gunmetal, texel: 2 });
    kit.box("painted", wx + 0.081, 1.62, iz, 0.01, 0.26, 0.18, { color: PALETTE.creamDark, uv: "keep" });
    for (let k = 0; k < 6; k++) kit.box("metal", wx + 0.087, 1.69 - k * 0.022, iz, 0.004, 0.008, 0.12, { color: PALETTE.darkMetal });
    kit.box("rubber", wx + 0.092, 1.52, iz + 0.05, 0.012, 0.03, 0.03, { color: PALETTE.rubber });
    kit.box("emitTeal", wx + 0.088, 1.52, iz - 0.05, 0.006, 0.014, 0.014);
    const ig = new THREE.PlaneGeometry(0.08, 0.08);
    ig.rotateY(Math.PI / 2);
    kit.add("decal", ig, { pos: [wx + 0.087, 1.85, iz], uv: "keep", uvRect: decalRect(10) });
    kit.cyl("rubber", wx + 0.03, 1.3, iz, 0.01, 0.36, "y", { color: PALETTE.rubber, segments: 8 });
    kit.collider([wx, 1.1, pz - 0.55], [wx + 0.28, 2.1, pz + 0.3], "utility");
  }

  // --- structural ribs every 3 m
  const profile = [
    [-hw - 0.01, -0.01],
    [-hw + 0.2, -0.01],
    [-hw + 0.2, wallH - 0.1],
    [-cw - 0.1, h - 0.2],
    [cw + 0.1, h - 0.2],
    [hw - 0.2, wallH - 0.1],
    [hw - 0.2, -0.01],
    [hw + 0.01, -0.01],
    [hw + 0.01, wallH + 0.01],
    [cw, h + 0.01],
    [-cw, h + 0.01],
    [-hw - 0.01, wallH + 0.01],
  ];
  const ribShape = new THREE.Shape(profile.map(([x, y]) => new THREE.Vector2(x, y)));
  const stripeProfile = [
    [-hw + 0.06, -0.01],
    [-hw + 0.14, -0.01],
    [-hw + 0.14, wallH - 0.06],
    [-cw - 0.04, h - 0.15],
    [cw + 0.04, h - 0.15],
    [hw - 0.14, wallH - 0.06],
    [hw - 0.14, -0.01],
    [hw - 0.06, -0.01],
    [hw - 0.06, wallH - 0.03],
    [cw + 0.01, h - 0.08],
    [-cw - 0.01, h - 0.08],
    [-hw + 0.06, wallH - 0.03],
  ];
  const stripeShape = new THREE.Shape(stripeProfile.map(([x, y]) => new THREE.Vector2(x, y)));
  let ribIndex = 0;
  for (let z = zAft - 3; z > zFwd; z -= 3, ribIndex++) {
    const rib = new THREE.ExtrudeGeometry(ribShape, { depth: 0.3, bevelEnabled: false });
    // painted structural steel in slate: seen end-on beside a porthole, a gunmetal rib face
    // (0.19 sRGB after the wear map) was a black slab filling a sixth of the frame
    kit.add("paintedMetal", rib, { pos: [0, 0, z - 0.15], color: PALETTE.slate, uv: "world", texel: 1 });
    const stripe = new THREE.ExtrudeGeometry(stripeShape, { depth: 0.34, bevelEnabled: false });
    kit.add("painted", stripe, { pos: [0, 0, z - 0.17], color: PALETTE.orange, uv: "world", texel: 1 });
    // bolts on the rib face
    for (const [bx, by] of [
      [-hw + 0.1, 0.5],
      [-hw + 0.1, 1.6],
      [hw - 0.1, 0.5],
      [hw - 0.1, 1.6],
    ]) {
      kit.cyl("metal", bx, by, z - 0.17, 0.03, 0.04, "z", { color: PALETTE.steel, segments: 8 });
      kit.cyl("metal", bx, by, z + 0.17, 0.03, 0.04, "z", { color: PALETTE.steel, segments: 8 });
    }
    // inner faces (the 0.3 m sides that face the corridor): a clamped conduit drop, bolt rows along
    // both edges, a stencil plate and a hazard kick block — structure, not a slab, when seen close
    for (const side of [-1, 1]) {
      const fx = side * (hw - 0.2); // face plane
      const o = (d) => fx - side * d; // offset d into the corridor
      const conduitCol = ribIndex % 2 === 0 ? PALETTE.steel : PALETTE.gunmetal;
      kit.cyl("metal", o(0.05), 1.05, z + 0.06, 0.024, 1.6, "y", { color: conduitCol, segments: 10 });
      for (const y of [0.42, 1.32, 1.72]) {
        kit.box("paintedMetal", o(0.035), y, z + 0.06, 0.07, 0.045, 0.09, { color: PALETTE.darkMetal, texel: 2 });
        kit.cyl("metal", o(0.072), y, z + 0.06, 0.01, 0.012, "x", { color: PALETTE.steel, segments: 6 });
      }
      // elbow into the wall at the top, junction cap at the bottom
      kit.box("metal", o(0.03), 1.86, z + 0.06, 0.07, 0.07, 0.07, { color: PALETTE.darkMetal });
      kit.box("paintedMetal", o(0.04), 0.22, z + 0.06, 0.08, 0.1, 0.1, { color: PALETTE.gunmetal, texel: 2 });
      for (const y of [0.3, 0.75, 1.25, 1.7]) {
        kit.cyl("metal", o(0.008), y, z - 0.11, 0.016, 0.016, "x", { color: PALETTE.steel, segments: 8 });
        kit.cyl("metal", o(0.008), y, z + 0.11, 0.016, 0.016, "x", { color: PALETTE.steel, segments: 8 });
      }
      const g = new THREE.PlaneGeometry(0.16, 0.16);
      g.rotateY(side < 0 ? Math.PI / 2 : -Math.PI / 2);
      kit.add("decal", g, { pos: [o(0.004), 1.5, z - 0.04], uv: "keep", uvRect: decalRect([5, 4, 8, 5, 4][ribIndex % 5]) });
      kit.box("hazard", o(0.01), 0.075, z, 0.02, 0.15, 0.3, { texel: 3 });
    }
    // small ceiling-mounted lamp/box at each rib
    kit.box("metal", 0, h - 0.24, z, 0.5, 0.12, 0.3, { color: PALETTE.darkMetal });
    kit.box("emitTeal", 0, h - 0.31, z, 0.34, 0.02, 0.06);
    kit.collider([-hw - 0.01, 0, z - 0.15], [-hw + 0.2, h, z + 0.15], "rib");
    kit.collider([hw - 0.2, 0, z - 0.15], [hw + 0.01, h, z + 0.15], "rib");
  }

  // --- aft bulkhead at z = 0 (faces -Z into the corridor). Sealed slab in the stand-alone freighter;
  // an open doorway (leaves come from the ship's DoorSystem) when the wing is part of the command deck.
  {
    const { frame, length } = wallFrame(kit, [hw, zAft], [-hw, zAft]);
    panelGrid(frame, length, h, { openings: [{ type: "door", u0: 0.55, u1: 2.25, v0: 0, v1: 2.35 }], rows: [0, 0.45, 2.35, h], seed: 707, topPipes: true, collide: false, tag: "aft" });
    if (!ctx.aftOpen) {
      // door slab (recessed), sealed
      frame.box("metal", hw, 1.175, -0.22, 1.7, 2.35, 0.1, { color: PALETTE.gunmetal, texel: 1 });
      frame.box("metal", hw - 0.42, 1.175, -0.16, 0.8, 2.3, 0.04, { color: PALETTE.slate, texel: 1 });
      frame.box("metal", hw + 0.42, 1.175, -0.16, 0.8, 2.3, 0.04, { color: PALETTE.slate, texel: 1 });
      frame.box("hazard", hw - 0.04, 1.175, -0.13, 0.04, 2.3, 0.03, { texel: 4 });
      frame.box("hazard", hw, 0.1, -0.13, 1.6, 0.14, 0.03, { texel: 4 });
      // handles + latch box
      frame.box("metal", hw - 0.25, 1.15, -0.08, 0.06, 0.4, 0.1, { color: PALETTE.orange });
      frame.box("metal", hw + 0.25, 1.15, -0.08, 0.06, 0.4, 0.1, { color: PALETTE.orange });
      kit.collider([-hw, 0, zAft - 0.3], [hw, h, zAft + 0.2], "aftdoor");
    } else {
      // wall colliders either side of the open doorway
      kit.collider([-hw, 0, zAft - 0.3], [-0.85, h, zAft + 0.2], "aftwall");
      kit.collider([0.85, 0, zAft - 0.3], [hw, h, zAft + 0.2], "aftwall");
    }
    frame.box("metal", hw, 2.0, -0.1, 0.5, 0.25, 0.08, { color: PALETTE.darkMetal });
    frame.box("emitRed", hw, 2.0, -0.055, 0.3, 0.06, 0.02);
    // frame
    frame.box("metal", hw - 0.9, 1.18, -0.06, 0.12, 2.5, 0.22, { color: PALETTE.darkMetal });
    frame.box("metal", hw + 0.9, 1.18, -0.06, 0.12, 2.5, 0.22, { color: PALETTE.darkMetal });
    frame.box("metal", hw, 2.4, -0.06, 1.92, 0.12, 0.22, { color: PALETTE.darkMetal });
    // door sill: closes the trench where it runs under the slab
    kit.boxMM("hazard", [-0.8, -0.005, zAft - 0.06], [0.8, 0.012, zAft + 0.42], { texel: 3 });
    kit.boxMM("metal", [-0.7, -0.5, zAft - 0.08], [0.7, -0.005, zAft - 0.02], { color: PALETTE.darkMetal, texel: 1 });
  }

  // --- forward bulkhead at z = zFwd (faces +Z), with cockpit doorway
  {
    const { frame, length } = wallFrame(kit, [-hw, zFwd], [hw, zFwd]);
    panelGrid(frame, length, h, { openings: [{ type: "door", u0: hw - 0.8, u1: hw + 0.8, v0: 0, v1: 2.3 }], rows: [0, 0.45, 2.3, h], seed: 808, topPipes: true, tag: "fwd" });
    // door jambs / tunnel through the bulkhead
    kit.boxMM("metal", [-1.0, 0, zFwd - 0.42], [-0.8, 2.3, zFwd + 0.04], { color: PALETTE.darkMetal, texel: 1 });
    kit.boxMM("metal", [0.8, 0, zFwd - 0.42], [1.0, 2.3, zFwd + 0.04], { color: PALETTE.darkMetal, texel: 1 });
    kit.boxMM("metal", [-1.0, 2.3, zFwd - 0.42], [1.0, 2.5, zFwd + 0.04], { color: PALETTE.darkMetal, texel: 1 });
    kit.boxMM("painted", [-0.86, 2.3, zFwd - 0.3], [0.86, 2.36, zFwd - 0.1], { color: PALETTE.orange, uv: "keep" });
    kit.boxMM("hazard", [-0.8, -0.005, zFwd - 0.42], [0.8, 0.01, zFwd + 0.04], { texel: 3 });
    kit.collider([-1.0, 0, zFwd - 0.42], [-0.8, 2.3, zFwd + 0.04], "jamb");
    kit.collider([0.8, 0, zFwd - 0.42], [1.0, 2.3, zFwd + 0.04], "jamb");
  }

  // doorway frames for side rooms (centred in the shared wall, proud on both faces)
  for (const d of [
    { x: -(hw + COR.wallT / 2), z0: -7.95, z1: -6.65 },
    { x: hw + COR.wallT / 2, z0: -4.75, z1: -3.45 },
    { x: hw + COR.wallT / 2, z0: -11.25, z1: -9.95 },
  ]) {
    const s = Math.sign(d.x);
    const x0 = d.x - 0.22;
    const x1 = d.x + 0.22;
    kit.boxMM("metal", [x0, 0, d.z0 - 0.12], [x1, DOOR_H + 0.22, d.z0], { color: PALETTE.darkMetal, texel: 1 });
    kit.boxMM("metal", [x0, 0, d.z1], [x1, DOOR_H + 0.22, d.z1 + 0.12], { color: PALETTE.darkMetal, texel: 1 });
    kit.boxMM("metal", [x0, DOOR_H, d.z0 - 0.12], [x1, DOOR_H + 0.22, d.z1 + 0.12], { color: PALETTE.darkMetal, texel: 1 });
    kit.boxMM("painted", [x0 + 0.05, DOOR_H + 0.02, d.z0 - 0.02], [x1 - 0.05, DOOR_H + 0.08, d.z1 + 0.02], { color: PALETTE.orange, uv: "keep" });
    kit.boxMM("hazard", [x0, -0.005, d.z0], [x1, 0.012, d.z1], { texel: 3 });
    kit.collider([x0, 0, d.z0 - 0.12], [x1, DOOR_H + 0.22, d.z0], "jamb");
    kit.collider([x0, 0, d.z1], [x1, DOOR_H + 0.22, d.z1 + 0.12], "jamb");
    // small status light on the lintel, corridor side
    const zc = (d.z0 + d.z1) / 2;
    kit.box("metal", s * (hw - 0.08), DOOR_H + 0.11, zc, 0.08, 0.1, 0.3, { color: PALETTE.darkMetal });
    kit.box("emitTeal", s * (hw - 0.125), DOOR_H + 0.11, zc, 0.02, 0.05, 0.22);
  }

  // cool space light through the two port portholes: spots parked outside the hull, aimed down across
  // the corridor. From outside they cannot hit the ring's face (no hot specular), and without shadows
  // the cone simply reads as a shaft of planet-light on the far wall and floor.
  // 3 m out with a narrow cone: the beam passes the sleeve at grazing incidence (no hot crescent) and
  // lands as a soft disc low on the starboard wall, the way a distant planet would light a window.
  for (const z of [-12.6, -2.5]) {
    ctx.lights.cool.push(windowSpot(0x9fc6ff, 26, [-hw - 3.0, 2.6, z], [hw, 0.75, z], 0.12));
  }
}

function buildCockpit(kit, ctx) {
  const zBack = COR.zFwd - COR.wallT; // -16.32
  const zFront = -21.2;
  const hwC = 2.4;
  const h = 2.8;
  const wsBottomY = 0.95;
  const wsTopY = 2.75;
  const wsTopZ = -22.0;

  // floor + ceiling
  kit.boxMM("deck", [-hwC - 0.2, -0.12, wsTopZ - 0.2], [hwC + 0.2, 0, zBack], { color: PALETTE.cream, texel: 0.5 });
  // cockpit floor rubber mat between seats
  kit.boxMM("rubber", [-1.3, 0, -20.2], [1.3, 0.02, -17.2], { color: PALETTE.rubber, texel: 2 });
  {
    const f = ceilingFrame(kit, -hwC, wsTopZ, h);
    panelGrid(f, hwC * 2, zBack - wsTopZ, { rows: [0, 1.2, 2.5, 3.8, zBack - wsTopZ], panelW: 0.96, kick: false, topPipes: false, seed: 909, collide: false, styles: { panel: 0.45, greeble: 0.2, conduit: 0.2, vent: 0.15 } });
    // two conduit runs the length of the cockpit ceiling with clamps, plus a cable tray
    const zc = (zBack + wsTopZ) / 2 + 0.2;
    const runL = zBack - wsTopZ - 0.6;
    for (const [x, r, col] of [
      [-1.75, 0.05, PALETTE.steel],
      [-1.62, 0.03, PALETTE.orange],
      [1.7, 0.045, PALETTE.gunmetal],
    ]) {
      kit.cyl("metal", x, h - 0.1 - r, zc, r, runL, "z", { color: col, segments: 10 });
      for (let z = zc - runL / 2 + 0.4; z < zc + runL / 2; z += 1.2) kit.box("metalRough", x, h - 0.09 - r, z, r * 2 + 0.05, 0.05, 0.06, { color: PALETTE.darkMetal });
    }
    kit.boxMM("metalRough", [1.9, h - 0.16, zBack - 3.6], [2.3, h - 0.13, zBack - 0.4], { color: PALETTE.darkMetal, texel: 1 });
    for (let z = zBack - 3.4; z < zBack - 0.5; z += 0.35) kit.box("rubber", 2.1, h - 0.17, z, 0.34, 0.02, 0.06, { color: PALETTE.rubber });
  }
  // rear wall (faces -Z into cockpit) with doorway
  {
    const { frame, length } = wallFrame(kit, [hwC, zBack], [-hwC, zBack]);
    panelGrid(frame, length, h, { openings: [{ type: "door", u0: hwC - 0.8, u1: hwC + 0.8, v0: 0, v1: 2.3 }], rows: [0, 0.45, 1.5, 2.3, h], seed: 1010, tag: "ckBack" });
  }
  // side walls
  {
    const { frame, length } = wallFrame(kit, [-hwC, zBack], [-hwC, zFront]);
    panelGrid(frame, length, h, { rows: [0, 0.45, 1.5, 2.2, h], seed: 1111, styles: { panel: 0.4, greeble: 0.2, screen: 0.15, conduit: 0.1, strip: 0.15 }, tag: "ckL" });
  }
  {
    const { frame, length } = wallFrame(kit, [hwC, zFront], [hwC, zBack]);
    panelGrid(frame, length, h, { rows: [0, 0.45, 1.5, 2.2, h], seed: 1212, styles: { panel: 0.4, greeble: 0.2, screen: 0.15, conduit: 0.1, strip: 0.15 }, tag: "ckR" });
  }
  // lower front wall below the windshield (faces +Z)
  {
    const { frame, length } = wallFrame(kit, [-hwC, zFront], [hwC, zFront]);
    panelGrid(frame, length, wsBottomY, { rows: [0, 0.45, wsBottomY], seed: 1313, topPipes: false, styles: { panel: 0.6, vent: 0.2, greeble: 0.2 }, tag: "ckFront" });
  }
  // windshield: slanted frame with panes
  {
    const o = new THREE.Vector3(-hwC, wsBottomY, zFront);
    const U = new THREE.Vector3(1, 0, 0);
    const V = new THREE.Vector3(0, wsTopY - wsBottomY, wsTopZ - zFront);
    const f = new Frame(kit, o, U, V);
    const L = V.length();
    const W = hwC * 2;
    const cols = 3;
    const rows = 2;
    const strut = 0.11;
    const pw = (W - strut * (cols + 1)) / cols;
    const ph = (L - strut * (rows + 1)) / rows;
    const holes = [];
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        holes.push({ x: -W / 2 + strut + pw / 2 + c * (pw + strut), y: -L / 2 + strut + ph / 2 + r * (ph + strut), w: pw, h: ph });
      }
    }
    const frameGeo = panelWithHoles(W, L, 0.14, holes);
    f.add("metal", frameGeo, W / 2, L / 2, -0.07, { color: PALETTE.gunmetal, uv: "world", texel: 1 });
    // rubber gasket ring around each pane
    for (const hole of holes) {
      const gasket = panelWithHoles(hole.w + 0.06, hole.h + 0.06, 0.012, [{ x: 0, y: 0, w: hole.w - 0.03, h: hole.h - 0.03 }]);
      f.add("rubber", gasket, W / 2 + hole.x, L / 2 + hole.y, -0.004, { color: PALETTE.rubber, uv: "world", texel: 2 });
    }
    // glass
    const glass = new THREE.PlaneGeometry(W, L);
    f.add("glass", glass, W / 2, L / 2, -0.08, { uv: "keep" });
    // side triangular fillers between side walls and slanted windshield (in the wall thickness)
    for (const s of [-1, 1]) {
      const tri = new THREE.Shape([new THREE.Vector2(zFront, wsBottomY - 0.2), new THREE.Vector2(wsTopZ - 0.05, wsTopY + 0.1), new THREE.Vector2(zFront, wsTopY + 0.1)]);
      const g = new THREE.ExtrudeGeometry(tri, { depth: 0.16, bevelEnabled: false });
      // shape in (z,y) plane -> rotate so local x->world z; extrusion ends up along -X
      g.rotateY(-Math.PI / 2);
      kit.add("metal", g, { pos: [s > 0 ? hwC + 0.16 : -hwC, 0, 0], color: PALETTE.gunmetal, uv: "world", texel: 1 });
    }
    // header beam where windshield meets ceiling (painted: it faces the pilots and reflects nothing)
    kit.boxMM("paintedMetal", [-hwC - 0.1, wsTopY - 0.12, wsTopZ - 0.1], [hwC + 0.1, h + 0.05, wsTopZ + 0.25], { color: PALETTE.gunmetal, texel: 1 });
    kit.boxMM("painted", [-hwC + 0.1, wsTopY - 0.1, wsTopZ + 0.24], [hwC - 0.1, wsTopY + 0.02, wsTopZ + 0.27], { color: PALETTE.orange, uv: "keep" });
    // exterior nose hull visible below the windshield
    kit.boxMM("metal", [-hwC - 0.5, 0.35, -25.0], [hwC + 0.5, wsBottomY - 0.02, zFront - 0.05], { color: PALETTE.gunmetal, texel: 0.8 });
    kit.boxMM("painted", [-hwC - 0.4, wsBottomY - 0.02, -24.6], [hwC + 0.4, wsBottomY + 0.03, zFront - 0.2], { color: PALETTE.creamDark, uv: "world", texel: 0.7 });
    kit.boxMM("painted", [-0.5, wsBottomY + 0.03, -24.4], [0.5, wsBottomY + 0.06, zFront - 0.3], { color: PALETTE.orange, uv: "keep" });
    for (const nx of [-1.6, 1.6]) {
      kit.boxMM("metal", [nx - 0.25, wsBottomY + 0.03, -24.2], [nx + 0.25, wsBottomY + 0.2, -22.6], { color: PALETTE.darkMetal, texel: 1 });
      kit.box("emitRed", nx, wsBottomY + 0.24, -24.0, 0.08, 0.08, 0.08);
    }
    for (let i = 0; i < 6; i++) {
      kit.box("metal", -1.2 + i * 0.5, wsBottomY + 0.08, -23.3, 0.3, 0.1, 0.6, { color: PALETTE.steel, texel: 1 });
    }
    // cool key light through the windshield
    const spot = new THREE.SpotLight(0xa9c4ff, 60 * LIGHT_SCALE, 18, 0.8, 0.6, 1.6);
    spot.position.set(0.8, 3.0, -24.5);
    spot.target.position.set(0, 0.8, -18.5);
    spot.castShadow = true;
    spot.shadow.mapSize.set(1024, 1024);
    spot.shadow.bias = -0.0003;
    spot.shadow.normalBias = 0.03;
    spot.shadow.camera.near = 1;
    spot.shadow.camera.far = 16;
    ctx.lights.spots.push(spot);
  }

  // --- dashboard console
  {
    const cz0 = zFront; // -21.2
    const cz1 = -20.0;
    // base
    kit.boxMM("painted", [-2.2, 0, cz0 + 0.02], [2.2, 0.7, cz0 + 0.75], { color: PALETTE.cream, uv: "keep" });
    kit.boxMM("metal", [-2.2, 0, cz0 + 0.02], [2.2, 0.12, cz0 + 0.8], { color: PALETTE.darkMetal, texel: 1 });
    kit.boxMM("painted", [-2.2, 0.3, cz0 + 0.74], [2.2, 0.36, cz0 + 0.77], { color: PALETTE.orange, uv: "keep" });
    // sloped top slab (rises toward the windshield, faces the pilots)
    const slabLen = 1.3;
    const slabTilt = 0.32;
    const slab = new THREE.BoxGeometry(4.4, 0.1, slabLen);
    const q = new THREE.Quaternion().setFromAxisAngle(X_AXIS, slabTilt);
    kit.add("metal", slab, { pos: [0, 0.93, cz0 + 0.62], quat: q, color: PALETTE.gunmetal, texel: 1 });
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
    const place = (x, along, lift) => new THREE.Vector3(x, 0.93, cz0 + 0.62).addScaledVector(fwd, along).addScaledVector(up, 0.05 + lift);
    for (const [x, w, hgt, idx] of [
      [-1.5, 0.9, 0.5, 0],
      [-0.55, 0.7, 0.42, 1],
      [0.55, 0.7, 0.42, 2],
      [1.5, 0.9, 0.5, 3],
    ]) {
      const p = place(x, 0.15, 0);
      kit.add("darkGloss", new THREE.BoxGeometry(w + 0.06, 0.03, hgt + 0.06), { pos: [p.x, p.y, p.z], quat: q });
      const p2 = place(x, 0.15, 0.02);
      const sg = new THREE.PlaneGeometry(w, hgt);
      sg.rotateX(-Math.PI / 2);
      kit.add(`screen${idx}`, sg, { pos: [p2.x, p2.y, p2.z], quat: q, uv: "keep" });
    }
    // button rows
    const rand = rng(77);
    for (let i = 0; i < 26; i++) {
      const x = -2.0 + (i / 25) * 4.0;
      const p = place(x, -0.42, 0.02);
      const emit = rand() < 0.35;
      kit.add(emit ? (rand() < 0.5 ? "emitTeal" : "emitOrange") : "rubber", new THREE.BoxGeometry(0.08, 0.04, 0.08), { pos: [p.x, p.y, p.z], quat: q, color: PALETTE.rubber });
    }
    for (let i = 0; i < 10; i++) {
      const x = -1.9 + (i / 9) * 3.8;
      const p = place(x, -0.25, 0.04);
      kit.add("metal", new THREE.CylinderGeometry(0.03, 0.035, 0.08, 10), { pos: [p.x, p.y, p.z], quat: q, color: PALETTE.steel, uv: "scale", uvScale: [0.2, 0.1] });
    }
    // levers (throttle) on the center pedestal: metal frame with proud painted side/back panels
    kit.boxMM("metal", [-0.35, 0, -19.6], [0.35, 0.78, -18.7], { color: PALETTE.gunmetal, texel: 1 });
    kit.boxMM("painted", [-0.36, 0.14, -19.5], [0.36, 0.66, -18.8], { color: PALETTE.cream, uv: "keep" });
    kit.boxMM("painted", [-0.3, 0.14, -19.62], [0.3, 0.66, -18.68], { color: PALETTE.cream, uv: "keep" });
    kit.boxMM("painted", [-0.37, 0.36, -19.48], [0.37, 0.42, -18.82], { color: PALETTE.orange, uv: "keep" });
    kit.boxMM("hazard", [-0.34, 0.02, -19.58], [0.34, 0.1, -18.72], { texel: 4 });
    kit.box("darkGloss", 0, 0.5, -18.675, 0.3, 0.08, 0.01);
    kit.box("leds", 0, 0.5, -18.672, 0.26, 0.04, 0.004, { uv: "keep" });
    kit.boxMM("darkGloss", [-0.28, 0.78, -19.55], [0.28, 0.8, -19.1]);
    kit.boxMM("screen1", [-0.25, 0.8, -19.5], [0.25, 0.805, -19.15], { uv: "keep" });
    for (const lx of [-0.15, 0.15]) {
      kit.cyl("metal", lx, 0.92, -18.95, 0.018, 0.3, "y", { color: PALETTE.steel, segments: 8 });
      kit.add("rubber", new THREE.SphereGeometry(0.04, 12, 8), { pos: [lx, 1.08, -18.95], color: PALETTE.rubber });
    }
    kit.collider([-2.2, 0, cz0 - 0.2], [2.2, 1.2, cz1 + 0.15], "console");
    kit.collider([-0.35, 0, -19.6], [0.35, 1.0, -18.7], "pedestal");
    // console glow lights
    ctx.lights.warm.push(pointLight(0xff9d55, 2.4, 4, [-1.2, 1.3, -20.4]));
    ctx.lights.teal.push(pointLight(0x4fd8cc, 2.0, 4, [1.2, 1.3, -20.4]));
    // teal kick strip along the console base + pedestal foot: lifts the floor out of black
    kit.boxMM("emitTeal", [-2.1, 0.13, cz0 + 0.8], [2.1, 0.16, cz0 + 0.812]);
    kit.boxMM("metalRough", [-2.15, 0.11, cz0 + 0.75], [2.15, 0.18, cz0 + 0.8], { color: PALETTE.darkMetal });
    for (const s of [-1, 1]) kit.boxMM("emitTeal", [s > 0 ? hwC - 0.56 : -hwC + 0.55, 0.12, -20.5], [s > 0 ? hwC - 0.548 : -hwC + 0.562, 0.15, -18.5]);
    ctx.lights.teal.push(pointLight(0x4fd8cc, 2.2, 4.5, [0, 0.3, -19.7]));
  }

  // --- pilot seats
  for (const sx of [-0.85, 0.85]) {
    const sz = -19.0;
    // pedestal + swivel base
    kit.cyl("metal", sx, 0.2, sz, 0.09, 0.4, "y", { color: PALETTE.gunmetal });
    kit.cyl("metal", sx, 0.03, sz, 0.32, 0.06, "y", { color: PALETTE.darkMetal, segments: 20 });
    kit.box("metal", sx, 0.41, sz, 0.5, 0.05, 0.5, { color: PALETTE.gunmetal });
    // seat pan: rubber shell, fabric insert, side bolsters
    kit.box("rubber", sx, 0.5, sz, 0.6, 0.12, 0.58, { color: PALETTE.rubber });
    kit.box("fabric", sx, 0.575, sz + 0.02, 0.4, 0.05, 0.48, { color: PALETTE.fabricOrange, uv: "world", texel: 2 });
    for (const bx of [-0.245, 0.245]) kit.box("rubber", sx + bx, 0.6, sz + 0.02, 0.1, 0.1, 0.5, { color: PALETTE.rubber });
    // backrest (leans aft): shell, pad, bolsters, frame spine
    const bq = new THREE.Quaternion().setFromAxisAngle(X_AXIS, 0.2);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(bq);
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(bq);
    const at = (dy, dz) => new THREE.Vector3(sx, 0.56, sz + 0.3).addScaledVector(up, dy).addScaledVector(fwd, dz);
    const addBox = (mat, w, hgt, d, dy, dz, extra = {}) => {
      const p = at(dy, dz);
      kit.add(mat, new THREE.BoxGeometry(w, hgt, d), { pos: [p.x, p.y, p.z], quat: bq, ...extra });
    };
    // shell: wide lower section, tapered upper section
    addBox("rubber", 0.6, 0.5, 0.12, 0.25, 0, { color: PALETTE.rubber });
    addBox("rubber", 0.48, 0.44, 0.12, 0.7, 0, { color: PALETTE.rubber });
    // front pad
    addBox("fabric", 0.4, 0.72, 0.05, 0.42, 0.075, { color: PALETTE.fabricOrange, uv: "world", texel: 2 });
    for (const bx of [-0.25, 0.25]) {
      const p = at(0.32, 0.06);
      kit.add("rubber", new THREE.BoxGeometry(0.1, 0.6, 0.1), { pos: [p.x + bx, p.y, p.z], quat: bq, color: PALETTE.rubber });
    }
    // rear: quilted fabric back panel, steel spine, painted trim band, id plate, status LED
    addBox("fabric", 0.4, 0.62, 0.02, 0.42, -0.07, { color: PALETTE.fabricOrange, uv: "world", texel: 2 });
    addBox("metal", 0.1, 0.98, 0.05, 0.47, -0.085, { color: PALETTE.steel });
    addBox("metal", 0.5, 0.04, 0.08, 0.05, -0.08, { color: PALETTE.gunmetal });
    addBox("metal", 0.44, 0.04, 0.08, 0.86, -0.08, { color: PALETTE.gunmetal });
    addBox("painted", 0.52, 0.1, 0.02, 0.14, -0.075, { color: PALETTE.orange, uv: "keep" });
    addBox("darkGloss", 0.16, 0.06, 0.01, 0.66, -0.075);
    addBox("emitTeal", 0.03, 0.03, 0.01, 0.66, -0.08);
    // shoulder harness straps draped over the top of the backrest
    for (const bx of [-0.12, 0.12]) {
      const p1 = at(0.72, 0.09);
      kit.add("fabric", new THREE.BoxGeometry(0.07, 0.42, 0.02), { pos: [p1.x + bx, p1.y, p1.z], quat: bq, color: PALETTE.fabricTeal, uv: "world", texel: 3 });
      const p2 = at(0.93, 0.0);
      kit.add("fabric", new THREE.BoxGeometry(0.07, 0.02, 0.2), { pos: [p2.x + bx, p2.y, p2.z], quat: bq, color: PALETTE.fabricTeal, uv: "world", texel: 3 });
      const p3 = at(0.8, -0.075);
      kit.add("fabric", new THREE.BoxGeometry(0.07, 0.26, 0.02), { pos: [p3.x + bx, p3.y, p3.z], quat: bq, color: PALETTE.fabricTeal, uv: "world", texel: 3 });
      const p4 = at(0.5, 0.1);
      kit.add("metal", new THREE.BoxGeometry(0.08, 0.06, 0.03), { pos: [p4.x + bx, p4.y, p4.z], quat: bq, color: PALETTE.steel });
    }
    // headrest
    addBox("rubber", 0.32, 0.18, 0.12, 1.02, 0.0, { color: PALETTE.rubber });
    addBox("fabric", 0.26, 0.12, 0.03, 1.02, 0.07, { color: PALETTE.fabricOrange, uv: "world", texel: 2 });
    addBox("metal", 0.04, 0.12, 0.04, 0.9, 0.0, { color: PALETTE.steel });
    // armrests
    for (const ax of [-0.37, 0.37]) {
      kit.box("metal", sx + ax, 0.68, sz + 0.12, 0.05, 0.22, 0.08, { color: PALETTE.gunmetal });
      kit.box("metal", sx + ax, 0.79, sz + 0.02, 0.06, 0.04, 0.46, { color: PALETTE.gunmetal });
      kit.box("rubber", sx + ax, 0.825, sz + 0.02, 0.08, 0.035, 0.42, { color: PALETTE.rubber });
    }
    // small control pod on the outer armrest
    const outer = Math.sign(sx) * 0.37;
    kit.box("darkGloss", sx + outer, 0.86, sz - 0.12, 0.09, 0.03, 0.14);
    kit.box("emitTeal", sx + outer, 0.878, sz - 0.12, 0.05, 0.01, 0.08);
    kit.collider([sx - 0.35, 0, sz - 0.32], [sx + 0.35, 1.2, sz + 0.45], "seat");
  }

  // --- overhead console
  kit.boxMM("paintedMetal", [-1.3, 2.45, -20.6], [1.3, 2.8, -19.3], { color: PALETTE.gunmetal, texel: 1 });
  kit.boxMM("painted", [-1.25, 2.44, -20.55], [1.25, 2.46, -19.35], { color: PALETTE.creamDark, uv: "keep" });
  // rear face (what the pilots see over their heads): painted access plate, vent slots, stencil, and a
  // teal edge strip — 2.6 m of bare gunmetal was a black band across the top of the cockpit view
  kit.boxMM("painted", [-1.2, 2.5, -19.32], [1.2, 2.76, -19.28], { color: PALETTE.creamDark, uv: "keep" });
  kit.boxMM("painted", [-1.2, 2.5, -19.32], [-0.4, 2.76, -19.275], { color: PALETTE.cream, uv: "keep" });
  for (let k = 0; k < 4; k++) kit.boxMM("metal", [0.55, 2.55 + k * 0.05, -19.28], [1.1, 2.565 + k * 0.05, -19.27], { color: PALETTE.darkMetal });
  for (const x of [-1.1, -0.5, 0.45, 1.1]) kit.cyl("metal", x, 2.72, -19.275, 0.012, 0.015, "z", { color: PALETTE.steel, segments: 8 });
  {
    const g = new THREE.PlaneGeometry(0.22, 0.22);
    kit.add("decal", g, { pos: [-0.05, 2.63, -19.274], uv: "keep", uvRect: decalRect(3) });
  }
  kit.boxMM("paintedMetal", [-1.3, 2.45, -19.3], [1.3, 2.49, -19.26], { color: PALETTE.darkMetal, texel: 2 });
  kit.boxMM("emitTeal", [-1.15, 2.462, -19.262], [1.15, 2.478, -19.256]);
  {
    const rand = rng(31);
    for (let i = 0; i < 18; i++) {
      const x = -1.1 + (i / 17) * 2.2;
      for (let r = 0; r < 2; r++) {
        const z = -20.35 + r * 0.35;
        const emit = rand() < 0.4;
        kit.box(emit ? (rand() < 0.6 ? "emitTeal" : "emitOrange") : "rubber", x, 2.42, z, 0.06, 0.04, 0.1, { color: PALETTE.rubber });
      }
    }
    kit.boxMM("darkGloss", [-0.55, 2.41, -19.95], [0.55, 2.44, -19.6]);
    kit.boxMM("screen3", [-0.5, 2.405, -19.92], [0.5, 2.41, -19.63], { uv: "keep" });
    kit.boxMM("leds", [-1.1, 2.4, -19.5], [1.1, 2.44, -19.45], { uv: "keep" });
  }

  // --- side consoles
  for (const s of [-1, 1]) {
    const x0 = s > 0 ? hwC - 0.55 : -hwC;
    const x1 = s > 0 ? hwC : -hwC + 0.55;
    kit.boxMM("metal", [x0, 0, -20.6], [x1, 0.85, -18.4], { color: PALETTE.gunmetal, texel: 1 });
    kit.boxMM("painted", [x0 + 0.02, 0.15, -20.58], [x1 - 0.02, 0.7, -18.42], { color: PALETTE.cream, uv: "keep" });
    kit.boxMM("metal", [x0 - 0.02, 0.85, -20.62], [x1 + 0.02, 0.9, -18.38], { color: PALETTE.steel, texel: 1 });
    kit.boxMM("darkGloss", [x0 + 0.06, 0.9, -20.3], [x1 - 0.06, 0.93, -19.5]);
    kit.boxMM(s > 0 ? "screen0" : "screen2", [x0 + 0.09, 0.93, -20.27], [x1 - 0.09, 0.935, -19.53], { uv: "keep" });
    kit.boxMM("leds", [x0 + 0.06, 0.9, -19.3], [x1 - 0.06, 0.93, -19.25], { uv: "keep" });
    kit.collider([x0, 0, -20.6], [x1, 1.0, -18.4], "sideconsole");
  }

  // ceiling light fixture at cockpit rear (fills the seat backs)
  kit.box("paintedMetal", 0, h - 0.06, -17.9, 1.4, 0.08, 0.3, { color: PALETTE.gunmetal });
  kit.box("emitWarmSoft", 0, h - 0.11, -17.9, 1.2, 0.03, 0.1, { uv: "keep" });
  // hung lower than the corridor lights: this one has to reach the mat between the seats
  ctx.lights.warm.push(pointLight(0xffc48c, 6, 7, [0, h - 0.7, -17.9]));
}

function buildQuarters(kit, ctx) {
  const x0 = -5.2,
    x1 = -(COR.hw + COR.wallT); // -1.72
  const z0 = -9.2,
    z1 = -5.4;
  const h = 2.8;
  kit.boxMM("deck", [x0 - 0.3, -0.12, z0 - 0.3], [x1, 0, z1 + 0.3], { color: PALETTE.cream, texel: 0.5 });
  kit.boxMM("rubber", [x0 + 1.1, 0, z0 + 0.3], [x1 - 0.4, 0.015, z1 - 0.3], { color: PALETTE.rubber, texel: 2 });
  {
    const f = ceilingFrame(kit, x0, z0, h);
    panelGrid(f, x1 - x0, z1 - z0, { rows: [0, 1.2, 2.6, z1 - z0], panelW: 1.1, kick: false, topPipes: false, seed: 1414, collide: false, styles: { panel: 0.75, greeble: 0.1, conduit: 0.15 } });
  }
  // east wall (shared with corridor) faces -X: from (x1,z0) to (x1,z1)
  {
    const { frame, length } = wallFrame(kit, [x1, z0], [x1, z1]);
    panelGrid(frame, length, h, { openings: [{ type: "door", u0: -7.95 - z0, u1: -6.65 - z0, v0: 0, v1: DOOR_H }], seed: 1515, tag: "qE" });
  }
  // north wall z0 faces +Z
  {
    const { frame, length } = wallFrame(kit, [x0, z0], [x1, z0]);
    panelGrid(frame, length, h, { seed: 1616, styles: { panel: 0.5, greeble: 0.15, vent: 0.15, strip: 0.1, conduit: 0.1 }, tag: "qN" });
  }
  // west wall x0 faces +X, porthole above the bed
  {
    const { frame, length } = wallFrame(kit, [x0, z1], [x0, z0]);
    panelGrid(frame, length, h, { openings: [{ type: "porthole", u0: 1.4, u1: 2.4, v0: 1.3, v1: 2.2, r: 0.3 }], seed: 1717, tag: "qW" });
  }
  // south wall z1 faces -Z
  {
    const { frame, length } = wallFrame(kit, [x1, z1], [x0, z1]);
    panelGrid(frame, length, h, { seed: 1818, styles: { panel: 0.5, screen: 0.2, greeble: 0.15, strip: 0.15 }, tag: "qS" });
  }

  // --- bunk along the west wall
  const bx0 = x0 + 0.17,
    bx1 = x0 + 1.17;
  const bz0 = -8.9,
    bz1 = -6.9;
  kit.boxMM("metal", [bx0, 0.08, bz0], [bx1, 0.5, bz1], { color: PALETTE.gunmetal, texel: 1 });
  kit.boxMM("metal", [bx0, 0, bz0 + 0.1], [bx1, 0.1, bz1 - 0.1], { color: PALETTE.darkMetal, texel: 1 });
  // drawer fronts
  kit.boxMM("painted", [bx1 - 0.02, 0.14, bz0 + 0.1], [bx1 + 0.02, 0.44, bz0 + 1.0], { color: PALETTE.orange, uv: "keep" });
  kit.boxMM("painted", [bx1 - 0.02, 0.14, bz1 - 1.0], [bx1 + 0.02, 0.44, bz1 - 0.1], { color: PALETTE.cream, uv: "keep" });
  kit.boxMM("metal", [bx1 + 0.02, 0.27, bz0 + 0.4], [bx1 + 0.05, 0.31, bz0 + 0.7], { color: PALETTE.steel });
  kit.boxMM("metal", [bx1 + 0.02, 0.27, bz1 - 0.7], [bx1 + 0.05, 0.31, bz1 - 0.4], { color: PALETTE.steel });
  // under-bunk teal strip (proud of the frame face)
  kit.boxMM("emitTeal", [bx1 - 0.03, 0.1, bz0 + 0.1], [bx1 + 0.012, 0.125, bz1 - 0.1]);
  ctx.lights.teal.push(pointLight(0x4fd8cc, 1.2, 3, [bx1 + 0.3, 0.15, (bz0 + bz1) / 2]));
  // headboard shelf + reading lamp (beside the porthole, over the pillow end)
  kit.boxMM("metal", [x0, 1.15, bz1 + 0.05], [bx1, 1.2, bz1 + 0.5], { color: PALETTE.gunmetal, texel: 1 });
  kit.boxMM("metal", [x0 + 0.05, 1.2, bz1 + 0.15], [x0 + 0.35, 1.32, bz1 + 0.35], { color: PALETTE.steel });
  kit.boxMM("painted", [x0 + 0.5, 1.2, bz1 + 0.1], [x0 + 0.72, 1.42, bz1 + 0.32], { color: PALETTE.orange, uv: "keep" });
  kit.cyl("painted", x0 + 0.85, 1.28, bz1 + 0.3, 0.05, 0.16, "y", { color: PALETTE.tealPaint, uv: "keep" });
  // wall lamp: hooded housing, recessed warm emitter behind three louvre slats
  kit.boxMM("metal", [x0 + 0.0, 1.55, bz1 + 0.12], [x0 + 0.34, 1.78, bz1 + 0.46], { color: PALETTE.darkMetal, texel: 1 });
  kit.boxMM("emitWarm", [x0 + 0.3, 1.6, bz1 + 0.17], [x0 + 0.31, 1.72, bz1 + 0.41]);
  for (const ly of [1.62, 1.66, 1.7]) kit.boxMM("metal", [x0 + 0.31, ly, bz1 + 0.16], [x0 + 0.36, ly + 0.015, bz1 + 0.42], { color: PALETTE.gunmetal });
  kit.boxMM("metal", [x0 + 0.3, 1.52, bz1 + 0.1], [x0 + 0.42, 1.55, bz1 + 0.48], { color: PALETTE.gunmetal });
  kit.boxMM("metal", [x0 + 0.3, 1.78, bz1 + 0.1], [x0 + 0.42, 1.81, bz1 + 0.48], { color: PALETTE.gunmetal });
  ctx.lights.warm.push(pointLight(0xffb070, 2.2, 4, [x0 + 0.75, 1.55, bz1 + 0.3]));
  kit.collider([x0, 0, bz0], [bx1 + 0.05, 0.75, bz1], "bunk");

  // mattress / blanket / pillow -> separate interactable mesh
  const bed = new THREE.Group();
  bed.name = "bed";
  const fabric = ctx.materials.fabric;
  const mat1 = fabric.clone();
  const mattress = new THREE.Mesh(new RoundedBoxGeometry(bx1 - bx0 - 0.04, 0.16, bz1 - bz0 - 0.04, 3, 0.05), mat1);
  colorGeo(mattress.geometry, PALETTE.fabricCream, 2);
  mattress.position.set((bx0 + bx1) / 2, 0.58, (bz0 + bz1) / 2);
  const blanket = new THREE.Mesh(new RoundedBoxGeometry(bx1 - bx0 + 0.04, 0.09, 1.35, 3, 0.04), mat1);
  colorGeo(blanket.geometry, PALETTE.fabricTeal, 2);
  blanket.position.set((bx0 + bx1) / 2, 0.68, bz0 + 0.7);
  blanket.rotation.z = -0.03;
  const pillow = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.13, 0.38, 3, 0.06), mat1);
  colorGeo(pillow.geometry, PALETTE.fabricCream, 2);
  pillow.position.set((bx0 + bx1) / 2, 0.71, bz1 - 0.3);
  pillow.rotation.y = 0.1;
  for (const m of [mattress, blanket, pillow]) {
    m.castShadow = true;
    m.receiveShadow = true;
    bed.add(m);
  }
  ctx.interactables.push({ object: bed, material: mat1, id: "bed", label: "Sleep", key: "E" });
  ctx.group.add(bed);

  // --- locker on the north wall
  kit.boxMM("painted", [-3.6, 0.05, z0 + 0.17], [-2.4, 2.1, z0 + 0.65], { color: PALETTE.cream, uv: "keep" });
  kit.boxMM("metal", [-3.62, 0, z0 + 0.15], [-2.38, 0.08, z0 + 0.67], { color: PALETTE.darkMetal });
  kit.boxMM("metal", [-3.01, 0.1, z0 + 0.64], [-2.99, 2.05, z0 + 0.66], { color: PALETTE.darkMetal });
  kit.boxMM("painted", [-3.6, 1.55, z0 + 0.64], [-2.4, 1.72, z0 + 0.665], { color: PALETTE.orange, uv: "keep" });
  for (const lx of [-3.3, -2.7]) {
    kit.box("metal", lx, 1.1, z0 + 0.68, 0.04, 0.3, 0.04, { color: PALETTE.steel });
    for (let i = 0; i < 5; i++) kit.box("metal", lx, 0.35 + i * 0.09, z0 + 0.66, 0.35, 0.02, 0.03, { color: PALETTE.gunmetal, tilt: 0.5 });
  }
  kit.collider([-3.62, 0, z0], [-2.38, 2.1, z0 + 0.7], "locker");

  // --- desk on the south wall + stool
  kit.boxMM("metal", [-4.7, 0.72, z1 - 0.62], [-3.3, 0.76, z1 - 0.1], { color: PALETTE.steel, texel: 1 });
  kit.boxMM("painted", [-4.7, 0.6, z1 - 0.6], [-3.3, 0.72, z1 - 0.12], { color: PALETTE.orange, uv: "keep" });
  kit.boxMM("metal", [-4.65, 0, z1 - 0.58], [-4.55, 0.6, z1 - 0.14], { color: PALETTE.gunmetal });
  kit.boxMM("metal", [-3.45, 0, z1 - 0.58], [-3.35, 0.6, z1 - 0.14], { color: PALETTE.gunmetal });
  kit.boxMM("darkGloss", [-4.35, 0.76, z1 - 0.5], [-3.65, 0.79, z1 - 0.2]);
  kit.boxMM("screen0", [-4.3, 0.79, z1 - 0.46], [-3.7, 0.795, z1 - 0.24], { uv: "keep" });
  kit.cyl("metal", -4.0, 0.22, z1 - 1.05, 0.05, 0.44, "y", { color: PALETTE.gunmetal });
  kit.cyl("metal", -4.0, 0.02, z1 - 1.05, 0.2, 0.04, "y", { color: PALETTE.darkMetal, segments: 16 });
  kit.cyl("rubber", -4.0, 0.47, z1 - 1.05, 0.2, 0.07, "y", { color: PALETTE.rubber, segments: 16 });
  kit.collider([-4.7, 0, z1 - 0.62], [-3.3, 0.8, z1 - 0.1], "desk");
  kit.collider([-4.2, 0, z1 - 1.25], [-3.8, 0.55, z1 - 0.85], "stool");

  // ceiling fixture + key light: a slim painted housing with a lit ring around the diffuser
  kit.box("paintedMetal", (x0 + x1) / 2, h - 0.05, (z0 + z1) / 2, 0.9, 0.08, 0.9, { color: PALETTE.gunmetal });
  kit.box("emitWarmSoft", (x0 + x1) / 2, h - 0.1, (z0 + z1) / 2, 0.7, 0.03, 0.7, { uv: "keep" });
  for (const s of [-1, 1]) {
    kit.box("emitTeal", (x0 + x1) / 2 + s * 0.47, h - 0.09, (z0 + z1) / 2, 0.012, 0.02, 0.8);
    kit.box("emitTeal", (x0 + x1) / 2, h - 0.09, (z0 + z1) / 2 + s * 0.47, 0.8, 0.02, 0.012);
  }
  // the spot only throws downward; this small uplight is what lets the ceiling panels read at all
  ctx.lights.warm.push(pointLight(0xffc48c, 2.6, 4.5, [(x0 + x1) / 2, h - 0.32, (z0 + z1) / 2]));
  const spot = new THREE.SpotLight(0xffc08a, 32 * LIGHT_SCALE, 8, 0.8, 0.6, 1.7);
  spot.position.set((x0 + x1) / 2, h - 0.15, (z0 + z1) / 2);
  spot.target.position.set((x0 + x1) / 2 - 0.45, 0, (z0 + z1) / 2 - 0.2);
  spot.castShadow = true;
  spot.shadow.mapSize.set(1024, 1024);
  spot.shadow.bias = -0.0003;
  spot.shadow.normalBias = 0.03;
  spot.shadow.camera.near = 0.3;
  spot.shadow.camera.far = 7;
  ctx.lights.spots.push(spot);
  ctx.lights.warm.push(spot);
  // planet-light through the porthole over the bunk: cool rim on the pillow end and the deck
  ctx.lights.cool.push(windowSpot(0x9fc6ff, 6, [x0 - 1.0, 3.25, -7.3], [x0 + 1.0, 0.25, -7.3], 0.17));
}

function buildGalley(kit, ctx) {
  const x0 = COR.hw + COR.wallT, // 1.72
    x1 = 4.9;
  const z0 = -12.4,
    z1 = -8.8;
  const h = 2.8;
  kit.boxMM("deck", [x0, -0.12, z0 - 0.3], [x1 + 0.3, 0, z1 + 0.3], { color: PALETTE.cream, texel: 0.5 });
  {
    const f = ceilingFrame(kit, x0, z0, h);
    panelGrid(f, x1 - x0, z1 - z0, { rows: [0, 1.0, 2.4, z1 - z0], panelW: 1.1, kick: false, topPipes: false, seed: 1919, collide: false, styles: { panel: 0.7, greeble: 0.1, conduit: 0.2 } });
  }
  // west wall (shared) faces +X: from (x0,z1) to (x0,z0)
  {
    const { frame, length } = wallFrame(kit, [x0, z1], [x0, z0]);
    panelGrid(frame, length, h, { openings: [{ type: "door", u0: z1 + 9.95, u1: z1 + 11.25, v0: 0, v1: DOOR_H }], seed: 2020, tag: "gW" });
  }
  // north wall faces +Z
  {
    const { frame, length } = wallFrame(kit, [x0, z0], [x1, z0]);
    panelGrid(frame, length, h, { seed: 2121, styles: { panel: 0.5, vent: 0.15, greeble: 0.15, strip: 0.1, screen: 0.1 }, tag: "gN" });
  }
  // east wall faces -X (counter wall)
  {
    const { frame, length } = wallFrame(kit, [x1, z0], [x1, z1]);
    panelGrid(frame, length, h, { rows: [0, 0.45, 1.55, 2.3, h], seed: 2222, styles: { panel: 0.7, vent: 0.15, greeble: 0.15 }, tag: "gE" });
  }
  // south wall faces -Z
  {
    const { frame, length } = wallFrame(kit, [x1, z1], [x0, z1]);
    panelGrid(frame, length, h, { seed: 2323, styles: { panel: 0.5, greeble: 0.2, conduit: 0.15, screen: 0.15 }, tag: "gS" });
  }

  // --- counter along the east wall
  const cx0 = x1 - 0.65,
    cx1 = x1 - 0.05;
  const cz0 = z0 + 0.25,
    cz1 = z1 - 0.25;
  kit.boxMM("metal", [cx0 + 0.05, 0, cz0], [cx1, 0.1, cz1], { color: PALETTE.darkMetal, texel: 1 });
  // toe-kick glow under the counter overhang
  kit.boxMM("emitOrange", [cx0 + 0.04, 0.03, cz0 + 0.1], [cx0 + 0.052, 0.05, cz1 - 0.1]);
  kit.boxMM("painted", [cx0, 0.1, cz0], [cx1, 0.86, cz1], { color: PALETTE.cream, uv: "keep" });
  // cabinet door lines
  for (let z = cz0 + 0.6; z < cz1 - 0.3; z += 0.6) {
    kit.boxMM("metal", [cx0 - 0.005, 0.15, z - 0.01], [cx0 + 0.005, 0.82, z + 0.01], { color: PALETTE.darkMetal });
    kit.box("metal", cx0 - 0.02, 0.75, z - 0.3, 0.03, 0.02, 0.25, { color: PALETTE.steel });
  }
  kit.boxMM("painted", [cx0 - 0.01, 0.4, cz0], [cx0 + 0.02, 0.46, cz1], { color: PALETTE.orange, uv: "keep" });
  // counter top
  kit.boxMM("metal", [cx0 - 0.04, 0.86, cz0 - 0.03], [cx1 + 0.04, 0.92, cz1 + 0.03], { color: PALETTE.steel, texel: 1 });
  // backsplash: painted teal plate (a gunmetal one read as a black band between counter and cabinets),
  // steel utensil rail with hooks, ladle / tongs / cloth hanging off it
  kit.boxMM("painted1", [x1 - 0.2, 0.92, cz0], [x1 - 0.02, 1.55, cz1], { color: PALETTE.tealPaint, uv: "world", texel: 0.9 });
  kit.boxMM("metal", [x1 - 0.21, 0.92, cz0], [x1 - 0.19, 0.98, cz1], { color: PALETTE.steel, texel: 2 });
  kit.cyl("metal", x1 - 0.26, 1.34, (cz0 + cz1) / 2 - 0.3, 0.008, 1.6, "z", { color: PALETTE.steel, segments: 8 });
  for (const z of [(cz0 + cz1) / 2 - 1.0, (cz0 + cz1) / 2 + 0.4]) kit.box("metal", x1 - 0.235, 1.34, z, 0.05, 0.02, 0.02, { color: PALETTE.gunmetal });
  for (const [dz, len, col, r] of [
    [-0.85, 0.26, PALETTE.steel, 0.012],
    [-0.62, 0.3, PALETTE.gunmetal, 0.009],
    [-0.1, 0.22, PALETTE.steel, 0.01],
  ]) {
    kit.cyl("metal", x1 - 0.255, 1.33 - len / 2, (cz0 + cz1) / 2 - 0.3 + dz, r, len, "y", { color: col, segments: 8 });
  }
  kit.add("rubber", new THREE.SphereGeometry(0.035, 10, 8), { pos: [x1 - 0.255, 1.06, (cz0 + cz1) / 2 - 1.15], color: PALETTE.rubber });
  kit.boxMM("fabric", [x1 - 0.27, 1.05, (cz0 + cz1) / 2 + 0.05], [x1 - 0.235, 1.33, (cz0 + cz1) / 2 + 0.3], { color: PALETTE.fabricOrange, uv: "world", texel: 3 });
  // upper cabinets: doors with recessed pulls, a teal band, vent slots and stencilled contents labels
  kit.boxMM("painted", [x1 - 0.42, 1.62, cz0], [x1 - 0.02, 2.3, cz1], { color: PALETTE.cream, uv: "keep" });
  {
    const gRand = rng(2323);
    const doorW = 0.8;
    let d = 0;
    for (let z = cz0; z < cz1 - 0.3; z += doorW, d++) {
      const zc = Math.min(z + doorW / 2, cz1 - 0.2);
      if (z > cz0) kit.boxMM("metal", [x1 - 0.425, 1.65, z - 0.01], [x1 - 0.415, 2.27, z + 0.01], { color: PALETTE.darkMetal });
      // recessed pull
      kit.boxMM("metalRough", [x1 - 0.43, 1.7, zc - 0.12], [x1 - 0.415, 1.76, zc + 0.12], { color: PALETTE.darkMetal });
      kit.boxMM("metal", [x1 - 0.445, 1.72, zc - 0.1], [x1 - 0.425, 1.74, zc + 0.1], { color: PALETTE.steel });
      // label on every other door, vent slots on the rest
      if (d % 2 === 0) {
        const g = new THREE.PlaneGeometry(0.22, 0.22);
        g.rotateY(-Math.PI / 2);
        kit.add("decal", g, { pos: [x1 - 0.421, 1.98, zc], uv: "keep", uvRect: decalRect([11, 9, 11][Math.floor(gRand() * 3)]) });
      } else {
        for (let k = 0; k < 5; k++) kit.boxMM("metal", [x1 - 0.425, 1.9 + k * 0.05, zc - 0.14], [x1 - 0.415, 1.915 + k * 0.05, zc + 0.14], { color: PALETTE.darkMetal });
      }
    }
  }
  kit.boxMM("painted", [x1 - 0.43, 2.1, cz0], [x1 - 0.41, 2.18, cz1], { color: PALETTE.tealPaint, uv: "keep" });
  kit.boxMM("metalRough", [x1 - 0.44, 2.3, cz0 - 0.02], [x1 - 0.02, 2.36, cz1 + 0.02], { color: PALETTE.gunmetal, texel: 1 });
  // under-cabinet diffuser strip, with a real light behind it: this is what lights the backsplash
  kit.boxMM("paintedMetal", [x1 - 0.4, 1.56, cz0 + 0.1], [x1 - 0.25, 1.62, cz1 - 0.1], { color: PALETTE.darkMetal, texel: 2 });
  kit.boxMM("emitWarmSoft", [x1 - 0.36, 1.555, cz0 + 0.15], [x1 - 0.29, 1.565, cz1 - 0.15], { uv: "keep" });
  // small and well clear of the cabinet fronts: inverse-square at 5 cm was a white blob on the doors
  ctx.lights.warm.push(pointLight(0xffc48c, 0.5, 2.5, [x1 - 0.6, 1.3, (cz0 + cz1) / 2]));
  // the room's key: a warm downlight over the counter (fixture on the ceiling, light hung below it), so
  // the counter, backsplash and cabinet fronts carry the highlights and the far wall falls off
  kit.box("paintedMetal", x1 - 0.95, h - 0.05, (cz0 + cz1) / 2, 0.4, 0.08, 2.2, { color: PALETTE.gunmetal });
  kit.box("emitWarmSoft", x1 - 0.95, h - 0.1, (cz0 + cz1) / 2, 0.16, 0.03, 2.0, { uv: "keep" });
  ctx.lights.warm.push(pointLight(0xffc48c, 3.6, 7, [x1 - 1.35, h - 0.4, (cz0 + cz1) / 2]));
  // sink
  kit.boxMM("metal", [cx0 + 0.1, 0.9, cz1 - 1.0], [cx1 - 0.08, 0.93, cz1 - 0.45], { color: PALETTE.darkMetal, texel: 1 });
  kit.cyl("metal", cx1 - 0.15, 1.05, cz1 - 0.72, 0.015, 0.3, "y", { color: PALETTE.steel, segments: 8 });
  kit.cyl("metal", cx1 - 0.25, 1.2, cz1 - 0.72, 0.015, 0.22, "x", { color: PALETTE.steel, segments: 8 });
  // hotplate
  kit.boxMM("darkGloss", [cx0 + 0.08, 0.92, cz0 + 0.3], [cx1 - 0.08, 0.94, cz0 + 0.9]);
  for (const hz of [cz0 + 0.45, cz0 + 0.75]) {
    kit.add("emitOrange", new THREE.TorusGeometry(0.09, 0.012, 8, 24), { pos: [(cx0 + cx1) / 2, 0.945, hz], rot: [Math.PI / 2, 0, 0] });
  }
  // dispenser (interactable): painted appliance body with a cast-metal face plate (a polished steel box
  // right under the counter light was one big specular blob)
  const disp = new THREE.Group();
  disp.name = "galley";
  const dm = ctx.materials.painted.clone();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.62, 0.45), dm);
  colorGeo(body.geometry, PALETTE.creamDark, 1);
  body.position.set(cx0 + 0.3, 0.92 + 0.31, cz0 + 1.55);
  disp.add(body);
  const face = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.56, 0.4), ctx.materials.metalRough);
  colorGeo(face.geometry, PALETTE.gunmetal, 1);
  face.position.set(cx0 + 0.045, 1.23, cz0 + 1.55);
  disp.add(face);
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.51, 0.05, 0.46), ctx.materials.painted);
  colorGeo(band.geometry, PALETTE.orange, 1);
  band.position.set(cx0 + 0.3, 1.48, cz0 + 1.55);
  disp.add(band);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.22, 0.32), ctx.materials.darkGloss);
  slot.position.set(cx0 + 0.028, 1.1, cz0 + 1.55);
  disp.add(slot);
  const dscreen = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.18), ctx.materials.screens[2]);
  dscreen.position.set(cx0 + 0.033, 1.38, cz0 + 1.55);
  dscreen.rotation.y = -Math.PI / 2;
  disp.add(dscreen);
  const dled = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.03, 0.26), ctx.materials.emitOrange);
  dled.position.set(cx0 + 0.032, 1.25, cz0 + 1.55);
  disp.add(dled);
  for (const m of disp.children) {
    m.castShadow = true;
    m.receiveShadow = true;
  }
  ctx.interactables.push({ object: disp, material: dm, id: "galley", label: "Eat", key: "E" });
  ctx.group.add(disp);
  kit.collider([cx0 - 0.05, 0, cz0 - 0.05], [x1, 2.3, cz1 + 0.05], "counter");

  // --- table + stools (north-west corner)
  const tx = 2.2,
    tz = z0 + 0.9;
  kit.boxMM("metal", [tx - 0.5, 0.74, tz - 0.4], [tx + 0.5, 0.78, tz + 0.4], { color: PALETTE.steel, texel: 1 });
  kit.boxMM("painted", [tx - 0.5, 0.7, tz - 0.4], [tx + 0.5, 0.74, tz + 0.4], { color: PALETTE.orange, uv: "keep" });
  kit.cyl("metal", tx, 0.35, tz, 0.06, 0.7, "y", { color: PALETTE.gunmetal });
  kit.cyl("metal", tx, 0.03, tz, 0.35, 0.06, "y", { color: PALETTE.darkMetal, segments: 16 });
  for (const [sx, sz] of [
    [tx - 0.8, tz],
    [tx + 0.8, tz],
  ]) {
    kit.cyl("metal", sx, 0.22, sz, 0.05, 0.44, "y", { color: PALETTE.gunmetal });
    kit.cyl("metal", sx, 0.02, sz, 0.2, 0.04, "y", { color: PALETTE.darkMetal, segments: 16 });
    kit.cyl("rubber", sx, 0.47, sz, 0.2, 0.07, "y", { color: PALETTE.rubber, segments: 16 });
    kit.collider([sx - 0.2, 0, sz - 0.2], [sx + 0.2, 0.55, sz + 0.2], "stool");
  }
  kit.collider([tx - 0.5, 0, tz - 0.4], [tx + 0.5, 0.8, tz + 0.4], "table");
  // mugs on the table
  kit.cyl("painted", tx - 0.2, 0.83, tz + 0.1, 0.04, 0.1, "y", { color: PALETTE.tealPaint, uv: "keep" });
  kit.cyl("painted", tx + 0.25, 0.83, tz - 0.15, 0.04, 0.1, "y", { color: PALETTE.orange, uv: "keep" });

  // --- storage crates in the south-east corner
  const rand = rng(55);
  const crates = [
    [x1 - 0.6, 0.3, z1 - 0.7, 0.6, 0.6, 0.6],
    [x1 - 0.6, 0.85, z1 - 0.7, 0.5, 0.5, 0.5],
    [x1 - 1.3, 0.25, z1 - 0.6, 0.5, 0.5, 0.7],
  ];
  for (const [cx, cy, cz, sx, sy, sz] of crates) {
    kit.box("painted", cx, cy, cz, sx, sy, sz, { color: rand() < 0.5 ? PALETTE.creamDark : PALETTE.tealPaint, uv: "keep" });
    kit.box("metal", cx, cy, cz, sx + 0.02, sy * 0.15, sz + 0.02, { color: PALETTE.darkMetal });
    kit.box("hazard", cx, cy + sy * 0.32, cz, sx + 0.01, 0.06, sz + 0.01, { texel: 3 });
    kit.collider([cx - sx / 2, 0, cz - sz / 2], [cx + sx / 2, cy + sy / 2, cz + sz / 2], "crate");
  }
  // --- wall rack over the table on the north wall: shelf with a lip, canisters, control box, LED bar
  {
    const rz = z0 + 0.02;
    const rx = 2.45;
    kit.boxMM("metalRough", [rx - 0.45, 1.25, rz], [rx + 0.45, 1.28, rz + 0.3], { color: PALETTE.gunmetal, texel: 1 });
    kit.boxMM("metal", [rx - 0.45, 1.28, rz], [rx - 0.43, 1.31, rz + 0.3], { color: PALETTE.steel });
    kit.boxMM("metal", [rx + 0.43, 1.28, rz], [rx + 0.45, 1.31, rz + 0.3], { color: PALETTE.steel });
    kit.boxMM("metal", [rx - 0.45, 1.28, rz + 0.28], [rx + 0.45, 1.31, rz + 0.3], { color: PALETTE.steel });
    for (const [dx, col, hgt] of [
      [-0.3, PALETTE.tealPaint, 0.26],
      [-0.1, PALETTE.creamDark, 0.22],
      [0.12, PALETTE.orange, 0.26],
      [0.32, PALETTE.creamDark, 0.18],
    ]) {
      kit.cyl("painted", rx + dx, 1.28 + hgt / 2, rz + 0.15, 0.07, hgt, "y", { color: col, uv: "keep", segments: 14 });
      kit.cyl("metal", rx + dx, 1.28 + hgt + 0.015, rz + 0.15, 0.05, 0.03, "y", { color: PALETTE.steel, segments: 14 });
    }
    kit.boxMM("metalRough", [rx - 0.4, 1.7, rz], [rx + 0.4, 1.74, rz + 0.06], { color: PALETTE.darkMetal });
    kit.boxMM("metalRough", [rx - 0.4, 0.95, rz], [rx + 0.4, 1.25, rz + 0.06], { color: PALETTE.gunmetal });
    kit.box("leds", rx, 1.1, rz + 0.062, 0.5, 0.03, 0.004, { uv: "keep" });
    kit.collider([rx - 0.5, 0.9, rz], [rx + 0.5, 1.8, rz + 0.35], "rack");
  }
  // --- north wall, between the rack and the counter: medkit cabinet, status panel, towel rail with a
  // cloth, and a valved supply line above (the panels here were bare from the galley doorway)
  {
    const wz = z0 + 0.02;
    // medkit cabinet: dark frame, cream door, orange cross, steel latch, spec-plate below
    const mx = 3.5;
    kit.boxMM("paintedMetal", [mx - 0.27, 1.22, wz], [mx + 0.27, 1.9, wz + 0.16], { color: PALETTE.darkMetal, texel: 2 });
    kit.boxMM("painted", [mx - 0.24, 1.25, wz + 0.16], [mx + 0.24, 1.87, wz + 0.175], { color: PALETTE.cream, uv: "keep" });
    kit.boxMM("painted", [mx - 0.15, 1.53, wz + 0.175], [mx + 0.15, 1.6, wz + 0.182], { color: PALETTE.orange, uv: "keep" });
    kit.boxMM("painted", [mx - 0.035, 1.415, wz + 0.175], [mx + 0.035, 1.715, wz + 0.182], { color: PALETTE.orange, uv: "keep" });
    kit.box("metal", mx + 0.2, 1.56, wz + 0.185, 0.03, 0.12, 0.02, { color: PALETTE.steel });
    kit.box("emitTeal", mx - 0.2, 1.83, wz + 0.178, 0.02, 0.012, 0.006);
    {
      const g = new THREE.PlaneGeometry(0.18, 0.18);
      kit.add("decal", g, { pos: [mx, 1.1, wz + 0.004], uv: "keep", uvRect: decalRect(9) });
    }
    // status panel: bezel, screen, LED readout, two rubber buttons
    const px = 4.05;
    kit.boxMM("paintedMetal", [px - 0.22, 1.36, wz], [px + 0.22, 1.76, wz + 0.06], { color: PALETTE.gunmetal, texel: 2 });
    kit.boxMM("darkGloss", [px - 0.19, 1.46, wz + 0.06], [px + 0.19, 1.73, wz + 0.068]);
    kit.boxMM("screen3", [px - 0.17, 1.48, wz + 0.068], [px + 0.17, 1.71, wz + 0.072], { uv: "keep" });
    kit.boxMM("leds", [px - 0.16, 1.39, wz + 0.06], [px + 0.16, 1.43, wz + 0.066], { uv: "keep" });
    for (const dx of [-0.19, -0.13]) kit.box("rubber", px + dx, 1.41, wz + 0.07, 0.035, 0.035, 0.02, { color: PALETTE.rubber });
    // towel rail: steel tube on two brackets, a cloth folded over it
    kit.cyl("metal", 3.78, 1.0, wz + 0.09, 0.012, 0.8, "x", { color: PALETTE.steel, segments: 8 });
    for (const dx of [-0.36, 0.36]) kit.box("metal", 3.78 + dx, 1.0, wz + 0.045, 0.04, 0.04, 0.09, { color: PALETTE.gunmetal });
    kit.boxMM("fabric", [3.55, 0.62, wz + 0.075], [3.85, 1.012, wz + 0.115], { color: PALETTE.fabricTeal, uv: "world", texel: 3 });
    // supply line along the wall with clamps and a valve
    kit.cyl("metal", 3.9, 2.08, wz + 0.07, 0.03, 1.5, "x", { color: PALETTE.steel, segments: 10 });
    for (const x of [3.3, 3.9, 4.5]) kit.box("paintedMetal", x, 2.08, wz + 0.05, 0.08, 0.1, 0.1, { color: PALETTE.darkMetal, texel: 2 });
    kit.cyl("metal", 3.62, 2.16, wz + 0.07, 0.016, 0.16, "y", { color: PALETTE.darkMetal, segments: 8 });
    kit.add("painted", new THREE.TorusGeometry(0.06, 0.011, 8, 18), { pos: [3.62, 2.25, wz + 0.07], rot: [Math.PI / 2, 0, 0], color: PALETTE.orange, uv: "keep" });
    kit.collider([3.2, 0.5, z0], [4.3, 2.3, z0 + 0.2], "galleyWall");
  }
  // centre ceiling fixture (emissive only; the counter downlight is the room's key)
  kit.box("paintedMetal", (x0 + x1) / 2 - 0.4, h - 0.05, (z0 + z1) / 2, 1.6, 0.08, 0.3, { color: PALETTE.gunmetal });
  kit.box("emitWarmSoft", (x0 + x1) / 2 - 0.4, h - 0.1, (z0 + z1) / 2, 1.4, 0.03, 0.1, { uv: "keep" });
  ctx.lights.teal.push(pointLight(0x4fd8cc, 1.6, 4, [x0 + 0.6, 1.6, z1 - 0.4]));
}

function buildBathroom(kit, ctx) {
  const x0 = COR.hw + COR.wallT, // 1.72
    x1 = 3.7;
  const z0 = -5.2,
    z1 = -3.0;
  const h = 2.8;
  kit.boxMM("deck", [x0, -0.12, z0 - 0.3], [x1 + 0.3, 0, z1 + 0.3], { color: PALETTE.slate, texel: 0.5 });
  kit.boxMM("rubber", [x0 + 0.3, 0, z0 + 0.3], [x1 - 0.3, 0.015, z1 - 0.3], { color: PALETTE.rubber, texel: 3 });
  {
    const f = ceilingFrame(kit, x0, z0, h);
    panelGrid(f, x1 - x0, z1 - z0, { rows: [0, z1 - z0], panelW: 1.0, kick: false, topPipes: false, seed: 2424, collide: false, styles: { panel: 0.7, vent: 0.3 } });
  }
  const paints = [
    [PALETTE.cream, 0.6],
    [PALETTE.tealPaint, 0.3],
    [PALETTE.creamDark, 0.1],
  ];
  {
    const { frame, length } = wallFrame(kit, [x0, z1], [x0, z0]);
    panelGrid(frame, length, h, { openings: [{ type: "door", u0: z1 + 3.45, u1: z1 + 4.75, v0: 0, v1: DOOR_H }], seed: 2525, paints, tag: "bW" });
  }
  {
    const { frame, length } = wallFrame(kit, [x0, z0], [x1, z0]);
    panelGrid(frame, length, h, { seed: 2626, paints, styles: { panel: 0.7, vent: 0.15, conduit: 0.15 }, tag: "bN" });
  }
  {
    const { frame, length } = wallFrame(kit, [x1, z0], [x1, z1]);
    panelGrid(frame, length, h, { seed: 2727, paints, styles: { panel: 1 }, tag: "bE" });
  }
  {
    const { frame, length } = wallFrame(kit, [x1, z1], [x0, z1]);
    panelGrid(frame, length, h, { seed: 2828, paints, styles: { panel: 0.6, greeble: 0.2, conduit: 0.2 }, tag: "bS" });
  }
  // --- toilet against the north wall
  const tx = x1 - 0.55,
    tz = z0 + 0.55;
  kit.cyl("metal", tx, 0.18, tz, 0.16, 0.36, "y", { color: PALETTE.steel, segments: 16 });
  kit.cyl("metal", tx, 0.4, tz, 0.24, 0.1, "y", { color: PALETTE.steel, segments: 20 });
  kit.add("rubber", new THREE.TorusGeometry(0.2, 0.045, 8, 24), { pos: [tx, 0.46, tz], rot: [Math.PI / 2, 0, 0], color: PALETTE.rubber });
  kit.boxMM("painted", [tx - 0.25, 0.3, z0 + 0.17], [tx + 0.25, 0.95, z0 + 0.42], { color: PALETTE.cream, uv: "keep" });
  kit.boxMM("metal", [tx - 0.1, 0.8, z0 + 0.42], [tx + 0.1, 0.84, z0 + 0.5], { color: PALETTE.orange });
  kit.collider([tx - 0.3, 0, z0], [tx + 0.3, 1.0, tz + 0.3], "toilet");
  // --- sink + mirror on the east wall (interactable)
  const sx = x1 - 0.32,
    sz = z1 - 0.7;
  const basinMat = ctx.materials.metal.clone();
  const sink = new THREE.Group();
  sink.name = "bathroom";
  const basin = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.6), basinMat);
  colorGeo(basin.geometry, PALETTE.steel, 1);
  basin.position.set(sx, 0.88, sz);
  sink.add(basin);
  const bowl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.42), ctx.materials.darkGloss);
  bowl.position.set(sx - 0.02, 0.965, sz);
  sink.add(bowl);
  const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 8), basinMat);
  colorGeo(tap.geometry, PALETTE.steel, 1);
  tap.position.set(sx + 0.18, 1.06, sz);
  sink.add(tap);
  const tap2 = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.2, 8), basinMat);
  colorGeo(tap2.geometry, PALETTE.steel, 1);
  tap2.rotation.z = Math.PI / 2;
  tap2.position.set(sx + 0.09, 1.16, sz);
  sink.add(tap2);
  for (const m of sink.children) {
    m.castShadow = true;
    m.receiveShadow = true;
  }
  ctx.interactables.push({ object: sink, material: basinMat, id: "bathroom", label: "Wash up", key: "E" });
  ctx.group.add(sink);
  kit.boxMM("painted", [x1 - 0.3, 0.1, sz - 0.28], [x1 - 0.05, 0.8, sz + 0.28], { color: PALETTE.cream, uv: "keep" });
  kit.collider([x1 - 0.6, 0, sz - 0.32], [x1, 1.1, sz + 0.32], "sink");
  // mirror (real planar reflection). Nothing may sit on the room side of the reflector plane
  // (the virtual camera would see it), so the frame is a rim that stops flush with the glass.
  const mx = x1 - 0.155;
  const mirror = new Reflector(new THREE.PlaneGeometry(0.7, 0.7), { clipBias: 0.003, textureWidth: 512, textureHeight: 512, color: 0xaeb6bd });
  mirror.position.set(mx, 1.65, sz);
  mirror.rotation.y = -Math.PI / 2;
  mirror.name = "mirror";
  // the reflection is a second full scene render: only pay for it when the viewer is at the basin
  const reflect = mirror.onBeforeRender;
  const mirrorWorld = new THREE.Vector3();
  mirror.onBeforeRender = function (renderer, scene, camera, ...rest) {
    this.getWorldPosition(mirrorWorld);
    if (camera.position.distanceTo(mirrorWorld) > 4.5) return;
    reflect.call(this, renderer, scene, camera, ...rest);
  };
  ctx.group.add(mirror);
  kit.boxMM("metal", [mx, 1.25, sz - 0.4], [x1 + 0.01, 1.29, sz + 0.4], { color: PALETTE.gunmetal, texel: 1 });
  kit.boxMM("metal", [mx, 2.01, sz - 0.4], [x1 + 0.01, 2.05, sz + 0.4], { color: PALETTE.gunmetal, texel: 1 });
  kit.boxMM("metal", [mx, 1.25, sz - 0.4], [x1 + 0.01, 2.05, sz - 0.36], { color: PALETTE.gunmetal, texel: 1 });
  kit.boxMM("metal", [mx, 1.25, sz + 0.36], [x1 + 0.01, 2.05, sz + 0.4], { color: PALETTE.gunmetal, texel: 1 });
  // vanity light bar above the mirror
  kit.boxMM("paintedMetal", [x1 - 0.3, 2.06, sz - 0.42], [x1 + 0.01, 2.14, sz + 0.42], { color: PALETTE.darkMetal, texel: 2 });
  kit.boxMM("emitCoolSoft", [x1 - 0.28, 2.05, sz - 0.38], [x1 - 0.16, 2.06, sz + 0.38], { uv: "keep" });
  ctx.lights.cool.push(pointLight(0xdfe8ff, 3.4, 5.5, [x1 - 0.7, 2.0, sz]));
  // towel rail + shelf greebles
  kit.cyl("metal", x0 + 0.9, 1.3, z1 - 0.2, 0.015, 0.7, "x", { color: PALETTE.steel, segments: 8 });
  kit.boxMM("fabric", [x0 + 0.65, 0.75, z1 - 0.23], [x0 + 1.05, 1.3, z1 - 0.19], { color: PALETTE.fabricOrange, uv: "world", texel: 2 });
  kit.boxMM("metal", [x1 - 0.35, 1.05, z0 + 0.15], [x1 - 0.05, 1.08, z0 + 0.9], { color: PALETTE.steel });
  kit.cyl("painted", x1 - 0.2, 1.15, z0 + 0.35, 0.04, 0.14, "y", { color: PALETTE.tealPaint, uv: "keep" });
  kit.cyl("painted", x1 - 0.2, 1.13, z0 + 0.6, 0.035, 0.1, "y", { color: PALETTE.cream, uv: "keep" });
  // ceiling vent light (emissive only; the vanity bar is the room's light)
  kit.box("paintedMetal", (x0 + x1) / 2, h - 0.05, (z0 + z1) / 2, 0.6, 0.08, 0.6, { color: PALETTE.gunmetal });
  kit.box("emitCoolSoft", (x0 + x1) / 2, h - 0.1, (z0 + z1) / 2, 0.45, 0.03, 0.45, { uv: "keep" });
}

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------
/**
 * Build the legacy wing. `parent` receives the meshes and lights (lights are fixtures for the light
 * pool: created but not rendered directly). opts.aftOpen leaves the aft bulkhead as an open doorway.
 */
export function buildShip(parent, materials, opts = {}) {
  const group = new THREE.Group();
  group.name = "legacyWing";
  parent.add(group);
  // material aliases for individual screens
  const mats = { ...materials };
  materials.screens.forEach((m, i) => (mats["screen" + i] = m));
  mats.screens = materials.screens[0];
  const kit = new Kit(mats);
  const ctx = { group, materials, interactables: [], lights: { warm: [], cool: [], teal: [], spots: [] }, aftOpen: !!opts.aftOpen };

  buildCorridor(kit, ctx);
  buildCockpit(kit, ctx);
  buildQuarters(kit, ctx);
  buildGalley(kit, ctx);
  buildBathroom(kit, ctx);

  const meshes = kit.build(group);
  for (const arr of Object.values(ctx.lights)) {
    for (const l of arr) {
      if (l.parent) continue;
      group.add(l);
      if (l.target) group.add(l.target);
      l.visible = false; // fixture only; the LightPool renders the nearest few
    }
  }
  // store base values for the rest-cycle controller
  const allLights = [...ctx.lights.warm, ...ctx.lights.cool, ...ctx.lights.teal];
  for (const l of allLights) {
    l.userData.baseIntensity = l.intensity;
    l.userData.baseColor = l.color.clone();
  }
  // walkable: one slab under the whole wing (walls keep the player inside the rooms)
  kit.floor(-6, -22.5, 6, 0.5, 0);
  return { group, meshes, colliders: kit.colliders, floors: kit.floors, interactables: ctx.interactables, lights: ctx.lights };
}

export const SHIP_BOUNDS = COR;
