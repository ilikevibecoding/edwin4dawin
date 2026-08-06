/**
 * Procedural body construction.
 *
 * The body is a signed distance field — a generalised-cylinder torso plus tapered
 * limbs — so all joins are organically smooth. The field is polygonised with
 * Surface Nets, then skinned to the rig by proximity weighting. Material regions
 * (skin / cloth / shoe) are decided from the owning bone plus explicit garment
 * cut-offs, which gives clean hems instead of the ragged boundary you get from
 * differencing a clothed and a bare field.
 */
import * as THREE from 'three';
import { distanceToSegment, type BoneName, type Rig } from './Rig';
import { isoToGeometry, sdf, surfaceNets, type SdfFn } from './SurfaceNets';

export type TopKind = 'none' | 'shirt' | 'jacket' | 'hoodie' | 'coat' | 'uniform';
export type BottomKind = 'trousers' | 'jeans' | 'skirt';

export interface Outfit {
  top: TopKind;
  bottom: BottomKind;
  shoes: boolean;
  sleeves: 'long' | 'short' | 'none';
  collar: boolean;
  bulk?: number;
}

export const DEFAULT_OUTFIT: Outfit = {
  top: 'jacket',
  bottom: 'trousers',
  shoes: true,
  sleeves: 'long',
  collar: true,
  bulk: 0,
};

export type BodyRegion = 'skin' | 'cloth' | 'shoe';

export interface BodyResult {
  geometry: THREE.BufferGeometry;
  regionOrder: BodyRegion[];
  vertexCount: number;
  triangleCount: number;
}

interface Profile {
  h: number;
  w: number;
  d: number;
  cz: number;
}

function sampleProfile(profiles: Profile[], h: number) {
  if (h <= profiles[0].h) return profiles[0];
  const last = profiles[profiles.length - 1];
  if (h >= last.h) return last;
  for (let i = 0; i < profiles.length - 1; i++) {
    const a = profiles[i];
    const b = profiles[i + 1];
    if (h >= a.h && h <= b.h) {
      let t = (h - a.h) / (b.h - a.h);
      t = t * t * (3 - 2 * t);
      return { w: a.w + (b.w - a.w) * t, d: a.d + (b.d - a.d) * t, cz: a.cz + (b.cz - a.cz) * t };
    }
  }
  return last;
}

/** Superellipse cross-section, approximated for SDF unions. */
function superellipse(x: number, z: number, w: number, d: number, n: number): number {
  const r = Math.pow(Math.pow(Math.abs(x) / w, n) + Math.pow(Math.abs(z) / d, n), 1 / n);
  return (r - 1) * Math.min(w, d);
}

/**
 * Decides which material a surface point belongs to. Cuffs, hems and collars are
 * explicit cut-offs so boundaries land where a garment's edge would be.
 */
function classifyRegion(boneIndex: number, rig: Rig, outfit: Outfit, p: THREE.Vector3): number {
  const name = rig.specs[boneIndex].name;
  const H = rig.proportions.height;
  const hasTop = outfit.top !== 'none';
  const longSleeve = outfit.sleeves === 'long';
  const anySleeve = outfit.sleeves !== 'none';

  switch (name) {
    case 'head':
    case 'neck':
    case 'handL':
    case 'handR':
      return 0;
    case 'footL':
    case 'footR':
    case 'toeL':
    case 'toeR':
      return outfit.shoes ? 2 : 0;
    case 'shinL':
    case 'shinR': {
      if (outfit.bottom === 'skirt') return 0;
      const ankle = Math.min(rig.specByName.footL.pos.y, rig.specByName.footR.pos.y);
      return p.y > ankle + H * 0.035 ? 1 : outfit.shoes ? 2 : 0;
    }
    case 'armL':
    case 'armR': {
      if (!anySleeve) return 0;
      if (longSleeve) return 1;
      const shoulderY = rig.specByName.shoulderL.pos.y;
      const elbowY = rig.specByName.forearmL.pos.y;
      return p.y > elbowY + (shoulderY - elbowY) * 0.45 ? 1 : 0;
    }
    case 'forearmL':
    case 'forearmR':
      return longSleeve ? 1 : 0;
    case 'chest':
    case 'shoulderL':
    case 'shoulderR':
      return hasTop ? 1 : 0;
    default:
      return 1;
  }
}

function buildBodyField(rig: Rig, outfit: Outfit, clothed: boolean): SdfFn {
  const H = rig.proportions.height;
  const P = rig.proportions;
  const seg = (n: BoneName) => rig.segments[rig.specs.findIndex((s) => s.name === n)];

  const hips = seg('hips');
  const chest = seg('chest');
  const neck = seg('neck');

  const yTorso0 = hips.a.y - H * 0.105;
  // The torso must stop at the shoulder line, otherwise it swallows the neck.
  const yTorso1 = rig.specByName.shoulderL.pos.y + H * 0.016;

  const waistPinch = 1 - P.waist * 0.3;
  const bulk = (outfit.bulk ?? 0) * (clothed ? 1 : 0);
  const topCovers = clothed && outfit.top !== 'none';
  const torsoPad = topCovers ? H * (0.007 + bulk * 0.014) : 0;
  const limbPad = clothed ? H * 0.0055 : 0;

  const profiles: Profile[] = [
    { h: 0, w: H * 0.098, d: H * 0.064, cz: 0.004 },
    { h: 0.12, w: H * 0.101, d: H * 0.066, cz: 0.006 },
    { h: 0.3, w: H * 0.09 * waistPinch, d: H * 0.058 * waistPinch, cz: 0.003 },
    { h: 0.52, w: H * 0.098, d: H * 0.07, cz: -0.002 },
    { h: 0.74, w: H * 0.107, d: H * (0.072 + P.chestDepth * 0.012), cz: -0.004 },
    { h: 0.9, w: H * 0.104, d: H * 0.068, cz: -0.008 },
    { h: 1, w: H * 0.09, d: H * 0.055, cz: -0.01 },
  ].map((p) => ({ ...p, w: p.w + torsoPad, d: p.d + torsoPad }));

  const armSegs = [
    [seg('armL'), seg('forearmL')],
    [seg('armR'), seg('forearmR')],
  ];
  const legSegs = [
    [seg('thighL'), seg('shinL')],
    [seg('thighR'), seg('shinR')],
  ];
  const shoulders = [seg('shoulderL'), seg('shoulderR')];
  const hands = [seg('handL'), seg('handR')];
  const feet = [seg('footL'), seg('footR')];

  const sleeveLong = clothed && outfit.sleeves === 'long';
  const sleeveAny = clothed && outfit.sleeves !== 'none';
  const legPad = clothed && outfit.bottom !== 'skirt' ? H * 0.007 : 0;
  const skirt = clothed && outfit.bottom === 'skirt';

  return (x, y, z) => {
    // ---- torso ----
    const h = (y - yTorso0) / (yTorso1 - yTorso0);
    const pr = sampleProfile(profiles, h < 0 ? 0 : h > 1 ? 1 : h);
    let d = superellipse(x, z - pr.cz, pr.w, pr.d, 2.45);
    d = sdf.smax(d, y - yTorso1, H * 0.045);
    d = sdf.smax(d, yTorso0 - y, H * 0.05);

    // ---- neck: starts inside the chest so it blends, tapers as it rises ----
    d = sdf.smin(
      d,
      sdf.roundCone(x, y, z, neck.a.x, chest.a.y, neck.a.z + 0.004, neck.b.x, neck.b.y + H * 0.012, neck.b.z, neck.r0 * 1.25, neck.r0 * 0.94),
      H * 0.03
    );
    // Trapezius sloping from neck to shoulder
    for (const s of shoulders) {
      d = sdf.smin(
        d,
        sdf.roundCone(x, y, z, 0, neck.a.y - H * 0.012, -0.01, s.a.x * 1.6, s.a.y, s.a.z - 0.01, neck.r0 * 0.8, neck.r0 * 0.5),
        H * 0.05
      );
    }

    // ---- deltoids ----
    for (const s of shoulders) {
      const pad = sleeveAny ? limbPad * 1.4 : 0;
      d = sdf.smin(
        d,
        sdf.roundCone(x, y, z, s.a.x, s.a.y, s.a.z, s.b.x, s.b.y, s.b.z, s.r0 * 0.72 + pad, s.r0 * 1.02 + pad),
        H * 0.03
      );
    }

    // ---- arms ----
    for (const [upper, fore] of armSegs) {
      const padU = sleeveAny ? limbPad : 0;
      const padF = sleeveLong ? limbPad : 0;
      d = sdf.smin(
        d,
        sdf.roundCone(x, y, z, upper.a.x, upper.a.y, upper.a.z, upper.b.x, upper.b.y, upper.b.z, upper.r0 + padU, upper.r1 + padU),
        H * 0.022
      );
      d = sdf.smin(
        d,
        sdf.roundCone(x, y, z, fore.a.x, fore.a.y, fore.a.z, fore.b.x, fore.b.y, fore.b.z, fore.r0 + padF, fore.r1 + padF),
        H * 0.016
      );
    }

    // ---- hands: flattened, angled with the forearm ----
    for (const hand of hands) {
      const len = hand.a.distanceTo(hand.b) || 1;
      const dirX = (hand.b.x - hand.a.x) / len;
      const dirY = (hand.b.y - hand.a.y) / len;
      const mx = (hand.a.x + hand.b.x) * 0.5;
      const my = (hand.a.y + hand.b.y) * 0.5;
      const mz = (hand.a.z + hand.b.z) * 0.5;
      const rx = x - mx;
      const ry = y - my;
      const rz = z - mz;
      const along = rx * dirX + ry * dirY;
      const perp = Math.hypot(rx - dirX * along, ry - dirY * along);
      const hr = hand.r0;
      const dHand =
        Math.hypot(
          Math.max(Math.abs(along) - len * 0.42, 0),
          Math.max(perp - hr * 0.5, 0),
          Math.max(Math.abs(rz) - hr * 0.34, 0)
        ) - hr * 0.62;
      d = sdf.smin(d, dHand, H * 0.014);
    }

    // ---- legs ----
    if (skirt) {
      const yTop = hips.a.y + H * 0.01;
      const yBot = hips.a.y - H * 0.16;
      const t = Math.max(0, Math.min(1, (y - yBot) / (yTop - yBot)));
      const rw = H * (0.13 - 0.03 * t);
      let dSkirt = superellipse(x, z - 0.004, rw, rw * 0.72, 2.2);
      dSkirt = sdf.smax(dSkirt, y - yTop, H * 0.02);
      dSkirt = sdf.smax(dSkirt, yBot - y, H * 0.01);
      d = sdf.smin(d, dSkirt, H * 0.02);
    }
    for (const [thigh, shin] of legSegs) {
      d = sdf.smin(
        d,
        sdf.roundCone(x, y, z, thigh.a.x, thigh.a.y + H * 0.02, thigh.a.z, thigh.b.x, thigh.b.y, thigh.b.z, thigh.r0 + (skirt ? 0 : legPad), thigh.r1 + legPad),
        H * 0.03
      );
      d = sdf.smin(
        d,
        sdf.roundCone(x, y, z, shin.a.x, shin.a.y, shin.a.z, shin.b.x, shin.b.y, shin.b.z, shin.r0 + legPad, shin.r1 + legPad),
        H * 0.018
      );
    }

    // ---- feet / shoes ----
    for (const foot of feet) {
      const wear = clothed && outfit.shoes;
      const pad = wear ? H * 0.008 : 0;
      const heelY = foot.a.y - (wear ? H * 0.004 : 0);
      const toeZ = foot.b.z + (wear ? H * 0.016 : 0);
      const cz = (foot.a.z + toeZ) * 0.5;
      d = sdf.smin(
        d,
        sdf.roundBox(x, y, z, foot.a.x, heelY - H * 0.004, cz, foot.r0 * 0.56 + pad, H * 0.016 + pad * 0.5, (toeZ - foot.a.z) * 0.5 + H * 0.012, H * 0.012) - pad * 0.2,
        H * 0.016
      );
      d = sdf.smin(
        d,
        sdf.capsule(x, y, z, foot.a.x, foot.a.y + H * 0.02, foot.a.z, foot.a.x, heelY, foot.a.z, foot.r0 * 0.62 + pad * 0.6),
        H * 0.014
      );
    }

    // ---- collar ----
    if (clothed && outfit.collar && topCovers) {
      const cy = neck.a.y - H * 0.004;
      const dCollar = sdf.roundCone(x, y, z, 0, cy - H * 0.012, -0.004, 0, cy + H * 0.016, -0.006, neck.r0 * 1.32, neck.r0 * 1.4);
      const inner = sdf.roundCone(x, y, z, 0, cy - H * 0.02, -0.004, 0, cy + H * 0.03, -0.006, neck.r0 * 1.08, neck.r0 * 1.16);
      d = sdf.smin(d, sdf.smax(dCollar, -inner, H * 0.004), H * 0.012);
    }

    return d;
  };
}

export interface BuildBodyOptions {
  rig: Rig;
  outfit?: Partial<Outfit>;
  /** Voxel edge length in metres. 0.011 is detailed, 0.02 is coarse. */
  cell?: number;
}

export function buildBody(opts: BuildBodyOptions): BodyResult {
  const rig = opts.rig;
  const outfit: Outfit = { ...DEFAULT_OUTFIT, ...opts.outfit };
  const H = rig.proportions.height;
  const cell = opts.cell ?? 0.0125;
  const field = buildBodyField(rig, outfit, true);

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const s of rig.segments) {
    minX = Math.min(minX, s.a.x - s.r0 * 2, s.b.x - s.r1 * 2);
    maxX = Math.max(maxX, s.a.x + s.r0 * 2, s.b.x + s.r1 * 2);
    minZ = Math.min(minZ, s.a.z - s.r0 * 2, s.b.z - s.r1 * 2);
    maxZ = Math.max(maxZ, s.a.z + s.r0 * 2, s.b.z + s.r1 * 2);
  }
  const min = new THREE.Vector3(minX - 0.03, -0.02, minZ - 0.05);
  const max = new THREE.Vector3(maxX + 0.03, rig.specByName.neck.pos.y + H * 0.06, maxZ + 0.06);
  const dims: [number, number, number] = [
    Math.max(8, Math.ceil((max.x - min.x) / cell) + 1),
    Math.max(8, Math.ceil((max.y - min.y) / cell) + 1),
    Math.max(8, Math.ceil((max.z - min.z) / cell) + 1),
  ];

  const iso = surfaceNets(field, { dims, min, max });
  const geometry = isoToGeometry(iso);
  const vertexCount = iso.vertexCount;
  const pos = iso.positions;

  // ---- skin weights by bone proximity ----
  const skinIndex = new Uint16Array(vertexCount * 4);
  const skinWeight = new Float32Array(vertexCount * 4);
  const uv = new Float32Array(vertexCount * 2);
  const regionMask = new Uint8Array(vertexCount);
  const deformBones = rig.segments.filter((s) => s.name !== 'root');
  const blendWidth = H * 0.045;
  const p = new THREE.Vector3();
  const cand: { idx: number; d: number }[] = [];

  for (let i = 0; i < vertexCount; i++) {
    p.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
    cand.length = 0;
    let dmin = Infinity;
    for (const s of deformBones) {
      const { dist, t } = distanceToSegment(p, s.a, s.b);
      // Subtract the local radius so the metric is roughly surface-relative
      const r = s.r0 + (s.r1 - s.r0) * t;
      const d = Math.max(0, dist - r * 0.55);
      if (d < dmin) dmin = d;
      cand.push({ idx: s.index, d });
    }
    cand.sort((a, b) => a.d - b.d);
    let total = 0;
    const used: { idx: number; w: number }[] = [];
    for (let c = 0; c < cand.length && used.length < 4; c++) {
      const rel = (cand[c].d - dmin) / blendWidth;
      if (rel > 1) break;
      const w = Math.pow(1 - rel, 2.2);
      if (w <= 1e-4) continue;
      used.push({ idx: cand[c].idx, w });
      total += w;
    }
    if (used.length === 0) {
      used.push({ idx: cand[0].idx, w: 1 });
      total = 1;
    }
    for (let c = 0; c < 4; c++) {
      skinIndex[i * 4 + c] = c < used.length ? used[c].idx : 0;
      skinWeight[i * 4 + c] = c < used.length ? used[c].w / total : 0;
    }

    // Cylindrical UVs, tuned so pore/weave detail tiles believably
    uv[i * 2] = (Math.atan2(p.x, p.z - 0.02) / (Math.PI * 2) + 0.5) * 2.2;
    uv[i * 2 + 1] = p.y * 1.6;
    regionMask[i] = classifyRegion(cand[0].idx, rig, outfit, p);
  }

  geometry.setAttribute('skinIndex', new THREE.BufferAttribute(skinIndex, 4));
  geometry.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeight, 4));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));

  // ---- split triangles into material groups by majority vote ----
  const idx = iso.indices;
  const buckets: number[][] = [[], [], []];
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t];
    const b = idx[t + 1];
    const c = idx[t + 2];
    let skin = 0;
    let cloth = 0;
    let shoe = 0;
    for (const v of [a, b, c]) {
      if (regionMask[v] === 2) shoe++;
      else if (regionMask[v] === 1) cloth++;
      else skin++;
    }
    const region = shoe >= 2 ? 2 : cloth >= skin ? 1 : 0;
    buckets[region].push(a, b, c);
  }

  const ordered: number[] = [];
  const regionOrder: BodyRegion[] = [];
  const names: BodyRegion[] = ['skin', 'cloth', 'shoe'];
  geometry.clearGroups();
  let start = 0;
  for (let r = 0; r < 3; r++) {
    if (buckets[r].length === 0) continue;
    ordered.push(...buckets[r]);
    geometry.addGroup(start, buckets[r].length, regionOrder.length);
    regionOrder.push(names[r]);
    start += buckets[r].length;
  }
  geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(ordered), 1));
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();

  return { geometry, regionOrder, vertexCount, triangleCount: ordered.length / 3 };
}
