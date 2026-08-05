import * as THREE from 'three';
import {
  BloomEffect,
  DepthOfFieldEffect,
  EffectComposer,
  EffectPass,
  FXAAEffect,
  RenderPass,
  SMAAEffect,
} from 'postprocessing';
import { BLOOM, DOF, GRADE, type GradeConfig } from './LookConfig';
import { ExposureEffect } from './effects/ExposureEffect';
import { FilmEffect } from './effects/FilmEffect';
import type { QualitySettings } from '../core/Quality';
import { clamp01, damp } from '../core/Time';

/**
 * The camera pipeline: exposure -> DoF -> bloom -> tone map -> film.
 *
 * Convolution effects (DoF, bloom, SMAA) must each own a pass; everything else
 * is merged into a single fullscreen pass to keep the cost down.
 */
export class PostFX {
  readonly composer: EffectComposer;
  private readonly exposureFx: ExposureEffect;
  private readonly filmFx: FilmEffect;
  private readonly bloomFx: BloomEffect | null = null;
  private readonly dofFx: DepthOfFieldEffect | null = null;
  private renderPass: RenderPass;

  private focusTarget = new THREE.Vector3();
  private focusDistance = 4;
  private focusDistanceTarget = 4;
  private bokehTarget = DOF.bokehMedium;
  private flashStrength = 0;
  private flashDecay = 6;
  private lensRainTarget = 0;
  private lensRainCurrent = 0;
  private grade: GradeConfig;

  constructor(
    private renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    private quality: QualitySettings,
    gradeName: keyof typeof GRADE = 'noirRain'
  ) {
    this.grade = { ...GRADE[gradeName] };
    this.composer = new EffectComposer(renderer, {
      frameBufferType: THREE.HalfFloatType,
      multisampling: 0,
    });
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    this.exposureFx = new ExposureEffect(this.grade.exposure, this.grade.tint);
    this.filmFx = new FilmEffect(this.grade);

    if (quality.dof) {
      this.dofFx = new DepthOfFieldEffect(camera, {
        focusDistance: 4,
        focusRange: 1.2,
        bokehScale: DOF.bokehMedium,
        resolutionY: quality.dofResolution,
      });
      this.dofFx.target = null;
    }

    if (quality.bloom) {
      this.bloomFx = new BloomEffect({
        intensity: BLOOM.intensity,
        luminanceThreshold: BLOOM.threshold,
        luminanceSmoothing: BLOOM.smoothing,
        radius: BLOOM.radius,
        mipmapBlur: true,
        resolutionY: quality.bloomResolution,
      });
    }

    // Exposure runs in linear space, before the blur convolutions see the frame.
    this.composer.addPass(new EffectPass(camera, this.exposureFx));
    if (this.dofFx) this.composer.addPass(new EffectPass(camera, this.dofFx));
    if (this.bloomFx) this.composer.addPass(new EffectPass(camera, this.bloomFx));
    // FilmEffect tone maps its own samples, so no separate tone-mapping pass.
    this.composer.addPass(new EffectPass(camera, this.filmFx));
    if (quality.antialias === 'smaa') this.composer.addPass(new EffectPass(camera, new SMAAEffect()));
    else if (quality.antialias === 'fxaa') this.composer.addPass(new EffectPass(camera, new FXAAEffect()));
  }

  setCamera(camera: THREE.Camera): void {
    this.renderPass.mainCamera = camera;
    if (this.dofFx) this.dofFx.mainCamera = camera;
  }

  setScene(scene: THREE.Scene): void {
    this.renderPass.mainScene = scene;
  }

  setSize(width: number, height: number): void {
    this.composer.setSize(width, height);
  }

  applyGrade(name: keyof typeof GRADE): void {
    this.grade = { ...GRADE[name] };
    this.exposureFx.exposure = this.grade.exposure;
    this.exposureFx.setTint(this.grade.tint);
    this.filmFx.applyGrade(this.grade);
  }

  /** Blend toward another grade; used for scene transitions and mind-space. */
  blendGrade(name: keyof typeof GRADE, t: number): void {
    const a = GRADE[name];
    const g = this.grade;
    const mix = (x: number, y: number): number => x + (y - x) * t;
    const mix3 = (x: [number, number, number], y: [number, number, number]): [number, number, number] => [
      mix(x[0], y[0]),
      mix(x[1], y[1]),
      mix(x[2], y[2]),
    ];
    const blended: GradeConfig = {
      exposure: mix(g.exposure, a.exposure),
      tint: mix3(g.tint, a.tint),
      contrast: mix(g.contrast, a.contrast),
      saturation: mix(g.saturation, a.saturation),
      shadowTint: mix3(g.shadowTint, a.shadowTint),
      highlightTint: mix3(g.highlightTint, a.highlightTint),
      splitBalance: mix(g.splitBalance, a.splitBalance),
      lift: mix(g.lift, a.lift),
      vignette: mix(g.vignette, a.vignette),
      vignetteSoftness: mix(g.vignetteSoftness, a.vignetteSoftness),
      grain: mix(g.grain, a.grain),
      chromaticAberration: mix(g.chromaticAberration, a.chromaticAberration),
      anamorphic: mix(g.anamorphic, a.anamorphic),
    };
    this.exposureFx.exposure = blended.exposure;
    this.exposureFx.setTint(blended.tint);
    this.filmFx.applyGrade(blended);
  }

  set exposure(v: number) {
    this.exposureFx.exposure = v;
  }

  /** Focus on a world position; the pull is eased so it reads as a real rack focus. */
  focusOn(point: THREE.Vector3, camera: THREE.Camera, immediate = false): void {
    this.focusTarget.copy(point);
    const camPos = new THREE.Vector3();
    camera.getWorldPosition(camPos);
    this.focusDistanceTarget = camPos.distanceTo(point);
    if (immediate) this.focusDistance = this.focusDistanceTarget;
  }

  setFocusDistance(d: number, immediate = false): void {
    this.focusDistanceTarget = d;
    if (immediate) this.focusDistance = d;
  }

  set bokeh(scale: number) {
    this.bokehTarget = scale;
  }

  /** 0..1 amount of water sitting on the lens. */
  setLensRain(v: number, immediate = false): void {
    this.lensRainTarget = this.quality.lensRain ? clamp01(v) : 0;
    if (immediate) this.lensRainCurrent = this.lensRainTarget;
  }

  flash(strength = 1, color: THREE.ColorRepresentation = 0xffffff, decay = 6): void {
    this.flashStrength = strength;
    this.flashDecay = decay;
    this.exposureFx.setFlash(strength, color);
  }

  set scanlines(v: number) {
    this.filmFx.scanline = v;
  }

  update(dt: number, time: number): void {
    this.filmFx.time = time;

    this.focusDistance = damp(this.focusDistance, this.focusDistanceTarget, 6, dt);
    if (this.dofFx) {
      this.dofFx.cocMaterial.focusDistance = this.focusDistance;
      this.dofFx.cocMaterial.focusRange = Math.max(0.35, this.focusDistance * 0.16);
      this.dofFx.bokehScale += (this.bokehTarget - this.dofFx.bokehScale) * Math.min(1, dt * 4);
    }

    this.lensRainCurrent = damp(this.lensRainCurrent, this.lensRainTarget, 3, dt);
    this.filmFx.lensRain = this.lensRainCurrent;

    if (this.flashStrength > 0.0001) {
      this.flashStrength = Math.max(0, this.flashStrength - this.flashStrength * this.flashDecay * dt - dt * 0.05);
      this.exposureFx.setFlash(this.flashStrength);
    } else if (this.exposureFx.flash !== 0) {
      this.exposureFx.setFlash(0);
    }
  }

  /** Renders the raw scene instead of the graded frame, for look isolation. */
  bypass = false;

  render(dt: number): void {
    if (this.bypass) {
      const scene = this.renderPass.mainScene;
      const camera = this.renderPass.mainCamera;
      this.renderer.setRenderTarget(null);
      this.renderer.render(scene, camera);
      return;
    }
    this.composer.render(dt);
  }

  dispose(): void {
    this.composer.dispose();
  }

  get renderTargetInfo(): string {
    return `${this.renderer.domElement.width}x${this.renderer.domElement.height}`;
  }
}
