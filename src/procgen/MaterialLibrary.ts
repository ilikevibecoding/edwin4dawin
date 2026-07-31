import * as THREE from 'three';
import type { MaterialId, MaterialLibrary } from '../core/Contracts';
import type { QualityTier } from '../core/Config';
import type { SurfaceType } from '../core/GameTypes';
import { TextureBaker } from './TextureBaker';
import { MATERIAL_ORDER, MATERIAL_SPECS } from './generators';
import { RESOLUTION_SCALE, type MaterialParams, type MaterialSpec } from './generators/types';
import {
  MACRO_BAKE_FRAGMENT,
  MACRO_FRAGMENT_GLSL,
  MACRO_FRAGMENT_PARS_GLSL,
  MACRO_TEXTURE_SIZE,
  MACRO_VERTEX_GLSL,
} from './shaders/macro.glsl';

/**
 * Anything smaller than this stops carrying the mid-frequency structure the
 * generators are built around, at which point a material reads as flat colour.
 */
const MIN_TEXTURE_SIZE = 128;

/**
 * Per-material UV scaling for `tiled()`.
 *
 * A render-target texture cannot be cloned — the GL handle lives in
 * renderer-private state keyed by the texture object, so a clone samples as
 * black — which rules out the usual `texture.repeat` route. Scaling the UV
 * varyings instead keeps every tiled variant sharing one set of textures and
 * one extra shader program.
 */
const UV_SCALE_GLSL = /* glsl */ `
#ifdef USE_MAP
  vMapUv *= uProcgenUvScale;
#endif
#ifdef USE_NORMALMAP
  vNormalMapUv *= uProcgenUvScale;
#endif
#ifdef USE_ROUGHNESSMAP
  vRoughnessMapUv *= uProcgenUvScale;
#endif
#ifdef USE_METALNESSMAP
  vMetalnessMapUv *= uProcgenUvScale;
#endif
#ifdef USE_AOMAP
  vAoMapUv *= uProcgenUvScale;
#endif
#ifdef USE_EMISSIVEMAP
  vEmissiveMapUv *= uProcgenUvScale;
#endif
#ifdef USE_ALPHAMAP
  vAlphaMapUv *= uProcgenUvScale;
#endif
#ifdef USE_TRANSMISSIONMAP
  vTransmissionMapUv *= uProcgenUvScale;
#endif
#ifdef USE_THICKNESSMAP
  vThicknessMapUv *= uProcgenUvScale;
#endif
`;

/**
 * Smallest tile, in metres, that gets the world-space macro layer.
 *
 * The layer is anchored to world space, so anything that moves through it would
 * swim: a weapon, a uniform, a character. Tile size separates the two cleanly
 * without a second list to keep in step — a material authored for a 20 cm repeat
 * is on something held or worn, one authored for two metres is on the level.
 */
const MACRO_MIN_TILE_METERS = 1.05;

/** Surfaces the layer would only make worse: cloth, foliage, glass, water. */
const MACRO_EXCLUDED_SURFACES: ReadonlySet<SurfaceType> = new Set<SurfaceType>([
  'fabric',
  'foliage',
  'glass',
  'water',
]);

/**
 * Metres over which the drift completes one cycle, and the dado's reach.
 *
 * It has to be longer than the tile repeat, so it reads as the surface varying
 * rather than as more texture, and shorter than a wall, or the whole wall sits at
 * one value and nothing is gained: measured across a facade, a 27 m period moved
 * the warm/cool spread of the block means by 0.2 of 255. The consumer also
 * samples this field at four times the frequency, which puts a second component
 * at a couple of metres.
 */
const MACRO_DRIFT_METERS = 11;
const MACRO_DADO_HEIGHT = 1.15;
const MACRO_STREAK_METERS = 3.4;

interface MacroStrength {
  tone: number;
  hue: number;
  grime: number;
  streak: number;
}

/**
 * Per-tier strength. `low` gets nothing at all: the layer is three dependent
 * texture fetches on every opaque pixel in the frame, which is not a trade a
 * machine already struggling with the base pass should be asked to make.
 */
const MACRO_STRENGTH: Record<QualityTier, MacroStrength | null> = {
  ultra: { tone: 0.42, hue: 0.17, grime: 0.85, streak: 0.5 },
  high: { tone: 0.42, hue: 0.17, grime: 0.85, streak: 0.5 },
  medium: { tone: 0.36, hue: 0.14, grime: 0.7, streak: 0.4 },
  low: null,
};

const UV_SCALE_CACHE_KEY = 'procgen-uv-scale';

interface BakedMaps {
  albedo: THREE.Texture | null;
  orm: THREE.Texture | null;
  normal: THREE.Texture | null;
  size: number;
}

export interface MaterialLibraryStats {
  /** Materials with textures resident. */
  baked: number;
  total: number;
  textures: number;
  bytes: number;
  passes: number;
  programs: number;
}

export interface MaterialLibraryOptions {
  renderer: THREE.WebGLRenderer;
  /** `QualityConfig.textureResolution`; the hero class bakes at exactly this. */
  baseResolution: number;
  anisotropy: number;
  tier: QualityTier;
}

/** A material handed out earlier, remembered so a re-bake can repoint its maps. */
interface Derived {
  id: MaterialId;
  material: THREE.MeshStandardMaterial;
}

const EMPTY_MAPS: BakedMaps = { albedo: null, orm: null, normal: null, size: 0 };

export class MaterialLibraryImpl implements MaterialLibrary {
  private renderer: THREE.WebGLRenderer | null = null;
  private baker: TextureBaker | null = null;
  private baseResolution = 1024;
  private anisotropy = 1;

  private readonly materials = new Map<MaterialId, THREE.MeshStandardMaterial>();
  private readonly maps = new Map<MaterialId, BakedMaps>();
  private readonly variants = new Map<string, Derived>();
  private readonly clones: Derived[] = [];

  private environment: THREE.Texture | null = null;

  private tier: QualityTier = 'high';
  private macroStrength: MacroStrength | null = null;
  private macroMap: THREE.Texture | null = null;
  /**
   * One uniform object shared by every patched material. Three assigns whatever
   * `onBeforeCompile` puts on the shader by reference, so the whole scene reads
   * these three and retuning the layer costs no per-material work.
   */
  private readonly macroUniforms: Record<string, THREE.IUniform> = {
    obMacroMap: { value: null },
    obMacroTone: { value: new THREE.Vector4(0, 0, 0, 0) },
    obMacroShape: {
      value: new THREE.Vector4(
        1 / MACRO_DRIFT_METERS,
        MACRO_DADO_HEIGHT,
        0,
        1 / MACRO_STREAK_METERS,
      ),
    },
  };

  /**
   * Binds the library to a renderer and bakes anything already handed out.
   *
   * The library is constructed before the engine hands over a context, so a
   * material fetched that early exists untextured and is filled in here; the
   * instance a mesh captured stays valid either way.
   */
  attach(options: MaterialLibraryOptions): void {
    this.renderer = options.renderer;
    this.baseResolution = Math.max(MIN_TEXTURE_SIZE, options.baseResolution);
    this.anisotropy = Math.max(1, options.anisotropy);
    this.baker = new TextureBaker(this.renderer, this.anisotropy);
    this.buildMacroLayer(options.tier);

    for (const [id, material] of this.materials) {
      const spec = MATERIAL_SPECS.get(id);
      if (!spec) continue;
      if (!this.maps.has(id)) {
        this.assignMaps(material, spec.material ?? {}, this.bakeMaps(id, spec));
      }
      // Materials handed out before the renderer arrived have no patch yet.
      applyShaderPatches(material, this.patchFor(spec, material));
    }
    this.syncDerived();
  }

  /**
   * Bakes the shared macro field and sets the layer's per-tier strength.
   *
   * The field is one 256px texture for the whole game — it is sampled at world
   * scale, so its own resolution only has to survive a few metres of stretch, and
   * a second copy per material would buy nothing.
   */
  private buildMacroLayer(tier: QualityTier): void {
    this.tier = tier;
    this.macroStrength = MACRO_STRENGTH[tier];
    const strength = this.macroStrength;
    const tone = this.macroUniforms.obMacroTone.value as THREE.Vector4;
    tone.set(strength?.tone ?? 0, strength?.hue ?? 0, strength?.grime ?? 0, strength?.streak ?? 0);
    if (!strength || this.macroMap || !this.baker) return;

    this.macroMap = this.baker.bake(
      MACRO_BAKE_FRAGMENT,
      {
        uTexel: { value: new THREE.Vector2(1 / MACRO_TEXTURE_SIZE, 1 / MACRO_TEXTURE_SIZE) },
        uSeed: { value: 3.17 },
      },
      MACRO_TEXTURE_SIZE,
      { name: 'macroField', colorSpace: THREE.NoColorSpace },
    );
    this.macroUniforms.obMacroMap.value = this.macroMap;
  }

  /**
   * Whether a material is on the level rather than on a person, and so whether a
   * layer anchored to world space belongs on it.
   */
  private patchFor(spec: MaterialSpec, material: THREE.MeshStandardMaterial): ShaderPatch | null {
    const uvScale = material.userData.procgenUvScale as THREE.Vector2 | undefined;
    const macro =
      this.macroStrength !== null &&
      this.macroMap !== null &&
      spec.tileMeters >= MACRO_MIN_TILE_METERS &&
      spec.clamp !== true &&
      material.transparent !== true &&
      !MACRO_EXCLUDED_SURFACES.has(spec.surface);
    if (!macro && !uvScale) return null;
    return { uvScale: uvScale ?? null, macro: macro ? this.macroUniforms : null };
  }

  // -------------------------------------------------------------------------
  // MaterialLibrary
  // -------------------------------------------------------------------------

  get(id: MaterialId): THREE.MeshStandardMaterial {
    const existing = this.materials.get(id);
    if (existing) return existing;
    return this.build(id);
  }

  clone(id: MaterialId): THREE.MeshStandardMaterial {
    const material = this.get(id).clone();
    material.name = `${id}:clone`;
    // three's clone drops the compile hook, so every derived material has to be
    // patched again or it silently loses the macro layer its base has.
    const spec = MATERIAL_SPECS.get(id);
    if (spec) applyShaderPatches(material, this.patchFor(spec, material));
    this.clones.push({ id, material });
    return material;
  }

  tiled(id: MaterialId, repeatX: number, repeatY: number): THREE.MeshStandardMaterial {
    const rx = Math.max(1e-3, repeatX);
    const ry = Math.max(1e-3, repeatY);
    if (Math.abs(rx - 1) < 1e-4 && Math.abs(ry - 1) < 1e-4) return this.get(id);

    const key = `${id}|${rx.toFixed(3)}|${ry.toFixed(3)}`;
    const cached = this.variants.get(key);
    if (cached) return cached.material;

    const material = this.get(id).clone();
    material.name = `${id}:tiled(${rx},${ry})`;
    material.userData.procgenUvScale = new THREE.Vector2(rx, ry);
    const spec = MATERIAL_SPECS.get(id);
    applyShaderPatches(
      material,
      spec
        ? this.patchFor(spec, material)
        : { uvScale: material.userData.procgenUvScale as THREE.Vector2, macro: null },
    );
    this.variants.set(key, { id, material });
    return material;
  }

  has(id: MaterialId): boolean {
    return MATERIAL_SPECS.has(id);
  }

  surfaceOf(id: MaterialId): SurfaceType {
    return MATERIAL_SPECS.get(id)?.surface ?? 'concrete';
  }

  debugList(): Array<{ id: string; maps: string[] }> {
    return MATERIAL_ORDER.map((id) => {
      const spec = MATERIAL_SPECS.get(id) as MaterialSpec;
      const baked = this.maps.get(id);
      const names: string[] = [];
      if (baked) {
        if (baked.albedo) names.push('map');
        if (baked.normal) names.push('normalMap');
        if (baked.orm) {
          names.push('roughnessMap', 'metalnessMap');
          names.push(spec.material?.transmissionFromAo ? 'transmissionMap' : 'aoMap');
        }
        if (spec.material?.emissiveFromAlbedo) names.push('emissiveMap');
        names.push(`${baked.size}px`);
      } else {
        names.push('pending', `${this.sizeFor(spec)}px`);
      }
      return { id, maps: names };
    });
  }

  dispose(): void {
    for (const material of this.materials.values()) material.dispose();
    for (const derived of this.variants.values()) derived.material.dispose();
    for (const derived of this.clones) derived.material.dispose();
    this.materials.clear();
    this.variants.clear();
    this.maps.clear();
    this.clones.length = 0;
    this.baker?.dispose();
    this.baker = null;
    this.renderer = null;
    this.macroMap = null;
    this.macroUniforms.obMacroMap.value = null;
  }

  // -------------------------------------------------------------------------
  // Baking
  // -------------------------------------------------------------------------

  /** Ids the level cannot be shown without; everything else bakes on demand. */
  eagerIds(): MaterialId[] {
    return MATERIAL_ORDER.filter((id) => MATERIAL_SPECS.get(id)?.eager === true);
  }

  lazyIds(): MaterialId[] {
    return MATERIAL_ORDER.filter((id) => MATERIAL_SPECS.get(id)?.eager !== true);
  }

  /** Assigns the IBL source to every existing and future material. */
  setEnvironment(map: THREE.Texture | null): void {
    this.environment = map;
    for (const material of this.everyMaterial()) {
      material.envMap = map;
      material.needsUpdate = true;
    }
  }

  /**
   * Retunes the macro layer for a new tier, and installs or removes it.
   *
   * Turning it off is a recompile of every architectural material, which is why
   * the field itself is kept baked: coming back costs the recompile again but not
   * the bake, and the texture is 256 KB.
   */
  setDetailTier(tier: QualityTier): void {
    const before = this.macroStrength;
    this.buildMacroLayer(tier);
    if ((before === null) === (this.macroStrength === null)) return;
    for (const id of this.maps.keys()) {
      const spec = MATERIAL_SPECS.get(id);
      const material = this.materials.get(id);
      if (spec && material) applyShaderPatches(material, this.patchFor(spec, material));
    }
    this.syncDerived();
  }

  /**
   * Re-bakes every resident material at a new base resolution, repointing the
   * maps of the existing material objects rather than replacing them: meshes
   * across the whole scene already hold these instances.
   */
  setResolution(baseResolution: number, anisotropy: number): void {
    const nextBase = Math.max(MIN_TEXTURE_SIZE, baseResolution);
    const nextAniso = Math.max(1, anisotropy);
    if (nextBase === this.baseResolution && nextAniso === this.anisotropy) return;

    this.baseResolution = nextBase;
    this.anisotropy = nextAniso;
    const previous = this.baker;
    const renderer = this.renderer;
    if (!previous || !renderer) return;

    const resident = [...this.maps.keys()];
    this.baker = new TextureBaker(renderer, nextAniso);
    this.maps.clear();
    // The field belonged to the baker that is about to be disposed.
    this.macroMap = null;
    this.buildMacroLayer(this.tier);

    for (const id of resident) {
      const spec = MATERIAL_SPECS.get(id);
      const material = this.materials.get(id);
      if (!spec || !material) continue;
      this.assignMaps(material, spec.material ?? {}, this.bakeMaps(id, spec));
      material.needsUpdate = true;
    }
    this.syncDerived();

    // Only safe once nothing references the old textures any more.
    previous.dispose();
  }

  /** Repoints tiled variants and clones at their base material's current maps. */
  private syncDerived(): void {
    for (const derived of [...this.variants.values(), ...this.clones]) {
      const spec = MATERIAL_SPECS.get(derived.id);
      const baked = this.maps.get(derived.id);
      if (!spec || !baked) continue;
      this.assignMaps(derived.material, spec.material ?? {}, baked);
      applyShaderPatches(derived.material, this.patchFor(spec, derived.material));
    }
  }

  /** Every material instance this library has ever handed out. */
  private *everyMaterial(): Generator<THREE.MeshStandardMaterial> {
    yield* this.materials.values();
    for (const derived of this.variants.values()) yield derived.material;
    for (const derived of this.clones) yield derived.material;
  }

  get stats(): MaterialLibraryStats {
    let textures = 0;
    for (const baked of this.maps.values()) {
      if (baked.albedo) textures++;
      if (baked.orm) textures++;
      if (baked.normal) textures++;
    }
    return {
      baked: this.maps.size,
      total: MATERIAL_ORDER.length,
      textures,
      bytes: this.baker?.textureBytes ?? 0,
      passes: this.baker?.passCount ?? 0,
      programs: this.baker?.programCount ?? 0,
    };
  }

  /** Bytes the full set would occupy once every material has been baked. */
  projectedBytes(): number {
    let total = 0;
    for (const id of MATERIAL_ORDER) {
      const spec = MATERIAL_SPECS.get(id) as MaterialSpec;
      const size = this.sizeFor(spec);
      const count = 2 + (spec.maps?.normal === false ? 0 : 1);
      total += Math.round(size * size * 4 * 1.3334) * count;
    }
    return total;
  }

  private sizeFor(spec: MaterialSpec): number {
    const scaled = this.baseResolution * RESOLUTION_SCALE[spec.res];
    return THREE.MathUtils.clamp(
      Math.pow(2, Math.round(Math.log2(scaled))),
      MIN_TEXTURE_SIZE,
      this.baseResolution,
    );
  }

  private build(id: MaterialId): THREE.MeshStandardMaterial {
    const spec = MATERIAL_SPECS.get(id);
    if (!spec) {
      // The contract allows any MaterialId, so a missing generator must still
      // yield a usable material rather than throwing mid-frame.
      const fallback = new THREE.MeshStandardMaterial({ color: 0x7a7a78, roughness: 0.85 });
      fallback.name = `${id}:missing`;
      this.materials.set(id, fallback);
      return fallback;
    }

    const baked = this.bakeMaps(id, spec);
    const material = this.createMaterial(spec, baked);
    material.name = id;
    applyShaderPatches(material, this.patchFor(spec, material));
    this.materials.set(id, material);
    return material;
  }

  private bakeMaps(id: MaterialId, spec: MaterialSpec): BakedMaps {
    const baker = this.baker;
    if (!baker) return EMPTY_MAPS;

    const size = this.sizeFor(spec);
    const wrap = spec.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
    const wantAlbedo = spec.maps?.albedo !== false;
    const wantOrm = spec.maps?.orm !== false;
    const wantNormal = spec.maps?.normal !== false;

    const uniforms: Record<string, THREE.IUniform> = {
      uSeed: { value: seedOf(id) },
      ...(spec.uniforms ?? {}),
    };

    const set = baker.bakeSurface(spec.body, uniforms, size, id, wrap);
    const normal = wantNormal
      ? baker.normalFromHeight(
          set.orm,
          size,
          spec.relief,
          spec.reliefWide ?? 0.3,
          `${id}:normal`,
          wrap,
        )
      : null;

    const baked: BakedMaps = {
      albedo: wantAlbedo ? set.albedo : null,
      orm: wantOrm ? set.orm : null,
      normal,
      size,
    };
    this.maps.set(id, baked);
    return baked;
  }

  /** Binds the baked set to a material; shared by first build and re-bake. */
  private assignMaps(
    material: THREE.MeshStandardMaterial,
    params: MaterialParams,
    baked: BakedMaps,
  ): void {
    material.map = baked.albedo;

    material.normalMap = baked.normal;
    if (baked.normal) {
      const scale = params.normalScale ?? 1;
      material.normalScale.set(scale, scale);
    }

    material.roughnessMap = baked.orm;
    material.metalnessMap = baked.orm;
    const asTransmission =
      baked.orm !== null &&
      params.transmissionFromAo === true &&
      material instanceof THREE.MeshPhysicalMaterial;
    if (asTransmission) {
      (material as THREE.MeshPhysicalMaterial).transmissionMap = baked.orm;
      material.aoMap = null;
    } else {
      material.aoMap = baked.orm;
      if (baked.orm) material.aoMapIntensity = params.aoMapIntensity ?? 1;
    }

    if (params.emissiveFromAlbedo && baked.albedo) {
      material.emissiveMap = baked.albedo;
      material.emissive.set(params.emissive ?? 0xffffff);
      material.emissiveIntensity = params.emissiveIntensity ?? 1;
    }
  }

  private createMaterial(spec: MaterialSpec, baked: BakedMaps): THREE.MeshStandardMaterial {
    const params: MaterialParams = spec.material ?? {};
    const physical = params.physical;

    const material = physical
      ? new THREE.MeshPhysicalMaterial()
      : new THREE.MeshStandardMaterial();

    material.color.set(params.color ?? 0xffffff);
    material.roughness = params.roughness ?? 1;
    material.metalness = params.metalness ?? (baked.orm ? 1 : 0);
    material.envMapIntensity = params.envMapIntensity ?? 1;
    material.envMap = this.environment;

    this.assignMaps(material, params, baked);

    if (!params.emissiveFromAlbedo && params.emissive !== undefined) {
      material.emissive.set(params.emissive);
      material.emissiveIntensity = params.emissiveIntensity ?? 1;
    }

    if (params.transparent !== undefined) material.transparent = params.transparent;
    if (params.opacity !== undefined) material.opacity = params.opacity;
    if (params.alphaTest !== undefined) material.alphaTest = params.alphaTest;
    if (params.side !== undefined) material.side = params.side;
    if (params.depthWrite !== undefined) material.depthWrite = params.depthWrite;
    if (params.blending !== undefined) material.blending = params.blending;
    if (params.flatShading !== undefined) material.flatShading = params.flatShading;
    if (params.dithering !== undefined) material.dithering = params.dithering;
    if (params.toneMapped !== undefined) material.toneMapped = params.toneMapped;
    if (params.polygonOffset !== undefined) {
      material.polygonOffset = params.polygonOffset;
      material.polygonOffsetFactor = params.polygonOffsetFactor ?? -1;
      material.polygonOffsetUnits = -1;
    }

    if (physical && material instanceof THREE.MeshPhysicalMaterial) {
      if (physical.clearcoat !== undefined) material.clearcoat = physical.clearcoat;
      if (physical.clearcoatRoughness !== undefined) {
        material.clearcoatRoughness = physical.clearcoatRoughness;
      }
      if (physical.transmission !== undefined) material.transmission = physical.transmission;
      if (physical.thickness !== undefined) material.thickness = physical.thickness;
      if (physical.ior !== undefined) material.ior = physical.ior;
      if (physical.reflectivity !== undefined) material.reflectivity = physical.reflectivity;
      if (physical.specularIntensity !== undefined) {
        material.specularIntensity = physical.specularIntensity;
      }
      if (physical.sheen !== undefined) material.sheen = physical.sheen;
      if (physical.sheenRoughness !== undefined) material.sheenRoughness = physical.sheenRoughness;
      if (physical.sheenColor !== undefined) material.sheenColor.set(physical.sheenColor);
      if (physical.iridescence !== undefined) material.iridescence = physical.iridescence;
      if (physical.attenuationColor !== undefined) {
        material.attenuationColor.set(physical.attenuationColor);
      }
      if (physical.attenuationDistance !== undefined) {
        material.attenuationDistance = physical.attenuationDistance;
      }
    }

    return material;
  }
}

/**
 * Stable per-material seed so a re-bake at a different quality tier produces the
 * same surface rather than a different one.
 */
function seedOf(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 8) & 0xffff) / 6553.6;
}

interface ShaderPatch {
  uvScale: THREE.Vector2 | null;
  macro: Record<string, THREE.IUniform> | null;
}

/**
 * Installs the UV scaling and the macro layer through a single compile hook.
 *
 * Both have to share one hook because three allows a material only one, and a
 * tiled architectural surface needs both. The cache key has to enumerate which
 * of them ran: it is what three uses to decide two materials can share a
 * program, and the injected source is invisible to it.
 */
function applyShaderPatches(
  material: THREE.MeshStandardMaterial,
  patch: ShaderPatch | null,
): void {
  if (!patch) {
    if (material.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile) {
      material.onBeforeCompile = THREE.Material.prototype.onBeforeCompile;
      material.customProgramCacheKey = THREE.Material.prototype.customProgramCacheKey;
      material.needsUpdate = true;
    }
    return;
  }

  const { uvScale, macro } = patch;
  material.onBeforeCompile = (shader) => {
    if (uvScale) {
      shader.uniforms.uProcgenUvScale = { value: uvScale };
      shader.vertexShader = `uniform vec2 uProcgenUvScale;\n${shader.vertexShader}`.replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>\n${UV_SCALE_GLSL}`,
      );
    }
    if (macro) {
      for (const [name, uniform] of Object.entries(macro)) shader.uniforms[name] = uniform;
      shader.vertexShader = `varying vec3 vObMacroWorld;\n${shader.vertexShader}`.replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>\n${MACRO_VERTEX_GLSL}`,
      );
      shader.fragmentShader = `${MACRO_FRAGMENT_PARS_GLSL}\n${shader.fragmentShader}`.replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>\n${MACRO_FRAGMENT_GLSL}`,
      );
    }
  };
  const key = `procgen|${uvScale ? 'uv' : ''}|${macro ? 'macro' : ''}`;
  material.customProgramCacheKey = () => key;
  material.needsUpdate = true;
}
