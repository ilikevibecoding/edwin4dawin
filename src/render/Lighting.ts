import * as THREE from 'three';
import { CSM } from 'three/examples/jsm/csm/CSM.js';
import { QUALITY } from '../core/Config';
import type { EngineContext, System } from '../core/System';
import type { GradePreset } from './RenderPipeline';
import { Sky, SKY_PRESETS, type SkyPreset } from './Sky';
import { SkyMask } from './SkyMask';

/**
 * Per-time-of-day look, authored as *ratios* rather than absolute levels.
 *
 * The sky shader's absolute radiance spans more than two orders of magnitude
 * across these four presets, so any ambient level or exposure written as a
 * constant is necessarily wrong on three of them — which is what produced a
 * usable morning next to an unreadable night. Instead each preset states two
 * photographic quantities and the rest is solved against the measured sky:
 *
 *   `keyLevel`   where the reference surface should land in scene-referred
 *                linear. This is the light meter.
 *   `shadeRatio` how much of that same surface's response arrives as ambient
 *                rather than beam. 0.2 is clear desert daylight; 0.66 is
 *                overcast, where the sky *is* the source.
 *
 * The reference surface is a 45-degree slope facing the sun, which is the
 * average of the ground and the sunward facades that make up a street. Metering
 * a flat horizontal plane instead makes the reference collapse as the sun drops
 * — at 7.5 degrees elevation it receives almost nothing — and the meter then
 * asks for three stops of compensation that blow the walls out. This is the
 * same reason a photographer's incident meter has a dome on it.
 *
 * `shadeRatio` is the single number that decides whether the frame reads as
 * lit. It is the sun-to-sky ratio, and it is measurable: at 26 degrees
 * elevation a clear sky delivers roughly 85 W/m2 diffuse against 385 W/m2 of
 * direct on a horizontal plane, so ambient is about a fifth of the total.
 */
interface TimeOfDayLook {
  /** Scene-referred linear target for the reference surface. */
  keyLevel: number;
  /** Ambient share of that target, 0..1. */
  shadeRatio: number;
  /** Share of the ambient delivered by the hemisphere bounce vs. the sky dome. */
  bounceShare: number;
  /** Extinction per metre for the local haze medium. */
  fogDensity: number;
  fogHeightFalloff: number;
  /** Henyey-Greenstein g for the haze. */
  fogAnisotropy: number;
  grade: Partial<GradePreset>;
}

const LOOKS: Record<string, TimeOfDayLook> = {
  desertMorning: {
    // Raised with the contrast increase in the grade below, not independently
    // of it. A steeper curve pivots the frame's mass downward, and the measured
    // cost was a third of the median across every daylight shot; this is the
    // matching lift. It also moves the frame to where the review asked it to be
    // in absolute terms — a sunlit surface belongs in the 200-245 band and the
    // reference surface this number places is exactly such a surface, so 0.58
    // was putting the brightest ordinary thing in the level at a middling grey.
    // Lifted again once the bloom veil came off. Removing that veil took roughly
    // fifteen counts out of the frame's midtones — it had been sitting on the
    // whole image as additive glare — so the same key that was correct with it
    // in place now under-exposes. Modelled against the rooftop probes, 1.02
    // puts sunlit plaster at 207 and the frame's brightest surfaces across the
    // 240 line, which is where the review asked for one to five percent of the
    // frame to sit.
    keyLevel: 1.02,
    // Worked out on the reference surface rather than on a horizontal plane,
    // which is where the previous 0.235 came from. A 45-degree slope facing a
    // 26-degree sun takes the beam at 19 degrees off its normal, so it collects
    // almost all of it, while seeing only half the sky dome and a sliver of
    // ground bounce: roughly 90 W/m2 of ambient against 760 of beam. The number
    // the meter wants is therefore near half what a flat roof would report.
    //
    // At 0.235 open shade sat 2.1 stops under the key instead of 3.2, and the
    // consequences were everywhere at once — a street frame whose darkest
    // percentile never went below 0.115 display, an archway as bright as the
    // road outside it, interiors that read as lit rooms rather than as holes,
    // and so little of any surface's light coming from the beam that sun and
    // shade came back the same colour temperature.
    shadeRatio: 0.15,
    bounceShare: 0.24,
    fogDensity: 0.00085,
    fogHeightFalloff: 0.035,
    fogAnisotropy: 0.62,
    grade: {
      contrast: 1.05,
      saturation: 1.12,
      lift: new THREE.Vector3(0.0, 0.0, 0.0),
      gain: new THREE.Vector3(1.005, 0.998, 0.982),
      // Pushed harder than looks comfortable on paper, because the scene fights
      // it. Warm sandstone albedo, a 26-degree sun that is itself (1, 0.82, 0.63),
      // and a fill that is 70% cloud-white sky plus a bounce off hot sand: there
      // is very little warm/cool separation in the light to begin with, and none
      // of those is a lie worth correcting at the source.
      //
      // With this, a concrete deck measures a blue-to-red ratio of 1.18 in the
      // shade of a parapet against 0.94 in sun a metre away — a quarter of the
      // way across the warm/cool axis, on the same material. Beware measuring it
      // on plaster or sand: those now carry enough albedo mottling that a
      // brightest-third-against-darkest-third reading describes the noise field
      // rather than the light, and reports shade as *warmer* than sun.
      //
      // The teal ramp is also ended lower than the amber one starts, so the tint
      // lands on the darkest values instead of spreading through the mids where
      // the two cancel and read as a flat cast.
      shadowTint: new THREE.Vector3(0.760, 0.930, 1.290),
      highlightTint: new THREE.Vector3(1.100, 1.010, 0.870),
      splitBalance: 0.10,
      // Raised once the highlights were actually being held. This had been cut
      // hard to stop sunlit awnings and cloud tops collapsing onto white, and
      // with that fixed at the shoulder instead, the frame was left flatter
      // through the mids than a hard-light daylight shot should be: shadow cores
      // on the market street sat at 0.22 with no separation between a cast
      // shadow and the dirt beside it. The shoulder below is reduced in the same
      // proportion, so this buys mid contrast without touching the top end —
      // measured on the street frame, clipping moves from 0.5% to 0.6% while the
      // quarter-tone drops 0.02.
      //
      // Raised again, together with a large increase to the shoulder below.
      // Modelled against scene-linear values read out of the rooftop's HDR
      // buffer, the pair 1.50/0.46 was the flattest combination in the whole
      // sweep: it put a sunlit cumulus at 166 counts, white plaster at 176 and
      // the frame's ceiling at 197, so nothing in a daylight shot ever reached
      // the top fifth of the range and no pixel came near 240. 1.60/0.88 puts
      // the same probes at 198 / 218 / 243. The toe slope is raised alongside
      // it, because contrast here is the slope on *both* sides of the pivot and
      // the highlight gain is otherwise charged to open shade.
      //
      // Eased from 1.60 once it was measured rather than modelled. It does what
      // it was meant to at the top, but rotating about a fixed pivot moves
      // everything below that pivot the other way, and all five frames sit
      // there: the street's median fell from 0.456 to 0.320 and the covered
      // hall's from 0.165 to 0.087. The key is raised to put those back, so this
      // gives a little of its gain up to stop the pair overshooting together.
      lookContrast: 1.55,
      // Enough latitude to hold a sunlit cumulus top, which is the only thing
      // left in a daylight frame that runs out of range. Every surface fits
      // inside the shoulder now — measured on the street frame, nothing on any
      // awning, roof deck or plaster wall reaches the flat part — but a cloud top
      // sits three and a half stops over the metered key surface, because albedo
      // 0.85 against 0.35 genuinely is that much brighter.
      //
      // This end of the curve is close to free, which is not obvious and is worth
      // stating. Swept across the three daylight shots, 0.52 / 0.60 / 0.68 give
      // medians of 0.278 / 0.275 / 0.272 on the street and 0.424 / 0.423 / 0.421
      // on the alley — identical, because below the pivot the toe slope governs.
      // What moves is only the top: clipped area runs 0.1% / 0.4% / 1.0% on the
      // alley, and a cumulus deck's internal range grows by a third going down.
      // So this is bought almost entirely out of sunlit plaster, 0.73 to 0.71
      // display, which is a surface with texture to spare.
      //
      // Reduced again once the market street stopped metering half a stop under
      // its own solve: the extra exposure lands on the deck along with
      // everything else, and a cumulus core came back onto the clip. The sweep
      // it was originally set from is what makes this cheap — 0.52 / 0.60 / 0.68
      // gave street medians of 0.278 / 0.275 / 0.272, identical, because below
      // the pivot the toe slope governs and only the top of the curve moves.
      //
      // Expressed as a fraction of the contrast above, so it has to move whenever
      // that does: the shader multiplies the two, and the product is what the
      // cloud tops were tuned against.
      //
      // Reduced once more after the street's meter was let off its clamp. This
      // is the cheapest correction available anywhere in the grade: modelled
      // across the shot's probe set at the street's own exposure, 0.54 to 0.45
      // takes the hot cumulus core from 0.955 to 0.908 and the cumulus top from
      // 0.92 to 0.86, while sunlit plaster gives up 0.03, open shade does not
      // move at all, and the median rises by 0.002. The curve below the pivot is
      // governed by the toe, so there is nothing there for the shoulder to cost.
      //
      // Reversed, and then some. Every reduction above was aimed at driving the
      // clipped fraction to zero, and it succeeded — 0.06% on the final street
      // pass — but that was the wrong target. A daylight frame is *supposed* to
      // put its cumulus tops and its sunlit white plaster against the top of the
      // range; measured across the shot set, p99 never passed 214 and the
      // fraction above 240 was 0.00-0.07%, which is not a frame with its
      // highlights under control, it is a frame with no highlights. Suppressing
      // the top of an image that had nothing at the top only removed the
      // separation between a sunlit surface and an average one.
      //
      // Settled at 0.72 rather than 0.88. Once the key comes up to restore the
      // medians it carries the top of the range with it, and at 0.88 the street
      // put 6% of its pixels past 240 and the alley 12%, which is past the point
      // where highlights read as light and into the point where they read as
      // missing data.
      //
      // Now 0.82, paying for the key lift above. At this sun elevation a sunlit
      // deck and the horizon sky compute to within a fifth of a stop of each
      // other — 0.6 scene-linear each — so raising the key to get surfaces to
      // clip carries the sky there too, and the only thing that separates them
      // is how gently the top of the curve closes. A longer shoulder buys about
      // eight counts of separation between the two at the same key.
      lookShoulder: 0.82,
      lookSlope: new THREE.Vector3(1.02, 1.02, 1.02),
      lookPower: new THREE.Vector3(1.03, 1.03, 1.03),
      lookSat: 1.22,
    },
  },
  goldenHour: {
    // Lifted alongside the morning's and for the same reason, with a little
    // extra: this shot was the darkest of the daylight set before any of this
    // (median 0.262 against the rooftop's 0.529) and it is the one the review
    // singled out as having no separation in it at all.
    //
    // The extra turned out to be too much once the curve came with it: at 0.75
    // the shot put 15% of its pixels past 240 against the street's 4%, because a
    // 7.5-degree sun rakes every facade in frame square-on and this shot has
    // more facade in it than any other. 0.60 brings that back into the band the
    // review asked for while still leaving it well clear of the 0.50 it had.
    //
    // Then 0.70 with the bloom veil gone. Golden lost the least of the daylight
    // set to that veil because it has the least sky in it, so it gets a smaller
    // lift than the morning's; measured, it had fallen to 0.40% above 240 and
    // needs roughly a quarter stop to re-enter the band.
    keyLevel: 0.70,
    // Higher than the morning's for a real reason rather than by oversight: at
    // 7.5 degrees the beam crosses seven air masses and loses most of its
    // strength, while the diffuse component barely moves, so ambient genuinely
    // takes a larger share of the total. Still well under the 0.26 it had.
    shadeRatio: 0.20,
    bounceShare: 0.28,
    fogDensity: 0.0014,
    fogHeightFalloff: 0.030,
    fogAnisotropy: 0.70,
    grade: {
      contrast: 1.05,
      saturation: 1.12,
      lift: new THREE.Vector3(0.0, 0.0, 0.0),
      // Held close to neutral in the warm direction, unlike every other preset
      // here, because at this hour the *light* is already (1, 0.60, 0.33) and the
      // grade adding to it is what breaks the frame.
      //
      // Golden hour runs out of range per channel, not in luminance, and the
      // frame's luminance histogram cannot see it: a wall square to a 7.5-degree
      // sun carries one and a half times its own luminance in red, so red hits
      // the top of the range with a stop of headroom still showing in the meter.
      // The grade was multiplying red by a further 14% in the highlights and 2%
      // overall, which put whole sunlit facades — plaster, parapet copings,
      // balcony fronts, 1.5% of the frame — at flat 255 red while green and blue
      // still had detail. That does not read as bright; it reads as orange paint,
      // because the only modulation left on the surface is in the two channels
      // the eye is least able to resolve texture in.
      gain: new THREE.Vector3(1.005, 0.995, 0.98),
      shadowTint: new THREE.Vector3(0.745, 0.915, 1.320),
      highlightTint: new THREE.Vector3(1.045, 1.005, 0.905),
      splitBalance: 0.14,
      // Brought up with the morning's. This preset was left behind when the
      // daylight curve was resteepened, and the omission is visible in the
      // numbers: with the morning shots reaching 0.9-6% of pixels past 240,
      // golden hour was still at 0.06% with a p99 of 213, which is the flat
      // frame the review described. The hour's own reasons for wanting a steep
      // curve — a beam that has lost most of its energy to the slant path, so
      // nothing is intrinsically bright — argue for more of this, not less.
      lookContrast: 1.55,
      // Steeper than the other presets. Golden hour has no genuinely bright
      // surface in it — the sun is 7 degrees up and everything is lit by a beam
      // that has already lost most of its energy to the slant path — so a
      // shoulder with plenty of latitude simply leaves the top of the frame
      // empty. Spending some of that latitude puts the sunward cloud faces and
      // the specular off metal back up near white, which is where the hour gets
      // its drama from.
      //
      // That reasoning held while the shot looked out over low rubble and the
      // brightest thing in it was a cloud edge. It does not hold now: the frame
      // is filled by tall pale plaster facades raked square-on by the low beam,
      // and at 0.80 they took 3.3% of the frame into the top twentieth of the
      // range as one continuous sheet. Still the steepest of the daylight
      // presets, because the hour does want its highlights pushed — just not
      // past the point where a whole building becomes one value.
      //
      // Now matched to the morning's. The facade-flattening that 0.80 caused was
      // real, but the cure was applied at the wrong place: the frame was clipping
      // per-channel in red, which the gain above now handles, and holding the
      // whole shoulder down to fix it cost the hour every highlight it had.
      //
      // Kept a notch under the morning's 0.82. Golden's highlights are raked
      // facades rather than sky, and those are the ones the review wants
      // carrying the top of the range, so this hour has less to protect.
      lookShoulder: 0.78,
      // Flat, for the same reason as the tint above: a per-channel slope applied
      // inside the log domain is another red multiplier, and this hour has none
      // to spare.
      lookSlope: new THREE.Vector3(1.0, 1.0, 1.0),
      lookPower: new THREE.Vector3(1.04, 1.04, 1.04),
      lookSat: 1.30,
    },
  },
  overcast: {
    keyLevel: 0.37,
    shadeRatio: 0.66,
    bounceShare: 0.18,
    fogDensity: 0.0026,
    fogHeightFalloff: 0.024,
    fogAnisotropy: 0.38,
    grade: {
      contrast: 1.05,
      saturation: 0.98,
      lift: new THREE.Vector3(0.0, 0.0, 0.0),
      gain: new THREE.Vector3(0.99, 0.995, 1.005),
      shadowTint: new THREE.Vector3(0.920, 0.975, 1.090),
      highlightTint: new THREE.Vector3(1.02, 1.005, 0.995),
      splitBalance: 0.08,
      lookContrast: 1.38,
      // An overcast sky is the largest, brightest, flattest thing a frame can
      // contain, and it is all inside one stop of itself, so latitude here is
      // what keeps the deck from arriving as a single plate of white. Kept a
      // little wider than the clear-sky preset for that reason.
      lookShoulder: 0.72,
      lookSlope: new THREE.Vector3(1.02, 1.02, 1.02),
      lookPower: new THREE.Vector3(1.03, 1.03, 1.03),
      lookSat: 1.1,
    },
  },
  night: {
    // Deliberately three and a half stops under the daylight presets. A
    // correctly *metered* night still has to read as night, and the way it does
    // that is by sitting low on the curve with only practicals and the moon
    // reaching the upper midtones — not by being dark enough to hide the level.
    keyLevel: 0.150,
    shadeRatio: 0.42,
    bounceShare: 0.26,
    fogDensity: 0.0020,
    fogHeightFalloff: 0.045,
    fogAnisotropy: 0.55,
    grade: {
      contrast: 1.04,
      // Left where it was while the daylight presets went up. Scotopic vision
      // has almost no chroma, and the only thing in the night frame with enough
      // radiance to carry colour is a painted truck panel — which came out a
      // vivid red at 0.95 and read as a daylight shot with a blue filter on it.
      saturation: 0.90,
      lift: new THREE.Vector3(0.0, 0.0, 0.0),
      gain: new THREE.Vector3(0.94, 0.975, 1.03),
      shadowTint: new THREE.Vector3(0.745, 0.905, 1.280),
      highlightTint: new THREE.Vector3(1.02, 1.0, 1.0),
      splitBalance: 0.05,
      lookContrast: 1.32,
      // Left steep. What clips at night is small and bright — lamp envelopes,
      // muzzle flash, a window — and those are meant to clip; spending latitude on
      // them only greys the sources out and flattens the one preset whose whole
      // character is a few hot points against a deep field.
      lookShoulder: 0.86,
      lookSlope: new THREE.Vector3(1.0, 1.0, 1.02),
      lookPower: new THREE.Vector3(1.02, 1.02, 1.02),
      lookSat: 1.05,
    },
  },
};

/**
 * Sun, sky, image-based ambient, and the dynamic light budget.
 *
 * Cascaded shadow maps give crisp contact shadows within a few metres of the
 * player while still covering the whole playable area — a single shadow map
 * large enough to cover a 200 m map would be a blurry mess at the player's
 * feet, and that softness at close range is one of the loudest "this is a
 * hobby renderer" signals.
 *
 * Dynamic lights (muzzle flashes, explosions, flares) are pooled: shaders
 * recompile whenever the light count changes, so a fixed pool that is
 * enabled/disabled by intensity avoids frame-long hitches mid-firefight.
 */

interface PooledLight {
  light: THREE.PointLight;
  busy: boolean;
  ttl: number;
  life: number;
  baseIntensity: number;
  decayCurve: 'flash' | 'linear' | 'flicker';
}

export class LightingSystem implements System {
  readonly name = 'lighting';
  readonly order = -80;

  sky!: Sky;
  skyMask: SkyMask | null = null;
  csm: CSM | null = null;
  sun!: THREE.DirectionalLight;
  hemi!: THREE.HemisphereLight;
  viewKey!: THREE.DirectionalLight;
  viewFill!: THREE.DirectionalLight;
  viewAmbient!: THREE.AmbientLight;
  environment: THREE.Texture | null = null;

  private ctx!: EngineContext;
  private readonly pool: PooledLight[] = [];
  /** Materials already handed to `CSM.setupMaterial`. */
  private readonly csmReady = new WeakSet<THREE.Material>();
  private csmScanIn = 0;
  private lastSunDir = new THREE.Vector3();
  private preset: SkyPreset = SKY_PRESETS.desertMorning;
  private envDirty = true;
  private skyMaskDirty = true;
  private envIntensity = 1;
  private skyScale = 1;
  private sunLevel = 3;
  /** Measured mean radiance of the sky probe; seeded, then refreshed on bake. */
  private skyRadiance = new THREE.Color(0.35, 0.42, 0.58);
  private meterExposure = 1;

  /**
   * Diffuse albedo the meter is authored against. Dry plaster and sand, which
   * is what most of this level is made of.
   */
  private static readonly METER_ALBEDO = 0.35;

  /**
   * Tallest thing that has to be able to cast into a cascade it does not stand
   * in, in metres. The minaret is the limit here.
   */
  private static readonly TALLEST_CASTER = 24;

  /** Under the capture harness the metering solution is worth having in the log. */
  private static readonly LOG_METER =
    typeof location !== 'undefined' && /[?&]shot=/.test(location.search);

  /** Written each frame for the volumetric pass. */
  readonly cascadeInfo: Array<{ map: THREE.Texture | null; matrix: THREE.Matrix4; split: number }> = [];

  init(ctx: EngineContext): void {
    this.ctx = ctx;
    const { scene, camera, renderer } = ctx;

    this.sky = new Sky(this.preset);
    scene.add(this.sky.mesh);

    // Inter-reflection fill. The IBL probe already carries the sky-above /
    // ground-below directionality, so this light is not asked to reproduce it —
    // it supplies the second bounce between sunlit ground and shaded facades
    // that a single-bounce probe cannot, which is what keeps shade reading as
    // cool-neutral rather than indigo.
    this.hemi = new THREE.HemisphereLight(0x9fb4d8, 0xffd0a0, 0.34);
    scene.add(this.hemi);

    // VSM leaks light across silhouettes and washes out the penumbra, which
    // erases exactly the contact darkening the frame needs. PCF is crisper at
    // the player's feet and grows a believable penumbra out through the
    // cascades because each cascade covers more world space per texel.
    // (PCFSoftShadowMap is deprecated in three and silently downgrades to this,
    // so ask for it directly rather than relying on the fallback.)
    renderer.shadowMap.type = THREE.PCFShadowMap;

    // The view model lives in its own scene, so it needs its own key and fill.
    // Rather than matching the world sun exactly, the key is offset up and to
    // the left of the camera: a weapon lit from the viewer's own side reads as
    // flat, and every shipped shooter cheats this the same way.
    this.viewKey = new THREE.DirectionalLight(0xffffff, 2.6);
    this.viewKey.position.set(-0.6, 1.0, 0.5);
    this.viewFill = new THREE.DirectionalLight(0x9fc4ff, 0.9);
    this.viewFill.position.set(0.8, -0.2, -0.6);
    this.viewAmbient = new THREE.AmbientLight(0xffffff, 0.22);
    ctx.viewScene.add(this.viewKey, this.viewFill, this.viewAmbient);

    if (QUALITY.shadowCascades > 1) {
      this.csm = new CSM({
        maxFar: QUALITY.shadowDistance,
        cascades: QUALITY.shadowCascades,
        mode: 'practical',
        parent: scene,
        shadowMapSize: QUALITY.shadowMapSize,
        lightDirection: this.sky.sunDirection.clone().negate(),
        camera,
        lightIntensity: 1,
      });
      this.csm.fade = true;
      // Each cascade covers roughly 3x the world space of the one before it, so
      // a single bias value either acnes the near cascade or peter-pans the far
      // one. Scaling with the cascade index tracks the texel footprint.
      for (let i = 0; i < this.csm.lights.length; i++) {
        const light = this.csm.lights[i];
        const scale = Math.pow(1.9, i);
        light.shadow.bias = -0.00022 * scale;
        light.shadow.normalBias = 0.020 * scale;
        light.shadow.radius = 1;
        light.shadow.blurSamples = 4;
      }
      this.fitCascadeDepth();
      // CSM owns the directional lights; keep a handle to the first for code
      // that just wants "the sun".
      this.sun = this.csm.lights[0];
    } else {
      this.sun = new THREE.DirectionalLight(0xffffff, 3);
      this.sun.castShadow = true;
      this.sun.shadow.mapSize.setScalar(QUALITY.shadowMapSize);
      this.sun.shadow.camera.near = 0.5;
      this.sun.shadow.camera.far = QUALITY.shadowDistance;
      const s = QUALITY.shadowDistance * 0.5;
      this.sun.shadow.camera.left = -s;
      this.sun.shadow.camera.right = s;
      this.sun.shadow.camera.top = s;
      this.sun.shadow.camera.bottom = -s;
      this.sun.shadow.bias = -0.0004;
      this.sun.shadow.normalBias = 0.03;
      scene.add(this.sun);
      scene.add(this.sun.target);
    }

    for (let i = 0; i < QUALITY.maxDynamicLights; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 12, 2);
      l.castShadow = false;
      l.visible = false;
      scene.add(l);
      this.pool.push({ light: l, busy: false, ttl: 0, life: 0, baseIntensity: 0, decayCurve: 'flash' });
    }

    this.applyPreset(this.preset);
    this.refreshEnvironment(renderer);
  }

  applyPreset(preset: SkyPreset): void {
    this.preset = preset;
    this.sky.applyPreset(preset);

    const dir = this.sky.sunDirection;
    const sunColor = this.computeSunColor(dir.y, preset);
    const intensity = this.computeSunIntensity(dir.y, preset);
    this.sunLevel = intensity;

    if (this.csm) {
      this.csm.lightDirection.copy(dir).negate().normalize();
      this.csm.lightIntensity = intensity;
      for (const l of this.csm.lights) {
        l.color.copy(sunColor);
        l.intensity = intensity;
      }
      this.fitCascadeDepth();
    } else if (this.sun) {
      this.sun.color.copy(sunColor);
      this.sun.intensity = intensity;
      this.sun.position.copy(dir).multiplyScalar(120);
      this.sun.target.position.set(0, 0, 0);
    }

    const look = LOOKS[preset.name] ?? LOOKS.desertMorning;

    // The dome lights the level through the IBL, so the sun that lights its
    // clouds and its ground bounce has to be this sun and not a second one
    // authored inside the sky shader.
    this.sky.setSunTint(sunColor);

    // Bounce fill. The sky half is deliberately far less saturated than the
    // literal sky: multiple scattering plus the second bounce off warm ground
    // flattens the spectrum long before the light reaches a wall in shade.
    //
    // The ground half is sunlight off the terrain, so it carries the beam's
    // colour as well as the terrain's — leaving the beam out made the single
    // largest fill on every downward-facing surface in the level a fixed sand
    // colour that did not change between mid-morning and sunset. It is
    // normalised first so the preset's albedo and this sun decide the hue while
    // `hemi.intensity`, solved below, decides the level.
    const groundHue = preset.groundAlbedo.clone().multiply(sunColor);
    const maxc = Math.max(groundHue.r, groundHue.g, groundHue.b, 1e-3);
    groundHue.multiplyScalar(1 / maxc).lerp(new THREE.Color(1, 1, 1), 0.42);

    const skyFill = new THREE.Color().setRGB(
      0.44 + preset.rayleigh.x * 4,
      0.62 + preset.rayleigh.y * 3,
      0.94 + preset.rayleigh.z * 1.2,
    );
    if (preset.cloudCoverage > 0.75) skyFill.lerp(new THREE.Color(0.94, 0.96, 1.0), 0.6);

    this.hemi.color.copy(skyFill);
    this.hemi.groundColor.copy(groundHue);

    // Levels depend on the sky's measured radiance, so this only lands exactly
    // once the probe has been baked. It is called here as well so a preset
    // change is never a frame of wrong exposure.
    this.solveLevels();

    if (this.viewKey) {
      this.viewKey.color.copy(sunColor);
      this.viewKey.intensity = Math.max(0.6, intensity * 0.62);
      this.viewFill.color.copy(skyFill);
      this.viewFill.intensity = 0.20 + intensity * 0.06;
      this.viewAmbient.intensity = 0.06 + this.hemi.intensity * 0.22;
    }

    this.envDirty = true;
    this.publishToPipeline();
  }

  /**
   * Pushes the solved levels and the atmosphere to the post stack.
   *
   * Called from both `applyPreset` and the environment bake, because the bake is
   * where the sky measurement lands and every one of these values is expressed
   * relative to it.
   */
  private publishToPipeline(): void {
    const preset = this.preset;
    const look = LOOKS[preset.name] ?? LOOKS.desertMorning;
    const dir = this.sky.sunDirection;
    const sunColor = this.computeSunColor(dir.y, preset);
    const intensity = this.sunLevel;

    const pipeline = this.ctx?.engine.pipeline;
    if (pipeline) {
      pipeline.sunDirection.copy(dir);
      pipeline.sunColor.copy(sunColor);
      pipeline.sunIntensity = intensity;
      // Same ratio the meter solves against, handed to the AO pass so it can
      // tell a sunlit face (mostly beam, barely occludable) from a shaded one
      // (all sky, fully occludable).
      const share = THREE.MathUtils.clamp(look.shadeRatio, 0.02, 0.94);
      pipeline.sunOverAmbient = (1 - share) / share;

      pipeline.fogDensity = look.fogDensity;
      pipeline.fogHeightFalloff = look.fogHeightFalloff;
      pipeline.fogAnisotropy = look.fogAnisotropy;
      // The colour of aerial perspective has to come from the light arriving at
      // the medium rather than from tinting the albedo, so this stays neutral.
      // It is held a little under 1 because the medium here is mineral dust,
      // which absorbs; pure scattering belongs to clean air.
      pipeline.fogAlbedo.setRGB(0.86, 0.855, 0.85);

      // Distant geometry must fade into the sky it is silhouetted against. These
      // two colours are the sky's own radiance near the horizon and overhead, so
      // aerial perspective lands on the correct hue instead of a white veil.
      pipeline.hazeLow.copy(preset.hazeColor).multiplyScalar(
        preset.sunIntensity * this.skyScale * 0.020
          * THREE.MathUtils.lerp(0.35, 1, THREE.MathUtils.clamp(dir.y * 3, 0, 1)),
      );
      pipeline.hazeHigh.setRGB(
        0.42 + preset.rayleigh.x * 6,
        0.56 + preset.rayleigh.y * 5,
        0.86 + preset.rayleigh.z * 2,
      ).multiplyScalar(preset.sunIntensity * this.skyScale * 0.016);

      pipeline.grade.exposure = this.meterExposure;
      // Where the frame's own geometric-mean luminance should sit once the
      // analytic exposure has been applied. Expressed relative to keyLevel so
      // the trim never tries to drag a night scene up to daylight: a typical
      // street frame averages roughly a third of its key surface, between
      // shaded facades, sky and ground at every orientation.
      pipeline.autoKey = look.keyLevel * 0.29;
      // Clone vectors rather than aliasing them: the look table is shared and
      // gameplay is free to nudge the live grade.
      for (const [key, value] of Object.entries(look.grade)) {
        const target = pipeline.grade as unknown as Record<string, unknown>;
        if (value instanceof THREE.Vector3) (target[key] as THREE.Vector3).copy(value);
        else target[key] = value;
      }
    }
  }

  /**
   * Solves ambient intensity and exposure from the preset's authored ratios and
   * the measured sky.
   *
   * Everything here works in the same unit: the outgoing radiance of an
   * albedo-0.35 surface. Both of three's diffuse paths carry the Lambert 1/PI,
   * so a directional light of intensity I lands on that surface at
   * `A/PI * I * N.L`, while the IBL — whose irradiance is already `PI * L` —
   * lands at `A * L`. Mixing those two conventions up is a factor of PI, which
   * is a stop and a half, and is exactly the sort of error that gets papered
   * over with a hand-tuned exposure constant per preset.
   */
  private solveLevels(): void {
    const look = LOOKS[this.preset.name] ?? LOOKS.desertMorning;
    const A = LightingSystem.METER_ALBEDO;
    const lum = (c: THREE.Color): number => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;

    // N.L for a 45-degree slope facing the sun — the mean of "ground" and
    // "sunward facade", which is what a street presents to a low sun.
    const sinEl = THREE.MathUtils.clamp(this.sky.sunDirection.y, 0, 1);
    const cosRef = 0.5 * sinEl + 0.5 * Math.sqrt(Math.max(1 - sinEl * sinEl, 0));
    const beam = (A / Math.PI) * this.sunLevel
      * lum(this.sun?.color ?? new THREE.Color(1, 1, 1)) * cosRef;

    // Split that surface's total response into beam and ambient by the authored
    // ratio. Solving for the *total* rather than scaling the ambient off the
    // beam is what keeps overcast working, where the beam is nearly absent and
    // the ambient has to carry the frame on its own.
    const share = THREE.MathUtils.clamp(look.shadeRatio, 0.02, 0.94);
    const total = beam / (1 - share);
    const ambient = total * share;

    // The hemisphere light supplies the second bounce between sunlit ground and
    // shaded facade that a single-bounce probe cannot, so it takes a fixed share
    // of the ambient and the sky dome carries the rest.
    const hemiLum = Math.max(lum(this.hemi.color), 1e-4);
    this.hemi.intensity = THREE.MathUtils.clamp(
      (ambient * look.bounceShare) / ((A / Math.PI) * hemiLum),
      0,
      6,
    );

    // The remainder is delivered by scaling the dome itself rather than by
    // scaling the probe, so the sky the player sees is the sky that lights the
    // level. Keeping the probe at unit intensity is the whole point: a separate
    // IBL gain silently decouples the two and the frame stops reading as
    // coherently lit even though every individual value is defensible.
    const skyLum = Math.max(lum(this.skyRadiance), 1e-6);
    this.skyScale = THREE.MathUtils.clamp(
      (ambient * (1 - look.bounceShare)) / (A * skyLum),
      0.02,
      12,
    );
    this.envIntensity = 1;
    this.sky.setRadianceScale(this.skyScale);

    this.meterExposure = THREE.MathUtils.clamp(look.keyLevel / Math.max(total, 1e-5), 0.02, 60);
  }

  /** Blackbody-ish reddening as the sun approaches the horizon. */
  private computeSunColor(elevationSin: number, preset: SkyPreset): THREE.Color {
    const t = THREE.MathUtils.clamp(elevationSin, 0, 1);
    const horizon = new THREE.Color(1.0, 0.40, 0.14);
    const low = new THREE.Color(1.0, 0.72, 0.44);
    const high = new THREE.Color(1.0, 0.965, 0.905);
    const c = new THREE.Color();
    if (t < 0.22) c.copy(horizon).lerp(low, THREE.MathUtils.smoothstep(t / 0.22, 0, 1));
    else c.copy(low).lerp(high, THREE.MathUtils.clamp((t - 0.22) / 0.55, 0, 1));
    if (preset.cloudCoverage > 0.75) c.lerp(new THREE.Color(0.92, 0.94, 1.0), 0.5);
    if (preset.name === 'night') c.setRGB(0.60, 0.71, 1.0);
    return c;
  }

  private computeSunIntensity(elevationSin: number, preset: SkyPreset): number {
    const t = THREE.MathUtils.clamp(elevationSin, 0, 1);
    // Airmass extinction. A low sun genuinely delivers less irradiance, but a
    // steep power curve overstates it badly: crushing the beam to a fraction of
    // the ambient is what turns golden hour into blue hour, because the frame
    // ends up lit almost entirely by the sky. The sun has to stay the dominant
    // source for as long as it is above the horizon.
    const extinction = Math.pow(t, 0.28) * 0.86 + 0.14;
    // Cloud cover diffuses the beam into the ambient rather than deleting it,
    // so the falloff is superlinear only once cover is nearly total. The preset
    // value is a threshold offset for the deck's noise field and is allowed past
    // 1 to close an overcast ceiling, so it has to be clamped before being read
    // as a fraction — unclamped it drove the beam negative.
    const cover = Math.min(preset.cloudCoverage, 1);
    const cloudy = 1 - Math.pow(cover, 1.6) * 0.88;
    return preset.sunIntensity * 0.95 * extinction * cloudy + 0.02;
  }

  refreshEnvironment(renderer: THREE.WebGLRenderer): void {
    // Measure before baking, then re-solve: the ambient level and the exposure
    // are both expressed relative to this number.
    this.skyRadiance = this.sky.measureRadiance(renderer);
    this.solveLevels();
    this.publishToPipeline();

    const old = this.environment;
    this.environment = this.sky.generateEnvironment(renderer, QUALITY.reflectionProbeSize);
    this.ctx.scene.environment = this.environment;
    // The IBL supplies both diffuse ambient and specular reflections. Its level
    // is solved per time of day rather than fixed, because the sky's own
    // absolute radiance swings by two orders of magnitude between noon and
    // moonlight while the useful ambient-to-sun ratio does not.
    this.ctx.scene.environmentIntensity = this.envIntensity;
    this.ctx.viewScene.environment = this.environment;
    this.ctx.viewScene.environmentIntensity = this.envIntensity * 0.8;
    old?.dispose();
    this.envDirty = false;
    this.lastSunDir.copy(this.sky.sunDirection);

    if (LightingSystem.LOG_METER) {
      console.log(
        `[meter] ${this.preset.name} skyLum=${(
          0.2126 * this.skyRadiance.r + 0.7152 * this.skyRadiance.g + 0.0722 * this.skyRadiance.b
        ).toFixed(4)} sun=${this.sunLevel.toFixed(3)} skyScale=${this.skyScale.toFixed(3)}` +
          ` hemi=${this.hemi.intensity.toFixed(3)} exposure=${this.meterExposure.toFixed(3)}`,
      );
    }
  }

  /**
   * Requests a transient dynamic light. Returns false when the pool is
   * exhausted, which callers should treat as "the frame is already busy
   * enough" rather than an error.
   */
  spawnLight(
    position: THREE.Vector3,
    color: THREE.ColorRepresentation,
    intensity: number,
    distance: number,
    duration: number,
    decayCurve: PooledLight['decayCurve'] = 'flash',
  ): boolean {
    let slot = this.pool.find((p) => !p.busy);
    if (!slot) {
      // Steal the dimmest light rather than dropping the request — a muzzle
      // flash that silently fails to light the room is worse than one that
      // interrupts a fading explosion glow.
      slot = this.pool.reduce((a, b) => (a.light.intensity < b.light.intensity ? a : b));
      if (slot.light.intensity > intensity) return false;
    }
    slot.busy = true;
    slot.ttl = duration;
    slot.life = duration;
    slot.baseIntensity = intensity;
    slot.decayCurve = decayCurve;
    slot.light.position.copy(position);
    slot.light.color.set(color);
    slot.light.intensity = intensity;
    slot.light.distance = distance;
    slot.light.visible = true;
    return true;
  }

  update(dt: number, ctx: EngineContext): void {
    const camPos = ctx.camera.position;
    this.sky.update(ctx.time.elapsed, camPos);

    for (const p of this.pool) {
      if (!p.busy) continue;
      p.ttl -= dt;
      if (p.ttl <= 0) {
        p.busy = false;
        p.light.visible = false;
        p.light.intensity = 0;
        continue;
      }
      const t = p.ttl / p.life;
      switch (p.decayCurve) {
        case 'flash':
          // Very fast falloff — a muzzle flash is essentially an impulse.
          p.light.intensity = p.baseIntensity * t * t * t;
          break;
        case 'linear':
          p.light.intensity = p.baseIntensity * t;
          break;
        case 'flicker':
          p.light.intensity =
            p.baseIntensity * t * (0.72 + 0.28 * Math.sin(ctx.time.elapsed * 47 + p.light.id));
          break;
      }
    }

    if (!this.csm) {
      // Keep the single shadow camera centred on the player.
      this.sun.position.copy(camPos).addScaledVector(this.sky.sunDirection, 90);
      this.sun.target.position.copy(camPos);
      this.sun.target.updateMatrixWorld();
    }
  }

  lateUpdate(_dt: number, ctx: EngineContext): void {
    if (this.csm) {
      if (this.csmScanIn-- <= 0) {
        this.csmScanIn = 6;
        this.registerCascadeMaterials(ctx.scene);
      }
      this.csm.update();
      this.publishCascades();
    }
    if (this.envDirty) this.refreshEnvironment(ctx.renderer);
    if (this.skyMaskDirty) this.refreshSkyMask(ctx);
  }

  /** Marks the sky mask stale. Call after building or demolishing geometry. */
  invalidateSkyMask(): void {
    this.skyMaskDirty = true;
  }

  /**
   * Re-renders the overhead height map the occlusion pass reads as sky
   * visibility.
   *
   * Deferred to the first frame rather than run inside `init`: the level builds
   * its geometry after the lighting system comes up, and a mask baked before the
   * buildings exist reports the whole town as open sky.
   */
  private refreshSkyMask(ctx: EngineContext): void {
    const level = ctx.get<System & { bounds?: THREE.Box3 }>('level');
    if (!level?.bounds) return;
    this.skyMaskDirty = false;

    if (!this.skyMask) {
      // Half a metre per texel over the playable area. Finer than this resolves
      // individual awning slats, and a mask that alternates between covered and
      // open at that frequency reads as noise once the disc sampling averages it.
      this.skyMask = new SkyMask(QUALITY.shadowMapSize >= 2048 ? 1024 : 512);
    }

    // Only the static shell casts into the mask. The sky dome would roof the
    // entire level, and anything that moves would bake its pose in permanently.
    const skyMesh = this.sky.mesh;
    this.skyMask.render(
      ctx.renderer,
      ctx.scene,
      level.bounds,
      (o) => o === skyMesh || o.userData?.noSkyMask === true,
    );

    const pipeline = ctx.engine.pipeline;
    pipeline.skyMaskTexture = this.skyMask.texture;
    pipeline.skyMaskMatrix.copy(this.skyMask.matrix);
    pipeline.skyMaskTop = this.skyMask.top;
    pipeline.skyMaskRange = this.skyMask.range;
  }

  /**
   * Opts every lit material in the world scene into the cascaded shadow path.
   *
   * This is not optional bookkeeping: CSM implements cascades as N real
   * directional lights, and the shader only knows to pick *one* of them if the
   * material carries the `USE_CSM` defines. Without them three falls through to
   * its stock loop and accumulates all N, so a sunlit surface is lit N times
   * over while a shadowed one still keeps (N-1)/N of the beam. At three
   * cascades that is a 3x overbright key and a deepest-possible shadow only
   * 0.6 stops down — which is exactly what "no shadows, milky blacks, nothing
   * has contact darkening" looks like, and no amount of grading fixes it
   * because the shadow contrast was never rendered in the first place.
   *
   * Materials arrive from the level builder, the AI spawner and the VFX pools
   * at unpredictable times, so this re-scans rather than running once. A
   * traverse of a few hundred nodes every sixth frame is far cheaper than the
   * shader recompiles it guards.
   */
  private registerCascadeMaterials(root: THREE.Object3D): void {
    const csm = this.csm;
    if (!csm) return;

    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      let lit = false;
      for (const mat of mats) {
        if (!mat || !LightingSystem.isLit(mat)) continue;
        lit = true;
        if (this.csmReady.has(mat)) continue;
        this.csmReady.add(mat);
        this.setupCascadeMaterial(mat);
      }
      // A shadow nobody receives is a shadow map rendered for nothing. Opaque
      // world geometry is a receiver by default; the flag is a per-object
      // shader permission, not an artistic choice.
      if (lit && !mesh.receiveShadow) mesh.receiveShadow = true;
    });
  }

  /**
   * `CSM.setupMaterial` assigns `onBeforeCompile` outright, which would silently
   * delete the surface shader (detail normals, macro variation, specular
   * anti-aliasing) that the material system injects the same way. Both hooks
   * are needed, so they are chained.
   *
   * The program cache key needs the same care. Three derives it from
   * `onBeforeCompile.toString()`, and every material would end up sharing this
   * one wrapper's source text — so two materials whose injected GLSL differs
   * would collide on one program. Pinning the key each material reported
   * *before* registration keeps them distinct, and the `USE_CSM` defines are
   * already part of the key on their own.
   */
  private setupCascadeMaterial(mat: THREE.Material): void {
    const csm = this.csm;
    if (!csm) return;

    const priorHook = mat.onBeforeCompile;
    const priorKey = mat.customProgramCacheKey();

    csm.setupMaterial(mat);

    const csmHook = mat.onBeforeCompile;
    mat.onBeforeCompile = function (
      this: THREE.Material,
      shader: THREE.WebGLProgramParametersWithUniforms,
      renderer: THREE.WebGLRenderer,
    ): void {
      priorHook.call(this, shader, renderer);
      csmHook.call(this, shader, renderer);
    };
    mat.customProgramCacheKey = () => `csm${csm.cascades}:${priorKey}`;
    mat.needsUpdate = true;
  }

  /** True for materials that run three's light loop and so honour the cascades. */
  private static isLit(mat: THREE.Material): boolean {
    const m = mat as THREE.Material & {
      isMeshStandardMaterial?: boolean;
      isMeshPhysicalMaterial?: boolean;
      isMeshLambertMaterial?: boolean;
      isMeshPhongMaterial?: boolean;
      isMeshToonMaterial?: boolean;
    };
    return Boolean(
      m.isMeshStandardMaterial ||
        m.isMeshPhysicalMaterial ||
        m.isMeshLambertMaterial ||
        m.isMeshPhongMaterial ||
        m.isMeshToonMaterial,
    );
  }

  /**
   * Hands the sun's shadow maps to the post stack. The volumetric march samples
   * them for light shafts, and the occlusion pass reads them to tell a surface
   * that is taking a beam from one that merely faces the right way.
   */
  private publishCascades(): void {
    if (!this.csm) return;
    this.cascadeInfo.length = 0;
    const breaks = this.csm.breaks ?? [];
    for (let i = 0; i < Math.min(2, this.csm.lights.length); i++) {
      const l = this.csm.lights[i];
      // The *depth* attachment, not the colour one. Under PCFShadowMap three
      // renders depth-only and leaves the render target's colour texture
      // untouched, so `shadow.map.texture` is an uninitialised RGBA8 buffer that
      // happens to sample as a plausible-looking constant. Both consumers read
      // it as normalised depth and therefore reported the same answer for every
      // pixel in the frame: the volumetric pass drew shafts with no occluders in
      // them, and the occlusion pass concluded that every surface in the level
      // was in full sun — which is what exempted interiors from occlusion and
      // left them as flat evenly-lit plaster.
      const map = l.shadow.map?.depthTexture ?? null;
      const split = (breaks[i] ?? 0.25) * QUALITY.shadowDistance;
      this.cascadeInfo.push({ map, matrix: l.shadow.matrix, split });
    }
    this.ctx.engine.pipeline.shadowCascades = this.cascadeInfo;
  }

  resize(): void {
    this.csm?.updateFrustums?.();
    this.fitCascadeDepth();
  }

  /**
   * Fits each cascade's shadow camera depth range to the cascade it covers.
   *
   * three's CSM leaves every cascade on its default 1..2000 orthographic depth
   * range while placing the light `lightMargin` behind the cascade's bounding
   * box, so the town occupies about a fortieth of the range. That matters
   * because `shadow.bias` is applied to the *normalised* depth: the near
   * cascade's -0.00022 was 0.44 m of world depth, and the far cascade's 1.6 m.
   * A bias deeper than the objects casting the shadows removes every contact
   * shadow in the frame — props stop being joined to the ground, which is the
   * single loudest tell in a daylight shot — while doing nothing about acne,
   * because acne is a slope problem that `normalBias` already handles.
   *
   * Called after every `updateFrustums`, which is the only thing that resizes
   * the cascades; the per-frame `update` only slides the light along its axis.
   */
  private fitCascadeDepth(): void {
    if (!this.csm) return;
    // A caster of height h sits h/sin(elevation) further along the light axis
    // than its own footprint, so the margin has to open up as the sun drops or
    // golden hour loses the shadow of everything tall.
    const sinEl = Math.max(this.sky.sunDirection.y, 0.11);
    const margin = THREE.MathUtils.clamp(LightingSystem.TALLEST_CASTER / sinEl, 40, 240);
    this.csm.lightMargin = margin;
    for (const light of this.csm.lights) {
      const cam = light.shadow.camera;
      // The light sits lightMargin behind the cascade box, and the box's own
      // depth along the light axis is at most its diagonal.
      const span = Math.max(cam.right - cam.left, cam.top - cam.bottom);
      cam.near = 1;
      cam.far = margin + span * 1.5;
      cam.updateProjectionMatrix();
    }
  }

  dispose(): void {
    this.csm?.dispose();
    this.sky.dispose();
    this.skyMask?.dispose();
    this.environment?.dispose();
  }
}
