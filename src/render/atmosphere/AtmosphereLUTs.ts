import * as THREE from 'three';
import {
  AERIAL_FRAG,
  MULTISCATTER_FRAG,
  SKYVIEW_FRAG,
  SKY_AMBIENT_FRAG,
  TRANSMITTANCE_FRAG,
} from '../../shaders/sky/luts.glsl';
import { SKY_PROBE_FRAG } from '../../shaders/sky/sky.glsl';
import { QuadPass } from './QuadPass';
import { INCLUDE, skyFrag, type Uniforms } from './SkyUniforms';

const TRANS_W = 256;
const TRANS_H = 64;
const MULTI = 32;
const AERIAL_D = 32;
const AERIAL_Z = 8;

/**
 * The sky-view table is interpolated bilinearly across a gradient that is
 * smooth but strongly curved, so what shows up as banding is the slope
 * discontinuity between texel rows, not quantisation — dithering cannot touch
 * it and only resolution can. 144 rows over the sqrt-mapped zenith half puts
 * the worst row spacing under a third of a degree.
 */
const SKYVIEW = { w: 256, h: 144 } as const;
const SKYVIEW_SOFT = { w: 176, h: 100 } as const;

function lutTarget(w: number, h: number, count = 1): THREE.WebGLRenderTarget {
  const rt = new THREE.WebGLRenderTarget(w, h, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: false,
    count,
  });
  return rt;
}

/**
 * The three precomputed tables of Hillaire's model plus a world-space aerial
 * perspective volume.
 *
 * Transmittance and multiple scattering are independent of the sun, so they are
 * baked once and only redone when weather changes the aerosol load. The sky-view
 * pair is baked whenever the sun or moon has moved enough to matter — a few
 * hundred microseconds of GPU time for a table that then answers every sky pixel
 * in two texture fetches.
 */
export class AtmosphereLUTs {
  readonly transmittance = lutTarget(TRANS_W, TRANS_H);
  readonly multiScatter = lutTarget(MULTI, MULTI);
  readonly skyView: THREE.WebGLRenderTarget;
  readonly moonSkyView: THREE.WebGLRenderTarget;
  readonly aerial: THREE.WebGL3DRenderTarget;
  private ambientTarget: THREE.WebGLRenderTarget;

  private transPass: QuadPass;
  private multiPass: QuadPass;
  private skyViewPass: QuadPass;
  private aerialPass: QuadPass;
  private ambientPass: QuadPass;
  private ambientBuffer = new Float32Array(8);
  private probePass: QuadPass | null = null;
  private probeTarget: THREE.WebGLRenderTarget | null = null;
  private probeBuffer = new Float32Array(4);

  constructor(private uniforms: Uniforms, software = false) {
    const sv = software ? SKYVIEW_SOFT : SKYVIEW;
    this.skyView = lutTarget(sv.w, sv.h, 2);
    this.moonSkyView = lutTarget(sv.w, sv.h, 2);

    this.aerial = new THREE.WebGL3DRenderTarget(AERIAL_D, AERIAL_D, AERIAL_Z, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: false,
      count: 2,
    });
    this.aerial.texture.wrapR = THREE.ClampToEdgeWrapping;
    for (const t of this.aerial.textures) t.wrapR = THREE.ClampToEdgeWrapping;

    /* Float rather than half-float: this one is read back to the CPU. */
    this.ambientTarget = new THREE.WebGLRenderTarget(2, 1, {
      type: THREE.FloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: false,
    });

    this.transPass = new QuadPass(skyFrag(INCLUDE.atmosphere, TRANSMITTANCE_FRAG), uniforms);
    this.multiPass = new QuadPass(skyFrag(INCLUDE.atmosphere, MULTISCATTER_FRAG), uniforms);
    this.skyViewPass = new QuadPass(skyFrag(INCLUDE.atmosphere, SKYVIEW_FRAG), uniforms, 2);
    this.aerialPass = new QuadPass(skyFrag(INCLUDE.atmosphere, AERIAL_FRAG), uniforms, 2);
    this.ambientPass = new QuadPass(
      skyFrag(INCLUDE.noise, INCLUDE.atmosphere, INCLUDE.night, INCLUDE.skyEval, SKY_AMBIENT_FRAG),
      uniforms,
    );

    uniforms.uTransLutSize.value = new THREE.Vector2(TRANS_W, TRANS_H);
    uniforms.uMultiLutSize.value = MULTI;
    uniforms.uSkyViewSize.value = new THREE.Vector2(sv.w, sv.h);
    uniforms.uAerialSize.value = new THREE.Vector3(AERIAL_D, AERIAL_D, AERIAL_Z);
    uniforms.uTransLut.value = this.transmittance.texture;
    uniforms.uMultiLut.value = this.multiScatter.texture;
    uniforms.uSkyViewLum.value = this.skyView.textures[0];
    uniforms.uSkyViewMie.value = this.skyView.textures[1];
    uniforms.uMoonSkyLum.value = this.moonSkyView.textures[0];
    uniforms.uMoonSkyMie.value = this.moonSkyView.textures[1];
  }

  /** Transmittance then multiple scattering; the latter samples the former. */
  bakeStatic(renderer: THREE.WebGLRenderer): void {
    this.transPass.render(renderer, this.transmittance);
    this.multiPass.render(renderer, this.multiScatter);
  }

  bakeSkyView(renderer: THREE.WebGLRenderer, lightDir: THREE.Vector3, moon = false): void {
    (this.uniforms.uBakeLightDir.value as THREE.Vector3).copy(lightDir);
    this.skyViewPass.render(renderer, moon ? this.moonSkyView : this.skyView);
  }

  bakeAerial(renderer: THREE.WebGLRenderer, lightDir: THREE.Vector3): void {
    (this.uniforms.uBakeLightDir.value as THREE.Vector3).copy(lightDir);
    for (let z = 0; z < AERIAL_Z; z++) {
      this.uniforms.uAerialSlice.value = z;
      this.aerialPass.render(renderer, this.aerial, z);
    }
  }

  /**
   * Hemisphere average into `ambient` and horizon-ring average into `horizon`.
   * Two pixels, so the synchronous read costs a pipeline flush rather than a
   * stall on real bandwidth; the caller throttles it anyway.
   */
  readAmbient(
    renderer: THREE.WebGLRenderer,
    ambient: THREE.Vector3,
    horizon: THREE.Vector3,
  ): void {
    this.ambientPass.render(renderer, this.ambientTarget);
    renderer.readRenderTargetPixels(this.ambientTarget, 0, 0, 2, 1, this.ambientBuffer);
    const b = this.ambientBuffer;
    for (let i = 0; i < 6; i++) if (!Number.isFinite(b[i])) return;
    ambient.set(Math.max(b[0], 0), Math.max(b[1], 0), Math.max(b[2], 0));
    horizon.set(Math.max(b[4], 0), Math.max(b[5], 0), Math.max(b[6], 0));
  }

  /**
   * Radiance in one world direction, read back to the CPU. Built on first use:
   * nothing in a shipping frame needs it, but numeric verification does.
   */
  readRadiance(
    renderer: THREE.WebGLRenderer,
    dir: THREE.Vector3,
    out: THREE.Vector3,
    celestials = true,
    cloudSteps = 0,
    mode = 0,
  ): number {
    if (!this.probePass) {
      this.probePass = new QuadPass(
        skyFrag(
          INCLUDE.noise,
          INCLUDE.atmosphere,
          INCLUDE.night,
          INCLUDE.skyEval,
          INCLUDE.clouds,
          SKY_PROBE_FRAG,
        ),
        this.uniforms,
      );
      this.probeTarget = new THREE.WebGLRenderTarget(1, 1, {
        type: THREE.FloatType,
        format: THREE.RGBAFormat,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        depthBuffer: false,
        stencilBuffer: false,
      });
    }
    (this.uniforms.uProbeDir.value as THREE.Vector3).copy(dir);
    this.uniforms.uProbeCelestials.value = celestials ? 1 : 0;
    this.uniforms.uProbeClouds.value = cloudSteps;
    this.uniforms.uProbeMode.value = mode;
    this.probePass.render(renderer, this.probeTarget);
    renderer.readRenderTargetPixels(this.probeTarget!, 0, 0, 1, 1, this.probeBuffer);
    const b = this.probeBuffer;
    out.set(b[0], b[1], b[2]);
    return b[3];
  }

  dispose(): void {
    this.probePass?.dispose();
    this.probeTarget?.dispose();
    this.transmittance.dispose();
    this.multiScatter.dispose();
    this.skyView.dispose();
    this.moonSkyView.dispose();
    this.aerial.dispose();
    this.ambientTarget.dispose();
    this.transPass.dispose();
    this.multiPass.dispose();
    this.skyViewPass.dispose();
    this.aerialPass.dispose();
    this.ambientPass.dispose();
  }
}
