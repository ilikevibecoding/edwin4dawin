/**
 * The shared asset store: one material set, one geometry per model, and cheap
 * instances cloned off those prototypes.
 *
 * `Object3D.clone` shares geometry and material references, so three jets cost
 * one jet's worth of vertex memory and one set of shader programs. The named
 * anchor nodes — wingtips, hardpoints, burners — have to be re-resolved after a
 * clone, which is what `resolveAircraft` does; traversal order is insertion order
 * in three.js, so the hardpoint release sequence survives cloning.
 *
 * The strike jet and its bombs are built during `init` because they are the
 * headline effect and a hitch at the moment the player calls a strike is the one
 * place a stall is unacceptable. The gunship, transport, drone and crate are built
 * on first use: they are two- to five-minute-apart events, and paying 20 ms of
 * geometry construction on boot for all of them is worse than paying it once,
 * late, under a "package inbound" callout.
 */
import * as THREE from 'three';
import type { EngineContext } from '../core/System';
import type { MaterialLibrary } from '../core/Contracts';
import { buildAirframeMaterials, type AirframeMaterials } from './models/Materials';
import {
  buildGunship,
  buildReconDrone,
  buildStrikeJet,
  buildTransport,
  disposeTree,
  type AircraftModel,
  type GunshipModel,
} from './models/Aircraft';
import {
  buildBomb,
  buildBomblet,
  buildCanister,
  buildCratePack,
  type BombletModel,
  type CratePackModel,
  type OrdnanceModel,
} from './models/Ordnance';
import { triangleCount } from './models/Loft';
import { RibbonTrails } from './Trails';

export class KillstreakAssets {
  readonly trails: RibbonTrails;
  materials: AirframeMaterials | null = null;

  private ctx: EngineContext | null = null;
  private readonly warmHolder = new THREE.Group();
  private warmed = false;
  private jetPrototype: AircraftModel | null = null;
  private bombPrototype: OrdnanceModel | null = null;
  private canisterPrototype: OrdnanceModel | null = null;
  private bombletPrototype: BombletModel | null = null;
  private dronePrototype: AircraftModel | null = null;
  private gunshipPrototype: GunshipModel | null = null;
  private transportPrototype: AircraftModel | null = null;
  private cratePrototype: CratePackModel | null = null;

  private readonly counts = new Map<string, number>();

  constructor(trailCapacity: number) {
    this.trails = new RibbonTrails(trailCapacity);
  }

  init(ctx: EngineContext): void {
    this.ctx = ctx;
    const library = (ctx.tryGet('procgen') as { materials?: MaterialLibrary } | undefined)
      ?.materials;
    this.materials = buildAirframeMaterials(library ?? null);
    this.trails.init(ctx);

    // Eager: the air strike must never hitch.
    this.jetPrototype = buildStrikeJet(this.materials);
    this.bombPrototype = buildBomb(this.materials);
    this.record('jet', this.jetPrototype.root);
    this.record('bomb', this.bombPrototype.root);
  }

  private record(name: string, root: THREE.Object3D): void {
    this.counts.set(name, triangleCount(root));
  }

  /**
   * Compiles the strike ordnance's shader programs against the live scene's
   * lighting. Called on the first frame rather than in `init` because the
   * program a material compiles to depends on the lights that are in the scene,
   * and the world is still assembling itself when this module initialises.
   *
   * Without it, three jets and nine bombs entering on the same frame is a dozen
   * first-time compiles in the one frame the sequence cannot afford to drop.
   */
  warm(): void {
    if (this.warmed) return;
    this.warmed = true;
    this.precompile(this.jetPrototype?.root, this.bombPrototype?.root);
  }

  private precompile(...roots: Array<THREE.Object3D | null | undefined>): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const holder = this.warmHolder;
    holder.clear();
    for (const root of roots) if (root) holder.add(root);
    if (holder.children.length === 0) return;
    try {
      ctx.renderer.compile(holder, ctx.camera, ctx.scene);
    } catch (err) {
      console.warn('[killstreaks] shader precompile failed', err);
    }
    holder.clear();
  }

  /** Triangle counts per prototype, for the model budget report. */
  get triangles(): ReadonlyMap<string, number> {
    return this.counts;
  }

  private get mats(): AirframeMaterials {
    if (!this.materials) throw new Error('[killstreaks] assets used before init');
    return this.materials;
  }

  // -------------------------------------------------------------------------
  // Instances
  // -------------------------------------------------------------------------

  createJet(): AircraftModel {
    this.jetPrototype ??= buildStrikeJet(this.mats);
    return resolveAircraft(this.jetPrototype.root.clone(true));
  }

  createBomb(): OrdnanceModel {
    this.bombPrototype ??= buildBomb(this.mats);
    const root = this.bombPrototype.root.clone(true);
    return { root: root as THREE.Group, dispose: () => detach(root) };
  }

  createCanister(): OrdnanceModel {
    if (!this.canisterPrototype) {
      this.canisterPrototype = buildCanister(this.mats);
      this.record('canister', this.canisterPrototype.root);
      this.precompile(this.canisterPrototype.root);
    }
    const root = this.canisterPrototype.root.clone(true);
    return { root: root as THREE.Group, dispose: () => detach(root) };
  }

  createBomblet(): BombletModel {
    if (!this.bombletPrototype) {
      this.bombletPrototype = buildBomblet(this.mats);
      this.record('bomblet', this.bombletPrototype.root);
      this.precompile(this.bombletPrototype.root);
    }
    const root = this.bombletPrototype.root.clone(true) as THREE.Group;
    const drogue = root.getObjectByName('ks:drogue') ?? new THREE.Object3D();
    return { root, drogue, dispose: () => detach(root) };
  }

  createDrone(): AircraftModel {
    if (!this.dronePrototype) {
      this.dronePrototype = buildReconDrone(this.mats);
      this.record('drone', this.dronePrototype.root);
      this.precompile(this.dronePrototype.root);
    }
    return resolveAircraft(this.dronePrototype.root.clone(true));
  }

  createGunship(): GunshipModel {
    if (!this.gunshipPrototype) {
      this.gunshipPrototype = buildGunship(this.mats);
      this.record('gunship', this.gunshipPrototype.root);
      this.precompile(this.gunshipPrototype.root);
    }
    const root = this.gunshipPrototype.root.clone(true);
    const base = resolveAircraft(root);
    const doorMount = root.getObjectByName('ks:doorMount') ?? new THREE.Object3D();
    const gun = root.getObjectByName('ks:doorGun') ?? new THREE.Object3D();
    const muzzle = root.getObjectByName('ks:muzzle') ?? new THREE.Object3D();
    const barrels = root.getObjectByName('ks:barrels') ?? new THREE.Object3D();
    return { ...base, doorMount, gun, muzzle, barrels };
  }

  createTransport(): AircraftModel {
    if (!this.transportPrototype) {
      this.transportPrototype = buildTransport(this.mats);
      this.record('transport', this.transportPrototype.root);
      this.precompile(this.transportPrototype.root);
    }
    return resolveAircraft(this.transportPrototype.root.clone(true));
  }

  createCratePack(): CratePackModel {
    if (!this.cratePrototype) {
      this.cratePrototype = buildCratePack(this.mats);
      this.record('crate', this.cratePrototype.root);
      this.precompile(this.cratePrototype.root);
    }
    const root = this.cratePrototype.root.clone(true) as THREE.Group;
    return {
      root,
      crate: root.getObjectByName('ks:crate') ?? root,
      chute: root.getObjectByName('ks:chute') ?? new THREE.Object3D(),
      halfExtents: this.cratePrototype.halfExtents.clone(),
      dispose: () => detach(root),
    };
  }

  dispose(): void {
    this.trails.dispose();
    this.jetPrototype?.dispose();
    this.bombPrototype?.dispose();
    this.canisterPrototype?.dispose();
    this.bombletPrototype?.dispose();
    this.dronePrototype?.dispose();
    this.gunshipPrototype?.dispose();
    this.transportPrototype?.dispose();
    this.cratePrototype?.dispose();
    this.jetPrototype = null;
    this.bombPrototype = null;
    this.canisterPrototype = null;
    this.bombletPrototype = null;
    this.dronePrototype = null;
    this.gunshipPrototype = null;
    this.transportPrototype = null;
    this.cratePrototype = null;
    this.materials?.dispose();
    this.materials = null;
    this.ctx = null;
  }
}

/**
 * Instances share their prototype's geometry, so releasing one must not dispose
 * it — that would pull the buffers out from under every other aircraft in the
 * air. Only the prototypes own their geometry, and only `dispose` frees it.
 */
function detach(root: THREE.Object3D): void {
  root.removeFromParent();
}

/** Rebinds the named anchors of a cloned airframe. */
function resolveAircraft(root: THREE.Object3D): AircraftModel {
  const wingtips: THREE.Object3D[] = [];
  const hardpoints: THREE.Object3D[] = [];
  const burners: THREE.Mesh[] = [];
  const spinners: THREE.Object3D[] = [];
  let strobe: THREE.Mesh | null = null;

  root.traverse((child) => {
    switch (child.name) {
      case 'ks:wingtip':
        wingtips.push(child);
        break;
      case 'ks:hardpoint':
      case 'ks:cargoDoor':
        hardpoints.push(child);
        break;
      case 'ks:burner':
        burners.push(child as THREE.Mesh);
        break;
      case 'ks:strobe':
        strobe = child as THREE.Mesh;
        break;
      case 'ks:prop':
      case 'ks:mainRotor':
      case 'ks:tailRotor':
        spinners.push(child);
        break;
      default:
        break;
    }
  });

  return {
    root: root as THREE.Group,
    wingtips,
    hardpoints,
    burners,
    strobe,
    spinners,
    dispose: () => detach(root),
  };
}
