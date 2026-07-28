import * as THREE from 'three';
import type { QualitySettings } from '../../core/Quality';
import { clamp, lerp, saturate } from '../../core/MathUtils';
import {
  CLOUD_DETAIL_FRAG,
  CLOUD_SHAPE_FRAG,
  WEATHER_FRAG,
} from '../../shaders/sky/cloudnoise.glsl';
import { CLOUD_MARCH_FRAG, CLOUD_SHADOW_FRAG } from '../../shaders/sky/clouds.glsl';
import { CLOUD_RESOLVE_FRAG } from '../../shaders/sky/sky.glsl';
import { QuadPass } from './QuadPass';
import { INCLUDE, skyFrag, type Uniforms } from './SkyUniforms';

export interface CloudBudget {
  /** Screen divisor for the raymarch. 4 = quarter resolution. */
  divisor: number;
  steps: number;
  lightSteps: number;
  envSteps: number;
  shapeRes: number;
  detailRes: number;
  weatherRes: number;
  shadowRes: number;
  /**
   * Cap on samples per sun ray in the shadow bake. The march wants one sample
   * every 300 m and the slant path runs from 2.4 km at noon to 20 km at a
   * six-degree sun, so this is what decides whether golden hour resolves cloud
   * bands or aliases them into flat murk. Cheaper than it looks: the map is a
   * couple of hundred texels square and rebakes four times a second.
   */
  shadowSteps: number;
  /** Hard cap on marched pixels, so a 4K window cannot melt the GPU. */
  maxPixels: number;
  historyBlend: number;
}

/**
 * Tile periods, in lattice cells per volume. These and the resolutions below are
 * one decision, not two: the highest Worley octave in the bake runs at four
 * times the period, so `res / (period * 4)` is how many texels reconstruct the
 * finest cell and it must not fall under about eight. Three rather than four for
 * the detail volume buys back the texels the extra octave costs, at the price of
 * a shorter repeat — which is invisible, because the detail volume is scaled to a
 * sixth of a cloud cell and is only ever seen through an erosion threshold.
 */
const SHAPE_PERIOD = 4;
const DETAIL_PERIOD = 3;
const WEATHER_PERIOD = 6;

/**
 * Solar elevation, as sin, at which cloud shadowing has fully faded out. Both
 * the lookup shear in `updateShadow` and the fade in `CLOUD_SHADOW_FRAG` are
 * built on it, so it lives here and travels to the shader as a uniform rather
 * than being written twice and drifting.
 *
 * 0.035 is two degrees, and the ramp above it is deliberately tight — full
 * strength by three and a quarter. The temptation is to start fading much
 * higher, on the grounds that a grazing ray is the hard case; that is exactly
 * backwards. Six degrees is the game's signature hour, it is where cloud shadows
 * are longest and most worth having, and a ramp generous enough to reach it
 * silently halves them: every texel of the map ends up multiplied by the same
 * sub-one constant, which is a uniform dimming wearing a shadow's name.
 *
 * At two degrees the sun contributes 3% of normal incidence to a horizontal
 * surface and the honest reading of it sitting behind cloud is that it has set.
 */
const SHADOW_MIN_SUN_Y = 0.035;

/**
 * Height, in metres, that the shadow map's footprint is sized to reach. The
 * lookup shears a point's sample `height / tan(elevation)` downrange, so the map
 * must cover the level plus that displacement for the tallest thing in it. Forty
 * metres is a rooftop with a parapet and an aerial on it, which at the three
 * degrees where shadowing fades out is 770 m of shear.
 */
const SHADOW_REACH_M = 40;

/**
 * Length of slant path the shadow bake integrates, in layer thicknesses,
 * centred where the ray crosses mid-layer. See `CLOUD_SHADOW_FRAG` for why the
 * integral is windowed rather than run to the end of the slab.
 *
 * Calibrated on the map's own statistics at the golden preset, where the sun is
 * six degrees up and the run across the weather field is nine kilometres per
 * layer thickness. Too narrow and the ray slips between cloud groups and nothing
 * on the ground is ever shaded; too wide and it meets one somewhere for every
 * ground point and the whole level goes evenly dim, which is the failure this
 * replaced wearing a different hat.
 */
const SHADOW_WINDOW_SPANS = 2;

function budgetFor(q: QualitySettings, software: boolean): CloudBudget {
  const base: CloudBudget = {
    divisor: 4,
    steps: 48,
    lightSteps: 6,
    envSteps: 14,
    shapeRes: 128,
    detailRes: 48,
    weatherRes: 256,
    shadowRes: 256,
    shadowSteps: 40,
    maxPixels: 200000,
    historyBlend: 0.87,
  };
  switch (q.preset) {
    case 'low':
      Object.assign(base, {
        divisor: 4, steps: 24, lightSteps: 3, envSteps: 8, shapeRes: 80,
        detailRes: 32, weatherRes: 128, shadowRes: 128, shadowSteps: 20,
        maxPixels: 40000,
      });
      break;
    case 'medium':
      Object.assign(base, {
        divisor: 4, steps: 32, lightSteps: 4, envSteps: 10, shapeRes: 96,
        detailRes: 40, weatherRes: 192, shadowRes: 192, shadowSteps: 28,
        maxPixels: 80000,
      });
      break;
    case 'high':
      Object.assign(base, {
        divisor: 4, steps: 44, lightSteps: 5, shapeRes: 112, shadowSteps: 36,
      });
      break;
    case 'ultra':
      break;
    case 'cinematic':
      Object.assign(base, {
        divisor: 2, steps: 72, lightSteps: 7, envSteps: 20, shapeRes: 160,
        detailRes: 64, weatherRes: 512, shadowRes: 512, shadowSteps: 56,
        maxPixels: 500000, historyBlend: 0.9,
      });
      break;
  }
  if (software) {
    /* SwiftShader has no texture units to hide behind: every trilinear tap is
       scalar work. Keep the algorithm and the screen divisor identical so the
       headless critique loop sees the real silhouette resolution — a silver
       lining is two or three pixels wide, and a coarser buffer averages away the
       single detail the lighting model exists to produce — and take the cut out
       of step counts and volume resolution instead. */
    base.divisor = Math.max(base.divisor, 4);
    base.steps = Math.min(base.steps, 44);
    base.lightSteps = Math.min(base.lightSteps, 4);
    base.envSteps = Math.min(base.envSteps, 7);
    /* The volumes are *not* on the list of things to cut. They cost bake time
       once and one trilinear tap per sample forever after, whatever their size,
       and a volume too small for its own frequency ladder does not look like a
       softer cloud — it looks like a box. */
    base.shapeRes = Math.min(base.shapeRes, 112);
    base.detailRes = Math.min(base.detailRes, 48);
    base.weatherRes = Math.min(base.weatherRes, 192);
    base.shadowRes = Math.min(base.shadowRes, 128);
    /* A quarter the texels of the GPU map, so the same wall-clock buys four
       times the samples per ray. Worth spending here rather than saving: this
       map is what decides whether the key light lands, and a shadow that is
       wrong is more expensive on screen than one that is coarse. */
    base.shadowSteps = Math.min(base.shadowSteps, 32);
    /* Enough for a true quarter of 1600x900, and not a pixel less: a tighter cap
       silently drops the march to a sixth of screen, every silhouette arrives as
       a five-pixel smear, and the critique loop then spends its time judging the
       upsampler instead of the cloud model. */
    base.maxPixels = Math.min(base.maxPixels, 96000);
  }
  return base;
}

/**
 * Volumetric cloud layer: two tiling 3D noise volumes, a weather map, a
 * fraction-resolution raymarch with a temporally accumulated history, and a
 * top-down shadow map the lighting rig can sample.
 */
export class CloudVolume {
  budget: CloudBudget;
  private shape: THREE.WebGL3DRenderTarget | null = null;
  private detail: THREE.WebGL3DRenderTarget | null = null;
  private weather: THREE.WebGLRenderTarget | null = null;
  private march: THREE.WebGLRenderTarget | null = null;
  private history: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget] | null = null;
  private shadow: THREE.WebGLRenderTarget | null = null;

  private shapePass: QuadPass;
  private detailPass: QuadPass;
  private weatherPass: QuadPass;
  private marchPass: QuadPass;
  private resolvePass: QuadPass;
  private shadowPass: QuadPass;

  private weatherPixels: Uint8Array | null = null;
  private weatherSize = 0;
  /** Sorted samples of the modulated coverage field; see `calibrateCover`. */
  private coverSamples: Float32Array | null = null;
  private historyIndex = 0;
  private historyValid = false;
  private prevViewProj = new THREE.Matrix4();
  private viewProj = new THREE.Matrix4();
  private frame = 0;
  private width = 1;
  private height = 1;

  readonly shadowMatrix = new THREE.Matrix4();
  shadowExtentKm = 3;
  /** 0..1 fraction of direct sun blocked by cloud above the camera. */
  sunOcclusion = 0;

  constructor(
    private uniforms: Uniforms,
    quality: QualitySettings,
    software: boolean,
  ) {
    this.budget = budgetFor(quality, software);
    this.shapePass = new QuadPass(skyFrag(INCLUDE.noise, CLOUD_SHAPE_FRAG), uniforms);
    this.detailPass = new QuadPass(skyFrag(INCLUDE.noise, CLOUD_DETAIL_FRAG), uniforms);
    this.weatherPass = new QuadPass(skyFrag(INCLUDE.noise, WEATHER_FRAG), uniforms);
    this.marchPass = new QuadPass(
      skyFrag(INCLUDE.noise, INCLUDE.atmosphere, INCLUDE.clouds, CLOUD_MARCH_FRAG),
      uniforms,
    );
    this.resolvePass = new QuadPass(skyFrag(CLOUD_RESOLVE_FRAG), uniforms);
    this.shadowPass = new QuadPass(
      skyFrag(INCLUDE.noise, INCLUDE.atmosphere, INCLUDE.clouds, CLOUD_SHADOW_FRAG),
      uniforms,
    );
    uniforms.uShadowWindow.value = SHADOW_WINDOW_SPANS;
  }

  get shadowTexture(): THREE.Texture | null {
    return this.shadow?.texture ?? null;
  }

  get resolvedTexture(): THREE.Texture | null {
    return this.history ? this.history[this.historyIndex].texture : null;
  }

  /* ------------------------------ bakes -------------------------------- */

  bake(renderer: THREE.WebGLRenderer): void {
    const b = this.budget;
    this.shape?.dispose();
    this.detail?.dispose();
    this.weather?.dispose();

    this.shape = this.volume(b.shapeRes);
    this.detail = this.volume(b.detailRes);
    this.weather = new THREE.WebGLRenderTarget(b.weatherRes, b.weatherRes, {
      type: THREE.UnsignedByteType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: false,
    });

    this.uniforms.uPeriod.value = SHAPE_PERIOD;
    for (let z = 0; z < b.shapeRes; z++) {
      this.uniforms.uSliceZ.value = (z + 0.5) / b.shapeRes;
      this.shapePass.render(renderer, this.shape, z);
    }
    this.uniforms.uPeriod.value = DETAIL_PERIOD;
    for (let z = 0; z < b.detailRes; z++) {
      this.uniforms.uSliceZ.value = (z + 0.5) / b.detailRes;
      this.detailPass.render(renderer, this.detail, z);
    }
    this.uniforms.uPeriod.value = WEATHER_PERIOD;
    this.weatherPass.render(renderer, this.weather);

    /* One readback gives the CPU the exact coverage field the GPU marches, so
       the sun-occlusion scalar the lighting rig reads never disagrees with the
       clouds on screen. */
    this.weatherSize = b.weatherRes;
    this.weatherPixels = new Uint8Array(b.weatherRes * b.weatherRes * 4);
    renderer.readRenderTargetPixels(
      this.weather, 0, 0, b.weatherRes, b.weatherRes, this.weatherPixels,
    );

    this.uniforms.uCloudShape.value = this.shape.texture;
    this.uniforms.uCloudDetail.value = this.detail.texture;
    this.uniforms.uWeatherTex.value = this.weather.texture;

    /* One sorted sample of the field the threshold has to split. The two scroll
       layers drift, but their joint distribution does not, so this is measured
       once. */
    const n = 112;
    const span = 1 / Math.max(this.uniforms.uCloudWeatherScale.value as number, 1e-6);
    const samples = new Float32Array(n * n);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        samples[j * n + i] = this.fieldAt((i / n) * span, (j / n) * span);
      }
    }
    samples.sort();
    this.coverSamples = samples;
    this.calibrateCover();

    this.shadow?.dispose();
    this.shadow = new THREE.WebGLRenderTarget(b.shadowRes, b.shadowRes, {
      type: THREE.UnsignedByteType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: false,
    });
  }

  private volume(res: number): THREE.WebGL3DRenderTarget {
    const rt = new THREE.WebGL3DRenderTarget(res, res, res, {
      type: THREE.UnsignedByteType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: false,
    });
    rt.texture.wrapR = THREE.RepeatWrapping;
    return rt;
  }

  /* ----------------------------- sizing -------------------------------- */

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    const b = this.budget;
    let w = Math.max(32, Math.round(width / b.divisor));
    let h = Math.max(18, Math.round(height / b.divisor));
    const pixels = w * h;
    if (pixels > b.maxPixels) {
      const s = Math.sqrt(b.maxPixels / pixels);
      w = Math.max(32, Math.round(w * s));
      h = Math.max(18, Math.round(h * s));
    }
    if (this.march && this.march.width === w && this.march.height === h) return;

    this.march?.dispose();
    this.history?.[0].dispose();
    this.history?.[1].dispose();

    const opts: THREE.RenderTargetOptions = {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: false,
    };
    this.march = new THREE.WebGLRenderTarget(w, h, opts);
    this.history = [
      new THREE.WebGLRenderTarget(w, h, opts),
      new THREE.WebGLRenderTarget(w, h, opts),
    ];
    this.historyValid = false;
  }

  /** Drops the accumulated history, e.g. after a time-of-day jump. */
  invalidate(): void {
    this.historyValid = false;
  }

  /* ------------------------------ update ------------------------------- */

  /**
   * Marches the layer and folds it into the temporal history. Runs in
   * `lateUpdate` — after the camera is final for the frame, before the pipeline
   * draws — so the dome can sample the result by reprojecting through the very
   * matrices used here.
   */
  update(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera, enabled: boolean): void {
    const u = this.uniforms;
    if (!enabled || !this.march || !this.history) {
      u.uCloudEnabled.value = 0;
      return;
    }

    this.frame++;
    const cur = this.history[this.historyIndex];
    const next = this.history[1 - this.historyIndex];

    camera.updateMatrixWorld();
    this.viewProj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);

    u.uInvViewProj.value = (u.uInvViewProj.value as THREE.Matrix4).copy(this.viewProj).invert();
    (u.uCamWorld.value as THREE.Vector3).setFromMatrixPosition(camera.matrixWorld);
    (u.uCamWorldXZ.value as THREE.Vector2).set(
      camera.position.x * 0.001,
      camera.position.z * 0.001,
    );
    u.uFrameIndex.value = this.frame % 64;
    u.uCloudSteps.value = this.budget.steps;
    u.uCloudLightSteps.value = this.budget.lightSteps;

    this.marchPass.render(renderer, this.march);

    u.uCurrent.value = this.march.texture;
    u.uHistory.value = cur.texture;
    (u.uTexel.value as THREE.Vector2).set(1 / this.march.width, 1 / this.march.height);
    (u.uPrevViewProj.value as THREE.Matrix4).copy(this.prevViewProj);
    u.uHistoryBlend.value = this.historyValid ? this.budget.historyBlend : 0;
    this.resolvePass.render(renderer, next);

    this.historyIndex = 1 - this.historyIndex;
    this.historyValid = true;
    this.prevViewProj.copy(this.viewProj);

    u.uCloudResolved.value = next.texture;
    (u.uCloudTexSize.value as THREE.Vector2).set(next.width, next.height);
    (u.uCloudViewProj.value as THREE.Matrix4).copy(this.viewProj);
    u.uCloudEnabled.value = 1;
  }

  /**
   * Refreshed on a slow cadence: the sun moves slowly and so do clouds.
   *
   * The map is *not* a projection of the deck. Each texel marches the sun ray
   * upward from the ground point that texel stands for, so the value already
   * accounts for the cloud being tens of kilometres downrange — the alternative,
   * marching per shaded fragment, is the same integral at a hundred thousand
   * times the cost. What the texel stores is "the transmittance of the sun ray
   * that arrives *here*", and the lookup's only job is to find, for a shaded
   * point, which ground point its sun ray passed through.
   *
   * That is where the bug was. A point at height y is lit by the ray crossing
   * y=0 at `p.xz - (y / sunDir.y) * sunDir.xz`, and the old matrix used `p.xz`
   * flat, so it ignored the shear entirely. The error is `y / tan(elevation)`:
   * nothing on the ground, but 9.5 m per metre of height at a 6-degree sun, so a
   * twelve-metre parapet read the shadow of a cloud a hundred metres downrange
   * of the one actually above it, and a roof could sit in shade while the street
   * under it sat in sun. Folding the shear into the matrix keeps the lookup at
   * one transform and costs the receiver nothing.
   */
  updateShadow(renderer: THREE.WebGLRenderer, camera: THREE.Camera): void {
    if (!this.shadow) return;
    const sun = this.uniforms.uSunDir.value as THREE.Vector3;
    const cot = 1 / Math.max(sun.y, SHADOW_MIN_SUN_Y);

    /* The shear moves a shaded point's lookup `height * cot` downrange, so the
       map has to cover the level *plus* that reach or the tallest geometry in
       frame samples off the edge — which is the artefact the old code hid by
       clamping the uv and smearing one edge texel across the map. Sized from the
       shear a rooftop needs, and centred on the camera. */
    const e = clamp(
      this.shadowExtentKm + SHADOW_REACH_M * cot * 0.001,
      this.shadowExtentKm,
      12,
    );

    /* Snap to a texel grid so the map does not shimmer as the player walks. */
    const texel = (2 * e) / this.budget.shadowRes;
    const cx = Math.round((camera.position.x * 0.001) / texel) * texel;
    const cz = Math.round((camera.position.z * 0.001) / texel) * texel;
    (this.uniforms.uShadowCenter.value as THREE.Vector2).set(cx, cz);
    this.uniforms.uShadowExtent.value = e;
    this.uniforms.uShadowMinSunY.value = SHADOW_MIN_SUN_Y;
    this.uniforms.uShadowSteps.value = this.budget.shadowSteps;
    this.shadowPass.render(renderer, this.shadow);

    const inv = 1 / (2 * e);
    /* Metres to kilometres, then kilometres to uv. */
    const s = 0.001 * inv;
    this.shadowMatrix.set(
      s, -s * sun.x * cot, 0, 0.5 - cx * inv,
      0, -s * sun.z * cot, s, 0.5 - cz * inv,
      0, 0, 0, 0,
      0, 0, 0, 1,
    );
  }

  /* --------------------------- CPU coverage ---------------------------- */

  private weatherTap(x: number, y: number, channel: number): number {
    const px = this.weatherPixels;
    const n = this.weatherSize;
    if (!px || n === 0) return 0;
    const fx = x * n - 0.5;
    const fy = y * n - 0.5;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = fx - x0;
    const ty = fy - y0;
    const wrap = (v: number) => ((v % n) + n) % n;
    const at = (ix: number, iy: number) =>
      px[(wrap(iy) * n + wrap(ix)) * 4 + channel] / 255;
    const a = at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx;
    const b = at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx;
    return a * (1 - ty) + b * ty;
  }

  /** The modulated coverage field at a world position; mirrors `cloudWeather()`. */
  private fieldAt(xKm: number, zKm: number): number {
    const u = this.uniforms;
    const s = u.uCloudWeatherScale.value as number;
    const o1 = u.uWeatherOffset.value as THREE.Vector2;
    const o2 = u.uWeatherOffset2.value as THREE.Vector2;
    const a = this.weatherTap((xKm + o1.x) * s, (zKm + o1.y) * s, 0);
    const b = this.weatherTap((xKm * 0.61 + o2.x) * s, (zKm * 0.61 + o2.y) * s, 2);
    return a * (0.42 + 0.58 * b);
  }

  /**
   * Mirrors `cloudCoverageAt()` in the shader. The two must agree or the key
   * light will dim while the sky above the player is clear.
   */
  private coverageAt(xKm: number, zKm: number): number {
    return this.localCoverage(this.fieldAt(xKm, zKm));
  }

  private localCoverage(w: number): number {
    const u = this.uniforms;
    const lo = u.uCloudCoverLo.value as number;
    const local = saturate((w - lo) / Math.max(1 - lo, 0.12));
    const lid = THREE.MathUtils.smoothstep(u.uCloudCoverage.value as number, 0.7, 1);
    return saturate(lerp(local * 0.85, 0.46 + local * 0.54, lid));
  }

  /* ------------------------------ probes ------------------------------- */

  /**
   * Coverage of the deck at a world position in km, so a test can ask where the
   * cloud is independently of where its shadow landed.
   */
  coverAtKm(xKm: number, zKm: number): number {
    return this.coverageAt(xKm, zKm);
  }

  /** Where a world-space point in metres lands in the shadow map. */
  shadowUv(world: THREE.Vector3, out: THREE.Vector2): THREE.Vector2 {
    const m = this.shadowMatrix.elements;
    return out.set(
      m[0] * world.x + m[4] * world.y + m[8] * world.z + m[12],
      m[1] * world.x + m[5] * world.y + m[9] * world.z + m[13],
    );
  }

  /**
   * The baked map as transmittance in 0..1, with the footprint it was baked
   * over. Read back on demand for the numeric checks; the render path never
   * calls this.
   */
  readShadow(renderer: THREE.WebGLRenderer): {
    size: number;
    data: Float32Array;
    centerKm: THREE.Vector2;
    extentKm: number;
  } | null {
    if (!this.shadow) return null;
    const size = this.budget.shadowRes;
    const bytes = new Uint8Array(size * size * 4);
    renderer.readRenderTargetPixels(this.shadow, 0, 0, size, size, bytes);
    const data = new Float32Array(size * size);
    for (let i = 0; i < size * size; i++) data[i] = bytes[i * 4] / 255;
    return {
      size,
      data,
      centerKm: (this.uniforms.uShadowCenter.value as THREE.Vector2).clone(),
      extentKm: this.uniforms.uShadowExtent.value as number,
    };
  }

  /**
   * Places the coverage threshold so `weather.cloudCover` means what it says.
   *
   * The threshold that covers a given fraction of the sky is a quantile of the
   * coverage field, and that field is a domain-warped fBm multiplied by a second
   * scroll of itself — skewed, and with no closed form for its distribution. Every
   * attempt to fit the threshold by hand has been out by a factor of two or more
   * in one direction or the other, and the error is invisible in the number and
   * glaring in the render.
   *
   * So it is measured: the field is sampled on a grid off the readback, sorted
   * once, and the threshold is then found by bisection against the same
   * `coverageAt` the shader evaluates. Exact by construction, and it stays exact
   * when the noise changes.
   */
  private calibrateCover(): void {
    const u = this.uniforms;
    if (!this.coverSamples) {
      u.uCloudCoverLo.value = 0.55;
      return;
    }
    const g = u.uCloudCoverage.value as number;
    if (g >= 0.999) {
      u.uCloudCoverLo.value = 0;
      return;
    }
    const samples = this.coverSamples;
    /* Fraction of the field that would produce cloud dense enough to see. */
    const covered = (lo: number): number => {
      u.uCloudCoverLo.value = lo;
      let hit = 0;
      for (let i = 0; i < samples.length; i++) {
        if (this.localCoverage(samples[i]) > 0.12) hit++;
      }
      return hit / samples.length;
    };
    let loEnd = 0;
    let hiEnd = 1;
    for (let i = 0; i < 18; i++) {
      const mid = (loEnd + hiEnd) * 0.5;
      if (covered(mid) > g) loEnd = mid;
      else hiEnd = mid;
    }
    u.uCloudCoverLo.value = (loEnd + hiEnd) * 0.5;
  }

  /** Fraction of the map that makes visible cloud, for the debug report. */
  measuredCover(): number {
    const samples = this.coverSamples;
    if (!samples) return 0;
    let hit = 0;
    for (let i = 0; i < samples.length; i++) {
      if (this.localCoverage(samples[i]) > 0.12) hit++;
    }
    return hit / samples.length;
  }

  /** Called when cover changes; the threshold depends on it. */
  coverChanged(): void {
    this.calibrateCover();
  }

  /**
   * Fraction of the sun blocked by cloud above the camera, for the key light.
   * The layer is optically thick, so coverage maps almost binarily to shadow;
   * the smoothstep is the penumbra of a cloud edge crossing the sun.
   */
  updateSunOcclusion(sunDir: THREE.Vector3, camera: THREE.Camera, enabled: boolean): void {
    if (!enabled || sunDir.y <= SHADOW_MIN_SUN_Y || !this.weatherPixels) {
      this.sunOcclusion = 0;
      return;
    }
    const u = this.uniforms;
    const bottom = u.uCloudBottom.value as number;
    const top = u.uCloudTop.value as number;
    const mid = (bottom + top) * 0.5;
    /* Same cutoff as the map, so the fallback scalar and the map it stands in for
       hand over at the same elevation instead of one shadowing while the other
       has already given up. */
    const t = mid / Math.max(sunDir.y, SHADOW_MIN_SUN_Y);
    const x = camera.position.x * 0.001 + sunDir.x * t;
    const z = camera.position.z * 0.001 + sunDir.z * t;
    const cover = this.coverageAt(x, z);
    const dense = clamp((u.uCloudDensity.value as number) * 0.9, 0.2, 1.4);
    this.sunOcclusion = saturate(
      THREE.MathUtils.smoothstep(cover, 0.34, 0.86) * 0.94 * dense,
    );
  }

  onQualityChange(renderer: THREE.WebGLRenderer, q: QualitySettings, software: boolean): void {
    const prev = this.budget;
    this.budget = budgetFor(q, software);
    if (
      prev.shapeRes !== this.budget.shapeRes ||
      prev.detailRes !== this.budget.detailRes ||
      prev.weatherRes !== this.budget.weatherRes ||
      prev.shadowRes !== this.budget.shadowRes
    ) {
      this.bake(renderer);
    }
    this.resize(this.width, this.height);
  }

  dispose(): void {
    this.shape?.dispose();
    this.detail?.dispose();
    this.weather?.dispose();
    this.march?.dispose();
    this.history?.[0].dispose();
    this.history?.[1].dispose();
    this.shadow?.dispose();
    this.shapePass.dispose();
    this.detailPass.dispose();
    this.weatherPass.dispose();
    this.marchPass.dispose();
    this.resolvePass.dispose();
    this.shadowPass.dispose();
  }
}
