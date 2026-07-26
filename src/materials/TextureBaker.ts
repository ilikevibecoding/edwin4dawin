import * as THREE from 'three';
import { NOISE_GLSL } from '../shaders/material/noise.glsl';
import { COMMON_GLSL } from '../shaders/material/common.glsl';
import { QUAD_VERT, RESOLVE_FRAG, SURFACE_MAIN } from '../shaders/material/bake.glsl';

/**
 * How the shared resolve pass turns a height field into a normal map, cavity
 * occlusion and edge wear. These are the knobs that make a material feel like
 * the right *substance* rather than the right colour.
 */
export interface ResolveParams {
  /** Height amplitude divided by tile size. Drives normal slope and AO. */
  heightScale: number;
  /** Artistic multiplier on the derived slope; 1 = physically consistent. */
  normalBoost?: number;
  /** Cavity occlusion strength, 0..2. */
  ao?: number;
  /** Curvature gain: how strongly convex/concave detail is detected. */
  curv?: number;
  /** Roughness added in crevices (grime, unpolished pockets). */
  cavityRough?: number;
  /** How much crevice dirt tints the albedo, 0..1. */
  cavityGrime?: number;
  /** Colour crevice dirt multiplies towards. */
  cavityTint?: [number, number, number];
  /** Edge wear strength: how much exposed material shows on convex detail. */
  wear?: number;
  /** Colour of the exposed material under wear (linear). */
  wearColor?: [number, number, number];
  /** Roughness delta on worn edges; negative polishes. */
  wearRough?: number;
  /** Metalness delta on worn edges. */
  wearMetal?: number;
  /** Lowest roughness the material may reach. */
  roughFloor?: number;
}

export interface BakeRequest {
  /** GLSL defining `void surf(vec2 uv, inout Surf s)`. */
  glsl: string;
  resolution: number;
  seed: number;
  /** Also emit a height map for parallax occlusion mapping. */
  height: boolean;
  params: ResolveParams;
}

export interface BakedSet {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  armMap: THREE.Texture;
  heightMap?: THREE.Texture;
  /** Approximate GPU footprint in bytes, mip chain included. */
  bytes: number;
}

const RESOLVE_DEFAULTS: Required<Omit<ResolveParams, 'heightScale'>> = {
  normalBoost: 1,
  ao: 1,
  curv: 1,
  cavityRough: 0.12,
  cavityGrime: 0.35,
  cavityTint: [0.55, 0.52, 0.48],
  wear: 0,
  wearColor: [0.7, 0.7, 0.7],
  wearRough: 0,
  wearMetal: 0,
  roughFloor: 0.035,
};

/**
 * Renders material shaders into render targets and hands back textures with the
 * right filtering, wrapping and colour space. Two passes: a per-material
 * surface pass into a reusable byte G-buffer, then the shared resolve.
 */
export class TextureBaker {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly anisotropy: number;
  private readonly quadMesh: THREE.Mesh;
  private readonly camera = new THREE.Camera();
  private readonly surfaceTargets = new Map<number, THREE.WebGLRenderTarget>();
  private readonly owned: THREE.WebGLRenderTarget[] = [];
  private resolveAlbedo!: THREE.ShaderMaterial;
  private resolveData!: THREE.ShaderMaterial;
  private resolveDataHeight!: THREE.ShaderMaterial;

  /** Total bake time in milliseconds, for the boot log. */
  msSpent = 0;
  /** Approximate texture memory handed out, in bytes. */
  bytesSpent = 0;

  constructor(renderer: THREE.WebGLRenderer, anisotropy: number) {
    this.renderer = renderer;
    this.anisotropy = anisotropy;

    // A single oversized triangle covers the target with no matrix maths.
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3),
    );
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2));
    this.quadMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
    this.quadMesh.frustumCulled = false;

    this.buildResolveMaterials();
  }

  private buildResolveMaterials(): void {
    const uniforms = (): Record<string, THREE.IUniform> => ({
      tAlbedo: { value: null },
      tHeight: { value: null },
      tMat: { value: null },
      uRes: { value: 1024 },
      uHeightScale: { value: 0.01 },
      uNormalBoost: { value: 1 },
      uAO: { value: 1 },
      uCurv: { value: 1 },
      uCavityRough: { value: 0.1 },
      uCavityGrime: { value: 0.35 },
      uCavityTint: { value: new THREE.Vector3(0.55, 0.52, 0.48) },
      uWear: { value: 0 },
      uWearColor: { value: new THREE.Vector3(0.7, 0.7, 0.7) },
      uWearRough: { value: 0 },
      uWearMetal: { value: 0 },
      uRoughFloor: { value: 0.035 },
    });
    const frag = NOISE_GLSL + COMMON_GLSL + RESOLVE_FRAG;
    const make = (defines: Record<string, boolean>) =>
      new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3,
        defines,
        uniforms: uniforms(),
        vertexShader: QUAD_VERT,
        fragmentShader: frag,
        depthTest: false,
        depthWrite: false,
      });
    this.resolveAlbedo = make({ RESOLVE_ALBEDO: true });
    this.resolveData = make({});
    this.resolveDataHeight = make({ RESOLVE_HEIGHT: true });
  }

  /** Reusable byte G-buffer for the surface pass, one per resolution. */
  private surfaceTarget(res: number): THREE.WebGLRenderTarget {
    let rt = this.surfaceTargets.get(res);
    if (!rt) {
      rt = new THREE.WebGLRenderTarget(res, res, {
        count: 3,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        // Nearest is mandatory: the height is a two-byte fixed point value and
        // interpolating the low byte would be meaningless.
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping,
        depthBuffer: false,
        stencilBuffer: false,
        generateMipmaps: false,
        colorSpace: THREE.NoColorSpace,
      });
      this.surfaceTargets.set(res, rt);
    }
    return rt;
  }

  private outputTarget(res: number, count: number, srgb: boolean): THREE.WebGLRenderTarget {
    const rt = new THREE.WebGLRenderTarget(res, res, {
      count,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: true,
      anisotropy: this.anisotropy,
      colorSpace: srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace,
    });
    this.owned.push(rt);
    return rt;
  }

  private draw(target: THREE.WebGLRenderTarget, material: THREE.Material): void {
    const r = this.renderer;
    const prevTarget = r.getRenderTarget();
    const prevAutoClear = r.autoClear;
    r.autoClear = true;
    this.quadMesh.material = material;
    r.setRenderTarget(target);
    r.render(this.quadMesh, this.camera);
    r.setRenderTarget(prevTarget);
    r.autoClear = prevAutoClear;
  }

  bake(req: BakeRequest): BakedSet {
    const t0 = performance.now();
    const res = req.resolution;
    const p = { ...RESOLVE_DEFAULTS, ...req.params };

    const surface = this.surfaceTarget(res);
    const surfaceMat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: { uSeed: { value: req.seed }, uRes: { value: res } },
      vertexShader: QUAD_VERT,
      fragmentShader: `precision highp float;
#define BAKE_RES ${res}
varying vec2 vUv;
uniform float uSeed;
uniform float uRes;
${NOISE_GLSL}
${COMMON_GLSL}
${req.glsl}
${SURFACE_MAIN}`,
      depthTest: false,
      depthWrite: false,
    });
    this.draw(surface, surfaceMat);
    // Free the program immediately; every material has its own and they are
    // never reused.
    surfaceMat.dispose();

    const albedoRT = this.outputTarget(res, 1, true);
    const dataRT = this.outputTarget(res, req.height ? 3 : 2, false);

    for (const mat of [this.resolveAlbedo, req.height ? this.resolveDataHeight : this.resolveData]) {
      const u = mat.uniforms;
      u.tAlbedo.value = surface.textures[0];
      u.tHeight.value = surface.textures[1];
      u.tMat.value = surface.textures[2];
      u.uRes.value = res;
      u.uHeightScale.value = p.heightScale;
      u.uNormalBoost.value = p.normalBoost;
      u.uAO.value = p.ao;
      u.uCurv.value = p.curv;
      u.uCavityRough.value = p.cavityRough;
      u.uCavityGrime.value = p.cavityGrime;
      (u.uCavityTint.value as THREE.Vector3).fromArray(p.cavityTint);
      u.uWear.value = p.wear;
      (u.uWearColor.value as THREE.Vector3).fromArray(p.wearColor);
      u.uWearRough.value = p.wearRough;
      u.uWearMetal.value = p.wearMetal;
      u.uRoughFloor.value = p.roughFloor;
    }

    this.draw(albedoRT, this.resolveAlbedo);
    this.draw(dataRT, req.height ? this.resolveDataHeight : this.resolveData);

    const map = albedoRT.textures[0];
    const normalMap = dataRT.textures[0];
    const armMap = dataRT.textures[1];
    const heightMap = req.height ? dataRT.textures[2] : undefined;

    const bytes = Math.round(res * res * 4 * 1.34 * (req.height ? 4 : 3));
    this.bytesSpent += bytes;
    this.msSpent += performance.now() - t0;
    return { map, normalMap, armMap, heightMap, bytes };
  }

  /** Frees the reusable G-buffers; baked output textures stay alive. */
  releaseScratch(): void {
    for (const rt of this.surfaceTargets.values()) rt.dispose();
    this.surfaceTargets.clear();
  }

  dispose(): void {
    this.releaseScratch();
    for (const rt of this.owned) rt.dispose();
    this.owned.length = 0;
    this.resolveAlbedo.dispose();
    this.resolveData.dispose();
    this.resolveDataHeight.dispose();
    this.quadMesh.geometry.dispose();
  }
}
