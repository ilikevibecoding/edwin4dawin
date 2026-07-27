import * as THREE from 'three';
import type { MaterialLibrary } from '../render/textures/MaterialLibrary';
import type { ActorCapsule } from '../physics/RapierWorld';
import { GunKit, type WeaponModel } from '../weapons/models/GunKit';
import type { Rng } from '../core/MathX';

/**
 * EnemyModel.ts — procedural, skinned soldier characters.
 *
 * Each enemy is a single {@link THREE.SkinnedMesh} (body + rigidly-attached
 * gear baked into the same geometry) driven by a real {@link THREE.Bone}
 * hierarchy, plus a separate rifle group parented to the right-hand bone so the
 * animator can sling/aim it independently.
 *
 * # Sharing & performance
 * The expensive parts — the merged body geometry, the material set and the
 * rifle prototype — are built **once per (variant, palette)** and cached, then
 * shared across every instance. Only the ~19-bone skeleton + thin SkinnedMesh
 * wrappers are per-instance, so 16+ soldiers cost almost nothing to spawn.
 *
 * Two LODs share the same skeleton via a {@link THREE.LOD}: a full-detail mesh
 * up close and a low-segment mesh far away.
 *
 * Frame: local +Y up, **-Z forward** (matches the level's facing convention),
 * feet at y=0 so the root can be dropped straight onto the ground sample.
 */

export type EnemyVariant = 'assault' | 'militia' | 'heavy';

export type BoneKey =
  | 'pelvis'
  | 'spine'
  | 'chest'
  | 'neck'
  | 'head'
  | 'clavL'
  | 'upperArmL'
  | 'lowerArmL'
  | 'handL'
  | 'clavR'
  | 'upperArmR'
  | 'lowerArmR'
  | 'handR'
  | 'thighL'
  | 'shinL'
  | 'footL'
  | 'thighR'
  | 'shinR'
  | 'footR';

interface BoneDef {
  key: BoneKey;
  parent: BoneKey | null;
  /** Absolute rest position in the local frame (metres). */
  pos: [number, number, number];
}

// Rest pose: standing straight, arms hanging at the sides (authored vertically
// so limb geometry is trivial to weight; the animator poses them onto the gun).
// Proportioned for a ~1.8 m soldier at roughly 8 heads.
const BONE_DEFS: BoneDef[] = [
  { key: 'pelvis', parent: null, pos: [0, 0.98, 0] },
  { key: 'spine', parent: 'pelvis', pos: [0, 1.12, 0] },
  { key: 'chest', parent: 'spine', pos: [0, 1.33, 0] },
  { key: 'neck', parent: 'chest', pos: [0, 1.52, 0] },
  { key: 'head', parent: 'neck', pos: [0, 1.6, 0] },
  { key: 'clavL', parent: 'chest', pos: [0.05, 1.47, 0] },
  { key: 'upperArmL', parent: 'clavL', pos: [0.18, 1.45, 0] },
  { key: 'lowerArmL', parent: 'upperArmL', pos: [0.18, 1.16, 0] },
  { key: 'handL', parent: 'lowerArmL', pos: [0.18, 0.9, 0] },
  { key: 'clavR', parent: 'chest', pos: [-0.05, 1.47, 0] },
  { key: 'upperArmR', parent: 'clavR', pos: [-0.18, 1.45, 0] },
  { key: 'lowerArmR', parent: 'upperArmR', pos: [-0.18, 1.16, 0] },
  { key: 'handR', parent: 'lowerArmR', pos: [-0.18, 0.9, 0] },
  { key: 'thighL', parent: 'pelvis', pos: [0.1, 0.93, 0] },
  { key: 'shinL', parent: 'thighL', pos: [0.1, 0.5, 0] },
  { key: 'footL', parent: 'shinL', pos: [0.1, 0.09, 0] },
  { key: 'thighR', parent: 'pelvis', pos: [-0.1, 0.93, 0] },
  { key: 'shinR', parent: 'thighR', pos: [-0.1, 0.5, 0] },
  { key: 'footR', parent: 'shinR', pos: [-0.1, 0.09, 0] },
];

const BONE_INDEX: Record<BoneKey, number> = BONE_DEFS.reduce((acc, d, i) => {
  acc[d.key] = i;
  return acc;
}, {} as Record<BoneKey, number>);

const bi = (k: BoneKey) => BONE_INDEX[k];

// ---------------------------------------------------------------------------
// Palettes
// ---------------------------------------------------------------------------

interface Palette {
  skin: number;
  /** Multiplies the camo albedo. */
  uniform: number;
  gear: number;
  strap: number;
  hard: number; // helmet / hard plastic
  glove: number; // gloves + boots
  accent: number; // pouches / metal buckles
}

const PALETTES: Record<EnemyVariant, Palette[]> = {
  assault: [
    { skin: 0xb98a63, uniform: 0x5c6242, gear: 0x2c2f27, strap: 0x1f221c, hard: 0x3b3e34, glove: 0x191a17, accent: 0x4a4d3f },
    { skin: 0xcaa079, uniform: 0x8a7d55, gear: 0x33302a, strap: 0x242118, hard: 0x494436, glove: 0x201d16, accent: 0x5a5344 },
    { skin: 0x8d6b4e, uniform: 0x53575a, gear: 0x2a2c2e, strap: 0x1b1d1e, hard: 0x393b3d, glove: 0x161718, accent: 0x474a4c },
  ],
  militia: [
    { skin: 0x8a6244, uniform: 0x6d5a3c, gear: 0x2e2a22, strap: 0x24201a, hard: 0x9a2f2a, glove: 0x2a241c, accent: 0x54463a },
    { skin: 0x6f4c33, uniform: 0x3b4a58, gear: 0x2a2c2e, strap: 0x1e2022, hard: 0x2a2a2a, glove: 0x1d1c1a, accent: 0x45403a },
    { skin: 0xa07a55, uniform: 0x5a5048, gear: 0x322c22, strap: 0x24201a, hard: 0xbcae86, glove: 0x2a241c, accent: 0x5a4d3c },
  ],
  heavy: [
    { skin: 0x9c7350, uniform: 0x3a3e3b, gear: 0x2a2d31, strap: 0x181a1c, hard: 0x33363b, glove: 0x141517, accent: 0x50555c },
    { skin: 0x7d5a3f, uniform: 0x2f302c, gear: 0x27251f, strap: 0x171613, hard: 0x312f28, glove: 0x131210, accent: 0x4a463a },
    { skin: 0xb0865e, uniform: 0x34302b, gear: 0x2b2724, strap: 0x1a1714, hard: 0x38332c, glove: 0x161311, accent: 0x544c40 },
  ],
};

// Fixed material-slot ordering shared by every body geometry.
const SLOT = {
  skin: 0,
  uniform: 1,
  gear: 2,
  strap: 3,
  hard: 4,
  glove: 5,
  accent: 6,
} as const;
const SLOT_COUNT = 7;

// ---------------------------------------------------------------------------
// Shared material cache (across the whole app)
// ---------------------------------------------------------------------------

const _matCache = new Map<string, THREE.Material>();
let _camoBase: THREE.MeshStandardMaterial | null = null;

function stdMat(key: string, color: number, roughness: number, metalness: number, envI = 0.35): THREE.Material {
  const cached = _matCache.get(key);
  if (cached) return cached;
  const m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
  m.envMapIntensity = envI;
  m.name = key;
  _matCache.set(key, m);
  return m;
}

function camoMat(materials: MaterialLibrary | null, color: number): THREE.Material {
  const key = `camo_${color.toString(16)}`;
  const cached = _matCache.get(key);
  if (cached) return cached;
  let m: THREE.MeshStandardMaterial;
  if (materials) {
    if (!_camoBase) _camoBase = materials.get('fabric_camo') as THREE.MeshStandardMaterial;
    m = _camoBase.clone();
    m.color = new THREE.Color(color);
    m.roughness = 0.95;
    m.metalness = 0;
    m.envMapIntensity = 0.3;
    // Fabric shows the camo weave a little smaller on a body than a tent.
    for (const t of [m.map, m.normalMap, m.roughnessMap, m.aoMap]) {
      if (t) {
        const t2 = t.clone();
        t2.repeat.set(3.5, 3.5);
        t2.needsUpdate = true;
        if (t === m.map) m.map = t2;
        else if (t === m.normalMap) m.normalMap = t2;
        else if (t === m.roughnessMap) m.roughnessMap = t2;
        else if (t === m.aoMap) m.aoMap = t2;
      }
    }
  } else {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0 });
  }
  m.name = key;
  _matCache.set(key, m);
  return m;
}

function paletteMaterials(variant: EnemyVariant, p: Palette, materials: MaterialLibrary | null): THREE.Material[] {
  const out: THREE.Material[] = new Array(SLOT_COUNT);
  out[SLOT.skin] = stdMat(`skin_${p.skin.toString(16)}`, p.skin, 0.68, 0.0);
  out[SLOT.uniform] = variant === 'militia'
    ? stdMat(`cloth_${p.uniform.toString(16)}`, p.uniform, 0.95, 0.0)
    : camoMat(materials, p.uniform);
  out[SLOT.gear] = stdMat(`gear_${p.gear.toString(16)}`, p.gear, 0.72, 0.08);
  out[SLOT.strap] = stdMat(`strap_${p.strap.toString(16)}`, p.strap, 0.86, 0.0);
  out[SLOT.hard] = stdMat(`hard_${p.hard.toString(16)}`, p.hard, 0.55, 0.18);
  out[SLOT.glove] = stdMat(`glove_${p.glove.toString(16)}`, p.glove, 0.9, 0.02);
  out[SLOT.accent] = stdMat(`accent_${p.accent.toString(16)}`, p.accent, 0.6, 0.3);
  return out;
}

// ---------------------------------------------------------------------------
// Mesh builder: accumulate skinned geometry with per-material groups
// ---------------------------------------------------------------------------

type Weight = [number, number]; // [boneIndex, weight]

class MeshBuilder {
  private pos: number[] = [];
  private uv: number[] = [];
  private si: number[] = [];
  private sw: number[] = [];
  private idxBySlot: number[][] = Array.from({ length: SLOT_COUNT }, () => []);

  private addVertex(x: number, y: number, z: number, w: Weight[], u = 0, v = 0): number {
    const idx = this.pos.length / 3;
    this.pos.push(x, y, z);
    this.uv.push(u, v);
    let sum = 0;
    for (let i = 0; i < 4; i++) {
      const b = w[i]?.[0] ?? 0;
      const wt = w[i]?.[1] ?? 0;
      this.si.push(b);
      this.sw.push(wt);
      sum += wt;
    }
    // Normalise the 4 weights just added.
    if (sum > 1e-6) {
      const base = idx * 4;
      for (let i = 0; i < 4; i++) this.sw[base + i] /= sum;
    }
    return idx;
  }

  private tri(slot: number, a: number, b: number, c: number) {
    this.idxBySlot[slot].push(a, b, c);
  }

  /** A vertical-ish tube from a list of rings. */
  tube(
    rings: { y: number; cx: number; cz: number; rx: number; rz: number; w: Weight[] }[],
    segs: number,
    slot: number,
    capTop = true,
    capBottom = true
  ) {
    const ringVerts: number[][] = [];
    for (const r of rings) {
      const verts: number[] = [];
      for (let s = 0; s <= segs; s++) {
        const si = s % segs;
        const t = (si / segs) * Math.PI * 2;
        // Duplicate the seam vertex (s==segs) so the UV wraps cleanly.
        verts.push(this.addVertex(r.cx + Math.cos(t) * r.rx, r.y, r.cz + Math.sin(t) * r.rz, r.w, s / segs, r.y));
      }
      ringVerts.push(verts);
    }
    for (let k = 0; k < rings.length - 1; k++) {
      const a = ringVerts[k];
      const b = ringVerts[k + 1];
      for (let s = 0; s < segs; s++) {
        this.tri(slot, a[s], b[s], b[s + 1]);
        this.tri(slot, a[s], b[s + 1], a[s + 1]);
      }
    }
    if (capBottom) {
      const r = rings[0];
      const c = this.addVertex(r.cx, r.y, r.cz, r.w, 0.5, r.y);
      const ring = ringVerts[0];
      for (let s = 0; s < segs; s++) this.tri(slot, c, ring[s + 1], ring[s]);
    }
    if (capTop) {
      const r = rings[rings.length - 1];
      const c = this.addVertex(r.cx, r.y, r.cz, r.w, 0.5, r.y);
      const ring = ringVerts[ringVerts.length - 1];
      for (let s = 0; s < segs; s++) this.tri(slot, c, ring[s], ring[s + 1]);
    }
  }

  /** Bake a pre-transformed THREE geometry, weighting all verts identically. */
  addGeometry(geo: THREE.BufferGeometry, slot: number, w: Weight[]) {
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
    const uvAttr = geo.getAttribute('uv') as THREE.BufferAttribute | undefined;
    const base = this.pos.length / 3;
    for (let i = 0; i < posAttr.count; i++) {
      this.addVertex(
        posAttr.getX(i),
        posAttr.getY(i),
        posAttr.getZ(i),
        w,
        uvAttr ? uvAttr.getX(i) : 0,
        uvAttr ? uvAttr.getY(i) : 0
      );
    }
    const index = geo.getIndex();
    if (index) {
      for (let i = 0; i < index.count; i += 3) {
        this.tri(slot, base + index.getX(i), base + index.getX(i + 1), base + index.getX(i + 2));
      }
    } else {
      for (let i = 0; i < posAttr.count; i += 3) this.tri(slot, base + i, base + i + 1, base + i + 2);
    }
    geo.dispose();
  }

  build(): THREE.BufferGeometry {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.si, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.sw, 4));
    const index: number[] = [];
    let start = 0;
    for (let slot = 0; slot < SLOT_COUNT; slot++) {
      const arr = this.idxBySlot[slot];
      if (arr.length === 0) continue;
      for (const v of arr) index.push(v);
      geo.addGroup(start, arr.length, slot);
      start += arr.length;
    }
    geo.setIndex(index);
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    return geo;
  }
}

// ---------------------------------------------------------------------------
// Body construction
// ---------------------------------------------------------------------------

const W = (k: BoneKey, w = 1): Weight => [bi(k), w];
const BLEND = (a: BoneKey, b: BoneKey): Weight[] => [[bi(a), 0.5], [bi(b), 0.5]];

interface BuildOpts {
  variant: EnemyVariant;
  detail: 'high' | 'low';
}

/** Position a fresh geometry with translate + optional euler + scale. */
function place(
  geo: THREE.BufferGeometry,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0
): THREE.BufferGeometry {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz));
  m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1));
  geo.applyMatrix4(m);
  return geo;
}

function buildBodyGeometry(opts: BuildOpts): THREE.BufferGeometry {
  const b = new MeshBuilder();
  const hi = opts.detail === 'high';
  const seg = hi ? 10 : 6;
  const legSeg = hi ? 8 : 5;
  const armSeg = hi ? 7 : 5;
  const heavy = opts.variant === 'heavy';
  const girth = heavy ? 1.22 : 1.0;

  // ----- Torso (pelvis -> chest, elliptical rings) -----
  b.tube(
    [
      { y: 0.92, cx: 0, cz: 0, rx: 0.15 * girth, rz: 0.12 * girth, w: [W('pelvis')] },
      { y: 1.02, cx: 0, cz: 0, rx: 0.145 * girth, rz: 0.115 * girth, w: BLEND('pelvis', 'spine') },
      { y: 1.12, cx: 0, cz: 0.005, rx: 0.15 * girth, rz: 0.115 * girth, w: [W('spine')] },
      { y: 1.22, cx: 0, cz: 0.005, rx: 0.16 * girth, rz: 0.12 * girth, w: BLEND('spine', 'chest') },
      { y: 1.33, cx: 0, cz: 0, rx: 0.185 * girth, rz: 0.135 * girth, w: [W('chest')] },
      { y: 1.44, cx: 0, cz: 0, rx: 0.2 * girth, rz: 0.14 * girth, w: [W('chest')] },
      { y: 1.5, cx: 0, cz: 0, rx: 0.15, rz: 0.11, w: BLEND('chest', 'neck') },
    ],
    seg,
    SLOT.uniform,
    false,
    true
  );

  // Militia robe: a flared skirt hanging from the hips.
  if (opts.variant === 'militia') {
    b.tube(
      [
        { y: 0.92, cx: 0, cz: 0, rx: 0.16, rz: 0.13, w: [W('pelvis')] },
        { y: 0.74, cx: 0, cz: 0, rx: 0.18, rz: 0.15, w: [W('pelvis')] },
        { y: 0.58, cx: 0, cz: 0, rx: 0.2, rz: 0.17, w: [W('pelvis')] },
      ],
      seg,
      SLOT.uniform,
      false,
      false
    );
  }

  // ----- Neck -----
  b.addGeometry(place(new THREE.CylinderGeometry(0.055, 0.07, 0.12, seg), 0, 1.53, 0), SLOT.skin, [W('neck')]);

  // ----- Head + face -----
  const skull = new THREE.SphereGeometry(0.1, hi ? 14 : 8, hi ? 12 : 7);
  skull.scale(0.95, 1.08, 1.02);
  b.addGeometry(place(skull, 0, 1.68, 0.005), SLOT.skin, [W('head')]);
  // Jaw / lower face.
  b.addGeometry(place(new THREE.BoxGeometry(0.13, 0.09, 0.13), 0, 1.6, 0.01), SLOT.skin, [W('head')]);

  buildHeadgear(b, opts, hi);

  // ----- Arms (both sides) -----
  for (const side of [1, -1] as const) {
    const uk: BoneKey = side > 0 ? 'upperArmL' : 'upperArmR';
    const lk: BoneKey = side > 0 ? 'lowerArmL' : 'lowerArmR';
    const hk: BoneKey = side > 0 ? 'handL' : 'handR';
    const x = 0.18 * side;
    // Deltoid / shoulder cap.
    const delt = new THREE.SphereGeometry(0.075 * (heavy ? 1.2 : 1), armSeg + 2, armSeg);
    b.addGeometry(place(delt, x, 1.45, 0), SLOT.uniform, [W(uk)]);
    b.tube(
      [
        { y: 1.42, cx: x, cz: 0, rx: 0.066, rz: 0.066, w: [W(uk)] },
        { y: 1.29, cx: x, cz: 0, rx: 0.06, rz: 0.06, w: [W(uk)] },
        { y: 1.16, cx: x, cz: 0, rx: 0.054, rz: 0.054, w: BLEND(uk, lk) },
        { y: 1.03, cx: x, cz: 0, rx: 0.051, rz: 0.051, w: [W(lk)] },
        { y: 0.91, cx: x, cz: 0, rx: 0.048, rz: 0.048, w: [W(lk)] },
      ],
      armSeg,
      SLOT.uniform,
      false,
      false
    );
    // Gloved hand (grips the rifle).
    const hand = new THREE.BoxGeometry(0.05, 0.1, 0.075);
    b.addGeometry(place(hand, x, 0.86, 0.01), SLOT.glove, [W(hk)]);
    if (heavy) {
      // Shoulder pauldron.
      const paul = new THREE.SphereGeometry(0.1, armSeg + 2, armSeg);
      paul.scale(1, 0.8, 1);
      b.addGeometry(place(paul, x, 1.48, 0), SLOT.gear, [W(uk)]);
    }
  }

  // ----- Legs (both sides) -----
  for (const side of [1, -1] as const) {
    const tk: BoneKey = side > 0 ? 'thighL' : 'thighR';
    const sk: BoneKey = side > 0 ? 'shinL' : 'shinR';
    const fk: BoneKey = side > 0 ? 'footL' : 'footR';
    const x = 0.1 * side;
    b.tube(
      [
        { y: 0.94, cx: x, cz: 0, rx: 0.1 * girth, rz: 0.11 * girth, w: [W(tk)] },
        { y: 0.74, cx: x, cz: 0.005, rx: 0.088 * girth, rz: 0.095 * girth, w: [W(tk)] },
        { y: 0.52, cx: x, cz: 0, rx: 0.075, rz: 0.078, w: BLEND(tk, sk) },
        { y: 0.32, cx: x, cz: 0.005, rx: 0.062, rz: 0.07, w: [W(sk)] },
        { y: 0.14, cx: x, cz: 0, rx: 0.05, rz: 0.055, w: [W(sk)] },
      ],
      legSeg,
      SLOT.uniform,
      false,
      false
    );
    // Boot: ankle cuff + forward-projecting foot + sole.
    b.addGeometry(place(new THREE.BoxGeometry(0.1, 0.12, 0.12), x, 0.11, 0), SLOT.glove, [W(sk)]);
    b.addGeometry(place(new THREE.BoxGeometry(0.11, 0.09, 0.28), x, 0.045, -0.06), SLOT.glove, [W(fk)]);
    b.addGeometry(place(new THREE.BoxGeometry(0.12, 0.03, 0.3), x, 0.015, -0.06), SLOT.strap, [W(fk)]);
    // Kneepad.
    if (opts.variant !== 'militia') {
      const knee = new THREE.SphereGeometry(0.07, armSeg, armSeg);
      knee.scale(1, 1, 0.7);
      b.addGeometry(place(knee, x, 0.5, -0.06), SLOT.gear, [W(sk)]);
    }
  }

  buildTorsoGear(b, opts, hi);
  return b.build();
}

function buildHeadgear(b: MeshBuilder, opts: BuildOpts, hi: boolean) {
  const seg = hi ? 14 : 8;
  if (opts.variant === 'militia') {
    // Headscarf / shemagh: cloth dome + a hanging rear flap.
    const dome = new THREE.SphereGeometry(0.115, seg, hi ? 10 : 6, 0, Math.PI * 2, 0, Math.PI * 0.62);
    b.addGeometry(place(dome, 0, 1.67, 0.005), SLOT.hard, [W('head')]);
    b.addGeometry(place(new THREE.BoxGeometry(0.19, 0.14, 0.03), 0, 1.6, -0.08), SLOT.hard, [W('head')]);
    // Face wrap across the lower face.
    b.addGeometry(place(new THREE.BoxGeometry(0.14, 0.08, 0.12), 0, 1.6, 0.02), SLOT.strap, [W('head')]);
    return;
  }

  // Combat helmet: dome + brim.
  const dome = new THREE.SphereGeometry(0.125, seg, hi ? 12 : 7, 0, Math.PI * 2, 0, Math.PI * 0.58);
  b.addGeometry(place(dome, 0, 1.7, 0.004), SLOT.hard, [W('head')]);
  b.addGeometry(place(new THREE.CylinderGeometry(0.128, 0.128, 0.03, seg), 0, 1.72, 0.004), SLOT.hard, [W('head')]);
  // Balaclava covering the lower face.
  b.addGeometry(place(new THREE.BoxGeometry(0.135, 0.1, 0.125), 0, 1.6, 0.015), SLOT.strap, [W('head')]);

  if (opts.variant === 'heavy') {
    // Full-face visor.
    b.addGeometry(place(new THREE.BoxGeometry(0.14, 0.07, 0.02), 0, 1.665, 0.1), SLOT.accent, [W('head')]);
    b.addGeometry(place(new THREE.BoxGeometry(0.15, 0.14, 0.14), 0, 1.63, 0.02), SLOT.hard, [W('head')]);
  } else {
    // NVG mount on the brow + goggles band.
    b.addGeometry(place(new THREE.BoxGeometry(0.04, 0.04, 0.06), 0, 1.74, 0.11), SLOT.gear, [W('head')]);
    b.addGeometry(place(new THREE.BoxGeometry(0.03, 0.03, 0.03), 0, 1.75, 0.15), SLOT.accent, [W('head')]);
    // Goggles across the brow.
    b.addGeometry(place(new THREE.BoxGeometry(0.15, 0.035, 0.02), 0, 1.72, 0.1), SLOT.accent, [W('head')]);
    // Side rails.
    for (const s of [1, -1]) {
      b.addGeometry(place(new THREE.BoxGeometry(0.02, 0.03, 0.08), s * 0.11, 1.71, 0.02), SLOT.gear, [W('head')]);
    }
  }
}

function buildTorsoGear(b: MeshBuilder, opts: BuildOpts, hi: boolean) {
  const heavy = opts.variant === 'heavy';
  const front = 0.14;

  if (opts.variant === 'militia') {
    // Chest rig: diagonal bandolier + a couple of pouches, no hard plate.
    b.addGeometry(place(new THREE.BoxGeometry(0.06, 0.42, 0.04), 0.02, 1.28, front - 0.02, 0, 0, 0.5), SLOT.strap, [W('chest')]);
    for (let i = 0; i < 3; i++) {
      b.addGeometry(place(new THREE.BoxGeometry(0.06, 0.09, 0.05), -0.06 + i * 0.07, 1.36 - i * 0.06, front), SLOT.gear, [W('chest')]);
    }
    // Simple belt.
    b.addGeometry(place(new THREE.TorusGeometry(0.16, 0.02, 6, 14), 0, 0.94, 0, Math.PI / 2), SLOT.strap, [W('pelvis')]);
    return;
  }

  // Plate carrier: front plate, back plate, cummerbund, shoulder straps.
  const plateW = heavy ? 0.42 : 0.36;
  const plateH = heavy ? 0.42 : 0.36;
  b.addGeometry(place(new THREE.BoxGeometry(plateW, plateH, 0.05), 0, 1.3, front), SLOT.gear, [W('chest')]);
  b.addGeometry(place(new THREE.BoxGeometry(plateW, plateH, 0.05), 0, 1.3, -front + 0.01), SLOT.gear, [W('chest')]);
  b.addGeometry(place(new THREE.BoxGeometry(plateW + 0.02, 0.14, 0.28), 0, 1.15, 0), SLOT.strap, [W('chest')]);
  for (const s of [1, -1]) {
    b.addGeometry(place(new THREE.BoxGeometry(0.07, 0.24, 0.06), s * 0.13, 1.45, 0.02), SLOT.strap, [W('chest')]);
  }

  // Front mag pouches (3) with mags poking out.
  for (let i = -1; i <= 1; i++) {
    b.addGeometry(place(new THREE.BoxGeometry(0.075, 0.13, 0.06), i * 0.09, 1.22, front + 0.01), SLOT.strap, [W('chest')]);
    b.addGeometry(place(new THREE.BoxGeometry(0.05, 0.05, 0.04), i * 0.09, 1.3, front + 0.02), SLOT.accent, [W('chest')]);
  }
  // Admin / utility pouch + radio with antenna on the left shoulder.
  b.addGeometry(place(new THREE.BoxGeometry(0.1, 0.1, 0.05), 0.12, 1.36, front), SLOT.gear, [W('chest')]);
  b.addGeometry(place(new THREE.BoxGeometry(0.06, 0.12, 0.05), -0.14, 1.42, -0.1), SLOT.gear, [W('chest')]);
  b.addGeometry(place(new THREE.CylinderGeometry(0.006, 0.006, 0.22, 6), -0.14, 1.56, -0.1), SLOT.accent, [W('chest')]);

  // Belt + hip pouches.
  b.addGeometry(place(new THREE.BoxGeometry(0.34, 0.06, 0.26), 0, 0.96, 0), SLOT.strap, [W('pelvis')]);
  for (const s of [1, -1]) {
    b.addGeometry(place(new THREE.BoxGeometry(0.09, 0.11, 0.07), s * 0.15, 0.92, 0.02), SLOT.gear, [W('pelvis')]);
  }

  // Backpack.
  const packH = heavy ? 0.46 : 0.36;
  b.addGeometry(place(new THREE.BoxGeometry(0.32, packH, 0.16), 0, 1.28, -front - 0.09), SLOT.gear, [W('chest')]);
  if (hi) {
    b.addGeometry(place(new THREE.BoxGeometry(0.1, 0.14, 0.06), 0, 1.16, -front - 0.18), SLOT.strap, [W('chest')]);
  }
}

// ---------------------------------------------------------------------------
// Rifle prototypes (built once, cloned per instance)
// ---------------------------------------------------------------------------

let _gunkit: GunKit | null = null;
const _rifleProto = new Map<string, WeaponModel>();

function getGunKit(materials: MaterialLibrary | null): GunKit {
  if (!_gunkit) _gunkit = new GunKit(materials);
  return _gunkit;
}

/** Build an AR- or AK-style enemy rifle from GunKit parts (shared geometry). */
function buildRifleProto(kind: 'ar' | 'ak' | 'lmg', materials: MaterialLibrary | null): WeaponModel {
  const gk = getGunKit(materials);
  const group = new THREE.Group();
  group.name = `enemy_rifle_${kind}`;

  const bodyMat = kind === 'ak' ? 'gunmetal' : 'polymer_grey';
  const receiver = gk.box(0.05, 0.08, 0.34, bodyMat, 0.006);
  receiver.position.z = -0.02;
  group.add(receiver);

  // Barrel + handguard forward.
  const handguard = gk.box(0.045, 0.05, 0.26, bodyMat, 0.006);
  handguard.position.z = -0.3;
  group.add(handguard);
  const barrel = gk.tubeZ(0.011, 0.011, kind === 'lmg' ? 0.34 : 0.24, 'gunmetal', 12);
  barrel.position.z = -0.42;
  group.add(barrel);
  const muzzleDev = gk.muzzleDevice(0.011, 'gunmetal');
  muzzleDev.position.z = kind === 'lmg' ? -0.76 : -0.66;
  group.add(muzzleDev);

  // Top rail + red dot.
  const rail = gk.picatinnyRail(0.18, 0.02, 'black');
  rail.position.set(0, 0.045, -0.05);
  group.add(rail);
  const optic = gk.redDot('black', kind === 'ak' ? 0xff7a2a : 0xff2a2a);
  optic.position.set(0, 0.055, -0.02);
  group.add(optic);

  // Pistol grip + trigger guard.
  const grip = gk.pistolGrip(bodyMat, 0.3, 0.11);
  grip.position.set(0, -0.04, 0.06);
  group.add(grip);
  const tg = gk.triggerGroup('gunmetal');
  tg.group.position.set(0, -0.02, 0.02);
  group.add(tg.group);

  // Magazine (curved) — kept as a named part for reload animation.
  const mag = kind === 'lmg' ? gk.magazine(100, 'polymer_grey') : gk.magazine(30, kind === 'ak' ? 'steel' : 'polymer_grey');
  mag.position.set(0, -0.06, -0.06);
  if (kind === 'ak') mag.rotation.x = -0.15;
  group.add(mag);

  // Stock.
  const stock = kind === 'ak' ? gk.fixedStock('wood', 0.24) : gk.collapsibleStock(bodyMat);
  stock.position.z = 0.14;
  group.add(stock);

  // Grip anchors.
  const gripFront = new THREE.Object3D();
  gripFront.position.set(0, -0.03, -0.28);
  group.add(gripFront);
  const gripRear = new THREE.Object3D();
  gripRear.position.set(0, -0.05, 0.05);
  group.add(gripRear);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0, kind === 'lmg' ? -0.8 : -0.7);
  group.add(muzzle);

  group.traverse((o) => {
    o.castShadow = true;
    o.receiveShadow = false;
  });

  return {
    id: `enemy_${kind}`,
    group,
    muzzle,
    sightPoint: optic,
    adsDepth: 0.1,
    mag,
    gripRear,
    gripFront,
    ejectPoint: gripRear,
    trigger: tg.trigger,
    flashScale: kind === 'lmg' ? 1.3 : 1.0,
  };
}

function getRifle(kind: 'ar' | 'ak' | 'lmg', materials: MaterialLibrary | null): WeaponModel {
  let proto = _rifleProto.get(kind);
  if (!proto) {
    proto = buildRifleProto(kind, materials);
    _rifleProto.set(kind, proto);
  }
  // Clone shares geometry + materials; only the object graph is new.
  const group = proto.group.clone(true);
  const find = (name: string) => group.getObjectByName(name) ?? null;
  // Re-resolve parts on the clone by walking to matching indices.
  const byRef = (ref: THREE.Object3D): THREE.Object3D => {
    // Map original -> clone by traversal order (clone preserves order).
    const origList: THREE.Object3D[] = [];
    proto!.group.traverse((o) => origList.push(o));
    const cloneList: THREE.Object3D[] = [];
    group.traverse((o) => cloneList.push(o));
    const i = origList.indexOf(ref);
    return i >= 0 ? cloneList[i] : ref;
  };
  void find;
  return {
    ...proto,
    group,
    muzzle: byRef(proto.muzzle),
    sightPoint: byRef(proto.sightPoint),
    mag: proto.mag ? byRef(proto.mag) : undefined,
    gripRear: byRef(proto.gripRear),
    gripFront: byRef(proto.gripFront),
    ejectPoint: byRef(proto.ejectPoint),
    trigger: proto.trigger ? byRef(proto.trigger) : undefined,
  };
}

// ---------------------------------------------------------------------------
// Template cache (geometry + materials per variant/palette)
// ---------------------------------------------------------------------------

interface Template {
  geomHigh: THREE.BufferGeometry;
  geomLow: THREE.BufferGeometry;
  materials: THREE.Material[];
  rifleKind: 'ar' | 'ak' | 'lmg';
}

const _templates = new Map<string, Template>();

function getTemplate(variant: EnemyVariant, paletteIdx: number, materials: MaterialLibrary | null): Template {
  const key = `${variant}:${paletteIdx}`;
  const cached = _templates.get(key);
  if (cached) return cached;
  const pals = PALETTES[variant];
  const pal = pals[paletteIdx % pals.length];
  const t: Template = {
    geomHigh: buildBodyGeometry({ variant, detail: 'high' }),
    geomLow: buildBodyGeometry({ variant, detail: 'low' }),
    materials: paletteMaterials(variant, pal, materials),
    rifleKind: variant === 'heavy' ? 'lmg' : variant === 'militia' ? 'ak' : 'ar',
  };
  _templates.set(key, t);
  return t;
}

// ---------------------------------------------------------------------------
// Skeleton (fresh per instance)
// ---------------------------------------------------------------------------

function buildBones(): { rootBone: THREE.Bone; bones: Record<BoneKey, THREE.Bone>; ordered: THREE.Bone[] } {
  const bones = {} as Record<BoneKey, THREE.Bone>;
  const ordered: THREE.Bone[] = [];
  for (const def of BONE_DEFS) {
    const bone = new THREE.Bone();
    bone.name = def.key;
    bones[def.key] = bone;
    ordered.push(bone);
  }
  for (const def of BONE_DEFS) {
    const bone = bones[def.key];
    if (def.parent) {
      const parent = bones[def.parent];
      const pp = BONE_DEFS.find((d) => d.key === def.parent)!.pos;
      bone.position.set(def.pos[0] - pp[0], def.pos[1] - pp[1], def.pos[2] - pp[2]);
      parent.add(bone);
    } else {
      bone.position.set(def.pos[0], def.pos[1], def.pos[2]);
    }
  }
  return { rootBone: bones.pelvis, bones, ordered };
}

// ---------------------------------------------------------------------------
// Public instance
// ---------------------------------------------------------------------------

export interface EnemyModelParts {
  root: THREE.Group;
  lod: THREE.LOD;
  meshHigh: THREE.SkinnedMesh;
  meshLow: THREE.SkinnedMesh;
  skeleton: THREE.Skeleton;
  bones: Record<BoneKey, THREE.Bone>;
  rifle: WeaponModel;
  variant: EnemyVariant;
  /** Height scale applied to the root for per-instance size variation. */
  heightScale: number;
  dispose(): void;
}

export interface EnemyModelOptions {
  variant: EnemyVariant;
  rng: Rng;
  materials: MaterialLibrary | null;
}

/**
 * Build one enemy instance. Geometry/materials/rifle-geometry are shared with
 * every other instance of the same (variant, palette); only the skeleton and
 * the SkinnedMesh wrappers are unique here.
 */
export function createEnemyModel(opts: EnemyModelOptions): EnemyModelParts {
  const { variant, rng, materials } = opts;
  const paletteIdx = rng.int(0, PALETTES[variant].length - 1);
  const tmpl = getTemplate(variant, paletteIdx, materials);

  const { rootBone, bones, ordered } = buildBones();
  const skeleton = new THREE.Skeleton(ordered);

  const meshHigh = new THREE.SkinnedMesh(tmpl.geomHigh, tmpl.materials);
  const meshLow = new THREE.SkinnedMesh(tmpl.geomLow, tmpl.materials);
  meshHigh.castShadow = true;
  meshLow.castShadow = true;
  meshHigh.frustumCulled = false;
  meshLow.frustumCulled = false;

  const root = new THREE.Group();
  root.name = `enemy_${variant}`;
  meshHigh.add(rootBone); // convention: bones live under a bound mesh
  meshHigh.bind(skeleton);
  meshLow.bind(skeleton, meshHigh.bindMatrix);

  const lod = new THREE.LOD();
  lod.addLevel(meshHigh, 0);
  lod.addLevel(meshLow, 16);
  lod.autoUpdate = true;
  root.add(lod);

  // Rifle, mounted in chest space (a natural low-ready carry). Because the
  // rifle and both arms are rigid children of the chest, the hands stay glued
  // to the weapon no matter how the upper body aims — the animator solves the
  // arm poses once against these grip anchors.
  const rifle = getRifle(tmpl.rifleKind, materials);
  // Shouldered/chest-ready: sit the receiver just below the chest bone and
  // canted slightly to the trigger-hand (right, -X) shoulder, so the animator's
  // solved arms read as "aiming the weapon" rather than carrying it at the hip.
  rifle.group.position.set(-0.07, -0.02, -0.05);
  rifle.group.rotation.set(0.05, 0.05, 0.05);
  bones.chest.add(rifle.group);

  // Per-instance size variation (cheap, keeps shared geometry).
  const base = variant === 'heavy' ? 1.06 : variant === 'militia' ? 0.97 : 1.0;
  const heightScale = base * rng.range(0.97, 1.05);
  const widthScale = (variant === 'heavy' ? 1.06 : 1.0) * rng.range(0.96, 1.05);
  root.scale.set(widthScale, heightScale, widthScale);

  return {
    root,
    lod,
    meshHigh,
    meshLow,
    skeleton,
    bones,
    rifle,
    variant,
    heightScale,
    dispose() {
      root.removeFromParent();
      skeleton.dispose();
      // Geometry/materials are shared templates — not disposed per instance.
    },
  };
}

/** Actor-local hitbox capsules for a soldier of the given stance. */
export function hitboxCapsules(stance: 'stand' | 'crouch' | 'prone', heightScale: number): ActorCapsule[] {
  const h = heightScale;
  if (stance === 'prone') {
    return [
      { part: 'head', center: [0, 0.28 * h, -0.7], halfHeight: 0.04, radius: 0.13 },
      { part: 'torso', center: [0, 0.28 * h, -0.2], halfHeight: 0.28, radius: 0.2 },
      { part: 'limb', center: [0, 0.24 * h, 0.35], halfHeight: 0.28, radius: 0.14 },
    ];
  }
  if (stance === 'crouch') {
    return [
      { part: 'head', center: [0, 1.24 * h, 0.02], halfHeight: 0.04, radius: 0.13 },
      { part: 'torso', center: [0, 0.95 * h, 0], halfHeight: 0.2, radius: 0.24 },
      { part: 'limb', center: [0, 0.55 * h, 0.06], halfHeight: 0.22, radius: 0.17 },
    ];
  }
  return [
    { part: 'head', center: [0, 1.68 * h, 0.01], halfHeight: 0.05, radius: 0.13 },
    { part: 'torso', center: [0, 1.28 * h, 0], halfHeight: 0.2, radius: 0.24 },
    { part: 'limb', center: [0, 0.55 * h, 0], halfHeight: 0.34, radius: 0.15 },
  ];
}

/** Dispose all shared templates/materials (called on system teardown). */
export function disposeEnemyTemplates(): void {
  for (const t of _templates.values()) {
    t.geomHigh.dispose();
    t.geomLow.dispose();
  }
  _templates.clear();
  for (const m of _matCache.values()) m.dispose();
  _matCache.clear();
  _camoBase = null;
  for (const proto of _rifleProto.values()) proto.group.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
  });
  _rifleProto.clear();
  _gunkit?.dispose();
  _gunkit = null;
}

export { BONE_INDEX };
