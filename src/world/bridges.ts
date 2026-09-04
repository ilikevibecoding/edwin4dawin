import * as THREE from 'three';
import type { BridgeSpec, Vec2, WorldMap } from './map';
import { clamp, lerp, smoothstep } from '../core/noise';
import { GLSL_NOISE } from '../render/shaders/common.glsl';

export interface BridgeRoute {
  id: string;
  /** 3D centreline points at ~20 m spacing (x, y deck top, z) */
  pts: THREE.Vector3[];
  width: number;
  lanes: number;
  traffic: number;
}

function polylineLength(pts: Vec2[]): number {
  let l = 0;
  for (let i = 0; i < pts.length - 1; i++) l += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
  return l;
}

function pointAt(pts: Vec2[], s: number): { x: number; z: number; dx: number; dz: number } {
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    if (s <= acc + l || i === pts.length - 2) {
      const t = clamp((s - acc) / l, 0, 1);
      const dx = (pts[i + 1][0] - pts[i][0]) / l, dz = (pts[i + 1][1] - pts[i][1]) / l;
      return { x: pts[i][0] + dx * l * t, z: pts[i][1] + dz * l * t, dx, dz };
    }
    acc += l;
  }
  return { x: pts[0][0], z: pts[0][1], dx: 1, dz: 0 };
}

export function deckHeightProfile(spec: BridgeSpec, map: WorldMap, s: number, total: number): number {
  const rampLen = Math.min(160, total * 0.25);
  const hA = map.heightAt(spec.pts[0][0], spec.pts[0][1]), hB = map.heightAt(spec.pts[spec.pts.length - 1][0], spec.pts[spec.pts.length - 1][1]);
  const upA = smoothstep(0, rampLen, s), upB = smoothstep(0, rampLen, total - s);
  let h = lerp(Math.max(hA, 0.5) + 0.3, spec.deck, upA);
  h = Math.min(h, lerp(Math.max(hB, 0.5) + 0.3, spec.deck, upB));
  if (spec.archHeight > 0) {
    const centre = spec.archT * total;
    const d = Math.abs(s - centre) / (spec.archLength * 0.5);
    if (d < 1) {
      const bump = 0.5 + 0.5 * Math.cos(d * Math.PI);
      h += (spec.archHeight - spec.deck) * bump;
    }
  }
  return h;
}

export interface BridgeBuild {
  group: THREE.Group;
  routes: BridgeRoute[];
  /** carriageway ribbons: `aRoadUv` (across -1..1, metres along) and `aRoadInfo` (lanes, width, median half-width) */
  deckGeometry: THREE.BufferGeometry;
  lampPositions: THREE.Vector3[];
}

const DECK_FRAG = /* glsl */ `
{
  float lanes = vRoadInfo.x;
  float width = vRoadInfo.y;
  float median = vRoadInfo.z;
  float xm = vRoadUv.x * width * 0.5;
  float along = vRoadUv.y;
  float n = fbm3(vWorldPosR.xz * 0.11);
  float n2 = vnoise(vWorldPosR.xz * 2.3);
  // sun-bleached concrete pavement
  vec3 conc = mix(vec3(0.50, 0.50, 0.475), vec3(0.62, 0.61, 0.58), n) * (0.95 + 0.10 * n2);
  // transverse pavement joints every 6 m, faint longitudinal joints at the lane edges
  float laneW = width / max(lanes, 1.0);
  float u = xm + width * 0.5;
  float k = floor(u / laneW);
  float lp = u - k * laneW;
  float edgeDist = min(lp, laneW - lp);
  float joint = smoothstep(0.10, 0.03, abs(fract(along / 6.0) - 0.5) * 6.0);
  conc *= 1.0 - 0.20 * joint - 0.08 * smoothstep(0.08, 0.02, edgeDist);
  // tyre paths and weathering patches
  float wheel = exp(-pow((abs(lp - laneW * 0.5) - laneW * 0.28) * 3.0, 2.0));
  conc *= 1.0 - 0.10 * wheel;
  conc *= 1.0 - 0.12 * smoothstep(0.6, 0.75, fbm3(vWorldPosR.xz * 0.03 + 8.0));
  // markings: white edge lines, dashed white lane lines, yellow centre (double line or beside the median barrier)
  float laneEdge = smoothstep(0.14, 0.05, edgeDist) * step(0.5, k) * step(k, lanes - 1.5) * step(0.6, abs(xm));
  float dashes = laneEdge * step(fract(along / 12.0), 0.5);
  float edgeLine = smoothstep(0.14, 0.05, abs(abs(xm) - (width * 0.5 - 0.4)));
  float centre = 0.0;
  if (lanes < 3.5) centre = smoothstep(0.12, 0.04, abs(xm)) * step(fract(along / 9.0), 0.45);
  else if (median > 0.0) centre = smoothstep(0.14, 0.05, abs(abs(xm) - (median + 0.35)));
  else centre = smoothstep(0.12, 0.04, abs(abs(xm) - 0.2));
  diffuseColor.rgb = mix(conc, vec3(0.82), max(edgeLine, dashes) * 0.85);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.85, 0.66, 0.16), centre * 0.9);
  roughnessFactor = 0.82;
}
`;

/** Pale concrete pavement for the bridge decks. The material is created here rather than in game.ts, so it copies the
 *  shadow (CSM) defines/hook game.ts installed on the shared bridge concrete material and chains its own shading. */
function createDeckMaterial(concrete: THREE.Material): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82, metalness: 0.0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const src = concrete as THREE.MeshStandardMaterial;
  if (src.defines) mat.defines = { ...src.defines };
  mat.onBeforeCompile = (shader, renderer) => {
    src.onBeforeCompile.call(src, shader, renderer);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 aRoadUv; attribute vec3 aRoadInfo; varying vec2 vRoadUv; varying vec3 vRoadInfo; varying vec3 vWorldPosR;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRoadUv = aRoadUv; vRoadInfo = aRoadInfo; vWorldPosR = (modelMatrix * vec4(position, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec2 vRoadUv; varying vec3 vRoadInfo; varying vec3 vWorldPosR;\n${GLSL_NOISE}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${DECK_FRAG}`);
  };
  mat.customProgramCacheKey = () => 'bridge-deck-v1';
  return mat;
}

/** A centreline sample: position of the deck top, unit `right` (across) and forward direction. */
interface Frame { x: number; y: number; z: number; rx: number; rz: number; dx: number; dz: number; s: number; }

/** Growing triangle soup with flat normals (merged into one static mesh). */
interface Soup { pos: number[]; nrm: number[]; idx: number[]; }

/** Girder depth below the deck top (m) and parapet height above it. */
const GIRDER_DEPTH = 2.4;
const PARAPET_H = 1.05;

/** Sweeps an open 2D profile (across, up) along the frames. The profile must run counter-clockwise around the
 *  section (left top -> down the left face -> along the bottom -> up the right face) so outward normals are
 *  the right-hand perpendicular of each edge. Every edge becomes its own strip so creases stay sharp. */
function loft(frames: Frame[], profile: [number, number][], out: Soup): void {
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), fn = new THREE.Vector3(), nn = new THREE.Vector3();
  for (let i = 0; i < profile.length - 1; i++) {
    const [a0, y0] = profile[i], [a1, y1] = profile[i + 1];
    const ex = a1 - a0, ey = y1 - y0;
    const el = Math.hypot(ex, ey) || 1;
    const n2x = ey / el, n2y = -ex / el; // outward normal for a CCW profile
    const base = out.pos.length / 3;
    for (let k = 0; k < frames.length; k++) {
      const f = frames[k];
      out.pos.push(f.x + f.rx * a0, f.y + y0, f.z + f.rz * a0, f.x + f.rx * a1, f.y + y1, f.z + f.rz * a1);
      const nx = f.rx * n2x, ny = n2y, nz = f.rz * n2x;
      out.nrm.push(nx, ny, nz, nx, ny, nz);
    }
    // winding: test the first quad against the desired normal and keep the orientation for the whole strip
    let flip = false;
    if (frames.length > 1) {
      a.fromArray(out.pos, base * 3); b.fromArray(out.pos, (base + 1) * 3); c.fromArray(out.pos, (base + 3) * 3);
      fn.subVectors(b, a).cross(c.clone().sub(a));
      nn.fromArray(out.nrm, base * 3);
      flip = fn.dot(nn) < 0;
    }
    for (let k = 1; k < frames.length; k++) {
      const v0 = base + (k - 1) * 2, v1 = v0 + 1, v3 = base + k * 2, v2 = v3 + 1;
      if (flip) out.idx.push(v0, v2, v1, v0, v3, v2);
      else out.idx.push(v0, v1, v2, v0, v2, v3);
    }
  }
}

/** `_roadMaterial` is kept in the signature for game.ts; the carriageway uses its own pale pavement material so the
 *  causeways read as light concrete against the water instead of asphalt. */
export function buildBridges(map: WorldMap, _roadMaterial: THREE.Material, concrete: THREE.Material, steel: THREE.Material): BridgeBuild {
  const group = new THREE.Group();
  const routes: BridgeRoute[] = [];
  const lampPositions: THREE.Vector3[] = [];

  // merged deck (carriageway) ribbon with road attributes
  const dPos: number[] = [], dUv: number[] = [], dInfo: number[] = [], dIdx: number[] = [], dNrm: number[] = [];
  let dCount = 0;
  // static concrete girder/parapet loft, instanced concrete boxes / columns, instanced steel boxes / cables
  const soup: Soup = { pos: [], nrm: [], idx: [] };
  const cBoxes: THREE.Matrix4[] = [], cCols: THREE.Matrix4[] = [], sBoxes: THREE.Matrix4[] = [], sCables: THREE.Matrix4[] = [];
  const archGeos: THREE.BufferGeometry[] = [];
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3(), tmpE = new THREE.Euler();
  const up = new THREE.Vector3(0, 1, 0);

  /** axis-aligned-to-bridge box: x across, z along, y from `yBottom` up `h` */
  const boxAt = (list: THREE.Matrix4[], x: number, yBottom: number, z: number, w: number, h: number, d: number, yaw: number, pitch = 0) => {
    if (h <= 0.01) return;
    tmpP.set(x, yBottom + h / 2, z);
    tmpQ.setFromEuler(tmpE.set(pitch, yaw, 0, 'YXZ'));
    tmpS.set(w, h, d);
    list.push(tmpM.compose(tmpP, tmpQ, tmpS).clone());
  };
  const colAt = (list: THREE.Matrix4[], x: number, yBottom: number, z: number, dia: number, h: number) => {
    if (h <= 0.01) return;
    tmpP.set(x, yBottom + h / 2, z);
    tmpQ.identity();
    tmpS.set(dia, h, dia);
    list.push(tmpM.compose(tmpP, tmpQ, tmpS).clone());
  };
  const cable = (list: THREE.Matrix4[], a: THREE.Vector3, b: THREE.Vector3, r: number) => {
    const dir = b.clone().sub(a);
    const len = dir.length();
    if (len < 0.1) return;
    dir.divideScalar(len);
    tmpP.copy(a).add(b).multiplyScalar(0.5);
    tmpQ.setFromUnitVectors(up, dir);
    tmpS.set(r * 2, len, r * 2);
    list.push(tmpM.compose(tmpP, tmpQ, tmpS).clone());
  };

  for (const spec of map.bridges) {
    const total = polylineLength(spec.pts);
    const W = spec.width, hw = W * 0.5;
    // the carriageway is narrower than the deck: pale concrete shoulders flank the asphalt
    const cw = clamp(spec.lanes * 3.3, 8, W - 4), chw = cw * 0.5;
    const frameAt = (s: number): Frame => {
      const p = pointAt(spec.pts, s);
      return { x: p.x, y: deckHeightProfile(spec, map, s, total), z: p.z, rx: -p.dz, rz: p.dx, dx: p.dx, dz: p.dz, s };
    };
    const yawAt = (f: Frame) => Math.atan2(f.dx, f.dz);

    // main span type: cable-stayed for the tall channel spans, a tied steel arch for the lower ones
    const cableStayed = spec.archHeight >= 20 && spec.archLength >= 350;
    const tiedArch = !cableStayed && spec.archHeight > 0 && spec.archLength >= 300;
    const centre = spec.archT * total;
    const mainSpan = cableStayed ? Math.min(spec.archLength * 0.5, 300) : tiedArch ? spec.archLength * 0.8 : 0;
    const spanA = centre - mainSpan / 2, spanB = centre + mainSpan / 2;

    // ------------------------------------------------------------ centreline frames
    const step = 10;
    const n = Math.ceil(total / step);
    const frames: Frame[] = [];
    for (let i = 0; i <= n; i++) frames.push(frameAt(Math.min(total, i * step)));
    const pts3: THREE.Vector3[] = [];
    for (let i = 0; i <= n; i += 2) pts3.push(new THREE.Vector3(frames[i].x, frames[i].y, frames[i].z));
    if ((n & 1) === 1) pts3.push(new THREE.Vector3(frames[n].x, frames[n].y, frames[n].z));

    // ------------------------------------------------------------ carriageway ribbon
    // six-lane causeways get a concrete median barrier; narrower decks a painted centre line
    const medianHalf = spec.lanes >= 6 ? 0.3 : 0;
    frames.forEach((f, i) => {
      for (const side of [-1, 1]) {
        dPos.push(f.x + f.rx * chw * side, f.y + 0.02, f.z + f.rz * chw * side);
        dNrm.push(0, 1, 0);
        dUv.push(side, f.s);
        dInfo.push(spec.lanes, cw, medianHalf);
      }
      if (i > 0) {
        const b = dCount + i * 2;
        dIdx.push(b - 2, b - 1, b, b, b - 1, b + 1);
      }
    });
    dCount += (n + 1) * 2;

    // ------------------------------------------------------------ girder + shoulders + parapets (one loft)
    const g = GIRDER_DEPTH, ph = PARAPET_H;
    const profile: [number, number][] = [
      [-chw, 0.0], [-chw, 0.15],                       // kerb
      [-hw, 0.15],                                     // shoulder
      [-hw - 0.14, ph], [-hw - 0.5, ph],               // parapet inner face and top
      [-hw - 0.5, -0.4], [-hw - 0.22, -1.05],          // fascia and drip edge
      [-W * 0.31, -g], [W * 0.31, -g],                 // web and bottom flange
      [hw + 0.22, -1.05], [hw + 0.5, -0.4],
      [hw + 0.5, ph], [hw + 0.14, ph], [hw, 0.15],
      [chw, 0.15], [chw, 0.0],
    ];
    loft(frames, profile, soup);
    if (medianHalf > 0) {
      const m = medianHalf;
      loft(frames, [[m, 0.02], [m, 0.3], [m * 0.4, 0.9], [-m * 0.4, 0.9], [-m, 0.3], [-m, 0.02]], soup);
    }

    // ------------------------------------------------------------ approach embankments / abutments
    for (let i = 0; i < frames.length; i++) {
      const f = frames[i];
      const ground = map.heightAt(f.x, f.z);
      if (ground < 0.3) continue;
      const bottom = ground - 0.8, top = f.y - g + 0.15;
      if (top - bottom < 0.3 || f.y - ground > 16) continue;
      boxAt(cBoxes, f.x, bottom, f.z, W + 0.8, top - bottom, step + 0.4, yawAt(f));
    }

    // ------------------------------------------------------------ piers (hammerhead wall piers on the wide causeways, twin columns elsewhere)
    const spacing = W >= 20 ? 50 : 42;
    const pierS: number[] = [];
    for (let s = spacing * 0.5; s < total - spacing * 0.3; s += spacing) {
      if (mainSpan > 0 && s > spanA - 12 && s < spanB + 12) continue;
      pierS.push(s);
    }
    if (tiedArch) pierS.push(spanA, spanB);
    for (const s of pierS) {
      const f = frameAt(s);
      const ground = map.heightAt(f.x, f.z);
      if (f.y - ground < 2.8) continue;
      const yaw = yawAt(f);
      const capTop = f.y - g;
      const heavy = tiedArch && (s === spanA || s === spanB);
      const capH = heavy ? 2.2 : 1.6;
      const capBottom = capTop - capH;
      const colBottom = Math.min(ground, -0.5) - 2.5;
      const inWater = ground < 0.2;
      if (W >= 20 || heavy) {
        const ww = heavy ? W * 0.7 : W * 0.5, wt = heavy ? 3.2 : 2.0;
        boxAt(cBoxes, f.x, colBottom, f.z, ww, capBottom - colBottom, wt, yaw);
        boxAt(cBoxes, f.x, capBottom, f.z, W + 0.6, capH, wt + 0.8, yaw);
        if (inWater) boxAt(cBoxes, f.x, -1.0, f.z, ww + 2.4, 1.6, wt + 2.4, yaw);
      } else {
        for (const off of [-W * 0.3, W * 0.3]) {
          colAt(cCols, f.x + f.rx * off, colBottom, f.z + f.rz * off, 2.0, capBottom - colBottom);
          if (inWater) boxAt(cBoxes, f.x + f.rx * off, -1.0, f.z + f.rz * off, 3.6, 1.6, 3.6, yaw);
        }
        boxAt(cBoxes, f.x, capBottom, f.z, W + 0.6, capH, 2.2, yaw);
      }
      // expansion joint across the carriageway over every pier
      boxAt(sBoxes, f.x, f.y + 0.03, f.z, cw, 0.04, 0.3, yaw);
    }

    // ------------------------------------------------------------ railing on the parapets, lamps
    for (let i = 1; i < frames.length; i++) {
      const a = frames[i - 1], b = frames[i];
      const len = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
      const yaw = Math.atan2(b.x - a.x, b.z - a.z);
      const pitch = -Math.asin(clamp((b.y - a.y) / len, -1, 1));
      for (const side of [-1, 1]) {
        const mx = (a.x + b.x) / 2 + (a.rx + b.rx) / 2 * (hw + 0.32) * side;
        const mz = (a.z + b.z) / 2 + (a.rz + b.rz) / 2 * (hw + 0.32) * side;
        boxAt(sBoxes, mx, (a.y + b.y) / 2 + ph + 0.86, mz, 0.07, 0.07, len + 0.1, yaw, pitch);
      }
    }
    for (let s = 2; s < total; s += 4) {
      const f = frameAt(s);
      const yaw = yawAt(f);
      for (const side of [-1, 1]) boxAt(sBoxes, f.x + f.rx * (hw + 0.32) * side, f.y + ph, f.z + f.rz * (hw + 0.32) * side, 0.1, 0.86, 0.1, yaw);
    }
    for (let ls = 22, k = 0; ls < total - 20; ls += 45, k++) {
      const f = frameAt(ls);
      const side = k % 2 === 0 ? -1 : 1;
      lampPositions.push(new THREE.Vector3(f.x + f.rx * (hw + 0.2) * side, f.y + 0.15, f.z + f.rz * (hw + 0.2) * side));
    }

    // ------------------------------------------------------------ main span structure
    if (cableStayed) {
      const pylonH = 0.24 * mainSpan + 10; // above the deck
      const legW = 3.2, legD = 4.8, legA = hw + 1.9;
      const nC = mainSpan >= 240 ? 9 : 7;
      const spacingC = (mainSpan / 2 - 16) / nC;
      for (const ps of [spanA, spanB]) {
        const f = frameAt(ps);
        const ground = map.heightAt(f.x, f.z);
        const yaw = yawAt(f);
        const colBottom = Math.min(ground, -0.5) - 3;
        for (const side of [-1, 1]) {
          const lx = f.x + f.rx * legA * side, lz = f.z + f.rz * legA * side;
          boxAt(cBoxes, lx, colBottom, lz, legW, f.y + pylonH - colBottom, legD, yaw);
          if (ground < 0.2) boxAt(cBoxes, lx, -1.2, lz, legW + 3, 1.9, legD + 3, yaw);
        }
        boxAt(cBoxes, f.x, f.y - g - 2.2, f.z, 2 * legA + legW, 2.2, legD, yaw);            // cross beam under the deck
        boxAt(cBoxes, f.x, f.y + pylonH - 5, f.z, 2 * legA + legW, 3.6, legD * 0.7, yaw);   // portal beam
        for (let k = 1; k <= nC; k++) {
          for (const dirS of [-1, 1]) {
            const sa = ps + dirS * (k * spacingC + 10);
            if (sa < 4 || sa > total - 4) continue;
            const fa = frameAt(sa);
            const topY = f.y + pylonH - 3 - (nC - k) * (0.45 * pylonH / nC);
            for (const side of [-1, 1]) {
              const anchor = new THREE.Vector3(fa.x + fa.rx * (hw + 0.36) * side, fa.y + 1.1, fa.z + fa.rz * (hw + 0.36) * side);
              const head = new THREE.Vector3(f.x + f.rx * (legA - legW * 0.5 + 0.1) * side, topY, f.z + f.rz * (legA - legW * 0.5 + 0.1) * side);
              cable(sCables, anchor, head, 0.11);
            }
          }
        }
      }
    } else if (tiedArch) {
      const rise = spec.archHeight * 0.95 + 4;
      const ribA = hw + 1.0;
      const ribs: THREE.Vector3[][] = [[], []];
      const segs = 28;
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const f = frameAt(spanA + mainSpan * t);
        const y = f.y + rise * Math.sin(t * Math.PI) + 0.8;
        for (const side of [-1, 1]) {
          const p = new THREE.Vector3(f.x + f.rx * ribA * side, y, f.z + f.rz * ribA * side);
          ribs[side < 0 ? 0 : 1].push(p);
          // hangers from the rib down to the parapet
          if (i % 2 === 1 && i > 1 && i < segs - 1) cable(sCables, new THREE.Vector3(p.x, f.y + ph + 0.2, p.z), p, 0.11);
        }
        // cross bracing between the ribs near the crown
        if (i === 8 || i === 14 || i === 20) boxAt(sBoxes, f.x, y - 0.7, f.z, 2 * ribA, 1.2, 1.2, yawAt(f));
      }
      for (const rib of ribs) archGeos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rib), 56, 1.15, 8, false));
    }

    routes.push({ id: spec.id, pts: pts3, width: spec.width, lanes: spec.lanes, traffic: spec.traffic });
  }

  // ------------------------------------------------------------ meshes
  const deckGeometry = new THREE.BufferGeometry();
  deckGeometry.setAttribute('position', new THREE.Float32BufferAttribute(dPos, 3));
  deckGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(dNrm, 3));
  deckGeometry.setAttribute('aRoadUv', new THREE.Float32BufferAttribute(dUv, 2));
  deckGeometry.setAttribute('aRoadInfo', new THREE.Float32BufferAttribute(dInfo, 3));
  deckGeometry.setIndex(dIdx);
  deckGeometry.computeBoundingSphere();
  const deckMesh = new THREE.Mesh(deckGeometry, createDeckMaterial(concrete));
  deckMesh.receiveShadow = true;
  deckMesh.renderOrder = 3;
  group.add(deckMesh);

  const loftGeo = new THREE.BufferGeometry();
  loftGeo.setAttribute('position', new THREE.Float32BufferAttribute(soup.pos, 3));
  loftGeo.setAttribute('normal', new THREE.Float32BufferAttribute(soup.nrm, 3));
  loftGeo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array((soup.pos.length / 3) * 2), 2));
  loftGeo.setIndex(new THREE.BufferAttribute(new Uint32Array(soup.idx), 1));
  loftGeo.computeBoundingSphere();
  const loftMesh = new THREE.Mesh(loftGeo, concrete);
  loftMesh.castShadow = true;
  loftMesh.receiveShadow = true;
  group.add(loftMesh);

  const instanced = (geo: THREE.BufferGeometry, mat: THREE.Material, list: THREE.Matrix4[], shadows: boolean) => {
    if (!list.length) return;
    const mesh = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.castShadow = shadows;
    mesh.receiveShadow = true;
    group.add(mesh);
  };
  instanced(new THREE.BoxGeometry(1, 1, 1), concrete, cBoxes, true);
  instanced(new THREE.CylinderGeometry(0.5, 0.5, 1, 12), concrete, cCols, true);
  instanced(new THREE.BoxGeometry(1, 1, 1), steel, sBoxes, false);
  instanced(new THREE.CylinderGeometry(0.5, 0.5, 1, 6), steel, sCables, false);
  if (archGeos.length) {
    const arches = new THREE.Mesh(mergeGeometries(archGeos), steel);
    arches.castShadow = true; arches.receiveShadow = true;
    group.add(arches);
  }
  return { group, routes, deckGeometry, lampPositions };
}

/** Minimal geometry merge (positions, normals, indices) for same-material static geometry. */
export function mergeGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let vtx = 0, idx = 0;
  const infos = geos.map((g) => {
    const p = g.getAttribute('position');
    const ind = g.getIndex();
    const nIdx = ind ? ind.count : p.count;
    vtx += p.count; idx += nIdx;
    return { g, p, ind, nIdx };
  });
  const pos = new Float32Array(vtx * 3), nrm = new Float32Array(vtx * 3), uv = new Float32Array(vtx * 2);
  const index = vtx > 65535 ? new Uint32Array(idx) : new Uint16Array(idx);
  let vo = 0, io = 0;
  for (const { g, p, ind, nIdx } of infos) {
    pos.set(p.array as Float32Array, vo * 3);
    const n = g.getAttribute('normal');
    if (n) nrm.set(n.array as Float32Array, vo * 3);
    const u = g.getAttribute('uv');
    if (u) uv.set(u.array as Float32Array, vo * 2);
    if (ind) for (let i = 0; i < nIdx; i++) index[io + i] = ind.getX(i) + vo;
    else for (let i = 0; i < nIdx; i++) index[io + i] = i + vo;
    vo += p.count; io += nIdx;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(index, 1));
  out.computeBoundingSphere();
  for (const g of geos) g.dispose();
  return out;
}
