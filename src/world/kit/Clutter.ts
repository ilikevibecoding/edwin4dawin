import * as THREE from 'three';
import type { MaterialId } from '../../core/Contracts';
import { TAU } from '../../core/MathUtils';
import { graffiti, laundryLine, satelliteDish, wallAc, wallPipe } from './Details';
import { saggingCloth } from './Props';
import {
  METRICS,
  type Rect,
  type Sink,
  boxGeometry,
  cachedGeometry,
  catenaryGeometry,
  cloneGeometry,
  cylinderGeometry,
  latheGeometry,
  makeDoubleSided,
  mergeParts,
  placed,
  planeGeometry,
  ribbonGeometry,
  skywardNormals,
  snap,
  transform,
} from './Kit';

/**
 * Clutter: the layer that decides whether the town is inhabited or dressed.
 *
 * A street with crates on it reads as a level. A street reads as a place when it
 * carries the residue of people using it — conduit somebody ran badly, a drift of
 * sand nobody has swept, the bucket left where it was put down, a patch in the
 * road, litter in the gutter. That is what this module is: hundreds of small
 * things, and rules about where they go.
 *
 * The rules matter more than the count. Nothing here is scattered uniformly:
 *
 * - Loose matter banks against vertical surfaces and packs into inside corners,
 *   because that is where wind and feet put it. Density along a wall rises
 *   towards both ends.
 * - Nothing is axis-aligned. Everything takes a random yaw, a small pitch and
 *   roll, and sinks a few millimetres into the ground.
 * - Dressing follows what the building is for. A workshop wall gets a pipe
 *   bundle and a drum; a shopfront gets produce and a plastic chair.
 * - Wear concentrates on the lines people and vehicles actually travel.
 *
 * Cost is controlled three ways. Anything flat is a quad added through
 * `addStatic`, which merges into a batch the district already draws, so it costs
 * triangles and no draw calls at all. Anything tiny and repeated map-wide is
 * `clutter`, which pools every copy into one instanced draw and collapses it in
 * the vertex shader past twenty-five metres. Anything larger is an ordinary
 * chunked prop on a material the district already uses, which the builder folds
 * into an existing merged batch until there are enough copies to be worth
 * instancing. None of it casts a shadow.
 */

/** Metres a flat overlay is lifted off whatever it lies on. */
const FILM_LIFT = 0.014;

/**
 * Ragged disc in the XY plane, facing +Z, UV-projected in world metres.
 *
 * Every overlay in this module used to be a rectangle. At thirty metres that is
 * fine; at two it is unmistakably a decal card stuck on a wall, because nothing
 * that stains a building has four straight edges and square corners. A ten-point
 * rim with a wobbled radius costs eight more triangles and removes the tell.
 * Four variants, so patches near each other are not the same silhouette.
 */
function blotchGeometry(width: number, height: number, tile: number, variant: number): THREE.BufferGeometry {
  const rim = 10;
  return cachedGeometry(
    `blotch|${width.toFixed(2)}|${height.toFixed(2)}|${tile.toFixed(2)}|${variant}`,
    () => {
      const positions: number[] = [0, 0, 0];
      const uvs: number[] = [0, 0];
      const indices: number[] = [];
      for (let i = 0; i < rim; i++) {
        const a = (i / rim) * TAU;
        const wobble = Math.sin((i + 1) * 2.399 + variant * 1.77) * 0.5 + Math.sin((i + 1) * 5.13) * 0.22;
        const r = 0.62 + 0.34 * (wobble * 0.5 + 0.5);
        const x = Math.cos(a) * (width / 2) * r;
        const y = Math.sin(a) * (height / 2) * r;
        positions.push(x, y, 0);
        uvs.push(x / tile, y / tile);
        indices.push(0, 1 + i, 1 + ((i + 1) % rim));
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      return geometry;
    },
  );
}

/**
 * Tapering vertical streak hanging from its own top edge, facing +Z.
 *
 * A blotch cannot stand in for a run of dirty water. An ellipse pinches in at
 * the top, so the stain floats clear of the sill that is supposedly shedding on
 * to it, and three of them side by side read as holes punched in the brick
 * rather than weathering. This one is widest where it starts, wanders as it
 * falls and runs out to nothing.
 */
function streakGeometry(width: number, height: number, tile: number, variant: number): THREE.BufferGeometry {
  const steps = 5;
  return cachedGeometry(
    `streak|${width.toFixed(2)}|${height.toFixed(2)}|${tile.toFixed(2)}|${variant}`,
    () => {
      const positions: number[] = [];
      const uvs: number[] = [];
      const indices: number[] = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const y = -t * height;
        const drift = Math.sin(t * 4.1 + variant * 1.9) * width * 0.16;
        const half = (width / 2) * (1 - t * t) * (1 + Math.sin(t * 8.7 + variant) * 0.2);
        positions.push(drift - half, y, 0, drift + half, y, 0);
        uvs.push((drift - half) / tile, y / tile, (drift + half) / tile, y / tile);
        if (i > 0) {
          const a = (i - 1) * 2;
          indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      return geometry;
    },
  );
}

// Grubby, and spread over a wide range. Paper is the brightest thing on a road
// surface, so a tight palette of clean creams comes back at dusk as an even
// scatter of white confetti across the cobbles; street paper has been rained on
// and driven over, and only the odd fresh sheet is actually pale.
const LITTER_TINTS = [0xdcd6c4, 0xc6bfaa, 0xb2aa96, 0xd0c8b2, 0x9c9482, 0xe0d8c2];
// Greyed off, not brown. These sit on a `wood_crate` texture that is already
// warm, and a tan tint on top of it puts a saturated orange chip on the road.
const CARDBOARD_TINTS = [0xa89e8c, 0x988e7e, 0xb4aa96];

/** Scales every scattered count. Keeps the low tier playable. */
function density(sink: Sink): number {
  return Math.max(0.3, Math.min(1, sink.config.vegetationDensity));
}

function scaled(sink: Sink, count: number): number {
  return Math.max(1, Math.round(count * density(sink)));
}

// ---------------------------------------------------------------------------
// Ground film: flat overlays, merged into batches that already exist
// ---------------------------------------------------------------------------

/**
 * Horizontal quad laid on the ground.
 *
 * Filed under the `ground` tier so it lands in the one map-wide batch per
 * material rather than a per-chunk one: a hundred road patches then cost a
 * hundred pairs of triangles and not a single extra draw call.
 */
function groundFilm(
  sink: Sink,
  x: number,
  z: number,
  width: number,
  depth: number,
  yaw: number,
  material: MaterialId,
  tint: number,
  lift = FILM_LIFT,
  mottle = 0.4,
  shape: 'rect' | 'blotch' = 'rect',
): void {
  const w = snap(width, 0.1);
  const d = snap(depth, 0.1);
  if (w < 0.1 || d < 0.1) return;
  const tile = Math.max(0.6, snap(w * 0.7, 0.2));
  // Tracks and worn bands are laid as a run of segments and have to butt up
  // against each other, so those stay rectangles; everything else is a blob.
  const geometry = cloneGeometry(
    shape === 'blotch' ? blotchGeometry(w, d, tile, sink.rng.int(0, 3)) : planeGeometry(w, d, tile),
  );
  geometry.rotateX(-Math.PI / 2);
  geometry.applyMatrix4(transform(x, sink.ground(x, z) + lift, z, yaw));
  sink.addStatic(geometry, { material, tier: 'ground', tint, mottle });
}

/**
 * Patched pothole: a dark rectangle of fresh bitumen with a ragged shoulder.
 *
 * Two overlapping quads rather than one, because a single rectangle reads as a
 * decal and two offset ones read as a repair somebody made badly.
 */
export function roadPatch(sink: Sink, x: number, z: number, size = 1.6): void {
  const yaw = sink.rng.range(0, TAU);
  groundFilm(
    sink,
    x,
    z,
    size * sink.rng.range(0.8, 1.3),
    size * sink.rng.range(0.6, 1.1),
    yaw,
    'asphalt_worn',
    0x6f6a62,
    FILM_LIFT + 0.004,
    0.55,
    'blotch',
  );
  groundFilm(
    sink,
    x + sink.rng.range(-0.3, 0.3),
    z + sink.rng.range(-0.3, 0.3),
    size * sink.rng.range(0.5, 0.9),
    size * sink.rng.range(0.4, 0.8),
    yaw + sink.rng.range(0.4, 1.1),
    'asphalt_worn',
    0x565149,
    FILM_LIFT + 0.008,
    0.6,
    'blotch',
  );
}

/**
 * Pair of tyre tracks polished into the surface along a line of travel.
 *
 * Laid as short overlapping segments with a wandering gauge, so the pair curves
 * the way a vehicle does instead of running like a railway.
 */
export function tyreTracks(
  sink: Sink,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  gauge = 1.7,
): void {
  const length = Math.hypot(x1 - x0, z1 - z0);
  if (length < 2) return;
  const dirX = (x1 - x0) / length;
  const dirZ = (z1 - z0) / length;
  const yaw = Math.atan2(-dirZ, dirX);
  const steps = Math.max(2, Math.round(length / 3.2));

  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) / steps;
    const wander = Math.sin(t * 5.1 + x0 * 0.3) * 0.35;
    for (const side of [-1, 1]) {
      const across = side * gauge * 0.5 + wander;
      const px = x0 + dirX * length * t - dirZ * across;
      const pz = z0 + dirZ * length * t + dirX * across;
      groundFilm(
        sink,
        px,
        pz,
        length / steps + 0.4,
        sink.rng.range(0.22, 0.3),
        yaw,
        'asphalt_worn',
        0x6a655d,
        FILM_LIFT + 0.002,
        0.5,
      );
    }
  }
}

/**
 * Drift of blown sand lying on a hard surface.
 *
 * Four overlapping quads at descending size and rising opacity, which gives a
 * soft-edged blob rather than the rectangle a single quad reads as. Open ground
 * in this town is not swept, and a drift is the cheapest thing that stops a
 * paved expanse reading as a fresh slab.
 */
export function sandDrift(sink: Sink, x: number, z: number, radius: number): void {
  const yaw = sink.rng.range(0, TAU);
  const lobes = 3 + sink.rng.int(0, 1);
  for (let i = 0; i < lobes; i++) {
    const t = i / lobes;
    const spread = radius * (1 - t * 0.55);
    groundFilm(
      sink,
      x + sink.rng.range(-1, 1) * radius * 0.3 * t,
      z + sink.rng.range(-1, 1) * radius * 0.3 * t,
      spread * sink.rng.range(1.4, 2.1),
      spread * sink.rng.range(1.0, 1.6),
      yaw + sink.rng.range(-0.7, 0.7),
      'sand_ground',
      i === 0 ? 0x9d9078 : 0xb0a184,
      FILM_LIFT + 0.003 + i * 0.002,
      0.5,
      'blotch',
    );
  }
}

/**
 * Scuffed band along a line people walk: the dirt equivalent of a desire path.
 * Wider and lighter than a tyre track, and it wanders more.
 */
export function wearPath(
  sink: Sink,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  width = 1.5,
): void {
  const length = Math.hypot(x1 - x0, z1 - z0);
  if (length < 2) return;
  const dirX = (x1 - x0) / length;
  const dirZ = (z1 - z0) / length;
  const yaw = Math.atan2(-dirZ, dirX);
  const steps = Math.max(2, Math.round(length / 4));

  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) / steps;
    const wander = Math.sin(t * 3.7 + z0 * 0.21) * width * 0.4;
    const px = x0 + dirX * length * t - dirZ * wander;
    const pz = z0 + dirZ * length * t + dirX * wander;
    groundFilm(
      sink,
      px,
      pz,
      length / steps + 0.8,
      width * sink.rng.range(0.75, 1.2),
      yaw + sink.rng.range(-0.1, 0.1),
      'dirt_ground',
      0xb8ae98,
      FILM_LIFT - 0.004,
      0.55,
    );
  }
}

/** Spill stain: oil under a wreck, diesel by a drum, water under a tap. */
export function spillStain(sink: Sink, x: number, z: number, radius: number, tint: number): void {
  for (let i = 0; i < 2; i++) {
    groundFilm(
      sink,
      x + sink.rng.range(-radius * 0.3, radius * 0.3),
      z + sink.rng.range(-radius * 0.3, radius * 0.3),
      radius * sink.rng.range(1.1, 1.9),
      radius * sink.rng.range(0.9, 1.6),
      sink.rng.range(0, TAU),
      'asphalt_worn',
      tint,
      FILM_LIFT + 0.006 + i * 0.003,
      0.65,
      'blotch',
    );
  }
}

// ---------------------------------------------------------------------------
// Micro clutter: pooled into one instanced draw each, gone past 25 m
// ---------------------------------------------------------------------------

/**
 * A sheet of paper that has been rained on and dried.
 *
 * Three strips at slightly different angles rather than one quad. Flat on flat
 * ground is invisible — it shades identically to what it lies on — and the curl
 * is the only thing that catches a highlight and separates it from the road.
 */
function paperGeometry(): THREE.BufferGeometry {
  return cachedGeometry('clutter|paper', () => {
    const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 3; i++) {
      const lift = i === 1 ? 0.03 : 0.006;
      parts.push(
        placed(
          planeGeometry(0.1, 0.26, 0.45),
          transform(-0.1 + i * 0.1, lift, 0, 0, -Math.PI / 2 + (i - 1) * 0.35),
        ),
      );
    }
    return mergeParts(parts);
  });
}

/**
 * Flattened carton, folded once along its length.
 *
 * The fold is steep on purpose. Two near-coplanar halves shade as one surface,
 * and a single flat tone lying on the road is a decal; the whole job of the
 * crease is to put two different values next to each other.
 */
function cardboardGeometry(): THREE.BufferGeometry {
  return cachedGeometry('clutter|cardboard', () =>
    mergeParts([
      placed(planeGeometry(0.3, 0.42, 0.7), transform(-0.13, 0.008, 0, 0, -Math.PI / 2, 0.22)),
      placed(planeGeometry(0.28, 0.42, 0.7), transform(0.13, 0.05, 0, 0, -Math.PI / 2, -0.4)),
    ]),
  );
}

/** Crushed drinks can, dented flat on one side. */
function canGeometry(): THREE.BufferGeometry {
  return cachedGeometry('clutter|can', () => {
    const geometry = cloneGeometry(cylinderGeometry(0.033, 0.036, 0.115, 5, 0.32));
    geometry.scale(1, 1, 0.72);
    geometry.rotateZ(Math.PI / 2 - 0.2);
    geometry.translate(0, 0.026, 0);
    return geometry;
  });
}

/** Plastic bottle on its side, label long gone. */
function bottleGeometry(): THREE.BufferGeometry {
  return cachedGeometry('clutter|bottle', () => {
    const geometry = cloneGeometry(cylinderGeometry(0.026, 0.04, 0.23, 6, 0.3));
    geometry.rotateZ(Math.PI / 2);
    geometry.translate(0, 0.038, 0);
    return geometry;
  });
}

/** Screwed-up rag, the thing that stops litter reading as all one material. */
function ragGeometry(): THREE.BufferGeometry {
  return cachedGeometry('clutter|rag', () => {
    const strip = cloneGeometry(ribbonGeometry(0.36, 0.2, 0.13, 2, 0.05, 1.5, 0.5));
    strip.rotateY(0.4);
    strip.translate(-0.16, 0.03, 0);
    return strip;
  });
}

/** Half-buried mound of wind-blown grit. Flattened, so it beds into the ground. */
function spoilGeometry(): THREE.BufferGeometry {
  return cachedGeometry('clutter|spoil', () => {
    const geometry = new THREE.IcosahedronGeometry(0.3, 0);
    geometry.scale(1, 0.3, 0.78);
    geometry.translate(0, 0.02, 0);
    return geometry;
  });
}

/** Broken lump of masonry, the size that comes off a shelled wall. */
function crumbGeometry(variant: number): THREE.BufferGeometry {
  return cachedGeometry(`clutter|crumb|${variant}`, () => {
    const geometry =
      variant === 0
        ? new THREE.BoxGeometry(0.16, 0.1, 0.12)
        : variant === 1
          ? new THREE.BoxGeometry(0.24, 0.07, 0.13)
          : new THREE.IcosahedronGeometry(0.1, 0);
    if (variant === 2) geometry.scale(1, 0.7, 1.2);
    geometry.translate(0, 0.035, 0);
    return geometry;
  });
}

/**
 * Spent cases, pre-clustered.
 *
 * Six cases baked into one buffer instead of six instances: brass lands in a
 * heap rather than a grid, and one emplacement costs one copy of one geometry.
 */
function brassGeometry(): THREE.BufferGeometry {
  return cachedGeometry('clutter|brass', () => {
    const parts: THREE.BufferGeometry[] = [];
    // Uncapped: a 7 mm case never shows an end face, and the caps would double
    // the triangle count of the one clutter piece that always comes in sevens.
    const case_ = cylinderGeometry(0.0075, 0.0085, 0.046, 5, 0.12, false);
    let state = 7717;
    const rand = (): number => {
      state = (state * 1103515245 + 12345) & 0x7fffffff;
      return state / 0x7fffffff;
    };
    for (let i = 0; i < 7; i++) {
      const a = rand() * TAU;
      const r = rand() * 0.26;
      parts.push(
        placed(
          case_,
          transform(Math.cos(a) * r, 0.009, Math.sin(a) * r, rand() * TAU, 0, Math.PI / 2),
        ),
      );
    }
    return mergeParts(parts);
  });
}

/** Cigarette ends and ash, pre-clustered for a doorstep. */
function buttGeometry(): THREE.BufferGeometry {
  return cachedGeometry('clutter|butts', () => {
    const parts: THREE.BufferGeometry[] = [];
    const stub = cylinderGeometry(0.004, 0.004, 0.026, 4, 0.1);
    let state = 4241;
    const rand = (): number => {
      state = (state * 1103515245 + 12345) & 0x7fffffff;
      return state / 0x7fffffff;
    };
    for (let i = 0; i < 8; i++) {
      const a = rand() * TAU;
      const r = rand() * 0.2;
      parts.push(
        placed(
          stub,
          transform(Math.cos(a) * r, 0.005, Math.sin(a) * r, rand() * TAU, 0, Math.PI / 2),
        ),
      );
    }
    return mergeParts(parts);
  });
}

export interface LitterMix {
  paper?: number;
  card?: number;
  can?: number;
  bottle?: number;
  rag?: number;
  crumb?: number;
}

const STREET_MIX: LitterMix = { paper: 3, card: 2, can: 2, bottle: 1, rag: 1, crumb: 1 };
const YARD_MIX: LitterMix = { paper: 1, card: 2, can: 1, rag: 1, crumb: 3 };

/** One piece of loose litter on the terrain, chosen from a weighted mix. */
export function litterPiece(sink: Sink, x: number, z: number, mix: LitterMix = STREET_MIX): void {
  litterAt(sink, x, sink.ground(x, z), z, mix);
}

/** As `litterPiece`, but on a floor slab at an explicit height. */
export function litterAt(
  sink: Sink,
  x: number,
  y: number,
  z: number,
  mix: LitterMix = STREET_MIX,
): void {
  const roll = sink.rng.next() * weightOf(mix);
  let acc = 0;
  const yaw = sink.rng.range(0, TAU);
  const tilt = (): number => sink.rng.range(-0.14, 0.14);

  acc += mix.paper ?? 0;
  if (roll < acc) {
    sink.addProp(paperGeometry(), transform(x, y, z, yaw, tilt(), tilt(), sink.rng.range(0.7, 1.3)), {
      material: 'plaster_white',
      tier: 'detail',
      tint: sink.rng.pick(LITTER_TINTS),
      clutter: true,
    });
    return;
  }
  acc += mix.card ?? 0;
  if (roll < acc) {
    sink.addProp(
      cardboardGeometry(),
      transform(x, y, z, yaw, tilt(), tilt(), sink.rng.range(0.75, 1.4)),
      {
        material: 'wood_crate',
        tier: 'detail',
        tint: sink.rng.pick(CARDBOARD_TINTS),
        clutter: true,
      },
    );
    return;
  }
  acc += mix.can ?? 0;
  if (roll < acc) {
    sink.addProp(canGeometry(), transform(x, y, z, yaw, 0, tilt()), {
      material: 'metal_panel',
      tier: 'detail',
      tint: sink.rng.pick([0xb9bdb4, 0xa8a496, 0xc4c0b2]),
      clutter: true,
    });
    return;
  }
  acc += mix.bottle ?? 0;
  if (roll < acc) {
    sink.addProp(bottleGeometry(), transform(x, y, z, yaw, 0, tilt()), {
      material: 'metal_panel',
      tier: 'detail',
      tint: sink.rng.pick([0x9aa894, 0xa8a08a, 0x8f9aa2]),
      clutter: true,
    });
    return;
  }
  acc += mix.rag ?? 0;
  if (roll < acc) {
    sink.addProp(ragGeometry(), transform(x, y, z, yaw, tilt(), tilt(), sink.rng.range(0.8, 1.5)), {
      material: 'fabric_canvas',
      tier: 'detail',
      tint: sink.rng.pick([0xa89a86, 0x8f8a7a, 0xb4a48c]),
      clutter: true,
    });
    return;
  }
  sink.addProp(
    crumbGeometry(sink.rng.int(0, 2)),
    transform(x, y, z, yaw, tilt(), tilt(), sink.rng.range(0.7, 1.5)),
    {
      material: 'concrete_damaged',
      tier: 'detail',
      tint: sink.rng.pick([0xcfc6b4, 0xbdb4a2, 0xd6cdba]),
      clutter: true,
    },
  );
}

function weightOf(mix: LitterMix): number {
  return (
    (mix.paper ?? 0) +
    (mix.card ?? 0) +
    (mix.can ?? 0) +
    (mix.bottle ?? 0) +
    (mix.rag ?? 0) +
    (mix.crumb ?? 0)
  );
}

export interface LitterOptions {
  mix?: LitterMix;
  /** Rejects a position; used to keep litter out of claimed footprints. */
  reject?: (x: number, z: number) => boolean;
}

/** Litter over a rectangle, evenly. Use `litterBand` wherever there is a wall. */
export function litterArea(
  sink: Sink,
  area: Rect,
  count: number,
  opts: LitterOptions = {},
): void {
  const total = scaled(sink, count);
  for (let i = 0; i < total; i++) {
    const x = sink.rng.range(area.minX, area.maxX);
    const z = sink.rng.range(area.minZ, area.maxZ);
    if (opts.reject?.(x, z)) continue;
    litterPiece(sink, x, z, opts.mix);
  }
}

/**
 * Litter along a line, packed against it.
 *
 * The distance out from the line is squared, which puts most of the pieces in
 * the first few centimetres — the gutter, the wall foot, the kerb line — and
 * only a few loose in the open. Density also rises towards both ends, because
 * the ends of a wall are corners and corners collect.
 */
export function litterBand(
  sink: Sink,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  outX: number,
  outZ: number,
  count: number,
  opts: LitterOptions & { reach?: number } = {},
): void {
  const length = Math.hypot(x1 - x0, z1 - z0);
  if (length < 1) return;
  const dirX = (x1 - x0) / length;
  const dirZ = (z1 - z0) / length;
  const reach = opts.reach ?? 1.15;
  const total = scaled(sink, count);

  for (let i = 0; i < total; i++) {
    // Beta-ish bias to both ends: two samples, keep the one further from centre.
    const a = sink.rng.next();
    const b = sink.rng.next();
    const t = Math.abs(a - 0.5) > Math.abs(b - 0.5) ? a : b;
    const out = 0.1 + reach * sink.rng.next() * sink.rng.next();
    const x = x0 + dirX * length * t + outX * out;
    const z = z0 + dirZ * length * t + outZ * out;
    if (opts.reject?.(x, z)) continue;
    litterPiece(sink, x, z, opts.mix);
  }
}

/**
 * Grit banked against a line, with the mounds bunching towards the ends.
 *
 * The join between a wall and the ground is the most fragile part of any
 * exterior: a hard right angle reads as two objects intersecting. A ribbon of
 * sand fixes the seam, and these mounds on top of it stop the ribbon reading as
 * a moulding.
 */
export function grtBank(
  sink: Sink,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  outX: number,
  outZ: number,
  count: number,
): void {
  const length = Math.hypot(x1 - x0, z1 - z0);
  if (length < 1) return;
  const dirX = (x1 - x0) / length;
  const dirZ = (z1 - z0) / length;
  const total = scaled(sink, count);

  for (let i = 0; i < total; i++) {
    const a = sink.rng.next();
    const b = sink.rng.next();
    const t = Math.abs(a - 0.5) > Math.abs(b - 0.5) ? a : b;
    // Deeper drifts where the mound sits at the ends of the run.
    const bulge = 0.55 + 0.9 * Math.abs(t - 0.5) * 2;
    const out = 0.12 + sink.rng.next() * 0.55;
    const x = x0 + dirX * length * t + outX * out;
    const z = z0 + dirZ * length * t + outZ * out;
    if (sink.groundClaimed(x, z, 0.15)) continue;
    sink.addProp(
      spoilGeometry(),
      transform(
        x,
        sink.ground(x, z) - 0.03,
        z,
        sink.rng.range(0, TAU),
        sink.rng.range(-0.1, 0.1),
        sink.rng.range(-0.1, 0.1),
        new THREE.Vector3(
          bulge * sink.rng.range(0.7, 1.5),
          sink.rng.range(0.5, 1.2),
          bulge * sink.rng.range(0.6, 1.2),
        ),
      ),
      {
        material: 'sand_ground',
        tier: 'detail',
        tint: sink.rng.bool(0.6) ? 0xe6dcc4 : 0xd4c8ac,
        clutter: true,
      },
    );
  }
}

/**
 * Everything that ends up in an inside corner: grit, a couple of blocks, a
 * flattened box, a bottle. The single most valuable placement rule on the map,
 * because a bare 90-degree corner is what makes a street look extruded.
 */
export function cornerSpoil(sink: Sink, x: number, z: number, inX: number, inZ: number): void {
  const along = 1.5;
  for (let i = 0; i < scaled(sink, 5); i++) {
    const px = x + inX * sink.rng.range(0.1, along) + inZ * sink.rng.range(-0.35, 0.35);
    const pz = z + inZ * sink.rng.range(0.1, along) + inX * sink.rng.range(-0.35, 0.35);
    if (sink.groundClaimed(px, pz, 0.1)) continue;
    sink.addProp(
      spoilGeometry(),
      transform(
        px,
        sink.ground(px, pz) - 0.025,
        pz,
        sink.rng.range(0, TAU),
        0,
        0,
        new THREE.Vector3(sink.rng.range(0.8, 1.7), sink.rng.range(0.6, 1.4), sink.rng.range(0.8, 1.6)),
      ),
      { material: 'sand_ground', tier: 'detail', tint: 0xe0d6bc, clutter: true },
    );
  }
  for (let i = 0; i < scaled(sink, 4); i++) {
    const px = x + inX * sink.rng.range(0.15, along) + inZ * sink.rng.range(-0.4, 0.4);
    const pz = z + inZ * sink.rng.range(0.15, along) + inX * sink.rng.range(-0.4, 0.4);
    if (sink.groundClaimed(px, pz, 0.1)) continue;
    litterPiece(sink, px, pz, YARD_MIX);
  }
}

/** Loose masonry with a radial falloff, so a pile has a centre. */
export function rubbleCrumbs(sink: Sink, x: number, z: number, radius: number, count: number): void {
  const total = scaled(sink, count);
  for (let i = 0; i < total; i++) {
    const a = sink.rng.range(0, TAU);
    const r = radius * sink.rng.next() * sink.rng.next();
    const px = x + Math.cos(a) * r;
    const pz = z + Math.sin(a) * r;
    if (sink.groundClaimed(px, pz, 0)) continue;
    const brick = sink.rng.bool(0.35);
    sink.addProp(
      crumbGeometry(sink.rng.int(0, 2)),
      transform(
        px,
        sink.ground(px, pz),
        pz,
        sink.rng.range(0, TAU),
        sink.rng.range(-0.3, 0.3),
        sink.rng.range(-0.3, 0.3),
        sink.rng.range(0.7, 1.7),
      ),
      {
        material: brick ? 'brick_red' : 'concrete_damaged',
        tier: 'detail',
        tint: brick ? 0xb89a84 : sink.rng.pick([0xcfc6b4, 0xbdb4a2, 0xd8cfbc]),
        clutter: true,
      },
    );
  }
}

/** Spent brass, for the ground behind an emplacement that has been used. */
export function brassScatter(sink: Sink, x: number, z: number, yaw: number, heaps = 3): void {
  for (let i = 0; i < heaps; i++) {
    const px = x + Math.cos(yaw) * sink.rng.range(-1.4, 1.4) + sink.rng.range(-0.3, 0.3);
    const pz = z - Math.sin(yaw) * sink.rng.range(-1.4, 1.4) + sink.rng.range(-0.3, 0.3);
    if (sink.groundClaimed(px, pz, 0)) continue;
    sink.addProp(
      brassGeometry(),
      transform(px, sink.ground(px, pz), pz, sink.rng.range(0, TAU), 0, 0, sink.rng.range(0.8, 1.4)),
      { material: 'metal_panel', tier: 'detail', tint: 0xc0a058, clutter: true },
    );
  }
}

/**
 * Everything that gathers where a wall meets the ground, round a whole footprint.
 *
 * Run as one call per building so the drift is continuous along each face and
 * heaps at all four corners, which is where wind actually drops what it carries.
 * The outward offset is deliberately small: the value of this pass is that it
 * softens the seam between the wall and the terrain, and a drift standing half a
 * metre off the masonry fixes nothing.
 */
export function wallFoot(
  sink: Sink,
  r: Rect,
  opts: { kind?: 'street' | 'yard'; grit?: number } = {},
): void {
  const mix = opts.kind === 'yard' ? YARD_MIX : STREET_MIX;
  const edges: Array<[number, number, number, number, number, number]> = [
    [r.minX, r.minZ, r.maxX, r.minZ, 0, -1],
    [r.maxX, r.minZ, r.maxX, r.maxZ, 1, 0],
    [r.maxX, r.maxZ, r.minX, r.maxZ, 0, 1],
    [r.minX, r.maxZ, r.minX, r.minZ, -1, 0],
  ];
  const grit = opts.grit ?? 1;
  for (const [x0, z0, x1, z1, outX, outZ] of edges) {
    const length = Math.hypot(x1 - x0, z1 - z0);
    if (length < 1.5) continue;
    grtBank(sink, x0, z0, x1, z1, outX, outZ, Math.round(length * 0.55 * grit));
    litterBand(sink, x0, z0, x1, z1, outX, outZ, Math.round(length * 0.45), { mix, reach: 1.0 });
  }
  // Corners take a heap in each of the two directions the walls run away in.
  const corners: Array<[number, number, number, number]> = [
    [r.minX, r.minZ, 1, -1],
    [r.maxX, r.minZ, -1, -1],
    [r.maxX, r.maxZ, -1, 1],
    [r.minX, r.maxZ, 1, 1],
  ];
  for (const [cx, cz, sx, sz] of corners) {
    cornerSpoil(sink, cx + sx * 0.25, cz + sz * 0.35, 0, sz);
    cornerSpoil(sink, cx + sx * 0.35, cz + sz * 0.25, sx, 0);
  }
}

/**
 * Cast drain cover set into the road, with a rebate around it.
 *
 * Reads as a hole in the surface from any angle because the frame is real
 * geometry rather than a decal, which is what a painted circle never manages.
 */
export function drainCover(sink: Sink, x: number, z: number, yaw: number): void {
  const geometry = cachedGeometry('draincover', () =>
    mergeParts([
      placed(boxGeometry(0.66, 0.05, 0.5, 0.012, 0.5), transform(0, 0.006, 0)),
      placed(boxGeometry(0.58, 0.035, 0.42, 0.008, 0.4), transform(0, 0.03, 0)),
    ]),
  );
  sink.addProp(geometry, transform(x, sink.ground(x, z) - 0.02, z, yaw + sink.rng.range(-0.06, 0.06)), {
    material: 'metal_rusted',
    tier: 'detail',
    tint: sink.rng.pick([0x6e675c, 0x7a7266, 0x635c52]),
  });
  groundFilm(sink, x, z, 1.0, 0.86, yaw, 'asphalt_worn', 0x6a655c, FILM_LIFT, 0.5);
}

/**
 * Kerbstone that has been clipped by a lorry: one block knocked out of line and
 * the crumbs it shed. Placed on the kerb of a road, not on the carriageway.
 */
export function kerbDamage(sink: Sink, x: number, z: number, yaw: number): void {
  const geometry = cachedGeometry('kerbchunk', () => boxGeometry(0.6, 0.16, 0.24, 0.02, 0.9).clone());
  sink.addProp(
    geometry,
    transform(
      x,
      sink.ground(x, z) + 0.05,
      z,
      yaw + sink.rng.range(-0.16, 0.16),
      sink.rng.range(-0.1, 0.1),
      sink.rng.range(-0.12, 0.12),
    ),
    { material: 'concrete_damaged', tier: 'detail', tint: sink.rng.pick([0xcfc6b2, 0xbdb4a0]) },
  );
  rubbleCrumbs(sink, x, z, 0.7, 4);
}

/** Cigarette ends and ash, for a doorstep somebody stands outside of. */
export function buttPatch(sink: Sink, x: number, z: number): void {
  sink.addProp(
    buttGeometry(),
    transform(x, sink.ground(x, z), z, sink.rng.range(0, TAU), 0, 0, sink.rng.range(0.9, 1.4)),
    { material: 'plaster_white', tier: 'detail', tint: 0xbdb6a4, clutter: true },
  );
  groundFilm(sink, x, z, 0.75, 0.6, sink.rng.range(0, TAU), 'asphalt_worn', 0x6e685e, FILM_LIFT, 0.6, 'blotch');
}

// ---------------------------------------------------------------------------
// Wall dressing
// ---------------------------------------------------------------------------

/**
 * Outward normal of a wall face whose props are placed at `yaw`.
 *
 * The kit's convention is that a prop's local +Z leaves the wall, so a plane
 * placed at the wall's yaw already faces the street and an overlay only has to
 * be pushed along this vector to clear the masonry.
 */
function faceNormal(yaw: number): { x: number; z: number } {
  return { x: Math.sin(yaw), z: Math.cos(yaw) };
}

/** Direction along a wall face, for jittering an overlay sideways. */
function faceAlong(yaw: number): { x: number; z: number } {
  return { x: Math.cos(yaw), z: -Math.sin(yaw) };
}

/** Half the wall thickness: the gap between a facade's centre line and its skin. */
const FACE_OUT = METRICS.wallThickness / 2;

/**
 * Wall quad standing `out` metres off the masonry, merged into the district's
 * detail batch. Callers stack layers in millimetre steps so two overlays never
 * fight for the same depth.
 */
function wallFilm(
  sink: Sink,
  x: number,
  y: number,
  z: number,
  yaw: number,
  width: number,
  height: number,
  out: number,
  material: MaterialId,
  tint: number,
  mottle = 0.4,
): void {
  const w = snap(width, 0.1);
  const h = snap(height, 0.1);
  if (w < 0.1 || h < 0.1) return;
  const n = faceNormal(yaw);
  sink.addStatic(
    placed(
      blotchGeometry(w, h, Math.max(0.5, snap(h * 0.8, 0.2)), sink.rng.int(0, 3)),
      transform(x + n.x * out, y, z + n.z * out, yaw),
    ),
    { material, tier: 'detail', tint, mottle },
  );
}

/**
 * Streak of dirt washed down a wall.
 *
 * Goes under everything that sheds water: an AC unit, a pipe joint, a scupper, a
 * sill. `y` is where the water leaves the object, and each streak hangs from
 * there. Ten triangles, and the cheapest thing on this list that makes a wall
 * look like it has stood outside for thirty years.
 */
export function dripStain(
  sink: Sink,
  x: number,
  y: number,
  z: number,
  yaw: number,
  width: number,
  drop: number,
): void {
  const d = faceAlong(yaw);
  const n = faceNormal(yaw);
  const streaks = sink.rng.int(2, 3);
  for (let i = 0; i < streaks; i++) {
    const u = (i / streaks - 0.35 + sink.rng.range(-0.12, 0.12)) * width;
    const h = snap(drop * sink.rng.range(0.45, 1), 0.1);
    // Narrow regardless of how wide the thing shedding the water is. Scaling the
    // streak to the sill gives a patch wider than it is tall, and a stain that
    // does not run downhill reads as damage rather than dirt.
    const w = Math.min(snap(0.1 + width * 0.12, 0.05), h * 0.4);
    if (w < 0.05 || h < 0.1) continue;
    sink.addStatic(
      placed(
        streakGeometry(w, h, Math.max(0.5, snap(h * 0.8, 0.2)), sink.rng.int(0, 3)),
        transform(x + d.x * u + n.x * 0.02, y, z + d.z * u + n.z * 0.02, yaw),
      ),
      {
        material: 'concrete_damaged',
        tier: 'detail',
        // Light. The overlay stands off the masonry far enough for ambient
        // occlusion to draw a contact shadow round it, so anything actually
        // dirt-coloured comes out looking like a hole rather than a stain.
        tint: sink.rng.bool(0.5) ? 0xb4aa98 : 0xc0b7a5,
        mottle: 0.55,
      },
    );
  }
}

/** Multiplies a hex tint towards black, keeping its hue. */
function shade(tint: number, factor: number): number {
  const r = Math.round(((tint >> 16) & 0xff) * factor);
  const g = Math.round(((tint >> 8) & 0xff) * factor);
  const b = Math.round((tint & 0xff) * factor);
  return (r << 16) | (g << 8) | b;
}

/**
 * Broad grime wash: under a parapet, around a downpipe, above a plinth.
 *
 * Stains the wall in the wall's own material and a darker shade of the wall's own
 * tint. Left as grey concrete — which is what it was — every wash on a red brick
 * facade came back as a pale grey lens stuck to the brick, and a dozen of them
 * along the eaves read as blast damage rather than as thirty years of rain.
 *
 * Built as two or three overlapping streaks rather than one ellipse, because what
 * makes a wash read as weathering is not its edge but its direction: dirt on a
 * wall has run down it. A single blotch, however ragged, is a shape with a top
 * and a bottom and no reason for either, and at close range on an interior wall
 * it reads as a grey cushion hung at head height.
 */
export function wallGrime(
  sink: Sink,
  x: number,
  y: number,
  z: number,
  yaw: number,
  width: number,
  height: number,
  host: { material?: MaterialId; tint?: number } = {},
): void {
  const material = host.material ?? 'concrete_damaged';
  const tint = host.tint === undefined ? 0xd0c8b8 : shade(host.tint, 0.86);
  const runs = width > 1.2 ? 3 : 2;
  const along = faceAlong(yaw);
  const n = faceNormal(yaw);
  for (let i = 0; i < runs; i++) {
    const w = snap((width / runs) * sink.rng.range(1.05, 1.5), 0.1);
    const h = snap(height * sink.rng.range(0.75, 1.25), 0.1);
    if (w < 0.1 || h < 0.1) continue;
    const offset = ((i + 0.5) / runs - 0.5) * width + sink.rng.range(-0.08, 0.08);
    // Millimetre steps so the overlaps never fight for the same depth.
    const out = 0.011 + i * 0.0015;
    sink.addStatic(
      placed(
        streakGeometry(w, h, Math.max(0.5, snap(h * 0.8, 0.2)), sink.rng.int(0, 3)),
        transform(
          x + along.x * offset + n.x * out,
          y + h * 0.5,
          z + along.z * offset + n.z * out,
          yaw,
        ),
      ),
      // Up from 0.7. The mottle noise runs at map scale rather than patch scale,
      // so what this buys is that neighbouring washes differ in weight, which is
      // what stops a row of them reading as a row of identical decals.
      { material, tier: 'detail', tint, mottle: 0.85 },
    );
  }
}

/** Fly-posted bills, layered and half torn off. */
export function posterCluster(
  sink: Sink,
  x: number,
  y: number,
  z: number,
  yaw: number,
  count = 3,
): void {
  const d = faceAlong(yaw);
  const n = faceNormal(yaw);
  const tints = [0xd8cdb0, 0xc4b898, 0xb8c0c4, 0xd0b8a4];
  for (let i = 0; i < count; i++) {
    const u = sink.rng.range(-0.55, 0.55);
    const v = sink.rng.range(-0.28, 0.28);
    const width = snap(sink.rng.range(0.34, 0.52), 0.04);
    const height = snap(sink.rng.range(0.44, 0.68), 0.04);
    const layer = 0.022 + i * 0.003;
    sink.addStatic(
      placed(
        planeGeometry(width, height, 0.6),
        transform(
          x + d.x * u + n.x * layer,
          y + v,
          z + d.z * u + n.z * layer,
          yaw,
          0,
          sink.rng.range(-0.09, 0.09),
        ),
      ),
      {
        material: sink.rng.bool(0.25) ? 'paint_red' : 'plaster_white',
        tier: 'detail',
        tint: sink.rng.pick(tints),
        mottle: 0.35,
      },
    );
  }
}

/** Electricity meter in a steel cabinet, with the tail running up out of it. */
export function meterBox(sink: Sink, x: number, y: number, z: number, yaw: number): void {
  const geometry = cachedGeometry('meterbox', () =>
    mergeParts([
      placed(boxGeometry(0.34, 0.44, 0.16, 0.02, 0.7), transform(0, 0, 0)),
      placed(boxGeometry(0.38, 0.05, 0.2, 0.012, 0.6), transform(0, 0.24, 0.01)),
      placed(cylinderGeometry(0.022, 0.022, 0.55, 6, 0.6), transform(-0.1, 0.5, -0.02)),
      placed(cylinderGeometry(0.022, 0.022, 0.36, 6, 0.6), transform(0.1, -0.4, -0.02)),
    ]),
  );
  sink.addProp(geometry, transform(x, y, z, yaw), {
    material: 'metal_panel',
    tier: 'detail',
    tint: sink.rng.pick([0x9aa09a, 0xa8a294, 0x8e8c84]),
  });
  dripStain(sink, x, y - 0.24, z, yaw, 0.3, 0.7);
}

/** Louvred extract vent with a stained shadow below it. */
export function airVent(sink: Sink, x: number, y: number, z: number, yaw: number): void {
  const geometry = cachedGeometry('airvent', () => {
    const parts: THREE.BufferGeometry[] = [
      placed(boxGeometry(0.52, 0.44, 0.07, 0.015, 0.8), transform(0, 0, 0)),
    ];
    for (let i = 0; i < 4; i++) {
      parts.push(
        placed(
          boxGeometry(0.46, 0.055, 0.05, 0.008, 0.5),
          transform(0, 0.15 - i * 0.1, 0.05, 0, 0.5),
        ),
      );
    }
    return mergeParts(parts);
  });
  sink.addProp(geometry, transform(x, y, z, yaw), {
    material: 'metal_rusted',
    tier: 'detail',
    tint: 0x9a9086,
  });
  dripStain(sink, x, y - 0.24, z, yaw, 0.5, 1.1);
}

/** Bracketed street lamp on a wall, the kind wired in over a shop door. */
export function wallLamp(sink: Sink, x: number, y: number, z: number, yaw: number): void {
  const geometry = cachedGeometry('walllamp', () =>
    mergeParts([
      placed(boxGeometry(0.07, 0.07, 0.44, 0.012, 0.6), transform(0, 0.04, 0.22, 0, -0.28)),
      placed(boxGeometry(0.06, 0.28, 0.06, 0.01, 0.6), transform(0, -0.1, 0.06, 0, 0, 0.5)),
      placed(cylinderGeometry(0.16, 0.09, 0.12, 9, 0.5, false), transform(0, -0.08, 0.42)),
      placed(boxGeometry(0.13, 0.16, 0.05, 0.012, 0.5), transform(0, 0.02, -0.01)),
    ]),
  );
  sink.addProp(geometry, transform(x, y, z, yaw), {
    material: 'metal_rusted',
    tier: 'detail',
    tint: 0x8d8478,
  });
}

/**
 * Shop sign hung off a bracket, square to the wall so it reads down the street
 * rather than only to whoever is standing in front of it.
 */
export function bracketSign(
  sink: Sink,
  x: number,
  y: number,
  z: number,
  yaw: number,
  width = 1.1,
  height = 0.42,
): void {
  const key = `bracketsign|${width.toFixed(2)}|${height.toFixed(2)}`;
  const geometry = cachedGeometry(key, () =>
    mergeParts([
      placed(boxGeometry(0.06, 0.06, width * 0.9, 0.01, 0.7), transform(0, height / 2, width * 0.45)),
      placed(boxGeometry(0.05, 0.05, 0.42, 0.01, 0.6), transform(0, height / 2 - 0.2, 0.2, 0, 0, -0.8)),
    ]),
  );
  sink.addProp(geometry, transform(x, y, z, yaw), {
    material: 'metal_rusted',
    tier: 'detail',
    tint: 0x8a8175,
  });

  // Double-sided, because a sign hung square to the wall is read from both
  // directions down the street and a one-sided plate vanishes from half of them.
  const board = cachedGeometry(`signboard|${width.toFixed(2)}|${height.toFixed(2)}`, () => {
    const plate = cloneGeometry(planeGeometry(width, height, 0.8));
    plate.rotateY(Math.PI / 2);
    return makeDoubleSided(plate);
  });
  const n = faceNormal(yaw);
  sink.addProp(board, transform(x + n.x * width * 0.5, y, z + n.z * width * 0.5, yaw), {
    material: sink.rng.bool(0.4) ? 'paint_red' : 'wood_painted',
    tier: 'detail',
    // Painted board, hung square to the wall, so both its faces point along the
    // street and neither ever sees the sun. A tint that reads as paint in a
    // swatch multiplies the wood beneath it down to a black plate on the
    // building; these are picked for what comes out the far end of that.
    tint: sink.rng.pick([0xf0e2c0, 0xe8b04a, 0xd8664a, 0x6fa8c8, 0xe4dcd0, 0x76b078]),
  });
}

/**
 * Bricked-up opening, with a shallow reveal so it reads as an opening that was
 * filled rather than a rectangle painted on a wall.
 */
export function infillPanel(
  sink: Sink,
  x: number,
  y: number,
  z: number,
  yaw: number,
  width: number,
  height: number,
): void {
  const n = faceNormal(yaw);
  // Nearly flush: a bricked-up opening is set into its reveal, and a panel that
  // stands eight centimetres off the wall reads as a stuck-on box from a metre away.
  sink.addStatic(
    placed(
      boxGeometry(snap(width, 0.05), snap(height, 0.05), 0.09, 0.02, 1.2),
      transform(x - n.x * 0.015, y, z - n.z * 0.015, yaw),
    ),
    { material: 'brick_red', tier: 'detail', reproject: true, tint: 0xb49a84, mottle: 0.5 },
  );
  // Smear of render over the joint, which is how these are actually finished.
  wallFilm(
    sink,
    x,
    y + height * sink.rng.range(-0.2, 0.2),
    z,
    yaw,
    width * sink.rng.range(0.4, 0.8),
    height * sink.rng.range(0.3, 0.6),
    0.09,
    'plaster_white',
    0xc8bea8,
    0.5,
  );
}

/** Two or three conduits running together, with boxes and a drop to a switch. */
export function conduitBundle(
  sink: Sink,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  y: number,
  yaw: number,
  runs = 2,
): void {
  const length = Math.hypot(x1 - x0, z1 - z0);
  if (length < 1) return;
  const key = `conduitbundle|${length.toFixed(2)}|${runs}`;
  const geometry = cachedGeometry(key, () => {
    const parts: THREE.BufferGeometry[] = [];
    for (let r = 0; r < runs; r++) {
      const offset = r * 0.075;
      parts.push(
        placed(
          cylinderGeometry(0.022, 0.022, length - r * 0.6, 6, 1.1),
          transform(0, offset, 0.005 + r * 0.004, 0, 0, Math.PI / 2),
        ),
      );
    }
    const boxes = Math.max(1, Math.floor(length / 3.2));
    for (let i = 0; i < boxes; i++) {
      const t = (i + 0.5) / boxes - 0.5;
      parts.push(
        placed(boxGeometry(0.15, 0.19, 0.09, 0.012, 0.5), transform(t * length, 0.02, 0.03)),
      );
    }
    // One drop to a switch, so the run has somewhere to be going.
    parts.push(
      placed(cylinderGeometry(0.02, 0.02, 1.15, 6, 1.0), transform(length * 0.22, -0.6, 0.01)),
    );
    parts.push(placed(boxGeometry(0.13, 0.17, 0.08, 0.01, 0.5), transform(length * 0.22, -1.2, 0.03)));
    return mergeParts(parts);
  });
  sink.addProp(geometry, transform((x0 + x1) / 2, y, (z0 + z1) / 2, yaw), {
    material: 'metal_panel',
    tier: 'detail',
    tint: sink.rng.pick([0x8e8a80, 0x9c9488, 0x807c74]),
  });
}

/** Hopper head where a downpipe meets the roof edge, plus its wet streak. */
export function gutterHopper(sink: Sink, x: number, y: number, z: number, yaw: number): void {
  const geometry = cachedGeometry('hopper', () =>
    mergeParts([
      placed(cylinderGeometry(0.115, 0.062, 0.24, 8, 0.7, false), transform(0, 0, 0)),
      placed(boxGeometry(0.26, 0.045, 0.16, 0.01, 0.5), transform(0, 0.13, 0.01)),
    ]),
  );
  sink.addProp(geometry, transform(x, y, z, yaw), {
    material: 'metal_rusted',
    tier: 'detail',
    tint: 0x9c8f7e,
  });
  dripStain(sink, x, y - 0.2, z, yaw, 0.34, 1.4);
}

/**
 * Cable slung between two points with its own weight in it, plus the drop wires
 * that make it a supply rather than a washing line.
 */
export function cableSpan(sink: Sink, from: THREE.Vector3, to: THREE.Vector3, pairs = 2): void {
  const span = from.distanceTo(to);
  if (span < 2) return;
  for (let i = 0; i < pairs; i++) {
    const lift = i * 0.16;
    const a = from.clone();
    const b = to.clone();
    a.y += lift;
    b.y += lift;
    sink.addStatic(catenaryGeometry(a, b, span * (0.055 + i * 0.012), 0.017, 8), {
      material: 'metal_rusted',
      tier: 'detail',
      tint: 0x4e4a44,
    });
  }
  // A short dropper hanging off the middle of the span.
  const mid = from.clone().lerp(to, sink.rng.range(0.35, 0.65));
  mid.y -= span * 0.06;
  sink.addStatic(
    catenaryGeometry(mid, new THREE.Vector3(mid.x, mid.y - 1.2, mid.z), 0.05, 0.014, 4),
    { material: 'metal_rusted', tier: 'detail', tint: 0x4e4a44 },
  );
}

/** Louvred cage over a wall AC unit, plus the streak it has washed down. */
export function acCage(sink: Sink, x: number, y: number, z: number, yaw: number): void {
  const geometry = cachedGeometry('accage', () => {
    const parts: THREE.BufferGeometry[] = [];
    for (const s of [-1, 1]) {
      parts.push(placed(boxGeometry(0.03, 0.66, 0.42, 0.006, 0.7), transform(s * 0.5, 0, 0.2)));
    }
    parts.push(placed(boxGeometry(1.03, 0.03, 0.42, 0.006, 0.7), transform(0, 0.33, 0.2)));
    // Vertical bars, sparse enough to see the condenser through.
    for (let i = 0; i < 7; i++) {
      parts.push(
        placed(
          boxGeometry(0.016, 0.66, 0.016, 0.004, 0.4),
          transform(-0.42 + i * 0.14, 0, 0.4),
        ),
      );
    }
    return mergeParts(parts);
  });
  sink.addProp(geometry, transform(x, y, z, yaw), {
    material: 'metal_rusted',
    tier: 'detail',
    tint: sink.rng.pick([0x8e8478, 0x9c9084, 0x7f776c]),
  });
}

/** TV aerial: a mast with a handful of cross elements, seen only in silhouette. */
export function tvAerial(sink: Sink, x: number, y: number, z: number, yaw: number): void {
  const geometry = cachedGeometry('tvaerial', () => {
    const parts: THREE.BufferGeometry[] = [
      placed(cylinderGeometry(0.014, 0.018, 1.5, 4, 1.2), transform(0, 0.75, 0)),
      placed(cylinderGeometry(0.012, 0.012, 0.62, 4, 0.8), transform(0, 1.32, 0, 0, 0, Math.PI / 2)),
    ];
    for (let i = 0; i < 5; i++) {
      const h = 0.86 + i * 0.13;
      parts.push(
        placed(
          cylinderGeometry(0.008, 0.008, 0.52 - i * 0.06, 3, 0.5),
          transform(0, h, 0.06 + i * 0.02, 0, 0, Math.PI / 2),
        ),
      );
    }
    // Bracket back to the parapet.
    parts.push(placed(boxGeometry(0.05, 0.3, 0.05, 0.008, 0.5), transform(0, 0.15, -0.05)));
    return mergeParts(parts);
  });
  sink.addProp(geometry, transform(x, y, z, yaw, sink.rng.range(-0.05, 0.05)), {
    material: 'metal_rusted',
    tier: 'detail',
    tint: 0x8a8276,
  });
}

/** Window sill with a lip, and the wash of dirt the rain throws off it. */
export function sillWash(
  sink: Sink,
  x: number,
  y: number,
  z: number,
  yaw: number,
  width: number,
): void {
  const geometry = cachedGeometry(`sill|${snap(width, 0.1).toFixed(2)}`, () =>
    mergeParts([
      placed(boxGeometry(snap(width, 0.1), 0.055, 0.16, 0.012, 1.0), transform(0, 0, 0.05)),
      placed(boxGeometry(snap(width, 0.1) - 0.06, 0.04, 0.05, 0.008, 0.6), transform(0, -0.04, 0.11)),
    ]),
  );
  const n = faceNormal(yaw);
  sink.addProp(geometry, transform(x + n.x * 0.05, y, z + n.z * 0.05, yaw), {
    material: 'concrete_wall',
    tier: 'detail',
    tint: sink.rng.pick([0xd8cfbc, 0xc8bfae, 0xe0d6c2]),
  });
  dripStain(sink, x, y - 0.06, z, yaw, width * 0.8, sink.rng.range(0.5, 1.1));
}

// ---------------------------------------------------------------------------
// The facade driver: one wall's worth of dressing, chosen by what it is for
// ---------------------------------------------------------------------------

export type FacadeUse = 'shop' | 'store' | 'home' | 'workshop' | 'hall' | 'derelict';

export interface FacadeSite {
  /** Ends of the outside wall face. */
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  /** Prop yaw: local +Z leaves the wall. */
  yaw: number;
  base: number;
  roofY: number;
  floors: number;
  floorHeight: number;
  use: FacadeUse;
  /** Distance along the wall of each bay centre. */
  bays: readonly number[];
  /** Width of one bay, which is what decides whether a bay gets an opening. */
  bayWidth: number;
  /** Bay indices with a ground-floor doorway. */
  doors: readonly number[];
  /** Bay indices left as blank masonry. */
  blank: readonly number[];
  /** Bay indices blown open on the top floor. */
  breach: readonly number[];
  /** Ground floor is an arcade of arches rather than a row of windows. */
  arcade: boolean;
  /** Material and tint of the masonry, so staining can match what it stains. */
  wallMaterial?: MaterialId;
  wallTint?: number;
}

/**
 * Everything that hangs on one wall.
 *
 * The order is the order a real building acquired it: the fabric first (sills,
 * infills, patched render), then the services somebody ran up the outside
 * afterwards (downpipe, conduit, meter, AC), then what the occupant put on it
 * (sign, lamp, posters, aerial, washing). Each item is placed relative to
 * something on the wall that explains it — a hopper at the roof edge, a meter
 * beside the door, a drip under everything that sheds water — because dressing
 * that floats at a random height is what makes a facade read as decorated
 * rather than built.
 */
export function dressFacade(sink: Sink, site: FacadeSite): void {
  const length = Math.hypot(site.x1 - site.x0, site.z1 - site.z0);
  if (length < 1.5) return;
  // Step along the wall from its own endpoints. Deriving this from the yaw
  // instead gets the sign wrong on every edge — the facade winding runs opposite
  // to a prop's local +X — and every bay-aligned item then lands on the
  // continuation of the wall line, out past the corner, hanging in the air.
  const d = { x: (site.x1 - site.x0) / length, z: (site.z1 - site.z0) / length };
  const height = site.roofY - site.base;
  const yaw = site.yaw;
  // The site line runs down the middle of the masonry, so every point on it has
  // to be pushed out to the face before anything is hung off it. Offsets in the
  // rest of this function are then all relative to the surface, which is how
  // they read: 2 cm for a poster, 9 cm for a downpipe.
  const face = faceNormal(yaw);
  const at = (u: number): { x: number; z: number } => ({
    x: site.x0 + d.x * u + face.x * FACE_OUT,
    z: site.z0 + d.z * u + face.z * FACE_OUT,
  });
  const shopfront = site.use === 'shop' || site.use === 'store';
  // Anything hung on a wall has to have wall left above it. A parapet, a set-back
  // top storey or a shelled-off floor all leave a facade shorter than the roof
  // line the caller quoted, and dressing that ignores that floats in the sky —
  // which is far more visible from the street than the dressing itself.
  const fits = (y: number, headroom: number): boolean => y + headroom <= site.roofY;

  // --- Fabric ---------------------------------------------------------------

  // Grime under the roof edge, as a broken run of patches. Scaling one blotch to
  // the wall gives a fifteen-metre lens of grey on a twenty-metre facade, which
  // reads as a shadow cast by nothing rather than as thirty years of rain; what
  // sells it is that the staining is heavy in some bays and absent in others.
  const host = { material: site.wallMaterial, tint: site.wallTint };
  const eaves = Math.max(1, Math.round(length / 3.5));
  for (let i = 0; i < eaves; i++) {
    if (sink.rng.bool(0.3)) continue;
    const p = at((i + sink.rng.range(0.15, 0.85)) * (length / eaves));
    wallGrime(
      sink,
      p.x,
      site.roofY - sink.rng.range(0.45, 0.95),
      p.z,
      yaw,
      sink.rng.range(1.0, 2.3),
      sink.rng.range(0.5, 1.1),
      host,
    );
  }

  // A bay only carries an opening when the facade builder could fit one, so the
  // dressing has to apply the same test or a sill ends up floating on blank wall.
  const openingWidth = Math.min(1.45, site.bayWidth - 1.2);
  const glazed = openingWidth >= 0.7;

  for (let i = 0; i < site.bays.length; i++) {
    const u = site.bays[i];
    if (u < 0.5 || u > length - 0.5) continue;
    const p = at(u);
    const blanked = site.blank.includes(i);
    const doored = site.doors.includes(i);
    const breached = site.breach.includes(i);

    if (blanked && sink.rng.bool(0.45) && fits(site.base + 1.6, 1.1)) {
      infillPanel(
        sink,
        p.x,
        site.base + 1.6,
        p.z,
        yaw,
        sink.rng.range(1.2, 1.6),
        sink.rng.range(1.3, 1.7),
      );
    }

    // Sills on the storeys a player reads from the street, and one storey up.
    if (glazed && !blanked && !doored) {
      const top = Math.min(site.floors, 2);
      for (let floor = 0; floor < top; floor++) {
        // No sill where the ground floor is an arcade arch, and none in a hole
        // the shelling has already taken the wall out of.
        if (floor === 0 && site.arcade) continue;
        if (breached && floor === site.floors - 1) continue;
        if (floor > 0 && sink.rng.bool(0.4)) continue;
        if (!fits(site.base + floor * site.floorHeight + 0.9, 1.2)) continue;
        sillWash(
          sink,
          p.x,
          site.base + floor * site.floorHeight + 0.9,
          p.z,
          yaw,
          openingWidth + 0.22,
        );
      }
    }

    if (doored) {
      // A doorway is where people stand, smoke, hang a light and fly-post.
      if (sink.rng.bool(0.72) && fits(site.base + 2.55, 0.35)) {
        wallLamp(sink, p.x, site.base + 2.55, p.z, yaw);
      }
      if (sink.rng.bool(0.6)) {
        const side = sink.rng.sign() * sink.rng.range(1.0, 1.5);
        const q = at(u + side);
        posterCluster(sink, q.x, site.base + 1.5, q.z, yaw, sink.rng.int(2, 4));
      }
      if (sink.rng.bool(0.55)) {
        const side = sink.rng.sign() * sink.rng.range(0.95, 1.35);
        const q = at(u + side);
        meterBox(sink, q.x, site.base + 1.55, q.z, yaw);
      }
    }
  }

  // --- Services -------------------------------------------------------------

  // Downpipes with a hopper where they actually meet the roof, and a wet fan on
  // the ground where they discharge.
  //
  // One near each corner, which is where a real roof drains, and then one every
  // seven metres of wall between them. Two per facade — what this used to do —
  // leaves a twenty-metre shopfront with a bare eighteen-metre middle, and a
  // vertical line is the single cheapest thing that stops a long wall reading as
  // one flat plane. Every pipe on a facade is the same buffer, so the extras are
  // instances in a group that already exists.
  const pipes = Math.max(1, Math.min(5, Math.round(length / 7)));
  for (let i = 0; i < pipes; i++) {
    const u =
      pipes === 1
        ? sink.rng.range(0.5, 1.3)
        : sink.rng.range(0.5, 1.2) + (i * (length - 2.2)) / (pipes - 1);
    const p = at(u);
    const n = faceNormal(yaw);
    wallPipe(sink, p.x + n.x * 0.09, p.z + n.z * 0.09, yaw, site.base, site.roofY - 0.1);
    gutterHopper(sink, p.x + n.x * 0.12, site.roofY - 0.28, p.z + n.z * 0.12, yaw);
    wallGrime(sink, p.x, site.base + sink.rng.range(0.5, 1.1), p.z, yaw, 0.45, 1.2, host);
    if (!sink.groundClaimed(p.x + n.x * 0.5, p.z + n.z * 0.5, 0)) {
      spillStain(sink, p.x + n.x * 0.45, p.z + n.z * 0.45, 0.4, 0x6f695e);
    }
  }

  // Conduit: one run at switch height, sometimes a second up near the eaves.
  if (length > 3.4) {
    const runs = length > 12 ? 2 + (sink.rng.bool(0.4) ? 1 : 0) : sink.rng.bool(0.45) ? 2 : 1;
    for (let i = 0; i < runs; i++) {
      const y =
        i === 0
          ? site.base + sink.rng.range(2.5, 3.0)
          : i === 1
            ? site.base + Math.max(3.4, height - sink.rng.range(0.7, 1.4))
            : site.base + height * 0.5 + sink.rng.range(-0.4, 0.4);
      if (y > site.roofY - 0.3) continue;
      const a = at(sink.rng.range(0.5, 1.1));
      const b = at(length - sink.rng.range(0.5, 1.1));
      const n = faceNormal(yaw);
      conduitBundle(
        sink,
        a.x + n.x * 0.06,
        a.z + n.z * 0.06,
        b.x + n.x * 0.06,
        b.z + n.z * 0.06,
        y,
        yaw,
        sink.rng.bool(0.4) ? 3 : 2,
      );
    }
  }

  // AC units on the storeys that have windows to serve, each with its cage and
  // the stain the condensate has left.
  if (site.floors > 1 || site.use === 'shop') {
    // Roughly one per two bays. These are the boxes that break a facade's
    // silhouette against the sky and the only thing on it that throws a hard
    // shadow down the masonry, so a long wall wants several.
    const units = Math.max(1, Math.min(6, Math.round(length / 5.5)));
    for (let i = 0; i < units; i++) {
      const u = sink.rng.range(1.1, Math.max(1.2, length - 1.1));
      const floor = site.floors > 1 ? sink.rng.int(1, site.floors - 1) : 0;
      const y = site.base + floor * site.floorHeight + sink.rng.range(1.9, 2.5);
      if (y > site.roofY - 0.5) continue;
      const p = at(u);
      const n = faceNormal(yaw);
      wallAc(sink, p.x + n.x * 0.22, y, p.z + n.z * 0.22, yaw);
      if (sink.rng.bool(0.7)) acCage(sink, p.x + n.x * 0.2, y, p.z + n.z * 0.2, yaw);
      dripStain(sink, p.x, y - 0.34, p.z, yaw, 0.7, sink.rng.range(1.2, 2.2));
    }
  }

  if (sink.rng.bool(0.42) && height > 3.1) {
    const p = at(sink.rng.range(0.9, Math.max(1, length - 0.9)));
    airVent(sink, p.x, site.base + sink.rng.range(2.2, height - 0.9), p.z, yaw);
  }

  // --- What the occupant hung on it ----------------------------------------

  // Counts scale with the wall, not with a coin flip: a thirty-metre facade with
  // one poster on it is emptier than a four-metre one with the same poster.
  const signs = shopfront ? Math.max(1, Math.round(length / 11)) : length > 14 ? 1 : 0;
  for (let i = 0; i < signs; i++) {
    if (!shopfront && sink.rng.bool(0.5)) continue;
    const y = site.base + sink.rng.range(2.7, 3.2);
    if (!fits(y, 0.6)) continue;
    const p = at(sink.rng.range(1.2, Math.max(1.3, length - 1.2)));
    bracketSign(sink, p.x, y, p.z, yaw, sink.rng.range(0.9, 1.4));
  }

  for (let i = 0; i < Math.max(1, Math.round(length / 7)); i++) {
    if (sink.rng.bool(0.35)) continue;
    const y = site.base + sink.rng.range(1.2, 2.0);
    if (!fits(y, 0.7)) continue;
    const p = at(sink.rng.range(1.0, Math.max(1.1, length - 1.0)));
    posterCluster(sink, p.x, y, p.z, yaw, sink.rng.int(1, 3));
  }

  for (let i = 0; i < Math.max(1, Math.round(length / 12)); i++) {
    if (sink.rng.bool(0.45)) continue;
    const p = at(sink.rng.range(1.2, Math.max(1.3, length - 1.2)));
    graffiti(sink, p.x, site.base + sink.rng.range(0.9, 1.6), p.z, yaw, sink.rng.range(1.0, 2.0));
  }

  // Grime patches spread along the wall as well as under its roof edge, because
  // the run of blank masonry between the services is what still reads as new.
  for (let i = 0; i < Math.round(length / 6); i++) {
    const p = at(sink.rng.range(0.6, Math.max(0.7, length - 0.6)));
    const high = sink.rng.bool(0.4) && height > 4.5;
    wallGrime(
      sink,
      p.x,
      site.base + (high ? sink.rng.range(3.2, Math.max(3.3, height - 0.8)) : sink.rng.range(0.4, 1.6)),
      p.z,
      yaw,
      sink.rng.range(0.8, 2.6),
      sink.rng.range(0.5, 1.5),
      host,
    );
  }

  // Dish and aerial go at the top, where they can see the sky.
  if (sink.rng.bool(site.use === 'home' ? 0.6 : 0.35) && height > 4) {
    const p = at(sink.rng.range(1.0, Math.max(1.1, length - 1.0)));
    const n = faceNormal(yaw);
    satelliteDish(
      sink,
      p.x + n.x * 0.3,
      site.roofY - sink.rng.range(0.9, 1.8),
      p.z + n.z * 0.3,
      yaw + sink.rng.range(-0.5, 0.5),
    );
  }
  if (sink.rng.bool(0.3) && height > 5) {
    const p = at(sink.rng.range(0.8, Math.max(0.9, length - 0.8)));
    tvAerial(sink, p.x, site.roofY - 0.2, p.z, yaw + sink.rng.range(-0.4, 0.4));
  }

  // Washing on the upper storeys of anywhere anybody lives.
  if ((site.use === 'home' || site.use === 'shop') && site.floors > 1 && sink.rng.bool(0.5)) {
    const y = site.base + site.floorHeight * sink.rng.int(1, site.floors - 1) + 1.6;
    if (!fits(y, 0.4)) return;
    const n = faceNormal(yaw);
    const a = at(sink.rng.range(0.8, 1.6));
    const b = at(length - sink.rng.range(0.8, 1.6));
    laundryLine(
      sink,
      new THREE.Vector3(a.x + n.x * 0.55, y, a.z + n.z * 0.55),
      new THREE.Vector3(b.x + n.x * 0.55, y, b.z + n.z * 0.55),
    );
  }
}

// ---------------------------------------------------------------------------
// Interior clutter: none of it collides, all of it under a metre or overhead
// ---------------------------------------------------------------------------

const FLOOR_MIX: LitterMix = { paper: 4, card: 2, can: 1, bottle: 1, rag: 2, crumb: 1 };

/**
 * Loose paper and wrappers over a floor, thickest at the edges.
 *
 * A swept-looking floor is the interior equivalent of a clean street. The bias
 * to the perimeter is the same rule as outdoors — nothing stays in the middle of
 * a room people walk through.
 */
export function floorLitter(sink: Sink, r: Rect, y: number, count: number): void {
  const total = scaled(sink, count);
  for (let i = 0; i < total; i++) {
    // Push samples towards a wall by taking the more extreme of two tries.
    const ax = sink.rng.next();
    const bx = sink.rng.next();
    const az = sink.rng.next();
    const bz = sink.rng.next();
    const u = Math.abs(ax - 0.5) > Math.abs(bx - 0.5) ? ax : bx;
    const v = Math.abs(az - 0.5) > Math.abs(bz - 0.5) ? az : bz;
    litterAt(
      sink,
      r.minX + u * (r.maxX - r.minX),
      y,
      r.minZ + v * (r.maxZ - r.minZ),
      FLOOR_MIX,
    );
  }
}

/** Fallen plaster and block on a floor: what a shelled room is carpeted in. */
export function floorDebris(
  sink: Sink,
  x: number,
  y: number,
  z: number,
  radius: number,
  count: number,
): void {
  const total = scaled(sink, count);
  for (let i = 0; i < total; i++) {
    const a = sink.rng.range(0, TAU);
    const r = radius * sink.rng.next() * sink.rng.next();
    const brick = sink.rng.bool(0.3);
    sink.addProp(
      crumbGeometry(sink.rng.int(0, 2)),
      transform(
        x + Math.cos(a) * r,
        y,
        z + Math.sin(a) * r,
        sink.rng.range(0, TAU),
        sink.rng.range(-0.3, 0.3),
        sink.rng.range(-0.3, 0.3),
        sink.rng.range(0.7, 1.6),
      ),
      {
        material: brick ? 'brick_red' : 'concrete_damaged',
        tier: 'detail',
        tint: brick ? 0xb89a84 : sink.rng.pick([0xd0c7b5, 0xbeb5a3]),
        clutter: true,
      },
    );
  }
}

/**
 * Beaded strip curtain in a doorway.
 *
 * Strands rather than a sheet, so the room behind still reads through it and the
 * AI's sightline through the door is not visually contradicted.
 */
export function beadedCurtain(
  sink: Sink,
  x: number,
  y: number,
  z: number,
  yaw: number,
  width: number,
  drop: number,
): void {
  const key = `beadcurtain|${snap(width, 0.1).toFixed(2)}|${snap(drop, 0.1).toFixed(2)}`;
  const geometry = cachedGeometry(key, () => {
    const parts: THREE.BufferGeometry[] = [];
    const w = snap(width, 0.1);
    const d = snap(drop, 0.1);
    const strands = Math.max(5, Math.round(w / 0.09));
    for (let i = 0; i < strands; i++) {
      const u = -w / 2 + (i + 0.5) * (w / strands);
      // Alternating lengths, because a level hem reads as a printed card.
      const length = d * (0.82 + ((i * 7) % 5) * 0.045);
      parts.push(
        placed(
          cylinderGeometry(0.009, 0.009, length, 3, 0.35, false),
          transform(u, -length / 2, 0),
        ),
      );
    }
    return mergeParts(parts);
  });
  sink.addProp(geometry, transform(x, y, z, yaw), {
    material: 'wood_painted',
    tier: 'detail',
    tint: sink.rng.pick([0x8a6f52, 0x9a8a6a, 0x6f7a82]),
  });
}

/** Ceiling fan on a stem: three blades, a motor housing and nothing else. */
export function ceilingFan(sink: Sink, x: number, y: number, z: number): void {
  const geometry = cachedGeometry('ceilingfan', () => {
    const parts: THREE.BufferGeometry[] = [
      placed(cylinderGeometry(0.022, 0.022, 0.3, 5, 0.5), transform(0, 0.15, 0)),
      placed(cylinderGeometry(0.1, 0.13, 0.09, 8, 0.4), transform(0, -0.02, 0)),
    ];
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU;
      parts.push(
        placed(
          boxGeometry(0.56, 0.014, 0.14, 0.004, 0.6),
          transform(Math.cos(a) * 0.36, -0.05, Math.sin(a) * 0.36, -a, 0, 0.06),
        ),
      );
    }
    return mergeParts(parts);
  });
  sink.addProp(geometry, transform(x, y - 0.3, z, sink.rng.range(0, TAU)), {
    material: 'wood_painted',
    tier: 'detail',
    tint: sink.rng.pick([0xa89a84, 0x9aa0a4, 0xb0a894]),
  });
}

/**
 * Paper on an interior wall: a calendar, a price list, a curled poster.
 *
 * One quad, and it is the difference between a plaster wall and a room somebody
 * works in. Placed a centimetre off the liner so it cannot z-fight with it.
 */
export function wallPaper(
  sink: Sink,
  x: number,
  y: number,
  z: number,
  yaw: number,
  count = 2,
): void {
  const d = faceAlong(yaw);
  const n = faceNormal(yaw);
  for (let i = 0; i < count; i++) {
    const u = sink.rng.range(-0.7, 0.7);
    const width = snap(sink.rng.range(0.26, 0.46), 0.04);
    const height = snap(sink.rng.range(0.34, 0.6), 0.04);
    sink.addStatic(
      placed(
        planeGeometry(width, height, 0.5),
        transform(
          x + d.x * u + n.x * (0.012 + i * 0.003),
          y + sink.rng.range(-0.22, 0.22),
          z + d.z * u + n.z * (0.012 + i * 0.003),
          yaw,
          0,
          sink.rng.range(-0.06, 0.06),
        ),
      ),
      {
        material: 'plaster_white',
        tier: 'detail',
        tint: sink.rng.pick([0xe0d8c2, 0xcfc4a8, 0xc8cdd2, 0xd8c0a8]),
        mottle: 0.3,
      },
    );
  }
}

/**
 * Bulb on a flex, hung off the ceiling and pulled sideways by its cord.
 *
 * Not a light source — the room lighting is already authored — but the single
 * cheapest thing that reads as an occupied interior, and its cord breaks the
 * empty volume between ceiling and furniture that otherwise reads as a box.
 */
export function bareBulb(sink: Sink, x: number, y: number, z: number, drop: number): void {
  const d = snap(drop, 0.1);
  const geometry = cachedGeometry(`barebulb|${d.toFixed(2)}`, () =>
    mergeParts([
      placed(cylinderGeometry(0.005, 0.005, d, 3, 0.4, false), transform(0, -d / 2, 0)),
      placed(cylinderGeometry(0.021, 0.026, 0.055, 6, 0.3), transform(0, -d - 0.028, 0)),
      placed(cylinderGeometry(0.034, 0.022, 0.075, 6, 0.3), transform(0, -d - 0.09, 0)),
      placed(cylinderGeometry(0.02, 0.032, 0.03, 6, 0.3), transform(0, -d - 0.142, 0)),
    ]),
  );
  sink.addProp(
    geometry,
    transform(x, y, z, sink.rng.range(0, TAU), sink.rng.range(-0.05, 0.05), sink.rng.range(-0.05, 0.05)),
    { material: 'plaster_white', tier: 'detail', tint: 0xd8d0be },
  );
}

/** Chair or stool that has been knocked over and left there. */
export function brokenChair(sink: Sink, x: number, y: number, z: number, yaw: number): void {
  const geometry = cachedGeometry('brokenchair', () =>
    mergeParts([
      placed(boxGeometry(0.4, 0.035, 0.38, 0.012, 0.6), transform(0, 0, 0)),
      placed(boxGeometry(0.38, 0.4, 0.03, 0.012, 0.6), transform(0, 0.2, -0.18, 0, 0.1)),
      placed(boxGeometry(0.03, 0.4, 0.03, 0.008, 0.5), transform(-0.16, -0.2, 0.15)),
      placed(boxGeometry(0.03, 0.4, 0.03, 0.008, 0.5), transform(0.16, -0.2, 0.15)),
      // One leg snapped off and lying beside it.
      placed(boxGeometry(0.03, 0.29, 0.03, 0.008, 0.5), transform(0.3, -0.36, -0.1, 0.4, 0, 1.5)),
    ]),
  );
  sink.addProp(geometry, transform(x, y + 0.2, z, yaw, Math.PI / 2 + sink.rng.range(-0.3, 0.3)), {
    material: 'wood_painted',
    tier: 'detail',
    tint: sink.rng.pick([0xa8987c, 0x9aa098, 0xb0a084]),
  });
}

// ---------------------------------------------------------------------------
// Object clutter. Small enough to be walked over, so none of it collides.
// ---------------------------------------------------------------------------

/** Everything in this section shares one placement contract. */
type Placer = (sink: Sink, x: number, z: number, yaw: number, y?: number) => void;

export const bucket: Placer = (sink, x, z, yaw, y) => {
  const geometry = cachedGeometry('bucket', () => {
    const parts: THREE.BufferGeometry[] = [
      placed(cylinderGeometry(0.15, 0.115, 0.27, 9, 0.45, false), transform(0, 0.135, 0)),
      placed(cylinderGeometry(0.115, 0.115, 0.02, 9, 0.4), transform(0, 0.01, 0)),
      placed(cylinderGeometry(0.158, 0.158, 0.022, 9, 0.4), transform(0, 0.265, 0)),
    ];
    for (const s of [-1, 1]) {
      parts.push(placed(boxGeometry(0.02, 0.13, 0.02, 0.005, 0.3), transform(s * 0.15, 0.32, 0)));
    }
    parts.push(placed(boxGeometry(0.3, 0.018, 0.018, 0.005, 0.3), transform(0, 0.38, 0)));
    return mergeParts(parts);
  });
  sink.addProp(geometry, transform(x, y ?? sink.ground(x, z), z, yaw, 0, sink.rng.range(-0.05, 0.05)), {
    material: 'metal_panel',
    tier: 'detail',
    tint: sink.rng.pick([0x9aa8a4, 0xb0a48c, 0x8f9aa4, 0xa89a84]),
  });
};

export const basin: Placer = (sink, x, z, yaw, y) => {
  const geometry = cachedGeometry('basin', () =>
    latheGeometry(
      'basin',
      [
        [0, 0],
        [0.24, 0.005],
        [0.3, 0.07],
        [0.34, 0.14],
        [0.35, 0.16],
        [0.33, 0.155],
        [0.28, 0.075],
        [0.22, 0.02],
        [0, 0.018],
      ],
      10,
      0.6,
    ),
  );
  sink.addProp(geometry, transform(x, y ?? sink.ground(x, z), z, yaw, 0, sink.rng.range(-0.08, 0.08)), {
    material: 'metal_panel',
    tier: 'detail',
    tint: sink.rng.pick([0xa8b0aa, 0xb8a894, 0x94a0a8]),
  });
};

export const plasticChair: Placer = (sink, x, z, yaw, y) => {
  const geometry = cachedGeometry('plasticchair', () => {
    const parts: THREE.BufferGeometry[] = [
      placed(boxGeometry(0.42, 0.035, 0.4, 0.015, 0.6), transform(0, 0.44, 0)),
      placed(boxGeometry(0.4, 0.44, 0.035, 0.015, 0.6), transform(0, 0.66, -0.19, 0, -0.12)),
    ];
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        parts.push(
          placed(
            boxGeometry(0.03, 0.44, 0.03, 0.008, 0.5),
            transform(sx * 0.17, 0.22, sz * 0.16, 0, 0, sx * 0.05),
          ),
        );
      }
    }
    return mergeParts(parts);
  });
  sink.addProp(geometry, transform(x, y ?? sink.ground(x, z), z, yaw), {
    material: 'wood_painted',
    tier: 'detail',
    tint: sink.rng.pick([0x8fa0a8, 0xa8907a, 0x9aa88f, 0xb0a088]),
  });
};

export const plasticStool: Placer = (sink, x, z, yaw, y) => {
  const geometry = cachedGeometry('plasticstool', () => {
    const parts: THREE.BufferGeometry[] = [
      placed(cylinderGeometry(0.16, 0.14, 0.03, 9, 0.4), transform(0, 0.29, 0)),
    ];
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU;
      parts.push(
        placed(
          boxGeometry(0.028, 0.29, 0.028, 0.006, 0.4),
          transform(Math.cos(a) * 0.12, 0.145, Math.sin(a) * 0.12, -a, 0, 0.08),
        ),
      );
    }
    return mergeParts(parts);
  });
  sink.addProp(geometry, transform(x, y ?? sink.ground(x, z), z, yaw), {
    material: 'wood_painted',
    tier: 'detail',
    tint: sink.rng.pick([0x9aa8a0, 0xb09a80, 0x8f98a8]),
  });
};

/** Open-slatted crate with produce heaped in it: the market's unit of dressing. */
export function produceCrate(sink: Sink, x: number, z: number, yaw: number, y?: number): void {
  const geometry = cachedGeometry('producecrate', () => {
    const parts: THREE.BufferGeometry[] = [];
    const w = 0.52;
    const d = 0.36;
    const h = 0.2;
    parts.push(placed(boxGeometry(w, 0.02, d, 0.006, 0.5), transform(0, 0.012, 0)));
    for (const s of [-1, 1]) {
      parts.push(placed(boxGeometry(w, h, 0.018, 0.005, 0.5), transform(0, h / 2, s * d * 0.5)));
      parts.push(placed(boxGeometry(0.018, h, d, 0.005, 0.5), transform(s * w * 0.5, h / 2, 0)));
    }
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        parts.push(
          placed(
            boxGeometry(0.03, h + 0.03, 0.03, 0.006, 0.4),
            transform(sx * (w * 0.5 - 0.01), h / 2, sz * (d * 0.5 - 0.01)),
          ),
        );
      }
    }
    return mergeParts(parts);
  });
  const base = y ?? sink.ground(x, z);
  sink.addProp(geometry, transform(x, base, z, yaw), {
    material: 'wood_plank',
    tier: 'detail',
    tint: sink.rng.pick([0xc8b896, 0xb8a884, 0xd0c0a0]),
  });

  const heap = cachedGeometry('produceheap', () => {
    const geo = new THREE.IcosahedronGeometry(0.2, 1);
    geo.scale(1.15, 0.42, 0.8);
    return geo;
  });
  sink.addProp(heap, transform(x, base + 0.2, z, yaw, 0, 0, sink.rng.range(0.9, 1.15)), {
    material: 'plaster_white',
    tier: 'detail',
    tint: sink.rng.pick([0xb8632f, 0x8f9a3a, 0xc4a02a, 0x7a5a3a, 0xa8483a]),
  });
}

/** Sacks slumped against something, three to five of them, never squared up. */
export function sackPile(sink: Sink, x: number, z: number, yaw: number, count = 4, y?: number): void {
  const geometry = cachedGeometry('cluttersack', () => {
    const geo = new THREE.IcosahedronGeometry(0.27, 1);
    geo.scale(1, 0.82, 0.78);
    return geo;
  });
  const base = y ?? sink.ground(x, z);
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  let row = 0;
  let placedInRow = 0;
  for (let i = 0; i < count; i++) {
    const perRow = row === 0 ? 3 : 2;
    const along = (placedInRow - (perRow - 1) / 2) * 0.42 + sink.rng.range(-0.05, 0.05);
    const away = sink.rng.range(-0.06, 0.06);
    sink.addProp(
      geometry,
      transform(
        x + cos * along + sin * away,
        base + 0.21 + row * 0.34,
        z - sin * along + cos * away,
        sink.rng.range(0, TAU),
        sink.rng.range(-0.18, 0.18),
        sink.rng.range(-0.18, 0.18),
        sink.rng.range(0.85, 1.15),
      ),
      {
        material: 'sandbag',
        tier: 'detail',
        tint: sink.rng.pick([0xd8ceb4, 0xc9bda0, 0xd1c4a6, 0xbfb193]),
      },
    );
    placedInRow++;
    if (placedInRow >= perRow) {
      placedInRow = 0;
      row++;
    }
  }
}

/** Tyres lying loose and leaning, as opposed to the neat stack in `Props`. */
export function tyreSprawl(sink: Sink, x: number, z: number, yaw: number, count = 4): void {
  const geometry = cachedGeometry('clutter|tyre', () => {
    const geo = new THREE.TorusGeometry(0.3, 0.11, 5, 11);
    geo.rotateX(Math.PI / 2);
    return geo;
  });
  const base = sink.ground(x, z);
  for (let i = 0; i < count; i++) {
    const a = sink.rng.range(0, TAU);
    const r = sink.rng.range(0, 0.75);
    const lean = sink.rng.bool(0.3);
    sink.addProp(
      geometry,
      transform(
        x + Math.cos(a) * r,
        base + (lean ? 0.3 : 0.1),
        z + Math.sin(a) * r,
        yaw + sink.rng.range(0, TAU),
        lean ? sink.rng.range(1.2, 1.5) : sink.rng.range(-0.14, 0.14),
        sink.rng.range(-0.14, 0.14),
      ),
      { material: 'rubber_tire', tier: 'detail', tint: 0xa8a8a8, tile: 1.0 },
    );
  }
}

/** Timber offcuts leaned against a wall in a bundle. */
export function woodPile(sink: Sink, x: number, z: number, yaw: number, count = 6): void {
  const base = sink.ground(x, z);
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  for (let i = 0; i < count; i++) {
    const length = 1.5 + Math.round(sink.rng.range(0, 3)) * 0.25;
    const along = sink.rng.range(-0.35, 0.35);
    sink.addProp(
      boxGeometry(0.08, length, 0.05, 0.01, 1.2),
      transform(
        x + cos * along + sin * 0.14,
        base + length * 0.47,
        z - sin * along + cos * 0.14,
        yaw + sink.rng.range(-0.2, 0.2),
        sink.rng.range(0.1, 0.22),
        sink.rng.range(-0.12, 0.12),
      ),
      {
        material: 'wood_plank',
        tier: 'detail',
        tint: sink.rng.pick([0xbfae90, 0xa89880, 0xcdbb98]),
      },
    );
  }
}

/** Scaffold tubes and pipe lengths lying in a heap on the ground. */
export function pipeBundle(sink: Sink, x: number, z: number, yaw: number, count = 5): void {
  const base = sink.ground(x, z);
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  for (let i = 0; i < count; i++) {
    const length = 2 + Math.round(sink.rng.range(0, 2)) * 0.5;
    const across = (i - count / 2) * 0.1 + sink.rng.range(-0.03, 0.03);
    const stack = i > count * 0.6 ? 0.09 : 0;
    sink.addProp(
      cylinderGeometry(0.045, 0.045, length, 6, 1.0),
      transform(
        x + sin * across,
        base + 0.045 + stack,
        z + cos * across,
        yaw + sink.rng.range(-0.06, 0.06),
        0,
        Math.PI / 2,
      ),
      { material: 'metal_rusted', tier: 'detail', tint: sink.rng.bool() ? 0x9a9084 : 0x8a7a68 },
    );
  }
}

/**
 * Irregular crate stack. Crates are rotated, offset and sunk into each other,
 * because a plumb stack of aligned boxes is the single clearest tell that a
 * human placed props on a level.
 */
export function crateStack(
  sink: Sink,
  x: number,
  z: number,
  yaw: number,
  count = 3,
  opts: { collide?: boolean; y?: number } = {},
): void {
  const base = opts.y ?? sink.ground(x, z);
  const sizes = [0.72, 0.62, 0.54, 0.46];
  let stack = 0;
  for (let i = 0; i < count; i++) {
    const size = sizes[Math.min(sizes.length - 1, i + sink.rng.int(0, 1))];
    const geometry = crateBuffer(size);
    sink.addProp(
      geometry,
      transform(
        x + sink.rng.range(-0.09, 0.09),
        base + stack + size / 2,
        z + sink.rng.range(-0.09, 0.09),
        yaw + sink.rng.range(-0.45, 0.45),
        sink.rng.range(-0.03, 0.03),
        sink.rng.range(-0.03, 0.03),
      ),
      { material: 'wood_crate', tier: 'detail', tint: sink.rng.pick([0xd9c9a8, 0xc9b795, 0xcfc0a0]) },
    );
    stack += size * 0.94;
  }
  // Below waist height a stack stays walk-over: a knee-high crate that stops the
  // player dead is worse than one they clip through.
  if (opts.collide && stack > 0.8) {
    sink.addCollider(
      new THREE.Vector3(x, base + stack / 2, z),
      new THREE.Vector3(0.4, stack / 2, 0.4),
      yaw,
      { surface: 'wood' },
    );
  }
}

/** Slatted crate buffer shared with `Props.woodCrate`, so copies instance together. */
function crateBuffer(size: number): THREE.BufferGeometry {
  return cachedGeometry(`clutter|crate|${size.toFixed(2)}`, () => {
    const parts: THREE.BufferGeometry[] = [boxGeometry(size, size, size, 0.02, 1.4).clone()];
    const rail = size * 0.085;
    for (const axis of [0, 2]) {
      for (const s1 of [-1, 1]) {
        for (const s2 of [-1, 1]) {
          const dims: [number, number, number] =
            axis === 0 ? [size + 0.004, rail, rail] : [rail, rail, size + 0.004];
          const pos =
            axis === 0
              ? new THREE.Vector3(0, (s1 * size) / 2, (s2 * size) / 2)
              : new THREE.Vector3((s1 * size) / 2, (s2 * size) / 2, 0);
          parts.push(
            placed(boxGeometry(dims[0], dims[1], dims[2], 0.01, 1.2), transform(pos.x, pos.y, pos.z)),
          );
        }
      }
    }
    return mergeParts(parts);
  });
}

/** Tarp lashed over a stack, with rope over the top and weights on the corners. */
export function tiedTarp(
  sink: Sink,
  x: number,
  y: number,
  z: number,
  yaw: number,
  width: number,
  depth: number,
  material: MaterialId = 'fabric_canvas',
): void {
  const w = snap(width, 0.2);
  const d = snap(depth, 0.2);
  const key = `tiedtarp|${w.toFixed(2)}|${d.toFixed(2)}`;
  // Flipped, so the sag becomes a bulge over whatever the tarp is covering.
  const geometry = cachedGeometry(key, () => {
    const cloth = saggingCloth(w, d, 0.13);
    cloth.rotateX(Math.PI);
    return cloth;
  });
  sink.addProp(geometry, transform(x, y, z, yaw), {
    material,
    tier: 'detail',
    castShadow: false,
    tint: material === 'camo_net' ? 0x8d8b6f : sink.rng.pick([0x9aa08c, 0x8a7f6a, 0xa89880]),
  });
  for (const s of [-1, 1]) {
    sink.addStatic(
      placed(
        cylinderGeometry(0.011, 0.011, depth * 1.1, 4, 0.6),
        transform(x + Math.cos(yaw) * s * width * 0.3, y + 0.02, z - Math.sin(yaw) * s * width * 0.3, yaw, 0, Math.PI / 2),
      ),
      { material: 'metal_rusted', tier: 'detail', tint: 0x6a6154 },
    );
  }
}

/** Ladder leaned against a wall, feet kicked out from the base. */
export function leaningLadder(
  sink: Sink,
  x: number,
  z: number,
  yaw: number,
  height: number,
): void {
  const rungs = Math.max(3, Math.floor(height / 0.32));
  const geometry = cachedGeometry(`leanladder|${height.toFixed(1)}`, () => {
    const parts: THREE.BufferGeometry[] = [];
    for (const s of [-1, 1]) {
      parts.push(placed(boxGeometry(0.05, height, 0.045, 0.01, 1.2), transform(s * 0.2, height / 2, 0)));
    }
    for (let i = 0; i < rungs; i++) {
      parts.push(
        placed(
          cylinderGeometry(0.016, 0.016, 0.4, 5, 0.8),
          transform(0, 0.22 + i * 0.32, 0, 0, 0, Math.PI / 2),
        ),
      );
    }
    return mergeParts(parts);
  });
  const lean = sink.rng.range(0.16, 0.24);
  sink.addProp(
    geometry,
    transform(x, sink.ground(x, z), z, yaw, lean, sink.rng.range(-0.04, 0.04)),
    { material: 'wood_plank', tier: 'detail', tint: sink.rng.pick([0xb6a284, 0xa08c6e]) },
  );
}

/** Handcart: the barrow every market on earth moves its stock with. */
export function handcart(sink: Sink, x: number, z: number, yaw: number): void {
  const geometry = cachedGeometry('handcart', () => {
    const parts: THREE.BufferGeometry[] = [
      placed(boxGeometry(1.35, 0.05, 0.78, 0.012, 1.2), transform(0, 0.52, 0)),
      placed(boxGeometry(1.35, 0.16, 0.04, 0.01, 1.0), transform(0, 0.6, -0.37)),
      placed(boxGeometry(1.35, 0.16, 0.04, 0.01, 1.0), transform(0, 0.6, 0.37)),
    ];
    for (const s of [-1, 1]) {
      parts.push(placed(boxGeometry(0.07, 0.44, 0.07, 0.012, 0.8), transform(s * 0.5, 0.28, 0.3)));
      parts.push(placed(boxGeometry(0.06, 0.06, 0.62, 0.01, 0.8), transform(0.72, 0.56, s * 0.3)));
    }
    const wheel = new THREE.TorusGeometry(0.24, 0.055, 5, 11);
    wheel.rotateY(Math.PI / 2);
    for (const s of [-1, 1]) {
      parts.push(placed(wheel.clone(), transform(-0.3, 0.24, s * 0.42)));
      parts.push(
        placed(cylinderGeometry(0.03, 0.03, 0.16, 6, 0.5), transform(-0.3, 0.24, s * 0.42, 0, 0, Math.PI / 2)),
      );
    }
    wheel.dispose();
    return mergeParts(parts);
  });
  sink.addProp(geometry, transform(x, sink.ground(x, z), z, yaw), {
    material: 'wood_plank',
    tier: 'detail',
    tint: sink.rng.pick([0xb0a084, 0x9a8a70]),
  });
}

/** Wheelbarrow, tipped forward onto its nose more often than not. */
export function wheelbarrow(sink: Sink, x: number, z: number, yaw: number): void {
  const geometry = cachedGeometry('wheelbarrow', () => {
    const parts: THREE.BufferGeometry[] = [
      placed(boxGeometry(0.62, 0.28, 0.82, 0.05, 1.0), transform(0, 0.34, 0.05)),
      placed(boxGeometry(0.05, 0.05, 1.3, 0.01, 0.9), transform(-0.24, 0.3, -0.35)),
      placed(boxGeometry(0.05, 0.05, 1.3, 0.01, 0.9), transform(0.24, 0.3, -0.35)),
      placed(boxGeometry(0.06, 0.3, 0.06, 0.01, 0.6), transform(-0.24, 0.15, 0.2)),
      placed(boxGeometry(0.06, 0.3, 0.06, 0.01, 0.6), transform(0.24, 0.15, 0.2)),
    ];
    const wheel = new THREE.TorusGeometry(0.16, 0.05, 5, 10);
    wheel.rotateY(Math.PI / 2);
    parts.push(placed(wheel, transform(0, 0.16, 0.6)));
    return mergeParts(parts);
  });
  sink.addProp(geometry, transform(x, sink.ground(x, z), z, yaw, 0, sink.rng.range(-0.06, 0.06)), {
    material: 'metal_rusted',
    tier: 'detail',
    tint: sink.rng.pick([0x9a8a76, 0x8a7a64]),
  });
}

/** Bicycle leaned on something. Thin, so it is the one prop that reads instantly. */
export function bicycle(sink: Sink, x: number, z: number, yaw: number): void {
  const geometry = cachedGeometry('bicycle', () => {
    const parts: THREE.BufferGeometry[] = [];
    const wheel = new THREE.TorusGeometry(0.33, 0.022, 4, 12);
    wheel.rotateY(Math.PI / 2);
    for (const dz of [-0.53, 0.53]) {
      parts.push(placed(wheel.clone(), transform(0, 0.33, dz)));
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI;
        parts.push(
          placed(
            cylinderGeometry(0.005, 0.005, 0.64, 3, 0.5),
            transform(0, 0.33, dz, 0, 0, a),
          ),
        );
      }
    }
    wheel.dispose();
    const tube = (length: number): THREE.BufferGeometry =>
      cylinderGeometry(0.018, 0.018, length, 4, 0.6);
    parts.push(placed(tube(0.66), transform(0, 0.52, 0.16, 0, 0, 0)));
    parts.push(placed(tube(0.6), transform(0, 0.52, -0.16, 0, 0, 0)));
    parts.push(placed(tube(0.58), transform(0, 0.62, 0.0, 0, 0, Math.PI / 2)));
    parts.push(placed(tube(0.5), transform(0, 0.36, -0.28, 0, 0, Math.PI / 2)));
    parts.push(placed(boxGeometry(0.05, 0.05, 0.24, 0.01, 0.4), transform(0, 0.66, 0.14)));
    parts.push(placed(boxGeometry(0.34, 0.025, 0.025, 0.006, 0.4), transform(0, 0.94, 0.5)));
    parts.push(placed(tube(0.42), transform(0, 0.75, 0.5, 0, 0, 0)));
    return mergeParts(parts);
  });
  // Bicycles do not stand up on their own; this one is propped and off plumb.
  sink.addProp(
    geometry,
    transform(x, sink.ground(x, z), z, yaw, 0, sink.rng.range(0.1, 0.2) * sink.rng.sign()),
    { material: 'metal_rusted', tier: 'detail', tint: sink.rng.pick([0x6a6a70, 0x7a6a5a, 0x5a6a68]) },
  );
}

/**
 * One offcut of shade cloth slung between two roof edges.
 *
 * `saggingCloth` dips in the middle of both axes, which leaves the two long
 * edges straight and level. Across seven metres of street that silhouette is a
 * plank. Here the whole strip hangs on one curve so both edges fall together,
 * with a ripple down the span and a wander in the width so they are never
 * parallel and the cloth never presents a flat face to the sun.
 */
function shadeStripGeometry(
  width: number,
  depth: number,
  sag: number,
  variant: number,
): THREE.BufferGeometry {
  const cols = 10;
  const rows = 4;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let r = 0; r <= rows; r++) {
    const v = r / rows;
    for (let c = 0; c <= cols; c++) {
      const u = c / cols;
      const hang = -sag * Math.pow(Math.sin(u * Math.PI), 0.75);
      // Two ripples an octave apart and out of phase across the width. With the
      // normals leaned skyward a smooth catenary takes one sun value over its
      // whole area and comes back as a sheet of coloured paper; the shading only
      // varies where the surface does, so the surface has to.
      const ripple =
        (Math.sin(u * 6.1 + variant * 2.3 + v * 2.9) * 0.26 +
          Math.sin(u * 13.7 + variant * 1.1 - v * 4.3) * 0.11) *
        sag;
      const across = depth * (v - 0.5) * (1 + Math.sin(u * 4.2 + variant * 1.7) * 0.16);
      const wander = Math.sin(u * 2.7 + variant * 3.1) * depth * 0.21;
      positions.push((u - 0.5) * width, hang + ripple - Math.sin(v * Math.PI) * sag * 0.12, across + wander);
      uvs.push(u * width, v * depth);
    }
  }
  const stride = cols + 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = r * stride + c;
      indices.push(a, a + 1, a + stride, a + 1, a + stride + 1, a + stride);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Shade slung over a lane, as a run of separate strips rather than one sheet.
 *
 * Woven canvas, not camo netting: an alpha-tested net tiles its holes at 2 m,
 * which from underneath reads as a black lattice. But one canvas sheet the width
 * of the street is worse still — it roofs the lane over with a slab and takes
 * the sky with it. Real shade over a souk is offcuts of different cloth strung
 * at different heights with daylight between them, which is also what keeps the
 * lane below dappled instead of uniformly dark. This is the one piece of small
 * dressing worth a shadow: that dapple is most of why the cloth is there.
 */
export function shadeCloth(
  sink: Sink,
  x: number,
  y: number,
  z: number,
  yaw: number,
  width: number,
  depth: number,
): void {
  const strips = Math.max(2, Math.round(depth / 1.15));
  const pitch = depth / strips;
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  for (let i = 0; i < strips; i++) {
    // A gap of a fifth of the pitch between strips, and each one hung its own
    // handspan off the last so the run never reads as one plane.
    //
    // Coarse ladder on both dimensions and only two shapes: every distinct
    // buffer here is another map-wide instanced draw, and these are the one
    // piece of small dressing that casts, so each also costs a shadow draw per
    // cascade. Instance scale would collapse them to one buffer, but three
    // transforms instance normals by the instance matrix rather than by its
    // inverse transpose, and a five-to-one stretch would tip every normal on
    // its side.
    const w = snap(width * sink.rng.range(0.82, 1.0), 1);
    const d = snap(pitch * 0.8, 0.4);
    const variant = sink.rng.int(0, 1);
    const key = `shadestrip|${w.toFixed(2)}|${d.toFixed(2)}|${variant}`;
    // The sag is deliberately deep: seen from head height a shallow strip is a
    // straight edge, which reads as a plank rather than as hanging cloth. One
    // set of triangles, wound to face the street, because the wind material is
    // already two-sided and a doubled sheet only puts two coplanar faces with
    // opposing normals in the same draw to fight over the fragment.
    const geometry = cachedGeometry(key, () =>
      skywardNormals(shadeStripGeometry(w, d, 0.33 + variant * 0.11, variant)),
    );
    const along = (i + 0.5) * pitch - depth / 2;
    const across = sink.rng.range(-0.25, 0.25);
    const cx = x + along * sin + across * cos;
    const cy = y + sink.rng.range(-0.22, 0.16);
    const cz = z + along * cos - across * sin;
    sink.addProp(geometry, transform(cx, cy, cz, yaw + sink.rng.range(-0.09, 0.09)), {
      material: 'fabric_canvas',
      tier: 'detail',
      castShadow: true,
      receiveShadow: false,
      wind: true,
      // Light, but not white: with both faces shaded skyward these take close to
      // the full sun value, and a near-white sheet then blows out against the
      // buildings instead of sitting under them. Spread wide across the run —
      // these are offcuts of whatever was to hand, and six shades of the same
      // cream read as one printed sheet cut into strips.
      tint: sink.rng.pick([0xc9c0a6, 0xa8a894, 0xd2c5a4, 0xb2b6ae, 0xc0a98c, 0xbfbdb0]),
      global: true,
    });
    // The wire it is slung from, running the full span so the strip is attached
    // to the buildings either side rather than hovering between them.
    const half = w / 2 + 0.35;
    sink.addStatic(
      catenaryGeometry(
        new THREE.Vector3(cx - half * cos, cy + 0.05, cz + half * sin),
        new THREE.Vector3(cx + half * cos, cy + 0.05, cz - half * sin),
        0.12,
        0.02,
        6,
      ),
      { material: 'metal_rusted', tier: 'detail', tint: 0x6d6459 },
    );
  }
}

/**
 * Cloth folded over a line, in section: back panel, over the line, front panel.
 *
 * A single hanging quad is the cheap version and it does not survive being
 * looked at — with nothing above its top edge it reads as a slab of dark hung in
 * mid-air rather than as a towel over a rail. The fold is what sells it: the
 * crest catches the light from above while both panels fall away from it, so the
 * silhouette has a top rather than stopping. Twelve more triangles.
 */
function drapedClothGeometry(width: number, drop: number, variant: number): THREE.BufferGeometry {
  const cols = 4;
  // Half-thickness of the line the cloth is over, which sets how open the fold is.
  const t = 0.055;
  const back = drop * 0.44;
  const profile: Array<[number, number]> = [
    [t * 1.15, -back],
    [t * 1.02, -back * 0.5],
    [t * 0.92, -t * 0.3],
    [0, t * 0.6],
    [-t * 0.92, -t * 0.3],
    [-t * 1.0, -drop * 0.34],
    [-t * 1.12, -drop * 0.71],
    [-t * 1.26, -drop],
  ];
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const stride = cols + 1;
  for (let r = 0; r < profile.length; r++) {
    const [pz, py] = profile[r];
    const fall = Math.max(0, -py) / Math.max(drop, 0.01);
    for (let c = 0; c <= cols; c++) {
      const u = c / cols;
      // Free cloth swings; cloth pinched over the line does not, so both the
      // sideways wander and the sag grow with how far below the fold it hangs.
      const wander = Math.sin(u * 5.3 + variant * 2.1) * width * 0.06 * fall;
      const sag = -Math.sin(u * Math.PI) * drop * 0.09 * fall;
      positions.push((u - 0.5) * width * (1 + fall * 0.06), py + sag, pz + wander);
      uvs.push(u * width, py);
      if (r > 0 && c < cols) {
        const a = (r - 1) * stride + c;
        indices.push(a, a + stride, a + 1, a + 1, a + stride, a + stride + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  // A vertical sheet indoors faces a wall a metre away and takes almost nothing
  // from the sky, so a small skyward lean is what keeps it off black.
  const normal = geometry.getAttribute('normal') as THREE.BufferAttribute;
  for (let i = 0; i < normal.count; i++) {
    const nx = normal.getX(i);
    const ny = normal.getY(i) + 0.4;
    const nz = normal.getZ(i);
    const length = Math.hypot(nx, ny, nz) || 1;
    normal.setXYZ(i, nx / length, ny / length, nz / length);
  }
  normal.needsUpdate = true;
  return geometry;
}

/**
 * Three rag sizes and two cuts, and nothing else.
 *
 * Every distinct buffer that goes through the wind material is a map-wide draw
 * call whether it has one copy or three hundred, because animated geometry can
 * never be folded into a merged batch. Snapping the requested size to a ladder
 * of a tenth of a metre produced fifty-odd single-copy buffers and fifty draw
 * calls; six buffers draw the same hundred rags in six. The variety the eye
 * actually reads — yaw, tint, height, which way it hangs — is per-instance and
 * free.
 */
const RAG_SIZES: ReadonlyArray<readonly [number, number]> = [
  [0.42, 0.58],
  [0.6, 0.86],
  [0.82, 1.2],
];

const RAG_SCALE = /* @__PURE__ */ new THREE.Vector3();

/**
 * Rag or towel hung over a rail, line or balcony edge. Cheap, animated, and it
 * breaks a straight horizontal edge better than anything solid.
 */
export function hangingRag(
  sink: Sink,
  x: number,
  y: number,
  z: number,
  yaw: number,
  width = 0.5,
  drop = 0.7,
): void {
  let pick = 0;
  for (let i = 1; i < RAG_SIZES.length; i++) {
    if (Math.abs(RAG_SIZES[i][0] - width) < Math.abs(RAG_SIZES[pick][0] - width)) pick = i;
  }
  const [w, base] = RAG_SIZES[pick];
  const variant = sink.rng.int(0, 1);
  const geometry = cachedGeometry(`hangrag|${pick}|${variant}`, () =>
    drapedClothGeometry(w, base, variant),
  );
  // Length varies by scaling the instance rather than by building another
  // buffer, so a run of rags on one line still hangs unevenly.
  const stretch = Math.min(1.45, Math.max(0.7, drop / base));
  const matrix = transform(x, y, z, yaw, 0, 0, RAG_SCALE.set(1, stretch, 1));
  sink.addProp(geometry, matrix, {
    material: 'fabric_canvas',
    tier: 'detail',
    castShadow: false,
    wind: true,
    global: true,
    tint: sink.rng.pick([0xe2dccb, 0xcfc6b2, 0xd8dee2, 0xc9b9a6, 0xb4c4cc]),
  });
}
