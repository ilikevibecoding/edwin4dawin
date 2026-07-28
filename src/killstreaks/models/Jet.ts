import * as THREE from 'three';
import type { IMaterialLibrary } from '../../core/Interfaces';
import { airfoilRing, ellipseRing, loft, mirrorX } from './Loft';

/**
 * The strike aircraft.
 *
 * A twin-engine, twin-tail cranked-delta in the F/A-18E family: 17.6 m long,
 * 12.4 m across, 3.4 m to the top of the fins. The proportions matter more than
 * the part count, because scale is the only thing the eye has to go on when the
 * aircraft is a silhouette at three hundred metres — an airframe drawn a third
 * too small passes over a two-storey building looking like a model aeroplane,
 * and no amount of afterburner rescues it.
 *
 * What is modelled, and why each part earns its triangles:
 *
 *  - A lofted fuselage with a real cross-section: chined at the nose, widest
 *    and flat-bottomed through the wing root, tapering into the engine bay.
 *    This is the single biggest difference between an aircraft and a dart.
 *  - A dark dielectric radome, the strongest recognition cue at distance after
 *    the planform itself.
 *  - A raised bubble canopy with a coated, near-mirror finish, sunk into the
 *    spine so it reads as part of the fuselage rather than a bump on it.
 *  - Rectangular side intakes with a raked lip standing off the fuselage, and
 *    a genuinely open duct behind — a black hole in the shoulder that the eye
 *    reads immediately as an inlet.
 *  - A cranked-delta wing with a leading-edge root extension, built from NACA
 *    sections so it has a round nose and a sharp trailing edge in silhouette,
 *    with four degrees of anhedral.
 *  - Canted twin fins and all-moving stabilators.
 *  - Two afterburner cans with petal ribbing, a heat-stained finish, and an
 *    interior that is a hole rather than a cap.
 *  - Six wing pylons and a centreline station, which is where the ordnance
 *    hangs — and where it visibly is not, once it has been released.
 *
 * Geometry and materials are built once and shared across every aircraft in
 * the pool; only the anchor objects are per-instance.
 */

export interface JetInstance {
  root: THREE.Group;
  /** Afterburner attachment points, at the nozzle exit plane. */
  nozzles: THREE.Object3D[];
  /** Emissive discs inside the cans, brightened with the throttle. */
  nozzleGlow: THREE.Mesh[];
  /** Ordnance stations, outer pair first so a ripple empties the wings inward. */
  hardpoints: THREE.Object3D[];
  /** Wingtips, where the vortex cores are shed. */
  wingtips: THREE.Object3D[];
  /** Under the tail, where the belly trail is shed in humid air. */
  spine: THREE.Object3D;
}

const RING = 18;
const WING_RING = 16;

/** x, hardpoint y, z. Outer stations first. */
const STATIONS: Array<[number, number, number]> = [
  [-4.55, -0.94, 1.05],
  [4.55, -0.94, 1.05],
  [-3.35, -0.83, 0.72],
  [3.35, -0.83, 0.72],
  [-2.25, -0.78, 0.35],
  [2.25, -0.78, 0.35],
  [0, -1.4, 0.9],
];

/**
 * Metres either side of the centreline that a ripple release actually covers.
 *
 * A stick is not a line. The stores leave alternating wings, so seven of them
 * land in a zigzag nine metres wide, and anything that sites a run-in by
 * probing the centreline alone will happily route it down a lane with a wall
 * four metres to the left of it. This is the number that has to fit.
 */
export const STATION_SPREAD = STATIONS.reduce((m, s) => Math.max(m, Math.abs(s[0])), 0);

export class JetAssets {
  private readonly geometries: THREE.BufferGeometry[] = [];
  /** Only materials this class created itself; library clones are its to free. */
  private readonly ownedMaterials: THREE.Material[] = [];
  private readonly shadows: boolean;

  readonly skin: THREE.Material;
  readonly dark: THREE.Material;
  readonly glass: THREE.Material;
  readonly hot: THREE.Material;
  readonly ember: THREE.MeshBasicMaterial;
  readonly cavity: THREE.MeshBasicMaterial;

  private readonly body: THREE.BufferGeometry;
  private readonly radome: THREE.BufferGeometry;
  private readonly canopy: THREE.BufferGeometry;
  private readonly intakeL: THREE.BufferGeometry;
  private readonly intakeR: THREE.BufferGeometry;
  private readonly ductL: THREE.BufferGeometry;
  private readonly ductR: THREE.BufferGeometry;
  private readonly wingL: THREE.BufferGeometry;
  private readonly wingR: THREE.BufferGeometry;
  private readonly finL: THREE.BufferGeometry;
  private readonly finR: THREE.BufferGeometry;
  private readonly stabL: THREE.BufferGeometry;
  private readonly stabR: THREE.BufferGeometry;
  private readonly strakeL: THREE.BufferGeometry;
  private readonly strakeR: THREE.BufferGeometry;
  private readonly can: THREE.BufferGeometry;
  private readonly canInner: THREE.BufferGeometry;
  private readonly glowDisc: THREE.BufferGeometry;
  private readonly pylon: THREE.BufferGeometry;
  private readonly probe: THREE.BufferGeometry;

  constructor(lib: IMaterialLibrary | undefined, shadows: boolean) {
    this.shadows = shadows;

    this.body = this.own(buildFuselage());
    this.radome = this.own(buildRadome());
    this.canopy = this.own(buildCanopy());
    this.intakeR = this.own(buildIntake());
    this.intakeL = this.own(mirrorX(this.intakeR));
    this.ductR = this.own(buildDuct());
    this.ductL = this.own(mirrorX(this.ductR));
    this.wingR = this.own(buildWing());
    this.wingL = this.own(mirrorX(this.wingR));
    this.finR = this.own(buildFin());
    this.finL = this.own(mirrorX(this.finR));
    this.stabR = this.own(buildStabilator());
    this.stabL = this.own(mirrorX(this.stabR));
    this.strakeR = this.own(buildVentralStrake());
    this.strakeL = this.own(mirrorX(this.strakeR));
    this.can = this.own(buildNozzle());
    this.canInner = this.own(buildNozzleInner());
    this.glowDisc = this.own(new THREE.CircleGeometry(0.36, 20));
    this.pylon = this.own(buildPylon());
    const probe = new THREE.CylinderGeometry(0.042, 0.024, 0.9, 6);
    probe.rotateX(Math.PI / 2);
    this.probe = this.own(probe);

    this.skin = this.metal(lib, 0x7a8188, 0.5, 0.55, 3.2);
    this.dark = this.metal(lib, 0x23272c, 0.72, 0.12, 2.2);
    this.hot = this.metal(lib, 0x3d352c, 0.45, 0.85, 1.4);
    this.glass = this.canopyMaterial(lib);
    this.cavity = this.keep(new THREE.MeshBasicMaterial({ color: 0x05070a }));
    this.ember = this.keep(new THREE.MeshBasicMaterial({ color: 0x140b05, toneMapped: false }));
  }

  private own<T extends THREE.BufferGeometry>(g: T): T {
    this.geometries.push(g);
    return g;
  }

  private keep<T extends THREE.Material>(m: T): T {
    this.ownedMaterials.push(m);
    return m;
  }

  private metal(
    lib: IMaterialLibrary | undefined,
    color: number,
    roughness: number,
    metalness: number,
    tileMetres: number,
  ): THREE.Material {
    if (lib) {
      const mat = lib.forSize('metal_painted', tileMetres) as THREE.MeshStandardMaterial;
      mat.color.setHex(color);
      mat.roughness = roughness;
      mat.metalness = metalness;
      // The library's maps carry street grime; an airframe wants far less.
      mat.normalScale?.set(0.3, 0.3);
      return mat;
    }
    return this.keep(new THREE.MeshStandardMaterial({ color, roughness, metalness }));
  }

  private canopyMaterial(lib: IMaterialLibrary | undefined): THREE.Material {
    if (lib) {
      const mat = lib.clone('glass') as THREE.MeshPhysicalMaterial;
      // A gold-coated canopy: dark, and almost entirely a reflection of the sky.
      mat.color.setHex(0x1b2729);
      mat.roughness = 0.07;
      mat.metalness = 0.94;
      mat.transparent = false;
      mat.opacity = 1;
      mat.envMapIntensity = 2.4;
      return mat;
    }
    return this.keep(
      new THREE.MeshStandardMaterial({ color: 0x1b2729, roughness: 0.07, metalness: 0.94 }),
    );
  }

  /** One aircraft. Geometry and materials are shared; anchors are not. */
  instantiate(name: string): JetInstance {
    const root = new THREE.Group();
    root.name = name;

    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, shadow = true): THREE.Mesh => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = shadow && this.shadows;
      mesh.receiveShadow = false;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      root.add(mesh);
      return mesh;
    };

    add(this.body, this.skin);
    add(this.radome, this.dark);
    add(this.wingL, this.skin);
    add(this.wingR, this.skin);
    add(this.intakeL, this.skin);
    add(this.intakeR, this.skin);
    add(this.ductL, this.cavity, false);
    add(this.ductR, this.cavity, false);
    add(this.finL, this.skin);
    add(this.finR, this.skin);
    add(this.stabL, this.skin);
    add(this.stabR, this.skin);
    add(this.strakeL, this.dark, false);
    add(this.strakeR, this.dark, false);
    add(this.canopy, this.glass);

    const probe = add(this.probe, this.dark, false);
    probe.position.set(0, -0.06, -9.3);
    probe.updateMatrix();

    const nozzles: THREE.Object3D[] = [];
    const nozzleGlow: THREE.Mesh[] = [];
    for (const side of [-1, 1]) {
      const can = add(this.can, this.hot);
      can.position.set(side * 0.5, -0.02, 0);
      can.updateMatrix();
      const inner = add(this.canInner, this.cavity, false);
      inner.position.copy(can.position);
      inner.updateMatrix();

      const glow = new THREE.Mesh(this.glowDisc, this.ember);
      glow.position.set(side * 0.5, -0.02, 9.1);
      glow.rotation.y = Math.PI;
      glow.matrixAutoUpdate = false;
      glow.updateMatrix();
      root.add(glow);
      nozzleGlow.push(glow);

      const anchor = new THREE.Object3D();
      anchor.position.set(side * 0.5, -0.02, 9.32);
      anchor.matrixAutoUpdate = false;
      anchor.updateMatrix();
      root.add(anchor);
      nozzles.push(anchor);
    }

    const hardpoints: THREE.Object3D[] = [];
    for (const [x, y, z] of STATIONS) {
      const pylon = add(this.pylon, this.dark, false);
      pylon.position.set(x, y + 0.36, z);
      pylon.updateMatrix();
      const anchor = new THREE.Object3D();
      anchor.position.set(x, y, z);
      anchor.matrixAutoUpdate = false;
      anchor.updateMatrix();
      root.add(anchor);
      hardpoints.push(anchor);
    }

    const wingtips: THREE.Object3D[] = [];
    for (const side of [-1, 1]) {
      const tip = new THREE.Object3D();
      tip.position.set(side * 6.1, -0.46, 1.9);
      tip.matrixAutoUpdate = false;
      tip.updateMatrix();
      root.add(tip);
      wingtips.push(tip);
    }

    const spine = new THREE.Object3D();
    spine.position.set(0, -0.55, 2.4);
    spine.matrixAutoUpdate = false;
    spine.updateMatrix();
    root.add(spine);

    root.matrixAutoUpdate = false;
    return { root, nozzles, nozzleGlow, hardpoints, wingtips, spine };
  }

  dispose(): void {
    for (const g of this.geometries) g.dispose();
    for (const m of this.ownedMaterials) m.dispose();
    this.geometries.length = 0;
    this.ownedMaterials.length = 0;
  }
}

/* ------------------------------- geometry -------------------------------- */

/** (z, centre y, half width, half up, half down, superellipse power). */
type Section = [number, number, number, number, number, number];

const FUSELAGE: Section[] = [
  [-6.6, -0.06, 0.6, 0.5, 0.54, 3.1],
  [-5.6, -0.03, 0.74, 0.56, 0.62, 3.3],
  [-4.4, 0.0, 0.88, 0.6, 0.7, 3.5],
  [-3.0, 0.0, 1.0, 0.62, 0.78, 3.7],
  [-1.4, 0.01, 1.12, 0.66, 0.86, 4.1],
  [0.3, 0.02, 1.2, 0.7, 0.9, 4.3],
  [2.0, 0.03, 1.2, 0.72, 0.88, 4.3],
  [3.6, 0.04, 1.14, 0.7, 0.82, 4.1],
  [5.2, 0.04, 1.04, 0.66, 0.72, 3.9],
  [6.6, 0.03, 0.96, 0.6, 0.62, 3.5],
  [7.8, 0.0, 0.9, 0.55, 0.55, 3.1],
  [8.6, -0.02, 0.86, 0.52, 0.52, 2.9],
];

const RADOME: Section[] = [
  [-8.5, -0.1, 0.16, 0.14, 0.14, 2.3],
  [-8.1, -0.09, 0.28, 0.25, 0.26, 2.4],
  [-7.5, -0.08, 0.42, 0.36, 0.4, 2.6],
  [-7.0, -0.07, 0.52, 0.44, 0.48, 2.9],
  [-6.6, -0.06, 0.6, 0.5, 0.54, 3.1],
];

function sectionsToRings(sections: Section[]): Float32Array[] {
  return sections.map((s) => ellipseRing(RING, s[0], s[1], s[2], s[3], s[4], s[5]));
}

function buildFuselage(): THREE.BufferGeometry {
  return loft(sectionsToRings(FUSELAGE), { capTail: true, uvScale: 2.4 });
}

function buildRadome(): THREE.BufferGeometry {
  return loft(sectionsToRings(RADOME), { noseTip: [0, -0.11, -8.95], uvScale: 2.0 });
}

/** The bubble, sunk into the spine so its lower half never shows. */
function buildCanopy(): THREE.BufferGeometry {
  const sections: Section[] = [
    [-6.5, 0.42, 0.22, 0.1, 0.5, 2.6],
    [-6.0, 0.44, 0.42, 0.28, 0.5, 2.8],
    [-5.3, 0.46, 0.56, 0.44, 0.5, 3.0],
    [-4.4, 0.48, 0.62, 0.52, 0.5, 3.1],
    [-3.5, 0.5, 0.6, 0.48, 0.5, 3.0],
    [-2.7, 0.52, 0.5, 0.36, 0.5, 2.8],
    [-2.1, 0.54, 0.36, 0.2, 0.5, 2.6],
  ];
  return loft(sectionsToRings(sections), {
    noseTip: [0, 0.44, -6.85],
    tailTip: [0, 0.5, -1.7],
    uvScale: 1.6,
  });
}

/**
 * A side intake with a raked lip. The first two rings are close together on
 * purpose: without a distinct rim the duct behind it reads as a black
 * rectangle painted on the shoulder.
 */
function buildIntake(): THREE.BufferGeometry {
  const rings: Float32Array[] = [];
  const stations: Array<[number, number, number, number, number]> = [
    // z, centre x, centre y, half width, half height
    [-3.9, 1.28, -0.46, 0.34, 0.4],
    [-3.55, 1.3, -0.46, 0.36, 0.42],
    [-2.6, 1.34, -0.44, 0.38, 0.44],
    [-1.2, 1.36, -0.4, 0.4, 0.46],
    [0.4, 1.34, -0.34, 0.38, 0.44],
    [1.8, 1.24, -0.28, 0.32, 0.4],
  ];
  for (const [z, cx, cy, hw, hh] of stations) {
    const ring = ellipseRing(12, z, cy, hw, hh, hh, 5.5);
    for (let i = 0; i < 12; i++) ring[i * 3] += cx;
    rings.push(ring);
  }
  return loft(rings, { capTail: true, uvScale: 1.6 });
}

/** The hole. A short tube recessed behind the lip, drawn inside-out and black. */
function buildDuct(): THREE.BufferGeometry {
  const rings: Float32Array[] = [];
  const stations: Array<[number, number, number, number, number]> = [
    [-3.62, 1.3, -0.46, 0.28, 0.34],
    [-3.1, 1.31, -0.45, 0.26, 0.32],
    [-2.2, 1.32, -0.44, 0.22, 0.27],
    [-1.4, 1.32, -0.43, 0.14, 0.18],
  ];
  for (const [z, cx, cy, hw, hh] of stations) {
    const ring = ellipseRing(12, z, cy, hw, hh, hh, 5.0);
    for (let i = 0; i < 12; i++) ring[i * 3] += cx;
    rings.push(ring);
  }
  return loft(rings, { capTail: true, flip: true, uvScale: 1.0 });
}

/**
 * Cranked delta with a leading-edge root extension.
 *
 * The root station sits inboard of the fuselage skin for most of its chord and
 * emerges ahead of it, which is what makes the strake read as a strake rather
 * than as a wing that starts too far forward.
 */
function buildWing(): THREE.BufferGeometry {
  const stations: Array<[number, number, number, number, number]> = [
    // span, leading z, trailing z, centre y, thickness
    [0.82, -6.0, 3.5, 0.02, 0.3],
    [1.5, -5.2, 3.45, 0.0, 0.32],
    [2.3, -3.3, 3.4, -0.04, 0.3],
    [2.9, -2.3, 3.35, -0.1, 0.27],
    [4.05, -1.0, 3.05, -0.2, 0.2],
    [5.2, 0.35, 2.6, -0.34, 0.13],
    [6.05, 1.35, 2.25, -0.44, 0.08],
    [6.22, 1.6, 2.15, -0.46, 0.035],
  ];
  const rings = stations.map(([s, le, te, y, t]) => airfoilRing(WING_RING, s, le, te, y, t, 0.012));
  return loft(rings, { capNose: true, capTail: true, uvScale: 2.0 });
}

/** Canted vertical stabiliser, twenty-two degrees out. */
function buildFin(): THREE.BufferGeometry {
  const stations: Array<[number, number, number, number, number]> = [
    [0.0, 2.9, 7.4, 0, 0.3],
    [0.5, 3.35, 7.35, 0, 0.28],
    [1.2, 4.0, 7.25, 0, 0.24],
    [1.9, 4.65, 7.1, 0, 0.19],
    [2.45, 5.2, 6.95, 0, 0.13],
    [2.6, 5.4, 6.9, 0, 0.05],
  ];
  // Built lying down as a wing about X, then stood up and leant outboard.
  const rings = stations.map(([s, le, te, y, t]) => airfoilRing(WING_RING, s, le, te, y, t));
  const geo = loft(rings, { capNose: true, capTail: true, uvScale: 1.8 });
  geo.applyMatrix4(new THREE.Matrix4().makeRotationZ(Math.PI / 2 - 0.38));
  geo.translate(1.0, 0.5, 0);
  geo.computeVertexNormals();
  return geo;
}

/** All-moving tailplane with a little anhedral. */
function buildStabilator(): THREE.BufferGeometry {
  const stations: Array<[number, number, number, number, number]> = [
    [0.9, 5.3, 8.2, 0, 0.2],
    [1.7, 5.95, 8.15, -0.06, 0.17],
    [2.5, 6.6, 8.05, -0.13, 0.12],
    [3.05, 7.05, 7.98, -0.18, 0.06],
    [3.15, 7.15, 7.95, -0.19, 0.025],
  ];
  const rings = stations.map(([s, le, te, y, t]) => airfoilRing(WING_RING, s, le, te, y, t));
  const geo = loft(rings, { capNose: true, capTail: true, uvScale: 1.6 });
  geo.translate(0, -0.26, 0);
  return geo;
}

/** A ventral strake under the tail: small, but it closes the silhouette. */
function buildVentralStrake(): THREE.BufferGeometry {
  const stations: Array<[number, number, number, number, number]> = [
    [0.0, 5.6, 8.0, 0, 0.14],
    [0.32, 6.1, 7.95, 0, 0.1],
    [0.6, 6.6, 7.9, 0, 0.04],
  ];
  const rings = stations.map(([s, le, te, y, t]) => airfoilRing(12, s, le, te, y, t));
  const geo = loft(rings, { capNose: true, capTail: true, uvScale: 1.0 });
  geo.applyMatrix4(new THREE.Matrix4().makeRotationZ(-Math.PI / 2 + 0.5));
  geo.translate(0.78, -0.5, 0);
  geo.computeVertexNormals();
  return geo;
}

/** An engine can with petal ribbing: alternating radii around the exit. */
function buildNozzle(): THREE.BufferGeometry {
  const rings: Float32Array[] = [];
  const stations: Array<[number, number, number]> = [
    [7.2, 0.56, 0],
    [7.9, 0.55, 0],
    [8.3, 0.52, 0.018],
    [8.7, 0.48, 0.032],
    [9.05, 0.44, 0.042],
    [9.3, 0.43, 0.046],
  ];
  const count = 20;
  for (const [z, radius, petal] of stations) {
    const ring = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const r = radius + (i % 2 === 0 ? petal : -petal);
      ring[i * 3] = Math.cos(a) * r;
      ring[i * 3 + 1] = Math.sin(a) * r;
      ring[i * 3 + 2] = z;
    }
    rings.push(ring);
  }
  return loft(rings, { uvScale: 0.8 });
}

/** The inside of the can: a hole, not a cap. */
function buildNozzleInner(): THREE.BufferGeometry {
  const rings: Float32Array[] = [];
  const stations: Array<[number, number]> = [
    [9.32, 0.4],
    [8.9, 0.38],
    [8.3, 0.34],
    [7.7, 0.28],
    [7.3, 0.2],
  ];
  const count = 16;
  for (const [z, r] of stations) {
    const ring = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      ring[i * 3] = Math.cos(a) * r;
      ring[i * 3 + 1] = Math.sin(a) * r;
      ring[i * 3 + 2] = z;
    }
    rings.push(ring);
  }
  return loft(rings, { capTail: true, flip: true, uvScale: 0.8 });
}

function buildPylon(): THREE.BufferGeometry {
  const rings: Float32Array[] = [];
  const stations: Array<[number, number, number, number]> = [
    [-1.05, 0.05, 0.16, 0.2],
    [-0.7, 0.09, 0.2, 0.24],
    [0.5, 0.1, 0.22, 0.24],
    [1.0, 0.06, 0.14, 0.2],
  ];
  for (const [z, hw, hUp, hDn] of stations) {
    rings.push(ellipseRing(8, z, 0, hw, hUp, hDn, 5.0));
  }
  return loft(rings, { capNose: true, capTail: true, uvScale: 0.7 });
}
