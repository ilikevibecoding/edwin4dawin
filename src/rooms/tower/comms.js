// Communications & Sensor Control — three rows of paired operator stations either side of a central aisle
// face the sensor wall: a 3.4 m radar scope with an animated sweep and blinking contacts, flanked by
// screen arrays under an amber status header. Antenna feed conduits run across the ceiling from the comms
// relay racks on the starboard wall to the sensor wall; headset stands sit between the station pairs;
// signals banks and lockers line the port wall. Accent blue (screens) / amber (status).
import * as THREE from "three";
import { IMP } from "../../core/palette.js";
import { screenRect, ledRect, DECAL } from "../../textures.js";
import { Instancer, chairProto, lightBand, screenArray } from "./tactical.js";

export const meta = { id: "comms", stream: "tower-rooms" };

const AXIS_X = 22.5; // corridor door centre
const ROWS = [217.8, 220.8, 223.8];

export function build(ctx) {
  const { kit, props } = ctx;
  const { x0, x1, z0, z1 } = ctx.inner;
  const fy = ctx.floor;
  const ax = AXIS_X;

  ctx.shell({
    floorMat: "deckGrey",
    floorColor: IMP.plateDark,
    stripSpacing: 4.6,
    ceiling: { dir: "u", stripW: 0.3 },
    seed: 23,
    walls: {
      zmin: { styles: { plate: 0.75, panel: 0.15, hatch: 0.1 } },
      zmax: { styles: { plate: 0.9, panel: 0.1 } },
      xmin: { styles: { plate: 0.75, panel: 0.1, vent: 0.15 } },
      xmax: { styles: { plate: 0.7, pipes: 0.2, vent: 0.1 } },
    },
  });
  const aft = ctx.wall("zmax");
  const uAft = (x) => x1 - x;
  lightBand(aft, { skip: [[uAft(ax) - 2.1, uAft(ax) + 2.1]] });
  for (const side of ["zmin", "xmin", "xmax"]) lightBand(ctx.wall(side));

  const inst = new Instancer(ctx);
  const chair = chairProto(inst, "comms_chair", { color: IMP.fabricBlack });

  // ---- operator rows (stations face the sensor wall, operators sit on the door side) ----
  const sets = [[4, 12], [10, 1], [0, 13], [14, 3], [12, 5], [4, 10]];
  let k = 0;
  for (const rz of ROWS) {
    for (const s of [-1, 1]) {
      for (const off of [2.3, 5.4, 8.5]) {
        const x = ax + s * off;
        props.consoleStation(kit, { pos: [x, fy, rz], yaw: Math.PI, w: 2.6, d: 0.85, h: 1.0, screens: 2, accent: "emitBlue", seed: 130 + k, screenSet: sets[k % sets.length] });
        chair(x, fy, rz - 0.62, Math.PI);
        k++;
      }
      headsetStand(kit, [ax + s * 3.85, fy, rz + 0.42]);
      headsetStand(kit, [ax + s * 6.95, fy, rz + 0.42]);
    }
    // amber status strip in the deck along the front of each row
    kit.boxMM("emitAmber", [ax - 9.9, fy + 0.003, rz + 0.9], [ax - 0.9, fy + 0.009, rz + 0.93], { uv: "keep" });
    kit.boxMM("emitAmber", [ax + 0.9, fy + 0.003, rz + 0.9], [ax + 9.9, fy + 0.009, rz + 0.93], { uv: "keep" });
  }
  // central aisle: gloss inlay from the door to the sensor wall, blue edge lights
  kit.boxMM("darkGloss", [ax - 0.9, fy + 0.002, z0 + 1.3], [ax + 0.9, fy + 0.012, z1 - 2.2]);
  for (const s of [-1, 1]) kit.boxMM("emitBlue", [ax + s * 0.92 - 0.012, fy + 0.003, z0 + 1.3], [ax + s * 0.92 + 0.012, fy + 0.013, z1 - 2.2], { uv: "keep" });
  kit.boxMM("hazard", [ax - 1.5, fy + 0.003, z0 + 0.05], [ax + 1.5, fy + 0.009, z0 + 1.25], { texel: 1.5 });

  // ---- sensor wall ----
  {
    const W = aft;
    radarScope(ctx, [ax, fy + 2.55, z1], 1.7);
    // amber status header across the whole wall
    W.frame.box("paintedMetal", W.length / 2, 4.55, 0.1, W.length - 0.6, 0.28, 0.2, { color: IMP.black, texel: 1 });
    W.frame.box("emitAmber", W.length / 2, 4.55, 0.205, W.length - 1.2, 0.06, 0.01, { uv: "keep" });
    for (const s of [-1, 1]) {
      screenArray(W.frame, uAft(ax + s * 4.9), 2.6, 2, 2, 1.5, 0.9, s < 0 ? [4, 12, 10, 1] : [0, 13, 14, 3]);
      W.frame.decal(uAft(ax + s * 4.9), 4.05, 0.06, 0.55, 0.55, s < 0 ? DECAL.TEXT_A : DECAL.TEXT_B);
      props.computerBank(kit, { pos: [ax + s * 9.6, fy, z1 - 0.6], yaw: Math.PI, w: 3.0, h: 2.4, d: 0.6, seed: 141 + s, accent: "emitAmber" });
      props.computerBank(kit, { pos: [ax + s * 12.7, fy, z1 - 0.6], yaw: Math.PI, w: 2.6, h: 2.4, d: 0.6, seed: 143 + s, accent: "emitBlue" });
    }
    // sensor officer's station under the scope
    props.consoleStation(kit, { pos: [ax, fy, z1 - 1.35], yaw: Math.PI, w: 3.2, d: 0.9, h: 1.0, screens: 3, accent: "emitAmber", seed: 150, screenSet: [0, 12, 4] });
    chair(ax, fy, z1 - 1.97, Math.PI);
  }

  // ---- starboard wall (xmax): relay racks with antenna feeds into the ceiling ----
  {
    const W = ctx.wall("xmax");
    const u = (z) => z - z0;
    const rackZ = [216.2, 217.8, 220.6, 222.2];
    for (const z of rackZ) relayRack(kit, [x1 - 0.72, fy, z]);
    // feed conduits: up from the racks, across the ceiling, down behind the scope
    const cy = ctx.ceil - 0.28;
    const runs = [
      { z: 216.2, y: cy, xEnd: ax + 1.1, r: 0.09 },
      { z: 220.6, y: cy - 0.2, xEnd: ax + 0.4, r: 0.07 },
      { z: 222.2, y: cy - 0.1, xEnd: ax - 0.4, r: 0.06 },
    ];
    for (const run of runs) {
      props.pipeRun(kit, {
        points: [
          [x1 - 0.55, fy + 2.62, run.z],
          [x1 - 0.55, run.y, run.z],
          [run.xEnd, run.y, run.z],
          [run.xEnd, run.y, z1 - 0.45],
          [run.xEnd, fy + 4.3, z1 - 0.45],
        ],
        r: run.r,
        color: IMP.steelDark,
        clamps: 2.4,
      });
    }
    props.cableBundle(kit, { from: [x1 - 0.5, fy + 2.7, 216.2], to: [x1 - 0.5, fy + 2.7, 222.2], sag: 0.35, n: 3 });
    W.frame.decal(u(219.2), 3.6, 0.06, 0.8, 0.8, DECAL.WARNING);
    W.frame.decal(u(214.2), 3.2, 0.06, 0.6, 0.6, DECAL.DECK_A);
    props.wallPanel(kit, W.frame, u(224.6), 1.6, { w: 1.0, h: 0.7, accent: "emitAmber", seed: 12 });
    kit.boxMM("hazard", [x1 - 1.4, fy + 0.003, 215.4], [x1 - 1.1, fy + 0.009, 223.0], { texel: 1.5 });
  }

  // ---- port wall (xmin): signals banks, a tall data board, lockers ----
  {
    const W = ctx.wall("xmin");
    const u = (z) => z1 - z;
    for (const [z, sd] of [[216.4, 161], [219.6, 162]]) props.computerBank(kit, { pos: [x0 + 0.6, fy, z], yaw: Math.PI / 2, w: 3.0, h: 2.4, d: 0.6, seed: sd, accent: "emitBlue" });
    screenArray(W.frame, u(223.0), 2.3, 2, 2, 1.2, 0.8, [12, 4, 13, 10]);
    props.lockerRow(kit, W.frame, u(226.9), 4, { lw: 0.6, h: 2.0, d: 0.5, color: IMP.plateDark });
    W.frame.decal(u(223.0), 3.6, 0.06, 0.7, 0.7, DECAL.EMBLEM);
    W.frame.decal(u(214.0), 3.2, 0.06, 0.6, 0.6, DECAL.NUMBER1);
  }

  // ---- forward wall: door flanked by banks and a duty board ----
  {
    const W = ctx.wall("zmin");
    const u = (x) => x - x0;
    props.computerBank(kit, { pos: [ax - 4.6, fy, z0 + 0.6], yaw: 0, w: 3.0, h: 2.4, d: 0.6, seed: 171, accent: "emitAmber" });
    props.computerBank(kit, { pos: [ax + 4.6, fy, z0 + 0.6], yaw: 0, w: 3.0, h: 2.4, d: 0.6, seed: 172, accent: "emitAmber" });
    screenArray(W.frame, u(ax - 9.0), 2.3, 2, 1, 1.4, 0.8, [10, 1]);
    props.wallPanel(kit, W.frame, u(ax + 8.6), 1.6, { w: 1.0, h: 0.7, accent: "emitBlue", seed: 14 });
    W.frame.decal(u(ax), 3.8, 0.06, 1.0, 1.0, DECAL.EMBLEM);
    W.frame.decal(u(ax + 2.3), 3.4, 0.06, 0.6, 0.6, DECAL.DECK_A);
    W.frame.decal(u(ax - 2.3), 3.4, 0.06, 0.6, 0.6, DECAL.TEXT_C);
  }

  // ---- lights ----
  ctx.light(0xdfe8ff, 32, 20, [ax - 5.5, fy + 4.4, 218.0], { decay: 1.5 });
  ctx.light(0xdfe8ff, 32, 20, [ax + 5.5, fy + 4.4, 218.0], { decay: 1.5 });
  ctx.light(0xdfe8ff, 30, 20, [ax - 5.5, fy + 4.4, 223.0], { decay: 1.5 });
  ctx.light(0xdfe8ff, 30, 20, [ax + 5.5, fy + 4.4, 223.0], { decay: 1.5 });
  ctx.light(0x5fb8ff, 20, 12, [ax, fy + 3.4, z1 - 2.4], { decay: 1.7 });
  ctx.light(0xffb547, 22, 14, [x1 - 3.0, fy + 3.8, 219.5], { decay: 1.5 });
  ctx.light(0xdfe8ff, 24, 16, [x0 + 3.0, fy + 4.2, 220.5], { decay: 1.5 });
  ctx.light(0xdfe8ff, 22, 14, [ax, fy + 4.2, 214.2], { decay: 1.5 });
  inst.build();
}

// ---------------------------------------------------------------------------------------------------
/** Wall-mounted radar scope: black housing, gloss dish, range rings, rotating sweep wedge, blinking contacts. */
function radarScope(ctx, pos, R) {
  const { kit } = ctx;
  const [x, y, z] = pos;
  const n = z - 0.001; // wall plane; the scope stands proud of it toward −Z
  kit.box("paintedMetal", x, y, n - 0.09, 2 * R + 0.5, 2 * R + 0.5, 0.18, { color: IMP.black, texel: 1 });
  kit.box("plate", x, y, n - 0.19, 2 * R + 0.3, 2 * R + 0.3, 0.02, { color: IMP.plateDark, uv: "keep" });
  kit.add("darkGloss", new THREE.CircleGeometry(R, 64), { pos: [x, y, n - 0.21], rot: [0, Math.PI, 0], uv: "keep" });
  kit.add("paintedMetal", new THREE.RingGeometry(R, R + 0.1, 64), { pos: [x, y, n - 0.205], rot: [0, Math.PI, 0], color: IMP.gunmetal, uv: "keep" });
  for (const rr of [0.25, 0.5, 0.75, 1.0]) kit.add("emitBlue", new THREE.RingGeometry(R * rr - 0.006, R * rr + 0.006, 64), { pos: [x, y, n - 0.212], rot: [0, Math.PI, 0], uv: "keep" });
  kit.box("emitBlue", x, y, n - 0.212, 2 * R - 0.05, 0.008, 0.002, { uv: "keep" });
  kit.box("emitBlue", x, y, n - 0.212, 0.008, 2 * R - 0.05, 0.002, { uv: "keep" });
  for (const s of [-1, 1]) {
    kit.box("emitAmber", x + s * (R + 0.16), y + R + 0.16, n - 0.19, 0.08, 0.08, 0.01, { uv: "keep" });
    kit.box("emitAmber", x + s * (R + 0.16), y - R - 0.16, n - 0.19, 0.08, 0.08, 0.01, { uv: "keep" });
  }
  kit.box("leds", x, y - R - 0.36, n - 0.19, 2.4, 0.08, 0.01, { uv: "keep", uvRect: ledRect(11) });
  kit.box("screen", x, y + R + 0.36, n - 0.19, 1.6, 0.3, 0.01, { uv: "keep", uvRect: screenRect(4) });
  kit.collider([x - R - 0.3, y - R - 0.3, n - 0.3], [x + R + 0.3, y + R + 0.3, n], "scope");

  // sweep: a fading sector (vertex alpha via two-tone geometry colours) rotating about the dish centre
  const sweepMat = new THREE.MeshBasicMaterial({ color: 0x7fd0ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, vertexColors: true });
  const sector = new THREE.CircleGeometry(R - 0.03, 24, 0, 0.75);
  const cols = new Float32Array(sector.attributes.position.count * 3);
  const posAttr = sector.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const px = posAttr.getX(i);
    const py = posAttr.getY(i);
    const ang = Math.atan2(py, px);
    const t = i === 0 ? 0.6 : ang / 0.75; // bright at the leading edge (θ = 0.75), fading behind
    cols[i * 3] = cols[i * 3 + 1] = cols[i * 3 + 2] = Math.max(0.05, t * t);
  }
  sector.setAttribute("color", new THREE.BufferAttribute(cols, 3));
  const sweep = new THREE.Mesh(sector, sweepMat);
  sweep.position.set(x, y, n - 0.215);
  sweep.rotation.y = Math.PI; // face −Z, into the room
  const leadMat = new THREE.MeshBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const lead = new THREE.Mesh(new THREE.PlaneGeometry(R - 0.03, 0.012).translate((R - 0.03) / 2, 0, 0), leadMat);
  lead.position.set(x, y, n - 0.216);
  lead.rotation.y = Math.PI;
  ctx.add(sweep);
  ctx.add(lead);
  // contacts: blink when the sweep passes them
  const blipMat = new THREE.MeshBasicMaterial({ color: 0xffb547, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const blips = [];
  const rand = ctx.rand;
  for (let i = 0; i < 7; i++) {
    const a = rand() * Math.PI * 2;
    const rr = R * (0.25 + rand() * 0.7);
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.035, 8), blipMat.clone());
    // the dish faces −Z after the Y-flip, so world x is mirrored relative to local x
    m.position.set(x - Math.cos(a) * rr, y + Math.sin(a) * rr, n - 0.217);
    m.rotation.y = Math.PI;
    m.userData.a = a;
    blips.push(m);
    ctx.add(m);
  }
  let t = 0;
  ctx.animate((dt) => {
    t += dt;
    const ang = (t * 0.9) % (Math.PI * 2);
    sweep.rotation.z = ang - 0.75; // leading edge at `ang`
    lead.rotation.z = ang;
    for (const b of blips) {
      let d = (ang - b.userData.a) % (Math.PI * 2);
      if (d < 0) d += Math.PI * 2;
      b.material.opacity = Math.max(0, 1 - d / 3.5);
    }
  });
}

/** Comms relay rack against a wall (+X wall): black cabinet, module slots with amber LED matrices, coupler on top. */
function relayRack(kit, pos) {
  const [x, y, z] = pos; // x = front face, cabinet extends toward +X (the wall)
  const w = 1.3;
  const d = 0.7;
  const h = 2.6;
  kit.box("paintedMetal", x + d / 2, y + h / 2, z, d, h, w, { color: IMP.black, texel: 1 });
  kit.box("plate", x + d / 2 + 0.03, y + h / 2, z, d, h - 0.3, w + 0.06, { color: IMP.plateDark, uv: "keep" });
  for (let i = 0; i < 7; i++) {
    const my = y + 0.45 + i * 0.29;
    kit.box("darkGloss", x - 0.005, my, z, 0.01, 0.24, w - 0.16);
    kit.box("leds", x - 0.012, my - 0.03, z + 0.12, 0.004, 0.07, 0.7, { uv: "keep", uvRect: ledRect((i * 5 + 3) % 16) });
    kit.box(i % 3 === 1 ? "emitBlue" : "emitAmber", x - 0.012, my + 0.07, z - 0.5, 0.004, 0.04, 0.04);
    kit.box("metal", x - 0.02, my - 0.115, z, 0.03, 0.02, w - 0.14, { color: IMP.steelDark });
  }
  kit.box("emitAmber", x - 0.012, y + h - 0.25, z, 0.004, 0.05, w - 0.5, { uv: "keep" });
  kit.box("paintedMetal", x + d / 2, y + 0.1, z, d + 0.04, 0.2, w + 0.04, { color: IMP.trim });
  // antenna coupler drum + status lamp on the roof
  kit.cyl("metal", x + d / 2, y + h + 0.18, z, 0.22, 0.36, "y", { color: IMP.gunmetal, segments: 14 });
  kit.box("emitRed", x + d / 2, y + h + 0.4, z, 0.06, 0.06, 0.06);
  kit.collider([x - 0.05, y, z - w / 2], [x + d + 0.05, y + h + 0.45, z + w / 2], "rack");
}

/** Headset stand on a low pedestal between two stations: post, hoop, and a hanging headset band. */
function headsetStand(kit, pos) {
  const [x, y, z] = pos;
  kit.box("paintedMetal", x, y + 0.45, z, 0.32, 0.9, 0.32, { color: IMP.black, texel: 1 });
  kit.box("plate", x, y + 0.45, z, 0.26, 0.7, 0.26, { color: IMP.plateDark, uv: "keep" });
  kit.box("darkGloss", x, y + 0.905, z, 0.3, 0.01, 0.3);
  kit.cyl("metal", x, y + 1.12, z, 0.015, 0.42, "y", { color: IMP.steel, segments: 8 });
  kit.add("metal", new THREE.TorusGeometry(0.1, 0.012, 6, 20).rotateY(Math.PI / 2), { pos: [x, y + 1.36, z], color: IMP.steel, uv: "keep" });
  kit.add("rubber", new THREE.TorusGeometry(0.11, 0.02, 6, 20, Math.PI).rotateZ(Math.PI).rotateY(Math.PI / 2), { pos: [x, y + 1.3, z], color: IMP.black, uv: "keep" });
  for (const s of [-1, 1]) kit.box("rubber", x, y + 1.2, z + s * 0.11, 0.05, 0.07, 0.03, { color: IMP.black });
  kit.box("emitAmber", x + 0.13, y + 0.7, z, 0.005, 0.03, 0.03, { uv: "keep" });
  kit.collider([x - 0.16, y, z - 0.16], [x + 0.16, y + 1.4, z + 0.16], "stand");
}
