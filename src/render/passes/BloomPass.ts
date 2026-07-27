import * as THREE from 'three';
import type { QualitySettings } from '../../core/Quality';
import { Composer } from './Composer';
import {
  BLOOM_DOWNSAMPLE_FRAG,
  BLOOM_PREFILTER_FRAG,
  BLOOM_STREAK_FRAG,
  BLOOM_UPSAMPLE_FRAG,
  FLARE_PREFILTER_FRAG,
} from '../../shaders/post/bloom.glsl';

/** Smallest mip we are willing to produce; below this the tent filter aliases. */
const MIN_MIP_SIZE = 8;

export class BloomPass {
  /** Half-resolution accumulation of the whole pyramid. */
  get texture(): THREE.Texture {
    return this.mips.length > 0 ? this.mips[0].texture : this.fallback.texture;
  }

  get streakTexture(): THREE.Texture {
    return this.streak.length > 0 ? this.streak[1].texture : this.fallback.texture;
  }

  /** High-threshold, compact-source-only buffer that drives ghosts and halo. */
  get flareTexture(): THREE.Texture {
    return this.flare.length > 1 ? this.flare[1].texture : this.fallback.texture;
  }

  /** Stops above display white at which bloom starts. */
  threshold = 1.1;
  softKnee = 0.6;
  /**
   * Where the flare chain starts, in stops above display white. Deliberately
   * far past bloom's threshold: at 4 stops a hazy sunset's whole glow qualifies
   * and its ghost is a broad smear with no visible cause, whereas at 4.5 stops
   * only the disk itself does.
   */
  flareThreshold = 22;
  /** Ceiling on exposed radiance so one blown pixel cannot flood the chain. */
  clampMax = 220;
  /**
   * Tighter ceiling for the flare chain.
   *
   * Ghosts and streaks are placed away from their source, so unlike bloom there
   * is nothing bright underneath to hide them. Staring at the sun puts thousands
   * of times display white into the buffer, and any strength that keeps that
   * civil makes a muzzle flash produce nothing at all. Clamping the source
   * decouples the two: the strength then sets how a *qualifying* highlight
   * flares, and the clamp sets how bad the worst case is allowed to get.
   */
  flareClamp = 48;
  radius = 1.0;
  /** Streak step, in eighth-res texels per tap; 8 taps each side. */
  streakReach = 7;

  private composer: Composer;
  private mips: THREE.WebGLRenderTarget[] = [];
  private streak: THREE.WebGLRenderTarget[] = [];
  private flare: THREE.WebGLRenderTarget[] = [];
  private fallback: THREE.WebGLRenderTarget;
  private prefilter: THREE.ShaderMaterial;
  private flarePrefilter: THREE.ShaderMaterial;
  private downsample: THREE.ShaderMaterial;
  private upsample: THREE.ShaderMaterial;
  private streakMat: THREE.ShaderMaterial;
  private levels = 5;
  private width = 1;
  private height = 1;
  private streakEnabled = true;
  private flareEnabled = true;

  constructor(composer: Composer, exposure: THREE.Texture) {
    this.composer = composer;
    this.fallback = composer.createTarget(1, 1);

    this.prefilter = composer.material(BLOOM_PREFILTER_FRAG, {
      uSrc: { value: null },
      uTexel: { value: new THREE.Vector2() },
      uThreshold: { value: this.threshold },
      uSoftKnee: { value: this.softKnee },
      uClamp: { value: this.clampMax },
      uExposureTex: { value: exposure },
      uExposureComp: { value: 0 },
      uExposureOverride: { value: -1 },
    });

    this.flarePrefilter = composer.material(FLARE_PREFILTER_FRAG, {
      uSrc: { value: null },
      uTexel: { value: new THREE.Vector2() },
      uThreshold: { value: this.flareThreshold },
      uClamp: { value: this.clampMax },
      uExposureTex: { value: exposure },
      uExposureComp: { value: 0 },
      uExposureOverride: { value: -1 },
    });
    this.downsample = composer.material(BLOOM_DOWNSAMPLE_FRAG, {
      uSrc: { value: null },
      uTexel: { value: new THREE.Vector2() },
    });
    this.upsample = composer.material(BLOOM_UPSAMPLE_FRAG, {
      uSrc: { value: null },
      uTexel: { value: new THREE.Vector2() },
      uRadius: { value: 1 },
      uBlend: { value: 0.5 },
    });
    // Lerp accumulation: keeps the pyramid's weights summing to one so raising
    // the mip count changes the falloff, not the brightness.
    this.upsample.blending = THREE.CustomBlending;
    this.upsample.blendEquation = THREE.AddEquation;
    this.upsample.blendSrc = THREE.SrcAlphaFactor;
    this.upsample.blendDst = THREE.OneMinusSrcAlphaFactor;
    this.upsample.transparent = true;

    this.streakMat = composer.material(BLOOM_STREAK_FRAG, {
      uSrc: { value: null },
      uDirection: { value: new THREE.Vector2() },
      // Cool, not blue: an anamorphic streak on a warm source that comes out
      // violet reads as a shader bug. Barely off-white is enough to sell it.
      uTint: { value: new THREE.Vector3(0.86, 0.94, 1.12) },
      uAttenuation: { value: 0.94 },
      uSpread: { value: 0 },
    });
  }

  configure(quality: QualitySettings): void {
    this.levels = Math.max(2, Math.min(8, Math.round(quality.bloomQuality)));
    this.streakEnabled = quality.lensFlare;
    this.flareEnabled = quality.lensFlare;
  }

  /** Keeps the thresholds tracking the grade's exposure override and offset. */
  setExposure(comp: number, override: number | null): void {
    for (const m of [this.prefilter, this.flarePrefilter]) {
      m.uniforms.uExposureComp.value = comp;
      m.uniforms.uExposureOverride.value = override ?? -1;
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    for (const m of this.mips) this.composer.destroyTarget(m);
    for (const s of this.streak) this.composer.destroyTarget(s);
    for (const f of this.flare) this.composer.destroyTarget(f);
    this.mips.length = 0;
    this.streak.length = 0;
    this.flare.length = 0;

    let w = Math.max(1, width >> 1);
    let h = Math.max(1, height >> 1);
    for (let i = 0; i < this.levels; i++) {
      if (i > 0 && (w < MIN_MIP_SIZE || h < MIN_MIP_SIZE)) break;
      this.mips.push(this.composer.createTarget(w, h));
      w = Math.max(1, w >> 1);
      h = Math.max(1, h >> 1);
    }

    if (this.flareEnabled) {
      this.flare.push(
        this.composer.createTarget(Math.max(1, width >> 3), Math.max(1, height >> 3)),
      );
      this.flare.push(
        this.composer.createTarget(Math.max(1, width >> 4), Math.max(1, height >> 4)),
      );
      if (this.streakEnabled) {
        for (let i = 0; i < 2; i++) {
          this.streak.push(
            this.composer.createTarget(this.flare[0].width, this.flare[0].height),
          );
        }
      }
    }
  }

  render(source: THREE.Texture): void {
    if (this.mips.length === 0) return;
    const c = this.composer;

    this.prefilter.uniforms.uSrc.value = source;
    this.prefilter.uniforms.uThreshold.value = this.threshold;
    this.prefilter.uniforms.uSoftKnee.value = this.softKnee;
    this.prefilter.uniforms.uClamp.value = this.clampMax;
    (this.prefilter.uniforms.uTexel.value as THREE.Vector2).set(1 / this.width, 1 / this.height);
    c.draw(this.prefilter, this.mips[0]);

    for (let i = 1; i < this.mips.length; i++) {
      const src = this.mips[i - 1];
      this.downsample.uniforms.uSrc.value = src.texture;
      (this.downsample.uniforms.uTexel.value as THREE.Vector2).set(1 / src.width, 1 / src.height);
      c.draw(this.downsample, this.mips[i]);
    }

    this.upsample.uniforms.uRadius.value = this.radius;
    for (let i = this.mips.length - 1; i > 0; i--) {
      const src = this.mips[i];
      const dst = this.mips[i - 1];
      this.upsample.uniforms.uSrc.value = src.texture;
      (this.upsample.uniforms.uTexel.value as THREE.Vector2).set(1 / dst.width, 1 / dst.height);
      this.upsample.uniforms.uBlend.value = 0.5;
      c.draw(this.upsample, dst);
    }

    if (this.flare.length === 2) {
      const f0 = this.flare[0];
      this.flarePrefilter.uniforms.uSrc.value = source;
      this.flarePrefilter.uniforms.uThreshold.value = this.flareThreshold;
      this.flarePrefilter.uniforms.uClamp.value = this.flareClamp;
      (this.flarePrefilter.uniforms.uTexel.value as THREE.Vector2).set(
        1 / this.width,
        1 / this.height,
      );
      c.draw(this.flarePrefilter, f0);

      this.downsample.uniforms.uSrc.value = f0.texture;
      (this.downsample.uniforms.uTexel.value as THREE.Vector2).set(1 / f0.width, 1 / f0.height);
      c.draw(this.downsample, this.flare[1]);

      if (this.streak.length === 2) {
        // Two passes: a short blur to smooth the source, then a long
        // energy-spreading pass that produces the streak itself.
        const u = this.streakMat.uniforms;
        u.uSrc.value = f0.texture;
        u.uAttenuation.value = 0.9;
        u.uSpread.value = 0;
        (u.uDirection.value as THREE.Vector2).set(1.5 / f0.width, 0);
        c.draw(this.streakMat, this.streak[0]);

        u.uSrc.value = this.streak[0].texture;
        u.uAttenuation.value = 0.82;
        u.uSpread.value = 1;
        (u.uDirection.value as THREE.Vector2).set(this.streakReach / f0.width, 0);
        c.draw(this.streakMat, this.streak[1]);
      }
    }
  }

  /** Mip textures, exposed for the debug view. */
  get mipTextures(): THREE.Texture[] {
    return this.mips.map((m) => m.texture);
  }

  clear(): void {
    for (const m of this.mips) this.composer.clear(m, 0x000000, 0, false);
    for (const s of this.streak) this.composer.clear(s, 0x000000, 0, false);
    for (const f of this.flare) this.composer.clear(f, 0x000000, 0, false);
  }
}
