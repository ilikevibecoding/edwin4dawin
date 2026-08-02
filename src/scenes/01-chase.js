/**
 * Scene 1 — The Chase.
 *
 * Seven shots, cut the way the source material opens:
 *
 *    0.00 –  8.15  she rips past the lens and runs for Tatooine
 *    8.20 – 14.10  THE SHOT: his prow slides into the top of frame and keeps
 *                  coming while the camera cranes up after it
 *   14.15 – 17.40  cut: wide and low right beneath him, nothing but grey hull
 *                  grinding overhead
 *   17.45 – 21.20  cut: medium on her flank as the turbolasers land
 *   21.25 – 25.30  she yaws off her heading with a bell out and smoking
 *   25.40 – 30.20  the tractor beam reaches down and takes her
 *   30.25 –  END   tight and low on the hangar mouth as it swallows her
 *
 * FRAME OF REFERENCE
 * ------------------
 * The pair are doing a few thousand units a second, which no camera track wants
 * to express in absolute coordinates. Everything here is written in the
 * CORVETTE'S frame instead: she holds near the origin (drifting only as she is
 * hit and then lifted), the destroyer slides forward along +z past her, and the
 * airspeed they share is sold by dust streaming past the lens, by the engine
 * wash and by the deserts turning underneath.
 *
 * +z is forward for both ships and +y is up, matching ships-capital.js.
 *
 * PURITY: no Math.random() anywhere. Every position — including the ones the
 * bolts and explosions were scheduled against at build time — comes out of the
 * same pure functions of t that update() uses.
 */
import * as THREE from 'three';
import { Bricks, PITCH, PLATE } from '../engine/brick.js';
import { COLORS, KIT } from '../engine/palette.js';
import { standardLights, cameraRig, handheld, nebulaBackdrop } from '../engine/stage.js';
import { Starfield, BoltPool, Sparks, Fireball, Thruster, Beam, Smoke, glowSprite, additiveMaterial } from '../engine/fx.js';
import { hash11, fbm1 } from '../engine/rng.js';
import * as ease from '../engine/ease.js';

export const meta = { id: 'chase', title: 'The Chase', duration: 34, letterbox: 0.105 };

/** Linear interpolation between keys: constant velocity, no stall at each key. */
const LIN = (x) => x;
/** Plates per stud, for vertical spans written in stud-equivalents. */
const PY = PITCH / PLATE;

// ---------------------------------------------------------------------------
// The geometry of the chase
// ---------------------------------------------------------------------------

/** Height of the destroyer's keel above her flight axis. */
const BELLY = 38;
/** Airspeed at full throttle, world units per second. */
const AIR = 150;
const PLANET_R = 1550;
const PLANET_POS = [-120, -1750, 1900];

/** Beat clock. Narration starts at 1.60, 8.19 and 17.48 (see ctx.lines). */
const T = {
  pass: 1.35, // she overtakes the lens
  shadow: 8.2, // cut: the locked-off plate the prow will come into
  under: 14.15, // cut: wide and low, right beneath him
  hits: 17.45, // cut + the turbolasers land
  slew: 21.25, // cut: she is off her heading and smoking
  lock: 25.4, // cut: the tractor beam takes hold
  lift: 26.5, // she starts to rise
  throat: 30.25, // cut: in tight on the hangar mouth
};

/**
 * The destroyer's nose in multiples of his own length, so the choreography
 * survives a model that is not exactly 260 studs long.
 *
 * He runs her down with an exponentially decaying overtake — fast when he is a
 * shadow behind her, almost station-keeping by the time the beam has her. That
 * is one smooth curve rather than a keyframe track, which matters: a kink in
 * this number is a kink in the descent of a hull edge across the whole frame.
 */
const SD_END = 0.7; // asymptote: nose 0.70 lengths ahead of her
const SD_GAP = 3.25; // lengths still to make up at t = 0
const SD_TAU = 7.27; // seconds to close 1/e of it

function sdNoseZ(t, len) {
  return (SD_END - SD_GAP * Math.exp(-t / SD_TAU)) * len;
}

/** Distance flown along the shared course; the airspeed is its derivative. */
const TRAVEL = [
  [0, 0],
  [T.hits, T.hits * AIR],
  [21, 3040],
  [26, 3390],
  [30, 3530],
  [40, 3750],
];

function travelAt(t) {
  return ease.track(TRAVEL, t, LIN);
}

/** Airspeed, by central difference of the distance flown. */
function airspeedAt(t) {
  return (travelAt(t + 0.06) - travelAt(t - 0.06)) / 0.12;
}

/** A struck-ship wobble: one damped sine starting at t0. Pure in t. */
function kick(t, t0, amp, freq, decay) {
  if (t < t0) return 0;
  const d = t - t0;
  return amp * Math.sin(d * freq) * Math.exp(-d * decay);
}

/**
 * The corvette's free flight, before the tractor beam has a say in it.
 * World units and radians, in her own frame.
 */
function corvetteAt(t) {
  // She is running flat out, so the airframe never sits still.
  const buffet = 0.4 + 0.6 * (1 - ease.range(t, T.hits, 20.4));
  const roll =
    (Math.sin(t * 1.31) * 0.045 + (fbm1(t * 0.7, 3, 5) - 0.5) * 0.1) * buffet +
    kick(t, T.hits + 0.1, 0.22, 7.4, 1.5) +
    kick(t, 18.6, -0.17, 6.1, 1.3) +
    kick(t, 19.9, 0.13, 8.2, 1.6) +
    kick(t, 5.4, 0.05, 9.0, 2.6);
  const pitch = (fbm1(t * 0.53 + 9, 3, 11) - 0.5) * 0.05 * buffet + kick(t, T.hits + 0.1, -0.07, 6.2, 1.4);
  // With a bell gone she slews off her heading; the tractor field then
  // straightens her out again.
  const off = ease.smooth(ease.range(t, 18.5, 24.4));
  return {
    x: Math.sin(t * 0.41) * 0.6 + off * 3.4,
    y: Math.sin(t * 0.67 + 1.2) * 0.5 * buffet,
    z: 0,
    yaw: off * -0.2 + ease.smooth(ease.range(t, T.lock, 30)) * 0.2 + (fbm1(t * 0.4 + 3, 2, 7) - 0.5) * 0.03,
    pitch,
    roll,
  };
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

export async function build(ctx) {
  const END = ctx.duration;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(44, ctx.aspect, 0.5, 9000);

  // ------------------------------------------------------------------ light
  // One hard sun from behind their left shoulder, and a warm fill from below
  // standing in for the bounce off fifteen hundred units of orange desert —
  // without it the destroyer's underside is a black hole in the money shot.
  const lights = standardLights(scene, 'space', { shadows: false });
  const SUN = new THREE.Vector3(-0.38, 0.5, -0.78).normalize();
  lights.key.position.copy(SUN).multiplyScalar(600);
  lights.key.intensity = 3.3;
  lights.fill.color.setHex(0xffa864);
  lights.fill.position.set(-0.18, -0.95, -0.26).multiplyScalar(400);
  lights.fill.intensity = 1.15;
  lights.rim.position.set(0.7, 0.2, 0.66).multiplyScalar(400);
  lights.rim.intensity = 0.95;

  // -------------------------------------------------------------------- sky
  scene.add(nebulaBackdrop({ radius: 3900, colorA: 0x1c2647, colorB: 0x3a1a2c, density: 0.5 }));
  const stars = new Starfield({ count: 2100, radius: 3000, seed: 19, sizeMin: 5, sizeMax: 26 });
  scene.add(stars.object);

  const dust = new SpeedDust({ count: 220, radius: 210, depth: 640, ahead: 450, size: 0.42 });
  scene.add(dust.object);

  const planet = buildPlanet(SUN);
  scene.add(planet.group);

  // ------------------------------------------------------------------ ships
  // ships-capital.js is written by another pass; fall back to stand-ins that
  // honour the same contract so the scene always renders.
  let capital = null;
  try {
    capital = await import('../kit/ships-capital.js');
  } catch {
    capital = null;
  }
  const corvette = capital?.buildCorvette ? await capital.buildCorvette() : fallbackCorvette();
  const destroyer = capital?.buildStarDestroyer ? await capital.buildStarDestroyer() : fallbackDestroyer();
  const cv = measure(corvette);
  const sd = measure(destroyer);

  // Both models are wrapped so the scene drives a convenient local origin.
  // Corvette: her own bounding-box centre, at the origin of her frame.
  const corvetteRig = new THREE.Group();
  const cvOffset = new THREE.Vector3(-cv.mid.x, -cv.mid.y, -cv.mid.z);
  corvette.position.copy(cvOffset);
  corvetteRig.add(corvette);
  scene.add(corvetteRig);

  // Destroyer: his nose at rig z = 0 and his keel at world y = BELLY, so the
  // only thing update() has to drive is how far forward his nose has got.
  const destroyerRig = new THREE.Group();
  const sdOffset = new THREE.Vector3(-sd.mid.x, BELLY - sd.box.min.y, -sd.box.max.z);
  destroyer.position.copy(sdOffset);
  destroyerRig.add(destroyer);
  scene.add(destroyerRig);

  /** Where the tractor beam comes out: 0.62 lengths aft of the nose. */
  const HANGAR_BACK = sd.len * 0.62;
  /** How high she is lifted — far enough for the mouth to hide most of her. */
  const LIFT_TOP = BELLY + cv.halfH * 0.6;

  // ------------------------------------------------------------- her engines
  const engines = mainEngines(corvette, cv, 7).map(
    (p, i) =>
      new Thruster({
        color: KIT.engineBlue,
        radius: cv.len * (i === 0 ? 0.042 : 0.026),
        length: cv.len * 0.46,
        position: [p.x, p.y, p.z],
        dir: [0, 0, 1],
      })
  );
  for (const e of engines) corvette.add(e.object);

  // ...and his: the three great bells across the transom, throttled back once
  // he has her. Only the top row, or the pick lands on the trim units.
  const sdEngines = mainEngines(destroyer, sd, 3, true).map(
    (p) =>
      new Thruster({
        color: 0xcfeaff,
        radius: sd.len * 0.036,
        length: sd.len * 0.3,
        position: [p.x, p.y, p.z],
        dir: [0, 0, 1],
      })
  );
  for (const e of sdEngines) destroyer.add(e.object);

  // ------------------------------------------------------------- the hangar
  const hangar = buildHangar(cv);
  hangar.group.position.set(0, BELLY, -HANGAR_BACK);
  destroyerRig.add(hangar.group);

  const beam = new Beam({
    color: 0x9fe8ff,
    radiusTop: cv.halfW * 0.75,
    radiusBottom: hangar.width * 0.44,
    height: 1,
    opacity: 0.5,
  });
  beam.object.rotation.x = Math.PI; // local +y now runs downward, out of the hull
  beam.object.position.set(0, BELLY - 0.4, -HANGAR_BACK);
  destroyerRig.add(beam.object);

  // ------------------------------------------------------------------- fire
  const bolts = new BoltPool({ color: KIT.laserGreen, length: cv.len * 0.32, width: 0.6, max: 48, glow: 1.2 });
  scene.add(bolts.object);

  // Turbolaser volleys. Every shot is declared up front and its muzzle is
  // sampled from the destroyer's own motion at the moment of firing, so the
  // pool stays a pure function of t.
  const guns = gunPoints(destroyer, sd, 6);
  /** Muzzle i in world space at time t. */
  const gunAt = (i, t) => {
    const g = guns[i % guns.length];
    return [g.x + sdOffset.x, g.y + sdOffset.y, g.z + sdOffset.z + sdNoseZ(t, sd.len)];
  };
  /** A point on her hull, in world space at time t. */
  const onHull = (at, t) => {
    const c = corvetteAt(t);
    return [at[0] + c.x, at[1] + c.y, at[2] + c.z];
  };
  // Ranging shots from off-screen before he is revealed, then volleys that rake
  // past her once he is in frame.
  const VOLLEYS = [
    { t: 4.4, n: 2, from: [-30, 34, -460], to: [-13, -3, 22], spread: 8 },
    { t: 6.2, n: 2, from: [34, 30, -480], to: [14, 7, 26], spread: 9 },
    { t: 10.5, gun: 0, n: 3, to: [-17, 5, 28], spread: 10 },
    { t: 11.9, gun: 1, n: 2, to: [16, -6, 18], spread: 11 },
    { t: 13.2, gun: 2, n: 3, to: [-14, 9, -6], spread: 9 },
    { t: 15.0, gun: 3, n: 3, to: [18, 4, 14], spread: 12 },
    { t: 16.4, gun: 4, n: 3, to: [-20, -7, 10], spread: 10 },
  ];
  for (let v = 0; v < VOLLEYS.length; v++) {
    const s = VOLLEYS[v];
    bolts.burst({
      t0: s.t,
      n: s.n,
      dt: 0.16,
      from: s.from ?? gunAt(s.gun, s.t),
      to: s.to,
      spread: s.spread,
      speed: 470,
      seed: v + 3,
    });
  }

  // The four that connect, and the damage they leave on her flank.
  const HITS = [
    { t: T.hits + 0.15, at: [cv.halfW * 0.9, 1.6, -cv.len * 0.18], gun: 0, r: cv.len * 0.11 },
    { t: 18.6, at: [-cv.halfW * 0.85, -1.2, cv.len * 0.06], gun: 2, r: cv.len * 0.08 },
    { t: 19.9, at: [cv.halfW * 0.8, 2.4, -cv.len * 0.34], gun: 4, r: cv.len * 0.1 },
    { t: 21.6, at: [-cv.halfW * 0.7, 1.0, -cv.len * 0.3], gun: 1, r: 0 },
  ];
  const fireballs = [];
  const sparks = [];
  for (let i = 0; i < HITS.length; i++) {
    const h = HITS[i];
    bolts.add({ t0: h.t - 0.42, from: gunAt(h.gun, h.t - 0.42), to: onHull(h.at, h.t), speed: 470 });
    const sp = new Sparks({
      count: 130,
      t0: h.t,
      life: 1.5,
      speed: cv.len * 0.42,
      gravity: 0, // vacuum
      color: 0xffd27a,
      size: 0.55,
      seed: 7 + i * 13,
      origin: h.at,
      cone: { axis: [Math.sign(h.at[0]) * 0.8, 0.25, -0.5], spread: 0.85 },
    });
    corvetteRig.add(sp.object);
    sparks.push(sp);
    if (h.r > 0) {
      const fb = new Fireball({ t0: h.t, life: 1.15, radius: h.r, position: h.at, color: 0xffa233 });
      corvetteRig.add(fb.object);
      fireballs.push(fb);
    }
  }

  // The dead bell smoulders. Puffs drift back down the slipstream, so the smoke
  // group is tipped over to make its local "up" the ship's aft.
  const deadBell = (engines[DEAD_BELL] ?? engines[0]).object.position.clone().add(cvOffset);
  const smokes = [[18.9, 8], [24.6, 9.5]].map(([t0, life]) => {
    const sm = new Smoke({
      count: 6,
      t0,
      life,
      origin: [0, 0, 0],
      rise: cv.len * 0.22,
      spread: cv.halfW * 0.5,
      size: cv.len * 0.15,
      color: 0x4a4f57,
      opacity: 0.5,
      seed: Math.round(t0 * 7),
    });
    sm.object.position.copy(deadBell);
    sm.object.rotation.x = -Math.PI / 2; // local +y becomes ship-aft
    corvetteRig.add(sm.object);
    return sm;
  });

  // ------------------------------------------------------------------ sound
  for (let i = 0; i * 5.5 < END; i++) ctx.sfx(i * 5.5, 'engine_rumble', { gain: 0.3 });
  ctx.sfx(T.pass - 0.5, 'ship_pass', { gain: 0.95 });
  ctx.sfx(9.6, 'ship_pass', { gain: 0.7, rate: 0.5 });
  ctx.sfx(T.under - 0.9, 'ship_pass', { gain: 0.9, rate: 0.38 });
  for (const s of VOLLEYS) ctx.sfx(s.t - 0.1, 'turbolaser', { gain: 0.7 });
  for (let i = 0; i < HITS.length; i++) {
    const h = HITS[i];
    ctx.sfx(h.t - 0.5, 'turbolaser', { gain: 0.8 });
    ctx.sfx(h.t, 'laser_impact', { gain: 0.9 });
    if (h.r > 0) ctx.sfx(h.t + 0.02, 'explosion_small', { gain: 0.85 - i * 0.1 });
  }
  ctx.sfx(T.hits + 0.17, 'impact_hit', { gain: 0.9 });
  ctx.sfx(T.lock - 0.4, 'whoosh_transition', { gain: 0.5, rate: 0.7 });
  ctx.sfx(T.lift + 0.4, 'engine_rumble', { gain: 0.45, rate: 0.7 });

  // ----------------------------------------------------------------- camera
  // Shot changes are 0.04s steps in the tracks, i.e. hard cuts at 24fps.
  //
  // Shot 2 is the one that matters. The camera sits low and locked at z ≈ -152
  // with her a speck 152 out; the destroyer's keel is 34 above the lens, so his
  // nose crosses into the top of frame at about 9.3s and its elevation then
  // decays towards the horizon while the lens cranes up after it. Grey hull
  // therefore floods the frame from the top down and she is left in the last
  // sliver of sky at the bottom, which is the composition the whole scene is
  // for. Do not retime one of these tracks without the others.
  const CAM = {
    pos: [
      [0, [20, 15, 74]],
      [1.0, [18.4, 14, 22]],
      [T.pass, [17.6, 13.2, -14]],
      [2.6, [16.6, 11, -54]],
      [5.0, [14.2, 8, -106]],
      [T.shadow, [11.5, 4.4, -152]],
      [10.6, [11.2, 4.3, -153]],
      [12.4, [10.6, 4.2, -155]],
      [14.1, [10.0, 4.1, -157]],
      [T.under, [24, 6, -30]], // cut: under the hull
      [17.4, [21, 6.6, -8]],
      [T.hits, [26, 6, -46]], // cut: her flank
      [21.2, [23, 5.4, -34]],
      [T.slew, [44, 2.5, -70]], // cut: wider, she is slewing
      [25.3, [39, 3.2, -56]],
      [T.lock, [52, 6, -34]], // cut: the beam
      [30.2, [46, 7.5, -18]],
      [T.throat, [30, 12, -2]], // cut: the mouth
      [END, [26, 14.5, 10]],
    ],
    look: [
      [0, [10, 6, 430]],
      [1.0, [7, 4.5, 300]],
      [T.pass, [1.5, 1.5, 44]],
      [2.6, [0, 0.6, 10]],
      [5.0, [0, 0.8, 5]],
      [T.shadow, [0, 0.8, 3]],
      [10.6, [0, 3.4, 7]],
      [12.4, [0, 12, 12]],
      [14.1, [0, 27, 18]],
      [T.under, [0, 34, 34]],
      [17.4, [0, 62, 26]],
      [T.hits, [0, 4.5, 6]],
      [21.2, [0, 5.5, 4]],
      [T.slew, [0, 12, -8]],
      [25.3, [0, 14, -4]],
      [T.lock, [0, 19, -8]],
      [30.2, [0, 24, -2]],
      [T.throat, [0, 34, -14]],
      [END, [0, 36, -8]],
    ],
    fov: [
      [0, 44],
      [2.6, 40],
      [5.0, 34],
      [T.shadow, 32],
      [10.6, 34],
      [12.4, 37],
      [14.1, 40],
      [T.under, 62],
      [17.4, 60],
      [T.hits, 34],
      [21.2, 32],
      [T.slew, 40],
      [T.lock, 45],
      [30.2, 44],
      [T.throat, 44],
      [END, 42],
    ],
    shake: [
      [T.hits + 0.1, 0],
      [T.hits + 0.25, 0.85],
      [T.hits + 1.3, 0.12],
      [19.9, 0.55],
      [20.9, 0.05],
      [21.6, 0.28],
      [22.4, 0],
    ],
    ease: ease.inOutCubic,
  };

  // ----------------------------------------------------------------- update
  const cvPos = new THREE.Vector3();
  const hangarPos = new THREE.Vector3();

  return {
    scene,
    camera,
    bloom: { strength: 0.75, radius: 0.7, threshold: 0.6 },
    update(t) {
      // --- 1. camera, first: the bolt halos and the dust field need it -----
      cameraRig(camera, t, CAM);
      handheld(camera, t, t < T.shadow ? 0.1 : 0.06, 0.45, 5);

      // --- 2. where everybody is ------------------------------------------
      const sdZ = sdNoseZ(t, sd.len);
      destroyerRig.position.z = sdZ;
      hangarPos.set(0, BELLY, sdZ - HANGAR_BACK);

      const c = corvetteAt(t);
      // The beam takes over: she is dragged under the mouth and lifted into it,
      // losing her yaw as the field straightens her.
      const align = ease.smooth(ease.range(t, T.lock, 30.5));
      const lift = ease.smoother(ease.range(t, T.lift, 33.6));
      cvPos.set(
        ease.lerp(c.x, hangarPos.x, align),
        c.y + lift * LIFT_TOP,
        ease.lerp(c.z, hangarPos.z, align)
      );
      corvetteRig.position.copy(cvPos);
      corvetteRig.rotation.set(c.pitch * (1 - align * 0.8), c.yaw, c.roll * (1 - align * 0.7));

      // --- 3. engines ------------------------------------------------------
      // One bell dies first and hard, then the rest gutter out; a flicker on
      // the way down so it reads as failure rather than a switch.
      for (let i = 0; i < engines.length; i++) {
        const die = i === DEAD_BELL ? 18.7 : 19.5 + i * 0.35;
        let th = 1 - ease.range(t, die, die + (i === DEAD_BELL ? 0.35 : 1.6));
        if (i === DEAD_BELL) th *= 1 - 0.5 * ease.range(t, die - 0.9, die) * (0.5 + 0.5 * Math.sin(t * 33));
        else th *= 0.86 + 0.14 * Math.sin(t * 11 + i);
        engines[i].throttle = Math.max(0, th);
        engines[i].update(t);
      }
      for (const e of sdEngines) {
        e.throttle = 1 - 0.45 * ease.smooth(ease.range(t, 17, 24));
        e.update(t);
      }

      // --- 4. damage and the tractor beam ---------------------------------
      for (const s of sparks) s.update(t);
      for (const f of fireballs) f.update(t);
      for (const s of smokes) s.update(t);

      const grab = ease.smooth(ease.range(t, T.lock, T.lock + 1.4));
      const gap = Math.max(0.5, hangarPos.y - cvPos.y - cv.halfH * 0.35);
      beam.object.visible = grab > 0.01;
      beam.object.scale.set(1, gap, 1);
      beam.mesh.material.uniforms.uOpacity.value = 0.5 * grab;
      beam.update(t);
      hangar.update(t, grab);

      // --- 5. sky and fire -------------------------------------------------
      stars.update(t);
      planet.update(t);
      bolts.update(t, camera);
      dust.object.position.copy(camera.position);
      dust.update(travelAt(t), airspeedAt(t));
    },
  };
}

/** Which of her bells takes the hit that kills the drive. */
const DEAD_BELL = 5;

// ---------------------------------------------------------------------------
// Measuring whatever model turned up
// ---------------------------------------------------------------------------

/** Bounding-box facts a scene needs, in the model's own space. */
function measure(model) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const mid = box.getCenter(new THREE.Vector3());
  return { box, size, mid, len: size.z, halfW: size.x / 2, halfH: size.y / 2 };
}

/**
 * The bells worth putting a Thruster on, in model space. A CR90 has eleven and
 * a destroyer has seven; each Thruster is two draw calls, so take the main
 * cluster nearest the centreline and leave the trim units dark.
 *
 * `topRowOnly` keeps just the bells level with the highest one, which is how
 * you get the destroyer's three big transom bells instead of its little
 * ventral pair.
 */
function mainEngines(model, m, max = 5, topRowOnly = false) {
  let pts = (model.userData.enginePoints || []).map((p) => new THREE.Vector3().copy(p));
  if (!pts.length) return [new THREE.Vector3(m.mid.x, m.mid.y, m.box.min.z - m.len * 0.02)];
  if (topRowOnly) {
    const top = Math.max(...pts.map((p) => p.y));
    pts = pts.filter((p) => p.y > top - m.size.y * 0.06);
    pts.sort((a, b) => Math.abs(a.x) - Math.abs(b.x));
  } else {
    pts.sort((a, b) => Math.abs(a.x) + Math.abs(a.y) * 0.5 - (Math.abs(b.x) + Math.abs(b.y) * 0.5));
  }
  return pts.slice(0, max);
}

/** Gun muzzles in model space, forward-most first: they have line of sight. */
function gunPoints(model, m, max = 6) {
  const pts = (model.userData.gunPoints || []).map((p) => new THREE.Vector3().copy(p));
  if (!pts.length) {
    for (let i = 0; i < max; i++) {
      pts.push(
        new THREE.Vector3(
          (hash11(i, 5) - 0.5) * m.size.x * 0.7,
          m.box.max.y * 0.5,
          m.box.min.z + m.len * (0.3 + 0.5 * hash11(i, 6))
        )
      );
    }
  }
  pts.sort((a, b) => b.z - a.z);
  return pts.slice(0, max);
}

// ---------------------------------------------------------------------------
// Sky dressing
// ---------------------------------------------------------------------------

/**
 * Dust streaming past the lens: the only honest speed cue available in vacuum.
 * One instanced streak per mote, length driven by the airspeed, recycled
 * analytically out of the distance flown so nothing accumulates.
 */
class SpeedDust {
  constructor({ count = 200, radius = 200, depth = 620, ahead = 430, size = 0.4, color = 0xccdcff } = {}) {
    const g = new THREE.CylinderGeometry(size, size, 1, 4, 1);
    g.rotateX(Math.PI / 2);
    this.mesh = new THREE.InstancedMesh(g, additiveMaterial(color, { opacity: 0.42, side: THREE.FrontSide }), count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.count = count;
    this.depth = depth;
    this.ahead = ahead;
    this.items = [];
    for (let i = 0; i < count; i++) {
      const a = hash11(i, 71) * Math.PI * 2;
      const r = (0.14 + Math.pow(hash11(i, 72), 0.6) * 0.86) * radius;
      this.items.push({ x: Math.cos(a) * r, y: Math.sin(a) * r * 0.68, phase: hash11(i, 73), len: 0.5 + hash11(i, 74) });
    }
    this._d = new THREE.Object3D();
    this.object = this.mesh;
  }
  update(travel, speed) {
    const d = this._d;
    const len = THREE.MathUtils.clamp(speed * 0.055, 0.8, 9);
    for (let i = 0; i < this.count; i++) {
      const it = this.items[i];
      let u = (it.phase + travel / this.depth) % 1;
      if (u < 0) u += 1;
      d.position.set(it.x, it.y, this.ahead - u * this.depth);
      d.scale.set(1, 1, len * it.len);
      d.updateMatrix();
      this.mesh.setMatrixAt(i, d.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.material.opacity = 0.42 * THREE.MathUtils.clamp(speed / AIR, 0.12, 1);
  }
}

/** Tatooine: banded rust and tan, rasterised once at build time. */
function desertTexture() {
  const W = 1024;
  const H = 512;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const img = g.createImageData(W, H);

  // Latitude profile, precomputed so the per-pixel loop stays cheap.
  const N = 2048;
  const lut = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const v = i / N;
    lut[i] = fbm1(v * 15, 4, 5) * 0.72 + fbm1(v * 63, 2, 17) * 0.28;
  }
  const stops = [
    [0.0, 92, 42, 21],
    [0.3, 152, 72, 30],
    [0.52, 200, 110, 44],
    [0.74, 224, 158, 90],
    [1.0, 238, 210, 162],
  ];
  const ramp = (k) => {
    for (let i = 1; i < stops.length; i++) {
      if (k <= stops[i][0] || i === stops.length - 1) {
        const a = stops[i - 1];
        const b = stops[i];
        const u = Math.min(1, Math.max(0, (k - a[0]) / (b[0] - a[0])));
        return [a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u, a[3] + (b[3] - a[3]) * u];
      }
    }
    return [0, 0, 0];
  };

  const TAU = Math.PI * 2;
  for (let y = 0; y < H; y++) {
    const v = y / H;
    const cap = Math.max(0, 1 - Math.min(v, 1 - v) / 0.09);
    for (let x = 0; x < W; x++) {
      const u = x / W;
      const warp =
        0.013 * Math.sin(u * TAU * 3 + v * 7.5) + 0.007 * Math.sin(u * TAU * 8 - v * 21) + 0.004 * Math.sin(u * TAU * 15 + v * 3);
      let k = lut[Math.min(N - 1, Math.max(0, Math.round((v + warp) * N)))];
      k += (hash11(y * W + x, 23) - 0.5) * 0.08;
      k = Math.min(1, Math.max(0, k));
      let [r, gg, bb] = ramp(k);
      if (cap > 0) {
        const s = cap * 0.7;
        r += (228 - r) * s;
        gg += (206 - gg) * s;
        bb += (184 - bb) * s;
      }
      const i = (y * W + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = gg;
      img.data[i + 2] = bb;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);

  // A handful of great basins, so the disc is not only stripes.
  for (let i = 0; i < 22; i++) {
    const x = hash11(i, 31) * W;
    const y = H * (0.15 + hash11(i, 32) * 0.7);
    const r = 26 + Math.pow(hash11(i, 33), 2) * 130;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, hash11(i, 34) > 0.45 ? 'rgba(96,45,24,0.55)' : 'rgba(236,206,158,0.42)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Additive fresnel shell: the lit rim of atmosphere around the planet. */
function atmosphereMaterial(color, sunDir) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uSun: { value: sunDir.clone().normalize() } },
    vertexShader: /* glsl */ `
      varying vec3 vNv; varying vec3 vNw; varying vec3 vP;
      void main() {
        vNv = normalize(normalMatrix * normal);
        vNw = normalize(mat3(modelMatrix) * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vP = mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform vec3 uSun;
      varying vec3 vNv; varying vec3 vNw; varying vec3 vP;
      void main() {
        float fres = pow(1.0 - abs(dot(normalize(vNv), normalize(-vP))), 2.6);
        float lit = pow(clamp(dot(normalize(vNw), uSun) * 0.5 + 0.62, 0.0, 1.0), 1.6);
        gl_FragColor = vec4(uColor * (0.35 + lit * 1.6), fres * lit * 1.15);
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.BackSide,
    toneMapped: false,
  });
}

function buildPlanet(sunDir) {
  const group = new THREE.Group();
  const globe = new THREE.Mesh(
    new THREE.SphereGeometry(PLANET_R, 72, 44),
    new THREE.MeshStandardMaterial({ map: desertTexture(), roughness: 0.96, metalness: 0 })
  );
  globe.rotation.z = 0.16;
  const air = new THREE.Mesh(new THREE.SphereGeometry(PLANET_R * 1.035, 40, 26), atmosphereMaterial(0xff9a4a, sunDir));
  group.add(globe, air);
  group.position.set(...PLANET_POS);
  return {
    group,
    update(t) {
      // They are in orbit, so the deserts turn underneath rather than approach.
      globe.rotation.y = 1.15 + t * 0.03;
      group.position.x = PLANET_POS[0] - t * 4;
    },
  };
}

/**
 * The ventral hangar she is swallowed by: a housing standing proud of the keel,
 * a black mouth inside it, lit runway strips and a spill of light on the
 * plates.
 *
 * The mouth tile is the trick that makes her vanish. It is opaque and spans the
 * whole opening, so from any camera below the keel everything that rises above
 * the belly plane is hidden — by the tile inside the opening and by the hull
 * itself outside it. That is why every shot from T.lock on keeps the lens under
 * the destroyer.
 */
function buildHangar(cv) {
  const W = Math.round(cv.halfW * 2 + 7); // studs across the opening
  const D = Math.round(cv.len * 1.34); // ...and along it, so she fits
  const b = new Bricks({ studSegments: 6 });
  const grey = COLORS.darkBluishGray;
  const pale = COLORS.lightBluishGray;
  const lit = { studs: false, finish: 'glow', emissive: 0xffe3a8, emissiveIntensity: 2.6 };

  // Housing: a shallow box standing 2 studs below the keel, open at the bottom.
  const DROP = -5; // plates below the belly plane
  for (const sx of [-1, 1]) {
    b.box(sx * (W / 2) - (sx > 0 ? 0 : 3), DROP, -D / 2 - 3, 3, D + 6, 9, grey, { studs: false });
    b.box(sx * (W / 2 + 0.6) - (sx > 0 ? 0 : 1.6), DROP - 0.8, -D / 2, 1.6, D, 1.4, pale, { studs: false });
  }
  for (const sz of [-1, 1]) {
    b.box(-W / 2 - 3, DROP, sz * (D / 2) - (sz > 0 ? 0 : 3), W + 6, 3, 9, grey, { studs: false });
  }
  // Door runners: two rows of stubby blocks along the lip, so the opening does
  // not read as a plain rectangle cut in a plate.
  for (const sx of [-1, 1]) {
    for (let z = -D / 2 + 2; z < D / 2 - 2; z += 5) {
      b.box(sx * (W / 2) - (sx > 0 ? 0 : 2.2), DROP - 1.2, z, 2.2, 3, 1.6, grey, { studs: false });
    }
  }
  // The mouth: opaque and almost black, right at the belly plane.
  b.tile(-W / 2, 0.1, -D / 2, W, D, 0x070a0e, { studs: false });
  // Runway strips just below it, and a lit rim around the outside of the lip.
  for (let i = 0; i < 5; i++) {
    b.box(-W / 2 + 2, -0.5, -D / 2 + 3 + (i * (D - 6)) / 4, W - 4, 0.6, 0.5, COLORS.transYellow, lit);
  }
  for (const sx of [-1, 1]) {
    b.box(sx * (W / 2 + 3) - (sx > 0 ? 0 : 0.9), DROP - 0.4, -D / 2 - 3, 0.9, D + 6, 0.9, COLORS.transYellow, lit);
  }

  const group = new THREE.Group();
  group.add(b.build({ castShadow: false, receiveShadow: false }));
  const spill = glowSprite(0xffdca4, W * 1.8, 0.35);
  spill.position.y = -1.2;
  group.add(spill);

  return {
    group,
    width: W,
    update(t, grab) {
      spill.material.opacity = 0.28 + 0.4 * grab + 0.04 * Math.sin(t * 3.1);
      spill.scale.setScalar(W * (1.7 + 0.5 * grab));
    },
  };
}

// ---------------------------------------------------------------------------
// Stand-in hardware
//
// Used only until src/kit/ships-capital.js exists. Same contract as the real
// thing: +z forward, centred on the origin, userData.enginePoints/gunPoints in
// model space.
// ---------------------------------------------------------------------------

/** Cylinder lying along z, centred at (cx studs, cy plates, cz studs). */
function zcyl(b, cx, cy, cz, r, len, color, opts = {}) {
  const h = len * PY;
  return b.cyl(cx, cy - h / 2, cz, r, h, color, { ...opts, rot: [Math.PI / 2, 0, 0] });
}
/** Box centred in x/z, bottom-anchored in y (w, d in studs; h in plates). */
function cbox(b, cx, y, cz, w, d, h, color, opts = {}) {
  return b.box(cx - w / 2, y, cz - d / 2, w, d, h, color, opts);
}
function cpanel(b, cx, y, cz, w, d, h, color, opts = {}) {
  return cbox(b, cx, y, cz, w, d, h, color, { ...opts, studs: false });
}
function lego(x, y, z) {
  return new THREE.Vector3(x * PITCH, y * PLATE, z * PITCH);
}
function glowOpts(color, intensity = 2.2) {
  return { studs: false, finish: 'glow', emissive: color, emissiveIntensity: intensity };
}

/** Rebel blockade runner: hammerhead bridge, long spine, a bank of bells. */
function fallbackCorvette() {
  const b = new Bricks({ studSegments: 8 });
  const hull = COLORS.white;
  const low = COLORS.lightBluishGray;
  const dark = COLORS.darkBluishGray;
  const trim = COLORS.red;
  const enginePoints = [];
  const gunPoints = [];

  // --- spine
  zcyl(b, 0, 0, -6, 3.4, 40, hull, { segments: 16, studs: false });
  zcyl(b, 0, 0, 18, 3.4, 8, hull, { segments: 16, studs: false, rTop: 2.2 });
  cpanel(b, 0, 7.5, -8, 4.4, 34, 1.2, low);
  cpanel(b, 0, -8.7, -8, 4.0, 30, 1.2, low);
  for (const sx of [-1, 1]) {
    cpanel(b, sx * 3.6, -4, -8, 0.8, 30, 9, low);
    cpanel(b, sx * 3.9, -1.5, -6, 0.5, 22, 2.2, trim);
    for (let i = 0; i < 5; i++) cpanel(b, sx * 4.3, -3, -18 + i * 5.5, 0.5, 3.4, 5, dark);
  }

  // --- hammerhead bridge
  cpanel(b, 0, -6, 24, 15, 10, 12, hull);
  cpanel(b, 0, -7.2, 24, 12, 11.4, 1.4, low);
  cpanel(b, 0, 6.2, 24, 11, 9, 1.6, low);
  cpanel(b, 0, -3, 30, 9, 3, 6, low);
  cpanel(b, 0, -1.6, 31.6, 7.4, 0.7, 3.2, dark); // bridge windows
  for (const sx of [-1, 1]) {
    cpanel(b, sx * 6.4, -5, 26.5, 2.4, 5, 2, trim);
    cpanel(b, sx * 7.2, -5, 22, 0.8, 6, 8, low);
  }
  cpanel(b, 0, 8, 8, 1.2, 9, 11, hull); // dorsal fin
  cpanel(b, 0, 12, 9.5, 1.4, 5, 1.2, trim);

  // --- turrets, dorsal and ventral
  for (const sy of [1, -1]) {
    const y = sy > 0 ? 8.5 : -10.5;
    b.cyl(0, y - (sy > 0 ? 0 : 1.6), 12, 1.5, 1.6, low, { segments: 12, studs: false });
    for (const sx of [-1, 1]) zcyl(b, sx * 0.7, y + sy * 1.6, 14.4, 0.28, 4, dark, { segments: 8, studs: false });
    gunPoints.push(lego(0, y + sy * 2, 16.5));
  }

  // --- engine bank
  zcyl(b, 0, 0, -26.5, 4.6, 3, low, { segments: 18, studs: false });
  const bells = [
    [0, 0, 2.0],
    [-4.2, 0, 1.5],
    [4.2, 0, 1.5],
    [-2.3, 5.2, 1.2],
    [2.3, 5.2, 1.2],
    [-2.3, -5.2, 1.2],
    [2.3, -5.2, 1.2],
  ];
  for (const [x, y, r] of bells) {
    zcyl(b, x, y, -29, r * 1.15, 2.6, dark, { segments: 14, studs: false });
    zcyl(b, x, y, -30.4, r, 0.8, KIT.engineBlue, { segments: 12, ...glowOpts(KIT.engineBlue, 2.6) });
    enginePoints.push(lego(x, y, -30.8));
  }

  const model = b.build({ castShadow: false, receiveShadow: false });
  model.userData.enginePoints = enginePoints;
  model.userData.gunPoints = gunPoints;
  return model;
}

/** Imperial destroyer: a stepped grey wedge, a tower aft, three big bells. */
function fallbackDestroyer() {
  const b = new Bricks({ studSegments: 6 });
  const hull = COLORS.lightBluishGray;
  const low = COLORS.darkBluishGray;
  const dark = COLORS.trueBlack;
  const metal = COLORS.flatSilver;
  const enginePoints = [];
  const gunPoints = [];

  const LEN = 260;
  const HALF = 72;
  const TAIL = -LEN / 2;
  const N = 20;

  // --- the wedge, as a stack of plates: the steps are the point
  for (let i = 0; i < N; i++) {
    const u = i / N;
    const z0 = TAIL + u * LEN;
    const d = LEN / N;
    const w = HALF * 2 * (1 - Math.pow(u, 1.02) * 0.955) + 4;
    const h = (14.5 * (1 - Math.pow(u, 0.85) * 0.9) + 1.2) * PY;
    cpanel(b, 0, 0, z0 + d / 2, w, d + 0.2, h * 0.42, i < 14 ? low : hull);
    cpanel(b, 0, h * 0.42, z0 + d / 2, w - 2.6, d + 0.2, h * 0.58, hull);
    if (i % 2 === 0 && i < N - 3) {
      cpanel(b, 0, h, z0 + d / 2, w * 0.34, d * 0.6, 1.2, low);
      for (const sx of [-1, 1]) cpanel(b, sx * w * 0.3, h, z0 + d / 2, w * 0.12, d * 0.5, 0.8, metal);
    }
    // belly panels, so the underside reads in the money shot
    if (i % 2 === 1) {
      cpanel(b, 0, -0.9, z0 + d / 2, w * 0.5, d * 0.66, 1.0, low);
      for (const sx of [-1, 1]) cpanel(b, sx * w * 0.33, -0.7, z0 + d / 2, w * 0.14, d * 0.5, 0.8, metal);
    }
    if (i % 3 === 0) {
      for (const sx of [-1, 1]) {
        cpanel(b, sx * (w / 2 - 0.4), h * 0.42, z0 + d / 2, 0.8, d * 0.3, 0.8, COLORS.transRed, glowOpts(0xff5533, 2.4));
      }
    }
    // turbolaser barbettes along the upper flanks
    if (i > 2 && i < N - 4 && i % 2 === 0) {
      for (const sx of [-1, 1]) {
        const x = sx * (w / 2 - 3.4);
        b.cyl(x, h, z0 + d / 2, 1.9, 1.6, low, { segments: 10, studs: false });
        for (const dx of [-0.7, 0.7]) zcyl(b, x + dx, h + 3, z0 + d / 2 + 2.6, 0.3, 5, dark, { segments: 6, studs: false });
        gunPoints.push(lego(x, h + 3, z0 + d / 2 + 5));
      }
    }
  }

  // --- superstructure: stepped blocks, bridge tower, two shield domes
  const towerZ = TAIL + 22;
  cpanel(b, 0, 36, towerZ + 14, 46, 46, 14, hull);
  cpanel(b, 0, 50, towerZ + 16, 34, 34, 12, hull);
  cpanel(b, 0, 62, towerZ + 17, 22, 22, 10, low);
  cpanel(b, 0, 72, towerZ + 17, 17, 15, 7, hull);
  cpanel(b, 0, 74, towerZ + 24.4, 15, 1.0, 4, dark); // bridge glass
  for (const sx of [-1, 1]) {
    b.cyl(sx * 8.5, 79, towerZ + 15, 3.6, 1.4, low, { segments: 12, studs: false });
    b.sphere(sx * 8.5, 82, towerZ + 15, 3.4, low, { segments: 14, phiLen: Math.PI / 2 });
    cpanel(b, sx * 23.6, 38, towerZ + 14, 1.2, 40, 10, low);
  }
  cpanel(b, 0, 79, towerZ + 3, 6, 8, 12, low); // comms mast
  cpanel(b, 0, 91, towerZ + 3, 1.4, 1.4, 8, metal);

  // --- engines: three big bells and four trim units
  for (const [x, y, r] of [[0, 15, 8.6], [-19, 15, 7.4], [19, 15, 7.4]]) {
    zcyl(b, x, y, TAIL + 3, r * 1.14, 6, low, { segments: 18, studs: false });
    zcyl(b, x, y, TAIL - 0.4, r, 1.4, 0xcfe9ff, { segments: 16, ...glowOpts(0xdff0ff, 2.4) });
    enginePoints.push(lego(x, y, TAIL - 1.2));
  }
  for (const sx of [-1, 1]) {
    for (const dy of [0, 1]) {
      zcyl(b, sx * (30 + dy * 9), 12 + dy * 8, TAIL + 3, 3.4, 5, low, { segments: 12, studs: false });
      zcyl(b, sx * (30 + dy * 9), 12 + dy * 8, TAIL - 0.2, 2.9, 1.0, 0xcfe9ff, { segments: 10, ...glowOpts(0xdff0ff, 2.2) });
    }
  }
  cpanel(b, 0, 0, TAIL + 1.2, HALF * 2 - 2, 2.4, 34, low); // stern wall

  const model = b.build({ castShadow: false, receiveShadow: false });
  model.userData.enginePoints = enginePoints;
  model.userData.gunPoints = gunPoints;
  return model;
}
