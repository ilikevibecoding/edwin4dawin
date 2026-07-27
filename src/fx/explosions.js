import * as THREE from 'three';
import { bakeNoise, sunShade } from './particles.js';

/**
 * Layered cinematic explosions: a 1-2 frame hot detonation flash, a
 * structured fireball phase (capped warm-white core / 2000K mid / soot
 * rollover, noise-eroded edges) with 2-3 DARK SOOT LOBES composited over
 * the core from ~frame 2 so every burst keeps an internal silhouette,
 * blast tongues, black smoke swallow arriving ~0.15s later, dirt columns,
 * an expanding ground-hugging DUST WAVE annulus (sprites + textured torus)
 * rolling 10-18m up the street, gravity-arced ember streaks, hot debris
 * plus 25-40 m/s heavy arc chunks towing smoke trails over the rooflines,
 * skyline pillars, big scorch decals and a strong-but-LOCAL detonation
 * light that visibly kicks warm off nearby facades for several frames.
 *
 * ROUND 8 emissive budget: the round-7 stack (RGB ~15 fireball cores, an
 * 8-12m additive flash sphere per bomb, 1150cd light) blew the whole
 * street end into ONE white bloom mass — 'sensor overexposure rather than
 * ordnance'. Fireball vColors now sit near 1.0 (the pool ramp caps the
 * white plateau at ~2.6), the flash sphere is half the size and 2-3
 * frames, and per-bomb core count/size/spread came down so separate bombs
 * in a stick read as SEPARATE fireballs.
 *
 * Every smoke sprite is sun-shaded per-particle (offset dir vs SUN via
 * sunShade) and every fire/smoke spawn carries random rotation, ±30% scale
 * jitter, warm/cool tint jitter and a ROLE-biased atlas tile (dense boil /
 * tall ragged / wide roller / wispy shred), so no two sprites read as
 * clones and columns, skirts and veils carry different silhouettes.
 */

// Preallocated spawn palette (no per-explosion color churn). NOTE: fire
// pool colors MULTIPLY the shader's blackbody ramp (white plateau ~2.6),
// so ~1.0 here means 'ramp as authored' and ~1.3 is already a hot core.
const C_COREF = new THREE.Color(1.5, 1.38, 1.15);
const C_COREF1 = new THREE.Color(0.9, 0.55, 0.3);
// Detonation flash sprite (additive, no ramp): peaks past 3 so the burst
// centre still pops white-hot for a couple frames, but no longer floods
// half the street through bloom (was 6.5 over an 8-12m quad).
const C_WFLASH0 = new THREE.Color(3.3, 2.95, 2.35);
const C_WFLASH1 = new THREE.Color(1.5, 0.95, 0.45);
const C_FIRE0 = new THREE.Color(1.26, 1.16, 1.0);
const C_FIRE1 = new THREE.Color(0.85, 0.6, 0.45);
const C_TONGUE0 = new THREE.Color(1.55, 1.25, 0.9);
const C_TONGUE1 = new THREE.Color(1.05, 0.45, 0.16);
const C_EMBER0 = new THREE.Color(2.2, 1.6, 0.95);
const C_EMBER1 = new THREE.Color(1.15, 0.42, 0.14);
// Soot lobes: near-black rags riding OVER the hot core (normal blend, the
// smoke pool draws above fire) so the fireball keeps a dark silhouette
// inside its own glare.
const C_SOOTL0 = new THREE.Color(0.032, 0.03, 0.028);
const C_SOOTL1 = new THREE.Color(0.125, 0.13, 0.126);
// Rising smoke that ends up against BLUE SKY must lerp toward COOL neutral
// greys (red ~10% under green/blue): the warm film grade re-warms it, and a
// warm-grey veil over blue mixed to magenta. Ground-level dirt/skirt colors
// stay warm — they sit against the fire and the deck, not the sky.
const C_BLACK0 = new THREE.Color(0.03, 0.03, 0.03);
const C_BLACK1 = new THREE.Color(0.143, 0.158, 0.152);
const C_BODY0 = new THREE.Color(0.055, 0.05, 0.045);
const C_BODY1 = new THREE.Color(0.285, 0.30, 0.288);
const C_DIRT0 = new THREE.Color(0.4, 0.32, 0.22);
const C_DIRT1 = new THREE.Color(0.48, 0.4, 0.3);
const C_SKIRT0 = new THREE.Color(0.5, 0.44, 0.35);
const C_SKIRT1 = new THREE.Color(0.47, 0.42, 0.34);
// Ground dust WAVE: near-neutral tan — the warm film grade + fire light
// supply the heat; anything redder stacked into a salmon veil at close
// range (iteration 1), anything brighter into the old white wash.
const C_WAVE0 = new THREE.Color(0.40, 0.365, 0.305);
const C_WAVE1 = new THREE.Color(0.455, 0.425, 0.38);
const C_TRAIL0 = new THREE.Color(0.24, 0.22, 0.2);
const C_TRAIL1 = new THREE.Color(0.3, 0.28, 0.26);
const C_PILLAR0 = new THREE.Color(0.047, 0.051, 0.05);
const C_PILLAR1 = new THREE.Color(0.196, 0.222, 0.214);

// Scratch colors for per-sprite tint/sun modulation (spawn() copies them).
const _t0 = new THREE.Color();
const _t1 = new THREE.Color();

/** Per-sprite warm/cool tint jitter: writes base scaled into `out`. */
function jitterTint(out, base, k = 0.08) {
  const t = Math.random() * 2 - 1; // -1 cool .. +1 warm
  const s = 0.94 + Math.random() * 0.12;
  out.copy(base).multiplyScalar(s);
  out.r *= 1 + t * k;
  out.b *= 1 - t * k * 0.85;
  return out;
}

/**
 * Dust shockwave annulus: ragged fbm ring band (peak at ~74% of the half-
 * extent) that reads as a torus of dust hugging the deck when laid flat.
 */
function shockRingCanvas(size = 256, seed = 41) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const n1 = bakeNoise(6, seed * 91 + 13);
  const n2 = bakeNoise(14, seed * 91 + 57);
  const n3 = bakeNoise(28, seed * 91 + 111);
  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const dx = u - 0.5, dy = v - 0.5;
      const r = Math.sqrt(dx * dx + dy * dy) * 2; // 0 centre -> 1 edge
      const n = n1(u, v) * 0.5 + n2(u, v) * 0.32 + n3(u, v) * 0.18;
      // Ring band: sharp-ish leading edge, soft dusty trailing skirt.
      // The (0.96 - r) envelope guarantees zero alpha at the quad edge.
      const band = Math.exp(-Math.pow((r - 0.74) / (0.10 + n * 0.06), 2));
      const inner = Math.max(0, 1 - Math.abs(r - 0.52) / 0.3) * 0.25;
      let a = (band + inner) * (0.55 + 0.45 * n) * Math.max(0, Math.min(1, (0.96 - r) * 6));
      a = a > 1 ? 1 : a;
      const i = (y * size + x) * 4;
      // Darker, warmer band than round 6 (150-210 grey read as a flat
      // white wash at close range — this is lit dirt-dust, not steam).
      const lum = 118 + n * 54;
      d[i] = lum;
      d[i + 1] = lum * 0.88;
      d[i + 2] = lum * 0.72;
      d[i + 3] = a * 212;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

export class ExplosionSystem {
  constructor(scene, fx, decals) {
    this.scene = scene;
    this.fx = fx;
    this.decals = decals;
    this._v = new THREE.Vector3();
    this._v2 = new THREE.Vector3();

    // Pooled ground shockwave rings (flat textured annuli, normal-blended
    // dust — lit haze, not glow). One per detonation, ~0.5s life.
    const ringTex = new THREE.CanvasTexture(shockRingCanvas(256));
    ringTex.wrapS = ringTex.wrapT = THREE.ClampToEdgeWrapping;
    ringTex.colorSpace = THREE.SRGBColorSpace;
    const ringGeo = new THREE.PlaneGeometry(1, 1);
    ringGeo.rotateX(-Math.PI / 2);
    this.rings = [];
    for (let i = 0; i < 6; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: ringTex, transparent: true, opacity: 0,
        depthWrite: false,
      });
      const m = new THREE.Mesh(ringGeo, mat);
      m.visible = false;
      m.renderOrder = 10; // above decals, below fire/smoke
      m.frustumCulled = false;
      scene.add(m);
      this.rings.push({ mesh: m, age: 0, life: 0.5, active: false, y0: 0, r0: 0, speed: 15, a0: 0.55 });
    }
  }

  spawn(pos, { radius = 6, big = false, scorch = true, column = big } = {}) {
    const fx = this.fx;
    const r = radius;
    const v = this._v;

    // 1. Core flash — 2-3 frames of hot (ramp-capped) white at the heart,
    //    ~2/3 the round-7 footprint so neighbouring bombs don't knit into
    //    one sheet of glare.
    fx.fire.spawn({
      pos: v.set(pos.x, pos.y + r * 0.16, pos.z),
      life: 0.06, size0: r * 0.4, size1: r * 0.58,
      color0: C_COREF, color1: C_COREF1,
      alpha0: 1, alpha1: 0, fadeIn: 0,
    });

    // 1b. Detonation flash — 2-3 frames of additive white pop over the
    //     burst centre. Round 8: HALF the round-7 size and half the HDR
    //     (0.95-1.35r @ RGB 6.5 stacked across a 7-bomb stick = the
    //     'blown-white bloom mass with no readable fireball lobes'); the
    //     violence frame stays, confined to the burst heart.
    fx.flash.spawn({
      pos: v.set(pos.x, pos.y + r * 0.2, pos.z),
      life: 0.045,
      size0: r * (big ? 0.5 : 0.4), size1: r * (big ? 0.75 : 0.58),
      color0: C_WFLASH0, color1: C_WFLASH1,
      alpha0: 1, alpha1: 0, fadeIn: 0, rot: Math.random() * 6.3,
    });

    // 2. Fireball cluster — 0.65-1.0s dwell. The pool's blackbody ramp +
    //    atlas gives each sprite a warm-white core (capped ~2.6 so ACES
    //    keeps tone), rolling orange mid and a broad soot rollover that
    //    crumbles outward with age. Per-sprite: random atlas tile/mirror +
    //    rotation, ±28% scale jitter, warm/cool tint jitter and 0-60ms
    //    birth stagger. Round 8: SEVEN lobes (was 10) at ~85% size on a
    //    tighter spread — separate bombs in a stick now read as separate
    //    fireballs instead of one merged wash.
    const nFire = big ? 7 : 5;
    for (let i = 0; i < nFire; i++) {
      const ox = (Math.random() - 0.5) * r * 0.42;
      const oy = Math.random() * r * 0.36;
      const oz = (Math.random() - 0.5) * r * 0.42;
      const sj = 0.72 + Math.random() * 0.55;
      jitterTint(_t0, C_FIRE0, 0.06);
      jitterTint(_t1, C_FIRE1, 0.1);
      fx.fire.spawn({
        pos: v.set(pos.x + ox, pos.y + oy + r * 0.08, pos.z + oz),
        vel: this._v2.set(ox * 2.0, 2.8 + Math.random() * 3.4, oz * 2.0),
        life: 0.62 + Math.random() * 0.38,
        size0: r * 0.25 * sj, size1: r * 0.52 * (0.8 + Math.random() * 0.4),
        color0: _t0, color1: _t1,
        alpha0: 1, alpha1: 0.3, drag: 1.6,
        rot: Math.random() * 6.283, rotVel: (Math.random() - 0.5) * 3.2,
        delay: i === 0 ? 0 : Math.random() * 0.06, fadeIn: 0,
      });
    }

    // 2b. SOOT LOBES — 2-3 near-black, normal-blend rags composited OVER
    //     the hot core from ~frame 2 onward (the smoke pool draws above
    //     fire; delays 30-90ms), slightly larger than the core sprites and
    //     offset upward/outward. This is the round-8 critics' #1 fix: the
    //     fireball keeps a readable dark silhouette INSIDE the glare —
    //     'rolling orange rim + soot rollover', not a rendering flare.
    const nSoot = big ? 3 : 2;
    for (let i = 0; i < nSoot; i++) {
      const sa = Math.random() * Math.PI * 2;
      const ox = Math.cos(sa) * r * (0.1 + Math.random() * 0.2);
      const oz = Math.sin(sa) * r * (0.1 + Math.random() * 0.2);
      const oy = r * (0.28 + Math.random() * 0.3);
      sunShade(_t1, C_SOOTL1, ox, oy, oz, 0.6, 1.15);
      fx.smoke.spawn({
        pos: v.set(pos.x + ox, pos.y + oy, pos.z + oz),
        vel: this._v2.set(ox * 1.6 + (Math.random() - 0.5), 5 + Math.random() * 3, oz * 1.6 + (Math.random() - 0.5)),
        life: 1.0 + Math.random() * 0.5,
        size0: r * 0.34 * (0.85 + Math.random() * 0.35), size1: r * (0.62 + Math.random() * 0.25),
        color0: C_SOOTL0, color1: _t1,
        alpha0: 0.92, alpha1: 0, drag: 1.4,
        rotVel: (Math.random() - 0.5) * 0.8,
        delay: 0.02 + i * 0.024, fadeIn: 0.03,
        // Rounded rollover lobes, not vertical strips (iter 1's 1.3-2.2
        // aspect + tall tiles read as spiky torn-paper shreds).
        aspect: 1.1 + Math.random() * 0.6,
        tile: 0,
      });
    }

    // 2b. Blast tongues — fixed-length fire fingers spiking out of the core
    //     for the first ~0.35s (negative stretch = absolute metres). The
    //     pool shader tapers each tongue head-to-tail, breaks its alpha
    //     lengthwise and bends the tail a few degrees per streak, so none
    //     of them resolve as ruler-straight rays.
    const nTongue = big ? 4 : 3;
    for (let i = 0; i < nTongue; i++) {
      const a = Math.random() * Math.PI * 2;
      fx.fire.spawn({
        pos: v.set(pos.x, pos.y + r * 0.15, pos.z),
        vel: this._v2.set(Math.cos(a) * (8 + Math.random() * 7), 5 + Math.random() * 6, Math.sin(a) * (8 + Math.random() * 7)),
        life: 0.26 + Math.random() * 0.14,
        size0: r * 0.085, size1: r * 0.05,
        color0: C_TONGUE0, color1: C_TONGUE1,
        alpha0: 1, alpha1: 0, drag: 2.6, grav: 3, fadeIn: 0,
        // Absolute length = |stretch| * size0 -> ~1.7-2.6m fingers at r=9
        stretch: -(2.2 + Math.random() * 1.2),
      });
    }

    // 3a. Black swallow — near-black, fully opaque puffs riding the
    //     fireball top, but arriving only after ~0.15s so the fire phase
    //     is never smothered at birth. Stretched 2:1-4:1 vertically
    //     (area-preserving); the atlas' carved rims + early erosion keep
    //     the soot reading as shredded smoke rags, never gray rocks.
    const nBlack = big ? 5 : 4;
    for (let i = 0; i < nBlack; i++) {
      const ox = (Math.random() - 0.5) * r * 0.4;
      const oz = (Math.random() - 0.5) * r * 0.4;
      const sj = 0.75 + Math.random() * 0.5;
      fx.smoke.spawn({
        pos: v.set(pos.x + ox, pos.y + r * (0.25 + Math.random() * 0.3), pos.z + oz),
        vel: this._v2.set(ox * 1.2 + (Math.random() - 0.5) * 1.5, 6 + Math.random() * 3, oz * 1.2 + (Math.random() - 0.5) * 1.5),
        life: 2.2 + Math.random() * 1.4,
        size0: r * 0.34 * sj, size1: r * (1.0 + Math.random() * 0.6),
        color0: C_BLACK0, color1: sunShade(_t1, C_BLACK1, ox, r * 0.3, oz, 0.6, 1.15),
        alpha0: 1.0, alpha1: 0, drag: 1.0, rotVel: (Math.random() - 0.5) * 0.6,
        delay: 0.14 + Math.random() * 0.08, fadeIn: 0.06,
        // 1.6-2.6 (was 2-4): rags, but not vertical paper strips
        aspect: 1.6 + Math.random() * 1.0,
        tile: i % 2 === 0 ? 1 : 0, // tall shreds + dense boils, alternating
      });
    }

    // 3b. Rolling smoke body filling in behind the black cap. Sun-shaded
    //     per puff (offset dir vs key light): the plume reads lit on the
    //     sun side, dark in its own shadow — volumetric, not flat discs.
    const nSmoke = big ? 9 : 7;
    for (let i = 0; i < nSmoke; i++) {
      const ox = (Math.random() - 0.5) * r * 0.7;
      const oz = (Math.random() - 0.5) * r * 0.7;
      const sj = 0.7 + Math.random() * 0.6;
      sunShade(_t1, C_BODY1, ox, r * 0.25, oz, 0.55, 1.15);
      jitterTint(_t1, _t1, 0.05);
      fx.smoke.spawn({
        pos: v.set(pos.x + ox, pos.y + Math.random() * r * 0.6, pos.z + oz),
        vel: this._v2.set(ox * 1.5 + (Math.random() - 0.5) * 2, 3.2 + Math.random() * 4.0, oz * 1.5 + (Math.random() - 0.5) * 2),
        life: 2.6 + Math.random() * 2.0,
        size0: r * 0.36 * sj, size1: r * (1.15 + Math.random() * 0.75),
        color0: C_BODY0, color1: _t1,
        alpha0: 0.95, alpha1: 0, drag: 1.1, rotVel: (Math.random() - 0.5) * 1.2,
        delay: 0.2 + Math.random() * 0.16, fadeIn: 0.06,
        aspect: 1.5 + Math.random() * 0.8,
        tile: i % 3 === 2 ? 3 : 0, // dense body with wispy shreds mixed in
      });
    }

    // 4. Dirt columns — towers of earth, the signature of real ordnance.
    for (let i = 0; i < 5; i++) {
      const ox = (Math.random() - 0.5) * r * 0.35;
      const oz = (Math.random() - 0.5) * r * 0.35;
      sunShade(_t0, C_DIRT0, ox, 0.6, oz, 0.62, 1.15);
      sunShade(_t1, C_DIRT1, ox, 0.6, oz, 0.62, 1.15);
      fx.smoke.spawn({
        pos: v.set(pos.x + ox, pos.y + 0.2, pos.z + oz),
        vel: this._v2.set((Math.random() - 0.5) * 3, 14 + Math.random() * 4, (Math.random() - 0.5) * 3),
        life: 1.8 + Math.random() * 0.6,
        size0: r * 0.18 * (0.75 + Math.random() * 0.5), size1: r * (0.4 + Math.random() * 0.2),
        color0: _t0, color1: _t1,
        alpha0: 0.9, alpha1: 0, drag: 0.6, rotVel: (Math.random() - 0.5) * 0.8,
        delay: Math.random() * 0.05, fadeIn: 0.03,
        aspect: 1.5 + Math.random() * 0.8,
        tile: 1, // tall ragged crowns — these ARE the towers
      });
    }

    // 5. Ground dust skirt — a few persistent low sprites hugging the deck
    //    (thinned from round 6: the old 8-sprite skirt + racers pooled into
    //    a flat white wash; the WAVE below owns the outward energy now).
    const nDust = big ? 5 : 4;
    for (let i = 0; i < nDust; i++) {
      const a = (i / nDust) * Math.PI * 2 + Math.random() * 0.7;
      const ca = Math.cos(a), sa = Math.sin(a);
      const slum = 0.85 + Math.random() * 0.25;
      sunShade(_t0, C_SKIRT0, ca, 0.3, sa, 0.6, 1.12);
      jitterTint(_t0, _t0, 0.05);
      _t0.multiplyScalar(slum);
      sunShade(_t1, C_SKIRT1, ca, 0.3, sa, 0.6, 1.12);
      _t1.multiplyScalar(slum);
      fx.smoke.spawn({
        pos: v.set(pos.x + ca * r * 0.3, pos.y + 0.35, pos.z + sa * r * 0.3),
        vel: this._v2.set(ca * (11 + Math.random() * 5), 0.5, sa * (11 + Math.random() * 5)),
        life: 2.2 + Math.random() * 0.5,
        size0: r * 0.4 * (0.8 + Math.random() * 0.4), size1: r * (1.35 + Math.random() * 0.5),
        color0: _t0, color1: _t1,
        alpha0: 0.42, alpha1: 0, drag: 1.8, fadeIn: 0,
        rotVel: (Math.random() - 0.5) * 0.4,
        aspect: 0.55 + Math.random() * 0.25,
        tile: 2, // wide flat rollers hugging the deck
      });
    }

    // 5b. GROUND DUST WAVE — the #1 COD detonation signature: an expanding
    //     annulus of low, WIDE rollers (aspect < 1 = flattened) that races
    //     outward 10-16m along the street, dense at the front and eroding
    //     as it fades over ~2.2s. FRONT-LOADED: v0 13-22 m/s against drag
    //     1.3 puts the wall 5-8m out (visibly detached from the burst)
    //     within the first half second, then coasts to rest.
    const nWave = big ? 15 : 9;
    for (let i = 0; i < nWave; i++) {
      const a = (i / nWave) * Math.PI * 2 + Math.random() * 0.42;
      const ca = Math.cos(a), sa = Math.sin(a);
      const v0 = 13 + Math.random() * 9;
      // Per-roller value separation: neighbouring rollers must land at
      // different tones or the annulus re-pools into one milky wash.
      const vlum = 0.78 + Math.random() * 0.34;
      sunShade(_t0, C_WAVE0, ca, 0.25, sa, 0.6, 1.15);
      jitterTint(_t0, _t0, 0.05);
      _t0.multiplyScalar(vlum);
      sunShade(_t1, C_WAVE1, ca, 0.25, sa, 0.6, 1.15);
      _t1.multiplyScalar(vlum);
      fx.smoke.spawn({
        pos: v.set(pos.x + ca * r * 0.35, pos.y + 0.5 + Math.random() * 0.5, pos.z + sa * r * 0.35),
        vel: this._v2.set(ca * v0, 0.5 + Math.random() * 0.4, sa * v0),
        life: 2.0 + Math.random() * 0.5,
        size0: r * 0.30 * (0.8 + Math.random() * 0.4), size1: r * (1.05 + Math.random() * 0.55),
        color0: _t0, color1: _t1,
        alpha0: 0.85, alpha1: 0, drag: 1.3, fadeIn: 0.04,
        rotVel: (Math.random() - 0.5) * 0.5,
        aspect: 0.48 + Math.random() * 0.22,
        tile: i % 4 === 3 ? 3 : 2, // rollers with the odd wispy shred
      });
    }

    // 6. Shockwave — a flat dust torus hugging the deck (pooled textured
    //    annulus). Expansion speed, life and peak alpha scale with the
    //    bomb: a 9m airstrike bomb throws the front out to a ~20m radius
    //    so the ring still reads at 40-70m. A few low billboard racers
    //    ride the same front so it has body.
    this._ring(pos, r, big);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.random() * 0.9;
      const ca = Math.cos(a), sa = Math.sin(a);
      const rs = r * 2.2 + Math.random() * 3; // racer speed rides the ring front
      sunShade(_t0, C_SKIRT0, ca, 0.2, sa, 0.6, 1.12);
      fx.smoke.spawn({
        pos: v.set(pos.x + ca * r * 0.3, Math.max(0.5, pos.y * 0.3 + 0.4), pos.z + sa * r * 0.3),
        vel: this._v2.set(ca * rs, 0.4, sa * rs),
        life: 0.6,
        size0: r * 0.12, size1: r * (0.45 + Math.random() * 0.2),
        color0: _t0, color1: _t0,
        alpha0: 0.55, alpha1: 0, drag: 0.8, fadeIn: 0,
        aspect: 0.6 + Math.random() * 0.25,
        tile: 2,
      });
    }

    // 7. Embers — gravity-arced streaks, 30-60 m/s launch with drag. The
    //    pool re-orients each quad along its CURRENT velocity every frame
    //    (gravity included) and shortens the stretch as speed decays, so
    //    arcs BEND — and the pool shader adds per-streak width taper,
    //    alpha noise, length jitter and bend. Life is CAPPED at 0.85-1.35s
    //    so no ember survives long enough to sweep a third of the frame.
    //    20-30 per burst; every 10th tows a sub-stepped smoke thread.
    const nEmber = big ? 26 : 16;
    for (let i = 0; i < nEmber; i++) {
      const a = Math.random() * Math.PI * 2;
      const up = 0.25 + Math.random() * 0.72;          // upper-hemisphere bias
      const hr = Math.sqrt(Math.max(0, 1 - up * up));
      const sp = 30 + Math.random() * 30;              // 30-60 m/s launch
      fx.fire.spawn({
        pos: v.set(pos.x, pos.y + 0.4, pos.z),
        vel: this._v2.set(Math.cos(a) * hr * sp, up * sp, Math.sin(a) * hr * sp),
        grav: 13, drag: 1.5, killY: pos.y + 0.03,
        life: 0.85 + Math.random() * 0.5,
        size0: 0.05, size1: 0.016,
        color0: C_EMBER0, color1: C_EMBER1,
        alpha0: 1, alpha1: 0, fadeIn: 0, stretch: 1,
        // Sparse smoke threads: at 30-60 m/s a tight spacing floods the
        // dust pool (hundreds of puffs/sec), so only every 10th ember tows
        // one, sampled every 1.2m — still an unbroken ribbon at speed.
        trail: i % 10 === 0 ? {
          every: 1.2,
          emit: (p) => fx.debrisDust.spawn({
            pos: p, vel: this._v2.set(0, 0.3, 0),
            life: 0.3 + Math.random() * 0.15, size0: 0.14, size1: 0.5,
            color0: C_TRAIL0, color1: C_TRAIL1,
            alpha0: 0.4, alpha1: 0, drag: 1.2, fadeIn: 0,
          }),
        } : null,
      });
    }

    // 8. Debris chunks — shards, planks and tumbling masonry; they spawn
    //    hot (ember-edge glow cooling over 0.4s), stretch along velocity
    //    while fast, and ~30% tow thin smoke trails.
    const nDeb = big ? 16 : 9;
    for (let i = 0; i < nDeb; i++) {
      this._v2.set((Math.random() - 0.5) * 14, 5 + Math.random() * 10, (Math.random() - 0.5) * 14);
      fx.debris.spawn(v.set(pos.x, pos.y + 0.5, pos.z), this._v2, 0.05 + Math.random() * 0.14, 2.6 + Math.random() * 1.6, 1);
    }

    // 8b. Heavy arc chunks — the money shot. 7-9 big DARK pieces launched
    //     at 25-40 m/s on 45-70° elevations (apexes 10-40m, well above the
    //     rooflines) with FORCED heavy smoke trails, so every big bomb
    //     throws smoking debris that silhouettes against fire and sky and
    //     rains back down through its own column. Long life covers the
    //     full 3-5s flight.
    if (big) {
      const nHeavy = 7 + ((Math.random() * 3) | 0);
      for (let i = 0; i < nHeavy; i++) {
        const a = Math.random() * Math.PI * 2;
        const el = (45 + Math.random() * 25) * (Math.PI / 180);
        const sp = 25 + Math.random() * 15;
        const ch = Math.cos(el) * sp;
        this._v2.set(Math.cos(a) * ch, Math.sin(el) * sp, Math.sin(a) * ch);
        fx.debris.spawn(
          v.set(pos.x + (Math.random() - 0.5) * r * 0.2, pos.y + 0.6, pos.z + (Math.random() - 0.5) * r * 0.2),
          this._v2, 0.19 + Math.random() * 0.09, 4.5 + Math.random() * 1.5, 1, true
        );
      }
    }

    // 8c. Skyline pillars — big detonations leave 2-3 slow near-black
    //     columns that keep climbing for 6-9s (cool neutral greys: these
    //     are the big veil sprites that sit over blue sky).
    if (big) {
      const nPillar = 2 + (Math.random() < 0.5 ? 1 : 0);
      for (let i = 0; i < nPillar; i++) {
        const ox = (Math.random() - 0.5) * r * 0.5;
        const oz = (Math.random() - 0.5) * r * 0.5;
        sunShade(_t1, C_PILLAR1, ox, r * 0.2, oz, 0.6, 1.12);
        fx.smoke.spawn({
          pos: v.set(pos.x + ox, pos.y + r * 0.5, pos.z + oz),
          vel: this._v2.set((Math.random() - 0.5) * 0.7 + ox * 0.12, 1.6 + Math.random() * 0.9, (Math.random() - 0.5) * 0.7 + oz * 0.12),
          life: 6 + Math.random() * 3,
          size0: r * 0.5 * (0.8 + Math.random() * 0.4), size1: r * (1.9 + Math.random() * 0.7),
          color0: C_PILLAR0, color1: _t1,
          alpha0: 0.65, alpha1: 0, drag: 0.25, rotVel: (Math.random() - 0.5) * 0.25,
          delay: 0.25 + Math.random() * 0.3, fadeIn: 0.5,
          aspect: 1.7 + Math.random() * 0.9,
          tile: i === 0 ? 1 : 3, // one tall crown, the rest wispy veils
        });
      }
    }

    // 9. Detonation light — strong but LOCAL. Round 6's 520/22m barely
    //    registered ("fireballs sit like stickers"); round 7's 1150/27m
    //    over-corrected and helped blow the street end into one white
    //    mass. Round 8 splits the difference and pulls the throw in a
    //    touch: facades still kick warm, but deck/wall pixels inside ~8m
    //    of a burst no longer clip past the bloom threshold on their own.
    this.fx.lights.flash(v.set(pos.x, pos.y + 2.4, pos.z), {
      color: 0xff9040,
      intensity: big ? 820 : 520,
      life: big ? 0.5 : 0.34,
      distance: Math.min(r * 2.7, 24),
    });

    // 10. Persistent marks — a 3.5-4.8m scorch projected at every impact.
    if (scorch && this.decals) this.decals.scorch(pos, big ? 1.1 : 0.8);
    if (column) this.fx.addSmokeColumn(pos, 20 + Math.random() * 14);

    if (this.fx.onShake) this.fx.onShake(pos, big ? 1.6 : 1.0);
  }

  _ring(pos, r, big = false) {
    let slot = this.rings.find((s) => !s.active);
    if (!slot) slot = this.rings[0];
    slot.active = true;
    slot.age = 0;
    // Big ordnance: longer-lived, faster front so the ring is still a
    // readable dust wall from across the map (alpha trimmed vs round 6 —
    // the sprite WAVE carries the mass now; the ring is the sharp front).
    slot.life = big ? 0.85 : 0.55;
    slot.speed = r * 2.4;
    slot.a0 = big ? 0.62 : 0.55;
    slot.r0 = r * 0.24;
    slot.y0 = pos.y + 0.24;
    slot.mesh.visible = true;
    slot.mesh.position.set(pos.x, slot.y0, pos.z);
    slot.mesh.rotation.y = Math.random() * Math.PI * 2;
    slot.mesh.material.opacity = slot.a0;
  }

  update(dt) {
    // Shockwave rings: radius grows at the per-burst front speed, lifting
    // slightly as they fade.
    for (const s of this.rings) {
      if (!s.active) continue;
      s.age += dt;
      const t = s.age / s.life;
      if (t >= 1) { s.active = false; s.mesh.visible = false; continue; }
      const R = s.r0 + s.speed * s.age;    // torus radius in metres
      const scale = R / 0.37;              // texture band peaks at 74% of half-extent
      s.mesh.scale.set(scale, 1, scale);
      s.mesh.position.y = s.y0 + t * 0.9;
      s.mesh.material.opacity = s.a0 * Math.pow(1 - t, 1.35);
    }
  }
}
