import * as THREE from 'three';
import { Groups, setHitMeta, type HitMeta } from '../core/GameContext';
import type { IMaterialLibrary, MaterialName } from '../core/Interfaces';
import { GeoBuf } from './Geo';

/**
 * Draw-call management for the level.
 *
 * The whole town is authored as loose primitives and then collapsed into a
 * small number of objects here. Two mechanisms do all the work:
 *
 * - **Merging.** Static surfaces accumulate into one `GeoBuf` per
 *   (material, cell, detail level) and become a single mesh. Cells are a coarse
 *   spatial grid, present only so frustum culling and level-of-detail have
 *   something to work with; without them the whole town would be one
 *   unculleable mesh.
 * - **Instancing.** Anything that repeats — every crate, drum, tyre, palm and
 *   air-conditioning unit — is registered once as a prop definition and placed
 *   by matrix. Instances are split by cell for the same reason merged geometry
 *   is, and a definition may carry a cheaper geometry that swaps in at range.
 *
 * Because materials are shared across every cell, one material instance per
 * `MaterialName` serves the entire level. Its tile uniform is set from
 * `tileSize` so that uvs authored in metres land at the art-directed density.
 */

/** Metres of material a bullet punches through, per surface family. */
const PENETRATION: Partial<Record<MaterialName, number>> = {
  concrete: 0.14,
  concrete_painted: 0.14,
  concrete_damaged: 0.2,
  brick: 0.18,
  plaster: 0.3,
  stucco_sand: 0.3,
  stucco_ochre: 0.3,
  asphalt: 0.1,
  sand: 0.12,
  gravel: 0.12,
  dirt: 0.16,
  rubble: 0.16,
  ceramic_tile: 0.3,
  metal_painted: 0.22,
  metal_rusted: 0.24,
  metal_corrugated: 0.5,
  metal_brushed: 0.18,
  steel_plate: 0.05,
  wood_planks: 0.55,
  wood_crate: 0.6,
  wood_door: 0.65,
  fabric_canvas: 2.5,
  fabric_carpet: 1.5,
  sandbag: 0.06,
  glass: 3,
  glass_broken: 3,
  rubber: 0.4,
  plastic: 0.7,
  foliage: 2.5,
  bark: 0.4,
  water: 1.2,
};

const BREAKABLE: ReadonlySet<MaterialName> = new Set<MaterialName>([
  'glass',
  'glass_broken',
  'ceramic_tile',
]);

/**
 * Either a library material name, or the key of a variant registered with
 * `registerVariant` — a clone of a library material with something changed
 * that the library cannot express, such as the wind vertex shader or a
 * disabled alpha cut-out.
 */
export type MatRef = MaterialName | string;

export interface PropDef {
  id: string;
  material: MatRef;
  geometry: THREE.BufferGeometry;
  /** Cheaper stand-in used beyond `lodDistance`. */
  lodGeometry?: THREE.BufferGeometry;
  /** Metres at which the simplified geometry takes over, before `lodBias`. */
  lodDistance?: number;
  /** Metres beyond which the prop is not drawn at all. */
  cullDistance?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
  /** False for foliage, cloth and cables, which must not stop a bullet. */
  collide?: boolean;
  hit?: HitMeta;
  /** Transparent props draw after the opaque pass. */
  transparent?: boolean;
}

interface PropBank {
  def: PropDef;
  matrices: Map<string, THREE.Matrix4[]>;
  colors: Map<string, THREE.Color[]>;
  count: number;
}

interface Bucket {
  material: MatRef;
  cell: string;
  far: boolean;
  /** False for surfaces whose shadow nobody can see; see `solidFlat`. */
  shadow: boolean;
  buf: GeoBuf;
}

/** One instanced draw of a prop definition, after splitting and baking. */
interface PropPart {
  def: PropDef;
  cell: string;
  list: THREE.Matrix4[];
  colors: THREE.Color[];
  /** Triangles in one copy of the detailed geometry. */
  tris: number;
}

/** A cell's near and far representations, toggled by distance to the camera. */
interface CellGroup {
  name: string;
  near: THREE.Object3D[];
  far: THREE.Object3D[];
  center: THREE.Vector3;
  radius: number;
  /** Metres from the cell's bounds at which the far set takes over. */
  switchDistance: number;
  /** Metres from the cell's bounds at which everything is hidden. */
  cullDistance: number;
}

export interface CellOptions {
  /** Distance at which the simplified set replaces the detailed one. */
  switchDistance?: number;
  /** Distance at which the cell stops drawing entirely. */
  cullDistance?: number;
  /**
   * False to keep this cell's merged geometry out of the shadow map. Must be
   * declared before any geometry is written to the cell.
   */
  castShadow?: boolean;
}

const _m = new THREE.Matrix4();
const _box = new THREE.Box3();
const _sphere = new THREE.Sphere();

const triCount = (g: THREE.BufferGeometry): number =>
  g.index ? g.index.count / 3 : (g.attributes.position?.count ?? 0) / 3;

export class Batcher {
  private buckets = new Map<string, Bucket>();
  private props = new Map<string, PropBank>();
  private materials = new Map<string, THREE.Material>();
  private variants = new Map<
    string,
    { base: MaterialName; configure: (m: THREE.MeshStandardMaterial) => void; localSpace?: boolean }
  >();
  private cellOptions = new Map<string, CellOptions>();
  private geometries: THREE.BufferGeometry[] = [];

  readonly groups: CellGroup[] = [];

  /** Totals for the generation report. */
  mergedMeshes = 0;
  instancedMeshes = 0;
  instanceCount = 0;
  /** Prop instances absorbed into merged geometry rather than instanced. */
  bakedProps = 0;
  triangles = 0;

  constructor(
    private lib: IMaterialLibrary,
    /** Grid pitch used to split instances into cells, in metres. */
    private cellSize = 40,
  ) {}

  /* ---------------------------- materials ------------------------------ */

  /**
   * One material per name for the whole level. `vertexColors` is always on
   * because merging is the only way to hit the draw-call budget and per-vertex
   * tint is then the only per-object variation left.
   */
  material(ref: MatRef): THREE.Material {
    let mat = this.materials.get(ref);
    if (!mat) {
      const variant = this.variants.get(ref);
      const base = variant?.base ?? (ref as MaterialName);
      const tile = 1 / Math.max(0.01, this.lib.tileSize(base));
      mat = this.lib.tiled(base, tile, tile);
      const std = mat as THREE.MeshStandardMaterial;
      std.vertexColors = true;
      std.name = `world:${ref}`;
      variant?.configure(std);
      std.needsUpdate = true;
      this.materials.set(ref, mat);
    }
    return mat;
  }

  /**
   * Declares a material variant: a clone of a library material with something
   * the library has no vocabulary for, such as a wind vertex shader or a
   * disabled alpha cut-out. Returns the key to pass to `solid` and `PropDef`.
   *
   * Pass `localSpace` for a variant whose vertex shader reads object coordinates
   * — wind takes its flex from the vertex's height above the prop's own base, so
   * baking such a prop into world space would make a shirt on a line flex by its
   * height above sea level. Those props stay instanced.
   */
  registerVariant(
    key: string,
    base: MaterialName,
    configure: (m: THREE.MeshStandardMaterial) => void,
    opts?: { localSpace?: boolean },
  ): string {
    if (!this.variants.has(key)) {
      this.variants.set(key, { base, configure, localSpace: opts?.localSpace });
    }
    return key;
  }

  baseMaterial(ref: MatRef): MaterialName {
    return this.variants.get(ref)?.base ?? (ref as MaterialName);
  }

  /* ------------------------------ merging ------------------------------- */

  /** The buffer that static geometry of this material in this cell writes to. */
  solid(material: MatRef, cell: string): GeoBuf {
    return this.bucket(material, cell, false, true);
  }

  /**
   * Like `solid`, but the resulting mesh is excluded from the shadow map.
   *
   * For ground-plane geometry — the terrain grid, the sea, tar repairs, scorch,
   * sand drifts flush with the surface. All of it is a shadow *receiver* whose
   * own caster contribution is either nothing (a flat sheet lit from above casts
   * onto itself) or a sliver at the camber that no cascade resolves.
   *
   * This is the single largest saving available anywhere in the level. Shadows
   * here run three cascades, so every triangle that casts is drawn four times a
   * frame; the terrain alone is a quarter of the level's geometry, and it was
   * paying full price in all four passes to contribute nothing to three of them.
   */
  solidFlat(material: MatRef, cell: string): GeoBuf {
    return this.bucket(material, cell, false, false);
  }

  /** The simplified stand-in for `cell`, drawn once the camera is far enough. */
  solidFar(material: MatRef, cell: string): GeoBuf {
    return this.bucket(material, cell, true, true);
  }

  private bucket(material: MatRef, cell: string, far: boolean, wants: boolean): GeoBuf {
    const shadow = wants && this.cellOptions.get(cell)?.castShadow !== false;
    const key = `${material}|${cell}|${far ? 1 : 0}|${shadow ? 1 : 0}`;
    let b = this.buckets.get(key);
    if (!b) {
      b = { material, cell, far, shadow, buf: new GeoBuf() };
      this.buckets.set(key, b);
    }
    return b.buf;
  }

  configureCell(cell: string, options: CellOptions): void {
    this.cellOptions.set(cell, { ...this.cellOptions.get(cell), ...options });
  }

  /* ----------------------------- instancing ----------------------------- */

  defineProp(def: PropDef): void {
    if (this.props.has(def.id)) return;
    this.props.set(def.id, { def, matrices: new Map(), colors: new Map(), count: 0 });
    this.geometries.push(def.geometry);
    if (def.lodGeometry) this.geometries.push(def.lodGeometry);
  }

  hasProp(id: string): boolean {
    return this.props.has(id);
  }

  /**
   * Places one instance. `matrix` is copied, so callers may reuse a scratch.
   * The cell is derived from the matrix translation.
   */
  place(id: string, matrix: THREE.Matrix4, color?: THREE.Color): void {
    const bank = this.props.get(id);
    if (!bank) {
      console.warn(`[world] unknown prop "${id}"`);
      return;
    }
    const x = matrix.elements[12];
    const z = matrix.elements[14];
    const cell = `${Math.floor(x / this.cellSize)},${Math.floor(z / this.cellSize)}`;
    let list = bank.matrices.get(cell);
    if (!list) {
      list = [];
      bank.matrices.set(cell, list);
      bank.colors.set(cell, []);
    }
    list.push(matrix.clone());
    bank.colors.get(cell)!.push(color ? color.clone() : new THREE.Color(1, 1, 1));
    bank.count++;
  }

  /** Convenience placement from position, yaw and uniform or per-axis scale. */
  placeAt(
    id: string,
    x: number, y: number, z: number,
    yaw = 0,
    scale: number | THREE.Vector3 = 1,
    color?: THREE.Color,
    tilt = 0,
    roll = 0,
  ): void {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, yaw, roll, 'YXZ'));
    const s = typeof scale === 'number' ? new THREE.Vector3(scale, scale, scale) : scale;
    _m.compose(new THREE.Vector3(x, y, z), q, s);
    this.place(id, _m, color);
  }

  propCount(id: string): number {
    return this.props.get(id)?.count ?? 0;
  }

  /* ------------------------------- build -------------------------------- */

  build(root: THREE.Object3D): void {
    const cells = new Map<string, CellGroup>();
    const groupFor = (name: string): CellGroup => {
      let g = cells.get(name);
      if (!g) {
        const opt = this.cellOptions.get(name) ?? {};
        g = {
          name,
          near: [],
          far: [],
          center: new THREE.Vector3(),
          radius: 0,
          switchDistance: opt.switchDistance ?? Infinity,
          cullDistance: opt.cullDistance ?? Infinity,
        };
        cells.set(name, g);
        this.groups.push(g);
      }
      return g;
    };

    const parts = this.resolveParts();

    /*
     * Fold the small change together before anything is built.
     *
     * A draw call costs the same whether the mesh behind it holds thirty
     * thousand triangles or twelve. Cells exist so frustum culling and level of
     * detail have something to switch, and that is only worth a call when the
     * cell holds enough of the material to be worth culling — but authoring
     * naturally produces a long tail that does not: one steel hatch in a cell,
     * one strip of carpet, one sheet of corrugated roofing. Measured on the hero
     * shot, a hundred and thirteen of two hundred and fifty-two visible meshes
     * carried four per cent of the geometry between them, and each of those was
     * being drawn again in every shadow cascade.
     *
     * So anything under the threshold is moved into one shared bucket per
     * material and shadow class, keyed to a cell that never culls. Nothing moves
     * in the frame; the geometry is identical. It just stops being addressed
     * separately.
     */
    const FOLD_TRIS = 500;
    const folded = new Map<string, Bucket>();
    for (const [key, bucket] of [...this.buckets]) {
      if (bucket.buf.empty || bucket.far) continue;
      if (bucket.buf.triangleCount >= FOLD_TRIS) continue;
      const fkey = `${bucket.material}|${bucket.shadow ? 1 : 0}`;
      let host = folded.get(fkey);
      if (!host) {
        host = {
          material: bucket.material,
          cell: 'fold',
          far: false,
          shadow: bucket.shadow,
          buf: new GeoBuf(),
        };
        folded.set(fkey, host);
      }
      host.buf.absorb(bucket.buf);
      this.buckets.delete(key);
    }
    for (const [fkey, host] of folded) {
      this.buckets.set(`${host.material}|fold|0|${host.shadow ? 1 : 0}`, host);
      void fkey;
    }

    for (const bucket of this.buckets.values()) {
      if (bucket.buf.empty) continue;
      const geo = bucket.buf.toGeometry();
      this.geometries.push(geo);
      const mesh = new THREE.Mesh(geo, this.material(bucket.material));
      mesh.name = `${bucket.cell}:${bucket.material}${bucket.far ? ':far' : ''}${bucket.shadow ? '' : ':flat'}`;
      mesh.castShadow = bucket.shadow;
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      this.applyMeta(mesh, bucket.material);
      if (bucket.far) mesh.userData.physicsIgnore = true;
      root.add(mesh);
      this.mergedMeshes++;
      this.triangles += geo.index ? geo.index.count / 3 : 0;
      const group = groupFor(bucket.cell);
      (bucket.far ? group.far : group.near).push(mesh);
    }

    /* A level of detail that saves less than this is not worth its own object. */
    const MIN_LOD_SAVING = 2500;
    for (const part of parts) {
      const { def, cell, list, colors } = part;
      const group = groupFor(`prop:${def.id}@${cell}`);
      if (def.lodDistance !== undefined) group.switchDistance = def.lodDistance;
      if (def.cullDistance !== undefined) group.cullDistance = def.cullDistance;
      const near = this.makeInstanced(def, def.geometry, list, colors, false);
      near.name = `${def.id}@${cell}`;
      root.add(near);
      group.near.push(near);
      this.instancedMeshes++;
      this.instanceCount += list.length;
      /*
       * A simplified stand-in for a forty-triangle bucket saves twenty-eight
       * triangles and costs a whole extra object, which the shadow cascades
       * then multiply. Only build one where the saving is real.
       */
      const saving = def.lodGeometry ? (part.tris - triCount(def.lodGeometry)) * list.length : 0;
      if (def.lodGeometry && saving >= MIN_LOD_SAVING) {
        const far = this.makeInstanced(def, def.lodGeometry, list, colors, true);
        far.name = `${def.id}@${cell}:far`;
        root.add(far);
        far.visible = false;
        group.far.push(far);
        this.instancedMeshes++;
      }
    }

    for (const group of this.groups) {
      _box.makeEmpty();
      for (const obj of group.near) {
        const mesh = obj as THREE.Mesh;
        if (!mesh.geometry) continue;
        mesh.geometry.computeBoundingBox();
        const bb = mesh.geometry.boundingBox;
        if (!bb) continue;
        if (mesh instanceof THREE.InstancedMesh) {
          mesh.computeBoundingBox();
          if (mesh.boundingBox) _box.union(mesh.boundingBox);
        } else {
          _box.union(bb);
        }
      }
      if (_box.isEmpty()) continue;
      _box.getBoundingSphere(_sphere);
      group.center.copy(_sphere.center);
      group.radius = _sphere.radius;
    }
  }

  /**
   * Decides how each prop definition is drawn, and absorbs the ones that are not
   * worth an object of their own into merged static geometry.
   *
   * Instances are grouped per prop definition, not per spatial cell. Grouping by
   * cell looks like the obvious choice and is a trap: a cell holding one weed and
   * one street lamp has to take the tightest cull distance of the two, so the
   * lamp vanishes at forty metres. Worse, forty definitions crossed with sixteen
   * cells is six hundred instanced meshes averaging two instances each, which is
   * the whole draw-call budget spent on culling that saves nothing on a map this
   * size. So each definition owns its level of detail, and only the definitions
   * dense enough for culling to pay are split spatially — which happens to be
   * exactly the small scatter (weeds, bricks, paper) where the saving is real.
   *
   * Runs before merging, because anything it bakes has to reach the buckets while
   * they can still be folded.
   */
  private resolveParts(): PropPart[] {
    /* Below this many instances, spatial splitting cannot pay for its calls. */
    const SPLIT_THRESHOLD = 90;
    /* A split part below this many instances is not worth its own call. */
    const MIN_PART = 30;
    /* A part holding less geometry than this is baked; see `bakeInto`. */
    const BAKE_TRIS = 900;

    const out: PropPart[] = [];
    for (const bank of this.props.values()) {
      const def = bank.def;
      if (bank.count === 0) continue;
      const tris = triCount(def.geometry);
      const parts: Array<[string, THREE.Matrix4[], THREE.Color[]]> = [];
      if (bank.count > SPLIT_THRESHOLD && bank.matrices.size > 1) {
        /*
         * Splitting is worth it for the cell that holds forty weeds and a
         * liability for the one that holds three. The thin cells are swept into a
         * single remainder part, so a scatter still gets its spatial culling
         * where the density is and does not pay four calls for the tail.
         */
        const restM: THREE.Matrix4[] = [];
        const restC: THREE.Color[] = [];
        for (const [cell, list] of bank.matrices) {
          if (list.length >= MIN_PART) parts.push([cell, list, bank.colors.get(cell)!]);
          else if (list.length > 0) {
            restM.push(...list);
            restC.push(...bank.colors.get(cell)!);
          }
        }
        if (restM.length > 0) parts.push(['rest', restM, restC]);
      } else {
        const all: THREE.Matrix4[] = [];
        const allColors: THREE.Color[] = [];
        for (const [cell, list] of bank.matrices) {
          all.push(...list);
          allColors.push(...bank.colors.get(cell)!);
        }
        parts.push(['*', all, allColors]);
      }

      for (const [cell, list, colors] of parts) {
        if (tris * list.length < BAKE_TRIS && this.bakeInto(def, list, colors)) continue;
        out.push({ def, cell, list, colors, tris });
      }
    }
    return out;
  }

  /**
   * Absorbs a handful of instances into the merged bucket for their material,
   * returning false if the prop cannot be treated this way.
   *
   * The prop keeps its geometry, its per-instance tint and its shadow behaviour;
   * what it loses is its own draw call, its own bounding volume and its level of
   * detail. That is the right trade for a prop appearing three times — it was
   * never going to be culled usefully, and a hundred and fifty triangles cannot
   * repay a call in the main pass plus one in every shadow cascade. It is the
   * wrong trade for anything numerous or large, which is why the caller gates on
   * total geometry rather than instance count.
   *
   * Baked props join the world's collision group rather than keeping the prop
   * group. Both are static and both are in every raycast mask the game uses —
   * ground probes, sight lines, the character sweep — and surface, penetration
   * and breakability all come from the material either way, so the distinction
   * has nothing left to express once the geometry is part of a merged mesh.
   */
  private bakeInto(def: PropDef, list: THREE.Matrix4[], colors: THREE.Color[]): boolean {
    if (def.transparent) return false;
    /* Wind reads object coordinates, so its geometry must stay in object space. */
    if (this.variants.get(def.material)?.localSpace) return false;
    /* Geometry that must not stop a bullet cannot join a collidable mesh. */
    if (def.collide === false) return false;
    if (def.hit && Object.keys(def.hit).some((k) => k !== 'group')) return false;
    /* Glass, water and triggers do not block sight; the world group does. */
    if (def.hit?.group !== undefined && (def.hit.group & ~(Groups.WORLD | Groups.PROP)) !== 0) {
      return false;
    }
    const shadow = def.castShadow !== false;
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      const cell = `${Math.floor(m.elements[12] / this.cellSize)},${Math.floor(m.elements[14] / this.cellSize)}`;
      const buf = this.bucket(def.material, cell, false, shadow);
      const c = colors[i];
      buf.absorbInstance(def.geometry, m, [c.r, c.g, c.b]);
    }
    this.bakedProps += list.length;
    return true;
  }

  private makeInstanced(
    def: PropDef,
    geometry: THREE.BufferGeometry,
    list: THREE.Matrix4[],
    colors: THREE.Color[],
    isFar: boolean,
  ): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(geometry, this.material(def.material), list.length);
    for (let i = 0; i < list.length; i++) {
      mesh.setMatrixAt(i, list[i]);
      mesh.setColorAt(i, colors[i]);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = def.castShadow !== false;
    mesh.receiveShadow = def.receiveShadow !== false;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    mesh.computeBoundingSphere();
    this.applyMeta(mesh, def.material, def.hit);
    if (isFar || def.collide === false) mesh.userData.physicsIgnore = true;
    this.triangles += (geometry.index ? geometry.index.count / 3 : 0) * list.length;
    return mesh;
  }

  private applyMeta(obj: THREE.Object3D, material: MatRef, extra?: HitMeta): void {
    const base = this.baseMaterial(material);
    setHitMeta(obj, {
      surface: this.lib.surfaceOf(base),
      group: Groups.WORLD,
      penetration: PENETRATION[base] ?? 0.2,
      breakable: BREAKABLE.has(base),
      ...extra,
    });
  }

  /* -------------------------- level of detail --------------------------- */

  /**
   * Swaps cells between their detailed and simplified representations. Called
   * once per frame from the world system; the cell count is small enough that
   * a linear pass costs nothing.
   */
  updateLod(cameraPosition: THREE.Vector3, lodBias: number, drawDistance: number): void {
    for (const group of this.groups) {
      if (group.radius === 0) continue;
      const d = Math.max(0, cameraPosition.distanceTo(group.center) - group.radius);
      const cull = Math.min(group.cullDistance * lodBias, drawDistance);
      if (d > cull) {
        for (const o of group.near) o.visible = false;
        for (const o of group.far) o.visible = false;
        continue;
      }
      const useFar = group.far.length > 0 && d > group.switchDistance * lodBias;
      for (const o of group.near) o.visible = !useFar;
      for (const o of group.far) o.visible = useFar;
    }
  }

  dispose(): void {
    for (const geo of this.geometries) geo.dispose();
    this.geometries.length = 0;
    for (const mat of this.materials.values()) mat.dispose();
    this.materials.clear();
    this.buckets.clear();
    this.props.clear();
    this.groups.length = 0;
  }
}
