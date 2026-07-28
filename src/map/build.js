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

/**
 * How much of the top of a stair flight is left without a balustrade so the
 * player can step sideways onto the landing. Must exceed a player capsule
 * diameter (0.66 m) with room to manoeuvre.
 */
const STAIR_HEAD_GAP = 0.95;

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
    /** Head/foot landing clearance per flight, for the traversal regression. */
    this.stairClearances = [];
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
    this.buildServices();
    this.buildExteriorShell();
    return this;
  }

  /**
   * Building services: the ductwork, pipework, containment and drainage that
   * make the back of house read as a real building rather than empty rooms.
   * Placed where they would actually run — above the open plenum in the service
   * corridor, through the mechanical room, along the server room's hot aisle,
   * and across the loading bay soffit — and at heights that keep them clear of
   * a standing player.
   */
  buildServices() {
    const galv = plainMaterial(shade(PALETTE.aluminum, 0.94), { roughness: 0.52, metalness: 0.8 }, 'galv');
    const pipeRed = plainMaterial(0x8c3b30, { roughness: 0.55, metalness: 0.4 }, 'pipe-fire');
    const pipeGrey = plainMaterial(shade(PALETTE.paintedMetal, 1.05), { roughness: 0.5, metalness: 0.55 }, 'pipe-svc');
    const trayMat = plainMaterial(0x6d7278, { roughness: 0.55, metalness: 0.7 }, 'tray');
    const cableMat = plainMaterial(0x1d2024, { roughness: 0.78, metalness: 0 }, 'cable');
    const castIron = plainMaterial(0x3b3d3f, { roughness: 0.72, metalness: 0.5 }, 'castiron');
    const panelMat = plainMaterial(shade(PALETTE.paintedMetal, 1.1), { roughness: 0.46, metalness: 0.6 }, 'accesspanel');
    const screwMat = plainMaterial(0x8d9196, { roughness: 0.35, metalness: 0.9 }, 'screw');

    const place = (obj, x, y, z, rotY = 0, assetId = null, collide = false, surface = SURFACE.METAL) => {
      obj.position.set(x, y, z);
      obj.rotation.y = rotY;
      this.group.add(obj);
      if (assetId) assets.tag(obj, assetId);
      if (collide) {
        obj.updateMatrixWorld(true);
        const bb = new THREE.Box3().setFromObject(obj);
        this.collision.add({ min: bb.min.toArray(), max: bb.max.toArray(), surface, tag: 'service', blocksSight: false });
      }
      return obj;
    };

    // --- service corridor: duct + conduit above the ceiling line -----------
    place(KIT.ductRun({ length: 26, w: 0.5, h: 0.35, material: galv }), 0, 2.32, 16.4, 0, 'ARCH-DUCT');
    place(KIT.pipeRun({ length: 26, r: 0.055, material: pipeRed }), 0, 2.42, 17.3, 0, 'ARCH-PIPE');
    place(KIT.pipeRun({ length: 26, r: 0.04, material: pipeGrey }), 0, 2.22, 17.5, 0, 'ARCH-PIPE');
    place(KIT.cableTray({ length: 26, w: 0.32, material: trayMat, cableMat }), 0, 2.46, 15.9, 0, 'ARCH-CABLETRAY');

    // --- mechanical room: the plant it is named after ----------------------
    place(KIT.ductRun({ length: 4.6, w: 0.7, h: 0.5, material: galv }), 9.5, 2.85, 12.0, 0, 'ARCH-DUCT');
    place(KIT.ductRun({ length: 3.6, w: 0.45, h: 0.35, material: galv }), 9.5, 2.85, 14.6, Math.PI / 2, 'ARCH-DUCT');
    place(KIT.pipeRun({ length: 4.6, r: 0.07, material: pipeRed }), 9.5, 3.05, 11.4, 0, 'ARCH-PIPE');
    place(KIT.pipeRun({ length: 4.4, r: 0.05, material: pipeGrey }), 9.5, 0.55, 15.2, 0, 'ARCH-PIPE', true);
    place(KIT.floorDrain(castIron), 9.5, 0.011, 13.6, 0, 'ARCH-FLOORDRAIN');

    // --- server room: containment over the hot aisle -----------------------
    place(KIT.cableTray({ length: 5.6, w: 0.32, material: trayMat, cableMat }), 4.0, 2.5, 12.4, 0, 'ARCH-CABLETRAY');
    place(KIT.cableTray({ length: 4.2, w: 0.24, material: trayMat, cableMat }), 4.0, 2.5, 14.2, 0, 'ARCH-CABLETRAY');
    place(KIT.ductRun({ length: 5.6, w: 0.55, h: 0.4, material: galv }), 4.0, 2.42, 13.3, 0, 'ARCH-DUCT');

    // --- loading bay and garage: high-level services ------------------------
    place(KIT.ductRun({ length: 10.4, w: 0.6, h: 0.45, material: galv }), 17.0, 4.05, 12.5, Math.PI / 2, 'ARCH-DUCT');
    place(KIT.pipeRun({ length: 10.4, r: 0.06, material: pipeRed }), 17.0, 4.25, 11.4, Math.PI / 2, 'ARCH-PIPE');
    place(KIT.floorDrain(castIron), 17.2, 0.011, 15.4, 0, 'ARCH-FLOORDRAIN');
    place(KIT.ductRun({ length: 10.4, w: 0.5, h: 0.4, material: galv }), 23.5, 4.05, 12.5, Math.PI / 2, 'ARCH-DUCT');
    place(KIT.floorDrain(castIron), 23.5, 0.011, 12.5, 0, 'ARCH-FLOORDRAIN');

    // --- copy room: the run exposed by the missing ceiling tile ------------
    place(KIT.ductRun({ length: 5.6, w: 0.4, h: 0.3, material: galv }), -8.2, 2.62, 13.2, 0, 'ARCH-DUCT');
    place(KIT.cableTray({ length: 5.6, w: 0.24, material: trayMat, cableMat }), -8.2, 2.66, 12.5, 0, 'ARCH-CABLETRAY');

    // --- janitor closet, restrooms: drainage and stacks --------------------
    place(KIT.floorDrain(castIron), -12.75, 0.011, 12.6, 0, 'ARCH-FLOORDRAIN');
    place(KIT.pipeRun({ length: 2.4, r: 0.045, material: pipeGrey }), -12.75, 2.35, 13.7, 0, 'ARCH-PIPE');
    place(KIT.floorDrain(castIron), -20.6, 0.011, 9.4, 0, 'ARCH-FLOORDRAIN');

    // --- access panels on back-of-house walls ------------------------------
    for (const [x, y, z, r] of [
      [-6.0, 1.35, 15.42, 0], [6.0, 1.35, 15.42, 0], [11.9, 1.35, 13.0, Math.PI / 2],
      [-13.9, 1.35, 12.4, Math.PI / 2], [11.1, 1.35, -6.0, Math.PI / 2],
      [-19.1, 5.35, -5.0, Math.PI / 2],
    ]) {
      place(KIT.accessPanel({ w: 0.5, h: 0.5, material: panelMat, screwMat }), x, y, z, r, 'ARCH-ACCESS-PANEL');
    }

    // --- loading dock: edge, nosing and bumpers ----------------------------
    const dock = new THREE.Group();
    const deckMat = tiled(MAT.concrete, 2);
    const dockDeck = KIT.mesh(KIT.bevelBox(5.6, 1.1, 2.2, 0.02), deckMat);
    dockDeck.position.set(0, 0.55, 0);
    dock.add(dockDeck);
    const nosing = KIT.mesh(KIT.bevelBox(5.7, 0.09, 0.1, 0.008), plainMaterial(0x53585d, { roughness: 0.45, metalness: 0.8 }, 'docknosing'));
    nosing.position.set(0, 1.06, -1.14);
    dock.add(nosing);
    for (const bx of [-2.0, 0, 2.0]) {
      const bump = KIT.mesh(KIT.bevelBox(0.34, 0.42, 0.12, 0.012), MAT.rubber);
      bump.position.set(bx, 0.62, -1.17);
      dock.add(bump);
    }
    // Steps up onto the dock so it is climbable in a way that matches its look.
    for (let i = 0; i < 5; i++) {
      const st = KIT.mesh(KIT.bevelBox(1.2, 0.22, 0.3, 0.01), deckMat);
      st.position.set(-2.2, 0.11 + i * 0.22, -1.25 - 0.3 * (4 - i));
      dock.add(st);
    }
    // Sits against the south face of the conference wall with its steps fully
    // inside the loading bay, clear of the door from the cross corridor.
    place(dock, 17.2, 0, 9.9, 0, 'ARCH-LOADING-DOCK', true, SURFACE.CONCRETE);

    // --- atrium columns ----------------------------------------------------
    // The lobby spans 22 m with a 7 m ceiling; a pair of full-height columns
    // gives the volume scale, breaks the sightline from the vestibule doors to
    // the office doors, and provides the only hard cover in the room.
    for (const cx of [-6.4, 6.4]) {
      const col = KIT.column({
        size: 0.5, height: 7.0,
        material: tiled(MAT.wallCool, 2),
        capMat: plainMaterial(shade(PALETTE.drywallCool, 0.7), { roughness: 0.45 }, 'colcap'),
      });
      place(col, cx, 0, -3.2, 0, 'ARCH-COLUMN', true, SURFACE.DRYWALL);
    }

    // --- half walls: the waiting-area screen and the lobby entry baffle ----
    const halfMat = tiled(MAT.wallOffice, 2);
    const capMat = plainMaterial(shade(PALETTE.woodVeneer, 1.05), { roughness: 0.4 }, 'halfwallcap');
    for (const [x, z, len, rotY] of [[-14.6, -3.4, 4.4, 0], [-2.6, -7.4, 3.2, Math.PI / 2]]) {
      const hw = new THREE.Group();
      const body = KIT.mesh(KIT.bevelBox(len, 1.05, 0.12, 0.008), halfMat);
      body.position.y = 0.525;
      hw.add(body);
      const cap = KIT.mesh(KIT.bevelBox(len + 0.06, 0.04, 0.2, 0.006), capMat);
      cap.position.y = 1.07;
      hw.add(cap);
      place(hw, x, 0, z, rotY, 'ARCH-HALFWALL', true, SURFACE.DRYWALL);
    }
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

    // Ground walls belonging to a double-height room (explicit `structTop`) run
    // to 7.5 m, which is correct over the atrium but wrong wherever the
    // mezzanine sits above: the tall ground wall would run straight through the
    // upper storey and seal the openings punched in the upper wall on the same
    // line. So for every ground segment we cap the height at the mezzanine
    // level across the spans where an upper wall exists on the same axis and
    // coordinate, and keep the full height only where the space above is open.
    const upperSegs = segs.filter((s) => s.floor === 'upper');
    const expanded = [];
    for (const seg of segs) {
      const top = Math.max(...seg.rooms.map(structTop));
      if (seg.floor !== 'ground' || top <= FLOOR_Y.upper + 0.05) {
        expanded.push({ ...seg, top });
        continue;
      }
      // The cap only changes the band above 4 m, which is well clear of every
      // aperture, so a split point may be slid sideways freely — and it must be,
      // because a split falling inside a doorway would leave the opening
      // straddling two sub-spans, belonging to neither, and silently walled up.
      const groundOps = OPENINGS.filter(
        (o) => o.floor === seg.floor && o.axis === seg.axis && Math.abs(o.coord - seg.coord) < 0.02
      ).map((o) => [o.at - o.width / 2 - 0.2, o.at + o.width / 2 + 0.2]);
      const snapCut = (v) => {
        for (const [l, r] of groundOps) {
          if (v > l && v < r) return v - l < r - v ? l : r;
        }
        return v;
      };

      const overlaps = upperSegs
        .filter((u) => u.axis === seg.axis && Math.abs(u.coord - seg.coord) < 0.02)
        .map((u) => [
          Math.min(Math.max(snapCut(Math.max(u.a, seg.a)), seg.a), seg.b),
          Math.max(Math.min(snapCut(Math.min(u.b, seg.b)), seg.b), seg.a),
        ])
        .filter(([a, b]) => b - a > 0.02)
        .sort((p, q) => p[0] - q[0]);
      if (!overlaps.length) {
        expanded.push({ ...seg, top });
        continue;
      }
      let cursor = seg.a;
      for (const [a, b] of overlaps) {
        if (b <= cursor + 0.02) continue;
        if (a > cursor + 0.02) expanded.push({ ...seg, a: cursor, b: a, top });
        expanded.push({ ...seg, a: Math.max(cursor, a), b, top: FLOOR_Y.upper });
        cursor = Math.max(cursor, b);
      }
      if (seg.b > cursor + 0.02) expanded.push({ ...seg, a: cursor, b: seg.b, top });
    }

    for (const seg of expanded) {
      const length = seg.b - seg.a;
      if (length < 0.02) continue;
      const primary = seg.rooms[0];
      const fy = FLOOR_Y[seg.floor];
      const top = seg.top;
      const height = top - fy;
      if (height <= 0.05) continue;

      const ops = openingsFor(seg);
      const matKeyA = primary.wallMat;
      const matA = (WALL_MATERIALS[matKeyA] || WALL_MATERIALS.wallOffice)();
      const thickness = seg.exterior ? 0.24 : SL.wallThickness;

      // Position each aperture along the wall's own X axis.
      //
      // `wallWithOpenings` lays pieces out over u ∈ [0, length] and centres the
      // group, so local X = u − length/2. An axis:'x' wall is unrotated, so
      // world x = cx + localX and u = o.at − seg.a. An axis:'z' wall is rotated
      // +90° about Y, which maps local +X to world −Z, so world z = cz − localX
      // and u = seg.b − o.at. Using the axis:'x' formula for both mirrored every
      // aperture in a north–south wall about its segment midpoint: the frame,
      // leaf and glazing were placed correctly from `o.at`, but the hole in the
      // wall was cut somewhere else, walling up the narrow doors and leaving a
      // bare gap elsewhere.
      const localOps = ops.map((o) => ({
        x: seg.axis === 'z' ? seg.b - o.at : o.at - seg.a,
        width: o.width,
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
      //
      // It stops short of the top tread. A rail that runs the full length walls
      // the flight in on both sides for its whole height, so the only way off
      // the head is straight ahead onto the strip of landing beyond the shaft —
      // and if that strip is narrower than a player capsule, you can climb the
      // stairs and then be unable to get off them. Real open stairs terminate
      // their balustrade at a newel by the landing for exactly this reason, so
      // the last stretch is left open and you can step sideways onto the
      // landing on either side.
      const railMat = plainMaterial(PALETTE.stainless, { roughness: 0.28, metalness: 0.9 }, 'stairrail');
      const totalRun = s.run * s.steps;
      const totalRise = s.rise * s.steps;
      const headGap = Math.min(STAIR_HEAD_GAP, totalRun * 0.35);
      const f = (totalRun - headGap) / totalRun;
      for (const side of [-1, 1]) {
        const rl = Math.hypot(totalRun, totalRise) * f;
        const rail = KIT.railing({
          length: rl, height: 1.02, postSpacing: 0.9, material: railMat,
          glass: s.railing === 'glass', glassMat: clearGlass(0xcfe0ea, 0.1),
        });
        rail.position.set(
          s.x + side * (s.width / 2 - 0.02),
          fy + (totalRise * f) / 2 + 0.1,
          s.zBottom - (totalRun * f) / 2
        );
        rail.rotation.y = Math.PI / 2;
        rail.rotation.z = -Math.atan2(totalRise, totalRun);
        this.group.add(rail);
        assets.tag(rail, 'ARCH-RAILING');
        // A newel post closing the run, so the gap reads as designed.
        const newel = KIT.mesh(KIT.cyl(0.032, 0.032, 1.06, 12), railMat);
        newel.position.set(
          s.x + side * (s.width / 2 - 0.02),
          fy + totalRise * f + 0.53,
          s.zBottom - totalRun * f
        );
        this.group.add(newel);
        this.collision.add({
          min: [s.x + side * (s.width / 2) - 0.06, fy, s.zBottom - totalRun * f],
          max: [s.x + side * (s.width / 2) + 0.06, topY + 1.0, s.zBottom],
          surface: SURFACE.METAL, tag: `stairrail:${s.id}`, blocksSight: false,
        });
      }
      s._topY = topY;

      // Guard the clearances this flight depends on. A stair is only usable if
      // you can stand square in front of the bottom tread and step off the top
      // one; both are just the gap between the flight and the wall behind it,
      // and both are easy to destroy by nudging the going by a couple of
      // centimetres. Checking them here turns "the mezzanine is unreachable"
      // into a message at load instead of a bug report.
      const capsule = 0.66;
      const headClear = (s.zBottom - totalRun) - (room.z0 + SL.wallThickness / 2);
      const footClear = (room.z1 - SL.wallThickness / 2) - s.zBottom;
      for (const [what, clear] of [['head', headClear], ['foot', footClear]]) {
        if (clear < capsule + 0.02) {
          console.warn(
            `[map] the ${what} of "${s.id}" leaves ${clear.toFixed(2)} m of landing, ` +
            `less than the ${capsule.toFixed(2)} m a player capsule needs — the flight ` +
            'cannot be entered or left there. Shorten the going or move zBottom.'
          );
        }
      }
      s._clearance = { head: +headClear.toFixed(3), foot: +footClear.toFixed(3) };
      this.stairClearances.push({ id: s.id, head: +headClear.toFixed(3), foot: +footClear.toFixed(3) });
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
