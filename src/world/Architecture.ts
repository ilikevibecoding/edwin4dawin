import * as THREE from 'three';
import { Rng, clamp } from '../core/MathUtils';
import type { MaterialName } from '../core/Interfaces';
import type { Batcher } from './Batcher';
import {
  FX_ALL,
  FX_NX,
  FX_NY,
  FX_NZ,
  FX_PX,
  FX_PY,
  FX_NO_BOTTOM,
  FX_PZ,
  FX_SIDES,
  addBox,
  addCylinder,
  addQuad,
  addTube,
  addWedge,
  type RGB,
} from './Geo';
import type { Terrain } from './Terrain';
import { PARAPET_H, STOREY, cellFor, type Rect } from './Layout';

/**
 * A small library of parametric architectural components.
 *
 * The rule the whole level is built to: **nothing is a bare box**. A wall
 * carries a plinth, a string course at every floor, a cornice, a parapet with
 * coping, and openings that are genuinely cut through it so their jambs, heads
 * and sills are real surfaces with real depth. That silhouette and that edge
 * depth are the entire difference between a building and a textured cube, and
 * they cost a few dozen triangles each.
 *
 * Walls are decomposed on a grid derived from their own openings, so an
 * arbitrary arrangement of doors, windows and blast holes produces a watertight
 * panel with no coincident faces and no interior geometry the player can never
 * see.
 */

export interface BuildCtx {
  batch: Batcher;
  rng: Rng;
  terrain: Terrain;
}

export type OpeningKind = 'window' | 'door' | 'arch' | 'shop' | 'garage' | 'hole' | 'vent';
export type Glazing = 'clear' | 'broken' | 'none' | 'boarded' | 'shutter';

/*
 * Shutters, gates and railings all draw from `metal_painted`, and both of these
 * exist because of how that material is built: petrol-blue enamel with an iron
 * oxide rust front eating through it, tiling at 1.6 m.
 *
 * The tint leans away from red. Library albedos are authored in sRGB and
 * linearised before the vertex colour reaches them, which roughly squares their
 * channel ratios: the rust front is (0.47, 0.30, 0.19) on the page and
 * (0.19, 0.07, 0.03) by the time it is shaded. Warmed toward the cream a shop
 * shutter on this coast would be painted, that becomes the loudest colour in any
 * shot containing it, and a courtyard framed by a two-metre roller shutter came
 * back looking splashed with paint. Faded blue — which is what half the shutters
 * and doors in a town like this are anyway — keeps the oxide browner and darker
 * than the panel it sits on, which is the only condition under which it reads as
 * rust at all. The uv scale then puts the rust front at the size of real pitting
 * rather than half-metre blooms.
 */
const PAINTED_METAL: RGB = [0.98, 1.62, 2.3];
const PAINTED_METAL_UV = 2.4;

/*
 * Face masks for joinery sunk into a reveal.
 *
 * `fillOpening` builds its boxes in the wall's local frame, so local +Z is the
 * outward normal and the members sit 5–9 cm behind the masonry face. A 70 mm
 * frame member in a 190 mm reveal can only ever present its front and its two
 * long sides: the back is against the glass, and the short ends are buried in
 * the jamb it dies into.
 *
 * That distinction is worth making because window joinery is not a rounding
 * error. Six members per opening at twelve triangles each, over a town with
 * something like two hundred and sixty glazed openings on it, made the door
 * material the third heaviest thing in the level — ninety thousand triangles of
 * mullion, most of them facing into the back of a pane of glass.
 */
const FRAME_UPRIGHT = FX_PZ | FX_PX | FX_NX;
const FRAME_RAIL = FX_PZ | FX_PY | FX_NY;

export interface Opening {
  /** Centre of the opening measured along the wall from its start point. */
  u: number;
  w: number;
  h: number;
  /** Height of the sill above this storey's floor. */
  sill: number;
  /** Storey index; 0 is the ground floor. */
  floor?: number;
  kind?: OpeningKind;
  glass?: Glazing;
  /** Adds a projecting balcony below the opening. */
  balcony?: boolean;
  /** Adds a fabric awning above the opening. */
  awning?: boolean;
  /** Adds an air-conditioning unit clamped under the sill. */
  ac?: boolean;
  /** Skips the projecting stone sill; wanted for doors and shopfronts. */
  noSill?: boolean;
}

export interface WallOpts {
  ctx: BuildCtx;
  cell: string;
  /** Wall runs from (x0,z0) to (x1,z1); the outward face is on its right. */
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  yBase: number;
  height: number;
  thickness?: number;
  material: MaterialName;
  /** Trim material for sills, lintels and copings. */
  trim?: MaterialName;
  color?: RGB;
  openings?: Opening[];
  storey?: number;
  /** Emits the inner face. Off for the back of a scenery-only block. */
  inner?: boolean;
  /**
   * Material and colour for the room side of the wall.
   *
   * Without this the inside of a building is the outside of it, and an interior
   * shot reads as a courtyard: sunlit ochre render, weather staining, the lot.
   * Painted plaster on the inner face is the single cheapest thing that makes a
   * room read as a room.
   */
  innerMaterial?: MaterialName;
  innerColor?: RGB;
  grime?: number;
  /** Adds a wider base course along the bottom of the wall. */
  plinth?: number;
  /** Projecting string courses at each floor level and under the roof. */
  courses?: boolean;
  /** Storeys, when the wall runs below grade and `height` cannot imply it. */
  floors?: number;
  /** Bullet scars, blast damage and staining. */
  wear?: number;
  /** Vertical offset applied to every opening; interiors on a raised slab. */
  floorLift?: number;
  /** Projecting vertical strips at these distances along the wall: the party
   *  walls between houses in a terrace, and the thing that stops a long
   *  facade reading as one extruded rectangle. */
  pilasters?: number[];
  /**
   * Shifts this wall's sample of its material. Pass one value per building so
   * neighbouring blocks in the same render do not draw the same fallen patch at
   * the same height; see `BoxOpts.uvOffset`.
   */
  uvOffset?: readonly [number, number];
  /**
   * Scenery detail level, for the unenterable blocks that bound the map.
   *
   * The nine backdrop blocks are twenty to ninety metres from anywhere a player
   * can stand and are the far layer of every shot, and they were being built to
   * the same specification as the café the player fights inside: sills with
   * returns, architraves, six glazing bars per opening, balconies with a
   * baluster every seventeen centimetres. On a five-storey block forty-four
   * metres deep that is two hundred and ten openings, and across the nine of
   * them it came to more than a fifth of the level's geometry — spent on
   * joinery that is a pixel wide at the distance it is seen from, on a building
   * nobody can approach.
   *
   * What survives is everything that reads at range: the recess, the dark
   * reveal, the sill and lintel shadow lines, courses, cornice, pilasters and
   * parapet. What goes is the joinery inside the hole.
   */
  backdrop?: boolean;
}

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _d = new THREE.Vector3();

/** Sorted unique values, used to build the wall decomposition grid. */
function axis(values: number[]): number[] {
  const out = values.slice().sort((p, q) => p - q);
  const res: number[] = [];
  for (const v of out) {
    if (res.length === 0 || v - res[res.length - 1] > 1e-4) res.push(v);
  }
  return res;
}

/* ------------------------------- walls ---------------------------------- */

export function buildWall(o: WallOpts): void {
  const { ctx } = o;
  const dx = o.x1 - o.x0;
  const dz = o.z1 - o.z0;
  const length = Math.hypot(dx, dz);
  if (length < 0.05) return;
  const ux = dx / length;
  const uz = dz / length;
  const rotY = Math.atan2(-uz, ux);
  const nx = -uz;
  const nz = ux;
  const t = o.thickness ?? 0.32;
  const color = o.color ?? [1, 1, 1];
  const trim: MaterialName = o.trim ?? 'concrete';
  const buf = ctx.batch.solid(o.material, o.cell);
  const trimBuf = ctx.batch.solid(trim, o.cell);
  const storey = o.storey ?? STOREY;
  const lift = o.floorLift ?? 0;

  /** Places a box in wall space: u along the wall, y world, d inward depth. */
  const panel = (
    u0: number, u1: number, y0: number, y1: number,
    depth0: number, depth1: number,
    faces: number,
    target = buf,
    col = color,
    grime = o.grime ?? 0,
  ): void => {
    const um = (u0 + u1) * 0.5;
    const dm = (depth0 + depth1) * 0.5;
    const cx = o.x0 + ux * um + nx * dm;
    const cz = o.z0 + uz * um + nz * dm;
    addBox(target, cx, (y0 + y1) * 0.5, cz, u1 - u0, y1 - y0, depth1 - depth0, {
      rotY,
      color: col,
      faces,
      grime,
      grimeHeight: 0.7,
      uvOffset: o.uvOffset,
    });
  };

  const openings = (o.openings ?? []).map((op) => {
    const floor = op.floor ?? 0;
    const base = o.yBase + lift + floor * storey;
    return {
      op,
      u0: op.u - op.w * 0.5,
      u1: op.u + op.w * 0.5,
      y0: base + op.sill,
      y1: base + op.sill + op.h,
    };
  });

  const yTop = o.yBase + o.height;
  const us = axis([0, length, ...openings.flatMap((x) => [clamp(x.u0, 0, length), clamp(x.u1, 0, length)])]);
  const ys = axis([o.yBase, yTop, ...openings.flatMap((x) => [clamp(x.y0, o.yBase, yTop), clamp(x.y1, o.yBase, yTop)])]);

  const nu = us.length - 1;
  const ny = ys.length - 1;
  const solid: boolean[] = new Array(nu * ny).fill(true);
  for (let j = 0; j < ny; j++) {
    const cy = (ys[j] + ys[j + 1]) * 0.5;
    for (let i = 0; i < nu; i++) {
      const cu = (us[i] + us[i + 1]) * 0.5;
      for (const op of openings) {
        if (cu > op.u0 && cu < op.u1 && cy > op.y0 && cy < op.y1) {
          solid[j * nu + i] = false;
          break;
        }
      }
    }
  }
  const isSolid = (i: number, j: number): boolean =>
    i >= 0 && j >= 0 && i < nu && j < ny && solid[j * nu + i];

  const inner = o.inner !== false;
  // A plaster skin on the room side, a centimetre proud of the structure, so the
  // interior can be a different material and colour from the facade.
  const skinBuf = o.innerMaterial ? ctx.batch.solid(o.innerMaterial, o.cell) : null;
  const skinColor = o.innerColor ?? [1.06, 1.04, 1.0];
  for (let j = 0; j < ny; j++) {
    let i = 0;
    while (i < nu) {
      if (!solid[j * nu + i]) {
        i++;
        continue;
      }
      // Merge the run so a plain wall costs one box rather than one per column.
      let k = i;
      while (k + 1 < nu && solid[j * nu + k + 1]) k++;
      let faces = FX_PZ | (inner && !skinBuf ? FX_NZ : 0);
      if (!isSolid(i - 1, j)) faces |= FX_NX;
      if (!isSolid(k + 1, j)) faces |= FX_PX;
      if (!isSolid(i, j + 1) || !isSolid(k, j + 1)) faces |= FX_PY;
      if (!isSolid(i, j - 1) || !isSolid(k, j - 1)) faces |= FX_NY;
      panel(us[i], us[k + 1], ys[j], ys[j + 1], -t, 0, faces);
      if (inner && skinBuf) {
        panel(us[i], us[k + 1], ys[j], ys[j + 1], -t - 0.012, -t, FX_NZ,
          skinBuf, skinColor, 0);
      }
      i = k + 1;
    }
  }

  /* ------------------------- plinth and courses ------------------------- */

  if (o.plinth && o.plinth > 0) {
    panel(0, length, o.yBase - 0.3, o.yBase + lift + o.plinth, -t - 0.02, 0.09,
      FX_PZ | FX_PY | FX_PX | FX_NX, trimBuf, [color[0] * 0.92, color[1] * 0.91, color[2] * 0.9], 0.4);
  }

  if (o.courses !== false) {
    const floors = o.floors ?? Math.max(1, Math.round(o.height / storey));
    for (let f = 1; f < floors; f++) {
      const y = o.yBase + lift + f * storey - 0.16;
      panel(0, length, y, y + 0.16, -t, 0.07, FX_PZ | FX_PY | FX_NY,
        trimBuf, [color[0] * 1.03, color[1] * 1.02, color[2] * 1.0], 0);
    }
    /*
     * A course at door-head height on any storey tall enough to need one.
     *
     * A single-storey workshop or shop with a four-metre floor-to-ceiling has
     * nothing at all between its plinth and its cornice, and however good the
     * plaster is, five metres of unbroken wall reads as an extruded plane. Real
     * ones carry a band at the head of the openings, and it is run in segments
     * between them rather than straight across, which is both what happens on
     * site and the only way this can avoid cutting a window in half.
     */
    if (storey > 3.4) {
      const y = o.yBase + lift + 2.42;
      const gaps: Array<[number, number]> = openings
        .filter((x) => x.y0 < y + 0.2 && x.y1 > y - 0.05)
        .map((x) => [x.u0 - 0.12, x.u1 + 0.12] as [number, number])
        .sort((p, q) => p[0] - q[0]);
      let u = 0;
      for (const [g0, g1] of gaps) {
        if (g0 - u > 0.4) {
          panel(u, Math.min(g0, length), y, y + 0.14, -t, 0.06,
            FX_PZ | FX_PY | FX_NY | FX_PX | FX_NX,
            trimBuf, [color[0] * 1.04, color[1] * 1.03, color[2] * 1.0], 0);
        }
        u = Math.max(u, g1);
      }
      if (length - u > 0.4) {
        panel(u, length, y, y + 0.14, -t, 0.06, FX_PZ | FX_PY | FX_NY | FX_PX | FX_NX,
          trimBuf, [color[0] * 1.04, color[1] * 1.03, color[2] * 1.0], 0);
      }
    }
    // Cornice under the roof, with a thinner drip beneath it.
    const cy = yTop - 0.3;
    panel(0, length, cy, cy + 0.3, -t, 0.13, FX_PZ | FX_PY | FX_PX | FX_NX,
      trimBuf, [color[0] * 1.05, color[1] * 1.04, color[2] * 1.02], 0);
    panel(0, length, cy - 0.09, cy, -t, 0.07, FX_PZ | FX_NY,
      trimBuf, [color[0] * 0.86, color[1] * 0.85, color[2] * 0.84], 0);
  }

  /* ------------------------------ pilasters ------------------------------ */

  if (o.pilasters) {
    const capped = o.courses !== false;
    const top = capped ? yTop - 0.4 : yTop - 0.02;
    const base = o.yBase + lift + (o.plinth ?? 0) - 0.04;
    if (top > base + 0.5) {
      for (const u of o.pilasters) {
        if (u < 0.3 || u > length - 0.3) continue;
        // Skip any that would cut across an opening: a party wall through a
        // window is worse than no party wall.
        let clash = false;
        for (const op of openings) {
          if (op.u1 > u - 0.32 && op.u0 < u + 0.32) { clash = true; break; }
        }
        if (clash) continue;
        panel(u - 0.22, u + 0.22, base, top, -0.02, 0.1,
          FX_PZ | FX_PX | FX_NX | FX_PY | FX_NY, buf,
          [color[0] * 0.985, color[1] * 0.985, color[2] * 0.99], (o.grime ?? 0) * 0.7);
        // A moulded head, so the strip terminates instead of being cut off.
        panel(u - 0.3, u + 0.3, top, top + 0.13, -0.02, 0.15,
          FX_PZ | FX_PX | FX_NX | FX_PY | FX_NY, trimBuf,
          [color[0] * 1.05, color[1] * 1.04, color[2] * 1.02], 0);
      }
    }
  }

  /* --------------------------- opening trim ----------------------------- */

  for (const { op, u0, u1, y0, y1 } of openings) {
    if (u1 <= 0.02 || u0 >= length - 0.02) continue;
    const kind = op.kind ?? 'window';
    const reveal = kind === 'garage' || kind === 'shop' ? 0.1 : 0.19;

    // Stone sill, projecting and returned past the jambs.
    if (!op.noSill && kind !== 'door' && kind !== 'garage' && kind !== 'hole') {
      panel(u0 - 0.11, u1 + 0.11, y0 - 0.1, y0, -t, 0.08, FX_ALL & ~FX_NZ, trimBuf,
        [color[0] * 1.06, color[1] * 1.05, color[2] * 1.02], 0.1);
    }
    // Lintel over the head.
    if (kind !== 'hole' && kind !== 'arch') {
      panel(u0 - 0.13, u1 + 0.13, y1, y1 + 0.16, -t, 0.05, FX_ALL & ~FX_NZ, trimBuf,
        [color[0] * 1.02, color[1] * 1.01, color[2] * 0.99], 0);
    }
    // Architrave: a shallow surround so the hole reads as framed, not punched.
    if (!o.backdrop && (kind === 'window' || kind === 'door' || kind === 'shop')) {
      const s = 0.09;
      panel(u0 - s, u0, y0 - 0.1, y1 + 0.16, -0.06, 0.035, FX_PZ | FX_PX | FX_NX | FX_PY | FX_NY,
        trimBuf, [color[0] * 1.04, color[1] * 1.03, color[2] * 1.0], 0.1);
      panel(u1, u1 + s, y0 - 0.1, y1 + 0.16, -0.06, 0.035, FX_PZ | FX_PX | FX_NX | FX_PY | FX_NY,
        trimBuf, [color[0] * 1.04, color[1] * 1.03, color[2] * 1.0], 0.1);
    }
    if (kind === 'arch') buildArchHead(o, u0, u1, y1, t, rotY, ux, uz, nx, nz, trimBuf, color);

    fillOpening(o, op, u0, u1, y0, y1, t, reveal, rotY, ux, uz, nx, nz, color);

    if (op.balcony) {
      buildBalcony({
        ctx,
        cell: o.cell,
        x: o.x0 + ux * op.u + nx * 0.02,
        z: o.z0 + uz * op.u + nz * 0.02,
        y: y0 - 0.06,
        width: op.w + 0.9,
        depth: 1.15,
        rotY,
        color,
        balusterPitch: o.backdrop ? 0.44 : undefined,
      });
    }
    if (op.awning) {
      buildAwning({
        ctx,
        cell: o.cell,
        x: o.x0 + ux * op.u,
        z: o.z0 + uz * op.u,
        y: y1 + 0.22,
        width: op.w + 0.7,
        depth: 1.25,
        rotY,
        drop: 0.34,
      });
    }
    if (op.ac) {
      const acBuf = ctx.batch.solid('metal_painted', o.cell);
      const bx = o.x0 + ux * (op.u + op.w * 0.34) + nx * 0.28;
      const bz = o.z0 + uz * (op.u + op.w * 0.34) + nz * 0.28;
      addBox(acBuf, bx, y0 - 0.42, bz, 0.78, 0.5, 0.44, {
        rotY, color: [0.86, 0.85, 0.82], grime: 0.4,
      });
      const br = ctx.batch.solid('metal_rusted', o.cell);
      addBox(br, bx, y0 - 0.7, bz, 0.7, 0.06, 0.4, { rotY, color: [0.7, 0.65, 0.6] });
    }
  }

  if (o.wear && o.wear > 0) applyWallWear(o, length, ux, uz, nx, nz, rotY, color);
}

/** Glass, boards, shutters or nothing, set back inside the reveal. */
function fillOpening(
  o: WallOpts,
  op: Opening,
  u0: number, u1: number, y0: number, y1: number,
  t: number, reveal: number,
  rotY: number, ux: number, uz: number, nx: number, nz: number,
  color: RGB,
): void {
  const { ctx } = o;
  const kind = op.kind ?? 'window';
  const glass = op.glass ?? (kind === 'window' ? 'clear' : 'none');
  const at = (u: number, depth: number, out: THREE.Vector3): THREE.Vector3 =>
    out.set(o.x0 + ux * u + nx * depth, 0, o.z0 + uz * u + nz * depth);

  const frameBuf = ctx.batch.solid('wood_door', o.cell);
  const box = (
    target: ReturnType<Batcher['solid']>,
    ua: number, ub: number, ya: number, yb: number, d0: number, d1: number, col: RGB,
    faces = FX_ALL, uvScale?: number,
  ): void => {
    at((ua + ub) * 0.5, (d0 + d1) * 0.5, _a);
    addBox(target, _a.x, (ya + yb) * 0.5, _a.z, ub - ua, yb - ya, d1 - d0, {
      rotY, color: col, faces, uvScale,
    });
  };

  /*
   * Scenery openings: one dark plane in the back of the reveal.
   *
   * At the distance a backdrop block is seen from, an opening reads entirely by
   * its shadow — the reveal edge catching the sun on one side and the hole going
   * black. Whether that black is a pane, a shutter or a room is not information
   * the image carries, so this is two triangles where the full path is a hundred.
   */
  if (o.backdrop) {
    if (kind === 'hole' || kind === 'vent') return;
    const dark: RGB = glass === 'boarded'
      ? [color[0] * 0.5, color[1] * 0.47, color[2] * 0.43]
      : [0.13, 0.14, 0.16];
    box(frameBuf, u0 + 0.01, u1 - 0.01, y0 + 0.01, y1 - 0.01,
      -reveal - 0.04, -reveal - 0.02, dark, FX_PZ);
    return;
  }

  if (kind === 'door') {
    // Frame plus a leaf hung slightly ajar; a flat plane in a hole reads dead.
    box(frameBuf, u0, u0 + 0.07, y0, y1, -reveal - 0.09, -reveal, [0.8, 0.76, 0.7], FRAME_UPRIGHT);
    box(frameBuf, u1 - 0.07, u1, y0, y1, -reveal - 0.09, -reveal, [0.8, 0.76, 0.7], FRAME_UPRIGHT);
    box(frameBuf, u0, u1, y1 - 0.08, y1, -reveal - 0.09, -reveal, [0.8, 0.76, 0.7], FRAME_RAIL);
    if (glass !== 'none') {
      const swing = op.glass === 'broken' ? 0.55 : 0.12;
      const hinge = u0 + 0.07;
      const leafW = (u1 - u0) - 0.14;
      const cs = Math.cos(swing);
      const sn = Math.sin(swing);
      at(hinge + (leafW * 0.5) * cs, -reveal - 0.02 - (leafW * 0.5) * sn, _a);
      addBox(frameBuf, _a.x, (y0 + y1) * 0.5 + 0.02, _a.z, leafW, y1 - y0 - 0.06, 0.06, {
        rotY: rotY - swing, color: [0.86, 0.8, 0.72], grime: 0.28,
      });
    }
    return;
  }

  if (kind === 'garage') {
    // A roller shutter, partly raised. The slats are modelled rather than
    // relying on a corrugated material, because a roller shutter's ribs are
    // 8 cm apart and a couple of millimetres deep, and any texture-space
    // approximation of that reads as industrial roofing sheet instead.
    const shutterBuf = ctx.batch.solid('metal_painted', o.cell);
    const rail = ctx.batch.solid('metal_rusted', o.cell);
    const open = 1.05;
    const top = y1 - 0.16;
    box(shutterBuf, u0 + 0.05, u1 - 0.05, y0 + open, top, -reveal - 0.05, -reveal,
      PAINTED_METAL, FX_ALL, PAINTED_METAL_UV);
    const slats = Math.max(3, Math.floor((top - y0 - open) / 0.11));
    for (let i = 0; i < slats; i++) {
      const sy = y0 + open + 0.045 + ((top - y0 - open - 0.09) * i) / Math.max(1, slats - 1);
      box(shutterBuf, u0 + 0.05, u1 - 0.05, sy, sy + 0.045, -reveal - 0.075, -reveal - 0.045,
        [PAINTED_METAL[0] * 0.85, PAINTED_METAL[1] * 0.85, PAINTED_METAL[2] * 0.83],
        FRAME_RAIL, PAINTED_METAL_UV);
    }
    // Bottom rail with a lifting handle, and the drum housing above the head.
    box(rail, u0 + 0.03, u1 - 0.03, y0 + open - 0.09, y0 + open, -reveal - 0.09, -reveal - 0.02,
      [0.62, 0.7, 0.74], FX_ALL, 2.0);
    box(rail, (u0 + u1) * 0.5 - 0.14, (u0 + u1) * 0.5 + 0.14, y0 + open - 0.06, y0 + open - 0.01,
      -reveal - 0.14, -reveal - 0.09, [0.58, 0.66, 0.7]);
    box(rail, u0 + 0.02, u1 - 0.02, top, y1, -reveal - 0.16, -reveal + 0.01, [0.7, 0.78, 0.8], FX_ALL, 2.0);
    box(rail, u0, u0 + 0.09, y0, y1, -reveal - 0.1, -reveal + 0.02, [0.66, 0.74, 0.76]);
    box(rail, u1 - 0.09, u1, y0, y1, -reveal - 0.1, -reveal + 0.02, [0.66, 0.74, 0.76]);
    return;
  }

  if (kind === 'hole' || kind === 'vent') return;

  if (glass === 'boarded') {
    const plankBuf = ctx.batch.solid('wood_planks', o.cell);
    const n = 3 + (Math.abs(Math.round(op.u * 7)) % 2);
    for (let i = 0; i < n; i++) {
      const ty = y0 + 0.18 + ((y1 - y0 - 0.36) * i) / Math.max(1, n - 1);
      const skew = ((i % 2) - 0.5) * 0.11;
      at((u0 + u1) * 0.5, -reveal - 0.03, _a);
      addBox(plankBuf, _a.x, ty, _a.z, (u1 - u0) + 0.22, 0.19, 0.045, {
        rotY, color: [0.9, 0.84, 0.74], grime: 0.2, faces: FX_ALL & ~FX_NZ,
      });
      void skew;
    }
    return;
  }

  if (glass === 'shutter') {
    const shutterBuf = ctx.batch.solid('metal_painted', o.cell);
    for (const side of [0, 1]) {
      const ua = side === 0 ? u0 + 0.03 : (u0 + u1) * 0.5 + 0.02;
      const ub = side === 0 ? (u0 + u1) * 0.5 - 0.02 : u1 - 0.03;
      box(shutterBuf, ua, ub, y0 + 0.03, y1 - 0.03, -reveal - 0.05, -reveal,
        PAINTED_METAL, FX_ALL, PAINTED_METAL_UV);
      for (let s = 0; s < 5; s++) {
        const sy = y0 + 0.16 + ((y1 - y0 - 0.32) * s) / 4;
        box(shutterBuf, ua + 0.04, ub - 0.04, sy, sy + 0.05, -reveal - 0.09, -reveal - 0.05,
          [PAINTED_METAL[0] * 0.86, PAINTED_METAL[1] * 0.86, PAINTED_METAL[2] * 0.85],
          FRAME_RAIL, PAINTED_METAL_UV);
      }
    }
    return;
  }

  // Glazed. Mullions first, then the pane behind them.
  const glassMat: MaterialName = glass === 'broken' ? 'glass_broken' : 'glass';
  const FR: RGB = [0.78, 0.74, 0.68];
  box(frameBuf, u0 + 0.02, u1 - 0.02, y0 + 0.02, y0 + 0.09, -reveal - 0.07, -reveal, FR, FRAME_RAIL);
  box(frameBuf, u0 + 0.02, u1 - 0.02, y1 - 0.09, y1 - 0.02, -reveal - 0.07, -reveal, FR, FRAME_RAIL);
  box(frameBuf, u0 + 0.02, u0 + 0.09, y0 + 0.02, y1 - 0.02, -reveal - 0.07, -reveal, FR, FRAME_UPRIGHT);
  box(frameBuf, u1 - 0.09, u1 - 0.02, y0 + 0.02, y1 - 0.02, -reveal - 0.07, -reveal, FR, FRAME_UPRIGHT);
  const midU = (u0 + u1) * 0.5;
  box(frameBuf, midU - 0.035, midU + 0.035, y0 + 0.02, y1 - 0.02, -reveal - 0.06, -reveal,
    FR, FRAME_UPRIGHT);
  if (y1 - y0 > 1.2) {
    const midY = (y0 + y1) * 0.5;
    box(frameBuf, u0 + 0.02, u1 - 0.02, midY - 0.035, midY + 0.035, -reveal - 0.06, -reveal,
      FR, FRAME_RAIL);
  }

  if (glass === 'broken') {
    // Shards clinging to the frame rather than a full pane.
    const shard = ctx.batch.solid('glass_broken', o.cell);
    const seed = Math.abs(Math.round((op.u + y0) * 31)) % 7;
    for (let i = 0; i < 4; i++) {
      if ((seed + i) % 3 === 0) continue;
      const ua = u0 + 0.06 + ((u1 - u0 - 0.12) * (i % 2)) / 2;
      const ub = ua + (u1 - u0 - 0.12) / 2.2;
      const ya = i < 2 ? y1 - 0.5 : y0 + 0.06;
      // 15 mm of glass has no readable edge; two faces are the whole shard.
      box(shard, ua, Math.min(ub, u1 - 0.06), ya, ya + 0.42, -reveal - 0.03, -reveal - 0.015,
        [1, 1, 1], FX_PZ | FX_NZ);
    }
  } else {
    const paneBuf = ctx.batch.solid(glassMat, o.cell);
    at((u0 + u1) * 0.5, -reveal - 0.025, _a);
    addBox(paneBuf, _a.x, (y0 + y1) * 0.5, _a.z, u1 - u0 - 0.1, y1 - y0 - 0.1, 0.02, {
      rotY, color: [1, 1, 1], faces: FX_PZ | FX_NZ,
    });
  }
  void color;
}

/** Voussoirs turned over an opening, for the souk and the town gate. */
function buildArchHead(
  o: WallOpts,
  u0: number, u1: number, springY: number,
  t: number, rotY: number,
  ux: number, uz: number, nx: number, nz: number,
  trimBuf: ReturnType<Batcher['solid']>,
  color: RGB,
): void {
  const r = (u1 - u0) * 0.5;
  const cu = (u0 + u1) * 0.5;
  const steps = 9;
  for (let i = 0; i < steps; i++) {
    const a0 = (i / steps) * Math.PI;
    const a1 = ((i + 1) / steps) * Math.PI;
    const am = (a0 + a1) * 0.5;
    const mu = cu - Math.cos(am) * (r + 0.16);
    const my = springY + Math.sin(am) * (r + 0.16);
    const cx = o.x0 + ux * mu + nx * -t * 0.5;
    const cz = o.z0 + uz * mu + nz * -t * 0.5;
    const seg = new THREE.Matrix4();
    void seg;
    addBox(trimBuf, cx, my, cz, 0.34, 0.42, t + 0.06, {
      rotY,
      color: [color[0] * 1.04, color[1] * 1.02, color[2] * 0.99],
    });
    // Each voussoir is tilted about the wall's own plane, which addBox cannot
    // express, so the wedge shape comes from overlapping short segments.
  }
}

/**
 * Bullet scars, blast damage and staining. A clean wall in a fought-over town
 * is the tell that nothing happened here.
 */
function applyWallWear(
  o: WallOpts,
  length: number,
  ux: number, uz: number, nx: number, nz: number,
  rotY: number,
  color: RGB,
): void {
  const { ctx } = o;
  const rng = ctx.rng;
  const amount = o.wear ?? 0;
  const top = Math.min(o.height - 0.5, 4.6);
  if (top < 1) return;

  /*
   * Damage is applied in the wall's own material, darkened by vertex colour.
   * Library materials tile at two to three metres, so a twenty-centimetre patch
   * of a damaged-concrete map is a random crop of one crack, and a wall covered
   * in them reads as grey scribble rather than as bullet damage. Matching the
   * surrounding texture and changing only the shade gives the shape back.
   *
   * All of it is single-faced. Every mark in this function is a decal lying
   * 6–20 mm proud of a wall — craters, halos, spalls, rain streaks, render
   * patches — and five of the six faces of a box that thin are either buried in
   * the masonry or edge-on at a millimetre. Drawn as full boxes this one
   * function was the largest single generator in the level: better than seventy
   * thousand triangles, most of them inside the wall they were decorating, and
   * every one of them redrawn in three shadow cascades.
   */
  const pockBuf = ctx.batch.solid(o.material, o.cell);
  // Bursts, because nobody fires one round at a wall.
  const bursts = Math.max(1, Math.round(length * amount * 0.22));
  for (let b = 0; b < bursts; b++) {
    const bu = rng.range(0.5, length - 0.5);
    const by = o.yBase + rng.range(0.6, top);
    const spreadU = rng.range(0.35, 1.5);
    const spreadY = rng.range(0.1, 0.6);
    const tiltU = rng.range(-1, 1);
    const shots = Math.round(rng.range(3, 9));
    for (let i = 0; i < shots; i++) {
      const t = (i / Math.max(1, shots - 1) - 0.5) * 2;
      const u = bu + t * spreadU + rng.range(-0.1, 0.1);
      const y = by + t * spreadY * tiltU + rng.range(-0.06, 0.06);
      if (u < 0.2 || u > length - 0.2 || y < o.yBase + 0.2) continue;
      const s = rng.range(0.05, 0.13);
      const k = rng.range(0.5, 0.72);
      // The crater, then a paler halo of blown render around it.
      addBox(pockBuf,
        o.x0 + ux * u + nx * 0.008, y, o.z0 + uz * u + nz * 0.008,
        s, s * rng.range(0.8, 1.2), 0.014,
        { rotY, color: [color[0] * k, color[1] * k * 0.98, color[2] * k * 0.96], faces: FX_PZ },
      );
      addBox(pockBuf,
        o.x0 + ux * u + nx * 0.004, y, o.z0 + uz * u + nz * 0.004,
        s * 2.1, s * 2.0, 0.006,
        { rotY, color: [color[0] * 1.03, color[1] * 1.0, color[2] * 0.96], faces: FX_PZ },
      );
    }
  }

  // A couple of large spalls, where the render has come off in sheets. These
  // are big enough to show the damaged-concrete map at the scale it was drawn.
  const spallBuf = ctx.batch.solid('concrete_damaged', o.cell);
  const spalls = Math.round(length * amount * 0.09);
  for (let i = 0; i < spalls; i++) {
    const u = rng.range(0.7, length - 0.7);
    const y = o.yBase + rng.range(0.4, top);
    const w = rng.range(0.7, 1.9);
    const h = rng.range(0.5, 1.5);
    addBox(spallBuf,
      o.x0 + ux * u + nx * 0.01, y, o.z0 + uz * u + nz * 0.01,
      w, h, 0.02,
      { rotY, color: [0.84, 0.81, 0.77], grime: 0.3, faces: FX_PZ },
    );
  }

  // Rain and rust streaks below the cornice, again in the wall's own material
  // so they read as staining rather than as a different surface.
  const streak = ctx.batch.solid(o.material, o.cell);
  const streaks = Math.round(length * amount * 0.7);
  for (let i = 0; i < streaks; i++) {
    const u = rng.range(0.3, length - 0.3);
    const h = rng.range(1.0, 3.0);
    const k = rng.range(0.72, 0.9);
    addBox(streak,
      o.x0 + ux * u + nx * 0.006, o.yBase + o.height - 0.42 - h * 0.5, o.z0 + uz * u + nz * 0.006,
      rng.range(0.1, 0.3), h, 0.012,
      { rotY, color: [color[0] * k, color[1] * k * 0.97, color[2] * k * 0.93], faces: FX_PZ },
    );
  }

  /*
   * Patches of newer render, a centimetre proud of the wall around them.
   *
   * These are here as much for the tiling as for the story. A library material
   * repeats every couple of metres, and on a bare fifteen-metre facade the eye
   * locks onto that period and reads the wall as stacked precast panels. A
   * handful of large patches at a slightly different tone, with their own uv
   * origin and a real edge to catch the sun, break the run without adding the
   * kind of high-frequency noise that would make the surface busy. Every one of
   * these buildings has been patched half a dozen times anyway.
   */
  const patchBuf = ctx.batch.solid(o.material, o.cell);
  const storey = o.storey ?? STOREY;
  const base = o.yBase + (o.floorLift ?? 0);
  const patches = Math.max(1, Math.round(length * 0.09));
  for (let i = 0; i < patches; i++) {
    const w = rng.range(1.6, 4.6);
    const h = rng.range(1.0, 2.8);
    if (length - w < 0.6 || o.height - h < 0.9) continue;
    const u = rng.range(0.2, length - w - 0.2);
    const y = base + rng.range(0.1, o.height - h - 0.6);
    // Skip any patch that would sit across an opening: a rendered-over window
    // is a different piece of storytelling and needs the opening filled first.
    let clash = false;
    for (const op of o.openings ?? []) {
      const oy0 = base + (op.floor ?? 0) * storey + op.sill;
      if (op.u + op.w * 0.5 > u - 0.15 && op.u - op.w * 0.5 < u + w + 0.15
        && oy0 + op.h > y - 0.15 && oy0 < y + h + 0.15) { clash = true; break; }
    }
    if (clash) continue;
    // Only a few per cent off the wall's tone. The point is to interrupt the
    // texture's period, not to draw a rectangle on the building — anything
    // stronger and the facade reads as papered over rather than patched.
    const k = rng.range(0.965, 1.035);
    const col: RGB = [
      color[0] * k, color[1] * k * rng.range(0.99, 1.01), color[2] * k * rng.range(0.98, 1.01),
    ];
    // Its own uv origin, so the patch does not continue the wall's pattern.
    const uvOffset: readonly [number, number] = [rng.range(0, 7), rng.range(0, 7)];
    /*
     * Three overlapping rectangles rather than one. A single rectangle is read as
     * a rectangle no matter how close its tone is to the wall — the eye finds the
     * four straight edges immediately — whereas a couple of offset lobes give a
     * stepped outline that reads as a trowelled repair.
     */
    const lobes = 2 + (rng.next() < 0.6 ? 1 : 0);
    for (let l = 0; l < lobes; l++) {
      const lw = l === 0 ? w : w * rng.range(0.35, 0.8);
      const lh = l === 0 ? h : h * rng.range(0.4, 0.9);
      const lu = l === 0 ? u : u + rng.range(-0.3, w - lw + 0.3);
      const ly = l === 0 ? y : y + rng.range(-0.25, h - lh + 0.25);
      addBox(patchBuf,
        o.x0 + ux * (lu + lw * 0.5) + nx * (0.01 + l * 0.003), ly + lh * 0.5,
        o.z0 + uz * (lu + lw * 0.5) + nz * (0.01 + l * 0.003),
        lw, lh, 0.02,
        { rotY, color: col, grime: rng.range(0, 0.18), uvOffset, faces: FX_PZ },
      );
    }
  }
}

/* ------------------------------ blast hole ------------------------------- */

/**
 * A shell hole punched through a wall: a ragged rim of broken masonry and
 * exposed reinforcement. Placed on top of a `hole` opening.
 */
export function buildBlastHole(
  ctx: BuildCtx,
  cell: string,
  x: number, y: number, z: number,
  rotY: number,
  w: number, h: number, thickness: number,
): void {
  const rubble = ctx.batch.solid('concrete_damaged', cell);
  const rng = ctx.rng;
  const steps = 14;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const rr = 1 + rng.range(-0.16, 0.1);
    const u = Math.cos(a) * w * 0.5 * rr;
    const v = Math.sin(a) * h * 0.5 * rr;
    const s = rng.range(0.14, 0.4);
    addBox(rubble,
      x + Math.cos(rotY) * u, y + v, z - Math.sin(rotY) * u,
      s, s * rng.range(0.7, 1.4), thickness * rng.range(0.7, 1.3),
      { rotY: rotY + rng.range(-0.4, 0.4), color: [0.86, 0.84, 0.8], grime: 0.3 },
    );
  }
  // Reinforcement bars hanging through the gap.
  const rebar = ctx.batch.solid('metal_rusted', cell);
  const bars = 3 + Math.floor(rng.next() * 3);
  for (let i = 0; i < bars; i++) {
    const u = rng.range(-w * 0.4, w * 0.4);
    const sag = rng.range(0.2, 0.7);
    _a.set(x + Math.cos(rotY) * u, y + h * 0.45, z - Math.sin(rotY) * u);
    _b.set(
      x + Math.cos(rotY) * (u + rng.range(-0.3, 0.3)) + Math.sin(rotY) * rng.range(-0.2, 0.2),
      y + h * 0.45 - sag,
      z - Math.sin(rotY) * (u + rng.range(-0.3, 0.3)) + Math.cos(rotY) * rng.range(-0.2, 0.2),
    );
    addTube(rebar, _a, _b, 0.014, 4, [0.75, 0.6, 0.48]);
  }
}

/* -------------------------------- roof ---------------------------------- */

export interface RoofOpts {
  ctx: BuildCtx;
  cell: string;
  rect: Rect;
  y: number;
  thickness?: number;
  material?: MaterialName;
  color?: RGB;
  parapet?: number;
  /** Skips the parapet on a side so a plank bridge or stair can land. */
  openSides?: Partial<Record<'north' | 'south' | 'east' | 'west', boolean>>;
  /** Coping stones along the parapet top. */
  coping?: boolean;
  /** Skirting the slab with a projecting edge; reads as a real roof edge. */
  overhang?: number;
}

export function buildRoof(o: RoofOpts): void {
  const { ctx, rect: r } = o;
  const mat: MaterialName = o.material ?? 'concrete';
  const buf = ctx.batch.solid(mat, o.cell);
  const th = o.thickness ?? 0.28;
  const over = o.overhang ?? 0.14;
  const color = o.color ?? [0.94, 0.92, 0.88];

  /*
   * The deck is lifted well above the parapet's value, which looks wrong in the
   * material editor and is right in the scene. The sun here sits six degrees up,
   * so a horizontal surface collects a tenth of the beam a west-facing wall
   * does: matched albedos put a near-black floor under every rooftop camera in
   * a frame where the walls behind it were burning ochre. Real flat roofs in
   * this town are a pale sand screed under permanently blown dust anyway, which
   * is the brightest albedo on the building.
   */
  addBox(buf, (r.x0 + r.x1) * 0.5, o.y - th * 0.5, (r.z0 + r.z1) * 0.5,
    r.x1 - r.x0 + over * 2, th, r.z1 - r.z0 + over * 2,
    { color: [color[0] * 1.34, color[1] * 1.3, color[2] * 1.2], faces: FX_ALL });

  const p = o.parapet ?? PARAPET_H;
  if (p <= 0) return;
  const open = o.openSides ?? {};
  const tW = 0.24;
  const copeBuf = ctx.batch.solid('concrete', o.cell);
  const sides: Array<['north' | 'south' | 'east' | 'west', number, number, number, number]> = [
    ['north', (r.x0 + r.x1) * 0.5, r.z0 + tW * 0.5, r.x1 - r.x0, tW],
    ['south', (r.x0 + r.x1) * 0.5, r.z1 - tW * 0.5, r.x1 - r.x0, tW],
    ['west', r.x0 + tW * 0.5, (r.z0 + r.z1) * 0.5, tW, r.z1 - r.z0 - tW * 2],
    ['east', r.x1 - tW * 0.5, (r.z0 + r.z1) * 0.5, tW, r.z1 - r.z0 - tW * 2],
  ];
  for (const [name, cx, cz, sx, sz] of sides) {
    if (open[name]) continue;
    addBox(buf, cx, o.y + p * 0.5, cz, sx, p, sz, { color, grime: 0.12 });
    if (o.coping !== false) {
      addBox(copeBuf, cx, o.y + p + 0.05, cz, sx + 0.13, 0.1, sz + 0.13, {
        color: [color[0] * 1.06, color[1] * 1.05, color[2] * 1.02],
      });
    }
  }
}

/* ------------------------------- stairs ---------------------------------- */

export interface StairOpts {
  ctx: BuildCtx;
  cell: string;
  /** Bottom-centre of the first tread. */
  x: number;
  y: number;
  z: number;
  /** Direction of ascent in radians; 0 climbs toward +X. */
  rotY: number;
  width: number;
  rise: number;
  /** Total climb. */
  height: number;
  tread?: number;
  material?: MaterialName;
  color?: RGB;
  /** Solid masonry sides rather than open treads. */
  solid?: boolean;
  /** Adds a low parapet along one or both sides. */
  railing?: 'none' | 'left' | 'right' | 'both';
}

export function buildStair(o: StairOpts): { topX: number; topZ: number; topY: number } {
  const { ctx } = o;
  const mat: MaterialName = o.material ?? 'concrete';
  const buf = ctx.batch.solid(mat, o.cell);
  const rise = o.rise ?? 0.19;
  const tread = o.tread ?? 0.29;
  const steps = Math.max(1, Math.round(o.height / rise));
  const actualRise = o.height / steps;
  // Warm and well off white. Concrete steps in this town are cast in the local
  // sand and then walked on for thirty years.
  const color = o.color ?? [0.9, 0.85, 0.77];
  const cs = Math.cos(o.rotY);
  const sn = -Math.sin(o.rotY);

  for (let i = 0; i < steps; i++) {
    const d = (i + 0.5) * tread;
    const y = o.y + (i + 0.5) * actualRise;
    const cx = o.x + cs * d;
    const cz = o.z + sn * d;
    if (o.solid) {
      addBox(buf, cx, o.y + (i + 0.5) * actualRise * 0.5 + 0.0, cz, tread, (i + 1) * actualRise, o.width, {
        rotY: o.rotY, color, grime: 0.3,
      });
    } else {
      /*
       * Riser and tread as separate pieces, the riser set back and darker.
       *
       * A flight built from one box per step has coplanar risers and treads in the
       * same tone, and from any distance at all that is a smooth pale wedge — the
       * villa's stair was reading as a snowdrift leaning on the wall. Setting the
       * riser back four centimetres puts a hard shadow under the nose of every
       * tread, and that line of shadows is the only thing that says "stair" from
       * across a courtyard.
       */
      addBox(buf, cx - Math.cos(o.rotY) * 0.04, y, cz + Math.sin(o.rotY) * 0.04,
        tread - 0.02, actualRise, o.width * 0.99, {
          rotY: o.rotY,
          color: [color[0] * 0.8, color[1] * 0.79, color[2] * 0.77],
          grime: 0.35,
          grimeHeight: actualRise,
        });
      addBox(buf, cx, y + actualRise * 0.5 - 0.03, cz, tread + 0.03, 0.06, o.width, {
        rotY: o.rotY, color: [color[0] * 1.03, color[1] * 1.02, color[2] * 1.0], grime: 0.15,
      });
    }
  }

  const rail = o.railing ?? 'none';
  if (rail !== 'none') {
    const sides = rail === 'both' ? [-1, 1] : rail === 'left' ? [-1] : [1];
    const perpX = Math.sin(o.rotY);
    const perpZ = Math.cos(o.rotY);
    for (const s of sides) {
      for (let i = 0; i < steps; i++) {
        const d = (i + 0.5) * tread;
        const y = o.y + (i + 0.5) * actualRise + 0.45;
        addBox(buf,
          o.x + cs * d + perpX * s * (o.width * 0.5 - 0.07),
          y,
          o.z + sn * d + perpZ * s * (o.width * 0.5 - 0.07),
          tread + 0.02, 0.9, 0.14,
          { rotY: o.rotY, color: [color[0] * 0.97, color[1] * 0.96, color[2] * 0.94], grime: 0.2 },
        );
      }
    }
  }

  return {
    topX: o.x + cs * steps * tread,
    topY: o.y + o.height,
    topZ: o.z + sn * steps * tread,
  };
}

/* ------------------------------- balcony --------------------------------- */

export interface BalconyOpts {
  ctx: BuildCtx;
  cell: string;
  x: number;
  y: number;
  z: number;
  rotY: number;
  width: number;
  depth: number;
  color?: RGB;
  /** Turned balusters rather than a solid parapet. */
  balusters?: boolean;
  /** Metres between balusters; coarser for scenery blocks seen at range. */
  balusterPitch?: number;
}

export function buildBalcony(o: BalconyOpts): void {
  const { ctx } = o;
  const buf = ctx.batch.solid('concrete', o.cell);
  const color = o.color ?? [0.95, 0.93, 0.9];
  const nx = Math.sin(o.rotY);
  const nz = Math.cos(o.rotY);
  const cx = o.x + nx * o.depth * 0.5;
  const cz = o.z + nz * o.depth * 0.5;

  addBox(buf, cx, o.y - 0.07, cz, o.width, 0.14, o.depth, {
    rotY: o.rotY, color, grime: 0.15,
  });
  // Corbels under the slab.
  for (const s of [-1, 1]) {
    addBox(buf,
      o.x + Math.cos(o.rotY) * s * (o.width * 0.5 - 0.16) + nx * 0.22,
      o.y - 0.28, o.z - Math.sin(o.rotY) * s * (o.width * 0.5 - 0.16) + nz * 0.22,
      0.18, 0.3, 0.5,
      { rotY: o.rotY, color: [color[0] * 0.95, color[1] * 0.94, color[2] * 0.92] },
    );
  }

  const railBuf = ctx.batch.solid('metal_rusted', o.cell);
  const h = 0.95;
  // Top rail and bottom rail.
  for (const yy of [o.y + h, o.y + 0.1]) {
    addBox(railBuf, cx + nx * (o.depth * 0.5 - 0.05), yy, cz + nz * (o.depth * 0.5 - 0.05),
      o.width, 0.05, 0.05, { rotY: o.rotY, color: [0.72, 0.66, 0.6] });
  }
  const count = Math.max(3, Math.round(o.width / (o.balusterPitch ?? 0.17)));
  for (let i = 0; i <= count; i++) {
    const u = -o.width * 0.5 + (o.width * i) / count;
    // A 3 cm bar has no readable end: it dies into the rails above and below.
    addBox(railBuf,
      o.x + Math.cos(o.rotY) * u + nx * (o.depth - 0.05),
      o.y + h * 0.5, o.z - Math.sin(o.rotY) * u + nz * (o.depth - 0.05),
      0.03, h, 0.03, { rotY: o.rotY, color: [0.7, 0.64, 0.58], faces: FX_SIDES });
  }
  // Returns along the sides.
  for (const s of [-1, 1]) {
    addBox(railBuf,
      o.x + Math.cos(o.rotY) * s * o.width * 0.5 + nx * o.depth * 0.5,
      o.y + h, o.z - Math.sin(o.rotY) * s * o.width * 0.5 + nz * o.depth * 0.5,
      0.05, 0.05, o.depth, { rotY: o.rotY, color: [0.72, 0.66, 0.6] });
  }
}

/* -------------------------------- awning --------------------------------- */

export interface AwningOpts {
  ctx: BuildCtx;
  cell: string;
  x: number;
  y: number;
  z: number;
  rotY: number;
  width: number;
  depth: number;
  /** How far the leading edge hangs below the wall fixing. */
  drop?: number;
  color?: RGB;
  torn?: number;
}

/** Fabric canopy with a sag, hung on two poles. Souk and shopfront staple. */
export function buildAwning(o: AwningOpts): void {
  const { ctx } = o;
  const buf = ctx.batch.solid('fabric_canvas', o.cell);
  const drop = o.drop ?? 0.35;
  const color = o.color ?? [1, 0.97, 0.9];
  const nx = Math.sin(o.rotY);
  const nz = Math.cos(o.rotY);
  const tx = Math.cos(o.rotY);
  const tz = -Math.sin(o.rotY);
  const segs = 4;
  const rows = 3;

  const point = (uu: number, vv: number, out: THREE.Vector3): THREE.Vector3 => {
    const sag = Math.sin(vv * Math.PI) * 0.11 + Math.sin(uu * Math.PI) * 0.05;
    return out.set(
      o.x + tx * (uu - 0.5) * o.width + nx * vv * o.depth,
      o.y - drop * vv * vv - sag,
      o.z + tz * (uu - 0.5) * o.width + nz * vv * o.depth,
    );
  };

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < segs; i++) {
      const u0 = i / segs;
      const u1 = (i + 1) / segs;
      const v0 = j / rows;
      const v1 = (j + 1) / rows;
      if (o.torn && j === rows - 1 && ((i * 7 + Math.round(o.x)) % 5) === 0) continue;
      point(u0, v0, _a);
      point(u1, v0, _b);
      point(u1, v1, _c);
      point(u0, v1, _d);
      const shade = 1 - v1 * 0.12;
      addQuad(buf, _a, _b, _c, _d,
        [u0 * o.width, v0 * o.depth, u1 * o.width, v0 * o.depth,
          u1 * o.width, v1 * o.depth, u0 * o.width, v1 * o.depth],
        [color[0] * shade, color[1] * shade, color[2] * shade]);
      addQuad(buf, _d, _c, _b, _a,
        [u0 * o.width, v1 * o.depth, u1 * o.width, v1 * o.depth,
          u1 * o.width, v0 * o.depth, u0 * o.width, v0 * o.depth],
        [color[0] * shade * 0.8, color[1] * shade * 0.8, color[2] * shade * 0.78]);
    }
  }

  // Poles holding the leading edge.
  const poleBuf = ctx.batch.solid('metal_rusted', o.cell);
  for (const s of [-1, 1]) {
    point(s > 0 ? 1 : 0, 1, _a);
    _b.copy(_a);
    _b.y = o.y + 0.06;
    _b.x = o.x + tx * s * o.width * 0.5;
    _b.z = o.z + tz * s * o.width * 0.5;
    addTube(poleBuf, _a, _b, 0.028, 5, [0.72, 0.66, 0.58]);
  }
}

/* -------------------------------- ladder --------------------------------- */

export function buildLadder(
  ctx: BuildCtx,
  cell: string,
  x: number, y: number, z: number,
  height: number,
  rotY: number,
): void {
  const buf = ctx.batch.solid('metal_rusted', cell);
  const tx = Math.cos(rotY);
  const tz = -Math.sin(rotY);
  const color: RGB = [0.74, 0.66, 0.58];
  for (const s of [-1, 1]) {
    addBox(buf, x + tx * s * 0.22, y + height * 0.5, z + tz * s * 0.22, 0.05, height, 0.05, {
      rotY, color,
    });
  }
  const rungs = Math.floor(height / 0.31);
  for (let i = 1; i <= rungs; i++) {
    addBox(buf, x, y + i * 0.31, z, 0.48, 0.035, 0.035, { rotY, color });
  }
  // Stand-off brackets, so the ladder is not glued flat to the wall.
  const nx = Math.sin(rotY);
  const nz = Math.cos(rotY);
  for (const t of [0.2, 0.75]) {
    addBox(buf, x - nx * 0.09, y + height * t, z - nz * 0.09, 0.5, 0.05, 0.18, { rotY, color });
  }
}

/* --------------------------- freestanding wall ---------------------------- */

export interface CompoundWallOpts {
  ctx: BuildCtx;
  cell: string;
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  yBase: number;
  height: number;
  thickness?: number;
  material?: MaterialName;
  color?: RGB;
  /** Coping course along the top. */
  coping?: boolean;
  /** Openings punched through: gates and blast damage. */
  openings?: Opening[];
  /** Broken-glass deterrent set into the coping. */
  glassTop?: boolean;
  wear?: number;
}

export function buildCompoundWall(o: CompoundWallOpts): void {
  buildWall({
    ctx: o.ctx,
    cell: o.cell,
    x0: o.x0, z0: o.z0, x1: o.x1, z1: o.z1,
    yBase: o.yBase,
    height: o.height,
    thickness: o.thickness ?? 0.4,
    material: o.material ?? 'stucco_ochre',
    color: o.color,
    openings: o.openings,
    inner: true,
    courses: false,
    plinth: 0.35,
    grime: 0.3,
    wear: o.wear ?? 0.35,
  });
  if (o.coping !== false) {
    const buf = o.ctx.batch.solid('concrete', o.cell);
    const len = Math.hypot(o.x1 - o.x0, o.z1 - o.z0);
    const rotY = Math.atan2(-(o.z1 - o.z0) / len, (o.x1 - o.x0) / len);
    const t = o.thickness ?? 0.4;
    addBox(buf, (o.x0 + o.x1) * 0.5 - Math.sin(rotY) * t * 0.5, o.yBase + o.height + 0.06,
      (o.z0 + o.z1) * 0.5 - Math.cos(rotY) * t * 0.5,
      len, 0.12, t + 0.14, { rotY, color: [1.0, 0.98, 0.95] });
  }
}

/* ------------------------------ sandbags --------------------------------- */

/** A stacked sandbag emplacement, laid in courses with a running bond. */
export function buildSandbags(
  ctx: BuildCtx,
  cell: string,
  x: number, y: number, z: number,
  rotY: number,
  length: number,
  courses = 4,
): void {
  const buf = ctx.batch.solid('sandbag', cell);
  const rng = ctx.rng;
  const bagW = 0.52;
  const bagH = 0.19;
  const tx = Math.cos(rotY);
  const tz = -Math.sin(rotY);
  for (let c = 0; c < courses; c++) {
    const offset = (c % 2) * bagW * 0.5;
    const n = Math.floor((length - offset) / bagW);
    const inset = c * 0.035;
    for (let i = 0; i < n; i++) {
      const u = -length * 0.5 + offset + (i + 0.5) * bagW;
      const jitter = rng.range(-0.02, 0.02);
      addBox(buf,
        x + tx * u, y + (c + 0.5) * bagH, z + tz * u,
        bagW * 0.97, bagH * 1.05, 0.36 - inset,
        {
          rotY: rotY + rng.range(-0.05, 0.05),
          color: [1 + jitter, 0.98 + jitter, 0.94 + jitter],
          grime: 0.16,
        },
      );
    }
  }
}

/* ------------------------------ rubble ----------------------------------- */

/** A collapse: a mound of graded debris with slabs and reinforcement in it. */
export function buildRubblePile(
  ctx: BuildCtx,
  cell: string,
  x: number, z: number,
  radius: number,
  height: number,
  ground: (x: number, z: number) => number,
): void {
  const rng = ctx.rng;
  const buf = ctx.batch.solid('rubble', cell);
  const slabBuf = ctx.batch.solid('concrete_damaged', cell);
  /*
   * Three rings of slightly larger lumps rather than four of smaller ones.
   *
   * A heap reads by its silhouette and by the shadow between chunks, and both
   * survive a coarser aggregate: what does not survive is the count, and there
   * are around a hundred of these piles in the level between the barricades, the
   * collapses and the spoil against the walls. None of them shows an underside
   * either — every box is set into the mound with its base below grade.
   */
  const rings = 3;
  for (let r = 0; r < rings; r++) {
    const rr = radius * (1 - r / rings);
    const count = Math.max(3, Math.round(rr * 2.7));
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rng.range(-0.3, 0.3);
      const d = rr * rng.range(0.55, 1);
      const px = x + Math.cos(a) * d;
      const pz = z + Math.sin(a) * d;
      const h = height * (1 - d / radius) * rng.range(0.5, 1.1);
      const s = rng.range(0.5, 1.35);
      addBox(buf, px, ground(px, pz) + h * 0.5 - 0.06, pz, s, Math.max(0.2, h), s * rng.range(0.7, 1.3), {
        rotY: rng.range(0, Math.PI),
        color: [0.94 + rng.range(-0.07, 0.07), 0.92, 0.88],
        grime: 0.25,
        faces: FX_NO_BOTTOM,
      });
    }
  }
  // A few intact slabs tipped into the pile read as a building, not a heap.
  for (let i = 0; i < 4; i++) {
    const a = rng.range(0, Math.PI * 2);
    const d = radius * rng.range(0.2, 0.75);
    const px = x + Math.cos(a) * d;
    const pz = z + Math.sin(a) * d;
    addBox(slabBuf, px, ground(px, pz) + rng.range(0.2, height * 0.7), pz,
      rng.range(1.2, 2.6), 0.2, rng.range(0.9, 1.8), {
      rotY: rng.range(0, Math.PI),
      color: [0.9, 0.88, 0.85],
      grime: 0.3,
    });
  }
  const rebar = ctx.batch.solid('metal_rusted', cell);
  for (let i = 0; i < 6; i++) {
    const a = rng.range(0, Math.PI * 2);
    const d = radius * rng.range(0.1, 0.8);
    const px = x + Math.cos(a) * d;
    const pz = z + Math.sin(a) * d;
    const gy = ground(px, pz) + rng.range(0.1, height * 0.6);
    _a.set(px, gy, pz);
    _b.set(px + rng.range(-0.5, 0.5), gy + rng.range(0.4, 1.2), pz + rng.range(-0.5, 0.5));
    addTube(rebar, _a, _b, 0.013, 4, [0.78, 0.62, 0.5]);
  }
}

/* --------------------------- collapsed floor ------------------------------ */

/**
 * A first-floor slab that has given way: the slab hangs at an angle, its
 * reinforcement dangling, with the collapse spilling onto the floor below.
 */
export function buildCollapsedSlab(
  ctx: BuildCtx,
  cell: string,
  r: Rect,
  y: number,
  ground: (x: number, z: number) => number,
): void {
  const buf = ctx.batch.solid('concrete_damaged', cell);
  const rng = ctx.rng;
  const cx = (r.x0 + r.x1) * 0.5;
  const cz = (r.z0 + r.z1) * 0.5;

  // Intact remainder of the slab.
  addBox(buf, (r.x0 + cx) * 0.5, y - 0.11, cz, cx - r.x0, 0.22, r.z1 - r.z0, {
    color: [0.9, 0.88, 0.85], grime: 0.2,
  });
  // Hanging section, tipped into the room below.
  const hangW = (r.x1 - cx) * 0.72;
  addBox(buf, cx + hangW * 0.45, y - 0.62, cz + 0.3, hangW, 0.2, (r.z1 - r.z0) * 0.62, {
    rotY: 0.08, color: [0.88, 0.86, 0.83], grime: 0.3,
  });
  const rebar = ctx.batch.solid('metal_rusted', cell);
  for (let i = 0; i < 9; i++) {
    const px = cx + rng.range(-0.4, hangW);
    const pz = cz + rng.range(-(r.z1 - r.z0) * 0.35, (r.z1 - r.z0) * 0.35);
    _a.set(px, y - 0.16, pz);
    _b.set(px + rng.range(-0.2, 0.5), y - rng.range(0.5, 1.5), pz + rng.range(-0.3, 0.3));
    addTube(rebar, _a, _b, 0.012, 4, [0.8, 0.62, 0.48]);
  }
  buildRubblePile(ctx, cell, cx + hangW * 0.5, cz, 2.4, 1.1, ground);
}

/* ------------------------------ utilities --------------------------------- */

/** Evenly spaced openings along a wall, the default facade rhythm. */
export function windowRow(
  length: number,
  count: number,
  floor: number,
  opts: Partial<Opening> = {},
): Opening[] {
  const out: Opening[] = [];
  const margin = Math.max(1.1, length * 0.09);
  const span = length - margin * 2;
  for (let i = 0; i < count; i++) {
    const u = count === 1 ? length * 0.5 : margin + (span * i) / (count - 1);
    out.push({
      u,
      w: opts.w ?? 1.05,
      h: opts.h ?? 1.42,
      sill: opts.sill ?? 1.02,
      floor,
      kind: opts.kind ?? 'window',
      glass: opts.glass ?? 'clear',
      balcony: opts.balcony,
      awning: opts.awning,
      ac: opts.ac,
      noSill: opts.noSill,
    });
  }
  return out;
}

/** Deterministic per-opening variation, so a facade is not a stamped grid. */
export function varyOpenings(list: Opening[], rng: Rng, brokenChance = 0.25): Opening[] {
  for (const op of list) {
    const roll = rng.next();
    if (op.glass === 'clear') {
      if (roll < brokenChance) op.glass = 'broken';
      else if (roll < brokenChance + 0.12) op.glass = 'boarded';
      else if (roll < brokenChance + 0.26) op.glass = 'shutter';
    }
    op.sill += rng.range(-0.03, 0.03);
  }
  return list;
}

/** Chooses a merge cell from a footprint's centre. */
export function cellOf(r: Rect): string {
  return cellFor((r.x0 + r.x1) * 0.5, (r.z0 + r.z1) * 0.5);
}

/** A simple pitched or flat canopy roof over a market stall or arcade bay. */
export function buildSlatRoof(
  ctx: BuildCtx,
  cell: string,
  r: Rect,
  y: number,
  gapEvery = 3,
): void {
  const buf = ctx.batch.solid('wood_planks', cell);
  const rng = ctx.rng;
  const beam = ctx.batch.solid('wood_planks', cell);
  // Purlins across the span.
  for (let x = r.x0; x < r.x1 - 0.1; x += 1.6) {
    addBox(beam, x + 0.8, y + 0.09, (r.z0 + r.z1) * 0.5, 0.12, 0.16, r.z1 - r.z0, {
      color: [0.82, 0.74, 0.62], grime: 0.2,
    });
  }
  let i = 0;
  for (let z = r.z0; z < r.z1 - 0.05; z += 0.34, i++) {
    if (i % gapEvery === 0) continue;
    const w = 0.34 * rng.range(0.62, 0.86);
    addBox(buf, (r.x0 + r.x1) * 0.5, y + rng.range(-0.01, 0.02), z + 0.17, r.x1 - r.x0, 0.07, w, {
      color: [0.88 + rng.range(-0.08, 0.08), 0.8, 0.68],
      grime: 0.15,
    });
  }
}

export { addBox, addCylinder, addWedge };
