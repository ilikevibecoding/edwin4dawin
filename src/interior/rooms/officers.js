// Deck 2 — Officers' Quarters (sector d2_officers).
//
// A private entry corridor runs along the lobby door wall; a spine corridor leads west between
// four cabins (two a side) to the shared washroom and the officers' wardroom at the far end.
// Partitions are full-height Imperial panel walls (light on the corridor side, dark grey inside),
// every cabin has an open door frame with a lintel light and a number plate. Warm practicals inside,
// cool white in the corridors.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { PALETTE } from "../../materials.js";
import { roomShell, impWall, impChair, wallScreen, pipeRun, wallSegment, IMP_PAINTS_DARK, IMP_THEME } from "../imperial.js";
import { pointLight, wallFrame, ceilingFrame, panelGrid } from "../builders.js";
import { rng } from "../../kit.js";
import { decalRect } from "../../textures.js";
import { labelAtlas, signPlate, signAt, ventGrille, datapad, mug, floorScuffs } from "./tactical.js";
import { sheetAtlas } from "./briefing.js";

const T = 0.32; // partition thickness (two back-to-back 0.16 panel grids)
const DOOR_W = 1.0;
const DOOR_H = 2.1;
const MAROON = new THREE.Color("#4a1c1c");
const OLIVE = new THREE.Color("#4b4f3f");
// corridor faces: two tones only, plate rows with the odd vent / equipment / lit-bar break (the
// deliberate breaks — screens, hatches, racks — are placed by hand in spineCorridor)
const CORR_PAINTS = [
  [PALETTE.impLight, 0.72],
  [PALETTE.impGrey, 0.28],
];
const CORR_STYLES = { panel: 0.8, vent: 0.07, greeble: 0.07, strip: 0.06, screen: 0, conduit: 0 };

export function buildOfficers(kit, ctx) {
  const [min, max] = ctx.bounds; // [-24, 0, -7] .. [-5.4, 3.6, 7]
  const H = max[1];
  const labels = labelAtlas(ctx, "officers_labels", [
    "OFFICERS' QUARTERS  ·  DECK 02",
    { text: "CABIN 01  ·  CDR. TALLIS", accent: "#ffb347", color: "#ffe6c4" },
    { text: "02  ·  LT. CDR. VORNE", accent: "#ffb347", color: "#ffe6c4" },
    { text: "CABIN 03  ·  CDR. HASK", accent: "#ffb347", color: "#ffe6c4" },
    { text: "CABIN 04", accent: "#4a9dff", color: "#dfe7f5" },
    "WASHROOM",
    { text: "WARDROOM", accent: "#ffb347", color: "#ffe6c4" },
    "CABINS 01 – 04   →   WASHROOM  ·  WARDROOM",
    { text: "QUIET HOURS  2200 – 0600", accent: "#ff4136", color: "#ffd9d4" },
    { text: "EMERGENCY  ·  BREATH MASKS", accent: "#ff4136", color: "#ffd9d4" },
    { text: "DO NOT DISTURB", accent: "#ff4136", color: "#ffd9d4" },
    { text: "VACANT  ·  REASSIGNMENT PENDING", accent: "#4a9dff", color: "#dfe7f5" },
    { text: "ACCESS  ·  DECK 02 SYSTEMS", accent: "#ffb347", color: "#ffe6c4" },
    { text: "COMM  ·  WATCH OFFICER", accent: "#4a9dff", color: "#dfe7f5" },
  ]);
  // warm cabin lamp material (softer than the shared amber)
  ctx.materials.officers_warm ||= new THREE.MeshStandardMaterial({ color: 0x000000, emissive: new THREE.Color("#ffd9a8"), emissiveIntensity: 1.9, roughness: 0.5, metalness: 0 });
  // frosted light boxes / ceiling panels: large areas, so kept well under white
  ctx.materials.officers_warm_soft ||= new THREE.MeshStandardMaterial({ color: 0x000000, emissive: new THREE.Color("#ffd9a8"), emissiveIntensity: 1.15, roughness: 0.5, metalness: 0 });
  // frosted diffuser of the corridor strip fixtures: lit enough to read as a light panel, well short of white
  ctx.materials.officers_diffuser ||= new THREE.MeshStandardMaterial({ color: 0x000000, emissive: new THREE.Color("#e9eef7"), emissiveIntensity: 0.32, roughness: 0.6, metalness: 0 });
  // cabin cove strips: warm and clearly below white
  ctx.materials.officers_cove ||= new THREE.MeshStandardMaterial({ color: 0x000000, emissive: new THREE.Color("#ffd2a0"), emissiveIntensity: 0.7, roughness: 0.6, metalness: 0 });
  const sheets = sheetAtlas(ctx, "briefing_sheets");

  // --- plan
  const XE = -7.9; // entry corridor west wall centre
  const ZS = 1.36; // spine corridor wall centres at ±ZS (corridor is z -1.2..1.2)
  const C1 = -12.56; // cross walls between cabin 1|2 and 3|4
  const C2 = -17.26; // cross walls before the washroom / wardroom
  const half = T / 2;
  const north = [ZS + half, max[2]]; // z range of the north spaces
  const south = [min[2], -ZS - half];
  // cabins 1 and 3 open just inside the spine mouth, facing each other, so both interiors show from
  // the entry; 2 and 4 open further along
  const cab1 = { xa: C1 + half, xb: XE - half, za: north[0], zb: north[1], corridor: "zmin", doorX: -9.3, n: 1 };
  const cab2 = { xa: C2 + half, xb: C1 - half, za: north[0], zb: north[1], corridor: "zmin", doorX: -13.42, n: 2 };
  const cab3 = { xa: C1 + half, xb: XE - half, za: south[0], zb: south[1], corridor: "zmax", doorX: -8.9, n: 3 };
  const cab4 = { xa: C2 + half, xb: C1 - half, za: south[0], zb: south[1], corridor: "zmax", doorX: -16.3, n: 4 };
  const wash = { xa: min[0], xb: C2 - half, za: north[0], zb: north[1], doorX: -20.7, doorW: 1.2 };
  const ward = { xa: min[0], xb: C2 - half, za: south[0], zb: south[1], doorX: -20.7, doorW: 1.8 };

  // outer shell: dark panels inside the private spaces, the calm two-tone corridor finish on the lobby-door wall
  const dark = { paints: IMP_PAINTS_DARK, styles: { panel: 0.8, vent: 0.06, greeble: 0.04, strip: 0.1, screen: 0, conduit: 0 } };
  roomShell(kit, ctx, {
    ceiling: false,
    walls: { panelW: 1.2 },
    wall: { zmin: dark, zmax: dark, xmin: dark, xmax: { paints: CORR_PAINTS, styles: CORR_STYLES } },
  });

  // --- partitions (faces: [+N side, -N side] of a→b, N = (-dz, 0, dx))
  // entry corridor wall (x = XE): +N is west (cabins, dark), -N is the entry corridor (light); spine mouth opening
  partition(kit, ctx, [XE, min[2]], [XE, max[2]], H, { seed: 11, openingsAt: [[-1.26, 1.26, 2.7]], faces: ["dark", "light"] });
  // spine walls (z = ±ZS) from the west wall to the entry wall, with the cabin / washroom / wardroom doors
  const spineFrom = min[0];
  const spineTo = XE - half;
  partition(kit, ctx, [spineFrom, ZS], [spineTo, ZS], H, {
    seed: 12,
    faces: ["dark", "light"],
    openingsAt: [
      [cab1.doorX - DOOR_W / 2 - 0.12, cab1.doorX + DOOR_W / 2 + 0.12, DOOR_H + 0.12],
      [cab2.doorX - DOOR_W / 2 - 0.12, cab2.doorX + DOOR_W / 2 + 0.12, DOOR_H + 0.12],
      [wash.doorX - wash.doorW / 2 - 0.12, wash.doorX + wash.doorW / 2 + 0.12, DOOR_H + 0.12],
    ],
  });
  partition(kit, ctx, [spineFrom, -ZS], [spineTo, -ZS], H, {
    seed: 13,
    faces: ["light", "dark"],
    openingsAt: [
      [cab3.doorX - DOOR_W / 2 - 0.12, cab3.doorX + DOOR_W / 2 + 0.12, DOOR_H + 0.12],
      [cab4.doorX - DOOR_W / 2 - 0.12, cab4.doorX + DOOR_W / 2 + 0.12, DOOR_H + 0.12],
      [ward.doorX - ward.doorW / 2 - 0.12, ward.doorX + ward.doorW / 2 + 0.12, 2.5],
    ],
  });
  // cross walls between the spaces (no openings), north and south
  for (const x of [C1, C2]) {
    partition(kit, ctx, [x, north[0]], [x, north[1]], H, { seed: 14 + Math.round(-x), faces: ["dark", "dark"] });
    partition(kit, ctx, [x, south[0]], [x, south[1]], H, { seed: 24 + Math.round(-x), faces: ["dark", "dark"] });
  }

  // door frames + plates
  // the spine corridor lies at -z of the north wall (+ZS) and at +z of the south wall (-ZS)
  // (cabin 1 and 2 doors are only 0.5 m apart, so cabin 1's fittings sit east of its door)
  doorFrame(kit, ctx, labels, cab1.doorX, ZS, DOOR_W, DOOR_H, -1, 1, { extra: "readout", lampSide: -1 });
  doorFrame(kit, ctx, labels, cab2.doorX, ZS, DOOR_W, DOOR_H, -1, 2, { extra: "dnd", lamp: "emitRed", lampSide: -1, extraSide: -1 });
  doorFrame(kit, ctx, labels, cab3.doorX, -ZS, DOOR_W, DOOR_H, +1, 3, { extra: "keypad", lampSide: -1, extraSide: -1 });
  doorFrame(kit, ctx, labels, cab4.doorX, -ZS, DOOR_W, DOOR_H, +1, 4, { extra: "vacant", lamp: "emitBlue" });
  doorFrame(kit, ctx, labels, wash.doorX, ZS, wash.doorW, DOOR_H, -1, 5, { lamp: "emitBlue" });
  doorFrame(kit, ctx, labels, ward.doorX, -ZS, ward.doorW, 2.5 - 0.12, +1, 6, { wide: true, lampSide: -1 });
  // spine mouth header: beam with a white strip and the quarters' directory sign
  kit.boxMM("paintedMetal", [XE - half - 0.02, 2.7, -1.35], [XE + half + 0.02, 2.95, 1.35], { color: PALETTE.impDark, texel: 1.5 });
  kit.boxMM("emitWhiteDim", [XE + half + 0.021, 2.74, -1.2], [XE + half + 0.035, 2.78, 1.2], { uv: "keep" });
  kit.boxMM("emitWhiteDim", [XE - half - 0.035, 2.74, -1.2], [XE - half - 0.021, 2.78, 1.2], { uv: "keep" });
  for (const s of [-1, 1]) {
    kit.boxMM("paintedMetal", [XE - half - 0.03, 0, s > 0 ? 1.2 : -1.35], [XE + half + 0.03, 2.72, s > 0 ? 1.35 : -1.2], { color: PALETTE.impGrey, texel: 1.5 });
    kit.collider([XE - half - 0.03, 0, s > 0 ? 1.2 : -1.35], [XE + half + 0.03, 2.72, s > 0 ? 1.35 : -1.2], "jamb");
  }

  // --- cabins
  cabin(kit, ctx, labels, cab1, 0);
  cabin(kit, ctx, labels, cab2, 1);
  cabin(kit, ctx, labels, cab3, 2);
  cabin(kit, ctx, labels, cab4, 3);
  washroom(kit, ctx, labels, wash);
  wardroom(kit, ctx, labels, sheets, ward);

  // --- corridors
  entryCorridor(kit, ctx, labels, XE, H);
  spineCorridor(kit, ctx, labels, spineFrom, spineTo, H);

  // --- ceiling: dark grid over everything, white strips over the corridors, warm panels in the rooms
  {
    const f = ceilingFrame(kit, min[0], min[2], H);
    panelGrid(f, max[0] - min[0], max[2] - min[2], { rowH: 1.4, panelW: 1.4, kick: false, topPipes: false, seed: ctx.seed * 17 + 21, collide: false, styles: { panel: 0.88, greeble: 0.04, vent: 0.08 }, paints: [[PALETTE.impGrey, 0.55], [PALETTE.impMid, 0.35], [PALETTE.impDark, 0.1]], ...IMP_THEME, decals: false });
    // corridor fixture: dark housing, a faint frosted diffuser (the lit body) and a narrow dim core —
    // the core is the only part that reads bright, so the run reads as a light rather than a white bar
    const strip = (x0, z0, x1, z1, mat = "emitWhiteDim") => {
      const ax = Math.abs(x1 - x0) > Math.abs(z1 - z0);
      const [xa, xb] = [Math.min(x0, x1), Math.max(x0, x1)];
      const [za, zb] = [Math.min(z0, z1), Math.max(z0, z1)];
      const cx = (xa + xb) / 2;
      const cz = (za + zb) / 2;
      const L = ax ? xb - xa : zb - za;
      kit.box("paintedMetal", cx, H - 0.05, cz, ax ? L + 0.2 : 0.42, 0.1, ax ? 0.42 : L + 0.2, { color: PALETTE.impDark, texel: 2 });
      kit.box("officers_diffuser", cx, H - 0.095, cz, ax ? L : 0.26, 0.02, ax ? 0.26 : L, { uv: "keep" });
      kit.box(mat, cx, H - 0.11, cz, ax ? L - 0.1 : 0.045, 0.02, ax ? 0.045 : L - 0.1, { uv: "keep" });
    };
    strip(-6.65, min[2] + 0.8, -6.65, max[2] - 0.8); // entry corridor
    strip(spineFrom + 0.7, 0, spineTo - 0.4, 0); // spine
    // cabin lamps: a square warm panel in a dark bezel over each cabin's middle
    for (const c of [cab1, cab2, cab3, cab4]) {
      const cx = (c.xa + c.xb) / 2;
      const cz = (c.za + c.zb) / 2;
      kit.box("paintedMetal", cx, H - 0.08, cz, 1.5, 0.16, 1.5, { color: PALETTE.impBlack, texel: 2 });
      kit.box("officers_warm_soft", cx, H - 0.165, cz, 1.3, 0.01, 1.3, { uv: "keep" });
    }
    // washroom: cool strip; wardroom: two warm panels
    strip(wash.xa + 0.6, (wash.za + wash.zb) / 2, wash.xb - 0.6, (wash.za + wash.zb) / 2);
    for (const dx of [-1.5, 1.5]) {
      const cx = (ward.xa + ward.xb) / 2 + dx;
      const cz = (ward.za + ward.zb) / 2;
      kit.box("paintedMetal", cx, H - 0.08, cz, 1.1, 0.16, 1.1, { color: PALETTE.impBlack, texel: 2 });
      kit.box("officers_warm", cx, H - 0.165, cz, 0.9, 0.01, 0.9, { uv: "keep" });
    }
  }

  // --- lights (6): a cool white at each end of the spine (the west one spills into the washroom and
  // wardroom, the east one into the entry corridor) and one warm practical just inside every cabin
  // door: it lights the entry wall seen through the opening and (point lights ignore walls) throws a
  // warm pool onto the corridor deck and the facing wall, so each doorway reads as an open, lit cabin
  // (hung at mid-height so no ceiling or wall patch sits close enough to clip)
  ctx.light(pointLight(0xe8f0ff, 2.6, 11.0, [-8.4, 2.2, 0]));
  ctx.light(pointLight(0xf1ede4, 2.6, 10.5, [-20.4, 2.2, 0]));
  for (const c of [cab1, cab2, cab3, cab4]) {
    const sz = c.corridor === "zmin" ? 1 : -1;
    const near = sz > 0 ? c.za : c.zb;
    const sx = c.doorX - c.xa < c.xb - c.doorX ? 1 : -1;
    ctx.light(pointLight(0xffc48a, 6.5, 8.5, [c.doorX + sx * 0.9, 2.6, near + sz * 1.3]));
  }
  if (ctx.audioZone) ctx.audioZone({ id: "officers_hum", pos: [-16, 1.2, 0], radius: 10, loop: "hum_low" });
}

// ---------------------------------------------------------------------------
// Partitions and door frames
// ---------------------------------------------------------------------------
const DARK_STYLES = { panel: 0.82, vent: 0.05, greeble: 0.03, strip: 0.1, screen: 0, conduit: 0 };

/**
 * Full-height partition from a to b (deck-local [x, z]), T thick: two back-to-back Imperial panel
 * walls. A wall frame running a→b faces N = (-dz, 0, dx); `faces` = [style of the +N face, style of
 * the -N face] ("light" corridor finish or "dark" cabin finish). `openingsAt` = [[c0, c1, h]] in the
 * coordinate that varies along the wall (x for walls along x, z for walls along z).
 */
function partition(kit, ctx, a, b, H, { seed = 1, openingsAt = [], faces = ["light", "dark"] } = {}) {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const L = Math.hypot(dx, dz);
  const ux = dx / L;
  const uz = dz / L;
  const nx = -uz;
  const nz = ux;
  const alongX = Math.abs(ux) > 0.5;
  const start = alongX ? a[0] : a[1];
  const sign = Math.sign(alongX ? ux : uz);
  const ops = (flip) =>
    openingsAt.map(([c0, c1, h]) => {
      let u0 = (c0 - start) * sign;
      let u1 = (c1 - start) * sign;
      if (u0 > u1) [u0, u1] = [u1, u0];
      if (flip) [u0, u1] = [L - u1, L - u0];
      return { type: "door", u0, u1, v0: 0, v1: h };
    });
  const style = (k) => (k === "light" ? { styles: CORR_STYLES, paints: CORR_PAINTS } : { styles: DARK_STYLES, paints: IMP_PAINTS_DARK });
  const o = T / 2;
  impWall(kit, ctx, "zmin", { from: [a[0] + nx * o, a[1] + nz * o], to: [b[0] + nx * o, b[1] + nz * o], height: H, noDoors: true, openings: ops(false), seed: seed * 7 + 1, tag: "partition", panelW: 1.15, ...style(faces[0]) });
  impWall(kit, ctx, "zmin", { from: [b[0] - nx * o, b[1] - nz * o], to: [a[0] - nx * o, a[1] - nz * o], height: H, noDoors: true, openings: ops(true), seed: seed * 7 + 2, tag: "partition", panelW: 1.15, ...style(faces[1]) });
  // top cap so the two faces read as one solid wall
  kit.box("paintedMetal", (a[0] + b[0]) / 2, H - 0.01, (a[1] + b[1]) / 2, alongX ? L : T + 0.02, 0.02, alongX ? T + 0.02 : L, { color: PALETTE.impDark, texel: 2 });
}

/**
 * Open door frame in a spine wall at (x, zWall): jambs, lintel with a light strip, threshold, name
 * plate. `extra` varies the fittings beside each door: "readout" (occupancy screen), "dnd" (red
 * sub-plate), "keypad" (entry keypad), "vacant" (blue sub-plate); `lampSide` puts the status lamp
 * east (+1) or west (-1) of the opening.
 */
function doorFrame(kit, ctx, labels, x, zWall, w, h, corridorDir, label, { wide = false, extra = null, lamp = "emitAmber", lampSide = 1, extraSide = -lampSide } = {}) {
  // corridorDir: -1 → corridor is on the -z side of the wall, +1 → on the +z side
  const z0 = zWall - T / 2 - 0.03;
  const z1 = zWall + T / 2 + 0.03;
  for (const s of [-1, 1]) {
    const jx = x + s * (w / 2 + 0.06);
    kit.boxMM("paintedMetal", [jx - 0.06, 0, z0], [jx + 0.06, h + 0.12, z1], { color: PALETTE.impGrey, texel: 1.5 });
    kit.boxMM("paintedMetal", [jx - 0.02, 0.05, z0 - 0.005], [jx + 0.02, h + 0.1, z1 + 0.005], { color: PALETTE.impBlack, texel: 2 });
    kit.collider([jx - 0.06, 0, z0], [jx + 0.06, h + 0.12, z1], "jamb");
    // warm reveal light down the inner face of each jamb (the open-door track light): the far jamb's
    // face looks back along the corridor, so every open door shows a lit edge even at a grazing angle
    kit.box("officers_warm_soft", jx - s * 0.064, h / 2 + 0.05, zWall, 0.008, h - 0.4, 0.016, { uv: "keep" });
  }
  kit.boxMM("paintedMetal", [x - w / 2 - 0.12, h, z0], [x + w / 2 + 0.12, h + 0.14, z1], { color: PALETTE.impGrey, texel: 1.5 });
  kit.collider([x - w / 2 - 0.12, h, z0], [x + w / 2 + 0.12, 3.6, z1], "lintel");
  // lintel light on the corridor face and a soft one inside
  const zc = corridorDir > 0 ? z1 + 0.008 : z0 - 0.008;
  const zi = corridorDir > 0 ? z0 - 0.008 : z1 + 0.008;
  kit.box("emitWhiteDim", x, h + 0.07, zc, w - 0.1, 0.03, 0.012, { uv: "keep" });
  kit.box("officers_warm", x, h + 0.07, zi, w - 0.1, 0.03, 0.012, { uv: "keep" });
  // threshold strip and the plate above the lintel on the corridor side
  kit.box("paintedMetal", x, 0.006, zWall, w + 0.24, 0.012, T + 0.06, { color: PALETTE.impBlack, texel: 2 });
  const zf = corridorDir > 0 ? z1 + 0.02 : z0 - 0.02; // corridor face of the frame
  const yaw = corridorDir > 0 ? 0 : Math.PI;
  const out = (d) => zf + corridorDir * d; // d metres out from the face into the corridor
  signAt(kit, labels, label, { x, y: h + 0.14 + 0.2, z: zf, yaw, h: wide ? 0.2 : 0.16 });
  // status lamp beside the door (amber = occupied, blue = vacant, red = do not disturb)
  const lx = x + lampSide * (w / 2 + 0.3);
  kit.box("paintedMetal", lx, 1.45, zf, 0.12, 0.2, 0.04, { color: PALETTE.impBlack, texel: 2 });
  kit.box(lamp, lx, 1.5, out(0.025), 0.05, 0.05, 0.01);
  // per-door fittings beside the door (pushed out past the lamp when they share its side)
  const ex = x + extraSide * (w / 2 + 0.42 + (extraSide === lampSide ? 0.4 : 0));
  const plateAt = (i, ph) => signAt(kit, labels, i, { x: ex + extraSide * ((ph * labels.aspect(i)) / 2 - 0.15), y: 1.5, z: zf, yaw, h: ph });
  switch (extra) {
    case "readout": {
      // occupancy / environment readout: dark housing, a small lit screen, two indicator dots
      kit.box("paintedMetal", ex, 1.5, zf, 0.34, 0.46, 0.06, { color: PALETTE.impDark, texel: 2 });
      kit.add("impScreen4", new THREE.PlaneGeometry(0.26, 0.16).rotateY(yaw), { pos: [ex, 1.58, out(0.032)], uv: "keep" });
      kit.box("emitBlue", ex - 0.08, 1.36, out(0.032), 0.05, 0.03, 0.006);
      kit.box("emitAmberDim", ex + 0.08, 1.36, out(0.032), 0.05, 0.03, 0.006);
      break;
    }
    case "keypad": {
      // entry keypad: 3×3 keys with one lit, a slot reader below
      kit.box("paintedMetal", ex, 1.42, zf, 0.26, 0.4, 0.05, { color: PALETTE.impBlack, texel: 2 });
      for (let k = 0; k < 9; k++) {
        const kx = ex - 0.06 + (k % 3) * 0.06;
        const ky = 1.56 - Math.floor(k / 3) * 0.06;
        kit.box(k === 4 ? "emitBlue" : "rubber", kx, ky, out(0.028), 0.045, 0.045, 0.008, { color: PALETTE.rubber });
      }
      kit.box("metal", ex, 1.29, out(0.03), 0.16, 0.02, 0.012, { color: PALETTE.steel });
      break;
    }
    case "dnd":
      plateAt(10, 0.085);
      break;
    case "vacant":
      plateAt(11, 0.075);
      break;
  }
  void ctx;
}

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------
/** One officer's cabin. `c` = { xa, xb, za, zb, corridor: "zmin"|"zmax", doorX }; `variant` 0..3 for small differences. */
function cabin(kit, ctx, labels, c, variant) {
  const rand = rng(ctx.seed + 101 + variant * 7);
  const bounds = [
    [c.xa, 0, c.za],
    [c.xb, 3.6, c.zb],
  ];
  const sz = c.corridor === "zmin" ? 1 : -1; // +1: far wall is zb (north cabins)
  const nearZ = sz > 0 ? c.za : c.zb; // corridor wall face
  const farZ = sz > 0 ? c.zb : c.za;
  const doorNearXa = c.doorX - c.xa < c.xb - c.doorX; // door near the west wall → free side is east
  const sx = doorNearXa ? 1 : -1;
  const mx = (off) => (sx > 0 ? c.xa + off : c.xb - off); // offset from the wall on the door side
  const mz = (off) => nearZ + sz * off; // offset from the corridor wall
  const D = Math.abs(farZ - nearZ);
  const W = Math.abs(c.xb - c.xa);
  const farSide = sz > 0 ? "zmax" : "zmin";
  const eastWest = sx > 0 ? "xmax" : "xmin"; // wall opposite the door side (desk wall)

  // bunk along the far wall, head against the side wall on the door side
  const bx0 = mx(0.12);
  const bx1 = mx(2.15);
  const bz0 = mz(D - 1.0);
  const bz1 = mz(D - 0.06);
  const bxA = Math.min(bx0, bx1);
  const bxB = Math.max(bx0, bx1);
  const bzA = Math.min(bz0, bz1);
  const bzB = Math.max(bz0, bz1);
  kit.boxMM("paintedMetal", [bxA, 0, bzA], [bxB, 0.42, bzB], { color: PALETTE.impDark, texel: 1.5 });
  kit.boxMM("paintedMetal", [bxA + 0.03, 0.42, bzA + 0.03], [bxB - 0.03, 0.46, bzB - 0.03], { color: PALETTE.impBlack, texel: 2 });
  kit.boxMM("emitWhiteSoft", [bxA + 0.15, 0.08, sz > 0 ? bzA - 0.005 : bzB - 0.005], [bxB - 0.15, 0.1, sz > 0 ? bzA + 0.007 : bzB + 0.007], { uv: "keep" });
  // drawers in the base
  for (let k = 0; k < 2; k++) {
    const dx = bxA + 0.55 + k * 1.0;
    kit.box("impPanel1", dx, 0.22, sz > 0 ? bzA - 0.01 : bzB + 0.01, 0.85, 0.28, 0.02, { color: PALETTE.impGrey, uv: "keep" });
    kit.box("metal", dx, 0.22, sz > 0 ? bzA - 0.03 : bzB + 0.03, 0.25, 0.02, 0.03, { color: PALETTE.steel });
  }
  // mattress, sheet fold, pillow, folded blanket at the foot
  const mattress = new RoundedBoxGeometry(bxB - bxA - 0.1, 0.16, bzB - bzA - 0.1, 3, 0.05);
  kit.add("fabric", mattress, { pos: [(bxA + bxB) / 2, 0.54, (bzA + bzB) / 2], color: PALETTE.impLight, uv: "world", texel: 2 });
  const sheet = new RoundedBoxGeometry(bxB - bxA - 0.9, 0.05, bzB - bzA - 0.16, 2, 0.02);
  kit.add("fabric", sheet, { pos: [sx > 0 ? bxB - (bxB - bxA - 0.9) / 2 - 0.05 : bxA + (bxB - bxA - 0.9) / 2 + 0.05, 0.645, (bzA + bzB) / 2], color: PALETTE.impMid, uv: "world", texel: 2 });
  const pillow = new RoundedBoxGeometry(0.42, 0.11, 0.55, 3, 0.05);
  kit.add("fabric", pillow, { pos: [mx(0.42), 0.68, (bzA + bzB) / 2], rot: [0, (rand() - 0.5) * 0.2, 0], color: PALETTE.impLight, uv: "world", texel: 2 });
  const blanket = new RoundedBoxGeometry(0.45, 0.12, 0.6, 2, 0.04);
  kit.add("fabric", blanket, { pos: [mx(1.85), 0.68, (bzA + bzB) / 2 + 0.05], color: [PALETTE.impMid, MAROON, PALETTE.impDark, OLIVE][variant], uv: "world", texel: 2 });
  kit.collider([bxA, 0, bzA], [bxB, 0.7, bzB], "bunk");
  // reading lamp on the head wall over the pillow: bracket, arm and a frosted shade that glows
  {
    const hx = sx > 0 ? c.xa : c.xb; // head wall face
    const lz = (bzA + bzB) / 2 - 0.15 * sz;
    kit.box("paintedMetal", hx + sx * 0.03, 1.32, lz, 0.06, 0.16, 0.12, { color: PALETTE.impDark, texel: 2 });
    kit.cyl("metal", hx + sx * 0.2, 1.36, lz, 0.012, 0.34, "x", { color: PALETTE.steel, segments: 8 });
    kit.box("paintedMetal", hx + sx * 0.38, 1.365, lz, 0.18, 0.03, 0.18, { color: PALETTE.impBlack, texel: 2 });
    kit.box("officers_warm", hx + sx * 0.38, 1.29, lz, 0.15, 0.12, 0.15, { uv: "keep" });
    kit.box("emitAmber", hx + sx * 0.062, 1.28, lz + 0.04, 0.01, 0.02, 0.02);
  }
  // warm cove along the top of the far wall and the head wall: dark lip with a lit underside
  for (const side of [farSide, sx > 0 ? "xmin" : "xmax"]) {
    const seg = wallSegment(bounds, side);
    const { frame, length } = wallFrame(kit, seg.from, seg.to, 0);
    frame.box("paintedMetal", length / 2, 3.3, 0.12, length - 0.1, 0.16, 0.24, { color: PALETTE.impDark, texel: 2 });
    frame.box("officers_cove", length / 2, 3.216, 0.19, length - 0.4, 0.012, 0.08, { uv: "keep" });
  }
  // frosted light box on the far wall above the shelf: the lit rectangle that reads through the door
  {
    const lbx = mx(1.12);
    const lbz = farZ - sz * 0.04;
    kit.box("paintedMetal", lbx, 2.12, lbz, 1.5, 0.44, 0.08, { color: PALETTE.impBlack, texel: 2 });
    kit.box("officers_warm_soft", lbx, 2.12, lbz - sz * 0.045, 1.36, 0.3, 0.01, { uv: "keep" });
    kit.box("paintedMetal", lbx, 2.12, lbz - sz * 0.05, 1.36, 0.02, 0.012, { color: PALETTE.impDark, texel: 3 });
  }
  // wall shelf above the bunk on the far wall with personal items
  {
    const sy = 1.45;
    const szz = sz > 0 ? farZ - 0.14 : farZ + 0.14;
    const sxa = mx(0.35);
    const sxb = mx(1.9);
    kit.boxMM("paintedMetal", [Math.min(sxa, sxb), sy, Math.min(szz - 0.14, farZ)], [Math.max(sxa, sxb), sy + 0.03, Math.max(szz + 0.14, farZ)], { color: PALETTE.impGrey, texel: 2 });
    kit.boxMM("emitWhiteSoft", [Math.min(sxa, sxb) + 0.1, sy - 0.012, Math.min(szz - 0.1, farZ)], [Math.max(sxa, sxb) - 0.1, sy, Math.max(szz - 0.08, farZ)], { uv: "keep" });
    const items = variant;
    mug(kit, mx(0.55), sy + 0.03, szz, items % 2 ? PALETTE.impLight : PALETTE.impGrey);
    datapad(kit, mx(0.95), sy + 0.03, szz, 0.3 + variant * 0.4, (variant + 1) % 5);
    // a small framed holo-portrait / plaque, a row of books (thin boxes), a trinket
    kit.box("paintedMetal", mx(1.4), sy + 0.12, szz, 0.18, 0.18, 0.02, { color: PALETTE.impBlack, texel: 3 });
    kit.box("impScreen" + ((variant + 3) % 5), mx(1.4), sy + 0.12, szz + sz * 0.012, 0.14, 0.14, 0.004, { uv: "keep" });
    for (let k = 0; k < 3 + (variant % 2); k++) kit.box("paintedMetal", mx(1.62 + k * 0.045), sy + 0.11, szz - sz * 0.02, 0.035, 0.16 + (k % 2) * 0.03, 0.14, { color: [PALETTE.impDark, PALETTE.impRed, PALETTE.impMid, PALETTE.impGrey][k % 4], texel: 3 });
    if (variant === 2) kit.add("metal", new THREE.OctahedronGeometry(0.06), { pos: [mx(1.2), sy + 0.09, szz], color: PALETTE.steel });
  }
  // entry alcove on the side wall just inside the door — the strip of cabin that shows through the
  // opening from the corridor: a dark backing panel carrying a tall warm light column, a narrow
  // status screen and indicator dots, so the doorway reads as a lit interior even at a grazing angle
  {
    const fx = mx(0); // face of the door-side wall (partition panels sit behind their frame plane)
    const ez = mz(0.3);
    kit.box("paintedMetal", fx + sx * 0.02, 1.2, mz(0.47), 0.04, 1.9, 0.62, { color: PALETTE.impBlack, texel: 2 });
    kit.box("paintedMetal", fx + sx * 0.05, 1.3, ez, 0.06, 1.62, 0.2, { color: PALETTE.impDark, texel: 2 });
    kit.box("officers_warm", fx + sx * 0.085, 1.3, ez, 0.01, 1.5, 0.12, { uv: "keep" });
    kit.box("metal", fx + sx * 0.06, 2.13, ez, 0.1, 0.02, 0.22, { color: PALETTE.steel });
    kit.box("metal", fx + sx * 0.06, 0.47, ez, 0.1, 0.02, 0.22, { color: PALETTE.steel });
    kit.add("impScreen" + ((variant + 1) % 5), new THREE.PlaneGeometry(0.22, 0.5).rotateY(sx > 0 ? Math.PI / 2 : -Math.PI / 2), { pos: [fx + sx * 0.045, 1.55, mz(0.6)], uv: "keep" });
    for (let k = 0; k < 3; k++) kit.box(k === 1 ? "emitAmberDim" : "emitBlueDim", fx + sx * 0.045, 1.15 - k * 0.07, mz(0.6), 0.006, 0.03, 0.06);
  }
  // desk against the wall opposite the door side, screen above, chair in front
  {
    const dxA = sx > 0 ? c.xb - 0.7 : c.xa;
    const dxB = sx > 0 ? c.xb : c.xa + 0.7;
    const dz0 = mz(0.75);
    const dz1 = mz(2.35);
    const dzA = Math.min(dz0, dz1);
    const dzB = Math.max(dz0, dz1);
    kit.boxMM("paintedMetal", [dxA, 0.7, dzA], [dxB, 0.76, dzB], { color: PALETTE.impDark, texel: 1.5 });
    kit.boxMM("darkGloss", [dxA + 0.02, 0.76, dzA + 0.02], [dxB - 0.02, 0.775, dzB - 0.02]);
    // pedestal with drawers on the far end, a leg on the near end
    kit.boxMM("paintedMetal", [dxA + 0.05, 0, sz > 0 ? dzB - 0.5 : dzA], [dxB - 0.05, 0.7, sz > 0 ? dzB : dzA + 0.5], { color: PALETTE.impMid, texel: 1.5 });
    for (let k = 0; k < 3; k++) kit.box("metal", sx > 0 ? dxA + 0.03 : dxB - 0.03, 0.15 + k * 0.2, sz > 0 ? dzB - 0.25 : dzA + 0.25, 0.02, 0.02, 0.2, { color: PALETTE.steel });
    kit.box("paintedMetal", (dxA + dxB) / 2, 0.35, sz > 0 ? dzA + 0.06 : dzB - 0.06, 0.06, 0.7, 0.06, { color: PALETTE.impBlack, texel: 2 });
    kit.collider([dxA, 0, dzA], [dxB, 0.78, dzB], "desk");
    // desk screen on an arm + keyboard + a lamp
    const scx = sx > 0 ? dxB - 0.15 : dxA + 0.15;
    const scz = (dzA + dzB) / 2;
    kit.box("paintedMetal", scx, 0.95, scz, 0.05, 0.36, 0.08, { color: PALETTE.impBlack, texel: 2 });
    kit.box("darkGloss", scx - sx * 0.06, 1.16, scz, 0.02, 0.44, 0.7);
    kit.add("impScreen" + ((variant * 2 + 1) % 5), new THREE.PlaneGeometry(0.66, 0.4).rotateY(sx > 0 ? -Math.PI / 2 : Math.PI / 2), { pos: [scx - sx * 0.072, 1.16, scz], uv: "keep" });
    kit.box("paintedMetal", sx > 0 ? dxA + 0.25 : dxB - 0.25, 0.79, scz, 0.34, 0.02, 0.14, { color: PALETTE.impBlack, texel: 3 });
    for (let k = 0; k < 6; k++) kit.box(k === 2 ? "emitBlue" : "rubber", (sx > 0 ? dxA + 0.14 : dxB - 0.36) + k * 0.045, 0.805, scz - 0.03, 0.035, 0.01, 0.03, { color: PALETTE.rubber });
    datapad(kit, (dxA + dxB) / 2, 0.775, sz > 0 ? dzA + 0.25 : dzB - 0.25, 0.5, variant % 5);
    if (variant !== 1) mug(kit, sx > 0 ? dxA + 0.15 : dxB - 0.15, 0.775, sz > 0 ? dzB - 0.15 : dzA + 0.15, PALETTE.impLight);
    if (variant === 1) crateSmall(kit, sx > 0 ? dxA + 0.2 : dxB - 0.2, 0.775, sz > 0 ? dzB - 0.2 : dzA + 0.2);
    // desk lamp on the far end of the desk: steel stem, angled warm shade
    {
      const lx = sx > 0 ? dxB - 0.2 : dxA + 0.2;
      const lz = sz > 0 ? dzB - 0.14 : dzA + 0.14;
      kit.cyl("paintedMetal", lx, 0.79, lz, 0.07, 0.03, "y", { color: PALETTE.impBlack, segments: 12 });
      kit.cyl("metal", lx, 1.0, lz, 0.01, 0.4, "y", { color: PALETTE.steel, segments: 8 });
      kit.box("paintedMetal", lx - sx * 0.08, 1.22, lz, 0.22, 0.05, 0.14, { color: PALETTE.impBlack, texel: 3 });
      kit.box("officers_warm", lx - sx * 0.08, 1.19, lz, 0.18, 0.012, 0.1, { uv: "keep" });
    }
    impChair(kit, ctx, { x: sx > 0 ? dxA - 0.45 : dxB + 0.45, z: scz + (rand() - 0.5) * 0.3, yaw: -sx * Math.PI / 2 + (rand() - 0.5) * 0.5 });
    // wall screen over the desk's door end and a hooded task light along the desk
    const wsz = mz(1.15);
    wallScreen(kit, ctx, { side: eastWest, u: sx > 0 ? wsz - c.za : c.zb - wsz, v: 2.0, w: 1.0, h: 0.6, screen: (variant + 2) % 5, bounds });
    const wf = mx(W); // face of the desk wall
    kit.box("paintedMetal", wf - sx * 0.07, 1.42, (dzA + dzB) / 2, 0.14, 0.06, dzB - dzA - 0.2, { color: PALETTE.impDark, texel: 2 });
    kit.box("officers_warm", wf - sx * 0.08, 1.388, (dzA + dzB) / 2, 0.08, 0.008, dzB - dzA - 0.32, { uv: "keep" });
  }
  // locker on the corridor wall in the corner by the desk (out of the sightline through the door,
  // which looks diagonally across the cabin), with a mirror strip and a decal
  {
    const lx = mx(W - 0.61);
    const lz0 = mz(0.02);
    const lz1 = mz(0.62);
    kit.boxMM("paintedMetal", [lx - 0.4, 0, Math.min(lz0, lz1)], [lx + 0.4, 2.05, Math.max(lz0, lz1)], { color: PALETTE.impDark, texel: 1.5 });
    kit.boxMM("impPanel1", [lx - 0.36, 0.1, Math.min(lz0, lz1) + (sz > 0 ? 0.6 : -0.01)], [lx + 0.36, 1.98, Math.max(lz0, lz1) + (sz > 0 ? 0.01 : -0.6)], { color: variant % 2 ? PALETTE.impGrey : PALETTE.impLight, uv: "keep" });
    const face = mz(0.635);
    kit.box("paintedMetal", lx, 1.05, face, 0.02, 1.85, 0.008, { color: PALETTE.impBlack, texel: 3 });
    kit.box("metal", lx + 0.2, 1.1, face + sz * 0.015, 0.03, 0.16, 0.02, { color: PALETTE.steel });
    kit.box("emitBlue", lx - 0.2, 1.9, face + sz * 0.004, 0.06, 0.02, 0.006);
    kit.add("decal", new THREE.PlaneGeometry(0.24, 0.24).rotateY(sz > 0 ? 0 : Math.PI), { pos: [lx - 0.2, 1.55, face + sz * 0.004], uv: "keep", uvRect: decalRect([0, 14, 2, 9][variant]) });
    kit.collider([lx - 0.4, 0, Math.min(lz0, lz1)], [lx + 0.4, 2.05, Math.max(lz0, lz1)], "locker");
    // boots / a kit bag on the floor beside the locker (door side)
    if (variant % 2 === 0) {
      kit.box("rubber", lx - sx * 0.6, 0.06, mz(0.3), 0.12, 0.12, 0.3, { color: PALETTE.impBlack });
      kit.box("rubber", lx - sx * 0.75, 0.06, mz(0.32), 0.12, 0.12, 0.3, { color: PALETTE.impBlack });
    } else {
      kit.add("fabric", new RoundedBoxGeometry(0.55, 0.32, 0.3, 2, 0.08), { pos: [lx - sx * 0.75, 0.16, mz(0.35)], color: PALETTE.impMid, uv: "world", texel: 2 });
    }
    // duty tunic on a wall hook between the door and the locker: boxy grey-green jacket, black belt, rank plaque, cap on a peg
    {
      const ux = lx - sx * 1.25;
      const uz = mz(0.16);
      kit.box("metal", ux, 1.98, mz(0.18), 0.04, 0.08, 0.06, { color: PALETTE.steel });
      const cloth = variant % 2 ? OLIVE : PALETTE.impMid;
      // shoulders / torso taper, a hanger bar showing at the neck, belt with a buckle, rank plaque
      kit.add("fabric", new RoundedBoxGeometry(0.5, 0.26, 0.15, 2, 0.05), { pos: [ux, 1.8, uz + sz * 0.09], color: cloth, uv: "world", texel: 2 });
      kit.add("fabric", new RoundedBoxGeometry(0.42, 0.5, 0.12, 2, 0.04), { pos: [ux, 1.46, uz + sz * 0.085], color: cloth, uv: "world", texel: 2 });
      kit.box("paintedMetal", ux, 1.9, uz + sz * 0.09, 0.14, 0.05, 0.16, { color: PALETTE.impBlack, texel: 3 });
      kit.box("rubber", ux, 1.32, uz + sz * 0.09, 0.44, 0.06, 0.14, { color: PALETTE.impBlack });
      kit.box("metal", ux, 1.32, uz + sz * 0.165, 0.06, 0.04, 0.01, { color: PALETTE.steel });
      for (let k = 0; k < 4; k++) kit.box(k < 2 ? "emitBlue" : "emitRed", ux - sx * 0.12 + k * 0.03, 1.8, uz + sz * 0.17, 0.024, 0.02, 0.004);
      // cap on the second peg
      kit.box("metal", ux + sx * 0.4, 1.98, mz(0.18), 0.04, 0.08, 0.06, { color: PALETTE.steel });
      kit.add("fabric", new RoundedBoxGeometry(0.26, 0.12, 0.2, 2, 0.04), { pos: [ux + sx * 0.4, 1.9, uz + sz * 0.1], rot: [0.3 * sz, 0, 0], color: PALETTE.impDark, uv: "world", texel: 2 });
    }
  }
  // footlocker at the bunk's foot end, a rug, a mirror on the corridor wall on the door's other side
  kit.box("impPanel1", mx(2.45), 0.25, mz(D - 0.55), 0.5, 0.5, 0.8, { color: PALETTE.impMid, uv: "keep" });
  kit.box("paintedMetal", mx(2.45), 0.51, mz(D - 0.55), 0.52, 0.02, 0.82, { color: PALETTE.impBlack, texel: 2 });
  kit.collider([mx(2.45) - 0.26, 0, mz(D - 0.55) - 0.41], [mx(2.45) + 0.26, 0.52, mz(D - 0.55) + 0.41], "footlocker");
  kit.box("fabric", (c.xa + c.xb) / 2 + sx * 0.3, 0.006, mz(D / 2 + 0.3), 1.8, 0.012, 1.2, { color: variant % 2 ? PALETTE.impMid : PALETTE.impDark, uv: "world", texel: 1.5 });
  // ceiling-hung vent + a conduit dropping to the desk lamp; scuffs at the door
  {
    const seg = wallSegment(bounds, farSide);
    const { frame, length } = wallFrame(kit, seg.from, seg.to, 0);
    ventGrille(frame, length / 2 + (sx > 0 ? 0.9 : -0.9), 2.8, 0.8, 0.3);
    signPlate(frame, labels, [1, 2, 3, 4][c.n - 1], { u: length / 2 - (sx > 0 ? 0.9 : -0.9), v: 2.6, h: 0.16 });
  }
  floorScuffs(kit, c.doorX, mz(0.5), { n: 4, len: 0.6, yaw: Math.PI / 2, seed: 31 + variant });
}

/** Small personal case sitting on a desk. */
function crateSmall(kit, x, y, z) {
  kit.box("paintedMetal", x, y + 0.08, z, 0.3, 0.16, 0.22, { color: PALETTE.impGrey, texel: 3 });
  kit.box("paintedMetal", x, y + 0.165, z, 0.32, 0.01, 0.24, { color: PALETTE.impBlack, texel: 3 });
  kit.box("emitAmber", x + 0.1, y + 0.1, z + 0.115, 0.04, 0.01, 0.006);
}

/** Shared washroom: basin counter with mirrors along the west wall, two shower stalls, bench, wet floor. */
function washroom(kit, ctx, labels, r) {
  const bounds = [
    [r.xa, 0, r.za],
    [r.xb, 3.6, r.zb],
  ];
  const cx = (r.xa + r.xb) / 2;
  const cz = (r.za + r.zb) / 2;
  // raised wet floor with a drain channel along the middle
  kit.boxMM("floorGloss", [r.xa + 0.05, 0, r.za + 0.05], [r.xb - 0.05, 0.05, r.zb - 0.05], { texel: 0.5 });
  kit.boxMM("paintedMetal", [r.xa + 0.05, 0.05, r.za + 0.05], [r.xb - 0.05, 0.06, r.zb - 0.05], { color: PALETTE.impBlack, texel: 2 });
  kit.boxMM("floorGloss", [r.xa + 0.1, 0.06, r.za + 0.1], [r.xb - 0.1, 0.075, r.zb - 0.1], { texel: 0.5 });
  kit.collider([r.xa, 0, r.za], [r.xb, 0.075, r.zb], "wetfloor");
  for (let k = 0; k < 6; k++) kit.cyl("metal", r.xa + 1.0 + k * 0.9, 0.078, cz, 0.06, 0.006, "y", { color: PALETTE.impBlack, segments: 12 });
  // basins along the west wall
  {
    const seg = wallSegment(bounds, "xmin");
    const { frame, length } = wallFrame(kit, seg.from, seg.to, 0);
    // u runs from zmax (u=0) to zmin along the xmin wall
    frame.box("paintedMetal", length / 2, 0.45, 0.3, length - 1.0, 0.9, 0.6, { color: PALETTE.impDark, texel: 1.5 });
    frame.box("impPanel1", length / 2, 0.5, 0.605, length - 1.2, 0.72, 0.02, { color: PALETTE.impLight, uv: "keep" });
    frame.box("darkGloss", length / 2, 0.915, 0.32, length - 0.9, 0.03, 0.64);
    frame.box("emitWhiteSoft", length / 2, 0.12, 0.61, length - 1.4, 0.015, 0.01, { uv: "keep" });
    frame.collider(0.5, length - 0.5, 0, 0.93, 0, 0.62, "basins");
    for (let k = 0; k < 3; k++) {
      const u = length / 2 - 1.5 + k * 1.5;
      frame.box("paintedMetal", u, 0.94, 0.32, 0.5, 0.05, 0.4, { color: PALETTE.impLight, texel: 2 });
      frame.box("paintedMetal", u, 0.955, 0.32, 0.4, 0.01, 0.3, { color: PALETTE.impBlack, texel: 2 });
      frame.cylV("metal", u, 1.05, 0.12, 0.02, 0.22, { color: PALETTE.steel, segments: 10 });
      frame.cylN("metal", u, 1.15, 0.2, 0.015, 0.2, { color: PALETTE.steel, segments: 8 });
      // mirror + light bar above it
      frame.box("paintedMetal", u, 1.75, 0.03, 0.72, 0.92, 0.04, { color: PALETTE.impGrey, texel: 2 });
      frame.box("darkGloss", u, 1.75, 0.052, 0.64, 0.84, 0.006);
      frame.box("emitWhiteSoft", u, 2.28, 0.06, 0.6, 0.04, 0.03, { uv: "keep" });
      if (k !== 1) mug(kit, ...frame.pos(u + 0.3, 0.945, 0.15).toArray(), PALETTE.impLight);
    }
    signPlate(frame, labels, 5, { u: length / 2, v: 2.9, h: 0.16 });
    ventGrille(frame, 0.7, 3.15, 0.8, 0.3);
  }
  // two shower stalls against the north wall (zmax) in the east half, glass fronts
  {
    const sz0 = r.zb - 1.1;
    for (let k = 0; k < 2; k++) {
      const sx0 = r.xb - 0.15 - (k + 1) * 1.15;
      const sx1 = sx0 + 1.1;
      // side partitions and a back panel, tray on the floor
      for (const x of [sx0, sx1]) kit.boxMM("impPanel", [x - 0.02, 0.075, sz0], [x + 0.02, 2.2, r.zb - 0.02], { color: PALETTE.impLight, uv: "keep" });
      kit.boxMM("paintedMetal", [sx0, 0.075, sz0 - 0.02], [sx1, 0.11, r.zb], { color: PALETTE.impBlack, texel: 2 });
      kit.boxMM("bridgeGlass", [sx0 + 0.04, 0.11, sz0 - 0.01], [sx1 - 0.04, 2.1, sz0 + 0.01]);
      kit.boxMM("paintedMetal", [sx0 - 0.03, 2.2, sz0 - 0.03], [sx1 + 0.03, 2.28, r.zb], { color: PALETTE.impDark, texel: 2 });
      kit.box("emitWhiteSoft", (sx0 + sx1) / 2, 2.19, (sz0 + r.zb) / 2, 0.8, 0.015, 0.3, { uv: "keep" });
      // shower head + controls on the back wall
      kit.cyl("metal", (sx0 + sx1) / 2, 1.9, r.zb - 0.25, 0.012, 0.4, "z", { color: PALETTE.steel, segments: 8 });
      kit.cyl("metal", (sx0 + sx1) / 2, 1.9, r.zb - 0.48, 0.09, 0.02, "y", { color: PALETTE.steel, segments: 14 });
      kit.box("paintedMetal", (sx0 + sx1) / 2, 1.2, r.zb - 0.03, 0.2, 0.3, 0.05, { color: PALETTE.impGrey, texel: 3 });
      kit.box("emitBlue", (sx0 + sx1) / 2, 1.3, r.zb - 0.06, 0.06, 0.02, 0.01);
      kit.collider([sx0 - 0.03, 0, sz0 - 0.03], [sx1 + 0.03, 2.3, r.zb], "stall");
    }
  }
  // bench in the middle, towel rail with towels on the east partition, hamper
  kit.box("paintedMetal", cx + 0.6, 0.25, cz - 0.4, 1.6, 0.06, 0.4, { color: PALETTE.impGrey, texel: 2 });
  for (const dx of [-0.65, 0.65]) kit.box("paintedMetal", cx + 0.6 + dx, 0.15, cz - 0.4, 0.08, 0.16, 0.36, { color: PALETTE.impDark, texel: 2 });
  kit.collider([cx - 0.2, 0.075, cz - 0.6], [cx + 1.4, 0.3, cz - 0.2], "bench");
  {
    const seg = wallSegment(bounds, "xmax");
    const { frame, length } = wallFrame(kit, seg.from, seg.to, 0);
    // u runs from zmin (u=0) to zmax along the xmax wall
    frame.cylU("metal", 2.0, 1.35, 0.1, 0.015, 1.6, { color: PALETTE.steel });
    for (const [du, col] of [[-0.45, PALETTE.impLight], [0.05, PALETTE.impGrey], [0.5, PALETTE.impLight]]) frame.box("fabric", 2.0 + du, 1.05, 0.08, 0.36, 0.62, 0.05, { color: col, uv: "world", texel: 2 });
    frame.box("impPanel1", 0.6, 0.4, 0.3, 0.6, 0.65, 0.5, { color: PALETTE.impMid, uv: "keep" });
    frame.box("paintedMetal", 0.6, 0.735, 0.3, 0.62, 0.02, 0.52, { color: PALETTE.impBlack, texel: 2 });
    frame.collider(0.25, 0.95, 0, 0.75, 0, 0.6, "hamper");
    wallScreen(kit, ctx, { side: "xmax", u: 3.6, v: 1.8, w: 0.8, h: 0.5, screen: 4, bounds });
    void length;
  }
  floorScuffs(kit, r.doorX, r.za + 0.6, { n: 3, len: 0.5, yaw: Math.PI / 2, seed: 61, y: 0.075 });
}

/** Officers' wardroom: sofa, low table with chairs, caf counter, big screen, a standing lamp. */
function wardroom(kit, ctx, labels, sheets, r) {
  const bounds = [
    [r.xa, 0, r.za],
    [r.xb, 3.6, r.zb],
  ];
  const cx = (r.xa + r.xb) / 2;
  const cz = (r.za + r.zb) / 2;
  // rug and a low table with four chairs
  kit.box("fabric", cx, 0.006, cz + 0.2, 3.6, 0.012, 2.6, { color: PALETTE.impDark, uv: "world", texel: 1.5 });
  kit.box("paintedMetal", cx, 0.25, cz + 0.2, 1.5, 0.5, 0.8, { color: PALETTE.impMid, texel: 1.5 });
  kit.box("darkGloss", cx, 0.515, cz + 0.2, 1.56, 0.03, 0.86);
  kit.box("emitAmber", cx, 0.12, cz + 0.2 - 0.405, 1.3, 0.015, 0.01);
  kit.collider([cx - 0.78, 0, cz - 0.23], [cx + 0.78, 0.53, cz + 0.63], "table");
  // chairs at the ends and on the sofa side only, so the walk in from the door to the table stays clear
  for (const [dx, dz, yaw] of [[-1.15, 0.1, -Math.PI / 2 + 0.2], [1.15, 0.3, Math.PI / 2 - 0.15], [-0.4, -1.05, 0.1], [0.45, -1.05, -0.2]]) impChair(kit, ctx, { x: cx + dx, z: cz + 0.2 + dz, yaw });
  mug(kit, cx - 0.4, 0.53, cz + 0.1, PALETTE.impLight);
  mug(kit, cx + 0.35, 0.53, cz + 0.35, PALETTE.impGrey);
  datapad(kit, cx + 0.1, 0.53, cz + 0.05, -0.3, 1);
  // holo-board game: a hex board with tokens
  kit.box("paintedMetal", cx - 0.1, 0.535, cz + 0.4, 0.5, 0.02, 0.5, { color: PALETTE.impBlack, texel: 3 });
  kit.box("emitBlue", cx - 0.1, 0.546, cz + 0.4, 0.44, 0.003, 0.44);
  for (let k = 0; k < 7; k++) kit.cyl(k % 2 ? "emitAmber" : "emitRed", cx - 0.3 + (k % 4) * 0.13, 0.565, cz + 0.28 + Math.floor(k / 4) * 0.2, 0.03, 0.03, "y", { segments: 10 });
  // sofa along the south wall
  {
    const seg = wallSegment(bounds, "zmin");
    const { frame, length } = wallFrame(kit, seg.from, seg.to, 0);
    // u runs from xmin (u=0) to xmax along the zmin wall
    const su = length / 2 + 0.2;
    frame.box("paintedMetal", su, 0.2, 0.42, 3.0, 0.4, 0.84, { color: PALETTE.impDark, texel: 1.5 });
    frame.add("fabric", new RoundedBoxGeometry(2.9, 0.16, 0.74, 3, 0.05), su, 0.48, 0.44, { color: PALETTE.impMid, uv: "world", texel: 2 });
    frame.add("fabric", new RoundedBoxGeometry(2.9, 0.6, 0.18, 3, 0.05), su, 0.78, 0.12, { color: PALETTE.impMid, uv: "world", texel: 2 });
    for (const du of [-1.0, 0, 1.0]) frame.add("fabric", new RoundedBoxGeometry(0.86, 0.5, 0.12, 3, 0.04), su + du, 0.8, 0.24, { color: PALETTE.impDark, uv: "world", texel: 2, tilt: 0.12 });
    for (const s of [-1, 1]) frame.box("paintedMetal", su + s * 1.5, 0.45, 0.42, 0.08, 0.9, 0.84, { color: PALETTE.impGrey, texel: 2 });
    frame.box("emitWhiteSoft", su, 0.06, 0.845, 2.6, 0.015, 0.01, { uv: "keep" });
    frame.collider(su - 1.55, su + 1.55, 0, 1.0, 0, 0.86, "sofa");
    // cushion left on the sofa and a datapad
    frame.add("fabric", new RoundedBoxGeometry(0.4, 0.4, 0.12, 3, 0.05), su - 1.1, 0.78, 0.4, { color: PALETTE.impLight, uv: "world", texel: 2, tilt: 0.3 });
    // three framed sector charts over the sofa with a picture light each
    for (const du of [-1.0, 0, 1.0]) {
      frame.box("paintedMetal", su + du, 1.95, 0.03, 0.86, 1.06, 0.05, { color: PALETTE.impBlack, texel: 2 });
      frame.add(sheets.key, new THREE.PlaneGeometry(0.7, 0.875), su + du, 1.95, 0.058, { uv: "keep", uvRect: sheets.rect((du + 2) % 4) });
      frame.box("paintedMetal", su + du, 2.56, 0.08, 0.5, 0.03, 0.14, { color: PALETTE.impDark, texel: 3 });
      frame.box("officers_warm", su + du, 2.54, 0.1, 0.42, 0.01, 0.06, { uv: "keep" });
    }
    // warm cove along the top of the sofa wall
    frame.box("paintedMetal", length / 2, 3.3, 0.12, length - 0.1, 0.16, 0.24, { color: PALETTE.impDark, texel: 2 });
    frame.box("officers_cove", length / 2, 3.216, 0.19, length - 0.4, 0.012, 0.08, { uv: "keep" });
    // standing lamp in the corner: a frosted drum shade that glows
    const lp = frame.pos(0.5, 0, 0.5);
    kit.cyl("paintedMetal", lp.x, 0.02, lp.z, 0.22, 0.04, "y", { color: PALETTE.impBlack, segments: 16 });
    kit.cyl("metal", lp.x, 0.85, lp.z, 0.02, 1.62, "y", { color: PALETTE.steel, segments: 8 });
    kit.cyl("officers_warm", lp.x, 1.8, lp.z, 0.17, 0.3, "y", { segments: 20, uv: "keep" });
    kit.cyl("paintedMetal", lp.x, 1.96, lp.z, 0.19, 0.03, "y", { color: PALETTE.impBlack, segments: 20 });
    kit.cyl("paintedMetal", lp.x, 1.64, lp.z, 0.19, 0.03, "y", { color: PALETTE.impBlack, segments: 20 });
    kit.collider([lp.x - 0.22, 0, lp.z - 0.22], [lp.x + 0.22, 2.0, lp.z + 0.22], "lamp");
    ventGrille(frame, length - 0.8, 2.85, 0.8, 0.3);
  }
  // big screen on the west wall with a plaque, caf counter on the east partition wall
  wallScreen(kit, ctx, { side: "xmin", u: (r.zb - r.za) / 2, v: 1.75, w: 2.2, h: 1.2, screen: 0, bounds });
  {
    const seg = wallSegment(bounds, "xmin");
    const { frame, length } = wallFrame(kit, seg.from, seg.to, 0);
    signPlate(frame, labels, 6, { u: length / 2, v: 2.75, h: 0.2 });
    // low sideboard under the screen with bottles and glasses
    frame.box("paintedMetal", length / 2, 0.35, 0.25, 2.4, 0.7, 0.5, { color: PALETTE.impDark, texel: 1.5 });
    frame.box("impPanel1", length / 2, 0.38, 0.505, 2.2, 0.56, 0.01, { color: PALETTE.impGrey, uv: "keep" });
    frame.box("darkGloss", length / 2, 0.715, 0.25, 2.46, 0.03, 0.56);
    frame.collider(length / 2 - 1.2, length / 2 + 1.2, 0, 0.73, 0, 0.52, "sideboard");
    for (let k = 0; k < 4; k++) {
      const p = frame.pos(length / 2 - 0.8 + k * 0.35, 0.73, 0.25);
      kit.cyl("darkGloss", p.x, 0.73 + 0.13, p.z, 0.04, 0.26, "y", { segments: 10 });
      kit.cyl("metal", p.x, 0.73 + 0.29, p.z, 0.015, 0.06, "y", { color: PALETTE.steel, segments: 8 });
    }
    for (let k = 0; k < 3; k++) mug(kit, ...frame.pos(length / 2 + 0.6 + k * 0.16, 0.73, 0.3 - (k % 2) * 0.12).toArray(), k === 1 ? PALETTE.impGrey : PALETTE.impLight);
  }
  {
    const seg = wallSegment(bounds, "xmax");
    const { frame, length } = wallFrame(kit, seg.from, seg.to, 0);
    // u runs from zmin (u=0) to zmax along the xmax wall: caf dispenser counter toward the south corner
    const cu = 1.6;
    frame.box("paintedMetal", cu, 0.45, 0.3, 1.8, 0.9, 0.6, { color: PALETTE.impDark, texel: 1.5 });
    frame.box("impPanel1", cu, 0.5, 0.605, 1.6, 0.7, 0.02, { color: PALETTE.impLight, uv: "keep" });
    frame.box("darkGloss", cu, 0.915, 0.3, 1.86, 0.03, 0.66);
    frame.box("emitWhiteSoft", cu, 0.1, 0.61, 1.4, 0.015, 0.01, { uv: "keep" });
    frame.collider(cu - 0.9, cu + 0.9, 0, 0.93, 0, 0.62, "counter");
    // dispenser
    frame.box("paintedMetal", cu - 0.4, 1.25, 0.3, 0.5, 0.64, 0.45, { color: PALETTE.impLight, texel: 2 });
    frame.box("impScreen4", cu - 0.4, 1.4, 0.53, 0.2, 0.1, 0.006, { uv: "keep" });
    frame.box("emitAmber", cu - 0.4, 1.1, 0.53, 0.3, 0.012, 0.006);
    frame.box("metal", cu - 0.4, 1.0, 0.45, 0.06, 0.1, 0.2, { color: PALETTE.steel });
    for (const [du, dn, col] of [[0.25, 0.25, PALETTE.impLight], [0.42, 0.18, PALETTE.impGrey], [0.6, 0.3, PALETTE.impLight]]) mug(kit, ...frame.pos(cu + du, 0.93, dn).toArray(), col);
    // shelf above with ration tins
    frame.box("paintedMetal", cu, 1.7, 0.16, 1.6, 0.03, 0.3, { color: PALETTE.impGrey, texel: 2 });
    for (let k = 0; k < 6; k++) kit.cyl("metal", ...frame.pos(cu - 0.6 + k * 0.24, 1.78, 0.16).toArray(), 0.06, 0.13, "y", { color: k % 2 ? PALETTE.steel : PALETTE.impRed, segments: 12 });
    frame.box("emitWhiteSoft", cu, 1.69, 0.28, 1.4, 0.01, 0.02, { uv: "keep" });
    wallScreen(kit, ctx, { side: "xmax", u: length - 1.2, v: 1.8, w: 1.1, h: 0.65, screen: 2, bounds });
  }
  floorScuffs(kit, r.doorX, r.zb - 0.6, { n: 4, len: 0.6, yaw: Math.PI / 2, seed: 71 });
}

// ---------------------------------------------------------------------------
// Corridors
// ---------------------------------------------------------------------------
function entryCorridor(kit, ctx, labels, XE, H) {
  const [min, max] = ctx.bounds;
  const door = ctx.doors[0];
  const dz = door ? door.pos[1] : 0;
  // door mat, scuffs, wall screens flanking the lobby door on the xmax wall
  kit.box("fabric", max[0] - 0.9, 0.006, dz, 1.2, 0.012, 1.8, { color: PALETTE.impDark, uv: "world", texel: 1.5 });
  floorScuffs(kit, max[0] - 1.2, dz, { n: 6, len: 0.9, yaw: 0, seed: 81 });
  {
    const seg = wallSegment(ctx.bounds, "xmax");
    const { frame, length } = wallFrame(kit, seg.from, seg.to, 0);
    // u runs from zmin (u=0) to zmax
    const uDoor = dz - min[2];
    signPlate(frame, labels, 0, { u: uDoor, v: 3.2, h: 0.24 });
    wallScreen(kit, ctx, { side: "xmax", u: uDoor - 2.6, v: 1.8, w: 1.2, h: 0.7, screen: 0 });
    wallScreen(kit, ctx, { side: "xmax", u: uDoor + 2.6, v: 1.8, w: 1.2, h: 0.7, screen: 2 });
    signPlate(frame, labels, 8, { u: uDoor + 2.6, v: 2.45, h: 0.13 });
    ventGrille(frame, 0.8, 3.15, 0.9, 0.3);
    ventGrille(frame, length - 0.8, 3.15, 0.9, 0.3);
    // comm panel by the door
    frame.box("paintedMetal", uDoor - 1.5, 1.4, 0.05, 0.34, 0.5, 0.1, { color: PALETTE.impDark, texel: 2 });
    frame.box("impScreen4", uDoor - 1.5, 1.5, 0.101, 0.26, 0.16, 0.006, { uv: "keep" });
    frame.box("emitBlue", uDoor - 1.55, 1.25, 0.101, 0.05, 0.03, 0.006);
    frame.box("emitAmber", uDoor - 1.43, 1.25, 0.101, 0.05, 0.03, 0.006);
  }
  // against the partition (its corridor face at XE + T/2): emergency cabinet north, bench south, directory sign
  const fx = XE + T / 2;
  kit.boxMM("paintedMetal", [fx, 0, 4.6], [fx + 0.32, 1.9, 5.5], { color: PALETTE.impDark, texel: 1.5 });
  kit.boxMM("impPanel1", [fx + 0.32, 0.1, 4.66], [fx + 0.335, 1.82, 5.44], { color: PALETTE.impLight, uv: "keep" });
  kit.box("emitRedSoft", fx + 0.34, 1.55, 5.05, 0.008, 0.16, 0.5, { uv: "keep" });
  kit.add("decal", new THREE.PlaneGeometry(0.4, 0.4).rotateY(Math.PI / 2), { pos: [fx + 0.34, 1.0, 5.05], uv: "keep", uvRect: decalRect(13) });
  kit.collider([fx, 0, 4.6], [fx + 0.34, 1.9, 5.5], "cabinet");
  signAt(kit, labels, 9, { x: fx + 0.35, y: 2.1, z: 5.05, yaw: Math.PI / 2, h: 0.11 });
  // bench
  kit.boxMM("paintedMetal", [fx + 0.02, 0.38, -5.9], [fx + 0.5, 0.44, -4.1], { color: PALETTE.impGrey, texel: 2 });
  for (const z of [-5.75, -4.25]) kit.boxMM("paintedMetal", [fx + 0.06, 0, z - 0.04], [fx + 0.46, 0.38, z + 0.04], { color: PALETTE.impDark, texel: 2 });
  kit.collider([fx, 0, -5.9], [fx + 0.5, 0.45, -4.1], "bench");
  kit.box("fabric", fx + 0.26, 0.47, -5.0, 0.44, 0.06, 1.7, { color: PALETTE.impBlack, uv: "world", texel: 2 });
  // directory over the spine mouth
  signAt(kit, labels, 7, { x: fx + 0.03, y: 3.15, z: 0, yaw: Math.PI / 2, h: 0.17 });
  // floor runner along the corridor (plain: the studs read as a runway)
  kit.box("rubber", (XE + T / 2 + max[0]) / 2, 0.004, 0, 1.2, 0.008, max[2] - min[2] - 1.0, { color: PALETTE.rubber, texel: 1.5 });
  // wall-base conduit on the partition side from the cabinet toward the mouth
  pipeRun(kit, [[fx + 0.1, 0.25, 4.5], [fx + 0.1, 0.25, 1.5]], 0.03, PALETTE.steel);
  // small return-air grilles high on the partition face either side of the mouth
  {
    // xmin-style frame: normal +x into the corridor, u runs from zmax to zmin
    const { frame } = wallFrame(kit, [fx, max[2]], [fx, min[2]], 0);
    for (const z of [-4.2, 3.0]) ventGrille(frame, max[2] - z, 3.05, 0.8, 0.28);
  }
  void H;
}

function spineCorridor(kit, ctx, labels, x0, x1, H) {
  // plain floor runner
  kit.box("rubber", (x0 + 0.3 + x1) / 2, 0.004, 0, x1 - x0 - 0.6, 0.008, 1.2, { color: PALETTE.rubber, texel: 1.5 });
  // end wall (xmin) between the washroom and wardroom doors: screen over a low bench
  const bx = x0 + 0.42;
  wallScreen(kit, ctx, { side: "xmin", u: ctx.bounds[1][2] - 0, v: 1.75, w: 1.4, h: 0.8, screen: 2 });
  kit.boxMM("paintedMetal", [x0 + 0.02, 0, -0.8], [bx + 0.3, 0.42, 0.8], { color: PALETTE.impDark, texel: 1.5 });
  kit.boxMM("impPanel1", [x0 + 0.05, 0.42, -0.75], [bx + 0.28, 0.46, 0.75], { color: PALETTE.impGrey, uv: "keep" });
  kit.boxMM("emitWhiteSoft", [bx + 0.3, 0.1, -0.6], [bx + 0.31, 0.12, 0.6], { uv: "keep" });
  kit.collider([x0, 0, -0.8], [bx + 0.3, 0.46, 0.8], "bench");
  datapad(kit, bx - 0.1, 0.46, 0.3, 0.4, 3);
  // faint wall-base guide strips along both spine walls (faces at z = ±1.2) and a few return-air grilles
  // high on the corridor faces (the panel grid places none there)
  for (const s of [-1, 1]) {
    const zf = s * 1.2;
    kit.boxMM("emitWhiteFaint", [x0 + 0.5, 0.14, Math.min(zf - s * 0.012, zf - s * 0.024)], [x1 - 0.3, 0.16, Math.max(zf - s * 0.012, zf - s * 0.024)], { uv: "keep" });
  }
  // breaks in the plate rows: a status screen, access hatches, a comm point and equipment racks,
  // placed in the runs between the doors (north face u = x1 - x, south face u = x - x0)
  const cb = [
    [x0, 0, -1.2],
    [x1, H, 1.2],
  ];
  {
    // north face (z = +1.2) looks -z: zmax-style frame, u from x1 down to x0; south face: zmin-style, u from x0
    const n = wallFrame(kit, [x1, 1.2], [x0, 1.2], 0).frame;
    const sth = wallFrame(kit, [x0, -1.2], [x1, -1.2], 0).frame;
    for (const x of [-10.2, -15.0, -19.2]) ventGrille(n, x1 - x, 3.05, 0.8, 0.28);
    for (const x of [-11.8, -18.4]) ventGrille(sth, x - x0, 3.05, 0.8, 0.28);
    wallScreen(kit, ctx, { side: "zmax", u: x1 + 11.3, v: 1.85, w: 1.2, h: 0.7, screen: 1, bounds: cb });
    accessHatch(n, labels, x1 + 16.2, 1.15);
    wallRack(n, x1 + 18.6, 7);
    accessHatch(sth, labels, -12.6 - x0, 1.15);
    commPoint(sth, labels, -14.6 - x0);
    wallRack(sth, -18.6 - x0, 12);
  }
}

/** Square access hatch: recessed dark surround, grey plate with four bolts and a bar handle, a label above. */
function accessHatch(frame, labels, u, v) {
  frame.box("paintedMetal", u, v, -0.005, 1.0, 1.0, 0.05, { color: PALETTE.impBlack, texel: 2 });
  frame.box("impPanel1", u, v, 0.02, 0.86, 0.86, 0.04, { color: PALETTE.impGrey, uv: "keep" });
  for (const [du, dv] of [[-0.36, -0.36], [0.36, -0.36], [-0.36, 0.36], [0.36, 0.36]]) frame.cylN("metal", u + du, v + dv, 0.04, 0.025, 0.012, { color: PALETTE.steel, segments: 8 });
  frame.box("metal", u, v - 0.02, 0.06, 0.28, 0.03, 0.03, { color: PALETTE.steel });
  for (const s of [-1, 1]) frame.box("metal", u + s * 0.13, v - 0.02, 0.045, 0.03, 0.03, 0.05, { color: PALETTE.steel });
  frame.box("emitAmberDim", u + 0.3, v + 0.3, 0.041, 0.05, 0.02, 0.004);
  signPlate(frame, labels, 12, { u, v: v + 0.62, h: 0.07 });
}

/** Shallow wall-mounted equipment rack: dark case, stacked slot faces with a few lit indicators. */
function wallRack(frame, u, seed) {
  const rand = rng(seed);
  frame.box("paintedMetal", u, 1.15, 0.09, 0.9, 1.6, 0.18, { color: PALETTE.impDark, texel: 1.5 });
  frame.box("paintedMetal", u, 1.15, 0.185, 0.8, 1.5, 0.01, { color: PALETTE.impBlack, texel: 2 });
  let y = 0.45;
  while (y < 1.85) {
    const sh = 0.1 + rand() * 0.16;
    frame.box("metal", u, y + sh / 2, 0.195, 0.72, sh - 0.03, 0.012, { color: rand() < 0.5 ? PALETTE.impMid : PALETTE.impGrey, texel: 2 });
    const nl = 1 + Math.floor(rand() * 3);
    for (let i = 0; i < nl; i++) frame.box(rand() < 0.2 ? "emitRedDim" : "emitBlueDim", u - 0.28 + i * 0.07, y + sh / 2, 0.205, 0.03, 0.015, 0.006);
    if (rand() < 0.35) frame.box("leds", u + 0.15, y + sh / 2, 0.205, 0.3, 0.02, 0.006, { uv: "keep" });
    y += sh + 0.03;
  }
  frame.collider(u - 0.45, u + 0.45, 0, 1.95, 0, 0.19, "rack");
}

/** Comm point: a small dark panel with a lit screen, a speaker grille and a call key, labelled. */
function commPoint(frame, labels, u) {
  frame.box("paintedMetal", u, 1.45, 0.04, 0.4, 0.62, 0.08, { color: PALETTE.impDark, texel: 2 });
  frame.box("impScreen4", u, 1.6, 0.082, 0.3, 0.18, 0.006, { uv: "keep" });
  for (let k = 0; k < 4; k++) frame.box("metal", u, 1.36 - k * 0.035, 0.082, 0.26, 0.012, 0.004, { color: PALETTE.impBlack });
  frame.box("emitBlue", u - 0.1, 1.22, 0.084, 0.06, 0.04, 0.006);
  frame.box("rubber", u + 0.08, 1.22, 0.086, 0.1, 0.05, 0.01, { color: PALETTE.rubber });
  signPlate(frame, labels, 13, { u, v: 1.87, h: 0.06 });
}
