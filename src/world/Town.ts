import * as THREE from 'three';
import { Rng } from '../core/MathUtils';
import type { MaterialName } from '../core/Interfaces';
import type { Batcher, MatRef } from './Batcher';
import {
  FX_ALL,
  FX_NY,
  FX_PY,
  GeoBuf,
  addBox,
  addCatenary,
  addCloth,
  addCylinder,
  addGroundPatch,
  addQuad,
  addTri,
  addTube,
  addWedge,
  type RGB,
} from './Geo';
import {
  ALLEY,
  ALLEY_CENTER_X,
  APARTMENT,
  BUS,
  CAFE,
  COMPOUND,
  COMPOUND_GATE_Z,
  CORNICHE,
  COURTYARD,
  CROSS_A_CENTER_Z,
  CROSS_B_CENTER_Z,
  FOUNTAIN,
  GARAGE,
  GATE_Z,
  MAP,
  PARAPET_H,
  SEA_LEVEL,
  SEA_WALL_X,
  SOUK,
  SOUK_CENTER_X,
  SOUK_SHOP,
  STOREY,
  TECHNICAL,
  VILLA,
  cellFor,
  rect,
  rectContains,
  type Rect,
} from './Layout';
import {
  buildAwning,
  buildBalcony,
  buildBlastHole,
  buildCollapsedSlab,
  buildCompoundWall,
  buildLadder,
  buildRoof,
  buildRubblePile,
  buildSandbags,
  buildSlatRoof,
  buildStair,
  buildWall,
  cellOf,
  varyOpenings,
  windowRow,
  type BuildCtx,
  type Opening,
} from './Architecture';
import type { Terrain } from './Terrain';
import {
  BLOCK_BUFF, BLOCK_MAT, RENDER_SOFFIT, SCREED_CALM,
  registerInteriorFinishes, registerMasonryFinishes,
} from './Finish';
import { CLOTH_MAT } from './Vegetation';
import { buildBurntCar, buildBus, buildContainer, buildTechnical } from './Vehicles';
import { tint } from './Props';

/**
 * Al-Rashid Crossing, assembled.
 *
 * The order of business here is deliberately the order a location scout would
 * work in: put the boundary in so the space is defined, put the ground plane's
 * built edges in so the streets read, then fill the three lanes from the
 * outside toward the centre. The centre lane is dressed last because it is the
 * one the player looks down from spawn, and it needs to be composed against
 * everything already standing behind it.
 *
 * Two things get recorded as the town goes up and are handed to the navigation
 * pass afterwards: `blockers`, the footprints nothing may walk into or be
 * scattered inside, and `platforms`, the elevated surfaces the cover analysis
 * should also sample. Deriving them here is far cheaper and far more reliable
 * than trying to recover them from triangles later.
 */

export type Side = 'north' | 'south' | 'east' | 'west';

export interface Room {
  name: string;
  rect: Rect;
  /** Floor height. */
  y: number;
  /** Ceiling height above the floor. */
  height: number;
}

export interface Platform {
  rect: Rect;
  y: number;
  name: string;
}

export interface TownResult {
  blockers: Rect[];
  rooms: Room[];
  platforms: Platform[];
  landmarks: Array<{ name: string; position: THREE.Vector3 }>;
  /** Interesting spots the cover analysis should sample densely. */
  hotspots: Array<{ x: number; z: number; radius: number }>;
}

const _v = new THREE.Vector3();
const _color = new THREE.Color();
/** Shared up-normal, for the backlit faces of cloth. */
const _up = new THREE.Vector3(0, 1, 0);

/* ------------------------------- helpers ---------------------------------- */

interface SideLine {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  length: number;
  /** Outward normal. */
  nx: number;
  nz: number;
}

/** The four faces of a footprint, wound so `buildWall`'s outward face is out. */
export function sideLine(r: Rect, side: Side): SideLine {
  switch (side) {
    case 'north':
      return { x0: r.x1, z0: r.z0, x1: r.x0, z1: r.z0, length: r.x1 - r.x0, nx: 0, nz: -1 };
    case 'south':
      return { x0: r.x0, z0: r.z1, x1: r.x1, z1: r.z1, length: r.x1 - r.x0, nx: 0, nz: 1 };
    case 'east':
      return { x0: r.x1, z0: r.z1, x1: r.x1, z1: r.z0, length: r.z1 - r.z0, nx: 1, nz: 0 };
    default:
      return { x0: r.x0, z0: r.z0, x1: r.x0, z1: r.z1, length: r.z1 - r.z0, nx: -1, nz: 0 };
  }
}

function inset(r: Rect, d: number): Rect {
  return rect(r.x0 + d, r.z0 + d, r.x1 - d, r.z1 - d);
}

/**
 * Exposed masonry: buff cement blockwork, not fired clay.
 *
 * The town has one palette and it is bleached — render, concrete, dust and
 * canvas all sit within a few per cent of each other in hue — and iron-oxide
 * clay is nowhere near it. Two rounds of trying to correct that with the tint
 * alone failed, in opposite directions: a multiplier large enough to take the
 * brick faces to buff took the grey mortar joints to cyan, so the alley was
 * framed by two piers of blue-and-orange mosaic. The hue is now taken out at the
 * shader level by `BLOCK_MAT` and the tint only has to set the colour.
 */
const BRICK_BUFF = BLOCK_BUFF as unknown as RGB;

/**
 * A stable pseudo-random uv shift from two numbers. Derived from position
 * rather than drawn from the shared generator, so adding one of these to an
 * object does not reshuffle every random decision made after it.
 */
function hashOffset(a: number, b: number): readonly [number, number] {
  const h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  const k = Math.sin(a * 39.3468 + b * 11.1357) * 24634.6345;
  return [(h - Math.floor(h)) * 9.3, (k - Math.floor(k)) * 9.3];
}

export interface BuildingOpts {
  rect: Rect;
  floors: number;
  material: MaterialName;
  trim?: MaterialName;
  color?: RGB;
  storey?: number;
  thickness?: number;
  wear?: number;
  grime?: number;
  /** Per-side openings, in wall-local coordinates. */
  sides?: Partial<Record<Side, Opening[]>>;
  /** Emit inner wall faces, floor slabs and a ceiling. */
  interior?: boolean;
  /** Room-side wall finish; defaults to painted plaster when `interior`. */
  innerMaterial?: MaterialName;
  innerColor?: RGB;
  /** Extra floor slabs are cut around these rectangles (stairwells, collapses). */
  floorHoles?: Rect[];
  parapet?: number;
  coping?: boolean;
  roofOpen?: Partial<Record<Side, boolean>>;
  noRoof?: boolean;
  roofMaterial?: MaterialName;
  floorMaterial?: MaterialName;
  /** Sand banked against the outside of these faces. */
  drift?: Side[];
  /** Overrides the automatic ground fit. */
  yFloor?: number;
  /** Overrides how far below the floor the walls run; for stacked volumes. */
  yBase?: number;
  /** Party-wall strips, per side, at these distances along the wall. */
  pilasters?: Partial<Record<Side, number[]>>;
  /** Scenery detail level for unreachable blocks; see `WallOpts.backdrop`. */
  backdrop?: boolean;
}

export interface BuildingInfo {
  rect: Rect;
  /** Finished floor level of the ground storey. */
  yFloor: number;
  /** Walking surface of the roof. */
  yRoof: number;
  /** Height of each storey. */
  storey: number;
  inner: Rect;
}

/** One outward-facing wall, kept so the clutter pass can hang things on it. */
interface Facade {
  line: SideLine;
  cell: string;
  yFloor: number;
  yRoof: number;
  storey: number;
  floors: number;
  openings: Opening[];
}

/* --------------------------------- town ----------------------------------- */

export class Town {
  readonly blockers: Rect[] = [];
  readonly rooms: Room[] = [];
  readonly platforms: Platform[] = [];
  readonly landmarks: Array<{ name: string; position: THREE.Vector3 }> = [];
  readonly hotspots: Array<{ x: number; z: number; radius: number }> = [];

  private ctx: BuildCtx;
  private facades: Facade[] = [];

  constructor(
    private batch: Batcher,
    private terrain: Terrain,
    private rng: Rng,
    private vegetationDensity: number,
    private debrisDensity: number,
  ) {
    this.ctx = { batch, rng, terrain };
  }

  private g = (x: number, z: number): number => this.terrain.surfaceHeight(x, z);

  /** Highest ground under a footprint; what a slab has to clear. */
  private groundMax(r: Rect): number {
    let m = -Infinity;
    for (let i = 0; i <= 4; i++) {
      for (let j = 0; j <= 4; j++) {
        m = Math.max(m, this.terrain.height(
          r.x0 + ((r.x1 - r.x0) * i) / 4,
          r.z0 + ((r.z1 - r.z0) * j) / 4,
        ));
      }
    }
    return m;
  }

  private groundMin(r: Rect): number {
    let m = Infinity;
    for (let i = 0; i <= 4; i++) {
      for (let j = 0; j <= 4; j++) {
        m = Math.min(m, this.terrain.height(
          r.x0 + ((r.x1 - r.x0) * i) / 4,
          r.z0 + ((r.z1 - r.z0) * j) / 4,
        ));
      }
    }
    return m;
  }

  /* ------------------------------ building ------------------------------- */

  building(o: BuildingOpts): BuildingInfo {
    const r = o.rect;
    /*
     * Backdrop blocks are collected into one cell of their own, which is then
     * declared a non-caster.
     *
     * The sun here is a handful of degrees above the horizon and very nearly due
     * west, so every shadow in the level runs east. The map's west edge is open
     * sea; the nine scenery blocks stand along the north, south and east
     * boundaries, which means each of them throws its shadow directly away from
     * the playable area, into the outskirts. They were being rasterised into all
     * three cascades to darken ground no player will ever stand on.
     *
     * They still receive shadow, and their own facades still read, because a
     * scenery opening gets its darkness from the panel painted in the back of
     * the reveal rather than from self-shadowing.
     */
    const cell = o.backdrop ? 'skyline' : cellOf(r);
    const storey = o.storey ?? STOREY;
    const t = o.thickness ?? 0.34;
    const yFloor = o.yFloor ?? this.groundMax(r) + 0.09;
    const yBase = o.yBase ?? Math.min(this.groundMin(r) - 0.7, yFloor - 0.7);
    const lift = yFloor - yBase;
    const height = o.floors * storey + lift;
    const yRoof = yFloor + o.floors * storey;
    const inner = inset(r, t);
    /*
     * One material-sample offset per building, shared by all four of its walls.
     * Uvs are world metres, so a terrace of blocks in the same render otherwise
     * draws the same fallen patch of render at the same height on every one of
     * them; per-wall offsets would break the corners instead.
     */
    const uvOffset = hashOffset(r.x0 * 3.7 + r.z1, r.z0 * 2.3 - r.x1);

    for (const side of ['north', 'south', 'east', 'west'] as Side[]) {
      const line = sideLine(r, side);
      buildWall({
        ctx: this.ctx,
        cell,
        uvOffset,
        x0: line.x0, z0: line.z0, x1: line.x1, z1: line.z1,
        yBase,
        height,
        thickness: t,
        material: o.material,
        trim: o.trim,
        color: o.color,
        openings: o.sides?.[side],
        storey,
        floors: o.floors,
        inner: o.interior === true,
        // Painted rather than bare plaster: the plaster map carries large brown
        // repair patches that are right on a weathered exterior and read as damp
        // stains repeating every metre and a half across a bedroom wall.
        innerMaterial: o.interior === true ? (o.innerMaterial ?? 'concrete_painted') : undefined,
        innerColor: o.innerColor ?? [1.08, 1.05, 0.99],
        grime: o.grime ?? 0.28,
        plinth: 0.42,
        courses: true,
        wear: o.wear,
        floorLift: lift,
        pilasters: o.pilasters?.[side],
        backdrop: o.backdrop,
      });
      this.facades.push({
        line, cell, yFloor, yRoof, storey,
        floors: o.floors,
        openings: o.sides?.[side] ?? [],
      });
      if (o.drift?.includes(side)) {
        this.terrain.drift(
          this.batch,
          line.x0 + line.nx * 0.02, line.z0 + line.nz * 0.02,
          line.x1 + line.nx * 0.02, line.z1 + line.nz * 0.02,
          line.nx, line.nz, this.rng, 1,
        );
      }
    }

    if (o.interior) {
      /*
       * The authored finish goes down on the ground floor only; upstairs is a
       * cement screed.
       *
       * A tiled floor is right for a shop or a café — a public room at street
       * level gets tiled and the rooms above it do not — and running the same
       * ceramic through the whole building put a high-contrast blue-white grid
       * across the one interior the player is posed in, which read as a municipal
       * washroom no matter how far the tint was pushed. Screed upstairs is also
       * the calm surface the furniture and the window light need to read against.
       */
      const floorMat: MatRef = o.floorMaterial ?? SCREED_CALM;
      /*
       * Ceilings in sand render rather than painted concrete. `concrete_painted`
       * lays its paint in patches with the substrate showing between them, which
       * is exactly right on a stairwell wall and, on a soffit that receives no
       * direct light at all, resolves to metre-wide brown blotches — a damp cave
       * lid over every room in the map. Sand render is smooth at this scale, and
       * the finer uv makes what texture it has read as a skim rather than as
       * staining.
       */
      // Soffit and its beams: inside an enclosed room, above head height. It has
      // nothing to cast onto that is not already in shadow.
      const ceilBuf = this.batch.solidFlat(RENDER_SOFFIT, cell);
      for (let f = 0; f < o.floors; f++) {
        const y = yFloor + f * storey;
        this.slab(f === 0 ? floorMat : SCREED_CALM, cell, inner, y,
          f === 0 ? 0.0 : 0.24, o.floorHoles, f === 0);
        /*
         * A plaster soffit under every slab and under the roof. Without it the
         * ceiling of a room is the underside of the structural deck — bare
         * concrete, or the roof's weathered screed — and every interior shot has
         * a dark mottled lid on it that reads as a cave roof rather than a room.
         */
        const cy = y + storey - 0.26;
        const pieces = o.floorHoles && o.floorHoles.length > 0
          ? subtract(inner, o.floorHoles)
          : [inner];
        for (const p of pieces) {
          if (p.x1 - p.x0 < 0.05 || p.z1 - p.z0 < 0.05) continue;
          // Whitewashed, and bright even as a vertex multiplier: a ceiling sees
          // no direct sun at all and every ambient term in the pipeline pulls it
          // down, so anything painted near neutral resolves to a dark mottled lid.
          // The uv is pushed hard for the same reason. Sand render's fallen-patch
          // feature is drawn at half a metre; at four times rate that is 12 cm
          // blotches over the whole soffit, which is a mottled cave lid at a
          // smaller scale rather than a skim. At seven it is grain.
          addBox(ceilBuf, (p.x0 + p.x1) * 0.5, cy + 0.02, (p.z0 + p.z1) * 0.5,
            p.x1 - p.x0, 0.04, p.z1 - p.z0,
            { color: [1.54, 1.5, 1.43], faces: FX_NY, uvScale: 7.0 });
          // Two shallow beams across the shorter span, so the lid has structure.
          const along = p.x1 - p.x0 > p.z1 - p.z0;
          for (const t of [0.34, 0.68]) {
            const bx = along ? p.x0 + (p.x1 - p.x0) * t : (p.x0 + p.x1) * 0.5;
            const bz = along ? (p.z0 + p.z1) * 0.5 : p.z0 + (p.z1 - p.z0) * t;
            addBox(ceilBuf, bx, cy - 0.06, bz,
              along ? 0.22 : p.x1 - p.x0, 0.14, along ? p.z1 - p.z0 : 0.22,
              { color: [1.36, 1.32, 1.25], faces: FX_ALL & ~FX_PY, uvScale: 1.9 });
          }
          this.pendantLight(cell, (p.x0 + p.x1) * 0.5, cy - 0.14, (p.z0 + p.z1) * 0.5);
        }
        this.skirting(cell, inner, y, storey);
      }
    }

    if (!o.noRoof) {
      buildRoof({
        ctx: this.ctx,
        cell,
        rect: r,
        y: yRoof,
        material: o.roofMaterial ?? 'concrete',
        parapet: o.parapet ?? PARAPET_H,
        coping: o.coping !== false,
        openSides: o.roofOpen,
        overhang: 0.16,
        // Warm, because a flat roof in this town is a screed under a permanent
        // film of blown sand. Neutral concrete put a cool blue-grey deck under the
        // camera in every rooftop shot while the whole rest of the frame was ochre.
        color: [1.12, 1.04, 0.9],
      });
    }

    this.blockers.push(r);
    return { rect: r, yFloor, yRoof, storey, inner };
  }

  /**
   * A floor slab, optionally cut around stairwells. The ground slab is a
   * surface only; upper slabs get a soffit so the room below has a ceiling.
   */
  private slab(
    material: MatRef,
    cell: string,
    r: Rect,
    y: number,
    thickness: number,
    holes?: Rect[],
    groundLevel = false,
  ): void {
    /*
     * A floor is a receiver, not a caster.
     *
     * A slab is enclosed by the walls that already stop the sun, so its only
     * possible contribution to the shadow map is shadowing the storey beneath
     * itself — which the storey beneath is in the dark of anyway. The light that
     * makes an interior read comes through the windows and is shaped by the
     * reveals and the furniture standing in it, both of which still cast.
     */
    const buf = this.batch.solidFlat(material, cell);
    const pieces = holes && holes.length > 0 ? subtract(r, holes) : [r];
    for (const p of pieces) {
      if (p.x1 - p.x0 < 0.05 || p.z1 - p.z0 < 0.05) continue;
      // Indoor floor finishes are laid in smaller units than the same material
      // draws outside: 30 cm tiles in a room, not the 90 cm paving slab the
      // library's tile size is set for.
      const tiled = material === 'ceramic_tile';
      const uvScale = tiled ? 3.4 : 1.4;
      /*
       * Ceramic is warmed hard, not nudged. The library's tile is a cool
       * blue-white with dark grout, correct for the municipal paving it was
       * authored for, and a ten-percent tint does nothing to a colour that
       * saturated — this is the multiplier it takes to land on the ochre cement
       * tile these floors are actually laid in. It is also drawn at a finer uv than
       * the paving outside: a 25 cm tile reads as a floor finish, and the 90 cm
       * slab the material is sized for reads as a grid drawn on one.
       *
       * Screed just wants warming out of the material's cool grey and dirtying.
       */
      const col: RGB = tiled ? [1.28, 1.04, 0.78] : [1.32, 1.18, 0.99];
      if (groundLevel) {
        addBox(buf, (p.x0 + p.x1) * 0.5, y - 0.11, (p.z0 + p.z1) * 0.5,
          p.x1 - p.x0, 0.22, p.z1 - p.z0,
          { color: col, faces: FX_ALL & ~FX_NY, grime: 0.25, uvScale });
      } else {
        addBox(buf, (p.x0 + p.x1) * 0.5, y - thickness * 0.5, (p.z0 + p.z1) * 0.5,
          p.x1 - p.x0, thickness, p.z1 - p.z0,
          { color: col, grime: 0.2, uvScale });
      }
    }
  }

  /**
   * Skirting, a painted dado line and a run of surface conduit around a room.
   *
   * These three lines are what the interiors were missing. A room whose walls
   * meet its floor on a single edge and carry nothing between that edge and the
   * ceiling is a box with furniture standing in it, however good the furniture is
   * — and all four of the enterable buildings read exactly that way. A skirting
   * gives the floor-to-wall junction a shadow, the dado gives the eye a horizontal
   * to measure the room's height against, and the conduit says somebody wired the
   * place. All three are also nearly free: four boxes each, in the same material
   * bucket the wall already uses.
   */
  private skirting(cell: string, r: Rect, yFloor: number, storey: number): void {
    const buf = this.batch.solid('concrete_painted', cell);
    const sides: Array<[number, number, number, number, boolean]> = [
      [(r.x0 + r.x1) * 0.5, r.z0 + 0.03, r.x1 - r.x0, 0.06, true],
      [(r.x0 + r.x1) * 0.5, r.z1 - 0.03, r.x1 - r.x0, 0.06, true],
      [r.x0 + 0.03, (r.z0 + r.z1) * 0.5, 0.06, r.z1 - r.z0, false],
      [r.x1 - 0.03, (r.z0 + r.z1) * 0.5, 0.06, r.z1 - r.z0, false],
    ];
    for (const [cx, cz, sx, sz, along] of sides) {
      addBox(buf, cx, yFloor + 0.06, cz, sx, 0.12, sz,
        { color: [0.84, 0.81, 0.76], grime: 0.45, grimeHeight: 0.1 });
      // Dado: the lower half of the wall painted a darker colour, as every
      // public room in a hot country is, with a hard line at the top of it.
      addBox(buf, cx, yFloor + 0.55, cz, sx * 0.999, 0.86, sz * 0.999,
        { color: [0.9, 0.86, 0.8], grime: 0.3, grimeHeight: 0.8 });
      addBox(buf, cx, yFloor + 1.0, cz, sx, 0.04, sz, { color: [1.06, 1.02, 0.96] });
      void along;
    }
    // Conduit and a socket box on one wall, dropped from the ceiling.
    const cy = yFloor + storey - 0.4;
    addBox(buf, (r.x0 + r.x1) * 0.5, cy, r.z0 + 0.05, r.x1 - r.x0 - 0.4, 0.05, 0.05,
      { color: [1.0, 0.98, 0.94] });
    addBox(buf, r.x0 + 1.6, yFloor + 1.35, r.z0 + 0.05, 0.05, storey - 1.75, 0.05,
      { color: [1.0, 0.98, 0.94] });
    addBox(buf, r.x0 + 1.6, yFloor + 1.2, r.z0 + 0.06, 0.14, 0.18, 0.06,
      { color: [1.1, 1.07, 1.02] });

    /*
     * Things on the walls, at eye level, on the two long faces.
     *
     * A room can be full of furniture and still read as a warehouse if its walls
     * are bare above the dado, because above waist height there is then nothing
     * at all between the camera and four blank planes. A framed picture, a rail of
     * pegs and a shallow shelf are what a lived-in room has up there, and each is
     * a couple of boxes.
     */
    const frame = this.batch.solid('wood_door', cell);
    const pic = this.batch.solid('fabric_canvas', cell);
    const eye = yFloor + 1.62;
    const put = (
      x: number, z: number, w: number, h: number, alongX: boolean, out: number,
    ): void => {
      const sx = alongX ? w : 0.05;
      const sz = alongX ? 0.05 : w;
      addBox(frame, x + (alongX ? 0 : out * 0.03), eye, z + (alongX ? out * 0.03 : 0),
        sx, h, sz, { color: [0.86, 0.78, 0.66] });
      addBox(pic, x + (alongX ? 0 : out * 0.05), eye, z + (alongX ? out * 0.05 : 0),
        alongX ? w - 0.09 : 0.02, h - 0.09, alongX ? 0.02 : w - 0.09,
        { color: [1.5, 1.34, 1.08] });
    };
    const midX = (r.x0 + r.x1) * 0.5;
    put(midX - 2.4, r.z0 + 0.04, 0.62, 0.46, true, 1);
    put(midX + 1.9, r.z1 - 0.04, 0.5, 0.66, true, -1);
    // Peg rail by the door end, and a shelf with nothing much left on it.
    addBox(frame, r.x0 + 0.05, yFloor + 1.72, (r.z0 + r.z1) * 0.5 - 1.2,
      0.06, 0.07, 1.1, { color: [0.84, 0.76, 0.64] });
    for (let i = 0; i < 4; i++) {
      addBox(frame, r.x0 + 0.12, yFloor + 1.66, (r.z0 + r.z1) * 0.5 - 1.65 + i * 0.3,
        0.09, 0.05, 0.03, { color: [0.78, 0.7, 0.58] });
    }
    addBox(frame, r.x1 - 0.16, yFloor + 1.44, (r.z0 + r.z1) * 0.5 + 1.4,
      0.28, 0.04, 1.3, { color: [0.88, 0.8, 0.68] });
    for (const bz of [-0.5, 0.5]) {
      addBox(frame, r.x1 - 0.14, yFloor + 1.36, (r.z0 + r.z1) * 0.5 + 1.4 + bz,
        0.22, 0.14, 0.04, { color: [0.8, 0.72, 0.6] });
    }
  }

  /**
   * A pendant light on a flex, hanging under a ceiling.
   *
   * There is no cheaper way to make a rendered volume read as a room somebody
   * lived in. A ceiling is otherwise the one plane in an interior with nothing on
   * it at all, and the eye uses whatever is hanging from it to read the height of
   * the space — which is exactly what the café's upstairs shot was missing. It is
   * unlit geometry: the lighting rig owns the light itself, this is the fitting.
   */
  private pendantLight(cell: string, x: number, y: number, z: number): void {
    const flex = this.batch.solid('metal_rusted', cell);
    const shade = this.batch.solid('metal_painted', cell);
    const drop = 0.34;
    addBox(flex, x, y - drop * 0.5, z, 0.012, drop, 0.012, { color: [0.8, 0.9, 0.96] });
    // Ceiling rose, then a conical enamel shade with a bulb under it.
    addCylinder(flex, x, y - 0.03, z, 0.055, 0.03, {
      segments: 8, color: [1.2, 1.3, 1.34],
    });
    addCylinder(shade, x, y - drop - 0.11, z, 0.15, 0.11, {
      segments: 10, topRadius: 0.045, color: [1.4, 1.36, 1.3],
    });
    addCylinder(this.batch.solid('glass', cell), x, y - drop - 0.16, z, 0.045, 0.09, {
      segments: 7, color: [1.6, 1.55, 1.4],
    });
  }

  /** An interior partition with a doorway punched through it. */
  private partition(
    cell: string,
    x0: number, z0: number, x1: number, z1: number,
    yFloor: number, height: number,
    doors: Array<{ u: number; w?: number; h?: number }>,
    /*
     * Painted concrete, not plaster. The plaster map carries big spall patches
     * with brickwork showing through, which is exactly right on a weathered
     * street facade and completely wrong on the inside of a room, where it tiles
     * into a regular grid of identical brown lozenges across the wall.
     */
    material: MatRef = 'concrete_painted',
    color: RGB = [1.04, 1.02, 0.98],
  ): void {
    buildWall({
      ctx: this.ctx,
      cell,
      x0, z0, x1, z1,
      yBase: yFloor - 0.05,
      height: height + 0.05,
      thickness: 0.16,
      material,
      trim: 'concrete',
      color,
      inner: true,
      courses: false,
      grime: 0.22,
      openings: doors.map((d) => ({
        u: d.u, w: d.w ?? 1.0, h: d.h ?? 2.1, sill: 0.05, kind: 'door' as const, glass: 'none' as const,
      })),
      floorLift: 0.05,
    });
  }

  /* ------------------------------- assembly ------------------------------ */

  build(progress: (p: number, label: string) => void): TownResult {
    registerMasonryFinishes(this.batch);
    registerInteriorFinishes(this.batch);
    progress(0.1, 'Surveying Al-Rashid Crossing');
    this.boundary();
    progress(0.22, 'Raising the sea wall');
    this.seaFront();
    progress(0.3, 'Building the souk');
    this.westShops();
    this.souk();
    progress(0.42, 'Building the west block');
    this.westBlock();
    progress(0.54, 'Building the east block');
    this.eastBlock();
    progress(0.63, 'Walling the compound');
    this.compound();
    progress(0.7, 'Cutting the alley');
    this.alley();
    progress(0.78, 'Dressing the market');
    this.marketStreet();
    progress(0.86, 'Connecting the rooftops');
    this.rooftops();
    progress(0.9, 'Scattering');
    this.dressing();

    return {
      blockers: this.blockers,
      rooms: this.rooms,
      platforms: this.platforms,
      landmarks: this.landmarks,
      hotspots: this.hotspots,
    };
  }

  /* ------------------------------- boundary ------------------------------ */

  /**
   * The edge of the world. Everywhere the player can reach the boundary they
   * meet something that explains itself: a sea wall, a rubble barricade filling
   * a street, or the blank back of a taller building. Nothing is an invisible
   * wall in the open.
   */
  private boundary(): void {
    const rng = this.rng;
    this.batch.configureCell('skyline', { castShadow: false });

    /*
     * Skyline blocks. Unenterable, no interior faces, coarse but not bare: they
     * still get a plinth, string courses, a cornice and recessed windows, because
     * they are the backdrop to every shot down every lane.
     *
     * Every `stucco_ochre` tint in the level lifts blue above green and red. The
     * material's pigment is a strong ochre — around (0.66, 0.55, 0.38), a red to
     * blue ratio of nearly two — and the tints originally cut blue further, which
     * pushed it past two and a half. Under a low warm sun that multiplies the same
     * way, whole streets came back the colour of a terracotta pot. The town is
     * meant to be sun-bleached, and bleaching is desaturation: pulling blue back up
     * lands the render on the pale dusty ochre the reference actually shows while
     * leaving the material's own value variation untouched.
     */
    /*
     * `faces` is the only side a player can ever see square on, and `flank` the
     * pair they see obliquely from the far end of a lane. The fourth side points
     * out of the world.
     *
     * Every block used to be glazed on all four elevations, which on the
     * forty-four-metre east block is a hundred and twenty openings the map is
     * physically unable to look at — behind the block, past the collision shell,
     * facing the outskirts. The flanks keep their window rhythm because the
     * corner of a backdrop block is visible from the cross streets and a blank
     * return beside a fenestrated front is worse than either.
     */
    const skyline: Array<{
      r: Rect; floors: number; mat: MaterialName; col: RGB;
      face: Side; flank: Side[];
    }> = [
      { r: rect(-44, -86, -12, -67), floors: 4, mat: 'stucco_sand', col: [0.97, 0.93, 0.86], face: 'south', flank: ['east'] },
      { r: rect(-10, -92, 10, -67), floors: 5, mat: 'concrete_painted', col: [0.9, 0.88, 0.84], face: 'south', flank: ['east', 'west'] },
      { r: rect(12, -84, 52, -67), floors: 4, mat: 'stucco_ochre', col: [1.0, 0.99, 1.17], face: 'south', flank: ['west'] },
      { r: rect(-44, 67, -14, 86), floors: 3, mat: 'concrete_damaged', col: [0.86, 0.84, 0.8], face: 'north', flank: ['east'] },
      { r: rect(-12, 67, 14, 90), floors: 4, mat: 'stucco_sand', col: [0.95, 0.91, 0.85], face: 'north', flank: ['east', 'west'] },
      { r: rect(16, 67, 52, 84), floors: 3, mat: 'stucco_ochre', col: [1.0, 0.98, 1.13], face: 'north', flank: ['west'] },
      { r: rect(52, -64, 74, -20), floors: 5, mat: 'concrete_painted', col: [0.92, 0.9, 0.86], face: 'west', flank: ['south'] },
      { r: rect(52, -18, 76, 22), floors: 4, mat: 'stucco_sand', col: [0.97, 0.93, 0.87], face: 'west', flank: ['north', 'south'] },
      { r: rect(52, 24, 74, 64), floors: 5, mat: 'stucco_ochre', col: [0.99, 0.98, 1.2], face: 'west', flank: ['north'] },
    ];
    for (const s of skyline) {
      const wide = s.r.x1 - s.r.x0;
      const deep = s.r.z1 - s.r.z0;
      const sides: Partial<Record<Side, Opening[]>> = {};
      const pilasters: Partial<Record<Side, number[]>> = {};
      for (const side of [s.face, ...s.flank]) {
        const front = side === s.face;
        const len = side === 'north' || side === 'south' ? wide : deep;
        const list: Opening[] = [];
        for (let f = 0; f < s.floors; f++) {
          const n = Math.max(2, Math.round(len / 3.1));
          list.push(...windowRow(len, n, f, { w: 1.05, h: 1.6, sill: 1.0, glass: 'clear' })
            .map((o, i) => ({
              ...o,
              // A backdrop block reads flat if every opening is identical. A
              // scattering of balconies and shuttered bays breaks the grid and
              // costs nothing at this distance.
              balcony: front && f > 0 && (i + f) % 3 === 0,
              glass: (i * 7 + f * 3) % 11 === 0 ? ('boarded' as const) : o.glass,
            })));
        }
        sides[side] = varyOpenings(list, rng, 0.34);
        const n = Math.max(2, Math.round(len / 3.1));
        const strips: number[] = [];
        for (let i = 3; i < n; i += 3) strips.push((i * len) / n);
        pilasters[side] = strips;
      }
      this.building({
        rect: s.r,
        floors: s.floors,
        material: s.mat,
        color: s.col,
        sides,
        pilasters,
        wear: 0.25,
        parapet: 0.85,
        // Sand banks against the sides that are looked at. The fourth elevation
        // faces the outskirts, and a drift run costs the same there as it does on
        // the market street.
        drift: [s.face, ...s.flank],
        backdrop: true,
      });

      // A setback penthouse or stair head on top of the taller blocks. A flat
      // parapet run against the sky is the most obvious tell of a cheap
      // backdrop; two stepped volumes make it read as a real building.
      if (s.floors >= 4 && wide > 18) {
        const bx = rng.range(s.r.x0 + 3, s.r.x1 - 9);
        const bz = rng.range(s.r.z0 + 2.5, Math.max(s.r.z0 + 2.5, s.r.z1 - 8));
        const top = rect(bx, bz, bx + rng.range(6, 9), bz + rng.range(5, 7.5));
        this.building({
          rect: top,
          floors: 1,
          storey: rng.range(2.9, 3.6),
          material: s.mat,
          color: [s.col[0] * 0.98, s.col[1] * 0.98, s.col[2] * 0.99],
          sides: {
            north: windowRow(top.x1 - top.x0, 2, 0, { w: 1.0, h: 1.4, sill: 1.1, glass: 'clear' }),
            south: windowRow(top.x1 - top.x0, 2, 0, { w: 1.0, h: 1.4, sill: 1.1, glass: 'clear' }),
            east: windowRow(top.z1 - top.z0, 1, 0, { w: 1.0, h: 1.4, sill: 1.1, glass: 'clear' }),
          },
          wear: 0.3,
          parapet: 0.55,
          backdrop: true,
          yFloor: this.groundMax(s.r) + 0.09 + s.floors * STOREY + 0.02,
          yBase: this.groundMax(s.r) + 0.09 + s.floors * STOREY - 0.3,
        });
      }
    }

    // Water tanks and dishes on the skyline roofs, so the roofline is broken
    // by silhouette rather than being a straight line of coping stones.
    for (const s of skyline) {
      const y = this.groundMax(s.r) + 0.09 + s.floors * STOREY;
      const n = Math.round((s.r.x1 - s.r.x0) * (s.r.z1 - s.r.z0) / 42);
      for (let i = 0; i < n; i++) {
        const x = rng.range(s.r.x0 + 2, s.r.x1 - 2);
        const z = rng.range(s.r.z0 + 2, s.r.z1 - 2);
        const pick = rng.next();
        if (pick < 0.28) this.batch.placeAt('water_tank', x, y, z, rng.range(0, 6.28), rng.range(0.9, 1.15), tint(rng, 0.08));
        else if (pick < 0.46) this.batch.placeAt('water_tank_steel', x, y, z, rng.range(0, 6.28), 1, tint(rng, 0.08));
        else if (pick < 0.66) this.batch.placeAt('sat_dish', x, y, z, rng.range(-2.4, -0.8), rng.range(0.85, 1.2), tint(rng, 0.06));
        else if (pick < 0.78) this.batch.placeAt('chimney', x, y, z, rng.range(0, 6.28), 1, tint(rng, 0.1));
        else if (pick < 0.88) this.batch.placeAt('roof_vent', x, y, z, rng.range(0, 6.28), 1, tint(rng, 0.08));
        else {
          // Aerial masts: the tallest things on the skyline, and the cheapest.
          const mast = this.batch.solid('metal_rusted', cellFor(x, z));
          const h = rng.range(2.2, 4.4);
          const yaw = rng.range(0, 3.14);
          addCylinder(mast, x, y, z, 0.032, h, { segments: 4, color: [0.78, 0.74, 0.68] });
          for (let k = 0; k < 4; k++) {
            addBox(mast, x, y + h * (0.6 + k * 0.1), z, 1.0 - k * 0.14, 0.03, 0.03,
              { rotY: yaw, color: [0.8, 0.76, 0.7] });
          }
        }
      }
    }

    // Rubble barricades closing the streets at both ends of the map.
    for (const [x, z, w] of [
      [SOUK_CENTER_X, -62.5, 9], [0, -64.5, 17], [ALLEY_CENTER_X, -54, 7],
      [SOUK_CENTER_X, 60, 9], [0, 64.5, 17], [ALLEY_CENTER_X, 58, 7],
      [-43, -63, 8], [-43, 62, 8],
    ] as const) {
      this.barricade(x, z, w);
    }

    // The town gate: an arch across the market street, the map's north anchor.
    this.townGate();
  }

  private barricade(cx: number, cz: number, width: number): void {
    const rng = this.rng;
    const cell = cellFor(cx, cz);
    const count = Math.round(width * 0.8);
    for (let i = 0; i < count; i++) {
      const x = cx + rng.range(-width * 0.5, width * 0.5);
      const z = cz + rng.range(-1.9, 1.9);
      buildRubblePile(this.ctx, cell, x, z, rng.range(1.5, 3.0), rng.range(1.2, 2.6), this.g);
    }
    // Concrete blocks and a burnt frame or two poking out of the heap.
    for (let i = 0; i < Math.round(width * 0.5); i++) {
      const x = cx + rng.range(-width * 0.45, width * 0.45);
      const z = cz + rng.range(-1.4, 1.4);
      this.batch.placeAt('jersey_barrier', x, this.g(x, z), z, rng.range(0, 6.28), 1, tint(rng, 0.1));
    }
    this.blockers.push(rect(cx - width * 0.5, cz - 2.4, cx + width * 0.5, cz + 2.4));
  }

  /** Masonry arch over the north end of the market street. */
  private townGate(): void {
    const cell = cellFor(0, GATE_Z);
    const y = this.g(0, GATE_Z);
    const color: RGB = [1.01, 1.0, 1.14];
    // Piers.
    for (const s of [-1, 1]) {
      buildWall({
        ctx: this.ctx,
        cell,
        x0: s * 6.2, z0: GATE_Z - 1.4, x1: s * 6.2, z1: GATE_Z + 1.4,
        yBase: y - 0.7, height: 7.6, thickness: 2.4,
        material: 'stucco_ochre', trim: 'concrete', color,
        inner: false, courses: false, plinth: 0.5, grime: 0.35, wear: 0.9,
        floorLift: 0.7,
      });
      this.blockers.push(rect(s * 6.2 - 1.3, GATE_Z - 1.5, s * 6.2 + 1.3, GATE_Z + 1.5));
    }
    // Span with a turned arch beneath it, so the street reads through the gate.
    const buf = this.batch.solid('stucco_ochre', cell);
    const trim = this.batch.solid('concrete', cell);
    const springY = y + 5.0;
    const steps = 13;
    for (let i = 0; i < steps; i++) {
      const a = ((i + 0.5) / steps) * Math.PI;
      const px = -Math.cos(a) * 6.4;
      const py = springY + Math.sin(a) * 3.0;
      addBox(trim, px, py, GATE_Z, 1.5, 0.72, 3.0, {
        rotY: 0, color: [color[0] * 1.03, color[1] * 1.01, color[2] * 0.98],
      });
    }
    addBox(buf, 0, springY + 3.5, GATE_Z, 15.4, 1.5, 2.6, { color, grime: 0.2 });
    addBox(trim, 0, springY + 4.4, GATE_Z, 16.0, 0.36, 3.0, { color: [1.05, 1.02, 0.98] });
    // Merlons along the top; the silhouette against the sky is the whole point.
    for (let i = -4; i <= 4; i++) {
      addBox(trim, i * 1.75, springY + 4.9, GATE_Z, 0.9, 0.66, 2.4, {
        color: [1.03, 1.0, 0.95], bleach: 0.06,
      });
    }
    this.blockers.push(rect(-8, GATE_Z - 1.5, 8, GATE_Z + 1.5));
    this.landmarks.push({ name: 'Town Gate', position: new THREE.Vector3(0, y + 1.6, GATE_Z) });
    this.hotspots.push({ x: 0, z: GATE_Z + 5, radius: 7 });
  }

  /* ------------------------------- sea front ----------------------------- */

  private seaFront(): void {
    const rng = this.rng;
    const cell = 'corniche';
    const buf = this.batch.solid('concrete', cell);
    /*
     * Rendered blockwork, not brick. The sea wall runs the whole west edge of
     * the map and is the first thing the establishing shots frame against the
     * water; in the library's brick — a strong Victorian red — that band of
     * colour belonged to a different town.
     */
    const stone = this.batch.solid('stucco_sand', cell);

    // Sea wall: a battered base, a shaft, and a coping course with joints.
    for (let z = MAP.outerMinZ; z < MAP.outerMaxZ; z += 3) {
      const h = this.g(SEA_WALL_X + 0.6, z);
      const seg = Math.min(3, MAP.outerMaxZ - z);
      /*
       * A fresh sample of the render per three-metre bay. The wall runs a
       * hundred and twenty metres in one straight line and the render tiles at
       * two and a half, so its fallen-patch feature landed at the same height in
       * the same shape on every bay — forty copies of one blemish marching away
       * down the promenade, which is the most obvious tiling artefact the map had.
       */
      const uvOffset = hashOffset(z * 0.37, z * 1.13);
      addBox(buf, SEA_WALL_X - 0.42, (SEA_LEVEL + h) * 0.5, z + seg * 0.5,
        1.5, h - SEA_LEVEL + 0.9, seg,
        { color: [0.9, 0.88, 0.84], grime: 0.45, grimeHeight: 2.2, uvOffset });
      addBox(stone, SEA_WALL_X + 0.12, h + 0.45, z + seg * 0.5, 0.66, 0.9, seg - 0.06, {
        color: [0.98, 0.95, 0.9], grime: 0.2, bleach: 0.05, uvOffset,
      });
      addBox(stone, SEA_WALL_X + 0.1, h + 0.98, z + seg * 0.5, 0.9, 0.18, seg - 0.02, {
        color: [1.04, 1.01, 0.96], bleach: 0.08, uvOffset,
      });
    }
    this.blockers.push(rect(SEA_WALL_X - 1.4, MAP.outerMinZ, SEA_WALL_X + 0.7, MAP.outerMaxZ));

    // A section of the wall taken out by a shell, with the coping tipped into
    // the water. It gives the promenade a focal point and a reason to look west.
    const bz = -8;
    for (let z = bz; z < bz + 6; z += 3) {
      const h = this.g(SEA_WALL_X + 0.6, z);
      addBox(this.batch.solid('rubble', cell), SEA_WALL_X - 0.3, h + 0.15, z + 1.5,
        1.9, 0.7, 2.9, { color: [0.86, 0.83, 0.78], grime: 0.4 });
      addBox(this.batch.solid('concrete_damaged', cell), SEA_WALL_X - 1.6, h - 0.3, z + 1.4,
        1.2, 0.5, 2.2, { rotY: 0.4, color: [0.88, 0.86, 0.82] });
    }
    for (let i = 0; i < 5; i++) {
      const x = SEA_WALL_X - rng.range(1.0, 3.2);
      const z = bz + rng.range(-1, 7);
      addBox(this.batch.solid('rubble', cell), x, SEA_LEVEL + rng.range(0.6, 1.8), z,
        rng.range(0.8, 1.8), rng.range(0.5, 1.1), rng.range(0.7, 1.6),
        { rotY: rng.range(0, 3.14), color: [0.84, 0.82, 0.78] });
    }
    this.hotspots.push({ x: SEA_WALL_X + 3, z: bz + 3, radius: 6 });

    // Promenade furniture: bollards, benches, lamps, palms in a rank.
    for (let z = MAP.minZ + 4; z < MAP.maxZ - 4; z += 4.5) {
      const x = SEA_WALL_X + 1.35;
      if (rng.next() < 0.2) continue;
      this.batch.placeAt('bollard', x, this.g(x, z), z, 0, rng.range(0.94, 1.06), tint(rng, 0.09));
    }
    for (let z = -56; z < 58; z += 11.5) {
      const x = CORNICHE.x1 - 1.7 + rng.range(-0.4, 0.4);
      const zz = z + rng.range(-1.2, 1.2);
      this.palm(x, zz, rng.range(0.9, 1.2), rng.next() < 0.3 ? 3 : -1);
      if (rng.next() < 0.55) {
        const bx = SEA_WALL_X + 2.6;
        const bz = zz + rng.range(-3, 3);
        this.batch.placeAt('bench', bx, this.g(bx, bz), bz, Math.PI * 0.5, 1, tint(rng, 0.1));
      }
    }
    for (let z = -50; z < 56; z += 17) {
      const x = SEA_WALL_X + 2.2;
      this.batch.placeAt('street_lamp', x, this.g(x, z), z, -Math.PI * 0.5, 1, tint(rng, 0.05));
    }

    this.landmarks.push({ name: 'Sea Wall', position: new THREE.Vector3(SEA_WALL_X + 2, this.g(SEA_WALL_X + 2, 0) + 1.6, 0) });
  }

  /* ------------------------------ west shops ----------------------------- */

  private shopRoofs: BuildingInfo[] = [];

  private westShops(): void {
    const rng = this.rng;
    const segments: Array<{ r: Rect; enter?: boolean; roofOpen?: Partial<Record<Side, boolean>> }> = [
      { r: rect(-40, -60, -34, -42) },
      { r: rect(-40, -42, -34, -24), roofOpen: { south: true } },
      { r: rect(-40, -16, -34, -5), roofOpen: { north: true } },
      { r: SOUK_SHOP, enter: true },
      { r: rect(-40, 6, -34, 16) },
      { r: rect(-40, 24, -34, 42), roofOpen: { east: true } },
      { r: rect(-40, 42, -34, 58) },
    ];

    const palette: RGB[] = [
      [1.01, 1.0, 1.13], [0.96, 0.95, 0.98], [1.0, 0.97, 1.05],
      [0.93, 0.93, 0.95], [1.02, 1.01, 1.12],
    ];
    const mats: MaterialName[] = ['stucco_ochre', 'stucco_sand', 'plaster', 'concrete_painted'];

    segments.forEach((seg, idx) => {
      const r = seg.r;
      const len = r.z1 - r.z0;
      const col = palette[idx % palette.length];
      const mat = mats[(idx * 3 + 1) % mats.length];

      // East face onto the souk: shopfronts under the arcade.
      const east: Opening[] = [];
      const bays = Math.max(1, Math.round(len / 4.6));
      for (let i = 0; i < bays; i++) {
        const u = ((i + 0.5) * len) / bays;
        east.push({
          u, w: 2.5, h: 2.5, sill: 0, kind: 'shop',
          glass: rng.next() < 0.4 ? 'shutter' : 'none', noSill: true,
        });
      }
      // West face onto the corniche: high windows and the odd back door.
      const west: Opening[] = varyOpenings(
        windowRow(len, Math.max(2, Math.round(len / 5)), 0, {
          w: 0.95, h: 1.15, sill: 1.85, glass: 'clear',
        }), rng, 0.4,
      );
      west.push({ u: len * 0.5 + rng.range(-1.5, 1.5), w: 1.05, h: 2.15, sill: 0, kind: 'door', glass: 'clear' });

      const info = this.building({
        rect: r,
        floors: 1,
        storey: 4.15,
        material: mat,
        trim: 'concrete',
        color: col,
        sides: { east, west },
        interior: seg.enter === true,
        wear: 0.35,
        parapet: 0.92,
        roofOpen: seg.roofOpen,
        drift: ['west', 'north', 'south'],
        floorMaterial: 'ceramic_tile',
      });
      this.shopRoofs.push(info);
      this.platforms.push({ rect: inset(r, 0.6), y: info.yRoof, name: 'Shop roof' });

      // Shop awnings and signs facing the souk.
      for (let i = 0; i < bays; i++) {
        const z = r.z0 + ((i + 0.5) * len) / bays;
        if (rng.next() < 0.3) continue;
        buildAwning({
          ctx: this.ctx, cell: cellOf(r),
          x: r.x1, z, y: info.yFloor + 2.95, rotY: Math.PI * 0.5,
          width: 3.0, depth: 1.5, drop: 0.4,
          color: [rng.range(0.8, 1.2), rng.range(0.7, 1.0), rng.range(0.55, 0.9)],
        });
        if (rng.next() < 0.5) {
          this.batch.placeAt('shop_sign', r.x1 + 0.06, info.yFloor + 3.35, z, Math.PI * 0.5, rng.range(0.85, 1.15), tint(rng, 0.14, 0.4));
        }
      }

      if (seg.enter) {
        this.soukShopInterior(info);
      } else {
        // Blind rooms still need a back wall behind the shopfront so the player
        // does not see straight through into the corniche.
        const cell = cellOf(r);
        addBox(this.batch.solid('plaster', cell),
          r.x1 - 1.7, info.yFloor + 1.7, (r.z0 + r.z1) * 0.5,
          0.22, 3.4, len - 0.7, { color: [0.62, 0.6, 0.57], grime: 0.4 });
      }
    });

    this.landmarks.push({ name: 'Corniche', position: new THREE.Vector3(-43, this.g(-43, -20) + 1.6, -20) });
  }

  private soukShopInterior(info: BuildingInfo): void {
    const rng = this.rng;
    const r = info.inner;
    const cell = cellOf(info.rect);
    this.rooms.push({ name: 'Souk shop', rect: r, y: info.yFloor, height: 4.0 });
    this.hotspots.push({ x: (r.x0 + r.x1) * 0.5, z: (r.z0 + r.z1) * 0.5, radius: 3 });

    // A counter along the back and shelving up the party walls.
    const wood = this.batch.solid('wood_planks', cell);
    addBox(wood, r.x0 + 0.9, info.yFloor + 0.47, (r.z0 + r.z1) * 0.5, 0.72, 0.94, r.z1 - r.z0 - 2.4, {
      color: [0.92, 0.84, 0.7], grime: 0.3,
    });
    addBox(wood, r.x0 + 0.9, info.yFloor + 0.99, (r.z0 + r.z1) * 0.5, 0.86, 0.09, r.z1 - r.z0 - 2.2, {
      color: [1.0, 0.92, 0.78],
    });
    for (let i = 0; i < 4; i++) {
      const y = info.yFloor + 0.6 + i * 0.72;
      addBox(wood, r.x0 + 0.28, y, r.z0 + 1.4, 0.44, 0.06, 3.2, { color: [0.88, 0.8, 0.68] });
      for (let k = 0; k < 4; k++) {
        const z = r.z0 + 0.2 + rng.range(0.4, 3.0);
        if (rng.next() < 0.4) continue;
        this.batch.placeAt('basket', r.x0 + 0.3, y + 0.03, z, rng.range(0, 6.28), rng.range(0.5, 0.7), tint(rng, 0.16, 0.3));
      }
    }
    // Stock on the floor and a rug.
    const carpet = this.batch.solid('fabric_carpet', cell);
    /*
     * Multiplied hard toward a red kilim. The library's carpet is a soiled
     * mid-brown Berber at around a quarter albedo, and a rug is lit by bounce
     * alone, so anything near unity resolves to a black rectangle on the floor —
     * a hole rather than a furnishing, which is exactly how it read.
     */
    addBox(carpet, (r.x0 + r.x1) * 0.5 + 0.4, info.yFloor + 0.012, (r.z0 + r.z1) * 0.5, 2.4, 0.02, 3.4, {
      rotY: 0.06, color: [2.5, 1.42, 1.05],
    });
    for (let i = 0; i < 9; i++) {
      const x = rng.range(r.x0 + 0.5, r.x1 - 0.8);
      const z = rng.range(r.z0 + 0.5, r.z1 - 0.5);
      const pick = rng.next();
      const id = pick < 0.35 ? 'sack' : pick < 0.6 ? 'produce_crate' : pick < 0.8 ? 'basket' : 'crate_small';
      this.batch.placeAt(id, x, info.yFloor, z, rng.range(0, 6.28), rng.range(0.9, 1.1), tint(rng, 0.14, 0.2));
    }
    this.batch.placeAt('carpet_roll', r.x1 - 0.6, info.yFloor, r.z0 + 0.9, 0.3, 1, tint(rng, 0.2, 0.5));
  }

  /* --------------------------------- souk -------------------------------- */

  private souk(): void {
    const rng = this.rng;
    const cell = cellFor(SOUK_CENTER_X, 0);
    const zStart = SOUK.z0;
    const zEnd = SOUK.z1;

    // Arcade piers down both sides, carrying the roof structure. They also
    // break the lane's sightline into a rhythm of light and shadow.
    for (let z = zStart + 1; z < zEnd; z += 4.2) {
      for (const x of [SOUK.x0 + 0.35, SOUK.x1 - 0.35]) {
        if (z > -25 && z < -15) continue;
        if (z > 15 && z < 25) continue;
        const y = this.g(x, z);
        /*
         * Rendered piers with brickwork showing only where the render has come
         * off, rather than sixteen bare brick columns.
         *
         * Bare brick was the souk's biggest single colour: two rows of saturated
         * red-pink piers running the whole length of a lane whose walls, roof
         * cloth and floor are all bleached sand, and the whole space read as a
         * northern European mill rather than a North African market. Piers here
         * are rendered like everything else; what makes them interesting is that
         * the render is missing in patches at shoulder height where three
         * generations of handcarts have knocked into them.
         */
        const buf = this.batch.solid('stucco_sand', cell);
        const brick = this.batch.solid(BLOCK_MAT, cell);
        /*
         * Every pier gets its own sample of the render. Sixteen piers spaced at
         * 4.2 m under a material that tiles at 2.5 m otherwise draw the same
         * fallen patch at the same height sixteen times, and a row of identical
         * blemishes down a colonnade is the clearest copy-paste tell on the map.
         */
        const uvOffset = hashOffset(z * 1.7, x * 2.9);
        addBox(brick, x, y + 1.75, z, 0.58, 3.5, 0.58, {
          color: BRICK_BUFF, grime: 0.35, grimeHeight: 0.9, uvOffset,
        });
        addBox(buf, x, y + 1.75, z, 0.62, 3.5, 0.62, {
          color: [1.0, 0.96, 0.9], grime: 0.4, grimeHeight: 1.1, uvOffset,
        });
        // Render loss: two or three patches per pier, on the faces that get hit.
        for (let k = 0; k < 3; k++) {
          if (rng.next() < 0.45) continue;
          const face = rng.int(0, 3);
          const py = y + rng.range(0.5, 2.6);
          const w = rng.range(0.16, 0.42);
          const h = rng.range(0.2, 0.6);
          const off = 0.315;
          const [dx, dz] = [[off, 0], [-off, 0], [0, off], [0, -off]][face] as [number, number];
          addBox(brick, x + dx * 1.005, py, z + dz * 1.005,
            dz === 0 ? 0.02 : w, h, dz === 0 ? w : 0.02,
            { color: BRICK_BUFF, grime: 0.3, uvOffset });
        }
        addBox(this.batch.solid('concrete', cell), x, y + 3.62, z, 0.82, 0.24, 0.82, {
          color: [1.02, 0.99, 0.94],
        });
        addBox(this.batch.solid('concrete', cell), x, y + 0.14, z, 0.86, 0.28, 0.86, {
          color: [0.94, 0.92, 0.88], grime: 0.4,
        });
      }
    }

    /*
     * Roofing: timber purlins with fabric stretched over most bays, torn or
     * missing over others, so the lane is dappled rather than uniformly dim.
     *
     * On its own generator, deliberately. Every bay's covering is decided by one
     * draw from the town's shared stream, so adding three draws per pier in the
     * loop above reshuffled the entire roof — the souk went from two thirds
     * fabric to two thirds open slats and lost the dim, dappled character that is
     * the whole reason this lane exists. A dedicated seed makes the one
     * distribution the lane's lighting depends on immune to edits elsewhere.
     *
     * The odds also favour cloth much more heavily than they did. Slatted bays
     * pass a great deal of light, and at four in ten of them the arcade read as an
     * open street with a pergola over it.
     */
    const roofRng = new Rng(0x50c1);
    const roofY = this.g(SOUK_CENTER_X, 0) + 3.75;
    for (let z = zStart + 1; z < zEnd - 3; z += 4.2) {
      if (z > -26 && z < -14) continue;
      if (z > 14 && z < 26) continue;
      const seg = rect(SOUK.x0, z, SOUK.x1, Math.min(z + 4.2, zEnd));
      const roll = roofRng.next();
      const yLocal = this.g(SOUK_CENTER_X, z) + 3.75;
      if (roll < 0.42) {
        buildSlatRoof(this.ctx, cell, seg, yLocal, 3);
      } else if (roll < 0.86) {
        /*
         * Fabric stretched over the bay, and — the part that matters — timber
         * left visible *below* it. Cloth alone reads as a sheet floating over
         * the lane with nothing holding it up; a dark beam grid silhouetted
         * against backlit canvas is the single strongest depth cue the souk has,
         * and it is what every photograph of one of these markets shows.
         */
        const beams = this.batch.solid('wood_planks', cell);
        this.canopy(cell, seg, yLocal + 0.52, rng);
        for (const bz of [z + 0.35, z + 2.1, z + 3.9]) {
          addBox(beams, SOUK_CENTER_X, yLocal + 0.06, bz, SOUK.x1 - SOUK.x0, 0.15, 0.17, {
            color: [0.8, 0.72, 0.58], grime: 0.25,
          });
        }
        // Two light poles the long way, lashed under the cross beams.
        for (const bx of [SOUK_CENTER_X - 1.9, SOUK_CENTER_X + 1.9]) {
          addBox(beams, bx, yLocal - 0.07, (seg.z0 + seg.z1) * 0.5, 0.1, 0.1, seg.z1 - seg.z0, {
            color: [0.76, 0.68, 0.55], grime: 0.3,
          });
        }
      } else {
        // Open bay: only the stripped purlins remain.
        const beams = this.batch.solid('wood_planks', cell);
        for (let i = 0; i < 3; i++) {
          if (rng.next() < 0.3) continue;
          addBox(beams, SOUK_CENTER_X, yLocal + 0.1, z + 0.6 + i * 1.5,
            SOUK.x1 - SOUK.x0, 0.13, 0.14, { color: [0.8, 0.72, 0.58], grime: 0.3 });
        }
      }
      void roofY;
    }

    // Stalls: alternating sides, so the lane weaves.
    let side = 1;
    for (let z = zStart + 3; z < zEnd - 3; z += rng.range(4.5, 7.5)) {
      if (z > -26 && z < -14) continue;
      if (z > 14 && z < 26) continue;
      const x = SOUK_CENTER_X + side * rng.range(1.7, 2.5);
      this.marketStall(x, z, side > 0 ? -Math.PI * 0.5 : Math.PI * 0.5, rng, 0.85, 1);
      side = -side;
    }

    // Hanging cloth and lamp strings between the piers: the souk's signature.
    for (let z = zStart + 3; z < zEnd - 3; z += 5.4) {
      if (z > -26 && z < -14) continue;
      if (z > 14 && z < 26) continue;
      if (rng.next() < 0.4) continue;
      /*
       * A bolt of cloth hung off the roof timbers for sale. Built from vertical
       * panels of slightly different width and depth rather than one plate: a
       * single quad two metres tall reads as a hanging signboard, and the whole
       * point of these is to be soft edges against the hard arcade.
       */
      const cloth = this.batch.solid(CLOTH_MAT, cell);
      const y = this.g(SOUK_CENTER_X, z) + 3.35;
      const w = rng.range(0.55, 0.95);
      const drop = rng.range(0.8, 1.6);
      const cx = SOUK_CENTER_X + rng.range(-2.4, 2.4);
      const yaw = rng.range(-0.35, 0.35);
      /*
       * Bolts for sale are dyed cloth: saturated, bright, and drawn from a set
       * palette. Against the library's khaki canvas — olive to start with and more
       * so once linearised — three independent ranges could only ever produce
       * variations on that khaki, and a row of olive plates hanging in a dim lane
       * is the one thing in the souk that must not read as sheet material.
       */
      const BOLTS: RGB[] = [
        [0.3, 0.5, 2.3],   // indigo
        [2.2, 0.6, 0.45],  // madder red
        [2.3, 1.6, 0.4],   // saffron
        [0.5, 1.5, 1.1],   // green
        [1.2, 0.7, 2.0],   // aubergine
        [2.0, 2.1, 3.0],   // undyed white
      ];
      const bolt = BOLTS[rng.int(0, BOLTS.length - 1)];
      const bk = rng.range(0.82, 1.1);
      const base: RGB = [bolt[0] * bk, bolt[1] * bk, bolt[2] * bk];
      const folds = 4;
      for (let f = 0; f < folds; f++) {
        const u = -w * 0.5 + (w * (f + 0.5)) / folds;
        // Each fold hangs a little differently and stands off the one beside it,
        // so the edge is broken and the light varies across the drop.
        const shade = 0.82 + 0.24 * Math.abs(Math.sin(f * 1.7 + z));
        const zOff = Math.sin(f * 2.3 + z * 0.4) * 0.05;
        const len = drop * rng.range(0.86, 1.0);
        addBox(cloth,
          cx + Math.cos(yaw) * u, y - len * 0.5, z - Math.sin(yaw) * u + zOff,
          (w / folds) * 1.15, len, 0.035,
          {
            rotY: yaw + rng.range(-0.12, 0.12),
            color: [base[0] * shade, base[1] * shade, base[2] * shade],
            grime: 0.12,
          });
      }
      // The pole it is folded over.
      addBox(this.batch.solid('wood_planks', cell), cx, y + 0.03, z, w * 1.2, 0.06, 0.06, {
        rotY: yaw, color: [0.82, 0.74, 0.6],
      });
    }
    for (let z = zStart + 2; z < zEnd - 4; z += 8.4) {
      if (z > -28 && z < -12) continue;
      if (z > 12 && z < 28) continue;
      const y0 = this.g(SOUK.x0, z) + 3.5;
      addCatenary(this.batch.solid('metal_rusted', cell),
        SOUK.x0 + 0.4, y0, z, SOUK.x1 - 0.4, y0 + rng.range(-0.2, 0.2), z + rng.range(-1, 1),
        rng.range(0.25, 0.6), 0.018, 7, [0.78, 1.02, 1.16]);
    }

    /*
     * Goods stacked against the pier line, both sides, the whole length.
     *
     * The lane was eight metres of empty floor with a stall every six, and the
     * reason it looked wrong is that nobody trading in a souk leaves the two metres
     * behind their pitch empty — that is where the stock lives. Everything here
     * hugs the piers, so the walkable middle of the lane is untouched and the
     * gameplay width is unchanged; what it buys is a continuous band of clutter at
     * knee height down both sides, which is most of what makes a covered market
     * read as crowded.
     */
    for (let z = zStart + 2; z < zEnd - 2; z += rng.range(1.5, 3.2)) {
      if (z > -26 && z < -14) continue;
      if (z > 14 && z < 26) continue;
      const s = rng.bool() ? 1 : -1;
      const x = SOUK_CENTER_X + s * rng.range(2.9, 3.5);
      const y = this.g(x, z);
      const pick = rng.next();
      if (pick < 0.2) {
        // A stack of sacks, which is the souk's most characteristic silhouette.
        for (let i = 0; i < 2 + rng.int(0, 2); i++) {
          this.batch.placeAt('sack', x + rng.range(-0.3, 0.3), y + i * 0.26, z + rng.range(-0.3, 0.3),
            rng.range(0, 6.28), rng.range(0.9, 1.15), tint(rng, 0.16, 0.2));
        }
      } else if (pick < 0.38) {
        for (let i = 0; i < 2 + rng.int(0, 2); i++) {
          this.batch.placeAt('basket', x + rng.range(-0.35, 0.35), y + i * 0.3, z + rng.range(-0.35, 0.35),
            rng.range(0, 6.28), rng.range(0.85, 1.1), tint(rng, 0.18, 0.28));
        }
      } else if (pick < 0.52) {
        this.batch.placeAt('produce_crate', x, y, z, rng.range(0, 6.28), 1, tint(rng, 0.16, 0.24));
        this.batch.placeAt('produce_crate', x + rng.range(-0.2, 0.2), y + 0.32, z + rng.range(-0.2, 0.2),
          rng.range(0, 6.28), 1, tint(rng, 0.16, 0.24));
        if (rng.next() < 0.6) {
          this.batch.placeAt('produce_pile', x, y + 0.62, z, rng.range(0, 6.28), 0.9, tint(rng, 0.2, 0.5));
        }
      } else if (pick < 0.64) {
        this.batch.placeAt('clay_pot', x, y, z, rng.range(0, 6.28), rng.range(0.9, 1.3), tint(rng, 0.16, 0.2));
        if (rng.next() < 0.5) {
          this.batch.placeAt('clay_pot', x + rng.range(-0.5, 0.5), y, z + rng.range(-0.5, 0.5),
            rng.range(0, 6.28), rng.range(0.7, 1.0), tint(rng, 0.16, 0.2));
        }
      } else if (pick < 0.74) {
        this.batch.placeAt('carpet_roll', x, y, z, rng.range(0, 6.28), 1, tint(rng, 0.2, 0.4));
      } else if (pick < 0.84) {
        this.batch.placeAt('crate_small', x, y, z, rng.range(0, 6.28), 1, tint(rng, 0.14));
      } else if (pick < 0.92) {
        this.batch.placeAt('bucket', x, y, z, rng.range(0, 6.28), 1, tint(rng, 0.14, 0.2));
      } else {
        this.batch.placeAt('pot_plant', x, y, z, rng.range(0, 6.28), rng.range(0.9, 1.2), tint(rng, 0.14));
        this.batch.placeAt('clay_pot', x, y, z, rng.range(0, 6.28), 1.1, tint(rng, 0.14));
      }
    }

    this.landmarks.push({ name: 'Souk', position: new THREE.Vector3(SOUK_CENTER_X, this.g(SOUK_CENTER_X, 0) + 1.6, 0) });
    this.hotspots.push({ x: SOUK_CENTER_X, z: -8, radius: 8 });
    this.hotspots.push({ x: SOUK_CENTER_X, z: 34, radius: 8 });
    this.hotspots.push({ x: SOUK_CENTER_X, z: -40, radius: 8 });
  }

  /**
   * A sagging fabric sheet stretched over a bay, torn along one edge.
   *
   * The mesh is finer than the sag strictly needs because this is the souk's
   * ceiling and the player spends the whole lane looking up at it: at 4x3 the
   * facets are wide enough to read as folded card.
   *
   * Bays alternate which way their underside faces — across the lane toward the
   * sea, then back inland — so the sheet reads as a run of separate lengths of
   * cloth catching the low sun at different angles rather than one lid. See
   * `addCloth` for why the underside is not simply the reverse of the top.
   */
  private canopy(cell: string, r: Rect, y: number, rng: Rng): void {
    const buf = this.batch.solid('fabric_canvas', cell);
    const nx = 6;
    const nz = 4;
    const under = [
      new THREE.Vector3(-0.88, -0.47, 0).normalize(),
      new THREE.Vector3(0.72, -0.55, 0.42).normalize(),
    ];
    // Warm and light. Canvas that has spent ten summers over this lane is bleached
    // straw, not the olive a neutral tint pulls out of the canvas albedo.
    const col: RGB = [rng.range(1.15, 1.4), rng.range(0.98, 1.16), rng.range(0.72, 0.92)];
    const tear = rng.next() < 0.5 ? rng.range(0.35, 0.75) : 1;
    const phase = rng.range(0, 6.28);
    const p = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    const at = (u: number, v: number, out: THREE.Vector3): THREE.Vector3 => {
      // Catenary across the span, plus a shallow cross-sag and a low-frequency
      // ripple so no two bays fold the same way.
      const sag = Math.sin(u * Math.PI) * 0.26 + Math.sin(v * Math.PI) * 0.1;
      const ripple = Math.sin(u * 4.3 + phase) * Math.sin(v * 2.6 + phase * 0.7) * 0.05;
      return out.set(
        r.x0 + (r.x1 - r.x0) * u,
        y - sag + ripple,
        r.z0 + (r.z1 - r.z0) * v,
      );
    };
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < nz; j++) {
        const u0 = i / nx;
        const u1 = (i + 1) / nx;
        const v0 = j / nz;
        const v1 = (j + 1) / nz;
        if (u0 > tear && j === nz - 1) continue;
        at(u0, v0, p[0]);
        at(u1, v0, p[1]);
        at(u1, v1, p[2]);
        at(u0, v1, p[3]);
        const uvs = [
          u0 * (r.x1 - r.x0), v0 * (r.z1 - r.z0),
          u1 * (r.x1 - r.x0), v0 * (r.z1 - r.z0),
          u1 * (r.x1 - r.x0), v1 * (r.z1 - r.z0),
          u0 * (r.x1 - r.x0), v1 * (r.z1 - r.z0),
        ];
        // Transmitted light: warmer and brighter than the top face, because the
        // sun is behind it and this is the brightest surface in the lane.
        addCloth(buf, p[0], p[1], p[2], p[3], uvs, col,
          [col[0] * 1.5, col[1] * 1.28, col[2] * 0.92],
          _up, under[(i + j) % 2], 0.04);
      }
    }
  }

  /**
   * A hand-placed pile of related props.
   *
   * Offsets are relative to the pile's anchor, and the fourth number lifts a
   * prop onto the one below it. Yaw, scale and tint are still drawn from the
   * generator, so two piles of the same recipe do not read as copies.
   */
  private propCluster(
    x: number, z: number,
    rng: Rng,
    items: ReadonlyArray<readonly [string, number, number, number?]>,
  ): void {
    let minX = x;
    let maxX = x;
    let minZ = z;
    let maxZ = z;
    for (const [id, dx, dz, dy] of items) {
      const px = x + dx;
      const pz = z + dz;
      this.batch.placeAt(id, px, this.g(px, pz) + (dy ?? 0), pz,
        rng.range(0, 6.28), rng.range(0.92, 1.08), tint(rng, 0.14, 0.2));
      minX = Math.min(minX, px - 0.4);
      maxX = Math.max(maxX, px + 0.4);
      minZ = Math.min(minZ, pz - 0.4);
      maxZ = Math.max(maxZ, pz + 0.4);
    }
    this.blockers.push(rect(minX, minZ, maxX, maxZ));
  }

  /**
   * A string of triangular pennants hanging from a slack line.
   *
   * Each flag hangs from two points on the wire and comes to a point below, and
   * gets a small twist about the wire so the row is not a single flat ribbon —
   * from below that twist is the only thing that says these are cloth.
   */
  private bunting(
    cell: string,
    x0: number, y0: number, z0: number,
    x1: number, y1: number, z1: number,
    sag: number,
    rng: Rng,
  ): void {
    const buf = this.batch.solid(CLOTH_MAT, cell);
    const span = Math.hypot(x1 - x0, z1 - z0);
    /*
     * Real bunting flags are a hand's width across, and the spacing has to stay
     * absolute rather than scale with the span.
     *
     * At half-metre spacing across a sixteen-metre street this drew thirty
     * pennants a third of a metre wide, and a row of thirty coarse triangles
     * silhouetted against a bright sky is a set of shark's teeth clamped across
     * the top of the frame — it read as the subject of the shot rather than as
     * dressing on it. Finer and denser is both more accurate and much quieter:
     * the run resolves as a bright dotted ribbon and the eye passes over it.
     */
    const flags = Math.max(8, Math.round(span / 0.34));
    const w = (span / flags) * 0.66;
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    const on = (t: number, out: THREE.Vector3): THREE.Vector3 => out.set(
      x0 + (x1 - x0) * t,
      y0 + (y1 - y0) * t - Math.sin(t * Math.PI) * sag,
      z0 + (z1 - z0) * t,
    );
    const dx = (x1 - x0) / span;
    const dz = (z1 - z0) / span;
    for (let i = 0; i < flags; i++) {
      on((i + 0.12) / flags, a);
      on((i + 0.88) / flags, b);
      // Apex below the midpoint of the top edge, pushed off the wire by the
      // twist so consecutive flags catch light differently.
      const twist = rng.range(-0.35, 0.35);
      c.set(
        (a.x + b.x) * 0.5 - dz * twist * w * 0.5,
        (a.y + b.y) * 0.5 - w * rng.range(1.0, 1.3),
        (a.z + b.z) * 0.5 + dx * twist * w * 0.5,
      );
      /*
       * Bright, and almost as bright on the shaded face. One layer of printed
       * cotton is close to translucent, so a backlit pennant is *lighter* than a
       * front-lit one, not darker — and since half of any run is seen from its
       * shadow side, tapering the back face is what turns the string into a row
       * of black teeth on the sky.
       */
      const col: RGB = [rng.range(1.3, 2.1), rng.range(1.0, 1.8), rng.range(0.85, 1.7)];
      addTri(buf, a, b, c, 1.4, col, [col[0] * 1.05, col[1] * 1.02, col[2] * 0.98]);
    }
  }

  /**
   * Four posts, a counter and a canopy: the market's repeating unit.
   *
   * `canopyChance` exists because a stall frame without its cloth reads as
   * scaffolding, which is fine as an occasional beat on the open street but
   * wrong inside the souk, where the canopies are most of what the player sees.
   */
  private marketStall(x: number, z: number, yaw: number, rng: Rng, scale = 1, canopyChance = 0.82): void {
    const cell = cellFor(x, z);
    const y = this.g(x, z);
    const w = 2.4 * scale;
    const d = 1.5 * scale;
    this.batch.placeAt('stall_frame', x, y, z, yaw, scale, tint(rng, 0.12, 0.2));
    if (rng.next() < canopyChance) {
      this.batch.placeAt('stall_canopy', x, y, z, yaw, scale, tint(rng, 0.22, 0.35));
    }
    // Produce on the counter.
    const cs = Math.cos(yaw);
    const sn = Math.sin(yaw);
    const n = Math.round(rng.range(2, 5));
    for (let i = 0; i < n; i++) {
      const lu = rng.range(-w * 0.38, w * 0.38);
      const lv = rng.range(-d * 0.22, d * 0.22);
      const px = x + lu * cs + lv * sn;
      const pz = z - lu * sn + lv * cs;
      const id = rng.next() < 0.55 ? 'produce_crate' : 'basket';
      this.batch.placeAt(id, px, y + 0.86 * scale, pz, rng.range(0, 6.28), scale * rng.range(0.85, 1.05), tint(rng, 0.16, 0.3));
      if (rng.next() < 0.6) {
        this.batch.placeAt('produce_pile', px, y + 0.86 * scale + 0.3 * scale, pz, rng.range(0, 6.28), scale * 0.9, tint(rng, 0.2, 0.5));
      }
    }
    // Stock stacked underneath and beside.
    for (let i = 0; i < Math.round(rng.range(1, 4)); i++) {
      const px = x + rng.range(-w * 0.6, w * 0.6);
      const pz = z + rng.range(-d * 0.9, d * 0.9);
      const id = rng.next() < 0.5 ? 'crate_small' : rng.next() < 0.6 ? 'sack' : 'basket';
      this.batch.placeAt(id, px, this.g(px, pz), pz, rng.range(0, 6.28), rng.range(0.85, 1.15), tint(rng, 0.14, 0.2));
    }
    this.blockers.push(rect(x - w * 0.5, z - d * 0.5, x + w * 0.5, z + d * 0.5));
  }

  /* ------------------------------ west block ----------------------------- */

  private cafe!: BuildingInfo;
  private wbNorth!: BuildingInfo;
  private wbMiddle!: BuildingInfo;
  private wbSouth!: BuildingInfo;
  private soukAnnexe!: BuildingInfo;

  private westBlock(): void {
    /* --- north: a tall backdrop and a two-storey block with a walkable roof */
    this.residential(rect(-26, -60, -8, -44), 3, 'stucco_sand', [0.98, 0.94, 0.87], 0.3);
    this.wbNorth = this.residential(rect(-26, -44, -8, -24), 2, 'stucco_ochre', [1.02, 1.0, 1.15], 0.55,
      { roofOpen: { south: true } });
    this.platforms.push({ rect: inset(this.wbNorth.rect, 0.8), y: this.wbNorth.yRoof, name: 'North roof' });

    /* --- middle: the café, its neighbour, and a low roof terrace ---------- */
    this.wbMiddle = this.residential(rect(-26, -16, -20, 16), 2, 'plaster', [0.96, 0.94, 0.9], 0.35,
      { roofOpen: { north: true, south: true, east: true } });
    this.cafeBuilding();
    const terrace = this.residential(rect(-20, 2, -8, 16), 1, 'stucco_ochre', [1.0, 0.98, 1.11], 0.4,
      { storey: 4.3, roofOpen: { north: true } });
    this.platforms.push({ rect: inset(terrace.rect, 0.8), y: terrace.yRoof, name: 'Terrace' });
    this.platforms.push({ rect: inset(this.wbMiddle.rect, 0.8), y: this.wbMiddle.yRoof, name: 'West roof' });

    // Stair from the low terrace up to the café roof, running along the party
    // wall and landing through the gap left in the café's south parapet.
    const climb = this.cafe.yRoof - terrace.yRoof;
    const run = Math.round(climb / 0.185) * 0.29;
    buildStair({
      ctx: this.ctx, cell: cellOf(terrace.rect),
      x: -18.4, y: terrace.yRoof, z: 2.2 + run, rotY: Math.PI * 0.5,
      width: 1.2, rise: 0.185, height: climb,
      material: 'concrete', railing: 'left',
    });

    /* --- south ------------------------------------------------------------ */
    this.wbSouth = this.residential(rect(-26, 24, -8, 42), 2, 'concrete_painted', [0.93, 0.91, 0.87], 0.45,
      { roofOpen: { north: true } });
    this.platforms.push({ rect: inset(this.wbSouth.rect, 0.8), y: this.wbSouth.yRoof, name: 'South roof' });
    this.residential(rect(-26, 42, -8, 60), 3, 'stucco_ochre', [0.99, 0.98, 1.16], 0.3);

    /* --- souk annexe: a lean-to shop projecting into the covered lane ----- */
    // Its roof is forced level with the shop row opposite so a plank crossing
    // between them lies flat, and its bulk pinches the souk into a chokepoint.
    const annexeRect = rect(-29.6, 29, -26, 39);
    const target = this.shopRoofs[5]?.yRoof ?? this.groundMax(annexeRect) + 4.3;
    const yF = this.groundMax(annexeRect) + 0.09;
    this.soukAnnexe = this.building({
      rect: annexeRect,
      floors: 1,
      storey: Math.max(3.4, target - yF),
      yFloor: yF,
      // Render. In fired clay this ten-metre wall was the strongest colour in the
      // souk, which is a lane whose whole character is bleached and dim.
      material: 'stucco_sand',
      trim: 'concrete',
      color: [1.02, 0.98, 0.92],
      sides: {
        west: [
          { u: 3.0, w: 2.4, h: 2.5, sill: 0, kind: 'shop', glass: 'none', noSill: true, awning: true },
          { u: 7.0, w: 2.2, h: 2.4, sill: 0, kind: 'shop', glass: 'shutter', noSill: true },
        ],
        north: [{ u: 1.8, w: 1.05, h: 2.1, sill: 0, kind: 'door', glass: 'none' }],
      },
      wear: 0.5,
      parapet: 0.85,
      roofOpen: { west: true },
      drift: ['north', 'south', 'west'],
    });
    this.platforms.push({ rect: inset(annexeRect, 0.5), y: this.soukAnnexe.yRoof, name: 'Annexe roof' });
    this.dressRoof(this.soukAnnexe, this.rng);
  }

  /**
   * A generic town house: shopfronts or a door at street level, windows above
   * with a scatter of balconies, air-conditioning units and shutters, and a
   * dressed roof. Everything is randomised per instance so a run of them never
   * reads as one building repeated.
   */
  private residential(
    r: Rect,
    floors: number,
    material: MaterialName,
    color: RGB,
    wear: number,
    extra: { storey?: number; roofOpen?: Partial<Record<Side, boolean>> } = {},
  ): BuildingInfo {
    const rng = this.rng;
    const storey = extra.storey ?? STOREY;
    const sides: Partial<Record<Side, Opening[]>> = {};
    const pilasters: Partial<Record<Side, number[]>> = {};

    for (const side of ['north', 'south', 'east', 'west'] as Side[]) {
      const line = sideLine(r, side);
      const len = line.length;
      if (len < 3) continue;
      const list: Opening[] = [];
      /*
       * Which faces front a lane, and therefore get shops, awnings and balconies
       * rather than a sparse grid of small windows.
       *
       * The west block's street face sits at exactly x = -8 and this test used
       * -8.01, so it failed for every building on that side of the market street:
       * the whole west frontage — the left-hand wall of the hero shot — was built
       * with the back-elevation rule and came out as flat render with a window
       * every four metres, which is the textbook definition of a textured box. The
       * tolerance now sits on the correct side of the boundary.
       */
      const faceStreet =
        (side === 'east' && r.x1 <= -7.99) ||
        (side === 'west' && r.x0 >= 7.99) ||
        (side === 'west' && r.x0 <= -25.9) ||
        (side === 'east' && r.x1 >= 21.9);
      // A North African terrace has an opening roughly every three metres, and
      // that density is most of what tells the eye how big the building is.
      const bays = Math.max(2, Math.round(len / (faceStreet ? 3.2 : 4.2)));

      // Party walls every two or three bays, so an eighteen-metre frontage
      // reads as five houses that grew together rather than one long block.
      if (len > 7) {
        const step = rng.next() < 0.5 ? 2 : 3;
        const line2: number[] = [];
        for (let i = step; i < bays; i += step) line2.push((i * len) / bays);
        pilasters[side] = line2;
      }

      if (faceStreet) {
        // Ground floor: shops and doors onto the lane.
        for (let i = 0; i < bays; i++) {
          const u = ((i + 0.5) * len) / bays;
          const roll = rng.next();
          if (roll < 0.34) {
            list.push({ u, w: 2.3, h: 2.6, sill: 0, kind: 'shop', glass: rng.next() < 0.5 ? 'shutter' : 'boarded', noSill: true, awning: rng.next() < 0.45 });
          } else if (roll < 0.55) {
            list.push({ u, w: 1.1, h: 2.2, sill: 0, kind: 'door', glass: 'clear' });
          } else if (roll < 0.72) {
            list.push({ u, w: 1.4, h: 2.4, sill: 0, kind: 'arch', glass: 'none', noSill: true });
          } else {
            list.push({ u, w: 1.1, h: 1.35, sill: 1.15, kind: 'window', glass: 'clear' });
          }
        }
      } else {
        for (let i = 0; i < bays; i++) {
          const u = ((i + 0.5) * len) / bays;
          if (rng.next() < 0.28) continue;
          list.push({ u, w: 0.95, h: 1.25, sill: 1.5, kind: 'window', glass: 'clear' });
        }
      }

      for (let f = 1; f < floors; f++) {
        for (let i = 0; i < bays; i++) {
          const u = ((i + 0.5) * len) / bays;
          if (rng.next() < 0.12) continue;
          const balcony = faceStreet && f === 1 && rng.next() < 0.35;
          list.push({
            u, w: balcony ? 1.25 : 1.05, h: balcony ? 1.95 : 1.4,
            sill: balcony ? 0.15 : 1.05, floor: f,
            kind: 'window', glass: 'clear',
            balcony,
            ac: !balcony && rng.next() < 0.22,
          });
        }
      }
      sides[side] = varyOpenings(list, rng, 0.3);
    }

    const info = this.building({
      rect: r,
      floors,
      storey,
      material,
      trim: rng.next() < 0.4 ? 'stucco_sand' : 'concrete',
      color,
      sides,
      pilasters,
      wear,
      parapet: rng.range(0.8, 1.15),
      roofOpen: extra.roofOpen,
      drift: ['north', 'south', 'east', 'west'],
    });
    this.dressRoof(info, rng);
    return info;
  }

  /**
   * A roof the player can fight on has to be as dressed as a street, and a
   * North African roof genuinely is one: it is the utility floor of the
   * building, so it carries the water storage, the aerials, the drying laundry
   * and everything nobody wanted to carry back down the stairs. It also has to
   * give cover away from the parapet, or a rooftop duel is decided by whoever
   * arrives second.
   */
  private dressRoof(info: BuildingInfo, rng: Rng): void {
    const r = inset(info.rect, 1.15);
    const area = (r.x1 - r.x0) * (r.z1 - r.z0);
    if (area < 6) return;
    const y = info.yRoof;
    const cell = cellOf(info.rect);
    const taken: Array<[number, number, number]> = [];
    const free = (x: number, z: number, radius: number): boolean => {
      for (const [tx, tz, tr] of taken) {
        if ((x - tx) ** 2 + (z - tz) ** 2 < (radius + tr) ** 2) return false;
      }
      taken.push([x, z, radius]);
      return true;
    };

    const n = Math.max(3, Math.round(area / 11));
    for (let i = 0; i < n; i++) {
      const x = rng.range(r.x0, r.x1);
      const z = rng.range(r.z0, r.z1);
      const pick = rng.next();
      if (pick < 0.16) {
        if (!free(x, z, 0.95)) continue;
        this.batch.placeAt('water_tank', x, y, z, rng.range(0, 6.28), rng.range(0.9, 1.15), tint(rng, 0.09));
        // Tanks sit on a low plinth or a pallet, never straight on the slab.
        addBox(this.batch.solid('concrete', cell), x, y + 0.07, z, 1.5, 0.14, 1.5,
          { color: [0.9, 0.88, 0.85], grime: 0.3 });
      } else if (pick < 0.26) {
        if (!free(x, z, 0.9)) continue;
        this.batch.placeAt('water_tank_steel', x, y, z, rng.range(0, 6.28), 1, tint(rng, 0.09));
        // Steel tanks stand on a welded frame, which the silhouette needs.
        const frame = this.batch.solid('metal_rusted', cell);
        for (const sx of [-1, 1]) {
          for (const sz of [-1, 1]) {
            addBox(frame, x + sx * 0.52, y + 0.2, z + sz * 0.52, 0.07, 0.4, 0.07,
              { color: [0.8, 0.74, 0.66] });
          }
        }
      } else if (pick < 0.42) {
        if (!free(x, z, 0.55)) continue;
        this.batch.placeAt('sat_dish', x, y, z, rng.range(-2.6, -0.6), rng.range(0.85, 1.15), tint(rng, 0.06));
      } else if (pick < 0.53) {
        if (!free(x, z, 0.6)) continue;
        this.batch.placeAt('ac_unit', x, y, z, rng.range(0, 6.28), 1, tint(rng, 0.08));
      } else if (pick < 0.61) {
        if (!free(x, z, 0.45)) continue;
        this.batch.placeAt('chimney', x, y, z, rng.range(0, 6.28), 1, tint(rng, 0.1));
      } else if (pick < 0.69) {
        if (!free(x, z, 0.42)) continue;
        this.batch.placeAt('roof_vent', x, y, z, rng.range(0, 6.28), 1, tint(rng, 0.08));
      } else if (pick < 0.76) {
        if (!free(x, z, 0.5)) continue;
        this.batch.placeAt('crate_large', x, y, z, rng.range(0, 6.28), rng.range(0.85, 1.05), tint(rng, 0.12));
        if (rng.next() < 0.5) {
          this.batch.placeAt('crate_small', x + rng.range(-0.3, 0.3), y + 0.79,
            z + rng.range(-0.3, 0.3), rng.range(0, 6.28), 1, tint(rng, 0.12));
        }
      } else if (pick < 0.82) {
        if (!free(x, z, 0.4)) continue;
        // TV aerial: a mast with a rung of dipoles. Pure silhouette value.
        const mast = this.batch.solid('metal_rusted', cell);
        const h = rng.range(1.5, 2.8);
        const yaw = rng.range(0, 3.14);
        addCylinder(mast, x, y, z, 0.028, h, { segments: 5, color: [0.78, 0.74, 0.68] });
        addBox(mast, x, y + 0.06, z, 0.3, 0.12, 0.3, { color: [0.74, 0.7, 0.64] });
        for (let k = 0; k < 5; k++) {
          const yy = y + h * (0.55 + k * 0.09);
          addBox(mast, x, yy, z, 0.9 - k * 0.1, 0.026, 0.026, { rotY: yaw, color: [0.8, 0.76, 0.7] });
        }
        for (const sx of [-1, 1]) {
          addCatenary(mast, x, y + h * 0.9, z,
            x + Math.cos(yaw + 1.6) * sx * 1.3, y + 0.06, z + Math.sin(yaw + 1.6) * sx * 1.3,
            0.04, 0.011, 4, [0.6, 0.57, 0.53]);
        }
      } else if (pick < 0.88) {
        if (!free(x, z, 0.5)) continue;
        this.batch.placeAt('drum_rust', x, y, z, rng.range(0, 6.28), 1, tint(rng, 0.12));
      } else if (pick < 0.93) {
        if (!free(x, z, 0.4)) continue;
        this.batch.placeAt(rng.bool() ? 'plastic_chair' : 'bucket', x, y, z,
          rng.range(0, 6.28), 1, tint(rng, 0.2, 0.3));
      } else if (pick < 0.97) {
        if (!free(x, z, 0.35)) continue;
        this.batch.placeAt('rubble_chunk', x, y, z, rng.range(0, 6.28), rng.range(0.8, 1.3), tint(rng, 0.14));
      } else {
        if (!free(x, z, 0.4)) continue;
        this.batch.placeAt('tyre', x, y, z, rng.range(0, 6.28), 1, tint(rng, 0.1));
      }
    }

    // A short run of pipe along the roof, tying the utilities together.
    if (r.x1 - r.x0 > 4.5 && rng.next() < 0.6) {
      const z = rng.range(r.z0, r.z1);
      const pipe = this.batch.solid('metal_rusted', cell);
      const x0 = r.x0 + rng.range(0, 0.8);
      const x1 = r.x1 - rng.range(0, 0.8);
      addBox(pipe, (x0 + x1) * 0.5, y + 0.24, z, x1 - x0, 0.09, 0.09,
        { color: [0.84, 0.78, 0.7], grime: 0.4 });
      for (let x = x0 + 0.5; x < x1; x += rng.range(1.3, 2.2)) {
        addBox(pipe, x, y + 0.1, z, 0.1, 0.2, 0.1, { color: [0.78, 0.72, 0.65] });
      }
    }

    /*
     * Laundry lines: two poles and hanging cloth. Reads instantly as lived in.
     *
     * Deliberately short — four to seven metres — and set somewhere inside the
     * roof rather than strung the full width of it. A line pinned between the two
     * parapets of an eighteen-metre roof is not something anybody builds, and it
     * guarantees that a pole and a run of washing cross the frame from any camera
     * standing on that roof.
     */
    const lines = rng.next() < 0.72 ? (r.x1 - r.x0 > 11 ? 2 : 1) : 0;
    for (let l = 0; l < lines && r.x1 - r.x0 > 4.5; l++) {
      const span = Math.min(r.x1 - r.x0 - 1.2, rng.range(3.8, 7.0));
      const x0 = rng.range(r.x0 + 0.5, r.x1 - 0.5 - span);
      const x1 = x0 + span;
      const z = rng.range(r.z0 + 0.6, r.z1 - 0.6);
      const pole = this.batch.solid('metal_rusted', cell);
      for (const x of [x0, x1]) {
        addBox(pole, x, y + 0.9, z, 0.07, 1.8, 0.07, { color: [0.72, 0.66, 0.6] });
        addBox(pole, x, y + 1.78, z, 0.5, 0.06, 0.06, { color: [0.72, 0.66, 0.6] });
        // A guy wire back to the deck, which is what stops a real one folding.
        addTube(pole, new THREE.Vector3(x, y + 1.7, z),
          new THREE.Vector3(x, y + 0.05, z + (x === x0 ? -0.8 : 0.8)), 0.012, 4, [0.6, 0.57, 0.53]);
      }
      addCatenary(pole, x0, y + 1.74, z, x1, y + 1.74, z, 0.16, 0.014, 6, [0.62, 0.58, 0.54]);
      const items = Math.max(2, Math.round(span / 1.05));
      for (let i = 0; i < items; i++) {
        if (rng.next() < 0.22) continue;
        const t = (i + 0.5) / items;
        const x = x0 + span * t;
        // Follows the catenary, so nothing hangs off the line in mid-air.
        const droop = Math.sin(t * Math.PI) * 0.16;
        this.batch.placeAt(`laundry_${rng.int(0, 2)}`, x, y + 1.74 - droop, z,
          rng.range(-0.2, 0.2), rng.range(0.85, 1.2), tint(rng, 0.22, 0.16));
      }
    }

    // Sand and grit banked into the roof's corners, and a tar repair patch or
    // two: a flat unbroken slab is as obvious a tell up here as it is down at
    // street level.
    const sand = this.batch.solid('sand', cell);
    for (const [cx, cz] of [
      [r.x0, r.z0], [r.x1, r.z0], [r.x0, r.z1], [r.x1, r.z1],
    ] as const) {
      const w = rng.range(0.8, 1.8);
      addWedge(sand, cx + (cx === r.x0 ? w * 0.5 : -w * 0.5), y + 0.005, cz, w, 0.07, w,
        { rotY: rng.range(0, 6.28), color: [1.06, 1.02, 0.94] });
    }
    if (area > 24) {
      const patch = this.batch.solidFlat('asphalt', cell);
      for (let i = 0; i < 2; i++) {
        const px = rng.range(r.x0, r.x1);
        const pz = rng.range(r.z0, r.z1);
        /*
         * Weathered bitumen, and only just off the value of the screed it is laid
         * on. The library's asphalt is near-black, so a repair painted at its own
         * value is a hole in the roof — but overcorrecting is just as bad in the
         * other direction, and at a third above unity these read as bright tan
         * doormats laid out on the deck. A patch should be findable, not the
         * subject of the shot.
         */
        addGroundPatch(patch, px, pz,
          Array.from({ length: 9 }, (_, k) => rng.range(0.6, 1.35)
            * (1 + 0.22 * Math.sin(k * 1.7 + px))),
          rng.range(0, 1.57), rng.range(0.6, 1.5), () => y, 0.014,
          [1.12, 1.08, 1.0]);
      }
    }
  }

  /** The corner café: two storeys, fully enterable, stair to the roof. */
  private cafeBuilding(): void {
    const rng = this.rng;
    const r = CAFE;
    const cell = cellOf(r);
    const len = r.z1 - r.z0;
    const wide = r.x1 - r.x0;

    const east: Opening[] = [
      { u: 3.2, w: 2.6, h: 2.9, sill: 0, kind: 'shop', glass: 'none', noSill: true, awning: true },
      { u: 6.6, w: 2.6, h: 2.9, sill: 0, kind: 'shop', glass: 'broken', noSill: true, awning: true },
      { u: 10.5, w: 1.25, h: 2.35, sill: 0, kind: 'door', glass: 'clear' },
      { u: 13.6, w: 2.2, h: 2.6, sill: 0, kind: 'shop', glass: 'boarded', noSill: true },
      ...windowRow(len, 4, 1, { w: 1.15, h: 1.9, sill: 0.15, glass: 'clear' }).map((o, i) => ({
        ...o, balcony: i % 2 === 0, ac: i === 3,
      })),
    ];
    const south: Opening[] = [
      { u: wide * 0.5, w: 2.4, h: 2.8, sill: 0, kind: 'arch', glass: 'none', noSill: true },
      ...windowRow(wide, 3, 1, { w: 1.05, h: 1.5, sill: 1.0, glass: 'clear' }),
    ];
    const north: Opening[] = [
      { u: 3.4, w: 1.2, h: 2.2, sill: 0, kind: 'door', glass: 'none' },
      { u: 7.8, w: 1.6, h: 1.5, sill: 1.3, kind: 'window', glass: 'boarded' },
      ...windowRow(wide, 3, 1, { w: 1.0, h: 1.45, sill: 1.05, glass: 'clear' }),
    ];

    const stairWell = rect(-11.6, -14.2, -8.9, -11.0);
    const info = this.building({
      rect: r,
      floors: 2,
      material: 'stucco_ochre',
      // Sills and cornices are 15 cm elements, and 15 cm of a map drawn around
      // metre-wide spall patches is a random crop of one of them.
      trim: 'concrete',
      color: [1.02, 1.0, 1.12],
      sides: {
        east: varyOpenings(east, rng, 0.28),
        south: varyOpenings(south, rng, 0.2),
        north: varyOpenings(north, rng, 0.35),
      },
      interior: true,
      floorHoles: [stairWell],
      wear: 0.6,
      parapet: 1.0,
      roofOpen: { north: true, south: true },
      floorMaterial: 'ceramic_tile',
      drift: ['north', 'south', 'east'],
    });
    this.cafe = info;
    this.dressRoof(info, rng);
    this.platforms.push({ rect: inset(r, 0.9), y: info.yRoof, name: 'Cafe roof' });
    this.landmarks.push({ name: 'Cafe', position: new THREE.Vector3(-14, info.yFloor + 1.6, -6) });

    const inner = info.inner;
    this.rooms.push({ name: 'Cafe floor', rect: rect(inner.x0, inner.z0 + 3.4, inner.x1, inner.z1), y: info.yFloor, height: STOREY - 0.24 });
    this.rooms.push({ name: 'Cafe upper', rect: inner, y: info.yFloor + STOREY, height: STOREY - 0.24 });
    this.hotspots.push({ x: -14, z: -6, radius: 6 });
    this.hotspots.push({ x: -14, z: -6 + 0, radius: 4 });

    // Interior partition separating the kitchen from the room.
    this.partition(cell, inner.x0, inner.z0 + 3.4, inner.x1, inner.z0 + 3.4,
      info.yFloor, STOREY - 0.24, [{ u: 3.2, w: 1.1 }, { u: 8.4, w: 1.1 }]);
    this.partition(cell, inner.x0 + 4.0, inner.z0, inner.x0 + 4.0, inner.z0 + 3.4,
      info.yFloor, STOREY - 0.24, [{ u: 1.8, w: 0.95 }]);
    // Upper floor: two rooms off a landing.
    this.partition(cell, inner.x0 + 5.2, inner.z0 + 3.0, inner.x0 + 5.2, inner.z1,
      info.yFloor + STOREY, STOREY - 0.24, [{ u: 2.2, w: 1.0 }]);

    // Staircase, ground to first, then first to roof inside a bulkhead.
    buildStair({
      ctx: this.ctx, cell,
      x: -11.4, y: info.yFloor, z: -13.9, rotY: -Math.PI * 0.5,
      width: 1.2, rise: 0.183, height: STOREY, material: 'concrete', railing: 'both',
    });
    buildStair({
      ctx: this.ctx, cell,
      x: -9.2, y: info.yFloor + STOREY, z: -11.3, rotY: Math.PI * 0.5,
      width: 1.2, rise: 0.183, height: STOREY, material: 'concrete', railing: 'both',
    });
    this.stairBulkhead(cell, -10.6, info.yRoof, -12.6, 2.9, 2.9, Math.PI * 0.5);

    // Furniture: tables, chairs, a counter, a stove and the debris of a fight.
    const wood = this.batch.solid('wood_planks', cell);
    addBox(wood, inner.x0 + 1.9, info.yFloor + 0.5, inner.z0 + 1.7, 3.5, 1.0, 0.7, {
      color: [0.92, 0.84, 0.7], grime: 0.35,
    });
    addBox(wood, inner.x0 + 1.9, info.yFloor + 1.03, inner.z0 + 1.7, 3.7, 0.08, 0.86, {
      color: [1.0, 0.9, 0.76],
    });
    const steel = this.batch.solid('metal_brushed', cell);
    addBox(steel, inner.x0 + 0.8, info.yFloor + 0.44, inner.z0 + 2.6, 1.4, 0.88, 0.7, {
      color: [0.82, 0.82, 0.8], grime: 0.4,
    });
    // Kitchen behind the partition: a stove and shelving against the back wall.
    this.batch.placeAt('stove', inner.x0 + 2.9, info.yFloor, inner.z0 + 0.5, Math.PI, 1, tint(rng, 0.1));
    this.batch.placeAt('shelf_unit', inner.x0 + 0.55, info.yFloor, inner.z0 + 1.0, Math.PI * 0.5, 1, tint(rng, 0.12));
    this.batch.placeAt('shelf_unit', inner.x1 - 1.2, info.yFloor, inner.z0 + 0.4, Math.PI, 0.9, tint(rng, 0.12));
    for (let i = 0; i < 6; i++) {
      const x = rng.range(inner.x0 + 1.2, inner.x1 - 1.2);
      const z = rng.range(inner.z0 + 4.6, inner.z1 - 1.2);
      this.batch.placeAt('plastic_table', x, info.yFloor, z, rng.range(0, 6.28), 1, tint(rng, 0.12));
      const chairs = Math.round(rng.range(1, 4));
      for (let c = 0; c < chairs; c++) {
        const a = rng.range(0, 6.28);
        this.batch.placeAt('plastic_chair',
          x + Math.cos(a) * rng.range(0.7, 1.1), info.yFloor, z + Math.sin(a) * rng.range(0.7, 1.1),
          a + Math.PI + rng.range(-0.4, 0.4), 1, tint(rng, 0.16, 0.3));
      }
    }
    for (let i = 0; i < 10; i++) {
      const x = rng.range(inner.x0 + 0.5, inner.x1 - 0.5);
      const z = rng.range(inner.z0 + 0.5, inner.z1 - 0.5);
      const pick = rng.next();
      const id = pick < 0.3 ? 'debris_plank' : pick < 0.55 ? 'rubble_chunk' : pick < 0.75 ? 'newspaper' : 'brick';
      this.batch.placeAt(id, x, info.yFloor, z, rng.range(0, 6.28), rng.range(0.8, 1.2), tint(rng, 0.14));
    }
    /*
     * Upper floor: the flat above the café, and the room the interior vantage
     * shoots out of. It gets real furniture placed against the walls rather than
     * a scatter of debris, because this is the shot that has to prove the
     * interiors are rooms and not just enclosed volumes.
     */
    const upY = info.yFloor + STOREY;
    /*
     * The east room, which is the one with the windows onto the street and the
     * one the interior vantage stands in. Furniture is placed against its walls
     * by hand so there is something between the camera in the corner and the
     * light coming through the window — a room read as a room needs occupied
     * edges, not a scatter across the middle of the floor.
     */
    const part = inner.x0 + 5.2;
    this.batch.placeAt('bed_frame', part + 0.9, upY, inner.z0 + 3.1, 0, 1, tint(rng, 0.1));
    this.batch.placeAt('mattress', part + 0.9, upY + 0.32, inner.z0 + 3.1, 0.03, 1, tint(rng, 0.12));
    this.batch.placeAt('wardrobe', part + 3.0, upY, inner.z0 + 0.4, 0, 1, tint(rng, 0.1));
    this.batch.placeAt('shelf_unit', inner.x1 - 0.25, upY, inner.z0 + 3.8, -Math.PI * 0.5, 1, tint(rng, 0.12));
    // Living end: a low table with chairs under the far window, and a dead set.
    this.batch.placeAt('plastic_table', inner.x1 - 2.2, upY, inner.z1 - 3.4, 0.2, 1, tint(rng, 0.1));
    for (let i = 0; i < 3; i++) {
      const a = 0.7 + i * 2.1;
      this.batch.placeAt('plastic_chair',
        inner.x1 - 2.2 + Math.cos(a) * 0.95, upY, inner.z1 - 3.4 + Math.sin(a) * 0.95,
        a + Math.PI, 1, tint(rng, 0.16, 0.3));
    }
    this.batch.placeAt('crate_large', part + 0.7, upY, inner.z1 - 1.2, 0.1, 1, tint(rng, 0.1));
    this.batch.placeAt('tv_old', part + 0.7, upY + 0.34, inner.z1 - 1.2, 0.1, 1, tint(rng, 0.1));
    addBox(this.batch.solid('fabric_carpet', cell), inner.x1 - 2.4, upY + 0.015, inner.z1 - 3.6, 2.6, 0.03, 3.6, {
      rotY: 0.04, color: [2.55, 1.5, 1.1],
    });
    // West room: a second bed and the debris of the fight, seen through the door.
    this.batch.placeAt('bed_frame', inner.x0 + 1.0, upY, inner.z1 - 2.6, Math.PI * 0.5, 1, tint(rng, 0.14));
    this.batch.placeAt('wardrobe', inner.x0 + 0.5, upY, inner.z0 + 5.4, Math.PI * 0.5, 1, tint(rng, 0.1));
    for (let i = 0; i < 9; i++) {
      const x = rng.range(inner.x0 + 0.6, inner.x1 - 0.6);
      const z = rng.range(inner.z0 + 0.6, inner.z1 - 0.6);
      const pick = rng.next();
      const id = pick < 0.24 ? 'crate_large' : pick < 0.46 ? 'rubble_chunk' : pick < 0.64 ? 'carpet_roll'
        : pick < 0.8 ? 'newspaper' : 'debris_plank';
      this.batch.placeAt(id, x, upY, z, rng.range(0, 6.28), rng.range(0.85, 1.15), tint(rng, 0.14));
    }
    this.floorDust(cell, inner, upY, rng, 1.1);
    this.floorDust(cell, inner, info.yFloor, rng, 0.8);
  }

  /**
   * Grit and dust on an interior floor.
   *
   * The single thing that separates a game room from a box with furniture in it:
   * a real abandoned room has a swept-clean middle and a rim of dust and plaster
   * crumbs where nobody walks. Patches are laid as low irregular polygons rather
   * than a decal so they take the room's own lighting, and the perimeter strip is
   * the interior version of the sand drift used against every outside wall.
   */
  private floorDust(cell: string, r: Rect, y: number, rng: Rng, amount = 1): void {
    const buf = this.batch.solid('sand', cell);
    const patches = Math.round(9 * amount);
    for (let i = 0; i < patches; i++) {
      // Biased to the edges: pick a point then push it toward the nearest wall.
      let x = rng.range(r.x0, r.x1);
      let z = rng.range(r.z0, r.z1);
      const cx = (r.x0 + r.x1) * 0.5;
      const cz = (r.z0 + r.z1) * 0.5;
      x = cx + (x - cx) * rng.range(0.75, 1.0);
      z = cz + (z - cz) * rng.range(0.75, 1.0);
      /*
        * Small, thin and close to the value of the screed. Metre-wide patches of
        * warm sand tint on an interior floor do not read as swept dust, they read
        * as spilled paint — there was a tan puddle a metre across in the middle of
        * the café doing exactly that.
        */
      const rad = rng.range(0.18, 0.55);
      addCylinder(buf, x, y + 0.004, z, rad, 0.016, {
        segments: rng.next() < 0.5 ? 5 : 6,
        topRadius: rad * rng.range(0.5, 0.85),
        rotY: rng.range(0, 6.28),
        smooth: false,
        caps: true,
        color: [0.93, 0.91, 0.87],
      });
    }
    // Perimeter: dust banked into the wall junction on three of the four walls.
    const walls: Array<[number, number, number, number, number, number]> = [
      [r.x0, r.z0, r.x1, r.z0, 0, 1],
      [r.x0, r.z1, r.x1, r.z1, 0, -1],
      [r.x0, r.z0, r.x0, r.z1, 1, 0],
      [r.x1, r.z0, r.x1, r.z1, -1, 0],
    ];
    for (const [ax, az, bx, bz, nx, nz] of walls) {
      if (rng.next() < 0.25) continue;
      const len = Math.hypot(bx - ax, bz - az);
      const dx = (bx - ax) / len;
      const dz = (bz - az) / len;
      for (let t = 0; t < len - 0.2; t += 0.85) {
        if (rng.next() < 0.3) continue;
        const seg = Math.min(rng.range(0.7, 1.8), len - t);
        const depth = rng.range(0.12, 0.42);
        const mx = ax + dx * (t + seg * 0.5) + nx * depth * 0.5;
        const mz = az + dz * (t + seg * 0.5) + nz * depth * 0.5;
        addBox(buf, mx, y + 0.012, mz,
          Math.abs(dx) > 0.5 ? seg : depth, 0.024, Math.abs(dz) > 0.5 ? seg : depth,
          { color: [1.0, 0.95, 0.86] });
      }
    }
  }

  /** The little hut over a roof stairwell, with a doorway and a lid. */
  private stairBulkhead(
    cell: string, x: number, y: number, z: number,
    w: number, d: number, facing: number,
  ): void {
    const buf = this.batch.solid('stucco_sand', cell);
    const cap = this.batch.solid('concrete', cell);
    const h = 2.5;
    const nx = Math.sin(facing);
    const nz = Math.cos(facing);
    const tx = Math.cos(facing);
    const tz = -Math.sin(facing);
    // Three closed walls plus two returns beside the doorway.
    addBox(buf, x - nx * d * 0.5, y + h * 0.5, z - nz * d * 0.5, w, h, 0.2, { rotY: facing, color: [0.98, 0.95, 0.89], grime: 0.25 });
    for (const s of [-1, 1]) {
      addBox(buf, x + tx * s * w * 0.5, y + h * 0.5, z + tz * s * w * 0.5, 0.2, h, d, { rotY: facing, color: [0.97, 0.94, 0.88], grime: 0.25 });
    }
    for (const s of [-1, 1]) {
      addBox(buf, x + nx * d * 0.5 + tx * s * (w * 0.5 - 0.28), y + h * 0.5, z + nz * d * 0.5 + tz * s * (w * 0.5 - 0.28),
        0.56, h, 0.2, { rotY: facing, color: [0.97, 0.94, 0.88], grime: 0.25 });
    }
    addBox(buf, x + nx * d * 0.5, y + h - 0.2, z + nz * d * 0.5, w, 0.4, 0.2, { rotY: facing, color: [0.97, 0.94, 0.88] });
    addBox(cap, x, y + h + 0.1, z, w + 0.24, 0.2, d + 0.24, { rotY: facing, color: [1.0, 0.98, 0.94], bleach: 0.05 });
  }

  /* ------------------------------ east block ----------------------------- */

  private ebMiddle!: BuildingInfo;
  private apartment!: BuildingInfo;
  private garage!: BuildingInfo;

  private eastBlock(): void {
    const rng = this.rng;
    this.residential(rect(8, -58, 22, -38), 3, 'concrete_painted', [0.92, 0.9, 0.86], 0.35);
    this.apartmentBlock();
    this.ebMiddle = this.residential(rect(8, -16, 22, 2), 2, 'stucco_sand', [0.99, 0.95, 0.87], 0.5,
      { roofOpen: { south: true, east: true } });
    this.platforms.push({ rect: inset(this.ebMiddle.rect, 0.8), y: this.ebMiddle.yRoof, name: 'East roof' });
    /*
     * Pale render, not ochre. This block's east face is the whole left-hand wall
     * of the alley, and a single-storey four-metre wall of saturated marigold is
     * the biggest colour in that shot; ochre works as an accent on the market
     * street where there is something else to balance it.
     */
    const low = this.residential(rect(8, 2, 22, 16), 1, 'stucco_sand', [1.0, 0.97, 0.91], 0.45,
      { storey: 4.4, roofOpen: { north: true } });
    this.platforms.push({ rect: inset(low.rect, 0.8), y: low.yRoof, name: 'East terrace' });
    this.garageBlock();
    this.residential(rect(8, 42, 22, 58), 2, 'plaster', [0.96, 0.94, 0.9], 0.4);

    // A short flight from the low terrace to the two-storey roof beside it.
    const climb = this.ebMiddle.yRoof - low.yRoof;
    const run = Math.round(climb / 0.185) * 0.29;
    buildStair({
      ctx: this.ctx, cell: cellOf(low.rect),
      x: 10.8, y: low.yRoof, z: 2.2 + run, rotY: Math.PI * 0.5,
      width: 1.2, rise: 0.185, height: climb,
      material: 'concrete', railing: 'right',
    });
    void rng;
  }

  /**
   * The bombed apartment block. Its first floor has taken a shell: the slab is
   * cut back to a hanging edge with rebar dangling, the wall below is open, and
   * the resulting rubble slope is the map's third route to a roof.
   */
  private apartmentBlock(): void {
    const rng = this.rng;
    const r = APARTMENT;
    const cell = cellOf(r);
    const len = r.z1 - r.z0;
    const wide = r.x1 - r.x0;

    const west: Opening[] = [
      { u: 2.4, w: 1.3, h: 2.35, sill: 0, kind: 'door', glass: 'none' },
      { u: 5.6, w: 2.4, h: 2.5, sill: 0, kind: 'shop', glass: 'boarded', noSill: true },
      { u: 9.4, w: 2.8, h: 2.7, sill: 0.1, kind: 'hole', glass: 'none' },
      ...windowRow(len, 4, 1, { w: 1.15, h: 1.5, sill: 1.0, glass: 'broken' }),
    ];
    const south: Opening[] = [
      { u: wide * 0.5 - 2.4, w: 1.15, h: 2.2, sill: 0, kind: 'door', glass: 'none' },
      ...windowRow(wide, 3, 0, { w: 1.05, h: 1.4, sill: 1.15, glass: 'boarded' }),
      { u: wide * 0.5 + 1.4, w: 3.4, h: 2.8, sill: 0.4, floor: 1, kind: 'hole', glass: 'none' },
      ...windowRow(wide, 3, 1, { w: 1.05, h: 1.4, sill: 1.05, glass: 'broken' }),
    ];
    const north: Opening[] = [
      ...windowRow(wide, 3, 0, { w: 1.05, h: 1.4, sill: 1.2, glass: 'boarded' }),
      ...windowRow(wide, 3, 1, { w: 1.05, h: 1.4, sill: 1.05, glass: 'broken' }),
    ];
    const east: Opening[] = [
      { u: len * 0.5, w: 1.15, h: 2.2, sill: 0, kind: 'door', glass: 'none' },
      ...windowRow(len, 4, 0, { w: 1.0, h: 1.3, sill: 1.3, glass: 'boarded' }),
      ...windowRow(len, 4, 1, { w: 1.0, h: 1.4, sill: 1.05, glass: 'broken' }),
    ];

    const stairWell = rect(r.x1 - 3.6, r.z0 + 0.9, r.x1 - 0.9, r.z0 + 4.2);
    const collapse = rect(r.x0 + 3.2, r.z0 + 5.4, r.x1 - 1.0, r.z1 - 1.2);
    const info = this.building({
      rect: r,
      floors: 2,
      material: 'concrete_damaged',
      trim: 'concrete',
      color: [0.92, 0.89, 0.85],
      sides: { west, south, north, east },
      interior: true,
      floorHoles: [stairWell, collapse],
      wear: 1.5,
      parapet: 0.9,
      drift: ['north', 'south', 'east', 'west'],
    });
    this.apartment = info;
    this.platforms.push({ rect: inset(r, 1.0), y: info.yRoof, name: 'Apartment roof' });
    this.landmarks.push({ name: 'Apartment', position: new THREE.Vector3((r.x0 + r.x1) * 0.5, info.yFloor + 1.6, (r.z0 + r.z1) * 0.5) });
    this.rooms.push({ name: 'Apartment ground', rect: info.inner, y: info.yFloor, height: STOREY - 0.24 });
    this.rooms.push({ name: 'Apartment upper', rect: info.inner, y: info.yFloor + STOREY, height: STOREY - 0.24 });
    this.hotspots.push({ x: (r.x0 + r.x1) * 0.5, z: (r.z0 + r.z1) * 0.5, radius: 7 });

    // The blown opening in the west wall, and the hanging slab above it.
    buildBlastHole(this.ctx, cell, r.x0, info.yFloor + 1.45, r.z0 + 9.4, Math.PI * 0.5, 2.8, 2.7, 0.34);
    buildBlastHole(this.ctx, cell, (r.x0 + r.x1) * 0.5 + 1.4, info.yFloor + STOREY + 1.8, r.z1, 0, 3.4, 2.8, 0.34);
    buildCollapsedSlab(this.ctx, cell, collapse, info.yFloor + STOREY, this.g);

    // Rubble ramp climbing from the street through the hole to the first floor.
    const rampX = r.x0 - 1.4;
    for (let i = 0; i < 16; i++) {
      const t = i / 15;
      const x = rampX + t * 6.2;
      const z = r.z0 + 8.2 + rng.range(-1.2, 1.2) + t * 1.4;
      const h = 0.35 + t * (info.yFloor + STOREY - this.g(x, z) - 0.5);
      buildRubblePile(this.ctx, cell, x, z, rng.range(1.1, 2.0), h, this.g);
    }
    // A slab tipped against the wall makes the ramp legible as a route.
    addWedge(this.batch.solid('concrete_damaged', cell),
      r.x0 - 0.6, this.g(r.x0 - 1, r.z0 + 9.4), r.z0 + 9.4,
      5.4, 3.2, 2.6, { rotY: Math.PI, color: [0.9, 0.88, 0.84], grime: 0.4 });
    this.platforms.push({ rect: rect(r.x0 - 3, r.z0 + 7, r.x0 + 1, r.z0 + 12), y: info.yFloor + 1.2, name: 'Rubble ramp' });

    // Interior: partitions, an internal stair, and the wreckage of two flats.
    const inner = info.inner;
    this.partition(cell, inner.x0, inner.z0 + 5.2, inner.x1 - 3.6, inner.z0 + 5.2,
      info.yFloor, STOREY - 0.24, [{ u: 4.2, w: 1.05 }], BLOCK_MAT, BRICK_BUFF);
    this.partition(cell, inner.x0 + 5.6, inner.z0 + 5.2, inner.x0 + 5.6, inner.z1,
      info.yFloor, STOREY - 0.24, [{ u: 3.0, w: 1.05 }], BLOCK_MAT, BRICK_BUFF);
    this.partition(cell, inner.x0, inner.z0 + 4.6, inner.x1 - 3.4, inner.z0 + 4.6,
      info.yFloor + STOREY, STOREY - 0.24, [{ u: 5.0, w: 1.05 }], BLOCK_MAT, BRICK_BUFF);
    buildStair({
      ctx: this.ctx, cell,
      x: r.x1 - 1.4, y: info.yFloor, z: r.z0 + 1.4, rotY: Math.PI * 0.5,
      width: 1.15, rise: 0.186, height: STOREY, material: 'concrete_damaged', railing: 'none',
    });
    buildStair({
      ctx: this.ctx, cell,
      x: r.x1 - 3.1, y: info.yFloor + STOREY, z: r.z0 + 3.9, rotY: -Math.PI * 0.5,
      width: 1.15, rise: 0.186, height: STOREY, material: 'concrete_damaged', railing: 'none',
    });
    this.stairBulkhead(cell, r.x1 - 2.3, info.yRoof, r.z0 + 2.6, 2.9, 3.2, -Math.PI * 0.5);

    /*
     * The flats' furniture, on the surviving strip of first floor beside the
     * collapse. It matters more here than in an intact room: without something
     * of human scale between the camera and the hole, a shelled interior is just
     * two grey planes and a bright gap, and the shot has nothing to say about who
     * used to live in it.
     */
    const strip = 11.2;
    this.batch.placeAt('wardrobe', inner.x0 + 1.1, info.yFloor + STOREY, r.z0 + 7.2,
      Math.PI * 0.5, 1, tint(rng, 0.12));
    this.batch.placeAt('bed_frame', strip - 1.5, info.yFloor + STOREY, r.z0 + 9.6,
      Math.PI * 0.5 + 0.14, 1, tint(rng, 0.14));
    this.batch.placeAt('mattress', strip - 1.7, info.yFloor + STOREY + 0.3, r.z0 + 9.5,
      Math.PI * 0.5 + 0.2, 1, tint(rng, 0.16));
    this.batch.placeAt('plastic_chair', inner.x0 + 1.6, info.yFloor + STOREY, r.z0 + 11.2,
      2.4, 1, tint(rng, 0.14));
    this.batch.placeAt('shelf_unit', inner.x0 + 0.35, info.yFloor + STOREY, r.z0 + 2.4,
      Math.PI * 0.5, 1, tint(rng, 0.12));
    this.batch.placeAt('stove', inner.x0 + 3.4, info.yFloor + STOREY, inner.z0 + 0.45,
      Math.PI, 1, tint(rng, 0.1));
    this.batch.placeAt('carpet_roll', strip - 0.9, info.yFloor + STOREY, r.z0 + 5.6,
      0.4, 1, tint(rng, 0.14));
    // Ground floor: the shop that was under the flats.
    this.batch.placeAt('shelf_unit', inner.x1 - 0.35, info.yFloor, inner.z1 - 2.4,
      -Math.PI * 0.5, 1, tint(rng, 0.12));
    this.batch.placeAt('wardrobe', inner.x0 + 4.6, info.yFloor, inner.z0 + 0.45, 0, 1, tint(rng, 0.1));

    // Debris throughout, heaviest under the collapse.
    for (let i = 0; i < 26; i++) {
      const x = rng.range(inner.x0 + 0.4, inner.x1 - 0.4);
      const z = rng.range(inner.z0 + 0.4, inner.z1 - 0.4);
      const upper = rng.next() < 0.4 && !rectContains(collapse, x, z);
      const y = upper ? info.yFloor + STOREY : info.yFloor;
      const pick = rng.next();
      const id = pick < 0.3 ? 'rubble_chunk' : pick < 0.5 ? 'brick' : pick < 0.68 ? 'debris_plank'
        : pick < 0.8 ? 'cinder_block' : pick < 0.9 ? 'newspaper' : 'crate_small';
      this.batch.placeAt(id, x, y, z, rng.range(0, 6.28), rng.range(0.8, 1.25), tint(rng, 0.15));
    }
    buildSandbags(this.ctx, cell, r.x0 + 2.4, info.yFloor, r.z0 + 2.4, 0, 3.4, 4);
    buildSandbags(this.ctx, cell, r.x0 + 1.2, info.yFloor + STOREY, r.z1 - 2.0, Math.PI * 0.5, 2.6, 3);
    this.floorDust(cell, inner, info.yFloor, rng, 1.4);
    this.floorDust(cell, rect(inner.x0, inner.z0, 11.2, inner.z1), info.yFloor + STOREY, rng, 1.3);
  }

  /** The workshop: one tall storey, roller door, pit, gantry, mezzanine. */
  private garageBlock(): void {
    const rng = this.rng;
    const r = GARAGE;
    const cell = cellOf(r);
    const len = r.z1 - r.z0;
    const wide = r.x1 - r.x0;
    const storey = 5.4;

    const west: Opening[] = [
      { u: 4.6, w: 4.4, h: 3.9, sill: 0, kind: 'garage', glass: 'none', noSill: true },
      { u: 9.4, w: 1.2, h: 2.25, sill: 0, kind: 'door', glass: 'clear' },
      { u: 12.6, w: 2.0, h: 1.3, sill: 3.3, kind: 'window', glass: 'broken' },
      { u: 2.0, w: 1.6, h: 1.2, sill: 3.5, kind: 'window', glass: 'boarded' },
    ];
    const east: Opening[] = [
      { u: len * 0.35, w: 1.2, h: 2.2, sill: 0, kind: 'door', glass: 'none' },
      { u: len * 0.68, w: 2.6, h: 2.6, sill: 0.2, kind: 'hole', glass: 'none' },
      ...windowRow(len, 3, 0, { w: 1.5, h: 1.1, sill: 3.6, glass: 'broken' }),
    ];
    const south: Opening[] = windowRow(wide, 3, 0, { w: 1.4, h: 1.1, sill: 3.7, glass: 'boarded' });
    const north: Opening[] = windowRow(wide, 3, 0, { w: 1.4, h: 1.1, sill: 3.7, glass: 'broken' });

    const info = this.building({
      rect: r,
      floors: 1,
      storey,
      material: 'concrete_painted',
      trim: 'concrete',
      color: [0.9, 0.9, 0.88],
      sides: { west, east, south, north },
      interior: true,
      wear: 0.8,
      parapet: 0.9,
      drift: ['north', 'south', 'west', 'east'],
      floorMaterial: 'concrete',
    });
    this.garage = info;
    this.dressRoof(info, rng);
    this.platforms.push({ rect: inset(r, 1.0), y: info.yRoof, name: 'Garage roof' });
    this.landmarks.push({ name: 'Workshop', position: new THREE.Vector3((r.x0 + r.x1) * 0.5, info.yFloor + 1.6, (r.z0 + r.z1) * 0.5) });
    this.rooms.push({ name: 'Workshop', rect: info.inner, y: info.yFloor, height: storey - 0.3 });
    this.hotspots.push({ x: (r.x0 + r.x1) * 0.5, z: (r.z0 + r.z1) * 0.5, radius: 7 });

    const inner = info.inner;
    // Mezzanine over the back third, on steel legs, reached by a stair.
    const mez = rect(inner.x1 - 5.2, inner.z1 - 6.4, inner.x1, inner.z1);
    const mezY = info.yFloor + 2.85;
    this.slab('steel_plate', cell, mez, mezY, 0.16);
    const steel = this.batch.solid('steel_plate', cell);
    for (const [px, pz] of [[mez.x0, mez.z0], [mez.x0, mez.z1 - 0.2], [mez.x0 + 2.6, mez.z0]] as const) {
      addBox(steel, px, info.yFloor + 1.42, pz, 0.16, 2.85, 0.16, { color: [0.66, 0.64, 0.62] });
    }
    // Handrail along the open edges.
    for (const [ax, az, bx, bz] of [
      [mez.x0, mez.z0, mez.x1, mez.z0],
      [mez.x0, mez.z0, mez.x0, mez.z1],
    ] as const) {
      addBox(steel, (ax + bx) * 0.5, mezY + 1.02, (az + bz) * 0.5,
        Math.max(0.06, bx - ax), 0.06, Math.max(0.06, bz - az), { color: [0.7, 0.68, 0.66] });
      addBox(steel, (ax + bx) * 0.5, mezY + 0.55, (az + bz) * 0.5,
        Math.max(0.05, bx - ax), 0.05, Math.max(0.05, bz - az), { color: [0.7, 0.68, 0.66] });
    }
    buildStair({
      ctx: this.ctx, cell,
      x: mez.x0 - 0.9, y: info.yFloor, z: mez.z0 + 1.1, rotY: 0,
      width: 1.05, rise: 0.19, height: 2.85, material: 'steel_plate', railing: 'both',
    });
    this.platforms.push({ rect: mez, y: mezY, name: 'Mezzanine' });

    // Inspection pit, workbenches, a gantry beam and tool clutter.
    const pit = rect(inner.x0 + 1.6, inner.z0 + 2.2, inner.x0 + 4.4, inner.z0 + 7.4);
    const pitBuf = this.batch.solid('concrete', cell);
    addBox(pitBuf, (pit.x0 + pit.x1) * 0.5, info.yFloor - 0.6, (pit.z0 + pit.z1) * 0.5,
      pit.x1 - pit.x0, 1.2, pit.z1 - pit.z0, { color: [0.72, 0.7, 0.68], grime: 0.6, faces: FX_ALL & ~FX_PY });
    for (const [ax, az, bx, bz] of [
      [pit.x0 - 0.16, pit.z0 - 0.16, pit.x1 + 0.16, pit.z0],
      [pit.x0 - 0.16, pit.z1, pit.x1 + 0.16, pit.z1 + 0.16],
      [pit.x0 - 0.16, pit.z0, pit.x0, pit.z1],
      [pit.x1, pit.z0, pit.x1 + 0.16, pit.z1],
    ] as const) {
      addBox(this.batch.solid('metal_painted', cell), (ax + bx) * 0.5, info.yFloor + 0.03, (az + bz) * 0.5,
        bx - ax, 0.06, bz - az, { color: [1.3, 1.15, 0.4] });
    }
    const gantry = this.batch.solid('steel_plate', cell);
    addBox(gantry, (inner.x0 + inner.x1) * 0.5, info.yFloor + 4.3, inner.z0 + 4.8,
      inner.x1 - inner.x0 - 0.4, 0.34, 0.24, { color: [0.6, 0.58, 0.56] });
    addBox(gantry, (inner.x0 + inner.x1) * 0.5 + 1.2, info.yFloor + 4.02, inner.z0 + 4.8,
      0.5, 0.3, 0.4, { color: [0.68, 0.66, 0.62] });
    addCatenary(gantry, (inner.x0 + inner.x1) * 0.5 + 1.2, info.yFloor + 3.9, inner.z0 + 4.8,
      (inner.x0 + inner.x1) * 0.5 + 1.2, info.yFloor + 1.5, inner.z0 + 4.8, 0, 0.02, 2, [0.55, 0.53, 0.5]);
    const bench = this.batch.solid('wood_planks', cell);
    addBox(bench, inner.x1 - 1.0, info.yFloor + 0.45, inner.z0 + 3.4, 1.6, 0.9, 5.0, {
      color: [0.88, 0.8, 0.68], grime: 0.4,
    });
    addBox(bench, inner.x1 - 1.0, info.yFloor + 0.95, inner.z0 + 3.4, 1.8, 0.1, 5.2, {
      color: [0.94, 0.86, 0.72],
    });
    for (let i = 0; i < 18; i++) {
      const x = rng.range(inner.x0 + 0.6, inner.x1 - 2.2);
      const z = rng.range(inner.z0 + 0.6, inner.z1 - 0.6);
      if (rectContains(pit, x, z)) continue;
      const pick = rng.next();
      const id = pick < 0.2 ? 'drum_rust' : pick < 0.34 ? 'drum_painted' : pick < 0.48 ? 'tyre'
        : pick < 0.6 ? 'jerrycan' : pick < 0.7 ? 'gas_bottle' : pick < 0.8 ? 'pallet'
          : pick < 0.88 ? 'crate_large' : pick < 0.95 ? 'bucket' : 'cable_spool';
      this.batch.placeAt(id, x, info.yFloor, z, rng.range(0, 6.28), rng.range(0.9, 1.1), tint(rng, 0.14));
    }
    for (let i = 0; i < 5; i++) {
      const x = rng.range(mez.x0 + 0.5, mez.x1 - 0.5);
      const z = rng.range(mez.z0 + 0.5, mez.z1 - 0.5);
      this.batch.placeAt(rng.next() < 0.5 ? 'crate_large' : 'ammo_box', x, mezY, z, rng.range(0, 6.28), 1, tint(rng, 0.12));
    }
    // A car on stands, mid-repair, in the working bay.
    buildBurntCar(this.batch, inner.x0 + 6.6, inner.z0 + 4.6, 0.06, () => info.yFloor + 0.28, rng);
  }

  /* --------------------------------- alley -------------------------------- */

  private alley(): void {
    const rng = this.rng;
    const cell = cellFor(ALLEY_CENTER_X, 0);

    // Cables and washing strung between the two walls: the alley's ceiling.
    for (let z = ALLEY.z0 + 4; z < ALLEY.z1 - 4; z += 7.5) {
      const y = this.g(ALLEY_CENTER_X, z) + rng.range(4.4, 6.4);
      addCatenary(this.batch.solid('metal_rusted', cell),
        22.05, y, z, 27.95, y + rng.range(-0.4, 0.4), z + rng.range(-1.5, 1.5),
        rng.range(0.35, 0.8), 0.023, 12, [0.78, 1.04, 1.2]);
      if (rng.next() < 0.5) {
        const ly = y - rng.range(0.6, 1.4);
        addCatenary(this.batch.solid('metal_rusted', cell),
          22.05, ly, z + 1.4, 27.95, ly + 0.2, z + 1.8, 0.5, 0.017, 10, [0.7, 0.92, 1.06]);
        // Unevenly spaced, with gaps: four garments at exact quarter points read
        // as a repeated element rather than as someone's washing.
        for (let i = 0; i < 5; i++) {
          if (rng.next() < 0.22) continue;
          const t = 0.13 + i * 0.19 + rng.range(-0.05, 0.05);
          const x = 22.05 + t * 5.9;
          this.batch.placeAt(`laundry_${rng.int(0, 2)}`, x, ly - Math.sin(t * Math.PI) * 0.5, z + 1.4 + t * 0.4,
            rng.range(-0.28, 0.28), rng.range(0.8, 1.25), tint(rng, 0.22, 0.16));
        }
      }
    }

    // Junk down both sides, dense enough to force the player to weave.
    for (let z = ALLEY.z0 + 2; z < ALLEY.z1 - 2; z += rng.range(2.2, 4.6)) {
      const side = rng.bool() ? 1 : -1;
      const x = ALLEY_CENTER_X + side * rng.range(1.6, 2.4);
      const y = this.g(x, z);
      const pick = rng.next();
      if (pick < 0.16) {
        this.batch.placeAt('drum_rust', x, y, z, rng.range(0, 6.28), 1, tint(rng, 0.14));
        if (rng.next() < 0.5) this.batch.placeAt('drum_painted', x + rng.range(-0.7, 0.7), y, z + rng.range(-0.7, 0.7), rng.range(0, 6.28), 1, tint(rng, 0.16, 0.3));
      } else if (pick < 0.3) {
        this.batch.placeAt('pallet', x, y, z, rng.range(0, 6.28), 1, tint(rng, 0.12));
        this.batch.placeAt('crate_large', x + rng.range(-0.3, 0.3), y + 0.14, z + rng.range(-0.3, 0.3), rng.range(0, 6.28), 1, tint(rng, 0.12));
      } else if (pick < 0.42) {
        for (let i = 0; i < 3; i++) {
          this.batch.placeAt('tyre', x + rng.range(-0.3, 0.3), y + i * 0.19, z + rng.range(-0.3, 0.3), rng.range(0, 6.28), 1, tint(rng, 0.1));
        }
      } else if (pick < 0.55) {
        buildRubblePile(this.ctx, cell, x, z, rng.range(1.0, 1.8), rng.range(0.6, 1.4), this.g);
      } else if (pick < 0.66) {
        this.batch.placeAt('jersey_barrier', x, y, z, Math.PI * 0.5 + rng.range(-0.3, 0.3), 1, tint(rng, 0.1));
      } else if (pick < 0.76) {
        this.batch.placeAt('cable_spool', x, y, z, rng.range(0, 6.28), 1, tint(rng, 0.12));
      } else if (pick < 0.86) {
        this.batch.placeAt('crate_small', x, y, z, rng.range(0, 6.28), 1, tint(rng, 0.14));
        this.batch.placeAt('sack', x + rng.range(-0.5, 0.5), y, z + rng.range(-0.5, 0.5), rng.range(0, 6.28), 1, tint(rng, 0.14));
      } else {
        this.batch.placeAt('bucket', x, y, z, rng.range(0, 6.28), 1, tint(rng, 0.14));
      }
    }

    // A car rolled onto its side against the compound wall: the alley's landmark.
    buildBurntCar(this.batch, 26.6, -6.5, Math.PI * 0.5 + 0.08, this.g, rng, true);
    this.blockers.push(rect(25.6, -8.6, 28.0, -4.4));
    // Sandbag position covering the alley mouth at the cross street.
    buildSandbags(this.ctx, cell, ALLEY_CENTER_X - 1.2, this.g(24, 26), 26.5, 0.1, 3.6, 4);
    buildSandbags(this.ctx, cell, ALLEY_CENTER_X + 1.6, this.g(26.6, -22), -22, Math.PI * 0.5, 2.8, 3);

    this.landmarks.push({ name: 'Alley', position: new THREE.Vector3(ALLEY_CENTER_X, this.g(ALLEY_CENTER_X, 0) + 1.6, 0) });
    this.hotspots.push({ x: ALLEY_CENTER_X, z: -20, radius: 6 });
    this.hotspots.push({ x: ALLEY_CENTER_X, z: 22, radius: 6 });
  }

  /* -------------------------------- compound ------------------------------ */

  private villa!: BuildingInfo;

  private compound(): void {
    const rng = this.rng;
    const cell = cellOf(COMPOUND);
    const wallH = 3.3;

    const sides: Array<{ side: Side; openings: Opening[] }> = [
      {
        side: 'west',
        openings: [
          { u: COMPOUND_GATE_Z - COMPOUND.z0, w: 4.0, h: 3.0, sill: 0, kind: 'arch', glass: 'none', noSill: true },
          { u: 5.4, w: 2.4, h: 2.2, sill: 0.3, kind: 'hole', glass: 'none' },
        ],
      },
      {
        side: 'north',
        openings: [
          { u: 8.0, w: 3.6, h: 2.9, sill: 0.15, kind: 'hole', glass: 'none' },
        ],
      },
      { side: 'east', openings: [] },
      { side: 'south', openings: [{ u: 6.5, w: 2.6, h: 2.5, sill: 0, kind: 'arch', glass: 'none', noSill: true }] },
    ];
    for (const s of sides) {
      const line = sideLine(COMPOUND, s.side);
      const yb = Math.min(
        this.terrain.height(line.x0, line.z0),
        this.terrain.height(line.x1, line.z1),
      ) - 0.4;
      buildCompoundWall({
        ctx: this.ctx, cell,
        x0: line.x0, z0: line.z0, x1: line.x1, z1: line.z1,
        yBase: yb, height: wallH + 0.4,
        thickness: 0.44,
        material: 'stucco_ochre',
        color: [1.0, 0.99, 1.14],
        coping: true,
        openings: s.openings,
      });
      this.terrain.drift(this.batch,
        line.x0 + line.nx * 0.03, line.z0 + line.nz * 0.03,
        line.x1 + line.nx * 0.03, line.z1 + line.nz * 0.03,
        line.nx, line.nz, rng, 1.2);
    }
    // Wall footprints as blockers, with the gate left open.
    this.blockers.push(rect(COMPOUND.x0 - 0.3, COMPOUND.z0 - 0.3, COMPOUND.x0 + 0.3, COMPOUND_GATE_Z - 2.2));
    this.blockers.push(rect(COMPOUND.x0 - 0.3, COMPOUND_GATE_Z + 2.2, COMPOUND.x0 + 0.3, COMPOUND.z1 + 0.3));
    this.blockers.push(rect(COMPOUND.x0, COMPOUND.z0 - 0.3, COMPOUND.x1 + 0.3, COMPOUND.z0 + 0.3));
    this.blockers.push(rect(COMPOUND.x1 - 0.3, COMPOUND.z0, COMPOUND.x1 + 0.3, COMPOUND.z1));
    this.blockers.push(rect(COMPOUND.x0, COMPOUND.z1 - 0.3, COMPOUND.x1, COMPOUND.z1 + 0.3));

    // Breach rubble spilling out of both holes.
    buildRubblePile(this.ctx, cell, COMPOUND.x0 - 0.6, COMPOUND.z0 + 5.4, 2.2, 1.5, this.g);
    buildRubblePile(this.ctx, cell, COMPOUND.x0 + 1.2, COMPOUND.z0 + 5.6, 1.9, 1.2, this.g);
    buildRubblePile(this.ctx, cell, COMPOUND.x0 + 8.0, COMPOUND.z0 - 1.0, 2.4, 1.6, this.g);
    buildRubblePile(this.ctx, cell, COMPOUND.x0 + 8.4, COMPOUND.z0 + 1.4, 2.0, 1.3, this.g);
    buildBlastHole(this.ctx, cell, COMPOUND.x0, this.g(COMPOUND.x0, COMPOUND.z0 + 5.4) + 1.4, COMPOUND.z0 + 5.4, -Math.PI * 0.5, 2.4, 2.2, 0.44);
    buildBlastHole(this.ctx, cell, COMPOUND.x0 + 8.0, this.g(COMPOUND.x0 + 8, COMPOUND.z0) + 1.6, COMPOUND.z0, Math.PI, 3.6, 2.9, 0.44);

    /*
     * Gate piers and the leaves hanging off them.
     *
     * Rendered, not bare brick. These two stand a couple of metres off the alley
     * vantage's right shoulder, so they are the largest surface in that frame, and
     * in the library's fired clay they made a tight ochre alley read as a
     * Victorian goods yard. Brick survives only in the courses knocked off the
     * arris, which is where a gate pier loses its render anyway.
     */
    const gateBuf = this.batch.solid('stucco_sand', cell);
    const gateBrick = this.batch.solid(BLOCK_MAT, cell);
    for (const dz of [-2.3, 2.3]) {
      const y = this.g(COMPOUND.x0, COMPOUND_GATE_Z + dz);
      addBox(gateBrick, COMPOUND.x0, y + 2.2, COMPOUND_GATE_Z + dz, 0.96, 4.4, 0.96, {
        color: BRICK_BUFF, grime: 0.35, uvOffset: hashOffset(dz * 3, COMPOUND_GATE_Z),
      });
      addBox(gateBuf, COMPOUND.x0, y + 2.2, COMPOUND_GATE_Z + dz, 1.0, 4.4, 1.0, {
        color: [1.0, 0.97, 0.92], grime: 0.35, uvOffset: hashOffset(dz, COMPOUND_GATE_Z),
      });
      // Render knocked off the west arris, where every vehicle has clipped it.
      for (let k = 0; k < 4; k++) {
        const py = y + 0.5 + k * 1.0 + (dz > 0 ? 0.3 : 0);
        addBox(gateBrick, COMPOUND.x0 - 0.505, py, COMPOUND_GATE_Z + dz + (k % 2 ? 0.18 : -0.22),
          0.03, 0.3 + (k % 3) * 0.14, 0.34,
          { color: BRICK_BUFF, grime: 0.3, uvOffset: hashOffset(k, dz) });
      }
      addBox(this.batch.solid('concrete', cell), COMPOUND.x0, y + 4.55, COMPOUND_GATE_Z + dz, 1.2, 0.3, 1.2, {
        color: [1.03, 1.0, 0.95], bleach: 0.06,
      });
    }
    const leaf = this.batch.solid('metal_painted', cell);
    addBox(leaf, COMPOUND.x0 + 0.6, this.g(COMPOUND.x0, COMPOUND_GATE_Z - 1.4) + 1.45, COMPOUND_GATE_Z - 1.1,
      0.09, 2.7, 1.9, { rotY: 0.5, color: [0.66, 0.72, 0.7], grime: 0.4 });
    for (let i = 0; i < 5; i++) {
      addBox(leaf, COMPOUND.x0 + 0.62, this.g(COMPOUND.x0, COMPOUND_GATE_Z) + 0.5 + i * 0.5, COMPOUND_GATE_Z - 1.1,
        0.12, 0.1, 1.86, { rotY: 0.5, color: [0.58, 0.64, 0.62] });
    }

    this.villaBuilding();
    this.courtyard();

    this.landmarks.push({ name: 'Compound', position: new THREE.Vector3(38, this.g(38, 15) + 1.6, 15) });
  }

  private villaBuilding(): void {
    const rng = this.rng;
    const r = VILLA;
    const cell = cellOf(r);
    const len = r.z1 - r.z0;
    const wide = r.x1 - r.x0;

    const south: Opening[] = [
      { u: wide * 0.5, w: 2.6, h: 2.9, sill: 0, kind: 'arch', glass: 'none', noSill: true },
      { u: wide * 0.5 - 4.2, w: 1.5, h: 1.7, sill: 0.95, kind: 'window', glass: 'clear' },
      { u: wide * 0.5 + 4.2, w: 1.5, h: 1.7, sill: 0.95, kind: 'window', glass: 'broken' },
      ...windowRow(wide, 4, 1, { w: 1.2, h: 1.9, sill: 0.1, glass: 'clear' }).map((o, i) => ({
        ...o, balcony: i === 1 || i === 2,
      })),
    ];
    const north: Opening[] = [
      { u: 3.0, w: 1.2, h: 2.2, sill: 0, kind: 'door', glass: 'clear' },
      ...windowRow(wide, 4, 0, { w: 1.0, h: 1.25, sill: 1.5, glass: 'shutter' }),
      ...windowRow(wide, 4, 1, { w: 1.0, h: 1.4, sill: 1.05, glass: 'clear' }),
    ];
    const east: Opening[] = [
      ...windowRow(len, 3, 0, { w: 1.1, h: 1.4, sill: 1.3, glass: 'shutter' }),
      ...windowRow(len, 3, 1, { w: 1.1, h: 1.5, sill: 1.0, glass: 'clear' }),
    ];
    const west: Opening[] = [
      { u: len * 0.5, w: 1.2, h: 2.2, sill: 0, kind: 'door', glass: 'none' },
      ...windowRow(len, 3, 0, { w: 1.1, h: 1.4, sill: 1.35, glass: 'boarded' }),
      ...windowRow(len, 3, 1, { w: 1.1, h: 1.5, sill: 1.0, glass: 'broken' }),
    ];

    const stairWell = rect(r.x0 + 1.0, r.z0 + 1.0, r.x0 + 4.4, r.z0 + 4.6);
    const info = this.building({
      rect: r,
      floors: 2,
      material: 'stucco_sand',
      trim: 'concrete',
      color: [1.01, 0.97, 0.9],
      sides: {
        south: varyOpenings(south, rng, 0.2),
        north: varyOpenings(north, rng, 0.25),
        east: varyOpenings(east, rng, 0.25),
        west: varyOpenings(west, rng, 0.3),
      },
      interior: true,
      floorHoles: [stairWell],
      wear: 0.55,
      parapet: 1.05,
      floorMaterial: 'ceramic_tile',
      drift: ['north', 'east', 'west'],
    });
    this.villa = info;
    this.dressRoof(info, rng);
    this.platforms.push({ rect: inset(r, 1.0), y: info.yRoof, name: 'Villa roof' });
    this.landmarks.push({ name: 'Villa', position: new THREE.Vector3((r.x0 + r.x1) * 0.5, info.yFloor + 1.6, (r.z0 + r.z1) * 0.5) });
    this.rooms.push({ name: 'Villa ground', rect: info.inner, y: info.yFloor, height: STOREY - 0.24 });
    this.rooms.push({ name: 'Villa upper', rect: info.inner, y: info.yFloor + STOREY, height: STOREY - 0.24 });
    this.hotspots.push({ x: (r.x0 + r.x1) * 0.5, z: (r.z0 + r.z1) * 0.5, radius: 8 });

    const inner = info.inner;
    // Ground floor: a hall through the middle, rooms either side.
    this.partition(cell, inner.x0 + 5.0, inner.z0, inner.x0 + 5.0, inner.z1,
      info.yFloor, STOREY - 0.24, [{ u: 3.0, w: 1.15 }, { u: 12.4, w: 1.15 }]);
    this.partition(cell, inner.x0 + 5.0, inner.z0 + 8.2, inner.x1, inner.z0 + 8.2,
      info.yFloor, STOREY - 0.24, [{ u: 4.4, w: 1.15 }]);
    // Upper floor: three bedrooms.
    this.partition(cell, inner.x0 + 5.0, inner.z0 + 5.0, inner.x1, inner.z0 + 5.0,
      info.yFloor + STOREY, STOREY - 0.24, [{ u: 2.2, w: 1.05 }]);
    this.partition(cell, inner.x0 + 5.0, inner.z0 + 10.6, inner.x1, inner.z0 + 10.6,
      info.yFloor + STOREY, STOREY - 0.24, [{ u: 6.0, w: 1.05 }]);
    this.partition(cell, inner.x0 + 5.0, inner.z0 + 5.0, inner.x0 + 5.0, inner.z1,
      info.yFloor + STOREY, STOREY - 0.24, [{ u: 3.4, w: 1.05 }]);

    buildStair({
      ctx: this.ctx, cell,
      x: r.x0 + 1.6, y: info.yFloor, z: r.z0 + 4.2, rotY: -Math.PI * 0.5,
      width: 1.3, rise: 0.182, height: STOREY, railing: 'both',
    });
    buildStair({
      ctx: this.ctx, cell,
      x: r.x0 + 4.0, y: info.yFloor + STOREY, z: r.z0 + 1.6, rotY: Math.PI * 0.5,
      width: 1.3, rise: 0.182, height: STOREY, railing: 'both',
    });
    this.stairBulkhead(cell, r.x0 + 2.7, info.yRoof, r.z0 + 3.0, 3.2, 3.4, Math.PI * 0.5);

    // Exterior stair from the courtyard up to the first-floor balcony, giving
    // the compound a second route that does not pass through the front door.
    const ex = buildStair({
      ctx: this.ctx, cell,
      x: r.x1 - 3.0, y: this.g(r.x1 - 3.0, r.z1 + 3.6), z: r.z1 + 3.4, rotY: Math.PI,
      width: 1.35, rise: 0.185, height: info.yFloor + STOREY - this.g(r.x1 - 3, r.z1 + 3.4),
      material: 'concrete', railing: 'both',
    });
    void ex;
    // Landing bridging the stair top to the balcony.
    addBox(this.batch.solid('concrete', cell), r.x1 - 3.0, info.yFloor + STOREY - 0.1, r.z1 + 0.6,
      1.7, 0.2, 2.0, { color: [0.94, 0.92, 0.88], grime: 0.2 });
    buildBalcony({
      ctx: this.ctx, cell,
      x: r.x1 - 3.0, y: info.yFloor + STOREY, z: r.z1,
      rotY: 0, width: 3.2, depth: 1.6, color: [1.0, 0.97, 0.92], balusters: true,
    });

    // Furniture: a reception room, a bedroom, and evidence of occupation.
    const wood = this.batch.solid('wood_planks', cell);
    addBox(wood, inner.x0 + 8.4, info.yFloor + 0.36, inner.z0 + 3.0, 2.2, 0.72, 0.9, {
      color: [0.86, 0.74, 0.6], grime: 0.25,
    });
    const carpet = this.batch.solid('fabric_carpet', cell);
    addBox(carpet, inner.x0 + 9.4, info.yFloor + 0.014, inner.z0 + 4.2, 4.4, 0.028, 5.4, {
      rotY: 0.03, color: [2.7, 1.5, 1.02],
    });
    addBox(carpet, inner.x0 + 9.0, info.yFloor + STOREY + 0.014, inner.z0 + 8.0, 3.6, 0.028, 4.2, {
      rotY: -0.04, color: [1.65, 1.6, 2.2],
    });
    for (let i = 0; i < 16; i++) {
      const x = rng.range(inner.x0 + 0.6, inner.x1 - 0.6);
      const z = rng.range(inner.z0 + 0.6, inner.z1 - 0.6);
      const up = rng.next() < 0.45;
      const y = up ? info.yFloor + STOREY : info.yFloor;
      const pick = rng.next();
      const id = pick < 0.22 ? 'plastic_chair' : pick < 0.38 ? 'crate_large' : pick < 0.5 ? 'carpet_roll'
        : pick < 0.62 ? 'rubble_chunk' : pick < 0.74 ? 'debris_plank' : pick < 0.84 ? 'ammo_box'
          : pick < 0.93 ? 'clay_pot' : 'newspaper';
      this.batch.placeAt(id, x, y, z, rng.range(0, 6.28), rng.range(0.85, 1.15), tint(rng, 0.14));
    }
    buildSandbags(this.ctx, cell, inner.x0 + 11.0, info.yFloor + STOREY, inner.z0 + 1.4, 0, 3.0, 3);
    buildSandbags(this.ctx, cell, r.x1 - 4.0, info.yRoof, r.z0 + 2.2, Math.PI * 0.5, 3.4, 4);
  }

  private courtyard(): void {
    const rng = this.rng;
    const cell = cellOf(COURTYARD);

    // An outbuilding along the courtyard's west side: cover, and a low roof.
    const out = this.building({
      rect: rect(29.2, 18.0, 35.6, 24.6),
      floors: 1,
      storey: 3.5,
      material: 'concrete_painted',
      trim: 'concrete',
      color: [0.94, 0.92, 0.88],
      sides: {
        east: [{ u: 3.3, w: 2.6, h: 2.5, sill: 0, kind: 'garage', glass: 'none', noSill: true }],
        north: [{ u: 3.2, w: 1.1, h: 2.1, sill: 0, kind: 'door', glass: 'none' }],
      },
      wear: 0.5,
      parapet: 0.6,
      drift: ['north', 'south', 'east', 'west'],
    });
    this.platforms.push({ rect: inset(out.rect, 0.6), y: out.yRoof, name: 'Outbuilding roof' });
    this.dressRoof(out, rng);

    // Guard post inside the gate.
    buildSandbags(this.ctx, cell, 30.4, this.g(30.4, 13.4), 13.4, 0, 3.6, 4);
    buildSandbags(this.ctx, cell, 32.2, this.g(32.2, 11.8), 11.8, Math.PI * 0.5, 2.4, 3);
    this.batch.placeAt('ammo_box', 31.2, this.g(31.2, 14.6), 14.6, 0.3, 1, tint(rng, 0.1));
    this.batch.placeAt('ammo_box', 31.6, this.g(31.6, 15.2), 15.2, -0.2, 1, tint(rng, 0.1));

    // Courtyard dressing: palms in a rank, drums, a pickup's worth of junk.
    for (const [x, z] of [[45.6, 9.4], [45.2, 17.0], [44.8, 23.2], [31.0, 8.6]] as const) {
      this.palm(x, z, rng.range(0.85, 1.15));
    }
    /*
     * Courtyard dressing, authored rather than scattered.
     *
     * A uniform random scatter over four hundred square metres is a lottery: one
     * draw fills the middle of the courtyard, the next leaves it bare, and since
     * the whole town shares one generator, any change upstream reshuffles it. The
     * courtyard is the compound's fight and the subject of a hero shot, so the
     * cover that matters is placed by hand — a working yard's worth of drums,
     * crates and tyres in three clusters with clear lines between them — and the
     * random pass only adds small litter on top.
     */
    this.propCluster(37.2, 12.4, rng, [
      ['drum_rust', 0, 0], ['drum_rust', 0.62, 0.18], ['drum_painted', 0.3, 0.74],
      ['pallet', -0.9, 0.6], ['jerrycan', 0.95, -0.55],
    ]);
    this.propCluster(41.8, 17.6, rng, [
      ['crate_large', 0, 0], ['crate_large', 0.02, 0.95], ['crate_small', 0.1, 0.48, 0.86],
      ['tyre', -1.0, 0.3], ['tyre', -1.05, 0.34, 0.16], ['sack', 0.9, -0.7],
    ]);
    this.propCluster(33.4, 20.2, rng, [
      ['drum_painted', 0, 0], ['crate_large', 0.85, -0.3], ['clay_pot', -0.7, 0.5],
      ['cable_spool', 0.4, 1.1], ['cinder_block', -0.85, -0.6],
    ]);
    // Litter: small, walkable, and safe to leave to chance.
    for (let i = 0; i < 10; i++) {
      const x = rng.range(COURTYARD.x0 + 1.5, COURTYARD.x1 - 1.5);
      const z = rng.range(COURTYARD.z0 + 1.5, COURTYARD.z1 - 1.5);
      if (rectContains(out.rect, x, z, 1)) continue;
      const pick = rng.next();
      const id = pick < 0.3 ? 'brick' : pick < 0.5 ? 'rubble_chunk' : pick < 0.66 ? 'cinder_block'
        : pick < 0.8 ? 'debris_plank' : pick < 0.92 ? 'bucket' : 'newspaper';
      this.batch.placeAt(id, x, this.g(x, z), z, rng.range(0, 6.28), rng.range(0.9, 1.1), tint(rng, 0.14));
    }
    // Pushed deeper into the yard: at (40.5, 21.5) the shell stood two metres off
    // the courtyard camera's right shoulder and blocked the corner of the shot.
    buildBurntCar(this.batch, 43.4, 19.4, 2.5, this.g, rng);
    buildContainer(this.batch, 47.0, 13.0, Math.PI * 0.5 + 0.05, this.g, [0.72, 0.9, 0.85]);
    this.blockers.push(rect(43.8, 11.8, 50.2, 14.3));
    this.hotspots.push({ x: 38, z: 15, radius: 9 });
    this.hotspots.push({ x: 33, z: 22, radius: 6 });
    this.landmarks.push({ name: 'Courtyard', position: new THREE.Vector3(38, this.g(38, 16) + 1.6, 16) });
  }

  /* ------------------------------ market street --------------------------- */

  private marketStreet(): void {
    const rng = this.rng;

    this.fountain();
    buildTechnical(this.batch, TECHNICAL.x, TECHNICAL.z, TECHNICAL.yaw, this.g, rng);
    this.blockers.push(rect(TECHNICAL.x - 1.4, TECHNICAL.z - 2.8, TECHNICAL.x + 1.4, TECHNICAL.z + 2.8));
    this.hotspots.push({ x: TECHNICAL.x, z: TECHNICAL.z, radius: 6 });
    buildBus(this.batch, BUS.x, BUS.z, BUS.yaw, this.g, rng);
    this.blockers.push(rect(BUS.x - 1.6, BUS.z - 5.6, BUS.x + 1.6, BUS.z + 5.6));
    this.hotspots.push({ x: BUS.x, z: BUS.z, radius: 8 });
    this.landmarks.push({ name: 'Wrecked Bus', position: new THREE.Vector3(BUS.x, this.g(BUS.x, BUS.z) + 1.6, BUS.z) });

    // Containers and barriers breaking the long sightline into rooms.
    buildContainer(this.batch, -3.6, -50.5, 0.06, this.g, [0.95, 0.62, 0.45]);
    this.blockers.push(rect(-4.9, -53.6, -2.3, -47.4));
    buildContainer(this.batch, 3.9, 52.5, Math.PI * 0.5 + 0.03, this.g, [0.55, 0.68, 0.9], 12.2);
    this.blockers.push(rect(-2.2, 51.2, 10.0, 53.8));
    this.hotspots.push({ x: 0, z: -50, radius: 8 });
    this.hotspots.push({ x: 0, z: 52, radius: 8 });

    for (const [x, z, yaw] of [
      [-4.2, -44.0, 0.05], [4.4, -41.0, -0.08], [4.6, -14.6, 0.02], [-4.4, -8.0, 0.1],
      [4.5, 12.0, -0.05], [-4.6, 27.0, 0.03], [4.3, 31.0, 0.0], [-4.2, 45.0, -0.06],
    ] as const) {
      this.batch.placeAt('jersey_barrier', x, this.g(x, z), z, yaw, 1, tint(rng, 0.1));
      if (rng.next() < 0.5) {
        this.batch.placeAt('jersey_barrier', x + rng.range(-0.4, 0.4), this.g(x, z + 2.1), z + 2.1, yaw + rng.range(-0.1, 0.1), 1, tint(rng, 0.1));
      }
    }

    // Market stalls clustered where the street widens, in two loose rows.
    for (const z of [-28, -24.5, -10.5, -6.5, 8.5, 25.5, 29.5, 43.5]) {
      const side = z % 7 < 3.5 ? -1 : 1;
      const x = side * rng.range(3.4, 4.4);
      this.marketStall(x, z, side > 0 ? -Math.PI * 0.5 : Math.PI * 0.5, rng);
    }
    for (const [x, z, yaw] of [[-3.9, -18.5, 0.4], [3.6, 17.5, -1.1], [-3.4, 35.0, 2.2]] as const) {
      this.batch.placeAt('overturned_stall', x, this.g(x, z), z, yaw, 1, tint(rng, 0.16, 0.2));
      for (let i = 0; i < 5; i++) {
        const px = x + rng.range(-1.6, 1.6);
        const pz = z + rng.range(-1.6, 1.6);
        this.batch.placeAt(rng.next() < 0.6 ? 'produce_crate' : 'basket', px, this.g(px, pz), pz,
          rng.range(0, 6.28), rng.range(0.85, 1.1), tint(rng, 0.18, 0.3));
      }
    }

    // Street lamps down both kerbs, and signs at the junctions.
    for (let z = -56; z < 60; z += 13) {
      const side = (Math.round(z / 13) % 2 === 0) ? -1 : 1;
      const x = side * 6.6;
      this.batch.placeAt('street_lamp', x, this.g(x, z), z, side > 0 ? Math.PI : 0, 1, tint(rng, 0.05));
    }
    for (const [x, z, yaw] of [
      [-6.4, CROSS_A_CENTER_Z - 5.5, 0.2], [6.5, CROSS_A_CENTER_Z + 5.0, Math.PI + 0.1],
      [-6.5, CROSS_B_CENTER_Z + 5.5, 0.0], [6.4, CROSS_B_CENTER_Z - 5.0, Math.PI - 0.15],
      [-6.6, -40, 0.1], [6.6, 46, Math.PI],
    ] as const) {
      this.batch.placeAt('sign_post', x, this.g(x, z), z, yaw, 1, tint(rng, 0.08));
    }

    // Power lines and banners across the street: the strongest depth cue there
    // is, and the framing element at the top of the hero shot.
    for (let z = -56; z < 60; z += 9.4) {
      const cell = cellFor(0, z);
      const y = this.g(0, z) + rng.range(6.4, 8.2);
      const jitter = rng.range(-1.5, 1.5);
      /*
       * Over-scaled, but only just. A 15 mm conductor is a sub-pixel line at
       * thirty metres and shatters into dashes, so the wire is drawn thicker than
       * life to stay continuous — which is what film and every shipped shooter
       * does. At 42 mm, though, it stopped being a cable: six of them crossing the
       * hero shot at 8 cm apparent diameter read as pen strokes drawn over the
       * sky, and they cut the composition into bands. 26 mm holds together at
       * range and disappears where it should.
       *
       * The tint matters as much as the gauge. These are drawn in the
       * rusted-metal material, whose albedo is orange end to end, so a neutral
       * multiplier gives an orange wire; lifting green and blue puts it back on
       * the weathered grey a conductor actually is.
       */
      addCatenary(this.batch.solid('metal_rusted', cell),
        -8.1, y, z, 8.1, y + rng.range(-0.5, 0.5), z + jitter,
        rng.range(0.5, 1.2), 0.026, 14, [0.78, 1.04, 1.2]);
      if (rng.next() < 0.5) {
        const y2 = y - rng.range(0.5, 1.6);
        addCatenary(this.batch.solid('metal_rusted', cell),
          -8.1, y2, z + 1.2, 8.1, y2 + 0.3, z + 1.2 + jitter * 0.5,
          rng.range(0.4, 1.0), 0.02, 12, [0.84, 1.1, 1.26]);
      }
      /*
       * Bunting on a couple of the lower lines, and only over the market's
       * middle stretch. Triangular, because the flags on a string of bunting are
       * pennants and a row of upright rectangles up there reads as hanging
       * placards — but the real constraint is quantity. Three strings crossing a
       * single frame is festival dressing, not a street, and it competes with
       * every silhouette behind it.
       */
      if (Math.abs(z) < 24 && rng.next() < 0.34) {
        const yb = y - 1.9;
        const sag = 0.35;
        addCatenary(this.batch.solid('metal_rusted', cell), -8.1, yb, z - 1.5, 8.1, yb, z - 1.5,
          sag, 0.016, 10, [0.66, 0.86, 1.0]);
        this.bunting(cell, -8.1, yb, z - 1.5, 8.1, yb, z - 1.5, sag, rng);
      }
    }

    // Posters and graffiti on the ground-floor walls facing the street.
    for (let i = 0; i < 26; i++) {
      const side = rng.bool() ? -1 : 1;
      const x = side * 8.02;
      const z = rng.range(-58, 58);
      if (Math.abs(z - CROSS_A_CENTER_Z) < 5 || Math.abs(z - CROSS_B_CENTER_Z) < 5) continue;
      this.batch.placeAt('poster', x, this.g(x, z) + rng.range(1.1, 2.4), z,
        side > 0 ? -Math.PI * 0.5 : Math.PI * 0.5, rng.range(0.8, 1.3), tint(rng, 0.2, 0.3));
    }

    /*
     * Three deliberate features out in the middle of the carriageway.
     *
     * Everything else on this street is pushed to the kerbs, because that is where
     * stalls, lamps, barriers and wrecks belong — and the consequence was that a
     * camera standing in the road and looking along it saw forty metres of
     * unbroken dust across the bottom half of the frame. A street that has been
     * fought over has things in the middle of it, and each of these is also a
     * fifteen-metre break in the sightline, which the lane needed anyway.
     */
    this.crater(1.2, -21.5, 2.3, rng);
    this.crater(-1.8, 33.5, 1.7, rng);
    // A spool and pallets tipped off a lorry, with drums rolled clear of them.
    this.batch.placeAt('cable_spool', -0.4, this.g(-0.4, 4.5), 4.5, 0.5, 1.15, tint(rng, 0.12));
    for (let i = 0; i < 5; i++) {
      const px = rng.range(-2.6, 1.8);
      const pz = 4.5 + rng.range(-2.8, 2.8);
      this.batch.placeAt(rng.next() < 0.55 ? 'pallet' : 'debris_plank',
        px, this.g(px, pz), pz, rng.range(0, 6.28), rng.range(0.9, 1.15), tint(rng, 0.16));
    }
    for (const [px, pz] of [[1.7, 2.6], [2.2, 6.4], [-2.4, 7.2]] as const) {
      this.batch.placeAt(rng.next() < 0.5 ? 'drum_rust' : 'drum_painted',
        px, this.g(px, pz), pz, rng.range(0, 6.28), 1, tint(rng, 0.14, 0.2));
    }
    // A stack of tyres left in the road, half burnt.
    for (let i = 0; i < 5; i++) {
      this.batch.placeAt('tyre', 0.9 + rng.range(-0.14, 0.14), this.g(0.9, -6.2) + i * 0.19,
        -6.2 + rng.range(-0.14, 0.14), rng.range(0, 6.28), rng.range(0.95, 1.05),
        tint(rng, 0.08));
    }
    for (let i = 0; i < 4; i++) {
      const px = rng.range(-0.6, 2.4);
      const pz = -6.2 + rng.range(-2.2, 2.2);
      this.batch.placeAt('tyre', px, this.g(px, pz), pz, rng.range(0, 6.28), 1, tint(rng, 0.1));
    }

    /*
     * A collapsed shopfront spilling into the road, and a checkpoint opposite.
     *
     * The stretch between the fountain and the bus was the one length of the
     * centre lane with nothing in it — twelve metres of clean dust filling the
     * bottom third of the player-eye shot, and the exact failure the crater and
     * spool were added upstream to fix at the other end. Two authored features
     * rather than more scatter: rubble spilling out of a hole in the west
     * terrace, which gives the void a cause, and a sandbagged position facing
     * the other way across the street, which gives it a reason.
     */
    buildBlastHole(this.ctx, cellFor(-8, 12.4), -8, this.g(-8, 12.4) + 1.5, 12.4,
      -Math.PI * 0.5, 3.0, 2.6, 0.36);
    this.rubbleSpill(-7.7, 12.4, 6.2, rng);
    buildSandbags(this.ctx, cellFor(3, 14), 3.4, this.g(3.4, 14.2), 14.2, -0.28, 4.2, 4);
    buildSandbags(this.ctx, cellFor(3, 14), 1.5, this.g(1.5, 16.4), 16.4, 1.32, 2.6, 3);
    this.batch.placeAt('ammo_box', 2.7, this.g(2.7, 15.2), 15.2, 0.4, 1, tint(rng, 0.1));
    this.batch.placeAt('drum_rust', 4.3, this.g(4.3, 11.6), 11.6, 1.1, 1, tint(rng, 0.12));
    this.blockers.push(rect(1.2, 13.6, 4.4, 16.9));

    /*
     * Litter over the whole carriageway. Small, walkable, and the thing that
     * separates a street that has been fought along from a street that has been
     * swept: bricks off the spall patches, block off the barricades, paper out
     * of the shops. Scattered rather than authored because none of it is cover
     * and none of it reads individually — what reads is that no square metre of
     * the road is empty.
     */
    for (let i = 0; i < 70; i++) {
      const x = rng.range(-7.2, 7.2);
      const z = rng.range(-58, 58);
      // Off the pavement crossings and out from under the wrecks, where the
      // vehicle's own debris field is already dressed.
      if (Math.hypot(x - BUS.x, z - BUS.z) < 4) continue;
      if (Math.hypot(x - TECHNICAL.x, z - TECHNICAL.z) < 3) continue;
      const pick = rng.next();
      const id = pick < 0.3 ? 'brick' : pick < 0.5 ? 'rubble_chunk'
        : pick < 0.62 ? 'cinder_block' : pick < 0.76 ? 'debris_plank'
          : pick < 0.86 ? 'newspaper' : pick < 0.94 ? 'bucket' : 'tyre';
      this.batch.placeAt(id, x, this.g(x, z), z, rng.range(0, 6.28),
        rng.range(0.85, 1.15), tint(rng, 0.16, 0.2));
    }

    this.landmarks.push({ name: 'Market', position: new THREE.Vector3(0, this.g(0, -12) + 1.6, -12) });
    this.hotspots.push({ x: 0, z: -20, radius: 10 });
    this.hotspots.push({ x: 0, z: 20, radius: 10 });
    this.hotspots.push({ x: 0, z: -8, radius: 8 });
  }

  /**
   * A shell crater: scorch, a broken rim and a spoil bank.
   *
   * The terrain is a baked heightfield by the time anything is placed on it, so
   * the hole cannot actually be dug — and it does not need to be. What reads as a
   * crater at street level is the ring: broken slabs of surfacing tipped up out of
   * the rim, a low bank of spoil thrown clear of it, and a dark scorched centre
   * flush with the road. The absence of the depression is the last thing anyone
   * notices, and it is invisible entirely from more than a few metres away.
   */
  private crater(x: number, z: number, radius: number, rng: Rng): void {
    const cell = cellFor(x, z);
    const h = (px: number, pz: number): number => this.g(px, pz);
    // Scorch, flush to the camber and well inside the rim.
    addGroundPatch(this.batch.solidFlat('asphalt', cell), x, z,
      Array.from({ length: 13 }, (_, k) => radius * rng.range(0.72, 1.0)
        * (1 + 0.16 * Math.sin(k * 2.1 + x))),
      rng.range(0, 3), rng.range(0.85, 1.2), h, 0.018, [0.62, 0.58, 0.54]);
    // The rim: slabs of surfacing levered up, standing at their own angles.
    const rubble = this.batch.solid('rubble', cell);
    const slabMat = this.batch.solid('concrete_damaged', cell);
    const ring = 9 + rng.int(0, 4);
    for (let i = 0; i < ring; i++) {
      const a = (i / ring) * Math.PI * 2 + rng.range(-0.2, 0.2);
      const d = radius * rng.range(0.88, 1.12);
      const px = x + Math.cos(a) * d;
      const pz = z + Math.sin(a) * d;
      const w = rng.range(0.4, 0.95);
      addWedge(slabMat, px, h(px, pz) - 0.02, pz, w, rng.range(0.1, 0.32), w * rng.range(0.7, 1.4), {
        rotY: -a + rng.range(-0.5, 0.5),
        color: [1.0, 0.96, 0.9],
        grime: 0.3,
      });
    }
    // Spoil thrown clear, thinning outward.
    for (let i = 0; i < 26; i++) {
      const a = rng.range(0, Math.PI * 2);
      const d = radius * (1 + Math.pow(rng.next(), 0.6) * 1.5);
      const px = x + Math.cos(a) * d;
      const pz = z + Math.sin(a) * d;
      const s = rng.range(0.08, 0.3) * (1 - (d / (radius * 2.5)) * 0.5);
      addBox(rubble, px, h(px, pz) + s * 0.35, pz, s * rng.range(1.4, 2.6), s, s * rng.range(1.2, 2.2), {
        rotY: rng.range(0, Math.PI),
        color: [1.02, 0.98, 0.92],
        grime: 0.25,
      });
    }
    for (let i = 0; i < 3; i++) {
      const a = rng.range(0, Math.PI * 2);
      const d = radius * rng.range(1.0, 1.7);
      const px = x + Math.cos(a) * d;
      const pz = z + Math.sin(a) * d;
      this.batch.placeAt('rubble_chunk', px, h(px, pz), pz,
        rng.range(0, 6.28), rng.range(0.9, 1.4), tint(rng, 0.12));
    }
  }

  /**
   * A wall that has come down into the street, spread as a talus fan.
   *
   * Different animal from a crater: no rim and no scorch, just graded debris
   * running out from the wall line with the biggest pieces nearest the source
   * and dust at the toe, plus the odd length of reinforcement and shuttering in
   * it. Doubles as a walkable ramp, so the fan is kept low and its collision is
   * left to the individual pieces rather than a blocker box.
   *
   * `dir` is the outward normal of the wall in x, so +1 spills east.
   */
  private rubbleSpill(x: number, z: number, reach: number, rng: Rng, dir = 1): void {
    const cell = cellFor(x, z);
    const h = (px: number, pz: number): number => this.g(px, pz);
    const rubble = this.batch.solid('rubble', cell);
    const slab = this.batch.solid('concrete_damaged', cell);

    // Dust and fines washed out to the toe of the fan, flush with the road.
    for (let i = 0; i < 4; i++) {
      const t = 0.25 + i * 0.22;
      addGroundPatch(this.batch.solidFlat('sand', cell), x + dir * reach * t, z + rng.range(-2.2, 2.2),
        Array.from({ length: 11 }, (_, k) => reach * rng.range(0.16, 0.3)
          * (1 + 0.22 * Math.sin(k * 1.9 + i))),
        rng.range(0, 3), rng.range(0.8, 1.6), h, 0.012 + i * 0.002, [1.16, 1.1, 1.0]);
    }

    // Graded debris. Size and height both fall off with distance from the wall,
    // which is the whole read: a fan of evenly sized lumps is a gravel bed.
    for (let i = 0; i < 54; i++) {
      const t = Math.pow(rng.next(), 0.7);
      const px = x + dir * reach * t * rng.range(0.85, 1.15);
      const pz = z + rng.range(-1, 1) * (1.4 + t * 3.4);
      const s = rng.range(0.1, 0.42) * (1.25 - t * 0.7);
      const bank = (1 - t) * 0.55;
      addBox(rubble, px, h(px, pz) + bank * rng.range(0.2, 1.0) + s * 0.4, pz,
        s * rng.range(1.3, 2.4), s, s * rng.range(1.2, 2.1), {
          rotY: rng.range(0, Math.PI), color: [1.04, 1.0, 0.94], grime: 0.22,
        });
    }
    // Slabs of floor and render, tipped where they landed.
    for (let i = 0; i < 9; i++) {
      const t = Math.pow(rng.next(), 0.6);
      const px = x + dir * reach * t * rng.range(0.7, 1.1);
      const pz = z + rng.range(-1, 1) * (1.2 + t * 3.0);
      const w = rng.range(0.5, 1.25);
      addWedge(slab, px, h(px, pz) + (1 - t) * 0.3, pz, w, rng.range(0.12, 0.3), w * rng.range(0.6, 1.5), {
        rotY: rng.range(0, 6.28), color: [1.0, 0.96, 0.9], grime: 0.3,
      });
    }
    // Reinforcement and shuttering sticking out of it.
    const steel = this.batch.solid('metal_rusted', cell);
    for (let i = 0; i < 6; i++) {
      const t = rng.range(0.05, 0.6);
      const px = x + dir * reach * t;
      const pz = z + rng.range(-2.6, 2.6);
      const len = rng.range(0.8, 2.2);
      const a = rng.range(0, 6.28);
      const lift = rng.range(0.1, 0.7);
      addTube(steel,
        new THREE.Vector3(px, h(px, pz) + 0.05, pz),
        new THREE.Vector3(px + Math.cos(a) * len, h(px, pz) + lift, pz + Math.sin(a) * len),
        0.012, 4, [0.86, 0.98, 1.02]);
    }
    for (let i = 0; i < 5; i++) {
      const t = rng.range(0.1, 0.95);
      const px = x + dir * reach * t;
      const pz = z + rng.range(-3.2, 3.2);
      this.batch.placeAt(rng.next() < 0.55 ? 'debris_plank' : 'rubble_chunk',
        px, h(px, pz), pz, rng.range(0, 6.28), rng.range(0.9, 1.4), tint(rng, 0.14));
    }
    for (let i = 0; i < 4; i++) {
      const px = x + dir * reach * rng.range(0.1, 0.8);
      const pz = z + rng.range(-2.8, 2.8);
      this.batch.placeAt('brick', px, h(px, pz), pz, rng.range(0, 6.28), 1, tint(rng, 0.12));
    }
  }

  /** The dry fountain: the map's centrepiece and its best piece of low cover. */
  private fountain(): void {
    const rng = this.rng;
    const cell = cellFor(FOUNTAIN.x, FOUNTAIN.z);
    const y = this.g(FOUNTAIN.x, FOUNTAIN.z);
    // Dressed stone: this is a civic fountain in a bleached town, and in brick
    // it read as a red drum dropped in the middle of the market.
    const stone = this.batch.solid('stucco_sand', cell);
    const trim = this.batch.solid('concrete', cell);
    const brick = this.batch.solid(BLOCK_MAT, cell);
    const R = FOUNTAIN.radius;
    const sides = 16;

    /*
     * Basin wall, in discrete blocks so the joints read, on a step course that
     * is proud of it. The step is the detail that matters: a cylinder meeting
     * the paving on one line has nothing to ground it, and everyone who has
     * looked at a real fountain has seen the two courses of stone it stands on
     * even if they never noticed them.
     */
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      const px = FOUNTAIN.x + Math.cos(a) * R;
      const pz = FOUNTAIN.z + Math.sin(a) * R;
      const seg = (Math.PI * 2 * R) / sides + 0.06;
      const broken = i === 5 || i === 6;
      const h = broken ? 0.38 : 0.86;
      addBox(trim, px + Math.cos(a) * 0.12, y + 0.07, pz + Math.sin(a) * 0.12, 0.78, 0.16, seg, {
        rotY: -a, color: [1.0, 0.97, 0.92], grime: 0.4, grimeHeight: 0.12,
      });
      addBox(stone, px, y + 0.14 + h * 0.5, pz, 0.5, h, seg, {
        rotY: -a, color: [1.0, 0.94, 0.86], grime: 0.35, grimeHeight: 0.4,
      });
      // A moulded band two thirds up, catching a line of shadow all the way
      // round: the cheapest way to stop a drum reading as a drum.
      if (!broken) {
        addBox(stone, px + Math.cos(a) * 0.05, y + 0.72, pz + Math.sin(a) * 0.05, 0.56, 0.1, seg, {
          rotY: -a, color: [1.03, 0.99, 0.92],
        });
        addBox(trim, px, y + 1.06, pz, 0.68, 0.14, seg, {
          rotY: -a, color: [1.05, 1.02, 0.97], bleach: 0.05,
        });
      } else {
        // Exposed brick where the shell took the facing stone off.
        for (let c = 0; c < 4; c++) {
          addBox(brick, px - Math.cos(a) * 0.08, y + 0.2 + c * 0.16, pz - Math.sin(a) * 0.08,
            0.34, 0.14, seg * rng.range(0.7, 1.0), { rotY: -a, color: BRICK_BUFF });
        }
      }
    }
    // Basin floor, dry, silted with wind-blown sand.
    addCylinder(this.batch.solid('concrete', cell), FOUNTAIN.x, y - 0.22, FOUNTAIN.z, R - 0.22, 0.28, {
      segments: sides, color: [0.86, 0.84, 0.8], caps: true,
    });
    addCylinder(this.batch.solid('sand', cell), FOUNTAIN.x, y + 0.05, FOUNTAIN.z, R - 0.42, 0.03, {
      segments: sides, color: [1.05, 1.0, 0.92], caps: true,
    });
    // Central pedestal and a broken bowl.
    addCylinder(stone, FOUNTAIN.x, y + 0.05, FOUNTAIN.z, 0.78, 0.42, { segments: sides, color: [0.99, 0.94, 0.86] });
    addCylinder(trim, FOUNTAIN.x, y + 0.44, FOUNTAIN.z, 0.62, 0.1, { segments: sides, color: [1.03, 1.0, 0.95] });
    addCylinder(stone, FOUNTAIN.x, y + 0.47, FOUNTAIN.z, 0.4, 1.05, { segments: 12, color: [1.0, 0.95, 0.87], grime: 0.2 });
    // Spout collar: a ring of blocks where four pipes used to come out.
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      addBox(stone, FOUNTAIN.x + Math.cos(a) * 0.42, y + 1.18, FOUNTAIN.z + Math.sin(a) * 0.42,
        0.3, 0.26, 0.22, { rotY: -a, color: [1.02, 0.97, 0.9] });
      addCylinder(this.batch.solid('metal_rusted', cell),
        FOUNTAIN.x + Math.cos(a) * 0.5, y + 1.2, FOUNTAIN.z + Math.sin(a) * 0.5, 0.045, 0.1,
        { segments: 6, color: [0.8, 0.72, 0.62] });
    }
    addCylinder(trim, FOUNTAIN.x, y + 1.52, FOUNTAIN.z, 1.05, 0.16, { segments: 14, color: [1.02, 0.98, 0.92] });
    for (let i = 0; i < 10; i++) {
      const a = (i / 14) * Math.PI * 2;
      addBox(stone, FOUNTAIN.x + Math.cos(a) * 1.02, y + 1.76, FOUNTAIN.z + Math.sin(a) * 1.02,
        0.22, 0.32, 0.42, { rotY: -a, color: [1.0, 0.96, 0.9] });
    }
    addBox(this.batch.solid('rubble', cell), FOUNTAIN.x + 1.4, y + 0.2, FOUNTAIN.z + 1.9,
      0.9, 0.4, 0.8, { rotY: 0.7, color: [0.92, 0.9, 0.86] });

    // Rubble spilled where the basin wall is broken.
    buildRubblePile(this.ctx, cell, FOUNTAIN.x - 2.4, FOUNTAIN.z + 2.6, 1.6, 0.7, this.g);
    for (let i = 0; i < 7; i++) {
      const a = rng.range(0, Math.PI * 2);
      const d = rng.range(R + 0.4, R + 2.6);
      const px = FOUNTAIN.x + Math.cos(a) * d;
      const pz = FOUNTAIN.z + Math.sin(a) * d;
      this.batch.placeAt('rubble_chunk', px, this.g(px, pz), pz, rng.range(0, 6.28), rng.range(0.8, 1.3), tint(rng, 0.12));
    }
    // Palms behind it, so the centrepiece has a backdrop. One is the tall
    // variant: the market street needs a vertical element that clears the
    // rooflines and gives the long shot something to read against the sky.
    this.palm(FOUNTAIN.x - 4.6, FOUNTAIN.z - 3.4, 1.05);
    this.palm(FOUNTAIN.x + 4.9, FOUNTAIN.z + 2.6, 0.95);
    this.palm(FOUNTAIN.x - 4.2, FOUNTAIN.z + 7.4, 1.0, 3);
    this.blockers.push(rect(FOUNTAIN.x - R, FOUNTAIN.z - R, FOUNTAIN.x + R, FOUNTAIN.z + R));

    this.landmarks.push({ name: 'Fountain', position: new THREE.Vector3(FOUNTAIN.x, y + 1.6, FOUNTAIN.z) });
    this.hotspots.push({ x: FOUNTAIN.x, z: FOUNTAIN.z, radius: 9 });
  }

  /* ------------------------------- rooftops ------------------------------- */

  private rooftops(): void {
    const rng = this.rng;

    // Exterior stair from cross street A up to the west shop roofs, running
    // alongside the north wall and landing through the parapet gap.
    const shopRoof = this.shopRoofs[2];
    if (shopRoof) {
      const cell = cellOf(shopRoof.rect);
      const foot = this.g(-36.8, -21.5);
      const climb = shopRoof.yRoof - foot;
      const run = Math.round(climb / 0.185) * 0.29;
      buildStair({
        ctx: this.ctx, cell,
        x: -36.8, y: foot, z: -16.4 - run, rotY: -Math.PI * 0.5,
        width: 1.4, rise: 0.185, height: climb,
        material: 'concrete', railing: 'left', solid: false,
      });
      // Masonry cheek along the open side, so the flight has real mass.
      addBox(this.batch.solid('stucco_sand', cell),
        -35.85, foot + climb * 0.5, -16.4 - run * 0.5, 0.3, climb, run,
        { color: [0.96, 0.93, 0.87], grime: 0.4 });
      addBox(this.batch.solid('concrete', cell),
        -36.8, shopRoof.yRoof - 0.14, -15.4, 1.6, 0.28, 2.4,
        { color: [0.94, 0.92, 0.88] });
    }

    // Ladder from the alley to the two-storey east roof.
    const ladderFoot = this.g(22.6, -6.5);
    buildLadder(this.ctx, cellOf(this.ebMiddle.rect), 22.3, ladderFoot, -6.5,
      this.ebMiddle.yRoof - ladderFoot + 0.5, Math.PI * 0.5);
    // Something to climb onto at the bottom, so the ladder reads as usable.
    this.batch.placeAt('crate_large', 23.2, this.g(23.2, -7.7), -7.7, 0.2, 1, tint(rng, 0.1));
    this.batch.placeAt('crate_small', 23.5, this.g(23.5, -5.3), -5.3, -0.3, 1, tint(rng, 0.1));
    this.platforms.push({ rect: rect(22.2, -7.4, 23.4, -5.6), y: this.ebMiddle.yRoof, name: 'Ladder head' });

    // Plank bridge across cross street A, between the two west-block roofs.
    this.plankBridge(
      -19.5, -24.2, this.wbNorth.yRoof,
      -19.5, -15.8, this.wbMiddle.yRoof,
      1.7,
    );
    // Cross street B, between the middle and south roofs.
    this.plankBridge(
      -23.0, 16.2, this.wbMiddle.yRoof,
      -23.0, 23.8, this.wbSouth.yRoof,
      1.5,
    );
    // And across the souk itself, onto the annexe roof.
    const shopS = this.shopRoofs[5];
    if (shopS && this.soukAnnexe) {
      this.plankBridge(
        -34.3, 34, shopS.yRoof,
        -29.3, 34, this.soukAnnexe.yRoof,
        1.15, false,
      );
    }

    // Parapet gaps and sandbags so the roofs are fightable, not exposed.
    for (const p of this.platforms) {
      if (p.y < 5.5) continue;
      const cell = cellFor((p.rect.x0 + p.rect.x1) * 0.5, (p.rect.z0 + p.rect.z1) * 0.5);
      const n = Math.max(1, Math.round(((p.rect.x1 - p.rect.x0) * (p.rect.z1 - p.rect.z0)) / 110));
      for (let i = 0; i < n; i++) {
        const x = rng.range(p.rect.x0 + 1, p.rect.x1 - 1);
        const z = rng.range(p.rect.z0 + 1, p.rect.z1 - 1);
        buildSandbags(this.ctx, cell, x, p.y, z, rng.range(0, Math.PI), rng.range(2.2, 3.6), 3);
      }
    }

    this.landmarks.push({ name: 'Rooftops', position: new THREE.Vector3(-17, this.wbMiddle.yRoof + 1.6, -6) });
  }

  /**
   * Scaffold boards laid across a gap between two roofs, with a scrap handrail
   * on one side. Deliberately narrow and slightly springy-looking: a rooftop
   * crossing should feel like a commitment.
   */
  private plankBridge(
    ax: number, az: number, ay: number,
    bx: number, bz: number, by: number,
    width: number, rail = true,
  ): void {
    const mx = (ax + bx) * 0.5;
    const mz = (az + bz) * 0.5;
    const y = (ay + by) * 0.5;
    const cell = cellFor(mx, mz);
    const buf = this.batch.solid('wood_planks', cell);
    const dx = bx - ax;
    const dz = bz - az;
    const span = Math.hypot(dx, dz);
    if (span < 0.5) return;
    const ux = dx / span;
    const uz = dz / span;
    const rotY = Math.atan2(-uz, ux);
    // Perpendicular in world space, matching addBox's local +z.
    const px = -uz;
    const pz = ux;

    const planks = width > 1.3 ? 5 : 3;
    for (let i = 0; i < planks; i++) {
      const off = ((i + 0.5) / planks - 0.5) * width;
      addBox(buf, mx + px * off, y - 0.05, mz + pz * off,
        span + 0.9, 0.07, width / planks - 0.035,
        { rotY, color: [0.9, 0.82, 0.68], grime: 0.3 });
    }
    // Cross battens under the deck; without them it reads as a floating plane.
    const steel = this.batch.solid('metal_rusted', cell);
    for (let i = 0; i <= 3; i++) {
      const t = i / 3;
      addBox(steel, ax + dx * t, y - 0.14, az + dz * t, 0.1, 0.09, width + 0.24,
        { rotY, color: [0.68, 0.62, 0.56] });
    }
    if (rail) {
      const rx = px * (width * 0.5 + 0.07);
      const rz = pz * (width * 0.5 + 0.07);
      for (let i = 0; i <= 3; i++) {
        const t = i / 3;
        addBox(steel, ax + dx * t + rx, y + 0.5, az + dz * t + rz, 0.06, 1.0, 0.06,
          { rotY, color: [0.7, 0.64, 0.58] });
      }
      addBox(steel, mx + rx, y + 0.98, mz + rz, span, 0.06, 0.06, { rotY, color: [0.72, 0.66, 0.6] });
      addBox(steel, mx + rx, y + 0.52, mz + rz, span, 0.05, 0.05, { rotY, color: [0.72, 0.66, 0.6] });
    }
    this.platforms.push({
      rect: rect(Math.min(ax, bx) - width * 0.5, Math.min(az, bz) - width * 0.5,
        Math.max(ax, bx) + width * 0.5, Math.max(az, bz) + width * 0.5),
      y,
      name: 'Plank bridge',
    });
  }

  /* -------------------------------- dressing ------------------------------ */

  /** A date palm: two instanced pieces so trunk and crown can LOD apart. */
  private palm(x: number, z: number, scale = 1, variant = -1): void {
    const rng = this.rng;
    const v = variant >= 0 ? variant : Math.floor(rng.range(0, 3)) % 3;
    const y = this.g(x, z);
    const yaw = rng.range(0, Math.PI * 2);
    const s = scale * rng.range(0.92, 1.1);
    const col = tint(rng, 0.09, 0.2);
    this.batch.placeAt(`palm_trunk_${v}`, x, y - 0.05, z, yaw, s, col);
    this.batch.placeAt(`palm_crown_${v}`, x, y - 0.05, z, yaw, s, tint(rng, 0.12, -0.2));
    // A ring of dropped fronds and a dish of sand at the base.
    const sand = this.batch.solid('sand', cellFor(x, z));
    addCylinder(sand, x, y - 0.02, z, rng.range(0.9, 1.4), 0.06, {
      segments: 9, color: [1.05, 1.01, 0.94], caps: true,
    });
    this.blockers.push(rect(x - 0.45, z - 0.45, x + 0.45, z + 0.45));
  }

  /**
   * The final pass: everything that is scattered rather than placed. Density
   * follows the quality settings, and every candidate is rejected if it lands
   * inside a building, a wreck or another blocker.
   */
  private dressing(): void {
    const rng = this.rng;
    const blocked = (x: number, z: number): boolean => {
      for (const b of this.blockers) {
        if (rectContains(b, x, z, 0.35)) return true;
      }
      return false;
    };

    // Weeds along every kerb and wall base.
    const weedCount = Math.round(150 * this.vegetationDensity);
    for (let i = 0; i < weedCount; i++) {
      const pick = rng.next();
      let x: number;
      let z: number;
      if (pick < 0.3) {
        x = (rng.bool() ? 1 : -1) * rng.range(5.5, 8.2);
        z = rng.range(-60, 60);
      } else if (pick < 0.55) {
        // Hugging the arcade walls, never out in the lane. Nothing grows down
        // the middle of a covered market that people walk through every day, and
        // a weed out there reads as a stray green speck rather than as neglect.
        x = rng.bool() ? SOUK.x0 + rng.range(0.15, 0.8) : SOUK.x1 - rng.range(0.15, 0.8);
        z = rng.range(SOUK.z0, SOUK.z1);
      } else if (pick < 0.72) {
        x = rng.bool() ? ALLEY.x0 + rng.range(0.15, 0.7) : ALLEY.x1 - rng.range(0.15, 0.7);
        z = rng.range(ALLEY.z0, ALLEY.z1);
      } else if (pick < 0.88) {
        x = rng.range(CORNICHE.x0 + 0.6, CORNICHE.x1);
        z = rng.range(-62, 62);
      } else {
        x = rng.range(COURTYARD.x0, COURTYARD.x1);
        z = rng.range(COURTYARD.z0, COURTYARD.z1);
      }
      if (blocked(x, z)) continue;
      this.batch.placeAt('weed', x, this.g(x, z) - 0.02, z, rng.range(0, 6.28), rng.range(0.7, 1.3), tint(rng, 0.18));
    }

    // Dry scrub in the dead ground at the edges.
    const scrubCount = Math.round(60 * this.vegetationDensity);
    for (let i = 0; i < scrubCount; i++) {
      const x = rng.range(MAP.minX - 2, MAP.maxX + 2);
      const z = rng.range(MAP.minZ - 4, MAP.maxZ + 4);
      // Only where nothing much happens: against walls and in corners. The
      // trafficked lanes are excluded outright rather than thinned, because one
      // bush in the middle of the souk floor is more conspicuous than fifty
      // correctly placed ones are along a wall.
      if (x > SOUK.x0 - 0.5 && x < SOUK.x1 + 0.5 && z > SOUK.z0 && z < SOUK.z1) continue;
      const nearStreet = Math.abs(x) < 9 || (x > 21 && x < 29);
      if (nearStreet && rng.next() < 0.85) continue;
      if (blocked(x, z)) continue;
      this.batch.placeAt(`scrub_${rng.bool() ? 0 : 1}`, x, this.g(x, z) - 0.03, z,
        rng.range(0, 6.28), rng.range(0.75, 1.35), tint(rng, 0.16));
    }

    // Debris: bricks, chunks, planks and paper, heaviest near damage.
    const debrisCount = Math.round(220 * this.debrisDensity);
    const focus = [
      { x: 0, z: -50, r: 12 }, { x: 0, z: 58, r: 12 }, { x: 14, z: -31, r: 14 },
      { x: 30, z: -14, r: 10 }, { x: SOUK_CENTER_X, z: -55, r: 10 },
      { x: -43, z: -8, r: 8 }, { x: 0, z: 3, r: 9 }, { x: 25, z: 0, r: 14 },
      { x: 0, z: -20, r: 14 }, { x: 0, z: 20, r: 14 }, { x: 38, z: 15, r: 12 },
      { x: SOUK_CENTER_X, z: 20, r: 10 }, { x: -14, z: -18, r: 9 },
    ];
    for (let i = 0; i < debrisCount; i++) {
      const f = focus[Math.floor(rng.range(0, focus.length)) % focus.length];
      const a = rng.range(0, Math.PI * 2);
      const d = Math.sqrt(rng.next()) * f.r;
      const x = f.x + Math.cos(a) * d;
      const z = f.z + Math.sin(a) * d;
      if (x < MAP.minX - 4 || x > MAP.maxX + 4 || z < MAP.minZ - 4 || z > MAP.maxZ + 4) continue;
      if (blocked(x, z)) continue;
      const pick = rng.next();
      const id = pick < 0.26 ? 'rubble_chunk' : pick < 0.46 ? 'brick' : pick < 0.6 ? 'debris_plank'
        : pick < 0.7 ? 'cinder_block' : pick < 0.8 ? 'newspaper' : pick < 0.88 ? 'tyre'
          : pick < 0.95 ? 'bucket' : 'jerrycan';
      this.batch.placeAt(id, x, this.g(x, z) - 0.015, z, rng.range(0, 6.28), rng.range(0.75, 1.3), tint(rng, 0.16));
    }

    // Pots and plants on balconies and doorsteps, and a few planters.
    for (const [x, z] of [
      [-8.6, -9.0], [-8.6, -3.0], [-8.6, 6.5], [8.6, -8.0], [8.6, 6.0],
      [-25.4, 30.0], [-25.4, 48.0], [21.4, 34.0], [29.9, 10.5], [31.5, 5.0],
      [-33.4, -34.5], [-33.4, 12.0], [-40.4, 30.0], [-40.4, -46.0],
    ] as const) {
      if (blocked(x, z)) continue;
      const y = this.g(x, z);
      this.batch.placeAt(rng.next() < 0.5 ? 'clay_pot' : 'planter', x, y, z, rng.range(0, 6.28), rng.range(0.9, 1.2), tint(rng, 0.16, 0.4));
      if (rng.next() < 0.7) {
        this.batch.placeAt('pot_plant', x, y, z, rng.range(0, 6.28), rng.range(0.85, 1.15), tint(rng, 0.14));
      }
    }

    // Sand drifted into the inside corners of the streets.
    for (const [x0, z0, x1, z1, nx, nz] of [
      [-8, -60, -8, 60, 1, 0], [8, -60, 8, 60, -1, 0],
      [-26, -58, -26, 58, -1, 0], [22, -56, 22, 56, 1, 0],
      [-34, -58, -34, 56, 1, 0], [28, -14, 28, 24, -1, 0],
    ] as const) {
      this.terrain.drift(this.batch, x0, z0, x1, z1, nx, nz, rng, 1.25);
    }

    this.facadeClutter();
  }

  /**
   * Services hung on the outside of every wall the player can see: condensers,
   * dishes, junction boxes, meters, cable runs and lamps.
   *
   * This is the difference between a town and a set of extruded footprints.
   * A three-storey stucco wall with nothing on it has no scale — the eye has
   * nothing to measure it against — and no shadow detail, so it flattens out
   * under a low sun exactly when the rest of the scene is at its most three
   * dimensional. Everything here is instanced, so five hundred of them cost
   * six draw calls.
   */
  private facadeClutter(): void {
    const rng = this.rng;
    const inside = (x: number, z: number): boolean => {
      for (const b of this.blockers) {
        if (rectContains(b, x, z, -0.05)) return true;
      }
      return false;
    };

    for (const f of this.facades) {
      const { line } = f;
      if (line.length < 3) continue;
      // Only dress walls with somewhere to stand and look at them.
      const mx = (line.x0 + line.x1) * 0.5 + line.nx * 2.6;
      const mz = (line.z0 + line.z1) * 0.5 + line.nz * 2.6;
      if (mx < MAP.minX - 6 || mx > MAP.maxX + 6 || mz < MAP.minZ - 8 || mz > MAP.maxZ + 8) continue;
      if (inside(mx, mz)) continue;

      // Wall-local basis: `u` along the wall, outward normal +Z of the prop.
      const ux = (line.x1 - line.x0) / line.length;
      const uz = (line.z1 - line.z0) / line.length;
      const yaw = Math.atan2(line.nx, line.nz);

      const clear = (u: number, y: number, halfW: number, halfH: number): boolean => {
        for (const o of f.openings) {
          const oy = f.yFloor + (o.floor ?? 0) * f.storey + o.sill;
          if (Math.abs(o.u - u) < o.w * 0.5 + halfW + 0.25
            && y + halfH > oy - 0.35 && y - halfH < oy + o.h + 0.5) return false;
        }
        return true;
      };
      const put = (id: string, u: number, y: number, halfW: number, halfH: number, scale = 1): void => {
        if (u < 0.7 || u > line.length - 0.7) return;
        if (!clear(u, y, halfW, halfH)) return;
        this.batch.placeAt(
          id,
          line.x0 + ux * u + line.nx * 0.02,
          y,
          line.z0 + uz * u + line.nz * 0.02,
          yaw, scale, tint(rng, 0.1),
        );
      };

      // Condensers cluster under windows on the upper storeys, which is where
      // they actually go, and never on the ground floor where they would be
      // stolen.
      for (let floor = 1; floor < f.floors; floor++) {
        const y = f.yFloor + floor * f.storey;
        for (let u = rng.range(1.2, 3.2); u < line.length - 1; u += rng.range(2.4, 5.5)) {
          const pick = rng.next();
          if (pick < 0.42) put('wall_ac', u, y + rng.range(1.5, 1.95), 0.5, 0.45);
          else if (pick < 0.66) put('wall_dish', u, y + rng.range(1.6, 2.2), 0.45, 0.45, rng.range(0.85, 1.15));
          else if (pick < 0.78) put('wall_lamp', u, y + rng.range(1.3, 1.7), 0.3, 0.3);
        }
      }
      // Ground-floor services: meter, junction box, a stapled cable run.
      for (let u = rng.range(0.9, 3.0); u < line.length - 1; u += rng.range(3.4, 8.0)) {
        const pick = rng.next();
        const y = f.yFloor;
        if (pick < 0.3) put('wall_box', u, y + rng.range(1.5, 1.9), 0.25, 0.35);
        else if (pick < 0.5) put('wall_meter', u, y + rng.range(1.3, 1.7), 0.2, 0.25);
        else if (pick < 0.72) put('wall_cable', u, y + rng.range(2.4, 3.2), 0.2, 1.35);
        else if (pick < 0.84) put('wall_lamp', u, y + rng.range(2.6, 3.1), 0.3, 0.3);
      }
      // A downpipe at a corner, taken to the ground. Merged rather than
      // instanced because its length follows the building.
      if (f.floors >= 2 && rng.next() < 0.55) {
        const u = rng.bool() ? 0.42 : line.length - 0.42;
        const px = line.x0 + ux * u + line.nx * 0.14;
        const pz = line.z0 + uz * u + line.nz * 0.14;
        const top = f.yRoof + 0.1;
        const foot = this.g(px, pz);
        const pipe = this.batch.solid('metal_rusted', f.cell);
        addCylinder(pipe, px, foot + 0.28, pz, 0.058, top - foot - 0.28, {
          segments: 7, color: [0.86, 0.82, 0.76], grime: 0.4,
        });
        // Shoe at the bottom, kicking the water away from the wall.
        addCylinder(pipe, px + line.nx * 0.1, foot + 0.02, pz + line.nz * 0.1, 0.062, 0.34, {
          segments: 7, color: [0.8, 0.76, 0.7],
        });
        addBox(pipe, px, top - 0.06, pz, 0.2, 0.13, 0.2, { color: [0.82, 0.78, 0.72] });
        for (let y = foot + 1.4; y < top - 0.4; y += 1.7) {
          addBox(pipe, px - line.nx * 0.07, y, pz - line.nz * 0.07, 0.16, 0.05, 0.16,
            { color: [0.74, 0.7, 0.64] });
        }
      }
    }
  }
}

/* ----------------------------- rect subtraction ---------------------------- */

/** Splits a rectangle around a set of holes. Used to cut stairwells in slabs. */
function subtract(r: Rect, holes: Rect[]): Rect[] {
  let pieces: Rect[] = [r];
  for (const h of holes) {
    const next: Rect[] = [];
    for (const p of pieces) {
      if (h.x1 <= p.x0 || h.x0 >= p.x1 || h.z1 <= p.z0 || h.z0 >= p.z1) {
        next.push(p);
        continue;
      }
      const hx0 = Math.max(p.x0, h.x0);
      const hx1 = Math.min(p.x1, h.x1);
      const hz0 = Math.max(p.z0, h.z0);
      const hz1 = Math.min(p.z1, h.z1);
      if (p.z0 < hz0) next.push(rect(p.x0, p.z0, p.x1, hz0));
      if (hz1 < p.z1) next.push(rect(p.x0, hz1, p.x1, p.z1));
      if (p.x0 < hx0) next.push(rect(p.x0, hz0, hx0, hz1));
      if (hx1 < p.x1) next.push(rect(hx1, hz0, p.x1, hz1));
    }
    pieces = next;
  }
  return pieces;
}

export { subtract };
