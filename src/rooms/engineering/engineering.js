// Engineering Control — the reactor's control room. An arc of console stations faces the aft wall, which
// carries a wide window into the reactor chamber (z 300, x −8..8, y 1..4.5 above the floor) with the blast
// door to the airlock passage in the middle. A raised chief engineer's station sits behind the arc, computer
// banks line the side walls, system-status displays flank the entrance and cable trenches run under grating.
import { consoleStation, chair, computerBank, railing, stairs, pillar } from "../../core/props.js";
import { SYSTEMS } from "../../core/systems.js";
import { windowWall, windowSurround, wallU, frameScreen, cableTrench, strip, ledCluster, terminalKiosk, floorLine, workLight } from "./machinery.js";
import { DECAL } from "../../textures.js";

export const meta = { id: "engineering", stream: "deck-rooms" };

export const WINDOW = { c0: -8, c1: 8, v0: 1.0, v1: 4.5 };

export function build(ctx) {
  const { kit, IMP } = ctx;
  const F = ctx.floor;
  const { x0, x1, z0, z1 } = ctx.inner;
  const cx = 0;

  // ---- shell: black gloss deck, standard walls except the aft (window) wall
  ctx.shell({ floorMat: "deckBlack", floorColor: IMP.plateLight, walls: { zmax: false, xmin: { pilasterEvery: 7.3 }, xmax: { pilasterEvery: 7.3 } }, stripSpacing: 4.4, seed: 21 });

  // ---- aft wall with the reactor window (door opening comes from the layout)
  const aft = windowWall(ctx, "zmax", [WINDOW], { seed: 33, panelGridOpts: { pilasterEvery: 0 } });
  const wu0 = wallU(ctx, "zmax", WINDOW.c1);
  const wu1 = wallU(ctx, "zmax", WINDOW.c0);
  const door = aft.openings.find((o) => o.type === "door");
  // heavy surround: head + jambs full width, sill split around the door
  aft.frame.box("paintedMetal", (wu0 + wu1) / 2, WINDOW.v1 + 0.14, 0.06, wu1 - wu0 + 0.7, 0.28, 0.12, { color: IMP.black, texel: 1 });
  for (const [a, b] of [[wu0, door.u0], [door.u1, wu1]]) {
    aft.frame.box("paintedMetal", (a + b) / 2, WINDOW.v0 - 0.14, 0.06, b - a + (a === wu0 ? 0.35 : 0) + (b === wu1 ? 0.35 : 0), 0.28, 0.12, { color: IMP.black, texel: 1 });
    aft.frame.box("hazard", (a + b) / 2, WINDOW.v0 - 0.31, 0.06, b - a, 0.06, 0.13, { texel: 2 });
    // sill-level cyan status strip under each pane
    aft.frame.box("emitCyan", (a + b) / 2, WINDOW.v0 - 0.02, 0.02, b - a - 0.4, 0.03, 0.02, { uv: "keep" });
  }
  for (const u of [wu0 - 0.14, wu1 + 0.14]) aft.frame.box("paintedMetal", u, (WINDOW.v0 + WINDOW.v1) / 2, 0.06, 0.28, WINDOW.v1 - WINDOW.v0 + 0.55, 0.12, { color: IMP.black, texel: 1 });
  // reactor warning stencils beside the door
  aft.frame.decal(door.u0 - 1.2, 2.2, 0.01, 0.9, 0.9, DECAL.WARNING);
  aft.frame.decal(door.u1 + 1.2, 2.2, 0.01, 0.9, 0.9, DECAL.RESTRICTED);
  void windowSurround;

  // ---- console arc facing the window (focal point behind the glass)
  const focal = [0, 303];
  const R = 9.5;
  const angles = [-0.62, -0.31, 0, 0.31, 0.62];
  angles.forEach((th, i) => {
    const x = focal[0] + Math.sin(th) * R;
    const z = focal[1] - Math.cos(th) * R;
    const yaw = Math.PI - th;
    consoleStation(kit, { pos: [x, F, z], yaw, w: 1.9, d: 0.85, h: 1.0, screens: 2, accent: "emitCyan", seed: 40 + i, screenSet: [[9, 6], [2, 3], [6, 9], [3, 11], [9, 2]][i] });
    const cz = 0.8;
    chair(kit, { pos: [x + Math.sin(yaw) * cz, F, z + Math.cos(yaw) * cz], yaw });
  });
  // floor lines marking the operator zone
  floorLine(kit, [-8, 291.2], [8, 291.2], F, { color: IMP.hazardYellow, w: 0.1 });
  floorLine(kit, [-8, 291.2], [-10.5, 296.5], F, { color: IMP.hazardYellow, w: 0.1 });
  floorLine(kit, [8, 291.2], [10.5, 296.5], F, { color: IMP.hazardYellow, w: 0.1 });

  // ---- chief engineer's raised station (0.5 m dais with steps on the entrance side)
  {
    const dz0 = 282.6,
      dz1 = 286.4,
      dx = 2.8;
    kit.boxMM("paintedMetal", [cx - dx - 0.1, F, dz0 - 0.1], [cx + dx + 0.1, F + 0.5, dz1 + 0.1], { color: IMP.black, texel: 1 });
    kit.boxMM("deckGrey", [cx - dx, F + 0.47, dz0], [cx + dx, F + 0.52, dz1], { color: IMP.plateDark, texel: 0.5 });
    kit.collider([cx - dx, F, dz0], [cx + dx, F + 0.52, dz1], "dais");
    strip(kit, [cx - dx + 0.2, F + 0.3, dz1 + 0.1], [cx + dx - 0.2, F + 0.34, dz1 + 0.12], "emitCyan");
    strip(kit, [cx - dx - 0.12, F + 0.3, dz0 + 0.2], [cx - dx - 0.1, F + 0.34, dz1 - 0.2], "emitCyan");
    strip(kit, [cx + dx + 0.1, F + 0.3, dz0 + 0.2], [cx + dx + 0.12, F + 0.34, dz1 - 0.2], "emitCyan");
    consoleStation(kit, { pos: [cx, F + 0.52, dz1 - 0.55], yaw: Math.PI, w: 2.6, d: 0.9, h: 1.05, screens: 3, accent: "emitCyan", seed: 77, screenSet: [1, 9, 6] });
    chair(kit, { pos: [cx, F + 0.52, dz1 - 1.4], yaw: Math.PI });
    railing(kit, { from: [cx + dx, dz0], to: [cx + dx, dz1], y: F + 0.52 });
    railing(kit, { from: [cx - dx, dz1], to: [cx - dx, dz0], y: F + 0.52 });
    railing(kit, { from: [cx - dx, dz1], to: [cx - 1.7, dz1], y: F + 0.52 });
    railing(kit, { from: [cx + 1.7, dz1], to: [cx + dx, dz1], y: F + 0.52 });
    stairs(kit, { pos: [cx, F, dz0 - 0.9], yaw: Math.PI, width: 3.0, rise: 0.5, stepH: 0.17, rails: false });
    // side pedestal displays
    ledCluster(kit, { pos: [cx - dx + 0.3, F + 1.2, dz0 + 0.5], yaw: Math.PI / 2, w: 0.5, h: 0.2, index: 6, accent: "emitCyan" });
  }

  // ---- computer banks along the side walls
  for (let i = 0; i < 5; i++) {
    const z = 275.5 + i * 4.4;
    computerBank(kit, { pos: [x0 + 0.64, F, z], yaw: Math.PI / 2, w: 3.2, h: 2.5, d: 0.6, seed: 300 + i, accent: "emitCyan" });
    computerBank(kit, { pos: [x1 - 0.64, F, z], yaw: -Math.PI / 2, w: 3.2, h: 2.5, d: 0.6, seed: 400 + i, accent: "emitCyan" });
  }
  // bank labels + two standing kiosks near the window end
  terminalKiosk(kit, { pos: [x0 + 2.2, F, 297.2], yaw: Math.PI * 0.75, accent: "emitCyan", index: 9 });
  terminalKiosk(kit, { pos: [x1 - 2.2, F, 297.2], yaw: -Math.PI * 0.75, accent: "emitCyan", index: 6 });

  // ---- system-status wall displays flanking the entrance (zmin wall)
  {
    const { frame } = ctx.wall("zmin");
    frameScreen(frame, wallU(ctx, "zmin", -11), 2.9, 6.0, 2.4, 6, { accent: "emitCyan" });
    frameScreen(frame, wallU(ctx, "zmin", 11), 2.9, 6.0, 2.4, 9, { accent: "emitCyan" });
    frame.decal(wallU(ctx, "zmin", 0), 4.6, 0.01, 1.2, 1.2, DECAL.EMBLEM);
    frame.box("emitCyan", wallU(ctx, "zmin", -11), 1.45, 0.05, 5.6, 0.04, 0.02, { uv: "keep" });
    frame.box("emitCyan", wallU(ctx, "zmin", 11), 1.45, 0.05, 5.6, 0.04, 0.02, { uv: "keep" });
  }

  // ---- floor cable trenches: a header run behind the arc and feeders to the side-wall banks
  cableTrench(kit, [-15.5, 296.6], [15.5, 297.3], F, { cables: 4 });
  cableTrench(kit, [x0 + 1.4, 274.5], [x0 + 2.1, 297.3], F, { cables: 3 });
  cableTrench(kit, [x1 - 2.1, 274.5], [x1 - 1.4, 297.3], F, { cables: 3 });
  for (const th of angles) {
    const x = focal[0] + Math.sin(th) * R;
    const z = focal[1] - Math.cos(th) * R;
    cableTrench(kit, [x - 0.25, z + 0.3], [x + 0.25, 296.6], F, { cables: 2, grate: true });
  }

  // ---- structure: two pillars framing the arc, cyan strip on the ceiling edge
  pillar(kit, { pos: [-13.5, F, 289], h: ctx.h, w: 0.7 });
  pillar(kit, { pos: [13.5, F, 289], h: ctx.h, w: 0.7 });
  strip(kit, [x0 + 0.3, ctx.ceil - 0.25, z0 + 0.3], [x0 + 0.34, ctx.ceil - 0.21, z1 - 0.3], "emitCyan");
  strip(kit, [x1 - 0.34, ctx.ceil - 0.25, z0 + 0.3], [x1 - 0.3, ctx.ceil - 0.21, z1 - 0.3], "emitCyan");

  // ---- lights: cool fill + cyan accents over the arc
  workLight(ctx, [-9.5, ctx.ceil, 277], { drop: 0.5, size: 1.2, intensity: 120, distance: 28 });
  workLight(ctx, [9.5, ctx.ceil, 277], { drop: 0.5, size: 1.2, intensity: 120, distance: 28 });
  workLight(ctx, [-9.5, ctx.ceil, 289], { drop: 0.5, size: 1.2, intensity: 120, distance: 28 });
  workLight(ctx, [9.5, ctx.ceil, 289], { drop: 0.5, size: 1.2, intensity: 120, distance: 28 });
  ctx.light(0x9fe4ff, 50, 18, [0, ctx.ceil - 1.2, 295]);
  ctx.light(0xe8f0ff, 70, 20, [0, ctx.ceil - 0.8, 283]);

  // The reactor is only rendered while a door to it is open; keep the airlock blast door parked open so the
  // window shows the chamber (interim until the layout carries a 'glass' door record for the window).
  if (SYSTEMS.doors) SYSTEMS.doors.setForceOpen("eng_ctrl_reactor", true);
}
