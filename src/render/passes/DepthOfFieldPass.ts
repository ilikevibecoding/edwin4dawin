import * as THREE from 'three';
import type { QualitySettings } from '../../core/Quality';
import { Composer } from './Composer';
import {
  DOF_COMPOSITE_FRAG,
  DOF_FILL_FRAG,
  DOF_GATHER_FRAG,
  DOF_PREPARE_FRAG,
  DOF_TILE_DILATE_FRAG,
  DOF_TILE_FRAG,
} from '../../shaders/post/camera.glsl';

const TAPS: Record<QualitySettings['preset'], number> = {
  low: 8,
  medium: 12,
  high: 16,
  ultra: 24,
  cinematic: 32,
};

/** Height of a full-frame sensor, in metres; sets the focal-length scale. */
const SENSOR_HEIGHT = 0.024;

/**
 * Tile edge for the max-CoC reduction, in half-resolution texels. The dilate
 * that follows is 3x3, so one step reaches a whole tile — which has to cover the
 * largest half-resolution CoC the prepass can produce, `maxCoc / 2`.
 */
const TILE = 8;

/**
 * Default focus distance, in metres.
 *
 * Four metres is not arbitrary. The near and far blur either side of focus are
 * worst at 2 m and at infinity respectively, and for a focus at F those come to
 * `k*(F-2)/2F` and `k/F` for the same CoC scale `k`; they are equal at F = 4.
 * Any nearer and the background softens, any further and the ground in front of
 * the player does. Four metres is the one distance that spends the whole error
 * budget on neither.
 */
const DEFAULT_FOCUS = 4;

/**
 * Default f-number. Deep enough to be near-pinhole at `DOF_SCALE`, and a real
 * stop rather than a magic number: f/22 is what a photographer picks when they
 * want the entire frame sharp, which is exactly the gameplay requirement.
 */
const DEFAULT_APERTURE = 22;

export class DepthOfFieldPass {
  /** Focus distance in metres. */
  focus = DEFAULT_FOCUS;
  /** f-number. Smaller is a shallower depth of field. */
  aperture = DEFAULT_APERTURE;
  /**
   * Multiplier on the physically derived circle of confusion.
   *
   * A 14 mm lens at f/4 — which is what an 80-degree FPS camera is — has a depth
   * of field that stretches from arm's length to infinity, so its physical CoC
   * is literally sub-pixel and an unexaggerated thin-lens model produces no
   * visible defocus at any aperture. Every engine that offers cinematic DOF on a
   * game camera therefore carries a factor like this one; the honest way to use
   * it is to fix it and let the f-number stay the caller's knob, so the aperture
   * still means what it says relative to everything else.
   *
   * Chosen so that the two ends of the usable stop range land where they should
   * at 900p: f/22 gives a CoC of half a pixel at infinity, below the one-pixel
   * floor the composite ramps in from, and f/1.4 gives about eight, which is an
   * unmistakably shallow frame. Wide open at the f/0.7 clamp it saturates
   * `maxCocFraction`.
   */
  scale = 5.6;
  /**
   * Ceiling on the blur radius, as a fraction of frame height. The CoC itself is
   * derived in pixels and so grows with resolution; a ceiling in fixed pixels
   * would therefore clip a third of the range at 1080p that it left untouched at
   * 540p, and the depth of field would visibly shrink as the window grew.
   */
  maxCocFraction = 0.022;
  /** Resolved ceiling on the blur radius, in full-resolution pixels. */
  private maxCoc = 14;

  /** Restores the near-pinhole gameplay default. */
  resetFocus(): void {
    this.focus = DEFAULT_FOCUS;
    this.aperture = DEFAULT_APERTURE;
  }

  private composer: Composer;
  private prepare: THREE.ShaderMaterial;
  private tile: THREE.ShaderMaterial;
  private dilate: THREE.ShaderMaterial;
  private gather: THREE.ShaderMaterial | null = null;
  private fill: THREE.ShaderMaterial;
  private composite: THREE.ShaderMaterial;

  private half: THREE.WebGLRenderTarget | null = null;
  private tiles: THREE.WebGLRenderTarget | null = null;
  private tilesDilated: THREE.WebGLRenderTarget | null = null;
  private fields: THREE.WebGLRenderTarget | null = null;
  private filled: THREE.WebGLRenderTarget | null = null;
  private width = 1;
  private height = 1;
  private taps = 16;
  private focalLength = 0.014;
  private tileScale = new THREE.Vector2(1, 1);

  constructor(composer: Composer) {
    this.composer = composer;

    this.prepare = composer.material(DOF_PREPARE_FRAG, {
      uColor: { value: null },
      uDepth: { value: null },
      uTexel: { value: new THREE.Vector2() },
      uNearFar: { value: new THREE.Vector2() },
      uFocus: { value: DEFAULT_FOCUS },
      uFocalLength: { value: 0.014 },
      uCocScale: { value: 1 },
      uMaxCoc: { value: 14 },
    });

    this.tile = composer.material(DOF_TILE_FRAG, {
      uSource: { value: null },
      uTexel: { value: new THREE.Vector2() },
    });

    this.dilate = composer.material(DOF_TILE_DILATE_FRAG, {
      uSource: { value: null },
      uTexel: { value: new THREE.Vector2() },
    });

    this.fill = composer.material(DOF_FILL_FRAG, {
      uFar: { value: null },
      uNear: { value: null },
      uSource: { value: null },
      uTile: { value: null },
      uTexel: { value: new THREE.Vector2() },
      uTileScale: { value: new THREE.Vector2(1, 1) },
      uFrame: { value: 0 },
      uSpacing: { value: 0.22 },
    });

    this.composite = composer.material(DOF_COMPOSITE_FRAG, {
      uColor: { value: null },
      uFar: { value: null },
      uNear: { value: null },
      uDepth: { value: null },
      uNearFar: { value: new THREE.Vector2() },
      uFocus: { value: DEFAULT_FOCUS },
      uFocalLength: { value: 0.014 },
      uCocScale: { value: 1 },
      uMaxCoc: { value: 14 },
    });
  }

  get nearTexture(): THREE.Texture | null {
    return this.filled ? this.filled.textures[1] : null;
  }

  get cocTexture(): THREE.Texture | null {
    return this.half ? this.half.texture : null;
  }

  configure(quality: QualitySettings): void {
    const taps = TAPS[quality.preset] ?? 16;
    if (taps === this.taps && this.gather) return;
    this.taps = taps;
    const previous = this.gather;
    this.gather = this.composer.material(
      DOF_GATHER_FRAG,
      {
        uSource: { value: null },
        uTile: { value: null },
        uTexel: { value: new THREE.Vector2() },
        uTileScale: { value: new THREE.Vector2(1, 1) },
        uFrame: { value: 0 },
        uMaxCoc: { value: 14 },
      },
      { TAPS: taps },
    );
    previous?.dispose();
    // Half the mean spacing of `taps` points spread over a disc.
    this.fill.uniforms.uSpacing.value = 0.5 * Math.sqrt(Math.PI / taps);
  }

  resize(width: number, height: number): void {
    this.width = Math.max(1, width >> 1);
    this.height = Math.max(1, height >> 1);
    // Capped at 2 * TILE * DILATE_RADIUS so the tile dilate can still reach it.
    this.maxCoc = Math.min(Math.max(height * this.maxCocFraction, 6), 4 * TILE);
    const c = this.composer;
    for (const t of [this.half, this.tiles, this.tilesDilated, this.fields, this.filled]) {
      c.destroyTarget(t);
    }
    this.half = c.createTarget(this.width, this.height);
    this.fields = c.createTarget(this.width, this.height, { count: 2 });
    this.filled = c.createTarget(this.width, this.height, { count: 2 });

    // Tiles are sampled bilinearly so the gather radius varies smoothly instead
    // of stepping at tile boundaries, which would print the tile grid into the
    // near field wherever a silhouette crosses one.
    const tw = Math.max(1, Math.ceil(this.width / TILE));
    const th = Math.max(1, Math.ceil(this.height / TILE));
    this.tiles = c.createTarget(tw, th, { format: THREE.RGFormat });
    this.tilesDilated = c.createTarget(tw, th, { format: THREE.RGFormat });
    this.tileScale.set(this.width / (tw * TILE), this.height / (th * TILE));
  }

  /** Recomputes focal length; call whenever the camera's FOV changes. */
  setCamera(camera: THREE.PerspectiveCamera): void {
    const fov = (camera.fov * Math.PI) / 180;
    this.focalLength = (0.5 * SENSOR_HEIGHT) / Math.tan(fov * 0.5);
  }

  render(
    target: THREE.WebGLRenderTarget,
    color: THREE.Texture,
    depth: THREE.Texture,
    camera: THREE.PerspectiveCamera,
    fullHeight: number,
    frame: number,
  ): void {
    if (!this.half || !this.fields || !this.filled || !this.gather) return;
    if (!this.tiles || !this.tilesDilated) return;
    const c = this.composer;
    this.setCamera(camera);

    // Aperture diameter over sensor height, in full-resolution pixels: the
    // CoC-in-pixels scale factor for the thin-lens relation.
    const cocScale =
      ((this.focalLength / Math.max(this.aperture, 0.7)) * this.focalLength) /
      SENSOR_HEIGHT *
      fullHeight *
      this.scale;
    const focus = Math.max(this.focus, this.focalLength * 2);

    // The gather works in half-resolution texels, so the CoC it reads has to be
    // in the same units or the blur radius and the coverage test disagree by 2x.
    const p = this.prepare.uniforms;
    p.uColor.value = color;
    p.uDepth.value = depth;
    (p.uTexel.value as THREE.Vector2).set(1 / this.width, 1 / this.height);
    (p.uNearFar.value as THREE.Vector2).set(camera.near, camera.far);
    p.uFocus.value = focus;
    p.uFocalLength.value = this.focalLength;
    p.uCocScale.value = cocScale * 0.5;
    p.uMaxCoc.value = this.maxCoc * 0.5;
    c.draw(this.prepare, this.half);

    const t = this.tile.uniforms;
    t.uSource.value = this.half.texture;
    (t.uTexel.value as THREE.Vector2).set(1 / this.width, 1 / this.height);
    c.draw(this.tile, this.tiles);

    const d = this.dilate.uniforms;
    d.uSource.value = this.tiles.texture;
    (d.uTexel.value as THREE.Vector2).set(1 / this.tiles.width, 1 / this.tiles.height);
    c.draw(this.dilate, this.tilesDilated);

    const g = this.gather.uniforms;
    g.uSource.value = this.half.texture;
    g.uTile.value = this.tilesDilated.texture;
    (g.uTexel.value as THREE.Vector2).set(1 / this.width, 1 / this.height);
    (g.uTileScale.value as THREE.Vector2).copy(this.tileScale);
    g.uFrame.value = frame;
    g.uMaxCoc.value = this.maxCoc * 0.5;
    c.draw(this.gather, this.fields);

    const f = this.fill.uniforms;
    f.uFar.value = this.fields.textures[0];
    f.uNear.value = this.fields.textures[1];
    f.uSource.value = this.half.texture;
    f.uTile.value = this.tilesDilated.texture;
    (f.uTexel.value as THREE.Vector2).set(1 / this.width, 1 / this.height);
    (f.uTileScale.value as THREE.Vector2).copy(this.tileScale);
    f.uFrame.value = frame;
    c.draw(this.fill, this.filled);

    const o = this.composite.uniforms;
    o.uColor.value = color;
    o.uFar.value = this.filled.textures[0];
    o.uNear.value = this.filled.textures[1];
    o.uDepth.value = depth;
    (o.uNearFar.value as THREE.Vector2).set(camera.near, camera.far);
    o.uFocus.value = focus;
    o.uFocalLength.value = this.focalLength;
    o.uCocScale.value = cocScale;
    o.uMaxCoc.value = this.maxCoc;
    c.draw(this.composite, target);
  }
}
