import * as THREE from 'three';
import type { LevelSystem } from './Level';
import {
  WASH_MAT, LINEN_MAT, LIME, SCREED, FLAT, SCREED_FLAT, CANOPY, LETTER_LIGHT, LETTER_DARK,
  PALM,
} from './Level';
import type { MaterialKey } from '../render/Materials';
import type { RNG } from '../render/Noise';
import {
  prism, clothPanel, sagCable, slackCable, cyl, ring, bagGeometry, archRing,
  corniceProfile, sillProfile, copingProfile, driftProfile, duneProfile,
  parabolicDish, corrugatedPanel, bladeSpray, rugGeometry, scriptRun,
  patchDisc, gravelBed,
  type Profile,
} from './GeoKit';

/**
 * Architecture for Al-Rahim.
 *
 * A building is not a box with holes in it. What makes masonry read as masonry
 * at 30 m is the *banding*: a projecting plinth, a string course at every floor
 * line, a sill under and a lintel over every opening, and a cornice throwing a
 * hard shadow at the roofline. Each of those is only 8–30 cm of relief, but
 * they are horizontal, they run the full width of the facade, and under a 26°
 * sun they produce the stack of shadow lines the eye uses to judge scale and
 * material. A flat wall gives it nothing to work with.
 *
 * Everything is emitted through `level.box()` / `level.push()` so it merges
 * into the existing per-material batches — a facade's worth of mouldings costs
 * no extra draw calls.
 */

export type Dir = 'north' | 'south' | 'east' | 'west';

export interface BuildingSpec {
  cx: number;
  cz: number;
  w: number;
  d: number;
  floors: number;
  /** 0 rendered plaster, 1 fired brick, 2 raw concrete frame. */
  style: 0 | 1 | 2;
  /** The side facing a street; gets the shopfront, awnings and balconies. */
  front: Dir;
  /** Ground storey height; shop storeys are taller than the ones above. */
  groundH?: number;
  upperH?: number;
  /** Metres the top storey is pulled back from the front, 0 for none. */
  setback?: number;
  /** 0..1, how badly shelled. Drives blown openings and lost parapet. */
  damage?: number;
  /** Round-headed openings; the local vernacular. */
  arches?: boolean;
  /** Turned wooden screens over the upper openings. */
  mashrabiya?: boolean;
  balconies?: boolean;
  shopfront?: boolean;
  /** Column stubs and rebar waiting for a storey that never got funded. */
  unfinished?: boolean;
  externalStair?: boolean;
  /**
   * Offsets from the building centre where a shell has punched clean through
   * every slab and the roof. The resulting column of daylight is the only
   * reliable way to make a deep interior readable without touching the
   * lighting rig, and it puts a bright pool on the floor to fight over.
   */
  lightShaft?: [number, number];
  /**
   * An open central courtyard, as `[dx, dz, w, d]` about the building centre.
   *
   * The local vernacular builds around a court rather than a corridor, and it
   * solves the one problem a generated interior cannot otherwise solve: it puts
   * daylight and sky in the middle of the plan, so rooms read against a bright
   * background instead of disappearing into black.
   */
  courtyard?: [number, number, number, number];
  /**
   * The court side carried on a beam instead of arches.
   *
   * A player standing in the gallery is about 1.3 m from the colonnade in front
   * of them, and an arch ring at that range fills the top half of the view with
   * four or five voussoirs seen from below and inside. Because the court behind
   * is the brightest thing in the building, every 30 mm bed joint between those
   * stones renders as a bright slot, so the ring reads as a row of detached
   * slabs floating in an arc — which is what three consecutive interior captures
   * showed. Trabeating the near side replaces all of it with one horizontal beam
   * above the eye line and leaves the court open: a frame instead of a thicket.
   */
  courtOpen?: Dir;
  /**
   * Which elevation the external stair climbs. Never leave this to chance on a
   * street frontage: the flight projects over 2 m, and on the face a player
   * walks past it fills the whole view.
   */
  stairSide?: Dir;
  interior?: 'shop' | 'apartment' | 'ruin' | 'none';
  /**
   * `lite` keeps the shell, facade and roofline — everything that contributes to
   * the silhouette — but skips the fine interior dressing. Used for the outer
   * blocks, which are seen only from outside and at range, so their fitted-out
   * interiors would be triangles spent where no player ever stands.
   */
  detail?: 'full' | 'lite';
  /** Skips the roof deck and parapet, for wings that abut a taller mass. */
  noRoof?: boolean;
}

/**
 * Dark, glossy, dielectric panes. Kept opaque on purpose: `transparent` is part
 * of the shader cache key, and at ~1 s per program on a software rasteriser a
 * separate glass program is not worth it when the rooms behind are unlit
 * anyway. Fresnel does the work — the pane goes black head-on and mirrors the
 * sky at a grazing angle, which is exactly what dirty glass does.
 */
export const GLASS_MAT = {
  roughness: 0.075,
  metalness: 0.0,
  color: 0x181e25,
  normalScale: 0.3,
} as const;

const GLASS_KEY: MaterialKey = 'tile';
const GLASS_OPTS = { variant: 'glass', material: GLASS_MAT };
/**
 * Rooflight glazing: wired, dirty, and pale rather than mirror-dark.
 *
 * Over-unity for the same reason as the court floor — the tile albedo is a dark
 * grey and a hex tint can only take light away from it.
 */
const ROOFLIGHT = {
  variant: 'rooflight',
  material: { color: new THREE.Color(1.7, 1.78, 1.9), roughness: 0.45 },
};
/**
 * Weathered polythene, for the rooftop water tanks.
 *
 * These are the tallest free-standing objects on a roof and they are always seen
 * against the sky, so raw `polymerBlack` makes them holes cut out of it: no
 * shading across the cylinder, no rim, no reading of which way round it is. A
 * tank that has stood in this sun for a decade is a chalky dark grey anyway, and
 * lifting it far enough to shade is what turns a silhouette into an object.
 */
const TANK = {
  variant: 'tank',
  material: { color: new THREE.Color(3.1, 3.2, 3.4), roughness: 0.72 },
};
const INSIDE = { variant: 'inner' };
/**
 * Pale limestone flags, for the one interior surface daylight actually lands on.
 *
 * Over-unity, like the awnings, and for the same reason: a hex colour only
 * *attenuates* the baked albedo, so a court floor tinted to a believable
 * limestone value still comes out as whatever the tile map already was, which
 * is a dark grey. A court lit by a strip of sky has no light to lose, and if the
 * floor of it goes black then everything standing on the floor appears to float.
 */
const COURT_STONE = {
  variant: 'court',
  material: { color: new THREE.Color(2.5, 2.36, 2.1), roughness: 0.8 },
};
/** Cast cement, cool against the warm walls: parapet coping and thresholds. */
const COPING = { variant: 'coping', material: { color: 0x8d949a, roughness: 0.74 } };

/**
 * Shop sign paint.
 *
 * The one place on the map licensed to be a saturated colour. Everything else in
 * a desert town is some value of sand, because everything else is either made of
 * the ground or bleached by the sun — but a shopkeeper repaints his board, and he
 * buys whatever enamel the merchant had. So this is the palette that breaks the
 * monochrome, and it has to be *chosen* rather than randomised: greens and blues
 * read as the region, and they are also the two hues furthest from the wall, so
 * they carry at the range a sign is seen from.
 *
 * Over-unity on purpose. These multiply a baked albedo that is already dark, and
 * a sign that comes out at the same value as the wall behind it has not done the
 * job it is here to do.
 */
const SIGN_PAINT: ReadonlyArray<{ key: MaterialKey; opts: { variant: string; material: Record<string, unknown> } }> = [
  { key: 'paintedMetalGreen', opts: { variant: 'signGreen', material: { color: new THREE.Color(0.5, 1.7, 0.95), roughness: 0.52 } } },
  { key: 'paintedMetalRed', opts: { variant: 'signRed', material: { color: new THREE.Color(1.85, 0.62, 0.5), roughness: 0.55 } } },
  { key: 'paintedMetalTan', opts: { variant: 'signOchre', material: { color: new THREE.Color(1.9, 1.3, 0.5), roughness: 0.58 } } },
  { key: 'paintedMetalGreen', opts: { variant: 'signBlue', material: { color: new THREE.Color(0.42, 0.86, 1.9), roughness: 0.5 } } },
];
/** Sun-bleached paper, for fly-posted bills. */
const BILL_PAPER = { variant: 'bill', material: { color: new THREE.Color(2.3, 2.2, 2.0), roughness: 0.9 } };
/**
 * The court lantern: warm-patinated iron, and a glass pale enough to read as lit.
 *
 * Interior gunmetal is a near-black, which is right for a rifle and wrong for the
 * only object hanging at eye level in the one room the review looks into. There
 * is no emissive channel to reach for here, so the glass is simply carried far
 * over unity — a lamp seen against a shaded wall is *brighter than its
 * surroundings*, and that relationship is the whole of what says it is lit.
 */
const LANTERN_IRON = { variant: 'lanternIron', material: { color: new THREE.Color(1.5, 1.25, 0.95), roughness: 0.62 } };
const LANTERN_GLASS = { variant: 'lanternGlass', material: { color: new THREE.Color(4.6, 3.6, 2.1), roughness: 0.42 } };

/**
 * Firing positions: the spots on a roof the map promises you a shot from.
 *
 * Roof dressing has to be placed by area, because that is the only handle
 * procedural code has on a rectangle. Placed by area it will eventually put a
 * 1.6 m water tank exactly where a player wants to stand, and on a 14 m deck
 * "eventually" means most of the time — a tank 0.6 m from the eye is simply an
 * opaque wall across half the screen, and no amount of detail behind it counts
 * for anything.
 *
 * A hand-built map solves this by deciding where the sightlines are before it
 * decides where the clutter is, so that is the order here. Each post is a corner
 * of a deck that overlooks the street or the plaza; dressing keeps out of a
 * radius around it and the roof pass leaves a sandbag rest there instead, which
 * is both the reason the spot is clear and the thing that tells a player it is
 * worth standing in.
 */
const POSTS: ReadonlyArray<{ x: number; z: number }> = [
  { x: -22, z: 20 },
  { x: -21, z: -14 },
  { x: 22, z: 26 },
  { x: 20, z: -20 },
  { x: -38, z: 8 },
];
/** True within `r` metres of a firing position, in plan. */
function nearPost(x: number, z: number, r: number): boolean {
  for (const p of POSTS) {
    if ((x - p.x) * (x - p.x) + (z - p.z) * (z - p.z) < r * r) return true;
  }
  return false;
}
/**
 * True if any part of the segment `a`-`b` passes within `r` of a firing position.
 *
 * Washing lines were tested by their midpoint, which is only the same test when
 * the line is short. A twelve-metre span from one corner of a deck to another has
 * its midpoint in the middle of the roof and can still pass a metre from a post
 * at the two-thirds mark, and that is what put a sheet 2 m from the overwatch
 * camera in three separate captures — each time after an unrelated change had
 * shifted the random stream enough to redraw the anchors.
 */
function segNearPost(ax: number, az: number, bx: number, bz: number, r: number): boolean {
  const dx = bx - ax;
  const dz = bz - az;
  const len2 = dx * dx + dz * dz;
  for (const p of POSTS) {
    const t = len2 > 1e-6
      ? Math.max(0, Math.min(1, ((p.x - ax) * dx + (p.z - az) * dz) / len2))
      : 0;
    const qx = ax + dx * t - p.x;
    const qz = az + dz * t - p.z;
    if (qx * qx + qz * qz < r * r) return true;
  }
  return false;
}
/** The firing positions that fall on one deck, so it can dress them. */
function postsOn(cx: number, cz: number, w: number, d: number): Array<{ x: number; z: number }> {
  return POSTS.filter(
    (p) => Math.abs(p.x - cx) < w / 2 - 0.6 && Math.abs(p.z - cz) < d / 2 - 0.6,
  );
}

const WALL_T = 0.34;
const PLINTH_H = 0.5;
const PLINTH_OUT = 0.1;
const BAND_OUT = 0.085;
const SLAB_T = 0.28;
/** Going and rise of every step in the map, internal and external. */
const STEP_D = 0.27;
const RISER = 0.185;

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3(1, 1, 1);
const _yAxis = new THREE.Vector3(0, 1, 0);

// ------------------------------------------------------------------ faces ---

interface FaceRef {
  axis: 'x' | 'z';
  sign: number;
  /** Facade length along its tangent axis. */
  len: number;
  /** World coordinate of the facade centre along the tangent axis. */
  tan: number;
  /** World coordinate of the outer wall plane along the normal axis. */
  outer: number;
  dir: Dir;
}

function facesOf(cx: number, cz: number, w: number, d: number): FaceRef[] {
  return [
    { axis: 'z', sign: -1, len: w, tan: cx, outer: cz - d / 2, dir: 'south' },
    { axis: 'z', sign: 1, len: w, tan: cx, outer: cz + d / 2, dir: 'north' },
    { axis: 'x', sign: -1, len: d, tan: cz, outer: cx - w / 2, dir: 'west' },
    { axis: 'x', sign: 1, len: d, tan: cz, outer: cx + w / 2, dir: 'east' },
  ];
}

/**
 * Box in facade-local space. `off` runs along the facade, `out` is the outward
 * distance of the box centre from the outer wall plane (negative goes into the
 * building), `along` is its length across the facade and `thick` its depth.
 */
function fBox(
  level: LevelSystem,
  key: MaterialKey,
  f: FaceRef,
  off: number,
  yc: number,
  out: number,
  along: number,
  h: number,
  thick: number,
  tile: number,
  opts?: { variant?: string; material?: Record<string, unknown> },
): void {
  if (f.axis === 'z') {
    _m.makeTranslation(f.tan + off, yc, f.outer + f.sign * out);
    level.box(key, along, h, thick, _m, tile, opts as never);
  } else {
    _m.makeTranslation(f.outer + f.sign * out, yc, f.tan + off);
    level.box(key, thick, h, along, _m, tile, opts as never);
  }
}

/** Extrudes a moulding profile, given as (outward, up), along the facade. */
function fPrism(
  level: LevelSystem,
  key: MaterialKey,
  f: FaceRef,
  off: number,
  yBase: number,
  profile: Profile,
  length: number,
  tile: number,
): void {
  if (length <= 1e-4) return;
  const mapped: Profile = profile.map(([o, u]) => [f.sign * o, u] as [number, number]);
  const geo = prism(mapped, length, tile, f.axis === 'z' ? 'x' : 'z');
  if (f.axis === 'z') _m.makeTranslation(f.tan + off, yBase, f.outer);
  else _m.makeTranslation(f.outer, yBase, f.tan + off);
  level.push(key, geo, _m);
  geo.dispose();
}

const _zAxis = new THREE.Vector3(0, 0, 1);
const _xAxis = new THREE.Vector3(1, 0, 0);
const _qb = new THREE.Quaternion();

/**
 * Places a geometry authored in facade-local space — width along X, height
 * along Y, depth along Z — and spins it by `spin` within the facade plane.
 *
 * For an x-axis facade the geometry is first yawed so its local X runs along
 * the facade, which means the same authored detail can be reused on all four
 * elevations. The in-plane spin is then about the facade normal, and its sign
 * flips with the axis because the two frames are mirror images of each other.
 */
function fPush(
  level: LevelSystem,
  key: MaterialKey,
  f: FaceRef,
  off: number,
  yc: number,
  out: number,
  geo: THREE.BufferGeometry,
  spin = 0,
  opts?: { variant?: string; material?: Record<string, unknown> },
): void {
  if (f.axis === 'z') {
    _q.setFromAxisAngle(_zAxis, spin);
    _m.compose(_p.set(f.tan + off, yc, f.outer + f.sign * out), _q, _s);
  } else {
    _q.setFromAxisAngle(_xAxis, -spin);
    _qb.setFromAxisAngle(_yAxis, -Math.PI / 2);
    _q.multiply(_qb);
    _m.compose(_p.set(f.outer + f.sign * out, yc, f.tan + off), _q, _s);
  }
  level.push(key, geo, _m, opts as never);
}

/**
 * Places XY-plane geometry that is raised along its own +Z onto a facade, with
 * +Z pointing out of the wall.
 *
 * `fPush` cannot do this: it maps local +Z to world +Z (or +X), which points
 * *into* the building on the south and west faces, so lettering applied through
 * it would be buried in the wall on half the map.
 */
function fRelief(
  level: LevelSystem,
  key: MaterialKey,
  f: FaceRef,
  off: number,
  yc: number,
  out: number,
  geo: THREE.BufferGeometry,
  opts?: { variant?: string; material?: Record<string, unknown> },
): void {
  const spin = f.axis === 'z' ? (f.sign > 0 ? 0 : Math.PI) : f.sign * (Math.PI / 2);
  _q.setFromAxisAngle(_yAxis, spin);
  if (f.axis === 'z') _p.set(f.tan + off, yc, f.outer + f.sign * out);
  else _p.set(f.outer + f.sign * out, yc, f.tan + off);
  _m.compose(_p, _q, _s);
  level.push(key, geo, _m, opts as never);
}

/** `fBox` with an in-plane rotation; the dimensions follow the facade frame. */
function fRotBox(
  level: LevelSystem,
  key: MaterialKey,
  f: FaceRef,
  off: number,
  yc: number,
  out: number,
  along: number,
  h: number,
  thick: number,
  tile: number,
  spin: number,
): void {
  const geo = new THREE.BoxGeometry(along, h, thick);
  scaleUV(geo, along, h, thick, tile);
  fPush(level, key, f, off, yc, out, geo, spin);
  geo.dispose();
}

// ----------------------------------------------------------------- storeys ---

interface Storey {
  base: number;
  h: number;
  kind: 'shop' | 'residential';
  index: number;
}

type OpeningKind = 'window' | 'door' | 'shop' | 'blown';

interface Opening {
  off: number;
  w: number;
  bottom: number;
  top: number;
  kind: OpeningKind;
  arched: boolean;
  /** How the opening is filled in. */
  fill: 'open' | 'glazed' | 'broken' | 'boarded' | 'shuttered' | 'grille' | 'sandbag' | 'screen';
}

const WALL_MAT: MaterialKey[] = ['plaster', 'brick', 'concrete'];
const WALL_TILE = [4.5, 2.4, 4.0];

export function buildBuilding(level: LevelSystem, spec: BuildingSpec, rng: RNG): void {
  const { cx, cz, w, d, floors, style } = spec;
  const groundH = spec.groundH ?? 3.4;
  const upperH = spec.upperH ?? 3.05;
  const damage = spec.damage ?? 0;
  const wallKey = WALL_MAT[style];
  const tile = WALL_TILE[style];
  const setback = spec.setback ?? 0;

  const storeys: Storey[] = [];
  let y = 0.24;
  for (let i = 0; i < floors; i++) {
    const h = i === 0 ? groundH : upperH;
    storeys.push({ base: y, h, kind: i === 0 && (spec.shopfront ?? false) ? 'shop' : 'residential', index: i });
    y += h;
  }
  const topY = y;

  // ---- foundation plinth: the shadow line that sets the building on the ground
  //
  // Taken down to -300 mm rather than stopping dead on y = 0. The desert
  // heightfield carries a ±60 mm undulation right through the built-up area, so
  // a plinth whose underside is exactly at zero stands clear of the ground on
  // every dip — a hairline of daylight under a wall, which is the most damaging
  // possible version of "nothing is in contact with anything". Buried, the
  // ground cuts the plinth wherever it happens to lie and the joint is always
  // closed. The extra depth is never seen and costs nothing.
  _m.makeTranslation(cx, -0.03, cz);
  level.box('concrete', w + 0.5, 0.54, d + 0.5, _m, 4);

  // Vertical circulation. The shaft goes through every slab and the roof, so a
  // player can get from the street to the parapet without leaving the building.
  const well = stairWell(spec);
  const hasStair = !!spec.interior && spec.interior !== 'none' && floors > 1;
  const wellHole: SlabHole = { x: well.x, z: well.z, w: well.w, d: well.d };

  for (const st of storeys) {
    // A setback top storey is the cheapest way to break a repeated silhouette.
    const inset = st.index === floors - 1 && setback > 0 ? setback : 0;
    const sw = w - (inset > 0 && (spec.front === 'east' || spec.front === 'west') ? inset : 0);
    const sd = d - (inset > 0 && (spec.front === 'north' || spec.front === 'south') ? inset : 0);
    const sx = cx + (inset > 0 && spec.front === 'east' ? -inset / 2 : inset > 0 && spec.front === 'west' ? inset / 2 : 0);
    const sz = cz + (inset > 0 && spec.front === 'north' ? -inset / 2 : inset > 0 && spec.front === 'south' ? inset / 2 : 0);

    // Ceiling slab, oversailing the wall face so it casts a line of its own.
    const slabY = st.base + st.h - SLAB_T / 2;
    const holes: SlabHole[] = [];
    if (hasStair) holes.push(wellHole);
    const shaft = shaftAt(spec);
    if (shaft) holes.push({ x: shaft.x, z: shaft.z, w: shaft.w, d: shaft.d });
    const court = courtAt(spec);
    if (court) holes.push(court);
    slabWithHole(level, 'concreteFloor', sx, sz, sw + 0.16, sd + 0.16, slabY, SLAB_T, holes, 5);
    if (shaft) breachEdge(level, shaft, slabY, rng);

    if (st.index === 0) {
      _m.makeTranslation(cx, 0.27, cz);
      level.box(style === 2 ? 'tile' : 'concreteFloor', w - WALL_T * 2, 0.06, d - WALL_T * 2, _m, 2);
    } else {
      // Upper floors get their own surface so the slab edge is not the walking
      // plane; also hides the slab/wall junction. It has to carry the same
      // openings as the slab under it or the screed seals the shaft back up.
      const finish: SlabHole[] = [];
      if (hasStair) finish.push(wellHole);
      const c = courtAt(spec);
      if (c) finish.push(c);
      slabWithHole(
        level, 'concreteFloor', sx, sz, sw - WALL_T * 2, sd - WALL_T * 2,
        st.base + 0.03, 0.06, finish, 3,
      );
    }

    for (const f of facesOf(sx, sz, sw, sd)) {
      buildFacade(level, spec, f, st, wallKey, tile, damage, rng, floors);
    }

    // Corner pilasters run the full height and tie the storeys together.
    for (const f of facesOf(sx, sz, sw, sd)) {
      if (f.axis !== 'z') continue;
      for (const e of [-1, 1]) {
        fBox(level, style === 1 ? 'concrete' : wallKey, f, (e * (sw - 0.44)) / 2,
          st.base + st.h / 2, 0.06, 0.44, st.h, 0.34, style === 1 ? 4 : tile);
      }
    }
  }

  // The external flight has to be laid out before the roof, because the roof
  // has to leave a gap in the parapet where the flight arrives. A stair that
  // climbs to a dead end behind a 1 m parapet is worse than no stair at all.
  const extFace = spec.externalStair
    // Flanks only. The front elevation belongs to the shopfront.
    ? facesOf(cx, cz, w, d).find(
      (ff) => ff.dir === (spec.stairSide ?? (spec.front === 'east' || spec.front === 'west' ? 'north' : 'east')),
    )!
    : null;
  const extPlan = extFace ? externalStairPlan(extFace, topY + 0.12) : null;

  if (!spec.noRoof) {
    buildRoof(
      level, spec, cx, cz, w, d, topY, wallKey, tile, damage, rng,
      well, hasStair, extFace && extPlan ? { dir: extFace.dir, plan: extPlan } : null,
    );
  }

  buildDrainpipes(level, spec, cx, cz, w, d, topY, rng);

  if (spec.interior && spec.interior !== 'none') {
    buildInterior(level, spec, storeys, rng);
  }

  if (spec.courtyard) buildCourtyard(level, spec, storeys, rng);

  if (hasStair) buildStairCore(level, spec, storeys, well, topY, wallKey, tile);

  if (extFace && extPlan) buildExternalStair(level, extFace, extPlan, topY + 0.12);
}

interface StairWell {
  x: number;
  z: number;
  w: number;
  d: number;
  /** Plan length of the longest single flight the well has to take. */
  run: number;
  flightW: number;
}

/**
 * The stair well: one open shaft from the ground floor through every slab and
 * out at the roof.
 *
 * Shared by the slab openings, the flights, the roof head-house and the roof
 * dressing, so all four agree on where the vertical circulation is.
 *
 * Sized for a dogleg rather than a straight flight. A single flight to a 3.9 m
 * storey runs 5.7 m, which is a third of these plans and leaves the floor above
 * with a trench across it; turning it back on itself halves the plan length.
 * Set hard into the corner against two inner wall faces, which is where it gets
 * built and avoids leaving a slab sliver between the shaft and the wall.
 */
function stairWell(spec: BuildingSpec): StairWell {
  const flightW = 1.06;
  const w = flightW * 2 + 0.22;
  // The tallest storey sizes the well; shorter flights just leave more landing.
  const rise = Math.max(spec.groundH ?? 3.4, spec.upperH ?? 3.05) + 0.12;
  const run = Math.max(2, Math.round(rise / 2 / RISER)) * STEP_D;
  const d = run + 1.35;
  return {
    x: spec.cx + spec.w / 2 - WALL_T - w / 2,
    z: spec.cz - spec.d / 2 + WALL_T + d / 2,
    w,
    d,
    run,
    flightW,
  };
}

/** The head-house over the well, kept inside the parapet on the wall sides. */
function stairHead(well: StairWell): { x: number; z: number; w: number; d: number } {
  return { x: well.x - 0.12, z: well.z + 0.12, w: well.w + 0.24, d: well.d + 0.24 };
}

/** The open courtyard, in world coordinates. */
function courtAt(spec: BuildingSpec): SlabHole | null {
  if (!spec.courtyard) return null;
  const [dx, dz, cw, cd] = spec.courtyard;
  return { x: spec.cx + dx, z: spec.cz + dz, w: cw, d: cd };
}

/** True inside the courtyard footprint, grown by `pad`. */
function inCourt(spec: BuildingSpec, x: number, z: number, pad = 0): boolean {
  const c = courtAt(spec);
  if (!c) return false;
  return Math.abs(x - c.x) < c.w / 2 + pad && Math.abs(z - c.z) < c.d / 2 + pad;
}

/** True where a box of the given half-extents would overlap the courtyard. */
function hitsCourt(spec: BuildingSpec, x: number, z: number, hx: number, hz: number): boolean {
  const c = courtAt(spec);
  if (!c) return false;
  return Math.abs(x - c.x) < c.w / 2 + hx && Math.abs(z - c.z) < c.d / 2 + hz;
}

/**
 * True over the stair shaft, which nothing may be built across.
 *
 * The shaft is a hole in every slab, so anything placed in plan over it both
 * floats in mid air and stands in the one route between the storeys. A ceiling
 * joist crossing it is enough to stop a player getting up the stair at all.
 */
function hitsWell(spec: BuildingSpec, x: number, z: number, hx = 0, hz = 0): boolean {
  if (!spec.interior || spec.interior === 'none' || spec.floors < 2) return false;
  const s = stairWell(spec);
  return Math.abs(x - s.x) < s.w / 2 + hx && Math.abs(z - s.z) < s.d / 2 + hz;
}

/** The shell breach through the slabs, in world coordinates. */
function shaftAt(spec: BuildingSpec): SlabHole | null {
  if (!spec.lightShaft) return null;
  return {
    x: spec.cx + spec.lightShaft[0],
    z: spec.cz + spec.lightShaft[1],
    w: 2.9,
    d: 2.6,
  };
}

/**
 * Broken slab edge around a breach: torn reinforcement and a ragged lip.
 * Without it the hole reads as a neatly cut hatch.
 */
function breachEdge(level: LevelSystem, hole: SlabHole, slabY: number, rng: RNG): void {
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + rng.range(-0.2, 0.2);
    const px = hole.x + Math.cos(a) * hole.w * 0.5;
    const pz = hole.z + Math.sin(a) * hole.d * 0.5;
    const bar = cyl(0.01, 0.01, rng.range(0.3, 0.85), 4, 0.4);
    _q.setFromAxisAngle(new THREE.Vector3(Math.cos(a + 1.57), 0, Math.sin(a + 1.57)), rng.range(0.7, 1.5));
    _m.compose(_p.set(px, slabY, pz), _q, _s);
    level.push('corrugated', bar, _m);
    bar.dispose();
    // A tooth of slab still hanging on.
    if (rng.next() < 0.55) {
      const cw = rng.range(0.25, 0.6);
      _q.setFromAxisAngle(_yAxis, a);
      _m.compose(_p.set(px, slabY + rng.range(-0.05, 0.05), pz), _q, _s);
      const tooth = boxUV(cw, SLAB_T * rng.range(0.5, 0.9), cw * 0.7, 1.2);
      level.push('concrete', tooth, _m);
      tooth.dispose();
    }
  }
}

interface SlabHole { x: number; z: number; w: number; d: number }

/**
 * Emits a floor slab with any number of rectangular openings cut out of it.
 *
 * The slab is split on every hole edge and the cells that land inside a hole
 * are dropped. A stairwell and a shell hole through the same slab is the normal
 * case once a building has both roof access and battle damage.
 */
function slabWithHole(
  level: LevelSystem,
  key: MaterialKey,
  cx: number,
  cz: number,
  w: number,
  d: number,
  y: number,
  t: number,
  holes: SlabHole | SlabHole[] | undefined,
  tile: number,
  opts?: Parameters<LevelSystem['box']>[6],
): void {
  const list = (holes ? (Array.isArray(holes) ? holes : [holes]) : []).filter(Boolean);
  if (list.length === 0) {
    _m.makeTranslation(cx, y, cz);
    level.box(key, w, t, d, _m, tile, opts);
    return;
  }
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const z0 = cz - d / 2;
  const z1 = cz + d / 2;

  const cuts = (lo: number, hi: number, vals: number[]): number[] => {
    const set = [lo, hi];
    for (const v of vals) if (v > lo + 0.01 && v < hi - 0.01) set.push(v);
    return [...new Set(set)].sort((a, b) => a - b);
  };
  const xs = cuts(x0, x1, list.flatMap((h) => [h.x - h.w / 2, h.x + h.w / 2]));
  const zs = cuts(z0, z1, list.flatMap((h) => [h.z - h.d / 2, h.z + h.d / 2]));

  for (let i = 0; i + 1 < xs.length; i++) {
    for (let j = 0; j + 1 < zs.length; j++) {
      const mx = (xs[i] + xs[i + 1]) / 2;
      const mz = (zs[j] + zs[j + 1]) / 2;
      const inHole = list.some(
        (h) => Math.abs(mx - h.x) < h.w / 2 && Math.abs(mz - h.z) < h.d / 2,
      );
      if (inHole) continue;
      const bw = xs[i + 1] - xs[i];
      const bd = zs[j + 1] - zs[j];
      if (bw <= 0.01 || bd <= 0.01) continue;
      _m.makeTranslation(mx, y, mz);
      level.box(key, bw, t, bd, _m, tile, opts);
    }
  }
}

// ----------------------------------------------------------------- facades ---

function buildFacade(
  level: LevelSystem,
  spec: BuildingSpec,
  f: FaceRef,
  st: Storey,
  wallKey: MaterialKey,
  tile: number,
  damage: number,
  rng: RNG,
  floors: number,
): void {
  const isFront = f.dir === spec.front;
  const top = floors - 1 === st.index;
  const openings = layoutOpenings(spec, f, st, isFront, damage, rng);

  // ---- wall body, segmented around the openings ----
  const sorted = openings.slice().sort((a, b) => a.off - b.off);
  /** Solid stretches of wall between the openings, as [centre offset, length]. */
  const piers: Array<[number, number]> = [];
  let cursor = -f.len / 2;
  for (const o of sorted) {
    const left = o.off - o.w / 2;
    if (left - cursor > 0.02) {
      piers.push([(cursor + left) / 2, left - cursor]);
      fBox(level, wallKey, f, (cursor + left) / 2, st.base + st.h / 2, -WALL_T / 2,
        left - cursor, st.h, WALL_T, tile);
    }
    // Apron under the opening.
    if (o.bottom > 0.02) {
      fBox(level, wallKey, f, o.off, st.base + o.bottom / 2, -WALL_T / 2, o.w, o.bottom, WALL_T, tile);
    }
    // Head over it: stepped courses when arched, a plain spandrel otherwise.
    if (o.arched) {
      archedHead(level, f, o, st, wallKey, tile);
    } else if (st.h - o.top > 0.02) {
      fBox(level, wallKey, f, o.off, st.base + (o.top + st.h) / 2, -WALL_T / 2,
        o.w, st.h - o.top, WALL_T, tile);
    }
    cursor = o.off + o.w / 2;
  }
  if (f.len / 2 - cursor > 0.02) {
    piers.push([(cursor + f.len / 2) / 2, f.len / 2 - cursor]);
    fBox(level, wallKey, f, (cursor + f.len / 2) / 2, st.base + st.h / 2, -WALL_T / 2,
      f.len / 2 - cursor, st.h, WALL_T, tile);
  }

  // ---- horizontal banding ----
  if (st.index === 0) {
    // Plinth: a splayed base course, wider than the wall, all the way round.
    fPrism(level, 'concrete', f, 0, 0.24,
      [[0, 0], [PLINTH_OUT, 0.06], [PLINTH_OUT, PLINTH_H - 0.09], [PLINTH_OUT * 0.55, PLINTH_H], [0, PLINTH_H]],
      f.len + 0.02, 3.0);
  }
  if (!top) {
    // String course at the floor line.
    fPrism(level, spec.style === 1 ? 'concrete' : wallKey, f, 0, st.base + st.h - 0.34,
      [[0, 0], [BAND_OUT * 0.5, 0], [BAND_OUT, 0.07], [BAND_OUT, 0.24], [BAND_OUT * 0.4, 0.3], [0, 0.3]],
      f.len + 0.01, spec.style === 1 ? 3.0 : tile);
  } else {
    // Cornice, plus a dentil course on the rendered and brick styles.
    fPrism(level, spec.style === 2 ? 'concrete' : 'concrete', f, 0, st.base + st.h - 0.46,
      corniceProfile(0.3, 0.46), f.len + 0.6, 3.0);
    if (spec.style !== 2) {
      const n = Math.floor(f.len / 0.42);
      const gap = f.len / n;
      for (let i = 0; i < n; i++) {
        fBox(level, spec.style === 1 ? 'brick' : 'concrete', f, -f.len / 2 + gap * (i + 0.5),
          st.base + st.h - 0.62, 0.075, 0.2, 0.16, 0.19, spec.style === 1 ? 2.4 : 3.0);
      }
    }
  }

  // ---- limewashed dado on the ground storey ----
  // Painted onto the piers only, so the paint stops dead at every reveal and
  // doorway. That is what makes it read as paint: a band that runs across an
  // opening reads as a decal, and one that runs the full length of the wall
  // reads as a change of material.
  //
  // The height is derived from the building's own coordinates rather than the
  // shared RNG so all four elevations of one building agree, which they have to —
  // a dado that steps at the corner is worse than no dado.
  if (st.index === 0 && damage < 0.5) {
    const hash = Math.abs(spec.cx * 7.31 + spec.cz * 13.17) % 1;
    const y0 = 0.24 + PLINTH_H - 0.04;
    const y1 = y0 + 0.62 + hash * 0.55;
    for (const [off, len] of piers) {
      if (len < 0.45) continue;
      fBox(level, 'plaster', f, off, (y0 + y1) / 2, 0.03, len - 0.05, y1 - y0, 0.06, 2.4, LIME);
      // Brush line at the top: paint applied by hand does not end on a straight
      // edge, and the shadow this throws is what stops the band reading as flat.
      fBox(level, 'plaster', f, off, y1 - 0.02, 0.045, len - 0.05, 0.05, 0.09, 1.2, LIME);
    }
  }

  // ---- render loss and impact scarring ----
  //
  // Between the plinth, the string course and the openings, a bay of wall is
  // still a two-metre square of unbroken plaster, and at mid range that is the
  // largest flat plane left on the building. Two things break it, and both of
  // them are things that have actually happened to the wall rather than noise:
  //
  //  - render that has come off in sheets, showing the blockwork behind. The lip
  //    of surviving plaster round the patch is what sells it — a flush change of
  //    material is a texture swap, a 30 mm lip with a shadow under it is damage.
  //  - spalling, where a burst has taken the face off in a scatter of shallow
  //    craters. Clustered along a line and biased to the shot side of the pier,
  //    because that is what a burst does; sprinkled evenly it reads as noise.
  //
  // Kept off the outer blocks and the back elevations: at 130 triangles a patch
  // this is the most expensive detail per square metre on the building, and it is
  // relief measured in centimetres, so it stops paying past about twenty metres.
  const scarred = spec.detail !== 'lite' && (isFront || f.axis === 'x' || damage > 0.3);
  for (const [off, len] of scarred ? piers : []) {
    if (len < 0.7) continue;
    const wallTop = st.base + st.h - 0.5;
    const wallBot = st.base + (st.index === 0 ? PLINTH_H + 0.5 : 0.4);
    if (wallTop - wallBot < 0.6) continue;

    const patches = rng.next() < 0.5 + damage * 0.4 ? rng.int(1, 2) : 0;
    for (let i = 0; i < patches; i++) {
      const pw = Math.min(len - 0.2, rng.range(0.5, 1.6));
      const ph = Math.min(wallTop - wallBot, rng.range(0.45, 1.5));
      const pOff = off + rng.range(-(len - pw) / 2, (len - pw) / 2);
      const pY = rng.range(wallBot + ph / 2, wallTop - ph / 2);
      fBox(level, 'brick', f, pOff, pY, 0.008, pw, ph, 0.016, 1.6);
      // Surviving render round two sides of the hole, in ragged lengths.
      const steps = Math.max(2, Math.round(pw / 0.3));
      for (let k = 0; k < steps; k++) {
        if (rng.next() < 0.3) continue;
        const sl = pw / steps;
        fBox(level, 'plaster', f, pOff - pw / 2 + sl * (k + 0.5),
          pY + ph / 2 - rng.range(0, 0.09), 0.015, sl * 0.98, rng.range(0.06, 0.16), 0.03, 0.8);
      }
      const vSteps = Math.max(2, Math.round(ph / 0.3));
      const vSide = rng.next() < 0.5 ? -1 : 1;
      for (let k = 0; k < vSteps; k++) {
        if (rng.next() < 0.35) continue;
        const sh = ph / vSteps;
        fBox(level, 'plaster', f, pOff + vSide * (pw / 2 - rng.range(0, 0.09)),
          pY - ph / 2 + sh * (k + 0.5), 0.015, rng.range(0.05, 0.14), sh * 0.98, 0.03, 0.8);
      }
    }

    // Spalling from a burst: one cluster, walked across the pier.
    if (rng.next() < 0.3 + damage * 0.5) {
      const cx0 = off + rng.range(-len / 3, len / 3);
      const cy0 = rng.range(wallBot + 0.2, wallTop - 0.2);
      const dirX = rng.range(-1, 1);
      const dirY = rng.range(-0.4, 0.4);
      const n = rng.int(5, 11);
      for (let k = 0; k < n; k++) {
        const t = k / n;
        const sx2 = cx0 + dirX * t * rng.range(0.7, 1.3) * (len * 0.4);
        const sy2 = cy0 + dirY * t * rng.range(0.7, 1.3) * 0.9;
        if (Math.abs(sx2 - off) > len / 2 - 0.1) continue;
        if (sy2 < wallBot || sy2 > wallTop) continue;
        const cr = rng.range(0.08, 0.24);
        fRotBox(level, 'rubble', f, sx2, sy2, 0.012, cr, cr * rng.range(0.6, 1.4), 0.024, 0.7,
          rng.range(0, 3.14));
      }
    }
  }

  // ---- opening dressing ----
  for (const o of openings) {
    dressOpening(level, spec, f, st, o, wallKey, tile, isFront, rng);
  }

  // ---- projecting extras on the street elevation ----
  if (isFront && st.index === 0 && (spec.shopfront ?? false)) {
    buildShopAwning(level, f, st, openings, rng);
  }
  if (isFront && (spec.balconies ?? false) && st.index > 0) {
    buildBalconies(level, f, st, openings, rng);
  }
  // Signage on every ground-storey elevation, not just the street front.
  //
  // Restricted to fronts, the whole map carried 276 triangles of signage — eight
  // or nine boards — which is nothing against a complaint that there is "no
  // signage, no Arabic text, no painted shopfronts" anywhere in the set. A corner
  // shop signs both its faces and a lock-up down an alley signs the alley, so
  // this is also just what a town looks like. The boards merge into batches that
  // already exist, so raising the count is close to free in draw calls.
  if (st.index === 0) {
    buildSignage(level, f, st, openings, rng);
  }
  if (isFront && st.index > 0) {
    buildUpperSignage(level, f, st, rng);
  }
}

/**
 * Painted script on the blank wall above the shopfront.
 *
 * The elevations carry a lot of bare plaster between the string course and the
 * openings — the review called the wall over the arcade "a bare plane" — and a
 * painted advert is what is actually on that wall in a town like this. It is also
 * the cheapest possible relief: 10 mm of paint over a couple of square metres,
 * costing one batch that the shopfront boards already opened.
 */
function buildUpperSignage(level: LevelSystem, f: FaceRef, st: Storey, rng: RNG): void {
  if (rng.next() < 0.72) return;
  const paint = SIGN_PAINT[rng.int(0, SIGN_PAINT.length - 1)];
  const ink = paint.opts.variant === 'signOchre' ? LETTER_DARK : LETTER_LIGHT;
  const wide = Math.min(f.len * rng.range(0.3, 0.5), 3.4);
  const off = rng.range(-f.len / 2 + wide / 2 + 0.6, f.len / 2 - wide / 2 - 0.6);
  const y = st.base + st.h * rng.range(0.55, 0.75);
  const bandH = rng.range(0.55, 0.85);
  fBox(level, paint.key, f, off, y, 0.03, wide, bandH, 0.015, 1.8, paint.opts);
  const script = scriptRun(wide - 0.22, bandH * 0.58, 0.01, () => rng.next());
  fRelief(level, 'corrugated', f, off, y, 0.045, script, ink);
  script.dispose();
}

function layoutOpenings(
  spec: BuildingSpec,
  f: FaceRef,
  st: Storey,
  isFront: boolean,
  damage: number,
  rng: RNG,
): Opening[] {
  const out: Opening[] = [];
  const shop = st.kind === 'shop';

  // Bay rhythm, varied per building rather than fixed at 3.5 m.
  //
  // A constant bay target means every building on the map puts its windows at
  // the same centres, at the same width and at the same sill height, so at the
  // range where a facade is reduced to its window grid — which is most of the
  // skyline in any capture — the buildings really are the same object. Two
  // review passes in a row called this out and per-object tone variation cannot
  // fix it, because the thing repeating is a *pattern*, not a colour.
  //
  // Hashed off the plot position rather than drawn from `rng`, so a building's
  // rhythm is a property of the building and stays put whatever else changes in
  // the generation order, and so the four elevations of one building agree with
  // each other. Pitch, proportion and sill all move, which is enough: a facade
  // on a 2.9 m bay with tall narrow lights does not read as the same object as
  // one on a 4.3 m bay with square ones, even side by side.
  const hA = hash2(spec.cx, spec.cz);
  const hB = hash2(spec.cz * 1.7, spec.cx * 0.9 + 11);
  const hC = hash2(spec.cx * 0.31 + 5, spec.cz * 2.3);
  const bayTarget = shop && isFront ? 3.7 + hA * 1.2 : 2.85 + hA * 1.65;
  const bays = Math.max(1, Math.round(f.len / bayTarget));
  const spacing = f.len / bays;
  // Some elevations are coupled: two narrow lights to a bay instead of one wide
  // one. It changes the *count*, which is the loudest part of a window grid.
  const paired = hB > 0.68 && !shop && spacing > 2.9;

  const winH = Math.min(1.5 + hB * 0.62, st.h - 1.45);
  const sill = Math.max(0.72 + hC * 0.34, st.h - (0.5 + hC * 0.5) - winH);
  const doorBay = Math.floor(bays / 2);

  for (let i = 0; i < bays; i++) {
    const off = -f.len / 2 + spacing * (i + 0.5);
    const isDoor = st.index === 0 && isFront && i === doorBay;
    const isShop = shop && isFront && !isDoor;

    if (isDoor) {
      out.push({
        off, w: 1.3, bottom: 0, top: spec.arches ? 2.25 : 2.2,
        kind: 'door', arched: !!spec.arches, fill: 'open',
      });
      continue;
    }
    if (isShop) {
      const sw = Math.min(spacing * (0.54 + hC * 0.16), 2.9);
      out.push({
        off, w: sw, bottom: 0.28, top: 2.4 + hB * 0.3, kind: 'shop',
        arched: !!spec.arches && rng.next() < 0.6, fill: 'open',
      });
      continue;
    }

    const ww = paired
      ? Math.min(0.78, spacing * 0.24)
      : Math.min(1.05 + hC * 0.42, spacing * (0.3 + hB * 0.16));
    const slots = paired ? [off - ww * 0.78, off + ww * 0.78] : [off];
    for (const so of slots) {
      const o: Opening = {
        off: so, w: ww, bottom: sill, top: sill + winH, kind: 'window',
        arched: !!spec.arches && rng.next() < 0.45 && st.index > 0,
        fill: pickFill(spec, st, isFront, rng),
      };
      // Shell damage blows the opening out into a ragged hole and takes the
      // frame with it.
      if (damage > 0 && rng.next() < damage * 0.4) {
        o.kind = 'blown';
        o.fill = 'open';
        o.w = Math.min(o.w * rng.range(1.3, 1.9), (paired ? ww * 1.4 : spacing) - 0.3);
        o.bottom = Math.max(0, o.bottom - rng.range(0.2, 0.7));
        o.top = Math.min(st.h - 0.5, o.top + rng.range(0.1, 0.6));
        o.arched = false;
      }
      out.push(o);
    }
  }
  return out;
}

/** Stable 0..1 hash of a plot position, for per-building constants. */
function hash2(a: number, b: number): number {
  const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

function pickFill(spec: BuildingSpec, st: Storey, isFront: boolean, rng: RNG): Opening['fill'] {
  if (spec.mashrabiya && st.index > 0 && isFront && rng.next() < 0.5) return 'screen';
  const r = rng.next();
  if (r < 0.24) return 'glazed';
  if (r < 0.42) return 'open';
  if (r < 0.56) return 'shuttered';
  if (r < 0.68) return 'broken';
  if (r < 0.79) return 'boarded';
  if (r < 0.88) return 'grille';
  if (r < 0.94 && st.index <= 1) return 'sandbag';
  return 'glazed';
}

/** Stepped voussoir arch plus the masonry infill of the spandrels. */
function archedHead(
  level: LevelSystem,
  f: FaceRef,
  o: Opening,
  st: Storey,
  wallKey: MaterialKey,
  tile: number,
): void {
  const r = o.w / 2;
  const springY = st.base + o.top - r;
  const slices = 5;

  // Infill in horizontal courses; each course spans out to the arch curve, so
  // the soffit steps and the spandrels fill themselves.
  for (let i = 0; i < slices; i++) {
    const y0 = springY + (r * i) / slices;
    const y1 = springY + (r * (i + 1)) / slices;
    const ym = (y0 + y1) / 2;
    const halfOpen = Math.sqrt(Math.max(0, r * r - Math.pow(ym - springY, 2)));
    const segW = (o.w / 2 - halfOpen);
    if (segW > 0.02) {
      for (const side of [-1, 1]) {
        fBox(level, wallKey, f, o.off + side * (halfOpen + segW / 2), (y0 + y1) / 2,
          -WALL_T / 2, segW, y1 - y0, WALL_T, tile);
      }
    }
  }
  // Wall above the crown.
  const crown = springY + r;
  const above = st.base + st.h - crown;
  if (above > 0.02) {
    fBox(level, wallKey, f, o.off, crown + above / 2, -WALL_T / 2, o.w, above, WALL_T, tile);
  }

  // Arched soffit lining, set into the wall so the head of the opening has a
  // curved reveal to catch the sun rather than a stepped black slot.
  const soff = 7;
  for (let i = 0; i < soff; i++) {
    const a = Math.PI - (Math.PI * (i + 0.5)) / soff;
    const seg = ((Math.PI * r) / soff) * 1.1;
    const geo = new THREE.BoxGeometry(seg, 0.06, WALL_T + 0.02);
    scaleUV(geo, seg, 0.06, WALL_T, 2.4);
    fPush(level, 'plasterInterior', f, o.off + Math.cos(a) * (r - 0.03),
      springY + Math.sin(a) * (r - 0.03), -WALL_T / 2, geo, a - Math.PI / 2, INSIDE);
    geo.dispose();
  }

  // Voussoir ring on the outer face, standing proud of the wall.
  const vs = 9;
  const ringT = 0.24;
  const arcW = (Math.PI * (r + ringT / 2)) / vs * 1.12;
  for (let i = 0; i < vs; i++) {
    const a = Math.PI - (Math.PI * (i + 0.5)) / vs;
    const rr = r + ringT / 2;
    // The crown stone is deeper and stands a little further out: an arch
    // without a keystone has no centre, and it is the first thing the eye
    // looks for.
    const key = i === (vs - 1) / 2;
    const tOut = key ? 0.19 : 0.13;
    const tRad = key ? ringT * 1.5 : ringT;
    const geo = new THREE.BoxGeometry(arcW * (key ? 1.15 : 1), tRad, tOut);
    scaleUV(geo, arcW, tRad, tOut, 1.2);
    fPush(level, 'concrete', f, o.off + Math.cos(a) * (r + tRad / 2),
      springY + Math.sin(a) * (r + tRad / 2), tOut / 2 + 0.005, geo, a - Math.PI / 2);
    geo.dispose();
  }
  // Impost blocks at the springing: the ring has to land on something, and a
  // ring that springs straight off a flat wall is the detail the review called
  // architecturally illiterate.
  for (const side of [-1, 1]) {
    fBox(level, 'concrete', f, o.off + side * (r + 0.09), springY - 0.09, 0.1,
      0.36, 0.18, 0.2 + WALL_T * 0.3, 1.4);
    fBox(level, 'concrete', f, o.off + side * (r + 0.07), springY - 0.22, 0.075,
      0.3, 0.09, 0.15, 1.0);
  }
}

function dressOpening(
  level: LevelSystem,
  spec: BuildingSpec,
  f: FaceRef,
  st: Storey,
  o: Opening,
  wallKey: MaterialKey,
  tile: number,
  isFront: boolean,
  rng: RNG,
): void {
  const yb = st.base + o.bottom;
  const yt = st.base + o.top;

  if (o.kind === 'blown') {
    // Ragged edge: a few displaced blocks and a stub of rebar.
    for (let i = 0; i < 4; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const bs = rng.range(0.14, 0.3);
      const geo = new THREE.BoxGeometry(bs, bs * 0.7, WALL_T * rng.range(0.5, 0.9));
      scaleUV(geo, bs, bs * 0.7, WALL_T, 1.0);
      fPush(level, 'rubble', f, o.off + side * (o.w / 2 - 0.05), yb + rng.range(0.1, o.top - o.bottom - 0.2),
        -0.1, geo, rng.range(-0.5, 0.5));
      geo.dispose();
    }
    const bar = cyl(0.012, 0.012, rng.range(0.3, 0.7), 4, 0.4);
    fPush(level, 'corrugated', f, o.off + rng.range(-o.w / 3, o.w / 3), yt - 0.1, -0.08, bar, rng.range(-1.2, 1.2));
    bar.dispose();
    return;
  }

  // On a `lite` building's back and side elevations the opening gets its shadow
  // line and a dark void behind it, but none of the joinery: at the range those
  // faces are ever seen a mullion is sub-pixel, and there are hundreds of them.
  const lite = spec.detail === 'lite' && !isFront;

  // ---- surround: an architrave that wraps the jambs *and* the head ----
  //
  // The single most-cited defect in three reviews of these facades has been
  // "every opening is a flat rectangle on the wall plane". It was not quite
  // true — there was a 55 mm architrave and a 110 mm setback — but 55 mm is
  // under a pixel of shadow at 15 m and the eye reads none of it. What a wall
  // with thickness looks like at that range is a *band of shadow* along the
  // head and down one jamb, and the only way to get one is relief measured in
  // the same units as the wall is thick. So: a 130 mm surround standing proud,
  // a reveal that runs the full depth of the wall, and the joinery set back far
  // enough behind the face that the head casts onto it.
  const surroundOut = lite ? 0.07 : 0.13;
  const jambW = 0.15;
  if (o.kind !== 'shop') {
    for (const side of [-1, 1]) {
      fBox(level, spec.style === 1 ? 'concrete' : wallKey, f, o.off + side * (o.w / 2 + jambW / 2),
        (yb + yt) / 2 - 0.04, surroundOut / 2 + 0.001, jambW, yt - yb + 0.08, surroundOut, 2.2);
      // Chamfered return on the outer arris, so the band has an edge highlight
      // on one side and a shadow on the other rather than one flat face.
      fBox(level, spec.style === 1 ? 'concrete' : wallKey, f, o.off + side * (o.w / 2 + jambW - 0.02),
        (yb + yt) / 2 - 0.04, surroundOut * 0.55, 0.05, yt - yb + 0.08, surroundOut * 0.9, 1.4);
    }
    if (!o.arched) {
      fBox(level, spec.style === 1 ? 'concrete' : wallKey, f, o.off, yt + jambW / 2 + 0.02,
        surroundOut / 2 + 0.001, o.w + jambW * 2, jambW, surroundOut, 2.2);
    }
  }

  // ---- lintel: the deepest single shadow line on the elevation ----
  const lintelW = o.w + (o.kind === 'shop' ? 0.5 : jambW * 2 + 0.2);
  if (!o.arched) {
    fBox(level, o.kind === 'shop' ? 'concrete' : spec.style === 1 ? 'concrete' : wallKey, f, o.off,
      yt + 0.22, 0.075, lintelW, 0.2, 0.15 + WALL_T, 2.4);
    // Bearing pads where the lintel sits on the jambs.
    for (const side of [-1, 1]) {
      fBox(level, 'concrete', f, o.off + side * (o.w / 2 + jambW * 0.6), yt + 0.07, 0.05,
        0.22, 0.1, 0.1 + WALL_T * 0.5, 1.2);
    }
  }

  // ---- sill ----
  if (o.bottom > 0.15 && lite) {
    fBox(level, 'concrete', f, o.off, yb - 0.09, 0.09, o.w + 0.4, 0.16, 0.18 + WALL_T, 2.0);
  } else if (o.bottom > 0.15) {
    // 210 mm nose with the drip throat under it, and stub horns returning into
    // the jambs at each end so the sill is built in rather than stuck on.
    const sw = o.w + jambW * 2 + 0.16;
    fPrism(level, 'concrete', f, o.off - sw / 2, yb - 0.15, sillProfile(0.21, 0.17), sw, 2.0);
    for (const side of [-1, 1]) {
      fBox(level, 'concrete', f, o.off + side * (sw / 2 - 0.055), yb - 0.28, 0.09,
        0.11, 0.26, 0.18, 1.2);
    }
  } else if (o.kind === 'door' || o.kind === 'shop') {
    // Threshold step down to the pavement.
    const tw = o.w + 0.3;
    fPrism(level, 'concrete', f, o.off - tw / 2, st.base - 0.05,
      [[0, 0], [0.34, 0], [0.34, 0.1], [0, 0.14]], tw, 2.0);
  }

  // ---- reveal lining: jamb faces and a soffit, running the wall's depth ----
  //
  // These are the surfaces the head shadow lands on. They are lined in interior
  // plaster rather than the wall material because a reveal is rendered on the
  // inside face, and because the tone break is a second cue that the plane has
  // turned through ninety degrees.
  const revealKey: MaterialKey = 'plasterInterior';
  for (const side of [-1, 1]) {
    fBox(level, revealKey, f, o.off + side * (o.w / 2 - 0.03), (yb + yt) / 2, -WALL_T / 2 - 0.01,
      0.07, yt - yb, WALL_T + 0.02, 3.0, INSIDE);
  }
  if (!o.arched) {
    // Soffit, dropped 60 mm below the opening head. That drop is the shadow: a
    // soffit flush with the top of the hole leaves nothing for the sun to cut.
    fBox(level, revealKey, f, o.off, yt - 0.035, -WALL_T / 2 - 0.01, o.w, 0.07, WALL_T + 0.02, 3.0, INSIDE);
    fBox(level, revealKey, f, o.off, yt - 0.075, -0.06, o.w - 0.04, 0.05, 0.13, 2.0, INSIDE);
  }
  // Back sill inside the reveal, sloped, so looking up at the opening from the
  // street you see a lit ledge rather than a black slot.
  if (o.bottom > 0.15) {
    fBox(level, revealKey, f, o.off, yb + 0.03, -WALL_T / 2, o.w, 0.06, WALL_T, 2.4, INSIDE);
  }

  if (lite) {
    // Unlit room behind, set back far enough to read as volume not as paint.
    fBox(level, 'plasterInterior', f, o.off, (yb + yt) / 2, -WALL_T - 0.28,
      o.w + 0.2, yt - yb, 0.08, 3.0, INSIDE);
    void tile;
    return;
  }

  if (o.kind === 'door') {
    buildDoor(level, f, o, st, rng);
    return;
  }
  if (o.kind === 'shop') {
    buildShopfront(level, f, o, st, rng);
    return;
  }

  buildWindowFill(level, f, o, st, rng, isFront);
  void tile;
}

/** Four bars and a mullion — never a solid panel, which reads as boarded-up. */
function windowFrame(level: LevelSystem, f: FaceRef, o: Opening, st: Storey, depth: number): void {
  const yb = st.base + o.bottom;
  const yt = st.base + o.top;
  const h = yt - yb;
  const t = 0.055;
  const w = o.w - 0.03;

  fBox(level, 'wood', f, o.off, yb + t / 2, -depth, w, t, 0.07, 1.0);
  fBox(level, 'wood', f, o.off, yt - t / 2, -depth, w, t, 0.07, 1.0);
  for (const side of [-1, 1]) {
    fBox(level, 'wood', f, o.off + side * (w / 2 - t / 2), (yb + yt) / 2, -depth, t, h - t * 2, 0.07, 1.0);
  }
  // Mullion and transom.
  fBox(level, 'wood', f, o.off, (yb + yt) / 2, -depth, 0.045, h - t * 2, 0.06, 1.0);
  fBox(level, 'wood', f, o.off, yb + h * 0.55, -depth, w - t * 2, 0.04, 0.06, 1.0);
}

function glassPane(level: LevelSystem, f: FaceRef, off: number, yc: number, w: number, h: number, depth: number): void {
  if (w <= 0.02 || h <= 0.02) return;
  fBox(level, GLASS_KEY, f, off, yc, -depth, w, h, 0.02, 6.0, GLASS_OPTS);
}

function buildWindowFill(
  level: LevelSystem,
  f: FaceRef,
  o: Opening,
  st: Storey,
  rng: RNG,
  isFront: boolean,
): void {
  const yb = st.base + o.bottom;
  const yt = st.base + o.top;
  const h = yt - yb;
  // Sash set back most of the way through the wall. At 110 mm the reveal was
  // narrower than the architrave in front of it, so no shadow ever fell inside
  // the opening; at 230 mm the head throws a hard band across the top of the
  // glass whenever the sun is above about 25 degrees, which is the cue the
  // review said was missing.
  const frameDepth = 0.23;

  switch (o.fill) {
    case 'open':
      windowFrame(level, f, o, st, frameDepth);
      break;

    case 'glazed':
      windowFrame(level, f, o, st, frameDepth);
      glassPane(level, f, o.off - o.w / 4, yb + h * 0.775, o.w / 2 - 0.09, h * 0.4, frameDepth + 0.01);
      glassPane(level, f, o.off + o.w / 4, yb + h * 0.775, o.w / 2 - 0.09, h * 0.4, frameDepth + 0.01);
      glassPane(level, f, o.off - o.w / 4, yb + h * 0.27, o.w / 2 - 0.09, h * 0.46, frameDepth + 0.01);
      glassPane(level, f, o.off + o.w / 4, yb + h * 0.27, o.w / 2 - 0.09, h * 0.46, frameDepth + 0.01);
      break;

    case 'broken': {
      windowFrame(level, f, o, st, frameDepth);
      // Shards clinging to the frame corners rather than a full pane.
      const panes: Array<[number, number, number, number]> = [
        [-o.w / 4, yb + h * 0.86, o.w / 2 - 0.1, h * 0.16],
        [o.w / 4, yb + h * 0.3, o.w / 2 - 0.1, h * 0.3],
      ];
      for (const [ox, oy, pw, ph] of panes) {
        if (rng.next() < 0.75) glassPane(level, f, o.off + ox, oy, pw, ph, frameDepth + 0.01);
      }
      const plank = rng.next() < 0.5;
      if (plank) {
        const geo = new THREE.BoxGeometry(o.w + 0.18, 0.17, 0.035);
        scaleUV(geo, o.w + 0.18, 0.17, 0.035, 1.4);
        fPush(level, 'wood', f, o.off, yb + h * rng.range(0.35, 0.7), 0.045, geo, rng.range(-0.32, 0.32));
        geo.dispose();
      }
      break;
    }

    case 'boarded': {
      windowFrame(level, f, o, st, frameDepth);
      for (let i = 0; i < 3; i++) {
        const geo = new THREE.BoxGeometry(o.w + 0.2, rng.range(0.16, 0.24), 0.035);
        scaleUV(geo, o.w + 0.2, 0.2, 0.035, 1.4);
        fPush(level, 'wood', f, o.off + rng.range(-0.05, 0.05), yb + h * (0.2 + i * 0.3),
          0.05, geo, rng.range(-0.18, 0.18));
        geo.dispose();
      }
      break;
    }

    case 'shuttered': {
      windowFrame(level, f, o, st, frameDepth);
      const leafW = o.w / 2 - 0.02;
      for (const side of [-1, 1]) {
        // One leaf swung back against the wall about a third of the time.
        const openLeaf = rng.next() < 0.35;
        if (openLeaf) {
          const geo = new THREE.BoxGeometry(leafW, h - 0.06, 0.05);
          scaleUV(geo, leafW, h - 0.06, 0.05, 1.2);
          const hinge = o.off + side * o.w / 2;
          _q.identity();
          if (f.axis === 'z') {
            _m.compose(_p.set(f.tan + hinge + side * leafW * 0.35, (yb + yt) / 2, f.outer + f.sign * (0.06 + leafW * 0.42)), _q, _s);
            const rot = new THREE.Matrix4().makeRotationY(side * f.sign * 1.25);
            level.push('wood', geo.clone().applyMatrix4(rot).translate(0, 0, 0), _m);
          } else {
            _m.compose(_p.set(f.outer + f.sign * (0.06 + leafW * 0.42), (yb + yt) / 2, f.tan + hinge + side * leafW * 0.35), _q, _s);
            const rot = new THREE.Matrix4().makeRotationY(side * f.sign * 1.25);
            level.push('wood', geo.clone().applyMatrix4(rot), _m);
          }
          geo.dispose();
        } else {
          fBox(level, 'wood', f, o.off + side * (leafW / 2 + 0.01), (yb + yt) / 2, 0.055, leafW, h - 0.05, 0.05, 1.2);
          // Louvre slats.
          const slats = Math.max(3, Math.floor((h - 0.1) / 0.22));
          for (let k = 0; k < slats; k++) {
            fBox(level, 'wood', f, o.off + side * (leafW / 2 + 0.01),
              yb + 0.09 + ((h - 0.18) * (k + 0.5)) / slats, 0.085, leafW - 0.06, 0.09, 0.03, 0.8);
          }
        }
      }
      break;
    }

    case 'grille': {
      windowFrame(level, f, o, st, frameDepth);
      if (rng.next() < 0.5) glassPane(level, f, o.off, yb + h / 2, o.w - 0.1, h - 0.1, frameDepth + 0.01);
      const bars = Math.max(3, Math.round(o.w / 0.22));
      for (let i = 0; i < bars; i++) {
        fBox(level, 'corrugated', f, o.off - o.w / 2 + (o.w * (i + 0.5)) / bars, (yb + yt) / 2,
          0.03, 0.028, h - 0.02, 0.028, 0.5);
      }
      for (const fy of [0.28, 0.72]) {
        fBox(level, 'corrugated', f, o.off, yb + h * fy, 0.03, o.w - 0.02, 0.026, 0.026, 0.5);
      }
      break;
    }

    case 'sandbag': {
      // A firing position: bags stacked on the sill, a gap left to shoot through.
      const bag = bagGeometry(0.34, 0.14, 0.2);
      const rows = 2;
      for (let r = 0; r < rows; r++) {
        const n = Math.max(2, Math.floor(o.w / 0.4));
        for (let i = 0; i < n; i++) {
          if (r === rows - 1 && i === Math.floor(n / 2)) continue;
          const ox = o.off - o.w / 2 + (o.w * (i + 0.5)) / n;
          fPush(level, 'fabricSandbag', f, ox + rng.range(-0.02, 0.02), yb + 0.09 + r * 0.17,
            -0.16, bag, rng.range(-0.1, 0.1));
        }
      }
      bag.dispose();
      windowFrame(level, f, o, st, frameDepth);
      break;
    }

    case 'screen': {
      // Mashrabiya: a turned wooden lattice set forward of the reveal.
      const cols = Math.max(4, Math.round(o.w / 0.2));
      const rows = Math.max(5, Math.round(h / 0.22));
      for (let i = 0; i <= cols; i++) {
        fBox(level, 'wood', f, o.off - o.w / 2 + (o.w * i) / cols, (yb + yt) / 2, 0.035, 0.035, h - 0.02, 0.05, 0.7);
      }
      for (let j = 0; j <= rows; j++) {
        fBox(level, 'wood', f, o.off, yb + (h * j) / rows, 0.035, o.w, 0.035, 0.05, 0.7);
      }
      // Boxed-out lower panel, as the real screens have.
      fBox(level, 'wood', f, o.off, yb + 0.12, 0.11, o.w + 0.1, 0.24, 0.16, 0.9);
      break;
    }
  }

  // Occasional appliances and pot plants; nothing says "lived in" like clutter
  // that had to be fitted around the architecture.
  if (isFront && o.bottom > 0.5 && rng.next() < 0.16) {
    fBox(level, 'paintedMetalTan', f, o.off, yb - 0.24, 0.2, 0.62, 0.42, 0.36, 1.2);
    fBox(level, 'corrugated', f, o.off, yb - 0.47, 0.14, 0.5, 0.05, 0.24, 0.8);
  } else if (o.bottom > 0.5 && rng.next() < 0.14) {
    const pot = cyl(0.11, 0.08, 0.19, 8, 0.5);
    fPush(level, 'paintedMetalRed', f, o.off + rng.range(-o.w / 3, o.w / 3), yb + 0.09, -0.06, pot);
    pot.dispose();
  }
}

function buildDoor(level: LevelSystem, f: FaceRef, o: Opening, st: Storey, rng: RNG): void {
  const yb = st.base;
  const yt = st.base + o.top;
  const t = 0.06;
  // Frame only on the jambs and head; the opening stays walkable.
  for (const side of [-1, 1]) {
    fBox(level, 'wood', f, o.off + side * (o.w / 2 - t / 2), (yb + yt) / 2, -0.1, t, yt - yb, 0.1, 1.0);
  }
  fBox(level, 'wood', f, o.off, yt - t / 2, -0.1, o.w, t, 0.1, 1.0);

  // Leaf standing open against the inside of the wall.
  const leafW = o.w * 0.52;
  const geo = new THREE.BoxGeometry(0.05, yt - yb - 0.08, leafW);
  scaleUV(geo, 0.05, yt - yb - 0.08, leafW, 1.1);
  const hinge = o.off - o.w / 2;
  if (f.axis === 'z') {
    _m.makeTranslation(f.tan + hinge - leafW / 2 + 0.05, (yb + yt) / 2, f.outer - f.sign * (WALL_T + 0.06));
    const rot = new THREE.Matrix4().makeRotationY(Math.PI / 2);
    level.push('wood', geo.clone().applyMatrix4(rot), _m);
  } else {
    _m.makeTranslation(f.outer - f.sign * (WALL_T + 0.06), (yb + yt) / 2, f.tan + hinge - leafW / 2 + 0.05);
    level.push('wood', geo, _m);
  }
  geo.dispose();
  void rng;
}

function buildShopfront(level: LevelSystem, f: FaceRef, o: Opening, st: Storey, rng: RNG): void {
  const yb = st.base + o.bottom;
  const yt = st.base + o.top;
  const roll = rng.next();

  // Roller shutter, at whatever height it happened to be left.
  if (roll < 0.45) {
    const drop = rng.range(0.35, 0.95) * (yt - yb);
    fBox(level, 'corrugated', f, o.off, yt - drop / 2, -0.07, o.w - 0.04, drop, 0.05, 1.4);
    fBox(level, 'paintedMetalTan', f, o.off, yt + 0.16, -0.02, o.w + 0.2, 0.26, 0.3, 1.2);
    if (drop < (yt - yb) * 0.75) {
      fBox(level, 'wood', f, o.off, yb + 0.5, -0.4, o.w - 0.3, 0.09, 0.65, 2.0);
    }
  } else {
    // Open shop: stall board, goods, and a dark interior behind.
    fBox(level, 'wood', f, o.off, yb + 0.86, -0.3, o.w - 0.06, 0.1, 0.62, 2.0);
    fBox(level, 'wood', f, o.off, yb + 0.42, -0.06, o.w - 0.06, 0.84, 0.07, 2.0);
    for (let i = 0; i < rng.int(2, 5); i++) {
      const bs = rng.range(0.16, 0.3);
      const geo = new THREE.BoxGeometry(bs, bs * 0.75, bs * 0.8);
      scaleUV(geo, bs, bs * 0.75, bs, 0.6);
      fPush(level, rng.next() < 0.5 ? 'woodCrate' : 'fabricSandbag', f,
        o.off + rng.range(-o.w / 2 + 0.2, o.w / 2 - 0.2), yb + 0.92 + bs * 0.38, -0.3, geo, rng.range(0, 3));
      geo.dispose();
    }
    // Shelving up the back of the opening.
    for (let k = 0; k < 3; k++) {
      fBox(level, 'wood', f, o.off, yb + 1.2 + k * 0.5, -WALL_T - 0.25, o.w - 0.3, 0.05, 0.4, 1.6, INSIDE);
    }
  }
}

function buildShopAwning(level: LevelSystem, f: FaceRef, st: Storey, openings: Opening[], rng: RNG): void {
  const shops = openings.filter((o) => o.kind === 'shop' || o.kind === 'door');
  for (const o of shops) {
    if (rng.next() < 0.3) continue;
    // Hung 160 mm over the shop head, not 420 mm.
    //
    // At the larger offset these topped out at 3.35 m, and the review cameras sit
    // with the eye at 3.34: the alley capture came back with a galvanised sheet
    // 550 mm from the lens filling the right third of the frame as a blown-out
    // white ribbed plate. It is also simply wrong — a shop awning is something
    // you walk under, so its head sits just clear of the doorway and its free
    // edge lower still. Brought down, a run of them reads from the first floor as
    // a receding line of awning tops down the alley, which is what the shot wants.
    const y = st.base + o.top + 0.16;
    const reach = rng.range(1.0, 1.45);
    const wide = o.w + rng.range(0.3, 0.9);

    if (rng.next() < 0.55) {
      // ---- corrugated canopy on angled brackets ----
      //
      // Actually corrugated. This was a 50 mm flat box relying on the material's
      // painted stripe, which is exactly the fake the review named on the fence:
      // corrugation is 15 mm of relief that self-shadows, so under a raking sun
      // it is alternating soft-edged light and dark bands, and an albedo stripe
      // produces none of that. It is also the roof plane a player walking the
      // street sees most of, being at head height and tilted toward them.
      const tilt = 0.16;
      const geo = corrugatedPanel(wide, reach, {
        pitch: 0.16, amp: 0.014, thick: 0.014, bow: rng.range(-0.02, 0.03),
        rand: () => rng.next(), tile: 1.0,
      });
      // Authored upright in XY; lay it down and give it its fall.
      geo.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
      if (f.axis === 'z') {
        _q.setFromAxisAngle(_xAxis, -tilt * f.sign);
        _m.compose(_p.set(f.tan + o.off, y, f.outer + f.sign * reach / 2), _q, _s);
      } else {
        _q.setFromAxisAngle(_zAxis, tilt * f.sign);
        _m.compose(_p.set(f.outer + f.sign * reach / 2, y, f.tan + o.off), _q, _s);
        geo.applyMatrix4(new THREE.Matrix4().makeRotationY(Math.PI / 2));
      }
      level.push('corrugated', geo, _m);
      geo.dispose();
      // Purlin along the free edge, which is what the sheet is actually screwed
      // to, and the dark line that stops the canopy dissolving into the wall.
      const purlin = cyl(0.03, 0.03, wide + 0.1, 5, 0.5);
      const pm = new THREE.Matrix4();
      if (f.axis === 'z') {
        pm.makeRotationZ(Math.PI / 2).setPosition(f.tan + o.off, y - tilt * reach / 2 - 0.04, f.outer + f.sign * reach);
      } else {
        pm.makeRotationX(Math.PI / 2).setPosition(f.outer + f.sign * reach, y - tilt * reach / 2 - 0.04, f.tan + o.off);
      }
      level.push('corrugated', purlin, pm);
      purlin.dispose();
      for (const side of [-1, 1]) {
        const br = cyl(0.022, 0.022, Math.hypot(reach, 0.55), 5, 0.5);
        fPush(level, 'corrugated', f, o.off + side * (wide / 2 - 0.12), y - 0.3, reach / 2, br,
          Math.atan2(reach, 0.9) * (f.axis === 'z' ? 1 : 1));
        br.dispose();
      }
    } else {
      // Striped cloth awning, sagging between its poles. Striped in geometry:
      // bands of two dyes, each sagging on its own, so the sheet has hard colour
      // edges running down the fall that describe how much it has dropped.
      const tilt = 1.15;
      const stripe = CANOPY[rng.int(0, CANOPY.length - 1)];
      const bands = Math.max(4, Math.round(wide / 0.36));
      const bw = wide / bands;
      if (f.axis === 'z') {
        _q.setFromAxisAngle(_xAxis, f.sign > 0 ? tilt : -tilt);
        if (f.sign < 0) _q.premultiply(new THREE.Quaternion().setFromAxisAngle(_yAxis, Math.PI));
        _p.set(f.tan + o.off, y, f.outer + f.sign * 0.05);
      } else {
        _q.setFromAxisAngle(_yAxis, f.sign > 0 ? -Math.PI / 2 : Math.PI / 2);
        _q.multiply(new THREE.Quaternion().setFromAxisAngle(_xAxis, tilt));
        _p.set(f.outer + f.sign * 0.05, y, f.tan + o.off);
      }
      for (let b = 0; b < bands; b++) {
        const cloth = clothPanel(bw + 0.004, reach + 0.35, {
          sag: 0.14, fold: 0.04, folds: 2, tile: 2.0, segsX: 3, segsY: 4,
        });
        cloth.translate(-wide / 2 + bw * (b + 0.5), 0, 0);
        _m.compose(_p, _q, _s);
        level.push('fabricTarp', cloth, _m, (b % 2 === 0 ? stripe.a : stripe.b) as never);
        cloth.dispose();
      }
      // Front rail and legs so it is clearly supported.
      const rail = cyl(0.025, 0.025, wide, 5, 0.5);
      const railM = new THREE.Matrix4();
      if (f.axis === 'z') {
        railM.makeRotationZ(Math.PI / 2).setPosition(f.tan + o.off, y - 0.3, f.outer + f.sign * (reach + 0.1));
      } else {
        railM.makeRotationX(Math.PI / 2).setPosition(f.outer + f.sign * (reach + 0.1), y - 0.3, f.tan + o.off);
      }
      level.push('corrugated', rail, railM);
      rail.dispose();
    }
  }
}

function buildBalconies(level: LevelSystem, f: FaceRef, st: Storey, openings: Opening[], rng: RNG): void {
  for (const o of openings) {
    if (o.kind === 'blown' || rng.next() < 0.5) continue;
    const depth = rng.range(0.95, 1.35);
    const wide = o.w + rng.range(0.7, 1.3);
    const y = st.base + 0.02;

    // Slab with a nosing so it does not read as a shelf.
    fPrism(level, 'concrete', f, -wide / 2, y,
      [[0, 0], [depth, 0.02], [depth, 0.19], [depth - 0.06, 0.24], [0, 0.24]], wide, 2.4);
    // Support brackets underneath.
    for (const side of [-0.5, 0.5]) {
      fPrism(level, 'concrete', f, o.off + side * (wide - 0.4) - 0.06, y - 0.34,
        [[0, 0.34], [depth * 0.7, 0.34], [0, 0], [0, 0.34]], 0.12, 1.4);
    }

    const railH = 0.98;
    if (rng.next() < 0.5) {
      // Solid parapet with a coping and pierced slots.
      fBox(level, 'plaster', f, o.off, y + 0.24 + railH / 2, depth - 0.06, wide, railH, 0.12, 2.2);
      fPrism(level, 'concrete', f, o.off - wide / 2, y + 0.24 + railH,
        [[depth - 0.16, 0], [depth + 0.02, 0], [depth + 0.02, 0.07], [depth - 0.16, 0.07]], wide, 1.6);
      for (const side of [-1, 0, 1]) {
        fBox(level, 'concrete', f, o.off + side * wide * 0.26, y + 0.24 + railH * 0.55, depth - 0.06, 0.1, 0.34, 0.16, 1.0);
      }
      // Side cheeks.
      for (const side of [-1, 1]) {
        fBox(level, 'plaster', f, o.off + side * (wide / 2 - 0.06), y + 0.24 + railH / 2, depth / 2, 0.12, railH, depth, 2.2);
      }
    } else {
      // Metal railing: top and bottom rails with uprights.
      for (const ry of [0.1, railH - 0.06]) {
        fBox(level, 'corrugated', f, o.off, y + 0.24 + ry, depth - 0.05, wide, 0.05, 0.05, 0.6);
      }
      const n = Math.max(5, Math.round(wide / 0.16));
      for (let i = 0; i <= n; i++) {
        fBox(level, 'corrugated', f, o.off - wide / 2 + (wide * i) / n, y + 0.24 + railH / 2, depth - 0.05, 0.026, railH, 0.026, 0.5);
      }
      for (const side of [-1, 1]) {
        for (const ry of [0.1, railH - 0.06]) {
          fBox(level, 'corrugated', f, o.off + side * wide / 2, y + 0.24 + ry, depth / 2, 0.05, 0.05, depth, 0.6);
        }
      }
    }

    // Stored junk and washing: the reason a balcony reads as inhabited.
    const junk = rng.int(0, 2);
    for (let i = 0; i < junk; i++) {
      const bs = rng.range(0.3, 0.5);
      const geo = new THREE.BoxGeometry(bs, bs, bs * 0.8);
      scaleUV(geo, bs, bs, bs, 1.1);
      fPush(level, rng.next() < 0.6 ? 'woodCrate' : 'paintedMetalGreen', f,
        o.off + rng.range(-wide / 3, wide / 3), y + 0.24 + bs / 2, depth * 0.5, geo, rng.range(0, 3));
      geo.dispose();
    }
    if (rng.next() < 0.5) {
      const line = wide * 0.9;
      const cloth = clothPanel(rng.range(0.4, 0.7), rng.range(0.5, 0.85), { fold: 0.05, folds: 3, tile: 1.4, segsX: 5, segsY: 4 });
      fPush(level, 'fabricTarp', f, o.off + rng.range(-line / 3, line / 3), y + 0.24 + railH - 0.02, depth - 0.02, cloth);
      cloth.dispose();
    }
  }
}

/**
 * Shopfront signage, with lettering on it.
 *
 * The boards were already here and they were blank, which is worse than having
 * none: a saturated rectangle with nothing written on it reads as a placeholder.
 * A sign is a *board, a border, a painted field and a line of script*, and the
 * script is the part that does the work — it is the only hard-edged man-made
 * pattern in a town otherwise built entirely of sand-coloured masonry, so it is
 * simultaneously what says which country this is and what stops the palette
 * reading as one extruded material.
 *
 * Three kinds, because a real street has three kinds: a fascia board over the
 * opening, a projecting sign hung square to the wall so it breaks the facade
 * plane and stays legible down the street, and paint applied straight onto the
 * plaster by someone who could not afford a board.
 */
function buildSignage(level: LevelSystem, f: FaceRef, st: Storey, openings: Opening[], rng: RNG): void {
  const anchors = openings.filter((o) => o.kind === 'shop' || o.kind === 'door');
  for (const o of anchors) {
    if (rng.next() < 0.16) continue;
    const y = st.base + o.top + (rng.next() < 0.5 ? 0.95 : 1.25);
    const paint = SIGN_PAINT[rng.int(0, SIGN_PAINT.length - 1)];
    // Dark script on the pale ochre field, chalk on everything else — the same
    // decision a signwriter makes, and the one that keeps the text readable.
    const ink = paint.opts.variant === 'signOchre' ? LETTER_DARK : LETTER_LIGHT;
    const roll = rng.next();

    if (roll < 0.52) {
      // ---- fascia board across the shopfront ----
      const wide = o.w + rng.range(0.2, 0.7);
      const boardH = rng.range(0.44, 0.6);
      // A frame standing 25 mm proud of the field, so the board has an edge and
      // a shadow rather than being a decal on the wall.
      fBox(level, 'corrugated', f, o.off, y, 0.085, wide + 0.06, boardH + 0.06, 0.05, 1.6);
      fBox(level, paint.key, f, o.off, y, 0.12, wide, boardH, 0.05, 1.6, paint.opts);
      const script = scriptRun(wide - 0.16, boardH * 0.62, 0.014, () => rng.next());
      fRelief(level, 'corrugated', f, o.off, y + boardH * 0.04, 0.145, script, ink);
      script.dispose();
      // Strip light on a bracket under it, and the conduit feeding it.
      if (rng.next() < 0.5) {
        fBox(level, 'corrugated', f, o.off, y - boardH / 2 - 0.09, 0.16, wide - 0.2, 0.07, 0.07, 0.6);
        fBox(level, 'corrugated', f, o.off + wide / 2 - 0.05, y + boardH / 2 + 0.3, 0.06, 0.03, 0.62, 0.03, 0.4);
      }
      // Cleats tying it back to the wall.
      for (const s of [-1, 1]) {
        fBox(level, 'corrugated', f, o.off + s * (wide / 2 - 0.09), y, 0.05, 0.05, boardH * 0.8, 0.06, 0.4);
      }
    } else if (roll < 0.8) {
      // ---- projecting sign ----
      const reach = rng.range(0.7, 1.05);
      const arm = cyl(0.02, 0.02, reach, 5, 0.5);
      const armM = new THREE.Matrix4();
      if (f.axis === 'z') {
        armM.makeRotationX(Math.PI / 2).setPosition(f.tan + o.off, y + 0.34, f.outer + f.sign * reach / 2);
      } else {
        armM.makeRotationZ(Math.PI / 2).setPosition(f.outer + f.sign * reach / 2, y + 0.34, f.tan + o.off);
      }
      level.push('corrugated', arm, armM);
      arm.dispose();
      // Diagonal stay back to the wall — an unbraced cantilever at this reach
      // would have folded, and the triangle is most of what reads at distance.
      const stay = cyl(0.013, 0.013, Math.hypot(reach, 0.36), 4, 0.5);
      const sm = new THREE.Matrix4();
      const lean = Math.atan2(reach, 0.36);
      if (f.axis === 'z') {
        sm.makeRotationX(f.sign * lean).setPosition(f.tan + o.off, y + 0.16, f.outer + f.sign * reach / 2);
      } else {
        sm.makeRotationZ(-f.sign * lean).setPosition(f.outer + f.sign * reach / 2, y + 0.16, f.tan + o.off);
      }
      level.push('corrugated', stay, sm);
      stay.dispose();

      const sw = rng.range(0.55, 0.85);
      const sh = rng.range(0.5, 0.78);
      const px = f.axis === 'z' ? f.tan + o.off : f.outer + f.sign * (reach - 0.05);
      const pz = f.axis === 'z' ? f.outer + f.sign * (reach - 0.05) : f.tan + o.off;
      _m.makeTranslation(px, y, pz);
      if (f.axis === 'z') level.box(paint.key, 0.05, sh, sw, _m, 1.2, paint.opts as never);
      else level.box(paint.key, sw, sh, 0.05, _m, 1.2, paint.opts as never);
      // Script on both faces — this sign is read from up and down the street.
      for (const side of [-1, 1]) {
        const txt = scriptRun(sw - 0.12, sh * 0.5, 0.012, () => rng.next());
        _q.setFromAxisAngle(_yAxis, f.axis === 'z' ? (side > 0 ? Math.PI / 2 : -Math.PI / 2) : (side > 0 ? 0 : Math.PI));
        _p.set(
          px + (f.axis === 'z' ? side * 0.026 : 0),
          y,
          pz + (f.axis === 'z' ? 0 : side * 0.026),
        );
        _m.compose(_p, _q, _s);
        level.push('corrugated', txt, _m, ink as never);
        txt.dispose();
      }
      const hang = cyl(0.012, 0.012, 0.34, 4, 0.4);
      _m.makeTranslation(px, y + 0.2, pz);
      level.push('corrugated', hang, _m);
      hang.dispose();
    } else {
      // ---- painted straight onto the render ----
      // No board at all: a panel of colour brushed onto the plaster with the
      // trade written across it. The cheapest sign there is, and the one that
      // dates a shopfront, because the paint fades and the wall shows through.
      const wide = Math.min(o.w + 0.5, 2.8);
      const bandH = rng.range(0.5, 0.72);
      fBox(level, paint.key, f, o.off, y, 0.035, wide, bandH, 0.02, 1.6, paint.opts);
      const script = scriptRun(wide - 0.2, bandH * 0.6, 0.01, () => rng.next());
      fRelief(level, 'corrugated', f, o.off, y, 0.05, script, ink);
      script.dispose();
    }

    // Fly-posted bills beside the door, at the height a hand reaches. Pasted in
    // an overlapping block the way they actually go up, and the one element on
    // the wall small enough to give the eye something at close range.
    if (rng.next() < 0.42) {
      const side = rng.next() < 0.5 ? -1 : 1;
      const bx = o.off + side * (o.w / 2 + rng.range(0.25, 0.55));
      if (Math.abs(bx) < f.len / 2 - 0.5) {
        for (let i = 0; i < rng.int(2, 4); i++) {
          const bw = rng.range(0.24, 0.38);
          const bh = rng.range(0.32, 0.5);
          fBox(
            level, 'fabricTarp', f,
            bx + rng.range(-0.1, 0.1), st.base + rng.range(1.15, 1.85), 0.016,
            bw, bh, 0.008, 0.9, BILL_PAPER,
          );
        }
      }
    }
  }
}

function buildDrainpipes(
  level: LevelSystem,
  spec: BuildingSpec,
  cx: number,
  cz: number,
  w: number,
  d: number,
  topY: number,
  rng: RNG,
): void {
  const corners: Array<[number, number]> = [
    [cx - w / 2 + 0.2, cz - d / 2 + 0.2],
    [cx + w / 2 - 0.2, cz - d / 2 + 0.2],
    [cx - w / 2 + 0.2, cz + d / 2 - 0.2],
    [cx + w / 2 - 0.2, cz + d / 2 - 0.2],
  ];
  for (const [px, pz] of corners) {
    if (rng.next() < 0.4) continue;
    const h = topY - 0.1;
    const pipe = cyl(0.062, 0.062, h - 0.35, 7, 0.7);
    _m.makeTranslation(px, 0.35 + (h - 0.35) / 2, pz);
    level.push('corrugated', pipe, _m);
    pipe.dispose();
    // Hopper head under the parapet and a shoe at the bottom.
    _m.makeTranslation(px, h - 0.12, pz);
    level.box('corrugated', 0.2, 0.26, 0.2, _m, 0.7);
    _m.makeTranslation(px, 0.2, pz);
    level.box('corrugated', 0.16, 0.3, 0.16, _m, 0.6);
    for (let k = 1; k < Math.floor(h / 1.6); k++) {
      _m.makeTranslation(px, k * 1.6, pz);
      level.box('corrugated', 0.13, 0.05, 0.13, _m, 0.4);
    }
  }
  void spec;
}

// -------------------------------------------------------------------- roof ---

/**
 * Relief on the inside face of a parapet: skirting, scuppers, riser pipes.
 *
 * All of it is 60–140 mm of projection, which is the right amount — a parapet is
 * not a detailed object, it is a plain wall that has a handful of necessary
 * things attached to it at irregular intervals. What it buys is that the surface
 * now has verticals on it at human spacing, so the eye can measure the twelve
 * metres of it, and it has two or three small dark shapes so the value is not
 * one flat number all the way along.
 */
function parapetInner(
  level: LevelSystem,
  cx: number,
  cz: number,
  w: number,
  d: number,
  deck: number,
  pT: number,
  wallKey: MaterialKey,
  tile: number,
  rng: RNG,
): void {
  const sides: Array<[number, number, boolean, number]> = [
    [0, -d / 2 + pT, true, 1],
    [0, d / 2 - pT, true, -1],
    [-w / 2 + pT, 0, false, 1],
    [w / 2 - pT, 0, false, -1],
  ];
  for (const [ox, oz, alongX, inward] of sides) {
    const len = (alongX ? w : d) - pT * 2;
    // A fillet where the screed is turned up against the parapet, which is how
    // a flat roof is actually waterproofed and reads as a continuous highlight
    // running the length of the wall.
    for (let i = 0; i < 2; i++) {
      const seg = len * rng.range(0.3, 0.5);
      const t = rng.range(-len / 2 + seg / 2, len / 2 - seg / 2);
      const px = cx + ox + (alongX ? t : (inward * 0.05));
      const pz = cz + oz + (alongX ? (inward * 0.05) : t);
      _m.makeTranslation(px, deck + 0.06, pz);
      level.box(
        'concrete', alongX ? seg : 0.16, 0.12, alongX ? 0.16 : seg, _m, 2.2, LIME,
      );
    }
    // Scuppers: a slot through the parapet at deck level with a stained lip.
    const scuppers = rng.int(1, 2);
    for (let i = 0; i < scuppers; i++) {
      const t = rng.range(-len / 2 + 1.2, len / 2 - 1.2);
      const px = cx + ox + (alongX ? t : 0);
      const pz = cz + oz + (alongX ? 0 : t);
      // Cheeks either side and a head over, so the opening is framed.
      for (const s of [-1, 1]) {
        _m.makeTranslation(
          px + (alongX ? s * 0.24 : -inward * 0.06),
          deck + 0.12,
          pz + (alongX ? -inward * 0.06 : s * 0.24),
        );
        level.box('concrete', alongX ? 0.1 : 0.14, 0.24, alongX ? 0.14 : 0.1, _m, 1.0);
      }
      _m.makeTranslation(
        px + (alongX ? 0 : -inward * 0.06), deck + 0.28, pz + (alongX ? -inward * 0.06 : 0),
      );
      level.box('concrete', alongX ? 0.58 : 0.14, 0.08, alongX ? 0.14 : 0.58, _m, 1.2);
    }
    // A riser pipe or two arriving over the coping, clipped back to the wall.
    const risers = rng.int(1, 2);
    for (let i = 0; i < risers; i++) {
      const t = rng.range(-len / 2 + 0.8, len / 2 - 0.8);
      const px = cx + ox + (alongX ? t : -inward * 0.09);
      const pz = cz + oz + (alongX ? -inward * 0.09 : t);
      const ph = rng.range(0.7, 1.3);
      const pipe = cyl(0.032, 0.032, ph, 6, 0.5);
      _m.makeTranslation(px, deck + ph / 2, pz);
      level.push('corrugated', pipe, _m);
      pipe.dispose();
      // Clips, and a stub elbow turning away along the deck.
      for (let k = 0; k < 2; k++) {
        _m.makeTranslation(px, deck + 0.3 + k * 0.55, pz);
        level.box('corrugated', 0.1, 0.045, 0.1, _m, 0.4);
      }
      const elbow = cyl(0.032, 0.032, 0.5, 6, 0.5);
      _q.setFromAxisAngle(alongX ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1), Math.PI / 2);
      _m.compose(
        _p.set(px + (alongX ? 0 : inward * 0.25), deck + 0.06, pz + (alongX ? inward * 0.25 : 0)),
        _q, _s,
      );
      level.push('corrugated', elbow, _m);
      elbow.dispose();
    }
    // A run of stone offcuts left stacked against the wall by whoever last
    // patched the roof. Two per side, so there is something with a top edge on
    // the wall line without cluttering the deck.
    if (rng.next() < 0.7) {
      const t = rng.range(-len / 2 + 1.0, len / 2 - 1.0);
      const stack = rng.int(2, 4);
      for (let k = 0; k < stack; k++) {
        const sw = rng.range(0.38, 0.6);
        _q.setFromAxisAngle(_yAxis, rng.range(-0.12, 0.12));
        _m.compose(
          _p.set(
            cx + ox + (alongX ? t + rng.range(-0.05, 0.05) : -inward * (0.18 + rng.range(-0.03, 0.03))),
            deck + 0.05 + k * 0.09,
            cz + oz + (alongX ? -inward * (0.18 + rng.range(-0.03, 0.03)) : t + rng.range(-0.05, 0.05)),
          ),
          _q, _s,
        );
        const slab = boxUV(alongX ? sw : 0.3, 0.09, alongX ? 0.3 : sw, 1.6);
        level.push(k === stack - 1 ? 'concrete' : wallKey, slab, _m);
        slab.dispose();
      }
    }
  }
  void tile;
}

/**
 * The building's water and aerial plant, as one composed group.
 *
 * Put at whichever inset deck corner is furthest from the firing positions and
 * from the head-house, so on a key roof it lands in the middle distance of the
 * overwatch view: close enough to read as objects, far enough not to be cover.
 * Everything here is on the same steel stand and fed by the same riser, which is
 * why it reads as a place that gets water rather than as props on a plane.
 */
function roofServices(
  level: LevelSystem,
  cx: number,
  cz: number,
  w: number,
  d: number,
  deck: number,
  bulkX: number,
  bulkZ: number,
  wallKey: MaterialKey,
  tile: number,
  rng: RNG,
): void {
  const inset = 3.2;
  let best: { x: number; z: number; sx: number; sz: number } | null = null;
  let bestScore = -1;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = cx + sx * (w / 2 - inset);
      const z = cz + sz * (d / 2 - inset);
      let toPost = 1e9;
      for (const p of POSTS) {
        toPost = Math.min(toPost, Math.hypot(x - p.x, z - p.z));
      }
      const toHead = Math.hypot(x - bulkX, z - bulkZ);
      const score = Math.min(toPost, 14) + Math.min(toHead, 10) * 0.6;
      if (score > bestScore) { bestScore = score; best = { x, z, sx, sz }; }
    }
  }
  if (!best) return;
  const { x: gx, z: gz, sx, sz } = best;

  // Steel stand: four legs, a braced frame, and a boarded deck on top. The tanks
  // sit high enough to give the header pressure a real one would need, which is
  // also what puts them on the skyline.
  const standH = 1.45;
  const fw = 2.5;
  const fd = 1.5;
  for (const lx of [-fw / 2 + 0.08, fw / 2 - 0.08]) {
    for (const lz of [-fd / 2 + 0.08, fd / 2 - 0.08]) {
      _m.makeTranslation(gx + lx, deck + standH / 2, gz + lz);
      level.box('corrugated', 0.09, standH, 0.09, _m, 0.7);
      // Pad under each leg, so the frame is not growing out of the screed.
      _m.makeTranslation(gx + lx, deck + 0.04, gz + lz);
      level.box('concrete', 0.26, 0.08, 0.26, _m, 1.0);
    }
  }
  for (const by of [standH * 0.42, standH - 0.1]) {
    _m.makeTranslation(gx, deck + by, gz - fd / 2 + 0.08);
    level.box('corrugated', fw - 0.16, 0.06, 0.06, _m, 0.6);
    _m.makeTranslation(gx, deck + by, gz + fd / 2 - 0.08);
    level.box('corrugated', fw - 0.16, 0.06, 0.06, _m, 0.6);
    _m.makeTranslation(gx - fw / 2 + 0.08, deck + by, gz);
    level.box('corrugated', 0.06, 0.06, fd - 0.16, _m, 0.6);
    _m.makeTranslation(gx + fw / 2 - 0.08, deck + by, gz);
    level.box('corrugated', 0.06, 0.06, fd - 0.16, _m, 0.6);
  }
  // Diagonal cross-brace on the two visible flanks: the thing that makes a steel
  // frame read as a steel frame rather than four posts.
  for (const s of [-1, 1]) {
    const lenD = Math.hypot(fw - 0.16, standH - 0.2);
    _q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.atan2(standH - 0.2, (fw - 0.16) * s));
    _m.compose(_p.set(gx, deck + standH / 2, gz + s * (fd / 2 - 0.08)), _q, _s);
    const brace = boxUV(lenD, 0.045, 0.045, 0.6);
    level.push('corrugated', brace, _m);
    brace.dispose();
  }
  // Boarded platform the tanks stand on.
  for (let i = 0; i < 5; i++) {
    _m.makeTranslation(gx - fw / 2 + 0.24 + i * ((fw - 0.48) / 4), deck + standH + 0.03, gz);
    level.box('woodCrate', 0.2, 0.06, fd - 0.1, _m, 1.0);
  }

  // Two tanks of different size and colour: nobody buys a matched pair.
  const tanks: Array<[number, number, number, MaterialKey]> = [
    [-0.62, 0.5, 1.4, 'polymerBlack'],
    [0.66, 0.42, 1.05, 'paintedMetalTan'],
  ];
  for (const [off, r, hgt, key] of tanks) {
    const opts = key === 'polymerBlack' ? TANK : undefined;
    const body = cyl(r, r, hgt, 14, 1.6);
    _m.makeTranslation(gx + off, deck + standH + 0.06 + hgt / 2, gz);
    level.push(key, body, _m, opts);
    body.dispose();
    // Domed lid ring and an inspection hatch, so the top is not a flat disc on
    // the skyline.
    const rim = ring(r * 0.98, 0.05, 14, 6, 0.7);
    _m.makeRotationX(Math.PI / 2).setPosition(gx + off, deck + standH + 0.06 + hgt, gz);
    level.push(key, rim, _m, opts);
    rim.dispose();
    _m.makeTranslation(gx + off, deck + standH + 0.1 + hgt, gz + r * 0.35);
    level.box('paintedMetalTan', r * 0.5, 0.09, r * 0.5, _m, 0.8);
    // Ball valve and overflow.
    const over = cyl(0.022, 0.022, 0.4, 5, 0.4);
    _q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
    _m.compose(_p.set(gx + off, deck + standH + hgt - 0.1, gz - r - 0.14), _q, _s);
    level.push('corrugated', over, _m);
    over.dispose();
  }

  // Riser and distribution: up the parapet, along under the stand, into each
  // tank, then a gravity main dropping back into the building.
  const px = cx + sx * (w / 2 - 0.5);
  const pz = cz + sz * (d / 2 - 0.5);
  const riser = cyl(0.04, 0.04, standH + 1.2, 7, 0.6);
  _m.makeTranslation(px, deck + (standH + 1.2) / 2, pz);
  level.push('corrugated', riser, _m);
  riser.dispose();
  // The horizontal run between parapet and stand, in two dog-legs.
  const runLen = Math.abs(px - gx) + 0.2;
  _q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
  _m.compose(_p.set((px + gx) / 2, deck + standH + 0.9, pz), _q, _s);
  const runA = cyl(0.04, 0.04, runLen, 6, 0.6);
  level.push('corrugated', runA, _m);
  runA.dispose();
  const run2 = Math.abs(pz - gz) + 0.2;
  _q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
  _m.compose(_p.set(gx, deck + standH + 0.9, (pz + gz) / 2), _q, _s);
  const runB = cyl(0.04, 0.04, run2, 6, 0.6);
  level.push('corrugated', runB, _m);
  runB.dispose();
  for (const [off] of tanks) {
    const drop = cyl(0.026, 0.026, 0.9, 5, 0.5);
    _m.makeTranslation(gx + off + 0.3, deck + standH + 0.5, gz + 0.1);
    level.push('corrugated', drop, _m);
    drop.dispose();
  }

  // Aerial mast lashed to the stand leg, with cross-arms and a dish. Grouping it
  // with the tanks is both what happens and what the silhouette wants: one tall
  // spike beside a pair of drums, instead of two lonely objects.
  const mh = rng.range(3.4, 4.6);
  const mast = cyl(0.035, 0.055, mh, 6, 0.6);
  const mx = gx + fw / 2 - 0.02;
  const mz = gz + fd / 2 + 0.14;
  _m.makeTranslation(mx, deck + mh / 2, mz);
  level.push('corrugated', mast, _m);
  mast.dispose();
  for (const cy of [0.4, 0.95]) {
    _m.makeTranslation(mx, deck + cy, mz);
    level.box('corrugated', 0.2, 0.05, 0.2, _m, 0.4);
  }
  const arms = rng.int(3, 4);
  for (let a = 0; a < arms; a++) {
    const ay = deck + mh * (0.55 + 0.4 * (a / Math.max(1, arms - 1)));
    const al = rng.range(0.45, 0.95);
    _q.setFromAxisAngle(_yAxis, rng.range(0, 1.2));
    _m.compose(_p.set(mx, ay, mz), _q, _s);
    const arm = boxUV(al, 0.022, 0.022, 0.35);
    level.push('corrugated', arm, _m);
    arm.dispose();
    // Elements standing off the arm, which is what gives an aerial its comb.
    for (const e of [-1, 1]) {
      _m.compose(_p.set(mx + e * al * 0.36, ay + 0.11, mz), _q, _s);
      const el = boxUV(0.018, 0.22, 0.018, 0.3);
      level.push('corrugated', el, _m);
      el.dispose();
    }
  }
  // Dish clamped low on the mast, tilted at the satellite.
  dishHead(level, mx + 0.28, deck + mh * 0.4, mz + 0.1, rng.range(0.3, 0.42),
    DISH_BEARING + rng.range(-0.18, 0.18), DISH_TILT + rng.range(-0.05, 0.05), rng);
  // Guys from the mast head down to the stand and the parapet.
  for (const [ax, az] of [[gx - fw / 2, gz - fd / 2], [px, pz]] as Array<[number, number]>) {
    const guy = sagCable(
      new THREE.Vector3(mx, deck + mh * 0.92, mz),
      new THREE.Vector3(ax, deck + 0.9, az),
      0.05, 0.006, 5,
    );
    level.push('polymerBlack', guy, _m.identity(), FLAT);
    guy.dispose();
  }

  // Underneath the stand is the one dry shaded spot on a roof, so it is where
  // things get put: a stack of tiles, a drum, a coil of hose.
  for (let k = 0; k < 4; k++) {
    _m.makeTranslation(gx - 0.5 + rng.range(-0.15, 0.15), deck + 0.05 + k * 0.1, gz + rng.range(-0.2, 0.2));
    level.box(wallKey, 0.44, 0.1, 0.3, _m, 1.6);
  }
  const drum = cyl(0.28, 0.28, 0.62, 10, 1.2);
  _m.makeTranslation(gx + 0.72, deck + 0.31, gz - 0.1);
  level.push('paintedMetalRed', drum, _m);
  drum.dispose();
  for (const hy of [0.18, 0.44]) {
    const hoop = ring(0.285, 0.02, 10, 5, 0.4);
    _m.makeRotationX(Math.PI / 2).setPosition(gx + 0.72, deck + hy, gz - 0.1);
    level.push('paintedMetalRed', hoop, _m);
    hoop.dispose();
  }
  const coil = ring(0.3, 0.045, 12, 6, 0.6);
  _m.makeRotationX(Math.PI / 2).setPosition(gx + 0.1, deck + 0.05, gz + fd / 2 + 0.5);
  level.push('polymerBlack', coil, _m);
  coil.dispose();
  void tile;
}

/**
 * Where every dish on the map looks: one satellite, one bearing, one elevation.
 */
const DISH_BEARING = 2.72;
const DISH_TILT = 0.62;

/**
 * The dish itself: bowl, rim, back struts, LNB arm and feed horn.
 *
 * `yaw` is the compass bearing it points on, `tilt` its elevation above the
 * horizon. What was here was a single-sided spherical cap, which from behind is
 * invisible and from the side is a hard-edged half disc — the review found one
 * in the roof shot and reasonably called it a backface error.
 */
function dishHead(
  level: LevelSystem,
  dx: number,
  dy: number,
  dz: number,
  r: number,
  yaw: number,
  tilt: number,
  rng: RNG,
): void {
  const face = new THREE.Quaternion().setFromAxisAngle(_yAxis, yaw);
  face.multiply(new THREE.Quaternion().setFromAxisAngle(_xAxis, -tilt));
  // Local axes of the dish: +Z out of the bowl, +X across, +Y up the face.
  const out = new THREE.Vector3(0, 0, 1).applyQuaternion(face);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(face);

  // Eighteen segments, not fourteen. The silhouette is the whole asset here — a
  // dish is a circle on a stick — and a 14-gon at 8 m has visibly straight
  // stretches around the rim, which is what made it read as a lumpy ovoid.
  const bowl = parabolicDish(r, r * 0.32, 18, 3, 0.022);
  _m.compose(_p.set(dx, dy, dz), face, _s);
  level.push('paintedMetalTan', bowl, _m);
  bowl.dispose();

  // Back struts and the boss the mount clamps to.
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    const arm = new THREE.Vector3(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62, 0)
      .applyQuaternion(face);
    const strut = cyl(0.012, 0.012, r * 0.7, 4, 0.3);
    const dir = new THREE.Vector3().copy(arm).addScaledVector(out, -r * 0.34).normalize();
    _q.setFromUnitVectors(_yAxis, dir);
    _m.compose(
      _p.set(dx, dy, dz).addScaledVector(arm, 0.5).addScaledVector(out, -r * 0.2),
      _q, _s,
    );
    level.push('gunmetal', strut, _m);
    strut.dispose();
  }
  const boss = cyl(0.055, 0.07, 0.14, 8, 0.3);
  _q.setFromUnitVectors(_yAxis, out.clone().negate());
  _m.compose(_p.set(dx, dy, dz).addScaledVector(out, -r * 0.4), _q, _s);
  level.push('gunmetal', boss, _m);
  boss.dispose();

  // LNB on an arm out of the bowl, offset-fed so it comes off the bottom edge.
  const armEnd = new THREE.Vector3(dx, dy, dz)
    .addScaledVector(out, r * 0.62)
    .addScaledVector(up, -r * 0.72);
  const armDir = new THREE.Vector3().subVectors(armEnd, new THREE.Vector3(dx, dy, dz)
    .addScaledVector(up, -r * 0.92));
  const armLen = armDir.length();
  const boom = cyl(0.014, 0.016, armLen, 4, 0.3);
  _q.setFromUnitVectors(_yAxis, armDir.normalize());
  _m.compose(
    _p.copy(armEnd).addScaledVector(armDir, -armLen / 2),
    _q, _s,
  );
  level.push('gunmetal', boom, _m);
  boom.dispose();
  const horn = cyl(0.05, 0.032, 0.14, 8, 0.3);
  _q.setFromUnitVectors(_yAxis, out.clone().negate());
  _m.compose(_p.copy(armEnd), _q, _s);
  level.push('polymerTan', horn, _m);
  horn.dispose();
  // Coax dropping away from the LNB.
  const drop = slackCable(
    armEnd.clone(),
    new THREE.Vector3(dx, dy - r * 1.6 - rng.range(0.1, 0.5), dz).addScaledVector(out, -0.2),
    0.14, 0.008, 5,
  );
  level.push('polymerBlack', drop, _m.identity(), FLAT);
  drop.dispose();
}

/** Dish on a short pole, bolted to a deck: the commonest thing on any roof. */
function satelliteDish(level: LevelSystem, px: number, deck: number, pz: number, rng: RNG): void {
  const poleH = rng.range(0.8, 1.4);
  const pole = cyl(0.035, 0.04, poleH, 6, 0.5);
  _m.makeTranslation(px, deck + poleH / 2, pz);
  level.push('corrugated', pole, _m);
  pole.dispose();
  // Base plate and the bolts through it, so the pole lands on something.
  _m.makeTranslation(px, deck + 0.02, pz);
  level.box('gunmetal', 0.24, 0.04, 0.24, _m, 0.5);
  for (const [bx, bz] of [[-0.08, -0.08], [0.08, -0.08], [-0.08, 0.08], [0.08, 0.08]]) {
    _m.makeTranslation(px + bx, deck + 0.055, pz + bz);
    level.box('gunmetal', 0.03, 0.03, 0.03, _m, 0.2);
  }
  const r = rng.range(0.34, 0.55);
  // All of them on the same bearing, give or take a few degrees.
  //
  // Randomised, the roofscape reads as scattered pale discs at unrelated angles,
  // and any one of them caught side-on is the "broken half circle" the review
  // found. Every dish in a town points at the same geostationary satellite, so
  // aiming them together is both correct and the thing that makes a dozen of them
  // read as a communications rooftop rather than as a dozen loose primitives —
  // repetition that means something instead of repetition that looks like a bug.
  const yaw = DISH_BEARING + rng.range(-0.22, 0.22);
  // Elbow bracket the dish hangs off, offset from the pole head.
  const arm = cyl(0.026, 0.026, 0.24, 5, 0.3);
  _q.setFromAxisAngle(_zAxis, Math.PI / 2);
  _q.premultiply(new THREE.Quaternion().setFromAxisAngle(_yAxis, yaw));
  _m.compose(_p.set(px + Math.sin(yaw) * 0.1, deck + poleH + 0.04, pz + Math.cos(yaw) * 0.1), _q, _s);
  level.push('gunmetal', arm, _m);
  arm.dispose();
  dishHead(
    level,
    px + Math.sin(yaw) * (0.16 + r * 0.4), deck + poleH + 0.06, pz + Math.cos(yaw) * (0.16 + r * 0.4),
    r, yaw, DISH_TILT + rng.range(-0.06, 0.06), rng,
  );
}

function buildRoof(
  level: LevelSystem,
  spec: BuildingSpec,
  cx: number,
  cz: number,
  w: number,
  d: number,
  topY: number,
  wallKey: MaterialKey,
  tile: number,
  damage: number,
  rng: RNG,
  well: StairWell,
  hasStair: boolean,
  extStair: { dir: Dir; plan: ExtStairPlan } | null,
): void {
  const deck = topY + 0.12;

  // Roof deck. A shelled building loses a bite out of it, which lets daylight
  // into the top floor and gives the silhouette a broken edge.
  const holes: SlabHole[] = [];
  const hole = damage > 0.45
    ? { x: cx + rng.range(-w / 5, w / 5), z: cz + rng.range(-d / 5, d / 5), w: rng.range(2.4, 4.2), d: rng.range(2.4, 4.0) }
    : undefined;
  if (hole) holes.push(hole);
  // The breach continues through the roof, otherwise the shaft is a dark well.
  const shaft = shaftAt(spec);
  if (shaft) holes.push({ x: shaft.x, z: shaft.z, w: shaft.w + 0.5, d: shaft.d + 0.5 });
  // The stair comes out here, under the head-house.
  if (hasStair) holes.push({ x: well.x, z: well.z, w: well.w, d: well.d });
  // The deck itself takes the screed tone too, so the 450 mm border outside the
  // bays and the joints between them do not read as a pale grid on a dark field.
  slabWithHole(level, 'concreteFloor', cx, cz, w, d, topY + 0.06, 0.12, holes, 4, SCREED);
  if (shaft) {
    breachEdge(level, { ...shaft, w: shaft.w + 0.5, d: shaft.d + 0.5 }, deck, rng);
    // Blast debris thrown clear of the hole across the deck.
    for (let i = 0; i < 16; i++) {
      const a = rng.next() * Math.PI * 2;
      const rr = shaft.w * 0.6 + Math.sqrt(rng.next()) * 2.6;
      const bs = rng.range(0.12, 0.34);
      _q.setFromEuler(new THREE.Euler(rng.range(-0.4, 0.4), rng.range(0, 6.28), rng.range(-0.4, 0.4)));
      _m.compose(_p.set(shaft.x + Math.cos(a) * rr, deck + bs * 0.3, shaft.z + Math.sin(a) * rr), _q, _s);
      const chunk = boxUV(bs * 1.3, bs * 0.6, bs, 0.9);
      level.push('rubble', chunk, _m);
      chunk.dispose();
    }
  }
  if (hole) {
    // Exposed slab reinforcement around the breach.
    for (let i = 0; i < 7; i++) {
      const t = rng.next() * Math.PI * 2;
      const bar = cyl(0.011, 0.011, rng.range(0.4, 1.0), 4, 0.4);
      _q.setFromAxisAngle(new THREE.Vector3(Math.cos(t), 0, Math.sin(t)), rng.range(0.9, 1.5));
      _m.compose(_p.set(hole.x + Math.cos(t) * hole.w * 0.5, deck + 0.1, hole.z + Math.sin(t) * hole.d * 0.5), _q, _s);
      level.push('corrugated', bar, _m);
      bar.dispose();
    }
  }

  // ---- edge beam: what the roof slab is actually built on ----
  //
  // The slab on its own is a 120 mm plate with square arrises, and where the
  // top storey is set back it oversails as an unsupported card — which is
  // exactly how the golden-hour review described the hero building: "a clean
  // flat plane with sharp square edges, no thickness variation, no rebar, no
  // formwork lines, no broken corner, no drainage spout". None of that is
  // decoration; every item on that list is a thing an in-situ concrete roof
  // has, and together they are the difference between a slab and a card.
  const eb = 0.34;
  for (const [ox, oz, bw, bd] of [
    [0, -d / 2 + 0.09, w + 0.36, 0.3],
    [0, d / 2 - 0.09, w + 0.36, 0.3],
    [-w / 2 + 0.09, 0, 0.3, d + 0.36],
    [w / 2 - 0.09, 0, 0.3, d + 0.36],
  ] as Array<[number, number, number, number]>) {
    const alongX = bw > bd;
    _m.makeTranslation(cx + ox, topY - eb / 2 + 0.06, cz + oz);
    level.box('concrete', bw, eb, bd, _m, 2.6);
    // Drip nib on the underside of the nose: a 30 mm return that stops rain
    // tracking back along the soffit, and the reason the underside of every
    // concrete edge has a shadow line 40 mm in from its face.
    _m.makeTranslation(cx + ox, topY - eb + 0.03, cz + oz);
    level.box('concrete', alongX ? bw : 0.09, 0.06, alongX ? 0.09 : bd, _m, 1.2);
    // Formwork board marks across the fascia: 200 mm boards leave a joint every
    // 200 mm, and that is the only texture a shuttered face has.
    const runLen = alongX ? bw : bd;
    const boards = Math.max(1, Math.round(eb / 0.19));
    for (let b = 1; b < boards; b++) {
      _m.makeTranslation(
        cx + ox + (alongX ? 0 : (ox > 0 ? 0.16 : -0.16)),
        topY + 0.06 - (eb * b) / boards,
        cz + oz + (alongX ? (oz > 0 ? 0.16 : -0.16) : 0),
      );
      level.box('concrete', alongX ? runLen : 0.03, 0.022, alongX ? 0.03 : runLen, _m, 0.8);
    }
    // Drainage spout through the beam, one per side.
    const st2 = rng.range(-0.3, 0.3) * runLen;
    const spout = cyl(0.045, 0.045, 0.44, 6, 0.4);
    _q.setFromAxisAngle(alongX ? _xAxis : _zAxis, Math.PI / 2);
    _m.compose(
      _p.set(
        cx + ox + (alongX ? st2 : (ox > 0 ? 0.24 : -0.24)),
        topY - 0.06,
        cz + oz + (alongX ? (oz > 0 ? 0.24 : -0.24) : st2),
      ),
      _q, _s,
    );
    level.push('corrugated', spout, _m);
    spout.dispose();
  }
  // Beam ends through the wall face, on two elevations.
  //
  // In this construction the roof joists bear on the wall head and are left
  // projecting, and the row of stubs is the most recognisable thing about the
  // eaves line in the vernacular. It is also the cheapest relief on the map:
  // a 160 mm square at 900 mm centres puts a hard tooth-and-gap rhythm right
  // under the parapet, which from the overwatch camera is the line that
  // separates one roof from the next across the whole middle distance — and
  // that middle distance was reading as a run of identical grey slabs.
  {
    const beamSide = rng.int(0, 3);
    const facesXZ: Array<[number, number]> = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    for (let f = 0; f < 4; f++) {
      if (f !== beamSide && f !== (beamSide + 2) % 4) continue;
      const [fx, fz] = facesXZ[f];
      const alongX = fx === 0;
      const runLen = (alongX ? w : d) - 1.2;
      const n = Math.max(3, Math.round(runLen / rng.range(0.8, 1.15)));
      const bs = rng.range(0.12, 0.18);
      for (let i = 0; i <= n; i++) {
        if (rng.next() < 0.12) continue;
        const t = -runLen / 2 + (runLen * i) / n;
        const out = rng.range(0.16, 0.34);
        _q.setFromAxisAngle(alongX ? _xAxis : _zAxis, rng.range(-0.05, 0.05));
        _m.compose(
          _p.set(
            cx + (alongX ? t : fx * (w / 2 + out / 2 - 0.04)),
            topY - eb - bs * 0.5 + rng.range(-0.02, 0.02),
            cz + (alongX ? fz * (d / 2 + out / 2 - 0.04) : t),
          ),
          _q, _s,
        );
        const stub = boxUV(alongX ? bs : out, bs, alongX ? out : bs, 0.7);
        level.push(rng.next() < 0.5 ? 'wood' : 'concrete', stub, _m);
        stub.dispose();
      }
    }
  }
  // A corner where the shuttering blew, or a shell took the nose off: rebar
  // hanging out of a ragged stub. One per building, on the corner furthest from
  // the front, so it breaks the silhouette without eating the hero elevation.
  if (damage > 0.15 || rng.next() < 0.45) {
    const sx2 = rng.next() < 0.5 ? -1 : 1;
    const sz2 = rng.next() < 0.5 ? -1 : 1;
    const bx = cx + sx2 * (w / 2 - 0.4);
    const bz = cz + sz2 * (d / 2 - 0.4);
    for (let i = 0; i < 5; i++) {
      const bar = cyl(0.011, 0.011, rng.range(0.45, 1.1), 4, 0.4);
      _q.setFromAxisAngle(new THREE.Vector3(Math.cos(i * 1.7), 0.2, Math.sin(i * 1.7)), rng.range(1.1, 1.6));
      _m.compose(
        _p.set(bx + sx2 * rng.range(0.1, 0.5), topY - 0.08 + rng.range(-0.06, 0.1), bz + sz2 * rng.range(0.1, 0.5)),
        _q, _s,
      );
      level.push('corrugated', bar, _m);
      bar.dispose();
    }
    for (let i = 0; i < 3; i++) {
      const cs = rng.range(0.16, 0.34);
      _q.setFromEuler(new THREE.Euler(rng.range(-0.4, 0.4), rng.range(0, 6.28), rng.range(-0.4, 0.4)));
      _m.compose(_p.set(bx + sx2 * rng.range(0, 0.35), topY - 0.12, bz + sz2 * rng.range(0, 0.35)), _q, _s);
      const chunk = boxUV(cs, cs * 0.7, cs * 0.9, 0.9);
      level.push('rubble', chunk, _m);
      chunk.dispose();
    }
  }
  // Where the top storey is set back, the oversail is carried on columns off
  // the terrace rather than floating. An unsupported 3.5 m cantilever is the
  // single least believable thing on the skyline.
  if ((spec.setback ?? 0) > 1.2) {
    const inset = spec.setback ?? 0;
    const fx = spec.front === 'east' ? 1 : spec.front === 'west' ? -1 : 0;
    const fz = spec.front === 'north' ? 1 : spec.front === 'south' ? -1 : 0;
    const colY = topY - (spec.upperH ?? 3.05);
    for (const t of [-0.3, 0.3]) {
      const px = cx + fx * (w / 2 - 0.5) + (fx === 0 ? t * w : 0);
      const pz = cz + fz * (d / 2 - 0.5) + (fz === 0 ? t * d : 0);
      const col = cyl(0.13, 0.15, topY - eb - colY, 6, 1.2);
      _m.makeTranslation(px, (colY + topY - eb) / 2, pz);
      level.push('concrete', col, _m);
      col.dispose();
      _m.makeTranslation(px, colY + 0.09, pz);
      level.box('concrete', 0.44, 0.18, 0.44, _m, 1.2);
    }
    void inset;
  }

  // ---- parapet: varied per side, with coping and gaps ----
  //
  // Thickness varies per elevation as well as height. Four parapets of the same
  // 260 mm on every building on the map is a tell you can read from the far side
  // of it: the roofscape becomes a set of identical grey bands at four heights,
  // which is what the overwatch review described.
  const pT = rng.range(0.22, 0.34);
  const sides: Array<[number, number, number, number, number]> = [
    [0, -d / 2 + pT / 2, w, pT, 0],
    [0, d / 2 - pT / 2, w, pT, 1],
    [-w / 2 + pT / 2, 0, pT, d, 2],
    [w / 2 - pT / 2, 0, pT, d, 3],
  ];
  const SIDE_DIRS: Dir[] = ['south', 'north', 'west', 'east'];
  for (const [ox, oz, pw, pd, idx] of sides) {
    const alongX = pw > pd;
    const len = alongX ? pw : pd;
    const segs = Math.max(2, Math.round(len / 3.2));
    const segLen = len / segs;
    // Front parapet stands taller — it is the one the skyline reads against.
    const isFrontSide =
      (spec.front === 'south' && idx === 0) || (spec.front === 'north' && idx === 1) ||
      (spec.front === 'west' && idx === 2) || (spec.front === 'east' && idx === 3);
    const baseH = isFrontSide ? rng.range(1.15, 1.5) : rng.range(0.85, 1.15);
    // The doorway the external stair arrives through. Offsets on this side run
    // the same way the facade's do, so the stair plan can be used directly.
    const gap = extStair && extStair.dir === SIDE_DIRS[idx]
      ? { lo: extStair.plan.arriveOff - 1.42, hi: extStair.plan.arriveOff + 0.1 }
      : null;

    for (let i = 0; i < segs; i++) {
      const t0 = -len / 2 + segLen * i;
      const r = rng.next();
      if (damage > 0.3 && r < damage * 0.3) continue;
      const h = damage > 0.2 && r < 0.18 + damage * 0.2 ? baseH * rng.range(0.35, 0.7) : baseH;
      // A segment straddling the stair doorway is emitted as the stubs either
      // side of it, so the opening costs 1.5 m of parapet and not 3.2 m.
      const runs: Array<[number, number]> = [[t0, t0 + segLen]];
      if (gap) {
        const cut: Array<[number, number]> = [];
        for (const [a, b] of runs) {
          if (gap.hi <= a || gap.lo >= b) { cut.push([a, b]); continue; }
          if (gap.lo > a) cut.push([a, gap.lo]);
          if (gap.hi < b) cut.push([gap.hi, b]);
        }
        runs.length = 0;
        runs.push(...cut);
      }
      for (const [a, b] of runs) {
        const sl = (b - a) * 0.99;
        if (sl < 0.12) continue;
        const t = (a + b) / 2;
        const px = cx + ox + (alongX ? t : 0);
        const pz = cz + oz + (alongX ? 0 : t);
        _m.makeTranslation(px, deck + h / 2, pz);
        level.box(wallKey, alongX ? sl : pw, h, alongX ? pd : sl, _m, tile);

        // Coping. A moulded stone rather than a flat cap: it overhangs the wall
        // both sides, weathers to one, and has a drip throat cut under each
        // nose.
        //
        // The reason this matters more than it sounds is the top edge. A cap
        // flush-ish with its wall gives one hard line where the parapet meets
        // the sky and nothing else, so from the roof camera the near parapets
        // came back as featureless planes with a bright hairline along the top —
        // literally the review's words. An overhanging nose puts a band of
        // shade *under* the stone on the shaded elevation and a lit sliver on
        // the sunny one, so the parapet reads as a wall with something laid on
        // top of it. Deliberately cool cement grey against the warm walls: the
        // coping is the one part nobody limewashes.
        const lost = damage > 0.25 && rng.next() < damage * 0.35;
        if (lost) {
          // Coping robbed or blown off: a bed of mortar with the stubs of two
          // stones still on it. Better than a bare wall top, which reads as
          // unfinished geometry rather than as damage.
          _m.makeTranslation(px, deck + h + 0.022, pz);
          level.box('rubble', alongX ? sl : pw + 0.03, 0.045, alongX ? pd + 0.03 : sl, _m, 1.0);
          for (const e of [-0.34, 0.38]) {
            const t2 = t + e * sl * 0.5;
            _m.makeTranslation(
              cx + ox + (alongX ? t2 : 0), deck + h + 0.09, cz + oz + (alongX ? 0 : t2),
            );
            level.box(
              'concrete', alongX ? sl * 0.2 : pw + 0.1, 0.09, alongX ? pd + 0.1 : sl * 0.2,
              _m, 1.4, COPING,
            );
          }
        } else {
          const cw = (alongX ? pd : pw) + 0.15;
          const geo = prism(copingProfile(cw, 0.11, 0.34), sl, 2.0, alongX ? 'x' : 'z');
          _m.makeTranslation(px, deck + h, pz);
          level.push('concrete', geo, _m, COPING);
          geo.dispose();
        }
      }
    }
  }

  // ---- unfinished columns: the storey that never got built ----
  //
  // On a structural grid, not scattered. A column stub sitting at a random point
  // on a deck is the one thing on this roof that cannot be explained — columns
  // land where the beams below them land — and four of them at four different
  // random offsets read as bollards. Set out at the quarter points of the plan
  // they read as a frame that stopped, which is what half the buildings in a town
  // like this actually are: the ground floor is trading and the owner is waiting
  // for the money to add a storey.
  if (spec.unfinished) {
    const hh = stairHead(well);
    const gxs = [cx - w * 0.28, cx + w * 0.28];
    const gzs = [cz - d * 0.28, cz, cz + d * 0.28];
    let placed = 0;
    const want = rng.int(3, 5);
    for (const gx of gxs) {
      for (const gz of gzs) {
        if (placed >= want) break;
        if (nearPost(gx, gz, 2.4)) continue;
        if (Math.abs(gx - hh.x) < hh.w / 2 + 0.6 && Math.abs(gz - hh.z) < hh.d / 2 + 0.6) continue;
        if (rng.next() < 0.2) continue;
        placed++;
        const ch = rng.range(0.75, 1.55);
        // Kicker at the base, where the previous pour stopped, then the column
        // with the board marks of its formwork still on it.
        _m.makeTranslation(gx, deck + 0.06, gz);
        level.box('concrete', 0.52, 0.12, 0.52, _m, 1.4);
        _m.makeTranslation(gx, deck + ch / 2, gz);
        level.box('concrete', 0.34, ch, 0.34, _m, 2.0);
        const lifts = Math.max(1, Math.round(ch / 0.42));
        for (let l = 1; l < lifts; l++) {
          _m.makeTranslation(gx, deck + (ch * l) / lifts, gz);
          level.box('concrete', 0.37, 0.025, 0.37, _m, 1.0);
        }
        // Starter cage: four bars with links round them, which is what makes it
        // read as reinforcement rather than as four wires.
        const barH = rng.range(0.5, 0.95);
        for (const [bx, bz] of [[-0.11, -0.11], [0.11, -0.11], [-0.11, 0.11], [0.11, 0.11]]) {
          const bar = cyl(0.011, 0.011, barH, 4, 0.4);
          _q.setFromAxisAngle(new THREE.Vector3(1, 0, 0.6), rng.range(-0.11, 0.11));
          _m.compose(_p.set(gx + bx, deck + ch + barH / 2, gz + bz), _q, _s);
          level.push('corrugated', bar, _m);
          bar.dispose();
        }
        for (let l = 0; l < 2; l++) {
          const link = ring(0.16, 0.008, 4, 4, 0.3);
          _m.makeRotationX(Math.PI / 2).setPosition(gx, deck + ch + 0.14 + l * barH * 0.55, gz);
          level.push('corrugated', link, _m);
          link.dispose();
        }
        // Formwork left leaning against it, and the spill at its foot.
        if (rng.next() < 0.6) {
          _q.setFromAxisAngle(_yAxis, rng.range(0, 6.28));
          _q.multiply(new THREE.Quaternion().setFromAxisAngle(_zAxis, rng.range(0.2, 0.34)));
          _m.compose(_p.set(gx + rng.range(-0.5, 0.5), deck + ch * 0.5, gz + rng.range(-0.5, 0.5)), _q, _s);
          const board = boxUV(0.24, ch + 0.5, 0.035, 1.2);
          level.push('woodCrate', board, _m);
          board.dispose();
        }
        for (let l = 0; l < 3; l++) {
          const ss = rng.range(0.1, 0.2);
          _m.makeTranslation(
            gx + rng.range(-0.34, 0.34), deck + 0.13 + ss * 0.2, gz + rng.range(-0.34, 0.34),
          );
          level.box('rubble', ss * 1.5, ss * 0.6, ss, _m, 0.6);
        }
      }
    }
  }

  // ---- stair head-house, over the shaft it actually serves ----
  const head = stairHead(well);
  const bulkX = head.x;
  const bulkZ = head.z;
  if (hasStair) {
    const bw = head.w;
    const bd = head.d;
    const bh = 2.4;
    const doorW = 0.95;
    // The door faces in across the deck rather than out over the parapet. The
    // shaft is set into the corner of the plan, so the two outward faces of the
    // head-house stand on the wall lines below and there is no deck outside them.
    const doorX = bulkX - bw / 2 + 0.12;

    // East, north and south walls are solid; the west one is split for the door.
    _m.makeTranslation(bulkX + bw / 2 - 0.12, deck + bh / 2, bulkZ);
    level.box(wallKey, 0.24, bh, bd, _m, tile);
    for (const s of [-1, 1]) {
      _m.makeTranslation(bulkX, deck + bh / 2, bulkZ + s * (bd / 2 - 0.12));
      level.box(wallKey, bw, bh, 0.24, _m, tile);
    }
    const pierD = (bd - doorW) / 2;
    for (const s of [-1, 1]) {
      _m.makeTranslation(doorX, deck + bh / 2, bulkZ + (s * (doorW + pierD)) / 2);
      level.box(wallKey, 0.24, bh, pierD, _m, tile);
    }
    _m.makeTranslation(doorX, deck + bh - 0.3, bulkZ);
    level.box(wallKey, 0.24, 0.6, doorW, _m, tile);
    // Dark reveal, then a leaf standing open against the jamb.
    _m.makeTranslation(doorX + 0.2, deck + (bh - 0.6) / 2, bulkZ);
    level.box('plasterInterior', 0.1, bh - 0.6, doorW, _m, 2, INSIDE);
    _q.setFromAxisAngle(_yAxis, -Math.PI / 2 + 0.7);
    _m.compose(_p.set(doorX - 0.35, deck + 1.0, bulkZ + 0.4), _q, _s);
    const leaf = boxUV(0.9, 1.95, 0.05, 1.4);
    level.push('corrugated', leaf, _m);
    leaf.dispose();

    // Roof slab, upstand and coping, then a vent hood and a conduit drop.
    _m.makeTranslation(bulkX, deck + bh + 0.09, bulkZ);
    level.box('concreteFloor', bw + 0.34, 0.18, bd + 0.34, _m, 3.0);
    _m.makeTranslation(bulkX, deck + bh + 0.26, bulkZ);
    level.box('concrete', bw + 0.4, 0.16, bd + 0.4, _m, 2.0);
    _m.makeTranslation(bulkX, deck + bh + 0.5, bulkZ - bd / 2 + 0.6);
    level.box('corrugated', 0.5, 0.34, 0.5, _m, 0.8);
    const cowl = cyl(0.16, 0.2, 0.3, 8, 0.6);
    _m.makeTranslation(bulkX, deck + bh + 0.82, bulkZ - bd / 2 + 0.6);
    level.push('corrugated', cowl, _m);
    cowl.dispose();
    // Louvre slots in one flank: cheap, but it stops the box reading as a box.
    for (let i = 0; i < 4; i++) {
      _m.makeTranslation(bulkX, deck + 1.5 + i * 0.14, bulkZ + bd / 2 - 0.02);
      level.box('corrugated', 0.7, 0.07, 0.06, _m, 0.5);
    }
  }

  // ---- parapet inner face ----
  // Seen from a firing position the inside of the near parapet is the largest
  // single surface in the frame — twelve metres by a metre and a bit, square to
  // the camera, and in the overwatch capture it was one unbroken pale field
  // across the middle of the picture. Nothing on a real parapet is unbroken: it
  // is where the roof drains, where every service that climbs the building
  // arrives, and where the screed turns up to meet the wall.
  parapetInner(level, cx, cz, w, d, deck, pT, wallKey, tile, rng);

  // ---- tanks, dishes, aerials, laundry ----
  // A deck with a firing position on it is somewhere the map wants a fight, so it
  // gets the top of the range rather than a roll of the dice. Two review captures
  // in a row came back with this roof having lost its cheek wall, its terrace and
  // most of its clutter to independent probability tests, leaving two thirds of
  // the frame as bare screed — the density gradient inverted, with the least
  // dressing exactly where the player spends the most time.
  const keyRoof = postsOn(cx, cz, w, d).length > 0;
  // Randomly-placed singletons are not enough on a key deck: eleven scattered
  // objects on 250 m² is one per five metres, which the eye reads as litter, and
  // three of the eleven land behind the head-house or inside the keep-clear.
  // Real roof plant is *grouped*, because it is all fed off the same riser, so
  // one composed cluster at the far end of the deck does more for the silhouette
  // and for believability than doubling the scatter would.
  if (keyRoof) roofServices(level, cx, cz, w, d, deck, bulkX, bulkZ, wallKey, tile, rng);
  const clutter = spec.detail === 'lite' ? rng.int(2, 4) : keyRoof ? rng.int(9, 12) : rng.int(5, 9);
  const anchors: THREE.Vector3[] = [];

  // Clutter goes in corners, and each corner has a use.
  //
  // Spread evenly the same objects read as scatter: a tank here, a dish there, a
  // crate somewhere else, one every five metres and none of them explaining any
  // of the others. A roof in this part of the world is zoned, because the things
  // on it arrived for different reasons — the plant is all in one place because
  // it is all fed off the same riser and somebody had to get to it; the mats and
  // the chairs are wherever the evening shade falls; the rubbish is in the corner
  // nobody uses. Giving each corner a bias and drawing the object from that
  // corner's own set costs nothing and turns a scatter into three places.
  const corners: Array<[number, number]> = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  const themes = ['service', 'domestic', 'neglect'] as const;
  // Rotate which corner gets which use per building, and skip the one the stair
  // head-house is standing in.
  const skip = corners.findIndex(
    ([qx, qz]) => Math.sign(bulkX - cx || 1) === qx && Math.sign(bulkZ - cz || 1) === qz,
  );
  const zones: Array<{ x: number; z: number; theme: typeof themes[number] }> = [];
  const rot = rng.int(0, 3);
  for (let c = 0, t = 0; c < 4; c++) {
    if (c === skip) continue;
    const [qx, qz] = corners[(c + rot) % 4];
    zones.push({
      x: cx + qx * (w / 2 - rng.range(1.7, 2.8)),
      z: cz + qz * (d / 2 - rng.range(1.7, 2.8)),
      theme: themes[t % themes.length],
    });
    t++;
  }

  for (let i = 0; i < clutter; i++) {
    const zone = zones[i % zones.length];
    const px = THREE.MathUtils.clamp(
      zone.x + rng.range(-1.9, 1.9), cx - w / 2 + 1.2, cx + w / 2 - 1.2,
    );
    const pz = THREE.MathUtils.clamp(
      zone.z + rng.range(-1.9, 1.9), cz - d / 2 + 1.2, cz + d / 2 - 1.2,
    );
    if (Math.abs(px - bulkX) < head.w / 2 + 0.7 && Math.abs(pz - bulkZ) < head.d / 2 + 0.7) continue;
    // Everything in this loop is at or above chest height, so all of it is a
    // wall as far as a player at a firing position is concerned.
    if (nearPost(px, pz, 3.2)) continue;
    if (zone.theme === 'domestic') {
      domesticClutter(level, px, deck, pz, rng);
      continue;
    }
    if (zone.theme === 'neglect') {
      neglectedClutter(level, px, deck, pz, rng);
      continue;
    }
    const kind = rng.next() * 0.8;

    if (kind < 0.3) {
      // Water tank on a welded stand — the classic rooftop silhouette.
      const r = rng.range(0.52, 0.8);
      const hgt = rng.range(1.0, 1.6);
      const standH = rng.range(0.4, 1.1);
      const tank = cyl(r, r, hgt, 14, 1.6);
      _m.makeTranslation(px, deck + standH + hgt / 2, pz);
      const black = rng.next() < 0.4;
      level.push(black ? 'polymerBlack' : 'paintedMetalTan', tank, _m, black ? TANK : undefined);
      tank.dispose();
      _m.makeTranslation(px, deck + standH + hgt + 0.06, pz);
      level.box('paintedMetalTan', r * 0.7, 0.12, r * 0.7, _m, 0.8);
      for (const [lx, lz] of [[-r * 0.62, -r * 0.62], [r * 0.62, -r * 0.62], [-r * 0.62, r * 0.62], [r * 0.62, r * 0.62]]) {
        _m.makeTranslation(px + lx, deck + standH / 2, pz + lz);
        level.box('corrugated', 0.07, standH, 0.07, _m, 0.6);
      }
      for (const braceY of [standH * 0.5]) {
        _m.makeTranslation(px, deck + braceY, pz - r * 0.62);
        level.box('corrugated', r * 1.24, 0.05, 0.05, _m, 0.5);
        _m.makeTranslation(px - r * 0.62, deck + braceY, pz);
        level.box('corrugated', 0.05, 0.05, r * 1.24, _m, 0.5);
      }
      // Feed pipe running down into the building.
      const feed = cyl(0.03, 0.03, standH + 0.6, 5, 0.4);
      _m.makeTranslation(px + r * 0.8, deck + (standH + 0.6) / 2, pz);
      level.push('corrugated', feed, _m);
      feed.dispose();
      anchors.push(new THREE.Vector3(px, deck + standH + hgt, pz));
    } else if (kind < 0.5) {
      // Condenser unit on a plinth, with its pipe run.
      const uw = rng.range(0.8, 1.1);
      _m.makeTranslation(px, deck + 0.09, pz);
      level.box('concrete', uw + 0.2, 0.18, uw * 0.8 + 0.2, _m, 1.4);
      _m.makeTranslation(px, deck + 0.18 + 0.4, pz);
      level.box('paintedMetalTan', uw, 0.8, uw * 0.8, _m, 1.4);
      const fan = ring(uw * 0.3, 0.04, 12, 5, 0.5);
      _m.makeRotationX(Math.PI / 2).setPosition(px, deck + 0.99, pz);
      level.push('corrugated', fan, _m);
      fan.dispose();
    } else if (kind < 0.66) {
      // Aerial mast with cross-arms.
      const mh = rng.range(2.2, 4.0);
      const mast = cyl(0.03, 0.05, mh, 5, 0.5);
      _m.makeTranslation(px, deck + mh / 2, pz);
      level.push('corrugated', mast, _m);
      mast.dispose();
      _m.makeTranslation(px, deck + 0.12, pz);
      level.box('concrete', 0.4, 0.24, 0.4, _m, 1.2);
      const arms = rng.int(2, 4);
      for (let a = 0; a < arms; a++) {
        const ay = deck + mh * (0.5 + 0.45 * (a / Math.max(1, arms - 1)));
        const al = rng.range(0.5, 1.0);
        _m.makeTranslation(px, ay, pz);
        level.box('corrugated', al, 0.025, 0.025, _m, 0.4);
      }
      anchors.push(new THREE.Vector3(px, deck + mh * 0.8, pz));
    } else if (kind < 0.8) {
      satelliteDish(level, px, deck, pz, rng);
    } else {
      // Stored material under a weighted tarp. Kept to two courses: a stack
      // taller than the parapet reads as floating once the deck is hidden.
      const n = rng.int(1, 2);
      let stackTop = deck;
      for (let s = 0; s < n; s++) {
        const sz = rng.range(0.5, 0.75);
        _m.makeTranslation(px + rng.range(-0.22, 0.22), stackTop + sz / 2, pz + rng.range(-0.22, 0.22));
        level.box(rng.next() < 0.6 ? 'woodCrate' : 'paintedMetalGreen', sz, sz, sz * 0.8, _m, 1.1);
        stackTop += sz * 0.94;
      }
      // Laid nearly flat over the top of the stack rather than tipped up on end,
      // which read as a sheet hovering in the air beside it.
      const tarp = clothPanel(1.05, 0.9, { fold: 0.09, folds: 3, hem: 0.14, tile: 2.0, segsX: 5, segsY: 4 });
      _q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2 - 0.16);
      _m.compose(_p.set(px, stackTop + 0.03, pz - 0.34), _q, _s);
      level.push('fabricTarp', tarp, _m);
      tarp.dispose();
      // Blocks weighting the hem down, which is the only reason a tarp on a
      // roof is still there.
      for (const wo of [-0.42, 0.4]) {
        _m.makeTranslation(px + wo, stackTop - 0.5, pz - 0.75);
        level.box('rubble', 0.24, 0.16, 0.2, _m, 0.9);
      }
    }
  }

  // ---- the deck itself ----
  // A roof a player stands on is looked at closer than any wall on the map, and
  // a clean slab is the one surface that cannot survive it. Relief has to be
  // measured in tens of centimetres, not millimetres: from a 1.7 m eye a 5 cm
  // patch is a change of tone and nothing more, whereas an upstand, a screed
  // bay joint or a drift of sand casts a shadow you can read the fall from.
  //
  // Order matters — skirting first, then bays, then the loose stuff on top.
  //
  // The outlet is chosen before any of it, because a roof is laid to falls and
  // the falls all point at the outlet: the bay tilts, the channel and the stain
  // are one system, and picking the corner afterwards left the three of them
  // describing three different roofs.
  const outSx = rng.next() < 0.5 ? -1 : 1;
  const outSz = rng.next() < 0.5 ? -1 : 1;
  const outX = cx + outSx * (w / 2 - 1.0);
  const outZ = cz + outSz * (d / 2 - 1.0);
  buildRoofSkirting(level, cx, cz, w, d, deck, rng);
  buildRoofBays(level, spec, cx, cz, w, d, deck, wallKey, tile, rng, outX, outZ);
  roofChannel(level, cx, cz, w, d, deck, outX, outZ, outSx, outSz, rng);
  // Bitumen over the bay joints, in overlapping laps rather than one ribbon.
  //
  // The material is genuinely near-black, so a fourteen-metre run of it 0.5 m
  // wide is a hard graphic stripe drawn across a pale deck and it takes over the
  // frame. Laid as short laps, each offset a little and a few of them missing,
  // the same coverage reads as roofing felt that somebody rolled out badly.
  for (let i = 0; i < 2; i++) {
    const alongX = rng.next() < 0.5;
    const len = (alongX ? w : d) - 2.4;
    const bx = cx + (alongX ? 0 : rng.range(-w / 2 + 1.4, w / 2 - 1.4));
    const bz = cz + (alongX ? rng.range(-d / 2 + 1.4, d / 2 - 1.4) : 0);
    const laps = Math.max(2, Math.round(len / 1.5));
    for (let k = 0; k < laps; k++) {
      // Half of them missing rather than a third, and each lap a different
      // width. As near-continuous 340 mm ribbons these came back as two lengths
      // of black tape ruled across the deck — the highest-contrast element in
      // the frame, perfectly straight, with two hard parallel edges the whole
      // way. Felt is laid in metre lengths that overlap badly and lift, so what
      // should be there is a broken dashed line of varying width, not a stripe.
      if (rng.next() < 0.46) continue;
      const t = -len / 2 + (len * (k + 0.5)) / laps;
      const ll = (len / laps) * rng.range(0.7, 1.05);
      const lw = rng.range(0.2, 0.4);
      const wob = rng.range(-0.2, 0.2);
      _q.setFromAxisAngle(_yAxis, rng.range(-0.07, 0.07));
      _m.compose(
        _p.set(bx + (alongX ? t : wob), deck + 0.085, bz + (alongX ? wob : t)),
        _q, _s,
      );
      const felt = boxUV(alongX ? ll : lw, 0.05, alongX ? lw : ll, 2.0);
      level.push('polymerBlack', felt, _m, FLAT);
      felt.dispose();
    }
    // A lifted lap at one end, which is how these always fail.
    _q.setFromAxisAngle(alongX ? _zAxis : _xAxis, alongX ? 0.5 : -0.5);
    _m.compose(
      _p.set(bx + (alongX ? len / 2 : 0), deck + 0.22, bz + (alongX ? 0 : len / 2)),
      _q, _s,
    );
    const lap = boxUV(alongX ? 0.6 : 0.34, 0.04, alongX ? 0.34 : 0.6, 1.4);
    level.push('polymerBlack', lap, _m);
    lap.dispose();
  }
  // Rainwater outlet in the lowest corner, with a stained fall towards it and
  // the parapet spout that takes the overflow out over the street.
  {
    const sx = outSx;
    const sz = outSz;
    const ox = outX;
    const oz = outZ;
    // The stain is what everything on this deck runs to, so it is the one place
    // the pale field is allowed to go dark — but as a lobed wash rather than as
    // the 2.4 m square of `dirt` that used to sit here, which from the overwatch
    // camera was simply a brown rectangle lying on the roof.
    for (let i = 0; i < 3; i++) {
      const rr = rng.range(0.6, 1.25);
      _m.makeTranslation(
        ox - sx * rng.range(0, 0.7), deck + 0.03, oz - sz * rng.range(0, 0.7),
      );
      const wash = patchDisc(
        rr * rng.range(0.8, 1.4), rr, 0.02, () => rng.next(),
        { sides: 11, wobble: 0.55, shoulder: 0.45, tile: 2.2 },
      );
      level.push(i === 1 ? 'rubble' : 'dirt', wash, _m, FLAT);
      wash.dispose();
    }
    _m.makeTranslation(ox, deck + 0.1, oz);
    level.box('corrugated', 0.4, 0.09, 0.4, _m, 0.6);
    // Sump kerb, three sides, so the outlet sits in a pocket.
    for (const [kx, kz] of [[sx, 0], [0, sz], [-sx, 0]] as Array<[number, number]>) {
      _m.makeTranslation(ox + kx * 0.42, deck + 0.13, oz + kz * 0.42);
      level.box('concrete', kx !== 0 ? 0.1 : 0.94, 0.16, kx !== 0 ? 0.94 : 0.1, _m, 1.0);
    }
    // Grit washed down the falls and left round the grating, where it always is.
    _m.makeTranslation(ox - sx * 0.55, deck + 0.03, oz - sz * 0.55);
    const silt = gravelBed(1.5, 1.5, 0.035, 30, () => rng.next());
    level.push('rubble', silt, _m, FLAT);
    silt.dispose();
    const spout = cyl(0.055, 0.055, 0.7, 6, 0.6);
    _q.setFromAxisAngle(_xAxis, Math.PI / 2);
    _m.compose(_p.set(ox + sx * 0.2, deck + 0.16, oz + sz * (d / 2 - 0.4)), _q, _s);
    level.push('corrugated', spout, _m);
    spout.dispose();
  }
  // Pipe runs on sleeper blocks, following a parapet rather than cutting across
  // the middle. A 60 mm tube lying diagonally through the centre of the deck is
  // the loudest thing in an overwatch shot and reads as a dropped scaffold bar;
  // run along the edge, the same pipe is service kit and disappears into the job.
  for (let i = 0; i < 2; i++) {
    if (rng.next() < 0.35) continue;
    const alongX = rng.next() < 0.5;
    const len = (alongX ? w : d) * rng.range(0.5, 0.85);
    const t = (rng.next() < 0.5 ? -1 : 1) * rng.range(0.31, 0.42);
    const px = cx + (alongX ? rng.range(-1.5, 1.5) : t * w);
    const pz = cz + (alongX ? t * d : rng.range(-1.5, 1.5));
    const pipe = cyl(0.055, 0.055, len, 6, 0.6);
    _q.setFromAxisAngle(alongX ? _zAxis : _xAxis, Math.PI / 2);
    _m.compose(_p.set(px, deck + 0.22, pz), _q, _s);
    level.push('corrugated', pipe, _m);
    pipe.dispose();
    const sleepers = Math.max(2, Math.round(len / 1.8));
    for (let k = 0; k <= sleepers; k++) {
      const o = -len / 2 + (len * k) / sleepers;
      _m.makeTranslation(px + (alongX ? o : 0), deck + 0.08, pz + (alongX ? 0 : o));
      level.box('concrete', 0.3, 0.16, 0.3, _m, 1.0);
    }
  }
  // Kerbed rooflight, the classic upstand-and-glazing detail.
  const lx = cx + rng.range(-w * 0.25, w * 0.25);
  const lz = cz + rng.range(-d * 0.25, d * 0.25);
  if (rng.next() < 0.5 && !nearPost(lx, lz, 3.4)) {
    const lw = rng.range(1.1, 1.7);
    const ld = rng.range(0.9, 1.3);
    for (const [ox, oz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as Array<[number, number]>) {
      _m.makeTranslation(lx + ox * (lw / 2), deck + 0.19, lz + oz * (ld / 2));
      level.box('concrete', ox !== 0 ? 0.14 : lw + 0.28, 0.38, ox !== 0 ? ld : 0.14, _m, 1.2);
    }
    // Not the dark pane used in the walls. A vertical pane is seen at a
    // grazing angle and mirrors the sky, which is why the window glass works;
    // a horizontal one is seen from above at twenty-five degrees, reflects the
    // ground, and renders as a black hole lying in the deck. Rooflights are
    // wired or fluted anyway, so they read as a pale slab of daylight.
    _m.makeTranslation(lx, deck + 0.4, lz);
    level.box(GLASS_KEY, lw, 0.05, ld, _m, 1.4, ROOFLIGHT);
    // Glazing bars both ways, and a hip cap. Flat glass with two bars across it
    // still reads as a panel; a grid of small lights reads as a rooflight.
    for (let i = 1; i < 4; i++) {
      _m.makeTranslation(lx - lw / 2 + (lw * i) / 4, deck + 0.44, lz);
      level.box('corrugated', 0.05, 0.06, ld, _m, 0.5);
    }
    for (let i = 1; i < 3; i++) {
      _m.makeTranslation(lx, deck + 0.44, lz - ld / 2 + (ld * i) / 3);
      level.box('corrugated', lw, 0.05, 0.045, _m, 0.5);
    }
  }

  // ---- sandbag rests ----
  //
  // At a firing position if this deck has one, otherwise wherever the parapet
  // happens to fall. The bags are what makes the cleared circle read as cleared
  // on purpose: an empty patch of deck is a hole in the dressing, an empty patch
  // of deck behind a sandbag rest is a place somebody fights from.
  const deckPosts = postsOn(cx, cz, w, d);
  for (const p of deckPosts) {
    // Built round the post, not out on the parapet.
    //
    // A rest set at the nearest parapet is only in shot if the player happens to
    // face that parapet, and a cleared circle with nothing in it is just a hole in
    // the dressing — the overwatch capture came back with three metres of bare
    // screed across the bottom of the frame. A horseshoe of bags round the
    // position itself is what one of these actually looks like, and because it is
    // 500 mm high it fills the near frame in whatever direction the player turns
    // without taking a single degree off the sightline. The mouth of the horseshoe
    // faces the edge the post overlooks.
    const dxE = w / 2 - Math.abs(p.x - cx);
    const dzE = d / 2 - Math.abs(p.z - cz);
    const outX = dzE < dxE ? 0 : Math.sign(p.x - cx) || 1;
    const outZ = dzE < dxE ? Math.sign(p.z - cz) || 1 : 0;
    const openA = Math.atan2(outX, outZ);
    const rr = 1.55;
    const bags = 26;
    for (let i = 0; i < bags; i++) {
      const a = (i / bags) * Math.PI * 2;
      // Leave the mouth open, and step the wall down towards it.
      let da = a - openA;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      const t = Math.abs(da) / Math.PI;
      if (t < 0.34) continue;
      const courses = t < 0.5 ? 1 : t < 0.68 ? 2 : 3;
      for (let course = 0; course < courses; course++) {
        const cr = rr - course * 0.09;
        const bag = bagGeometry(0.22, 0.085, 0.14);
        _q.setFromAxisAngle(_yAxis, a + rng.range(-0.12, 0.12));
        _m.compose(
          _p.set(
            p.x + Math.sin(a) * cr, deck + 0.09 + course * 0.155, p.z + Math.cos(a) * cr,
          ),
          _q, _s,
        );
        level.push('fabricSandbag', bag, _m);
        bag.dispose();
      }
    }
    // What gets carried up to one of these: ammunition tins, a water can, a
    // rolled mat. All inside the horseshoe, all under 400 mm.
    _m.makeTranslation(p.x - outZ * 0.9 + 0.3, deck + 0.14, p.z + outX * 0.9 + 0.3);
    level.box('paintedMetalGreen', 0.46, 0.27, 0.3, _m, 0.8);
    _m.makeTranslation(p.x - outZ * 0.9 - 0.28, deck + 0.11, p.z + outX * 0.9 - 0.1);
    level.box('paintedMetalGreen', 0.3, 0.22, 0.44, _m, 0.8);
    const can = cyl(0.14, 0.14, 0.42, 8, 0.6);
    _m.makeTranslation(p.x - outZ * 1.05 + 0.55, deck + 0.21, p.z + outX * 1.05 - 0.5);
    level.push('paintedMetalTan', can, _m);
    can.dispose();
    const roll = cyl(0.13, 0.13, 0.9, 7, 0.7);
    _q.setFromAxisAngle(_yAxis, openA);
    _q.multiply(new THREE.Quaternion().setFromAxisAngle(_zAxis, Math.PI / 2));
    _m.compose(_p.set(p.x - outX * 0.55 - outZ * 0.7, deck + 0.13, p.z - outZ * 0.55 + outX * 0.7), _q, _s);
    level.push('fabricSandbag', roll, _m);
    roll.dispose();
    // The four-to-eight-metre band round the position, which the keep-clear
    // radius for tall objects would otherwise leave as bare screed.
    positionStores(level, p.x, p.z, cx, cz, w, d, deck, rng);
    // Spent cases: a scatter of tiny brass, the one detail that says the position
    // has been used rather than just built.
    for (let i = 0; i < 14; i++) {
      const a = rng.range(0, Math.PI * 2);
      const cr2 = rng.range(0.3, 1.3);
      _q.setFromEuler(new THREE.Euler(Math.PI / 2, rng.range(0, 6.28), 0));
      _m.compose(_p.set(p.x + Math.sin(a) * cr2, deck + 0.02, p.z + Math.cos(a) * cr2), _q, _s);
      const case_ = cyl(0.008, 0.009, 0.05, 4, 0.2);
      level.push('paintedMetalTan', case_, _m);
      case_.dispose();
    }
  }
  if (deckPosts.length === 0 && rng.next() < 0.55) {
    const alongX = rng.next() < 0.5;
    const edgeSign = rng.next() < 0.5 ? -1 : 1;
    const ex = alongX ? cx + rng.range(-w * 0.2, w * 0.2) : cx + edgeSign * (w / 2 - 0.75);
    const ez = alongX ? cz + edgeSign * (d / 2 - 0.75) : cz + rng.range(-d * 0.2, d * 0.2);
    sandbagRest(level, ex, ez, deck, alongX, rng);
    _m.makeTranslation(ex + 0.7, deck + 0.14, ez + 0.5);
    level.box('paintedMetalGreen', 0.44, 0.26, 0.28, _m, 0.8);
  }

  // ---- the terrace: the reason anyone comes up here ----
  if (spec.interior && spec.interior !== 'ruin' && spec.detail !== 'lite') {
    buildRoofTerrace(level, cx, cz, w, d, deck, bulkX, bulkZ, rng);
  }

  // ---- laundry lines, run along a parapet rather than across the deck ----
  //
  // Both ends have to sit near an edge. Posts dropped anywhere on the deck put a
  // line — and the sheets pegged to it — straight through the middle of the roof,
  // and a roof is somewhere people stand: the middle of it is the part that has
  // to stay walkable, and it is where a camera at head height ends up. One review
  // capture came back as nothing but a bedsheet thirty centimetres from the lens.
  // Along the parapet is also simply where the line goes, because that is where
  // the sun and the wind are and where there is a wall to fix it to.
  const posts: THREE.Vector3[] = [];
  const lineAlongX = rng.next() < 0.5;
  const lineSide = rng.next() < 0.5 ? -1 : 1;
  const lineOff = lineSide * ((lineAlongX ? d : w) / 2 - rng.range(1.0, 1.9));
  for (let i = 0; i < 2; i++) {
    const t = (i === 0 ? -1 : 1) * (lineAlongX ? w : d) * rng.range(0.26, 0.38);
    const px = cx + (lineAlongX ? t : lineOff);
    const pz = cz + (lineAlongX ? lineOff : t);
    if (nearPost(px, pz, 3.6)) continue;
    const ph = rng.range(1.9, 2.4);
    const post = cyl(0.035, 0.045, ph, 6, 0.5);
    _m.makeTranslation(px, deck + ph / 2, pz);
    level.push('corrugated', post, _m);
    post.dispose();
    _m.makeTranslation(px, deck + ph - 0.06, pz);
    level.box('corrugated', 0.5, 0.04, 0.04, _m, 0.5);
    posts.push(new THREE.Vector3(px, deck + ph - 0.08, pz));
  }
  // Only anchor to things that are themselves near an edge, or the run doglegs
  // back across the deck and undoes the point of putting the posts on the parapet.
  const nearEdge = (p: THREE.Vector3): boolean =>
    w / 2 - Math.abs(p.x - cx) < 2.4 || d / 2 - Math.abs(p.z - cz) < 2.4;
  const lineEnds = posts.concat(anchors.filter(nearEdge));
  for (let i = 0; i + 1 < lineEnds.length; i++) {
    const a = lineEnds[i];
    const b = lineEnds[i + 1];
    if (a.distanceTo(b) < 2.0) continue;
    // A span that passes a firing position anywhere along its length hangs
    // washing in front of it, whatever its ends and midpoint are doing.
    //
    // Five metres, not three. The camera's vertical field of view is 80 degrees,
    // so a 800 mm sheet three metres away is a ninth of the frame height and a
    // pair of them either side of the centre is most of the sky; and because a
    // line can run from a low post up to an anchor on the head house, the sheets
    // on it end up above the eye rather than below, silhouetted against nothing.
    // Three separate captures have come back with this, each time from a span
    // that passed the previous radius.
    if (segNearPost(a.x, a.z, b.x, b.z, 5.0)) continue;
    const cable = slackCable(a, b, 0.05, 0.016, 8);
    _m.identity();
    level.push('polymerBlack', cable, _m, FLAT);
    cable.dispose();
    // Washing pegged along it. Sized generously: a line of pale sheets is the
    // one thing on a roof that reads as a silhouette from another rooftop, and
    // it is what makes the skyline look inhabited rather than derelict.
    // More pieces, each smaller. Cloth here is backlit for the whole scenario
    // and the library has no translucency to give it, so a big panel is a big
    // black flag whatever its albedo; a row of small ones reads as a washing line
    // and no single one of them can dominate the frame.
    const items = rng.int(4, 7);
    for (let k = 0; k < items; k++) {
      const t = (k + 0.7) / (items + 0.4);
      const cw = rng.range(0.4, 0.66);
      const ch = rng.range(0.5, 0.85);
      const cloth = clothPanel(cw, ch, { fold: 0.09, folds: 3, hem: 0.09, tile: 1.6, segsX: 5, segsY: 4 });
      const y = THREE.MathUtils.lerp(a.y, b.y, t) - Math.sin(t * Math.PI) * 0.22;
      const wx = THREE.MathUtils.lerp(a.x, b.x, t);
      const wz = THREE.MathUtils.lerp(a.z, b.z, t);
      // And each piece is tested where it actually hangs. Guarding the span is
      // not the same test: a span can clear a post at its closest approach and
      // still have a sheet pegged inside the radius, because the pegs are spread
      // along the whole line and the line does not have to be straight in plan.
      if (nearPost(wx, wz, 4.2)) continue;
      _q.setFromAxisAngle(_yAxis, Math.atan2(b.x - a.x, b.z - a.z) + Math.PI / 2);
      _m.compose(_p.set(wx, y, wz), _q, _s);
      // Washing, not tarpaulin: bleached cotton, so the sheets stay legible
      // against the sky instead of reading as black holes when backlit.
      level.push('fabricTarp', cloth, _m, { variant: 'wash', material: WASH_MAT });
      cloth.dispose();
    }
  }
}

/**
 * What accumulates around a manned position, in the annulus a standing player
 * can see but cannot be blocked by.
 *
 * The overwatch capture kept coming back with a band of bare screed between the
 * sandbag horseshoe at 1.5 m and the roof plant at 12 m: everything tall is
 * excluded within 3.2 m of the post to protect the sightline, and everything the
 * deck dressing lays down is under 100 mm, so the four to eight metre range —
 * which is a third of the frame — had nothing in it with a top and a side.
 *
 * The resolution is that height is the only thing that matters here. A jerry can
 * is 400 mm and a stack of ammunition tins is 550 mm; from a 1.6 m eye neither
 * takes a single degree off a sightline over a 1.2 m parapet, but both read as
 * solid objects with a lit face and a cast shadow. Ringing the post rather than
 * grouping on one side is deliberate: the position is manned from any bearing,
 * and the camera can face any of them.
 */
/** Keep `v` within `half` of `centre`. */
function clampTo(v: number, centre: number, half: number): number {
  return Math.max(centre - half, Math.min(centre + half, v));
}

function positionStores(
  level: LevelSystem,
  px: number,
  pz: number,
  cx: number,
  cz: number,
  w: number,
  d: number,
  deck: number,
  rng: RNG,
): void {
  // Seven groups starting at 3.3 m was an overcorrection: from an eye 1.6 m over
  // the deck a 500 mm crate at three metres is a metre of screen height, and
  // seven of them ringing the position turned the near deck from bare into a
  // jumble with the sandbag horseshoe lost inside it. Five, starting at four and
  // a half, sit in the middle distance where they were needed and leave the
  // position itself the clearest thing in the frame.
  const groups = 5;
  const a0 = rng.range(0, Math.PI * 2);

  // Ankle-height litter in the two metres just outside the sandbag horseshoe.
  //
  // The store groups fill four and a half metres out and nothing is allowed to
  // stand within three of the post, which leaves an annulus that is bare screed
  // and happens to be the bottom third of an overwatch frame. Nothing over about
  // 150 mm can go there without blocking the sightline over a 1.2 m parapet, and
  // nothing needs to: at that range a 40 mm shell case throws a shadow as long as
  // itself, and a dozen of them are what a position that has been fired from
  // looks like.
  for (let i = 0; i < 14; i++) {
    const a = rng.range(0, Math.PI * 2);
    const rr = rng.range(2.4, 4.4);
    const lx = clampTo(px + Math.sin(a) * rr, cx, w / 2 - 1.0);
    const lz = clampTo(pz + Math.cos(a) * rr, cz, d / 2 - 1.0);
    const r = rng.next();
    if (r < 0.4) {
      // Spent cases, in the arc they are thrown into.
      const cs = cyl(0.011, 0.012, 0.052, 5, 0.2);
      _q.setFromAxisAngle(_zAxis, Math.PI / 2);
      _q.premultiply(new THREE.Quaternion().setFromAxisAngle(_yAxis, rng.range(0, 6.28)));
      _m.compose(_p.set(lx, deck + 0.012, lz), _q, _s);
      level.push('gunmetal', cs, _m);
      cs.dispose();
    } else if (r < 0.62) {
      // A flattened carton or a torn strip of sacking, propped on a stone so it
      // has a lit face and an edge instead of being a decal.
      _m.makeTranslation(lx, deck + 0.035, lz);
      level.box('rubble', 0.14, 0.07, 0.12, _m, 0.6);
      _q.setFromAxisAngle(_yAxis, rng.range(0, 3.14));
      _q.multiply(new THREE.Quaternion().setFromAxisAngle(_zAxis, rng.range(0.14, 0.3)));
      _m.compose(_p.set(lx, deck + 0.075, lz), _q, _s);
      const card = boxUV(rng.range(0.3, 0.52), 0.02, rng.range(0.24, 0.4), 1.0);
      level.push(rng.next() < 0.5 ? 'woodCrate' : 'fabricSandbag', card, _m);
      card.dispose();
    } else if (r < 0.82) {
      // Chips off the parapet, swept into a low heap.
      const heap = prism(
        driftProfile(rng.range(0.3, 0.55), rng.range(0.05, 0.11)), rng.range(0.3, 0.7), 1.2, 'z',
      );
      _q.setFromAxisAngle(_yAxis, rng.range(0, 6.28));
      _m.compose(_p.set(lx, deck + 0.01, lz), _q, _s);
      level.push('rubble', heap, _m);
      heap.dispose();
    } else {
      // A tin, kicked over.
      const tin = cyl(0.055, 0.055, 0.12, 7, 0.4);
      _q.setFromAxisAngle(_zAxis, Math.PI / 2 + rng.range(-0.2, 0.2));
      _q.premultiply(new THREE.Quaternion().setFromAxisAngle(_yAxis, rng.range(0, 6.28)));
      _m.compose(_p.set(lx, deck + 0.055, lz), _q, _s);
      level.push('paintedMetalTan', tin, _m);
      tin.dispose();
    }
  }

  for (let g = 0; g < groups; g++) {
    const a = a0 + (g / groups) * Math.PI * 2 + rng.range(-0.28, 0.28);
    const rr = rng.range(4.5, 7.4);
    // Pulled back onto the deck rather than dropped.
    //
    // Skipping an off-deck group silently deletes it, and on a post near a corner
    // that is most of them: the overwatch capture came back with a quarter of the
    // frame as bare pale screed because three of the five groups had rung out over
    // the parapet and been discarded. Clamping keeps the count fixed whatever the
    // roof's proportions and wherever the position sits on it, which is the
    // difference between dressing that is authored and dressing that survives the
    // seed.
    const gx = clampTo(px + Math.sin(a) * rr, cx, w / 2 - 1.2);
    const gz = clampTo(pz + Math.cos(a) * rr, cz, d / 2 - 1.2);
    const rot = rng.range(0, Math.PI * 2);
    const kind = rng.next();
    if (kind < 0.24) {
      // Ammunition tins, stacked and half-open.
      const n = rng.int(2, 4);
      for (let i = 0; i < n; i++) {
        _q.setFromAxisAngle(_yAxis, rot + rng.range(-0.25, 0.25));
        _m.compose(
          _p.set(gx + rng.range(-0.1, 0.1), deck + 0.135 + i * 0.26, gz + rng.range(-0.1, 0.1)),
          _q, _s,
        );
        const tin = boxUV(0.46, 0.26, 0.3, 0.9);
        level.push('paintedMetalGreen', tin, _m);
        tin.dispose();
      }
      // A lid propped against the stack.
      _q.setFromAxisAngle(_yAxis, rot);
      _q.multiply(new THREE.Quaternion().setFromAxisAngle(_zAxis, 1.15));
      _m.compose(_p.set(gx + Math.cos(rot) * 0.34, deck + 0.16, gz - Math.sin(rot) * 0.34), _q, _s);
      const lid = boxUV(0.44, 0.03, 0.28, 0.8);
      level.push('paintedMetalGreen', lid, _m);
      lid.dispose();
    } else if (kind < 0.44) {
      // Jerry cans in a row, one on its side.
      const n = rng.int(2, 4);
      for (let i = 0; i < n; i++) {
        const jx = gx + Math.cos(rot) * (i - (n - 1) / 2) * 0.34;
        const jz = gz - Math.sin(rot) * (i - (n - 1) / 2) * 0.34;
        const down = i === n - 1 && rng.next() < 0.45;
        _q.setFromAxisAngle(_yAxis, rot + rng.range(-0.14, 0.14));
        if (down) _q.multiply(new THREE.Quaternion().setFromAxisAngle(_zAxis, Math.PI / 2));
        _m.compose(_p.set(jx, deck + (down ? 0.16 : 0.24), jz), _q, _s);
        const body = boxUV(0.19, 0.46, 0.32, 0.8);
        level.push(rng.next() < 0.5 ? 'paintedMetalGreen' : 'paintedMetalTan', body, _m);
        body.dispose();
        if (!down) {
          _m.compose(_p.set(jx, deck + 0.5, jz), _q, _s);
          const handle = boxUV(0.05, 0.05, 0.24, 0.4);
          level.push('gunmetal', handle, _m);
          handle.dispose();
        }
      }
    } else if (kind < 0.6) {
      // Drum on its side, chocked so it does not roll: 580 mm of cylinder,
      // which is the most silhouette available under knee height.
      const dr = 0.29;
      const drum = cyl(dr, dr, 0.86, 12, 1.2);
      _q.setFromAxisAngle(_yAxis, rot);
      _q.multiply(new THREE.Quaternion().setFromAxisAngle(_zAxis, Math.PI / 2));
      _m.compose(_p.set(gx, deck + dr, gz), _q, _s);
      level.push(rng.next() < 0.5 ? 'paintedMetalRed' : 'paintedMetalTan', drum, _m);
      drum.dispose();
      for (const hy of [-0.24, 0.24]) {
        const hoop = ring(dr + 0.02, 0.022, 12, 5, 0.4);
        _q.setFromAxisAngle(_yAxis, rot + Math.PI / 2);
        _m.compose(_p.set(gx + Math.cos(rot) * hy, deck + dr, gz - Math.sin(rot) * hy), _q, _s);
        level.push('gunmetal', hoop, _m);
        hoop.dispose();
      }
      for (const s of [-1, 1]) {
        _m.makeTranslation(gx + Math.sin(rot) * s * (dr + 0.06), deck + 0.06, gz + Math.cos(rot) * s * (dr + 0.06));
        level.box('woodCrate', 0.3, 0.12, 0.16, _m, 0.6);
      }
    } else if (kind < 0.76) {
      // Stores under a tarp, weighted at the corners. A soft shape among the
      // boxes, and the only thing on the deck that has a fold in it.
      const sw = rng.range(0.9, 1.4);
      const sd = rng.range(0.7, 1.0);
      let top = deck;
      for (let i = 0; i < rng.int(2, 3); i++) {
        const bh = rng.range(0.2, 0.3);
        _q.setFromAxisAngle(_yAxis, rot + rng.range(-0.2, 0.2));
        _m.compose(_p.set(gx + rng.range(-0.07, 0.07), top + bh / 2, gz + rng.range(-0.07, 0.07)), _q, _s);
        const box = boxUV(sw * 0.85, bh, sd * 0.85, 1.1);
        level.push('woodCrate', box, _m);
        box.dispose();
        top += bh;
      }
      _q.setFromAxisAngle(_yAxis, rot);
      _q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2 + 0.12));
      _m.compose(_p.set(gx, top + 0.03, gz + 0.02), _q, _s);
      const tarp = clothPanel(sw, sd + 0.3, {
        fold: 0.06, folds: 3, hem: 0.05, tile: 1.6, segsX: 6, segsY: 4,
      });
      level.push('fabricTarp', tarp, _m);
      tarp.dispose();
      for (const [sxx, szz] of [[-1, -1], [1, 1]] as Array<[number, number]>) {
        _m.makeTranslation(gx + sxx * sw * 0.42, top + 0.06, gz + szz * sd * 0.42);
        level.box('rubble', 0.2, 0.12, 0.16, _m, 0.7);
      }
    } else if (kind < 0.9) {
      // Sandbags waiting to be built into something, on a pallet.
      _m.makeTranslation(gx, deck + 0.05, gz);
      _q.setFromAxisAngle(_yAxis, rot);
      _m.compose(_p.set(gx, deck + 0.05, gz), _q, _s);
      const pallet = boxUV(1.1, 0.1, 0.8, 1.0);
      level.push('woodCrate', pallet, _m);
      pallet.dispose();
      const heap = rng.int(5, 9);
      for (let i = 0; i < heap; i++) {
        const bag = bagGeometry(0.22, 0.08, 0.14);
        _q.setFromAxisAngle(_yAxis, rot + rng.range(-0.5, 0.5));
        _m.compose(
          _p.set(
            gx + rng.range(-0.36, 0.36),
            deck + 0.18 + Math.floor(i / 3) * 0.15,
            gz + rng.range(-0.26, 0.26),
          ),
          _q, _s,
        );
        level.push('fabricSandbag', bag, _m);
        bag.dispose();
      }
    } else {
      // A bucket, a coil of cable and a broom against nothing in particular —
      // the small stuff that stops a group reading as a shop display.
      const bucket = cyl(0.15, 0.19, 0.32, 9, 0.6);
      _m.makeTranslation(gx, deck + 0.16, gz);
      level.push('paintedMetalTan', bucket, _m);
      bucket.dispose();
      const coil = ring(0.26, 0.05, 12, 6, 0.6);
      _m.makeRotationX(Math.PI / 2).setPosition(gx + 0.5, deck + 0.05, gz + 0.2);
      level.push('polymerBlack', coil, _m);
      coil.dispose();
      _q.setFromAxisAngle(_yAxis, rot);
      _q.multiply(new THREE.Quaternion().setFromAxisAngle(_zAxis, 1.32));
      _m.compose(_p.set(gx - 0.4, deck + 0.42, gz - 0.2), _q, _s);
      const handle = cyl(0.02, 0.022, 1.3, 5, 0.5);
      level.push('wood', handle, _m);
      handle.dispose();
    }
  }
}

/**
 * Three courses of sandbags, stepped back, laid along one axis.
 *
 * Deliberately kept below 0.5 m. Anything higher is a wall a player has to break
 * cover to shoot over, and from a standing eye it also hides the street the
 * position exists to watch.
 */
function sandbagRest(
  level: LevelSystem,
  ex: number,
  ez: number,
  deck: number,
  alongX: boolean,
  rng: RNG,
): void {
  for (let course = 0; course < 3; course++) {
    const n = 5 - course;
    for (let i = 0; i < n; i++) {
      const t = (i - (n - 1) / 2) * 0.42;
      const bag = bagGeometry(0.21, 0.085, 0.13);
      _q.setFromAxisAngle(_yAxis, (alongX ? 0 : Math.PI / 2) + rng.range(-0.14, 0.14));
      _m.compose(
        _p.set(
          ex + (alongX ? t : rng.range(-0.04, 0.04)),
          deck + 0.09 + course * 0.155,
          ez + (alongX ? rng.range(-0.04, 0.04) : t),
        ),
        _q, _s,
      );
      level.push('fabricSandbag', bag, _m);
      bag.dispose();
    }
  }
}

/**
 * A sitting-out place on the roof: mat, stools, a brazier and a tea tray.
 *
 * The deck needed one thing at human scale that was not litter. Bays, ballast
 * and buckets give a roof texture, but from standing height they are all below
 * knee height, so the near half of an overwatch shot has no object in it big
 * enough to judge distance against. A terrace group is that object, and it is
 * also the cheapest way to say the building is lived in.
 */
/**
 * The lived-in corner: chairs, pots, a rolled mat, a bucket, a drying rack.
 *
 * These are the objects that say a family is up here in the evenings, and they
 * are the ones the roofscape was missing entirely — everything on the deck was
 * either plant or ordnance. All of it is under a metre so none of it changes a
 * sightline, and all of it routes into batches that already exist.
 */
function domesticClutter(
  level: LevelSystem, px: number, deck: number, pz: number, rng: RNG,
): void {
  const yaw = rng.range(0, Math.PI * 2);
  const r = rng.next();
  if (r < 0.3) {
    // Stacking chair, of the kind that is on every roof and in every yard.
    const sh = rng.range(0.4, 0.46);
    _q.setFromAxisAngle(_yAxis, yaw);
    _m.compose(_p.set(px, deck + sh, pz), _q, _s);
    const seat = boxUV(0.42, 0.045, 0.4, 0.8);
    level.push('polymerTan', seat, _m);
    seat.dispose();
    _m.compose(_p.set(px - Math.sin(yaw) * 0.18, deck + sh + 0.24, pz - Math.cos(yaw) * 0.18), _q, _s);
    const back = boxUV(0.4, 0.44, 0.04, 0.8);
    level.push('polymerTan', back, _m);
    back.dispose();
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as Array<[number, number]>) {
      _m.compose(
        _p.set(
          px + (lx * 0.17 * Math.cos(yaw) - lz * 0.16 * Math.sin(yaw)),
          deck + sh / 2,
          pz + (lx * 0.17 * Math.sin(yaw) + lz * 0.16 * Math.cos(yaw)),
        ),
        _q, _s,
      );
      const leg = boxUV(0.035, sh, 0.035, 0.4);
      level.push('polymerTan', leg, _m);
      leg.dispose();
    }
  } else if (r < 0.56) {
    // Planter: an oil tin or a cut drum with something surviving in it.
    const pr = rng.range(0.16, 0.26);
    const ph = rng.range(0.26, 0.42);
    const pot = cyl(pr, pr * 0.85, ph, 9, 0.6);
    _m.makeTranslation(px, deck + ph / 2, pz);
    level.push(rng.next() < 0.5 ? 'brick' : 'paintedMetalGreen', pot, _m);
    pot.dispose();
    _m.makeTranslation(px, deck + ph - 0.02, pz);
    level.box('dirt', pr * 1.7, 0.05, pr * 1.7, _m, 0.4);
    const leaves = bladeSpray(
      rng.int(7, 12), rng.range(0.3, 0.55), 0.07, 1.0, 0.16, () => rng.next(),
    );
    _q.setFromAxisAngle(_yAxis, yaw);
    _m.compose(_p.set(px, deck + ph, pz), _q, _s);
    level.push('fabricTarp', leaves, _m, PALM);
    leaves.dispose();
  } else if (r < 0.76) {
    // Mats and bedding rolled up against the parapet for the day.
    const n = rng.int(2, 3);
    for (let i = 0; i < n; i++) {
      const rl = rng.range(0.9, 1.5);
      const rr = rng.range(0.09, 0.15);
      const roll = cyl(rr, rr, rl, 7, 0.7);
      _q.setFromAxisAngle(_yAxis, yaw + rng.range(-0.2, 0.2));
      _q.multiply(new THREE.Quaternion().setFromAxisAngle(_zAxis, Math.PI / 2));
      _m.compose(
        _p.set(px + rng.range(-0.3, 0.3), deck + rr + (i > 1 ? rr * 1.7 : 0), pz + rng.range(-0.3, 0.3)),
        _q, _s,
      );
      level.push(i % 2 === 0 ? 'fabricSandbag' : 'fabricTarp', roll, _m);
      roll.dispose();
    }
  } else {
    // Washing left out: a basket, a bucket and a bowl.
    const bw = rng.range(0.3, 0.42);
    const basket = cyl(bw, bw * 0.78, rng.range(0.24, 0.34), 10, 0.7);
    _m.makeTranslation(px, deck + 0.15, pz);
    level.push('woodCrate', basket, _m);
    basket.dispose();
    const bowl = cyl(0.24, 0.16, 0.14, 10, 0.5);
    _m.makeTranslation(px + Math.cos(yaw) * 0.6, deck + 0.07, pz + Math.sin(yaw) * 0.6);
    level.push('paintedMetalGreen', bowl, _m);
    bowl.dispose();
    const bucket = cyl(0.13, 0.11, 0.28, 9, 0.5);
    _m.makeTranslation(px - Math.sin(yaw) * 0.55, deck + 0.14, pz - Math.cos(yaw) * 0.55);
    level.push('paintedMetalTan', bucket, _m);
    bucket.dispose();
    const hoop = ring(0.13, 0.008, 8, 4, 0.3);
    _m.makeRotationZ(Math.PI / 2);
    _m.setPosition(px - Math.sin(yaw) * 0.55, deck + 0.3, pz - Math.cos(yaw) * 0.55);
    level.push('gunmetal', hoop, _m);
    hoop.dispose();
  }
}

/** The corner nobody uses: spoil, broken slab, a drum and a tarp over junk. */
function neglectedClutter(
  level: LevelSystem, px: number, deck: number, pz: number, rng: RNG,
): void {
  const r = rng.next();
  if (r < 0.42) {
    // Swept spoil, as loose stone over a stained ground. This is the element the
    // deck most needs: a horizontal surface broken into a few hundred shadows.
    _m.makeTranslation(px, deck + 0.005, pz);
    const bed = patchDisc(
      rng.range(0.7, 1.4), rng.range(0.6, 1.2), 0.035, () => rng.next(),
      { sides: 11, wobble: 0.45, shoulder: 0.5, tile: 1.6 },
    );
    level.push('rubble', bed, _m, FLAT);
    bed.dispose();
    _m.makeTranslation(px, deck + 0.02, pz);
    const heap = gravelBed(1.7, 1.4, 0.07, rng.int(30, 55), () => rng.next());
    level.push('rubble', heap, _m, FLAT);
    heap.dispose();
    for (let i = 0; i < 3; i++) {
      const ss = rng.range(0.3, 0.7);
      _q.setFromEuler(new THREE.Euler(rng.range(-0.35, 0.35), rng.range(0, 6.28), rng.range(-0.2, 0.2)));
      _m.compose(_p.set(px + rng.range(-0.7, 0.7), deck + 0.07, pz + rng.range(-0.6, 0.6)), _q, _s);
      const slab = boxUV(ss, 0.07, ss * rng.range(0.5, 1.0), 1.4);
      level.push('rubble', slab, _m);
      slab.dispose();
    }
  } else if (r < 0.68) {
    // A drum on its side with the head rusted out, and a can beside it.
    // One axis, derived once, with the barrel and both rolling hoops built on
    // it: a torus laid flat round a barrel that is itself lying down is a ring
    // cutting through it at right angles, and that is the kind of stray
    // primitive these reviews find every time.
    const dr = 0.29;
    const da = rng.range(0, Math.PI * 2);
    const axis = new THREE.Vector3(Math.cos(da), 0, Math.sin(da));
    const drum = cyl(dr, dr, 0.86, 12, 1.0);
    _q.setFromUnitVectors(_yAxis, axis);
    _m.compose(_p.set(px, deck + dr, pz), _q, _s);
    level.push(rng.next() < 0.5 ? 'paintedMetalGreen' : 'corrugated', drum, _m);
    drum.dispose();
    _q.setFromUnitVectors(_zAxis, axis);
    for (const t of [-0.3, 0.3]) {
      const hoop = ring(dr + 0.012, 0.022, 10, 4, 0.4);
      _m.compose(
        _p.set(px + axis.x * t, deck + dr, pz + axis.z * t), _q, _s,
      );
      level.push('corrugated', hoop, _m);
      hoop.dispose();
    }
    const can = cyl(0.11, 0.11, 0.3, 8, 0.5);
    _q.setFromAxisAngle(_zAxis, Math.PI / 2 + rng.range(-0.2, 0.2));
    _m.compose(_p.set(px + rng.range(-0.8, 0.8), deck + 0.11, pz + rng.range(-0.8, 0.8)), _q, _s);
    level.push('paintedMetalTan', can, _m);
    can.dispose();
  } else {
    // Stored material under a weighted tarp, moved here from the scatter: it is
    // junk, and junk belongs in the junk corner.
    const n = rng.int(1, 2);
    let stackTop = deck;
    for (let s = 0; s < n; s++) {
      const sz = rng.range(0.5, 0.75);
      _m.makeTranslation(px + rng.range(-0.22, 0.22), stackTop + sz / 2, pz + rng.range(-0.22, 0.22));
      level.box(rng.next() < 0.6 ? 'woodCrate' : 'paintedMetalGreen', sz, sz, sz * 0.8, _m, 1.1);
      stackTop += sz * 0.94;
    }
    const tarp = clothPanel(1.05, 0.9, { fold: 0.09, folds: 3, hem: 0.14, tile: 2.0, segsX: 5, segsY: 4 });
    _q.setFromAxisAngle(_xAxis, Math.PI / 2 - 0.16);
    _m.compose(_p.set(px, stackTop + 0.03, pz - 0.34), _q, _s);
    level.push('fabricTarp', tarp, _m);
    tarp.dispose();
    for (const wo of [-0.42, 0.4]) {
      _m.makeTranslation(px + wo, stackTop - 0.5, pz - 0.75);
      level.box('rubble', 0.24, 0.16, 0.2, _m, 0.9);
    }
  }
}

function buildRoofTerrace(
  level: LevelSystem,
  cx: number,
  cz: number,
  w: number,
  d: number,
  deck: number,
  bulkX: number,
  bulkZ: number,
  rng: RNG,
): void {
  // In a corner, which is where a sitting-out place goes: two parapets to lean
  // against, shelter from the wind, and the middle of the roof left clear to walk
  // and fight across. Placed anywhere on the deck it also lands wherever a player
  // happens to be standing, which for the overwatch camera means inside the lens.
  let sx = rng.next() < 0.5 ? -1 : 1;
  let sz = rng.next() < 0.5 ? -1 : 1;
  // Not the corner the stair head is already in.
  if (Math.sign(bulkX - cx || 1) === sx && Math.sign(bulkZ - cz || 1) === sz) sx = -sx;
  let tx = cx + sx * (w / 2 - rng.range(2.3, 3.1));
  let tz = cz + sz * (d / 2 - rng.range(2.3, 3.1));
  if (Math.abs(tx - bulkX) < 2.8 && Math.abs(tz - bulkZ) < 2.8) {
    sz = -sz;
    tz = cz + sz * (d / 2 - rng.range(2.3, 3.1));
  }
  // A terrace in the same corner as a firing position puts a table and a brazier
  // in the sightline. Try the diagonally opposite corner, then give up.
  if (nearPost(tx, tz, 3.4)) {
    tx = cx - sx * (w / 2 - 2.7);
    tz = cz - sz * (d / 2 - 2.7);
    if (nearPost(tx, tz, 3.4)) return;
  }
  const rot = rng.range(0, Math.PI * 2);

  // Woven rug: rippled field, rolled hem all round, fringe off the two ends.
  //
  // A 40 mm box was what was here, and the roof review found it three times —
  // "tan quads with hard unblended rectangular edges lying on the roof". A rug
  // is one of the few objects on a deck the eye already knows the shape of, so
  // a rectangle with a hard edge and no fringe fails immediately. The hem is
  // what does the work: it is only 20 mm proud, but it runs the whole perimeter
  // and puts a line of shade between the rug and the screed.
  _q.setFromAxisAngle(_yAxis, rot);
  const mw = rng.range(2.0, 2.7);
  const md = rng.range(1.5, 2.1);
  _m.compose(_p.set(tx, deck + 0.19, tz), _q, _s);
  {
    const mat = rugGeometry(mw, md, () => rng.next());
    level.push('fabricSandbag', mat, _m);
    mat.dispose();
  }
  // Bolsters along two edges.
  for (const sd of [-1, 1]) {
    const bol = bagGeometry(mw * 0.42, 0.11, 0.16);
    _m.compose(
      _p.set(tx - Math.sin(rot) * sd * (md / 2 - 0.12), deck + 0.32, tz - Math.cos(rot) * sd * (md / 2 - 0.12)),
      _q, _s,
    );
    level.push('fabricTarp', bol, _m);
    bol.dispose();
  }
  // Low table with a tray on it.
  _m.compose(_p.set(tx, deck + 0.55, tz), _q, _s);
  {
    const top = boxUV(0.78, 0.05, 0.6, 1.2);
    level.push('wood', top, _m);
    top.dispose();
  }
  for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    _m.compose(
      _p.set(
        tx + (lx * 0.32 * Math.cos(rot) - lz * 0.23 * Math.sin(rot)),
        deck + 0.37,
        tz + (lx * 0.32 * Math.sin(rot) + lz * 0.23 * Math.cos(rot)),
      ),
      _q, _s,
    );
    const leg = boxUV(0.05, 0.31, 0.05, 0.5);
    level.push('wood', leg, _m);
    leg.dispose();
  }
  const tray = cyl(0.19, 0.19, 0.03, 12, 0.5);
  _m.makeTranslation(tx, deck + 0.6, tz);
  level.push('gunmetal', tray, _m);
  tray.dispose();
  for (let i = 0; i < 3; i++) {
    const a = rot + (i / 3) * Math.PI * 2;
    const glass = cyl(0.035, 0.028, 0.09, 7, 0.3);
    _m.makeTranslation(tx + Math.cos(a) * 0.11, deck + 0.64, tz + Math.sin(a) * 0.11);
    level.push(GLASS_KEY, glass, _m, GLASS_OPTS);
    glass.dispose();
  }
  // Stools, scattered rather than set.
  for (let i = 0; i < rng.int(2, 3); i++) {
    const a = rot + rng.range(0, 6.28);
    const sr = rng.range(1.0, 1.5);
    const sx2 = tx + Math.cos(a) * sr;
    const sz2 = tz + Math.sin(a) * sr;
    const sh = rng.range(0.3, 0.42);
    _q.setFromAxisAngle(_yAxis, rng.range(0, 3.14));
    _m.compose(_p.set(sx2, deck + 0.19 + sh / 2, sz2), _q, _s);
    const st = boxUV(0.34, sh, 0.34, 0.9);
    level.push('wood', st, _m);
    st.dispose();
  }
  // Brazier: a drum on three legs, with charcoal in it.
  {
    const bx = tx + Math.cos(rot + 1.2) * 1.6;
    const bz = tz + Math.sin(rot + 1.2) * 1.6;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const leg = cyl(0.015, 0.015, 0.26, 4, 0.3);
      _m.makeTranslation(bx + Math.cos(a) * 0.13, deck + 0.3, bz + Math.sin(a) * 0.13);
      level.push('corrugated', leg, _m);
      leg.dispose();
    }
    const pan = cyl(0.21, 0.16, 0.16, 10, 0.6);
    _m.makeTranslation(bx, deck + 0.5, bz);
    level.push('gunmetal', pan, _m);
    pan.dispose();
    for (let i = 0; i < 5; i++) {
      _m.makeTranslation(
        bx + rng.range(-0.11, 0.11), deck + 0.57, bz + rng.range(-0.11, 0.11),
      );
      level.box('polymerBlack', 0.07, 0.05, 0.06, _m, 0.3);
    }
  }
  // A birdcage or pigeon crate on a block, the other rooftop constant.
  if (rng.next() < 0.55) {
    const gx = tx + Math.cos(rot - 1.4) * 2.1;
    const gz = tz + Math.sin(rot - 1.4) * 2.1;
    _m.makeTranslation(gx, deck + 0.29, gz);
    level.box('concrete', 0.66, 0.24, 0.5, _m, 1.2);
    _m.makeTranslation(gx, deck + 0.72, gz);
    level.box('woodCrate', 0.62, 0.62, 0.46, _m, 1.0);
    for (let i = 0; i < 5; i++) {
      _m.makeTranslation(gx - 0.24 + i * 0.11, deck + 0.72, gz + 0.24);
      level.box('corrugated', 0.02, 0.5, 0.02, _m, 0.3);
    }
  }
}

/**
 * Where the deck meets the parapet: a coved skirting fillet, then a band of
 * gravel ballast, then a drift of sand in the corners the wind cannot reach.
 *
 * A flat roof always has this. The fillet is there so the waterproofing can turn
 * up the parapet without a right-angle crease, and it is the detail that stops
 * the deck/parapet junction reading as two flat planes butted together — which
 * is exactly what a bare slab-plus-wall looks like from standing height.
 */
function buildRoofSkirting(
  level: LevelSystem,
  cx: number,
  cz: number,
  w: number,
  d: number,
  deck: number,
  rng: RNG,
): void {
  const pT = 0.26;
  const iw = w - pT * 2;
  const id = d - pT * 2;

  // [inner face position, extrude length, axis, yaw]
  const runs: Array<[number, number, number, 'x' | 'z', number]> = [
    [cx, cz - id / 2, iw, 'x', 0],
    [cx, cz + id / 2, iw, 'x', Math.PI],
    [cx - iw / 2, cz, id, 'z', -Math.PI / 2],
    [cx + iw / 2, cz, id, 'z', Math.PI / 2],
  ];
  for (const [rx, rz, len, axis, yaw] of runs) {
    const fh = rng.range(0.15, 0.2);
    const dep = fh * 1.5;
    const geo = prism(driftProfile(dep, fh), len, 2.0, axis === 'x' ? 'x' : 'z');
    _q.setFromAxisAngle(_yAxis, yaw);
    // The wedge's vertical face sits on the parapet, the slope runs inboard.
    const inx = axis === 'x' ? 0 : (rx < cx ? 1 : -1);
    const inz = axis === 'x' ? (rz < cz ? 1 : -1) : 0;
    _m.compose(_p.set(rx + inx * dep / 2, deck, rz + inz * dep / 2), _q, _s);
    level.push('concrete', geo, _m);
    geo.dispose();

    // Upstand and cover flashing over the head of the fillet.
    //
    // A fillet on its own is a wedge: it leans against the parapet and dies out,
    // so from a standing eye there is one soft gradient where the horizontal
    // meets the vertical and nothing else. The detail that is actually built is
    // an upstand — the waterproofing turned up the wall for 150 mm and capped
    // with a flashing that oversails it by 30 mm — and the oversail is the point,
    // because a 30 mm overhang throws a hard horizontal shadow the whole length
    // of every parapet on the roof. Four lines round the deck, for eight boxes.
    const upH = rng.range(0.13, 0.19);
    _m.makeTranslation(rx + inx * 0.035, deck + fh + upH / 2, rz + inz * 0.035);
    level.box(
      'concrete',
      axis === 'x' ? len : 0.07, upH, axis === 'x' ? 0.07 : len,
      _m, 1.4, SCREED,
    );
    _m.makeTranslation(rx + inx * 0.075, deck + fh + upH + 0.02, rz + inz * 0.075);
    level.box(
      'corrugated',
      axis === 'x' ? len : 0.16, 0.035, axis === 'x' ? 0.16 : len,
      _m, 1.0,
    );

    // Ballast inboard of the fillet, on two sides out of four.
    //
    // As a flat box this was the single worst thing on the deck: a two-metre
    // rectangle of dark rubble with a 90 mm vertical rim and four hard corners,
    // sitting in the middle of a pale field. Ballast is loose stone, so what it
    // actually is at this distance is a few hundred small shadows — and that has
    // to be geometry, because a rubble texture on a horizontal plate at twenty
    // degrees to the eye minifies to its own average and returns a flat tone.
    if (rng.next() < 0.62) {
      const bw = rng.range(0.65, 1.05);
      const bl = len * rng.range(0.45, 0.9);
      const bx = rx + inx * (dep + bw / 2);
      const bz = rz + inz * (dep + bw / 2);
      const along = axis === 'x' ? bl : bw;
      const across = axis === 'x' ? bw : bl;
      _m.makeTranslation(bx, deck + 0.005, bz);
      const bed = patchDisc(
        along / 2, across / 2, 0.03, () => rng.next(),
        { sides: 13, wobble: 0.24, shoulder: 0.72, tile: 1.6 },
      );
      level.push('rubble', bed, _m, FLAT);
      bed.dispose();
      _m.makeTranslation(bx, deck + 0.025, bz);
      const stones = gravelBed(
        along * 0.94, across * 0.94, 0.05,
        Math.round(along * across * 11), () => rng.next(),
      );
      level.push('rubble', stones, _m, FLAT);
      stones.dispose();
    }
  }

  // Sand banked into two corners: nothing sweeps a roof, and the drift is what
  // makes the deck read as horizontal rather than as an untextured plane.
  for (let i = 0; i < 2; i++) {
    const sx = rng.next() < 0.5 ? -1 : 1;
    const sz = rng.next() < 0.5 ? -1 : 1;
    const dh = rng.range(0.18, 0.34);
    const dl = rng.range(1.8, 3.4);
    for (const along of [0, 1]) {
      const geo = prism(driftProfile(dh * 3.2, dh), dl, 2.6, along === 0 ? 'x' : 'z');
      _q.setFromAxisAngle(_yAxis, along === 0 ? (sz < 0 ? 0 : Math.PI) : (sx < 0 ? -Math.PI / 2 : Math.PI / 2));
      _m.compose(
        _p.set(
          cx + sx * (w / 2 - pT) - (along === 0 ? sx * dl / 2 : sx * dh * 1.6),
          deck + 0.02,
          cz + sz * (d / 2 - pT) - (along === 0 ? sz * dh * 1.6 : sz * dl / 2),
        ),
        _q, _s,
      );
      level.push('sand', geo, _m);
      geo.dispose();
    }
  }
}

/**
 * The fall line made visible: a kerbed channel from mid-deck to the outlet.
 *
 * Bay tilts give the deck a fall you can measure but not one you can *see*,
 * because a one-degree change of plane at a joint is a change of tone and the
 * eye reads it as texture. What tells you a roof drains is the channel: a 380 mm
 * gutter formed in the screed, kerbed both sides, running across the deck and
 * turning a corner to reach the outlet. It is the only long continuous line on
 * the horizontal surface, it is stained darker than everything round it because
 * water sits in it, and it points at the one thing on the roof that explains
 * where the water goes. Six boxes and two washes a leg.
 */
function roofChannel(
  level: LevelSystem,
  cx: number,
  cz: number,
  w: number,
  d: number,
  deck: number,
  outX: number,
  outZ: number,
  sx: number,
  sz: number,
  rng: RNG,
): void {
  const half = 0.2;
  const kh = rng.range(0.1, 0.14);
  const elbowX = outX - sx * w * rng.range(0.26, 0.44);
  const endZ = outZ - sz * d * rng.range(0.24, 0.4);
  const legs: Array<[number, number, number, number]> = [
    [outX, outZ, elbowX, outZ],
    [elbowX, outZ, elbowX, endZ],
  ];
  for (const [ax, az, bx, bz] of legs) {
    const alongX = Math.abs(bx - ax) > Math.abs(bz - az);
    const len = alongX ? Math.abs(bx - ax) : Math.abs(bz - az);
    if (len < 0.8) continue;
    const mx = (ax + bx) / 2;
    const mz = (az + bz) / 2;
    // Kerbs either side, sloped inward, so the channel is dished rather than
    // square: a square gutter is two bars laid on a deck, a dished one is formed.
    for (const side of [-1, 1]) {
      const geo = prism(
        driftProfile(0.16, kh), len + (alongX ? 0.2 : 0.2), 1.6, alongX ? 'x' : 'z',
      );
      _q.setFromAxisAngle(_yAxis, alongX ? (side < 0 ? 0 : Math.PI) : (side < 0 ? -Math.PI / 2 : Math.PI / 2));
      _m.compose(
        _p.set(mx + (alongX ? 0 : side * half), deck, mz + (alongX ? side * half : 0)),
        _q, _s,
      );
      level.push('concrete', geo, _m, SCREED);
      geo.dispose();
    }
    // The wet line down the middle of it.
    _m.makeTranslation(mx, deck + 0.012, mz);
    level.box(
      'dirt', alongX ? len : half * 1.5, 0.02, alongX ? half * 1.5 : len, _m, 1.6, FLAT,
    );
    // Silt and moss along one edge, in short broken runs.
    const runs = Math.max(2, Math.round(len / 1.4));
    for (let i = 0; i < runs; i++) {
      if (rng.next() < 0.34) continue;
      const t = -len / 2 + (len * (i + 0.5)) / runs;
      const off = rng.range(-0.11, 0.11);
      _m.makeTranslation(
        mx + (alongX ? t : off), deck + 0.02, mz + (alongX ? off : t),
      );
      const silt = gravelBed(
        alongX ? len / runs : 0.16, alongX ? 0.16 : len / runs, 0.025, 9, () => rng.next(),
      );
      level.push('rubble', silt, _m, FLAT);
      silt.dispose();
    }
  }

}

/**
 * The deck as screed bays rather than one slab.
 *
 * Real flat roofs are laid in panels with a joint between them, and the panels
 * settle and get patched at different times, so they end up at slightly
 * different levels and tones. Emitting that as geometry gives the deck a grid of
 * shadow lines a couple of centimetres deep, which is all it needs to stop
 * reading as a single grey quad. A pavior walkway runs from the stair bulkhead
 * out to the parapet, because that is the line people actually wear.
 */
function buildRoofBays(
  level: LevelSystem,
  spec: BuildingSpec,
  cx: number,
  cz: number,
  w: number,
  d: number,
  deck: number,
  wallKey: MaterialKey,
  tile: number,
  rng: RNG,
  outX: number,
  outZ: number,
): void {
  // A paved margin all round the screed, wide enough to walk.
  //
  // This is the detail that turns a deck into a built roof rather than a tiled
  // floor. A screeded roof is laid in bays between a perimeter walkway of flags,
  // so there is a continuous band at the parapet in a different material with a
  // joint down both of its sides — which is a strong frame round the whole deck,
  // and a hard line where the horizontal meets the vertical. Without it the bays
  // ran almost to the parapet and the deck read as one field of plates whose
  // seams stopped for no reason.
  const pad = 0.92;
  const bandY = 0.055;
  for (const [ox, oz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as Array<[number, number]>) {
    const bw = ox !== 0 ? pad : w - pad * 2 + 0.02;
    const bd = ox !== 0 ? d - 0.04 : pad;
    _m.makeTranslation(
      cx + ox * (w / 2 - pad / 2 - 0.02),
      deck + bandY / 2,
      cz + oz * (d / 2 - pad / 2 - 0.02),
    );
    level.box(wallKey, bw, bandY, bd, _m, tile);
    // Laid as flags, with a proud joint between them. The walkway is a metre
    // wide and runs the whole perimeter, so unbroken it is the second largest
    // continuous plane on the deck after the bays themselves — and it sits right
    // at the parapet, which is where the eye goes.
    const runLen = ox !== 0 ? bd : bw;
    const flags = Math.max(2, Math.round(runLen / 0.85));
    for (let i = 1; i < flags; i++) {
      const t = -runLen / 2 + (runLen * i) / flags;
      _m.makeTranslation(
        cx + ox * (w / 2 - pad / 2 - 0.02) + (ox !== 0 ? 0 : t),
        deck + bandY,
        cz + oz * (d / 2 - pad / 2 - 0.02) + (ox !== 0 ? t : 0),
      );
      level.box(
        'concrete',
        ox !== 0 ? pad - 0.06 : 0.045, 0.022, ox !== 0 ? 0.045 : pad - 0.06,
        _m, 0.8, SCREED,
      );
    }
  }
  // Kerb along the inner edge of the walkway, holding the screed back.
  for (const [ox, oz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as Array<[number, number]>) {
    _m.makeTranslation(
      cx + ox * (w / 2 - pad + 0.04), deck + 0.075, cz + oz * (d / 2 - pad + 0.04),
    );
    level.box(
      'concrete',
      ox !== 0 ? 0.09 : w - pad * 2 + 0.18, 0.1, ox !== 0 ? d - pad * 2 + 0.18 : 0.09,
      _m, 1.0, COPING,
    );
  }
  // 2.6 m bays, not 4.2.
  //
  // Bay size is the only control this function has over how much linework the
  // deck gets, and a roof is the one surface a player looks at from two metres
  // with nothing else in the frame. At a 4.2 m module a 16 m deck showed three
  // joints, so the near half of an overwatch shot was a four-metre square of
  // unbroken pale screed — the exact flat plane the whole pass exists to remove.
  // Halving the module doubles the shadow lines for twelve triangles a bay.
  const nx = Math.max(2, Math.round((w - pad * 2) / 2.15));
  const nz = Math.max(2, Math.round((d - pad * 2) / 2.15));
  const joint = 0.075;
  // Uneven bay widths, summing back to the deck. A perfect grid is as much of a
  // tell as no grid at all, and it is cheap to break: real screed bays follow
  // where the labourer stopped, not a module.
  const cuts = (n: number, total: number): number[] => {
    const raw: number[] = [];
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const v = 1 + rng.range(-0.3, 0.3);
      raw.push(v);
      sum += v;
    }
    return raw.map((v) => (v / sum) * total);
  };
  const xs = cuts(nx, w - pad * 2);
  const zs = cuts(nz, d - pad * 2);

  // Half the deck relaid at a different level, with a kerb along the join.
  //
  // Joints alone give the deck linework but every bay still sits on one plane, so
  // from a standing eye the whole roof is a single horizontal and the joints are
  // lines drawn on it. One 150 mm level change across the middle puts a real
  // shadow the length of the deck and gives the surface somewhere to be read
  // against, and it is what a roof that has been patched over decades looks like.
  const liftAlongX = rng.next() < 0.5;
  const liftFrom = Math.max(1, Math.round((liftAlongX ? nx : nz) * rng.range(0.35, 0.6)));
  const lift = rng.range(0.1, 0.17);

  // Falls, as a tilt per bay rather than as a change of level.
  //
  // A flat roof is not flat: it is screeded to a fall of about 1:60 towards the
  // outlet, and because it is laid bay by bay by hand the falls disagree with
  // each other by a degree or two at every joint. That disagreement is the whole
  // reading. A deck of level bays has one surface normal across the entire
  // horizontal half of the frame, so every pixel of it returns the same N·L and
  // no amount of joint linework changes that — which is exactly the "large pale
  // grey expanse" note. Tilting each bay by 1–3 degrees towards the outlet gives
  // neighbouring bays measurably different values, steps of 40–90 mm at the
  // joints where the tilts fight, and a surface that resolves as built to a fall.
  //
  // Tilting rather than stepping is deliberate: it leaves each bay's *centre* at
  // deck level, so everything else placed on this roof still lands on it. A real
  // change of datum would need every prop pass to know the fall.
  const fallTo = new THREE.Vector2(outX - cx, outZ - cz);
  if (fallTo.lengthSq() < 1e-4) fallTo.set(1, 1);
  fallTo.normalize();
  /** One prevailing wind per roof, so the grit trails all lie the same way. */
  const windward = rng.range(0, Math.PI);

  let ox = cx - w / 2 + pad;
  for (let i = 0; i < nx; i++) {
    let oz = cz - d / 2 + pad;
    for (let k = 0; k < nz; k++) {
      const bw = xs[i];
      const bd = zs[k];
      const px = ox + bw / 2;
      const pz = oz + bd / 2;
      const r = rng.next();
      const base = deck + ((liftAlongX ? i : k) >= liftFrom ? lift : 0);
      // Shallow. The joint between bays is a slot down to the slab below, and it
      // renders as pure shadow, so bay depth *is* the width of a black line drawn
      // round every bay. At 14 cm the deck came out as a chequerboard of tiles;
      // at 6 cm the same joint reads as a screed joint, which is what it is.
      // Depth is what makes the joint read, so it is worth the spread: at a
      // constant 5 cm every bay sits at the same level and the deck is a grid
      // drawn on one plane, whereas 3 to 9 cm gives adjacent bays a step you can
      // see the shadow of from across the roof.
      //
      // One bay in seven has lost its screed and holds water: 40 mm lower than
      // its neighbours instead of 50 mm higher, so it is a real depression with
      // a real edge all round it, which is what a ponding patch is.
      // Thickness spread widened once the tilt was in and measured. A one-to-
      // three-degree fall changes N·L by about four per cent under this sun, so
      // the tilt buys the deck a *plane break* but almost no value — what the
      // eye actually reads at a grazing angle is the riser at the joint, which
      // is a genuinely vertical surface and therefore either lit or in shade.
      // At 30–80 mm those risers were 50 mm at most; at 25–130 mm, plus the
      // 50–60 mm the tilts contribute at a bay edge, adjacent bays step by up to
      // 180 mm and the joint line reads from anywhere on the roof.
      const ponded = r > 0.86;
      const h = ponded ? 0.008 : 0.025 + r * 0.12;
      // Tilt about the axis at right angles to the fall direction. Bays near the
      // outlet lie flatter — that is where the fall has already been used up.
      const grade = rng.range(0.012, 0.05) *
        (ponded ? 0.25 : 1) *
        (0.45 + 0.55 * Math.min(1, Math.hypot(px - outX, pz - outZ) / Math.max(3, (w + d) / 4)));
      const tilt = grade * (rng.next() < 0.15 ? -0.7 : 1);
      _q.setFromAxisAngle(_p.set(fallTo.y, 0, -fallTo.x).normalize(), tilt);
      /** Surface height at an offset from the bay's centre, following the tilt. */
      const on = (dx: number, dz: number): number =>
        base + h / 2 - (dx * fallTo.x + dz * fallTo.y) * tilt;
      _m.compose(_p.set(px, base + h / 2, pz), _q, _s);
      // Kept within one family of greys: the bays should differ by a shade and a
      // joint, not by a colour. A whole bay of sand was tried here to warm the
      // deck up and it is exactly the wrong shape for it — a 2.6 m rectangle of
      // tan with four straight edges and a hard corner, which is the flat plate
      // the drift work everywhere else on the map exists to avoid. Sand belongs on
      // a deck as lobes with a fringe, which is what goes on below.
      level.box(
        r < 0.72 ? 'concrete' : 'concreteFloor', bw - joint, h, bd - joint, _m, 3.2, SCREED,
      );
      // A bay that has been patched, or has lost its screed to the weather.
      // Built from overlapping lobes rather than one rectangle — a patch with
      // four square corners is a decal, and the material has to stay in the pale
      // family or it becomes the black rectangle that ruins the deck.
      // No sand up here, in any shape.
      //
      // Three have now been tried — lenses, lobes and ribs — and all three failed
      // for the same reason, which is scale. A rib that reads as drift on a
      // fourteen-metre carriageway seen from twenty metres is 300 mm wide and two
      // metres long; put that same rib on a roof and look at it from two metres
      // and it is a plank lying on the deck, which is exactly what the last
      // overwatch capture came back with. Sand on a roof banks up in the corners
      // and in the lee of the parapet, and the skirting is where that belongs.
      // What is left on the open deck is what a roofer left: screed repairs.
      if (ponded) {
        // Standing water leaves a tide line, and a dished bay collects the grit
        // the wind brings up here. Both are laid as feathered discs so the pond
        // has no straight edge anywhere — a rectangle of dark material lying in
        // a light deck is the exact card the whole pass exists to remove.
        for (let l = 0; l < 2; l++) {
          const rr = Math.min(bw, bd) * rng.range(0.18, 0.34);
          const dx = rng.range(-1, 1) * (bw / 2 - rr - 0.1);
          const dz = rng.range(-1, 1) * (bd / 2 - rr - 0.1);
          _m.makeTranslation(px + dx, on(dx, dz) + h / 2 + 0.002, pz + dz);
          const stain = patchDisc(
            rr * rng.range(0.9, 1.5), rr, 0.014, () => rng.next(),
            { sides: 10, wobble: 0.5, shoulder: 0.5, tile: 1.4 },
          );
          level.push(l === 0 ? 'dirt' : 'rubble', stain, _m, FLAT);
          stain.dispose();
        }
      } else if (rng.next() < 0.3) {
        const lobes = rng.int(1, 2);
        for (let l = 0; l < lobes; l++) {
          const pw = (bw - joint) * rng.range(0.28, 0.5);
          const pd = (bd - joint) * rng.range(0.28, 0.5);
          const dx = rng.range(-(bw - pw) / 2.6, (bw - pw) / 2.6);
          const dz = rng.range(-(bd - pd) / 2.6, (bd - pd) / 2.6);
          _q.setFromAxisAngle(_yAxis, rng.range(-1.4, 1.4));
          _m.compose(_p.set(px + dx, on(dx, dz) + h / 2 + 0.008, pz + dz), _q, _s);
          // A repair has the outline of the failure it is covering, which is
          // never a rectangle. Same disc as the ground patches, but poured
          // thick with a near-vertical arris: a 40 mm skim in the same grey as
          // the bay under it has no edge to catch the light and the deck came
          // back covered in pale blobs that read as spilt paint. 80 mm is a
          // screed repair, and it is the 80 mm that makes it visible at all.
          const lobe = patchDisc(
            pw / 2, pd / 2, 0.08, () => rng.next(),
            { sides: 8, wobble: 0.4, shoulder: 0.8, tile: 2.0 },
          );
          level.push('concreteFloor', lobe, _m, SCREED_FLAT);
          lobe.dispose();
          // A bead of mortar squeezed out along one edge. Without it a 35 mm
          // pour on a flat deck is a decal — the review capture had two of
          // these reading as sheets of grey paper lying on the roof — and with
          // it there is 60 mm of relief catching the sun along one side.
          const bx = rng.range(-0.2, 0.2);
          const bz = rng.range(-0.2, 0.2);
          _q.setFromAxisAngle(_yAxis, rng.range(0, 6.28));
          _m.compose(_p.set(px + bx, on(bx, bz) + h / 2 + 0.02, pz + bz), _q, _s);
          const bead = prism(
            driftProfile(rng.range(0.1, 0.18), rng.range(0.03, 0.055)),
            Math.max(pw, pd) * rng.range(0.5, 0.9), 1.2, 'z',
          );
          level.push('concrete', bead, _m, SCREED);
          bead.dispose();
        }
      }
      // Grit blown across the deck, on this bay's own surface.
      //
      // Of everything tried up here, loose stone is the only thing that reliably
      // survives a 20-degree viewing angle, because it is not a surface at all —
      // it is a couple of hundred separate objects each casting its own shadow,
      // and shadows do not minify away the way a normal map does. The same
      // treatment that fixed the ballast at the parapet therefore goes out into
      // the middle of the deck, where there was four metres of unbroken pale
      // screed at a stretch. On one heading per roof, because that is the wind.
      // Only on the decks a player can get to. Loose stone is the most expensive
      // thing per square metre in this whole pass — it is four triangles a stone
      // and it wants forty a square metre — and it only pays for itself when the
      // eye is close enough to resolve the individual shadows. On the outer
      // blocks, which are seen from 40 m and never stood on, it is a tone.
      if (spec.detail !== 'lite' && rng.next() < 0.58) {
        const tl = Math.min(bw - joint, rng.range(0.9, 2.1));
        const tw = rng.range(0.45, 1.1);
        const dx = rng.range(-1, 1) * Math.max(0, (bw - tl) / 2 - 0.1);
        const dz = rng.range(-1, 1) * Math.max(0, (bd - tw) / 2 - 0.1);
        _q.setFromAxisAngle(_yAxis, windward + rng.range(-0.35, 0.35));
        _m.compose(_p.set(px + dx, on(dx, dz) + h / 2 + 0.002, pz + dz), _q, _s);
        const wash = patchDisc(
          tl / 2, tw / 2, 0.02, () => rng.next(),
          { sides: 11, wobble: 0.5, shoulder: 0.4, tile: 2.0 },
        );
        level.push('dirt', wash, _m, FLAT);
        wash.dispose();
        _m.compose(_p.set(px + dx, on(dx, dz) + h / 2 + 0.012, pz + dz), _q, _s);
        const grit = gravelBed(tl, tw, 0.032, Math.round(tl * tw * 30), () => rng.next());
        level.push('rubble', grit, _m, FLAT);
        grit.dispose();
      }
      oz += bd;
    }
    ox += xs[i];
  }

  // Riser along the level change, plus a couple of steps up over it where the
  // walking line crosses. Without the riser the bays on the high side look as if
  // they are floating a hand's width off the ones next to them.
  {
    const cutAt = (liftAlongX ? xs : zs).slice(0, liftFrom).reduce((a, b) => a + b, 0);
    const t = (liftAlongX ? cx - w / 2 : cz - d / 2) + pad + cutAt;
    const runLen = (liftAlongX ? d : w) - pad * 2;
    _m.makeTranslation(
      liftAlongX ? t : cx, deck + lift / 2, liftAlongX ? cz : t,
    );
    level.box(
      'concrete', liftAlongX ? 0.14 : runLen, lift, liftAlongX ? runLen : 0.14, _m, 1.6,
    );
    const so = rng.range(-0.28, 0.28) * (liftAlongX ? d : w);
    _m.makeTranslation(
      liftAlongX ? t - 0.26 : cx + so, deck + lift / 2 - 0.02,
      liftAlongX ? cz + so : t - 0.26,
    );
    level.box(
      'concrete', liftAlongX ? 0.4 : 0.95, lift - 0.04, liftAlongX ? 0.95 : 0.4, _m, 1.4,
    );
  }

  // Loose stuff on the deck, in heaps rather than scattered.
  //
  // Sprinkled evenly, eleven objects over a 16 m square is one per eighteen
  // square metres, which from standing height means the near half of the frame
  // has nothing in it and the far half has a dusting — the two failure modes at
  // once. Grouped into three or four piles it reads as somebody's stuff put down
  // where they were working, and the piles are big enough to see.
  const groups = spec.detail === 'lite' ? 2 : 4;
  const litter = spec.detail === 'lite' ? 5 : 14;
  const spots: Array<[number, number]> = [];
  for (let i = 0; i < groups; i++) {
    // Against a parapet or beside the stair head: nobody stacks things mid-deck.
    const edge = rng.int(0, 3);
    const t = rng.range(-0.3, 0.3);
    const inset = rng.range(0.85, 1.7);
    spots.push(
      edge === 0 ? [cx + t * w, cz - d / 2 + inset]
        : edge === 1 ? [cx + t * w, cz + d / 2 - inset]
          : edge === 2 ? [cx - w / 2 + inset, cz + t * d]
            : [cx + w / 2 - inset, cz + t * d],
    );
  }
  for (let i = 0; i < litter; i++) {
    const [gx, gz] = spots[i % spots.length];
    const px = THREE.MathUtils.clamp(gx + rng.range(-1.1, 1.1), cx - w / 2 + 0.7, cx + w / 2 - 0.7);
    const pz = THREE.MathUtils.clamp(gz + rng.range(-1.1, 1.1), cz - d / 2 + 0.7, cz + d / 2 - 0.7);
    const r = rng.next();
    if (r < 0.4) {
      // Slab offcuts, propped or flat.
      const sw = rng.range(0.4, 0.9);
      _q.setFromEuler(new THREE.Euler(rng.range(-0.5, 0.5), rng.range(0, 6.28), rng.range(-0.2, 0.2)));
      _m.compose(_p.set(px, deck + 0.2, pz), _q, _s);
      const slab = boxUV(sw, 0.07, sw * rng.range(0.5, 1.0), 1.4);
      level.push('rubble', slab, _m);
      slab.dispose();
    } else if (r < 0.62) {
      // Swept heap against nothing in particular.
      const hs = rng.range(0.3, 0.6);
      _m.makeTranslation(px, deck + 0.16 + hs * 0.12, pz);
      level.box('rubble', hs * 1.6, hs * 0.28, hs * 1.3, _m, 1.0);
    } else if (r < 0.78) {
      // Bucket, or a tin of something.
      const br = rng.range(0.12, 0.18);
      const bh = rng.range(0.22, 0.34);
      const pail = cyl(br, br * 0.82, bh, 9, 0.6);
      _m.makeTranslation(px, deck + 0.15 + bh / 2, pz);
      level.push(rng.next() < 0.5 ? 'paintedMetalTan' : 'corrugated', pail, _m);
      pail.dispose();
    } else if (r < 0.9) {
      // Coil of cable or hose.
      const coil = ring(rng.range(0.2, 0.32), 0.045, 10, 4, 0.5);
      _q.setFromAxisAngle(_xAxis, Math.PI / 2);
      _m.compose(_p.set(px, deck + 0.19, pz), _q, _s);
      level.push('polymerBlack', coil, _m);
      coil.dispose();
    } else {
      // A block left over from the parapet, with its bar still in it.
      _m.makeTranslation(px, deck + 0.28, pz);
      level.box('concrete', 0.38, 0.24, 0.3, _m, 1.2);
      const bar = cyl(0.011, 0.011, 0.55, 4, 0.4);
      _q.setFromAxisAngle(_zAxis, rng.range(0.9, 1.5));
      _m.compose(_p.set(px + 0.1, deck + 0.5, pz), _q, _s);
      level.push('corrugated', bar, _m);
      bar.dispose();
    }
  }

  // ---- the drying floor, in the middle of the deck ----
  //
  // Pushing every object to the parapets and the corners — which is where they
  // belong — leaves the centre of a sixteen-metre deck completely bare, and the
  // centre is where a player stands, so the near half of an overwatch shot then
  // has nothing in it at all and no object to judge scale or distance against.
  // What goes in the middle of a roof is what has to lie in the sun: mats of
  // fruit and grain put out to dry, weighted at the corners. All of it under
  // 300 mm, so it fills the frame without blocking a sightline or a footstep.
  if (spec.detail !== 'lite') {
    const mats = rng.int(2, 4);
    for (let i = 0; i < mats; i++) {
      const mx = cx + rng.range(-w * 0.19, w * 0.19);
      const mz = cz + rng.range(-d * 0.19, d * 0.19);
      const mw = rng.range(1.1, 2.0);
      const md = rng.range(0.8, 1.4);
      const rot = rng.range(0, Math.PI);
      _q.setFromAxisAngle(_yAxis, rot);
      _m.compose(_p.set(mx, deck + 0.115, mz), _q, _s);
      {
        const mat = boxUV(mw, 0.03, md, 1.1);
        level.push('fabricSandbag', mat, _m);
        mat.dispose();
      }
      // Produce spread over the mat, as one thin layer with heaps raked up in it.
      //
      // Emitted as 200 mm cubes on a 300 mm grid this was the worst-reading thing
      // on the roof: a regular lattice of same-sized squares with a gap round each
      // one, which from standing height is a chequerboard and reads as a texture
      // bug rather than as anything physical. Grain on a mat has no grid in it —
      // it is a continuous layer, thicker where it has been raked.
      const at = (lu: number, lv: number): THREE.Vector3 => _p.set(
        mx + lu * Math.cos(rot) - lv * Math.sin(rot),
        deck + 0.14,
        mz + lu * Math.sin(rot) + lv * Math.cos(rot),
      );
      {
        const layer = bagGeometry(mw * 0.45, 0.035, md * 0.44);
        _m.compose(at(0, 0), _q, _s);
        level.push('paintedMetalTan', layer, _m);
        layer.dispose();
      }
      const heaps = rng.int(4, 8);
      for (let a = 0; a < heaps; a++) {
        const hr = rng.range(0.16, 0.34);
        const heap = bagGeometry(hr, rng.range(0.05, 0.1), hr * rng.range(0.6, 1.1));
        _q.setFromAxisAngle(_yAxis, rot + rng.range(-0.6, 0.6));
        _m.compose(at(rng.range(-mw / 2 + hr, mw / 2 - hr), rng.range(-md / 2 + hr, md / 2 - hr)), _q, _s);
        level.push(rng.next() < 0.55 ? 'paintedMetalTan' : 'woodCrate', heap, _m);
        heap.dispose();
      }
      _q.setFromAxisAngle(_yAxis, rot);
      // Stones holding the corners down against the wind.
      for (const [ox, oz] of [[-1, -1], [1, 1]] as Array<[number, number]>) {
        const lu = ox * (mw / 2 - 0.1);
        const lv = oz * (md / 2 - 0.1);
        _m.makeTranslation(
          mx + lu * Math.cos(rot) - lv * Math.sin(rot),
          deck + 0.17,
          mz + lu * Math.sin(rot) + lv * Math.cos(rot),
        );
        level.box('rubble', 0.16, 0.1, 0.14, _m, 0.5);
      }
    }
    // A swept heap and the broom that made it.
    const hx = cx + rng.range(-w * 0.2, w * 0.2);
    const hz = cz + rng.range(-d * 0.2, d * 0.2);
    for (let i = 0; i < 3; i++) {
      _q.setFromAxisAngle(_yAxis, rng.range(0, 3.14));
      _m.compose(_p.set(hx + rng.range(-0.3, 0.3), deck + 0.13, hz + rng.range(-0.3, 0.3)), _q, _s);
      const heap = prism(duneProfile(rng.range(0.5, 0.9), rng.range(0.08, 0.15)), rng.range(0.4, 0.8), 1.2, 'z');
      level.push('rubble', heap, _m);
      heap.dispose();
    }
  }

  // A cheek wall dividing the roof.
  //
  // Adjoining roofs in a terrace are separated by a low wall, and it is the one
  // element that gives a deck a silhouette: everything else up here is either
  // flat or a small object, so from standing height the roof has no horizon of
  // its own. It also gives a player on the roof something to shoot from behind.
  if (rng.next() < 0.55) {
    const alongX = w > d;
    const wallLen = (alongX ? w : d) * rng.range(0.38, 0.6);
    const at = (alongX ? d : w) * rng.range(-0.28, 0.28);
    const wx = cx + (alongX ? rng.range(-0.15, 0.15) * w : at);
    const wz = cz + (alongX ? at : rng.range(-0.15, 0.15) * d);
    // At least three courses: a two-segment wall that loses one to the gap
    // below is a lone stub standing in the middle of the deck.
    const segs = Math.max(3, Math.round(wallLen / 2.4));
    for (let i = 0; i < segs; i++) {
      if (rng.next() < 0.1) continue;
      const t = -wallLen / 2 + (wallLen * (i + 0.5)) / segs;
      const sh = rng.range(0.75, 1.05);
      const sl = (wallLen / segs) * 0.99;
      // A gap where the wall would run through a firing position. Reads as the
      // doorway between two roofs, which is what would be there anyway.
      if (nearPost(wx + (alongX ? t : 0), wz + (alongX ? 0 : t), 1.7)) continue;
      _m.makeTranslation(
        wx + (alongX ? t : 0), deck + 0.06 + sh / 2, wz + (alongX ? 0 : t),
      );
      // The building's own wall material, not brick: a fresh red brick wall on a
      // whitewashed roof reads as a garden fence dropped into the middle of the
      // frame, and it was the loudest thing in the overwatch shot.
      level.box(wallKey, alongX ? sl : 0.22, sh, alongX ? 0.22 : sl, _m, tile);
      _m.makeTranslation(
        wx + (alongX ? t : 0), deck + 0.06 + sh + 0.05, wz + (alongX ? 0 : t),
      );
      level.box('concrete', alongX ? sl : 0.34, 0.1, alongX ? 0.34 : sl, _m, 1.8);
    }
  }

  // Pavior walkway, out of the head-house door and across the deck. The line
  // people actually wear, and it gives the deck a direction.
  const head = stairHead(stairWell(spec));
  const doorX = head.x - head.w / 2;
  const runLen = Math.max(1.5, doorX - (cx - w / 2) - 1.6);
  const pav = 0.56;
  const steps = Math.max(2, Math.round(runLen / (pav + 0.06)));
  for (let i = 0; i < steps; i++) {
    const t = 0.5 + (pav + 0.06) * i;
    for (const lat of [-1, 1]) {
      _m.makeTranslation(doorX - t, deck + 0.15, head.z + (lat * (pav + 0.05)) / 2);
      level.box('concrete', pav, 0.11, pav, _m, 1.3);
    }
  }
}

// ---------------------------------------------------------------- interior ---

function buildInterior(level: LevelSystem, spec: BuildingSpec, storeys: Storey[], rng: RNG): void {
  const { cx, cz, w, d } = spec;
  const innerW = w - WALL_T * 2;
  const innerD = d - WALL_T * 2;

  for (const st of storeys) {
    const y = st.base;
    const ceil = st.h - SLAB_T;

    // ---- partitions, laid out to leave a fightable through-route ----
    const pT = 0.18;
    const longAxis = innerW > innerD ? 'x' : 'z';
    const cross = longAxis === 'x' ? innerW : innerD;
    const walls = Math.max(1, Math.round(cross / 6.5));
    for (let i = 1; i <= walls; i++) {
      if (rng.next() < 0.25) continue;
      const t = -cross / 2 + (cross * i) / (walls + 1);
      // Two segments with a 1.3 m doorway between them.
      const span = longAxis === 'x' ? innerD : innerW;
      const doorOff = rng.range(-span * 0.25, span * 0.25);
      const doorW = 1.35;
      const segs: Array<[number, number]> = [
        [-span / 2, doorOff - doorW / 2],
        [doorOff + doorW / 2, span / 2],
      ];
      for (const [a, b] of segs) {
        const segLen = b - a;
        if (segLen < 0.3) continue;
        const mid = (a + b) / 2;
        if (longAxis === 'x') {
          if (inCourt(spec, cx + t, cz + mid, segLen / 2)) continue;
          if (hitsWell(spec, cx + t, cz + mid, 0, segLen / 2)) continue;
          _m.makeTranslation(cx + t, y + ceil / 2, cz + mid);
          level.box('plasterInterior', pT, ceil, segLen, _m, 3.0, INSIDE);
        } else {
          if (inCourt(spec, cx + mid, cz + t, segLen / 2)) continue;
          if (hitsWell(spec, cx + mid, cz + t, segLen / 2, 0)) continue;
          _m.makeTranslation(cx + mid, y + ceil / 2, cz + t);
          level.box('plasterInterior', segLen, ceil, pT, _m, 3.0, INSIDE);
        }
      }
      // Lintel over the doorway plus a shallow head so the gap reads as a door.
      //
      // Guarded like the wall segments are. Without this the lintel of a partition
      // whose leaves were both culled for crossing the court survives on its own,
      // and a 1.35 m plaster block hangs unsupported over the middle of the one
      // space in the building the review camera looks into — which is exactly what
      // the pale slab in the centre of every interior capture turned out to be.
      const lx = longAxis === 'x' ? cx + t : cx + doorOff;
      const lz = longAxis === 'x' ? cz + doorOff : cz + t;
      if (inCourt(spec, lx, lz, doorW / 2) || hitsWell(spec, lx, lz, doorW / 2, doorW / 2)) continue;
      if (longAxis === 'x') {
        _m.makeTranslation(lx, y + 2.15 + (ceil - 2.15) / 2, lz);
        level.box('plasterInterior', pT, ceil - 2.15, doorW, _m, 3.0, INSIDE);
      } else {
        _m.makeTranslation(lx, y + 2.15 + (ceil - 2.15) / 2, lz);
        level.box('plasterInterior', doorW, ceil - 2.15, pT, _m, 3.0, INSIDE);
      }
    }

    // ---- skirting and a picture rail: cheap, and stops walls reading as planes
    for (const f of facesOf(cx, cz, w, d)) {
      fBox(level, 'plasterInterior', f, 0, y + 0.09, -WALL_T - 0.03, f.len - WALL_T * 2, 0.18, 0.06, 2.0, INSIDE);
      if (st.index === 0 && spec.interior === 'shop') {
        fBox(level, 'wood', f, 0, y + 1.55, -WALL_T - 0.14, f.len - WALL_T * 2 - 1.0, 0.05, 0.28, 2.0, INSIDE);
      }
    }

    // Joisted ceilings are the single most expensive interior layer in the map
    // and they only read from inside the room, so the outer blocks — which have
    // no reason for a player to enter them — get a plain soffit.
    if (spec.detail !== 'lite') dressCeiling(level, spec, st, rng);

    // ---- furniture ----
    // Scaled by floor area rather than a flat count: a 20 x 18 shop floor given
    // the same six pieces as a 10 x 8 room reads as an abandoned warehouse.
    const area = innerW * innerD;
    const pieces = spec.detail === 'lite'
      ? Math.round(area / 60) + rng.int(0, 2)
      : Math.round(area / 16) + rng.int(2, 5);
    for (let i = 0; i < pieces; i++) {
      const px = cx + rng.range(-innerW / 2 + 0.6, innerW / 2 - 0.6);
      const pz = cz + rng.range(-innerD / 2 + 0.6, innerD / 2 - 0.6);
      if (inCourt(spec, px, pz, 1.0)) continue;
      if (hitsWell(spec, px, pz, 1.0, 1.0)) continue;
      const r = rng.next();
      const rot = rng.range(0, Math.PI * 2);
      if (r < 0.22) {
        // Table.
        const tw = rng.range(0.8, 1.4);
        const td = rng.range(0.6, 0.9);
        pushRot(level, 'wood', boxUV(tw, 0.06, td, 1.6), px, y + 0.74, pz, rot);
        for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          pushRot(level, 'wood', boxUV(0.07, 0.72, 0.07, 0.7), px + lx * (tw / 2 - 0.09), y + 0.36, pz + lz * (td / 2 - 0.09), rot);
        }
      } else if (r < 0.38) {
        // Mattress or bedroll against a wall.
        pushRot(level, 'fabricSandbag', boxUV(0.9, 0.16, 1.9, 1.6), px, y + 0.1, pz, rot);
        pushRot(level, 'fabricTarp', boxUV(0.8, 0.09, 0.7, 1.2), px, y + 0.22, pz - 0.5, rot);
      } else if (r < 0.52) {
        // Chair, sometimes knocked over.
        const down = rng.next() < 0.3;
        pushRot(level, 'wood', boxUV(0.44, 0.05, 0.44, 1.0), px, y + (down ? 0.06 : 0.46), pz, rot);
        pushRot(level, 'wood', boxUV(0.44, 0.5, 0.06, 1.0), px, y + (down ? 0.28 : 0.72), pz + (down ? 0.22 : 0.19), rot);
        if (!down) {
          for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
            pushRot(level, 'wood', boxUV(0.05, 0.44, 0.05, 0.6), px + lx * 0.18, y + 0.22, pz + lz * 0.18, rot);
          }
        }
      } else if (r < 0.68) {
        // Shelving unit or cupboard.
        const cw = rng.range(0.8, 1.3);
        const chh = rng.range(1.1, 1.9);
        pushRot(level, 'wood', boxUV(cw, chh, 0.42, 1.8), px, y + chh / 2, pz, rot);
        for (let k = 1; k < 4; k++) {
          pushRot(level, 'woodCrate', boxUV(cw - 0.08, 0.04, 0.44, 1.4), px, y + (chh * k) / 4, pz + 0.02, rot);
        }
      } else if (r < 0.82) {
        // Crates and sacks.
        const n = rng.int(2, 4);
        for (let k = 0; k < n; k++) {
          const bs = rng.range(0.4, 0.7);
          pushRot(level, rng.next() < 0.6 ? 'woodCrate' : 'fabricSandbag',
            boxUV(bs, bs * 0.8, bs, 1.1), px + rng.range(-0.35, 0.35), y + bs * 0.4 + k * bs * 0.8, pz + rng.range(-0.35, 0.35), rot);
        }
      } else {
        // Fallen masonry and dust from the shelling upstairs.
        const n = rng.int(5, 12);
        for (let k = 0; k < n; k++) {
          const bs = rng.range(0.12, 0.34);
          pushRot(level, 'rubble', boxUV(bs, bs * 0.6, bs * 0.9, 0.9),
            px + rng.range(-0.8, 0.8), y + bs * 0.3, pz + rng.range(-0.8, 0.8), rng.range(0, 3));
        }
      }
    }

    // ---- a rug and a hanging curtain, for softness ----
    if (rng.next() < 0.55) {
      const rw = rng.range(1.6, 2.6);
      pushRot(level, 'fabricTarp', boxUV(rw, 0.02, rw * 0.66, 2.2),
        cx + rng.range(-innerW / 4, innerW / 4), y + 0.05, cz + rng.range(-innerD / 4, innerD / 4), rng.range(0, 3));
    }
    // A curtain dividing the room, hung tight to a wall and about half the storey
    // deep. Full height in open floor it is a two-by-three metre flat sheet — the
    // single largest featureless shape an interior can have, dark or pale, and it
    // sits in front of whatever the room was built to show. Skipped entirely in a
    // building with a court, which has its own cloth and needs the sightline.
    if (!spec.courtyard && rng.next() < 0.5) {
      const drop = (st.h - SLAB_T) * 0.5;
      const cloth = clothPanel(rng.range(1.0, 1.7), drop, { fold: 0.12, folds: 4, hem: 0.12, tile: 2.2, segsX: 7, segsY: 5 });
      const alongX = rng.next() < 0.5;
      const sd = rng.next() < 0.5 ? -1 : 1;
      _q.setFromAxisAngle(_yAxis, alongX ? 0 : Math.PI / 2);
      _m.compose(
        _p.set(
          cx + (alongX ? rng.range(-innerW / 3, innerW / 3) : sd * (innerW / 2 - 0.5)),
          y + ceil - 0.1,
          cz + (alongX ? sd * (innerD / 2 - 0.5) : rng.range(-innerD / 3, innerD / 3)),
        ),
        _q, _s,
      );
      level.push('fabricTarp', cloth, _m, { variant: 'linen', material: LINEN_MAT });
      cloth.dispose();
    }

    if (spec.detail !== 'lite') dressHighLevel(level, spec, st, rng);
  }

  // ---- the spoil heap under a breach ----
  // Everything that used to be the slab is now on the floor directly below it,
  // and it is the brightest thing in the room, so it carries a lot of the read.
  const shaft = shaftAt(spec);
  if (shaft) {
    const y = storeys[0].base;
    for (let i = 0; i < 34; i++) {
      const a = rng.next() * Math.PI * 2;
      const rr = Math.sqrt(rng.next()) * 2.5;
      const bs = rng.range(0.14, 0.46) * (1 - (rr / 2.5) * 0.5);
      _q.setFromEuler(new THREE.Euler(rng.range(-0.5, 0.5), rng.range(0, 6.28), rng.range(-0.5, 0.5)));
      _m.compose(
        _p.set(shaft.x + Math.cos(a) * rr, y + bs * 0.35 + Math.max(0, 1 - rr / 2.0) * 0.3, shaft.z + Math.sin(a) * rr * 1.1),
        _q, _s,
      );
      const chunk = boxUV(bs * 1.4, bs * 0.7, bs * 1.1, 0.9);
      level.push(rng.next() < 0.7 ? 'rubble' : 'concrete', chunk, _m, INSIDE);
      chunk.dispose();
    }
    // Snapped reinforcement sticking out of the heap.
    for (let i = 0; i < 6; i++) {
      const bar = cyl(0.011, 0.011, rng.range(0.7, 1.6), 4, 0.4);
      _q.setFromEuler(new THREE.Euler(rng.range(0.5, 1.2), rng.range(0, 6.28), rng.range(-0.4, 0.4)));
      _m.compose(_p.set(shaft.x + rng.range(-1.2, 1.2), y + 0.5, shaft.z + rng.range(-1.2, 1.2)), _q, _s);
      level.push('corrugated', bar, _m);
      bar.dispose();
    }
    // Dust fanning out from the pile.
    for (let i = 0; i < 5; i++) {
      const dw = rng.range(1.6, 3.4);
      _m.makeTranslation(shaft.x + rng.range(-2.2, 2.2), y + 0.02, shaft.z + rng.range(-2.2, 2.2));
      level.box('dirt', dw, 0.03, dw * rng.range(0.6, 1.0), _m, 2.4, INSIDE);
    }
  }
}

/**
 * An arcaded courtyard open to the sky.
 *
 * Each storey gets a colonnade facing the void — piers, segmental arches and a
 * gallery rail above — so the court reads as many small openings against a
 * bright ground rather than as one square hole. The floor is tiled with a
 * central drain, because that is the one place in the building where rain lands.
 */
function buildCourtyard(level: LevelSystem, spec: BuildingSpec, storeys: Storey[], rng: RNG): void {
  const c = courtAt(spec)!;
  const topY = storeys[storeys.length - 1].base + storeys[storeys.length - 1].h;

  // ---- floor: tiles, a drain and a rim kerb ----
  // The court is the only daylit surface in the building and everything inside
  // is lit by bounce off it, so it is laid in pale stone rather than the dark
  // tile used elsewhere. A dark court floor makes the whole interior read as a
  // basement no matter how much light gets in.
  _m.makeTranslation(c.x, 0.3, c.z);
  level.box('tile', c.w, 0.08, c.d, _m, 1.6, COURT_STONE);
  // Banding: a border course, and a square set on the diagonal at the centre.
  for (const [ox, oz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as Array<[number, number]>) {
    _m.makeTranslation(c.x + ox * (c.w / 2 - 0.34), 0.345, c.z + oz * (c.d / 2 - 0.34));
    level.box(
      'concrete',
      ox !== 0 ? 0.5 : c.w - 0.4, 0.03, ox !== 0 ? c.d - 0.4 : 0.5, _m, 1.6, COURT_STONE,
    );
  }
  _q.setFromAxisAngle(_yAxis, Math.PI / 4);
  _m.compose(_p.set(c.x, 0.345, c.z), _q, _s);
  {
    const lozenge = boxUV(1.5, 0.03, 1.5, 1.2);
    level.push('concrete', lozenge, _m, COURT_STONE);
    lozenge.dispose();
  }
  _m.makeTranslation(c.x, 0.35, c.z);
  level.box('concrete', 0.62, 0.06, 0.62, _m, 0.9, INSIDE);
  _m.makeTranslation(c.x, 0.37, c.z);
  level.box('corrugated', 0.34, 0.04, 0.34, _m, 0.5, INSIDE);
  for (const [ox, oz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as Array<[number, number]>) {
    _m.makeTranslation(c.x + ox * (c.w / 2 - 0.1), 0.36, c.z + oz * (c.d / 2 - 0.1));
    level.box('concrete', ox !== 0 ? 0.2 : c.w, 0.2, ox !== 0 ? c.d : 0.2, _m, 1.4, COURT_STONE);
  }

  const pierD = 0.42;
  for (const st of storeys) {
    const clear = st.h - SLAB_T;
    for (const [ox, oz, dir] of [
      [1, 0, 'east'], [-1, 0, 'west'], [0, 1, 'north'], [0, -1, 'south'],
    ] as Array<[number, number, Dir]>) {
      const alongX = ox === 0;
      const trabeated = spec.courtOpen === dir;
      const runLen = alongX ? c.w : c.d;
      // Trabeated sides get one wide opening between the corner piers instead of
      // three arched ones, so a player in that gallery has an unbroken view out.
      const bays = trabeated ? 1 : Math.max(2, Math.round(runLen / 3.0));
      const bayW = runLen / bays;
      const pierW = Math.min(0.6, bayW * 0.24);
      const openW = bayW - pierW;
      // The arcade is deliberately tall: a standing player's eye is 1.6 m up and
      // an arch that springs at 2.3 m puts its head right on the eye line, so the
      // court beyond would be hidden behind the spandrel instead of framed.
      const head = st.base + clear - 0.16;
      const rise = Math.min(1.05, openW * 0.42);
      const springY = head - rise;
      // Pier inner faces sit exactly on the court boundary.
      const nx = c.x + ox * (c.w / 2 + pierD / 2);
      const nz = c.z + oz * (c.d / 2 + pierD / 2);

      for (let i = 0; i <= bays; i++) {
        const t = -runLen / 2 + bayW * i;
        // Skip the piers that would sit in the return of the adjacent side.
        if (i === 0 || i === bays) continue;
        const px = alongX ? c.x + t : nx;
        const pz = alongX ? nz : c.z + t;
        _m.makeTranslation(px, (st.base + springY) / 2, pz);
        level.box(
          'plaster',
          alongX ? pierW : pierD, springY - st.base, alongX ? pierD : pierW, _m, 2.4, INSIDE,
        );
        // Capital and base blocks, in the same warm stone as the court paving.
        // As plain interior concrete they came out at (105, 102, 96) against
        // walls at R:B 1.2, so every capital in the arcade was a cool grey block
        // sitting on a warm cream pier — the one thing in the frame that looked
        // like a different material rather than a different surface.
        // Three courses, not one block.
        //
        // A capital is a *stack*: a necking that the shaft dies into, a bell that
        // spreads, and a flat abacus that the arch sits on. The review's charge
        // was that the arches "spring directly off plain rectangular piers with
        // no capital, no impost moulding, no base, no plinth", and one square
        // block does not answer it — a single block reads as a lump on a post,
        // whereas three courses of increasing width read as a transition from a
        // vertical member to a horizontal one, which is what a capital is for.
        // Same at the foot, upside down, which is a base on a plinth.
        const capBands: Array<[number, number, number]> = [
          // [ y centre, height, outward spread each side ]
          [springY - 0.29, 0.08, 0.03],
          [springY - 0.19, 0.12, 0.1],
          [springY - 0.08, 0.1, 0.16],
          [st.base + 0.05, 0.1, 0.15],
          [st.base + 0.14, 0.08, 0.09],
          [st.base + 0.21, 0.06, 0.035],
        ];
        for (const [by, bh, sp] of capBands) {
          _m.makeTranslation(px, by, pz);
          level.box(
            'concrete',
            alongX ? pierW + sp * 2 : pierD + sp * 1.5, bh,
            alongX ? pierD + sp * 1.5 : pierW + sp * 2,
            _m, 1.2, COURT_STONE,
          );
        }
      }
      // Corner piers, square, shared between the two runs.
      if (alongX) {
        for (const s of [-1, 1]) {
          _m.makeTranslation(c.x + s * (c.w / 2 + pierD / 2), (st.base + springY) / 2, nz);
          level.box('plaster', pierD + 0.14, springY - st.base, pierD + 0.14, _m, 2.4, INSIDE);
        }
      }
      if (trabeated) {
        // A deep timber bressummer on a stone padstone at each end, with the
        // masonry above it. One horizontal member well over the eye line, which
        // is all this side needs to be doing.
        const beamY = springY + rise - 0.19;
        _m.makeTranslation(alongX ? c.x : nx, beamY, alongX ? nz : c.z);
        level.box(
          'wood', alongX ? runLen + 0.5 : pierD + 0.06, 0.38, alongX ? pierD + 0.06 : runLen + 0.5,
          _m, 1.8, INSIDE,
        );
        // Joist ends over the beam, so the gallery ceiling has a soffit.
        const joists = Math.max(3, Math.round(runLen / 0.85));
        for (let i = 0; i <= joists; i++) {
          const t = -runLen / 2 + (runLen * i) / joists;
          _m.makeTranslation(
            alongX ? c.x + t : nx - ox * 0.24, beamY + 0.3, alongX ? nz - oz * 0.24 : c.z + t,
          );
          level.box(
            'wood', alongX ? 0.09 : pierD + 0.5, 0.13, alongX ? pierD + 0.5 : 0.09, _m, 0.8, INSIDE,
          );
        }
        const spandrel = st.base + clear - (beamY + 0.19);
        if (spandrel > 0.08) {
          _m.makeTranslation(
            alongX ? c.x : nx, beamY + 0.19 + spandrel / 2, alongX ? nz : c.z,
          );
          level.box(
            'plaster', alongX ? runLen : pierD, spandrel, alongX ? pierD : runLen, _m, 2.4, INSIDE,
          );
        }
      } else {
        // Arcade: a run of small segmental arches with spandrel infill above.
        //
        // Thirteen stones, not seven. The court is the brightest surface in the
        // building, so every bed joint in a ring seen against it renders as a
        // bright slot; at seven stones over a 3.4 m soffit each is half a metre
        // long with a 32 mm gap either side, and from the gallery opposite the
        // ring reads as a row of separate slabs rather than as an arch. Shorter
        // stones with a thinner joint put the same total gap into twice as many
        // slots, each below the width the eye separates at that range.
        const ringGeo = archRing(openW / 2, rise, {
          stones: 13, thickness: 0.26, depth: pierD + 0.04, joint: 0.03, tile: 1.0,
          keystone: 0.11, rand: () => rng.next(),
        });
        for (let i = 0; i < bays; i++) {
          const t = -runLen / 2 + bayW * (i + 0.5);
          const px = alongX ? c.x + t : nx;
          const pz = alongX ? nz : c.z + t;
          _q.setFromAxisAngle(_yAxis, alongX ? 0 : Math.PI / 2);
          _m.compose(_p.set(px, springY, pz), _q, _s);
          level.push('plaster', ringGeo, _m, INSIDE);
          // Spandrel between the arch head and the slab soffit.
          const spandrel = st.base + clear - head;
          if (spandrel > 0.08) {
            _m.makeTranslation(px, head + spandrel / 2, pz);
            level.box('plaster', alongX ? bayW : pierD, spandrel, alongX ? pierD : bayW, _m, 2.4, INSIDE);
          }
        }
        ringGeo.dispose();
      }

      // Gallery rail on the upper storeys, at the slab edge.
      if (st.index > 0) {
        const railLen = runLen + 0.26;
        for (const ry of [0.4, 0.86]) {
          _m.makeTranslation(nx, st.base + ry, nz);
          level.box('corrugated', alongX ? railLen : 0.05, 0.05, alongX ? 0.05 : railLen, _m, 0.6, INSIDE);
        }
        const n = Math.max(3, Math.round(railLen / 0.9));
        for (let i = 0; i <= n; i++) {
          const t = -railLen / 2 + (railLen * i) / n;
          _m.makeTranslation(alongX ? c.x + t : nx, st.base + 0.48, alongX ? nz : c.z + t);
          level.box('corrugated', 0.045, 0.92, 0.045, _m, 0.6, INSIDE);
        }
        // Mashrabiya over about half the gallery bays: a turned lattice from the
        // rail head up to the arch springing, so the upper storey is screened
        // where the women of the house would use it and open where it is not.
        //
        // This is the highest-value single element in the interior shot. The court
        // is by nature all one material and all one value — it is the surface
        // everything else is lit off, so it cannot be dark — and a lattice is the
        // one thing that gives it a dark passage without taking any light out of
        // the room: 30 mm members on a 160 mm grid read as roughly half-covered at
        // this range, which is a mid-dark texture, and it is also the piece of
        // vernacular architecture the whole region is known for.
        for (let i = 0; i < bays; i++) {
          // Most bays, not half. At 58 % a three-bay run gets one screen on
          // average and the capture came back with a single lattice panel on one
          // side of the court, which reads as an oddity rather than as the way the
          // gallery is built. A court is screened on the sides that are overlooked
          // and open where it is not, so the majority case is screened.
          if (rng.next() < 0.2) continue;
          const t = -runLen / 2 + bayW * (i + 0.5);
          const px = alongX ? c.x + t : nx;
          const pz = alongX ? nz : c.z + t;
          // From the gallery floor to the springing, not from the rail head. On
          // the first attempt this started 900 mm up and the arch springing on an
          // upper storey is only about 1.5 m above its own floor, so the lattice
          // came out as a 520 mm band and was invisible in the capture.
          const sTop = springY - 0.08;
          const sBot = st.base + 0.06;
          if (sTop - sBot < 0.8) continue;
          const cols = Math.max(4, Math.round(openW / 0.17));
          const rows = Math.max(4, Math.round((sTop - sBot) / 0.19));
          for (let k = 0; k <= cols; k++) {
            const o = -openW / 2 + (openW * k) / cols;
            _m.makeTranslation(
              px + (alongX ? o : 0), (sBot + sTop) / 2, pz + (alongX ? 0 : o),
            );
            level.box(
              'wood', alongX ? 0.032 : 0.05, sTop - sBot, alongX ? 0.05 : 0.032, _m, 0.6, INSIDE,
            );
          }
          for (let k = 0; k <= rows; k++) {
            _m.makeTranslation(px, sBot + ((sTop - sBot) * k) / rows, pz);
            level.box(
              'wood', alongX ? openW : 0.05, 0.032, alongX ? 0.05 : openW, _m, 0.6, INSIDE,
            );
          }
          // Boxed-out sill and a heavier head rail, which is what the real ones
          // have and what stops the lattice reading as wire mesh.
          _m.makeTranslation(px, sBot + 0.07, pz);
          level.box(
            'wood', alongX ? openW + 0.1 : 0.16, 0.14, alongX ? 0.16 : openW + 0.1, _m, 0.9, INSIDE,
          );
          _m.makeTranslation(px, sTop - 0.06, pz);
          level.box(
            'wood', alongX ? openW + 0.06 : 0.13, 0.12, alongX ? 0.13 : openW + 0.06, _m, 0.9, INSIDE,
          );
        }
      }
    }
  }

  // ---- lantern on a chain from the top storey ----
  // The court's one dark object at eye level. Everything else in here is either
  // pale stone or a pale textile, and a frame with no dark in it has no contrast
  // range whatever the light is doing; a pierced iron lantern is small, it is
  // exactly what hangs in a riad court, and hung off-centre it gives the void
  // above the basin something to measure against.
  {
    // Hung low, at about the height of the ground-storey arch heads. A lantern
    // pulled up to the top storey is out of frame from anywhere in the arcade,
    // which is where it was on the first attempt; these hang where somebody can
    // reach them with a taper.
    const ly = Math.min(storeys[0].base + storeys[0].h - 1.0, 3.1);
    const lx = c.x + c.w * rng.range(-0.22, 0.22);
    const lz = c.z + c.d * rng.range(-0.24, 0.24);
    const chainTop = topY - 0.2;
    const chain = cyl(0.012, 0.012, chainTop - ly, 4, 0.4);
    _m.makeTranslation(lx, (ly + chainTop) / 2, lz);
    level.push('gunmetal', chain, _m, INSIDE);
    chain.dispose();
    // Body: an actually *pierced* cage, not a solid hexagonal prism.
    //
    // As a closed cylinder in interior gunmetal this came out as a featureless
    // black cone hanging in the middle of the interior frame — the one thing in
    // the room with no shading across it at all, which reads as a hole punched in
    // the picture rather than as an object. A lantern is defined by being open:
    // six ribs with glass between them, so the court behind shows through the
    // gaps and the ribs catch a highlight each. That, plus a pale glass, is the
    // whole difference between a silhouette and a lamp.
    const glass = cyl(0.165, 0.115, 0.4, 6, 0.7);
    _m.makeTranslation(lx, ly, lz);
    level.push('polymerTan', glass, _m, LANTERN_GLASS);
    glass.dispose();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const rib = new THREE.BoxGeometry(0.022, 0.44, 0.03);
      scaleUV(rib, 0.022, 0.44, 0.03, 0.4);
      _q.setFromAxisAngle(_yAxis, a);
      _p.set(lx + Math.cos(a) * 0.165, ly, lz + Math.sin(a) * 0.165);
      _m.compose(_p, _q, _s);
      level.push('gunmetal', rib, _m, LANTERN_IRON);
      rib.dispose();
    }
    const cap = cyl(0.05, 0.24, 0.16, 6, 0.6);
    _m.makeTranslation(lx, ly + 0.29, lz);
    level.push('gunmetal', cap, _m, LANTERN_IRON);
    cap.dispose();
    const base = cyl(0.14, 0.06, 0.14, 6, 0.5);
    _m.makeTranslation(lx, ly - 0.28, lz);
    level.push('gunmetal', base, _m, LANTERN_IRON);
    base.dispose();
    for (const ry of [-0.19, 0.19]) {
      const hoop = ring(0.2, 0.018, 6, 5, 0.4);
      _m.makeRotationX(Math.PI / 2).setPosition(lx, ly + ry, lz);
      level.push('gunmetal', hoop, _m, LANTERN_IRON);
      hoop.dispose();
    }
  }

  // ---- upstand and coping where the court meets the roof ----
  for (const [ox, oz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as Array<[number, number]>) {
    const alongX = ox === 0;
    const len = (alongX ? c.w : c.d) + 1.3;
    _m.makeTranslation(c.x + ox * (c.w / 2 + 0.32), topY + 0.55, c.z + oz * (c.d / 2 + 0.32));
    level.box('plaster', alongX ? len : 0.3, 0.9, alongX ? 0.3 : len, _m, 2.4);
    _m.makeTranslation(c.x + ox * (c.w / 2 + 0.32), topY + 1.04, c.z + oz * (c.d / 2 + 0.32));
    level.box('concrete', alongX ? len : 0.46, 0.1, alongX ? 0.46 : len, _m, 2.0);
  }

  dressCourtyard(level, c, rng);
}

/**
 * The court as somewhere people live rather than an empty light well.
 *
 * This matters more than it sounds: the interior review camera looks straight
 * into the court, and a court is by definition unfurnished in the middle — every
 * bit of room dressing gets culled out of it. So without its own pass the one
 * daylit space in the building is the emptiest thing in the map. Everything here
 * is what actually occupies a riad court: a raised basin, storage jars, potted
 * citrus, a washing line, and the low stools nobody puts away.
 */
function dressCourtyard(level: LevelSystem, c: SlabHole, rng: RNG): void {
  const fy = 0.34;

  // ---- basin: a raised octagonal-ish kerb round the drain ----
  const br = Math.min(c.w, c.d) * 0.21;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const seg = boxUV(br * 0.82, 0.34, 0.16, 1.2);
    _q.setFromAxisAngle(_yAxis, a);
    _m.compose(_p.set(c.x + Math.sin(a) * br, fy + 0.17, c.z + Math.cos(a) * br), _q, _s);
    level.push('tile', seg, _m, COURT_STONE);
    seg.dispose();
    const cap = boxUV(br * 0.86, 0.07, 0.24, 1.0);
    _m.compose(_p.set(c.x + Math.sin(a) * br, fy + 0.37, c.z + Math.cos(a) * br), _q, _s);
    level.push('concrete', cap, _m, COURT_STONE);
    cap.dispose();
  }
  // A spout on a short pedestal in the middle. No standing water: a glass plate
  // in a court that never sees direct sun is just a black hole in the floor.
  const ped = cyl(0.13, 0.17, 0.5, 8, 0.6);
  _m.makeTranslation(c.x, fy + 0.25, c.z);
  level.push('concrete', ped, _m, COURT_STONE);
  ped.dispose();
  const spout = cyl(0.03, 0.03, 0.34, 6, 0.4);
  _m.makeTranslation(c.x, fy + 0.66, c.z);
  level.push('gunmetal', spout, _m);
  spout.dispose();

  // ---- storage jars and stools round the edges ----
  // Kept low and kept few. A court lit only by the strip of sky above it has no
  // light to spare, and the first pass at this filled it with foliage masses —
  // which, in a material library whose only greenery is a dark olive tarpaulin,
  // read as black balloons hanging at eye level and cost the floor its light.
  const items = rng.int(5, 7);
  for (let i = 0; i < items; i++) {
    const a = (i / items) * Math.PI * 2 + rng.range(-0.3, 0.3);
    const rr = Math.min(c.w, c.d) * rng.range(0.33, 0.43);
    const px = c.x + Math.sin(a) * rr * (c.w / Math.min(c.w, c.d));
    const pz = c.z + Math.cos(a) * rr * (c.d / Math.min(c.w, c.d));
    const r = rng.next();
    if (r < 0.5) {
      // Glazed storage jar: belly and neck.
      // Left at the material's own value. The court floor needs the over-unity
      // lift because it is the surface the whole interior is lit off; applied to
      // brick as well it turns every jar into a glowing terracotta balloon, and a
      // round object brighter than the floor it stands on reads as floating.
      const jr = rng.range(0.24, 0.36);
      const belly = new THREE.SphereGeometry(jr, 10, 7);
      planarSphereUV(belly, 1.1);
      _m.compose(_p.set(px, fy + jr * 0.88, pz), _q.identity(), _s.set(1, 1.25, 1));
      level.push('brick', belly, _m, INSIDE);
      belly.dispose();
      _s.set(1, 1, 1);
      const neck = cyl(jr * 0.42, jr * 0.55, 0.18, 8, 0.5);
      _m.makeTranslation(px, fy + jr * 1.95, pz);
      level.push('brick', neck, _m, INSIDE);
      neck.dispose();
      // A ring of grit round the foot: the contact shadow the renderer will not
      // give at this scale, and without it the jar hovers.
      //
      // Pale and tight to the jar. As a 900 mm square of dark rubble it did the
      // grounding job and introduced a worse problem — from the gallery you look
      // down on this floor, and a flat dark square on pale flags reads as a hole
      // in it. Half the size in sand reads as spilled grain.
      _m.makeTranslation(px, fy + 0.015, pz);
      level.box('sand', jr * 1.7, 0.03, jr * 1.7, _m, 0.8, { ...INSIDE, noShadow: true });
    } else {
      // Stool, crate or a stack of trays.
      const sw = rng.range(0.32, 0.5);
      const sh = rng.range(0.3, 0.55);
      _q.setFromAxisAngle(_yAxis, rng.range(0, 3.14));
      _m.compose(_p.set(px, fy + sh / 2, pz), _q, _s);
      const g = boxUV(sw, sh, sw * rng.range(0.8, 1.1), 1.1);
      level.push(rng.next() < 0.5 ? 'woodCrate' : 'wood', g, _m, INSIDE);
      g.dispose();
    }
  }

  // ---- taller pieces against the arcade ----
  // A court floor between 7.5 m walls sees a narrow strip of sky, so anything
  // lying on it is unlit whatever its albedo. Things that stand up catch the
  // light a metre or two higher, which is the only way to stop the near floor
  // being a hole in the bottom of the frame.
  // Everything tall goes in a corner, and the corners are the two ends of one
  // diagonal so the group and the ladder do not stack up in the same sightline.
  // A court is entered from a gallery on one side and looked across; anything
  // standing on the mid-axis is directly in front of the fountain the court was
  // built around, and at eye height it hides it completely.
  {
    const sd = rng.next() < 0.5 ? -1 : 1;
    const sdz = rng.next() < 0.5 ? -1 : 1;
    // Ladder leaning into a corner of the arcade, the standard way onto a roof.
    const lz = c.z + sdz * (c.d / 2 - 0.8);
    const lx = c.x + sd * (c.w / 2 - 0.45);
    const lean = 0.22;
    for (const rail of [-1, 1]) {
      _q.setFromAxisAngle(_zAxis, sd * lean);
      _m.compose(_p.set(lx - sd * 0.28, fy + 1.5, lz + rail * 0.21), _q, _s);
      const g = boxUV(0.07, 3.0, 0.05, 1.4);
      level.push('wood', g, _m, INSIDE);
      g.dispose();
    }
    for (let i = 0; i < 9; i++) {
      const t = i / 9;
      _m.makeTranslation(lx - sd * (0.28 + (0.5 - t) * 3.0 * Math.sin(lean)), fy + 0.2 + t * 2.85, lz);
      level.box('wood', 0.05, 0.04, 0.44, _m, 0.5, INSIDE);
    }
    // Stack of crates and a leaning bundle of poles beside it, in the opposite
    // corner from the ladder.
    const stx = c.x - sd * (c.w / 2 - 0.6);
    const stz = c.z - sdz * (c.d / 2 - 0.9);
    let top = fy;
    for (let i = 0; i < 3; i++) {
      const cw = rng.range(0.5, 0.68);
      const ch = rng.range(0.34, 0.46);
      _q.setFromAxisAngle(_yAxis, rng.range(-0.3, 0.3));
      _m.compose(_p.set(stx + rng.range(-0.09, 0.09), top + ch / 2, stz + rng.range(-0.09, 0.09)), _q, _s);
      const g = boxUV(cw, ch, cw * 0.82, 1.1);
      level.push('woodCrate', g, _m, INSIDE);
      g.dispose();
      top += ch;
    }
    for (let i = 0; i < 5; i++) {
      _q.setFromAxisAngle(_zAxis, -sd * rng.range(0.16, 0.26));
      _m.compose(
        _p.set(stx - sd * 0.55 + rng.range(-0.07, 0.07), fy + 1.35, stz + 0.7 + i * 0.055),
        _q, _s,
      );
      const pole = cyl(0.028, 0.032, 2.7, 4, 0.6);
      level.push('wood', pole, _m, INSIDE);
      pole.dispose();
    }
  }

  // ---- things to fight from ----
  //
  // A court is the largest open volume in the map and the only one overlooked
  // from a gallery on all four sides, so it is the best room in the level to have
  // a firefight in and it was furnished as a museum piece: jars round the walls
  // and nothing in the middle to get behind. What it needs is what any arena
  // needs, which is a reason to cross it and something to break the crossing up.
  {
    // Mastaba: the stone bench built against the arcade in every courtyard house
    // of this kind. Waist high, so it is cover from the gallery above and a step
    // up to the gallery rail for anyone who wants the height.
    const bd = rng.next() < 0.5 ? -1 : 1;
    const bl = c.d * rng.range(0.4, 0.6);
    const bx = c.x + bd * (c.w / 2 - 0.35);
    _m.makeTranslation(bx, fy + 0.26, c.z + rng.range(-0.6, 0.6));
    level.box('tile', 0.7, 0.52, bl, _m, 1.6, COURT_STONE);
    _m.makeTranslation(bx, fy + 0.55, c.z + rng.range(-0.6, 0.6));
    level.box('concrete', 0.78, 0.07, bl + 0.08, _m, 1.2, COURT_STONE);

    // Grain sacks stacked against the opposite arcade: soft cover, and the one
    // form in the library that is neither a box nor a cylinder.
    const sx = c.x - bd * (c.w / 2 - 0.5);
    const sz = c.z + rng.range(-1.4, 1.4);
    for (let i = 0; i < 7; i++) {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const sack = bagGeometry(rng.range(0.42, 0.52), rng.range(0.22, 0.28), rng.range(0.3, 0.38));
      _q.setFromAxisAngle(_yAxis, rng.range(-0.2, 0.2));
      _m.compose(
        _p.set(sx + rng.range(-0.06, 0.06), fy + 0.13 + row * 0.25, sz + (col - 1) * 0.42),
        _q, _s,
      );
      level.push('fabricSandbag', sack, _m, INSIDE);
      sack.dispose();
    }

    // Debris from a collapsed length of the gallery rail above, spilled across
    // the flags below it. Rubble is the one thing that says a fight already
    // happened here, and it gives the floor a break in the paving pattern that
    // is not a rectangle.
    const dz = c.z + (rng.next() < 0.5 ? -1 : 1) * c.d * rng.range(0.2, 0.34);
    const dx = c.x + rng.range(-c.w * 0.2, c.w * 0.2);
    for (let i = 0; i < 9; i++) {
      const rw = rng.range(0.16, 0.44);
      _q.setFromAxisAngle(_yAxis, rng.range(0, 3.14));
      _q.multiply(new THREE.Quaternion().setFromAxisAngle(_zAxis, rng.range(-0.4, 0.4)));
      _m.compose(
        _p.set(dx + rng.range(-1.1, 1.1), fy + rng.range(0.03, 0.14), dz + rng.range(-0.9, 0.9)),
        _q, _s,
      );
      const chunk = boxUV(rw, rw * rng.range(0.3, 0.6), rw * rng.range(0.6, 1.1), 1.0);
      level.push(rng.next() < 0.6 ? 'rubble' : 'concrete', chunk, _m, INSIDE);
      chunk.dispose();
    }
    // The reinforcement bars out of the broken section, bent and still attached
    // to nothing — the detail that makes rubble read as a failure rather than a
    // delivery of stone.
    for (let i = 0; i < 3; i++) {
      _q.setFromAxisAngle(_zAxis, rng.range(0.9, 1.45));
      _q.premultiply(new THREE.Quaternion().setFromAxisAngle(_yAxis, rng.range(0, 3.14)));
      _m.compose(_p.set(dx + rng.range(-0.7, 0.7), fy + 0.2, dz + rng.range(-0.6, 0.6)), _q, _s);
      const bar = cyl(0.012, 0.012, rng.range(0.6, 1.1), 4, 0.5);
      level.push('corrugated', bar, _m, INSIDE);
      bar.dispose();
    }
  }

  // ---- washing strung across the court ----
  // A pale horizontal at eye level in the brightest part of the building: it is
  // the strongest single read the interior shot has, and it tells you the space
  // is used without needing a figure in it.
  const lines = rng.int(1, 2);
  for (let i = 0; i < lines; i++) {
    const alongX = c.w > c.d;
    // Off the centre line, always. A court is built round its basin and the line
    // runs to one side of it; strung through the middle the sheets hang directly
    // over the fountain, and from the review camera a pale panel and a pale stone
    // kerb overlap into one shape with no depth in it.
    const at = (alongX ? c.d : c.w) * (rng.next() < 0.5 ? -1 : 1) * rng.range(0.27, 0.4);
    // Strung at gallery level, not at head height.
    //
    // The review camera's eye is 3.34 m up — first-floor height — and a line at
    // 2.15 m put the cable dead across the middle of the frame as a hard black
    // horizontal, with a sheet hanging 2.9 m from the lens covering the fountain
    // the whole court is built around. Washing in a court is pegged from the
    // gallery anyway, because that is where somebody stands to hang it, and from
    // below it then reads the way it should: pale cloth against the strip of sky,
    // over the top of the arcade rather than through it.
    const y = 4.25 + rng.range(-0.35, 0.5);
    // Ends land on the wall face, and on a bracket, not 200 mm inside the
    // masonry. A line that disappears into a wall is the "terminates in mid-air
    // or passes through the wall" note; a 120 mm angle plate with the cable
    // stopping at it costs four triangles and answers the question.
    const a = new THREE.Vector3(
      alongX ? c.x - c.w / 2 + 0.06 : c.x + at, y, alongX ? c.z + at : c.z - c.d / 2 + 0.06,
    );
    const b = new THREE.Vector3(
      alongX ? c.x + c.w / 2 - 0.06 : c.x + at, y - 0.1, alongX ? c.z + at : c.z + c.d / 2 - 0.06,
    );
    const cable = slackCable(a, b, 0.055, 0.012, 8);
    _m.identity();
    level.push('polymerBlack', cable, _m, { ...INSIDE, noShadow: true });
    cable.dispose();
    [a, b].forEach((e, ei) => {
      const out = ei === 0 ? -0.05 : 0.05;
      _m.makeTranslation(e.x + (alongX ? out : 0), e.y, e.z + (alongX ? 0 : out));
      level.box('gunmetal', alongX ? 0.14 : 0.06, 0.07, alongX ? 0.06 : 0.14, _m, 0.4, INSIDE);
    });
    const n = rng.int(2, 4);
    for (let k = 0; k < n; k++) {
      const t = (k + 0.6) / (n + 0.2);
      // Sheets, not flannels. Under a metre wide with a deep sagging hem the
      // silhouette closed up into a rounded bag and the nearest one read as a
      // hanging sack in the middle of the interior frame; washing is wide, and
      // its bottom edge is close to straight because the weight of the cloth
      // pulls it down rather than letting it swing.
      const cw = rng.range(0.78, 1.2);
      const ch = rng.range(0.55, 1.0);
      const yaw = Math.atan2(b.x - a.x, b.z - a.z) + Math.PI / 2;
      const px = THREE.MathUtils.lerp(a.x, b.x, t);
      const py = THREE.MathUtils.lerp(a.y, b.y, t) - Math.sin(t * Math.PI) * 0.2;
      const pz = THREE.MathUtils.lerp(a.z, b.z, t);
      // Draped over the line, not hung off one side of it.
      //
      // A single panel is a card: one face, one silhouette, and the top edge
      // simply stops in space where it meets the cable. The review saw exactly
      // that from 2.7 m — "a large brown quad with no thickness, no folds, no
      // attachment". Two panels back to back with unequal drops give it a crease
      // along the line, a thickness at the top, two faces at different angles to
      // the light, and an asymmetric hem, and the peg says what holds it there.
      for (const face of [1, -1]) {
        // Deeper folds than would be strictly plausible. At this size the fold is
        // the only thing separating cloth from card, and the court is lit softly
        // enough that a shallow one produces no shading at all.
        const drop = face > 0 ? ch : ch * rng.range(0.62, 0.86);
        const cloth = clothPanel(cw, drop, {
          fold: 0.1, folds: 4, hem: 0.035, tile: 1.6, segsX: 7, segsY: 5,
        });
        _q.setFromAxisAngle(_yAxis, yaw + (face > 0 ? 0 : Math.PI));
        _m.compose(
          _p.set(px + Math.cos(yaw) * face * 0.035, py, pz - Math.sin(yaw) * face * 0.035),
          _q, _s,
        );
        level.push('fabricTarp', cloth, _m, { variant: 'linen', material: LINEN_MAT });
        cloth.dispose();
      }
      _m.makeTranslation(px, py + 0.03, pz);
      level.box('wood', 0.03, 0.11, 0.05, _m, 0.3, INSIDE);
    }
  }

}

/**
 * The ceiling as a framed floor rather than a soffit.
 *
 * The slab overhead is the largest single surface in any interior and the one a
 * standing player is closest to, so a bare underside is the most expensive flat
 * plane in the map: from a 1.7 m eye in a 4.3 m room it is a metre and a half
 * away and fills the top of the frame. Downstand beams on a 2.5 m grid with
 * secondary joists between them turn it into a lit-and-shadowed rhythm, and it
 * is what the construction would actually be.
 */
function dressCeiling(level: LevelSystem, spec: BuildingSpec, st: Storey, rng: RNG): void {
  const { cx, cz, w, d } = spec;
  const innerW = w - WALL_T * 2;
  const innerD = d - WALL_T * 2;
  const soffit = st.base + st.h - SLAB_T;
  // Beams span the shorter way, as they must.
  const beamAlongZ = innerD <= innerW;
  const span = beamAlongZ ? innerD : innerW;
  const run = beamAlongZ ? innerW : innerD;
  const bays = Math.max(2, Math.round(run / 2.6));
  const bayW = run / bays;
  const bd = 0.3;

  const court = courtAt(spec);
  for (let i = 1; i < bays; i++) {
    const t = -run / 2 + bayW * i;
    const bx = cx + (beamAlongZ ? t : 0);
    const bz = cz + (beamAlongZ ? 0 : t);
    // A beam that would cross the court or the stair shaft is split either side
    // of it rather than dropped, so the framing still reads all the way to the
    // opening's edge.
    const axisC = beamAlongZ ? cz : cx;
    const acrossC = beamAlongZ ? bx : bz;
    let segs: Array<[number, number]> = [[axisC - span / 2, axisC + span / 2]];
    const openings: SlabHole[] = [];
    if (court) openings.push(court);
    if (hitsWell(spec, cx, cz, spec.w, spec.d)) {
      const s = stairWell(spec);
      openings.push({ x: s.x, z: s.z, w: s.w, d: s.d });
    }
    for (const o of openings) {
      const acrossHalf = (beamAlongZ ? o.w : o.d) / 2;
      const alongHalf = (beamAlongZ ? o.d : o.w) / 2;
      const acrossCentre = beamAlongZ ? o.x : o.z;
      const alongCentre = beamAlongZ ? o.z : o.x;
      if (Math.abs(acrossC - acrossCentre) >= acrossHalf + 0.12) continue;
      const cut: Array<[number, number]> = [];
      for (const [a, b] of segs) {
        if (alongCentre + alongHalf <= a || alongCentre - alongHalf >= b) { cut.push([a, b]); continue; }
        if (alongCentre - alongHalf > a) cut.push([a, alongCentre - alongHalf]);
        if (alongCentre + alongHalf < b) cut.push([alongCentre + alongHalf, b]);
      }
      segs = cut;
    }
    for (const [a, b] of segs) {
      if (b - a < 0.4) continue;
      const mid = (a + b) / 2;
      _m.makeTranslation(
        beamAlongZ ? bx : mid, soffit - bd / 2, beamAlongZ ? mid : bz,
      );
      level.box(
        'concrete',
        beamAlongZ ? 0.24 : b - a, bd, beamAlongZ ? b - a : 0.24, _m, 2.4, INSIDE,
      );
    }
    // A column under every other beam, since nothing spans 17 m unsupported.
    if (span > 7.5 && i % 2 === 1) {
      const kx = cx + (beamAlongZ ? t : rng.range(-0.15, 0.15) * span);
      const kz = cz + (beamAlongZ ? rng.range(-0.15, 0.15) * span : t);
      if (!inCourt(spec, kx, kz, 0.5) && !hitsWell(spec, kx, kz, 0.4, 0.4)) {
        _m.makeTranslation(kx, st.base + (soffit - bd - st.base) / 2, kz);
        level.box('concrete', 0.36, soffit - bd - st.base, 0.36, _m, 2.0, INSIDE);
        _m.makeTranslation(kx, soffit - bd - 0.12, kz);
        level.box('concrete', 0.56, 0.24, 0.56, _m, 1.4, INSIDE);
      }
    }
  }

  // Secondary joists are the single biggest line in the map's triangle budget —
  // a floor plate's worth of them is over 1500 triangles and every storey of
  // every building has one. They only read from directly underneath, so the
  // outer blocks and the upper storeys, which a player reaches rarely and looks
  // up in less often, get the beams and the plain soffit only.
  if (spec.detail === 'lite' || st.index > 1) return;

  // Spanning bay to bay across the beams. The overlap test is against the
  // joist's own footprint rather than a circle: a scalar pad big enough to keep
  // a 2 m joist out of the court also deletes every joist within 2 m of it in
  // the other axis, which is precisely the ceiling in front of the camera
  // looking into the court.
  const pitch = 0.95;
  const rows = Math.max(2, Math.round(span / pitch));
  const jLen = bayW - 0.26;
  for (let b = 0; b < bays; b++) {
    const bc = -run / 2 + bayW * (b + 0.5);
    for (let r = 0; r < rows; r++) {
      const jt = -span / 2 + (span * (r + 0.5)) / rows;
      const jx = cx + (beamAlongZ ? bc : jt);
      const jz = cz + (beamAlongZ ? jt : bc);
      const hx = beamAlongZ ? jLen / 2 : 0.06;
      const hz = beamAlongZ ? 0.06 : jLen / 2;
      if (hitsCourt(spec, jx, jz, hx, hz)) continue;
      if (hitsWell(spec, jx, jz, hx, hz)) continue;
      _m.makeTranslation(jx, soffit - 0.08, jz);
      level.box('wood', hx * 2, 0.16, hz * 2, _m, 1.4, INSIDE);
      // Bearing pad where the joist lands on the beam. 30 mm of packing under
      // the end of every joist, which is what is actually there and which puts a
      // short cross-grain shadow at both ends of each one.
      for (const e of [-1, 1] as const) {
        const ex = jx + (beamAlongZ ? (e * jLen) / 2 : 0);
        const ez = jz + (beamAlongZ ? 0 : (e * jLen) / 2);
        _m.makeTranslation(ex, soffit - 0.175, ez);
        level.box(
          'wood', beamAlongZ ? 0.13 : 0.17, 0.035, beamAlongZ ? 0.17 : 0.13, _m, 0.6, INSIDE,
        );
      }
    }
  }

  ceilingServices(level, spec, st, soffit, beamAlongZ, run, span, bays, bayW, rng);
}

/**
 * What hangs off a ceiling: boarding, conduit and a light.
 *
 * The overhead slab is a metre and a half from a standing player's eye and fills
 * the top third of every interior frame, and after the beams and joists went in
 * it was still a rhythm of identical timbers on a flat grey field. What is
 * missing is everything that was *fixed* to it afterwards — a run of surface
 * conduit with its saddles and junction box, a pendant on a flex, and the boarded
 * patches with daylight showing between the planks where the roof above has gone.
 * All of it is small, all of it is off-grid, and it is the only thing up there
 * that is not on a 950 mm module.
 */
function ceilingServices(
  level: LevelSystem,
  spec: BuildingSpec,
  st: Storey,
  soffit: number,
  beamAlongZ: boolean,
  run: number,
  span: number,
  bays: number,
  bayW: number,
  rng: RNG,
): void {
  const { cx, cz } = spec;
  const free = (x: number, z: number, pad = 0.5): boolean =>
    !inCourt(spec, x, z, pad) && !hitsWell(spec, x, z, pad, pad);

  // ---- surface conduit, run along the side of a beam and down a wall ----
  {
    const bi = 1 + rng.int(0, Math.max(0, bays - 2));
    const t = -run / 2 + bayW * bi;
    const off = 0.19;
    const segs: Array<[number, number]> = [];
    // Broken where it would cross the court, like the beams themselves.
    let a = -span / 2 + 0.4;
    const step = span / 6;
    for (let k = 0; k < 6; k++) {
      const b = a + step;
      const mid = (a + b) / 2;
      const mx = cx + (beamAlongZ ? t + off : mid);
      const mz = cz + (beamAlongZ ? mid : t + off);
      if (free(mx, mz, 0.35)) segs.push([a, b]);
      a = b;
    }
    for (const [s0, s1] of segs) {
      const mid = (s0 + s1) / 2;
      const px = cx + (beamAlongZ ? t + off : mid);
      const pz = cz + (beamAlongZ ? mid : t + off);
      const pipe = cyl(0.017, 0.017, s1 - s0, 5, 0.4);
      _q.setFromAxisAngle(beamAlongZ ? _xAxis : _zAxis, Math.PI / 2);
      _m.compose(_p.set(px, soffit - 0.055, pz), _q, _s);
      level.push('gunmetal', pipe, _m, INSIDE);
      pipe.dispose();
      // Saddle clips. Two per length, which is what makes it read as fixed to
      // the ceiling rather than floating under it.
      for (const u of [0.25, 0.75]) {
        const sx = cx + (beamAlongZ ? t + off : s0 + (s1 - s0) * u);
        const sz2 = cz + (beamAlongZ ? s0 + (s1 - s0) * u : t + off);
        _m.makeTranslation(sx, soffit - 0.03, sz2);
        level.box('gunmetal', 0.05, 0.05, 0.05, _m, 0.3, INSIDE);
      }
    }
    if (segs.length > 0) {
      const [j0, j1] = segs[Math.floor(segs.length / 2)];
      const jm = (j0 + j1) / 2;
      const jx = cx + (beamAlongZ ? t + off : jm);
      const jz = cz + (beamAlongZ ? jm : t + off);
      _m.makeTranslation(jx, soffit - 0.055, jz);
      level.box('gunmetal', 0.13, 0.07, 0.13, _m, 0.4, INSIDE);
      // The drop to a switch, which is what tells you which way is down.
      const drop = rng.range(0.6, 1.4);
      const dp = cyl(0.015, 0.015, drop, 5, 0.4);
      _m.makeTranslation(jx + (beamAlongZ ? 0.08 : 0), soffit - 0.09 - drop / 2, jz + (beamAlongZ ? 0 : 0.08));
      level.push('gunmetal', dp, _m, INSIDE);
      dp.dispose();
    }
  }

  // ---- pendant light ----
  {
    const px = cx + rng.range(-0.2, 0.2) * run * (beamAlongZ ? 1 : 0) + rng.range(-0.6, 0.6);
    const pz = cz + rng.range(-0.2, 0.2) * run * (beamAlongZ ? 0 : 1) + rng.range(-0.6, 0.6);
    if (free(px, pz, 0.7)) {
      const flex = rng.range(0.3, 0.75);
      const cord = cyl(0.008, 0.008, flex, 4, 0.3);
      _m.makeTranslation(px, soffit - 0.16 - flex / 2, pz);
      level.push('polymerBlack', cord, _m, INSIDE);
      cord.dispose();
      _m.makeTranslation(px, soffit - 0.14, pz);
      level.box('gunmetal', 0.07, 0.05, 0.07, _m, 0.3, INSIDE);
      // Pressed enamel shade, and a pale disc in the mouth of it so the fitting
      // reads as a light rather than as a cone hanging on a string.
      const shade = cyl(0.19, 0.045, 0.13, 12, 0.5);
      _m.makeTranslation(px, soffit - 0.17 - flex - 0.065, pz);
      level.push('paintedMetalGreen', shade, _m, INSIDE);
      shade.dispose();
      const bulb = cyl(0.055, 0.04, 0.09, 8, 0.3);
      _m.makeTranslation(px, soffit - 0.17 - flex - 0.13, pz);
      level.push(GLASS_KEY, bulb, _m, ROOFLIGHT);
      bulb.dispose();
    }
  }

  // ---- a boarded patch with light showing between the planks ----
  //
  // Only where the structure above has already failed, because daylight through
  // a ceiling has to come from somewhere. Where it does apply it is the brightest
  // thing in the upper third of the frame and it gives the whole ceiling a scale.
  const broken = (spec.damage ?? 0) > 0.25 || st.index === spec.floors - 1;
  if (!broken) return;
  const bi = rng.int(0, Math.max(0, bays - 1));
  const bc = -run / 2 + bayW * (bi + 0.5);
  const boards = Math.max(4, Math.round((bayW - 0.3) / 0.24));
  const plen = Math.min(span - 0.8, rng.range(1.8, 3.2));
  const pmid = rng.range(-0.22, 0.22) * span;
  for (let b = 0; b < boards; b++) {
    const bt = bc - (bayW - 0.3) / 2 + ((bayW - 0.3) * (b + 0.5)) / boards;
    const bx = cx + (beamAlongZ ? bt : pmid);
    const bz = cz + (beamAlongZ ? pmid : bt);
    if (!free(bx, bz, 0.3)) continue;
    const gap = rng.next() < 0.24;
    const across = gap ? 0.09 : 0.2;
    const pw = beamAlongZ ? across : plen;
    const pd = beamAlongZ ? plen : across;
    _m.makeTranslation(bx, soffit - (gap ? 0.005 : 0.195), bz);
    // The gaps are the point: a sliver of sky between two planks.
    if (gap) level.box(GLASS_KEY, pw, 0.02, pd, _m, 0.6, ROOFLIGHT);
    else level.box('wood', pw, 0.03, pd, _m, 0.9, INSIDE);
  }
}

/**
 * The band between 1.8 m and the ceiling.
 *
 * Furniture all lives below 1 m, so a standing player looking across a room
 * sees mostly empty wall — and in a 4.3 m shop storey that is over half the
 * frame. This is the layer that fixes it: things hung, mounted and stacked at
 * head height and above, plus a mezzanine to give the volume a second level.
 */
function dressHighLevel(level: LevelSystem, spec: BuildingSpec, st: Storey, rng: RNG): void {
  const { cx, cz, w, d } = spec;
  const innerW = w - WALL_T * 2;
  const innerD = d - WALL_T * 2;
  const y = st.base;
  const ceil = st.h - SLAB_T;
  const ruin = spec.interior === 'ruin';

  // ---- surface-mounted conduit, junction boxes and a board ----
  for (const f of facesOf(cx, cz, w, d)) {
    if (rng.next() < 0.4) continue;
    const runY = y + ceil - rng.range(0.35, 0.7);
    const len = f.len - WALL_T * 2 - rng.range(0.5, 2.5);
    fBox(level, 'corrugated', f, rng.range(-0.5, 0.5), runY, -WALL_T - 0.04, len, 0.045, 0.045, 0.5, INSIDE);
    // Drops to a switch or a socket.
    const drops = rng.int(1, 2);
    for (let i = 0; i < drops; i++) {
      const off = rng.range(-len / 2, len / 2);
      const dropTo = y + rng.range(1.3, 1.9);
      fBox(level, 'corrugated', f, off, (runY + dropTo) / 2, -WALL_T - 0.04, 0.04, runY - dropTo, 0.04, 0.5, INSIDE);
      fBox(level, 'polymerBlack', f, off, dropTo - 0.06, -WALL_T - 0.06, 0.16, 0.2, 0.07, 0.4, INSIDE);
    }
  }
  // Distribution board, high on one wall.
  {
    const f = facesOf(cx, cz, w, d)[rng.int(0, 3)];
    fBox(level, 'paintedMetalGreen', f, rng.range(-0.3, 0.3) * f.len, y + 2.05, -WALL_T - 0.09, 0.42, 0.56, 0.13, 0.9, INSIDE);
  }

  // ---- hanging goods, slung from the ceiling close in to a wall ----
  // Kept within a metre of a wall on purpose. A 2 cm cord is sub-pixel at any
  // useful range, so an object hung in open floor has nothing visibly holding it
  // up and reads as levitating; hung against a wall the wall reads as its
  // support even though it is not, and the shadow it throws lands somewhere the
  // eye can see it. It is also where a shopkeeper would actually hang things.
  const hangs = ruin ? rng.int(0, 2) : rng.int(3, 7);
  for (let i = 0; i < hangs; i++) {
    const f = facesOf(cx, cz, w, d)[rng.int(0, 3)];
    const inward = WALL_T + rng.range(0.35, 0.95);
    const along = rng.range(-0.38, 0.38) * f.len;
    const px = f.axis === 'z' ? f.tan + along : f.outer - f.sign * inward;
    const pz = f.axis === 'z' ? f.outer - f.sign * inward : f.tan + along;
    if (inCourt(spec, px, pz, 0.6)) continue;
    if (hitsWell(spec, px, pz, 0.4, 0.4)) continue;
    const dropLen = rng.range(0.3, 0.9);
    const cord = cyl(0.012, 0.012, dropLen, 4, 0.4);
    _m.makeTranslation(px, y + ceil - dropLen / 2 - 0.02, pz);
    level.push('polymerBlack', cord, _m);
    cord.dispose();
    const r = rng.next();
    const yb = y + ceil - dropLen;
    if (r < 0.34) {
      // A bundle in a net.
      const bag = bagGeometry(rng.range(0.16, 0.26), rng.range(0.12, 0.2), rng.range(0.16, 0.26));
      _m.makeTranslation(px, yb - 0.16, pz);
      level.push('fabricSandbag', bag, _m);
      bag.dispose();
    } else if (r < 0.6) {
      // Shaded pendant lamp.
      const shade = cyl(0.05, 0.19, 0.17, 8, 0.5);
      _m.makeTranslation(px, yb - 0.09, pz);
      level.push('paintedMetalGreen', shade, _m);
      shade.dispose();
    } else if (r < 0.82) {
      // Coil of hose or rope on a hook.
      const coil = ring(rng.range(0.16, 0.24), 0.035, 10, 4, 0.5);
      _q.setFromAxisAngle(_xAxis, rng.range(-0.3, 0.3));
      _m.compose(_p.set(px, yb - 0.2, pz), _q, _s);
      level.push('polymerBlack', coil, _m);
      coil.dispose();
    } else {
      // Bolt of cloth hung over a rail.
      const cloth = clothPanel(rng.range(0.4, 0.7), rng.range(0.6, 1.2), {
        fold: 0.06, folds: 3, hem: 0.06, tile: 1.6, segsX: 5, segsY: 4,
      });
      _q.setFromAxisAngle(_yAxis, rng.range(0, 3.1));
      _m.compose(_p.set(px, yb, pz), _q, _s);
      level.push('fabricTarp', cloth, _m);
      cloth.dispose();
    }
  }

  // ---- high shelf on brackets, carrying stock ----
  if (!ruin && rng.next() < 0.75) {
    const f = facesOf(cx, cz, w, d)[rng.int(0, 3)];
    const shelfY = y + rng.range(1.95, 2.35);
    const len = Math.min(f.len - 1.2, rng.range(2.4, 4.4));
    const depth = 0.42;
    fBox(level, 'wood', f, rng.range(-0.25, 0.25) * f.len, shelfY, -WALL_T - depth / 2, len, 0.05, depth, 1.6, INSIDE);
    const brackets = Math.max(2, Math.round(len / 1.2));
    for (let i = 0; i <= brackets; i++) {
      const off = -len / 2 + (len * i) / brackets;
      fPrism(level, 'corrugated', f, off, shelfY - 0.32,
        [[-depth, 0.32], [-0.04, 0.32], [-0.04, 0], [-depth, 0.32]], 0.04, 0.8);
    }
    // Stock along it.
    const n = Math.max(2, Math.round(len / 0.55));
    for (let i = 0; i < n; i++) {
      if (rng.next() < 0.25) continue;
      const bw = rng.range(0.2, 0.42);
      const bh = rng.range(0.2, 0.4);
      fBox(level, rng.next() < 0.5 ? 'woodCrate' : 'paintedMetalTan', f,
        -len / 2 + (len * (i + 0.5)) / n, shelfY + 0.03 + bh / 2, -WALL_T - depth / 2 + rng.range(-0.05, 0.05),
        bw, bh, rng.range(0.2, 0.36), 1.0, INSIDE);
    }
  }

  // ---- mezzanine: the second level a tall shop always grows ----
  if (st.index === 0 && st.h > 3.9 && !ruin && !spec.courtyard) {
    const alongX = innerW > innerD;
    const depth = Math.min(alongX ? innerD : innerW, 4.6);
    const width = (alongX ? innerW : innerD) * rng.range(0.34, 0.46);
    const platY = y + 2.35;
    // Against whichever wall the stair shaft is not.
    let sideSign = rng.next() < 0.5 ? -1 : 1;
    const at = (s: number) => (alongX
      ? [cx + s * (innerW / 2 - width / 2), cz] as const
      : [cx, cz + s * (innerD / 2 - width / 2)] as const);
    if (hitsWell(spec, ...at(sideSign), width / 2, depth / 2)) sideSign = -sideSign;
    const [px, pz] = at(sideSign);
    const pw = alongX ? width : depth;
    const pd = alongX ? depth : width;

    _m.makeTranslation(px, platY, pz);
    level.box('wood', pw, 0.1, pd, _m, 2.4, INSIDE);
    // Joists under it, and posts down to the floor.
    const joists = Math.max(3, Math.round((alongX ? pd : pw) / 1.1));
    for (let i = 0; i < joists; i++) {
      const t = -(alongX ? pd : pw) / 2 + ((alongX ? pd : pw) * (i + 0.5)) / joists;
      _m.makeTranslation(alongX ? px : px + t, platY - 0.13, alongX ? pz + t : pz);
      level.box('wood', alongX ? pw : 0.12, 0.16, alongX ? 0.12 : pd, _m, 1.6, INSIDE);
    }
    for (const sa of [-1, 1]) {
      const postX = alongX ? px - sideSign * (pw / 2 - 0.1) : px + sa * (pw / 2 - 0.1);
      const postZ = alongX ? pz + sa * (pd / 2 - 0.1) : pz - sideSign * (pd / 2 - 0.1);
      _m.makeTranslation(postX, y + (platY - 0.2 - y) / 2, postZ);
      level.box('wood', 0.14, platY - 0.2 - y, 0.14, _m, 1.6, INSIDE);
    }
    // Edge rail, so the drop reads.
    const railLen = alongX ? pd : pw;
    const edgeX = alongX ? px - sideSign * pw / 2 : px;
    const edgeZ = alongX ? pz : pz - sideSign * pd / 2;
    for (const ry of [0.42, 0.86]) {
      _m.makeTranslation(edgeX, platY + ry, edgeZ);
      level.box('corrugated', alongX ? 0.05 : railLen, 0.05, alongX ? railLen : 0.05, _m, 0.6, INSIDE);
    }
    const uprights = Math.max(3, Math.round(railLen / 1.1));
    for (let i = 0; i <= uprights; i++) {
      const t = -railLen / 2 + (railLen * i) / uprights;
      _m.makeTranslation(alongX ? edgeX : edgeX + t, platY + 0.48, alongX ? edgeZ + t : edgeZ);
      level.box('corrugated', 0.05, 0.96, 0.05, _m, 0.6, INSIDE);
    }
    // Stock stacked on the deck, and a ladder up to it.
    for (let i = 0; i < rng.int(3, 6); i++) {
      const bs = rng.range(0.35, 0.6);
      _m.makeTranslation(
        px + rng.range(-pw / 2 + 0.4, pw / 2 - 0.4),
        platY + 0.05 + bs / 2,
        pz + rng.range(-pd / 2 + 0.4, pd / 2 - 0.4),
      );
      level.box(rng.next() < 0.6 ? 'woodCrate' : 'fabricSandbag', bs, bs, bs * 0.85, _m, 1.1, INSIDE);
    }
    const ladX = alongX ? edgeX - sideSign * 0.24 : edgeX + railLen * 0.3;
    const ladZ = alongX ? edgeZ + railLen * 0.3 : edgeZ - sideSign * 0.24;
    for (const sa of [-1, 1]) {
      _m.makeTranslation(
        ladX + (alongX ? 0 : sa * 0.22),
        y + (platY + 0.1 - y) / 2,
        ladZ + (alongX ? sa * 0.22 : 0),
      );
      level.box('wood', 0.06, platY + 0.1 - y, 0.06, _m, 0.7, INSIDE);
    }
    const rungs = Math.floor((platY - y) / 0.3);
    for (let i = 1; i <= rungs; i++) {
      _m.makeTranslation(ladX, y + i * 0.3, ladZ);
      level.box('wood', alongX ? 0.05 : 0.44, 0.04, alongX ? 0.44 : 0.05, _m, 0.5, INSIDE);
    }
  }

  // ---- wall niches: recessed shelves, the local way of storing anything ----
  if (rng.next() < 0.7) {
    const f = facesOf(cx, cz, w, d)[rng.int(0, 3)];
    const n = rng.int(2, 3);
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * 1.25 + rng.range(-0.15, 0.15) * f.len * 0.2;
      const nw = 0.6;
      const nh = 0.85;
      const ny = y + rng.range(1.5, 2.2);
      // Reveal built as a shallow frame, with a dark back.
      fBox(level, 'plasterInterior', f, off, ny, -WALL_T - 0.005, nw + 0.14, 0.07, 0.02, 1.2, INSIDE);
      for (const s of [-1, 1]) {
        fBox(level, 'plasterInterior', f, off + s * (nw / 2 + 0.035), ny + nh / 2, -WALL_T - 0.005, 0.07, nh, 0.02, 1.2, INSIDE);
      }
      fBox(level, 'plasterInterior', f, off, ny + nh + 0.035, -WALL_T - 0.005, nw + 0.14, 0.07, 0.02, 1.2, INSIDE);
      fBox(level, 'plasterInterior', f, off, ny + nh / 2, -WALL_T - 0.16, nw, nh, 0.06, 1.4, INSIDE);
      // A shelf across it and something on it.
      fBox(level, 'wood', f, off, ny + nh * 0.5, -WALL_T - 0.1, nw, 0.04, 0.16, 0.9, INSIDE);
      if (rng.next() < 0.7) {
        fBox(level, 'paintedMetalTan', f, off + rng.range(-0.15, 0.15), ny + nh * 0.5 + 0.13, -WALL_T - 0.1,
          0.14, 0.22, 0.14, 0.7, INSIDE);
      }
    }
  }
}

/**
 * Every flight in the shaft, ground floor to roof deck.
 *
 * Each storey gets a dogleg: up one side of the well to a half-landing at the
 * blind end, turn, and back up the other side to arrive at the floor above on
 * the open edge of the shaft. The handedness alternates per storey, which is
 * both how a dogleg stacks and what guarantees headroom — the flight above a
 * given flight is always the *return* of the pair, so the clear height between
 * them never drops below one storey.
 *
 * The last flight continues past the top slab and lands on the roof deck inside
 * the head-house, so the bulkhead door leads somewhere.
 */
function buildStairCore(
  level: LevelSystem,
  spec: BuildingSpec,
  storeys: Storey[],
  well: StairWell,
  topY: number,
  wallKey: MaterialKey,
  tile: number,
): void {
  // Walking surface of each level: screed on the ground, slab finish above,
  // and the roof deck at the top.
  const levels: number[] = [0.3];
  for (let i = 1; i < storeys.length; i++) levels.push(storeys[i].base + 0.06);
  levels.push(topY + 0.12);

  const zHi = well.z + well.d / 2;
  const zLo = well.z - well.d / 2;

  for (let i = 0; i + 1 < levels.length; i++) {
    // A shelled building loses its top flight, which is a reason to use the
    // external stair and a reason for the debris on the floor below.
    const side = i % 2 === 0 ? -1 : 1;
    buildDogleg(level, well, levels[i], levels[i + 1], side, zHi, zLo);
  }

  // Guard wall along the open flank of the shaft on each upper level, and a
  // newel pier at the corner: without them the shaft is an unmarked hole.
  for (let i = 1; i < levels.length - 1; i++) {
    _m.makeTranslation(well.x, levels[i] + 0.5, zLo + 0.09);
    level.box(wallKey, well.w, 1.0, 0.18, _m, tile, INSIDE);
  }
  void spec;
}

/** One storey's worth of stair: flight, half-landing, return flight. */
function buildDogleg(
  level: LevelSystem,
  well: StairWell,
  yFrom: number,
  yTo: number,
  side: number,
  zHi: number,
  zLo: number,
): void {
  const rise = yTo - yFrom;
  if (rise < 0.4) return;
  // Even count so the two flights are equal and the return lands flush with
  // the edge of the shaft rather than a step short of it.
  const half = Math.min(Math.max(2, Math.round(rise / 2 / RISER)), Math.round(well.run / STEP_D));
  const stepH = rise / (half * 2);
  const run = half * STEP_D;
  const w = well.flightW;
  const cxA = well.x + side * (w / 2 + 0.05);
  const cxB = well.x - side * (w / 2 + 0.05);

  // Flight 1: up from the arrival edge towards the blind end.
  for (let i = 0; i < half; i++) {
    _m.makeTranslation(cxA, yFrom + stepH * (i + 0.5), zHi - STEP_D * (i + 0.5));
    level.box('concrete', w, stepH, STEP_D, _m, 2.0, INSIDE);
  }
  // Half-landing across the blind end.
  const landD = zHi - run - zLo;
  if (landD > 0.3) {
    _m.makeTranslation(well.x, yFrom + rise / 2 - 0.09, zLo + landD / 2);
    level.box('concrete', well.w, 0.18, landD, _m, 2.5, INSIDE);
  }
  // Flight 2: back up the other side to the floor above.
  for (let i = 0; i < half; i++) {
    _m.makeTranslation(cxB, yFrom + rise / 2 + stepH * (i + 0.5), zHi - run + STEP_D * (i + 0.5));
    level.box('concrete', w, stepH, STEP_D, _m, 2.0, INSIDE);
  }

  // Raking waist under each flight, so the soffit is a plane and not a comb.
  const pitch = Math.atan2(rise / 2, run);
  const waistLen = Math.hypot(run, rise / 2);
  for (const [cxF, dir, y0] of [[cxA, -1, yFrom], [cxB, 1, yFrom + rise / 2]] as Array<[number, number, number]>) {
    const geo = boxUV(w, 0.16, waistLen, 2.5);
    _q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -dir * pitch);
    _m.compose(_p.set(cxF, y0 + rise / 4 - 0.11, zHi - run / 2), _q, _s);
    level.push('concrete', geo, _m, INSIDE);
    geo.dispose();
  }

  // Pipe balustrade up the open side of each flight.
  for (const [cxF, y0, dir] of [[cxA, yFrom, -1], [cxB, yFrom + rise / 2, 1]] as Array<[number, number, number]>) {
    const xr = cxF + dir * side * (w / 2 - 0.04);
    for (let i = 0; i <= 3; i++) {
      const t = i / 3;
      const z = dir < 0 ? zHi - run * t : zHi - run + run * t;
      _m.makeTranslation(xr, y0 + (rise / 2) * t + 0.5, z);
      level.box('corrugated', 0.05, 1.0, 0.05, _m, 0.5, INSIDE);
    }
  }
}

/**
 * Roof access as a two-flight dogleg with a half-landing.
 *
 * A single straight flight to a roof 7.5 m up runs nearly 12 m along the wall,
 * which is longer than most of these facades. Turning it back on itself halves
 * the plan length at the cost of another 1.2 m of projection, which is what
 * actually gets built.
 */
interface ExtStairPlan {
  /** Offset along the facade where the top flight arrives at deck level. */
  arriveOff: number;
  /** Offset along the facade of the turn, at the far end of the flights. */
  turnOff: number;
  runLen: number;
  stepD: number;
  width: number;
  /** Outward distance of the upper flight and of the lower flight. */
  nearOut: number;
  farOut: number;
  mid: number;
}

/**
 * The stair is laid out before anything is emitted because the roof needs to
 * know where it lands.
 *
 * The arrival goes at the end of the facade away from the head-house, which sits
 * in the corner the well is in — the far corner along the facade in plan.
 */
function externalStairPlan(f: FaceRef, deckY: number): ExtStairPlan {
  const stepD = 0.29;
  const width = 1.15;
  const near = 0.5;
  const mid = deckY * 0.52;
  const runLen = Math.max(2, Math.round(mid / RISER)) * stepD;
  // The well is at high x and low z, so the head-house is at a high offset on
  // the north and south faces and a low one on the east and west.
  const dir = f.axis === 'z' ? -1 : 1;
  const arriveOff = THREE.MathUtils.clamp(
    dir * (f.len / 2 - 1.6) * 0.62, -f.len / 2 + 1.0, f.len / 2 - 1.0 - runLen,
  );
  return {
    arriveOff,
    turnOff: arriveOff + runLen,
    runLen,
    stepD,
    width,
    nearOut: near + width / 2,
    farOut: near + width * 1.5 + 0.1,
    mid,
  };
}

/**
 * Roof access as a two-flight dogleg with a half-landing.
 *
 * A single straight flight to a roof 7.5 m up runs nearly 12 m along the wall,
 * which is longer than most of these facades. Turning it back on itself halves
 * the plan length at the cost of another 1.2 m of projection, which is what
 * actually gets built.
 *
 * The upper flight is the one against the wall, so its head can bridge straight
 * in over the parapet line onto the deck. Running the flights the other way
 * round leaves the stair head stranded 2.4 m out from the building at roof
 * level, with a 7 m drop between it and the roof it is supposed to serve.
 */
function buildExternalStair(level: LevelSystem, f: FaceRef, p: ExtStairPlan, deckY: number): void {
  const { width, stepD, runLen, mid, nearOut, farOut } = p;
  const flights: Array<[number, number, number, number]> = [
    // [yFrom, yTo, out of flight centre, direction along the facade]
    [0, mid, farOut, 1],
    [mid, deckY, nearOut, -1],
  ];

  for (const [yFrom, yTo, out, dir] of flights) {
    const steps = Math.max(2, Math.round((yTo - yFrom) / RISER));
    const stepH = (yTo - yFrom) / steps;
    const start = dir > 0 ? p.arriveOff : p.turnOff;
    for (let i = 0; i < steps; i++) {
      const o = start + dir * (i + 0.5) * stepD;
      fBox(level, 'concrete', f, o, yFrom + stepH * (i + 0.5), out, stepD, stepH, width, 2.0);
    }
    // Spandrel wall closing the outer edge of the flight.
    const cOff = start + dir * (steps * stepD) / 2;
    fBox(level, 'concrete', f, cOff, (yFrom + yTo) / 2, out + width / 2 + 0.07,
      steps * stepD, yTo - yFrom, 0.14, 3.0);
    // Pipe handrail following the pitch, in three posts.
    for (let i = 0; i <= 3; i++) {
      const t = i / 3;
      fBox(level, 'corrugated', f, start + dir * runLen * t, yFrom + (yTo - yFrom) * t + 0.52,
        out + width / 2 + 0.02, 0.05, 1.0, 0.05, 0.5);
    }
  }

  // Half-landing at the turn, spanning both flights.
  const landOut = (nearOut + farOut) / 2;
  fBox(level, 'concrete', f, p.turnOff + 0.62, mid - 0.1, landOut, 1.24, 0.2, farOut - nearOut + width, 2.0);
  fBox(level, 'plaster', f, p.turnOff + 0.62, mid + 0.45, farOut + width / 2 + 0.07, 1.24, 1.1, 0.14, 2.2);

  // Arrival bridge: deck level, from the head of the flight in over the
  // parapet line. `buildRoof` leaves the parapet open across this span.
  const bridgeIn = -0.55;
  const bridgeOut = nearOut + width / 2;
  fBox(level, 'concrete', f, p.arriveOff - 0.66, deckY - 0.1, (bridgeIn + bridgeOut) / 2,
    1.28, 0.2, bridgeOut - bridgeIn, 2.0);
  // Cheek walls either side of the opening, which is what stops the gap in the
  // parapet reading as a bite out of it.
  for (const s of [-1, 1]) {
    fBox(level, 'plaster', f, p.arriveOff - 0.66 + s * 0.71, deckY + 0.42, (bridgeIn + bridgeOut) / 2,
      0.14, 0.84, bridgeOut - bridgeIn, 2.2);
  }
}

// ----------------------------------------------------------------- helpers ---

function boxUV(w: number, h: number, d: number, tile: number): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(w, h, d);
  scaleUV(geo, w, h, d, tile);
  return geo;
}

function pushRot(
  level: LevelSystem,
  key: MaterialKey,
  geo: THREE.BufferGeometry,
  x: number,
  y: number,
  z: number,
  rot: number,
): void {
  _q.setFromAxisAngle(_yAxis, rot);
  _m.compose(_p.set(x, y, z), _q, _s);
  level.push(key, geo, _m, INSIDE);
  geo.dispose();
}

/** Same convention as `LevelSystem.box`: UVs measured in tiles, not [0,1]. */
export function scaleUV(geo: THREE.BufferGeometry, w: number, h: number, d: number, tile: number): void {
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

function planarSphereUV(geo: THREE.BufferGeometry, tile: number): void {
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, pos.getX(i) / tile, pos.getZ(i) / tile);
  }
  uv.needsUpdate = true;
}
