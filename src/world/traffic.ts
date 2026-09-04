import * as THREE from 'three';
import { Rng } from '../core/seed';
import { clamp, lerp } from '../core/noise';
import type { WorldMap, Vec2 } from './map';
import type { RoadSegment } from './roads';
import type { BridgeRoute } from './bridges';
import { CONTRAIL_MATERIAL, WakeTrail } from '../render/wakes';

// ------------------------------------------------------------------ boats

type HullKind = 'speed' | 'yacht' | 'sail' | 'console' | 'cargo' | 'ferry';

function hullGeometry(len: number, beam: number, height: number): THREE.BufferGeometry {
  // pointed bow, flat transom; simple 8-vertex hull with a deck
  const l = len / 2, b = beam / 2;
  const v = [
    // keel line
    [-l, -height * 0.55, 0], [l * 0.55, -height * 0.55, 0],
    // chine
    [-l, -height * 0.1, -b * 0.95], [-l, -height * 0.1, b * 0.95], [l * 0.35, -height * 0.15, -b], [l * 0.35, -height * 0.15, b], [l, 0.05, 0],
    // deck
    [-l, height * 0.45, -b], [-l, height * 0.45, b], [l * 0.4, height * 0.45, -b * 0.95], [l * 0.4, height * 0.45, b * 0.95], [l, height * 0.55, 0],
  ];
  const f = [
    // bottom
    [0, 2, 4], [0, 4, 1], [0, 1, 5], [0, 5, 3], [1, 4, 6], [1, 6, 5],
    // sides
    [2, 7, 9], [2, 9, 4], [4, 9, 11], [4, 11, 6], [3, 5, 10], [3, 10, 8], [5, 6, 11], [5, 11, 10],
    // transom
    [0, 3, 8], [0, 8, 7], [0, 7, 2],
    // deck
    [7, 8, 10], [7, 10, 9], [9, 10, 11],
  ];
  const pos: number[] = [];
  for (const tri of f) for (const i of tri) pos.push(v[i][0], v[i][1], v[i][2]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

export class BoatFactory {
  readonly mats = {
    white: new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.35, metalness: 0.05 }),
    hullDark: new THREE.MeshStandardMaterial({ color: 0x1f2a38, roughness: 0.5 }),
    hullRed: new THREE.MeshStandardMaterial({ color: 0x9a2f2a, roughness: 0.55 }),
    hullBlue: new THREE.MeshStandardMaterial({ color: 0x1f4f8a, roughness: 0.5 }),
    teak: new THREE.MeshStandardMaterial({ color: 0xb08a5a, roughness: 0.8 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.1, metalness: 0.9 }),
    sail: new THREE.MeshStandardMaterial({ color: 0xf8f6ee, roughness: 0.9, side: THREE.DoubleSide }),
    steel: new THREE.MeshStandardMaterial({ color: 0x8c949c, roughness: 0.5, metalness: 0.6 }),
    containerWhite: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 }),
  };
  get materials(): THREE.Material[] { return [this.mats.white, this.mats.hullDark, this.mats.hullRed, this.mats.hullBlue, this.mats.teak, this.mats.glass, this.mats.sail, this.mats.steel, this.mats.containerWhite]; }

  build(kind: HullKind, rng: Rng): { group: THREE.Group; len: number; beam: number; draft: number; wakeWidth: number } {
    const g = new THREE.Group();
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
      m.castShadow = true; m.receiveShadow = true;
      g.add(m);
      return m;
    };
    const hullMat = rng.pick([this.mats.white, this.mats.white, this.mats.hullDark, this.mats.hullBlue, this.mats.hullRed]);
    switch (kind) {
      case 'speed': {
        const len = rng.range(7, 10), beam = len * 0.3;
        add(hullGeometry(len, beam, 1.4), hullMat, 0, 0.3, 0);
        add(new THREE.BoxGeometry(len * 0.25, 0.5, beam * 0.8), this.mats.glass, len * 0.05, 1.05, 0, 0, 0, -0.35);
        add(new THREE.BoxGeometry(len * 0.35, 0.35, beam * 0.75), this.mats.teak, -len * 0.2, 0.8, 0);
        add(new THREE.BoxGeometry(0.6, 0.6, 0.8), this.mats.steel, -len * 0.45, 0.6, 0);
        return { group: g, len, beam, draft: 0.5, wakeWidth: beam * 1.4 };
      }
      case 'console': {
        const len = rng.range(6, 8), beam = len * 0.32;
        add(hullGeometry(len, beam, 1.3), this.mats.white, 0, 0.3, 0);
        add(new THREE.BoxGeometry(1.2, 1.4, 1.0), this.mats.white, 0, 1.2, 0);
        add(new THREE.BoxGeometry(1.6, 0.15, 1.6), this.mats.hullDark, 0, 2.3, 0);
        for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6), this.mats.steel, 0.6 * s, 1.5, 0.7 * s);
        add(new THREE.BoxGeometry(0.5, 0.7, 0.5), this.mats.hullDark, -len * 0.45, 0.7, 0);
        return { group: g, len, beam, draft: 0.45, wakeWidth: beam * 1.3 };
      }
      case 'yacht': {
        const len = rng.range(18, 32), beam = len * 0.25;
        add(hullGeometry(len, beam, len * 0.16), this.mats.white, 0, len * 0.04, 0);
        add(new THREE.BoxGeometry(len * 0.5, len * 0.09, beam * 0.8), this.mats.white, -len * 0.05, len * 0.13, 0);
        add(new THREE.BoxGeometry(len * 0.48, len * 0.04, beam * 0.82), this.mats.glass, -len * 0.05, len * 0.135, 0);
        add(new THREE.BoxGeometry(len * 0.28, len * 0.07, beam * 0.6), this.mats.white, -len * 0.12, len * 0.21, 0);
        add(new THREE.BoxGeometry(len * 0.26, len * 0.03, beam * 0.62), this.mats.glass, -len * 0.12, len * 0.215, 0);
        add(new THREE.BoxGeometry(len * 0.06, len * 0.09, beam * 0.5), this.mats.white, -len * 0.2, len * 0.29, 0, 0, 0, 0.3); // radar arch
        add(new THREE.CylinderGeometry(0.15, 0.15, 1.2, 8), this.mats.steel, -len * 0.2, len * 0.34, 0);
        return { group: g, len, beam, draft: len * 0.06, wakeWidth: beam * 1.5 };
      }
      case 'sail': {
        const len = rng.range(9, 14), beam = len * 0.31;
        add(hullGeometry(len, beam, len * 0.14), hullMat, 0, len * 0.03, 0);
        add(new THREE.BoxGeometry(len * 0.3, 0.7, beam * 0.6), this.mats.white, -len * 0.05, len * 0.09 + 0.3, 0);
        const mastH = len * 1.25;
        add(new THREE.CylinderGeometry(0.06, 0.09, mastH, 6), this.mats.steel, len * 0.05, mastH / 2 + len * 0.08, 0);
        // main sail (triangle) + jib
        const sail = new THREE.BufferGeometry();
        sail.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, mastH * 0.9, 0, -len * 0.42, 0, 0], 3));
        sail.computeVertexNormals();
        add(sail, this.mats.sail, len * 0.05, len * 0.13, 0, 0, 0, 0);
        const jib = new THREE.BufferGeometry();
        jib.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, mastH * 0.75, 0, len * 0.4, 0, 0], 3));
        jib.computeVertexNormals();
        add(jib, this.mats.sail, len * 0.05, len * 0.13, 0.05, 0, 0, 0);
        g.rotation.z = 0.12;
        return { group: g, len, beam, draft: 1.5, wakeWidth: beam * 0.9 };
      }
      case 'ferry': {
        const len = 42, beam = 12;
        add(hullGeometry(len, beam, 5), this.mats.hullBlue, 0, 1.5, 0);
        add(new THREE.BoxGeometry(len * 0.8, 3.2, beam * 0.9), this.mats.white, -1, 4.9, 0);
        add(new THREE.BoxGeometry(len * 0.78, 1.2, beam * 0.92), this.mats.glass, -1, 5.2, 0);
        add(new THREE.BoxGeometry(len * 0.4, 2.8, beam * 0.6), this.mats.white, -4, 7.8, 0);
        add(new THREE.CylinderGeometry(0.6, 0.7, 3, 10), this.mats.hullDark, -12, 10.5, 0);
        return { group: g, len, beam, draft: 2.2, wakeWidth: beam * 1.3 };
      }
      case 'cargo': {
        const len = rng.range(120, 180), beam = len * 0.16, hullH = len * 0.075;
        add(hullGeometry(len, beam, hullH), this.mats.hullDark, 0, hullH * 0.15, 0);
        add(new THREE.BoxGeometry(len * 0.9, 0.8, beam * 0.98), this.mats.hullRed, 0, hullH * 0.6, 0);
        // stern bridge
        add(new THREE.BoxGeometry(len * 0.09, hullH * 1.6, beam * 0.9), this.mats.white, -len * 0.38, hullH * 0.6 + hullH * 0.8, 0);
        add(new THREE.BoxGeometry(len * 0.1, 2, beam * 0.95), this.mats.glass, -len * 0.38, hullH * 0.6 + hullH * 1.55, 0);
        add(new THREE.CylinderGeometry(1.2, 1.5, hullH * 0.9, 10), this.mats.hullDark, -len * 0.44, hullH * 0.6 + hullH * 1.9, 0);
        // container stacks as one instanced mesh per ship
        const rows = Math.floor(len * 0.6 / 6.4), cols = Math.max(3, Math.floor(beam / 2.6));
        const boxes: { x: number; y: number; z: number; c: number }[] = [];
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          const stack = rng.int(1, 4);
          for (let k = 0; k < stack; k++) boxes.push({ x: len * 0.3 - r * 6.4, y: hullH * 0.6 + 0.8 + 1.3 + k * 2.6, z: (c - (cols - 1) / 2) * 2.5, c: rng.int(0, 5) });
        }
        const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(6.1, 2.6, 2.44), this.mats.containerWhite, boxes.length);
        const m = new THREE.Matrix4();
        const palette = [0xc0392b, 0x2e86c1, 0x27ae60, 0xd68910, 0x7d8b93, 0xecf0f1].map((c) => new THREE.Color(c));
        boxes.forEach((b, i) => { inst.setMatrixAt(i, m.makeTranslation(b.x, b.y, b.z)); inst.setColorAt(i, palette[b.c]); });
        inst.castShadow = true; inst.receiveShadow = true;
        g.add(inst);
        return { group: g, len, beam, draft: hullH * 0.5, wakeWidth: beam * 1.4 };
      }
    }
  }
}

interface MovingBoat {
  group: THREE.Group;
  route: Vec2[];
  s: number;
  dir: 1 | -1;
  speed: number;
  len: number;
  draft: number;
  wake: WakeTrail;
  phase: number;
}

function routeLength(pts: Vec2[]): number {
  let l = 0;
  for (let i = 0; i < pts.length - 1; i++) l += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
  return l;
}
function routePoint(pts: Vec2[], s: number, out: { x: number; z: number; dx: number; dz: number }): void {
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    if (s <= acc + l || i === pts.length - 2) {
      const t = clamp((s - acc) / l, 0, 1);
      out.dx = (pts[i + 1][0] - pts[i][0]) / l; out.dz = (pts[i + 1][1] - pts[i][1]) / l;
      out.x = pts[i][0] + out.dx * l * t; out.z = pts[i][1] + out.dz * l * t;
      return;
    }
    acc += l;
  }
}

/** Shared material for baked (vertex-coloured) moving vehicles: one draw call per vehicle. */
const BAKED_MATERIAL = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.12 });

/**
 * Collapse a group of small meshes into one vertex-coloured mesh in the group's local frame. The group
 * itself is kept (position/rotation are still driven by the traffic update), only its children change.
 * Sail/glass/steel materials become vertex colours; the small loss in material variety is invisible at the
 * distances moving boats are seen from and saves 5-10 draw calls (x cascades) per vehicle.
 */
function bakeGroup(g: THREE.Group): void {
  g.updateMatrixWorld(true);
  const inv = g.matrixWorld.clone().invert();
  const geos: THREE.BufferGeometry[] = [];
  const cols: THREE.Color[] = [];
  const doubleSided: boolean[] = [];
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const local = m.matrixWorld.clone().premultiply(inv);
    const geo = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(local);
    geos.push(geo);
    const mat = m.material as THREE.MeshStandardMaterial;
    cols.push(mat.color ?? new THREE.Color(0xffffff));
    doubleSided.push(mat.side === THREE.DoubleSide);
  });
  let n = 0;
  for (let i = 0; i < geos.length; i++) n += geos[i].getAttribute('position').count * (doubleSided[i] ? 2 : 1);
  const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), col = new Float32Array(n * 3);
  let o = 0;
  for (let i = 0; i < geos.length; i++) {
    const gg = geos[i];
    const p = gg.getAttribute('position'), nn = gg.getAttribute('normal');
    const c = cols[i];
    const put = (flip: boolean) => {
      for (let k = 0; k < p.count; k++) {
        const src = flip ? (k - (k % 3)) + (2 - (k % 3)) : k; // reverse winding for the back copy
        pos[(o + k) * 3] = p.getX(src); pos[(o + k) * 3 + 1] = p.getY(src); pos[(o + k) * 3 + 2] = p.getZ(src);
        const s = flip ? -1 : 1;
        nrm[(o + k) * 3] = s * nn.getX(src); nrm[(o + k) * 3 + 1] = s * nn.getY(src); nrm[(o + k) * 3 + 2] = s * nn.getZ(src);
        col[(o + k) * 3] = c.r; col[(o + k) * 3 + 1] = c.g; col[(o + k) * 3 + 2] = c.b;
      }
      o += p.count;
    };
    put(false);
    if (doubleSided[i]) put(true);
    gg.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeBoundingSphere();
  for (const c of [...g.children]) g.remove(c);
  const mesh = new THREE.Mesh(out, BAKED_MATERIAL);
  mesh.castShadow = true; mesh.receiveShadow = true;
  g.add(mesh);
}

function mergeStatic(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let n = 0;
  for (const g of geos) n += g.getAttribute('position').count;
  const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3);
  let o = 0;
  for (const g of geos) {
    const p = g.getAttribute('position'), nn = g.getAttribute('normal');
    pos.set(p.array as Float32Array, o * 3);
    if (nn) nrm.set(nn.array as Float32Array, o * 3);
    o += p.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  out.computeBoundingSphere();
  return out;
}

// ------------------------------------------------------------------ cars

interface CarRoute { pts: THREE.Vector3[]; length: number; lanes: number; width: number; }
interface Car { route: number; s: number; dir: 1 | -1; lane: number; speed: number; color: THREE.Color; }

// ------------------------------------------------------------------ aircraft

interface DistantAircraft { group: THREE.Group; path: (t: number) => THREE.Vector3; period: number; offset: number; contrail: WakeTrail | null; }

export class Traffic {
  readonly group = new THREE.Group();
  readonly materials: THREE.Material[] = [];
  private boats: MovingBoat[] = [];
  private carRoutes: CarRoute[] = [];
  private cars: Car[] = [];
  private carBodies!: THREE.InstancedMesh;
  private carCabins!: THREE.InstancedMesh;
  private carLights!: THREE.InstancedMesh;
  private aircraft: DistantAircraft[] = [];
  private readonly tmp = { x: 0, z: 0, dx: 1, dz: 0 };
  private readonly tmpM = new THREE.Matrix4();
  private readonly tmpQ = new THREE.Quaternion();
  private readonly tmpP = new THREE.Vector3();
  private readonly tmpS = new THREE.Vector3();
  boatCount = 0;
  carCount = 0;

  constructor(private map: WorldMap, roads: RoadSegment[], bridges: BridgeRoute[], private wakeScene: THREE.Scene, seed: number, moored: { x: number; z: number; rot: number; len: number }[]) {
    const rng = new Rng(`traffic-${seed}`);
    const factory = new BoatFactory();
    this.materials.push(...factory.materials, BAKED_MATERIAL);
    // moving boats along channels
    for (const ch of map.channels) {
      const len = routeLength(ch.pts);
      for (let i = 0; i < ch.boats; i++) {
        const kind: HullKind = ch.id === 'ocean-route' || ch.id === 'ship-channel' ? (rng.chance(0.6) ? 'cargo' : 'ferry') : rng.pick(['speed', 'speed', 'console', 'yacht', 'sail', 'speed']);
        const b = factory.build(kind, rng);
        const speed = kind === 'cargo' ? rng.range(4, 6) : kind === 'ferry' ? 7 : kind === 'sail' ? rng.range(2.5, 4) : kind === 'yacht' ? rng.range(5, 9) : rng.range(9, 16);
        const wake = new WakeTrail(kind === 'cargo' ? 90 : 80, b.wakeWidth, kind === 'cargo' ? 70 : kind === 'sail' ? 20 : 42, kind === 'sail' ? 0.45 : 1.5);
        wakeScene.add(wake.mesh);
        bakeGroup(b.group);
        this.group.add(b.group);
        this.boats.push({ group: b.group, route: ch.pts, s: rng.range(0, len), dir: rng.chance(0.5) ? 1 : -1, speed, len: b.len, draft: b.draft, wake, phase: rng.range(0, 100) });
      }
    }
    // moored boats (static, no wake): merged into one mesh per material
    const byMat = new Map<THREE.Material, THREE.BufferGeometry[]>();
    for (const mb of moored) {
      const b = factory.build(rng.chance(0.4) ? 'sail' : rng.chance(0.5) ? 'speed' : rng.chance(0.5) ? 'console' : 'yacht', rng);
      const scale = clamp(mb.len / b.len, 0.6, 1.4);
      b.group.scale.setScalar(scale);
      b.group.position.set(mb.x, 0.05, mb.z);
      b.group.rotation.y = mb.rot + (rng.chance(0.5) ? Math.PI : 0);
      b.group.updateMatrixWorld(true);
      b.group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        const g = m.geometry.clone().applyMatrix4(m.matrixWorld);
        const mat = m.material as THREE.Material;
        let list = byMat.get(mat); if (!list) { list = []; byMat.set(mat, list); }
        list.push(g.index ? g.toNonIndexed() : g);
      });
    }
    for (const [mat, geos] of byMat) {
      const merged = mergeStatic(geos);
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = true; mesh.receiveShadow = true;
      this.group.add(mesh);
    }
    this.boatCount = this.boats.length + moored.length;

    // car routes: authored road polylines + generated streets + bridge decks
    const byId = new Map<string, THREE.Vector3[]>();
    for (const r of map.roads) byId.set(r.id, r.pts.map(([x, z]) => new THREE.Vector3(x, map.heightAt(x, z) + 0.25, z)));
    for (const [id, pts] of byId) {
      const spec = map.roads.find((r) => r.id === id)!;
      this.carRoutes.push({ pts, length: this.len3(pts), lanes: spec.lanes, width: spec.width });
    }
    for (const b of bridges) this.carRoutes.push({ pts: b.pts.map((p) => p.clone().add(new THREE.Vector3(0, 0.25, 0))), length: this.len3(b.pts), lanes: b.lanes, width: b.width });
    for (const s of roads) {
      if (s.cls !== 'street') continue;
      if (rng.next() > 0.35) continue; // not every street carries traffic
      const pts = [new THREE.Vector3(s.a[0], map.heightAt(s.a[0], s.a[1]) + 0.25, s.a[1]), new THREE.Vector3(s.b[0], map.heightAt(s.b[0], s.b[1]) + 0.25, s.b[1])];
      this.carRoutes.push({ pts, length: this.len3(pts), lanes: 2, width: s.width });
    }
    const carColors = ['#e8e8e8', '#d0d0d0', '#1c1c1e', '#8a8f94', '#b8352e', '#2b4c8c', '#d9a441', '#3d6b3a', '#f2f2f2', '#6c6f73', '#c94f3d', '#20242a'];
    for (let ri = 0; ri < this.carRoutes.length; ri++) {
      const r = this.carRoutes[ri];
      const spec = map.roads.find((x) => x.pts.length === r.pts.length && x.pts[0][0] === r.pts[0].x);
      const density = spec ? spec.traffic : r.lanes >= 4 ? 10 : 1.2;
      const n = Math.min(120, Math.round((r.length / 1000) * density));
      for (let i = 0; i < n; i++) {
        const dir = rng.chance(0.5) ? 1 : -1;
        this.cars.push({ route: ri, s: rng.range(0, r.length), dir, lane: rng.int(0, Math.max(0, Math.floor(r.lanes / 2) - 1)), speed: rng.range(11, 26) * (r.lanes >= 4 ? 1.2 : 0.8), color: new THREE.Color(rng.pick(carColors)) });
      }
    }
    this.carCount = this.cars.length;
    const bodyGeo = new THREE.BoxGeometry(4.4, 1.0, 1.9); bodyGeo.translate(0, 0.65, 0);
    const cabinGeo = new THREE.BoxGeometry(2.2, 0.75, 1.7); cabinGeo.translate(-0.2, 1.5, 0);
    const lightGeo = new THREE.BoxGeometry(0.2, 0.25, 1.6); lightGeo.translate(2.2, 0.8, 0);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.4 });
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x1a222c, roughness: 0.15, metalness: 0.8 });
    const lightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2d0, emissiveIntensity: 0 });
    this.materials.push(bodyMat, cabinMat, lightMat);
    this.carBodies = new THREE.InstancedMesh(bodyGeo, bodyMat, this.cars.length);
    this.carCabins = new THREE.InstancedMesh(cabinGeo, cabinMat, this.cars.length);
    this.carLights = new THREE.InstancedMesh(lightGeo, lightMat, this.cars.length);
    for (const m of [this.carBodies, this.carCabins, this.carLights]) { m.frustumCulled = false; m.castShadow = true; }
    this.cars.forEach((c, i) => this.carBodies.setColorAt(i, c.color));
    this.group.add(this.carBodies, this.carCabins, this.carLights);

    // distant aircraft: two airliners on approach / departure, one high cruiser with a contrail
    const airMat = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.35, metalness: 0.2 });
    const tailMat = new THREE.MeshStandardMaterial({ color: 0x2a6fbf, roughness: 0.4 });
    this.materials.push(airMat, tailMat);
    const airliner = (scale: number) => {
      const g = new THREE.Group();
      const fus = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 38, 12), airMat); fus.rotation.z = Math.PI / 2; g.add(fus);
      const nose = new THREE.Mesh(new THREE.SphereGeometry(1.9, 12, 8), airMat); nose.position.x = 19; nose.scale.set(1.6, 1, 1); g.add(nose);
      const wing = new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, 34), airMat); wing.position.set(1, -0.8, 0); wing.rotation.y = 0.0; g.add(wing);
      const sweepL = new THREE.Mesh(new THREE.BoxGeometry(5, 0.4, 16), airMat); sweepL.position.set(-3, -0.8, 12); sweepL.rotation.y = -0.45; g.add(sweepL);
      const sweepR = sweepL.clone(); sweepR.position.z = -12; sweepR.rotation.y = 0.45; g.add(sweepR);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(5, 8, 0.4), tailMat); tail.position.set(-16, 4.5, 0); tail.rotation.z = -0.4; g.add(tail);
      const hstab = new THREE.Mesh(new THREE.BoxGeometry(4, 0.3, 12), airMat); hstab.position.set(-17, 1, 0); g.add(hstab);
      for (const s of [-1, 1]) { const eng = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.0, 4.5, 10), airMat); eng.rotation.z = Math.PI / 2; eng.position.set(3, -2.4, s * 7); g.add(eng); }
      g.scale.setScalar(scale);
      bakeGroup(g);
      return g;
    };
    const rwy = map.runways[0];
    // approach to runway 09 from the east over the bay: descend from 900 m at x=+3000 to the threshold
    const approach = (t: number) => {
      const x = lerp(4000, rwy.a[0], t), z = lerp(rwy.a[1] + 30, rwy.a[1], t);
      const y = lerp(900, 12, Math.pow(t, 0.9));
      return new THREE.Vector3(x, y, z);
    };
    const a1 = airliner(1.0); this.group.add(a1);
    this.aircraft.push({ group: a1, path: approach, period: 240, offset: 0, contrail: null });
    const a2 = airliner(0.9); this.group.add(a2);
    this.aircraft.push({ group: a2, path: approach, period: 240, offset: 0.5, contrail: null });
    // departure climbing west then turning north
    const departure = (t: number) => {
      const x = lerp(rwy.b[0], -9000, t), z = rwy.b[1] - 3500 * t * t;
      return new THREE.Vector3(x, 12 + 2200 * Math.pow(t, 0.8), z);
    };
    const a3 = airliner(1.0); this.group.add(a3);
    this.aircraft.push({ group: a3, path: departure, period: 200, offset: 0.2, contrail: null });
    // high cruiser with contrail
    const cruise = (t: number) => new THREE.Vector3(lerp(-14000, 14000, t), 9500, lerp(-9000, 6000, t));
    const a4 = airliner(1.0); this.group.add(a4);
    const contrail = new WakeTrail(180, 25, 90, 0.6, CONTRAIL_MATERIAL);
    this.aircraft.push({ group: a4, path: cruise, period: 260, offset: 0.4, contrail });
  }

  private len3(pts: THREE.Vector3[]): number {
    let l = 0;
    for (let i = 0; i < pts.length - 1; i++) l += pts[i].distanceTo(pts[i + 1]);
    return l;
  }

  private point3(pts: THREE.Vector3[], s: number, out: THREE.Vector3, dir: THREE.Vector3): void {
    let acc = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const l = pts[i].distanceTo(pts[i + 1]);
      if (s <= acc + l || i === pts.length - 2) {
        const t = clamp((s - acc) / l, 0, 1);
        dir.subVectors(pts[i + 1], pts[i]).divideScalar(l);
        out.copy(pts[i]).addScaledVector(dir, l * t);
        return;
      }
      acc += l;
    }
  }

  /** Contrail meshes live in the main scene (they are drawn in the air, not on the water). */
  get contrailMeshes(): THREE.Mesh[] { return this.aircraft.filter((a) => a.contrail).map((a) => a.contrail!.mesh); }

  update(dt: number, time: number, night: number): void {
    // boats
    for (const b of this.boats) {
      const len = routeLength(b.route);
      b.s += b.speed * dt * b.dir;
      if (b.s > len - 5) { b.s = len - 5; b.dir = -1; }
      if (b.s < 5) { b.s = 5; b.dir = 1; }
      routePoint(b.route, b.s, this.tmp);
      const yaw = Math.atan2(this.tmp.dx * b.dir, this.tmp.dz * b.dir);
      b.group.position.set(this.tmp.x, -b.draft * 0.15 + 0.12 * Math.sin(time * 1.3 + b.phase) * (b.len < 20 ? 1 : 0.2), this.tmp.z);
      // hull axis is +x, rotate so +x points along travel direction
      b.group.rotation.set(0.02 * Math.sin(time * 1.7 + b.phase), yaw - Math.PI / 2, 0.03 * Math.sin(time * 1.1 + b.phase) + (b.speed > 8 ? -0.03 : 0));
      // planing boats pitch up
      if (b.speed > 9) b.group.rotation.x += 0.0; 
      b.wake.update(this.tmp.x - this.tmp.dx * b.dir * b.len * 0.4, this.tmp.z - this.tmp.dz * b.dir * b.len * 0.4, time, true, b.speed);
    }
    // cars
    const up = new THREE.Vector3(0, 1, 0);
    const pos = new THREE.Vector3(), dir = new THREE.Vector3(), side = new THREE.Vector3();
    for (let i = 0; i < this.cars.length; i++) {
      const c = this.cars[i];
      const r = this.carRoutes[c.route];
      c.s += c.speed * dt * c.dir;
      if (c.s > r.length) { c.s = 0; }
      if (c.s < 0) { c.s = r.length; }
      this.point3(r.pts, c.s, pos, dir);
      if (c.dir < 0) dir.negate();
      side.crossVectors(dir, up).normalize();
      const laneOff = (r.lanes >= 4 ? 1.5 + c.lane * 3.2 : 1.8) + 0.0;
      pos.addScaledVector(side, laneOff);
      const yaw = Math.atan2(dir.x, dir.z) - Math.PI / 2;
      const pitch = -Math.asin(clamp(dir.y, -1, 1));
      this.tmpQ.setFromEuler(new THREE.Euler(0, yaw, pitch, 'YXZ'));
      this.tmpP.copy(pos);
      this.tmpS.set(1, 1, 1);
      this.tmpM.compose(this.tmpP, this.tmpQ, this.tmpS);
      this.carBodies.setMatrixAt(i, this.tmpM);
      this.carCabins.setMatrixAt(i, this.tmpM);
      this.carLights.setMatrixAt(i, this.tmpM);
    }
    this.carBodies.instanceMatrix.needsUpdate = true;
    this.carCabins.instanceMatrix.needsUpdate = true;
    this.carLights.instanceMatrix.needsUpdate = true;
    (this.carLights.material as THREE.MeshStandardMaterial).emissiveIntensity = 6 * night;
    if (this.carBodies.instanceColor) this.carBodies.instanceColor.needsUpdate = true;
    // aircraft
    for (const a of this.aircraft) {
      const t = ((time / a.period) + a.offset) % 1;
      const p = a.path(t), p2 = a.path(Math.min(1, t + 0.002));
      a.group.position.copy(p);
      const d = p2.clone().sub(p).normalize();
      const yaw = Math.atan2(d.x, d.z) - Math.PI / 2;
      const pitch = Math.asin(clamp(d.y, -1, 1));
      a.group.rotation.set(0, yaw, pitch * 0.6, 'YXZ');
      if (a.contrail) {
        a.contrail.update(p.x, p.z, time, true, 250);
        a.contrail.mesh.position.y = p.y - 2;
        a.contrail.mesh.updateMatrix();
      }
    }
  }
}
