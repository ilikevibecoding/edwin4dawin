import * as THREE from 'three';
import type { BridgeSpec, RoadClass, Vec2, WorldMap } from './map';
import type { RoadSegment } from './roads';
import { clamp, lerp } from '../core/noise';
import { GLSL_NOISE } from '../render/shaders/common.glsl';
import { F_BARRIER_H, F_BARRIER_PROFILE, GLSL_AA_LINE, MIN_WIDTH_VERT, STEEL_ALPHA_FRAG, Soup, lampGlowFor, type Frame, type Rgb } from './bridges';
import { ALL_CASCADES, MAX_CASCADES, ViewCull, cascadeIsFine, layerMask, maskCasts, type CasterClass } from './culling';

/**
 * Furniture of the ground highways (`highway` / `causeway` road classes): the concrete median barrier, W-beam
 * guardrail where the shoulder drops to water or low ground and on the approaches to every causeway, delineator
 * posts and barrier reflectors, median-mounted twin-arm lighting, sign gantries and guide signs before the
 * causeways and the arterial junctions, chevrons on the sharp bend, speed signs and drainage inlets.
 *
 * Everything sits on the road surface exactly as roads.ts builds it (same rows, same mitred edges), is baked into
 * three vertex-coloured meshes per ~1 km chunk (concrete, thin steel, signs) and culled / cascade-routed per
 * frame like the bridge chunks. Thin members carry their axis so they keep a screen-space minimum width instead
 * of dissolving from altitude (see bridges.ts MIN_WIDTH_VERT); the steel mesh drops its posts at POST_DISTANCE,
 * its rails and poles at THIN_DISTANCE and keeps only the lit lamp heads to HEAD_DISTANCE.
 */

export interface HighwayBuild {
  group: THREE.Group;
  counts: { chains: number; chunks: number; meshes: number; poles: number; gantries: number; guardrailM: number; barrierM: number; vergeM: number; signs: number; triangles: number };
}

// ------------------------------------------------------------------ constants

/** roads.ts: row spacing along a segment and the pavement's height over the terrain */
const ROAD_STEP = 15;
const ROAD_LIFT = 0.15;
const CHUNK_LEN = 1000;
/** LOD cut-offs (horizontal distance from the nearest camera to the chunk) */
const POST_DISTANCE = 1500;
const THIN_DISTANCE = 2500;
const SIGN_DISTANCE = 4000;
const HEAD_DISTANCE = 5000;
/** peak radiance of the lamp heads at night (matches the bridge lamps) */
const LAMP_GLOW = 6.0;
/** F-shape concrete median barrier (bridges.ts profile: 81 cm tall, 61 cm base) */
const BARRIER_H = F_BARRIER_H;
const BARRIER_PROFILE = F_BARRIER_PROFILE;
/** W-beam guardrail: rail 55-86 cm over the pavement, posts every 1.905 m */
const RAIL_PROFILE: readonly [number, number][] = [[0.0, 0.55], [0.085, 0.625], [0.0, 0.705], [0.085, 0.785], [0.0, 0.86], [-0.03, 0.86], [-0.03, 0.55], [0.0, 0.55]];
const POST_SPACING = 1.905;
/** median lighting: twin-arm cobra heads 12 m over the pavement every 60 m (barrier-mounted poles) */
const POLE_SPACING = 60;
const POLE_H = 11.4;
const ARM_REACH = 2.9;
/** verge beside the pavement edge: a gravel band along the pavement, mown grass (sand on the beaches) beyond */
const VERGE_W = 5.0;
const VERGE_GRAVEL_W = 0.7;
const _n = new THREE.Vector3(), _d = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3();

// ------------------------------------------------------------------ colours (multiply the material colour)

const C_BARRIER: Rgb = [0.86, 0.86, 0.84];
const C_BARRIER_TOP: Rgb = [0.93, 0.93, 0.91];
const C_PEDESTAL: Rgb = [0.72, 0.72, 0.70];
const C_APRON: Rgb = [0.62, 0.62, 0.60];
const C_GRATE: Rgb = [0.16, 0.16, 0.17];
const C_VERGE_GRASS: Rgb = [0.40, 0.54, 0.24];   // mown verge: fresher than the dry ground around
const C_VERGE_SAND: Rgb = [0.74, 0.66, 0.52];    // packed sand and shell where the highway crosses the beaches
const S_GALV: Rgb = [0.56, 0.58, 0.60];       // galvanised guardrail, posts, gantry steel (satin, blotchy in the shader)
const S_POLE: Rgb = [0.46, 0.47, 0.49];       // weathered galvanised lighting columns (read against the pale pavement from the air)
const S_DARK: Rgb = [0.30, 0.31, 0.33];       // sign backs, brackets
const S_HEAD: Rgb = [0.90, 0.88, 0.82];       // cobra-head luminaire
const S_WHITE: Rgb = [0.92, 0.92, 0.90];      // delineator posts
const S_AMBER: Rgb = [1.0, 0.72, 0.18];       // reflectors facing traffic
const S_DRUM: Rgb = [0.95, 0.72, 0.12];
const S_FACE: Rgb = [1, 1, 1];                // sign faces (the atlas carries the colour)
const S_YELLOW: Rgb = [0.95, 0.78, 0.10];     // chevron panel backs
const S_WOOD: Rgb = [0.42, 0.34, 0.25];       // guardrail posts on the sandy approaches

// ------------------------------------------------------------------ materials

/** Concrete of the barriers, pedestals and inlets: `aInfo` = (kind, metres along, height above the base) drives
 *  the barrier's section joints, tyre scuffs and spray grime; `aAxis` gives the barrier its minimum screen width. */
const CONCRETE_FRAG = /* glsl */ `
{
  float kind = vInfoH.x;
  float n = fbm3(vWorldPosH.xz * 0.45);
  if (kind > 0.5 && kind < 1.5) {
    float along = vInfoH.y;
    float h = vInfoH.z;
    float fwA = max(fwidth(along), 1e-4);
    // precast sections of 6.1 m: a dark joint line, chamfered, that fades to its mean once a pixel spans metres
    float jf = fract(along / 6.1);
    float joint = mix(aaLine((jf - 0.5) * 6.1, 0.018, fwA), 0.006, smoothstep(0.8, 2.5, fwA));
    diffuseColor.rgb *= 1.0 - 0.45 * joint;
    // each section was poured from a slightly different batch
    diffuseColor.rgb *= 0.96 + 0.08 * hash11(floor(along / 6.1) + 3.0);
    // tyre scuffs: black rubber smears 20-60 cm up the faces, in runs where traffic has brushed the barrier
    float scuffRun = smoothstep(0.42, 0.62, fbm3(vec2(along * 0.045, 7.0)));
    float scuff = smoothstep(0.12, 0.28, h) * (1.0 - smoothstep(0.48, 0.7, h)) * scuffRun * (0.45 + 0.55 * fbm3(vec2(along * 0.6, h * 3.0)));
    diffuseColor.rgb *= 1.0 - 0.4 * scuff;
    // road spray grime along the base, a paler cap, and weathering blotches
    diffuseColor.rgb *= 1.0 - 0.28 * (1.0 - smoothstep(0.02, 0.22, h)) * (0.6 + 0.4 * n);
    diffuseColor.rgb *= 1.0 + 0.06 * smoothstep(0.72, 0.81, h);
    diffuseColor.rgb *= 0.92 + 0.16 * n;
    roughnessFactor = 0.86 - 0.1 * scuff;
  } else if (kind > 1.5 && kind < 2.5) {
    // cast-iron inlet grate: bars across the flow (0.9 m grate, 8 slots)
    float u = vInfoH.y;
    float fwU = max(fwidth(u), 1e-4);
    float bar = mix(aaLine((fract(u * 8.0) - 0.5) / 8.0, 0.035, fwU), 0.55, smoothstep(0.02, 0.06, fwU));
    diffuseColor.rgb *= 0.55 + 0.9 * bar;
    roughnessFactor = 0.7;
  } else if (kind > 2.5 && kind < 3.5) {
    // verge: a dark gravel band along the pavement edge (ragged where the cover takes over), then the cover the
    // vertex colour names (mown grass, or sand on the beaches); the grain fades to its mean as a pixel grows past it
    float across = vInfoH.z;
    float fp = length(fwidth(vWorldPosH.xz));
    float grain = mix(vnoise(vWorldPosH.xz * 2.6), 0.5, smoothstep(0.2, 0.7, fp));
    float bandW = ${(VERGE_GRAVEL_W / VERGE_W).toFixed(3)};
    float band = 1.0 - smoothstep(bandW - 0.05, bandW + 0.08 + 0.14 * fbm3(vWorldPosH.xz * 0.9), across);
    vec3 gravel = vec3(0.36, 0.345, 0.31) * (0.84 + 0.32 * grain);
    vec3 cover = diffuseColor.rgb * (0.86 + 0.28 * n) * (0.92 + 0.16 * grain);
    diffuseColor.rgb = mix(cover, gravel, band);
    roughnessFactor = 0.97;
  } else {
    diffuseColor.rgb *= 0.9 + 0.2 * n;
    // run-off streaks down the pedestals
    diffuseColor.rgb *= 1.0 - 0.12 * smoothstep(0.55, 0.8, fbm3(vec2(vWorldPosH.x + vWorldPosH.z, vWorldPosH.y * 0.3) * 0.9));
  }
}
`;

function createConcreteMaterial(pixelScale: THREE.IUniform<number>): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color: 0xb8b4aa, roughness: 0.9, metalness: 0.0, vertexColors: true, transparent: true, depthWrite: true });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uPixelScale = pixelScale;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aAxis; attribute vec3 aInfo; varying vec3 vInfoH; varying float vCover; varying vec3 vWorldPosH; uniform float uPixelScale;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvInfoH = aInfo;\n${MIN_WIDTH_VERT}\nvWorldPosH = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vInfoH; varying float vCover; varying vec3 vWorldPosH;\n${GLSL_NOISE}\n${GLSL_AA_LINE}`)
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= vCover;')
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${CONCRETE_FRAG}`);
  };
  mat.customProgramCacheKey = () => 'highway-concrete-v1';
  return mat;
}

/** Galvanised steel + sign faces: vertex-coloured satin metal whose albedo and roughness are blotched by the
 *  zinc spangle; `aGlow` marks the lamp heads (full) and the lit sign faces (faint); `uv` addresses the sign
 *  atlas (0,0 is a white texel, so plain steel is unaffected by the map). */
function createSteelMaterial(pixelScale: THREE.IUniform<number>, atlas: THREE.Texture): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.55, vertexColors: true, map: atlas, emissive: new THREE.Color(1.0, 0.8, 0.52), emissiveIntensity: 0, transparent: true, depthWrite: true });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uPixelScale = pixelScale;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aGlow; attribute vec4 aAxis; varying float vGlow; varying float vCover; varying vec3 vWorldPosH; uniform float uPixelScale;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvGlow = aGlow;\n${MIN_WIDTH_VERT}\nvWorldPosH = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying float vGlow; varying float vCover; varying vec3 vWorldPosH;\n${GLSL_NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${STEEL_ALPHA_FRAG}\nfloat spangle = fbm3(vWorldPosH.xz * 1.9 + vWorldPosH.y * 1.3);\nfloat plainSteel = 1.0 - step(0.001, vMapUv.x + vMapUv.y);\ndiffuseColor.rgb *= 1.0 + plainSteel * (0.24 * spangle - 0.12);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + plainSteel * 0.3 * (spangle - 0.5), 0.25, 1.0);\nroughnessFactor = mix(roughnessFactor, 0.45, 1.0 - plainSteel);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor *= plainSteel;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= vGlow;');
  };
  mat.customProgramCacheKey = () => 'highway-steel-v1';
  return mat;
}

// ------------------------------------------------------------------ sign atlas

interface SignFace { u0: number; v0: number; u1: number; v1: number; }
type Arrow = 'up' | 'left' | 'right' | 'both' | null;

/** Canvas atlas of the sign faces (guide signs, exit tabs, chevrons, speed limits), packed on demand; the
 *  bottom-left corner stays white for the plain steel. Destinations are the districts and islands of Bahía Vista. */
class SignAtlas {
  readonly width = 2048;
  readonly height = 1024;
  readonly canvas: HTMLCanvasElement;
  readonly texture: THREE.CanvasTexture;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly cache = new Map<string, SignFace>();
  private x = 0; private y = 0; private rowH = 0;
  /** fraction of the atlas rows in use (for the build counts) */
  get used(): number { return (this.y + this.rowH) / this.height; }

  constructor() {
    const c = document.createElement('canvas');
    c.width = this.width; c.height = this.height;
    this.canvas = c;
    this.ctx = c.getContext('2d')!;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.texture = new THREE.CanvasTexture(c);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;
    this.texture.generateMipmaps = true;
    this.texture.minFilter = THREE.LinearMipmapLinearFilter;
  }

  private alloc(w: number, h: number): [number, number] {
    const gutter = 6;
    if (this.x + w + gutter > this.width) { this.x = 0; this.y += this.rowH + gutter; this.rowH = 0; }
    // the last 48 rows stay white (uv 0,0 of the plain steel)
    if (this.y + h > this.height - 48) throw new Error('sign atlas full');
    const at: [number, number] = [this.x, this.y];
    this.x += w + gutter;
    this.rowH = Math.max(this.rowH, h);
    return at;
  }

  private face(x: number, y: number, w: number, h: number): SignFace {
    // inset a texel so the bilinear lookup never bleeds the neighbour
    return { u0: (x + 1) / this.width, v0: 1 - (y + h - 1) / this.height, u1: (x + w - 1) / this.width, v1: 1 - (y + 1) / this.height };
  }

  private arrow(cx: number, cy: number, size: number, dir: 'up' | 'left' | 'right', color: string): void {
    const c = this.ctx;
    c.save();
    c.translate(cx, cy);
    if (dir === 'left') c.rotate(-Math.PI / 2); else if (dir === 'right') c.rotate(Math.PI / 2);
    c.strokeStyle = color; c.fillStyle = color; c.lineWidth = size * 0.16; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, size * 0.5); c.lineTo(0, -size * 0.2); c.stroke();
    c.beginPath(); c.moveTo(-size * 0.36, -size * 0.05); c.lineTo(0, -size * 0.5); c.lineTo(size * 0.36, -size * 0.05); c.closePath(); c.fill();
    c.restore();
  }

  private text(s: string, x: number, y: number, px: number, color: string, align: CanvasTextAlign = 'left', weight = 'bold'): void {
    const c = this.ctx;
    c.fillStyle = color;
    c.font = `${weight} ${px}px "DejaVu Sans", "Liberation Sans", Arial, sans-serif`;
    c.textAlign = align; c.textBaseline = 'middle';
    c.fillText(s, x, y);
  }

  /** Guide sign: green panel with a white border, up to two destination lines and an arrow. `w`/`h` in px. */
  guide(lines: string[], arrow: Arrow, w = 320, h = 176, color = '#0b6b3f'): SignFace {
    const key = `g|${lines.join('|')}|${arrow}|${w}x${h}|${color}`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    const [x, y] = this.alloc(w, h);
    const c = this.ctx;
    c.fillStyle = color; c.fillRect(x, y, w, h);
    c.strokeStyle = '#f4f4f0'; c.lineWidth = Math.max(2, h * 0.02);
    c.strokeRect(x + h * 0.035, y + h * 0.035, w - h * 0.07, h - h * 0.07);
    const textW = arrow ? w - h * 0.62 : w;
    const px0 = lines.length > 1 ? h * 0.34 : h * 0.42;
    for (let i = 0; i < lines.length; i++) {
      const px = i === 0 ? px0 : px0 * 0.8;
      const ly = lines.length > 1 ? y + h * (0.32 + 0.38 * i) : y + h * 0.5;
      // shrink to fit
      c.font = `bold ${px}px "DejaVu Sans", "Liberation Sans", Arial, sans-serif`;
      const fit = Math.min(px, (px * (textW - h * 0.25)) / Math.max(1, c.measureText(lines[i]).width));
      this.text(lines[i], x + h * 0.12, ly, fit, '#f6f6f2');
    }
    if (arrow === 'both') { this.arrow(x + w - h * 0.5, y + h * 0.5, h * 0.4, 'left', '#f6f6f2'); this.arrow(x + w - h * 0.2, y + h * 0.5, h * 0.4, 'right', '#f6f6f2'); }
    else if (arrow) this.arrow(x + w - h * 0.33, y + h * 0.5, h * 0.5, arrow, '#f6f6f2');
    const f = this.face(x, y, w, h);
    this.cache.set(key, f);
    return f;
  }

  /** Small white tab over a guide sign ("CAUSEWAY 1 KM"), green text. */
  tab(label: string, w = 176, h = 56): SignFace {
    const key = `t|${label}`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    const [x, y] = this.alloc(w, h);
    const c = this.ctx;
    c.fillStyle = '#0b6b3f'; c.fillRect(x, y, w, h);
    c.strokeStyle = '#f4f4f0'; c.lineWidth = 2; c.strokeRect(x + 3, y + 3, w - 6, h - 6);
    this.text(label, x + w / 2, y + h / 2, h * 0.5, '#f6f6f2', 'center');
    const f = this.face(x, y, w, h);
    this.cache.set(key, f);
    return f;
  }

  chevron(): SignFace {
    const key = 'chevron';
    const hit = this.cache.get(key);
    if (hit) return hit;
    const w = 96, h = 120;
    const [x, y] = this.alloc(w, h);
    const c = this.ctx;
    c.fillStyle = '#f2c11a'; c.fillRect(x, y, w, h);
    c.strokeStyle = '#111'; c.lineWidth = 4; c.strokeRect(x + 4, y + 4, w - 8, h - 8);
    c.fillStyle = '#111';
    c.beginPath();
    c.moveTo(x + w * 0.2, y + h * 0.18); c.lineTo(x + w * 0.5, y + h * 0.18); c.lineTo(x + w * 0.82, y + h * 0.5); c.lineTo(x + w * 0.5, y + h * 0.82); c.lineTo(x + w * 0.2, y + h * 0.82); c.lineTo(x + w * 0.52, y + h * 0.5); c.closePath();
    c.fill();
    const f = this.face(x, y, w, h);
    this.cache.set(key, f);
    return f;
  }

  /** Round speed limit (km/h): white disc, red ring, black figure; the corners of the square face take the tone of
   *  the panel back so the sign reads as a disc. */
  speed(limit: string): SignFace {
    const key = `speed|${limit}`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    const w = 112, h = 112;
    const [x, y] = this.alloc(w, h);
    const c = this.ctx;
    c.fillStyle = '#4a4c50'; c.fillRect(x, y, w, h);
    c.beginPath(); c.arc(x + w / 2, y + h / 2, w * 0.47, 0, Math.PI * 2); c.fillStyle = '#d0281e'; c.fill();
    c.beginPath(); c.arc(x + w / 2, y + h / 2, w * 0.36, 0, Math.PI * 2); c.fillStyle = '#f6f6f2'; c.fill();
    this.text(limit, x + w / 2, y + h * 0.52, 46, '#111', 'center');
    const f = this.face(x, y, w, h);
    this.cache.set(key, f);
    return f;
  }
}

// ------------------------------------------------------------------ chains (the road surface as roads.ts builds it)

interface Row { hL: number; hR: number; }
interface Chain {
  id: string;
  cls: RoadClass;
  pts: Vec2[];
  hw: number;
  lanes: number;
  dirs: Vec2[];
  /** mitred cross vector per vertex (roads.ts): the pavement edge is at `p + cross * hw` */
  cross: Vec2[];
  segLen: number[];
  cum: number[];
  total: number;
  /** road rows per segment (heights of the left / right pavement edge at each row) */
  rows: { steps: number; row: Row[] }[];
  bridgeStart: BridgeSpec | null;
  bridgeEnd: BridgeSpec | null;
}

/** a road meeting the chain: station, whether it is an arterial / highway, and the side (+1 = toward +cross, i.e.
 *  the right of the chain's forward direction) it leaves toward (0 when it crosses) */
interface Junction { s: number; major: boolean; side: -1 | 0 | 1; }

function buildChains(map: WorldMap, segments: RoadSegment[]): Chain[] {
  const chains: RoadSegment[][] = [];
  for (const s of segments) {
    if (s.cls !== 'highway' && s.cls !== 'causeway') continue;
    if (Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]) < 1) continue;
    const last = chains[chains.length - 1];
    const prev = last && last[last.length - 1];
    if (prev && prev.cls === s.cls && prev.width === s.width && prev.lift === s.lift && prev.b[0] === s.a[0] && prev.b[1] === s.a[1]) last.push(s);
    else chains.push([s]);
  }
  const out: Chain[] = [];
  for (const chain of chains) {
    const pts: Vec2[] = [chain[0].a, ...chain.map((s) => s.b)];
    const m = pts.length;
    const dirs: Vec2[] = [], segLen: number[] = [], cum: number[] = [0];
    for (let i = 0; i < m - 1; i++) {
      const dx = pts[i + 1][0] - pts[i][0], dz = pts[i + 1][1] - pts[i][1];
      const len = Math.hypot(dx, dz);
      dirs.push([dx / len, dz / len]); segLen.push(len); cum.push(cum[i] + len);
    }
    const cross: Vec2[] = [];
    for (let i = 0; i < m; i++) {
      const d0 = dirs[Math.max(0, i - 1)], d1 = dirs[Math.min(m - 2, i)];
      let nx = -(d0[1] + d1[1]), nz = d0[0] + d1[0];
      const nl = Math.hypot(nx, nz) || 1;
      nx /= nl; nz /= nl;
      const cosHalf = Math.max(0.5, nx * -d1[1] + nz * d1[0]);
      cross.push([nx / cosHalf, nz / cosHalf]);
    }
    const hw = chain[0].width * 0.5;
    const rows: Chain['rows'] = [];
    for (let i = 0; i < m - 1; i++) {
      const steps = Math.max(1, Math.ceil(segLen[i] / ROAD_STEP));
      const row: Row[] = [];
      for (let k = 0; k <= steps; k++) {
        const t = k / steps;
        const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, z = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t;
        const cx = cross[i][0] + (cross[i + 1][0] - cross[i][0]) * t, cz = cross[i][1] + (cross[i + 1][1] - cross[i][1]) * t;
        row.push({ hL: map.heightAt(x - cx * hw, z - cz * hw) + ROAD_LIFT, hR: map.heightAt(x + cx * hw, z + cz * hw) + ROAD_LIFT });
      }
      rows.push({ steps, row });
    }
    const near = (p: Vec2, q: Vec2) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 6;
    const bridgeAt = (p: Vec2) => map.bridges.find((b) => near(b.pts[0], p) || near(b.pts[b.pts.length - 1], p)) ?? null;
    const first = chain[0];
    const id = map.roads.find((r) => r.pts[0][0] === first.a[0] && r.pts[0][1] === first.a[1] && r.cls === first.cls)?.id ?? `hwy-${out.length}`;
    out.push({ id, cls: first.cls, pts, hw, lanes: first.lanes, dirs, cross, segLen, cum, total: cum[m - 1], rows, bridgeStart: bridgeAt(pts[0]), bridgeEnd: bridgeAt(pts[m - 1]) });
  }
  return out;
}

function locate(c: Chain, s: number): { i: number; t: number } {
  s = clamp(s, 0, c.total);
  let i = 0;
  while (i < c.segLen.length - 1 && s > c.cum[i + 1]) i++;
  return { i, t: clamp((s - c.cum[i]) / Math.max(c.segLen[i], 1e-6), 0, 1) };
}

/** Height of the pavement at `s` along and `a` across (in units of the mitred cross vector; `a = ±hw` is the
 *  pavement edge), interpolated over the same rows roads.ts triangulates. */
function surfaceAt(c: Chain, s: number, a: number): number {
  const { i, t } = locate(c, s);
  const r = c.rows[i];
  const u = t * r.steps;
  const k = Math.min(r.steps - 1, Math.floor(u)), f = u - k;
  const hL = lerp(r.row[k].hL, r.row[k + 1].hL, f), hR = lerp(r.row[k].hR, r.row[k + 1].hR, f);
  return lerp(hL, hR, clamp((a / c.hw + 1) * 0.5, 0, 1));
}

function frameAt(c: Chain, s: number): Frame {
  const { i, t } = locate(c, s);
  const a = c.pts[i], b = c.pts[i + 1];
  const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
  const rx = c.cross[i][0] + (c.cross[i + 1][0] - c.cross[i][0]) * t, rz = c.cross[i][1] + (c.cross[i + 1][1] - c.cross[i][1]) * t;
  return { x, y: surfaceAt(c, s, 0), z, rx, rz, dx: c.dirs[i][0], dz: c.dirs[i][1], s };
}

/** World position `a` across the pavement at `s`, on the surface plus `up`. */
function at(c: Chain, s: number, a: number, up = 0): THREE.Vector3 {
  const f = frameAt(c, s);
  return new THREE.Vector3(f.x + f.rx * a, surfaceAt(c, s, a) + up, f.z + f.rz * a);
}

/** Every road row between s0 and s1 plus the two ends (so lofts follow the pavement exactly). */
function stations(c: Chain, s0: number, s1: number): number[] {
  const out = [s0];
  for (let i = 0; i < c.segLen.length; i++) {
    const r = c.rows[i];
    for (let k = 1; k < r.steps; k++) {
      const s = c.cum[i] + (c.segLen[i] * k) / r.steps;
      if (s > s0 + 0.05 && s < s1 - 0.05) out.push(s);
    }
    // the polyline vertices themselves (the mitre changes direction there)
    const sv = c.cum[i + 1];
    if (sv > s0 + 0.05 && sv < s1 - 0.05) out.push(sv);
  }
  out.push(s1);
  return out.sort((p, q) => p - q);
}

/** Stations of other roads meeting the chain: segment crossings and end points on the pavement. */
function findJunctions(c: Chain, segments: RoadSegment[]): Junction[] {
  const js: Junction[] = [];
  const own = new Set<RoadSegment>();
  for (const s of segments) if (s.cls === c.cls && c.pts.some((p) => p[0] === s.a[0] && p[1] === s.a[1]) && c.pts.some((p) => p[0] === s.b[0] && p[1] === s.b[1])) own.add(s);
  for (const s of segments) {
    if (own.has(s) || s.cls === 'runway' || s.cls === 'taxiway') continue;
    const major = s.cls === 'arterial' || s.cls === 'highway' || s.cls === 'causeway';
    for (let i = 0; i < c.segLen.length; i++) {
      const [ax, az] = c.pts[i], [bx, bz] = c.pts[i + 1];
      // crossing
      const r = [bx - ax, bz - az], q = [s.b[0] - s.a[0], s.b[1] - s.a[1]];
      const den = r[0] * q[1] - r[1] * q[0];
      if (Math.abs(den) > 1e-9) {
        const dx = s.a[0] - ax, dz = s.a[1] - az;
        const t = (dx * q[1] - dz * q[0]) / den, u = (dx * r[1] - dz * r[0]) / den;
        if (t > -0.001 && t < 1.001 && u > -0.001 && u < 1.001) {
          // a crossing, unless the other road only starts / ends here (then it leaves toward its far end)
          const ends = u < 0.02 ? s.b : u > 0.98 ? s.a : null;
          const side: -1 | 0 | 1 = ends ? (Math.sign(c.cross[i][0] * (ends[0] - ax) + c.cross[i][1] * (ends[1] - az)) as -1 | 0 | 1) : 0;
          js.push({ s: c.cum[i] + t * c.segLen[i], major, side });
          continue;
        }
      }
      // an end point on (or just off) the pavement
      for (const p of [s.a, s.b]) {
        const px = p[0] - ax, pz = p[1] - az;
        const t = clamp((px * r[0] + pz * r[1]) / (c.segLen[i] * c.segLen[i]), 0, 1);
        const d = Math.hypot(px - r[0] * t, pz - r[1] * t);
        if (d < c.hw + 2.5) {
          const far = p === s.a ? s.b : s.a;
          const side = Math.sign(c.cross[i][0] * (far[0] - ax) + c.cross[i][1] * (far[1] - az)) as -1 | 0 | 1;
          js.push({ s: c.cum[i] + t * c.segLen[i], major, side });
        }
      }
    }
  }
  js.sort((p, q) => p.s - q.s);
  const out: Junction[] = [];
  for (const j of js) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.s - j.s) < 20) { last.major ||= j.major; if (last.side !== j.side) last.side = 0; continue; }
    out.push({ ...j });
  }
  return out;
}

interface Run { s0: number; s1: number; }

function mergeRuns(runs: Run[], gap: number): Run[] {
  runs.sort((p, q) => p.s0 - q.s0);
  const out: Run[] = [];
  for (const r of runs) {
    const last = out[out.length - 1];
    if (last && r.s0 <= last.s1 + gap) last.s1 = Math.max(last.s1, r.s1);
    else out.push({ ...r });
  }
  return out;
}

function subtractRuns(base: Run, holes: Run[]): Run[] {
  const out: Run[] = [];
  let s = base.s0;
  for (const h of holes.slice().sort((p, q) => p.s0 - q.s0)) {
    if (h.s1 <= s || h.s0 >= base.s1) continue;
    if (h.s0 > s) out.push({ s0: s, s1: Math.min(h.s0, base.s1) });
    s = Math.max(s, h.s1);
  }
  if (s < base.s1) out.push({ s0: s, s1: base.s1 });
  return out.filter((r) => r.s1 - r.s0 > 2);
}

// ------------------------------------------------------------------ geometry helpers

/** Loft of an open profile along the frames with a per-frame scale and per-vertex extras: `extra` is
 *  [kind, along, height] for the concrete (along and height filled in here), `axisY` the height of the member's
 *  axis over the frame for the minimum width. Profile convention as Soup.loft (counter-clockwise). */
function loftH(soup: Soup, frames: Frame[], profile: readonly (readonly [number, number])[], scale: number[] | null, colors: readonly Rgb[] | Rgb, extraKind: number, axisY: number | null, extraFor?: (f: Frame, k: number) => readonly number[]): void {
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _n = new THREE.Vector3(), _p = new THREE.Vector3(), _ax = new THREE.Vector3();
  for (let i = 0; i < profile.length - 1; i++) {
    const [a0, y0] = profile[i], [a1, y1] = profile[i + 1];
    const ex = a1 - a0, ey = y1 - y0;
    const el = Math.hypot(ex, ey) || 1;
    const n2x = ey / el, n2y = -ex / el;
    const c: Rgb = Array.isArray(colors[0]) ? (colors as readonly Rgb[])[Math.min(i, colors.length - 1)] : (colors as Rgb);
    const base = soup.vertexCount;
    frames.forEach((f, k) => {
      const sc = scale ? scale[k] : 1;
      const nx = f.rx * n2x, ny = n2y, nz = f.rz * n2x;
      const axis = axisY !== null ? _ax.set(f.x, f.y + axisY * sc, f.z) : null;
      const e0 = extraFor ? extraFor(f, k) : [extraKind, f.s, y0 * sc];
      const e1 = extraFor ? extraFor(f, k) : [extraKind, f.s, y1 * sc];
      soup.vertex(f.x + f.rx * a0 * sc, f.y + y0 * sc, f.z + f.rz * a0 * sc, nx, ny, nz, c, e0, axis);
      soup.vertex(f.x + f.rx * a1 * sc, f.y + y1 * sc, f.z + f.rz * a1 * sc, nx, ny, nz, c, e1, axis);
    });
    let flip = false;
    if (frames.length > 1) {
      _a.fromArray(soup.pos, base * 3); _b.fromArray(soup.pos, (base + 1) * 3); _c.fromArray(soup.pos, (base + 3) * 3);
      _n.subVectors(_b, _a).cross(_c.sub(_a));
      _p.fromArray(soup.nrm, base * 3);
      flip = _n.dot(_p) < 0;
    }
    for (let k = 1; k < frames.length; k++) {
      const v0 = base + (k - 1) * 2, v1 = v0 + 1, v3 = base + k * 2, v2 = v3 + 1;
      if (flip) soup.idx.push(v0, v2, v1, v0, v3, v2);
      else soup.idx.push(v0, v1, v2, v0, v2, v3);
    }
  }
}

/** A textured quad (sign face): corners counter-clockwise seen from the front, uv from the atlas face. */
function faceQuad(soup: Soup, p: THREE.Vector3[], n: THREE.Vector3, face: SignFace, glow: number): void {
  const base = soup.vertexCount;
  const uv = [[face.u0, face.v0], [face.u1, face.v0], [face.u1, face.v1], [face.u0, face.v1]];
  for (let i = 0; i < 4; i++) soup.vertex(p[i].x, p[i].y, p[i].z, n.x, n.y, n.z, S_FACE, [glow, uv[i][0], uv[i][1]]);
  soup.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

/** Rectangular panel standing at `centre` facing `normal` (unit, horizontal): a steel back plate plus the face
 *  quad 4 cm in front of it. `w` x `h` metres, centre at the panel's middle. */
function panel(soup: Soup, centre: THREE.Vector3, normal: THREE.Vector3, w: number, h: number, face: SignFace, back: Rgb, glow: number, twoSided = false): void {
  const right = new THREE.Vector3(-normal.z, 0, normal.x);
  const yaw = Math.atan2(right.x, right.z);
  soup.box(centre.x, centre.y - h / 2, centre.z, w, h, 0.06, yaw - Math.PI / 2, 0, back, false);
  const put = (nrm: THREE.Vector3, sign: number) => {
    const c = centre.clone().addScaledVector(nrm, 0.04);
    const r = right.clone().multiplyScalar(sign);
    const p = [
      c.clone().addScaledVector(r, -w / 2).add(new THREE.Vector3(0, -h / 2, 0)),
      c.clone().addScaledVector(r, w / 2).add(new THREE.Vector3(0, -h / 2, 0)),
      c.clone().addScaledVector(r, w / 2).add(new THREE.Vector3(0, h / 2, 0)),
      c.clone().addScaledVector(r, -w / 2).add(new THREE.Vector3(0, h / 2, 0)),
    ];
    faceQuad(soup, p, nrm, face, glow);
  };
  put(normal, 1);
  if (twoSided) put(normal.clone().negate(), -1);
}

// ------------------------------------------------------------------ per-frame culling

interface ChunkMesh { mesh: THREE.Mesh; cls: CasterClass; box: THREE.Box3; height: number; inView: boolean; cast: number; shadowOnly?: boolean; }
interface Chunk {
  meshes: ChunkMesh[];
  steel: THREE.Mesh | null;
  /** index counts of the steel prefixes: lamp heads | + poles and rails | + posts */
  headsEnd: number; thinEnd: number;
  signs: THREE.Mesh | null;
  concrete: THREE.Mesh | null;
  center: THREE.Vector3; r: number; dist: number;
}

/** Visibility and caster routing per chunk (see bridges.ts BridgeCuller), plus the LOD draw ranges and the
 *  lamp glow. Runs from the group's `updateMatrixWorld` with the cameras that drew a chunk last frame. */
class HighwayCuller {
  readonly chunks: Chunk[] = [];
  private sun: THREE.DirectionalLight | null = null;
  private readonly cull = new ViewCull();
  private readonly sunDir = new THREE.Vector3(0, 1, 0);
  private readonly seen = new Set<THREE.PerspectiveCamera>();
  private cameras: THREE.PerspectiveCamera[] = [];

  constructor(private readonly steel: THREE.MeshStandardMaterial) {}

  observe(camera: THREE.Camera): void {
    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) this.seen.add(camera as THREE.PerspectiveCamera);
  }

  update(scene: THREE.Object3D | null): void {
    if (!this.sun && scene) this.sun = (scene.children.find((o) => (o as THREE.DirectionalLight).isDirectionalLight && o.castShadow) as THREE.DirectionalLight | undefined) ?? null;
    let keyIntensity = 10;
    if (this.sun) {
      this.sunDir.subVectors(this.sun.position, this.sun.target.position);
      if (this.sunDir.lengthSq() > 1e-6) this.sunDir.normalize(); else this.sunDir.set(0, 1, 0);
      keyIntensity = this.sun.intensity;
    }
    this.steel.emissiveIntensity = LAMP_GLOW * lampGlowFor(this.sunDir, keyIntensity);
    if (this.seen.size) { this.cameras = [...this.seen]; this.seen.clear(); }
    if (!this.cameras.length) return;
    for (const c of this.chunks) { c.dist = Infinity; for (const m of c.meshes) { m.inView = false; m.cast = 0; } }
    for (const cam of this.cameras) {
      const camX = cam.position.x, camZ = cam.position.z;
      const range = clamp(cam.position.y * 9, 5000, 12000);
      this.cull.update(cam, range, this.sunDir);
      for (const c of this.chunks) {
        const d = Math.max(0, Math.hypot(c.center.x - camX, c.center.z - camZ) - c.r);
        c.dist = Math.min(c.dist, d);
        for (const m of c.meshes) {
          if (!m.inView && this.cull.boxInView(m.box)) m.inView = true;
          if (d < range) m.cast |= this.cull.boxCasterCascades(m.box, m.height);
        }
      }
    }
    // the coarse cascades (texel >= NEAR_TEXEL) never draw the thin steel: the fat shadow proxies stand in there
    let coarse = 0;
    for (let i = 0; i < MAX_CASCADES; i++) if (!cascadeIsFine(i)) coarse |= 1 << i;
    for (const c of this.chunks) {
      for (const m of c.meshes) {
        const mask = m.shadowOnly ? layerMask('mid', false, m.cast & coarse) : layerMask(m.cls, m.inView, m.cast);
        const cast = maskCasts(mask);
        m.mesh.castShadow = cast;
        m.mesh.visible = m.shadowOnly ? cast : m.inView || cast;
        m.mesh.layers.mask = mask;
      }
      if (c.steel) {
        const end = c.dist > THIN_DISTANCE ? c.headsEnd : c.dist > POST_DISTANCE ? c.thinEnd : Infinity;
        c.steel.geometry.setDrawRange(0, end);
        if (c.dist > HEAD_DISTANCE || end === 0) c.steel.visible = false;
      }
      if (c.signs && c.dist > SIGN_DISTANCE) c.signs.visible = false;
      if (c.concrete && c.dist > SIGN_DISTANCE) c.concrete.visible = false;
    }
  }
}

class HighwayGroup extends THREE.Group {
  constructor(readonly culler: HighwayCuller) { super(); }
  override updateMatrixWorld(force?: boolean): void {
    this.culler.update(this.parent);
    super.updateMatrixWorld(force);
  }
}

// ------------------------------------------------------------------ destinations

/** Fictional destinations of Bahía Vista (the map's districts and islands), by causeway and direction of travel:
 *  what the gantry before that causeway announces. */
const DEST: Record<string, { toEnd: string[]; toStart: string[]; tab: string }> = {
  'garza-west': { toEnd: ['Isla Garza', 'Isla Tortuga'], toStart: ['Isla Brisa', 'Bahía Vista'], tab: 'CAUSEWAY 1 KM' },
  'islab-west': { toEnd: ['Isla Brisa', 'Isla Garza'], toStart: ['Bahía Vista', 'Aeropuerto'], tab: 'CAUSEWAY 1 KM' },
  'garza-bridge': { toEnd: ['Isla Tortuga', 'Costa Barrera'], toStart: ['Isla Garza', 'Bahía Vista'], tab: 'PUENTE GARZA' },
  'tortuga-bridge': { toEnd: ['Costa Barrera', 'Zona Hotelera'], toStart: ['Isla Garza', 'Bahía Vista'], tab: 'PUENTE TORTUGA' },
};
/** Ground guide signs and gantry panels at the arterial junctions, by chain id (the avenue to downtown, Garza's park road). */
const JUNCTION_DEST: Record<string, string[]> = {
  'south-hwy-mainland': ['Centro', 'Av. Central'],
  'garza-hwy-2': ['Marina', 'Parque Garza'],
  'tortuga-rd': ['Isla Tortuga', 'Pueblo'],
};
const FAR_DEST: Record<string, { toEnd: string[]; toStart: string[] }> = {
  'south-hwy-mainland': { toEnd: ['Isla Garza', 'Costa Barrera'], toStart: ['Aeropuerto', 'Bahía Vista'] },
};

// ------------------------------------------------------------------ build

export function buildHighway(map: WorldMap, segments: RoadSegment[], registerLit: (m: THREE.Material) => void): HighwayBuild {
  const pixelScale: THREE.IUniform<number> = { value: 1000 };
  const atlas = new SignAtlas();
  const concreteMat = createConcreteMaterial(pixelScale);
  const steelMat = createSteelMaterial(pixelScale, atlas.texture);
  registerLit(concreteMat); registerLit(steelMat);
  // shadow proxies are only ever drawn by the shadow cameras (depth material): the cheapest material will do
  const proxyMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const culler = new HighwayCuller(steelMat);
  const group = new HighwayGroup(culler);
  const _size = new THREE.Vector2();
  const observe = (renderer: THREE.WebGLRenderer, camera: THREE.Camera) => {
    culler.observe(camera);
    const rt = renderer.getRenderTarget();
    const h = rt ? rt.height : renderer.getDrawingBufferSize(_size).y;
    pixelScale.value = 0.5 * h * camera.projectionMatrix.elements[5];
  };
  const counts: HighwayBuild['counts'] = { chains: 0, chunks: 0, meshes: 0, poles: 0, gantries: 0, guardrailM: 0, barrierM: 0, vergeM: 0, signs: 0, triangles: 0 };
  const chains = buildChains(map, segments);
  counts.chains = chains.length;

  for (const c of chains) {
    const hw = c.hw;
    const junctions = findJunctions(c, segments);
    const majors = junctions.filter((j) => j.major);
    const nearJunction = (s: number, r: number) => junctions.some((j) => Math.abs(j.s - s) < r);
    const yawAt = (f: Frame) => Math.atan2(f.dx, f.dz);
    const nChunks = Math.max(1, Math.round(c.total / CHUNK_LEN));
    const chunkLen = c.total / nChunks;
    const chunkOf = (s: number) => Math.min(nChunks - 1, Math.max(0, Math.floor(s / chunkLen)));
    // steel is accumulated in three soups per chunk so the LOD prefixes can be laid out: heads | thin | posts
    // `proxy`: fat stand-ins (poles, gantry trusses, guardrail walls) drawn into the coarse shadow cascades only,
    // so the furniture keeps its shadow strokes from the air where the thin steel is not worth a shadow pass
    const parts = Array.from({ length: nChunks }, () => ({ conc: new Soup(3, true), heads: new Soup(3, true), thin: new Soup(3, true), posts: new Soup(3, true), signs: new Soup(3, true), proxy: new Soup(3, false) }));
    const P = (s: number) => parts[chunkOf(s)];

    // -------------------------------------------------------- median barrier: continuous, opened at the arterial junctions
    const openings: Run[] = majors.map((j) => ({ s0: j.s - 19, s1: j.s + 19 }));
    const endPad = 1.2;
    const barrierRuns = subtractRuns({ s0: endPad, s1: c.total - endPad }, openings);
    const TAPER = 7;
    for (const run of barrierRuns) {
      // a sloped end terminal wherever the barrier does not continue onto a causeway deck
      const taperStart = !(run.s0 <= endPad + 0.01 && c.bridgeStart), taperEnd = !(run.s1 >= c.total - endPad - 0.01 && c.bridgeEnd);
      const st = stations(c, run.s0, run.s1);
      // split at chunk boundaries and at the taper ends so every station list belongs to one soup
      const cuts = new Set<number>([run.s0, run.s1]);
      for (let k = 1; k < nChunks; k++) { const s = k * chunkLen; if (s > run.s0 && s < run.s1) cuts.add(s); }
      if (taperStart) cuts.add(Math.min(run.s0 + TAPER, run.s1));
      if (taperEnd) cuts.add(Math.max(run.s1 - TAPER, run.s0));
      const all = [...new Set([...st, ...cuts])].sort((p, q) => p - q);
      const cutList = [...cuts].sort((p, q) => p - q);
      for (let ci = 0; ci < cutList.length - 1; ci++) {
        const a = cutList[ci], b = cutList[ci + 1];
        if (b - a < 0.05) continue;
        const ss = all.filter((s) => s >= a - 1e-6 && s <= b + 1e-6);
        const frames = ss.map((s) => frameAt(c, s));
        const scale = ss.map((s) => {
          let k = 1;
          if (taperStart) k = Math.min(k, clamp(0.12 + 0.88 * ((s - run.s0) / TAPER), 0.12, 1));
          if (taperEnd) k = Math.min(k, clamp(0.12 + 0.88 * ((run.s1 - s) / TAPER), 0.12, 1));
          return k;
        });
        loftH(P((a + b) / 2).conc, frames, BARRIER_PROFILE, scale, [C_BARRIER, C_BARRIER, C_BARRIER, C_BARRIER_TOP, C_BARRIER, C_BARRIER, C_BARRIER], 1, BARRIER_H * 0.45);
      }
      counts.barrierM += run.s1 - run.s0;
      // crash cushions: three yellow sand drums nosing each open terminal
      for (const [end, dir] of [[run.s0, 1], [run.s1, -1]] as const) {
        if (!(dir > 0 ? taperStart : taperEnd)) continue;
        for (const [ds, da] of [[1.0, 0], [2.1, -0.55], [2.1, 0.55]] as const) {
          const f = frameAt(c, end + dir * ds);
          P(end + dir * ds).signs.cylinder(f.x + f.rx * da, f.y + 0.02, f.z + f.rz * da, 0.9, 0.95, 8, S_DRUM, true, [0, 0, 0]);
        }
      }
      // barrier-mounted reflectors every 12 m (amber toward the traffic that sees them, both faces)
      for (let s = Math.ceil((run.s0 + TAPER + 2) / 12) * 12; s < run.s1 - TAPER - 2; s += 12) {
        const f = frameAt(c, s);
        P(s).posts.box(f.x, f.y + BARRIER_H, f.z, 0.1, 0.09, 0.05, yawAt(f), 0, S_AMBER, false, [0, 0, 0], 'point');
      }
    }

    // -------------------------------------------------------- gravel verges: a compacted-shell strip beside each pavement edge (edge definition from the air; the posts stand on it)
    for (const side of [-1, 1] as const) {
      const cuts = new Set<number>(stations(c, 0, c.total));
      for (let k = 1; k < nChunks; k++) cuts.add(k * chunkLen);
      const ss = [...cuts].sort((p, q) => p - q);
      const aIn = side * hw, aOut = side * (hw + VERGE_W);
      const at2 = (s: number) => {
        const f = frameAt(c, s);
        // 5 cm under the pavement edge, draped on the terrain at the same lift the roads use (the clipmap sits under it)
        const inner = new THREE.Vector3(f.x + f.rx * aIn, surfaceAt(c, s, aIn) - 0.05, f.z + f.rz * aIn);
        const ox = f.x + f.rx * aOut, oz = f.z + f.rz * aOut;
        const outer = new THREE.Vector3(ox, clamp(map.heightAt(ox, oz) + ROAD_LIFT - 0.05, inner.y - 1.2, inner.y + 0.4), oz);
        return { inner, outer };
      };
      let prev = at2(ss[0]);
      for (let i = 1; i < ss.length; i++) {
        const cur = at2(ss[i]);
        const soup = P((ss[i - 1] + ss[i]) / 2).conc;
        const base = soup.vertexCount;
        _n.subVectors(cur.inner, prev.inner).cross(_d.subVectors(prev.outer, prev.inner)).normalize();
        if (_n.y < 0) _n.negate();
        const tone = map.zoneAt(cur.outer.x, cur.outer.z) === 2 || map.heightAt(cur.outer.x, cur.outer.z) < 1.2 ? C_VERGE_SAND : C_VERGE_GRASS;
        soup.vertex(prev.inner.x, prev.inner.y, prev.inner.z, _n.x, _n.y, _n.z, tone, [3, ss[i - 1], 0]);
        soup.vertex(cur.inner.x, cur.inner.y, cur.inner.z, _n.x, _n.y, _n.z, tone, [3, ss[i], 0]);
        soup.vertex(cur.outer.x, cur.outer.y, cur.outer.z, _n.x, _n.y, _n.z, tone, [3, ss[i], 1]);
        soup.vertex(prev.outer.x, prev.outer.y, prev.outer.z, _n.x, _n.y, _n.z, tone, [3, ss[i - 1], 1]);
        _a.subVectors(cur.inner, prev.inner).cross(_b.subVectors(cur.outer, prev.inner));
        if (_a.y >= 0) soup.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
        else soup.idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
        prev = cur;
      }
      counts.vergeM += c.total;
    }

    // -------------------------------------------------------- guardrail: where the ground beside the shoulder is water or drops away, and on the causeway approaches
    const railRuns: { side: 1 | -1; runs: Run[] }[] = [];
    for (const side of [-1, 1] as const) {
      const rows: Run[] = [];
      for (let s = 0; s <= c.total; s += ROAD_STEP) {
        const roadY = surfaceAt(c, s, side * hw);
        const f = frameAt(c, s);
        const g1 = map.heightAt(f.x + f.rx * side * (hw + 5), f.z + f.rz * side * (hw + 5));
        const g2 = map.heightAt(f.x + f.rx * side * (hw + 18), f.z + f.rz * side * (hw + 18));
        const low = Math.min(g1, g2);
        if (low < 0.75 || roadY - low > 1.7) rows.push({ s0: s - 22, s1: s + 22 });
      }
      if (c.bridgeStart) rows.push({ s0: 0, s1: 62 });
      if (c.bridgeEnd) rows.push({ s0: c.total - 62, s1: c.total });
      const runs = mergeRuns(rows, 45).map((r) => ({ s0: Math.max(1.0, r.s0), s1: Math.min(c.total - 1.0, r.s1) })).filter((r) => r.s1 - r.s0 > 20);
      railRuns.push({ side, runs });
      for (const run of runs) {
        counts.guardrailM += run.s1 - run.s0;
        // the rail: one loft per chunk piece, facing the pavement; sandy islands get timber posts
        const timber = map.zoneAt(at(c, (run.s0 + run.s1) / 2, 0).x, at(c, (run.s0 + run.s1) / 2, 0).z) === 2;
        const cuts = [run.s0];
        for (let k = 1; k < nChunks; k++) { const s = k * chunkLen; if (s > run.s0 && s < run.s1) cuts.push(s); }
        cuts.push(run.s1);
        const aRail = side * (hw + 0.45);
        // profile mirrored (and reversed, to stay counter-clockwise) for the right side, whose traffic face looks toward -a
        const prof: [number, number][] = side < 0 ? RAIL_PROFILE.map(([a, y]) => [a, y] as [number, number]) : RAIL_PROFILE.slice().reverse().map(([a, y]) => [-a, y] as [number, number]);
        for (let ci = 0; ci < cuts.length - 1; ci++) {
          const ss = stations(c, cuts[ci], cuts[ci + 1]);
          const frames = ss.map((s) => { const f = frameAt(c, s); return { ...f, x: f.x + f.rx * aRail, z: f.z + f.rz * aRail, y: surfaceAt(c, s, side * hw) }; });
          // end terminals: the rail turns down to the ground over the last 8 m unless it ties into a parapet
          const tiesStart = ci === 0 && run.s0 <= 1.01 && c.bridgeStart, tiesEnd = ci === cuts.length - 2 && run.s1 >= c.total - 1.01 && c.bridgeEnd;
          for (const f of frames) {
            let drop = 0;
            if (!tiesStart && ci === 0) drop = Math.max(drop, 1 - clamp((f.s - run.s0) / 8, 0, 1));
            if (!tiesEnd && ci === cuts.length - 2) drop = Math.max(drop, 1 - clamp((run.s1 - f.s) / 8, 0, 1));
            f.y -= 0.62 * drop * drop;
          }
          loftH(P((cuts[ci] + cuts[ci + 1]) / 2).thin, frames, prof, null, S_GALV, 0, 0.7, () => [0, 0, 0]);
          loftH(P((cuts[ci] + cuts[ci + 1]) / 2).proxy, frames, [[0.14, 0.12], [0.14, 0.86], [-0.14, 0.86], [-0.14, 0.12]], null, S_GALV, 0, null, () => []);
        }
        // posts every 1.905 m just behind the rail, buried into the verge; a reflector on every sixth
        let n = 0;
        for (let s = run.s0 + 1.0; s < run.s1 - 0.5; s += POST_SPACING, n++) {
          const f = frameAt(c, s);
          const aPost = side * (hw + 0.45 + 0.03 + 0.1);
          const px = f.x + f.rx * aPost, pz = f.z + f.rz * aPost;
          const roadY = surfaceAt(c, s, side * hw);
          const ground = Math.min(roadY - ROAD_LIFT, map.heightAt(px, pz));
          const top = roadY + 0.84;
          const drop = Math.max(0, 1 - clamp((s - run.s0) / 8, 0, 1), 1 - clamp((run.s1 - s) / 8, 0, 1));
          const railTop = top - 0.62 * drop * drop;
          if (railTop - (ground - 0.3) < 0.3) continue;
          P(s).posts.box(px, ground - 0.3, pz, 0.15, railTop - (ground - 0.3), 0.2, yawAt(f), 0, timber ? S_WOOD : S_GALV, true, [0, 0, 0], true);
          if (n % 6 === 3 && drop === 0) P(s).posts.box(px - f.rx * side * 0.12, railTop - 0.02, pz - f.rz * side * 0.12, 0.08, 0.1, 0.04, yawAt(f), 0, S_AMBER, false, [0, 0, 0], 'point');
        }
      }
    }
    const railedAt = (s: number, side: number) => railRuns.find((r) => r.side === side)!.runs.some((r) => s > r.s0 - 2 && s < r.s1 + 2);

    // -------------------------------------------------------- delineator posts every 50 m on both shoulders (not where the rail carries the reflectors)
    for (const side of [-1, 1] as const) {
      for (let s = 25; s < c.total - 8; s += 50) {
        if (railedAt(s, side) || nearJunction(s, 14)) continue;
        const f = frameAt(c, s);
        const aP = side * (hw + 0.7);
        const px = f.x + f.rx * aP, pz = f.z + f.rz * aP;
        const ground = Math.min(surfaceAt(c, s, side * hw) - ROAD_LIFT, map.heightAt(px, pz));
        P(s).posts.box(px, ground - 0.2, pz, 0.1, 1.45, 0.035, yawAt(f), 0, S_WHITE, true, [0, 0, 0], true);
        P(s).posts.box(px, ground + 1.05, pz, 0.08, 0.16, 0.05, yawAt(f), 0, S_AMBER, false, [0, 0, 0], 'point');
      }
    }

    // -------------------------------------------------------- gantries and their sign panels
    interface Gantry { s: number; dir: 1 | -1; panels: { lines: string[]; arrow: Arrow; tab?: string }[]; }
    const gantries: Gantry[] = [];
    const addGantry = (g: Gantry) => { if (g.s > 40 && g.s < c.total - 40 && !gantries.some((o) => Math.abs(o.s - g.s) < 320)) gantries.push(g); };
    const dest = (b: BridgeSpec | null, atEnd: boolean): { lines: string[]; tab: string } | null => {
      if (!b) return null;
      const d = DEST[b.id];
      if (!d) return { lines: ['Causeway'], tab: 'CAUSEWAY' };
      // the chain touches the bridge at its start or its end: traffic leaving the chain runs the bridge toward its far end
      const bStart = b.pts[0], p = atEnd ? c.pts[c.pts.length - 1] : c.pts[0];
      const towardBridgeEnd = Math.hypot(bStart[0] - p[0], bStart[1] - p[1]) < 6;
      return { lines: towardBridgeEnd ? d.toEnd : d.toStart, tab: d.tab };
    };
    const dEnd = dest(c.bridgeEnd, true), dStart = dest(c.bridgeStart, false);
    if (dEnd) addGantry({ s: c.total - 260, dir: 1, panels: [{ lines: dEnd.lines, arrow: 'up', tab: dEnd.tab }] });
    if (dStart) addGantry({ s: 260, dir: -1, panels: [{ lines: dStart.lines, arrow: 'up', tab: dStart.tab }] });
    const jd = JUNCTION_DEST[c.id];
    for (const j of majors) {
      if (j.s < 60 || j.s > c.total - 60 || !jd) continue;
      // which side the arterial leaves toward: the junction's cross road end point
      const far = FAR_DEST[c.id];
      const ahead = (dir: 1 | -1) => (dir > 0 ? (far?.toEnd ?? dEnd?.lines) : (far?.toStart ?? dStart?.lines)) ?? ['Bahía Vista'];
      // the cross road's arrow: the side it leaves toward, seen by traffic running in `dir` (a crossing: both ways)
      const arrowFor = (dir: 1 | -1): Arrow => (j.side === 0 ? 'both' : j.side * dir > 0 ? 'right' : 'left');
      addGantry({ s: j.s - 150, dir: 1, panels: [{ lines: ahead(1), arrow: 'up' }, { lines: jd, arrow: arrowFor(1) }] });
      addGantry({ s: j.s + 150, dir: -1, panels: [{ lines: ahead(-1), arrow: 'up' }, { lines: jd, arrow: arrowFor(-1) }] });
    }
    if (c.total > 2500) {
      const far = FAR_DEST[c.id];
      if (far) { addGantry({ s: c.total * 0.32, dir: 1, panels: [{ lines: far.toEnd, arrow: 'up' }] }); addGantry({ s: c.total * 0.68, dir: -1, panels: [{ lines: far.toStart, arrow: 'up' }] }); }
    }
    for (const g of gantries) {
      const f = frameAt(c, g.s);
      const yaw = yawAt(f);
      const fwd = new THREE.Vector3(f.dx, 0, f.dz).multiplyScalar(g.dir);   // direction of the traffic served
      const faceN = fwd.clone().negate();                                       // the faces look back at it
      const roadY = f.y;
      const part = P(g.s);
      const colA = hw + 1.6;
      const topY = roadY + 8.1;
      // columns on concrete pedestals either side, a two-chord truss between them
      for (const side of [-1, 1]) {
        const px = f.x + f.rx * side * colA, pz = f.z + f.rz * side * colA;
        const ground = Math.min(surfaceAt(c, g.s, side * hw) - ROAD_LIFT, map.heightAt(px, pz));
        part.conc.box(px, ground - 0.4, pz, 1.5, 1.2, 1.5, yaw, 0, C_PEDESTAL, false, [0, 0, 0]);
        part.signs.cylinder(px, ground + 0.8, pz, 0.6, topY - (ground + 0.8), 10, S_GALV, true, [0, 0, 0], true);
        part.proxy.box(px, ground + 0.8, pz, 0.9, topY - 1.5 - (ground + 0.8), 0.9, yaw, 0, S_GALV, true, []);
      }
      const chordY = [topY - 1.5, topY - 0.1];
      part.proxy.box(f.x, chordY[0] - 0.1, f.z, colA * 2, 1.6, 1.2, yaw, 0, S_GALV, false, []);
      const left = new THREE.Vector3(f.x - f.rx * colA, 0, f.z - f.rz * colA), right = new THREE.Vector3(f.x + f.rx * colA, 0, f.z + f.rz * colA);
      for (const y of chordY) part.signs.strut(left.clone().setY(y), right.clone().setY(y), 0.19, S_GALV, [0, 0, 0]);
      const span = colA * 2;
      const nBay = Math.round(span / 2.6);
      for (let k = 0; k <= nBay; k++) {
        const a = -colA + (span * k) / nBay;
        const x = f.x + f.rx * a, z = f.z + f.rz * a;
        part.signs.strut(new THREE.Vector3(x, chordY[0], z), new THREE.Vector3(x, chordY[1], z), 0.07, S_GALV, [0, 0, 0]);
        if (k < nBay) {
          const a2 = -colA + (span * (k + 1)) / nBay;
          const x2 = f.x + f.rx * a2, z2 = f.z + f.rz * a2;
          if (k % 2 === 0) part.signs.strut(new THREE.Vector3(x, chordY[0], z), new THREE.Vector3(x2, chordY[1], z2), 0.06, S_GALV, [0, 0, 0]);
          else part.signs.strut(new THREE.Vector3(x, chordY[1], z), new THREE.Vector3(x2, chordY[0], z2), 0.06, S_GALV, [0, 0, 0]);
        }
      }
      // panels over the served carriageway: the main guide sign over the lanes, a second one beside it
      const laneCentre = g.dir * (hw * 0.5 - 2.3);
      const panelsW = g.panels.map((_, i) => (i === 0 ? 4.4 : 3.2));
      const totalW = panelsW.reduce((p, q) => p + q, 0) + 0.6 * (g.panels.length - 1);
      let a = laneCentre - (g.dir * totalW) / 2;
      g.panels.forEach((pn, i) => {
        const w = panelsW[i], h = i === 0 ? 2.4 : 1.9;
        const ac = a + (g.dir * w) / 2;
        const centre = new THREE.Vector3(f.x + f.rx * ac, chordY[1] - 0.25 - h / 2, f.z + f.rz * ac);
        panel(part.signs, centre, faceN, w, h, atlas.guide(pn.lines, pn.arrow, i === 0 ? 320 : 256, i === 0 ? 176 : 152), S_DARK, 0.08);
        if (pn.tab) panel(part.signs, centre.clone().setY(chordY[1] - 0.25 + 0.34), faceN, 2.2, 0.62, atlas.tab(pn.tab), S_DARK, 0.08);
        // hangers to the chords
        for (const sgn of [-1, 1]) {
          const hx = centre.x + f.rx * sgn * (w / 2 - 0.3), hz = centre.z + f.rz * sgn * (w / 2 - 0.3);
          part.signs.box(hx, centre.y + h / 2, hz, 0.08, chordY[1] - (centre.y + h / 2) + 0.1, 0.08, yaw, 0, S_DARK, true, [0, 0, 0], true);
        }
        counts.signs++;
        a += g.dir * (w + 0.6);
      });
      counts.gantries++;
    }
    const nearGantry = (s: number, r: number) => gantries.some((g) => Math.abs(g.s - s) < r);

    // -------------------------------------------------------- lighting: barrier-mounted twin-arm poles every 60 m
    for (let s = 32; s < c.total - 12; s += POLE_SPACING) {
      if (nearGantry(s, 24) || openings.some((o) => s > o.s0 - 4 && s < o.s1 + 4)) continue;
      const f = frameAt(c, s);
      const yaw = yawAt(f);
      const base = f.y + BARRIER_H;
      const part = P(s);
      part.thin.box(f.x, base, f.z, 0.5, 0.06, 0.5, yaw, 0, S_POLE, false, [0, 0, 0]);
      part.thin.cylinder(f.x, base + 0.06, f.z, 0.27, POLE_H - 0.06, 8, S_POLE, true, [0, 0, 0], true);
      const top = base + POLE_H;
      part.proxy.box(f.x, base, f.z, 0.55, POLE_H - 0.6, 0.55, yaw, 0, S_POLE, true, []);
      part.proxy.box(f.x, top - 0.6, f.z, ARM_REACH * 2 + 0.8, 0.6, 0.9, yaw, 0, S_POLE, false, []);
      for (const side of [-1, 1]) {
        const hx = f.x + f.rx * side * ARM_REACH, hz = f.z + f.rz * side * ARM_REACH;
        part.thin.strut(new THREE.Vector3(f.x + f.rx * side * 0.1, top - 0.55, f.z + f.rz * side * 0.1), new THREE.Vector3(hx, top - 0.15, hz), 0.065, S_POLE, [0, 0, 0]);
        part.heads.box(hx, top - 0.38, hz, 0.78, 0.22, 0.34, yaw, 0, S_HEAD, false, [1, 0, 0], 'point');
      }
      counts.poles++;
    }

    // -------------------------------------------------------- guide signs on the shoulder before the arterial junctions, speed limits, chevrons
    const groundSign = (s: number, dir: 1 | -1, w: number, h: number, face: SignFace, back: Rgb, twoSided = false, posts = 2, clearance = 2.1) => {
      const f = frameAt(c, s);
      const side = dir;
      const aS = side * (hw + 3.2);
      const cx = f.x + f.rx * aS, cz = f.z + f.rz * aS;
      const ground = Math.min(surfaceAt(c, s, side * hw) - ROAD_LIFT, map.heightAt(cx, cz));
      const faceN = new THREE.Vector3(-f.dx * dir, 0, -f.dz * dir);
      const part = P(s);
      const yaw = yawAt(f);
      const dxs = posts === 2 ? [-w * 0.32, w * 0.32] : [0];
      for (const d of dxs) part.posts.box(cx + f.rx * d, ground - 0.4, cz + f.rz * d, 0.1, clearance + h * 0.5 + 0.4, 0.1, yaw, 0, S_GALV, true, [0, 0, 0], true);
      panel(part.signs, new THREE.Vector3(cx, ground + clearance + h / 2, cz), faceN, w, h, face, back, 0.05, twoSided);
      counts.signs++;
    };
    if (jd) for (const j of majors) {
      const arrowFor = (dir: 1 | -1): Arrow => (j.side === 0 ? 'both' : j.side * dir > 0 ? 'right' : 'left');
      if (j.s > 330 && !nearGantry(j.s - 330, 60)) groundSign(j.s - 330, 1, 3.0, 1.5, atlas.guide([jd[0], '300 m'], arrowFor(1), 256, 128), S_DARK);
      if (j.s < c.total - 330 && !nearGantry(j.s + 330, 60)) groundSign(j.s + 330, -1, 3.0, 1.5, atlas.guide([jd[0], '300 m'], arrowFor(-1), 256, 128), S_DARK);
    }
    for (const dir of [1, -1] as const) {
      for (let s = dir > 0 ? 140 : c.total - 140; dir > 0 ? s < c.total - 60 : s > 60; s += dir * 900) {
        if (nearGantry(s, 60) || nearJunction(s, 30)) continue;
        groundSign(s, dir, 0.75, 0.75, atlas.speed('90'), S_DARK, false, 1, 2.0);
      }
    }
    // chevrons on the outside of any bend sharper than 8 degrees
    for (let i = 1; i < c.pts.length - 1; i++) {
      const d0 = c.dirs[i - 1], d1 = c.dirs[i];
      const turn = Math.atan2(d0[0] * d1[1] - d0[1] * d1[0], d0[0] * d1[0] + d0[1] * d1[1]);
      if (Math.abs(turn) < THREE.MathUtils.DEG2RAD * 8) continue;
      // a left turn (negative, in this x-east / z-south frame) has its outside on the right (+cross)
      const outside: 1 | -1 = turn < 0 ? 1 : -1;
      for (let k = -1; k <= 2; k++) {
        const s = c.cum[i] + k * 18 - 9;
        if (s < 5 || s > c.total - 5) continue;
        const f = frameAt(c, s);
        const aS = outside * (hw + 1.4);
        const cx = f.x + f.rx * aS, cz = f.z + f.rz * aS;
        const ground = Math.min(surfaceAt(c, s, outside * hw) - ROAD_LIFT, map.heightAt(cx, cz));
        const part = P(s);
        part.posts.box(cx, ground - 0.3, cz, 0.08, 1.75, 0.08, yawAt(f), 0, S_GALV, true, [0, 0, 0], true);
        panel(part.signs, new THREE.Vector3(cx, ground + 1.45 + 0.375, cz), new THREE.Vector3(-f.dx, 0, -f.dz), 0.6, 0.75, atlas.chevron(), S_YELLOW, 0.0, true);
        counts.signs++;
      }
    }

    // -------------------------------------------------------- drainage inlets at the shoulder edge every 60 m, staggered by side
    for (const side of [-1, 1] as const) {
      for (let s = side > 0 ? 18 : 48; s < c.total - 10; s += 60) {
        if (nearJunction(s, 12)) continue;
        const f = frameAt(c, s);
        const aI = side * (hw - 0.75);
        const ix = f.x + f.rx * aI, iz = f.z + f.rz * aI;
        const y = surfaceAt(c, s, aI);
        const part = P(s);
        part.conc.box(ix, y + 0.004, iz, 1.4, 0.012, 1.1, yawAt(f), 0, C_APRON, false, [0, 0, 0]);
        // the grate's `along` runs across the flow so the bars read across the shoulder
        const g = part.conc;
        const base = g.vertexCount;
        const yaw = yawAt(f);
        const cy = Math.cos(yaw), sy = Math.sin(yaw);
        const corner = (ax: number, az: number) => [ix + ax * cy + az * sy, iz - ax * sy + az * cy];
        const cs = [corner(-0.45, -0.3), corner(0.45, -0.3), corner(0.45, 0.3), corner(-0.45, 0.3)];
        const us = [0, 1, 1, 0];
        for (let k = 0; k < 4; k++) g.vertex(cs[k][0], y + 0.02, cs[k][1], 0, 1, 0, C_GRATE, [2, us[k], 0]);
        g.idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
      }
    }

    // -------------------------------------------------------- chunk meshes
    for (let k = 0; k < nChunks; k++) {
      const p = parts[k];
      const chunk: Chunk = { meshes: [], steel: null, headsEnd: 0, thinEnd: 0, signs: null, concrete: null, center: new THREE.Vector3(), r: 0, dist: Infinity };
      const chunkBox = new THREE.Box3();
      const attach = (mesh: THREE.Mesh, cls: CasterClass, noMirror: boolean) => {
        mesh.name = `${c.id}#${k}`;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.matrixAutoUpdate = false;
        mesh.userData.noMirror = noMirror;
        mesh.onBeforeRender = (r, _s, camera) => { observe(r, camera); };
        const box = mesh.geometry.boundingBox!;
        chunk.meshes.push({ mesh, cls, box, height: box.max.y - box.min.y, inView: true, cast: ALL_CASCADES });
        chunkBox.union(box);
        group.add(mesh);
        counts.meshes++;
        counts.triangles += mesh.geometry.index!.count / 3;
      };
      const steelGeometry = (soup: Soup) => {
        const g = soup.build([['aGlow', 1], ['aUv', 2]]);
        g.setAttribute('uv', g.getAttribute('aUv'));
        g.deleteAttribute('aUv');
        return g;
      };
      if (p.conc.idx.length) {
        const g = p.conc.build([['aInfo', 3]]);
        const m = new THREE.Mesh(g, concreteMat);
        chunk.concrete = m;
        attach(m, 'mid', false);
      }
      if (p.heads.idx.length || p.thin.idx.length || p.posts.idx.length) {
        const headsEnd = p.heads.idx.length;
        p.heads.append(p.thin);
        const thinEnd = p.heads.idx.length;
        p.heads.append(p.posts);
        const m = new THREE.Mesh(steelGeometry(p.heads), steelMat);
        chunk.steel = m; chunk.headsEnd = headsEnd; chunk.thinEnd = thinEnd;
        attach(m, 'near', true);
      }
      if (p.signs.idx.length) {
        const m = new THREE.Mesh(steelGeometry(p.signs), steelMat);
        chunk.signs = m;
        attach(m, 'mid', false);
      }
      if (p.proxy.idx.length) {
        const m = new THREE.Mesh(p.proxy.build([]), proxyMat);
        m.receiveShadow = false;
        attach(m, 'mid', true);
        chunk.meshes[chunk.meshes.length - 1].shadowOnly = true;
        m.visible = false;
      }
      if (!chunk.meshes.length) continue;
      const sphere = chunkBox.getBoundingSphere(new THREE.Sphere());
      chunk.center.copy(sphere.center); chunk.r = sphere.radius;
      culler.chunks.push(chunk);
      counts.chunks++;
    }
  }
  atlas.texture.needsUpdate = true;
  return { group, counts };
}
