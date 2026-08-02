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
const HOLO_THROW = 1.15;

// --- the two suns -----------------------------------------------------------
// Both ride the same azimuth band all scene and only lose altitude. The second
// is smaller, hotter and always a little higher, so it is still up when the
// first has gone: "two suns that never quite set together".
const SUN_A_AZ = -0.30; // radians east of the -z meridian
const SUN_B_AZ = 0.10;
const SUN_B_LIFT = 0.062; // radians the second sun runs above the first
const SUN_ELEV = [
  [0, 0.46],
  [T_CRAWLER, 0.40],
  [T_FARM, 0.235],
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
  const dunes = desert({ ox: 0, oz: 0, amp: 1.45 });
  duneSet.add(
    dunes.mesh({
      rings: [
        { cell: 3, half: 48 },
        { cell: 12, half: 240 },
        { cell: 48, half: 720 },
      ],
      studsAt: [12, -18, 56], // studded plates only where the lens gets close
    })
  );

  // --- the wreck -----------------------------------------------------------
  const POD_AT = [20, -50];
  const pod = ships?.buildEscapePod ? await ships.buildEscapePod() : fallbackPod();
  fitHeight(pod, 7.0); // about two and a half minifigures across the hull
  // Nose down and half-buried: it ploughed in rather than landed.
  pod.rotation.set(-0.30, 2.42, 0.22);
  pod.position.set(POD_AT[0], dunes.cellY(POD_AT[0], POD_AT[1]) - 1.6, POD_AT[1]);
  duneSet.add(pod);
  duneSet.add(buildScorchTrail(dunes, POD_AT, [66, -104]));
  // A few outcrops so the horizon has something other than sand on it.
  duneSet.add(
    buildRocks(dunes, [
      [-46, -96, 1.5],
      [-88, -58, 1.1],
      [62, -46, 0.9],
      [-18, -150, 1.8],
      [96, -150, 1.6],
      [24, -196, 2.2],
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
  const farmGround = desert({ ox: 1900, oz: -1300, amp: 0.55, flatR: 34, flatY: 0 });
  farmSet.add(
    farmGround.mesh({
      rings: [
        { cell: 4, half: 40 },
        { cell: 16, half: 176 },
        { cell: 64, half: 640 },
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
  const holoMat = hologramMaterial(0x7fe8ff, { opacity: 0.55, scan: 16 });
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
  const holoBeam = new Beam({ color: 0x7fe8ff, radiusTop: 0.85, radiusBottom: 0.1, height: 2.4, opacity: 0.16 });
  farmSet.add(holoBeam.object);

  // Cyan bounce on whoever is leaning into it.
  const holoLight = new THREE.PointLight(0x66d8ff, 0, 14, 2);
  farmSet.add(holoLight);
  const holoGlow = glowSprite(0x9feaff, 3.0, 0);
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
  const ridge = desert({ ox: -2400, oz: 800, amp: 0.2, grain: 0.3, profile: ridgeProfile });
  ridgeSet.add(
    ridge.mesh({
      rings: [
        { cell: 3, half: 48 },
        { cell: 12, half: 240 },
        { cell: 48, half: 528 },
      ],
      studsAt: [0, -6, 46],
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
  const SKY_HIGH = [
    [0, 0x3f7fb8],
    [T_FARM, 0x315e94],
    [T_SUNSET, 0x4a2c66],
    [T_TURN, 0x341a48],
    [40, 0x160a22],
  ];
  const SKY_LOW = [
    [0, 0xbaa47c],
    [T_FARM, 0xb98a5c],
    [T_SUNSET, 0xe0701e],
    [T_TURN, 0xcb3f14],
    [40, 0x45150b],
  ];
  const HAZE = [
    [0, 0x6f5634],
    [T_FARM, 0x8c4c1c],
    [T_SUNSET, 0xc44e10],
    [T_TURN, 0x96280a],
    [40, 0x260a05],
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
      hazeGain: 0.3 + low * 1.15,
    });

    // Haze takes the horizon colour so the dunes dissolve into the sky.
    fogCol.copy(skyLow).lerp(skyHigh, 0.22);
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
    // the bounce off all that sand: it is what keeps a backlit hull from
    // going to a flat black shape.
    lights.rim.intensity = ease.lerp(0.85, 0.95, dusk) * (1 - night * 0.4);
    lights.hemi.intensity = ease.lerp(0.62, 0.34, dusk) * (1 - night * 0.5);
    lights.hemi.color.copy(skyLow);
    lights.hemi.groundColor.setHex(0x8a6337).lerp(_col(0x3a2016), dusk);
    if (lights.ambient) lights.ambient.intensity = ease.lerp(0.14, 0.08, dusk) * (1 - night * 0.5);
  }

  // -------------------------------------------------------------------------
  // Beats 1 and 2 — the dunes
  // -------------------------------------------------------------------------
  function updateDunes(t) {
    scene.fog.near = 110;
    scene.fog.far = 700;

    // --- the droids trudge away from the wreck, out toward the deep desert.
    const walk = ease.clamp(t / T_FARM, 0, 1);
    const px = ease.lerp(10.0, -13.0, walk);
    const pz = ease.lerp(-28.0, -60.0, walk);
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
    const cu = ease.smooth(ease.range(t, T_CRAWLER - 2.0, T_FARM + 2.5));
    const cx = ease.lerp(96, 40, cu);
    const cz = ease.lerp(-176, -96, cu);
    crawler.position.set(cx, dunes.cellY(cx, cz) - crawlerDrop - 2.0, cz);
    // Nosing down the slope, rocking on its suspension.
    crawler.rotation.set(0.045 + Math.sin(t * 0.62) * 0.010, -0.72, Math.sin(t * 0.83) * 0.014);
    rollTracks?.(t * 1.9);
    crawler.visible = t > T_CRAWLER - 2.2;

    dust.object.position.set(cx + 30, dunes.cellY(cx, cz), cz + 26);
    dust.update(t);

    // Jawas swarm ahead of the treads, small and quick against all that hull.
    const jx = cx - 26;
    const jz = cz + 34;
    jawas.object.visible = t > T_CRAWLER - 1.6;
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
      // Very wide, up on a dune: the sand runs off both edges of the frame and
      // the droids are two specks crossing it.
      const a = [36, dunes.y(36, 30) + 5.4, 30];
      const b = [24, dunes.y(24, 14) + 4.4, 14];
      cameraRig(camera, t, {
        pos: [[0, a], [T_CRAWLER, b]],
        look: [[0, [5, 6.6, -58]], [T_CRAWLER, [-3, 5.4, -52]]],
        fov: [[0, 54], [T_CRAWLER, 46]],
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
        look: [[T_CRAWLER, [16, 10, -96]], [T_FARM, [13, 13, -86]]],
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
      holo.scale.setScalar(0.42 * (0.55 + 0.45 * boot));
      holoMat.uniforms.uTime.value = t;
      holoMat.uniforms.uOpacity.value = 0.42 * live;

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

      holoLight.position.copy(holoRig.position);
      holoLight.intensity = 11 * live;
      holoGlow.position.copy(holoLight.position);
      holoGlow.material.opacity = 0.26 * live;
      holoGlow.scale.setScalar(2.4 + 0.25 * Math.sin(t * 5.3));
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
    const z = ease.lerp(-36.0, -28.0, arrive) - leave * 2.0;
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
    cameraRig(camera, t, {
      pos: [
        [T_SUNSET, [5.6, ridge.y(5.6, 32) + 3.2, 32]],
        [T_TURN, [4.0, ridge.y(4.0, 22) + 3.0, 22]],
        [D, [1.6, ridge.y(1.6, 14) + 3.0, 14]],
      ],
      look: [[T_SUNSET, [1.2, 6.2, -28]], [T_TURN, [1.2, 6.0, -28]], [D, [-4.2, 5.8, -29]]],
      fov: [[T_SUNSET, 40], [T_TURN, 29], [D, 27]],
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
const SAND = [0x7e5c39, 0x8b6741, 0x97724a, 0xa47e54, 0xb08a5e, 0xbc9669, 0xc7a276, 0xd1ae84];

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
 * The 1-D profile of the sunset ridge, in world units, keyed on -z so the
 * track reads front-to-back: the lens sits on the near rim at z ≈ +28, the
 * ground dips into a trough, rises to the crest he stands on at z ≈ -21, and
 * then falls away to nothing so there is only sky behind him.
 */
const RIDGE = [
  [-200, 6.4],
  [-42, 5.8],
  [-34, 5.4],
  [-24, 1.6],
  [-2, -1.4],
  [28, 3.0],
  [46, 1.2],
  [86, -12.0],
  [160, -50.0],
  [400, -170.0],
];
function ridgeProfile(x, z) {
  // A slow lateral wander so the skyline is not a ruled line. Everything here
  // is deliberately shallow: the crest only has to clear the lens by a couple
  // of units, and any more gradient than this turns the plate courses into a
  // flight of stairs.
  const wander = (vnoise2(x * 0.014 + 41, 0.5, 71) - 0.5) * 1.9;
  return ease.track(RIDGE, -z, ease.smooth) + wander;
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
function desert({ ox = 0, oz = 0, amp = 1, grain = 0.5, flatR = 0, flatY = 0, profile = null } = {}) {
  // Four octaves: long transverse ridges, a medium swell, and two fine ones.
  // Amplitudes and periods are chosen so the worst-case gradient stays under
  // about 1:3 — steeper than that and the plate courses read as walls. The two
  // fine octaves exist to break up the quantisation: without them every
  // terrace contour is a ruled line running clean across the frame.
  const raw = (x, z) => {
    const X = x + ox;
    const Z = z + oz;
    let y =
      (vnoise2(X * 0.0062, Z * 0.0088, 3) - 0.5) * 15.0 * amp +
      (vnoise2(X * 0.016 + 5, Z * 0.020 + 3, 16) - 0.5) * 5.0 * amp +
      (vnoise2(X * 0.052 + 21, Z * 0.044 + 17, 44) - 0.5) * 2.1 * grain +
      (vnoise2(X * 0.125 + 9, Z * 0.104 + 7, 27) - 0.5) * 0.55 * grain;
    if (profile) y += profile(x, z);
    if (flatR > 0) {
      const d = Math.sqrt(x * x + z * z);
      y = ease.lerp(flatY, y, ease.smooth(ease.clamp((d - flatR) / (flatR * 0.9), 0, 1)));
    }
    return y;
  };
  const y = (x, z) => Math.round(raw(x, z) / SAND_STEP) * SAND_STEP;
  // Cells are laid on a global grid, so this is exactly the surface a figure
  // standing at (x, z) has under its feet.
  const cellY = (x, z, cell = 4) =>
    y((Math.floor(x / cell) + 0.5) * cell, (Math.floor(z / cell) + 0.5) * cell);

  return { raw, y, cellY, mesh: (opts) => buildSandMesh(y, raw, opts) };
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
function buildSandMesh(heightAt, rawAt, { rings, studsAt = null, base = -60 } = {}) {
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
        // Painted modelling: pale climbing to a crest, dark on the lee side.
        const smoothY = rawAt(cx, cz);
        const slope = ease.clamp((smoothY - rawAt(cx, cz - 6)) / 1.6 + 0.5, 0, 1);
        const lift = ease.clamp(smoothY / 26 + 0.45, 0, 1);
        // Studs on a scattered third of the near cells only. A solid studded
        // disc reads as corrugated iron; a patchy one reads as sand with
        // plates laid in it, and costs a third of the cylinders.
        const studs =
          sr > 0 &&
          (cx - sx) * (cx - sx) + (cz - sz) * (cz - sz) < sr2 &&
          hash11(i * 137 + j * 31, 63) < 0.34;
        b.box(x, base / PLATE, z, cell, cell, (y - base) / PLATE, sandTone(lift * 0.66 + slope * 0.34), {
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
  return mesh;
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
    for (let i = 0; i < 5; i++) {
      const k = s * 11 + i;
      const w = (2.4 + hash11(k, 91) * 3.0) * scale;
      const d = (2.0 + hash11(k, 92) * 3.2) * scale;
      const h = (1.6 + hash11(k, 93) * 2.6) * scale;
      b.push();
      b.translateWorld(
        x + (hash11(k, 94) - 0.5) * 5 * scale,
        y - 1 + i * 0.7 * scale,
        z + (hash11(k, 95) - 0.5) * 5 * scale
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
  const wall = 0xd8bd93;
  const wallDark = 0xb2966f;

  // --- the courtyard floor, one plate proud of the sand
  for (let i = -8; i < 8; i++) {
    for (let j = -8; j < 8; j++) {
      const x = i * 2;
      const z = j * 2;
      if (x * x + z * z > 210) continue;
      b.tile(x, 0, z, 2, 2, (i + j) % 2 ? 0xc9ab80 : 0xd2b689);
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
  // Stacked cylinders of decreasing radius: a stepped LEGO dome rather than a
  // sphere, and one part per course instead of forty little blocks.
  const DOME = { x: -3, z: -19, R: 9.0, H: 8.4, courses: 11 };
  for (let s = 0; s < DOME.courses; s++) {
    const u = s / DOME.courses;
    const r = DOME.R * Math.cos((u * Math.PI) / 2.35);
    b.cyl(DOME.x, (u * DOME.H) / PLATE, DOME.z, r, 2.6, s % 2 ? wall : wallDark, { segments: 24 });
  }
  b.cyl(DOME.x, DOME.H / PLATE, DOME.z, DOME.R * 0.16, 2, wall, { segments: 16 });
  // The entrance porch punched into the front of the dome.
  b.box(-6.0, 0, -13.6, 6.0, 4, 15, wallDark, { studs: false });
  b.box(-5.2, 0, -14.2, 4.4, 2.2, 13, 0x18120e, { studs: false });
  b.box(-6.4, 15, -13.9, 6.8, 4.6, 2, wall, { studs: false });

  // --- a low equipment shed and a stack of crates on the far side
  b.box(11, 0, -13, 8, 10, 9, wallDark);
  b.slope(11, 9, -13, 8, 10, 3, wallDark, { dir: '+z' });
  for (const [cx, cz, cy] of [[-12, -3, 0], [-12, -3, 3], [-12, -6.5, 0], [-8.5, -5, 0]]) {
    b.box(cx, cy, cz, 3, 3, 3, cy ? COLORS.darkTan : COLORS.reddishBrown);
  }
  g.add(b.build());

  // --- vaporators: thin towers with a fluted head, scattered out on the sand
  for (const [x, z, s] of [
    [-26, -34, 1.0],
    [19, -38, 0.88],
    [36, -22, 0.74],
    [-38, -16, 0.68],
    [-8, -52, 0.6],
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
  b.cyl(0, 0, 0, 2.2, 2, COLORS.darkTan, { segments: 14 });
  b.cyl(0, 2, 0, 1.4, 3, shell, { segments: 14 });
  b.cyl(0, 5, 0, 0.7, 14, shell, { segments: 12 });
  // The condenser: a stack of collector cones with fins between them.
  b.cone(0, 19, 0, 0.7, 2.1, 5, shell, { segments: 14 });
  b.cyl(0, 24, 0, 2.1, 2, dark, { segments: 16 });
  b.cone(0, 26, 0, 2.1, 0.9, 4, shell, { segments: 16 });
  for (let i = 0; i < 5; i++) {
    b.push();
    b.rotateY((i / 5) * Math.PI * 2);
    b.addGeometry(chamferBox(0.28, 2.6, 1.9, 0.05), { x: 0, y: 8.6, z: 1.15, color: shell });
    b.pop();
  }
  b.cyl(0, 30, 0, 0.5, 3, dark, { segments: 10 });
  b.cyl(0, 33, 0, 0.18, 4, shell, { segments: 8 });
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
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uHigh, uLow, uHaze, uSunA, uSunB, uDiscA, uDiscB;
      uniform float uHazeGain, uRadA, uRadB;
      varying vec3 vDir;

      // Halo plus a hard limb, in one term. The wide part of the glow is left
      // to the bloom pass; putting it in here as well just fogs the sky.
      vec3 sun(vec3 d, vec3 dir, vec3 disc, float rad, vec3 haze) {
        float c = clamp(dot(d, dir), -1.0, 1.0);
        float ang = acos(c);
        float limb = 1.0 - smoothstep(rad * 0.93, rad * 1.03, ang);
        float halo = pow(max(0.0, c), 900.0) * 0.8 + pow(max(0.0, c), 44.0) * 0.22;
        return disc * limb + haze * halo;
      }

      void main() {
        vec3 d = normalize(vDir);
        // Bias the ramp below the horizon so the sand meets sky colour.
        float h = clamp(d.y * 1.15 + 0.09, 0.0, 1.0);
        vec3 c = mix(uLow, uHigh, pow(h, 0.78));
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
