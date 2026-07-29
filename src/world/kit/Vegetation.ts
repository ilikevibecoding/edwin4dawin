import * as THREE from 'three';
import {
  type Rect,
  type Sink,
  boxGeometry,
  cachedGeometry,
  cylinderGeometry,
  mergeParts,
  placed,
  planeGeometry,
  ribbonGeometry,
  transform,
} from './Kit';

/**
 * Dry-climate vegetation.
 *
 * All of it is alpha-tested cards and ribbons on the `camo_net` material, which
 * is the one procgen surface with holes in it. Cards are cheap and, crucially,
 * instanced: the whole map's planting is a handful of draw calls, animated for
 * free by the vertex wind in the builder's foliage material.
 *
 * Density scales with `config.vegetationDensity` so the low tier drops the
 * scatter without changing the silhouette of the hero plants.
 */

const FOLIAGE_TINTS = [0x8f8455, 0x9c9060, 0x7d7448, 0xa39868];

/** Two crossed cards plus a third at 45 degrees, so the bush has no flat angle. */
function bushGeometry(variant: number): THREE.BufferGeometry {
  return cachedGeometry(`bush|${variant}`, () => {
    const parts: THREE.BufferGeometry[] = [];
    const width = 0.95 + variant * 0.13;
    const height = 0.72 + variant * 0.09;
    const cards = 3;
    for (let i = 0; i < cards; i++) {
      const yaw = (i / cards) * Math.PI;
      parts.push(
        placed(
          planeGeometry(width, height, 0.9),
          transform(0, height * 0.48, 0, yaw, 0, (i - 1) * 0.12),
        ),
      );
    }
    // A low horizontal card fills the middle so the bush is not see-through from above.
    parts.push(
      placed(planeGeometry(width * 0.8, width * 0.8, 0.9), transform(0, height * 0.34, 0, 0.4, -Math.PI / 2)),
    );
    return mergeParts(parts);
  });
}

/**
 * Dry grass tuft: narrow tapered blades fanned and arching out of one point.
 *
 * The exception to the alpha-card rule above. A bush is a metre across and the
 * net's holes read as gaps between leaves; a blade of grass is five centimetres
 * wide, narrower than one mesh of the net, so on a card the same texture reads as
 * exactly what it is — a scrap of black netting lying in the gutter. Solid
 * tapered ribbons on an opaque surface instead, which is also closer to the
 * truth: a blade of grass has no holes in it.
 */
function tuftGeometry(variant: number): THREE.BufferGeometry {
  return cachedGeometry(`tuft|${variant}`, () => {
    const parts: THREE.BufferGeometry[] = [];
    const blades = 6;
    for (let i = 0; i < blades; i++) {
      const yaw = (i / blades) * Math.PI * 2 + variant * 0.37;
      const t = ((i + variant) % 3) / 3;
      const length = 0.3 + t * 0.15;
      // Rolled upright so the ribbon's own droop arches the blade away from the
      // centre of the clump, which is how a tuft of dead grass sits.
      parts.push(
        placed(
          ribbonGeometry(length, 0.05, 0.008, 3, 0.16 + t * 0.12, 0.45, 0.5),
          transform(0, 0.012, 0, yaw, 0, Math.PI / 2 - 0.16 - t * 0.24),
        ),
      );
    }
    return mergeParts(parts);
  });
}

/** Frond fan for a dead palm: drooping ribbons of decreasing length. */
function frondCrownGeometry(variant: number): THREE.BufferGeometry {
  return cachedGeometry(`frond|${variant}`, () => {
    const parts: THREE.BufferGeometry[] = [];
    const count = 9 + (variant % 3);
    for (let i = 0; i < count; i++) {
      const yaw = (i / count) * Math.PI * 2 + variant * 0.4;
      const t = (i % 4) / 4;
      const length = 1.55 + t * 0.75;
      // Dead fronds hang; live ones arch. These are dead, so bend is large.
      const bend = 0.85 + t * 0.55;
      const pitch = -0.32 - t * 0.42;
      const ribbon = ribbonGeometry(length, 0.34, 0.1, 4, bend, 0.5 + t, 0.85);
      parts.push(placed(ribbon, transform(0, 0, 0, yaw, pitch)));
    }
    // Collar of stubs where old fronds were cut off.
    for (let i = 0; i < 6; i++) {
      const yaw = (i / 6) * Math.PI * 2;
      parts.push(
        placed(boxGeometry(0.3, 0.1, 0.16, 0.02, 0.6), transform(0, -0.22, 0, yaw, -0.5)),
      );
    }
    return mergeParts(parts);
  });
}

/** Segmented, slightly leaning trunk. Straight trunks read as telegraph poles. */
function palmTrunkGeometry(variant: number, height: number): THREE.BufferGeometry {
  return cachedGeometry(`palmtrunk|${variant}|${height.toFixed(1)}`, () => {
    const parts: THREE.BufferGeometry[] = [];
    const segments = 6;
    const lean = 0.14 + (variant % 3) * 0.05;
    let x = 0;
    let y = 0;
    for (let i = 0; i < segments; i++) {
      const h = height / segments;
      const radiusTop = 0.2 - (i / segments) * 0.075;
      const radiusBottom = 0.22 - (i / segments) * 0.075;
      const tilt = lean * (i / segments) * (variant % 2 === 0 ? 1 : -1);
      // Tight tiling on purpose: `wood_plank` carries board-wide weathering
      // patches, and at plank scale on a 0.4 m trunk those patches read as
      // leopard spots. Compressed to hand size they read as the fibrous husk a
      // palm trunk actually has.
      parts.push(
        placed(
          cylinderGeometry(radiusTop, radiusBottom, h * 1.04, 8, 0.42),
          transform(x + Math.sin(tilt) * h * 0.5, y + h * 0.5, 0, 0, 0, tilt),
        ),
      );
      // Scar rings: the diamond pattern is what makes a palm a palm.
      if (i > 0) {
        parts.push(
          placed(
            cylinderGeometry(radiusBottom + 0.02, radiusBottom + 0.02, 0.05, 8, 0.26),
            transform(x, y, 0, 0, 0, tilt),
          ),
        );
      }
      x += Math.sin(tilt) * h;
      y += h;
    }
    return mergeParts(parts);
  });
}

export interface PalmOptions {
  height?: number;
  /** Charred trunk and no crown. */
  burnt?: boolean;
  y?: number;
}

/**
 * Dead palm. The hero plant: tall, thin, and it breaks up long roof lines
 * without blocking a sightline the way a building would.
 */
export function deadPalm(sink: Sink, x: number, z: number, opts: PalmOptions = {}): void {
  const variant = sink.rng.int(0, 3);
  const height = opts.height ?? sink.rng.range(4.6, 7.4);
  const base = opts.y ?? sink.ground(x, z);
  const yaw = sink.rng.range(0, Math.PI * 2);

  sink.addProp(palmTrunkGeometry(variant, height), transform(x, base, z, yaw), {
    material: 'wood_plank',
    tier: 'structure',
    tint: opts.burnt ? 0x4a423a : 0x9a8b70,
  });
  sink.addCollider(
    new THREE.Vector3(x, base + height / 2, z),
    new THREE.Vector3(0.24, height / 2, 0.24),
    0,
    { surface: 'wood', noCover: true },
  );

  if (!opts.burnt) {
    sink.addProp(frondCrownGeometry(variant), transform(x, base + height - 0.1, z, yaw), {
      material: 'camo_net',
      tier: 'detail',
      tint: FOLIAGE_TINTS[variant % FOLIAGE_TINTS.length],
      castShadow: false,
      wind: true,
      global: true,
    });
  }

  // A ring of shed frond litter at the base, so the trunk meets the ground.
  for (let i = 0; i < 3; i++) {
    const a = sink.rng.range(0, Math.PI * 2);
    const r = sink.rng.range(0.5, 1.5);
    const px = x + Math.cos(a) * r;
    const pz = z + Math.sin(a) * r;
    sink.addProp(
      tuftGeometry(sink.rng.int(0, 3)),
      transform(px, sink.ground(px, pz), pz, sink.rng.range(0, Math.PI * 2), 0, 0, sink.rng.range(0.7, 1.3)),
      {
        material: 'camo_net',
        tier: 'detail',
        tint: 0x8a7d52,
        castShadow: false,
        wind: true,
        global: true,
      },
    );
  }
}

export function scrubBush(sink: Sink, x: number, z: number, scale = 1, y?: number): void {
  const variant = sink.rng.int(0, 3);
  sink.addProp(
    bushGeometry(variant),
    transform(
      x,
      y ?? sink.ground(x, z),
      z,
      sink.rng.range(0, Math.PI * 2),
      0,
      0,
      scale * sink.rng.range(0.8, 1.25),
    ),
    {
      material: 'camo_net',
      tier: 'detail',
      tint: FOLIAGE_TINTS[variant % FOLIAGE_TINTS.length],
      castShadow: false,
      wind: true,
      global: true,
    },
  );
}

export function dryTuft(sink: Sink, x: number, z: number, scale = 1, y?: number): void {
  sink.addProp(
    tuftGeometry(sink.rng.int(0, 3)),
    transform(
      x,
      y ?? sink.ground(x, z),
      z,
      sink.rng.range(0, Math.PI * 2),
      0,
      0,
      scale * sink.rng.range(0.75, 1.4),
    ),
    {
      material: 'grass_ground',
      tier: 'detail',
      // Straw, not olive. Grass that has been through a summer here is bleached,
      // and these sit in the seams of a sunlit road where anything dark reads as
      // a stain rather than as a plant.
      tint: sink.rng.pick([0xb0a274, 0x9d9165, 0xc0b184, 0x8e8459]),
      castShadow: false,
      wind: true,
      global: true,
    },
  );
}

export interface ScatterOptions {
  bushes?: number;
  tufts?: number;
  palms?: number;
  /** Keep planting this far away from the rectangle edge. */
  inset?: number;
  /** Rejects a candidate position; used to keep plants out of roads. */
  reject?: (x: number, z: number) => boolean;
}

/**
 * Scatters planting over a rectangle. Counts are per-rectangle targets at full
 * vegetation density and are scaled down (never up) on lower tiers.
 */
export function scatterVegetation(sink: Sink, area: Rect, opts: ScatterOptions): void {
  const density = Math.max(0.15, Math.min(1, sink.config.vegetationDensity));
  const inset = opts.inset ?? 0.5;
  const pick = (): [number, number] | null => {
    for (let attempt = 0; attempt < 6; attempt++) {
      const x = sink.rng.range(area.minX + inset, area.maxX - inset);
      const z = sink.rng.range(area.minZ + inset, area.maxZ - inset);
      if (!opts.reject || !opts.reject(x, z)) return [x, z];
    }
    return null;
  };

  const palms = Math.round((opts.palms ?? 0) * Math.max(0.5, density));
  for (let i = 0; i < palms; i++) {
    const p = pick();
    if (p) deadPalm(sink, p[0], p[1]);
  }
  const bushes = Math.round((opts.bushes ?? 0) * density);
  for (let i = 0; i < bushes; i++) {
    const p = pick();
    if (p) scrubBush(sink, p[0], p[1]);
  }
  const tufts = Math.round((opts.tufts ?? 0) * density);
  for (let i = 0; i < tufts; i++) {
    const p = pick();
    if (p) dryTuft(sink, p[0], p[1]);
  }
}

/**
 * Weeds growing out of a seam: along a kerb, a wall base or a crack. Nothing
 * says "nobody has swept this street in years" faster.
 */
export function seamWeeds(
  sink: Sink,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  count: number,
): void {
  const scaled = Math.round(count * Math.max(0.2, Math.min(1, sink.config.vegetationDensity)));
  for (let i = 0; i < scaled; i++) {
    const t = sink.rng.next();
    const x = x0 + (x1 - x0) * t + sink.rng.range(-0.12, 0.12);
    const z = z0 + (z1 - z0) * t + sink.rng.range(-0.12, 0.12);
    dryTuft(sink, x, z, sink.rng.range(0.5, 0.9));
  }
}
