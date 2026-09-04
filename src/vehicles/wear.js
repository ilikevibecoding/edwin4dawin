import { mulberry32 } from '../textures/core.js';
import { aged, grime } from './kit.js';

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

const GLASS = ['glass', 'glass', 'glassDark', 'glassDusty', 'glassDusty'];

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
    paintKey: old ? 'paintOld' : 'paint',
    age,
    old,
    dust,
    mud,
    glassKey: pick(GLASS),
    tyres: old ? pick(['steel', 'steel', 'alloy']) : pick(['alloy', 'steel', 'alloy']),
    lightsOn: false, // decided fleet-wide so roughly a third are lit at night
    brokenPane: false, // exactly one in the camp
    heading: range(-0.05, 0.05), // parking is never quite square
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
export function paintShade(v, { fixings = [], floorY = 0.5, tint = null } = {}) {
  const base = tint ?? v.paint;
  if (!v.old) return grime(base, { dust: 0x9a8b6b, up: 0.18 + v.age * 0.25, down: 0.28, jitter: 0.03 + v.age * 0.05, seed: v.seed });
  return aged(base, { age: v.age, fixings, floorY, seed: v.seed });
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
