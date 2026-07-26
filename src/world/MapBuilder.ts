/**
 * Assembles the Northstar Administrative Center from the layout tables. Owner: Fable 2.
 *
 * Walls are *derived*, not hand-placed: the room rectangles form a watertight partition, and
 * for every wall plane the builder works out, interval by interval and height band by height
 * band, whether the space either side is a room, another room, or outside. That is what makes
 * the building airtight — there is no authoring path that can leave a hole into the void — and
 * it produces genuine architectural conditions for free, such as the clerestory band where the
 * double-height lobby rises above the single-storey wing roof.
 */
import * as THREE from 'three';
import { CollisionWorld, type Brush } from './Collision';
import { Door, DoorSystem, Shutter } from './Doors';
import {
  BUILDING, COLUMNS, EXTRACTION_ZONE, PORTALS, ROOMS, ROOM_BY_ID, WALL,
  type PortalDef, type RoomDef,
} from './MapLayout';
import {
  buildWall, buildWindow, cardReader, ceilingFor, column, doorCloser, doorFrame, doorLeaf,
  floorSlab, keypad, railing, roofEdge, rooftopUnit, signPlate, stairFlight, wallHandrail,
  wallMaterial, type DoorVisualKind,
} from './ArchKit';
import { Mat } from '../assets/Materials';
import { Palette } from '../art/Palette';
import { box, meshOf, plane, rotatedX, translated } from '../assets/GeomKit';

const ROOF_CORE = 8.2;
const ROOF_LOW = 5.4;
const L1_FLOOR = BUILDING.level1Y;

/** Footprint of the two-storey block. */
const CORE = { x0: -12, z0: -11, x1: 13, z1: 2 };
/** Footprint of the double-height lobby block. */
const LOBBY_BLOCK = { x0: -9, z0: 2, x1: 9, z1: 14 };

/** Wall segments deliberately left open (balcony edges, glass-box tops). */
const SUPPRESSED: { axis: 'x' | 'z'; at: number; from: number; to: number; y0: number; y1: number }[] = [
  // Mezzanine balcony edge over the reception lobby.
  { axis: 'z', at: 2, from: -9, to: 9, y0: L1_FLOOR - 0.01, y1: ROOF_CORE + 0.1 },
  // The security vestibule is a glass box standing inside the double-height lobby volume.
  { axis: 'x', at: -4, from: 10.5, to: 14, y0: 3.3, y1: ROOF_CORE + 0.1 },
  { axis: 'x', at: 4, from: 10.5, to: 14, y0: 3.3, y1: ROOF_CORE + 0.1 },
  { axis: 'z', at: 10.5, from: -4, to: 4, y0: 3.3, y1: ROOF_CORE + 0.1 },
  // Stair void: the enclosed stair is one volume across both levels.
  { axis: 'z', at: -4, from: 6, to: 13, y0: L1_FLOOR - 0.01, y1: L1_FLOOR + 0.01 },
];

/** Rooms whose floors are authored by hand rather than by the automatic slab pass. */
const MANUAL_FLOOR = new Set(['stairwell', 'stairwell-up']);

export interface GlassPane {
  id: string;
  /** The whole window assembly (frame, glazing, blinds). */
  group: THREE.Object3D;
  /** The glazing itself, hidden and replaced by shards when broken. */
  panes: THREE.Mesh[];
  broken: boolean;
  brush: Brush | null;
  center: THREE.Vector3;
  width: number;
  height: number;
  axis: 'x' | 'z';
  health: number;
  shards?: THREE.Object3D;
}

export interface RoomVolume {
  id: string;
  room: RoomDef;
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  y0: number;
  y1: number;
}

export interface BuiltMap {
  root: THREE.Group;
  world: CollisionWorld;
  doors: DoorSystem;
  glass: GlassPane[];
  volumes: RoomVolume[];
  /** Set of window/portal mesh groups keyed by portal id, for QA inspection. */
  portalObjects: Map<string, THREE.Object3D>;
  roomAt(x: number, y: number, z: number): RoomDef | null;
  extraction: typeof EXTRACTION_ZONE;
}

function structTop(room: RoomDef): number {
  if (room.exterior) return 0;
  if (room.level === 1) return ROOF_CORE;
  if (room.id === 'lobby' || room.id === 'vestibule') return ROOF_CORE;
  // A level-0 room fully inside the core footprint is capped by the level-1 slab.
  const r = room.rects[0];
  const inCore =
    r.x0 >= CORE.x0 - 0.01 && r.x1 <= CORE.x1 + 0.01 && r.z0 >= CORE.z0 - 0.01 && r.z1 <= CORE.z1 + 0.01;
  if (inCore) return L1_FLOOR;
  return ROOF_LOW;
}

interface Side {
  room: RoomDef;
  a: number;
  b: number;
  y0: number;
  y1: number;
  dir: 1 | -1;
}

const EPS = 1e-4;

export function buildMap(): BuiltMap {
  const root = new THREE.Group();
  root.name = 'northstar-admin-center';
  const world = new CollisionWorld();
  const doors = new DoorSystem(world);
  const glass: GlassPane[] = [];
  const volumes: RoomVolume[] = [];
  const portalObjects = new Map<string, THREE.Object3D>();

  const interiorRooms = ROOMS.filter((r) => !r.exterior);

  // -------------------------------------------------------------------------
  // Room volumes (used for nav, lighting zones and text state)
  // -------------------------------------------------------------------------
  for (const room of ROOMS) {
    for (const r of room.rects) {
      volumes.push({
        id: room.id,
        room,
        x0: r.x0, z0: r.z0, x1: r.x1, z1: r.z1,
        y0: room.floorY - 0.2,
        y1: room.exterior ? room.floorY + 6 : structTop(room) + 0.05,
      });
    }
  }

  // -------------------------------------------------------------------------
  // Wall derivation
  // -------------------------------------------------------------------------
  const planes = new Map<string, Side[]>();
  const addSide = (axis: 'x' | 'z', at: number, s: Side) => {
    const key = `${axis}|${at.toFixed(3)}`;
    let list = planes.get(key);
    if (!list) {
      list = [];
      planes.set(key, list);
    }
    list.push(s);
  };

  for (const room of interiorRooms) {
    const y0 = room.floorY;
    const y1 = structTop(room);
    for (const r of room.rects) {
      // Planes perpendicular to X (wall runs along Z)
      addSide('x', r.x0, { room, a: r.z0, b: r.z1, y0, y1, dir: 1 });
      addSide('x', r.x1, { room, a: r.z0, b: r.z1, y0, y1, dir: -1 });
      // Planes perpendicular to Z (wall runs along X)
      addSide('z', r.z0, { room, a: r.x0, b: r.x1, y0, y1, dir: 1 });
      addSide('z', r.z1, { room, a: r.x0, b: r.x1, y0, y1, dir: -1 });
    }
  }

  const portalsByPlane = new Map<string, PortalDef[]>();
  for (const p of PORTALS) {
    const key = `${p.axis}|${p.at.toFixed(3)}`;
    let list = portalsByPlane.get(key);
    if (!list) {
      list = [];
      portalsByPlane.set(key, list);
    }
    list.push(p);
  }

  const wallGroup = new THREE.Group();
  wallGroup.name = 'walls';
  root.add(wallGroup);

  for (const [key, sides] of planes) {
    const [axis, atStr] = key.split('|');
    const at = parseFloat(atStr);
    const ax = axis as 'x' | 'z';

    // Elementary horizontal intervals
    const cuts = new Set<number>();
    for (const s of sides) {
      cuts.add(s.a);
      cuts.add(s.b);
    }
    const portals = portalsByPlane.get(key) ?? [];
    for (const p of portals) {
      cuts.add(p.center - p.width / 2);
      cuts.add(p.center + p.width / 2);
    }
    const xs = Array.from(cuts).sort((a, b) => a - b);

    for (let i = 0; i < xs.length - 1; i++) {
      const a = xs[i];
      const b = xs[i + 1];
      if (b - a < 0.02) continue;
      const mid = (a + b) / 2;

      const plus = sides.filter((s) => s.dir === 1 && s.a <= mid && s.b >= mid);
      const minus = sides.filter((s) => s.dir === -1 && s.a <= mid && s.b >= mid);
      if (plus.length === 0 && minus.length === 0) continue;

      // Elementary vertical bands
      const yCuts = new Set<number>();
      for (const s of [...plus, ...minus]) {
        yCuts.add(s.y0);
        yCuts.add(s.y1);
      }
      const ys = Array.from(yCuts).sort((p, q) => p - q);

      for (let j = 0; j < ys.length - 1; j++) {
        const y0 = ys[j];
        const y1 = ys[j + 1];
        if (y1 - y0 < 0.02) continue;
        const ymid = (y0 + y1) / 2;
        const pRoom = plus.find((s) => s.y0 <= ymid && s.y1 >= ymid)?.room ?? null;
        const mRoom = minus.find((s) => s.y0 <= ymid && s.y1 >= ymid)?.room ?? null;
        if (!pRoom && !mRoom) continue;
        // Two rects of the same room meeting: no wall.
        if (pRoom && mRoom && pRoom.id === mRoom.id) continue;

        // Suppressed (open) segments
        // A suppression only applies when it genuinely covers the band, not when it merely
        // touches the boundary — otherwise a balcony opening at 4.0 m would delete the wall
        // that runs up to 4.0 m underneath it.
        let suppressed = false;
        for (const s of SUPPRESSED) {
          if (s.axis !== ax) continue;
          if (Math.abs(s.at - at) > 0.01) continue;
          if (Math.min(b, s.to) - Math.max(a, s.from) < 0.05) continue;
          if (Math.min(y1, s.y1) - Math.max(y0, s.y0) < 0.05) continue;
          suppressed = true;
          break;
        }
        if (suppressed) continue;

        const isExterior = !pRoom || !mRoom;
        const owner = (pRoom ?? mRoom)!;
        const other = pRoom && mRoom ? (pRoom === owner ? mRoom : pRoom) : null;
        const thickness = isExterior ? WALL.exterior
          : owner.wall === 'service-grey' || (other && other.wall === 'service-grey')
            ? WALL.interiorHeavy : WALL.interior;

        // Openings that fall inside this band
        const openings: { center: number; width: number; sill: number; head: number }[] = [];
        for (const p of portals) {
          const pa = p.center - p.width / 2;
          const pb = p.center + p.width / 2;
          if (pb <= a + EPS || pa >= b - EPS) continue;
          const host = ROOM_BY_ID.get(p.rooms[0]) ?? owner;
          const base = host.exterior ? (ROOM_BY_ID.get(p.rooms[1])?.floorY ?? 0) : host.floorY;
          const sy = base + p.sill;
          const hy = base + p.head;
          if (hy <= y0 + EPS || sy >= y1 - EPS) continue;
          openings.push({
            center: p.center,
            width: p.width,
            sill: Math.max(0, sy - y0),
            head: Math.min(y1 - y0, hy - y0),
          });
        }

        const innerMat = wallMaterial(owner.wall);
        const farMat = isExterior
          ? Mat.concrete({ color: Palette.wall.exteriorClad, seed: 733, wear: 0.6 })
          : other ? wallMaterial(other.wall) : undefined;

        const g = buildWall({
          axis: ax,
          at,
          from: a,
          to: b,
          baseY: y0,
          height: y1 - y0,
          thickness,
          material: innerMat,
          farMaterial: isExterior ? farMat : undefined,
          baseboard: y0 <= owner.floorY + 0.05
            ? (owner.wall === 'service-grey' ? 'service' : owner.wall === 'restroom-tile' ? 'none' : 'office')
            : 'none',
          crown: false,
          openings,
          uvScale: owner.wall === 'restroom-tile' ? 1.2 : 0.5,
        });
        wallGroup.add(g);

        // Second face for interior walls so each room keeps its own paint colour.
        if (!isExterior && other && other.wall !== owner.wall) {
          const skin = buildWall({
            axis: ax,
            at: at + (other === pRoom ? 1 : -1) * (thickness / 2 + 0.006),
            from: a,
            to: b,
            baseY: y0,
            height: y1 - y0,
            thickness: 0.012,
            material: wallMaterial(other.wall),
            baseboard: 'none',
            openings,
            uvScale: other.wall === 'restroom-tile' ? 1.2 : 0.5,
          });
          wallGroup.add(skin);
        }

        // Collision: solid runs plus lintels and sills
        addWallCollision(world, ax, at, a, b, y0, y1, thickness, openings, surfaceOfWall(owner));
      }
    }
  }

  // -------------------------------------------------------------------------
  // Floors, ceilings, ceiling caps
  // -------------------------------------------------------------------------
  const floorGroup = new THREE.Group();
  floorGroup.name = 'floors';
  root.add(floorGroup);
  const ceilGroup = new THREE.Group();
  ceilGroup.name = 'ceilings';
  root.add(ceilGroup);

  for (const room of ROOMS) {
    if (room.exterior) continue;
    if (MANUAL_FLOOR.has(room.id)) continue;
    room.rects.forEach((r, idx) => {
      floorGroup.add(floorSlab(r.x0, r.z0, r.x1, r.z1, room.floorY, room.floor));
      // slab body beneath the finish
      world.add(
        new THREE.Vector3(r.x0, room.floorY - WALL.slab, r.z0),
        new THREE.Vector3(r.x1, room.floorY, r.z1),
        floorSurfaceKind(room.floor),
      );
      // Upper-floor slabs need a soffit, otherwise the double-height lobby looks up into a
      // back-faced void where the mezzanine should be.
      if (room.level === 1) {
        // Solid structural slab so the upper floor blocks daylight and gunfire, and so the
        // double-height lobby sees a real soffit rather than the back of a plane.
        const slab = box(r.x1 - r.x0, 0.36, r.z1 - r.z0, { bevel: 0.01 });
        slab.translate((r.x0 + r.x1) / 2, room.floorY - 0.19, (r.z0 + r.z1) / 2);
        const slabMesh = meshOf(slab, Mat.plaster({ color: 0xc9c5ba, seed: 761 }), {
          uvScale: 0.45, name: 'level1-slab',
        });
        slabMesh.castShadow = true;
        slabMesh.receiveShadow = true;
        floorGroup.add(slabMesh);
      }
      const c = ceilingFor(room, idx, room.ceiling, r.x0, r.z0, r.x1, r.z1);
      if (c) ceilGroup.add(c);
      // Ceiling cap: blocks bullets and bodies from the plenum upward.
      const top = structTop(room);
      if (top > room.ceilingY + 0.02) {
        world.add(
          new THREE.Vector3(r.x0, room.ceilingY + 0.02, r.z0),
          new THREE.Vector3(r.x1, top, r.z1),
          'ceiling',
        );
      }
    });
  }

  // Exterior ground
  buildExterior(root, world);

  // -------------------------------------------------------------------------
  // Columns
  // -------------------------------------------------------------------------
  const colGroup = new THREE.Group();
  colGroup.name = 'columns';
  root.add(colGroup);
  for (const c of COLUMNS) {
    const y0 = c.level === 0 ? 0 : L1_FLOOR;
    const service = c.top > 6 ? false : c.level === 0 && c.z < -4;
    colGroup.add(column(c.x, c.z, y0, c.top, c.size, service));
    world.addBox(c.x, y0 + (c.top - y0) / 2, c.z, c.size + 0.02, c.top - y0, c.size + 0.02, 'drywall');
  }

  // -------------------------------------------------------------------------
  // Portals: doors, windows, openings
  // -------------------------------------------------------------------------
  const portalGroup = new THREE.Group();
  portalGroup.name = 'portals';
  root.add(portalGroup);
  for (const p of PORTALS) {
    const obj = buildPortal(p, world, doors, glass);
    if (obj) {
      portalGroup.add(obj);
      portalObjects.set(p.id, obj);
    }
  }

  // -------------------------------------------------------------------------
  // Stairs
  // -------------------------------------------------------------------------
  root.add(buildCentralStair(world));
  root.add(buildFeatureStair(world));

  // -------------------------------------------------------------------------
  // Mezzanine edge, balcony rails
  // -------------------------------------------------------------------------
  const rails = new THREE.Group();
  rails.name = 'railings';
  rails.add(railing([[-9, 2], [9, 2]], L1_FLOOR, 1.1, 'glass'));
  root.add(rails);
  // Guard rail is solid to bodies but not to bullets.
  world.addBox(0, L1_FLOOR + 0.55, 2, 18, 1.1, 0.1, 'metal', { opaque: false });

  // -------------------------------------------------------------------------
  // Roof massing visible from the courtyard
  // -------------------------------------------------------------------------
  const roof = new THREE.Group();
  roof.name = 'roof';
  const roofRects: [number, number, number, number, number][] = [
    [CORE.x0 - 0.4, CORE.z0 - 0.4, CORE.x1 + 0.4, 2, ROOF_CORE],
    [LOBBY_BLOCK.x0 - 0.4, 2, LOBBY_BLOCK.x1 + 0.4, LOBBY_BLOCK.z1 + 0.4, ROOF_CORE],
    [-20.4, -21.4, 20.4, -11.4, ROOF_LOW],
    [-20.4, -11.4, -12.4, 2, ROOF_LOW],
    [13.4, -11.4, 20.4, 2, ROOF_LOW],
    [-20.4, 2, -9.4, 14.4, ROOF_LOW],
    [9.4, 2, 20.4, 14.4, ROOF_LOW],
  ];
  for (const [rx0, rz0, rx1, rz1, ry] of roofRects) {
    roof.add(roofEdge(rx0, rz0, rx1, rz1, ry, ry === ROOF_CORE ? 0.8 : 0.7));
    // Roofs stop bullets and bodies as well as light.
    world.add(
      new THREE.Vector3(rx0, ry - 0.34, rz0),
      new THREE.Vector3(rx1, ry + 0.1, rz1),
      'concrete',
    );
  }
  roof.add(rooftopUnit(-14, -17, ROOF_LOW, 3.0, 2.0, 1.4));
  roof.add(rooftopUnit(4, -18, ROOF_LOW, 2.2, 1.6, 1.1));
  roof.add(rooftopUnit(16, 8, ROOF_LOW, 2.4, 1.8, 1.2));
  roof.add(rooftopUnit(-2, -6, ROOF_CORE, 2.6, 2.0, 1.3));
  root.add(roof);

  world.build();

  const roomAt = (x: number, y: number, z: number): RoomDef | null => {
    let best: RoomDef | null = null;
    let bestSpan = Infinity;
    for (const v of volumes) {
      if (x < v.x0 || x > v.x1 || z < v.z0 || z > v.z1) continue;
      if (y < v.y0 || y > v.y1) continue;
      const span = (v.x1 - v.x0) * (v.z1 - v.z0);
      if (span < bestSpan) {
        bestSpan = span;
        best = v.room;
      }
    }
    return best;
  };

  return { root, world, doors, glass, volumes, portalObjects, roomAt, extraction: EXTRACTION_ZONE };
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function surfaceOfWall(room: RoomDef): 'drywall' | 'plaster' | 'concrete' | 'tile' | 'wood' {
  switch (room.wall) {
    case 'service-grey': return 'concrete';
    case 'restroom-tile': return 'tile';
    case 'exec-walnut': return 'wood';
    case 'exterior': return 'concrete';
    default: return 'drywall';
  }
}

function floorSurfaceKind(f: RoomDef['floor']): 'carpet' | 'tile' | 'concrete' | 'vinyl' | 'metal' | 'snow' {
  switch (f) {
    case 'carpet-blue':
    case 'carpet-grey':
    case 'carpet-exec': return 'carpet';
    case 'tile-restroom':
    case 'tile-kitchen':
    case 'terrazzo': return 'tile';
    case 'vinyl': return 'vinyl';
    case 'raised-metal': return 'metal';
    case 'snow': return 'snow';
    default: return 'concrete';
  }
}

function addWallCollision(
  world: CollisionWorld,
  axis: 'x' | 'z',
  at: number,
  a: number,
  b: number,
  y0: number,
  y1: number,
  thickness: number,
  openings: { center: number; width: number; sill: number; head: number }[],
  surface: 'drywall' | 'plaster' | 'concrete' | 'tile' | 'wood',
): void {
  const half = thickness / 2 + 0.006;
  const emit = (from: number, to: number, ya: number, yb: number) => {
    if (to - from < 0.01 || yb - ya < 0.01) return;
    const min = axis === 'z'
      ? new THREE.Vector3(from, ya, at - half)
      : new THREE.Vector3(at - half, ya, from);
    const max = axis === 'z'
      ? new THREE.Vector3(to, yb, at + half)
      : new THREE.Vector3(at + half, yb, to);
    world.add(min, max, surface);
  };
  const sorted = openings.slice().sort((p, q) => p.center - q.center);
  let cursor = a;
  for (const o of sorted) {
    const oa = o.center - o.width / 2;
    const ob = o.center + o.width / 2;
    emit(cursor, Math.max(cursor, oa), y0, y1);
    if (o.sill > 0.01) emit(Math.max(cursor, oa), ob, y0, y0 + o.sill);
    if (o.head < y1 - y0 - 0.01) emit(Math.max(cursor, oa), ob, y0 + o.head, y1);
    cursor = Math.max(cursor, ob);
  }
  emit(cursor, b, y0, y1);
}

const GLASS_KINDS = new Set<PortalDef['kind']>([
  'window-interior', 'window-exterior', 'window-clerestory', 'curtain-wall', 'pass-through',
]);

const DOOR_KINDS = new Set<PortalDef['kind']>([
  'door-standard', 'door-glass', 'door-double-glass', 'door-fire',
  'door-security', 'door-restroom', 'door-server', 'door-loading',
]);

function buildPortal(
  p: PortalDef,
  world: CollisionWorld,
  doors: DoorSystem,
  glass: GlassPane[],
): THREE.Object3D | null {
  const hostA = ROOM_BY_ID.get(p.rooms[0]);
  const hostB = ROOM_BY_ID.get(p.rooms[1]);
  const interior = hostA && !hostA.exterior ? hostA : hostB!;
  const baseY = interior.floorY;
  const g = new THREE.Group();
  g.name = `portal:${p.id}`;

  const cx = p.axis === 'z' ? p.center : p.at;
  const cz = p.axis === 'z' ? p.at : p.center;
  const yaw = p.axis === 'z' ? 0 : Math.PI / 2;

  if (GLASS_KINDS.has(p.kind)) {
    const h = p.head - p.sill;
    const style: 'exterior' | 'interior' | 'curtain' | 'clerestory' | 'passthrough' =
      p.kind === 'curtain-wall' ? 'curtain'
        : p.kind === 'window-interior' ? 'interior'
          : p.kind === 'pass-through' ? 'passthrough'
            : p.kind === 'window-clerestory' ? 'clerestory' : 'exterior';
    const win = buildWindow({
      width: p.width,
      height: h,
      thickness: p.kind === 'window-interior' || p.kind === 'pass-through' ? WALL.interior : WALL.exterior,
      style,
      blinds: p.blinds ?? 0,
      glass: p.kind === 'pass-through' ? 'clear' : 'clear',
    });
    win.position.set(cx, baseY + p.sill + h / 2, cz);
    win.rotation.y = yaw;
    g.add(win);

    // Glass blocks bodies but not bullets; it can be shot out.
    const th = 0.06;
    const brush = world.addBox(
      cx, baseY + p.sill + h / 2, cz,
      p.axis === 'z' ? p.width : th, h, p.axis === 'z' ? th : p.width,
      'glass',
      { id: `glass:${p.id}`, opaque: true, penetrable: true, solid: p.kind !== 'pass-through' },
    );
    const panes: THREE.Mesh[] = [];
    win.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && o.name.startsWith('glass-pane')) panes.push(o as THREE.Mesh);
    });
    if (panes.length > 0) {
      glass.push({
        id: p.id,
        group: win,
        panes,
        broken: false,
        brush,
        center: new THREE.Vector3(cx, baseY + p.sill + h / 2, cz),
        width: p.width,
        height: h,
        axis: p.axis,
        health: 34,
      });
    }
    // window board / sill
    if (p.sill > 0.3 && p.kind !== 'pass-through') {
      const sill = box(
        p.axis === 'z' ? p.width + 0.1 : 0.26,
        0.03,
        p.axis === 'z' ? 0.26 : p.width + 0.1,
        { bevel: 0.006 },
      );
      sill.translate(cx, baseY + p.sill - 0.015, cz);
      g.add(meshOf(sill, Mat.solid(0xd8d4ca, 0.6, 0), { uvScale: 3, name: 'window-board' }));
    }
    return g;
  }

  if (p.kind === 'garage-shutter') {
    const h = p.head - p.sill;
    const s = new Shutter(p.id, p.width, h);
    s.group.position.set(cx, baseY + p.sill, cz);
    s.group.rotation.y = yaw;
    s.position.set(cx, baseY + p.sill + h / 2, cz);
    const brush = world.addBox(
      cx, baseY + p.sill + h / 2, cz,
      p.axis === 'z' ? p.width : 0.14, h, p.axis === 'z' ? 0.14 : p.width,
      'metal',
      { id: `shutter:${p.id}`, dynamic: true },
    );
    s.addBrush(brush);
    doors.addShutter(s);
    g.add(s.group);
    return g;
  }

  if (DOOR_KINDS.has(p.kind)) {
    const h = p.head;
    const service = p.kind === 'door-fire' || p.kind === 'door-security'
      || p.kind === 'door-server' || p.kind === 'door-loading';
    const frame = doorFrame(p.width, h, WALL.interior, service);
    frame.position.set(cx, baseY, cz);
    frame.rotation.y = yaw;
    g.add(frame);

    const door = new Door({
      id: p.id,
      kind: p.kind,
      label: p.sign ?? `${interior.name} door`,
      locked: p.locked ?? false,
      cardReader: p.cardReader ?? false,
      interactive: true,
      auto: p.id === 'p-entry-outer' || p.id === 'p-entry-inner',
      selfClosing: p.kind === 'door-fire' || p.kind === 'door-security' || p.kind === 'door-server',
      travelTime: p.kind === 'door-loading' ? 1.1 : 0.62,
    });
    door.position.set(cx, baseY + 1.0, cz);

    const leafKind = p.kind as DoorVisualKind;
    const leaves = p.double ? 2 : 1;
    const leafWidth = p.double ? p.width / 2 : p.width;
    for (let i = 0; i < leaves; i++) {
      const pivot = new THREE.Group();
      const leaf = doorLeaf(leafKind, leafWidth - 0.012, h - 0.02);
      leaf.position.y = 0.012;
      pivot.add(leaf);
      // Hinge position along the wall.
      let hingeOffset: number;
      let leafYaw: number;
      if (p.double) {
        hingeOffset = i === 0 ? -p.width / 2 : p.width / 2;
        leafYaw = i === 0 ? 0 : Math.PI;
      } else {
        hingeOffset = p.hingeLow === false ? p.width / 2 : -p.width / 2;
        leafYaw = p.hingeLow === false ? Math.PI : 0;
      }
      const px = p.axis === 'z' ? p.center + hingeOffset : p.at;
      const pz = p.axis === 'z' ? p.at : p.center + hingeOffset;
      pivot.position.set(px, baseY, pz);
      const openDir = (p.swingPositive ? 1 : -1) * (leafYaw === 0 ? 1 : -1);
      const closedYaw = yaw + leafYaw;
      const openYaw = closedYaw + openDir * (Math.PI * 0.52);
      door.addLeaf(pivot, closedYaw, openYaw);
      g.add(pivot);
    }

    // Collision brush filling the opening while closed.
    const brush = world.addBox(
      cx, baseY + h / 2, cz,
      p.axis === 'z' ? p.width : 0.1, h, p.axis === 'z' ? 0.1 : p.width,
      p.kind === 'door-standard' ? 'wood' : 'metal',
      { id: `door:${p.id}`, dynamic: true },
    );
    door.addBrush(brush);
    doors.add(door);

    // Hardware
    if (p.cardReader) {
      const cr = cardReader(!(p.locked ?? false));
      const side = p.swingPositive ? -1 : 1;
      const off = p.width / 2 + 0.16;
      if (p.axis === 'z') {
        cr.position.set(p.center + off, baseY + 1.15, p.at + side * (WALL.interior / 2 + 0.02));
        cr.rotation.y = side > 0 ? 0 : Math.PI;
      } else {
        cr.position.set(p.at + side * (WALL.interior / 2 + 0.02), baseY + 1.15, p.center + off);
        cr.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
      g.add(cr);
    }
    if (p.kind === 'door-security' || p.kind === 'door-server') {
      const kp = keypad();
      const side = p.swingPositive ? -1 : 1;
      const off = -(p.width / 2 + 0.16);
      if (p.axis === 'z') {
        kp.position.set(p.center + off, baseY + 1.15, p.at + side * (WALL.interior / 2 + 0.02));
        kp.rotation.y = side > 0 ? 0 : Math.PI;
      } else {
        kp.position.set(p.at + side * (WALL.interior / 2 + 0.02), baseY + 1.15, p.center + off);
        kp.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
      g.add(kp);
    }
    if (service) {
      const cl = doorCloser();
      cl.position.set(cx, baseY + h + 0.02, cz + (p.axis === 'z' ? 0.1 : 0));
      cl.rotation.y = yaw;
      g.add(cl);
    }
    if (p.sign) {
      const plate = signPlate(p.sign, Math.min(0.42, 0.06 + p.sign.length * 0.017), 0.1);
      const off = p.width / 2 + 0.22;
      const side = 1;
      if (p.axis === 'z') {
        plate.position.set(p.center + off, baseY + 1.95, p.at + side * (WALL.interior / 2 + 0.01));
      } else {
        plate.position.set(p.at + side * (WALL.interior / 2 + 0.01), baseY + 1.95, p.center + off);
        plate.rotation.y = Math.PI / 2;
      }
      g.add(plate);
    }
    return g;
  }

  // Plain openings: cased reveal so the hole reads as built, not cut.
  if (p.kind === 'opening' || p.kind === 'wide-opening') {
    const h = p.head;
    const casing = p.kind === 'opening' ? 0.05 : 0.03;
    const mat = Mat.solid(Palette.trim.doorFrame, 0.6, 0);
    const parts: THREE.Mesh[] = [];
    for (const s of [-1, 1]) {
      const jamb = box(
        p.axis === 'z' ? casing : WALL.interior + 0.03,
        h,
        p.axis === 'z' ? WALL.interior + 0.03 : casing,
        { bevel: 0.004 },
      );
      const jx = p.axis === 'z' ? p.center + s * (p.width / 2 - casing / 2) : p.at;
      const jz = p.axis === 'z' ? p.at : p.center + s * (p.width / 2 - casing / 2);
      jamb.translate(jx, baseY + h / 2, jz);
      parts.push(meshOf(jamb, mat, { uvScale: 3, name: 'reveal' }));
    }
    const head = box(
      p.axis === 'z' ? p.width : WALL.interior + 0.03,
      casing,
      p.axis === 'z' ? WALL.interior + 0.03 : p.width,
      { bevel: 0.004 },
    );
    head.translate(cx, baseY + h - casing / 2, cz);
    parts.push(meshOf(head, mat, { uvScale: 3, name: 'reveal-head' }));
    for (const m of parts) g.add(m);
    return g;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Stairs
// ---------------------------------------------------------------------------

function buildCentralStair(world: CollisionWorld): THREE.Group {
  const g = new THREE.Group();
  g.name = 'central-stair';
  // Stairwell footprint x 6..13, z -11..-4. Two flights around a central landing.
  const flightWidth = 1.5;
  const landingY = 2.0;

  // Landing slabs
  const lower = floorSlab(6.1, -11, 12.9, -4, 0, 'concrete-sealed');
  g.add(lower);
  world.add(new THREE.Vector3(6.1, -0.6, -11), new THREE.Vector3(12.9, 0, -4), 'concrete');

  // Flight 1: ascends north (-z) from z=-4.6 to z=-8.08, on the east side (x 10.9..12.4)
  const f1 = stairFlight({
    steps: 12, totalRise: landingY, totalRun: 3.48, width: flightWidth, dir: '-z', treadFinish: 'concrete',
  });
  f1.group.position.set(11.65, 0, -4.6);
  g.add(f1.group);
  for (const b of f1.brushes) {
    world.add(
      new THREE.Vector3(11.65 + b.min.x, b.min.y, -4.6 + b.min.z),
      new THREE.Vector3(11.65 + b.max.x, b.max.y, -4.6 + b.max.z),
      'concrete',
    );
  }
  // Mid landing at y=2.0, spanning both flights: z -8.1..-9.8
  const midLanding = box(4.8, 0.22, 1.9, { bevel: 0.01 });
  midLanding.translate(9.4, landingY - 0.11, -8.95);
  g.add(meshOf(midLanding, Mat.concrete({ color: 0x87898c, seed: 741, wear: 0.3 }), {
    uvScale: 1.2, name: 'landing',
  }));
  world.addBox(9.4, landingY - 0.11, -8.95, 4.8, 0.22, 1.9, 'concrete');

  // Flight 2: ascends south (+z) from z=-8.95 to y=4.0, on the west side (x 6.6..8.1)
  const f2 = stairFlight({
    steps: 12, totalRise: 2.0, totalRun: 3.48, width: flightWidth, dir: '+z', treadFinish: 'concrete',
  });
  f2.group.position.set(7.35, landingY, -8.9);
  g.add(f2.group);
  for (const b of f2.brushes) {
    world.add(
      new THREE.Vector3(7.35 + b.min.x, landingY + b.min.y, -8.9 + b.min.z),
      new THREE.Vector3(7.35 + b.max.x, landingY + b.max.y, -8.9 + b.max.z),
      'concrete',
    );
  }

  // Upper landing at 4.0: the strip along z -5.4..-4 plus a walkway to the flight head
  const upper = box(6.8, 0.24, 1.5, { bevel: 0.01 });
  upper.translate(9.5, L1_FLOOR - 0.12, -4.75);
  g.add(meshOf(upper, Mat.concrete({ color: 0x87898c, seed: 743, wear: 0.28 }), {
    uvScale: 1.2, name: 'upper-landing',
  }));
  world.addBox(9.5, L1_FLOOR - 0.12, -4.75, 6.8, 0.24, 1.5, 'concrete');
  const walkway = box(1.7, 0.24, 1.2, { bevel: 0.01 });
  walkway.translate(7.35, L1_FLOOR - 0.12, -5.9);
  g.add(meshOf(walkway, Mat.concrete({ color: 0x87898c, seed: 745, wear: 0.28 }), {
    uvScale: 1.2, name: 'upper-walkway',
  }));
  world.addBox(7.35, L1_FLOOR - 0.12, -5.9, 1.7, 0.24, 1.2, 'concrete');

  // Balustrades
  g.add(railing([[10.85, -4.6], [10.85, -8.9]], 0, 1.05, 'steel'));
  g.add(railing([[8.15, -8.9], [8.15, -5.4]], 2.0, 1.05, 'steel'));
  g.add(railing([[6.6, -5.4], [10.6, -5.4]], L1_FLOOR, 1.1, 'steel'));
  world.addBox(8.6, L1_FLOOR + 0.55, -5.4, 4.0, 1.1, 0.08, 'metal', { opaque: false });
  g.add(wallHandrail(12.8, -4.7, 12.8, -8.4, 0.95, 2.95));
  g.add(wallHandrail(6.7, -8.7, 6.7, -5.5, 2.95, 4.95));

  return g;
}

function buildFeatureStair(world: CollisionWorld): THREE.Group {
  const g = new THREE.Group();
  g.name = 'feature-stair';
  // Straight flight from the mezzanine edge (z = 2, y = 4) down into the lobby heading south.
  const steps = 24;
  const rise = L1_FLOOR / steps;
  const run = 0.29;
  const width = 2.2;
  const x = 5.2;
  const treadMat = Mat.woodVeneer({ color: 0x8a6038, dark: 0x4a2d16, seed: 751 });
  const stringMat = Mat.paintedMetal({ color: 0x2b3138, seed: 753, wear: 0.15 });
  const parts: { geo: THREE.BufferGeometry; mat: THREE.Material; uvScale: number }[] = [];

  for (let i = 0; i < steps; i++) {
    const y = L1_FLOOR - rise * i;
    const z = 2.0 + run * (i + 0.5);
    const tread = box(width, 0.055, run + 0.03, { bevel: 0.008, segments: 2 });
    tread.translate(x, y - 0.028, z);
    parts.push({ geo: tread, mat: treadMat, uvScale: 1.6 });
    world.addBox(x, y - 0.14, z, width, 0.3, run + 0.03, 'wood');
  }
  // Open risers on a feature stair, so add a pair of steel stringers.
  for (const s of [-1, 1]) {
    const len = Math.hypot(steps * run, L1_FLOOR);
    const geo = box(0.06, 0.34, len, { bevel: 0.006 });
    geo.rotateX(Math.atan2(L1_FLOOR, steps * run));
    geo.translate(x + s * (width / 2 + 0.04), L1_FLOOR / 2 - 0.1, 2.0 + (steps * run) / 2);
    parts.push({ geo, mat: stringMat, uvScale: 2 });
  }
  const mesh = new THREE.Group();
  for (const p of parts) mesh.add(meshOf(p.geo, p.mat, { uvScale: p.uvScale, name: 'feature-stair-part' }));
  g.add(mesh);
  // Glass balustrade along both sides
  const zEnd = 2.0 + steps * run;
  g.add(railing([[x - width / 2 - 0.06, 2.0], [x - width / 2 - 0.06, zEnd]], 0, 1.05, 'glass'));
  g.add(railing([[x + width / 2 + 0.06, 2.0], [x + width / 2 + 0.06, zEnd]], 0, 1.05, 'glass'));
  // Rails follow the slope: approximate with a swept cylinder each side.
  for (const s of [-1, 1]) {
    const hr = wallHandrail(
      x + s * (width / 2 + 0.06), 2.1, x + s * (width / 2 + 0.06), zEnd - 0.1,
      L1_FLOOR + 0.95, 0.95,
    );
    g.add(hr);
  }
  return g;
}

// ---------------------------------------------------------------------------
// Exterior: ground, snow, courtyard, distant context
// ---------------------------------------------------------------------------

function buildExterior(root: THREE.Group, world: CollisionWorld): void {
  const g = new THREE.Group();
  g.name = 'exterior';

  // Site ground: a large snow field so the horizon is never empty.
  const ground = plane(400, 400, 8, 8);
  rotatedX(ground, -Math.PI / 2);
  translated(ground, 0, -0.02, 0);
  g.add(meshOf(ground, Mat.snow({ seed: 801, trampled: 0.05, repeat: 1 }), {
    uvScale: 1 / 8, name: 'site-ground', cast: false,
  }));
  world.addBox(0, -0.55, 0, 400, 1.0, 400, 'snow');

  // Cleared apron in front of the entrance and in the service yard.
  // Cleared but not clean: a swept apron with snow still packed into the surface.
  const apron = plane(28, 10);
  rotatedX(apron, -Math.PI / 2);
  translated(apron, 0, 0.006, 20.0);
  g.add(meshOf(apron, Mat.snow({ seed: 803, trampled: 0.95, repeat: 1 }), {
    uvScale: 1 / 5, name: 'entry-apron', cast: false,
  }));
  const yard = plane(24, 9);
  rotatedX(yard, -Math.PI / 2);
  translated(yard, -8, 0.006, -25.5);
  g.add(meshOf(yard, Mat.concrete({ color: 0x7d8286, seed: 805, wear: 0.8 }), {
    uvScale: 1 / 4, name: 'yard-apron', cast: false,
  }));

  // Snow banks pushed against the facade give the courtyard depth and stop the ground reading flat.
  const bankMat = Mat.snow({ seed: 807, trampled: 0 });
  const banks: [number, number, number, number, number][] = [
    [-16, 16.4, 9, 1.0, 2.2], [16, 16.4, 9, 1.1, 2.4],
    [-24, 20, 8, 1.4, 5], [24, 20, 8, 1.3, 5],
    [0, 27.5, 40, 1.6, 5],
    [-16, -24.5, 10, 1.2, 3], [8, -24, 10, 1.3, 3.4],
  ];
  for (const [bx, bz, bw, bh, bd] of banks) {
    const geo = box(bw, bh, bd, { bevel: Math.min(bh, bd) * 0.32, segments: 3 });
    geo.translate(bx, bh / 2 - 0.25, bz);
    g.add(meshOf(geo, bankMat, { uvScale: 0.35, name: 'snow-bank' }));
    world.addBox(bx, bh / 2 - 0.25, bz, bw, bh, bd, 'snow');
  }

  // Distant tree line so the storm has something to fade into.
  const treeMat = Mat.solid(0x2e3a34, 0.95, 0);
  const snowTree = Mat.snow({ seed: 809, trampled: 0 });
  const trees = new THREE.Group();
  for (let i = 0; i < 90; i++) {
    const ang = (i / 90) * Math.PI * 2;
    const rad = 95 + ((i * 37) % 40);
    const tx = Math.cos(ang) * rad;
    const tz = Math.sin(ang) * rad;
    if (Math.abs(tx) < 40 && Math.abs(tz) < 45) continue;
    const hgt = 8 + ((i * 13) % 7);
    const trunk = new THREE.Mesh(new THREE.ConeGeometry(hgt * 0.22, hgt, 6), treeMat);
    trunk.position.set(tx, hgt / 2, tz);
    trunk.castShadow = false;
    trunk.receiveShadow = false;
    trees.add(trunk);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(hgt * 0.14, hgt * 0.34, 6), snowTree);
    cap.position.set(tx, hgt * 0.82, tz);
    cap.castShadow = false;
    trees.add(cap);
  }
  g.add(trees);

  root.add(g);
}

export { ROOF_CORE, ROOF_LOW, structTop };
