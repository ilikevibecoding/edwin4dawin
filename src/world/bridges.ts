import * as THREE from 'three';
import type { BridgeSpec, Vec2, WorldMap } from './map';
import { clamp, lerp, smoothstep } from '../core/noise';

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
  /** deck top ribbons in road-attribute format so they can share the road material */
  deckGeometry: THREE.BufferGeometry;
  lampPositions: THREE.Vector3[];
}

export function buildBridges(map: WorldMap, roadMaterial: THREE.Material, concrete: THREE.Material, steel: THREE.Material): BridgeBuild {
  const group = new THREE.Group();
  const routes: BridgeRoute[] = [];
  const lampPositions: THREE.Vector3[] = [];

  // merged deck (top) ribbon with road attributes
  const dPos: number[] = [], dUv: number[] = [], dInfo: number[] = [], dIdx: number[] = [], dNrm: number[] = [];
  let dCount = 0;
  // deck slab bodies and railings
  const slabGeos: THREE.BufferGeometry[] = [];
  const pierMatrices: THREE.Matrix4[] = [];
  const capMatrices: THREE.Matrix4[] = [];
  const archGeos: THREE.BufferGeometry[] = [];
  const hangerMatrices: THREE.Matrix4[] = [];
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3();

  for (const spec of map.bridges) {
    const total = polylineLength(spec.pts);
    const step = 20;
    const n = Math.ceil(total / step);
    const pts3: THREE.Vector3[] = [];
    const hw = spec.width * 0.5;
    for (let i = 0; i <= n; i++) {
      const s = Math.min(total, i * step);
      const p = pointAt(spec.pts, s);
      const h = deckHeightProfile(spec, map, s, total);
      pts3.push(new THREE.Vector3(p.x, h, p.z));
      const nx = -p.dz, nz = p.dx;
      // deck top ribbon
      for (const side of [-1, 1]) {
        dPos.push(p.x + nx * hw * side, h + 0.02, p.z + nz * hw * side);
        dNrm.push(0, 1, 0);
        dUv.push(side, s);
        dInfo.push(spec.lanes, spec.width, 3);
      }
      if (i > 0) {
        const b = dCount + i * 2;
        dIdx.push(b - 2, b, b - 1, b - 1, b, b + 1);
      }
      // slab + railings as boxes between consecutive samples
      if (i > 0) {
        const prev = pts3[i - 1], cur = pts3[i];
        const mid = prev.clone().add(cur).multiplyScalar(0.5);
        const dir = cur.clone().sub(prev);
        const len = dir.length();
        dir.normalize();
        const yaw = Math.atan2(dir.x, dir.z);
        const pitch = -Math.asin(clamp(dir.y, -1, 1));
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
        // slab: width x 1.6 x len
        const slab = new THREE.BoxGeometry(spec.width + 1.0, 1.6, len + 0.4);
        slab.applyQuaternion(q);
        slab.translate(mid.x, mid.y - 0.8, mid.z);
        slabGeos.push(slab);
        for (const side of [-1, 1]) {
          const rail = new THREE.BoxGeometry(0.35, 1.15, len + 0.4);
          rail.translate(side * (hw + 0.25), 0.55, 0);
          rail.applyQuaternion(q);
          rail.translate(mid.x, mid.y, mid.z);
          slabGeos.push(rail);
          // barrier lip
          const lip = new THREE.BoxGeometry(0.5, 0.35, len + 0.4);
          lip.translate(side * (hw + 0.25), 1.2, 0);
          lip.applyQuaternion(q);
          lip.translate(mid.x, mid.y, mid.z);
          slabGeos.push(lip);
        }
      }
    }
    // piers: spacing grows in the arch region
    let s = 30;
    while (s < total - 30) {
      const p = pointAt(spec.pts, s);
      const h = deckHeightProfile(spec, map, s, total);
      const ground = map.heightAt(p.x, p.z);
      const inArch = spec.archHeight > 0 && Math.abs(s - spec.archT * total) < spec.archLength * 0.5;
      const spacing = inArch ? 70 : 38;
      if (h - ground > 1.2) {
        const nx = -p.dz, nz = p.dx;
        const colTop = h - 1.6;
        const colBottom = Math.min(ground, -0.5) - 2;
        const colH = colTop - colBottom;
        const cols = spec.width > 18 ? [-hw * 0.55, hw * 0.55] : [-hw * 0.45, hw * 0.45];
        for (const off of cols) {
          tmpP.set(p.x + nx * off, colBottom + colH / 2, p.z + nz * off);
          tmpQ.setFromEuler(new THREE.Euler(0, Math.atan2(p.dx, p.dz), 0));
          tmpS.set(inArch ? 2.4 : 1.7, colH, inArch ? 2.4 : 1.7);
          pierMatrices.push(tmpM.compose(tmpP, tmpQ, tmpS).clone());
        }
        // cap beam
        tmpP.set(p.x, colTop - 0.6, p.z);
        tmpQ.setFromEuler(new THREE.Euler(0, Math.atan2(p.dx, p.dz), 0));
        tmpS.set(spec.width + 0.6, 1.4, 2.2);
        capMatrices.push(tmpM.compose(tmpP, tmpQ, tmpS).clone());
      }
      s += spacing;
    }
    // lamps every 45 m alternating sides
    for (let ls = 22, k = 0; ls < total - 20; ls += 45, k++) {
      const p = pointAt(spec.pts, ls);
      const h = deckHeightProfile(spec, map, ls, total);
      const side = k % 2 === 0 ? -1 : 1;
      lampPositions.push(new THREE.Vector3(p.x + -p.dz * (hw + 0.2) * side, h, p.z + p.dx * (hw + 0.2) * side));
    }
    // signature arch over the channel span
    if (spec.archHeight >= 20 && spec.archLength >= 350) {
      const centre = spec.archT * total;
      const span = spec.archLength * 0.9;
      const rise = spec.archHeight * 1.1;
      for (const side of [-1, 1]) {
        const curve: THREE.Vector3[] = [];
        for (let i = 0; i <= 24; i++) {
          const t = i / 24;
          const ss = centre - span / 2 + span * t;
          const p = pointAt(spec.pts, ss);
          const deck = deckHeightProfile(spec, map, ss, total);
          const arch = deck + rise * Math.sin(t * Math.PI) + 1.0;
          const nx = -p.dz, nz = p.dx;
          curve.push(new THREE.Vector3(p.x + nx * (hw + 0.9) * side, arch, p.z + nz * (hw + 0.9) * side));
          if (i % 2 === 1 && i > 1 && i < 23) {
            // hanger cable from arch to deck
            const top = curve[curve.length - 1];
            const bottom = new THREE.Vector3(top.x, deck + 1.2, top.z);
            const mid = top.clone().add(bottom).multiplyScalar(0.5);
            tmpP.copy(mid); tmpQ.identity(); tmpS.set(0.16, top.y - bottom.y, 0.16);
            hangerMatrices.push(tmpM.compose(tmpP, tmpQ, tmpS).clone());
          }
        }
        const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curve), 48, 1.1, 8, false);
        archGeos.push(tube);
      }
    }
    dCount += (n + 1) * 2;
    routes.push({ id: spec.id, pts: pts3, width: spec.width, lanes: spec.lanes, traffic: spec.traffic });
  }

  const deckGeometry = new THREE.BufferGeometry();
  deckGeometry.setAttribute('position', new THREE.Float32BufferAttribute(dPos, 3));
  deckGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(dNrm, 3));
  deckGeometry.setAttribute('aRoadUv', new THREE.Float32BufferAttribute(dUv, 2));
  deckGeometry.setAttribute('aRoadInfo', new THREE.Float32BufferAttribute(dInfo, 3));
  deckGeometry.setIndex(dIdx);
  deckGeometry.computeBoundingSphere();
  const deckMesh = new THREE.Mesh(deckGeometry, roadMaterial);
  deckMesh.receiveShadow = true;
  deckMesh.renderOrder = 3;
  group.add(deckMesh);

  const slabs = mergeGeometries(slabGeos);
  const slabMesh = new THREE.Mesh(slabs, concrete);
  slabMesh.castShadow = true;
  slabMesh.receiveShadow = true;
  group.add(slabMesh);

  const pierGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
  const piers = new THREE.InstancedMesh(pierGeo, concrete, pierMatrices.length);
  pierMatrices.forEach((m, i) => piers.setMatrixAt(i, m));
  piers.castShadow = true; piers.receiveShadow = true;
  piers.frustumCulled = false;
  group.add(piers);
  const caps = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), concrete, capMatrices.length);
  capMatrices.forEach((m, i) => caps.setMatrixAt(i, m));
  caps.castShadow = true; caps.receiveShadow = true;
  caps.frustumCulled = false;
  group.add(caps);
  if (archGeos.length) {
    const arches = new THREE.Mesh(mergeGeometries(archGeos), steel);
    arches.castShadow = true; arches.receiveShadow = true;
    group.add(arches);
  }
  if (hangerMatrices.length) {
    const hangers = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.5, 0.5, 1, 6), steel, hangerMatrices.length);
    hangerMatrices.forEach((m, i) => hangers.setMatrixAt(i, m));
    hangers.frustumCulled = false;
    group.add(hangers);
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
