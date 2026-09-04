import * as THREE from 'three';
import { GLSL_NOISE } from '../render/shaders/common.glsl';
import { Rng } from '../core/seed';
import { clamp } from '../core/noise';
import { Zone, type District, type RoadClass, type RoadSpec, type Vec2, type WorldMap } from './map';

export interface RoadSegment {
  a: Vec2;
  b: Vec2;
  width: number;
  cls: RoadClass;
  lanes: number;
  traffic: number;
  /** deck height above terrain (0 for ground roads) */
  lift: number;
}

const CLASS_WIDTH: Record<RoadClass, number> = { highway: 22, causeway: 22, arterial: 15, street: 10, lane: 7, runway: 45, taxiway: 18 };

function isLandSegment(map: WorldMap, a: Vec2, b: Vec2, margin = 0.6): boolean {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(2, Math.ceil(len / 15));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
    if (map.heightAt(x, z) < margin) return false;
  }
  return true;
}

/** Trim a segment to its land portion (from either end). Returns null if nothing remains. */
function trimToLand(map: WorldMap, a: Vec2, b: Vec2): [Vec2, Vec2] | null {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(2, Math.ceil(len / 10));
  let first = -1, last = -1;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
    const land = map.heightAt(x, z) >= 0.8;
    if (land && first < 0) first = i;
    if (land) last = i;
  }
  if (first < 0 || last - first < 3) return null;
  const ta = first / n, tb = last / n;
  return [[a[0] + (b[0] - a[0]) * ta, a[1] + (b[1] - a[1]) * ta], [a[0] + (b[0] - a[0]) * tb, a[1] + (b[1] - a[1]) * tb]];
}

export interface Block { x0: number; x1: number; z0: number; z1: number; streetWidth: number; }

/** Generates the district street grids and combines them with authored roads. */
export function buildRoadNetwork(map: WorldMap): { segments: RoadSegment[]; streetsByDistrict: Map<string, RoadSegment[]>; blocksByDistrict: Map<string, Block[]> } {
  const segments: RoadSegment[] = [];
  const streetsByDistrict = new Map<string, RoadSegment[]>();
  const blocksByDistrict = new Map<string, Block[]>();
  for (const r of map.roads) {
    for (let i = 0; i < r.pts.length - 1; i++) {
      segments.push({ a: r.pts[i], b: r.pts[i + 1], width: r.width, cls: r.cls, lanes: r.lanes, traffic: r.traffic, lift: 0 });
    }
  }
  const rng = new Rng('streets');
  for (const d of map.districts) {
    if (d.gridX <= 0 || d.gridZ <= 0) continue;
    const list: RoadSegment[] = [];
    const c = Math.cos(d.rot), s = Math.sin(d.rot);
    const toWorld = (lx: number, lz: number): Vec2 => [d.cx + lx * c - lz * s, d.cz + lx * s + lz * c];
    const width = d.zone === Zone.DOWNTOWN ? 14 : d.zone === Zone.RES_MID || d.zone === Zone.HOTEL ? 12 : d.zone === Zone.INDUSTRIAL ? 12 : 9;
    const cls: RoadClass = d.zone === Zone.RES_LOW ? 'street' : 'street';
    // slight irregularity in spacing keeps the grid from looking machine-made
    const xs: number[] = [];
    for (let x = -d.hw; x <= d.hw + 1; x += d.gridX * rng.range(0.9, 1.15)) xs.push(Math.min(x, d.hw));
    const zs: number[] = [];
    for (let z = -d.hh; z <= d.hh + 1; z += d.gridZ * rng.range(0.9, 1.15)) zs.push(Math.min(z, d.hh));
    for (const x of xs) {
      // streets along local z, split at each cross street so water gaps can be trimmed
      for (let i = 0; i < zs.length - 1; i++) {
        const a = toWorld(x, zs[i]), b = toWorld(x, zs[i + 1]);
        const t = trimToLand(map, a, b);
        if (!t) continue;
        const seg: RoadSegment = { a: t[0], b: t[1], width, cls, lanes: 2, traffic: d.zone === Zone.DOWNTOWN ? 4 : 1.5, lift: 0 };
        segments.push(seg); list.push(seg);
      }
    }
    for (const z of zs) {
      for (let i = 0; i < xs.length - 1; i++) {
        const a = toWorld(xs[i], z), b = toWorld(xs[i + 1], z);
        const t = trimToLand(map, a, b);
        if (!t) continue;
        const seg: RoadSegment = { a: t[0], b: t[1], width, cls, lanes: 2, traffic: d.zone === Zone.DOWNTOWN ? 4 : 1.5, lift: 0 };
        segments.push(seg); list.push(seg);
      }
    }
    streetsByDistrict.set(d.id, list);
    const blocks: Block[] = [];
    for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) {
      blocks.push({ x0: xs[i], x1: xs[i + 1], z0: zs[j], z1: zs[j + 1], streetWidth: width });
    }
    blocksByDistrict.set(d.id, blocks);
  }
  // runways & taxiways
  for (const r of map.runways) {
    segments.push({ a: r.a, b: r.b, width: r.width, cls: 'runway', lanes: 0, traffic: 0, lift: 0 });
  }
  return { segments, streetsByDistrict, blocksByDistrict };
}

const ROAD_FRAG_PARS = /* glsl */ `
varying vec2 vRoadUv;   // x across (-1..1), y along (metres)
varying vec3 vRoadInfo; // lanes, width, class
varying vec3 vWorldPosR;
${GLSL_NOISE}
`;
const ROAD_FRAG_MAIN = /* glsl */ `
{
  float lanes = vRoadInfo.x;
  float width = vRoadInfo.y;
  float cls = vRoadInfo.z;
  float across = vRoadUv.x; // -1..1
  float along = vRoadUv.y;
  float xm = across * width * 0.5; // metres from centre
  float n = fbm3(vWorldPosR.xz * 0.15);
  float n2 = vnoise(vWorldPosR.xz * 1.7);
  vec3 asphalt = mix(vec3(0.16, 0.16, 0.165), vec3(0.24, 0.235, 0.23), n) * (0.92 + 0.16 * n2);
  // causeways and highways are pale, sun-bleached concrete-asphalt
  if (cls > 2.5 && cls < 4.5) asphalt = mix(vec3(0.30, 0.30, 0.29), vec3(0.40, 0.39, 0.37), n) * (0.94 + 0.12 * n2);
  if (cls > 4.5) {
    // runway: concrete, centre line dashes, threshold bars
    vec3 concrete = mix(vec3(0.33, 0.33, 0.32), vec3(0.42, 0.41, 0.4), n) * (0.94 + 0.12 * n2);
    float centre = step(abs(xm), 0.45) * step(fract(along / 60.0), 0.5);
    float edge = step(width * 0.5 - 1.2, abs(xm)) * step(0.15, width * 0.5 - abs(xm));
    // skid marks near the touchdown zone
    float rubber = smoothstep(0.55, 0.8, fbm3(vWorldPosR.xz * 0.05 + 3.0)) * step(abs(xm), width * 0.28) * 0.35;
    diffuseColor.rgb = mix(concrete * (1.0 - rubber), vec3(0.85), max(centre, edge) * 0.8);
    roughnessFactor = 0.85;
  } else {
    float laneW = width / max(lanes, 1.0);
    float edgeLine = smoothstep(0.12, 0.05, abs(abs(xm) - (width * 0.5 - 0.35)));
    float centreLine = 0.0;
    float dashes = 0.0;
    if (lanes >= 3.5) {
      // divided: double yellow at centre, dashed white lane lines
      centreLine = smoothstep(0.1, 0.04, abs(abs(xm) - 0.25)) * 1.0;
      float k = floor((xm + width * 0.5) / laneW);
      float lanePos = abs(fract((xm + width * 0.5) / laneW) - 0.0) * laneW;
      float laneEdge = smoothstep(0.12, 0.05, min(lanePos, laneW - lanePos)) * step(0.5, k) * step(k, lanes - 1.5);
      dashes = laneEdge * step(fract(along / 12.0), 0.5);
      centreLine = 0.0;
      // median dashes around centre count as lane lines except the exact middle which is solid yellow
      float mid = smoothstep(0.12, 0.05, abs(xm));
      diffuseColor.rgb = asphalt;
      vec3 yellow = vec3(0.85, 0.65, 0.15);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.8), max(edgeLine, dashes) * 0.85);
      diffuseColor.rgb = mix(diffuseColor.rgb, yellow, mid * 0.9);
    } else {
      centreLine = smoothstep(0.1, 0.04, abs(xm)) * step(fract(along / 9.0), 0.45);
      diffuseColor.rgb = mix(asphalt, vec3(0.85, 0.7, 0.2), centreLine * 0.85);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.8), edgeLine * 0.6 * step(9.5, width));
    }
    // wear: tyre paths slightly darker, patches
    float wheel = exp(-pow((abs(mod(xm + width * 0.5, laneW) - laneW * 0.5) - laneW * 0.28) * 4.0, 2.0));
    diffuseColor.rgb *= 1.0 - 0.12 * wheel;
    diffuseColor.rgb *= 1.0 - 0.15 * smoothstep(0.6, 0.75, fbm3(vWorldPosR.xz * 0.04 + 8.0));
    roughnessFactor = 0.78;
  }
}
`;

/** One merged mesh per road class. */
export function buildRoadMeshes(map: WorldMap, segments: RoadSegment[], material: THREE.Material): THREE.Mesh[] {
  const pos: number[] = [], uv: number[] = [], info: number[] = [], idx: number[] = [], nrm: number[] = [];
  let vcount = 0;
  const clsId = (c: RoadClass) => (c === 'highway' || c === 'causeway' ? 3 : c === 'arterial' ? 2 : c === 'runway' ? 5 : c === 'taxiway' ? 6 : 1);
  for (const s of segments) {
    const dx = s.b[0] - s.a[0], dz = s.b[1] - s.a[1];
    const len = Math.hypot(dx, dz);
    if (len < 1) continue;
    const ux = dx / len, uz = dz / len;
    const nx = -uz, nz = ux;
    const hw = s.width * 0.5;
    const steps = Math.max(1, Math.ceil(len / 25));
    const lanes = s.lanes, cid = clsId(s.cls);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = s.a[0] + dx * t, z = s.a[1] + dz * t;
      for (const side of [-1, 1]) {
        const px = x + nx * hw * side, pz = z + nz * hw * side;
        const h = map.heightAt(px, pz) + 0.12 + s.lift;
        pos.push(px, h, pz);
        nrm.push(0, 1, 0);
        uv.push(side, t * len);
        info.push(lanes, s.width, cid);
      }
      if (i > 0) {
        const b = vcount + i * 2;
        idx.push(b - 2, b - 1, b, b, b - 1, b + 1);
      }
    }
    vcount += (steps + 1) * 2;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('aRoadUv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aRoadInfo', new THREE.Float32BufferAttribute(info, 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
  const mesh = new THREE.Mesh(g, material);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.renderOrder = 2;
  mesh.frustumCulled = false;
  return [mesh];
}

export function createRoadMaterial(): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0.0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 aRoadUv; attribute vec3 aRoadInfo; varying vec2 vRoadUv; varying vec3 vRoadInfo; varying vec3 vWorldPosR;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRoadUv = aRoadUv; vRoadInfo = aRoadInfo; vWorldPosR = (modelMatrix * vec4(position, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${ROAD_FRAG_PARS}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${ROAD_FRAG_MAIN}`);
  };
  mat.customProgramCacheKey = () => 'road-v1';
  return mat;
}

export { clamp, CLASS_WIDTH };
export type { District };
