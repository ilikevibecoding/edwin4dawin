import * as THREE from 'three';
import { CSM } from 'three/addons/csm/CSM.js';
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  CopyPass,
  BloomEffect,
  SMAAEffect,
  SMAAPreset,
  EdgeDetectionMode,
  ToneMappingEffect,
  ToneMappingMode,
  GodRaysEffect,
  DepthOfFieldEffect,
  KernelSize,
  BlendFunction,
} from 'postprocessing';
import { N8AOPostPass } from 'n8ao';
import { ColorGradeEffect } from './ColorGradeEffect.js';
import { LensEffect } from './LensEffect.js';

/**
 * Owns the WebGLRenderer, scene, cameras, sun/sky lighting (CSM) and the post-processing pipeline.
 *
 * Layers:  0 = world, 1 = first-person view model (rendered by `weaponCamera` with its own FOV
 *          after the world so it never clips into geometry), 2 = HUD-space 3D (unused),
 *          3 = shadow-only proxies of the view model (never visible; see setViewModel).
 *
 * Pass order:  world (camera, layer 0) → N8AO → [DoF + copy while ADS] → view model (weaponCamera, layer 1,
 *              depth cleared) → god rays + bloom + tone mapping + colour grade → SMAA → lens (chroma,
 *              vignette, grain, damage/low-health/death FX) → screen.
 *
 * Materials: every MeshStandard/Physical material that should receive cascaded shadows must be
 * registered via `render.setupObject(obj)` or `render.registerMaterial(mat)` (done automatically for
 * everything in the scene when `onSceneReady()` runs after load; call it yourself for runtime spawns).
 *
 * Scene-referred scale (what emissive/lighting values mean): the sky HDRI is used at intensity 1
 * (sky ≈ 0.45, clouds ≈ 1–2), the sun is an analytic light (`sunIntensity`), a sunlit white surface
 * ≈ 1.5–2.5, exposure 1.0 with ACES. Emissive ≥ 2.5 blooms clearly; ≥ 6 is a strong light source.
 */
export const LAYER = { WORLD: 0, VIEWMODEL: 1, OVERLAY: 2, SHADOW_ONLY: 3 };

/* ------------------------------------------------------------------------------------------------
 * TUNABLES — everything visual lives here. URL params override a few for quick A/B:
 *   ?tonemap=aces|agx|neutral  ?exposure=1.1  ?sun=5  ?env=1  ?fog=0.004  ?godrays=0  ?dof=0  ?bloom=0
 *   ?smaa=0  ?grain=0  ?chroma=0  ?vignette=0  ?ao=0  ?shadows=0  ?skyYaw=deg  ?sunAz=deg&sunEl=deg
 * ---------------------------------------------------------------------------------------------- */
export const TUNE = {
  // --- Lighting & exposure -------------------------------------------------------------------
  toneMapping: 'aces', // 'aces' | 'agx' | 'neutral' — ACES gives the punchy COD contrast; AGX is flatter
  exposure: 1.15, // renderer.toneMappingExposure, respected by the composer's ToneMappingEffect
  sunIntensity: 5.2, // analytic sun (CSM) — sun:sky irradiance on the ground ≈ 3.5:1 at 50° elevation
  sunColor: 0xfff3e2, // slightly warm midday sun
  environmentIntensity: 1.0, // IBL from the (sun-clamped) HDRI (sky ≈ 0.45 → shadowed white ≈ 0.45)
  // Visible sky is exposed much brighter than the IBL: the reference sky is the brightest large surface in frame
  // (blue ≈ 170 sRGB, clouds ≈ 195–205, never clipped), brighter than sunlit pavement (≈ 160). The IBL keeps
  // physical scale so shadows do not lift.
  backgroundIntensity: 2.3,
  envClamp: 6.0, // radiance clamp for the IBL copy (removes the sun disk, keeps bright clouds)
  skyClamp: 15.0, // radiance clamp for the visible sky (× backgroundIntensity ≈ 35: the sun blooms as a glare, not a blob)
  // Art direction baked into the visible sky texture at load (IBL untouched): the HDRI zenith is a deep saturated
  // blue; the reference is a pale, hazy coastal sky. Haze mixes toward the horizon colour, strongest at the horizon.
  skySaturation: 0.88,
  skyHaze: 0.42,
  skyHazePower: 1.6, // haze weight = skyHaze × (1 − sin(elevation))^power — concentrated near the horizon
  // Ground-bounce fill (HemisphereLight): the IBL's lower hemisphere is dark, so walls and undersides get a warm
  // pavement bounce from below; the sky half is kept dim so ground shadows stay at the IBL level (sun:sky ≈ 3.5:1).
  hemiSky: 0x2a3344,
  hemiGround: 0xb39d80,
  hemiIntensity: 0.5,

  // --- Fog / aerial perspective ---------------------------------------------------------------
  fogDensity: 0.0017, // FogExp2: ~10% at 60 m (plaza width), ~28% at 200 m; colour sampled from the HDRI horizon
  fogTint: new THREE.Color(1.0, 1.0, 1.0), // multiplied into the sampled horizon colour

  // --- Shadows (cascaded shadow maps) ---------------------------------------------------------
  shadowMaxFar: 180, // metres; beyond this surfaces are lit without shadow (fade handles the transition)
  cascadeSplits: {
    // normalized split distances (fraction of shadowMaxFar) per cascade count
    2: [0.12, 1],
    3: [0.06, 0.25, 1],
    4: [0.045, 0.14, 0.36, 1],
  },
  shadowBias: -0.00003, // NDC depth units of a `shadowLightFar` deep ortho frustum → ≈ -2.4 cm
  shadowNormalBiasTexels: 1.6, // normal bias per cascade = max(min, texels × texel size)
  shadowNormalBiasMin: 0.02,
  shadowRadius: 1.6, // PCF Vogel-disk radius in texels (r185 hardware PCF)
  shadowLightMargin: 140, // how far behind the frustum slice (toward the sun) casters are still captured
  shadowLightFar: 800,
  shadowFade: true,

  // --- Ambient occlusion (N8AO) ---------------------------------------------------------------
  aoRadius: 1.6, // metres
  aoIntensity: 1.6,
  aoDistanceFalloff: 1.0,
  aoDenoiseRadius: 10,
  aoColor: 0x070a12, // blue-black: occluded ambient keeps a sky tint

  // --- Post stack -----------------------------------------------------------------------------
  // Bloom mask = smoothstep(threshold − smoothing, threshold + smoothing, luminance): starts at 1.3, so sunlit
  // stone (≈ 1.0–1.4 scene-linear) stays clean and only the sun, bright clouds and emissives glow.
  bloomIntensity: 0.28,
  bloomThreshold: 1.6,
  bloomSmoothing: 0.3,
  bloomRadius: 0.65,
  bloomLevels: 7,
  // Radial march from each pixel toward the sun: reach = density × distance, per-sample falloff = decay. With decay
  // 0.965 the glow still reads 3–6 disc radii out (a soft 5–8° halo / rays through foliage); 0.92 made it vanish.
  godRays: { samples: 60, density: 0.96, decay: 0.965, weight: 0.2, exposure: 0.35, clampMax: 0.6, resolutionScale: 0.5 },
  sunDiskAngle: 1.4, // degrees, angular radius of the god-ray light source (real sun = 0.27°; it is never drawn directly)
  sunDiskDistance: 600, // metres from the camera (must be < camera.far)
  sunDiskColor: 0xfff1d0,
  dof: { focusDistance: 3.6, focusRange: 2.6, bokehScale: 3.2, resolutionScale: 0.5 }, // ADS near-field only (world units)
  grade: {
    contrast: 0.12,
    saturation: 1.04,
    vibrance: 0.08,
    splitStrength: 0.05,
    shadowTint: new THREE.Vector3(-0.02, 0.005, 0.03),
    highlightTint: new THREE.Vector3(0.025, 0.008, -0.02),
  },
  lens: { chroma: 0.001, vignetteStart: 0.6, vignetteDarkness: 0.32, grain: 0.028, sharpen: 0.0 }, // chroma ≈ 1.7 px at the frame edge @1080p (fringes only on high-contrast edges)

  // --- Camera FX timing -----------------------------------------------------------------------
  damageDecay: 2.6, // 1/s
  deathRampTime: 1.4, // seconds to full death fade
  pulseDecay: 2.2,
  lowHealthStart: 0.55, // fraction of max health where the low-health vignette starts

  // --- Adaptive quality -----------------------------------------------------------------------
  adaptiveFps: 45,
  adaptiveHoldSeconds: 3,
  adaptiveCooldownSeconds: 10,
};

const QUALITY_ORDER = ['low', 'medium', 'high', 'ultra'];
const noRaycast = () => {};
const TONEMAP_MODES = { aces: ToneMappingMode.ACES_FILMIC, agx: ToneMappingMode.AGX, neutral: ToneMappingMode.NEUTRAL };

export class RenderSystem {
  constructor(game) {
    this.game = game;
    const { settings } = game;
    const q = settings.quality;
    const p = settings.params;

    this.renderer = new THREE.WebGLRenderer({
      canvas: game.canvas,
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
      alpha: false,
      logarithmicDepthBuffer: false,
    });
    // Preset pixelRatio is the render scale in CSS pixels (ultra = 1.5× supersampling, also on DPR-1 displays);
    // adaptive quality steps it down when the GPU cannot keep up.
    this.renderer.setPixelRatio(q.pixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping; // tone mapping happens in the composer
    this.renderer.shadowMap.enabled = q.shadows;
    this.renderer.shadowMap.type = THREE.PCFShadowMap; // r185: hardware PCF, Vogel disk × shadow.radius
    this.renderer.autoClear = false;
    this.renderer.info.autoReset = false;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(settings.fov, window.innerWidth / window.innerHeight, 0.05, 800);
    this.camera.layers.set(LAYER.WORLD);
    this.camera.layers.enable(LAYER.SHADOW_ONLY); // view-model shadow proxies (invisible in the colour pass)
    this.baseFov = settings.fov;

    // View-model shadow proxies: three culls shadow casters with the *main* camera's layer mask, so layer-1 meshes
    // never reach the shadow maps. Each view-model mesh gets a proxy on SHADOW_ONLY sharing its geometry/skeleton
    // with a material that always fails the depth test (zero fill cost, invisible) but casts shadows.
    this.shadowProxyGroup = new THREE.Group();
    this.shadowProxyGroup.name = 'ViewModelShadowProxies';
    this.shadowProxyGroup.matrixAutoUpdate = false;
    this.scene.add(this.shadowProxyGroup);
    this._shadowProxies = new Map(); // source mesh → proxy
    this._shadowProxyList = [];
    this._shadowOnlyMaterial = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthFunc: THREE.NeverDepth });
    this._shadowOnlyMaterial.name = 'ViewModelShadowOnly';

    this.weaponCamera = new THREE.PerspectiveCamera(settings.weaponFov, this.camera.aspect, 0.01, 12);
    this.weaponCamera.layers.set(LAYER.VIEWMODEL);
    this.baseWeaponFov = settings.weaponFov;

    // --- Lighting state ---
    this.sunDirection = new THREE.Vector3(0.4, 0.8, 0.3).normalize(); // toward the sun; replaced by HDRI analysis
    this.sunColor = new THREE.Color(TUNE.sunColor);
    this.sunIntensity = p.has('sun') ? parseFloat(p.get('sun')) : TUNE.sunIntensity;
    this.csm = null;
    this.sunLight = null;
    this._csmMaterials = new WeakSet();
    this._materialHooks = new WeakMap(); // material → { hook, key } original user hooks (restored on CSM rebuild)
    this._csmFov = 0;
    this._csmAspect = 0;

    this.toneMappingName = p.get('tonemap') || TUNE.toneMapping;
    this._exposure = p.has('exposure') ? parseFloat(p.get('exposure')) : TUNE.exposure;
    this.renderer.toneMappingExposure = this._exposure;

    // --- Camera motion ---
    this.shakeAmount = 0;
    this.shakeDecay = 4;
    this._shakeTime = 0;
    this._shakeOffset = new THREE.Vector3();
    this._shakeRot = new THREE.Euler();
    this.fovZoom = 1; // multiplied into camera FOV (ADS); weapons set this via setAds()
    this._adsBlend = 0;
    this.adsTarget = 0;

    // --- Camera FX state (pushed into LensEffect uniforms every frame) ---
    this.fx = { damage: 0, lowHealth: 0, death: 0, deathTarget: 0, pulse: 0 };

    // --- Post stack ---
    this.composer = null;
    this.effects = {};
    this.hudVisible = true;
    this.viewmodelVisible = true;
    this.sunDisk = null;

    // --- Quality ---
    this.adaptiveQuality = !settings.shotMode;
    this._lowFpsTime = 0;
    this._adaptiveCooldown = 0;
    this._lastFrameStamp = 0;
    this.measuredFps = 60;

    this._tmpV = new THREE.Vector3();
    this._tmpV2 = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 1, 0);

    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    this._bindEvents();
  }

  /* ============================================================================================
   * Init: sky, IBL, sun, fog, composer
   * ========================================================================================== */

  async init() {
    const { assets, settings } = this.game;

    const hdr = await assets.loadHDR('kloofendal_48d_partly_cloudy_puresky');
    this.sky = hdr;
    const analysis = this.analyzeHDR(hdr, TUNE.envClamp, TUNE.skyClamp);
    this.skyStats = analysis.stats;
    this.sunDirection.copy(analysis.sunDirection);
    if (settings.params.has('sunAz') || settings.params.has('sunEl')) {
      const az = THREE.MathUtils.degToRad(parseFloat(settings.params.get('sunAz') || '0'));
      const el = THREE.MathUtils.degToRad(parseFloat(settings.params.get('sunEl') || '45'));
      this.sunDirection.set(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));
    }

    // IBL: sun energy removed (the analytic light provides it). Visible sky: sun disk limited to
    // `skyClamp` so bloom produces a glare instead of a screen-filling blob.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();
    const envRT = pmrem.fromEquirectangular(analysis.envTexture);
    pmrem.dispose();
    analysis.envTexture.dispose();
    this.envMap = envRT.texture;
    this.scene.environment = this.envMap;
    this.scene.environmentIntensity = settings.params.has('env') ? parseFloat(settings.params.get('env')) : TUNE.environmentIntensity;
    this.skyTexture = analysis.skyTexture;
    this.scene.background = this.skyTexture;
    this.scene.backgroundIntensity = TUNE.backgroundIntensity;
    this.scene.backgroundBlurriness = 0;

    // Aerial perspective: fog colour = HDRI horizon radiance (scene-linear, pre tone mapping).
    const fogColor = analysis.stats.horizon.clone().multiply(TUNE.fogTint).multiplyScalar(TUNE.backgroundIntensity);
    const fogDensity = settings.params.has('fog') ? parseFloat(settings.params.get('fog')) : TUNE.fogDensity;
    this.scene.fog = new THREE.FogExp2(fogColor, fogDensity);

    this._buildSun();
    const hemi = new THREE.HemisphereLight(TUNE.hemiSky, TUNE.hemiGround, TUNE.hemiIntensity);
    hemi.name = 'HemiFill';
    this.scene.add(hemi);
    this.hemiLight = hemi;

    this._baseSunDirection = this.sunDirection.clone();
    this.skyYaw = 0;
    if (settings.params.has('skyYaw')) this.setSkyRotation(THREE.MathUtils.degToRad(parseFloat(settings.params.get('skyYaw'))));

    this.buildComposer();
    this.game.events.on('game:ready', () => this._registerDebugViews());
  }

  _bindEvents() {
    const ev = this.game.events;
    ev.on('player:damaged', (e) => this.damageFlash(Math.min(1, 0.35 + (e?.amount || 10) / 40)));
    ev.on('player:health', (e) => {
      if (!e || !e.max) return;
      const f = e.health / e.max;
      this.setLowHealth(THREE.MathUtils.clamp((TUNE.lowHealthStart - f) / TUNE.lowHealthStart, 0, 1));
    });
    ev.on('player:died', () => this.deathFade(true));
    ev.on('player:respawn', () => {
      this.deathFade(false);
      this.fx.death = 0;
      this.fx.damage = 0;
      this.fx.lowHealth = 0;
    });
    ev.on('explosion', (e) => {
      if (!e?.position) return;
      const d = this.camera.getWorldPosition(this._tmpV).distanceTo(e.position);
      const reach = Math.max(8, (e.radius || 5) * 4);
      const s = THREE.MathUtils.clamp(1 - d / reach, 0, 1);
      if (s > 0) this.distortionPulse(0.35 + 0.65 * s);
    });
    ev.on('camera:shake', (e) => this.shake(e?.intensity ?? 0.05, e?.duration ?? 0.4));
  }

  /* ============================================================================================
   * Sun / sky
   * ========================================================================================== */

  _buildSun() {
    const q = this.game.settings.quality;
    if (this.csm) {
      this.csm.remove();
      this.csm.dispose(); // strips USE_CSM defines/hooks from all registered materials (needsUpdate)
      this.csm = null;
    }
    if (this.sunLight) {
      this.scene.remove(this.sunLight, this.sunLight.target);
      this.sunLight = null;
    }
    this._csmMaterials = new WeakSet();

    if (q.shadows) {
      const splits = TUNE.cascadeSplits[q.shadowCascades] || TUNE.cascadeSplits[3];
      this.csm = new CSM({
        maxFar: TUNE.shadowMaxFar,
        cascades: q.shadowCascades,
        mode: 'custom',
        customSplitsCallback: (amount, near, far, target) => {
          for (let i = 0; i < amount; i++) target.push(splits[Math.min(i, splits.length - 1)]);
        },
        parent: this.scene,
        shadowMapSize: q.shadowMapSize,
        lightDirection: this.sunDirection.clone().negate(),
        lightIntensity: this.sunIntensity,
        lightColor: this.sunColor,
        camera: this.camera,
        shadowBias: TUNE.shadowBias,
        lightMargin: TUNE.shadowLightMargin,
        lightFar: TUNE.shadowLightFar,
        lightNear: 1,
      });
      this.csm.fade = TUNE.shadowFade;
      for (const light of this.csm.lights) {
        light.name = 'SunCascade';
        light.color.copy(this.sunColor);
        light.intensity = this.sunIntensity;
        light.shadow.radius = TUNE.shadowRadius;
        light.layers.enable(LAYER.VIEWMODEL); // the weapon camera only sees this layer; lights must be on it too
      }
      this._updateCsmFrustums(true);
    } else {
      const sun = new THREE.DirectionalLight(this.sunColor, this.sunIntensity);
      sun.name = 'Sun';
      sun.position.copy(this.sunDirection).multiplyScalar(100);
      sun.layers.enable(LAYER.VIEWMODEL);
      this.scene.add(sun);
      this.scene.add(sun.target);
      this.sunLight = sun;
    }
    this.hemiLight?.layers.enable(LAYER.VIEWMODEL);
  }

  /** Recompute cascade frustums when the camera FOV/aspect changed; refresh per-cascade normal bias. */
  _updateCsmFrustums(force = false) {
    const csm = this.csm;
    if (!csm) return;
    const cam = this.camera;
    if (!force && Math.abs(cam.fov - this._csmFov) < 0.25 && cam.aspect === this._csmAspect) return;
    this._csmFov = cam.fov;
    this._csmAspect = cam.aspect;
    csm.updateFrustums();
    for (const light of csm.lights) {
      const sc = light.shadow.camera;
      const texel = (sc.right - sc.left) / csm.shadowMapSize;
      light.shadow.normalBias = Math.max(TUNE.shadowNormalBiasMin, texel * TUNE.shadowNormalBiasTexels);
      light.shadow.bias = TUNE.shadowBias;
    }
  }

  /** Change the sun (intensity/colour) at runtime, e.g. for time-of-day tweaks. */
  setSun({ intensity, color } = {}) {
    if (intensity != null) this.sunIntensity = intensity;
    if (color != null) this.sunColor.set(color);
    if (this.csm) {
      this.csm.lightIntensity = this.sunIntensity;
      for (const l of this.csm.lights) {
        l.intensity = this.sunIntensity;
        l.color.copy(this.sunColor);
      }
    }
    if (this.sunLight) {
      this.sunLight.intensity = this.sunIntensity;
      this.sunLight.color.copy(this.sunColor);
    }
    if (this.sunDisk) this.sunDisk.material.color.copy(this.sunColor);
  }

  /**
   * Rotate the sky (background + environment) around Y by `yawRad` and keep the sun light aligned.
   * Lets level design place the sun for composition without touching the HDRI.
   */
  setSkyRotation(yawRad) {
    this.skyYaw = yawRad;
    this.scene.backgroundRotation.set(0, yawRad, 0);
    this.scene.environmentRotation.set(0, yawRad, 0);
    const base = this._baseSunDirection || (this._baseSunDirection = this.sunDirection.clone());
    this.sunDirection.copy(base).applyAxisAngle(this._up, yawRad);
    if (this.csm) this.csm.lightDirection.copy(this.sunDirection).negate();
    if (this.sunLight) this.sunLight.position.copy(this.sunDirection).multiplyScalar(100);
  }

  /** Exposure (renderer.toneMappingExposure); the composer's tone mapping effect reads the same uniform. */
  get exposure() {
    return this._exposure;
  }

  set exposure(v) {
    this._exposure = v;
    this.renderer.toneMappingExposure = v;
  }

  /** 'aces' | 'agx' | 'neutral' */
  setToneMapping(name) {
    const mode = TONEMAP_MODES[name];
    if (mode == null) return;
    this.toneMappingName = name;
    if (this.effects.toneMapping) this.effects.toneMapping.mode = mode;
  }

  /**
   * One pass over the equirect HDR: sun direction (centroid of the brightest pixels), sky statistics,
   * horizon colour, plus two clamped copies (IBL without the sun, visible sky with a limited sun disk).
   */
  analyzeHDR(tex, envClamp, skyClamp) {
    const { data, width, height } = tex.image;
    const channels = data.length / (width * height);
    const isHalf = data instanceof Uint16Array;
    const toF = isHalf ? THREE.DataUtils.fromHalfFloat : (v) => v;
    const toH = THREE.DataUtils.toHalfFloat;
    const env = new Float32Array(width * height * 4);
    const sky = new Uint16Array(width * height * 4);
    const one = toH(1);

    let sunX = 0;
    let sunY = 0;
    let sunW = 0;
    let maxLum = 0;
    const horizon = [0, 0, 0];
    let horizonN = 0;
    let skySum = 0;
    let skyN = 0;
    const hBand = Math.max(1, Math.round(height * (2.5 / 180))); // ±2.5° around the horizon

    // Pass 1: statistics, sun centroid and the IBL copy (sun removed).
    for (let y = 0; y < height; y++) {
      const row = y * width;
      const rowFromTop = tex.flipY ? y : height - 1 - y; // 0 = zenith
      const isSky = rowFromTop < height / 2;
      const nearHorizon = Math.abs(rowFromTop - height / 2) <= hBand;
      for (let x = 0; x < width; x++) {
        const i = row + x;
        const j = i * channels;
        const r = toF(data[j]);
        const g = toF(data[j + 1]);
        const b = toF(data[j + 2]);
        const lum = r * 0.2126 + g * 0.7152 + b * 0.0722;
        if (lum > maxLum) maxLum = lum;
        if (lum > 1000) {
          sunX += x * lum;
          sunY += y * lum;
          sunW += lum;
        }
        if (isSky && lum < envClamp) {
          skySum += lum;
          skyN++;
        }
        if (nearHorizon && lum < envClamp) {
          horizon[0] += r;
          horizon[1] += g;
          horizon[2] += b;
          horizonN++;
        }
        const o = i * 4;
        env[o] = Math.min(r, envClamp);
        env[o + 1] = Math.min(g, envClamp);
        env[o + 2] = Math.min(b, envClamp);
        env[o + 3] = 1;
      }
    }

    const hz = horizonN ? [horizon[0] / horizonN, horizon[1] / horizonN, horizon[2] / horizonN] : [0.43, 0.46, 0.55];

    // Pass 2: the visible sky — sun disk limited to `skyClamp`, then the art-direction pass (desaturate, haze
    // toward the horizon colour). Rows below the horizon get full haze so the seam stays continuous.
    const sat = TUNE.skySaturation;
    const hazeR = hz[0] * 1.1;
    const hazeG = hz[1] * 1.1;
    const hazeB = hz[2] * 1.1;
    for (let y = 0; y < height; y++) {
      const row = y * width;
      const rowFromTop = tex.flipY ? y : height - 1 - y;
      const elev = Math.max(0, (0.5 - (rowFromTop + 0.5) / height) * Math.PI); // 0 at/below the horizon
      const h = TUNE.skyHaze * Math.pow(1 - Math.sin(elev), TUNE.skyHazePower);
      for (let x = 0; x < width; x++) {
        const i = row + x;
        const j = i * channels;
        let r = Math.min(toF(data[j]), skyClamp);
        let g = Math.min(toF(data[j + 1]), skyClamp);
        let b = Math.min(toF(data[j + 2]), skyClamp);
        const lum = r * 0.2126 + g * 0.7152 + b * 0.0722;
        r = lum + (r - lum) * sat;
        g = lum + (g - lum) * sat;
        b = lum + (b - lum) * sat;
        const o = i * 4;
        sky[o] = toH(r + (hazeR - r) * h);
        sky[o + 1] = toH(g + (hazeG - g) * h);
        sky[o + 2] = toH(b + (hazeB - b) * h);
        sky[o + 3] = one;
      }
    }

    let sunDirection;
    if (sunW > 0) {
      // three's equirectUv: u = atan(z, x) / 2π + 0.5, v = asin(y) / π + 0.5 with v = 1 at the top row (flipY).
      const u = (sunX / sunW + 0.5) / width;
      let v = (sunY / sunW + 0.5) / height;
      if (tex.flipY) v = 1 - v;
      const phi = (u - 0.5) * Math.PI * 2;
      const elev = (v - 0.5) * Math.PI;
      sunDirection = new THREE.Vector3(Math.cos(elev) * Math.cos(phi), Math.sin(elev), Math.cos(elev) * Math.sin(phi));
      if (sunDirection.y < 0.05) sunDirection.y = Math.abs(sunDirection.y) + 0.05;
      sunDirection.normalize();
    } else {
      sunDirection = this.findSunDirection(tex);
    }

    const makeTex = (arr, type) => {
      const t = new THREE.DataTexture(arr, width, height, THREE.RGBAFormat, type);
      t.mapping = THREE.EquirectangularReflectionMapping;
      t.colorSpace = THREE.LinearSRGBColorSpace;
      t.flipY = tex.flipY;
      t.minFilter = THREE.LinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.generateMipmaps = false;
      t.needsUpdate = true;
      return t;
    };
    const stats = {
      skyMean: skyN ? skySum / skyN : 0.45,
      horizon: new THREE.Color(hz[0], hz[1], hz[2]),
      maxLum,
    };
    return { envTexture: makeTex(env, THREE.FloatType), skyTexture: makeTex(sky, THREE.HalfFloatType), sunDirection, stats };
  }

  /** Copy of an equirect HDR with radiance clamped to `maxValue` per channel (removes the sun disk). */
  clampHDR(tex, maxValue) {
    const { data, width, height } = tex.image;
    const channels = data.length / (width * height);
    const isHalf = data instanceof Uint16Array;
    const out = new Float32Array(width * height * 4);
    for (let i = 0, j = 0; i < width * height; i++, j += channels) {
      for (let c = 0; c < 3; c++) {
        const v = isHalf ? THREE.DataUtils.fromHalfFloat(data[j + c]) : data[j + c];
        out[i * 4 + c] = Math.min(v, maxValue);
      }
      out[i * 4 + 3] = 1;
    }
    const clamped = new THREE.DataTexture(out, width, height, THREE.RGBAFormat, THREE.FloatType);
    clamped.mapping = THREE.EquirectangularReflectionMapping;
    clamped.colorSpace = THREE.LinearSRGBColorSpace;
    clamped.flipY = tex.flipY;
    clamped.needsUpdate = true;
    return clamped;
  }

  /** Find the brightest region of an equirect HDR to derive the sun direction (world space, pointing at the sun). */
  findSunDirection(tex) {
    const { data, width, height } = tex.image;
    if (!data) return new THREE.Vector3(0.4, 0.8, 0.3).normalize();
    const channels = data.length / (width * height);
    const isHalf = data instanceof Uint16Array;
    const toFloat = isHalf ? THREE.DataUtils.fromHalfFloat : (v) => v;
    let best = -1;
    let bx = 0;
    let by = 0;
    const step = Math.max(1, Math.floor(width / 512));
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const i = (y * width + x) * channels;
        const lum = toFloat(data[i]) * 0.2126 + toFloat(data[i + 1]) * 0.7152 + toFloat(data[i + 2]) * 0.0722;
        if (lum > best) {
          best = lum;
          bx = x;
          by = y;
        }
      }
    }
    const u = (bx + 0.5) / width;
    let v = (by + 0.5) / height;
    if (tex.flipY) v = 1 - v;
    const phi = (u - 0.5) * Math.PI * 2;
    const elev = (v - 0.5) * Math.PI;
    const dir = new THREE.Vector3(Math.cos(elev) * Math.cos(phi), Math.sin(elev), Math.cos(elev) * Math.sin(phi));
    if (dir.y < 0.05) dir.y = Math.abs(dir.y) + 0.05;
    return dir.normalize();
  }

  /* ============================================================================================
   * Post-processing stack
   * ========================================================================================== */

  /** Per-quality feature switches (Settings only knows ao/bloom/smaa; the rest is derived here). */
  _features() {
    const { settings } = this.game;
    const q = settings.quality;
    const p = settings.params;
    const tier = Math.max(0, QUALITY_ORDER.indexOf(settings.qualityName));
    const flag = (name, def) => (p.has(name) ? p.get(name) !== '0' : def);
    return {
      ao: !!q.ao,
      bloom: flag('bloom', !!q.bloom),
      smaa: flag('smaa', !!q.smaa),
      godRays: flag('godrays', tier >= 2),
      dof: flag('dof', tier >= 2),
      grain: flag('grain', true),
      chroma: flag('chroma', true),
      vignette: flag('vignette', true),
    };
  }

  buildComposer() {
    const q = this.game.settings.quality;
    const f = this._features();
    this.features = f;
    if (this.composer) this.composer.dispose();
    this.effects = {};
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());

    const composer = new EffectComposer(this.renderer, {
      frameBufferType: THREE.HalfFloatType,
      multisampling: 0,
      depthBuffer: true,
      stencilBuffer: false,
    });
    this.composer = composer;

    // 1. World (layer 0) — fills colour + the shared depth texture.
    const worldPass = new RenderPass(this.scene, this.camera);
    worldPass.clearPass.setClearFlags(true, true, false);
    composer.addPass(worldPass);
    this.worldPass = worldPass;

    // Buffer bookkeeping: the composer's depth texture is attached to the buffer the world pass renders into.
    // The view-model pass clears depth, so it must run after an odd number of swaps (into the *other* buffer)
    // whenever a later effect still needs world depth (god rays).
    // 2. Ambient occlusion on world depth only (view model is drawn afterwards, so it is never darkened).
    this.aoPass = null;
    if (f.ao) {
      const ao = new N8AOPostPass(this.scene, this.camera, size.x, size.y);
      ao.autoDetectTransparency = false; // never fall into the (expensive) transparency-aware mode by accident
      ao.configuration.aoRadius = TUNE.aoRadius;
      ao.configuration.distanceFalloff = TUNE.aoDistanceFalloff;
      ao.configuration.intensity = TUNE.aoIntensity;
      ao.configuration.aoSamples = q.aoSamples;
      ao.configuration.denoiseSamples = q.aoSamples >= 16 ? 8 : 4;
      ao.configuration.denoiseRadius = TUNE.aoDenoiseRadius;
      ao.configuration.color = new THREE.Color(TUNE.aoColor);
      ao.configuration.gammaCorrection = false; // we stay linear HDR until the tone mapping effect
      ao.configuration.halfRes = q.aoSamples <= 8;
      ao.configuration.screenSpaceRadius = false;
      composer.addPass(ao);
      this.aoPass = ao;
    } else if (f.godRays) {
      composer.addPass(new CopyPass());
    }

    // 3. Depth of field while aiming: near field only (focus stays on the far scene, cover close to the camera
    //    goes soft). Runs *before* the view model so the weapon is never blurred and never bleeds into the
    //    bokeh. Paired with a copy so the buffer parity is unchanged whether or not it is enabled; both are
    //    toggled together in render() and cost nothing while hip-firing.
    this.dofPass = null;
    this.dofCopyPass = null;
    if (f.dof) {
      const dof = new DepthOfFieldEffect(this.camera, {
        focusDistance: TUNE.dof.focusDistance, // world units (radial distance) in postprocessing ≥ 6.30
        focusRange: TUNE.dof.focusRange,
        bokehScale: TUNE.dof.bokehScale,
        resolutionScale: TUNE.dof.resolutionScale,
      });
      // Disable the far field: the CoC shader writes (near, far) — zero the far channel.
      const coc = dof.cocMaterial;
      if (coc.fragmentShader.includes('step(0.0,signedDistance)')) {
        coc.fragmentShader = coc.fragmentShader.replace('step(0.0,signedDistance)', '0.0');
        coc.needsUpdate = true;
      }
      dof.blendMode.opacity.value = 0;
      this.effects.dof = dof;
      const dofPass = new EffectPass(this.camera, dof);
      dofPass.enabled = false;
      composer.addPass(dofPass);
      this.dofPass = dofPass;
      const dofCopy = new CopyPass();
      dofCopy.enabled = false;
      composer.addPass(dofCopy);
      this.dofCopyPass = dofCopy;
    }

    // 4. First-person view model: same scene, different camera/FOV, drawn on top with a fresh depth buffer.
    const weaponPass = new RenderPass(this.scene, this.weaponCamera);
    weaponPass.clearPass.setClearFlags(false, true, false);
    weaponPass.ignoreBackground = true;
    weaponPass.skipShadowMapUpdate = true;
    composer.addPass(weaponPass);
    this.weaponPass = weaponPass;

    // 5. HDR effects → tone mapping → grade (single pass; depth effects run first automatically).
    const hdrEffects = [];
    if (f.godRays) {
      if (!this.sunDisk) {
        const geo = new THREE.CircleGeometry(1, 48);
        const mat = new THREE.MeshBasicMaterial({ color: TUNE.sunDiskColor, transparent: true, depthWrite: false, fog: false });
        this.sunDisk = new THREE.Mesh(geo, mat);
        this.sunDisk.name = 'SunDisk';
        this.sunDisk.frustumCulled = false;
        this.sunDisk.layers.set(LAYER.WORLD);
      }
      const gr = TUNE.godRays;
      const godRays = new GodRaysEffect(this.camera, this.sunDisk, {
        blendFunction: BlendFunction.ADD,
        samples: gr.samples,
        density: gr.density,
        decay: gr.decay,
        weight: gr.weight,
        exposure: gr.exposure,
        clampMax: gr.clampMax,
        resolutionScale: gr.resolutionScale,
        kernelSize: KernelSize.SMALL,
        blur: true,
      });
      this.effects.godRays = godRays;
      hdrEffects.push(godRays);
    }
    if (f.bloom) {
      this.effects.bloom = new BloomEffect({
        blendFunction: BlendFunction.ADD,
        mipmapBlur: true,
        intensity: TUNE.bloomIntensity,
        luminanceThreshold: TUNE.bloomThreshold,
        luminanceSmoothing: TUNE.bloomSmoothing,
        radius: TUNE.bloomRadius,
        levels: TUNE.bloomLevels,
      });
      hdrEffects.push(this.effects.bloom);
    }
    this.effects.toneMapping = new ToneMappingEffect({ mode: TONEMAP_MODES[this.toneMappingName] ?? ToneMappingMode.ACES_FILMIC });
    hdrEffects.push(this.effects.toneMapping);
    this.effects.grade = new ColorGradeEffect(TUNE.grade);
    hdrEffects.push(this.effects.grade);
    const mainPass = new EffectPass(this.camera, ...hdrEffects);
    composer.addPass(mainPass);
    this.mainEffectPass = mainPass;

    // 6. Anti-aliasing on the graded LDR image, before grain/chroma so edge detection stays clean.
    if (f.smaa) {
      this.effects.smaa = new SMAAEffect({ preset: SMAAPreset.ULTRA, edgeDetectionMode: EdgeDetectionMode.COLOR });
      composer.addPass(new EffectPass(this.camera, this.effects.smaa));
    }

    // 7. Lens: chroma, vignette, grain + camera FX.
    this.effects.lens = new LensEffect({
      chroma: f.chroma ? TUNE.lens.chroma : 0,
      vignetteStart: TUNE.lens.vignetteStart,
      vignetteDarkness: f.vignette ? TUNE.lens.vignetteDarkness : 0,
      grain: f.grain ? TUNE.lens.grain : 0,
      sharpen: TUNE.lens.sharpen,
    });
    composer.addPass(new EffectPass(this.camera, this.effects.lens));
  }

  /* ============================================================================================
   * Materials / objects
   * ========================================================================================== */

  /** Register a material for cascaded shadows (idempotent). */
  registerMaterial(mat) {
    if (!mat || !this.csm) return;
    if (this._csmMaterials.has(mat)) return;
    if (!(mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial || mat.isMeshLambertMaterial || mat.isMeshPhongMaterial)) return;
    // CSM.setupMaterial replaces onBeforeCompile; chain any existing shader hook so custom materials keep working.
    // Remember the originals so a CSM rebuild (quality change) can restore and re-chain them.
    let orig = this._materialHooks.get(mat);
    if (!orig) {
      orig = { hook: mat.onBeforeCompile, key: mat.customProgramCacheKey };
      this._materialHooks.set(mat, orig);
    }
    const prevHook = orig.hook;
    const prevKey = orig.key;
    const hasPrev = prevHook && prevHook !== THREE.Material.prototype.onBeforeCompile;
    this.csm.setupMaterial(mat);
    if (hasPrev) {
      const csmHook = mat.onBeforeCompile;
      mat.onBeforeCompile = (shader, renderer) => {
        csmHook.call(mat, shader, renderer);
        prevHook.call(mat, shader, renderer);
      };
      const hasKey = prevKey && prevKey !== THREE.Material.prototype.customProgramCacheKey;
      const prevKeyStr = hasKey ? null : prevHook.toString();
      mat.customProgramCacheKey = () => `csm${this.csm ? this.csm.cascades : 0}|${prevKeyStr ?? prevKey.call(mat)}`;
    } else {
      mat.customProgramCacheKey = () => `csm${this.csm ? this.csm.cascades : 0}`;
    }
    mat.needsUpdate = true;
    this._csmMaterials.add(mat);
  }

  /** Traverse an object and register all its materials. Call for anything spawned after load. */
  setupObject(obj) {
    obj.traverse((o) => {
      if (!o.isMesh && !o.isSkinnedMesh && !o.isInstancedMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) this.registerMaterial(m);
    });
  }

  onSceneReady() {
    this.setupObject(this.scene);
  }

  /** Mark an object (and children) as part of the first-person view model (idempotent; call again after adding parts). */
  setViewModel(obj) {
    obj.traverse((o) => {
      o.layers.set(LAYER.VIEWMODEL);
      o.frustumCulled = false;
      if (o.isMesh && !o.isInstancedMesh && !this._shadowProxies.has(o)) this._addShadowProxy(o);
    });
  }

  _addShadowProxy(src) {
    const mat = this._shadowOnlyMaterial;
    let proxy;
    if (src.isSkinnedMesh) {
      proxy = new THREE.SkinnedMesh(src.geometry, mat);
      proxy.bindMode = src.bindMode;
      proxy.bindMatrix.copy(src.bindMatrix);
      proxy.bindMatrixInverse.copy(src.bindMatrixInverse);
      proxy.skeleton = src.skeleton;
    } else {
      proxy = new THREE.Mesh(src.geometry, mat);
    }
    proxy.name = 'ViewModelShadow';
    proxy.layers.set(LAYER.SHADOW_ONLY);
    proxy.castShadow = true; // gated per frame by the source's castShadow in _syncShadowProxies
    proxy.receiveShadow = false;
    proxy.frustumCulled = false;
    proxy.matrixAutoUpdate = false;
    proxy.matrixWorldAutoUpdate = false; // matrixWorld is copied from the source every frame
    proxy.raycast = noRaycast;
    if (src.customDepthMaterial) proxy.customDepthMaterial = src.customDepthMaterial;
    proxy.userData.src = src;
    this._shadowProxies.set(src, proxy);
    this._shadowProxyList.push(proxy);
    this.shadowProxyGroup.add(proxy);
  }

  /**
   * Mirror view-model transforms/visibility onto the shadow proxies. A proxy casts only while its source is
   * visible, attached to the scene and has `castShadow` set (so flash quads / glass parented to the gun stay
   * shadowless); detached sources keep their (hidden) proxy so re-attaching brings the shadow back.
   */
  _syncShadowProxies() {
    const list = this._shadowProxyList;
    if (list.length === 0) return;
    const show = this.viewmodelVisible && this.renderer.shadowMap.enabled;
    const scene = this.scene;
    for (let i = 0; i < list.length; i++) {
      const proxy = list[i];
      const src = proxy.userData.src;
      let visible = show && src.castShadow;
      let p = src;
      while (p !== null && p !== scene) {
        if (!p.visible) {
          visible = false;
          break;
        }
        p = p.parent;
      }
      if (p !== scene) visible = false;
      proxy.visible = visible;
      if (visible) {
        src.updateWorldMatrix(true, false);
        proxy.matrixWorld.copy(src.matrixWorld);
      }
    }
  }

  /* ============================================================================================
   * Camera FX API
   * ========================================================================================== */

  /** Screen shake: intensity in ~radians/meters (0.02 subtle, 0.15 heavy), duration seconds. */
  shake(intensity = 0.05, duration = 0.4) {
    this.shakeAmount = Math.max(this.shakeAmount, intensity);
    this.shakeDecay = 1 / Math.max(0.05, duration);
  }

  /** Aim-down-sights blend target in [0,1]. Weapons drive this. */
  setAds(target, zoom = 1.35) {
    this.adsTarget = target;
    this.fovZoom = zoom;
  }

  /** Red edge flash (0..1), decays over ~0.4 s. */
  damageFlash(intensity = 0.6) {
    this.fx.damage = Math.min(1, Math.max(this.fx.damage, intensity));
  }

  /** Persistent low-health look: 0 = healthy, 1 = about to die (red/grey edge vignette + desaturation). */
  setLowHealth(fraction) {
    this.fx.lowHealth = THREE.MathUtils.clamp(fraction, 0, 1);
  }

  /** Greyscale + blur + darkening ramp (true → fade in over ~1.4 s, false → fade out). */
  deathFade(on) {
    this.fx.deathTarget = on ? 1 : 0;
  }

  /** Brief barrel-distortion / chroma spike (explosions, flashbangs). */
  distortionPulse(strength = 0.6) {
    this.fx.pulse = Math.min(1, Math.max(this.fx.pulse, strength));
  }

  /* ============================================================================================
   * Quality
   * ========================================================================================== */

  /** Switch quality preset at runtime: rebuilds CSM, composer, pixel ratio. Emits 'render:quality'. */
  setQuality(name) {
    const { settings } = this.game;
    if (!QUALITY_ORDER.includes(name)) return;
    settings.setQuality(name);
    const q = settings.quality;
    this.renderer.setPixelRatio(q.pixelRatio);
    this.renderer.shadowMap.enabled = q.shadows;
    this._buildSun();
    this.setupObject(this.scene); // re-register every material with the new CSM (cascade count define changed)
    this.buildComposer();
    this.resize();
    this.game.events.emit('render:quality', { name, quality: q });
  }

  _updateAdaptiveQuality(dt) {
    const { settings, stats, state } = this.game;
    if (!this.adaptiveQuality || settings.shotMode || state !== 'playing') return;
    if (this._adaptiveCooldown > 0) {
      this._adaptiveCooldown -= dt;
      return;
    }
    const fps = Math.min(stats.fps || 60, this.measuredFps);
    if (fps < TUNE.adaptiveFps) this._lowFpsTime += dt;
    else this._lowFpsTime = 0;
    if (this._lowFpsTime >= TUNE.adaptiveHoldSeconds) {
      const idx = QUALITY_ORDER.indexOf(settings.qualityName);
      this._lowFpsTime = 0;
      this._adaptiveCooldown = TUNE.adaptiveCooldownSeconds;
      if (idx > 0) {
        console.info(`[render] adaptive quality: ${settings.qualityName} → ${QUALITY_ORDER[idx - 1]} (${fps.toFixed(0)} fps)`);
        this.setQuality(QUALITY_ORDER[idx - 1]);
      }
    }
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.weaponCamera.aspect = w / h;
    this.weaponCamera.updateProjectionMatrix();
    this.composer?.setSize(w, h); // propagates the drawing-buffer size to every pass (N8AO, DoF, SMAA, god rays…)
    this._updateCsmFrustums(true);
  }

  /* ============================================================================================
   * Frame
   * ========================================================================================== */

  /** Per-frame camera/FX dynamics and the draw. `draw=false` advances the dynamics only (offline recording). */
  render(dt, draw = true) {
    const cam = this.camera;
    const fx = this.fx;

    // Real frame interval (GPU-bound frames show up here, not in the CPU-side stats.frameMs).
    const now = performance.now();
    if (this._lastFrameStamp > 0) {
      const interval = Math.min(0.5, (now - this._lastFrameStamp) / 1000);
      if (interval > 0) this.measuredFps += (1 / interval - this.measuredFps) * 0.05;
    }
    this._lastFrameStamp = now;

    // ADS FOV blend
    this._adsBlend += (this.adsTarget - this._adsBlend) * Math.min(1, dt * 12);
    const zoom = THREE.MathUtils.lerp(1, this.fovZoom, this._adsBlend);
    const fov = this.baseFov / zoom;
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }

    // Camera shake (applied as local offset on the camera, which is a child of the player's head)
    const attachedToPlayer = cam.parent === this.game.player?.head;
    if (attachedToPlayer && this.shakeAmount > 0.0005) {
      this._shakeTime += dt * 40;
      const a = this.shakeAmount;
      this._shakeOffset.set(Math.sin(this._shakeTime * 1.1) * a * 0.35, Math.cos(this._shakeTime * 1.7) * a * 0.3, 0);
      this._shakeRot.set(Math.sin(this._shakeTime * 1.3) * a * 0.6, Math.cos(this._shakeTime * 0.9) * a * 0.4, Math.sin(this._shakeTime * 2.1) * a * 0.5);
      this.shakeAmount = Math.max(0, this.shakeAmount - dt * this.shakeDecay * this.shakeAmount - dt * 0.002);
    } else {
      this._shakeOffset.set(0, 0, 0);
      this._shakeRot.set(0, 0, 0);
      this.shakeAmount = 0;
    }
    if (attachedToPlayer) {
      cam.position.copy(this._shakeOffset);
      cam.rotation.copy(this._shakeRot);
    }

    cam.updateMatrixWorld(true);
    // Weapon camera mirrors the main camera's world transform with its own FOV.
    this.weaponCamera.matrixWorld.copy(cam.matrixWorld);
    this.weaponCamera.matrixWorldInverse.copy(this.weaponCamera.matrixWorld).invert();
    this.weaponCamera.matrixAutoUpdate = false;
    this.weaponCamera.matrixWorldAutoUpdate = false;
    cam.matrixWorld.decompose(this.weaponCamera.position, this.weaponCamera.quaternion, this.weaponCamera.scale);
    const wfov = this.baseWeaponFov / THREE.MathUtils.lerp(1, 1.0 + (this.fovZoom - 1) * 0.35, this._adsBlend);
    if (Math.abs(this.weaponCamera.fov - wfov) > 0.01) {
      this.weaponCamera.fov = wfov;
      this.weaponCamera.updateProjectionMatrix();
    }

    // Sun-glare light source rides along with the camera, far out along the sun direction.
    if (this.sunDisk) {
      const d = this.sunDisk;
      cam.getWorldPosition(this._tmpV);
      d.position.copy(this._tmpV).addScaledVector(this.sunDirection, TUNE.sunDiskDistance);
      const r = Math.tan(THREE.MathUtils.degToRad(TUNE.sunDiskAngle)) * TUNE.sunDiskDistance;
      d.scale.setScalar(r);
      d.lookAt(this._tmpV);
      d.updateMatrix(); // not part of the scene graph (GodRaysEffect renders it alone), so nothing else refreshes it
    }

    // Camera FX dynamics
    if (dt > 0) {
      fx.damage = Math.max(0, fx.damage - dt * TUNE.damageDecay * (0.4 + fx.damage));
      fx.pulse = Math.max(0, fx.pulse - dt * TUNE.pulseDecay);
      const step = dt / TUNE.deathRampTime;
      fx.death = fx.deathTarget > fx.death ? Math.min(fx.deathTarget, fx.death + step) : Math.max(fx.deathTarget, fx.death - step * 2);
    }
    const lens = this.effects.lens;
    if (lens) {
      const u = lens.uniforms;
      u.get('damage').value = fx.damage;
      u.get('lowHealth').value = fx.lowHealth;
      u.get('death').value = fx.death;
      u.get('pulse').value = fx.pulse;
    }
    if (this.dofPass) {
      const on = this._adsBlend > 0.02;
      this.dofPass.enabled = on;
      this.dofCopyPass.enabled = on;
      if (on) this.effects.dof.blendMode.opacity.value = THREE.MathUtils.smoothstep(this._adsBlend, 0.05, 0.95);
    }

    if (!draw) return;
    if (this.csm) {
      this._updateCsmFrustums(false);
      this.csm.update();
    }
    this.weaponPass.enabled = this.viewmodelVisible;
    this._syncShadowProxies();
    this.renderer.info.reset();
    this.composer.render(dt);

    this._updateAdaptiveQuality(dt);
  }

  /* ============================================================================================
   * Debug views
   * ========================================================================================== */

  _registerDebugViews() {
    const debug = this.game.debug;
    if (!debug?.registerView) return;
    const s = this.sunDirection;
    const sunYaw = THREE.MathUtils.radToDeg(Math.atan2(-s.x, -s.z)); // player yaw convention: 0 = -Z
    const sunPitch = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(s.y, -1, 1)));
    // Sunlit north-row facades, the shadowed west row and fountain, ground shadows and sky in one frame.
    debug.registerView('lighting_test', { pos: [-6, 0, 8], yaw: 12, pitch: 4, hud: false });
    // Looking into the sun with the SW plaza tree's crown (≈ (-20.5, 5.6, 12)) partially in front of it:
    // god rays through foliage, sun bloom/glare, occlusion. Camera placed so the sun ray grazes the crown edge.
    const eye = 1.62;
    const crown = this._tmpV.set(-19.0, 6.8, 12.5);
    const t = (crown.y - eye) / Math.max(0.2, s.y);
    const sx = crown.x - s.x * t;
    const sz = crown.z - s.z * t;
    debug.registerView('sun_glare', { pos: [sx, 0, sz], yaw: sunYaw, pitch: Math.max(5, sunPitch - 12), hud: false });
    // ADS along the garden fence: posts recede from 1 m to 40 m (near-field DoF), plaza behind.
    debug.registerView('ads_dof', { pos: [16.2, 0, 12], yaw: -7, pitch: 0, ads: true, hud: false });
    // Shadow contact / cascade 0 sharpness: view model shadow and a prop base up close, sun behind the camera.
    debug.registerView('shadow_contact', { pos: [-4.2, 0, -1.2], yaw: sunYaw + 180, pitch: -18, hud: false });
  }

  dispose() {
    window.removeEventListener('resize', this._onResize);
    this.composer?.dispose();
    this.csm?.remove();
    this.csm?.dispose();
    this.renderer.dispose();
  }
}
