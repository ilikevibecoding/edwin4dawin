/**
 * Texture and shading probe.
 *
 * `lookdev.html` answers "does it look right"; this answers "what is actually in
 * the texture". It bakes the library outside the game and exposes two readbacks
 * over `window.PROBE`, so a measurement script can compute statistics on the
 * exact texels the renderer samples rather than on a screenshot of them:
 *
 *   PROBE.maps(id)       albedo / packed ORM / normal, as PNG data URLs
 *   PROBE.lit(id, opts)  the material lit by sun + IBL on a wall-sized panel,
 *                        with normalScale and the tangent attribute switchable
 *                        so the normal map's contribution can be differenced out
 *
 * Served by the dev server only:
 *   npx vite
 *   http://localhost:5173/src/procgen/dev/probe.html?tier=high&only=brick_red
 */
import * as THREE from 'three';
import { makeConfig, type QualityTier } from '../../core/Config';
import type { EngineContext } from '../../core/System';
import type { MaterialId } from '../../core/Contracts';
import { MATERIAL_ORDER, ProcgenSystemImpl } from '../index';
import { MATERIAL_SPECS } from '../generators';
import { addUV2, computeTangents } from '../GeometryUtils';

const params = new URLSearchParams(location.search);
const tier = (params.get('tier') ?? 'high') as QualityTier;
const only = params.get('only');

const reportEl = document.getElementById('report') as HTMLDivElement;
const canvas = document.getElementById('view') as HTMLCanvasElement;

const BLIT_VERTEX = /* glsl */ `
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const BLIT_FRAGMENT = /* glsl */ `
precision highp float;
in vec2 vUv;
layout(location = 0) out vec4 outColor;
uniform sampler2D uSource;
uniform float uEncode;

vec3 linearToSrgb(vec3 c) {
  vec3 lo = c * 12.92;
  vec3 hi = 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;
  return mix(lo, hi, step(vec3(0.0031308), c));
}

void main() {
  vec4 t = textureLod(uSource, vUv, 0.0);
  outColor = vec4(uEncode > 0.5 ? linearToSrgb(t.rgb) : t.rgb, t.a);
}
`;

interface LitOptions {
  normalScale?: number;
  distance?: number;
  panelMeters?: number;
  tangents?: boolean;
  size?: number;
  ao?: number;
  /** Directional light intensity; 0 leaves the panel lit by the IBL alone. */
  sun?: number;
  /** Light bearing, to check what the joint does when lit from below. */
  sunDir?: [number, number, number];
  /**
   * World-space macro layer on or off, so its contribution can be differenced
   * out the same way the normal map's is. Off is what the `low` tier ships.
   */
  macro?: boolean;
  /**
   * Stand the panel on the ground instead of centring it on the origin.
   *
   * The macro layer keys its dado off world height, so a panel straddling y = 0
   * has its whole lower half below ground level and the measurement comes back
   * dominated by a splash-back stain no real wall has above its plinth.
   */
  standing?: boolean;
  /**
   * Orthographic framing of exactly one tile.
   *
   * Perspective renders cannot be compared against the baked maps texel for
   * texel, which forces every measurement of them to find its own features and
   * makes the answer depend on how it does that. One tile filling the frame
   * square-on puts screen space and texture space in the same coordinates, so a
   * mask built from the height channel can be applied to the lit result
   * directly.
   */
  ortho?: boolean;
}

interface ProbeApi {
  ready: boolean;
  ids: string[];
  stats: () => unknown;
  info: (id: string) => unknown;
  maps: (id: string) => Record<string, string | number>;
  lit: (id: string, options?: LitOptions) => string;
}

async function main(): Promise<void> {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
  renderer.setPixelRatio(1);
  renderer.setSize(512, 512, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const config = makeConfig(tier);
  const ctx = { renderer, config } as unknown as EngineContext;
  const procgen = new ProcgenSystemImpl();
  await procgen.init(ctx);

  const ids: MaterialId[] = only
    ? (only.split(',').filter(Boolean) as MaterialId[])
    : [...MATERIAL_ORDER];
  procgen.warm(ids);

  // ---------------------------------------------------------------------------
  // Texel readback
  // ---------------------------------------------------------------------------

  const blitScene = new THREE.Scene();
  const blitCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const blitMaterial = new THREE.ShaderMaterial({
    vertexShader: BLIT_VERTEX,
    fragmentShader: BLIT_FRAGMENT,
    glslVersion: THREE.GLSL3,
    uniforms: { uSource: { value: null }, uEncode: { value: 0 } },
    depthTest: false,
    depthWrite: false,
  });
  const blitQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blitMaterial);
  blitQuad.frustumCulled = false;
  blitScene.add(blitQuad);

  const scratch = document.createElement('canvas');
  const scratchCtx = scratch.getContext('2d') as CanvasRenderingContext2D;

  /** Reads a render target back and returns it as a PNG data URL, top row first. */
  function targetToPng(rt: THREE.WebGLRenderTarget, size: number): string {
    const buffer = new Uint8Array(size * size * 4);
    renderer.readRenderTargetPixels(rt, 0, 0, size, size, buffer);
    scratch.width = size;
    scratch.height = size;
    const image = scratchCtx.createImageData(size, size);
    // GL hands back bottom-up; a PNG is top-down.
    for (let y = 0; y < size; y++) {
      const src = (size - 1 - y) * size * 4;
      image.data.set(buffer.subarray(src, src + size * 4), y * size * 4);
    }
    scratchCtx.putImageData(image, 0, 0);
    return scratch.toDataURL('image/png');
  }

  function textureToPng(texture: THREE.Texture, size: number, encode: boolean): string {
    const rt = new THREE.WebGLRenderTarget(size, size, {
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      colorSpace: THREE.NoColorSpace,
      generateMipmaps: false,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: false,
      stencilBuffer: false,
    });
    blitMaterial.uniforms.uSource.value = texture;
    blitMaterial.uniforms.uEncode.value = encode ? 1 : 0;
    const previous = renderer.getRenderTarget();
    renderer.setRenderTarget(rt);
    renderer.render(blitScene, blitCamera);
    renderer.setRenderTarget(previous);
    const png = targetToPng(rt, size);
    rt.dispose();
    blitMaterial.uniforms.uSource.value = null;
    return png;
  }

  // ---------------------------------------------------------------------------
  // Lit panel
  // ---------------------------------------------------------------------------

  const litScene = new THREE.Scene();
  litScene.environment = procgen.environmentMap;
  const sun = new THREE.DirectionalLight(0xfff2e0, 2.6);
  sun.position.copy(procgen.sunDirection).multiplyScalar(40);
  litScene.add(sun);
  const litCamera = new THREE.PerspectiveCamera(60, 1, 0.05, 100);
  const orthoCamera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.01, 100);

  const tangentPanel = computeTangents(addUV2(new THREE.PlaneGeometry(1, 1, 24, 24)));
  const plainPanel = addUV2(new THREE.PlaneGeometry(1, 1, 24, 24));
  const panelMesh = new THREE.Mesh(tangentPanel);
  litScene.add(panelMesh);

  function lit(id: string, options: LitOptions = {}): string {
    const spec = MATERIAL_SPECS.get(id as MaterialId);
    const tileMeters = spec?.tileMeters ?? 2;
    const meters = options.ortho ? tileMeters : (options.panelMeters ?? 3.2);
    const distance = options.distance ?? 1.1;
    const size = options.size ?? 512;
    const repeat = meters / tileMeters;

    // The tiled variant is cached and shared, so both knobs are written on every
    // call: an A/B that left one of them at the previous call's value would
    // compare a render against itself.
    // The layer's strength lives on uniforms shared by every patched material,
    // so this has to be set before the variant is fetched and restored after.
    procgen.materials.setDetailTier(options.macro === false ? 'low' : tier);

    const material = procgen.materials.tiled(id as MaterialId, repeat, repeat);
    const scale = options.normalScale ?? spec?.material?.normalScale ?? 1;
    material.normalScale.set(scale, scale);
    material.aoMapIntensity = options.ao ?? spec?.material?.aoMapIntensity ?? 1;
    sun.intensity = options.sun ?? 2.6;
    const dir = options.sunDir;
    if (dir) sun.position.set(dir[0], dir[1], dir[2]).multiplyScalar(40);
    else sun.position.copy(procgen.sunDirection).multiplyScalar(40);
    panelMesh.material = material;
    panelMesh.geometry = options.tangents === false ? plainPanel : tangentPanel;
    panelMesh.scale.setScalar(meters);
    const centreY = options.standing ? meters * 0.5 : 0;
    panelMesh.position.set(0, centreY, 0);

    const camera = options.ortho ? orthoCamera : litCamera;
    if (options.ortho) {
      const half = meters * 0.5;
      orthoCamera.left = -half;
      orthoCamera.right = half;
      orthoCamera.top = half;
      orthoCamera.bottom = -half;
      orthoCamera.position.set(0, centreY, 4);
    } else {
      litCamera.position.set(0, centreY, distance);
    }
    camera.lookAt(0, centreY, 0);
    camera.updateProjectionMatrix();

    const rt = new THREE.WebGLRenderTarget(size, size, {
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      colorSpace: THREE.SRGBColorSpace,
      generateMipmaps: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      samples: 4,
    });
    const previous = renderer.getRenderTarget();
    renderer.setRenderTarget(rt);
    renderer.render(litScene, camera);
    renderer.setRenderTarget(previous);
    const png = targetToPng(rt, size);
    rt.dispose();
    procgen.materials.setDetailTier(tier);
    return png;
  }

  // ---------------------------------------------------------------------------

  const api: ProbeApi = {
    ready: true,
    ids: ids.slice(),
    stats: () => ({
      ...procgen.materials.stats,
      tier,
      base: config.textureResolution,
      // What the whole set costs once warm, which is the number the budget is
      // set against; `bytes` only covers what this run happened to bake.
      projected: procgen.materials.projectedBytes(),
    }),
    info: (id) => {
      const material = procgen.materials.get(id as MaterialId);
      const spec = MATERIAL_SPECS.get(id as MaterialId);
      return {
        id,
        normalMap: material.normalMap?.name ?? null,
        normalScale: [material.normalScale.x, material.normalScale.y],
        roughness: material.roughness,
        metalness: material.metalness,
        relief: spec?.relief ?? null,
        reliefWide: spec?.reliefWide ?? null,
        tileMeters: spec?.tileMeters ?? null,
        res: spec?.res ?? null,
      };
    },
    maps: (id) => {
      const material = procgen.materials.get(id as MaterialId);
      const image = material.map?.image as { width?: number } | undefined;
      const size = image?.width ?? 512;
      const out: Record<string, string | number> = { size };
      if (material.map) out.albedo = textureToPng(material.map, size, true);
      if (material.roughnessMap) out.orm = textureToPng(material.roughnessMap, size, false);
      if (material.normalMap) out.normal = textureToPng(material.normalMap, size, false);
      return out;
    },
    lit,
  };

  const stats = procgen.materials.stats;
  reportEl.textContent = [
    `tier      ${tier} (base ${config.textureResolution}px)`,
    `materials ${stats.baked}/${stats.total}`,
    `textures  ${stats.textures} (${(stats.bytes / 1048576).toFixed(1)} MB)`,
  ].join('\n');

  (window as unknown as Record<string, unknown>).PROBE = api;
}

main().catch((err) => {
  reportEl.textContent = `failed: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`;
  console.error(err);
});
