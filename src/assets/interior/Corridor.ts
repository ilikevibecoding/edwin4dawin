import * as THREE from 'three';
import { box, cyl, merge, placementMatrix } from '../geometry';
import {
  bulkhead,
  corridorFloor,
  corridorTrim,
  corridorWall,
  darkMechanical,
  emissive,
} from '../materials';
import { consoleScreenMap } from '../textures';
import { freshRng } from '../../core/Random';
import { BlastDoor } from './BlastDoor';
import { ControlPanel } from './ControlPanel';

/**
 * Modular interior of the blockade runner.
 *
 * Geography (metres, right-handed, +Y up):
 *   - Main corridor runs along +X from the boarding airlock at x = -11 to the
 *     aft bulkhead at x = 42, 3.4 m wide, 3.1 m to the ceiling crown.
 *   - A recessed alcove opens off the -Z wall at x 20..24 (Leia's console).
 *   - A junction opens off the +Z wall at x 30..34 leading to the escape-pod
 *     bay at z = 14..21.
 *
 * Repeated furniture (wall panel insets, ceiling luminaires, floor plates,
 * structural ribs) is drawn with `InstancedMesh`; the continuous wall skin is
 * merged per run so the openings can be cut out cleanly.
 */

export const CORRIDOR = {
  xStart: -11,
  xEnd: 42,
  halfWidth: 1.7,
  ceiling: 3.08,
  moduleLength: 4,
  alcove: { x0: 20, x1: 24, depth: 3.4 },
  junction: { x0: 30, x1: 34 },
  podBay: { zStart: 1.7, zEnd: 20.5, halfWidth: 1.7, roomHalf: 3.2, roomZ: 17.6 },
} as const;

/** Cross-section of the corridor shell, from the -Z floor edge up and over. */
const PROFILE: Array<[number, number]> = [
  [0.0, -1.7],
  [1.15, -1.74],
  [2.1, -1.66],
  [2.6, -1.44],
  [2.92, -1.05],
  [3.05, -0.6],
  [3.08, 0.0],
  [3.05, 0.6],
  [2.92, 1.05],
  [2.6, 1.44],
  [2.1, 1.66],
  [1.15, 1.74],
  [0.0, 1.7],
];

/**
 * Extrude a (y, z) polyline along X into an inward-facing ribbon.
 * `flip` reverses the winding for surfaces seen from the other side.
 */
function ribbonAlongX(
  profile: Array<[number, number]>,
  x0: number,
  x1: number,
  flip = false,
  uvRepeat = 0.25,
): THREE.BufferGeometry {
  const n = profile.length;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const xs = [x0, x1];
  for (let s = 0; s < 2; s++) {
    for (let i = 0; i < n; i++) {
      positions.push(xs[s], profile[i][0], profile[i][1]);
      uvs.push(xs[s] * uvRepeat, i / (n - 1));
    }
  }
  for (let i = 0; i < n - 1; i++) {
    const a = i;
    const b = i + 1;
    const c = n + i + 1;
    const d = n + i;
    if (flip) indices.push(a, c, b, a, d, c);
    else indices.push(a, b, c, a, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Same as above but extruded along Z (used for the pod-bay branch). */
function ribbonAlongZ(
  profile: Array<[number, number]>,
  z0: number,
  z1: number,
  flip = false,
): THREE.BufferGeometry {
  const g = ribbonAlongX(profile, z0, z1, flip);
  g.rotateY(Math.PI / 2);
  return g;
}

export interface CorridorOptions {
  detail?: number;
  lights?: number;
}

interface Luminaire {
  light: THREE.PointLight;
  base: number;
  x: number;
  flickerSeed: number;
  damaged: boolean;
}

export class Corridor {
  readonly root = new THREE.Group();
  readonly anchors: Record<string, THREE.Object3D> = {};
  readonly blastDoor: BlastDoor;
  readonly aftDoor: BlastDoor;
  readonly consoles: ControlPanel[] = [];
  readonly podHatch: THREE.Group;

  private luminaires: Luminaire[] = [];
  private alarmLights: THREE.Mesh[] = [];
  private alarmPoint: THREE.PointLight;
  private alarmActive = 0;
  private vaderFill: THREE.PointLight;
  private podHatchDoor: THREE.Mesh;

  constructor(opts: CorridorOptions = {}) {
    const detail = opts.detail ?? 1;
    const rng = freshRng('corridor');
    this.root.name = 'Corridor';
    const { xStart, xEnd, halfWidth, ceiling } = CORRIDOR;

    // ---- Wall skin, cut around the openings -------------------------------
    const negProfile = PROFILE.filter((p) => p[1] <= 0);
    const posProfile = PROFILE.filter((p) => p[1] >= 0);
    const wallRuns: THREE.BufferGeometry[] = [];
    // -Z side, split by the alcove.
    wallRuns.push(ribbonAlongX(negProfile, xStart, CORRIDOR.alcove.x0));
    wallRuns.push(ribbonAlongX(negProfile, CORRIDOR.alcove.x1, xEnd));
    // +Z side, split by the junction.
    wallRuns.push(ribbonAlongX(posProfile, xStart, CORRIDOR.junction.x0));
    wallRuns.push(ribbonAlongX(posProfile, CORRIDOR.junction.x1, xEnd));
    // Crown strip joining the two halves.
    wallRuns.push(
      ribbonAlongX(
        [
          [3.08, -0.001],
          [3.08, 0.001],
        ],
        xStart,
        xEnd,
      ),
    );
    const wallMesh = new THREE.Mesh(merge(wallRuns), corridorWall());
    wallMesh.name = 'Corridor_Walls';
    wallMesh.receiveShadow = true;
    this.root.add(wallMesh);

    // Openings need their own returns so you never see through a paper edge.
    const returns: THREE.BufferGeometry[] = [];
    const alc = CORRIDOR.alcove;
    returns.push(
      box(0.2, ceiling, alc.depth, { pos: [alc.x0 - 0.1, ceiling / 2, -halfWidth - alc.depth / 2] }),
      box(0.2, ceiling, alc.depth, { pos: [alc.x1 + 0.1, ceiling / 2, -halfWidth - alc.depth / 2] }),
      box(alc.x1 - alc.x0 + 0.4, ceiling, 0.2, {
        pos: [(alc.x0 + alc.x1) / 2, ceiling / 2, -halfWidth - alc.depth],
      }),
      box(alc.x1 - alc.x0 + 0.4, 0.2, alc.depth, {
        pos: [(alc.x0 + alc.x1) / 2, ceiling, -halfWidth - alc.depth / 2],
      }),
    );
    const jn = CORRIDOR.junction;
    const pb = CORRIDOR.podBay;
    // Pod-bay branch walls.
    returns.push(
      box(0.2, ceiling, pb.roomZ - halfWidth - pb.roomHalf + 0.2, {
        pos: [jn.x0 - 0.1, ceiling / 2, (halfWidth + pb.roomZ - pb.roomHalf) / 2],
      }),
      box(0.2, ceiling, pb.roomZ - halfWidth - pb.roomHalf + 0.2, {
        pos: [jn.x1 + 0.1, ceiling / 2, (halfWidth + pb.roomZ - pb.roomHalf) / 2],
      }),
    );
    const branchMid = (jn.x0 + jn.x1) / 2;
    // Pod bay room shell.
    returns.push(
      box(0.2, ceiling, pb.roomHalf * 2, {
        pos: [branchMid - pb.roomHalf, ceiling / 2, pb.roomZ],
      }),
      box(0.2, ceiling, pb.roomHalf * 2, {
        pos: [branchMid + pb.roomHalf, ceiling / 2, pb.roomZ],
      }),
      box(pb.roomHalf * 2 + 0.4, ceiling, 0.2, {
        pos: [branchMid, ceiling / 2, pb.roomZ + pb.roomHalf],
      }),
      box(pb.roomHalf * 2 + 0.4, 0.2, pb.roomHalf * 2 + 0.4, {
        pos: [branchMid, ceiling, pb.roomZ],
      }),
      box(0.2, 0.2, pb.roomZ - pb.roomHalf - halfWidth, {
        pos: [jn.x0, ceiling, (halfWidth + pb.roomZ - pb.roomHalf) / 2],
      }),
      box(0.2, 0.2, pb.roomZ - pb.roomHalf - halfWidth, {
        pos: [jn.x1, ceiling, (halfWidth + pb.roomZ - pb.roomHalf) / 2],
      }),
      // Small corner fillers where the branch meets the main run.
      box(pb.roomHalf - (jn.x1 - jn.x0) / 2, ceiling, 0.2, {
        pos: [branchMid - (pb.roomHalf + (jn.x1 - jn.x0) / 2) / 2, ceiling / 2, pb.roomZ - pb.roomHalf],
      }),
      box(pb.roomHalf - (jn.x1 - jn.x0) / 2, ceiling, 0.2, {
        pos: [branchMid + (pb.roomHalf + (jn.x1 - jn.x0) / 2) / 2, ceiling / 2, pb.roomZ - pb.roomHalf],
      }),
    );
    // End caps.
    returns.push(
      box(0.3, ceiling + 0.2, halfWidth * 2 + 0.4, { pos: [xEnd + 0.15, ceiling / 2, 0] }),
    );
    const returnMesh = new THREE.Mesh(merge(returns), bulkhead());
    returnMesh.name = 'Corridor_Returns';
    returnMesh.castShadow = true;
    returnMesh.receiveShadow = true;
    this.root.add(returnMesh);

    // Branch corridor side walls use the same profile turned 90 degrees.
    const branchWalls = merge([
      ribbonAlongZ(negProfile, halfWidth, pb.roomZ - pb.roomHalf, true),
      ribbonAlongZ(posProfile, halfWidth, pb.roomZ - pb.roomHalf, true),
    ]);
    branchWalls.translate(branchMid, 0, 0);
    const branchMesh = new THREE.Mesh(branchWalls, corridorWall());
    branchMesh.name = 'Corridor_BranchWalls';
    branchMesh.receiveShadow = true;
    this.root.add(branchMesh);

    // ---- Floors -----------------------------------------------------------
    const floorParts: THREE.BufferGeometry[] = [
      box(xEnd - xStart, 0.16, halfWidth * 2, { pos: [(xStart + xEnd) / 2, -0.08, 0] }),
      box(alc.x1 - alc.x0, 0.16, alc.depth, {
        pos: [(alc.x0 + alc.x1) / 2, -0.08, -halfWidth - alc.depth / 2],
      }),
      box(jn.x1 - jn.x0, 0.16, pb.roomZ - pb.roomHalf - halfWidth, {
        pos: [branchMid, -0.08, (halfWidth + pb.roomZ - pb.roomHalf) / 2],
      }),
      box(pb.roomHalf * 2, 0.16, pb.roomHalf * 2, { pos: [branchMid, -0.08, pb.roomZ] }),
    ];
    const floor = new THREE.Mesh(merge(floorParts), corridorFloor());
    floor.name = 'Corridor_Floor';
    floor.receiveShadow = true;
    this.root.add(floor);

    // ---- Instanced repeated furniture -------------------------------------
    const moduleCount = Math.floor((xEnd - xStart) / CORRIDOR.moduleLength);

    // Structural ribs: a raised band following the profile.
    const ribProfile = PROFILE.map(([y, z]) => [y, z * 1.008] as [number, number]);
    const ribGeo = merge([
      ribbonAlongX(ribProfile, -0.12, 0.12),
      box(0.24, 0.06, halfWidth * 2, { pos: [0, ceiling - 0.02, 0] }),
    ]);
    const ribs = new THREE.InstancedMesh(ribGeo, corridorTrim(), moduleCount);
    ribs.name = 'Corridor_Ribs';
    ribs.castShadow = false;
    ribs.receiveShadow = true;
    const m = new THREE.Matrix4();
    for (let i = 0; i < moduleCount; i++) {
      const x = xStart + i * CORRIDOR.moduleLength;
      ribs.setMatrixAt(i, m.makeTranslation(x, 0, 0));
    }
    ribs.instanceMatrix.needsUpdate = true;
    this.root.add(ribs);

    // Recessed wall panels, two per module per side.
    const panelGeo = merge([
      box(1.4, 1.05, 0.07, { pos: [0, 0, 0] }),
      box(1.24, 0.9, 0.1, { pos: [0, 0, 0.02] }),
      box(0.16, 0.16, 0.12, { pos: [0.5, -0.36, 0.05] }),
    ]);
    const panelCount = moduleCount * 2;
    const panels = new THREE.InstancedMesh(panelGeo, corridorTrim(), panelCount);
    panels.name = 'Corridor_Panels';
    panels.receiveShadow = true;
    let pi = 0;
    for (let i = 0; i < moduleCount; i++) {
      const x = xStart + i * CORRIDOR.moduleLength + CORRIDOR.moduleLength / 2;
      for (const side of [-1, 1] as const) {
        const inAlcove = side < 0 && x > alc.x0 - 1 && x < alc.x1 + 1;
        const inJunction = side > 0 && x > jn.x0 - 1 && x < jn.x1 + 1;
        const hide = inAlcove || inJunction || pi >= panelCount;
        panels.setMatrixAt(
          pi,
          placementMatrix({
            pos: [x, 1.45, side * (halfWidth - 0.06)],
            rot: [0, side > 0 ? Math.PI : 0, 0],
            scale: hide ? 0.0001 : 1,
          }),
        );
        pi++;
      }
    }
    panels.instanceMatrix.needsUpdate = true;
    this.root.add(panels);

    // Ceiling luminaires.
    const lumGeo = merge([
      box(2.4, 0.05, 0.62, { pos: [0, ceiling - 0.04, 0] }),
    ]);
    const lumFrameGeo = merge([
      box(2.6, 0.1, 0.86, { pos: [0, ceiling + 0.01, 0] }),
    ]);
    const lumFrames = new THREE.InstancedMesh(lumFrameGeo, corridorTrim(), moduleCount);
    const lums = new THREE.InstancedMesh(lumGeo, emissive('corridorLight', 0xdfe8f5, 0.85), moduleCount);
    lums.name = 'Corridor_Luminaires';
    for (let i = 0; i < moduleCount; i++) {
      const x = xStart + i * CORRIDOR.moduleLength + CORRIDOR.moduleLength / 2;
      lums.setMatrixAt(i, m.makeTranslation(x, 0, 0));
      lumFrames.setMatrixAt(i, m.makeTranslation(x, 0, 0));
    }
    lums.instanceMatrix.needsUpdate = true;
    lumFrames.instanceMatrix.needsUpdate = true;
    this.root.add(lums, lumFrames);

    // Real point lights: fewer than luminaires, spread evenly.
    const lightCount = opts.lights ?? Math.max(5, Math.round(9 * Math.min(1, detail + 0.35)));
    for (let i = 0; i < lightCount; i++) {
      const x = xStart + 3 + ((xEnd - xStart - 6) * i) / Math.max(1, lightCount - 1);
      const light = new THREE.PointLight(0xdfe8f5, 8.5, 15, 1.7);
      light.position.set(x, ceiling - 0.35, 0);
      light.castShadow = false;
      this.root.add(light);
      this.luminaires.push({
        light,
        base: 8.5,
        x,
        flickerSeed: rng.range(0, 100),
        damaged: rng.bool(0.22),
      });
    }
    // Two lights for the pod bay and one for the alcove.
    for (const [lx, lz, colour] of [
      [branchMid, pb.roomZ, 0xdfe8f5],
      [branchMid, halfWidth + 3.5, 0xdfe8f5],
      [(alc.x0 + alc.x1) / 2, -halfWidth - alc.depth * 0.5, 0xe8eef8],
    ] as Array<[number, number, number]>) {
      const light = new THREE.PointLight(colour, 7.5, 14, 1.7);
      light.position.set(lx, ceiling - 0.4, lz);
      this.root.add(light);
      this.luminaires.push({ light, base: 7.5, x: lx, flickerSeed: rng.range(0, 100), damaged: false });
    }
    // Matching luminaire plates in the branch and alcove.
    const extraLums = new THREE.Mesh(
      merge([
        box(0.62, 0.05, 2.4, { pos: [branchMid, ceiling - 0.04, pb.roomZ] }),
        box(0.62, 0.05, 2.4, { pos: [branchMid, ceiling - 0.04, halfWidth + 3.5] }),
        box(1.6, 0.05, 0.55, {
          pos: [(alc.x0 + alc.x1) / 2, ceiling - 0.04, -halfWidth - alc.depth * 0.5],
        }),
      ]),
      emissive('corridorLight', 0xdfe8f5, 0.85),
    );
    this.root.add(extraLums);

    // ---- Doors ------------------------------------------------------------
    this.blastDoor = new BlastDoor({ width: halfWidth * 2, height: ceiling, thickness: 0.35 });
    this.blastDoor.root.position.set(xStart + 0.2, 0, 0);
    this.blastDoor.root.rotation.y = Math.PI / 2;
    this.root.add(this.blastDoor.root);

    this.aftDoor = new BlastDoor({ width: halfWidth * 2, height: ceiling, thickness: 0.3 });
    this.aftDoor.root.position.set(xEnd - 0.4, 0, 0);
    this.aftDoor.root.rotation.y = -Math.PI / 2;
    this.root.add(this.aftDoor.root);

    // Airlock ring behind the breach door.
    const airlock = new THREE.Mesh(
      merge([
        cyl(2.5, 2.5, 0.5, 16, { pos: [xStart - 0.2, ceiling / 2, 0], rot: [0, 0, Math.PI / 2] }),
        box(0.4, ceiling + 0.6, halfWidth * 2 + 1.2, { pos: [xStart - 0.5, ceiling / 2, 0] }),
      ]),
      darkMechanical(),
    );
    this.root.add(airlock);

    // ---- Consoles ---------------------------------------------------------
    const leiaConsole = new ControlPanel({ width: 1.9, tint: 'blue', screens: 3 });
    leiaConsole.root.position.set((alc.x0 + alc.x1) / 2, 0, -halfWidth - alc.depth + 0.45);
    this.root.add(leiaConsole.root);
    this.consoles.push(leiaConsole);

    const bayConsole = new ControlPanel({ width: 1.5, tint: 'amber', screens: 2 });
    bayConsole.root.position.set(branchMid - pb.roomHalf + 0.45, 0, pb.roomZ - 1.2);
    bayConsole.root.rotation.y = Math.PI / 2;
    this.root.add(bayConsole.root);
    this.consoles.push(bayConsole);

    const midConsole = new ControlPanel({ width: 1.5, tint: 'amber', screens: 2 });
    midConsole.root.position.set(12, 0, halfWidth - 0.2);
    midConsole.root.rotation.y = Math.PI;
    this.root.add(midConsole.root);
    this.consoles.push(midConsole);

    // ---- Pod hatch --------------------------------------------------------
    this.podHatch = new THREE.Group();
    this.podHatch.name = 'PodHatch';
    this.podHatch.position.set(branchMid, 0, pb.roomZ + pb.roomHalf - 0.12);
    const hatchFrame = new THREE.Mesh(
      merge([
        cyl(1.5, 1.5, 0.24, 20, { pos: [0, 1.5, 0], rot: [Math.PI / 2, 0, 0] }),
        cyl(1.26, 1.26, 0.34, 20, { pos: [0, 1.5, -0.06], rot: [Math.PI / 2, 0, 0] }),
        box(3.4, 0.22, 0.3, { pos: [0, 3.0, 0] }),
        box(3.4, 0.22, 0.3, { pos: [0, 0.1, 0] }),
      ]),
      darkMechanical(),
    );
    this.podHatch.add(hatchFrame);
    this.podHatchDoor = new THREE.Mesh(
      merge([
        cyl(1.2, 1.2, 0.16, 20, { pos: [0, 1.5, -0.02], rot: [Math.PI / 2, 0, 0] }),
        box(2.0, 0.1, 0.2, { pos: [0, 1.5, -0.1] }),
      ]),
      bulkhead(),
    );
    this.podHatch.add(this.podHatchDoor);
    const hatchScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.3),
      new THREE.MeshStandardMaterial({
        map: consoleScreenMap(4, 'amber'),
        emissiveMap: consoleScreenMap(4, 'amber'),
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 1.4,
        roughness: 0.4,
      }),
    );
    hatchScreen.position.set(1.05, 1.7, -0.14);
    hatchScreen.rotation.y = Math.PI;
    this.podHatch.add(hatchScreen);
    this.root.add(this.podHatch);
    this.anchors.podHatch = anchor(this.podHatch, 'podHatchCentre', 0, 1.5, -0.2);

    // ---- Alarm strips -----------------------------------------------------
    for (let i = 0; i < 6; i++) {
      const x = xStart + 5 + i * 6.5;
      const strip = new THREE.Mesh(
        box(0.5, 0.16, 0.12, { pos: [0, 0, 0] }),
        emissive('corridorAlarm', 0xff3a24, 0),
      );
      strip.position.set(x, 2.45, halfWidth - 0.05);
      this.root.add(strip);
      this.alarmLights.push(strip);
    }
    this.alarmPoint = new THREE.PointLight(0xff2f1c, 0, 26, 1.5);
    this.alarmPoint.position.set(14, 2.4, 0);
    this.root.add(this.alarmPoint);

    // Cold fill light that rises when Vader enters.
    this.vaderFill = new THREE.PointLight(0x4468b8, 0, 30, 1.6);
    this.vaderFill.position.set(0, 2.2, 0);
    this.root.add(this.vaderFill);

    // ---- Battle damage dressing -------------------------------------------
    const scorchMat = new THREE.MeshStandardMaterial({
      color: 0x1a1614,
      roughness: 0.95,
      metalness: 0,
      transparent: true,
      opacity: 0.72,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const scorchParts: THREE.BufferGeometry[] = [];
    const dRng = rng.fork('corridor-damage');
    /** Wall Z at a given height, so scorch marks lie flat on the curve. */
    const wallZAt = (y: number): number => {
      for (let i = 0; i < PROFILE.length - 1; i++) {
        const [y0, z0] = PROFILE[i];
        const [y1, z1] = PROFILE[i + 1];
        if (z0 > 0 || z1 > 0) continue;
        if (y >= Math.min(y0, y1) && y <= Math.max(y0, y1)) {
          const t = Math.abs(y1 - y0) < 1e-6 ? 0 : (y - y0) / (y1 - y0);
          return Math.abs(z0 + (z1 - z0) * t);
        }
      }
      return halfWidth;
    };
    for (let i = 0; i < Math.round(20 * detail); i++) {
      const x = dRng.range(xStart + 2, 26);
      const side = dRng.bool() ? -1 : 1;
      const y = dRng.range(0.4, 2.3);
      const s = dRng.range(0.14, 0.48);
      const g = new THREE.CircleGeometry(s, 7);
      g.applyMatrix4(
        placementMatrix({
          pos: [x, y, side * (wallZAt(y) - 0.015)],
          rot: [0, side > 0 ? Math.PI : 0, dRng.range(0, Math.PI)],
          scale: [1, dRng.range(0.6, 1.3), 1],
        }),
      );
      scorchParts.push(g);
    }
    const scorch = new THREE.Mesh(merge(scorchParts), scorchMat);
    scorch.name = 'Corridor_Scorch';
    this.root.add(scorch);

    // Loose conduit hanging from a damaged ceiling section.
    const conduit = new THREE.Mesh(
      merge([
        cyl(0.05, 0.05, 0.85, 6, { pos: [5.6, 2.52, 1.05], rot: [0.35, 0, 0.28] }),
        box(0.4, 0.08, 0.34, { pos: [5.45, 2.95, 0.98], rot: [0.18, 0, 0.36] }),
      ]),
      darkMechanical(),
    );
    this.root.add(conduit);
    this.anchors.sparkConduit = anchor(this.root, 'sparkConduit', 5.75, 2.12, 1.18);

    // ---- Navigation anchors ----------------------------------------------
    anchorInto(this.anchors, this.root, {
      breach: [xStart + 1.2, 0, 0],
      breachOuter: [xStart - 3.0, 0, 0],
      corridorMid: [14, 0, 0],
      defenceLine: [10.5, 0, 0],
      rebelFallback: [19, 0, 0],
      alcoveCentre: [(alc.x0 + alc.x1) / 2, 0, -halfWidth - alc.depth * 0.55],
      alcoveDoor: [(alc.x0 + alc.x1) / 2, 0, -halfWidth + 0.2],
      junctionCentre: [branchMid, 0, 0],
      branchMid: [branchMid, 0, halfWidth + 4],
      podBayCentre: [branchMid, 0, pb.roomZ - 0.6],
      aftEnd: [xEnd - 2, 0, 0],
      ceilingMid: [14, ceiling, 0],
    });
  }

  /** 0..1 red alert intensity. */
  setAlarm(v: number): void {
    this.alarmActive = v;
  }

  /** 0..1 cold Imperial rim light that accompanies Vader. */
  setVaderPresence(v: number, x: number): void {
    this.vaderFill.intensity = v * 26;
    this.vaderFill.position.x = x;
  }

  /** Cut the corridor lighting down as power fails. */
  setPowerLevel(v: number): void {
    for (const l of this.luminaires) l.base = 8.5 * v;
  }

  openPodHatch(open: boolean): void {
    this.podHatchDoor.visible = !open;
  }

  update(_dt: number, elapsed: number): void {
    for (const l of this.luminaires) {
      let value = l.base;
      if (l.damaged) {
        const n = Math.sin(elapsed * 13 + l.flickerSeed) * Math.sin(elapsed * 4.3 + l.flickerSeed * 2);
        value *= n > -0.35 ? 1 : 0.15;
      }
      l.light.intensity = value * (1 - this.alarmActive * 0.55);
    }
    const pulse = Math.max(0, Math.sin(elapsed * 3.4));
    const alarmValue = this.alarmActive * pulse;
    for (const s of this.alarmLights) {
      (s.material as THREE.MeshStandardMaterial).emissiveIntensity = 4.5 * alarmValue;
    }
    this.alarmPoint.intensity = alarmValue * 22;
    for (const c of this.consoles) c.update(elapsed);
  }
}

function anchor(parent: THREE.Object3D, name: string, x: number, y: number, z: number): THREE.Object3D {
  const o = new THREE.Object3D();
  o.name = `anchor:${name}`;
  o.position.set(x, y, z);
  parent.add(o);
  return o;
}

function anchorInto(
  target: Record<string, THREE.Object3D>,
  parent: THREE.Object3D,
  spec: Record<string, [number, number, number]>,
): void {
  for (const [name, [x, y, z]] of Object.entries(spec)) {
    target[name] = anchor(parent, name, x, y, z);
  }
}
