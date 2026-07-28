import * as THREE from 'three';
import { Layers } from '../../core/GameContext';
import { Mesher } from './Mesher';
import * as P from './Prim';
import { bakeVertexAO, type AOSurface } from './AmbientOcclusion';

/**
 * The authoring surface the weapon models are written against.
 *
 * A model declares **nodes** — receiver, bolt, magazine, charging handle — and
 * fills each with parts. Everything is authored in one shared weapon space, so
 * a part can be positioned by where it actually is on the gun rather than
 * relative to whatever group it happens to animate with; the node's pivot is
 * subtracted at build time and becomes the group's origin, which is what lets
 * the magazine rotate out of the well about its front lip.
 *
 * Parts accumulate into one `Mesher` per (node, material). A finished rifle is
 * therefore a dozen meshes rather than two hundred, and the animation system
 * walks a dozen groups.
 */

export type MatKey = 'metal' | 'polymer' | 'wood';

export interface NodeSpec {
  name: string;
  /** Rotation origin in weapon space. */
  pivot?: [number, number, number];
  /** Parent node; defaults to the model root. */
  parent?: string;
}

interface NodeBuild {
  spec: NodeSpec;
  meshers: Map<MatKey, Mesher>;
}

export interface BuiltModel {
  root: THREE.Group;
  nodes: Map<string, THREE.Group>;
  triangles: number;
  geometries: THREE.BufferGeometry[];
}

export interface AssemblyMaterials {
  /** Returns the shared material for a key; the caller owns disposal. */
  material(key: MatKey): THREE.Material;
  /** Metres of surface one texture tile covers, per key. */
  tileSize(key: MatKey): number;
}

/** Authoring context for one node: a transform stack plus the primitive set. */
export class PartCtx {
  /** The mesher primitives should be handed when calling `Prim` directly. */
  m: Mesher;

  private readonly matrix = new THREE.Matrix4();
  private readonly stack: THREE.Matrix4[] = [];
  private depth = 0;

  constructor(
    private readonly node: NodeBuild,
    private readonly tile: (key: MatKey) => number,
  ) {
    this.m = this.mesherFor('metal');
  }

  private mesherFor(key: MatKey): Mesher {
    let mesher = this.node.meshers.get(key);
    if (!mesher) {
      mesher = new Mesher();
      mesher.uvScale = 1 / Math.max(1e-4, this.tile(key));
      this.node.meshers.set(key, mesher);
    }
    return mesher;
  }

  /* ---------------------------- state ------------------------------ */

  mat(key: MatKey): this {
    this.m = this.mesherFor(key);
    this.m.setMatrix(this.matrix);
    return this;
  }

  tint(hex: number): this {
    this.m.tint(hex);
    return this;
  }

  /** Hand-placed occlusion multiplier, on top of the baked term. */
  ao(v: number): this {
    this.m.ao(v);
    return this;
  }

  /** Sets material and tint together, which is what most parts want. */
  use(key: MatKey, tint: number, ao = 1): this {
    this.mat(key);
    this.m.tint(tint);
    this.m.ao(ao);
    return this;
  }

  /* -------------------------- transform ----------------------------- */

  push(): this {
    if (this.depth === this.stack.length) this.stack.push(new THREE.Matrix4());
    this.stack[this.depth++].copy(this.matrix);
    return this;
  }

  pop(): this {
    if (this.depth > 0) {
      this.matrix.copy(this.stack[--this.depth]);
      this.m.setMatrix(this.matrix);
    }
    return this;
  }

  at(x: number, y: number, z: number): this {
    this.matrix.multiply(_scratch.makeTranslation(x, y, z));
    this.m.setMatrix(this.matrix);
    return this;
  }

  /**
   * Moves to this node's own pivot.
   *
   * Parts are authored in weapon space, so a node's contents normally quote
   * absolute coordinates and never need this. The shared components that hang
   * from wherever they are placed — a magazine, a trigger blade — do: they are
   * written around their own origin so one function can serve five weapons,
   * and this is how a node hands them its position without repeating it.
   */
  pivot(): this {
    const p = this.node.spec.pivot;
    return p ? this.at(p[0], p[1], p[2]) : this;
  }

  rx(a: number): this {
    this.matrix.multiply(_scratch.makeRotationX(a));
    this.m.setMatrix(this.matrix);
    return this;
  }

  ry(a: number): this {
    this.matrix.multiply(_scratch.makeRotationY(a));
    this.m.setMatrix(this.matrix);
    return this;
  }

  rz(a: number): this {
    this.matrix.multiply(_scratch.makeRotationZ(a));
    this.m.setMatrix(this.matrix);
    return this;
  }

  /* -------------------------- primitives ---------------------------- */

  box(w: number, h: number, d: number, chamfer = 0.0012): this {
    P.box(this.m, w, h, d, chamfer);
    return this;
  }

  boxAt(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    chamfer = 0.0012,
  ): this {
    P.boxAt(this.m, x, y, z, w, h, d, chamfer);
    return this;
  }

  cyl(r: number, len: number, opts: P.CylOptions = {}): this {
    P.cyl(this.m, r, len, opts);
    return this;
  }

  /** Cylinder along Z placed by its centre. */
  cylAt(x: number, y: number, z: number, r: number, len: number, opts: P.CylOptions = {}): this {
    this.push();
    this.at(x, y, z);
    P.cyl(this.m, r, len, opts);
    this.pop();
    return this;
  }

  /** Cylinder along X, for cross pins and takedown detents. */
  pinX(x: number, y: number, z: number, r: number, len: number, seg = 10): this {
    this.push();
    this.at(x, y, z);
    this.ry(Math.PI / 2);
    P.cyl(this.m, r, len, { segments: seg, chamfer: r * 0.25 });
    this.pop();
    return this;
  }

  tube(rOuter: number, rInner: number, len: number, seg = 16, chamfer = 0.0006): this {
    P.tube(this.m, rOuter, rInner, len, seg, chamfer);
    return this;
  }

  lathe(profile: Array<[number, number]>, seg = 20, capStart = true, capEnd = true): this {
    P.lathe(this.m, profile, seg, capStart, capEnd);
    return this;
  }

  extrude(pts: number[], depth: number, bevel = 0.0012): this {
    P.extrude(this.m, pts, depth, bevel);
    return this;
  }

  /**
   * Extrudes a side view: the profile is authored with **+X forward** (weapon
   * -Z) and +Y up, and comes out `width` thick across the weapon's X axis.
   * Nearly every interesting silhouette on a gun is a side view.
   */
  sideProfile(pts: number[], width: number, bevel = 0.0012): this {
    this.push();
    this.ry(Math.PI / 2);
    P.extrude(this.m, pts, width, bevel);
    this.pop();
    return this;
  }

  /** Extrudes a plan view: profile authored +X right, +Y forward, `thick` tall. */
  topProfile(pts: number[], thick: number, bevel = 0.0012): this {
    this.push();
    this.rx(-Math.PI / 2);
    P.extrude(this.m, pts, thick, bevel);
    this.pop();
    return this;
  }

  torus(radius: number, thickness: number, major = 16, minor = 8, arc = Math.PI * 2): this {
    P.torus(this.m, radius, thickness, major, minor, arc);
    return this;
  }

  screw(radius: number, height: number, slot = true): this {
    P.screw(this.m, radius, height, slot);
    return this;
  }

  /** Screw head on a surface facing +X, the common case on a receiver flank. */
  screwX(x: number, y: number, z: number, radius: number, height = 0.0009): this {
    this.push();
    this.at(x, y, z);
    this.ry(Math.PI / 2);
    P.screw(this.m, radius, height, true);
    this.pop();
    return this;
  }

  hexHead(acrossFlats: number, height: number): this {
    P.hexHead(this.m, acrossFlats, height);
    return this;
  }

  serrations(
    count: number,
    spacing: number,
    width: number,
    height: number,
    depth: number,
    lean = 0,
  ): this {
    P.serrations(this.m, count, spacing, width, height, depth, lean);
    return this;
  }

  picatinny(slots: number, width = 0.0212, height = 0.006): this {
    P.picatinny(this.m, slots, width, height);
    return this;
  }

  trapezoid(wBottom: number, wTop: number, height: number, depth: number, bevel = 0.0004): this {
    P.trapezoid(this.m, wBottom, wTop, height, depth, bevel);
    return this;
  }

  flutedCyl(r: number, len: number, flutes: number, depth: number, segments = 40): this {
    P.flutedCyl(this.m, r, len, flutes, depth, segments);
    return this;
  }

  ventedRing(radius: number, holeRadius: number, count: number, depth: number): this {
    P.ventedRing(this.m, radius, holeRadius, count, depth);
    return this;
  }
}

const _scratch = new THREE.Matrix4();

export class Assembly {
  private readonly order: string[] = [];
  private readonly builds = new Map<string, NodeBuild>();
  private readonly contexts = new Map<string, PartCtx>();

  constructor(private readonly materials: AssemblyMaterials) {}

  /** Declares (or reopens) a node and returns its authoring context. */
  node(name: string, pivot?: [number, number, number], parent?: string): PartCtx {
    let build = this.builds.get(name);
    if (!build) {
      build = { spec: { name, pivot, parent }, meshers: new Map() };
      this.builds.set(name, build);
      this.order.push(name);
    } else if (pivot && !build.spec.pivot) {
      build.spec.pivot = pivot;
    }
    let ctx = this.contexts.get(name);
    if (!ctx) {
      ctx = new PartCtx(build, (k) => this.materials.tileSize(k));
      this.contexts.set(name, ctx);
    }
    return ctx;
  }

  /**
   * Merges every node into meshes, bakes occlusion across the whole weapon and
   * returns the group hierarchy the animation rig drives.
   */
  build(name: string, aoStrength = 0.62, aoResolution = 72): BuiltModel {
    const root = new THREE.Group();
    root.name = name;
    const nodes = new Map<string, THREE.Group>();
    const geometries: THREE.BufferGeometry[] = [];
    const surfaces: AOSurface[] = [];
    let triangles = 0;

    for (const key of this.order) {
      const build = this.builds.get(key)!;
      const group = new THREE.Group();
      group.name = `${name}.${key}`;
      const pivot = build.spec.pivot ?? [0, 0, 0];
      group.position.set(pivot[0], pivot[1], pivot[2]);
      nodes.set(key, group);
    }
    for (const key of this.order) {
      const build = this.builds.get(key)!;
      const group = nodes.get(key)!;
      const parent = build.spec.parent ? nodes.get(build.spec.parent) : undefined;
      if (parent) {
        // Pivots are authored in weapon space; re-express under the parent.
        group.position.sub(parent.position);
        parent.add(group);
      } else {
        root.add(group);
      }
    }

    for (const key of this.order) {
      const build = this.builds.get(key)!;
      const group = nodes.get(key)!;
      const pivot = build.spec.pivot ?? [0, 0, 0];
      for (const [matKey, mesher] of build.meshers) {
        if (mesher.empty) continue;
        const geo = mesher.toGeometry(`${name}.${key}.${matKey}`);
        const pos = geo.getAttribute('position') as THREE.BufferAttribute;
        const arr = pos.array as Float32Array;
        for (let i = 0; i < arr.length; i += 3) {
          arr[i] -= pivot[0];
          arr[i + 1] -= pivot[1];
          arr[i + 2] -= pivot[2];
        }
        pos.needsUpdate = true;
        geo.computeBoundingSphere();
        geo.computeBoundingBox();

        const mesh = new THREE.Mesh(geo, this.materials.material(matKey));
        mesh.name = geo.name;
        mesh.matrixAutoUpdate = false;
        mesh.frustumCulled = false;
        mesh.layers.set(Layers.VIEWMODEL);
        group.add(mesh);
        geometries.push(geo);
        triangles += (geo.getIndex()?.count ?? 0) / 3;

        surfaces.push({
          positions: arr,
          normals: (geo.getAttribute('normal') as THREE.BufferAttribute).array as Float32Array,
          colors: (geo.getAttribute('color') as THREE.BufferAttribute).array as Float32Array,
          indices: geo.getIndex()!.array,
          offsetX: pivot[0],
          offsetY: pivot[1],
          offsetZ: pivot[2],
        });
      }
    }

    if (aoStrength > 0) {
      bakeVertexAO(surfaces, aoResolution, aoStrength);
      for (const geo of geometries) {
        (geo.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
      }
    }

    return { root, nodes, triangles, geometries };
  }
}
