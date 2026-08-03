/**
 * Scene 3 — The Little Droid.
 *
 * Two sets live inside one THREE.Scene and are swapped by visibility: three.js
 * skips meshes *and lights* under an invisible parent, so the half that is not
 * on screen costs nothing and each half can own its own light rig.
 *
 *   interior   white service corridor in the corvette's hold   0.0 .. 18.2s
 *   space      the escape pod's run for the surface           18.2 .. 40.0s
 *
 * The space half is further split into three sub-sets stacked far apart in Y
 * (the pod launch, the Star Destroyer turret, the atmosphere entry) so each
 * shot can be dressed around its own camera without the others intruding.
 *
 * Narration (scene-local seconds):
 *    1.20 –  6.56  "Deep in the hold, the Princess knelt beside a small blue
 *                   and white astromech."
 *    7.05 – 12.62  LEIA     "Everything the Alliance needs is inside you now.
 *                            Do not stop for anyone."
 *   13.02 – 17.46  C-3PO    "Oh, we are doomed. Absolutely, comprehensively
 *                            doomed."
 *   18.56 – 24.96  "An escape pod fell away from the captured ship, carrying
 *                   two droids and the fate of the galaxy."
 *   25.46 – 28.07  OFFICER  "Hold your fire. There are no life forms aboard."
 */
import * as THREE from 'three';
import { Bricks, chamferBox } from '../engine/brick.js';
import { COLORS, KIT } from '../engine/palette.js';
import { standardLights, cameraRig, handheld } from '../engine/stage.js';
import { Starfield, BoltPool, Beam, Thruster, Sparks, glowSprite, additiveMaterial } from '../engine/fx.js';
import { hash11 } from '../engine/rng.js';
import * as ease from '../engine/ease.js';
import { makeLeia, makeAstromech, makeProtocolDroid, makeImperialOfficer } from '../kit/characters.js';

export const meta = { id: 'plans', title: 'The Little Droid', duration: 40, letterbox: 0.105 };

// --- cut points -------------------------------------------------------------
const T_SPEECH = 7.0; // she kneels closer and loads the plans
const T_THREEPIO = 13.0; // cut to the protocol droid fretting
const T_EJECT = 18.2; // cut to space: the pod blows clear
const T_TURRET = 25.0; // cut inside the destroyer's gun position
// The officer's line is done at 28.07. Holding the gun position much past that
// leaves the frame with nothing in it but a man's back and a slow slide, so the
// cut comes early and the time goes to the descent, which has something to look
// at every second of its length.
const T_ENTRY = 31.4; // cut to atmospheric entry

// The data brick leaves her hand here and the droid's panel shuts over it.
const T_SLOT = 9.5;
const T_PANEL = 10.4;

// --- set geometry -----------------------------------------------------------
const HALF_W = 8; // corridor half-width, studs
const ROWS = 7; // wall courses (3 plates each)
const WALL_TOP = ROWS * 3;
const Z0 = -38;
const Z1 = 12;

// The three exterior sub-sets are stacked in Y so they never see each other.
const TURRET_Y = -600;
const ENTRY_Y = -1400;

export async function build(ctx) {
  const D = ctx.duration;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, ctx.aspect, 0.2, 9000);
  scene.background = new THREE.Color(0x090c12);
  // One Fog object for the whole scene, retuned per beat. Swapping fog on and
  // off would force a shader recompile mid-shot.
  scene.fog = new THREE.Fog(0x0a0d12, 40, 150);

  // =========================================================================
  // INTERIOR
  // =========================================================================
  const interior = new THREE.Group();
  scene.add(interior);
  const intLights = standardLights(interior, 'interior', { shadowRadius: 26, shadowMap: 2048 });
  intLights.key.position.set(10, 34, 26);
  intLights.key.intensity = 1.45;
  intLights.fill.intensity = 0.55;
  intLights.hemi.intensity = 0.62;

  // Ceiling practicals: the corridor is lit by its own strip lights, so the
  // deck needs real point sources under them. Kept low — white ABS walls under
  // ACES clip to paper long before the shot looks bright.
  for (const z of [2, -8, -18, -28]) {
    const lamp = new THREE.PointLight(0xffeccd, 6.5, 26, 2);
    lamp.position.set(0, 9.4, z);
    interior.add(lamp);
  }

  // A red emergency lamp on the wall, and the light it throws.
  const alarm = new THREE.PointLight(0xff2a18, 0, 44, 2);
  alarm.position.set(HALF_W - 1.4, 6.6, -11);
  interior.add(alarm);
  const alarmGlow = glowSprite(0xff3b22, 3.4, 0.0);
  alarmGlow.position.copy(alarm.position);
  interior.add(alarmGlow);

  // Warm practical bounce off the deck right where the two of them are.
  const deckLamp = new THREE.PointLight(0xffe6c0, 6, 20, 2);
  deckLamp.position.set(1.4, 5.2, -5.4);
  interior.add(deckLamp);

  // The protocol droid is gold, and gold needs something to reflect. Set back
  // from him so the metal picks up a highlight instead of a blown white face.
  const goldLamp = new THREE.PointLight(0xffe0a0, 3.2, 14, 2);
  goldLamp.position.set(1.6, 4.6, -12.6);
  interior.add(goldLamp);

  // A soft eye light on the camera side of the corridor. Printed minifig faces
  // are flat decals: without a source facing them they go to shadow and the
  // character stops having an expression.
  const faceLamp = new THREE.PointLight(0xf4ecdd, 4.0, 16, 2);
  faceLamp.position.set(-4.0, 5.4, -3.4);
  interior.add(faceLamp);

  interior.add(buildCorridor());

  // --- the cast ------------------------------------------------------------
  const leia = await makeLeia({ seed: 11.3 });
  leia.root.position.set(2.9, 0, -5.5);
  // Just short of square to the droid: the last quarter turn is done by her
  // head, which keeps a printed minifig face pointed at the lens.
  leia.root.rotation.y = -1.58;
  interior.add(leia.root);

  const r2 = await makeAstromech({ seed: 41.3 });
  r2.root.position.set(-0.7, 0, -6.6);
  // Turned a little toward camera as well as toward her, so the card slot on
  // his chest is actually visible when she loads the plans.
  r2.root.rotation.y = 0.78;
  r2.setCenterLeg(1);
  interior.add(r2.root);

  const threepio = await makeProtocolDroid({ seed: 31.5 });
  threepio.root.position.set(-1.4, 0, -15.4);
  threepio.root.rotation.y = 0.30;
  interior.add(threepio.root);

  // --- the plans -----------------------------------------------------------
  // A glowing trans-light-blue tile. It rides in her hand, then flies to the
  // droid's card slot; the position is lerped in world space every frame so
  // nothing is ever re-parented (and so any t can be rendered in isolation).
  const dataBrick = buildDataBrick();
  interior.add(dataBrick.group);

  const slot = new THREE.Group(); // card slot on the droid's chest
  slot.position.set(0, 1.16, 0.60);
  r2.body.add(slot);

  const hatch = buildHatch();
  hatch.position.set(0, 1.16, 0.50);
  r2.body.add(hatch);

  // Dome logic lights, as sprites so they can blink without touching the
  // shared brick materials.
  const domeLights = [glowSprite(0xff4433, 0.34, 0), glowSprite(0x66ddff, 0.34, 0)];
  domeLights[0].position.set(0.18, 0.30, 0.44);
  domeLights[1].position.set(-0.26, 0.24, 0.42);
  for (const s of domeLights) r2.dome.add(s);

  // =========================================================================
  // SPACE
  // =========================================================================
  const space = new THREE.Group();
  space.visible = false;
  scene.add(space);
  const spaceLights = standardLights(space, 'space', { shadows: false });
  // The camera always looks down -z here, so the key needs a strong +z
  // component or every surface we can see is a silhouette.
  spaceLights.key.position.set(0.46, 0.52, 0.72).multiplyScalar(400);
  spaceLights.key.intensity = 3.0;
  spaceLights.fill.position.set(-0.8, -0.2, 0.35).multiplyScalar(400);
  spaceLights.fill.intensity = 0.6;
  spaceLights.rim.position.set(-0.4, 0.5, -0.78).multiplyScalar(400);
  spaceLights.rim.intensity = 1.3;
  spaceLights.hemi.intensity = 0.55;

  const stars = new Starfield({ count: 1300, radius: 900, sizeMax: 3.6 });
  space.add(stars.object);

  const ships = await loadCapitalShips();

  // --- sub-set 1: the launch ----------------------------------------------
  const launchSet = new THREE.Group();
  space.add(launchSet);

  // The corvette hangs high and left, small and white against empty space, so
  // it never has to compete with the destroyer's hull for the eye.
  const CORVETTE_AT = new THREE.Vector3(-78, 64, -212);
  const corvette = ships?.buildCorvette ? await ships.buildCorvette() : fallbackCorvette();
  corvette.scale.setScalar(1.75);
  corvette.position.copy(CORVETTE_AT);
  // Pitched away from the lens: a glossy white deck square-on to the key
  // throws a specular hotspot that blooms into a hole in the frame.
  corvette.rotation.order = 'YXZ';
  corvette.rotation.set(-0.12, -2.35, 0.26);
  launchSet.add(corvette);

  // Scaled to the real 10:1 ratio against the corvette, so the wedge reads as
  // a kilometre and a half of hull rather than a big model. YXZ order lets the
  // three numbers mean heading / pitch / roll about the hull's own axis: it is
  // yawed across the lens and rolled so the lit dorsal plain tips toward us.
  const destroyer = ships?.buildStarDestroyer ? await ships.buildStarDestroyer() : fallbackStarDestroyer();
  destroyer.scale.setScalar(2.4);
  destroyer.position.set(52, 4, -352);
  destroyer.rotation.order = 'YXZ';
  destroyer.rotation.set(0.05, -1.76, -0.42);
  launchSet.add(destroyer);

  // The tractor beam that makes the corvette a *captured* ship: it reaches up
  // out of the destroyer's dorsal plain to the runner above.
  // Built from the projector outwards: Beam is brightest and narrowest at its
  // base, and it is additive with tone mapping off, so anchoring the wide end
  // on the corvette would wrap the ship in a blown white ball.
  const beamFrom = new THREE.Vector3(-14, 22, -320);
  const beamTo = CORVETTE_AT.clone();
  const tractor = new Beam({ color: 0x9fe0ff, radiusTop: 15, radiusBottom: 4, height: beamFrom.distanceTo(beamTo), opacity: 0.05 });
  tractor.object.position.copy(beamFrom);
  tractor.object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), beamTo.clone().sub(beamFrom).normalize());
  launchSet.add(tractor.object);

  // The blow-out at the pod hatch.
  const EJECT_AT = [-68, 58, -204];
  const ejectSparks = new Sparks({
    t0: T_EJECT + 0.16,
    life: 1.5,
    count: 90,
    speed: 34,
    gravity: 0,
    color: 0xffd08a,
    size: 1.9,
    seed: 12,
    origin: EJECT_AT,
    cone: { axis: [-0.85, -0.3, 0.45], spread: 0.55 },
  });
  launchSet.add(ejectSparks.object);
  const ejectFlash = glowSprite(0xfff0c8, 26, 0);
  ejectFlash.position.set(...EJECT_AT);
  launchSet.add(ejectFlash);

  // --- the pod (shared by every exterior beat) -----------------------------
  const podRig = new THREE.Group(); // position/heading
  const podSpin = new THREE.Group(); // tumble, so heading and spin stay separate
  podRig.add(podSpin);
  space.add(podRig);

  const pod = ships?.buildEscapePod ? await ships.buildEscapePod() : fallbackPod();
  podSpin.add(pod);

  const enginePoints = pod.userData.enginePoints?.length
    ? pod.userData.enginePoints
    : [new THREE.Vector3(0, 0, -3.4)];
  const retros = enginePoints.map(
    (p) =>
      new Thruster({
        color: 0xffd9a0,
        radius: 0.5,
        length: 5.5,
        position: [p.x, p.y, p.z],
        dir: [0, 0, -1],
      })
  );
  for (const th of retros) podSpin.add(th.object);

  // Plasma sheath for the atmosphere entry. The shock front rides the hull,
  // but the wake belongs to the flight path, not to the tumbling body.
  const sheath = buildSheath();
  podSpin.add(sheath.group);
  podRig.add(sheath.trail);

  // At turret range the pod is twenty pixels of grey; a halo keeps the eye on
  // it. Scaled by distance so its apparent size never changes.
  const podMarker = glowSprite(0xd8ecff, 1, 0);
  podRig.add(podMarker);

  // --- sub-set 2: the destroyer's gun position -----------------------------
  const turretSet = new THREE.Group();
  turretSet.position.set(0, TURRET_Y, 0);
  turretSet.visible = false;
  space.add(turretSet);
  turretSet.add(buildTurret());

  const console1 = new THREE.PointLight(0x66ff88, 2.6, 14, 2);
  console1.position.set(5.2, 2.2, -2.0);
  turretSet.add(console1);
  // Cold light from outside, so the officer reads as a backlit silhouette.
  const facing = new THREE.PointLight(0xbfd8ff, 12, 40, 2);
  facing.position.set(-3.4, 3.6, -15.0);
  turretSet.add(facing);

  // He stands at the rail, back to us, a shape cut out of the planet. His cap
  // is true black, so against the black of the gun position there is simply
  // nothing there and his head reads as a bare tan cylinder: he is placed in x
  // so that head and cap cross the planet's lit disc, where the peak carries
  // the silhouette. The quarter turn aims that peak into frame rather than
  // straight away from the lens.
  const officer = await makeImperialOfficer({ seed: 19.6 });
  officer.root.position.set(-1.2, 0, -3.6);
  officer.root.rotation.y = Math.PI - 0.62;
  officer.root.scale.setScalar(1.42); // the gun deck is not minifig scale
  turretSet.add(officer.root);

  // The cap is moulded in true black and this room is unlit black as well, so
  // even on the planet's disc the peak has no interior modelling at all and
  // the crown of his head reads as a bare tan cylinder. Lifting it to a very
  // dark blue-grey gives the window light something to sit on. Cloned first:
  // the black glossy material is shared with his belt and with half the set.
  officer.cap?.traverse((n) => {
    if (!n.isMesh) return;
    const mats = Array.isArray(n.material) ? n.material : [n.material];
    n.material = mats.map((m) => {
      if (m.color.getHex() > 0x141414) return m; // the silver cap badge
      const c = m.clone();
      c.color.setHex(0x1f242e);
      return c;
    });
    if (n.material.length === 1) n.material = n.material[0];
  });

  // A cold edge down the window side of him. Point lights fall off with the
  // square of the distance, so this needs a big number to read at all at eight
  // units; it is what separates his shoulder line from the dark of the room.
  const officerRim = new THREE.PointLight(0xa8ccff, 16, 26, 2);
  officerRim.position.set(-6.6, 8.6, -11.0);
  turretSet.add(officerRim);

  const planet = buildPlanet();
  planet.position.set(70, TURRET_Y - 420, -1500);
  space.add(planet);

  // Turbolasers: declared up front, evaluated analytically, and they stop the
  // moment the officer opens his mouth.
  const bolts = new BoltPool({ max: 40, color: KIT.laserGreen, length: 26, width: 0.5, glow: 1.1 });
  space.add(bolts.object);
  for (let i = 0; i < 5; i++) {
    const t0 = T_TURRET + 0.05 + i * 0.34;
    bolts.burst({
      t0,
      n: 2,
      dt: 0.11,
      from: [22 + (i % 2) * 5, TURRET_Y - 6, -14],
      to: [-40 - i * 9, TURRET_Y - 26 - i * 3, -520],
      spread: 46,
      speed: 900,
      seed: i + 3,
    });
  }

  // --- sub-set 3: atmospheric entry ---------------------------------------
  const entrySet = new THREE.Group();
  entrySet.position.set(0, ENTRY_Y, 0);
  entrySet.visible = false;
  space.add(entrySet);
  entrySet.add(buildEntryGround());
  // Kept well down: the dunes' modelling is painted into their colours, and a
  // hot key just washes the whole field to one flat sheet of orange.
  const entryKey = new THREE.DirectionalLight(0xffeacc, 3.6);
  entryKey.position.set(-260, 120, 180);
  entrySet.add(entryKey);
  const entryHemi = new THREE.HemisphereLight(0xffe4c4, 0xd08c56, 2.3);
  entrySet.add(entryHemi);

  // =========================================================================
  // Sound
  // =========================================================================
  ctx.sfx(0.0, 'engine_rumble', { gain: 0.3 });
  ctx.sfx(5.6, 'engine_rumble', { gain: 0.26 });
  ctx.sfx(0.8, 'computer_beeps', { gain: 0.3 });
  ctx.sfx(6.5, 'r2_beeps_a', { gain: 0.6 });
  ctx.sfx(T_SLOT - 0.2, 'hologram_on', { gain: 0.55 });
  ctx.sfx(T_PANEL, 'blast_door_open', { gain: 0.3, rate: 1.4 });
  ctx.sfx(11.4, 'computer_beeps', { gain: 0.45 });
  ctx.sfx(12.5, 'r2_beeps_worried', { gain: 0.6 });
  ctx.sfx(16.9, 'r2_beeps_b', { gain: 0.4 });
  ctx.sfx(T_EJECT + 0.1, 'pod_launch', { gain: 0.95 });
  ctx.sfx(T_EJECT + 0.6, 'engine_rumble', { gain: 0.4 });
  ctx.sfx(T_TURRET + 0.05, 'turbolaser', { gain: 0.8 });
  ctx.sfx(T_TURRET + 0.72, 'turbolaser', { gain: 0.7 });
  ctx.sfx(T_TURRET + 1.4, 'turbolaser', { gain: 0.55 });
  ctx.sfx(T_ENTRY + 0.2, 'engine_rumble', { gain: 0.55, rate: 0.8 });
  ctx.sfx(T_ENTRY + 3.4, 'engine_rumble', { gain: 0.5, rate: 0.75 });

  // =========================================================================
  // Update
  // =========================================================================
  const _v = new THREE.Vector3();
  const _w = new THREE.Vector3();
  const FORWARD = new THREE.Vector3(0, 0, 1);
  const fogColor = new THREE.Color();
  const bgColor = new THREE.Color();
  // Must match the entry sky dome's two stops, or the horizon shows a seam.
  const SKY_HIGH = new THREE.Color(0x6d2f14);
  const SKY_LOW = new THREE.Color(0xe8a35f);

  /**
   * Where the pod is at time t. One curve carries it through all three
   * exterior sub-sets, jumping between them exactly on the cuts.
   */
  const POD_PATH = [
    [T_EJECT, [-68, 58, -204]],
    [T_EJECT + 0.7, [-62, 53, -194]],
    [T_EJECT + 3.2, [-32, 28, -146]],
    [T_TURRET - 0.001, [12, -8, -76]],
    [T_TURRET, [-30, TURRET_Y - 16, -290]],
    [T_ENTRY - 0.001, [-8, TURRET_Y - 64, -980]],
    [T_ENTRY, [-16, ENTRY_Y + 74, -30]],
    [T_ENTRY + 4.6, [12, ENTRY_Y + 30, -108]],
    // Levelling out rather than driving into the sand: the crests stand about
    // sixty units off the troughs, so anything below ENTRY_Y clips them.
    [D, [50, ENTRY_Y + 2, -206]],
  ];
  const podPath = (tt) => ease.track(POD_PATH, tt, ease.smooth);

  return {
    scene,
    camera,
    bloom: { strength: 0.6, radius: 0.65, threshold: 0.72 },
    update(t) {
      const inSpace = t >= T_EJECT;
      interior.visible = !inSpace;
      space.visible = inSpace;

      if (!inSpace) updateInterior(t);
      else updateSpace(t);
    },
  };

  // -------------------------------------------------------------------------
  // Interior
  // -------------------------------------------------------------------------
  function updateInterior(t) {
    // Close fog: the corridor's far end is lit by its own strips, and without
    // this it stacks up into a white wash behind whoever we are shooting.
    scene.background.setHex(0x0e1219);
    scene.fog.color.setHex(0x0e1219);
    scene.fog.near = 12;
    scene.fog.far = 46;

    // Emergency lamp: a slow double pulse, brighter once she starts talking.
    const beat = Math.pow(Math.max(0, Math.sin(t * 1.9)), 3);
    const urgency = 0.55 + 0.45 * ease.range(t, 6.0, 9.0);
    alarm.intensity = (2.5 + 16 * beat) * urgency;
    alarmGlow.material.opacity = (0.16 + 0.7 * beat) * urgency;
    alarmGlow.scale.setScalar(2.6 + 2.4 * beat);
    deckLamp.intensity = 5.4 + 1.4 * Math.sin(t * 0.7);

    // --- Leia: kneeling beside the droid.
    kneel(leia, t);
    // She reaches out with the brick, presses it home, then sits back.
    const reach = ease.pulse(t, T_SPEECH + 1.1, 1.3, 0.5, 0.9);
    leia.armL.rotation.set(-0.34 - 1.05 * reach, 0.12, -0.30 + 0.16 * reach);
    leia.armR.rotation.set(-0.30 - 1.20 * reach, -0.10, 0.28 - 0.14 * reach);
    leia.torso.rotation.x = 0.14 + 0.16 * reach;
    leia.head.rotation.x = 0.22 + 0.1 * Math.sin(t * 0.8);

    // --- the astromech: rocking gently, dome hunting, lights blinking.
    r2.roll(t, { speed: 0.32, amount: 0.42 });
    // The dome snaps round to look up at her once the plans are aboard.
    const look = ease.range(t, T_PANEL + 0.2, T_PANEL + 1.1) - ease.range(t, 12.4, 13.0);
    r2.dome.rotation.y += look * 1.05;
    for (let i = 0; i < domeLights.length; i++) {
      const on = Math.sin(t * (5.5 + i * 2.7) + i * 2.1) > (i ? 0.1 : 0.45);
      const live = ease.range(t, T_SLOT, T_SLOT + 0.6);
      domeLights[i].material.opacity = on ? 0.55 + 0.35 * live : 0.06;
      domeLights[i].scale.setScalar(0.3 + 0.16 * live);
    }

    // --- the data brick: in her hand, then in the slot.
    leia.handR.updateWorldMatrix(true, false);
    slot.updateWorldMatrix(true, false);
    _v.setFromMatrixPosition(leia.handR.matrixWorld);
    _w.setFromMatrixPosition(slot.matrixWorld);
    const fly = ease.smoother(ease.range(t, T_SLOT, T_SLOT + 0.55));
    dataBrick.group.position.copy(_v).lerp(_w, fly);
    dataBrick.group.rotation.set(0.3 - 0.3 * fly, -1.1 + 1.1 * fly + Math.sin(t * 0.8) * 0.05 * (1 - fly), 0);
    dataBrick.group.visible = t < T_PANEL + 0.25;
    dataBrick.update(t, fly);
    // Hatch slides shut over the slot.
    const shut = ease.smoother(ease.range(t, T_PANEL, T_PANEL + 0.7));
    hatch.position.y = 1.16 + (1 - shut) * 0.62;
    hatch.visible = shut > 0.01;

    // --- the protocol droid: permanently unhappy.
    threepio.fuss(t, { amount: t > T_THREEPIO ? 1 : 0.45 });
    if (t > T_THREEPIO - 0.6) wringHands(threepio, t);

    // --- camera
    // Everything is shot from the port side of the corridor, so the droid sits
    // near the lens and the Princess reads a little further off across it: a
    // clean two-shot down the diagonal rather than an over-the-shoulder mass.
    if (t < T_SPEECH) {
      // Slow push in from the corridor mouth to the two-shot.
      cameraRig(camera, t, {
        pos: [[0, [-5.2, 6.0, 10.0]], [T_SPEECH, [-4.2, 3.2, 3.0]]],
        look: [[0, [0.6, 2.2, -6.4]], [T_SPEECH, [1.0, 1.7, -6.0]]],
        fov: [[0, 46], [T_SPEECH, 40]],
        ease: ease.smooth,
      });
      handheld(camera, t, 0.05, 0.4, 1);
    } else if (t < T_THREEPIO) {
      // Push through to a tight single on the droid as the plans go in.
      cameraRig(camera, t, {
        pos: [[T_SPEECH, [-4.0, 3.0, 2.2]], [T_SLOT, [-3.4, 2.5, -0.2]], [T_THREEPIO, [-3.2, 2.4, -0.8]]],
        look: [[T_SPEECH, [0.6, 1.6, -6.2]], [T_SLOT, [-0.2, 1.5, -6.5]], [T_THREEPIO, [-0.4, 1.5, -6.5]]],
        fov: [[T_SPEECH, 40], [T_SLOT, 34], [T_THREEPIO, 32]],
        ease: ease.inOutCubic,
      });
      handheld(camera, t, 0.035, 0.5, 4);
    } else {
      // Down the corridor onto the fretting protocol droid, full figure. He
      // fusses with his hands *above* his head, so the frame has to be centred
      // higher than his chest and the push kept shallow — a tighter one takes
      // the top of his head off exactly when the joke lands.
      cameraRig(camera, t, {
        pos: [[T_THREEPIO, [2.6, 4.0, -5.6]], [T_EJECT, [2.2, 3.8, -6.7]]],
        look: [[T_THREEPIO, [-1.3, 2.9, -15.3]], [T_EJECT, [-1.4, 2.95, -15.4]]],
        fov: [[T_THREEPIO, 42], [T_EJECT, 38]],
        ease: ease.smooth,
      });
      handheld(camera, t, 0.07, 0.55, 9);
    }
  }

  // -------------------------------------------------------------------------
  // Space
  // -------------------------------------------------------------------------
  function updateSpace(t) {
    const launch = t < T_TURRET;
    const turret = t >= T_TURRET && t < T_ENTRY;
    const entry = t >= T_ENTRY;

    launchSet.visible = launch;
    turretSet.visible = turret;
    entrySet.visible = entry;
    planet.visible = turret;
    bolts.object.visible = turret;
    sheath.group.visible = entry;
    sheath.trail.visible = entry;

    // Vacuum has no fog; the entry does, and it is what sells the altitude.
    if (entry) {
      const u = ease.range(t, T_ENTRY, T_ENTRY + 4.2);
      // The sky dome carries the horizon; fog only thickens the middle
      // distance so the far dunes recede rather than stacking flat.
      fogColor.setHex(0xb5793f).lerp(SKY_LOW, ease.smooth(u));
      scene.fog.color.copy(fogColor);
      scene.fog.near = ease.lerp(400, 240, u);
      scene.fog.far = ease.lerp(3200, 2000, u);
      bgColor.copy(SKY_HIGH);
      scene.background.copy(bgColor);
      spaceLights.key.intensity = 0;
      spaceLights.hemi.intensity = 0;
      spaceLights.fill.intensity = 0;
      spaceLights.rim.intensity = 0;
    } else {
      scene.fog.near = 4000;
      scene.fog.far = 20000;
      scene.background.setHex(0x03050a);
      // Inside the gun position the rig is pulled right down. The key comes
      // from behind the lens, and at any useful strength it paints the back of
      // the officer's head into a flat tan cylinder — the one thing this shot
      // cannot afford. He is meant to be a shape cut out of the planet, so the
      // key is cut to a whisper and the window-side rim carries his edges.
      // Outside, light grey hull under a strong key clips to paper white, so
      // the launch beat is keyed low and carried by the rim instead.
      spaceLights.key.intensity = turret ? 0.16 : 1.5;
      spaceLights.hemi.intensity = turret ? 0.17 : 0.30;
      spaceLights.fill.intensity = turret ? 0.08 : 0.34;
      spaceLights.rim.intensity = turret ? 2.1 : 1.3;
    }

    // --- the pod's path, one continuous curve through all three shots.
    const p = podPath(t);
    podRig.position.set(p[0], p[1], p[2]);
    if (entry) podRig.scale.setScalar(1.15);

    // The lens goes down before anything reads it back — see placeCamera.
    placeCamera(t, p, launch, turret);

    if (launch) {
      // An eight-stud pod two hundred units off the lens is thirty pixels of
      // grey on a grey hull, and the line over this beat is *"an escape pod
      // fell away from the captured ship"* — it has to be findable. It is blown
      // up while it is far and eased back as it closes, so it still reads as
      // dwindling against the destroyer rather than growing.
      podRig.scale.setScalar(ease.lerp(2.6, 1.6, ease.range(t, T_EJECT, T_TURRET)));
      // Kicked sideways off the hull and tumbling.
      const spin = Math.max(0, t - T_EJECT);
      podSpin.rotation.set(0.5 + spin * 1.35, -1.2 + spin * 0.75, spin * 0.42);
    } else if (turret) {
      podSpin.rotation.set(0.3 + t * 0.5, 0.4 + t * 0.28, t * 0.2);
    } else {
      // Heat shield forward, steadying as the air bites.
      const u = ease.smooth(ease.range(t, T_ENTRY, T_ENTRY + 2.2));
      const wobble = (1 - u) * 0.5 + 0.06;
      podSpin.rotation.set(
        -2.35 + Math.sin(t * 3.1) * wobble,
        0.5 + Math.sin(t * 2.3) * wobble,
        Math.sin(t * 4.0) * wobble * 0.6
      );
    }

    // Retros: a hard burst at the kick, then a trim burn that never quite
    // quits — the flame is the only warm thing in the frame and it is what
    // lets the eye find the pod against three hundred units of grey hull.
    const burn = ease.pulse(t, T_EJECT + 0.05, 0.12, 0.7, 1.6) * 0.8 + (launch ? 0.34 : 0);
    for (const th of retros) {
      th.throttle = entry ? 0 : burn;
      th.update(t);
    }

    ejectSparks.update(t);
    ejectFlash.material.opacity = 1.4 * ease.pulse(t, T_EJECT + 0.02, 0.05, 0.06, 0.55);
    ejectFlash.scale.setScalar(16 + 34 * ease.pulse(t, T_EJECT + 0.02, 0.05, 0.06, 0.7));

    if (turret) {
      // "Hold your fire": the guns quit the instant he speaks.
      bolts.update(t, camera);
      console1.intensity = 5 + 3 * Math.sin(t * 3.1);
      poseOfficer(t);
      // Four hundred units out the pod is a dozen pixels of grey. It is blown
      // up here and shrunk back over the beat, so it still *dwindles* while
      // staying legible; the halo is scaled by distance to hold apparent size.
      const away = ease.range(t, T_TURRET, T_ENTRY);
      podRig.scale.setScalar(ease.lerp(3.4, 2.4, away));
      const dist = camera.position.distanceTo(podRig.position);
      // The halo fades out as it goes: early on it is a target for the guns,
      // by the end the pod is meant to be a speck against the planet.
      podMarker.material.opacity = ease.lerp(0.36, 0.10, away);
      podMarker.scale.setScalar(dist * 0.05);
    } else if (launch) {
      // A whisper of a halo, just enough separation to pull the eye off the
      // hull plating and onto the pod without reading as a light source.
      podMarker.material.opacity = 0.13;
      podMarker.scale.setScalar(camera.position.distanceTo(podRig.position) * 0.055);
    } else {
      podMarker.material.opacity = 0;
    }
    if (entry) {
      sheath.update(t - T_ENTRY);
      // Aim the wake down the flight path: sample the same track a moment
      // ahead and behind, which keeps it a pure function of t.
      const a = podPath(Math.max(T_ENTRY, t - 0.12));
      const b = podPath(t + 0.12);
      _v.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      if (_v.lengthSq() > 1e-6) {
        _v.normalize();
        sheath.trail.quaternion.setFromUnitVectors(FORWARD, _v);
      }
    }

    stars.update(t);
    stars.object.position.copy(camera.position);
  }

  /**
   * Place the lens for whichever exterior beat we are in.
   *
   * Called *before* anything that reads the camera back. The pod's halo is
   * sized off its distance to the lens so that its apparent size stays put as
   * the pod dwindles, and if the camera is still sitting where the previous
   * frame left it that read returns the wrong number — which makes the scene
   * depend on what was drawn before it, and the offline renderer draws the
   * timeline out of order across several browsers.
   */
  function placeCamera(t, p, launch, turret) {
    if (launch) {
      // Near-locked wide. The lens holds still on the hull and lets the pod
      // cross it, which is what makes six hundred units of Imperial grey feel
      // like a wall rather than a prop.
      tractor.update(t);
      cameraRig(camera, t, {
        pos: [[T_EJECT, [16, 26, 62]], [T_TURRET, [-2, 16, 48]]],
        look: [[T_EJECT, [-46, 44, -200]], [T_EJECT + 3.4, [-24, 22, -156]], [T_TURRET, [10, -6, -104]]],
        fov: [[T_EJECT, 40], [T_TURRET, 38]],
        shake: [[T_EJECT, 0], [T_EJECT + 0.06, 0.5], [T_EJECT + 1.4, 0]],
        ease: ease.smooth,
      });
      handheld(camera, t, 0.09, 0.35, 2);
    } else if (turret) {
      // Inside the gun position, looking out past the officer. The lens sits
      // close to the glass so the opening, not the room, carries the frame.
      // Lifted above his cap and tipped back down: the extra height is what
      // drops his head onto the planet's disc, where the peak has something to
      // be a silhouette against. Raising the look target by the same amount
      // again holds the window's framing while the officer alone moves.
      //
      // The move is a slide to the right, not a push in. Pushing in on a man
      // standing eight units from the lens ends the beat on the back of his
      // head; sliding past him walks him out of frame left and leaves the shot
      // on a clean window with the pod shrinking into the planet, which is the
      // line he has just spoken.
      cameraRig(camera, t, {
        pos: [[T_TURRET, [1.8, TURRET_Y + 8.2, 8.2]], [T_ENTRY, [3.4, TURRET_Y + 7.6, 11.2]]],
        look: [
          [T_TURRET, [-2.4, TURRET_Y + 6.0, -30]],
          [28.5, [-4.4, TURRET_Y + 4.2, -70]],
          [T_ENTRY, [-2.0, TURRET_Y - 1.0, -96]],
        ],
        fov: [[T_TURRET, 44], [T_ENTRY, 40]],
        ease: ease.smooth,
      });
      handheld(camera, t, 0.05, 0.45, 6);
    } else {
      // Chasing the pod down through the haze.
      const u = ease.range(t, T_ENTRY, D);
      // The lens swings around the pod as it comes down — starting over its
      // right shoulder and ending off its left — rather than sitting in one
      // place behind it. Locked to the tail, eight seconds of descent is eight
      // seconds of the same picture with the ground scrolling underneath; the
      // arc keeps giving the dune field a new angle to be seen from.
      const swing = ease.lerp(0.62, -0.4, ease.smooth(u));
      const back = ease.lerp(56, 36, u);
      camera.position.set(
        p[0] + Math.sin(swing) * back,
        p[1] + ease.lerp(14, 11, u),
        p[2] + Math.cos(swing) * back
      );
      camera.up.set(0, 1, 0);
      camera.lookAt(p[0], p[1] - 1, p[2]);
      camera.rotation.z += 0.10 - 0.2 * u;
      camera.fov = ease.lerp(46, 40, u);
      camera.updateProjectionMatrix();
      handheld(camera, t, 0.16, 0.9, 11);
      const rattle = 0.10 + 0.16 * ease.range(t, T_ENTRY, T_ENTRY + 2.5);
      camera.position.x += Math.sin(t * 33) * rattle;
      camera.position.y += Math.sin(t * 27.4 + 1.3) * rattle;
    }
  }

  function poseOfficer(t) {
    const s = t - T_TURRET;
    officer.legL.rotation.x = 0;
    officer.legR.rotation.x = 0;
    officer.torso.rotation.y = Math.sin(s * 0.6) * 0.05;
    // A flat, dismissive lift of the hand on "hold your fire".
    const wave = ease.pulse(t, 25.35, 0.35, 0.5, 0.8);
    officer.armR.rotation.set(-0.12 - 1.05 * wave, 0, 0.12 + 0.2 * wave);
    officer.armL.rotation.set(-0.1, 0, -0.08);
    officer.head.rotation.y = Math.sin(s * 0.45 + 1) * 0.16 - 0.1 * wave;
  }
}

// ===========================================================================
// Interior set
// ===========================================================================

/**
 * A white service corridor: plated deck, brick walls in courses with grey
 * inserts, pipe runs, ceiling light strips, cargo and a blast door at the end.
 */
function buildCorridor() {
  const b = new Bricks({ studSegments: 6 });
  const white = COLORS.white;
  const grey = COLORS.lightBluishGray;
  const dark = COLORS.darkBluishGray;

  // --- deck
  for (let x = -HALF_W; x < HALF_W; x += 2) {
    for (let z = Z0; z < Z1; z += 4) {
      const walkway = Math.abs(x + 1) < 4;
      b.tile(x, -1, z, 2, 4, walkway ? dark : grey);
    }
  }
  // Hazard dashes down both edges of the walkway.
  for (let z = Z0; z < Z1; z += 8) {
    for (const sx of [-1, 1]) b.tile(sx * 4 - (sx > 0 ? 0 : 1), 0, z, 1, 4, COLORS.yellow, { studs: false });
  }

  // --- walls
  for (const sx of [-1, 1]) {
    const xMin = sx > 0 ? HALF_W : -HALF_W - 3;
    for (let z = Z0; z < Z1; z += 4) {
      for (let row = 0; row < ROWS; row++) {
        const y = row * 3;
        const stagger = row & 1 ? 2 : 0;
        b.brick(xMin, y, z + stagger - 2, 3, 4, row < 1 ? grey : white, { studs: row === ROWS - 1 });
      }
      // Recessed grey panel on the inner face, and a dark seam above it.
      const xIn = sx > 0 ? HALF_W - 0.34 : -HALF_W;
      b.panel(xIn, 6, z + 0.4, 0.34, 3.2, 7, grey);
      b.panel(xIn, 13.6, z + 0.4, 0.34, 3.2, 0.8, dark);
    }
    // Structural ribs every 8 studs, proud of the wall.
    for (let z = Z0; z < Z1; z += 8) {
      const xIn = sx > 0 ? HALF_W - 0.7 : -HALF_W;
      b.panel(xIn, 0, z, 0.7, 1.2, WALL_TOP, dark);
    }
    // Pipe runs.
    const xp = sx * (HALF_W - 0.9);
    b.bar([xp, 6.9, Z0], [xp, 6.9, Z1], 0.26, COLORS.flatSilver, { segments: 8 });
    b.bar([xp - sx * 0.05, 6.2, Z0], [xp - sx * 0.05, 6.2, Z1], 0.17, dark, { segments: 6 });
    b.bar([xp, 7.6, Z0], [xp, 7.6, Z1], 0.13, COLORS.red, { segments: 6 });
  }

  // --- ceiling and its light strips
  for (let z = Z0; z < Z1; z += 4) {
    b.panel(-HALF_W, WALL_TOP, z, 2 * HALF_W, 4, 2, grey);
    b.box(-2, WALL_TOP - 0.9, z + 0.5, 4, 3, 1, COLORS.transClear, {
      studs: false,
      finish: 'glossy',
      emissive: 0xffeccd,
      emissiveIntensity: 1.1,
    });
  }

  // --- the red emergency lamp housing
  b.panel(HALF_W - 1.5, 15, -11.6, 1.5, 2.2, 3, dark);
  b.cyl(HALF_W - 1.5, 15.4, -10.5, 0.55, 2.2, COLORS.transRed, {
    segments: 12,
    rot: [0, 0, Math.PI / 2],
    finish: 'trans',
    emissive: 0xff2a12,
    emissiveIntensity: 3.2,
  });

  // --- cargo: crates and canisters along the walls
  const crateColors = [COLORS.darkTan, COLORS.reddishBrown, COLORS.darkBluishGray, COLORS.sandGreen];
  for (let i = 0; i < 9; i++) {
    const sx = i % 2 ? 1 : -1;
    const z = Z0 + 5 + i * 4.4;
    const w = 2 + Math.floor(hash11(i, 3) * 2);
    const stack = 1 + Math.floor(hash11(i, 5) * 2);
    for (let s = 0; s < stack; s++) {
      b.box(sx * (HALF_W - 1) - (sx > 0 ? w : 0), s * 4, z + s * 0.3, w, 3, 4, crateColors[(i + s) % 4]);
    }
  }
  for (const [x, z] of [[-4.5, -20], [-3.2, -21.5], [4.6, -26]]) {
    b.cyl(x, 0, z, 0.85, 8, COLORS.oliveGreen, { segments: 12 });
    b.cyl(x, 8, z, 0.7, 1, COLORS.flatSilver, { segments: 12 });
  }

  // --- blast door closing the far end
  b.panel(-HALF_W, 0, Z0 - 2, 2 * HALF_W, 2, WALL_TOP + 2, dark);
  for (const sx of [-1, 1]) {
    b.panel(sx * 0.2 - (sx > 0 ? 0 : 5.2), 1, Z0 - 1.6, 5, 1.2, 17, grey);
    b.panel(sx * 0.2 - (sx > 0 ? 0 : 5.2), 8, Z0 - 1.7, 5, 1.2, 1.6, COLORS.red);
  }
  b.panel(-1.2, 18.5, Z0 - 1.7, 2.4, 1.2, 2, COLORS.transLightBlue, {
    emissive: 0x66ddff,
    emissiveIntensity: 1.6,
    finish: 'trans',
  });

  const model = b.build();
  model.receiveShadow = true;
  return model;
}

/** The plans: a 1x2 trans tile that reads as a data card in a minifig hand. */
function buildDataBrick() {
  const group = new THREE.Group();
  const b = new Bricks();
  // Emissives are kept modest: bloom threshold is 0.72, so anything much
  // brighter than this stops being a brick and becomes a white hole.
  b.tile(-0.5, 0, -1, 1, 2, COLORS.transLightBlue, {
    finish: 'trans',
    emissive: 0x4fbcd8,
    emissiveIntensity: 0.9,
  });
  b.tile(-0.36, 1, -0.86, 0.72, 1.7, COLORS.transClear, {
    finish: 'trans',
    emissive: 0x9fdcea,
    emissiveIntensity: 1.2,
  });
  const mesh = b.build();
  mesh.scale.setScalar(0.42);
  group.add(mesh);
  const halo = glowSprite(0x8fe6ff, 0.8, 0.3);
  group.add(halo);
  return {
    group,
    update(t, fly) {
      const pulse = 0.20 + 0.10 * Math.sin(t * 6.4);
      halo.material.opacity = pulse * (1 - fly * 0.4);
      halo.scale.setScalar(0.62 + 0.14 * Math.sin(t * 5.1));
    },
  };
}

/** The sliding cover that shuts over the droid's card slot. */
function buildHatch() {
  const b = new Bricks();
  b.addGeometry(chamferBox(0.42, 0.62, 0.10, 0.03), { x: 0, y: 0, z: 0, color: COLORS.white, opts: { finish: 'glossy' } });
  b.addGeometry(chamferBox(0.44, 0.07, 0.11, 0.02), { x: 0, y: 0.26, z: 0.01, color: COLORS.flatSilver, opts: { finish: 'metal' } });
  return b.build();
}

/** A minifig has no knees, so a crouch is a wide squat with the body dropped. */
function kneel(fig, t) {
  const breathe = Math.sin(t * 0.9 + (fig.seed ?? 0)) * 0.012;
  fig.body.position.y = -0.98 + breathe;
  fig.body.rotation.z = 0;
  fig.legL.rotation.x = -1.16;
  fig.legR.rotation.x = 0.95;
  fig.torso.position.y = 2.08;
  fig.torso.rotation.set(0.14, -0.12, 0);
  fig.head.rotation.set(0.22, -0.28, 0);
}

/** C-3PO wringing his hands in front of him. */
function wringHands(fig, t) {
  const w = Math.sin(t * 3.6 + (fig.seed ?? 0));
  const w2 = Math.sin(t * 2.3 + 1.1);
  fig.armL.rotation.set(-1.28 + w * 0.13, 0.30, -0.46 + w2 * 0.08);
  fig.armR.rotation.set(-1.30 - w * 0.13, -0.30, 0.46 - w2 * 0.08);
  fig.torso.rotation.z = w2 * 0.04;
}

// ===========================================================================
// Exterior set pieces
// ===========================================================================

/** The Star Destroyer's gun position: a dark box with one big window. */
function buildTurret() {
  const b = new Bricks({ studSegments: 6 });
  // The interior is a silhouette: everything here is near-black so the
  // window, the planet and the console glow carry the frame.
  const dark = COLORS.trueBlack;
  const black = COLORS.trueBlack;
  const grey = COLORS.darkBluishGray;
  // Everything in this room is matte. The set is lit by point lights a few
  // units away, and a dielectric specular lobe does not care how black the
  // base colour is: on smooth plastic each of those lamps leaves a blown white
  // bead on the window trim that reads as a lens artefact rather than a room.
  const M = { finish: 'rubber' };

  // Deck, ceiling and the two side walls, all boxed around the camera. The
  // opening is deliberately wider than the lens so its left and right edges
  // fall outside frame: the shot is a hole in a dark room, not a picture of a
  // window.
  b.tile(-14, -1, -6, 28, 20, dark, M);
  b.panel(-14, 31, -6, 28, 20, 2, dark, M);
  for (const sx of [-1, 1]) b.panel(sx * 12, 0, -6, 2, 20, 31, dark, M);
  b.panel(-14, 0, 12, 28, 2, 31, black, M); // wall behind the camera

  // Window: a wide opening with heavy mullions.
  b.panel(-14, 24, -6.6, 28, 1.4, 7, dark, M); // header
  b.panel(-14, -1, -6.6, 28, 1.4, 4, dark, M); // sill
  // One mullion inside the glass, and it lives on the officer's side. The
  // camera tracks right across this beat, and a second one at +8.5 swings into
  // the middle of the planet and cuts the frame in half just as the pod
  // becomes a speck; at +11.3 it stays tucked against the wall.
  for (const x of [-8.5, 11.3]) b.panel(x - 0.4, 3, -6.7, 0.8, 1.6, 21, dark, M);
  b.panel(-14, 2.6, -6.5, 28, 1.1, 0.4, grey, M);

  // Console bank under the window, with lit readouts.
  b.panel(3.6, 0, -5.4, 5.0, 3.0, 5, black, M);
  b.slope(3.6, 5, -5.4, 5.0, 3.0, 2, black, { ...M, dir: '-z' });
  for (let i = 0; i < 5; i++) {
    b.box(4.0 + i * 0.85, 5.4, -5.0, 0.5, 1.0, 0.5, COLORS.transGreen, {
      studs: false,
      finish: 'trans',
      emissive: i % 3 ? 0x2aa844 : 0xaa6a1e,
      emissiveIntensity: 1.1,
    });
  }
  // Pipes and greebles on the back wall so the silhouette is not a plain box.
  for (let i = 0; i < 6; i++) {
    b.panel(-9 + i * 3.2, 6 + (i % 2) * 5, 11.2, 2.4, 0.8, 4, i % 2 ? grey : black, M);
  }
  // A low rail the officer stands at, which gives his silhouette a base line.
  b.panel(-9.5, 12, -5.4, 10, 0.6, 0.6, grey, M);
  for (const x of [-9.2, -0.1]) b.panel(x, 0, -5.5, 0.6, 0.6, 12, grey, M);
  return b.build();
}

/** Rust-orange planet: banded procedural texture plus an atmosphere rim. */
function buildPlanet() {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S / 2;
  const g = c.getContext('2d');
  // Latitude bands, then blotches, all from the hash so it never changes.
  for (let y = 0; y < c.height; y++) {
    const v = y / c.height;
    const band = 0.5 + 0.5 * Math.sin(v * 26 + Math.sin(v * 7) * 2);
    const r = 196 + band * 34;
    const gg = 118 + band * 40;
    const bb = 66 + band * 30;
    g.fillStyle = `rgb(${r | 0},${gg | 0},${bb | 0})`;
    g.fillRect(0, y, S, 1);
  }
  for (let i = 0; i < 620; i++) {
    const x = hash11(i, 71) * S;
    const y = hash11(i, 72) * c.height;
    const r = 3 + hash11(i, 73) * 16;
    const dark = hash11(i, 74) > 0.5;
    g.globalAlpha = 0.07 + hash11(i, 75) * 0.10;
    g.fillStyle = dark ? '#7a4022' : '#f0c58a';
    g.beginPath();
    g.ellipse(x, y, r, r * 0.55, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;

  const group = new THREE.Group();
  const R = 620;
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(R, 48, 32),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0 })
  );
  group.add(ball);
  // Thin hot rim, so the limb glows against the stars.
  const rim = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.035, 48, 32),
    new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(0xffb070) } },
      vertexShader: `varying vec3 vN; varying vec3 vP;
        void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.0); vP = mv.xyz; gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform vec3 uColor; varying vec3 vN; varying vec3 vP;
        void main(){
          float f = pow(1.0 - abs(dot(normalize(vN), normalize(-vP))), 3.0);
          gl_FragColor = vec4(uColor, f * 0.85);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      toneMapped: false,
    })
  );
  group.add(rim);
  return group;
}

/** Deterministic 2-D value noise on an integer lattice, in [0,1]. Pure in x,z. */
function vnoise2(x, z, salt = 0) {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const u = (x - xi) * (x - xi) * (3 - 2 * (x - xi));
  const v = (z - zi) * (z - zi) * (3 - 2 * (z - zi));
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
 * Sand from shadowed trough to sunlit crest.
 *
 * A *discrete* ladder, not a continuous ramp: Bricks merges by material, so a
 * ramp costs one draw call per cell and a few thousand dune cells will happily
 * push the frame past two hundred of them on their own.
 */
const ENTRY_SAND = [
  0x6d4227, 0x7a4d2d, 0x875834, 0x94643c, 0xa07044, 0xac7d4e, 0xb88a59, 0xc39866, 0xcea675, 0xd8b486,
  0xe1c299, 0xead0ad, 0xf2dcc2,
];

// Horizontal bearing from a patch of sand towards `entryKey`, normalised. The
// dune shading is sampled along this, so the two must agree.
const SUN_X = -0.822;
const SUN_Z = 0.569;
function sandTone(u) {
  return ENTRY_SAND[Math.round(ease.clamp(u, 0, 1) * (ENTRY_SAND.length - 1))];
}

/**
 * One dune, as a function of how far across the dune train you are. A long
 * windward climb and a short steep slip face: a sine wave reads as corrugated
 * iron, and it is the asymmetry that makes sand look like sand.
 */
function duneCrest(u) {
  const f = u - Math.floor(u);
  const WIND = 0.68; // share of the wavelength spent climbing
  return f < WIND ? ease.smooth(f / WIND) : 1 - ease.smooth((f - WIND) / (1 - WIND));
}

/**
 * Height of the entry desert in [0,1].
 *
 * The crests lie broadly *across* the pod's line of flight, because the lens
 * looks straight down that line and only a ridge across it can occlude the
 * ground behind it. Three things stop that from reading as corrugated iron:
 *
 *  - the train is raked a little off square, so crests run diagonally out of
 *    frame rather than parallel to its top and bottom edges;
 *  - the line is warped sideways at two scales, so a single crest bends
 *    several times across the width of the shot instead of ruling it;
 *  - the height is *multiplied* by a slow field swell rather than having noise
 *    added to it, which pinches some ridges away to interdune flats and stacks
 *    others up into star dunes. Adding noise only roughens a washboard; this
 *    breaks the rhythm.
 */
function entryHeight(x, z) {
  const s = z * 0.93 + x * 0.36;
  // Both warps are kept well longer than a cell of the coarse field: a wander
  // that turns over inside two or three cells cannot be sampled, and comes out
  // as a scatter of unrelated blocks rather than a bending crest.
  const warp =
    170 * (vnoise2(x * 0.0031, z * 0.001, 3.1) - 0.5) +
    58 * (vnoise2(x * 0.0046 + 7, z * 0.0017, 8.4) - 0.5);
  const u = s + warp;
  const a = duneCrest(u / 296);
  const b = duneCrest((u + 150) / 131);
  const swell = 0.42 + 1.02 * vnoise2(x * 0.0018 + 2, z * 0.0011, 5.5);
  return ease.clamp((a * 0.7 + b * 0.3) * swell, 0, 1);
}

/**
 * The desert seen from the top of the atmosphere: a coarse brick heightfield
 * plus a gradient sky dome. Everything here is three hundred units below the
 * lens, so the cells are enormous and studless — it is the *silhouette* of the
 * ridge lines that has to read, not the plate courses.
 */
function buildEntryGround() {
  const g = new THREE.Group();

  // Sky dome. Unfogged, so it survives the entry haze and gives the frame a
  // real horizon instead of dissolving into the flat background colour.
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(3200, 32, 24),
    new THREE.ShaderMaterial({
      uniforms: {
        uHigh: { value: new THREE.Color(0x6d2f14) },
        uLow: { value: new THREE.Color(0xe8a35f) },
      },
      vertexShader: `varying float vY;
        void main(){ vY = normalize(position).y; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 uHigh; uniform vec3 uLow; varying float vY;
        void main(){ gl_FragColor = vec4(mix(uLow, uHigh, clamp(vY*1.5+0.12, 0.0, 1.0)), 1.0); }`,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    })
  );
  sky.position.y = 40;
  g.add(sky);

  // Cells are wider than they are deep, because real dunes are transverse
  // ridges: a square grid at this distance reads as a chequerboard, whereas
  // bars read as crest lines marching away from the lens. They still have to
  // be small enough to terrace — the lens ends this shot sixty units off the
  // sand, and a cell any bigger than this is a runway slab.
  const b = new Bricks({ studSegments: 4 });
  // Deep enough that the tallest crest still clears the pod's flight path:
  // it finishes about two units below this set's origin.
  const BASE = -175;

  // One cell of sand, wherever it is and however big.
  //
  // Every cell's top face has the same normal, so the renderer cannot tell a
  // windward slope from a slip face and the whole field lights flat. The
  // modelling is painted in instead: sample the height one step *towards the
  // sun* and go pale where the sand climbs into the light, dark where it falls
  // away behind a crest. That is what turns a terraced grid into dunes.
  // Heights land on a course, so neighbouring cells at similar elevations share
  // a level and grow together into a continuous terrace. Left continuous, every
  // cell sits a little proud of the last and a dune field of a few thousand of
  // them reads as loose rubble rather than as stacked plate.
  const COURSE = 11;
  const RELIEF = 150;

  const cell = (x, z, cx, cz) => {
    const k = entryHeight(x, z);
    const levels = Math.round((k * RELIEF) / COURSE);
    const step = Math.max(cx, cz) * 1.4;
    // Divide the drop back out by the distance it was measured over. Without
    // that the same slope returns a far bigger number in the coarse zone than
    // the fine one, and the far field saturates into alternating white and
    // brown bars while the near field stays flat — which is precisely what a
    // washboard looks like.
    const slope = (k - entryHeight(x + SUN_X * step, z + SUN_Z * step)) / step;
    const lit = ease.clamp(slope * 55 + 0.5, 0, 1);
    // Tone is keyed to the *quantised* height, so a terrace is one flat colour
    // edge to edge and the dune reads as a ramp of plate courses climbing into
    // the light. Keying it to the continuous height instead puts a tonal edge
    // somewhere across the middle of a plateau, which is what turns the field
    // into a maze of unrelated blocks. The sun's modelling then rides on top,
    // enough to tell a windward slope from a slip face.
    const dither = (hash11(x * 13.37 + z * 7.11, 5) - 0.5) * 0.03;
    const q = (levels * COURSE) / RELIEF;
    b.box(x, BASE, z, cx, cz, 10 + levels * COURSE, sandTone(0.12 + q * 0.56 + lit * 0.34 + dither), {
      studs: false,
    });
  };

  // The coarse field, out to the fog. Cells are wider than they are deep,
  // because real dunes are transverse ridges: a square grid at this distance
  // reads as a chequerboard, whereas bars read as crest lines marching away.
  const CX = 48;
  const CZ = 28;
  for (let ix = 0; ix < 50; ix++) {
    for (let iz = 0; iz < 86; iz++) {
      const x = ix * CX - 1200;
      const z = iz * CZ - 2100; // the field lies ahead of the lens
      // Leave the hole the fine patch below fills.
      if (x >= -240 && x < 240 && z >= -336 && z < 112) continue;
      cell(x, z, CX, CZ);
    }
  }
  // A finer patch over the flight path. The shot ends sixty units off the
  // sand, and at that range a fifty-unit cell is a runway slab: the near
  // ground only terraces if it is cut small.
  for (let ix = 0; ix < 20; ix++) {
    for (let iz = 0; iz < 28; iz++) cell(ix * 24 - 240, iz * 16 - 336, 24, 16);
  }
  g.add(b.build({ castShadow: false }));
  return g;
}

/** Plasma sheath + trailing streak for the atmospheric entry. */
function buildSheath() {
  const group = new THREE.Group();
  // Bow shock: a squashed additive shell ahead of the heat shield.
  // A hard-edged additive sphere reads as a plastic disc, so the shock front
  // is a back-side shell: only its silhouette accumulates, which feathers.
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(2.9, 20, 14),
    additiveMaterial(0xffb14d, { opacity: 0.20, side: THREE.BackSide })
  );
  shell.scale.set(1.3, 1.3, 0.7);
  shell.position.z = 1.9;
  group.add(shell);

  const core = new THREE.Mesh(new THREE.SphereGeometry(1.3, 16, 12), additiveMaterial(0xfff0c0, { opacity: 0.22 }));
  core.scale.set(1.05, 1.05, 0.4);
  core.position.z = 2.7;
  group.add(core);

  // The trail: two nested additive plumes, the outer one very faint, so the
  // wake feathers out instead of reading as a solid cone. Its +z is the
  // direction of travel; the scene aims it along the flight path.
  const trail = new THREE.Group();
  const plume = (r, len, color, opacity) => {
    const g = new THREE.ConeGeometry(r, len, 14, 1, true);
    g.translate(0, -len / 2, 0);
    g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, additiveMaterial(color, { opacity }));
    trail.add(m);
    return m;
  };
  const plumeInner = plume(0.9, 40, 0xffd08c, 0.09);
  const plumeOuter = plume(2.2, 84, 0xff9a48, 0.035);

  const flare = glowSprite(0xffc070, 12, 0.8);
  flare.position.z = 2.2;
  group.add(flare);

  const sparks = new Sparks({
    t0: 0,
    life: 9.2, // must outlast the descent, or the ablation stops halfway down
    count: 130,
    speed: 9,
    gravity: 0,
    color: 0xffb861,
    size: 0.7,
    seed: 33,
    origin: [0, 0, -2],
    cone: { axis: [0, 0, -1], spread: 0.28 },
  });
  group.add(sparks.object);

  return {
    group,
    trail,
    /** `s` is seconds since the entry began. */
    update(s) {
      const u = ease.range(s, 0, 2.6);
      const flick = 0.86 + 0.14 * Math.sin(s * 31) * Math.sin(s * 17.3);
      shell.material.opacity = 0.22 * u * flick;
      core.material.opacity = 0.24 * u * flick;
      plumeInner.material.opacity = 0.10 * u * flick;
      plumeOuter.material.opacity = 0.04 * u * flick;
      trail.scale.set(1, 1, 0.5 + 0.8 * u);
      flare.material.opacity = 0.5 * u * flick;
      flare.scale.setScalar(6 + 5 * u);
      sparks.update(s);
    },
  };
}

// ===========================================================================
// ships-capital.js is being written in parallel; these stand in until it lands
// ===========================================================================

async function loadCapitalShips() {
  try {
    return await import('../kit/ships-capital.js');
  } catch {
    return null;
  }
}

/** Stand-in escape pod: 8 studs, +z forward, three retro nozzles aft. */
function fallbackPod() {
  const root = new THREE.Group();
  const b = new Bricks({ studSegments: 8 });
  const M = { finish: 'metal' };
  const G = { finish: 'glossy' };

  // Body barrel, running along z.
  b.addGeometry(new THREE.CylinderGeometry(1.55, 1.68, 4.6, 16), {
    x: 0, y: 0, z: -0.4, rot: [Math.PI / 2, 0, 0], color: COLORS.white, opts: G,
  });
  // Blunt nose cone / heat shield.
  b.addGeometry(new THREE.CylinderGeometry(0.72, 1.55, 2.5, 16), {
    x: 0, y: 0, z: 3.1, rot: [Math.PI / 2, 0, 0], color: COLORS.lightBluishGray, opts: G,
  });
  b.addGeometry(new THREE.SphereGeometry(0.72, 14, 8), { x: 0, y: 0, z: 4.3, color: COLORS.darkBluishGray, opts: M });
  // Dark viewport band and hull rings.
  for (const [z, r, c] of [[1.7, 1.62, COLORS.trueBlack], [-0.9, 1.72, COLORS.darkBluishGray], [-2.4, 1.74, COLORS.flatSilver]]) {
    b.addGeometry(new THREE.CylinderGeometry(r, r, 0.42, 16), {
      x: 0, y: 0, z, rot: [Math.PI / 2, 0, 0], color: c, opts: M,
    });
  }
  // Three fins.
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    b.push();
    b.rotateZ(a);
    b.addGeometry(chamferBox(0.34, 2.1, 2.4, 0.06), { x: 0, y: 1.55, z: -1.4, color: COLORS.red, opts: G });
    b.pop();
  }
  // Aft plate and nozzles.
  b.addGeometry(new THREE.CylinderGeometry(1.5, 1.3, 0.5, 16), {
    x: 0, y: 0, z: -3.0, rot: [Math.PI / 2, 0, 0], color: COLORS.darkBluishGray, opts: M,
  });
  const enginePoints = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const x = Math.cos(a) * 0.78;
    const y = Math.sin(a) * 0.78;
    b.addGeometry(new THREE.CylinderGeometry(0.42, 0.30, 0.7, 10), {
      x, y, z: -3.3, rot: [Math.PI / 2, 0, 0], color: COLORS.flatSilver, opts: M,
    });
    enginePoints.push(new THREE.Vector3(x, y, -3.7));
  }
  root.add(b.build());
  root.userData.enginePoints = enginePoints;
  return root;
}

/** Stand-in blockade runner: ~60 studs, +z forward, hammerhead bridge. */
function fallbackCorvette() {
  const root = new THREE.Group();
  const b = new Bricks({ studSegments: 6 });
  const white = COLORS.white;
  const grey = COLORS.lightBluishGray;
  const dark = COLORS.darkBluishGray;
  const G = { finish: 'glossy' };

  // Main hull: a long tapering body from the stern to the neck.
  for (let i = 0; i < 8; i++) {
    const z = -26 + i * 5;
    const k = 1 - i * 0.085;
    b.addGeometry(chamferBox(9 * k, 5.4 * k, 5, 0.2), { x: 0, y: 0, z, color: white, opts: G });
    b.addGeometry(chamferBox(9.3 * k, 0.7, 4.4, 0.12), { x: 0, y: 1.9 * k, z, color: grey });
  }
  // Neck and the hammerhead bridge.
  b.addGeometry(chamferBox(3.4, 2.8, 8, 0.2), { x: 0, y: 0, z: 18, color: grey, opts: G });
  b.addGeometry(chamferBox(11.5, 3.4, 5.5, 0.3), { x: 0, y: 0.2, z: 24.5, color: white, opts: G });
  b.addGeometry(chamferBox(9.0, 1.2, 4.0, 0.2), { x: 0, y: 2.0, z: 24.8, color: grey });
  for (const sx of [-1, 1]) {
    b.addGeometry(chamferBox(1.6, 1.0, 2.4, 0.15), { x: sx * 4.4, y: 1.4, z: 26.6, color: COLORS.transLightBlue, opts: { finish: 'trans', emissive: 0x88ddff, emissiveIntensity: 1.4 } });
  }
  // Red trim stripes.
  for (const sx of [-1, 1]) {
    b.addGeometry(chamferBox(0.5, 1.0, 36, 0.1), { x: sx * 4.2, y: 0.3, z: -6, color: COLORS.red });
  }
  // Engine bank: eleven bells in two rows.
  for (let i = 0; i < 11; i++) {
    const row = i < 6 ? 0 : 1;
    const n = row ? 5 : 6;
    const j = row ? i - 6 : i;
    const x = (j - (n - 1) / 2) * 1.85;
    const y = row ? 1.7 : -0.6;
    b.addGeometry(new THREE.CylinderGeometry(0.78, 0.86, 1.6, 12), {
      x, y, z: -29, rot: [Math.PI / 2, 0, 0], color: dark, opts: { finish: 'metal' },
    });
    b.addGeometry(new THREE.CylinderGeometry(0.66, 0.66, 0.5, 12), {
      x, y, z: -29.9, rot: [Math.PI / 2, 0, 0], color: COLORS.transLightBlue,
      opts: { finish: 'trans', emissive: 0x9fe8ff, emissiveIntensity: 3.4 },
    });
  }
  // Greebles along the flanks so the hull is not a bare slab.
  for (let i = 0; i < 26; i++) {
    const z = -25 + (i % 13) * 3.6;
    const sx = i < 13 ? -1 : 1;
    b.addGeometry(chamferBox(0.6, 1.1 + hash11(i, 9) * 1.2, 1.8, 0.1), {
      x: sx * 4.3, y: -1.4 + hash11(i, 11) * 2.6, z, color: i % 3 ? grey : dark,
    });
  }
  root.add(b.build());
  return root;
}

/** Stand-in Imperial wedge: ~260 studs, +z forward, three engine bells. */
function fallbackStarDestroyer() {
  const root = new THREE.Group();
  const b = new Bricks({ studSegments: 4 });
  const grey = COLORS.lightBluishGray;
  const dark = COLORS.darkBluishGray;
  const L = 260;
  const W = 150;

  // Three stacked wedge layers give the beveled dagger silhouette.
  const layers = [
    { w: W, l: L, y: 0, h: 8, c: dark },
    { w: W * 0.94, l: L * 0.97, y: 8, h: 10, c: grey },
    { w: W * 0.72, l: L * 0.86, y: 18, h: 8, c: grey },
  ];
  for (const ly of layers) {
    b.wedge(-ly.w / 2, ly.y, -ly.l / 2, ly.w / 2, ly.l, ly.h, ly.c, { rot: 1 });
    b.wedge(0, ly.y, -ly.l / 2, ly.w / 2, ly.l, ly.h, ly.c, { rot: 0 });
  }

  // Stern block and the three engines.
  b.panel(-W / 2 + 4, -3, -L / 2 - 6, W - 8, 8, 30, dark);
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * 22;
    b.addGeometry(new THREE.CylinderGeometry(11, 12.5, 7, 18), {
      x, y: 4.5, z: -L / 2 - 6, rot: [Math.PI / 2, 0, 0], color: dark, opts: { finish: 'metal' },
    });
    b.addGeometry(new THREE.CylinderGeometry(9.4, 9.4, 2, 18), {
      x, y: 4.5, z: -L / 2 - 9, rot: [Math.PI / 2, 0, 0], color: COLORS.transLightBlue,
      opts: { finish: 'trans', emissive: 0x9fd8ff, emissiveIntensity: 2.6 },
    });
  }
  // Bridge tower with its two sensor globes.
  b.panel(-16, 26, -L / 2 + 16, 32, 26, 16, grey);
  b.panel(-11, 32, -L / 2 + 22, 22, 15, 12, grey);
  b.panel(-8, 37, -L / 2 + 25, 16, 10, 8, dark);
  for (const sx of [-1, 1]) {
    b.addGeometry(new THREE.SphereGeometry(3.4, 12, 8), {
      x: sx * 8, y: 20.5, z: -L / 2 + 27, color: grey,
    });
    b.addGeometry(new THREE.CylinderGeometry(0.7, 0.7, 3, 8), {
      x: sx * 8, y: 18.6, z: -L / 2 + 27, color: dark,
    });
  }
  // Surface greebles: panel rows and the central trench.
  b.panel(-4, 25.6, -L / 2 + 40, 8, 150, 1.2, dark);
  for (let i = 0; i < 130; i++) {
    const u = hash11(i, 41);
    const z = -L / 2 + 30 + hash11(i, 42) * (L * 0.82);
    // Keep greebles inside the triangular plan.
    const half = Math.max(2, ((L / 2 - z) / L) * W * 0.46);
    const x = (hash11(i, 43) - 0.5) * 2 * half;
    b.panel(x, 25.4, z, 2 + u * 7, 2 + hash11(i, 44) * 9, 0.8 + u * 3.2, i % 4 ? grey : dark);
  }
  // Running lights along the flanks.
  for (let i = 0; i < 22; i++) {
    const z = -L / 2 + 20 + i * (L * 0.85 / 22);
    const half = Math.max(2, ((L / 2 - z) / L) * W * 0.5);
    for (const sx of [-1, 1]) {
      b.panel(sx * half - 1, 12, z, 1.2, 2.4, 1.2, COLORS.transYellow, {
        emissive: 0xffdc8a,
        emissiveIntensity: 2.2,
        finish: 'trans',
      });
    }
  }
  root.add(b.build({ castShadow: false }));
  return root;
}
