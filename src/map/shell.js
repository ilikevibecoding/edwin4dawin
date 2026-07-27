import {
  ROOMS, INTERIOR_ROOMS, ROOM_BY_ID, OPENINGS, STAIRS, ROOFS, UPPER_VOIDS,
  FLOOR_Y, UPPER_SOFFIT, ROOF_HIGH, BUILDING_SHELL, UPPER_SHELL, WORLD_BOUNDS, EXTRACTION_ZONE,
  roomAt, isVoid,
} from './layout.js';
import * as KIT from './kit.js';
import { UNITS } from '../art/palette.js';
import { box, plane, bevelBox, cyl, matrixFrom } from '../art/geometry.js';
import { makeRng } from '../core/rng.js';

/**
 * SHELL GENERATOR
 * Owner: Fable 2, integrated by Opus 1.
 *
 * Walls are derived, never hand-placed: every room-rectangle edge is sampled at
 * 0.25 m, classified by what lies on each side, then emitted as a two-skin wall
 * (each face carries the finish of the room it faces) with the OPENINGS table
 * carved through it. A rectangle edge that has a room on only one side becomes
 * exterior shell, which makes an unclosed building geometrically impossible.
 */

const T_WALL = UNITS.wallThickness;
const SAMPLE = 0.25;
const UPPER_TOP = 3.35;

function sideInfo(x, z, floor) {
  const r = roomAt(x, z, floor);
  if (r) return { room: r, kind: 'room' };
  if (floor === 'upper') {
    if (isVoid(x, z, 'upper')) return { room: null, kind: 'void' };
    const inShell = x > UPPER_SHELL.x0 && x < UPPER_SHELL.x1 && z > UPPER_SHELL.z0 && z < UPPER_SHELL.z1;
    return { room: null, kind: inShell ? 'void' : 'outside' };
  }
  const inShell = x > BUILDING_SHELL.x0 && x < BUILDING_SHELL.x1 && z > BUILDING_SHELL.z0 && z < BUILDING_SHELL.z1;
  return { room: null, kind: inShell ? 'void' : 'outside' };
}

function topFor(side, floor) {
  if (floor === 'upper') return UPPER_TOP;
  const r = side.room;
  if (!r) return UPPER_SOFFIT;
  if (r.ceiling === 'open') return ROOF_HIGH - 0.35;
  if (r.ceilH + 0.35 > UPPER_SOFFIT) return r.ceilH + 0.35;
  return UPPER_SOFFIT;
}

function finishFor(side, floor) {
  if (side.kind === 'outside') return floor === 'upper' ? 'concrete.wall' : 'concrete.wall';
  if (side.kind === 'void') return 'concrete.wall';
  return side.room.wallMat ?? 'drywall.warm';
}

/** Collect every unique wall line and split it into runs of constant character. */
function wallRuns() {
  const groups = new Map();
  for (const r of INTERIOR_ROOMS) {
    const skip = new Set(r.skipEdges ?? []);
    const push = (axis, at, a, b) => {
      const key = `${r.floor}|${axis}|${at.toFixed(3)}`;
      if (!groups.has(key)) groups.set(key, { floor: r.floor, axis, at, spans: [] });
      groups.get(key).spans.push([a, b]);
    };
    if (!skip.has('w')) push('x', r.x0, r.z0, r.z1);
    if (!skip.has('e')) push('x', r.x1, r.z0, r.z1);
    if (!skip.has('n')) push('z', r.z0, r.x0, r.x1);
    if (!skip.has('s')) push('z', r.z1, r.x0, r.x1);
  }

  const runs = [];
  for (const g of groups.values()) {
    // Union of all spans on this line
    const sorted = g.spans.slice().sort((p, q) => p[0] - q[0]);
    const merged = [];
    for (const s of sorted) {
      const last = merged[merged.length - 1];
      if (last && s[0] <= last[1] + 1e-6) last[1] = Math.max(last[1], s[1]);
      else merged.push([s[0], s[1]]);
    }
    for (const [a0, b0] of merged) {
      let cursor = a0;
      let current = null;
      const n = Math.max(1, Math.ceil((b0 - a0) / SAMPLE));
      for (let i = 0; i < n; i++) {
        const s = a0 + ((b0 - a0) * i) / n;
        const e = a0 + ((b0 - a0) * (i + 1)) / n;
        const mid = (s + e) / 2;
        const eps = 0.09;
        const pA = g.axis === 'x' ? [g.at - eps, mid] : [mid, g.at - eps];
        const pB = g.axis === 'x' ? [g.at + eps, mid] : [mid, g.at + eps];
        const A = sideInfo(pA[0], pA[1], g.floor);
        const B = sideInfo(pB[0], pB[1], g.floor);
        if (A.kind === 'room' && B.kind === 'room' && A.room === B.room) {
          if (current) { runs.push({ ...g, a: cursor, b: s, ...current }); current = null; }
          cursor = e;
          continue;
        }
        if (A.kind !== 'room' && B.kind !== 'room') {
          if (current) { runs.push({ ...g, a: cursor, b: s, ...current }); current = null; }
          cursor = e;
          continue;
        }
        let top = Math.max(topFor(A, g.floor), topFor(B, g.floor));
        if (g.floor === 'ground') {
          const uA = roomAt(pA[0], pA[1], 'upper');
          const uB = roomAt(pB[0], pB[1], 'upper');
          if (uA && uB) top = Math.min(top, UPPER_SOFFIT);
        }
        const sig = {
          top,
          matA: finishFor(A, g.floor),
          matB: finishFor(B, g.floor),
          exterior: A.kind === 'outside' || B.kind === 'outside',
          roomA: A.room?.id ?? null,
          roomB: B.room?.id ?? null,
        };
        const same = current
          && Math.abs(current.top - sig.top) < 1e-6
          && current.matA === sig.matA && current.matB === sig.matB
          && current.exterior === sig.exterior;
        if (!same) {
          if (current) runs.push({ ...g, a: cursor, b: s, ...current });
          cursor = s;
          current = sig;
        }
      }
      if (current) runs.push({ ...g, a: cursor, b: b0, ...current });
    }
  }
  return runs;
}

function openingsOn(floor, axis, at) {
  return OPENINGS.filter((o) => o.floor === floor && o.axis === axis && Math.abs(o.at - at) < 1e-6);
}

export function buildShell() {
  const parts = [];
  const colliders = [];
  const glassPanes = [];
  const doorSlots = [];
  const rng = makeRng(0x5ee1);

  /* ---------------- Walls ---------------- */
  for (const run of wallRuns()) {
    const { floor, axis, at, a, b, top, matA, matB, exterior } = run;
    const floorY = FLOOR_Y[floor];
    const ops = openingsOn(floor, axis, at)
      .filter((o) => o.b > a + 1e-6 && o.a < b - 1e-6)
      .filter((o) => o.type !== 'wall');
    const carve = ops.map((o) => ({ a: o.a, b: o.b, y0: o.y0, y1: Math.min(o.y1, top) }));

    const skin = T_WALL / 2;
    const spec = {
      axis, a, b, y0: 0, y1: top, floorY,
      thickness: skin, baseboard: true, crown: false, openings: carve,
    };
    const outA = KIT.wallWithOpenings({ ...spec, at: at - skin / 2, matName: matA, baseboard: !exterior || true });
    const outB = KIT.wallWithOpenings({ ...spec, at: at + skin / 2, matName: matB });
    parts.push(...outA.parts, ...outB.parts);
    // One collider for the full-thickness wall
    for (const c of outA.colliders) {
      colliders.push(KIT.collider(
        axis === 'x' ? at - T_WALL / 2 : c.x0, c.y0, axis === 'x' ? c.z0 : at - T_WALL / 2,
        axis === 'x' ? at + T_WALL / 2 : c.x1, c.y1, axis === 'x' ? c.z1 : at + T_WALL / 2,
        c.surface, 'wall',
      ));
    }
  }

  /* ---------------- Opening dressing ---------------- */
  for (const o of OPENINGS) {
    const floorY = FLOOR_Y[o.floor];
    const common = { axis: o.axis, at: o.at, a: o.a, b: o.b, y0: o.y0, y1: o.y1, floorY, thickness: T_WALL };
    switch (o.type) {
      case 'door': {
        const f = KIT.doorFrame({ ...common, matName: o.door === 'fire' || o.door === 'security' || o.door === 'server' ? 'metal.painted' : 'wood.pale' });
        parts.push(...f.parts);
        doorSlots.push({ ...o, floorY });
        break;
      }
      case 'shutter': {
        doorSlots.push({ ...o, floorY, roller: true });
        parts.push(...KIT.doorFrame({ ...common, matName: 'metal.galvanised' }).parts);
        break;
      }
      case 'arch': {
        parts.push(...KIT.archReveal({ ...common, matName: 'drywall.cool' }).parts);
        break;
      }
      case 'window':
      case 'glasswall': {
        const g = KIT.glazing({
          ...common,
          glass: o.glass ?? (o.type === 'glasswall' ? 'clear' : 'clear'),
          mullions: o.mullions ?? o.type === 'window',
          panelWidth: o.type === 'glasswall' ? 2.2 : 1.6,
          sill: o.type === 'window',
        });
        parts.push(...g.parts);
        colliders.push(...g.colliders);
        glassPanes.push(...g.panes.map((p, i) => ({ ...p, id: `${o.id}.pane${i}`, opening: o.id })));
        break;
      }
      case 'rail': {
        const r = KIT.railing({ axis: o.axis, at: o.at, a: o.a, b: o.b, floorY, infill: 'glass' });
        parts.push(...r.parts);
        colliders.push(...r.colliders);
        break;
      }
      default:
        break;
    }
  }

  /* ---------------- Floors ---------------- */
  for (const r of INTERIOR_ROOMS) {
    const y = FLOOR_Y[r.floor];
    const structural = r.floor === 'upper' || r.kind !== 'exterior';
    const f = KIT.floorSlab({
      x0: r.x0, z0: r.z0, x1: r.x1, z1: r.z1, y,
      matName: r.floorMat, structural, thickness: r.floor === 'upper' ? 0.35 : 0.4,
    });
    parts.push(...f.parts);
    colliders.push(...f.colliders);
    // Soffit under upper slabs so ground rooms with no suspended ceiling still read solid
    if (r.floor === 'upper') {
      parts.push({
        geometry: plane(r.x1 - r.x0, r.z1 - r.z0), matName: 'drywall.cool',
        matrix: matrixFrom([(r.x0 + r.x1) / 2, y - 0.351, (r.z0 + r.z1) / 2], [Math.PI / 2, 0, 0]),
      });
    }
  }

  /* ---------------- Ceilings ---------------- */
  for (const r of INTERIOR_ROOMS) {
    const y = FLOOR_Y[r.floor] + r.ceilH;
    if (r.ceiling === 'grid') {
      const seed = makeRng(r.id.length * 977 + r.x0 * 13 + r.z0 * 7);
      const nx = Math.max(1, Math.round((r.x1 - r.x0) / UNITS.ceilingTile));
      const nz = Math.max(1, Math.round((r.z1 - r.z0) / UNITS.ceilingTile));
      const missing = [];
      const stained = [];
      const wear = ['southcorr', 'eastcorr', 'loading', 'janitor', 'it', 'copy'].includes(r.id) ? 1 : 0.25;
      const nMissing = Math.round(seed() * 2 * wear);
      const nStained = Math.round(seed() * 5 * wear + wear);
      for (let i = 0; i < nMissing; i++) missing.push([seed.int(0, nx - 1), seed.int(0, nz - 1)]);
      for (let i = 0; i < nStained; i++) stained.push([seed.int(0, nx - 1), seed.int(0, nz - 1)]);
      const c = KIT.suspendedCeiling({ x0: r.x0, z0: r.z0, x1: r.x1, z1: r.z1, y, missing, stained });
      parts.push(...c.parts);
      colliders.push(...c.colliders);
    } else if (r.ceiling === 'slab') {
      const c = KIT.slabCeiling({ x0: r.x0, z0: r.z0, x1: r.x1, z1: r.z1, y, matName: r.id === 'exec' ? 'plaster.clean' : 'concrete.raw' });
      parts.push(...c.parts);
      colliders.push(...c.colliders);
    } else if (r.ceiling === 'open') {
      const c = KIT.slabCeiling({ x0: r.x0, z0: r.z0, x1: r.x1, z1: r.z1, y: ROOF_HIGH - 0.35, matName: 'concrete.raw' });
      parts.push(...c.parts);
      colliders.push(...c.colliders);
    }
  }

  /* ---------------- Lobby custom ceiling (double height + mezzanine soffit) --- */
  {
    const L = ROOM_BY_ID.lobby;
    const c = KIT.slabCeiling({ x0: L.x0, z0: L.z0, x1: L.x1, z1: -13, y: L.ceilH, matName: 'plaster.clean' });
    parts.push(...c.parts);
    colliders.push(...c.colliders);
    // Vestibule roof reads as a solid box inside the lobby volume
    const V = ROOM_BY_ID.vestibule;
    parts.push(KIT.part(box(V.x1 - V.x0 + 0.16, 0.22, V.z1 - V.z0 + 0.16), 'drywall.cool', [(V.x0 + V.x1) / 2, 3.11, (V.z0 + V.z1) / 2]));
    colliders.push(KIT.collider(V.x0 - 0.08, 3.0, V.z0 - 0.08, V.x1 + 0.08, 3.22, V.z1 + 0.08, 'drywall', 'ceiling'));
  }

  /* ---------------- Stairs ---------------- */
  for (const s of STAIRS) {
    for (const f of s.flights) {
      const r = KIT.stairFlight({ ...f, matName: 'concrete.polished' });
      parts.push(...r.parts);
      colliders.push(...r.colliders);
    }
    const L = s.midLanding;
    const l = KIT.landingSlab({ x0: L.x0, z0: L.z0, x1: L.x1, z1: L.z1, y: L.y });
    parts.push(...l.parts);
    colliders.push(...l.colliders);
    // Guard the open side of the mid landing
    const rail = KIT.railing({ axis: 'x', at: L.x1 - 0.06, a: L.z0, b: L.z1, floorY: L.y, infill: 'bar' });
    parts.push(...rail.parts);
    colliders.push(...rail.colliders);
  }

  /* ---------------- Roofs ---------------- */
  for (const rf of ROOFS) {
    const w = rf.x1 - rf.x0;
    const d = rf.z1 - rf.z0;
    parts.push({
      geometry: plane(w, d), matName: 'snow.fresh',
      matrix: matrixFrom([(rf.x0 + rf.x1) / 2, rf.y + 0.06, (rf.z0 + rf.z1) / 2], [-Math.PI / 2, 0, 0]),
      uvScale: 3.0,
    });
    parts.push(KIT.part(box(w, 0.3, d), 'concrete.dark', [(rf.x0 + rf.x1) / 2, rf.y - 0.15, (rf.z0 + rf.z1) / 2]));
    const edge = KIT.roofEdge({ x0: rf.x0 + 0.14, z0: rf.z0 + 0.14, x1: rf.x1 - 0.14, z1: rf.z1 - 0.14, y: rf.y, height: 0.5 });
    parts.push(...edge.parts);
    colliders.push(...edge.colliders);
    colliders.push(KIT.collider(rf.x0, rf.y - 0.3, rf.z0, rf.x1, rf.y + 0.06, rf.z1, 'snow', 'roof'));
  }

  /* ---------------- Exterior ground ---------------- */
  {
    const w = WORLD_BOUNDS.x1 - WORLD_BOUNDS.x0;
    const d = WORLD_BOUNDS.z1 - WORLD_BOUNDS.z0;
    parts.push({
      geometry: plane(w, d, 1, 1), matName: 'snow.fresh',
      matrix: matrixFrom([(WORLD_BOUNDS.x0 + WORLD_BOUNDS.x1) / 2, -0.06, (WORLD_BOUNDS.z0 + WORLD_BOUNDS.z1) / 2], [-Math.PI / 2, 0, 0]),
      uvScale: 4.0,
    });
    colliders.push(KIT.collider(WORLD_BOUNDS.x0, -0.5, WORLD_BOUNDS.z0, WORLD_BOUNDS.x1, -0.06, WORLD_BOUNDS.z1, 'snow', 'ground'));
    // Cleared, trampled approach path from the courtyard to the entrance
    parts.push({
      geometry: plane(6.4, 12), matName: 'snow.trampled',
      matrix: matrixFrom([0, -0.045, -26], [-Math.PI / 2, 0, 0]), uvScale: 2.4,
    });
    parts.push({
      geometry: plane(14, 8), matName: 'snow.trampled',
      matrix: matrixFrom([39, -0.045, 12], [-Math.PI / 2, 0, 0]), uvScale: 2.4,
    });
    // Entrance plinth and steps
    for (let i = 0; i < 3; i++) {
      const y = 0.045 * (i + 1) - 0.135;
      parts.push(KIT.part(bevelBox(8.4 - i * 0.5, 0.06, 1.1, 0.01), 'concrete.polished', [0, y, -20.5 - i * 0.55]));
      colliders.push(KIT.collider(-4.2, -0.2, -21.05 - i * 0.55, 4.2, y + 0.03, -19.95 - i * 0.55, 'concrete', 'step'));
    }
    parts.push(KIT.part(bevelBox(9.4, 0.16, 3.2, 0.02), 'concrete.polished', [0, -0.02, -21.6]));
    colliders.push(KIT.collider(-4.7, -0.2, -23.2, 4.7, 0.02, -20, 'concrete', 'plinth'));
  }

  /* ---------------- Building envelope trim ---------------- */
  {
    // Ground-level plinth around the shell so the building never floats
    const S = BUILDING_SHELL;
    const bandY = -0.09;
    const seg = (axis, at, a, b) => {
      const w = axis === 'x' ? 0.4 : b - a;
      const d = axis === 'x' ? b - a : 0.4;
      parts.push(KIT.part(bevelBox(w, 0.36, d, 0.014), 'concrete.dark', [axis === 'x' ? at : (a + b) / 2, bandY, axis === 'x' ? (a + b) / 2 : at]));
    };
    seg('z', S.z0 - 0.08, S.x0 - 0.2, S.x1 + 0.2);
    seg('z', S.z1 + 0.08, S.x0 - 0.2, S.x1 + 0.2);
    seg('x', S.x0 - 0.08, S.z0 - 0.2, S.z1 + 0.2);
    seg('x', S.x1 + 0.08, S.z0 - 0.2, S.z1 + 0.2);
    // Snow banked against the north facade
    for (let i = 0; i < 26; i++) {
      const x = -30 + i * 2.4 + rng.range(-0.4, 0.4);
      if (Math.abs(x) < 5.5) continue;
      parts.push(KIT.part(bevelBox(rng.range(1.6, 2.8), rng.range(0.2, 0.5), rng.range(0.8, 1.5), 0.12, 2), 'snow.fresh', [x, -0.05, -20.9 - rng.range(0, 0.4)]));
    }
  }

  /* ---------------- Extraction bay markings ---------------- */
  {
    // The extraction point must be readable from the doorway, not only on the
    // minimap: an objective the player cannot see in the world is a defect.
    const z = EXTRACTION_ZONE;
    const w = z.x1 - z.x0;
    const d = z.z1 - z.z0;
    const cx = (z.x0 + z.x1) / 2;
    const cz = (z.z0 + z.z1) / 2;
    const band = 0.42;
    const y = z.y + 0.004;
    // Hazard-striped border band on all four sides
    const stripe = (bx, bz, bw, bd) => {
      parts.push({
        geometry: plane(bw, bd), matName: 'metal.paintedRed',
        matrix: matrixFrom([bx, y, bz], [-Math.PI / 2, 0, 0]), uvScale: 0.55,
      });
    };
    stripe(cx, z.z0 + band / 2, w, band);
    stripe(cx, z.z1 - band / 2, w, band);
    stripe(z.x0 + band / 2, cz, band, d - band * 2);
    stripe(z.x1 - band / 2, cz, band, d - band * 2);
    // Inner field so the bay reads as a marked zone rather than an outline
    parts.push({
      geometry: plane(w - band * 2.2, d - band * 2.2), matName: 'vinyl.warm',
      matrix: matrixFrom([cx, y - 0.001, cz], [-Math.PI / 2, 0, 0]), uvScale: 1.6,
    });
    // Corner chevrons pointing into the bay
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      for (let i = 0; i < 3; i++) {
        parts.push(KIT.part(
          bevelBox(0.62, 0.012, 0.14, 0.004), 'metal.paintedRed',
          [cx + sx * (w / 2 - 1.1 - i * 0.26), y + 0.002, cz + sz * (d / 2 - 0.95)],
          [0, sx * sz * 0.72, 0],
        ));
      }
    }
    // Bollard-mounted marker posts at the two approach corners
    for (const sx of [-1, 1]) {
      const px = cx + sx * (w / 2 - 0.3);
      const pz = z.z0 + 0.3;
      parts.push(KIT.part(cyl(0.055, 0.07, 0.95, 10), 'metal.paintedRed', [px, y + 0.475, pz]));
      parts.push(KIT.part(cyl(0.062, 0.062, 0.1, 10), 'emissive.emergency', [px, y + 0.78, pz]));
      colliders.push(KIT.collider(px - 0.08, y, pz - 0.08, px + 0.08, y + 0.95, pz + 0.08, 'metal', 'bollard'));
    }
  }

  /* ---------------- Ceiling-void services (visible through missing tiles) --- */
  {
    const svc = [
      KIT.duct({ x0: -20, z0: -7, x1: 20, z1: -7, y: 3.5, size: 0.5 }),
      KIT.duct({ x0: 0, z0: -6.6, x1: 0, z1: 14, y: 3.5, size: 0.42 }),
      KIT.pipeRun({ x0: -20, z0: -6.4, x1: 20, z1: -6.4, y: 3.62, r: 0.045, count: 3 }),
      KIT.cableTray({ x0: -14, z0: 9.9, x1: 20, z1: 9.9, y: 3.55 }),
      KIT.duct({ x0: -30, z0: -14.5, x1: -22, z1: -14.5, y: 3.6, size: 0.6 }),
    ];
    for (const s of svc) { parts.push(...s.parts); }
  }

  return { parts, colliders, glassPanes, doorSlots };
}

/** Diagnostics used by the QA overlay and the layout unit checks. */
export function shellReport() {
  const runs = wallRuns();
  const perFloor = {};
  for (const r of runs) {
    perFloor[r.floor] = (perFloor[r.floor] ?? 0) + 1;
  }
  const uncovered = [];
  for (const r of INTERIOR_ROOMS) {
    if (r.insideOf) continue;
    const c = [(r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2];
    if (!roomAt(c[0], c[1], r.floor)) uncovered.push(r.id);
  }
  return { wallRuns: runs.length, perFloor, uncovered, rooms: ROOMS.length, openings: OPENINGS.length, voids: UPPER_VOIDS.length };
}
