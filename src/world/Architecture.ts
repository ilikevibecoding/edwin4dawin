import * as THREE from 'three';
import { Rng, clamp } from '../core/MathUtils';
import type { LightPortal, MaterialName } from '../core/Interfaces';
import type { Batcher, MatRef } from './Batcher';
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
  addClothSmooth,
  addTube,
  addWallBlot,
  addWedge,
  surfaceNormal,
  WHITE,
  type RGB,
} from './Geo';
import type { Terrain } from './Terrain';
import { BLOCK_BUFF, BLOCK_MAT, PAINT_ARCH } from './Finish';
import { AWNING_MAT } from './Cloth';
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
  /**
   * Collects the openings as they are cut, for the lighting bake to aim rays
   * through. See `LightPortal`: this is the one place in the level where a
   * window's rectangle is known exactly, and the bake cannot recover it
   * afterwards at any affordable ray count.
   */
  portals?: LightPortal[];
}

export type OpeningKind = 'window' | 'door' | 'arch' | 'shop' | 'garage' | 'hole' | 'vent';
export type Glazing = 'clear' | 'broken' | 'none' | 'boarded' | 'shutter';

/*
 * Shutters and gates: faded blue paint, which is what half the joinery in a town
 * like this is anyway. The tint is calibrated against `PAINT_ARCH` rather than
 * the raw library material — see Finish.ts for why that matters — and lands at
 * about (0.36, 0.42, 0.46) sRGB, a muted slate that still reads as paint.
 *
 * The uv scale puts the material's rust front at the size of real pitting rather
 * than half-metre blooms, which is the only scale at which it reads as corrosion
 * on an object two metres across.
 */
const PAINTED_METAL: RGB = [1.29, 1.56, 1.82];
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

/*
 * Cast trim has to be warmed toward the render it sits on.
 *
 * Sills, lintels, string courses, cornices, copings and architraves are cast
 * concrete, and `concrete` bakes to linear (0.234, 0.227, 0.209) — near enough
 * neutral. The render around it does not: `stucco_ochre` is (0.387, 0.271,
 * 0.134), nearly three to one red over blue. Two surfaces that far apart in hue
 * do not read as one building, and the failure is asymmetric in a way that is
 * easy to miss when authoring: in direct sun the warm beam pulls the grey trim
 * most of the way to the render and it looks fine, but in shade the only light
 * arriving is sky, and neutral grey under a blue sky is *blue*. The west
 * frontage of the hero shot is in shadow at this sun angle, so every sill,
 * course and architrave on it came out as a pale blue band across warm ochre
 * plaster — which is exactly what a wall of cold scribble looks like.
 *
 * Real ones are not bare either. Trim on this coast is limewashed or painted
 * with the wall, and where it is not, it is buried in the same dust. So the
 * neutral-family trims are corrected toward the render, and the ones that are
 * already warm are left alone.
 */
const NEUTRAL_TRIM: ReadonlySet<string> = new Set<string>([
  'concrete', 'concrete_painted', 'concrete_damaged', 'rubble',
]);
const TRIM_WARM: RGB = [1.14, 1.0, 0.72];

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
  /** A library material, or a finish key registered with the batcher. */
  material: MatRef;
  /** Trim material for sills, lintels and copings. */
  trim?: MatRef;
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
  innerMaterial?: MatRef;
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
const _n0 = new THREE.Vector3();
const _n1 = new THREE.Vector3();
const _n2 = new THREE.Vector3();
const _n3 = new THREE.Vector3();

/**
 * A stable 0..1 value from two coordinates.
 *
 * Wanted wherever a decision has to vary from wall to wall but must not consume
 * the shared random stream — every draw from `ctx.rng` shifts every later
 * decision in the level, so adding one feature to buildings would silently
 * rearrange the market stalls.
 */
function hash2(a: number, b: number): number {
  const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

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
  const trim: MatRef = o.trim ?? 'concrete';
  const buf = ctx.batch.solid(o.material, o.cell);
  const trimBuf = ctx.batch.solid(trim, o.cell);
  const tc: RGB = NEUTRAL_TRIM.has(trim)
    ? [color[0] * TRIM_WARM[0], color[1] * TRIM_WARM[1], color[2] * TRIM_WARM[2]]
    : color;
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
      FX_PZ | FX_PY | FX_PX | FX_NX, trimBuf, [tc[0] * 0.92, tc[1] * 0.91, tc[2] * 0.9], 0.4);

    /*
     * Render fallen off the base course, exposing the brick underneath.
     *
     * A change of material is worth more to a large wall than any amount of
     * extra render detail, because it is the one thing a tiling texture can
     * never supply: two surfaces with different colour, different roughness and
     * a real edge between them. It also happens to be true of every rendered
     * building in a town like this — rising damp and kicked feet take the
     * stucco off the bottom metre first, and what shows through is blockwork.
     *
     * The upper edge is drawn as a run of unequal steps rather than a line,
     * because a straight horizontal boundary a metre off the ground reads as a
     * painted dado and not as a failure.
     */
    const bp = hash2(o.x0 * 1.7 + o.z1 * 3.1, o.z0 * 2.9 - o.x1 * 1.3);
    if (bp > 0.42) {
      const brick = ctx.batch.solid(BLOCK_MAT, o.cell);
      const bcol = BLOCK_BUFF as unknown as RGB;
      const top = o.yBase + lift + (o.plinth ?? 0);
      const runs = Math.max(2, Math.round(length / 1.6));
      for (let i = 0; i < runs; i++) {
        const u0 = (i * length) / runs;
        const u1 = ((i + 1) * length) / runs;
        const k = hash2(u0 + o.x0, o.z0 - i * 7.3);
        if (k < 0.24) continue;
        const rise = 0.16 + k * 0.62;
        panel(u0, u1, top - 0.04, top + rise, -t - 0.015, 0.075,
          FX_PZ | FX_PY | FX_PX | FX_NX, brick,
          [bcol[0] * (0.94 + k * 0.12), bcol[1] * (0.94 + k * 0.1), bcol[2] * (0.95 + k * 0.09)],
          0.45);
      }
    }
  }

  if (o.courses !== false) {
    const floors = o.floors ?? Math.max(1, Math.round(o.height / storey));
    for (let f = 1; f < floors; f++) {
      const y = o.yBase + lift + f * storey - 0.16;
      panel(0, length, y, y + 0.16, -t, 0.07, FX_PZ | FX_PY | FX_NY,
        trimBuf, [tc[0] * 1.03, tc[1] * 1.02, tc[2] * 1.0], 0);
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
            trimBuf, [tc[0] * 1.04, tc[1] * 1.03, tc[2] * 1.0], 0);
        }
        u = Math.max(u, g1);
      }
      if (length - u > 0.4) {
        panel(u, length, y, y + 0.14, -t, 0.06, FX_PZ | FX_PY | FX_NY | FX_PX | FX_NX,
          trimBuf, [tc[0] * 1.04, tc[1] * 1.03, tc[2] * 1.0], 0);
      }
    }
    // Cornice under the roof, with a thinner drip beneath it.
    const cy = yTop - 0.3;
    panel(0, length, cy, cy + 0.3, -t, 0.13, FX_PZ | FX_PY | FX_PX | FX_NX,
      trimBuf, [tc[0] * 1.05, tc[1] * 1.04, tc[2] * 1.02], 0);
    panel(0, length, cy - 0.09, cy, -t, 0.07, FX_PZ | FX_NY,
      trimBuf, [tc[0] * 0.86, tc[1] * 0.85, tc[2] * 0.84], 0);
  }

  /* ------------------------------ pilasters ------------------------------ */

  /*
   * No wall runs more than six metres without something crossing it.
   *
   * Callers pass the party walls they know about — a terrace knows where its
   * houses divide — but plenty of elevations are authored without any, and a
   * blank eighteen-metre plane of render is the single most damaging thing a
   * building can present to a camera however good the material on it is. Six
   * metres is about the point at which the eye stops reading a wall as a wall
   * and starts reading it as a backdrop, so any gap wider than that gets a strip
   * inserted at even divisions, and openings veto individual strips further down
   * rather than being cut through.
   */
  const strips: number[] = (o.pilasters ?? []).filter((u) => u > 0.3 && u < length - 0.3)
    .slice().sort((a, b) => a - b);
  {
    const MAX_RUN = 6;
    const gaps: number[] = [];
    let prev = 0;
    for (const u of [...strips, length]) {
      const span = u - prev;
      if (span > MAX_RUN) {
        const n = Math.ceil(span / MAX_RUN);
        for (let i = 1; i < n; i++) gaps.push(prev + (span * i) / n);
      }
      prev = u;
    }
    strips.push(...gaps);
    strips.sort((a, b) => a - b);
  }

  if (strips.length > 0) {
    const capped = o.courses !== false;
    const top = capped ? yTop - 0.4 : yTop - 0.02;
    const base = o.yBase + lift + (o.plinth ?? 0) - 0.04;
    if (top > base + 0.5) {
      for (const u of strips) {
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
          [tc[0] * 1.05, tc[1] * 1.04, tc[2] * 1.02], 0);
      }
    }
  }

  /* ------------------------------ services ------------------------------- */

  /*
   * Rainwater goods and surface conduit.
   *
   * A pilaster interrupts a wall structurally; a pipe interrupts it *visually*,
   * and the two do different jobs. The pilaster is the same render as the wall
   * and reads at range as a shadow line, which is what a facade wants. A
   * downpipe is a different material, a different value and it casts a hard
   * shadow across the plane behind it at this sun angle, so it is the thing that
   * actually breaks a large expanse — and it is one of the few marks that says a
   * building is *used*, because someone had to put it there.
   *
   * Both are placed off the wall's own hash rather than the shared random
   * stream, so adding them cannot rearrange anything else in the level.
   */
  if (o.height > 4.5 && !o.backdrop && length > 4) {
    const pipeBuf = ctx.batch.solid('metal_rusted', o.cell);
    const yFoot = o.yBase + lift + (o.plinth ?? 0) - 0.1;
    const yHead = yTop - (o.courses !== false ? 0.42 : 0.06);
    const free = (u: number, y0: number, y1: number, pad: number): boolean => {
      for (const op of openings) {
        if (op.u1 > u - pad && op.u0 < u + pad && op.y1 > y0 && op.y0 < y1) return false;
      }
      for (const s of strips) if (Math.abs(s - u) < 0.34) return false;
      return true;
    };

    // A downpipe hard against the end of the wall, where a real one goes, plus
    // sometimes a second on a long elevation.
    const hp = hash2(o.x1 * 4.7 - o.z0 * 1.9, o.z1 * 2.3 + o.x0 * 0.7);
    const runs = length > 13 && hp > 0.45 ? 2 : 1;
    for (let i = 0; i < runs; i++) {
      const u = hp > 0.5
        ? (i === 0 ? 0.38 : length * 0.5 + 0.4)
        : (i === 0 ? length - 0.38 : length * 0.5 - 0.4);
      if (!free(u, yFoot, yHead, 0.3)) continue;
      const col: RGB = [0.9, 0.83, 0.74];
      panel(u - 0.055, u + 0.055, yFoot, yHead, 0.005, 0.115,
        FX_PZ | FX_PX | FX_NX, pipeBuf, col, 0.5);
      // Hopper at the head and a shoe at the foot: the two ends are what say
      // this is drainage rather than a stripe painted on the wall.
      panel(u - 0.12, u + 0.12, yHead - 0.02, yHead + 0.2, 0.005, 0.15,
        FX_PZ | FX_PX | FX_NX | FX_PY, pipeBuf, [col[0] * 0.94, col[1] * 0.94, col[2] * 0.93], 0.3);
      panel(u - 0.07, u + 0.07, yFoot - 0.26, yFoot, 0.02, 0.2,
        FX_PZ | FX_PX | FX_NX | FX_NY, pipeBuf, [col[0] * 0.88, col[1] * 0.88, col[2] * 0.86], 0.6);
      for (let y = yFoot + 1.5; y < yHead - 0.5; y += 1.85) {
        panel(u - 0.1, u + 0.1, y, y + 0.05, 0.005, 0.13,
          FX_PZ | FX_PY | FX_NY, pipeBuf, [col[0] * 0.8, col[1] * 0.8, col[2] * 0.78], 0.4);
      }
      // The stain the pipe has been putting on the wall behind it since it
      // cracked, which is what makes it look old rather than fitted.
      if (hash2(u * 3.3, o.z0 + o.x1) > 0.45) {
        panel(u + 0.09, u + 0.09 + 0.14, yFoot + 0.2, yFoot + 1.4 + hp, 0.001, 0.012,
          FX_PZ, buf, [color[0] * 0.8, color[1] * 0.79, color[2] * 0.76], 0);
      }
    }

    // A run of surface conduit dropping from a box at head height. Cheap, and it
    // crosses the wall horizontally, which nothing else on the elevation does.
    const hc = hash2(o.z0 * 5.1 + o.x1 * 1.3, o.x0 * 3.7 - o.z1 * 0.9);
    const yc = o.yBase + lift + 2.62;
    if (hc > 0.55 && yc < yTop - 0.6) {
      const u0 = length * (0.1 + hc * 0.1);
      const u1 = Math.min(length - 0.4, u0 + length * 0.55);
      const ccol: RGB = [0.72, 0.7, 0.66];
      // Run it in the segments between the openings it crosses, as an
      // electrician would, rather than straight through them.
      let u = u0;
      const cuts = openings
        .filter((x) => x.y0 < yc + 0.1 && x.y1 > yc - 0.1)
        .map((x) => [x.u0 - 0.1, x.u1 + 0.1] as const)
        .sort((p, q) => p[0] - q[0]);
      for (const [c0, c1] of cuts) {
        if (c0 > u + 0.4 && c0 < u1) {
          panel(u, Math.min(c0, u1), yc, yc + 0.045, 0.005, 0.055, FX_PZ | FX_PY | FX_NY,
            pipeBuf, ccol, 0.3);
        }
        u = Math.max(u, c1);
      }
      if (u1 - u > 0.4) {
        panel(u, u1, yc, yc + 0.045, 0.005, 0.055, FX_PZ | FX_PY | FX_NY, pipeBuf, ccol, 0.3);
      }
      if (free(u1, yc - 0.9, yc, 0.25)) {
        panel(u1 - 0.045, u1, yc - 0.85, yc + 0.045, 0.005, 0.05, FX_PZ | FX_PX | FX_NX,
          pipeBuf, ccol, 0.3);
        panel(u1 - 0.14, u1 + 0.05, yc - 1.08, yc - 0.85, 0.005, 0.09,
          FX_PZ | FX_PX | FX_NX | FX_PY | FX_NY, pipeBuf, [0.66, 0.64, 0.6], 0.4);
      }
    }
  }

  /* --------------------------- opening trim ----------------------------- */

  for (const { op, u0, u1, y0, y1 } of openings) {
    if (u1 <= 0.02 || u0 >= length - 0.02) continue;
    const kind = op.kind ?? 'window';
    /*
     * How far back the glass, shutter or door leaf sits from the wall face.
     *
     * Clamped to the wall it is cut through, which was a real bug on the
     * interior partitions: those are 16 cm thick and every doorway in them was
     * asking for a 19 cm reveal, so the frame was assembled 3 cm *behind* the
     * back of the wall and poked out into the next room.
     *
     * Shopfronts used to get 10 cm, below the 15 cm this level's own brief asks
     * for, and they are the openings seen closest and squarest — a shop front
     * is at eye level across a two-metre pavement. They now get the same as
     * everything else where the wall can carry it.
     */
    const reveal = Math.min(kind === 'garage' ? 0.12 : 0.21, Math.max(0.06, t - 0.05));

    // Stone sill, projecting and returned past the jambs.
    if (!op.noSill && kind !== 'door' && kind !== 'garage' && kind !== 'hole') {
      panel(u0 - 0.11, u1 + 0.11, y0 - 0.1, y0, -t, 0.08, FX_ALL & ~FX_NZ, trimBuf,
        [tc[0] * 1.06, tc[1] * 1.05, tc[2] * 1.02], 0.1);
    }
    // Lintel over the head.
    if (kind !== 'hole' && kind !== 'arch') {
      panel(u0 - 0.13, u1 + 0.13, y1, y1 + 0.16, -t, 0.05, FX_ALL & ~FX_NZ, trimBuf,
        [tc[0] * 1.02, tc[1] * 1.01, tc[2] * 0.99], 0);
    }
    buildReveal(o, op, kind, u0, u1, y0, y1, t, reveal, panel, tc);
    // Architrave: a shallow surround so the hole reads as framed, not punched.
    if (!o.backdrop && (kind === 'window' || kind === 'door' || kind === 'shop')) {
      const s = 0.09;
      panel(u0 - s, u0, y0 - 0.1, y1 + 0.16, -0.06, 0.035, FX_PZ | FX_PX | FX_NX | FX_PY | FX_NY,
        trimBuf, [tc[0] * 1.04, tc[1] * 1.03, tc[2] * 1.0], 0.1);
      panel(u1, u1 + s, y0 - 0.1, y1 + 0.16, -0.06, 0.035, FX_PZ | FX_PX | FX_NX | FX_PY | FX_NY,
        trimBuf, [tc[0] * 1.04, tc[1] * 1.03, tc[2] * 1.0], 0.1);
    }
    if (kind === 'arch') buildArchHead(o, u0, u1, y1, t, rotY, ux, uz, nx, nz, trimBuf, tc);

    /*
     * Publish the hole as a light portal, but only where there is a room behind
     * it to light. `inner` is exactly that distinction — the nine backdrop
     * blocks and the blind faces of scenery have no interior, and a portal on
     * one would have the bake fire rays into a sealed void and conclude the
     * street outside was dark.
     *
     * The rectangle is placed at the *room* face of the wall rather than on its
     * centre line, which matters more than it sounds. An opening here is a
     * tunnel through four hundred millimetres of masonry, not a hole in a sheet,
     * so a ray aimed at the centre-line rectangle from anywhere off-axis clears
     * that rectangle and then clips the reveal on the way out. Measured from
     * mid-café, seven of nine rays aimed at each of its own windows died on the
     * plaster beside them. Taken at the room face instead, the cone the bake
     * samples contains every direction light can arrive through, and the rays
     * that graze the reveal report the reveal — which is the honest answer for a
     * deep window seen obliquely, and the reason a splayed jamb exists at all.
     */
    if (o.inner !== false && ctx.portals) {
      const um = (u0 + u1) * 0.5;
      const face = t + 0.012;
      ctx.portals.push({
        x: o.x0 + ux * um - nx * face,
        y: (y0 + y1) * 0.5,
        z: o.z0 + uz * um - nz * face,
        nx, nz, ux, uz,
        width: u1 - u0,
        height: y1 - y0,
      });
    }

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

/**
 * The four returns of an opening: two jambs, a head soffit and a sill bed.
 *
 * The wall decomposition already leaves the sides of the hole exposed, so the
 * thickness is there in the geometry — and it was not reading. Three reasons,
 * all of which this fixes.
 *
 * The reveal faces belong to the wall panel, so they carry the wall's colour
 * and the wall's uv, which on a world-space-mapped material means the jamb and
 * the face beside it are sampling continuously across the arris. There is no
 * line where the wall turns the corner into the hole, and a corner with no line
 * on it is not a corner. Lining the reveal in the trim material with its own
 * tint puts one back.
 *
 * Second, the return is the surface that catches the sun. At six degrees a
 * west-facing reveal is lit almost square-on while the wall beside it is raking,
 * so a lined jamb is a bright vertical stripe against a duller field — the
 * single strongest form cue a facade has at this hour, and the review is right
 * that it was missing. Standing the lining 15 mm proud of the reveal face
 * guarantees the stripe has an edge rather than fading into the wall's own
 * shading gradient.
 *
 * Third, the head soffit faces down and therefore sees no sky. It is the
 * darkest surface on the whole elevation, and having it as an actual surface
 * with its own colour rather than as more wall is what makes the opening read
 * as a hole with something behind it.
 */
function buildReveal(
  o: WallOpts,
  op: Opening,
  kind: NonNullable<Opening['kind']>,
  u0: number, u1: number, y0: number, y1: number,
  t: number, reveal: number,
  panel: (
    u0: number, u1: number, y0: number, y1: number,
    d0: number, d1: number, faces: number,
    target?: ReturnType<Batcher['solid']>, col?: RGB, grime?: number,
  ) => void,
  tc: RGB,
): void {
  if (o.backdrop) return;
  /*
   * Out of the shadow cascades. The lining sits inside the reveal, so the
   * silhouette it would cast is the one the wall around it is already casting,
   * to within the fifteen millimetres it stands proud — and it is a lot of
   * geometry to redraw three more times for that. Every mark and lining in this
   * file is on the same reasoning; see `Batcher.solidFlat`.
   */
  const lining = o.ctx.batch.solidFlat(o.trim ?? 'concrete', o.cell);
  // Deep enough to reach the fill, thin enough not to narrow the hole.
  const d = Math.min(reveal + 0.04, t - 0.02);
  const j = 0.055;
  /*
   * Jambs and soffit are the same stone as the sill and the lintel, a shade
   * cooler than the wall so the turn into the reveal reads even when the whole
   * elevation is in shade. The soffit is darker again, because it is.
   */
  const side: RGB = [tc[0] * 0.95, tc[1] * 0.955, tc[2] * 0.98];
  const soffit: RGB = [tc[0] * 0.78, tc[1] * 0.79, tc[2] * 0.84];
  panel(u0, u0 + j, y0, y1, -d, -0.015, FX_PX | FX_PZ, lining, side, 0.15);
  panel(u1 - j, u1, y0, y1, -d, -0.015, FX_NX | FX_PZ, lining, side, 0.15);
  panel(u0, u1, y1 - j, y1, -d, -0.015, FX_NY | FX_PZ, lining, soffit, 0.1);
  /*
   * The sill bed: the weathered slope inside the opening that throws water off.
   * Skipped where the opening goes to the floor, since a door has no sill to
   * stand on and a shopfront's threshold is the pavement.
   */
  if (kind !== 'door' && kind !== 'garage' && kind !== 'shop' && kind !== 'arch') {
    panel(u0, u1, y0, y0 + j * 0.8, -d, -0.015, FX_PY | FX_PZ, lining,
      [tc[0] * 1.02, tc[1] * 1.0, tc[2] * 0.97], 0.3);
  }
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

  /*
   * Opening furniture only casts where there is a room for the shadow to fall
   * in.
   *
   * A frame, a leaf, a shutter or a boarding sits behind the reveal face, so
   * from outside its silhouette is inside the silhouette the wall is already
   * casting and its shadow lands on the back of a hole that is black anyway.
   * Where the wall does front a modelled interior it is the opposite: a
   * six-degree sun comes in almost level and a 7 cm mullion grid throws bars
   * right across the floor, which is one of the best things an interior gets
   * for free. So the two cases want opposite answers, and `inner` is exactly
   * the flag that distinguishes them. Across a town that is mostly shells this
   * is the single largest saving available that costs nothing visible.
   */
  const fitting = (name: MatRef): ReturnType<Batcher['solid']> =>
    (o.inner ? ctx.batch.solid(name, o.cell) : ctx.batch.solidFlat(name, o.cell));

  const frameBuf = fitting('wood_door');
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
    const shutterBuf = fitting(PAINT_ARCH);
    const rail = fitting('metal_rusted');
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

  /*
   * The inside of the room, on a building that has not got one.
   *
   * Most of the town's blocks are hollow shells whose interior faces are never
   * drawn, so an opening in one is a hole through to whatever is behind the
   * building — and where a pane is drawn it shows a sky reflection with a void
   * behind it, which is the "bright band with nothing behind it" the review
   * picked up. Two triangles of very dark, slightly warm surface set back
   * behind the wall's inner face gives the opening a floor of black to be a
   * hole into, and reads as an unlit room from anywhere outside it.
   */
  if (!o.inner) {
    const voidBuf = ctx.batch.solidFlat('concrete', o.cell);
    box(voidBuf, u0 - 0.08, u1 + 0.08, y0 - 0.08, y1 + 0.08, -t - 0.1, -t - 0.08,
      [0.1, 0.095, 0.085], FX_PZ);
  }

  if (kind === 'hole' || kind === 'vent') return;

  if (glass === 'boarded') {
    const plankBuf = fitting('wood_planks');
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
    const shutterBuf = fitting(PAINT_ARCH);
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

  /*
   * Glazing is a shadow receiver, never a caster.
   *
   * A pane in the shadow map is an opaque rectangle, which puts a dark panel on
   * the floor of every room exactly where the light shaft through that window
   * should be — the interiors were being closed off by their own windows. Leaving
   * the glass out of the cascades is both physically right and, at three thousand
   * triangles of glazing across the town multiplied by four cascades, the cheapest
   * correct thing available.
   */
  if (glass === 'broken') {
    // Shards clinging to the frame rather than a full pane.
    const shard = ctx.batch.solidFlat('glass_broken', o.cell);
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
    const paneBuf = ctx.batch.solidFlat(glassMat, o.cell);
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
  const pockBuf = ctx.batch.solidFlat(o.material, o.cell);
  /*
   * Bursts, because nobody fires one round at a wall.
   *
   * Fewer rounds than there were, and each one now a shaped mark rather than
   * two stacked rectangles. That is a straight swap of quantity for quality and
   * it is the right way round: a wall carrying forty crisp irregular strikes
   * reads as a wall that has been shot at, and the same wall carrying sixty
   * axis-aligned rectangles reads as a wall with a pattern on it, which is what
   * the review found. It also pays for the extra triangles a shaped mark costs.
   */
  const bursts = Math.max(1, Math.round(length * amount * 0.17));
  for (let b = 0; b < bursts; b++) {
    const bu = rng.range(0.5, length - 0.5);
    const by = o.yBase + rng.range(0.6, top);
    const spreadU = rng.range(0.35, 1.5);
    const spreadY = rng.range(0.1, 0.6);
    const tiltU = rng.range(-1, 1);
    const shots = Math.round(rng.range(3, 7));
    for (let i = 0; i < shots; i++) {
      const t = (i / Math.max(1, shots - 1) - 0.5) * 2;
      const u = bu + t * spreadU + rng.range(-0.1, 0.1);
      const y = by + t * spreadY * tiltU + rng.range(-0.06, 0.06);
      if (u < 0.2 || u > length - 0.2 || y < o.yBase + 0.2) continue;
      const s = rng.range(0.06, 0.15);
      const k = rng.range(0.5, 0.72);
      /*
       * One fan, not a crater plus a halo. The dark centre is the hole and the
       * rim is the blown render around it, which is the same two-tone read the
       * pair of boxes was after, at a fifth of the cost and with an outline
       * that has no straight edge anywhere on it.
       */
      addWallBlot(pockBuf,
        o.x0 + ux * u + nx * 0.008, y, o.z0 + uz * u + nz * 0.008,
        ux, uz, nx, nz,
        s * 1.7, s * 1.6 * rng.range(0.85, 1.2), u * 3.1 - y * 2.7,
        [color[0] * k * 0.66, color[1] * k * 0.65, color[2] * k * 0.64],
        [color[0] * 1.04, color[1] * 1.01, color[2] * 0.97], 6,
      );
    }
  }

  /*
   * Sheets of render off the wall, showing the blockwork behind it.
   *
   * These were drawn in `concrete_damaged` on the reasoning that damaged render
   * wants a damaged-render material. It was the wrong call twice over. That map
   * is a network of fine cracks at a two-and-a-half-metre tile, so a
   * metre-square crop of it is a couple of arbitrary crack lines with no
   * relationship to the patch outline — and it is near neutral in hue, so on a
   * shaded elevation lit only by sky it came out cold. Half a dozen per wall and
   * the facade read as covered in pale blue scribble.
   *
   * Blockwork is both the truthful answer and the calm one: what is behind the
   * render is blocks, their bond is regular so a crop of it still reads as
   * masonry, and it is warm. It also ties the spalls to the exposed base course,
   * so the wall tells one story about itself instead of two.
   */
  const spallBuf = ctx.batch.solid(BLOCK_MAT, o.cell);
  const spalls = Math.round(length * amount * 0.09);
  for (let i = 0; i < spalls; i++) {
    const u = rng.range(0.7, length - 0.7);
    const y = o.yBase + rng.range(0.4, top);
    const w = rng.range(0.7, 1.9);
    const h = rng.range(0.5, 1.5);
    // A shade under the base course: this render came off longer ago and the
    // block behind it has been weathering since.
    const k = rng.range(0.82, 0.94);
    /*
     * Eight sides rather than the crater's six: at a metre across, a five- or
     * six-sided outline is legible as a polygon, and a patch of missing render
     * that reads as a hexagon is worse than one that reads as a rectangle. The
     * rim keeps its full colour here — the exposed blockwork ends where the
     * render broke, which is a real edge and should look like one.
     */
    addWallBlot(spallBuf,
      o.x0 + ux * u + nx * 0.01, y, o.z0 + uz * u + nz * 0.01,
      ux, uz, nx, nz,
      w * 0.5, h * 0.5, u * 5.7 + y * 1.9,
      [BLOCK_BUFF[0] * k * 0.94, BLOCK_BUFF[1] * k * 0.94, BLOCK_BUFF[2] * k * 0.94],
      [BLOCK_BUFF[0] * k, BLOCK_BUFF[1] * k, BLOCK_BUFF[2] * k], 8,
    );
  }

  /*
   * Water off every sill, and off the ends of the string courses.
   *
   * This is the detail the wall planes were missing, and it is not decoration:
   * staining is how a real facade tells you where its water goes, and the eye
   * knows the pattern well enough that its absence is what makes render read as
   * a flat swatch. Rain sheets off a projecting sill and runs down the wall
   * directly beneath its two ends, so the marks are paired, they start at the
   * sill and not at the top of the wall, and they fade out about a storey down.
   */
  const drip = ctx.batch.solidFlat(o.material, o.cell);
  for (const op of o.openings ?? []) {
    if (op.noSill || op.kind === 'door' || op.kind === 'garage' || op.kind === 'hole') continue;
    const oy = o.yBase + (o.floorLift ?? 0) + (op.floor ?? 0) * (o.storey ?? STOREY) + op.sill;
    if (oy < o.yBase + 1.2) continue;
    for (const side of [-1, 1]) {
      const u = op.u + side * (op.w * 0.5 + 0.08);
      if (u < 0.2 || u > length - 0.2) continue;
      const k = hash2(u + o.x0, oy + o.z0);
      if (k < 0.22) continue;
      const h = 0.5 + k * 1.9;
      const shade = 0.76 + k * 0.1;
      addBox(drip,
        o.x0 + ux * u + nx * 0.005, oy - 0.06 - h * 0.5, o.z0 + uz * u + nz * 0.005,
        0.1 + k * 0.13, h, 0.01,
        {
          rotY, faces: FX_PZ,
          color: [color[0] * shade, color[1] * shade * 0.98, color[2] * shade * 0.95],
        },
      );
    }
  }

  // Rain and rust streaks below the cornice, again in the wall's own material
  // so they read as staining rather than as a different surface.
  const streak = ctx.batch.solidFlat(o.material, o.cell);
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

/* -------------------------------- oriel ---------------------------------- */

export interface OrielOpts {
  ctx: BuildCtx;
  cell: string;
  /** Fixing point on the wall face; `rotY` faces out of the wall. */
  x: number;
  y: number;
  z: number;
  rotY: number;
  width: number;
  height: number;
  depth?: number;
  color?: RGB;
}

/**
 * A *mashrabiya*: a closed timber oriel corbelled out over the street, its
 * front and cheeks filled with turned lattice.
 *
 * The facades on this map are stucco planes with openings cut in them, and a
 * plane is the one thing a low sun cannot model — it either faces the sun and
 * is uniformly bright, or it does not and is uniformly dark. Everything that
 * makes a real elevation legible at this hour is *projecting*: something has to
 * stand out of the wall far enough to cast onto it. A metre of oriel at
 * first-floor level does that for eight metres of wall below and beside it, and
 * with the sun at six degrees the shadow it throws is longer than the street is
 * wide.
 *
 * It also does the near-field job an arch does in a lane too wide to arch. Set
 * beside a hero camera it fills a top corner with a dark, complicated
 * silhouette at two metres, which is what stops a street shot reading as an
 * evenly detailed rectangle.
 *
 * The lattice is real geometry — a coarse grid of 3 cm bars — rather than an
 * alpha texture, because the whole point of it is that light comes through in
 * a pattern and the bars catch the sun on their own edges.
 */
export function buildOriel(o: OrielOpts): void {
  const { ctx } = o;
  const depth = o.depth ?? 0.85;
  const color = o.color ?? [1.0, 0.98, 1.04];
  const nx = Math.sin(o.rotY);
  const nz = Math.cos(o.rotY);
  const tx = Math.cos(o.rotY);
  const tz = -Math.sin(o.rotY);
  const body = ctx.batch.solid('stucco_sand', o.cell);
  const timber = ctx.batch.solid('wood_planks', o.cell);
  const TIMBER: RGB = [0.72, 0.62, 0.5];

  const cx = o.x + nx * depth * 0.5;
  const cz = o.z + nz * depth * 0.5;

  // Corbels: three brackets carrying the floor, which is the part that reads
  // from below and the part that puts a row of hard shadows on the wall.
  for (let i = -1; i <= 1; i++) {
    const u = i * (o.width * 0.5 - 0.18);
    addBox(timber,
      o.x + tx * u + nx * depth * 0.42, o.y - 0.22, o.z + tz * u + nz * depth * 0.42,
      0.14, 0.26, depth * 0.84,
      { rotY: o.rotY, color: TIMBER },
    );
  }
  // Floor and head, both oversailing the box so the shadow line is crisp.
  addBox(body, cx, o.y - 0.05, cz, o.width + 0.12, 0.11, depth + 0.1,
    { rotY: o.rotY, color, grime: 0.2 });
  addBox(body, cx, o.y + o.height + 0.08, cz, o.width + 0.22, 0.16, depth + 0.2,
    { rotY: o.rotY, color: [color[0] * 1.02, color[1] * 1.0, color[2] * 0.98] });

  /*
   * A dark void behind the lattice. Without it the screen is seen against the
   * sky on the far side and reads as a fence rather than as a window into a
   * room, which is the same failure as an unbacked opening in a wall.
   */
  addBox(body, cx, o.y + o.height * 0.5, cz, o.width - 0.06, o.height, depth - 0.06,
    { rotY: o.rotY, color: [0.1, 0.095, 0.09], faces: FX_ALL });

  // Corner posts.
  for (const s of [-1, 1]) {
    addBox(timber,
      o.x + tx * s * o.width * 0.5 + nx * depth * 0.5, o.y + o.height * 0.5,
      o.z + tz * s * o.width * 0.5 + nz * depth * 0.5,
      0.1, o.height, depth,
      { rotY: o.rotY, color: TIMBER, faces: FX_SIDES },
    );
  }

  /*
   * The screen, on the front and both cheeks. Bar pitch is 18 cm — coarse
   * enough that the grid is legible as joinery at ten metres and fine enough
   * that it is not a handrail at two.
   */
  const bar = 0.032;
  const pitch = 0.18;
  const face = (
    halfW: number, ox: number, oz: number, along: readonly [number, number], rot: number,
  ): void => {
    const cols = Math.max(2, Math.round((halfW * 2) / pitch));
    for (let i = 0; i <= cols; i++) {
      const u = -halfW + (halfW * 2 * i) / cols;
      addBox(timber, ox + along[0] * u, o.y + o.height * 0.5, oz + along[1] * u,
        bar, o.height - 0.08, bar, { rotY: rot, color: TIMBER, faces: FX_SIDES });
    }
    const rows = Math.max(2, Math.round(o.height / pitch));
    for (let j = 1; j < rows; j++) {
      const y = o.y + (o.height * j) / rows;
      addBox(timber, ox, y, oz, halfW * 2, bar, bar,
        { rotY: rot, color: TIMBER, faces: FX_SIDES });
    }
  };
  face(o.width * 0.5, o.x + nx * depth, o.z + nz * depth, [tx, tz], o.rotY);
  for (const s of [-1, 1]) {
    face(depth * 0.5,
      o.x + tx * s * o.width * 0.5 + nx * depth * 0.5,
      o.z + tz * s * o.width * 0.5 + nz * depth * 0.5,
      [nx, nz], o.rotY + Math.PI * 0.5);
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
  const buf = ctx.batch.solid(AWNING_MAT, o.cell);
  const drop = o.drop ?? 0.35;
  const color = o.color ?? [1, 0.97, 0.9];
  const nx = Math.sin(o.rotY);
  const nz = Math.cos(o.rotY);
  const tx = Math.cos(o.rotY);
  const tz = -Math.sin(o.rotY);
  /*
   * Scalloped between its arms, and deeper the further it reaches.
   *
   * The old surface was one 11 cm dip over a two-metre sheet, which is a plane
   * to within four degrees; with a smooth canvas albedo on it, the result was
   * a brown slab with a straight leading edge, and it read as a sheet of board
   * screwed to the wall. Every market awning ever built is held on arms at the
   * wall and a wire at the front, so the cloth bellies between the arms and
   * the belly grows toward the free edge — which is what makes the front hem
   * scallop, and the scalloped hem is the entire silhouette of the thing.
   *
   * It also puts a range of angles under a sun that is six degrees up, so the
   * transmitted term has something to vary over instead of giving the whole
   * sheet one flat value.
   */
  const ribs = Math.max(2, Math.round(o.width / 1.05));
  const segs = ribs * 4;
  const rows = 3;

  /*
   * How far the cloth reaches at each point along the hem, as a fraction of
   * the full depth. A worn awning is short and uneven at the front because
   * that is the edge that flaps; the previous version got there by deleting
   * every fifth quad of the last row, which — once the mesh was subdivided to
   * resolve the scallops — turned the silhouette into a row of square
   * crenellations. A continuous reach keeps the hem ragged without ever
   * putting a right angle on the one edge that is read against the sky.
   */
  const reach = (uu: number): number => (o.torn
    ? 1 - 0.16 * (0.5 + 0.35 * Math.sin(uu * 9.7 + o.x)
      + 0.15 * Math.sin(uu * 26.3 - o.z * 1.7))
    : 1);

  const point = (uu: number, vv: number, out: THREE.Vector3): THREE.Vector3 => {
    const scallop = (1 - Math.cos(uu * ribs * 2 * Math.PI)) * 0.5;
    const belly = scallop * (0.04 + 0.14 * vv * vv);
    const sag = Math.sin(vv * Math.PI) * 0.06;
    return out.set(
      o.x + tx * (uu - 0.5) * o.width + nx * vv * o.depth,
      o.y - drop * vv * vv - belly - sag,
      o.z + tz * (uu - 0.5) * o.width + nz * vv * o.depth,
    );
  };
  // Sampled in hem-relative depth, so neighbouring columns still share an edge.
  const span = (uu: number, t: number, out: THREE.Vector3): THREE.Vector3 =>
    point(uu, t * reach(uu), out);

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < segs; i++) {
      const u0 = i / segs;
      const u1 = (i + 1) / segs;
      const v0 = j / rows;
      const v1 = (j + 1) / rows;
      span(u0, v0, _a);
      span(u1, v0, _b);
      span(u1, v1, _c);
      span(u0, v1, _d);
      const shade = 1 - v1 * 0.12;
      /*
       * Analytic per-vertex normals, not the quad's own. Twelve facets over a
       * two-metre awning is a coarse mesh for a curved surface at the best of
       * times, and it became a visible problem the moment cloth started
       * transmitting: the transmitted term goes as the cosine between the sun
       * and the *back* of the surface, so a faceted normal gives each panel a
       * different flat brightness and the sag reads as folded cardboard.
       */
      surfaceNormal(span, u0, v0, _n0, 0.5 / segs, -1);
      surfaceNormal(span, u1, v0, _n1, 0.5 / segs, -1);
      surfaceNormal(span, u1, v1, _n2, 0.5 / segs, -1);
      surfaceNormal(span, u0, v1, _n3, 0.5 / segs, -1);
      // What it looks like from below is decided by the transmission term in
      // `Cloth`, not by a painted vertex colour on a back face.
      addClothSmooth(buf, [_a, _b, _c, _d], [_n0, _n1, _n2, _n3],
        [u0 * o.width, v0 * o.depth, u1 * o.width, v0 * o.depth,
          u1 * o.width, v1 * o.depth, u0 * o.width, v1 * o.depth],
        [color[0] * shade, color[1] * shade, color[2] * shade]);
    }
  }

  // Poles holding the leading edge.
  const poleBuf = ctx.batch.solid('metal_rusted', o.cell);
  for (const s of [-1, 1]) {
    span(s > 0 ? 1 : 0, 1, _a);
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

/* -------------------------------- sabat ---------------------------------- */

export interface SabatOpts {
  ctx: BuildCtx;
  cell: string;
  /** Springing points, one on each flanking wall. */
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  /** Height of the springing, from which the arch turns. */
  yBase: number;
  /** Rise of the arch above the springing. */
  rise?: number;
  /** Depth of the arch band along the lane. */
  depth?: number;
  /** Height of the wall carried above the arch's crown. */
  wall?: number;
  material?: MatRef;
  color?: RGB;
}

/**
 * A *sabat*: the upper storey of one house carried across the lane on an arch
 * to reach the house opposite. Every medina in North Africa is full of them,
 * for the plain reason that land is scarce and air is not.
 *
 * It is here for what it does to a photograph. A street framed only by its two
 * side walls has one strong line — the vanishing point — and nothing at all in
 * the near field, so a camera standing in it produces an evenly busy rectangle
 * with the most distant, lowest-contrast part of the image at its centre. That
 * is precisely the failure this level's alley shots have. An arch a few metres
 * in front of the lens supplies the missing near field in one object: it caps
 * the frame, brackets it on both sides, and it is on the shaded side of its own
 * mass, so it reads as a dark surround with the lit street beyond it — which is
 * the oldest composition in architectural photography and still the most
 * reliable. The soffit also catches bounce off the road, so it is not a flat
 * silhouette but a modelled one.
 *
 * Built from radial voussoirs rather than as a boxed cut-out, so the intrados
 * is a real curve and the low sun rakes across the joints between the stones.
 */
export function buildSabat(o: SabatOpts): void {
  const { ctx } = o;
  const span = Math.hypot(o.x1 - o.x0, o.z1 - o.z0);
  if (span < 1) return;
  const ux = (o.x1 - o.x0) / span;
  const uz = (o.z1 - o.z0) / span;
  const rotY = Math.atan2(uz, ux) * -1;
  const cx = (o.x0 + o.x1) * 0.5;
  const cz = (o.z0 + o.z1) * 0.5;
  const depth = o.depth ?? 1.9;
  const rise = o.rise ?? span * 0.5;
  const wall = o.wall ?? 2.5;
  const color = o.color ?? [1.0, 0.98, 1.06];
  const buf = ctx.batch.solid(o.material ?? 'stucco_sand', o.cell);
  const trim = ctx.batch.solid('concrete', o.cell);
  const r = span * 0.5;
  const top = o.yBase + rise + wall;
  const hz = depth * 0.5;

  /*
   * The block is a single swept band: a semi-elliptical soffit, the two street
   * elevations above it, and a flat top.
   *
   * Built as a strip rather than as a ring of voussoir boxes. The box version
   * is what `buildArchHead` does over a doorway and it is fine at that size,
   * but boxes are spaced evenly *in angle* and an arch six metres across with
   * a two-metre rise has four times the arc length per degree at the crown
   * that it has at the springing — so the crown opens into gaps and the frame
   * fills with sky through the holes. A strip has no such failure mode and it
   * gives a genuinely curved intrados for the sun to run round.
   */
  const steps = 16;
  const nrm = new THREE.Vector3();
  const pt = (i: number, s: number, out: THREE.Vector3): THREE.Vector3 => {
    const a = Math.PI - (i / steps) * Math.PI;
    const du = Math.cos(a) * r;
    return out.set(cx + ux * du + -uz * s * hz, o.yBase + Math.sin(a) * rise, cz + uz * du + ux * s * hz);
  };
  const soffit = (i: number, out: THREE.Vector3): THREE.Vector3 => {
    const a = Math.PI - (i / steps) * Math.PI;
    // Ellipse normal, flipped to point into the opening.
    const gu = (Math.cos(a) * r) / (r * r);
    const gy = (Math.sin(a) * rise) / (rise * rise);
    const len = Math.hypot(gu, gy) || 1;
    return out.set((-ux * gu) / len, -gy / len, (-uz * gu) / len);
  };

  for (let i = 0; i < steps; i++) {
    // Soffit: a quad across the lane's depth between two arch samples.
    pt(i, -1, _a);
    pt(i, 1, _b);
    pt(i + 1, 1, _c);
    pt(i + 1, -1, _d);
    const k = 0.9 + (i % 3) * 0.03;
    const soff: RGB = [color[0] * k, color[1] * k * 0.98, color[2] * k * 0.95];
    soffit(i, nrm);
    const s0 = (i / steps) * Math.PI * r;
    const s1 = ((i + 1) / steps) * Math.PI * r;
    addQuad(buf, _a, _d, _c, _b, [0, s0, 0, s1, depth, s1, depth, s0], soff, nrm);

    /*
     * The two elevations, from the arch line up to the top of the block. Drawn
     * as one quad per step, so the arch's outline on the street face is the
     * same curve as the soffit rather than a stepped approximation of it.
     */
    for (const s of [-1, 1]) {
      pt(i, s, _a);
      pt(i + 1, s, _b);
      _c.set(_b.x, top, _b.z);
      _d.set(_a.x, top, _a.z);
      const face: RGB = [color[0], color[1], color[2]];
      const u0 = (i / steps) * span;
      const u1 = ((i + 1) / steps) * span;
      if (s > 0) addQuad(buf, _a, _b, _c, _d, [u0, _a.y, u1, _b.y, u1, top, u0, top], face);
      else addQuad(buf, _b, _a, _d, _c, [u1, _b.y, u0, _a.y, u0, top, u1, top], face);
    }
  }
  // Flat top, and the coping that oversails it.
  addBox(buf, cx, top - 0.2, cz, span, 0.4, depth, { rotY, color, grime: 0.2, faces: FX_PY });
  addBox(trim, cx, top + 0.09, cz, span + 0.5, 0.18, depth + 0.4, {
    rotY, color: [1.02, 1.0, 0.97],
  });
  /*
   * A string course on the line of the crown, and one small window per
   * elevation. Both exist so the mass above the arch is not a blank slab: the
   * course gives it a horizontal shadow at the height the eye expects a floor,
   * and the windows give it scale and say somebody lives up there.
   */
  addBox(trim, cx, o.yBase + rise + 0.28, cz, span, 0.14, depth + 0.16, {
    rotY, color: [1.0, 0.98, 0.95],
  });
  for (const s of [-1, 1]) {
    addBox(trim,
      cx - uz * s * (hz + 0.03), o.yBase + rise + 1.25, cz + ux * s * (hz + 0.03),
      0.66, 0.86, 0.1,
      { rotY, color: [0.17, 0.16, 0.16] },
    );
    addBox(trim,
      cx - uz * s * (hz + 0.09), o.yBase + rise + 1.76, cz + ux * s * (hz + 0.09),
      0.9, 0.1, 0.16,
      { rotY, color: [1.04, 1.02, 0.99] },
    );
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
