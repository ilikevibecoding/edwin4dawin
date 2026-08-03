/**
 * Scene 4 — Twin Suns.
 *
 * Everything happens on one planet under one sky, so the dome, the two suns
 * and the light rig are built once at scene level and simply *set* over the
 * run: the suns start high and hard and finish on the horizon. Three sets sit
 * on top of each other around the origin and are swapped by visibility — they
 * never share a frame, so overlapping costs nothing and each one gets the key
 * light's shadow camera pointed straight at it.
 *
 *   dunes  crash site, the long walk, the sandcrawler    0.0 .. 14.2s
 *   farm   the Lars courtyard at dusk, and the message  14.2 .. 25.4s
 *   ridge  the twin sunset                              25.4 .. 40.0s
 *
 * Narration (scene-local seconds):
 *    1.60 –  7.11  "They came down in the dunes of Tatooine, under two suns
 *                   that never quite set together."
 *    7.71 – 13.72  "A sandcrawler took them in, and traded them away, to a
 *                   moisture farm at the edge of nowhere."
 *   14.42 – 19.54  "And there a farm boy named Luke found a message hidden in
 *                   the little droid's memory."
 *   20.04 – 24.72  LEIA  "This recording is our last hope. Please. Help us."
 *   25.62 – 30.55  "That evening he watched two suns go down, and knew that he
 *                   could not stay."
 */
import * as THREE from 'three';
import { Bricks, chamferBox, PLATE } from '../engine/brick.js';
import { COLORS } from '../engine/palette.js';
import { standardLights, cameraRig, handheld } from '../engine/stage.js';
import { Beam, Smoke, hologramMaterial, glowSprite } from '../engine/fx.js';
import { hash11 } from '../engine/rng.js';
import * as ease from '../engine/ease.js';
import { makeLuke, makeLeia, makeJawa, makeAstromech, makeProtocolDroid } from '../kit/characters.js';
import { bakeFigure, Crowd, poseWalk, poseStand } from '../kit/minifig.js';

export const meta = { id: 'tatooine', title: 'Twin Suns', duration: 40, letterbox: 0.105 };

// --- cut points -------------------------------------------------------------
const T_CRAWLER = 8.0; // the sandcrawler comes over the dune
const T_FARM = 14.2; // cut to the moisture farm at dusk
const T_HOLO = 20.0; // the projector lights up
const T_SUNSET = 25.4; // cut to the ridge for the twin sunset
const T_TURN = 34.6; // he turns away from the suns

// How far up its own axis the astromech throws the image, in world units.
const HOLO_THROW = 0.98;

// --- the two suns -----------------------------------------------------------
// Both ride the same azimuth band all scene and only lose altitude. The second
// is smaller, hotter and always a little higher, so it is still up when the
// first has gone: "two suns that never quite set together".
const SUN_A_AZ = -0.30; // radians east of the -z meridian
const SUN_B_AZ = 0.10;
// The first sun's bearing on the ground plane. The sand's shading is painted
// on at build time along this line, so it must not change during the scene —
// only the suns' altitude does.
const SUN_DX = Math.sin(SUN_A_AZ);
const SUN_DZ = -Math.cos(SUN_A_AZ);
const SUN_B_LIFT = 0.05; // radians the second sun runs above the first
// Kept low even at the top of the scene. A high sun is the enemy of this
// shot: it shortens every shadow to a stub and lights the dune flanks evenly,
// and both suns have to be low enough to sit inside a frame that is mostly
// sand.
const SUN_ELEV = [
  [0, 0.25],
  [T_CRAWLER, 0.225],
  [T_FARM, 0.17],
  [T_SUNSET, 0.075],
  [T_TURN, 0.038],
  [40, 0.012],
];

/** Unit vector for a sun at a given azimuth (measured from -z) and elevation. */
function sunVector(az, elev, out) {
  const c = Math.cos(elev);
  return out.set(Math.sin(az) * c, Math.sin(elev), -Math.cos(az) * c);
}

/**
 * Scale a model to a given overall height and return how far its underside
 * then sits below its origin, so it can be seated on the sand. Measuring
 * beats guessing: the kit models are sized in studs and plates, and a guessed
 * multiplier is how a sandcrawler ends up the size of a mountain.
 */
function fitHeight(obj, height) {
  const box = new THREE.Box3().setFromObject(obj);
  const h = Math.max(1e-3, box.max.y - box.min.y);
  const s = height / h;
  obj.scale.setScalar(s);
  return box.min.y * s;
}

export async function build(ctx) {
  const D = ctx.duration;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(44, ctx.aspect, 0.3, 5000);
  scene.background = new THREE.Color(0xe0a878);
  scene.fog = new THREE.Fog(0xe0a878, 120, 620);

  // A generous shadow box: at sunset the key is nearly horizontal and a
  // four-brick figure throws a shadow the length of a landspeeder.
  const lights = standardLights(scene, 'desert', { shadowRadius: 60, shadowMap: 2048 });

  // --- sky dome and both suns, parented so the dome follows the lens --------
  const sky = buildSky();
  const heavens = new THREE.Group();
  heavens.add(sky.mesh);
  scene.add(heavens);

  const ships = await loadCapitalShips();

  // =========================================================================
  // SET 1 — the dunes: the crash site, the long walk, the sandcrawler
  // =========================================================================
  const duneSet = new THREE.Group();
  scene.add(duneSet);

  // The open desert. Three concentric rings of decreasing resolution on one
  // shared grid, so the plate courses read in the foreground and the horizon
  // still costs almost nothing.
  const dunes = desert({ ox: 0, oz: 0, amp: 1.0, ripple: 0.7, profile: duneProfile });
  duneSet.add(
    dunes.mesh({
      // Each ring's half-extent is an exact multiple of both its own cell and
      // the next one out, so the rings tile without a seam or an overlap. The
      // second ring is the important one: the crest lines live in it, and at
      // any coarser than six units a dune slope stops terracing and turns
      // into a cliff.
      rings: [
        { cell: 3, half: 54 },
        { cell: 6, half: 144 },
        { cell: 18, half: 288 },
        { cell: 48, half: 624 },
      ],
      studsAt: [6, -26, 44], // studded plates only where the lens gets close
    })
  );

  // --- the wreck -----------------------------------------------------------
  // The pod sits nearer the lens than the droids' path, so that as they walk
  // out they are walking *away* from the wreck rather than back past it.
  const POD_AT = [24, -22];
  const pod = ships?.buildEscapePod ? await ships.buildEscapePod() : fallbackPod();
  fitHeight(pod, 9.0); // a bit taller than three minifigures
  // Nose down and half-buried: it ploughed in rather than landed.
  pod.rotation.set(-0.34, 2.28, 0.20);
  pod.position.set(POD_AT[0], dunes.cellY(POD_AT[0], POD_AT[1]) - 1.9, POD_AT[1]);
  duneSet.add(pod);
  duneSet.add(buildScorchTrail(dunes, POD_AT, [78, -86]));
  // Outcrops on the crest lines, where weathered rock actually surfaces —
  // scattered over the flats they just read as boxes dropped on a floor.
  duneSet.add(
    // Kept in the near and middle distance, where the sand under them is
    // visible: an outcrop whose base is hidden behind a crest reads as a box
    // floating on the skyline.
    buildRocks(dunes, [
      [-38, -54, 0.85],
      [-66, -78, 1.0],
      [50, -62, 0.8],
      [-16, -94, 0.9],
      [72, -96, 0.95],
    ])
  );

  // A thin heat shimmer still coming off the hull.
  const wreckSmoke = new Smoke({
    count: 8,
    t0: -2,
    life: 22,
    origin: [POD_AT[0], dunes.cellY(POD_AT[0], POD_AT[1]) + 2, POD_AT[1]],
    rise: 0.9,
    spread: 5,
    size: 7,
    color: 0x8f7c62,
    opacity: 0.16,
    seed: 12,
  });
  duneSet.add(wreckSmoke.object);

  // --- the two droids trudging away ---------------------------------------
  const artoo = await makeAstromech({ seed: 41.3 });
  duneSet.add(artoo.root);
  const threepio = await makeProtocolDroid({ seed: 31.5 });
  duneSet.add(threepio.root);
  // Polished gold under two suns clips to a blown white flare, and with the
  // bloom threshold down at 0.62 he stops being a character and becomes a lens
  // effect standing in the sand. Roughened here rather than in the kit — the
  // ship interiors want him shiny — and cloned so nothing else gold changes.
  threepio.root.traverse((n) => {
    if (!n.isMesh) return;
    const mats = Array.isArray(n.material) ? n.material : [n.material];
    n.material = mats.map((m) => {
      if (!(m.metalness > 0.5)) return m;
      const c = m.clone();
      c.roughness = Math.max(c.roughness, 0.58);
      return c;
    });
    if (n.material.length === 1) n.material = n.material[0];
  });

  // --- the sandcrawler and its jawas --------------------------------------
  const crawler = ships?.buildSandcrawler ? await ships.buildSandcrawler({ ramp: 0 }) : fallbackCrawler();
  // Scaled by measurement rather than by a guess: a minifigure is 5.3 units to
  // the top of its head, so 20 m of sandcrawler is about 58.
  const crawlerDrop = fitHeight(crawler, 58);
  duneSet.add(crawler);
  const rollTracks = crawler.userData.rollTracks;

  const dust = new Smoke({
    count: 12,
    t0: T_CRAWLER - 3.0,
    life: 11,
    origin: [0, 4, 0],
    rise: 1.4,
    spread: 34,
    size: 34,
    color: 0xd7b183,
    opacity: 0.4,
    seed: 61,
  });
  duneSet.add(dust.object);

  // Jawas as one instanced crowd, scurrying out ahead of the treads.
  const jawaTemplate = await makeJawa({ seed: 29.2 });
  const jawaBaked = bakeFigure(jawaTemplate);
  jawaTemplate.root.visible = false; // only the instances render
  const jawaPlacements = [];
  for (let i = 0; i < 9; i++) {
    jawaPlacements.push({
      template: 0,
      position: [0, 0, 0],
      rotationY: 0,
      scale: 0.94 + hash11(i, 54) * 0.14,
      seed: hash11(i, 55) * 6.283,
    });
  }
  const jawas = new Crowd([jawaBaked], jawaPlacements);
  duneSet.add(jawas.object);

  // =========================================================================
  // SET 2 — the moisture farm at dusk
  // =========================================================================
  const farmSet = new THREE.Group();
  farmSet.visible = false;
  scene.add(farmSet);

  // Another stretch of the same desert, flattened into a shallow pan where
  // the homestead sits.
  const farmGround = desert({ ox: 1900, oz: -1300, amp: 0.8, flatR: 34, flatY: 0, profile: farmProfile });
  farmSet.add(
    farmGround.mesh({
      rings: [
        { cell: 3, half: 48 },
        { cell: 8, half: 144 },
        { cell: 24, half: 288 },
        { cell: 72, half: 504 },
      ],
      studsAt: [0, -4, 30],
    })
  );
  farmSet.add(buildHomestead(farmGround));

  const luke = await makeLuke({ seed: 7.9 });
  farmSet.add(luke.root);

  // A second astromech for the farm: the same droid, but the two sets are
  // dressed independently and re-posing one across both every frame costs
  // more than it saves.
  const artooFarm = await makeAstromech({ seed: 41.3 });
  artooFarm.root.position.set(2.4, 0, -0.3);
  artooFarm.root.rotation.y = 0.62;
  artooFarm.setCenterLeg(1);
  farmSet.add(artooFarm.root);

  // --- the hologram --------------------------------------------------------
  // Additive blending saturates fast; past about 0.6 the figure stops reading
  // as Leia and turns into a bright smear.
  // The shader multiplies its colour by up to 2.2 and blends additively over a
  // double-sided figure, so anything with a healthy red channel accumulates
  // straight to white through the torso and Leia stops being a person. Starving
  // the red keeps her cyan even where the green and blue have long since
  // clipped, which is what leaves the face and the buns readable.
  const holoMat = hologramMaterial(0x2196d6, { opacity: 0.55, scan: 16 });
  const holoLeia = await makeLeia({ seed: 11.3 });
  holoLeia.root.traverse((n) => {
    if (!n.isMesh) return;
    n.material = holoMat;
    n.castShadow = false;
    n.receiveShadow = false;
    n.frustumCulled = false;
  });
  const holo = new THREE.Group(); // owns the pose scale
  holo.add(holoLeia.root);
  const holoRig = new THREE.Group(); // owns position, driven off the projector
  holoRig.add(holo);
  holoRig.visible = false;
  farmSet.add(holoRig);

  // The projector cone: narrow at the lens, opening upward to the image.
  const holoBeam = new Beam({ color: 0x2196d6, radiusTop: 0.7, radiusBottom: 0.08, height: 2.4, opacity: 0.09 });
  farmSet.add(holoBeam.object);

  // Cyan bounce on whoever is leaning into it.
  const holoLight = new THREE.PointLight(0x66d8ff, 0, 14, 2);
  farmSet.add(holoLight);
  // Small and dim: this is the flare on the projector lens, not a lamp. With
  // the bloom threshold down at 0.62 anything bigger swallows the figure.
  const holoGlow = glowSprite(0x63cdf0, 1.0, 0);
  farmSet.add(holoGlow);

  // =========================================================================
  // SET 3 — the sunset ridge
  // =========================================================================
  const ridgeSet = new THREE.Group();
  ridgeSet.visible = false;
  scene.add(ridgeSet);

  // A trough between two crests. The lens sits on the near rim, he stands on
  // the far one, and the ground behind him falls away so there is nothing but
  // sky past the skyline.
  const ridge = desert({ ox: -2400, oz: 800, amp: 0.35, grain: 0.55, ripple: 0.42, profile: ridgeProfile });
  ridgeSet.add(
    ridge.mesh({
      rings: [
        { cell: 3, half: 48 },
        { cell: 12, half: 240 },
        { cell: 48, half: 528 },
      ],
      studsAt: [0, 6, 34],
    })
  );

  const lukeRidge = await makeLuke({ seed: 7.9 });
  ridgeSet.add(lukeRidge.root);

  // =========================================================================
  // Sound
  // =========================================================================
  // The mixer plays each cue once at its own length, so the wind bed is laid
  // down by hand as overlapping copies.
  for (let i = 0; i < 6; i++) ctx.sfx(i * 7.2 - 0.5, 'wind_desert', { gain: 0.2 });
  ctx.sfx(2.4, 'r2_beeps_a', { gain: 0.4 });
  ctx.sfx(5.9, 'r2_beeps_b', { gain: 0.32 });
  ctx.sfx(T_CRAWLER - 2.2, 'sandcrawler', { gain: 0.8 });
  ctx.sfx(T_CRAWLER + 2.4, 'jawa_chatter', { gain: 0.62 });
  ctx.sfx(T_CRAWLER + 4.6, 'jawa_chatter', { gain: 0.42, rate: 1.14 });
  ctx.sfx(T_FARM + 1.4, 'r2_beeps_a', { gain: 0.5 });
  ctx.sfx(T_HOLO - 0.4, 'hologram_on', { gain: 0.85 });
  ctx.sfx(T_HOLO + 4.8, 'r2_beeps_b', { gain: 0.36 });
  ctx.sfx(T_SUNSET + 2.0, 'wind_desert', { gain: 0.3 });
  ctx.sfx(T_TURN + 1.2, 'wind_desert', { gain: 0.26 });

  // =========================================================================
  // Update
  // =========================================================================
  const _sunA = new THREE.Vector3();
  const _sunB = new THREE.Vector3();
  const _key = new THREE.Vector3();
  const _v = new THREE.Vector3();
  const _axis = new THREE.Vector3();
  const _q = new THREE.Quaternion();
  const skyHigh = new THREE.Color();
  const skyLow = new THREE.Color();
  const fogCol = new THREE.Color();
  const discA = new THREE.Color();
  const discB = new THREE.Color();
  const haze = new THREE.Color();

  // Sky stops on the same clock as the suns: bleached daylight, then dusk,
  // then a sunset that burns from the horizon up into violet.
  // Deep and saturated, not a pastel. A warm horizon lerped toward a pale blue
  // passes straight through grey on the way, and grey is exactly what the top
  // of a wide desert frame must not be.
  const SKY_HIGH = [
    [0, 0x2a6296],
    [T_FARM, 0x27507e],
    [T_SUNSET, 0x4a2c66],
    [T_TURN, 0x341a48],
    [40, 0x160a22],
  ];
  // The horizon stop is what a desert sky is actually made of. Left grey it
  // turns the whole lower sky into dishwater; it wants to be warm sand.
  const SKY_LOW = [
    [0, 0xcf9c56],
    [T_FARM, 0xc4904f],
    [T_SUNSET, 0xe0701e],
    [T_TURN, 0xcb3f14],
    [40, 0x45150b],
  ];
  const HAZE = [
    [0, 0x8a6033],
    [T_FARM, 0x9a5220],
    [T_SUNSET, 0xc44e10],
    [T_TURN, 0x96280a],
    [40, 0x260a05],
  ];
  // How far up the dome the horizon colour holds before the high stop takes
  // over. High by day (a warm sky with blue only near the zenith), low at
  // sunset (violet coming a long way down over the burn).
  const SKY_RAMP = [
    [0, 1.15],
    [T_FARM, 1.1],
    [T_SUNSET, 0.8],
    [40, 0.72],
  ];
  // Disc colours run well over 1.0 so the suns clip white and bloom.
  const DISC_A = [
    [0, [3.4, 3.3, 3.0]],
    [T_FARM, [3.3, 2.7, 1.9]],
    [T_SUNSET, [3.2, 1.35, 0.42]],
    [40, [2.2, 0.68, 0.2]],
  ];
  const DISC_B = [
    [0, [3.2, 3.1, 2.9]],
    [T_FARM, [3.1, 2.6, 1.9]],
    [T_SUNSET, [3.0, 1.6, 0.62]],
    [40, [2.2, 0.9, 0.34]],
  ];

  return {
    scene,
    camera,
    bloom: { strength: 0.85, radius: 0.75, threshold: 0.62 },
    update(t) {
      updateSky(t);

      const inDunes = t < T_FARM;
      const inFarm = t >= T_FARM && t < T_SUNSET;
      duneSet.visible = inDunes;
      farmSet.visible = inFarm;
      ridgeSet.visible = !inDunes && !inFarm;

      if (inDunes) updateDunes(t);
      else if (inFarm) updateFarm(t);
      else updateRidge(t);

      // The dome is drawn at a fixed radius, so it has to ride the lens or the
      // horizon slides as the camera moves.
      heavens.position.copy(camera.position);
    },
  };

  // -------------------------------------------------------------------------
  // Sky, suns and the light rig
  // -------------------------------------------------------------------------
  function updateSky(t) {
    const elev = ease.track(SUN_ELEV, t, ease.smooth);
    sunVector(SUN_A_AZ, elev, _sunA);
    sunVector(SUN_B_AZ, elev + SUN_B_LIFT, _sunB);

    // Both suns swell and redden as they sink into the haze.
    const low = 1 - ease.clamp(elev / 0.5, 0, 1);
    skyHigh.copy(colorAt(SKY_HIGH, t));
    skyLow.copy(colorAt(SKY_LOW, t));
    haze.copy(colorAt(HAZE, t));
    vecAt(DISC_A, t, discA);
    vecAt(DISC_B, t, discB);

    sky.set({
      high: skyHigh,
      low: skyLow,
      haze,
      sunA: _sunA,
      sunB: _sunB,
      discA,
      discB,
      radiusA: 0.026 * (1 + low * 0.30),
      radiusB: 0.016 * (1 + low * 0.25),
      // The haze band is what makes the desert hot, but it is also what turns
      // a sky into dishwater: at full strength it lays a flat pale wash right
      // across the part of frame the horizon lives in.
      hazeGain: 0.22 + low * 0.72,
      ramp: ease.track(SKY_RAMP, t, ease.smooth),
    });

    // Haze takes the horizon colour so the dunes dissolve into the sky. Very
    // little of the high stop goes in: any more and the far sand turns grey.
    fogCol.copy(skyLow).lerp(skyHigh, 0.10);
    scene.fog.color.copy(fogCol);
    scene.background.copy(fogCol);

    // --- the light rig follows the suns.
    // The *visible* sun goes all the way down; the key does not. Below about
    // eight degrees a standing figure's shadow runs off the end of the shadow
    // camera and the sand goes to mush, so the key is floored there and the
    // sunset is carried by colour and intensity instead.
    sunVector(SUN_A_AZ, Math.max(elev, 0.145), _key);
    lights.key.position.copy(_key).multiplyScalar(150);
    lights.fill.position.copy(_sunB).multiplyScalar(150).setY(40);
    lights.rim.position.set(-_sunA.x, 0.5, -_sunA.z).multiplyScalar(150);

    const dusk = ease.range(t, T_FARM - 3, T_SUNSET);
    const night = ease.range(t, T_TURN, D);
    lights.key.intensity = ease.lerp(2.05, 1.15, dusk) * (1 - night * 0.72);
    lights.key.color.setHex(0xffe4b6).lerp(_col(0xff8138), dusk);
    lights.fill.intensity = ease.lerp(0.5, 0.26, dusk) * (1 - night * 0.6);
    // The "rim" faces back down the sun line, so in this scene it is really
    // the bounce off all that sand, and through the daylight beats it has to
    // be strong: those shots look straight into the suns, and without it every
    // hull facing the lens is a flat black shape.
    //
    // On the ridge it is the enemy. It is the only thing lighting the side of
    // Luke that the camera can see, and at any useful strength he stops being
    // a silhouette and becomes a tan minifigure standing in front of a sunset.
    // It comes almost all the way off for that beat, which drops the near sand
    // with him and leaves the frame as two suns, a crest and a shape.
    const onRidge = ease.smooth(ease.range(t, T_SUNSET - 0.8, T_SUNSET + 1.6));
    lights.rim.intensity = ease.lerp(1.6, 0.85, dusk) * (1 - night * 0.4) * (1 - onRidge * 0.74);
    lights.hemi.intensity = ease.lerp(0.62, 0.34, dusk) * (1 - night * 0.5) * (1 - onRidge * 0.34);
    lights.hemi.color.copy(skyLow);
    lights.hemi.groundColor.setHex(0x8a6337).lerp(_col(0x3a2016), dusk);
    if (lights.ambient) lights.ambient.intensity = ease.lerp(0.14, 0.08, dusk) * (1 - night * 0.5);
  }

  // -------------------------------------------------------------------------
  // Beats 1 and 2 — the dunes
  // -------------------------------------------------------------------------
  function updateDunes(t) {
    // The sand stops at 624 units; the haze has to have swallowed it by then,
    // but not so early that the crest lines are gone before the horizon is.
    scene.fog.near = 230;
    scene.fog.far = 610;

    // --- the droids trudge away from the wreck, out toward the deep desert.
    const walk = ease.clamp(t / T_FARM, 0, 1);
    const px = ease.lerp(6.0, -16.0, walk);
    const pz = ease.lerp(-34.0, -66.0, walk);
    threepio.root.position.set(px, dunes.cellY(px, pz), pz);
    threepio.root.rotation.y = 3.66; // heading, matching the path
    poseWalk(threepio, t, { speed: 0.58, amp: 0.46 });
    threepio.head.rotation.y = Math.sin(t * 0.5) * 0.4;
    threepio.armL.rotation.z = -0.3;
    threepio.armR.rotation.z = 0.3;

    const ax = px + 3.6;
    const az = pz + 1.4;
    artoo.root.position.set(ax, dunes.cellY(ax, az), az);
    artoo.root.rotation.y = 3.66;
    artoo.roll(t, { speed: 0.85 });

    wreckSmoke.update(t);

    // --- the sandcrawler grinds down out of the far dunes behind them.
    // It has to stay a long way out. Twenty metres of sandcrawler brought any
    // closer than this stops reading as a machine and becomes an abstract
    // brown mass with its ends off both sides of the frame.
    const cu = ease.smooth(ease.range(t, T_CRAWLER - 2.0, T_FARM + 2.5));
    const cx = ease.lerp(130, 50, cu);
    const cz = ease.lerp(-250, -128, cu);
    crawler.position.set(cx, dunes.cellY(cx, cz) - crawlerDrop - 2.0, cz);
    // Nosing down the slope, rocking on its suspension.
    crawler.rotation.set(0.045 + Math.sin(t * 0.62) * 0.010, -0.72, Math.sin(t * 0.83) * 0.014);
    rollTracks?.(t * 1.9);
    // Held back until the cut. Let it into the wide shot and it arrives
    // cropped along the top edge, which spends the reveal for nothing — the
    // engine cue two seconds earlier is what announces it.
    crawler.visible = t > T_CRAWLER - 0.2;

    dust.object.position.set(cx + 30, dunes.cellY(cx, cz), cz + 26);
    dust.update(t);

    // Jawas swarm ahead of the treads, small and quick against all that hull.
    const jx = cx - 34;
    const jz = cz + 46;
    jawas.object.visible = t > T_CRAWLER - 0.2;
    jawas.object.position.set(jx, dunes.cellY(jx, jz), jz);
    jawas.update(t, (i, seed, out) => {
      const p = t * 1.9 + seed * 2.1;
      out.x = Math.sin(p * 0.5 + seed) * 13 + Math.sin(seed * 3.1) * 6;
      out.z = Math.cos(p * 0.37 + seed * 1.7) * 9 + Math.cos(seed * 2.3) * 5;
      out.y = Math.abs(Math.sin(p * 2.4)) * 0.22; // the jawa waddle, instanced
      out.rotY = Math.sin(p * 0.5 + seed) * 1.6;
      out.tilt = Math.sin(p * 2.4) * 0.08;
    });

    // --- camera
    if (t < T_CRAWLER) {
      // Very wide, from the rim of the near dune looking down into the pan:
      // the crest lines stack away toward the horizon and the droids are two
      // specks crossing the floor of it. The tilt is chosen to put the suns
      // just off the top edge — in frame they bloom the whole sky flat.
      const a = [36, dunes.y(36, 30) + 5.6, 30];
      // The push ends left of the wreck rather than at it: aimed straight in,
      // the pod swells until it is a dark lump filling half the frame.
      const b = [2, dunes.y(2, 6) + 4.6, 6];
      cameraRig(camera, t, {
        pos: [[0, a], [T_CRAWLER, b]],
        // Tipped down just enough to give the sand the larger half of the
        // frame. Level, the horizon sits on the centre line and half the shot
        // is an empty hazy sky; the dunes are where all the detail is.
        look: [[0, [2, 6.8, -74]], [T_CRAWLER, [-4, 4.6, -66]]],
        fov: [[0, 50], [T_CRAWLER, 46]],
        ease: ease.smooth,
      });
      handheld(camera, t, 0.06, 0.28, 2);
    } else {
      // Down at sand level with the droids in the near left of frame and the
      // crawler coming on behind them, filling the rest of it.
      const a = [10, dunes.y(10, -14) + 4.0, -14];
      const b = [2, dunes.y(2, -26) + 3.4, -26];
      cameraRig(camera, t, {
        pos: [[T_CRAWLER, a], [T_FARM, b]],
        look: [[T_CRAWLER, [12, 10, -94]], [T_FARM, [9, 13, -84]]],
        fov: [[T_CRAWLER, 50], [T_FARM, 46]],
        ease: ease.smooth,
      });
      handheld(camera, t, 0.085, 0.5, 6);
    }
  }

  // -------------------------------------------------------------------------
  // Beats 3 and 4 — the farm, and the message
  // -------------------------------------------------------------------------
  function updateFarm(t) {
    scene.fog.near = 60;
    scene.fog.far = 460;

    // --- Luke: crouched beside the droid, then leaning into the projection.
    const lean = ease.smooth(ease.range(t, T_HOLO - 0.5, T_HOLO + 1.6));
    luke.root.position.set(-2.4, farmGround.cellY(-2.4, 0.6), 0.6);
    luke.root.rotation.y = 1.24 - 0.18 * lean;
    crouch(luke, t, 1);
    luke.torso.rotation.x = 0.14 + 0.26 * lean;
    luke.head.rotation.set(0.10 + 0.20 * lean, 0.20, 0);
    luke.armL.rotation.set(-0.44 - 0.28 * lean, 0.12, -0.34);
    luke.armR.rotation.set(-0.58 - 0.50 * lean, -0.10, 0.30);

    // --- the droid runs its playback.
    artooFarm.root.position.y = farmGround.cellY(2.4, -0.3);
    artooFarm.roll(t, { speed: 0.26, amount: 0.35 });
    artooFarm.dome.rotation.y = Math.sin(t * 0.5) * 0.18 + 0.3 * lean;

    // --- the hologram.
    const on = t >= T_HOLO - 0.3;
    holoRig.visible = on;
    holoBeam.object.visible = on;
    holoGlow.visible = on;
    if (on) {
      const boot = ease.smoother(ease.range(t, T_HOLO - 0.3, T_HOLO + 0.35));
      // Dropout: a hologram that never breaks up looks like a solid model.
      const drop = hash11(Math.floor(t * 12), 91) > 0.12 ? 1 : 0.28;
      const live = boot * drop * (1 - ease.range(t, T_SUNSET - 0.8, T_SUNSET));

      // The image sits on the projector's own axis, a fixed distance up the
      // cone, and stays upright however the dome is turned.
      artooFarm.projector.updateWorldMatrix(true, false);
      _v.setFromMatrixPosition(artooFarm.projector.matrixWorld);
      artooFarm.projector.getWorldQuaternion(_q);
      _axis.set(0, 1, 0).applyQuaternion(_q);
      holoRig.position.copy(_v).addScaledVector(_axis, HOLO_THROW);

      // The image floats in the cone, breathing and turning very slowly.
      holo.position.y = Math.sin(t * 1.7) * 0.03;
      holo.rotation.y = -2.3 + Math.sin(t * 0.4) * 0.09;
      holo.scale.setScalar(0.46 * (0.55 + 0.45 * boot));
      holoMat.uniforms.uTime.value = t;
      holoMat.uniforms.uOpacity.value = 0.22 * live;

      // Leia's plea: a small, contained gesture on "help us".
      poseStand(holoLeia, t, { sway: 0.05 });
      const plead = ease.pulse(t, 23.3, 0.5, 0.6, 1.0);
      holoLeia.armL.rotation.set(-0.5 - 0.7 * plead, 0.22, -0.44);
      holoLeia.armR.rotation.set(-0.48 - 0.75 * plead, -0.22, 0.42);
      holoLeia.torso.rotation.x = 0.05 + 0.1 * plead;
      holoLeia.head.rotation.x = 0.04 - 0.1 * plead;

      // The cone runs from the lens up to the image's feet, so it has to be
      // scaled to exactly the throw distance.
      holoBeam.object.position.copy(_v);
      holoBeam.object.quaternion.copy(_q);
      holoBeam.object.scale.set(live, live * (HOLO_THROW / 2.4), live);
      holoBeam.update(t);

      // Lifted off the dome. A point light with square falloff sitting one
      // unit above a glossy hemisphere puts a blown white bead on top of the
      // droid that outshines the projection it is supposed to be casting.
      holoLight.position.copy(holoRig.position).setY(holoRig.position.y + 1.1);
      holoLight.intensity = 6.5 * live;
      // The flare sits on the lens itself, not up in the image.
      holoGlow.position.copy(_v).addScaledVector(_axis, 0.16);
      holoGlow.material.opacity = 0.10 * live;
      holoGlow.scale.setScalar(0.42 + 0.05 * Math.sin(t * 5.3));
    } else {
      holoLight.intensity = 0;
    }

    // --- camera
    if (t < T_HOLO) {
      // Establish the courtyard: high and wide, drifting down toward them.
      cameraRig(camera, t, {
        pos: [[T_FARM, [15.0, 10.6, 17.0]], [T_HOLO, [8.6, 4.4, 9.6]]],
        look: [[T_FARM, [-3.0, 3.4, -8.0]], [T_HOLO, [-0.4, 2.8, -1.0]]],
        fov: [[T_FARM, 46], [T_HOLO, 38]],
        ease: ease.smooth,
      });
      handheld(camera, t, 0.05, 0.35, 3);
    } else {
      // The hero shot: Luke low left leaning in, the droid right, and the
      // projection standing clear between and above them.
      cameraRig(camera, t, {
        pos: [[T_HOLO, [7.4, 3.4, 9.4]], [T_SUNSET, [6.2, 3.2, 7.8]]],
        look: [[T_HOLO, [0.6, 3.2, -0.3]], [T_SUNSET, [0.6, 3.3, -0.3]]],
        fov: [[T_HOLO, 42], [T_SUNSET, 37]],
        ease: ease.smooth,
      });
      handheld(camera, t, 0.03, 0.4, 8);
    }
  }

  // -------------------------------------------------------------------------
  // Beats 5 and 6 — the twin sunset
  // -------------------------------------------------------------------------
  function updateRidge(t) {
    scene.fog.near = 90;
    scene.fog.far = 620;

    // He walks the last few steps out to the crest, stands, then finally turns
    // back toward the homestead as the light dies.
    const arrive = ease.smooth(ease.range(t, T_SUNSET, T_SUNSET + 3.0));
    const leave = ease.smooth(ease.range(t, T_TURN, T_TURN + 4.4));
    // He walks out along the crest, stands, and finally walks off along it —
    // not back toward the lens, which would drop him into the near trough and
    // out of the frame entirely.
    const x = ease.lerp(7.4, 2.6, arrive) - leave * 13.0;
    const z = ease.lerp(-40.0, -32.0, arrive) - leave * 2.0;
    lukeRidge.root.position.set(x, ridge.cellY(x, z), z);
    // Facing the suns while he watches; away from them once he has decided.
    lukeRidge.root.rotation.y = ease.lerp(2.5, Math.PI + 0.14, arrive) - leave * 1.9;

    const moving = arrive < 1 || (leave > 0 && leave < 1);
    if (moving) {
      poseWalk(lukeRidge, t, { speed: 0.62, amp: 0.5 });
    } else {
      poseStand(lukeRidge, t, { sway: 0.03 });
      // Hands at his sides, weight settled: the stillness is the whole shot.
      lukeRidge.armL.rotation.set(-0.05, 0, -0.09);
      lukeRidge.armR.rotation.set(-0.05, 0, 0.09);
      lukeRidge.head.rotation.set(0.04 + Math.sin(t * 0.4) * 0.03, Math.sin(t * 0.31) * 0.07, 0);
    }

    // Low, wide, and a push so slow it barely registers. The lens sits just
    // above the height he is standing at, so the skyline runs across his
    // ankles and everything above it is sky.
    // The move runs off the near rim down into the trough, so by the end the
    // lens is *below* him and he is entirely sky. It also has to close a lot of
    // distance: a four-unit figure sixty units off a 36° lens is a thumbnail,
    // and this shot only works if he is big enough to be a person.
    // Height is set absolutely rather than off the ground under the lens: the
    // move ends in the trough, and a fixed offset above *that* puts the lens
    // below the crest table, from where a man standing on it has no feet.
    // Chest-high on him is the mark — his head clears into open sky and the
    // sand in front of him still falls away below the sight line.
    cameraRig(camera, t, {
      pos: [
        [T_SUNSET, [5.6, 7.4, 30]],
        [T_TURN, [3.4, 5.8, 12]],
        [D, [1.2, 5.5, 6]],
      ],
      look: [[T_SUNSET, [1.2, 6.4, -32]], [T_TURN, [1.4, 6.4, -32]], [D, [-4.2, 6.2, -33]]],
      fov: [[T_SUNSET, 34], [T_TURN, 26], [D, 24]],
      ease: ease.smooth,
    });
    handheld(camera, t, 0.03, 0.22, 12);
  }

  /**
   * A minifig has no knees, so a crouch is the body dropped most of a leg's
   * length with one leg swung forward and the other tucked back — the shape a
   * real minifigure makes when you sit it on a step.
   */
  function crouch(fig, t, amount = 1) {
    const breathe = Math.sin(t * 0.9 + (fig.seed ?? 0)) * 0.012;
    fig.body.position.y = -1.24 * amount + breathe;
    fig.legL.rotation.x = -1.42 * amount;
    fig.legR.rotation.x = -0.22 * amount;
  }
}

// ===========================================================================
// Ramp helpers (module scope so update() allocates nothing)
// ===========================================================================
const _colA = new THREE.Color();
const _colB = new THREE.Color();
const _colC = new THREE.Color();

function _col(hex) {
  return _colC.setHex(hex);
}

/** Piecewise colour ramp over a [[t, hex], ...] track. */
function colorAt(track, t) {
  if (t <= track[0][0]) return _colA.setHex(track[0][1]);
  const last = track[track.length - 1];
  if (t >= last[0]) return _colA.setHex(last[1]);
  for (let i = 0; i < track.length - 1; i++) {
    const [t0, c0] = track[i];
    const [t1, c1] = track[i + 1];
    if (t >= t0 && t <= t1) {
      return _colA.setHex(c0).lerp(_colB.setHex(c1), ease.smooth((t - t0) / (t1 - t0)));
    }
  }
  return _colA.setHex(last[1]);
}

/** Piecewise ramp over a [[t, [r,g,b]], ...] track, straight into a Color. */
function vecAt(track, t, out) {
  const v = ease.track(track, t, ease.smooth);
  return out.setRGB(v[0], v[1], v[2]);
}

// ===========================================================================
// Terrain
// ===========================================================================

const SAND_STEP = PLATE; // the dunes terrace one plate at a time

/**
 * Sand tones, shadowed trough to sunlit crest. A *discrete* palette matters:
 * Bricks merges by material, so a continuous colour ramp would cost one draw
 * call per cell. These are deliberately dark — two suns and a hemisphere light
 * take them most of the way to white on their own.
 */
const SAND = [
  0x59401f, 0x684c28, 0x775a33, 0x866940, 0x96794e, 0xa6895d, 0xb69a6e, 0xc6ab80, 0xd4bb92, 0xdfc9a4,
];

function sandTone(u) {
  const i = Math.round(ease.clamp(u, 0, 1) * (SAND.length - 1));
  return SAND[i];
}

/** Deterministic 2-D value noise on an integer lattice, in [0,1]. Pure. */
function vnoise2(x, z, salt = 0) {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const fx = x - xi;
  const fz = z - zi;
  const u = fx * fx * (3 - 2 * fx);
  const v = fz * fz * (3 - 2 * fz);
  const at = (a, c) => hash11(a * 7919 + c * 104729, salt);
  const a0 = at(xi, zi);
  const a1 = at(xi + 1, zi);
  const b0 = at(xi, zi + 1);
  const b1 = at(xi + 1, zi + 1);
  const lo = a0 + (a1 - a0) * u;
  const hi = b0 + (b1 - b0) * u;
  return lo + (hi - lo) * v;
}

/**
 * The dune field, as an explicit train of crests keyed on -z, so the track
 * reads front-to-back away from the lens.
 *
 * Isotropic noise on its own will not do this. Noise gives you a lumpy plain:
 * from a near-level lens two units off the sand every lump is foreshortened
 * into nothing and the whole field flattens into a floor. A dune field reads
 * because *crest lines* stack up between the lens and the horizon and occlude
 * each other, so they are placed by hand:
 *
 *   z ≈ +30   the rim the camera stands on
 *   z ≈ −30   the pan the pod ploughed into and the droids walk out of
 *   z ≈ −88   the first crest, the one they are silhouetted against
 *   z ≈ −140  the crest the sandcrawler comes over
 *   z ≈ −230  and beyond, successive lines building to the horizon
 */
const DUNE_TRAIN = [
  [-140, 1.0],
  [-52, 6.4],
  [-28, 5.4],
  [0, 0.6],
  [24, -2.2],
  [52, -2.8],
  [74, -1.4],
  [104, 5.2],
  [126, 2.6],
  [146, 1.8],
  [186, 8.0],
  [214, 4.6],
  [240, 3.8],
  [300, 11.0],
  [360, 7.0],
  [440, 13.0],
  [700, 16.0],
];

function duneProfile(x, z) {
  // Warp the depth the track is sampled at, rather than adding a height on
  // top: that bends each crest line into a slow S across the frame instead of
  // ruling it straight, which is the difference between a dune field and a
  // flight of terraces.
  const warp = (vnoise2(x * 0.0115 + 3, z * 0.0035 + 11, 71) - 0.5) * 46;
  const warp2 = (vnoise2(x * 0.031 + 17, z * 0.011 + 5, 73) - 0.5) * 13;
  return ease.track(DUNE_TRAIN, -z + warp + warp2, ease.smooth);
}

/**
 * The farm sits in a shallow basin, with the desert climbing away on every
 * side. A flat pan out to the horizon reads as a table top; a rim gives the
 * skyline something to do and puts the homestead somewhere specific.
 */
const FARM_BASIN = [
  [0, 0],
  [42, 0.5],
  [92, 4.2],
  [170, 9.0],
  [300, 14.0],
  [600, 18.0],
];
function farmProfile(x, z) {
  const d = Math.sqrt(x * x + z * z);
  const wander = (vnoise2(x * 0.0135 + 5, z * 0.0135 + 9, 83) - 0.5) * 44;
  return ease.track(FARM_BASIN, d + wander, ease.smooth);
}

/**
 * The 1-D profile of the sunset ridge, in world units, keyed on -z so the
 * track reads front-to-back: the lens sits on the near rim at z ≈ +28, the
 * ground dips into a trough, rises to the crest he stands on at z ≈ -21, and
 * then falls away to nothing so there is only sky behind him.
 */
// The crest is a *table*, not a peak: flat from -z 24 to 36 with the whole
// climb packed in front of it. A single summit at the point he stands on means
// the lateral warp only has to shift the profile a few units for the ground
// just this side of him to come up over his knees, and a man cut off at the
// waist by his own dune is not a silhouette.
const RIDGE = [
  [-200, 6.4],
  [-42, 5.8],
  [-34, 5.4],
  [-24, 1.6],
  [-2, -1.4],
  [14, -0.9],
  [24, 2.6],
  [30, 3.5],
  [42, 3.7],
  [56, 1.0],
  [86, -12.0],
  [160, -50.0],
  [400, -170.0],
];
function ridgeProfile(x, z) {
  // Same trick as the dune field: the crest line is bent in depth rather than
  // in height, so the skyline meanders instead of ruling straight across the
  // frame. Everything here stays shallow — the crest only has to clear the
  // lens by a couple of units, and any more gradient turns the plate courses
  // into a flight of stairs.
  // Both terms are kept small on purpose. The crest is the skyline a figure
  // stands on, and every unit of lateral wander here is a unit of height
  // somewhere along the climb up to it — enough of it and the sand a few paces
  // this side of him comes up over his knees and eats the silhouette.
  const warp = (vnoise2(x * 0.0135 + 41, z * 0.004 + 8, 71) - 0.5) * 14;
  const lift = (vnoise2(x * 0.037 + 13, z * 0.016 + 2, 77) - 0.5) * 0.55;
  return ease.track(RIDGE, -z + warp, ease.smooth) + lift;
}

/**
 * A patch of desert: a height function plus a builder for the brick mesh that
 * realises it. Everything that stands on the sand asks `cellY` where the top
 * of its cell is, so nothing ever floats or sinks.
 *
 * @param {number} opts.ox,oz  offset into the noise: a different stretch of
 *                             the same desert
 * @param {number} opts.amp    scales the two long dune octaves
 * @param {number} opts.grain  scales the two short ones. Keep this low: fine
 *                             noise on a plate-quantised surface turns every
 *                             cell into its own step and the sand reads as
 *                             coursed masonry instead of stacked plates.
 * @param {number} opts.flatR  radius of a flattened pan at the origin
 * @param {Function} opts.profile  extra shaping, added on top
 */
function desert({ ox = 0, oz = 0, amp = 1, grain = 0.5, ripple = 0, flatR = 0, flatY = 0, profile = null } = {}) {
  // Four octaves: long transverse ridges, a medium swell, and two fine ones.
  // Amplitudes and periods are chosen so the worst-case gradient stays under
  // about 1:3 — steeper than that and the plate courses read as walls. The two
  // fine octaves exist to break up the quantisation: without them every
  // terrace contour is a ruled line running clean across the frame.
  const flatten = (x, z, h) => {
    if (flatR <= 0) return h;
    const d = Math.sqrt(x * x + z * z);
    return ease.lerp(flatY, h, ease.smooth(ease.clamp((d - flatR) / (flatR * 0.9), 0, 1)));
  };

  // The dune shapes on their own, with none of the grain. The painted shading
  // is sampled from this rather than from `raw`: run the gradient over the
  // fine octaves too and the modelling breaks up into a chequerboard of light
  // and dark cells instead of following the slopes.
  const broad = (x, z) => {
    const X = x + ox;
    const Z = z + oz;
    let h =
      (vnoise2(X * 0.0062, Z * 0.0088, 3) - 0.5) * 7.0 * amp +
      (vnoise2(X * 0.016 + 5, Z * 0.020 + 3, 16) - 0.5) * 3.4 * amp;
    if (profile) h += profile(x, z);
    return flatten(x, z, h);
  };

  const raw = (x, z) => {
    const X = x + ox;
    const Z = z + oz;
    // Wind ripples, running across the sun's bearing. They are only a plate
    // deep, but their risers are the one thing on an otherwise blank pan that
    // faces the light squarely, and they are what stops a flat stretch of
    // sand from reading as a tiled floor.
    const rip =
      ripple === 0
        ? 0
        : Math.sin((X * SUN_DX + Z * SUN_DZ) * 0.29 + vnoise2(X * 0.009, Z * 0.009, 51) * 7.0) * ripple;
    const fine =
      rip +
      (vnoise2(X * 0.052 + 21, Z * 0.044 + 17, 44) - 0.5) * 2.1 * grain +
      (vnoise2(X * 0.125 + 9, Z * 0.104 + 7, 27) - 0.5) * 0.55 * grain;
    return broad(x, z) + flatten(x, z, fine) - flatten(x, z, 0);
  };
  const y = (x, z) => Math.round(raw(x, z) / SAND_STEP) * SAND_STEP;
  // Cells are laid on a global grid, so this is exactly the surface a figure
  // standing at (x, z) has under its feet.
  const cellY = (x, z, cell = 4) =>
    y((Math.floor(x / cell) + 0.5) * cell, (Math.floor(z / cell) + 0.5) * cell);

  return { raw, broad, y, cellY, mesh: (opts) => buildSandMesh(y, raw, broad, opts) };
}

/**
 * The sand, as concentric rings of stacked brick courses.
 *
 * Each cell is one box whose top is quantised to a whole plate, so the dunes
 * terrace the way a real LEGO landscape does instead of reading as a smooth
 * mesh. Rings share one global grid and get coarser with distance.
 *
 * The tone has to be painted on, because every top face shares a normal and
 * the light cannot tell one cell from the next. It is sampled from the
 * *unquantised* height: taking it from the terraced surface instead lines the
 * colour bands up with the plate courses and the whole field reads as a
 * patchwork quilt rather than as sand.
 *
 * Studs are far too expensive to lay everywhere — sixteen cylinders per cell
 * across three thousand cells — so `studsAt` marks one patch of ground near
 * the lens that gets them, and everything else is smooth tile.
 */
function buildSandMesh(heightAt, rawAt, broadAt, { rings, studsAt = null, base = -60 } = {}) {
  const b = new Bricks({ studSegments: 5 });
  const [sx, sz, sr] = studsAt || [0, 0, -1];
  const sr2 = sr * sr;

  for (let r = 0; r < rings.length; r++) {
    const { cell, half } = rings[r];
    const inner = r === 0 ? 0 : rings[r - 1].half;
    const n = Math.round(half / cell);
    const nIn = Math.round(inner / cell);
    for (let i = -n; i < n; i++) {
      for (let j = -n; j < n; j++) {
        // Leave the hole that the finer ring inside this one already fills.
        if (i >= -nIn && i < nIn && j >= -nIn && j < nIn) continue;
        const x = i * cell;
        const z = j * cell;
        const cx = x + cell / 2;
        const cz = z + cell / 2;
        const y = heightAt(cx, cz);
        // Painted modelling, and it has to carry the whole shape of the field.
        // Every cell's top face shares one normal, so no amount of key light
        // will tell a windward slope from a lee one: the dunes only read
        // because the tone is sampled from the gradient *along the sun
        // bearing* and baked into the colour. Ground that climbs toward the
        // suns is tilted away from them, so it goes dark.
        const smoothY = broadAt(cx, cz);
        const up = broadAt(cx + SUN_DX * 11, cz + SUN_DZ * 11);
        const down = broadAt(cx - SUN_DX * 11, cz - SUN_DZ * 11);
        // A gentle transfer, not a hard one: divide by too little and a whole
        // dune flank saturates to one tone, which reads as a painted wall
        // rather than as a slope.
        const slope = ease.clamp((down - up) / 6.2 + 0.5, 0, 1);
        // Height pales the sand as well, which both stands in for aerial
        // perspective and puts a bright lip on every crest line.
        const lift = ease.clamp(smoothY / 17 + 0.42, 0, 1);
        // A little grain in the tone as well, so the bands are not perfectly
        // clean edges across a whole crest.
        const speck = (rawAt(cx, cz) - smoothY) * 0.055;
        // Studs on a scattered third of the near cells only. A solid studded
        // disc reads as corrugated iron; a patchy one reads as sand with
        // plates laid in it, and costs a third of the cylinders.
        const studs =
          sr > 0 &&
          (cx - sx) * (cx - sx) + (cz - sz) * (cz - sz) < sr2 &&
          hash11(i * 137 + j * 31, 63) < 0.34;
        b.box(x, base / PLATE, z, cell, cell, (y - base) / PLATE, sandTone(lift * 0.42 + slope * 0.58 + speck), {
          studs,
          finish: 'rubber', // sand has no specular sheen; plastic reads as wet
        });
      }
    }
  }
  const mesh = b.build({ castShadow: false });
  mesh.receiveShadow = true;
  mesh.traverse((n) => {
    if (n.isMesh) n.receiveShadow = true;
  });
  return matte(mesh);
}

/**
 * Strip every specular highlight out of a built object.
 *
 * Sand, adobe and a flagged courtyard are the surfaces in this scene that must
 * have none at all. Even at roughness 0.92 the standard material keeps a
 * Fresnel lobe, and with a sun this low that lobe draws a mirror path straight
 * up the frame: the ground stops reading as dry desert and starts reading as
 * a lake, and with the bloom threshold at 0.62 it smears. Lambert has no
 * specular term whatsoever and its diffuse response is identical.
 */
function matte(obj) {
  obj.traverse((n) => {
    if (!n.isMesh) return;
    const src = n.material;
    if (!src.isMeshStandardMaterial) return;
    n.material = new THREE.MeshLambertMaterial({ color: src.color, fog: true });
    src.dispose();
  });
  return obj;
}

/** The furrow the pod ploughed in, and the debris it shed doing it. */
function buildScorchTrail(ground, from, to) {
  const b = new Bricks({ studSegments: 5 });
  const N = 24;
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1);
    const x = ease.lerp(from[0], to[0], u);
    const z = ease.lerp(from[1], to[1], u);
    const w = 9 - u * 4.5;
    const y = ground.cellY(x, z);
    b.push();
    b.translateWorld(x, y, z);
    b.rotateY(Math.atan2(to[0] - from[0], to[1] - from[1]));
    b.box(-w / 2, -1, -3, w, 6, 2, i % 3 ? 0x6b4c33 : 0x7d5b3c, { studs: false, finish: 'rubber' });
    b.pop();
  }
  // Panels and plates thrown clear of the impact.
  for (let i = 0; i < 12; i++) {
    const x = from[0] + (hash11(i, 81) - 0.5) * 30;
    const z = from[1] + 6 + hash11(i, 82) * 34;
    const y = ground.cellY(x, z);
    b.push();
    b.translateWorld(x, y, z);
    b.rotateY(hash11(i, 83) * 3.14);
    b.box(0, 0, 0, 1 + hash11(i, 84) * 2, 1 + hash11(i, 85) * 2, 1, i % 2 ? COLORS.darkBluishGray : 0x8e7a5c, {
      finish: 'rubber',
    });
    b.pop();
  }
  return b.build();
}

/**
 * Weathered rock outcrops. Each is a small pile of chamfered slabs, tilted and
 * stacked — enough to put a hard, dark edge on a horizon that would otherwise
 * be nothing but sand.
 */
function buildRocks(ground, sites) {
  const b = new Bricks({ studSegments: 5 });
  const TONES = [0x6b5238, 0x7a5f42, 0x584431];
  for (let s = 0; s < sites.length; s++) {
    const [x, z, scale] = sites[s];
    const y = ground.cellY(x, z);
    // A tapering stack, each slab overlapping the one under it and the whole
    // pile sunk a course into the sand. Scattered slabs with air between them
    // read as boxes dropped on a floor; this reads as rock coming through it.
    for (let i = 0; i < 4; i++) {
      const k = s * 11 + i;
      const taper = 1 - i * 0.19;
      const w = (5.6 + hash11(k, 91) * 3.8) * scale * taper;
      const d = (5.0 + hash11(k, 92) * 4.0) * scale * taper;
      const h = (1.0 + hash11(k, 93) * 0.8) * scale;
      b.push();
      b.translateWorld(
        x + (hash11(k, 94) - 0.5) * 1.6 * scale * i,
        y - 1.4 * scale + i * h * 0.82,
        z + (hash11(k, 95) - 0.5) * 1.6 * scale * i
      );
      b.rotateY(hash11(k, 96) * 3.14);
      b.addGeometry(chamferBox(w, h, d, 0.3 * scale), {
        y: h / 2,
        color: TONES[i % TONES.length],
        opts: { finish: 'rubber' },
      });
      b.pop();
    }
  }
  const mesh = b.build();
  mesh.traverse((n) => {
    if (n.isMesh) n.castShadow = true;
  });
  return mesh;
}

// ===========================================================================
// The moisture farm
// ===========================================================================

/**
 * The Lars homestead: a domed entrance on the far rim of a sunken courtyard, a
 * curved retaining wall, moisture vaporators and the clutter of a working farm.
 */
function buildHomestead(ground) {
  const g = new THREE.Group();
  const b = new Bricks({ studSegments: 8 });
  // Deliberately dull for LEGO tan. The bloom threshold sits at 0.62, and a
  // pale wall taking a low sun square-on runs straight past it: the studded
  // top course smears into a bar of light halfway up the frame.
  const wall = 0xb99a70;
  const wallDark = 0x957c5a;

  // --- the courtyard floor, one plate proud of the sand
  for (let i = -8; i < 8; i++) {
    for (let j = -8; j < 8; j++) {
      const x = i * 2;
      const z = j * 2;
      if (x * x + z * z > 210) continue;
      b.tile(x, 0, z, 2, 2, (i + j) % 2 ? 0xab8f68 : 0xb69a72);
    }
  }

  // --- the retaining wall: a ring of brick courses, open toward the lens
  for (let a = 0; a < 46; a++) {
    const ang = (a / 46) * Math.PI * 2;
    // Leave the quadrant nearest the camera open so we can see in.
    if (Math.sin(ang) > 0.30 && Math.cos(ang) > 0.20) continue;
    const r = 15.0;
    b.push();
    b.translateWorld(Math.cos(ang) * r, 0, Math.sin(ang) * r);
    b.rotateY(-ang);
    const courses = 3 + Math.floor(hash11(a, 12) * 2);
    for (let c = 0; c < courses; c++) b.box(-1.3, c * 3, -1.3, 2.6, 2.6, 3, c % 2 ? wall : wallDark);
    b.pop();
  }

  // --- the domed entrance on the far rim.
  // Stacked discs of decreasing radius, the way a LEGO dome is actually
  // built. The number of courses is the whole game: with twenty thin ones the
  // tread of each step is far wider than its riser and the thing reads as an
  // amphitheatre, so it gets seven fat ones instead, where the riser wins.
  const DOME = { x: -14, z: -16, R: 6.6, H: 8.4, courses: 7 };
  b.cyl(DOME.x, -1, DOME.z, DOME.R * 1.12, 4, wallDark, { segments: 28 }); // base flare
  for (let s = 0; s < DOME.courses; s++) {
    const u = (s + 0.5) / DOME.courses;
    const r = DOME.R * Math.sqrt(Math.max(0.02, 1 - u * u));
    b.cyl(DOME.x, (s * DOME.H) / DOME.courses / PLATE, DOME.z, r, DOME.H / DOME.courses / PLATE, s % 2 ? wall : wallDark, {
      segments: 28,
    });
  }
  b.sphere(DOME.x, DOME.H / PLATE, DOME.z, DOME.R * 0.30, wall, { segments: 18 });
  // The entrance: a porch pushed out of the front of the dome toward the
  // courtyard, with a dark mouth and a lintel over it.
  b.box(DOME.x - 2.7, 0, DOME.z + 4.4, 5.4, 3.6, 12, wall, { studs: false });
  b.box(DOME.x - 1.9, 0, DOME.z + 3.9, 3.8, 3.2, 9, 0x140f0b, { studs: false });
  b.cyl(DOME.x, 12, DOME.z + 5.6, 2.7, 2, wallDark, { segments: 18 });

  // --- a low equipment shed and a stack of crates on the far side
  b.box(12, 0, -12, 8, 9, 8, wallDark);
  b.slope(12, 8, -12, 8, 9, 3, wallDark, { dir: '+z' });
  for (const [cx, cz, cy] of [[-12, -3, 0], [-12, -3, 3], [-12, -6.5, 0], [-8.5, -5, 0]]) {
    b.box(cx, cy, cz, 3, 3, 3, cy ? COLORS.darkTan : COLORS.reddishBrown);
  }
  g.add(matte(b.build()));

  // --- vaporators, kept off the lens axis so they flank the courtyard rather
  // than growing out of anybody's head
  for (const [x, z, s] of [
    [-40, -28, 1.0],
    [-6, -64, 0.86],
    [30, -46, 0.78],
  ]) {
    const v = buildVaporator();
    v.position.set(x, ground.cellY(x, z), z);
    v.scale.setScalar(s);
    v.rotation.y = hash11(Math.abs(x) | 0, 17) * 3.14;
    g.add(v);
  }
  return g;
}

/**
 * One moisture vaporator: a base, a mast, and a fluted condenser head. Pale
 * grey rather than metal — a mirror finish at this size just reads as a black
 * stick against a bright sky.
 */
function buildVaporator() {
  const b = new Bricks({ studSegments: 10 });
  const shell = COLORS.lightBluishGray;
  const dark = COLORS.darkBluishGray;
  // Squat and solid, not a lamp post: a wide condenser barrel wearing its
  // vanes carries most of the height, and the cap is small. A thin mast under
  // a big dark head reads as street furniture from any distance.
  b.cyl(0, 0, 0, 2.6, 2, COLORS.darkTan, { segments: 16 });
  b.cyl(0, 2, 0, 2.0, 3, dark, { segments: 16 });
  b.cyl(0, 5, 0, 1.5, 17, shell, { segments: 16 });
  // Six condenser vanes standing off the barrel.
  for (let i = 0; i < 6; i++) {
    b.push();
    b.rotateY((i / 6) * Math.PI * 2 + 0.26);
    b.addGeometry(chamferBox(0.34, 5.6, 1.5, 0.06), { x: 0, y: 4.6, z: 1.85, color: shell });
    b.pop();
  }
  b.cyl(0, 22, 0, 1.9, 2, dark, { segments: 16 });
  b.cone(0, 24, 0, 1.9, 1.1, 3, shell, { segments: 16 });
  b.cyl(0, 27, 0, 0.34, 4, dark, { segments: 8 });
  b.cyl(0, 31, 0, 0.7, 1, shell, { segments: 10 });
  return b.build();
}

// ===========================================================================
// Sky
// ===========================================================================

/**
 * A back-side dome carrying the whole sky: a two-stop vertical gradient, a
 * horizon haze band, a warm bloom around each sun and the two sun discs
 * themselves. Drawing the suns in the shader rather than as flare sprites
 * costs nothing, keeps them perfectly round, and lets them run well over 1.0
 * so the bloom pass catches them.
 *
 * The tone-mapping and colour-space chunks are included by hand so the sky
 * goes through exactly the same transfer as every lit surface in the frame.
 */
function buildSky() {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uHigh: { value: new THREE.Color(0x3f7fb8) },
      uLow: { value: new THREE.Color(0xdcc79c) },
      uHaze: { value: new THREE.Color(0xb08a52) },
      uHazeGain: { value: 0.4 },
      uSunA: { value: new THREE.Vector3(0, 0.6, -1) },
      uSunB: { value: new THREE.Vector3(0, 0.6, -1) },
      uDiscA: { value: new THREE.Vector3(3, 3, 3) },
      uDiscB: { value: new THREE.Vector3(3, 3, 3) },
      uRadA: { value: 0.04 },
      uRadB: { value: 0.024 },
      uRamp: { value: 1.0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uHigh, uLow, uHaze, uSunA, uSunB, uDiscA, uDiscB;
      uniform float uHazeGain, uRadA, uRadB, uRamp;
      varying vec3 vDir;

      // Halo plus a hard limb, in one term. The wide part of the glow is left
      // to the bloom pass; putting it in here as well just fogs the sky.
      vec3 sun(vec3 d, vec3 dir, vec3 disc, float rad, vec3 haze) {
        float c = clamp(dot(d, dir), -1.0, 1.0);
        float ang = acos(c);
        float limb = 1.0 - smoothstep(rad * 0.93, rad * 1.03, ang);
        // Deliberately tight. A wide halo here fogs a quarter of the sky and
        // merges the two suns into one smear; the broad glow is the bloom
        // pass's job, not this one's.
        float halo = pow(max(0.0, c), 900.0) * 0.8 + pow(max(0.0, c), 260.0) * 0.30;
        return disc * limb + haze * halo;
      }

      void main() {
        vec3 d = normalize(vDir);
        // Bias the ramp below the horizon so the sand meets sky colour, and
        // climb it fast. These are wide, low shots: the top of frame is barely
        // twenty degrees up, and at a gentle gradient the whole visible sky is
        // the horizon stop and the picture has no colour in it at all.
        float h = clamp(d.y * 1.9 + 0.07, 0.0, 1.0);
        // The exponent is driven from the clock. A straight lerp from warm
        // sand to blue runs through grey, so by day it is pushed high and the
        // sand colour holds most of the sky; at sunset it drops and lets the
        // violet come a long way down.
        vec3 c = mix(uLow, uHigh, pow(h, uRamp));
        // A band of dust sitting on the horizon, brightest toward the suns.
        float band = exp(-abs(d.y) * 13.0);
        float toward = max(0.0, dot(normalize(vec3(d.x, 0.0, d.z)), normalize(vec3(uSunA.x, 0.0, uSunA.z))));
        c += uHaze * band * uHazeGain * (0.35 + 0.65 * pow(toward, 2.0));
        c += sun(d, uSunA, uDiscA, uRadA, uHaze * uHazeGain);
        c += sun(d, uSunB, uDiscB, uRadB, uHaze * uHazeGain * 0.6);
        // Break up the banding a flat gradient always shows at 8 bits.
        c += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.004;
        gl_FragColor = vec4(max(c, 0.0), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(2400, 48, 32), mat);
  mesh.renderOrder = -20;
  mesh.frustumCulled = false;
  return {
    mesh,
    set(o) {
      const u = mat.uniforms;
      u.uHigh.value.copy(o.high);
      u.uLow.value.copy(o.low);
      u.uHaze.value.copy(o.haze);
      u.uHazeGain.value = o.hazeGain;
      u.uSunA.value.copy(o.sunA);
      u.uSunB.value.copy(o.sunB);
      u.uDiscA.value.set(o.discA.r, o.discA.g, o.discA.b);
      u.uDiscB.value.set(o.discB.r, o.discB.g, o.discB.b);
      u.uRadA.value = o.radiusA;
      u.uRadB.value = o.radiusB;
      u.uRamp.value = o.ramp;
    },
  };
}

// ===========================================================================
// Stand-ins, in case ships-capital.js is not there yet
// ===========================================================================

async function loadCapitalShips() {
  try {
    return await import('../kit/ships-capital.js');
  } catch {
    return null;
  }
}

/** Stand-in escape pod: ~10 units long, +z forward. */
function fallbackPod() {
  const root = new THREE.Group();
  const b = new Bricks({ studSegments: 8 });
  const G = { finish: 'glossy' };
  b.addGeometry(new THREE.CylinderGeometry(2.2, 2.3, 5.0, 20), {
    x: 0, y: 0, z: -0.6, rot: [Math.PI / 2, 0, 0], color: COLORS.white, opts: G,
  });
  b.addGeometry(new THREE.CylinderGeometry(1.1, 2.2, 2.6, 20), {
    x: 0, y: 0, z: 3.1, rot: [Math.PI / 2, 0, 0], color: COLORS.lightBluishGray, opts: G,
  });
  for (const z of [-2.9, -1.3, 0.4]) {
    b.addGeometry(new THREE.TorusGeometry(2.26, 0.19, 8, 20), {
      x: 0, y: 0, z, color: COLORS.darkBluishGray, opts: { finish: 'metal' },
    });
  }
  for (let i = 0; i < 4; i++) {
    b.push();
    b.rotateZ((i / 4) * Math.PI * 2 + 0.4);
    b.addGeometry(chamferBox(0.7, 0.7, 2.4, 0.06), { x: 0, y: 1.2, z: -3.6, color: COLORS.darkBluishGray, opts: G });
    b.pop();
  }
  root.add(b.build());
  root.userData.box = new THREE.Box3().setFromObject(root);
  return root;
}

/** Stand-in sandcrawler: a tan wedge on two tread blocks, ~33 studs long. */
function fallbackCrawler() {
  const root = new THREE.Group();
  const b = new Bricks({ studSegments: 6 });
  const body = COLORS.tan;
  const trim = COLORS.darkTan;
  const dark = COLORS.reddishBrown;

  for (let i = 0; i < 8; i++) {
    const w = 11 * (1 - i * 0.026);
    b.box(-w, 11 + i * 4, -15 - i * 0.5, w * 2, 27.6 + i * 1.3, 4, i > 5 ? trim : body, { studs: false });
  }
  b.panel(-9, 14, 13, 18, 0.8, 26, dark);
  for (const sx of [-1, 1]) {
    b.box(sx * 8 - (sx > 0 ? 2.3 : 0), 0, -12, 4.6, 24, 11, COLORS.trueBlack, { studs: false });
    for (let i = 0; i < 8; i++) {
      b.panel(sx * 8 - (sx > 0 ? 2.6 : -0.3), 1 + (i % 2) * 4, -12 + i * 3, 5.2, 2.2, 3, COLORS.darkBluishGray);
    }
  }
  for (let i = 0; i < 6; i++) {
    b.panel(-8 + i * 3.2, 34, 14.6, 2, 0.8, 3, COLORS.transYellow, {
      emissive: 0xffd76a, emissiveIntensity: 1.6, finish: 'trans',
    });
  }
  root.add(b.build());
  root.userData.rollTracks = () => {};
  root.userData.box = new THREE.Box3().setFromObject(root);
  return root;
}
