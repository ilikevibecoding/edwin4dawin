// Render pipeline for the "Minecraft with a shader pack" look: per-frame shading uniforms (sun/moon, sky, camera),
// cascaded sun shadows, HDR scene + hand into a half-float target, bloom / ACES / vignette / FXAA composite.
// The Light preset bypasses all of it and renders exactly like the pre-rubric game (direct to the canvas).
import * as THREE from 'three';
import { SHADING_UNIFORMS, setShadingDefines, SUN_STRENGTH } from './shading.js';
import { CascadedShadows } from './shadows.js';
import { PostFX } from './post.js';
import { setMaterialMaps, buildTestNormalAtlas, buildDerivedMaps } from './materialMaps.js';
import { atlasCanvas, TILES } from '../textures.js';
import { TILE_PX, ATLAS_TILES } from '../constants.js';
import { BLOCKS } from '../blocks.js';
import { QUALITY } from '../quality.js';

const SUN_TINT_NOON = new THREE.Color(1.0, 0.98, 0.94);
const SUN_TINT_LOW = new THREE.Color(1.0, 0.62, 0.32);
const MOON_TINT = new THREE.Color(0.55, 0.66, 1.0);

export class RenderPipeline {
  constructor(renderer, game) {
    this.renderer = renderer;
    this.game = game;
    this.enabled = true;          // false = legacy direct path (Light preset)
    this.materialMaps = true;
    this.shadows = new CascadedShadows(renderer, game.atlas);
    this.post = new PostFX(renderer);
    this.sunStrength = SUN_STRENGTH;   // directional share of the sky light (see shading.js)
    this.moonStrength = 0.10;
    this.dayExposure = 1.0;       // calibrated against the old daytime frame (see docs/rubrics/05_render_quality.md)
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
    setShadingDefines({ FANCY: this.enabled ? 1 : 0, MATERIAL_MAPS: this.enabled && this.materialMaps ? 1 : 0 });
  }

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
    const stormMul = ov ? ov.skyLightMul : 1;
    if (sunUp >= moonUp) {
      u.uSunDir.value.copy(sun).normalize();
      const low = 1 - THREE.MathUtils.smoothstep(e, 0.0, 0.35);
      this._tmpColor.copy(SUN_TINT_NOON).lerp(SUN_TINT_LOW, low);
      u.uSunColor.value.set(this._tmpColor.r, this._tmpColor.g, this._tmpColor.b).multiplyScalar(this.sunStrength * sunUp * stormMul);
      u.uSunUp.value = sunUp;
    } else {
      u.uSunDir.value.copy(sun).multiplyScalar(-1).normalize();
      u.uSunColor.value.set(MOON_TINT.r, MOON_TINT.g, MOON_TINT.b).multiplyScalar(this.moonStrength * moonUp * stormMul);
      u.uSunUp.value = moonUp;
    }
    u.uCamPos.value.copy(g.camera.position);
    // exposure keyed to the time of day (night raised so lit cities read as lit cities)
    this.post.exposure = THREE.MathUtils.lerp(this.nightExposure, this.dayExposure, sky.dayFactor);
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
