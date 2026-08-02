/**
 * Scene 5 — The Battle Station.
 *
 * Three sets, three lighting rigs, one scene. Everything is built at the origin
 * and only one set is ever visible, so the invisible ones cost nothing:
 *
 *   0.0 – 10.0  the briefing room: a floor projector throws a rotating cyan
 *               wireframe of the station, then zooms to the trench cross
 *               section with a red marker on the exhaust port.
 *  10.0 – 17.0  the hangar deck: X-wings with S-foils closed, crew running,
 *               then engines light and the fighters lift out through the door.
 *  17.0 – 28.0  the approach: the station enormous against the stars with the
 *               squadron sweeping in, tiny against its curve.
 *
 * Narration:
 *    1.40 – 9.66  "The stolen plans showed a single flaw: a thermal exhaust
 *                  port, two metres wide, running straight down to the reactor."
 *   10.26 – 16.37 "Thirty small ships launched against a moon of grey brick.
 *                  Very few of them would come back."
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Bricks } from '../engine/brick.js';
import { COLORS, KIT } from '../engine/palette.js';
import { standardLights, cameraRig, handheld } from '../engine/stage.js';
import { Starfield, Beam, hologramMaterial, glowSprite, additiveMaterial } from '../engine/fx.js';
import { svgTexture } from '../engine/svg.js';
import { hash11 } from '../engine/rng.js';
import { buildMinifig, bakeFigure, Crowd, poseWalk } from '../kit/minifig.js';
import * as fighters from '../kit/ships-fighters.js';
import * as ease from '../engine/ease.js';

export const meta = { id: 'deathstar', title: 'The Battle Station', duration: 28, letterbox: 0.105 };

// ---------------------------------------------------------------------------
// Timeline. The cuts are pinned to the narration, not to the scene length.
// ---------------------------------------------------------------------------

const T_ZOOM = 5.25; // hologram switches to the trench cross-section
const T_HANGAR = 10.0; // cut to the hangar deck
const T_LAUNCH = 13.5; // engines light
const T_SPACE = 17.0; // cut to the approach

const HOLO = KIT.hologram;
const HOLO_Y = 7.6; // world height of the hologram's centre
// Big enough that the hull reads as a horizon rather than a ball. The camera
// never gets closer than ~190 to the centre, so the curvature stays gentle.
const STATION_R = 150;

export async function build(ctx) {
  const D = ctx.duration;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(44, ctx.aspect, 0.3, 4000);
  scene.background = new THREE.Color(0x05070c);

  // Three rigs live in the scene at once; `useRig` switches them on the cut.
  const rigs = {
    interior: standardLights(scene, 'interior', { shadowRadius: 34, intensity: 0.3 }),
    hangar: standardLights(scene, 'hangar', { shadowRadius: 70, intensity: 0.72 }),
    space: standardLights(scene, 'space', { shadows: false, intensity: 1.0 }),
  };
  // The briefing is lit by its own hologram, so kill the interior key's warmth
  // and let the cyan do the work.
  rigs.interior.key.color.setHex(0x9fc0e8);
  rigs.interior.hemi.color.setHex(0x4a6484);

  const chars = await tryCharacters();

  const briefing = await buildBriefing(chars);
  scene.add(briefing.group);

  const hangar = await buildHangar(chars);
  scene.add(hangar.group);

  const space = await buildApproach();
  scene.add(space.group);

  // A white flash plate hung off the camera covers the two hard cuts.
  const flash = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 34),
    additiveMaterial(0xdff0ff, { opacity: 0 })
  );
  flash.material.depthTest = false;
  flash.position.z = -14;
  flash.renderOrder = 950;
  camera.add(flash);
  scene.add(camera);

  // ------------------------------------------------------------------- sound
  ctx.sfx(0.35, 'computer_beeps', { gain: 0.5 });
  ctx.sfx(1.0, 'hologram_on', { gain: 0.8 });
  ctx.sfx(T_ZOOM - 0.2, 'hologram_on', { gain: 0.6, rate: 1.25 });
  ctx.sfx(T_ZOOM + 0.35, 'computer_beeps', { gain: 0.65 });
  ctx.sfx(7.1, 'impact_hit', { gain: 0.4, rate: 1.4 });
  ctx.sfx(8.4, 'computer_beeps', { gain: 0.45, rate: 0.9 });
  ctx.sfx(T_HANGAR - 0.1, 'blast_door_open', { gain: 0.85 });
  ctx.sfx(T_HANGAR + 1.4, 'footsteps_troopers', { gain: 0.4 });
  ctx.sfx(T_LAUNCH - 0.35, 'engine_rumble', { gain: 0.55 });
  ctx.sfx(T_LAUNCH + 0.5, 'xwing_flyby', { gain: 0.8 });
  ctx.sfx(T_LAUNCH + 1.5, 'xwing_flyby', { gain: 0.7, rate: 1.15 });
  ctx.sfx(T_LAUNCH + 2.3, 'ship_pass', { gain: 0.6 });
  ctx.sfx(T_SPACE + 0.1, 'engine_rumble', { gain: 0.5, rate: 0.85 });
  ctx.sfx(T_SPACE + 4.9, 'ship_pass', { gain: 0.55 });
  ctx.sfx(D - 3.4, 'xwing_flyby', { gain: 0.75 });
  ctx.sfx(D - 1.6, 'ship_pass', { gain: 0.6, rate: 0.9 });

  // ------------------------------------------------------------- shot list
  const SHOTS = [
    // --- briefing room: wide, then a low push, then into the cross-section
    {
      start: 0,
      pos: [[0, [2, 7.4, 27]], [T_ZOOM, [1.2, 8.2, 20.5]]],
      look: [[0, [0, 6.6, 0]], [T_ZOOM, [0, 7.4, 0]]],
      fov: [[0, 47], [T_ZOOM, 41]],
      handheld: 0.05,
    },
    {
      start: 3.35,
      pos: [[3.35, [-16, 2.8, 19.5]], [T_ZOOM, [-12.5, 4.2, 16.5]]],
      look: [[3.35, [0, 7.6, 0]], [T_ZOOM, [0, 8.0, 0]]],
      fov: [[3.35, 43]],
      handheld: 0.05,
    },
    {
      start: T_ZOOM,
      pos: [[T_ZOOM, [-5, 9.8, 27]], [T_HANGAR, [-1.5, 8.6, 19]]],
      look: [[T_ZOOM, [0, 8.0, 0]], [T_HANGAR, [0.2, 8.1, 0]]],
      fov: [[T_ZOOM, 44], [8.4, 37], [T_HANGAR, 35]],
      handheld: 0.035,
    },
    // --- hangar deck: three-quarter from behind the line of ships, with the
    // open launch door beyond them, then a low side-on pass as they leave.
    {
      start: T_HANGAR,
      pos: [[T_HANGAR, [-30, 5.4, -34]], [T_LAUNCH, [-19, 4.4, -18]]],
      look: [[T_HANGAR, [-2, 5.0, 4]], [T_LAUNCH, [3, 4.6, 12]]],
      fov: [[T_HANGAR, 50], [T_LAUNCH, 46]],
      handheld: 0.09,
    },
    {
      start: T_LAUNCH,
      pos: [[T_LAUNCH, [-32, 3.0, 12]], [T_SPACE, [-27, 8.5, 22]]],
      look: [[T_LAUNCH, [-2, 4.0, 16]], [15.2, [0, 11, 42]], [T_SPACE, [0, 26, 92]]],
      fov: [[T_LAUNCH, 44], [T_SPACE, 50]],
      shake: [[T_LAUNCH, 0], [T_LAUNCH + 0.35, 0.16], [T_SPACE, 0.05]],
    },
    // --- the approach: the camera rides with the formation, so these shots
    // hand off to the set's own rig rather than carrying world-space keys.
    { start: T_SPACE, rig: space.rig, handheld: 0.5, rate: 0.3 },
  ];

  // ------------------------------------------------------------------ update
  return {
    scene,
    camera,
    bloom: { strength: 0.7, radius: 0.7, threshold: 0.66 },
    update(t) {
      const beat = t < T_HANGAR ? 'brief' : t < T_SPACE ? 'hangar' : 'space';

      briefing.group.visible = beat === 'brief';
      hangar.group.visible = beat === 'hangar';
      space.group.visible = beat === 'space';
      useRig(rigs, beat === 'brief' ? 'interior' : beat === 'hangar' ? 'hangar' : 'space');
      scene.background.setHex(beat === 'brief' ? 0x05070c : beat === 'hangar' ? 0x090c12 : 0x03050a);

      if (beat === 'brief') briefing.update(t);
      else if (beat === 'hangar') hangar.update(t);
      else space.update(t);

      // The two cuts get a one-frame-ish bloom-white kick so they snap.
      flash.material.opacity =
        0.5 * ease.pulse(t, T_HANGAR - 0.06, 0.06, 0.03, 0.28) +
        0.42 * ease.pulse(t, T_SPACE - 0.06, 0.06, 0.03, 0.3);
      flash.visible = flash.material.opacity > 0.002;

      playShots(camera, t, SHOTS);
    },
  };
}

// ---------------------------------------------------------------------------
// Shot playback
// ---------------------------------------------------------------------------

/**
 * Pick the shot that covers `t` and pose the camera from its keyframe tracks.
 * Each shot owns its own tracks, so a cut is genuinely a cut: no interpolation
 * leaks across the boundary.
 */
function playShots(camera, t, shots) {
  let shot = shots[0];
  for (const s of shots) if (t >= s.start) shot = s;
  if (shot.rig) shot.rig(t, camera);
  else {
    cameraRig(camera, t, {
      pos: shot.pos,
      look: shot.look,
      fov: shot.fov,
      shake: shot.shake,
      ease: shot.ease || ease.inOutCubic,
    });
  }
  if (shot.handheld) handheld(camera, t, shot.handheld, shot.rate ?? 0.4, shot.start);
  return shot;
}

function useRig(rigs, name) {
  for (const key of Object.keys(rigs)) {
    const on = key === name;
    const rig = rigs[key];
    for (const k of Object.keys(rig)) if (rig[k]) rig[k].visible = on;
  }
}

// ===========================================================================
// SET 1 — the briefing room
// ===========================================================================

async function buildBriefing(chars) {
  const group = new THREE.Group();

  group.add(briefingRoom());

  // --- the hologram itself
  const holo = new THREE.Group();
  holo.position.y = HOLO_Y;
  group.add(holo);

  const sphereMat = hologramMaterial(HOLO, { opacity: 0.14, scan: 5.5 });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(6.1, 30, 20), sphereMat);
  holo.add(shell);

  const wireMat = hologramMaterial(HOLO, { opacity: 0.3, scan: 3.0 });
  wireMat.wireframe = true;
  const wire = new THREE.Mesh(new THREE.SphereGeometry(6.35, 20, 13), wireMat);
  holo.add(wire);

  // Rings: equator trench, two latitudes and the superlaser dish. All one
  // colour and one finish, so `Bricks.build()` merges them into a single mesh.
  const ringOpts = { emissive: HOLO, emissiveIntensity: 0.9, finish: 'glow', transparent: true, opacity: 0.5, studs: false };
  const rb = new Bricks();
  rb.addGeometry(new THREE.TorusGeometry(6.42, 0.13, 6, 72), { rot: [Math.PI / 2, 0, 0], color: HOLO, opts: ringOpts });
  rb.addGeometry(new THREE.TorusGeometry(6.36, 0.055, 5, 64), { rot: [Math.PI / 2, 0, 0], y: 2.6, color: HOLO, opts: ringOpts });
  rb.addGeometry(new THREE.TorusGeometry(6.36, 0.055, 5, 64), { rot: [Math.PI / 2, 0, 0], y: -2.6, color: HOLO, opts: ringOpts });
  rb.addGeometry(new THREE.TorusGeometry(6.36, 0.055, 5, 64), { rot: [0, 0, 0], color: HOLO, opts: ringOpts });
  // superlaser dish, up and to the left on the front face
  const dishDir = new THREE.Vector3(-0.42, 0.44, 0.79).normalize();
  for (const r of [2.15, 1.45, 0.6]) {
    rb.addGeometry(new THREE.TorusGeometry(r, r > 1 ? 0.075 : 0.11, 5, 40), {
      x: dishDir.x * 5.8,
      y: dishDir.y * 5.8,
      z: dishDir.z * 5.8,
      rot: alignZ(dishDir),
      color: HOLO,
      opts: ringOpts,
    });
  }
  // Cross-hairs over the dish, so it reads as a targeted feature.
  for (const spin of [0, Math.PI / 2]) {
    rb.addGeometry(new THREE.BoxGeometry(0.06, 5.4, 0.06), {
      x: dishDir.x * 5.8,
      y: dishDir.y * 5.8,
      z: dishDir.z * 5.8,
      rot: alignZ(dishDir, spin + Math.PI / 2),
      color: HOLO,
      opts: ringOpts,
    });
  }
  const rings = rb.build({ castShadow: false, receiveShadow: false });
  holo.add(rings);

  // --- schematic plates: the station readout, then the trench cross-section
  const stationPlate = await svgPlate('svg/deathstar-schematic.svg', 1024, 1024, 15.5, 15.5, 0.85);
  stationPlate.position.set(0, HOLO_Y + 0.4, 0);
  group.add(stationPlate);

  const crossPlate = await svgPlate('svg/trench-schematic.svg', 1024, 640, 22, 13.75, 1.0);
  crossPlate.position.set(0, HOLO_Y + 0.6, 0);
  group.add(crossPlate);

  // The red target marker sits on the exhaust port: the SVG puts the port
  // mouth at (400, 284) of an 800x500 viewBox, so 0.068 of the height below
  // the plate's centre.
  const marker = targetMarker();
  marker.position.set(0, -0.068 * 13.75, 0.16);
  crossPlate.add(marker);

  // --- projector: a dais on the floor and the cone of light above it
  const beam = new Beam({ color: HOLO, radiusTop: 6.8, radiusBottom: 0.75, height: HOLO_Y + 4.4, opacity: 0.1 });
  beam.object.position.y = 1.3;
  group.add(beam.object);
  const lens = glowSprite(HOLO, 3.4, 0.75);
  lens.position.y = 1.45;
  group.add(lens);

  // --- pilots around the pit, in silhouette
  const crowd = await pilotRing(chars);
  group.add(crowd.object);

  return {
    group,
    update(t) {
      const spin = t * 0.34;
      holo.rotation.y = spin;
      sphereMat.uniforms.uTime.value = t;
      wireMat.uniforms.uTime.value = t;
      beam.update(t);

      // The station readout hands over to the cross-section at the mention of
      // the exhaust port; the globe shrinks away as the section blows up.
      const zoom = ease.smooth(ease.range(t, T_ZOOM, T_ZOOM + 1.05));
      const born = ease.range(t, 0.55, 1.5);
      holo.scale.setScalar(ease.lerp(0.05, 1, ease.outCubic(born)) * ease.lerp(1, 0.16, zoom));
      holo.visible = zoom < 0.985;
      shell.material.uniforms.uOpacity.value = 0.14 * born * (1 - zoom);
      wire.material.uniforms.uOpacity.value = 0.3 * born * (1 - zoom * 0.9);
      for (const m of rings.children) m.material.opacity = 0.5 * born * (1 - zoom);

      stationPlate.visible = zoom < 0.99 && born > 0.02;
      stationPlate.material.opacity = 0.55 * born * (1 - zoom) * (0.88 + 0.12 * Math.sin(t * 9.3));
      stationPlate.scale.setScalar(ease.lerp(0.35, 1, ease.outCubic(born)));
      stationPlate.rotation.y = Math.sin(t * 0.22) * 0.14;

      crossPlate.visible = zoom > 0.01;
      crossPlate.material.opacity = 0.72 * zoom * (0.9 + 0.1 * Math.sin(t * 11.7));
      crossPlate.scale.setScalar(ease.lerp(0.3, 1, ease.outCubic(zoom)));

      // Marker: a hard pulse the moment the section lands, then a slow throb.
      const hit = ease.range(t, T_ZOOM + 0.55, T_ZOOM + 0.95);
      const throb = 0.6 + 0.4 * Math.sin(t * 7.4);
      marker.scale.setScalar(ease.lerp(3.4, 1, ease.outCubic(hit)) * (0.94 + 0.1 * throb));
      marker.children.forEach((c) => (c.material.opacity = hit * (0.55 + 0.45 * throb)));
      marker.rotation.z = -t * 0.7;

      lens.material.opacity = 0.75 * born * (0.8 + 0.2 * Math.sin(t * 13.1));
      beam.object.visible = born > 0.05;

      crowd.update(t);
    },
  };
}

/**
 * Dark room: tiled floor with a projector pit, tall walls, lit strips.
 * Vertical spans are in plates (2.5 to a stud), so a 40-plate wall is 16 units
 * — a bit over three minifigures.
 */
function briefingRoom() {
  const b = new Bricks({ studSegments: 6 });
  const dark = COLORS.trueBlack;
  const grey = COLORS.darkBluishGray;
  const W = 30; // half-width of the room, in studs

  // Floor: 4x4 tiles, dark, with a ring of lighter plate around the pit.
  for (let x = -W; x < W; x += 4) {
    for (let z = -W; z < W; z += 4) {
      const r = Math.hypot(x + 2, z + 2);
      if (r < 8) continue; // the pit
      const c = r < 13 ? grey : ((x / 4 + z / 4) & 1) === 0 ? dark : COLORS.black;
      b.tile(x, -1, z, 4, 4, c);
    }
  }
  // Pit rim: a circle of short dark tiles with cyan light slots between them.
  for (let i = 0; i < 34; i++) {
    const a = (i / 34) * Math.PI * 2;
    b.push();
    b.rotateY(a);
    b.translate(0, 0, 8.4);
    b.box(-0.7, -1, -0.55, 1.4, 1.1, 1, grey, { studs: false });
    if (i % 2 === 0) {
      b.box(-0.28, 0, -0.3, 0.56, 0.6, 0.4, HOLO, {
        studs: false,
        emissive: HOLO,
        emissiveIntensity: 0.7,
        finish: 'glow',
      });
    }
    b.pop();
  }
  // Projector housing at the centre of the pit.
  b.cyl(0, -1, 0, 2.1, 3, grey, { segments: 18, studs: false });
  b.cyl(0, 2, 0, 1.45, 1, COLORS.black, { segments: 18, studs: false });
  b.cyl(0, 3, 0, 0.8, 0.6, HOLO, { segments: 14, studs: false, emissive: HOLO, emissiveIntensity: 1.2, finish: 'glow' });

  // Walls: thirteen dark courses, the top three darker still so the room fades
  // out toward the ceiling rather than ending in a hard line.
  for (const [ax, az] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    for (let u = -W; u < W; u += 4) {
      const x = ax !== 0 ? ax * W - (ax > 0 ? 0 : 4) : u;
      const z = az !== 0 ? az * W - (az > 0 ? 0 : 4) : u;
      for (let row = 0; row < 13; row++) {
        b.brick(x, row * 3, z, 4, 4, row > 8 ? dark : row > 4 ? COLORS.black : grey, { studs: false });
      }
    }
  }
  // Lit strip running round the room above head height.
  for (const [ax, az] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    for (let u = -W + 2; u < W - 2; u += 8) {
      const x = ax !== 0 ? ax * (W - 0.9) : u;
      const z = az !== 0 ? az * (W - 0.9) : u;
      const w = ax !== 0 ? 0.5 : 6;
      const d = ax !== 0 ? 6 : 0.5;
      b.box(x - w / 2, 22, z - d / 2, w, d, 2, COLORS.transLightBlue, {
        studs: false,
        emissive: 0x86b8e0,
        emissiveIntensity: 0.5,
        finish: 'glow',
      });
    }
  }
  // Consoles against two walls, angled screens facing the pit.
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    b.push();
    b.translate(sx * 19, 0, sz * (W - 5.5));
    b.rotateY(sz > 0 ? Math.PI : 0);
    b.box(-4, 0, -1.5, 8, 3, 7, grey, { studs: false });
    b.slope(-4, 7, -1.5, 8, 3, 3, COLORS.black, { dir: '-z' });
    b.box(-3.4, 8, -1.2, 6.8, 1.4, 0.6, 0x1c6f8c, {
      studs: false,
      emissive: 0x2b8ba8,
      emissiveIntensity: 0.8,
      finish: 'glow',
    });
    b.pop();
  }

  return b.build();
}

/** Additive plane carrying a rasterised schematic. */
async function svgPlate(url, tw, th, w, h, opacity) {
  let tex = null;
  try {
    tex = await svgTexture(url, { w: tw, h: th });
  } catch {
    tex = null;
  }
  const mat = tex
    ? additiveMaterial(0xbdf3ff, { map: tex, opacity })
    : additiveMaterial(HOLO, { opacity: opacity * 0.4 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.renderOrder = 6;
  return mesh;
}

/** Red crosshair-in-a-ring that pulses over the exhaust port. */
function targetMarker() {
  const g = new THREE.Group();
  const red = 0xff3b22;
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.86, 28), additiveMaterial(red, { opacity: 1 }));
  g.add(ring);
  for (let i = 0; i < 4; i++) {
    const tick = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.12), additiveMaterial(red, { opacity: 1 }));
    tick.position.set(Math.cos((i / 4) * Math.PI * 2) * 1.25, Math.sin((i / 4) * Math.PI * 2) * 1.25, 0);
    tick.rotation.z = (i / 4) * Math.PI * 2;
    g.add(tick);
  }
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.2, 14), additiveMaterial(0xffd0c0, { opacity: 1 }));
  g.add(dot);
  g.renderOrder = 8;
  return g;
}

/** Nine pilots standing round the pit, instanced from two baked templates. */
async function pilotRing(chars) {
  const baked = await bakedPilots(chars, [
    (f) => {
      f.armL.rotation.set(-0.12, 0, -0.1);
      f.armR.rotation.set(-0.34, 0, 0.16);
    },
    (f) => {
      f.armL.rotation.set(-0.5, 0, -0.24);
      f.armR.rotation.set(-0.46, 0, 0.22);
      f.head.rotation.x = 0.12;
    },
  ]);

  const placements = [];
  const N = 9;
  for (let i = 0; i < N; i++) {
    // Leave a gap facing camera so the hologram is never fully masked.
    const a = -2.05 + (i / (N - 1)) * 4.6;
    const r = 12.6 + hash11(i, 5) * 2.4;
    placements.push({
      template: i % baked.length,
      position: [Math.sin(a) * r, 0, Math.cos(a) * r],
      rotationY: a + Math.PI + (hash11(i, 6) - 0.5) * 0.3,
      scale: 0.97 + hash11(i, 7) * 0.07,
      seed: hash11(i, 8) * 6.28,
    });
  }
  const crowd = new Crowd(baked, placements, { castShadow: true });
  return {
    object: crowd.object,
    update(t) {
      crowd.update(t, (i, seed, out) => {
        out.y = Math.sin(t * 1.15 + seed) * 0.024;
        out.rotY = Math.sin(t * 0.52 + seed) * 0.06;
      });
    },
  };
}

// ===========================================================================
// SET 2 — the hangar deck
// ===========================================================================

const BAY_Z = 42; // z of the launch door
const SHIP_X = [-22, 0, 22];

async function buildHangar(chars) {
  const group = new THREE.Group();
  group.add(hangarDeck());

  // Space beyond the open door.
  const stars = new Starfield({ count: 500, radius: 620, sizeMax: 3.0, seed: 19 });
  group.add(stars.object);
  const doorGlow = new THREE.Mesh(new THREE.PlaneGeometry(46, 24), additiveMaterial(0x1d3550, { opacity: 0.55 }));
  doorGlow.position.set(0, 12, BAY_Z - 0.4);
  group.add(doorGlow);

  // --- three X-wings, foils closed, collapsed to a handful of draw calls
  const ships = [];
  const engines = new EngineGlow(12, KIT.engineBlue);
  group.add(engines.object);
  for (let i = 0; i < SHIP_X.length; i++) {
    const src = await makeXWing(i);
    src.userData.setSFoils(0);
    const ship = collapse(src);
    ship.userData.enginePoints = src.userData.enginePoints.map((p) => p.clone());
    ship.position.set(SHIP_X[i], 2.4, -6 + i * 3);
    group.add(ship);
    ships.push(ship);
    group.add(ladder(SHIP_X[i] - 4.2, 0, 1.0));
  }

  // --- crew: runners heading for the ships plus a couple of deck hands
  const crew = await deckCrew(chars);
  group.add(crew.object);

  const enginePos = new THREE.Vector3();

  return {
    group,
    update(t) {
      stars.update(t);
      crew.update(t);

      // Launch: engines spool up, then the fighters rotate nose-up and go.
      let n = 0;
      for (let i = 0; i < ships.length; i++) {
        const ship = ships[i];
        const t0 = T_LAUNCH + i * 0.42;
        const spool = ease.range(t, t0 - 1.6, t0 - 0.1);
        const up = ease.range(t, t0, t0 + 3.4);
        const run = ease.outCubic(up);
        ship.position.y = 2.4 + run * 9 + ease.inCubic(up) * 22;
        ship.position.z = -6 + i * 3 + ease.inQuad(up) * 150;
        ship.rotation.x = -run * 0.26;
        ship.rotation.z = Math.sin(t * 1.4 + i) * 0.05 - run * 0.12 * (i - 1);
        const throttle = spool * (0.35 + 0.65 * up) * (1 + 0.5 * ease.pulse(t, t0, 0.2, 0.4, 0.8));
        ship.updateMatrixWorld();
        for (const p of ship.userData.enginePoints) {
          enginePos.copy(p).applyMatrix4(ship.matrixWorld);
          if (engines.set(n, enginePos, ship.quaternion, 1.0, 4 + throttle * 7, throttle, t)) n++;
        }
      }
      engines.flush(n);
    },
  };
}

/**
 * Deck, walls, launch door, gantries and floodlights. Heights are in plates:
 * the walls run to 78 plates, which is 31 units, about six minifigures.
 */
function hangarDeck() {
  const b = new Bricks({ studSegments: 5 });
  const grey = COLORS.darkBluishGray;
  const light = COLORS.lightBluishGray;
  const dark = COLORS.trueBlack;
  const WALL = 56; // half-width of the deck, in studs
  const ROWS = 26; // wall courses of three plates each

  // Deck: big 8x8 tiles with yellow guide lines under each ship.
  for (let x = -WALL; x < WALL; x += 8) {
    for (let z = -48; z < BAY_Z; z += 8) {
      const c = ((x / 8 + z / 8) & 1) === 0 ? grey : COLORS.black;
      b.tile(x, -1, z, 8, 8, c);
    }
  }
  // Lane markings under each ship, sparse enough to read as guides.
  for (const sx of SHIP_X) {
    for (let z = -24; z < BAY_Z - 8; z += 12) {
      b.tile(sx - 8, 0, z, 1, 5, COLORS.yellow);
      b.tile(sx + 7, 0, z, 1, 5, COLORS.yellow);
    }
  }

  // Side walls with a lit service gantry two thirds of the way up.
  for (const sx of [-1, 1]) {
    for (let z = -48; z < BAY_Z; z += 8) {
      for (let row = 0; row < ROWS; row++) {
        b.brick(sx * WALL - (sx > 0 ? 0 : 8), row * 3, z, 8, 8, row > 17 ? light : grey, { studs: false });
      }
      b.box(sx * (WALL - 5) - (sx > 0 ? 0 : 2), 45, z, 2, 8, 1, COLORS.yellow, { studs: false });
      b.box(sx * (WALL - 1.4) - (sx > 0 ? 0 : 1.2), 46, z + 1, 1.2, 6, 6, COLORS.transLightBlue, {
        studs: false,
        emissive: 0x8fbede,
        emissiveIntensity: 0.65,
        finish: 'glow',
      });
      b.box(sx * (WALL - 1.4) - (sx > 0 ? 0 : 1.2), 16, z + 2.5, 1.2, 2, 3, COLORS.transNeonOrange, {
        studs: false,
        emissive: 0x9c5a17,
        emissiveIntensity: 0.35,
        finish: 'glow',
      });
    }
  }
  // Back wall, behind the camera side.
  for (let x = -WALL; x < WALL; x += 8) {
    for (let row = 0; row < ROWS; row++) b.brick(x, row * 3, -56, 8, 8, row > 17 ? light : grey, { studs: false });
  }

  // Front wall with the launch door: a 46-stud opening 60 plates high.
  for (let x = -WALL; x < WALL; x += 4) {
    const inDoor = Math.abs(x + 2) < 23;
    for (let row = 0; row < ROWS; row++) {
      if (inDoor && row < 20) continue;
      b.brick(x, row * 3, BAY_Z, 4, 6, row > 17 ? light : grey, { studs: false });
    }
  }
  for (const sx of [-1, 1]) {
    b.box(sx * 23 - (sx > 0 ? 0 : 1.4), 0, BAY_Z - 0.6, 1.4, 6, 60, COLORS.yellow, { studs: false });
    b.box(sx * 24.4 - (sx > 0 ? 0 : 1.2), 0, BAY_Z - 0.6, 1.2, 6, 60, dark, { studs: false });
  }
  b.box(-23, 60, BAY_Z - 0.6, 46, 6, 2, COLORS.yellow, { studs: false });
  // Chevron warning stripes on the deck at the door.
  for (let x = -22; x < 22; x += 4) {
    b.tile(x, 0, BAY_Z - 5, 2, 4, COLORS.yellow);
    b.tile(x + 2, 0, BAY_Z - 5, 2, 4, dark);
  }

  // Floodlight masts, pushed back against the walls so their glare never sits
  // in the middle of the frame. The pan faces the deck, away from camera.
  for (const sx of [-1, 1]) {
    for (const z of [-38, -6, 26]) {
      b.push();
      b.translate(sx * (WALL - 5), 0, z);
      b.cyl(0, 0, 0, 0.9, 62, grey, { segments: 10, studs: false });
      b.push();
      b.translate(0, 62, 0);
      b.rotateZ(sx * 0.6);
      b.box(-2.6, 0, -2.2, 5.2, 4.4, 2, dark, { studs: false });
      b.box(-2.2, -0.7, -1.8, 4.4, 3.6, 0.8, COLORS.transClear, {
        studs: false,
        emissive: 0xffe6b4,
        emissiveIntensity: 0.5,
        finish: 'glow',
      });
      b.pop();
      b.pop();
    }
  }

  // Overhead trusses, to close the volume off above the ships.
  for (let z = -48; z < BAY_Z; z += 14) {
    b.box(-WALL, 74, z, WALL * 2, 2, 3, grey, { studs: false });
    b.box(-WALL, 70, z + 5, WALL * 2, 1.2, 1.4, light, { studs: false });
  }

  return b.build();
}

/** Boarding ladder: two rails and rungs, next to a cockpit. */
function ladder(x, y, z) {
  const b = new Bricks({ studSegments: 5 });
  b.push();
  b.translate(x, y, z);
  b.rotateX(-0.18);
  for (const sx of [-1, 1]) b.box(sx * 1.2 - 0.2, 0, 0, 0.4, 0.8, 18, COLORS.flatSilver, { studs: false });
  for (let i = 0; i < 6; i++) b.box(-1.4, 1.6 + i * 2.8, 0.1, 2.8, 0.6, 0.5, COLORS.lightBluishGray, { studs: false });
  b.box(-1.6, 17, -1.4, 3.2, 2.4, 0.6, COLORS.darkBluishGray, { studs: false });
  b.pop();
  return b.build();
}

/**
 * Deck crew: five pilots sprinting for their ships plus four hands standing
 * by. One baked mid-stride template does the running; the walk reads from the
 * bob and the roll, which is plenty at this distance.
 */
async function deckCrew(chars) {
  const baked = await bakedPilots(chars, [
    (f) => poseWalk(f, 0.31, { speed: 2.4, amp: 0.95 }),
    (f) => {
      f.armL.rotation.set(0, 0, -1.9);
      f.armR.rotation.set(-0.2, 0, 0.2);
    },
  ]);

  const placements = [];
  for (let i = 0; i < 5; i++) {
    placements.push({
      template: 0,
      position: [SHIP_X[i % 3] - 12 + hash11(i, 11) * 4, 0, -26 + hash11(i, 12) * 8],
      rotationY: 0.4 + hash11(i, 13) * 0.3,
      seed: hash11(i, 14) * 6.28,
      runner: true,
    });
  }
  for (let i = 0; i < 4; i++) {
    placements.push({
      template: 1,
      position: [SHIP_X[i % 3] + (i % 2 ? 13 : -13), 0, 8 + hash11(i, 15) * 12],
      rotationY: (i % 2 ? -1 : 1) * 1.5,
      seed: hash11(i, 16) * 6.28,
      runner: false,
    });
  }
  const crowd = new Crowd(baked, placements, { castShadow: true });
  return {
    object: crowd.object,
    update(t) {
      const go = ease.range(t, T_HANGAR + 0.4, T_LAUNCH - 0.2);
      crowd.update(t, (i, seed, out) => {
        const p = crowd.placements[i];
        if (p.runner) {
          const u = ease.outCubic(go);
          out.z = u * 22 + seed * 0.5;
          out.x = u * (3 + seed * 0.4);
          out.y = Math.abs(Math.sin(t * 9.4 + seed * 3)) * 0.22 * (1 - u * 0.85);
          out.tilt = 0.12 * (1 - u);
          out.rotY = Math.sin(t * 4.2 + seed) * 0.08;
        } else {
          out.y = Math.sin(t * 1.3 + seed) * 0.03;
          out.rotY = Math.sin(t * 0.7 + seed) * 0.22;
        }
      });
    },
  };
}

// ===========================================================================
// SET 3 — the approach
// ===========================================================================

async function buildApproach() {
  const group = new THREE.Group();

  const stars = new Starfield({ count: 2100, radius: 900, sizeMax: 4.0, seed: 31 });
  group.add(stars.object);

  // The battle station. `ships-capital.js` is being written in parallel, so
  // fall back to a station of our own if it has not landed yet.
  let capital = null;
  try {
    capital = await import('../kit/ships-capital.js');
  } catch {
    capital = null;
  }
  const station = capital?.buildDeathStar
    ? await capital.buildDeathStar({ radius: STATION_R, detail: 1, lit: true })
    : fallbackStation(STATION_R);
  group.add(station);

  // A faint halo sitting behind the hull separates it from the starfield.
  const limb = glowSprite(0x8fb4e8, STATION_R * 2.35, 0.1);
  group.add(limb);

  // --- the squadron: twelve fighters in three ranks, foils still closed
  const squadron = [];
  const engines = new EngineGlow(48, KIT.engineBlue);
  group.add(engines.object);
  const proto = await makeXWing(0);
  proto.userData.setSFoils(0);
  const flat = collapse(proto, 0.78);
  const enginePoints = proto.userData.enginePoints.map((p) => p.clone());
  for (let i = 0; i < 12; i++) {
    const ship = i === 0 ? flat : cloneCollapsed(flat);
    const rank = Math.floor(i / 4);
    const file = (i % 4) - 1.5;
    // A shallow V, each rank stepped back and down from the one ahead.
    ship.userData.slot = [file * 17, -rank * 5 - Math.abs(file) * 1.8, -rank * 26 - Math.abs(file) * 13];
    group.add(ship);
    squadron.push(ship);
  }

  // The whole run in, as one path. Radius falls from 455 to 180 while the
  // heading swings from high over the northern hemisphere down toward the
  // equator, so the last shot looks along the trench.
  const PATH = [
    [-282, 250, 255],
    [-227, 196, 265],
    [-170, 142, 258],
    [-118, 94, 236],
    [-76, 56, 204],
    [-45, 29, 172],
  ];
  const lead = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const p = new THREE.Vector3();
  const wp = new THREE.Vector3();

  /** Formation frame at scene time t: lead point plus a forward/right/up basis. */
  const frameAt = (t) => {
    const u = ease.range(t, T_SPACE, meta.duration + 1.2);
    lead.set(...ease.spline(PATH, u));
    fwd.set(...ease.spline(PATH, Math.min(1, u + 0.02))).sub(lead);
    if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, -1);
    fwd.normalize();
    right.crossVectors(_UP, fwd).normalize();
    up.crossVectors(fwd, right).normalize();
    return u;
  };

  /**
   * Three shots on the approach. Offsets are in the formation's own frame, so
   * the fighters stay put in the frame while the hull swells behind them; `mix`
   * slides the look target from the lead ship (0) to the station's centre (1),
   * which is what decides how much of the frame the hull eats.
   */
  const SPACE_SHOTS = [
    // the hull nearly filling the frame, the squadron specks against its limb
    { start: T_SPACE, end: 21.3, back: [150, 128], side: [-30, -22], rise: [16, 11], mix: 0.55, fov: [30, 29] },
    // in close: near enough to read the fighters, hull curving away behind
    { start: 21.3, end: 24.6, back: [50, 42], side: [-24, -14], rise: [8, 5], mix: 0.2, fov: [44, 42] },
    // the dive: over the top of the formation, surface swallowing the frame
    { start: 24.6, end: 28.6, back: [84, 66], side: [26, 16], rise: [28, 20], mix: 0.42, fov: [48, 50] },
  ];

  return {
    group,
    rig(t, camera) {
      frameAt(t);
      let s = SPACE_SHOTS[0];
      for (const c of SPACE_SHOTS) if (t >= c.start) s = c;
      const k = ease.smooth(ease.range(t, s.start, s.end));
      const back = ease.lerp(s.back[0], s.back[1], k);
      const side = ease.lerp(s.side[0], s.side[1], k);
      const rise = ease.lerp(s.rise[0], s.rise[1], k);
      const fov = ease.lerp(s.fov[0], s.fov[1], k);

      camera.position
        .copy(lead)
        .addScaledVector(fwd, -back)
        .addScaledVector(right, side)
        .addScaledVector(up, rise);
      // Aim between the lead ship and the centre of the station.
      tmp.copy(lead).multiplyScalar(1 - s.mix);
      camera.up.set(0, 1, 0);
      camera.lookAt(tmp);
      if (Math.abs(camera.fov - fov) > 1e-4) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
    },
    update(t) {
      stars.update(t);
      station.rotation.y = -0.045 + t * 0.004;
      const u = frameAt(t);

      let n = 0;
      for (let i = 0; i < squadron.length; i++) {
        const ship = squadron[i];
        const [ox, oy, oz] = ship.userData.slot;
        const wob = Math.sin(t * (0.8 + hash11(i, 23) * 0.5) + i) * 1.1;
        p.copy(lead)
          .addScaledVector(right, ox)
          .addScaledVector(up, oy + wob)
          .addScaledVector(fwd, oz);
        ship.position.copy(p);
        ship.lookAt(tmp.copy(p).addScaledVector(fwd, 60));
        // Bank into the dive as the hull comes up under them.
        ship.rotateZ(Math.sin(t * 0.9 + i * 2.1) * 0.07 + ease.inQuad(u) * 0.3 * Math.sign(ox || 1));
        ship.updateMatrixWorld();
        const throttle = 0.85 + 0.15 * Math.sin(t * 6 + i);
        for (const q of enginePoints) {
          wp.copy(q).applyMatrix4(ship.matrixWorld);
          if (engines.set(n, wp, ship.quaternion, 0.52, 5.5, throttle, t)) n++;
        }
      }
      engines.flush(n);
    },
  };
}

/**
 * Stand-in battle station: a grey brick moon with an equatorial trench, a
 * superlaser dish and a scatter of surface panels. Replaced by
 * `buildDeathStar` from `ships-capital.js` as soon as that exists.
 */
function fallbackStation(R) {
  const b = new Bricks({ studSegments: 6 });
  const hull = COLORS.lightBluishGray;
  const dark = COLORS.darkBluishGray;
  const opts = { studs: false };

  b.addGeometry(new THREE.SphereGeometry(R, 64, 40), { color: hull, opts });
  // Equatorial trench: a dark band recessed a hair below the hull.
  b.addGeometry(new THREE.CylinderGeometry(R * 0.999, R * 0.999, R * 0.075, 64, 1, true), {
    color: COLORS.trueBlack,
    opts: { studs: false, side: THREE.DoubleSide },
  });
  b.addGeometry(new THREE.TorusGeometry(R * 1.001, R * 0.006, 5, 80), { rot: [Math.PI / 2, 0, 0], color: dark, opts });
  // Panel lines: latitude rings and a scatter of surface blocks.
  for (let i = -4; i <= 4; i++) {
    if (i === 0) continue;
    const y = (i / 5) * R * 0.94;
    const r = Math.sqrt(Math.max(0.02, R * R - y * y));
    b.addGeometry(new THREE.TorusGeometry(r, R * 0.0035, 4, 72), { y, rot: [Math.PI / 2, 0, 0], color: dark, opts });
  }
  // Surface panels, each laid flat against the hull: build the rotation that
  // takes +y onto the surface normal, then spin the panel about it.
  for (let i = 0; i < 620; i++) {
    const uy = hash11(i, 41) * 2 - 1;
    const th = hash11(i, 42) * Math.PI * 2;
    if (Math.abs(uy) < 0.055) continue; // keep the trench clear
    const rr = Math.sqrt(1 - uy * uy);
    const n = new THREE.Vector3(Math.cos(th) * rr, uy, Math.sin(th) * rr);
    const s = R * (0.018 + hash11(i, 43) * 0.045);
    b.push();
    b.translateWorld(n.x * R * 0.993, n.y * R * 0.993, n.z * R * 0.993);
    b.addGeometry(new THREE.BoxGeometry(s * 2.1, R * 0.016, s * (1.1 + hash11(i, 44))), {
      rot: alignY(n, hash11(i, 46) * Math.PI),
      color: hash11(i, 47) > 0.68 ? dark : hull,
      opts,
    });
    b.pop();
  }
  // Superlaser dish: a recessed bowl in the northern hemisphere.
  const dishDir = new THREE.Vector3(-0.34, 0.5, 0.79).normalize();
  b.push();
  b.translateWorld(dishDir.x * R * 0.895, dishDir.y * R * 0.895, dishDir.z * R * 0.895);
  b.addGeometry(new THREE.SphereGeometry(R * 0.26, 30, 18), { color: dark, opts });
  for (const [r, tube, c] of [
    [R * 0.262, R * 0.014, hull],
    [R * 0.19, R * 0.008, dark],
  ]) {
    b.addGeometry(new THREE.TorusGeometry(r, tube, 6, 44), { rot: alignZ(dishDir), color: c, opts });
  }
  // The eight focusing lenses round the rim of the dish.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const t1 = new THREE.Vector3(0, 1, 0).cross(dishDir).normalize();
    const t2 = new THREE.Vector3().crossVectors(dishDir, t1);
    const off = t1.multiplyScalar(Math.cos(a) * R * 0.2).add(t2.multiplyScalar(Math.sin(a) * R * 0.2));
    b.addGeometry(new THREE.SphereGeometry(R * 0.026, 10, 8), {
      x: off.x,
      y: off.y,
      z: off.z,
      color: COLORS.transGreen,
      opts: { studs: false, emissive: 0x2c6a3a, emissiveIntensity: 0.8, finish: 'glow' },
    });
  }
  b.pop();

  const model = b.build({ castShadow: false, receiveShadow: false });
  model.userData.trenchY = 0;
  model.userData.dishCenter = dishDir.multiplyScalar(R * 0.9);
  return model;
}

// ===========================================================================
// Shared helpers
// ===========================================================================

const _UP = new THREE.Vector3(0, 1, 0);
const _FWD = new THREE.Vector3(0, 0, 1);

/**
 * Euler triple that rotates a +y-up element onto `dir` (then spins it about
 * its own axis). `Bricks.addGeometry` only takes Euler angles in the default
 * XYZ order, which is exactly what `Euler.setFromQuaternion` produces.
 */
function alignY(dir, spin = 0) {
  return alignAxis(_UP, dir, spin);
}
/** The same for a +z-facing element, e.g. a torus lying in the XY plane. */
function alignZ(dir, spin = 0) {
  return alignAxis(_FWD, dir, spin);
}
function alignAxis(axis, dir, spin) {
  const q = new THREE.Quaternion().setFromUnitVectors(axis, dir);
  if (spin) q.multiply(new THREE.Quaternion().setFromAxisAngle(axis, spin));
  const e = new THREE.Euler().setFromQuaternion(q);
  return [e.x, e.y, e.z];
}

async function tryCharacters() {
  try {
    return await import('../kit/characters.js');
  } catch {
    return null;
  }
}

/** A rebel pilot, from the character kit if it is available. */
async function makePilotFig(chars, variant) {
  if (chars?.makePilot) return chars.makePilot({ variant });
  return buildMinifig({
    shirt: COLORS.brightOrange,
    arms: COLORS.brightOrange,
    legs: COLORS.white,
    hips: COLORS.darkBluishGray,
    hands: COLORS.darkBluishGray,
    head: COLORS.lightFlesh,
    face: 'svg/face-determined.svg',
    torsoPrint: 'svg/torso-pilot.svg',
    seed: 3.7 + variant,
  });
}

/** Bake one pilot per pose function, ready for a `Crowd`. */
async function bakedPilots(chars, poses) {
  const out = [];
  for (let i = 0; i < poses.length; i++) {
    const fig = await makePilotFig(chars, i);
    poses[i](fig);
    out.push(bakeFigure(fig));
  }
  return out;
}

async function makeXWing(i) {
  return fighters.buildXWing({
    // Collapsing folds every material into one, so the only reason to trim the
    // palette here is the handful of ships that stay un-collapsed.
    trim: i === 1 ? COLORS.red : i === 2 ? COLORS.brightOrange : COLORS.red,
    gunMetal: COLORS.darkBluishGray,
    droid: COLORS.white,
    droidTrim: i === 2 ? COLORS.brightGreen : COLORS.blue,
    sfoils: 0,
  });
}

/**
 * Merge every mesh under `root` into one vertex-coloured mesh per blend class.
 *
 * A kit X-wing is a couple of dozen draw calls, which the software renderer
 * cannot afford nine times over. Baking each material's colour into a vertex
 * attribute collapses it to three: hull, glow and glass. Roughness and
 * metalness flatten to plain ABS, which is invisible at these distances.
 */
function collapse(root, tint = 1) {
  root.updateWorldMatrix(true, true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const local = new THREE.Matrix4();
  const c = new THREE.Color();
  const buckets = { solid: [], glow: [], glass: [] };

  root.traverse((n) => {
    if (!n.isMesh || !n.geometry) return;
    const m = n.material;
    const g = (n.geometry.index ? n.geometry.toNonIndexed() : n.geometry).clone();
    g.applyMatrix4(local.multiplyMatrices(inv, n.matrixWorld));
    for (const name of Object.keys(g.attributes)) {
      if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
    }
    if (!g.attributes.normal) g.computeVertexNormals();

    const emissive = m.emissive && m.emissiveIntensity > 0 && m.emissive.getHex() !== 0x000000;
    if (emissive) c.copy(m.emissive).multiplyScalar(Math.min(1.8, m.emissiveIntensity ?? 1));
    else c.copy(m.color).multiplyScalar(tint);

    const count = g.attributes.position.count;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(arr, 3));
    (emissive ? buckets.glow : m.transparent ? buckets.glass : buckets.solid).push(g);
  });

  const out = new THREE.Group();
  const add = (geos, material, shadow) => {
    if (!geos.length) return;
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    if (!merged) return;
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = shadow;
    mesh.receiveShadow = shadow;
    out.add(mesh);
  };
  add(buckets.solid, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.04 }), true);
  add(buckets.glow, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }), false);
  add(
    buckets.glass,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.12, transparent: true, opacity: 0.6 }),
    false
  );
  out.userData.parts = root.userData.parts;
  return out;
}

/** Share a collapsed model's geometry across another instance of it. */
function cloneCollapsed(model) {
  const g = new THREE.Group();
  for (const child of model.children) {
    const m = new THREE.Mesh(child.geometry, child.material);
    m.castShadow = child.castShadow;
    m.receiveShadow = child.receiveShadow;
    g.add(m);
  }
  g.userData.parts = model.userData.parts;
  return g;
}

/**
 * Every engine flare in the scene as two instanced meshes: an additive cone
 * for the plume and a hot core. Twelve X-wings' worth of thrusters for two
 * draw calls instead of ninety-six.
 */
class EngineGlow {
  constructor(max, color) {
    const cone = new THREE.ConeGeometry(1, 1, 10, 1, true);
    cone.translate(0, -0.5, 0);
    cone.rotateX(Math.PI / 2); // apex at the nozzle, base trailing along -z
    this.plume = new THREE.InstancedMesh(cone, additiveMaterial(color, { opacity: 0.5 }), max);
    this.core = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, 8, 6),
      additiveMaterial(0xd8f6ff, { opacity: 0.9 }),
      max
    );
    for (const m of [this.plume, this.core]) {
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      m.count = 0;
    }
    this.object = new THREE.Group();
    this.object.add(this.plume, this.core);
    this.object.renderOrder = 4;
    this._d = new THREE.Object3D();
  }
  /**
   * Place flare `i` at a world position, oriented by the ship's quaternion.
   * Returns false for a cold engine so the caller can skip the slot entirely —
   * a zero-length cone still draws its hot core, which reads as a stray blob.
   */
  set(i, position, quaternion, radius, length, throttle, t) {
    if (throttle <= 0.02) return false;
    const f = throttle * (0.88 + 0.12 * Math.sin(t * 41 + i * 2.3) * Math.sin(t * 17 + i));
    const d = this._d;
    d.position.copy(position);
    d.quaternion.copy(quaternion);
    const r = radius * (0.55 + f * 0.5);
    d.scale.set(r, r, Math.max(0.001, length * f));
    d.updateMatrix();
    this.plume.setMatrixAt(i, d.matrix);
    d.scale.setScalar(radius * (0.2 + f * 0.5));
    d.updateMatrix();
    this.core.setMatrixAt(i, d.matrix);
    return true;
  }
  flush(n) {
    this.plume.count = n;
    this.core.count = n;
    this.plume.instanceMatrix.needsUpdate = true;
    this.core.instanceMatrix.needsUpdate = true;
  }
}
