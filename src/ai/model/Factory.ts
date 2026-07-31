/**
 * Soldier factory.
 *
 * Everything expensive is built once and shared: eight body geometries (four
 * visual variants at two levels of detail), five weapon geometries, and one
 * material per slot per variant. A spawn is then a `SkinnedMesh` over shared
 * buffers plus a fresh 22-bone hierarchy, which is the only per-instance cost
 * that cannot be avoided — bones have to be per-instance because they are what
 * the animation writes.
 *
 * The skin binds with an explicit identity bind matrix. Three recomputes
 * `bindMatrixInverse` from the mesh's world matrix every frame in the default
 * attached bind mode, so the skinning maths reduces to bone world matrices times
 * the bind inverses, and moving the parent group moves the soldier with no
 * rebinding and no double transform.
 */
import * as THREE from 'three';
import type { MaterialId, MaterialLibrary } from '../../core/Contracts';
import { assemble, Part, tint } from './GeoUtil';
import { BONE_SEGMENTS, createRig } from './Rig';
import { SLOT, SLOT_COUNT } from './Slots';
import { buildBody, type BodyDetail } from './Body';
import { buildGear } from './Gear';
import { buildWeapon, WSLOT, type WeaponProp, type WeaponShape } from './Weapon';
import { variantAt, VARIANTS, type VariantSpec } from './Variants';

export type DetailLevel = 0 | 1;

const DETAILS: readonly BodyDetail[] = [
  { scale: 1, simple: false },
  { scale: 0.5, simple: true },
];

/** Fallback colours if procgen never appears. Keeps the module standalone. */
const FALLBACK_COLOUR: Record<number, number> = {
  [SLOT.uniform]: 0x9a9070,
  [SLOT.armour]: 0x55584c,
  [SLOT.skin]: 0xb08059,
  [SLOT.gear]: 0x6d6650,
};

const SLOT_MATERIAL: Record<number, MaterialId> = {
  [SLOT.armour]: 'kevlar',
  [SLOT.skin]: 'skin',
  [SLOT.gear]: 'gear_nylon',
};

/**
 * One soldier instance.
 *
 * Both levels of detail are built up front and bound to the same skeleton, so
 * switching between them is a visibility flag rather than a rebuild. Two skinned
 * meshes over one bone hierarchy cost one extra draw call's worth of bookkeeping
 * and no extra animation work, and it means a soldier who walks towards the
 * player gains detail without a hitch.
 */
export class SoldierMesh {
  /** Currently visible level of detail. */
  detail: DetailLevel = 0;

  constructor(
    /** Placed at the soldier's feet, yaw applied. */
    readonly root: THREE.Group,
    /** High-detail skin. */
    readonly mesh: THREE.SkinnedMesh,
    /** Low-detail skin, bound to the same skeleton. */
    readonly meshLod: THREE.SkinnedMesh,
    readonly bones: THREE.Bone[],
    readonly skeleton: THREE.Skeleton,
    /** Weapon transform, written by the animator in model space. */
    readonly weaponHolder: THREE.Object3D,
    readonly weaponMesh: THREE.Mesh,
    readonly prop: WeaponProp,
    readonly variant: VariantSpec,
    readonly triangles: number,
    readonly lodTriangles: number,
  ) {}

  setDetail(level: DetailLevel): void {
    if (this.detail === level) return;
    this.detail = level;
    this.mesh.visible = level === 0;
    this.meshLod.visible = level === 1;
    // A rifle held by a man too far away to cast his own shadow has no business
    // in three cascades of shadow map on its own; it is six of his draw calls.
    this.weaponMesh.castShadow = level === 0;
  }

  /** Triangles actually submitted at the current level of detail. */
  get liveTriangles(): number {
    return this.detail === 0 ? this.triangles : this.lodTriangles;
  }
}

interface BuiltBody {
  geometry: THREE.BufferGeometry;
  slots: number[];
  triangles: number;
}

export class SoldierFactory {
  private materials: MaterialLibrary | null = null;
  private readonly bodies = new Map<number, BuiltBody>();
  private readonly weapons = new Map<string, WeaponProp>();
  private readonly slotMaterials = new Map<string, THREE.MeshStandardMaterial>();
  private weaponMaterials: THREE.MeshStandardMaterial[] | null = null;
  private readonly owned: Array<{ dispose(): void }> = [];

  /** Triangles in the highest-detail body plus its weapon, for the perf report. */
  readonly stats = { bodyTriangles: 0, lodTriangles: 0, weaponTriangles: 0, geometries: 0 };

  attach(materials: MaterialLibrary | null): void {
    if (materials && !this.materials) this.materials = materials;
  }

  /**
   * Warms the cache. Called during init so the first firefight does not pay for
   * eight geometry builds inside one frame.
   */
  prebuild(): void {
    for (let v = 0; v < VARIANTS.length; v++) {
      this.body(v, 0);
      this.body(v, 1);
    }
    for (const shape of ['rifle', 'smg', 'dmr', 'lmg', 'shotgun'] as const) this.weapon(shape);
  }

  private body(variantIndex: number, detail: DetailLevel): BuiltBody {
    const key = variantIndex * 4 + detail;
    const cached = this.bodies.get(key);
    if (cached) return cached;

    const variant = variantAt(variantIndex);
    const level = DETAILS[detail];
    const parts: Part[] = [];
    buildBody(parts, variant, level);
    buildGear(parts, variant, level);

    const assembled = assemble(parts, BONE_SEGMENTS, 2.6, detail === 1);
    const built: BuiltBody = {
      geometry: assembled.geometry,
      slots: assembled.slots,
      triangles: assembled.triangles,
    };
    this.bodies.set(key, built);
    this.owned.push(assembled.geometry);
    this.stats.geometries = this.bodies.size;
    if (detail === 0) this.stats.bodyTriangles = Math.max(this.stats.bodyTriangles, built.triangles);
    else this.stats.lodTriangles = Math.max(this.stats.lodTriangles, built.triangles);
    return built;
  }

  private weapon(shape: WeaponShape): WeaponProp {
    const cached = this.weapons.get(shape);
    if (cached) return cached;
    const prop = buildWeapon(shape, 1);
    this.weapons.set(shape, prop);
    this.owned.push(prop.geometry);
    this.stats.weaponTriangles = Math.max(this.stats.weaponTriangles, prop.triangles);
    return prop;
  }

  /**
   * One material per (slot, variant) pair, cached.
   *
   * The vertex colours baked into the geometry do the per-variant tinting, so the
   * only thing that actually differs between variants is which uniform texture
   * the cloth slot samples. Four variants therefore cost five materials, not
   * sixteen, and a squad of four is four draw calls per soldier at worst.
   */
  private slotMaterial(slot: number, variant: VariantSpec): THREE.MeshStandardMaterial {
    const id: MaterialId | undefined =
      slot === SLOT.uniform ? variant.uniform : SLOT_MATERIAL[slot];
    const key = `${slot}:${id ?? 'none'}`;
    const cached = this.slotMaterials.get(key);
    if (cached) return cached;

    let material: THREE.MeshStandardMaterial;
    const library = this.materials;
    if (library && id && library.has(id)) {
      material = library.clone(id);
    } else {
      material = new THREE.MeshStandardMaterial({
        color: FALLBACK_COLOUR[slot] ?? 0x808080,
        roughness: 0.78,
        metalness: 0.04,
      });
    }
    material.vertexColors = true;
    material.side = THREE.FrontSide;
    material.shadowSide = THREE.FrontSide;
    material.name = `ai_${key}`;
    // Cloth and webbing must not read as wet plastic under the sun.
    if (slot === SLOT.uniform || slot === SLOT.gear) {
      material.roughness = Math.max(material.roughness, 0.82);
      material.metalness = Math.min(material.metalness, 0.03);
    }
    if (slot === SLOT.skin) {
      material.roughness = Math.max(0.55, Math.min(material.roughness, 0.7));
      material.metalness = 0;
    }
    this.slotMaterials.set(key, material);
    this.owned.push(material);
    return material;
  }

  private weaponMaterialSet(): THREE.MeshStandardMaterial[] {
    if (this.weaponMaterials) return this.weaponMaterials;
    const library = this.materials;
    const make = (id: MaterialId, fallback: number, rough: number, metal: number) => {
      let m: THREE.MeshStandardMaterial;
      if (library && library.has(id)) m = library.clone(id);
      else m = new THREE.MeshStandardMaterial({ color: fallback, roughness: rough, metalness: metal });
      m.vertexColors = true;
      m.name = `ai_weapon_${id}`;
      this.owned.push(m);
      return m;
    };
    const set: THREE.MeshStandardMaterial[] = [];
    set[WSLOT.metal] = make('gun_metal', 0x2b2d30, 0.42, 0.85);
    set[WSLOT.polymer] = make('gun_polymer', 0x22242a, 0.62, 0.06);
    this.weaponMaterials = set;
    return set;
  }

  /** Builds one soldier. The only allocation-heavy operation the AI performs. */
  create(variantIndex: number, shape: WeaponShape): SoldierMesh {
    const variant = variantAt(variantIndex);
    const near = this.body(variantIndex, 0);
    const far = this.body(variantIndex, 1);
    const prop = this.weapon(shape);

    const rig = createRig();
    const root = new THREE.Group();
    root.name = 'ai_soldier';
    root.add(rig.root);

    const skin = (built: BuiltBody, shadows: boolean): THREE.SkinnedMesh => {
      const materials: THREE.Material[] = built.slots.map((slot) =>
        this.slotMaterial(slot, variant),
      );
      const mesh = new THREE.SkinnedMesh(built.geometry, materials);
      mesh.frustumCulled = true;
      mesh.castShadow = shadows;
      mesh.receiveShadow = true;
      // Fixed culling volume. Three computes a skinned bounding sphere from
      // whatever pose it first sees and then never revisits it, which for a
      // procedurally posed rig is a lottery; a generous hand-authored sphere in
      // model space is both correct for every pose and free.
      mesh.boundingSphere = new THREE.Sphere(CULL_CENTRE, CULL_RADIUS);
      root.add(mesh);
      mesh.bind(rig.skeleton, IDENTITY_BIND);
      return mesh;
    };

    const mesh = skin(near, true);
    const meshLod = skin(far, false);
    meshLod.visible = false;

    const weaponHolder = new THREE.Object3D();
    weaponHolder.name = 'ai_weapon_holder';
    const weaponMesh = new THREE.Mesh(prop.geometry, this.weaponMaterialSet());
    weaponMesh.castShadow = true;
    weaponMesh.frustumCulled = false;
    weaponHolder.add(weaponMesh);
    root.add(weaponHolder);

    return new SoldierMesh(
      root,
      mesh,
      meshLod,
      rig.bones,
      rig.skeleton,
      weaponHolder,
      weaponMesh,
      prop,
      variant,
      near.triangles + prop.triangles,
      far.triangles + prop.triangles,
    );
  }

  /** Returns an instance's per-instance resources. Shared buffers stay alive. */
  release(instance: SoldierMesh): void {
    instance.root.removeFromParent();
    instance.skeleton.dispose();
  }

  dispose(): void {
    for (const item of this.owned) item.dispose();
    this.owned.length = 0;
    this.bodies.clear();
    this.weapons.clear();
    this.slotMaterials.clear();
    this.weaponMaterials = null;
  }
}

const IDENTITY_BIND = /* @__PURE__ */ new THREE.Matrix4();
const CULL_CENTRE = /* @__PURE__ */ new THREE.Vector3(0, 0.95, 0);
const CULL_RADIUS = 1.6;

/** Slot count re-exported so callers can size material arrays. */
export const MATERIAL_SLOTS = SLOT_COUNT;

/** Neutral tint, exported for props that want the model's colour space. */
export const NEUTRAL_TINT = /* @__PURE__ */ tint(0xffffff);
