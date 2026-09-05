// Render pipeline for the "Minecraft with a shader pack" look: per-frame shading uniforms (sun/moon, sky, camera),
// cascaded sun shadows, HDR scene + hand into a half-float target, bloom / ACES / vignette / FXAA composite.
// The Light preset bypasses all of it and renders exactly like the pre-rubric game (direct to the canvas).
import * as THREE from 'three';
import { SHADING_UNIFORMS, setShadingDefines, SUN_STRENGTH, AMBIENT_K, SUN_WRAP } from './shading.js';
import { CascadedShadows } from './shadows.js';
import { PostFX } from './post.js';
import { setMaterialMaps, buildTestNormalAtlas, buildDerivedMaps } from './materialMaps.js';
import { atlasCanvas, TILES } from '../textures.js';
import { TILE_PX, ATLAS_TILES } from '../constants.js';
import { BLOCKS } from '../blocks.js';
import { QUALITY, applyQuality } from '../quality.js';
import { ORBIT_TILT } from '../sky.js';

const SUN_TINT_NOON = new THREE.Color(1.0, 0.96, 0.87);
const SUN_TINT_LOW = new THREE.Color(1.0, 0.62, 0.32);
const MOON_TINT = new THREE.Color(0.55, 0.66, 1.0);
// Shade colour at full sun share: sky-lit shadows are slightly cool against the warm sun (sum stays neutral at noon).
const SHADE_TINT = new THREE.Vector3(0.93, 0.965, 1.05);
const WHITE = new THREE.Vector3(1, 1, 1);
// Wrapped N.L of a flat top face (see sunLight in shading.js): what a sunlit street receives at a light elevation e.
const topFaceNdl = (e) => (Math.max(e, 0) + SUN_WRAP) / (1 + SUN_WRAP);
// Sky-light budget: the ambient share is whatever the directional light does not deliver to a sunlit top face,
// normalised so noon lands exactly on the calibrated AMBIENT_K. A low sun (or the moon, or a storm-dimmed sun)
// therefore hands its share back to the ambient term and the frame's mean stays at the pre-rubric level instead of
// darkening twice (once through the sky's day curve, once through a missing direct term).
const AMBIENT_NORM = (1 - AMBIENT_K) / (SUN_STRENGTH * topFaceNdl(Math.cos(ORBIT_TILT)));

export class RenderPipeline {
  constructor(renderer, game) {
    this.renderer = renderer;
    this.game = game;
    this.enabled = true;          // false = legacy direct path (Light preset)
    this.materialMaps = true;
    this.shadows = new CascadedShadows(renderer, game.atlas);
    this.post = new PostFX(renderer);
    this.shading = SHADING_UNIFORMS;   // the live uniform objects (console tuning, measurement scripts)
    this.sunStrength = SUN_STRENGTH;   // directional share of the sky light (see shading.js)
    this.moonStrength = 0.10;
    this.dayExposure = 1.2;       // calibrated: noon town frame mean and sunlit ground within 2% of the pre-rubric look (rubric notes)
    this.nightExposure = 1.75;
    this.preset = null;
    this.stats = { shadowChunkDraws: 0, shadowObjectDraws: 0 };
    this._tmpColor = new THREE.Color();
    this._size = new THREE.Vector2();
    this.setSize(window.innerWidth, window.innerHeight);
    if (game.disasters && game.disasters.debris) this.shadows.addCaster(game.disasters.debris.mesh);
    this.applyPreset(QUALITY[game.quality] || QUALITY.cinematic);
    // dev-only material maps (`?normaltest=1` raised-square normals, `?matdebug=1` maps derived from the atlas)
    const qp = new URLSearchParams(location.search);
    if (qp.get('normaltest') === '1' && atlasCanvas) setMaterialMaps(buildTestNormalAtlas(atlasCanvas, TILE_PX, ATLAS_TILES), null);
    else if (qp.get('matdebug') === '1' && atlasCanvas) {
      const names = [];
      for (const [name, idx] of Object.entries(TILES)) if (typeof idx === 'number') names[idx] = name;
      const m = buildDerivedMaps(atlasCanvas, TILE_PX, ATLAS_TILES, names, BLOCKS);
      setMaterialMaps(m.normal, m.material);
    }
  }

  // Preset fields: shadows (0/1/2 cascades), shadowRes, bloom, fxaa, materialMaps, post (HDR pipeline on/off).
  applyPreset(q) {
    this.preset = q;
    this.enabled = q.post !== false;
    this.materialMaps = !!q.materialMaps;
    if (this.enabled) this.shadows.configure(q.shadows || 0, q.shadowRes || 1024); else this.shadows.configure(0, 1024);
    this.post.bloomEnabled = this.enabled && !!q.bloom;
    this.post.fxaaEnabled = this.enabled && !!q.fxaa;
    if (!this.enabled) SHADING_UNIFORMS.uSkyGain.value = 1;   // the direct path has no exposure to compensate
    setShadingDefines({ FANCY: this.enabled ? 1 : 0, MATERIAL_MAPS: this.enabled && this.materialMaps ? 1 : 0 });
  }

  // Switches the whole preset (budgets + render stack) like the admin panel does; the measurement scripts keep the
  // render distance so every preset is compared on the identical set of chunks.
  setQuality(name, opts = { persist: false, renderDistance: false }) { return applyQuality(this.game, name, opts); }

  setSize(w, h) {
    const pr = this.renderer.getPixelRatio();
    this.post.setSize(Math.round(w * pr), Math.round(h * pr));
  }

  // GPU memory the pipeline holds beyond the plain game (bytes).
  memoryBytes() { return this.shadows.memoryBytes() + (this.enabled ? this.post.memoryBytes() : 0); }

  // Sun/moon/sky uniforms from the Sky object (called every frame before rendering).
  updateLighting() {
    const g = this.game, sky = g.sky, u = SHADING_UNIFORMS;
    const sun = sky.sunDir;
    const e = sun.y;
    // the moon takes over when the sun sets; both fade through the horizon so the terminator is never a pop
    const sunUp = THREE.MathUtils.smoothstep(e, -0.04, 0.16);
    const moonUp = THREE.MathUtils.smoothstep(-e, 0.0, 0.22) * (1 - sunUp);
    const ov = g.disasters ? g.disasters.effects.override : null;
    // a storm deck (skyMix, tornado) occludes the sun: its share goes back to the ambient term (overcast look)
    const stormMul = ov ? ov.skyLightMul * (1 - Math.min(ov.skyMix || 0, 1)) : 1;
    let strength, elevation;
    if (sunUp >= moonUp) {
      u.uSunDir.value.copy(sun).normalize();
      const low = 1 - THREE.MathUtils.smoothstep(e, 0.0, 0.35);
      this._tmpColor.copy(SUN_TINT_NOON).lerp(SUN_TINT_LOW, low);
      strength = this.sunStrength * sunUp * stormMul; elevation = e;
      u.uSunColor.value.set(this._tmpColor.r, this._tmpColor.g, this._tmpColor.b).multiplyScalar(strength);
      u.uSunUp.value = sunUp;
    } else {
      u.uSunDir.value.copy(sun).multiplyScalar(-1).normalize();
      strength = this.moonStrength * moonUp * stormMul; elevation = -e;
      u.uSunColor.value.set(MOON_TINT.r, MOON_TINT.g, MOON_TINT.b).multiplyScalar(strength);
      u.uSunUp.value = moonUp;
    }
    const skyLight = Math.max(sky.skyLight * (ov ? ov.skyLightMul : 1), 0.05);   // the lightmap's sky light right now
    u.uAmbientK.value = THREE.MathUtils.clamp(1 - AMBIENT_NORM * strength * topFaceNdl(elevation) / skyLight, 0.45, 1);
    const share = THREE.MathUtils.clamp((1 - u.uAmbientK.value) / (1 - AMBIENT_K), 0, 1);   // 1 at full sun, 0 without
    u.uAmbientTint.value.copy(WHITE).lerp(SHADE_TINT, share);
    u.uCamPos.value.copy(g.camera.position);
    // exposure keyed to the time of day (night raised so lit cities read as lit cities); the sky dome, fog and sky
    // reflections are pre-divided by the same lift so the authored night/dusk sky colours come out as authored
    this.post.exposure = THREE.MathUtils.lerp(this.nightExposure, this.dayExposure, sky.dayFactor);
    u.uSkyGain.value = this.dayExposure / this.post.exposure;
  }

  // Full frame. handScene/handCamera are drawn on top of the world with a cleared depth buffer, like before.
  render(scene, camera, handScene, handCamera) {
    const r = this.renderer;
    if (!this.enabled) {
      r.setRenderTarget(null);
      r.clear();
      r.render(scene, camera);
      r.clearDepth();
      r.render(handScene, handCamera);
      return;
    }
    this.updateLighting();
    const autoMatrices = scene.matrixWorldAutoUpdate;
    if (this.shadows.count > 0) {
      this.shadows.render(scene, camera, SHADING_UNIFORMS.uSunDir.value, this.game.terrain.group);
      this.stats.shadowChunkDraws = this.shadows.stats.chunkDraws;
      this.stats.shadowObjectDraws = this.shadows.stats.objectDraws;
      scene.matrixWorldAutoUpdate = false;   // the shadow pass already updated every world matrix this frame
    } else { this.stats.shadowChunkDraws = 0; this.stats.shadowObjectDraws = 0; }
    this.post.begin();
    r.render(scene, camera);
    scene.matrixWorldAutoUpdate = autoMatrices;
    r.clearDepth();
    r.render(handScene, handCamera);
    this.post.end();
  }

  // Renders one frame with the current state and returns its pixels (RGBA8, bottom-up) - used by the measurement
  // scripts (bloom guard, exposure calibration). Must run synchronously after the render (no preserveDrawingBuffer).
  readback() {
    const g = this.game;
    this.render(g.scene, g.camera, g.hand.scene, g.hand.camera);
    const gl = this.renderer.getContext();
    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    const buf = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    return { width: w, height: h, data: buf };
  }
}
