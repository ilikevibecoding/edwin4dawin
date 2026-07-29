import * as THREE from 'three';
import { buildLightingChunks, type LightingShaderConfig } from '../../shaders/lighting/inject.glsl';

/**
 * Splices the rig into every lit material in the scene, and keeps it spliced.
 *
 * The material library owns `onBeforeCompile` on the same materials for its
 * parallax and detail-normal patch, and it *assigns* rather than composes —
 * which is the right call for a single owner and fatal for two. So this wraps
 * whatever callback is present, remembers the one it wrapped, and re-wraps if
 * it is ever replaced. Same for `customProgramCacheKey`: the two keys are
 * concatenated, so a POM variant and a non-POM variant of the same lighting
 * configuration still get separate programs, and vice versa.
 *
 * The uniforms themselves are shared objects owned by the lighting system. Once
 * a material is bound, changing the sun costs one number, not a recompile — the
 * only thing that rebuilds programs here is a quality change.
 */

export interface LightingUniforms {
  uSunDirection: THREE.IUniform<THREE.Vector3>;
  uSunRadiance: THREE.IUniform<THREE.Vector3>;

  uCsmAtlas: THREE.IUniform<THREE.Texture | null>;
  uCsmMatrix: THREE.IUniform<THREE.Matrix4[]>;
  uCsmParams: THREE.IUniform<THREE.Vector4[]>;
  uCsmRect: THREE.IUniform<THREE.Vector4[]>;
  uCsmAtlasTexel: THREE.IUniform<THREE.Vector2>;
  uCsmBlend: THREE.IUniform<number>;
  uCsmDepthBias: THREE.IUniform<number>;
  uCsmNormalBias: THREE.IUniform<number>;
  uCsmLightAngle: THREE.IUniform<number>;
  uCsmSoftness: THREE.IUniform<number>;
  uCsmFade: THREE.IUniform<THREE.Vector2>;
  uCsmJitter: THREE.IUniform<number>;
  uCsmContact: THREE.IUniform<THREE.Vector2>;

  uCloudShadowMap: THREE.IUniform<THREE.Texture | null>;
  uCloudShadowMatrix: THREE.IUniform<THREE.Matrix4>;
  uCloudShadowStrength: THREE.IUniform<number>;

  uAmbientSky: THREE.IUniform<THREE.Color>;
  uAmbientGround: THREE.IUniform<THREE.Color>;
  uAmbientFill: THREE.IUniform<number>;

  uSkyVisibility: THREE.IUniform<THREE.Texture | null>;
  uSkyVisMin: THREE.IUniform<THREE.Vector3>;
  uSkyVisInvExtent: THREE.IUniform<THREE.Vector3>;
  /** Probe counts per axis; the read indexes texels, not normalised space. */
  uSkyVisResolution: THREE.IUniform<THREE.Vector3>;
  /** Metres between probes, to place each corner in the world. */
  uSkyVisCell: THREE.IUniform<THREE.Vector3>;

  uLightData: THREE.IUniform<THREE.Texture | null>;
  uClusterData: THREE.IUniform<THREE.Texture | null>;
  uClusterGrid: THREE.IUniform<THREE.Vector4>;
  uClusterDepth: THREE.IUniform<THREE.Vector4>;
  uClusterProj: THREE.IUniform<THREE.Vector4>;

  uSpotShadowAtlas: THREE.IUniform<THREE.Texture | null>;
  uSpotShadowMatrix: THREE.IUniform<THREE.Matrix4[]>;
  uSpotShadowRect: THREE.IUniform<THREE.Vector4[]>;
  uSpotShadowTexel: THREE.IUniform<THREE.Vector2>;
}

export function createLightingUniforms(): LightingUniforms {
  const matrices = (n: number): THREE.Matrix4[] =>
    Array.from({ length: n }, () => new THREE.Matrix4());
  const vectors = (n: number): THREE.Vector4[] =>
    Array.from({ length: n }, () => new THREE.Vector4());

  return {
    uSunDirection: { value: new THREE.Vector3(0, 1, 0) },
    uSunRadiance: { value: new THREE.Vector3(0, 0, 0) },

    uCsmAtlas: { value: null },
    uCsmMatrix: { value: matrices(4) },
    uCsmParams: { value: vectors(4) },
    uCsmRect: { value: vectors(4) },
    uCsmAtlasTexel: { value: new THREE.Vector2(1, 1) },
    uCsmBlend: { value: 0.12 },
    /* Both in shadow texels; the rig overwrites them from the quality preset. */
    uCsmDepthBias: { value: 0.5 },
    uCsmNormalBias: { value: 1.1 },
    uCsmLightAngle: { value: 0.0047 },
    uCsmSoftness: { value: 3 },
    uCsmFade: { value: new THREE.Vector2(180, 200) },
    uCsmJitter: { value: 0 },
    uCsmContact: { value: new THREE.Vector2(0.4, 0.85) },

    uCloudShadowMap: { value: null },
    uCloudShadowMatrix: { value: new THREE.Matrix4() },
    uCloudShadowStrength: { value: 0 },

    uAmbientSky: { value: new THREE.Color(0, 0, 0) },
    uAmbientGround: { value: new THREE.Color(0, 0, 0) },
    uAmbientFill: { value: 1 },

    uSkyVisibility: { value: null },
    uSkyVisMin: { value: new THREE.Vector3() },
    uSkyVisInvExtent: { value: new THREE.Vector3(1, 1, 1) },
    uSkyVisResolution: { value: new THREE.Vector3(1, 1, 1) },
    uSkyVisCell: { value: new THREE.Vector3(1, 1, 1) },

    uLightData: { value: null },
    uClusterData: { value: null },
    uClusterGrid: { value: new THREE.Vector4(1, 1, 1, 4) },
    uClusterDepth: { value: new THREE.Vector4(1, 0, 0.5, 100) },
    uClusterProj: { value: new THREE.Vector4(1, 1, 0, 0) },

    uSpotShadowAtlas: { value: null },
    uSpotShadowMatrix: { value: matrices(4) },
    uSpotShadowRect: { value: vectors(4) },
    uSpotShadowTexel: { value: new THREE.Vector2(1, 1) },
  };
}

type Compile = (shader: THREE.WebGLProgramParametersWithUniforms, renderer: THREE.WebGLRenderer) => void;

interface Bound {
  /** The callback we wrapped, so a library re-patch can be detected. */
  base: Compile | undefined;
  baseKey: (() => string) | undefined;
  wrapper: Compile;
  keyFn: () => string;
  /** Shader generation this material was last compiled against. */
  generation: number;
}

const NOOP: Compile = () => {};

export class MaterialBinding {
  private chunks = buildLightingChunks({
    cascades: 0,
    pcss: false,
    shadowTaps: 8,
    blockerTaps: 4,
    cloudShadows: false,
    contactShadows: false,
    skyVisibility: false,
    clustered: false,
    lightsPerCluster: 4,
    spotShadows: 0,
  });
  private generation = 0;
  private bound = new WeakMap<THREE.Material, Bound>();
  private tracked: THREE.Material[] = [];

  constructor(private uniforms: LightingUniforms) {}

  get key(): string {
    return this.chunks.key;
  }

  /**
   * Rebuilds the injected code. Only a quality change should reach this: every
   * bound material recompiles, which is a visible hitch.
   */
  configure(config: LightingShaderConfig): boolean {
    const next = buildLightingChunks(config);
    if (next.key === this.chunks.key) return false;
    this.chunks = next;
    this.generation++;
    for (const material of this.tracked) {
      const entry = this.bound.get(material);
      if (!entry) continue;
      entry.generation = this.generation;
      material.needsUpdate = true;
    }
    return true;
  }

  /**
   * Walks a scene and binds anything lit that is not bound yet. Cheap enough to
   * run every few frames, which is what keeps streamed-in geometry lit — a
   * one-shot pass at startup would leave every later prop black.
   */
  scan(root: THREE.Object3D): void {
    root.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      const material = mesh.material;
      if (Array.isArray(material)) {
        for (const m of material) this.bind(m);
      } else if (material) {
        this.bind(material);
      }
    });
  }

  /** Binds one material, or re-binds it if another owner has since taken over. */
  bind(material: THREE.Material): void {
    const standard = material as THREE.MeshStandardMaterial;
    if (!standard.isMeshStandardMaterial) return;

    const existing = this.bound.get(material);
    if (existing && material.onBeforeCompile === existing.wrapper) {
      if (existing.generation !== this.generation) {
        existing.generation = this.generation;
        material.needsUpdate = true;
      }
      return;
    }

    /* Either new to us, or the library re-patched it and clobbered the wrapper.
       Either way the callback sitting there now is the one to chain behind —
       except for our own key function, which the library leaves alone when it
       only replaces `onBeforeCompile`, and which we must not wrap twice. */
    const baseKey =
      material.customProgramCacheKey === existing?.keyFn
        ? existing.baseKey
        : material.customProgramCacheKey;

    const entry: Bound = {
      base: material.onBeforeCompile,
      baseKey,
      wrapper: NOOP,
      keyFn: () => '',
      generation: this.generation,
    };

    entry.wrapper = (shader, renderer) => {
      entry.base?.call(material, shader, renderer);
      this.inject(shader);
    };
    entry.keyFn = () => `${entry.baseKey?.call(material) ?? ''}|${this.chunks.key}`;

    material.onBeforeCompile = entry.wrapper;
    material.customProgramCacheKey = entry.keyFn;
    material.needsUpdate = true;

    if (!this.bound.has(material)) this.tracked.push(material);
    this.bound.set(material, entry);
  }

  private inject(shader: THREE.WebGLProgramParametersWithUniforms): void {
    const u = shader.uniforms as unknown as Record<string, THREE.IUniform>;
    const mine = this.uniforms as unknown as Record<string, THREE.IUniform>;
    for (const name of Object.keys(mine)) u[name] = mine[name];

    shader.defines = { ...(shader.defines ?? {}), ...this.chunks.defines };

    /* After `lights_physical_pars_fragment`, not after `lights_pars_begin`:
       that is where `PhysicalMaterial` and the `RE_Direct` alias come from, and
       the local-light loop takes one and calls the other. */
    const anchors: Array<[string, string]> = [
      ['#include <lights_physical_pars_fragment>', this.chunks.pars],
      ['#include <lights_fragment_begin>', this.chunks.direct],
      ['#include <lights_fragment_maps>', this.chunks.indirect],
    ];
    let source = shader.fragmentShader;
    for (const [anchor, chunk] of anchors) {
      /* Checked rather than assumed. This wrapper deliberately runs last, behind
         whatever else has patched the material — the library's own weathering
         and macro-variation passes, the cloth and foliage ones — and a `replace`
         whose needle another pass has already consumed does not throw, it
         returns the string unchanged. The failure that produces is a surface
         with no cascades, no local lights and no bounce, which looks like a
         lighting bug rather than a chaining one and would cost a day to find. */
      if (!source.includes(anchor)) {
        if (!MaterialBinding.warned.has(anchor)) {
          MaterialBinding.warned.add(anchor);
          console.warn(`[lighting] ${anchor} is gone from the shader; another ` +
            'onBeforeCompile consumed it, so this material is unlit.');
        }
        continue;
      }
      source = source.replace(anchor, `${anchor}\n${chunk}`);
    }
    shader.fragmentShader = source;
  }

  /** Anchors already complained about, so the warning is once and not per draw. */
  private static warned = new Set<string>();

  /** Detaches from every material, restoring the callback we found. */
  dispose(): void {
    for (const material of this.tracked) {
      const entry = this.bound.get(material);
      if (!entry) continue;
      if (material.onBeforeCompile === entry.wrapper) {
        material.onBeforeCompile = entry.base ?? NOOP;
      }
      if (material.customProgramCacheKey === entry.keyFn && entry.baseKey) {
        material.customProgramCacheKey = entry.baseKey;
      }
      material.needsUpdate = true;
      this.bound.delete(material);
    }
    this.tracked.length = 0;
  }
}
