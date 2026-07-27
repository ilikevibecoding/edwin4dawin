import * as THREE from 'three';
import { DEG, clamp } from '../../core/MathUtils';

/**
 * Sun, moon and star-frame astronomy, plus the CPU-side transmittance integral.
 *
 * The map sits at 32.5N with the sun's declination at +5 degrees — a late
 * summer desert. That puts solar noon at 61.5 degrees elevation (harsh, short
 * shadows), sunrise near 05:47 and sunset near 18:13, so the golden hour lands
 * at 17:45 where the signature look wants it.
 *
 * The moon rides the same great circle offset by its phase, which makes the
 * crescent automatically point at the sun and the full moon automatically climb
 * highest at solar midnight — the geometry does the work instead of a hand-keyed
 * animation.
 */

export const SITE_LATITUDE = 32.5 * DEG;
export const SUN_DECLINATION = 5 * DEG;
/** Obliquity of the ecliptic, used to give the moon a plausible declination. */
const OBLIQUITY = 23.44 * DEG;

export interface MediumParams {
  rayleigh: THREE.Vector3;
  ozone: THREE.Vector3;
  mieExtinct: THREE.Vector3;
  mieHeight: number;
  dustExtinct: THREE.Vector3;
  dustHeight: number;
}

const PLANET_R = 6360;
const ATMOS_R = 6460;
export const RAYLEIGH_H = 8;

/** Hour angle in radians; 0 at solar noon, positive in the afternoon. */
export function hourAngle(hours: number): number {
  return (hours - 12) * 15 * DEG;
}

/**
 * Equatorial to world (x east, y up, z south). Writes a unit vector pointing
 * from the observer toward the body.
 */
function horizontal(hourAng: number, declination: number, out: THREE.Vector3): THREE.Vector3 {
  const sinD = Math.sin(declination);
  const cosD = Math.cos(declination);
  const sinP = Math.sin(SITE_LATITUDE);
  const cosP = Math.cos(SITE_LATITUDE);
  const cosH = Math.cos(hourAng);
  const sinH = Math.sin(hourAng);

  const east = -cosD * sinH;
  const north = sinD * cosP - cosD * sinP * cosH;
  const up = sinD * sinP + cosD * cosP * cosH;
  return out.set(east, up, -north).normalize();
}

export function solarDirection(hours: number, out: THREE.Vector3): THREE.Vector3 {
  return horizontal(hourAngle(hours), SUN_DECLINATION, out);
}

/** Ecliptic longitude of the sun implied by its declination. */
function sunEclipticLongitude(): number {
  return Math.asin(clamp(Math.sin(SUN_DECLINATION) / Math.sin(OBLIQUITY), -1, 1));
}

/**
 * `phase` is the synodic fraction: 0 new, 0.25 first quarter, 0.5 full. The
 * moon trails the sun in right ascension by 360 degrees times the phase.
 */
export function lunarDirection(hours: number, phase: number, out: THREE.Vector3): THREE.Vector3 {
  const lambda = sunEclipticLongitude() + phase * Math.PI * 2;
  const dec = Math.asin(clamp(Math.sin(OBLIQUITY) * Math.sin(lambda), -1, 1));
  return horizontal(hourAngle(hours) - phase * Math.PI * 2, dec, out);
}

/**
 * Illuminated fraction falls off much faster than the lit area does, because of
 * the opposition surge in lunar regolith: a half moon is a tenth of a full moon,
 * not a half.
 */
export function lunarBrightness(sunDir: THREE.Vector3, moonDir: THREE.Vector3): number {
  const elongation = Math.acos(clamp(-sunDir.dot(moonDir), -1, 1)) / DEG;
  return Math.pow(10, -0.4 * (0.026 * elongation + 4e-9 * Math.pow(elongation, 4)));
}

/* --------------------------- star frames ------------------------------- */

const _mA = new THREE.Matrix3();
const _mR = new THREE.Matrix3();

/**
 * World -> celestial. Rotating this by sidereal time wheels the whole star
 * field about a pole tilted by the site latitude, so stars trail around Polaris
 * exactly as a long exposure shows.
 */
export function celestialFrame(hours: number, out: THREE.Matrix3): THREE.Matrix3 {
  const sinP = Math.sin(SITE_LATITUDE);
  const cosP = Math.cos(SITE_LATITUDE);
  /* Transpose of the equatorial -> world rotation. */
  _mR.set(0, cosP, sinP, -1, 0, 0, 0, sinP, -cosP);

  /* Sidereal rotation. The offset is a choice of date, and the only thing it has
     to earn is that the galactic centre is above the horizon while the sky is
     dark. Sagittarius culminates at ninety minus the latitude minus its
     declination — twenty-nine degrees from this site, low in the south, which is
     exactly where the summer core sits from anywhere in the northern desert. Get
     the phasing wrong and it culminates at midday: the band is then under the
     horizon every hour the sun is, and the Milky Way is unreachable however
     brightly it is drawn. This puts the culmination in the small hours, after the
     gibbous moon has set. */
  const theta = (hours / 24) * Math.PI * 2 * 1.0027 + 3.6;
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  _mA.set(c, s, 0, s, -c, 0, 0, 0, 1);

  return out.multiplyMatrices(_mA, _mR);
}

const _gx = new THREE.Vector3();
const _gy = new THREE.Vector3();
const _gz = new THREE.Vector3();

function equatorial(raDeg: number, decDeg: number, out: THREE.Vector3): THREE.Vector3 {
  const ra = raDeg * DEG;
  const dec = decDeg * DEG;
  return out.set(Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec));
}

/** Celestial -> galactic, from the IAU pole and centre. */
export function galacticFrame(out: THREE.Matrix3): THREE.Matrix3 {
  equatorial(266.405, -28.936, _gx);
  equatorial(192.859, 27.128, _gz);
  _gy.crossVectors(_gz, _gx).normalize();
  _gx.crossVectors(_gy, _gz).normalize();
  return out.set(_gx.x, _gx.y, _gx.z, _gz.x, _gz.y, _gz.z, _gy.x, _gy.y, _gy.z);
}

const _gcFrame = new THREE.Matrix3();

/**
 * World-space direction of the galactic centre at a given hour — the brightest
 * part of the band, and therefore the thing worth pointing a camera at. Its
 * elevation is what decides whether the Milky Way is a feature of the sky or a
 * smudge behind the horizon.
 */
export function galacticCentreDirection(hours: number, out: THREE.Vector3): THREE.Vector3 {
  equatorial(266.405, -28.936, out);
  /* celestialFrame maps world -> celestial and is orthonormal, so its transpose
     takes the catalogue direction back to world space. */
  celestialFrame(hours, _gcFrame).transpose();
  return out.applyMatrix3(_gcFrame).normalize();
}

/* ------------------------- CPU transmittance --------------------------- */

function ozoneDensity(h: number): number {
  return Math.max(0, 1 - Math.abs(h - 25) / 15);
}

/**
 * Transmittance from an altitude toward a direction with cosine `mu` against
 * the zenith, out to space. Evaluated on the CPU so the lighting rig gets an
 * exact sun colour every frame with no GPU round trip.
 *
 * Steps are cubically distributed because the optical depth of a grazing ray is
 * dominated by its first few kilometres.
 */
export function transmittanceToSpace(
  altitudeKm: number,
  mu: number,
  m: MediumParams,
  out: THREE.Vector3,
): THREE.Vector3 {
  const r = PLANET_R + Math.max(altitudeKm, 0);
  const disc = r * r * (mu * mu - 1) + ATMOS_R * ATMOS_R;
  if (disc < 0) return out.set(0, 0, 0);
  const tTop = -r * mu + Math.sqrt(disc);

  /* Rays that meet the planet are blocked outright. */
  const groundDisc = r * r * (mu * mu - 1) + PLANET_R * PLANET_R;
  if (mu < 0 && groundDisc >= 0) return out.set(0, 0, 0);

  const steps = 40;
  let odR = 0;
  let odM = 0;
  let odD = 0;
  let odO = 0;
  let prev = 0;
  for (let i = 0; i < steps; i++) {
    const f = (i + 1) / steps;
    const t = tTop * f * f * f;
    const dt = t - prev;
    const tm = (t + prev) * 0.5;
    prev = t;
    const rr = Math.sqrt(r * r + tm * tm + 2 * r * tm * mu);
    const h = Math.max(rr - PLANET_R, 0);
    odR += Math.exp(-h / RAYLEIGH_H) * dt;
    odM += Math.exp(-h / m.mieHeight) * dt;
    odD += Math.exp(-h / m.dustHeight) * dt;
    odO += ozoneDensity(h) * dt;
  }

  return out.set(
    Math.exp(
      -(m.rayleigh.x * odR + m.mieExtinct.x * odM + m.dustExtinct.x * odD + m.ozone.x * odO),
    ),
    Math.exp(
      -(m.rayleigh.y * odR + m.mieExtinct.y * odM + m.dustExtinct.y * odD + m.ozone.y * odO),
    ),
    Math.exp(
      -(m.rayleigh.z * odR + m.mieExtinct.z * odM + m.dustExtinct.z * odD + m.ozone.z * odO),
    ),
  );
}
