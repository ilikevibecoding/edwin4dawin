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
 * water reflections see). The image-based light integrates that dome over the hemisphere; the cloud
 * raymarch lights its tops with the normalised sun (`sunI`, 0..1), so a sunlit cloud top comes out at a
 * radiance of ~1.0. A sunlit white surface has to land at the same radiance (it is the same white under the
 * same sun): irradiance E gives a Lambertian white E / pi, so E ≈ 3 puts sunlit paint, sand and cloud tops
 * on one scale (measured cloud tops sRGB 220-224, i.e. ~0.8; white paint then lands at ~1.0 with its share
 * of sky), and direct : sky-diffuse ≈ 4.5 : 1 on a horizontal surface at midday (the sky's cos-weighted mean
 * radiance is ~0.2 -> E_sky ≈ 0.65), the ratio of a clear day. The previous 6.0 lit the paint to 1.8 (a stop above the clouds):
 * every sunlit white, the sand and the concrete sat on the tonemapper's shoulder as a flat 244 with no
 * texture, and the exposure that made the sky match the reference could not hold them. `sunI * SUN_IRRADIANCE`
 * is what the CSM light receives. Moonlight keeps a 1:1 scale (the night exposure boost does the rest).
 */
export const SUN_IRRADIANCE = 3.0;
const MOON_IRRADIANCE = 1.0;
/** Mean albedo of the sunlit world below the horizon (water, sand, roads, canopy): warm neutral. */
const GROUND_ALBEDO = new THREE.Color(0.26, 0.24, 0.20);

const KEYS: Key[] = [
  // night: the dome is blue-black (the x3.5 night exposure lifts the zenith to ~sRGB 20, not 60); the glow over
  // the city is added separately (cityGlowSky), so the horizon away from it stays dark
  // moonlight (sunI) is kept low: with the night exposure a white hull under a x0.14 key read as a pale block
  { el: -18, sun: [0.5, 0.6, 0.85], sunI: 0.09, zen: [0.0012, 0.002, 0.005], hor: [0.004, 0.0055, 0.012], haze: [0.003, 0.004, 0.008], sunHaze: [0.004, 0.0045, 0.007], amb: 0.15 },
  { el: -8, sun: [0.5, 0.6, 0.85], sunI: 0.10, zen: [0.003, 0.006, 0.016], hor: [0.02, 0.022, 0.045], haze: [0.014, 0.016, 0.03], sunHaze: [0.05, 0.025, 0.025], amb: 0.16 },
  { el: -2, sun: [0.9, 0.35, 0.15], sunI: 0.06, zen: [0.015, 0.035, 0.10], hor: [0.40, 0.20, 0.19], haze: [0.22, 0.15, 0.19], sunHaze: [0.6, 0.15, 0.04], amb: 0.4 },
  // low sun: airmass extinction takes the direct beam well below its midday strength and reddens it (keeps the
  // sunset glitter path golden-orange). Sunset colours are far more saturated in linear light than they look:
  // the sun-side haze is ~1 : 0.18 : 0.04 (a photographed (255,170,80) sky once the tonemapper has compressed
  // it), the horizon away from the sun a salmon that skyRadiance cools toward violet; `hor` and the aureole
  // sit low enough in G that the sun side stays orange instead of clipping to cream
  { el: 4, sun: [1.0, 0.42, 0.16], sunI: 0.25, zen: [0.03, 0.09, 0.28], hor: [0.52, 0.21, 0.15], haze: [0.58, 0.30, 0.19], sunHaze: [0.62, 0.11, 0.025], amb: 0.5 },
  { el: 14, sun: [1.0, 0.74, 0.46], sunI: 0.62, zen: [0.03, 0.11, 0.34], hor: [0.50, 0.43, 0.40], haze: [0.55, 0.50, 0.50], sunHaze: [1.0, 0.66, 0.36], amb: 0.55 },
  // day: `hor` is the saturated blue-cyan of the sky a few degrees above the horizon, `zen` the deep cerulean
  // of the upper sky, `haze` the pale cyan-white the horizon and distant objects fade into (the reference
  // frame's horizon is a cyan-blue (148,181,194), not a neutral grey: the haze keeps R well below B).
  // amb: the environment probe (sky.ts) whitens the dome toward a bright neutral haze/ground fill so that
  // shadows are grey rather than blue; under a high sun that fill averages ~0.45, two to three times the
  // visible sky's mean radiance, and lit the shaded side of a white hull to 0.5 (sRGB 202 against a 244
  // sunlit top: 1.5 : 1 on screen where a photograph shows 4-6 : 1). Halving the IBL at high sun brings the
  // shaded white to ~0.2 (a 5 : 1 sunlit : shade ratio with the 3.0 sun) without touching the water's
  // mirror (it reads the probe without envMapIntensity). At low sun the salmon dome is drawn bright for its
  // glow, but as an illuminant a sunset sky delivers a third of the noon sky: with amb 0.8 the shaded faces
  // of the towers at 17:45 came out as bright as the sunlit ones (no long-shadow contrast at all), so the
  // low-sun keys are held near 0.5 too (shaded white ~0.4 of the horizon sky, as in a photograph).
  { el: 30, sun: [1.0, 0.94, 0.84], sunI: 0.938, zen: [0.006, 0.125, 0.36], hor: [0.11, 0.30, 0.45], haze: [0.40, 0.55, 0.66], sunHaze: [1.0, 0.92, 0.80], amb: 0.5 },
  { el: 90, sun: [1.0, 0.97, 0.93], sunI: 1.0, zen: [0.005, 0.125, 0.36], hor: [0.10, 0.30, 0.45], haze: [0.39, 0.55, 0.67], sunHaze: [0.98, 0.93, 0.84], amb: 0.5 },
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
  // hazeDensity: humid subtropical air, ~30-40 km visibility (the reference frame lifts a skyline 9 km away
  // most of the way to the sky colour); the last stretch before the far plane dissolves completely (applyAerial)
  // sunDim: the direct beam that reaches the ground through the deck; the dome, disc and cloud march see the
  // undimmed sun (it shines on the top of the clouds regardless)
  clear: { coverage: 0.27, hazeDensity: 4.0e-5, hazeHeight: 1400, windSpeed: 3.5, turbulence: 0.2, cloudBase: 1500, cloudTop: 3500, rain: 0, sunDim: 1 },
  scattered: { coverage: 0.37, hazeDensity: 4.6e-5, hazeHeight: 1300, windSpeed: 7, turbulence: 0.4, cloudBase: 1300, cloudTop: 3500, rain: 0, sunDim: 0.97 },
  // overcast: humid air under the deck (denser, taller haze) so the far end of the ceiling sinks into the horizon
  // haze; under a 65 % stratocumulus deck the direct sun is mostly scattered (soft, faint shadows in the gaps)
  cloudy: { coverage: 0.70, hazeDensity: 6.0e-5, hazeHeight: 1300, windSpeed: 10, turbulence: 0.7, cloudBase: 900, cloudTop: 2000, rain: 0, sunDim: 0.3 },
  storm: { coverage: 0.92, hazeDensity: 7.0e-5, hazeHeight: 900, windSpeed: 15, turbulence: 1.0, cloudBase: 700, cloudTop: 3200, rain: 1, sunDim: 0.18 },
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
    /** Aerial perspective reaches full extinction over the last part of the view distance: x start (m), y 1 / ramp
     *  length. Kept in step with the main camera's far plane by PostPipeline.finish. */
    uFarDissolve: { value: new THREE.Vector2(0.55 * 60000, 1 / (0.4 * 60000)) },
    uSunShare: { value: 0.6 },
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
    s.night = 1 - smoothstep(-12, -1, elevation);
    // overcast: the dome flattens toward a neutral grey of the horizon's brightness (no blue cast under the deck).
    // A 0.70 deck covers ~65 % of the sky, so it is already most of the way to a closed ceiling; the horizon
    // haze under it is lit by the deck's underside, dimmer than a clear sky's horizon, so the far end of the
    // ceiling meets a horizon of about its own brightness instead of a bright white band
    const grey = smoothstep(0.4, 0.8, p.coverage);
    // the environment map already darkens with the sky colours; the multiplier only mutes the IBL at night
    // (the night exposure boost would otherwise turn the dark-blue sky into a strong ground fill). Under a deck
    // the light the sun loses to the clouds comes back as diffuse skylight from the whole grey ceiling
    // (an overcast sky is a far brighter diffuse source than a clear one). The probe draws that ceiling at
    // 1.15-1.9x the horizon luminance (sky.ts); with the clear-sky keys halved for the fill (see `amb`) the
    // overcast level is set on its own: 1.2 puts a white horizontal at ~0.85x the sky band (lin 0.38 under a
    // 0.45 sky), where 0.5 x 1.5 left it at 0.26 — a white wing darker than the grey overcast above it.
    s.ambientIntensity = lerp(k.amb, 1.2, grey);
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
    // the dome's disc and the cloud march see the sun above the deck: undimmed by the weather
    u.uSunColor.value.copy(s.sunColor).multiplyScalar(k.sunI);
    u.uZenithColor.value.copy(zl);
    u.uHorizonColor.value.copy(hl);
    u.uHazeColor.value.copy(hazeL);
    u.uSunHazeColor.value.copy(s.sunHaze).multiplyScalar(lerp(1, 0.5, grey));
    u.uGroundColor.value.copy(s.ground);
    // what a cloud's shadow takes away: the direct beam's share of the irradiance on a horizontal receiver, from the
    // same scale the surfaces are lit with (CSM irradiance vs the probe's cos-weighted mean, ~1.4x the luminance of
    // the mid sky, times the IBL multiplier). 0.86 at clear noon (a cloud shadow as deep as a building's; the old
    // fixed 0.62 left it a stop lighter), ~0.2 at 17:45 where the sky lights the ground more than the low sun does.
    const eDirect = s.sunIntensity * Math.max(s.sunDir.y, 0);
    const midSky = zl.clone().lerp(hl, 0.6);
    const eSky = s.ambientIntensity * Math.PI * 1.4 * (midSky.r * 0.2126 + midSky.g * 0.7152 + midSky.b * 0.0722);
    u.uSunShare.value = eDirect / Math.max(eDirect + eSky, 1e-4);
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
