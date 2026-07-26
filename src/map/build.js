import * as THREE from 'three';
import {
  ROOMS, OPENINGS, STAIRS, RAILINGS, VOIDS, FLOOR_Y, roomById,
} from './layout.js';
import * as KIT from './kit.js';
import { MAT, tiled, plainMaterial, clearGlass, frostedGlass, tintedGlass } from '../art/materials.js';
import { PALETTE, SHAPE_LANGUAGE as SL, shade } from '../art/palette.js';
import { SURFACE } from '../physics/world.js';
import { Rng } from '../core/rng.js';
import { assets } from '../core/assets.js';

// ---------------------------------------------------------------------------
// Level builder.  (owner: fable2 geometry / opus1 integration)
//
// Walls are derived from the room rectangles rather than hand-placed, which is
// what guarantees the two hard requirements: no gap can open between rooms, and
// every partition runs to the structural deck so light cannot leak over it.
// ---------------------------------------------------------------------------

const EPS = 1e-4;
const key3 = (v) => Math.round(v * 1000) / 1000;

/** Upper-storey rooms whose slab sits inside a taller ground room's volume. */
function upperRoomsOver(room) {
  if (room.floor !== 'ground' || room.exterior) return [];
  return ROOMS.filter(
    (u) => u.floor === 'upper' && !u.exterior &&
      u.x0 < room.x1 - EPS && u.x1 > room.x0 + EPS &&
      u.z0 < room.z1 - EPS && u.z1 > room.z0 + EPS
  );
}

/**
 * Height of the structural deck above the room's own floor slab.
 *
 * A room may declare `structTop` explicitly, which is how the double-height
 * volumes (lobby atrium, both stair shafts) keep full-height walls even though
 * a mezzanine covers part of their footprint. Otherwise a ground room that is
 * built over stops at the upper floor level, and everything else gets its
 * ceiling plus a plenum.
 */
function structTop(room) {
  const fy = FLOOR_Y[room.floor];
  if (room.exterior) return fy;
  if (room.structTop !== undefined) return room.structTop;
  if (room.floor === 'upper') return fy + room.ceiling + 0.6;
  if (upperRoomsOver(room).length) return FLOOR_Y.upper;
  if (room.ceiling >= 4.2) return fy + room.ceiling + 0.5;
  return fy + room.ceiling + 1.3;
}

/** Rectangles of a ground room that are NOT covered by a mezzanine slab. */
function openSkyRects(room) {
  const covers = upperRoomsOver(room).map((u) => ({ x0: u.x0, z0: u.z0, x1: u.x1, z1: u.z1 }));
  return subtractRects({ x0: room.x0, z0: room.z0, x1: room.x1, z1: room.z1 }, covers);
}

const FLOOR_MATERIALS = {
  snow: () => tiled(MAT.snow, 4),
  tileFloor: () => tiled(MAT.tileFloor, 2.4),
  carpetMain: () => tiled(MAT.carpetMain, 2),
  carpetAccent: () => tiled(MAT.carpetAccent, 2),
  carpetExec: () => tiled(MAT.carpetExec, 2),
  vinyl: () => tiled(MAT.vinyl, 2.4),
  concrete: () => tiled(MAT.concrete, 4),
  concreteSealed: () => tiled(MAT.concreteSealed, 4),
};

const WALL_MATERIALS = {
  wallOffice: () => tiled(MAT.wallOffice, 2.5),
  wallCool: () => tiled(MAT.wallCool, 2.5),
  wallAccent: () => tiled(MAT.wallAccent, 2.5),
  wallService: () => tiled(MAT.wallService, 2.5),
  tileWall: () => tiled(MAT.tileWall, 1.8),
  plaster: () => tiled(MAT.plaster, 2.5),
};

const CEIL_MATERIALS = {
  ceiling: () => MAT.ceiling,
  plasterCeil: () => tiled(MAT.plaster, 3),
  concreteCeil: () => tiled(MAT.concrete, 3),
};

const FLOOR_SURFACE = {
  snow: SURFACE.SNOW,
  tileFloor: SURFACE.TILE,
  carpetMain: SURFACE.CARPET,
  carpetAccent: SURFACE.CARPET,
  carpetExec: SURFACE.CARPET,
  vinyl: SURFACE.TILE,
  concrete: SURFACE.CONCRETE,
  concreteSealed: SURFACE.CONCRETE,
};

const WALL_SURFACE = {
  wallOffice: SURFACE.DRYWALL,
  wallCool: SURFACE.DRYWALL,
  wallAccent: SURFACE.DRYWALL,
  wallService: SURFACE.DRYWALL,
  tileWall: SURFACE.TILE,
  plaster: SURFACE.DRYWALL,
};

/**
 * Derive the wall network from the room rectangles.
 * @returns {Array<{axis:'x'|'z', coord:number, a:number, b:number, floor:string,
 *                  rooms:RoomDef[], exterior:boolean}>}
 */
export function deriveWalls() {
  const groups = new Map();
  for (const r of ROOMS) {
    if (r.exterior) continue;
    const push = (axis, coord, a, b) => {
      const k = `${r.floor}|${axis}|${key3(coord)}`;
      if (!groups.has(k)) groups.set(k, { axis, coord: key3(coord), floor: r.floor, edges: [] });
      groups.get(k).edges.push({ a: key3(Math.min(a, b)), b: key3(Math.max(a, b)), room: r });
    };
    push('z', r.x0, r.z0, r.z1); // west wall  (runs along Z)
    push('z', r.x1, r.z0, r.z1); // east wall
    push('x', r.z0, r.x0, r.x1); // north wall (runs along X)
    push('x', r.z1, r.x0, r.x1); // south wall
  }

  const segments = [];
  for (const g of groups.values()) {
    const cuts = new Set();
    for (const e of g.edges) { cuts.add(e.a); cuts.add(e.b); }
    const sorted = Array.from(cuts).sort((p, q) => p - q);
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      if (b - a < 0.01) continue;
      const mid = (a + b) / 2;
      const rooms = g.edges.filter((e) => e.a <= mid && e.b >= mid).map((e) => e.room);
      if (!rooms.length) continue;
      const uniq = Array.from(new Set(rooms));
      segments.push({
        axis: g.axis,
        coord: g.coord,
        a, b,
        floor: g.floor,
        rooms: uniq,
        exterior: uniq.length === 1,
      });
    }
  }
  return segments;
}

/** Openings that fall on a given wall segment. */
function openingsFor(seg) {
  return OPENINGS.filter((o) => {
    if (o.floor !== seg.floor) return false;
    if (o.axis !== seg.axis) return false;
    if (Math.abs(o.coord - seg.coord) > 0.02) return false;
    return o.at - o.width / 2 >= seg.a - 0.15 && o.at + o.width / 2 <= seg.b + 0.15;
  });
}

export class LevelBuild {
  constructor(collision) {
    this.collision = collision;
    this.group = new THREE.Group();
    this.group.name = 'NorthstarAdministrativeCenter';
    this.rng = new Rng('northstar-level');
    /** @type {Map<string, object>} */
    this.doorSpecs = new Map();
    /** @type {Array<object>} */
    this.glassPanes = [];
    /** @type {Array<object>} */
    this.lightSpecs = [];
    this.wallSegments = [];
    this.navBlockers = [];
    this.stats = { meshes: 0, colliders: 0 };
  }

  addMesh(m, { collide = true, surface = SURFACE.DRYWALL, tag = '', blocksSight = true, assetId = null } = {}) {
    this.group.add(m);
    this.stats.meshes++;
    if (collide) {
      m.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(m);
      this.collision.add({
        min: bb.min.toArray(),
        max: bb.max.toArray(),
        surface, tag, blocksSight, ref: m,
      });
      this.stats.colliders++;
    }
    if (assetId) assets.tag(m, assetId);
    return m;
  }

  build() {
    this.buildFloorsAndCeilings();
    this.buildWalls();
    this.buildStairs();
    this.buildRailings();
    this.buildExteriorShell();
    return this;
  }

  // ------------------------------------------------------------------ slabs
  buildFloorsAndCeilings() {
    for (const room of ROOMS) {
      const fy = FLOOR_Y[room.floor];
      const w = room.x1 - room.x0;
      const d = room.z1 - room.z0;
      const cx = (room.x0 + room.x1) / 2;
      const cz = (room.z0 + room.z1) / 2;

      // --- floor slab ---
      const voidsHere = VOIDS.filter(
        (v) => v.floor === room.floor && v.x0 < room.x1 - EPS && v.x1 > room.x0 + EPS && v.z0 < room.z1 - EPS && v.z1 > room.z0 + EPS
      );
      const floorMat = (FLOOR_MATERIALS[room.floorMat] || FLOOR_MATERIALS.concrete)();
      const rects = subtractRects({ x0: room.x0, z0: room.z0, x1: room.x1, z1: room.z1 }, voidsHere);
      for (const rect of rects) {
        const rw = rect.x1 - rect.x0;
        const rd = rect.z1 - rect.z0;
        if (rw < 0.05 || rd < 0.05) continue;
        const thickness = room.exterior ? 0.5 : 0.3;
        const geo = KIT.box(rw, thickness, rd);
        KIT.applyBoxUV(geo, 1);
        const slab = KIT.mesh(geo, floorMat, { cast: false, receive: true, name: `floor-${room.id}` });
        slab.position.set((rect.x0 + rect.x1) / 2, fy - thickness / 2, (rect.z0 + rect.z1) / 2);
        this.addMesh(slab, {
          surface: FLOOR_SURFACE[room.floorMat] || SURFACE.CONCRETE,
          tag: `floor:${room.id}`,
          assetId: room.exterior ? 'ARCH-FLOOR-SNOW' : floorAssetId(room.floorMat),
        });
      }

      if (room.exterior) continue;

      // --- suspended ceiling or hard ceiling ---
      // A double-height room only gets a ceiling where a mezzanine slab is not
      // already acting as its soffit, so the lobby's 7 m plaster ceiling never
      // cuts through the executive gallery floor.
      const ceilY = fy + room.ceiling;
      const ceilRects = room.structTop !== undefined ? openSkyRects(room) : [{ x0: room.x0, z0: room.z0, x1: room.x1, z1: room.z1 }];
      for (const rect of ceilRects) {
        const rw = rect.x1 - rect.x0;
        const rd = rect.z1 - rect.z0;
        if (rw < 0.3 || rd < 0.3) continue;
        const rcx = (rect.x0 + rect.x1) / 2;
        const rcz = (rect.z0 + rect.z1) / 2;
        if (room.ceilMat === 'ceiling') {
          const grid = KIT.ceilingGrid({
            width: rw - 0.02, depth: rd - 0.02,
            tileMat: MAT.ceiling, stainedMat: MAT.ceilingStained,
            gridMat: plainMaterial(0xd8d8d2, { roughness: 0.55, metalness: 0.3 }, 'tbar'),
            rng: this.rng,
            missing: room.id === 'servicecorr' ? [[3, 1]] : room.id === 'copyroom' ? [[2, 2]] : [],
            stained: room.id === 'restrooms' ? [[1, 1], [2, 3]] : room.id === 'janitor' ? [[0, 1]] : [],
          });
          grid.position.set(rcx, ceilY, rcz);
          this.group.add(grid);
          assets.tag(grid, 'ARCH-CEIL-GRID');
          this.stats.meshes += grid.children.length;
        } else if (room.ceilMat) {
          const cm = (CEIL_MATERIALS[room.ceilMat] || CEIL_MATERIALS.plasterCeil)();
          const geo = KIT.box(rw, 0.08, rd);
          KIT.applyBoxUV(geo, 1);
          const ceil = KIT.mesh(geo, cm, { cast: false, receive: true, name: `ceil-${room.id}` });
          ceil.position.set(rcx, ceilY + 0.04, rcz);
          this.group.add(ceil);
          assets.tag(ceil, room.ceilMat === 'concreteCeil' ? 'ARCH-CEIL-CONCRETE' : 'ARCH-CEIL-PLASTER');
          this.stats.meshes++;
        }
      }

      // --- structural deck above ---
      // Only rooms that are the topmost volume over their footprint get a deck.
      // A ground room built over is already capped by the upper storey's floor
      // slab; adding a deck there would put a solid box on top of the finished
      // mezzanine floor and make the upper storey impossible to walk on.
      const top = structTop(room);
      const deckRects = room.floor === 'ground' ? openSkyRects(room) : [{ x0: room.x0, z0: room.z0, x1: room.x1, z1: room.z1 }];
      for (const rect of deckRects) {
        if (rect.x1 - rect.x0 < 0.2 || rect.z1 - rect.z0 < 0.2) continue;
        // Never lay a deck across a stair shaft.
        for (const sub of subtractRects(rect, voidsHere)) {
          if (sub.x1 - sub.x0 < 0.2 || sub.z1 - sub.z0 < 0.2) continue;
          this.collision.add({
            min: [sub.x0, top, sub.z0],
            max: [sub.x1, top + 0.32, sub.z1],
            surface: SURFACE.CONCRETE, tag: `deck:${room.id}`, blocksSight: true,
          });
          // Visible deck only where no suspended ceiling is hiding it.
          if (room.ceilMat !== 'ceiling' && Math.abs(top - (ceilY + 0.04)) > 0.2) {
            const geo = KIT.box(sub.x1 - sub.x0, 0.3, sub.z1 - sub.z0);
            KIT.applyBoxUV(geo, 1.5);
            const deck = KIT.mesh(geo, tiled(MAT.concrete, 3), { cast: false, receive: true });
            deck.position.set((sub.x0 + sub.x1) / 2, top + 0.15, (sub.z0 + sub.z1) / 2);
            this.group.add(deck);
          }
        }
      }
    }
  }

  // ------------------------------------------------------------------ walls
  buildWalls() {
    const segs = deriveWalls();
    this.wallSegments = segs;
    for (const seg of segs) {
      const length = seg.b - seg.a;
      if (length < 0.02) continue;
      const primary = seg.rooms[0];
      const fy = FLOOR_Y[seg.floor];
      const top = Math.max(...seg.rooms.map(structTop));
      const height = top - fy;
      if (height <= 0.05) continue;

      const ops = openingsFor(seg);
      const matKeyA = primary.wallMat;
      const matA = (WALL_MATERIALS[matKeyA] || WALL_MATERIALS.wallOffice)();
      const thickness = seg.exterior ? 0.24 : SL.wallThickness;

      const localOps = ops.map((o) => ({
        x: o.at - seg.a,
        width: o.width + 0.0,
        sill: o.sill,
        head: Math.min(o.head, height - 0.02),
        spec: o,
      }));

      const wall = KIT.wallWithOpenings({
        length,
        height,
        thickness,
        material: matA,
        openings: localOps,
        baseboard: !seg.exterior && primary.wallMat !== 'tileWall',
        baseboardMat: plainMaterial(shade(PALETTE.drywallCool, 0.55), { roughness: 0.5 }, 'baseboard'),
        metresPerTile: 2.5,
      });

      const cx = seg.axis === 'z' ? seg.coord : (seg.a + seg.b) / 2;
      const cz = seg.axis === 'z' ? (seg.a + seg.b) / 2 : seg.coord;
      wall.position.set(cx, fy, cz);
      if (seg.axis === 'z') wall.rotation.y = Math.PI / 2;
      this.group.add(wall);
      assets.tag(wall, seg.exterior ? 'ARCH-WALL-EXT' : 'ARCH-WALL-STRAIGHT');

      // Second-side skin where the neighbouring room uses another finish.
      if (seg.rooms.length > 1) {
        const other = seg.rooms.find((r) => r.wallMat !== matKeyA);
        if (other) {
          const skinMat = (WALL_MATERIALS[other.wallMat] || WALL_MATERIALS.wallOffice)();
          const skin = KIT.wallWithOpenings({
            length,
            height,
            thickness: 0.016,
            material: skinMat,
            openings: localOps,
            baseboard: false,
            metresPerTile: 2.5,
          });
          const sign = otherSideSign(seg, other);
          skin.position.set(cx, fy, cz);
          if (seg.axis === 'z') {
            skin.rotation.y = Math.PI / 2;
            skin.position.x += sign * (thickness / 2 + 0.009);
          } else {
            skin.position.z += sign * (thickness / 2 + 0.009);
          }
          this.group.add(skin);
        }
      }

      // Collision for each solid piece of the wall.
      wall.updateMatrixWorld(true);
      const surface = WALL_SURFACE[matKeyA] || SURFACE.DRYWALL;
      wall.traverse((child) => {
        if (!child.isMesh) return;
        const bb = new THREE.Box3().setFromObject(child);
        // Fatten paper-thin bounds so bullets and capsules never tunnel.
        if (bb.max.x - bb.min.x < 0.02) { bb.min.x -= 0.01; bb.max.x += 0.01; }
        if (bb.max.z - bb.min.z < 0.02) { bb.min.z -= 0.01; bb.max.z += 0.01; }
        this.collision.add({
          min: bb.min.toArray(), max: bb.max.toArray(),
          surface, tag: `wall:${primary.id}`, blocksSight: true,
        });
        this.stats.colliders++;
      });

      // Trims, doors and glazing for each opening.
      for (const o of ops) this.buildOpening(seg, o, thickness, fy, height);
    }
  }

  buildOpening(seg, o, wallThickness, fy, wallHeight) {
    const isZ = seg.axis === 'z';
    const px = isZ ? seg.coord : o.at;
    const pz = isZ ? o.at : seg.coord;
    const rotY = isZ ? Math.PI / 2 : 0;
    const frameMat = o.type === 'shutter' ? MAT.metalPainted : plainMaterial(shade(PALETTE.drywallCool, 0.72), { roughness: 0.45 }, 'frame');

    if (o.type === 'door' || o.type === 'doubledoor') {
      const frame = KIT.doorFrame({
        width: o.width, height: o.head, wallThickness,
        material: frameMat,
        thresholdMat: plainMaterial(PALETTE.aluminum, { roughness: 0.35, metalness: 0.8 }, 'threshold'),
      });
      frame.position.set(px, fy, pz);
      frame.rotation.y = rotY;
      this.group.add(frame);
      assets.tag(frame, 'ARCH-DOORFRAME');
      this.doorSpecs.set(o.door, {
        id: o.door, opening: o, x: px, z: pz, y: fy, rotY,
        width: o.width, height: o.head,
        double: o.type === 'doubledoor',
        glass: !!o.glass, security: !!o.security, fire: !!o.fire,
        axis: seg.axis, rooms: seg.rooms.map((r) => r.id),
      });
    } else if (o.type === 'shutter') {
      this.doorSpecs.set(o.door, {
        id: o.door, opening: o, x: px, z: pz, y: fy, rotY,
        width: o.width, height: o.head, shutter: true,
        axis: seg.axis, rooms: seg.rooms.map((r) => r.id),
      });
    } else if (o.type === 'window' || o.type === 'interiorwindow' || o.type === 'glasswall') {
      const h = o.head - o.sill;
      const frame = KIT.windowFrame({
        width: o.width, height: h, wallThickness,
        material: o.type === 'window'
          ? plainMaterial(PALETTE.aluminum, { roughness: 0.4, metalness: 0.85 }, 'winframe')
          : plainMaterial(shade(PALETTE.drywallCool, 0.6), { roughness: 0.35, metalness: 0.4 }, 'intwinframe'),
        mullions: o.width > 3 ? 2 : o.width > 1.6 ? 1 : 0,
        sillMat: plainMaterial(shade(PALETTE.drywallWarm, 0.92), { roughness: 0.5 }, 'stool'),
      });
      frame.position.set(px, fy + o.sill, pz);
      frame.rotation.y = rotY;
      this.group.add(frame);
      assets.tag(frame, o.type === 'window' ? 'ARCH-WINDOWFRAME' : 'ARCH-INTWINFRAME');

      const glassMat =
        o.glassKind === 'frosted' ? frostedGlass()
          : o.glassKind === 'tinted' ? tintedGlass()
            : clearGlass();
      const pane = KIT.mesh(KIT.plane(o.width - 0.02, h - 0.02), glassMat, { cast: false, receive: false });
      pane.position.set(px, fy + o.sill + h / 2, pz);
      pane.rotation.y = rotY;
      pane.renderOrder = 5;
      this.group.add(pane);
      assets.tag(pane, glassAssetId(o.glassKind));

      const paneCollider = this.collision.add({
        min: [px - (isZ ? 0.03 : o.width / 2), fy + o.sill, pz - (isZ ? o.width / 2 : 0.03)],
        max: [px + (isZ ? 0.03 : o.width / 2), fy + o.head, pz + (isZ ? o.width / 2 : 0.03)],
        surface: SURFACE.GLASS, tag: `glass:${o.id}`, blocksSight: false,
      });
      this.glassPanes.push({
        id: o.id, mesh: pane, frame, collider: paneCollider, broken: false,
        width: o.width, height: h, center: new THREE.Vector3(px, fy + o.sill + h / 2, pz),
        rotY, kind: o.glassKind || 'clear',
      });

      // Blinds above interior-facing exterior windows.
      if (o.type === 'window' && o.glassKind !== 'frosted' && o.width >= 2) {
        const blinds = this.buildBlinds(o.width, h, this.rng.float() < 0.5 ? 0.35 : 0.85);
        blinds.position.set(px, fy + o.head, pz);
        blinds.rotation.y = rotY;
        const inwardSign = seg.exterior ? interiorSign(seg) : 1;
        if (isZ) blinds.position.x += inwardSign * 0.1;
        else blinds.position.z += inwardSign * 0.1;
        this.group.add(blinds);
        assets.tag(blinds, 'ARCH-BLINDS');
      }
    } else if (o.type === 'arch') {
      // Cased opening: a light reveal so the aperture reads as built, not cut.
      const casing = new THREE.Group();
      const cm = plainMaterial(shade(PALETTE.drywallCool, 0.78), { roughness: 0.5 }, 'casing');
      for (const side of [-1, 1]) {
        const j = KIT.mesh(KIT.bevelBox(0.05, o.head, wallThickness + 0.02, 0.005), cm);
        j.position.set(side * (o.width / 2 + 0.025), o.head / 2, 0);
        casing.add(j);
      }
      const head = KIT.mesh(KIT.bevelBox(o.width + 0.1, 0.05, wallThickness + 0.02, 0.005), cm);
      head.position.set(0, o.head + 0.025, 0);
      casing.add(head);
      casing.position.set(px, fy, pz);
      casing.rotation.y = rotY;
      this.group.add(casing);
      assets.tag(casing, 'ARCH-CASED-OPENING');
    }
  }

  buildBlinds(width, height, closed) {
    const g = new THREE.Group();
    const mat = plainMaterial(0xd9d6cc, { roughness: 0.72, metalness: 0.05 }, 'blindslat');
    const headrail = KIT.mesh(KIT.bevelBox(width, 0.055, 0.06, 0.004), plainMaterial(0xc9c6bc, { roughness: 0.5 }, 'headrail'));
    headrail.position.y = -0.03;
    g.add(headrail);
    const drop = height * closed;
    const slats = Math.max(1, Math.floor(drop / 0.055));
    for (let i = 0; i < slats; i++) {
      const s = KIT.mesh(KIT.box(width - 0.03, 0.004, 0.05), mat, { cast: false });
      s.position.set(0, -0.07 - i * (drop / slats), 0);
      s.rotation.x = 0.42;
      g.add(s);
    }
    return g;
  }

  // ----------------------------------------------------------------- stairs
  buildStairs() {
    for (const s of STAIRS) {
      const room = roomById(s.room);
      const fy = FLOOR_Y[s.fromFloor];
      const treadMat = s.railing === 'glass' ? tiled(MAT.woodDesk, 1) : tiled(MAT.concreteSealed, 1.5);
      const riserMat = plainMaterial(shade(PALETTE.drywallCool, 0.8), { roughness: 0.6 }, 'riser');
      const run = KIT.stairRun({
        width: s.width, rise: s.rise, run: s.run, steps: s.steps,
        treadMat, riserMat,
        stringerMat: plainMaterial(PALETTE.paintedMetal, { roughness: 0.45, metalness: 0.7 }, 'stringer'),
      });
      run.position.set(s.x, fy, s.zBottom);
      this.group.add(run);
      assets.tag(run, 'ARCH-STAIR-RUN');

      // Collision: one box per step (cheap and exactly right for step-up).
      for (let i = 0; i < s.steps; i++) {
        const y = fy + s.rise * (i + 1);
        const z = s.zBottom - s.run * i - s.run / 2;
        this.collision.add({
          min: [s.x - s.width / 2, y - s.rise, z - s.run / 2 - 0.02],
          max: [s.x + s.width / 2, y, z + s.run / 2 + 0.02],
          surface: SURFACE.WOOD, tag: `stair:${s.id}`, blocksSight: false,
        });
      }

      // The landing at the head of each flight comes from the stair-head room's
      // own floor slab: the stair shaft VOID in layout.js stops exactly at the
      // top tread, so the slab already fills the space in front of it. Emitting
      // a second coplanar landing here would z-fight against it.
      const topY = fy + s.rise * s.steps;

      // Balustrade following the flight.
      const railMat = plainMaterial(PALETTE.stainless, { roughness: 0.28, metalness: 0.9 }, 'stairrail');
      for (const side of [-1, 1]) {
        const rl = Math.hypot(s.run * s.steps, s.rise * s.steps);
        const rail = KIT.railing({
          length: rl, height: 1.02, postSpacing: 0.9, material: railMat,
          glass: s.railing === 'glass', glassMat: clearGlass(0xcfe0ea, 0.1),
        });
        rail.position.set(s.x + side * (s.width / 2 - 0.02), fy + (s.rise * s.steps) / 2 + 0.1, s.zBottom - (s.run * s.steps) / 2);
        rail.rotation.y = Math.PI / 2;
        rail.rotation.z = -Math.atan2(s.rise * s.steps, s.run * s.steps);
        this.group.add(rail);
        assets.tag(rail, 'ARCH-RAILING');
        this.collision.add({
          min: [s.x + side * (s.width / 2) - 0.06, fy, s.zBottom - s.run * s.steps],
          max: [s.x + side * (s.width / 2) + 0.06, topY + 1.0, s.zBottom],
          surface: SURFACE.METAL, tag: `stairrail:${s.id}`, blocksSight: false,
        });
      }
      s._topY = topY;
    }
  }

  buildRailings() {
    for (const r of RAILINGS) {
      const fy = FLOOR_Y[r.floor];
      const len = Math.hypot(r.x1 - r.x0, r.z1 - r.z0);
      const mat = plainMaterial(PALETTE.stainless, { roughness: 0.3, metalness: 0.9 }, 'rail');
      const rail = KIT.railing({
        length: len, height: 1.07, postSpacing: 1.3, material: mat,
        glass: r.glass, glassMat: clearGlass(0xd0e2ec, 0.1),
      });
      rail.position.set((r.x0 + r.x1) / 2, fy, (r.z0 + r.z1) / 2);
      rail.rotation.y = Math.atan2(r.x1 - r.x0, r.z1 - r.z0) + Math.PI / 2;
      this.group.add(rail);
      assets.tag(rail, 'ARCH-RAILING');
      const isX = Math.abs(r.x1 - r.x0) > Math.abs(r.z1 - r.z0);
      this.collision.add({
        min: [Math.min(r.x0, r.x1) - (isX ? 0 : 0.07), fy, Math.min(r.z0, r.z1) - (isX ? 0.07 : 0)],
        max: [Math.max(r.x0, r.x1) + (isX ? 0 : 0.07), fy + 1.1, Math.max(r.z0, r.z1) + (isX ? 0.07 : 0)],
        surface: SURFACE.METAL, tag: `railing:${r.id}`, blocksSight: false,
      });
    }
  }

  // -------------------------------------------------------- exterior shell
  buildExteriorShell() {
    // Roof caps so the sky never leaks into an interior room.
    const roofMat = tiled(MAT.concrete, 4);
    for (const room of ROOMS) {
      if (room.exterior) continue;
      const top = structTop(room);
      // A ground room that is built over is roofed by the storey above; only
      // the parts of its footprint open to the sky need a cap.
      const rects = room.floor === 'ground' ? openSkyRects(room) : [{ x0: room.x0, z0: room.z0, x1: room.x1, z1: room.z1 }];
      for (const rect of rects) {
        const w = rect.x1 - rect.x0;
        const d = rect.z1 - rect.z0;
        if (w < 0.3 || d < 0.3) continue;
        const rcx = (rect.x0 + rect.x1) / 2;
        const rcz = (rect.z0 + rect.z1) / 2;
        const geo = KIT.box(w + 0.3, 0.34, d + 0.3);
        KIT.applyBoxUV(geo, 2);
        const roof = KIT.mesh(geo, roofMat, { cast: true, receive: true });
        roof.position.set(rcx, top + 0.17, rcz);
        this.group.add(roof);
        assets.tag(roof, 'ARCH-ROOF-EDGE');
        // Parapet on the tallest volumes, visible from the courtyard.
        if (top > 6) {
          for (const [dx, dz, sw, sd] of [
            [0, -d / 2 - 0.15, w + 0.4, 0.16],
            [0, d / 2 + 0.15, w + 0.4, 0.16],
            [-w / 2 - 0.15, 0, 0.16, d + 0.4],
            [w / 2 + 0.15, 0, 0.16, d + 0.4],
          ]) {
            const p = KIT.mesh(KIT.bevelBox(sw, 0.55, sd, 0.01), roofMat);
            p.position.set(rcx + dx, top + 0.34 + 0.275, rcz + dz);
            this.group.add(p);
          }
        }
      }
    }
  }
}

// --------------------------------------------------------------- helpers ---

function otherSideSign(seg, otherRoom) {
  if (seg.axis === 'z') return otherRoom.x1 <= seg.coord + EPS ? -1 : 1;
  return otherRoom.z1 <= seg.coord + EPS ? -1 : 1;
}

function interiorSign(seg) {
  const room = seg.rooms[0];
  if (seg.axis === 'z') return room.x1 <= seg.coord + EPS ? -1 : 1;
  return room.z1 <= seg.coord + EPS ? -1 : 1;
}

function floorAssetId(matKey) {
  if (matKey.startsWith('carpet')) return 'ARCH-FLOOR-CARPET';
  if (matKey === 'tileFloor') return 'ARCH-FLOOR-TILE';
  if (matKey === 'vinyl') return 'ARCH-FLOOR-VINYL';
  return 'ARCH-FLOOR-CONCRETE';
}

function glassAssetId(kind) {
  if (kind === 'frosted') return 'GLASS-FROSTED';
  if (kind === 'tinted') return 'GLASS-TINTED';
  return 'GLASS-CLEAR';
}

/** Subtract void rectangles from a rectangle, returning the remainder strips. */
function subtractRects(rect, voids) {
  let rects = [rect];
  for (const v of voids) {
    const next = [];
    for (const r of rects) {
      const ix0 = Math.max(r.x0, v.x0);
      const ix1 = Math.min(r.x1, v.x1);
      const iz0 = Math.max(r.z0, v.z0);
      const iz1 = Math.min(r.z1, v.z1);
      if (ix0 >= ix1 - EPS || iz0 >= iz1 - EPS) { next.push(r); continue; }
      if (r.z0 < iz0 - EPS) next.push({ x0: r.x0, z0: r.z0, x1: r.x1, z1: iz0 });
      if (iz1 < r.z1 - EPS) next.push({ x0: r.x0, z0: iz1, x1: r.x1, z1: r.z1 });
      if (r.x0 < ix0 - EPS) next.push({ x0: r.x0, z0: iz0, x1: ix0, z1: iz1 });
      if (ix1 < r.x1 - EPS) next.push({ x0: ix1, z0: iz0, x1: r.x1, z1: iz1 });
    }
    rects = next;
  }
  return rects;
}

export { structTop };
