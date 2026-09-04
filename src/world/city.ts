import * as THREE from 'three';
import { Rng } from '../core/seed';
import { clamp, lerp, smoothstep } from '../core/noise';
import { Zone, type District, type WorldMap } from './map';
import type { Block } from './roads';
import { createFacadeMaterial } from './facade';

/** Unit geometries. All are 1 m wide/deep centred on x/z and span y in [0,1]. */
function unitBox(): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(1, 1, 1);
  g.translate(0, 0.5, 0);
  return g;
}
function unitCylinder(segments = 20): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(0.5, 0.5, 1, segments);
  g.translate(0, 0.5, 0);
  return g;
}
function unitFrustum(topScale = 0.6): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(1, 1, 1);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y > 0) { p.setX(i, p.getX(i) * topScale); p.setZ(i, p.getZ(i) * topScale); }
  }
  g.translate(0, 0.5, 0);
  g.computeVertexNormals();
  return g;
}
function unitShear(): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(1, 1, 1);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y > 0) { p.setX(i, p.getX(i) * 0.55 + 0.22); p.setZ(i, p.getZ(i) * 0.8); }
  }
  g.translate(0, 0.5, 0);
  g.computeVertexNormals();
  return g;
}
/** House with a gable roof: walls up to 0.68, ridge at 1.0. */
function houseGable(): THREE.BufferGeometry {
  const body = new THREE.BoxGeometry(1, 0.68, 1);
  body.translate(0, 0.34, 0);
  const roof = new THREE.BufferGeometry();
  const o = 0.08; // overhang
  const verts = new Float32Array([
    // left slope
    -0.5 - o, 0.66, -0.5 - o, 0, 1.0, -0.5 - o, 0, 1.0, 0.5 + o,
    -0.5 - o, 0.66, -0.5 - o, 0, 1.0, 0.5 + o, -0.5 - o, 0.66, 0.5 + o,
    // right slope
    0.5 + o, 0.66, -0.5 - o, 0, 1.0, 0.5 + o, 0, 1.0, -0.5 - o,
    0.5 + o, 0.66, -0.5 - o, 0.5 + o, 0.66, 0.5 + o, 0, 1.0, 0.5 + o,
    // gable ends
    -0.5, 0.68, -0.5, 0.5, 0.68, -0.5, 0, 1.0, -0.5,
    -0.5, 0.68, 0.5, 0, 1.0, 0.5, 0.5, 0.68, 0.5,
  ]);
  roof.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  roof.computeVertexNormals();
  return mergeSimple([body, roof]);
}
function houseHip(): THREE.BufferGeometry {
  const body = new THREE.BoxGeometry(1, 0.68, 1);
  body.translate(0, 0.34, 0);
  const o = 0.08;
  const a = [-0.5 - o, 0.66, -0.5 - o], b = [0.5 + o, 0.66, -0.5 - o], c = [0.5 + o, 0.66, 0.5 + o], d = [-0.5 - o, 0.66, 0.5 + o];
  const r1 = [-0.2, 1.0, 0], r2 = [0.2, 1.0, 0];
  const tri = (p: number[], q: number[], r: number[]) => [...p, ...q, ...r];
  const verts = new Float32Array([
    ...tri(a, r1, b), ...tri(b, r1, r2), // hmm front slope split
    ...tri(b, r2, c),
    ...tri(c, r2, d), ...tri(d, r2, r1),
    ...tri(d, r1, a),
  ]);
  const roof = new THREE.BufferGeometry();
  roof.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  roof.computeVertexNormals();
  return mergeSimple([body, roof]);
}
function houseFlat(): THREE.BufferGeometry {
  const body = new THREE.BoxGeometry(1, 1, 1);
  body.translate(0, 0.5, 0);
  const wing = new THREE.BoxGeometry(0.5, 0.65, 0.6);
  wing.translate(0.55, 0.325, 0.25);
  return mergeSimple([body, wing]);
}
function warehouse(): THREE.BufferGeometry {
  const body = new THREE.BoxGeometry(1, 0.9, 1);
  body.translate(0, 0.45, 0);
  // low pitched roof cap
  const cap = new THREE.BoxGeometry(1.02, 0.1, 1.02);
  cap.translate(0, 0.95, 0);
  return mergeSimple([body, cap]);
}

function mergeSimple(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const out: number[] = [], nrm: number[] = [];
  for (const g of geos) {
    const ng = g.index ? g.toNonIndexed() : g;
    const p = ng.getAttribute('position'), n = ng.getAttribute('normal');
    for (let i = 0; i < p.count; i++) { out.push(p.getX(i), p.getY(i), p.getZ(i)); nrm.push(n.getX(i), n.getY(i), n.getZ(i)); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((out.length / 3) * 2), 2));
  return g;
}

export type Kind = 'box' | 'cyl' | 'frustum' | 'shear' | 'gable' | 'hip' | 'flat' | 'warehouse' | 'spire';

interface Instance { x: number; y: number; z: number; w: number; h: number; d: number; rot: number; color: THREE.Color; style: number; floorH: number; seed: number; roof: number; }

/** Spatially tiled instance batches so far tiles can be frustum-culled. */
export class BuildingBatches {
  readonly group = new THREE.Group();
  private readonly lists = new Map<string, Instance[]>();
  private readonly geos: Record<Kind, THREE.BufferGeometry>;
  readonly material: THREE.MeshStandardMaterial;
  count = 0;
  readonly tileSize = 1500;
  private readonly tiles: { mesh: THREE.InstancedMesh; cx: number; cz: number; r: number }[] = [];
  shadowDistance = 2600;

  constructor(nightUniform: THREE.IUniform<number>) {
    this.material = createFacadeMaterial(nightUniform);
    this.geos = {
      box: unitBox(), cyl: unitCylinder(), frustum: unitFrustum(), shear: unitShear(), gable: houseGable(), hip: houseHip(), flat: houseFlat(), warehouse: warehouse(),
      spire: (() => { const g = new THREE.CylinderGeometry(0.1, 0.5, 1, 6); g.translate(0, 0.5, 0); return g; })(),
    };
  }

  add(kind: Kind, inst: Instance): void {
    const tx = Math.floor(inst.x / this.tileSize), tz = Math.floor(inst.z / this.tileSize);
    const key = `${kind}|${tx}|${tz}`;
    let list = this.lists.get(key);
    if (!list) { list = []; this.lists.set(key, list); }
    list.push(inst);
    this.count++;
  }

  build(): void {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    for (const [key, list] of this.lists) {
      const kind = key.split('|')[0] as Kind;
      const geo = this.geos[kind];
      const mesh = new THREE.InstancedMesh(geo, this.material, list.length);
      const dims = new Float32Array(list.length * 3);
      const style = new Float32Array(list.length * 4);
      const box = new THREE.Box3();
      list.forEach((inst, i) => {
        p.set(inst.x, inst.y, inst.z);
        q.setFromEuler(new THREE.Euler(0, inst.rot, 0));
        s.set(inst.w, inst.h, inst.d);
        mesh.setMatrixAt(i, m.compose(p, q, s));
        mesh.setColorAt(i, inst.color);
        dims[i * 3] = inst.w; dims[i * 3 + 1] = inst.h; dims[i * 3 + 2] = inst.d;
        style[i * 4] = inst.style; style[i * 4 + 1] = inst.floorH; style[i * 4 + 2] = inst.seed; style[i * 4 + 3] = inst.roof;
        const r = Math.hypot(inst.w, inst.d) * 0.6;
        box.expandByPoint(new THREE.Vector3(inst.x - r, inst.y, inst.z - r));
        box.expandByPoint(new THREE.Vector3(inst.x + r, inst.y + inst.h, inst.z + r));
      });
      geo.setAttribute('aDims', new THREE.InstancedBufferAttribute(dims, 3));
      geo.setAttribute('aStyle', new THREE.InstancedBufferAttribute(style, 4));
      // per-mesh geometry copy so the instanced attributes are unique per tile
      const g2 = geo.clone();
      g2.setAttribute('aDims', new THREE.InstancedBufferAttribute(dims, 3));
      g2.setAttribute('aStyle', new THREE.InstancedBufferAttribute(style, 4));
      mesh.geometry = g2;
      g2.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
      g2.boundingBox = box;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      this.group.add(mesh);
      const c = box.getCenter(new THREE.Vector3());
      this.tiles.push({ mesh, cx: c.x, cz: c.z, r: Math.hypot(box.max.x - box.min.x, box.max.z - box.min.z) / 2 });
    }
  }

  updateLod(camX: number, camZ: number): void {
    for (const t of this.tiles) {
      const d = Math.max(0, Math.hypot(t.cx - camX, t.cz - camZ) - t.r);
      t.mesh.castShadow = d < this.shadowDistance;
    }
  }
}

const PASTELS = ['#f4efe6', '#f7f3ea', '#efe4d2', '#f2d4c2', '#f5c9b0', '#cfe6e2', '#bfe3ec', '#f7e2a8', '#e9d5f0', '#f1b8c4', '#d9ead3', '#ffffff', '#e8e8e4', '#d6d3cc'];
const TOWER_TINTS = ['#dfe6ea', '#cfd8dc', '#e8e0d4', '#f2f2f0', '#b9c6cf', '#d8cfc2', '#c9d6d9', '#efe9df'];

export interface CityBuild {
  batches: BuildingBatches;
  landmarkPositions: { x: number; z: number; h: number; name: string }[];
  /** occupancy grid (10 m cells) marking footprints so vegetation avoids buildings */
  occupied: (x: number, z: number) => boolean;
  markOccupied: (x: number, z: number, r: number) => void;
}

export function buildCity(map: WorldMap, blocksByDistrict: Map<string, Block[]>, nightUniform: THREE.IUniform<number>): CityBuild {
  const batches = new BuildingBatches(nightUniform);
  const rng = new Rng('city');
  const occ = new Uint8Array(2000 * 2000); // 10 m cells over 20 km
  const occIndex = (x: number, z: number) => {
    const ix = Math.floor((x + 10000) / 10), iz = Math.floor((z + 10000) / 10);
    if (ix < 0 || iz < 0 || ix >= 2000 || iz >= 2000) return -1;
    return iz * 2000 + ix;
  };
  const markOccupied = (x: number, z: number, r: number) => {
    const n = Math.ceil(r / 10);
    for (let dz = -n; dz <= n; dz++) for (let dx = -n; dx <= n; dx++) {
      const i = occIndex(x + dx * 10, z + dz * 10);
      if (i >= 0) occ[i] = 1;
    }
  };
  const occupied = (x: number, z: number) => { const i = occIndex(x, z); return i >= 0 && occ[i] === 1; };
  const landmarkPositions: { x: number; z: number; h: number; name: string }[] = [];

  const place = (kind: Kind, x: number, z: number, w: number, h: number, d: number, rot: number, color: string | THREE.Color, style: number, floorH: number, roof = 5, yBase?: number) => {
    // ground height at the four corners; sit the building on the highest so nothing floats
    const c = Math.cos(rot), s = Math.sin(rot);
    let y = -Infinity;
    for (const [lx, lz] of [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2], [0, 0]]) {
      const px = x + lx * c - lz * s, pz = z + lx * s + lz * c;
      y = Math.max(y, map.heightAt(px, pz));
    }
    if (yBase !== undefined) y = yBase;
    if (y < 0.9) return false;
    const col = color instanceof THREE.Color ? color : new THREE.Color(color);
    batches.add(kind, { x, y: y - 0.4, z, w, h: h + 0.4, d, rot, color: col, style, floorH, seed: rng.range(0, 1000), roof });
    markOccupied(x, z, Math.max(w, d) * 0.5 + 4);
    return true;
  };

  const landOK = (x: number, z: number, w: number, d: number, rot: number) => {
    const c = Math.cos(rot), s = Math.sin(rot);
    for (const [lx, lz] of [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2], [0, 0]]) {
      const px = x + lx * c - lz * s, pz = z + lx * s + lz * c;
      if (map.heightAt(px, pz) < 1.2) return false;
    }
    return true;
  };

  // ------------------------------------------------------------- district fills
  for (const d of map.districts) {
    const blocks = blocksByDistrict.get(d.id);
    const c = Math.cos(d.rot), s = Math.sin(d.rot);
    const toWorld = (lx: number, lz: number): [number, number] => [d.cx + lx * c - lz * s, d.cz + lx * s + lz * c];
    if (!blocks) continue;
    const drng = rng.fork(d.id);
    for (const b of blocks) {
      const inset = b.streetWidth * 0.5 + 3;
      const bx0 = b.x0 + inset, bx1 = b.x1 - inset, bz0 = b.z0 + inset, bz1 = b.z1 - inset;
      const bw = bx1 - bx0, bd = bz1 - bz0;
      if (bw < 12 || bd < 12) continue;
      if (drng.next() > d.density) continue; // empty lot / park block
      const [cxw, czw] = toWorld((bx0 + bx1) / 2, (bz0 + bz1) / 2);
      const distToCentre = Math.hypot(cxw - d.cx, czw - d.cz) / Math.max(d.hw, d.hh);
      switch (d.zone) {
        case Zone.DOWNTOWN: fillDowntown(); break;
        case Zone.RES_MID: fillMidrise(); break;
        case Zone.HOTEL: fillHotel(); break;
        case Zone.RES_LOW: fillHouses(); break;
        case Zone.INDUSTRIAL: fillIndustrial(); break;
        default: break;
      }

      function fillDowntown(): void {
        // tall core, lower toward the edge; 1-2 towers on podiums, low buildings in the leftover
        const core = 1 - smoothstep(0.25, 1.0, distToCentre);
        const nTowers = bw > 70 && bd > 70 ? 2 : 1;
        for (let t = 0; t < nTowers; t++) {
          const fw = drng.range(24, Math.min(46, bw * 0.6)), fd = drng.range(24, Math.min(46, bd * 0.6));
          const lx = nTowers === 1 ? (bx0 + bx1) / 2 : lerp(bx0 + fw / 2, bx1 - fw / 2, t);
          const lz = (bz0 + bz1) / 2 + drng.range(-bd * 0.2, bd * 0.2);
          const [x, z] = toWorld(lx, lz);
          const h = lerp(d.hMin, d.hMax, Math.pow(drng.next(), 1.6) * (0.35 + 0.65 * core)) * (0.6 + 0.6 * core);
          if (!landOK(x, z, fw, fd, d.rot)) continue;
          const styleRoll = drng.next();
          const style = styleRoll < 0.5 ? 0 : styleRoll < 0.8 ? 1 : 3;
          const tint = style === 0 ? drng.pick(TOWER_TINTS) : drng.pick(PASTELS);
          const floorH = style === 0 ? 3.9 : 3.4;
          // podium
          if (h > 60 && drng.chance(0.7)) {
            const pw = Math.min(bw * 0.9, fw + drng.range(10, 30)), pd = Math.min(bd * 0.9, fd + drng.range(10, 30));
            place('box', x, z, pw, drng.range(9, 18), pd, d.rot, drng.pick(TOWER_TINTS), 1, 3.6);
          }
          const crown = drng.next();
          if (crown < 0.3 && h > 100) {
            // setbacks
            place('box', x, z, fw, h * 0.6, fd, d.rot, tint, style, floorH);
            place('box', x, z, fw * 0.8, h * 0.85, fd * 0.8, d.rot, tint, style, floorH);
            place('box', x, z, fw * 0.6, h, fd * 0.6, d.rot, tint, style, floorH);
          } else if (crown < 0.5 && h > 90) {
            place('box', x, z, fw, h, fd, d.rot, tint, style, floorH);
            place('frustum', x, z, fw * 1.02, h + drng.range(10, 25), fd * 1.02, d.rot, tint, 6, floorH);
          } else if (crown < 0.62 && h > 80) {
            place('cyl', x, z, Math.min(fw, fd), h, Math.min(fw, fd), d.rot, tint, style, floorH);
          } else {
            place('box', x, z, fw, h, fd, d.rot, tint, style, floorH);
          }
          if (h > 120 && drng.chance(0.5)) place('spire', x, z, 3, drng.range(15, 40), 3, d.rot, '#cfd8dc', 6, 3, 5, map.heightAt(x, z) + h);
          addRoofClutter(x, z, fw, fd, h, d.rot);
        }
        // leftover low-rise along the block edge
        if (bw > 50) {
          const lw = drng.range(14, 24), ld = drng.range(14, 24);
          const [x, z] = toWorld(bx0 + lw / 2, bz1 - ld / 2);
          if (landOK(x, z, lw, ld, d.rot) && !occupied(x, z)) place('box', x, z, lw, drng.range(8, 20), ld, d.rot, drng.pick(PASTELS), 1, 3.3);
        }
      }

      function fillMidrise(): void {
        const n = Math.max(1, Math.round((bw * bd) / 1600));
        for (let i = 0; i < n; i++) {
          const fw = drng.range(18, Math.min(42, bw * 0.8)), fd = drng.range(18, Math.min(42, bd * 0.8));
          const lx = drng.range(bx0 + fw / 2, bx1 - fw / 2), lz = drng.range(bz0 + fd / 2, bz1 - fd / 2);
          const [x, z] = toWorld(lx, lz);
          if (!landOK(x, z, fw, fd, d.rot) || occupied(x, z)) continue;
          const h = lerp(d.hMin, d.hMax, Math.pow(drng.next(), 2.2));
          const roll = drng.next();
          const style = roll < 0.35 ? 2 : roll < 0.7 ? 1 : roll < 0.85 ? 3 : 0;
          place('box', x, z, fw, h, fd, d.rot + drng.range(-0.02, 0.02), drng.pick(PASTELS), style, 3.3);
          if (h > 20) addRoofClutter(x, z, fw, fd, h, d.rot);
        }
      }

      function fillHotel(): void {
        // slabs parallel to the beach (district local x is across the island)
        const slab = drng.chance(0.7);
        const fw = slab ? drng.range(18, 30) : drng.range(24, 40);
        const fd = slab ? Math.min(bd * 0.85, drng.range(50, 95)) : drng.range(24, 40);
        const [x, z] = toWorld((bx0 + bx1) / 2 + drng.range(-6, 6), (bz0 + bz1) / 2);
        if (!landOK(x, z, fw, fd, d.rot)) return;
        const h = lerp(d.hMin, d.hMax, Math.pow(drng.next(), 1.5));
        const style = drng.chance(0.55) ? 7 : drng.chance(0.5) ? 2 : 0;
        const tint = style === 0 ? drng.pick(TOWER_TINTS) : drng.pick(PASTELS);
        place('box', x, z, fw, h, fd, d.rot, tint, style, 3.2);
        // pool deck / low wing toward the beach
        const [px, pz] = toWorld((bx0 + bx1) / 2 + fw * 0.5 + 12, (bz0 + bz1) / 2);
        if (landOK(px, pz, 18, fd * 0.7, d.rot)) place('box', px, pz, 18, drng.range(4, 9), fd * 0.7, d.rot, drng.pick(PASTELS), 1, 3.2);
        addRoofClutter(x, z, fw, fd, h, d.rot);
      }

      function fillHouses(): void {
        // lots around the block perimeter along the two long sides
        const frontage = drng.range(17, 24);
        const depth = Math.min(30, bd / 2 - 2);
        const sides: [number, number][] = [[bz0 + depth / 2, 0], [bz1 - depth / 2, Math.PI]];
        for (const [lz, face] of sides) {
          for (let lx = bx0 + frontage / 2; lx < bx1 - frontage / 2; lx += frontage * drng.range(0.95, 1.2)) {
            if (drng.next() > d.density + 0.15) continue;
            const hw = drng.range(9, 13), hd = drng.range(10, 16);
            const [x, z] = toWorld(lx, lz + (face === 0 ? -1 : 1) * drng.range(-3, 3));
            if (!landOK(x, z, hw, hd, d.rot)) continue;
            const floors = drng.chance(0.35) ? 2 : 1;
            const h = floors * 3.3 + 1.6;
            const roll = drng.next();
            const kind: Kind = roll < 0.45 ? 'gable' : roll < 0.8 ? 'hip' : 'flat';
            const roof = kind === 'flat' ? 2 : drng.pick([0, 0, 1, 3, 4, 1]);
            place(kind, x, z, hw, h, hd, d.rot + face + drng.range(-0.06, 0.06), drng.pick(PASTELS), 5, 3.0, roof);
            // pool in the yard
            if (drng.chance(0.3)) {
              const [px, pz] = toWorld(lx, lz + (face === 0 ? 1 : -1) * (hd / 2 + 6));
              if (landOK(px, pz, 6, 4, d.rot)) batches.add('box', { x: px, y: map.heightAt(px, pz) - 0.3, z: pz, w: drng.range(5, 9), h: 0.35, d: drng.range(3.5, 5), rot: d.rot, color: new THREE.Color('#33b9d6'), style: 6, floorH: 3, seed: drng.range(0, 100), roof: 5 });
            }
          }
        }
      }

      function fillIndustrial(): void {
        const n = Math.max(1, Math.round((bw * bd) / 3600));
        for (let i = 0; i < n; i++) {
          const fw = drng.range(28, Math.min(80, bw * 0.85)), fd = drng.range(22, Math.min(60, bd * 0.85));
          const lx = drng.range(bx0 + fw / 2, bx1 - fw / 2), lz = drng.range(bz0 + fd / 2, bz1 - fd / 2);
          const [x, z] = toWorld(lx, lz);
          if (!landOK(x, z, fw, fd, d.rot) || occupied(x, z)) continue;
          place('warehouse', x, z, fw, drng.range(8, 15), fd, d.rot, drng.pick(['#b8bcc0', '#9aa3a8', '#cfd3d6', '#8e9aa0', '#d8c9a8']), 4, 4.0);
        }
      }

      function addRoofClutter(x: number, z: number, fw: number, fd: number, h: number, rot: number): void {
        const top = map.heightAt(x, z) + h;
        const n = drng.int(1, 3);
        for (let i = 0; i < n; i++) {
          const ox = drng.range(-fw * 0.3, fw * 0.3), oz = drng.range(-fd * 0.3, fd * 0.3);
          const cr = Math.cos(rot), sr = Math.sin(rot);
          batches.add('box', { x: x + ox * cr - oz * sr, y: top - 0.2, z: z + ox * sr + oz * cr, w: drng.range(2.5, 5), h: drng.range(1.8, 3.2), d: drng.range(2.5, 4), rot, color: new THREE.Color('#9da3a6'), style: 6, floorH: 3, seed: drng.range(0, 100), roof: 5 });
        }
        if (h > 40 && drng.chance(0.4)) {
          batches.add('cyl', { x: x + fw * 0.25, y: top - 0.2, z: z - fd * 0.25, w: 3, h: 3.5, d: 3, rot, color: new THREE.Color('#c9c9c4'), style: 6, floorH: 3, seed: drng.range(0, 100), roof: 5 });
        }
      }
    }
  }

  // ------------------------------------------------------------- landmark towers (downtown skyline hierarchy)
  const dt = map.districts.find((x) => x.id === 'downtown')!;
  const landmark = (name: string, lx: number, lz: number, build: (x: number, z: number, g: number) => number) => {
    const c = Math.cos(dt.rot), s = Math.sin(dt.rot);
    const x = dt.cx + lx * c - lz * s, z = dt.cz + lx * s + lz * c;
    const g = map.heightAt(x, z);
    if (g < 1) return;
    const h = build(x, z, g);
    landmarkPositions.push({ x, z, h, name });
    markOccupied(x, z, 40);
  };
  const lm = rng.fork('landmarks');
  landmark('Meridian Tower', 120, -80, (x, z) => {
    place('box', x, z, 46, 150, 46, 0.1, '#d9e2e8', 0, 3.9);
    place('box', x, z, 38, 230, 38, 0.1, '#d9e2e8', 0, 3.9);
    place('box', x, z, 28, 285, 28, 0.1, '#e3eaee', 0, 3.9);
    place('spire', x, z, 4, 45, 4, 0.1, '#e8eef2', 6, 3, 5, map.heightAt(x, z) + 285);
    return 330;
  });
  landmark('Faro Bahía', -180, 40, (x, z) => {
    place('cyl', x, z, 40, 240, 40, 0, '#cfe0e6', 0, 3.8);
    place('cyl', x, z, 48, 12, 48, 0, '#e8eef2', 6, 3, 5, map.heightAt(x, z) + 232);
    return 244;
  });
  landmark('Twin Palms A', 40, 210, (x, z) => { place('box', x, z, 30, 182, 56, 0.05, '#e8e0d4', 2, 3.3); return 182; });
  landmark('Twin Palms B', 110, 210, (x, z) => {
    place('box', x, z, 30, 182, 56, 0.05, '#e8e0d4', 2, 3.3);
    place('box', x - 35, z, 44, 6, 12, 0.05, '#d9e2e8', 0, 3.3, 5, map.heightAt(x, z) + 118);
    return 182;
  });
  landmark('The Sail', -60, -250, (x, z) => { place('shear', x, z, 60, 205, 44, 0.9, '#bcd3dc', 0, 3.9); return 205; });
  landmark('Terraces', 260, 120, (x, z) => {
    for (let i = 0; i < 5; i++) place('box', x + i * 6, z - i * 4, 60 - i * 8, 45 + i * 28, 40, 0.0, '#f2ede4', 2, 3.3);
    return 160;
  });
  landmark('Crown Plaza', -300, -180, (x, z) => {
    place('box', x, z, 42, 200, 42, 0.2, '#c9d6d9', 0, 3.9);
    for (let i = 0; i < 4; i++) {
      const a = 0.2 + (i * Math.PI) / 2;
      place('box', x + Math.cos(a) * 14, z + Math.sin(a) * 14, 3, 30, 14, a, '#e8eef2', 6, 3, 5, map.heightAt(x, z) + 198);
    }
    return 230;
  });
  landmark('Helix', 330, -240, (x, z) => {
    for (let i = 0; i < 12; i++) place('box', x, z, 34, 16.5, 34, i * 0.1, '#dbe6ea', 0, 3.9, 5, map.heightAt(x, z) + i * 16);
    return 198;
  });
  landmark('Aquamarine', -380, 230, (x, z) => {
    place('box', x, z, 18, 228, 62, 0.0, '#b9d6d9', 0, 3.9);
    place('box', x, z, 62, 228, 18, 0.0, '#b9d6d9', 0, 3.9);
    place('frustum', x, z, 24, 250, 24, 0.0, '#d0e4e6', 6, 3.9);
    return 250;
  });
  void lm;

  batches.build();
  return { batches, landmarkPositions, occupied, markOccupied };
}

export function districtByZone(map: WorldMap, zone: Zone): District[] {
  return map.districts.filter((d) => d.zone === zone);
}

export { clamp };
