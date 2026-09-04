// Tactical Operations / Holo Planning. A two-tier square dais carries the big holo table (the ship,
// a planet with its orbit ring, a tactical grid and animated fleet blips) ringed by eight officer
// stations; four wide two-step stairs climb the tiers on the cardinal axes. The west wall is a bank of
// tactical screens with its own operator row, the east wall holds lockers and wall consoles, and the
// commander's dais (raised 0.6 m, railed, two side stairs) closes the room at the aft wall. Dark grey
// walls, blue key light from the hologram, a square ring of low ceiling troughs over the dais.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { buildShell, roomWalls } from "../../shell.js";
import { wallFrame } from "../../../core/frame.js";
import { console as impConsole, chair, holoTable, ceilingLight, pointLightDesc, railing, stairs, platform, screenArray, wallScreen, alertBeacon, floorDecal, cableTray, lockers, column, pipeRun, stairRisers, placard } from "../../impKit.js";
import { IMP } from "../../../materials/imperial.js";
import { impDecalRect } from "../../../materials/imperialTextures.js";
import { STD } from "../../../config/layout.js";

export function buildHolo(kit, ctx) {
  const { room, floorY: y } = ctx;
  const [x0, z0, x1, z1] = room.box;
  const h = room.h;
  const cx = (x0 + x1) / 2; // -35: the door, the table and the dais share this axis
  const cz = 620; // table centre
  const t = STD.wallT;
  const mats = ctx.mats;

  buildShell(kit, ctx, ctx.id, room, {
    wall: { pitch: 4, tone: IMP.wallDark, toneAlt: IMP.wallMid, bandMat: "lightBand", styles: { plain: 0.5, control: 0.16, vent: 0.1, hatch: 0.08, pipes: 0.04, screen: 0.08, niche: 0.04 } },
    ceiling: { lights: false, tone: IMP.wallDark, panelW: 2.0 },
    floor: { strip: false, tone: IMP.wallDark },
  });
  const walls = roomWalls(room);

  // ---- tiers -----------------------------------------------------------------------------------
  const r0 = 0.18;
  const r1 = 0.36;
  const T0 = [x0 + 5, 612, x1 - 5, 628]; // lower tier 16 x 16
  const T1 = [x0 + 7, 614, x1 - 7, 626]; // upper tier 12 x 12
  const bay = 1.8; // half width of the four stair bays
  const yT = y + r1;
  platform(kit, ctx, [T0[0], T0[1], cx - bay, T1[1]], y, r0, { lit: ["n", "w"] });
  platform(kit, ctx, [cx + bay, T0[1], T0[2], T1[1]], y, r0, { lit: ["n", "e"] });
  platform(kit, ctx, [T0[0], T1[3], cx - bay, T0[3]], y, r0, { lit: ["s", "w"] });
  platform(kit, ctx, [cx + bay, T1[3], T0[2], T0[3]], y, r0, { lit: ["s", "e"] });
  platform(kit, ctx, [T0[0], T1[1], T1[0], cz - bay], y, r0, { lit: ["w"] });
  platform(kit, ctx, [T0[0], cz + bay, T1[0], T1[3]], y, r0, { lit: ["w"] });
  platform(kit, ctx, [T1[2], T1[1], T0[2], cz - bay], y, r0, { lit: ["e"] });
  platform(kit, ctx, [T1[2], cz + bay, T0[2], T1[3]], y, r0, { lit: ["e"] });
  platform(kit, ctx, T1, y, r1, { lit: ["n", "s", "w", "e"] });
  const stairOpts = { tread: 1.0, rails: false, tone: IMP.wallDark };
  for (const [from, dir] of [
    [[cx, T0[1]], [0, 1]],
    [[cx, T0[3]], [0, -1]],
    [[T0[0], cz], [1, 0]],
    [[T0[2], cz], [-1, 0]],
  ]) {
    stairs(kit, ctx, from, dir, bay * 2, y, yT, stairOpts);
    stairRisers(kit, from, dir, bay * 2, y, 2, r1 / 2, 1.0);
  }
  // hazard-band stencils on the deck at the foot of each stair (red bar: the only band that reads on dark deck)
  for (const [dx, dz, yaw] of [[0, -8.7, 0], [0, 8.7, Math.PI], [-8.7, 0, Math.PI / 2], [8.7, 0, -Math.PI / 2]]) floorDecal(kit, cx + dx, y, cz + dz, 1.1, 1, yaw);
  // lit railings around the lower tier, open at the four stair bays
  {
    const yR = y + r0;
    const g = 0.15;
    const rail = (a, b) => railing(kit, a, b, yR, { h: 1.0, lit: true, postPitch: 1.5 });
    for (const zz of [T0[1] + g, T0[3] - g]) {
      rail([T0[0] + g, zz], [cx - bay - 0.1, zz]);
      rail([cx + bay + 0.1, zz], [T0[2] - g, zz]);
    }
    for (const xx of [T0[0] + g, T0[2] - g]) {
      rail([xx, T0[1] + g + 0.2], [xx, cz - bay - 0.1]);
      rail([xx, cz + bay + 0.1], [xx, T0[3] - g - 0.2]);
    }
  }
  // structural columns framing the entry axis
  column(kit, cx - 5.2, 609.3, y, y + h, { w: 0.6, d: 0.6 });
  column(kit, cx + 5.2, 609.3, y, y + h, { w: 0.6, d: 0.6 });

  // ---- holo table + second hologram layer ---------------------------------------------------------
  const tableR = 2.4;
  const tableH = 0.9;
  holoTable(kit, ctx, [cx, yT, cz], tableR, { content: "ship" });
  {
    const layer = new THREE.Group();
    layer.position.set(cx, yT + tableH + 0.08, cz);
    // tactical grid + range ring (one line batch)
    const pts = [];
    const half = 2.0;
    for (let i = -5; i <= 5; i++) {
      const s = i * 0.4;
      pts.push(-half, 0, s, half, 0, s, s, 0, -half, s, 0, half);
    }
    const seg = 72;
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2;
      const a1 = ((i + 1) / seg) * Math.PI * 2;
      pts.push(Math.cos(a0) * 2.1, 0.005, Math.sin(a0) * 2.1, Math.cos(a1) * 2.1, 0.005, Math.sin(a1) * 2.1);
    }
    const gridGeo = new THREE.BufferGeometry();
    gridGeo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    const gridMat = new THREE.LineBasicMaterial({ color: IMP.holo, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false });
    layer.add(new THREE.LineSegments(gridGeo, gridMat));
    // planet with an orbit ring, off to one side of the ship
    const planetPos = new THREE.Vector3(1.35, 1.0, -0.95);
    const sphere = new THREE.SphereGeometry(0.42, 18, 12);
    const ring = new THREE.TorusGeometry(0.66, 0.008, 6, 64);
    ring.rotateX(Math.PI / 2 - 0.25);
    const planet = new THREE.Mesh(mergeGeometries([sphere, ring], false), mats.holoWire);
    planet.position.copy(planetPos);
    layer.add(planet);
    // fleet blips: Imperial wedges orbiting the planet, hostiles running the perimeter
    const N_IMP = 16;
    const N_HOSTILE = 8;
    const shape = new THREE.Shape([new THREE.Vector2(0, 0.26), new THREE.Vector2(0.14, -0.16), new THREE.Vector2(-0.14, -0.16)]);
    const wedge = new THREE.ExtrudeGeometry(shape, { depth: 0.035, bevelEnabled: false });
    wedge.rotateX(Math.PI / 2);
    const fleetMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const fleet = new THREE.InstancedMesh(wedge, fleetMat, N_IMP + N_HOSTILE);
    fleet.frustumCulled = false;
    const col = new THREE.Color();
    for (let i = 0; i < N_IMP + N_HOSTILE; i++) fleet.setColorAt(i, col.set(i < N_IMP ? 0xa8d4ff : 0xff7a60));
    fleet.instanceColor.needsUpdate = true;
    layer.add(fleet);
    ctx.add(layer);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const one = new THREE.Vector3(1, 1, 1);
    const dir = new THREE.Vector3();
    const Z = new THREE.Vector3(0, 0, 1);
    ctx.animate((dt, t) => {
      planet.rotation.y += dt * 0.3;
      for (let i = 0; i < N_IMP; i++) {
        const ringIdx = i % 2;
        const r = 0.78 + ringIdx * 0.3;
        const w = ringIdx ? -0.28 : 0.4;
        const a = t * w + Math.floor(i / 2) * (Math.PI / 4);
        p.set(planetPos.x + Math.cos(a) * r, planetPos.y + Math.sin(a * 2) * 0.06 * (ringIdx ? -1 : 1), planetPos.z + Math.sin(a) * r);
        dir.set(-Math.sin(a) * w, 0, Math.cos(a) * w).normalize();
        q.setFromUnitVectors(Z, dir);
        m.compose(p, q, one);
        fleet.setMatrixAt(i, m);
      }
      for (let j = 0; j < N_HOSTILE; j++) {
        const a = -t * 0.14 + j * 0.1 + (j % 2) * 0.05;
        const r = 1.82 + (j % 2) * 0.12;
        p.set(Math.cos(a) * r, 0.32 + 0.08 * Math.sin(t * 1.3 + j), Math.sin(a) * r);
        dir.set(Math.sin(a), 0, -Math.cos(a)).normalize();
        q.setFromUnitVectors(Z, dir);
        m.compose(p, q, one);
        fleet.setMatrixAt(N_IMP + j, m);
      }
      fleet.instanceMatrix.needsUpdate = true;
      gridMat.opacity = 0.3 + 0.04 * Math.sin(t * 3.1);
    });
  }

  // ---- officer stations ringing the table -----------------------------------------------------------
  const R_CONSOLE = 4.7;
  const R_CHAIR = 5.55;
  for (let k = 0; k < 8; k++) {
    const a = (k + 0.5) * (Math.PI / 4);
    const dx = Math.sin(a);
    const dz = Math.cos(a);
    const yaw = Math.atan2(dx, dz); // look inward
    impConsole(kit, ctx, [cx + dx * R_CONSOLE, yT, cz + dz * R_CONSOLE], yaw, { kind: "station", width: 1.3, screens: 2, seed: 20 + k, light: false });
    chair(kit, [cx + dx * R_CHAIR, yT, cz + dz * R_CHAIR], yaw);
  }
  // blue fill under the table rim (lights the tier edges)
  pointLightDesc(ctx, 0x3a86ff, 1.3, 7, [cx, yT + 0.5, cz], 0);

  // ---- west wall: tactical screen bank + operator row ------------------------------------------------
  {
    const w = walls.west;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    const uc = w.u(cz); // u increases toward -Z
    wallScreen(frame, uc, 2.95, 9.0, 3.2, 1, { leds: true });
    screenArray(frame, uc - 7.6, 2.95, 3, 2, 1.5, 0.9, { seed: 5, variants: [0, 2, 1] });
    screenArray(frame, uc + 7.6, 2.95, 3, 2, 1.5, 0.9, { seed: 9, variants: [2, 0, 1] });
    wallScreen(frame, 1.6, 2.6, 1.4, 0.8, 2);
    wallScreen(frame, w.length - 1.6, 2.6, 1.4, 0.8, 0);
    placard(frame, uc - 5.0, 4.7, 0.45, 3);
    placard(frame, uc + 5.0, 4.7, 0.45, 15);
    // steel plinth rail under the big screen with indicator strip
    frame.box("impPaintedMetal", uc, 1.15, 0.12, 9.4, 0.1, 0.24, { color: IMP.consoleDark, texel: 1 });
    frame.box("blinkSparse", uc, 1.15, 0.245, 9.0, 0.06, 0.01, { uv: "keep" });
    pointLightDesc(ctx, 0x5a8cff, 2.6, 10, [x0 + 2.2, y + 3.4, cz], 1);
    const px = x0 + t + 0.5 + 0.85; // operator side of a console standing 0.5 m off the wall
    for (const [i, z] of [613.5, 616.4, 623.6, 626.5].entries()) {
      impConsole(kit, ctx, [px, y, z], Math.PI / 2, { kind: "station", width: 1.4, screens: 2, seed: 30 + i, light: false });
      chair(kit, [px + 0.85, y, z], Math.PI / 2);
    }
    ceilingLight(kit, ctx, [x0 + 3.2, y + h, cz], 18, "z", { intensity: 0 });
  }

  // ---- east wall: lockers, wall consoles, sensor array -------------------------------------------------
  {
    const w = walls.east;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    lockers(frame, w.u(606.4), w.u(610.6), 2.2, { seed: 4, tone: IMP.wallMid });
    screenArray(frame, w.u(620), 2.7, 4, 2, 1.2, 0.7, { seed: 13, variants: [1, 2, 0], leds: true });
    placard(frame, w.u(620), 4.4, 0.6, 9);
    alertBeacon(frame, ctx, w.u(612.2), 3.7, { intensity: 0 });
    alertBeacon(frame, ctx, w.u(627.8), 3.7, { intensity: 0 });
    const px = x1 - t - 0.62;
    impConsole(kit, ctx, [px, y, 614.2], -Math.PI / 2, { kind: "wall", width: 2.2, seed: 41, light: false });
    impConsole(kit, ctx, [px, y, 625.8], -Math.PI / 2, { kind: "wall", width: 2.2, seed: 43, light: false });
    pointLightDesc(ctx, 0xa8c4ff, 1.5, 8, [x1 - 2.2, y + 3.6, cz], 0);
  }

  // ---- north wall: entry, flanking wall consoles, signage ----------------------------------------------
  {
    const w = walls.north;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    const pz = z0 + t + 0.62;
    impConsole(kit, ctx, [x0 + 6.5, y, pz], 0, { kind: "wall", width: 2.4, seed: 51, light: false });
    impConsole(kit, ctx, [x1 - 6.5, y, pz], 0, { kind: "wall", width: 2.4, seed: 53, light: false });
    placard(frame, w.u(cx) - 3.4, 3.0, 0.7, 3);
    placard(frame, w.u(cx) + 3.4, 3.0, 0.7, 0);
    alertBeacon(frame, ctx, w.u(cx) - 3.4, 3.95, { intensity: 0.9, distance: 5 });
    alertBeacon(frame, ctx, w.u(cx) + 3.4, 3.95, { intensity: 0 });
    ceilingLight(kit, ctx, [cx, y + h, z0 + 4.6], 9, "x", { intensity: 2.0, distance: 9, priority: 1 });
    floorDecal(kit, cx - 2.6, y, z0 + 2.6, 1.0, 13);
    floorDecal(kit, cx + 2.6, y, z0 + 2.6, 1.0, 1, Math.PI);
  }

  // ---- commander's dais at the aft wall -------------------------------------------------------------------
  {
    const rD = 0.6;
    const yD = y + rD;
    const D = [cx - 5, 630, cx + 5, z1 - t - 0.2];
    const stairZ0 = 630.65;
    const stairZ1 = 633.05;
    platform(kit, ctx, D, y, rD, { lit: ["n", "w", "e"], strip: "emitAmber", collide: true, gaps: [["w", stairZ0, stairZ1], ["e", stairZ0, stairZ1]] });
    stairs(kit, ctx, [D[0] - 0.9, (stairZ0 + stairZ1) / 2], [1, 0], stairZ1 - stairZ0, y, yD, { rails: true, tone: IMP.wallDark });
    stairs(kit, ctx, [D[2] + 0.9, (stairZ0 + stairZ1) / 2], [-1, 0], stairZ1 - stairZ0, y, yD, { rails: true, tone: IMP.wallDark });
    railing(kit, [D[0], D[1] + 0.06], [D[2], D[1] + 0.06], yD, { lit: true });
    impConsole(kit, ctx, [cx, yD, 632.35], 0, { kind: "wide", width: 2.8, screens: 3, seed: 61, light: false });
    chair(kit, [cx, yD, 632.98], 0);
    // wall consoles against the aft wall, facing the room (yaw PI: fronts toward -Z)
    impConsole(kit, ctx, [cx - 3.6, yD, z1 - t - 0.62], Math.PI, { kind: "wall", width: 1.8, seed: 63, light: false });
    impConsole(kit, ctx, [cx + 3.6, yD, z1 - t - 0.62], Math.PI, { kind: "wall", width: 1.8, seed: 65, light: false });
    pointLightDesc(ctx, IMP.amber, 4.0, 8, [cx, yD + 2.3, 632], 1);
    pointLightDesc(ctx, 0xffc46a, 2.0, 5, [cx, yD + 0.6, 630.6], 0);
    const w = walls.south;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    // Imperial roundel on a light insignia plate over the commander's seat
    placard(frame, w.u(cx), 3.5, 1.9, 4);
    placard(frame, w.u(cx) - 2.2, 3.45, 0.7, 15);
    frame.quad("impDecal", w.u(cx) + 2.2, 3.45, 0.062, 0.7, 0.7, { uvRect: impDecalRect(11) });
    wallScreen(frame, w.u(cx) - 8.5, 2.7, 1.5, 0.85, 1);
    wallScreen(frame, w.u(cx) + 8.5, 2.7, 1.5, 0.85, 2);
    // crates of data cores under the flanking screens: painted cabinets with a lit seam
    for (const s of [-1, 1]) {
      const bx = cx + s * 8.5;
      kit.box("impPaintedMetal", bx, y + 0.55, z1 - t - 0.5, 2.0, 1.1, 0.8, { color: IMP.consoleDark, texel: 1 });
      kit.box("blinkSparse", bx, y + 0.8, z1 - t - 0.9 - 0.004, 1.6, 0.2, 0.008, { uv: "keep" });
      kit.collider([bx - 1.0, y, z1 - t - 0.9], [bx + 1.0, y + 1.1, z1 - t - 0.1], "cabinet");
    }
  }

  // ---- ceiling: dark field, square trough ring over the tiers, projector housing, beams, cable trays ----
  {
    const yc = y + h;
    const R = 5.6;
    ceilingLight(kit, ctx, [cx, yc, cz - R], R * 2, "x", { intensity: 2.2, distance: 8, priority: 1 });
    ceilingLight(kit, ctx, [cx, yc, cz + R], R * 2, "x", { intensity: 2.2, distance: 8, priority: 1 });
    ceilingLight(kit, ctx, [cx - R, yc, cz], R * 2, "z", { intensity: 2.2, distance: 8, priority: 1 });
    ceilingLight(kit, ctx, [cx + R, yc, cz], R * 2, "z", { intensity: 2.2, distance: 8, priority: 1 });
    // projector housing over the table
    kit.cyl("impPaintedMetal", cx, yc - 0.32, cz, 1.7, 0.64, "y", { color: IMP.consoleDark, segments: 32, texel: 1 });
    kit.add("blink", new THREE.CylinderGeometry(1.705, 1.705, 0.14, 32, 1, true), { pos: [cx, yc - 0.4, cz], uv: "scale", uvScale: [6, 1] });
    kit.add("emitBlue", new THREE.TorusGeometry(1.3, 0.025, 8, 48), { pos: [cx, yc - 0.66, cz], rot: [Math.PI / 2, 0, 0] });
    kit.cyl("darkGloss", cx, yc - 0.68, cz, 0.6, 0.06, "y", { segments: 24 });
    // structural beams fore and aft of the dais ring
    for (const bz of [610.5, 629.6]) kit.box("impPaintedMetal", cx, yc - 0.28, bz, x1 - x0 - 0.6, 0.56, 0.5, { color: IMP.trim, texel: 1 });
    cableTray(kit, [cx - 1.7, cz - 0.8], [x0 + 0.6, cz - 0.8], yc - 0.5, { w: 0.5, cables: 4, seed: 3 });
    cableTray(kit, [cx + 1.7, cz + 0.8], [x1 - 0.6, cz + 0.8], yc - 0.5, { w: 0.5, cables: 4, seed: 5 });
    // coolant conduits along the beams, dropping to the west console row
    for (const [bz, s] of [[610.5, -1], [629.6, 1]]) {
      pipeRun(kit, [[x0 + 0.5, yc - 0.62, bz + s * 0.55], [x1 - 0.5, yc - 0.62, bz + s * 0.55]], 0.09, { color: IMP.gunmetal, clampPitch: 3 });
      pipeRun(kit, [[x0 + 0.5, yc - 0.62, bz + s * 0.85], [x1 - 0.5, yc - 0.62, bz + s * 0.85]], 0.05, { color: IMP.steel, clamps: false });
    }
  }

  // ---- camera views --------------------------------------------------------------------------------------
  const eye = y + STD.eye;
  ctx.view("holo", cx, eye, z0 + 2.6, 180, -6);
  ctx.view("holo_table", cx, eye, T1[3] - 1.2, 0, 2);
  ctx.view("holo_dais", x1 - 3.8, eye, 628.6, 128, -5);
  ctx.view("holo_screens", x0 + 8, eye, 611.5, 118, -4);
  ctx.view("holo_east", x0 + 4.2, eye, cz, -90, -4);
}
