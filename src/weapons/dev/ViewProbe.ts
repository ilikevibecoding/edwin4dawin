import * as THREE from 'three';
import type { EngineContext } from '../../core/System';

/**
 * Numeric dump of the live view scene, installed only under `?vmprobe=1` and
 * called from the harness in `vmprobe.mjs`.
 *
 * Judging a viewmodel off a 1 fps software-rendered capture by eye is how the
 * module ended up shipping a black glove and an invisible reticle: both look
 * plausible in a thumbnail and neither survives being measured. This reports
 * what is actually bound — effective albedo after the colour multiplier and the
 * baked map, effective roughness, whether an environment is present — plus the
 * pixel rectangle of every part, so the PNG can then be sampled where it counts
 * rather than guessed at.
 */

export const viewProbeRequested = (): boolean => {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('vmprobe') === '1';
};

/** Grid of taps per output pixel when averaging a texture; 16x16 per texel row. */
const MEAN_TAPS = 16;
const MEAN_SIZE = 4;

const MEAN_FRAGMENT = /* glsl */ `
precision highp float;
uniform sampler2D uSource;
uniform float uTaps;
void main() {
  vec4 sum = vec4( 0.0 );
  for ( int y = 0; y < ${MEAN_TAPS}; y++ ) {
    for ( int x = 0; x < ${MEAN_TAPS}; x++ ) {
      vec2 uv = ( gl_FragCoord.xy - 0.5 + ( vec2( float( x ), float( y ) ) + 0.5 ) / uTaps )
        / float( ${MEAN_SIZE} );
      sum += texture2D( uSource, uv );
    }
  }
  gl_FragColor = sum / ( uTaps * uTaps );
}
`;

/**
 * Mean of a texture, read back off the GPU.
 *
 * The library's maps are render targets, so there is no CPU copy to average and
 * `texture.image.data` is null. Rendering a few hundred taps per pixel into a
 * tiny target and reading that back is the only way to answer "what albedo is
 * actually bound here", which is the question both the black glove and the
 * washed-out receiver turned on.
 */
class TextureMean {
  private readonly target = new THREE.WebGLRenderTarget(MEAN_SIZE, MEAN_SIZE, {
    type: THREE.FloatType,
    depthBuffer: false,
    stencilBuffer: false,
  });
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly uniforms = {
    uSource: { value: null as THREE.Texture | null },
    uTaps: { value: MEAN_TAPS },
  };
  private readonly buffer = new Float32Array(MEAN_SIZE * MEAN_SIZE * 4);

  constructor() {
    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: 'void main() { gl_Position = vec4( position.xy, 0.0, 1.0 ); }',
      fragmentShader: MEAN_FRAGMENT,
      depthTest: false,
      depthWrite: false,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    quad.frustumCulled = false;
    this.scene.add(quad);
  }

  measure(renderer: THREE.WebGLRenderer, texture: THREE.Texture | null): number[] | null {
    if (!texture) return null;
    this.uniforms.uSource.value = texture;
    const previous = renderer.getRenderTarget();
    renderer.setRenderTarget(this.target);
    renderer.render(this.scene, this.camera);
    renderer.readRenderTargetPixels(this.target, 0, 0, MEAN_SIZE, MEAN_SIZE, this.buffer);
    renderer.setRenderTarget(previous);
    const out = [0, 0, 0, 0];
    const pixels = MEAN_SIZE * MEAN_SIZE;
    for (let i = 0; i < pixels; i++) {
      for (let c = 0; c < 4; c++) out[c] += this.buffer[i * 4 + c];
    }
    return out.map((v) => round(v / pixels, 4));
  }

  dispose(): void {
    this.target.dispose();
  }
}

const round = (n: number, digits = 4): number =>
  Number.isFinite(n) ? Number(n.toFixed(digits)) : 0;

const LUMA = [0.2126, 0.7152, 0.0722];

/** Statistics over the covered pixels of an RGBA float readback. */
function summarise(buffer: Float32Array): Radiance {
  const total = buffer.length / 4;
  const sum = [0, 0, 0];
  const luma: number[] = [];
  for (let i = 0; i < total; i++) {
    // Anything the clear left alone is not this material. Half coverage rather
    // than any coverage so a single antialiased edge sample, which is mostly the
    // transparent clear, cannot drag the mean toward black.
    if (buffer[i * 4 + 3] < 0.5) continue;
    let l = 0;
    for (let c = 0; c < 3; c++) {
      const v = buffer[i * 4 + c];
      sum[c] += v;
      l += v * LUMA[c];
    }
    luma.push(l);
  }
  const n = luma.length;
  if (n === 0) {
    return { pixels: 0, coverage: 0, mean: null, p5: null, p50: null, p95: null, hue: null };
  }
  luma.sort((a, b) => a - b);
  const at = (q: number): number => round(luma[Math.min(n - 1, Math.floor(q * n))], 5);
  const mean = sum.map((v) => round(v / n, 5));
  const peak = Math.max(mean[0], mean[1], mean[2]) || 1;
  return {
    pixels: n,
    coverage: round((n / total) * 100, 3),
    mean,
    p5: at(0.05),
    p50: at(0.5),
    p95: at(0.95),
    hue: mean.map((v) => round(v / peak, 3)),
  };
}

/** Subtrees worth a screen rect; matched by `Object3D.name`. */
const TRACKED = [
  'viewmodel',
  'hands',
  'armRight',
  'armLeft',
  'handRight',
  'handLeft',
  'receiver',
  'upperRail',
  'barrel',
  'muzzleDevice',
  'handguard',
  'magazine',
  'magWell',
  'optic',
  'stock',
  'pistolGrip',
  'markings',
];

interface Rect {
  visible: boolean;
  /** NDC bounds, unclamped, so an off-screen part is still legible as a number. */
  ndc: number[] | null;
  /** Pixel bounds clamped to the frame: x0, y0, x1, y1 with y down. */
  px: number[] | null;
  /** Percentage of the frame the clamped box covers. */
  frameArea: number;
  sizeM: number[] | null;
}

/**
 * Subtrees worth an exact silhouette area, by `Object3D.name`.
 *
 * `weapon` is not a node; it is the viewmodel with the hands taken out, which is
 * the figure the framing note is actually about.
 */
const COVERED = ['viewmodel', 'hands', 'armLeft', 'armRight', 'handLeft', 'handRight'];

/** Materials worth a per-pixel radiance figure, by `Material.name`. */
const SAMPLED = [
  'vm_glove',
  'vm_sleeve',
  'vm_polymer',
  'vm_polymer_dark',
  'vm_metal',
  'vm_metal_dark',
  'vm_barrel',
  'vm_metal_worn',
  'vm_glass',
  'vm_stencil',
  'vm_reticle_holo',
];

/** Offscreen resolution for the radiance sample; only the statistics matter. */
const SAMPLE_WIDTH = 640;
const SAMPLE_HEIGHT = 360;

interface Radiance {
  /** Pixels the material covers, and that as a percentage of the sample frame. */
  pixels: number;
  coverage: number;
  /** Mean scene-linear radiance over covered pixels, per channel. */
  mean: number[] | null;
  /** Luminance percentiles, which is where a flat surface shows up as flat. */
  p5: number | null;
  p50: number | null;
  p95: number | null;
  /** Max over min of the channel means; a material lit only by sky tends to 1. */
  hue: number[] | null;
}

export class ViewProbe {
  private readonly mean = new TextureMean();
  private sampleTarget: THREE.WebGLRenderTarget | null = null;
  private sampleBuffer: Float32Array | null = null;

  /**
   * Everything measurable about the current frame's viewmodel.
   *
   * Deliberately reads the scene graph rather than the module's own state: a
   * report assembled from what `ViewModel` believes would have agreed with the
   * code at every point the module was wrong.
   */
  report(ctx: EngineContext, extra: () => unknown): unknown {
    const scene = ctx.viewScene;
    const camera = ctx.viewCamera;
    const width = ctx.renderer.domElement.width;
    const height = ctx.renderer.domElement.height;

    camera.updateMatrixWorld(true);
    camera.updateProjectionMatrix();
    scene.updateMatrixWorld(true);

    const projection = camera.projectionMatrix;
    const corner = new THREE.Vector3();
    const box = new THREE.Box3();
    const geometryBox = new THREE.Box3();

    const rectOf = (root: THREE.Object3D): Rect => {
      box.makeEmpty();
      root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh || !m.visible || !m.geometry) return;
        if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
        const b = m.geometry.boundingBox;
        if (!b) return;
        geometryBox.copy(b).applyMatrix4(m.matrixWorld);
        box.union(geometryBox);
      });
      if (box.isEmpty()) {
        return { visible: root.visible, ndc: null, px: null, frameArea: 0, sizeM: null };
      }
      const size = box.getSize(new THREE.Vector3());
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (let i = 0; i < 8; i++) {
        corner.set(
          i & 1 ? box.max.x : box.min.x,
          i & 2 ? box.max.y : box.min.y,
          i & 4 ? box.max.z : box.min.z,
        );
        // Anything at or behind the lens projects to nonsense; clamping onto the
        // near plane keeps a buttstock past the eye from poisoning the extent.
        corner.z = Math.min(corner.z, -0.02);
        corner.applyMatrix4(projection);
        minX = Math.min(minX, corner.x);
        minY = Math.min(minY, corner.y);
        maxX = Math.max(maxX, corner.x);
        maxY = Math.max(maxY, corner.y);
      }
      const cl = (n: number): number => THREE.MathUtils.clamp(n, -1, 1);
      const area = (((cl(maxX) - cl(minX)) * (cl(maxY) - cl(minY))) / 4) * 100;
      return {
        visible: root.visible,
        ndc: [round(minX, 3), round(minY, 3), round(maxX, 3), round(maxY, 3)],
        px: [
          Math.round(((cl(minX) + 1) / 2) * width),
          Math.round(((1 - cl(maxY)) / 2) * height),
          Math.round(((cl(maxX) + 1) / 2) * width),
          Math.round(((1 - cl(minY)) / 2) * height),
        ],
        frameArea: round(area, 2),
        sizeM: [round(size.x, 3), round(size.y, 3), round(size.z, 3)],
      };
    };

    const rects: Record<string, Rect> = {};
    const materials = new Map<string, unknown>();
    const badAttributes: unknown[] = [];
    const reticles: unknown[] = [];
    let meshes = 0;
    let triangles = 0;

    scene.traverse((o) => {
      if (TRACKED.includes(o.name) && !rects[o.name]) rects[o.name] = rectOf(o);
      if (typeof o.name === 'string' && o.name.startsWith('reticle_')) {
        reticles.push(this.reticleOf(o as THREE.Mesh, projection, width, height, camera));
      }
      const m = o as THREE.Mesh;
      if (!m.isMesh || !m.geometry) return;
      meshes++;
      const index = m.geometry.getIndex();
      const count = index ? index.count : (m.geometry.getAttribute('position')?.count ?? 0);
      triangles += Math.floor(count / 3);
      for (const name of ['position', 'normal', 'tangent', 'uv']) {
        const attribute = m.geometry.getAttribute(name);
        if (!attribute) continue;
        const array = attribute.array as ArrayLike<number>;
        let bad = 0;
        for (let i = 0; i < array.length; i++) if (!Number.isFinite(array[i])) bad++;
        if (bad > 0) badAttributes.push({ mesh: m.name || m.type, attribute: name, count: bad });
      }
      const list = Array.isArray(m.material) ? m.material : [m.material];
      for (const material of list) {
        if (!material || materials.has(material.uuid)) continue;
        materials.set(material.uuid, this.materialOf(ctx, material));
      }
    });

    return {
      size: [width, height],
      viewFov: round(camera.fov, 3),
      environment: scene.environment ? scene.environment.name || '(unnamed)' : null,
      environmentIntensity: round(scene.environmentIntensity, 4),
      lights: this.lightsOf(scene),
      meshes,
      triangles,
      badAttributes,
      rects,
      reticles,
      pose: extra(),
      coverage: this.coverageOf(ctx),
      radiance: this.radianceOf(ctx),
      materials: [...materials.values()],
    };
  }

  /**
   * Scene-linear radiance each material actually delivers, measured per pixel.
   *
   * Screenshots cannot answer this and two passes were wasted finding that out.
   * Masking a part by its screen box samples whatever it overlaps — the support
   * hand is wrapped round the handguard, so a box round the hand is mostly
   * handguard — and masking by differencing frames fails because the renderer's
   * dynamic resolution moves between grabs and the atmosphere still draws with the
   * world hidden, so "not background" is not a test that works.
   *
   * Rendering the view scene on its own into a float target with a transparent
   * clear settles it: alpha is coverage, so the mask is exact, and there is no
   * world, no fog and no post in the numbers. It measures radiance before exposure
   * rather than frame value, which is the more useful of the two anyway — it is
   * comparable against the material's own albedo, and that comparison is what
   * showed a 0.018 glove rendering at 0.18 and taking the sky's hue rather than
   * its own.
   */
  private radianceOf(ctx: EngineContext): Record<string, Radiance> {
    const groups = new Map<string, THREE.Mesh[]>();
    ctx.viewScene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const list = Array.isArray(m.material) ? m.material : [m.material];
      for (const material of list) {
        if (!material?.name || !SAMPLED.includes(material.name)) continue;
        const bucket = groups.get(material.name);
        if (bucket) bucket.push(m);
        else groups.set(material.name, [m]);
      }
    });
    const out: Record<string, Radiance> = {};
    this.isolate(ctx, groups, (name, buffer) => {
      out[name] = summarise(buffer);
    });
    return out;
  }

  /**
   * Exact silhouette area of each subtree, as a percentage of the frame.
   *
   * The screen boxes in `rects` are the wrong tool for the framing question: a
   * rifle held diagonally has a box four times its own area, and the reported
   * 15.9% for one that covers a twentieth of the frame is how "the barrel
   * dominates the lower centre" turns into an argument instead of a number.
   */
  private coverageOf(ctx: EngineContext): Record<string, number> {
    const meshesUnder = (root: THREE.Object3D): THREE.Mesh[] => {
      const out: THREE.Mesh[] = [];
      root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) out.push(m);
      });
      return out;
    };
    const groups = new Map<string, THREE.Mesh[]>();
    ctx.viewScene.traverse((o) => {
      if (COVERED.includes(o.name) && !groups.has(o.name)) groups.set(o.name, meshesUnder(o));
    });
    const viewmodel = groups.get('viewmodel');
    const hands = groups.get('hands');
    if (viewmodel && hands) {
      const skin = new Set(hands);
      groups.set(
        'weapon',
        viewmodel.filter((m) => !skin.has(m)),
      );
    }
    const out: Record<string, number> = {};
    this.isolate(ctx, groups, (name, buffer, total) => {
      let n = 0;
      for (let i = 0; i < total; i++) if (buffer[i * 4 + 3] >= 0.5) n++;
      out[name] = round((n / total) * 100, 3);
    });
    return { ...out, ...this.decalsOf(ctx) };
  }

  /**
   * How much of the stencilled markings the frame actually shows.
   *
   * Isolating them the way the radiance pass does would not answer the question,
   * because a decal 0.8 mm inside the shell it is meant to sit on renders
   * perfectly when nothing else is drawn and is invisible the moment the shell is.
   * The markings are placed by hand in weapon space against geometry assembled
   * from primitives, so being buried is the likely failure and it is
   * indistinguishable by eye from being too small to read.
   *
   * Differencing the full render against the full render with the decals hidden
   * counts exactly the pixels where a marking is the frontmost surface. It works
   * here and did not work off screenshots for two specific reasons: the target is
   * a fixed size, so dynamic resolution cannot change it between the pair, and
   * nothing downstream of the render is involved, so the exposure pass cannot
   * shift every pixel in the frame the way it does when the world is hidden.
   */
  private decalsOf(ctx: EngineContext): Record<string, number> {
    const all: THREE.Mesh[] = [];
    const decals: THREE.Mesh[] = [];
    ctx.viewScene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      all.push(m);
      const list = Array.isArray(m.material) ? m.material : [m.material];
      if (list.some((x) => x?.name === 'vm_stencil')) decals.push(m);
    });
    if (decals.length === 0) return { decalPixels: 0, decalVisible: 0 };

    const skin = new Set<THREE.Object3D>(decals);
    const groups = new Map<string, THREE.Mesh[]>([
      ['with', all],
      ['without', all.filter((m) => !skin.has(m))],
    ]);
    let previous: Float32Array | null = null;
    let differing = 0;
    this.isolate(ctx, groups, (name, buffer, total) => {
      if (name === 'with') {
        previous = buffer.slice();
        return;
      }
      const before = previous;
      if (!before) return;
      for (let i = 0; i < total; i++) {
        const j = i * 4;
        if (
          Math.abs(before[j] - buffer[j]) > 1e-4 ||
          Math.abs(before[j + 1] - buffer[j + 1]) > 1e-4 ||
          Math.abs(before[j + 2] - buffer[j + 2]) > 1e-4 ||
          Math.abs(before[j + 3] - buffer[j + 3]) > 1e-4
        ) {
          differing++;
        }
      }
    });
    return {
      decalPixels: differing,
      decalVisible: round((differing / (SAMPLE_WIDTH * SAMPLE_HEIGHT)) * 100, 4),
    };
  }

  /**
   * Renders each group alone into a float target and hands back the readback.
   *
   * The transparent clear is the point: alpha is coverage, so the mask is exact
   * and there is no world, no fog and no post in the numbers.
   */
  private isolate(
    ctx: EngineContext,
    groups: Map<string, THREE.Mesh[]>,
    sample: (name: string, buffer: Float32Array, total: number) => void,
  ): void {
    const renderer = ctx.renderer;
    if (!this.sampleTarget) {
      this.sampleTarget = new THREE.WebGLRenderTarget(SAMPLE_WIDTH, SAMPLE_HEIGHT, {
        type: THREE.FloatType,
        depthBuffer: true,
        stencilBuffer: false,
      });
      this.sampleBuffer = new Float32Array(SAMPLE_WIDTH * SAMPLE_HEIGHT * 4);
    }
    const target = this.sampleTarget;
    const buffer = this.sampleBuffer;
    if (!buffer) return;

    // Every node, not just the meshes: forcing a hidden parent on to reach a
    // glove has to be undone too, or the pass leaves the scene altered.
    const nodes: THREE.Object3D[] = [];
    ctx.viewScene.traverse((o) => nodes.push(o));
    const wasVisible = nodes.map((o) => o.visible);
    const meshes = nodes.filter((o) => (o as THREE.Mesh).isMesh);
    const previousTarget = renderer.getRenderTarget();
    const clearColour = new THREE.Color();
    renderer.getClearColor(clearColour);
    const clearAlpha = renderer.getClearAlpha();
    renderer.setClearColor(0x000000, 0);

    for (const [name, group] of groups) {
      const keep = new Set<THREE.Object3D>(group);
      for (const m of meshes) m.visible = keep.has(m);
      // The hands hide as a group when the player is sprinting, so a hidden
      // parent would otherwise report the glove as absent rather than dark.
      for (const m of group) for (let n = m.parent; n; n = n.parent) n.visible = true;
      renderer.setRenderTarget(target);
      renderer.clear();
      renderer.render(ctx.viewScene, ctx.viewCamera);
      renderer.readRenderTargetPixels(target, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT, buffer);
      sample(name, buffer, SAMPLE_WIDTH * SAMPLE_HEIGHT);
    }

    for (let i = 0; i < nodes.length; i++) nodes[i].visible = wasVisible[i];
    renderer.setClearColor(clearColour, clearAlpha);
    renderer.setRenderTarget(previousTarget);
  }

  private lightsOf(scene: THREE.Scene): unknown[] {
    const out: unknown[] = [];
    scene.traverse((o) => {
      const light = o as THREE.Light;
      if (!light.isLight) return;
      out.push({
        name: light.name || light.type,
        type: light.type,
        intensity: round(light.intensity, 4),
        color: `#${light.color.getHexString()}`,
        /** Luminance-weighted intensity, which is what the surface actually sees. */
        weighted: round(
          light.intensity *
            (light.color.r * 0.2126 + light.color.g * 0.7152 + light.color.b * 0.0722),
          4,
        ),
      });
    });
    return out;
  }

  private materialOf(ctx: EngineContext, source: THREE.Material): unknown {
    const m = source as THREE.MeshStandardMaterial & THREE.MeshPhysicalMaterial;
    const albedoMean = this.mean.measure(ctx.renderer, m.map ?? null);
    const ormMean = this.mean.measure(ctx.renderer, m.roughnessMap ?? null);
    const colour = m.color ? [m.color.r, m.color.g, m.color.b] : null;
    // The map is sampled in linear space and multiplied into `color`, so the
    // product is the albedo the BRDF actually receives. Reporting either half on
    // its own is what let a 0.03 multiplier over a 0.24 fabric pass review.
    const effective =
      colour && albedoMean
        ? colour.map((c, i) => round(c * albedoMean[i], 4))
        : (colour?.map((c) => round(c, 4)) ?? null);
    let cacheKey = '';
    try {
      cacheKey = String(m.customProgramCacheKey()).slice(0, 40);
    } catch {
      cacheKey = '(threw)';
    }
    return {
      name: m.name || '(unnamed)',
      type: m.type,
      hex: m.color ? `#${m.color.getHexString()}` : null,
      colorLinear: colour?.map((c) => round(c, 4)) ?? null,
      albedoMapMean: albedoMean ? albedoMean.slice(0, 3) : null,
      effectiveAlbedo: effective,
      /** Perceived value of that albedo, the number a "black blob" fails. */
      effectiveLuma: effective
        ? round(effective[0] * 0.2126 + effective[1] * 0.7152 + effective[2] * 0.0722, 4)
        : null,
      roughness: m.roughness !== undefined ? round(m.roughness, 3) : null,
      /** ORM packs roughness in g and metalness in b, so this is the real pair. */
      roughnessEffective: ormMean ? round(m.roughness * ormMean[1], 3) : null,
      metalness: m.metalness !== undefined ? round(m.metalness, 3) : null,
      metalnessEffective: ormMean ? round(m.metalness * ormMean[2], 3) : null,
      envMapIntensity: m.envMapIntensity !== undefined ? round(m.envMapIntensity, 3) : null,
      hasEnvMap: !!m.envMap,
      anisotropy: m.anisotropy !== undefined ? round(m.anisotropy, 3) : undefined,
      sheen: m.sheen !== undefined ? round(m.sheen, 3) : undefined,
      clearcoat: m.clearcoat !== undefined ? round(m.clearcoat, 3) : undefined,
      emissive: m.emissive ? `#${m.emissive.getHexString()}` : null,
      emissiveIntensity: m.emissiveIntensity ?? null,
      maps: ['map', 'normalMap', 'roughnessMap', 'aoMap', 'emissiveMap', 'alphaMap']
        .filter((k) => (m as unknown as Record<string, unknown>)[k])
        .join(','),
      uvScale: m.userData.procgenUvScale
        ? JSON.stringify(m.userData.procgenUvScale)
        : (m.userData.vmUvScale ? JSON.stringify(m.userData.vmUvScale) : null),
      patched: m.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile,
      cacheKey,
      toneMapped: m.toneMapped,
      transparent: m.transparent,
      opacity: round(m.opacity, 3),
      blending: m.blending,
      depthTest: m.depthTest,
    };
  }

  private reticleOf(
    o: THREE.Mesh,
    projection: THREE.Matrix4,
    width: number,
    height: number,
    camera: THREE.PerspectiveCamera,
  ): unknown {
    const material = o.material as THREE.MeshBasicMaterial;
    const position = new THREE.Vector3().setFromMatrixPosition(o.matrixWorld);
    const ndc = position.clone();
    ndc.z = Math.min(ndc.z, -0.02);
    ndc.applyMatrix4(projection);
    let chainVisible = true;
    for (let n: THREE.Object3D | null = o; n; n = n.parent) if (!n.visible) chainVisible = false;
    const parameters = (o.geometry as THREE.PlaneGeometry).parameters;
    const planeHeight = (parameters?.height ?? 0) * o.scale.y;
    const distance = Math.max(0.01, Math.abs(position.z));
    return {
      name: o.name,
      visible: o.visible,
      chainVisible,
      opacity: round(material.opacity, 4),
      colorLinear: [
        round(material.color.r, 3),
        round(material.color.g, 3),
        round(material.color.b, 3),
      ],
      /**
       * Radiance the quad actually emits at full texture coverage, which is what
       * has to clear the bloom threshold in exposed units.
       */
      peakRadiance: round(
        Math.max(material.color.r, material.color.g, material.color.b) * material.opacity,
        4,
      ),
      blending: material.blending,
      toneMapped: material.toneMapped,
      depthTest: material.depthTest,
      renderOrder: o.renderOrder,
      hasMap: !!material.map,
      viewPos: [round(position.x, 4), round(position.y, 4), round(position.z, 4)],
      ndc: [round(ndc.x, 5), round(ndc.y, 5)],
      pixel: [
        Math.round(((ndc.x + 1) / 2) * width),
        Math.round(((1 - ndc.y) / 2) * height),
      ],
      heightPx: round(
        (planeHeight / (distance * Math.tan((camera.fov * Math.PI) / 360) * 2)) * height,
        1,
      ),
    };
  }

  dispose(): void {
    this.mean.dispose();
    this.sampleTarget?.dispose();
    this.sampleTarget = null;
    this.sampleBuffer = null;
  }
}

/**
 * Installs `window.__VMPROBE__`, which the harness calls once per shot.
 *
 * `pose` is supplied by the viewmodel rather than read here: sight alignment is
 * the one measurement that has to come from the same anchor transform the ADS
 * solve uses, or it would verify a different quantity than the one that has to
 * stay under a pixel.
 */
export function installViewProbe(ctx: EngineContext, pose: () => unknown): ViewProbe | null {
  if (!viewProbeRequested()) return null;
  // The renderer ships with shader diagnostics off, so a program that fails to
  // link degrades to a stream of `useProgram: program not valid` from the driver
  // with the compiler's own message discarded. Under the probe that is exactly
  // the message wanted.
  ctx.renderer.debug.checkShaderErrors = true;
  const probe = new ViewProbe();
  const target = window as unknown as {
    __VMPROBE__: () => unknown;
    __VIEWHIDE__: (hidden: boolean) => void;
  };
  target.__VMPROBE__ = () => probe.report(ctx, pose);
  // Lets the harness take a matched pair of frames and difference them for an
  // exact viewmodel mask. Installed here rather than driven off `window.GAME`
  // because the scene the weapons module owns is the one it should be reaching
  // into, and the shape of that global is not this module's to depend on.
  target.__VIEWHIDE__ = (hidden: boolean) => {
    ctx.viewScene.visible = !hidden;
  };
  console.info('[vmprobe] __VMPROBE__ installed');
  return probe;
}
