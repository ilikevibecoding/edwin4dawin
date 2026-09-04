// Recreation Lounge — off-duty deck space in cool blue: a viewscreen gallery with rows of armchairs facing
// exterior feeds, two dejarik-style holo-game tables inside curved booths (animated holograms of pieces),
// a bar with back-bar shelving, bottles and glassware, a sabacc card table, café tables, a reading nook and a
// briefing stage with a wall display under a shadow-casting spot. Blue cove strips give the low ambient glow.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { IMP } from "../../core/palette.js";
import { Placer, computerBank, wallPanel, pillar } from "../../core/props.js";
import { DECAL, decalRect, screenRect, ledRect } from "../../textures.js";

export const meta = { id: "lounge", stream: "crew-rooms" };

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

const SEAT = new THREE.Color("#3b4660");
const SEAT_ALT = new THREE.Color("#4d515c");
const BOARD_LIGHT = new THREE.Color("#8e939b");
const STEEL_LIGHT = new THREE.Color("#b4bac2");

export function build(ctx) {
  const { kit, floor: F, ceil } = ctx;
  const { x0, x1, z0, z1 } = ctx.inner; // 4.25..31.75, -169.75..-130.25
  const DX = 18.5;
  const rand = ctx.rand;

  ctx.shell({ floorMat: "deckBlack", floorColor: IMP.plateDark, stripSpacing: 7, seed: 45, walls: { zmin: { styles: { plate: 0.8, panel: 0.1, screen: 0.1 } } } });
  // blue cove strip around the base of every wall (the ambient glow) — leaves the doorway gap
  const cove = (ax, az, bx, bz) => kit.boxMM("emitBlue", [Math.min(ax, bx), F + 0.36, Math.min(az, bz)], [Math.max(ax, bx), F + 0.39, Math.max(az, bz)], {});
  cove(x0 + 0.02, z0 + 0.02, x1 - 0.02, z0 + 0.05);
  cove(x0 + 0.02, z0 + 0.02, x0 + 0.05, z1 - 0.02);
  cove(x1 - 0.05, z0 + 0.02, x1 - 0.02, z1 - 0.02);
  cove(x0 + 0.02, z1 - 0.05, DX - 2.0, z1 - 0.02);
  cove(DX + 2.0, z1 - 0.05, x1 - 0.02, z1 - 0.02);
  // runner from the door to the stage: dark blue mat with lit edge lines, marks the main circulation axis
  kit.boxMM("fabric", [DX - 1.7, F, -160.6], [DX + 1.7, F + 0.012, z1 - 0.3], { color: new THREE.Color("#1b2434"), uv: "world", texel: 1.5 });
  for (const s of [-1, 1]) kit.boxMM("emitBlue", [DX + s * 1.72 - 0.02, F, -160.6], [DX + s * 1.72 + 0.02, F + 0.014, z1 - 2.4], {});

  // ---- prototypes -------------------------------------------------------------------------------------
  proto(kit, "arm_fab", "fabric", [B(0.6, 0.12, 0.58, 0, 0.42, 0.02), B(0.6, 0.6, 0.1, 0, 0.78, 0.3)], { texel: 2 });
  proto(kit, "arm_frame", "paintedMetal", [B(0.52, 0.34, 0.5, 0, 0.19, 0.02), B(0.07, 0.22, 0.6, -0.33, 0.6, 0.02), B(0.07, 0.22, 0.6, 0.33, 0.6, 0.02), B(0.6, 0.62, 0.03, 0, 0.78, 0.365), B(0.66, 0.03, 0.03, 0, 1.1, 0.33)], { texel: 1 });
  proto(kit, "stool_fr", "paintedMetal", [C(0.03, 0.62, 0, 0.32, 0, "y", 8), C(0.18, 0.03, 0, 0.015, 0), C(0.17, 0.03, 0, 0.66, 0), C(0.14, 0.02, 0, 0.3, 0, "y", 10)], { texel: 1 });
  proto(kit, "stool_fab", "fabric", [C(0.17, 0.06, 0, 0.7, 0, "y", 14)], { texel: 3 });
  proto(kit, "caf_top", "plate", [C(0.42, 0.04, 0, 0.75, 0, "y", 20)], { texel: 1 });
  proto(kit, "caf_col", "paintedMetal", [C(0.05, 0.71, 0, 0.375, 0, "y", 10), C(0.3, 0.03, 0, 0.015, 0, "y", 16), C(0.09, 0.05, 0, 0.72, 0, "y", 12)], { texel: 1 });
  proto(kit, "glass_cup", "glass", [C(0.035, 0.12, 0, 0.06, 0, "y", 8)], { uv: "keep" });
  proto(kit, "bottle", "darkGloss", [C(0.04, 0.24, 0, 0.12, 0, "y", 8), C(0.015, 0.08, 0, 0.28, 0, "y", 6)], { texel: 1 });
  proto(kit, "flask", "metal", [C(0.045, 0.2, 0, 0.1, 0, "y", 8), C(0.02, 0.06, 0, 0.23, 0, "y", 6)], { texel: 2 });

  const armchair = (x, z, yaw, col = SEAT) => {
    kit.place("arm_fab", { pos: [x, F, z], rot: [0, yaw, 0], color: col });
    kit.place("arm_frame", { pos: [x, F, z], rot: [0, yaw, 0], color: IMP.black });
    kit.collider([x - 0.34, F, z - 0.34], [x + 0.34, F + 1.1, z + 0.34], "chair");
  };
  const stool = (x, z) => {
    kit.place("stool_fr", { pos: [x, F, z], color: IMP.black });
    kit.place("stool_fab", { pos: [x, F, z], color: SEAT });
    kit.collider([x - 0.18, F, z - 0.18], [x + 0.18, F + 0.74, z + 0.18], "stool");
  };
  const cafe = (x, z, n = 3) => {
    kit.place("caf_top", { pos: [x, F, z], color: BOARD_LIGHT });
    kit.place("caf_col", { pos: [x, F, z], color: IMP.black });
    kit.collider([x - 0.42, F, z - 0.42], [x + 0.42, F + 0.8, z + 0.42], "table");
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.4;
      stool(x + Math.cos(a) * 0.85, z + Math.sin(a) * 0.85);
    }
    if (rand() < 0.7) kit.place("glass_cup", { pos: [x + (rand() - 0.5) * 0.4, F + 0.77, z + (rand() - 0.5) * 0.4] });
    if (rand() < 0.4) kit.place("glass_cup", { pos: [x + (rand() - 0.5) * 0.4, F + 0.77, z + (rand() - 0.5) * 0.4] });
  };

  // ---- entry -------------------------------------------------------------------------------------------
  {
    const zmax = ctx.wall("zmax").frame; // u = x1 - x
    zmax.decal(x1 - DX, 3.85, 0.07, 1.1, 1.1, DECAL.EMBLEM);
    computerBank(kit, { pos: [DX - 5.4, F, z1 - 0.5], yaw: Math.PI, w: 2.6, h: 2.3, d: 0.5, seed: 14, accent: "emitBlue" });
    wallPanel(kit, zmax, x1 - (DX + 4.2), 1.8, { w: 1.5, h: 0.9, accent: "emitBlue", seed: 21 });
    // holo-schedule pedestal by the door (what's on tonight)
    const px = DX + 3.0;
    kit.box("paintedMetal", px, F + 0.55, z1 - 1.2, 0.5, 1.1, 0.4, { color: IMP.black, texel: 1 });
    kit.box("darkGloss", px, F + 1.12, z1 - 1.2, 0.46, 0.04, 0.36, { rot: [0.35, 0, 0] });
    kit.box("screen", px, F + 1.135, z1 - 1.2, 0.4, 0.004, 0.3, { rot: [0.35, 0, 0], uv: "keep", uvRect: screenRect(13) });
    kit.collider([px - 0.25, F, z1 - 1.4], [px + 0.25, F + 1.2, z1 - 1.0], "pedestal");
  }

  // ---- viewscreen gallery (port wall): three exterior feeds + two rows of armchairs -----------------------
  {
    const xmin = ctx.wall("xmin").frame; // u = z1 - z
    const feeds = [4, 8, 1];
    [-137.5, -142.0, -146.5].forEach((z, i) => {
      const u = z1 - z;
      xmin.box("paintedMetal", u, 2.2, 0.1, 3.0, 1.9, 0.2, { color: IMP.black, texel: 1 });
      xmin.box("screen", u, 2.25, 0.205, 2.7, 1.55, 0.01, { uv: "keep", uvRect: screenRect(feeds[i]) });
      xmin.box("leds", u, 1.36, 0.205, 1.6, 0.06, 0.005, { uv: "keep", uvRect: ledRect(8 + i) });
      xmin.box("emitBlue", u - 1.42, 2.25, 0.205, 0.03, 1.5, 0.005);
      xmin.box("emitBlue", u + 1.42, 2.25, 0.205, 0.03, 1.5, 0.005);
      xmin.decal(u + 1.2, 1.36, 0.21, 0.24, 0.24, DECAL.NUMBER0 + i);
    });
    kit.collider([x0, F, -148.2], [x0 + 0.32, F + 3.2, -135.8], "screens");
    for (const [rx, n0] of [[6.6, 0], [8.4, 1]]) for (let i = 0; i < 7; i++) armchair(rx, -137.2 - i * 1.55 - n0 * 0.3, Math.PI / 2, i % 3 === 1 ? SEAT_ALT : SEAT);
    // low drinks ledge between the rows
    kit.boxMM("plate", [7.45, F + 0.55, -147.9], [7.55, F + 0.6, -136.4], { color: BOARD_LIGHT, uv: "world", texel: 1 });
    for (let i = 0; i < 4; i++) kit.place("glass_cup", { pos: [7.5, F + 0.6, -137.5 - i * 2.9 - rand() * 0.6] });
  }

  // ---- dejarik booths -----------------------------------------------------------------------------------
  const holoGroups = [];
  const dejarik = (cx, cz, open) => {
    // curved booth: faceted arc of seat segments, open toward `open` (angle of the gap centre)
    const R = 1.75;
    const n = 10;
    const span = Math.PI * 1.35;
    const a0 = open + Math.PI - span / 2;
    for (let i = 0; i < n; i++) {
      const a = a0 + ((i + 0.5) / n) * span;
      const P = new Placer(kit, [cx + Math.cos(a) * R, F, cz + Math.sin(a) * R], -a - Math.PI / 2);
      const segW = (2 * R * Math.sin(span / n / 2)) * 1.02;
      P.box("paintedMetal", 0, 0.2, 0.15, segW, 0.4, 0.5, { color: IMP.black, texel: 1 });
      P.box("fabric", 0, 0.46, 0.15, segW, 0.12, 0.5, { color: SEAT, uv: "world", texel: 2 });
      P.box("fabric", 0, 0.8, 0.42, segW, 0.6, 0.12, { color: SEAT, uv: "world", texel: 2 });
      P.box("paintedMetal", 0, 0.8, 0.5, segW, 0.64, 0.04, { color: IMP.black, texel: 1 });
      P.box("emitBlue", 0, 0.06, -0.09, segW - 0.04, 0.02, 0.01, {});
      P.collider([-segW / 2, 0, -0.1], [segW / 2, 1.15, 0.55], "booth");
    }
    // table: pedestal + round chequered board (two rings of alternating sectors) + emissive rim
    kit.cyl("paintedMetal", cx, F + 0.06, cz, 0.6, 0.12, "y", { color: IMP.black, segments: 24 });
    kit.cyl("plate", cx, F + 0.48, cz, 0.36, 0.72, "y", { color: IMP.plateDark, segments: 20, uv: "world", texel: 1 });
    kit.cyl("paintedMetal", cx, F + 0.86, cz, 0.98, 0.08, "y", { color: IMP.black, segments: 36 });
    kit.add("emitBlue", new THREE.TorusGeometry(0.93, 0.015, 6, 48), { pos: [cx, F + 0.905, cz], rot: [Math.PI / 2, 0, 0] });
    for (let ring = 0; ring < 2; ring++) {
      const r0 = ring === 0 ? 0.28 : 0.58;
      const r1 = ring === 0 ? 0.58 : 0.88;
      for (let i = 0; i < 12; i++) {
        const g = new THREE.RingGeometry(r0, r1, 3, 1, (i / 12) * Math.PI * 2, Math.PI / 6);
        g.rotateX(-Math.PI / 2);
        const light = (i + ring) % 2 === 0;
        kit.add(light ? "plate" : "darkGloss", g, { pos: [cx, F + 0.902, cz], color: light ? BOARD_LIGHT : 0xffffff, uv: "world", texel: 2 });
      }
    }
    kit.cyl("emitWhite", cx, F + 0.903, cz, 0.12, 0.004, "y", { segments: 16 });
    kit.collider([cx - 0.98, F, cz - 0.98], [cx + 0.98, F + 0.92, cz + 0.98], "dejarik");
    // hologram pieces (animated)
    const grp = new THREE.Group();
    grp.position.set(cx, F + 0.92, cz);
    const blue = ctx.materials.holo;
    const red = ctx.materials.holo.clone();
    red.color.set("#ff7a5a");
    const pieces = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      const r = i % 2 ? 0.43 : 0.73;
      const m = new THREE.Mesh(i % 3 === 0 ? new THREE.ConeGeometry(0.06, 0.22, 8) : new THREE.CapsuleGeometry(0.045, 0.14, 3, 8), i < 4 ? blue : red);
      m.position.set(Math.cos(a) * r, 0.14, Math.sin(a) * r);
      grp.add(m);
      pieces.push({ m, a, r, ph: rand() * 6.28 });
    }
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.9, 32).rotateX(-Math.PI / 2), blue);
    disc.position.y = 0.01;
    grp.add(disc);
    ctx.add(grp);
    holoGroups.push({ grp, pieces });
  };
  dejarik(13.0, -139.5, 0.0); // opens toward +X (the aisle)
  dejarik(13.0, -146.0, 0.0);
  ctx.animate((dt, t) => {
    for (const h of holoGroups) {
      h.grp.rotation.y = t * 0.12;
      for (const p of h.pieces) {
        const bob = 0.14 + Math.sin(t * 1.7 + p.ph) * 0.02;
        const rr = p.r + Math.sin(t * 0.6 + p.ph) * 0.05;
        p.m.position.set(Math.cos(p.a) * rr, bob, Math.sin(p.a) * rr);
        p.m.rotation.y = t * 0.8 + p.ph;
      }
      h.grp.children[8].material.opacity = 0.2 + 0.05 * Math.sin(t * 2.3);
    }
  });

  // ---- bar (starboard wall) -----------------------------------------------------------------------------
  {
    const bz0 = -148.5;
    const bz1 = -136.5;
    const front = x1 - 2.85; // 28.9
    kit.boxMM("paintedMetal", [front, F, bz0], [front + 0.75, F + 0.12, bz1], { color: IMP.black, texel: 1 });
    kit.boxMM("plate", [front, F + 0.12, bz0], [front + 0.75, F + 1.05, bz1], { color: IMP.plateDark, uv: "world", texel: 1 });
    kit.boxMM("darkGloss", [front - 0.08, F + 1.05, bz0 - 0.08], [front + 0.83, F + 1.12, bz1 + 0.08], {});
    kit.boxMM("emitBlue", [front - 0.005, F + 0.95, bz0 + 0.1], [front + 0.005, F + 0.98, bz1 - 0.1], {});
    kit.boxMM("metal", [front - 0.12, F + 0.25, bz0 + 0.1], [front - 0.08, F + 0.29, bz1 - 0.1], { color: IMP.steel }); // foot rail
    for (const z of [bz0 + 0.3, (bz0 + bz1) / 2, bz1 - 0.3]) kit.box("metal", front - 0.1, F + 0.13, z, 0.04, 0.26, 0.04, { color: IMP.steelDark });
    kit.collider([front - 0.12, F, bz0 - 0.1], [front + 0.85, F + 1.15, bz1 + 0.1], "bar");
    for (let i = 0; i < 8; i++) stool(front - 0.75, bz0 + 0.9 + i * 1.45);
    // back bar: shelving with backlit panel, bottles, glass racks, a tap unit and a register
    const bx = x1 - 0.45;
    kit.boxMM("paintedMetal", [x1 - 0.5, F, bz0], [x1 - 0.02, F + 1.0, bz1], { color: IMP.black, texel: 1 });
    kit.boxMM("plate", [x1 - 0.55, F + 1.0, bz0 - 0.05], [x1 - 0.02, F + 1.06, bz1 + 0.05], { color: IMP.plateDark, uv: "world", texel: 1 });
    kit.boxMM("paintedMetal", [x1 - 0.16, F + 1.06, bz0], [x1 - 0.1, F + 3.0, bz1], { color: IMP.black, texel: 1 });
    kit.boxMM("emitBlue", [x1 - 0.1, F + 1.1, bz0 + 0.2], [x1 - 0.09, F + 2.9, bz1 - 0.2], {});
    for (const sy of [F + 1.5, F + 2.05, F + 2.6]) {
      kit.boxMM("glass", [x1 - 0.5, sy, bz0 + 0.2], [x1 - 0.1, sy + 0.02, bz1 - 0.2], { uv: "keep" });
      kit.boxMM("metal", [x1 - 0.52, sy - 0.02, bz0 + 0.2], [x1 - 0.48, sy + 0.02, bz1 - 0.2], { color: IMP.steel });
      for (let i = 0; i < 20; i++) {
        if (rand() < 0.25) continue;
        const z = bz0 + 0.45 + i * 0.57 + (rand() - 0.5) * 0.1;
        if (rand() < 0.65) kit.place("bottle", { pos: [bx + (rand() - 0.5) * 0.12, sy + 0.02, z], scale: [1, 0.8 + rand() * 0.5, 1] });
        else kit.place("flask", { pos: [bx + (rand() - 0.5) * 0.12, sy + 0.02, z], color: rand() < 0.5 ? STEEL_LIGHT : IMP.gunmetal });
      }
    }
    kit.collider([x1 - 0.6, F, bz0 - 0.1], [x1, F + 3.1, bz1 + 0.1], "backbar");
    // glass racks and a tap unit on the bar top, a register at the end
    for (let i = 0; i < 12; i++) kit.place("glass_cup", { pos: [front + 0.55, F + 1.12, bz0 + 0.5 + i * 0.32] });
    for (let i = 0; i < 6; i++) kit.place("glass_cup", { pos: [front + 0.2 + (rand() - 0.5) * 0.1, F + 1.12, bz0 + 3 + i * 1.3 + rand() * 0.4] });
    const tapZ = (bz0 + bz1) / 2;
    kit.box("metal", front + 0.5, F + 1.3, tapZ, 0.25, 0.36, 0.7, { color: STEEL_LIGHT });
    for (let i = 0; i < 3; i++) kit.cyl("metal", front + 0.36, F + 1.5, tapZ - 0.22 + i * 0.22, 0.015, 0.2, "y", { color: IMP.steel, segments: 8 });
    kit.box("leds", front + 0.372, F + 1.3, tapZ, 0.005, 0.06, 0.5, { uv: "keep", uvRect: ledRect(5) });
    kit.box("darkGloss", front + 0.45, F + 1.28, bz1 - 0.6, 0.36, 0.3, 0.05, { rot: [0.5, 0, 0] });
    kit.box("screen", front + 0.44, F + 1.28, bz1 - 0.62, 0.3, 0.24, 0.005, { rot: [0.5, 0, 0], uv: "keep", uvRect: screenRect(15) });
    // canopy over the bar with three pendant lights
    kit.boxMM("paintedMetal", [front - 0.9, F + 2.95, bz0], [x1 - 0.6, F + 3.1, bz1], { color: IMP.black, texel: 1 });
    kit.boxMM("plate", [front - 0.9, F + 3.1, bz0], [x1 - 0.6, F + 3.25, bz1], { color: IMP.plateDark, uv: "world", texel: 1 });
    kit.boxMM("emitAmber", [front - 0.85, F + 2.94, bz0 + 0.3], [front - 0.75, F + 2.95, bz1 - 0.3], {});
    for (const z of [bz0 + 2, tapZ, bz1 - 2]) {
      kit.box("paintedMetal", front + 0.3, F + 2.3, z, 0.5, 0.12, 0.5, { color: IMP.black, texel: 1 });
      kit.box("emitWarmSoft", front + 0.3, F + 2.235, z, 0.42, 0.01, 0.42, { uv: "keep" });
      kit.box("paintedMetal", front + 0.3, F + 2.65, z, 0.03, 0.6, 0.03, { color: IMP.black, texel: 1 });
    }
    // café tables in front of the bar
    cafe(24.6, -139.6, 3);
    cafe(24.6, -145.6, 3);
  }

  // ---- mid section: sabacc card table (port), café tables (starboard) ---------------------------------
  {
    const sx = 9.0;
    const sz = -154.0;
    kit.box("paintedMetal", sx, F + 0.36, sz, 0.6, 0.72, 0.6, { color: IMP.black, texel: 1 });
    kit.box("plate", sx, F + 0.76, sz, 2.2, 0.06, 1.3, { color: IMP.plateDark, uv: "world", texel: 1 });
    kit.box("fabric", sx, F + 0.795, sz, 1.9, 0.01, 1.0, { color: new THREE.Color("#233a5e"), uv: "world", texel: 2 });
    kit.box("emitBlue", sx, F + 0.79, sz, 2.22, 0.01, 1.32, {});
    kit.box("darkGloss", sx, F + 0.82, sz, 0.5, 0.04, 0.3, {});
    kit.box("leds", sx, F + 0.845, sz, 0.4, 0.004, 0.2, { uv: "keep", uvRect: ledRect(2) });
    for (let i = 0; i < 5; i++) kit.box("darkGloss", sx - 0.7 + i * 0.35 + (rand() - 0.5) * 0.1, F + 0.805, sz + 0.3 + (rand() - 0.5) * 0.2, 0.12, 0.004, 0.08, { rot: [0, (rand() - 0.5) * 0.6, 0] });
    kit.collider([sx - 1.1, F, sz - 0.65], [sx + 1.1, F + 0.82, sz + 0.65], "sabacc");
    for (const [dx, dz, yaw] of [[-0.7, -1.15, Math.PI], [0.7, -1.15, Math.PI], [-0.7, 1.15, 0], [0.7, 1.15, 0], [-1.65, 0, Math.PI / 2], [1.65, 0, -Math.PI / 2]]) armchair(sx + dx, sz + dz, yaw, SEAT_ALT);
    // a structural pillar with a light slot marks the corner of the mid section
    pillar(kit, { pos: [15.6, F, -152.0], h: ctx.h, w: 0.7 });
    // holo-news column beside the runner: pedestal with a slowly turning wireframe globe and orbit ring
    {
      const hx = 21.6;
      const hz = -150.5;
      kit.cyl("paintedMetal", hx, F + 0.5, hz, 0.42, 1.0, "y", { color: IMP.black, segments: 16, texel: 1 });
      kit.cyl("plate", hx, F + 1.03, hz, 0.46, 0.06, "y", { color: IMP.plateDark, segments: 16, uv: "world", texel: 1 });
      kit.add("emitBlue", new THREE.TorusGeometry(0.34, 0.012, 6, 32), { pos: [hx, F + 1.07, hz], rot: [Math.PI / 2, 0, 0] });
      kit.box("leds", hx, F + 0.75, hz + 0.43, 0.5, 0.06, 0.005, { uv: "keep", uvRect: ledRect(14) });
      kit.collider([hx - 0.45, F, hz - 0.45], [hx + 0.45, F + 1.1, hz + 0.45], "holonews");
      const globe = new THREE.Group();
      globe.position.set(hx, F + 1.75, hz);
      const wire = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 2), ctx.materials.holo);
      const wireEdges = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(0.45, 1)), new THREE.LineBasicMaterial({ color: 0x8fd0ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.008, 6, 48), ctx.materials.holo);
      ring.rotation.x = Math.PI / 2 - 0.35;
      globe.add(wire, wireEdges, ring);
      ctx.add(globe);
      ctx.animate((dt, t) => {
        globe.rotation.y = t * 0.35;
        ring.rotation.z = t * 0.5;
        globe.position.y = F + 1.75 + Math.sin(t * 0.9) * 0.03;
      });
    }
    cafe(24.8, -152.0, 3);
    cafe(28.6, -155.5, 3);
    cafe(24.8, -158.5, 3);
  }

  // ---- far end: briefing stage (port) + aisle display + reading nook (starboard) -------------------------
  {
    const sx0 = x0 + 1.2;
    const sx1 = 16.4;
    const sz0 = z0;
    const sz1 = -165.4;
    kit.boxMM("plate", [sx0, F, sz0], [sx1, F + 0.3, sz1], { color: IMP.plate, uv: "world", texel: 1 });
    kit.boxMM("paintedMetal", [sx0, F + 0.3, sz1 - 0.06], [sx1, F + 0.32, sz1], { color: IMP.black, texel: 1 });
    kit.boxMM("emitBlue", [sx0 + 0.2, F + 0.24, sz1 - 0.002], [sx1 - 0.2, F + 0.27, sz1], {});
    kit.collider([sx0, F, sz0], [sx1, F + 0.3, sz1], "stage");
    const mid = (sx0 + sx1) / 2;
    const zmin = ctx.wall("zmin").frame; // u = x - x0
    zmin.box("paintedMetal", mid - x0, 2.6, 0.12, 5.2, 2.6, 0.24, { color: IMP.black, texel: 1 });
    zmin.box("screen", mid - x0, 2.65, 0.245, 4.8, 2.2, 0.01, { uv: "keep", uvRect: screenRect(1) });
    zmin.box("leds", mid - x0, 1.45, 0.245, 3.0, 0.06, 0.005, { uv: "keep", uvRect: ledRect(12) });
    zmin.decal(mid - x0 - 3.2, 3.2, 0.06, 1.0, 1.0, DECAL.EMBLEM);
    zmin.decal(mid - x0 + 3.2, 3.2, 0.06, 0.9, 0.9, DECAL.TEXT_B);
    // lectern
    const lx = mid + 1.6;
    const lz = sz1 - 1.3 + 2.6;
    kit.box("paintedMetal", lx, F + 0.3 + 0.55, lz, 0.6, 1.1, 0.5, { color: IMP.black, texel: 1 });
    kit.box("plate", lx, F + 0.3 + 1.12, lz, 0.7, 0.05, 0.55, { color: IMP.plateDark, uv: "world", texel: 1, rot: [-0.3, 0, 0] });
    kit.box("screen", lx, F + 0.3 + 1.15, lz - 0.02, 0.5, 0.005, 0.36, { rot: [-0.3, 0, 0], uv: "keep", uvRect: screenRect(13) });
    kit.box("emitBlue", lx, F + 0.3 + 0.4, lz + 0.26, 0.4, 0.02, 0.01, {});
    kit.collider([lx - 0.35, F + 0.3, lz - 0.3], [lx + 0.35, F + 1.5, lz + 0.3], "lectern");
    // audience: three rows of armchairs facing the stage
    for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) armchair(6.2 + i * 1.6, -163.4 + r * 1.75, Math.PI, r === 1 ? SEAT_ALT : SEAT);
    // aisle terminal display: a viewport-like feed at the end of the aisle
    zmin.box("paintedMetal", DX - x0, 2.3, 0.12, 3.4, 2.4, 0.24, { color: IMP.black, texel: 1 });
    zmin.box("screen", DX - x0, 2.35, 0.245, 3.0, 2.0, 0.01, { uv: "keep", uvRect: screenRect(4) });
    zmin.box("emitBlue", DX - x0, 1.06, 0.245, 3.2, 0.03, 0.005);
    // reading nook: two armchairs, side table, data rack, floor lamp
    armchair(26.0, -166.5, Math.PI * 0.75, SEAT_ALT);
    armchair(28.4, -166.5, -Math.PI * 0.75, SEAT_ALT);
    cafe(27.2, -167.9, 0);
    computerBank(kit, { pos: [30.0, F, z0 + 0.5], yaw: 0, w: 3.0, h: 2.4, d: 0.5, seed: 27, accent: "emitBlue" });
    kit.cyl("metal", 24.3, F + 0.9, -168.3, 0.02, 1.8, "y", { color: IMP.steel, segments: 8 });
    kit.cyl("paintedMetal", 24.3, F + 1.9, -168.3, 0.22, 0.2, "y", { color: IMP.black, segments: 16 });
    kit.cyl("emitWarmSoft", 24.3, F + 1.79, -168.3, 0.18, 0.01, "y", { segments: 16, uv: "keep" });
    kit.cyl("paintedMetal", 24.3, F + 0.02, -168.3, 0.25, 0.04, "y", { color: IMP.black, segments: 16 });
    kit.collider([24.05, F, -168.55], [24.55, F + 2.0, -168.05], "lamp");
  }

  // ---- lights (8, incl. one shadow spot on the stage) --------------------------------------------------
  ctx.light(0xdfe8ff, 42, 26, [DX, ceil - 0.6, -134.0], { decay: 1.6 });
  ctx.light(0x9fb8ff, 40, 26, [8.5, ceil - 0.6, -141.5], { decay: 1.6 });
  ctx.light(0x6f9aff, 36, 24, [15.0, ceil - 0.8, -143.0], { decay: 1.6 });
  ctx.light(0xffc27a, 46, 22, [27.2, F + 2.55, -142.5], { decay: 1.6 });
  ctx.light(0xbfd0ff, 40, 26, [12.0, ceil - 0.6, -153.0], { decay: 1.6 });
  ctx.light(0xffc27a, 40, 26, [25.5, ceil - 0.6, -154.5], { decay: 1.6 });
  ctx.light(0x9fb8ff, 38, 24, [26.5, ceil - 0.6, -165.0], { decay: 1.6 });
  ctx.spot(0xe8eeff, 180, 18, 0.6, [10.5, ceil - 0.3, -162.0], [10.5, F + 0.3, -167.5], { penumbra: 0.5, shadow: true, mapSize: 1024 });
}
