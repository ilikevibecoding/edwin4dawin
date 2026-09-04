// d1-intel — restricted intelligence room: heavy blast door into a security lock (scanner arch with red beams,
// barrier line, guard post, inner gate with a heavy frame and retracted leaves), then a very dark red-only room:
// data columns with scrolling text, analysis table with a low red wireframe holo, archive cabinets, a surveillance
// monitor bank with a watch desk, a cipher station and a sealed evidence hatch. Ceiling beams, trays, red
// downlights. Red only (COORDINATION.md §11).
import * as THREE from "three";
import { BOUNDS, CEIL, FLOOR, doorsFor } from "../shared/plan.js";
import { roomShell, partition, doorReveal } from "../shared/imperial.js";
import { IMP, LIGHT } from "../shared/palette.js";
import { wallFrame, ribs } from "../spine/dressing.js";
import { makeIntelAtlas, makeScrollTexture } from "./ui.js";
import { screenMaterial, ribFrame } from "./lib.js";
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
  holoLabels,
  tableDressing,
  archiveCabinet,
  monitorBank,
  evidenceHatch,
  duct,
  pipe,
  cableTray,
  riser,
  guideLine,
  dais,
  slab,
  canLight,
  canSpot,
  tableFixture,
  spotHood,
  guardBooth,
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

    // --- shell (grey panels, red strips at 1.9 m, three straight recessed red ceiling channels: table axis + one
    // over each rack row, narrow 5 cm lenses) + blast-door jamb liners
    const chan = (at) => ({ at, w: 0.4, emit: "emitRedImp", emitW: 0.05 });
    roomShell(kit, manifest, { floorY: y0, ceilY, seed: 73, panelW: 2.0, strip: "emitRedImp", stripY: 1.9, tone, ceiling: { axis: "x", inset: 0.25, channels: [chan(zn + 1.35), chan(cz), chan(zs - 1.35)] } });
    for (const d of manifest.doors) doorReveal(kit, manifest, d, y0);
    // transverse ribs (the spine's structural module): wall pilasters + ceiling cross members, no light line
    const WF = { n: wallFrame(B, "n"), s: wallFrame(B, "s"), w: wallFrame(B, "w"), pw: wallFrame({ min: [0, 0, B.min[2]], max: [pxW + 0.3, 0, B.max[2]] }, "e") };
    ribs(kit, ribFrame({ n: WF.n, s: WF.s }, ["n", "s"], zn, zs, y0, ceilY), [30.1, 32.8, 35.2], { lamp: false });
    ribs(kit, ribFrame({ w: WF.w, pw: WF.pw }, ["w", "pw"], xw, pxW, y0, ceilY, true), [494.4, 502.2], { lamp: false });

    // --- vestibule partition with the offset gate (no straight sightline from the corridor into the room)
    partition(kit, { axis: "z", at: px, from: zn, to: zs, floorY: y0, ceilY, openings: [{ a0: gate.z0, a1: gate.z1, h: gate.h }], seed: 77, strip: "emitRedImp", tone });
    gateFrame(kit, R);

    // --- security lock: scanner arch on the barrier line, barriers north (to the guard desk) and south
    const xA = 25.9;
    scannerArch(kit, R, xA, 497.8, 499.4);
    barrier(kit, R, xA, 493.9, 497.36);
    barrier(kit, R, xA, 499.84, 500.36);
    barrier(kit, R, xA, 502.44, zs);
    // guard post: counter on the barrier line, guard behind it (north) facing the door, public sign on the front
    consoleDesk(kit, R, xA, 493.5, { w: 1.5, facing: 2, screens: ["guard"], screenAspect: 2, tilt: -0.75, chairs: [0], readouts: ["readout2", "readout1"], sign: "sign1", seed: 41 });
    lockerBank(kit, R, 24.5, 4, 0.5, 2.0, zn, 1, { seed: 3 });
    duct(kit, 24.0, pxW - 0.05, y0 + 2.5, y0 + 2.88, zn, zn + 0.45, { alongX: true, grilles: [25.4], grilleFace: zn + 0.45 });
    // west wall: equipment cabinet, wall monitor and alarm point north of the door; compartments + sign south
    equipmentCabinet(kit, R, xw, 1, 490.6, 491.4, 2.0, 9);
    wallMonitor(kit, "x", xw, 1, 493.0, y0 + 1.75, 0.66, "mon6");
    alarmPoint(kit, "x", xw, 1, 493.75, y0 + 1.4);
    pipe(kit, 490.45, 494.2, y0 + 2.7, xw + 0.08, 0.03, { alongX: false, wallC: xw, bracketEvery: 1.8 });
    intercom(kit, "x", xw, 1, 499.5, y0 + 1.5);
    compartments(kit, R, xw, 1, 500.2, 501.9, 0.95, 2, 4, { seed: 5 });
    wallSign(kit, "x", xw, 1, 500.45, 501.65, y0 + 1.95, y0 + 2.25, "sign2");
    // south wall (public side): bench, canister, junction box; secure strip: junction box on the partition
    bench(kit, R, "z", zs, -1, 24.1, 25.5);
    canister(kit, "z", zs, -1, 25.68, y0);
    junctionBox(kit, "z", zs, -1, 24.45, y0 + 2.35);
    junctionBox(kit, "x", pxW, -1, 502.9, y0 + 2.3, { w: 0.26, h: 0.3 });
    // partition (vestibule face): RESTRICTED sign clear of the arch post from the approach, side monitor for the guard
    wallSign(kit, "x", pxW, -1, 495.5, 496.7, y0 + 2.15, y0 + 2.75, "sign0");
    wallMonitor(kit, "x", pxW, -1, 492.3, y0 + 1.9, 0.66, "mon5");
    // floor: one centre guide line door → arch → gate → room (steel inlay with a lit groove), broken by the
    // arch threshold plate and the gate threshold
    const gz = (gate.z0 + gate.z1) / 2;
    guideLine(kit, y0, xw + 0.3, xA - 0.5, gz);
    guideLine(kit, y0, xA + 0.5, px - 0.34, gz);
    guideLine(kit, y0, px + 0.34, 30.4, gz);
    // cameras watching the door, the lock and the gate
    camera(kit, 24.35, ceilY, 490.9, -2.5);
    camera(kit, 24.35, ceilY, 503.15, -0.64);
    camera(kit, 27.7, ceilY - 0.01, 499.9, -Math.PI / 2);

    // --- main room: partition (room face) — monitor bank + watch desk, equipment cabinet, cipher station
    monitorBank(kit, R, pxE, 492.9);
    consoleDesk(kit, R, 28.05, 492.9, { w: 2.6, facing: 1, screens: ["mon1", "mon4", "mon7"], tilt: -0.3, chairs: [-0.65, 0.65], readouts: ["readout1", "readout2", "readout3"], seed: 51 });
    equipmentCabinet(kit, R, pxE, 1, 495.1, 496.0, 2.1, 10);
    consoleDesk(kit, R, 27.85, 501.9, { w: 1.8, facing: 1, screens: ["mon3"], chairs: [0], readouts: ["readout0", "readout3"], seed: 52 });
    wallMonitor(kit, "x", pxE, 1, 501.9, y0 + 1.95, 0.9, "mon0");
    wallSign(kit, "x", pxE, 1, 500.75, 501.35, y0 + 2.45, y0 + 2.75, "tag4");

    // --- data columns: four on the north wall, three on the south wall (the evidence hatch takes the last slot)
    const colX = [28.2, 30.9, 33.6, 36.3];
    colX.forEach((x, i) => dataColumn(kit, R, x, zn, 1, i));
    colX.slice(0, 3).forEach((x, i) => dataColumn(kit, R, x, zs, -1, 4 + i));
    evidenceHatch(kit, R, zs, -1, 36.9);
    // wall dressing between the columns (ribs at 30.1 / 32.8 / 35.2 split the gaps): pipe runs cut at the ribs,
    // hung trays clear of the column tops, junction boxes, intercoms, monitors, corner risers
    for (const [zf, s] of [
      [zn, 1],
      [zs, -1],
    ]) {
      for (const [a, b] of [
        [27.4, 29.9],
        [30.3, 32.6],
        [33.0, 35.0],
        [35.4, 38.95],
      ]) {
        pipe(kit, a, b, y0 + 2.5, zf + s * 0.12, 0.05, { alongX: true, wallC: zf, bracketEvery: 2.7 });
        pipe(kit, a, b, y0 + 2.68, zf + s * 0.1, 0.03, { alongX: true, color: IMP.dark, wallC: zf, bracketEvery: 2.7 });
      }
      cableTray(kit, [27.5, zf + s * 0.98], [38.9, zf + s * 0.98], y0 + 3.05, ceilY, { w: 0.3, seed: s > 0 ? 21 : 22 });
      junctionBox(kit, "z", zf, s, s > 0 ? 29.6 : 29.3, y0 + 2.05);
      intercom(kit, "z", zf, s, 35.6, y0 + 1.5);
    }
    wallMonitor(kit, "z", zn, 1, 32.0, y0 + 1.9, 0.5, "mon2");
    wallMonitor(kit, "z", zs, -1, 34.6, y0 + 1.9, 0.5, "mon6");
    wallSign(kit, "z", zn, 1, 38.0, 38.6, y0 + 1.9, y0 + 2.2, "tag2");
    riser(kit, R, 39.05, 39.65, zn + 0.05, zn + 0.65);
    riser(kit, R, 39.05, 39.65, zs - 0.65, zs - 0.05);

    // --- east wall: six locked archive cabinets, red strips between them, duct with grilles above
    for (let i = 0; i < 6; i++) {
      const z0 = 491.75 + i * 1.8;
      archiveCabinet(kit, R, xe, z0, z0 + 1.5, i);
      if (i) {
        // dark pilaster between cabinets with a 5 cm slot; the red lens sits 10 cm back at the slot's bottom
        const zp = z0 - 0.15;
        slab(kit, "paintedMetal", "x", xe, -1, zp - 0.15, zp - 0.025, y0, ceilY - y0, 0, 0.12, { color: IMP.dark, texel: 1 });
        slab(kit, "paintedMetal", "x", xe, -1, zp + 0.025, zp + 0.15, y0, ceilY - y0, 0, 0.12, { color: IMP.dark, texel: 1 });
        slab(kit, "paintedMetal", "x", xe, -1, zp - 0.025, zp + 0.025, y0, ceilY - y0, 0, 0.01, { color: IMP.black, texel: 1 });
        slab(kit, "emitRedImp", "x", xe, -1, zp - 0.01, zp + 0.01, y0 + 0.5, y0 + 2.0, 0.01, 0.014);
      }
    }
    duct(kit, 491.3, 502.7, y0 + 2.62, y0 + 2.98, xe - 0.45, xe, { alongX: false, grilles: [493.5, 497.0, 500.5], grilleFace: xe - 0.45 });
    // recessed light line in the duct's underside (black channel 2 cm deep, 4 cm lens inside it)
    kit.boxMM("paintedMetal", [xe - 0.32, y0 + 2.6, 491.5], [xe - 0.28, y0 + 2.62, 502.5], { color: IMP.black, texel: 2 });
    kit.boxMM("paintedMetal", [xe - 0.16, y0 + 2.6, 491.5], [xe - 0.12, y0 + 2.62, 502.5], { color: IMP.black, texel: 2 });
    kit.boxMM("emitRedImp", [xe - 0.26, y0 + 2.614, 491.6], [xe - 0.18, y0 + 2.618, 502.4]);

    // --- analysis table on a 12 cm dais with the red wireframe holo (LineSegments in ctx.group, animated in update)
    const tx = 33.4;
    const tyb = dais(kit, R, tx, cz, 5.2, 3.8);
    analysisTable(kit, R, tx, cz, tyb);
    tableDressing(kit, R, tx, cz, tyb);
    holoLabels(kit, tx, tyb + 0.975, cz);
    holoMat = new THREE.LineBasicMaterial({ color: 0xff3a2a, vertexColors: true, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
    holo = new THREE.LineSegments(holoGeometry(), holoMat);
    holo.name = "intel-holo";
    holo.position.set(tx, tyb + 0.975, cz);
    holo.frustumCulled = false;
    ctx.group.add(holo);

    // --- ceiling cameras over the archive corners
    camera(kit, 38.9, ceilY, 491.25, 2.36);
    camera(kit, 38.9, ceilY, 502.75, 0.785);

    // --- lights (14 descriptors = the whole pool, all red). Every point sits ABOVE the ceiling plane inside a
    // recessed can (canLight): the ceiling underside cannot face it, only the black throat is lit, and the pool
    // below is dim (E ≈ 0.8 at the floor). Spots sit at the mouth of a recess (can / fixture / hood) so their cone
    // never touches their own housing or the ceiling; the table spot (priority 1.0) is the shadow caster.
    const red = LIGHT.red;
    const point = (pos, intensity, distance, priority) => ctx.lights.push({ type: "point", pos, color: red, intensity, distance, priority });
    const spot = (pos, target, intensity, distance, angle, priority) => ctx.lights.push({ type: "spot", pos, target, color: red, intensity, distance, angle, penumbra: 0.6, priority });
    // room: four cans between the table-axis channel and the rack channels, two over the archive wall (intensities
    // give ~1.5 lx-equivalent on the floor: the shots at half this read 4 % grey, target ~8 %)
    for (const x of [29.6, 37.2]) for (const z of [cz - 2.6, cz + 2.6]) point(canLight(kit, ceilY, x, z), 20, 10, 0.5);
    for (const z of [cz - 3.6, cz + 3.6]) point(canLight(kit, ceilY, xe - 1.25, z), 16, 9, 0.45);
    // vestibule: north end (guard desk / lockers), mid (lockers + RESTRICTED sign), south end (compartments / bench)
    point(canLight(kit, ceilY, 25.0, 492.2), 18, 9, 0.65);
    point(canLight(kit, ceilY, 25.1, 495.4), 18, 9, 0.7);
    point(canLight(kit, ceilY, 25.0, 501.6), 12, 9, 0.55); // faces the booth's grey back panel: kept at 12
    // guard-booth interior (housed can under the booth roof; seen only through the booth window). 0.3 cd at 0.6 m
    // from the back panel ≈ E 0.8 — together with the vestibule can the panel stays under 1.0.
    point(guardBooth(kit, R, pxW, 500.4, 502.4, { w: pxW - xA }), 0.3, 2.2, 0.4);
    // spots: analysis table (shadow caster), lock path in front of the arch, gate threshold, surveillance wall wash
    spot(tableFixture(kit, R, tx, cz), [tx, tyb + 0.93, cz], 14, 6, 0.8, 1.0);
    spot(canSpot(kit, ceilY, 24.9, 498.6), [25.4, y0, 498.6], 18, 7, 0.75, 0.9);
    spot(canSpot(kit, ceilY, px + 0.9, (gate.z0 + gate.z1) / 2), [px + 0.3, y0, (gate.z0 + gate.z1) / 2], 16, 6, 0.6, 0.7);
    spot(spotHood(kit, R, pxE, 1, 492.9), [pxE + 0.35, y0, 492.9], 10, 8, 0.85, 0.6);

    return {
      update(dt, t) {
        if (scrollTex) scrollTex.offset.y = -((t * 0.045) % 1);
        if (holo) {
          holoMat.opacity = 0.78 + 0.1 * Math.sin(t * 2.1);
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
