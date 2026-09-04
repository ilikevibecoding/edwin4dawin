// Tactical Operations / Holo Planning — the dark holographic planning room on the port side of the bridge.
// Zones: the forward window watch (two seated consoles under the glazing), the central holo pit (holo table
// with an animated ship + planet hologram, standing rails, projector ring overhead), the port-wall screen
// array with three standing stations, the aft briefing screen bank and the computer banks by the bridge door.
// Accent blue/red; the room is kept dim (5 lights) so the hologram and screens carry the light.
import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { IMP } from "../../core/palette.js";
import { imperialCeiling } from "../../core/room.js";
import { prism, worldUVs } from "../../core/kit.js";
import { screenRect, ledRect, DECAL } from "../../textures.js";

export const meta = { id: "tactical", stream: "tower-rooms" };

const TABLE_Z = 190;

export function build(ctx) {
  const { kit, props } = ctx;
  const { x0, x1, z0, z1 } = ctx.inner;
  const fy = ctx.floor;
  const cx = (x0 + x1) / 2;

  // ---- envelope: black gloss deck, blue light bands, ceiling channels kept away from the holo pit ----
  ctx.shell({
    floorMat: "deckBlack",
    floorColor: IMP.plateLight,
    ceiling: false,
    seed: 3,
    walls: {
      zmin: { stripMat: "emitBlue", styles: { plate: 0.8, panel: 0.1, vent: 0.1 } },
      zmax: { stripMat: "emitBlue", styles: { plate: 0.8, panel: 0.12, hatch: 0.08 } },
      xmin: { stripMat: "emitBlue", styles: { plate: 0.85, vent: 0.08, pipes: 0.07 } },
      xmax: { stripMat: "emitBlue", styles: { plate: 0.8, panel: 0.1, vent: 0.1 } },
    },
  });
  const { frame: cf, w: cw, d: cd } = ctx.ceilingFrame();
  imperialCeiling(cf, cw, cd, { seed: 21, stripSpacing: 16, dir: "u", stripMat: "emitWhiteSoft" });
  for (const side of ["zmin", "zmax", "xmin", "xmax"]) lightBand(ctx.wall(side), { mat: "emitBlue" });
  // passage to the bridge door (the door plane is the bridge wall, 2 m past our starboard wall)
  {
    const d = ctx.doors.find((o) => o.door.id === "br_tac");
    if (d) doorPocket(ctx, { xWall: ctx.box.x1, xDoor: d.door.at, z0: d.door.from, z1: d.door.to, h: d.door.h });
  }

  // ---- forward window watch ----
  {
    const W = ctx.wall("zmin");
    // sill ledge under the glazing when the glass starts above knee height (its bottom edge comes from the
    // room's window record); glass from the deck gets only a steel threshold strip along the glazing line
    const sill = ctx.def.windows && ctx.def.windows.length ? ctx.def.windows[0].v0 : 1.0;
    if (sill >= 0.45) {
      W.frame.box("paintedMetal", W.length / 2, sill - 0.03, 0.14, W.length - 0.6, 0.07, 0.3, { color: IMP.black, texel: 1 });
      W.frame.box("metal", W.length / 2, sill + 0.005, 0.2, W.length - 0.6, 0.015, 0.16, { color: IMP.steelDark });
      const ds = Math.min(0.6, sill - 0.1);
      for (const u of [2.5, W.length - 2.5]) W.frame.decal(u, sill / 2, 0.06, ds, ds, DECAL.TEXT_A);
    } else {
      W.frame.box("metal", W.length / 2, 0.01, 0.08, W.length - 0.6, 0.02, 0.16, { color: IMP.steelDark });
    }
    for (const x of [cx - 4.6, cx + 4.6]) {
      props.consoleStation(kit, { pos: [x, fy, 176.2], yaw: 0, w: 2.6, d: 0.85, h: 1.0, screens: 3, accent: "emitBlue", seed: 11 + Math.round(x), screenSet: [0, 4, 12] });
    }
    // centre: low plotting plinth with a tilted chart screen (keeps the view out clear)
    kit.box("paintedMetal", cx, fy + 0.3, 176.0, 1.4, 0.6, 0.7, { color: IMP.black, texel: 1 });
    kit.box("plate", cx, fy + 0.62, 176.0, 1.3, 0.05, 0.62, { color: IMP.plateDark, uv: "keep" });
    kit.add("darkGloss", new THREE.BoxGeometry(1.2, 0.03, 0.5), { pos: [cx, fy + 0.68, 176.0], rot: [0.35, 0, 0] });
    kit.add("screen", new THREE.PlaneGeometry(1.1, 0.42), { pos: [cx, fy + 0.7, 175.98], rot: [-Math.PI / 2 + 0.35, 0, 0], uv: "keep", uvRect: screenRect(1) });
    kit.collider([cx - 0.7, fy, 175.65], [cx + 0.7, fy + 0.7, 176.35], "plinth");
  }
  // officer chairs at the forward consoles (instanced prototype)
  const inst = new Instancer(ctx);
  const chair = chairProto(inst, "tac_chair", { color: IMP.fabricGrey });
  chair(cx - 4.6, fy, 176.8, 0);
  chair(cx + 4.6, fy, 176.8, 0);

  // ---- central holo pit ----
  holoPit(ctx, cx, fy, TABLE_Z);

  // ---- port wall: screen array over three standing stations ----
  {
    const W = ctx.wall("xmin");
    const u = z1 - TABLE_Z; // u runs aft -> forward along this wall
    screenArray(W.frame, u, 2.15, 5, 2, 1.5, 0.85, [0, 1, 4, 12, 3, 12, 10, 0, 5, 1]);
    for (const dz of [-3.0, 0, 3.0]) {
      props.consoleStation(kit, { pos: [x0 + 0.9, fy, TABLE_Z + dz], yaw: Math.PI / 2, w: 2.7, d: 0.85, h: 1.0, screens: 2, accent: "emitBlue", seed: 41 + dz, screenSet: [12, 0] });
    }
    // flanking pilasters with red status lamps frame the array
    for (const du of [-4.9, 4.9]) {
      W.frame.box("paintedMetal", u + du, ctx.h / 2, 0.14, 0.3, ctx.h, 0.26, { color: IMP.plateDark, texel: 1 });
      W.frame.box("paintedMetal", u + du, ctx.h / 2, 0.29, 0.18, ctx.h - 0.3, 0.06, { color: IMP.black, texel: 1 });
      W.frame.box("emitRed", u + du, 3.4, 0.33, 0.06, 0.4, 0.01);
      W.frame.collider(u + du - 0.15, u + du + 0.15, 0, ctx.h, 0, 0.32, "pilaster");
    }
    // a tall threat board further forward
    screenArray(W.frame, u + 9.5, 2.2, 1, 3, 1.3, 0.62, [5, 3, 12]);
    W.frame.decal(u - 9.0, 2.6, 0.06, 0.9, 0.9, DECAL.EMBLEM);
  }

  // ---- aft wall: briefing screen bank west of the corridor door, computer banks east of it ----
  {
    const W = ctx.wall("zmax");
    const uBank = x1 - (cx - 5.0); // x = -30
    W.frame.box("paintedMetal", uBank, 2.35, 0.08, 4.4, 2.7, 0.16, { color: IMP.black, texel: 1 });
    W.frame.box("plate", uBank, 2.35, 0.17, 4.2, 2.5, 0.02, { color: IMP.plateDark, uv: "keep" });
    W.frame.box("darkGloss", uBank, 2.4, 0.19, 3.7, 2.1, 0.03);
    W.frame.box("screen", uBank, 2.4, 0.21, 3.6, 2.0, 0.006, { uv: "keep", uvRect: screenRect(1) });
    W.frame.box("leds", uBank, 1.2, 0.19, 2.6, 0.08, 0.006, { uv: "keep", uvRect: ledRect(9) });
    for (const s of [-1, 1]) {
      W.frame.box("darkGloss", uBank + s * 2.75, 2.4, 0.16, 0.9, 1.5, 0.03);
      W.frame.box("screen", uBank + s * 2.75, 2.4, 0.18, 0.8, 1.4, 0.006, { uv: "keep", uvRect: screenRect(s < 0 ? 5 : 3) });
    }
    props.consoleStation(kit, { pos: [cx - 5.0, fy, z1 - 0.95], yaw: Math.PI, w: 3.2, d: 0.9, h: 1.0, screens: 3, accent: "emitRed", seed: 77, screenSet: [1, 12, 4] });
    // east of the door
    props.computerBank(kit, { pos: [x1 - 1.6, fy, z1 - 0.6], yaw: Math.PI, w: 2.8, h: 2.6, d: 0.6, seed: 5, accent: "emitBlue" });
    props.computerBank(kit, { pos: [x1 - 4.65, fy, z1 - 0.6], yaw: Math.PI, w: 2.8, h: 2.6, d: 0.6, seed: 6, accent: "emitRed" });
    // emblem over the corridor door, deck stencil beside it
    const uDoor = x1 - -24.5;
    W.frame.decal(uDoor, 4.5, 0.06, 1.5, 1.5, DECAL.EMBLEM);
    W.frame.decal(uDoor + 2.4, 1.7, 0.06, 0.6, 0.6, DECAL.DECK_A);
    W.frame.decal(uDoor - 2.4, 1.7, 0.06, 0.6, 0.6, DECAL.TEXT_B);
  }

  // ---- starboard wall (bridge door at z 186..189): sensor banks forward, plot boards aft ----
  {
    const W = ctx.wall("xmax");
    const u = (z) => z - z0;
    props.computerBank(kit, { pos: [x1 - 0.6, fy, 178.5], yaw: -Math.PI / 2, w: 3.0, h: 2.6, d: 0.6, seed: 8, accent: "emitBlue" });
    props.computerBank(kit, { pos: [x1 - 0.6, fy, 182.2], yaw: -Math.PI / 2, w: 3.0, h: 2.6, d: 0.6, seed: 9, accent: "emitRed" });
    screenArray(W.frame, u(196.5), 2.3, 3, 2, 1.3, 0.8, [10, 4, 0, 13, 12, 1]);
    props.wallPanel(kit, W.frame, u(201.5), 1.6, { w: 1.0, h: 0.7, accent: "emitRed", seed: 3 });
    W.frame.decal(u(201.5), 2.8, 0.06, 0.8, 0.8, DECAL.WARNING);
    W.frame.decal(u(190.5), 3.6, 0.06, 0.7, 0.7, DECAL.RESTRICTED);
    // hazard sill in front of the bridge door
    kit.boxMM("hazard", [x1 - 1.3, fy + 0.003, 186.0], [x1 - 0.05, fy + 0.009, 189.0], { texel: 1.5 });
  }
  // hazard sill in front of the corridor door
  kit.boxMM("hazard", [-26.0, fy + 0.003, z1 - 1.3], [-23.0, fy + 0.009, z1 - 0.05], { texel: 1.5 });

  // ---- lights (dim relative to the working rooms; the hologram carries the centre) ----
  ctx.light(0x5fb8ff, 30, 15, [cx, fy + 3.4, TABLE_Z], { decay: 1.7 });
  ctx.light(0xc9d6ff, 30, 24, [cx, fy + 4.4, 178.5], { decay: 1.5 });
  ctx.light(0xc9d6ff, 24, 20, [x0 + 4.0, fy + 4.2, TABLE_Z + 0.5], { decay: 1.5 });
  ctx.light(0xff6a5a, 18, 16, [cx - 4.0, fy + 4.2, z1 - 3.2], { decay: 1.5 });
  ctx.light(0xc9d6ff, 22, 20, [x1 - 4.0, fy + 4.2, 197.0], { decay: 1.5 });
  inst.build();
}

/** Recessed light band across a wall (the grid's own strip sits inside its housing): skips the openings. */
export function lightBand(W, { v0 = 1.6, v1 = 1.85, mat = "emitWhiteSoft", n = -0.02, skip = [] } = {}) {
  let spans = [[0.03, W.length - 0.03]];
  const cuts = W.openings.filter((o) => o.v0 < v1 && o.v1 > v0).map((o) => [o.u0 - 0.04, o.u1 + 0.04]).concat(skip);
  for (const [a, b] of cuts) {
    const next = [];
    for (const [s0, s1] of spans) {
      if (b <= s0 || a >= s1) next.push([s0, s1]);
      else {
        if (a > s0 + 0.05) next.push([s0, a]);
        if (b < s1 - 0.05) next.push([b, s1]);
      }
    }
    spans = next;
  }
  for (const [a, b] of spans) W.frame.box(mat, (a + b) / 2, (v0 + v1) / 2, n, b - a, v1 - v0 - 0.09, 0.02, { uv: "keep" });
}

/**
 * Short passage between a room wall and a door whose plane lies off that wall (the bridge doors sit on the
 * bridge wall at x = ±14, two metres from the tactical / nav_station walls at x = ∓16). Floor, lintel slab,
 * side walls with a light slot, colliders. xWall = this room's box edge, xDoor = door plane, z0..z1 = opening.
 */
export function doorPocket(ctx, { xWall, xDoor, z0, z1, h = 2.6 }) {
  const { kit } = ctx;
  const fy = ctx.floor;
  const dir = Math.sign(xDoor - xWall); // +1: pocket extends toward +x
  const xa = Math.min(xWall, xDoor - dir * 0.25);
  const xb = Math.max(xWall, xDoor - dir * 0.25);
  const t = 0.25;
  kit.boxMM("deckGrey", [xa, fy - 0.3, z0 - t], [xb, fy, z1 + t], { color: IMP.plateDark, texel: 0.5 });
  kit.collider([xa, fy - 0.6, z0 - t], [xb, fy, z1 + t], "pocket_floor");
  kit.boxMM("paintedMetal", [xa, fy + h, z0 - t], [xb, fy + h + 0.4, z1 + t], { color: IMP.black, texel: 0.3 });
  for (const [za, zb] of [[z0 - t, z0], [z1, z1 + t]]) {
    kit.boxMM("plate", [xa, fy, za], [xb, fy + h, zb], { color: IMP.plateDark, uv: "world", texel: 1 });
    kit.collider([xa, fy, za], [xb, fy + h, zb], "pocket_wall");
    // light slot on the inner face (za === z0 - t is the low-z wall, whose inner face looks toward +z)
    const zf = za === z0 - t ? z0 : z1;
    const n = za === z0 - t ? 1 : -1;
    const zz = (d0, d1) => [Math.min(zf + n * d0, zf + n * d1), Math.max(zf + n * d0, zf + n * d1)];
    let [q0, q1] = zz(0, 0.03);
    kit.boxMM("paintedMetal", [xa + 0.1, fy + 1.6, q0], [xb - 0.1, fy + 1.85, q1], { color: IMP.black, texel: 1 });
    [q0, q1] = zz(0.03, 0.04);
    kit.boxMM("emitWhiteSoft", [xa + 0.14, fy + 1.66, q0], [xb - 0.14, fy + 1.79, q1], { uv: "keep" });
  }
}

/**
 * Collision for a thin diagonal element (rail, chord) as `pieces` short AABBs hugging the line from -> to
 * (floor points), so the walkable space follows the geometry instead of its bounding square.
 */
export function diagonalColliders(kit, from, to, y, h, pieces = 4, tag = "rail", half = 0.09) {
  for (let i = 0; i < pieces; i++) {
    const t0 = i / pieces;
    const t1 = (i + 1) / pieces;
    const ax = from[0] + (to[0] - from[0]) * t0;
    const az = from[1] + (to[1] - from[1]) * t0;
    const bx = from[0] + (to[0] - from[0]) * t1;
    const bz = from[1] + (to[1] - from[1]) * t1;
    kit.collider([Math.min(ax, bx) - half, y, Math.min(az, bz) - half], [Math.max(ax, bx) + half, y + h, Math.max(az, bz) + half], tag);
  }
}

// ---------------------------------------------------------------------------------------------------
/** Holo table, floor inlay, standing rails, projector ring and the animated hologram. */
function holoPit(ctx, cx, fy, cz) {
  const { kit, props } = ctx;
  // floor inlay: dark gloss disc, blue emissive ring, red/white hazard ring, grating at the four approaches
  kit.add("darkGloss", new THREE.CircleGeometry(2.6, 48).rotateX(-Math.PI / 2), { pos: [cx, fy + 0.002, cz], uv: "keep" });
  kit.add("emitBlue", new THREE.RingGeometry(2.5, 2.6, 48).rotateX(-Math.PI / 2), { pos: [cx, fy + 0.004, cz], uv: "keep" });
  kit.add("hazardRed", new THREE.RingGeometry(3.05, 3.3, 48).rotateX(-Math.PI / 2), { pos: [cx, fy + 0.003, cz], uv: "world", texel: 2 });
  for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    const gx = cx + dx * 4.4;
    const gz = cz + dz * 4.4;
    if (dx) props.floorGrate(kit, [gx - 0.6, gz - 1.2], [gx + 0.6, gz + 1.2], fy + 0.004);
    else props.floorGrate(kit, [gx - 1.2, gz - 0.6], [gx + 1.2, gz + 0.6], fy + 0.004);
  }
  props.holoTable(kit, { pos: [cx, fy, cz], r: 1.6, h: 0.95, accent: "emitBlue" });
  // standing rails: four diagonal chords of an octagon, gaps on the axes for access. A diagonal rail's own
  // collider is its full AABB (a 2 m square that would wall off the approaches), so collide per sub-segment.
  const R = 3.6;
  for (let k = 0; k < 4; k++) {
    const a0 = THREE.MathUtils.degToRad(22.5 + 90 * k);
    const a1 = THREE.MathUtils.degToRad(67.5 + 90 * k);
    const from = [cx + R * Math.cos(a0), cz + R * Math.sin(a0)];
    const to = [cx + R * Math.cos(a1), cz + R * Math.sin(a1)];
    props.railing(kit, { from, to, y: fy, posts: 3, collide: false });
    diagonalColliders(kit, from, to, fy, 1.1, 5, "railing");
  }
  // projector ring overhead: octagonal housing with blue underside strips, hangers, central projector
  const ry = ctx.ceil - 0.42;
  const apo = 2.3;
  for (let k = 0; k < 8; k++) {
    const phi = (k / 8) * Math.PI * 2;
    const px = cx + apo * Math.cos(phi);
    const pz = cz + apo * Math.sin(phi);
    const rot = [0, -(phi + Math.PI / 2), 0];
    const len = 2 * apo * Math.tan(Math.PI / 8);
    kit.box("paintedMetal", px, ry, pz, len + 0.02, 0.24, 0.18, { color: IMP.black, texel: 1, rot });
    kit.box("metal", px, ry - 0.13, pz, len - 0.1, 0.02, 0.2, { color: IMP.steelDark, rot });
    kit.box("emitBlue", px, ry - 0.14, pz, len - 0.3, 0.012, 0.05, { rot });
    if (k % 2 === 1) kit.cyl("metal", px, (ry + ctx.ceil) / 2 + 0.06, pz, 0.025, ctx.ceil - ry, "y", { color: IMP.gunmetal, segments: 8 });
  }
  kit.cyl("paintedMetal", cx, ctx.ceil - 0.35, cz, 0.42, 0.7, "y", { color: IMP.black, segments: 16 });
  kit.cyl("paintedMetal", cx, ctx.ceil - 0.85, cz, 0.42, 0.3, "y", { color: IMP.plateDark, segments: 16, r2: 0.18 });
  kit.cyl("emitWhite", cx, ctx.ceil - 1.005, cz, 0.13, 0.02, "y", { segments: 16 });
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    kit.box("emitRed", cx + Math.cos(a) * 0.43, ctx.ceil - 0.3, cz + Math.sin(a) * 0.43, 0.05, 0.05, 0.05);
  }

  // ---- the hologram: wireframe wedge + orbiting planet marker + base rings, projected from the table ----
  const mats = ctx.materials;
  const faceMat = mats.holo.clone();
  faceMat.opacity = 0.14;
  const coneMat = mats.holo.clone();
  coneMat.opacity = 0.05;
  const lineMat = new THREE.LineBasicMaterial({ color: 0x9ad4ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  const redLine = new THREE.LineBasicMaterial({ color: 0xff6a5a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });

  const baseY = fy + 0.95;
  const holoY = baseY + 1.35;
  const holo = new THREE.Group();
  holo.position.set(cx, holoY, cz);
  const ship = shipGeometry(2.8);
  holo.add(new THREE.Mesh(ship, faceMat));
  holo.add(new THREE.LineSegments(new THREE.EdgesGeometry(ship, 12), lineMat));
  // base grid rings (counter-rotate)
  const rings = new THREE.Group();
  for (const r of [0.9, 1.6, 2.1]) rings.add(new THREE.Mesh(new THREE.RingGeometry(r - 0.012, r + 0.012, 64).rotateX(-Math.PI / 2), faceMat));
  const tick = new THREE.BufferGeometry();
  const tp = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    tp.push(Math.cos(a) * 2.0, 0, Math.sin(a) * 2.0, Math.cos(a) * 2.2, 0, Math.sin(a) * 2.2);
  }
  tick.setAttribute("position", new THREE.Float32BufferAttribute(tp, 3));
  rings.add(new THREE.LineSegments(tick, lineMat));
  rings.position.y = -0.5;
  holo.add(rings);
  // planet marker on a tilted orbit
  const orbit = new THREE.Group();
  orbit.rotation.x = 0.35;
  orbit.add(new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.006, 6, 96).rotateX(Math.PI / 2), faceMat));
  const planet = new THREE.Group();
  planet.add(new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(0.18, 1)), redLine));
  planet.add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), faceMat));
  orbit.add(planet);
  holo.add(orbit);
  // projection cone from the emitter up to the base ring
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 0.2, holoY - 0.5 - baseY, 40, 1, true), coneMat);
  cone.position.set(cx, (holoY - 0.5 + baseY) / 2, cz);
  ctx.add(holo);
  ctx.add(cone);

  let time = 0;
  ctx.animate((dt) => {
    time += dt;
    holo.rotation.y = time * 0.22;
    rings.rotation.y = -time * 0.35;
    const a = time * 0.55;
    planet.position.set(Math.cos(a) * 2.0, 0, Math.sin(a) * 2.0);
    planet.rotation.y = time * 1.5;
    const flicker = 0.5 + 0.5 * Math.sin(time * 17.3) * Math.sin(time * 5.1);
    faceMat.opacity = 0.12 + 0.04 * flicker;
    lineMat.opacity = 0.75 + 0.2 * flicker;
    holo.position.y = holoY + Math.sin(time * 0.8) * 0.03;
  });
}

/** Schematic Star Destroyer: wedge hull, dorsal terraces, bridge tower and engine block, bow toward -Z. */
function shipGeometry(L) {
  const W = L * 0.56;
  const T = L * 0.05;
  const hull = prism(
    [
      [0, -L / 2],
      [W / 2, L * 0.42],
      [W * 0.36, L / 2],
      [-W * 0.36, L / 2],
      [-W / 2, L * 0.42],
    ],
    T,
  ).rotateX(Math.PI / 2);
  const city1 = prism([[0, -L * 0.2], [W * 0.22, L * 0.44], [-W * 0.22, L * 0.44]], T * 1.4).rotateX(Math.PI / 2).translate(0, T * 1.1, 0);
  const city2 = prism([[0, -L * 0.05], [W * 0.13, L * 0.42], [-W * 0.13, L * 0.42]], T * 1.2).rotateX(Math.PI / 2).translate(0, T * 2.3, 0);
  const neck = new THREE.BoxGeometry(W * 0.14, T * 1.8, L * 0.07).translate(0, T * 3.6, L * 0.31);
  const bridge = new THREE.BoxGeometry(W * 0.3, T * 1.1, L * 0.07).translate(0, T * 5.0, L * 0.31);
  const eng = [];
  for (const ex of [-W * 0.16, 0, W * 0.16]) eng.push(new THREE.CylinderGeometry(T * 0.9, T * 0.9, L * 0.05, 10).rotateX(Math.PI / 2).translate(ex, -T * 0.1, L * 0.52));
  const g = mergeGeometries([hull, city1, city2, neck, bridge, ...eng].map((x) => x.toNonIndexed()), false);
  g.computeVertexNormals();
  return g;
}

/** Wall-mounted grid of bezelled screens on a frame at (u, v); ids cycle through the screen atlas. */
export function screenArray(frame, u, v, cols, rows, sw, sh, ids, { gap = 0.1, n = 0.06 } = {}) {
  const W = cols * (sw + gap) + gap;
  const H = rows * (sh + gap) + gap;
  frame.box("paintedMetal", u, v, n, W + 0.3, H + 0.3, 0.12, { color: IMP.black, texel: 1 });
  frame.box("plate", u, v, n + 0.07, W + 0.1, H + 0.1, 0.02, { color: IMP.plateDark, uv: "keep" });
  let k = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cu = u - W / 2 + gap + sw / 2 + c * (sw + gap);
      const cv = v + H / 2 - gap - sh / 2 - r * (sh + gap);
      frame.box("darkGloss", cu, cv, n + 0.09, sw + 0.06, sh + 0.06, 0.03);
      frame.box("screen", cu, cv, n + 0.108, sw, sh, 0.006, { uv: "keep", uvRect: screenRect(ids[k++ % ids.length]) });
    }
  }
  frame.box("leds", u, v - H / 2 - 0.09, n + 0.09, Math.min(W - 0.4, 2.4), 0.07, 0.006, { uv: "keep", uvRect: ledRect(5) });
  frame.box("emitRed", u + W / 2 + 0.05, v + H / 2 + 0.05, n + 0.09, 0.06, 0.06, 0.01);
}

/**
 * Room-local instancing (one InstancedMesh per prototype, added through ctx.add). Unlike Kit.proto this
 * keeps a white vertex-colour attribute on the prototype, which the vertex-coloured materials require —
 * without it the instances render black. Call build() at the end of the room builder.
 */
export class Instancer {
  constructor(ctx) {
    this.ctx = ctx;
    this.protos = new Map();
  }
  proto(name, mat, geo, { texel = 1 } = {}) {
    if (!geo.index) geo = mergeVertices(geo);
    if (!geo.attributes.normal) geo.computeVertexNormals();
    worldUVs(geo, texel);
    const n = geo.attributes.position.count;
    geo.setAttribute("color", new THREE.BufferAttribute(new Uint8Array(n * 3).fill(255), 3, true));
    this.protos.set(name, { mat, geo, items: [] });
  }
  place(name, pos, yaw = 0, color = 0xffffff) {
    const p = this.protos.get(name);
    const m = new THREE.Matrix4().compose(new THREE.Vector3(pos[0], pos[1], pos[2]), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(1, 1, 1));
    p.items.push({ m, color: color instanceof THREE.Color ? color : new THREE.Color(color) });
  }
  build() {
    for (const [name, p] of this.protos) {
      if (!p.items.length) continue;
      const mat = this.ctx.materials[p.mat];
      const im = new THREE.InstancedMesh(p.geo, mat, p.items.length);
      im.name = "inst_" + name;
      for (let i = 0; i < p.items.length; i++) {
        im.setMatrixAt(i, p.items[i].m);
        im.setColorAt(i, p.items[i].color);
      }
      im.instanceMatrix.needsUpdate = true;
      im.instanceColor.needsUpdate = true;
      im.castShadow = !p.mat.startsWith("emit");
      im.receiveShadow = true;
      im.computeBoundingSphere();
      this.ctx.add(im);
    }
    this.protos.clear();
  }
}

/**
 * Instanced Imperial operator chair: three prototypes (black frame, fabric, steel post). Returns
 * place(x, y, z, yaw) which places all three and adds the collider.
 */
export function chairProto(inst, name, { color = IMP.fabricBlack } = {}) {
  const frame = [];
  const soft = [];
  const box = (arr, x, y, z, sx, sy, sz, rx = 0) => arr.push(new THREE.BoxGeometry(sx, sy, sz).rotateX(rx).translate(x, y, z));
  frame.push(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 16).translate(0, 0.03, 0));
  box(frame, 0, 0.42, 0, 0.5, 0.05, 0.5);
  box(frame, 0, 0.95, 0.32, 0.54, 0.9, 0.04, -0.18);
  box(frame, 0, 1.45, 0.2, 0.3, 0.16, 0.1, -0.18);
  for (const bx of [-0.25, 0.25]) box(frame, bx, 0.57, 0.02, 0.08, 0.08, 0.5);
  for (const ax of [-0.33, 0.33]) {
    box(frame, ax, 0.7, 0.08, 0.05, 0.28, 0.08);
    box(frame, ax, 0.85, 0.04, 0.07, 0.04, 0.42);
  }
  box(soft, 0, 0.5, 0, 0.56, 0.11, 0.54);
  box(soft, 0, 0.95, 0.26, 0.5, 0.86, 0.1, -0.18);
  inst.proto(name + "_frame", "paintedMetal", mergeGeometries(frame.map((g) => g.toNonIndexed()), false), { texel: 1 });
  inst.proto(name + "_soft", "fabric", mergeGeometries(soft.map((g) => g.toNonIndexed()), false), { texel: 2 });
  inst.proto(name + "_post", "metal", new THREE.CylinderGeometry(0.07, 0.07, 0.4, 12).translate(0, 0.2, 0), { texel: 1 });
  const kit = inst.ctx.kit;
  return (x, y, z, yaw = 0) => {
    inst.place(name + "_frame", [x, y, z], yaw, IMP.black);
    inst.place(name + "_soft", [x, y, z], yaw, color);
    inst.place(name + "_post", [x, y, z], yaw, IMP.gunmetal);
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    const ex = Math.abs(c) * 0.3 + Math.abs(s) * 0.36;
    const ez = Math.abs(s) * 0.3 + Math.abs(c) * 0.36;
    kit.collider([x - ex, y, z - ez], [x + ex, y + 1.2, z + ez], "chair");
  };
}
