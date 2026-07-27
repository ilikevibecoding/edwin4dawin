import * as THREE from 'three';
import type { EngineContext, Subsystem } from '../core/Engine';
import { Sky, SKY_PRESETS, type SkyPreset } from './Sky';

/**
 * Sun, sky, image-based ambient, and the shadow rig.
 *
 * Rather than cascaded shadow maps (which require patching every material in
 * the scene — awkward when materials are created all over the codebase), this
 * fits a single high-resolution orthographic shadow camera to the bounding
 * sphere of the camera frustum slice we actually care about, and snaps it to
 * the shadow texel grid.
 *
 * The bounding-sphere fit makes the shadow extent rotation-invariant, and the
 * texel snap means the shadow map doesn't crawl as the player turns — the two
 * artefacts that make naive dynamic shadows look cheap.
 */
export class LightingSystem implements Subsystem {
  readonly name = 'lighting';
  readonly order = 20;

  sky!: Sky;
  sun!: THREE.DirectionalLight;
  fill!: THREE.HemisphereLight;
  bounce!: THREE.DirectionalLight;
  environment: THREE.Texture | null = null;

  /** Distance from the camera covered by the high-res shadow map. */
  shadowDistance = 100;

  private ctx!: EngineContext;
  private sphereCenter = new THREE.Vector3();
  private lightSpace = new THREE.Matrix4();
  private lightSpaceInv = new THREE.Matrix4();
  private forward = new THREE.Vector3();
  private tmp = new THREE.Vector3();
  private shadowRadius = 1;
  private presetName = 'desert_noon';

  init(ctx: EngineContext) {
    this.ctx = ctx;
    const q = ctx.settings.quality;
    this.shadowDistance = q.shadowDistance;

    const preset = SKY_PRESETS[this.presetName];
    this.sky = new Sky(preset);
    ctx.scene.add(this.sky.mesh);

    this.sun = new THREE.DirectionalLight(preset.sunColor, preset.sunLightIntensity);
    this.sun.name = 'Sun';
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.setScalar(q.shadowMapSize);
    this.sun.shadow.camera.near = 0.5;
    this.sun.shadow.camera.far = 500;
    // Slope-scaled bias keeps peter-panning down on near geometry while still
    // killing acne on surfaces nearly parallel to the light.
    this.sun.shadow.bias = -0.00016;
    this.sun.shadow.normalBias = 0.035;
    this.sun.shadow.radius = q.softShadows ? 2.2 : 1;
    this.sun.shadow.blurSamples = q.softShadows ? 12 : 4;
    this.sun.target.position.set(0, 0, 0);
    ctx.scene.add(this.sun);
    ctx.scene.add(this.sun.target);

    // Sky/ground hemisphere on top of IBL: cheap, and gives the up-facing
    // surfaces a little extra sky colour that reads as GI.
    this.fill = new THREE.HemisphereLight(
      preset.ambientColor,
      preset.groundColor,
      preset.ambientIntensity
    );
    ctx.scene.add(this.fill);

    // A dim, non-shadowing light pointed back at the sun fakes one bounce off
    // the ground so shadowed faces aren't flat.
    this.bounce = new THREE.DirectionalLight(preset.groundColor, preset.sunLightIntensity * 0.3);
    this.bounce.castShadow = false;
    ctx.scene.add(this.bounce);

    this.applyPreset(preset);
    ctx.provide('sky', this.sky);
  }

  applyPreset(preset: SkyPreset) {
    this.presetName = preset.name;
    this.sky.applyPreset(preset);
    this.sun.color.copy(preset.sunColor);
    this.sun.intensity = preset.sunLightIntensity;
    this.fill.color.copy(preset.ambientColor);
    this.fill.groundColor.copy(preset.groundColor);
    this.fill.intensity = preset.ambientIntensity;
    this.bounce.color.copy(preset.groundColor).lerp(preset.sunColor, 0.25);
    this.bounce.intensity = preset.sunLightIntensity * 0.3;
    this.refreshEnvironment();
  }

  setPresetByName(name: string) {
    const p = SKY_PRESETS[name];
    if (p) this.applyPreset(p);
  }

  /** Re-bake the IBL from the current sky. Expensive — call on preset change only. */
  refreshEnvironment() {
    const { renderer, scene } = this.ctx;
    const prev = this.environment;
    // Hide the dome so it doesn't appear twice in the capture.
    const wasVisible = this.sky.mesh.visible;
    this.sky.mesh.visible = false;
    this.environment = this.sky.generateEnvironment(renderer, 256);
    this.sky.mesh.visible = wasVisible;
    scene.environment = this.environment;
    // Slightly under-driving the IBL keeps shadowed faces from washing out.
    // At 1.0 the sky fill competed with the sun and the whole frame read flat.
    scene.environmentIntensity = 0.95;
    prev?.dispose();
  }

  get sunDirection(): THREE.Vector3 {
    return this.sky.sunDirection;
  }

  update(dt: number, ctx: EngineContext) {
    this.sky.update(dt, ctx.camera);
    this.fitShadowCamera(ctx.camera);

    // Keep the bounce light opposite the sun, tilted upward.
    this.bounce.position
      .copy(this.sky.sunDirection)
      .multiplyScalar(-40)
      .add(ctx.camera.position);
    this.bounce.position.y = ctx.camera.position.y - 20;
    this.bounce.target.position.copy(ctx.camera.position);
    this.bounce.target.updateMatrixWorld();
  }

  /**
   * Fit the orthographic shadow frustum to a fixed-size region centred just
   * ahead of the player, then snap it to the shadow texel grid.
   *
   * Fitting to the full camera frustum sounds more correct but at a 80 degree
   * FOV it produces a bounding sphere hundreds of metres across, which at
   * 4096px is ~16cm per texel — far too coarse for crisp contact shadows. A
   * fixed region biased toward where the player is looking keeps texel density
   * around 3cm. Geometry beyond the region simply doesn't cast, which the
   * aerial fog hides.
   */
  private fitShadowCamera(camera: THREE.PerspectiveCamera) {
    camera.updateMatrixWorld();

    const radius = this.shadowDistance;
    this.shadowRadius = radius;

    // Bias the region forward so more of it lands in view than behind us.
    camera.getWorldDirection(this.forward);
    this.forward.y = 0;
    if (this.forward.lengthSq() < 1e-6) this.forward.set(0, 0, -1);
    this.forward.normalize();

    this.sphereCenter
      .copy(camera.position)
      .addScaledVector(this.forward, radius * 0.42);

    const dir = this.sky.sunDirection;
    const lightPos = this.tmp.copy(this.sphereCenter).addScaledVector(dir, radius + 60);

    // Build a light-space basis to snap the centre onto the texel grid.
    const up = Math.abs(dir.y) > 0.98 ? UP_ALT : UP;
    this.lightSpace.lookAt(lightPos, this.sphereCenter, up);
    this.lightSpace.setPosition(lightPos);
    this.lightSpace.invert();

    const texelsPerUnit = this.sun.shadow.mapSize.width / (radius * 2);
    const snapped = this.tmp.copy(this.sphereCenter).applyMatrix4(this.lightSpace);
    snapped.x = Math.floor(snapped.x * texelsPerUnit) / texelsPerUnit;
    snapped.y = Math.floor(snapped.y * texelsPerUnit) / texelsPerUnit;
    this.lightSpaceInv.copy(this.lightSpace).invert();
    snapped.applyMatrix4(this.lightSpaceInv);

    this.sun.position.copy(snapped).addScaledVector(dir, radius + 60);
    this.sun.target.position.copy(snapped);
    this.sun.target.updateMatrixWorld();

    const cam = this.sun.shadow.camera;
    cam.left = -radius;
    cam.right = radius;
    cam.top = radius;
    cam.bottom = -radius;
    cam.near = 0.5;
    cam.far = radius * 2 + 130;
    cam.updateProjectionMatrix();
  }

  applyQuality(ctx: EngineContext) {
    const q = ctx.settings.quality;
    this.shadowDistance = q.shadowDistance;
    if (this.sun.shadow.mapSize.width !== q.shadowMapSize) {
      this.sun.shadow.mapSize.setScalar(q.shadowMapSize);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
    this.sun.shadow.radius = q.softShadows ? 2.2 : 1;
    this.sun.shadow.blurSamples = q.softShadows ? 12 : 4;
  }

  dispose() {
    this.sky.dispose();
    this.environment?.dispose();
    this.sun.shadow.map?.dispose();
  }
}

const UP = new THREE.Vector3(0, 1, 0);
const UP_ALT = new THREE.Vector3(0, 0, 1);
