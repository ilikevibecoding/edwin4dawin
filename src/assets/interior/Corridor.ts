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
import { consoleScreenMap, scorchMarkMap } from '../textures';
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

/** Clear height of the alcove and junction openings cut into the side walls. */
const OPENING_HEIGHT = 2.45;

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
      // V is the height above the deck, not the profile index: the shell
      // shader darkens the lower wall from it, and every run — including the
      // short crown strip — has to agree on what "low" means.
      uvs.push(xs[s] * uvRepeat, profile[i][0] / CORRIDOR.ceiling);
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

/**
 * Same cross-section extruded along Z instead, centred on `xCentre`.
 * Used for the pod-bay branch that leaves the main run at the junction.
 */
function ribbonAlongZ(
  profile: Array<[number, number]>,
  z0: number,
  z1: number,
  xCentre: number,
  flip = false,
  uvRepeat = 0.25,
): THREE.BufferGeometry {
  const n = profile.length;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const zs = [z0, z1];
  for (let s = 0; s < 2; s++) {
    for (let i = 0; i < n; i++) {
      positions.push(xCentre + profile[i][1], profile[i][0], zs[s]);
      uvs.push(zs[s] * uvRepeat, profile[i][0] / CORRIDOR.ceiling);
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

/**
 * Portion of a cross-section at or above `yMin`, with an interpolated point
 * inserted exactly on the boundary. Openings are cut out of the lower wall
 * only: without the arch above them the camera can see straight out of the
 * ship through the top of the doorway.
 */
function profileAbove(profile: Array<[number, number]>, yMin: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < profile.length; i++) {
    const [y, z] = profile[i];
    const prev = profile[i - 1];
    if (prev && (prev[0] < yMin) !== (y < yMin)) {
      const t = (yMin - prev[0]) / (y - prev[0]);
      out.push([yMin, prev[1] + (z - prev[1]) * t]);
    }
    if (y >= yMin) out.push([y, z]);
  }
  return out;
}

/**
 * |Z| of the shell at a given height, so wall furniture and scorch marks sit on
 * the real curve instead of a straight line the profile never follows.
 */
function wallZAt(y: number): number {
  for (let i = 0; i < PROFILE.length - 1; i++) {
    const [y0, z0] = PROFILE[i];
    const [y1, z1] = PROFILE[i + 1];
    if (z0 > 0 || z1 > 0) continue;
    if (y >= Math.min(y0, y1) && y <= Math.max(y0, y1)) {
      const t = Math.abs(y1 - y0) < 1e-6 ? 0 : (y - y0) / (y1 - y0);
      return Math.abs(z0 + (z1 - z0) * t);
    }
  }
  return CORRIDOR.halfWidth;
}

/** Height of the crown of the shell at a given |Z|, for ceiling furniture. */
function wallCeilingAt(z: number): number {
  const a = Math.abs(z);
  let best: number = CORRIDOR.ceiling;
  for (let i = 0; i < PROFILE.length - 1; i++) {
    const [y0, z0] = PROFILE[i];
    const [y1, z1] = PROFILE[i + 1];
    if (y0 < 2.5 || y1 < 2.5) continue;
    const a0 = Math.abs(z0);
    const a1 = Math.abs(z1);
    if (a >= Math.min(a0, a1) && a <= Math.max(a0, a1)) {
      const t = Math.abs(a1 - a0) < 1e-6 ? 0 : (a - a0) / (a1 - a0);
      best = Math.min(best, y0 + (y1 - y0) * t);
    }
  }
  return best;
}

/** Inward tilt of the shell at a given height, in radians about X. */
function wallTiltAt(y: number): number {
  const h = 0.12;
  return Math.atan2(wallZAt(y + h) - wallZAt(y - h), 2 * h);
}

export interface CorridorOptions {
  detail?: number;
  lights?: number;
}

interface Luminaire {
  light: THREE.PointLight;
  /** Current target intensity (scaled by power level). */
  base: number;
  /** Intensity at full power. */
  full: number;
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
  private vaderRim: THREE.PointLight;
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
    // -Z side, split by the alcove; the arch above the opening is retained.
    wallRuns.push(ribbonAlongX(negProfile, xStart, CORRIDOR.alcove.x0));
    wallRuns.push(ribbonAlongX(negProfile, CORRIDOR.alcove.x1, xEnd));
    wallRuns.push(
      ribbonAlongX(profileAbove(negProfile, OPENING_HEIGHT), CORRIDOR.alcove.x0, CORRIDOR.alcove.x1),
    );
    // +Z side, split by the junction.
    wallRuns.push(ribbonAlongX(posProfile, xStart, CORRIDOR.junction.x0));
    wallRuns.push(ribbonAlongX(posProfile, CORRIDOR.junction.x1, xEnd));
    wallRuns.push(
      ribbonAlongX(
        profileAbove(posProfile, OPENING_HEIGHT),
        CORRIDOR.junction.x0,
        CORRIDOR.junction.x1,
      ),
    );
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
    // Lintels and jambs finishing both openings.
    const openingZ = wallZAt(OPENING_HEIGHT);
    for (const [x0, x1, side] of [
      [alc.x0, alc.x1, -1],
      [jn.x0, jn.x1, 1],
    ] as Array<[number, number, number]>) {
      const mid = (x0 + x1) / 2;
      returns.push(
        box(x1 - x0 + 0.36, 0.22, 0.34, { pos: [mid, OPENING_HEIGHT - 0.11, side * (openingZ - 0.1)] }),
        box(0.18, OPENING_HEIGHT, 0.34, { pos: [x0 - 0.09, OPENING_HEIGHT / 2, side * (openingZ - 0.1)] }),
        box(0.18, OPENING_HEIGHT, 0.34, { pos: [x1 + 0.09, OPENING_HEIGHT / 2, side * (openingZ - 0.1)] }),
      );
    }
    const returnMesh = new THREE.Mesh(merge(returns), bulkhead());
    returnMesh.name = 'Corridor_Returns';
    // Deliberately not a shadow caster: the interior key comes down through the
    // (non-casting) shell, so casting from the returns would drop hard bands
    // across the deck from geometry the camera never sees.
    returnMesh.castShadow = false;
    returnMesh.receiveShadow = true;
    this.root.add(returnMesh);

    // Branch corridor uses the same cross-section, extruded along Z.
    const branchWalls = merge([
      ribbonAlongZ(negProfile, halfWidth, pb.roomZ - pb.roomHalf, branchMid, true),
      ribbonAlongZ(posProfile, halfWidth, pb.roomZ - pb.roomHalf, branchMid, true),
    ]);
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

    // Wall panels, two per module per side. A shallow raised border around a
    // plate that sits almost flush reads as a recessed inset under grazing
    // light; a single proud slab reads as a dark rectangle stuck to the wall.
    const PANEL_Y = 1.42;
    const panelGeo = merge([
      // Border frame, four thin strips standing 4 cm proud of the shell.
      box(1.52, 0.06, 0.04, { pos: [0, 0.57, 0.02] }),
      box(1.52, 0.06, 0.04, { pos: [0, -0.57, 0.02] }),
      box(0.06, 1.2, 0.04, { pos: [0.73, 0, 0.02] }),
      box(0.06, 1.2, 0.04, { pos: [-0.73, 0, 0.02] }),
      // Face plate, only 1 cm proud, so the frame overhangs it.
      box(1.44, 1.12, 0.012, { pos: [0, 0, 0.006] }),
      // A single seam and a small latch box for silhouette interest.
      box(1.44, 0.014, 0.018, { pos: [0, 0.12, 0.014] }),
      box(0.13, 0.13, 0.035, { pos: [0.5, -0.36, 0.02] }),
    ]);
    const panelCount = moduleCount * 2;
    const panels = new THREE.InstancedMesh(panelGeo, corridorTrim(), panelCount);
    panels.name = 'Corridor_Panels';
    panels.receiveShadow = true;
    const panelZ = wallZAt(PANEL_Y);
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
            pos: [x, PANEL_Y, side * panelZ],
            rot: [side * wallTiltAt(PANEL_Y), side > 0 ? Math.PI : 0, 0],
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
    const lums = new THREE.InstancedMesh(lumGeo, emissive('corridorLight', 0xf6f0e4, 0.85), moduleCount);
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
      const light = new THREE.PointLight(0xf5eee1, 3.0, 14, 1.8);
      light.position.set(x, ceiling - 0.35, 0);
      light.castShadow = false;
      this.root.add(light);
      this.luminaires.push({
        light,
        base: 3.0,
        full: 3.0,
        x,
        flickerSeed: rng.range(0, 100),
        damaged: rng.bool(0.22),
      });
    }
    // Two lights for the pod bay and one for the alcove.
    for (const [lx, lz, colour] of [
      [branchMid, pb.roomZ, 0xf5eee1],
      [branchMid, halfWidth + 3.5, 0xf5eee1],
      [(alc.x0 + alc.x1) / 2, -halfWidth - alc.depth * 0.5, 0xeef1f6],
    ] as Array<[number, number, number]>) {
      const light = new THREE.PointLight(colour, 2.8, 13, 1.8);
      light.position.set(lx, ceiling - 0.4, lz);
      this.root.add(light);
      this.luminaires.push({ light, base: 2.8, full: 2.8, x: lx, flickerSeed: rng.range(0, 100), damaged: false });
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
      emissive('corridorLight', 0xf6f0e4, 0.85),
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
    midConsole.root.position.set(6.6, 0, halfWidth - 0.2);
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
    const alarmHousings: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 6; i++) {
      const x = xStart + 5 + i * 6.5;
      const strip = new THREE.Mesh(
        box(0.34, 0.1, 0.05, { pos: [0, 0, 0] }),
        emissive('corridorAlarm', 0xff3a24, 0),
      );
      strip.position.set(x, 2.45, halfWidth - 0.12);
      this.root.add(strip);
      this.alarmLights.push(strip);
      // Recessed shroud, so the lamp reads as a fitting instead of a glowing
      // rectangle floating on a white wall.
      alarmHousings.push(
        box(0.46, 0.2, 0.14, { pos: [x, 2.45, halfWidth - 0.05] }),
        box(0.5, 0.05, 0.2, { pos: [x, 2.56, halfWidth - 0.09] }),
      );
    }
    const alarmShroud = new THREE.Mesh(merge(alarmHousings), darkMechanical());
    alarmShroud.castShadow = false;
    this.root.add(alarmShroud);
    // Local spill only. A long-range red light turns the whole white corridor
    // pink, which reads as a colour-grading mistake rather than as an alarm,
    // and a bright lamp pressed against the wall just burns a hole in it.
    this.alarmPoint = new THREE.PointLight(0xff3a22, 0, 8, 2);
    this.alarmPoint.position.set(14, 2.25, halfWidth - 0.75);
    this.root.add(this.alarmPoint);

    // Cold lights that rise when Vader enters: one ahead of him so the mask
    // reads, one behind for the halo that separates him from the corridor.
    this.vaderFill = new THREE.PointLight(0x6f92d8, 0, 22, 1.7);
    this.vaderFill.position.set(0, 2.2, 0);
    this.root.add(this.vaderFill);
    this.vaderRim = new THREE.PointLight(0x8fb6ff, 0, 20, 1.8);
    this.vaderRim.position.set(0, 2.4, 0);
    this.root.add(this.vaderRim);

    // ---- Battle damage dressing -------------------------------------------
    // Feathered alpha rather than a hard disc: a solid dark polygon on a white
    // wall reads as a sticker, not as heat damage.
    const scorchMat = new THREE.MeshStandardMaterial({
      color: 0x2b2622,
      map: scorchMarkMap(),
      alphaMap: scorchMarkMap(),
      roughness: 0.95,
      metalness: 0,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const scorchParts: THREE.BufferGeometry[] = [];
    const dRng = rng.fork('corridor-damage');
    for (let i = 0; i < Math.round(20 * detail); i++) {
      const x = dRng.range(xStart + 2, 26);
      const side = dRng.bool() ? -1 : 1;
      const y = dRng.range(0.55, 2.15);
      const s = dRng.range(0.12, 0.32);
      const g = new THREE.PlaneGeometry(s * 2, s * 2);
      g.applyMatrix4(
        placementMatrix({
          pos: [x, y, side * (wallZAt(y) - 0.012)],
          rot: [side * wallTiltAt(y), side > 0 ? Math.PI : 0, dRng.range(0, Math.PI)],
          scale: [1, dRng.range(0.6, 1.3), 1],
        }),
      );
      scorchParts.push(g);
    }
    const scorch = new THREE.Mesh(merge(scorchParts), scorchMat);
    scorch.name = 'Corridor_Scorch';
    scorch.renderOrder = 1;
    this.root.add(scorch);

    // A ceiling panel dropped off one edge, with the loom behind it sagging out
    // of the gap. The hinge, the strut and the recess all have to be visible or
    // the conduit reads as a prop floating in mid-air.
    const conduitZ = 0.62;
    const panelY = wallCeilingAt(conduitZ);
    const conduit = new THREE.Mesh(
      merge([
        // Dark recess behind the dropped panel.
        box(0.78, 0.05, 0.6, { pos: [5.5, panelY - 0.03, conduitZ] }),
        // Hinge bar along the inboard edge.
        cyl(0.028, 0.028, 0.8, 8, { pos: [5.5, panelY - 0.07, conduitZ - 0.3], rot: [0, 0, Math.PI / 2] }),
        // Strut holding the far edge a hand's width clear of the ceiling.
        box(0.05, 0.2, 0.05, { pos: [5.16, panelY - 0.15, conduitZ - 0.24] }),
        // Loom sagging out of the recess and back up to the wall.
        cyl(0.042, 0.042, 0.62, 6, { pos: [5.62, panelY - 0.34, conduitZ + 0.12], rot: [0.5, 0, 0.34] }),
        cyl(0.034, 0.034, 0.52, 6, { pos: [5.78, panelY - 0.52, conduitZ + 0.44], rot: [-0.6, 0, 0.2] }),
      ]),
      darkMechanical(),
    );
    this.root.add(conduit);
    // The panel itself, hanging down from the hinge.
    const droppedPanel = new THREE.Mesh(
      box(0.76, 0.05, 0.58, { pos: [0, 0, 0] }),
      corridorTrim(),
    );
    droppedPanel.position.set(5.5, panelY - 0.16, conduitZ + 0.02);
    droppedPanel.rotation.x = -0.42;
    droppedPanel.castShadow = false;
    this.root.add(droppedPanel);
    this.anchors.sparkConduit = anchor(this.root, 'sparkConduit', 5.7, panelY - 0.62, conduitZ + 0.42);

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
    // He walks toward +X with the camera ahead of him, so the fill has to sit
    // down-corridor of him. A lamp at his own position lights the walls and
    // leaves the mask — the one thing the shot is about — in shadow.
    this.vaderFill.intensity = v * 6.5;
    this.vaderFill.position.set(x + 3.3, 2.15, 0.4);
    this.vaderRim.intensity = v * 5.5;
    this.vaderRim.position.set(x - 2.6, 2.45, -0.35);
  }

  /** Cut the corridor lighting down as power fails. */
  setPowerLevel(v: number): void {
    for (const l of this.luminaires) l.base = l.full * v;
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
      l.light.intensity = value * (1 - this.alarmActive * 0.22);
    }
    const pulse = Math.max(0, Math.sin(elapsed * 3.4));
    const alarmValue = this.alarmActive * pulse;
    for (const s of this.alarmLights) {
      (s.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.35 * alarmValue;
    }
    this.alarmPoint.intensity = alarmValue * 3.2;
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
