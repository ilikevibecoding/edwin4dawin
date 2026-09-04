// Security & Detention Block — hard red accent. A security control hall inside the secure door: a scanner
// arch, two raised guard platforms with consoles angled at the entry, a partition carrying thirty-six
// surveillance monitors either side of the heavy corridor gate, guard lockers, binders and a weapons rack to
// port, a caged holding pen and an ID-scanner processing post to starboard. Beyond the gate a 29 m cell
// corridor under a lowered black ceiling: sixteen numbered cell doors recessed between partition walls (white
// light blades on the partition ends, red status lights, two cells stand open showing bunk and sanitary unit),
// an interrogation room under one harsh shadow spot, a raised guard post with cell-feed monitors, a ration
// cart, and a sealed maximum-security door at the dead end.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { IMP } from "../../core/palette.js";
import { wallFrame, panelGrid } from "../../core/frame.js";
import { Placer, consoleStation, chair, computerBank, wallPanel, doorFrame, crate, floorGrate, lockerRow, pipeRun } from "../../core/props.js";
import { DECAL, decalRect, screenRect, ledRect, GRATE_TILE } from "../../textures.js";

export const meta = { id: "detention", stream: "crew-rooms" };

const B = (sx, sy, sz, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z);
function C(r, len, x, y, z, axis = "y", seg = 12) {
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  if (axis === "x") g.rotateZ(Math.PI / 2);
  else if (axis === "z") g.rotateX(Math.PI / 2);
  return g.translate(x, y, z);
}
// kit.proto strips the colour attribute while the shared materials use vertex colours (instances would read
// black): give every prototype a white colour attribute so the per-instance tint multiplies correctly.
function proto(kit, name, mat, geos, opts = {}) {
  kit.proto(name, mat, Array.isArray(geos) ? mergeGeometries(geos, false) : geos, opts);
  const g = kit.protos.get(name).geo;
  g.setAttribute("color", new THREE.BufferAttribute(new Uint8Array(g.attributes.position.count * 3).fill(255), 3, true));
}

const GUN = new THREE.Color("#30343c");
const STEEL_LIGHT = new THREE.Color("#b4bac2");
const SLAB = new THREE.Color("#4a4f57");
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const PLANE = (w, h) => new THREE.PlaneGeometry(w, h);

export function build(ctx) {
  const { kit, floor: F, ceil } = ctx;
  const { x0, x1, z0, z1 } = ctx.inner; // -29.75..3.75, -219.75..-178.25
  const AX = -12.5; // entry door + corridor axis
  const rand = ctx.rand;
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const black = { color: IMP.black, texel: 1 };
  const dark = { color: IMP.plateDark, uv: "world", texel: 1 };
  const lo = (a, b) => Math.min(a, b);
  const hi = (a, b) => Math.max(a, b);

  ctx.shell({ floorMat: "deckGrey", floorColor: IMP.plateDark, stripSpacing: 5, seed: 71, ceiling: { stripMat: "emitRed" }, wallStyles: { plate: 0.74, panel: 0.1, vent: 0.08, hatch: 0.08 } });

  // ---- layout constants -----------------------------------------------------------------------------------
  const PZ = -190.0; // partition centre plane between control hall and cell corridor (0.4 thick)
  const GW = 4.0; // corridor gate opening
  const GH = 3.0;
  const gHalf = GW / 2 + 0.45 + 0.08; // wide jambs
  const CH = 3.3; // corridor ceiling height
  const CZ1 = PZ - 0.2; // corridor starts at the partition's back face
  const CELL_D = 2.5; // recess depth
  const CELL_W = 2.5;
  const PART_T = 0.5;
  const ALC_D = 5.0; // alcove depth (interrogation room / guard post)
  const DW = 1.4; // cell door width
  const DH = 2.2; // cell door height
  const JD = 0.35; // cell door set-back (jamb depth)
  // slots along the corridor: partitions and cells, an alcove in the middle of each side
  const parts = []; // [za, zb] with za > zb
  const cells = []; // { za, zb }
  let alc;
  {
    let zc = CZ1;
    const part = () => {
      parts.push([zc, zc - PART_T]);
      zc -= PART_T;
    };
    const cell = () => {
      cells.push({ za: zc, zb: zc - CELL_W });
      zc -= CELL_W;
    };
    part();
    for (let k = 0; k < 4; k++) {
      cell();
      part();
    }
    alc = { za: zc, zb: z0 + 4 * (CELL_W + PART_T) + PART_T };
    zc = alc.zb;
    part();
    for (let k = 0; k < 4; k++) {
      cell();
      part();
    }
  }
  const ZA = (alc.za + alc.zb) / 2; // alcove centre line

  // ---- prototypes: E-11 rifles for the two small racks -----------------------------------------------------
  proto(kit, "rifle", "metal", [
    C(0.02, 0.44, 0.21, 0, 0, "x", 6),
    C(0.028, 0.04, 0.44, 0, 0, "x", 6),
    B(0.3, 0.07, 0.05, -0.1, 0, 0),
    B(0.04, 0.11, 0.02, -0.12, -0.03, -0.035),
    B(0.03, 0.11, 0.028, -0.17, -0.08, 0),
    C(0.018, 0.2, -0.03, 0.075, 0, "x", 6),
    B(0.02, 0.04, 0.02, -0.1, 0.05, 0),
    B(0.02, 0.04, 0.02, 0.03, 0.05, 0),
    B(0.03, 0.02, 0.02, 0.1, 0.03, 0),
    B(0.03, 0.02, 0.02, 0.2, 0.03, 0),
    B(0.27, 0.012, 0.012, -0.385, 0.035, 0),
    B(0.27, 0.012, 0.012, -0.385, -0.025, 0),
    B(0.02, 0.09, 0.03, -0.53, 0.005, 0),
  ], { texel: 2 });
  const qUp = new THREE.Quaternion().setFromAxisAngle(Z, Math.PI / 2); // muzzle up, scope toward -X
  /** Wall rack holding three rifles; pos = floor point at the wall, yaw = facing (0 faces -Z). */
  function rifleRack(pos, yaw) {
    const P = new Placer(kit, pos, yaw);
    P.box("paintedMetal", 0, 1.05, 0.06, 1.1, 1.5, 0.1, black);
    P.box("plate", 0, 1.05, -0.01, 1.0, 1.36, 0.04, { color: IMP.plateLight, uv: "world", texel: 1 });
    P.box("paintedMetal", 0, 0.32, -0.16, 1.0, 0.05, 0.28, black);
    P.box("metal", 0, 1.35, -0.2, 1.0, 0.02, 0.02, { color: IMP.steel });
    P.box("emitRed", 0.42, 1.72, -0.05, 0.06, 0.06, 0.02);
    P.decal(-0.35, 1.72, -0.045, 0.28, 0.28, DECAL.RESTRICTED);
    const qy = new THREE.Quaternion().setFromAxisAngle(Y, yaw);
    for (let i = 0; i < 3; i++) {
      const w = P.world(-0.3 + i * 0.3, 0.88, -0.2);
      kit.place("rifle", { pos: [w.x, w.y, w.z], quat: qy.clone().multiply(qUp), color: GUN });
    }
    P.collider([-0.6, 0, -0.35], [0.6, 1.85, 0.12], "rack");
  }
  /** Ceiling security camera on a stalk; yaw = viewing direction (0 looks toward -Z), tilted down. */
  function camera(x, z, yaw, y = ceil) {
    const P = new Placer(kit, [x, y, z], yaw);
    P.cyl("metal", 0, -0.18, 0, 0.02, 0.36, "y", { color: IMP.steelDark, segments: 6 });
    P.box("paintedMetal", 0, -0.42, -0.06, 0.16, 0.13, 0.3, { ...black, rot: [-0.55, 0, 0] });
    P.cyl("darkGloss", 0, -0.5, -0.22, 0.045, 0.06, "z", { segments: 10, rot: [-0.55, 0, 0] });
    P.box("emitRed", 0.05, -0.36, -0.2, 0.02, 0.02, 0.01, { rot: [-0.55, 0, 0] });
  }
  /** Flat ceiling light fixture (housing + diffuser) marking a point-light position. */
  function fixture(x, z, len, w, along = "x", mat = "emitWhiteSoft", y = ceil) {
    const sx = along === "x" ? len : w;
    const sz = along === "x" ? w : len;
    kit.box("paintedMetal", x, y - 0.07, z, sx + 0.16, 0.14, sz + 0.16, black);
    kit.box(mat, x, y - 0.145, z, sx, 0.01, sz, { uv: "keep" });
  }
  /** Operator chair behind a console placed at `pos` with `yaw` (console operators stand at local +Z). */
  function seat(pos, yaw, back = 0.68) {
    chair(kit, { pos: [pos[0] + Math.sin(yaw) * back, pos[1], pos[2] + Math.cos(yaw) * back], yaw });
  }

  // =========================================================================================================
  // CONTROL HALL (z -189.8 .. -178.25)
  // =========================================================================================================
  const zmax = ctx.wall("zmax").frame; // u = x1 - x
  {
    zmax.decal(x1 - AX, 3.85, 0.07, 1.0, 1.0, DECAL.EMBLEM_RED);
    zmax.decal(x1 - (AX - 2.7), 3.4, 0.07, 0.75, 0.75, DECAL.RESTRICTED);
    zmax.decal(x1 - (AX + 2.7), 3.4, 0.07, 0.75, 0.75, DECAL.TEXT_B);
    wallPanel(kit, zmax, x1 - (AX - 4.6), 1.8, { w: 1.2, h: 0.7, accent: "emitRed", seed: 31 });
    // processing lane from the door to the gate: dark deck with white edge lines and red stop bands
    kit.boxMM("deckBlack", [AX - 1.5, F + 0.002, PZ + 0.45], [AX + 1.5, F + 0.012, z1 - 0.25], { color: IMP.darkMetal, texel: 0.5 });
    for (const s of [-1, 1]) kit.boxMM("emitWhiteSoft", [AX + s * 1.55 - 0.025, F + 0.004, PZ + 0.5], [AX + s * 1.55 + 0.025, F + 0.014, z1 - 0.3], { uv: "keep" });
    kit.boxMM("hazardRed", [AX - 1.5, F + 0.013, -183.1], [AX + 1.5, F + 0.019, -182.9], { texel: 3 });
    kit.boxMM("hazardRed", [AX - 1.6, F + 0.013, PZ + 0.62], [AX + 1.6, F + 0.019, PZ + 0.82], { texel: 3 });
    // scanner arch: tall thin pylons with a full-height red light bar, a scanner lintel with status screen
    const gz = -181.0;
    for (const s of [-1, 1]) {
      const px = AX + s * 2.1;
      kit.box("paintedMetal", px, F + 1.6, gz, 0.4, 3.2, 0.7, black);
      kit.box("plate", px, F + 1.6, gz, 0.34, 3.0, 0.74, dark);
      kit.box("emitRed", px - s * 0.21, F + 1.7, gz, 0.01, 2.6, 0.04, {});
      kit.box("leds", px - s * 0.21, F + 3.05, gz, 0.006, 0.05, 0.4, { uv: "keep", uvRect: ledRect(9) });
      kit.add("decal", PLANE(0.32, 0.32), { pos: [px, F + 2.55, gz + 0.375], uv: "keep", uvRect: decalRect(DECAL.WARNING) });
      kit.box("hazardRed", px, F + 0.45, gz + 0.365, 0.34, 0.1, 0.02, { texel: 3 });
      kit.collider([px - 0.2, F, gz - 0.35], [px + 0.2, F + 3.2, gz + 0.35], "arch");
    }
    kit.box("paintedMetal", AX, F + 3.4, gz, 4.6, 0.4, 0.7, black);
    kit.box("emitWhite", AX, F + 3.195, gz, 3.6, 0.01, 0.05, {});
    kit.box("screen", AX, F + 3.4, gz + 0.355, 1.3, 0.28, 0.005, { uv: "keep", uvRect: screenRect(12) });
    kit.box("leds", AX, F + 3.4, gz - 0.355, 1.6, 0.07, 0.005, { rot: [0, Math.PI, 0], uv: "keep", uvRect: ledRect(4) });
    kit.box("darkGloss", AX, F + 0.02, gz, 3.6, 0.016, 0.9, {});
    camera(AX, gz - 1.6, Math.PI); // looks back at the door
  }

  // ---- guard platforms flanking the lane: raised 0.3 m, hazard fascia, consoles angled at the entry --------
  const STEP = 0.3;
  function platform(xa, xb, za, zb, innerSide) {
    kit.boxMM("deckGrey", [xa, F, zb], [xb, F + STEP, za], { color: IMP.plateDark, texel: 0.5 });
    // fascia on the exposed faces (front toward the door, inner toward the lane)
    kit.boxMM("paintedMetal", [xa - 0.02, F, za - 0.02], [xb + 0.02, F + STEP + 0.01, za + 0.02], black);
    kit.boxMM("hazardRed", [xa - 0.02, F + STEP - 0.1, za + 0.021], [xb + 0.02, F + STEP - 0.02, za + 0.031], { texel: 3 });
    const xi = innerSide > 0 ? xb : xa;
    kit.boxMM("paintedMetal", [xi - 0.02, F, zb], [xi + 0.02, F + STEP + 0.01, za], black);
    kit.boxMM("hazardRed", [lo(xi + innerSide * 0.021, xi + innerSide * 0.031), F + STEP - 0.1, zb], [hi(xi + innerSide * 0.021, xi + innerSide * 0.031), F + STEP - 0.02, za], { texel: 3 });
    kit.boxMM("emitRed", [xa, F + STEP + 0.005, za - 0.06], [xb, F + STEP + 0.015, za - 0.02], {});
    kit.collider([xa, F, zb], [xb, F + STEP, za], "platform");
  }
  const PZA = -185.2; // platform front edge
  platform(-24.4, -15.0, PZA, PZ + 0.2, 1);
  platform(-10.0, -2.0, PZA, PZ + 0.2, -1);
  // west platform: surveillance / control — two consoles angled toward the door, chairs behind
  for (const [cx, yaw] of [[-21.6, Math.PI + 0.32], [-18.2, Math.PI + 0.18]]) {
    const pos = [cx, F + STEP, -186.9];
    consoleStation(kit, { pos, yaw, w: 2.2, d: 0.85, h: 1.0, screens: 3, accent: "emitRed", seed: 41 + Math.round(-cx), screenSet: [8, 13, 3] });
    seat(pos, yaw);
  }
  // east platform: processing — one console, effects table with evidence bins
  {
    const yaw = Math.PI - 0.25;
    const pos = [-6.6, F + STEP, -186.9];
    consoleStation(kit, { pos, yaw, w: 2.0, d: 0.85, h: 1.0, screens: 2, accent: "emitRed", seed: 47, screenSet: [13, 12] });
    seat(pos, yaw);
    const tx = -3.4;
    const tz = -187.2;
    kit.box("paintedMetal", tx, F + STEP + 0.4, tz, 1.1, 0.8, 0.8, black);
    kit.box("plate", tx, F + STEP + 0.82, tz, 1.2, 0.05, 0.9, { color: IMP.plateLight, uv: "world", texel: 1 });
    for (let i = 0; i < 3; i++) {
      const bx = tx - 0.36 + i * 0.36;
      kit.box("plate", bx, F + STEP + 0.96, tz, 0.3, 0.22, 0.42, { color: i === 1 ? IMP.plateWarm : IMP.plate, uv: "world", texel: 1 });
      kit.box("paintedMetal", bx, F + STEP + 1.075, tz, 0.26, 0.01, 0.38, { color: IMP.trim, texel: 1 });
      kit.add("decal", PLANE(0.16, 0.16), { pos: [bx, F + STEP + 0.96, tz + 0.212], uv: "keep", uvRect: decalRect(DECAL.NUMBER0 + i) });
    }
    kit.collider([tx - 0.6, F + STEP, tz - 0.45], [tx + 0.6, F + STEP + 1.1, tz + 0.45], "table");
    // ID scanner post in front of the platform with a "stand here" marking
    const sx = -6.0;
    const sz = -184.3;
    kit.cyl("plate", sx, F + 0.65, sz, 0.16, 1.3, "y", { color: IMP.plateDark, segments: 10 });
    kit.cyl("paintedMetal", sx, F + 0.04, sz, 0.3, 0.08, "y", { color: IMP.black, segments: 14 });
    kit.box("paintedMetal", sx, F + 1.45, sz + 0.02, 0.4, 0.32, 0.3, { ...black, rot: [0.35, 0, 0] });
    kit.box("screen", sx, F + 1.5, sz + 0.18, 0.32, 0.2, 0.005, { rot: [0.35, 0, 0], uv: "keep", uvRect: screenRect(12) });
    kit.box("emitRed", sx, F + 1.36, sz + 0.14, 0.3, 0.02, 0.01, { rot: [0.35, 0, 0] });
    kit.collider([sx - 0.3, F, sz - 0.3], [sx + 0.3, F + 1.7, sz + 0.3], "scanner");
    const mz = sz + 1.05;
    for (const [a, b, c, d] of [[sx - 0.45, mz - 0.45, sx + 0.45, mz - 0.39], [sx - 0.45, mz + 0.39, sx + 0.45, mz + 0.45], [sx - 0.45, mz - 0.45, sx - 0.39, mz + 0.45], [sx + 0.39, mz - 0.45, sx + 0.45, mz + 0.45]]) {
      kit.boxMM("hazardRed", [a, F + 0.003, b], [c, F + 0.009, d], { texel: 3 });
    }
    kit.add("decal", PLANE(0.5, 0.5), { pos: [sx, F + 0.012, mz], rot: [-Math.PI / 2, 0, 0], uv: "keep", uvRect: decalRect(DECAL.SPEC_PLATE) });
  }

  // ---- partition with the monitor wall and the corridor gate ---------------------------------------------
  {
    // the corridor side of this wall is never seen (the gate frame and the first cell partitions close it), so
    // only the hall face gets a panel grid
    const a = wallFrame(kit, [x0, PZ + 0.2], [x1, PZ + 0.2], F); // faces +Z (hall side)
    panelGrid(a.frame, a.length, ctx.h, { openings: [{ type: "arch", u0: AX - gHalf - x0, u1: AX + gHalf - x0, v0: 0, v1: GH + 0.62 }], seed: 81, panelW: 1.7, accent: "emitRed", tag: "det_part_a", styles: { plate: 0.8, panel: 0.1, vent: 0.1 } });
    doorFrame(kit, { pos: [AX, F, PZ], yaw: 0, w: GW, h: GH, d: 0.4, accent: "emitRed", sill: true, wide: true });
    // the heavy gate leaf, retracted into its pocket in the east jamb with 0.3 m still showing
    kit.box("plate", AX + GW / 2 - 0.15, F + (GH - 0.1) / 2, PZ, 0.3, GH - 0.1, 0.12, { color: SLAB, uv: "world", texel: 1 });
    kit.box("hazardRed", AX + GW / 2 - 0.3, F + 1.4, PZ, 0.012, 0.6, 0.126, { texel: 3 });
    kit.box("emitRed", AX + GW / 2 - 0.3, F + 2.4, PZ, 0.012, 0.05, 0.05, {});
    kit.collider([AX + GW / 2 - 0.3, F, PZ - 0.07], [AX + GW / 2, F + GH, PZ + 0.07], "gate");
    // monitor banks: 3 rows x 6 columns either side of the gate
    const zf = PZ + 0.28; // frame face
    const feeds = [0, 1, 3, 5, 8, 12, 13, 15, 7, 6];
    for (const xc of [AX - 7.4, AX + 7.4]) {
      const w = 9.0;
      const rows = 3;
      const cols = 6;
      const h = rows * 0.9 + 0.2;
      kit.box("paintedMetal", xc, F + 1.3 + h / 2, zf - 0.04, w, h, 0.08, black);
      const cw = (w - 0.2) / cols;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = xc - w / 2 + 0.1 + cw * (c + 0.5);
          const y = F + 1.3 + 0.1 + 0.9 * (r + 0.5);
          kit.box("darkGloss", x, y, zf + 0.01, cw - 0.1, 0.8, 0.02, {});
          kit.box("screen", x, y + 0.03, zf + 0.025, cw - 0.22, 0.62, 0.005, { uv: "keep", uvRect: screenRect(pick(feeds)) });
          kit.box(rand() < 0.85 ? "emitRed" : "emitGreen", x - cw / 2 + 0.16, y - 0.34, zf + 0.025, 0.05, 0.03, 0.005, {});
          kit.box("leds", x + 0.2, y - 0.34, zf + 0.025, cw - 0.7, 0.04, 0.005, { uv: "keep", uvRect: ledRect(Math.floor(rand() * 16)) });
        }
      }
      kit.box("leds", xc, F + 1.22, zf + 0.005, w - 0.8, 0.06, 0.005, { uv: "keep", uvRect: ledRect(1) });
      kit.collider([xc - w / 2, F, PZ + 0.2], [xc + w / 2, F + 1.3 + h, zf + 0.03], "monitors");
    }
    // block status display above the gate + stencils
    kit.box("paintedMetal", AX, F + 4.05, zf - 0.02, 5.4, 0.62, 0.06, black);
    kit.box("screen", AX, F + 4.05, zf + 0.012, 4.6, 0.42, 0.005, { uv: "keep", uvRect: screenRect(3) });
    kit.box("emitRed", AX, F + 4.4, zf + 0.012, 5.2, 0.03, 0.005, {});
    a.frame.decal(AX - 3.3 - x0, 0.85, 0.06, 0.6, 0.6, DECAL.RESTRICTED);
    a.frame.decal(AX + 3.3 - x0, 0.85, 0.06, 0.6, 0.6, DECAL.RESTRICTED);
    camera(AX - 3.2, PZ + 1.4, Math.PI - 0.4); // watch the hall from above the banks
    camera(AX + 3.2, PZ + 1.4, Math.PI + 0.4);
  }

  // ---- port wing: guard lockers, bench, binders, weapons rack, roster board -------------------------------
  {
    const xmin = ctx.wall("xmin").frame; // u = z1 - z
    lockerRow(kit, xmin, 2.4, 6, { lw: 0.6, h: 2.0, d: 0.5, color: IMP.plateDark }); // z -180.65..-184.25
    xmin.decal(4.2, 2.55, 0.06, 0.6, 0.6, DECAL.TEXT_A);
    xmin.decal(1.5, 2.8, 0.06, 0.7, 0.7, DECAL.EMBLEM);
    // bench in front of the lockers
    kit.boxMM("paintedMetal", [x0 + 1.5, F + 0.4, -184.2], [x0 + 1.9, F + 0.45, -180.8], black);
    for (const bz of [-184.0, -182.5, -181.0]) kit.box("paintedMetal", x0 + 1.7, F + 0.2, bz, 0.3, 0.4, 0.1, { color: IMP.trim, texel: 1 });
    kit.collider([x0 + 1.45, F, -184.25], [x0 + 1.95, F + 0.5, -180.75], "bench");
    // binder (stun-cuff) board
    xmin.box("paintedMetal", 7.0, 1.5, 0.03, 0.9, 0.7, 0.06, black);
    for (let i = 0; i < 4; i++) {
      for (const dv of [-0.16, 0.16]) xmin.cylN("metal", 6.7 + i * 0.2, 1.5 + dv, 0.08, 0.06, 0.03, { color: IMP.steel, segments: 10, open: true });
      xmin.box("metal", 6.7 + i * 0.2, 1.5, 0.08, 0.04, 0.1, 0.03, { color: IMP.steelDark });
    }
    xmin.box("leds", 7.0, 1.12, 0.065, 0.6, 0.05, 0.005, { uv: "keep", uvRect: ledRect(13) });
    rifleRack([x0 + 0.12, F, -186.9], -Math.PI / 2); // faces +X into the hall
    // roster board: manifest + status, red framed
    xmin.box("paintedMetal", 10.2, 2.1, 0.03, 2.3, 1.3, 0.06, black);
    xmin.box("screen", 9.6, 2.15, 0.065, 1.0, 1.0, 0.005, { uv: "keep", uvRect: screenRect(13) });
    xmin.box("screen", 10.75, 2.35, 0.065, 1.0, 0.55, 0.005, { uv: "keep", uvRect: screenRect(3) });
    xmin.box("screen", 10.75, 1.8, 0.065, 1.0, 0.42, 0.005, { uv: "keep", uvRect: screenRect(5) });
    xmin.box("emitRed", 10.2, 2.78, 0.065, 2.2, 0.03, 0.005);
    // crates of confiscated goods against the entry wall corner
    crate(kit, { pos: [x0 + 1.4, F, z1 - 1.0], yaw: 0.1, size: [1.2, 0.8, 1.1], band: true, decal: DECAL.TEXT_C, color: IMP.plateDark });
    crate(kit, { pos: [x0 + 1.4, F + 0.8, z1 - 1.0], yaw: -0.2, size: [0.9, 0.6, 0.9], band: false, decal: DECAL.RESTRICTED, color: IMP.plateWarm });
    pipeRun(kit, { points: [[x0 + 0.45, ceil - 0.35, z1 - 0.6], [x0 + 0.45, ceil - 0.35, PZ + 0.6]], r: 0.08, clamps: 2.6, color: IMP.steelDark });
    pipeRun(kit, { points: [[x0 + 0.7, ceil - 0.5, z1 - 0.6], [x0 + 0.7, ceil - 0.5, PZ + 0.6]], r: 0.05, clamps: 2.6, color: IMP.gunmetal });
    // prisoner transport cage on wheels parked by the lockers, and four line-up marks west of the arch
    {
      const T = new Placer(kit, [-22.6, F, -181.2], 0.25);
      const w = 1.2;
      const d = 1.8;
      const h = 2.0;
      T.box("paintedMetal", 0, 0.16, 0, w, 0.12, d, black);
      for (const [px, pz] of [[-0.45, -0.7], [0.45, -0.7], [-0.45, 0.7], [0.45, 0.7]]) T.cyl("rubber", px, 0.08, pz, 0.08, 0.06, "x", { color: IMP.black, segments: 10 });
      for (const [px, pz] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) T.box("paintedMetal", px, 0.22 + h / 2, pz, 0.08, h, 0.08, black);
      T.box("paintedMetal", 0, 0.22 + h, 0, w + 0.08, 0.08, d + 0.08, black);
      const mesh = (lx, lz, len, yaw) => T.add("grate", PLANE(len, h - 0.1), lx, 0.22 + h / 2, lz, { rot: [0, yaw, 0], uv: "scale", uvScale: [len / GRATE_TILE[0], (h - 0.1) / GRATE_TILE[1]] });
      mesh(-w / 2, 0, d, Math.PI / 2);
      mesh(w / 2, 0, d, Math.PI / 2);
      mesh(0, -d / 2, w, 0);
      mesh(0, d / 2, w, 0);
      T.box("hazardRed", 0, 0.22 + h - 0.3, d / 2 + 0.012, 0.8, 0.3, 0.012, { texel: 3 });
      T.box("emitRed", 0, 0.22 + h + 0.1, 0, 0.3, 0.05, 0.05);
      T.decal(0, 1.3, d / 2 + 0.02, 0.4, 0.4, DECAL.RESTRICTED);
      T.collider([-w / 2 - 0.05, 0, -d / 2 - 0.05], [w / 2 + 0.05, h + 0.4, d / 2 + 0.05], "cage");
    }
    for (let i = 0; i < 4; i++) {
      const mx = -17.4 - i * 1.0;
      const mz = -182.3;
      for (const [a, b, c, d] of [[mx - 0.35, mz - 0.35, mx + 0.35, mz - 0.3], [mx - 0.35, mz + 0.3, mx + 0.35, mz + 0.35], [mx - 0.35, mz - 0.35, mx - 0.3, mz + 0.35], [mx + 0.3, mz - 0.35, mx + 0.35, mz + 0.35]]) {
        kit.boxMM("hazardRed", [a, F + 0.003, b], [c, F + 0.009, d], { texel: 3 });
      }
      kit.add("decal", PLANE(0.3, 0.3), { pos: [mx, F + 0.012, mz], rot: [-Math.PI / 2, 0, 0], uv: "keep", uvRect: decalRect(DECAL.NUMBER0 + i) });
    }
  }

  // ---- starboard wing: caged holding pen, computer bank ----------------------------------------------------
  {
    const xmax = ctx.wall("xmax").frame; // u = z - z0
    computerBank(kit, { pos: [AX + 7.2, F, z1 - 0.62], yaw: Math.PI, w: 3.0, h: 2.3, d: 0.6, seed: 53, accent: "emitRed" });
    xmax.decal(-179.6 - z0, 3.3, 0.06, 0.8, 0.8, DECAL.RESTRICTED);
    wallPanel(kit, xmax, -181.6 - z0, 1.7, { w: 1.1, h: 0.7, accent: "emitRed", seed: 33 });
    // watch roster on the entry wall beside the computer bank
    zmax.box("paintedMetal", x1 - (AX + 10.6), 2.2, 0.03, 2.2, 1.3, 0.06, black);
    zmax.box("screen", x1 - (AX + 10.05), 2.2, 0.065, 1.0, 1.05, 0.005, { uv: "keep", uvRect: screenRect(13) });
    zmax.box("screen", x1 - (AX + 11.15), 2.42, 0.065, 0.95, 0.5, 0.005, { uv: "keep", uvRect: screenRect(15) });
    zmax.box("screen", x1 - (AX + 11.15), 1.88, 0.065, 0.95, 0.42, 0.005, { uv: "keep", uvRect: screenRect(3) });
    zmax.box("emitRed", x1 - (AX + 10.6), 2.9, 0.065, 2.1, 0.03, 0.005);
    // confiscated goods stacked in the starboard entry corner
    crate(kit, { pos: [x1 - 1.3, F, z1 - 1.1], yaw: -0.1, size: [1.3, 0.9, 1.1], band: true, decal: DECAL.WARNING, color: IMP.plateDark });
    crate(kit, { pos: [x1 - 1.3, F + 0.9, z1 - 1.1], yaw: 0.2, size: [1.0, 0.7, 0.9], band: false, decal: DECAL.RESTRICTED, color: IMP.gunmetal });
    crate(kit, { pos: [x1 - 2.9, F, z1 - 0.9], yaw: 0.05, size: [1.0, 0.7, 0.9], band: true, decal: DECAL.TEXT_C, color: IMP.plateWarm });
    const H = 2.6;
    const px = -0.3; // pen's west fence line
    const pz = -185.0; // pen's front fence line
    const mesh = (ax, az, bx, bz) => {
      const w = Math.hypot(bx - ax, bz - az);
      const yaw = Math.atan2(ax - bx, bz - az) + Math.PI / 2;
      kit.add("grate", PLANE(w, H - 0.25), { pos: [(ax + bx) / 2, F + 0.12 + (H - 0.25) / 2, (az + bz) / 2], rot: [0, yaw, 0], uv: "scale", uvScale: [w / GRATE_TILE[0], (H - 0.25) / GRATE_TILE[1]] });
    };
    const post = (x, z) => kit.box("paintedMetal", x, F + H / 2, z, 0.1, H, 0.1, black);
    const rail = (ax, az, bx, bz, y, h = 0.1) => kit.boxMM("paintedMetal", [lo(ax, bx) - 0.05, y, lo(az, bz) - 0.05], [hi(ax, bx) + 0.05, y + h, hi(az, bz) + 0.05], black);
    // west fence (full) and front fence with a gate opening 0.6..1.8
    mesh(px, PZ + 0.2, px, pz);
    rail(px, PZ + 0.2, px, pz, F, 0.12);
    rail(px, PZ + 0.2, px, pz, F + H - 0.1);
    for (const z of [PZ + 0.25, -187.4, pz]) post(px, z);
    kit.collider([px - 0.08, F, PZ + 0.2], [px + 0.08, F + H, pz + 0.08], "pen");
    mesh(px, pz, 0.6, pz);
    rail(px, pz, 0.6, pz, F, 0.12);
    rail(px, pz, x1, pz, F + H - 0.1);
    mesh(1.8, pz, x1, pz);
    rail(1.8, pz, x1, pz, F, 0.12);
    for (const x of [0.6, 1.8, x1 - 0.05]) post(x, pz);
    kit.collider([px, F, pz - 0.08], [0.6, F + H, pz + 0.08], "pen");
    kit.collider([1.8, F, pz - 0.08], [x1, F + H, pz + 0.08], "pen");
    // gate leaf slid open along the inside of the front fence
    mesh(1.85, pz - 0.14, 3.05, pz - 0.14);
    rail(1.85, pz - 0.14, 3.05, pz - 0.14, F + 0.05, 0.08);
    rail(1.85, pz - 0.14, 3.05, pz - 0.14, F + H - 0.2, 0.08);
    for (const x of [1.85, 3.05]) kit.box("paintedMetal", x, F + H / 2, pz - 0.14, 0.08, H - 0.1, 0.08, black);
    kit.box("hazardRed", 2.45, F + 1.3, pz - 0.17, 0.9, 0.5, 0.02, { texel: 3 });
    kit.collider([1.8, F, pz - 0.2], [3.1, F + H, pz - 0.08], "gate");
    // header over the gate opening with restricted stencil and red light
    kit.box("paintedMetal", 1.2, F + H + 0.2, pz, 1.6, 0.5, 0.08, black);
    kit.add("decal", PLANE(0.44, 0.44), { pos: [1.2, F + H + 0.2, pz + 0.045], uv: "keep", uvRect: decalRect(DECAL.RESTRICTED) });
    kit.box("emitRed", 1.2, F + H - 0.16, pz, 1.2, 0.03, 0.12, {});
    // inside: bench with restraint rings, drain grate, red practical
    kit.boxMM("paintedMetal", [x1 - 0.5, F + 0.42, -189.4], [x1 - 0.1, F + 0.47, -186.0], black);
    for (const bz of [-189.2, -187.7, -186.2]) kit.box("paintedMetal", x1 - 0.3, F + 0.21, bz, 0.3, 0.42, 0.1, { color: IMP.trim, texel: 1 });
    for (const bz of [-188.8, -187.7, -186.6]) kit.cyl("metal", x1 - 0.32, F + 0.49, bz, 0.05, 0.02, "y", { color: IMP.steel, segments: 10, open: true });
    kit.collider([x1 - 0.55, F, -189.45], [x1, F + 0.5, -185.95], "bench");
    floorGrate(kit, [1.4, -188.2], [2.2, -187.4], F + 0.004);
    kit.box("paintedMetal", 1.7, ceil - 0.2, -187.4, 0.5, 0.18, 0.5, black);
    kit.box("emitRed", 1.7, ceil - 0.3, -187.4, 0.42, 0.01, 0.42, { uv: "keep" });
    kit.boxMM("hazardRed", [px - 0.2, F + 0.002, PZ + 0.2], [px - 0.1, F + 0.008, pz - 0.2], { texel: 3 });
    kit.boxMM("hazardRed", [px - 0.2, F + 0.002, pz - 0.2], [x1, F + 0.008, pz - 0.1], { texel: 3 });
    pipeRun(kit, { points: [[x1 - 0.45, ceil - 0.35, z1 - 0.6], [x1 - 0.45, ceil - 0.35, PZ + 0.6]], r: 0.08, clamps: 2.6, color: IMP.steelDark });
  }
  // hall ceiling: fixtures under the three white points, cameras over the platforms
  fixture(AX, -184.3, 2.2, 0.7, "x");
  fixture(-24.0, -183.6, 1.6, 0.6, "z");
  fixture(-1.0, -183.6, 1.6, 0.6, "z");
  camera(-24.6, PZA + 1.2, Math.PI - 0.7);
  camera(-1.8, PZA + 1.2, Math.PI + 0.7);

  // =========================================================================================================
  // CELL CORRIDOR (x AX-2 .. AX+2, z -190.2 .. -219.75)
  // =========================================================================================================
  // lowered ceiling slab over the whole block (corridor + cells + alcoves) with edge strips and cross bands
  const BX0 = AX - 2 - ALC_D - 0.25;
  const BX1 = AX + 2 + ALC_D + 0.25;
  kit.boxMM("paintedMetal", [BX0, F + CH, z0], [BX1, F + CH + 0.25, CZ1], black);
  for (const s of [-1, 1]) {
    const xe = AX + s * 1.72;
    kit.boxMM("emitRed", [xe - 0.03, F + CH - 0.012, z0 + 0.3], [xe + 0.03, F + CH, CZ1 - 0.3], {});
    // red floor lines along the cell fronts
    kit.boxMM("emitRed", [AX + s * 1.9 - 0.02, F + 0.004, z0 + 0.2], [AX + s * 1.9 + 0.02, F + 0.012, CZ1 - 0.2], {});
  }
  const LIT = [2, 6]; // partitions carrying the two corridor point lights (brighter bands)
  const partZ = (k) => (parts[k][0] + parts[k][1]) / 2;
  parts.forEach(([za, zb], k) => {
    const zc = (za + zb) / 2;
    if (k % 2 === 0) kit.box(LIT.includes(k) ? "emitWhite" : "emitWhiteSoft", AX, F + CH - 0.012, zc, 3.3, 0.02, 0.28, { uv: "keep" });
    else kit.box("paintedMetal", AX, F + CH - 0.08, zc, 4.0, 0.16, 0.22, { color: IMP.trim, texel: 1 });
  });

  const sideYaw = (s) => (s > 0 ? -Math.PI / 2 : Math.PI / 2); // yaw whose local -Z points from the corridor into side s
  const faceRot = (s) => [0, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0]; // +Z-face boxes/planes turned to face the corridor

  for (const s of [-1, 1]) {
    const cx = AX + s * 2.0; // corridor plane on this side
    const xb = cx + s * CELL_D; // cell back plane
    const xa = cx + s * ALC_D; // alcove back plane
    const rot = faceRot(s);
    // partitions (deeper next to the alcove) with white light blades on the corridor ends
    parts.forEach(([za, zb], k) => {
      const deep = k === 4 || k === 5;
      const xe = deep ? xa : xb;
      kit.boxMM("plate", [lo(cx, xe), F, zb], [hi(cx, xe), F + CH, za], dark);
      kit.collider([lo(cx, xe), F, zb], [hi(cx, xe), F + CH, za], "partition");
      kit.boxMM("emitWhiteSoft", [lo(cx, cx - s * 0.02), F + 0.4, (za + zb) / 2 - 0.06], [hi(cx, cx - s * 0.02), F + 2.9, (za + zb) / 2 + 0.06], { uv: "keep" });
    });
    // cells
    cells.forEach((c, k) => {
      const i = s < 0 ? k : k + 8; // 0..15
      const open = i === 2 || i === 13;
      const zc = (c.za + c.zb) / 2;
      const xj0 = lo(cx, cx + s * JD);
      const xj1 = hi(cx, cx + s * JD);
      // jambs and lintel (the recessed doorway)
      kit.boxMM("plate", [xj0, F, c.zb], [xj1, F + DH, zc - DW / 2], dark);
      kit.boxMM("plate", [xj0, F, zc + DW / 2], [xj1, F + DH, c.za], dark);
      kit.boxMM("plate", [xj0, F + DH, c.zb], [xj1, F + CH, c.za], dark);
      kit.boxMM("paintedMetal", [xj0 - 0.01, F + DH - 0.06, zc - DW / 2 - 0.1], [xj1 + 0.01, F + DH, zc + DW / 2 + 0.1], black);
      // two-digit cell code on the lintel, reading left to right as seen from the corridor
      const xf = cx - s * 0.012;
      kit.add("decal", PLANE(0.42, 0.42), { pos: [xf, F + 2.78, zc - s * 0.24], rot, uv: "keep", uvRect: decalRect(DECAL.NUMBER0 + Math.floor(i / 4)) });
      kit.add("decal", PLANE(0.42, 0.42), { pos: [xf, F + 2.78, zc + s * 0.24], rot, uv: "keep", uvRect: decalRect(DECAL.NUMBER0 + (i % 4)) });
      // control panel on the right-hand jamb: status light, keypad
      const zj = zc + s * (DW / 2 + 0.28);
      kit.box("paintedMetal", cx - s * 0.02, F + 1.5, zj, 0.04, 0.62, 0.36, black);
      kit.box(open ? "emitGreen" : "emitRed", cx - s * 0.045, F + 1.72, zj, 0.01, 0.07, 0.07, {});
      kit.box("leds", cx - s * 0.045, F + 1.4, zj, 0.006, 0.24, 0.26, { uv: "keep", uvRect: ledRect(open ? 6 : 10) });
      if (!open) {
        // dark door slab set back behind the jambs: grooves, vision slit, red status dot
        const xs = cx + s * (JD + 0.05);
        kit.box("plate", xs, F + (DH + 0.05) / 2, zc, 0.1, DH + 0.05, DW + 0.1, { color: SLAB, uv: "world", texel: 1 });
        const xg = cx + s * (JD - 0.006);
        for (const y of [0.55, 1.15]) kit.box("paintedMetal", xg, F + y, zc, 0.012, 0.05, DW - 0.2, black);
        kit.box("darkGloss", xg, F + 1.62, zc, 0.012, 0.09, 0.42, {});
        kit.box("emitRed", xg, F + 2.02, zc - s * 0.5, 0.012, 0.05, 0.05, {});
        kit.collider([lo(cx, cx + s * 0.5), F, c.zb], [hi(cx, cx + s * 0.5), F + CH, c.za], "cell");
      } else {
        // open cell: back wall, lowered ceiling with a light panel, bunk slab, sanitary unit, ration slot
        kit.boxMM("plate", [lo(xb, xb + s * 0.2), F, c.zb], [hi(xb, xb + s * 0.2), F + CH, c.za], { color: IMP.plate, uv: "world", texel: 1 });
        kit.collider([lo(xb, xb + s * 0.2), F, c.zb], [hi(xb, xb + s * 0.2), F + CH, c.za], "cellback");
        kit.boxMM("paintedMetal", [lo(cx + s * JD, xb), F + 2.45, c.zb], [hi(cx + s * JD, xb), F + 2.55, c.za], black);
        kit.box("emitWhiteSoft", (cx + s * JD + xb) / 2, F + 2.445, zc, 0.5, 0.01, 0.9, { uv: "keep" });
        const bz0 = c.zb + 0.05;
        const bz1 = c.zb + 0.85;
        const bx0 = lo(xb, xb - s * 1.95);
        const bx1 = hi(xb, xb - s * 1.95);
        kit.boxMM("plate", [bx0, F + 0.2, bz0], [bx1, F + 0.5, bz1], dark);
        kit.boxMM("paintedMetal", [bx0 - 0.02, F + 0.5, bz0 - 0.02], [bx1 + 0.02, F + 0.56, bz1 + 0.02], black);
        kit.boxMM("fabric", [bx0 + 0.04, F + 0.56, bz0 + 0.04], [bx1 - 0.04, F + 0.66, bz1 - 0.04], { color: IMP.fabricGrey, uv: "world", texel: 2 });
        kit.boxMM("fabric", [bx0 + 0.15, F + 0.66, bz0 + 0.12], [bx0 + 0.55, F + 0.76, bz1 - 0.12], { color: IMP.plateLight, uv: "world", texel: 2 });
        kit.collider([bx0, F, bz0], [bx1, F + 0.7, bz1], "bunk");
        const ux = xb - s * 0.32;
        const uz = c.za - 0.42;
        kit.box("metal", ux, F + 0.27, uz, 0.5, 0.54, 0.5, { color: IMP.steelDark });
        kit.cyl("metal", ux, F + 0.56, uz, 0.16, 0.05, "y", { color: STEEL_LIGHT, segments: 14 });
        kit.cyl("darkGloss", ux, F + 0.59, uz, 0.11, 0.01, "y", { segments: 14 });
        kit.box("metal", xb - s * 0.06, F + 0.95, uz, 0.12, 0.45, 0.06, { color: IMP.steelDark, rot: [0, 0, 0] });
        kit.collider([ux - 0.25, F, uz - 0.25], [ux + 0.25, F + 0.65, uz + 0.25], "sanitary");
        kit.box("paintedMetal", xb - s * 0.04, F + 1.2, zc, 0.06, 0.16, 0.42, black);
        kit.box("leds", xb - s * 0.075, F + 1.2, zc, 0.005, 0.05, 0.3, { uv: "keep", uvRect: ledRect(7) });
        kit.cyl("metal", xb - s * 0.04, F + 1.6, c.zb + 1.2, 0.06, 0.03, "x", { color: IMP.steel, segments: 10, open: true });
        kit.collider([xj0, F, c.zb], [xj1, F + CH, zc - DW / 2], "jamb");
        kit.collider([xj0, F, zc + DW / 2], [xj1, F + CH, c.za], "jamb");
      }
    });
  }

  // ---- west alcove: interrogation room --------------------------------------------------------------------
  {
    const s = -1;
    const cx = AX + s * 2.0;
    const xa = cx + s * ALC_D; // -19.5
    // front wall at the corridor plane with a framed doorway, wall above the frame
    const dw = 2.0;
    const dh = 2.6;
    const xj0 = lo(cx, cx + s * JD);
    const xj1 = hi(cx, cx + s * JD);
    kit.boxMM("plate", [xj0, F, alc.zb], [xj1, F + CH, ZA - dw / 2 - 0.3], dark);
    kit.boxMM("plate", [xj0, F, ZA + dw / 2 + 0.3], [xj1, F + CH, alc.za], dark);
    kit.boxMM("plate", [xj0, F + dh + 0.55, ZA - dw / 2 - 0.3], [xj1, F + CH, ZA + dw / 2 + 0.3], dark);
    kit.collider([xj0, F, alc.zb], [xj1, F + CH, ZA - dw / 2 - 0.3], "wall");
    kit.collider([xj0, F, ZA + dw / 2 + 0.3], [xj1, F + CH, alc.za], "wall");
    doorFrame(kit, { pos: [cx + s * JD / 2, F, ZA], yaw: sideYaw(s), w: dw, h: dh, d: 0.05, accent: "emitRed", sill: true });
    const rot = faceRot(s);
    kit.add("decal", PLANE(0.5, 0.5), { pos: [cx - s * 0.012, F + 1.6, alc.za - 0.6], rot, uv: "keep", uvRect: decalRect(DECAL.RESTRICTED) });
    kit.add("decal", PLANE(0.5, 0.5), { pos: [cx - s * 0.012, F + 1.6, alc.zb + 0.6], rot, uv: "keep", uvRect: decalRect(DECAL.WARNING) });
    // back wall, lowered ceiling with the spot housing, red perimeter strip, emblem
    kit.boxMM("plate", [xa - 0.2, F, alc.zb], [xa, F + CH, alc.za], { color: IMP.plateDark, uv: "world", texel: 1 });
    kit.collider([xa - 0.2, F, alc.zb], [xa, F + CH, alc.za], "wall");
    kit.boxMM("paintedMetal", [xa, F + 3.0, alc.zb], [cx + s * JD, F + 3.1, alc.za], black);
    kit.boxMM("emitRed", [xa + 0.15, F + 2.985, alc.zb + 0.15], [xa + 0.21, F + 3.0, alc.za - 0.15], {});
    kit.boxMM("emitRed", [xa + 0.15, F + 2.985, alc.zb + 0.15], [cx + s * JD - 0.15, F + 3.0, alc.zb + 0.21], {});
    kit.boxMM("emitRed", [xa + 0.15, F + 2.985, alc.za - 0.21], [cx + s * JD - 0.15, F + 3.0, alc.za - 0.15], {});
    kit.add("decal", PLANE(1.1, 1.1), { pos: [xa + 0.012, F + 2.1, ZA], rot: [0, Math.PI / 2, 0], uv: "keep", uvRect: decalRect(DECAL.EMBLEM_RED) });
    // the chair: pedestal, seat, tall back, arm and leg restraints; faces the door (+X)
    const chx = -17.3;
    const P = new Placer(kit, [chx, F, ZA], -Math.PI / 2);
    P.cyl("paintedMetal", 0, 0.05, 0, 0.36, 0.1, "y", { color: IMP.black, segments: 16 });
    P.box("plate", 0, 0.3, 0.05, 0.34, 0.4, 0.4, dark);
    P.box("emitRed", 0, 0.3, -0.16, 0.16, 0.03, 0.01);
    P.box("plate", 0, 0.55, 0, 0.66, 0.1, 0.62, { color: IMP.gunmetal, uv: "world", texel: 1 });
    P.box("plate", 0, 1.12, 0.3, 0.62, 1.05, 0.1, { color: IMP.gunmetal, uv: "world", texel: 1, rot: [-0.1, 0, 0] });
    P.box("paintedMetal", 0, 1.72, 0.26, 0.34, 0.2, 0.08, { ...black, rot: [-0.1, 0, 0] });
    P.box("metal", 0, 1.72, 0.2, 0.28, 0.03, 0.03, { color: IMP.steel });
    for (const ax of [-0.36, 0.36]) {
      P.box("paintedMetal", ax, 0.72, 0.1, 0.05, 0.26, 0.1, black);
      P.box("paintedMetal", ax, 0.86, 0.0, 0.08, 0.05, 0.5, black);
      P.cyl("metal", ax, 0.92, -0.14, 0.055, 0.04, "z", { color: IMP.steel, segments: 12, open: true });
      P.cyl("metal", ax * 0.5, 0.15, -0.3, 0.055, 0.04, "z", { color: IMP.steel, segments: 12, open: true });
    }
    P.box("paintedMetal", 0, 0.14, -0.3, 0.5, 0.05, 0.08, black);
    P.collider([-0.45, 0, -0.4], [0.45, 1.9, 0.45], "chair");
    floorGrate(kit, [chx - 0.6, ZA - 0.6], [chx + 0.6, ZA + 0.6], F + 0.004);
    // restraint frame against the back wall: two posts, top bar, cuff bar, base plate, leaning back
    const Q = new Placer(kit, [xa + 0.55, F, alc.za - 1.1], -Math.PI / 2);
    Q.box("paintedMetal", 0, 0.04, 0, 1.3, 0.08, 0.6, black);
    for (const px of [-0.5, 0.5]) Q.cyl("metal", px, 1.15, 0.1, 0.04, 2.3, "y", { color: STEEL_LIGHT, segments: 8, rot: [0.12, 0, 0] });
    Q.box("metal", 0, 2.28, 0.24, 1.1, 0.06, 0.06, { color: STEEL_LIGHT, rot: [0.12, 0, 0] });
    Q.box("metal", 0, 1.6, 0.15, 1.1, 0.05, 0.05, { color: STEEL_LIGHT, rot: [0.12, 0, 0] });
    for (const px of [-0.3, 0.3]) Q.cyl("metal", px, 1.5, 0.1, 0.06, 0.04, "y", { color: IMP.steel, segments: 12, open: true });
    for (const px of [-0.22, 0.22]) Q.cyl("metal", px, 0.35, 0.02, 0.06, 0.04, "y", { color: IMP.steel, segments: 12, open: true });
    Q.box("emitRed", 0, 2.1, 0.22, 0.3, 0.03, 0.01, { rot: [0.12, 0, 0] });
    Q.collider([-0.7, 0, -0.35], [0.7, 2.35, 0.4], "frame");
    // interrogator's terminal against the south partition, instrument cart in the back corner
    consoleStation(kit, { pos: [-16.9, F, alc.zb + 0.9], yaw: 0, w: 1.5, d: 0.8, h: 1.0, screens: 2, accent: "emitRed", seed: 57, screenSet: [11, 2] });
    {
      const T = new Placer(kit, [xa + 0.55, F, alc.zb + 0.7], 0.15);
      T.box("paintedMetal", 0, 0.45, 0, 0.7, 0.05, 0.5, black);
      T.box("paintedMetal", 0, 0.9, 0, 0.7, 0.05, 0.5, black);
      for (const [px, pz] of [[-0.32, -0.22], [0.32, -0.22], [-0.32, 0.22], [0.32, 0.22]]) T.cyl("metal", px, 0.47, pz, 0.015, 0.94, "y", { color: IMP.steel, segments: 6 });
      for (const [px, pz] of [[-0.3, -0.2], [0.3, -0.2], [-0.3, 0.2], [0.3, 0.2]]) T.cyl("rubber", px, 0.05, pz, 0.05, 0.03, "x", { color: IMP.black, segments: 10 });
      T.box("metal", 0, 0.94, 0, 0.6, 0.03, 0.42, { color: STEEL_LIGHT });
      for (let i = 0; i < 6; i++) T.cyl(i % 2 ? "darkGloss" : "metal", -0.22 + i * 0.09, 0.97, -0.08 + rand() * 0.16, 0.012, 0.14 + rand() * 0.12, "z", { color: IMP.steel, segments: 6 });
      T.box("darkGloss", 0.18, 0.99, 0.12, 0.16, 0.06, 0.1);
      T.box("emitRed", 0.18, 1.025, 0.12, 0.03, 0.01, 0.03);
      T.box("plate", -0.15, 0.55, 0, 0.3, 0.16, 0.3, { color: IMP.plateDark, uv: "world", texel: 1 });
      T.collider([-0.4, 0, -0.3], [0.4, 1.05, 0.3], "cart");
    }
    // spot housing over the chair
    kit.box("paintedMetal", chx, F + 2.9, ZA, 0.5, 0.2, 0.5, black);
    kit.cyl("emitWhite", chx, F + 2.795, ZA, 0.15, 0.01, "y", { segments: 16 });
    kit.box("hazardRed", chx, F + 0.013, ZA + 0.9, 1.6, 0.006, 0.12, { texel: 3 });
    kit.box("hazardRed", chx, F + 0.013, ZA - 0.9, 1.6, 0.006, 0.12, { texel: 3 });
  }

  // ---- east alcove: raised guard post overlooking the corridor ---------------------------------------------
  {
    const s = 1;
    const cx = AX + s * 2.0; // -10.5
    const xa = cx + s * ALC_D; // -5.5
    kit.boxMM("plate", [xa, F, alc.zb], [xa + 0.2, F + CH, alc.za], { color: IMP.plateDark, uv: "world", texel: 1 });
    kit.collider([xa, F, alc.zb], [xa + 0.2, F + CH, alc.za], "wall");
    // step
    kit.boxMM("deckGrey", [cx, F, alc.zb], [xa, F + STEP, alc.za], { color: IMP.plateDark, texel: 0.5 });
    kit.boxMM("paintedMetal", [cx - 0.02, F, alc.zb], [cx + 0.02, F + STEP + 0.01, alc.za], black);
    kit.boxMM("hazardRed", [cx - 0.031, F + STEP - 0.1, alc.zb + 0.1], [cx - 0.021, F + STEP - 0.02, alc.za - 0.1], { texel: 3 });
    kit.boxMM("emitRed", [cx + 0.02, F + STEP + 0.005, alc.zb + 0.1], [cx + 0.06, F + STEP + 0.015, alc.za - 0.1], {});
    kit.collider([cx, F, alc.zb], [xa, F + STEP, alc.za], "step");
    // console facing the corridor + chair
    consoleStation(kit, { pos: [cx + 1.15, F + STEP, ZA], yaw: Math.PI / 2, w: 2.0, d: 0.85, h: 1.0, screens: 3, accent: "emitRed", seed: 59, screenSet: [12, 8, 0] });
    chair(kit, { pos: [cx + 1.85, F + STEP, ZA], yaw: Math.PI / 2 });
    // cell-feed monitor cluster on the back wall (3 x 2), label, comm panel on the north partition
    const rot = faceRot(s);
    kit.box("paintedMetal", xa - 0.04, F + 2.25, ZA, 0.08, 1.7, 3.1, black);
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        const y = F + 1.55 + 0.05 + 0.8 * (r + 0.5);
        const z = ZA - 1.0 + c * 1.0;
        kit.box("darkGloss", xa - 0.09, y, z, 0.02, 0.7, 0.9, {});
        kit.box("screen", xa - 0.105, y + 0.03, z, 0.8, 0.52, 0.005, { rot, uv: "keep", uvRect: screenRect(pick([8, 12, 0, 1, 15, 13])) });
        kit.box(rand() < 0.8 ? "emitRed" : "emitGreen", xa - 0.105, y - 0.29, z - 0.36, 0.005, 0.03, 0.05, {});
        kit.box("leds", xa - 0.105, y - 0.29, z + 0.05, 0.005, 0.04, 0.5, { uv: "keep", uvRect: ledRect(Math.floor(rand() * 16)) });
      }
    }
    kit.add("decal", PLANE(0.6, 0.6), { pos: [xa - 0.012, F + 1.15, ZA - 1.3], rot, uv: "keep", uvRect: decalRect(DECAL.TEXT_A) });
    kit.add("decal", PLANE(0.6, 0.6), { pos: [xa - 0.012, F + 1.15, ZA + 1.3], rot, uv: "keep", uvRect: decalRect(DECAL.SPEC_PLATE) });
    kit.box("leds", xa - 0.012, F + 1.15, ZA, 0.005, 0.08, 1.2, { uv: "keep", uvRect: ledRect(2) });
    const north = wallFrame(kit, [xa, alc.za], [cx, alc.za], F).frame; // faces -Z into the alcove, u = xa - x
    wallPanel(kit, north, 2.2, 1.6 + STEP, { w: 1.0, h: 0.6, accent: "emitRed", seed: 61 });
    rifleRack([cx + 3.6, F + STEP, alc.za - 0.12], 0); // on the north partition, faces -Z
    // baton hooks on the south partition
    const sz = alc.zb + 0.03;
    kit.box("paintedMetal", cx + 2.6, F + STEP + 1.5, sz + 0.03, 1.0, 0.5, 0.06, black);
    for (let i = 0; i < 4; i++) {
      kit.cyl("darkGloss", cx + 2.24 + i * 0.24, F + STEP + 1.36, sz + 0.1, 0.02, 0.62, "y", { segments: 8 });
      kit.box("metal", cx + 2.24 + i * 0.24, F + STEP + 1.7, sz + 0.09, 0.04, 0.04, 0.1, { color: IMP.steel });
    }
    // red practical on the alcove ceiling
    kit.box("paintedMetal", cx + 2.5, F + CH - 0.15, ZA, 0.6, 0.2, 0.6, black);
    kit.box("emitRed", cx + 2.5, F + CH - 0.255, ZA, 0.5, 0.01, 0.5, { uv: "keep" });
    camera(cx + 0.6, alc.zb + 0.5, Math.PI / 2 + 0.6, F + CH);
  }

  // ---- corridor dressing: gate-side comm panel, ration cart, far-end maximum-security door ----------------
  {
    // ration cart parked by cell 5 on the east side
    const P = new Placer(kit, [AX + 1.1, F, -211.4], 0.18);
    for (const y of [0.25, 0.6, 0.95]) P.box("paintedMetal", 0, y, 0, 0.9, 0.04, 0.6, black);
    for (const [px, pz] of [[-0.42, -0.27], [0.42, -0.27], [-0.42, 0.27], [0.42, 0.27]]) {
      P.cyl("metal", px, 0.5, pz, 0.015, 1.0, "y", { color: IMP.steel, segments: 6 });
      P.cyl("rubber", px, 0.06, pz, 0.06, 0.04, "x", { color: IMP.black, segments: 10 });
    }
    P.box("metal", 0, 1.02, 0, 0.9, 0.03, 0.6, { color: STEEL_LIGHT });
    for (let i = 0; i < 5; i++) P.box("plate", -0.2 + (rand() - 0.5) * 0.06, 1.05 + i * 0.035, (rand() - 0.5) * 0.06, 0.42, 0.03, 0.32, { color: i % 2 ? IMP.plateLight : IMP.plate, uv: "world", texel: 2 });
    P.cyl("metal", 0.25, 1.17, -0.1, 0.09, 0.28, "y", { color: IMP.gunmetal, segments: 12 });
    P.cyl("darkGloss", 0.25, 1.32, -0.1, 0.06, 0.03, "y", { segments: 12 });
    for (let i = 0; i < 3; i++) P.box("plate", -0.15 + i * 0.22, 0.7, 0.05, 0.18, 0.16, 0.36, { color: IMP.plateDark, uv: "world", texel: 2 });
    P.collider([-0.5, 0, -0.35], [0.5, 1.35, 0.35], "cart");
    // maximum-security door at the dead end
    doorFrame(kit, { pos: [AX, F, z0 + 0.32], yaw: 0, w: 2.6, h: 2.8, d: 0.3, accent: "emitRed", sill: true, wide: true });
    kit.box("plate", AX, F + 1.4, z0 + 0.14, 2.6, 2.8, 0.14, { color: SLAB, uv: "world", texel: 1 });
    kit.box("hazardRed", AX, F + 1.4, z0 + 0.215, 0.18, 2.7, 0.01, { texel: 3 });
    for (const y of [0.7, 2.1]) kit.box("paintedMetal", AX, F + y, z0 + 0.215, 2.4, 0.05, 0.012, black);
    kit.add("decal", PLANE(0.7, 0.7), { pos: [AX - 0.75, F + 1.5, z0 + 0.225], uv: "keep", uvRect: decalRect(DECAL.RESTRICTED) });
    kit.add("decal", PLANE(0.7, 0.7), { pos: [AX + 0.75, F + 1.5, z0 + 0.225], uv: "keep", uvRect: decalRect(DECAL.WARNING) });
    kit.box("emitRed", AX - 0.75, F + 2.35, z0 + 0.225, 0.4, 0.04, 0.01, {});
    kit.box("emitRed", AX + 0.75, F + 2.35, z0 + 0.225, 0.4, 0.04, 0.01, {});
    kit.collider([AX - 1.6, F, z0], [AX + 1.6, F + 3.4, z0 + 0.7], "maxsec");
    kit.boxMM("hazardRed", [AX - 1.7, F + 0.013, z0 + 0.75], [AX + 1.7, F + 0.019, z0 + 0.95], { texel: 3 });
    // red practical housing at the dead end; a camera looks down the corridor from the gate
    kit.box("paintedMetal", AX, F + CH - 0.15, z0 + 1.3, 0.5, 0.2, 0.5, black);
    kit.box("emitRed", AX, F + CH - 0.255, z0 + 1.3, 0.42, 0.01, 0.42, { uv: "keep" });
    camera(AX - 1.4, CZ1 - 0.9, 0.0, F + CH);
  }

  // ---- lights (8: 7 points + a shadow spot over the interrogation chair) ----------------------------------
  ctx.light(0xeef2ff, 60, 28, [AX, ceil - 0.45, -184.3], { decay: 1.6 });
  ctx.light(0xeef2ff, 48, 22, [-24.0, ceil - 0.5, -183.6], { decay: 1.6 });
  ctx.light(0xeef2ff, 48, 22, [-1.0, ceil - 0.5, -183.6], { decay: 1.6 });
  ctx.light(0xf4f6ff, 36, 15, [AX, F + CH - 0.5, partZ(LIT[0])], { decay: 1.6 });
  ctx.light(0xf4f6ff, 36, 15, [AX, F + CH - 0.5, partZ(LIT[1])], { decay: 1.6 });
  ctx.light(0xff7a66, 20, 9, [AX + 4.5, F + CH - 0.4, ZA], { decay: 1.6 });
  ctx.light(0xff4a3c, 26, 10, [AX, F + CH - 0.4, z0 + 1.3], { decay: 1.6 });
  ctx.spot(0xffffff, 220, 8, 0.6, [-17.3, F + 2.85, ZA], [-17.3, F, ZA], { penumbra: 0.4, shadow: true, mapSize: 1024 });
}
