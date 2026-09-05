import { mulberry32, smoothstep } from '../textures/core.js';
import { LIN, aged, grime, hash3, mix3 } from './kit.js';

// ---------------------------------------------------------------------------
// What makes two vehicles of the same kind two different vehicles: the paint
// they left the yard in, how many seasons they have done since, what has been
// bolted on, what has been broken, and how much of the road they brought back
// with them. Every choice is drawn from one seeded stream per instance so the
// camp is identical on every boot.
// ---------------------------------------------------------------------------

/** The safari palette. `old` marks colours that only come on tired vehicles. */
export const PALETTE = {
  sand: 0xc4ad82,
  olive: 0x6a6d42,
  white: 0xe6e1d3,
  khaki: 0xa3905f,
  darkGreen: 0x2b4530,
  oxideRed: 0x8c3b22,
  beige: 0xd9cba6,
  slate: 0x6e747a,
  bushGreen: 0x4c6a3c,
  cream: 0xece2c6,
  rangerGreen: 0x2f5a35,
  rangerWhite: 0xeae5d6,
  orange: 0xc9741f,
  navy: 0x2e3f5c,
  yellow: 0xd0a134,
  brown: 0x5e4a36,
};

/** Which colours each kind is likely to have been ordered in. */
const PAINT_BY_KIND = {
  'expedition-truck': ['sand', 'white', 'olive', 'beige', 'orange'],
  'safari-jeep': ['olive', 'khaki', 'darkGreen', 'sand', 'bushGreen'],
  suv: ['white', 'sand', 'darkGreen', 'slate', 'khaki'],
  pickup: ['white', 'oxideRed', 'sand', 'slate', 'navy'],
  ranger: ['rangerGreen', 'rangerWhite'],
  utility: ['yellow', 'white', 'sand', 'slate'],
  'supply-truck': ['oxideRed', 'navy', 'olive', 'yellow', 'brown'],
  camper: ['white', 'cream', 'sand', 'beige'],
  trailer: ['slate', 'sand', 'darkGreen', 'khaki'],
  motorcycle: ['oxideRed', 'white', 'yellow', 'navy'],
};

// Cab glass is the hero's clear tint, wiped or dusty; the privacy tint is for
// living-box windows only, never for a windscreen (it reads as painted black).
const GLASS = ['glass', 'glass', 'glassDusty', 'glass', 'glassDusty'];

/**
 * Per-instance variant. `slot` is the placement index, `ordinal` counts
 * instances of this kind so the second safari jeep is not the first one over.
 * `site` is { low, edge } in 0..1: how low the slot lies (mud) and how near it
 * is to the lane (dust).
 */
// `?damage=1` puts every damage state on every vehicle so the capture harness can check them
const FORCE_DAMAGE = typeof location !== 'undefined' && new URLSearchParams(location.search).get('damage') === '1';

export function variant(kind, { slot, ordinal = 0, site = { low: 0.5, edge: 0.5 }, seed = 1 }) {
  const rnd = mulberry32(seed * 1013 + slot * 97 + ordinal * 7 + hashKind(kind));
  const pick = (arr) => arr[Math.min(arr.length - 1, (rnd() * arr.length) | 0)];
  const chance = (p) => rnd() < p;
  const range = (a, b) => a + (b - a) * rnd();

  const paintName = PAINT_BY_KIND[kind] ? PAINT_BY_KIND[kind][(ordinal + ((rnd() * 2) | 0)) % PAINT_BY_KIND[kind].length] : 'sand';
  const age = kind === 'ranger' ? range(0.1, 0.4) : kind === 'camper' ? range(0.05, 0.35) : range(0.05, 0.95);
  const old = age > 0.6;
  const dust = clamp01(0.35 + site.edge * 0.4 + range(-0.1, 0.15) + (kind === 'supply-truck' || kind === 'safari-jeep' ? 0.1 : 0) - (kind === 'ranger' ? 0.15 : 0));
  const mud = clamp01(0.15 + site.low * 0.55 + range(-0.08, 0.12) + (kind === 'expedition-truck' ? 0.1 : 0) - (kind === 'camper' ? 0.1 : 0));

  return {
    kind,
    slot,
    ordinal,
    seed: seed * 31 + slot,
    rnd,
    pick,
    chance,
    range,
    paintName,
    paint: PALETTE[paintName],
    // one paint material for every age: how chalked it is rides on the `aAge`
    // vertex attribute the kit bakes from `age` (materials.js applyPaintAge)
    paintKey: 'paint',
    age,
    old,
    dust,
    mud,
    glassKey: pick(GLASS),
    tyres: old ? pick(['steel', 'steel', 'alloy']) : pick(['alloy', 'steel', 'alloy']),
    lightsOn: false, // decided fleet-wide so roughly a third are lit at night
    brokenPane: false, // exactly one in the camp
    // Parking is never square: up to ±12° of yaw, and pulled a little short or
    // long of the slot, a little left or right of it. The placer trims these
    // back where a neighbour would be clipped.
    heading: range(-0.21, 0.21),
    slotAlong: range(-0.9, 0.9),
    slotAcross: range(-0.35, 0.35),
    steer: chance(0.4) ? range(-0.35, 0.35) : 0,
    rhd: true,
    missingPanel: FORCE_DAMAGE || (old && chance(0.35)),
    crackedLens: FORCE_DAMAGE || chance(0.25),
    dent: chance(0.5) ? range(0.3, 1) : 0,
  };
}

function hashKind(kind) {
  let h = 0;
  for (let i = 0; i < kind.length; i++) h = (h * 31 + kind.charCodeAt(i)) | 0;
  return Math.abs(h) % 1000;
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));

/**
 * The paint shade for a variant: fresh paint is a light grime, old paint chalks
 * on top and rusts out of its fixings. `fixings` are vehicle-space points where
 * the body is bolted through; `floorY` is the panel bottom edge.
 */
export function paintShade(v, { fixings = [], floorY = 0.5, tint = null, edge = null } = {}) {
  const base = tint ?? v.paint;
  // paint rubs through on the panel edges first: a little on a fresh vehicle,
  // primer-grey on a tired one
  const edgeK = edge ?? 0.18 + v.age * 0.55;
  if (!v.old) return grime(base, { dust: 0x9a8b6b, up: 0.18 + v.age * 0.25, down: 0.28, jitter: 0.03 + v.age * 0.05, seed: v.seed, edge: edgeK, edgeTint: 0xa39e93 });
  return aged(base, { age: v.age, fixings, floorY, seed: v.seed, edge: edgeK });
}

/**
 * A canvas tilt's weather. The sheet is laced over the cage rails and sags
 * between the hoops, so the sun takes it at the ridge — the high line down the
 * middle, and the crests over the hoops — where the dye bleaches towards a
 * pale, greyer cloth; the dust settles where the sheet is low: in the sag
 * pools between hoops and along the hem where it meets the rails. `ridgeY` is
 * the sheet's unsagged height, `sag` the deepest sag, `halfWidth` the rail
 * half-spacing. Old cloth fades further and holds more dust.
 */
export function canvasShade(tint, { age = 0.3, dust = 0.5, seed = 1, halfWidth = 0.8, ridgeY = 2.0, sag = 0.045 }) {
  const base = LIN(tint);
  const bleach = mix3(base, LIN(0xc9c2ae), 0.75);
  const dst = LIN(0x9a8e70);
  const fadeK = 0.22 + age * 0.5;
  const dustK = 0.25 + dust * 0.55;
  return (x, y, z) => {
    const across = Math.min(1, Math.abs(x) / halfWidth);
    const pool = Math.min(1, Math.max(0, (ridgeY - y) / sag));
    const h = hash3(Math.round(x * 14), Math.round(y * 14), Math.round(z * 14), seed + 11);
    // ridge: the centre line and the crests, not the pools
    const ridge = (1 - across) ** 1.4 * (1 - pool * 0.7);
    let c = mix3(base, bleach, Math.min(0.85, fadeK * (0.35 + ridge) * (0.75 + h * 0.5)));
    // hem and pools
    const hem = smoothstep(0.55, 1.0, across);
    c = mix3(c, dst, Math.min(0.8, dustK * (hem * 0.7 + pool * pool * 0.55) * (0.7 + h * 0.6)));
    return c;
  };
}

/** Two-tone: a second colour below the swage line, on the older bush vehicles. */
export function twoTone(v, topHex, bottomHex, splitY) {
  const top = paintShade(v, { tint: topHex });
  const bottom = paintShade(v, { tint: bottomHex });
  return (x, y, z, nx, ny, nz) => (y < splitY ? bottom(x, y, z, nx, ny, nz) : top(x, y, z, nx, ny, nz));
}

/** Lighter/darker relative of a colour, for a roof or a hard top. */
export function shade(hex, k) {
  const r = Math.min(255, ((hex >> 16) & 255) * k);
  const g = Math.min(255, ((hex >> 8) & 255) * k);
  const b = Math.min(255, (hex & 255) * k);
  return (r << 16) | (g << 8) | b;
}
