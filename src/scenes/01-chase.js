/**
 * Scene 1 — The Chase.
 *
 * Seven shots, cut the way the source material opens:
 *
 *    0.00 –  8.15  she rips past the lens and runs for Tatooine
 *    8.20 – 14.10  THE SHOT: his prow slides into the top of frame and keeps
 *                  coming while the camera cranes up after it
 *   14.15 – 17.40  cut: hard under his keel, looking up and forward — nothing
 *                  in frame but belly plate widening overhead
 *   17.45 – 21.20  cut: medium on her flank as the turbolasers land
 *   21.25 – 25.30  she yaws off her heading with a bell out and smoking
 *   25.40 – 30.20  cut: wide from below, the beam reaching down out of the bay
 *   30.25 –  END   cut: in on the hangar mouth as it swallows her
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

/**
 * Height of the destroyer's keel above her flight axis. Chosen, not guessed:
 * the money shot only works if the lowest point of his hull sits a few degrees
 * above her in the frame, and that angle is BELLY / (distance to his bow).
 */
const BELLY = 22;
/**
 * Where the ventral bay sits, in lengths aft of the bow. Not a free parameter:
 * the model has a ventral recess of its own at about 0.88 lengths aft, and its
 * ceiling is emissive at 1.4 — put the lens under that and it flares into a
 * white hole three times the size of anything this scene builds. So the bay goes
 * far enough forward that every shot which needs it can also keep that recess
 * behind the lens, and no further forward than the point where the wedge's
 * lowest courses run out from under it.
 */
const HANGAR_AT = 0.665;
/** Airspeed at full throttle, world units per second. */
const AIR = 150;
const PLANET_R = 1550;
const PLANET_POS = [-120, -1750, 1900];

/** Beat clock. Narration starts at 1.60, 8.19 and 17.48 (see ctx.lines). */
const T = {
  pass: 1.7, // she overtakes the lens
  shadow: 8.2, // the locked-off plate the prow will come into
  under: 14.15, // cut: wide and low, right beneath him
  hits: 17.45, // cut + the turbolasers land
  slew: 21.25, // cut: she is off her heading and smoking
  lock: 25.4, // cut: the tractor beam takes hold
  lift: 26.4, // she starts to rise
  throat: 30.25, // cut: in tight on the hangar mouth
};

/**
 * The destroyer's nose, in multiples of his own length so the choreography
 * survives a model that is not exactly 260 studs long.
 *
 * Two hard constraints shape this track, and they pull against each other:
 *
 *  - Through shot 2 his stern must stay BEHIND the lens. The moment it passes,
 *    the shot becomes his transom and three engine bells coming at you, which is
 *    a ship leaving, not a ship arriving. So zN < camera.z + length until 14.1.
 *  - By shot 6 his ventral bay has to be directly over her, and the bay can only
 *    live on the part of the keel that actually exists (see buildHangar), about
 *    0.67 lengths aft of the bow. So zN ≈ 0.67 lengths at 25.4.
 *
 * Between those two he therefore has to cover most of his own length, which is
 * the overtake, and it lands in shots 3–5 where the lens is under him and the
 * hull sliding overhead is the whole point. Every change of speed sits ON a cut:
 * a kink here is a kink in the descent of a hull edge across the frame, and the
 * only frame you can hide one in is the frame after a cut.
 */
const SD_NOSE = [
  [0, -1.1],
  [T.under, -0.075], // 19 units a second, dead straight, all through shot 2
  [T.hits, 0.32], // the overtake, under his keel
  [T.slew, 0.5],
  [T.lock, HANGAR_AT], // bay over her
  [T.throat, HANGAR_AT + 0.035],
  [40, HANGAR_AT + 0.05],
];

function sdNoseZ(t, len) {
  return ease.track(SD_NOSE, t, LIN) * len;
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
  // ...and she loses station, sinking away below his keel. This is not dressing:
  // his bay hangs thirteen units under a keel that is only twenty-two above her,
  // so without the sink the bay mouth is already level with her spine when the
  // field takes hold and there is no lift left to photograph.
  const sink = -13 * ease.smooth(ease.range(t, 18.8, 24.8));
  return {
    x: Math.sin(t * 0.41) * 0.6 + off * 3.4,
    y: Math.sin(t * 0.67 + 1.2) * 0.5 * buffet + sink,
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
  // The space preset's 3.1 is set for grey hulls. She is white — albedo 0.93 —
  // and at bloom threshold 0.6 the sun is what decides whether her spine reads
  // as bricks or as one bloomed blob. The sun's strongest component points aft,
  // and shot 1 looks at her from aft, so every greeble on her spine deck shows
  // the lens the face that is taking the full 0.78 of it: at 2.1 the tallest of
  // them went to white and took a third of the frame's contrast with it.
  lights.key.intensity = 1.62;
  // Planetshine: a warm bounce off fifteen hundred units of orange desert.
  // Kept weak — at any real strength it turns a grey destroyer into a rusty one.
  // Raking, not straight up. Pointed almost vertically it lands the same value
  // on every square unit of a 260-stud belly, and the money shot was a flat
  // lavender ceiling with boxes stuck to it: nothing on that hull is doing any
  // modelling if every face pointing down gets the same photon count. Tipped
  // thirty degrees forward it separates the forward face of every transverse
  // frame from its aft face, which is what turns the keel into ribs.
  lights.fill.color.setHex(0xffc79c);
  lights.fill.position.set(-0.26, -0.86, -0.44).multiplyScalar(400);
  lights.fill.intensity = 0.58;
  lights.rim.position.set(0.7, 0.2, 0.66).multiplyScalar(400);
  lights.rim.intensity = 0.95;
  // The space preset's ground bounce is almost black, which leaves the whole
  // underside of the destroyer unreadable — and the warm fill on its own turns
  // that underside rust-orange. A cold slate ground bounce, strong enough to
  // dominate the warm one, is what keeps a grey ship grey.
  lights.hemi.groundColor.setHex(0x84868c);
  // Carries what came off the key: a hemisphere cannot blow a face out on its
  // own, because no normal ever gets more than 1.0 of it. Wound back from 1.2,
  // though, because a hemisphere is the one light in here that CANNOT model
  // anything — every face with the same normal takes the same value from it,
  // whatever its neighbours are doing — and at 1.2 it was most of what the
  // destroyer's underside was lit by.
  lights.hemi.intensity = 0.82;
  // Cold sidelights, one per beam, so both his flanks separate from the sky in
  // the money shot. One is not enough: with only a starboard light the port
  // flank is pure black, and in a shot that is nothing but hull that reads as a
  // hole in the ship rather than as a ship.
  for (const [x, i] of [
    [0.85, 0.6],
    [-0.8, 0.42],
  ]) {
    const flank = new THREE.DirectionalLight(0x9fbde8, i);
    flank.position.set(x, -0.3, 0.42).multiplyScalar(400);
    scene.add(flank);
  }
  // A hard cold rake from below and AHEAD, for the keel alone. Every other lamp
  // in here either comes from above (the sun, the rim) or points straight up (the
  // planetshine, the hemisphere), and shot 3 is nine seconds of nothing but the
  // underside of the hull: this is the only light in the scene whose direction the
  // frames, strakes and spine can throw a shadow line along. It is nearly white
  // and it is aimed forward, so the two ends of every rib read differently.
  const keelRake = new THREE.DirectionalLight(0xd6e2f0, 0.85);
  keelRake.position.set(0.22, -0.52, -0.82).multiplyScalar(400);
  scene.add(keelRake);

  // -------------------------------------------------------------------- sky
  scene.add(nebulaBackdrop({ radius: 3900, colorA: 0x1c2647, colorB: 0x3a1a2c, density: 0.5 }));
  const stars = new Starfield({ count: 2100, radius: 3000, seed: 19, sizeMin: 5, sizeMax: 26 });
  scene.add(stars.object);

  const dust = new SpeedDust({ count: 160, radius: 210, depth: 640, ahead: 450, size: 0.3 });
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
  // She is white plate lit by one hard sun and, in the last beat, by lamps a few
  // units off her spine. At the kit's default 0.42 roughness that geometry throws
  // specular lobes well over the 0.6 bloom threshold and she arrives with a hole
  // burnt in her — first on the bridge as she passes the lens, then again inside
  // the bay. Cloned, not mutated: the materials come out of the shared palette
  // cache and other scenes are rendering off them in other tabs.
  soften(corvette, 0.6, 0.35);

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

  /** Distance from his bow back to the bay, in world units. */
  const HANGAR_BACK = sd.len * HANGAR_AT;
  /**
   * How high she ends up: high enough that she is inside the throat with only
   * her keel below the lip, low enough that she is still there to be seen on the
   * last frame. Her spine ends a shade under the bay roof, which is the opaque
   * occluder, so anything above it is simply gone.
   */
  const LIFT_TOP = BELLY - cv.halfH + 0.8;
  /** World y of the bay mouth — where the tractor beam comes out. */
  const MOUTH_Y = BELLY - BAY_DEEP * PLATE;

  // ------------------------------------------------------------- her engines
  const engines = mainEngines(corvette, cv, 7).map((p, i) =>
    thruster({
      color: KIT.engineBlue,
      radius: cv.len * (i === 0 ? 0.036 : 0.023),
      // Short cones. These are additive and there are seven of them within a
      // ten-unit circle, so their length is really a brightness control: at
      // 0.4 of her length, seen from anywhere near astern, they overlap into a
      // single white plume that eats the star field behind her.
      length: cv.len * 0.29,
      position: p,
      halo: 1.25, // one tight core per bell, not seven overlapping suns
      haloColor: 0x2c5a86,
    })
  );
  for (const e of engines) corvette.add(e.object);

  // ...and his: the three great bells across the transom, throttled back once
  // he has her. Only the top row, or the pick lands on the trim units.
  const sdEngines = mainEngines(destroyer, sd, 3, true).map((p) =>
    thruster({
      color: 0xcfeaff,
      radius: sd.len * 0.032,
      length: sd.len * 0.26,
      position: p,
      halo: 2.0,
      haloColor: 0x2f5a80,
    })
  );
  for (const e of sdEngines) destroyer.add(e.object);

  // ------------------------------------------------------------- the hangar
  const hangar = buildHangar(cv);
  hangar.group.position.set(0, BELLY, -HANGAR_BACK);
  destroyerRig.add(hangar.group);
  // ...and shut the model's own bay, which is a blowout waiting to happen.
  if (capital?.buildStarDestroyer) destroyer.add(buildRecessDoors());
  // Skin, frames and strakes on his belly: shot 3 is nothing but that belly, and
  // a hull with no lines running down it has no length. The bay's own footprint
  // is fenced off — the housing hangs below the keel plane there, and skin
  // across it would be a floor in the mouth the corvette is lifted through.
  destroyer.add(
    buildKeelStructure(sd, destroyer, {
      z: (sd.box.max.z - HANGAR_BACK) / PITCH,
      halfD: hangar.depth / 2 + 4,
      halfW: hangar.width / 2 + 6,
    })
  );

  // The tractor field. fx.Beam is an additive cone with a ring pattern baked in
  // at 40 cycles over its length: keep it narrow and faint or from anywhere
  // inside about 60 units it stops being a shaft of light and becomes a striped
  // plastic tube. Every shot it appears in is framed from at least 50 units out.
  // fx.Beam is brightest at its radiusBottom end and fades toward radiusTop, so
  // the narrow end goes at the mouth and the wide, dissolving end reaches down
  // to her: a searchlight spreading out of the bay rather than a solid funnel.
  const beam = new Beam({
    color: 0x8fd6ff,
    radiusTop: cv.halfW * 1.5,
    radiusBottom: cv.halfW * 0.55,
    height: 1,
    opacity: 0.5,
  });
  beam.object.rotation.x = Math.PI; // local +y now runs downward, out of the bay
  beam.object.position.set(0, MOUTH_Y + 0.6, -HANGAR_BACK);
  destroyerRig.add(beam.object);
  // ...and a soft cold flare where the field has hold of her, so the shaft is
  // seen to be doing something to her rather than merely pointing at her.
  const gripGlow = glowSprite(0x7fc8ff, cv.len * 0.34, 0);
  corvetteRig.add(gripGlow);

  // A warm practical inside the bay. Her hull is white and the last shot looks
  // up at her belly, which no sun in this scene reaches; without this she goes
  // into the throat as a black cutout.
  // Range matters more than brightness: at 150 units it reaches most of the
  // belly and washes the money shot gold six seconds before the bay is in play.
  // Two of them, a third of the bay apart, rather than one in the middle. A
  // single point source that close to a hull of flat plate throws one specular
  // lobe, and on white ABS under a 0.6 bloom threshold that lobe is a hole burnt
  // in her bridge deck — it was the brightest thing in every frame of the last
  // beat, sat forward of the lamp where the reflection angle happened to line up,
  // and drew the eye off the beam and the mouth entirely. Split and halved, the
  // two lobes land in different places and neither one clips.
  const bayLamps = [-0.3, 0.3].map((f) => {
    const l = new THREE.PointLight(0xffb877, 0, 90, 1.7);
    l.position.set(0, BELLY - 3, -HANGAR_BACK + f * hangar.depth);
    destroyerRig.add(l);
    return l;
  });

  // ------------------------------------------------------------------- fire
  // fx.BoltPool sizes its halo at nine times `width` and scales it to the bolt's
  // full length, so at 0.6 a nineteen-unit turbolaser bolt drags a five-by-nineteen
  // additive plane behind it. A hundred units from the lens that is a green wash
  // over a quarter of the frame with a white hole in the middle of it, which is
  // what the ranging shots before the reveal looked like. Long and thin instead.
  const bolts = new BoltPool({ color: KIT.laserGreen, length: cv.len * 0.32, width: 0.38, max: 48, glow: 0.8 });
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
  // Fireball radius is deliberately small: its flare sprite grows to five times
  // this, so anything above about 0.05 of her length puts a white disc across the
  // whole ship once bloom has had it.
  const HITS = [
    { t: T.hits + 0.15, at: [cv.halfW * 0.9, 1.6, -cv.len * 0.18], gun: 0, r: cv.len * 0.032 },
    { t: 18.6, at: [-cv.halfW * 0.85, -1.2, cv.len * 0.06], gun: 2, r: cv.len * 0.024 },
    { t: 19.9, at: [cv.halfW * 0.8, 2.4, -cv.len * 0.34], gun: 4, r: cv.len * 0.03 },
    { t: 21.6, at: [-cv.halfW * 0.7, 1.0, -cv.len * 0.3], gun: 1, r: 0 },
  ];
  const fireballs = [];
  const sparks = [];
  for (let i = 0; i < HITS.length; i++) {
    const h = HITS[i];
    bolts.add({ t0: h.t - 0.42, from: gunAt(h.gun, h.t - 0.42), to: onHull(h.at, h.t), speed: 470 });
    // Short and fast. A long life in zero gravity leaves the sparks drifting
    // across half the frame as a slow field of orange dots, which reads as
    // confetti rather than as hot metal coming off a hull.
    const sp = new Sparks({
      count: 80,
      t0: h.t,
      life: 0.85,
      speed: cv.len * 0.55,
      gravity: 0, // vacuum
      color: 0xffd27a,
      size: 0.4,
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
  // The first bank is short: on an eight-second life at this rise its oldest puff
  // is twenty-five units aft of the bell by 26s, which in the tractor-beam shot is
  // a lone grey smudge off in empty space with nothing between it and the ship.
  const smokes = [[18.7, 6.5], [23.4, 10.6]].map(([t0, life]) => {
    const sm = new Smoke({
      // Fourteen small puffs rather than eleven large ones. At a sprite size of
      // 0.085 of her length, eleven of them scattered over a plume half her length
      // long are eleven separate grey smudges with black between them, and in the
      // tractor-beam shot they read as blurred rectangles floating beside the ship
      // rather than as anything coming out of it.
      count: 14,
      t0,
      life,
      origin: [0, 0, 0],
      // fx.Smoke reads `rise` as a SPEED, not as a total travel: a puff ends up
      // rise * life * up-to-1.6 units from where it was shed. At a third of her
      // length that is three hundred units, so every puff was off frame within
      // half a second of appearing and the trail was invisible in every shot it
      // was meant to be in. Two and a half leaves a plume about half her length.
      rise: 1.55,
      spread: 2.8,
      size: cv.len * 0.052,
      // Pale, not dark: in vacuum against black sky a dark grey puff is invisible,
      // and what light there is here is sunlit dust.
      color: 0x9c958c,
      // fx.Smoke is a clutch of soft radial sprites that all sit inside `spread`
      // of each other, so their alpha ACCUMULATES: eight puffs at 0.55 each
      // compose to very nearly opaque, and a 7-unit sprite with a bright core
      // then reads as a cotton ball rather than as smoke. Small, many, and faint
      // enough that four of them stacked are still translucent.
      opacity: 0.27,
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
  ctx.sfx(20.4, 'blast_door_open', { gain: 0.6, rate: 0.55 }); // his bay opening
  ctx.sfx(T.lock - 0.4, 'whoosh_transition', { gain: 0.5, rate: 0.7 });
  ctx.sfx(T.lift + 0.4, 'engine_rumble', { gain: 0.45, rate: 0.7 });

  // ----------------------------------------------------------------- camera
  // Seven shots. The cuts are 0.05s steps in the tracks, i.e. hard cuts at
  // 24fps, and every key here is on a shot boundary or inside one shot.
  //
  // Shot 2 (8.2 – 14.1) is the one that matters, and it is pure geometry. The
  // lens sits low and locked 268 out behind her, so she subtends about 2.5° — a
  // speck. His stern is still just behind the lens, so what fills the top of
  // frame is his underside receding away forward, and its lowest point is his
  // bow, at atan(BELLY - camera.y over the distance to it). That falls from
  // about 13.5° as the prow crosses into frame at 8.9s to 8° by 14.1s while the
  // lens cranes up 13° and opens from 34° to 46°. Grey hull therefore floods
  // down from the top until it holds two thirds of the frame and she is left in
  // the last sliver of sky at the bottom. Retiming any one of these three tracks
  // without the other two will break the shot.
  //
  // The look targets during shot 2 are deliberately only ~100 units ahead of the
  // lens: at 270 units out a target has to move 60 units to tilt the camera one
  // degree, and that is not a track anyone can read.
  const CAM = {
    pos: [
      [0, [22, 16, 90]],
      [1.0, [20, 15, 34]],
      // Far enough off her stern that she reads as a whole ship going away. Any
      // closer and the frame is one bloomed greeble and a wall of white plate;
      // at seventy units her sixty of length sits inside the frame whole, and
      // the speed comes off the star streaks and the planet limb instead. Held
      // well off her centreline too: eleven exhaust cones seen end-on stack into
      // one additive wash that takes a third of the frame with it.
      [T.pass, [26, 14.5, -54]],
      [2.6, [24, 11.5, -98]],
      [5.4, [16.4, 7.6, -190]],
      [T.shadow, [15.5, 5.2, -268]],
      [10.0, [15.5, 5.2, -269]],
      [12.0, [15.4, 5.2, -270]],
      [14.1, [15.3, 5.2, -271]],
      // Shot 3 is the payoff, and it is one number that makes or breaks it: how
      // far the lens sits below his keel. Looking forward from 28 units down —
      // where this shot used to be — his wedge converges to a bow four hundred
      // units away and half the frame is sky either side of it. Tucked up to 9
      // units under the same keel, the flanks at the station overhead subtend
      // sixty degrees each and the hull runs off both edges of the frame.
      [T.under, [7, 12.5, -152]], // cut: right up under his keel
      [17.4, [3, 14, -136]],
      // Cut: in on her flank as the shots land. Sat off her AFTER-body rather
      // than amidships, because everything this beat is about is back there —
      // the four impacts, the bell that dies, and the smoke coming off it. From
      // abeam her waist her transom is a foot outside the right edge of frame
      // and the narration talks about engines the audience cannot see.
      [T.hits, [42, 12, -40]],
      [21.2, [35, 6, -30]],
      [T.slew, [48, -1, -50]], // cut: wider, she is slewing and sinking
      [25.3, [43, -8, -38]],
      // Shots 6 and 7 photograph two things that want opposite lenses, which is
      // why they are two shots.
      //
      // Shot 6 is the SHAFT. The field is a vertical cone, so it reads in inverse
      // proportion to how much of its own axis the lens is looking down: from a
      // steep angle underneath it collapses into concentric ellipses lying on her
      // hull — a bullseye, not a beam. Kept at 21° above the mouth plane the
      // sight line is 69° off the axis and it is a shaft again.
      //
      // Shot 7 is the HOLE, and a hole in a horizontal plane reads in proportion
      // to that same angle: at 21° a 37-by-69 aperture squashes to a slot two
      // units tall, indistinguishable from the shadow line under the housing. At
      // 42° it is a readable rectangle with the lit throat inside it. By the time
      // this shot cuts in she is at the mouth plane and the field has already
      // faded out (see `shaft`), so nothing is left for the angle to spoil.
      //
      // The lens can go this far down because the mouth plane is horizontal: any
      // ray that reaches the opening from underneath crosses that plane exactly
      // at the opening, so the housing's own side walls — which live above it —
      // can never get in the way, however far outboard the camera sits.
      [T.lock, [56, -20, -52]], // cut: wide and low, side-on to the shaft
      [30.2, [46, -18, -40]],
      [T.throat, [26, -30, -28]], // cut: down under the mouth, looking up it
      // Shot 7 sinks away from her rather than pushing in. Pushing in was the
      // instinct and it was wrong: by the last frame she was sixty units of ship
      // across a frame showing her waist and nothing either side of it, and the
      // closing image has to be READ as a ship going into a hole, which needs the
      // whole hole in shot with her. Dropping instead holds her the same size,
      // opens the aperture up from 42° to 49°, and lets more of the belly in.
      [32.2, [28, -37, -23]],
      [END, [30, -42, -18]],
    ],
    look: [
      [0, [12, 7, 440]],
      [1.0, [8, 5, 260]],
      // Aimed at her waist rather than off her bow, or she hangs in the bottom
      // corner with her drive cropped off the edge.
      [T.pass, [0, 2.2, 14]],
      [2.6, [0, 1.2, 8]],
      [5.4, [0, 0.9, 6]],
      [T.shadow, [0, 3, -168]],
      [10.0, [0, 12, -169]],
      [12.0, [0, 24, -170]],
      [14.1, [0, 27, -171]],
      // Shot 3 is a tilt, and it goes the opposite way to instinct: UP. It opens
      // at 14° — steep enough that his belly holds the top three quarters of the
      // frame, with her still a speck in the sliver of sky underneath — and
      // cranes to 20°, which puts the keel's vanishing line one frame-tenth off
      // the bottom edge. That last tenth is not a compromise: aimed any higher
      // the frame is a uniform grey ceiling with no horizon, no sky and no ship
      // in it to be dwarfed, and a mile of hull stops meaning anything.
      [T.under, [0, 26, -96]],
      [17.4, [0, 24.5, -108]],
      [T.hits, [0, 5, -18]],
      [21.2, [0, 1, -20]],
      [T.slew, [0, 3, -6]],
      [25.3, [0, -5, -2]],
      // Aimed between her and the mouth, so the shaft of the field runs up the
      // middle of the frame with the belly above it and her below.
      [T.lock, [0, -4, -16]],
      [30.2, [0, 0, -12]],
      [T.throat, [0, 6, -8]],
      [32.2, [0, 9, 1]],
      [END, [0, 8, 6]],
    ],
    fov: [
      [0, 46],
      [1.0, 46],
      [T.pass, 52],
      [2.6, 44],
      [5.4, 36],
      [T.shadow, 34],
      [10.0, 36],
      [12.0, 41],
      [14.1, 46],
      [T.under, 54],
      [17.4, 50],
      [T.hits, 42],
      [21.2, 40],
      [T.slew, 40],
      [T.lock, 48],
      [30.2, 46],
      [T.throat, 50],
      [32.2, 48],
      [END, 47],
    ],
    // A degree and a half of roll through shot 3. Under a hull with no visible
    // edge in frame the only cue that anything is moving is the greebles
    // crossing, and that reads as a moving ceiling; a slow list makes it read as
    // a ship going over the top of you.
    roll: [
      [T.under, -0.026],
      [17.4, 0.03],
      [T.hits, 0],
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
      // losing her yaw as the field straightens her. Most of the rise happens in
      // shot 6 and the last fifth creeps on through shot 7, so the final frame
      // still has her moving.
      const align = ease.smooth(ease.range(t, T.lock, 29.2));
      // Two thirds of the rise happens in shot 6 so the beam has something to be
      // doing, and the last third creeps on through shot 7 so the closing frames
      // are still her going in rather than a held tableau.
      const lift = 0.68 * ease.smooth(ease.range(t, T.lift, 30.2)) + 0.32 * ease.smooth(ease.range(t, 30.25, 33.6));
      cvPos.set(
        ease.lerp(c.x, hangarPos.x, align),
        ease.lerp(c.y, LIFT_TOP, lift),
        ease.lerp(c.z, hangarPos.z, align)
      );
      corvetteRig.position.copy(cvPos);
      corvetteRig.rotation.set(c.pitch * (1 - align * 0.8), c.yaw, c.roll * (1 - align * 0.7));

      // --- 3. engines ------------------------------------------------------
      // One bell dies first and hard, then the rest gutter out behind it, and
      // that is all: they stay dead.
      //
      // Timed to the line, not to the hits. "Her engines went dark" lands at
      // about 19.5, and on the old schedule the bank was still at four fifths of
      // full at 20 — a ship blazing away under a narrator saying it had stopped,
      // with the plume the brightest thing in the frame at the moment the shot
      // wanted the hull. They start dying with the second hit and are out by 20.4.
      //
      // The extra squeeze on the cone matters as much as the timing. fx.Thruster
      // scales the flame linearly with throttle and fades it at 0.55 alpha, so a
      // bell held at two thirds is a hard-edged translucent teal triangle a third
      // of her length long sticking out of her transom — three of them were the
      // worst thing in the frame at 20s, and they read as cellophane, not fire.
      // Squaring it collapses the flame back into the bell while the halo fades,
      // and the bell goes dark instead of going glassy.
      for (let i = 0; i < engines.length; i++) {
        const die = i === DEAD_BELL ? 18.75 : 19.0 + i * 0.12;
        const out = i === DEAD_BELL ? 0.3 : 0.85;
        let th = 1 - ease.range(t, die, die + out);
        if (i === DEAD_BELL) th *= 1 - 0.5 * ease.range(t, die - 0.9, die) * (0.5 + 0.5 * Math.sin(t * 33));
        else th *= 0.86 + 0.14 * Math.sin(t * 11 + i);
        th = Math.max(0, th);
        engines[i].throttle = th;
        engines[i].update(t);
        engines[i].cone.scale.z *= th * th;
        // ...and hold the halo up while the flame collapses into it, so the last
        // thing left of a bell is a glow rather than a shape with edges.
        engines[i].sprite.material.opacity = 0.95 * Math.min(1, th * 3);
      }
      for (const e of sdEngines) {
        e.throttle = 1 - 0.45 * ease.smooth(ease.range(t, 17, 24));
        e.update(t);
      }

      // --- 4. damage and the tractor beam ---------------------------------
      for (const s of sparks) s.update(t);
      for (const f of fireballs) f.update(t);
      for (const s of smokes) s.update(t);

      // Up in eight tenths of a second, not one and a half. The cut to shot 6 is
      // at T.lock and the beat it opens is the beam taking hold of her, so half a
      // second later the shaft has to be a shaft: on the slower ramp the frame at
      // 26s — the first one anybody sees of it — had it at a third of its opacity,
      // which on a field this faint is nothing at all, and she hung under an open
      // hangar with no visible reason to be rising.
      const grab = ease.smooth(ease.range(t, T.lock, T.lock + 0.8));
      // A cone squashed to nothing and seen close to end-on stops being a shaft
      // and becomes a bullseye of concentric rings sitting on the hull, so the
      // beam is faded out as the mouth closes on her and then switched off.
      const gap = hangarPos.y + hangar.mouth - cvPos.y - cv.halfH * 0.3;
      const shaft = grab * ease.smooth(ease.range(gap, 4, 12));
      beam.object.visible = shaft > 0.02;
      // The cone's radii have to come in with its height. Left at full width it
      // goes from a shaft twenty-two units tall to a thirteen-unit-tall dome
      // eighteen across — a glass blister sitting on her bow, which is what the
      // frame at 28s was. Scaled together it stays a cone all the way in.
      const taper = Math.min(1.05, Math.max(0.4, gap / 20));
      beam.object.scale.set(taper, Math.max(0.5, gap * 1.06), taper);
      beam.mesh.material.uniforms.uOpacity.value = 0.5 * shaft;
      beam.update(t);
      gripGlow.material.opacity = 0.34 * grab * (0.82 + 0.18 * Math.sin(t * 5.3));
      gripGlow.visible = grab > 0.02;
      // ...and backed off again as she rises into it. The lamp is three units
      // under the bay roof and she is white ABS: at a fixed 1500 the near side of
      // her bridge deck goes to paper the moment she is inside the throat, which
      // is the one frame the whole last beat is built to arrive at.
      // Backed off once she is inside, and further as the leaves come across: she
      // goes dark in the throat rather than sitting in it brightly lit, which is
      // the difference between a ship parked in a bay and a ship swallowed.
      const bay =
        620 *
        ease.smooth(ease.range(t, T.slew + 1.4, T.lock + 1)) *
        (1 - 0.4 * ease.smooth(ease.range(t, 28.4, 31.5))) *
        (1 - 0.45 * ease.smooth(ease.range(t, 31.5, 33.8)));
      for (const l of bayLamps) l.intensity = bay;
      hangar.update(t, grab);

      // --- 5. sky and fire -------------------------------------------------
      stars.update(t);
      planet.update(t);
      bolts.update(t, camera);
      // Once there is hull behind them the streaks stop reading as speed and
      // start reading as scratches on the print, so take them all the way out.
      dust.object.position.copy(camera.position);
      dust.update(travelAt(t), airspeedAt(t), 1 - ease.smooth(ease.range(t, 13.4, 16.4)));
    },
  };
}

/** Which of her bells takes the hit that kills the drive. */
const DEAD_BELL = 5;

/**
 * A Thruster with its halo brought under control.
 *
 * fx.Thruster sizes its sprite at 4.5x the cone radius and drives it at 0.95
 * opacity, which is right for a single fighter exhaust and catastrophic for a
 * bank of eleven: the halos overlap into one white ball the size of the ship and
 * bloom eats the hull. `base.radius` is only read when scaling the sprite, so
 * shrinking it afterwards decouples the halo from the flame, and a dimmer sprite
 * colour pulls the whole thing back under the bloom threshold.
 */
function thruster({ color, radius, length, position, halo = 2, haloColor = 0x335f88 }) {
  const th = new Thruster({ color, radius, length, position: [position.x, position.y, position.z], dir: [0, 0, 1] });
  th.base.radius = (radius * halo) / 4.5;
  th.sprite.material.color.setHex(haloColor);
  return th;
}

/**
 * Widen the specular lobe on a model built from someone else's kit.
 *
 * Materials arrive from the shared palette cache, so every one of them is cloned
 * before it is touched — mutating in place would reach into every other scene
 * the offline renderer has open. Clones are shared per source material, so a
 * merged hull still draws in one call.
 */
function soften(root, roughness, metalness) {
  const swapped = new Map();
  const swap = (m) => {
    let c = swapped.get(m);
    if (!c) {
      c = m.clone();
      if (c.roughness !== undefined) c.roughness = Math.max(c.roughness, roughness);
      if (c.metalness !== undefined) c.metalness = Math.min(c.metalness, metalness);
      swapped.set(m, c);
    }
    return c;
  };
  root.traverse((o) => {
    if (!o.material) return;
    o.material = Array.isArray(o.material) ? o.material.map(swap) : swap(o.material);
  });
}

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
  update(travel, speed, gain = 1) {
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
    this.mesh.material.opacity = 0.2 * gain * THREE.MathUtils.clamp(speed / AIR, 0.12, 1);
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
 * How far the bay hangs below the keel, in plates. She is about 13 units from
 * keel to spine, so a 12.8-unit throat takes all but a fifth of her.
 */
const BAY_DEEP = 32;

/**
 * Measure the underside of a model built by `Bricks`.
 *
 * `Bricks.build()` leaves `userData.parts` on the model — the centre, size and
 * orientation of every element it merged — so the shape of the belly can be
 * READ rather than guessed at. That matters because the destroyer's belly is
 * not the flat bottom of a box: ships-capital.js stacks the wedge out of eight
 * slabs, each one stopping further forward than the one below it, so the
 * underside is a staircase that climbs toward the bow and runs out from under
 * the forward third of the ship entirely.
 *
 * Returns `probe(x, z) -> y | null` in model units: the lowest bottom face
 * among the axis-aligned elements whose footprint covers that station, or null
 * where the model has no hull there at all.
 */
function bellyProbe(model) {
  const parts = model.userData?.parts;
  if (!parts?.length) return null;
  const boxes = [];
  for (const p of parts) {
    // Rotated elements — turret barrels, domes, engine bells — have no useful
    // axis-aligned footprint. The belly is all slab work, so skipping them
    // costs nothing and keeps the footprint test honest.
    if (Math.abs(p.quaternion.w) < 0.999) continue;
    const bottom = p.position.y - p.size.y / 2;
    if (bottom > 0) continue; // upper works: never the underside
    boxes.push({
      x: p.position.x,
      z: p.position.z,
      hx: p.size.x / 2 - 0.02,
      hz: p.size.z / 2 - 0.02,
      y: bottom,
    });
  }
  if (!boxes.length) return null;
  return (x, z) => {
    let y = null;
    for (const b of boxes) {
      if (Math.abs(x - b.x) > b.hx || Math.abs(z - b.z) > b.hz) continue;
      if (y === null || b.y < y) y = b.y;
    }
    return y;
  };
}

/**
 * The destroyer's underside: a continuous ventral skin, and the frames, strakes
 * and keel spine that give it lines.
 *
 * TWO PROBLEMS, ONE PIECE OF GEOMETRY.
 *
 * The first is composition. Shot 3 sits nine units under his keel and looks
 * forward along it, and at that grazing an angle a hull needs LINES. What the
 * kit gives the underside is a field of scattered greeble blocks on one
 * unbroken plate — individually convincing, but with nothing running
 * fore-and-aft there is no vanishing point anywhere in frame and no regular
 * spacing to read a length off, so a mile of ship photographs as a flat grey
 * ceiling with boxes glued to it. Frames at a fixed pitch and strakes that
 * follow the plan taper give the eye both at once: a ladder that compresses
 * toward the bow, and lines that converge on it.
 *
 * The second is that the kit's belly has nothing under most of it. The wedge is
 * eight stacked slabs, each stopping further forward than the one below, so the
 * underside is a staircase that climbs toward the bow — but the ventral greeble
 * field is laid at ONE height, the keel, from the transom to sixty studs past
 * amidships. Forward of the lowest slab's apex those ninety blocks have no hull
 * above them at all, and from under the keel they are a necklace of bricks
 * floating in open space outside the ship's silhouette. That is another agent's
 * file and this scene may not touch it.
 *
 * So the skin: a measured plate, laid one plate below the LOWEST thing the model
 * has at each station, spanning the full width of the belly there. Where the
 * hull is solid it lies flush against it and does nothing. Where the kit's
 * blocks hang into space it passes underneath them and they become greebles on
 * a surface again — which is what they were meant to be. Its outboard edge is
 * skirted up to the real plating above, so the shallow box it makes reads as a
 * ventral fairing rather than as a slab with a slot behind it.
 *
 * The relief on it is what does the work, not the colour. Every rib stands a
 * good half unit proud, so its fore-and-aft faces turn edge-on to a lens this
 * shallow and read as hard bands — and because the scene's warm planetshine
 * comes from below and slightly aft, aft-facing rib walls catch it and
 * forward-facing ones do not, which stripes the belly for free.
 *
 * Model coordinates, y in plates. Added to the model, not the rig, and after
 * measure(), so it cannot move the keel the rest of the scene is pinned to.
 *
 * @param {{z:number, halfD:number, halfW:number}|null} bay  the underslung
 *   hangar's own footprint, in model studs: the skin parts around its mouth.
 */
function buildKeelStructure(sd, destroyer, bay = null) {
  const probe = bellyProbe(destroyer);
  if (!probe) return new THREE.Group();

  const b = new Bricks({ studSegments: 6 });
  const dark = COLORS.darkBluishGray;
  const pale = COLORS.lightBluishGray;
  const metal = COLORS.flatSilver;

  const noseZ = sd.box.max.z / PITCH;
  const sternZ = sd.box.min.z / PITCH;
  const Z0 = sternZ + 4;
  const Z1 = noseZ - 16;
  const PITCH_Z = 4; // studs between stations
  const REACH = sd.halfW / PITCH + 4; // far enough out to find the flank
  const STEP = 2; // studs between outboard samples

  /**
   * What the hull is doing at station z.
   *
   *  - `low`  the lowest bottom face anywhere across the beam. This is what the
   *           skin follows, because it is the only value that is guaranteed to
   *           be under everything — floating blocks included.
   *  - `plate` the MEDIAN of the outboard samples, which is the plating itself:
   *           a minimum would pick up the first greeble that hangs lower and
   *           drop the whole frame half a unit, reading as a bent rib.
   *  - `half` how far outboard the hull reaches here.
   */
  const measureStation = (z) => {
    const ys = [];
    let edge = 0;
    for (let x = 1; x <= REACH; x += STEP) {
      const y = probe(x, z);
      if (y === null) break;
      edge = x;
      ys.push(y);
    }
    if (edge < 8 || ys.length < 4) return null;
    const outboard = ys.slice(Math.floor(ys.length / 3)).sort((p, q) => p - q);
    let low = ys[0];
    for (const y of ys) if (y < low) low = y;
    const mid = probe(0, z);
    if (mid !== null && mid < low) low = mid;
    return { z, low, plate: outboard[Math.floor(outboard.length / 2)], half: edge };
  };

  const stations = [];
  for (let z = Z0; z < Z1; z += PITCH_Z) {
    const s = measureStation(z + PITCH_Z / 2);
    if (s) stations.push({ ...s, z });
  }
  if (stations.length < 4) return new THREE.Group();

  // A running minimum over three stations, so a single deep block pulls a
  // twelve-stud stretch of skin down with it instead of putting a step in it.
  const lows = stations.map((s, i) =>
    Math.min(s.low, stations[Math.max(0, i - 1)].low, stations[Math.min(stations.length - 1, i + 1)].low)
  );
  /** Skin top, in plates, at station i: one plate clear of everything above. */
  const skinTop = (i) => lows[i] / PLATE - 0.5;
  const inBay = (z) => bay && Math.abs(z - bay.z) < bay.halfD;

  // ------------------------------------------------------------------- skin
  for (let i = 0; i < stations.length; i++) {
    const s = stations[i];
    const top = skinTop(i);
    const w = s.half * 0.99;
    const d = PITCH_Z + 0.3; // overlap, so no seam can open between stations
    if (inBay(s.z)) {
      // Two segments either side of the hangar mouth. The bay housing is its
      // own structure hanging below the keel; plating across it would put a
      // floor in the opening the corvette is lifted through.
      const bw = bay.halfW;
      if (w > bw + 2) {
        b.box(-w, top - 1, s.z, w - bw, d, 1, pale, { studs: false });
        b.box(bw, top - 1, s.z, w - bw, d, 1, pale, { studs: false });
      }
    } else {
      b.box(-w, top - 1, s.z, w * 2, d, 1, pale, { studs: false });
    }
    // Skirt: close the void wherever the skin has dropped clear of the plating,
    // so the fairing has sides. Nothing to close where it lies flush. Hull grey,
    // not dark: it is a tall wall seen nearly edge-on in the money shot, and in
    // dark grey it read as a black band down both sides of the ship.
    const drop = (s.plate - lows[i]) / PLATE;
    if (drop > 1.5) {
      for (const sx of [-1, 1]) {
        b.box(sx * w - (sx > 0 ? 1.6 : 0), top - 1, s.z, 1.6, d, drop + 1, pale, { studs: false });
      }
    }
  }

  /** Interpolate the skin at an arbitrary z, for the relief hung under it. */
  const skinAt = (z) => {
    let i = 0;
    for (let k = 0; k < stations.length; k++) if (stations[k].z <= z) i = k;
    return { top: skinTop(i), half: stations[i].half };
  };

  // Transverse frames. 11 studs of pitch is the whole point of them: it is the
  // only fixed length in the shot, so it is what the eye measures the hull
  // against as the spacing closes up toward the bow.
  //
  // They are HULL-COLOURED and SHALLOW, and there is one line of strake per side
  // rather than two. Depth is the whole argument. A rib standing 0.7 units proud
  // of the plating projects across cot(θ) times its own height, and θ in this
  // shot is under ten degrees: the first pass ran the relief at a unit and a
  // half in dark grey and the prow arrived as a wireframe grid — every bar
  // covering the skin behind it, nothing but bars. At a third of a unit, hull
  // grey, with the dark kept to a seam on every third frame, the same lines
  // read as plating on a hull instead of as a rack over a hole.
  //
  // Two beats, not one: a main frame every 11 studs and a light one between them.
  // The main frames alone were 0.85 of a plate proud of the skin — a third of a
  // unit on a hull sixty units from the lens — and at that depth the ladder was
  // there in the geometry and not in the picture. At 1.3, with a half-plate
  // intermediate every 5.5, the pitch reads, and it reads at two scales, which is
  // what lets the eye see the spacing compress as the bow comes over.
  let n = 0;
  for (let z = Z0 + 4; z < Z1; z += 5.5) {
    const s = skinAt(z);
    const w = s.half * 0.96;
    if (w < 5) continue;
    n++;
    const main = n % 2 === 1;
    b.box(-w, s.top - (main ? 1.3 : 0.5), z, w * 2, main ? 1.8 : 1.0, main ? 1.3 : 0.5, pale, { studs: false });
    if (!main) continue;
    // Every third main frame is a heavier one, with a seam and a silver cap, so
    // the ladder has a longer beat in it than its own pitch and does not read as
    // corduroy.
    if (n % 6 === 1) {
      b.box(-w + 1, s.top - 1.75, z + 0.2, (w - 1) * 2, 1.4, 0.45, metal, { studs: false });
      b.box(-w, s.top - 1.2, z - 0.5, w * 2, 0.5, 1.2, dark, { studs: false });
    }
  }

  // Longitudinal strakes: the converging lines. Stepped in 6-stud segments
  // because they follow both a plan that narrows all the way forward and a skin
  // that climbs as the courses above take over.
  for (const sx of [-1, 1]) {
    for (let z = Z0 + 2; z < Z1; z += 6) {
      const s = skinAt(z);
      const w = s.half * 0.58;
      if (w < 3) continue;
      b.box(sx * w - 1.0, s.top - 0.95, z, 2.0, 6.2, 0.95, metal, { studs: false });
    }
  }

  // Keel spine: one unbroken run down the centreline, deeper than anything
  // either side of it, so the belly has a horizon of its own to converge to.
  for (let z = Z0 + 2; z < Z1; z += 8) {
    if (inBay(z) || inBay(z + 8)) continue;
    const s = skinAt(z);
    if (s.half < 8) continue;
    b.box(-3.2, s.top - 1.5, z, 6.4, 8.2, 1.5, pale, { studs: false });
    b.box(-1.4, s.top - 2.0, z + 0.6, 2.8, 7, 0.55, dark, { studs: false });
  }

  // Formation lights: a pair down each side of the keel and one on the spine,
  // every 22 studs. They do two jobs in the shot the whole scene is built around,
  // and nothing else on the hull does either of them. One is scale — a hull with
  // no lit detail on it has nothing to say how big it is, and 22 studs of pitch
  // repeated forty times reads as distance. The other is motion: the belly is a
  // near-uniform grey field, and a grey field sliding across the frame is a grey
  // field. Points of light sliding across it are a mile of ship going past.
  //
  // Kept dim and small on purpose. Bloom in this scene has a 0.6 threshold, and
  // an emissive tile any brighter than this blooms into a soft white lozenge four
  // times its own size — forty of those is a runway, not a warship.
  for (let z = Z0 + 6; z < Z1; z += 22) {
    const s = skinAt(z);
    if (s.half < 7) continue;
    const lamp = { emissive: 0xffc27a, emissiveIntensity: 1.6, finish: 'glossy' };
    // Hung a shade below the frame line so a rib can never stand between one of
    // them and the lens — at s.top-1.05 they sat inboard of relief 1.3 deep and
    // most of them were behind it at the grazing angles this shot works at.
    for (const sx of [-1, 1]) {
      b.box(sx * s.half * 0.74 - 0.6, s.top - 1.65, z, 1.2, 1.2, 0.5, COLORS.transOrange, lamp);
    }
    if (!inBay(z)) {
      b.box(-0.6, s.top - 2.55, z + 1.2, 1.2, 1.2, 0.5, COLORS.transClear, {
        emissive: 0xbfe0ff,
        emissiveIntensity: 1.4,
        finish: 'glossy',
      });
    }
  }

  return b.build({ castShadow: false, receiveShadow: false });
}

/**
 * A shut pair of doors over the destroyer's OWN ventral recess.
 *
 * ships-capital.js lines that recess with a brightOrange ceiling at
 * emissiveIntensity 1.4. At bloom threshold 0.6 that is a white hole the size of
 * the corvette, and every shot in the last third of this scene looks up at the
 * keel from below, where a 30-by-34 patch of the belly anywhere within about
 * seventy degrees of the lens axis lands somewhere in frame. Retiming and
 * repositioning cannot get away from it. The scene must not edit the kit, so it
 * plates over it: a second ventral bay with its doors closed.
 *
 * Coordinates are the destroyer model's own, so this is added to the model, not
 * to the rig. The recess is z -124..-94, half-width 17, keel at -26 plates.
 */
function buildRecessDoors() {
  const b = new Bricks({ studSegments: 6 });
  const grey = COLORS.darkBluishGray;
  const pale = COLORS.lightBluishGray;
  const HALF = 16.8;
  const Z0 = -123.4;
  const Z1 = -94.6;
  const Y = -25.4; // plates: just inside the opening, clear of its own lip
  // Two leaves meeting on the centreline, sitting a shade inside the aperture.
  for (const sx of [-1, 1]) {
    b.box(sx > 0 ? 0.25 : -HALF, Y, Z0, HALF - 0.25, Z1 - Z0, 2, grey, { studs: false });
    b.box(sx > 0 ? 1.5 : -HALF + 1.5, Y - 0.7, Z0 + 2, HALF - 3, Z1 - Z0 - 4, 0.7, pale, { studs: false });
    for (let z = Z0 + 3; z < Z1 - 3; z += 5.5) {
      b.box(sx * (HALF - 4) - 1.2, Y - 1.2, z, 2.4, 3, 0.6, grey, { studs: false });
    }
  }
  b.box(-1.1, Y - 1.4, Z0 + 1, 2.2, Z1 - Z0 - 2, 0.8, grey, { studs: false }); // centre seam cover
  return b.build({ castShadow: false, receiveShadow: false });
}

/**
 * The ventral hangar she is swallowed by: a housing hung UNDER the keel, open at
 * the bottom, with her own length of dark ribbed bay inside it.
 *
 * Why underslung rather than recessed. The scene cannot cut a hole in the
 * destroyer — ships-capital.js is another agent's file, and its hull plating is
 * one merged mesh. Anything built as a recess above the keel plane is therefore
 * hidden behind keel plate that is still there, which is exactly what a first
 * pass at this looked like: she rose and vanished behind a flat grey belly with
 * no opening anywhere in it. Hanging the bay proud of the keel instead gives a
 * real mouth, a real throat and a real silhouette, and needs nothing from the
 * model but a flat place to bolt it to.
 *
 * Local origin is on the keel plane at the centre of the footprint, +y up.
 *
 *  - The ROOF is at y = 0 and is opaque. It is the occluder: her hull crosses it
 *    and she is simply gone. It is also 10 plates thick, which beds the housing
 *    into whichever of the wedge's eight courses happens to be lowest at this
 *    station, so there is never a gap between bay and hull.
 *  - The interior is near-black against a lit grey belly, because contrast is
 *    what makes it read as a hole from eighty units away — not size.
 */
function buildHangar(cv) {
  const W = Math.round(cv.halfW * 2 + 10); // studs across the opening
  const D = Math.round(cv.len * 1.15); // ...and along it, so she fits
  const LOW = -BAY_DEEP; // plates: the mouth plane
  const ROOF = 10; // plates of roof, to bed into the hull above
  const b = new Bricks({ studSegments: 6 });
  const grey = COLORS.darkBluishGray;
  const pale = COLORS.lightBluishGray;
  const shade = 0x191d23;
  // Bay lighting. At bloom threshold 0.6 a big emissive face at 1.0 flares into
  // a white slab, so the roof is lit by narrow ribs rather than one panel.
  const roofLit = { studs: false, finish: 'glow', emissive: 0xff9a3c, emissiveIntensity: 0.4 };
  const dash = { studs: false, finish: 'glow', emissive: 0xffc266, emissiveIntensity: 1.15 };
  const WALL = 3; // studs of outer wall
  const LINER = 1.2; // studs of dark inner liner

  // --- roof: the occluder, and the strip lights under it
  b.box(-W / 2 - WALL, 0, -D / 2 - WALL, W + WALL * 2, D + WALL * 2, ROOF, grey, { studs: false });
  b.box(-W / 2, -0.7, -D / 2, W, D, 0.7, shade, { studs: false });
  for (let i = 0; i < 9; i++) {
    const z = -D / 2 + 4 + (i * (D - 8)) / 8;
    for (const sx of [-1, 1]) b.box(sx * (W / 2 - 3.5) - 4.5, -1.3, z, 9, 1.2, 0.6, COLORS.brightOrange, roofLit);
  }

  // --- walls: grey outside, dark and ribbed inside, stepped at the bottom so
  //     the housing is not a plain box bolted to a warship.
  for (const sx of [-1, 1]) {
    const out = sx * (W / 2 + WALL) - (sx > 0 ? 0 : WALL);
    b.box(out, LOW + 6, -D / 2 - WALL, WALL, D + WALL * 2, BAY_DEEP - 6, grey, { studs: false });
    b.box(out + (sx > 0 ? -0.9 : 0.9), LOW, -D / 2 - WALL + 2, WALL, D + WALL * 2 - 4, 6.2, grey, { studs: false });
    b.box(sx * (W / 2) - (sx > 0 ? 0 : LINER), LOW, -D / 2, LINER, D, BAY_DEEP, shade, { studs: false });
    for (let z = -D / 2 + 2; z < D / 2 - 1; z += 4.5) {
      b.box(sx * (W / 2 - 0.9) - (sx > 0 ? 0 : 0.9), LOW + 3, z, 0.9, 2.4, BAY_DEEP - 5, grey, { studs: false });
    }
  }
  for (const sz of [-1, 1]) {
    const out = sz * (D / 2 + WALL) - (sz > 0 ? 0 : WALL);
    b.box(-W / 2 - WALL, LOW + 6, out, W + WALL * 2, WALL, BAY_DEEP - 6, grey, { studs: false });
    b.box(-W / 2 - WALL + 2, LOW, out + (sz > 0 ? -0.9 : 0.9), W + WALL * 2 - 4, WALL, 6.2, grey, { studs: false });
    b.box(-W / 2, LOW, sz * (D / 2) - (sz > 0 ? 0 : LINER), W, LINER, BAY_DEEP, shade, { studs: false });
  }

  // --- deck runway: dashes down both sides, receding up into the throat
  for (let i = 0; i < 7; i++) {
    const z = -D / 2 + 4 + (i * (D - 8)) / 6;
    for (const sx of [-1, 1]) b.box(sx * (W / 2 - 2.6) - 1.1, -5, z, 2.2, 1.6, 0.7, COLORS.transYellow, dash);
  }

  // --- the lip: door runners round the mouth with a marker light every third,
  //     which is what tells the eye at a glance that this is an opening.
  for (const sx of [-1, 1]) {
    let k = 0;
    for (let z = -D / 2 - 3; z < D / 2 + 3; z += 4.5) {
      b.box(sx * (W / 2 + 1) - (sx > 0 ? 0 : 2.8), LOW - 1.6, z, 2.8, 2.6, 1.8, grey, { studs: false });
      if (k++ % 4 === 1) b.box(sx * (W / 2 + 2.2) - 0.5, LOW - 2.3, z + 0.8, 1, 1, 0.7, COLORS.transYellow, dash);
    }
    b.box(sx * (W / 2 + 0.4) - (sx > 0 ? 0 : 1.4), LOW - 0.9, -D / 2 - 2, 1.4, D + 4, 1.2, pale, { studs: false });
  }
  for (const sz of [-1, 1]) {
    b.box(-W / 2 - 1, LOW - 1.6, sz * (D / 2 + 1) - (sz > 0 ? 0 : 2.8), W + 2, 2.8, 1.8, grey, { studs: false });
  }

  // --- the doors.
  // These are not decoration, they are what makes the rest of the scene
  // possible. The bay is 175 units aft of his bow, and every shot of the
  // destroyer before this one is taken from under his keel further aft than
  // that, so the bay sweeps forward over the lens around 10s — right through the
  // middle of the money shot, thirty units from the glass. Lit, it turns that
  // shot into a corridor ceiling. Shut, it is one more dark slab on a belly
  // grinding overhead, which is exactly what that shot wants. They open at 20.4,
  // once he has crippled her and the lens has cut away.
  const LEAF = W / 2 + 1.2;
  const leaves = [-1, 1].map((sx) => {
    const lb = new Bricks({ studSegments: 6 });
    const x0 = sx > 0 ? -0.2 : -LEAF;
    lb.box(x0, LOW + 0.2, -D / 2 - 1, LEAF, D + 2, 2, grey, { studs: false });
    lb.box(x0 + 1.2, LOW - 0.5, -D / 2 + 1, LEAF - 2.4, D - 2, 0.7, pale, { studs: false });
    for (let z = -D / 2 + 3; z < D / 2 - 2; z += 6) {
      lb.box(x0 + 2, LOW - 1.1, z, LEAF - 4, 3.4, 0.6, grey, { studs: false });
    }
    // A chevron of hazard stripes either side of the seam, so the shut doors
    // read as doors and the opening reads as having been closed.
    for (let i = 0; i < 5; i++) {
      lb.box(sx > 0 ? 0.6 : -2.2, LOW - 1.2, -D / 2 + 6 + i * (D - 12) / 4, 1.6, 3, 0.7, COLORS.brightOrange, {
        studs: false,
      });
    }
    const mesh = lb.build({ castShadow: false, receiveShadow: false });
    return { mesh, sx };
  });

  const group = new THREE.Group();
  group.add(b.build({ castShadow: false, receiveShadow: false }));
  for (const l of leaves) group.add(l.mesh);
  // One depth-tested additive glow up in the throat, for her to go dark against.
  // Kept narrower than the opening: a sprite wider than the mouth escapes past
  // the walls and washes a hundred units of grey belly warm orange.
  const inner = glowSprite(0xffb066, W * 0.62, 0);
  inner.position.y = -2.2;
  group.add(inner);

  return {
    group,
    width: W,
    /** Studs of footprint along the keel, so the keel framing can avoid it. */
    depth: D + WALL * 2,
    /** World y of the mouth plane, relative to the keel. */
    mouth: LOW * PLATE,
    update(t, grab) {
      // The bay does not exist until 20.0. Even shut it is a 37-unit slab of
      // regular ribs that passes thirty units under the lens at 12s, dead centre
      // of the money shot, where it reads as a corridor ceiling and flattens the
      // one image the scene is built around. Between 20.0 and 21.3 it is either
      // behind the lens or eighty degrees off axis, so it can simply arrive.
      group.visible = t >= 20;
      // ...and start shutting again over her once she is inside, which is the one
      // image that says swallowed rather than merely lifted. Only halfway: the
      // leaves cross her flanks and leave her spine down the gap, so the last
      // frame is a ship being closed in on rather than a shut pair of doors.
      const open = ease.smooth(ease.range(t, 20.6, 23.4)) * (1 - 0.6 * ease.smooth(ease.range(t, 30.6, 33.6)));
      for (const l of leaves) l.mesh.position.x = l.sx * open * (W / 2 + 2.4);
      // Kept off `open` so the throat does not go dark as the leaves come back.
      const lit = ease.smooth(ease.range(t, 20.6, 23.4));
      inner.material.opacity = lit * (0.19 + 0.11 * grab + 0.03 * Math.sin(t * 3.1) + 0.015 * Math.sin(t * 7.7));
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
