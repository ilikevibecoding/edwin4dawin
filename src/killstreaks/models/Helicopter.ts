import * as THREE from 'three';
import type { IMaterialLibrary } from '../../core/Interfaces';
import { ellipseRing, loft, mirrorX } from './Loft';

/**
 * The attack helicopter.
 *
 * A tandem-seat gunship in the AH-1 family: narrow enough across the shoulders
 * that it is unmistakable head-on, 14 m over the rotor disc, with stub wings,
 * a chin turret that tracks independently and a tail rotor that is visibly on
 * one side. It orbits the map at sixty metres, so the silhouette against the
 * sky is nearly all the viewer gets — which is why the fuselage is a lofted
 * section with a real waist rather than a box, and why the disc is a separate
 * translucent plane instead of blades that would strobe into invisibility at
 * any frame rate the game will ever run at.
 *
 * The blades are still there and still spin: at 5 rev/s they read as a blur in
 * motion and as blades in a still frame, and the disc plane sitting over them
 * supplies the shimmer that four quads cannot.
 */

export interface HelicopterInstance {
  root: THREE.Group;
  /** Yaws and pitches to track a target. */
  turret: THREE.Object3D;
  /** Where the tracers leave the gun. */
  muzzle: THREE.Object3D;
  mainRotor: THREE.Object3D;
  tailRotor: THREE.Object3D;
  /** Under the fuselage, where the rotor wash column is anchored. */
  wash: THREE.Object3D;
}

export class HelicopterAssets {
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly ownedMaterials: THREE.Material[] = [];
  private readonly shadows: boolean;

  private readonly skin: THREE.Material;
  private readonly dark: THREE.Material;
  private readonly glass: THREE.Material;
  private readonly disc: THREE.MeshBasicMaterial;

  private readonly body: THREE.BufferGeometry;
  private readonly boom: THREE.BufferGeometry;
  private readonly canopy: THREE.BufferGeometry;
  private readonly stubL: THREE.BufferGeometry;
  private readonly stubR: THREE.BufferGeometry;
  private readonly fin: THREE.BufferGeometry;
  private readonly blade: THREE.BufferGeometry;
  private readonly tailBlade: THREE.BufferGeometry;
  private readonly discGeo: THREE.BufferGeometry;
  private readonly turretGeo: THREE.BufferGeometry;
  private readonly barrel: THREE.BufferGeometry;
  private readonly skid: THREE.BufferGeometry;
  private readonly mast: THREE.BufferGeometry;

  constructor(lib: IMaterialLibrary | undefined, shadows: boolean) {
    this.shadows = shadows;
    this.body = this.own(buildBody());
    this.boom = this.own(buildBoom());
    this.canopy = this.own(buildCanopy());
    this.stubR = this.own(buildStub());
    this.stubL = this.own(mirrorX(this.stubR));
    this.fin = this.own(buildFin());
    this.blade = this.own(buildBlade(7.3, 0.44));
    this.tailBlade = this.own(buildBlade(1.42, 0.19));
    this.discGeo = this.own(new THREE.CircleGeometry(7.4, 40));
    this.discGeo.rotateX(-Math.PI / 2);
    this.turretGeo = this.own(buildTurret());
    const barrel = new THREE.CylinderGeometry(0.052, 0.046, 1.5, 7);
    barrel.rotateX(Math.PI / 2);
    barrel.translate(0, 0, -0.75);
    this.barrel = this.own(barrel);
    this.skid = this.own(buildSkid());
    const mast = new THREE.CylinderGeometry(0.15, 0.2, 0.75, 8);
    this.mast = this.own(mast);

    this.skin = this.metal(lib, 0x3c443c, 0.62, 0.28);
    this.dark = this.metal(lib, 0x1d2022, 0.7, 0.2);
    this.glass = this.metal(lib, 0x14201f, 0.12, 0.85);
    this.disc = this.keep(
      new THREE.MeshBasicMaterial({
        color: 0x2a2e30,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
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
  ): THREE.Material {
    if (lib) {
      const mat = lib.forSize('metal_painted', 2.2) as THREE.MeshStandardMaterial;
      mat.color.setHex(color);
      mat.roughness = roughness;
      mat.metalness = metalness;
      mat.normalScale?.set(0.35, 0.35);
      return mat;
    }
    return this.keep(new THREE.MeshStandardMaterial({ color, roughness, metalness }));
  }

  instantiate(name: string): HelicopterInstance {
    const root = new THREE.Group();
    root.name = name;

    const add = (
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      parent: THREE.Object3D = root,
      shadow = true,
    ): THREE.Mesh => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = shadow && this.shadows;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      parent.add(mesh);
      return mesh;
    };

    add(this.body, this.skin);
    add(this.boom, this.skin);
    add(this.canopy, this.glass);
    add(this.stubL, this.skin);
    add(this.stubR, this.skin);
    add(this.fin, this.skin);

    for (const side of [-1, 1]) {
      const skid = add(this.skid, this.dark, root, false);
      skid.position.x = side * 1.02;
      skid.updateMatrix();
    }

    const turret = new THREE.Object3D();
    turret.position.set(0, -0.72, -3.5);
    root.add(turret);
    add(this.turretGeo, this.dark, turret, false);
    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, -0.1, -1.5);
    turret.add(muzzle);
    const gun = add(this.barrel, this.dark, turret, false);
    gun.position.set(0, -0.1, 0);
    gun.updateMatrix();

    const mast = add(this.mast, this.dark, root, false);
    mast.position.set(0, 1.52, -0.2);
    mast.updateMatrix();

    const mainRotor = new THREE.Object3D();
    mainRotor.position.set(0, 1.92, -0.2);
    root.add(mainRotor);
    for (let i = 0; i < 4; i++) {
      const blade = add(this.blade, this.dark, mainRotor, false);
      blade.rotation.y = (i / 4) * Math.PI * 2;
      blade.updateMatrix();
    }
    const disc = add(this.discGeo, this.disc, mainRotor, false);
    disc.position.y = 0.04;
    disc.renderOrder = 3;
    disc.updateMatrix();

    const tailRotor = new THREE.Object3D();
    tailRotor.position.set(-0.36, 1.28, 6.55);
    tailRotor.rotation.z = Math.PI / 2;
    root.add(tailRotor);
    for (let i = 0; i < 2; i++) {
      const blade = add(this.tailBlade, this.dark, tailRotor, false);
      blade.rotation.y = (i / 2) * Math.PI * 2;
      blade.updateMatrix();
    }

    const wash = new THREE.Object3D();
    wash.position.set(0, -1.2, -0.2);
    root.add(wash);

    return { root, turret, muzzle, mainRotor, tailRotor, wash };
  }

  dispose(): void {
    for (const g of this.geometries) g.dispose();
    for (const m of this.ownedMaterials) m.dispose();
    this.geometries.length = 0;
    this.ownedMaterials.length = 0;
  }
}

/* -------------------------------- geometry -------------------------------- */

type Section = [number, number, number, number, number, number];

/** Narrow across the shoulders, deep through the keel: a gunship in plan. */
function buildBody(): THREE.BufferGeometry {
  const sections: Section[] = [
    [-4.5, -0.2, 0.34, 0.3, 0.34, 2.4],
    [-3.6, -0.1, 0.5, 0.44, 0.5, 2.6],
    [-2.4, 0.05, 0.62, 0.66, 0.66, 2.8],
    [-1.0, 0.14, 0.72, 0.82, 0.78, 3.0],
    [0.4, 0.16, 0.78, 0.9, 0.82, 3.2],
    [1.7, 0.14, 0.78, 0.86, 0.78, 3.2],
    [2.8, 0.1, 0.68, 0.7, 0.66, 3.0],
    [3.7, 0.06, 0.5, 0.5, 0.48, 2.8],
  ];
  return loft(
    sections.map((s) => ellipseRing(14, s[0], s[1], s[2], s[3], s[4], s[5])),
    { noseTip: [0, -0.24, -5.0], capTail: true, uvScale: 2.0 },
  );
}

function buildBoom(): THREE.BufferGeometry {
  const sections: Section[] = [
    [3.5, 0.32, 0.34, 0.34, 0.34, 2.6],
    [4.6, 0.44, 0.28, 0.28, 0.28, 2.6],
    [5.7, 0.58, 0.23, 0.23, 0.23, 2.6],
    [6.6, 0.7, 0.2, 0.2, 0.2, 2.6],
    [7.2, 0.78, 0.17, 0.17, 0.17, 2.6],
  ];
  return loft(
    sections.map((s) => ellipseRing(10, s[0], s[1], s[2], s[3], s[4], s[5])),
    { capNose: true, capTail: true, uvScale: 1.6 },
  );
}

function buildCanopy(): THREE.BufferGeometry {
  const sections: Section[] = [
    [-3.9, 0.24, 0.28, 0.3, 0.4, 2.4],
    [-3.1, 0.4, 0.44, 0.44, 0.5, 2.6],
    [-2.1, 0.55, 0.54, 0.5, 0.5, 2.8],
    [-1.1, 0.7, 0.58, 0.52, 0.5, 2.9],
    [-0.1, 0.8, 0.56, 0.46, 0.5, 2.8],
    [0.8, 0.82, 0.46, 0.3, 0.5, 2.6],
  ];
  return loft(
    sections.map((s) => ellipseRing(12, s[0], s[1], s[2], s[3], s[4], s[5])),
    { noseTip: [0, 0.14, -4.35], tailTip: [0, 0.84, 1.4], uvScale: 1.4 },
  );
}

/** A stub wing carrying rocket pods, swept slightly and with real thickness. */
function buildStub(): THREE.BufferGeometry {
  const rings: Float32Array[] = [];
  const stations: Array<[number, number, number, number]> = [
    [0.6, -0.4, 1.6, 0.28],
    [1.5, -0.25, 1.55, 0.24],
    [2.35, -0.1, 1.5, 0.18],
    [2.55, -0.05, 1.48, 0.06],
  ];
  for (const [span, le, te, thick] of stations) {
    const count = 10;
    const ring = new Float32Array(count * 3);
    const chord = te - le;
    for (let i = 0; i < count; i++) {
      const upper = i < count / 2;
      const k = upper ? i / (count / 2) : (count - i) / (count / 2);
      const s = 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, k));
      const y = thick * 0.5 * Math.sin(Math.PI * Math.max(0.02, s));
      ring[i * 3] = span;
      ring[i * 3 + 1] = -0.12 + (upper ? y : -y);
      ring[i * 3 + 2] = le + chord * s;
    }
    rings.push(ring);
  }
  return loft(rings, { capNose: true, capTail: true, uvScale: 1.2 });
}

function buildFin(): THREE.BufferGeometry {
  const rings: Float32Array[] = [];
  const stations: Array<[number, number, number, number]> = [
    [0.72, 6.0, 7.4, 0.24],
    [1.35, 6.3, 7.35, 0.2],
    [1.95, 6.6, 7.3, 0.14],
    [2.15, 6.72, 7.28, 0.05],
  ];
  for (const [y, le, te, thick] of stations) {
    const count = 10;
    const ring = new Float32Array(count * 3);
    const chord = te - le;
    for (let i = 0; i < count; i++) {
      const near = i < count / 2;
      const k = near ? i / (count / 2) : (count - i) / (count / 2);
      const s = 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, k));
      const x = thick * 0.5 * Math.sin(Math.PI * Math.max(0.02, s));
      ring[i * 3] = near ? x : -x;
      ring[i * 3 + 1] = y;
      ring[i * 3 + 2] = le + chord * s;
    }
    rings.push(ring);
  }
  return loft(rings, { capNose: true, capTail: true, uvScale: 1.0 });
}

/** A rotor blade: a long, thin aerofoil with a little droop at the tip. */
function buildBlade(length: number, chord: number): THREE.BufferGeometry {
  const rings: Float32Array[] = [];
  const count = 8;
  const stations: Array<[number, number, number]> = [
    [0.24, 0.055, 0],
    [length * 0.35, 0.05, -0.01],
    [length * 0.78, 0.042, -0.05],
    [length, 0.03, -0.12],
  ];
  for (const [r, thick, droop] of stations) {
    const ring = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const upper = i < count / 2;
      const k = upper ? i / (count / 2) : (count - i) / (count / 2);
      const s = 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, k));
      ring[i * 3] = r;
      ring[i * 3 + 1] = droop + (upper ? thick : -thick) * Math.sin(Math.PI * Math.max(0.03, s));
      ring[i * 3 + 2] = -chord * 0.4 + chord * s;
    }
    rings.push(ring);
  }
  return loft(rings, { capNose: true, capTail: true, uvScale: 0.8 });
}

function buildTurret(): THREE.BufferGeometry {
  const rings: Float32Array[] = [];
  const profile: Array<[number, number, number]> = [
    [-0.62, 0.16, -0.14],
    [-0.4, 0.38, -0.08],
    [0.0, 0.46, 0.0],
    [0.36, 0.4, 0.02],
    [0.58, 0.2, 0.02],
  ];
  for (const [z, r, cy] of profile) {
    rings.push(ellipseRing(12, z, cy, r, r * 0.82, r * 0.9, 2.6));
  }
  return loft(rings, { noseTip: [0, -0.16, -0.7], tailTip: [0, 0.02, 0.66], uvScale: 0.8 });
}

function buildSkid(): THREE.BufferGeometry {
  const rings: Float32Array[] = [];
  const profile: Array<[number, number, number]> = [
    [-2.3, -1.28, 0.05],
    [-2.0, -1.42, 0.075],
    [-0.6, -1.5, 0.075],
    [1.6, -1.5, 0.075],
    [2.4, -1.42, 0.075],
    [2.7, -1.3, 0.05],
  ];
  for (const [z, y, r] of profile) {
    rings.push(ellipseRing(6, z, y, r, r, r, 2));
  }
  const geo = loft(rings, { capNose: true, capTail: true, uvScale: 0.6 });
  // Two struts up to the keel; without them the skid floats under the machine.
  const struts: THREE.BufferGeometry[] = [geo];
  for (const z of [-1.1, 1.5]) {
    const strut = new THREE.CylinderGeometry(0.055, 0.055, 0.82, 5);
    strut.translate(-0.16, -1.06, z);
    struts.push(strut);
  }
  return mergeSimple(struts);
}

/** Concatenates non-indexed-safe geometries that share the same attributes. */
function mergeSimple(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (const geo of list) {
    const pos = geo.getAttribute('position');
    const uv = geo.getAttribute('uv');
    const idx = geo.getIndex();
    const base = positions.length / 3;
    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      uvs.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
    }
    if (idx) {
      for (let i = 0; i < idx.count; i++) indices.push(base + idx.getX(i));
    } else {
      for (let i = 0; i < pos.count; i++) indices.push(base + i);
    }
    if (geo !== list[0]) geo.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  out.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
  out.setIndex(indices);
  out.computeVertexNormals();
  out.computeBoundingSphere();
  list[0].dispose();
  return out;
}
