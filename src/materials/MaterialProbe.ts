/**
 * Measurement harness for the baked maps.
 *
 * Every claim about these materials that matters — how flat they are, whether
 * they tile, where their detail sits in the frequency spectrum — is a number,
 * and eyeballing a 2x2 sheet gets all three wrong. A seam a quarter of a value
 * step high is invisible on a sheet and glaring across a six-metre wall; detail
 * that looks busy at 100% is gone by the time the wall is twenty metres away.
 *
 * Reads the baked textures back off the GPU and reports:
 *  - albedo mean and standard deviation in stored sRGB 0-255, per channel and
 *    as luminance, plus B-R for palette temperature;
 *  - a seam ratio across each wrap: the mean absolute difference between the
 *    first and last row/column against the mean absolute difference between
 *    adjacent interior rows/columns. A tiling texture scores about 1.0 because
 *    the wrap is just another pair of neighbours. Anything above ~1.3 is a
 *    discontinuity a wall will show;
 *  - band energy, as the standard deviation surviving after box-averaging the
 *    albedo down to a given world footprint. This is the one that matters for
 *    viewing distance: sd at a 30 cm footprint is what is left of the surface
 *    once you are far enough away that 30 cm is a pixel.
 *
 * Two materials score badly on the seam metric and are meant to: `wood_door` is
 * a stile-and-rail layout mapped one-to-one onto a door and `foliage` is a sheet
 * of leaf cards, so both have real features on the tile edge and neither is ever
 * repeated. The metric only means something for a material that tiles.
 *
 * `fabric_canvas` is a third case, and the interesting one, because it scores
 * badly while being seamless. Its wrap lands on a thread boundary, and against
 * the thread-boundary population alone the wrap difference is 9.9 where the
 * boundaries run to a maximum of 11.1 and a 99th percentile of 10.8 — the wrap
 * is an unremarkable member of that population. It only looks bad here because
 * seven of every eight interior row pairs lie *within* a thread and are nearly
 * identical, which drags the reference distribution down. Whenever a material
 * has a lattice whose period divides the resolution, check the wrap against the
 * lattice boundaries rather than against every pair.
 *
 * Debug-only, behind '?matprobe=1'. Nothing here runs in a normal session.
 */

import * as THREE from 'three';
import type { MaterialName, TextureSet } from '../core/Interfaces';

export interface ChannelStats {
  mean: number;
  sd: number;
}

export interface BandStat {
  /** World footprint of one averaged block, in metres. */
  metres: number;
  /** Luminance standard deviation surviving at that footprint, 0-255. */
  sd: number;
}

export interface SeamStat {
  /** Wrap-edge difference over the median interior neighbour difference. */
  ratio: number;
  /** Same against the 99th percentile interior pair. <=1 means indistinguishable. */
  vsP99: number;
  /** Same, but signed: a large magnitude means the whole edge steps one way. */
  signed: number;
  /** Fraction of the edge discontinuous by more than 4x the interior median. */
  hot: number;
}

export interface MapStats {
  name: string;
  res: number;
  tile: number;
  lum: ChannelStats;
  r: ChannelStats;
  g: ChannelStats;
  b: ChannelStats;
  /** Mean blue minus mean red. Negative is warm. */
  bMinusR: number;
  seamX: SeamStat;
  seamY: SeamStat;
  bands: BandStat[];
}

const PASS_VERT = /* glsl */ `
void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

/**
 * Passthrough that recovers the *stored* bytes. An albedo target is created
 * SRGB8_ALPHA8, so the hardware linearises on any read including texelFetch;
 * re-encoding with the exact transfer function (not a 2.2 power, which is off
 * by up to two levels near black) hands back what is actually in the file.
 */
const PASS_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tSrc;
layout(location = 0) out vec4 oCol;

vec3 linToSrgbExact(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}

void main() {
  vec4 t = texelFetch(tSrc, ivec2(gl_FragCoord.xy), 0);
#ifdef ENCODE_SRGB
  t.rgb = linToSrgbExact(t.rgb);
#endif
  oCol = t;
}
`;

function stats(data: Uint8Array, stride: number, offset: number): ChannelStats {
  const n = data.length / stride;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += data[i * stride + offset];
  const mean = sum / n;
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const d = data[i * stride + offset] - mean;
    acc += d * d;
  }
  return { mean, sd: Math.sqrt(acc / n) };
}

function luminance(data: Uint8Array, res: number): Float32Array {
  const out = new Float32Array(res * res);
  for (let i = 0; i < out.length; i++) {
    const p = i * 4;
    out[i] = 0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2];
  }
  return out;
}

function lumStats(lum: Float32Array): ChannelStats {
  let sum = 0;
  for (let i = 0; i < lum.length; i++) sum += lum[i];
  const mean = sum / lum.length;
  let acc = 0;
  for (let i = 0; i < lum.length; i++) {
    const d = lum[i] - mean;
    acc += d * d;
  }
  return { mean, sd: Math.sqrt(acc / lum.length) };
}

/**
 * Mean absolute difference across the wrap, against the same measure between
 * adjacent interior lines. Expressed as a ratio so it is independent of how
 * contrasty the material is: a busy texture has large neighbour differences
 * everywhere and a large wrap difference is only meaningful relative to them.
 */
/**
 * Compares the wrap against every interior neighbour pair, not against their
 * average. Averaging is not good enough for a structured texture: a weave with
 * eight texels to the thread has a lattice boundary every eight columns, and the
 * wrap necessarily lands on one, so a legitimately seamless weave scores five
 * times the mean difference and looks like a catastrophe. What actually matters
 * is whether the wrap is *distinguishable* from an internal boundary, so the
 * reference is the 99th percentile of interior pairs. Below 1.0 the wrap is no
 * worse than the most contrasty edge already inside the tile and cannot be
 * picked out; the value against the median is kept as well because it is the
 * intuitive reading for an unstructured material.
 */
function seamRatio(lum: Float32Array, res: number, axis: 'x' | 'y'): SeamStat {
  const at = (x: number, y: number) => lum[y * res + x];
  const delta = (i: number) =>
    axis === 'x' ? at(res - 1, i) - at(0, i) : at(i, res - 1) - at(i, 0);

  let wrap = 0;
  let signed = 0;
  for (let i = 0; i < res; i++) {
    wrap += Math.abs(delta(i));
    signed += delta(i);
  }
  wrap /= res;
  signed /= res;

  const pairs = new Float64Array(res - 1);
  for (let k = 0; k < res - 1; k++) {
    let acc = 0;
    for (let i = 0; i < res; i++) {
      acc += axis === 'x' ? Math.abs(at(k + 1, i) - at(k, i)) : Math.abs(at(i, k + 1) - at(i, k));
    }
    pairs[k] = acc / res;
  }
  const sorted = Float64Array.from(pairs).sort();
  const median = sorted[sorted.length >> 1];
  const p99 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99))];

  // What fraction of the edge is badly discontinuous separates the two failure
  // modes: a gradient baked against a coordinate steps the whole edge at once,
  // while an unwrapped lattice or hash breaks only where its features cross.
  let hot = 0;
  for (let i = 0; i < res; i++) if (Math.abs(delta(i)) > 4 * median) hot++;

  return {
    ratio: wrap / Math.max(median, 1e-3),
    vsP99: wrap / Math.max(p99, 1e-3),
    signed: signed / Math.max(median, 1e-3),
    hot: hot / res,
  };
}

/** Standard deviation left after averaging the image into blocks of `block` texels. */
function blockSd(lum: Float32Array, res: number, block: number): number {
  const n = Math.max(1, Math.floor(res / block));
  const b = Math.floor(res / n);
  const out = new Float32Array(n * n);
  for (let by = 0; by < n; by++) {
    for (let bx = 0; bx < n; bx++) {
      let sum = 0;
      for (let y = 0; y < b; y++) {
        const row = (by * b + y) * res + bx * b;
        for (let x = 0; x < b; x++) sum += lum[row + x];
      }
      out[by * n + bx] = sum / (b * b);
    }
  }
  return lumStats(out).sd;
}

export class MaterialProbe {
  private renderer: THREE.WebGLRenderer;
  private mesh: THREE.Mesh;
  private camera = new THREE.Camera();
  private target?: THREE.WebGLRenderTarget;

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3),
    );
    this.mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
    this.mesh.frustumCulled = false;
  }

  /** Pulls a texture back off the GPU as stored bytes, RGBA8. */
  read(tex: THREE.Texture, res: number): Uint8Array {
    if (!this.target || this.target.width !== res) {
      this.target?.dispose();
      this.target = new THREE.WebGLRenderTarget(res, res, {
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        depthBuffer: false,
        stencilBuffer: false,
        generateMipmaps: false,
        colorSpace: THREE.NoColorSpace,
      });
    }
    const mat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      defines: tex.colorSpace === THREE.SRGBColorSpace ? { ENCODE_SRGB: true } : {},
      uniforms: { tSrc: { value: tex } },
      vertexShader: PASS_VERT,
      fragmentShader: PASS_FRAG,
      depthTest: false,
      depthWrite: false,
    });
    const r = this.renderer;
    const prev = r.getRenderTarget();
    this.mesh.material = mat;
    r.setRenderTarget(this.target);
    r.render(this.mesh, this.camera);
    const buf = new Uint8Array(res * res * 4);
    r.readRenderTargetPixels(this.target, 0, 0, res, res, buf);
    r.setRenderTarget(prev);
    mat.dispose();
    return buf;
  }

  /**
   * Full report for one material's albedo. `bandMetres` are world footprints to
   * measure surviving contrast at; the defaults bracket the band the eye uses
   * at conversational distance.
   */
  measure(
    name: MaterialName | string,
    set: TextureSet,
    tile: number,
    bandMetres = [0.05, 0.1, 0.3, 0.6, 1.2],
  ): MapStats {
    const tex = set.map as THREE.Texture;
    const img = tex.image as { width: number } | undefined;
    const res = img?.width ?? 512;
    const data = this.read(tex, res);
    const lum = luminance(data, res);

    const r = stats(data, 4, 0);
    const g = stats(data, 4, 1);
    const b = stats(data, 4, 2);

    const bands: BandStat[] = bandMetres.map((m) => {
      const block = Math.max(1, Math.round((m / tile) * res));
      return { metres: m, sd: block >= res ? 0 : blockSd(lum, res, block) };
    });

    return {
      name: String(name),
      res,
      tile,
      lum: lumStats(lum),
      r,
      g,
      b,
      bMinusR: b.mean - r.mean,
      seamX: seamRatio(lum, res, 'x'),
      seamY: seamRatio(lum, res, 'y'),
      bands,
    };
  }

  dispose(): void {
    this.target?.dispose();
    this.mesh.geometry.dispose();
  }
}

/** One-line summary, so a sweep over 33 materials is readable in a console log. */
export function formatStats(s: MapStats): string {
  const f = (v: number, d = 1) => v.toFixed(d);
  const bands = s.bands.map((b) => `${b.metres}m:${f(b.sd)}`).join(' ');
  return (
    `${s.name.padEnd(18)} L${f(s.lum.mean)} sd${f(s.lum.sd)} ` +
    `B-R${f(s.bMinusR)} seam(${f(s.seamX.ratio, 2)},${f(s.seamY.ratio, 2)}) [${bands}]`
  );
}
