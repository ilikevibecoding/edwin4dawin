// d1-comms — communications + sensors: two rows of equipment racks (open-front with visible cabling / closed
// with door displays, one door open) with patch cabling and bundle drops from the row trays, four operator
// stations (twin / hooded / wrap kinds) and a supervisor dais facing the signal-wall array (animated receiver
// display, status columns, system maps, upper-band cable tray), two sensor-processing towers with rotating
// scanner rings, a ceiling cable/light hub feeding four ladder trays, linear aisle luminaires, ducting and beams.
// Blue displays / amber status (COORDINATION.md §11).
import * as THREE from "three";
import { BOUNDS, CEIL, FLOOR, doorsFor } from "../shared/plan.js";
import { roomShell, doorReveal } from "../shared/imperial.js";
import { IMP, LIGHT } from "../shared/palette.js";
import { rng } from "../../../kit.js";
import { makeCommsAtlas, makeWaveDisplay } from "./ui.js";
import { screenMaterial, beginLedBatch, flushLedBatch } from "./lib.js";
import { rack, patchFrame, patchBetween, bundleDrop, workLamp, cableTray, ladderTray, duct, pipe, ceilingStructure } from "./racks.js";
import { station } from "./stations.js";
import { signalWall, eastWall, sensorTower, ringGeometry, cableHub, hubLight, washSpot, linearLuminaire, canDownlight, spotHead, dais, walkway, cableCover } from "./fixtures.js";

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
    "d1-comms-dish": { pos: [-27.6, FLOOR, 497.2], yaw: 35, pitch: 8 },
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
    beginLedBatch(kit); // ~2,000 indicator LEDs are emitted as one geometry per material (build-time budget)

    // --- shell (light-grey panels, blue strips at 2.05 m, plain hung ceiling: the room's own luminaires light it)
    roomShell(kit, manifest, {
      floorY: y0,
      ceilY,
      seed: 67,
      panelW: 2.4,
      strip: "emitBlue",
      ceiling: { axis: "x", inset: 0.25, channels: [] },
    });
    for (const d of manifest.doors) doorReveal(kit, manifest, d, y0);

    // --- rack rows along the north and south walls (11 slots each; slot 5 is an open patch frame).
    // Two cabinet types alternate irregularly; north slot 7 stands with its door open into the aisle, south slot 7
    // has a tray pulled out; every rack draws its own LED fill / palette / pattern from its seed.
    const TYPES = {
      n: ["open", "closed", "open", "closed", "open", null, "open", "closed", "open", "closed", "open"],
      s: ["closed", "open", "open", "closed", "open", null, "closed", "open", "closed", "open", "closed"],
    };
    const rows = [];
    for (const [zBack, f, key] of [
      [zn, +1, "n"],
      [zs, -1, "s"],
    ]) {
      const row = [];
      for (let k = 0; k < 11; k++) {
        const x0 = xw + 1.1 + k * 1.5;
        const type = TYPES[key][k];
        row.push(k === 5 ? patchFrame(kit, x0, y0, zBack, f, 300 + k + (f > 0 ? 0 : 50)) : rack(kit, x0, y0, zBack, f, 100 + k * 7 + (f > 0 ? 0 : 500), { type, doorOpen: key === "n" && k === 7, pulledTray: key === "s" && k === 7 }));
      }
      for (let k = 0; k + 1 < row.length; k++) patchBetween(kit, row[k], row[k + 1], rand);
      // cable bundles from the row tray into every second rack
      const trayZ = zBack + f * 0.35;
      for (let k = 1; k < row.length; k += 2) if (k !== 5) bundleDrop(kit, row[k], y0, y0 + 3.28, trayZ, rand);
      rows.push(row);
    }
    const rowX0 = xw + 1.1;
    const rowX1 = xw + 1.1 + 10 * 1.5 + 1.2;
    // amber service lamps clipped to a rack rail on each row (the sources of the two amber accent pools)
    workLamp(kit, cx - 2.75, y0 + 1.75, zn + 0.9, +1);
    workLamp(kit, cx + 2.9, y0 + 1.75, zs - 0.9, -1);

    // --- overhead trays at 3.28 m (all below the pendant luminaires at 3.45 m): a U-channel tray over each rack
    // row, one cross tray over the operator row (station conduit drops), the hub's four ladder trays out to both
    // rows (hanger rods kept 1.2 m clear of the aisle sources), one feed tray from the hub to the signal wall at
    // 3.5 m crossing over the south ladder trays
    const trayY = y0 + 3.28;
    cableTray(kit, [rowX0, zn + 0.35], [rowX1, zn + 0.35], trayY, ceilY, { w: 0.4, seed: 11 });
    cableTray(kit, [rowX0, zs - 0.35], [rowX1, zs - 0.35], trayY, ceilY, { w: 0.4, seed: 12 });
    const stationX = xw + 5.5;
    const trayA = stationX;
    cableTray(kit, [trayA, zn + 0.55], [trayA, zs - 0.55], trayY, ceilY, { w: 0.36, seed: 13 });
    const hubW = 2.6;
    const hubD = 1.8;
    const hubTrayXs = [-0.8, 0.8];
    hubTrayXs.forEach((tx, i) => {
      ladderTray(kit, [cx + tx, cz - hubD / 2 - 0.05], [cx + tx, zn + 0.56], trayY, ceilY, { w: 0.45, seed: 40 + i, hangStart: 0.44 });
      ladderTray(kit, [cx + tx, cz + hubD / 2 + 0.05], [cx + tx, zs - 0.56], trayY, ceilY, { w: 0.45, seed: 50 + i, hangStart: 1.95 });
    });
    const feedZ = cz + 1.9;
    const feedY = y0 + 3.5;
    cableTray(kit, [cx + 0.8, feedZ], [xw + 0.42, feedZ], feedY, ceilY, { w: 0.3, seed: 15, cables: 2, hangEvery: 2.5 });

    // --- ceiling: beams (the outer pair sits 1.4 m outside the aisle lines), the cable/light hub, two pendant
    // linear luminaires over the rack aisles, two recessed can downlights over the east end, two track spot heads
    ceilingStructure(kit, xw, xe, zn, zs, ceilY, { beamsZ: [cz - 7.9, cz - 2.6, cz + 2.6, cz + 7.9], beamsX: [xw + 3.0, xe - 3.0] });
    cableHub(kit, cx, ceilY, cz, { w: hubW, d: hubD, trayXs: hubTrayXs, trayY });
    // four sources per row 4 m apart (0.9 m inside the beamsX lines, so the beam flanges stay out of the near field)
    const aisleXs = [cx - 6.0, cx - 2.0, cx + 2.0, cx + 6.0];
    const aisleN = zn + 2.2;
    const aisleS = zs - 2.2;
    const aisleY = linearLuminaire(kit, rowX0 + 0.2, rowX1 - 0.2, aisleN, ceilY, aisleXs);
    linearLuminaire(kit, rowX0 + 0.2, rowX1 - 0.2, aisleS, ceilY, aisleXs);
    const eastLights = [
      [xe - 2.5, cz - 3.0],
      [xe - 2.5, cz + 3.0],
    ];
    for (const [x, z] of eastLights) canDownlight(kit, x, ceilY, z, { r: 0.1 });
    const opsSpot = { pos: [stationX + 1.6, ceilY - 0.55, cz], target: [stationX, y0 + 0.9, cz] };
    spotHead(kit, opsSpot.pos, opsSpot.target, ceilY);
    const wash = washSpot(xw, y0, ceilY, cz);

    // --- operator stations facing the signal wall (hooded single / twin / wrap / twin without headset),
    // supervisor on a dais behind them
    const kinds = [
      { kind: "hooded", screens: ["wide0"], readout: "readout0", headset: true },
      { kind: "twin", screens: ["console2", "console3"], readout: "readout1", headset: true },
      { kind: "wrap", screens: ["console1", "console0", "console2"], readout: "readout2", headset: true },
      { kind: "twin", screens: ["console3", "console0"], readout: "readout3", headset: false },
    ];
    [cz - 4.5, cz - 1.5, cz + 1.5, cz + 4.5].forEach((z, i) => {
      station(kit, stationX, y0, z, { w: 2.0, facing: 1, ...kinds[i], seed: 21 + i });
      // rigid conduit drop from the cross tray to the back of the display housing
      const cxp = stationX - 0.52;
      const cTop = trayY - 0.03;
      kit.cyl("metal", cxp, (y0 + 1.25 + cTop) / 2, z, 0.03, cTop - (y0 + 1.25), "y", { color: IMP.mid, segments: 8 });
      kit.cyl("metal", cxp + 0.08, y0 + 1.25, z, 0.03, 0.16, "x", { color: IMP.mid, segments: 8 });
      kit.box("paintedMetal", cxp, y0 + 1.25, z, 0.09, 0.09, 0.09, { color: IMP.dark });
      kit.cyl("metal", cxp + 0.22, cTop, z, 0.03, 0.44, "x", { color: IMP.mid, segments: 8 });
      kit.box("paintedMetal", cxp, cTop, z, 0.09, 0.09, 0.09, { color: IMP.dark });
    });
    const daisX0 = cx - 2.1;
    const daisX1 = cx + 0.8;
    dais(kit, daisX0, daisX1, y0, cz - 1.6, cz + 1.6);
    station(kit, cx - 1.1, y0 + 0.15, cz, { w: 2.4, facing: 1, kind: "twin", screens: ["console3", "console0", "console2"], readout: "readout7", seed: 31, chairOffset: 0.62 });
    // supervisor feed: conduit from the feed tray to a floor junction box beside the dais
    kit.cyl("metal", cx - 1.1, (y0 + 0.4 + feedY) / 2, feedZ, 0.03, feedY - (y0 + 0.4), "y", { color: IMP.mid, segments: 8 });
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

    // --- sensor-processing towers (scanner rings are one instanced mesh, rotated in update)
    const towers = [
      [cx + 4.6, cz - 4.1],
      [cx + 4.6, cz + 4.1],
    ];
    const ringY = towers.map(([x, z], i) => sensorTower(kit, x, y0, z, i, { labelSide: z < cz ? 1 : -1 })); // ID plates face the centre aisle
    const rings = new THREE.InstancedMesh(ringGeometry(), ctx.materials.metal, towers.length);
    rings.name = "comms-scanner-rings";
    rings.castShadow = true;
    rings.receiveShadow = true;
    rings.frustumCulled = false;
    ctx.group.add(rings);
    const _m = new THREE.Matrix4();
    const _q = new THREE.Quaternion();
    const _p = new THREE.Vector3();
    const _s = new THREE.Vector3(1, 1, 1);
    const _e = new THREE.Euler();
    const placeRings = (t) => {
      towers.forEach(([x, z], i) => {
        const yaw = i === 0 ? t * 0.35 + 0.4 : -t * 0.22 + 2.1;
        _q.setFromEuler(_e.set(0, yaw, 0));
        _p.set(x, ringY[i], z);
        _m.compose(_p, _q, _s);
        rings.setMatrixAt(i, _m);
      });
      rings.instanceMatrix.needsUpdate = true;
    };
    placeRings(ctx.time ? ctx.time() : 0);

    // --- floor: walkway from the door to the dais, cable covers from the racks to the stations / towers
    walkway(kit, y0, daisX1 + 0.02, xe - 0.45, dz0, dz1);
    for (const z of [
      [zn + 0.9, cz - 5.6],
      [cz + 5.6, zs - 0.9],
    ])
      cableCover(kit, y0, z[0], z[1], stationX);
    for (const z of [
      [zn + 0.9, cz - 4.1 - 1.0],
      [cz + 4.1 + 1.0, zs - 0.9],
    ])
      cableCover(kit, y0, z[0], z[1], towers[0][0]);

    // --- lights (14 descriptors = 10 points + 4 spots, the harness pool is 12 + 4). Every point sits INSIDE a
    // closed dark housing (a convex box cannot face a source inside it) at least 1.2 m from the ceiling, and every
    // spot points down from the mouth of its can, so no surface is lit at point-blank range (no blobs / halos):
    // eight cool aisle washes inside the pendant luminaires (four per row, 3.5 m up), a cool downlight inside
    // the hub body (0.12 m under the ceiling, 12: at 0.28 m / 14 its ceiling specular clipped in front of the hub),
    // an amber accent 0.8 m in front of the south work lamp, a blue wall-wash spot in the centre hood of the
    // signal wall, two downward spots in the east can downlights and a spot key over the operator row (shadow caster)
    for (const z of [aisleN, aisleS]) for (const x of aisleXs) ctx.lights.push({ type: "point", pos: [x, aisleY, z], color: LIGHT.coolWhite, intensity: 10, distance: 10, priority: 0.5 });
    ctx.lights.push({ type: "point", pos: hubLight(cx, ceilY, cz), color: LIGHT.coolWhite, intensity: 12, distance: 11, priority: 0.6 });
    ctx.lights.push({ type: "point", pos: [cx + 2.9, y0 + 1.6, zs - 1.8], color: LIGHT.amber, intensity: 2.5, distance: 6, priority: 0.3 });
    ctx.lights.push({ type: "spot", pos: wash.pos, target: wash.target, color: LIGHT.blue, intensity: 25, distance: 9, angle: 0.9, penumbra: 0.6, priority: 0.8 });
    for (const [x, z] of eastLights) ctx.lights.push({ type: "spot", pos: [x, ceilY - 0.2, z], target: [x, y0, z], color: LIGHT.coolWhite, intensity: 36, distance: 12, angle: 1.15, penumbra: 0.6, priority: 0.45 });
    ctx.lights.push({ type: "spot", pos: opsSpot.pos, target: opsSpot.target, color: LIGHT.coolWhite, intensity: 25, distance: 10, angle: 0.9, penumbra: 0.6, priority: 0.9 });
    flushLedBatch();

    return {
      update(dt, t) {
        if (wave) wave.update(t);
        placeRings(t);
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
