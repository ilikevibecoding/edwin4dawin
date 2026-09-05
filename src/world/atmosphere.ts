import * as THREE from 'three';
import type { Weather } from '../core/params';
import { clamp, lerp, smoothstep } from '../core/noise';

/** Colours & sun state for a time of day; all colours are linear-space HDR. */
export interface AtmosState {
  sunDir: THREE.Vector3;
  sunElevation: number; // degrees
  sunColor: THREE.Color;
  /** Irradiance of the key light (sun, or moon at night) on a perpendicular surface: the CSM light intensity. */
  sunIntensity: number;
  zenith: THREE.Color;
  horizon: THREE.Color;
  haze: THREE.Color;
  sunHaze: THREE.Color;
  /** Radiance of the sunlit ground seen from above (environment-map lower hemisphere, bounce light). */
  ground: THREE.Color;
  ambientIntensity: number;
  night: number;
}

interface Key { el: number; sun: [number, number, number]; sunI: number; zen: [number, number, number]; hor: [number, number, number]; haze: [number, number, number]; sunHaze: [number, number, number]; amb: number; }

/**
 * Radiometric balance. The sky colours below are the radiance of the visible dome (what the camera and the
 * water reflections see). The image-based light integrates that dome over the hemisphere, so for the sun to
 * dominate on sunlit surfaces the way it does outdoors (direct : sky diffuse ≈ 4 : 1 on a horizontal white
 * at midday) its irradiance has to be about 18x the zenith radiance. `sunI` in the keys is the normalised
 * 0..1 strength that the cloud raymarch and the sun disc were tuned against; the CSM light receives
 * `sunI * SUN_IRRADIANCE`. Moonlight keeps a 1:1 scale (the night exposure boost does the rest).
 */
export const SUN_IRRADIANCE = 6.0;
const MOON_IRRADIANCE = 1.0;
/** Mean albedo of the sunlit world below the horizon (water, sand, roads, canopy): warm neutral. */
const GROUND_ALBEDO = new THREE.Color(0.26, 0.24, 0.20);

const KEYS: Key[] = [
  // night: the dome is blue-black (the x3.5 night exposure lifts the zenith to ~sRGB 20, not 60); the glow over
  // the city is added separately (cityGlowSky), so the horizon away from it stays dark
  // moonlight (sunI) is kept low: with the night exposure a white hull under a x0.14 key read as a pale block
  { el: -18, sun: [0.5, 0.6, 0.85], sunI: 0.09, zen: [0.0012, 0.002, 0.005], hor: [0.004, 0.0055, 0.012], haze: [0.003, 0.004, 0.008], sunHaze: [0.004, 0.0045, 0.007], amb: 0.15 },
  { el: -8, sun: [0.5, 0.6, 0.85], sunI: 0.10, zen: [0.003, 0.006, 0.016], hor: [0.02, 0.022, 0.045], haze: [0.014, 0.016, 0.03], sunHaze: [0.05, 0.025, 0.025], amb: 0.16 },
  { el: -2, sun: [0.9, 0.35, 0.15], sunI: 0.06, zen: [0.015, 0.035, 0.10], hor: [0.42, 0.22, 0.2], haze: [0.22, 0.16, 0.2], sunHaze: [0.9, 0.35, 0.18], amb: 0.4 },
  // low sun: airmass extinction takes the direct beam well below its midday strength (keeps the sunset glitter path golden)
  { el: 4, sun: [1.0, 0.5, 0.22], sunI: 0.30, zen: [0.035, 0.10, 0.30], hor: [0.82, 0.48, 0.34], haze: [0.50, 0.40, 0.40], sunHaze: [1.0, 0.55, 0.3], amb: 0.85 },
  { el: 14, sun: [1.0, 0.74, 0.46], sunI: 0.62, zen: [0.03, 0.11, 0.34], hor: [0.66, 0.58, 0.54], haze: [0.54, 0.52, 0.54], sunHaze: [1.0, 0.75, 0.5], amb: 1.0 },
  // day: `hor` is the saturated blue-cyan of the sky a few degrees above the horizon (the whitening of the
  // last degrees comes from the haze band in skyRadiance), `zen` the deep cerulean of the upper sky
  { el: 30, sun: [1.0, 0.94, 0.84], sunI: 0.938, zen: [0.022, 0.12, 0.32], hor: [0.17, 0.29, 0.40], haze: [0.48, 0.54, 0.64], sunHaze: [1.0, 0.92, 0.80], amb: 1.0 },
  { el: 90, sun: [1.0, 0.97, 0.93], sunI: 1.0, zen: [0.02, 0.12, 0.32], hor: [0.16, 0.29, 0.40], haze: [0.47, 0.54, 0.65], sunHaze: [0.98, 0.93, 0.84], amb: 1.0 },
];

function mixKey(el: number): Key {
  let a = KEYS[0], b = KEYS[KEYS.length - 1];
  for (let i = 0; i < KEYS.length - 1; i++) {
    if (el >= KEYS[i].el && el <= KEYS[i + 1].el) { a = KEYS[i]; b = KEYS[i + 1]; break; }
  }
  const t = smoothstep(a.el, b.el, clamp(el, a.el, b.el));
  const m3 = (p: [number, number, number], q: [number, number, number]): [number, number, number] => [lerp(p[0], q[0], t), lerp(p[1], q[1], t), lerp(p[2], q[2], t)];
  return { el, sun: m3(a.sun, b.sun), sunI: lerp(a.sunI, b.sunI, t), zen: m3(a.zen, b.zen), hor: m3(a.hor, b.hor), haze: m3(a.haze, b.haze), sunHaze: m3(a.sunHaze, b.sunHaze), amb: lerp(a.amb, b.amb, t) };
}

export interface WeatherPreset { coverage: number; hazeDensity: number; hazeHeight: number; windSpeed: number; turbulence: number; cloudBase: number; cloudTop: number; rain: number; sunDim: number; }

export const WEATHER: Record<Weather, WeatherPreset> = {
  // coverage is the macro-field threshold (see cloudFieldCS): 0.27 ~ 8 % ground cover of sparse fair-weather
  // cumulus, 0.37 ~ 17 % (about 40 % of the sky band seen from 400 m), 0.70 ~ 65 % broken stratocumulus
  // (the raymarched cloud sheds the soft fringe of the footprint, so the visible cover is a little below these)
  // cloudTop is the ceiling of the tallest towers (cell height scales with how far the field exceeds the
  // threshold, most cells stay well below it); fair-weather cumulus here reach ~2 km of vertical development
  clear: { coverage: 0.27, hazeDensity: 1.5e-5, hazeHeight: 1400, windSpeed: 3.5, turbulence: 0.2, cloudBase: 1500, cloudTop: 3500, rain: 0, sunDim: 1 },
  scattered: { coverage: 0.37, hazeDensity: 1.9e-5, hazeHeight: 1300, windSpeed: 7, turbulence: 0.4, cloudBase: 1300, cloudTop: 3500, rain: 0, sunDim: 0.97 },
  // overcast: humid air under the deck (denser, taller haze) so the far end of the ceiling sinks into the horizon haze
  cloudy: { coverage: 0.70, hazeDensity: 4.6e-5, hazeHeight: 1300, windSpeed: 10, turbulence: 0.7, cloudBase: 900, cloudTop: 2000, rain: 0, sunDim: 0.6 },
  storm: { coverage: 0.92, hazeDensity: 5.5e-5, hazeHeight: 900, windSpeed: 15, turbulence: 1.0, cloudBase: 700, cloudTop: 3200, rain: 1, sunDim: 0.4 },
};

/** Sun position for Bahía Vista (latitude 25.8N, declination +10). */
export function sunDirection(hour: number): { dir: THREE.Vector3; elevation: number; azimuth: number } {
  const lat = (25.8 * Math.PI) / 180, dec = (10 * Math.PI) / 180;
  const ha = ((hour - 12) * 15 * Math.PI) / 180;
  const sinEl = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(ha);
  const el = Math.asin(clamp(sinEl, -1, 1));
  const cosAz = (Math.sin(dec) - Math.sin(el) * Math.sin(lat)) / (Math.cos(el) * Math.cos(lat) || 1e-6);
  let az = Math.acos(clamp(cosAz, -1, 1));
  if (ha > 0) az = 2 * Math.PI - az; // afternoon: west
  // north = -Z, east = +X
  const dir = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), -Math.cos(el) * Math.cos(az)).normalize();
  return { dir, elevation: (el * 180) / Math.PI, azimuth: (az * 180) / Math.PI };
}

export class Atmosphere {
  hour = 14.5;
  weather: Weather = 'clear';
  preset: WeatherPreset = WEATHER.clear;
  state: AtmosState = {
    sunDir: new THREE.Vector3(0, 1, 0), sunElevation: 60, sunColor: new THREE.Color(), sunIntensity: 3, zenith: new THREE.Color(), horizon: new THREE.Color(),
    haze: new THREE.Color(), sunHaze: new THREE.Color(), ground: new THREE.Color(), ambientIntensity: 1, night: 0,
  };
  /** Shared uniforms referenced by every atmosphere-aware material. */
  uniforms = {
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    /** Normalised (0..1 scale) sun radiance for the sky dome, sun disc and cloud raymarch; the CSM light uses `state.sunIntensity`. */
    uSunColor: { value: new THREE.Color(1, 1, 1) },
    uZenithColor: { value: new THREE.Color() },
    uHorizonColor: { value: new THREE.Color() },
    uHazeColor: { value: new THREE.Color() },
    uSunHazeColor: { value: new THREE.Color() },
    uGroundColor: { value: new THREE.Color() },
    uHazeDensity: { value: 3e-5 },
    uHazeHeight: { value: 1300 },
    uCloudCoverage: { value: 0.3 },
    uCloudBase: { value: 1500 },
    uCloudTop: { value: 2600 },
    uCloudWind: { value: new THREE.Vector2(0, 0) },
    uCloudSeed: { value: 0 },
    uNight: { value: 0 },
    uTime: { value: 0 },
    /** Light pollution of the lit city (downtown / midtown core): xy world xz of the centre, z radius (m) of the lit
     *  area, w radiance scale of the glow on the air and cloud bases above it (0 by day). */
    uCityGlow: { value: new THREE.Vector4(-3200, -3900, 3500, 0) },
    /** The same glow as the camera sees it, set per frame by Sky.render: xy horizontal unit direction (world xz) to
     *  the centre, z angular width of the lit horizon (small far away, > 1 over the city), w horizon radiance scale. */
    uCityGlowView: { value: new THREE.Vector4(0, -1, 0.3, 0) },
  };
  cloudOffset = new THREE.Vector2();
  windDir = new THREE.Vector2(1, 0.35).normalize();
  time = 0;

  constructor(seed: number) {
    this.uniforms.uCloudSeed.value = ((seed % 1000) / 1000) * 37.7;
  }

  setWeather(w: Weather): void {
    this.weather = w;
    this.preset = WEATHER[w];
  }

  update(dt: number): void {
    this.time += dt;
    const p = this.preset;
    this.cloudOffset.addScaledVector(this.windDir, p.windSpeed * 2.2 * dt);
    const { dir, elevation } = sunDirection(this.hour);
    const k = mixKey(elevation);
    const s = this.state;
    // below the horizon the moon takes over as the key light (roughly opposite the sun, kept above the horizon)
    const moon = new THREE.Vector3(-dir.x, Math.max(0.25, -dir.y * 0.8 + 0.3), -dir.z).normalize();
    const moonMix = smoothstep(0.0, -4.0, elevation);
    s.sunDir.copy(dir).lerp(moon, moonMix).normalize();
    s.sunElevation = elevation;
    s.sunColor.setRGB(k.sun[0], k.sun[1], k.sun[2]);
    const keyStrength = k.sunI * p.sunDim;
    s.sunIntensity = keyStrength * lerp(SUN_IRRADIANCE, MOON_IRRADIANCE, moonMix);
    s.zenith.setRGB(k.zen[0], k.zen[1], k.zen[2]);
    s.horizon.setRGB(k.hor[0], k.hor[1], k.hor[2]);
    s.haze.setRGB(k.haze[0], k.haze[1], k.haze[2]);
    s.sunHaze.setRGB(k.sunHaze[0], k.sunHaze[1], k.sunHaze[2]);
    // the environment map already darkens with the sky colours; the multiplier only mutes the IBL at night
    // (the night exposure boost would otherwise turn the dark-blue sky into a strong ground fill)
    s.ambientIntensity = k.amb;
    s.night = 1 - smoothstep(-12, -1, elevation);
    // overcast: the dome flattens toward a neutral grey of the horizon's brightness (no blue cast under the deck).
    // A 0.70 deck covers ~65 % of the sky, so it is already most of the way to a closed ceiling; the horizon
    // haze under it is lit by the deck's underside, dimmer than a clear sky's horizon, so the far end of the
    // ceiling meets a horizon of about its own brightness instead of a bright white band
    const grey = smoothstep(0.4, 0.8, p.coverage);
    const horLum = s.horizon.r * 0.2126 + s.horizon.g * 0.7152 + s.horizon.b * 0.0722;
    const overcast = new THREE.Color(horLum, horLum, horLum).lerp(s.horizon, 0.3);
    const zl = s.zenith.clone().lerp(overcast, grey * 0.85);
    const hl = s.horizon.clone().lerp(overcast, grey * 0.8).multiplyScalar(lerp(1, 0.72, grey));
    const hazeL = s.haze.clone().lerp(new THREE.Color(horLum, horLum, horLum), grey * 0.7).multiplyScalar(lerp(1, 0.72, grey));
    // bounce light from the world below: sunlit ground plus its share of the sky, scaled by the mean albedo
    const skyIrr = s.zenith.clone().lerp(s.horizon, 0.3);
    s.ground.copy(s.sunColor).multiplyScalar(s.sunIntensity * Math.max(s.sunDir.y, 0) / Math.PI).add(skyIrr).multiply(GROUND_ALBEDO);
    const u = this.uniforms;
    u.uSunDir.value.copy(dir);
    u.uSunColor.value.copy(s.sunColor).multiplyScalar(keyStrength);
    u.uZenithColor.value.copy(zl);
    u.uHorizonColor.value.copy(hl);
    u.uHazeColor.value.copy(hazeL);
    u.uSunHazeColor.value.copy(s.sunHaze).multiplyScalar(lerp(1, 0.5, grey));
    u.uGroundColor.value.copy(s.ground);
    // humid night air: distant city lights soften into the (city-lit) haze rather than staying pin sharp
    u.uHazeDensity.value = p.hazeDensity * (1 + 0.8 * s.night);
    // light pollution scale of the lit city; Sky.render derives the camera-relative glow from it every frame
    u.uCityGlow.value.w = 0.016 * s.night;
    u.uHazeHeight.value = p.hazeHeight;
    u.uCloudCoverage.value = p.coverage;
    u.uCloudBase.value = p.cloudBase;
    u.uCloudTop.value = p.cloudTop;
    u.uCloudWind.value.copy(this.cloudOffset);
    u.uNight.value = s.night;
    u.uTime.value = this.time;
  }
}
