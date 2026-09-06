import * as THREE from 'three';
import { GLSL_NOISE } from '../render/shaders/common.glsl';
import { hash2 } from '../core/seed';
import { clamp } from '../core/noise';
import { Zone, type Vec2, type WorldMap } from './map';
import { GLSL_LIGHT_POOLS, chainCross, chainFrame, frameAt, roadEdgeY, rowPositions, type RoadChain, type RoadCorner, type RoadGraph, type RoadLightUniforms, type RoadNode, type RoadRay } from './roads';
import { balanceGroundIbl } from './terrain';
import { cellKey } from './batching';
import { LAYER_CAMERA, layerMask, maskCasts, type ViewCull } from './culling';

/**
 * Street-level detail over the road graph: raised sidewalks with curb and gutter along every developed block
 * face (mesh strips following the pavement edge, curb returns and dished ramps at the corners), a promenade with
 * a parapet along the downtown bayfront, the street furniture (traffic signals with timed aspects, stop signs,
 * benches, bins, hydrants, bus shelters, bollards) baked into one static mesh per CELL-metre cell, the street lamp
 * plan the props system instances (kind, footing and arm direction of every lamp) and the ground irradiance map
 * of those lamps the road and sidewalk materials read at night.
 */

export type LampKind = 'arterial' | 'street' | 'ped' | 'highway';
/** one planned lamp: footing (on the curb line), arm yaw (the +x of the unit lamp points along (cos yaw, 0, -sin yaw)) */
export interface LampPlan { x: number; y: number; z: number; yaw: number; kind: LampKind }

const CELL = 500;
/** sidewalks, signals, shelters and stop signs are drawn within this range */
const FAR = 1500;
/** benches, bins, hydrants, bollards, cabinets: under a pixel beyond this */
const SMALL_FAR = 450;
/** sidewalks switch to their four-triangle-a-row far index beyond this (a curb face is under a pixel there) */
const WALK_NEAR = 500;
/** furniture casts shadows (into the fine cascades only) within this range */
const SHADOW_FAR = 700;
const CURB_H = 0.15;
const CURB_TOP = 0.3;
/** clearance of the slab over the terrain (the terrain is bilinear on a ~10 m grid: it can bulge between rows) */
const SLAB_CLEAR = 0.1;
/** lamp irradiance map texel (m) */
const LAMP_TEXEL = 2.5;
const LAMP_MAP_MAX = 4096;
/** signal cycle (s): green, amber, all-red per direction */
const SIGNAL_GREEN = 24, SIGNAL_AMBER = 4, SIGNAL_RED = 2;
const SIGNAL_HALF = SIGNAL_GREEN + SIGNAL_AMBER + SIGNAL_RED;

/** sidewalk kinds carried in `aSw.z` */
const K_WALK = 0, K_PROMENADE = 1, K_APRON = 3, K_PARAPET = 4;

// ------------------------------------------------------------------ materials

const SW_PARS = /* glsl */ `
varying vec4 vSw;      // across from the curb face (m), along (m), kind, ramp + 10 * slab width
varying vec3 vSwNrm;
varying vec3 vWorldPosS;
${GLSL_NOISE}
${GLSL_LIGHT_POOLS}
float swLine(float d, float h, float fw) { return clamp((min(h, d + 0.5 * fw) - max(-h, d - 0.5 * fw)) / fw, 0.0, 1.0); }
`;
const SW_MAIN = /* glsl */ `
{
  float across = vSw.x, along = vSw.y, kind = vSw.z;
  // w = 10 * slab width (integer) + ramp (0..0.98): decoded tolerant of interpolation rounding (35.99999 is 36 + 0)
  float wInt = floor(vSw.w + 0.005);
  float ramp = max(vSw.w - wInt, 0.0), slabW = wInt * 0.1;
  vec2 wp = vWorldPosS.xz;
  float fp = max(length(fwidth(wp)), 1e-4);
  float fwA = max(fwidth(across), 1e-4), fwL = max(fwidth(along), 1e-4);
  float n = fbm3(wp * 0.21);
  float grain = mix(vnoise(wp * 3.1), 0.5, smoothstep(0.1, 0.4, fp));
  vec3 conc = mix(vec3(0.36, 0.35, 0.33), vec3(0.46, 0.45, 0.42), n) * (0.94 + 0.12 * grain);
  bool face = vSwNrm.y < 0.5;
  float fade = 1.0 - smoothstep(0.15, 0.5, fp); // fine detail vanishes from altitude
  float slabFade = 1.0 - smoothstep(0.3, 1.0, fp); // per-slab tones (1.5 m) average out before they can sparkle
  float slabId = floor(along / 1.5);
  float tone = 1.0 + (0.14 * hash12(vec2(slabId, floor(across / 1.5) + kind * 7.0)) - 0.07) * slabFade;
  vec3 col = conc * tone;
  float joint = max(swLine((fract(along / 1.5) - 0.5) * 1.5, 0.012, fwL), swLine(across - ${CURB_TOP.toFixed(2)}, 0.012, fwA)) * fade;
  if (kind > 0.5 && kind < 1.5) {
    // promenade: warm sand-coloured pavers on a 0.6 m grid, a darker band every fifth course
    vec3 pav = mix(vec3(0.58, 0.53, 0.45), vec3(0.68, 0.63, 0.54), n) * (0.94 + 0.12 * grain);
    float pid = hash12(floor(vec2(along, across) / 0.6));
    pav *= 1.0 + (0.16 * pid - 0.08) * slabFade;
    float band = step(fract(across / 3.0), 0.2);
    pav = mix(pav, vec3(0.42, 0.40, 0.38), band * 0.6);
    joint = max(swLine((fract(along / 0.6) - 0.5) * 0.6, 0.01, fwL), swLine((fract(across / 0.6) - 0.5) * 0.6, 0.01, fwA)) * fade;
    col = pav;
  } else if (kind > 2.5 && kind < 3.5) {
    // apron: packed earth and worn grass between the slab and the lots
    col = mix(vec3(0.30, 0.29, 0.22), vec3(0.34, 0.40, 0.20), smoothstep(0.35, 0.65, fbm3(wp * 0.6 + 3.0))) * (0.9 + 0.2 * grain);
    joint = 0.0;
  } else if (kind > 3.5) {
    // parapet: cast stone
    col = mix(vec3(0.62, 0.60, 0.56), vec3(0.70, 0.68, 0.63), n) * (0.95 + 0.1 * grain);
    joint = swLine((fract(along / 2.0) - 0.5) * 2.0, 0.012, fwL) * fade;
  } else {
    // curb top: paler cast concrete, a worn (darker) nose along its front edge
    float curbTop = (1.0 - step(${CURB_TOP.toFixed(2)}, across)) * (face ? 0.0 : 1.0);
    col = mix(col, conc * 1.08, curbTop * 0.7);
    col *= 1.0 - 0.12 * curbTop * (1.0 - smoothstep(0.0, 0.08, across)) * fade;
    // tree wells (1.5 m squares of soil) on the wide walks, every 12 m; utility covers every ~23 m
    if (slabW >= 2.3) {
      float wc = floor((along + 4.0) / 12.0);
      float wa = along + 4.0 - wc * 12.0 - 6.0;
      float wx = across - (${CURB_TOP.toFixed(2)} + slabW - 1.1);
      float well = step(abs(wa), 0.75) * step(abs(wx), 0.75) * step(0.35, hash12(vec2(wc, 3.0))) * slabFade;
      float rim = well * (1.0 - step(abs(wa), 0.62) * step(abs(wx), 0.62));
      vec3 soil = mix(vec3(0.22, 0.17, 0.12), vec3(0.30, 0.25, 0.16), vnoise(wp * 2.0)) * (0.85 + 0.3 * grain);
      col = mix(col, soil, well * (1.0 - rim));
      col = mix(col, conc * 0.8, rim);
      joint *= 1.0 - well;
    }
    float uc = floor(along / 23.0);
    float ua = along - uc * 23.0 - 11.5 + (hash12(vec2(uc, 9.0)) - 0.5) * 8.0;
    float cover = step(abs(ua), 0.3) * step(abs(across - 0.95), 0.3) * step(0.5, hash12(vec2(uc, 1.0))) * fade;
    col = mix(col, vec3(0.16, 0.16, 0.17), cover);
    if (face) {
      // curb face: shaded, with the gutter grime along its foot (across runs -0.05 at the foot to 0 at the nose)
      col = conc * 0.82 * (0.78 + 0.22 * smoothstep(-0.05, 0.0, across));
      joint = 0.0;
    }
  }
  col *= 1.0 - 0.4 * joint;
  // tactile pad on the dished corner ramps
  if (ramp > 0.03) {
    float dots = mix(smoothstep(0.55, 0.75, vnoise(wp * 7.0)), 0.4, smoothstep(0.05, 0.2, fp));
    vec3 pad = vec3(0.72, 0.52, 0.18) * (0.85 + 0.25 * dots);
    col = mix(col, pad, smoothstep(0.03, 0.2, ramp) * (1.0 - step(${CURB_TOP.toFixed(2)} + 1.2, across)) * (face ? 0.0 : 1.0));
  }
  // damp stain and grime toward the curb, weathering blotches
  col *= 1.0 - 0.1 * smoothstep(0.6, 0.75, fbm3(wp * 0.05 + 8.0));
  diffuseColor.rgb = col;
  roughnessFactor = 0.9 - 0.08 * grain;
  // DEBUG-SW (temporary): kind / across / ramp to emissive
  if (uSwDebug > 0.5) { diffuseColor.rgb = vec3(0.0); totalEmissiveRadiance = vec3(kind / 4.0, clamp(across / 4.0, 0.0, 1.0), ramp); }
}
`;

/** temporary diagnostic toggle (`?dbg=swdebug`) */
export const SW_DEBUG: THREE.IUniform<number> = { value: 0 };

function createSidewalkMaterial(lights: RoadLightUniforms): THREE.MeshStandardMaterial {
  // biased toward the camera against the terrain (nearly coplanar where the slab rides just over the ground)
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uLampMap = lights.uLampMap;
    shader.uniforms.uLampRect = lights.uLampRect;
    shader.uniforms.uLampColor = lights.uLampColor;
    shader.uniforms.uSwDebug = SW_DEBUG;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aSw; varying vec4 vSw; varying vec3 vSwNrm; varying vec3 vWorldPosS;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSw = aSw; vSwNrm = normal; vWorldPosS = (modelMatrix * vec4(position, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${SW_PARS}\nuniform float uSwDebug;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${SW_MAIN}`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * lampPools(vWorldPosS);');
    balanceGroundIbl(shader);
  };
  mat.customProgramCacheKey = () => 'sidewalk-v1';
  return mat;
}

/** emissive codes carried per vertex of the furniture soup (`aEmissive`) */
const EM_NONE = 0, EM_RED = 2, EM_AMBER = 3, EM_GREEN = 4, EM_HAND = 5, EM_WALK = 6;

/** Vertex-coloured PBR material for the furniture soups: `aMatParams` roughness / metalness, `aEmissive` codes the
 *  signal aspect a vertex belongs to and `aPhase` its node's cycle offset (+100 for the cross direction); the
 *  fragment shader lights the aspect that is on at `uSignalTime`. */
function createKitMaterial(uniforms: { uSignalTime: THREE.IUniform<number>; uNight: THREE.IUniform<number> }): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 1, vertexColors: true, emissive: 0xffffff, emissiveIntensity: 1 });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSignalTime = uniforms.uSignalTime;
    shader.uniforms.uNight = uniforms.uNight;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 aMatParams; attribute float aEmissive; attribute float aPhase; varying vec2 vMatParams; varying vec2 vSig;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMatParams = aMatParams; vSig = vec2(aEmissive, aPhase);');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vMatParams; varying vec2 vSig; uniform float uSignalTime; uniform float uNight;')
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vMatParams.x;')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = vMatParams.y;')
      .replace('#include <emissivemap_fragment>', /* glsl */ `
        {
          float code = vSig.x;
          vec3 em = vec3(0.0);
          if (code > 1.5) {
            float parity = step(99.5, vSig.y);
            float t = mod(uSignalTime + vSig.y - parity * 100.0 + parity * ${SIGNAL_HALF.toFixed(1)}, ${(SIGNAL_HALF * 2).toFixed(1)});
            float green = step(t, ${SIGNAL_GREEN.toFixed(1)});
            float amber = step(${SIGNAL_GREEN.toFixed(1)}, t) * step(t, ${(SIGNAL_GREEN + SIGNAL_AMBER).toFixed(1)});
            float red = 1.0 - green - amber;
            float lit = 0.0;
            if (code < 2.5) { em = vec3(1.0, 0.06, 0.02); lit = red; }
            else if (code < 3.5) { em = vec3(1.0, 0.55, 0.05); lit = amber; }
            else if (code < 4.5) { em = vec3(0.15, 1.0, 0.35); lit = green; }
            else if (code < 5.5) { em = vec3(1.0, 0.25, 0.05); lit = 1.0 - green; }
            else { em = vec3(0.95, 0.95, 0.9); lit = green; }
            em *= lit * (3.0 + 4.0 * uNight);
          }
          totalEmissiveRadiance = em;
        }`);
    balanceGroundIbl(shader);
  };
  mat.customProgramCacheKey = () => 'street-kit-v1';
  return mat;
}

// ------------------------------------------------------------------ geometry accumulators

interface SwVert { x: number; y: number; z: number; nx: number; ny: number; nz: number; across: number; along: number; kind: number; w: number }

/** Sidewalk triangle accumulator (indexed strips). */
class WalkSoup {
  readonly pos: number[] = [];
  readonly nrm: number[] = [];
  readonly sw: number[] = [];
  readonly idx: number[] = [];
  /** coarse index over the same vertices: the far LOD (curb foot to curb top to slab back, four triangles a row) */
  readonly idxFar: number[] = [];
  readonly box = new THREE.Box3();
  private count = 0;

  vert(v: SwVert): number {
    this.pos.push(v.x, v.y, v.z);
    this.nrm.push(v.nx, v.ny, v.nz);
    this.sw.push(v.across, v.along, v.kind, v.w);
    this.box.expandByPoint(_v.set(v.x, v.y, v.z));
    return this.count++;
  }

  /** quad a-b-c-d (a, b on the previous row; d, c above them on the next row), wound to face along `n`; `lod` picks
   *  the fine index (0), the far index (1) or both (2) */
  quad(a: number, b: number, c: number, d: number, nx: number, ny: number, nz: number, lod = 0): void {
    const p = this.pos;
    const ax = p[a * 3], ay = p[a * 3 + 1], az = p[a * 3 + 2];
    const bx = p[b * 3] - ax, by = p[b * 3 + 1] - ay, bz = p[b * 3 + 2] - az;
    const cx = p[c * 3] - ax, cy = p[c * 3 + 1] - ay, cz = p[c * 3 + 2] - az;
    const kx = by * cz - bz * cy, ky = bz * cx - bx * cz, kz = bx * cy - by * cx;
    const flip = kx * nx + ky * ny + kz * nz < 0;
    if (lod !== 1) { if (flip) this.idx.push(a, c, b, a, d, c); else this.idx.push(a, b, c, a, c, d); }
    if (lod !== 0) { if (flip) this.idxFar.push(a, c, b, a, d, c); else this.idxFar.push(a, b, c, a, c, d); }
  }

  get triangles(): number { return this.idx.length / 3; }

  build(): THREE.BufferGeometry | null {
    if (!this.idx.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('aSw', new THREE.Float32BufferAttribute(this.sw, 4));
    g.setIndex(this.idx);
    g.boundingBox = this.box.clone();
    g.boundingSphere = this.box.getBoundingSphere(new THREE.Sphere());
    return g;
  }

  /** the far LOD over the fine geometry's vertex buffers */
  buildFar(fine: THREE.BufferGeometry): THREE.BufferGeometry | null {
    if (!this.idxFar.length) return null;
    const g = new THREE.BufferGeometry();
    for (const name of ['position', 'normal', 'aSw']) g.setAttribute(name, fine.getAttribute(name));
    g.setIndex(this.idxFar);
    g.boundingBox = fine.boundingBox;
    g.boundingSphere = fine.boundingSphere;
    return g;
  }
}

/** Furniture triangle soup: unit shapes placed by matrix with colour, roughness / metalness, emissive code and phase. */
class KitSoup {
  readonly pos: number[] = [];
  readonly nrm: number[] = [];
  readonly col: number[] = [];
  readonly par: number[] = [];
  readonly em: number[] = [];
  readonly ph: number[] = [];
  readonly box = new THREE.Box3();

  add(unit: THREE.BufferGeometry, m: THREE.Matrix4, color: THREE.Color, rough: number, metal: number, em = EM_NONE, phase = 0): void {
    const p = unit.getAttribute('position'), n = unit.getAttribute('normal');
    _nm.getNormalMatrix(m);
    for (let i = 0; i < p.count; i++) {
      _v.set(p.getX(i), p.getY(i), p.getZ(i)).applyMatrix4(m);
      this.pos.push(_v.x, _v.y, _v.z);
      this.box.expandByPoint(_v);
      _v.set(n.getX(i), n.getY(i), n.getZ(i)).applyMatrix3(_nm).normalize();
      this.nrm.push(_v.x, _v.y, _v.z);
      this.col.push(color.r, color.g, color.b);
      this.par.push(rough, metal);
      this.em.push(em);
      this.ph.push(phase);
    }
  }

  get triangles(): number { return this.pos.length / 9; }

  build(): THREE.BufferGeometry | null {
    if (!this.pos.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('aMatParams', new THREE.Float32BufferAttribute(this.par, 2));
    g.setAttribute('aEmissive', new THREE.Float32BufferAttribute(this.em, 1));
    g.setAttribute('aPhase', new THREE.Float32BufferAttribute(this.ph, 1));
    g.boundingBox = this.box.clone();
    g.boundingSphere = this.box.getBoundingSphere(new THREE.Sphere());
    return g;
  }
}

const _v = new THREE.Vector3();
const _nm = new THREE.Matrix3();
const _m = new THREE.Matrix4();
const _m2 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();

/** Every carriageway of the network in a 100 m grid: footings are checked against it so that nothing planned from one
 *  road's frame (a corner lamp, a signal pole behind a skewed crossing, a highway lamp beside a frontage street) ends
 *  up standing in another road. */
class RoadIndex {
  private static readonly G = 100;
  private readonly cells = new Map<number, { ax: number; az: number; bx: number; bz: number; hw: number }[]>();

  constructor(chains: RoadChain[]) {
    const G = RoadIndex.G;
    for (const c of chains) {
      for (let i = 0; i < c.pts.length - 1; i++) {
        const seg = { ax: c.pts[i][0], az: c.pts[i][1], bx: c.pts[i + 1][0], bz: c.pts[i + 1][1], hw: c.hw };
        const pad = c.hw + 2;
        const x0 = Math.floor((Math.min(seg.ax, seg.bx) - pad) / G), x1 = Math.floor((Math.max(seg.ax, seg.bx) + pad) / G);
        const z0 = Math.floor((Math.min(seg.az, seg.bz) - pad) / G), z1 = Math.floor((Math.max(seg.az, seg.bz) + pad) / G);
        for (let gx = x0; gx <= x1; gx++) for (let gz = z0; gz <= z1; gz++) {
          const k = gx * 65536 + gz;
          let l = this.cells.get(k);
          if (!l) { l = []; this.cells.set(k, l); }
          l.push(seg);
        }
      }
    }
  }

  /** Signed distance to the nearest carriageway edge: negative inside a road, positive on the verge. */
  distance(x: number, z: number): number {
    const G = RoadIndex.G;
    const k = Math.floor(x / G) * 65536 + Math.floor(z / G);
    const l = this.cells.get(k);
    let best = Infinity;
    if (!l) return best;
    for (const s of l) {
      const abx = s.bx - s.ax, abz = s.bz - s.az, apx = x - s.ax, apz = z - s.az;
      const t = clamp((apx * abx + apz * abz) / (abx * abx + abz * abz || 1), 0, 1);
      const d = Math.hypot(apx - abx * t, apz - abz * t) - s.hw;
      if (d < best) best = d;
    }
    return best;
  }

  /** true when (x, z) stands on the verge, at least `clear` metres outside every carriageway */
  clear(x: number, z: number, clear = 0.2): boolean { return this.distance(x, z) >= clear; }
}

/** unit shapes of the furniture (non-indexed, centred; cylinders and plates along +y, the x-plate faces +x) */
const UNIT = {
  box: new THREE.BoxGeometry(1, 1, 1).toNonIndexed(),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 8).toNonIndexed(),
  cyl6: new THREE.CylinderGeometry(0.5, 0.5, 1, 6).toNonIndexed(),
  /** open-ended 8-gon tube: poles, whose ends are capped by something else or out of sight */
  tube: new THREE.CylinderGeometry(0.5, 0.5, 1, 8, 1, true).toNonIndexed(),
  /** octagonal plate of diameter 1 in the y-z plane facing +x */
  plate: new THREE.CircleGeometry(0.5, 8).rotateY(Math.PI / 2).toNonIndexed(),
  sphere: new THREE.SphereGeometry(0.5, 8, 6).toNonIndexed(),
};

/** A frame at (x, y, z) whose +x points along `yaw` (atan2 convention on the xz plane: (cos yaw, 0, -sin yaw)). */
function frame(x: number, y: number, z: number, yaw: number): THREE.Matrix4 {
  return new THREE.Matrix4().makeRotationY(yaw).setPosition(x, y, z);
}

/** Place `unit` scaled to (w, h, d) with its centre at local (cx, cy, cz) of `f`. */
function part(soup: KitSoup, unit: THREE.BufferGeometry, f: THREE.Matrix4, cx: number, cy: number, cz: number, w: number, h: number, d: number, color: THREE.Color, rough: number, metal: number, em = EM_NONE, phase = 0, rotZ = 0): void {
  _p.set(cx, cy, cz);
  _q.setFromEuler(_e.set(0, 0, rotZ));
  _s.set(w, h, d);
  _m2.compose(_p, _q, _s);
  _m.multiplyMatrices(f, _m2);
  soup.add(unit, _m, color, rough, metal, em, phase);
}
const _e = new THREE.Euler();

const C = {
  galv: new THREE.Color(0x8d949a),
  dark: new THREE.Color(0x2a2c2e),
  signal: new THREE.Color(0x1f2a1f),
  black: new THREE.Color(0x141416),
  lensOff: new THREE.Color(0x202020),
  green: new THREE.Color(0x1f6b3a),
  signGreen: new THREE.Color(0x1d6b3c),
  red: new THREE.Color(0xb8261c),
  white: new THREE.Color(0xeeeeea),
  wood: new THREE.Color(0x6e4f33),
  glass: new THREE.Color(0x9fc4d6),
  concrete: new THREE.Color(0xb3b0a8),
  hydrant: new THREE.Color(0xd23a2a),
  cabinet: new THREE.Color(0x8f9a92),
  stone: new THREE.Color(0xa9a49a),
};

// ------------------------------------------------------------------ the streets system

interface StreetCell {
  key: number;
  box: THREE.Box3;
  center: THREE.Vector3;
  r: number;
  /** coarse sidewalk index over the same vertices, drawn beyond WALK_NEAR */
  walkFar: THREE.Mesh | null;
  walk: THREE.Mesh | null;
  large: THREE.Mesh | null;
  small: THREE.Mesh | null;
  height: number;
}

interface Run { chain: RoadChain; side: 1 | -1; sa: number; sb: number; zone: Zone | null; w: number; light: boolean }

function unitDir(a: Vec2, b: Vec2): Vec2 {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const l = Math.hypot(dx, dz) || 1;
  return [dx / l, dz / l];
}

/** slab width (m) behind the curb top by zone; -1 = no sidewalk at all */
function walkWidth(zone: Zone | null): number {
  switch (zone) {
    case Zone.DOWNTOWN: return 2.7;
    case Zone.RES_MID: case Zone.HOTEL: return 2.4;
    case Zone.INDUSTRIAL: return 1.7;
    case Zone.RES_LOW: return 1.2;
    case Zone.PARK: case Zone.LOT: case Zone.CONSTRUCTION: case Zone.STADIUM: case Zone.MARINA: return 1.5;
    default: return -1;
  }
}
const URBAN = new Set<Zone>([Zone.DOWNTOWN, Zone.RES_MID, Zone.HOTEL, Zone.INDUSTRIAL]);
const DENSE = new Set<Zone>([Zone.DOWNTOWN, Zone.RES_MID, Zone.HOTEL]);

export class Streets {
  readonly group = new THREE.Group();
  readonly materials: THREE.Material[] = [];
  readonly lamps: LampPlan[] = [];
  readonly walkMaterial: THREE.MeshStandardMaterial;
  readonly kitMaterial: THREE.MeshStandardMaterial;
  readonly uniforms = { uSignalTime: { value: 0 } as THREE.IUniform<number>, uNight: { value: 0 } as THREE.IUniform<number> };
  private readonly cells: StreetCell[] = [];
  private readonly builds = new Map<number, { walk: WalkSoup; large: KitSoup; small: KitSoup }>();
  counts = { runs: 0, corners: 0, signals: 0, stops: 0, lamps: 0, walkTriangles: 0, kitTriangles: 0, cells: 0, rejected: 0 };
  private readonly roads: RoadIndex;
  /** debug: `?dbg=nopools` turns the lamp pools off */
  poolsEnabled = true;
  /** signal pole footings per signalised node (the corner lamps keep clear of them) */
  readonly signalPoles = new Map<RoadNode, Vec2[]>();
  /** the lamp irradiance map's texture (owned here, sampled through `lights`) */
  private lampMap: THREE.DataTexture | null = null;

  constructor(private readonly map: WorldMap, private readonly graph: RoadGraph, private readonly lights: RoadLightUniforms, private readonly markOccupied: (x: number, z: number, r: number) => void) {
    this.walkMaterial = createSidewalkMaterial(lights);
    this.kitMaterial = createKitMaterial(this.uniforms);
    this.materials.push(this.walkMaterial, this.kitMaterial);
    this.roads = new RoadIndex(graph.chains);
    const signalPoles = this.signalPoles;
    for (const chain of graph.chains) {
      if (chain.cls === 'highway' || chain.cls === 'causeway') { this.planHighwayLamps(chain); continue; }
      if (chain.cls !== 'arterial' && chain.cls !== 'street') continue;
      if (chain.s1 - chain.s0 < 2) continue;
      for (const side of [-1, 1] as const) for (const run of this.sideRuns(chain, side)) this.buildRun(run);
    }
    for (const node of graph.nodes) {
      if (node.signal) this.buildSignals(node, signalPoles);
      else this.buildStopSigns(node);
      for (const k of node.corners) this.buildCorner(k, signalPoles.get(node) ?? []);
    }
    this.buildPromenade();
    this.flush();
    this.buildLampMap();
    this.counts.lamps = this.lamps.length;
  }

  // ---------------------------------------------------------------- runs (block faces)

  /** The sidewalk runs of one side of a chain: the paved range minus the gaps where crossing roads pass (between the
   *  two curb-return tangent points of a node on this side) and minus the end beyond the last tangent point of a stub. */
  private sideRuns(chain: RoadChain, side: 1 | -1): Run[] {
    const byNode = new Map<RoadNode, number[]>();
    const put = (node: RoadNode, s: number) => { let l = byNode.get(node); if (!l) { l = []; byNode.set(node, l); } l.push(s); };
    for (const cn of chain.nodes) for (const k of cn.node.corners) {
      if (k.a.chain === chain && k.sideA === side) put(cn.node, k.sA);
      if (k.b.chain === chain && k.sideB === side) put(cn.node, k.sB);
    }
    const gaps: [number, number][] = [];
    for (const cn of chain.nodes) {
      const list = byNode.get(cn.node);
      const atStart = cn.s < 1.5, atEnd = cn.s > chain.length - 1.5;
      if (!list) {
        // no curb return on this side: a T seen from the through road (continuous walk) or a stub end
        if (atStart) gaps.push([-Infinity, cn.s + cn.hPlus]);
        else if (atEnd) gaps.push([cn.s - cn.hMinus, Infinity]);
        continue;
      }
      if (list.length >= 2) gaps.push([Math.min(...list), Math.max(...list)]);
      else if (atStart) gaps.push([-Infinity, list[0]]);
      else if (atEnd) gaps.push([list[0], Infinity]);
      else gaps.push([cn.s - cn.hMinus - 1, cn.s + cn.hPlus + 1]);
    }
    gaps.sort((a, b) => a[0] - b[0]);
    const runs: Run[] = [];
    let s = chain.s0;
    const end = chain.s1;
    const push = (sa: number, sb: number) => {
      if (sb - sa < 2) return;
      const mid = frameAt(chain, this.crossOf(chain), (sa + sb) / 2);
      const zone = this.map.districtAt(mid.x + mid.cx * (chain.hw + 2) * side, mid.z + mid.cz * (chain.hw + 2) * side)?.zone ?? null;
      const w = walkWidth(zone);
      if (w < 0) return;
      runs.push({ chain, side, sa, sb, zone, w, light: zone === Zone.RES_LOW });
    };
    for (const g of gaps) {
      if (g[1] < s) continue;
      if (g[0] > s) push(s, Math.min(g[0], end));
      s = Math.max(s, g[1]);
      if (s >= end) break;
    }
    if (s < end) push(s, end);
    return runs;
  }

  private readonly crossCache = new Map<RoadChain, Vec2[]>();
  private crossOf(chain: RoadChain): Vec2[] {
    let c = this.crossCache.get(chain);
    if (!c) { c = chainCross(chain); this.crossCache.set(chain, c); }
    return c;
  }

  private soupsAt(x: number, z: number): { walk: WalkSoup; large: KitSoup; small: KitSoup } {
    const key = cellKey(x, z, CELL);
    let b = this.builds.get(key);
    if (!b) { b = { walk: new WalkSoup(), large: new KitSoup(), small: new KitSoup() }; this.builds.set(key, b); }
    return b;
  }

  /** The sidewalk profile at one point of the curb line: `n` is the unit across vector pointing away from the road
   *  (mitred at bends, so |n| may exceed 1 there), `yRoad` the pavement edge height. Returns the row's vertex indices. */
  private profileRow(soup: WalkSoup, x: number, z: number, nx: number, nz: number, yRoad: number, along: number, run: { w: number; light: boolean; kind: number }, ramp: number, radiusCap = Infinity): number[] {
    const nl = Math.hypot(nx, nz) || 1;
    const ux = nx / nl, uz = nz / nl;
    const h = CURB_H * (1 - 0.87 * ramp);
    const yTop = yRoad + h, yFull = yRoad + CURB_H;
    const W = run.w, wCode = Math.round(W * 10);
    const at = (across: number) => { const a = Math.min(across, radiusCap); return { x: x + nx * a, z: z + nz * a }; };
    const out: number[] = [];
    const face = (across: number, y: number) => { const p = at(across); out.push(soup.vert({ x: p.x, y, z: p.z, nx: -ux, ny: 0, nz: -uz, across, along, kind: run.kind, w: wCode + ramp })); };
    const top = (across: number, y: number, kind = run.kind) => { const p = at(across); out.push(soup.vert({ x: p.x, y, z: p.z, nx: 0, ny: 1, nz: 0, across, along, kind, w: wCode + ramp })); return p; };
    // the curb is tied to the pavement edge; the slab behind it rides over the ground where the ground rises above
    // the curb level (the terrain is not flat across a block face), so it never z-fights with the terrain
    const slabY = (across: number) => { const p = at(across); return Math.max(yFull, this.map.heightAt(p.x, p.z) + SLAB_CLEAR); };
    face(-0.05, yRoad - 0.04);
    face(0, yTop);
    top(0, yTop);
    top(CURB_TOP, yTop);
    if (run.light) {
      top(CURB_TOP + W, slabY(CURB_TOP + W));
    } else {
      top(Math.min(1.5, CURB_TOP + W), slabY(Math.min(1.5, CURB_TOP + W)));
      const yBack = slabY(CURB_TOP + W);
      top(CURB_TOP + W, yBack);
      top(CURB_TOP + W, yBack, K_APRON); // the apron quad is apron on both edges (kinds do not interpolate)
      const ap = at(CURB_TOP + W + 0.6);
      const g = this.map.heightAt(ap.x, ap.z) + 0.03;
      top(CURB_TOP + W + 0.6, Math.min(g, yBack - 0.02), K_APRON);
    }
    return out;
  }

  /** connect two profile rows: face quad, curb top, slab(s), apron */
  private link(soup: WalkSoup, a: number[], b: number[]): void {
    soup.quad(a[0], a[1], b[1], b[0], soup.nrm[a[0] * 3], 0, soup.nrm[a[0] * 3 + 2]);
    for (let i = 2; i < a.length - 1; i++) {
      if (soup.sw[a[i] * 4] === soup.sw[a[i + 1] * 4]) continue; // duplicate vertex (kind change), zero width
      soup.quad(a[i], a[i + 1], b[i + 1], b[i], 0, 1, 0);
    }
    // far LOD: curb foot to curb top (a slanted face) and one slab quad to the back of the walk (no apron)
    const back = a.length >= 8 ? 5 : a.length - 1;
    soup.quad(a[0], a[3], b[3], b[0], soup.nrm[a[0] * 3], 1, soup.nrm[a[0] * 3 + 2], 1);
    soup.quad(a[3], a[back], b[back], b[3], 0, 1, 0, 1);
  }

  private buildRun(run: Run): void {
    const { chain, side, sa, sb } = run;
    const cross = this.crossOf(chain);
    const mid = frameAt(chain, cross, (sa + sb) / 2);
    const cellSoups = this.soupsAt(mid.x + mid.cx * (chain.hw + 1) * side, mid.z + mid.cz * (chain.hw + 1) * side);
    const soup = cellSoups.walk;
    // rows: the run ends plus every pavement row inside it (so the curb foot follows the pavement edge exactly)
    const rows = [sa];
    for (const s of chain.rows) if (s > sa + 0.05 && s < sb - 0.05) rows.push(s);
    rows.push(sb);
    rows.sort((u, v) => u - v);
    const kind = K_WALK;
    let prev: number[] | null = null;
    for (const s of rows) {
      const f = frameAt(chain, cross, s);
      const nx = f.cx * side, nz = f.cz * side;
      const ex = f.x + nx * chain.hw, ez = f.z + nz * chain.hw;
      const yRoad = roadEdgeY(chain, s, side);
      const row = this.profileRow(soup, ex, ez, nx, nz, yRoad, s, { w: run.w, light: run.light, kind }, 0);
      if (prev) this.link(soup, prev, row);
      prev = row;
    }
    this.counts.runs++;
    // lamps and furniture along the run
    this.dressRun(run, cellSoups);
  }

  /** Curb return: the profile extruded along the arc from ta to tb (normals toward the arc centre), dished into a
   *  ramp over its middle. */
  private buildCorner(k: RoadCorner, poles: Vec2[]): void {
    const chain = k.a.chain;
    const zone = this.map.districtAt(k.o[0], k.o[1])?.zone ?? null;
    const w = walkWidth(zone);
    if (w < 0) return;
    const light = zone === Zone.RES_LOW;
    const soups = this.soupsAt(k.o[0], k.o[1]);
    const soup = soups.walk;
    const n = k.arc.length;
    // along-position: continue chain a's along over the arc
    let along = k.sA;
    let prev: number[] | null = null;
    const cap = k.r - 0.3;
    for (let i = 0; i < n; i++) {
      const p = k.arc[i];
      const u = i / (n - 1);
      const nx = (k.o[0] - p[0]) / k.r, nz = (k.o[1] - p[1]) / k.r;
      // the pavement height under the arc: blend the two edges' heights by arc parameter
      const ya = roadEdgeY(k.a.chain, k.sA, k.sideA), yb = roadEdgeY(k.b.chain, k.sB, k.sideB);
      const yRoad = ya + (yb - ya) * u;
      const ramp = 0.98 * smooth(0.2, 0.42, u) * smooth(0.8, 0.58, u);
      const row = this.profileRow(soup, p[0], p[1], nx, nz, yRoad, along, { w, light, kind: K_WALK }, ramp, cap);
      if (prev) this.link(soup, prev, row);
      prev = row;
      if (i < n - 1) along += Math.hypot(k.arc[i + 1][0] - p[0], k.arc[i + 1][1] - p[1]);
    }
    this.counts.corners++;
    // a lamp at the corner (on the curb line, 0.75 m behind the curb face), kept clear of the signal poles;
    // low-density suburbs light two diagonal corners of a crossing, not four
    if (zone === Zone.RES_LOW && k.a.chain.cls !== 'arterial' && k.b.chain.cls !== 'arterial' && (k.sideA > 0) !== (k.a.chain.id % 2 === 0)) return;
    const midIdx = n >> 1;
    const mid = k.arc[midIdx];
    const cands: { x: number; z: number; tx: number; tz: number }[] = [];
    const back = (p: Vec2, ox: number, oz: number, d: number) => ({ x: p[0] + ox * d, z: p[1] + oz * d });
    const nmid = unitDir(mid, k.o);
    cands.push({ ...back(mid, nmid[0], nmid[1], 0.75), tx: k.node.x, tz: k.node.z });
    const na = unitDir(k.ta, [k.ta[0] + (k.o[0] - k.ta[0]), k.ta[1] + (k.o[1] - k.ta[1])]);
    const pa = back([k.ta[0] + k.a.dir[0] * 1.5, k.ta[1] + k.a.dir[1] * 1.5], na[0], na[1], 0.75);
    cands.push({ ...pa, tx: pa.x - na[0], tz: pa.z - na[1] });
    const nb = unitDir(k.tb, k.o);
    const pb = back([k.tb[0] + k.b.dir[0] * 1.5, k.tb[1] + k.b.dir[1] * 1.5], nb[0], nb[1], 0.75);
    cands.push({ ...pb, tx: pb.x - nb[0], tz: pb.z - nb[1] });
    let best: typeof cands[0] | null = null, bestD = -1;
    for (const c of cands) {
      if (!this.roads.clear(c.x, c.z, 0.3)) continue;
      let d = Infinity;
      for (const p of poles) d = Math.min(d, Math.hypot(p[0] - c.x, p[1] - c.z));
      if (d > bestD) { bestD = d; best = c; }
      if (d > 2.5) break;
    }
    if (!best) { this.counts.rejected++; return; }
    const kind: LampKind = chain.cls === 'arterial' || k.b.chain.cls === 'arterial' ? 'arterial' : 'street';
    const y = Math.max(roadEdgeY(k.a.chain, k.sA, k.sideA), roadEdgeY(k.b.chain, k.sB, k.sideB)) + CURB_H;
    this.lamps.push({ x: best.x, y, z: best.z, yaw: Math.atan2(-(best.tz - best.z), best.tx - best.x), kind });
  }

  /** Plan a lamp unless its footing would stand in a carriageway (a crossing road the planning frame knows nothing of). */
  private lamp(x: number, y: number, z: number, yaw: number, kind: LampKind): void {
    if (!this.roads.clear(x, z, 0.3)) { this.counts.rejected++; return; }
    this.lamps.push({ x, y, z, yaw, kind });
  }

  /** Lamps (both sides on arterials, staggered on streets) and the furniture kits along a run. */
  private dressRun(run: Run, soups: { walk: WalkSoup; large: KitSoup; small: KitSoup }): void {
    const { chain, side, sa, sb, zone } = run;
    const cross = this.crossOf(chain);
    const L = sb - sa;
    const arterial = chain.cls === 'arterial';
    const pitch = arterial ? 40 : zone === Zone.RES_LOW ? 55 : 45;
    const h = hash2(Math.round(chain.id * 7 + sa), side, 3);
    const yAt = (s: number) => roadEdgeY(chain, s, side) + CURB_H;
    const at = (s: number, across: number) => {
      const f = frameAt(chain, cross, s);
      return { x: f.x + f.cx * side * (chain.hw + across), z: f.z + f.cz * side * (chain.hw + across), nx: f.cx * side, nz: f.cz * side, dx: 0, dz: 0 };
    };
    const yawToRoad = (nx: number, nz: number) => Math.atan2(nz, -nx); // +x of the unit toward -n (the roadway)
    // low-density suburbs light one side of the street only (the side alternates per chain)
    const lit = zone !== Zone.RES_LOW || side === (chain.id % 2 === 0 ? 1 : -1);
    if (lit && L >= 30) {
      const n = Math.floor((L - 12) / pitch);
      if (n === 0) {
        const s = (sa + sb) / 2, q = at(s, 0.65);
        this.lamp(q.x, yAt(s), q.z, yawToRoad(q.nx, q.nz), arterial ? 'arterial' : 'street');
      } else {
        const p = (L - 12) / n;
        const stagger = arterial ? 0 : side > 0 ? 0 : p / 2;
        for (let i = 0; i <= n; i++) {
          const s = sa + 6 + i * p + stagger;
          if (s > sb - 6) continue;
          const q = at(s, 0.65);
          this.lamp(q.x, yAt(s), q.z, yawToRoad(q.nx, q.nz), arterial ? 'arterial' : 'street');
        }
      }
    }
    if (!DENSE.has(zone as Zone) && zone !== Zone.INDUSTRIAL && zone !== Zone.PARK) return;
    const dense = DENSE.has(zone as Zone);
    const W = run.w;
    const dir = chainFrame(chain, (sa + sb) / 2);
    const runYaw = Math.atan2(-dir.dz, dir.dx);
    const put = (kind: 'bench' | 'bin' | 'hydrant' | 'shelter' | 'cabinet', s: number, across: number) => {
      const q = at(s, across);
      if (!this.roads.clear(q.x, q.z, kind === 'shelter' ? 1.2 : 0.4)) { this.counts.rejected++; return; }
      const y = yAt(s);
      const faceYaw = yawToRoad(q.nx, q.nz);
      const soup = kind === 'shelter' ? soups.large : soups.small;
      switch (kind) {
        case 'bench': {
          const f = frame(q.x, y, q.z, faceYaw);
          part(soup, UNIT.box, f, 0, 0.45, 0, 0.45, 0.05, 1.7, C.wood, 0.85, 0);
          part(soup, UNIT.box, f, -0.2, 0.72, 0, 0.05, 0.4, 1.7, C.wood, 0.85, 0);
          part(soup, UNIT.box, f, 0, 0.22, 0.7, 0.4, 0.44, 0.06, C.dark, 0.6, 0.6);
          part(soup, UNIT.box, f, 0, 0.22, -0.7, 0.4, 0.44, 0.06, C.dark, 0.6, 0.6);
          break;
        }
        case 'bin':
          part(soup, UNIT.cyl, frame(q.x, y, q.z, 0), 0, 0.48, 0, 0.6, 0.96, 0.6, C.green, 0.7, 0.3);
          part(soup, UNIT.cyl, frame(q.x, y, q.z, 0), 0, 0.99, 0, 0.64, 0.06, 0.64, C.black, 0.6, 0.4);
          break;
        case 'hydrant': {
          const f = frame(q.x, y, q.z, faceYaw);
          part(soup, UNIT.cyl6, f, 0, 0.4, 0, 0.26, 0.8, 0.26, C.hydrant, 0.5, 0.2);
          part(soup, UNIT.cyl6, f, 0, 0.86, 0, 0.3, 0.12, 0.3, C.hydrant, 0.5, 0.2);
          part(soup, UNIT.box, f, 0, 0.55, 0, 0.46, 0.14, 0.14, C.hydrant, 0.5, 0.2);
          break;
        }
        case 'cabinet':
          part(soup, UNIT.box, frame(q.x, y, q.z, runYaw), 0, 0.7, 0, 1.2, 1.4, 0.55, C.cabinet, 0.55, 0.4);
          break;
        case 'shelter': {
          // roof over the back of the walk, glazed back and one end, two posts; open toward the curb
          const f = frame(q.x, y, q.z, faceYaw);
          part(soup, UNIT.box, f, 0.6, 2.45, 0, 1.6, 0.08, 3.6, C.dark, 0.5, 0.5);
          part(soup, UNIT.box, f, 0.05, 1.25, -1.7, 0.08, 2.4, 0.08, C.galv, 0.45, 0.7);
          part(soup, UNIT.box, f, 0.05, 1.25, 1.7, 0.08, 2.4, 0.08, C.galv, 0.45, 0.7);
          part(soup, UNIT.box, f, 1.3, 1.25, -1.7, 0.08, 2.4, 0.08, C.galv, 0.45, 0.7);
          part(soup, UNIT.box, f, 1.3, 1.25, 1.7, 0.08, 2.4, 0.08, C.galv, 0.45, 0.7);
          part(soup, UNIT.box, f, 0.05, 1.3, 0, 0.03, 2.1, 3.3, C.glass, 0.15, 0.8);
          part(soup, UNIT.box, f, 0.65, 1.3, -1.72, 1.1, 2.1, 0.03, C.glass, 0.15, 0.8);
          part(soup, UNIT.box, f, 0.7, 0.5, 0.3, 0.4, 0.06, 1.6, C.dark, 0.7, 0.4);
          part(soup, UNIT.box, f, 0.7, 0.25, 0.3, 0.08, 0.44, 1.5, C.dark, 0.7, 0.4);
          this.markOccupied(q.x, q.z, 2);
          break;
        }
      }
    };
    if (L < 24) return;
    const back = CURB_TOP + W - 0.55;
    if (dense) {
      if (h < 0.6) put('bench', sa + L * (0.3 + 0.2 * h), back);
      if (h > 0.45 && L > 70) put('bench', sa + L * 0.72, back);
      if (hash2(Math.round(sa), chain.id, side + 11) < 0.7) put('bin', sa + 4.5, 0.75);
      if (hash2(Math.round(sb), chain.id, side + 12) < 0.45) put('bin', sb - 4.5, 0.75);
      if (hash2(Math.round(sa), chain.id, side + 13) < 0.45) put('hydrant', sa + L * (0.55 + 0.3 * h), 0.7);
      if (L > 60 && W >= 2.3 && hash2(Math.round(sa), chain.id, side + 14) < (arterial ? 0.3 : 0.16)) put('shelter', sa + L * 0.5, back + 0.35);
      if (W >= 2.3 && hash2(Math.round(sa), chain.id, side + 15) < 0.14) put('cabinet', sa + L * 0.85, back);
    } else {
      if (hash2(Math.round(sa), chain.id, side + 13) < 0.3) put('hydrant', sa + L * (0.55 + 0.3 * h), 0.7);
      if (zone === Zone.PARK && h < 0.5) put('bench', sa + L * 0.5, back);
      if (zone === Zone.INDUSTRIAL && hash2(Math.round(sa), chain.id, side + 15) < 0.2) put('cabinet', sa + L * 0.8, back);
    }
  }

  // ---------------------------------------------------------------- intersections

  /** Mast-arm signals for every approach of a signalised node: pole at the far-right corner (as the approaching
   *  driver sees it), arm over the approach lanes with a three-aspect head per lane facing the approach, a pedestrian
   *  head on the pole facing along the crosswalk and a street-name blade. Aspects are timed by node phase. */
  private buildSignals(node: RoadNode, poles: Map<RoadNode, Vec2[]>): void {
    const chains = [...new Set(node.rays.map((r) => r.chain))];
    const rank = (c: RoadChain) => (c.cls === 'arterial' ? 2 : c.cls === 'street' ? 1 : 0);
    chains.sort((a, b) => rank(b) - rank(a) || a.id - b.id);
    const primary = chains[0];
    const offset = hash2(Math.round(node.x), Math.round(node.z), 5) * SIGNAL_HALF * 2;
    const list: Vec2[] = [];
    poles.set(node, list);
    for (const R of node.rays) this.mastArm(node, R, R.chain === primary ? 0 : 1, offset, list);
    this.counts.signals++;
  }

  private mastArm(node: RoadNode, R: RoadRay, parity: number, offset: number, poles: Vec2[]): void {
    const c = R.chain;
    const cn = c.nodes.find((n) => n.node === node);
    if (!cn) return;
    // the approach arrives travelling -R.dir; its lanes are on the driver's right
    const rx = R.dir[1], rz = -R.dir[0];
    const reachFar = R.sign > 0 ? cn.hMinus : cn.hPlus;
    const hw = c.hw;
    let px = node.x - R.dir[0] * (reachFar + 1.6) + rx * (hw + 0.9);
    let pz = node.z - R.dir[1] * (reachFar + 1.6) + rz * (hw + 0.9);
    // a skewed crossing road reaches further along the approach than the box says: back off until on the verge
    let backed = 0;
    while (!this.roads.clear(px, pz, 0.4) && backed < 8) { px -= R.dir[0] * 0.5; pz -= R.dir[1] * 0.5; backed += 0.5; }
    if (backed >= 8 || this.map.heightAt(px, pz) < 0.8) { this.counts.rejected++; return; }
    poles.push([px, pz]);
    // the pole, arm, heads and lenses read to 1.5 km; visors, pedestrian heads, buttons and blades are small-kit
    const soups = this.soupsAt(px, pz);
    const soup = soups.large, fine = soups.small;
    const y = roadEdgeY(c, R.s, R.sign > 0 ? -1 : 1) + CURB_H;
    // frame: +x toward the approaching traffic (R.dir); +z is then -right, i.e. from the pole toward the roadway
    const f = frame(px, y, pz, Math.atan2(-R.dir[1], R.dir[0]));
    const phase = offset + parity * 100;
    const pedPhase = offset + (1 - parity) * 100;
    const armH = 6.0;
    part(soup, UNIT.tube, f, 0, armH / 2 + 0.15, 0, 0.3, armH + 0.3, 0.3, C.galv, 0.45, 0.7);
    part(soup, UNIT.box, f, 0, armH + 0.32, 0, 0.34, 0.06, 0.34, C.galv, 0.45, 0.7); // pole cap
    part(soup, UNIT.cyl6, f, 0, 0.12, 0, 0.5, 0.24, 0.5, C.concrete, 0.9, 0);
    const lanes = c.lanes >= 4 ? [1.5, 4.7] : [1.8];
    // arm over the roadway, long enough to reach the innermost approach lane
    const armLen = hw + 0.9 - lanes[0] + 0.6;
    part(soup, UNIT.box, f, 0, armH, armLen / 2, 0.16, 0.16, armLen, C.galv, 0.45, 0.7);
    part(soup, UNIT.box, f, 0, armH - 0.3, 0.35, 0.14, 0.7, 0.7, C.galv, 0.45, 0.7); // arm bracket
    const head = (hz: number, hy: number) => {
      part(soup, UNIT.box, f, 0, hy, hz, 0.3, 1.05, 0.36, C.signal, 0.6, 0.3);
      const lens = (dy: number, em: number) => {
        part(soup, UNIT.plate, f, 0.16, hy + dy, hz, 1, 0.26, 0.26, C.lensOff, 0.3, 0.1, em, phase);
        part(fine, UNIT.box, f, 0.2, hy + dy + 0.15, hz, 0.24, 0.03, 0.3, C.signal, 0.6, 0.3); // visor
      };
      lens(0.34, EM_RED); lens(0, EM_AMBER); lens(-0.34, EM_GREEN);
    };
    for (const l of lanes) head(hw + 0.9 - l, armH - 0.62);
    if (lanes.length === 1) head(0.5, 4.3); // pole-side head on two-lane approaches
    // pedestrian head facing along the crosswalk (toward the far curb), hand / walk lenses
    part(fine, UNIT.box, f, 0, 2.7, 0.28, 0.3, 0.4, 0.26, C.signal, 0.6, 0.3);
    part(fine, UNIT.box, f, 0, 2.7, 0.42, 0.2, 0.2, 0.02, C.lensOff, 0.3, 0.1, EM_HAND, pedPhase);
    part(fine, UNIT.box, f, 0, 2.7, 0.42, 0.2, 0.2, 0.02, C.lensOff, 0.3, 0.1, EM_WALK, pedPhase);
    // push-button plate and street-name blade
    part(fine, UNIT.box, f, 0.17, 1.1, 0, 0.04, 0.12, 0.08, C.dark, 0.5, 0.5);
    part(fine, UNIT.box, f, 0, 3.6, 0.7, 0.03, 0.22, 0.9, C.signGreen, 0.5, 0.2);
    part(fine, UNIT.box, f, 0.02, 3.6, 0.7, 0.01, 0.06, 0.6, C.white, 0.5, 0.1);
  }

  /** Stop signs on the near-right corner of each stop-controlled approach (plus a street-name blade). */
  private buildStopSigns(node: RoadNode): void {
    for (const R of node.rays) {
      if (!node.stops.has(R.chain)) continue;
      const c = R.chain;
      const cn = c.nodes.find((n) => n.node === node);
      if (!cn) continue;
      const rx = R.dir[1], rz = -R.dir[0];
      const reachNear = R.sign > 0 ? cn.hPlus : cn.hMinus;
      const px = node.x + R.dir[0] * (reachNear + 1.2) + rx * (c.hw + 0.8);
      const pz = node.z + R.dir[1] * (reachNear + 1.2) + rz * (c.hw + 0.8);
      if (this.map.heightAt(px, pz) < 0.8 || !this.roads.clear(px, pz, 0.3)) { this.counts.rejected++; continue; }
      const zone = this.map.districtAt(px, pz)?.zone ?? null;
      if (walkWidth(zone) < 0) continue;
      // a 0.76 m plate is under a pixel long before the small-kit distance: the sign lives in the small soup
      const soup = this.soupsAt(px, pz).small;
      const y = roadEdgeY(c, R.s, R.sign > 0 ? -1 : 1) + CURB_H;
      const f = frame(px, y, pz, Math.atan2(-R.dir[1], R.dir[0]));
      part(soup, UNIT.box, f, 0, 1.2, 0, 0.06, 2.4, 0.06, C.galv, 0.5, 0.6);
      part(soup, UNIT.plate, f, 0.04, 2.1, 0, 1, 0.76, 0.76, C.red, 0.5, 0.1);
      part(soup, UNIT.box, f, 0.05, 2.1, 0, 0.005, 0.11, 0.52, C.white, 0.5, 0.1);
      part(soup, UNIT.box, f, 0, 2.62, 0.3, 0.02, 0.2, 0.7, C.signGreen, 0.5, 0.2);
      this.counts.stops++;
    }
  }

  // ---------------------------------------------------------------- promenade

  /** Bayfront promenade: where the downtown / bayfront arterial runs within 150 m of the water, a paved 4 m walk
   *  with a parapet 5 m inland of the seawall, bollards, benches and pedestrian lamps. */
  private buildPromenade(): void {
    for (const chain of this.graph.chains) {
      if (chain.cls !== 'arterial' || chain.s1 - chain.s0 < 100) continue;
      const cross = this.crossOf(chain);
      for (const side of [-1, 1] as const) {
        // sample the shore distance along the run; promenade segments where it is 14..160 m and the zone is urban
        const step = 6;
        let seg: { x: number; z: number; s: number; nx: number; nz: number }[] = [];
        const flush = () => { if (seg.length >= 6) this.promenadeStrip(seg); seg = []; };
        for (let s = chain.s0 + 10; s < chain.s1 - 10; s += step) {
          const f = frameAt(chain, cross, s);
          const nl = Math.hypot(f.cx, f.cz) || 1;
          const nx = (f.cx / nl) * side, nz = (f.cz / nl) * side;
          const ex = f.x + nx * chain.hw, ez = f.z + nz * chain.hw;
          const zone = this.map.districtAt(ex + nx * 6, ez + nz * 6)?.zone ?? null;
          const d = zone === Zone.DOWNTOWN || zone === Zone.PARK || zone === Zone.RES_MID ? this.shoreDistance(ex, ez, nx, nz, 170) : -1;
          if (d < 14 || d > 160) { flush(); continue; }
          const inland = 5.5;
          const px = ex + nx * (d - inland), pz = ez + nz * (d - inland);
          if (this.map.heightAt(px, pz) < 1.0 || this.map.heightAt(px - nx * 4.5, pz - nz * 4.5) < 1.0) { flush(); continue; }
          seg.push({ x: px, z: pz, s, nx, nz });
        }
        flush();
      }
    }
  }

  private shoreDistance(x: number, z: number, dx: number, dz: number, maxDist: number): number {
    for (let d = 2; d <= maxDist; d += 2) if (this.map.heightAt(x + dx * d, z + dz * d) < 0.3) return d - 1;
    return maxDist + 1;
  }

  /** One promenade segment along the sampled shore-parallel path (the path's `n` points seaward). */
  private promenadeStrip(path: { x: number; z: number; s: number; nx: number; nz: number }[]): void {
    const mid = path[path.length >> 1];
    const soups = this.soupsAt(mid.x, mid.z);
    const soup = soups.walk;
    let prev: number[] | null = null;
    let along = 0;
    for (let i = 0; i < path.length; i++) {
      const p = path[i];
      if (i > 0) along += Math.hypot(p.x - path[i - 1].x, p.z - path[i - 1].z);
      // smooth the path normal over neighbours (the sampled shore is ragged)
      const q0 = path[Math.max(0, i - 1)], q1 = path[Math.min(path.length - 1, i + 1)];
      const nx = (q0.nx + p.nx + q1.nx) / 3, nz = (q0.nz + p.nz + q1.nz) / 3;
      const nl = Math.hypot(nx, nz) || 1;
      const ux = nx / nl, uz = nz / nl;
      const g = this.map.heightAt(p.x, p.z);
      const y = g + 0.12;
      const row: number[] = [];
      const v = (a: number, yy: number, kind: number, up: boolean) => row.push(soup.vert({ x: p.x + ux * a, y: yy, z: p.z + uz * a, nx: up ? 0 : -ux, ny: up ? 1 : 0, nz: up ? 0 : -uz, across: a + 4.5, along, kind, w: 40 }));
      // parapet on the seaward edge (a = 0 .. -0.45), pavers inland to a = -4.5, apron beyond
      v(0.0, y + 0.55, K_PARAPET, true);
      v(-0.45, y + 0.55, K_PARAPET, true);
      v(-0.45, y + 0.55, K_PARAPET, false);
      v(-0.45, y, K_PARAPET, false);
      v(-0.45, y, K_PROMENADE, true);
      v(-4.5, y, K_PROMENADE, true);
      const gb = this.map.heightAt(p.x - ux * 5.2, p.z - uz * 5.2) + 0.03;
      v(-5.2, Math.min(gb, y - 0.02), K_APRON, true);
      // seaward face of the parapet down to the ground
      v(0.0, y + 0.55, K_PARAPET, false);
      v(0.0, g - 0.3, K_PARAPET, false);
      if (prev) {
        soup.quad(prev[0], prev[1], row[1], row[0], 0, 1, 0, 2);
        soup.quad(prev[2], prev[3], row[3], row[2], -ux, 0, -uz);
        soup.quad(prev[4], prev[5], row[5], row[4], 0, 1, 0, 2);
        soup.quad(prev[5], prev[6], row[6], row[5], 0, 1, 0);
        soup.quad(prev[7], prev[8], row[8], row[7], ux, 0, uz, 2);
      }
      prev = row;
      this.markOccupied(p.x - ux * 2.5, p.z - uz * 2.5, 5);
      // bollards every second sample on the seaward edge, benches and lamps at longer pitches
      const f = frame(p.x - ux * 0.9, y, p.z - uz * 0.9, Math.atan2(uz, -ux));
      if (i % 2 === 0) part(soups.small, UNIT.cyl6, f, 0, 0.45, 0, 0.18, 0.9, 0.18, C.dark, 0.5, 0.6);
      if (i % 5 === 2) {
        const fb = frame(p.x - ux * 3.6, y, p.z - uz * 3.6, Math.atan2(-uz, ux));
        part(soups.small, UNIT.box, fb, 0, 0.45, 0, 0.45, 0.05, 1.7, C.wood, 0.85, 0);
        part(soups.small, UNIT.box, fb, -0.2, 0.72, 0, 0.05, 0.4, 1.7, C.wood, 0.85, 0);
        part(soups.small, UNIT.box, fb, 0, 0.22, 0.7, 0.4, 0.44, 0.06, C.dark, 0.6, 0.6);
        part(soups.small, UNIT.box, fb, 0, 0.22, -0.7, 0.4, 0.44, 0.06, C.dark, 0.6, 0.6);
      }
      if (i % 4 === 1) this.lamp(p.x - ux * 4.0, y, p.z - uz * 4.0, Math.atan2(-uz, ux), 'ped');
    }
  }

  // ---------------------------------------------------------------- highway lamps (kept from the props plan)

  private planHighwayLamps(chain: RoadChain): void {
    let k = 0;
    for (const seg of chain.segs) {
      const dx = seg.b[0] - seg.a[0], dz = seg.b[1] - seg.a[1];
      const len = Math.hypot(dx, dz);
      if (len < 1) continue;
      const ux = dx / len, uz = dz / len;
      for (let s = 20; s < len; s += 45, k++) {
        const side = k % 2 === 0 ? -1 : 1;
        const x = seg.a[0] + ux * s + -uz * (seg.width / 2 + 1) * side;
        const z = seg.a[1] + uz * s + ux * (seg.width / 2 + 1) * side;
        const g = this.map.heightAt(x, z);
        if (g < 0.8) continue;
        this.lamp(x, g, z, 0, 'highway');
      }
    }
  }

  // ---------------------------------------------------------------- lamp irradiance map

  /** Splat every planned lamp's pool into the ground irradiance map the road / sidewalk shaders sample at night. */
  private buildLampMap(): void {
    if (!this.lamps.length) return;
    // the map covers the dense districts (downtown, mid-rise, hotel row) at full resolution: the residential grids
    // and arterials reach across the whole 20 km world, where lamps keep their lit heads and dots but throw no pool
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const d of this.map.districts) {
      if (!DENSE.has(d.zone)) continue;
      const r = Math.hypot(d.hw, d.hh);
      x0 = Math.min(x0, d.cx - r); z0 = Math.min(z0, d.cz - r); x1 = Math.max(x1, d.cx + r); z1 = Math.max(z1, d.cz + r);
    }
    if (!Number.isFinite(x0)) return;
    x0 -= 24; z0 -= 24; x1 += 24; z1 += 24;
    const texel = Math.max(LAMP_TEXEL, (x1 - x0) / LAMP_MAP_MAX, (z1 - z0) / LAMP_MAP_MAX);
    const w = Math.min(LAMP_MAP_MAX, Math.ceil((x1 - x0) / texel)), h = Math.min(LAMP_MAP_MAX, Math.ceil((z1 - z0) / texel));
    const acc = new Float32Array(w * h);
    const POOL: Record<LampKind, [number, number, number]> = { arterial: [13, 1.0, 3.3], street: [10.5, 0.85, 2.0], ped: [5, 0.45, 0], highway: [12, 1.0, 0] };
    for (const l of this.lamps) {
      const [radius, peak, arm] = POOL[l.kind];
      // the luminaire hangs at the arm's end: the pool centres there
      const cx = l.x + Math.cos(l.yaw) * arm, cz = l.z - Math.sin(l.yaw) * arm;
      const i0 = Math.max(0, Math.floor((cx - radius - x0) / texel)), i1 = Math.min(w - 1, Math.ceil((cx + radius - x0) / texel));
      const j0 = Math.max(0, Math.floor((cz - radius - z0) / texel)), j1 = Math.min(h - 1, Math.ceil((cz + radius - z0) / texel));
      for (let j = j0; j <= j1; j++) {
        const pz = z0 + (j + 0.5) * texel;
        for (let i = i0; i <= i1; i++) {
          const px = x0 + (i + 0.5) * texel;
          const d = Math.hypot(px - cx, pz - cz) / radius;
          if (d >= 1) continue;
          // a broad foot (the luminaire hangs 8-11 m up) with a soft cut at the pool radius
          const v = peak * Math.pow(1 - d * d, 1.5) * (1 - smooth(0.6, 1.0, d));
          acc[j * w + i] += v;
        }
      }
    }
    const data = new Uint8Array(w * h);
    for (let i = 0; i < acc.length; i++) data[i] = Math.round(255 * Math.sqrt(Math.min(1, acc[i])));
    const tex = new THREE.DataTexture(data, w, h, THREE.RedFormat, THREE.UnsignedByteType);
    tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.unpackAlignment = 1;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    this.lampMap = tex;
    this.lights.uLampMap.value = tex;
    this.lights.uLampRect.value.set(x0, z0, 1 / (w * texel), 1 / (h * texel));
  }

  // ---------------------------------------------------------------- meshes

  private flush(): void {
    for (const [key, b] of this.builds) {
      const cell: StreetCell = { key, box: new THREE.Box3(), center: new THREE.Vector3(), r: 0, walk: null, walkFar: null, large: null, small: null, height: 0 };
      const mk = (g: THREE.BufferGeometry | null, mat: THREE.Material, name: string, casts: boolean): THREE.Mesh | null => {
        if (!g) return null;
        const m = new THREE.Mesh(g, mat);
        m.name = name;
        m.frustumCulled = false;
        m.matrixAutoUpdate = false;
        m.receiveShadow = true;
        m.castShadow = casts;
        m.visible = false;
        m.layers.set(LAYER_CAMERA);
        cell.box.union(g.boundingBox!);
        this.group.add(m);
        return m;
      };
      cell.walk = mk(b.walk.build(), this.walkMaterial, 'sidewalks', false);
      cell.walkFar = cell.walk ? mk(b.walk.buildFar(cell.walk.geometry), this.walkMaterial, 'sidewalks-far', false) : null;
      cell.large = mk(b.large.build(), this.kitMaterial, 'street-kits', true);
      cell.small = mk(b.small.build(), this.kitMaterial, 'street-kits-small', true);
      this.counts.walkTriangles += b.walk.triangles;
      this.counts.kitTriangles += b.large.triangles + b.small.triangles;
      if (!cell.walk && !cell.large && !cell.small) continue;
      const sphere = cell.box.getBoundingSphere(new THREE.Sphere());
      cell.center.copy(sphere.center); cell.r = sphere.radius; cell.height = cell.box.max.y - cell.box.min.y;
      this.cells.push(cell);
    }
    this.builds.clear();
    this.crossCache.clear();
    this.counts.cells = this.cells.length;
  }

  /** Signal timing and the lamp pools' colour follow the clock and the night factor. */
  update(time: number, night: number): void {
    this.uniforms.uSignalTime.value = time;
    this.uniforms.uNight.value = night;
    // warm high-pressure sodium / warm-white LED mix; the pools scale with the night factor like the lamp heads.
    // 0.35: under the x3.5 night exposure a 0.7 gain clipped the pool centres to one flat tan on asphalt and
    // concrete alike (sRGB ~185 on both); at 0.35 the centre of a pool on asphalt sits near sRGB 120 and grades out
    this.lights.uLampColor.value.set(1.0, 0.78, 0.5).multiplyScalar(0.35 * night * (this.poolsEnabled ? 1 : 0));
  }

  /** Per-frame culling: cells in view within FAR (small kits within SMALL_FAR); kits cast into the fine cascades
   *  within SHADOW_FAR, sidewalks never cast. */
  updateLod(camX: number, camZ: number, cull: ViewCull, camPos: THREE.Vector3): void {
    for (const c of this.cells) {
      const d = Math.max(0, Math.hypot(c.center.x - camX, c.center.z - camZ) - c.r);
      const inView = d < FAR && cull.boxInView(c.box);
      if (c.walk) c.walk.visible = inView && (d < WALK_NEAR || !c.walkFar);
      if (c.walkFar) c.walkFar.visible = inView && d >= WALK_NEAR;
      const castBits = d < SHADOW_FAR ? cull.boxCasterCascades(c.box, c.height) : 0;
      const set = (m: THREE.Mesh | null, visible: boolean) => {
        if (!m) return;
        const mask = layerMask('near', visible, visible || d < SHADOW_FAR ? castBits : 0);
        const cast = maskCasts(mask);
        m.castShadow = cast;
        m.visible = visible || cast;
        m.layers.mask = mask;
      };
      set(c.large, inView);
      set(c.small, inView && d < SMALL_FAR);
    }
    void camPos;
  }

  dispose(): void {
    this.lampMap?.dispose();
  }
}

function smooth(a: number, b: number, x: number): number {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
