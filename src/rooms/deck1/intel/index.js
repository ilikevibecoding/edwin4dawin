// d1-intel — restricted intelligence room: heavy blast door into a security lock (scanner arch with red beams,
// barrier line, guard post, inner gate with a heavy frame and retracted leaves), then a very dark red-only room:
// data columns with scrolling text, analysis table with a low red wireframe holo, archive cabinets, a surveillance
// monitor bank with a watch desk, a cipher station and a sealed evidence hatch. Ceiling beams, trays, red
// downlights. Red only (COORDINATION.md §11).
import * as THREE from "three";
import { BOUNDS, CEIL, FLOOR, doorsFor } from "../shared/plan.js";
import { roomShell, partition, doorReveal } from "../shared/imperial.js";
import { IMP, LIGHT } from "../shared/palette.js";
import { makeIntelAtlas, makeScrollTexture } from "./ui.js";
import { screenMaterial } from "./lib.js";
import {
  scannerArch,
  barrier,
  gateFrame,
  consoleDesk,
  lockerBank,
  compartments,
  bench,
  equipmentCabinet,
  alarmPoint,
  wallMonitor,
  wallSign,
  junctionBox,
  intercom,
  canister,
  camera,
  dataColumn,
  analysisTable,
  holoGeometry,
  archiveCabinet,
  monitorBank,
  evidenceHatch,
  duct,
  pipe,
  cableTray,
  riser,
  ceilingStructure,
  floorPath,
  floorLine,
  slab,
} from "./props.js";

const ID = "d1-intel";
const B = BOUNDS[ID];

// module-local animated resources (created in materials() / build(), driven from update())
let atlasTex = null;
let scrollTex = null;
let holo = null;
let holoMat = null;

const manifest = {
  id: ID,
  name: "Intelligence (Restricted)",
  kind: "room",
  deck: 1,
  owner: "B",
  bounds: B,
  doors: doorsFor(ID),
  lift: null,
  spawn: { pos: [25.2, FLOOR, 497], yaw: -90 },
  apertures: [],
  views: {
    "d1-intel-vestibule": { pos: [24.7, FLOOR, 503.0], yaw: -6, pitch: -3 },
    "d1-intel-room": { pos: [33.8, FLOOR, 500.2], yaw: 55, pitch: -5 },
    "d1-intel-columns": { pos: [37, FLOOR, 502.5], yaw: 35, pitch: 2 },
    "d1-intel-gate": { pos: [23.95, FLOOR, 498.6], yaw: -90, pitch: -1 },
    "d1-intel-table": { pos: [30.6, FLOOR, 499.9], yaw: -55, pitch: -7 },
  },
  // two canvas textures: static red UI atlas + repeat-wrapped scrolling text column (+2 draw calls)
  materials() {
    atlasTex = makeIntelAtlas();
    scrollTex = makeScrollTexture();
    return { intelUI: screenMaterial(atlasTex, 1.25), intelScroll: screenMaterial(scrollTex, 1.35) };
  },
  build(ctx) {
    const { kit } = ctx;
    const y0 = FLOOR;
    const ceilY = CEIL[ID];
    const xw = B.min[0] + 0.3; // west wall face (blast door)
    const xe = B.max[0] - 0.3; // east wall face (archives)
    const zn = B.min[2] + 0.3;
    const zs = B.max[2] - 0.3;
    const cz = (B.min[2] + B.max[2]) / 2;
    const px = B.min[0] + 3.3; // partition centre (0.3 thick)
    const pxW = px - 0.15; // vestibule-side face
    const pxE = px + 0.15; // room-side face
    const gate = { z0: cz + 1.0, z1: cz + 2.4, h: 2.2 };
    const R = { y0, ceilY, xw, xe, zn, zs, cz, px, gate };
    const tone = { light: IMP.grey, mid: IMP.mid };
    const door = manifest.doors[0];
    const dz0 = door.pos[2] - 2.0;
    const dz1 = door.pos[2] + 2.0;

    // --- shell (grey panels, red strips at 1.9 m, two recessed red ceiling channels) + blast-door jamb liners
    roomShell(kit, manifest, {
      floorY: y0,
      ceilY,
      seed: 73,
      panelW: 2.0,
      strip: "emitRedImp",
      stripY: 1.9,
      tone,
      ceiling: { axis: "x", inset: 0.25, channels: [{ at: cz - 3.5, w: 0.35, emit: "emitRedImp", emitW: 0.1 }, { at: cz + 3.5, w: 0.35, emit: "emitRedImp", emitW: 0.1 }] },
    });
    for (const d of manifest.doors) doorReveal(kit, manifest, d, y0);

    // --- vestibule partition with the offset gate (no straight sightline from the corridor into the room)
    partition(kit, { axis: "z", at: px, from: zn, to: zs, floorY: y0, ceilY, openings: [{ a0: gate.z0, a1: gate.z1, h: gate.h }], seed: 77, strip: "emitRedImp", tone });
    gateFrame(kit, R);

    // --- security lock: scanner arch on the barrier line, barriers north (to the guard desk) and south
    const xA = 25.9;
    scannerArch(kit, R, xA, 497.8, 499.4);
    barrier(kit, R, xA, 493.9, 497.48);
    barrier(kit, R, xA, 499.72, zs);
    // guard post: counter on the barrier line, guard behind it (north) facing the door, public sign on the front
    consoleDesk(kit, R, xA, 493.5, { w: 1.5, facing: 2, screens: ["guard"], screenAspect: 2, tilt: -0.75, chairs: [0], readouts: ["readout2", "readout1"], sign: "sign1", seed: 41 });
    lockerBank(kit, R, 24.5, 4, 0.5, 2.0, zn, 1, { seed: 3 });
    duct(kit, 24.0, pxW - 0.05, y0 + 2.5, y0 + 2.88, zn, zn + 0.45, { alongX: true, grilles: [25.4], grilleFace: zn + 0.45 });
    // west wall: equipment cabinet, wall monitor and alarm point north of the door; compartments + sign south
    equipmentCabinet(kit, R, xw, 1, 490.6, 491.4, 2.0, 9);
    wallMonitor(kit, "x", xw, 1, 493.0, y0 + 1.75, 0.66, "mon6");
    alarmPoint(kit, "x", xw, 1, 494.3, y0 + 1.4);
    pipe(kit, 490.45, 494.8, y0 + 2.7, xw + 0.08, 0.03, { alongX: false, wallC: xw, bracketEvery: 1.8 });
    intercom(kit, "x", xw, 1, 499.5, y0 + 1.5);
    compartments(kit, R, xw, 1, 500.3, 503.2, 0.95, 2, 7, { seed: 5 });
    wallSign(kit, "x", xw, 1, 501.15, 502.35, y0 + 1.98, y0 + 2.28, "sign2");
    // south wall (public side): bench, canister, junction box; secure strip: junction box on the partition
    bench(kit, R, "z", zs, -1, 24.1, 25.5);
    canister(kit, "z", zs, -1, 25.68, y0);
    junctionBox(kit, "z", zs, -1, 24.45, y0 + 2.35);
    junctionBox(kit, "x", pxW, -1, 502.4, y0 + 2.3, { w: 0.26, h: 0.3 });
    // partition (vestibule face): warning stencils, side monitor for the guard
    wallSign(kit, "x", pxW, -1, 495.8, 497.4, y0 + 1.5, y0 + 2.3, "sign0");
    wallSign(kit, "x", pxW, -1, 494.2, 495.2, y0 + 1.7, y0 + 2.2, "sign1");
    wallMonitor(kit, "x", pxW, -1, 492.3, y0 + 1.9, 0.66, "mon9");
    // floor guides: door threshold stop line, path plates door → arch → gate → room, secure-strip line
    floorLine(kit, y0 + 0.001, 495.2, 497.6, xw + 0.9, { alongX: false, w: 0.06 });
    floorPath(kit, y0, xw + 0.3, xA - 0.4, 497.75, 499.65, { bars: [xw + 0.9] });
    floorPath(kit, y0, xA + 0.4, pxW - 0.14, 497.75, 499.65);
    floorPath(kit, y0, pxE + 0.3, 30.7, 497.75, 499.65, { bars: [pxE + 0.6] });
    floorLine(kit, y0 + 0.001, 499.9, zs - 0.2, (xA + pxW) / 2 + 0.03, { alongX: false });
    // cameras watching the door, the lock and the gate
    camera(kit, 24.35, ceilY, 490.9, -2.5);
    camera(kit, 24.35, ceilY, 503.15, -0.64);
    camera(kit, 27.7, ceilY - 0.01, 499.9, -Math.PI / 2);

    // --- main room: partition (room face) — monitor bank + watch desk, equipment cabinet, cipher station
    monitorBank(kit, R, pxE, 492.9);
    consoleDesk(kit, R, 28.05, 492.9, { w: 2.6, facing: 1, screens: ["mon1", "mon4", "mon7"], tilt: -0.3, chairs: [-0.65, 0.65], readouts: ["readout1", "readout2", "readout3"], seed: 51 });
    equipmentCabinet(kit, R, pxE, 1, 495.1, 496.0, 2.1, 10);
    consoleDesk(kit, R, 27.85, 501.9, { w: 1.8, facing: 1, screens: ["mon3"], chairs: [0], readouts: ["readout0", "readout3"], seed: 52 });
    wallMonitor(kit, "x", pxE, 1, 501.9, y0 + 1.95, 0.9, "mon8");
    wallSign(kit, "x", pxE, 1, 500.75, 501.35, y0 + 2.45, y0 + 2.75, "tag4");

    // --- data columns: four on the north wall, three on the south wall (the evidence hatch takes the last slot)
    const colX = [28.2, 30.9, 33.6, 36.3];
    colX.forEach((x, i) => dataColumn(kit, R, x, zn, 1, i));
    colX.slice(0, 3).forEach((x, i) => dataColumn(kit, R, x, zs, -1, 4 + i));
    evidenceHatch(kit, R, zs, -1, 36.9);
    // wall dressing between the columns: pipe runs, trays, junction boxes, intercoms, monitors, corner risers
    for (const [zf, s] of [
      [zn, 1],
      [zs, -1],
    ]) {
      pipe(kit, 27.4, 38.95, y0 + 2.5, zf + s * 0.12, 0.05, { alongX: true, wallC: zf, bracketEvery: 2.7 });
      pipe(kit, 27.4, 38.95, y0 + 2.68, zf + s * 0.1, 0.03, { alongX: true, color: IMP.dark, wallC: zf, bracketEvery: 2.7 });
      cableTray(kit, [27.5, zf + s * 0.55], [38.9, zf + s * 0.55], y0 + 3.0, ceilY, { w: 0.36, seed: s > 0 ? 21 : 22 });
      junctionBox(kit, "z", zf, s, 30.1, y0 + 2.05);
      intercom(kit, "z", zf, s, 32.8, y0 + 1.5);
    }
    wallMonitor(kit, "z", zn, 1, 35.5, y0 + 1.9, 0.66, "mon10");
    wallMonitor(kit, "z", zs, -1, 35.3, y0 + 1.9, 0.66, "mon11");
    wallSign(kit, "z", zn, 1, 38.0, 38.6, y0 + 1.9, y0 + 2.2, "tag2");
    riser(kit, R, 39.05, 39.65, zn + 0.05, zn + 0.65);
    riser(kit, R, 39.05, 39.65, zs - 0.65, zs - 0.05);

    // --- east wall: six locked archive cabinets, red strips between them, duct with grilles above
    for (let i = 0; i < 6; i++) {
      const z0 = 491.75 + i * 1.8;
      archiveCabinet(kit, R, xe, z0, z0 + 1.5, i);
      if (i) slab(kit, "emitRedImp", "x", xe, -1, z0 - 0.16, z0 - 0.14, y0 + 0.5, y0 + 2.0, 0, 0.01);
    }
    duct(kit, 491.3, 502.7, y0 + 2.62, y0 + 2.98, xe - 0.45, xe, { alongX: false, grilles: [493.5, 497.0, 500.5], grilleFace: xe - 0.45 });
    slab(kit, "emitRedImp", "x", xe, -1, 491.5, 502.5, y0 + 2.56, y0 + 2.585, 0.4, 0.42);

    // --- analysis table with the red wireframe holo (LineSegments in ctx.group, animated in update)
    const tx = 33.4;
    analysisTable(kit, R, tx, cz);
    holoMat = new THREE.LineBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
    holo = new THREE.LineSegments(holoGeometry(), holoMat);
    holo.name = "intel-holo";
    holo.position.set(tx, y0 + 1.02, cz);
    holo.frustumCulled = false;
    ctx.group.add(holo);

    // --- ceiling structure: beams, red downlight housings, hung fixture over the table
    const downlights = [];
    for (const x of [29.6, 33.4, 37.2]) for (const z of [492.2, 501.8]) downlights.push([x, ceilY - 0.4, z]);
    const vestibuleLights = [
      [25.0, ceilY - 0.4, 498.6],
      [25.4, ceilY - 0.4, 492.6],
      [24.9, ceilY - 0.4, 502.0],
    ];
    ceilingStructure(kit, R, pxE + 0.25, xe, zn, zs, { beamsZ: [494.6, 499.4], beamsX: [30.2, 35.5], downlights, fixture: { x: tx, z: cz, w: 3.6, d: 2.2 } });
    ceilingStructure(kit, R, xw, pxW, zn, zs, { downlights: vestibuleLights });
    camera(kit, 38.9, ceilY, 491.25, 2.36);
    camera(kit, 38.9, ceilY, 502.75, 0.785);

    // --- lights (≤ 14 descriptors, all red): vestibule pools, six room downlights, cabinet wash, table spot +
    // fill, gate spot. Kept dim (E ≈ 0.5) so surfaces stay near-black with red rims.
    const red = LIGHT.red;
    ctx.lights.push({ type: "point", pos: vestibuleLights[0], color: red, intensity: 10, distance: 8, priority: 0.9 });
    ctx.lights.push({ type: "point", pos: vestibuleLights[1], color: red, intensity: 9, distance: 8, priority: 0.7 });
    ctx.lights.push({ type: "point", pos: vestibuleLights[2], color: red, intensity: 8, distance: 7, priority: 0.4 });
    downlights.forEach((p, i) => ctx.lights.push({ type: "point", pos: p, color: red, intensity: 9, distance: 10, priority: 0.5 + (i % 2) * 0.05 }));
    for (const z of [cz - 2.7, cz + 2.7]) ctx.lights.push({ type: "point", pos: [xe - 1.0, ceilY - 0.6, z], color: red, intensity: 6, distance: 7, priority: 0.45 });
    // watch desk / monitor bank wash on the partition's room face
    ctx.lights.push({ type: "point", pos: [28.6, ceilY - 0.5, 493.2], color: red, intensity: 6, distance: 7, priority: 0.6 });
    // spot sits just under the fixture's camera dome so the (shadow-casting) pool is not blocked by it
    ctx.lights.push({ type: "spot", pos: [tx, ceilY - 0.7, cz], target: [tx, y0 + 0.93, cz], color: red, intensity: 9, distance: 6, angle: 0.85, penumbra: 0.5, priority: 1.0 });
    ctx.lights.push({ type: "spot", pos: [px + 0.9, ceilY - 0.1, (gate.z0 + gate.z1) / 2], target: [px + 0.2, y0, (gate.z0 + gate.z1) / 2], color: red, intensity: 14, distance: 6, angle: 0.6, penumbra: 0.6, priority: 0.7 });

    return {
      update(dt, t) {
        if (scrollTex) scrollTex.offset.y = -((t * 0.045) % 1);
        if (holo) {
          holo.position.y = y0 + 1.02 + Math.sin(t * 1.3) * 0.012;
          holoMat.opacity = 0.62 + 0.12 * Math.sin(t * 2.1);
        }
      },
      dispose() {
        if (holo) {
          holo.geometry.dispose();
          holoMat.dispose();
        }
        if (atlasTex) atlasTex.dispose();
        if (scrollTex) scrollTex.dispose();
        holo = holoMat = atlasTex = scrollTex = null;
      },
    };
  },
};
export default manifest;
