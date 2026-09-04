// Communications & Sensor Control (deck 1): a long signals room off the bridge corridor. A wall of
// stacked signal screens faces the door, a rotating holographic sensor sweep sits in the middle,
// two operator stations face the screen wall, cable trunks run along the ceiling into a patch-panel
// wall of racks, and antenna feed pipes come down the opposite wall. Blue/green accents.
// Deck-local metres, floor y = 0. Bounds x 2.4..16, z -13..-4, height 3.6; door on the xmin wall at z -9.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { PALETTE } from "../../materials.js";
import { roomShell, impConsole, equipmentRack, wallScreen, pipeRun, wallSegment, IMP_STYLES_TECH } from "../imperial.js";
import { pointLight, wallFrame, X_AXIS } from "../builders.js";
import { rng } from "../../kit.js";
import { decalRect } from "../../textures.js";

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const BLACK = { color: PALETTE.impBlack, texel: 2 };
const DARK = { color: PALETTE.impDark, texel: 1.5 };

export function buildComms(kit, ctx) {
  const B = ctx.bounds;
  const [min, max] = B;
  const H = max[1] - min[1];
  const mats = ensureMaterials(ctx);
  roomShell(kit, ctx, {
    floor: { texel: 0.33 },
    ceiling: {
      rowH: 1.5,
      panelW: 1.5,
      spacing: 4.5,
      maxLights: 3,
      lightColor: 0xdfe9ff,
      lightIntensity: 9,
      lightDistance: 11,
      paints: [
        [PALETTE.impMid, 0.55],
        [PALETTE.impDark, 0.3],
        [PALETTE.impGrey, 0.15],
      ],
      styles: { panel: 0.78, greeble: 0.1, vent: 0.12 },
    },
    walls: {
      styles: IMP_STYLES_TECH,
      paints: [
        [PALETTE.impGrey, 0.42],
        [PALETTE.impLight, 0.18],
        [PALETTE.impMid, 0.28],
        [PALETTE.impDark, 0.12],
      ],
      rows: [0, 0.5, 1.6, 2.7, H],
      panelW: 1.1,
      cove: true,
    },
  });
  buildScreenWall(kit, ctx, B);
  buildPatchWall(kit, ctx, B, H);
  buildFeedWall(kit, ctx, B, H);
  buildDoorWall(kit, ctx, B);
  buildStations(kit, ctx);
  sensorHolo(kit, ctx, mats, 10.2, -8.5);
  buildFloorDetail(kit, ctx, B);
  ctx.light(pointLight(0x4a9dff, 4, 6, [10.2, 2.4, -8.5]));
  ctx.light(pointLight(0x4cff88, 2.5, 5, [9.5, 2.6, -12.2]));
  ctx.anim((dt, t) => {
    mats.pulse.emissiveIntensity = 1.2 + 0.35 * Math.sin(t * 2.3) + 0.1 * Math.sin(t * 9.1);
    mats.green.emissiveIntensity = 1.6 + 0.5 * (0.5 + 0.5 * Math.sin(t * 1.3));
  });
  ctx.audioZone({ kind: "comms", center: [9.2, 1.6, -8.5], radius: 8 });
}

function ensureMaterials(ctx) {
  const m = ctx.materials;
  if (!m.cms_pulse) {
    m.cms_pulse = m.impScreen2.clone();
    m.cms_pulse.name = "cms_pulse";
    m.cms_green = m.emitGreen.clone();
    m.cms_green.name = "cms_green";
    m.cms_sweep = m.holo.clone();
    m.cms_sweep.opacity = 0.8;
    m.cms_sweep.color = new THREE.Color("#7fe0c8");
    m.cms_faint = m.holo.clone();
    m.cms_faint.opacity = 0.16;
  }
  return { pulse: m.cms_pulse, green: m.cms_green, sweep: m.cms_sweep, faint: m.cms_faint };
}

// ---------------------------------------------------------------------------
// xmax wall (x 16): the signal wall, 3 rows x 6 stacked screens in one black bezel frame, a status
// band above and a readout strip below
// ---------------------------------------------------------------------------
function buildScreenWall(kit, ctx, B) {
  const seg = wallSegment(B, "xmax");
  const { frame, length } = wallFrame(kit, seg.from, seg.to, B[0][1]);
  const cols = 6;
  const rows = 3;
  const cw = 1.18;
  const ch = 0.66;
  const gap = 0.08;
  const W = cols * cw + (cols + 1) * gap;
  const Hh = rows * ch + (rows + 1) * gap;
  const uc = length / 2;
  const vc = 1.72;
  frame.box("paintedMetal", uc, vc, 0.1, W + 0.3, Hh + 0.3, 0.2, BLACK);
  frame.box("impPanel", uc, vc, 0.202, W + 0.1, Hh + 0.1, 0.01, { color: PALETTE.impDark, uv: "keep" });
  const rand = rng(ctx.seed + 21);
  const pick = [0, 1, 2, 2, 0, 1, 4, 2, 0, 1, 2, 0, 1, 2, 0, 4, 2, 1];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const u = uc - W / 2 + gap + cw / 2 + c * (cw + gap);
      const v = vc - Hh / 2 + gap + ch / 2 + r * (ch + gap);
      const i = r * cols + c;
      frame.box("darkGloss", u, v, 0.21, cw, ch, 0.01);
      const mat = i === 8 ? "cms_pulse" : "impScreen" + pick[i % pick.length];
      frame.add(mat, new THREE.PlaneGeometry(cw - 0.06, ch - 0.06), u, v, 0.216, { uv: "keep" });
      frame.box(rand() < 0.75 ? "emitBlue" : "cms_green", u - cw / 2 + 0.1, v - ch / 2 + 0.04, 0.216, 0.05, 0.02, 0.01);
    }
  }
  // status band above (green/blue lamps and a stencil), readout strip below
  frame.box("paintedMetal", uc, vc + Hh / 2 + 0.45, 0.06, W + 0.3, 0.36, 0.12, DARK);
  for (let i = 0; i < 14; i++) frame.box(i % 4 === 3 ? "emitAmber" : i % 3 === 1 ? "cms_green" : "emitBlue", uc - W / 2 + 0.5 + i * 0.5, vc + Hh / 2 + 0.45, 0.125, 0.22, 0.06, 0.01);
  frame.add("decal", new THREE.PlaneGeometry(0.5, 0.5), uc - W / 2 - 0.55, vc + Hh / 2 + 0.2, 0.001, { uv: "keep", uvRect: decalRect(6) });
  frame.add("decal", new THREE.PlaneGeometry(0.5, 0.5), uc + W / 2 + 0.55, vc + Hh / 2 + 0.2, 0.001, { uv: "keep", uvRect: decalRect(9) });
  frame.box("paintedMetal", uc, vc - Hh / 2 - 0.33, 0.08, W + 0.3, 0.3, 0.16, BLACK);
  frame.box("leds", uc, vc - Hh / 2 - 0.33, 0.165, W - 0.4, 0.06, 0.01, { uv: "keep" });
  frame.collider(uc - W / 2 - 0.2, uc + W / 2 + 0.2, 0, vc + Hh / 2 + 0.7, 0, 0.25, "screenwall");
  // low equipment plinth under the wall with a blue kick strip
  frame.box("paintedMetal", uc, 0.3, 0.24, W - 0.6, 0.6, 0.48, DARK);
  frame.box("emitBlue", uc, 0.12, 0.485, W - 1.2, 0.02, 0.01);
  frame.collider(uc - W / 2 + 0.3, uc + W / 2 - 0.3, 0, 0.6, 0, 0.5, "plinth");
}

// ---------------------------------------------------------------------------
// zmin wall (z -13): patch-panel wall, a run of racks fed by a ceiling cable trunk with drops
// ---------------------------------------------------------------------------
function buildPatchWall(kit, ctx, B, H) {
  const [min, max] = B;
  const side = "zmin";
  const u = (x) => x - min[0];
  const racks = [6.0, 7.3, 8.6, 9.9, 11.2, 12.5, 13.8];
  racks.forEach((x, i) => equipmentRack(kit, ctx, { side, u: u(x), w: 1.2, h: 2.4, seed: ctx.seed + 30 + i, bounds: B, lit: i % 3 === 1 ? "cms_green" : "emitBlue" }));
  // main trunk along the wall at ceiling level and a second thinner one
  const zt = min[2] + 0.55;
  kit.boxMM("paintedMetal", [5.2, H - 0.32, zt - 0.2], [max[0] - 0.4, H - 0.02, zt + 0.2], BLACK);
  kit.boxMM("paintedMetal", [5.2, H - 0.2, zt + 0.32], [max[0] - 0.4, H - 0.02, zt + 0.5], DARK);
  // drops from the trunk into every rack top, with a connector block
  for (const x of racks) {
    kit.boxMM("paintedMetal", [x - 0.14, 2.4, zt - 0.14], [x + 0.14, H - 0.3, zt + 0.14], DARK);
    kit.box("paintedMetal", x, 2.55, zt, 0.44, 0.3, 0.44, BLACK);
    kit.box("emitBlue", x, 2.55, zt + 0.225, 0.2, 0.03, 0.01, {});
  }
  // feeder pipes from the room's centre line to the trunk
  for (const [x, r, col] of [[7.0, 0.06, PALETTE.impMid], [9.9, 0.045, PALETTE.impGrey], [12.5, 0.06, PALETTE.impMid]]) {
    pipeRun(kit, [[x, H - 0.12, -6.5], [x, H - 0.12, zt + 0.7], [x, H - 0.3, zt + 0.7]], r, col);
  }
  // patch label plates and a bank of small indicator lights between racks
  const seg = wallSegment(B, side);
  const { frame } = wallFrame(kit, seg.from, seg.to, min[1]);
  for (const x of racks) frame.box("impPanel", u(x), 2.75, 0.02, 0.8, 0.22, 0.02, { color: PALETTE.impLight, uv: "keep" });
  frame.add("decal", new THREE.PlaneGeometry(0.6, 0.6), u(4.6), 2.2, 0.001, { uv: "keep", uvRect: decalRect(2) });
  frame.box("leds", u(4.6), 1.5, 0.02, 0.9, 0.05, 0.02, { uv: "keep" });
  frame.box("leds", u(4.6), 1.3, 0.02, 0.9, 0.05, 0.02, { uv: "keep" });
  frame.box("darkGloss", u(4.6), 0.95, 0.02, 0.9, 0.5, 0.02);
  frame.add("impScreen1", new THREE.PlaneGeometry(0.8, 0.42), u(4.6), 0.95, 0.032, { uv: "keep" });
}

// ---------------------------------------------------------------------------
// zmax wall (z -4): antenna feed pipes running along the wall and down into a junction cabinet,
// two wall screens, a signal-strength board
// ---------------------------------------------------------------------------
function buildFeedWall(kit, ctx, B, H) {
  const [min, max] = B;
  const side = "zmax";
  const u = (x) => max[0] - x;
  const zw = max[2] - 0.32;
  // three feed pipes with clamps, stepping down into the junction cabinet at x 13
  const runs = [
    [H - 0.5, 0.075, PALETTE.impMid],
    [H - 0.82, 0.055, PALETTE.impGrey],
    [H - 1.1, 0.045, PALETTE.impDark],
  ];
  runs.forEach(([y, r, col], i) => {
    pipeRun(kit, [[5.6, y, zw - i * 0.14], [13.0 - i * 0.28, y, zw - i * 0.14], [13.0 - i * 0.28, 2.0, zw - i * 0.14]], r, col);
    for (let x = 6.4; x < 12.5; x += 1.6) kit.box("metal", x, y, zw - i * 0.14, 0.14, r * 2 + 0.06, r * 2 + 0.06, { color: PALETTE.impBlack });
  });
  // junction cabinet
  kit.boxMM("paintedMetal", [12.2, 0, max[2] - 0.62], [13.9, 2.0, max[2] - 0.02], DARK);
  kit.boxMM("impPanel", [12.3, 0.15, max[2] - 0.63], [13.8, 1.85, max[2] - 0.62], { color: PALETTE.impMid, uv: "keep" });
  for (let i = 0; i < 5; i++) kit.box(i === 2 ? "emitAmber" : "cms_green", 12.5 + i * 0.3, 1.5, max[2] - 0.64, 0.14, 0.05, 0.01, {});
  kit.box("leds", 13.05, 1.2, max[2] - 0.64, 1.2, 0.05, 0.01, { uv: "keep" });
  kit.box("hazard", 13.05, 0.04, max[2] - 0.32, 1.7, 0.08, 0.6, { texel: 3 });
  kit.collider([12.2, 0, max[2] - 0.62], [13.9, 2.0, max[2]], "junction");
  // wall screens + a signal-strength board
  wallScreen(kit, ctx, { side, u: u(7.0), v: 1.7, w: 1.6, h: 0.9, screen: 2, bounds: B });
  wallScreen(kit, ctx, { side, u: u(9.3), v: 1.7, w: 1.6, h: 0.9, screen: 0, bounds: B });
  const seg = wallSegment(B, side);
  const { frame } = wallFrame(kit, seg.from, seg.to, min[1]);
  const bu = u(11.0);
  frame.box("paintedMetal", bu, 1.6, 0.05, 1.1, 1.5, 0.1, BLACK);
  frame.box("impPanel1", bu, 1.6, 0.105, 1.0, 1.4, 0.01, { color: PALETTE.impDark, uv: "keep" });
  for (let i = 0; i < 8; i++) {
    const lit = i < 5;
    frame.box(lit ? (i < 3 ? "cms_green" : "emitAmber") : "rubber", bu - 0.3, 1.0 + i * 0.15, 0.115, 0.3, 0.09, 0.01, { color: PALETTE.rubber });
    frame.box(i < 6 ? "emitBlue" : "rubber", bu + 0.2, 1.0 + i * 0.15, 0.115, 0.3, 0.09, 0.01, { color: PALETTE.rubber });
  }
  frame.add("decal", new THREE.PlaneGeometry(0.36, 0.36), bu, 2.2, 0.115, { uv: "keep", uvRect: decalRect(12) });
  frame.add("decal", new THREE.PlaneGeometry(0.7, 0.7), u(5.6), 2.4, 0.001, { uv: "keep", uvRect: decalRect(14) });
}

// ---------------------------------------------------------------------------
// xmin wall (x 2.4): door wall, a rack and a locker either side of the door, sign over the door
// ---------------------------------------------------------------------------
function buildDoorWall(kit, ctx, B) {
  const [min, max] = B;
  const u = (z) => max[2] - z;
  equipmentRack(kit, ctx, { side: "xmin", u: u(-11.9), w: 1.2, h: 2.4, seed: ctx.seed + 50, bounds: B, lit: "cms_green" });
  equipmentRack(kit, ctx, { side: "xmin", u: u(-5.4), w: 1.0, h: 2.6, d: 0.5, seed: ctx.seed + 51, bounds: B, lit: "emitAmber" });
  const seg = wallSegment(B, "xmin");
  const { frame } = wallFrame(kit, seg.from, seg.to, min[1]);
  frame.box("paintedMetal", u(-9), 3.25, 0.05, 2.4, 0.3, 0.1, BLACK);
  frame.box("emitWhite", u(-9), 3.25, 0.105, 2.0, 0.1, 0.01);
  frame.add("decal", new THREE.PlaneGeometry(0.5, 0.5), u(-6.6), 2.0, 0.001, { uv: "keep", uvRect: decalRect(0) });
}

// ---------------------------------------------------------------------------
// Operator stations: two consoles facing the signal wall with chairs, headsets and datapads
// ---------------------------------------------------------------------------
function buildStations(kit, ctx) {
  const yaw = -Math.PI / 2; // console faces +X (the screen wall); operator sits at -X
  for (const [z, i] of [[-6.7, 0], [-10.3, 1]]) {
    const x = 13.6;
    impConsole(kit, ctx, { x, z, yaw, w: 2.0, d: 0.85, h: 0.98, screens: i ? [2, 0] : [0, 2], chair: true, seed: ctx.seed + 60 + i, lampMat: i ? "cms_green" : "emitBlue" });
    // riser with two screens facing the operator (the slab screens face the wall side)
    const q = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, yaw);
    const P = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyQuaternion(q).add(new THREE.Vector3(x, 0, z));
    const add = (mat, geo, lx, ly, lz, extra = {}) => {
      const p = P(lx, ly, lz);
      return kit.add(mat, geo, { pos: [p.x, p.y, p.z], quat: q, ...extra });
    };
    add("paintedMetal", new THREE.BoxGeometry(2.0, 0.62, 0.12), 0, 1.28, -0.38, DARK);
    for (const s of [-1, 1]) {
      add("darkGloss", new THREE.BoxGeometry(0.86, 0.5, 0.012), s * 0.48, 1.3, -0.313);
      add(s < 0 && i === 0 ? "cms_pulse" : "impScreen" + (s < 0 ? 1 : 2), new THREE.PlaneGeometry(0.8, 0.44), s * 0.48, 1.3, -0.306, { uv: "keep" });
    }
    add("leds", new THREE.BoxGeometry(0.6, 0.03, 0.01), 0.5, 1.02, -0.31, { uv: "keep" });
    // headset resting on the slab edge and a datapad
    const hq = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, -0.42));
    const hp = P(-0.55, 0.86, 0.32);
    const band = new THREE.TorusGeometry(0.09, 0.012, 6, 14, Math.PI);
    band.rotateX(-Math.PI / 2); // lies flat on the desk
    kit.add("metal", band, { pos: [hp.x, hp.y + 0.012, hp.z], quat: hq, color: PALETTE.impBlack });
    for (const s of [-1, 1]) {
      const cp = P(-0.55 + s * 0.09, 0.86, 0.32);
      kit.add("rubber", new THREE.BoxGeometry(0.035, 0.03, 0.06), { pos: [cp.x, cp.y + 0.015, cp.z], quat: hq, color: PALETTE.rubber });
    }
    const dp = P(0.6, 0.905, 0.3);
    kit.add("paintedMetal", new THREE.BoxGeometry(0.3, 0.015, 0.2), { pos: [dp.x, dp.y, dp.z], quat: hq, color: PALETTE.impBlack, texel: 3 });
    const pad = new THREE.PlaneGeometry(0.26, 0.16);
    pad.rotateX(-Math.PI / 2);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(hq);
    const dp2 = dp.clone().addScaledVector(up, 0.009);
    kit.add("impScreen4", pad, { pos: [dp2.x, dp2.y, dp2.z], quat: hq, uv: "keep" });
  }
  // a comms duty desk near the door wall: standing console facing the room with a mug and a headset
  impConsole(kit, ctx, { x: 6.2, z: -5.6, yaw: Math.PI, w: 1.5, d: 0.7, h: 1.0, screens: [1], seed: ctx.seed + 70, lampMat: "cms_green" });
  kit.cyl("metal", 6.7, 1.0, -5.62, 0.045, 0.1, "y", { color: PALETTE.impBlack, segments: 12 });
}

// ---------------------------------------------------------------------------
// Sensor sweep: octagonal pedestal with a holographic plot (disc, range rings, contacts with pins,
// a faint drum) and a rotating sweep (flat wedge + vertical scan blade)
// ---------------------------------------------------------------------------
function sensorHolo(kit, ctx, mats, x, z) {
  const top = 0.98;
  kit.cyl("paintedMetal", x, 0.05, z, 0.95, 0.1, "y", { color: PALETTE.impBlack, segments: 8 });
  kit.cyl("paintedMetal", x, 0.5, z, 0.78, 0.8, "y", { color: PALETTE.impDark, segments: 8 });
  kit.cyl("darkGloss", x, top - 0.04, z, 0.92, 0.08, "y", { segments: 8 });
  const flat = (geo, yy, mat, opts = {}) => {
    geo.rotateX(-Math.PI / 2);
    kit.add(mat, geo, { pos: [x, yy, z], ...opts });
  };
  flat(new THREE.RingGeometry(0.72, 0.78, 40), top + 0.004, "emitBlue");
  flat(new THREE.RingGeometry(0.84, 0.87, 40), top + 0.004, "metal", { color: PALETTE.impMid });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    kit.box(i % 2 ? "cms_green" : "emitBlue", x + Math.cos(a) * 0.8, 0.62, z + Math.sin(a) * 0.8, 0.08, 0.16, 0.08, {});
  }
  kit.box("leds", x, 0.3, z + 0.79, 0.9, 0.04, 0.01, { uv: "keep" });
  kit.collider([x - 0.95, 0, z - 0.95], [x + 0.95, top + 0.3, z + 0.95], "sensortable");

  const holo = ctx.materials.holo;
  const g = new THREE.Group();
  g.position.set(x, top + 0.02, z);
  const statics = [];
  const disc = new THREE.CircleGeometry(0.72, 48);
  disc.rotateX(-Math.PI / 2);
  statics.push(disc);
  for (const [r0, r1] of [[0.24, 0.255], [0.48, 0.495], [0.7, 0.74]]) {
    const rg = new THREE.RingGeometry(r0, r1, 48);
    rg.rotateX(-Math.PI / 2);
    rg.translate(0, 0.003, 0);
    statics.push(rg);
  }
  for (const a of [0, Math.PI / 2]) {
    const bar = new THREE.BoxGeometry(1.44, 0.004, 0.012);
    bar.rotateY(a);
    bar.translate(0, 0.003, 0);
    statics.push(bar);
  }
  const rand = rng(ctx.seed + 80);
  for (let i = 0; i < 8; i++) {
    const a = rand() * Math.PI * 2;
    const r = 0.12 + rand() * 0.56;
    const cy = 0.08 + rand() * 0.38;
    const cx = Math.cos(a) * r;
    const cz = Math.sin(a) * r;
    const c = new THREE.OctahedronGeometry(0.035);
    c.translate(cx, cy, cz);
    statics.push(c);
    const pin = new THREE.BoxGeometry(0.01, cy, 0.01);
    pin.translate(cx, cy / 2, cz);
    statics.push(pin);
  }
  for (const s of statics) if (!s.attributes.normal) s.computeVertexNormals();
  const sm = new THREE.Mesh(mergeGeometries(statics.map((s) => (s.index ? s.toNonIndexed() : s)), false), holo);
  sm.castShadow = false;
  sm.receiveShadow = false;
  g.add(sm);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.5, 40, 1, true), mats.faint);
  drum.position.y = 0.25;
  drum.castShadow = false;
  drum.receiveShadow = false;
  g.add(drum);
  // sweep: flat wedge on the disc + a vertical blade from the axis to the rim
  const sweep = new THREE.Group();
  const wedge = new THREE.Mesh(new THREE.CircleGeometry(0.72, 14, 0, Math.PI / 6), mats.sweep);
  wedge.rotation.x = -Math.PI / 2;
  wedge.position.y = 0.006;
  const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.48), mats.sweep);
  blade.position.set(0.36, 0.24, 0);
  blade.rotation.y = 0;
  for (const m of [wedge, blade]) {
    m.castShadow = false;
    m.receiveShadow = false;
  }
  sweep.add(wedge, blade);
  g.add(sweep);
  ctx.mesh(g);
  ctx.anim((dt, t) => {
    sweep.rotation.y = -t * 1.2;
    sm.rotation.y = t * 0.12;
    g.position.y = top + 0.02 + Math.sin(t * 0.7) * 0.015;
  });
}

// ---------------------------------------------------------------------------
// Floor: cable covers from the stations to the screen wall, hatch plate, door threshold
// ---------------------------------------------------------------------------
function buildFloorDetail(kit, ctx, B) {
  const [min, max] = B;
  for (const z of [-6.7, -10.3]) {
    kit.boxMM("paintedMetal", [14.1, 0, z - 0.12], [max[0] - 0.2, 0.05, z + 0.12], BLACK);
    kit.collider([14.1, 0, z - 0.12], [max[0] - 0.2, 0.05, z + 0.12], "trunk");
  }
  kit.boxMM("paintedMetal", [10.2 - 0.12, 0, -12.6], [10.2 + 0.12, 0.05, -9.5], BLACK);
  kit.collider([10.2 - 0.12, 0, -12.6], [10.2 + 0.12, 0.05, -9.5], "trunk");
  // hatch plate
  kit.box("paintedMetal", 7.6, 0.005, -11.2, 1.2, 0.01, 1.2, BLACK);
  kit.box("metal", 7.6, 0.01, -11.2, 1.0, 0.012, 1.0, { color: PALETTE.impMid, texel: 2 });
  // threshold: hazard-free dark plate and a stencil inside the door
  kit.boxMM("paintedMetal", [min[0], 0, -10.3], [min[0] + 0.3, 0.012, -7.7], BLACK);
  const dg = new THREE.PlaneGeometry(0.6, 0.6);
  dg.rotateX(-Math.PI / 2);
  kit.add("decal", dg, { pos: [min[0] + 1.6, 0.004, -9], uv: "keep", uvRect: decalRect(9) });
}
