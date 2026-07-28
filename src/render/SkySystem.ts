import * as THREE from 'three';
import type { GameContext, System } from '../core/GameContext';
import type { QualitySettings } from '../core/Quality';
import type {
  AerialPerspective,
  IRenderPipeline,
  ISky,
  WeatherState,
} from '../core/Interfaces';
import { DEG, clamp, lerp, saturate, smoothstep } from '../core/MathUtils';
import { registerVantages, type Vantage } from '../core/Vantage';
import { AtmosphereLUTs } from './atmosphere/AtmosphereLUTs';
import { CloudVolume } from './atmosphere/CloudVolume';
import { SkyDome } from './atmosphere/SkyDome';
import { createSkyUniforms, type Uniforms } from './atmosphere/SkyUniforms';
import {
  PRESET_NAMES,
  SKY_PRESETS,
  cloudProfileFor,
  coverageCurve,
  defaultProfile,
  type CloudProfile,
} from './atmosphere/SkyPresets';
import {
  celestialFrame,
  galacticCentreDirection,
  galacticFrame,
  lunarBrightness,
  lunarDirection,
  RAYLEIGH_H,
  solarDirection,
  transmittanceToSpace,
  type MediumParams,
} from './atmosphere/Celestial';

/* ------------------------------ constants ------------------------------- */

/**
 * Radiometry. One engine unit is one kilonit for a radiance and one kilolux for
 * an irradiance, which puts the whole day-night range inside half float with
 * room to spare: a white surface in noon sun lands near 30, the clear zenith
 * near 4, the solar disk in the tens of thousands.
 */
/**
 * White balance, folded into the illuminant.
 *
 * The extraterrestrial solar spectrum is about 5800 K and the beam that reaches
 * the ground at a middling elevation is nearer 5300 K, because the atmosphere
 * takes twenty per cent of the blue and three of the red. Both numbers are
 * facts; render either of them straight and every daylight preset comes out
 * amber, and an overcast comes out brown. Photographs do not, and the reason is
 * that a photograph is white balanced — a camera set to daylight divides that
 * warmth back out before anything reaches the file.
 *
 * There is no white balance stage in this pipeline to do it later, so it happens
 * here: the illuminant is scaled so the direct beam at 45 degrees through
 * ordinary air comes out neutral, at constant luminance. Everything downstream
 * inherits it — sky, cloud, aerial perspective, the lighting rig's key colour —
 * so the whole frame is consistently balanced rather than partly corrected.
 *
 * What survives is every *ratio*: golden hour is still five stops of red over
 * blue, because that is the difference between nine airmasses and one and a
 * half, not an absolute statement about either.
 */
const DAYLIGHT_WB = new THREE.Vector3(0.862, 1.02, 1.354);

/**
 * Radiometry. One engine unit is one kilonit for a radiance and one kilolux for
 * an irradiance, which puts the whole day-night range inside half float with
 * room to spare: a white surface in noon sun lands near 30, the clear zenith
 * near 4, the solar disk in the tens of thousands.
 *
 * The physical figures are (134, 126, 119) at 680/550/440 nm; these are those,
 * balanced.
 */
const SUN_TOA = new THREE.Vector3(134, 126, 119).multiply(DAYLIGHT_WB);
/** Full-moon irradiance above the atmosphere. Six orders of magnitude down. */
const MOON_TOA = new THREE.Vector3(3.4e-4, 3.2e-4, 2.9e-4).multiply(DAYLIGHT_WB);

/**
 * Calibrated so `moonDisk` — sun irradiance times lunar albedo times the
 * Lommel-Seeliger term — lands on the moon's real surface luminance of about
 * 4200 nits at full.
 */
const MOON_DISK_GAIN = 0.49;

/**
 * The one place the night is knowingly not physical.
 *
 * The moon's surface is around 1800 nits at this phase and the sky behind it is
 * around 0.0009, twenty-one stops down. Metered so the sky is legible, the disk
 * is a hundred stops of nothing — a white hole with a bloom skirt, which is
 * exactly what a photograph of a moonlit landscape looks like and exactly what
 * nobody wants in a game. So the disk is lifted by far less than the rest of the
 * night (this, against NIGHT_LIFT) and lands a few stops over white: the
 * highlands clip, the maria stay readable, bloom still fires. It is the same
 * cheat every shipped night scene makes, and it is confined to the disk — the
 * moonlight the lighting rig receives, the moonlit sky and the moon's aureole
 * all keep their physical ratios.
 */
const MOON_DISK_LIFT = 22;

/**
 * The solar disk's true radiance is irradiance over solid angle, 1.9e6 units,
 * which overflows half float and gives bloom nothing useful to do. Compressing
 * it by 40x keeps it emphatically the brightest thing in any frame while
 * leaving headroom above it.
 */
const SUN_DISK_SCALE = 380;

/** Rayleigh scattering and ozone absorption per kilometre at sea level. */
const RAYLEIGH = new THREE.Vector3(0.005802, 0.013558, 0.0331);
const OZONE = new THREE.Vector3(0.00065, 0.001881, 0.000085);

/**
 * Haze aerosol. `weather.haze` sets the scattering optical depth at 550 nm:
 * 0.015 is high-desert clean air, 0.115 a normal hazy afternoon, 0.215 heavy
 * industrial murk. Hillaire and Bruneton both ship 0.005, an Angstrom beta so
 * low it describes nowhere on Earth, and it is the single largest error in a
 * default-parameter atmosphere: with it the sun at six degrees is four times too
 * bright, there is no aureole, and the horizon stays thin instead of hazing out.
 */
const AEROSOL_AOD_MIN = 0.015;
const AEROSOL_AOD_PER_HAZE = 0.1;
/** Angstrom exponent 1.0: fine continental aerosol, blue attenuated most. */
const AEROSOL_SPECTRUM = new THREE.Vector3(0.92, 1.0, 1.22);
/** Single-scattering albedo; the remainder is soot and mineral absorption. */
const AEROSOL_SSA = 0.9;

/**
 * Mineral dust at `dust` = 1, per kilometre. Extinction rises toward blue
 * because iron oxide absorbs there, while scattering is nearly grey because the
 * grains are far larger than the wavelength. That pairing is exactly what turns
 * the sun blood-red and the murk tan.
 */
const DUST_EXTINCT = new THREE.Vector3(1.1, 1.24, 1.48);
const DUST_SCATTER = new THREE.Vector3(1.0, 0.98, 0.8);

/** Dual-lobe phase parameters for the haze aerosol and for coarse dust. */
const HAZE_PHASE = { g1: 0.92, g2: 0.12, lobe: 0.56 };
const DUST_PHASE = { g1: 0.85, g2: 0.2, lobe: 0.55 };

/**
 * A physically dark night is 17 stops below noon; the post chain's meter spans
 * 10.5. So the night hemisphere is rendered in a lifted unit: every radiance in
 * the frame — sky, stars, moon, cloud, and the values handed to the lighting rig
 * — is multiplied by the same factor, which leaves every ratio inside the frame
 * exactly physical and only moves the absolute level into range. `exposureHint`
 * reports where that level ended up.
 */
const NIGHT_LIFT = 420;

/**
 * Star peak radiance for the brightest magnitude in the distribution, before the
 * night lift. Calibrated against the sky it sits on rather than in absolute
 * terms, because that ratio is the only thing a viewer can judge: the brightest
 * star in the frame lands around a hundred and fifty times a moonlit zenith,
 * which blooms and reads as first magnitude, and the median one a few times it,
 * which reads as an ordinary star. A thousand times the sky — which is where an
 * unexamined figure lands — turns every one of them into a white disc.
 */
const STAR_UNIT = 5.5e-6;
/** Airglow: the 557.7 nm oxygen line makes a moonless zenith faintly green. */
const AIRGLOW = new THREE.Vector3(2.2e-7, 4.6e-7, 3.0e-7);
const MILKY_WAY_UNIT = 1.7e-6;

const AERIAL_MAX_KM = 8;
/** Waxing gibbous: a crescent that points at the sun and a bright enough night. */
const MOON_PHASE = 0.42;
/**
 * The phase the galactic-band vantage runs at.
 *
 * A gibbous moon rises before sunset and sets after sunrise — it is up every
 * dark hour there is, which is exactly why a gibbous night is a bad night for
 * the Milky Way. A waxing crescent sets in the early evening, so by the time the
 * galactic centre culminates it is thirty-six degrees under the horizon. Same
 * sky, a fortnight earlier.
 */
const ZENITH_MOON_PHASE = 0.14;

/** Middle grey the metered `exposureHint` aims the frame at. */
const METER_KEY = 0.16;

/**
 * Share of the measured horizon-ring radiance a cloud base sees. The ring is a
 * small part of the lower hemisphere but by far its brightest part, and a
 * cosine-weighted hemisphere average — which is what `skyColor` is — cannot
 * express that. This puts the energy back where it belongs.
 */
const HORIZON_BAND = 0.09;

/**
 * Near-surface diffuse albedo of a thick water cloud; must match
 * `CLOUD_ALBEDO` in clouds.glsl, which is the shader half of the same two-stream
 * model. A shade under the 0.8 a semi-infinite droplet cloud reflects, because
 * the march's single-scattering octaves supply the remainder.
 */
const CLOUD_ALBEDO = 0.55;

/** Matches CLOUD_DIFFUSION_K in clouds.glsl: (3/4)(1 - g) for droplets. */
const CLOUD_DIFFUSION_K = 0.1125;

/**
 * Eye height of the sky showcase vantages, in metres.
 *
 * These sat at 5 m when the level was a handful of blocks. It has since grown
 * three-storey terraces around the origin, and a sky shot framed from inside a
 * courtyard is nine tenths masonry — which is not a judgement about the sky one
 * way or the other. Forty-five clears the tallest roofline with room to spare
 * and leaves a strip of skyline along the bottom of the frame, which is what
 * gives a gradient something to be measured against.
 */
const SKY_VANTAGE_Y = 45;

/* ------------------------------- scratch -------------------------------- */

function luminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const _sun = new THREE.Vector3();
const _moon = new THREE.Vector3();
const _trans = new THREE.Vector3();
const _ambient = new THREE.Vector3();
const _horizon = new THREE.Vector3();
const _wind = new THREE.Vector3();
const _deck = new THREE.Vector3();
const _tmp = new THREE.Vector3();
const _aim = new THREE.Vector3();
const _shadowPoint = new THREE.Vector3();
const _shadowUv = new THREE.Vector2();

/**
 * The best hour for a look at the galactic band: both bodies well below the
 * horizon and the galactic centre well above it. Scanned in ten-minute steps
 * because the moon's declination depends on the phase and there is no closed
 * form worth writing for a value read once at startup.
 */
function darkestHour(phase: number): { hours: number; azimuth: number; elevation: number } {
  let best = { hours: 1, azimuth: 0, elevation: 0 };
  let bestElev = -2;
  let fallback = best;
  let fallbackScore = Infinity;
  for (let h = 19; h < 32; h += 1 / 6) {
    const hours = h % 24;
    const sun = solarDirection(hours, _tmp).y;
    const moon = lunarDirection(hours, phase, _aim).y;
    const gc = galacticCentreDirection(hours, _sun);
    const found = {
      hours,
      azimuth: Math.atan2(gc.x, -gc.z),
      elevation: Math.asin(clamp(gc.y, -1, 1)),
    };
    /* Astronomical twilight ends at eighteen degrees, and the band is faint
       enough that the difference between seventeen and nineteen is the difference
       between a Milky Way and an orange horizon. So the two conditions are hard
       gates rather than terms in a sum, and only then does the galactic centre's
       elevation choose between the hours that qualify. */
    if (sun < -0.313 && moon < -0.035) {
      if (gc.y > bestElev) {
        bestElev = gc.y;
        best = found;
      }
    }
    const score = Math.max(moon, -0.25) + Math.max(sun, -0.32) * 4;
    if (score < fallbackScore) {
      fallbackScore = score;
      fallback = found;
    }
  }
  return bestElev > -2 ? best : fallback;
}

function isSoftwareRenderer(renderer: THREE.WebGLRenderer): boolean {
  try {
    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(
      dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    ).toLowerCase();
    return /swiftshader|llvmpipe|softwarerasterizer|mesa offscreen|angle \(google/.test(name);
  } catch {
    return false;
  }
}

/**
 * Physical sky, atmosphere and weather.
 *
 * Scattering is Hillaire's restructuring of Bruneton: a 256x64 transmittance
 * table and a 32x32 infinite-order multiple-scattering table are baked once,
 * then a 256x144 sky-view table is baked whenever the sun moves, and the screen
 * costs two texture fetches per pixel. Rayleigh, a haze-driven Mie aerosol, a
 * separate mineral dust aerosol and an ozone layer; the ozone is what keeps the
 * zenith deep blue at dusk instead of muddy grey.
 *
 * Above that sits a raymarched volumetric cloud layer, a procedural night sky,
 * a world-parameterised aerial-perspective volume and an incrementally rebaked
 * environment probe. Output is linear HDR radiance throughout: no tone mapping,
 * no gamma, no `scene.background`.
 */
export default class SkySystem implements System, ISky {
  readonly key = 'sky';
  readonly order = 15;

  /* ----------------------------- ISky state ----------------------------- */

  readonly sunDirection = new THREE.Vector3(0, 1, 0);
  readonly sunColor = new THREE.Color(1, 1, 1);
  readonly sunTint = new THREE.Color(1, 1, 1);
  readonly skyColor = new THREE.Color(0, 0, 0);
  readonly moonDirection = new THREE.Vector3(0, -1, 0);
  readonly moonColor = new THREE.Color(0, 0, 0);
  readonly keyDirection = new THREE.Vector3(0, 1, 0);
  readonly keyColor = new THREE.Color(0, 0, 0);
  /** Synodic fraction: 0 new, 0.5 full. Sets the moon's declination too, so it
      decides how high the moon rides and when it sets. */
  moonPhase = MOON_PHASE;
  /** Base radiance the fog and the post chain's aerial term tint toward. */
  readonly horizonColor = new THREE.Color(0, 0, 0);

  sunElevation = Math.PI / 2;
  sunAzimuth = 0;
  sunOcclusion = 0;
  exposureHint = 0.03;

  readonly weather: WeatherState = {
    cloudCover: 0.42,
    haze: 0.62,
    windSpeed: 4,
    windDirection: 1.35,
    dust: 0,
  };

  readonly presetNames: readonly string[] = PRESET_NAMES;

  readonly aerialPerspective: AerialPerspective = {
    inscatter: null,
    transmittance: null,
    maxDistance: AERIAL_MAX_KM * 1000,
    sunAzimuth: 0,
    irradiance: new THREE.Color(SUN_TOA.x, SUN_TOA.y, SUN_TOA.z),
  };

  /** Simulated hours per real second. Zero keeps captures deterministic. */
  timeScale = 0;

  /* ----------------------------- internals ------------------------------ */

  private uniforms: Uniforms = createSkyUniforms();
  private luts!: AtmosphereLUTs;
  private clouds!: CloudVolume;
  private dome!: SkyDome;
  private ctx: GameContext | null = null;
  private software = false;
  private ready = false;

  private hours = 17.75;
  private revisionCount = 0;
  private cloudsEnabled = true;
  /** Two-stream diffuse transmittance of a fully covered cloud column. */
  private cloudDiffuse = 0.2;
  /** Fraction of the key a fully shadowed point loses; see `updateCloudProfile`. */
  cloudShadowStrength = 0.9;
  private profile: CloudProfile = defaultProfile();
  private medium: MediumParams = {
    rayleigh: RAYLEIGH.clone(),
    ozone: OZONE.clone(),
    mieExtinct: new THREE.Vector3(),
    mieHeight: 1.2,
    dustExtinct: new THREE.Vector3(),
    dustHeight: 0.85,
  };

  private nightLift = 1;
  private nightAmount = 0;
  private mediumDirty = true;
  private scatterDirty = true;
  private ambientDirty = true;
  private cloudDirty = true;
  private envDirty = true;
  private bakedSunY = 9;
  private bakedSunX = 9;
  private ambientCooldown = 0;
  private shadowCooldown = 0;
  private envResolution = 0;
  private envPrimed = false;
  private fog: THREE.FogExp2 | null = null;
  private ownsFog = false;

  private showcase = false;
  private showcaseCleaned = false;
  private preset = 'golden';

  /* ------------------------------ lifecycle ----------------------------- */

  init(ctx: GameContext): void {
    this.ctx = ctx;
    this.software = isSoftwareRenderer(ctx.renderer);

    const params = new URLSearchParams(location.search);
    this.showcase = params.get('showcase') === 'sky';
    const requested = params.get('sky');

    this.luts = new AtmosphereLUTs(this.uniforms, this.software);
    this.clouds = new CloudVolume(this.uniforms, ctx.quality, this.software);
    this.dome = new SkyDome(this.uniforms);
    ctx.scene.add(this.dome.mesh);

    this.aerialPerspective.inscatter = this.luts.aerial.textures[0];
    this.aerialPerspective.transmittance = this.luts.aerial.textures[1];

    /* The dome owns the background, so a solid clear colour would only be
       overdrawn. Fog stays as the fallback for anything the post chain's aerial
       perspective does not reach. */
    ctx.scene.background = null;
    if (!ctx.scene.fog) {
      this.fog = new THREE.FogExp2(0x000000, 4e-5);
      ctx.scene.fog = this.fog;
      this.ownsFog = true;
    } else if (ctx.scene.fog instanceof THREE.FogExp2) {
      this.fog = ctx.scene.fog;
    }

    galacticFrame(this.uniforms.uGalacticFrame.value as THREE.Matrix3);
    this.uniforms.uSunDiskScale.value = SUN_DISK_SCALE;
    this.uniforms.uMoonDiskGain.value = MOON_DISK_GAIN;
    this.uniforms.uAerialMaxDistance.value = AERIAL_MAX_KM;
    this.uniforms.uSkyViewSteps.value = this.software ? 22 : 32;
    this.uniforms.uDither.value = 0.006;

    this.applyPreset(requested && SKY_PRESETS[requested] ? requested : this.preset);

    const size = ctx.renderer.getDrawingBufferSize(new THREE.Vector2());
    this.updatePixelAngle(ctx, size.y);

    /* Bake order matters: transmittance feeds multiple scattering, both feed
       the sky-view pair, and the night cubemap needs the galactic frame. */
    this.rebakeMedium(ctx);
    this.clouds.bake(ctx.renderer);
    this.clouds.resize(size.x, size.y);
    this.dome.bakeNightCube(ctx.renderer, this.software ? 48 : 64);

    this.updateCelestial();
    this.rebakeScattering(ctx);
    this.refreshAmbient(ctx);

    this.envResolution = this.probeResolution(ctx.quality.envMapResolution);
    this.dome.ensureEnv(this.envResolution);

    this.registerSkyVantages();
    this.ready = true;
  }

  /**
   * A 256-pixel probe with inline cloud marching is six full-screen cloud
   * passes; on a software rasteriser that is a frame budget on its own, and the
   * probe is prefiltered into a handful of mips anyway.
   */
  private probeResolution(requested: number): number {
    const cap = this.software ? 96 : 256;
    return Math.max(32, Math.min(requested, cap));
  }

  private updatePixelAngle(ctx: GameContext, height: number): void {
    this.uniforms.uPixelAngle.value = (ctx.camera.fov * DEG) / Math.max(height, 1);
  }

  resize(width: number, height: number, ctx: GameContext): void {
    this.updatePixelAngle(ctx, height);
    this.clouds.resize(width, height);
  }

  onQualityChange(quality: QualitySettings, ctx: GameContext): void {
    this.uniforms.uSkyViewSteps.value = this.software ? 22 : 32;
    this.clouds.onQualityChange(ctx.renderer, quality, this.software);
    const res = this.probeResolution(quality.envMapResolution);
    if (res !== this.envResolution) {
      this.envResolution = res;
      this.dome.ensureEnv(res);
      this.envPrimed = false;
    }
    this.scatterDirty = true;
    this.envDirty = true;
  }

  /* -------------------------------- ISky -------------------------------- */

  get timeOfDay(): number {
    return this.hours;
  }

  get revision(): number {
    return this.revisionCount;
  }

  get environmentTexture(): THREE.Texture | null {
    return this.dome?.environmentTexture ?? null;
  }

  get cloudShadowMap(): THREE.Texture | null {
    return this.clouds?.shadowTexture ?? null;
  }

  get cloudShadowMatrix(): THREE.Matrix4 {
    return this.clouds.shadowMatrix;
  }

  setTimeOfDay(hours: number): void {
    const wrapped = ((hours % 24) + 24) % 24;
    if (Math.abs(wrapped - this.hours) < 1e-5) return;
    this.hours = wrapped;
    this.scatterDirty = true;
    this.clouds?.invalidate();
  }

  /**
   * Every field here feeds the cloud profile, so every field marks it dirty.
   *
   * It used to be that only `haze` and `dust` marked anything, and the profile
   * rebuild was reachable only as the tail of `rebakeMedium`. Since neither of
   * those is touched by a cover change, `setWeather({ cloudCover: 0.9 })` wrote
   * the field and stopped: the deck geometry, `uCloudCoverage`, the coverage
   * calibration and `sunOcclusion` all kept their old values, so the sky came
   * back byte-for-byte identical and the only way to get an overcast was to go
   * through `applyPreset`. The medium bake and the cloud profile are separate
   * costs — one re-bakes two LUTs on the GPU, the other is a few dozen lines of
   * arithmetic — so they get separate flags rather than one standing in for both.
   */
  setWeather(weather: Partial<WeatherState>): void {
    let changed = false;
    let mediumChanged = false;
    for (const key of Object.keys(this.weather) as Array<keyof WeatherState>) {
      const next = weather[key];
      if (next === undefined || !Number.isFinite(next)) continue;
      if (this.weather[key] === next) continue;
      this.weather[key] = next;
      changed = true;
      if (key === 'haze' || key === 'dust') mediumChanged = true;
      if (key === 'cloudCover' || key === 'dust') this.clouds?.invalidate();
    }
    if (!changed) return;
    this.mediumDirty = this.mediumDirty || mediumChanged;
    this.cloudDirty = true;
    this.scatterDirty = true;
    this.ctx?.events.emit('weather:changed', { ...this.weather });
  }

  applyPreset(name: string): boolean {
    const p = SKY_PRESETS[name];
    if (!p) return false;
    this.preset = name;
    this.moonPhase = MOON_PHASE;
    this.setTimeOfDay(p.timeOfDay);
    this.setWeather(p.weather);
    this.mediumDirty = true;
    this.scatterDirty = true;
    this.clouds?.invalidate();
    this.ctx?.events.emit('sky:preset', { name });
    return true;
  }

  /**
   * The probe is a cubemap the lighting rig can hand straight to
   * `PMREMGenerator`. It is refreshed one face per frame as the sky drifts, but
   * a caller asking for it explicitly gets all six immediately.
   */
  renderEnvironment(resolution: number): THREE.Texture | null {
    if (!this.ctx || !this.ready) return null;
    const res = this.probeResolution(resolution);
    if (res !== this.envResolution) {
      this.envResolution = res;
      this.dome.ensureEnv(res);
      this.envPrimed = false;
    }
    this.dome.renderAllFaces(this.ctx.renderer, this.envCloudSteps());
    this.envPrimed = true;
    this.envDirty = false;
    return this.dome.environmentTexture;
  }

  private envCloudSteps(): number {
    if (!this.cloudsEnabled) return 0;
    return this.software ? 7 : this.clouds.budget.envSteps;
  }

  /* -------------------------------- frame ------------------------------- */

  update(dt: number, ctx: GameContext): void {
    if (!this.ready) return;

    if (this.timeScale !== 0) this.setTimeOfDay(this.hours + dt * this.timeScale);

    this.uniforms.uTime.value = ctx.clock.elapsed;
    this.uniforms.uFrameIndex.value = ctx.clock.frame % 64;
    this.advanceWind(dt);

    const altitudeKm = Math.max(ctx.camera.position.y, 0) * 0.001;
    if (Math.abs(altitudeKm - (this.uniforms.uCamHeightKm.value as number)) > 0.03) {
      this.scatterDirty = true;
    }
    this.uniforms.uCamHeightKm.value = Math.max(altitudeKm, 0.0015);

    this.updateCelestial();

    if (this.mediumDirty) this.rebakeMedium(ctx);
    else if (this.cloudDirty) this.updateCloudProfile();
    if (this.scatterDirty || this.sunMovedEnough()) this.rebakeScattering(ctx);

    this.ambientCooldown -= dt;
    if (this.ambientDirty && this.ambientCooldown <= 0) {
      this.refreshAmbient(ctx);
      this.ambientCooldown = 0.12;
    }

    this.updateFog();
    this.updateProbe(ctx);

    if (this.showcase) this.driveShowcase(ctx);
  }

  lateUpdate(dt: number, ctx: GameContext): void {
    if (!this.ready) return;
    this.dome.follow(ctx.camera);
    this.clouds.update(ctx.renderer, ctx.camera, this.cloudsEnabled);

    this.shadowCooldown -= dt;
    if (this.cloudsEnabled && this.shadowCooldown <= 0) {
      this.clouds.updateShadow(ctx.renderer, ctx.camera);
      this.shadowCooldown = 0.25;
    }
    this.clouds.updateSunOcclusion(this.sunDirection, ctx.camera, this.cloudsEnabled);
    this.sunOcclusion = this.clouds.sunOcclusion;
  }

  /* ----------------------------- celestial ------------------------------ */

  private updateCelestial(): void {
    const u = this.uniforms;

    solarDirection(this.hours, _sun);
    lunarDirection(this.hours, this.moonPhase, _moon);
    this.sunDirection.copy(_sun);
    this.moonDirection.copy(_moon);
    this.sunElevation = Math.asin(clamp(_sun.y, -1, 1));
    this.sunAzimuth = Math.atan2(_sun.x, -_sun.z);
    this.aerialPerspective.sunAzimuth = this.sunAzimuth;

    (u.uSunDir.value as THREE.Vector3).copy(_sun);
    (u.uMoonDir.value as THREE.Vector3).copy(_moon);
    celestialFrame(this.hours, u.uCelestialFrame.value as THREE.Matrix3);

    /* Night ramps in through civil twilight and the unit lift follows it, so
       the stars arrive as the twilight fades rather than punching through it. */
    const elevDeg = this.sunElevation / DEG;
    this.nightAmount = smoothstep(1.5, -7.5, elevDeg);
    const nightRamp = smoothstep(-1.5, -11, elevDeg);
    this.nightLift = lerp(1, NIGHT_LIFT, nightRamp);
    const diskLift = lerp(1, MOON_DISK_LIFT, nightRamp);

    const lift = this.nightLift;
    (u.uSunIrradiance.value as THREE.Vector3).copy(SUN_TOA).multiplyScalar(lift);
    this.aerialPerspective.irradiance.setRGB(
      SUN_TOA.x * lift,
      SUN_TOA.y * lift,
      SUN_TOA.z * lift,
    );

    const phaseBrightness = lunarBrightness(_sun, _moon);
    u.uMoonBrightness.value = phaseBrightness;
    (u.uMoonIrradiance.value as THREE.Vector3)
      .copy(MOON_TOA)
      .multiplyScalar(phaseBrightness * lift);
    /* The moon lights the sky only while it is up, and only once the sun's own
       twilight has faded far enough for it to matter. */
    u.uMoonSkyStrength.value =
      this.nightAmount * smoothstep(-0.06, 0.04, _moon.y) * (phaseBrightness > 0.02 ? 1 : 0);
    /* The disk shader multiplies by the already-lifted sun irradiance, so the
       gain carries the ratio of the disk's own lift to the night's. */
    u.uMoonDiskGain.value =
      _moon.y > -0.12 ? (MOON_DISK_GAIN * diskLift) / lift : 0;

    u.uNightAmount.value = this.nightAmount;
    u.uStarBrightness.value = STAR_UNIT * lift * this.nightAmount;
    u.uNightCubeScale.value = MILKY_WAY_UNIT * lift * this.nightAmount;
    (u.uAirglow.value as THREE.Vector3).copy(AIRGLOW).multiplyScalar(lift * this.nightAmount);
    u.uStarTwinkle.value = this.software ? 0.6 : 1;

    this.updateKeyLight();
    this.updateExposureHint();
  }

  /**
   * Where a fixed-exposure consumer should meter this sky.
   *
   * The frame is metered rather than authored, from the two aggregates already
   * read back off the GPU plus the ground the key light is falling on, so the
   * value tracks weather and time of day instead of going stale. The result
   * spans 0.02 at noon to 60 at night: seventeen stops, which is six more than
   * the post chain's auto meter can travel, so anything that wants to see a
   * preset as intended has to be told.
   */
  private updateExposureHint(): void {
    const sky = luminance(this.skyColor.r, this.skyColor.g, this.skyColor.b);
    const horizon = luminance(this.horizonColor.r, this.horizonColor.g, this.horizonColor.b);
    /* What a camera aimed just above the horizon sees: mostly upper sky, pulled
       up by the bright band the horizon itself contributes. */
    const view = lerp(sky, horizon, 0.35);

    const g = this.uniforms.uGroundAlbedo.value as THREE.Vector3;
    const albedo = luminance(g.x, g.y, g.z);
    const key = luminance(this.keyColor.r, this.keyColor.g, this.keyColor.b);
    const ground = ((key * Math.max(this.keyDirection.y, 0) + Math.PI * sky) * albedo) / Math.PI;

    /* Floor the meter with the light the hemisphere average cannot see.
    
       `skyColor` comes from an integrator run with the celestial bodies switched
       off, which is right for an ambient term — a star contributes nothing to
       what a surface receives. It is wrong for a meter. On a moonless night the
       bodies are the entire subject: the galactic band and the star field are
       three orders of magnitude over the sky they sit on, and metering the sky
       alone divides by something near zero. The frame then comes back at a
       hundred thousand times the exposure it wanted and every pixel is white,
       which is a spectacular way to fail at rendering a dark sky. */
    const nightFloor =
      (MILKY_WAY_UNIT * 0.12 + AIRGLOW.y) * this.nightLift * this.nightAmount;
    const metered = Math.max(0.75 * view + 0.25 * ground, nightFloor, 1e-7);
    const bias = SKY_PRESETS[this.preset]?.exposureBias ?? 0;
    /* Bounded because a consumer multiplies by this. Seventeen stops is already
       more than any real camera travels, and past the ends of it the number is
       reporting a bug rather than a look. */
    this.exposureHint = clamp((METER_KEY / metered) * Math.pow(2, bias), 0.004, 200);
  }

  /**
   * `sunColor` is the irradiance a surface facing the sun receives, extinguished
   * along the sun's own path through the atmosphere. Evaluated on the CPU with
   * the same medium the GPU uses, because the lighting rig needs it every frame
   * and a GPU round trip would cost a stall for three floats.
   */
  private updateKeyLight(): void {
    const lift = this.nightLift;
    const altKm = this.uniforms.uCamHeightKm.value as number;

    transmittanceToSpace(altKm, this.sunDirection.y, this.medium, _trans);
    this.sunColor.setRGB(
      SUN_TOA.x * _trans.x * lift,
      SUN_TOA.y * _trans.y * lift,
      SUN_TOA.z * _trans.z * lift,
    );
    const peak = Math.max(this.sunColor.r, this.sunColor.g, this.sunColor.b, 1e-12);
    this.sunTint.setRGB(this.sunColor.r / peak, this.sunColor.g / peak, this.sunColor.b / peak);

    /* Sunlight reflected off the moon, extinguished twice over: once on the way
       to the moon (negligible, it is outside the atmosphere) and once on the way
       down to us. The cool cast is the scotopic shift, a perceptual convention
       rather than a spectral fact — moonlight is marginally warmer than sunlight. */
    transmittanceToSpace(altKm, this.moonDirection.y, this.medium, _tmp);
    const moonUp = saturate(this.moonDirection.y * 12);
    const moonScale = lunarBrightness(this.sunDirection, this.moonDirection) * lift * moonUp;
    this.moonColor.setRGB(
      MOON_TOA.x * _tmp.x * moonScale * 0.82,
      MOON_TOA.y * _tmp.y * moonScale * 0.94,
      MOON_TOA.z * _tmp.z * moonScale * 1.24,
    );

    /* Hand the rig one key light that crosses the terminator smoothly: the sun
       fades out below the horizon exactly as the moon fades in. */
    const sunWeight = saturate((this.sunDirection.y + 0.045) * 14);
    if (sunWeight > 0.001) {
      this.keyDirection.copy(this.sunDirection);
      this.keyColor.copy(this.sunColor).multiplyScalar(sunWeight);
      if (sunWeight < 0.999) {
        this.keyDirection.lerp(this.moonDirection, 1 - sunWeight).normalize();
        this.keyColor.r += this.moonColor.r * (1 - sunWeight);
        this.keyColor.g += this.moonColor.g * (1 - sunWeight);
        this.keyColor.b += this.moonColor.b * (1 - sunWeight);
      }
    } else {
      this.keyDirection.copy(this.moonDirection);
      this.keyColor.copy(this.moonColor);
    }

    /* Feed the cloud march the sun as it arrives at the layer, which is above
       most of the aerosol and therefore noticeably less reddened than the ground. */
    const mid = (this.profile.bottom + this.profile.top) * 0.5;
    transmittanceToSpace(mid, this.sunDirection.y, this.medium, _tmp);
    (this.uniforms.uCloudSunRadiance.value as THREE.Vector3).set(
      SUN_TOA.x * _tmp.x * lift,
      SUN_TOA.y * _tmp.y * lift,
      SUN_TOA.z * _tmp.z * lift,
    );
  }

  /* -------------------------------- wind -------------------------------- */

  private advanceWind(dt: number): void {
    if (dt <= 0) return;
    const u = this.uniforms;
    const w = this.weather;
    /* Wind aloft runs well ahead of the surface, and the layers shear. */
    const speed = w.windSpeed * 0.001;
    const dirX = Math.sin(w.windDirection);
    const dirZ = -Math.cos(w.windDirection);
    const shearX = Math.sin(w.windDirection + 0.42);
    const shearZ = -Math.cos(w.windDirection + 0.42);

    /* Both volumes tile, so the offsets must wrap on a tile boundary or the
       pattern jumps. Detail scale is an integer multiple of shape scale, which
       makes the shape period a whole number of detail periods. */
    const shapeWrap = 4 / Math.max(this.profile.shapeScale, 1e-4);
    const detailWrap = shapeWrap / 8;
    const weatherWrap = 1 / Math.max(u.uCloudWeatherScale.value as number, 1e-6);

    _wind.copy(u.uCloudWind.value as THREE.Vector3);
    _wind.x = (_wind.x - dirX * speed * 2.6 * dt) % shapeWrap;
    _wind.z = (_wind.z - dirZ * speed * 2.6 * dt) % shapeWrap;
    (u.uCloudWind.value as THREE.Vector3).copy(_wind);

    _wind.copy(u.uCloudWind2.value as THREE.Vector3);
    _wind.x = (_wind.x - shearX * speed * 1.8 * dt) % detailWrap;
    _wind.y = (_wind.y - speed * 0.5 * dt) % detailWrap;
    _wind.z = (_wind.z - shearZ * speed * 1.8 * dt) % detailWrap;
    (u.uCloudWind2.value as THREE.Vector3).copy(_wind);

    const o1 = u.uWeatherOffset.value as THREE.Vector2;
    o1.x = (o1.x + dirX * speed * 2.6 * dt) % weatherWrap;
    o1.y = (o1.y + dirZ * speed * 2.6 * dt) % weatherWrap;
    const o2 = u.uWeatherOffset2.value as THREE.Vector2;
    o2.x = (o2.x + shearX * speed * 1.3 * dt) % weatherWrap;
    o2.y = (o2.y + shearZ * speed * 1.3 * dt) % weatherWrap;

    /* Vertical drift through the shape volume: the field boils and regrows
       instead of sliding past as a rigid pattern. */
    u.uCloudEvolve.value =
      ((u.uCloudEvolve.value as number) + dt * (0.0022 + speed * 0.35)) % 4;
  }

  /* ------------------------------- medium ------------------------------- */

  private rebakeMedium(ctx: GameContext): void {
    const u = this.uniforms;
    const haze = clamp(this.weather.haze, 0, 2);
    const dust = clamp(this.weather.dust, 0, 1.5);

    /* Scattering optical depth at 550 nm, spread over a scale height that
       compresses as the air thickens: a hazy day has its aerosol trapped under
       an inversion, a clean one has it mixed through the boundary layer. */
    const aod = AEROSOL_AOD_MIN + AEROSOL_AOD_PER_HAZE * haze;
    const mieHeight = lerp(1.4, 0.85, saturate(haze * 0.55));
    const beta = aod / mieHeight;
    (u.uMieScatter.value as THREE.Vector3).copy(AEROSOL_SPECTRUM).multiplyScalar(beta);
    (u.uMieExtinct.value as THREE.Vector3)
      .copy(AEROSOL_SPECTRUM)
      .multiplyScalar(beta / AEROSOL_SSA);
    u.uMieHeight.value = mieHeight;
    /* Blowing sand is not a ground fog. A haboob's leading edge is a wall a
       kilometre and a half high and the grains stay lofted by the same
       turbulence that raised them, so the murk fills the sky rather than lying in
       a layer under it. Left at the boundary-layer scale height the zenith stays
       blue while the horizon goes orange, which reads as a dust *bank* seen from
       outside instead of a storm the camera is standing in. */
    const dustHeight = lerp(0.85, 1.6, saturate(dust));
    u.uDustHeight.value = dustHeight;
    (u.uDustScatter.value as THREE.Vector3).copy(DUST_SCATTER).multiplyScalar(dust);
    (u.uDustExtinct.value as THREE.Vector3).copy(DUST_EXTINCT).multiplyScalar(dust);

    /* Haze and dust share one phase function, so blend its lobes by how much of
       the column's scattering each contributes. Both are strongly forward, so
       the aureole survives the blend; what changes is how wide it is. */
    const dustWeight = saturate((dust * 0.93 * 0.85) / (dust * 0.93 * 0.85 + beta + 1e-6));
    u.uAerosolG1.value = lerp(HAZE_PHASE.g1, DUST_PHASE.g1, dustWeight);
    u.uAerosolG2.value = lerp(HAZE_PHASE.g2, DUST_PHASE.g2, dustWeight);
    u.uAerosolLobe.value = lerp(HAZE_PHASE.lobe, DUST_PHASE.lobe, dustWeight);

    /* Sand, and quite bright: the ground bounce is a real part of a desert sky. */
    (u.uGroundAlbedo.value as THREE.Vector3).set(0.33, 0.28, 0.2);

    this.medium.mieExtinct.copy(u.uMieExtinct.value as THREE.Vector3);
    this.medium.mieHeight = mieHeight;
    this.medium.dustHeight = dustHeight;
    this.medium.dustExtinct.copy(DUST_EXTINCT).multiplyScalar(dust);

    this.updateCloudProfile();

    this.luts.bakeStatic(ctx.renderer);
    this.mediumDirty = false;
    this.scatterDirty = true;
  }

  /**
   * Range along a shallow ray climbing to `targetKm` at which the air's own
   * optical depth reaches ~2.6, i.e. where 7% of a distant object's contrast
   * survives.
   *
   * A ray that rises to h over a length L through a species with scale height H
   * has mean density `(H/h)(1 - exp(-h/H))` relative to sea level, which is
   * independent of L — so the optical depth is linear in L and the range inverts
   * in closed form. Green channel only; the three differ by less than the
   * threshold is worth.
   */
  private visualRangeKm(targetKm: number): number {
    const m = this.medium;
    const h = Math.max(targetKm, 0.05);
    const mean = (scale: number): number => (scale / h) * (1 - Math.exp(-h / scale));
    const sigma =
      m.rayleigh.y * mean(RAYLEIGH_H) +
      m.mieExtinct.y * mean(m.mieHeight) +
      m.dustExtinct.y * mean(m.dustHeight) +
      m.ozone.y * 0.1;
    return sigma > 1e-6 ? 3 / sigma : 1e4;
  }

  private updateCloudProfile(): void {
    const u = this.uniforms;
    const w = this.weather;
    cloudProfileFor(w.cloudCover, w.dust, this.profile);
    const p = this.profile;

    this.cloudsEnabled = w.cloudCover > 0.015 && p.density > 0.01;
    u.uCloudBottom.value = p.bottom;
    u.uCloudTop.value = p.top;
    u.uCloudTypeBias.value = p.type;
    u.uCloudTypeVariance.value = p.typeVariance;
    u.uCloudDensity.value = p.density;
    u.uCloudExtinction.value = p.extinction;
    u.uCloudShapeScale.value = p.shapeScale;
    /* Integer multiple of the shape scale so a wrapped wind offset stays
       seamless in both volumes; six puts the erosion detail at about a sixth of
       a cell, which is the billow size, and keeps it above the march step so it
       does not alias into sparkle. */
    u.uCloudDetailScale.value = p.shapeScale * 6;
    u.uCloudErosion.value = p.erosion;
    u.uCloudAnvil.value = p.anvil;
    u.uCloudCoverage.value = coverageCurve(w.cloudCover, p.coverageGain);
    /* Reach, capped by how far the air lets anything be seen at all. Marching
       past that is not conservative, it is actively harmful: the samples out
       there are a kilometre apart, so what they return is a boxy lump rather
       than a cloud, and the haze in front of it is only *nearly* opaque — a
       fifteen per cent residue of a hard-edged block is still a hard-edged
       block, and a sandstorm ends up with a row of them ruled along the horizon.
       Beyond a couple of optical depths there is nothing to be gained by looking,
       so the budget goes to the part of the layer that is actually visible. */
    u.uCloudMaxDist.value = Math.min(p.maxDistance, this.visualRangeKm(p.bottom));

    /* Fraction of the light falling on a fully covered column that emerges under
       it, from the same two-stream form the march uses — `cloudEmergent`, and the
       two must agree or the ground is lit by a different sky than the one drawn.
       Droplets barely absorb, so a thick deck passes a sixth of the sun rather
       than none of it, which is why an overcast day is dim rather than dark. The
       0.4 is the mean density over a column as a fraction of the profile's peak;
       the field is normalised over the full headroom above the coverage
       threshold, so it averages appreciably below its cores. */
    const tau = p.density * p.extinction * (p.top - p.bottom) * 0.4;
    this.cloudDiffuse =
      (CLOUD_ALBEDO * (1 - Math.exp(-tau * 0.4))) / (1 + CLOUD_DIFFUSION_K * tau);

    /* How much of the key a fully shadowed point should lose, for a rig that
       gates a directional light on the map.
       
       Beer's law on its own says all of it: a cumulus column runs to fifty
       optical depths and passes no unscattered photons whatever. What survives is
       the forward-scattered beam — droplets scatter at g = 0.85, so light leaving
       the beam is mostly still travelling with it and arrives within a few degrees
       of the sun, which is close enough to the key's direction to belong on the
       directional term rather than the ambient one. That fraction is the deck's
       two-stream diffuse transmittance, the same number the march and the ground
       bounce already use, so the three agree by construction.
       
       It lands at 0.87 for a thick stratus lid and 0.92 for cumulus, which is to
       say the 0.9 this replaced was about right. The flat frames were not caused
       by the multiplier; they were caused by the map it multiplied. */
    this.cloudShadowStrength = clamp(1 - this.cloudDiffuse, 0.35, 0.95);
    /* The weather map tiles every 1/scale km with WEATHER_PERIOD cells inside, so
       this sets the spacing between cloud *groups*. What matters is the group's
       angular size, not its width in kilometres, so it tracks the base height:
       four-kilometre groups under a cumulus base at 1.4 km, and a lid at 600 m
       needs them under two or it fills the sky with one. */
    u.uCloudWeatherScale.value = clamp(0.063 / p.bottom, 0.03, 0.11);
    /* Shear across the layer, downwind. A metre per second of shear per hundred
       metres of height is ordinary, which over a three-kilometre cumulus is most
       of a kilometre of lean; it scales with the layer depth because a deeper
       cloud spans more of the shear profile. */
    const shear = clamp(0.35 + w.windSpeed * 0.055, 0.35, 1.1) * (p.top - p.bottom);
    (u.uCloudShear.value as THREE.Vector2).set(
      Math.sin(w.windDirection) * shear,
      -Math.cos(w.windDirection) * shear,
    );
    u.uCloudPowder.value = lerp(0.85, 0.35, saturate(w.cloudCover));
    u.uCloudPhaseG.value = 0.74;
    u.uCloudBackG.value = -0.3;
    this.clouds.shadowExtentKm = clamp(p.top * 0.9, 1.5, 6);
    /* Last, because the threshold depends on the cover setting above. */
    this.clouds.coverChanged();
    this.cloudDirty = false;
    this.ambientDirty = true;
    this.envDirty = true;
  }

  /* ------------------------------ scattering ---------------------------- */

  private sunMovedEnough(): boolean {
    const dy = Math.abs(this.sunDirection.y - this.bakedSunY);
    const dx = Math.abs(this.sunDirection.x - this.bakedSunX);
    return dy > 0.0035 || dx > 0.006;
  }

  private rebakeScattering(ctx: GameContext): void {
    this.luts.bakeSkyView(ctx.renderer, this.sunDirection, false);
    if ((this.uniforms.uMoonSkyStrength.value as number) > 0.002) {
      this.luts.bakeSkyView(ctx.renderer, this.moonDirection, true);
    }
    this.luts.bakeAerial(ctx.renderer, this.sunDirection);
    /* The aerial bake leaves the light direction pointing wherever it finished;
       restore it so nothing downstream reads a stale value. */
    (this.uniforms.uBakeLightDir.value as THREE.Vector3).copy(this.sunDirection);

    this.bakedSunY = this.sunDirection.y;
    this.bakedSunX = this.sunDirection.x;
    this.scatterDirty = false;
    this.ambientDirty = true;
    this.envDirty = true;
    this.bumpRevision(ctx);
  }

  private bumpRevision(ctx: GameContext): void {
    this.revisionCount++;
    ctx.events.emit('sky:changed', {
      timeOfDay: this.hours,
      revision: this.revisionCount,
      sunElevation: this.sunElevation,
    });
  }

  private refreshAmbient(ctx: GameContext): void {
    this.luts.readAmbient(ctx.renderer, _ambient, _horizon);

    /* Cloud ambient: an optically thick medium lit by isotropic sky radiance
       leaves with about that radiance, and the base additionally sees the
       ground's bounce. This one stays the *clear* sky deliberately — it is the
       light falling on the deck, so folding the deck's own output back into it
       would be a feedback loop. */
    (this.uniforms.uCloudAmbient.value as THREE.Vector3).set(
      _ambient.x,
      _ambient.y,
      _ambient.z,
    );
    /* The ground under a deck is not in full sun, and a cloud base lit by bounce
       off ground that is itself in the cloud's shadow is a loop that has to be
       closed: leave it open and an overcast renders as a brown ceiling, lit by
       seven thousand nits of sand that in reality is under two thousand. What
       gets through is the deck's diffuse transmittance, on the covered fraction. */
    const g = this.uniforms.uGroundAlbedo.value as THREE.Vector3;
    const cover = this.cloudsEnabled ? (this.uniforms.uCloudCoverage.value as number) : 0;
    const lit = Math.max(this.sunDirection.y, 0) * (1 - cover * (1 - this.cloudDiffuse));
    (this.uniforms.uCloudGroundBounce.value as THREE.Vector3).set(
      (this.sunColor.r * lit + _ambient.x * Math.PI) * g.x / Math.PI,
      (this.sunColor.g * lit + _ambient.y * Math.PI) * g.y / Math.PI,
      (this.sunColor.b * lit + _ambient.z * Math.PI) * g.z / Math.PI,
    );

    /* Irradiance entering the layer, which is what the deep multiple-scattering
       term diffuses through it: the beam normal to itself, plus the sky above.
       No elevation factor and no coverage factor. The foreshortening lives in the
       optical depth along the sun ray — a low sun gets a long path through the
       layer, which is the same statement — and applying it here as well cost a
       stop and a half that the auto-exposure then took back out of the sky:
       white cumulus against a navy zenith, which is the signature of a renderer
       whose clouds are too dark rather than whose sky is too dim. */
    const sunRad = this.uniforms.uCloudSunRadiance.value as THREE.Vector3;
    const top = this.uniforms.uCloudTopLight.value as THREE.Vector3;
    top.set(
      sunRad.x + _ambient.x * Math.PI,
      sunRad.y + _ambient.y * Math.PI,
      sunRad.z + _ambient.z * Math.PI,
    );

    /* What the *ground* sees overhead, which is what the lighting rig and the
       fog want. Under a deck that is the deck, not the sky behind it: a cloud
       layer of optical depth fifty passes a sixth of what falls on it and hides
       the rest, so the ambient goes neutral grey and rises, and the shadows on
       the ground lose their blue. Reporting the clear-sky hemisphere here is why
       an overcast render lights its scene as though the lid were not there.
       
       Unlike the march's source term this one is the *horizontal* downwelling
       irradiance, because it is paired with the vertical optical depth rather
       than the slant one. The two agree: for a thick slab the extra path length
       at a low sun costs the same factor the projection does. */
    const geom = Math.max(this.sunDirection.y, 0);
    const deckRad = _deck
      .set(
        sunRad.x * geom + _ambient.x * Math.PI,
        sunRad.y * geom + _ambient.y * Math.PI,
        sunRad.z * geom + _ambient.z * Math.PI,
      )
      .multiplyScalar(this.cloudDiffuse / Math.PI);
    const hidden = saturate(cover * (1 - this.cloudDiffuse));
    this.skyColor.setRGB(
      lerp(_ambient.x, deckRad.x, hidden),
      lerp(_ambient.y, deckRad.y, hidden),
      lerp(_ambient.z, deckRad.z, hidden),
    );
    /* The horizon ring keeps more of the clear sky than the zenith does: the
       deck ends at the horizon, and the last kilometres of air beneath it are
       lit from the side by whatever is under the edge of the lid. */
    const hiddenLow = hidden * 0.55;
    this.horizonColor.setRGB(
      lerp(_horizon.x, deckRad.x, hiddenLow),
      lerp(_horizon.y, deckRad.y, hiddenLow),
      lerp(_horizon.z, deckRad.z, hiddenLow),
    );

    /* The ring of sky around the horizon, as a share of the lower hemisphere a
       cloud base sees. It matters at every time of day — at noon the ring is
       three times the zenith's radiance and at sunset fifteen times it — so
       unlike the ground bounce it is never gated on the sun's elevation. */
    (this.uniforms.uCloudHorizonLight.value as THREE.Vector3).set(
      this.horizonColor.r * HORIZON_BAND,
      this.horizonColor.g * HORIZON_BAND,
      this.horizonColor.b * HORIZON_BAND,
    );
    this.ambientDirty = false;
  }

  /* --------------------------------- fog -------------------------------- */

  /**
   * A fallback for anything not going through the post chain's aerial
   * perspective. The colour is the measured horizon radiance, so a silhouette
   * fades into exactly the sky behind it; the density is exaggerated over the
   * true molecular value because a 900 m map would otherwise show no depth cue
   * at all.
   */
  private updateFog(): void {
    if (!this.fog) return;
    const w = this.weather;
    this.fog.density = 2.2e-5 + 7.5e-5 * saturate(w.haze) + 1.8e-3 * saturate(w.dust);
    this.fog.color.copy(this.horizonColor);
  }

  /* -------------------------------- probe ------------------------------- */

  private updateProbe(ctx: GameContext): void {
    if (!this.envPrimed) {
      this.dome.renderAllFaces(ctx.renderer, this.envCloudSteps());
      this.envPrimed = true;
      this.envDirty = false;
      return;
    }
    if (!this.envDirty) return;
    /* One face a frame: the whole probe costs a sixth of a cube bake per frame
       and never lags the sky by more than a hundred milliseconds. */
    if (this.dome.renderNextFace(ctx.renderer, this.envCloudSteps())) {
      this.envDirty = false;
    }
  }

  /* ------------------------------ showcase ------------------------------ */

  /**
   * `?showcase=sky` is a clean horizon: the greybox is hidden so the frame is
   * atmosphere only, and the exposure is pinned to the preset's own value so a
   * night reads as a night instead of being metered back to middle grey.
   */
  private driveShowcase(ctx: GameContext): void {
    if (!this.showcaseCleaned) {
      this.showcaseCleaned = true;
      for (const child of ctx.scene.children) {
        if (child === this.dome.mesh) continue;
        if ((child as THREE.Mesh).isMesh) child.visible = false;
      }
    }
    const post = ctx.tryGet<IRenderPipeline>('render');
    if (!post) return;
    post.setExposure(this.exposureHint);
    /* Lens artefacts belong to the camera, not the sky. Silencing the ones that
       paste geometry over the frame is what makes this a usable reference shot. */
    const lens = post as unknown as { flareStrength?: number; dirtStrength?: number };
    if (lens.flareStrength !== undefined) lens.flareStrength = 0;
    if (lens.dirtStrength !== undefined) lens.dirtStrength = 0;
  }

  /* ------------------------------- probes ------------------------------- */

  /** Linear HDR radiance in a world direction, in engine units. */
  sampleRadiance(dir: THREE.Vector3, celestials = true): THREE.Color {
    const out = new THREE.Color();
    if (!this.ctx) return out;
    this.luts.readRadiance(this.ctx.renderer, _tmp.copy(dir).normalize(), _trans, celestials);
    return out.setRGB(_trans.x, _trans.y, _trans.z);
  }

  /**
   * Radiance in a direction *through* the cloud layer, plus the layer's
   * transmittance along it. There is no other way to tell a cumulus from a veil
   * in a screenshot: both are white, and only the number says whether the sky
   * behind is coming through.
   */
  sampleCloud(dir: THREE.Vector3): { radiance: THREE.Color; transmittance: number } {
    const out = new THREE.Color();
    if (!this.ctx || !this.cloudsEnabled) return { radiance: out, transmittance: 1 };
    const t = this.luts.readRadiance(
      this.ctx.renderer,
      _tmp.copy(dir).normalize(),
      _trans,
      true,
      this.software ? 44 : 64,
    );
    return { radiance: out.setRGB(_trans.x, _trans.y, _trans.z), transmittance: t };
  }

  /**
   * The cloud march's geometry in a direction: how far away what it found is, how
   * far it was willing to look, and how much of the cloud's own radiance survives
   * the air in between.
   *
   * The last number is the one worth having. A distant deck that reads as a row
   * of hard grey blocks is either shaped like blocks or is not being washed into
   * the haze, and those want opposite fixes.
   */
  sampleCloudGeometry(dir: THREE.Vector3): {
    distance: number;
    reach: number;
    airTransmittance: number;
    transmittance: number;
  } {
    if (!this.ctx || !this.cloudsEnabled) {
      return { distance: 0, reach: 0, airTransmittance: 1, transmittance: 1 };
    }
    const t = this.luts.readRadiance(
      this.ctx.renderer,
      _tmp.copy(dir).normalize(),
      _trans,
      true,
      this.software ? 44 : 64,
      1,
    );
    return { distance: _trans.x, reach: _trans.y, airTransmittance: _trans.z, transmittance: t };
  }

  /**
   * Everything needed to check the cloud shadow's geometry from outside: the
   * baked map, the footprint it covers, and the cloud field it is supposed to be
   * the shadow of.
   *
   * The claim worth testing is not "the map has dark patches" but "the dark patch
   * under a point is the shadow of the cloud on that point's *sun ray*, not the
   * one above its head". That needs the map and the field in the same call so a
   * test can correlate one against the other at a known lag.
   */
  shadowProbe(): {
    map: { size: number; data: Float32Array; centerKm: THREE.Vector2; extentKm: number } | null;
    sunDirection: THREE.Vector3;
    sunElevationDeg: number;
    sunAzimuthDeg: number;
    layerBottomKm: number;
    layerTopKm: number;
    strength: number;
    coverAtKm: (x: number, z: number) => number;
    uvFor: (x: number, y: number, z: number) => { u: number; v: number };
  } | null {
    if (!this.ctx) return null;
    return {
      map: this.clouds.readShadow(this.ctx.renderer),
      sunDirection: this.sunDirection.clone(),
      sunElevationDeg: this.sunElevation / DEG,
      sunAzimuthDeg: this.sunAzimuth / DEG,
      layerBottomKm: this.uniforms.uCloudBottom.value as number,
      layerTopKm: this.uniforms.uCloudTop.value as number,
      strength: this.cloudShadowStrength,
      coverAtKm: (x, z) => this.clouds.coverAtKm(x, z),
      uvFor: (x, y, z) => {
        const uv = this.clouds.shadowUv(_shadowPoint.set(x, y, z), _shadowUv);
        return { u: uv.x, v: uv.y };
      },
    };
  }

  /**
   * Everything a reviewer needs as a number rather than a pixel: the sky is
   * absolute radiance, and a tone-mapped screenshot cannot tell 4 units from 40.
   */
  debugReport(): Record<string, unknown> {
    const fmt = (c: THREE.Color): string =>
      `${c.r.toPrecision(3)}, ${c.g.toPrecision(3)}, ${c.b.toPrecision(3)}`;
    const fmtVec = (v: THREE.Vector3): string =>
      `${v.x.toPrecision(3)}, ${v.y.toPrecision(3)}, ${v.z.toPrecision(3)}`;
    const az = this.sunAzimuth;
    const towardSun = new THREE.Vector3(
      Math.sin(az) * 0.985,
      0.174,
      -Math.cos(az) * 0.985,
    ).normalize();
    const away = new THREE.Vector3(-towardSun.x, 0.174, -towardSun.z).normalize();
    const zenith = new THREE.Vector3(0, 1, 0);
    const body = this.sunDirection.y > -0.02 ? this.sunDirection : this.moonDirection;
    const disk = body.clone();
    /* Two degrees off the body, in the plane containing it and the zenith: the
       aureole is the whole point of a dual-lobe aerosol phase, and it is the one
       thing a 256x144 table could plausibly have smeared away. */
    const aureole = body
      .clone()
      .applyAxisAngle(
        new THREE.Vector3(-body.z, 0, body.x).normalize(),
        2 * DEG * (body.y > 0.5 ? -1 : 1),
      );

    /* Elevations across the layer: high enough to be near cloud, mid, and two
       shallow ones looking through tens of kilometres of it, which is where the
       far field either washes out or renders as blocks. */
    const cloudDir = (elev: number): THREE.Vector3 => {
      const e = elev * DEG;
      return new THREE.Vector3(
        Math.sin(az + 0.6) * Math.cos(e),
        Math.sin(e),
        -Math.cos(az + 0.6) * Math.cos(e),
      );
    };
    const cloudProbe = [55, 30, 12, 5]
      .map((elev) => {
        const s = this.sampleCloud(cloudDir(elev));
        return `${elev}deg T=${s.transmittance.toFixed(3)} L=${s.radiance.r.toPrecision(2)}/${
          s.radiance.g.toPrecision(2)}/${s.radiance.b.toPrecision(2)}`;
      })
      .join('  ');
    const cloudGeom = [30, 12, 5, 3]
      .map((elev) => {
        const g = this.sampleCloudGeometry(cloudDir(elev));
        return `${elev}deg d=${g.distance.toFixed(1)}/${g.reach.toFixed(0)}km airT=${
          g.airTransmittance.toFixed(3)}`;
      })
      .join('  ');

    return {
      preset: this.preset,
      timeOfDay: Number(this.hours.toFixed(3)),
      sunElevationDeg: Number((this.sunElevation / DEG).toFixed(2)),
      sunAzimuthDeg: Number((this.sunAzimuth / DEG).toFixed(2)),
      moonElevationDeg: Number((Math.asin(clamp(this.moonDirection.y, -1, 1)) / DEG).toFixed(2)),
      nightLift: Number(this.nightLift.toFixed(1)),
      exposureHint: this.exposureHint,
      cloudsEnabled: this.cloudsEnabled,
      cloudCoverage: Number((this.uniforms.uCloudCoverage.value as number).toFixed(3)),
      /* Requested cover against the fraction of the baked map that actually makes
         cloud. The threshold mapping is a statement about a skewed distribution
         and there is no way to calibrate it by inspection. */
      coverRequestedVsMeasured: `${this.weather.cloudCover.toFixed(2)} -> ${(this.cloudsEnabled
        ? this.clouds.measuredCover()
        : 0
      ).toFixed(2)}`,
      sunOcclusion: Number(this.sunOcclusion.toFixed(3)),
      cloudShadowStrength: Number(this.cloudShadowStrength.toFixed(3)),
      cloudDiffuseTransmittance: Number(this.cloudDiffuse.toFixed(4)),
      cloudShadowFootprintKm: Number(
        ((this.uniforms.uShadowExtent.value as number) * 2).toFixed(2),
      ),
      revision: this.revisionCount,
      'sunColor (irradiance)': fmt(this.sunColor),
      sunTint: fmt(this.sunTint),
      'cloudSunRadiance (at layer)': fmtVec(
        this.uniforms.uCloudSunRadiance.value as THREE.Vector3,
      ),
      'cloudAmbient': fmtVec(this.uniforms.uCloudAmbient.value as THREE.Vector3),
      'cloudGroundBounce': fmtVec(this.uniforms.uCloudGroundBounce.value as THREE.Vector3),
      'cloudTopLight (irradiance)': fmtVec(this.uniforms.uCloudTopLight.value as THREE.Vector3),
      'cloud transmittance / radiance': cloudProbe,
      'cloud range / reach / air transmittance': cloudGeom,
      'moonColor (irradiance)': fmt(this.moonColor),
      'skyColor (hemisphere avg)': fmt(this.skyColor),
      'horizonColor (fog)': fmt(this.horizonColor),
      'radiance zenith': fmt(this.sampleRadiance(zenith)),
      'radiance 10deg elev toward sun': fmt(this.sampleRadiance(towardSun)),
      'radiance 10deg elev away': fmt(this.sampleRadiance(away)),
      'radiance 2deg from body (aureole)': fmt(this.sampleRadiance(aureole)),
      'radiance at body centre': fmt(this.sampleRadiance(disk)),
      aerosolPhase: `g1 ${(this.uniforms.uAerosolG1.value as number).toFixed(2)} g2 ${(
        this.uniforms.uAerosolG2.value as number
      ).toFixed(2)} lobe ${(this.uniforms.uAerosolLobe.value as number).toFixed(2)}`,
      aerosolExtinctPerKm: fmtVec(this.uniforms.uMieExtinct.value as THREE.Vector3),
      dustExtinctPerKm: fmtVec(this.uniforms.uDustExtinct.value as THREE.Vector3),
      fogDensity: this.fog ? Number(this.fog.density.toPrecision(3)) : null,
    };
  }

  /* ------------------------------ vantages ------------------------------ */

  private registerSkyVantages(): void {
    const list: Vantage[] = [];
    for (const name of PRESET_NAMES) {
      const preset = SKY_PRESETS[name];
      const vantage: Vantage = {
        name: `sky_${name}`,
        position: new THREE.Vector3(0, SKY_VANTAGE_Y, 0),
        lookAt: new THREE.Vector3(0, SKY_VANTAGE_Y, -100),
        fov: 55,
        timeOfDay: preset.timeOfDay,
        hideViewmodel: true,
        note: `${preset.note} (t=${preset.timeOfDay})`,
        setup: () => {
          this.applyPreset(name);
          this.aimAtSky(vantage, preset.timeOfDay, name === 'night');
        },
      };
      list.push(vantage);
    }

    /* Two extra angles that catch what a horizon shot cannot: the vertical
       gradient all the way to the zenith, and cloud volumes from underneath. */
    /* A moonless hour, found rather than guessed: the galactic band is a tenth of
       the brightness of a moonlit sky, so with the moon up it is genuinely washed
       out and no amount of framing recovers it. Scanning for the darkest hour
       keeps the shot honest — it is the same sky, on the night the moon has
       already set — instead of overdriving the band until it survives the moon. */
    const dark = darkestHour(ZENITH_MOON_PHASE);
    /* Aim two thirds of the way up toward the galactic centre, so the band runs
       across the frame rather than out of the corner of it. */
    const gcPitch = Math.max(dark.elevation, 25 * DEG) * 0.72;
    const zenith: Vantage = {
      name: 'sky_night_zenith',
      position: new THREE.Vector3(0, SKY_VANTAGE_Y, 0),
      lookAt: new THREE.Vector3(
        Math.sin(dark.azimuth) * Math.cos(gcPitch) * 120,
        SKY_VANTAGE_Y + Math.sin(gcPitch) * 120,
        -Math.cos(dark.azimuth) * Math.cos(gcPitch) * 120,
      ),
      fov: 72,
      timeOfDay: dark.hours,
      hideViewmodel: true,
      note:
        `Milky Way and star field, moon down (t=${dark.hours.toFixed(2)}, ` +
        `galactic centre ${(dark.elevation / DEG).toFixed(0)} deg up)`,
      setup: () => {
        this.applyPreset('night');
        this.moonPhase = ZENITH_MOON_PHASE;
        this.setWeather({ cloudCover: 0.07 });
        this.setTimeOfDay(dark.hours);
      },
    };
    const towers: Vantage = {
      name: 'sky_cumulus',
      position: new THREE.Vector3(0, SKY_VANTAGE_Y, 0),
      lookAt: new THREE.Vector3(0, SKY_VANTAGE_Y + 60, -70),
      fov: 65,
      timeOfDay: 16.2,
      hideViewmodel: true,
      note: 'Backlit cumulus towers; silver lining and powder edges',
      setup: () => {
        this.applyPreset('morning');
        this.setTimeOfDay(16.2);
        this.setWeather({ cloudCover: 0.5, haze: 0.5 });
        solarDirection(16.2, _aim);
        const az = Math.atan2(_aim.x, -_aim.z);
        towers.lookAt!.set(Math.sin(az) * 70, 60, -Math.cos(az) * 70).add(towers.position);
      },
    };
    list.push(zenith, towers);
    registerVantages(list);
  }

  /**
   * Frames a preset the way a photographer would, because a badly framed sky is
   * unjudgeable: point at a low sun and the aureole clips half the frame, point
   * at a high one and veiling glare greys out the very gradient being reviewed.
   *
   * So: a body below 25 degrees goes in shot, pushed off the centreline and
   * seated just above a horizon in the lower third — the sunset composition. A
   * body above 25 degrees is put behind the camera, which is where the deepest
   * blue and the brightest cloud faces are anyway.
   *
   * The direction is recomputed from the hour rather than read off the live
   * state, because `pose()` runs a vantage's setup and reads its `lookAt` in the
   * same call, one whole frame before `update` has moved the sun to the preset's
   * new time.
   */
  private aimAtSky(vantage: Vantage, hours: number, useMoon: boolean): void {
    solarDirection(hours, _aim);
    let moonlit = false;
    if (useMoon) {
      lunarDirection(hours, this.moonPhase, _tmp);
      if (_tmp.y > 0.05) {
        _aim.copy(_tmp);
        moonlit = true;
      }
    }
    const elevDeg = Math.asin(clamp(_aim.y, -1, 1)) / DEG;
    /* The moon is always worth framing however high it is. It is four orders of
       magnitude dimmer than the sun, so none of the reasons to keep the sun out
       of shot apply to it — and it is the one object in a night sky a viewer will
       look for first. */
    const away = elevDeg > 25 && !moonlit;

    /* Two thirds of a 16:9 horizontal field is 28 degrees; a third of that puts
       the body on the left-hand third line. */
    const az = Math.atan2(_aim.x, -_aim.z) + (away ? Math.PI : 14 * DEG);
    /* Seat the horizon around two thirds down the frame, and for a low sun lift
       just enough that the disk clears it. A high moon needs more than that or it
       leaves the top of the frame. */
    const pitch = (away ? 17 : clamp(elevDeg * 0.7 + 5.5, 7, moonlit ? 34 : 16)) * DEG;

    const dist = 120;
    const horizontal = Math.cos(pitch) * dist;
    vantage.lookAt!.set(
      vantage.position.x + Math.sin(az) * horizontal,
      vantage.position.y + Math.sin(pitch) * dist,
      vantage.position.z - Math.cos(az) * horizontal,
    );
  }

  /* ------------------------------ teardown ------------------------------ */

  dispose(): void {
    this.ready = false;
    if (this.ctx) {
      this.ctx.scene.remove(this.dome.mesh);
      if (this.ownsFog && this.ctx.scene.fog === this.fog) this.ctx.scene.fog = null;
    }
    this.luts?.dispose();
    this.clouds?.dispose();
    this.dome?.dispose();
  }
}
