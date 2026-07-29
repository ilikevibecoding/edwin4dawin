import * as THREE from 'three';
import type { EngineContext, System } from '../core/System';
import { MaterialLibrary, type MaterialKey } from '../render/Materials';
import { RNG } from '../render/Noise';
import { QUALITY, TUNING } from '../core/Config';
import { SKY_PRESETS } from '../render/Sky';
import type { LightingSystem } from '../render/Lighting';
import type { PhysicsSystem } from '../physics/Physics';
import type { SurfaceKind } from '../core/Signals';
import { buildProps } from './Props';
import { buildBuilding, type BuildingSpec, scaleUV } from './Building';
import {
  prism, clothPanel, sagCable, slackCable, cyl, ring, archRing, bagGeometry,
  kerbProfile, driftProfile, duneProfile, corniceProfile, corrugatedPanel,
  scriptRun, patchDisc, gravelBed,
} from './GeoKit';

/** Half-width of the main carriageway. */
export const ROAD_HALF = 7.4;
/** Pavement width either side of it. */
export const PAVE_W = 4.2;
/** Centreline and half-width of the east-west cross street. */
export const CROSS_Z = -14;
export const CROSS_HALF = 5.5;
/** Where the building line stands, either side of the market street. */
export const FRONT_X = 14;
/** The utility pole line, just inside the building line. */
export const POLE_X = 12.6;
/** The stretch of the market street where packed earth has buried the tarmac. */
const APRON_Z0 = 25;
const APRON_Z1 = 55;

/**
 * Top of the walkable surface anywhere on the main street.
 *
 * Three surfaces overlap here — cambered tarmac, the souk's earth apron laid over
 * it, and the raised pavements — and everything dressed onto the street has to
 * know which one it is standing on. Computing it in each caller is how the apron
 * came to be built 10 mm *under* the road it covers, and how litter ended up
 * buried in it; one function means a change to the road profile moves the props
 * with it.
 */
export function groundY(x: number, z: number): number {
  if (Math.abs(x) > ROAD_HALF) return 0.16;
  const t = Math.abs(x) / ROAD_HALF;
  const base = z > APRON_Z0 && z < APRON_Z1 ? 0.075 : 0.02;
  return base + 0.075 * (1 - t * t);
}

/**
 * Height of the desert heightfield at a point, analytically.
 *
 * The single source of truth for the terrain surface: `buildGround` displaces
 * its grid with this, and every placement pass that puts something down off the
 * made street asks it where the ground is.
 *
 * This is the fix for "everything hovers about two centimetres above its
 * support". The prop passes fell back to a hard-coded y = 0 for anything outside
 * the road and pavement, but the terrain inside the playable core is not flat —
 * it carries a ±60 mm undulation, deliberately, so it does not read as a table.
 * So every barrel, crate and bush in the lanes behind the blocks was planted
 * somewhere in a 120 mm band around its actual support, which floats half of
 * them and buries the other half. Two centimetres is exactly the average error
 * you would predict, and it is what the review measured.
 */
export function terrainY(x: number, z: number): number {
  const r = Math.max(Math.abs(x), Math.abs(z));
  const edge = THREE.MathUtils.smoothstep(r, 55, 130);
  const dunes =
    Math.sin(x * 0.031) * Math.cos(z * 0.027) * 2.4 +
    Math.sin(x * 0.077 + 1.3) * Math.cos(z * 0.061 - 0.7) * 0.9;
  const ripple =
    Math.sin(x * 0.19 + z * 0.07) * Math.cos(z * 0.163 - x * 0.05) * 0.34 +
    Math.sin(x * 0.41 - 2.1) * Math.sin(z * 0.37 + 0.6) * 0.13;
  const local = Math.sin(x * 0.21) * Math.cos(z * 0.19) * 0.06;
  return dunes * edge + ripple * edge + local * (1 - edge) - edge * 1.2;
}

/**
 * Awning stripe pairs.
 *
 * A market awning is striped, and there is no stripe in the texture set to reach
 * for, so the stripe gets built out of geometry: the sheet is cut into bands and
 * the bands alternate between two dyes. The review's line was that the awning is
 * "a flat plane with a procedural stripe", and both captures bore that out — one
 * sheet of one over-bright mauve, reading as a blank white plate with hard
 * straight edges and by area the largest fake surface in the street frame.
 *
 * Paired rather than randomised, because a striped canopy is two dyes off one
 * bolt of cloth. Each pair keeps one light band: the stripe has to read against a
 * bright sky as well as across the sheet, and two mid values side by side read as
 * one. The bands merge into per-variant batches globally, so twelve variants cost
 * twelve draw calls for the whole map however many stalls there are.
 *
 * Values pulled back about a quarter after the lighting rebuild landed. These are
 * multipliers over the base albedo, and at 2.6–2.75 the pale bands clipped: the
 * street capture came back with the canopies as flat white plates and the fold
 * and sag geometry underneath them producing no shading at all, because every
 * fold was already at 1.0. Cloth needs headroom above its lit value or the only
 * thing modelling it is its silhouette.
 *
 * No green in the set. Any green dye multiplied by a low warm sun lands on olive,
 * and the golden-hour capture had a striped awning filling a fifth of the frame
 * reading as army camouflage netting — a colour belonging to nothing else in the
 * town. Desaturating it did not help, because the hue was the problem and not the
 * chroma. Indigo is what actually gets used on awnings across the Maghreb, it is
 * the one hue a warm sun pushes *away* from the tan everything else is made of,
 * and it survives both the golden and the overcast preset.
 */
/**
 * Sign lettering: chalk-white or near-black, whichever the painted field is not.
 *
 * Shared by the building signwriter and the market stalls so that all the script
 * on the map lands in two batches rather than one per call site.
 */
export const LETTER_LIGHT = {
  variant: 'letterWhite',
  material: { color: new THREE.Color(2.9, 2.85, 2.7), roughness: 0.66 },
};
export const LETTER_DARK = {
  variant: 'letterBlack',
  material: { color: new THREE.Color(0.34, 0.32, 0.3), roughness: 0.7 },
};
/**
 * Sign enamel green, matching `SIGN_PAINT[0]` in `Building.ts` exactly so the
 * arch's inscription panels queue with every shopfront board on the map.
 * Duplicated rather than imported: `Building` imports from here, so the arrow
 * only goes one way.
 */
export const SIGN_GREEN = {
  variant: 'signGreen',
  material: { color: new THREE.Color(0.5, 1.7, 0.95), roughness: 0.52 },
};
/**
 * Pale limestone, matching `COURT_STONE` in `Building.ts` exactly so the gate's
 * plaques queue with the courtyard flags. Duplicated for the same reason as
 * `SIGN_GREEN`: `Building` imports from here, so the arrow only goes one way.
 */
export const PALE_STONE = {
  variant: 'court',
  material: { color: new THREE.Color(2.5, 2.36, 2.1), roughness: 0.8 },
};

export const CANOPY: ReadonlyArray<{
  a: { variant: string; material: Record<string, unknown> };
  b: { variant: string; material: Record<string, unknown> };
}> = [
  {
    a: { variant: 'awnCream', material: { color: new THREE.Color(2.05, 1.94, 1.72), roughness: 0.94 } },
    b: { variant: 'awnIndigo', material: { color: new THREE.Color(0.78, 1.02, 1.5), roughness: 0.94 } },
  },
  {
    a: { variant: 'awnCream', material: { color: new THREE.Color(2.05, 1.94, 1.72), roughness: 0.94 } },
    b: { variant: 'awnRed', material: { color: new THREE.Color(1.6, 0.91, 0.8), roughness: 0.94 } },
  },
  {
    a: { variant: 'awnStraw', material: { color: new THREE.Color(1.95, 1.72, 1.31), roughness: 0.94 } },
    b: { variant: 'awnIndigo', material: { color: new THREE.Color(0.78, 1.02, 1.5), roughness: 0.94 } },
  },
  {
    a: { variant: 'awnStraw', material: { color: new THREE.Color(1.95, 1.72, 1.31), roughness: 0.94 } },
    b: { variant: 'awnRed', material: { color: new THREE.Color(1.6, 0.91, 0.8), roughness: 0.94 } },
  },
];
/**
 * As above but brighter: laundry, sheets, drying cloth.
 *
 * Not simply "more blue than the awning". The correction that neutralises the
 * olive under a warm sun over-corrects under skylight, where the incoming light
 * is already blue, and washing hung in a shaded courtyard then comes out mauve.
 * Held to the awning's channel ratio and just scaled up, it stays cotton in both.
 */
export const WASH_MAT = { color: new THREE.Color(4.15, 3.0, 3.6), roughness: 0.95 };
/**
 * The same cotton, for cloth that hangs *indoors*.
 *
 * `WASH_MAT` is scaled for a sheet on a roof with the sky behind it, where the
 * job is to stay legible against a background four stops brighter. Bring that
 * albedo inside, into a court whose floor is itself lifted so it can catch a
 * strip of sky, and the sheet has nowhere left to go: it saturates, and once it
 * saturates the fold shading — the only thing separating cloth from card — is
 * gone. Interior washing came back as a flat white rectangle hanging in the
 * middle of the court for exactly this reason. At about six tenths of the value
 * it is unbleached linen and it still has a light and a shadow side.
 */
export const LINEN_MAT = { color: new THREE.Color(2.5, 1.85, 2.2), roughness: 0.95 };

/**
 * Limewash, as an over-unity tint on the concrete and plaster materials.
 *
 * Kerbs and the bottom metre of every wall get painted white across the whole
 * region, and it is doing three jobs here at once. It is what the place actually
 * looks like; it draws two hard converging lines down a street that otherwise
 * has no leading lines at all; and because the market street runs north–south
 * and spends the morning in the shadow of its own east row, it is the only way
 * to get anything with tonal separation into the bottom half of the frame.
 */
export const LIME_MAT = { color: new THREE.Color(2.5, 2.42, 2.2), roughness: 0.86 };
export const LIME = { variant: 'lime', material: LIME_MAT };

/**
 * Weathered roof screed: the deck knocked back from the parapets standing on it.
 *
 * The overwatch shot is roughly forty per cent deck, thirty per cent parapet and
 * thirty per cent town, and with all three cut from the same concrete the frame
 * had no depth in it — near horizontal, near vertical and distant vertical all
 * landed within a few per cent of each other in value, so the parapet had no top
 * edge and the deck had no far edge.
 *
 * Knocking the deck back is also what the light actually does. The sun sits at
 * 26 degrees for this scenario: a horizontal surface collects sin(26°) = 0.44 of
 * the direct beam, a wall square to it collects cos(26°) = 0.90. A roof under a
 * low sun is genuinely about half the brightness of the walls above it, and the
 * warm bias is the bitumen and dust that ends up on any flat roof.
 */
/*
 * Cement screed: cooled, and no longer knocked back at all.
 *
 * The first version multiplied the deck by (0.44, 0.41, 0.375) to open up half a
 * stop between the roof and the parapets standing on it. That turned out to be
 * solving a problem the light already solves. Measured off a capture, the deck
 * comes out at luma 50 against the parapet's 134 with no tint applied, because
 * the sun sits at 26 degrees: a horizontal surface collects sin(26°) = 0.44 of
 * the beam and a wall square to it collects cos(26°) = 0.90, so the roof is
 * intrinsically 2.05x darker than what stands on it. Multiplying that by another
 * 0.44 is what produced the sheet of mud the overwatch shot came back as.
 *
 * What the deck did need was the warmth taken out. At (60, 51, 41) it measured
 * R:B 1.46 against the parapet's 1.20, and a warm dark grey next to a warm light
 * grey reads as earth rather than as cement. The blue lift here neutralises the
 * base map and leaves the value alone.
 */
export const SCREED_MAT = { color: new THREE.Color(1.0, 1.06, 1.22), roughness: 0.94 };
export const SCREED = { variant: 'screed', material: SCREED_MAT };

/**
 * Ground dressing that lies flat: sand ribs, dust films, wheel ruts, paint.
 *
 * These are excluded from the shadow passes. The scene is rasterised about
 * seven times a frame — once for the view, once per cascade — and a 40 mm rib
 * lying on the road produces a shadow no camera on this map can resolve, so
 * six sevenths of its cost buys nothing. There are several hundred of them.
 */
/**
 * Split reed matting: pale bleached straw, against the dark timber it lies on.
 *
 * The souk canopies kept coming back reading as bare pergolas, and probing the
 * frame showed three quarters of the overhead area was in fact covered — the mat
 * was there. It was invisible because it was emitted in `wood`, the same material
 * as the rafters carrying it, so a 35 mm slat and a 150 mm rafter were the same
 * colour and the eye had nothing to separate the covering from the frame. Reed
 * bleaches almost white in this sun and structural timber weathers dark, which is
 * both what the two things look like and the contrast the canopy needs to read as
 * a roof rather than a set of sticks.
 */
export const REED = {
  variant: 'reed',
  material: { color: new THREE.Color(2.05, 1.85, 1.42), roughness: 0.92 },
};

export const FLAT = { noShadow: true };

/**
 * Sun-bleached frond green: over-unity so the tint lifts rather than darkens.
 *
 * Shared rather than declared at each call site. The batch key includes a hash
 * of the override set, so two structurally identical objects written out twice
 * still land in one batch — but two that differ by a rounding in one channel
 * quietly become two draw calls, which is exactly what happened when the roof
 * planters were given their own copy of this.
 */
export const PALM = {
  variant: 'palm',
  material: { color: new THREE.Color(1.5, 1.62, 1.05), roughness: 0.86 },
};

/**
 * Spots a player stands and looks from, which set dressing keeps clear of.
 *
 * Not an arbitrary exemption list. A market fills every square metre it is
 * allowed to, and the generator will happily build a stall, a goods pitch and a
 * canopy post inside the same two metres — which is what turned the west footway
 * into an impassable thicket that the review camera was standing in the middle
 * of. Real markets leave the ground in front of a shop door clear, and level
 * designers leave the ground at a firing position clear, for the same reason:
 * somebody has to be able to stand there and see out.
 *
 * `r` is the radius kept free of anything above ankle height.
 */
export const VANTAGES: ReadonlyArray<{ x: number; z: number; r: number }> = [
  // West footway by the shopfronts — the alley overlook.
  { x: -13.5, z: 6, r: 3.6 },
  // Mid carriageway looking north to the arch.
  { x: 1.2, z: 34, r: 3.2 },
  // East gallery of the courtyard house.
  { x: -24, z: 2, r: 2.4 },
];

/** True within a vantage's clearance, grown by `pad`. */
export function nearVantage(x: number, z: number, pad = 0): boolean {
  for (const v of VANTAGES) {
    const r = v.r + pad;
    if ((x - v.x) * (x - v.x) + (z - v.z) * (z - v.z) < r * r) return true;
  }
  return false;
}
/** As `FLAT`, for the pale limewash used on kerbs and road markings. */
export const LIME_FLAT = { ...LIME, noShadow: true };
/** As `FLAT`, for roof-deck screed patches. */
export const SCREED_FLAT = { ...SCREED, noShadow: true };

/**
 * "Al-Rahim" — a two-block section of a North African border town.
 *
 * The layout is authored rather than random: a central market street with
 * long sightlines, two flanking alley routes, and elevated firing positions on
 * the roofs. Cover is placed on a roughly 8 m rhythm so a player can always
 * break line of sight within a second of being shot at, which is the single
 * most important thing a shooter map has to get right.
 *
 * Geometry is generated procedurally but deterministically, and every static
 * mesh is merged per-material into a handful of draw calls before being handed
 * to the BVH — a town's worth of individual boxes would otherwise cost more in
 * draw-call overhead than in pixels.
 */

export interface SpawnPoint {
  position: THREE.Vector3;
  yaw: number;
  team: 'player' | 'enemy';
}

export interface CoverPoint {
  position: THREE.Vector3;
  /** Direction the cover protects from. */
  normal: THREE.Vector3;
  /** Crouch-height cover can be shot over; full cover requires leaning. */
  height: 'low' | 'high';
  occupiedBy: number;
}

type MaterialOverrides = Parameters<MaterialLibrary['get']>[1];

interface BuildQueue {
  key: MaterialKey;
  geos: THREE.BufferGeometry[];
  surface: SurfaceKind;
  /** Extra material settings for this batch; see `push`. */
  material?: MaterialOverrides;
  /** Named so batch meshes can be told apart when reading a draw-call list. */
  variant?: string;
  /** Excluded from the shadow passes; see `push`. */
  noShadow?: boolean;
}

export class LevelSystem implements System {
  readonly name = 'level';
  readonly order = -60;

  materials!: MaterialLibrary;
  readonly root = new THREE.Group();
  readonly spawns: SpawnPoint[] = [];
  readonly coverPoints: CoverPoint[] = [];
  readonly navNodes: THREE.Vector3[] = [];
  /** Axis-aligned playable bounds; used to clamp AI and airstrike targeting. */
  readonly bounds = new THREE.Box3(
    new THREE.Vector3(-62, -4, -62),
    new THREE.Vector3(62, 40, 62),
  );

  private ctx!: EngineContext;
  private readonly queues = new Map<string, BuildQueue>();
  private readonly rng = new RNG(20240617);
  private readonly collisionMeshes: THREE.Mesh[] = [];
  /** Scratch for the capsule checks that validate spawns and nav nodes. */
  private readonly resolveOut = {
    grounded: false,
    groundNormal: new THREE.Vector3(0, 1, 0),
    surface: 'sand' as SurfaceKind,
    hitWall: false,
  };

  async init(ctx: EngineContext): Promise<void> {
    this.ctx = ctx;
    this.root.name = 'level';
    ctx.scene.add(this.root);

    this.materials = new MaterialLibrary(ctx.renderer);
    this.materials.init();

    const lighting = ctx.get<LightingSystem>('lighting');
    lighting?.applyPreset(SKY_PRESETS.desertMorning);

    this.buildGround();
    this.buildStreetGrid();
    this.buildBuildings();
    this.buildStreetEdges();
    this.buildStreetArch(48);
    this.buildPerimeter();
    this.buildGroundDressing();
    this.buildSoukShade();
    this.buildOverhead();

    buildProps(this, this.rng);
    // One flush for the whole map. Flushing between the shell and the props
    // doubled the batch count — every material used by both ended up as two
    // meshes, and each of those is a draw call in the main pass and in every
    // shadow cascade.
    this.flush();

    this.registerCollision();
    this.buildSpawnsAndCover();

    ctx.engine.pipeline.resetExposure(1.0);
  }

  // ------------------------------------------------------------ geometry ---

  /**
   * Queues a geometry to be merged into the batch for `key`.
   *
   * `variant` opens a second batch for the same material key, and `material`
   * tweaks that batch's shading — used for glass and interior finishes. Only
   * uniform-level overrides (colour, roughness, metalness, normal scale) are
   * safe here: anything structural, such as `transparent` or `side`, forces
   * another shader compile, and those cost seconds on a software rasteriser.
   *
   * `noShadow` moves the geometry into a batch that is skipped by the shadow
   * passes. The scene is drawn about seven times per frame — once for the view
   * and once per cascade — so a 30 mm patch lying on the road costs seven times
   * its triangle count to produce a shadow nothing can see. Use it for anything
   * flat on the ground, and never for anything that stands up.
   */
  push(
    key: MaterialKey,
    geometry: THREE.BufferGeometry,
    matrix: THREE.Matrix4,
    opts: {
      scale?: number; variant?: string; material?: MaterialOverrides; noShadow?: boolean;
    } = {},
  ): void {
    // The override set is part of the key, not just the variant name. Two call
    // sites that pass different colours under the same (or no) variant would
    // otherwise silently land in one batch and take whichever override was
    // queued first, which is a bug that only shows up as a wrongly tinted
    // object somewhere across the map.
    //
    // `opts.scale` is deliberately absent from the key. `flush` builds every
    // material at scale 1, so batches that differed only by it were compiling
    // the same material twice and costing a draw call each — texel density is
    // carried by the per-face UV scaling in `box`, not by the material.
    const id = `${key}|${opts.variant ?? ''}|${matSig(opts.material)}` +
      (opts.noShadow ? '|ns' : '');
    let q = this.queues.get(id);
    if (!q) {
      q = {
        key, geos: [], surface: 'concrete',
        material: opts.material, variant: opts.variant, noShadow: opts.noShadow,
      };
      this.queues.set(id, q);
    }
    const g = geometry.clone();
    g.applyMatrix4(matrix);
    // World-space triplanar-ish UVs: scale UVs by object size so texel density
    // is constant regardless of how big the piece is.
    q.geos.push(g);
  }

  /**
   * Box helper that generates per-face UVs scaled to world size, so a 12 m wall
   * and a 1 m crate built from the same material have identical texel density.
   */
  box(
    key: MaterialKey,
    w: number,
    h: number,
    d: number,
    matrix: THREE.Matrix4,
    tileMetres?: number,
    opts: { variant?: string; material?: MaterialOverrides; noShadow?: boolean } = {},
  ): void {
    if (w <= 1e-4 || h <= 1e-4 || d <= 1e-4) return;
    const geo = new THREE.BoxGeometry(w, h, d, 1, 1, 1);
    const tile = tileMetres ?? 4;
    const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
    // BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z (4 verts each).
    const dims: Array<[number, number]> = [
      [d, h], [d, h], [w, d], [w, d], [w, h], [w, h],
    ];
    for (let f = 0; f < 6; f++) {
      const [fw, fh] = dims[f];
      for (let i = 0; i < 4; i++) {
        const idx = f * 4 + i;
        uv.setXY(idx, uv.getX(idx) * (fw / tile), uv.getY(idx) * (fh / tile));
      }
    }
    uv.needsUpdate = true;
    this.push(key, geo, matrix, opts);
    geo.dispose();
  }

  /** Merges every queued geometry into one mesh per material. */
  flush(): void {
    for (const [, q] of this.queues) {
      if (q.geos.length === 0) continue;
      const merged = mergeGeometries(q.geos);
      for (const g of q.geos) g.dispose();
      if (!merged) continue;

      merged.computeBoundingBox();
      merged.computeBoundingSphere();

      const mat = this.materials.get(q.key, { scale: 1, ...q.material });
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = !q.noShadow;
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      mesh.name = q.variant ? `batch:${q.key}/${q.variant}` : `batch:${q.key}`;
      mesh.userData.surface = this.materials.surfaceKind(mat);
      this.root.add(mesh);
      this.collisionMeshes.push(mesh);
    }
    this.queues.clear();
  }

  private registerCollision(): void {
    const physics = this.ctx.get<PhysicsSystem>('physics');
    if (!physics) return;
    for (const m of this.collisionMeshes) {
      physics.addCollider(m, (m.userData.surface as SurfaceKind) ?? 'concrete');
    }
  }

  // -------------------------------------------------------------- ground ---

  private buildGround(): void {
    const size = 260;
    // 160, not 96.
    //
    // At 96 the quads are 2.7 m across, and the review could literally count the
    // triangles: "large flat facets at distinctly different values with hard
    // straight seams". That is not a shading problem, it is a sampling one — a
    // 2.7 m facet subtends about a degree and a half at ten metres, which is far
    // above the size at which the eye stops separating adjacent flat patches, and
    // no amount of texture detail hides a normal that is constant across one.
    // 1.6 m quads put the facet below that threshold from any camera in the map,
    // and the cost is 33 k triangles on a mesh that already casts no shadow.
    const segs = 160;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.getAttribute('position') as THREE.BufferAttribute;
    const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      // Keep the playable core flat and let the ground roll away at the edges,
      // which hides the map boundary without a visible wall. The profile itself
      // lives in `terrainY` so the placement passes can ask for it.
      pos.setY(i, terrainY(x, z));
      uv.setXY(i, (x / size) * (size / 6), (z / size) * (size / 6));
    }
    pos.needsUpdate = true;
    uv.needsUpdate = true;
    geo.computeVertexNormals();

    const mat = this.materials.get('sand', { scale: 1 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    mesh.name = 'terrain';
    mesh.userData.surface = 'sand';
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    this.root.add(mesh);
    this.collisionMeshes.push(mesh);
  }

  private buildStreetGrid(): void {
    const m = new THREE.Matrix4();
    const rng = this.rng;

    // ---- carriageways ----
    // Crowned, with a gutter dip at each edge. A perfectly flat road is one of
    // the loudest tells in a generated town: real tarmac sheds water, so it
    // always has a camber, and that camber is what produces the long specular
    // band down the street under a low sun.
    this.buildRoadSurface(-ROAD_HALF, ROAD_HALF, -54, 54, 0.02, 0.075, 10, 30);
    this.buildRoadSurface(-52, 52, CROSS_Z - CROSS_HALF, CROSS_Z + CROSS_HALF, 0.02, 0.06, 30, 8);

    // ---- pavements ----
    for (const sx of [-1, 1]) {
      this.buildPavementRun(sx * (ROAD_HALF + PAVE_W / 2), PAVE_W, -54, 54, sx);
      this.buildKerbRun(sx * ROAD_HALF, sx, -54, 54, 'z');
    }
    // Cross-street pavements, broken by the main street.
    for (const sz of [-1, 1]) {
      const inner = CROSS_Z + sz * CROSS_HALF;
      for (const side of [-1, 1]) {
        const x0 = side < 0 ? -52 : ROAD_HALF + PAVE_W;
        const x1 = side < 0 ? -(ROAD_HALF + PAVE_W) : 52;
        m.makeTranslation((x0 + x1) / 2, 0.08, inner + sz * PAVE_W * 0.42);
        this.box('concreteFloor', x1 - x0, 0.16, PAVE_W * 0.84, m, 3);
      }
    }

    // ---- kerb ramps where the streets meet, so the junction reads ----
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const geo = prism([[0, 0], [1.6, 0], [1.6, 0.16], [0, 0.16]], 1.2, 2.0, 'x');
        m.makeTranslation(sx * (ROAD_HALF + 0.8), 0.08, CROSS_Z + sz * (CROSS_HALF + 0.6));
        this.push('concreteFloor', geo, m);
        geo.dispose();
      }
    }

    // ---- the souk apron ----
    //
    // North of z = 26 the tarmac has gone under compacted earth. Half of this is
    // a tonal decision and half of it is what the place is: a street this is used
    // as a market five days a week does not keep its surface, and the traders and
    // the wind between them turn it into packed dirt within a decade.
    //
    // The tonal half is decisive. The main street camera stands at z = 34 looking
    // north into the arch, so the near sixteen metres of frame is carriageway in
    // the shadow of the east row all morning. Asphalt at 0.15 reflectance lit by
    // sky alone renders as an undifferentiated near-black field across the bottom
    // of the shot; the same surface in packed earth and sand at 0.35 to 0.5 has
    // tone, and the wheel ruts, kerb line and camber in it become readable.
    {
      const apron = new THREE.PlaneGeometry(ROAD_HALF * 2, 30, 12, 14);
      apron.rotateX(-Math.PI / 2);
      const pos = apron.getAttribute('position') as THREE.BufferAttribute;
      const uv = apron.getAttribute('uv') as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const lx = pos.getX(i);
        const lz = pos.getZ(i);
        const t = lx / ROAD_HALF;
        // Keeps the road's camber, plus a slow undulation from being driven over.
        //
        // Sat 55 mm proud of the tarmac it covers. At the original height the
        // apron crown was 85 mm and the tarmac crown underneath it 95 mm, so the
        // whole surface was *below* the road it was supposed to have buried and
        // the depth buffer threw almost all of it away — which is why four review
        // captures in a row came back with a near-black foreground on a street
        // this apron exists to lighten. Standing it clear also gives the leading
        // edge a real 55 mm step for the light to catch.
        pos.setY(
          i,
          0.075 + 0.075 * (1 - t * t) + Math.sin(lx * 0.7) * Math.cos(lz * 0.5) * 0.03,
        );
        uv.setXY(i, lx / 5, lz / 5);
      }
      pos.needsUpdate = true;
      uv.needsUpdate = true;
      apron.computeVertexNormals();
      m.makeTranslation(0, 0, 40);
      this.push('dirt', apron, m);
      apron.dispose();
      // The ragged leading edge where the earth gives out and the tarmac starts
      // again: a run of small wedges with the fill spilling over them, so the
      // 55 mm step is a broken line rather than a straight one across the road.
      for (let i = 0; i < 22; i++) {
        const ex = -ROAD_HALF + (i / 21) * ROAD_HALF * 2;
        const ez = APRON_Z0 + rng.range(-0.5, 0.9);
        const ew = ROAD_HALF * 2 / 20 * rng.range(0.8, 1.5);
        const geo = prism(driftProfile(rng.range(0.7, 1.5), rng.range(0.1, 0.2)), ew, 3.0, 'x');
        m.compose(
          new THREE.Vector3(ex, groundY(ex, APRON_Z0 + 2) - 0.09, ez),
          new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI),
          new THREE.Vector3(1, 1, 1),
        );
        this.push(rng.next() < 0.7 ? 'sand' : 'dirt', geo, m);
        geo.dispose();
      }
      // Sand on the apron, as longitudinal ridges rather than patches.
      //
      // Patches were wrong here for a reason worth recording. The street camera's
      // eye is 3.3 m up, so it looks down on this surface at twenty to thirty
      // degrees; at that incidence a 120 mm drift with a two-metre footprint
      // presents its *top* to the lens, and a top is a flat quad with a hard
      // outline. Ten of them across the near carriageway read as pale cards
      // dropped on the floor, which is what four consecutive review captures
      // showed. A ridge 400 mm wide and four metres long has almost the same
      // volume of sand in it and behaves completely differently: it is seen
      // end-on, one flank faces the sun and the other does not, and it runs the
      // way the traffic does — so it reads as drift *and* it gives the shot
      // another set of lines converging on the arch.
      // Sheets of sand over the near half, where the frame needs the reflectance.
      //
      // Measured off the review capture, the packed earth of this apron comes out
      // at luma 9 in the twelve metres nearest the street camera — the bottom
      // fifth of that frame carries no information at all. It is not a lighting
      // fault: the street runs north-south, the sun is low in the east, and the
      // whole carriageway is behind the east row all morning. The only lever
      // available from here is reflectance, and dry sand measures three times
      // what packed earth does, so a broad cover of it takes that ground from
      // luma 9 to about 27 — dark, which is correct, but readable.
      //
      // Laid as wide low sheets rather than the ridges further up: a ridge is the
      // right shape when the point is to catch a raking light on one flank, but
      // here there is no direct light to catch and what is wanted is area.
      // Overlapping along the street, not spaced along it. The first attempt
      // stepped nine fields 2.1 m apart and gave each a 2.2 to 4.0 m depth, so
      // between consecutive fields there were bands of bare earth a metre or two
      // wide — and probing the frame afterwards showed the near ground was still
      // landing on `dirt` at luma 13. Deeper fields on a shorter step overlap
      // instead, which is also how drift actually lies: continuous, with the
      // thickness varying rather than the coverage.
      for (let i = 0; i < 13; i++) {
        const sz = 27 + i * 1.55 + rng.range(-0.5, 0.5);
        this.sandField(
          rng.range(-4.0, 4.0), sz,
          rng.range(5.5, 9.5), rng.range(3.4, 5.2),
          0.03, 3, groundY(0, sz) + 0.006,
        );
      }
      for (let i = 0; i < 16; i++) {
        const rz = APRON_Z0 + 1.5 + rng.range(0, 27);
        const rx = rng.range(-6.4, 6.4);
        const rl = rng.range(2.4, 6.0);
        const rw = rng.range(0.22, 0.52);
        const geo = prism(
          duneProfile(rw, rng.range(0.06, 0.14), rng.range(0.35, 0.6)), rl, 2.0, 'z',
        );
        m.compose(
          new THREE.Vector3(rx, groundY(rx, rz) + 0.005, rz),
          new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0), rng.range(-0.16, 0.16),
          ),
          new THREE.Vector3(1, 1, 1),
        );
        this.push('sand', geo, m, FLAT);
        geo.dispose();
      }
      // Where drift has banked against something standing it does spread, so a
      // few short cross-ridges at the ends of the long ones stop the set reading
      // as combed.
      for (let i = 0; i < 7; i++) {
        const rz = APRON_Z0 + 2 + rng.range(0, 26);
        const rx = rng.range(-6.0, 6.0);
        const geo = prism(
          driftProfile(rng.range(0.6, 1.1), rng.range(0.07, 0.13)), rng.range(0.9, 1.8), 2.0, 'x',
        );
        m.compose(
          new THREE.Vector3(rx, groundY(rx, rz) + 0.005, rz),
          new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0), rng.range(0, 6.28),
          ),
          new THREE.Vector3(1, 1, 1),
        );
        this.push('sand', geo, m, FLAT);
        geo.dispose();
      }
      // Wheel ruts. A vehicle track wanders: nobody drives a thirty-metre
      // straight line down a dirt street, and two dead-parallel stripes at a
      // constant gauge were reading as painted lane markings rather than as
      // something worn by use. Steering the pair along a slow curve, with each
      // rut jittering about it and going out for a stretch here and there, is
      // what turns them back into a track — and it is the only element on the
      // apron that gives the eye the road's direction.
      const gauge = 1.15;
      for (const side of [-1, 1]) {
        for (let i = 0; i < 13; i++) {
          const z = 26 + i * 2.3;
          if (rng.next() < 0.3) continue;
          // Shared wander, so both ruts of the pair swing together.
          const wander = Math.sin(z * 0.11 + 0.7) * 1.5 + Math.sin(z * 0.31) * 0.4;
          const seg = 2.3 * rng.range(0.62, 0.98);
          const yaw = Math.cos(z * 0.11 + 0.7) * 0.11 * 1.5;
          const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -yaw);
          const rx = side * gauge + wander + rng.range(-0.1, 0.1);
          m.compose(
            new THREE.Vector3(rx, groundY(rx, z + 1.15) + 0.02, z + 1.15),
            q, new THREE.Vector3(1, 1, 1),
          );
          const geo = patchDisc(
            rng.range(0.2, 0.31), seg / 2, 0.03, () => rng.next(),
            { sides: 8, wobble: 0.28, shoulder: 0.66, tile: 2.0 },
          );
          this.push('rubble', geo, m, FLAT);
          geo.dispose();
        }
      }
    }

    // ---- road markings ----
    //
    // Worth more here than anywhere else on the map. The market street runs
    // north–south and spends the whole morning in the shadow of its own east
    // row, so the fourteen metres of carriageway that fills the bottom of every
    // street shot is lit by sky alone, on the darkest material in the library.
    // Two painted edge lines and a broken centre line put three bright,
    // converging lines through exactly that region — which fixes the tone and,
    // because they all converge on the arch, gives the composition the leading
    // lines a straight road otherwise refuses to provide.
    //
    // Laid as separate segments with gaps and misses so the line is worn rather
    // than drawn, and lifted 15 mm clear of the camber so it does not z-fight.
    for (const [at, w2, dash, gap] of [
      [-ROAD_HALF + 0.85, 0.14, 3.4, 0.0],
      [ROAD_HALF - 0.85, 0.14, 3.4, 0.0],
      [0, 0.16, 2.6, 2.4],
    ] as Array<[number, number, number, number]>) {
      // Stops at the apron: there is no paint left where there is no tarmac.
      let z = -52;
      while (z < 24) {
        const seg = dash * rng.range(0.85, 1.05);
        // Whole stretches have worn away; a continuous line reads as a decal.
        if (rng.next() > 0.22) {
          // Follows the camber, so the paint sits on the road rather than
          // floating over the crown of it.
          const t = Math.abs(at) / ROAD_HALF;
          const y = 0.02 + 0.075 * (1 - t * t) + (t > 0.84 ? -0.05 * (t - 0.84) / 0.16 : 0);
          m.makeTranslation(at + rng.range(-0.04, 0.04), y + 0.012, z + seg / 2);
          this.box('concreteFloor', w2, 0.024, seg, m, 1.4, LIME_FLAT);
        }
        z += seg + gap + rng.range(0, 0.5);
      }
    }
    // Crossing bars at the junction: a ladder of bright rungs across the road,
    // which is the one place a shadowed carriageway gets a strong horizontal.
    for (const sz of [-1, 1]) {
      const zc = CROSS_Z + sz * (CROSS_HALF + 1.6);
      for (let i = 0; i < 11; i++) {
        if (rng.next() < 0.18) continue;
        const bx = -ROAD_HALF + 0.9 + i * ((ROAD_HALF * 2 - 1.8) / 10);
        const t = Math.abs(bx) / ROAD_HALF;
        const y = 0.02 + 0.075 * (1 - t * t);
        m.makeTranslation(bx, y + 0.012, zc);
        this.box('concreteFloor', 0.46, 0.024, 2.3, m, 1.4, LIME_FLAT);
      }
    }

    // ---- gutter ironmongery ----
    for (let i = -4; i <= 4; i++) {
      for (const sx of [-1, 1]) {
        const z = i * 11 + rng.range(-1.5, 1.5);
        m.makeTranslation(sx * (ROAD_HALF - 0.45), 0.055, z);
        this.box('corrugated', 0.62, 0.05, 0.62, m, 0.8, FLAT);
        m.makeTranslation(sx * (ROAD_HALF - 0.45), 0.035, z);
        this.box('concrete', 0.78, 0.05, 0.78, m, 1.0, FLAT);
      }
    }

    // ---- failed patches: where the surface has been dug up and never made good
    // Deliberately weighted towards the pale materials. Tarmac is the darkest
    // thing in the library and half the street is in shade, so a road built out
    // of nothing but asphalt has no tonal range at all where it matters.
    for (let i = 0; i < 20; i++) {
      const onMain = rng.next() < 0.66;
      const px = onMain ? rng.range(-ROAD_HALF + 1, ROAD_HALF - 1) : rng.range(-46, 46);
      // Only where there is tarmac to have failed: north of the apron edge the
      // surface is packed earth and a concrete patch in it makes no sense.
      const pz = onMain ? rng.range(-50, 23) : CROSS_Z + rng.range(-CROSS_HALF + 1, CROSS_HALF - 1);
      const py = groundY(px, pz) - 0.02;
      const pw = rng.range(1.2, 2.9);
      const pd = rng.range(1.0, 2.4);
      const r = rng.next();
      // No dirt: on an unlit carriageway it goes to near-black, and a black
      // rectangle with straight edges lying in the road is worse than no patch.
      const key: MaterialKey = r < 0.55 ? 'concreteFloor' : r < 0.78 ? 'concrete' : 'rubble';
      // Laid as three or four overlapping lobes rather than one rectangle. A
      // road patch has the outline of the hole somebody dug, and a hole dug with
      // a breaker is never square.
      //
      // Overlapping *boxes* were the first attempt at that and they did not work:
      // the union of four rectangles is still a shape whose boundary is sixteen
      // straight lines meeting at right angles, and every one of those lines has
      // a 60 mm vertical rim under it drawing itself in shadow. From the street
      // camera the near carriageway came back as a scatter of pale cards with
      // ruled edges lying on the road — the review's "large flat plates at
      // different values with straight seams between them", and it is the rim
      // that does it rather than the outline. A disc with a jittered perimeter
      // and no vertical face at all has nothing for the eye to catch: the edge
      // tapers into the surface over 150 mm, so the patch reads as part of the
      // road rather than as something laid on top of it. It is also cheaper than
      // the box it replaces.
      const slabs = rng.int(2, 3);
      for (let k = 0; k < slabs; k++) {
        const sw = pw * rng.range(0.6, 1.0);
        const sd = pd * rng.range(0.6, 1.0);
        const q = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0), rng.range(-0.45, 0.45),
        );
        m.compose(
          new THREE.Vector3(
            px + rng.range(-(pw - sw) / 2, (pw - sw) / 2),
            py,
            pz + rng.range(-(pd - sd) / 2, (pd - sd) / 2),
          ),
          q, new THREE.Vector3(1, 1, 1),
        );
        const geo = patchDisc(sw / 2, sd / 2, 0.055, () => rng.next(), {
          sides: 11, wobble: 0.42, shoulder: 0.6, tile: 2.5,
        });
        this.push(key, geo, m, FLAT);
        geo.dispose();
      }
      // Spoil left round the edge, which is what makes a patch read as a patch
      // rather than as a change of texture, and further breaks the outline.
      // Loose stone rather than more flat chips: the whole point of the spoil is
      // that it is the one thing round here with a broken surface. Set round the
      // rim, where a shovel would have thrown it, so it also breaks the outline.
      const heaps = rng.int(4, 6);
      for (let k = 0; k < heaps; k++) {
        const a = (k / heaps) * Math.PI * 2 + rng.range(-0.5, 0.5);
        m.makeTranslation(
          px + (Math.cos(a) * pw) / 2 * rng.range(0.8, 1.15),
          py + 0.03,
          pz + (Math.sin(a) * pd) / 2 * rng.range(0.8, 1.15),
        );
        const spoil = gravelBed(
          rng.range(0.5, 0.9), rng.range(0.4, 0.8), 0.05, rng.int(9, 16), () => rng.next(),
        );
        this.push(r < 0.42 ? 'concrete' : 'rubble', spoil, m, FLAT);
        spoil.dispose();
      }
    }

    // ---- dust and grit tracked over the pavements ----
    // The pavements are shaded twice over, by the building line and again by the
    // awnings above them, so they need the pale cover even more than the road.
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 17; i++) {
        const z = -52 + i * 6.3 + rng.range(-2.2, 2.2);
        this.sandField(
          sx * (ROAD_HALF + PAVE_W / 2 + rng.range(-1.2, 1.0)),
          z,
          rng.range(1.6, PAVE_W),
          rng.range(1.8, 4.2),
          0.035,
          2,
          0.16,
        );
      }
      // Grit swept into the angle at the back of the footway and along the kerb.
      //
      // The pavement is 4.2 m of poured concrete running the length of the map
      // and it is directly under the camera in the alley shot, so it is the
      // single largest near-field horizontal on the map — and a proud joint
      // every 1.26 m is a line drawn on a plane, not relief. What collects
      // against a wall or a kerb is loose stone, and loose stone at 40 mm is a
      // few hundred small shadows, which is the one thing that survives being
      // looked at along a 5-degree sightline.
      for (let i = 0; i < 26; i++) {
        const z = -52 + i * 4.1 + rng.range(-1.4, 1.4);
        const atWall = rng.next() < 0.55;
        const gx = sx * (atWall
          ? ROAD_HALF + PAVE_W - rng.range(0.25, 0.8)
          : ROAD_HALF + rng.range(0.2, 0.7));
        const gl = rng.range(1.3, 3.4);
        const gw = rng.range(0.3, 0.7);
        m.makeTranslation(gx, 0.175, z);
        const bed = patchDisc(
          gw / 2, gl / 2, 0.02, () => rng.next(),
          { sides: 9, wobble: 0.4, shoulder: 0.45, tile: 1.8 },
        );
        this.push('dirt', bed, m, FLAT);
        bed.dispose();
        m.makeTranslation(gx, 0.182, z);
        const grit = gravelBed(gw, gl, 0.04, Math.round(gl * gw * 30), () => rng.next());
        this.push('rubble', grit, m, FLAT);
        grit.dispose();
      }
    }

    // ---- dirt side lanes and the yards behind the blocks ----
    for (const x of [-36, 36]) {
      m.makeTranslation(x, 0.015, 6);
      this.box('dirt', 9, 0.03, 84, m, 5);
    }
    m.makeTranslation(0, 0.014, 44);
    this.box('dirt', 26, 0.028, 14, m, 5);
  }

  /**
   * A road as a crowned surface grid rather than a slab. `crown` is the rise at
   * the centreline; the last tenth of the width dips into a gutter.
   */
  private buildRoadSurface(
    x0: number,
    x1: number,
    z0: number,
    z1: number,
    y: number,
    crown: number,
    segsX: number,
    segsZ: number,
  ): void {
    const w = x1 - x0;
    const d = z1 - z0;
    const geo = new THREE.PlaneGeometry(w, d, segsX, segsZ);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.getAttribute('position') as THREE.BufferAttribute;
    const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
    const alongX = w > d;
    for (let i = 0; i < pos.count; i++) {
      const lx = pos.getX(i);
      const lz = pos.getZ(i);
      // Across-road parameter in [-1, 1].
      const t = alongX ? (lz / (d / 2)) : (lx / (w / 2));
      const a = Math.abs(t);
      const camber = crown * (1 - a * a);
      const gutter = a > 0.84 ? -0.05 * (a - 0.84) / 0.16 : 0;
      const settle = Math.sin(lx * 0.19) * Math.cos(lz * 0.16) * 0.022;
      pos.setY(i, y + camber + gutter + settle);
      uv.setXY(i, (lx + x0 + w / 2) / 5, (lz + z0 + d / 2) / 5);
    }
    pos.needsUpdate = true;
    uv.needsUpdate = true;
    geo.computeVertexNormals();
    const m = new THREE.Matrix4().makeTranslation((x0 + x1) / 2, 0, (z0 + z1) / 2);
    this.push('asphalt', geo, m);
    geo.dispose();
  }

  /**
   * A run of separate kerb stones with joints, not one continuous rail.
   *
   * The paint is applied stone by stone rather than as a stripe on top, and it
   * runs out in patches, which is how a kerb that was last done for a visit
   * fifteen years ago looks. It also means the bright line is broken, and a
   * broken line reads as a painted kerb where a continuous one reads as a decal.
   */
  private buildKerbRun(at: number, outward: number, from: number, to: number, axis: 'x' | 'z'): void {
    const stoneLen = 0.92;
    const n = Math.floor((to - from) / stoneLen);
    const m = new THREE.Matrix4();
    // Whitewash comes and goes in stretches, not stone by stone.
    let painted = this.rng.next() < 0.6;
    let runLeft = this.rng.int(3, 11);
    for (let i = 0; i < n; i++) {
      const t = from + stoneLen * (i + 0.5);
      const r = this.rng.next();
      // Occasionally a stone is missing or has been shunted out of line.
      if (r < 0.035) continue;
      const h = r < 0.1 ? 0.13 : 0.185;
      const skew = r < 0.16 ? this.rng.range(-0.05, 0.05) : 0;
      const profile = kerbProfile(0.3, h);
      const geo = prism(profile, stoneLen * 0.97, 1.6, axis === 'z' ? 'x' : 'z');
      if (axis === 'z') m.makeTranslation(at + outward * (0.15 + skew), 0.0, t);
      else m.makeTranslation(t, 0.0, at + outward * (0.15 + skew));
      this.push('concrete', geo, m, painted ? LIME : undefined);
      geo.dispose();
      if (--runLeft <= 0) {
        painted = !painted;
        runLeft = painted ? this.rng.int(5, 16) : this.rng.int(2, 7);
      }
    }
  }

  /**
   * A pavement laid as individual flags rather than as one slab.
   *
   * The east pavement used to be a single 4.2 x 108 m box, and an art review put
   * a number on what that costs: forty per cent of the alley frame at over 200
   * luminance with, in their words, essentially zero texture — "the surface that
   * looks most like an untextured default material of anything in the set". They
   * were describing a plane. One quad, one normal, one value, from the camera to
   * the horizon, and no amount of texture can help because at that incidence the
   * texture is inside its own mip tail.
   *
   * What fixes a horizontal is the same thing that fixed the roof decks: give it
   * construction. Each flag here is a separate box with its own cross-fall to the
   * gutter, its own height off the sub-base and its own material, so a metre of
   * pavement carries a joint, a value step and a normal step. The cross-fall is
   * doing most of the work — two degrees is nothing to walk on, but it turns one
   * blown-out plane into a run of facets that each meet the sun differently.
   *
   * Mixed keys instead of tinted variants: `concrete`, `asphalt` and `rubble` are
   * already batched for other things, so a trench patch and a broken flag cost
   * triangles and no draw calls. That is also just what a pavement in a town like
   * this is — laid once, then dug up by whoever needed the water main.
   */
  private buildPavementRun(cx: number, width: number, from: number, to: number, kerbSide: number): void {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3(1, 1, 1);
    const zAxis = new THREE.Vector3(0, 0, 1);
    const rng = this.rng;
    const flagLen = 1.22;
    const n = Math.floor((to - from) / flagLen);

    for (let i = 0; i < n; i++) {
      const z = from + flagLen * (i + 0.5);
      const r = rng.next();
      // Trench patches and broken flags come in short runs, which is how they
      // actually occur — nobody digs up one flag.
      const key: MaterialKey = r < 0.1 ? 'asphalt' : r < 0.17 ? 'rubble' : r < 0.34 ? 'concrete' : 'concreteFloor';
      // Cross-fall to the gutter, plus a little scatter so the run of facets is
      // not itself a repeating pattern.
      const fall = kerbSide * (0.026 + rng.next() * 0.026);
      const lift = r < 0.17 ? rng.range(-0.045, -0.012) : rng.range(-0.012, 0.022);
      q.setFromAxisAngle(zAxis, fall);
      p.set(cx + rng.range(-0.02, 0.02), 0.08 + lift, z);
      m.compose(p, q, s);
      const geo = boxGeo(width - 0.05, 0.16, flagLen - rng.range(0.03, 0.07), 2.2);
      this.push(key, geo, m);
      geo.dispose();

      // Recessed joint: a thin dark box dropped into the gap between flags. A
      // proud joint was tried first and it reads as a raised rib, which is the
      // opposite of what a jointed pavement looks like at a grazing angle.
      m.makeTranslation(cx, 0.135 + lift, z + flagLen / 2);
      this.box('concrete', width - 0.05, 0.05, 0.09, m, 1.0, FLAT);
    }

    // Longitudinal joint, two thirds of the way out, and the strip of grit that
    // always collects along the back of a pavement against the building line.
    m.makeTranslation(cx + kerbSide * (width * 0.18), 0.165, (from + to) / 2);
    this.box('concrete', 0.08, 0.05, to - from, m, 1.0, FLAT);
  }

  // ----------------------------------------------------------- buildings ---

  /**
   * The building line.
   *
   * Hand-authored rather than scattered: the two rows facing the market street
   * are set so their front walls land on `FRONT_X`, and heights alternate so no
   * two neighbours share a roofline. Two of these are dimensioned around the
   * review cameras — the block at (-22, 26) carries a roof deck at 7.36 m for
   * the overwatch shot, and the one at (-24, 2) has a 4.3 m shop storey so the
   * interior shot has headroom and clerestory light.
   */
  private buildBuildings(): void {
    const specs: BuildingSpec[] = [
      // ---- west side of the market street ----
      {
        cx: -22, cz: -40, w: 16, d: 14, floors: 2, style: 0, front: 'east',
        groundH: 3.6, upperH: 3.0, shopfront: true, arches: true, balconies: true,
        interior: 'apartment', unfinished: true, detail: 'lite',
      },
      {
        cx: -22, cz: -22, w: 16, d: 12, floors: 3, style: 1, front: 'east',
        groundH: 3.5, upperH: 2.95, shopfront: true, balconies: true, damage: 0.55,
        interior: 'ruin', setback: 3.0, lightShaft: [2.5, 1.0],
      },
      {
        cx: -24, cz: 2, w: 20, d: 18, floors: 2, style: 0, front: 'east',
        groundH: 4.3, upperH: 3.2, shopfront: true, arches: true, mashrabiya: true,
        balconies: true, interior: 'shop', externalStair: true, stairSide: 'north',
        // Sized and placed so the interior review camera stands in the east
        // gallery looking across the court through the arcade. Wide for its
        // depth on purpose: a 6 m court between 7.5 m walls sees so little sky
        // that its floor goes black, which put a void across the bottom of the
        // frame no amount of pale paving could lift.
        courtyard: [-5.0, -0.5, 7.0, 9.0],
        // The gallery the review camera stands in. Its colonnade is 1.3 m from
        // the eye, which is too close for an arch ring to read as one.
        courtOpen: 'east',
      },
      {
        // Roof deck lands at 0.24 + 7.0 + 0.12 = 7.36 m for the overwatch shot.
        cx: -22, cz: 26, w: 16, d: 16, floors: 2, style: 2, front: 'east',
        groundH: 3.9, upperH: 3.1, shopfront: true, balconies: true,
        interior: 'apartment', unfinished: true, externalStair: true, stairSide: 'north',
      },
      {
        cx: -22, cz: 46, w: 16, d: 12, floors: 2, style: 1, front: 'east',
        groundH: 3.5, upperH: 3.05, shopfront: true, arches: true, interior: 'shop',
      },

      // ---- east side ----
      {
        cx: 22, cz: -42, w: 18, d: 14, floors: 3, style: 1, front: 'west',
        groundH: 3.5, upperH: 2.9, shopfront: true, balconies: true, interior: 'apartment',
        detail: 'lite',
      },
      {
        cx: 22, cz: -22, w: 14, d: 12, floors: 2, style: 2, front: 'west',
        groundH: 3.4, upperH: 3.0, damage: 0.7, interior: 'ruin', unfinished: true,
        lightShaft: [-1.5, 2.0],
      },
      {
        // The tall block that anchors the view across the market.
        cx: 24, cz: 4, w: 20, d: 20, floors: 4, style: 0, front: 'west',
        groundH: 3.9, upperH: 3.1, shopfront: true, arches: true, mashrabiya: true,
        balconies: true, interior: 'apartment', setback: 3.5,
      },
      {
        cx: 22, cz: 30, w: 16, d: 18, floors: 2, style: 1, front: 'west',
        groundH: 3.6, upperH: 3.0, shopfront: true, balconies: true, interior: 'shop',
        externalStair: true, stairSide: 'south',
      },
      {
        cx: 22, cz: 50, w: 14, d: 12, floors: 3, style: 2, front: 'west',
        groundH: 3.4, upperH: 2.95, damage: 0.3, interior: 'apartment', unfinished: true,
      },

      // ---- outer blocks, flanking the dirt lanes ----
      {
        cx: -46, cz: -12, w: 14, d: 16, floors: 2, style: 2, front: 'east',
        groundH: 3.5, upperH: 3.0, damage: 0.4, interior: 'ruin', detail: 'lite',
      },
      {
        cx: -46, cz: 18, w: 14, d: 14, floors: 3, style: 0, front: 'east',
        groundH: 3.4, upperH: 2.9, arches: true, balconies: true, interior: 'apartment',
        unfinished: true, detail: 'lite',
      },
      {
        cx: 46, cz: -8, w: 16, d: 18, floors: 3, style: 1, front: 'west',
        groundH: 3.5, upperH: 2.95, balconies: true, interior: 'apartment', detail: 'lite',
      },
      {
        cx: 46, cz: 24, w: 14, d: 14, floors: 2, style: 2, front: 'west',
        groundH: 3.5, upperH: 3.0, damage: 0.25, interior: 'ruin', unfinished: true,
        detail: 'lite',
      },
    ];

    for (const spec of specs) buildBuilding(this, spec, this.rng);
  }

  /**
   * A *sabat* — a room bridged over the street on a segmental arch.
   *
   * This is the composition device the map was missing. It gives the main
   * sightline a proscenium: near ground, arch, then the gate and the skyline
   * beyond, which is three depth layers where before there was one.
   */
  private buildStreetArch(z: number): void {
    const m = new THREE.Matrix4();
    const rng = this.rng;
    const depth = 3.4;
    const pierW = 1.5;
    const pierIn = ROAD_HALF - 0.05;
    // Springing sits above head height and the crown just clips the top of the
    // frame from down the street, so the arch reads as a proscenium around the
    // gate rather than a lid over it.
    const springY = 5.2;
    const rise = 3.6;

    // ---- piers ----
    for (const sx of [-1, 1]) {
      const cx = sx * (pierIn + pierW / 2);
      m.makeTranslation(cx, springY / 2 + 0.1, z);
      this.box('plaster', pierW, springY, depth, m, 4.5);
      // Base course and impost band, both projecting.
      m.makeTranslation(cx, 0.35, z);
      this.box('concrete', pierW + 0.26, 0.7, depth + 0.26, m, 3);
      m.makeTranslation(cx, springY + 0.02, z);
      this.box('concrete', pierW + 0.3, 0.26, depth + 0.3, m, 3);
      // Buttress spurs down each side.
      for (const sz of [-1, 1]) {
        const g = prism(
          [[0, 0], [0.4, 0], [0, 2.1]],
          pierW * 0.8, 2.4, 'x',
        );
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), sz > 0 ? 0 : Math.PI);
        m.compose(
          new THREE.Vector3(cx, 0.7, z + sz * (depth / 2)),
          q, new THREE.Vector3(1, 1, 1),
        );
        this.push('plaster', g, m);
        g.dispose();
      }
    }

    // ---- arch barrel, in courses, so the soffit steps ----
    const slices = 7;
    const ellipse = (y: number): number => {
      const t = THREE.MathUtils.clamp((y - springY) / rise, 0, 1);
      return pierIn * Math.sqrt(Math.max(0, 1 - t * t));
    };
    for (let i = 0; i < slices; i++) {
      const y0 = springY + (rise * i) / slices;
      const y1 = springY + (rise * (i + 1)) / slices;
      const half = ellipse((y0 + y1) / 2);
      const segW = pierIn + pierW - half;
      if (segW > 0.02) {
        for (const sx of [-1, 1]) {
          m.makeTranslation(sx * (half + segW / 2), (y0 + y1) / 2, z);
          this.box('plaster', segW, y1 - y0, depth, m, 4.5);
        }
      }
    }
    // One voussoir ring through the whole barrel, projecting either face.
    // Keystoned. This is the arch the street shot is composed around, so it is
    // the one place on the map where the crown of a ring is looked straight at
    // from twenty metres with nothing in front of it.
    const ring = archRing(pierIn, rise, {
      stones: 17, thickness: 0.42, depth: depth + 0.18, jitter: 0.07,
      joint: 0.075, tile: 1.6, keystone: 0.26, stagger: 0.055, rand: () => rng.next(),
    });
    m.makeTranslation(0, springY, z);
    this.push('concrete', ring, m);
    ring.dispose();

    // Label course over the extrados, in short lengths that follow the curve.
    //
    // The ring on its own dies into the wall above it, and a voussoir arch is read
    // as much by the line *over* the stones as by the stones — it is what stops the
    // spandrel masonry running straight into the arc. Eleven short blocks set to
    // the tangent is enough at this radius, and the outer corner of each one picks
    // up the sun a good half-stop above the wall behind it.
    for (let i = 0; i < 11; i++) {
      const a = Math.PI * ((i + 0.5) / 11);
      const rr = 0.5;
      const hx = -(pierIn + 0.42 + rr * 0.5) * Math.cos(a);
      const hy = springY + (rise + 0.42 + rr * 0.5) * Math.sin(a);
      const q2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), a - Math.PI / 2);
      m.compose(new THREE.Vector3(hx, hy, z), q2, new THREE.Vector3(1, 1, 1));
      const blk = boxGeo(0.62, 0.22, depth + 0.3, 1.4);
      this.push('concrete', blk, m);
      blk.dispose();
    }
    // Impost blocks at the springing, either side, both faces.
    for (const sx of [-1, 1]) {
      m.makeTranslation(sx * (pierIn + 0.1), springY - 0.16, z);
      this.box('concrete', 0.7, 0.3, depth + 0.42, m, 1.6);
      m.makeTranslation(sx * (pierIn + 0.06), springY - 0.4, z);
      this.box('concrete', 0.6, 0.14, depth + 0.3, m, 1.2);
    }

    // ---- the gate name board ----
    //
    // A gate carries writing, and this arch is both the map's hero asset and the
    // exact centre of the main street shot — so it is the highest-value square
    // metre on the map for the two notes reviews keep making about identity: that
    // the town has "no signage, no Arabic text", and that what signage it has is
    // "an illegible smudge".
    //
    // Both the size and the position here are corrections. The previous pass hung
    // four 1.9 x 0.92 m plaques off `pierIn * 0.62`, which is *inside* the barrel:
    // at that height the intrados is out at 5.77 m and the plaques were at 4.55 m,
    // so they were floating in the opening with the ring curving past behind them.
    // They also measured 52 x 22 px in the street frame — 37 mm to a pixel, making
    // the 74 mm strokes two pixels wide, which is a texture, not writing.
    //
    // So: one board per face instead, big, and fixed to the solid apron under the
    // screened bays over the passage, where there is wall behind every part of it.
    // Sized backwards from the pixel: 1.25 m tall puts the cap height at 0.78 m and
    // the strokes at 0.16 m, which is four pixels at this standoff. Four big glyphs
    // over a gateway is what the real thing carries anyway.
    const boardBase = springY + rise + 0.2;
    for (const sz of [-1, 1]) {
      const bw = 6.2;
      const bh = 1.25;
      const by = boardBase + 0.5;
      // Clear of the turned screens, which project 270 mm off the wall face.
      const bz = z + sz * (depth / 2 + 0.34);
      m.makeTranslation(0, by, bz);
      this.box('concrete', bw + 0.26, bh + 0.26, 0.12, m, 1.6);
      // Glazed green field with pale letters: the standard scheme for this, and
      // also the two overrides the shopfront boards and the checkpoint lamp
      // already queue under, so the board costs no new batch.
      m.makeTranslation(0, by, bz + sz * 0.05);
      this.box('paintedMetalGreen', bw, bh, 0.06, m, 0.9, SIGN_GREEN);
      const legend = scriptRun(bw - 0.5, bh * 0.62, 0.035, () => rng.next());
      const q3 = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0), sz > 0 ? 0 : Math.PI,
      );
      m.compose(new THREE.Vector3(0, by, bz + sz * 0.085), q3, new THREE.Vector3(1, 1, 1));
      this.push('tile', legend, m, LETTER_LIGHT);
      legend.dispose();
      // Brackets under it, so it is carried rather than stuck on.
      for (const bx of [-2.5, 0, 2.5]) {
        const g = prism([[0, 0], [0.34, 0.34], [0, 0.34]], 0.09, 0.5, 'x');
        const qb = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0), sz > 0 ? 0 : Math.PI,
        );
        m.compose(
          new THREE.Vector3(bx, by - bh / 2 - 0.2, z + sz * (depth / 2 + 0.02)),
          qb, new THREE.Vector3(1, 1, 1),
        );
        this.push('gunmetal', g, m);
        g.dispose();
      }
    }

    // Founder's plaque low on each pier, where a player walking through reads it.
    for (const sz of [-1, 1]) {
      for (const sx of [-1, 1]) {
        const px = sx * (pierIn + pierW / 2);
        const py = 3.4;
        const pz = z + sz * (depth / 2 + 0.04);
        m.makeTranslation(px, py, pz);
        this.box('concrete', 1.16, 0.78, 0.1, m, 1.4);
        m.makeTranslation(px, py, pz + sz * 0.04);
        this.box('tile', 0.96, 0.6, 0.05, m, 0.8, PALE_STONE);
        const plaque = scriptRun(0.86, 0.3, 0.02, () => rng.next());
        const q4 = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0), sz > 0 ? 0 : Math.PI,
        );
        m.compose(new THREE.Vector3(px, py, pz + sz * 0.07), q4, new THREE.Vector3(1, 1, 1));
        this.push('tile', plaque, m, LETTER_DARK);
        plaque.dispose();
      }
    }

    // ---- room over the passage ----
    const roomBase = springY + rise + 0.2;
    const roomH = 3.1;
    const roomHalf = pierIn + pierW;
    m.makeTranslation(0, roomBase - 0.14, z);
    this.box('concreteFloor', roomHalf * 2 + 0.5, 0.28, depth + 0.5, m, 4);
    for (const sz of [-1, 1]) {
      // Front and back walls, with three screened openings each.
      const bays = 3;
      const bayW = (roomHalf * 2) / bays;
      for (let i = 0; i < bays; i++) {
        const ox = -roomHalf + bayW * (i + 0.5);
        const openW = bayW * 0.46;
        const pierLeft = (bayW - openW) / 2;
        for (const s2 of [-1, 1]) {
          m.makeTranslation(ox + s2 * (openW / 2 + pierLeft / 2), roomBase + roomH / 2, z + sz * (depth / 2 - 0.16));
          this.box('plaster', pierLeft, roomH, 0.32, m, 4.5);
        }
        m.makeTranslation(ox, roomBase + 0.42, z + sz * (depth / 2 - 0.16));
        this.box('plaster', openW, 0.84, 0.32, m, 4.5);
        m.makeTranslation(ox, roomBase + roomH - 0.42, z + sz * (depth / 2 - 0.16));
        this.box('plaster', openW, 0.84, 0.32, m, 4.5);
        // Turned screen in the opening, projecting as a bay box.
        const oy = roomBase + roomH / 2;
        m.makeTranslation(ox, oy, z + sz * (depth / 2 + 0.16));
        this.box('wood', openW + 0.16, roomH - 1.68 + 0.16, 0.14, m, 1.0);
        const cols = 5;
        for (let c = 0; c <= cols; c++) {
          m.makeTranslation(ox - openW / 2 + (openW * c) / cols, oy, z + sz * (depth / 2 + 0.24));
          this.box('wood', 0.04, roomH - 1.68, 0.06, m, 0.7);
        }
        for (let rw = 0; rw <= 5; rw++) {
          m.makeTranslation(ox, oy - (roomH - 1.68) / 2 + ((roomH - 1.68) * rw) / 5, z + sz * (depth / 2 + 0.24));
          this.box('wood', openW, 0.04, 0.06, m, 0.7);
        }
      }
    }
    // Side walls, roof slab, cornice and parapet.
    for (const sx of [-1, 1]) {
      m.makeTranslation(sx * (roomHalf - 0.16), roomBase + roomH / 2, z);
      this.box('plaster', 0.32, roomH, depth, m, 4.5);
    }
    m.makeTranslation(0, roomBase + roomH + 0.1, z);
    this.box('concreteFloor', roomHalf * 2 + 0.2, 0.2, depth + 0.2, m, 4);
    for (const sz of [-1, 1]) {
      const g = prism(corniceProfile(0.3, 0.42), roomHalf * 2 + 1.0, 3.0, 'x');
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), sz > 0 ? 0 : Math.PI);
      m.compose(new THREE.Vector3(0, roomBase + roomH - 0.3, z + sz * (depth / 2)), q, new THREE.Vector3(1, 1, 1));
      this.push('concrete', g, m);
      g.dispose();
    }
    const pTop = roomBase + roomH + 0.2;
    for (const sz of [-1, 1]) {
      const n = 7;
      for (let i = 0; i < n; i++) {
        if (rng.next() < 0.1) continue;
        const ox = -roomHalf + ((roomHalf * 2) * (i + 0.5)) / n;
        m.makeTranslation(ox, pTop + 0.42, z + sz * (depth / 2 - 0.12));
        this.box('plaster', ((roomHalf * 2) / n) * 0.92, 0.84, 0.24, m, 4.5);
      }
    }
    // Rooftop clutter on the sabat reads at exactly eye level down the street.
    const tank = cyl(0.6, 0.6, 1.2, 12, 1.6);
    m.makeTranslation(-2.4, pTop + 0.9, z);
    this.push('paintedMetalTan', tank, m);
    tank.dispose();
    const mast = cyl(0.03, 0.05, 3.4, 5, 0.5);
    m.makeTranslation(2.8, pTop + 1.7, z + 0.6);
    this.push('corrugated', mast, m);
    mast.dispose();

    // A lamp hung under the crown of the arch.
    const stem = cyl(0.02, 0.02, 0.6, 4, 0.4);
    m.makeTranslation(0, springY + rise - 0.35, z);
    this.push('corrugated', stem, m);
    stem.dispose();
    m.makeTranslation(0, springY + rise - 0.72, z);
    this.box('paintedMetalGreen', 0.4, 0.22, 0.4, m, 0.8);
  }

  /**
   * The overhead layer: cables and cloth strung across the street.
   *
   * Nothing costs less and reads more strongly. Lines crossing the frame above
   * head height give the eye a foreground plane to anchor against, which is
   * what stops a long street from flattening into a backdrop.
   */
  private buildOverhead(): void {
    const rng = this.rng;
    const m = new THREE.Matrix4();

    // Cloth stretched over the alley entrances between blocks.
    const alleys: Array<[number, number]> = [[-FRONT_X, -11.5], [-FRONT_X, 14.5], [FRONT_X, -11], [FRONT_X, 17.5]];
    for (const [ax, az] of alleys) {
      for (let i = 0; i < 2; i++) {
        const y = 3.6 + i * 0.7;
        // Striped, out of the same two-dye palette as everything else made of
        // cloth on the map. These are four metres by two and a half — the largest
        // single sheets anywhere — and in one flat over-bright mauve they were the
        // "flat plane with a procedural stripe" the review named, with the sag and
        // fold geometry under them contributing nothing because the whole sheet
        // sat at one value.
        const stripe = CANOPY[rng.int(0, CANOPY.length - 1)];
        const bands = 7;
        const bw = 4.2 / bands;
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
        q.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2));
        for (let b = 0; b < bands; b++) {
          const cloth = clothPanel(bw + 0.006, 2.6, {
            sag: 0.4, fold: 0.12, folds: 2, hem: 0.25, tile: 2.4, segsX: 3, segsY: 5,
          });
          cloth.translate(-2.1 + bw * (b + 0.5), 0, 0);
          m.compose(
            new THREE.Vector3(ax + (ax < 0 ? -1.6 : 1.6), y, az + i * 3.0),
            q, new THREE.Vector3(1, 1, 1),
          );
          this.push('fabricTarp', cloth, m, b % 2 === 0 ? stripe.a : stripe.b);
          cloth.dispose();
        }
      }
    }

    // Bunting and cable runs across the carriageway, hung off the pole line.
    // The sag is kept modest and the flags small: a metre of cloth two metres
    // from the lens is a shape the size of a doorway, and the review camera at
    // z = 34 sits directly under one of these spans.
    const spans: Array<[number, number]> = [
      [-46, 7.2], [-38, 6.6], [-22, 7.4], [-8, 6.8], [4, 7.2], [16, 6.6],
      [26, 7.4], [37.5, 7.4], [50, 7.1],
    ];
    for (const [z, y] of spans) {
      const a = new THREE.Vector3(-POLE_X, y, z);
      const b = new THREE.Vector3(POLE_X, y - rng.range(-0.3, 0.3), z + rng.range(-0.6, 0.6));
      // Sag as a fraction of the span, not an absolute drop. A fixed 0.8–1.3 m
      // on a 25 m crossing is 4 %, which at the range these are seen from is
      // within a pixel or two of a straight line — hence three reviews reporting
      // that the cables were "drawn with a ruler". Real distribution conductors
      // in this heat hang at 5–8 %, and it is the curve, not the thickness, that
      // makes overhead wiring read as wiring.
      const cable = slackCable(a, b, rng.range(0.065, 0.095), 0.02, 12);
      m.identity();
      this.push('polymerBlack', cable, m, FLAT);
      cable.dispose();
      // Terminations. A span that simply stops in space at each end is the other
      // half of the complaint: it needs a cross-arm, an insulator to be dead-
      // ended on, and a tail dropping away from it.
      for (const end of [a, b]) {
        const sx = Math.sign(end.x);
        const arm = new THREE.BoxGeometry(0.7, 0.07, 0.08);
        scaleUV(arm, 0.7, 0.07, 0.08, 0.6);
        m.makeTranslation(end.x + sx * 0.16, end.y + 0.1, end.z);
        this.push('wood', arm, m);
        arm.dispose();
        // Into the gunmetal batch rather than a variant of its own: a 45 mm
        // ceramic at eight metres is four pixels, and its own batch cost more
        // than the grey-green did for it.
        const ins = cyl(0.045, 0.055, 0.13, 6, 0.3);
        m.makeTranslation(end.x - sx * 0.1, end.y + 0.2, end.z);
        this.push('gunmetal', ins, m);
        ins.dispose();
        const tail = slackCable(
          new THREE.Vector3(end.x - sx * 0.1, end.y + 0.16, end.z),
          new THREE.Vector3(end.x + sx * 0.02, end.y - 0.5, end.z + 0.06),
          0.2, 0.016, 4,
        );
        m.identity();
        this.push('polymerBlack', tail, m, FLAT);
        tail.dispose();
      }

      // Pennants, or a run of washing on the lower lines.
      const flags = rng.int(5, 9);
      const big = y < 7.0 && rng.next() < 0.45;
      for (let i = 1; i < flags; i++) {
        const t = i / flags;
        const px = THREE.MathUtils.lerp(a.x, b.x, t);
        const pz = THREE.MathUtils.lerp(a.z, b.z, t);
        const py = THREE.MathUtils.lerp(a.y, b.y, t) - Math.sin(t * Math.PI) * rng.range(0.8, 1.3);
        const fw = big ? rng.range(0.4, 0.6) : rng.range(0.2, 0.34);
        const fh = big ? rng.range(0.5, 0.8) : rng.range(0.26, 0.4);
        const cloth = clothPanel(fw, fh, { fold: 0.04, folds: 2, hem: 0.05, tile: 1.2, segsX: 4, segsY: 3 });
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng.range(-0.35, 0.35));
        m.compose(new THREE.Vector3(px, py - 0.02, pz), q, new THREE.Vector3(1, 1, 1));
        this.push('fabricTarp', cloth, m, { variant: 'wash', material: WASH_MAT });
        cloth.dispose();
      }
    }

    // Service drops from the pole line into the buildings.
    //
    // Each one lands on a bracket with a service head and a meter box under it,
    // and the run continues down the wall in conduit. A drop that ends at a
    // point on a blank wall is the "cable terminating in mid-air" the review
    // picked up, and it is a five-triangle fix.
    for (let i = 0; i < 14; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const z = -48 + i * 7.4 + rng.range(-1.5, 1.5);
      const wallY = rng.range(4.0, 6.4);
      const wz = z + rng.range(-2.5, 2.5);
      const a = new THREE.Vector3(side * POLE_X, rng.range(6.4, 7.6), z);
      const b = new THREE.Vector3(side * (FRONT_X - 0.32), wallY, wz);
      const cable = slackCable(a, b, rng.range(0.08, 0.14), 0.017, 7);
      m.identity();
      this.push('polymerBlack', cable, m, FLAT);
      cable.dispose();
      // Standoff bracket, insulator, service head.
      const bx = side * (FRONT_X - 0.16);
      const brk = cyl(0.022, 0.022, 0.34, 4, 0.3);
      const q2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
      m.compose(new THREE.Vector3(bx, wallY, wz), q2, new THREE.Vector3(1, 1, 1));
      this.push('corrugated', brk, m);
      brk.dispose();
      m.makeTranslation(side * (FRONT_X - 0.06), wallY - 0.32, wz);
      this.box('gunmetal', 0.16, 0.3, 0.22, m, 0.6);
      // Conduit down to a meter box at head height.
      const run = wallY - 0.5 - 2.0;
      if (run > 0.4) {
        const cond = cyl(0.024, 0.024, run, 4, 0.4);
        m.makeTranslation(side * (FRONT_X - 0.06), 2.0 + run / 2, wz);
        this.push('corrugated', cond, m);
        cond.dispose();
        m.makeTranslation(side * (FRONT_X - 0.1), 1.85, wz);
        this.box('paintedMetalGreen', 0.24, 0.34, 0.26, m, 0.7);
      }
    }
  }

  /**
   * A patch of sand as an irregular cluster rather than a rectangle.
   *
   * One axis-aligned quad of sand on a road reads as a board laid on the tarmac,
   * because the eye finds the straight edge instantly and a straight edge is the
   * one thing wind-blown sand never has. Several smaller quads at random angles,
   * overlapping and of different sizes, give the union a broken outline for the
   * same triangle cost.
   */
  private sandField(
    cx: number,
    cz: number,
    w: number,
    d: number,
    thick: number,
    n: number,
    y = 0.02,
  ): void {
    const rng = this.rng;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const one = new THREE.Vector3(1, 1, 1);
    const yA = new THREE.Vector3(0, 1, 0);
    // Built from drifts of a fixed physical size, tiled over the footprint,
    // rather than one drift scaled to fill it.
    //
    // This is the whole difference between sand and sheet material. Blown sand
    // has a characteristic scale of a metre or two, so a wedge stretched across a
    // 14 m carriageway has a top surface at two degrees to the horizontal and a
    // crest line six metres long: from a standing eye that is a pale plate with a
    // ruled edge lying on the road, and no amount of texture rescues it.
    //
    // Overlapping mid-sized drifts were not enough on their own, because the
    // union of six 2 m rectangles is still a shape whose outline is six straight
    // lines, and against tarmac — sand is three times the reflectance, so the
    // boundary is the highest-contrast edge anywhere in a street shot — the eye
    // goes straight to it. What fixes it is treating the boundary as a separate
    // problem from the area: a few large lenses for the body of the drift, then a
    // scalloped fringe of small thin ones set around its perimeter, so the edge
    // is made of half-metre arcs and dies away instead of stopping.
    const core = Math.min(11, Math.max(1, Math.round((w * d) / 7.0)));
    const fringe = Math.min(24, Math.max(n, Math.round((w + d) * 1.1)));
    for (let i = 0; i < core; i++) {
      const pw = Math.min(w, rng.range(1.0, 2.2));
      const pd = Math.min(d, rng.range(1.1, 2.6));
      q.setFromAxisAngle(yA, rng.range(-1.6, 1.6));
      m.compose(
        new THREE.Vector3(
          cx + rng.range(-(w - pw) / 2, (w - pw) / 2) * 0.7,
          y,
          cz + rng.range(-(d - pd) / 2, (d - pd) / 2) * 0.7,
        ),
        q, one,
      );
      // Lenses, not extruded wedges.
      //
      // `duneProfile` closes to nothing across the profile but the extrusion is
      // cut off square, so a wedge has two vertical end walls at full height —
      // and since a sand lens on a road is the highest-contrast boundary in a
      // street shot, those two walls are two hard ruled lines with their own
      // shadow, at either end of every lens in the field. That is where the
      // "large flat plates with straight seams" reading came from: the seams are
      // the ends of these, not the tops. A disc that feathers to zero all the way
      // round has no end walls to cut, and costs a third of the triangles.
      const geo = patchDisc(
        pw / 2, pd / 2, thick * rng.range(1.7, 3.2), () => rng.next(),
        { sides: 11, wobble: 0.44, shoulder: 0.42, tile: 2.2 },
      );
      this.push('sand', geo, m, FLAT);
      geo.dispose();
    }
    // The fringe. Set round an inscribed ellipse at a jittered radius, each one
    // aligned to the tangent so the scallops sit along the boundary rather than
    // sticking out through it.
    for (let i = 0; i < fringe; i++) {
      const a = (i / fringe) * Math.PI * 2 + rng.range(-0.24, 0.24);
      const rr = rng.range(0.72, 1.0);
      const px = cx + (Math.cos(a) * w * rr) / 2;
      const pz = cz + (Math.sin(a) * d * rr) / 2;
      const pw = rng.range(0.4, 0.95);
      const pd = rng.range(0.45, 1.1);
      q.setFromAxisAngle(yA, a + Math.PI / 2 + rng.range(-0.5, 0.5));
      m.compose(new THREE.Vector3(px, y, pz), q, one);
      const geo = patchDisc(
        pw / 2, pd / 2, thick * rng.range(0.5, 1.5), () => rng.next(),
        { sides: 7, wobble: 0.5, shoulder: 0.36, tile: 2.2 },
      );
      this.push('sand', geo, m, FLAT);
      geo.dispose();
    }
  }

  /**
   * The souk shade: a run of lean-to canopies over both pavements, carried on a
   * wall plate at the building line and a post line just inside the kerb.
   *
   * This is the single most useful structure on the map. It caps the frame from
   * almost any street-level camera, which is what stops a wide road reading as
   * an empty plaza with sky above it; the rafters throw a barcode of shadow down
   * the pavement and up the shopfronts; and the two runs converge towards the
   * arch, so the main sightline gets leading lines for free. Everything sits at
   * 4 m or higher and the posts stand outside the carriageway, so none of it
   * touches how the street plays.
   */
  private buildSoukShade(): void {
    const rng = this.rng;
    // Free-standing on two post lines, one at each edge of the footway, rather
    // than a lean-to carried on the building.
    //
    // As a lean-to the high end of every rafter was fixed to the shopfront at
    // 13.9 m out, which is 400 mm from where the alley review camera stands. A
    // player hugging the shopfront was therefore *inside* the structure at its
    // deepest point, looking along the undersides of 4.75 m rafters at a
    // grazing angle: eleven of them per bay, radiating across the whole frame
    // with the sky and the street behind them cut into slivers. The capture
    // read as a lumber yard, and no amount of thinning the bays fixes it,
    // because the geometry is over the camera's head by construction.
    //
    // Standing it on its own posts moves the near edge 2 m clear of the
    // shopfront, so the wall line is a place to walk and look from instead of a
    // place to be underneath. It also leaves a clear 3.3 m between the post
    // lines — a footway you can actually use — and gives the street a double
    // colonnade converging on the arch instead of a single one.
    const kerbX = ROAD_HALF + 0.75;
    // 2.6 m deep, over the kerb half of the footway only.
    //
    // The camera's vertical field of view is 80 degrees, so its top edge is 40
    // degrees above the eye line and anything within about three metres overhead
    // is in frame. With the back line at 11.5 m it was two metres from a player
    // at the shopfronts, which put every rafter in the run inside the frame,
    // fanning from the top corner down to the centre. Pulling it in to 10 m buys
    // 3.5 m of clearance and leaves that much of the footway open to the sky.
    const backX = ROAD_HALF + 2.6;

    for (const side of [-1, 1]) {
      let z = -52 + rng.range(0, 3);
      while (z < 54) {
        const len = rng.range(6.0, 12.0);
        // Leave the junction and the arch clear, and drop bays freely: the run
        // has to be a series of separate stalls' awnings with daylight between
        // them, not one continuous hundred-metre lid.
        // Leave a bay's width clear where somebody stands *behind* the run.
        //
        // The alley vantage is 3.5 m back from the rear post line, so a bay built
        // across its sightline puts a canopy, a post and a row of hanging goods
        // between the camera and everything the shot is of. A review of that frame
        // called it "no compositional read — the eye enters and finds nothing",
        // and a later capture with a bay landing squarely in front showed the
        // opposite failure just as clearly: a legible middle distance replaced by
        // the underside of a reed mat. A market has gaps at the cross-alleys, so
        // the gap goes where the sightline is, and the posts either side of it
        // become the frame instead of the obstruction.
        const blocks = VANTAGES.some(
          (v) => Math.sign(v.x) === side && v.z > z - 3.5 && v.z < z + len + 3.5,
        );
        const clash =
          blocks ||
          Math.abs(z + len / 2 - CROSS_Z) < CROSS_HALF + 3.5 ||
          Math.abs(z + len / 2 - 48) < 4.5;
        if (!clash && rng.next() < 0.66) {
          this.buildShadeBay(side, z, z + len, kerbX, backX, rng.next());
        }
        z += len + rng.range(2.5, 7.0);
      }
    }
  }

  /**
   * One bay of the souk shade, from `z0` to `z1` on the given side.
   *
   * `postX` is the low kerbside line, `wallX` the taller line at the back of the
   * footway; the fall between them sheds into the gutter.
   */
  private buildShadeBay(
    side: number,
    z0: number,
    z1: number,
    postX: number,
    wallX: number,
    kind: number,
  ): void {
    const rng = this.rng;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const one = new THREE.Vector3(1, 1, 1);
    const yAxis = new THREE.Vector3(0, 1, 0);
    const zAxis = new THREE.Vector3(0, 0, 1);
    const len = z1 - z0;
    const zc = (z0 + z1) / 2;
    const px = side * postX;
    const wx = side * wallX;
    const span = wallX - postX;
    // The canopy falls away from the building so rain sheds into the gutter.
    //
    // Height matters more than it looks: at 4.2 m the eaves sit less than a
    // metre above a standing eye, and because the run extends past the camera in
    // both directions the underside then fills the top half of the frame and
    // deletes the skyline. Just above first-floor sill level is both what these
    // are actually built at and what leaves the roofscape visible. The spread
    // between bays is deliberate — a constant height turns the run into one
    // continuous plane a hundred metres long.
    const wallY = 5.2 + rng.range(-0.5, 0.45);
    const eaveY = wallY - rng.range(0.3, 0.55);
    const tilt = Math.atan2(wallY - eaveY, span);

    // ---- posts, braced back to the eaves beam at the bay ends ----
    // Widely spaced and heavier in section. Every extra post is another vertical
    // line at a different depth, and past about one every five metres the run
    // stops reading as a frame carrying a roof and starts reading as scaffolding:
    // a thicket of identical thin sticks with no structural logic to it.
    const posts = Math.max(2, Math.round(len / 5.2));
    for (const [lineX, lineY, sect] of [[px, eaveY, 0.15], [wx, wallY, 0.17]] as Array<
      [number, number, number]
    >) {
      for (let i = 0; i <= posts; i++) {
        const pz = z0 + (len * i) / posts;
        const end = i === 0 || i === posts;
        // Squared timber, not a pole: two faces at different angles to the light
        // give a post its own shading, which is what makes it read at range.
        m.makeTranslation(lineX, lineY / 2 + 0.16, pz);
        this.box('wood', sect, lineY - 0.32, sect, m, 1.1);
        // Stone pad, so the post does not grow out of the pavement.
        m.makeTranslation(lineX, 0.24, pz);
        this.box('concrete', sect + 0.19, 0.18, sect + 0.19, m, 1.2, LIME);
        if (!end) continue;
        // Brace: a diagonal in the plane of the beam, at the ends only.
        const bl = 1.05;
        q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), (i === 0 ? -1 : 1) * 0.78);
        m.compose(
          new THREE.Vector3(lineX, lineY - bl * 0.36, pz + (i === 0 ? 1 : -1) * bl * 0.36),
          q, one,
        );
        const brace = boxGeo(0.08, bl, 0.08, 0.9);
        this.push('wood', brace, m);
        brace.dispose();
      }
    }

    // ---- eaves beam and head beam ----
    m.makeTranslation(px, eaveY + 0.06, zc);
    this.box('wood', 0.13, 0.16, len + 0.5, m, 1.6);
    m.makeTranslation(wx, wallY + 0.06, zc);
    this.box('wood', 0.14, 0.18, len + 0.3, m, 1.6);
    // Fascia along the eave, standing 120 mm below the beam.
    //
    // The one element that turns a set of rafters into a roof. Without it the
    // canopy has no edge: every rafter end is a separate stick against the sky
    // and the run reads as scaffolding. With it there is a single unbroken
    // horizontal down the whole street at a constant height, which is both the
    // strongest line in any street-level frame and the thing that tells you the
    // structure is one object rather than fifty.
    m.makeTranslation(px - side * 0.06, eaveY - 0.06, zc);
    this.box('wood', 0.05, 0.22, len + 0.5, m, 1.6);

    // ---- rafters: the element that actually does the work ----
    // 2.1 m centres in a heavier section, not 1.35 m in a light one.
    //
    // Same total timber, half the number of edges. Rafters are the only thing up
    // here a player ever sees close up, and eleven of them per bay at 100 mm deep
    // read as a barcode across the top of the frame; five at 150 mm read as a
    // roof that has structure holding it up.
    const rafters = Math.max(3, Math.round(len / 2.1));
    q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), side * tilt);
    for (let i = 0; i <= rafters; i++) {
      const rz = z0 + (len * i) / rafters;
      const sag = Math.sin((i / rafters) * Math.PI) * 0.05;
      m.compose(
        new THREE.Vector3(side * (postX + span / 2), (wallY + eaveY) / 2 + 0.14 - sag, rz),
        q, one,
      );
      const rafter = boxGeo(span + 0.34, 0.15, 0.1, 1.4);
      this.push('wood', rafter, m);
      rafter.dispose();
    }

    // ---- the covering ----
    const coverY = (wallY + eaveY) / 2 + 0.24;
    // Every bay gets a covering.
    //
    // Bays were previously left bare one time in six, on the reasoning that a run
    // with no gaps in it is suffocating from underneath. That is true of the run,
    // and the gaps between bays already provide it — but it is not true of an
    // individual bay, and the review capture caught exactly the case this misses:
    // a stripped bay directly overhead, which does not read as sky coming through
    // but as a pergola of bare sticks fanning across the top of the frame. A
    // covering is a single surface with one silhouette however torn it is, and a
    // torn one is what a stripped bay should be.
    if (kind < 0.62) {
      // Reed matting: slats laid across the rafters, half open. The gaps are the
      // whole point — a solid roof over the pavement kills the light on it and
      // turns the underside into a lid, whereas a mat throws a dapple that reads
      // as souk from anywhere in the street. It is also the majority case here
      // because it is the cheapest thing to build and the commonest to see.
      // Slat widths and gaps both vary. Cut to a module the run comes out as a
      // ruled hatch, which from underneath is the most graphic thing in the frame
      // and reads as a printed pattern rather than as bundled reed.
      // Slats a little wider and gaps a little tighter than before: about 70 per
      // cent cover rather than 55. At the lower figure the run stops reading as a
      // covering at all from underneath — you see the rafters through it and the
      // bay looks stripped, which is the failure this covering exists to prevent.
      // Eighty-five per cent cover, not sixty-three.
      //
      // From underneath, which is where a player is, a slat run at 63 % is not a
      // roof with light coming through it — it is a set of sticks with sky behind
      // them, and the eye resolves the sky, not the reed. The alley capture is
      // shot from a pavement directly under one of these and it came back reading
      // as a pergola skeleton: alternating hard light and dark bands across the
      // top third of the frame with cloud visible in every gap. Reed matting is
      // bundled tight and then *wears* open, so the gaps want to be occasional
      // and narrow rather than regular and half the width of the slat.
      let sz = z0 + 0.1;
      // Rolled bundles laid in courses, not flat battens laid in a plane.
      //
      // A 35 mm box has one downward face, so a run of them at a common height
      // is a single plane with hatch lines ruled on it — the alley capture came
      // back with the largest element in the frame reading as three flat tan
      // quads with hard rectangular edges, which is precisely what a plane with
      // hatching on it is. A reed roof is bundles: round in section, so the
      // underside is scalloped and each bundle carries its own light-to-dark
      // falloff, and tied into mats three or four bundles wide which are then
      // laid overlapping, so there is a step and a change of angle at every mat
      // edge. Round section plus stepped courses is the whole difference between
      // a surface and a card, and it costs eight triangles a bundle.
      let inCourse = 0;
      let courseY = 0;
      let courseYaw = 0;
      while (sz < z1 - 0.1) {
        if (inCourse <= 0) {
          inCourse = rng.int(3, 6);
          courseY = rng.range(0, 0.06);
          courseYaw = rng.range(-0.04, 0.04);
        }
        inCourse--;
        const sw = rng.range(0.15, 0.26);
        // One slat in eight is gone. Tightening the bundle fixed the pergola
        // reading, but taken to a continuous mat it becomes a plain tan board —
        // the dapple is the whole character of a reed roof, and it comes from a
        // few real holes rather than from a regular gap beside every slat.
        if (rng.next() > 0.13) {
          q.setFromAxisAngle(zAxis, side * tilt + Math.PI / 2);
          q.premultiply(new THREE.Quaternion().setFromAxisAngle(yAxis, courseYaw));
          m.compose(
            new THREE.Vector3(
              side * (postX + span / 2) - side * rng.range(0.04, 0.16),
              coverY + courseY + rng.range(-0.01, 0.01) - sw / 2,
              sz + sw / 2,
            ),
            q, one,
          );
          const bundle = cyl(sw / 2, sw / 2, span + rng.range(0.2, 0.4), 5, 0.7);
          this.push('wood', bundle, m, REED);
          bundle.dispose();
        }
        sz += sw + rng.range(0.01, 0.05);
      }
      q.setFromAxisAngle(zAxis, side * tilt);
      // Cross-bundles pinning the slats down, laid the other way. Two per bay:
      // enough to break the hatch into panels so it is not one ruled pattern for
      // the whole run, and they are what a mat is actually tied to.
      for (const t of [0.3, 0.72]) {
        m.compose(
          new THREE.Vector3(side * (postX + span / 2), coverY + 0.035, z0 + len * t),
          q, one,
        );
        const tieDown = boxGeo(span + 0.3, 0.045, 0.07, 0.7);
        this.push('wood', tieDown, m, REED);
        tieDown.dispose();
      }
    } else if (kind < 0.73) {
      // Corrugated sheets, overlapped, with the occasional one blown off. Kept
      // to a minority: it is the only covering here that is genuinely opaque, so
      // a run of it is a solid soffit right on the eye line.
      const sheets = Math.max(2, Math.round(len / 2.2));
      for (let i = 0; i < sheets; i++) {
        if (rng.next() < 0.12) continue;
        const sl = len / sheets;
        const sz = z0 + sl * (i + 0.5);
        m.compose(
          new THREE.Vector3(
            side * (postX + span / 2) - side * 0.1,
            coverY + rng.range(-0.02, 0.02),
            sz,
          ),
          q, one,
        );
        // A real profile, not a flat box wearing a striped texture. This is the
        // soffit directly over the market street on the eye line, so it is one of
        // the largest single surfaces in the street shot; 14 mm of rib turns it
        // from a painted board into metal the moment the sun rakes across it.
        const sheet = corrugatedPanel(span + 0.4, sl * 1.04, {
          pitch: 0.18, amp: 0.015, thick: 0.014, bow: rng.range(-0.03, 0.04),
          rand: () => rng.next(), tile: 1.0,
        });
        sheet.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
        this.push('corrugated', sheet, m);
        sheet.dispose();
      }
    } else {
      // Cloth slung between the rafters, in two or three widths. Laid flat by a
      // -90 degree turn about X — local -Y runs to world +Z, and the fold
      // displacement, which is along the sheet normal, becomes the ripple.
      const strips = Math.max(2, Math.round(len / 3.6));
      const stripe = CANOPY[rng.int(0, CANOPY.length - 1)];
      for (let i = 0; i < strips; i++) {
        const sl = len / strips;
        if (rng.next() < 0.18) continue;
        const cloth = clothPanel(span + 0.45, sl * 0.86, {
          fold: 0.1, folds: 3, tile: 2.4, segsX: 5, segsY: 6,
        });
        const cq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), side * tilt);
        cq.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2));
        m.compose(
          new THREE.Vector3(side * (postX + span / 2), coverY + 0.03, z0 + sl * i),
          cq, one,
        );
        // Alternate widths, which is what the bay is actually covered with: two
        // bolts of cloth laid side by side, not one dyed sheet the length of the
        // street.
        this.push('fabricTarp', cloth, m, i % 2 === 0 ? stripe.a : stripe.b);
        cloth.dispose();
      }
    }

    // ---- valance hanging off the eaves ----
    // Broken into separate lengths with gaps between them. A single sheet down
    // the whole bay reads as an unshaded band of flat tone right on the eye line,
    // which is worse than no valance at all; hung in pieces it reads as cloth.
    const vBays = Math.max(2, Math.round(len / 2.6));
    for (let i = 0; i < vBays; i++) {
      if (this.rng.next() < 0.45) continue;
      const vl = (len / vBays) * this.rng.range(0.6, 0.92);
      const drop = this.rng.range(0.3, 0.6);
      // Striped, and scalloped by band. This valance runs the whole length of
      // the street at eaves height, so it is the longest single line of cloth in
      // the map and the one most often seen against the sky; as one flat mauve
      // sheet with a ruled bottom edge it was doing the opposite of its job.
      const stripe = CANOPY[this.rng.int(0, CANOPY.length - 1)];
      const bands = Math.max(3, Math.round(vl / 0.32));
      const bw = vl / bands;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
      for (let b = 0; b < bands; b++) {
        const valance = clothPanel(bw + 0.004, drop * this.rng.range(0.86, 1.1), {
          fold: 0.05, folds: 2, hem: 0.1, tile: 1.8, segsX: 4, segsY: 3,
          rand: () => this.rng.next(),
        });
        valance.translate(-vl / 2 + bw * (b + 0.5), 0, 0);
        m.compose(
          new THREE.Vector3(
            px + side * 0.12,
            eaveY + 0.02,
            z0 + (len / vBays) * (i + 0.5),
          ),
          q, one,
        );
        this.push('fabricTarp', valance, m, b % 2 === 0 ? stripe.a : stripe.b);
        valance.dispose();
      }
    }
    // Goods hung off the front rail, on cords long enough to reach.
    //
    // Two things were wrong with the first version. They hung 250 mm below a
    // 4.6 m eaves, which is a metre and a half over the head of anyone who might
    // buy them, and they were as wide as they were tall — a squashed sphere at
    // that size is a bauble, and two of them side by side in the alley shot read
    // as decorations rather than as stock. Market goods hang at chest height on
    // a long cord and they are tall and narrow: bundles of cloth, strings of
    // onions, sheaves of dried herbs. Down at 2.2 to 2.9 m they also do real work
    // in the frame, because they are the only thing between the camera and the
    // buildings forty metres away.
    for (let i = 0; i < Math.round(len / 2.1); i++) {
      if (this.rng.next() < 0.34) continue;
      const hz = z0 + this.rng.range(0.5, len - 0.5);
      const hangY = this.rng.range(2.25, 3.05);
      const cordLen = eaveY - 0.1 - hangY;
      const cord = cyl(0.01, 0.01, cordLen, 3, 0.3);
      m.makeTranslation(px + side * 0.06, hangY + cordLen / 2, hz);
      this.push('polymerBlack', cord, m);
      cord.dispose();
      const kind = this.rng.next();
      if (kind < 0.42) {
        // Bundle in a net, narrow and long.
        const hh = this.rng.range(0.42, 0.75);
        const hw = this.rng.range(0.09, 0.15);
        const bag = bagGeometry(hw, hh / 2, hw * this.rng.range(0.8, 1.2));
        m.makeTranslation(px + side * 0.06, hangY - hh / 2, hz);
        this.push('fabricSandbag', bag, m);
        bag.dispose();
      } else if (kind < 0.74) {
        // Bolt of cloth over the cord: a narrow panel, folded double.
        const cw = this.rng.range(0.2, 0.34);
        const ch = this.rng.range(0.5, 0.95);
        const cloth = clothPanel(cw, ch, {
          fold: 0.05, folds: 2, hem: 0.07, tile: 1.4, segsX: 4, segsY: 4,
        });
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2 + this.rng.range(-0.3, 0.3));
        m.compose(new THREE.Vector3(px + side * 0.06, hangY, hz), q, one);
        const bolt = CANOPY[this.rng.int(0, CANOPY.length - 1)];
        this.push('fabricTarp', cloth, m, this.rng.next() < 0.5 ? bolt.a : bolt.b);
        cloth.dispose();
      } else {
        // Strung produce: a chain of small bulbs down the cord.
        const beads = this.rng.int(4, 7);
        for (let b = 0; b < beads; b++) {
          const br = this.rng.range(0.055, 0.085);
          const bead = bagGeometry(br, br * 0.9, br);
          m.makeTranslation(
            px + side * 0.06 + this.rng.range(-0.05, 0.05),
            hangY - 0.06 - b * br * 1.7,
            hz + this.rng.range(-0.05, 0.05),
          );
          this.push('paintedMetalTan', bead, m);
          bead.dispose();
        }
      }
    }
    // A shopkeeper's lamp on a flex, under the rafters.
    if (this.rng.next() < 0.5) {
      const lz = zc + this.rng.range(-len / 3, len / 3);
      const flexY = eaveY - 0.55;
      const flex = cyl(0.008, 0.008, 0.5, 3, 0.4);
      m.makeTranslation(side * (postX + span * 0.4), flexY + 0.3, lz);
      this.push('polymerBlack', flex, m);
      flex.dispose();
      const shade = cyl(0.02, 0.13, 0.14, 8, 0.5);
      m.makeTranslation(side * (postX + span * 0.4), flexY, lz);
      this.push('paintedMetalGreen', shade, m);
      shade.dispose();
    }
  }

  /**
   * Where the ground meets everything else: wind-blown sand banked against the
   * walls and debris fans out of the damaged buildings. Without this every wall
   * meets the floor in a perfectly clean line, which is the fastest way to make
   * a set look like a set.
   */
  private buildGroundDressing(): void {
    const rng = this.rng;
    const m = new THREE.Matrix4();

    // Drift along the street-facing building line and the compound walls.
    for (const side of [-1, 1]) {
      let z = -54;
      while (z < 56) {
        const len = rng.range(3.5, 9);
        if (rng.next() < 0.78) {
          const h = rng.range(0.22, 0.55);
          const dep = h * rng.range(2.6, 4.0);
          const geo = prism(driftProfile(dep, h), len, 3.0, 'x');
          const q = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0), side > 0 ? 0 : Math.PI,
          );
          m.compose(
            new THREE.Vector3(side * (FRONT_X - 0.18) - side * dep / 2, 0.0, z + len / 2),
            q, new THREE.Vector3(1, 1, 1),
          );
          this.push('sand', geo, m);
          geo.dispose();
        }
        z += len + rng.range(0.5, 3.5);
      }
    }

    // Drift along the perimeter wall, and against the far side of the blocks.
    for (const [axis, sign] of [['x', -1], ['x', 1], ['z', -1], ['z', 1]] as const) {
      for (let i = 0; i < 12; i++) {
        const off = -58 + i * 10 + rng.range(-2, 2);
        const len = rng.range(4, 9);
        const h = rng.range(0.3, 0.75);
        const dep = h * rng.range(2.8, 4.2);
        const geo = prism(driftProfile(dep, h), len, 3.0, axis === 'x' ? 'z' : 'x');
        const q = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          axis === 'x' ? (sign > 0 ? -Math.PI / 2 : Math.PI / 2) : (sign > 0 ? Math.PI : 0),
        );
        const pos = axis === 'x'
          ? new THREE.Vector3(sign * (60 - 0.2 - dep / 2), 0, off)
          : new THREE.Vector3(off, 0, sign * (60 - 0.2 - dep / 2));
        m.compose(pos, q, new THREE.Vector3(1, 1, 1));
        this.push('sand', geo, m);
        geo.dispose();
      }
    }

    // Sand encroaching on the carriageway.
    //
    // This is the single most useful tonal move on the map. The market street
    // runs north–south and the morning sun is low in the east, so the whole
    // fourteen-metre carriageway sits in the shadow of the east building row for
    // the entire scenario. Aged tarmac measures about 0.15 reflectance; dry sand
    // measures 0.4 to 0.6. On a surface lit by sky alone that is the difference
    // between a black hole across the bottom of every street shot and a floor you
    // can read the camber of. It is also exactly what happens to a desert road
    // nobody has swept in thirty years: the gutter silts up first, then tongues
    // of it reach out across the crown, then a whole stretch goes under.
    // Coverage matters as much as shape. At forty-odd tongues the sand closed
    // over the whole carriageway and both pavements, and once everything is sand
    // the road/kerb/pavement transition — one of the things this pass exists to
    // fix — has nothing left to read against. Two dozen tongues, mostly reaching
    // a third to a half of the way out, leaves the crown showing.
    //
    // Reviewed again at twenty-five tongues the problem had inverted: each
    // tongue is a scalloped outline, and twenty-five of them overlapping at
    // four-metre spacing is not a drift, it is a rash of pale blotches with no
    // scale to it — from a standing eye it looked like torn paper scattered on
    // the road. Fourteen, longer and further apart, gives the same coverage in
    // shapes big enough to read as sand.
    //
    // And then a third time, which is what settled it. Every review camera on
    // this map has its eye 3.34 m up — the harness plants the player at 1.72 m
    // and adds eye height on top — so the ground is being looked at from
    // first-floor level at twenty to thirty degrees. At that incidence an area
    // drift presents its top face to the lens no matter how well its boundary is
    // handled, and a top face is a flat quad: the tongues were rendering as pale
    // card, and so was every sand lens on the apron and the roofs.
    //
    // A drift that reads from above has to be *linear*. Sand creeps onto a road
    // in fingers that follow the wind down the street, and a finger 600 mm wide
    // and four metres long is seen end-on: one flank takes the sun, the other
    // does not, so it has a highlight, a shadow and a crest line instead of an
    // outline. Same volume of sand, same tonal lift on the tarmac, and it reads
    // as drift from a standing eye, from a window and from a roof.
    for (let i = 0; i < 14; i++) {
      const z = -52 + i * 7.7 + rng.range(-2.0, 2.0);
      const sx = rng.next() < 0.5 ? -1 : 1;
      // Only on tarmac. The apron north of here is already packed earth at
      // roughly sand's own reflectance, so a tongue there buys no tone and costs
      // a hard pale outline on a surface that had none.
      if (z > APRON_Z0 - 2) continue;
      const reach = rng.range(2.4, ROAD_HALF * rng.range(0.55, 1.25));
      const len = rng.range(4.0, 8.5);
      // A drift is a body with fingers, not a comb of them.
      //
      // Stepping out from the kerb at a fixed pitch put ribs at 850 mm centres
      // all the way across, and a set of equally spaced parallel bars of equal
      // width on a dark road is read as paint, not as sand — which is exactly
      // how the last review capture came back. Real drift is continuous where
      // it is deep, near the kerb, and only separates into fingers as it
      // thins. So the pitch opens up with distance from the kerb: at the
      // gutter the ribs are wider than their spacing and merge into one body,
      // by the crown they are half the width at three times the spacing and a
      // third of them are missing.
      let out = rng.range(0.1, 0.4);
      let guard = 0;
      while (out < reach && guard++ < 24) {
        const t = out / reach;
        const fx = sx * (ROAD_HALF - 0.25 - out);
        const pitch = 0.34 + t * t * 1.5;
        const fw = rng.range(0.42, 0.95) * (1 - t * 0.45);
        out += pitch * rng.range(0.7, 1.35);
        // Gaps only open up away from the kerb.
        if (rng.next() < t * 0.45) continue;
        const fl = len * (1 - t * 0.55) * rng.range(0.55, 1.1);
        if (fl < 0.8) continue;
        const fh = (0.05 + 0.08 * (1 - t)) * rng.range(1.1, 1.9);
        const geo = prism(
          duneProfile(fw, fh, rng.range(0.32, 0.62)), fl, 2.0, 'z',
        );
        m.compose(
          new THREE.Vector3(
            fx,
            groundY(fx, z) + 0.004,
            z + rng.range(-len * 0.3, len * 0.3),
          ),
          new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0), rng.range(-0.16, 0.16),
          ),
          new THREE.Vector3(1, 1, 1),
        );
        this.push('sand', geo, m, FLAT);
        geo.dispose();
      }
      // A film of dust under the whole reach. Sand on tarmac is a threefold
      // jump in reflectance and every rib was drawing its own hard outline
      // against the road; a mid-value stain underneath gives each one a margin
      // to die into, and it is what the ground actually looks like around a
      // drift that traffic has been through.
      for (let k = 0; k < 3; k++) {
        const sw = reach * rng.range(0.5, 0.95);
        const sxm = sx * (ROAD_HALF - 0.3 - sw / 2 - rng.range(0, reach - sw) * 0.6);
        m.compose(
          new THREE.Vector3(sxm, groundY(sxm, z) - 0.002, z + rng.range(-len * 0.3, len * 0.3)),
          new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0), rng.range(-0.1, 0.1),
          ),
          new THREE.Vector3(1, 1, 1),
        );
        const geo = patchDisc(
          sw / 2, (len * rng.range(0.7, 1.15)) / 2, 0.02, () => rng.next(),
          { sides: 12, wobble: 0.4, shoulder: 0.5, tile: 3.0 },
        );
        this.push('dirt', geo, m, FLAT);
        geo.dispose();
      }
      // The gutter drift itself, banked against the kerb.
      const geo = prism(driftProfile(rng.range(0.9, 1.7), rng.range(0.14, 0.3)), len * 1.1, 3.0, 'z');
      const q = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0), sx > 0 ? -Math.PI / 2 : Math.PI / 2,
      );
      m.compose(
        new THREE.Vector3(sx * (ROAD_HALF - 0.5), groundY(sx * (ROAD_HALF - 0.5), z), z),
        q, new THREE.Vector3(1, 1, 1),
      );
      this.push('sand', geo, m);
      geo.dispose();
    }
    // Stretches where it has closed over the road entirely, with a pair of tyre
    // ruts worn back through to the surface.
    for (const [z, len] of [[-30, 7.0], [-4, 5.5], [24, 6.5]] as Array<[number, number]>) {
      // Ridged rather than laid as an area — a fourteen by six metre sand field
      // as one slab is the largest flat quad it is possible to put on this map —
      // but at an irregular pitch, so it does not turn into a barcode either.
      let bx = -ROAD_HALF + 0.3;
      let guard = 0;
      // Narrower ribs than the street shot alone would want.
      //
      // A rib is only read as a ridge from a camera looking along it. The alley
      // overlook looks across the street, so it sees these broadside from 3.3 m
      // up — presenting their tops, which is the flat pale quad this shape exists
      // to avoid. Width is the whole of the difference: at 1.3 m across, a top
      // occupies enough of the frame to read as a plate; at 750 mm there is not
      // enough of it for the eye to call it a surface, from any angle.
      while (bx < ROAD_HALF - 0.3 && guard++ < 34) {
        const bw = rng.range(0.3, 0.75);
        const bl = len * rng.range(0.55, 1.1);
        const geo = prism(
          duneProfile(bw, rng.range(0.09, 0.24), rng.range(0.3, 0.66)), bl, 2.0, 'z',
        );
        m.compose(
          new THREE.Vector3(bx, groundY(bx, z) + 0.004, z + rng.range(-1.3, 1.3)),
          new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0), rng.range(-0.13, 0.13),
          ),
          new THREE.Vector3(1, 1, 1),
        );
        this.push('sand', geo, m, FLAT);
        geo.dispose();
        // Overlapping in the middle where the drift is deepest, separating at
        // the edges where it runs out.
        bx += bw * rng.range(0.55, 1.35);
      }
      for (const rut of [-1, 1]) {
        // Worn in short broken lengths with feathered ends. A rut is where the
        // wheels have been, not a painted stripe, and a single six-metre box has
        // two hard ends and two hard sides that say otherwise.
        const laps = 4;
        for (let k = 0; k < laps; k++) {
          const t = -len / 2 + (len * (k + 0.5)) / laps;
          const rx = rut * 0.85 + rng.range(-0.08, 0.08);
          m.makeTranslation(rx, groundY(rx, z + t) + 0.06, z + t);
          const geo = patchDisc(
            rng.range(0.26, 0.36), (len / laps) * rng.range(0.55, 0.72), 0.04,
            () => rng.next(), { sides: 8, wobble: 0.3, shoulder: 0.62, tile: 2.4 },
          );
          this.push('dirt', geo, m, FLAT);
          geo.dispose();
        }
      }
      // A ridge where the drift crest sits, so it is not a flat mat.
      for (const edge of [-1, 1]) {
        const geo = prism(driftProfile(1.3, rng.range(0.16, 0.28)), len, 3.0, 'x');
        const q = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0), edge > 0 ? Math.PI : 0,
        );
        m.compose(
          new THREE.Vector3(0, groundY(0, z) + 0.03, z + edge * len / 2),
          q, new THREE.Vector3(1, 1, 1),
        );
        this.push('sand', geo, m);
        geo.dispose();
      }
    }

    // Spoil fans spilling out of the shelled buildings onto the street.
    const fans: Array<[number, number, number]> = [
      [-14.6, -22, 3.2], [15.2, -22, 3.6], [-14.6, 46, 2.4], [-38.6, -12, 3.0], [38.6, 24, 2.8],
    ];
    for (const [fx, fz, rad] of fans) {
      const n = Math.round(rad * 13);
      for (let i = 0; i < n; i++) {
        const a = rng.range(-1.2, 1.2) + (fx < 0 ? Math.PI : 0);
        const rr = Math.sqrt(rng.next()) * rad;
        const px = fx + Math.cos(a) * rr;
        const pz = fz + Math.sin(a) * rr * 1.4;
        const sz = rng.range(0.1, 0.42) * (1 - (rr / rad) * 0.55);
        const geo = new THREE.BoxGeometry(sz * rng.range(0.8, 1.7), sz * rng.range(0.35, 0.9), sz * rng.range(0.8, 1.7));
        scaleUV(geo, sz, sz, sz, 0.9);
        const q = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(rng.range(-0.45, 0.45), rng.range(0, 6.28), rng.range(-0.45, 0.45)),
        );
        m.compose(
          new THREE.Vector3(px, sz * 0.32 + (1 - rr / rad) * 0.26, pz),
          q, new THREE.Vector3(1, 1, 1),
        );
        this.push(rng.next() < 0.62 ? 'rubble' : 'concrete', geo, m);
        geo.dispose();
      }
    }

    this.buildStreetLitter();
  }

  /**
   * Loose material on the carriageway, at heights the light can actually find.
   *
   * Everything else laid on this floor — drifts, patches, ruts, markings, joints
   * — is between 30 and 150 mm tall on a footprint of one to three metres. From a
   * 1.7 m eye looking seven metres up the street the ground is running away at
   * about twelve degrees, and at that incidence a 100 mm rise over a two-metre
   * base turns the surface normal through five or six degrees, which under one
   * sun is no change in value whatsoever. So all of that work reads as *pattern*:
   * pale shapes on a dark floor, correctly shaped, and completely flat. Reviewing
   * the captures it looked like spilled paint.
   *
   * What makes a real street floor read is the stuff standing on it. A 250 mm
   * lump of blockwork has a lit face, a shaded face and a shadow on the ground
   * beside it, so it establishes the direction of the light and the scale of
   * everything around it, and three of them together tell you the floor is
   * horizontal. This pass is that, and it is placed the way loose material
   * actually distributes: banked in the gutters and against anything standing,
   * swept off the crown by traffic, heaviest where the buildings are broken.
   */
  private buildStreetLitter(): void {
    const rng = this.rng;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const one = new THREE.Vector3(1, 1, 1);

    // Clumped, not sprinkled. Loose material comes to rest in groups against
    // whatever stopped it, and a group of six is visible where six singles
    // scattered over the same forty square metres are not.
    //
    // Count matters more than it looks. Forty-six clumps of three to seven put
    // roughly two objects on every metre of street, and reviewing that capture
    // the carriageway had stopped reading as a street at all — it was a debris
    // field, and a debris field is the same amateur tell as an empty road,
    // because the eye cannot find a path through it. A market street is *swept*:
    // the middle is where carts go, so it is comparatively clear, and everything
    // loose ends up banked at the edges. Twenty-six clumps at 85 % gutter is
    // about a fifth of the material on the crown that there was before.
    const clumps = 26;
    for (let c = 0; c < clumps; c++) {
      const z = -54 + (c / clumps) * 110 + rng.range(-2.2, 2.2);
      // Gutters get most of it, the crown gets what has been kicked out there.
      const gutter = rng.next() < 0.85;
      const sx = rng.next() < 0.5 ? -1 : 1;
      const cxp = gutter
        ? sx * (ROAD_HALF - rng.range(0.2, 2.0))
        : rng.range(-ROAD_HALF + 2, ROAD_HALF - 2);
      const spread = gutter ? rng.range(0.7, 1.5) : rng.range(1.0, 1.8);
      const n = rng.int(3, 7);
      for (let i = 0; i < n; i++) {
        const px = cxp + rng.range(-spread, spread);
        const pz = z + rng.range(-spread * 1.6, spread * 1.6);
        if (Math.abs(px) > ROAD_HALF + PAVE_W - 0.4) continue;
        const gy = groundY(px, pz);
        const r = rng.next();
        if (r < 0.4) {
          // Block or slab fragment: the workhorse. Cuboid, tipped over, so it has
          // two faces at different angles and a shadow.
          const s1 = rng.range(0.14, 0.36);
          const geo = new THREE.BoxGeometry(
            s1 * rng.range(0.9, 1.9), s1 * rng.range(0.4, 0.85), s1 * rng.range(0.7, 1.3),
          );
          scaleUV(geo, s1, s1, s1, 0.9);
          q.setFromEuler(new THREE.Euler(rng.range(-0.4, 0.4), rng.range(0, 6.28), rng.range(-0.4, 0.4)));
          m.compose(new THREE.Vector3(px, gy + s1 * 0.28, pz), q, one);
          this.push(r < 0.16 ? 'concrete' : r < 0.3 ? 'rubble' : 'brick', geo, m);
          geo.dispose();
        } else if (r < 0.58) {
          // Length of broken kerb or a lump of the pavement, on its side. The
          // limewash on it is what says it came off a kerb rather than a wall.
          const kl = rng.range(0.4, 1.0);
          q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng.range(0, 3.14));
          q.multiply(new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(1, 0, 0), rng.range(-0.5, 0.5),
          ));
          m.compose(new THREE.Vector3(px, gy + 0.09, pz), q, one);
          const geo = new THREE.BoxGeometry(0.22, 0.17, kl);
          scaleUV(geo, 0.22, 0.17, kl, 1.4);
          this.push('concrete', geo, m, rng.next() < 0.5 ? LIME : undefined);
          geo.dispose();
        } else if (r < 0.72) {
          // Sheet of corrugated iron, one end up on a block. Flat on the floor
          // it was invisible as geometry and highly visible as a pale rectangle;
          // propped at twenty-five to forty degrees it has a lit face, a dark
          // triangle of shadow underneath, and a silhouette against the road.
          const sw = rng.range(0.5, 1.0);
          const sl = rng.range(0.7, 1.4);
          const tilt = rng.range(0.42, 0.72);
          const prop = 0.16;
          m.makeTranslation(px, gy + prop / 2, pz);
          this.box('rubble', 0.26, prop, 0.22, m, 0.8);
          q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng.range(0, 6.28));
          q.multiply(new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(1, 0, 0), tilt,
          ));
          // Hinge the sheet about its low edge so it sits on the ground there
          // and on the block at the other, rather than floating at mid-height.
          const lift = Math.sin(tilt) * sl / 2;
          m.compose(new THREE.Vector3(px, gy + lift + 0.03, pz), q, one);
          const geo = new THREE.BoxGeometry(sw, 0.035, sl);
          scaleUV(geo, sw, 0.035, sl, 1.8);
          this.push('corrugated', geo, m);
          geo.dispose();
        } else if (r < 0.86) {
          // A heap: swept sand and grit with the lumps left in it. Given real
          // height so it casts, unlike the drifts, which are surface.
          const hr = rng.range(0.2, 0.42);
          const heap = bagGeometry(hr, rng.range(0.09, 0.19), hr * rng.range(0.7, 1.1));
          q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng.range(0, 3.14));
          m.compose(new THREE.Vector3(px, gy, pz), q, one);
          this.push('sand', heap, m);
          heap.dispose();
          for (let k = 0; k < 3; k++) {
            const bs = rng.range(0.07, 0.15);
            m.makeTranslation(px + rng.range(-hr, hr), gy + bs * 0.4, pz + rng.range(-hr, hr));
            this.box('rubble', bs * 1.5, bs, bs, m, 0.6);
          }
        } else {
          // Crate boards, but stacked and tied rather than strewn. Loose 28 mm
          // boards lying flat on the road were the worst offender in the review
          // captures: at eye height they have no thickness, no shadow and no
          // silhouette, so ninety of them across the map read as sheets of paper
          // dropped on the floor. Four of them squared up into a 150 mm bundle
          // is one object with an edge, a top and a cast shadow, and it reads as
          // somebody's stock waiting to be collected.
          const bl = rng.range(0.6, 1.15);
          const bw = rng.range(0.16, 0.24);
          const yaw0 = rng.range(0, 3.14);
          const boards = rng.int(4, 6);
          for (let k = 0; k < boards; k++) {
            q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw0 + rng.range(-0.09, 0.09));
            m.compose(
              new THREE.Vector3(
                px + rng.range(-0.04, 0.04),
                gy + 0.018 + k * 0.032,
                pz + rng.range(-0.05, 0.05),
              ),
              q, one,
            );
            const geo = new THREE.BoxGeometry(bw, 0.03, bl);
            scaleUV(geo, bw, 0.03, bl, 1.0);
            this.push('woodCrate', geo, m);
            geo.dispose();
          }
          // One board slid off the top, on the diagonal, so the bundle is not a
          // machined block.
          q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw0 + rng.range(0.5, 1.1));
          q.multiply(new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(1, 0, 0), rng.range(0.12, 0.3),
          ));
          m.compose(new THREE.Vector3(px + rng.range(0.1, 0.3), gy + 0.1, pz), q, one);
          const slid = new THREE.BoxGeometry(bw, 0.03, bl * 0.9);
          scaleUV(slid, bw, 0.03, bl, 1.0);
          this.push('woodCrate', slid, m);
          slid.dispose();
        }
      }
    }
  }

  private buildPerimeter(): void {
    const m = new THREE.Matrix4();
    const h = 3.4;
    const t = 0.4;
    const half = 60;

    // Segmented perimeter wall with gaps and collapsed sections, so it reads
    // as a real edge of town rather than a box. The run in front of the gate is
    // left out entirely: the whole point of the gate is that you can see the
    // desert through it, and a wall 600 mm behind the opening would turn the
    // map's longest sightline into a dead end.
    const gateGap = ROAD_HALF + 1.1;
    for (const [axis, sign] of [['x', -1], ['x', 1], ['z', -1], ['z', 1]] as const) {
      const segments = 14;
      const segLen = (half * 2) / segments;
      for (let i = 0; i < segments; i++) {
        const off = -half + segLen * (i + 0.5);
        const r = this.rng.next();
        if (r < 0.1) continue;
        // Clear the carriageway on both ends of the main street.
        if (axis === 'z' && Math.abs(off) - segLen / 2 < gateGap) continue;
        const segH = r < 0.24 ? h * this.rng.range(0.3, 0.65) : h;
        if (axis === 'x') {
          m.makeTranslation(sign * half, segH / 2, off);
          this.box('concrete', t, segH, segLen * 0.995, m, 4);
        } else {
          m.makeTranslation(off, segH / 2, sign * half);
          this.box('concrete', segLen * 0.995, segH, t, m, 4);
        }
      }
      // Return the wall into a squared-off end at each side of the opening.
      if (axis === 'z') {
        for (const sx of [-1, 1]) {
          m.makeTranslation(sx * (gateGap + 0.9), h / 2, sign * half);
          this.box('concrete', 1.8, h, t + 0.5, m, 4);
          m.makeTranslation(sx * (gateGap + 0.9), h + 0.16, sign * half);
          this.box('concrete', 2.1, 0.32, t + 0.8, m, 3);
        }
      }
    }

    // The southern end is walled, but breached where a vehicle went through it.
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        const bs = this.rng.range(0.4, 1.0);
        m.makeTranslation(
          sx * (gateGap + this.rng.range(1.6, 5.0)),
          bs * 0.4,
          -half + this.rng.range(-1.6, 2.4),
        );
        this.box('rubble', bs * 1.4, bs * 0.7, bs * 1.3, m, 1.2);
      }
    }

    // ---- what the arch frames ----
    //
    // The market street is the longest sightline on the map and the sabat at
    // z = 48 frames it, so whatever sits in that opening is the most looked-at
    // thing in the level. Tracing the review camera through it, the answer was:
    // a compound box at 44 m and a background silhouette block at 77 m, both of
    // them untouched cuboids. The arch was framing a blank wall.
    //
    // Only a narrow band of it is even visible — the arch soffit crops everything
    // above about nineteen metres at that range — so height is wasted here and
    // what pays is anything that gives the ground plane depth. The road carries
    // on out of the gate, the pole line goes with it, and the compounds get the
    // parapets, openings and roof clutter that make a box read as a building.
    for (let i = 0; i < 12; i++) {
      const z0 = 62 + i * 4.2;
      m.makeTranslation(this.rng.range(-0.6, 0.6), 0.03, z0);
      this.box('dirt', ROAD_HALF * 2 * this.rng.range(0.82, 1.0), 0.06, 4.2, m, 6);
      // Verge stones either side, which is what actually marks a desert road.
      for (const sx of [-1, 1]) {
        if (this.rng.next() < 0.35) continue;
        const bs = this.rng.range(0.2, 0.45);
        m.makeTranslation(
          sx * (ROAD_HALF + this.rng.range(0.2, 1.6)), bs * 0.35, z0 + this.rng.range(-1.8, 1.8),
        );
        this.box('rubble', bs * 1.5, bs * 0.7, bs, m, 1.0);
      }
    }
    // The pole line running out of town: six verticals at a known spacing is the
    // cheapest and strongest depth cue there is down a straight road.
    {
      const poles: THREE.Vector3[] = [];
      for (let i = 0; i < 7; i++) {
        const pz = 64 + i * 7.5;
        const px = (i % 2 === 0 ? 1 : -1) * (ROAD_HALF + 1.3);
        const ph = this.rng.range(7.0, 8.4);
        const pole = cyl(0.11, 0.15, ph, 6, 1.4);
        m.makeTranslation(px, ph / 2, pz);
        this.push('wood', pole, m);
        pole.dispose();
        const arm = 1.5;
        m.makeTranslation(px, ph - 0.5, pz);
        this.box('wood', arm, 0.11, 0.11, m, 1.0);
        poles.push(new THREE.Vector3(px, ph - 0.55, pz));
      }
      for (let i = 0; i + 1 < poles.length; i++) {
        for (const off of [-0.5, 0.5]) {
          const a = poles[i].clone().add(new THREE.Vector3(off, 0, 0));
          const b = poles[i + 1].clone().add(new THREE.Vector3(off, 0, 0));
          const cable = slackCable(a, b, 0.075, 0.022, 9);
          m.identity();
          this.push('polymerBlack', cable, m, FLAT);
          cable.dispose();
        }
      }
    }
    // Compounds outside the gate, detailed enough to read at forty metres.
    for (const [ox, oz, ow, oh] of [
      [-13, 70, 11, 4.4], [12, 74, 13, 5.6], [-4, 84, 15, 3.8],
      [20, 66, 9, 3.4], [-24, 78, 12, 5.0],
    ]) {
      const od = ow * 0.8;
      const key: MaterialKey = this.rng.next() < 0.5 ? 'plaster' : 'concrete';
      m.makeTranslation(ox, oh / 2 - 0.4, oz);
      this.box(key, ow, oh, od, m, 5);
      m.makeTranslation(ox, oh + 0.2 - 0.4, oz);
      this.box('concrete', ow + 0.4, 0.4, od + 0.4, m, 3);
      // A stepped block over part of the plan, so the roofline has a corner in it.
      const uw = ow * this.rng.range(0.35, 0.6);
      const uh = this.rng.range(1.6, 3.0);
      const uox = this.rng.range(-ow / 4, ow / 4);
      m.makeTranslation(ox + uox, oh + uh / 2 - 0.4, oz + this.rng.range(-od / 6, od / 6));
      this.box(key, uw, uh, od * this.rng.range(0.4, 0.7), m, 5);
      m.makeTranslation(ox + uox, oh + uh + 0.18 - 0.4, oz);
      this.box('concrete', uw + 0.34, 0.36, od * 0.62, m, 3);
      // Openings on the face that looks back down the road. Dark recesses, not
      // holes: at this range a window is a value, and the value has to be dark or
      // the whole elevation stays one flat field.
      const rows = Math.max(1, Math.round(oh / 2.6));
      const cols = Math.max(2, Math.round(ow / 2.4));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (this.rng.next() < 0.28) continue;
          const wx = ox - ow / 2 + (ow * (c + 0.5)) / cols;
          const wy = -0.4 + 1.1 + (r * oh) / rows;
          if (wy > oh - 0.8) continue;
          m.makeTranslation(wx, wy, oz - od / 2 - 0.03);
          this.box('plasterInterior', 0.75, 1.0, 0.16, m, 1.6);
          // Sill and a shallow head, so it is not a decal.
          m.makeTranslation(wx, wy - 0.55, oz - od / 2 - 0.08);
          this.box('concrete', 0.95, 0.1, 0.2, m, 1.2);
        }
      }
      // Doorway on the road side, and a bench of steps up to it.
      const dxo = this.rng.range(-ow / 3, ow / 3);
      m.makeTranslation(ox + dxo, -0.4 + 1.05, oz - od / 2 - 0.03);
      this.box('plasterInterior', 1.0, 2.1, 0.16, m, 1.6);
      m.makeTranslation(ox + dxo, -0.4 + 0.09, oz - od / 2 - 0.36);
      this.box('concrete', 1.5, 0.18, 0.7, m, 1.4);
      // Roof clutter as silhouette: a tank and an aerial break the parapet line.
      const tr = this.rng.range(0.4, 0.6);
      const tank = cyl(tr, tr, this.rng.range(0.9, 1.4), 10, 1.6);
      m.makeTranslation(
        ox + this.rng.range(-ow / 3, ow / 3), oh + 0.5, oz + this.rng.range(-od / 4, od / 4),
      );
      this.push(this.rng.next() < 0.5 ? 'paintedMetalTan' : 'corrugated', tank, m);
      tank.dispose();
      const mast = cyl(0.04, 0.05, this.rng.range(2.0, 3.4), 5, 0.5);
      const mx = ox + this.rng.range(-ow / 3, ow / 3);
      m.makeTranslation(mx, oh + 1.2, oz + this.rng.range(-od / 4, od / 4));
      this.push('corrugated', mast, m);
      mast.dispose();
      // Compound wall running out from the building, with a gate in it.
      const wallLen = this.rng.range(5, 11);
      const wSide = this.rng.next() < 0.5 ? -1 : 1;
      const segs = Math.max(3, Math.round(wallLen / 2.2));
      for (let sI = 0; sI < segs; sI++) {
        if (this.rng.next() < 0.18) continue;
        const sl = (wallLen / segs) * 0.98;
        const sxp = ox + wSide * (ow / 2 + (wallLen * (sI + 0.5)) / segs);
        const sh = this.rng.range(1.9, 2.6);
        m.makeTranslation(sxp, sh / 2 - 0.4, oz - od / 2 + 0.2);
        this.box(key, sl, sh, 0.3, m, 4);
        m.makeTranslation(sxp, sh - 0.4 + 0.08, oz - od / 2 + 0.2);
        this.box('concrete', sl, 0.16, 0.44, m, 2.4);
      }
    }

    // ---- town gate closing the north end of the market street ----
    this.buildGate(59.4);

    // Ring of distant silhouette buildings outside the play space.
    //
    // Rewritten because the repeat was readable across the skyline in two review
    // captures. The old version was one box, optionally a smaller box on top of
    // it, optionally a tower: three shapes, and since the box is by far the most
    // likely outcome the horizon came out as a run of rectangles with flat tops
    // at four or five heights. Distance does not hide that — it *reveals* it,
    // because at 120 m all you have left of a building is its silhouette, so the
    // silhouette is the only thing that can carry the variation.
    //
    // So the massing is assembled instead: two to four blocks per plot with real
    // setbacks, an L or a U as often as a slab, a stair head-house or a water
    // tank on a third of them, and an aerial on a few. All of it goes through the
    // same two batches as before, so it is triangles and not draw calls, and at
    // this distance nothing needs more than a box.
    const rng = new RNG(777);
    for (let i = 0; i < 74; i++) {
      const ang = (i / 74) * Math.PI * 2 + rng.range(-0.05, 0.05);
      const dist = rng.range(76, 195);
      const bw = rng.range(8, 26);
      const bd = rng.range(8, 26);
      const bh = rng.range(4, 17);
      const sx = Math.sin(ang) * dist;
      const sz = Math.cos(ang) * dist;
      const key = rng.next() < 0.5 ? 'plaster' : 'concrete';
      const yaw = ang + rng.range(-0.5, 0.5);
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      const one = new THREE.Vector3(1, 1, 1);
      /** Places a block in the plot's own frame, so the whole mass turns as one. */
      const blk = (
        ox: number, oy: number, oz: number, kw: number, kh: number, kd: number,
        k: MaterialKey = key,
      ): void => {
        if (kw < 0.4 || kd < 0.4 || kh < 0.4) return;
        const geo = new THREE.BoxGeometry(kw, kh, kd);
        scaleUV(geo, kw, kh, kd, 5);
        m.compose(
          new THREE.Vector3(
            sx + ox * Math.cos(yaw) + oz * Math.sin(yaw),
            oy - 1.5,
            sz - ox * Math.sin(yaw) + oz * Math.cos(yaw),
          ),
          q, one,
        );
        this.push(k, geo, m);
        geo.dispose();
      };

      const plan = rng.next();
      if (plan < 0.3) {
        // L-plan: a long wing and a short one at right angles, at two heights.
        const armW = bw * rng.range(0.32, 0.5);
        const armD = bd * rng.range(0.32, 0.5);
        const h2 = bh * rng.range(0.55, 0.92);
        blk(-(bw - armW) / 2, bh / 2, 0, armW, bh, bd);
        blk(armW / 2, h2 / 2, -(bd - armD) / 2, bw - armW, h2, armD);
      } else if (plan < 0.5) {
        // Slab with a deep setback on one side: two steps in the roofline.
        const front = bd * rng.range(0.4, 0.62);
        const h2 = bh * rng.range(0.5, 0.8);
        blk(0, bh / 2, (bd - front) / 2 - front / 2, bw, bh, bd - front);
        blk(rng.range(-bw * 0.1, bw * 0.1), h2 / 2, bd / 2 - front / 2, bw * rng.range(0.7, 1.0), h2, front);
      } else if (plan < 0.66) {
        // Terrace: three narrow houses of different heights sharing party walls,
        // which is what most of a town this size actually is.
        const n = rng.int(3, 4);
        let at = -bw / 2;
        for (let k = 0; k < n; k++) {
          const uw = (bw / n) * rng.range(0.75, 1.3);
          const uh = bh * rng.range(0.55, 1.15);
          blk(at + uw / 2, uh / 2, rng.range(-bd * 0.06, bd * 0.06), uw, uh, bd * rng.range(0.8, 1.0),
            rng.next() < 0.5 ? 'plaster' : 'concrete');
          at += uw;
        }
      } else {
        // Plain mass, but stepped twice rather than once.
        blk(0, bh / 2, 0, bw, bh, bd);
        const uh = rng.range(2, 6);
        blk(
          rng.range(-bw / 5, bw / 5), bh + uh / 2, rng.range(-bd / 5, bd / 5),
          bw * rng.range(0.4, 0.75), uh, bd * rng.range(0.4, 0.75),
        );
        if (rng.next() < 0.45) {
          const th = rng.range(1.6, 3.4);
          blk(rng.range(-bw / 4, bw / 4), bh + uh + th / 2, rng.range(-bd / 4, bd / 4),
            bw * rng.range(0.2, 0.4), th, bd * rng.range(0.2, 0.4));
        }
      }
      // A tower on some of them, as before.
      if (rng.next() < 0.24) {
        const th = rng.range(6, 14);
        blk(rng.range(-bw / 3, bw / 3), bh + th / 2, rng.range(-bd / 3, bd / 3),
          rng.range(2.2, 3.6), th, rng.range(2.2, 3.6), 'plaster');
      }
      // Silhouette breaks on the roofline. These are what stop a distant roof
      // being a straight line: a stair head-house, a water tank on its stand and
      // the odd aerial, all of them under three metres and all of them boxes.
      const roofY = bh + rng.range(0, 1.5);
      if (rng.next() < 0.45) {
        const hw = rng.range(1.8, 3.2);
        blk(rng.range(-bw / 3, bw / 3), roofY + 1.2, rng.range(-bd / 3, bd / 3), hw, 2.4, hw * rng.range(0.7, 1.2));
      }
      if (rng.next() < 0.5) {
        const tx = rng.range(-bw / 3, bw / 3);
        const tz = rng.range(-bd / 3, bd / 3);
        blk(tx, roofY + 0.5, tz, 1.5, 1.0, 1.5, 'concrete');
        blk(tx, roofY + 1.6, tz, 1.15, 1.2, 1.15, 'paintedMetalTan');
      }
      if (rng.next() < 0.35) {
        const mh = rng.range(3.0, 6.5);
        blk(rng.range(-bw / 2.4, bw / 2.4), roofY + mh / 2, rng.range(-bd / 2.4, bd / 2.4),
          0.22, mh, 0.22, 'corrugated');
      }
    }

    // Minarets: two near enough to read as architecture, the rest as skyline.
    this.buildMinaret(-40, 47, 19.5, true);
    this.buildMinaret(52, -46, 16.5, true);
    // One on the axis of the gate. The view down the market street is the map's
    // longest, and it needs something at the end of it: without a vertical to
    // land on, the haze turns the far distance into a flat white gap.
    this.buildMinaret(11, 76, 24, false);
    for (const [mx, mz, mh] of [[-96, 24, 22], [88, 62, 20], [-24, -118, 24], [128, -40, 18]]) {
      this.buildMinaret(mx, mz, mh, false);
    }
  }

  /**
   * A masonry gate across the head of the market street: two towers, a pointed
   * relieving arch and a walkway over the top. It closes the long sightline
   * with something built rather than with the edge of the terrain.
   */
  private buildGate(z: number): void {
    const m = new THREE.Matrix4();
    const openHalf = ROAD_HALF + 0.4;
    const towerW = 4.4;
    const towerH = 9.5;
    const depth = 3.2;

    for (const sx of [-1, 1]) {
      const cx = sx * (openHalf + towerW / 2);
      m.makeTranslation(cx, towerH / 2, z);
      this.box('plaster', towerW, towerH, depth, m, 4.5);
      // Battered base and a crowning band.
      const skirt = prism(
        [[0, 0], [0.34, 0.0], [0.16, 1.5], [0, 1.5]],
        towerW + 0.68, 3.0, 'x',
      );
      for (const sz2 of [-1, 1]) {
        const g = prism(
          [[sz2 * 0.34, 0], [0, 0], [0, 1.5], [sz2 * 0.16, 1.5]],
          towerW, 3.0, 'x',
        );
        m.makeTranslation(cx, 0, z + sz2 * depth / 2);
        this.push('plaster', g, m);
        g.dispose();
      }
      skirt.dispose();
      m.makeTranslation(cx, towerH + 0.3, z);
      this.box('concrete', towerW + 0.6, 0.6, depth + 0.6, m, 3);
      // Crenellations.
      const n = 5;
      for (let i = 0; i < n; i++) {
        const t = -towerW / 2 + (towerW * (i + 0.5)) / n;
        for (const sz2 of [-1, 1]) {
          m.makeTranslation(cx + t, towerH + 1.05, z + sz2 * (depth / 2 + 0.1));
          this.box('plaster', towerW / n * 0.6, 0.9, 0.36, m, 2.0);
        }
      }
    }

    // Spanning wall with a relieving arch cut through it.
    const spanTop = 9.5;
    const springY = 5.4;
    const r = openHalf;
    // Segmental, not semicircular: a half-round on a 7.8 m half-span would crown
    // at 13.2 m, well above the 9.5 m parapet, so the arch would never close and
    // the gateway would read as a slot with two towers beside it.
    const rise = 3.1;
    const slices = 7;
    for (let i = 0; i < slices; i++) {
      const y0 = springY + (rise * i) / slices;
      const y1 = springY + (rise * (i + 1)) / slices;
      const tNorm = ((y0 + y1) / 2 - springY) / rise;
      const half = openHalf * Math.sqrt(Math.max(0, 1 - tNorm * tNorm));
      const segW = openHalf - half;
      if (segW > 0.02) {
        for (const sx of [-1, 1]) {
          m.makeTranslation(sx * (half + segW / 2), (y0 + y1) / 2, z);
          this.box('plaster', segW, y1 - y0, depth, m, 4.5);
        }
      }
    }
    const crown = springY + rise;
    if (spanTop > crown) {
      m.makeTranslation(0, (crown + spanTop) / 2, z);
      this.box('plaster', openHalf * 2, spanTop - crown, depth, m, 4.5);
    }
    const ring = archRing(r, rise, {
      stones: 17, thickness: 0.46, depth: depth + 0.16, jitter: 0.06,
      joint: 0.05, tile: 1.6, keystone: 0.22, rand: () => this.rng.next(),
    });
    m.makeTranslation(0, springY, z);
    this.push('concrete', ring, m);
    ring.dispose();
    m.makeTranslation(0, spanTop + 0.3, z);
    this.box('concrete', openHalf * 2 + 0.8, 0.6, depth + 0.8, m, 3);
  }

  /**
   * The minaret: the one vertical landmark on the map, and the only piece of
   * cultural identity in the skyline.
   *
   * It was a tapered tan box with two darker bands and a flat top, and the
   * review was right that that is the worst asset in the frame given what it is
   * being asked to do. A minaret is read from its *profile* at 200 m, and the
   * profile is a sequence: plinth, shaft, corbelled gallery on brackets, railed
   * balcony, a set-back upper shaft with openings, then a lantern under a small
   * dome with a finial on it. Every one of those is a horizontal step in the
   * silhouette, and it is the steps that make it a minaret rather than a
   * chimney.
   */
  private buildMinaret(x: number, z: number, h: number, detailed: boolean): void {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const one = new THREE.Vector3(1, 1, 1);
    const base = 3.4;
    const shaft = base * 0.72;
    const lod = detailed ? 1 : 0;

    // ---- plinth and lower shaft ----
    m.makeTranslation(x, 0.9, z);
    this.box('concrete', base + 1.0, 1.8, base + 1.0, m, 4.0);
    m.makeTranslation(x, 1.9, z);
    this.box('concrete', base + 0.66, 0.3, base + 0.66, m, 3.0);
    const lowH = h * 0.52;
    m.makeTranslation(x, 2.05 + lowH / 2, z);
    this.box('plaster', base, lowH, base, m, 4.5);

    // ---- gallery: corbel course, floor slab, and a railed balcony ----
    const galY = 2.05 + lowH;
    const brackets = 5;
    for (const [ax, az] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as Array<[number, number]>) {
      for (let i = 0; i < brackets; i++) {
        const t = (-0.5 + (i + 0.5) / brackets) * base;
        // Two-step corbel: the stone that carries the gallery is the strongest
        // shadow on the whole tower because it is the only thing that
        // overhangs.
        for (const [outAt, sz] of [[0.16, 0.2], [0.32, 0.13]] as Array<[number, number]>) {
          m.makeTranslation(
            x + ax * (base / 2 + outAt / 2) + az * t,
            galY - 0.5 + (outAt > 0.2 ? 0.22 : 0),
            z + az * (base / 2 + outAt / 2) + ax * t,
          );
          this.box(
            'concrete',
            ax !== 0 ? outAt : sz + 0.24, sz, ax !== 0 ? sz + 0.24 : outAt,
            m, 1.6,
          );
        }
      }
    }
    const galW = base + 1.5;
    m.makeTranslation(x, galY + 0.02, z);
    this.box('concrete', galW, 0.3, galW, m, 3.0);
    // Balustrade: a pierced panel with a coping rail, which from below is a
    // dark slot right where the silhouette steps out.
    for (const [ax, az] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as Array<[number, number]>) {
      const px = x + ax * (galW / 2 - 0.09);
      const pz = z + az * (galW / 2 - 0.09);
      m.makeTranslation(px, galY + 0.28, pz);
      this.box('plaster', ax !== 0 ? 0.16 : galW, 0.22, ax !== 0 ? galW : 0.16, m, 2.4);
      m.makeTranslation(px, galY + 0.94, pz);
      this.box('plaster', ax !== 0 ? 0.16 : galW, 0.18, ax !== 0 ? galW : 0.16, m, 2.4);
      m.makeTranslation(px, galY + 1.06, pz);
      this.box('concrete', ax !== 0 ? 0.26 : galW + 0.1, 0.08, ax !== 0 ? galW + 0.1 : 0.26, m, 1.6);
      const posts = 9;
      for (let i = 0; i < posts; i++) {
        const t = (-0.5 + (i + 0.5) / posts) * (galW - 0.3);
        m.makeTranslation(px + az * t, galY + 0.62, pz + ax * t);
        this.box('plaster', ax !== 0 ? 0.14 : 0.11, 0.46, ax !== 0 ? 0.11 : 0.14, m, 1.0);
      }
    }
    // Loudspeaker cluster on the gallery, facing four ways — the single detail
    // that says "minaret" and not "tower".
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      const horn = cyl(0.2, 0.075, 0.44, 8, 0.5);
      q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
      q.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a));
      m.compose(
        new THREE.Vector3(x + Math.cos(a) * (shaft / 2 + 0.34), galY + 1.5, z + Math.sin(a) * (shaft / 2 + 0.34)),
        q, one,
      );
      this.push('paintedMetalTan', horn, m);
      horn.dispose();
      const bracket = cyl(0.03, 0.03, 0.4, 4, 0.3);
      q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
      q.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a));
      m.compose(
        new THREE.Vector3(x + Math.cos(a) * (shaft / 2 + 0.14), galY + 1.5, z + Math.sin(a) * (shaft / 2 + 0.14)),
        q, one,
      );
      this.push('corrugated', bracket, m);
      bracket.dispose();
    }

    // ---- upper shaft, set back, with openings on all four faces ----
    const upperH = h - (galY + 1.24);
    m.makeTranslation(x, galY + 1.24 + upperH / 2, z);
    this.box('plaster', shaft, upperH, shaft, m, 4.5);
    for (const [ax, az] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as Array<[number, number]>) {
      const oy = galY + 1.24 + upperH * 0.5;
      const ow = 0.5;
      // A round-headed light: jambs, a void, and a hood over it.
      for (const sd of [-1, 1]) {
        m.makeTranslation(
          x + ax * (shaft / 2 - 0.03) + az * sd * (ow / 2 + 0.07),
          oy, z + az * (shaft / 2 - 0.03) + ax * sd * (ow / 2 + 0.07),
        );
        this.box('concrete', ax !== 0 ? 0.12 : 0.14, upperH * 0.44, ax !== 0 ? 0.14 : 0.12, m, 1.4);
      }
      m.makeTranslation(x + ax * (shaft / 2 - 0.16), oy, z + az * (shaft / 2 - 0.16));
      this.box('plasterInterior', ax !== 0 ? 0.2 : ow, upperH * 0.4, ax !== 0 ? ow : 0.2, m, 2.0,
        { variant: 'inner' });
      m.makeTranslation(
        x + ax * (shaft / 2 + 0.02), oy + upperH * 0.23, z + az * (shaft / 2 + 0.02),
      );
      this.box('concrete', ax !== 0 ? 0.18 : ow + 0.36, 0.14, ax !== 0 ? ow + 0.36 : 0.18, m, 1.4);
    }

    // ---- lantern, dome and finial ----
    const lanY = galY + 1.24 + upperH;
    m.makeTranslation(x, lanY + 0.1, z);
    this.box('concrete', shaft + 0.42, 0.2, shaft + 0.42, m, 2.4);
    const lanH = 1.3;
    m.makeTranslation(x, lanY + 0.2 + lanH / 2, z);
    this.box('plaster', shaft * 0.8, lanH, shaft * 0.8, m, 3.0);
    // Open arcade round the lantern: four piers and a void between them, which
    // is what puts sky through the top of the tower.
    for (const [ax, az] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as Array<[number, number]>) {
      m.makeTranslation(
        x + ax * (shaft * 0.4 - 0.02), lanY + 0.28 + lanH * 0.44, z + az * (shaft * 0.4 - 0.02),
      );
      this.box('plasterInterior', ax !== 0 ? 0.1 : shaft * 0.4, lanH * 0.62, ax !== 0 ? shaft * 0.4 : 0.1,
        m, 2.0, { variant: 'inner' });
    }
    m.makeTranslation(x, lanY + 0.2 + lanH + 0.09, z);
    this.box('concrete', shaft * 0.98, 0.18, shaft * 0.98, m, 2.0);
    // Ribbed dome: a squashed hemisphere with meridian ribs on it.
    const domeR = shaft * 0.44;
    const domeY = lanY + 0.29 + lanH;
    const cap = new THREE.SphereGeometry(domeR, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
    cap.scale(1, 1.28, 1);
    const uv = cap.getAttribute('uv') as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * 2);
    m.makeTranslation(x, domeY, z);
    this.push('plaster', cap, m);
    cap.dispose();
    if (lod) {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const rib = new THREE.TorusGeometry(domeR * 1.01, 0.028, 4, 8, Math.PI * 0.5);
        rib.rotateY(Math.PI / 2);
        scaleTorusUV(rib, domeR, 0.028, 0.5);
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), a);
        m.compose(new THREE.Vector3(x, domeY, z), q, new THREE.Vector3(1, 1.28, 1));
        this.push('plaster', rib, m);
        rib.dispose();
      }
    }
    // Finial: ball, spike and crescent.
    const knob = new THREE.SphereGeometry(0.17, 8, 6);
    m.makeTranslation(x, domeY + domeR * 1.32, z);
    this.push('paintedMetalTan', knob, m);
    knob.dispose();
    const spike = cyl(0.035, 0.06, 1.3, 5, 0.5);
    m.makeTranslation(x, domeY + domeR * 1.32 + 0.66, z);
    this.push('paintedMetalTan', spike, m);
    spike.dispose();
    const crescent = new THREE.TorusGeometry(0.3, 0.045, 4, 10, Math.PI * 1.5);
    scaleTorusUV(crescent, 0.3, 0.045, 0.5);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.6);
    m.compose(new THREE.Vector3(x, domeY + domeR * 1.32 + 1.5, z), q, one);
    this.push('paintedMetalTan', crescent, m);
    crescent.dispose();

    if (!detailed) return;
    // Openings and string courses up the lower shaft, so it stands inspection
    // from the street as well as from the skyline.
    for (let i = 0; i < 4; i++) {
      const oy = 4.5 + i * ((h - 8) / 3);
      for (const [ax, az] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as Array<[number, number]>) {
        const bw = ax !== 0 ? 0.2 : 0.5;
        const bd = ax !== 0 ? 0.5 : 0.2;
        // Recess, jambs and a sill: the shaft's only relief, so it has to be
        // deep enough to shadow.
        m.makeTranslation(x + ax * (base / 2 - 0.1), oy, z + az * (base / 2 - 0.1));
        this.box('plasterInterior', bw, 1.1, bd, m, 2.0, { variant: 'inner' });
        for (const sd of [-1, 1]) {
          m.makeTranslation(
            x + ax * (base / 2 - 0.02) + az * sd * 0.33,
            oy, z + az * (base / 2 - 0.02) + ax * sd * 0.33,
          );
          this.box('concrete', ax !== 0 ? 0.14 : 0.16, 1.24, ax !== 0 ? 0.16 : 0.14, m, 1.4);
        }
        m.makeTranslation(x + ax * (base / 2 + 0.03), oy + 0.66, z + az * (base / 2 + 0.03));
        this.box('concrete', ax !== 0 ? 0.2 : 0.92, 0.14, ax !== 0 ? 0.92 : 0.2, m, 1.4);
        m.makeTranslation(x + ax * (base / 2 + 0.04), oy - 0.6, z + az * (base / 2 + 0.04));
        this.box('concrete', ax !== 0 ? 0.22 : 0.86, 0.1, ax !== 0 ? 0.86 : 0.22, m, 1.4);
      }
    }
    for (const bandY of [2.05 + h * 0.18, 2.05 + h * 0.34]) {
      m.makeTranslation(x, bandY, z);
      this.box('concrete', base + 0.2, 0.16, base + 0.2, m, 3);
      m.makeTranslation(x, bandY + 0.13, z);
      this.box('concrete', base + 0.32, 0.1, base + 0.32, m, 2);
    }
  }

  /**
   * Closes the gaps between the blocks facing the market street with compound
   * walls, gates and lean-to market sheds.
   *
   * Without this the street is 28 m of open sand between building lines, which
   * plays like a car park. A continuous edge with occasional openings is what
   * turns it into a street: it frames the sightline, hides the flanks, and the
   * gates become the flanking routes players learn.
   */
  private buildStreetEdges(): void {
    const rng = this.rng;
    const m = new THREE.Matrix4();

    // [side, z0, z1] — the runs between building footprints.
    const runs: Array<[number, number, number]> = [
      [-1, -54, -47], [-1, -33, -28], [-1, -16, -7], [-1, 11, 18], [-1, 34, 40], [-1, 52, 56],
      [1, -54, -49], [1, -35, -29], [1, -16, -6], [1, 14, 21], [1, 39, 44], [1, 56, 58],
    ];

    for (const [side, z0, z1] of runs) {
      const x = side * FRONT_X;
      const len = z1 - z0;
      if (len < 1.2) continue;
      const h = rng.range(2.5, 3.3);
      // A gateway in the longer runs; the shorter ones stay solid.
      const gateW = len > 6 ? 2.4 : 0;
      const gateAt = z0 + len * rng.range(0.35, 0.65);
      const segs: Array<[number, number]> = gateW > 0
        ? [[z0, gateAt - gateW / 2], [gateAt + gateW / 2, z1]]
        : [[z0, z1]];

      for (const [a, b] of segs) {
        if (b - a < 0.4) continue;
        m.makeTranslation(x, h / 2, (a + b) / 2);
        this.box('plaster', 0.42, h, b - a, m, 4.5);
        // Coping course.
        m.makeTranslation(x, h + 0.07, (a + b) / 2);
        this.box('concrete', 0.56, 0.14, b - a, m, 2.5);
        // Pilaster buttresses at a regular rhythm.
        const n = Math.max(1, Math.round((b - a) / 3.2));
        for (let i = 0; i <= n; i++) {
          const pz = a + ((b - a) * i) / n;
          m.makeTranslation(x, (h + 0.5) / 2, pz);
          this.box('plaster', 0.62, h + 0.5, 0.46, m, 4.5);
          m.makeTranslation(x, h + 0.62, pz);
          this.box('concrete', 0.76, 0.24, 0.6, m, 2.5);
        }
      }

      if (gateW > 0) {
        // Gate piers, lintel and a leaning steel leaf.
        for (const sz of [-1, 1]) {
          m.makeTranslation(x, (h + 0.9) / 2, gateAt + sz * (gateW / 2 + 0.28));
          this.box('plaster', 0.62, h + 0.9, 0.56, m, 4.5);
          m.makeTranslation(x, h + 1.05, gateAt + sz * (gateW / 2 + 0.28));
          this.box('concrete', 0.78, 0.3, 0.72, m, 2.5);
        }
        m.makeTranslation(x, 2.55, gateAt);
        this.box('concrete', 0.5, 0.34, gateW + 0.6, m, 2.5);
        // One leaf hanging open into the compound.
        const leaf = new THREE.BoxGeometry(1.0, 2.2, 0.06);
        scaleUV(leaf, 1.0, 2.2, 0.06, 1.6);
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), side * 1.1);
        m.compose(
          new THREE.Vector3(x - side * 0.5, 1.2, gateAt - gateW / 2 + 0.2),
          q, new THREE.Vector3(1, 1, 1),
        );
        this.push('corrugated', leaf, m);
        leaf.dispose();
      }

      // Lean-to shed against the wall on the street side.
      if (len > 5 && rng.next() < 0.75) {
        this.buildLeanTo(x - side * 1.75, (z0 + z1) / 2 + rng.range(-1, 1), side, rng.range(2.6, 3.6));
      }
    }
  }

  /** Corrugated shed roof on posts, propped against a compound wall. */
  private buildLeanTo(x: number, z: number, side: number, len: number): void {
    const rng = this.rng;
    const m = new THREE.Matrix4();
    const depth = 3.2;
    const highY = 2.85;
    const lowY = 2.35;

    // Roof: overlapping sheets, ribbed down the fall.
    //
    // This was a 60 mm flat box trusting the material's painted stripe to say
    // "corrugated iron", and the review named exactly that read on it — a painted
    // stripe on a flat plane at three to five metres, with no bend, no dent and
    // no lean. Corrugation is 15 mm of relief that self-shadows; under a raking
    // sun it is soft-edged alternating light and dark that follows the sheet as it
    // bows, and no albedo pattern reproduces that. Laid as separate sheets with
    // their own bow and their own dents, so the run has a broken ridge line.
    const tilt = Math.atan2(highY - lowY, depth);
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), side * tilt);
    const sheets = Math.max(1, Math.round(len / 2.0));
    for (let i = 0; i < sheets; i++) {
      const sl = len / sheets;
      const geo = corrugatedPanel(depth, sl * 1.05, {
        pitch: 0.18, amp: 0.015, thick: 0.014, bow: rng.range(-0.04, 0.05),
        rand: () => rng.next(), tile: 1.0,
      });
      geo.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
      m.compose(
        new THREE.Vector3(
          x, (highY + lowY) / 2 + rng.range(-0.015, 0.015), z - len / 2 + sl * (i + 0.5),
        ),
        q, new THREE.Vector3(1, 1, 1),
      );
      this.push('corrugated', geo, m);
      geo.dispose();
    }

    // Front posts and a purlin.
    for (const t of [-1, 1]) {
      const pz = z + t * (len / 2 - 0.2);
      const post = cyl(0.06, 0.07, lowY, 6, 0.6);
      m.makeTranslation(x - side * (depth / 2 - 0.1), lowY / 2, pz);
      this.push('wood', post, m);
      post.dispose();
    }
    m.makeTranslation(x - side * (depth / 2 - 0.1), lowY - 0.06, z);
    this.box('wood', 0.09, 0.09, len, m, 1.2);

    // Goods stacked underneath.
    for (let i = 0; i < Math.round(len / 1.3); i++) {
      const bz = z - len / 2 + 0.6 + i * 1.2;
      const n = rng.int(1, 3);
      for (let k = 0; k < n; k++) {
        const bs = rng.range(0.45, 0.7);
        m.makeTranslation(
          x + side * rng.range(-0.4, 0.6),
          bs / 2 + k * bs * 0.95,
          bz + rng.range(-0.25, 0.25),
        );
        this.box(rng.next() < 0.6 ? 'woodCrate' : 'fabricSandbag', bs, bs * 0.9, bs, m, 1.1);
      }
    }
  }

  // ---------------------------------------------------- spawns and cover ---

  private buildSpawnsAndCover(): void {
    const physics = this.ctx.get<PhysicsSystem>('physics');

    const playerSpots: Array<[number, number, number]> = [
      [0, 44, Math.PI], [-6, 40, Math.PI], [6, 40, Math.PI],
    ];
    const enemySpots: Array<[number, number, number]> = [
      [0, -44, 0], [-10, -38, 0.3], [10, -38, -0.3],
      [-30, -20, 1.2], [30, -18, -1.2], [-38, 10, 1.6],
      [38, 14, -1.6], [-14, 0, 0.6], [14, 4, -0.6],
      [0, -20, 0], [-24, -6, 1.0], [24, -8, -1.0],
    ];
    for (const [spots, team] of [[playerSpots, 'player'], [enemySpots, 'enemy']] as const) {
      for (const [x, z, yaw] of spots) {
        // Authored by hand, then settled against the collision world. Set
        // dressing moves around as the map is worked on, and a spawn that ends
        // up inside a market stall puts the player's first frame inside a crate.
        //
        // Settled towards street level, because that is where all of these are
        // authored. Without the height preference the search returned the topmost
        // surface in the column, which for the six spots that sit inside a
        // building footprint was the roof deck: five enemies were spawning seven
        // to eleven metres up, on roofs, with no way down except a drop.
        const at = physics ? this.settle(physics, x, z, 0.15) : new THREE.Vector3(x, 0.2, z);
        this.spawns.push({ position: at, yaw, team });
      }
    }

    // Cover points are sampled on a grid and validated against the collision
    // world, so they stay correct as the layout changes.
    if (!physics) return;

    const step = 4;
    const dirs = [
      new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1),
    ];

    for (let x = -52; x <= 52; x += step) {
      for (let z = -52; z <= 52; z += step) {
        const ground = this.standingGround(physics, x, z);
        if (!ground) continue;
        const groundY = ground.y;

        // A position is cover if something blocks at chest height on at least
        // one side but the position itself is open.
        const eye = new THREE.Vector3(x, groundY + 1.35, z);
        const crouch = new THREE.Vector3(x, groundY + 0.75, z);
        for (const dir of dirs) {
          const highHit = physics.trace(eye, dir, 1.6);
          const lowHit = physics.trace(crouch, dir, 1.6);
          if (lowHit.hit && !highHit.hit) {
            this.coverPoints.push({
              position: new THREE.Vector3(x, groundY, z),
              normal: dir.clone().negate(),
              height: 'low',
              occupiedBy: -1,
            });
            break;
          }
          if (highHit.hit && highHit.distance > 0.5) {
            this.coverPoints.push({
              position: new THREE.Vector3(x, groundY, z),
              normal: dir.clone().negate(),
              height: 'high',
              occupiedBy: -1,
            });
            break;
          }
        }

        this.navNodes.push(new THREE.Vector3(x, groundY, z));
      }
    }
  }

  /**
   * The lowest floor at `x, z` an actor can actually stand on.
   *
   * Probing straight down from head height finds the top of whatever is in the
   * way — an awning, a stall roof, a jersey barrier — so nav nodes sampled that
   * way end up perched on the set dressing. This walks down through the column
   * instead and takes the first surface that clears a standing capsule.
   */
  private standingGround(
    physics: PhysicsSystem,
    x: number,
    z: number,
    preferY?: number,
  ): THREE.Vector3 | null {
    const down = new THREE.Vector3(0, -1, 0);
    const from = new THREE.Vector3();
    const at = new THREE.Vector3();
    let y = 12;
    let best: number | null = null;
    for (let i = 0; i < 10 && y > -1.5; i++) {
      const hit = physics.trace(from.set(x, y, z), down, y + 1.5);
      if (!hit.hit) break;
      const sy = hit.point.y;
      if (hit.normal.y > 0.7 && sy > -1.2 && sy < 12) {
        at.set(x, sy + 0.02, z);
        physics.resolveCapsule(at, TUNING.playerRadius, TUNING.playerHeight, this.resolveOut);
        if (at.distanceToSquared(from.set(x, sy + 0.02, z)) < 0.05) {
          // With no preference, take the first one found, which is the highest.
          if (preferY === undefined) return new THREE.Vector3(x, sy, z);
          // Otherwise keep looking and take whichever floor is nearest the height
          // asked for. A column through the souk crosses three or four surfaces a
          // capsule fits on — a stall canopy at 2.4 m, a shade covering at 4.8 m,
          // the pavement at 0.16 — and the topmost is the wrong answer for
          // anything that was authored at street level. Two player spawns were
          // being settled onto the roof of a market stall.
          if (best === null || Math.abs(sy - preferY) < Math.abs(best - preferY)) best = sy;
        }
      }
      y = sy - 0.3;
    }
    return best === null ? null : new THREE.Vector3(x, best, z);
  }

  /**
   * Nearest clear standing position to `x, z`, searched outwards in a ring.
   *
   * `wantY` is the height the point was authored at, so a street spawn settles
   * onto the street and a roof spawn settles onto the roof.
   */
  private settle(physics: PhysicsSystem, x: number, z: number, wantY: number): THREE.Vector3 {
    // Moving sideways is preferred to moving upwards.
    //
    // A column whose ground is blocked by a stall still has a floor a capsule
    // fits on — the stall's own roof — and taking it puts the spawn on top of the
    // furniture. Stepping a metre to the side almost always finds real ground,
    // so a candidate more than 1.5 m off the height asked for is only accepted
    // once the ring search has failed to beat it.
    let best = this.standingGround(physics, x, z, wantY);
    if (best && Math.abs(best.y - wantY) <= 1.5) return best.setY(best.y + 0.05);
    for (let r = 0.8; r <= 3.2; r += 0.8) {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const at = this.standingGround(
          physics, x + Math.cos(a) * r, z + Math.sin(a) * r, wantY,
        );
        if (!at) continue;
        if (Math.abs(at.y - wantY) <= 1.5) return at.setY(at.y + 0.05);
        if (!best || Math.abs(at.y - wantY) < Math.abs(best.y - wantY)) best = at;
      }
    }
    return best ? best.setY(best.y + 0.05) : new THREE.Vector3(x, 0.25, z);
  }

  /** Nearest free cover point to `from` that is not too close to `threat`. */
  findCover(from: THREE.Vector3, threat: THREE.Vector3, actorId: number, maxDist = 22): CoverPoint | null {
    let best: CoverPoint | null = null;
    let bestScore = -Infinity;
    const toThreat = new THREE.Vector3();

    for (const c of this.coverPoints) {
      if (c.occupiedBy !== -1 && c.occupiedBy !== actorId) continue;
      const dist = c.position.distanceTo(from);
      if (dist > maxDist) continue;
      toThreat.copy(threat).sub(c.position).normalize();
      // The cover must actually face the threat.
      const facing = c.normal.dot(toThreat);
      if (facing < 0.25) continue;
      const threatDist = c.position.distanceTo(threat);
      const score = facing * 3 - dist * 0.35 + Math.min(threatDist, 30) * 0.12 +
        (c.height === 'high' ? 1.2 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
    if (best) best.occupiedBy = actorId;
    return best;
  }

  releaseCover(actorId: number): void {
    for (const c of this.coverPoints) if (c.occupiedBy === actorId) c.occupiedBy = -1;
  }

  dispose(): void {
    this.materials?.dispose();
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
  }
}

// ------------------------------------------------------------- helpers -----

/** A UV-scaled box as loose geometry, for cases that need a rotation applied. */
function boxGeo(w: number, h: number, d: number, tile: number): THREE.BoxGeometry {
  const geo = new THREE.BoxGeometry(w, h, d);
  scaleBoxUV(geo, w, h, d, tile);
  return geo;
}

/** Rescales a BoxGeometry's UVs so texel density matches world size. */
export function scaleBoxUV(
  geo: THREE.BoxGeometry,
  w: number,
  h: number,
  d: number,
  tile: number,
): void {
  const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
  const dims: Array<[number, number]> = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    const [fw, fh] = dims[f];
    for (let i = 0; i < 4; i++) {
      const idx = f * 4 + i;
      uv.setXY(idx, uv.getX(idx) * (fw / tile), uv.getY(idx) * (fh / tile));
    }
  }
  uv.needsUpdate = true;
}

/** UVs in world metres for a torus arc, so its texel density matches its neighbours. */
function scaleTorusUV(geo: THREE.TorusGeometry, radius: number, tubeR: number, tile: number): void {
  const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * ((Math.PI * 2 * radius) / tile), uv.getY(i) * ((Math.PI * 2 * tubeR) / tile));
  }
  uv.needsUpdate = true;
}

export function applyCylinderUV(
  geo: THREE.CylinderGeometry,
  radius: number,
  height: number,
  tile: number,
): void {
  const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
  const circumference = Math.PI * 2 * radius;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * (circumference / tile), uv.getY(i) * (height / tile));
  }
  uv.needsUpdate = true;
}

/** Stable signature for a batch's material overrides, used as part of its key. */
function matSig(m: MaterialOverrides | undefined): string {
  if (!m) return '';
  const parts: string[] = [];
  for (const k of Object.keys(m).sort()) {
    const v = (m as unknown as Record<string, unknown>)[k];
    // Components, not a hex string: several of these colours are deliberately
    // over-unity to brighten a dark base texture and would all hash to white.
    if (v instanceof THREE.Color) {
      parts.push(`${k}:${v.r.toFixed(3)}/${v.g.toFixed(3)}/${v.b.toFixed(3)}`);
    } else parts.push(`${k}:${String(v)}`);
  }
  return parts.join(',');
}

/**
 * Merges geometries that share an attribute layout.
 * Written inline rather than imported so the level builder can guarantee the
 * exact attribute set (position/normal/uv) it needs and drop everything else.
 */
export function mergeGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (geos.length === 0) return null;

  let vertexCount = 0;
  let indexCount = 0;
  for (const g of geos) {
    const pos = g.getAttribute('position');
    if (!pos) continue;
    vertexCount += pos.count;
    indexCount += g.index ? g.index.count : pos.count;
  }
  if (vertexCount === 0) return null;

  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices = vertexCount > 65535 ? new Uint32Array(indexCount) : new Uint16Array(indexCount);

  let vo = 0;
  let io = 0;
  for (const g of geos) {
    const pos = g.getAttribute('position') as THREE.BufferAttribute;
    if (!pos) continue;
    let nor = g.getAttribute('normal') as THREE.BufferAttribute | undefined;
    if (!nor) {
      g.computeVertexNormals();
      nor = g.getAttribute('normal') as THREE.BufferAttribute;
    }
    const uv = g.getAttribute('uv') as THREE.BufferAttribute | undefined;

    positions.set(pos.array as Float32Array, vo * 3);
    normals.set(nor.array as Float32Array, vo * 3);
    if (uv) uvs.set(uv.array as Float32Array, vo * 2);

    if (g.index) {
      const src = g.index.array;
      for (let i = 0; i < src.length; i++) indices[io + i] = src[i] + vo;
      io += src.length;
    } else {
      for (let i = 0; i < pos.count; i++) indices[io + i] = vo + i;
      io += pos.count;
    }
    vo += pos.count;
  }

  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  out.setIndex(new THREE.BufferAttribute(indices, 1));
  return out;
}
