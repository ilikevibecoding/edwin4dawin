import * as THREE from 'three';
import { GLSL_NOISE } from '../render/shaders/common.glsl';
import { Rng } from '../core/seed';
import { clamp } from '../core/noise';
import { Zone, type District, type RoadClass, type RoadSpec, type Vec2, type WorldMap } from './map';
import { balanceGroundIbl } from './terrain';

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

/** Generates the district street grids and combines them with authored roads. Districts earlier
 *  in the list take priority: streets and blocks of a later district are dropped where they fall
 *  inside an earlier one (parks and golf courses stay free of the surrounding suburb's grid). Island
 *  settlements with a `track` get a sandy lane and small lots along it instead of a grid. */
export function buildRoadNetwork(map: WorldMap): { segments: RoadSegment[]; streetsByDistrict: Map<string, RoadSegment[]>; blocksByDistrict: Map<string, Block[]> } {
  const segments: RoadSegment[] = [];
  const streetsByDistrict = new Map<string, RoadSegment[]>();
  const blocksByDistrict = new Map<string, Block[]>();
  for (const r of map.roads) {
    for (let i = 0; i < r.pts.length - 1; i++) {
      segments.push({ a: r.pts[i], b: r.pts[i + 1], width: r.width, cls: r.cls, lanes: r.lanes, traffic: r.traffic, lift: 0 });
    }
  }
  const rng = new Rng('lots');
  const ownedBy = (d: District, x: number, z: number) => map.districtAt(x, z) === d;
  for (const d of map.districts) {
    const c = Math.cos(d.rot), s = Math.sin(d.rot);
    const toWorld = (lx: number, lz: number): Vec2 => [d.cx + lx * c - lz * s, d.cz + lx * s + lz * c];
    const toLocal = (x: number, z: number): Vec2 => { const dx = x - d.cx, dz = z - d.cz; return [dx * c + dz * s, -dx * s + dz * c]; };
    if (d.track) {
      // sandy lane following the island, split at water gaps; small lots alternate sides along it
      const list: RoadSegment[] = [];
      const blocks: Block[] = [];
      let side = 1;
      let carry = 0;
      for (let i = 0; i < d.track.length - 1; i++) {
        const a = d.track[i], b = d.track[i + 1];
        const t = trimToLand(map, a, b);
        if (t) { const seg: RoadSegment = { a: t[0], b: t[1], width: 7, cls: 'lane', lanes: 2, traffic: 0.6, lift: 0 }; segments.push(seg); list.push(seg); }
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const [la0, lz0] = toLocal(a[0], a[1]), [la1, lz1] = toLocal(b[0], b[1]);
        const alongX = Math.abs(la1 - la0) >= Math.abs(lz1 - lz0);
        for (let sPos = carry; sPos < len - 12; sPos += rng.range(42, 58)) {
          const u = sPos / len;
          const lx = la0 + (la1 - la0) * u, lz = lz0 + (lz1 - lz0) * u;
          side = -side;
          const off = 6;
          const depth = 46, half = 20;
          const block: Block = alongX
            ? { x0: lx - half, x1: lx + half, z0: Math.min(lz + side * off, lz + side * (off + depth)), z1: Math.max(lz + side * off, lz + side * (off + depth)), streetWidth: 7 }
            : { z0: lz - half, z1: lz + half, x0: Math.min(lx + side * off, lx + side * (off + depth)), x1: Math.max(lx + side * off, lx + side * (off + depth)), streetWidth: 7 };
          const [wx, wz] = toWorld((block.x0 + block.x1) / 2, (block.z0 + block.z1) / 2);
          if (map.heightAt(wx, wz) < 1.2 || !ownedBy(d, wx, wz)) continue;
          blocks.push(block);
          carry = 0;
        }
      }
      streetsByDistrict.set(d.id, list);
      blocksByDistrict.set(d.id, blocks);
      continue;
    }
    const grid = map.grids.get(d.id);
    if (!grid) continue;
    const list: RoadSegment[] = [];
    const width = d.zone === Zone.DOWNTOWN ? 14 : d.zone === Zone.RES_MID || d.zone === Zone.HOTEL ? 12 : d.zone === Zone.INDUSTRIAL ? 12 : 9;
    const cls: RoadClass = 'street';
    const { xs, zs } = grid;
    const addStreet = (a: Vec2, b: Vec2) => {
      const t = trimToLand(map, a, b);
      if (!t) return;
      const mid: Vec2 = [(t[0][0] + t[1][0]) / 2, (t[0][1] + t[1][1]) / 2];
      if (!ownedBy(d, mid[0], mid[1])) return;
      const seg: RoadSegment = { a: t[0], b: t[1], width, cls, lanes: 2, traffic: d.zone === Zone.DOWNTOWN ? 4 : 1.5, lift: 0 };
      segments.push(seg); list.push(seg);
    };
    // streets along local z, split at each cross street so water gaps and other districts can be trimmed
    for (const x of xs) for (let i = 0; i < zs.length - 1; i++) addStreet(toWorld(x, zs[i]), toWorld(x, zs[i + 1]));
    for (const z of zs) for (let i = 0; i < xs.length - 1; i++) addStreet(toWorld(xs[i], z), toWorld(xs[i + 1], z));
    streetsByDistrict.set(d.id, list);
    const blocks: Block[] = [];
    for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) {
      const [wx, wz] = toWorld((xs[i] + xs[i + 1]) / 2, (zs[j] + zs[j + 1]) / 2);
      if (!ownedBy(d, wx, wz)) continue;
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
  if (cls < 0.5) {
    // island lane: packed sand and shell with twin wheel ruts, grass creeping in from the verges
    vec3 sand = mix(vec3(0.62, 0.56, 0.44), vec3(0.72, 0.66, 0.52), n) * (0.92 + 0.16 * n2);
    float rut = exp(-pow((abs(xm) - width * 0.22) * 2.2, 2.0));
    sand *= 1.0 - 0.14 * rut;
    float verge = smoothstep(0.55, 1.0, abs(across)) * (0.5 + 0.5 * n2);
    float crown = smoothstep(0.05, 0.16, 0.16 - abs(xm) / max(width, 1.0)) * smoothstep(0.3, 0.7, fbm3(vWorldPosR.xz * 0.6 + 2.0));
    diffuseColor.rgb = mix(sand, vec3(0.30, 0.36, 0.16) * (0.85 + 0.3 * n2), max(verge * 0.8, crown * 0.5));
    roughnessFactor = 0.95;
  } else if (cls > 4.5) {
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

/** All roads in one merged mesh (a single draw call). Consecutive segments of an authored polyline
 *  are stitched into one strip with mitered corners so bends have neither gaps nor overlapping
 *  decks; the strip follows the height field at 15 m steps. */
export function buildRoadMeshes(map: WorldMap, segments: RoadSegment[], material: THREE.Material): THREE.Mesh[] {
  const pos: number[] = [], uv: number[] = [], info: number[] = [], idx: number[] = [], nrm: number[] = [];
  let vcount = 0;
  const clsId = (c: RoadClass) => (c === 'highway' || c === 'causeway' ? 3 : c === 'arterial' ? 2 : c === 'runway' ? 5 : c === 'taxiway' ? 6 : c === 'lane' ? 0 : 1);
  const chains: RoadSegment[][] = [];
  for (const s of segments) {
    if (Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]) < 1) continue;
    const last = chains[chains.length - 1];
    const prev = last && last[last.length - 1];
    if (prev && prev.cls === s.cls && prev.width === s.width && prev.lift === s.lift && prev.b[0] === s.a[0] && prev.b[1] === s.a[1]) last.push(s);
    else chains.push([s]);
  }
  for (const chain of chains) {
    const pts: Vec2[] = [chain[0].a, ...chain.map((s) => s.b)];
    const m = pts.length;
    const dirs: Vec2[] = [];
    for (let i = 0; i < m - 1; i++) {
      const dx = pts[i + 1][0] - pts[i][0], dz = pts[i + 1][1] - pts[i][1];
      const len = Math.hypot(dx, dz);
      dirs.push([dx / len, dz / len]);
    }
    // cross vector per polyline vertex: segment normal at the ends, mitre (clamped to 2x) inside
    const cross: Vec2[] = [];
    for (let i = 0; i < m; i++) {
      const d0 = dirs[Math.max(0, i - 1)], d1 = dirs[Math.min(m - 2, i)];
      let nx = -(d0[1] + d1[1]), nz = d0[0] + d1[0];
      const nl = Math.hypot(nx, nz) || 1;
      nx /= nl; nz /= nl;
      const cosHalf = Math.max(0.5, nx * -d1[1] + nz * d1[0]);
      cross.push([nx / cosHalf, nz / cosHalf]);
    }
    const width = chain[0].width, hw = width * 0.5, cid = clsId(chain[0].cls), lanes = chain[0].lanes, lift = chain[0].lift;
    let along = 0;
    let first = true;
    for (let i = 0; i < m - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      const steps = Math.max(1, Math.ceil(len / 15));
      const c0 = cross[i], c1 = cross[i + 1];
      for (let k = first ? 0 : 1; k <= steps; k++) {
        const t = k / steps;
        const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
        const cx = c0[0] + (c1[0] - c0[0]) * t, cz = c0[1] + (c1[1] - c0[1]) * t;
        for (const side of [-1, 1]) {
          const px = x + cx * hw * side, pz = z + cz * hw * side;
          const h = map.heightAt(px, pz) + 0.15 + lift;
          pos.push(px, h, pz);
          nrm.push(0, 1, 0);
          uv.push(side, along + t * len);
          info.push(lanes, width, cid);
        }
        vcount += 2;
        if (!first || k > 0) idx.push(vcount - 4, vcount - 3, vcount - 2, vcount - 2, vcount - 3, vcount - 1);
        first = false;
      }
      along += len;
    }
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
    balanceGroundIbl(shader);
  };
  mat.customProgramCacheKey = () => 'road-v3';
  return mat;
}

export { clamp, CLASS_WIDTH };
export type { District };
