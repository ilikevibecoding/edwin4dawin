import * as THREE from 'three';
import { Layers, type GameContext } from '../core/GameContext';
import type { ILighting, IMaterialLibrary, MaterialName } from '../core/Interfaces';
import type { AssemblyMaterials, MatKey } from './parts/Assembly';

/**
 * The viewmodel's own world: a root that tracks the camera, a three-point light
 * rig, and the material set the gun toolkit draws with.
 *
 * The rig is **shaping only**. `LightingSystem` scans this scene exactly as it
 * scans the world — sun, sky ambient, the clustered locals and the prefiltered
 * environment all reach the weapon already — so a rig sized to *illuminate* the
 * gun would be a second sun, and on a metal at 0.07 F0 a second sun is not a
 * brighter gun but a white one: the specular lobe of every face pointing
 * between a light and the eye clips, and the whole model turns into one
 * highlight. So the level here is a low fraction of the world's key, enough to
 * put a rim on the silhouette and open the shadow side, and no more.
 *
 * Units are the engine's: one unit is one kilolux. See the header of
 * `src/render/LightingSystem.ts`.
 */

const MATERIALS: Record<MatKey, MaterialName> = {
  metal: 'gun_metal',
  polymer: 'gun_polymer',
  wood: 'wood_planks',
};

/**
 * Fraction of the library's authored tile size the weapon lays its UVs out at.
 *
 * The library authors `gun_metal` for a 300 mm tile, which is the right density
 * for something you walk past. A red dot housing is 35 mm across and fills a
 * third of the screen when aimed, so at the authored scale one texel covers two
 * screen pixels and the machining grain stops being grain: it becomes a layer
 * of white noise sitting on every surface, and it is the single loudest thing
 * in an ADS frame. Shrinking the tile pushes the grain back under the pixel
 * grid where the mip chain averages it into a finish.
 */
const TILE: Record<MatKey, number> = {
  metal: 0.13,
  polymer: 0.16,
  // Wood is the exception: the grain is the point, and a stock is big enough to
  // show it. Only pulled in enough to keep a plank's worth of figure off a
  // 120 mm fore-end.
  wood: 0.4,
};

const _lum = new THREE.Color();

export class Viewmodel implements AssemblyMaterials {
  /** Tracks the camera; everything the player holds hangs off this. */
  readonly root = new THREE.Group();
  private readonly cache = new Map<MatKey, THREE.Material>();
  private readonly key = new THREE.DirectionalLight(0xfff0dc, 2.2);
  private readonly fill = new THREE.DirectionalLight(0x9fc0e8, 0.8);
  private readonly rim = new THREE.DirectionalLight(0xdce8ff, 2.6);
  private readonly ambient = new THREE.HemisphereLight(0x8fb0d8, 0x2a2622, 0.35);
  private readonly library: IMaterialLibrary | undefined;

  /** Overall rig level, as a multiplier. Exposed for the tuning harness. */
  gain = 1;
  /**
   * Luminance of the world's key light, in the engine's kilonits. Read by the
   * optics so an emissive reticle can hold a constant contrast against the
   * scene instead of against an absolute radiance.
   */
  keyLevel = 25;

  constructor(private readonly ctx: GameContext) {
    this.library = ctx.tryGet<IMaterialLibrary>('materials');
    this.root.name = 'ViewmodelRoot';
    this.root.matrixAutoUpdate = false;
    this.root.layers.set(Layers.VIEWMODEL);
    ctx.viewmodelScene.add(this.root);

    /* Key from over the player's left shoulder, fill from below and right, rim
       from behind and above so the silhouette separates from whatever is
       behind it. Parented to the tracking root, not to the scene: a rig fixed
       in world space is a rig whose key sweeps across the weapon every time the
       player turns, which on a flat stock is a specular lobe the size of the
       part arriving and leaving for no reason the player can see. Hung off the
       camera it is what it is meant to be — studio lighting for the one object
       that never leaves the frame. */
    this.key.position.set(-0.62, 0.74, 0.5);
    this.fill.position.set(0.78, -0.3, 0.55);
    this.rim.position.set(0.3, 0.62, -1);
    for (const light of [this.key, this.fill, this.rim]) {
      light.castShadow = false;
      light.layers.set(Layers.VIEWMODEL);
      light.target.position.set(0, 0, -1);
      this.root.add(light.target);
      this.root.add(light);
    }
    this.ambient.layers.set(Layers.VIEWMODEL);
    this.root.add(this.ambient);
  }

  material(key: MatKey): THREE.Material {
    let mat = this.cache.get(key);
    if (mat) return mat;
    const name = MATERIALS[key];
    const source = this.library?.clone(name);
    const std = (source ??
      new THREE.MeshStandardMaterial({ color: 0x33363a, roughness: 0.55, metalness: 0.85 })) as
      THREE.MeshStandardMaterial;
    // Vertex colour carries both the per-part tint and the baked occlusion, so
    // one merged mesh can be a parkerised receiver and an anodised rail at once.
    std.vertexColors = true;
    std.name = `viewmodel:${name}`;
    if (key === 'metal') {
      // Parkerising is matte but not dead: the speculars along a chamfer are
      // what make the edge read, so this is pulled down from the world's
      // setting — but only a little, and with a floor.
      std.roughness = Math.min(1, Math.max(0.28, std.roughness * 0.82));
      std.envMapIntensity = 1.15;
    } else if (key === 'polymer') {
      /* Left rough on purpose. Glass-filled nylon furniture is close to
         Lambertian, and the parts made of it are the biggest flat faces on the
         weapon — a stock's cheek plate is 100 mm of unbroken surface pointed
         wherever the pose points it. Give that a tight specular lobe and the
         whole face lights at once, which is not a highlight but a white
         rectangle, and it was the brightest thing in the hip-fire frame. */
      std.roughness = Math.min(1, Math.max(0.62, std.roughness));
      std.envMapIntensity = 0.85;
    } else {
      std.roughness = Math.min(1, Math.max(0.5, std.roughness * 0.9));
    }
    // The normal map is authored for the same 300 mm tile as the albedo, and at
    // the density a viewmodel needs it turns into a boil of per-texel facets
    // that fight the chamfers for the eye. Half strength keeps the tooling
    // marks and gives the geometry the silhouette back.
    if (std.normalScale) std.normalScale.multiplyScalar(0.55);
    this.cache.set(key, std);
    return std;
  }

  tileSize(key: MatKey): number {
    return (this.library?.tileSize(MATERIALS[key]) ?? 0.3) * TILE[key];
  }

  /**
   * Keeps the weapon glued to the eye and the rig in step with the world's key
   * light. Called from `lateUpdate`, after the player has composed the camera.
   */
  sync(ctx: GameContext): void {
    const camera = ctx.camera;
    const vm = ctx.viewmodelCamera;
    camera.updateMatrixWorld();
    // The player controller does this too, but the harness poses the camera
    // with the controller disabled and the weapon still has to follow.
    vm.position.copy(camera.position);
    vm.quaternion.copy(camera.quaternion);
    vm.updateMatrixWorld();
    this.root.matrix.copy(camera.matrixWorld);
    this.root.matrixWorldNeedsUpdate = true;

    const lighting = ctx.tryGet<ILighting>('lighting');
    if (lighting) {
      _lum.copy(lighting.sun.color);
      const l = _lum.r * 0.2126 + _lum.g * 0.7152 + _lum.b * 0.0722;
      this.keyLevel = l;
      /* Half the world's key, tracking it so the weapon holds the same relation
         to the scene at any hour. Measured rather than guessed: with the rig
         off, the gun comes back at 0.19 of display luminance against a street
         at 0.31 — a silhouette — and it needs to sit a little *above* the scene
         to read as the thing the player is holding. This lands it at 0.37 with
         no clipped speculars. The constant is the night floor, where the
         exposure opens up and a few lux is the difference between a readable
         silhouette and a black cut-out. */
      const k = Math.min(70, l * 0.48 + 0.06) * this.gain;
      // Fill and ambient stay low on purpose. A rig that lifts the shadow side
      // as far as the key makes a black rifle into a grey one; what reads is
      // the *ratio*, so the shadow side is left a stop and a half down and the
      // rim does the separating.
      this.key.intensity = k;
      this.fill.intensity = k * 0.22;
      this.rim.intensity = k * 0.7;
      this.ambient.intensity = k * 0.16;
    }
  }

  dispose(): void {
    for (const mat of this.cache.values()) mat.dispose();
    this.cache.clear();
    this.ctx.viewmodelScene.remove(this.root);
  }
}
