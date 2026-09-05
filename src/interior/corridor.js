// Shared Imperial builders for the connective tissue: corridors and turbolift lobbies.
import * as THREE from "three";
import { PALETTE } from "../materials.js";
import { pointLight, wallFrame } from "./builders.js";
import { impFloor, impWall, impCeiling, wallScreen, equipmentRack, pillar, wallSegment, IMP_PAINTS_DARK } from "./imperial.js";
import { makeCanvas, toTexture } from "../textures.js";

/** Lit signage plate: dark housing, text on an emissive canvas (one material per unique text). */
export function signPlate(kit, ctx, { side, u, v = 2.9, w = 2.4, h = 0.42, text, sub = null, accent = "#4a9dff", bounds = ctx.bounds }) {
  const key = "sign_" + text.replace(/[^A-Za-z0-9]/g, "_") + (sub ? "_" + sub.replace(/[^A-Za-z0-9]/g, "_") : "");
  if (!ctx.materials[key]) {
    // 512×96 (was 1024×192): eleven of these plates are resident at once and the text is 0.4 m tall
    const c = makeCanvas(512, 96);
    const g = c.getContext("2d");
    g.fillStyle = "#07090c";
    g.fillRect(0, 0, 512, 96);
    g.fillStyle = accent;
    g.fillRect(12, 11, 3, 74);
    g.fillRect(497, 11, 3, 74);
    g.font = "bold 46px 'Helvetica Neue', Arial, sans-serif";
    g.textBaseline = "middle";
    g.textAlign = "center";
    g.fillStyle = "#dfe6f2";
    g.fillText(text.toUpperCase(), 256, sub ? 36 : 48);
    if (sub) {
      g.font = "bold 22px 'Helvetica Neue', Arial, sans-serif";
      g.fillStyle = accent;
      g.fillText(sub.toUpperCase(), 256, 73);
    }
    ctx.materials[key] = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: toTexture(c, { srgb: true, wrap: false }), emissiveIntensity: 1.25, roughness: 0.4, metalness: 0 });
  }
  const seg = wallSegment(bounds, side);
  const { frame } = wallFrame(kit, seg.from, seg.to, bounds[0][1]);
  frame.box("paintedMetal", u, v, 0.035, w + 0.12, h + 0.12, 0.07, { color: PALETTE.impBlack, texel: 2 });
  frame.add(key, new THREE.PlaneGeometry(w, h), u, v, 0.072, { uv: "keep" });
}

/**
 * Imperial corridor: black gloss deck with edge light channels, white panelled lower walls, angled
 * upper walls, a flat ceiling with one recessed light strip, dark structural frames every ~4.4 m
 * (skipped at doorways), and a status stripe. Works for any axis-aligned bounds; the longer axis is
 * the run direction.
 */
export function buildCorridor(kit, ctx) {
  const [min, max] = ctx.bounds;
  const w = max[0] - min[0];
  const d = max[2] - min[2];
  const h = max[1] - min[1];
  const alongZ = d >= w;
  const halfW = (alongZ ? w : d) / 2;
  const cx = (min[0] + max[0]) / 2;
  const cz = (min[2] + max[2]) / 2;
  const len = alongZ ? d : w;
  const a0 = alongZ ? min[2] : min[0];
  const a1 = alongZ ? max[2] : max[0];

  impFloor(kit, ctx, { gutter: false });
  // floor edge light channels: faint emitter — at the dim level they were the brightest floor element
  // and read as runway lights competing with the door at the end of the run
  const strip = (side) => {
    const off = side * (halfW - 0.12);
    if (alongZ) {
      kit.boxMM("paintedMetal", [cx + off - 0.09, 0, min[2]], [cx + off + 0.09, 0.02, max[2]], { color: PALETTE.impBlack, texel: 2 });
      kit.boxMM("emitBlueFaint", [cx + off - 0.015, 0.02, min[2] + 0.2], [cx + off + 0.015, 0.03, max[2] - 0.2], { uv: "keep" });
    } else {
      kit.boxMM("paintedMetal", [min[0], 0, cz + off - 0.09], [max[0], 0.02, cz + off + 0.09], { color: PALETTE.impBlack, texel: 2 });
      kit.boxMM("emitBlueFaint", [min[0] + 0.2, 0.02, cz + off - 0.015], [max[0] - 0.2, 0.03, cz + off + 0.015], { uv: "keep" });
    }
  };
  strip(-1);
  strip(1);

  // walls: lower vertical section up to 2.5 m, upper section leans inward to the ceiling edge
  const lowH = Math.min(2.5, h - 0.8);
  const lean = Math.min(0.55, halfW * 0.35);
  const sides = alongZ ? ["xmin", "xmax"] : ["zmin", "zmax"];
  const ends = alongZ ? ["zmin", "zmax"] : ["xmin", "xmax"];
  for (const side of sides) {
    // no conduit recesses on the long walls: with the row-coherent panel grid a conduit pick spread
    // along the whole 1.7-2.5 m row of one side, and the run of dark gunmetal recesses read as a
    // missing wall segment against the plated far side (crew corridor, upper right)
    impWall(kit, ctx, side, { height: lowH, rows: [0, 0.5, 1.7, lowH], panelW: 1.1, styles: { panel: 0.75, vent: 0.06, greeble: 0.08, strip: 0.08, screen: 0.03 }, seed: ctx.seed + side.length * 7 });
    // leaning upper panel: a Frame from the wall top to the ceiling edge
    const sign = side === "xmin" || side === "zmin" ? 1 : -1; // toward the corridor centre
    let o, U, V;
    if (alongZ) {
      const x = side === "xmin" ? min[0] : max[0];
      o = new THREE.Vector3(x, lowH, side === "xmin" ? max[2] : min[2]);
      U = new THREE.Vector3(0, 0, side === "xmin" ? -1 : 1);
      V = new THREE.Vector3(sign * lean, h - lowH, 0);
    } else {
      const z = side === "zmin" ? min[2] : max[2];
      o = new THREE.Vector3(side === "zmin" ? min[0] : max[0], lowH, z);
      U = new THREE.Vector3(side === "zmin" ? 1 : -1, 0, 0);
      V = new THREE.Vector3(0, h - lowH, sign * lean);
    }
    upperPanel(kit, ctx, o, U, V, len, side);
  }
  // end walls (with door / opening cut-outs), full height
  for (const side of ends) impWall(kit, ctx, side, { height: h, rows: [0, 0.5, 2.5, h], seed: ctx.seed + side.length * 11 });

  // ceiling: flat centre strip between the leaning panels
  const flatHalf = halfW - lean;
  const cb = alongZ ? [[cx - flatHalf, 0, min[2]], [cx + flatHalf, h, max[2]]] : [[min[0], 0, cz - flatHalf], [max[0], h, cz + flatHalf]];
  impCeiling(kit, ctx, { bounds: cb, spacing: 100, lights: false, stripMat: "emitWhiteDim", stripInset: 2.0, paints: [[PALETTE.impGrey, 0.7], [PALETTE.impMid, 0.3]] });
  // budgeted lights along the run: one every ~9 m, max 8; the emissive strips fill in between
  const nl = Math.max(1, Math.min(3, Math.round(len / 14)));
  for (let i = 0; i < nl; i++) {
    const a = a0 + ((i + 0.5) / nl) * len;
    ctx.light(pointLight(0xe8f0ff, 5.5, 11, alongZ ? [cx, h - 0.6, a] : [a, h - 0.6, cz]));
  }

  // structural frames every ~4.4 m, skipped where a door opening sits
  const openingsA = [];
  for (const dd of ctx.doors) openingsA.push(alongZ ? dd.pos[1] : dd.pos[0]);
  const n = Math.max(1, Math.round(len / 4.4));
  for (let i = 1; i < n; i++) {
    const a = a0 + (i / n) * len;
    if (openingsA.some((p) => Math.abs(p - a) < 2.4)) continue;
    rib(kit, ctx, alongZ, a, cx, cz, halfW, lowH, lean, h);
  }
}

function upperPanel(kit, ctx, o, U, V, len, side) {
  // build the slanted upper strip as a set of panels along U
  const N = new THREE.Vector3().crossVectors(U.clone().normalize(), V.clone().normalize()).normalize();
  const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(U.clone().normalize(), V.clone().normalize(), N));
  const L = V.length();
  const nPanels = Math.max(1, Math.round(len / 1.1));
  const pw = len / nPanels;
  for (let i = 0; i < nPanels; i++) {
    const u = (i + 0.5) * pw;
    const p = o.clone().addScaledVector(U.clone().normalize(), u).addScaledVector(V.clone().normalize(), L / 2).addScaledVector(N, -0.06);
    const col = i % 7 === 3 ? PALETTE.impGrey : PALETTE.impLight;
    kit.add("impPanel", new THREE.BoxGeometry(pw - 0.03, L - 0.03, 0.1), { pos: [p.x, p.y, p.z], quat: q, color: col, uv: "keep" });
    // backing so the wall is closed behind the seams
    const pb = o.clone().addScaledVector(U.clone().normalize(), u).addScaledVector(V.clone().normalize(), L / 2).addScaledVector(N, -0.14);
    kit.add("metal", new THREE.BoxGeometry(pw + 0.02, L + 0.02, 0.06), { pos: [pb.x, pb.y, pb.z], quat: q, color: PALETTE.darkMetal, texel: 1.2 });
  }
  // a continuous light line at the junction of lower and upper wall (the ISD corridor's glowing seam)
  const pj = o.clone().addScaledVector(U.clone().normalize(), len / 2).addScaledVector(N, 0.0).add(new THREE.Vector3(0, 0.02, 0));
  const g = new THREE.BoxGeometry(len - 0.2, 0.05, 0.05);
  const qy = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), U.clone().normalize());
  kit.add("emitStrip", g, { pos: [pj.x, pj.y, pj.z], quat: qy, uv: "keep" });
}

function rib(kit, ctx, alongZ, a, cx, cz, halfW, lowH, lean, h) {
  // frame profile in the corridor cross-section plane (local x = across, y = up)
  const outer = [
    [-halfW - 0.01, -0.01],
    [halfW + 0.01, -0.01],
    [halfW + 0.01, lowH],
    [halfW - lean + 0.01, h + 0.01],
    [-halfW + lean - 0.01, h + 0.01],
    [-halfW - 0.01, lowH],
  ];
  const t = 0.28;
  const inner = [
    [-halfW + t, -0.01],
    [halfW - t, -0.01],
    [halfW - t, lowH - t * 0.4],
    [halfW - lean - t + 0.05, h - t],
    [-halfW + lean + t - 0.05, h - t],
    [-halfW + t, lowH - t * 0.4],
  ];
  const shape = new THREE.Shape(outer.map(([x, y]) => new THREE.Vector2(x, y)));
  shape.holes.push(new THREE.Path(inner.map(([x, y]) => new THREE.Vector2(x, y))));
  const depth = 0.3;
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  const pos = alongZ ? [cx, 0, a - depth / 2] : [a - depth / 2, 0, cz];
  const rot = alongZ ? [0, 0, 0] : [0, Math.PI / 2, 0];
  kit.add("paintedMetal", geo, { pos, rot, color: PALETTE.impDark, uv: "world", texel: 1 });
  // white inset light line on the frame's inner face, both sides
  for (const s of [-1, 1]) {
    const x = s * (halfW - t - 0.01);
    if (alongZ) kit.box("emitWhiteDim", cx + x, lowH * 0.5, a, 0.02, lowH * 0.7, 0.05);
    else kit.box("emitWhiteDim", a, lowH * 0.5, cz + x, 0.05, lowH * 0.7, 0.02);
  }
  // colliders for the rib's protrusion on both sides
  for (const s of [-1, 1]) {
    if (alongZ) kit.collider([cx + (s < 0 ? -halfW : halfW - t), 0, a - depth / 2], [cx + (s < 0 ? -halfW + t : halfW), h, a + depth / 2], "rib");
    else kit.collider([a - depth / 2, 0, cz + (s < 0 ? -halfW : halfW - t)], [a + depth / 2, h, cz + (s < 0 ? -halfW + t : halfW)], "rib");
  }
}

/** Turbolift lobby: a small hall with the lift door, a deck indicator, racks, and corner pillars. */
export function buildLobby(kit, ctx) {
  const [min, max] = ctx.bounds;
  const h = max[1] - min[1];
  impFloor(kit, ctx);
  impCeiling(kit, ctx, { spacing: 100, lightStep: 100, lights: false, styles: { panel: 0.9, vent: 0.1 } });
  // central square fixture with a real light
  const cx = (min[0] + max[0]) / 2;
  const cz = (min[2] + max[2]) / 2;
  // square fixture: dark tray, faint lit diffuser, and a narrow bright ring — not a solid white slab
  kit.box("paintedMetal", cx, h - 0.06, cz, 2.2, 0.1, 2.2, { color: PALETTE.impDark, texel: 2 });
  kit.box("emitWhiteFaint", cx, h - 0.1, cz, 1.9, 0.02, 1.9, { uv: "keep" });
  kit.box("paintedMetal", cx, h - 0.115, cz, 1.3, 0.02, 1.3, { color: PALETTE.impDark, texel: 2 });
  for (const s of [-1, 1]) {
    kit.box("emitWhiteDim", cx + s * 0.78, h - 0.12, cz, 0.07, 0.02, 1.62, { uv: "keep" });
    kit.box("emitWhiteDim", cx, h - 0.12, cz + s * 0.78, 1.62, 0.02, 0.07, { uv: "keep" });
  }
  ctx.light(pointLight(0xe8f0ff, 6, 10, [cx, h - 0.8, cz]));
  const lobbyPaints = [
    [PALETTE.impLight, 0.45],
    [PALETTE.impGrey, 0.35],
    [PALETTE.impMid, 0.2],
  ];
  // strip panels rare: three rows of white dashes read as a wallpaper grid around the lift door
  for (const side of ["zmin", "zmax", "xmin", "xmax"]) impWall(kit, ctx, side, { rows: [0, 0.5, 1.6, 2.6, h], paints: lobbyPaints, styles: { panel: 0.8, vent: 0.06, greeble: 0.11, strip: 0.03 }, seed: ctx.seed + side.length * 5 });
  // deck sign over the lift door (zmax wall), status readouts beside it, a direction sign over the
  // corridor opening (zmin wall) naming the deck's principal space
  const lift = ctx.doors.find((d) => d.style === "lift");
  const deck = ctx.deck;
  if (lift) {
    const u = max[0] - lift.pos[0];
    // header sits just above the lift-door lintel (2.85 m) so it stays in frame at eye height
    signPlate(kit, ctx, { side: "zmax", u, v: 3.1, w: 2.8, h: 0.42, text: `Deck ${deck.index}`, sub: deck.name, accent: "#ffb347" });
    wallScreen(kit, ctx, { side: "zmax", u: u - 2.3, v: 1.7, w: 0.9, h: 0.55, screen: 2 });
    wallScreen(kit, ctx, { side: "zmax", u: u + 2.3, v: 1.7, w: 0.9, h: 0.55, screen: 0 });
  }
  const opening = ctx.doors.find((d) => d.style === "open");
  if (opening) {
    const principal = deck.sectors.filter((s) => s.kind === "room").sort((a, b) => (b.bounds[1][0] - b.bounds[0][0]) * (b.bounds[1][2] - b.bounds[0][2]) - (a.bounds[1][0] - a.bounds[0][0]) * (a.bounds[1][2] - a.bounds[0][2]))[0];
    const u = opening.pos[0] - min[0];
    if (principal) signPlate(kit, ctx, { side: "zmin", u, v: h - 0.45, w: 3.6, h: 0.42, text: `▲ ${principal.name}`, accent: "#4a9dff" });
  }
  void IMP_PAINTS_DARK;
  // equipment racks on the side walls away from doors
  const rackSide = ctx.doors.some((d) => d.wall === "z" && d.pos[0] < min[0] + 1) ? "xmax" : "xmin";
  equipmentRack(kit, ctx, { side: rackSide, u: (max[2] - min[2]) / 2, w: 1.4, h: 2.6, seed: ctx.seed });
  // corner pillars
  const p = 0.28;
  for (const [x, z] of [
    [min[0] + p, min[2] + p],
    [max[0] - p, min[2] + p],
    [min[0] + p, max[2] - p],
    [max[0] - p, max[2] - p],
  ]) {
    pillar(kit, x, z, 0, h, 0.4, PALETTE.impMid);
  }
}
