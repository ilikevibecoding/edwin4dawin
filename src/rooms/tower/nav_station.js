// Secondary Navigation / Flight Control — a mini bridge on the starboard side of the main bridge.
// Zones: three console rows facing the forward glazing (helm / astrogation / flight control), a central
// walkway from the corridor door, the raised navigator's dais (0.4 m, stairs forward and a wide step aft)
// carrying the star-chart hologram and two navigator stations, astrogation computer banks on both side
// walls and the astrogation plot board on the starboard wall. Accent blue.
import * as THREE from "three";
import { IMP } from "../../core/palette.js";
import { ledRect, DECAL } from "../../textures.js";
import { Instancer, chairProto, lightBand, screenArray, doorPocket } from "./tactical.js";

export const meta = { id: "nav_station", stream: "tower-rooms" };

export function build(ctx) {
  const { kit, props } = ctx;
  const { x0, x1, z0, z1 } = ctx.inner;
  const fy = ctx.floor;
  const cx = (x0 + x1) / 2;
  const DAIS = { x0: cx - 4, x1: cx + 4, z0: 191.5, z1: 196.5, h: 0.4 };

  // The bridge door (br_nav) sits on the bridge wall at x = 14, two metres off this room's port wall (x = 16).
  // RoomManager.doorsFor files an x-door under xmin only when d.at equals box.x0 exactly, so today br_nav is
  // filed under xmax: the starboard wall gets a phantom opening and the port wall stays solid. Until the core
  // picks the nearest wall, carve the opening on the port wall here and seal the phantom (no-op once fixed).
  const wallLen = z1 - z0;
  const misfiled = ctx.doors.find((d) => d.door.id === "br_nav" && d.side === "xmax");
  const openingsOf = (side) => {
    const own = ctx.doors.filter((d) => d.side === side && d !== misfiled).map((d) => ({ type: d.type, u0: d.u0, u1: d.u1, v0: d.v0, v1: d.v1 }));
    if (misfiled && side === "xmin") own.push({ type: misfiled.type, u0: wallLen - misfiled.u1, u1: wallLen - misfiled.u0, v0: misfiled.v0, v1: misfiled.v1 });
    return own;
  };
  const sideWall = (side) => (misfiled ? { ...ctx.wall(side), openings: openingsOf(side) } : ctx.wall(side));

  ctx.shell({
    floorMat: "deckBlack",
    floorColor: IMP.plateLight,
    stripSpacing: 4.5,
    seed: 5,
    walls: {
      zmin: { styles: { plate: 0.8, panel: 0.1, vent: 0.1 } },
      zmax: { styles: { plate: 0.75, panel: 0.15, hatch: 0.1 } },
      xmin: { styles: { plate: 0.8, vent: 0.1, pipes: 0.1 }, ...(misfiled ? { openings: openingsOf("xmin") } : {}) },
      xmax: { styles: { plate: 0.8, panel: 0.1, vent: 0.1 }, ...(misfiled ? { openings: openingsOf("xmax") } : {}) },
    },
  });
  for (const side of ["zmin", "zmax"]) lightBand(ctx.wall(side));
  for (const side of ["xmin", "xmax"]) lightBand(sideWall(side));
  // passage to the bridge door (the door plane is the bridge wall, 2 m past our port wall)
  {
    const d = ctx.doors.find((o) => o.door.id === "br_nav");
    if (d) doorPocket(ctx, { xWall: ctx.box.x0, xDoor: d.door.at, z0: d.door.from, z1: d.door.to, h: d.door.h });
  }

  const inst = new Instancer(ctx);
  const chair = chairProto(inst, "nav_chair", { color: IMP.fabricGrey });

  // ---- central walkway: gloss inlay with edge lights from the corridor door to the dais steps ----
  {
    const wz0 = DAIS.z1 + 0.9;
    kit.boxMM("darkGloss", [cx - 1.7, fy + 0.002, wz0], [cx + 1.7, fy + 0.012, z1 - 1.3]);
    for (const s of [-1, 1]) {
      kit.boxMM("emitBlue", [cx + s * 1.72 - 0.015, fy + 0.003, wz0], [cx + s * 1.72 + 0.015, fy + 0.012, z1 - 1.3], { uv: "keep" });
      kit.boxMM("paintedMetal", [cx + s * 1.85 - 0.08, fy, wz0], [cx + s * 1.85 + 0.08, fy + 0.02, z1 - 1.3], { color: IMP.black });
    }
    kit.boxMM("hazard", [cx - 1.5, fy + 0.003, z1 - 1.3], [cx + 1.5, fy + 0.009, z1 - 0.05], { texel: 1.5 });
  }

  // ---- window sill + forward console rows ----
  {
    const W = ctx.wall("zmin");
    // sill ledge, LED strip and stencils under the glazing when the glass starts above knee height (bottom
    // edge from the room's window record); glass from the deck gets only a steel threshold strip
    const sill = ctx.def.windows && ctx.def.windows.length ? ctx.def.windows[0].v0 : 1.0;
    if (sill >= 0.45) {
      W.frame.box("paintedMetal", W.length / 2, sill - 0.03, 0.14, W.length - 0.6, 0.07, 0.3, { color: IMP.black, texel: 1 });
      W.frame.box("metal", W.length / 2, sill + 0.005, 0.2, W.length - 0.6, 0.015, 0.16, { color: IMP.steelDark });
      W.frame.box("leds", W.length / 2, sill - 0.2, 0.03, 6.0, 0.08, 0.01, { uv: "keep", uvRect: ledRect(1) });
      const ds = Math.min(0.55, sill - 0.1);
      for (const u of [1.6, W.length - 1.6]) W.frame.decal(u, sill / 2, 0.06, ds, ds, DECAL.NUMBER1);
    } else {
      W.frame.box("metal", W.length / 2, 0.01, 0.08, W.length - 0.6, 0.02, 0.16, { color: IMP.steelDark });
    }
  }
  const rows = [
    { z: 176.8, xs: [cx - 4.8, cx, cx + 4.8], sets: [[10, 4], [1, 10], [4, 0]] },
    { z: 180.8, xs: [cx - 3.6, cx + 3.6], sets: [[14, 3], [0, 13]] },
    { z: 184.5, xs: [cx - 3.6, cx + 3.6], sets: [[10, 12], [3, 1]] },
  ];
  let seed = 100;
  for (const row of rows) {
    row.xs.forEach((x, i) => {
      props.consoleStation(kit, { pos: [x, fy, row.z], yaw: 0, w: 2.6, d: 0.85, h: 1.0, screens: 2, accent: "emitBlue", seed: seed++, screenSet: row.sets[i] });
      chair(x, fy, row.z + 0.62, 0);
    });
    // row edge light in the deck
    kit.boxMM("emitBlue", [cx - 7.0, fy + 0.003, row.z + 0.1], [cx + 7.0, fy + 0.009, row.z + 0.13]);
  }

  // ---- navigator's dais ----
  {
    const { x0: dx0, x1: dx1, z0: dz0, z1: dz1, h } = DAIS;
    kit.boxMM("plate", [dx0, fy, dz0], [dx1, fy + h, dz1], { color: IMP.plateDark, uv: "world", texel: 1 });
    kit.boxMM("paintedMetal", [dx0 - 0.05, fy + h - 0.06, dz0 - 0.05], [dx1 + 0.05, fy + h, dz1 + 0.05], { color: IMP.black, texel: 1 });
    kit.boxMM("deckGrey", [dx0 + 0.1, fy + h, dz0 + 0.1], [dx1 - 0.1, fy + h + 0.012, dz1 - 0.1], { color: IMP.plateDark, texel: 0.5 });
    kit.collider([dx0, fy - 0.2, dz0], [dx1, fy + h, dz1], "dais");
    // riser lights along the front and sides
    kit.boxMM("emitWhiteSoft", [dx0 + 0.2, fy + 0.16, dz0 - 0.012], [dx1 - 0.2, fy + 0.2, dz0], { uv: "keep" });
    for (const x of [dx0, dx1]) kit.boxMM("emitWhiteSoft", [x - 0.006, fy + 0.16, dz0 + 0.2], [x + 0.006, fy + 0.2, dz1 - 0.2], { uv: "keep" });
    // stairs forward (centre) and a wide two-step aft
    props.stairs(kit, { pos: [cx, fy, dz0 - 0.9], yaw: Math.PI, width: 2.4, rise: h, run: 0.9, rails: false });
    props.stairs(kit, { pos: [cx, fy, dz1 + 0.9], yaw: 0, width: dx1 - dx0 - 0.4, rise: h, run: 0.9, rails: false, stringers: false });
    // railings: sides and the front on either side of the stairs
    const ry = fy + h;
    props.railing(kit, { from: [dx0, dz1], to: [dx0, dz0], y: ry });
    props.railing(kit, { from: [dx1, dz0], to: [dx1, dz1], y: ry });
    props.railing(kit, { from: [dx0, dz0], to: [cx - 1.3, dz0], y: ry, posts: 2 });
    props.railing(kit, { from: [cx + 1.3, dz0], to: [dx1, dz0], y: ry, posts: 2 });
    // navigator stations at the front corners, star chart at the centre
    for (const s of [-1, 1]) {
      props.consoleStation(kit, { pos: [cx + s * 2.8, ry, dz0 + 1.1], yaw: 0, w: 1.7, d: 0.8, h: 1.0, screens: 2, accent: "emitBlue", seed: 200 + s, screenSet: [10, 14] });
      chair(cx + s * 2.8, ry, dz0 + 1.7, 0);
    }
    props.holoTable(kit, { pos: [cx, ry, dz0 + 2.7], r: 1.0, h: 0.9, accent: "emitBlue" });
    starChart(ctx, [cx, ry + 0.9 + 1.25, dz0 + 2.7], 0.95);
    // overhead: ring housing with a blue underside above the star chart
    const ringY = ctx.ceil - 0.3;
    kit.add("paintedMetal", new THREE.TorusGeometry(1.5, 0.12, 8, 32).rotateX(Math.PI / 2), { pos: [cx, ringY, dz0 + 2.7], color: IMP.black, uv: "scale", uvScale: [8, 1] });
    kit.add("emitBlue", new THREE.TorusGeometry(1.5, 0.03, 6, 32).rotateX(Math.PI / 2), { pos: [cx, ringY - 0.12, dz0 + 2.7], uv: "keep" });
    kit.cyl("paintedMetal", cx, ctx.ceil - 0.25, dz0 + 2.7, 0.28, 0.5, "y", { color: IMP.plateDark, segments: 12, r2: 0.12 });
    kit.cyl("emitWhite", cx, ctx.ceil - 0.505, dz0 + 2.7, 0.09, 0.02, "y", { segments: 12 });
  }

  // ---- port wall (bridge door at z 186..189): astrogation computer banks ----
  {
    const W = ctx.wall("xmin");
    const u = (z) => z1 - z;
    for (const [z, sd] of [[176.6, 31], [180.2, 32], [193.4, 33], [197.0, 34], [200.6, 35]]) {
      props.computerBank(kit, { pos: [x0 + 0.6, fy, z], yaw: Math.PI / 2, w: 3.2, h: 2.6, d: 0.6, seed: sd, accent: "emitBlue" });
    }
    props.wallPanel(kit, W.frame, u(203.8), 1.6, { w: 1.1, h: 0.7, accent: "emitBlue", seed: 7 });
    W.frame.decal(u(203.8), 2.7, 0.06, 0.8, 0.8, DECAL.TEXT_B);
    W.frame.decal(u(183.2), 3.4, 0.06, 0.7, 0.7, DECAL.ARROW);
    kit.boxMM("hazard", [x0 + 0.05, fy + 0.003, 186.0], [x0 + 1.3, fy + 0.009, 189.0], { texel: 1.5 });
  }

  // ---- starboard wall: astrogation plot board + banks ----
  {
    const W = ctx.wall("xmax");
    const u = (z) => z - z0;
    screenArray(W.frame, u(196.5), 2.35, 3, 2, 1.5, 0.9, [10, 4, 14, 0, 1, 13]);
    W.frame.box("paintedMetal", u(196.5), 3.85, 0.1, 5.2, 0.16, 0.2, { color: IMP.black, texel: 1 });
    W.frame.decal(u(196.5), 4.4, 0.06, 0.9, 0.9, DECAL.EMBLEM);
    for (const [z, sd] of [[177.6, 36], [181.2, 37], [203.0, 38]]) {
      props.computerBank(kit, { pos: [x1 - 0.6, fy, z], yaw: -Math.PI / 2, w: 3.2, h: 2.6, d: 0.6, seed: sd, accent: "emitBlue" });
    }
    props.consoleStation(kit, { pos: [x1 - 0.95, fy, 196.5], yaw: -Math.PI / 2, w: 3.0, d: 0.9, h: 1.0, screens: 3, accent: "emitBlue", seed: 300, screenSet: [10, 4, 14] });
    props.wallPanel(kit, W.frame, u(191.2), 1.6, { w: 1.1, h: 0.7, accent: "emitBlue", seed: 9 });
    W.frame.decal(u(186.5), 3.2, 0.06, 0.8, 0.8, DECAL.TEXT_A);
  }

  // ---- aft wall: door at x 23..26, jump status bank east, systems bank west ----
  {
    const W = ctx.wall("zmax");
    const u = (x) => x1 - x;
    props.computerBank(kit, { pos: [cx + 5.2, fy, z1 - 0.6], yaw: Math.PI, w: 3.4, h: 2.6, d: 0.6, seed: 39, accent: "emitBlue" });
    props.computerBank(kit, { pos: [cx - 5.2, fy, z1 - 0.6], yaw: Math.PI, w: 3.4, h: 2.6, d: 0.6, seed: 40, accent: "emitBlue" });
    W.frame.decal(u(cx - 0.5), 4.4, 0.06, 1.4, 1.4, DECAL.EMBLEM);
    W.frame.decal(u(cx + 2.4), 1.7, 0.06, 0.6, 0.6, DECAL.DECK_A);
    W.frame.decal(u(cx - 3.3), 1.7, 0.06, 0.6, 0.6, DECAL.NUMBER2);
    screenArray(W.frame, u(cx + 5.2), 3.6, 2, 1, 1.4, 0.7, [7, 3]);
    screenArray(W.frame, u(cx - 5.2), 3.6, 2, 1, 1.4, 0.7, [14, 10]);
  }

  // ---- lights ----
  ctx.light(0xdfe8ff, 30, 20, [cx, fy + 4.6, 178.5], { decay: 1.5 });
  ctx.light(0xdfe8ff, 28, 20, [cx, fy + 4.6, 184.0], { decay: 1.5 });
  ctx.light(0xdfe8ff, 22, 16, [x0 + 3.5, fy + 4.4, 191.0], { decay: 1.5 });
  ctx.light(0xdfe8ff, 22, 16, [x1 - 3.5, fy + 4.4, 191.0], { decay: 1.5 });
  ctx.light(0x5fb8ff, 26, 12, [cx, fy + 3.6, DAIS.z0 + 2.7], { decay: 1.7 });
  ctx.light(0xdfe8ff, 28, 20, [cx + 4.5, fy + 4.4, 201.0], { decay: 1.5 });
  ctx.light(0xdfe8ff, 24, 18, [cx - 4.5, fy + 4.4, 201.0], { decay: 1.5 });
  inst.build();
}

/** Dotted star-sphere hologram with meridian rings, a plotted hyperspace route and a ship marker. */
function starChart(ctx, center, r) {
  const mats = ctx.materials;
  const holoMat = mats.holo.clone();
  holoMat.opacity = 0.2;
  const rand = ctx.rand;
  const pts = [];
  const N = 380;
  for (let i = 0; i < N; i++) {
    const k = (i + 0.5) / N;
    const phi = Math.acos(1 - 2 * k);
    const th = Math.PI * (1 + Math.sqrt(5)) * i;
    const rr = r * (0.96 + rand() * 0.08);
    pts.push(rr * Math.sin(phi) * Math.cos(th), rr * Math.cos(phi), rr * Math.sin(phi) * Math.sin(th));
  }
  for (let i = 0; i < 90; i++) {
    const rr = r * Math.cbrt(rand()) * 0.9;
    const phi = Math.acos(1 - 2 * rand());
    const th = rand() * Math.PI * 2;
    pts.push(rr * Math.sin(phi) * Math.cos(th), rr * Math.cos(phi), rr * Math.sin(phi) * Math.sin(th));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  const pm = new THREE.PointsMaterial({ color: 0x9ad4ff, size: 0.045, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const group = new THREE.Group();
  group.position.set(center[0], center[1], center[2]);
  group.add(new THREE.Points(g, pm));
  for (const rot of [[Math.PI / 2, 0, 0], [0, 0, 0], [0, 0, Math.PI / 2]]) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.006, 6, 96), holoMat);
    m.rotation.set(rot[0], rot[1], rot[2]);
    group.add(m);
  }
  // plotted route: amber polyline between two waypoints inside the sphere
  const route = [];
  const a = new THREE.Vector3(-0.5, -0.2, 0.4).multiplyScalar(r);
  const b = new THREE.Vector3(0.55, 0.35, -0.3).multiplyScalar(r);
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const p = a.clone().lerp(b, t);
    p.y += Math.sin(t * Math.PI) * 0.25 * r;
    route.push(p.x, p.y, p.z);
  }
  const rg = new THREE.BufferGeometry();
  rg.setAttribute("position", new THREE.Float32BufferAttribute(route, 3));
  const routeMat = new THREE.LineBasicMaterial({ color: 0xffb547, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  group.add(new THREE.Line(rg, routeMat));
  const wpMat = new THREE.PointsMaterial({ color: 0xffb547, size: 0.09, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
  const wg = new THREE.BufferGeometry();
  wg.setAttribute("position", new THREE.Float32BufferAttribute([a.x, a.y, a.z, b.x, b.y, b.z], 3));
  group.add(new THREE.Points(wg, wpMat));
  // ship marker: tiny wedge travelling the route
  const ship = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 4), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  group.add(ship);
  // projection cone from the pedestal emitter
  const coneMat = mats.holo.clone();
  coneMat.opacity = 0.05;
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.95, 0.14, 1.25, 32, 1, true), coneMat);
  cone.position.set(center[0], center[1] - 0.62, center[2]);
  ctx.add(group);
  ctx.add(cone);
  let time = 0;
  ctx.animate((dt) => {
    time += dt;
    group.rotation.y = time * 0.12;
    const t = (time * 0.08) % 1;
    const i = Math.min(11, Math.floor(t * 12));
    const f = t * 12 - i;
    ship.position.set(route[i * 3] + (route[i * 3 + 3] - route[i * 3]) * f, route[i * 3 + 1] + (route[i * 3 + 4] - route[i * 3 + 1]) * f, route[i * 3 + 2] + (route[i * 3 + 5] - route[i * 3 + 2]) * f);
    pm.opacity = 0.8 + 0.15 * Math.sin(time * 9.0) * Math.sin(time * 2.3);
    holoMat.opacity = 0.18 + 0.05 * Math.sin(time * 6.0);
  });
}
