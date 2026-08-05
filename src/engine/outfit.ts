/**
 * Clothing is derived from the body itself: triangles in the relevant regions
 * are extracted, inflated along their normals and re-bound to the same
 * skeleton, so garments deform with the character for free. Collars, lapels,
 * belts and cuffs are then added as small hand-built pieces.
 */
import * as THREE from 'three';
import { clamp, lerp, smoothstep } from './math';
import { REGION } from './body';
import type { Dim } from './body';
import type { OutfitSpec } from './charspec';
import { chassisMaterial, clothMaterial, emissiveMaterial, leatherMaterial, paintedMetal } from './materials';

export type ShellOpts = {
  regions: number[];
  /** Inflation in metres, optionally varying by height fraction. */
  inflate: number | ((y: number, x: number, z: number) => number);
  yMin?: number;
  yMax?: number;
  /** Discard triangles whose centroid is outside this predicate. */
  keep?: (p: THREE.Vector3) => boolean;
};

/** Extract + inflate a garment shell from a skinned body geometry. */
export function extractShell(src: THREE.BufferGeometry, o: ShellOpts): THREE.BufferGeometry | null {
  const pos = src.getAttribute('position');
  const nor = src.getAttribute('normal');
  const uv = src.getAttribute('uv');
  const reg = src.getAttribute('aRegion');
  const si = src.getAttribute('skinIndex');
  const sw = src.getAttribute('skinWeight');
  const index = src.getIndex()!;
  const yMin = o.yMin ?? -Infinity;
  const yMax = o.yMax ?? Infinity;

  const ok = new Uint8Array(pos.count);
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const inRegion = o.regions.includes(reg.getX(i));
    ok[i] = inRegion && p.y >= yMin && p.y <= yMax && (!o.keep || o.keep(p)) ? 1 : 0;
  }

  const remap = new Int32Array(pos.count).fill(-1);
  const outPos: number[] = [];
  const outNor: number[] = [];
  const outUv: number[] = [];
  const outSi: number[] = [];
  const outSw: number[] = [];
  const outIdx: number[] = [];
  const n = new THREE.Vector3();

  const take = (i: number): number => {
    if (remap[i] >= 0) return remap[i];
    p.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(nor, i);
    const infl = typeof o.inflate === 'function' ? o.inflate(p.y, p.x, p.z) : o.inflate;
    outPos.push(p.x + n.x * infl, p.y + n.y * infl, p.z + n.z * infl);
    outNor.push(n.x, n.y, n.z);
    outUv.push(uv.getX(i), uv.getY(i));
    outSi.push(si.getX(i), si.getY(i), si.getZ(i), si.getW(i));
    outSw.push(sw.getX(i), sw.getY(i), sw.getZ(i), sw.getW(i));
    const id = outPos.length / 3 - 1;
    remap[i] = id;
    return id;
  };

  for (let t = 0; t < index.count; t += 3) {
    const a = index.getX(t), b = index.getX(t + 1), c = index.getX(t + 2);
    if (!ok[a] || !ok[b] || !ok[c]) continue;
    outIdx.push(take(a), take(b), take(c));
  }
  if (outIdx.length === 0) return null;

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(outPos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(outNor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(outUv, 2));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(outSi, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(outSw, 4));
  geo.setIndex(outIdx);
  geo.computeVertexNormals();
  return geo;
}

export type OutfitPiece = {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  /** Skinned pieces share the body skeleton; rigid ones attach to a bone. */
  skinned: boolean;
  bone?: string;
  offset?: THREE.Vector3;
  name: string;
  castShadow?: boolean;
};

const c = (hex: number): [number, number, number] => {
  const col = new THREE.Color(hex);
  return [col.r, col.g, col.b];
};

/** Build the garment set for an outfit spec. */
export function buildOutfit(
  body: THREE.BufferGeometry,
  d: Dim,
  spec: OutfitSpec,
): { pieces: OutfitPiece[]; ledSlots: THREE.Vector3[] } {
  const pieces: OutfitPiece[] = [];
  const ledSlots: THREE.Vector3[] = [];
  const H = d.H;
  const primary = spec.primary ?? 0x1d2229;
  const secondary = spec.secondary ?? 0x0e1216;
  const accent = spec.accent ?? 0x2b6fa8;

  const addShell = (name: string, opts: ShellOpts, material: THREE.Material) => {
    const g = extractShell(body, opts);
    if (g) pieces.push({ geometry: g, material, skinned: true, name, castShadow: true });
  };

  const torsoRegions = [REGION.TORSO];
  const armRegions = [REGION.ARM_L, REGION.ARM_R];
  const legRegions = [REGION.LEG_L, REGION.LEG_R, REGION.HIPS];

  const trouserMat = clothMaterial(c(secondary), { rough: 0.9, weave: 190, repeat: 4 });
  const shirtMat = clothMaterial(c(spec.kind === 'detective' ? 0xb9c3cc : 0xd8dee4), { rough: 0.78, weave: 240, repeat: 5, sheen: 0.7 });

  switch (spec.kind) {
    case 'androidSuit': {
      // Fitted grey uniform: high collar, panelled jacket, lit armband.
      addShell('jacket', {
        regions: [...torsoRegions, ...armRegions],
        inflate: (y) => lerp(0.011, 0.018, smoothstep(d.hipY, d.chestY, y)) * (H / 1.8),
        yMin: d.hipY - 0.06 * H,
      }, clothMaterial(c(primary), { rough: 0.62, weave: 260, repeat: 6, sheen: 0.85 }));
      addShell('trousers', { regions: legRegions, inflate: 0.012 * (H / 1.8), yMax: d.hipY + 0.06 * H }, trouserMat);
      pieces.push(collar(d, primary, 1.06));
      pieces.push(...panelStripes(d, accent));
      if (spec.armband !== false) {
        const band = armband(d, accent);
        pieces.push(band.piece);
        ledSlots.push(band.pos);
      }
      break;
    }
    case 'detective': {
      addShell('shirt', {
        regions: [...torsoRegions, ...armRegions],
        inflate: 0.01 * (H / 1.8),
        yMin: d.hipY - 0.04 * H,
      }, shirtMat);
      addShell('blazer', {
        regions: [...torsoRegions, ...armRegions],
        inflate: (y) => lerp(0.016, 0.03, smoothstep(d.hipY, d.chestY + 0.05 * H, y)) * (H / 1.8),
        yMin: d.hipY - 0.09 * H,
        keep: (p) => !(p.z > 0.02 * H && p.y > d.chestY - 0.02 * H && Math.abs(p.x) < 0.055 * H),
      }, clothMaterial(c(primary), { rough: 0.82, weave: 150, repeat: 4 }));
      addShell('trousers', { regions: legRegions, inflate: 0.014 * (H / 1.8), yMax: d.hipY + 0.06 * H }, trouserMat);
      pieces.push(...lapels(d, primary));
      if (spec.tie !== undefined) pieces.push(tie(d, spec.tie));
      pieces.push(belt(d, 0x14161a));
      break;
    }
    case 'trenchcoat': {
      addShell('coat', {
        regions: [...torsoRegions, ...armRegions],
        inflate: (y) => lerp(0.022, 0.034, smoothstep(d.hipY, d.chestY, y)) * (H / 1.8),
        yMin: d.hipY - 0.02 * H,
      }, clothMaterial(c(primary), { rough: 0.74, weave: 120, repeat: 3 }));
      pieces.push(coatSkirt(d, primary));
      pieces.push(collar(d, primary, 1.18, true));
      addShell('trousers', { regions: legRegions, inflate: 0.013 * (H / 1.8), yMax: d.hipY + 0.02 * H }, trouserMat);
      pieces.push(belt(d, 0x1a1c20));
      break;
    }
    case 'hoodie': {
      addShell('hoodie', {
        regions: [...torsoRegions, ...armRegions],
        inflate: (y) => lerp(0.02, 0.028, smoothstep(d.hipY, d.chestY, y)) * (H / 1.8),
        yMin: d.hipY - 0.08 * H,
      }, clothMaterial(c(primary), { rough: 0.94, weave: 90, repeat: 3 }));
      pieces.push(hood(d, primary));
      addShell('jeans', { regions: legRegions, inflate: 0.016 * (H / 1.8), yMax: d.hipY + 0.06 * H }, clothMaterial(c(secondary), { rough: 0.92, weave: 130, repeat: 4 }));
      break;
    }
    case 'maidUniform': {
      addShell('dress', {
        regions: [...torsoRegions, ...armRegions],
        inflate: 0.012 * (H / 1.8),
        yMin: d.hipY - 0.05 * H,
      }, clothMaterial(c(primary), { rough: 0.7, weave: 220, repeat: 5, sheen: 0.9 }));
      pieces.push(apron(d, 0xe8ecef));
      pieces.push(skirt(d, primary, 0.34, 0.2));
      pieces.push(collar(d, 0xe8ecef, 1.02));
      if (spec.armband !== false) {
        const band = armband(d, accent);
        pieces.push(band.piece);
        ledSlots.push(band.pos);
      }
      break;
    }
    case 'uniform': {
      addShell('shirt', { regions: [...torsoRegions, ...armRegions], inflate: 0.012 * (H / 1.8), yMin: d.hipY - 0.05 * H }, clothMaterial(c(primary), { rough: 0.8, weave: 200, repeat: 5 }));
      addShell('trousers', { regions: legRegions, inflate: 0.014 * (H / 1.8), yMax: d.hipY + 0.06 * H }, trouserMat);
      pieces.push(belt(d, 0x101216));
      pieces.push(vest(d, 0x1b1f24));
      break;
    }
    case 'labcoat': {
      addShell('shirt', { regions: [...torsoRegions, ...armRegions], inflate: 0.011 * (H / 1.8), yMin: d.hipY - 0.04 * H }, shirtMat);
      addShell('coat', {
        regions: [...torsoRegions, ...armRegions],
        inflate: 0.024 * (H / 1.8),
        yMin: d.hipY - 0.02 * H,
      }, clothMaterial(c(0xe6ebee), { rough: 0.72, weave: 160, repeat: 4 }));
      pieces.push(coatSkirt(d, 0xe6ebee, 0.26));
      addShell('trousers', { regions: legRegions, inflate: 0.013 * (H / 1.8), yMax: d.hipY + 0.02 * H }, trouserMat);
      break;
    }
    case 'winterCoat': {
      addShell('coat', {
        regions: [...torsoRegions, ...armRegions],
        inflate: (y) => lerp(0.03, 0.042, smoothstep(d.hipY, d.chestY, y)) * (H / 1.8),
        yMin: d.hipY - 0.1 * H,
      }, clothMaterial(c(primary), { rough: 0.88, weave: 70, repeat: 2.5 }));
      pieces.push(collar(d, primary, 1.3, true));
      addShell('trousers', { regions: legRegions, inflate: 0.016 * (H / 1.8), yMax: d.hipY + 0.06 * H }, trouserMat);
      break;
    }
    case 'dress': {
      addShell('bodice', { regions: torsoRegions, inflate: 0.009 * (H / 1.8), yMin: d.hipY - 0.04 * H, yMax: d.chestY + 0.08 * H }, clothMaterial(c(primary), { rough: 0.6, weave: 300, repeat: 6, sheen: 1 }));
      pieces.push(skirt(d, primary, 0.42, 0.26));
      break;
    }
    case 'tshirt':
    default: {
      addShell('tshirt', {
        regions: [...torsoRegions, ...armRegions],
        inflate: 0.011 * (H / 1.8),
        yMin: d.hipY - 0.04 * H,
        keep: (p) => p.y < d.shoulderY - 0.02 * H || Math.abs(p.x) < d.shoulderX + 0.03 * H,
      }, clothMaterial(c(primary), { rough: 0.9, weave: 200, repeat: 5 }));
      addShell('jeans', { regions: legRegions, inflate: 0.015 * (H / 1.8), yMax: d.hipY + 0.06 * H }, clothMaterial(c(secondary), { rough: 0.92, weave: 130, repeat: 4 }));
      break;
    }
  }

  if (spec.armband && !ledSlots.length) {
    const band = armband(d, accent);
    pieces.push(band.piece);
    ledSlots.push(band.pos);
  }

  return { pieces, ledSlots };
}

/* ------------------------------------------------------------- sub-pieces */

function collar(d: Dim, color: number, scale = 1.05, tall = false): OutfitPiece {
  const H = d.H;
  const r = d.neckR * 1.5 * scale;
  const h = (tall ? 0.055 : 0.032) * H;
  const geo = new THREE.CylinderGeometry(r * 1.02, r * 1.16, h, 20, 1, true, -Math.PI * 0.86, Math.PI * 1.72);
  return {
    geometry: geo,
    material: clothMaterial(c(color), { rough: 0.7, weave: 200, repeat: 3 }),
    skinned: false,
    bone: 'neck',
    offset: new THREE.Vector3(0, h * 0.28, -0.004 * H),
    name: 'collar',
    castShadow: true,
  };
}

function lapels(d: Dim, color: number): OutfitPiece[] {
  const H = d.H;
  const out: OutfitPiece[] = [];
  for (const side of [-1, 1]) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(side * 0.062 * H, -0.03 * H);
    shape.lineTo(side * 0.045 * H, -0.16 * H);
    shape.lineTo(0, -0.14 * H);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.006 * H, bevelEnabled: false });
    geo.rotateY(side * -0.22);
    out.push({
      geometry: geo,
      material: clothMaterial(c(color), { rough: 0.72, weave: 150, repeat: 3 }),
      skinned: false,
      bone: 'chest',
      offset: new THREE.Vector3(0, 0.052 * H, 0.062 * H),
      name: `lapel${side < 0 ? 'L' : 'R'}`,
      castShadow: true,
    });
  }
  return out;
}

function tie(d: Dim, color: number): OutfitPiece {
  const H = d.H;
  const shape = new THREE.Shape();
  shape.moveTo(-0.016 * H, 0);
  shape.lineTo(0.016 * H, 0);
  shape.lineTo(0.021 * H, -0.15 * H);
  shape.lineTo(0, -0.19 * H);
  shape.lineTo(-0.021 * H, -0.15 * H);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.005 * H, bevelEnabled: false });
  return {
    geometry: geo,
    material: clothMaterial(c(color), { rough: 0.55, weave: 320, repeat: 4, sheen: 1 }),
    skinned: false,
    bone: 'chest',
    offset: new THREE.Vector3(0, 0.055 * H, 0.064 * H),
    name: 'tie',
    castShadow: true,
  };
}

function belt(d: Dim, color: number): OutfitPiece {
  const H = d.H;
  const geo = new THREE.CylinderGeometry(0.096 * H * d.w, 0.098 * H * d.w, 0.022 * H, 24, 1, true);
  const buckle = new THREE.BoxGeometry(0.03 * H, 0.022 * H, 0.008 * H);
  buckle.translate(0, 0, 0.062 * H * d.w);
  const merged = mergeGeos([geo, buckle]);
  return {
    geometry: merged,
    material: leatherMaterial(color),
    skinned: false,
    bone: 'hips',
    offset: new THREE.Vector3(0, 0.028 * H, 0),
    name: 'belt',
    castShadow: true,
  };
}

function vest(d: Dim, color: number): OutfitPiece {
  const H = d.H;
  const geo = new THREE.CylinderGeometry(0.108 * H * d.w, 0.1 * H * d.w, 0.24 * H, 20, 1, true);
  return {
    geometry: geo,
    material: paintedMetal(color, 0.55),
    skinned: false,
    bone: 'chest',
    offset: new THREE.Vector3(0, -0.02 * H, 0),
    name: 'vest',
    castShadow: true,
  };
}

function skirt(d: Dim, color: number, len = 0.34, flare = 0.2): OutfitPiece {
  const H = d.H;
  const top = 0.1 * H * d.w;
  const bot = top * (1 + flare * 2.2);
  const geo = new THREE.CylinderGeometry(top, bot, len * H, 26, 3, true);
  return {
    geometry: geo,
    material: clothMaterial(c(color), { rough: 0.8, weave: 180, repeat: 4 }),
    skinned: false,
    bone: 'hips',
    offset: new THREE.Vector3(0, -len * H * 0.42, 0),
    name: 'skirt',
    castShadow: true,
  };
}

function coatSkirt(d: Dim, color: number, len = 0.34): OutfitPiece {
  const H = d.H;
  const top = 0.105 * H * d.w;
  const geo = new THREE.CylinderGeometry(top, top * 1.24, len * H, 24, 3, true, -Math.PI * 0.92, Math.PI * 1.84);
  return {
    geometry: geo,
    material: clothMaterial(c(color), { rough: 0.76, weave: 130, repeat: 3 }),
    skinned: false,
    bone: 'hips',
    offset: new THREE.Vector3(0, -len * H * 0.4, 0),
    name: 'coat-skirt',
    castShadow: true,
  };
}

function hood(d: Dim, color: number): OutfitPiece {
  const H = d.H;
  const geo = new THREE.SphereGeometry(0.088 * H, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.62);
  geo.scale(1, 1.1, 1.25);
  geo.translate(0, -0.01 * H, -0.045 * H);
  return {
    geometry: geo,
    material: clothMaterial(c(color), { rough: 0.94, weave: 90, repeat: 2 }),
    skinned: false,
    bone: 'neck',
    offset: new THREE.Vector3(0, 0.02 * H, -0.02 * H),
    name: 'hood',
    castShadow: true,
  };
}

function apron(d: Dim, color: number): OutfitPiece {
  const H = d.H;
  const geo = new THREE.PlaneGeometry(0.15 * H, 0.3 * H, 4, 6);
  const pos = geo.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    pos.setZ(i, 0.03 * H * (1 - Math.pow(x / (0.075 * H), 2)) - Math.abs(y) * 0.02);
  }
  geo.computeVertexNormals();
  return {
    geometry: geo,
    material: clothMaterial(c(color), { rough: 0.86, weave: 240, repeat: 4 }),
    skinned: false,
    bone: 'spine',
    offset: new THREE.Vector3(0, -0.02 * H, 0.07 * H),
    name: 'apron',
    castShadow: true,
  };
}

function panelStripes(d: Dim, accent: number): OutfitPiece[] {
  const H = d.H;
  const out: OutfitPiece[] = [];
  for (const side of [-1, 1]) {
    const geo = new THREE.BoxGeometry(0.006 * H, 0.2 * H, 0.004 * H);
    out.push({
      geometry: geo,
      material: emissiveMaterial(accent, 0.5),
      skinned: false,
      bone: 'chest',
      offset: new THREE.Vector3(side * 0.055 * H, -0.02 * H, 0.058 * H),
      name: `stripe${side < 0 ? 'L' : 'R'}`,
    });
  }
  return out;
}

function armband(d: Dim, accent: number): { piece: OutfitPiece; pos: THREE.Vector3 } {
  const H = d.H;
  const r = d.armR * 1.35;
  const band = new THREE.CylinderGeometry(r, r, 0.03 * H, 16, 1, true);
  band.rotateZ(Math.PI / 2);
  const tri = new THREE.CylinderGeometry(0, r * 0.55, 0.004 * H, 3);
  tri.rotateX(Math.PI / 2);
  tri.rotateZ(Math.PI);
  tri.translate(0, 0, -r * 1.02);
  const geo = mergeGeos([band, tri]);
  return {
    piece: {
      geometry: geo,
      material: emissiveMaterial(accent, 0.9),
      skinned: false,
      bone: 'armL',
      offset: new THREE.Vector3(0, -0.07 * H, 0),
      name: 'armband',
    },
    pos: new THREE.Vector3(0, -0.07 * H, 0),
  };
}

/** Concatenate simple non-indexed-safe geometries. */
export function mergeGeos(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const out = new THREE.BufferGeometry();
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  let base = 0;
  for (const g of list) {
    const gp = g.getAttribute('position');
    const gn = g.getAttribute('normal');
    const gu = g.getAttribute('uv');
    for (let i = 0; i < gp.count; i++) {
      pos.push(gp.getX(i), gp.getY(i), gp.getZ(i));
      if (gn) nor.push(gn.getX(i), gn.getY(i), gn.getZ(i));
      if (gu) uv.push(gu.getX(i), gu.getY(i));
      else uv.push(0, 0);
    }
    const gi = g.getIndex();
    if (gi) for (let i = 0; i < gi.count; i++) idx.push(base + gi.getX(i));
    else for (let i = 0; i < gp.count; i++) idx.push(base + i);
    base += gp.count;
    g.dispose();
  }
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (nor.length === pos.length) out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  out.setIndex(idx);
  if (nor.length !== pos.length) out.computeVertexNormals();
  return out;
}

/** The android temple LED — the single most recognisable prop in the genre. */
export function templeLed(d: Dim, color: number): { mesh: THREE.Mesh; material: THREE.MeshStandardMaterial } {
  const H = d.H;
  const ringGeo = new THREE.TorusGeometry(0.0058 * H, 0.0016 * H, 8, 26);
  const inner = new THREE.CircleGeometry(0.005 * H, 20);
  const mat = emissiveMaterial(color, 2.2);
  const geo = mergeGeos([ringGeo, inner]);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'temple-led';
  return { mesh, material: mat };
}

/** Glowing "model / serial" plate for android chests. */
export function idPlate(d: Dim, tex: THREE.Texture): THREE.Mesh {
  const H = d.H;
  const geo = new THREE.PlaneGeometry(0.075 * H, 0.019 * H);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x05080b,
    emissive: 0xffffff,
    emissiveMap: tex,
    emissiveIntensity: 1.6,
    roughness: 0.3,
    metalness: 0.1,
  });
  const m = new THREE.Mesh(geo, mat);
  m.name = 'id-plate';
  return m;
}

export function chassisPanel(d: Dim, color = 0xeef3f6): THREE.Mesh {
  const geo = new THREE.SphereGeometry(0.05 * d.H, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const m = new THREE.Mesh(geo, chassisMaterial(color));
  return m;
}

export function clampUnit(v: number): number {
  return clamp(v);
}
