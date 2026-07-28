import * as THREE from 'three';
import type { IMaterialLibrary } from '../../core/Interfaces';
import { ellipseRing, loft } from './Loft';

/**
 * Ordnance.
 *
 * Four bodies, all built the same way — an ogive nose, a parallel mid-section
 * and a boat tail, with a cruciform tail assembly where there is one:
 *
 *  - `HEAVY`   a 2000 lb general-purpose bomb, 3.8 m by 0.46 m, used by the
 *              precision strike. Big enough that it reads as ordnance rather
 *              than as a dart even against the sky.
 *  - `LIGHT`   a 500 lb bomb, 2.2 m by 0.27 m, seven of which make the carpet.
 *              Fitted with a retarder — see below.
 *  - `CANISTER` the cluster dispenser: no fins to speak of, a smooth body, and
 *              a visible seam where it splits.
 *  - `TANK`    a finless napalm tank, blunt at both ends, which is what makes
 *              it recognisable at a glance as something other than a bomb.
 *
 * All four hang nose-forward along -Z, matching the aircraft, so a bomb on a
 * hardpoint needs no rotation of its own until it is released and starts to
 * tumble.
 *
 * ## The retarder
 *
 * A slick 500 lb bomb released level at seventy metres and ninety metres a
 * second is thrown three hundred metres and arrives on a twelve-degree slope.
 * Twelve degrees means that twenty metres short of the aim point the bomb is
 * four metres off the deck, so every carpet strike into a town with buildings
 * in it detonates half its stick against the sides of them. That is not a bug
 * in the simulation — it is the reason nobody drops slick bombs from low
 * level, and the reason the Mk 82 has had a retarded variant since 1964.
 *
 * So `LIGHT` carries one: four plates folded flat along the tail cone that
 * snap out into a cruciform air brake a quarter of a second after release.
 * `Ordnance` swaps the ballistic coefficient at the same instant. The bomb
 * loses most of its forward throw, arrives at about forty degrees and forty
 * metres a second, and the aircraft is two hundred metres clear when it goes
 * off. It is also, incidentally, much better to look at: the store visibly
 * decelerates, stands on its nose and falls away behind the flight.
 */

export const BombKind = {
  HEAVY: 0,
  LIGHT: 1,
  CANISTER: 2,
  TANK: 3,
  BOMBLET: 4,
} as const;

export type BombKindId = (typeof BombKind)[keyof typeof BombKind];

export class BombAssets {
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly ownedMaterials: THREE.Material[] = [];

  readonly bodies: THREE.BufferGeometry[] = [];
  readonly tails: Array<THREE.BufferGeometry | null> = [];
  /** Deployable air brakes, modelled open; the store scales them out of the tail. */
  readonly brakes: Array<THREE.BufferGeometry | null> = [];
  readonly shell: THREE.Material;
  readonly band: THREE.Material;
  readonly lengths: number[] = [];

  constructor(lib: IMaterialLibrary | undefined) {
    this.shell = this.metal(lib, 0x51553f, 0.62, 0.35);
    this.band = this.metal(lib, 0x8a5a24, 0.7, 0.2);

    this.bodies[BombKind.HEAVY] = this.own(buildBody(3.8, 0.23, 1.15, 0.62));
    this.tails[BombKind.HEAVY] = this.own(buildTail(0.62, 1.45, 0.42));
    this.lengths[BombKind.HEAVY] = 3.8;

    this.bodies[BombKind.LIGHT] = this.own(buildBody(2.24, 0.135, 1.1, 0.6));
    this.tails[BombKind.LIGHT] = this.own(buildTail(0.36, 0.86, 0.25));
    this.brakes[BombKind.LIGHT] = this.own(buildRetarder(1.34, 0.78, 0.5));
    this.lengths[BombKind.LIGHT] = 2.24;

    this.bodies[BombKind.CANISTER] = this.own(buildBody(2.5, 0.2, 0.75, 0.85));
    this.tails[BombKind.CANISTER] = this.own(buildTail(0.42, 0.72, 0.16));
    this.lengths[BombKind.CANISTER] = 2.5;

    this.bodies[BombKind.TANK] = this.own(buildTank(3.1, 0.32));
    this.tails[BombKind.TANK] = null;
    this.lengths[BombKind.TANK] = 3.1;

    this.bodies[BombKind.BOMBLET] = this.own(buildBody(0.34, 0.052, 0.9, 0.7));
    this.tails[BombKind.BOMBLET] = null;
    this.lengths[BombKind.BOMBLET] = 0.34;
  }

  private own<T extends THREE.BufferGeometry>(g: T): T {
    this.geometries.push(g);
    return g;
  }

  private metal(
    lib: IMaterialLibrary | undefined,
    color: number,
    roughness: number,
    metalness: number,
  ): THREE.Material {
    if (lib) {
      const mat = lib.forSize('metal_painted', 1.4) as THREE.MeshStandardMaterial;
      mat.color.setHex(color);
      mat.roughness = roughness;
      mat.metalness = metalness;
      return mat;
    }
    const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    this.ownedMaterials.push(mat);
    return mat;
  }

  /**
   * One store. Bodies, tails and brakes are shared; the group is not.
   *
   * The brake is returned folded — scaled flat against the tail cone — and
   * `OrdnanceField` opens it. It is the only part of a store that moves
   * relative to the body, so it is the only one that keeps its own matrix.
   */
  instantiate(kind: BombKindId, shadows: boolean): THREE.Group {
    const group = new THREE.Group();
    const body = new THREE.Mesh(this.bodies[kind], this.shell);
    body.castShadow = shadows;
    body.matrixAutoUpdate = false;
    body.updateMatrix();
    group.add(body);
    const tail = this.tails[kind];
    if (tail) {
      const fins = new THREE.Mesh(tail, this.shell);
      fins.castShadow = shadows;
      fins.matrixAutoUpdate = false;
      fins.updateMatrix();
      group.add(fins);
    }
    const brake = this.brakes[kind];
    if (brake) {
      const plates = new THREE.Mesh(brake, this.shell);
      plates.name = 'brake';
      plates.castShadow = false;
      plates.matrixAutoUpdate = false;
      plates.scale.set(0.02, 0.02, 1);
      plates.updateMatrix();
      group.add(plates);
    }
    group.matrixAutoUpdate = false;
    return group;
  }

  dispose(): void {
    for (const g of this.geometries) g.dispose();
    for (const m of this.ownedMaterials) m.dispose();
    this.geometries.length = 0;
    this.ownedMaterials.length = 0;
  }
}

/* ------------------------------- geometry -------------------------------- */

/**
 * An ogive-nosed body along -Z.
 *
 * `nosePart` and `tailPart` are the fractions of the length taken by the ogive
 * and the boat tail; the remainder is parallel mid-section. A bomb with no
 * parallel section is a cone, and a bomb with no boat tail is a tin can.
 */
function buildBody(
  length: number,
  radius: number,
  noseCalibres: number,
  tailFraction: number,
): THREE.BufferGeometry {
  const rings: Float32Array[] = [];
  const count = 14;
  const noseLength = radius * 2 * noseCalibres;
  const tailLength = radius * 2 * tailFraction;
  const nose = -length * 0.5;
  const tail = length * 0.5;

  const steps = 7;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    // Tangent ogive: the profile a real bomb nose actually is.
    const r = radius * Math.sqrt(Math.max(0, t) * (2 - t) * 0.72 + t * t * 0.28);
    rings.push(ellipseRing(count, nose + noseLength * t, 0, r, r, r, 2));
  }
  rings.push(ellipseRing(count, tail - tailLength, 0, radius, radius, radius, 2));
  rings.push(ellipseRing(count, tail, 0, radius * 0.78, radius * 0.78, radius * 0.78, 2));

  return loft(rings, { noseTip: [0, 0, nose], capTail: true, uvScale: 0.6 });
}

/** A blunt, finless tank: napalm, and unmistakable for anything else. */
function buildTank(length: number, radius: number): THREE.BufferGeometry {
  const rings: Float32Array[] = [];
  const count = 14;
  const profile: Array<[number, number]> = [
    [-0.5, 0.34],
    [-0.44, 0.62],
    [-0.34, 0.85],
    [-0.2, 0.97],
    [0.0, 1.0],
    [0.2, 0.98],
    [0.34, 0.9],
    [0.44, 0.72],
    [0.5, 0.44],
  ];
  for (const [t, r] of profile) {
    rings.push(ellipseRing(count, t * length, 0, r * radius, r * radius, r * radius, 2));
  }
  return loft(rings, {
    noseTip: [0, 0, -length * 0.52],
    tailTip: [0, 0, length * 0.52],
    uvScale: 0.6,
  });
}

/**
 * The air brake, modelled open.
 *
 * Four plates hinged at the aft end of the tail cone and raked forward into
 * the airflow, so from the side the store reads as a dart with a shuttlecock
 * on the back of it. The whole assembly is scaled about the body axis to
 * deploy: at 0.02 the plates are folded into the skin and invisible, at 1 they
 * are out. Scaling rather than hinging keeps it to one matrix write a frame
 * and costs nothing, because a plate a metre long seen for two seconds at
 * two hundred metres does not need a hinge line.
 */
function buildRetarder(span: number, chord: number, offset: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const half = span * 0.5;
  const root = offset;

  const pushPlate = (ax: number, ay: number): void => {
    const base = positions.length / 3;
    // Hinged at the tail and raked *forward* — the plate leans into the
    // airflow, which is why it works and why the silhouette is unmistakable.
    positions.push(
      ax * 0.1, ay * 0.1, root + chord,
      ax * half, ay * half, root + chord * 0.86,
      ax * half, ay * half, root - chord * 0.12,
      ax * 0.1, ay * 0.1, root + chord * 0.2,
    );
    uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
  };

  // Rotated forty-five degrees off the tail fins so the two assemblies read as
  // separate things rather than as one thick fin.
  const s = Math.SQRT1_2;
  pushPlate(s, s);
  pushPlate(-s, s);
  pushPlate(s, -s);
  pushPlate(-s, -s);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * A cruciform tail: four fins in a box, which is what a real conical fin
 * assembly looks like from any angle that matters.
 */
function buildTail(span: number, chord: number, offset: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const half = span * 0.5;
  const zRoot = offset;
  const zTip = offset + chord;

  const pushFin = (ax: number, ay: number): void => {
    const base = positions.length / 3;
    // Root at the body, tip swept back: leading edge raked, trailing square.
    positions.push(
      ax * 0.12, ay * 0.12, zRoot,
      ax * half, ay * half, zRoot + chord * 0.32,
      ax * half, ay * half, zTip,
      ax * 0.12, ay * 0.12, zTip,
    );
    uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    // The other face, wound the opposite way: a fin is a plate seen from both
    // sides and back-face culling would make half the tail vanish in a bank.
    indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
  };

  pushFin(1, 0);
  pushFin(-1, 0);
  pushFin(0, 1);
  pushFin(0, -1);

  // The conical shroud that ties the four fins together at their tips.
  const shroudBase = positions.length / 3;
  const count = 16;
  for (let ring = 0; ring < 2; ring++) {
    const z = ring === 0 ? zTip - chord * 0.28 : zTip;
    const r = half * (ring === 0 ? 0.92 : 0.86);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      positions.push(Math.cos(a) * r, Math.sin(a) * r, z);
      uvs.push(i / count, ring);
    }
  }
  for (let i = 0; i < count; i++) {
    const i1 = (i + 1) % count;
    const a = shroudBase + i;
    const b = shroudBase + i1;
    const c = shroudBase + count + i1;
    const d = shroudBase + count + i;
    indices.push(a, b, c, a, c, d, a, c, b, a, d, c);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}
