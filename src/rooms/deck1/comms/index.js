// d1-comms — communications + sensors: two rows of dense equipment racks with patch cabling, four operator
// stations and a supervisor dais facing the signal-wall array (animated receiver display, status columns,
// system maps), two sensor pedestals with rotating dishes, a ceiling sensor dome, overhead cable trays,
// ducting and beams. Blue displays / amber status (COORDINATION.md §11).
import * as THREE from "three";
import { BOUNDS, CEIL, FLOOR, doorsFor } from "../shared/plan.js";
import { roomShell, doorReveal } from "../shared/imperial.js";
import { IMP, LIGHT } from "../shared/palette.js";
import { rng } from "../../../kit.js";
import { makeCommsAtlas, makeWaveDisplay } from "./ui.js";
import { screenMaterial, beginLedBatch, flushLedBatch } from "./lib.js";
import { rack, patchFrame, patchBetween, cableTray, duct, pipe, ceilingStructure } from "./racks.js";
import { station } from "./stations.js";
import { signalWall, eastWall, pedestal, dishGeometry, sensorDome, dais, walkway, cableCover } from "./fixtures.js";

const ID = "d1-comms";
const B = BOUNDS[ID];

// module-local animated resources (created in materials(), driven from update())
let wave = null;
let atlasTex = null;

const manifest = {
  id: ID,
  name: "Communications & Sensors",
  kind: "room",
  deck: 1,
  owner: "B",
  bounds: B,
  doors: doorsFor(ID),
  lift: null,
  spawn: { pos: [-25.5, FLOOR, 499], yaw: 90 },
  apertures: [],
  views: {
    "d1-comms-racks": { pos: [-26, FLOOR, 499], yaw: 90, pitch: -3 },
    "d1-comms-ops": { pos: [-41, FLOOR, 492.5], yaw: -150, pitch: -4 },
    "d1-comms-signal-wall": { pos: [-30, FLOOR, 505.5], yaw: 60, pitch: 2 },
    "d1-comms-dish": { pos: [-27.6, FLOOR, 497.2], yaw: 35, pitch: 10 },
    "d1-comms-station": { pos: [-35.4, FLOOR, 504.8], yaw: 54, pitch: -8 },
  },
  // two canvas textures: static UI atlas + animated receiver display (+2 draw calls)
  materials() {
    atlasTex = makeCommsAtlas();
    wave = makeWaveDisplay();
    return { commsUI: screenMaterial(atlasTex, 1.3), commsWave: screenMaterial(wave.texture, 1.4) };
  },
  build(ctx) {
    const { kit } = ctx;
    const ceilY = CEIL[ID];
    const y0 = FLOOR;
    const xw = B.min[0] + 0.3; // west wall face (signal wall)
    const xe = B.max[0] - 0.3; // east wall face (door)
    const zn = B.min[2] + 0.3;
    const zs = B.max[2] - 0.3;
    const cz = (B.min[2] + B.max[2]) / 2;
    const cx = (B.min[0] + B.max[0]) / 2;
    const door = manifest.doors[0];
    const dz0 = door.pos[2] - 1.2;
    const dz1 = door.pos[2] + 1.2;
    const rand = rng(ctx.seed || 67);
    beginLedBatch(kit); // ~1,900 indicator LEDs are emitted as one geometry per material (build-time budget)

    // --- shell (light-grey panels, blue strips at 2.05 m, two recessed ceiling channels) + door jamb liners
    roomShell(kit, manifest, {
      floorY: y0,
      ceilY,
      seed: 67,
      panelW: 2.4,
      strip: "emitBlue",
      ceiling: { axis: "x", inset: 0.25, channels: [{ at: cz - 5, w: 0.5, emit: "emitWhite", emitW: 0.14 }, { at: cz + 5, w: 0.5, emit: "emitWhite", emitW: 0.14 }] },
    });
    for (const d of manifest.doors) doorReveal(kit, manifest, d, y0);

    // --- rack rows along the north and south walls (11 slots each; slot 5 is an open patch frame)
    const rows = [];
    for (const [zBack, f] of [
      [zn, +1],
      [zs, -1],
    ]) {
      const row = [];
      for (let k = 0; k < 11; k++) {
        const x0 = xw + 1.1 + k * 1.5;
        row.push(k === 5 ? patchFrame(kit, x0, y0, zBack, f, 300 + k + (f > 0 ? 0 : 50)) : rack(kit, x0, y0, zBack, f, 100 + k * 7 + (f > 0 ? 0 : 500)));
      }
      for (let k = 0; k + 1 < row.length; k++) patchBetween(kit, row[k], row[k + 1], rand);
      rows.push(row);
    }
    const rowX0 = xw + 1.1;
    const rowX1 = xw + 1.1 + 10 * 1.5 + 1.2;

    // --- overhead cable trays: one over each rack row, two cross trays, one feed to the signal wall
    cableTray(kit, [rowX0, zn + 0.35], [rowX1, zn + 0.35], y0 + 3.28, ceilY, { w: 0.4, seed: 11 });
    cableTray(kit, [rowX0, zs - 0.35], [rowX1, zs - 0.35], y0 + 3.28, ceilY, { w: 0.4, seed: 12 });
    const stationX = xw + 5.5;
    const trayA = stationX;
    const trayB = cx + 3.6;
    cableTray(kit, [trayA, zn + 0.55], [trayA, zs - 0.55], y0 + 3.45, ceilY, { w: 0.36, seed: 13 });
    cableTray(kit, [trayB, zn + 0.55], [trayB, zs - 0.55], y0 + 3.45, ceilY, { w: 0.36, seed: 14 });
    const feedZ = cz + 1.9;
    cableTray(kit, [trayB, feedZ], [xw + 0.42, feedZ], y0 + 3.55, ceilY, { w: 0.3, seed: 15, cables: 2 });

    // --- ceiling structure: beams, downlight housings, central sensor dome
    const downlights = [];
    for (const x of [cx - 6.4, cx, cx + 6.4]) for (const z of [cz - 4.4, cz + 4.4]) downlights.push([x, ceilY - 0.5, z]);
    ceilingStructure(kit, xw, xe, zn, zs, ceilY, { beamsZ: [cz - 6.7, cz - 2.6, cz + 2.6, cz + 6.7], beamsX: [xw + 3.0, xe - 3.0], downlights });
    sensorDome(kit, cx, ceilY, cz);

    // --- operator stations facing the signal wall, supervisor on a dais behind them
    const screensFor = (i) => [["console0", "console1"], ["console2", "console3"], ["console1", "console2"], ["console3", "console0"]][i % 4];
    [cz - 4.5, cz - 1.5, cz + 1.5, cz + 4.5].forEach((z, i) => {
      station(kit, stationX, y0, z, { w: 2.0, facing: 1, screens: screensFor(i), readout: "readout" + i, seed: 21 + i });
      // rigid conduit drop from the cross tray to the back of the display housing
      const cxp = stationX - 0.52;
      kit.cyl("metal", cxp, (y0 + 1.25 + y0 + 3.42) / 2, z, 0.03, 3.42 - 1.25, "y", { color: IMP.mid, segments: 8 });
      kit.cyl("metal", cxp + 0.08, y0 + 1.25, z, 0.03, 0.16, "x", { color: IMP.mid, segments: 8 });
      kit.box("paintedMetal", cxp, y0 + 1.25, z, 0.09, 0.09, 0.09, { color: IMP.dark });
      kit.cyl("metal", cxp + 0.22, y0 + 3.42, z, 0.03, 0.44, "x", { color: IMP.mid, segments: 8 });
      kit.box("paintedMetal", cxp, y0 + 3.42, z, 0.09, 0.09, 0.09, { color: IMP.dark });
    });
    const daisX0 = cx - 2.1;
    const daisX1 = cx + 0.8;
    dais(kit, daisX0, daisX1, y0, cz - 1.6, cz + 1.6);
    station(kit, cx - 1.1, y0 + 0.15, cz, { w: 2.4, facing: 1, screens: ["console3", "console0", "console2"], readout: "readout7", seed: 31, chairOffset: 0.62 });
    // supervisor feed: conduit from the feed tray to a floor junction box beside the dais
    kit.cyl("metal", cx - 1.1, (y0 + 0.4 + y0 + 3.55) / 2, feedZ, 0.03, 3.15, "y", { color: IMP.mid, segments: 8 });
    kit.box("paintedMetal", cx - 1.1, y0 + 0.22, feedZ, 0.3, 0.44, 0.24, { color: IMP.dark, texel: 1 });
    kit.box("emitAmber", cx - 1.1, y0 + 0.36, feedZ + 0.125, 0.06, 0.02, 0.01);

    // --- signal wall array (west) and east wall dressing
    signalWall(kit, xw, y0, cz, ceilY);
    eastWall(kit, xe, y0, zn, zs, dz0, dz1, 3.0, ceilY);
    // ducts along the east wall either side of the door sign, joining the corner riser
    duct(kit, zn, dz0 - 0.6, y0 + 3.3, y0 + 3.8, xe - 0.5, xe, { alongX: false, grilles: [zn + 1.8, dz0 - 2.4], grilleFace: xe - 0.5 });
    duct(kit, dz1 + 0.4, zs - 0.85, y0 + 3.3, y0 + 3.8, xe - 0.5, xe, { alongX: false, grilles: [dz1 + 2.2, zs - 2.6], grilleFace: xe - 0.5 });
    // pipe pairs above the rack rows
    pipe(kit, rowX0, rowX1, y0 + 3.85, zn + 0.12, 0.06, { alongX: true, wallC: zn });
    pipe(kit, rowX0, rowX1, y0 + 3.65, zn + 0.1, 0.04, { alongX: true, color: IMP.dark, wallC: zn, bracketEvery: 2.6 });
    pipe(kit, rowX0, rowX1, y0 + 3.85, zs - 0.12, 0.06, { alongX: true, wallC: zs });
    pipe(kit, rowX0, rowX1, y0 + 3.65, zs - 0.1, 0.04, { alongX: true, color: IMP.dark, wallC: zs, bracketEvery: 2.6 });

    // --- sensor pedestals (dishes are one instanced mesh, rotated in update)
    const peds = [
      [cx + 4.6, cz - 4.1],
      [cx + 4.6, cz + 4.1],
    ];
    const bearingY = peds.map(([x, z], i) => pedestal(kit, x, y0, z, i));
    const dishes = new THREE.InstancedMesh(dishGeometry(), ctx.materials.metal, peds.length);
    dishes.name = "comms-dishes";
    dishes.castShadow = true;
    dishes.receiveShadow = true;
    dishes.frustumCulled = false;
    ctx.group.add(dishes);
    const _m = new THREE.Matrix4();
    const _q = new THREE.Quaternion();
    const _p = new THREE.Vector3();
    const _s = new THREE.Vector3(1, 1, 1);
    const placeDishes = (t) => {
      peds.forEach(([x, z], i) => {
        const yaw = i === 0 ? t * 0.35 + 0.4 : -t * 0.22 + 2.1;
        _q.setFromEuler(new THREE.Euler(0, yaw, 0));
        _p.set(x, bearingY[i], z);
        _m.compose(_p, _q, _s);
        dishes.setMatrixAt(i, _m);
      });
      dishes.instanceMatrix.needsUpdate = true;
    };
    placeDishes(ctx.time ? ctx.time() : 0);

    // --- floor: walkway from the door to the dais, cable covers from the racks to the stations / pedestals
    walkway(kit, y0, daisX1 + 0.02, xe - 0.45, dz0, dz1);
    for (const z of [
      [zn + 0.9, cz - 5.6],
      [cz + 5.6, zs - 0.9],
    ])
      cableCover(kit, y0, z[0], z[1], stationX);
    for (const z of [
      [zn + 0.9, cz - 4.1 - 1.2],
      [cz + 4.1 + 1.2, zs - 0.9],
    ])
      cableCover(kit, y0, z[0], z[1], peds[0][0]);

    // --- lights (≤ 14 descriptors): six cool downlights, blue key on the signal wall, blue dome fill,
    // amber rack accents, one spot key over the operator row
    for (const [x, y, z] of downlights) ctx.lights.push({ type: "point", pos: [x, y, z], color: LIGHT.coolWhite, intensity: 15, distance: 13, priority: 0.45 });
    ctx.lights.push({ type: "point", pos: [xw + 1.7, ceilY - 1.1, cz], color: LIGHT.blue, intensity: 12, distance: 12, priority: 0.8 });
    ctx.lights.push({ type: "point", pos: [cx, ceilY - 1.6, cz], color: LIGHT.blue, intensity: 5, distance: 8, priority: 0.5 });
    ctx.lights.push({ type: "point", pos: [cx - 2.7, y0 + 1.3, zn + 1.7], color: LIGHT.amber, intensity: 2.5, distance: 6, priority: 0.3 });
    ctx.lights.push({ type: "point", pos: [cx + 2.8, y0 + 1.3, zs - 1.7], color: LIGHT.amber, intensity: 2.5, distance: 6, priority: 0.3 });
    ctx.lights.push({ type: "spot", pos: [stationX + 1.6, ceilY - 0.2, cz], target: [stationX, y0 + 0.9, cz], color: LIGHT.coolWhite, intensity: 25, distance: 10, angle: 0.9, penumbra: 0.6, priority: 0.9 });
    // blue uplights beside each pedestal so the dishes read against the rack rows instead of as silhouettes
    for (const [x, z] of peds) ctx.lights.push({ type: "point", pos: [x + 0.9, y0 + 2.1, z], color: LIGHT.blue, intensity: 6, distance: 6, priority: 0.55 });
    flushLedBatch();

    return {
      update(dt, t) {
        if (wave) wave.update(t);
        placeDishes(t);
      },
      dispose() {
        if (wave) wave.texture.dispose();
        if (atlasTex) atlasTex.dispose();
        wave = null;
        atlasTex = null;
      },
    };
  },
};
export default manifest;
