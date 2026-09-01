import * as THREE from 'three';
import { CSM } from 'three/addons/csm/CSM.js';
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
  SMAAEffect,
  SMAAPreset,
  EdgeDetectionMode,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
  ChromaticAberrationEffect,
  BlendFunction,
} from 'postprocessing';
import { N8AOPostPass } from 'n8ao';

/**
 * Owns the WebGLRenderer, scene, cameras, sun/sky lighting (CSM) and the post-processing pipeline.
 *
 * Layers:  0 = world, 1 = first-person view model (rendered by `weaponCamera` with its own FOV
 *          after the world so it never clips into geometry), 2 = HUD-space 3D (unused).
 *
 * Materials: every MeshStandard/Physical material that should receive cascaded shadows must be
 * registered via `render.setupObject(obj)` or `render.registerMaterial(mat)` (done automatically for
 * everything in the scene when `onSceneReady()` runs after load; call it yourself for runtime spawns).
 */
export const LAYER = { WORLD: 0, VIEWMODEL: 1, OVERLAY: 2 };

export class RenderSystem {
  constructor(game) {
    this.game = game;
    const q = game.settings.quality;

    this.renderer = new THREE.WebGLRenderer({
      canvas: game.canvas,
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
      alpha: false,
      logarithmicDepthBuffer: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.pixelRatio));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping; // tone mapping happens in the composer
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = q.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.autoClear = false;
    this.renderer.info.autoReset = false;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(game.settings.fov, window.innerWidth / window.innerHeight, 0.05, 800);
    this.camera.layers.set(LAYER.WORLD);
    this.baseFov = game.settings.fov;

    this.weaponCamera = new THREE.PerspectiveCamera(game.settings.weaponFov, this.camera.aspect, 0.01, 12);
    this.weaponCamera.layers.set(LAYER.VIEWMODEL);
    this.baseWeaponFov = game.settings.weaponFov;

    this.sunDirection = new THREE.Vector3(0.4, 0.8, 0.3).normalize(); // toward the sun; replaced by HDRI analysis
    this.sunColor = new THREE.Color(0xfff1d6);
    this.sunIntensity = 4.2;
    this.csm = null;
    this._csmMaterials = new WeakSet();

    this.exposure = 1.0;
    this.shakeAmount = 0;
    this.shakeDecay = 4;
    this._shakeTime = 0;
    this._shakeOffset = new THREE.Vector3();
    this._shakeRot = new THREE.Euler();

    this.fovZoom = 1; // multiplied into camera FOV (ADS); weapons set this via setAds()
    this._adsBlend = 0;
    this.adsTarget = 0;

    this.composer = null;
    this.effects = {};
    this.hudVisible = true;
    this.viewmodelVisible = true;

    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
  }

  async init() {
    const { assets, settings } = this.game;
    const q = settings.quality;

    // --- Sky & image-based lighting ---
    const hdr = await assets.loadHDR('kloofendal_48d_partly_cloudy_puresky');
    this.sky = hdr;
    this.sunDirection.copy(this.findSunDirection(hdr));
    if (settings.params.has('sunAz') || settings.params.has('sunEl')) {
      const az = THREE.MathUtils.degToRad(parseFloat(settings.params.get('sunAz') || '0'));
      const el = THREE.MathUtils.degToRad(parseFloat(settings.params.get('sunEl') || '45'));
      this.sunDirection.set(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));
    }

    // The sun is an analytic light (with shadows), so remove its energy from the IBL: clamp the HDR
    // before pre-filtering. The visible sky keeps the full-range original so the sun disk blooms.
    const skyOnly = this.clampHDR(hdr, 6.0);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();
    const envRT = pmrem.fromEquirectangular(skyOnly);
    pmrem.dispose();
    skyOnly.dispose();
    this.scene.environment = envRT.texture;
    this.scene.environmentIntensity = 0.55;
    this.scene.background = hdr;
    this.scene.backgroundIntensity = 1.0;
    this.scene.backgroundBlurriness = 0;

    // Gentle atmospheric haze; sub-systems may retune.
    this.scene.fog = new THREE.FogExp2(0xbfd4e6, 0.0032);

    // --- Sun: cascaded shadow maps ---
    if (q.shadows) {
      this.csm = new CSM({
        maxFar: 220,
        cascades: q.shadowCascades,
        mode: 'practical',
        parent: this.scene,
        shadowMapSize: q.shadowMapSize,
        lightDirection: this.sunDirection.clone().negate(),
        lightIntensity: this.sunIntensity,
        lightColor: this.sunColor,
        camera: this.camera,
        shadowBias: -0.00012,
        lightMargin: 120,
      });
      this.csm.fade = true;
      for (const light of this.csm.lights) {
        light.color.copy(this.sunColor);
        light.shadow.normalBias = 0.02;
        light.shadow.camera.layers.enable(LAYER.VIEWMODEL); // view model casts shadows too
        light.shadow.radius = 2;
      }
    } else {
      const sun = new THREE.DirectionalLight(this.sunColor, this.sunIntensity);
      sun.position.copy(this.sunDirection).multiplyScalar(100);
      this.scene.add(sun);
      this.sunLight = sun;
    }
    const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x7a6a55, 0.12);
    this.scene.add(hemi);
    this.hemiLight = hemi;
    this._baseSunDirection = this.sunDirection.clone();
    if (settings.params.has('skyYaw')) this.setSkyRotation(THREE.MathUtils.degToRad(parseFloat(settings.params.get('skyYaw'))));

    this.buildComposer();
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
    this.sunDirection.copy(base).applyAxisAngle(new THREE.Vector3(0, 1, 0), yawRad);
    if (this.csm) this.csm.lightDirection.copy(this.sunDirection).negate();
    if (this.sunLight) this.sunLight.position.copy(this.sunDirection).multiplyScalar(100);
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
    if (!tex.flipY) v = 1 - v;
    const phi = (u - 0.5) * Math.PI * 2;
    const elev = (v - 0.5) * Math.PI;
    const dir = new THREE.Vector3(Math.cos(elev) * Math.cos(phi), Math.sin(elev), Math.cos(elev) * Math.sin(phi));
    if (dir.y < 0.05) dir.y = Math.abs(dir.y) + 0.05;
    return dir.normalize();
  }

  buildComposer() {
    const q = this.game.settings.quality;
    if (this.composer) this.composer.dispose();
    const composer = new EffectComposer(this.renderer, {
      frameBufferType: THREE.HalfFloatType,
      multisampling: 0,
      depthBuffer: true,
      stencilBuffer: false,
    });
    this.composer = composer;

    const worldPass = new RenderPass(this.scene, this.camera);
    worldPass.clearPass.setClearFlags(true, true, false);
    composer.addPass(worldPass);
    this.worldPass = worldPass;

    if (q.ao) {
      const ao = new N8AOPostPass(this.scene, this.camera, window.innerWidth, window.innerHeight);
      ao.configuration.aoRadius = 1.6;
      ao.configuration.distanceFalloff = 1.0;
      ao.configuration.intensity = 2.2;
      ao.configuration.aoSamples = q.aoSamples;
      ao.configuration.denoiseSamples = 8;
      ao.configuration.denoiseRadius = 12;
      ao.configuration.color = new THREE.Color(0x0a0d14);
      ao.configuration.gammaCorrection = false;
      ao.configuration.halfRes = q.aoSamples <= 8;
      ao.configuration.screenSpaceRadius = false;
      composer.addPass(ao);
      this.aoPass = ao;
    }

    // First-person view model: same scene, different camera/FOV, drawn on top with a fresh depth buffer.
    const weaponPass = new RenderPass(this.scene, this.weaponCamera);
    weaponPass.clearPass.setClearFlags(false, true, false);
    weaponPass.ignoreBackground = true;
    weaponPass.skipShadowMapUpdate = true;
    composer.addPass(weaponPass);
    this.weaponPass = weaponPass;

    const effects = [];
    if (q.bloom) {
      this.effects.bloom = new BloomEffect({
        blendFunction: BlendFunction.ADD,
        mipmapBlur: true,
        intensity: 0.55,
        luminanceThreshold: 1.0,
        luminanceSmoothing: 0.35,
        radius: 0.7,
        levels: 7,
      });
      effects.push(this.effects.bloom);
    }
    this.effects.chroma = new ChromaticAberrationEffect({
      offset: new THREE.Vector2(0.00045, 0.00045),
      radialModulation: true,
      modulationOffset: 0.35,
    });
    effects.push(this.effects.chroma);
    this.effects.vignette = new VignetteEffect({ offset: 0.28, darkness: 0.5 });
    effects.push(this.effects.vignette);
    this.effects.toneMapping = new ToneMappingEffect({ mode: ToneMappingMode.AGX });
    effects.push(this.effects.toneMapping);

    const mainEffects = new EffectPass(this.camera, ...effects);
    composer.addPass(mainEffects);
    this.mainEffectPass = mainEffects;

    if (q.smaa) {
      this.effects.smaa = new SMAAEffect({ preset: SMAAPreset.ULTRA, edgeDetectionMode: EdgeDetectionMode.COLOR });
      const smaaPass = new EffectPass(this.camera, this.effects.smaa);
      composer.addPass(smaaPass);
    }
  }

  /** Register a material for cascaded shadows (idempotent). */
  registerMaterial(mat) {
    if (!mat || !this.csm) return;
    if (this._csmMaterials.has(mat)) return;
    if (!(mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial || mat.isMeshLambertMaterial || mat.isMeshPhongMaterial)) return;
    // CSM.setupMaterial replaces onBeforeCompile; chain any existing shader hook so custom materials keep working.
    const prevHook = mat.onBeforeCompile;
    const prevKey = mat.customProgramCacheKey;
    const hasPrev = prevHook && prevHook !== THREE.Material.prototype.onBeforeCompile;
    this.csm.setupMaterial(mat);
    if (hasPrev) {
      const csmHook = mat.onBeforeCompile;
      mat.onBeforeCompile = (shader, renderer) => {
        csmHook.call(mat, shader, renderer);
        prevHook.call(mat, shader, renderer);
      };
      const prevKeyStr = prevKey && prevKey !== THREE.Material.prototype.customProgramCacheKey ? null : prevHook.toString();
      mat.customProgramCacheKey = () => `csm|${prevKeyStr ?? prevKey.call(mat)}`;
    }
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

  /** Mark an object (and children) as part of the first-person view model. */
  setViewModel(obj) {
    obj.traverse((o) => {
      o.layers.set(LAYER.VIEWMODEL);
      o.frustumCulled = false;
    });
  }

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

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.weaponCamera.aspect = w / h;
    this.weaponCamera.updateProjectionMatrix();
    this.composer?.setSize(w, h);
    this.aoPass?.setSize?.(w, h);
  }

  render(dt) {
    const cam = this.camera;

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

    if (this.csm) this.csm.update();
    this.weaponPass.enabled = this.viewmodelVisible;
    this.renderer.info.reset();
    this.composer.render(dt);
  }

  dispose() {
    window.removeEventListener('resize', this._onResize);
    this.composer?.dispose();
    this.renderer.dispose();
  }
}
