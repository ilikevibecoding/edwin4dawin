// Communications & Sensor Control. The wide door opens onto a rack vestibule (24 instanced
// signal-analysis cabinets along the north, west and east walls under cable trays), then the aisle
// climbs three steps onto the rear operator tier and steps down twice toward the giant sensor display
// wall on the aft side: sixteen operator stations in three rows all face it. A holo-comm projector
// alcove fills the SW corner (hooded figure in a projection cone, comm officer's console), an antenna
// control station with a slowly tracking sensor dish the SE corner. Cool blue/white light bands with
// amber alert beacons at the door and over the tiers.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { buildShell, roomWalls } from "../../shell.js";
import { wallFrame } from "../../../core/frame.js";
import { console as impConsole, chair, ceilingLight, pointLightDesc, stairs, stairRisers, platform, rackRows, cableTray, screenArray, wallScreen, alertBeacon, floorDecal, placard, column, pipeRun } from "../../impKit.js";
import { IMP } from "../../../materials/imperial.js";
import { impDecalRect } from "../../../materials/imperialTextures.js";
import { STD } from "../../../config/layout.js";
import { setVertexColor } from "../../../kit.js";

export function buildComms(kit, ctx) {
  const { room, floorY: y } = ctx;
  const [x0, z0, x1, z1] = room.box;
  const h = room.h;
  const cx = (x0 + x1) / 2; // 35: door and aisle axis
  const t = STD.wallT;
  const mats = ctx.mats;
  const yc = y + h;

  buildShell(kit, ctx, ctx.id, room, {
    wall: { pitch: 4, tone: IMP.wallMid, toneAlt: IMP.wallDark, bandMat: "lightBand", styles: { plain: 0.46, control: 0.2, vent: 0.1, hatch: 0.06, pipes: 0.06, screen: 0.08, niche: 0.04 } },
    ceiling: { lights: false, tone: IMP.wallDark, panelW: 2.0 },
    floor: { strip: false, tone: IMP.wallDark },
  });
  const walls = roomWalls(room);
  const aisle = 3.6; // matches the wide door

  // ---- tiers: rear (+0.55) and middle (+0.25), full width; the aisle climbs the rear tier by stairs ----
  const Z_REAR = [611, 617.5];
  const Z_MID = [617.5, 623.5];
  const R_REAR = 0.55;
  const R_MID = 0.25;
  platform(kit, ctx, [x0 + t + 0.6, Z_REAR[0], x1 - t - 0.6, Z_REAR[1]], y, R_REAR, { lit: ["n", "s"], strip: "emitBlue" });
  platform(kit, ctx, [x0 + t + 0.6, Z_MID[0], x1 - t - 0.6, Z_MID[1]], y, R_MID, { lit: ["s"], strip: "emitBlue" });
  {
    // three steps up onto the rear tier, centred on the aisle (open, no rails: the whole aisle is stair)
    const n = 3;
    const tread = 0.34;
    const from = [cx, Z_REAR[0] - n * tread];
    stairs(kit, ctx, from, [0, 1], aisle, y, y + R_REAR, { tread, rails: false, riser: R_REAR / n, tone: IMP.wallDark });
    stairRisers(kit, from, [0, 1], aisle, y, n, R_REAR / n, tread);
    // amber hazard marks at the foot of the stairs and at the tier's south drop
    floorDecal(kit, cx - 1.1, y, from[1] - 0.7, 0.9, 1);
    floorDecal(kit, cx + 1.1, y, from[1] - 0.7, 0.9, 1);
    kit.box("emitAmber", cx, y + R_REAR + 0.004, Z_REAR[1] - 0.12, aisle - 0.4, 0.006, 0.05);
    kit.box("emitAmber", cx, y + R_MID + 0.004, Z_MID[1] - 0.12, aisle - 0.4, 0.006, 0.05);
  }

  // ---- operator rows facing the display wall (consoles yaw PI: screens toward the seated operator) ---
  const rows = [
    { z: 614.6, yRow: y + R_REAR, xs: [26.2, 28.1, 30.0, 31.9, 38.1, 40.0, 41.9, 43.8], kind: "station", width: 1.4, screens: 2 },
    { z: 620.9, yRow: y + R_MID, xs: [27.4, 29.3, 31.2, 38.8, 40.7, 42.6], kind: "station", width: 1.4, screens: 2 },
    { z: 627.2, yRow: y, xs: [28.0, 31.0, 39.0, 42.0], kind: "wide", width: 2.5, screens: 3 },
  ];
  let seed = 100;
  for (const row of rows) {
    for (const x of row.xs) {
      impConsole(kit, ctx, [x, row.yRow, row.z], Math.PI, { kind: row.kind, width: row.width, screens: row.screens, seed: seed++, light: false });
      chair(kit, [x, row.yRow, row.z - 0.72], Math.PI);
    }
  }

  // ---- aft display wall: giant central display, 3x3 arrays either side, patch-bay plinth --------------
  {
    const w = walls.south;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    const uc = w.u(cx);
    wallScreen(frame, uc, 2.9, 11.0, 3.7, 1, { leds: true });
    screenArray(frame, uc - 8.6, 2.95, 3, 3, 1.4, 0.9, { seed: 21, variants: [0, 2, 2, 1], leds: true });
    screenArray(frame, uc + 8.6, 2.95, 3, 3, 1.4, 0.9, { seed: 23, variants: [2, 0, 1, 2], leds: true });
    // patch-bay plinth under the main display: dense indicator grids behind a steel top
    frame.box("impPaintedMetal", uc, 0.5, 0.3, 11.4, 0.6, 0.6, { color: IMP.consoleDark, texel: 1 });
    frame.box("impMetal", uc, 0.81, 0.3, 11.5, 0.03, 0.64, { color: IMP.steel });
    for (let i = 0; i < 5; i++) frame.box("blinkDense", uc - 4.6 + i * 2.3, 0.5, 0.605, 1.8, 0.34, 0.008, { uv: "keep" });
    placard(frame, uc - 6.3, 0.9, 0.5, 6);
    placard(frame, uc + 6.3, 0.9, 0.5, 9);
    frame.quad("impDecal", uc - 3.2, 5.0, 0.062, 0.5, 0.5, { uvRect: impDecalRect(11) });
    frame.quad("impDecal", uc + 3.2, 5.0, 0.062, 0.5, 0.5, { uvRect: impDecalRect(11) });
    kit.collider([x0 + t, y, z1 - t - 0.62], [x1 - t, y + 0.85, z1 - t], "plinth");
    // cool blue wash off the display
    pointLightDesc(ctx, 0x5a8cff, 2.4, 10, [cx - 5, y + 3.3, z1 - 1.6], 1);
    pointLightDesc(ctx, 0x5a8cff, 2.4, 10, [cx + 5, y + 3.3, z1 - 1.6], 1);
  }

  // ---- vestibule: instanced signal-analysis racks on three walls, cable trays overhead -------------------
  {
    const zN = z0 + t + 0.56; // rack centres 0.1 m off the north wall
    const xW = x0 + t + 0.56;
    const xE = x1 - t - 0.56;
    rackRows(kit, ctx, y, [
      { from: [24.0, zN], to: [31.0, zN], count: 7, yaw: 0 },
      { from: [39.0, zN], to: [46.0, zN], count: 7, yaw: 0 },
      { from: [xW, 606.2], to: [xW, 610.2], count: 5, yaw: Math.PI / 2 },
      { from: [xE, 606.2], to: [xE, 610.2], count: 5, yaw: -Math.PI / 2 },
    ]);
    // trays: one along the north racks, two down the aisle sides to the rows, two feeders from the side racks
    const yT = yc - 0.64;
    cableTray(kit, [23.4, 605.6], [46.6, 605.6], yT, { w: 0.6, cables: 5, seed: 11, hang: yc });
    cableTray(kit, [cx - aisle / 2 - 0.5, 605.6], [cx - aisle / 2 - 0.5, 626.2], yT, { w: 0.5, cables: 4, seed: 13, hang: yc });
    cableTray(kit, [cx + aisle / 2 + 0.5, 605.6], [cx + aisle / 2 + 0.5, 626.2], yT, { w: 0.5, cables: 4, seed: 15, hang: yc });
    cableTray(kit, [x0 + 1.0, 608.2], [cx - aisle / 2 - 0.8, 608.2], yT + 0.12, { w: 0.4, cables: 3, seed: 17 });
    cableTray(kit, [cx + aisle / 2 + 0.8, 608.2], [x1 - 1.0, 608.2], yT + 0.12, { w: 0.4, cables: 3, seed: 19 });
    // north wall over the racks: status arrays, placards, amber beacons flanking the door
    const w = walls.north;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    screenArray(frame, w.u(27.5), 3.6, 3, 1, 1.5, 0.8, { seed: 31, variants: [1, 2, 0] });
    screenArray(frame, w.u(42.5), 3.6, 3, 1, 1.5, 0.8, { seed: 33, variants: [2, 1, 0] });
    placard(frame, w.u(31.8), 3.6, 0.5, 0);
    placard(frame, w.u(38.2), 3.6, 0.5, 15);
    alertBeacon(frame, ctx, w.u(cx - 2.7), 4.2, { intensity: 0 }); // passive lenses: their slots go to the rack keys
    alertBeacon(frame, ctx, w.u(cx + 2.7), 4.2, { intensity: 0 });
    floorDecal(kit, cx - 2.6, y, z0 + 2.6, 1.0, 13);
    floorDecal(kit, cx + 2.6, y, z0 + 2.6, 1.0, 11, Math.PI);
    // vestibule trough with a key over each rack row (one light in the middle reached neither row once the
    // light bands stopped carrying the walls)
    ceilingLight(kit, ctx, [cx, yc, 607.8], 14, "x", { intensity: 0 });
    pointLightDesc(ctx, 0xdfe8ff, 2.8, 9, [27.5, yc - 0.6, 607.2], 1);
    pointLightDesc(ctx, 0xdfe8ff, 2.8, 9, [42.5, yc - 0.6, 607.2], 1);
  }

  // ---- west wall: sensor readouts over the rows; holo-comm alcove in the SW corner -----------------------
  {
    const w = walls.west;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    screenArray(frame, w.u(614.5), 3.1, 2, 2, 1.3, 0.85, { seed: 41, variants: [0, 1, 2] });
    wallScreen(frame, w.u(621), 3.1, 2.2, 1.2, 2);
    placard(frame, w.u(618), 3.3, 0.5, 3);
    alertBeacon(frame, ctx, w.u(624.5), 3.9, { intensity: 0 });
    // alcove: two columns and a lit header frame the corner recess
    const ax = 27.6;
    column(kit, ax, 628.5, y, yc, { w: 0.5, d: 0.5 });
    column(kit, ax, z1 - t - 0.3, y, yc, { w: 0.5, d: 0.5 });
    kit.box("impPaintedMetal", ax, y + 3.75, (628.5 + z1 - t - 0.3) / 2, 0.5, 0.45, z1 - t - 0.3 - 628.5, { color: IMP.trim, texel: 1 });
    kit.box("emitBlue", ax + 0.26, y + 3.55, (628.5 + z1 - t - 0.3) / 2, 0.01, 0.03, z1 - t - 1.2 - 628.5);
    // projector pad, its cone of light and a hooded holo figure; the comm officer's console faces it
    const px = 24.5;
    const pz = 631.1;
    kit.cyl("impPaintedMetal", px, y + 0.09, pz, 0.85, 0.18, "y", { color: IMP.consoleDark, segments: 28, texel: 1 });
    kit.cyl("darkGloss", px, y + 0.185, pz, 0.62, 0.02, "y", { segments: 28 });
    kit.add("emitBlue", new THREE.TorusGeometry(0.72, 0.02, 8, 40), { pos: [px, y + 0.19, pz], rot: [Math.PI / 2, 0, 0] });
    kit.add("blink", new THREE.CylinderGeometry(0.851, 0.851, 0.1, 28, 1, true), { pos: [px, y + 0.09, pz], uv: "scale", uvScale: [4, 1] });
    kit.collider([px - 0.85, y, pz - 0.85], [px + 0.85, y + 0.2, pz + 0.85], "holoPad");
    const figure = new THREE.Group();
    figure.position.set(px, y + 0.2, pz);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.62, 2.6, 28, 1, true), mats.beam);
    cone.position.y = 1.3;
    cone.rotation.x = Math.PI;
    figure.add(cone);
    const robe = new THREE.ConeGeometry(0.42, 1.55, 14, 1, true);
    robe.translate(0, 0.775, 0);
    const shoulders = new THREE.SphereGeometry(0.3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    shoulders.scale(1.1, 0.7, 0.9);
    shoulders.translate(0, 1.55, 0);
    const hood = new THREE.SphereGeometry(0.19, 12, 10);
    hood.scale(1, 1.25, 1.1);
    hood.translate(0, 1.86, 0.02);
    const arm = new THREE.CylinderGeometry(0.06, 0.09, 0.7, 8);
    arm.rotateZ(0.5);
    arm.translate(-0.3, 1.2, 0.12);
    const body = new THREE.Mesh(mergeGeometries([robe, shoulders, hood, arm], false), mats.holoWire);
    body.rotation.y = Math.PI / 2; // faces the room (+X)
    figure.add(body);
    ctx.add(figure);
    ctx.animate((dt, tm) => {
      body.rotation.y = Math.PI / 2 + Math.sin(tm * 0.35) * 0.12;
      body.position.y = 0.02 * Math.sin(tm * 1.7);
      // transmission flicker: brief dropouts on top of a slow breathe
      const flick = Math.sin(tm * 23.0) * Math.sin(tm * 7.3) > 0.88 ? 0.25 : 1.0;
      body.material.opacity = (0.5 + 0.08 * Math.sin(tm * 2.1)) * flick;
      cone.material.opacity = 0.1 + 0.03 * Math.sin(tm * 2.1);
    });
    pointLightDesc(ctx, IMP.holo, 1.6, 6, [px, y + 1.6, pz], 0);
    impConsole(kit, ctx, [26.55, y, pz], Math.PI / 2, { kind: "station", width: 1.4, screens: 2, seed: 71, light: false });
    chair(kit, [27.3, y, pz], Math.PI / 2);
    // signal-analysis display: a 2 m screen on a plate carried 0.32 m off the wall by four bracket arms
    // (bolt plates on the wall), its feed conduit clamped up the wall into the ceiling. It sits north of
    // the projector so it never shares a silhouette with the cone.
    {
      const du = w.u(629.2);
      const dv = 2.8;
      const N = 0.32;
      for (const [au, av] of [[-0.75, -0.5], [0.75, -0.5], [-0.75, 0.5], [0.75, 0.5]]) {
        frame.box("impMetal", du + au, dv + av, 0.012, 0.3, 0.3, 0.024, { color: IMP.steel });
        frame.box("impPaintedMetal", du + au, dv + av, N / 2, 0.16, 0.2, N, { color: IMP.trim, texel: 1 });
      }
      frame.box("impPaintedMetal", du, dv, N + 0.05, 2.36, 1.56, 0.1, { color: IMP.trim, texel: 1 });
      frame.box("impPaintedMetal", du, dv, N + 0.13, 2.16, 1.36, 0.06, { color: IMP.consoleDark, texel: 1 });
      frame.box("darkGloss", du, dv, N + 0.163, 2.06, 1.26, 0.01);
      frame.box("screen1", du, dv, N + 0.17, 2.0, 1.2, 0.004, { uv: "keep" });
      frame.box("leds", du, dv - 0.78, N + 0.11, 1.2, 0.05, 0.01, { uv: "keep" });
      frame.quad("impDecal", du - 0.9, dv - 0.78, N + 0.11, 0.14, 0.14, { uvRect: impDecalRect(11) });
      const c0 = frame.pos(du, dv + 0.78, N + 0.02);
      const c1 = frame.pos(du, dv + 1.1, 0.12);
      const c2 = frame.pos(du, h - 0.3, 0.12);
      pipeRun(kit, [[c0.x, c0.y, c0.z], [c1.x, c1.y, c1.z], [c2.x, c2.y, c2.z]], 0.045, { color: IMP.gunmetal, clampPitch: 0.7 });
      for (const s of [-1, 1]) {
        const a = frame.pos(du + s * 1.0, dv + 0.72, N + 0.04);
        const b = frame.pos(du + s * 1.0, dv + 1.3, 0.03);
        pipeRun(kit, [[a.x, a.y, a.z], [b.x, b.y, b.z]], 0.025, { color: IMP.steel, clamps: false });
      }
    }
    placard(frame, w.u(pz) - 1.6, 2.9, 0.5, 6);
    frame.quad("impDecal", w.u(pz) + 0.2, 2.9, 0.062, 0.5, 0.5, { uvRect: impDecalRect(11) });
  }

  // ---- east wall: readouts, antenna-control station with a tracking sensor dish in the SE corner ------------
  {
    const w = walls.east;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    screenArray(frame, w.u(614.5), 3.1, 2, 2, 1.3, 0.85, { seed: 51, variants: [2, 1, 0] });
    wallScreen(frame, w.u(621), 3.1, 2.2, 1.2, 0);
    placard(frame, w.u(618), 3.3, 0.5, 15);
    alertBeacon(frame, ctx, w.u(624.5), 3.9, { intensity: 0.8, distance: 5 });
    // antenna control: tall wall console with a status array over it, placard and dish pedestal beside it
    const px = x1 - t - 0.62;
    impConsole(kit, ctx, [px, y, 631.4], -Math.PI / 2, { kind: "wall", width: 2.6, seed: 81, light: false });
    screenArray(frame, w.u(631.4), 3.45, 4, 1, 1.0, 0.6, { seed: 83, variants: [1, 0, 2] });
    placard(frame, w.u(629.0), 4.2, 0.6, 14);
    impConsole(kit, ctx, [px, y, 626.8], -Math.PI / 2, { kind: "wall", width: 1.6, seed: 85, light: false });
    // sensor dish: hangs from a wall bracket above head height in the bay between the two stations (bolt
    // plate, arm, knee brace, azimuth yoke), so it never stands in front of a screen; dish + feed horn
    // rotate slowly (one dynamic mesh)
    const dz = 629.0;
    const ARM = 1.5;
    const dx = px + 0.62 - ARM; // arm tip, 1.5 m off the wall face
    const ay = y + 3.6;
    kit.box("impPaintedMetal", px + 0.62 - 0.04, ay, dz, 0.08, 0.36, 0.5, { color: IMP.trim, texel: 1 });
    kit.box("impPaintedMetal", px + 0.62 - ARM / 2, ay, dz, ARM, 0.18, 0.18, { color: IMP.trim, texel: 1 });
    pipeRun(kit, [[dx + 0.1, ay - 0.1, dz], [px + 0.6, ay - 0.75, dz]], 0.03, { color: IMP.gunmetal, clamps: false });
    kit.cyl("impPaintedMetal", dx, ay - 0.09 - 0.05, dz, 0.14, 0.1, "y", { color: IMP.consoleDark, segments: 14, texel: 1 });
    kit.cyl("impMetal", dx, y + 3.1, dz, 0.05, 0.8, "y", { color: IMP.gunmetal, segments: 10 });
    kit.box("blinkSparse", dx + 0.45, ay, dz - 0.093, 0.5, 0.06, 0.006, { uv: "keep" });
    const dishGeo = (() => {
      // parabolic reflector (lathe, mouth toward +Y = the dish axis) with a rim ring, drive housing
      // behind it, feed horn on three struts in front
      const prof = [];
      for (let i = 0; i <= 8; i++) {
        const rr = 0.04 + (i / 8) * 0.6;
        prof.push(new THREE.Vector2(rr, rr * rr * 0.62));
      }
      const dish = new THREE.LatheGeometry(prof, 24).toNonIndexed();
      const inner = dish.clone();
      inner.scale(-1, 1, 1); // mirrored copy = reversed winding, so the concave face renders too (single-sided material)
      const rim = new THREE.TorusGeometry(0.64, 0.022, 6, 24);
      rim.rotateX(Math.PI / 2);
      rim.translate(0, 0.64 * 0.64 * 0.62, 0);
      const back = new THREE.CylinderGeometry(0.26, 0.14, 0.22, 12);
      back.translate(0, -0.1, 0);
      const horn = new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6);
      horn.translate(0, 0.25, 0);
      const feed = new THREE.ConeGeometry(0.06, 0.1, 8);
      feed.rotateX(Math.PI);
      feed.translate(0, 0.53, 0);
      const parts = [dish, inner, rim.toNonIndexed(), back.toNonIndexed(), horn.toNonIndexed(), feed.toNonIndexed()];
      for (let i = 0; i < 3; i++) {
        // rim (r 0.6, y 0.22) -> feed (r 0, y 0.5)
        const strut = new THREE.CylinderGeometry(0.008, 0.008, 0.66, 4);
        strut.rotateX(-1.13);
        strut.translate(0, 0.36, 0.3);
        strut.rotateY((i / 3) * Math.PI * 2);
        parts.push(strut.toNonIndexed());
      }
      const g = mergeGeometries(parts, false);
      g.rotateX(-Math.PI / 2 + 0.55); // axis tilted 31 degrees above the horizon; yaw animates
      g.computeVertexNormals();
      setVertexColor(g, IMP.wallLight);
      return g;
    })();
    // painted, not bare metal: a metal dish only mirrors the dim room environment and hangs as a dark blob
    const dish = new THREE.Mesh(dishGeo, mats.impPaintedMetal);
    dish.position.set(dx, y + 2.7, dz);
    ctx.add(dish);
    ctx.animate((dt, tm) => {
      dish.rotation.y = tm * 0.25;
    });
    kit.cyl("impPaintedMetal", dx, y + 2.76, dz, 0.09, 0.14, "y", { color: IMP.consoleDark, segments: 10, texel: 1 });
  }

  // ---- ceiling: troughs over each row (two halves each, own light), beams over the tier edges, conduits -----
  {
    const half = (x1 - x0) / 2 - 3.2; // 9.8 m troughs either side of the aisle
    for (const z of [614.6, 620.9, 627.2]) {
      for (const s of [-1, 1]) {
        const tx = cx + s * (aisle / 2 + 0.4 + half / 2);
        ceilingLight(kit, ctx, [tx, yc, z - 0.9], half, "x", { intensity: 2.1, distance: 9, priority: 1, w: 0.34 });
      }
    }
    for (const bz of [Z_REAR[0] - 0.3, Z_MID[1] + 0.3]) {
      kit.box("impPaintedMetal", cx, yc - 0.26, bz, x1 - x0 - 0.6, 0.52, 0.46, { color: IMP.trim, texel: 1 });
      pipeRun(kit, [[x0 + 0.5, yc - 0.6, bz + 0.5], [x1 - 0.5, yc - 0.6, bz + 0.5]], 0.08, { color: IMP.gunmetal, clampPitch: 3 });
      pipeRun(kit, [[x0 + 0.5, yc - 0.6, bz + 0.75], [x1 - 0.5, yc - 0.6, bz + 0.75]], 0.045, { color: IMP.steel, clamps: false });
    }
    // projector/antenna feed drops over the two corner stations
    pipeRun(kit, [[24.5, yc - 0.1, 631.1], [24.5, yc - 1.4, 631.1], [26.6, yc - 1.4, 631.1]], 0.06, { color: IMP.gunmetal, clamps: false });
    kit.cyl("impPaintedMetal", 24.5, yc - 1.45, 631.1, 0.3, 0.14, "y", { color: IMP.consoleDark, segments: 16, texel: 1 });
    kit.cyl("emitBlue", 24.5, yc - 1.53, 631.1, 0.16, 0.02, "y", { segments: 16 });
  }

  // ---- camera views -------------------------------------------------------------------------------------------
  const eye = y + STD.eye;
  ctx.view("comms", cx, eye, z0 + 2.4, 180, -4);
  ctx.view("comms_wall", cx - 1.2, eye, Z_MID[0] + 1.6, 172, -5);
  ctx.view("comms_racks", cx - 1.2, eye, 607.6, 92, -4);
  ctx.view("comms_holocomm", 30.2, eye, 629.6, 112, -4);
  ctx.view("comms_antenna", 43.0, eye, 626.4, -128, 8);
}
