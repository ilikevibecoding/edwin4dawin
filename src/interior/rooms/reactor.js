// Deck 4 — Main Reactor Chamber (d4_reactor). A 32 m vertical shaft (y -12..20) around a 6 m glowing
// reactor column. The player enters at y = 0 onto a grated gantry that runs to an octagonal ring
// platform around the core; a side catwalk and a long service stair drop to the real chamber floor at
// y = -12. Catwalks at y = -8 and y = 8 and a cross gantry frame the core; eight coolant loops rise
// along the walls. Collision: one `region` collider makes the whole shaft floor -12, and solid
// slabs (top y = 0) under the gantry / ring / catwalk carry the player; railings on every edge.
import * as THREE from "three";
import { PALETTE } from "../../materials.js";
import { Kit, rng } from "../../kit.js";
import { GRATE_TILE } from "../../textures.js";
import { impFloor, impCeiling, impWall, stairs, platform, railing, pipeRun, pillar, wallScreen, equipmentRack, wallSegment } from "../imperial.js";
import { pointLight, wallFrame } from "../builders.js";
import { signPlate } from "../corridor.js";
import { ENG_PAINTS, ENG_PAINTS_DARK, ENG_CEIL_PAINTS, ENG_STYLES, ENG_THEME, AMBER, COOL, HAZARD_TEXEL, emitMat, pulseSet, wallVent, wallStencil, floorStencil, floorBorder, tank, cabinet, gratedTrench, warningLamp, cableTray, spotLight } from "./engProps.js";

export function buildReactor(kit, ctx) {
  const [min, max] = ctx.bounds; // [-24, -12, -112] .. [24, 20, -65]
  const Y0 = min[1];
  const Y1 = max[1];
  const CZ = -95; // core axis
  const A = 8.5; // ring platform apothem
  const RH = 4.4; // ring platform hole radius
  const rand = rng(ctx.seed + 41);
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

  // ---------------------------------------------------------------- shell: real floor at -12, two wall bands, ceiling at 20
  impFloor(kit, ctx, { mat: "floorGloss" });
  impCeiling(kit, ctx, { lights: false, paints: ENG_CEIL_PAINTS, panelW: 4, rowH: 4, along: "x", spacing: 12, styles: { panel: 0.8, greeble: 0.06, vent: 0.14 } });
  // big bulkhead plates: the shaft walls are 6000 m², so panels are large and sparsely detailed
  const lower = [[min[0], Y0, min[2]], [max[0], 0, max[2]]];
  const upper = [[min[0], 0, min[2]], [max[0], Y1, max[2]]];
  const shaftStyles = { panel: 0.64, vent: 0.1, greeble: 0.07, strip: 0.1, screen: 0.03, conduit: 0.06 };
  for (const side of ["zmin", "zmax", "xmin", "xmax"]) {
    impWall(kit, ctx, side, { bounds: lower, noDoors: true, paints: ENG_PAINTS_DARK, styles: shaftStyles, theme: ENG_THEME, rows: [0, 0.6, 4.4, 8.2, 12], panelW: 4.8, seed: ctx.seed * 5 + side.length });
    impWall(kit, ctx, side, { bounds: upper, paints: ENG_PAINTS, styles: shaftStyles, theme: ENG_THEME, rows: [0, 0.5, 2.6, 6.0, 10.4, 15.2, 20], panelW: 4.8, seed: ctx.seed * 7 + side.length });
  }
  // deck-level belt hides the band seam: dark channel with an amber strip all the way round
  const belt = (x0, z0, x1, z1) => kit.boxMM("paintedMetal", [x0, -0.28, z0], [x1, 0.28, z1], { color: PALETTE.impBlack, texel: 2 });
  belt(min[0], min[2], max[0], min[2] + 0.34);
  belt(min[0], max[2] - 0.34, -2.2, max[2]); // door wall: leave the doorway clear
  belt(2.2, max[2] - 0.34, max[0], max[2]);
  belt(min[0], min[2], min[0] + 0.34, max[2]);
  belt(max[0] - 0.34, min[2], max[0], max[2]);
  kit.boxMM("emitAmber", [min[0] + 0.2, -0.03, min[2] + 0.34], [max[0] - 0.2, 0.03, min[2] + 0.37], { uv: "keep" });
  kit.boxMM("emitAmber", [min[0] + 0.34, -0.03, min[2] + 0.2], [min[0] + 0.37, 0.03, max[2] - 0.2], { uv: "keep" });
  kit.boxMM("emitAmber", [max[0] - 0.37, -0.03, min[2] + 0.2], [max[0] - 0.34, 0.03, max[2] - 0.2], { uv: "keep" });

  // ---------------------------------------------------------------- collision: the shaft is a -12 region, walkways are solids
  kit.colliders.push({ type: "region", min: V3(min[0], Y0, min[2]), max: V3(max[0], 0, max[2]), floor: Y0, tag: "shaft" });
  const slabCollider = (x0, z0, x1, z1, tag = "walk") => kit.collider([x0, -0.3, z0], [x1, 0, z1], tag);

  // ---------------------------------------------------------------- the core
  // a saturated reactor blue at ~1.0 so the column reads as coloured light rather than a white bar
  const core = emitMat(ctx, "rx_core", 0x5fb0ff, 1.0);
  kit.cyl("rx_core", 0, (Y0 + Y1) / 2, CZ, 2.4, Y1 - Y0, "y", { segments: 40 });
  // cage: 12 ribs + collars every 4 m with pulsing bands
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    kit.add("paintedMetal", new THREE.BoxGeometry(0.55, Y1 - Y0, 0.5), { pos: [Math.cos(a) * 2.85, (Y0 + Y1) / 2, CZ + Math.sin(a) * 2.85], rot: [0, Math.PI / 2 - a, 0], color: PALETTE.impDark, texel: 1.2 });
  }
  const bands = pulseSet(ctx, "rx_band", 0x8fc8ff, 8, { min: 0.4, max: 2.0, speed: 1.4 });
  const collarYs = [-10, -6, -2, 2, 6, 10, 14, 18];
  collarYs.forEach((y, i) => {
    kit.cyl("paintedMetal", 0, y, CZ, 3.25, 0.7, "y", { color: PALETTE.impBlack, segments: 40, texel: 1 });
    kit.cyl("metal", 0, y, CZ, 3.32, 0.16, "y", { color: PALETTE.gunmetal, segments: 40 });
    kit.cyl(bands.keys[i], 0, y + 0.44, CZ, 3.08, 0.1, "y", { segments: 40, uv: "keep" });
    kit.cyl(bands.keys[i], 0, y - 0.44, CZ, 3.08, 0.1, "y", { segments: 40, uv: "keep" });
    // clamp bolts
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
      kit.box("metal", Math.cos(a) * 3.3, y, CZ + Math.sin(a) * 3.3, 0.24, 0.3, 0.24, { color: PALETTE.steel, rot: [0, -a, 0] });
    }
  });
  // top cap and base plinth
  kit.cyl("paintedMetal", 0, Y1 - 0.6, CZ, 3.9, 1.2, "y", { color: PALETTE.impDark, segments: 8, texel: 1 });
  kit.cyl("hazard", 0, Y1 - 1.25, CZ, 3.75, 0.12, "y", { segments: 8, texel: HAZARD_TEXEL });
  kit.add("paintedMetal", new THREE.CylinderGeometry(4.8, 5.3, 1.2, 8), { pos: [0, Y0 + 0.6, CZ], rot: [0, Math.PI / 8, 0], color: PALETTE.impDark, texel: 1 });
  kit.cyl("hazard", 0, Y0 + 1.21, CZ, 4.75, 0.02, "y", { segments: 8, texel: HAZARD_TEXEL });
  kit.cyl("metal", 0, Y0 + 1.3, CZ, 3.5, 0.2, "y", { color: PALETTE.gunmetal, segments: 40 });
  kit.collider([-3.35, Y0, CZ - 3.35], [3.35, Y1, CZ + 3.35], "core");
  kit.collider([-5.1, Y0, CZ - 5.1], [5.1, Y0 + 1.25, CZ + 5.1], "plinth");
  floorBorder(kit, -5.6, CZ - 5.6, 5.6, CZ + 5.6, { w: 0.14, y: Y0 + 0.004 });

  // energy: containment field cylinder, tilted arc rings and spinning arc sheets (additive)
  const fx = new THREE.Group();
  const fk = new Kit(ctx.materials);
  const field = ctx.materials.forceField.clone();
  field.opacity = 0.16;
  ctx.materials.rx_field = field;
  fk.cyl("rx_field", 0, (Y0 + Y1) / 2, CZ, 3.55, Y1 - Y0 - 1.4, "y", { segments: 48, open: true, uv: "scale", uvScale: [12, 16] });
  fk.build(fx);
  const rings = new THREE.Group();
  const rk = new Kit(ctx.materials);
  // (rings / sheets are built around the origin and parented at the core axis so they can spin)
  for (const [y, tilt] of [[-4, 0.35], [4, -0.3], [12, 0.42]]) {
    rk.add("holo", new THREE.TorusGeometry(3.6, 0.07, 8, 72), { pos: [0, y, 0], rot: [Math.PI / 2 + tilt, 0, 0], uv: "scale", uvScale: [1, 8] });
  }
  rk.build(rings);
  const sheets = new THREE.Group();
  const sk = new Kit(ctx.materials);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const g = new THREE.PlaneGeometry(1.1, Y1 - Y0 - 2);
    sk.add("holo", g, { pos: [Math.cos(a) * 3.4, (Y0 + Y1) / 2, Math.sin(a) * 3.4], rot: [0, Math.PI / 2 - a, 0], uv: "scale", uvScale: [1, 10] });
  }
  sk.build(sheets);
  rings.position.set(0, 0, CZ);
  sheets.position.set(0, 0, CZ);
  for (const g of [fx, rings, sheets]) {
    g.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = false;
        o.receiveShadow = false;
        o.frustumCulled = false;
      }
    });
    ctx.mesh(g);
  }
  ctx.anim((dt, t) => {
    core.emissiveIntensity = 1.0 + Math.sin(t * 1.7) * 0.12 + Math.sin(t * 5.3) * 0.05;
    bands.update(t);
    rings.rotation.y = t * 0.35;
    sheets.rotation.y = -t * 0.22;
    field.opacity = 0.14 + 0.05 * Math.sin(t * 2.6) + 0.02 * Math.sin(t * 11);
  });

  // ---------------------------------------------------------------- ring platform (octagon, apothem 8.5, round hole 3.9)
  {
    const shape = new THREE.Shape();
    const rv = A / Math.cos(Math.PI / 8);
    for (let i = 0; i < 8; i++) {
      const a = Math.PI / 8 + (i / 8) * Math.PI * 2;
      const p = [Math.cos(a) * rv, Math.sin(a) * rv];
      if (i === 0) shape.moveTo(p[0], p[1]);
      else shape.lineTo(p[0], p[1]);
    }
    shape.closePath();
    const hole = new THREE.Path();
    hole.absarc(0, 0, RH, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false, curveSegments: 32 });
    geo.rotateX(Math.PI / 2);
    kit.add("floorGloss", geo, { pos: [0, 0, CZ], texel: 0.33 });
    // skirt below the edge and a dark under-deck ring
    kit.add("paintedMetal", new THREE.CylinderGeometry(rv - 0.02, rv - 0.02, 1.1, 8, 1, true), { pos: [0, -0.85, CZ], rot: [0, Math.PI / 8, 0], color: PALETTE.impDark, texel: 1.2 });
    kit.add("paintedMetal", new THREE.CylinderGeometry(rv + 0.06, rv + 0.06, 0.12, 8, 1, true), { pos: [0, -0.3, CZ], rot: [0, Math.PI / 8, 0], color: PALETTE.impBlack, texel: 2 });
    // grate annulus between the platform and the core
    const ann = new THREE.RingGeometry(3.05, RH + 0.02, 48);
    ann.rotateX(-Math.PI / 2);
    kit.add("grate", ann, { pos: [0, -0.02, CZ], texel: 1 / GRATE_TILE[0] });
    kit.cyl("metal", 0, -0.04, CZ, RH + 0.05, 0.08, "y", { color: PALETTE.steel, segments: 48, open: true });
    // outer edges: light-grey kerb, railing (axis-aligned edges collide; diagonals get a staircase of boxes)
    const side = 2 * A * Math.tan(Math.PI / 8);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const d = A - 0.12;
      kit.add("paintedMetal", new THREE.BoxGeometry(side - 0.3, 0.012, 0.2), { pos: [Math.cos(a) * d, 0.004, CZ + Math.sin(a) * d], rot: [0, -a - Math.PI / 2, 0], color: PALETTE.impLight, texel: 2 });
      const a0 = a - Math.PI / 8;
      const a1 = a + Math.PI / 8;
      const rr = (A - 0.26) / Math.cos(Math.PI / 8);
      const p0 = [Math.cos(a0) * rr, CZ + Math.sin(a0) * rr];
      const p1 = [Math.cos(a1) * rr, CZ + Math.sin(a1) * rr];
      const diagonal = i % 2 === 1;
      if (i === 2) {
        // north edge: the gantry joins here, leave x -2..2 open
        railing(kit, p0[0], p0[1], 2.0, p0[1], 0, { collide: true });
        railing(kit, -2.0, p1[1], p1[0], p1[1], 0, { collide: true });
        continue;
      }
      railing(kit, p0[0], p0[1], p1[0], p1[1], 0, { collide: !diagonal });
      if (diagonal) {
        const n = 8;
        for (let k = 0; k < n; k++) {
          const q0 = [p0[0] + ((p1[0] - p0[0]) * k) / n, p0[1] + ((p1[1] - p0[1]) * k) / n];
          const q1 = [p0[0] + ((p1[0] - p0[0]) * (k + 1)) / n, p0[1] + ((p1[1] - p0[1]) * (k + 1)) / n];
          kit.collider([Math.min(q0[0], q1[0]) - 0.08, 0, Math.min(q0[1], q1[1]) - 0.08], [Math.max(q0[0], q1[0]) + 0.08, 1.05, Math.max(q0[1], q1[1]) + 0.08], "rail");
        }
      }
      // red beacon posts at the corners
      const bx = Math.cos(a0) * (rr - 0.55);
      const bz = CZ + Math.sin(a0) * (rr - 0.55);
      kit.box("paintedMetal", bx, 0.65, bz, 0.12, 1.3, 0.12, { color: PALETTE.impDark, texel: 2 });
      warningLamp(kit, bx, 1.45, bz, { r: 0.1 });
    }
    // inner railing around the hole (16 segments, own colliders)
    const ri = RH + 0.22;
    for (let i = 0; i < 16; i++) {
      const a0 = (i / 16) * Math.PI * 2;
      const a1 = ((i + 1) / 16) * Math.PI * 2;
      railing(kit, Math.cos(a0) * ri, CZ + Math.sin(a0) * ri, Math.cos(a1) * ri, CZ + Math.sin(a1) * ri, 0, { collide: false, h: 1.1 });
    }
    for (const [ex, ez] of [[4.4, 1.5], [4.0, 2.5], [3.3, 3.3], [2.5, 4.0], [1.5, 4.4]]) kit.collider([-ex, 0, CZ - ez], [ex, 1.1, CZ + ez], "innerrail");
    // walkable solids (octagon approximated by bands + corner boxes)
    slabCollider(-A, CZ - 3.5, A, CZ + 3.5, "ring");
    slabCollider(-3.5, CZ - A, 3.5, CZ + A, "ring");
    for (const [ex, ez] of [[7.5, 4.5], [6.5, 5.5], [5.5, 6.5], [4.5, 7.5]]) slabCollider(-ex, CZ - ez, ex, CZ + ez, "ring");
    // pylons and a truss ring under the platform
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) pillar(kit, sx * 6.2, CZ + sz * 6.2, Y0, -1.35, 0.9, PALETTE.impMid);
    for (const s of [-1, 1]) {
      kit.box("paintedMetal", 0, -1.6, CZ + s * 6.2, 12.4, 0.5, 0.35, { color: PALETTE.impDark, texel: 1.5 });
      kit.box("paintedMetal", s * 6.2, -1.6, CZ, 0.35, 0.5, 12.4, { color: PALETTE.impDark, texel: 1.5 });
    }
    // technician stations on the ring: two consoles facing the core, a monitoring cabinet
    for (const s of [-1, 1]) {
      cabinet(kit, s * 6.6, CZ + 4.2, { yaw: s > 0 ? Math.PI / 2 : -Math.PI / 2, w: 1.4, h: 1.5, d: 0.6, seed: ctx.seed + 3 + s, screen: 1, lamp: "emitBlue" });
    }
    // amber guide ring and radial marks on the deck, blue kerb light along the inner railing
    emitMat(ctx, "rx_guide", 0xffc46a, 0.8, "emitAmber");
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const d = 6.4;
      kit.add("rx_guide", new THREE.BoxGeometry(2 * d * Math.tan(Math.PI / 8) - 0.9, 0.008, 0.12), { pos: [Math.cos(a) * d, 0.006, CZ + Math.sin(a) * d], rot: [0, -a - Math.PI / 2, 0], uv: "keep" });
      const b = a + Math.PI / 8;
      kit.add("rx_guide", new THREE.BoxGeometry(0.1, 0.008, 1.6), { pos: [Math.cos(b) * 5.6, 0.006, CZ + Math.sin(b) * 5.6], rot: [0, -b - Math.PI / 2, 0], uv: "keep" });
    }
    kit.add("emitBlue", new THREE.RingGeometry(RH + 0.3, RH + 0.36, 48).rotateX(-Math.PI / 2), { pos: [0, 0.007, CZ], uv: "keep" });
    floorStencil(kit, 0, CZ - 6.4, 2.2, 14, Math.PI);
    floorStencil(kit, -6.2, CZ, 1.4, 12, Math.PI / 2);
    floorStencil(kit, 6.2, CZ, 1.4, 13, -Math.PI / 2);
  }

  // ---------------------------------------------------------------- gantry from the door landing to the ring
  const GZ0 = CZ + A; // -86.5
  const GZ1 = -69;
  {
    for (const [x0, x1] of [[-2, -0.62], [0.62, 2]]) kit.boxMM("floorGloss", [x0, -0.3, GZ0], [x1, 0, GZ1], { texel: 0.33 });
    const grate = new THREE.PlaneGeometry(1.24, GZ1 - GZ0);
    grate.rotateX(-Math.PI / 2);
    kit.add("grate", grate, { pos: [0, -0.012, (GZ0 + GZ1) / 2], uv: "scale", uvScale: [1, (GZ1 - GZ0) / GRATE_TILE[1]] });
    for (let z = GZ0 + 0.75; z < GZ1; z += 1.5) kit.box("metal", 0, -0.14, z, 1.4, 0.14, 0.12, { color: PALETTE.gunmetal });
    for (const s of [-1, 1]) {
      kit.boxMM("paintedMetal", [s * 1.85 - 0.16, -1.05, GZ0 - 0.2], [s * 1.85 + 0.16, -0.3, GZ1], { color: PALETTE.impDark, texel: 1.5 });
      kit.boxMM("paintedMetal", [s * 2.0 - (s > 0 ? 0.2 : 0), -0.002, GZ0], [s * 2.0 + (s > 0 ? 0 : 0.2), 0.006, GZ1], { color: PALETTE.impLight, texel: 2 });
      // blue kerb light (the reactor colour) with small red beacon studs every 2.5 m
      kit.boxMM("emitBlueDim", [s * 1.97 - 0.02, 0.006, GZ0 + 0.2], [s * 1.97 + 0.02, 0.016, GZ1 - 0.2], { uv: "keep" });
      for (let z = GZ0 + 1.5; z < GZ1 - 0.5; z += 2.5) kit.box("emitRedDim", s * 1.86, 0.08, z, 0.1, 0.05, 0.1);
      railing(kit, s * 1.92, GZ0 - 0.3, s * 1.92, GZ1, 0, { collide: true });
    }
    slabCollider(-2, GZ0 - 0.1, 2, GZ1 + 0.1, "gantry");
    // pylons and cross-braces down to the chamber floor
    for (const z of [-79]) for (const s of [-1, 1]) pillar(kit, s * 1.55, z, Y0, -1.05, 0.5, PALETTE.impMid);
    kit.box("paintedMetal", 0, -1.25, -79, 3.6, 0.4, 0.5, { color: PALETTE.impDark, texel: 1.5 });
    floorStencil(kit, 0, -72.5, 1.2, 14, Math.PI);
    floorStencil(kit, 0, -83, 1.2, 15, Math.PI);
  }
  // door landing and the side catwalk to the service stair
  platform(kit, ctx, { x0: -4, z0: GZ1, x1: 4, z1: max[2] - 0.02, y: 0 });
  platform(kit, ctx, { x0: -23, z0: -67, x1: -4, z1: max[2] - 0.02, y: 0 });
  railing(kit, -3.92, GZ1 + 0.06, -1.92, GZ1 + 0.06, 0, { collide: true });
  railing(kit, 1.92, GZ1 + 0.06, 3.92, GZ1 + 0.06, 0, { collide: true });
  railing(kit, 3.92, GZ1, 3.92, max[2] - 0.5, 0, { collide: true });
  railing(kit, -3.92, GZ1, -3.92, -67, 0, { collide: true });
  railing(kit, -21, -67.08, -4, -67.08, 0, { collide: true });
  // skirts under the landing / catwalk edges
  kit.boxMM("paintedMetal", [-23, -1.1, -67.2], [4, -0.3, -67], { color: PALETTE.impDark, texel: 1.5 });
  kit.boxMM("paintedMetal", [-4, -1.1, GZ1 - 0.2], [4, -0.3, GZ1], { color: PALETTE.impDark, texel: 1.5 });
  for (const x of [-17, -10]) pillar(kit, x, -66.6, Y0, -1.1, 0.6, PALETTE.impMid);
  pillar(kit, 3.6, -68.2, Y0, -1.1, 0.6, PALETTE.impMid);

  // ---------------------------------------------------------------- service stair along the west wall: -12 → 0
  {
    const st = stairs(kit, ctx, { x: -22, z: -87.1, y0: Y0, y1: 0, axis: "z", dir: 1, w: 2.0 });
    // stair-side wall so nobody steps off the open side; wall side is the bulkhead
    kit.collider([-21.06, Y0, -87.1], [-20.86, 1.3, -67], "stairwall");
    kit.boxMM("paintedMetal", [-21.06, Y0, -87.1], [-20.92, Y0 + 0.4, -87.1 + st.total], { color: PALETTE.impDark, texel: 2 });
    // bottom landing markings and an amber stair light
    floorBorder(kit, -23, -90.4, -21, -87.1, { w: 0.1, y: Y0 + 0.004 });
    floorStencil(kit, -22, -89, 1.2, 12, 0, Y0 + 0.006);
    wallStencil(kit, ctx, "xmin", max[2] + 77, 3.2 - Y0, 1.6, 15);
  }

  // ---------------------------------------------------------------- decorative catwalks at y = -8 and y = 8, cross gantry at y = 8
  const catwalk = (x0, z0, x1, z1, y, inner) => {
    kit.boxMM("floorGloss", [x0, y - 0.25, z0], [x1, y, z1], { texel: 0.33 });
    kit.boxMM("paintedMetal", [x0 - 0.05, y - 0.35, z0 - 0.05], [x1 + 0.05, y - 0.25, z1 + 0.05], { color: PALETTE.impDark, texel: 2 });
    kit.boxMM("paintedMetal", [x0, y - 0.05, z0], [x1, y + 0.001, z1], { color: PALETTE.impLight, texel: 2 });
    kit.boxMM("floorGloss", [x0 + 0.2, y - 0.04, z0 + 0.2], [x1 - 0.2, y + 0.002, z1 - 0.2], { texel: 0.33 });
    // blue level-marker line under the room-facing edge (reads the deck levels on the dark shaft walls)
    const e = 0.04;
    if (inner === "xmax") kit.boxMM("emitBlueDim", [x1 - e, y - 0.42, z0 + 0.3], [x1, y - 0.36, z1 - 0.3], { uv: "keep" });
    if (inner === "xmin") kit.boxMM("emitBlueDim", [x0, y - 0.42, z0 + 0.3], [x0 + e, y - 0.36, z1 - 0.3], { uv: "keep" });
    if (inner === "zmax") kit.boxMM("emitBlueDim", [x0 + 0.3, y - 0.42, z1 - e], [x1 - 0.3, y - 0.36, z1], { uv: "keep" });
    if (inner === "zmin") kit.boxMM("emitBlueDim", [x0 + 0.3, y - 0.42, z0], [x1 - 0.3, y - 0.36, z0 + e], { uv: "keep" });
    if (inner === "xmax") railing(kit, x1 - 0.1, z0, x1 - 0.1, z1, y, { collide: false });
    if (inner === "xmin") railing(kit, x0 + 0.1, z0, x0 + 0.1, z1, y, { collide: false });
    if (inner === "zmax") railing(kit, x0, z1 - 0.1, x1, z1 - 0.1, y, { collide: false });
    if (inner === "zmin") railing(kit, x0, z0 + 0.1, x1, z0 + 0.1, y, { collide: false });
    // brackets to the wall
    const n = Math.max(2, Math.round(Math.max(x1 - x0, z1 - z0) / 4));
    for (let i = 0; i <= n; i++) {
      const t = (i + 0.5) / (n + 1);
      const px = x1 - x0 > z1 - z0 ? x0 + t * (x1 - x0) : (x0 + x1) / 2;
      const pz = x1 - x0 > z1 - z0 ? (z0 + z1) / 2 : z0 + t * (z1 - z0);
      kit.box("paintedMetal", px, y - 0.7, pz, x1 - x0 > z1 - z0 ? 0.25 : x1 - x0 - 0.2, 0.7, x1 - x0 > z1 - z0 ? z1 - z0 - 0.2 : 0.25, { color: PALETTE.impDark, texel: 1.5 });
    }
  };
  // y = -8: a U around the south half (the stair takes the west wall north of z = -89)
  catwalk(min[0] + 0.2, min[2] + 0.2, min[0] + 2.2, -89, -8, "xmax");
  catwalk(max[0] - 2.2, min[2] + 0.2, max[0] - 0.2, max[2] - 0.2, -8, "xmin");
  catwalk(min[0] + 2.2, min[2] + 0.2, max[0] - 2.2, min[2] + 2.2, -8, "zmax");
  // y = 8: full perimeter + a cross gantry along x through the core line
  catwalk(min[0] + 0.2, min[2] + 0.2, min[0] + 2.2, max[2] - 0.2, 8, "xmax");
  catwalk(max[0] - 2.2, min[2] + 0.2, max[0] - 0.2, max[2] - 0.2, 8, "xmin");
  catwalk(min[0] + 2.2, min[2] + 0.2, max[0] - 2.2, min[2] + 2.2, 8, "zmax");
  catwalk(min[0] + 2.2, max[2] - 2.2, max[0] - 2.2, max[2] - 0.2, 8, "zmin");
  for (const [x0, x1] of [[min[0] + 2.2, -3.4], [3.4, max[0] - 2.2]]) {
    kit.boxMM("floorGloss", [x0, 7.75, CZ - 1.2], [x1, 8, CZ + 1.2], { texel: 0.33 });
    kit.boxMM("paintedMetal", [x0, 7.4, CZ - 1.3], [x1, 7.75, CZ + 1.3], { color: PALETTE.impDark, texel: 1.5 });
    for (const s of [-1, 1]) {
      railing(kit, x0, CZ + s * 1.1, x1, CZ + s * 1.1, 8, { collide: false });
      kit.boxMM("emitRed", [x0 + 0.2, 8.005, CZ + s * 1.17 - 0.03], [x1 - 0.2, 8.02, CZ + s * 1.17 + 0.03], { uv: "keep" });
    }
    // clamp ring where the gantry meets the core cage
    const cx = x0 < 0 ? -3.4 : 3.4;
    kit.box("paintedMetal", cx, 7.9, CZ, 0.6, 1.2, 2.8, { color: PALETTE.impBlack, texel: 2 });
  }

  // ---------------------------------------------------------------- coolant loops: floor run → riser → ceiling run
  const risers = [
    [min[0] + 1.1, -108],
    [min[0] + 1.1, -100],
    [min[0] + 1.1, -91],
    [max[0] - 1.1, -108],
    [max[0] - 1.1, -99],
    [max[0] - 1.1, -82],
    [-12, min[2] + 1.1],
    [12, min[2] + 1.1],
  ];
  risers.forEach(([rx, rz], i) => {
    const a = Math.atan2(rz - CZ, rx);
    const p0 = [Math.cos(a) * 5.0, Y0 + 0.75, CZ + Math.sin(a) * 5.0];
    const p1 = [Math.cos(a) * 5.3, Y0 + 0.75, CZ + Math.sin(a) * 5.3];
    const colr = i % 2 ? PALETTE.impMid : PALETTE.impGrey;
    pipeRun(kit, [p0, p1, [rx, Y0 + 0.75, rz], [rx, Y1 - 1.6, rz], [Math.cos(a) * 3.95, Y1 - 1.6, CZ + Math.sin(a) * 3.95]], 0.32, colr);
    // riser collars and a valve block at the base
    for (const y of [-6, 0.6, 8, 15]) kit.cyl("metal", rx, y, rz, 0.4, 0.3, "y", { color: PALETTE.impBlack, segments: 16 });
    kit.box("paintedMetal", rx, Y0 + 0.75, rz, 1.1, 1.5, 1.1, { color: PALETTE.impDark, texel: 2 });
    kit.box(i % 3 === 0 ? "emitRed" : "emitBlue", rx + (rx < 0 ? 0.56 : rx > 10 ? -0.56 : 0), Y0 + 1.2, rz + (Math.abs(rx) > 10 ? 0 : 0.56), Math.abs(rx) > 10 ? 0.01 : 0.12, 0.06, Math.abs(rx) > 10 ? 0.12 : 0.01);
    kit.collider([rx - 0.6, Y0, rz - 0.6], [rx + 0.6, Y0 + 1.6, rz + 0.6], "valve");
  });

  // ---------------------------------------------------------------- chamber floor: trenches, pumps, tanks
  for (const [x0, x1] of [[-21, -6.2], [6.2, 21]]) gratedTrench(kit, x0, CZ - 0.6, x1, CZ + 0.6, { depth: 0.6, emit: "emitBlue", y: Y0 });
  for (const [z0, z1] of [[min[2] + 3, CZ - 6.2], [CZ + 6.2, -70]]) gratedTrench(kit, -0.6, z0, 0.6, z1, { depth: 0.6, emit: "emitBlue", y: Y0 });
  for (const [x, z, yaw] of [[-17, -108, 0], [17, -108, 0], [17, -70, Math.PI]]) {
    cabinet(kit, x, z, { yaw, w: 2.6, h: 2.6, d: 1.2, y: Y0, seed: ctx.seed + 7 + Math.abs(x), screen: 4, lamp: "emitBlue" });
  }
  for (const [x, z] of [[-12, -108.5], [-8.5, -108.5], [12, -108.5], [8.5, -108.5], [19, -87], [19, -90.5]]) tank(kit, x, z, { r: 0.9, h: 3.4, y: Y0, color: PALETTE.impMid, lamp: "emitBlue", front: z > -100 ? -1 : 1 });
  for (let i = 0; i < 4; i++) floorStencil(kit, [-15, 15, -15, 15][i], CZ + [-14, -14, 14, 14][i], 2.0, 8 + i, 0, Y0 + 0.006);

  // ---------------------------------------------------------------- walls: vents, stencils, lit signs, panels, screens by the door, warning lamps
  for (const side of ["xmin", "xmax", "zmin"]) {
    for (const u of [12, 34]) wallVent(kit, ctx, side, u, 14 - Y0, 5.0, 2.2, { slats: 9 });
  }
  // bay stencils sit on the core line (u = 30 on the side walls → z = CZ), clear of the risers and
  // the ring pylons, with a lit sign under each; the back wall gets one either side of the core
  for (const side of ["xmin", "xmax"]) {
    wallStencil(kit, ctx, side, 30, 4.4 - Y0, 3.2, 14);
    signPlate(kit, ctx, { side, u: 30, v: 2.0 - Y0, w: 4.2, h: 0.62, text: "Reactor Core", sub: "Level 0 · Shaft B-1", accent: "#4a9dff" });
  }
  for (const u of [8, 40]) wallStencil(kit, ctx, "zmin", u, 4.4 - Y0, 3.0, 14);
  wallVent(kit, ctx, "zmax", 10, 14 - Y0, 5.0, 2.2, { slats: 9 });
  wallVent(kit, ctx, "zmax", 38, 14 - Y0, 5.0, 2.2, { slats: 9 });
  // emissive light panels lift the shaft walls out of black: three rows (lower band, deck level +5,
  // upper band) of soft strips in dark housings, kept clear of the vents and the coolant risers
  {
    const lightPanel = (side, u, y, w = 2.4) => {
      const seg = wallSegment(ctx.bounds, side);
      const { frame } = wallFrame(kit, seg.from, seg.to, Y0);
      const v = y - Y0;
      frame.box("paintedMetal", u, v, 0.05, w + 0.3, 0.6, 0.1, { color: PALETTE.impDark, texel: 2 });
      frame.box("emitStrip", u, v, 0.106, w, 0.3, 0.01, { uv: "keep" });
      frame.box("emitBlueDim", u, v - 0.24, 0.106, w, 0.03, 0.01, { uv: "keep" });
    };
    for (const z of [-70, -78, -86, -95, -104]) {
      lightPanel("xmin", max[2] - z, 5.0);
      lightPanel("xmin", max[2] - z, 11.5);
      lightPanel("xmax", z - min[2], 5.0);
      lightPanel("xmax", z - min[2], 11.5);
      lightPanel("xmax", z - min[2], -4.5);
      if (z < -80) lightPanel("xmin", max[2] - z, -4.5);
    }
    for (const x of [-18, -6, 6, 18]) for (const y of [5.0, 11.5, -4.5]) lightPanel("zmin", x - min[0], y);
    for (const x of [-19, -9, 9, 19]) for (const y of [5.0, 11.5, -4.5]) lightPanel("zmax", max[0] - x, y);
    wallScreen(kit, ctx, { side: "xmin", u: max[2] - -76, v: 3.0 - Y0, w: 2.4, h: 1.3, screen: 2 });
    wallScreen(kit, ctx, { side: "xmax", u: -76 - min[2], v: 3.0 - Y0, w: 2.4, h: 1.3, screen: 0 });
    wallScreen(kit, ctx, { side: "xmax", u: -100 - min[2], v: 3.0 - Y0, w: 2.4, h: 1.3, screen: 2 });
  }
  // door wall (zmax): u = max.x - x
  const uZ = (x) => max[0] - x;
  wallScreen(kit, ctx, { side: "zmax", u: uZ(-5.4), v: 2.0 - Y0, w: 1.6, h: 0.9, screen: 3 });
  wallScreen(kit, ctx, { side: "zmax", u: uZ(5.4), v: 2.0 - Y0, w: 1.6, h: 0.9, screen: 1 });
  wallStencil(kit, ctx, "zmax", uZ(-7.6), 1.6 - Y0, 1.0, 13);
  wallStencil(kit, ctx, "zmax", uZ(7.6), 1.6 - Y0, 1.0, 13);
  // racks stand on the catwalk against the door wall
  equipmentRack(kit, ctx, { side: "zmax", u: uZ(-10), w: 1.4, h: 2.6, seed: ctx.seed + 51, lit: "emitBlue", bounds: upper });
  equipmentRack(kit, ctx, { side: "zmax", u: uZ(-13), w: 1.4, h: 2.6, seed: ctx.seed + 52, lit: "emitAmber", bounds: upper });
  for (const x of [-2.6, 2.6]) warningLamp(kit, x, 4.6, max[2] - 0.3, { r: 0.14 });
  cableTray(kit, [-22, -66.2], [22, -66.2], Y1 - 0.7, { w: 0.6, ceil: Y1, cables: 5, seed: 3 });
  cableTray(kit, [-22, -110.8], [22, -110.8], Y1 - 0.7, { w: 0.6, ceil: Y1, cables: 4, seed: 4 });

  // ---------------------------------------------------------------- lights (8): core glow x3 (reactor blue, kept below
  // the point where the ring platform clips to white), red gantry, door, amber stair, amber floor, shadow spot
  ctx.light(pointLight(0x6fb4ff, 50, 30, [0, 2.6, CZ]));
  ctx.light(pointLight(0x5fa8ff, 42, 28, [0, Y0 + 2.5, CZ]));
  ctx.light(pointLight(0x5fa8ff, 34, 28, [0, 13, CZ]));
  ctx.light(pointLight(0xff3a2a, 9, 9, [0, 1.2, -77.5]));
  ctx.light(pointLight(0xe8f0ff, 16, 12, [0, 3.6, -67.5]));
  ctx.light(pointLight(AMBER, 20, 14, [-18, 3.0, -68.5]));
  ctx.light(pointLight(AMBER, 28, 16, [16, Y0 + 3, -80]));
  ctx.light(spotLight(COOL, 40, 34, [0, Y1 - 1.0, -80], [0, 0, -88], { angle: 0.55, penumbra: 0.6, shadow: true }));
  void rand;
}
