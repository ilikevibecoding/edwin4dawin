import * as THREE from 'three';
import type { QualityConfig } from '../core/Config';
import type { EngineContext } from '../core/System';
import { clamp, saturate } from '../core/MathUtils';
import { Blitter, attachDepthTexture, createRenderTarget, renderTargetBytes } from './Blitter';
import { AOPass, type AOQuality } from './passes/AOPass';
import { AAPass } from './passes/AAPass';
import { BloomPass } from './passes/BloomPass';
import { CompositePass } from './passes/CompositePass';
import { DebugViewPass, parseDebugPass, type DebugPassName } from './passes/DebugViewPass';
import { DofPass } from './passes/DofPass';
import { ExposurePass } from './passes/ExposurePass';
import { MotionBlurPass } from './passes/MotionBlurPass';
import { ResolvePass } from './passes/ResolvePass';
import { SSRPass } from './passes/SSRPass';
import { TAAPass } from './passes/TAAPass';
import { VelocityPass } from './passes/VelocityPass';
import { VolumetricPass } from './passes/VolumetricPass';

/**
 * The post-processing pipeline.
 *
 * Everything is driven by one `Blitter` over hand-managed render targets rather
 * than by `EffectComposer`: the composer copies between two full-size buffers
 * between every pass, which at ultra would be a dozen redundant full-screen
 * writes per frame. Here each pass writes exactly one target and the next one
 * reads it, half-resolution work stays at half resolution, and the ten cheapest
 * screen-space operations are folded into a single composite shader.
 *
 * Passes that a quality tier disables are not merely skipped — they are never
 * constructed, so their render targets cost no memory either.
 */

/**
 * GTAO search radius in metres.
 *
 * The horizon search takes the *maximum* elevation any tap reaches, so the
 * radius decides what the occlusion is a measure of, and a longer one does not
 * simply mean more of it. At 2.4m a six-metre street is inside its own search
 * everywhere: the buildings either side raise the horizon for open road and open
 * facade too, and the buffer picks up a broad low-frequency wash over the flat
 * surfaces on top of the darkening at the creases — measured on the hip-fire
 * frame, mean 0.775 and 42% of pixels below 0.8, against 0.839 and 30% here.
 * That extra darkness is not contact shading. It reads as a dim, slightly dirty
 * image, and it double-counts sky occlusion the IBL has already accounted for.
 * What reads as occlusion is local contrast: an open wall at one and a crease at
 * a third, a metre apart. Short enough to leave the open surfaces alone, long
 * enough that a column base or a kerb still fills several half-resolution
 * texels.
 */
const AO_WORLD_RADIUS = 1.4;
/**
 * The same search for the viewmodel, which is a sub-metre object a hand's
 * length from the near plane: at the world radius the whole weapon fits inside
 * one search and integrates to no occlusion at all.
 */
const AO_VIEWMODEL_RADIUS = 0.14;
/** Exponent on the integrated visibility. Above one to deepen mid-occlusion. */
const AO_POWER = 1.85;

/** Per-frame state the render system hands to the pipeline. */
export interface FrameInputs {
  dt: number;
  elapsed: number;
  blueNoise: THREE.Texture | null;
  noiseSize: number;
  cascades: readonly THREE.DirectionalLight[];
  sunDirection: THREE.Vector3;
  sunColor: THREE.Color;
  sunIntensity: number;
  /** 0..1 from the lighting module's throttled occlusion raycast. */
  sunVisibility: number;
  fogDensity: number;
  wind: THREE.Vector2;
  flash: THREE.Vector4;
  concussion: THREE.Vector4;
  /** Suppresses TAA jitter, which would shimmer on a static menu frame. */
  cameraStationary: boolean;
}

interface Pipeline {
  velocity: boolean;
  ao: boolean;
  ssr: boolean;
  volumetric: boolean;
  bloom: boolean;
  motionBlur: boolean;
  dof: boolean;
  taa: boolean;
  fxaa: boolean;
  smaa: boolean;
  lensFlare: boolean;
  contactShadows: boolean;
}

function pipelineFor(config: QualityConfig): Pipeline {
  const taa = config.antialias === 'taa';
  const smaa = config.antialias === 'smaa';
  const fxaa = config.antialias === 'fxaa';
  const volumetric = config.volumetricLighting;
  const motionBlur = config.motionBlurEnabled;
  return {
    taa,
    smaa,
    fxaa,
    volumetric,
    motionBlur,
    ao: config.ssaoEnabled,
    ssr: config.ssrEnabled,
    bloom: config.bloomEnabled,
    dof: config.dofEnabled,
    lensFlare: config.lensFlare,
    contactShadows: config.contactShadows,
    velocity: taa || motionBlur || volumetric,
  };
}

function aoQualityFor(config: QualityConfig): AOQuality {
  return config.ssaoQuality === 'high'
    ? { slices: 3, steps: 6, contactSteps: 8 }
    : { slices: 2, steps: 4, contactSteps: 5 };
}

function bloomMipsFor(config: QualityConfig): number {
  switch (config.tier) {
    case 'ultra':
    case 'high':
      return 6;
    case 'medium':
      return 5;
    default:
      return 4;
  }
}

function dofTapsFor(config: QualityConfig): number {
  switch (config.tier) {
    case 'ultra':
      return 28;
    case 'high':
      return 20;
    default:
      return 12;
  }
}

export class PostFX {
  private ctx!: EngineContext;
  private readonly blitter = new Blitter();

  private width = 1;
  private height = 1;

  private sceneTarget!: THREE.WebGLRenderTarget;
  private sceneDepth!: THREE.DepthTexture;
  private viewTarget!: THREE.WebGLRenderTarget;
  private viewDepth!: THREE.DepthTexture;
  private resolveTarget!: THREE.WebGLRenderTarget;
  private ldrTarget: THREE.WebGLRenderTarget | null = null;

  private velocityPass: VelocityPass | null = null;
  private aoPass: AOPass | null = null;
  private ssrPass: SSRPass | null = null;
  private volumetricPass: VolumetricPass | null = null;
  private taaPass: TAAPass | null = null;
  private motionBlurPass: MotionBlurPass | null = null;
  private dofPass: DofPass | null = null;
  private bloomPass: BloomPass | null = null;

  private readonly resolvePass = new ResolvePass();
  private readonly exposurePass = new ExposurePass();
  private readonly compositePass = new CompositePass();
  private readonly aaPass = new AAPass();
  private readonly debugPass = new DebugViewPass();

  private pipeline: Pipeline = {
    velocity: false,
    ao: false,
    ssr: false,
    volumetric: false,
    bloom: false,
    motionBlur: false,
    dof: false,
    taa: false,
    fxaa: false,
    smaa: false,
    lensFlare: false,
    contactShadows: false,
  };
  private debugMode: DebugPassName = 'none';

  private frame = 0;
  private lastSceneDrawCalls = 0;
  private readonly passNames: string[] = [];
  private readonly resolveStrength = new THREE.Vector4(1, 1, 1, 1);
  private readonly sunUniform = new THREE.Vector4(0.5, 0.5, 1, 0);
  private readonly viewJitter = new THREE.Vector2();
  private readonly scratchV3 = new THREE.Vector3();
  private readonly scratchV3b = new THREE.Vector3();

  /** Scope blend, 0..1; drives depth-of-field aperture and vignette weight. */
  scopeAmount = 0;

  init(ctx: EngineContext): void {
    this.ctx = ctx;
    this.debugMode = parseDebugPass(location.search);

    // The composite shader owns tonemapping so that grading happens after the
    // tonemap, in display-referred space, which is where a LUT is defined.
    ctx.renderer.toneMapping = THREE.NoToneMapping;
    ctx.renderer.toneMappingExposure = 1;
    ctx.renderer.autoClear = true;

    this.width = Math.max(1, ctx.size.width);
    this.height = Math.max(1, ctx.size.height);

    this.sceneTarget = createRenderTarget(this.width, this.height, {
      depth: true,
      name: 'sceneHDR',
    });
    this.sceneDepth = attachDepthTexture(this.sceneTarget);
    this.viewTarget = createRenderTarget(this.width, this.height, {
      depth: true,
      name: 'viewmodelHDR',
    });
    this.viewDepth = attachDepthTexture(this.viewTarget);
    this.viewDepth.name = 'viewmodelDepth';
    this.resolveTarget = createRenderTarget(this.width, this.height, { name: 'resolveHDR' });

    this.rebuild(ctx.config);
    this.applySize(this.width, this.height);
  }

  // -------------------------------------------------------------------------
  // Construction / teardown of the optional passes
  // -------------------------------------------------------------------------

  private rebuild(config: QualityConfig): void {
    const next = pipelineFor(config);
    const prev = this.pipeline;
    this.pipeline = next;

    if (next.velocity && !this.velocityPass) {
      this.velocityPass = new VelocityPass(this.width, this.height);
    } else if (!next.velocity && this.velocityPass) {
      this.velocityPass.dispose();
      this.velocityPass = null;
    }

    if (next.ao && !this.aoPass) {
      this.aoPass = new AOPass(this.width, this.height, aoQualityFor(config));
    } else if (!next.ao && this.aoPass) {
      this.aoPass.dispose();
      this.aoPass = null;
    } else if (this.aoPass) {
      this.aoPass.setQuality(aoQualityFor(config));
    }

    if (next.ssr && !this.ssrPass) {
      this.ssrPass = new SSRPass(this.width, this.height, config.ssrSteps);
    } else if (!next.ssr && this.ssrPass) {
      this.ssrPass.dispose();
      this.ssrPass = null;
    } else if (this.ssrPass) {
      this.ssrPass.setQuality(config.ssrSteps);
    }

    const cascadeCount = Math.max(1, config.shadowCascades);
    if (next.volumetric && !this.volumetricPass) {
      this.volumetricPass = new VolumetricPass(this.width, this.height, config.volumetricSteps);
      this.volumetricPass.setQuality(config.volumetricSteps, cascadeCount);
    } else if (!next.volumetric && this.volumetricPass) {
      this.volumetricPass.dispose();
      this.volumetricPass = null;
    } else if (this.volumetricPass) {
      this.volumetricPass.setQuality(config.volumetricSteps, cascadeCount);
    }

    if (next.taa && !this.taaPass) {
      this.taaPass = new TAAPass(this.width, this.height);
    } else if (!next.taa && this.taaPass) {
      this.taaPass.dispose();
      this.taaPass = null;
    }

    if (next.motionBlur && !this.motionBlurPass) {
      this.motionBlurPass = new MotionBlurPass(this.width, this.height, config.motionBlurSamples);
    } else if (!next.motionBlur && this.motionBlurPass) {
      this.motionBlurPass.dispose();
      this.motionBlurPass = null;
    } else if (this.motionBlurPass) {
      this.motionBlurPass.setQuality(config.motionBlurSamples);
    }

    if (next.dof && !this.dofPass) {
      this.dofPass = new DofPass(this.width, this.height, dofTapsFor(config));
    } else if (!next.dof && this.dofPass) {
      this.dofPass.dispose();
      this.dofPass = null;
    } else if (this.dofPass) {
      this.dofPass.setQuality(dofTapsFor(config));
    }

    const bloomMips = bloomMipsFor(config);
    if (next.bloom && !this.bloomPass) {
      this.bloomPass = new BloomPass(this.width, this.height, bloomMips);
    } else if (!next.bloom && this.bloomPass) {
      this.bloomPass.dispose();
      this.bloomPass = null;
    } else if (this.bloomPass) {
      this.bloomPass.setQuality(bloomMips);
    }

    const wantsLdr = next.fxaa || next.smaa;
    if (wantsLdr && !this.ldrTarget) {
      this.ldrTarget = createRenderTarget(this.width, this.height, {
        type: THREE.UnsignedByteType,
        name: 'ldr',
      });
    } else if (!wantsLdr && this.ldrTarget) {
      this.ldrTarget.dispose();
      this.ldrTarget = null;
    }
    if (!next.smaa && prev.smaa) this.aaPass.releaseSmaa();

    // Grade and grain intensity are part of the look, not of performance, so they
    // stay on at every tier that has not explicitly disabled them.
    this.compositePass.setFeatures({
      bloom: next.bloom,
      lensFlare: next.lensFlare,
      chromaticAberration: config.chromaticAberration,
      filmGrain: config.filmGrain,
      vignette: config.vignette,
      colorGrading: config.colorGrading,
      // Sharpening only pays for itself when something has softened the image.
      sharpen: next.taa,
      concussion: config.tier !== 'low',
    });
    this.compositePass.sharpenAmount = next.taa ? 0.85 : 0;

    this.rebuildPassNames();
  }

  private rebuildPassNames(): void {
    const p = this.pipeline;
    const names = this.passNames;
    names.length = 0;
    names.push('scene');
    names.push('viewmodel');
    if (p.velocity) names.push('velocity');
    if (p.ao) names.push('gtao');
    if (p.ssr) names.push('ssr');
    if (p.volumetric) names.push('volumetric');
    names.push('resolve');
    names.push('exposure');
    if (p.taa) names.push('taa');
    if (p.motionBlur) names.push('motionblur');
    if (p.dof) names.push('dof');
    if (p.bloom) names.push('bloom');
    if (p.lensFlare) names.push('lensflare');
    names.push('composite');
    if (p.fxaa) names.push('fxaa');
    if (p.smaa) names.push('smaa');
    if (this.debugMode !== 'none') names.push(`debug:${this.debugMode}`);
  }

  onQualityChanged(config: QualityConfig): void {
    this.rebuild(config);
    this.applySize(Math.max(1, this.ctx.size.width), Math.max(1, this.ctx.size.height));
    this.exposurePass.reset();
  }

  resize(width: number, height: number): void {
    this.applySize(Math.max(1, width), Math.max(1, height));
  }

  private applySize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.blitter.screenPixels = width * height;

    this.sceneTarget.setSize(width, height);
    this.viewTarget.setSize(width, height);
    this.resolveTarget.setSize(width, height);
    this.ldrTarget?.setSize(width, height);

    this.velocityPass?.setSize(width, height);
    this.aoPass?.setSize(width, height);
    this.ssrPass?.setSize(width, height);
    this.volumetricPass?.setSize(width, height);
    this.taaPass?.setSize(width, height);
    this.motionBlurPass?.setSize(width, height);
    this.dofPass?.setSize(width, height);
    this.bloomPass?.setSize(width, height);
    this.aaPass.setSize(width, height);
    this.velocityPass?.reset();
  }

  // -------------------------------------------------------------------------
  // Frame
  // -------------------------------------------------------------------------

  render(inputs: FrameInputs): void {
    const ctx = this.ctx;
    const renderer = ctx.renderer;
    const camera = ctx.camera;
    const viewCamera = ctx.viewCamera;
    const p = this.pipeline;
    const width = this.width;
    const height = this.height;

    this.frame = (this.frame + 1) & 0xffff;
    this.blitter.resetCounters();

    // Un-jittered snapshot first: motion vectors must describe camera motion
    // only, otherwise TAA chases its own jitter.
    this.velocityPass?.captureCamera(camera);

    const jitter = p.taa && !inputs.cameraStationary;
    this.viewJitter.set(0, 0);
    if (this.taaPass) {
      const offset = this.taaPass.applyJitter(camera, width, height, jitter);
      // The viewmodel shares the screen, so it needs the identical NDC offset or
      // TAA would resolve a stationary weapon against a moving history.
      if (jitter) {
        this.viewJitter.set((offset.x * 2) / width, (offset.y * 2) / height);
        const e = viewCamera.projectionMatrix.elements;
        e[8] += this.viewJitter.x;
        e[9] += this.viewJitter.y;
        viewCamera.projectionMatrixInverse.copy(viewCamera.projectionMatrix).invert();
      }
    }

    // --- world -------------------------------------------------------------
    renderer.autoClear = true;
    renderer.setClearColor(0x000000, 1);
    renderer.setRenderTarget(this.sceneTarget);
    renderer.render(ctx.scene, camera);

    // --- viewmodel ---------------------------------------------------------
    // Its own target with its own depth buffer: the weapon can never be clipped
    // by world geometry, and its coverage lands in alpha for the passes that
    // need to treat it differently.
    renderer.setClearColor(0x000000, 0);
    renderer.setRenderTarget(this.viewTarget);
    renderer.render(ctx.viewScene, viewCamera);
    renderer.setClearColor(0x000000, 1);
    // Every remaining pass is a full-screen blit; an implicit clear would wipe
    // the target the additive bloom upsample is accumulating into.
    renderer.autoClear = false;

    const sceneDrawCalls = renderer.info.render.calls;

    // --- screen space ------------------------------------------------------
    if (this.velocityPass) {
      this.velocityPass.render(renderer, this.blitter, this.sceneDepth);
    }
    const velocityTexture = this.velocityPass?.texture ?? null;

    if (this.aoPass) {
      this.viewSpaceDirection(camera, inputs.sunDirection, this.scratchV3);
      this.aoPass.render(
        renderer,
        this.blitter,
        this.sceneDepth,
        camera,
        width,
        height,
        this.scratchV3,
        inputs.blueNoise,
        inputs.noiseSize,
        this.frame,
        p.contactShadows,
        AO_WORLD_RADIUS,
        AO_POWER,
      );
      this.aoPass.renderViewmodel(
        renderer,
        this.blitter,
        this.viewDepth,
        viewCamera,
        width,
        height,
        inputs.blueNoise,
        inputs.noiseSize,
        this.frame,
        AO_VIEWMODEL_RADIUS,
        AO_POWER,
      );
    }

    if (this.ssrPass) {
      this.viewSpaceDirection(camera, UP, this.scratchV3b);
      this.ssrPass.render(
        renderer,
        this.blitter,
        this.sceneDepth,
        this.sceneTarget.texture,
        camera,
        width,
        height,
        this.scratchV3b,
        inputs.blueNoise,
        inputs.noiseSize,
        this.frame,
        0.9,
      );
    }

    if (this.volumetricPass && velocityTexture) {
      this.volumetricPass.render(
        renderer,
        this.blitter,
        this.sceneDepth,
        velocityTexture,
        camera,
        inputs.cascades,
        inputs.sunDirection,
        inputs.sunColor,
        inputs.sunIntensity,
        inputs.fogDensity,
        inputs.wind,
        inputs.elapsed,
        inputs.blueNoise,
        inputs.noiseSize,
        this.frame,
      );
    }

    // --- resolve -----------------------------------------------------------
    const halfW = Math.max(1, width >> 1);
    const halfH = Math.max(1, height >> 1);
    this.resolveStrength.set(1, 1, 1, 1);
    this.resolvePass.render(
      renderer,
      this.blitter,
      this.resolveTarget,
      {
        scene: this.sceneTarget.texture,
        viewmodel: this.viewTarget.texture,
        depth: this.sceneDepth,
        ao: this.aoPass?.texture ?? null,
        viewmodelAO: this.aoPass?.viewmodelTexture ?? null,
        ssr: this.ssrPass?.texture ?? null,
        volumetric: this.volumetricPass?.texture ?? null,
      },
      camera,
      halfW,
      halfH,
      this.resolveStrength,
    );

    // --- exposure ----------------------------------------------------------
    this.exposurePass.render(
      renderer,
      this.blitter,
      this.resolveTarget.texture,
      this.sceneDepth,
      camera,
      inputs.dt,
    );

    // --- temporal + camera-motion effects ----------------------------------
    let color: THREE.Texture = this.resolveTarget.texture;

    if (this.taaPass && velocityTexture) {
      color = this.taaPass.render(
        renderer,
        this.blitter,
        color,
        velocityTexture,
        this.sceneDepth,
        width,
        height,
        inputs.cameraStationary ? 0.96 : 0.9,
      );
    }

    if (this.motionBlurPass && velocityTexture) {
      color = this.motionBlurPass.render(
        renderer,
        this.blitter,
        color,
        velocityTexture,
        width,
        height,
        0.85,
        inputs.blueNoise,
        inputs.noiseSize,
        this.frame,
      );
    }

    if (this.dofPass) {
      this.dofPass.scopeAmount = this.scopeAmount;
      color = this.dofPass.render(
        renderer,
        this.blitter,
        color,
        this.sceneDepth,
        this.exposurePass.texture,
        camera,
        width,
        height,
        inputs.blueNoise,
        inputs.noiseSize,
        this.frame,
      );
    }

    // --- bloom -------------------------------------------------------------
    if (this.bloomPass) {
      // Threshold in exposed units: 1.15 means "brighter than the adapted white
      // point", so specular hits and the sun disc bloom while a bright sky does
      // not lift the whole frame.
      this.bloomPass.render(
        renderer,
        this.blitter,
        color,
        this.exposurePass.texture,
        width,
        height,
        1.15,
        1.0,
        p.lensFlare,
        this.compositePass.manualExposure,
      );
    }

    // --- present -----------------------------------------------------------
    this.updateSunUniform(camera, inputs.sunDirection, inputs.sunVisibility);

    if (this.debugMode !== 'none') {
      this.presentDebug(renderer, camera, color, velocityTexture);
    } else {
      const compositeTarget = this.ldrTarget;
      this.compositePass.render(
        renderer,
        this.blitter,
        compositeTarget,
        {
          source: color,
          exposure: this.exposurePass.texture,
          bloom: this.bloomPass?.texture ?? null,
          ghost: this.bloomPass?.ghostTexture ?? null,
          streak: this.bloomPass?.streakTexture ?? null,
          blueNoise: inputs.blueNoise,
          noiseSize: inputs.noiseSize,
        },
        width,
        height,
        this.frame,
        inputs.elapsed,
        inputs.flash,
        inputs.concussion,
        this.sunUniform,
      );

      if (compositeTarget) {
        if (p.smaa) this.aaPass.smaaResolve(renderer, compositeTarget, null);
        else this.aaPass.fxaa(renderer, this.blitter, compositeTarget.texture, null);
      }
    }

    renderer.setRenderTarget(null);
    renderer.autoClear = true;

    this.velocityPass?.endFrame();
    if (this.taaPass) {
      this.taaPass.removeJitter(camera, width, height);
      if (this.viewJitter.x !== 0 || this.viewJitter.y !== 0) {
        const e = viewCamera.projectionMatrix.elements;
        e[8] -= this.viewJitter.x;
        e[9] -= this.viewJitter.y;
        viewCamera.projectionMatrixInverse.copy(viewCamera.projectionMatrix).invert();
        this.viewJitter.set(0, 0);
      }
    }

    this.lastSceneDrawCalls = sceneDrawCalls;
  }

  private presentDebug(
    renderer: THREE.WebGLRenderer,
    camera: THREE.PerspectiveCamera,
    color: THREE.Texture,
    velocity: THREE.Texture | null,
  ): void {
    let source: THREE.Texture | null = null;
    let scale = 1;
    switch (this.debugMode) {
      case 'scene':
        source = this.sceneTarget.texture;
        break;
      case 'viewmodel':
        source = this.viewTarget.texture;
        break;
      case 'ao':
      case 'contact':
        source = this.aoPass?.texture ?? null;
        break;
      case 'viewao':
        source = this.aoPass?.viewmodelTexture ?? null;
        break;
      case 'ssr':
        source = this.ssrPass?.texture ?? null;
        scale = 4;
        break;
      case 'velocity':
        source = velocity;
        break;
      case 'bloom':
        source = this.bloomPass?.texture ?? null;
        scale = 6;
        break;
      case 'ghost':
        source = this.bloomPass?.ghostTexture ?? null;
        scale = 8;
        break;
      case 'streak':
        source = this.bloomPass?.streakTexture ?? null;
        scale = 8;
        break;
      case 'volumetric':
        source = this.volumetricPass?.texture ?? null;
        scale = 3;
        break;
      case 'exposure':
        source = this.exposurePass.texture;
        break;
      case 'resolve':
        source = color;
        break;
      case 'depth':
      case 'normals':
        source = this.sceneDepth;
        break;
      default:
        source = color;
        break;
    }
    // A requested buffer the current tier never allocated falls back to the final
    // image rather than to a black screen.
    this.debugPass.render(
      renderer,
      this.blitter,
      this.debugMode,
      source ?? color,
      this.sceneDepth,
      camera,
      this.width,
      this.height,
      scale,
    );
  }

  /** Rotate a world-space direction into the main camera's view space. */
  private viewSpaceDirection(
    camera: THREE.PerspectiveCamera,
    world: THREE.Vector3,
    out: THREE.Vector3,
  ): THREE.Vector3 {
    return out
      .copy(world)
      .applyQuaternion(SCRATCH_QUAT.setFromRotationMatrix(camera.matrixWorld).invert())
      .normalize();
  }

  private updateSunUniform(
    camera: THREE.PerspectiveCamera,
    sunDirection: THREE.Vector3,
    visibility: number,
  ): void {
    // Project a point far along the sun direction; the flare needs the sun's
    // screen position and whether it is actually in front of the camera.
    this.scratchV3
      .copy(camera.position)
      .addScaledVector(sunDirection, Math.min(camera.far * 0.8, 4000));
    this.scratchV3.project(camera);
    const u = (this.scratchV3.x + 1) * 0.5;
    const v = (this.scratchV3.y + 1) * 0.5;
    const inFront = this.scratchV3.z < 1;
    const margin = 0.35;
    const onScreen =
      inFront && u > -margin && u < 1 + margin && v > -margin && v < 1 + margin ? 1 : 0;
    // Fade the streak out as the sun leaves the frame instead of popping.
    const edge =
      1 -
      saturate((Math.max(Math.abs(u - 0.5), Math.abs(v - 0.5)) - 0.5) / Math.max(margin, 1e-3));
    this.sunUniform.set(u, v, saturate(visibility), onScreen * edge);
  }

  // -------------------------------------------------------------------------
  // External control
  // -------------------------------------------------------------------------

  setExposure(v: number): void {
    // Interpreted as a linear multiplier; anything <= 0 hands control back to
    // the auto-exposure histogram.
    this.compositePass.manualExposure = v > 0 ? clamp(v, 0.02, 12) : -1;
    this.exposurePass.manualExposure = this.compositePass.manualExposure;
  }

  setFocusDistance(meters: number | null): void {
    if (this.dofPass) this.dofPass.focusDistance = meters;
    this.exposurePass.manualFocus = meters !== null && meters > 0 ? meters : -1;
  }

  setGradeAmount(amount: number): void {
    this.compositePass.gradeAmount = saturate(amount);
  }

  setVignette(amount: number): void {
    this.compositePass.vignetteAmount = clamp(amount, 0, 1.2);
  }

  get exposureTexture(): THREE.Texture {
    return this.exposurePass.texture;
  }

  get sceneDepthTexture(): THREE.DepthTexture {
    return this.sceneDepth;
  }

  get activePasses(): readonly string[] {
    return this.passNames;
  }

  get blitCount(): number {
    let extra = 0;
    if (this.pipeline.smaa) extra = 3;
    return this.blitter.passCount + extra;
  }

  get megaPixels(): number {
    return this.blitter.megaPixels;
  }

  get sceneDrawCalls(): number {
    return this.lastSceneDrawCalls;
  }

  get debugPassName(): DebugPassName {
    return this.debugMode;
  }

  setDebugPass(name: DebugPassName): void {
    if (this.debugMode === name) return;
    this.debugMode = name;
    this.rebuildPassNames();
  }

  targetMemoryBytes(): number {
    let bytes =
      renderTargetBytes(this.sceneTarget) +
      renderTargetBytes(this.viewTarget) +
      renderTargetBytes(this.resolveTarget);
    if (this.ldrTarget) bytes += renderTargetBytes(this.ldrTarget);
    if (this.velocityPass) bytes += renderTargetBytes(this.velocityPass.target);
    for (const rt of this.aoPass?.targets ?? []) bytes += renderTargetBytes(rt);
    if (this.ssrPass) bytes += renderTargetBytes(this.ssrPass.target);
    for (const rt of this.volumetricPass?.targets ?? []) bytes += renderTargetBytes(rt);
    for (const rt of this.taaPass?.targets ?? []) bytes += renderTargetBytes(rt);
    for (const rt of this.motionBlurPass?.targets ?? []) bytes += renderTargetBytes(rt);
    for (const rt of this.dofPass?.targets ?? []) bytes += renderTargetBytes(rt);
    for (const rt of this.bloomPass?.targets ?? []) bytes += renderTargetBytes(rt);
    for (const rt of this.exposurePass.targets) bytes += renderTargetBytes(rt);
    return bytes;
  }

  get exposureMode(): string {
    return this.compositePass.manualExposure > 0
      ? `manual ${this.compositePass.manualExposure.toFixed(2)}`
      : 'auto';
  }

  /** Blitter handle so the environment probe can share the full-screen driver. */
  get fullscreen(): Blitter {
    return this.blitter;
  }

  resetTemporal(): void {
    this.taaPass?.reset();
    this.velocityPass?.reset();
    this.exposurePass.reset();
  }

  dispose(): void {
    this.sceneTarget.dispose();
    this.sceneDepth.dispose();
    this.viewTarget.dispose();
    this.viewDepth.dispose();
    this.resolveTarget.dispose();
    this.ldrTarget?.dispose();
    this.ldrTarget = null;

    this.velocityPass?.dispose();
    this.aoPass?.dispose();
    this.ssrPass?.dispose();
    this.volumetricPass?.dispose();
    this.taaPass?.dispose();
    this.motionBlurPass?.dispose();
    this.dofPass?.dispose();
    this.bloomPass?.dispose();
    this.resolvePass.dispose();
    this.exposurePass.dispose();
    this.compositePass.dispose();
    this.aaPass.dispose();
    this.debugPass.dispose();
    this.blitter.dispose();
  }
}

const UP = /* @__PURE__ */ new THREE.Vector3(0, 1, 0);
const SCRATCH_QUAT = /* @__PURE__ */ new THREE.Quaternion();
