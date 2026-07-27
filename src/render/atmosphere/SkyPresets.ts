import type { WeatherState } from '../../core/Interfaces';
import { clamp, lerp, saturate } from '../../core/MathUtils';

/**
 * Named looks for the rest of the team and the screenshot harness.
 *
 * `golden` is the map's signature: a 6-degree sun at 17:45 for long shadows,
 * warm rim light and strong shafts.
 *
 * `exposureBias` is in stops against the exposure the system meters for itself
 * from the sky it just rendered. It exists because metering is a statement about
 * average luminance and a look is a statement about where the interesting part
 * of the histogram should sit: a dusk wants to sit under its meter so the band
 * above the horizon keeps its colour, a night wants to sit over it so the frame
 * is legible at all. Absolute exposure is never authored here — the sky's own
 * radiance decides that, and it moves whenever the weather does.
 */
export interface SkyPreset {
  name: string;
  timeOfDay: number;
  weather: WeatherState;
  exposureBias: number;
  note: string;
}

const weather = (
  cloudCover: number,
  haze: number,
  windSpeed: number,
  windDirection: number,
  dust = 0,
): WeatherState => ({ cloudCover, haze, windSpeed, windDirection, dust });

export const SKY_PRESETS: Record<string, SkyPreset> = {
  dawn: {
    name: 'dawn',
    timeOfDay: 5.9,
    weather: weather(0.34, 0.55, 3.5, 1.1),
    exposureBias: -0.4,
    note: 'Sun 1.5 deg up; cold shadows, warm horizon band',
  },
  morning: {
    name: 'morning',
    timeOfDay: 8.5,
    weather: weather(0.36, 0.4, 4.5, 1.2),
    exposureBias: 0,
    note: 'Sun 34 deg; crisp light, building cumulus',
  },
  noon: {
    name: 'noon',
    timeOfDay: 12.5,
    weather: weather(0.16, 0.26, 3, 1.4),
    exposureBias: 0.15,
    note: 'Sun 61 deg; harsh overhead desert light',
  },
  golden: {
    name: 'golden',
    timeOfDay: 17.75,
    weather: weather(0.38, 0.48, 4, 1.35),
    exposureBias: -0.3,
    note: 'Signature look: 6 deg sun, long shadows, rim light',
  },
  dusk: {
    name: 'dusk',
    timeOfDay: 18.85,
    weather: weather(0.36, 0.6, 3.5, 1.3),
    exposureBias: -0.9,
    note: 'Sun 7 deg below; orange band under a deep blue zenith',
  },
  night: {
    name: 'night',
    /* The moon is 22 degrees up here and 62 at midnight. That is a framing
       decision, not a lighting one: a body near the top of the hemisphere either
       leaves the frame or forces the camera to point at nothing but sky, and the
       cloud deck a kilometre and a half up then fills the shot from directly
       overhead. At twenty degrees the moon sits in the upper third with a horizon
       under it, which is how a moonlit landscape is photographed. */
    timeOfDay: 2.6,
    /* Barely any cloud. A third of the sky covered is an ordinary night and a
       useless showcase: the interesting things — the moon, the star field, the
       galactic band — are all *behind* the cloud, and with a moon this bright the
       deck is the only thing in the frame with any luminance to speak of. */
    weather: weather(0.1, 0.28, 2.5, 1.0),
    /* Three stops under the meter. Metering a night to middle grey is what makes
       a rendered night look like an underlit day: the sky lands at forty-five per
       cent, the horizon washes out to pale grey, and the stars — which are only a
       few times the sky — disappear into it. Three stops down puts a moonlit sky
       at four per cent and the brightest stars at three quarters, which is the
       ratio a photograph of one has. */
    exposureBias: -3.1,
    note: 'Gibbous moon 22 deg up in the west, star field, Milky Way overhead',
  },
  overcast: {
    name: 'overcast',
    timeOfDay: 15.2,
    weather: weather(1, 0.85, 8, 1.5),
    exposureBias: 0.1,
    note: 'Flat oppressive stratus, no visible sun',
  },
  sandstorm: {
    name: 'sandstorm',
    timeOfDay: 16.4,
    /* Almost no cloud, and not only because dust suppresses convection: the murk
       has an optical depth around one and a half, so anything past five
       kilometres is gone. A sandstorm with cumulus visible through it is a
       sandstorm the viewer can see out of. */
    weather: weather(0.1, 1, 17, 1.25, 0.85),
    exposureBias: -0.2,
    note: 'Heavy dust; orange extinction, sun reduced to a disc',
  },
};

export const PRESET_NAMES = Object.keys(SKY_PRESETS);

/* --------------------------- cloud profiles ---------------------------- */

export interface CloudProfile {
  /** Layer base and top, kilometres above sea level. */
  bottom: number;
  top: number;
  /** 0 cirrus, 0.5 cumulus, 1 stratus. */
  type: number;
  density: number;
  extinction: number;
  shapeScale: number;
  erosion: number;
  anvil: number;
  /** Trim on the mapped coverage; near 1, because the curve does the work. */
  coverageGain: number;
  typeVariance: number;
  /** Multiplier on the march distance limit; low cloud needs less reach. */
  maxDistance: number;
}

/**
 * `shapeScale` is in inverse kilometres, and it is the single number that decides
 * whether a sky reads as weather or as one enormous grey lid: the shape volume
 * tiles every `SHAPE_PERIOD / shapeScale` kilometres with `SHAPE_PERIOD` cells
 * inside it, so 0.32 puts a cumulus cell at about three kilometres across —
 * which, with a base at 1.35 km, is roughly the fifty degrees of sky a real one
 * covers when it is overhead.
 */
const CIRRUS: CloudProfile = {
  bottom: 6.2, top: 9.4, type: 0.04, density: 0.62, extinction: 13,
  shapeScale: 0.16, erosion: 0.55, anvil: 0, coverageGain: 0.92,
  typeVariance: 0.2, maxDistance: 60,
};

/**
 * `density` is a multiplier on a field that is normalised over the *whole*
 * headroom above the coverage threshold, so its cores land around 0.8 rather
 * than clipping at 1: the extra half is what buys back the optical depth that
 * keeping the boundary gradient costs. A cumulus tower ends up at an extinction
 * around 40/km through its core, which is the measured range, and a couple of
 * hundred metres of translucent skin on the outside, which is a cumulus edge.
 *
 * Fair-weather cumulus: two kilometres deep, wider than they are tall. The depth
 * matters as much as the coverage — convection under a strong inversion makes
 * flat-bottomed lumps, and a two-kilometre base with a five-kilometre ceiling
 * makes every one of them a tower, which is a summer thunderstorm sky and not a
 * quiet one.
 */
const CUMULUS: CloudProfile = {
  bottom: 1.4, top: 3.5, type: 0.42, density: 1.5, extinction: 42,
  shapeScale: 0.38, erosion: 0.36, anvil: 0.35, coverageGain: 1,
  typeVariance: 0.45, maxDistance: 34,
};

/** The same air an hour later: deeper convection, taller cells, harder edges. */
const CONGESTUS: CloudProfile = {
  bottom: 1.35, top: 5.6, type: 0.5, density: 1.6, extinction: 48,
  shapeScale: 0.27, erosion: 0.32, anvil: 0.6, coverageGain: 1,
  typeVariance: 0.5, maxDistance: 36,
};

/**
 * Extinction is per kilometre at density 1, and 42 with a two-kilometre deck is
 * an optical depth around 50 — the middle of the measured range for stratus, and
 * low enough that the thin parts stay translucent. Push it to the 60s and every
 * column saturates: the deck loses all thickness variation and renders as one
 * flat fill, which is the difference between a photograph of an overcast day and
 * a grey rectangle.
 */
/**
 * Low and thin, and that is the whole point of it.
 *
 * A stratus deck is 300 to 900 metres up and 200 to 800 thick — an order of
 * magnitude flatter than the two-kilometre slab that a naive reading of "thick
 * overcast" suggests. The height is what makes the look: at six hundred metres
 * the base runs away to the horizon in visible perspective, its own relief is a
 * couple of degrees of arc rather than a couple of arcminutes, and the deck ends
 * in a bright gap at the horizon. Put the same deck at two kilometres with a
 * cell three kilometres wide and looking up shows exactly one cell — a smooth
 * grey field with no scale in it, which is the flat-fill failure that no amount
 * of extra density fixes.
 */
const STRATUS: CloudProfile = {
  bottom: 0.62, top: 1.85, type: 0.94, density: 1.5, extinction: 40,
  shapeScale: 0.55, erosion: 0.45, anvil: 0.05, coverageGain: 1,
  typeVariance: 0.35, maxDistance: 34,
};

function mixProfile(a: CloudProfile, b: CloudProfile, t: number, out: CloudProfile): CloudProfile {
  out.bottom = lerp(a.bottom, b.bottom, t);
  out.top = lerp(a.top, b.top, t);
  out.type = lerp(a.type, b.type, t);
  out.density = lerp(a.density, b.density, t);
  out.extinction = lerp(a.extinction, b.extinction, t);
  out.shapeScale = lerp(a.shapeScale, b.shapeScale, t);
  out.erosion = lerp(a.erosion, b.erosion, t);
  out.anvil = lerp(a.anvil, b.anvil, t);
  out.coverageGain = lerp(a.coverageGain, b.coverageGain, t);
  out.typeVariance = lerp(a.typeVariance, b.typeVariance, t);
  out.maxDistance = lerp(a.maxDistance, b.maxDistance, t);
  return out;
}

/**
 * Cloud cover selects the *kind* of cloud, not just how much of it there is:
 * a clear sky gets wispy cirrus, a middling sky builds cumulus, and an overcast
 * sky flattens into low stratus. That mapping is most of why a cloud layer reads
 * as weather rather than as noise.
 */
export function cloudProfileFor(cover: number, dust: number, out: CloudProfile): CloudProfile {
  const c = saturate(cover);
  /* The cirrus knee sits low on purpose. Blending it across the whole first half
     of the range means every ordinary sky — a fifth to a third covered, which is
     what "a few clouds" means — comes out as a cirro-cumulus hybrid: a sheet at
     four kilometres with a feathered underside, when what belongs there is a
     cumulus with a flat base at fifteen hundred metres. Wisps are for a sky that
     is genuinely almost clear. Above that, cover stands in for instability, so it
     buys depth before it buys a lid. */
  if (c < 0.12) mixProfile(CIRRUS, CUMULUS, saturate(c / 0.12), out);
  else if (c < 0.42) mixProfile(CUMULUS, CONGESTUS, saturate((c - 0.12) / 0.3), out);
  else mixProfile(CONGESTUS, STRATUS, saturate((c - 0.42) / 0.58), out);

  /* Dust suppresses convection and hides whatever is left. */
  if (dust > 0) {
    out.density *= lerp(1, 0.35, saturate(dust));
    out.coverageGain *= lerp(1, 0.6, saturate(dust));
  }
  out.coverageGain = clamp(out.coverageGain, 0.05, 1.4);
  return out;
}

/**
 * `weather.cloudCover` reads as the fraction of sky a player would call covered,
 * and it now means exactly that: `CloudVolume.calibrateCover` measures the
 * threshold that produces this covered fraction against the baked field. So there
 * is no curve left to apply — only the profile's own trim, which is how dust
 * suppresses convection.
 */
export function coverageCurve(cover: number, gain: number): number {
  return saturate(saturate(cover) * gain);
}

export function defaultProfile(): CloudProfile {
  return { ...CUMULUS };
}
