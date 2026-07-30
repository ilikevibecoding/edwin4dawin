import * as THREE from 'three';
import {
  type Rect,
  type Sink,
  boxGeometry,
  cachedGeometry,
  mergeParts,
  placed,
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

/**
 * Scrub bush: arching sprays of twig ribbons out of one root.
 *
 * Crossed alpha cards were what the review caught in the dusk shot, and the tell
 * is not the card count — it is that the silhouette is a rectangle whichever way
 * you walk round it, and that the low sun rakes across a flat plane with no
 * self-shadowing. Sprays of real tapered ribbons cost about the same as three
 * cards, have an outline that changes with the viewing angle, and pick up the
 * backlit glow that a card on an opaque material cannot.
 */
function bushGeometry(variant: number): THREE.BufferGeometry {
  return cachedGeometry(`bush|${variant}`, () => {
    const parts: THREE.BufferGeometry[] = [];
    const height = 0.62 + variant * 0.08;
    const sprays = 9 + (variant % 3) * 2;
    for (let i = 0; i < sprays; i++) {
      // Golden angle, so no two sprays sit in the same plane and the plan view is
      // not a star.
      const yaw = i * 2.39996 + variant * 0.5;
      const t = ((i * 3) % 5) / 5;
      const length = height * (0.72 + t * 0.55);
      parts.push(
        placed(
          ribbonGeometry(length, 0.16 + t * 0.07, 0.02, 4, length * 0.6, 0.7 + t * 0.6, 0.55),
          // Rolled towards upright so the ribbon's own droop arches the spray out
          // and over, which is how a desert shrub holds itself.
          transform(0, 0.03, 0, yaw, 0, Math.PI / 2 - 0.22 - t * 0.5),
        ),
      );
    }
    // A denser inner clump, so the bush is not see-through down its own axis.
    for (let i = 0; i < 5; i++) {
      const yaw = i * 1.256 + variant;
      parts.push(
        placed(
          ribbonGeometry(height * 0.5, 0.2, 0.05, 3, height * 0.3, 0.5, 0.5),
          transform(0, 0.02, 0, yaw, 0, Math.PI / 2 - 0.7),
        ),
      );
    }
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

/**
 * One pinnate frond: a rachis that arches over, with leaflets down both sides.
 *
 * The review's complaint was that the crown was flat spiky cutouts with hard
 * alpha edges and no curvature, and all three come from the same shortcut — a
 * frond drawn as one straight alpha-tested card. What a date palm frond actually
 * is, is a stiff spine that leaves the crown pointing up and out, arches over its
 * own length and droops at the tip, carrying a hundred narrow leaflets set in a
 * shallow V either side of it. So it is built that way: the arch is real geometry
 * on a swept spine, and the serrated silhouette comes from the leaflets being
 * separate tapered strips rather than from a texture's alpha.
 *
 * `rise` is how steeply it leaves the crown and `fall` how far the tip drops, so
 * the same builder gives a live frond (up and over) and a dead one (straight
 * down) without a second function.
 */
function frondGeometry(
  length: number,
  rise: number,
  fall: number,
  leafletLength: number,
  segments: number,
): THREE.BufferGeometry {
  const key = `palmfrond|${length.toFixed(2)}|${rise.toFixed(2)}|${fall.toFixed(2)}|${leafletLength.toFixed(2)}|${segments}`;
  return cachedGeometry(key, () => {
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    // Spine, sampled along its arc. Height is a cubic that starts climbing at
    // `rise` and ends descending past `fall`, which is what an arch is.
    const spine: THREE.Vector3[] = [];
    const tangents: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      spine.push(new THREE.Vector3(t * length, rise * t - (rise + fall) * t * t * t, 0));
    }
    for (let i = 0; i <= segments; i++) {
      const a = spine[Math.max(0, i - 1)];
      const b = spine[Math.min(segments, i + 1)];
      tangents.push(b.clone().sub(a).normalize());
    }

    // The rachis: a narrow strip, so it holds the crown together where the
    // leaflets are too short to close the gap.
    const rachis = positions.length / 3;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const half = THREE.MathUtils.lerp(0.045, 0.008, t);
      const p = spine[i];
      for (const s of [-1, 1]) {
        positions.push(p.x, p.y, p.z + s * half);
        uvs.push(t * length * 1.4, 0.5 + s * 0.1);
      }
      if (i > 0) {
        const b = rachis + (i - 1) * 2;
        indices.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
      }
    }

    // Leaflets, as a continuous blade either side of the rachis rather than a row
    // of separate spikes. One triangle per leaflet was the first attempt and it
    // read as a fish skeleton: at four per metre there is more gap than leaf, so
    // the frond has no mass and the crown collapses to a spider. These are
    // quads that abut at the root and taper to a point, so the blade closes and
    // the serration comes from the outer edge alone — which is what a pinnate
    // frond looks like from more than two metres away.
    const perSegment = 3;
    const steps = segments * perSegment;
    const sample = (u: number): { p: THREE.Vector3; dir: THREE.Vector3 } => {
      const f = Math.min(segments - 1e-4, u * segments);
      const i = Math.floor(f);
      const k = f - i;
      return {
        p: spine[i].clone().lerp(spine[i + 1], k),
        dir: tangents[i].clone().lerp(tangents[i + 1], k).normalize(),
      };
    };

    for (const s of [-1, 1]) {
      for (let i = 0; i < steps; i++) {
        const t0 = i / steps;
        const t1 = (i + 1) / steps;
        const t = (t0 + t1) / 2;
        // Full length in the middle of the frond, short at both ends.
        const taper = Math.sin(Math.PI * Math.min(1, t * 1.12)) ** 0.7;
        const leaf = leafletLength * (0.36 + 0.64 * taper);
        if (leaf < 0.05) continue;
        const a = sample(t0);
        const b = sample(t1);
        // Out square to the spine, raked back towards the tip, and lifted so the
        // two sides sit in a shallow V.
        const sweep = 0.36 + 0.34 * t;
        const lift = (0.42 - 0.7 * t) * leaf;
        const out = new THREE.Vector3(0, 0, s).multiplyScalar(Math.cos(sweep));
        const dir = a.dir.clone().multiplyScalar(Math.sin(sweep));
        const away = out.add(dir).normalize();
        // Every third leaflet is shorter, which is what gives the outer edge its
        // ragged line instead of a machined curve.
        const ragged = leaf * (i % 3 === 2 ? 0.76 : 1);
        const tipA = a.p.clone().addScaledVector(away, ragged * 0.92).setY(a.p.y + lift);
        const tipB = b.p.clone().addScaledVector(away, ragged).setY(b.p.y + lift);
        const base = positions.length / 3;
        positions.push(
          a.p.x,
          a.p.y,
          a.p.z + s * 0.01,
          b.p.x,
          b.p.y,
          b.p.z + s * 0.01,
          tipB.x,
          tipB.y,
          tipB.z,
          tipA.x,
          tipA.y,
          tipA.z,
        );
        uvs.push(t0 * 2, 0, t1 * 2, 0, t1 * 2, ragged * 2.4, t0 * 2, ragged * 2.4);
        if (s < 0) indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
        else indices.push(base, base + 3, base + 2, base, base + 2, base + 1);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    softenNormals(geometry, 0.62);
    return geometry;
  });
}

/**
 * Rolls vertex normals towards the frond's own up axis.
 *
 * A leaflet is a flat sliver, so its true normal is square to the blade and the
 * crown ends up as a set of hard-lit facets pointing every which way — dark on
 * the shaded half, white on the lit half, and no volume anywhere. Leaning the
 * normals towards the axis the crown opens along makes the whole crown shade as
 * one soft mass off the sky, which is the standard foliage trick and the reason
 * real palms read bright from below rather than as black cutouts.
 */
function softenNormals(geometry: THREE.BufferGeometry, amount: number): void {
  const normal = geometry.attributes.normal as THREE.BufferAttribute;
  const up = new THREE.Vector3(0, 1, 0);
  const n = new THREE.Vector3();
  for (let i = 0; i < normal.count; i++) {
    n.fromBufferAttribute(normal, i);
    // Towards +Y or -Y, whichever side the face already looks, so a frond lit
    // from below still shades from below.
    n.lerp(n.y >= 0 ? up : up.clone().negate(), amount).normalize();
    normal.setXYZ(i, n.x, n.y, n.z);
  }
  normal.needsUpdate = true;
}

/**
 * Crown of fronds, radiating and rolled so no two present the same face.
 *
 * `alive` sets how the fronds sit: a living crown is a fountain, a dead one is a
 * shuttlecock of hanging spines with a skirt of the ones that have not fallen off
 * yet. Both keep the boot — the collar of cut frond bases that is the single most
 * recognisable thing about a palm trunk at close range.
 */
function palmCrownGeometry(variant: number, count: number, alive: boolean): THREE.BufferGeometry {
  return cachedGeometry(`palmcrown|${variant}|${count}|${alive ? 'a' : 'd'}`, () => {
    const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < count; i++) {
      // Golden-angle spiral rather than an even fan: an even fan is a starburst,
      // and a palm crown is a spiral phyllotaxis.
      const yaw = i * 2.39996 + variant * 0.7;
      const ring = i / count;
      const length = alive ? 2.0 + ((i * 7) % 5) * 0.22 : 1.5 + ((i * 5) % 4) * 0.2;
      // Outer fronds lie flatter and droop further; the middle ones stand up.
      const pitch = alive ? 0.62 - ring * 1.15 : -0.5 - ring * 0.75;
      const rise = alive ? length * (0.3 - ring * 0.22) : 0;
      const fall = alive ? length * (0.34 + ring * 0.3) : length * 0.62;
      const roll = ((i % 3) - 1) * 0.4;
      parts.push(
        placed(
          frondGeometry(length, rise, fall, alive ? 0.46 : 0.26, 6),
          transform(0, 0, 0, yaw, pitch, roll),
        ),
      );
    }
    // Boot: the stubs of cut fronds, in two staggered rings.
    for (let ring = 0; ring < 2; ring++) {
      for (let i = 0; i < 7; i++) {
        const yaw = (i / 7) * Math.PI * 2 + ring * 0.45;
        parts.push(
          placed(
            boxGeometry(0.26, 0.11, 0.15, 0.025, 0.5),
            transform(0, -0.16 - ring * 0.24, 0, yaw, -0.55 - ring * 0.12),
          ),
        );
      }
    }
    return mergeParts(parts);
  });
}

/**
 * Trunk swept along a curve, with the boot scars carried as a taper.
 *
 * The old trunk was six stacked cylinders with a wider ring between each, which
 * from any distance is horizontal banding — the review's exact words. A palm
 * leans and curves continuously and its diameter falls off smoothly, so this is
 * one swept tube: the rings go, the lean stays, and the triangle count drops.
 */
function palmTrunkGeometry(
  variant: number,
  height: number,
  lean: number,
  radius: number,
): THREE.BufferGeometry {
  const key = `palmtrunk|${variant}|${height.toFixed(1)}|${lean.toFixed(2)}|${radius.toFixed(2)}`;
  return cachedGeometry(key, () => {
    const rings = 9;
    const sides = 7;
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let r = 0; r <= rings; r++) {
      const t = r / rings;
      // Curve, not a straight tilt: a palm bends towards the light over its life.
      const offset = lean * t * t * height * 0.5;
      const y = t * height;
      // Swollen at the foot, waisted, then thickening again under the crown.
      const rad = radius * (1.28 - 0.62 * t + 0.2 * t * t * t);
      for (let s = 0; s <= sides; s++) {
        const a = (s / sides) * Math.PI * 2;
        // Lobed section: a palm trunk is not a circle in plan, and the lobes are
        // what give it a highlight down one side instead of a flat gradient.
        const lobe = rad * (1 + 0.055 * Math.cos(a * 5 + t * 6));
        positions.push(offset + Math.cos(a) * lobe, y, Math.sin(a) * lobe);
        // Tight tiling on purpose: `wood_plank` carries board-wide weathering
        // patches, and at plank scale on a 0.4 m trunk they read as leopard
        // spots. Compressed to hand size they read as fibrous husk.
        uvs.push((s / sides) * 1.7, y / 0.42);
        if (r > 0 && s > 0) {
          const a0 = (r - 1) * (sides + 1) + (s - 1);
          const a1 = a0 + 1;
          const b0 = r * (sides + 1) + (s - 1);
          const b1 = b0 + 1;
          indices.push(a0, b0, b1, a0, b1, a1);
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.userData.worldUvApplied = true;
    return geometry;
  });
}

export interface PalmOptions {
  height?: number;
  /** Charred trunk and no crown. */
  burnt?: boolean;
  /** Green crown rather than the dead brown one. */
  alive?: boolean;
  y?: number;
}

/** Live frond greens, kept olive rather than lawn: a date palm is a dusty green. */
const LIVE_TINTS = [0x6f8a45, 0x7d954e, 0x62803e, 0x88985a];

/**
 * Palm. The hero plant: tall, thin, and it breaks up long roof lines without
 * blocking a sightline the way a building would.
 *
 * Every measurable thing about it varies per tree — height, trunk thickness, how
 * far and which way it leans, frond count, crown scale and tint — because a row
 * of identical palms is worse than no palms: the eye reads the repeat instantly
 * and the whole street becomes a diorama.
 */
export function deadPalm(sink: Sink, x: number, z: number, opts: PalmOptions = {}): void {
  const variant = sink.rng.int(0, 3);
  const height = opts.height ?? sink.rng.range(4.6, 7.4);
  const base = opts.y ?? sink.ground(x, z);
  const yaw = sink.rng.range(0, Math.PI * 2);
  const lean = sink.rng.range(0.05, 0.2) * sink.rng.sign();
  const radius = sink.rng.range(0.15, 0.2);
  // Most palms in the town are alive; the burnt and dead ones are the exception,
  // which is the opposite of how this read before.
  const alive = opts.burnt ? false : (opts.alive ?? sink.rng.bool(0.72));

  sink.addProp(palmTrunkGeometry(variant, height, lean, radius), transform(x, base, z, yaw), {
    material: 'wood_plank',
    tier: 'structure',
    tint: opts.burnt ? 0x4a423a : sink.rng.pick([0x9a8b70, 0x8d7f64, 0xa79274, 0x93856a]),
  });
  // Collider follows the lean at half height, which is where the trunk is.
  const drift = lean * 0.25 * height;
  sink.addCollider(
    new THREE.Vector3(x + Math.cos(yaw) * drift, base + height / 2, z - Math.sin(yaw) * drift),
    new THREE.Vector3(radius + 0.06, height / 2, radius + 0.06),
    0,
    { surface: 'wood', noCover: true },
  );

  if (!opts.burnt) {
    const top = height + lean * height * 0.5;
    const crownX = x + Math.cos(yaw) * lean * height * 0.5;
    const crownZ = z - Math.sin(yaw) * lean * height * 0.5;
    const fronds = sink.rng.int(alive ? 13 : 8, alive ? 19 : 12);
    sink.addProp(
      palmCrownGeometry(variant, fronds, alive),
      transform(
        crownX,
        base + top - 0.12,
        crownZ,
        sink.rng.range(0, Math.PI * 2),
        sink.rng.range(-0.09, 0.09),
        sink.rng.range(-0.09, 0.09),
        sink.rng.range(0.86, 1.2),
      ),
      {
        material: alive ? 'grass_ground' : 'camo_net',
        tier: 'detail',
        tint: alive
          ? LIVE_TINTS[sink.rng.int(0, LIVE_TINTS.length - 1)]
          : FOLIAGE_TINTS[variant % FOLIAGE_TINTS.length],
        castShadow: false,
        wind: true,
        // The whole point of the rebuild: a frond with the sun behind it glows.
        transmit: alive ? 1.5 : 0.8,
        global: true,
      },
    );
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
        material: 'grass_ground',
        tier: 'detail',
        tint: 0x9a8d62,
        castShadow: false,
        wind: true,
        transmit: 0.8,
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
      // Solid rather than alpha-tested: these are twigs a couple of centimetres
      // across, narrower than one mesh of the net, so the net's holes read as
      // torn netting rather than as gaps between leaves.
      material: 'grass_ground',
      tier: 'detail',
      tint: FOLIAGE_TINTS[variant % FOLIAGE_TINTS.length],
      castShadow: false,
      wind: true,
      transmit: 1.1,
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
      transmit: 1.2,
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
