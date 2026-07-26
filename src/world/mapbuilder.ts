import * as THREE from 'three';
import {
  ROOMS, WALLS, STAIRS, SLABS, RAILS, STAIR_GUARDS, MAP_BOUNDS,
  type MatId, type WallSpec, type OpeningSpec,
} from './layout';
import { ROOM_NAMES, type SurfaceKind } from '../game/types';
import { CollisionWorld } from './collision';
import { Batcher } from './kit/geo';
import { Door, type DoorSpawn } from './doors';
import { GlassSystem } from './glassy';
import { plainMat, isGraybox } from '../assets/materials';
import { makeCanvas, toTexture } from '../assets/textures/gen';
import { registerAsset } from '../assets/registry';

registerAsset({
  id: 'arch.kit',
  name: 'Modular architecture kit (walls, floors, ceilings, frames, trim, stairs, railings)',
  category: 'architecture',
  agent: 'Fable 2',
  files: 'src/world/mapbuilder.ts, src/world/kit/geo.ts, src/world/layout.ts',
  where: 'entire annex',
  dims: 'map 54×32 m footprint, two floors',
  materials: 'full material library, world-scale UVs',
  textures: 'procedural library',
  collision: 'static-aabb per solid piece',
  lod: 'merged-static per material',
  status: 'integrated',
  accept: 'no light/vision leaks, no razor edges at eye level (frames/trim/baseboards), correct door/window openings',
});

export function surfaceOf(mat: MatId): SurfaceKind {
  if (/carpet/.test(mat)) return 'carpet';
  if (/tile/.test(mat) && !/ceiling/.test(mat)) return 'tile';
  if (/vinyl/.test(mat)) return 'vinyl';
  if (/concrete|cmu|asphalt|ceiling-slab|stone/.test(mat)) return 'concrete';
  if (/metal/.test(mat)) return 'metal';
  if (/wood/.test(mat)) return 'wood';
  if (/brick/.test(mat)) return 'concrete';
  if (/snow/.test(mat)) return 'snow';
  if (/ceiling/.test(mat)) return 'drywall';
  return 'drywall';
}

export interface ShutterEntity {
  id: string;
  group: THREE.Group;
  openT: number;
  opening: boolean;
  height: number;
  step(dt: number): void;
  open(): void;
  reset(): void;
}

export interface WorldModel {
  group: THREE.Group;
  labels: THREE.Group;
  collision: CollisionWorld;
  doors: Door[];
  doorById: Map<string, Door>;
  glass: GlassSystem;
  shutters: ShutterEntity[];
}

export function buildWorld(): WorldModel {
  const collision = new CollisionWorld();
  const group = new THREE.Group();
  group.name = 'world-static';
  const labels = new THREE.Group();
  labels.name = 'room-labels';
  const batch = new Batcher();
  const glass = new GlassSystem(collision);
  const doors: Door[] = [];
  const doorSpawns: DoorSpawn[] = [];
  const shutters: ShutterEntity[] = [];

  const col = (mat: MatId, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, tag?: string, transparent?: boolean): void => {
    collision.addStatic({
      id: tag ?? 'static',
      min: new THREE.Vector3(Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1)),
      max: new THREE.Vector3(Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1)),
      surface: surfaceOf(mat),
      transparent,
      tag,
    });
  };
  const solid = (mat: MatId, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, tag?: string): void => {
    batch.boxMM(mat, x0, y0, z0, x1, y1, z1);
    col(mat, x0, y0, z0, x1, y1, z1, tag);
  };

  // ---------------- floors / ceilings ----------------
  for (const r of ROOMS) {
    const [x0, z0, x1, z1] = r.rect;
    if (r.floorY > 0.01) {
      // upper room: soffit slab + finish floor (lobby-visible soffits get light finish)
      const soffit = r.id === 'balcony' || r.id === 'records' ? 'drywall' : 'ceiling-slab';
      solid(soffit, x0, r.floorY - 0.28, z0, x1, r.floorY - 0.05, z1, `slab:${r.id}`);
      solid(r.floorMat, x0, r.floorY - 0.05, z0, x1, r.floorY, z1, `floor:${r.id}`);
    } else {
      solid(r.floorMat, x0, -0.3, z0, x1, 0, z1, `floor:${r.id}`);
    }
    if (r.ceilY !== null) {
      const cy = r.ceilY;
      solid(r.ceilMat, x0, cy, z0, x1, cy + 0.12, z1, `ceil:${r.id}`);
    }
    // room label (graybox / QA aid)
    const label = makeLabel(ROOM_NAMES[r.id]);
    label.position.set((x0 + x1) / 2, r.floorY + 2.05, (z0 + z1) / 2);
    labels.add(label);
  }
  for (const s of SLABS) {
    const [x0, z0, x1, z1] = s.rect;
    solid(s.mat, x0, s.y0, z0, x1, s.y1, z1, s.id);
  }

  // ---------------- walls ----------------
  for (const w of WALLS) {
    buildWall(w, batch, col, doorSpawns, glass, shutters, group, collision);
  }

  // ---------------- stairs ----------------
  for (const s of STAIRS) {
    const w = s.x1 - s.x0;
    const runLen = (s.z1 - s.z0) / s.steps;
    for (let i = 0; i < s.steps; i++) {
      const top = s.baseY + s.rise * (i + 1);
      let za: number, zb: number;
      if (s.dir === '+z') {
        za = s.z0 + i * runLen; zb = za + runLen;
      } else {
        zb = s.z1 - i * runLen; za = zb - runLen;
      }
      solid(s.mat, s.x0, Math.max(s.baseY - 0.24, -0.24), za, s.x1, top, zb, `stair:${s.id}`);
    }
  }
  // sloped stair guards (visual planes + stepped colliders)
  for (const g of STAIR_GUARDS) {
    const len = Math.abs(g.z1 - g.z0);
    const n = Math.ceil(len / 0.4);
    for (let i = 0; i < n; i++) {
      const f0 = i / n, f1 = (i + 1) / n;
      const zA = g.z0 + (g.z1 - g.z0) * f0;
      const zB = g.z0 + (g.z1 - g.z0) * f1;
      const yBase = g.dir === '-z'
        ? g.y0 + (g.y1 - g.y0) * (1 - (Math.min(zA, zB) - Math.min(g.z0, g.z1)) / len)
        : g.y0 + (g.y1 - g.y0) * ((Math.min(zA, zB) - Math.min(g.z0, g.z1)) / len);
      col('metal-panel', g.x0 - 0.03, yBase, Math.min(zA, zB), g.x0 + 0.03, yBase + 1.06, Math.max(zA, zB), `guard:${g.id}`, true);
    }
    // visual: inclined panel
    const midZ = (g.z0 + g.z1) / 2;
    const slopeLen = Math.sqrt(len * len + (g.y1 - g.y0) * (g.y1 - g.y0));
    const mat = g.kind === 'glass'
      ? new THREE.MeshPhysicalMaterial({ color: 0xd8e8ea, transparent: true, opacity: 0.22, roughness: 0.08, side: THREE.DoubleSide, depthWrite: false })
      : plainMat(0x5a636b, 0.4, 0.7);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.92, slopeLen - 0.15), mat);
    panel.position.set(g.x0, (g.y0 + g.y1) / 2 + 0.52, midZ);
    panel.rotation.x = (g.dir === '-z' ? 1 : -1) * Math.atan2(g.y1 - g.y0, len);
    panel.castShadow = g.kind !== 'glass';
    group.add(panel);
    // handrail tube
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, slopeLen, 8), plainMat(0x394147, 0.35, 0.8));
    rail.rotation.x = Math.PI / 2 + (g.dir === '-z' ? 1 : -1) * Math.atan2(g.y1 - g.y0, len);
    rail.position.set(g.x0, (g.y0 + g.y1) / 2 + 1.02, midZ);
    rail.castShadow = true;
    group.add(rail);
  }

  // ---------------- level railings ----------------
  for (const r of RAILS) {
    const [ax, az] = r.a;
    const [bx, bz] = r.b;
    const alongX = Math.abs(bx - ax) > Math.abs(bz - az);
    const len = alongX ? Math.abs(bx - ax) : Math.abs(bz - az);
    const x0 = Math.min(ax, bx), z0 = Math.min(az, bz);
    // collider: full guard height
    col('metal-panel',
      x0 - (alongX ? 0 : 0.035), r.y, z0 - (alongX ? 0.035 : 0),
      x0 + (alongX ? len : 0.035), r.y + 1.06, z0 + (alongX ? 0.035 : len),
      `rail:${r.id}`, true);
    if (r.kind === 'glass') {
      const mat = new THREE.MeshPhysicalMaterial({ color: 0xd8e8ea, transparent: true, opacity: 0.22, roughness: 0.08, side: THREE.DoubleSide, depthWrite: false });
      const panel = new THREE.Mesh(new THREE.BoxGeometry(alongX ? len - 0.06 : 0.025, 0.9, alongX ? 0.025 : len - 0.06), mat);
      panel.position.set(x0 + (alongX ? len / 2 : 0), r.y + 0.5, z0 + (alongX ? 0 : len / 2));
      group.add(panel);
    } else {
      const bars = Math.floor(len / 0.14);
      const barMat = plainMat(0x4a545c, 0.45, 0.7);
      for (let i = 0; i <= bars; i++) {
        const bx2 = x0 + (alongX ? (i / bars) * len : 0);
        const bz2 = z0 + (alongX ? 0 : (i / bars) * len);
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.92, 0.02), barMat);
        bar.position.set(bx2, r.y + 0.48, bz2);
        group.add(bar);
      }
    }
    // top rail
    const railMat = plainMat(r.kind === 'glass' ? 0x8a949c : 0x394147, 0.35, 0.8);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, len, 10), railMat);
    top.rotation.z = alongX ? Math.PI / 2 : 0;
    if (!alongX) top.rotation.x = Math.PI / 2;
    top.position.set(x0 + (alongX ? len / 2 : 0), r.y + 1.02, z0 + (alongX ? 0 : len / 2));
    top.castShadow = true;
    group.add(top);
  }

  // ---------------- courtyard fence ----------------
  buildFence(group, col);

  // finalize merged meshes + broadphase
  batch.build(group, { name: 'arch' });
  group.add(glass.group);
  collision.build(MAP_BOUNDS.minX, MAP_BOUNDS.minZ, MAP_BOUNDS.maxX, MAP_BOUNDS.maxZ);

  const doorById = new Map<string, Door>();
  for (const spawn of doorSpawns) {
    const door = new Door(spawn, collision);
    doors.push(door);
    doorById.set(door.id, door);
    group.add(door.group);
  }

  labels.visible = isGraybox();

  return { group, labels, collision, doors, doorById, glass, shutters };
}

// ---------------------------------------------------------------------------

function buildWall(
  w: WallSpec,
  batch: Batcher,
  col: (mat: MatId, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, tag?: string, transparent?: boolean) => void,
  doorSpawns: DoorSpawn[],
  glass: GlassSystem,
  shutters: ShutterEntity[],
  group: THREE.Group,
  collision: CollisionWorld,
): void {
  const alongX = Math.abs(w.b[0] - w.a[0]) > Math.abs(w.b[1] - w.a[1]);
  const len = alongX ? Math.abs(w.b[0] - w.a[0]) : Math.abs(w.b[1] - w.a[1]);
  const ox = Math.min(w.a[0], w.b[0]);
  const oz = Math.min(w.a[1], w.b[1]);
  const ht = w.t / 2;

  // solid piece from d0..d1 along wall, y0..y1 (split into liner halves if set)
  const piece = (d0: number, d1: number, y0: number, y1: number): void => {
    if (d1 - d0 < 0.005 || y1 - y0 < 0.005) return;
    const emit = (mat: MatId, n0: number, n1: number): void => {
      if (alongX) {
        batch.boxMM(mat, ox + d0, y0, oz + n0, ox + d1, y1, oz + n1);
        col(mat, ox + d0, y0, oz + n0, ox + d1, y1, oz + n1, `wall:${w.id}`);
      } else {
        batch.boxMM(mat, ox + n0, y0, oz + d0, ox + n1, y1, oz + d1);
        col(mat, ox + n0, y0, oz + d0, ox + n1, y1, oz + d1, `wall:${w.id}`);
      }
    };
    if (w.matInner && w.innerSide) {
      if (w.innerSide === '+') {
        emit(w.mat, -ht, 0);
        emit(w.matInner, 0, ht);
      } else {
        emit(w.matInner, -ht, 0);
        emit(w.mat, 0, ht);
      }
    } else {
      emit(w.mat, -ht, ht);
    }
  };
  // trim (no collision)
  const trim = (mat: MatId, d0: number, d1: number, y0: number, y1: number, extraT: number): void => {
    if (alongX) batch.boxMM(mat, ox + d0, y0, oz - ht - extraT, ox + d1, y1, oz + ht + extraT);
    else batch.boxMM(mat, ox - ht - extraT, y0, oz + d0, ox + ht + extraT, y1, oz + d1);
  };

  const ops = [...(w.openings ?? [])].sort((a, b) => a.at - b.at);
  // clamp openings into wall
  let cursor = 0;
  const floorBands: [number, number][] = [];
  if (w.y0 < 0.01) floorBands.push([0, 0]);
  if (w.y0 < 3.61 && w.y1 > 3.6) floorBands.push([3.6, 3.6]);
  if (w.y0 > 3.4) floorBands.push([w.y0, w.y0]);

  for (const op of ops) {
    const d0 = op.at - op.width / 2;
    const d1 = op.at + op.width / 2;
    piece(cursor, d0, w.y0, w.y1);
    // header above opening
    piece(d0, d1, w.y0 + op.top, w.y1);
    // sill below opening
    if (op.sill > 0.01) piece(d0, d1, w.y0, w.y0 + op.sill);
    handleOpening(w, op, alongX, ox, oz, ht, d0, d1, batch, col, doorSpawns, glass, shutters, group, collision);
    cursor = d1;
  }
  piece(cursor, len, w.y0, w.y1);

  // baseboards along full wall at each floor band (cut at openings with sill==0)
  const baseMat: MatId = 'stone-dark';
  for (const [by] of floorBands) {
    let c = 0;
    for (const op of ops) {
      const d0 = op.at - op.width / 2;
      const d1 = op.at + op.width / 2;
      const cutsBase = op.sill < 0.05 && by >= w.y0 - 0.01 && by <= w.y0 + 0.02 ? true : (op.sill + w.y0 < by + 0.1 && w.y0 + op.top > by);
      if (cutsBase) {
        if (d0 - c > 0.02) trim(baseMat, c, d0, by, by + 0.1, 0.012);
        c = d1;
      }
    }
    if (len - c > 0.02) trim(baseMat, c, len, by, by + 0.1, 0.012);
  }
}

function handleOpening(
  w: WallSpec, op: OpeningSpec, alongX: boolean, ox: number, oz: number, ht: number,
  d0: number, d1: number,
  batch: Batcher,
  col: (mat: MatId, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, tag?: string, transparent?: boolean) => void,
  doorSpawns: DoorSpawn[],
  glass: GlassSystem,
  shutters: ShutterEntity[],
  group: THREE.Group,
  collision: CollisionWorld,
): void {
  const frameMat: MatId = 'metal-panel';
  const y0 = w.y0 + op.sill;
  const y1 = w.y0 + op.top;

  const frame = (): void => {
    const fw = 0.07;
    const ft = 0.03; // protrusion beyond wall faces
    if (alongX) {
      batch.boxMM(frameMat, ox + d0 - fw, y0 - (op.sill > 0 ? fw : 0), oz - ht - ft, ox + d0, y1 + fw, oz + ht + ft);
      batch.boxMM(frameMat, ox + d1, y0 - (op.sill > 0 ? fw : 0), oz - ht - ft, ox + d1 + fw, y1 + fw, oz + ht + ft);
      batch.boxMM(frameMat, ox + d0, y1, oz - ht - ft, ox + d1, y1 + fw, oz + ht + ft);
      if (op.sill > 0) batch.boxMM(frameMat, ox + d0, y0 - fw, oz - ht - ft, ox + d1, y0, oz + ht + ft);
      col(frameMat, ox + d0 - fw, y0, oz - ht - ft, ox + d0, y1, oz + ht + ft, `frame:${w.id}`);
      col(frameMat, ox + d1, y0, oz - ht - ft, ox + d1 + fw, y1, oz + ht + ft, `frame:${w.id}`);
    } else {
      batch.boxMM(frameMat, ox - ht - ft, y0 - (op.sill > 0 ? fw : 0), oz + d0 - fw, ox + ht + ft, y1 + fw, oz + d0);
      batch.boxMM(frameMat, ox - ht - ft, y0 - (op.sill > 0 ? fw : 0), oz + d1, ox + ht + ft, y1 + fw, oz + d1 + fw);
      batch.boxMM(frameMat, ox - ht - ft, y1, oz + d0, ox + ht + ft, y1 + fw, oz + d1);
      if (op.sill > 0) batch.boxMM(frameMat, ox - ht - ft, y0 - fw, oz + d0, ox + ht + ft, y0, oz + d1);
      col(frameMat, ox - ht - ft, y0, oz + d0 - fw, ox + ht + ft, y1, oz + d0, `frame:${w.id}`);
      col(frameMat, ox - ht - ft, y0, oz + d1, ox + ht + ft, y1, oz + d1 + fw, `frame:${w.id}`);
    }
  };

  switch (op.kind) {
    case 'passage': {
      // clean drywall return: thin jamb wrap
      return;
    }
    case 'door': {
      frame();
      if (op.door) {
        const hinge = alongX
          ? new THREE.Vector3(ox + d0 + 0.02, w.y0, oz)
          : new THREE.Vector3(ox, w.y0, oz + d0 + 0.02);
        doorSpawns.push({
          id: op.door.id,
          kind: op.door.kind,
          hinge,
          along: alongX ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1),
          normal: alongX ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0),
          width: op.width - 0.04,
          height: op.top - 0.02,
          double: op.door.double,
          ajar: op.door.ajar,
        });
      }
      return;
    }
    case 'window':
    case 'glass': {
      frame();
      const panels = op.glass?.panels ?? 1;
      const pw = (d1 - d0) / panels;
      for (let i = 0; i < panels; i++) {
        const pd0 = d0 + i * pw;
        glass.addPane({
          id: `${op.glass!.id}#${i}`,
          pos: alongX ? new THREE.Vector3(ox + pd0 + 0.02, y0, oz) : new THREE.Vector3(ox, y0, oz + pd0 + 0.02),
          w: pw - 0.04,
          h: y1 - y0,
          axis: alongX ? 'x' : 'z',
          frosted: op.glass?.frosted,
          wired: op.glass?.wired,
          breakable: op.glass?.breakable,
        });
        // mullion between panels
        if (i > 0) {
          if (alongX) {
            batch.boxMM(frameMat, ox + pd0 - 0.025, y0, oz - ht * 0.7, ox + pd0 + 0.025, y1, oz + ht * 0.7);
            col(frameMat, ox + pd0 - 0.025, y0, oz - ht * 0.7, ox + pd0 + 0.025, y1, oz + ht * 0.7, 'mullion');
          } else {
            batch.boxMM(frameMat, ox - ht * 0.7, y0, oz + pd0 - 0.025, ox + ht * 0.7, y1, oz + pd0 + 0.025);
            col(frameMat, ox - ht * 0.7, y0, oz + pd0 - 0.025, ox + ht * 0.7, y1, oz + pd0 + 0.025, 'mullion');
          }
        }
      }
      return;
    }
    case 'shutter': {
      frame();
      const shutter = buildShutter(op.shutterId ?? 'shutter', alongX, ox, oz, d0, d1, w.y0, y1, collision);
      shutters.push(shutter);
      group.add(shutter.group);
      return;
    }
  }
}

function buildShutter(
  id: string, alongX: boolean, ox: number, oz: number, d0: number, d1: number, y0: number, y1: number,
  collision: CollisionWorld,
): ShutterEntity {
  const g = new THREE.Group();
  const wdt = d1 - d0;
  const h = y1 - y0;
  const slatMat = plainMat(0x9aa3aa, 0.5, 0.75);
  const slats = Math.floor(h / 0.28);
  const meshes: THREE.Mesh[] = [];
  for (let i = 0; i < slats; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(alongX ? wdt - 0.08 : 0.06, 0.26, alongX ? 0.06 : wdt - 0.08), slatMat);
    slat.position.set(
      alongX ? ox + d0 + wdt / 2 : ox,
      y0 + 0.14 + i * 0.28,
      alongX ? oz : oz + d0 + wdt / 2,
    );
    slat.castShadow = true;
    slat.receiveShadow = true;
    g.add(slat);
    meshes.push(slat);
  }
  const min = new THREE.Vector3(alongX ? ox + d0 : ox - 0.06, y0, alongX ? oz - 0.06 : oz + d0);
  const max = new THREE.Vector3(alongX ? ox + d1 : ox + 0.06, y1, alongX ? oz + 0.06 : oz + d1);
  collision.setDynamic({ id: `shutter:${id}`, min, max, surface: 'metal', tag: id });

  const ent: ShutterEntity = {
    id,
    group: g,
    openT: 0,
    opening: false,
    height: h,
    step(dt: number) {
      if (!this.opening || this.openT >= 1) return;
      this.openT = Math.min(1, this.openT + dt / 3.2);
      const lift = this.openT * (h - 0.3);
      meshes.forEach((m, i) => {
        const baseY = y0 + 0.14 + i * 0.28;
        m.position.y = Math.min(y1 - 0.14, baseY + lift);
        m.visible = m.position.y < y1 - 0.1 || i >= slats - 3;
      });
      const newMin = min.clone();
      newMin.y = y0 + lift;
      collision.setDynamic({ id: `shutter:${id}`, min: newMin, max, surface: 'metal', tag: id });
    },
    open() {
      this.opening = true;
    },
    reset() {
      this.opening = false;
      this.openT = 0;
      meshes.forEach((m, i) => {
        m.position.y = y0 + 0.14 + i * 0.28;
        m.visible = true;
      });
      collision.setDynamic({ id: `shutter:${id}`, min, max, surface: 'metal', tag: id });
    },
  };
  return ent;
}

function buildFence(group: THREE.Group, col: (mat: MatId, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, tag?: string, transparent?: boolean) => void): void {
  const mat = plainMat(0x3c444b, 0.5, 0.8);
  const runs: [number, number, number, number][] = [
    [0, 0, 26, 0],   // north
    [0, 0, 0, 6],    // west
    [26, 0, 26, 6],  // east
  ];
  for (const [x0, z0, x1, z1] of runs) {
    const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    const len = alongX ? x1 - x0 : z1 - z0;
    const posts = Math.floor(len / 2.5);
    for (let i = 0; i <= posts; i++) {
      const px = x0 + (alongX ? (i / posts) * len : 0);
      const pz = z0 + (alongX ? 0 : (i / posts) * len);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 0.08), mat);
      post.position.set(px, 1.1, pz);
      post.castShadow = true;
      group.add(post);
    }
    for (const railY of [0.4, 1.2, 2.0]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(alongX ? len : 0.05, 0.06, alongX ? 0.05 : len), mat);
      rail.position.set(x0 + (alongX ? len / 2 : 0), railY, z0 + (alongX ? 0 : len / 2));
      group.add(rail);
    }
    // vertical pickets
    const pickets = Math.floor(len / 0.16);
    const picketGeos: THREE.Mesh[] = [];
    for (let i = 1; i < pickets; i++) {
      const px = x0 + (alongX ? (i / pickets) * len : 0);
      const pz = z0 + (alongX ? 0 : (i / pickets) * len);
      const pk = new THREE.Mesh(new THREE.BoxGeometry(0.025, 2.0, 0.025), mat);
      pk.position.set(px, 1.0, pz);
      picketGeos.push(pk);
      group.add(pk);
    }
    col('metal-panel',
      Math.min(x0, x1) - 0.05, 0, Math.min(z0, z1) - 0.05,
      Math.max(x0, x1) + 0.05, 2.2, Math.max(z0, z1) + 0.05,
      'fence', true);
  }
}

function makeLabel(text: string): THREE.Sprite {
  const { canvas, ctx } = makeCanvas(512, 128);
  ctx.fillStyle = 'rgba(10,14,18,0.72)';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#37d0e6';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 504, 120);
  ctx.fillStyle = '#e8f2f6';
  ctx.font = '600 44px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.toUpperCase(), 256, 64);
  const tex = toTexture(canvas, { repeat: false });
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sprite.scale.set(3.2, 0.8, 1);
  sprite.renderOrder = 50;
  return sprite;
}
