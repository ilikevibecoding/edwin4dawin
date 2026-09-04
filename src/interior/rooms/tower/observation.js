// Aft Observation Deck. The south wall is built here rather than by impWall so its five tall
// viewports are real openings (impWall backs every bay with a solid slab): floor-to-ceiling mullion
// ribs, a steel sill ledge, blast-shutter housings and clear glass looking aft into the star field.
// Smaller viewports on the east and west walls are sealed behind armoured shutters. A raised deck-plate
// walkway leads from the lift lobby door to the glass between two benches rows; a star-chart table
// (point-cloud galaxy hologram) sits mid-room, the memorial plaque wall is west, the dispenser counter
// east. Low warm light bands only, so the windows dominate.
import * as THREE from "three";
import { buildShell, roomWalls } from "../../shell.js";
import { wallFrame } from "../../../core/frame.js";
import { bench, chair, ceilingLight, pointLightDesc, wallScreen, alertBeacon, floorDecal, placard, column, pipeRun, railing } from "../../impKit.js";
import { IMP } from "../../../materials/imperial.js";
import { impDecalRect } from "../../../materials/imperialTextures.js";
import { STD } from "../../../config/layout.js";
import { setVertexColor } from "../../../kit.js";

export function buildObservation(kit, ctx) {
  const { room, floorY: y } = ctx;
  const [x0, z0, x1, z1] = room.box;
  const h = room.h;
  const cx = (x0 + x1) / 2; // 0: door, walkway and chart table axis
  const t = STD.wallT;
  const mats = ctx.mats;
  const yc = y + h;
  const WARM = 0xffd9a8;

  buildShell(kit, ctx, ctx.id, room, {
    skip: ["south"],
    wall: { pitch: 4, tone: IMP.wallMid, toneAlt: IMP.wallDark, bandMat: "lightBandWarm", styles: { plain: 0.66, control: 0.06, vent: 0.1, hatch: 0.08, pipes: 0.02, screen: 0.04, niche: 0.04 } },
    ceiling: { lights: false, tone: IMP.trim, panelW: 2.5 },
    floor: { strip: false, tone: IMP.wallDark },
  });
  const walls = roomWalls(room);

  // ---- south wall: five aft viewports ----------------------------------------------------------------------
  {
    const w = walls.south;
    const { frame, length: L } = wallFrame(kit, w.from, w.to, y); // u: 0 at x1 .. 40 at x0, +n into the room
    const uc = w.u(cx);
    const PANE = 5.4;
    const MULL = 1.0;
    const V0 = 0.9; // sill
    const V1 = 4.5; // head
    const depth = 0.25;
    const centres = [-2, -1, 0, 1, 2].map((k) => uc + k * (PANE + MULL));
    const pierW = centres[0] - PANE / 2; // solid wall from the corner to the first pane
    const trim = (cu, cv, cn, su, sv, sn) => frame.box("impPaintedMetal", cu, cv, cn, su, sv, sn, { color: IMP.trim, texel: 1 });
    // solid structure: piers, sill band, head band, mullions (backing slab only where there is no glass)
    trim(pierW / 2, h / 2, -depth / 2, pierW, h, depth);
    trim(L - pierW / 2, h / 2, -depth / 2, pierW, h, depth);
    trim(uc, V0 / 2, -depth / 2, L - pierW * 2, V0, depth);
    trim(uc, (V1 + h) / 2, -depth / 2, L - pierW * 2, h - V1, depth);
    for (let k = 0; k < 4; k++) {
      const um = (centres[k] + centres[k + 1]) / 2;
      trim(um, (V0 + V1) / 2, -depth / 2, MULL, V1 - V0, depth);
      // rib face with a steel inlay, full height
      trim(um, h / 2, 0.08, 0.7, h, 0.16);
      frame.box("impMetal", um, h / 2, 0.165, 0.05, h - 0.5, 0.01, { color: IMP.gunmetal });
    }
    // pier panels with the warm band, kick and cornice, a placard each
    for (const pu of [pierW / 2, L - pierW / 2]) {
      const pw = pierW - 0.6;
      frame.box("impPanel", pu, (0.32 + 1.97) / 2, 0.03, pw, 1.97 - 0.32 - 0.04, 0.06, { color: IMP.wallMid, uv: "keep" });
      frame.box("impPanel1", pu, (2.13 + h - 0.22) / 2, 0.03, pw, h - 0.22 - 2.13 - 0.04, 0.06, { color: IMP.wallMid, uv: "keep" });
      trim(pu, 2.05, -0.03, pw + 0.1, 0.2, 0.06);
      frame.box("lightBandWarm", pu, 2.05, -0.005, pw - 0.12, 0.11, 0.01, { uv: "keep" });
      trim(pu, 0.16, 0.084, pw + 0.3, 0.32, 0.168);
    }
    placard(frame, pierW / 2, 3.1, 0.7, 14);
    placard(frame, L - pierW / 2, 3.1, 0.7, 7);
    // sill: dark kick, panel, steel ledge; head: panel, shutter housings, cornice
    const sillU = L - pierW * 2;
    trim(uc, 0.16, 0.084, sillU, 0.32, 0.168);
    frame.box("impPanel", uc, (0.32 + V0) / 2, 0.03, sillU, V0 - 0.32 - 0.04, 0.06, { color: IMP.wallDark, uv: "keep" });
    frame.box("impMetal", uc, V0 + 0.02, 0.15, sillU + 0.2, 0.04, 0.36, { color: IMP.steel, texel: 1 });
    frame.box("impPanel1", uc, (V1 + h - 0.22) / 2, 0.03, sillU, h - 0.22 - V1 - 0.04, 0.06, { color: IMP.wallDark, uv: "keep" });
    trim(uc, h - 0.11, 0.07, L, 0.22, 0.14);
    for (const cu of centres) {
      // casement frame around the pane, glass set 8 cm back, shutter housing over the head with a status lamp
      trim(cu, V0 + 0.05, 0.02, PANE + 0.1, 0.1, 0.1);
      trim(cu, V1 - 0.05, 0.02, PANE + 0.1, 0.1, 0.1);
      trim(cu - PANE / 2 + 0.05, (V0 + V1) / 2, 0.02, 0.1, V1 - V0, 0.1);
      trim(cu + PANE / 2 - 0.05, (V0 + V1) / 2, 0.02, 0.1, V1 - V0, 0.1);
      frame.quad("glass", cu, (V0 + V1) / 2, -0.08, PANE - 0.2, V1 - V0 - 0.2);
      frame.box("impPaintedMetal", cu, V1 + 0.24, 0.14, PANE - 0.2, 0.4, 0.28, { color: IMP.consoleDark, texel: 1 });
      frame.box("emitAmber", cu - PANE / 2 + 0.5, V1 + 0.24, 0.285, 0.14, 0.05, 0.01);
      frame.box("leds", cu, V1 + 0.1, 0.285, 1.2, 0.05, 0.01, { uv: "keep" });
    }
    frame.collider(0, L, 0, h, -depth - 0.05, 0.4, ctx.id + ":south");
    // faint blue space-glow fills just inside the glass, so the sill and benches catch the starlight
    pointLightDesc(ctx, 0x8fb8ff, 1.4, 12, [cx - 8, y + 3.2, z1 - 2.2], 0);
    pointLightDesc(ctx, 0x8fb8ff, 1.4, 12, [cx + 8, y + 3.2, z1 - 2.2], 0);
    // sill rail: a lit handrail along the glass, open at the walkway so the deck reaches the panes
    const zr = z1 - t - 0.9;
    railing(kit, [x0 + pierW, zr], [cx - 2.2, zr], y, { h: 1.0, lit: true, tag: "sillRail" });
    railing(kit, [cx + 2.2, zr], [x1 - pierW, zr], y, { h: 1.0, lit: true, tag: "sillRail" });
  }

  // ---- deck-plate walkway from the door to the glass, with a plaza ring around the chart table ---------------
  const TX = cx;
  const TZ = 634.5; // chart table centre
  {
    const plateW = 3.0;
    const R_IN = 1.75;
    const R_OUT = 3.7;
    const segs = [
      [z0 + t + 0.4, TZ - R_OUT + 0.1],
      [TZ + R_OUT - 0.1, z1 - t - 1.2],
    ];
    for (const [za, zb] of segs) {
      for (let z = za; z < zb - 0.2; z += 3.0) {
        const ze = Math.min(z + 2.85, zb);
        kit.boxMM("impDeck", [cx - plateW / 2, y, z], [cx + plateW / 2, y + 0.03, ze], { color: IMP.wallLight, texel: 0.5 });
        kit.boxMM("impMetal", [cx - plateW / 2 - 0.05, y, z - 0.03], [cx + plateW / 2 + 0.05, y + 0.014, z + 0.03], { color: IMP.steel });
      }
      // warm guide strips down both edges: the lit axis from the lift lobby to the glass
      for (const s of [-1, 1]) kit.boxMM("emitWarm", [cx + s * (plateW / 2 + 0.03) - 0.018, y, za - 0.1], [cx + s * (plateW / 2 + 0.03) + 0.018, y + 0.016, zb + 0.1]);
    }
    const ring = new THREE.RingGeometry(R_IN, R_OUT, 64);
    ring.rotateX(-Math.PI / 2);
    kit.add("impDeck", ring, { pos: [TX, y + 0.03, TZ], color: IMP.wallLight, uv: "world", texel: 0.5 });
    kit.add("emitWarm", new THREE.TorusGeometry(R_OUT + 0.03, 0.02, 6, 72), { pos: [TX, y + 0.01, TZ], rot: [Math.PI / 2, 0, 0] });
    kit.add("impMetal", new THREE.TorusGeometry(R_IN - 0.03, 0.03, 6, 64), { pos: [TX, y + 0.02, TZ], rot: [Math.PI / 2, 0, 0], color: IMP.steel });
    for (const s of [-1, 1]) {
      column(kit, cx + s * 4.4, z0 + 3.4, y, yc, { w: 0.6, d: 0.6, lit: false });
      kit.box("emitWarm", cx + s * 4.4 - s * 0.345, y + h / 2, z0 + 3.4, 0.006, h - 1.0, 0.03);
    }
    floorDecal(kit, cx - 2.9, y, z0 + 1.6, 0.9, 1);
    floorDecal(kit, cx + 2.9, y, z0 + 1.6, 0.9, 1, Math.PI);
    floorDecal(kit, cx - 2.9, y, z0 + 4.3, 0.8, 14);
    floorDecal(kit, cx + 2.9, y, z0 + 4.3, 0.8, 0);
    pointLightDesc(ctx, WARM, 2.2, 9, [cx, y + 3.6, z0 + 3.0], 1);
  }

  // ---- north wall: deck placards either side of the lobby door ----------------------------------------------------
  {
    const w = walls.north;
    const { frame } = wallFrame(kit, w.from, w.to, y);
    placard(frame, w.u(cx - 3.6), 2.7, 0.6, 14);
    placard(frame, w.u(cx + 3.6), 2.7, 0.6, 0);
    frame.quad("impDecal", w.u(cx - 7.5), 1.3, 0.16, 0.8, 0.4, { uvRect: impDecalRect(15) });
    frame.quad("impDecal", w.u(cx + 7.5), 1.3, 0.16, 0.8, 0.4, { uvRect: impDecalRect(15) });
  }

  // ---- star-chart table mid-room with a point-cloud galaxy hologram -------------------------------------------
  {
    const tx = TX;
    const tz = TZ;
    const r = 1.5;
    const th = 0.74;
    kit.add("impPaintedMetal", new THREE.CylinderGeometry(r, r + 0.1, th, 32), { pos: [tx, y + th / 2, tz], color: IMP.consoleDark, uv: "scale", uvScale: [4, 1] });
    kit.add("impMetal", new THREE.CylinderGeometry(r + 0.06, r + 0.06, 0.06, 32), { pos: [tx, y + th, tz], color: IMP.steel, uv: "scale", uvScale: [4, 0.2] });
    kit.add("emitBlue", new THREE.TorusGeometry(r - 0.08, 0.012, 8, 48), { pos: [tx, y + th + 0.03, tz], rot: [Math.PI / 2, 0, 0] });
    // matte black top: a gloss top mirrors the hologram light straight into the camera as a white slab
    kit.add("impPaintedMetal", new THREE.CylinderGeometry(r - 0.12, r - 0.12, 0.02, 32), { pos: [tx, y + th + 0.02, tz], color: IMP.black, uv: "scale", uvScale: [1, 1] });
    kit.add("blinkSparse", new THREE.CylinderGeometry(r + 0.001, r + 0.001, 0.1, 32, 1, true), { pos: [tx, y + th - 0.18, tz], uv: "scale", uvScale: [6, 1] });
    kit.collider([tx - r, y, tz - r], [tx + r, y + th, tz + r], "chartTable");
    // projector cone so the chart reads as a hologram from across the deck
    kit.add("beam", new THREE.CylinderGeometry(1.3, r - 0.2, 0.55, 32, 1, true), { pos: [tx, y + th + 0.3, tz] });
    // galaxy: a spiral disc of points, hyperlane segments, one target marker
    const N = 1400;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const rnd = mulberry(4021);
    const c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const arm = i % 3;
      const tt = Math.pow(rnd(), 0.6) * 1.15;
      const a = tt * 3.4 + arm * ((Math.PI * 2) / 3) + (rnd() - 0.5) * 0.7;
      const rr = 0.12 + tt * 1.05 + (rnd() - 0.5) * 0.12;
      pos[i * 3] = Math.cos(a) * rr;
      pos[i * 3 + 1] = (rnd() - 0.5) * 0.08 * (1.3 - tt);
      pos[i * 3 + 2] = Math.sin(a) * rr;
      c.setHSL(0.58 + (rnd() - 0.5) * 0.08, 0.7, 0.55 + rnd() * 0.35);
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const stars = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.042, vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
    const lanes = [];
    const laneMat = new THREE.LineBasicMaterial({ color: IMP.holo, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false });
    const node = (i) => [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
    let prev = node(7);
    for (let k = 0; k < 9; k++) {
      const nxt = node(40 + k * 93);
      lanes.push(...prev, ...nxt);
      prev = nxt;
    }
    // core ring marker
    for (let i = 0; i < 48; i++) {
      const a0 = (i / 48) * Math.PI * 2;
      const a1 = ((i + 1) / 48) * Math.PI * 2;
      lanes.push(Math.cos(a0) * 0.22, 0, Math.sin(a0) * 0.22, Math.cos(a1) * 0.22, 0, Math.sin(a1) * 0.22);
    }
    const laneGeo = new THREE.BufferGeometry();
    laneGeo.setAttribute("position", new THREE.Float32BufferAttribute(lanes, 3));
    const chart = new THREE.Group();
    chart.position.set(tx, y + th + 0.55, tz);
    chart.add(stars, new THREE.LineSegments(laneGeo, laneMat));
    ctx.add(chart);
    ctx.animate((dt, tm) => {
      chart.rotation.y += dt * 0.08;
      chart.position.y = y + th + 0.55 + Math.sin(tm * 0.6) * 0.02;
      laneMat.opacity = 0.38 + 0.1 * Math.sin(tm * 2.4);
    });
    pointLightDesc(ctx, IMP.holo, 1.6, 6, [tx, y + th + 1.4, tz], 2);
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + k * (Math.PI / 2);
      chair(kit, [tx + Math.sin(a) * 2.6, y, tz + Math.cos(a) * 2.6], a);
    }
    // ceiling emitter over the table
    kit.cyl("impPaintedMetal", tx, yc - 0.18, tz, 0.9, 0.36, "y", { color: IMP.consoleDark, segments: 28, texel: 1 });
    kit.add("emitBlue", new THREE.TorusGeometry(0.7, 0.02, 8, 40), { pos: [tx, yc - 0.37, tz], rot: [Math.PI / 2, 0, 0] });
  }

  // ---- lounge benches facing the glass, in three rows either side of the axis --------------------------------
  for (const [bx, bz, len] of [[-7.6, 637.4, 6.4], [7.6, 637.4, 6.4], [-7.6, 641.6, 6.4], [7.6, 641.6, 6.4], [-13.2, 645.9, 4.6], [13.2, 645.9, 4.6]]) {
    bench(kit, [bx, y, bz], len, Math.PI, { color: IMP.fabricBlack });
  }
  // low steel side tables at the walkway end of each bench row
  for (const s of [-1, 1]) {
    for (const sz of [637.4, 641.6]) {
      kit.box("impPaintedMetal", s * 3.6, y + 0.3, sz, 0.6, 0.6, 0.6, { color: IMP.consoleDark, texel: 1 });
      kit.box("darkGloss", s * 3.6, y + 0.615, sz, 0.66, 0.03, 0.66);
      kit.box("emitWarm", s * 3.6, y + 0.1, sz - 0.305, 0.4, 0.02, 0.01);
      kit.collider([s * 3.6 - 0.35, y, sz - 0.35], [s * 3.6 + 0.35, y + 0.65, sz + 0.35], "sideTable");
    }
  }

  // ---- west wall: memorial plaque wall, two sealed viewports ----------------------------------------------------
  {
    const w = walls.west;
    const { frame } = wallFrame(kit, w.from, w.to, y); // u: 0 at z1 .. 30 at z0
    const um = w.u(628.5); // memorial centre
    const MW = 10.0;
    const PN = 0.2; // plate stand-off: clears the shell wall's ribs so nothing pokes through it
    frame.box("impPaintedMetal", um, 2.0, PN / 2, MW, 3.2, PN, { color: IMP.consoleDark, texel: 1 });
    frame.box("impMetal", um, 0.42, 0.25, MW + 0.2, 0.04, 0.5, { color: IMP.steel, texel: 1 });
    frame.box("emitWarm", um, 0.36, PN + 0.01, MW - 0.4, 0.02, 0.01);
    frame.box("impPaintedMetal", um, 3.72, PN / 2 + 0.01, MW + 0.2, 0.24, PN + 0.02, { color: IMP.trim, texel: 1 });
    frame.box("lightBandWarm", um, 3.61, PN + 0.01, MW - 0.3, 0.05, 0.01, { uv: "keep" });
    placard(frame, um, 3.3, 0.55, 4, { n: PN });
    placard(frame, um - 3.2, 3.3, 0.5, 15, { n: PN });
    placard(frame, um + 3.2, 3.3, 0.5, 15, { n: PN });
    // 8 x 5 name plaques (instanced light-alloy plates) with an engraved glyph line each
    const plate = new THREE.BoxGeometry(0.72, 0.36, 0.02);
    setVertexColor(plate, IMP.steel);
    const transforms = [];
    const pq = frame.quat();
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 5; j++) {
        const pu = um - 3.85 + i * 1.1;
        const pv = 0.85 + j * 0.5;
        const p = frame.pos(pu, pv, PN + 0.01);
        transforms.push({ pos: [p.x, p.y, p.z], quat: pq });
        frame.quad("impDecal", pu, pv, PN + 0.025, 0.5, 0.25, { uvRect: impDecalRect([9, 15, 3][(i + j) % 3]) });
      }
    }
    kit.instanced("impPaintedMetal", plate, transforms);
    kit.collider([x0, y, 623.0], [x0 + t + 0.55, y + 4.0, 634.0], "memorial");
    pointLightDesc(ctx, WARM, 2.8, 9, [x0 + 2.0, y + 3.3, 628.5], 1);
    sealedPort(frame, w.u(639.0), 2.6);
    sealedPort(frame, w.u(645.0), 2.6);
    alertBeacon(frame, ctx, w.u(635.5), 3.4, { intensity: 0 });
  }

  // ---- east wall: dispenser counter, two sealed viewports ---------------------------------------------------------
  {
    const w = walls.east;
    const { frame } = wallFrame(kit, w.from, w.to, y); // u: 0 at z0 .. 30 at z1
    const ub = w.u(628.5);
    const BW = 8.0;
    // back counter along the wall with three dispensers and cups; front counter 1.3 m into the room
    frame.box("impPaintedMetal", ub, 0.5, 0.25, BW, 1.0, 0.5, { color: IMP.console, texel: 1 });
    frame.box("darkGloss", ub, 1.015, 0.26, BW + 0.04, 0.03, 0.54);
    frame.box("impPaintedMetal", ub, 2.15, 0.06, BW, 2.3, 0.12, { color: IMP.consoleDark, texel: 1 });
    frame.box("lightBandWarm", ub, 3.22, 0.125, BW - 0.4, 0.05, 0.01, { uv: "keep" });
    for (const du of [-2.6, 0, 2.6]) {
      frame.box("impPaintedMetal", ub + du, 1.75, 0.24, 0.9, 1.3, 0.36, { color: IMP.wallDark, texel: 1 });
      frame.box("blinkSparse", ub + du, 2.1, 0.425, 0.6, 0.18, 0.01, { uv: "keep" });
      frame.box("impMetal", ub + du, 1.62, 0.425, 0.7, 0.3, 0.01, { color: IMP.gunmetal });
      frame.cylN("impMetal", ub + du, 1.25, 0.5, 0.03, 0.2, { color: IMP.steel, segments: 8 });
      frame.box("emitBlue", ub + du + 0.3, 2.3, 0.425, 0.06, 0.06, 0.01);
      frame.quad("impDecal", ub + du - 0.25, 2.3, 0.427, 0.3, 0.3, { uvRect: impDecalRect(6) });
    }
    wallScreen(frame, ub - 1.3, 3.9, 1.6, 0.8, 0);
    wallScreen(frame, ub + 1.3, 3.9, 1.6, 0.8, 2);
    // cups: two rows of instanced steel beakers on the back counter
    const cup = new THREE.CylinderGeometry(0.045, 0.04, 0.11, 10);
    setVertexColor(cup, IMP.steel);
    const cups = [];
    for (let i = 0; i < 14; i++) {
      for (let j = 0; j < 2; j++) {
        const p = frame.pos(ub - 3.4 + i * 0.5 + (j ? 0.25 : 0) + (i % 2 ? 0.02 : -0.02), 1.085, 0.14 + j * 0.2);
        cups.push({ pos: [p.x, p.y, p.z] });
      }
    }
    kit.instanced("impMetal", cup, cups);
    // front counter with a lit kick, four stools
    const cxE = x1 - t - 1.6;
    kit.box("impPaintedMetal", cxE, y + 0.5, 628.5, 0.7, 1.0, BW, { color: IMP.console, texel: 1 });
    kit.box("darkGloss", cxE, y + 1.015, 628.5, 0.8, 0.03, BW + 0.06);
    kit.box("emitWarm", cxE - 0.355, y + 0.12, 628.5, 0.01, 0.02, BW - 0.4);
    kit.box("impPaintedMetal", cxE, y + 0.05, 628.5, 0.6, 0.1, BW - 0.2, { color: IMP.trim, texel: 1 });
    kit.collider([cxE - 0.4, y, 628.5 - BW / 2], [cxE + 0.4, y + 1.05, 628.5 + BW / 2], "counter");
    kit.collider([x1 - t - 0.55, y, 628.5 - BW / 2], [x1 - t, y + 1.05, 628.5 + BW / 2], "backCounter");
    for (let i = 0; i < 4; i++) chair(kit, [cxE - 0.95, y, 625.7 + i * 1.85], -Math.PI / 2);
    placard(frame, ub - 5.2, 2.2, 0.5, 0);
    frame.quad("impDecal", ub + 5.2, 2.2, 0.062, 0.6, 0.6, { uvRect: impDecalRect(13) });
    pointLightDesc(ctx, WARM, 2.2, 8, [x1 - 2.4, y + 3.2, 628.5], 0);
    sealedPort(frame, w.u(639.0), 2.6);
    sealedPort(frame, w.u(645.0), 2.6);
    alertBeacon(frame, ctx, w.u(635.5), 3.4, { intensity: 0.7, distance: 5 });
  }

  // ---- ceiling: warm troughs, soffit over the glass, beams ----------------------------------------------------------
  {
    for (const s of [-1, 1]) {
      ceilingLight(kit, ctx, [cx + s * 9.5, yc, 634.5], 22, "z", { mat: "lightBandWarm", color: WARM, intensity: 0, w: 0.3 });
      pointLightDesc(ctx, WARM, 2.4, 12, [cx + s * 9.5, yc - 0.6, 628.5], 1);
      pointLightDesc(ctx, WARM, 2.4, 12, [cx + s * 9.5, yc - 0.6, 640.5], 1);
    }
    for (const bz of [626.5, 638.0]) kit.box("impPaintedMetal", cx, yc - 0.25, bz, x1 - x0 - 0.6, 0.5, 0.45, { color: IMP.trim, texel: 1 });
    // soffit over the viewports with a dim warm wash strip facing the glass
    kit.boxMM("impPaintedMetal", [x0 + t, yc - 0.6, z1 - t - 1.4], [x1 - t, yc, z1 - t], { color: IMP.trim, texel: 1 });
    kit.box("emitWarm", cx, yc - 0.605, z1 - t - 0.7, x1 - x0 - 4, 0.01, 0.06);
    pipeRun(kit, [[x0 + 0.5, yc - 0.55, 638.65], [x1 - 0.5, yc - 0.55, 638.65]], 0.07, { color: IMP.gunmetal, clampPitch: 3 });
  }

  // ---- camera views ---------------------------------------------------------------------------------------------------
  const eye = y + STD.eye;
  ctx.view("observation", cx, eye, z0 + 2.4, 180, -3);
  ctx.view("observation_window", cx - 1.5, eye, 644.6, 180, 3);
  ctx.view("observation_memorial", -13.0, eye, 629.5, 90, -3);
  ctx.view("observation_bar", 12.6, eye, 629.0, -84, -4);
  ctx.view("observation_chart", -3.8, eye, 629.0, -146, -6);
}

// Armoured shutter over a sealed side viewport: casement, seven slats, seal lamp, restricted stencil.
function sealedPort(frame, u, v) {
  const W = 3.0;
  const H = 2.0;
  frame.box("impPaintedMetal", u, v, 0.05, W + 0.3, H + 0.3, 0.1, { color: IMP.trim, texel: 1 });
  frame.box("impPaintedMetal", u, v, 0.09, W, H, 0.04, { color: IMP.consoleDark, texel: 1 });
  for (let i = 0; i < 7; i++) frame.box("impMetal", u, v - H / 2 + 0.2 + i * 0.27, 0.13, W - 0.2, 0.2, 0.04, { color: IMP.gunmetal, tilt: 0.35 });
  frame.box("impPaintedMetal", u, v + H / 2 + 0.28, 0.12, 1.4, 0.24, 0.1, { color: IMP.consoleDark, texel: 1 });
  frame.box("emitAmber", u - 0.45, v + H / 2 + 0.28, 0.175, 0.16, 0.06, 0.01);
  frame.quad("impDecal", u + 0.3, v + H / 2 + 0.28, 0.172, 0.4, 0.2, { uvRect: impDecalRect(5) });
}

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
